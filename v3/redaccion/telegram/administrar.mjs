// Administrar lo ya publicado desde Telegram: /retirar, /corregir, /ultimas, /pendientes, /ocultar, /mostrar, /ocultas, /redes, /repaso, /foto, /panel y /ayuda.
// Reemplaza al panel del celular viejo. Nunca usa IA: sólo lee y escribe la tabla `notas` de la D1 (binding DB), con las consultas acá mismo.
// Cada cambio muestra qué va a pasar y espera un «sí». El estado de lo que está en curso vive en el KV, clave `accion` (10 minutos).
import { normalizar, esOk, esNo, slugDe, SITIO, mencionesDeTexto, conCuentaDelMedio, itemDe, MAX_FOTOS, nombreDeLaEleccion, REDES_ELEGIBLES } from './nota-propia.mjs';
import { SECCIONES } from '../../nucleo/redactar/redactar.mjs';

export const POR = 'Hernán (Telegram)';
const TTL_ACCION = 10 * 60;

export const AYUDA = `Esto es lo que entiendo:

Notas propias
• Mandame texto, audios, fotos o un enlace con lo que quieras contar.
• «armala» (o /nota): armo la nota y te la muestro antes de publicar.
• «ok» publica; «no» o /cancelar descarta.

Lo ya publicado
• /ultimas: las 10 últimas notas publicadas, con su enlace.
• /pendientes: los borradores que esperan.
• /retirar <enlace o id> <motivo>: saca una nota del sitio. Te muestro el título y espero tu «sí».
• /seccion <enlace o id> <sección>: cambia la sección de una nota ya publicada (por ejemplo: /seccion radarbalcarce.com/nota/mi-nota-67zuqsi Argentina).
• /ocultar <enlace o id>: la saca del sitio y de las redes sin borrarla; se puede volver atrás. /ocultas lista las que están ocultas y /mostrar <enlace o id> la vuelve a publicar.
• /redes <enlace o id> <formatos>: manda una nota ya publicada a las redes. Formatos: posteo, historia, reel o todo (por ejemplo: /redes mi-nota-67zuqsi reel posteo).
• /repaso <enlace o id>: la pone primera en el próximo repaso en video (el de las 10, las 15 o las 21).
• /foto <enlace o id>: cambia las fotos de una nota publicada (la primera es la portada; te pido las fotos y cerrás con «listo»). Con «ninguna» (/foto <id> ninguna) se las saco todas.
• /menciones <enlace o id> @a @b: las cuentas que se nombran en las redes de esa nota (sin enlace, la última nota propia; «ninguna» las saca). Sumo @radarbalcarce.
• /corregir <enlace o id>: cambiar el título, la bajada o una frase del cuerpo. Te muestro el antes y el después y espero tu «sí».

Otros
• /panel: te mando el enlace para entrar al panel web (radarbalcarce.com/panel), donde se ve y se cambia todo esto desde el navegador.
• /estado: si el bot está conectado.
• /ayuda: esta lista.`;

export const COMANDOS = ['/ayuda', '/ultimas', '/pendientes', '/retirar', '/corregir', '/seccion', '/menciones', '/ocultar', '/mostrar', '/ocultas', '/redes', '/repaso', '/foto', '/panel'];

// ------------------------------------------------------------------------------------------------------------ entender lo que escribió

/** Separa «/retirar algo el resto» en { comando, resto }. */
export function partirComando(texto) {
  const t = String(texto ?? '').trim();
  const m = t.match(/^(\/[^\s@]+)(?:@\w+)?\s*([\s\S]*)$/);
  return m ? { comando: m[1].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), resto: m[2].trim() } : { comando: '', resto: t };
}

