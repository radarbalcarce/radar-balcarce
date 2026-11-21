// El texto de cada pieza de video en Facebook e Instagram y la publicación (reel y historia) con el cliente de Meta de siempre (redes/meta.mjs: sube el mp4 directo, en dos pasos).
// Sólo corre con REDES_ACTIVAS en «si»; en ensayo se arma el mismo texto y se anota lo que se HABRÍA publicado. Puro salvo `publicarPieza`, que recibe el cliente.
import { createHash } from 'node:crypto';
import { AVISO_DE_IA_TEXTO, HASHTAGS_FIJOS, DIRECCION_DEL_SITIO } from './variables.mjs';
import { accionesDe, MAXIMO_DE_UN_SHORT_SEG } from '../piezas-del-dia.mjs';
import { ponerOrigen, enlaceDeNota, SITIO } from '../texto.mjs';
import { tituloQueEntra } from '../titular.mjs';

/**
 * El clima, los avisos de clima y la farmacia, cuando salen como reel en Facebook, llevan el enlace a SU página del sitio (/clima, /farmacias) con su origen, no un «Todo en radarbalcarce.com»
 * suelto (regla 210 del sistema viejo, 17/10/2026: a las 19 y las 20 casi nadie llegaba a la web desde esas piezas). Instagram, sin enlaces.
 */
const SERVICIOS_CON_PAGINA = {
  clima: { camino: '/clima', frase: 'El pronóstico de toda la semana, acá' },
  aviso: { camino: '/clima', frase: 'El pronóstico de toda la semana, acá' },
  farmacia: { camino: '/farmacias', frase: 'Las farmacias de turno de toda la semana, con dirección, acá' },
};

/** La dirección de la nota del día de una pieza (efeméride, clima de mañana) o null. */
export function notaDeLaPiezaEnLaWeb(item) {
  const dia = item?.dia;
  if (!dia) return null;
  if (item.arma === 'efemeride') return enlaceDeNota({ slug: 'un-dia-como-hoy', id: `efemeride-${dia}` });
  if (item.id === 'clima-manana') return enlaceDeNota({ slug: 'el-clima', id: `clima-${dia}` });
  return null;
}

const limpiar = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

/** Una ilustración con IA no es una «foto»: se nombra aparte («Ilustración generada con IA»). */
const ES_ILUSTRACION = /^ilustraci[oó]n/i;

/**
 * Un crédito como se lee en el texto de un posteo (20/11/2026, revisar-textos.mjs): sin la palabra «Foto:» ni «Foto de» delante (se la pone la línea una sola vez: «Foto: Casimir Carbonnier»,
 * nunca «Foto: Foto de Casimir Carbonnier»), la foto de archivo como «Museo Fangio (de archivo)» y las ilustraciones tal cual. Sin punto final.
 */
export function creditoParaTexto(credito) {
  const t = limpiar(credito).replace(/[.\s]+$/, '');
  if (!t || ES_ILUSTRACION.test(t)) return t;
  const archivo = t.match(/^foto de archivo\b\s*:?\s*(.*)$/i);
  if (archivo) return archivo[1] ? `${archivo[1]} (de archivo)` : 'de archivo';
  return t.replace(/^(fotos?|fotograf[ií]as?|im[aá]gen(?:es)?)\s*:\s*/i, '').replace(/^foto de\s+/i, '').trim();
}

/**
 * Los créditos de las fotos de una pieza, sin repetir y sin la palabra «Foto:» delante (`creditoParaTexto`). El crédito de una foto NUNCA va dentro del video: va en el texto del posteo (`textoDePieza`).
 * Si el kit 3.0 dibujó la pieza, `pieza.creditosDeFotos` trae los de las fotos que usó (incluida la de Wikimedia Commons de la efeméride); si no, los de las fotos de las escenas (o de las láminas de un carrusel).
 */
