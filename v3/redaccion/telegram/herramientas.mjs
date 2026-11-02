// Las herramientas de Claude para hablar con Hernán por el bot de Telegram (Radar 3.0). Sin dependencias (Node 20+); las corre el workflow
// «Radar 3.0: Telegram» (.github/workflows/v3-telegram.yml) o, en la PC, quien tenga el token en el entorno.
//
//   node v3/redaccion/telegram/herramientas.mjs decir <archivo.md>      manda al dueño cada bloque del archivo (separados por una línea «---»)
//   node v3/redaccion/telegram/herramientas.mjs leer [desde-ISO]        baja lo que contestó el dueño, transcribe los audios y lo escribe en
//                                                                       v3/redaccion/telegram/entrada/AAAA-MM-DD.md
//
// Variables: TELEGRAM_TOKEN (obligatoria) y GROQ_API_KEY (para transcribir; sin ella los audios quedan «sin transcribir»).
// Ni el token ni la contraseña derivada se imprimen nunca. Los audios no se guardan en el repositorio.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIRECCION, contrasenaDelWebhook } from './worker.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const CARPETA_ENTRADA = path.join(AQUI, 'entrada');
const ZONA = 'America/Argentina/Buenos_Aires';

/** Parte el archivo de mensajes por las líneas que son exactamente `---`; descarta los bloques vacíos. */
export function partirMensajes(texto) {
  const bloques = [];
  let actual = [];
  for (const linea of String(texto).replace(/\r\n/g, '\n').split('\n')) {
    if (linea.trim() === '---') { bloques.push(actual.join('\n')); actual = []; } else actual.push(linea);
  }
  bloques.push(actual.join('\n'));
  return bloques.map((b) => b.trim()).filter(Boolean);
}

/** Saca de un texto cualquier rastro del token o de la clave de Groq (por si un error los trae). */
function ocultar(texto) {
  let t = String(texto ?? '');
  for (const secreto of [process.env.TELEGRAM_TOKEN, process.env.GROQ_API_KEY]) if (secreto) t = t.split(secreto).join('***');
  return t;
}

export const fechaAR = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
export const horaAR = (iso) => new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

async function cabecera() {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) throw new Error('Falta TELEGRAM_TOKEN en el entorno.');
  return { 'x-radar-contrasena': await contrasenaDelWebhook(token) };
}

// ------------------------------------------------------------------------------------------------------------ decir

export async function decir(archivo) {
  if (!archivo) throw new Error('Uso: herramientas.mjs decir <archivo.md>');
  const textos = partirMensajes(fs.readFileSync(archivo, 'utf8'));
  if (!textos.length) throw new Error(`${archivo} no tiene mensajes.`);
  const r = await fetch(`${DIRECCION}/decir`, {
    method: 'POST',
    headers: { ...(await cabecera()), 'content-type': 'application/json' },
    body: JSON.stringify({ textos }),
  });
  const cuerpo = await r.text();
  if (!r.ok) throw new Error(`/decir contestó ${r.status}: ${ocultar(cuerpo).slice(0, 300)}`);
  const { enviados } = JSON.parse(cuerpo);
  console.log(`Mandados ${enviados} mensajes (${textos.length} bloques del archivo).`);
}

// ------------------------------------------------------------------------------------------------------------ leer

