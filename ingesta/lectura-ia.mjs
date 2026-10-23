// La lectura rápida con IA (plan V2.2, docs/historico/PLAN-V2.2.md § 7).
//
// Una IA lee el título y el resumen de cada nota nueva, con el perfil de
// Balcarce al lado (ingesta/perfil-balcarce.md) y la ciudad del medio, y
// completa una ficha: de dónde es el hecho, de qué sección es, si le importa a
// un vecino de Balcarce y por qué.
//
// DESDE EL 27/09 DECIDE, sin prueba previa (Hernán: se corrige en vivo). Las
// fichas se guardan en web/data/fichas.json y aplicarFichas() las usa: saca lo
// que no es para Radar, corrige la sección y dice qué es de Balcarce. El
// semáforo sigue mandando y sin ficha queda lo de siempre.
//
// Usa la clave de clasificación; mientras no esté cargada, la gratis de
// redacción. Nunca la de redes, cuyo cupo de voz es chico (reels/claves.mjs). Sin dependencias: sólo
// fetch de Node.

import fs from 'node:fs';
import path from 'node:path';
import { claveClasificacion, claveGroq, claveOpenRouter, leerVariable, MODELO_DE_TEXTO } from '../reels/claves.mjs';
import { pedirJsonAOpenRouter } from '../reels/openrouter.mjs';
import { fichaDeFuente, FUENTES, FUENTES_NACIONALES, CONEXION_ARGENTINA, PALABRAS_LOCALES, PALABRAS_ZONA, nombraLocalidadDudosa } from './fuentes.mjs';
import { FUENTES_CRUCE } from './fuentes-cruce.mjs';
import { diaAR, minutoDelDiaAR } from './zona.mjs';
import { sinTildes } from '../web/lib/texto.js';
import { SECCIONES_SUMADAS, TEXTO_PARA_LA_FICHA, esSumada } from './secciones-nuevas.mjs';
import { mediosMinimos } from './popularidad.mjs';
import { policialNacionalRelevante } from './policial-nacional.mjs';
import { MATERIAL_NO_ORDENES } from './prompt-editorial.mjs';

/** ¿El título nombra a Balcarce o a una localidad del partido? San Agustín y
 *  Los Pinos, con respaldo (regla 179): en un medio de acá alcanzan solas. */
function nombraBalcarceEnElTitulo(n) {
  const titulo = sinTildes(n.titulo ?? '');
  return PALABRAS_LOCALES.some((p) => titulo.includes(sinTildes(p))) || !!nombraLocalidadDudosa(n, { soloTitulo: true });
}

const AQUI = import.meta.dirname;
const MODELO = MODELO_DE_TEXTO;

// El segundo proveedor (28/09): gpt-oss-120b, el modelo de OpenAI que Groq
// aloja gratis (Llama dejó de estar en el plan gratis en agosto). Sólo para
// TEXTO: la lectura no manda imágenes.
const MODELO_GROQ = 'openai/gpt-oss-120b';

/** Las secciones de siempre, en el orden en que se le nombran a la IA. */
const LAS_ONCE = ['Balcarce', 'Política', 'Policiales', 'Fútbol', 'Deportes', 'Automovilismo',
  'Economía', 'Agro', 'Tecnología', 'Cultura y agenda', 'Argentina'];
/**
 * Las secciones que puede elegir: las de la web, sin inventar ninguna. Desde el 17/10/2026 (regla 211) son catorce: las once de
 * siempre más Educación, Salud y Ciencia (SECCIONES_SUMADAS), después de Policiales. El interruptor SECCIONES_NUEVAS de la regla
 * 187 se sacó.
 */
export function seccionesDeLaFicha() {
  return [...LAS_ONCE.slice(0, 3), ...SECCIONES_SUMADAS, ...LAS_ONCE.slice(3)];
}
export const SECCIONES_DE_LA_FICHA = seccionesDeLaFicha();
export const AMBITOS = ['balcarce', 'region', 'provincia', 'nacional', 'internacional'];
export const IMPACTOS = ['directo', 'indirecto', 'nulo'];
export const RAZONES = ['local', 'servicio', 'actividad', 'provincia', 'nacional', 'popular', 'ninguna'];
export const IMPORTANCIAS = ['alta', 'media', 'baja'];

/** Los números de la lectura con IA (decide desde el 27/09). */
export const LECTURA = {
  // 12 y no 20: con 20 notas y sus bajadas, un pedido de cada tres pasaba el
  // minuto de espera y se perdía (27/09).
  notasPorPedido: 12,
  // Por corrida y por día. Mientras la lectura comparte la clave gratis de la
  // redacción (500 pedidos por día), 60; con su propia clave
  // (GEMINI_API_KEY_CLASIFICACION), 200: el 27/09 quedaron 170 historias de
  // afuera sin leer porque se habían gastado los 60 (topeDeLecturas).
  pedidosPorCorrida: 5,
  pedidosPorDia: 60,
  pedidosPorDiaConClavePropia: 200,
  // Las repetidas: una vuelta por corrida como mucho, y sólo si cambió la
  // lista. Cada vuelta hace hasta dos pedidos (lo que va a salir, y lo de
  // afuera que espera por pocos medios) y cuenta como una contra este tope
  // (web/scripts/generar-datos.mjs).
  pedidosRepetidasPorDia: 60,
  // Las parejas (lo que la IA confirma de a dos, `confirmarParejas`): un pedido por corrida como mucho.
  pedidosParejasPorDia: 40,
  // Cuánto se puede adelantar el cupo del día lo que trae algo de acá nuevo (cupoDelMomento, regla 196).
  adelantoDeAca: 6,
  // Cuánto se guarda una ficha.
  diasDeFichas: 3,
  resumenMaximo: 500,
};

/** El texto de la sección de la ficha, el mismo que el del mapa de secciones (ingesta/secciones-nuevas.mjs). */
const lineaDe = (s) => `  · ${s}: ${TEXTO_PARA_LA_FICHA[s]}`;

