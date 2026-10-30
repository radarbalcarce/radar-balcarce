// Cómo habla el panel del celular con GitHub (29/09). Sin servidor propio: la
// llave (un token de GitHub que crea una persona y pega una sola vez en el
// celular) va directo a la API de GitHub, y nada más la ve.
//
// Sin nada del DOM: se prueba con Node (pruebas/celular-app.test.mjs).

export const REPO = 'radarbalcarce/radar-balcarce';
export const RAMA = 'main';
const API = 'https://api.github.com';

/** Las once de siempre (web/lib/datos.js; una prueba controla que coincidan con las del sitio, que con las tres de SECCIONES_SUMADAS son catorce). */
export const SECCIONES = ['Balcarce', 'Política', 'Policiales', 'Fútbol', 'Deportes', 'Automovilismo', 'Agro', 'Economía', 'Cultura y agenda', 'Tecnología', 'Argentina'];

/** Las que se suman a las once (reglas 187 y 211; las mismas de SECCIONES_SUMADAS en ingesta/secciones-nuevas.mjs, una prueba lo controla). */
export const SECCIONES_SUMADAS = ['Educación', 'Salud', 'Ciencia'];

/** La lista para elegir sección en el celular: las once y, después de Economía, Educación, Salud y Ciencia (el mismo orden que SECCIONES de
 *  web/lib/datos.js). Desde el 17/10 no depende de ningún interruptor; el argumento queda por quien todavía lo pasa. */
export function seccionesDelPanel() {
  return [...SECCIONES.slice(0, 8), ...SECCIONES_SUMADAS, ...SECCIONES.slice(8)];
}

/** Los archivos que escribe el celular (panel/celular-datos.mjs). */
export const ARCHIVOS = {
  decisiones: 'web/data/celular-decisiones.json',
  correcciones: 'web/data/correcciones.json',
  llaves: 'web/data/celular-llaves.json',
  pendientes: 'web/data/celular-pendientes.json',
  borradores: 'web/data/celular-borradores.json',
  estado: 'web/data/celular-estado.json',
  libro: 'web/data/redes.json',
  retiradas: 'web/data/retiradas.json',
  portada: 'web/data/portada.json',
  esperando: 'web/data/esperando-cuerpo.json',
  archivo: 'web/data/archivo.json',
  candidatas: 'web/data/efemerides-candidatas.json',
  feriados: 'web/data/feriados-piezas.json',
  elegidas: 'web/data/efemerides-elegidas.json',
  estadisticas: 'web/data/estadisticas.json',
  produccion: 'web/data/notas-por-dia.json',
  seleccion: 'web/data/estadistica-seleccion.json',
  auditoria: 'web/data/auditoria-ia.json',
  revisionArchivo: 'web/data/revision-archivo.json',
  banco: 'web/data/banco-fotos.json',
  piezas: 'web/data/efemerides-piezas.json',
  cambiosIA: 'web/data/correcciones-auditoria.json',
  pistas: 'web/data/pistas.json',
  notasDePistas: 'web/data/notas-de-pistas.json',
  notasDeRedaccion: 'web/data/notas-de-redaccion.json',
  fotosManuales: 'web/data/fotos-manuales.json',
  contactosPublicos: 'ingesta/contactos-agenda.json',
  contactosCelular: 'web/data/contactos-celular.json',
};

export class ErrorDeGitHub extends Error {
  constructor(estado, mensaje) {
    super(mensaje || `GitHub contestó ${estado}`);
    this.estado = estado;
  }
}

/** Texto (UTF-8) a base64, como lo pide la API de GitHub para escribir un archivo. */
export function aBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function deBase64(b64) {
  const s = atob(String(b64).replace(/\s+/g, ''));
  return new TextDecoder().decode(Uint8Array.from(s, (c) => c.charCodeAt(0)));
}

/**
 * Un archivo de notas escrito como los escribe el repositorio: una nota por
 * renglón (comoRetiradasJson, web/lib/archivo.js). Así el cambio de cada
 * decisión es un renglón en el historial, y no el archivo entero.
 */
export function comoRenglones(json, claves = Object.keys(json)) {
  const bloques = claves.map((k) => {
    const lineas = Object.entries(json[k] ?? {}).map(([id, n]) => `${JSON.stringify(id)}:${JSON.stringify(n)}`);
    return `${JSON.stringify(k)}:{${lineas.length ? `\n${lineas.join(',\n')}\n` : ''}}`;
  });
  return `{${bloques.join(',')}}\n`;
}