/** Los ids posibles que salen de un enlace o de un id escrito, del más largo al más corto: «mi-nota-67zuqsi» → [mi-nota-67zuqsi, nota-67zuqsi, 67zuqsi]. */
export function candidatosDeId(entrada) {
  let t = String(entrada ?? '').trim().replace(/^<|>$/g, '');
  t = t.split(/[?#]/)[0].replace(/\/+$/, '');
  const ultimo = t.split('/').pop() ?? '';
  const partes = ultimo.toLowerCase().split('-').filter(Boolean);
  const salida = [];
  for (let i = 0; i < partes.length; i++) salida.push(partes.slice(i).join('-'));
  return salida;
}

/** Busca la nota en la D1 por cualquiera de los candidatos; gana el más largo. */
export async function buscarNota(dep, entrada) {
  const cand = candidatosDeId(entrada);
  if (!cand.length) return null;
  const { results } = await dep.db.prepare(`SELECT id, titulo, bajada, cuerpo, ficha, estado, no_publicar, slug, seccion, origen, redes, foto FROM notas WHERE id IN (${cand.map(() => '?').join(',')})`).bind(...cand).all();
  for (const c of cand) {
    const f = (results ?? []).find((r) => r.id === c);
    if (f) return f;
  }
  return null;
}

const COMILLAS = '"“”«»\'';
/** «cuerpo: reemplazá "X" por "Y"» → { de, a }; null si no se entiende. */
export function entenderReemplazo(t) {
  const m = String(t).trim().match(new RegExp(`^(?:reemplaz[aáe](?:r)?|cambi[aáe](?:r)?|sustitui|sustituy[aáe])\\s*[${COMILLAS}]([\\s\\S]+?)[${COMILLAS}]\\s+(?:por|con)\\s+[${COMILLAS}]([\\s\\S]*?)[${COMILLAS}]\\s*$`, 'i'));
  return m ? { de: m[1], a: m[2] } : null;
}

/** «título: …», «bajada: …» o «cuerpo: reemplazá "X" por "Y"» → { campo, valor } | { campo: 'cuerpo', de, a } | { error }; null si no es ninguno. */
export function entenderCambio(texto) {
  const m = String(texto ?? '').trim().match(/^(t[ií]tulo|bajada|cuerpo)\s*:\s*([\s\S]*)$/i);
  if (!m) return null;
  const campo = normalizar(m[1]) === 'titulo' ? 'titulo' : normalizar(m[1]);
  const valor = m[2].trim();
  if (campo === 'cuerpo') {
    const r = entenderReemplazo(valor);
    return r ? { campo, ...r } : { error: 'Para el cuerpo escribí así: cuerpo: reemplazá "texto actual" por "texto nuevo".' };
  }
  if (!valor) return { error: `Después de «${m[1]}:» falta el texto nuevo.` };
  return { campo, valor };
}

// ------------------------------------------------------------------------------------------------------------ pequeñas ayudas

const analizar = (s, def) => { try { return s ? JSON.parse(s) : def; } catch { return def; } };
const corto = (t, n = 80) => { const s = String(t ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s || '(sin título)'; };
const enlaceDe = (n) => `${SITIO}/nota/${n.slug || slugDe(n.titulo)}-${n.id}`;

/** El cuerpo guardado puede ser una lista de párrafos (JSON) o un texto: devuelve { parrafos, comoLista }. */
function parrafosDe(cuerpo) {
  const v = analizar(cuerpo, cuerpo);
  if (Array.isArray(v)) return { parrafos: v.map(String), comoLista: true };
  return { parrafos: [String(v ?? '')], comoLista: false };
}

/** Reemplazo literal, una sola vez. Devuelve { cuerpo (en el formato guardado), antes, despues, veces } o null si no está. */
export function reemplazarEnCuerpo(cuerpo, de, a) {
  const { parrafos, comoLista } = parrafosDe(cuerpo);
  const veces = parrafos.reduce((s, p) => s + p.split(de).length - 1, 0);
  const i = parrafos.findIndex((p) => p.includes(de));
  if (i < 0) return null;
  const nuevo = [...parrafos];
  const antes = parrafos[i];
  const pos = antes.indexOf(de);
  nuevo[i] = antes.slice(0, pos) + a + antes.slice(pos + de.length);
  return { cuerpo: comoLista ? JSON.stringify(nuevo) : nuevo[0], parrafoAntes: antes, parrafoDespues: nuevo[i], veces };
}

/** Un trozo del párrafo alrededor del cambio, para mostrarlo sin pegar párrafos enteros. */
function entorno(parrafo, texto, margen = 60) {
  const pos = parrafo.indexOf(texto);
  if (pos < 0) return corto(parrafo, 160);
  const desde = Math.max(0, pos - margen);
  const hasta = Math.min(parrafo.length, pos + texto.length + margen);
  return `${desde > 0 ? '…' : ''}${parrafo.slice(desde, hasta)}${hasta < parrafo.length ? '…' : ''}`;
}

// ------------------------------------------------------------------------------------------------------------ la entrada

/** ¿Hay algo de /retirar o /corregir esperando una respuesta? (El Worker lo mira para saber a quién le toca un «sí».) */
export async function hayAccionEnCurso(kv, ahora = new Date()) {
  const a = await kv.get('accion', 'json');
  return Boolean(a && (!a.vence || a.vence > ahora.toISOString()));
}

/** ¿Está esperando fotos un /foto? (El Worker lo mira para mandar a administrar.mjs las fotos que llegan, y no a la nota propia.) */
export async function hayFotoEnCurso(kv, ahora = new Date()) {
  const a = await kv.get('accion', 'json');
  return Boolean(a && a.tipo === 'foto' && (!a.vence || a.vence > ahora.toISOString()));
}

export async function procesarAdmin(dep, actualizacion) {
  const m = actualizacion?.message;
  if (!m) return;
  const texto = (m.text ?? '').trim();
  try {
    const { comando, resto } = partirComando(texto);
    if (comando === '/ayuda') return await dep.enviar(AYUDA);
    if (comando === '/ultimas') return await ultimas(dep);
    if (comando === '/pendientes') return await pendientes(dep);
    if (comando === '/retirar') return await empezarRetiro(dep, resto);
    if (comando === '/corregir') return await empezarCorreccion(dep, resto);
    if (comando === '/seccion') return await cambiarSeccion(dep, resto);
    if (comando === '/menciones') return await cambiarMenciones(dep, resto);
    if (comando === '/ocultar') return await ocultar(dep, resto);
    if (comando === '/mostrar') return await mostrar(dep, resto);
    if (comando === '/ocultas') return await ocultas(dep);
    if (comando === '/redes') return await mandarARedes(dep, resto);
    if (comando === '/repaso') return await mandarAlRepaso(dep, resto);
    if (comando === '/foto') return await empezarFotos(dep, resto);
    if (comando === '/panel') return await enlaceDelPanel(dep);
    if (!texto && (m.photo?.length || m.document)) return await recibirFoto(dep, m);
    return await continuar(dep, texto);
  } catch (e) {
    console.error(`administrar: ${String(e?.message ?? e)}`);
    await dep.enviar('Tuve un problema con eso y no cambié nada. Probá de nuevo en un rato.');
  }
}

async function guardarAccion(dep, a) {
  await dep.kv.put('accion', JSON.stringify({ ...a, vence: new Date(dep.ahora().getTime() + TTL_ACCION * 1000).toISOString() }), { expirationTtl: TTL_ACCION });
}
const borrarAccion = (dep) => dep.kv.delete('accion');

// ------------------------------------------------------------------------------------------------------------ /ultimas y /pendientes

async function ultimas(dep) {
  const { results } = await dep.db.prepare(
    "SELECT id, titulo, slug FROM notas WHERE estado = 'publicada' AND no_publicar IS NULL ORDER BY COALESCE(publicada_en, creada) DESC LIMIT 10",
  ).bind().all();
  if (!results?.length) return dep.enviar('Todavía no hay notas publicadas.');
  return dep.enviar(`Las últimas ${results.length} publicadas:\n\n${results.map((n, i) => `${i + 1}. ${corto(n.titulo, 70)}\n${enlaceDe(n)}`).join('\n\n')}`);
}

async function pendientes(dep) {
  const { results } = await dep.db.prepare(
    "SELECT id, titulo, slug, no_publicar FROM notas WHERE estado = 'borrador' ORDER BY creada DESC LIMIT 10",
  ).bind().all();
  if (!results?.length) return dep.enviar('No hay borradores esperando.');
  const lineas = results.map((n, i) => {
    const freno = analizar(n.no_publicar, null);
    return `${i + 1}. ${corto(n.titulo, 70)}${freno ? ` (frenada: ${corto(freno.motivo ?? freno.razon ?? 'sin motivo', 50)})` : ''}\nid: ${n.id}`;
  });
  return dep.enviar(`Borradores que esperan (${results.length}):\n\n${lineas.join('\n\n')}`);
}

// ------------------------------------------------------------------------------------------------------------ /seccion

/** Cambia la sección de una nota publicada (se puede volver a cambiar). Sin confirmación: no borra nada. */
export async function cambiarSeccion(dep, resto) {
  const texto = String(resto ?? '').trim();
  const buscar = (t) => SECCIONES.find((x) => normalizar(x) === normalizar(t));
  const partes = texto.split(/\s+/).filter(Boolean);
  // «/seccion Argentina» (sin enlace) = la última nota propia publicada.
  let sec = buscar(texto);
  let nota = null;
  if (sec) {
    const { results } = await dep.db.prepare("SELECT id, titulo FROM notas WHERE estado = 'publicada' AND origen = 'redaccion' ORDER BY COALESCE(publicada_en, creada) DESC LIMIT 1").bind().all();
    nota = results?.[0] ?? null;
    if (!nota) return dep.enviar('No encuentro ninguna nota propia publicada. Pasame el enlace: /seccion <enlace o id> <sección>.');
  } else {
    sec = partes.length > 1 ? buscar(partes.slice(1).join(' ')) : null;
    if (!partes[0] || !sec) return dep.enviar(`Decime a qué sección: /seccion <sección> (cambia tu última nota) o /seccion <enlace o id> <sección>.
Secciones: ${SECCIONES.join(', ')}.`);
    nota = await buscarNota(dep, partes[0]);
    if (!nota) return dep.enviar('No encuentro esa nota. Pasame el enlace o el id (mirá /ultimas).');
  }
  await dep.db.prepare('UPDATE notas SET seccion = ? WHERE id = ?').bind(sec, nota.id).run();
  return dep.enviar(`Listo: «${corto(nota.titulo, 70)}» ahora está en ${sec}. El sitio la muestra ahí en unos minutos.`);
}

// ------------------------------------------------------------------------------------------------------------ /menciones

/** Cambia las cuentas que se nombran en las redes de una nota (clave `menciones` dentro de `redes`). Sin confirmación: no borra nada. */
export async function cambiarMenciones(dep, resto) {
  const texto = String(resto ?? '').trim();
  const ninguna = /(^|\s)ninguna\s*$/i.test(texto);
  const menciones = mencionesDeTexto(texto);
  const ayuda = 'Decime las cuentas: /menciones @fulano @otra (en tu última nota) o /menciones <enlace o id> @fulano @otra. Con «ninguna» las saco.';
  if (!menciones.length && !ninguna) return dep.enviar(ayuda);
  const primero = texto.split(/\s+/)[0] ?? '';
  let nota;
  if (primero.startsWith('@') || /^ninguna$/i.test(primero)) {
    const { results } = await dep.db.prepare("SELECT id, titulo, redes FROM notas WHERE estado = 'publicada' AND origen = 'redaccion' ORDER BY COALESCE(publicada_en, creada) DESC LIMIT 1").bind().all();
    nota = results?.[0] ?? null;
    if (!nota) return dep.enviar('No encuentro ninguna nota propia publicada. Pasame el enlace: /menciones <enlace o id> @fulano.');
  } else {
    const hallada = await buscarNota(dep, primero);
    if (!hallada) return dep.enviar('No encuentro esa nota. Pasame el enlace o el id (mirá /ultimas).');
    const { results } = await dep.db.prepare('SELECT redes FROM notas WHERE id = ?').bind(hallada.id).all();
    nota = { ...hallada, redes: results?.[0]?.redes };
  }
  const base = analizar(nota.redes, {});
  const redes = base && typeof base === 'object' && !Array.isArray(base) ? { ...base } : {};
  if (menciones.length) redes.menciones = conCuentaDelMedio(menciones); else delete redes.menciones;
  await dep.db.prepare('UPDATE notas SET redes = ? WHERE id = ?').bind(JSON.stringify(redes), nota.id).run();
  return dep.enviar(menciones.length
    ? `Listo: «${corto(nota.titulo, 70)}» nombra en las redes a ${redes.menciones.join(' ')}. Vale para lo que todavía no salió.`
    : `Listo: «${corto(nota.titulo, 70)}» ya no nombra cuentas en las redes.`);
}

// ------------------------------------------------------------------------------------------------------------ /ocultar, /mostrar y /ocultas

/** Saca una nota del sitio y de las redes SIN retirarla: estado «oculta» (no toca `no_publicar`). Se vuelve atrás con /mostrar. Sin confirmación: es reversible. */
export async function ocultar(dep, resto) {
  const que = String(resto ?? '').split(/\s+/).filter(Boolean)[0];
  if (!que) return dep.enviar('Decime cuál: /ocultar <enlace o id>. Si te arrepentís, /mostrar <enlace o id> la vuelve a publicar.');
  const nota = await buscarNota(dep, que);
  if (!nota) return dep.enviar(`No encuentro ninguna nota con «${corto(que, 60)}». Probá con el enlace completo o con el id (mirá /ultimas).`);
  if (nota.estado === 'oculta') return dep.enviar(`Esa nota ya está oculta: «${corto(nota.titulo)}». Para volver a mostrarla: /mostrar ${nota.id}.`);
  if (nota.estado === 'retirada') return dep.enviar(`Esa nota está retirada («${corto(nota.titulo)}»): ya no se ve. Ocultar es sólo para lo que querés poder volver a mostrar.`);
  if (nota.estado !== 'publicada') return dep.enviar(`Esa nota no está publicada («${corto(nota.titulo)}», estado: ${nota.estado}); no hay nada que ocultar.`);
  await dep.db.prepare("UPDATE notas SET estado = 'oculta' WHERE id = ? AND estado = 'publicada'").bind(nota.id).run();
  return dep.enviar(`Listo, oculta: «${corto(nota.titulo, 100)}». No se ve en el sitio ni sale en redes hasta que la vuelvas a mostrar con /mostrar ${nota.id}.`);
}

/** Vuelve a publicar una nota oculta (sólo desde «oculta»: una retirada no vuelve por acá). */
export async function mostrar(dep, resto) {
  const que = String(resto ?? '').split(/\s+/).filter(Boolean)[0];
  if (!que) return dep.enviar('Decime cuál: /mostrar <enlace o id>. Las ocultas están en /ocultas.');
  const nota = await buscarNota(dep, que);
  if (!nota) return dep.enviar(`No encuentro ninguna nota con «${corto(que, 60)}». Probá con el enlace completo o con el id (mirá /ocultas).`);
  if (nota.estado === 'publicada') return dep.enviar(`Esa nota ya se ve: «${corto(nota.titulo)}». ${enlaceDe(nota)}`);
  if (nota.estado !== 'oculta') return dep.enviar(`Esa nota no está oculta («${corto(nota.titulo)}», estado: ${nota.estado}); por acá sólo vuelven las que ocultaste con /ocultar.`);
  await dep.db.prepare("UPDATE notas SET estado = 'publicada' WHERE id = ? AND estado = 'oculta'").bind(nota.id).run();
  return dep.enviar(`Listo, se vuelve a ver: «${corto(nota.titulo, 100)}». El sitio la muestra en unos minutos.\n${enlaceDe(nota)}`);
}

async function ocultas(dep) {
  const { results } = await dep.db.prepare(
    "SELECT id, titulo, slug FROM notas WHERE estado = 'oculta' ORDER BY COALESCE(publicada_en, creada) DESC LIMIT 10",
  ).bind().all();
  if (!results?.length) return dep.enviar('No hay notas ocultas.');
  return dep.enviar(`Las últimas ${results.length} ocultas (/mostrar <id> la vuelve a publicar):\n\n${results.map((n, i) => `${i + 1}. ${corto(n.titulo, 70)}\nid: ${n.id}`).join('\n\n')}`);
}

// ------------------------------------------------------------------------------------------------------------ /redes y /repaso

const FORMATOS = { reel: 'reel', reels: 'reel', historia: 'historia', historias: 'historia', posteo: 'posteo', posteos: 'posteo', post: 'posteo' };
const TODOS_LOS_FORMATOS = REDES_ELEGIBLES.map((r) => r.clave);

/** «reel, posteo y historia» / «todo» → { lista (en el orden de siempre), desconocidos }. Sin tildes ni mayúsculas. */
export function entenderFormatos(texto) {
  const palabras = normalizar(texto).split(' ').filter((p) => p && !['y', 'e'].includes(p));
  const pedidos = new Set();
  const desconocidos = [];
  for (const p of palabras) {
    if (p === 'todo' || p === 'todos' || p === 'todas') TODOS_LOS_FORMATOS.forEach((c) => pedidos.add(c));
    else if (FORMATOS[p]) pedidos.add(FORMATOS[p]);
    else desconocidos.push(p);
  }
  return { lista: TODOS_LOS_FORMATOS.filter((c) => pedidos.has(c)), desconocidos };
}

const objeto = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? { ...v } : {});
const fotosConDireccion = (nota) => { const f = analizar(nota.foto, null); return (Array.isArray(f) ? f : f ? [f] : []).filter((x) => /^https:\/\//i.test(String(x?.url ?? x?.copia ?? ''))).length; };

/** Una nota a la que se le puede pedir algo de las redes: publicada y sin freno. Devuelve la nota o null (y ya contestó). */
async function notaParaPedirRedes(dep, que, comando) {
  const nota = await buscarNota(dep, que);
  if (!nota) { await dep.enviar(`No encuentro ninguna nota con «${corto(que, 60)}». Probá con el enlace completo o con el id (mirá /ultimas).`); return null; }
  if (nota.estado !== 'publicada') { await dep.enviar(`Esa nota no está publicada («${corto(nota.titulo)}», estado: ${nota.estado}); ${comando} sólo vale para lo que se ve en el sitio.`); return null; }
  if (analizar(nota.no_publicar, null)) { await dep.enviar(`Esa nota tiene un freno puesto («${corto(nota.titulo)}»): no la mando a ningún lado.`); return null; }
  return nota;
}

/** /redes <enlace o id> <formatos>: suma esos formatos a lo que ya tenía la nota y la marca como pedida a mano (`forzada`): sale aunque no la cuenten otros medios. La ley, el tono y la foto siguen valiendo. */
export async function mandarARedes(dep, resto) {
  const [que, ...demas] = String(resto ?? '').split(/\s+/).filter(Boolean);
  const ayuda = 'Decime cuál y en qué formato: /redes <enlace o id> posteo, historia, reel o todo (se pueden juntar: /redes mi-nota-67zuqsi reel posteo).';
  if (!que) return dep.enviar(ayuda);
  const { lista: pedidos, desconocidos } = entenderFormatos(demas.join(' '));
  if (desconocidos.length) return dep.enviar(`No entendí «${desconocidos.join(' ')}». Los formatos son posteo, historia, reel o todo.`);
  if (!pedidos.length) return dep.enviar(ayuda);
  const nota = await notaParaPedirRedes(dep, que, '/redes');
  if (!nota) return;
  const base = objeto(analizar(nota.redes, {}));
  const previos = Array.isArray(base.lista) ? base.lista : [];
  const lista = TODOS_LOS_FORMATOS.filter((c) => previos.includes(c) || pedidos.includes(c));
  const redes = { ...base, lista, eleccion: nombreDeLaEleccion(lista), confirmada: true, forzada: true, pedida: dep.ahora().toISOString() };
  await dep.db.prepare('UPDATE notas SET redes = ? WHERE id = ?').bind(JSON.stringify(redes), nota.id).run();
  const etiqueta = (c) => REDES_ELEGIBLES.find((r) => r.clave === c).etiqueta;
  const lineas = [`Listo: «${corto(nota.titulo, 80)}» va a las redes como: ${lista.map(etiqueta).join(', ')}.`];
  if (pedidos.includes('posteo')) lineas.push('• Posteo: sale en la próxima vuelta de las redes (de 8 a 22).');
  const piezas = pedidos.filter((c) => c !== 'posteo');
  if (piezas.length) lineas.push(`• ${piezas.map(etiqueta).join(', ')}: los arma el reloj de 8 a 23, una vez por nota.`);
  const fotos = fotosConDireccion(nota);
  if ((pedidos.includes('reel') || pedidos.includes('historia')) && !fotos) lineas.push(`(Ojo: sin foto con dirección pública el reel no se arma. Podés sumarla con /foto ${nota.id}.)`);
  if (nota.origen !== 'redaccion') lineas.push('Sale con la firma «Radar Balcarce» y el crédito de cada foto.');
  return dep.enviar(lineas.join('\n'));
}

/** /repaso <enlace o id>: la nota va primera en el próximo repaso en video (vale 24 horas desde el pedido; pasa igual por la ley, el tono y la foto). */
export async function mandarAlRepaso(dep, resto) {
  const que = String(resto ?? '').split(/\s+/).filter(Boolean)[0];
  if (!que) return dep.enviar('Decime cuál: /repaso <enlace o id>. Entra primera en el próximo repaso en video.');
  const nota = await notaParaPedirRedes(dep, que, '/repaso');
  if (!nota) return;
  const redes = { ...objeto(analizar(nota.redes, {})), repaso: true, pedida: dep.ahora().toISOString() };
  await dep.db.prepare('UPDATE notas SET redes = ? WHERE id = ?').bind(JSON.stringify(redes), nota.id).run();
  return dep.enviar(`Listo: «${corto(nota.titulo, 80)}» entra primera en el próximo repaso (los de las 10, las 15 y las 21; el primero que salga en las próximas 24 horas). Una vez que lo cuenta un repaso no se repite.`);
}

// ------------------------------------------------------------------------------------------------------------ /foto

const claveDeFoto = (item) => `fotoacc:${item.cuando}:${String(item.id).padStart(10, '0')}`;
async function clavesDeFotos(kv) {
  const claves = [];
  let cursor;
  do {
    const l = await kv.list({ prefix: 'fotoacc:', cursor });
    for (const k of l.keys) claves.push(k.name);
    cursor = l.list_complete ? undefined : l.cursor;
  } while (cursor);
  return claves.sort();
}

/** /foto <enlace o id>: empieza a juntar las fotos nuevas de una nota publicada. Con «ninguna» las saca todas (el motor la ilustra después). */
async function empezarFotos(dep, resto) {
  const [que, ...demas] = String(resto ?? '').split(/\s+/).filter(Boolean);
  if (!que) return dep.enviar('Decime cuál: /foto <enlace o id> (después mandás las fotos y escribís «listo»), o /foto <enlace o id> ninguna para sacarlas todas.');
  const nota = await buscarNota(dep, que);
  if (!nota) return dep.enviar(`No encuentro ninguna nota con «${corto(que, 60)}». Probá con el enlace completo o con el id (mirá /ultimas).`);
  if (nota.estado === 'retirada') return dep.enviar(`Esa nota está retirada («${corto(nota.titulo)}»); no le cambio las fotos.`);
  if (demas.length && normalizar(demas.join(' ')) === 'ninguna') {
    await dep.db.prepare('UPDATE notas SET foto = NULL WHERE id = ?').bind(nota.id).run();
    return dep.enviar(`Listo: «${corto(nota.titulo, 80)}» quedó sin fotos. Sale así hasta que el motor le consiga o le ilustre una (o le pongas otras con /foto ${nota.id}).`);
  }
  for (const c of await clavesDeFotos(dep.kv)) await dep.kv.delete(c);
  await guardarAccion(dep, { tipo: 'foto', id: nota.id });
  return dep.enviar('Mandame la foto (o varias). La primera queda de portada. Cuando termines, escribí «listo». Para sacar todas las fotos: /foto <id> ninguna.');
}

/** Una foto que llega mientras hay un /foto en curso: se guarda aparte (un álbum llega como varios mensajes a la vez) hasta el «listo». */
async function recibirFoto(dep, m) {
  const a = await dep.kv.get('accion', 'json');
  if (!a || a.tipo !== 'foto' || (a.vence && a.vence <= dep.ahora().toISOString())) return dep.enviar('No estoy esperando fotos. Para cambiar las fotos de una nota: /foto <enlace o id>.');
  const item = itemDe(m, dep.ahora());
  if (item.tipo !== 'foto') return dep.enviar('Eso no es una foto. Mandame las fotos o escribí «listo».');
  await dep.kv.put(claveDeFoto(item), JSON.stringify(item), { expirationTtl: TTL_ACCION });
  await guardarAccion(dep, a); // sigue vivo 10 minutos desde la última foto
  if (item.grupo) {
    if (await dep.kv.get(`grupo:${item.grupo}`)) return;
    await dep.kv.put(`grupo:${item.grupo}`, '1', { expirationTtl: 120 });
  }
  return dep.enviar('Recibida. Mandá más o escribí «listo».');
}

/** El «listo»: baja las fotos, las guarda en el depósito del sitio y deja la lista nueva (la primera de portada). El crédito es el pie de la foto si lo tiene, y si no «Radar Balcarce». */
async function guardarFotos(dep, a) {
  const nota = await buscarNota(dep, a.id);
  if (!nota) { await borrarAccion(dep); return dep.enviar('Ya no encuentro esa nota; no cambié nada.'); }
  const claves = await clavesDeFotos(dep.kv);
  const items = [];
  for (const c of claves) { const v = await dep.kv.get(c, 'json'); if (v) items.push(v); }
  if (!items.length) return dep.enviar('Todavía no me mandaste ninguna foto. Mandalas y escribí «listo» (o «no» para dejarlo como está).');
  if (!dep.fotos) { await borrarAccion(dep); return dep.enviar('Este bot no tiene dónde guardar las fotos (falta el depósito). No cambié nada.'); }
  const sello = dep.ahora().getTime().toString(36);
  const guardadas = [];
  for (const f of items.slice(0, MAX_FOTOS)) {
    try {
      const { bytes, mime } = await dep.descargar(f.file_id);
      const nombre = `redaccion-${nota.id}-f${sello}-${guardadas.length + 1}.jpg`;
      const clave = `fotos-notas/${nombre}`;
      await dep.fotos.put(clave, bytes, { httpMetadata: { contentType: mime || f.mime || 'image/jpeg' } });
      guardadas.push({ url: `${SITIO}/fotos-notas/${nombre}`, credito: f.texto ? corto(f.texto, 120) : 'Radar Balcarce', alt: nota.titulo, ancho: null, alto: null, r2: clave, pendiente: false });
    } catch { /* una foto que no baja no frena a las demás */ }
  }
  if (!guardadas.length) { await borrarAccion(dep); for (const c of claves) await dep.kv.delete(c); return dep.enviar('No pude bajar ninguna de las fotos. No cambié nada; probá de nuevo con /foto.'); }
  await dep.db.prepare('UPDATE notas SET foto = ? WHERE id = ?').bind(JSON.stringify(guardadas), nota.id).run();
  await borrarAccion(dep);
  for (const c of claves) await dep.kv.delete(c);
  const perdidas = Math.min(items.length, MAX_FOTOS) - guardadas.length;
  return dep.enviar(`Listo: «${corto(nota.titulo, 80)}» tiene ${guardadas.length} foto${guardadas.length > 1 ? 's' : ''} (la primera de portada).${perdidas ? ` (${perdidas} no se pudo${perdidas > 1 ? 'ieron' : ''} bajar.)` : ''}${items.length > MAX_FOTOS ? ` Pasaste el máximo de ${MAX_FOTOS}: las demás quedaron afuera.` : ''} El sitio la muestra en unos minutos.`);
}

// ------------------------------------------------------------------------------------------------------------ /panel

const MINUTOS_DEL_ENLACE = 15;
const huellaHex = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('');

/**
 * /panel: un enlace de un solo uso para entrar al panel web (v3/sitio/panel.mjs). En la base (tabla panel_accesos) queda sólo la huella SHA-256 del token,
 * con 15 minutos de vida; el token va únicamente en el mensaje. Sin vista previa del enlace, para que Telegram no lo abra solo.
 */
export async function enlaceDelPanel(dep) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const vence = new Date(dep.ahora().getTime() + MINUTOS_DEL_ENLACE * 60 * 1000).toISOString();
  try {
    await dep.db.prepare('INSERT INTO panel_accesos (token, vence) VALUES (?, ?)').bind(await huellaHex(token), vence).run();
  } catch (e) {
    if (/no such table/i.test(String(e?.message ?? e))) return dep.enviar('El panel todavía no está instalado en la base: hay que subir el sitio («Radar 3.0: desplegar» con sitio). No generé ningún enlace.');
    throw e;
  }
  return dep.enviar(`Tu enlace para entrar al panel:\n${SITIO}/panel/entrar?t=${token}\n\nSirve una vez y vence en ${MINUTOS_DEL_ENLACE} minutos. Al entrar, este teléfono queda adentro 30 días. No lo reenvíes: con él se entra al panel.`, { sinVistaPrevia: true });
}

// ------------------------------------------------------------------------------------------------------------ /retirar

async function empezarRetiro(dep, resto) {
  const [que, ...m] = resto.split(/\s+/).filter(Boolean);
  const motivo = m.join(' ').trim();
  if (!que) return dep.enviar('Decime cuál: /retirar <enlace o id> <motivo>. Por ejemplo: /retirar radarbalcarce.com/nota/la-escuela-67zuqsi error en el nombre.');
  const nota = await buscarNota(dep, que);
  if (!nota) return dep.enviar(`No encuentro ninguna nota con «${corto(que, 60)}». Probá con el enlace completo o con el id (lo último de la dirección).`);
  if (nota.estado === 'retirada') return dep.enviar(`Esa nota ya está retirada: ${corto(nota.titulo)}.`);
  if (!motivo) return dep.enviar(`Falta el motivo. Escribí: /retirar ${nota.id} <motivo>.`);
  await guardarAccion(dep, { tipo: 'retirar', id: nota.id, titulo: nota.titulo, motivo });
  return dep.enviar(`Voy a retirar:\n«${corto(nota.titulo, 120)}»\nMotivo: ${motivo}\n\n¿La saco del sitio? Respondé «sí» o «no».`);
}

async function retirar(dep, a) {
  const cuando = dep.ahora().toISOString();
  const nota = await buscarNota(dep, a.id);
  if (!nota) return dep.enviar('Ya no encuentro esa nota; no cambié nada.');
  await dep.db.prepare("UPDATE notas SET estado = 'retirada', no_publicar = ? WHERE id = ?").bind(JSON.stringify({ motivo: a.motivo, cuando, por: POR }), a.id).run();
  return dep.enviar(`Listo, retirada: «${corto(a.titulo, 100)}». Sale del sitio en la próxima actualización.`);
}

// ------------------------------------------------------------------------------------------------------------ /corregir

async function empezarCorreccion(dep, resto) {
  const que = resto.split(/\s+/).filter(Boolean)[0];
  if (!que) return dep.enviar('Decime cuál: /corregir <enlace o id>.');
  const nota = await buscarNota(dep, que);
  if (!nota) return dep.enviar(`No encuentro ninguna nota con «${corto(que, 60)}». Probá con el enlace completo o con el id (lo último de la dirección).`);
  if (nota.estado === 'retirada') return dep.enviar(`Esa nota está retirada (${corto(nota.titulo)}); no la corrijo.`);
  await guardarAccion(dep, { tipo: 'corregir', fase: 'esperando', id: nota.id });
  return dep.enviar([
    `Título: ${nota.titulo || '(sin título)'}`,
    `Bajada: ${nota.bajada || '(sin bajada)'}`,
    '',
    '¿Qué cambio? Escribí una de estas:',
    'título: el título nuevo',
    'bajada: la bajada nueva',
    'cuerpo: reemplazá "texto actual" por "texto nuevo"',
    '(o «no» para dejarlo como está)',
  ].join('\n'));
}

async function proponerCorreccion(dep, a, cambio) {
  const nota = await buscarNota(dep, a.id);
  if (!nota) { await borrarAccion(dep); return dep.enviar('Ya no encuentro esa nota; no cambié nada.'); }
  let vista;
  if (cambio.campo === 'cuerpo') {
    const r = reemplazarEnCuerpo(nota.cuerpo, cambio.de, cambio.a);
    if (!r) return dep.enviar(`No encuentro «${corto(cambio.de, 80)}» en el cuerpo (tiene que ser igual, letra por letra). Probá de nuevo o escribí «no».`);
    vista = `Cuerpo, antes:\n${entorno(r.parrafoAntes, cambio.de)}\n\nCuerpo, después:\n${entorno(r.parrafoDespues, cambio.a)}${r.veces > 1 ? `\n\n(Ojo: ese texto aparece ${r.veces} veces; cambio sólo la primera.)` : ''}`;
  } else {
    const antes = nota[cambio.campo] ?? '';
    if (antes === cambio.valor) return dep.enviar('Eso ya es lo que dice ahora. Escribí otro cambio o «no».');
    vista = `${cambio.campo === 'titulo' ? 'Título' : 'Bajada'}, antes:\n${antes || '(vacío)'}\n\nDespués:\n${cambio.valor}`;
  }
  await guardarAccion(dep, { tipo: 'corregir', fase: 'confirmar', id: a.id, cambio });
  return dep.enviar(`${vista}\n\n¿Lo guardo? Respondé «sí» o «no».`);
}

async function guardarCorreccion(dep, a) {
  const nota = await buscarNota(dep, a.id);
  if (!nota) return dep.enviar('Ya no encuentro esa nota; no cambié nada.');
  const c = a.cambio;
  const cuando = dep.ahora().toISOString();
  const ficha = analizar(nota.ficha, null);
  const base = ficha && typeof ficha === 'object' && !Array.isArray(ficha) ? ficha : {};
  const registro = { cuando, campo: c.campo, por: POR };
  let columna;
  let nuevo;
  if (c.campo === 'cuerpo') {
    const r = reemplazarEnCuerpo(nota.cuerpo, c.de, c.a);
    if (!r) return dep.enviar(`El texto «${corto(c.de, 60)}» ya no está en el cuerpo; no cambié nada.`);
    columna = 'cuerpo';
    nuevo = r.cuerpo;
    Object.assign(registro, { antes: c.de, despues: c.a, parrafo_antes: r.parrafoAntes });
  } else {
    columna = c.campo;
    nuevo = c.valor;
    Object.assign(registro, { antes: nota[c.campo] ?? '', despues: c.valor });
  }
  const fichaNueva = { ...base, correcciones: [...(Array.isArray(base.correcciones) ? base.correcciones : []), registro] };
  // `columna` sale de una lista fija (titulo, bajada, cuerpo), nunca de lo que escribió la persona.
  await dep.db.prepare(`UPDATE notas SET ${columna} = ?, ficha = ? WHERE id = ?`).bind(nuevo, JSON.stringify(fichaNueva), a.id).run();
  return dep.enviar('Listo, guardado. El texto original queda anotado en la nota. Sale en la próxima actualización del sitio.');
}

// ------------------------------------------------------------------------------------------------------------ respuestas a lo que está en curso

async function continuar(dep, texto) {
  const a = await dep.kv.get('accion', 'json');
  if (!a || (a.vence && a.vence <= dep.ahora().toISOString())) {
    await borrarAccion(dep);
    return dep.enviar('No tengo nada en curso. Escribí /ayuda para ver qué puedo hacer.');
  }
  if (esNo(texto)) {
    await borrarAccion(dep);
    return dep.enviar('Listo, no cambié nada.');
  }
  if (a.tipo === 'foto') {
    if (esOk(texto) || /^(termine|ya esta|eso es todo)$/.test(normalizar(texto))) return guardarFotos(dep, a);
    return dep.enviar('Estoy esperando las fotos de la nota. Mandalas y escribí «listo» (o «no» para dejarlo como está).');
  }
  if (a.tipo === 'retirar') {
    if (!esOk(texto)) return dep.enviar('Respondé «sí» para retirarla o «no» para dejarla.');
    await borrarAccion(dep);
    return retirar(dep, a);
  }
  if (a.tipo === 'corregir' && a.fase === 'confirmar') {
    if (esOk(texto)) { await borrarAccion(dep); return guardarCorreccion(dep, a); }
    // Si en vez de «sí» manda otro cambio, se arma de nuevo.
    const otro = entenderCambio(texto);
    if (otro && !otro.error) return proponerCorreccion(dep, a, otro);
    return dep.enviar('Respondé «sí» para guardar o «no» para dejarlo como está.');
  }
  if (a.tipo === 'corregir') {
    const c = entenderCambio(texto);
    if (!c) return dep.enviar('No entendí. Escribí «título: …», «bajada: …» o «cuerpo: reemplazá "X" por "Y"» (o «no» para dejarlo).');
    if (c.error) return dep.enviar(c.error);
    return proponerCorreccion(dep, a, c);
  }
  await borrarAccion(dep);
  return dep.enviar('No tengo nada en curso. Escribí /ayuda para ver qué puedo hacer.');
}