export function creditosDeLasFotos(pieza) {
  const crudos = Array.isArray(pieza?.creditosDeFotos) ? pieza.creditosDeFotos
    : [...(pieza?.escenas ?? []).map((e) => e?.datos?.foto?.credito), ...(pieza?.laminas ?? []).map((l) => l?.datos?.foto?.credito)];
  const vistos = new Set();
  const salida = [];
  for (const c of crudos.map(creditoParaTexto).filter(Boolean)) {
    const clave = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (!vistos.has(clave)) { vistos.add(clave); salida.push(c); }
  }
  return salida;
}

/** La línea del crédito: «Foto: X», «Fotos: X · Y» (y, si hay, «· Ilustración generada con IA»). '' si no hay créditos. */
export function lineaDeCreditos(creditos) {
  const fotos = (creditos ?? []).filter((c) => c && !ES_ILUSTRACION.test(c));
  const ilustraciones = (creditos ?? []).filter((c) => c && ES_ILUSTRACION.test(c));
  return [fotos.length ? `${fotos.length === 1 ? 'Foto' : 'Fotos'}: ${fotos.join(' · ')}` : '', ...ilustraciones].filter(Boolean).join(' · ');
}

/** Las primeras oraciones del guion hasta `max` caracteres (sin cortar una oración a la mitad; si la primera sola no entra, se corta en una palabra). */
export function resumenDelGuion(guion, max = 260) {
  const frases = limpiar(guion).match(/.+?(?:[.!?](?=\s|$)|$)/g)?.map((f) => f.trim()).filter(Boolean) ?? [];
  let salida = '';
  for (const f of frases) { if (`${salida} ${f}`.trim().length > max) break; salida = `${salida} ${f}`.trim(); }
  if (salida) return salida;
  const corte = limpiar(guion).slice(0, max - 1);
  return `${corte.slice(0, Math.max(corte.lastIndexOf(' '), 1)).replace(/[,;:\s.]+$/, '')}…`;
}

/** ¿Dos palabras son la misma sin la «s» final (farmacia / farmacias)? */
const normal = (p) => String(p).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ]+/g, '').replace(/s$/, '');

/** Saca del principio del cuerpo el nombre de la pieza si el guion lo vuelve a decir («Farmacias de turno hoy: Galindo…» bajo el título «Farmacia de turno»). Con `hoy` y el signo que lo sigue. */
export function sinElNombre(cuerpo, nombre) {
  const c = limpiar(cuerpo);
  const n = limpiar(nombre).split(' ').map(normal).filter(Boolean);
  const p = c.split(' ');
  if (!n.length || p.length <= n.length || !n.every((w, i) => normal(p[i]) === w)) return c;
  let resto = p.slice(n.length);
  const ultimo = p[n.length - 1];
  if (!/[:.,]$/.test(ultimo) && normal(resto[0]) === 'hoy') resto = resto.slice(1); // «… turno hoy: …»
  const sinSigno = resto.join(' ').replace(/^[:.,;\s]+/, '').replace(/^hoy[:.,]\s*/i, '');
  return sinSigno ? sinSigno[0].toUpperCase() + sinSigno.slice(1) : '';
}

/** Si la primera oración del cuerpo es el titular dicho en voz alta (el guion lo acorta: «…sala de primeros»), se saca: el título del posteo ya lo trae entero. */
export function sinTitularDicho(cuerpo, nombre) {
  const frases = limpiar(cuerpo).match(/.+?(?:[.!?](?=\s|$)|$)/g)?.map((f) => f.trim()).filter(Boolean) ?? [];
  const palabras = (t) => limpiar(t).split(' ').map(normal).filter((w) => w.length >= 3);
  const delNombre = new Set(palabras(nombre));
  const primera = palabras(frases[0]);
  return frases.length > 1 && primera.length >= 3 && primera.every((w) => delNombre.has(w)) ? frases.slice(1).join(' ') : limpiar(cuerpo);
}

/**
 * El guion como se LEE (20/11/2026, revisar-textos.mjs): sin lo que sólo tiene sentido al oído («Radar Balcarce punto com», «arroba sweet candy bar»), sin la frase del auspicio (el posteo la
 * trae aparte, con la cuenta) y sin repetir el nombre de la pieza que ya es el título del posteo.
 */