/** Cómo se escribe cada archivo que toca el celular. */
export function formatear(ruta, json) {
  if (ruta === ARCHIVOS.correcciones || ruta === ARCHIVOS.retiradas) return comoRenglones(json, ['notas']);
  if (ruta === ARCHIVOS.decisiones) return comoRenglones(json, ['notas', 'redes']);
  // Un día o un feriado por renglón: el historial dice qué se decidió cuándo.
  // Una nota de pista por renglón (3/10): el historial de git dice qué se publicó cuándo.
  if (ruta === ARCHIVOS.notasDePistas) return comoRenglones(json, ['notas']);
  // Una nota de la redacción por renglón (30/10): el historial de git dice qué se publicó o se editó cuándo.
  if (ruta === ARCHIVOS.notasDeRedaccion) return comoRenglones(json, ['notas']);
  // Una pista por renglón (2/10): el historial de git dice qué cambió cuándo.
  if (ruta === ARCHIVOS.pistas) return comoRenglones({ version: 1, ...json }, ['pistas']).replace('{"pistas"', '{"version":1,"pistas"');
  // Un contacto (o una anotación) por renglón, cada uno en su sobre cifrado (3/10).
  if (ruta === ARCHIVOS.contactosCelular) return comoRenglones(json, ['contactos']).replace('{"contactos"', '{"version":1,"contactos"');
  if (ruta === ARCHIVOS.elegidas) return comoRenglones(json, ['dias', 'feriados', 'piezas']);
  return `${JSON.stringify(json, null, 1)}\n`;
}

export function crearCliente({ token, fetchFn = (...a) => fetch(...a) }) {
  async function pedir(ruta, { metodo = 'GET', cuerpo, aceptar = 'application/vnd.github+json' } = {}) {
    const res = await fetchFn(`${API}${ruta}`, {
      method: metodo,
      headers: {
        authorization: `Bearer ${token}`,
        accept: aceptar,
        'x-github-api-version': '2022-11-28',
        ...(cuerpo ? { 'content-type': 'application/json' } : {}),
      },
      ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
      cache: 'no-store',
    });
    if (!res.ok) {
      let mensaje = '';
      try { mensaje = (await res.json())?.message ?? ''; } catch { /* sin cuerpo */ }
      throw new ErrorDeGitHub(res.status, mensaje);
    }
    return res;
  }

  /** Lee un archivo del repositorio (siempre la versión de ahora, sin caché): { json, sha }. */
  async function leer(ruta) {
    const res = await pedir(`/repos/${REPO}/contents/${ruta}?ref=${RAMA}`);
    const j = await res.json();
    let texto;
    if (j.encoding === 'base64' && j.content) texto = deBase64(j.content);
    else {
      // Más de 1 MB (archivo.json): la API lo da sólo "crudo".
      texto = await (await pedir(`/repos/${REPO}/contents/${ruta}?ref=${RAMA}`, { aceptar: 'application/vnd.github.raw+json' })).text();
    }
    return { json: JSON.parse(texto), sha: j.sha };
  }

  /**
   * Cambia un archivo: lo lee, le aplica `cambiar` y lo sube como un commit.
   * Si justo lo cambió otra corrida (GitHub contesta 409), lo vuelve a leer y
   * reintenta: nunca pisa lo que subió otro.
   */
  async function guardar(ruta, cambiar, mensaje) {
    for (let intento = 1; ; intento += 1) {
      // Si el archivo todavía no existe (por ejemplo, el primer día que se aprueba una efeméride), se crea: antes daba "GitHub no encontró el archivo" (4/10).
      let leido;
      try { leido = await leer(ruta); } catch (e) {
        if (!(e instanceof ErrorDeGitHub && e.estado === 404)) throw e;
        leido = { json: {}, sha: undefined };
      }
      const { json, sha } = leido;
      const nuevo = cambiar(json) ?? json;
      try {
        await pedir(`/repos/${REPO}/contents/${ruta}`, {
          metodo: 'PUT',
          cuerpo: { message: mensaje, content: aBase64(formatear(ruta, nuevo)), sha, branch: RAMA },
        });
        return nuevo;
      } catch (e) {
        if (!(e instanceof ErrorDeGitHub) || ![409, 422].includes(e.estado) || intento >= 3) throw e;
      }
    }
  }

  /**
   * Sube un archivo binario (una foto, ya en base64) como un commit. Si ya existía, lo reemplaza. Lo usa la pestaña Fotos para subir una foto
   * desde el celular: queda en web/public/fotos-notas/ y sale en la próxima actualización de la web.
   */
  /** Los pasos de una corrida (para decir en cuál va): [{ name, status, conclusion }] del primer trabajo. */
  async function pasos(idDeCorrida) {
    const j = await (await pedir(`/repos/${REPO}/actions/runs/${idDeCorrida}/jobs`)).json();
    return j.jobs?.[0]?.steps ?? [];
  }

  async function subirArchivo(ruta, base64, mensaje) {
    for (let intento = 1; ; intento += 1) {
      let sha;
      try { sha = (await (await pedir(`/repos/${REPO}/contents/${ruta}?ref=${RAMA}`)).json()).sha; } catch (e) { if (!(e instanceof ErrorDeGitHub && e.estado === 404)) throw e; }
      try {
        await pedir(`/repos/${REPO}/contents/${ruta}`, { metodo: 'PUT', cuerpo: { message: mensaje, content: base64, ...(sha ? { sha } : {}), branch: RAMA } });
        return;
      } catch (e) {
        if (!(e instanceof ErrorDeGitHub) || ![409, 422].includes(e.estado) || intento >= 3) throw e;
      }
    }
  }

  // Lo que se pidió a cada workflow (por su marca), para poder repetirlo si GitHub lo cancela porque llegó otro pedido (A-3, 8/10/2026).
  const pedidos = new Map();

  return {
    leer,
    guardar,
    subirArchivo,
    pasos,
    /** ¿Esta llave puede escribir en el repositorio? */
    async puedeEscribir() {
      const j = await (await pedir(`/repos/${REPO}`)).json();
      return !!j?.permissions?.push;
    },
    /** Dispara un workflow (actualizar.yml, panel.yml). */
    async disparar(workflow, inputs = {}) {
      await pedir(`/repos/${REPO}/actions/workflows/${workflow}/dispatches`, { metodo: 'POST', cuerpo: { ref: RAMA, inputs } });
      if (inputs.marca) pedidos.set(inputs.marca, { workflow, inputs });
    },
    /**
     * Repite un pedido que GitHub canceló (con un candado puesto sólo espera uno: el que llega después cancela al que esperaba). Lo vuelve a
     * disparar con una marca nueva y la devuelve; null si no se conoce ese pedido.
     */
    async repetir(marcaVieja) {
      const antes = pedidos.get(marcaVieja);
      if (!antes) return null;
      const marca = marcaNueva();
      await this.disparar(antes.workflow, { ...antes.inputs, marca });
      return marca;
    },
    /** Las últimas corridas de un workflow. */
    async corridas(workflow) {
      const j = await (await pedir(`/repos/${REPO}/actions/workflows/${workflow}/runs?per_page=15`)).json();
      return j.workflow_runs ?? [];
    },
  };
}