const INSTRUCCION = `Sos el editor de selección de Radar Balcarce, un medio digital de Balcarce, provincia de Buenos Aires.
Con el perfil de Balcarce que sigue, completá una ficha por nota (con el mismo "id"): qué valor tiene para quien vive en Balcarce. ${MATERIAL_NO_ORDENES}

- Juzgá por lo que cuenta la nota, no por palabras sueltas ("Fangio", "taller" o "Balcarce" no definen nada). El ámbito es el del HECHO, no el del medio que lo publica (cada nota dice de qué ciudad es el medio). Lo que hace o dice el gobierno argentino en el exterior es "nacional", no "internacional".
- Si una medida provincial o nacional cambia algo concreto en Balcarce (una tarifa, un subsidio, un trámite, un precio), el impacto es "directo". Que la nota nombre Balcarce en una lista no la hace de Balcarce.
- Si no es de Balcarce, decí en una frase concreta por qué le interesaría a un vecino; si no hay una razón concreta, el impacto es "nulo" y la razón "ninguna". No inventes vínculos.
- "impacto_balcarce": "directo" si pasa en Balcarce o cambia algo concreto acá; "indirecto" si toca la zona o una actividad de la ciudad (campo, papa, automovilismo); "nulo" si no.
- "razon": local (pasó acá), servicio (cambia algo práctico: tarifas, trámites, salud, clima, rutas), actividad (automovilismo, campo, papa), provincia (medida provincial con efecto acá), nacional (noticia nacional importante), popular (habla todo el país) o ninguna.
- "importancia": qué tan relevante es la noticia en sí, no qué tan cerca está de Balcarce.
- "seccion", qué va en cada una:
  · Balcarce: lo que pasa en la ciudad y no tiene una sección más precisa (vecinos, instituciones, obras), y lo práctico para el vecino: cortes de luz o agua, trámites, horarios, tarifas y subsidios de servicios públicos, vencimientos, alertas.
  · Política: el Concejo, el intendente, el gobierno provincial y nacional, leyes, elecciones.
  · Policiales: delitos, accidentes, incendios, bomberos, policía.
${SECCIONES_SUMADAS.filter((s) => s !== 'Ciencia').map(lineaDe).join('\n')}
  · Fútbol: el fútbol, de la liga de Balcarce a la Selección y los clubes argentinos.
  · Deportes: todos los demás deportes (básquet, hockey, rugby, tenis, boxeo, UFC…), salvo el automovilismo.
  · Automovilismo: autos de carrera (TC, Turismo Nacional, Fórmula 1, MotoGP, karting, rally), el autódromo Juan Manuel Fangio y Fangio. Nunca Deportes.
  · Economía: precios, inflación, dólar, empleo, empresas, combustibles.
  · Agro: campo, papa, ganadería, INTA, clima para el productor.
${lineaDe('Ciencia')}
${lineaDe('Tecnología')}
  · Cultura y agenda: espectáculos, música, teatro, cine, libros, muestras, actividades.
  · Argentina: lo nacional que no entra en ninguna de las anteriores (sociedad, clima, grandes hechos).
- "es_publicidad": promociona un comercio, producto o servicio sin ser noticia.
- "es_chimento": farándula o vida privada de famosos (romances, separaciones, peleas, internaciones, fiestas, viajes). La muerte de una figura, un premio, un estreno o una obra no son chimento.`;

/** La instrucción que lee la IA (desde el 17/10/2026, con Educación, Salud y Ciencia siempre). */
export function instruccion() {
  return INSTRUCCION;
}

let perfilCacheado = null;
/** El perfil de Balcarce, leído tal cual del archivo. */
export function perfilDeBalcarce() {
  if (perfilCacheado == null) {
    perfilCacheado = fs.readFileSync(path.join(AQUI, 'perfil-balcarce.md'), 'utf8');
  }
  return perfilCacheado;
}

// Con las del cruce: sin ellas, los medios del cruce iban a la IA con la
// ciudad "desconocida" (27/09).
const FUENTE_POR_MEDIO = new Map([...FUENTES_CRUCE, ...FUENTES, ...FUENTES_NACIONALES].map((f) => [f.medio, f]));

/** Cuántos pedidos de fichas se hacen por día: más con la clave propia (27/09). */
export function topeDeLecturas(o) {
  return leerVariable('GEMINI_API_KEY_CLASIFICACION', o) ? LECTURA.pedidosPorDiaConClavePropia : LECTURA.pedidosPorDia;
}

/**
 * ¿Se puede gastar un pedido más del tope de hoy a esta hora? (regla 196, 17/10/2026). El tope del día se reparte por hora: a
 * cada minuto se puede haber gastado lo que corresponde al día transcurrido más media hora, así lo que sobra de la mañana queda
 * para la tarde y nunca se acaba todo antes de la noche. El 16/10 la IA de repetidas gastó sus 60 vueltas a las 15:06 (la web
 * se armaba 72 veces por día) y no volvió a mirar hasta la medianoche. Lo que trae algo de acá nuevo (`prioridad`) puede
 * adelantarse `adelanto` pedidos, nunca pasar el tope del día. Con las 48 vueltas de siempre el reparto no frena nada.
 */
export function cupoDelMomento({ usados = 0, tope, ahora = new Date(), prioridad = false, adelanto = LECTURA.adelantoDeAca } = {}) {
  if (!(tope > 0) || usados >= tope) return false;
  const hastaAhora = Math.ceil((tope * (minutoDelDiaAR(ahora) + 30)) / 1440) + (prioridad ? adelanto : 0);
  return usados < Math.min(tope, hastaAhora);
}

/** De qué ciudad es el medio de una nota. */
export function ciudadDelMedio(nota) {
  const f = FUENTE_POR_MEDIO.get(nota.medio ?? nota.medios?.[0]);
  return f ? fichaDeFuente(f).ciudad : 'desconocida';
}

/** Lo que se le manda de cada nota: poco, y sólo lo público. */
export function entradaDeNota(nota) {
  const resumen = String(nota.resumenFuente ?? nota.copete ?? '').replace(/\s+/g, ' ').trim().slice(0, LECTURA.resumenMaximo);
  return { id: nota.id, titulo: nota.titulo, resumen, medio: nota.medio ?? nota.medios?.[0] ?? '', ciudad_del_medio: ciudadDelMedio(nota) };
}