export function guionEscrito(pieza, item) {
  const comercio = pieza?.auspicio?.comercio ? limpiar(pieza.auspicio.comercio).toLowerCase() : null;
  const frases = limpiar(pieza?.guion).match(/.+?(?:[.!?](?=\s|$)|$)/g)?.map((f) => f.trim()).filter(Boolean) ?? [];
  const leidas = frases.filter((f) => !/\bpunto com\b|\barroba\b/i.test(f) && !(comercio && f.toLowerCase().includes(comercio)));
  return sinTitularDicho(sinElNombre(leidas.join(' '), item?.nombre), item?.nombre);
}

/** Lo que se lee del guion en el texto del posteo: sus primeras oraciones enteras (hasta `max` caracteres), o '' si no queda nada. */
export function resumenEscrito(pieza, item, max = 260) {
  const g = guionEscrito(pieza, item);
  return g ? resumenDelGuion(g, max) : '';
}

/**
 * El texto del posteo. `item` es la entrada del plan ({ nombre, hashtag, arma, datos }), `pieza` la pieza armada. Facebook lleva el enlace del sitio; Instagram, «link en la bio»
 * (sus textos no abren enlaces). Siempre el aviso de la voz con IA, `#Balcarce #RadarBalcarce` y el tema.
 */
export function textoDePieza(pieza, item, red) {
  const lineas = [item.nombre, ''];
  // En Facebook y YouTube cada noticia del repaso lleva su enlace (Hernán, 5/11); Instagram no abre enlaces: ahí van sólo los títulos.
  if (item.arma === 'repaso') {
    for (const [i, n] of (item.datos.notas ?? []).slice(0, 3).entries()) {
      lineas.push(`${i + 1}. ${limpiar(n.titulo)}`);
      if (red !== 'instagram' && n.id) lineas.push(ponerOrigen(enlaceDeNota(n), { fuente: red === 'youtube' ? 'youtube' : 'facebook', campana: 'repaso', contenido: n.id }));
    }
  }
  // La nota propia: la bajada (el resumen del guion arrancaba con el mismo titular de la primera línea: se leía dos veces, 10/11).
  else if (item.arma === 'nota-propia' && item.datos?.nota?.bajada) lineas.push(limpiar(item.datos.nota.bajada));
  // «El número del día»: la nota de la que sale la cifra (el título) y la fuente de la cifra; la voz ya la dijo.
  else if (item.arma === 'numero-del-dia' && item.datos?.nota?.titulo) lineas.push(limpiar(item.datos.nota.titulo), ...(item.datos.numero?.principal?.fuente ? [`Fuente de la cifra: ${limpiar(item.datos.numero.principal.fuente)}.`] : []));
  // La pieza escrita a mano (guion literal): el texto del posteo también va escrito a mano, línea por línea.
  else if (item.arma === 'pieza-escrita' && item.datos?.texto?.length) lineas.push(...item.datos.texto.map(limpiar));
  else if (resumenEscrito(pieza, item)) lineas.push(resumenEscrito(pieza, item));
  // Las cuentas que se nombran en el texto (la persona de la nota y la nuestra), si se pidieron: «@fulano @radarbalcarce» (10/11, reel de Benjamín Luque Cuenca).
  if (item.datos?.menciones?.length) lineas.push('', item.datos.menciones.join(' '));
  if (pieza.auspicio) lineas.push('', `El clima de hoy lo auspicia ${pieza.auspicio.comercio}${pieza.auspicio.cuenta ? ` (${pieza.auspicio.cuenta})` : ''}.`);
  const servicio = SERVICIOS_CON_PAGINA[item.arma];
  // Si la pieza tiene su nota del día (la efeméride, el clima de mañana), el enlace va a la nota: el sitio acepta cualquier título delante del id y redirige a la dirección de siempre.
  const notaDelDia = notaDeLaPiezaEnLaWeb(item);
  if ((item.arma === 'nota-propia' || item.arma === 'pieza-escrita' || item.arma === 'numero-del-dia') && item.datos?.nota?.id) lineas.push('', red === 'instagram' ? 'La nota completa: link en la bio.' : `La nota completa: ${ponerOrigen(enlaceDeNota(item.datos.nota), { fuente: red === 'youtube' ? 'youtube' : 'facebook', campana: 'reel-nota', contenido: item.datos.nota.id })}`);
  else if (notaDelDia) lineas.push('', red === 'instagram' ? 'La nota completa: link en la bio.' : `La nota completa: ${ponerOrigen(notaDelDia, { fuente: red === 'youtube' ? 'youtube' : 'facebook', campana: 'nota', contenido: item.id ?? item.arma })}`);
  else if (red === 'instagram') lineas.push('', 'Todo en Radar Balcarce: link en la bio.');
  else if (servicio) lineas.push('', `${servicio.frase}: ${ponerOrigen(`${SITIO}${servicio.camino}`, { fuente: red === 'youtube' ? 'youtube' : 'facebook', campana: 'servicio', contenido: item.id ?? item.arma })}`);
  else lineas.push('', `Todo en ${DIRECCION_DEL_SITIO}`);
  const credito = lineaDeCreditos(creditosDeLasFotos(pieza));
  if (credito) lineas.push('', credito);
  if (pieza.aviso) lineas.push('', pieza.aviso || AVISO_DE_IA_TEXTO);
  lineas.push('', `${HASHTAGS_FIJOS} #${item.hashtag}`);
  return lineas.join('\n');
}

