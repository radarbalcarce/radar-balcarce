// Administrar lo ya publicado desde Telegram: /retirar, /corregir, /ultimas, /pendientes y /ayuda.
// Reemplaza al panel del celular viejo. Nunca usa IA: sólo lee y escribe la tabla `notas` de la D1 (binding DB), con las consultas acá mismo.
// Cada cambio muestra qué va a pasar y espera un «sí». El estado de lo que está en curso vive en el KV, clave `accion` (10 minutos).
import { normalizar, esOk, esNo, slugDe, SITIO } from './nota-propia.mjs';
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
• /corregir <enlace o id>: cambiar el título, la bajada o una frase del cuerpo. Te muestro el antes y el después y espero tu «sí».

Otros
• /estado: si el bot está conectado.
• /ayuda: esta lista.`;

export const COMANDOS = ['/ayuda', '/ultimas', '/pendientes', '/retirar', '/corregir', '/seccion'];

// ------------------------------------------------------------------------------------------------------------ entender lo que escribió

/** Separa «/retirar algo el resto» en { comando, resto }. */
export function partirComando(texto) {
  const t = String(texto ?? '').trim();
  const m = t.match(/^(\/[^\s@]+)(?:@\w+)?\s*([\s\S]*)$/);
  return m ? { comando: m[1].toLowerCase(), resto: m[2].trim() } : { comando: '', resto: t };
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
  const { results } = await dep.db.prepare(`SELECT id, titulo, bajada, cuerpo, ficha, estado, no_publicar, slug FROM notas WHERE id IN (${cand.map(() => '?').join(',')})`).bind(...cand).all();
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
  const partes = String(resto ?? '').trim().split(/s+/);
  const sec = partes.length > 1 ? SECCIONES.find((x) => normalizar(x) === normalizar(partes.slice(1).join(' '))) : null;
  if (!partes[0] || !sec) return dep.enviar(`Decime cuál y a qué sección: /seccion <enlace o id> <sección>.
Secciones: ${SECCIONES.join(', ')}.`);
  const nota = await buscarNota(dep, partes[0]);
  if (!nota) return dep.enviar('No encuentro esa nota. Pasame el enlace o el id (mirá /ultimas).');
  await dep.db.prepare('UPDATE notas SET seccion = ? WHERE id = ?').bind(sec, nota.id).run();
  return dep.enviar(`Listo: «${corto(nota.titulo, 70)}» ahora está en ${sec}. El sitio la muestra ahí en unos minutos.`);
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
