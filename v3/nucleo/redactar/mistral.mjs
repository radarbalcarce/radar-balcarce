// Cliente de Mistral (SOLO texto): el respaldo de Gemini. Sin dependencias: fetch, contador y espera se inyectan.
//
//   crearMistral({ clave, modelo, fetch, contarUso, topeDiario, usoDeHoy, espera }) → { texto(prompt, { json, sistema }) }
//   conRespaldo({ gemini, mistral, soloMistral, alUsarMistral }) → { texto(prompt, { json, imagenes, sistema }) }   (la misma forma que crearGemini)
//
// - Misma forma de entrada y de salida que `gemini.texto`: `json: true` devuelve el objeto ya parseado; si no, el texto.
// - Plan gratis: el tope propio por día (`topeDiario`) corta antes de llamar con Error('tope-mistral'). Después de cada pedido se llama a
//   `contarUso({ entrada, salida })` con los tokens que dice Mistral. Su costo en dólares es 0 (REGLAS § 5 bis).
// - 429/500/502/503/504: un reintento tras una espera corta. El resto tira enseguida con el mensaje de Mistral (sin la clave).
// - Visión: Mistral no se usa nunca para imágenes. Un pedido con imágenes sale por Gemini o falla; acá no se pasan.

const URL_MISTRAL = 'https://api.mistral.ai/v1/chat/completions';
export const MODELO_MISTRAL = 'mistral-large-2512';
export const TOPE_MISTRAL_POR_DEFECTO = 300;
const REINTENTABLES = new Set([429, 500, 502, 503, 504]);

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

export function crearMistral({
  clave,
  modelo = MODELO_MISTRAL,
  fetch: fetchInyectado = globalThis.fetch,
  contarUso = async () => {},
  topeDiario = Infinity,
  usoDeHoy = async () => 0,
  espera = esperaPorDefecto,
  esperaMs = 1500,
} = {}) {
  async function llamar(cuerpo) {
    const pedido = {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${clave}` },
      body: JSON.stringify(cuerpo),
    };
    let respuesta = await fetchInyectado(URL_MISTRAL, pedido);
    if (REINTENTABLES.has(respuesta.status)) {
      await espera(esperaMs);
      respuesta = await fetchInyectado(URL_MISTRAL, pedido);
    }
    if (!respuesta.ok) {
      let detalle = '';
      try {
        const e = await respuesta.json();
        detalle = e?.message ?? e?.error?.message ?? JSON.stringify(e);
      } catch { /* sin cuerpo */ }
      throw new Error(sinClave(`mistral-${respuesta.status}: ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}`, clave));
    }
    return respuesta.json();
  }

  async function texto(prompt, { json = false, imagenes = [], sistema } = {}) {
    if (imagenes && imagenes.length) throw new Error('mistral-sin-vision');
    if (topeDiario !== Infinity && (await usoDeHoy()) >= topeDiario) throw new Error('tope-mistral');

    const mensajes = [];
    if (sistema) mensajes.push({ role: 'system', content: sistema });
    mensajes.push({ role: 'user', content: prompt });
    const cuerpo = { model: modelo, messages: mensajes, temperature: 0.3 };
    if (json) cuerpo.response_format = { type: 'json_object' };

    let datos;
    try {
      datos = await llamar(cuerpo);
    } catch (e) {
      await contarUso({ entrada: 0, salida: 0 }); // un pedido que falla también gasta cupo del plan: cuenta para el tope
      throw e;
    }
    const uso = datos?.usage ?? {};
    await contarUso({ entrada: uso.prompt_tokens ?? 0, salida: uso.completion_tokens ?? 0 });

    const contenido = datos?.choices?.[0]?.message?.content;
    const salida = Array.isArray(contenido) ? contenido.map((p) => p?.text ?? '').join('') : String(contenido ?? '');
    if (!salida) throw new Error('mistral-vacio');
    return json ? parsearJson(salida) : salida;
  }

  return { texto };
}

// ¿Este error de Gemini es de los que justifican probar con el respaldo? Sí: 429, 5xx, clave rechazada (401/403), tope diario y red caída.
// No: una respuesta que no es JSON o vacía (la reintenta quien llama) ni un 400/404 (el pedido está mal: Mistral tampoco lo arreglaría).
export function sirveElRespaldo(error) {
  const m = String((error && error.message) || error || '');
  if (m === 'tope-diario') return true;
  if (m === 'json-invalido' || m === 'gemini-vacio') return false;
  const http = /^gemini-(\d{3})/.exec(m);
  if (http) {
    const s = Number(http[1]);
    return s === 429 || s === 401 || s === 403 || s >= 500;
  }
  return true; // fallo de red u otro error sin código
}

/**
 * Un «gemini» de texto con respaldo. Los pedidos con imágenes van sólo a Gemini. `soloMistral` (el freno mensual en dólares de Gemini cortó) manda
 * todo el texto a Mistral. Si Mistral no está (sin clave) o está en su tope, vale el error de Gemini, como si no existiera.
 */
export function conRespaldo({ gemini, mistral = null, soloMistral = false, alUsarMistral = () => {} }) {
  async function viaMistral(prompt, opciones, errorOriginal) {
    let r;
    try {
      r = await mistral.texto(prompt, { json: opciones.json, sistema: opciones.sistema });
    } catch (e) {
      if (e.message === 'json-invalido') throw e; // quien llama (redactar) ya sabe reintentar una respuesta que no es JSON
      if (errorOriginal) throw errorOriginal; // el que ya había: así el núcleo se comporta igual que sin respaldo
      throw e.message === 'tope-mistral' ? new Error('tope-diario') : e;
    }
    alUsarMistral();
    return r;
  }

  async function texto(prompt, opciones = {}) {
    const conImagenes = !!(opciones.imagenes && opciones.imagenes.length);
    if (!mistral || conImagenes) return gemini.texto(prompt, opciones);
    if (soloMistral) return viaMistral(prompt, opciones, null);
    try {
      return await gemini.texto(prompt, opciones);
    } catch (e) {
      if (!sirveElRespaldo(e)) throw e;
      return viaMistral(prompt, opciones, e);
    }
  }
  return { texto };
}
