// Prueba a mano que las claves de Gemini andan y qué pueden hacer (15/10/2026): lista los modelos que ve cada clave, hace un pedido de
// texto mínimo y, con la clave de redes (la de las voces), una voz cortita; y prueba si se puede generar una imagen. Cuesta centavos.
// Sin dependencias, sólo fetch. LAS CLAVES JAMÁS SE IMPRIMEN: sólo se cuentan estados, nombres de modelos y tamaños. Se corre desde el
// workflow «Probar las claves de Gemini» (.github/workflows/probar-gemini.yml); localmente sin claves no hace nada.
import { VOCES, INDICACION_BASE } from './prompt-redes.mjs';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const CLAVES = [
  ['redaccion', 'GEMINI_API_KEY_REDACCION'],
  ['redes', 'GEMINI_API_KEY_REDES'],
  ['clasificacion', 'GEMINI_API_KEY_CLASIFICACION'],
];

const limpiar = (t, clave) => String(t ?? '').split(clave).join('«clave»').replace(/\s+/g, ' ').slice(0, 220);

async function pedir(url, clave, cuerpo, { espera = 90_000 } = {}) {
  const res = await fetch(url, {
    method: cuerpo ? 'POST' : 'GET',
    headers: { 'x-goog-api-key': clave, ...(cuerpo ? { 'content-type': 'application/json' } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(espera),
  });
  const texto = await res.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* no era JSON */ }
  return { estado: res.status, json, texto };
}

function buscarAudio(n, acc = []) {
  if (!n || typeof n !== 'object') return acc;
  if (n.type === 'audio' && typeof n.data === 'string') acc.push(n.data);
  for (const v of Object.values(n)) buscarAudio(v, acc);
  return acc;
}
function buscarImagen(json) {
  for (const c of json?.candidates ?? []) for (const p of c?.content?.parts ?? []) {
    const d = p.inlineData ?? p.inline_data;
    if (d?.data) return d.data;
  }
  return null;
}

const resumen = [];
const decir = (linea) => { resumen.push(linea); console.log(linea); };

for (const [nombre, variable] of CLAVES) {
  const clave = (process.env[variable] ?? '').trim();
  if (!clave) { decir(`[${nombre}] sin clave cargada (${variable})`); continue; }
  try {
    const lista = await pedir(`${BASE}/models?pageSize=200`, clave);
    const modelos = (lista.json?.models ?? []);
    const nombres = modelos.map((m) => String(m.name).replace(/^models\//, ''));
    const interesantes = nombres.filter((n) => /tts|image|imagen|veo|flash|pro/i.test(n)).slice(0, 40);
    decir(`[${nombre}] modelos: HTTP ${lista.estado}, ${nombres.length} visibles. Algunos: ${interesantes.join(', ')}`);

    const texto = await pedir(`${BASE}/models/gemini-flash-lite-latest:generateContent`, clave,
      { contents: [{ parts: [{ text: 'Respondé sólo con la palabra: listo' }] }] });
    const respuesta = texto.json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    decir(`[${nombre}] texto (gemini-flash-lite-latest): HTTP ${texto.estado} ${texto.estado === 200 ? `«${respuesta.trim().slice(0, 30)}»` : limpiar(texto.texto, clave)}`);

    if (nombre === 'redes') {
      const cuerpo = {
        model: 'gemini-3.8-flash-tts',
        input: [{ type: 'user_input', content: [{ type: 'text', text: 'Probando la voz de Radar Balcarce.', annotations: [{ type: 'speech_metadata', style: INDICACION_BASE }] }] }],
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voz_pendiente: true }] },
      };
      cuerpo.generation_config.speech_config = [{ voice: VOCES.locutora }];
      const voz = await pedir(`${BASE}/interactions`, clave, cuerpo, { espera: 120_000 });
      const audios = buscarAudio(voz.json);
      const bytes = audios.length ? Buffer.from(audios[audios.length - 1], 'base64').length : 0;
      decir(`[${nombre}] voz (gemini-3.8-flash-tts, voz de la locutora): HTTP ${voz.estado}, audio ${bytes} bytes${voz.estado === 200 ? '' : ' · ' + limpiar(voz.texto, clave)}`);
    }

    // Una imagen: se prueban los modelos de imagen de los más nuevos a los más viejos (hasta que uno ande: cuesta centavos).
    const PREFERIDOS = ['gemini-3.1-flash-image', 'gemini-3-pro-image', 'gemini-3.1-flash-lite-image', 'gemini-2.5-flash-image'];
    const conImagen = modelos.filter((m) => /image/i.test(m.name) && (m.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m) => String(m.name).replace(/^models\//, ''));
    const orden = [...PREFERIDOS.filter((p) => conImagen.includes(p)), ...conImagen.filter((n) => !PREFERIDOS.includes(n))].slice(0, 4);
    if (!orden.length) { decir(`[${nombre}] imagen: ningún modelo de imagen visible con generateContent`); continue; }
    for (const idModelo of orden) {
      const img = await pedir(`${BASE}/models/${idModelo}:generateContent`, clave, {
        contents: [{ parts: [{ text: 'Ilustración minimalista y genérica de un tractor en un campo al atardecer, estilo plano, sin texto, sin personas.' }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }, { espera: 120_000 });
      const dato = img.estado === 200 ? buscarImagen(img.json) : null;
      decir(`[${nombre}] imagen (${idModelo}): HTTP ${img.estado}, ${dato ? `imagen de ${Buffer.from(dato, 'base64').length} bytes` : 'sin imagen'}${img.estado === 200 ? '' : ' · ' + limpiar(img.texto, clave).slice(0, 120)}`);
      if (dato) break;
    }
    // La API nueva (Interactions, la de las voces): los modelos Nano Banana vigentes según la documentación de Google (16/10/2026).
    for (const idModelo of ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image']) {
      const r = await pedir(`${BASE}/interactions`, clave, {
        model: idModelo,
        input: [{ type: 'user_input', content: [{ type: 'text', text: 'Ilustración minimalista y genérica de un tractor en un campo al atardecer, estilo plano, sin texto, sin personas.' }] }],
        response_format: { type: 'image' },
      }, { espera: 120_000 });
      let bytes = 0;
      const buscar = (n) => { if (!n || typeof n !== 'object') return; if (n.type === 'image' && typeof n.data === 'string') bytes = Buffer.from(n.data, 'base64').length; for (const v of Object.values(n)) buscar(v); };
      buscar(r.json);
      decir(`[${nombre}] imagen/interactions (${idModelo}): HTTP ${r.estado}, ${bytes ? `imagen de ${bytes} bytes` : 'sin imagen'}${r.estado === 200 ? '' : ' · ' + limpiar(r.texto, clave).slice(0, 160)}`);
      if (bytes) break;
    }
  } catch (e) {
    decir(`[${nombre}] falló la prueba: ${limpiar(e?.message, clave)}`);
  }
}

// La clave PAGA de respaldo de la redacción (30/10/2026: el contador la mostraba «rechazada»): un texto mínimo y el motivo que da Google, sin imprimir la clave.
{
  const clave = (process.env.GEMINI_API_KEY_RESPALDO ?? '').trim();
  if (!clave) {
    decir('[respaldo] sin clave cargada (GEMINI_API_KEY_RESPALDO)');
  } else {
    try {
      const t = await pedir(`${BASE}/models/gemini-flash-lite-latest:generateContent`, clave, { contents: [{ parts: [{ text: 'Respondé sólo con la palabra: listo' }] }] });
      decir(`[respaldo] texto (gemini-flash-lite-latest): HTTP ${t.estado} ${t.estado === 200 ? `«${String(t.json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim().slice(0, 30)}»` : limpiar(t.texto, clave)}`);
    } catch (e) {
      decir(`[respaldo] falló la prueba: ${limpiar(e?.message, clave)}`);
    }
  }
}

// Mistral (26/10/2026): el último respaldo gratis de texto. Lista de modelos y, desde el 30/10, UN pedido mínimo con los encabezados de límite
// (el contador mostraba todos sus pedidos como «velocidad»: hay que ver qué límite es).
{
  const clave = (process.env.MISTRAL_API_KEY ?? '').trim();
  if (!clave) {
    decir('[mistral] sin clave cargada (MISTRAL_API_KEY): el respaldo no se usa');
  } else {
    try {
      const r = await fetch('https://api.mistral.ai/v1/models', { headers: { authorization: `Bearer ${clave}` }, signal: AbortSignal.timeout(30_000) });
      decir(`[mistral] clave: HTTP ${r.status}${r.ok ? '' : ` · ${limpiar(await r.text(), clave)}`}`);
      const c = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST', headers: { authorization: `Bearer ${clave}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: process.env.MISTRAL_MODELO || 'mistral-large-2512', max_tokens: 8, messages: [{ role: 'user', content: 'Respondé sólo con la palabra: listo' }] }),
        signal: AbortSignal.timeout(30_000),
      });
      const limites = [...c.headers.entries()].filter(([k]) => /retry-after|ratelimit|limit/i.test(k)).map(([k, v]) => `${k}=${v}`).join(' · ');
      decir(`[mistral] pedido mínimo: HTTP ${c.status}${c.ok ? '' : ` · ${limpiar(await c.text(), clave)}`}${limites ? ` · encabezados: ${limites}` : ''}`);
    } catch (e) {
      decir(`[mistral] falló la prueba: ${limpiar(e?.message, clave)}`);
    }
  }
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Prueba de las claves de Gemini\n\n${resumen.map((l) => `- ${l}`).join('\n')}\n`);
}
