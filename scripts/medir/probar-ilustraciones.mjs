// Prueba a mano de las ilustraciones (sin publicar nada): toma notas variadas de la portada, le pide el prompt a Gemini con las instrucciones de hoy,
// genera la imagen con FLUX y la deja en la carpeta de salida con el prompt, el tono y lo que dijo el control. Lo corre el workflow «Probar modelos de imágenes».
import fs from 'node:fs';
import path from 'node:path';
import { pedirPrompt, promptFinal, problemaDelPrompt, tonoDeLaNota, llamarAlWorker, mirarImagen } from '../../web/scripts/ilustrar-notas.mjs';

const salida = process.argv[2] ?? 'salida';
fs.mkdirSync(salida, { recursive: true });
const portada = JSON.parse(fs.readFileSync('web/data/portada.json', 'utf8'));
const claves = [process.env.GEMINI_API_KEY_REDACCION, process.env.GEMINI_API_KEY_CLASIFICACION].filter(Boolean);
const token = process.env.TOKEN;

// Una nota por sección, para ver tonos distintos (sobrio, alegre, neutro).
const orden = ['Balcarce', 'Política', 'Salud', 'Educación', 'Deportes', 'Economía', 'Cultura y agenda', 'Tecnología', 'Policiales'];
const elegidas = [];
for (const s of orden) { const n = portada.notas.find((x) => x.seccion === s && x.titulo && x.cuerpo); if (n) elegidas.push(n); }

const informe = [];
for (const nota of elegidas.slice(0, Number(process.env.CUANTAS) || 8)) {
  const tono = tonoDeLaNota(nota);
  try {
    const deGemini = await pedirPrompt(nota, { claves });
    const prompt = promptFinal(deGemini, tono);
    const problema = problemaDelPrompt(prompt, nota);
    const r = await llamarAlWorker(prompt, { token });
    const archivo = `flux-${nota.id}.jpg`;
    fs.writeFileSync(path.join(salida, archivo), r.bytes);
    const control = await mirarImagen(r.bytes, { claves });
    informe.push({ id: nota.id, seccion: nota.seccion, titulo: nota.titulo, tono, prompt, problemaDelPrompt: problema, control, archivo });
    console.log(`${nota.seccion} · ${tono} · control ${control.ok ? 'pasa' : `NO pasa (${control.motivo})`} · ${prompt.slice(0, 140)}`);
  } catch (e) {
    informe.push({ id: nota.id, seccion: nota.seccion, titulo: nota.titulo, error: String(e?.message ?? e).slice(0, 160) });
    console.log(`${nota.seccion}: ERROR ${String(e?.message ?? e).slice(0, 160)}`);
  }
}
fs.writeFileSync(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 2));
