// Cliente de Gemini (texto y visión), con tope diario. Sin dependencias: fetch, contador y espera se inyectan.
//
//   crearGemini({ clave, modelo, fetch, contarUso, topeDiario, usoDeHoy, espera }) → { texto(prompt, { json, imagenes, sistema }) }
//
// - Antes de llamar, si `await usoDeHoy() >= topeDiario` tira Error('tope-diario') sin llamar.
// - Después de cada llamada, `contarUso({ entrada, salida })` con los tokens que dice Google.
// - 429/500/503: un reintento tras una espera corta. 400/401/403 y el resto: tira enseguida con el mensaje de Google (sin la clave).
// - `json: true` devuelve el objeto ya parseado; si no, el texto.

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const REINTENTABLES = new Set([429, 500, 503]);

const esperaPorDefecto = (ms) => new Promise((r) => setTimeout(r, ms));

function sinClave(texto, clave) {
  const t = String(texto ?? '');
  return clave ? t.split(clave).join('***') : t;
}

function parsearJson(texto) {
  const limpio = String(texto ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(limpio);
  } catch {
    throw new Error('json-invalido');
  }
}

export function crearGemini({
  clave,
  modelo = 'gemini-3.1-flash-lite',
  fetch: fetchInyectado = globalThis.fetch,
  contarUso = async () => {},
  topeDiario = Infinity,
  usoDeHoy = async () => 0,
  espera = esperaPorDefecto,
  esperaMs = 1500,
} = {}) {
  async function llamar(cuerpo) {
    const url = `${BASE}/${modelo}:generateContent`;
    const pedido = {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
      body: JSON.stringify(cuerpo),
    };
    let respuesta = await fetchInyectado(url, pedido);
    if (REINTENTABLES.has(respuesta.status)) {
      await espera(esperaMs);
      respuesta = await fetchInyectado(url, pedido);
    }
    if (!respuesta.ok) {
      let detalle = '';
      try {
        const e = await respuesta.json();
        detalle = e?.error?.message ?? JSON.stringify(e);
      } catch { /* sin cuerpo */ }
      throw new Error(sinClave(`gemini-${respuesta.status}: ${detalle}`, clave));
    }
    return respuesta.json();
  }

  async function texto(prompt, { json = false, imagenes = [], sistema } = {}) {
    if (topeDiario !== Infinity && (await usoDeHoy()) >= topeDiario) throw new Error('tope-diario');

    const partes = [{ text: prompt }];
    for (const img of imagenes) partes.push({ inline_data: { mime_type: img.mime, data: img.base64 } });

    const cuerpo = { contents: [{ role: 'user', parts: partes }] };
    if (sistema) cuerpo.systemInstruction = { parts: [{ text: sistema }] };
    if (json) cuerpo.generationConfig = { responseMimeType: 'application/json' };

    const datos = await llamar(cuerpo);
    const uso = datos?.usageMetadata ?? {};
    await contarUso({ entrada: uso.promptTokenCount ?? 0, salida: uso.candidatesTokenCount ?? 0 });

    const salida = (datos?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
    if (!salida) throw new Error('gemini-vacio');
    return json ? parsearJson(salida) : salida;
  }

  return { texto };
}