/** Una marca al azar para encontrar la corrida que se acaba de disparar (va en su nombre). */
export const marcaNueva = () => Math.random().toString(36).slice(2, 10);

/** La corrida de "Panel del celular" que lleva esta marca, si ya apareció. */
export const corridaConMarca = (corridas, marca) => corridas.find((c) => String(c.display_title ?? c.name ?? '').includes(marca)) ?? null;

// ----------------------------------------------------- lo que se escribe

const hoyISO = () => new Date().toISOString();

/** Una decisión del celular (panel/celular-datos.mjs dice qué pide cada una). */
export function conDecision(json, id, decision) {
  const j = { notas: {}, redes: {}, ...json };
  j.notas = { ...j.notas, [id]: { ...decision, cuando: decision.cuando ?? hoyISO() } };
  return j;
}

/** Saca la decisión del celular sobre una nota (deshacer). */
export function sinDecision(json, id) {
  const j = { notas: {}, redes: {}, ...json };
  const { [id]: _, ...resto } = j.notas;
  j.notas = resto;
  return j;
}

/** Saca una nota de web/data/retiradas.json (deshacer un retiro hecho a mano). */
export function sinRetirada(json, id) {
  const j = { notas: {}, ...json };
  const { [id]: _, ...resto } = j.notas;
  j.notas = resto;
  return j;
}

/** Marca (o desmarca) una nota para que también vaya a Facebook e Instagram. */
export function conRedes(json, id, por, si = true) {
  const j = { notas: {}, redes: {}, ...json };
  const { [id]: _, ...resto } = j.redes;
  j.redes = si ? { ...resto, [id]: { por, cuando: hoyISO() } } : resto;
  return j;
}