/** El pedido completo para un grupo de notas. */
export function pedidoPara(notas) {
  return `${instruccion()}\n\n--- PERFIL DE BALCARCE ---\n${perfilDeBalcarce()}\n\n--- NOTAS ---\n${JSON.stringify(notas.map(entradaDeNota), null, 1)}`;
}

/** El esquema que Gemini tiene que respetar: listas cerradas, sin campos libres de más. */
export const esquema = () => ({
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      id: { type: 'STRING' },
      ambito: { type: 'STRING', enum: AMBITOS },
      seccion: { type: 'STRING', enum: seccionesDeLaFicha() },
      impacto_balcarce: { type: 'STRING', enum: IMPACTOS },
      razon: { type: 'STRING', enum: RAZONES },
      importancia: { type: 'STRING', enum: IMPORTANCIAS },
      es_publicidad: { type: 'BOOLEAN' },
      es_chimento: { type: 'BOOLEAN' },
      por_que_interesa: { type: 'STRING' },
    },
    // Sin lugar_del_hecho, es_anuncio ni clave_tema desde el 28/09 (auditoría):
    // se pedían y no decidían nada. es_chimento sí decide, así que es obligatoria.
    required: ['id', 'ambito', 'seccion', 'impacto_balcarce', 'razon', 'importancia',
      'es_publicidad', 'es_chimento', 'por_que_interesa'],
  },
});
export const ESQUEMA = esquema();

/** Una ficha válida, o null si algo no está en su lista. No se corrige nada:
 *  lo que no cierra se descarta y se vuelve a pedir en otra corrida. */
export function fichaValida(f) {
  if (!f || typeof f !== 'object' || !f.id) return null;
  if (!AMBITOS.includes(f.ambito) || !(seccionesDeLaFicha().includes(f.seccion) || ['Servicios', 'País'].includes(f.seccion)) || !IMPACTOS.includes(f.impacto_balcarce)
    || !RAZONES.includes(f.razon) || !IMPORTANCIAS.includes(f.importancia)) return null;
  return {
    ambito: f.ambito,
    seccion: f.seccion,
    impacto: f.impacto_balcarce,
    razon: f.razon,
    importancia: f.importancia,
    publicidad: f.es_publicidad === true,
    // Las fichas de antes del 27/09 no lo traen: cuentan como "no".
    chimento: f.es_chimento === true,
    porque: String(f.por_que_interesa ?? '').slice(0, 200),
  };
}