/** Lo que se publica de una pieza y dónde (reel e historia), con su texto. */
export function accionesConTexto(pieza, item) {
  return accionesDe(item).map((a) => ({ ...a, pie: a.tipo === 'REELS' ? textoDePieza(pieza, item, a.red) : '' }));
}

/**
 * El milisegundo del video que se usa de tapa en la grilla de reels. En el repaso es el cuadro de la lista pareja (la tapa del principio, medio segundo): la escena 0 del
 * repaso es la placa de la primera nota, y un cuadro de ahí sale con la lista a medio resaltar (el 5/11 el repaso de la tarde salió así en Facebook e Instagram). En el resto,
 * un cuadro quieto de la primera escena, nunca uno a medio animar (Hernán, 3/11).
 */
export function tapaDeLaPieza(pieza) {
  if (String(pieza?.id ?? '').startsWith('repaso')) return 250;
  return Math.round(Math.min(3, (pieza?.escenas?.[0]?.duracion ?? 2) * 0.7) * 1000);
}

/**
 * Publica cada acción con el cliente de Meta. Sigue aunque una falle (queda su error): lo que salió no se repite porque el resultado se anota apenas termina.
 * @returns {Promise<{ red, tipo, estado: 'ok'|'error', id?, error? }[]>}
 */
export async function publicarPieza({ cliente, mp4, acciones, tapaMs = null, tapa = null, sinToken = (t) => t }) {
  const salida = [];
  for (const a of acciones) {
    try {
      const metodo = a.red === 'instagram' ? cliente.publicarVideoEnInstagram : cliente.publicarVideoEnFacebook;
      const r = await metodo({ video: mp4, tipo: a.tipo, pie: a.pie, tapaMs, tapa });
      const hecha = { red: a.red, tipo: a.tipo, estado: 'ok', id: r?.id ?? null };
      // La dirección del reel (no la de las historias, que vencen): la nota la muestra («Mirá el video»). Si no se puede saber, sin dirección: nunca frena la publicación.
      if (a.tipo === 'REELS' && r?.id) {
        try {
          if (a.red === 'facebook') hecha.url = `https://www.facebook.com/reel/${r.id}`;
          else if (cliente.permalinkDeInstagram) hecha.url = (await cliente.permalinkDeInstagram(r.id)) || undefined;
        } catch { /* sin dirección */ }
      }
      salida.push(hecha);
    } catch (e) {
      salida.push({ red: a.red, tipo: a.tipo, estado: 'error', error: sinToken(String(e?.message ?? e)).slice(0, 300) });
    }
  }
  return salida;
}

