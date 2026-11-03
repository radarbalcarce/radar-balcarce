// La nota propia por Telegram (Radar 3.0, etapa E). Hernán manda texto, audios, fotos y/o un enlace; el bot lo junta, arma la nota con el perfil
// y la redacción, muestra la vista previa, la corrige las veces que haga falta, la guarda en D1 con su «ok» y pregunta qué hacer en redes.
//
// Todo lo que toca el mundo (Telegram, Gemini, D1, R2, el KV, el reloj) entra por `dep`, así las pruebas corren sin red:
//   dep = { chat, kv, db, fotos?, gemini, fetch, ahora(), enviar(texto, {botones?}), descargar(file_id) → {bytes, mime},
//           responderBoton(id, texto?), quitarBotones(message_id), iaHoy() → n, perfil, redaccion, sitio? }
//
// Estado (KV `ESTADO`):
//   mat:<ISO>:<message_id>   cada cosa que mandó (una clave por mensaje, para que dos mensajes que llegan a la vez no se pisen). 3 horas.
//   pedido                   {fase: 'vista'|'redes', …}: la nota esperando su «ok» (24 h) o la pregunta de las redes (1 hora, después «Sólo la web»).
// Las reglas, en palabras de persona, están en REGLAS.md.

import { validar, SECCIONES } from '../../nucleo/redactar/redactar.mjs';
import { textoDePagina } from '../../nucleo/leer/pagina.mjs';

export const VENTANA_MS = 10 * 60 * 1000; // lo que llega con menos de 10 minutos entre un mensaje y el siguiente es el mismo pedido
export const ULTIMO_MATERIAL_MS = 60 * 60 * 1000; // «armala» sobre algo de hace más de una hora no se arma solo
export const ESPERA_REDES_MS = 60 * 60 * 1000;
export const TOPE_PEDIDOS_IA = 20;
export const FIRMA = 'Hernán Accomo';
export const SITIO = 'https://radarbalcarce.com';
const TTL_MATERIAL = 3 * 3600;
const TTL_PEDIDO = 24 * 3600;
const MAX_AUDIOS = 8;
const MAX_ENLACES = 2;
const MAX_TEXTO_ENLACE = 6000;

export const REDES = {
  todo: { etiqueta: 'Todo', detalle: 'posteo con foto en todas las redes, historia con la tarjeta y reel con voz' },
  'posteo-historia': { etiqueta: 'Posteo e historia', detalle: 'posteo con foto e historia con la tarjeta, sin reel' },
  'solo-web': { etiqueta: 'Sólo la web', detalle: 'nada en las redes' },
};
export const REDES_POR_DEFECTO = 'solo-web';

// ------------------------------------------------------------------------------------------------------------ cosas chicas