async function transcribir(m) {
  const token = process.env.TELEGRAM_TOKEN;
  const clave = process.env.GROQ_API_KEY;
  const seg = m.duracion ?? '?';
  if (!clave) return { texto: `[audio sin transcribir, ${seg} s]` };
  try {
    const info = await (await fetch(`https://api.telegram.org/bot${token}/getFile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ file_id: m.file_id }),
    })).json();
    if (!info?.ok) throw new Error(`getFile: ${info?.description ?? 'sin respuesta'}`);
    const bajada = await fetch(`https://api.telegram.org/file/bot${token}/${info.result.file_path}`);
    if (!bajada.ok) throw new Error(`descarga del audio: ${bajada.status}`);
    const audio = await bajada.blob();
    const form = new FormData();
    form.append('file', audio, path.basename(info.result.file_path) || 'audio.ogg');
    form.append('model', 'whisper-large-v3');
    form.append('language', 'es');
    form.append('response_format', 'json');
    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${clave}` }, body: form });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Groq ${r.status}: ${cuerpo?.error?.message ?? 'sin detalle'}`);
    return { texto: String(cuerpo.text ?? '').trim() || `[audio sin voz reconocible, ${seg} s]` };
  } catch (e) {
    return { error: ocultar(e.message) };
  }
}

function bloqueDe(m, cuerpo) {
  const tipo = m.tipo === 'audio' ? `audio (${m.duracion ?? '?'} s)` : m.tipo;
  const lineas = [`## ${horaAR(m.cuando)} · ${tipo} · mensaje ${m.message_id}`, ''];
  if (m.respuesta_a) lineas.push(`> en respuesta a: ${m.respuesta_a.replace(/\n+/g, ' ')}`, '');
  lineas.push(cuerpo, '');
  return lineas.join('\n');
}

export async function leer(desde, carpeta = CARPETA_ENTRADA) {
  const url = new URL(`${DIRECCION}/entrada`);
  if (desde) url.searchParams.set('desde', desde);
  const r = await fetch(url, { headers: await cabecera() });
  const cuerpo = await r.text();
  if (!r.ok) throw new Error(`/entrada contestó ${r.status}: ${ocultar(cuerpo).slice(0, 300)}`);
  const { mensajes } = JSON.parse(cuerpo);

  const porDia = new Map();
  for (const m of mensajes) {
    const dia = fechaAR(m.cuando);
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia).push(m);
  }

  fs.mkdirSync(carpeta, { recursive: true });
  let nuevos = 0, sinTranscribir = 0, fallidos = 0;
  for (const [dia, delDia] of porDia) {
    const md = path.join(carpeta, `${dia}.md`);
    const ids = path.join(carpeta, `${dia}.json`);
    const vistos = new Set(fs.existsSync(ids) ? JSON.parse(fs.readFileSync(ids, 'utf8')).ids ?? [] : []);
    const bloques = [];
    for (const m of delDia) {
      if (vistos.has(m.message_id)) continue;
      let texto;
      if (m.tipo === 'audio') {
        const t = await transcribir(m);
        if (t.error) { fallidos++; console.error(`Audio ${m.message_id} sin transcribir por ahora (se reintenta la próxima): ${t.error}`); continue; }
        if (t.texto.startsWith('[audio sin transcribir')) sinTranscribir++;
        texto = t.texto + (m.texto ? `\n\n(texto que lo acompaña: ${m.texto})` : '');
      } else if (m.tipo === 'foto') {
        texto = m.texto ? `[foto] ${m.texto}` : '[foto sin texto]';
      } else {
        texto = m.texto ?? '[mensaje sin texto]';
      }
      bloques.push(bloqueDe(m, texto));
      vistos.add(m.message_id);
      nuevos++;
    }
    if (!bloques.length) continue;
    const encabezado = fs.existsSync(md) ? '' : `# Lo que contestó Hernán por Telegram · ${dia}\n\n`;
    fs.appendFileSync(md, encabezado + bloques.join('\n'));
    fs.writeFileSync(ids, `${JSON.stringify({ ids: [...vistos].sort((a, b) => a - b) })}\n`);
  }
  console.log(`Mensajes del bot: ${mensajes.length}; nuevos en el repositorio: ${nuevos}${sinTranscribir ? `; audios sin transcribir por falta de clave: ${sinTranscribir}` : ''}${fallidos ? `; audios que fallaron y se reintentan: ${fallidos}` : ''}.`);
}

// ------------------------------------------------------------------------------------------------------------ entrada

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [accion, argumento] = process.argv.slice(2);
  const hacer = accion === 'decir' ? decir(argumento) : accion === 'leer' ? leer(argumento) : Promise.reject(new Error('Uso: herramientas.mjs decir <archivo.md> | leer [desde-ISO]'));
  hacer.catch((e) => { console.error(ocultar(e.message)); process.exitCode = 1; });
}