/** En ensayo: lo mismo, sin llamar a nadie. */
export const simularPublicacion = (acciones) => acciones.map((a) => ({ red: a.red, tipo: a.tipo, estado: 'simulada' }));

// ------------------------------------------------------------------ Buffer: TikTok, YouTube Shorts y X

/**
 * El texto que se manda a Buffer para cada canal (el mismo reel de Facebook): TikTok, con «link en la bio» (hasta 5 hashtags); YouTube, con la dirección del sitio (en la descripción sí se
 * lee); X, el nombre de la pieza y lo que cuenta, más los hashtags, sin enlace (con enlace cuesta 13 veces más): `textoParaX` de redes/buffer.mjs lo corta a 270.
 */
export function textoParaBuffer(pieza, item, red) {
  if (red === 'tiktok') return textoDePieza(pieza, item, 'instagram');
  if (red === 'youtube') return textoDePieza(pieza, item, 'youtube');
  return textoParaXDePieza(pieza, item);
}

/** Hasta dónde llega un posteo de X en Buffer (redes/buffer.mjs, `LARGO_EN_X`; X acepta 280). */
const LARGO_X = 270;

/** Las oraciones enteras de `texto` que entran en `max`; si ni la primera entra, su forma completa más corta (titular.mjs), nunca con «…» (REGLAS § 22). */
function oracionesQueEntran(texto, max) {
  const frases = limpiar(texto).match(/.+?(?:[.!?](?=\s|$)|$)/g)?.map((f) => f.trim()).filter(Boolean) ?? [];
  let salida = '';
  for (const f of frases) { if (`${salida} ${f}`.trim().length > max) break; salida = `${salida} ${f}`.trim(); }
  return salida || (frases[0] ? tituloQueEntra(frases[0], max) : '');
}

/**
 * El texto de la pieza en X (por Buffer), ya armado para que entre en 270 sin cortar nada (20/11/2026, revisar-textos.mjs): el nombre y lo que cuenta, las cuentas que se nombran, el AVISO de la
 * voz con IA (el video habla: va siempre) y los hashtags. Primero se reserva lo que no se puede perder (aviso y hashtags) y con el lugar que queda se achica lo que cuenta, por oraciones enteras.
 * Si el cuerpo ya empieza con una palabra del nombre («Aviso de viento» / «Viento fuerte…») va solo, sin «Nombre: » delante.
 */
export function textoParaXDePieza(pieza, item) {
  const menciones = item.datos?.menciones?.length ? item.datos.menciones.join(' ') : '';
  const fijas = [menciones, pieza.aviso ? AVISO_DE_IA_TEXTO : '', `${HASHTAGS_FIJOS} #${item.hashtag}`].filter(Boolean);
  const lugar = LARGO_X - fijas.reduce((s, p) => s + p.length + 2, 0);
  const nombre = limpiar(item.nombre) || 'Radar Balcarce';
  let cabeza;
  if (item.arma === 'repaso') {
    const titulos = (item.datos.notas ?? []).slice(0, 3).map((n) => limpiar(n.titulo)).filter(Boolean);
    let cuenta = '';
    for (const t of titulos) { const prueba = cuenta ? `${cuenta} · ${t}` : t; if (`${nombre}: ${prueba}`.length > lugar) break; cuenta = prueba; }
    cabeza = cuenta ? `${nombre}: ${cuenta}` : `${nombre}${titulos[0] ? `: ${tituloQueEntra(titulos[0], Math.max(20, lugar - nombre.length - 2))}` : ''}`;
  } else {
    const cuerpo = guionEscrito(pieza, item);
    const repite = cuerpo.split(' ').slice(0, 3).some((w) => normal(w).length >= 4 && nombre.split(' ').some((n) => normal(n) === normal(w)));
    const conNombre = repite ? '' : `${nombre}: `;
    const titulo = nombre.length > lugar ? tituloQueEntra(nombre, lugar) : nombre;
    const cuenta = nombre.length > lugar || lugar - conNombre.length < 25 ? '' : oracionesQueEntran(cuerpo, lugar - conNombre.length); // si el nombre casi llena el lugar, va solo
    cabeza = cuenta ? `${conNombre}${cuenta}` : titulo;
  }
  return [cabeza, ...fijas].join('\n\n');
}

