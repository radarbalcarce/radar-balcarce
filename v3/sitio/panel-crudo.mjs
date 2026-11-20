// «Nota desde el material crudo» (panel, 20/11/2026): Hernán pega todo lo que tiene del tema (gacetilla, notas sueltas, audio transcripto, datos) y sube fotos; la IA arma la nota con el criterio de Radar
// y la deja como BORRADOR para que él la vea en la vista previa, la edite y recién ahí la publique. Nada se publica solo.
//
// No hay lógica de redacción nueva: se reutiliza la del núcleo (redactar/redactar.mjs, verificar.mjs y grafico.mjs) y las reglas de la nota propia del bot (REGLAS_DE_LA_NOTA_PROPIA).
// Exactamente DOS pedidos de texto a la IA (REGLAS del núcleo § 5): 1) redactar (nota + ficha + gráfico propio si hay cifras, todo en el mismo pedido) y 2) verificar contra el material.
// No hay reintento ni reescritura (serían pedidos de más): si la IA devuelve algo inválido, se avisa y Hernán vuelve a tocar el botón. Lo que marca la verificación se SACA del texto y la nota queda
// con el freno «verificación pendiente» hasta que Hernán la edite o la acepte (ver publicarBorrador en panel-pedir.mjs).
// Presupuesto: la misma clave de Gemini y el mismo freno mensual (US$ 7) del núcleo; los pedidos se anotan en `uso_ia` con la tarea `panel-crudo`. Con el freno cortado, sólo Mistral (gratis) si hay clave.
import { redactarYVerificar, trozosDelMaterial as trozosDeMaterialComun, instruccionesDeMaterial } from '../nucleo/redactar/desde-material.mjs';
import { crearGemini } from '../nucleo/redactar/gemini.mjs';
import { crearMistral, conRespaldo, MODELO_MISTRAL, TOPE_MISTRAL_POR_DEFECTO } from '../nucleo/redactar/mistral.mjs';
import { costoEstimado, FRENO_MENSUAL_USD } from '../nucleo/costo.mjs';
import { anotarUso, usoDelDia, usoDelMes } from '../nucleo/db/db.mjs';
import { SECCIONES } from './util.mjs';
import { insertarBorrador, POR_DEFECTO_FIRMA } from './panel-pedir.mjs';
import { DESTINOS_DEL_REEL } from './vistas/panel.mjs';

export const TOPE_PEDIDOS_PANEL_POR_DIA = 40; // 20 notas por día (2 pedidos cada una): más que de sobra para las notas propias
export const MIN_CARACTERES = 200;
export const MAX_CARACTERES = 16000; // el pedido de redacción lee hasta 18.000 en total (6.000 por trozo): así no se corta nada en silencio
const TROZO = 5500;
const NOMBRES_DE_SECCION = SECCIONES.map((s) => s.nombre);
const CLAVES_DE_DESTINO = DESTINOS_DEL_REEL.map(([c]) => c);
const MEDIO_POR_DEFECTO = 'Material aportado por la redacción';
const limpio = (v) => String(v ?? '').replace(/\r\n?/g, '\n');
const unaLinea = (v) => limpio(v).replace(/\s+/g, ' ').trim();

export const DESTINOS_POR_DEFECTO = ['instagram', 'facebook', 'tiktok', 'youtube'];