/**
 * Una corrección (web/data/correcciones.json): los campos que cambió la
 * persona, encima de los que ya tenía esa nota, con motivo, cuándo y quién (sin
 * eso la corrida de la web no la acepta).
 */
export function conCorreccion(json, id, campos, { motivo, por, deIA = false }) {
  const j = { notas: {}, ...json };
  const antes = j.notas[id] ?? {};
  const limpios = Object.fromEntries(Object.entries(campos).filter(([, v]) => typeof v === 'string' && v.trim()).map(([k, v]) => [k, v.trim()]));
  const nueva = { ...antes, ...limpios, motivo, cuando: hoyISO().slice(0, 10), por };
  if (deIA) nueva.deIA = true; else delete nueva.deIA;
  j.notas = { ...j.notas, [id]: nueva };
  return j;
}

/** Lo que se eligió para un día de "Un día como hoy" (panel/fechas.js arma `eleccion`). */
export function conEleccionDeDia(json, dia, eleccion) {
  const j = { dias: {}, feriados: {}, piezas: {}, ...json };
  j.dias = { ...j.dias, [dia]: eleccion };
  return j;
}

/** En qué puede quedar una pista (igual que RESULTADOS de panel/pistas-libro.mjs). */
export const RESULTADOS_DE_PISTA = {
  confirmada: 'Se confirmó: la cubrieron medios',
  desmentida: 'Se desmintió o era falsa',
  'sin-novedad': 'Sin novedades: no pasó nada',
  publicada: 'Salió como nota nuestra',
  descartada: 'La descartamos',
};

/** Una nota nacida de una pista, ya revisada por una persona (web/lib/notas-de-pistas.js la lee). Lleva motivo, cuándo y quién. */
export function conNotaDePista(json, id, { titulo, copete, cuerpo, seccion, fuentes, por, motivo }) {
  const j = { notas: {}, ...json };
  // Lo que una persona publica de su mano sale en los repasos de las redes sin que lo pida aparte (16/10/2026, Hernán: "si yo pongo una nota, obviamente esa nota sale"):
  // `aprobadaParaRedes` (la decisión ya es de ella) y `paraElRepaso` (entra al próximo repaso; vale 12 horas: web/lib/notas-de-pistas.js).
  j.notas = { ...j.notas, [id]: { titulo, copete, cuerpo, seccion, fuentes, pista: id, motivo, cuando: hoyISO(), por, aprobadaParaRedes: true, paraElRepaso: true } };
  return j;
}

/**
 * Una nota que escribió una persona de la redacción desde la pestaña Escribir (web/lib/notas-de-redaccion.js la lee). `entrada` ya trae motivo, cuándo y quién
 * (panel/escribir.js, armarEntrada). Si la nota ya existía es una EDICIÓN: se queda con su dirección (`slug`), su fecha (`cuando`), quien la publicó (`por`) y,
 * si estaba retirada, sigue retirada; lo que cambia queda en `editada` y `editadaPor`. La clave no cambia nunca.
 */
export function conNotaDeRedaccion(json, clave, entrada, { ahora = new Date() } = {}) {
  const j = { notas: {}, ...json };
  const antes = j.notas[clave];
  const nueva = antes
    ? {
      ...entrada,
      slug: antes.slug || entrada.slug,
      cuando: antes.cuando,
      por: antes.por,
      motivo: antes.motivo || entrada.motivo,
      editada: ahora.toISOString(),
      editadaPor: entrada.por,
      ...(antes.retirada ? { retirada: antes.retirada } : {}),
    }
    : entrada;
  j.notas = { ...j.notas, [clave]: nueva };
  return j;
}

/** Retirar una nota de la redacción: queda anotada con quién y por qué, y deja de armarse (no se borra nada: las fotos y el texto quedan). */
export function conNotaDeRedaccionRetirada(json, clave, { por, motivo, ahora = new Date() }) {
  const e = json?.notas?.[clave];
  return e ? { ...json, notas: { ...json.notas, [clave]: { ...e, retirada: { cuando: ahora.toISOString(), por, motivo } } } } : json;
}

/** Volver a publicar una nota de la redacción retirada: le saca la marca `retirada` (con la misma dirección y la misma fecha). */
export function conNotaDeRedaccionRepuesta(json, clave, { por, ahora = new Date() }) {
  const e = json?.notas?.[clave];
  if (!e) return json;
  const { retirada, ...resto } = e;
  return { ...json, notas: { ...json.notas, [clave]: { ...resto, editada: ahora.toISOString(), editadaPor: por } } };
}