/** El título del Short de YouTube: el nombre de la pieza, entero o en su forma completa más corta que entre en 100 (sin «…», REGLAS § 22). */
export const tituloDeYoutube = (item) => tituloQueEntra(limpiar(item?.nombre) || 'Radar Balcarce', 100);

/** Lo que se hace en Buffer de una pieza: una acción por canal. */
export const accionesDeBuffer = (item) => (item.buffer ?? []).map((red) => ({ red, tipo: 'VIDEO' }));

/**
 * Sube el mp4 al depósito público del render y se lo pasa a Buffer, que pide una dirección pública (no recibe el archivo). `subirVideo(archivo, { huella, nombre })` devuelve la dirección;
 * `publicarEnBuffer({ url, texto, titulo, redes })` es `publicarReel` de redes/buffer.mjs (devuelve { [canal]: { ok, id?, motivo? } }, sin tirar). Sigue aunque un canal falle.
 * @returns {Promise<{ red, tipo, estado: 'ok'|'error', id?, error? }[]>}
 */
export async function publicarPorBuffer({ pieza, item, mp4, huella, duracion = null, subirVideo, publicarEnBuffer, sinSecreto = (t) => t }) {
  const todas = (item.buffer ?? []);
  if (!todas.length) return [];
  // Un Short dura hasta 60 s: si el video es más largo, YouTube queda afuera (anotado como «omitida», no cuenta para el tope del día) y los demás canales salen igual.
  const largo = duracion != null && duracion > MAXIMO_DE_UN_SHORT_SEG;
  const redes = largo ? todas.filter((r) => r !== 'youtube') : todas;
  const omitidas = largo && todas.includes('youtube') ? [{ red: 'youtube', tipo: 'VIDEO', estado: 'omitida', error: `dura ${Math.round(duracion)} s: un Short no pasa de 60 s` }] : [];
  if (!redes.length) return omitidas;
  let url;
  try { url = await subirVideo(mp4, { huella, nombre: `${item.id}.mp4` }); } catch (e) {
    return [...redes.map((red) => ({ red, tipo: 'VIDEO', estado: 'error', error: sinSecreto(`no se pudo subir el video para Buffer: ${String(e?.message ?? e)}`).slice(0, 300) })), ...omitidas];
  }
  const salida = [...omitidas];
  for (const red of redes) {
    const r = (await publicarEnBuffer({ url, texto: textoParaBuffer(pieza, item, red), titulo: tituloDeYoutube(item), redes: [red] }))[red]
      ?? { ok: false, motivo: 'Buffer no contestó por ese canal' };
    salida.push(r.ok ? { red, tipo: 'VIDEO', estado: 'ok', id: r.id ?? null } : { red, tipo: 'VIDEO', estado: 'error', error: sinSecreto(String(r.motivo ?? 'sin detalle')).slice(0, 300) });
  }
  return salida;
}

/** En ensayo: lo mismo, sin subir ni llamar a nadie. */
export const simularBuffer = (item) => accionesDeBuffer(item).map((a) => ({ ...a, estado: 'simulada' }));

// ------------------------------------------------------------------ carruseles (varias imágenes 4:5): álbum en Facebook y carrusel en Instagram

/** Instagram acepta hasta 2.200 caracteres en el texto de un posteo. */
const MAXIMO_DEL_PIE = 2200;

/**
 * El texto de un carrusel. Sin el aviso de voz con IA (no habla). Facebook lleva el enlace con su origen (`campana: carrusel`); Instagram, «link en la bio».
 *   La semana: nombre, las notas numeradas y el sitio. El finde: nombre, las actividades y el sitio. La nota propia: su título, «Más fotos en la nota» y el enlace a la nota.
 * Siempre `#Balcarce #RadarBalcarce` y el tema.
 */