/** El formulario → { datos } o { error, valores }. */
export function validarCrudo(form) {
  const destinos = CLAVES_DE_DESTINO.filter((c) => form.getAll('destinos').map(String).includes(c));
  const v = {
    crudo: limpio(form.get('crudo')), seccion: String(form.get('seccion') ?? 'ia'), firma: unaLinea(form.get('firma')) || POR_DEFECTO_FIRMA,
    origen: unaLinea(form.get('origen')), fuenteUrl: String(form.get('fuente_url') ?? '').trim(), credito: unaLinea(form.get('credito')) || 'Radar Balcarce',
    reel: String(form.get('reel') ?? '') === 'si', destinos: destinos.length ? destinos : (String(form.get('reel') ?? '') === 'si' ? [] : DESTINOS_POR_DEFECTO),
    reelFotos: Math.min(3, Math.max(1, Number(form.get('reel_fotos')) || 1)),
  };
  const error = (e) => ({ error: e, valores: v });
  const texto = v.crudo.trim();
  if (texto.length < MIN_CARACTERES) return error('crudo-corto');
  if (texto.length > MAX_CARACTERES) return error('crudo-largo');
  if (v.seccion !== 'ia' && !NOMBRES_DE_SECCION.includes(v.seccion)) return error('seccion');
  if (v.firma.length > 80) return error('firma');
  if (v.origen.length > 80) return error('fuente-medio');
  let fuenteUrl = null;
  if (v.fuenteUrl) {
    let u = null;
    try { u = new URL(v.fuenteUrl); } catch { u = null; }
    if (!u || u.protocol !== 'https:' || v.fuenteUrl.length > 500 || /\s/.test(v.fuenteUrl)) return error('fuente-enlace');
    fuenteUrl = u.toString();
  }
  if (v.reel && !v.destinos.length) return error('sin-destinos');
  return { datos: { ...v, crudo: texto, fuenteUrl } , valores: v };
}

/** El material en trozos de hasta 5.500 letras (el código común vive en nucleo/redactar/desde-material.mjs). */
export function trozosDelMaterial(texto, medio) {
  return trozosDeMaterialComun(texto, medio);
}

/** Lo que se le suma a las reglas de escritura (REDACCION.md) y al perfil: las reglas de la nota propia del bot, más lo propio de este pedido. */
export function instruccionesDelPanel({ firma, seccion }) {
  return instruccionesDeMaterial({ firma, seccion });
}

const numero = (v, def) => { const n = Number(v); return Number.isFinite(n) ? n : def; };
const diaDeBalcarce = (d) => new Date(d.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);

/**
 * Prepara la IA con la clave y el freno del núcleo. Devuelve { ia, pedidos() } o { error }.
 * `deps.ia` (pruebas): una IA ya armada con `texto(prompt, opciones)`; se saltea la clave, pero NO el tope del panel.
 */
async function prepararIA(env, deps, ahora) {
  const dia = diaDeBalcarce(ahora);
  const mes = dia.slice(0, 7);
  let hoy = [];
  try { hoy = await usoDelDia(env, dia); } catch { hoy = []; }
  const delPanel = hoy.filter((f) => f.tarea === 'panel-crudo').reduce((s, f) => s + (f.pedidos || 0), 0);
  if (delPanel + 2 > TOPE_PEDIDOS_PANEL_POR_DIA) return { error: 'tope-ia' };
  if (deps.ia) return { ia: deps.ia };
  if (!env.GEMINI_API_KEY) return { error: 'sin-clave-ia' };
  let gastoMes = 0;
  try { gastoMes = costoEstimado(await usoDelMes(env, mes)); } catch { gastoMes = 0; }
  const hayMistral = !!env.MISTRAL_API_KEY;
  const topeMistral = Math.floor(numero(env.MISTRAL_TOPE_DIARIO, TOPE_MISTRAL_POR_DEFECTO));
  const diaMistral = `mistral-${dia}`;
  let mistralHoy = 0;
  if (hayMistral) { try { mistralHoy = (await usoDelDia(env, diaMistral)).reduce((s, f) => s + (f.pedidos || 0), 0); } catch { mistralHoy = 0; } }
  const frenado = gastoMes >= FRENO_MENSUAL_USD;
  const mistralPosible = hayMistral && topeMistral > 0 && mistralHoy + 2 <= topeMistral;
  if (frenado && !mistralPosible) return { error: 'freno-ia' };
  const fetchFn = deps.fetch ?? ((...a) => globalThis.fetch(...a));
  const gemini = crearGemini({
    clave: env.GEMINI_API_KEY, modelo: env.GEMINI_MODELO || 'gemini-3.1-flash-lite', fetch: fetchFn,
    contarUso: async ({ entrada, salida }) => { try { await anotarUso(env, dia, 'panel-crudo', entrada, salida); } catch (e) { console.error(`uso de IA: ${e.message}`); } },
  });
  const mistral = mistralPosible ? crearMistral({
    clave: env.MISTRAL_API_KEY, modelo: env.MISTRAL_MODELO || MODELO_MISTRAL, fetch: fetchFn, topeDiario: topeMistral, usoDeHoy: async () => mistralHoy,
    contarUso: async ({ entrada, salida }) => { mistralHoy += 1; try { await anotarUso(env, diaMistral, 'panel-crudo', entrada, salida); } catch (e) { console.error(`uso de Mistral: ${e.message}`); } },
  }) : null;
  return { ia: conRespaldo({ gemini, mistral, soloMistral: frenado }) };
}