/** Para comparar lo que escribió: sin tildes, sin signos, en minúscula. Conserva la barra de los comandos. */
export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .replace(/@\w+$/, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9/\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ES_ARMAR = /^(\/nota|arma(la|lo|r)?|arma la|arma la nota|armame la nota|armala ya|ya esta armala|listo armala|armala por favor)$/;
const ES_OK = /^(?:(?:ok|okey|oka|dale|si|sii|publica|publicala|publicalo|publicar|perfecto|joya|listo|de una|mandala|mandale|va)(?: |$))+$/;
const ES_NO = /^(\/cancelar|no|nop|cancelar|cancela|cancelala|descarta|descartala|descartar|olvidalo|borrala)$/;

export const esArmar = (t) => ES_ARMAR.test(normalizar(t));
export const esOk = (t) => ES_OK.test(normalizar(t));
export const esNo = (t) => ES_NO.test(normalizar(t));

/** «todo», «posteo e historia», «sólo la web»… escritos a mano en vez de apretar el botón. */
export function redesDeTexto(t) {
  const n = normalizar(t);
  if (/^(todo|todas|todo todo)$/.test(n)) return 'todo';
  if (/^(posteo e historia|posteo y historia|posteo|historia)$/.test(n)) return 'posteo-historia';
  if (/^(solo la web|solo web|web|solo en la web|nada)$/.test(n)) return 'solo-web';
  return null;
}

export function slugDe(titulo) {
  const base = String(titulo ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (base.length <= 70) return base || 'nota';
  const corte = base.slice(0, 70);
  const guion = corte.lastIndexOf('-');
  return (guion > 30 ? corte.slice(0, guion) : corte).replace(/-+$/, '');
}

export function idNuevo() {
  const bytes = new Uint8Array(7);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((b) => (b % 36).toString(36)).join('');
}

export function aBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const ocultar = (e) => String(e?.message ?? e).replace(/\b\d{6,}:[\w-]{20,}\b/g, '***').replace(/AIza[\w-]{20,}/g, '***').slice(0, 200);

/** Un mensaje de Telegram como pieza de material. Función pura. */
export function itemDe(m, ahora = new Date()) {
  const audio = m.voice ?? m.audio;
  const foto = Array.isArray(m.photo) && m.photo.length ? [...m.photo].sort((a, b) => (a.file_size ?? 0) - (b.file_size ?? 0)).at(-1) : null;
  const docFoto = m.document && /^image\//.test(m.document.mime_type ?? '') ? m.document : null;
  const cuando = Number.isFinite(m.date) ? new Date(m.date * 1000).toISOString() : ahora.toISOString();
  const texto = (m.text ?? m.caption ?? '').trim();
  const item = { cuando, id: m.message_id ?? 0, tipo: 'otro' };
  if (audio) Object.assign(item, { tipo: 'audio', file_id: audio.file_id, mime: m.voice ? 'audio/ogg' : (audio.mime_type || 'audio/mpeg'), duracion: audio.duration ?? 0 });
  else if (foto || docFoto) Object.assign(item, { tipo: 'foto', file_id: (foto ?? docFoto).file_id, mime: docFoto?.mime_type || 'image/jpeg' });
  else if (m.text) item.tipo = 'texto';
  else if (m.video || m.video_note || m.animation) item.tipo = 'video';
  if (texto) item.texto = texto;
  if (m.media_group_id) item.grupo = String(m.media_group_id);
  return item;
}

const claveDeMaterial = (i) => `mat:${i.cuando}:${String(i.id).padStart(10, '0')}`;

async function listarClaves(kv, prefijo) {
  const claves = [];
  let cursor;
  do {
    const l = await kv.list({ prefix: prefijo, cursor });
    for (const k of l.keys) claves.push(k.name);
    cursor = l.list_complete ? undefined : l.cursor;
  } while (cursor);
  return claves.sort();
}

/** Lo que juntó Hernán para el pedido en curso: desde lo último, hacia atrás, mientras no haya más de 10 minutos entre un mensaje y el anterior. */
export async function materialDelPedido(dep) {
  const claves = await listarClaves(dep.kv, 'mat:');
  const todos = [];
  for (const c of claves) {
    const v = await dep.kv.get(c, 'json');
    if (v) todos.push({ clave: c, ...v });
  }
  todos.sort((a, b) => (a.cuando < b.cuando ? -1 : a.cuando > b.cuando ? 1 : a.id - b.id));
  const lote = [];
  for (let i = todos.length - 1; i >= 0; i--) {
    if (lote.length && new Date(lote[0].cuando) - new Date(todos[i].cuando) > VENTANA_MS) break;
    lote.unshift(todos[i]);
  }
  return lote;
}

async function borrarMaterial(dep, lote) {
  for (const i of lote) await dep.kv.delete(i.clave);
}

// ------------------------------------------------------------------------------------------------------------ la entrada

/** Un mensaje del dueño (el Worker ya comprobó que es él). */
export async function procesar(dep, actualizacion) {
  try {
    if (actualizacion?.callback_query) return await alApretarBoton(dep, actualizacion.callback_query);
    const m = actualizacion?.message;
    if (m) return await alLlegarUnMensaje(dep, m);
  } catch (e) {
    console.error(`nota propia: ${ocultar(e)}`);
    await dep.enviar(`Tuve un problema con ese mensaje (${ocultar(e)}). Probá de nuevo; lo que mandaste sigue guardado.`);
  }
}

async function alLlegarUnMensaje(dep, m) {
  const item = itemDe(m, dep.ahora());
  const texto = item.texto ?? '';
  const pedido = await dep.kv.get('pedido', 'json');

  if (pedido?.fase === 'vista') {
    if (item.tipo === 'texto' && esOk(texto)) return publicar(dep, pedido);
    if (item.tipo === 'texto' && esNo(texto)) return descartar(dep);
    return corregir(dep, pedido, item);
  }

  if (pedido?.fase === 'redes') {
    const r = item.tipo === 'texto' ? redesDeTexto(texto) : null;
    if (r) return elegirRedes(dep, pedido, r);
    if (item.tipo === 'texto' && esNo(texto)) return elegirRedes(dep, pedido, 'solo-web');
    if (item.tipo === 'texto' && esOk(texto)) return dep.enviar('Elegí qué hacer en redes con los botones (o escribí «todo», «posteo e historia» o «sólo la web»).');
    await dep.kv.delete('pedido'); // empezó otro pedido: la pregunta de redes queda como estaba («Sólo la web»)
  }

  if (item.tipo === 'texto' && esArmar(texto)) return armar(dep);
  if (item.tipo === 'texto' && esNo(texto)) {
    const lote = await materialDelPedido(dep);
    await borrarMaterial(dep, lote);
    return dep.enviar(lote.length ? 'Listo, descarté lo que me habías mandado.' : 'No tenía nada guardado para descartar.');
  }
  if (item.tipo === 'video') return dep.enviar('Los videos todavía no los sé leer. Mandame texto, audio, fotos o un enlace.');
  if (item.tipo === 'otro') return dep.enviar('Eso no lo sé leer. Mandame texto, audio, fotos o un enlace.');

  await dep.kv.put(claveDeMaterial(item), JSON.stringify(item), { expirationTtl: TTL_MATERIAL });
  // Un álbum de fotos llega como varios mensajes: se contesta una sola vez.
  if (item.grupo) {
    if (await dep.kv.get(`grupo:${item.grupo}`)) return;
    await dep.kv.put(`grupo:${item.grupo}`, '1', { expirationTtl: 120 });
  }
  return dep.enviar('Recibido, mandá más o decí «armala».');
}

// ------------------------------------------------------------------------------------------------------------ armar

async function transcribir(dep, audios) {
  if (!audios.length) return [];
  const imagenes = [];
  for (const a of audios) {
    const { bytes } = await dep.descargar(a.file_id);
    imagenes.push({ mime: a.mime || 'audio/ogg', base64: aBase64(bytes) });
  }
  const prompt = [
    `Te paso ${audios.length} audio${audios.length > 1 ? 's' : ''} en castellano rioplatense, en orden.`,
    'Transcribí cada uno textualmente, sin resumir, sin corregir lo que dice y sin agregar nada. Si una parte no se entiende, escribí [inaudible].',
    'Devolvé SOLO un JSON: {"transcripciones": ["texto del audio 1", "texto del audio 2", …]} con una cadena por audio, en el mismo orden.',
  ].join('\n');
  const r = await dep.gemini.texto(prompt, { json: true, imagenes });
  let lista = Array.isArray(r?.transcripciones) ? r.transcripciones.map((t) => String(t ?? '').trim()) : null;
  if (!lista) throw new Error('la transcripción no vino en la forma esperada');
  if (lista.length !== audios.length) lista = [lista.join('\n')];
  return lista;
}

const esHostInterno = (h) => /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/i.test(h);

export function enlacesDe(textos) {
  const vistos = new Set();
  for (const t of textos) {
    for (const m of String(t).matchAll(/https?:\/\/[^\s<>"')\]]+/gi)) {
      const url = m[0].replace(/[.,;:!?]+$/, '');
      try { if (!esHostInterno(new URL(url).hostname)) vistos.add(url); } catch { /* enlace roto */ }
    }
  }
  return [...vistos].slice(0, MAX_ENLACES);
}

async function leerEnlaces(dep, urls) {
  const salida = [];
  for (const url of urls) {
    try {
      const r = await dep.fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; RadarBalcarce/3.0)', accept: 'text/html' }, signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error(`respondió ${r.status}`);
      const texto = textoDePagina(await r.text()).slice(0, MAX_TEXTO_ENLACE);
      salida.push(texto.length >= 100 ? { url, texto } : { url, texto: '', error: 'no pude sacar el texto de esa página' });
    } catch (e) {
      salida.push({ url, texto: '', error: ocultar(e) });
    }
  }
  return salida;
}

async function armar(dep) {
  const lote = await materialDelPedido(dep);
  if (!lote.length) return dep.enviar('No tengo nada para armar. Mandame primero el texto, los audios, las fotos o el enlace, y después decí «armala».');
  if (dep.ahora() - new Date(lote.at(-1).cuando) > ULTIMO_MATERIAL_MS) {
    return dep.enviar('Lo último que me mandaste es de hace más de una hora. Mandalo de nuevo (o completalo) y decí «armala».');
  }
  if ((await dep.iaHoy()) >= TOPE_PEDIDOS_IA) return dep.enviar(`Hoy ya usé los ${TOPE_PEDIDOS_IA} pedidos de IA que tengo para las notas propias. Lo que mandaste queda guardado: decí «armala» mañana.`);

  const audios = lote.filter((i) => i.tipo === 'audio');
  const textos = lote.filter((i) => i.tipo === 'texto').map((i) => i.texto);
  const fotos = lote.filter((i) => i.tipo === 'foto');
  if (audios.length > MAX_AUDIOS) return dep.enviar(`Me mandaste ${audios.length} audios y puedo con ${MAX_AUDIOS} por nota. Descartá con «no» y juntalos en menos.`);
  // El texto que acompaña a una foto también cuenta.
  for (const f of fotos) if (f.texto) textos.push(f.texto);

  await dep.enviar('Armando la nota… tarda un minuto.');
  const transcripciones = await transcribir(dep, audios);
  const enlaces = await leerEnlaces(dep, enlacesDe([...textos, ...transcripciones]));
  const material = { textos, transcripciones, enlaces, fotos: fotos.map((f) => ({ file_id: f.file_id, mime: f.mime })), audios: audios.length };
  if (!textos.length && !transcripciones.length && !enlaces.some((e) => e.texto)) {
    return dep.enviar('Con las fotos solas no alcanzo a armar una nota: contame qué pasó (texto o audio) o pasame un enlace.');
  }

  const r = await redactarPropia(dep, { material });
  if (r.noPublicar) return dep.enviar(`No armé la nota: ${r.noPublicar.motivo}. Mandame más material y decí «armala» de nuevo (lo anterior sigue guardado).`);
  const pedido = { fase: 'vista', id: idNuevo(), nota: r.nota, material, correcciones: [], pedidos: r.pedidos, creado: dep.ahora().toISOString() };
  await dep.kv.put('pedido', JSON.stringify(pedido), { expirationTtl: TTL_PEDIDO });
  await borrarMaterial(dep, lote);
  return mostrarVistaPrevia(dep, pedido);
}

// ------------------------------------------------------------------------------------------------------------ la redacción

const REGLAS_DE_LA_NOTA_PROPIA = `# Esta es una NOTA PROPIA (manda sobre lo anterior si se contradicen)

- Va firmada «${FIRMA}», dueño y director de Radar. Escribís en su nombre, de vos, con su impronta y su postura (la del PERFIL: ameno, cercano, correcto; críticos de la gestión, positivos, pro diversidad). Acá SÍ se opina, y el cierre es una idea fuerte, no un resumen.
- La postura se apoya SOLO en lo que él contó o en el enlace. No inventes datos, nombres, cifras, fechas, cargos, citas ni lugares que no estén en el material, y no completes de memoria: si algo no está, no lo digas. Si dijo una opinión, es suya; si el material no tiene postura, informá con tono propio sin inventarle una.
- Un «según la denuncia» o «dicen» no se convierte en hecho. Nada con malicia contra un tercero. Nunca identificar a un menor ni a una víctima que no sea pública.
- Si el material cita a otro medio o al enlace, atribuilo. No copies frases del enlace: contalas con tus palabras.
- Si lo que mandó no alcanza para una nota que se sostenga, devolvé noPublicar con motivo "sin-material".`;

const ESQUEMA = `{
  "titulo": "string, propio, informa qué pasó",
  "bajada": "string, una sola oración",
  "cuerpo": ["párrafo corto", "párrafo corto"],
  "seccion": "una de: ${SECCIONES.join(', ')}",
  "enDosLineas": "string: qué pasó y qué sigue, en dos líneas",
  "ficha": { "que": "string", "quien": "string", "donde": "string", "cuando": "string", "numeros": [], "cronologia": [], "faltaSaber": [] },
  "noPublicar": null
}`;

function bloqueDeMaterial(material) {
  const partes = [];
  if (material.textos?.length) partes.push(`## Lo que escribió\n${material.textos.join('\n\n')}`);
  if (material.transcripciones?.length) partes.push(`## Lo que dijo en los audios (transcripción)\n${material.transcripciones.join('\n\n')}`);
  for (const e of material.enlaces ?? []) {
    partes.push(`## Enlace que pasó: ${e.url}\n${e.texto || `(no se pudo leer: ${e.error || 'sin texto'})`}`);
  }
  partes.push(material.fotos?.length ? `## Fotos\nMandó ${material.fotos.length}. No las ves; la primera es la de portada.` : '## Fotos\nNo mandó ninguna.');
  return partes.join('\n\n');
}

export function armarPedidoPropio(dep, { material, previo = null, correccion = '' }) {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(dep.ahora());
  const prompt = [
    `Hoy es ${hoy}. Nota propia de ${FIRMA}.`,
    'Todo lo que podés afirmar está en este material y nada más:',
    bloqueDeMaterial(material),
    previo ? `## La nota que armaste antes (la vio y quiere cambios)\n${JSON.stringify({ titulo: previo.titulo, bajada: previo.bajada, cuerpo: previo.cuerpo, seccion: previo.seccion })}` : '',
    correccion ? `## Lo que pidió cambiar (hacelo, y mantené el resto salvo que lo contradiga)\n${correccion}` : '',
    'Escribí la nota. Devolvé SOLO un JSON con exactamente esta forma:',
    ESQUEMA,
  ].filter(Boolean).join('\n\n');
  return { sistema: `${dep.perfil ?? ''}\n\n${dep.redaccion ?? ''}\n\n${REGLAS_DE_LA_NOTA_PROPIA}`.trim(), prompt };
}

/** Pide la nota a Gemini; si no valida, un reintento con el error. Devuelve {nota, pedidos} o {noPublicar}. */
export async function redactarPropia(dep, { material, previo = null, correccion = '' }) {
  let aviso = '';
  let ultimoError = '';
  for (let pedidos = 1; pedidos <= 2; pedidos++) {
    const p = armarPedidoPropio(dep, { material, previo, correccion });
    const prompt = aviso ? `${p.prompt}\n\nAVISO: ${aviso}` : p.prompt;
    let respuesta;
    try {
      respuesta = await dep.gemini.texto(prompt, { json: true, sistema: p.sistema });
    } catch (e) {
      if (e.message !== 'json-invalido') throw e;
      ultimoError = 'la respuesta no era JSON válido';
      aviso = `Tu respuesta anterior fue rechazada: ${ultimoError}. Devolvé sólo el JSON.`;
      continue;
    }
    const v = validar(respuesta);
    if (v.nota?.noPublicar) return { noPublicar: v.nota.noPublicar, pedidos };
    if (v.nota) return { nota: v.nota, pedidos };
    ultimoError = v.error;
    aviso = `Tu respuesta anterior fue rechazada: ${v.error}. Corregilo y devolvé sólo el JSON.`;
  }
  return { noPublicar: { motivo: `no me alcanzó el material para una nota que se sostenga (${ultimoError})` }, pedidos: 2 };
}

// ------------------------------------------------------------------------------------------------------------ vista previa y correcciones

export function textoDeVistaPrevia(pedido) {
  const n = pedido.nota;
  const f = pedido.material.fotos?.length;
  return [
    'VISTA PREVIA',
    `Sección: ${n.seccion} · Firma: ${FIRMA}`,
    f ? `Foto: la primera que mandaste (${f} en total)` : 'Foto: ninguna (saldría la placa)',
    '',
    n.titulo,
    n.bajada,
    '',
    n.cuerpo.join('\n\n'),
    '',
    '— Respondé «ok» para publicarla, «no» para descartarla, o mandame la corrección (texto o audio) y la rehago.',
  ].join('\n');
}

const mostrarVistaPrevia = (dep, pedido) => dep.enviar(textoDeVistaPrevia(pedido));

async function corregir(dep, pedido, item) {
  // Una foto sola (sin texto): pasa a ser la de portada. No gasta IA.
  if (item.tipo === 'foto' && !item.texto) {
    pedido.material.fotos = [{ file_id: item.file_id, mime: item.mime }, ...(pedido.material.fotos ?? [])];
    await dep.kv.put('pedido', JSON.stringify(pedido), { expirationTtl: TTL_PEDIDO });
    await dep.enviar('Listo, esa pasa a ser la foto de portada.');
    return mostrarVistaPrevia(dep, pedido);
  }
  if (item.tipo === 'video' || item.tipo === 'otro') return dep.enviar('Eso no lo sé leer. Corregime con texto o audio, o decí «ok» o «no».');
  if ((await dep.iaHoy()) >= TOPE_PEDIDOS_IA) return dep.enviar(`Hoy ya usé los ${TOPE_PEDIDOS_IA} pedidos de IA de las notas propias. Podés decir «ok» para publicarla como está o «no».`);

  if (item.tipo === 'foto') pedido.material.fotos = [{ file_id: item.file_id, mime: item.mime }, ...(pedido.material.fotos ?? [])];
  let correccion = item.texto ?? '';
  if (item.tipo === 'audio') {
    const [t] = await transcribir(dep, [item]);
    correccion = [t, correccion].filter(Boolean).join('\n');
  }
  await dep.enviar('Rehaciendo la nota…');
  const r = await redactarPropia(dep, { material: pedido.material, previo: pedido.nota, correccion });
  if (r.noPublicar) return dep.enviar(`No pude rehacerla: ${r.noPublicar.motivo}. La anterior sigue en pie: decime otra corrección, «ok» o «no».`);
  pedido.nota = r.nota;
  pedido.pedidos = (pedido.pedidos ?? 0) + r.pedidos;
  pedido.correcciones = [...(pedido.correcciones ?? []), correccion.slice(0, 500)];
  await dep.kv.put('pedido', JSON.stringify(pedido), { expirationTtl: TTL_PEDIDO });
  return mostrarVistaPrevia(dep, pedido);
}

async function descartar(dep) {
  await dep.kv.delete('pedido');
  return dep.enviar('Listo, descarté la nota. Cuando quieras, mandame otra cosa.');
}

// ------------------------------------------------------------------------------------------------------------ publicar

async function guardarFoto(dep, pedido, nota, id) {
  const f = pedido.material.fotos?.[0];
  if (!f) return null;
  const base = { url: null, credito: 'Radar Balcarce', alt: nota.titulo, ancho: null, alto: null };
  if (!dep.fotos) return { ...base, telegram_file_id: f.file_id, mime: f.mime, pendiente: true };
  const { bytes, mime } = await dep.descargar(f.file_id);
  const clave = `redaccion/${id}.jpg`;
  await dep.fotos.put(clave, bytes, { httpMetadata: { contentType: mime || f.mime || 'image/jpeg' } });
  return { ...base, r2: clave, pendiente: false };
}

const SQL_NOTA = `INSERT INTO notas (id, historia_id, creada, titulo, bajada, cuerpo, seccion, en_dos_lineas, ficha, no_publicar, verificacion, foto, fuentes, fecha_hecho, firma, pedidos, estado, origen, slug, publicada_en, redes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

async function publicar(dep, pedido) {
  const n = pedido.nota;
  const id = pedido.id;
  const ahora = dep.ahora().toISOString();
  const slug = slugDe(n.titulo);
  const foto = await guardarFoto(dep, pedido, n, id);
  const fuentes = (pedido.material.enlaces ?? []).map((e) => ({ medio: new URL(e.url).hostname.replace(/^www\./, ''), url: e.url }));
  const redes = { eleccion: REDES_POR_DEFECTO, confirmada: false, preguntada: ahora };
  await dep.db.prepare(SQL_NOTA).bind(
    id, `redaccion-${id}`, ahora, n.titulo, n.bajada, JSON.stringify(n.cuerpo), n.seccion, n.enDosLineas, JSON.stringify(n.ficha), null,
    JSON.stringify({ oracionesQuitadas: [], reescrita: false, propia: true }), foto ? JSON.stringify(foto) : null, JSON.stringify(fuentes), ahora, FIRMA,
    pedido.pedidos ?? 0, 'publicada', 'redaccion', slug, ahora, JSON.stringify(redes),
  ).run();

  const nuevo = { fase: 'redes', id, titulo: n.titulo, preguntada: ahora };
  await dep.kv.put('pedido', JSON.stringify(nuevo), { expirationTtl: ESPERA_REDES_MS / 1000 + 3600 });
  const enlace = `${SITIO}/nota/${slug}-${id}`;
  await dep.enviar([
    'Publicada.',
    enlace,
    '(Todavía no hay corte: el enlace se va a ver cuando el sitio nuevo esté en línea.)',
    foto?.pendiente ? '(La foto quedó guardada en Telegram, pendiente de subir al sitio.)' : '',
  ].filter(Boolean).join('\n'));
  return dep.enviar('¿Qué hago en las redes con esta nota? Si no elegís en 1 hora, queda sólo en la web.', { botones: botonesDeRedes(id) });
}

export function botonesDeRedes(id) {
  return Object.entries(REDES).map(([clave, r]) => [{ text: r.etiqueta, callback_data: `redes:${id}:${clave}` }]);
}

// ------------------------------------------------------------------------------------------------------------ redes

async function elegirRedes(dep, pedido, eleccion, { porDefecto = false } = {}) {
  const redes = { eleccion, confirmada: true, elegida: dep.ahora().toISOString(), ...(porDefecto ? { por: 'defecto' } : {}) };
  await dep.db.prepare('UPDATE notas SET redes = ? WHERE id = ?').bind(JSON.stringify(redes), pedido.id).run();
  await dep.kv.delete('pedido');
  const r = REDES[eleccion];
  return dep.enviar(porDefecto
    ? `No elegiste a tiempo: «${r.etiqueta}» (${r.detalle}). Las redes de la 3.0 todavía no existen; queda anotado en la nota.`
    : `Anotado: «${r.etiqueta}» (${r.detalle}). Las redes de la 3.0 todavía no existen; queda anotado en la nota para cuando estén.`);
}

async function alApretarBoton(dep, cb) {
  const pedido = await dep.kv.get('pedido', 'json');
  const [tipo, id, eleccion] = String(cb.data ?? '').split(':');
  await dep.responderBoton(cb.id);
  if (tipo !== 'redes' || !REDES[eleccion]) return;
  if (cb.message?.message_id) await dep.quitarBotones(cb.message.message_id);
  if (pedido?.fase !== 'redes' || pedido.id !== id) return dep.enviar('Esa pregunta de las redes ya está contestada o venció.');
  return elegirRedes(dep, pedido, eleccion);
}

/** Lo corre el cron: si pasó más de una hora sin elegir las redes, queda «Sólo la web». */
export async function vencerPreguntaDeRedes(dep) {
  const pedido = await dep.kv.get('pedido', 'json');
  if (pedido?.fase !== 'redes') return false;
  if (dep.ahora() - new Date(pedido.preguntada) < ESPERA_REDES_MS) return false;
  await elegirRedes(dep, pedido, REDES_POR_DEFECTO, { porDefecto: true });
  return true;
}