export function textoDeCarrusel(pieza, item, red) {
  const lineas = [item.nombre, ''];
  if (item.arma === 'carrusel-semana') {
    for (const [i, n] of (item.datos?.notas ?? []).entries()) lineas.push(`${i + 1}. ${limpiar(n.titulo)}`);
  } else if (item.arma === 'carrusel-finde') {
    const eventos = (pieza.laminas ?? []).filter((l) => l.tipo === 'lamina-eventos').flatMap((l) => l.datos.eventos ?? []);
    for (const e of eventos) lineas.push(`• ${limpiar(e.cuando)} · ${limpiar(e.nombre)}${e.lugar ? ` (${limpiar(e.lugar)})` : ''}`);
  } else if (item.arma === 'carrusel-nota') {
    lineas.push('Todas las fotos, en el carrusel.');
  }
  // Las cuentas que se nombran (la persona de la nota y la nuestra), si se pidieron.
  if (item.datos?.menciones?.length) lineas.push('', item.datos.menciones.join(' '));
  lineas.push('');
  if (red === 'instagram') lineas.push(item.arma === 'carrusel-nota' ? 'La nota completa: link en la bio.' : 'Todo en Radar Balcarce: link en la bio.');
  else {
    const destino = item.arma === 'carrusel-nota' && item.datos?.nota?.id ? enlaceDeNota(item.datos.nota) : SITIO;
    lineas.push(`${item.arma === 'carrusel-nota' ? 'La nota completa' : 'Todo en radarbalcarce.com'}: ${ponerOrigen(destino, { fuente: 'facebook', campana: 'carrusel', contenido: item.id })}`);
  }
  const credito = lineaDeCreditos(creditosDeLasFotos(pieza));
  if (credito) lineas.push('', credito);
  lineas.push('', `${HASHTAGS_FIJOS} #${item.hashtag}`);
  return lineas.join('\n').slice(0, MAXIMO_DEL_PIE);
}

/** Lo que se publica de un carrusel y dónde (Instagram: carrusel; Facebook: álbum), con su texto. */
export const accionesDeCarrusel = (pieza, item) => accionesDe(item).map((a) => ({ ...a, pie: textoDeCarrusel(pieza, item, a.red) }));

/**
 * El nombre del archivo de una lámina en el depósito de placas: `<prefijo>-<8 letras de la huella de la imagen>.jpg`. Es el formato que sirve el Worker en /placa/<nombre> (el prefijo, de 1 a 40
 * letras, números, guion y guion bajo). Una lámina distinta es otro nombre, y la misma imagen, el mismo.
 */
export function nombreDeLamina(prefijo, bytes) {
  const huella = createHash('sha256').update(bytes).digest('hex').slice(0, 8);
  const limpio = String(prefijo).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40) || 'lamina';
  return `${limpio}-${huella}.jpg`;
}

/**
 * Publica un carrusel con el cliente de Meta: `urls` son las direcciones públicas de las láminas, en orden. Sigue aunque una red falle (queda su error). Instagram admite 10 como mucho:
 * si hay más, publica las primeras 10.
 * @returns {Promise<{ red, tipo, estado: 'ok'|'error', id?, error? }[]>}
 */
export async function publicarCarrusel({ cliente, urls, acciones, sinToken = (t) => t }) {
  const salida = [];
  for (const a of acciones) {
    try {
      const r = a.red === 'instagram'
        ? await cliente.publicarCarruselEnInstagram({ imagenesUrl: urls.slice(0, 10), pie: a.pie })
        : await cliente.publicarAlbumEnFacebook({ imagenesUrl: urls, mensaje: a.pie });
      salida.push({ red: a.red, tipo: a.tipo, estado: 'ok', id: r?.id ?? null });
    } catch (e) {
      salida.push({ red: a.red, tipo: a.tipo, estado: 'error', error: sinToken(String(e?.message ?? e)).slice(0, 300) });
    }
  }
  return salida;
}