const sinTerminacion = (t) => t.replace(/\s*(…|\.{2,})\s*$/, '').trim();

/**
 * Arma la nota. `v`: lo que devuelve validarCrudo (datos). Devuelve:
 *   { error }               (código de texto fijo: sin-clave-ia, tope-ia, freno-ia, ia-fallo, ia-invalida; no se creó nada)
 *   { noPublicar: motivo }  (freno legal o material insuficiente: no se creó nada)
 *   { ok: true, id, marcadas, pedidos } (borrador creado; `marcadas` = oraciones que la verificación sacó)
 */
export async function armarNotaDesdeCrudo(env, v, { por, ahora, textos = {}, ia: iaInyectada = null, fetch: fetchFn = null }) {
  const p = await prepararIA(env, { ia: iaInyectada, fetch: fetchFn }, ahora);
  if (p.error) return { error: p.error };
  const medio = v.origen || MEDIO_POR_DEFECTO;
  const articulos = trozosDelMaterial(v.crudo, medio);
  const historia = { id: null, titulo: '', fechaHecho: diaDeBalcarce(ahora) };
  const redaccion = [textos.redaccion ?? '', instruccionesDelPanel({ firma: v.firma, seccion: v.seccion })].join('\n\n').trim();

  // Los dos pedidos (redactar con ficha y gráfico, y verificar contra el material), sin reintento: el código común del núcleo.
  const r = await redactarYVerificar({ articulos, ia: p.ia, historia, perfil: textos.perfil ?? '', redaccion, conGrafico: true, nombre: 'nota desde crudo' });
  if (r.error) return { error: r.error };
  if (r.noPublicar) return { noPublicar: r.noPublicar, pedidos: r.pedidos };
  const { nota, cuerpo, quitadas, noCorrio, pedidos } = r;
  const marcadas = noCorrio ? ['La verificación contra tu material no pudo correr: leé el texto entero antes de publicar.'] : r.marcadas;

  const titulo = sinTerminacion(nota.titulo).slice(0, 300);
  const bajada = nota.bajada.slice(0, 600);
  const seccion = v.seccion === 'ia' ? nota.seccion : v.seccion;
  if (titulo.length < 3 || !bajada || !NOMBRES_DE_SECCION.includes(seccion)) return { error: 'ia-invalida' };
  const fuentes = v.origen && v.fuenteUrl ? [{ medio: v.origen, url: v.fuenteUrl }] : v.origen ? [{ medio: v.origen }] : [];
  const cuando = ahora.toISOString();
  const { grafico, ...fichaIA } = nota.ficha;
  const ficha = {
    ...fichaIA, ...(grafico ? { grafico } : {}), pideCriterio: false, carga: { por, cuando },
    crudo: {
      por, cuando, pedidos, caracteres: v.crudo.length, seccionPorIA: v.seccion === 'ia',
      verificacion: { marcadas, ...(noCorrio ? { noCorrio: true } : {}), ...(nota.verificacion?.graficoDescartado ? { graficoDescartado: nota.verificacion.graficoDescartado } : {}) },
      ...(v.reel ? { reel: { destinos: v.destinos, fotos: v.reelFotos } } : {}),
    },
  };
  const datos = { titulo, bajada, seccion, parrafos: cuerpo, firma: v.firma, fuentes, video: null };
  const id = await insertarBorrador(env, {
    datos, ficha, dosLineas: nota.enDosLineas || bajada, pedidos,
    verificacion: { oracionesQuitadas: quitadas, reescrita: false, propia: true, panel: true, crudo: true, ...(nota.verificacion?.graficoDescartado ? { graficoDescartado: nota.verificacion.graficoDescartado } : {}) },
  }, { ahora });
  return { ok: true, id, marcadas, pedidos };
}
