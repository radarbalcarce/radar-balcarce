// Prueba a mano de las ilustraciones (sin publicar nada): toma las notas ilustradas con IA en las últimas horas, les pide el prompt nuevo (Gemini; si no
// contesta, Groq), genera la imagen con FLUX y deja ANTES (la que está publicada) y DESPUÉS (la nueva) lado a lado, con el prompt y lo que dijo el control.
// Lo corre el workflow «Probar ilustraciones». Uso: node scripts/medir/probar-ilustraciones.mjs salida [horas] [cuantas]
import fs from 'node:fs';
import path from 'node:path';
import { pedirPrompt, promptFinal, problemaDelPrompt, tonoDeLaNota, llamarAlWorker, mirarImagen } from '../../web/scripts/ilustrar-notas.mjs';

const salida = process.argv[2] ?? 'salida';
const horas = Number(process.argv[3]) || 24;
const cuantas = Number(process.argv[4]) || 12;
fs.mkdirSync(salida, { recursive: true });

const leer = (r) => JSON.parse(fs.readFileSync(r, 'utf8'));
const portada = leer('web/data/portada.json');
let archivo = { notas: [] };
try { archivo = leer('web/data/archivo.json'); } catch { /* sin archivo */ }
const notaPorId = new Map([...(archivo.notas ?? []), ...(portada.notas ?? [])].map((n) => [n.id, n]));

const claves = [process.env.GEMINI_API_KEY_REDACCION, process.env.GEMINI_API_KEY_CLASIFICACION].filter(Boolean);
const claveGroq = (process.env.GROQ_API_KEY ?? '').trim();
const claveOpenRouter = (process.env.OPENROUTER_API_KEY ?? '').trim();
const token = process.env.TOKEN;

const desde = Date.now() - horas * 3600e3;
const hechas = Object.entries(leer('web/data/fotos-ia.json'))
  .map(([id, e]) => ({ ...e, id: e.id ?? id }))
  .filter((e) => Date.parse(e.cuando) >= desde && e.archivo)
  .sort((a, b) => Date.parse(b.cuando) - Date.parse(a.cuando))
  .slice(0, cuantas);
console.log(`${hechas.length} notas ilustradas en las últimas ${horas} horas.`);

const informe = [];
for (const e of hechas) {
  const nota = notaPorId.get(e.id) ?? { id: e.id, titulo: e.titulo, cuerpo: '', seccion: '' };
  const item = { id: e.id, titulo: e.titulo, seccion: nota.seccion ?? '', antes: null, despues: null };
  const rutaAntes = path.join('web/public', e.archivo);
  if (fs.existsSync(rutaAntes)) { item.antes = `antes-${e.id}.jpg`; fs.copyFileSync(rutaAntes, path.join(salida, item.antes)); }
  item.promptAntes = e.prompt ?? null;
  try {
    const tono = tonoDeLaNota(nota);
    const deGemini = await pedirPrompt(nota, { claves, claveGroq, cloudflare: { token } });
    const prompt = promptFinal(deGemini, tono);
    item.tono = tono;
    item.prompt = prompt;
    item.problemaDelPrompt = problemaDelPrompt(prompt, nota);
    if (item.problemaDelPrompt) throw new Error(`prompt descartado: ${item.problemaDelPrompt}`);
    const r = await llamarAlWorker(prompt, { token });
    if (!r.bytes) throw new Error(r.error ?? 'el Worker no devolvió imagen');
    item.despues = `despues-${e.id}.jpg`;
    fs.writeFileSync(path.join(salida, item.despues), r.bytes);
    item.control = await mirarImagen(r.bytes, { claves, claveGroq, claveOpenRouter });
    console.log(`${nota.seccion} · ${tono} · control ${item.control.ok ? 'pasa' : `NO pasa (${item.control.motivo})`} · ${prompt.slice(0, 120)}`);
  } catch (err) {
    item.error = String(err?.message ?? err).slice(0, 200);
    console.log(`${e.id}: ERROR ${item.error}`);
  }
  informe.push(item);
}
fs.writeFileSync(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 2));