/** Sacar de la web una nota de una pista: queda anotada con quién y por qué, y deja de armarse. */
export function conNotaDePistaRetirada(json, id, { por, motivo }) {
  const e = json?.notas?.[id];
  return e ? { ...json, notas: { ...json.notas, [id]: { ...e, retirada: { cuando: hoyISO(), por, motivo } } } } : json;
}

/** Cerrar una pista diciendo en qué quedó (y, si salió como nota nuestra, el enlace). Queda archivada, con su renglón en el seguimiento. */
export function conPistaResultado(json, id, { tipo, comentario = '', ruta = null }) {
  const p = json?.pistas?.[id];
  if (!p || !(tipo in RESULTADOS_DE_PISTA)) return json;
  const ahora = hoyISO();
  const resultado = { tipo, cuando: ahora, ...(comentario ? { comentario: String(comentario).slice(0, 200) } : {}), ...(ruta ? { ruta } : {}) };
  const renglon = { cuando: ahora, texto: `Cerrada: ${RESULTADOS_DE_PISTA[tipo]}${comentario ? ` (${String(comentario).slice(0, 80)})` : ''}` };
  return { ...json, pistas: { ...json.pistas, [id]: { ...p, estado: 'archivada', archivada: ahora, resultado, novedad: false, seguimiento: [...(p.seguimiento ?? []), renglon].slice(-40) } } };
}

/** Una pista ya mirada deja de ser una novedad (la apaga el celular al abrirla). */
export function conPistaSinNovedad(json, id) {
  const p = json?.pistas?.[id];
  return p ? { ...json, pistas: { ...json.pistas, [id]: { ...p, novedad: false } } } : json;
}

/** Archivar o reabrir una pista a mano ('abierta' la vuelve a seguir 14 días desde hoy). */
export function conPistaEstado(json, id, estado) {
  const p = json?.pistas?.[id];
  if (!p || !['abierta', 'archivada'].includes(estado)) return json;
  const ahora = hoyISO();
  return { ...json, pistas: { ...json.pistas, [id]: { ...p, estado, ...(estado === 'abierta' ? { creada: ahora } : { archivada: ahora }) } } };
}

/** La decisión sobre un día ya armado de "Un día como hoy" (2/10): aprobada, sacada, o con cambios pedidos. `huella` dice sobre qué armado vale. */
export function conDecisionDePieza(json, dia, { estado, comentario = '', huella, por }) {
  const j = { dias: {}, feriados: {}, piezas: {}, ...json };
  j.piezas = { ...j.piezas, [dia]: { estado, ...(comentario ? { comentario } : {}), huella, por, cuando: hoyISO() } };
  return j;
}

/** La decisión sobre el enfoque de un feriado: aprobado, o con cambios pedidos. */
export function conDecisionDeFeriado(json, fecha, { estado, comentario = '', por }) {
  const j = { dias: {}, feriados: {}, piezas: {}, ...json };
  j.feriados = { ...j.feriados, [fecha]: { estado, ...(comentario ? { comentario } : {}), por, cuando: hoyISO() } };
  return j;
}

/** Suma la llave pública de este celular (una por celular; la más nueva primero si hay de más). */
export function conLlave(json, { nombre, publica, huella }) {
  const lista = (json?.llaves ?? []).filter((l) => l.publica !== publica);
  return { llaves: [...lista, { nombre, publica, huella, alta: hoyISO() }].slice(-6) };
}

/** "hace 5 min", "hace 3 h", "ayer": para las listas. */
export function haceCuanto(iso, ahora = Date.now()) {
  const t = Date.parse(iso ?? '');
  if (!Number.isFinite(t)) return '';
  const min = Math.max(0, Math.floor((ahora - t) / 60000));
  if (min < 2) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

/** Cuántas palabras tiene un texto (el cuerpo pide 70 para salir solo). */
export const palabras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean).length;

/** El id de la nota que sale de una pista (igual que idDeNotaDePista de web/lib/notas-de-pistas.js: una prueba controla que digan lo mismo). */
export const idDeNotaDePista = (idPista) => `np${String(idPista ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase().replace(/^pista/, '').slice(0, 16)}`;

/** La foto de una nota, subida desde el celular o armada en la nube (web/data/fotos-manuales.json; generar-datos la suma al banco). Sin crédito si no se escribió. */
export function conFotoManual(json, id, entrada) {
  return { ...(json ?? {}), [id]: entrada };
}