/** Un pedido a Gemini. Devuelve la lista de fichas válidas por id, o lanza. */
export async function leerGrupo(notas, { clave, fetchFn = fetch } = {}) {
  const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
    method: 'POST',
    // La clave va en el encabezado, nunca en la dirección (docs/10-REGLAS-Y-PRUEBAS.md, regla 16).
    headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
    body: JSON.stringify({
      contents: [{ parts: [{ text: pedidoPara(notas) }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: esquema(), temperature: 0 },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  const j = await res.json();
  const texto = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  let lista;
  try { lista = JSON.parse(texto); } catch { throw new Error('la respuesta no es JSON'); }
  const pedidos = new Set(notas.map((n) => n.id));
  const fichas = {};
  for (const f of Array.isArray(lista) ? lista : []) {
    const v = fichaValida(f);
    if (v && pedidos.has(f.id)) fichas[f.id] = v;
  }
  return fichas;
}

/**
 * La forma de la ficha contada en palabras, armada con el MISMO esquema que se le pasa a Gemini (regla 193, 17/10/2026):
 * cada campo obligatorio con su nombre exacto y sus valores posibles. Hasta el 17/10 a Groq se le decía sólo
 * `{"fichas": [ … ]}`, y la instrucción nombra «el ámbito» (con tilde) pero nunca el campo `ambito` ni sus valores, ni
 * `importancia`, ni `por_que_interesa`: el modelo inventaba los nombres y `fichaValida` descartaba TODAS las fichas, así
 * que el respaldo de la lectura no respaldaba nada.
 */
export function formaDeLaFicha() {
  const { properties, required } = esquema().items;
  const campos = required.map((c) => {
    const p = properties[c];
    const valores = p.enum ? p.enum.map((v) => `"${v}"`).join(' | ') : p.type === 'BOOLEAN' ? 'true | false' : c === 'id' ? 'el mismo "id" de la nota' : 'una frase';
    return `"${c}": ${valores}`;
  });
  return `{"fichas": [{ ${campos.join(', ')} }]}`;
}

/** El valor de una lista cerrada escrito como lo escribió el modelo («Región», «región», «Alta») → el de la lista, o tal cual. */
const deLaLista = (valor, lista) => lista.find((x) => sinTildes(x) === sinTildes(String(valor ?? '').trim())) ?? valor;
const comoBooleano = (v) => (v === true || v === 'true' ? true : v === false || v === 'false' ? false : v);

/**
 * Una ficha de Groq con los nombres y los valores como los pide el esquema (regla 193): los campos sin tildes ni
 * mayúsculas («ámbito» → «ambito»), los valores de las listas cerradas como están en la lista («Región» → «region») y los
 * sí/no como booleanos. No completa nada: lo que falta sigue faltando y `fichaValida` la descarta, como a una de Gemini.
 */
export function fichaDeGroq(f) {
  if (!f || typeof f !== 'object') return f;
  const k = {};
  for (const [campo, v] of Object.entries(f)) k[sinTildes(campo).trim().replace(/[\s-]+/g, '_')] = v;
  return {
    ...k,
    ...(k.id != null ? { id: String(k.id) } : {}),
    ambito: deLaLista(k.ambito, AMBITOS),
    seccion: deLaLista(k.seccion, [...seccionesDeLaFicha(), 'Servicios', 'País']),
    impacto_balcarce: deLaLista(k.impacto_balcarce, IMPACTOS),
    razon: deLaLista(k.razon, RAZONES),
    importancia: deLaLista(k.importancia, IMPORTANCIAS),
    es_publicidad: comoBooleano(k.es_publicidad),
    es_chimento: comoBooleano(k.es_chimento),
  };
}

/**
 * Igual que leerGrupo, pero con Groq (28/09): un segundo proveedor gratis
 * para cuando Gemini falla o se queda sin cupo. Mismo prompt, mismo esquema
 * contado en palabras (la API de Groq no fuerza un JSON Schema como la de
 * Gemini: `formaDeLaFicha`, regla 193) y la misma validación (fichaValida): nunca decide distinto por
 * venir de otro modelo. Su API es la de OpenAI (mensajes de chat), así que
 * el pedido y la respuesta tienen otra forma.
 */
export async function leerGrupoGroq(notas, { clave, fetchFn = fetch, modelo = MODELO_GROQ } = {}) {
  const instruccion = `${pedidoPara(notas)}\n\nDevolvé un objeto JSON con esta forma exacta y nada más, con una ficha por nota, `
    + `estos nombres de campo tal cual y, en los que tienen opciones, sólo uno de esos valores:\n${formaDeLaFicha()}`;
  const res = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    // La clave va en el encabezado, nunca en la dirección (docs/10-REGLAS-Y-PRUEBAS.md, regla 16).
    headers: { 'content-type': 'application/json', authorization: `Bearer ${clave}` },
    body: JSON.stringify({
      model: modelo,
      messages: [{ role: 'user', content: instruccion }],
      response_format: { type: 'json_object' },
      temperature: 0,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  const j = await res.json();
  return fichasDeTexto(j.choices?.[0]?.message?.content ?? '', notas, { ia: 'groq' });
}

/**
 * Las fichas válidas que trae el texto de una respuesta tipo OpenAI (Groq u OpenRouter): { id: ficha }. Se anota quién contestó
 * (`ia`, y `modelo` si se sabe; auditoría 2.0, 04 § 4): sin esto no se sabe cuántas veces se usa el respaldo ni con qué.
 * Lanza si el texto no es JSON.
 */
function fichasDeTexto(texto, notas, marca) {
  let obj;
  try { obj = JSON.parse(texto); } catch { throw new Error('la respuesta no es JSON'); }
  // Por las dudas de que conteste una lista sola en vez del objeto pedido.
  const lista = Array.isArray(obj) ? obj : Array.isArray(obj?.fichas) ? obj.fichas : (Object.values(obj ?? {}).find(Array.isArray) ?? []);
  const pedidos = new Set(notas.map((n) => n.id));
  const fichas = {};
  for (const cruda of lista) {
    const f = fichaDeGroq(cruda);
    const v = fichaValida(f);
    if (v && pedidos.has(f.id)) fichas[f.id] = { ...v, ...marca };
  }
  return fichas;
}

/**
 * Igual que leerGrupoGroq, con OpenRouter (17/10/2026): el ÚLTIMO respaldo, con modelos gratis (reels/openrouter.mjs), sólo si
 * Gemini y Groq fallaron. Mismo prompt, misma forma contada en palabras y la misma validación (fichaValida): una ficha mal formada
 * se descarta, nunca se arregla. La ficha queda marcada con `ia: 'openrouter'` y el `modelo` que la escribió. Lanza si falla
 * (con `status`).
 */
export async function leerGrupoOpenRouter(notas, { clave, fetchFn = fetch, modelos, ahora, archivoDeUso } = {}) {
  const instruccion = `${pedidoPara(notas)}\n\nDevolvé un objeto JSON con esta forma exacta y nada más, con una ficha por nota, `
    + `estos nombres de campo tal cual y, en los que tienen opciones, sólo uno de esos valores:\n${formaDeLaFicha()}`;
  const r = await pedirJsonAOpenRouter({
    tarea: 'lectura', prompt: instruccion, clave, fetchFn, modelos, ahora, archivoDeUso, temperatura: 0, maxTokens: 6000,
  });
  return fichasDeTexto(r.texto, notas, { ia: 'openrouter', modelo: r.modelo });
}

/** Las fichas guardadas, sin las de más de `diasDeFichas`. */
export function podarFichas(guardado = {}, { ahora = Date.now(), dias = LECTURA.diasDeFichas } = {}) {
  const limite = ahora - dias * 86400000;
  const fichas = Object.fromEntries(Object.entries(guardado.fichas ?? {})
    .filter(([, f]) => Date.parse(f?.cuando ?? '') >= limite));
  return { ...guardado, fichas };
}

/**
 * Lee con IA las notas que todavía no tienen ficha. Devuelve el archivo nuevo
 * ({ dia, pedidosHoy, fichas }) y lo que pasó. No lanza nunca: si Gemini falla
 * o no hay clave, deja todo como estaba y lo cuenta.
 */
export async function leerNotasNuevas(notas, {
  guardado = {}, fetchFn = fetch, ahora = new Date(), clave = claveClasificacion(), claveRespaldo = claveGroq(), registro = () => {},
  claveOpenRouterDeRespaldo = claveOpenRouter(),
} = {}) {
  const dia = diaAR(ahora);
  let archivo = podarFichas(guardado, { ahora: ahora.getTime() });
  if (archivo.dia !== dia) archivo = { ...archivo, dia, pedidosHoy: 0 };
  archivo.pedidosHoy ??= 0;
  const cuenta = {
    pedidos: 0, nuevas: 0, fallas: 0, sinClave: !clave, groq: 0, openrouter: 0,
  };
  if (!clave) return { archivo, cuenta };

  const faltan = notas.filter((n) => n?.id && !archivo.fichas[n.id]);
  const grupos = [];
  for (let i = 0; i < faltan.length; i += LECTURA.notasPorPedido) grupos.push(faltan.slice(i, i + LECTURA.notasPorPedido));

  for (const grupo of grupos) {
    if (cuenta.pedidos >= LECTURA.pedidosPorCorrida || archivo.pedidosHoy >= topeDeLecturas()) break;
    cuenta.pedidos += 1;
    archivo.pedidosHoy += 1;
    let nuevas;
    let error;
    try {
      nuevas = await leerGrupo(grupo, { clave, fetchFn });
    } catch (e) {
      error = e;
    }
    // Gemini falló (sin cupo, caído, lo que sea): con una segunda clave
    // gratis (Groq, 28/09) se prueba el mismo grupo ahí antes de darlo por
    // perdido. Nunca se pasa a la clave de redes (su cupo de voz es chico).
    if (!nuevas && claveRespaldo) {
      try {
        nuevas = await leerGrupoGroq(grupo, { clave: claveRespaldo, fetchFn });
        cuenta.groq += 1;
        error = null;
      } catch (e2) {
        error = e2;
      }
    }
    // Gemini y Groq fallaron: último respaldo, los modelos gratis de OpenRouter (17/10/2026). Sin su clave, no se llama a nadie.
    if (!nuevas && claveOpenRouterDeRespaldo) {
      try {
        nuevas = await leerGrupoOpenRouter(grupo, { clave: claveOpenRouterDeRespaldo, fetchFn, ahora });
        cuenta.openrouter += 1;
        registro(`  lectura con IA: un pedido salió con OpenRouter (${Object.values(nuevas)[0]?.modelo ?? 'modelo gratis'})`);
        error = null;
      } catch (e3) {
        error = e3;
      }
    }
    if (nuevas) {
      for (const [id, f] of Object.entries(nuevas)) {
        archivo.fichas[id] = { ...f, cuando: ahora.toISOString() };
        cuenta.nuevas += 1;
      }
    } else {
      cuenta.fallas += 1;
      registro(`  lectura con IA: falló un pedido (${error?.message})`);
      // Sin cupo en ninguna de las dos: no se insiste en esta corrida.
      if (error?.status === 429) break;
    }
  }
  return { archivo, cuenta };
}

/**
 * La IA decide (27/09, Hernán: "sin testear, corregimos en vivo"). Aplica cada
 * ficha a su nota, con límites que no se negocian:
 *
 *   · El semáforo manda: lo rojo o amarillo sigue igual. La IA sólo puede
 *     endurecer (sacar una nota o mandarla a esperar), nunca destrabar.
 *   · Sin ficha, la nota sigue como la decidió el sistema de siempre.
 *
 * Con ficha:
 *   · No entra: publicidad; lo del extranjero que no es automovilismo ni
 *     nombra a una figura argentina; lo de un medio de afuera sin relación
 *     con Balcarce (impacto nulo); un policial que no es de Balcarce.
 *   · Es de Balcarce sólo con dos llaves: la fuente es de acá o el medio lo
 *     dice en el título, Y la IA dice que el hecho es de Balcarce. Una nota
 *     nacional reproducida por un medio local deja de ser local (sin los +25)
 *     y queda marcada `noEsDeAcaSegunLaIA`: para esDeAca (ingesta/ingesta.mjs)
 *     el título ya no alcanza, y pide los medios de lo de afuera.
 *   · La sección es la de la IA, salvo "Balcarce" para lo que no es de acá.
 *     Las fichas viejas que dicen Servicios o País se traducen a Balcarce y
 *     Argentina.
 *
 * Devuelve { notas, cambios } sin tocar las originales.
 */
/** El motivo con que espera una nota de un medio de acá que no nombra nada de
 *  acá, hasta que la lea la IA (28/09). */
export const MOTIVO_ESPERA_LECTURA = 'de un medio de acá sin nombrar Balcarce ni la zona: espera la lectura con IA';

/**
 * ¿La nota nombra algo de Balcarce o de la zona en el título o al comienzo?
 * Con palabras enteras ("papa" no es "papá"; "la 226" sí).
 */
export function mencionaAca(nota) {
  if (nota?.nombraBalcarce || nota?.deLaZona) return true;
  const texto = ` ${sinTildes(`${nota?.titulo ?? ''} ${String(nota?.resumenFuente ?? nota?.cuerpo ?? '').slice(0, 600)}`).replace(/[^a-z0-9ñ]+/g, ' ')} `;
  return [...PALABRAS_LOCALES, ...PALABRAS_ZONA].some((p) => texto.includes(` ${sinTildes(p).replace(/[^a-z0-9ñ]+/g, ' ').trim()} `))
    || !!nombraLocalidadDudosa(nota ?? {}); // San Agustín, Los Pinos: en un medio de acá, solas (regla 179)
}

/** Desde cuándo las fichas conocen la sección Fútbol (con margen: fue el 27/09 a la tarde). */
const FICHAS_CON_FUTBOL = '2026-09-28T00:00:00Z';

export function aplicarFichas(notas, fichas = {}, {
  esperarSinFicha = false, yaPublicadas = new Set(),
} = {}) {
  const cambios = { sacadas: [], dejanDeSerLocales: [], otraSeccion: [], aEsperar: [] };
  // Las fichas viejas pueden decir "Servicios", que ya no existe (27/09).
  // Educación, Salud y Ciencia (regla 187, activas desde la 211) nunca se llevan una nota de Política o Policiales, que esperan
  // a una persona en todas las piezas de redes.
  const seccionDe = (f, n) => {
    const s = { Servicios: 'Balcarce', País: 'Argentina' }[f.seccion] ?? f.seccion;
    if (esSumada(s) && ['Política', 'Policiales'].includes(n.seccion)) return n.seccion;
    return s;
  };
  const salida = [];
  for (const original of notas) {
    const f = fichas[original.id];
    // Un medio de acá que copia una noticia de afuera sin nombrar nada de acá
    // (28/09: Radio Sudestada con un referéndum de Suiza, salió en Balcarce
    // porque ningún medio de afuera contó lo mismo y la IA todavía no la había
    // leído): espera a la IA. Sólo si la lectura anda (esperarSinFicha) y si la
    // nota nunca salió: lo ya publicado no se toca.
    // Un organismo de Balcarce (la Municipalidad, el Concejo, la Facultad: `oficial`) no espera (regla 180): lo que
    // comunica es de acá aunque no diga "Balcarce" ("El hospital incorporó una nueva mesa de cirugía", "Sábado a
    // puro básquet"). La IA la sigue leyendo después y la puede sacar como a cualquier otra.
    if (!f && esperarSinFicha && original.semaforo === 'verde' && original.alcance === 'local' && !original.oficial
      && !yaPublicadas.has(original.id) && !mencionaAca(original)) {
      salida.push({ ...original, semaforo: 'amarillo', motivo: MOTIVO_ESPERA_LECTURA });
      cambios.aEsperar.push({ id: original.id, titulo: original.titulo, porque: MOTIVO_ESPERA_LECTURA });
      continue;
    }
    if (!f || original.semaforo === 'rojo') { salida.push(original); continue; }
    const n = { ...original };
    const deFuenteLocal = n.alcance === 'local';
    const deFierros = f.seccion === 'Automovilismo' || n.seccion === 'Automovilismo' || !!n.figura;
    const llaveDeLaFuente = deFuenteLocal || !!n.nombraBalcarce;
    // El ámbito es dónde se decidió; el impacto, dónde pega. Una medida
    // provincial que cambia la tarifa de luz acá es de Balcarce (27/09).
    const esLocal = llaveDeLaFuente && (f.ambito === 'balcarce' || f.impacto === 'directo');
    // Lo argentino en el exterior (Milei en París, Malvinas en la ONU) y lo que
    // cubren muchos medios o es muy importante no se saca por "no ser de acá".
    const palabrasDelTitulo = new Set(sinTildes(n.titulo ?? '').split(/[^a-z0-9ñ]+/));
    const conexionArgentina = CONEXION_ARGENTINA.some((p) => palabrasDelTitulo.has(sinTildes(p)));
    // La popularidad manda (reglas 211 y 260): lo que cuentan tantos medios como pide su sección (3, o 2 en un área chica) no se
    // saca por "no tener relación con Balcarce": ya llegó a lo que se pide.
    const seccionDeLaIA = seccionDe(f, n);
    const medios = n.medios?.length ?? 1;
    const nacionalQueImporta = medios >= mediosMinimos(seccionDeLaIA) || f.importancia === 'alta'
      || ['nacional', 'popular', 'servicio'].includes(f.razon);
    const caso = { id: n.id, titulo: n.titulo, porque: f.porque };

    let motivo = null;
    if (f.publicidad) motivo = 'es publicidad';
    else if (f.chimento) motivo = 'es un chimento';
    // Del extranjero, sólo si un argentino se destaca en algo o le importa a
    // Balcarce (Hernán, 27/09): una figura argentina (Colapinto, Messi) o la
    // conexión argentina en el título. La Fórmula 1 sin un argentino, no.
    // Sin excepciones (desde la regla 260 tampoco la ciencia y la tecnología).
    else if (f.ambito === 'internacional' && !n.figura && !conexionArgentina) motivo = 'es del extranjero';
    // De un medio de acá sólo se saca si ni siquiera nombra a Balcarce en el
    // título ("precios sugeridos para alquilar en Mar del Plata", 27/09).
    else if (f.impacto === 'nulo' && !deFierros && !conexionArgentina && !nacionalQueImporta
      && (!deFuenteLocal || !nombraBalcarceEnElTitulo(n))) motivo = 'no tiene relación con Balcarce';
    // Lo de la zona sí entra (28/09): ver esPolicialDeAfuera, ingesta/ingesta.mjs.
    else if (f.seccion === 'Policiales' && !esLocal && !n.deLaZona && !policialNacionalRelevante(n, medios)) motivo = 'policial que no es de Balcarce';
    if (motivo) { cambios.sacadas.push({ ...caso, motivo }); continue; }

    // Tenía la llave de la fuente o del título pero la IA dice que el hecho no
    // es de acá: se rige por lo de afuera (esDeAca, ingesta/ingesta.mjs).
    if (llaveDeLaFuente && !esLocal) n.noEsDeAcaSegunLaIA = true;
    if (n.local && !esLocal) {
      n.local = false;
      n.relevancia = Math.max(0, (n.relevancia ?? 0) - 25);
      cambios.dejanDeSerLocales.push(caso);
    }
    // Las fichas de antes del 27/09 a la tarde no conocían Fútbol: si la IA
    // dice Deportes y las palabras dicen Fútbol, es Fútbol. Sólo en ésas: una
    // ficha nueva que dice Deportes sabe lo que dice (29/09: "Pato Naranja goleó
    // a Pampas", de rugby, salió en Fútbol por "goleó"). Las fichas duran tres
    // días (LECTURA.diasDeFichas): desde el 1/10 no queda ninguna vieja.
    const sinFutbol = !(Date.parse(f.cuando ?? '') >= Date.parse(FICHAS_CON_FUTBOL));
    const deLaIA = sinFutbol && seccionDe(f, n) === 'Deportes' && n.seccion === 'Fútbol' ? 'Fútbol' : seccionDe(f, n);
    const seccion = deLaIA === 'Balcarce' && !esLocal ? (['Servicios', 'País'].includes(n.seccion) ? 'Argentina' : n.seccion)
      : deLaIA === 'Argentina' && esLocal ? 'Balcarce'
        : deLaIA;
    if (seccion !== n.seccion) {
      cambios.otraSeccion.push({ ...caso, antes: n.seccion, ahora: seccion });
      // La sección de antes queda guardada: si el interruptor se apaga, la web vuelve a mostrarla ahí (regla 187).
      if (esSumada(seccion)) n.seccionAntes = n.seccion;
      n.seccion = seccion;
    }
    salida.push(n);
  }
  return { notas: salida, cambios };
}

// ------------------------------------------------- las parejas sospechosas (1/10)

// Para Groq: gpt-oss-20b, que tiene su propio cupo (1.000 pedidos por día) y deja libre el del 120b,
// que es el respaldo de la lectura. Es sólo texto.
const MODELO_GROQ_PAREJAS = 'openai/gpt-oss-20b';

const INSTRUCCION_PAREJAS = `Cada par son dos notas de un medio de Balcarce, publicadas con poco tiempo de diferencia. ${MATERIAL_NO_ORDENES}
Decidí si cuentan EXACTAMENTE el mismo hecho, aunque estén escritas con otras palabras o con distinto detalle. NO lo es si son noticias distintas sobre el mismo tema (la pole y la carrera, dos partidos), si es un anuncio y su resultado (una dice que algo VA a pasar —una charla, una cirugía, un partido, un acto— y la otra cuenta cómo salió o que ya pasó), o si cambia la persona, el lugar, la fecha o la cifra principal. Ante la duda, mismo = false.
Devolvé {"pares":[{"clave":"…","mismo":true|false}]}, una entrada por par, con la clave que se te dio.`;

const pedidoDeParejas = (parejas) => `${INSTRUCCION_PAREJAS}

${JSON.stringify(parejas.map(({ clave, a, b }) => ({
    clave,
    a: { titulo: a.titulo, texto: String(a.resumenFuente ?? a.copete ?? '').slice(0, 280), medios: (a.medios ?? []).slice(0, 3), fecha: a.fecha },
    b: { titulo: b.titulo, texto: String(b.resumenFuente ?? b.copete ?? '').slice(0, 280), medios: (b.medios ?? []).slice(0, 3), fecha: b.fecha },
  })), null, 1)}`;

/** Lee la respuesta { pares: [{ clave, mismo }] } (o la lista sola) y deja sólo lo válido: { clave: boolean }. */
export function leerRespuestaDeParejas(texto, validas) {
  let obj;
  try { obj = JSON.parse(texto); } catch { throw new Error('la respuesta no es JSON'); }
  const lista = Array.isArray(obj) ? obj : Array.isArray(obj?.pares) ? obj.pares : (Object.values(obj ?? {}).find(Array.isArray) ?? []);
  const salida = {};
  for (const p of lista) if (validas.has(p?.clave) && typeof p.mismo === 'boolean') salida[p.clave] = p.mismo;
  return salida;
}

/**
 * Pregunta por parejas de notas si cuentan el mismo hecho: { clave: true|false } con lo que la IA
 * contestó (lo que no contestó no está). Gemini primero; si falla o se queda sin cupo, Groq. Lanza
 * si fallan los dos.
 */
export async function confirmarParejas(parejas, { clave, claveRespaldo, fetchFn = fetch } = {}) {
  if (!parejas.length) return {};
  const validas = new Set(parejas.map((p) => p.clave));
  const prompt = pedidoDeParejas(parejas);
  let falla = null;
  if (clave) {
    try {
      const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e; }
      const j = await res.json();
      return leerRespuestaDeParejas(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '', validas);
    } catch (e) { falla = e; }
  }
  if (!claveRespaldo) throw falla ?? new Error('sin clave');
  const res = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${claveRespaldo}` },
    body: JSON.stringify({ model: MODELO_GROQ_PAREJAS, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0 }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) { const e = new Error(`Groq HTTP ${res.status}`); e.status = res.status; throw e; }
  const j = await res.json();
  return leerRespuestaDeParejas(j.choices?.[0]?.message?.content ?? '', validas);
}

// ------------------------------------------------------------ las repetidas
//
// La misma noticia contada por tres medios con títulos distintos salía tres
// veces (27/09: "McCain advierte por estafas con falsas ofertas de empleo",
// "McCain advierte sobre una falsa convocatoria laboral" y "Advierten por una
// falsa búsqueda laboral de la empresa McCain"). Comparar títulos no alcanza, y
// la clave de tema de la ficha tampoco (la IA le pone otro nombre en cada
// pedido, y junta como un solo tema doce notas distintas del autódromo). Así
// que la IA mira juntas las notas del momento y agrupa sólo las que cuentan
// EXACTAMENTE el mismo hecho.

const INSTRUCCION_REPETIDAS = `Estas son las notas que un medio de Balcarce tiene para publicar ahora. ${MATERIAL_NO_ORDENES}
Agrupá SOLAMENTE las que cuentan exactamente el mismo hecho (la misma noticia contada por distintos medios o con otro título). Notas distintas sobre el mismo tema (dos prácticas del TC, la reapertura del autódromo y su estacionamiento) NO se agrupan.
Devolvé sólo los grupos de dos o más notas, con sus "id"; si no hay repetidas, una lista vacía.`;

export const ESQUEMA_REPETIDAS = {
  type: 'ARRAY',
  items: { type: 'OBJECT', properties: { ids: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['ids'] },
};

/**
 * Las notas que la IA mira juntas para ver si cuentan lo mismo: las que pueden
 * salir solas (verde) y también las que esperan a una persona (amarillo, salvo
 * las de afuera con pocos medios, que van en otro pedido). Antes sólo se miraban
 * las verdes: la nota de otro medio sobre el robo a Frutimar quedó esperando
 * aprobación al lado de la que ya estaba publicada, y aprobarla las duplicaba (4/10).
 * Las rojas nunca se juntan con nada.
 */
export function candidatasParaAgrupar(notas = []) {
  return notas.filter((n) => n.semaforo === 'verde'
    || (n.semaforo === 'amarillo' && !String(n.motivo ?? '').startsWith('de afuera y poco contada')));
}

/** Un pedido: los grupos de ids que cuentan el mismo hecho. Lanza si falla. */
export async function agruparRepetidas(notas, { clave, fetchFn = fetch } = {}) {
  const lista = notas.map((n) => ({
    id: n.id, titulo: n.titulo, bajada: String(n.resumenFuente ?? n.copete ?? '').slice(0, 200), medio: n.medio ?? n.medios?.[0] ?? '',
  }));
  const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${INSTRUCCION_REPETIDAS}

${JSON.stringify(lista, null, 1)}` }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: ESQUEMA_REPETIDAS, temperature: 0 },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e; }
  const j = await res.json();
  let grupos;
  try { grupos = JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''); } catch { throw new Error('la respuesta no es JSON'); }
  const validos = new Set(lista.map((n) => n.id));
  return (Array.isArray(grupos) ? grupos : [])
    .map((g) => [...new Set((g?.ids ?? []).filter((id) => validos.has(id)))])
    .filter((ids) => ids.length >= 2);
}

/**
 * Junta los grupos de una corrida con los de las anteriores: si antes se vio
 * que A y B cuentan lo mismo y ahora que B y C, A, B y C son una sola noticia.
 * La IA no siempre agrupa igual (27/09: de las tres de McCain juntó dos), así
 * que lo que ya vio no se pierde. Sólo quedan los ids que siguen existiendo.
 */
export function unirGrupos(anteriores = [], nuevos = [], idsVigentes = null) {
  const padre = new Map();
  const raiz = (x) => { while (padre.get(x) !== x) x = padre.get(x); return x; };
  for (const ids of [...anteriores, ...nuevos]) {
    const vivos = idsVigentes ? ids.filter((id) => idsVigentes.has(id)) : ids;
    for (const id of vivos) if (!padre.has(id)) padre.set(id, id);
    for (let i = 1; i < vivos.length; i += 1) padre.set(raiz(vivos[i]), raiz(vivos[0]));
  }
  const grupos = new Map();
  for (const id of padre.keys()) { const r = raiz(id); (grupos.get(r) ?? grupos.set(r, []).get(r)).push(id); }
  return [...grupos.values()].filter((g) => g.length >= 2).map((g) => g.sort());
}

/**
 * De cada grupo de repetidas queda una sola (27/09): primero la que ya está
 * publicada (`publicadas`, los ids de la portada anterior: si no, una nota
 * que la gente ya ve desaparece y queda otra que todavía no tiene cuerpo),
 * después la que puede salir sola (verde), después la que cuentan más medios
 * y por último la de más puntaje. Se le suman los medios de las otras (así
 * cuenta como contada por varios) y, desde el 15/10 (regla 174), también sus
 * FUENTES (`origenes`, con el resumen y el enlace de cada una, y `fuentesTexto`):
 * antes se sumaban sólo los nombres y la IA escribía con las fuentes de una sola
 * (en el 43 % de las notas vio menos fuentes que los medios que se mostraban; un
 * caso de 26 medios se escribió con 2). Devuelve { notas, repetidas } sin tocar
 * las originales.
 */
/** Las fuentes de una nota como las arma la ingesta (`origenes`); si es de antes y no las trae, la principal sola. */
function origenesDeLaNota(n) {
  if (n.origenes?.length) return n.origenes;
  return [{
    medio: n.medio ?? n.medios?.[0] ?? null,
    enlace: n.enlace ?? null,
    ...(n.enlaceFeed ? { enlaceFeed: n.enlaceFeed } : {}),
    fecha: n.cuando === 'sin fecha en la fuente' ? null : (n.fecha ?? null),
    oficial: !!n.oficial,
    resumen: n.resumenFuente ?? '',
  }];
}

/**
 * Las fuentes de la que queda más las de las repetidas, sin repetir un enlace (ni
 * un medio con el mismo resumen): primero las suyas, en su orden (la principal
 * sigue siendo la primera), después las de las otras. Si ninguna de las notas trae
 * fuentes ni resúmenes de otros medios (notas viejas), no agrega nada.
 */
function fuentesSumadas(queda, resto) {
  const todas = [queda, ...resto];
  if (!todas.some((n) => n.origenes?.length || n.fuentesTexto?.length)) return {};
  const vistos = new Set();
  const origenes = todas.flatMap(origenesDeLaNota).filter((o) => {
    const clave = o.enlaceFeed ?? o.enlace ?? `${o.medio ?? ''}|${o.resumen ?? ''}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
  const deLaQueQueda = String(queda.resumenFuente ?? '');
  const fuentesTexto = [...new Set([
    ...(queda.fuentesTexto ?? []),
    ...resto.flatMap((n) => [n.resumenFuente, ...(n.fuentesTexto ?? [])]),
  ].filter((t) => t && t !== deLaQueQueda))];
  return { origenes, fuentesTexto };
}

export function quitarRepetidas(notas, grupos = [], { publicadas = new Set() } = {}) {
  const porId = new Map(notas.map((n) => [n.id, n]));
  const fuera = new Map();
  const reemplazo = new Map();
  for (const ids of grupos) {
    const todas = ids.map((id) => porId.get(id)).filter(Boolean);
    const del = todas.filter((n) => n.semaforo !== 'rojo');
    // La misma noticia con una versión roja (o con "necesita ojo humano"): la que queda hereda el peor color (8/10/2026, C-12). Antes
    // se descartaba la roja y la verde salía sola con el mismo hecho.
    const hayRoja = todas.some((n) => n.semaforo === 'rojo');
    const sensible = todas.find((n) => n.semaforo === 'amarillo' && String(n.motivo ?? '').startsWith('necesita ojo humano'));
    if (del.length < 2 && !(del.length === 1 && (hayRoja || sensible))) continue;
    const orden = (n) => [publicadas.has(n.id) ? 1 : 0, n.semaforo === 'verde' ? 1 : 0, new Set(n.medios ?? []).size, n.relevancia ?? 0];
    del.sort((a, b) => {
      const [x, y] = [orden(a), orden(b)];
      for (let i = 0; i < x.length; i += 1) if (x[i] !== y[i]) return y[i] - x[i];
      return 0;
    });
    const [queda, ...resto] = del;
    const medios = [...new Set(del.flatMap((n) => n.medios ?? []))];
    const heredada = hayRoja ? { semaforo: 'rojo', motivo: 'la misma noticia, en otro medio, es un tema sensible' }
      : (sensible && queda.semaforo === 'verde' ? { semaforo: 'amarillo', motivo: `${sensible.motivo} (en otro medio que cuenta lo mismo)` } : {});
    reemplazo.set(queda.id, { ...queda, ...heredada, medios, ...fuentesSumadas(queda, resto) });
    for (const n of resto) fuera.set(n.id, { id: n.id, titulo: n.titulo, queda: queda.id });
  }
  return {
    notas: notas.filter((n) => !fuera.has(n.id)).map((n) => reemplazo.get(n.id) ?? n),
    repetidas: [...fuera.values()],
  };
}

/** El archivo de fichas como texto: una línea por ficha, para que el commit de
 *  cada corrida cambie sólo lo nuevo. */
export function comoFichasJson(archivo) {
  const lineas = Object.entries(archivo.fichas ?? {}).sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([id, f]) => `${JSON.stringify(id)}:${JSON.stringify(f)}`);
  const repetidas = archivo.repetidas ? `"repetidas":${JSON.stringify(archivo.repetidas)},\n` : '';
  return `{"dia":${JSON.stringify(archivo.dia ?? null)},"pedidosHoy":${archivo.pedidosHoy ?? 0},${repetidas}"fichas":{\n${lineas.join(',\n')}\n}}\n`;
}
