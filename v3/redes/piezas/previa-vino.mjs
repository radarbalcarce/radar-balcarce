// Los tres reels de «Balcarce, el nuevo origen del vino» (sábado 14/11/2026): viñedos, vinotecas y gastronomía. Guiones escritos a mano, en frases cortas y completas (las direcciones
// no se cortan), con los datos oficiales del posteo de Producción y Empleo (@produccionyempleo.balcarce). Las cuentas NO se nombran ni se muestran en el video (van en el posteo y en la nota).
// Imágenes (Hernán, 13/11: «en los reels hay placas, eso no tiene que pasar, tiene que ser todo fotos»): TODAS las escenas llevan foto, ninguna repetida en un reel (4 o 5 imágenes distintas), con el crédito
// «Foto: Instagram de cada lugar». Qué foto va en cada escena se cambia en la tabla FOTOS_ELEGIDAS de acá abajo (la primera cosa del archivo). Si falta una foto, el programa FALLA con un mensaje claro: nunca cae a placa.
// Guiones de 20 a 28 s: entrada (una frase), un lugar por escena (nombre y dirección corta en la voz; la línea de vino y el horario, sólo en pantalla) y un cierre breve.
// Usa el mismo camino que la previa de una nota (`correr.mjs`, pieza `pieza-escrita`): ensayo por defecto, NO publica nada.
//
//   node v3/redes/piezas/previa-vino.mjs                   los tres, MUDOS (sin clave: no gasta voz ni IA), en salida-vino/ (o SALIDA_PIEZAS)
//   VOZ=si GEMINI_API_KEY_REDES_V3=… node …                con voz (un audio por reel, la locutora; la voz se guarda en la memoria: si se publica, suena igual)
//   PUBLICAR=si NOTA_URL=https://radarbalcarce.com/nota/… node …   PUBLICA DE VERDAD (reel e historia en Facebook e Instagram; TikTok, YouTube y X por Buffer). Sólo con el OK de una persona y la nota ya publicada.
//   PIEZAS=vinedos,vinotecas,gastronomia                   cuáles (por defecto las tres; de a uno si la PC tira «memory allocation failed»)
//   MENCIONES=-                                            sin cuentas en el texto del posteo (por defecto, las de cada reel; ver `REELS`)
//   FOTOS_VINO=ruta                                        otra carpeta de fotos (por defecto salida-vino/fotos; las de salida-vino/fotos-extra, al lado, también se leen)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { correr, dependenciasReales } from './correr.mjs';

/**
 * LA TABLA DE FOTOS: qué foto lleva cada escena de cada reel, en el orden de `escenas` de `REELS` (entrada, un lugar por escena, cierre). Cada una es `<cuenta>/<archivo>`, sin la carpeta: se busca en
 * salida-vino/fotos/ y en salida-vino/fotos-extra/ (fotoN.jpg son las de la hoja de cada lugar; candN.jpg, las candidatas de fotos-extra). Para cambiar una foto, se cambia el nombre acá y listo.
 * Reglas: ninguna repetida dentro de un reel, ninguna foto con texto ni flyers, nunca la botella negra Hidden Sea (`FOTOS_PROHIBIDAS_SHA1`). Si un nombre no existe, el programa falla y lo dice.
 * Dónde falta foto buena hoy (13/11): casaquinta.resto (una sola: la mesa del salón), vinedolospinos (sólo 2 lindas, las de fotos-extra), talouvinoteca137 y thewinesco (sin foto del local con gente
 * ni de la fachada); llegan fotos nuevas y se reemplazan acá.
 */
export const FOTOS_ELEGIDAS = Object.freeze({
  thewinesco: [
    'thewinesco-dm/foto7.jpg', //      entrada: las tres botellas Bravento con copas en la barra
    'thewinesco-dm/foto2.jpg', //      el local, con la estantería y las cajas de madera
    'thewinesco-dm/foto8.jpg', //      degustación: las tres botellas, plano abierto
    'thewinesco-dm/foto4.jpg', //      dirección: la estantería del local
    'thewinesco-dm/foto6.jpg', //      cierre: la barra con las botellas y las copas
  ],
  vinedos: [
    'vinedos.balcarce/foto3.jpg', //   entrada: la copa de tinto contra el cielo y las sierras
    'vinedos.balcarce/cand1.jpg', //   Bodegas y Viñedos Balcarce: la fachada de la bodega, con luz de tarde
    'vinedolospinos/cand1.jpg', //     Viñedo Los Pinos: hileras de viñedo con lavanda y cerros
    'vinedolospinos/cand2.jpg', //     cierre: el viñedo al atardecer con la meseta del cerro
  ],
  vinotecas: [
    'vinedos.balcarce/foto1.jpg', //   entrada: la botella de Séptimo Chukker sobre barricas
    'thewinesco/foto1.jpg', //         The Wines Co.: la botella Pyros Malbec con su caja de madera
    'talouvinoteca137/foto1.jpg', //   Talou Vinoteca: la estantería y el mostrador del local
    'almacendevinos1980/foto1.jpg', // 1980 Almacén de Vinos: copa y botella «On the Road»
    'almacendevinos1980/foto2.jpg', // cierre: el cartel «1980 Almacén de Vinos» en el portón
  ],
  gastronomia: [
    'cavas_restaurante/foto2.jpg', //  entrada: boquerones sobre focaccia, con botella y copa
    'cavas_restaurante/foto1.jpg', //  Cavas Vinos & Resto: la trucha con puré, copa y botella de tinto
    'parrillabodegonlostroncos/foto2.jpg', // Parrilla Bodegón Los Troncos: la parrillita con carnes y el estante de vinos
    'casaquinta.resto/foto1.jpg', //   Casa Quinta: la mesa servida del salón
    'parrillabodegonlostroncos/foto1.jpg', // cierre: el brownie con helado y frutos rojos
  ],
});

export const SECCION = 'Balcarce';
export const ROTULO = 'El nuevo origen del vino';
export const FIRMA = 'Hernán Accomo';
export const TITULO_DE_LA_NOTA = 'Balcarce, el nuevo origen del vino';
export const CIERRE = 'El programa completo, en Radar Balcarce punto com.';
export const CREDITO_DE_LAS_FOTOS = 'Foto: Instagram de cada lugar';

/**
 * Los reels. `escenas`: lo que se VE (titulo) y lo que se DICE (voz), una frase entera por escena. Números y direcciones van en palabras en la voz (la voz no lee «832» ni «hs»); `subtitulo` es lo
 * que se lee en pantalla, con dígitos (si falta, se lee la voz). `lugar`: la cuenta del lugar de la escena (sólo informa; la foto va en `FOTOS_ELEGIDAS`).
 * `texto`: las líneas del posteo (la nota completa, el aviso de la voz con IA y los hashtags los suma `textoDePieza`). `menciones`: cuentas del posteo (sólo en el texto; el video no las nombra).
 */
/** Crédito del programa, como el posteo oficial: Turismo y Producción y Empleo (la programación) y el Municipio. */
const MUNICIPALES = Object.freeze(['@turismobalcarce', '@produccionyempleo.balcarce', '@balcarcemunicipio']);

/**
 * El cierre de cada reel: la fecha como titular (una sola idea) y la dirección del programa en la voz y en el subtítulo (no se repite en el titular). Con foto, como todas (la de `FOTOS_ELEGIDAS`).
 * `pedido`: lo que se agrega antes de la dirección («Consultá y reservá en cada lugar.»: sólo viñedos y gastronomía, una vez).
 */
const CIERRE_DE = (pedido = '') => ({
  titulo: 'radarbalcarce.com',
  voz: `${pedido ? `${pedido} ` : ''}${CIERRE}`,
  subtitulo: `${pedido ? `${pedido} ` : ''}El programa completo, en Radar Balcarce punto com.`,
});

export const REELS = Object.freeze({
  thewinesco: {
    id: 'vino-thewinesco',
    clave: 'thewinesco',
    nombre: 'The Wines Co. se suma a «Balcarce, el nuevo origen del vino»',
    hashtag: 'Vino',
    credito: 'Foto: The Wines Co.',
    escenas: [
      { titulo: 'The Wines Co.', voz: 'The Wines Co. se suma a Balcarce, el nuevo origen del vino.', subtitulo: 'The Wines Co. se suma a Balcarce, el nuevo origen del vino.' },
      { titulo: 'Vinos de acá', voz: 'Quieren dar a conocer los vinos que se producen en Balcarce.', subtitulo: 'Quieren dar a conocer los vinos que se producen en Balcarce.' },
      { titulo: 'Degustación sin cargo', voz: 'Este sábado, de cuatro a nueve de la noche, degustación sin cargo de la línea Bravento.', subtitulo: 'Este sábado, de 4 a 9 de la noche, degustación sin cargo de la línea Bravento.' },
      { titulo: 'Av. Kelly 832', voz: 'En avenida Kelly al ochocientos treinta y dos.', subtitulo: 'En avenida Kelly al 832.' },
      { titulo: 'radarbalcarce.com', voz: 'Leé la nota completa, en Radar Balcarce punto com.', subtitulo: 'Leé la nota completa, en Radar Balcarce punto com.' },
    ],
    texto: [
      'The Wines Co. (@thewinesco) se suma a «Balcarce, el nuevo origen del vino»: «Nos entusiasma acercar los vinos de Balcarce a nuestros clientes y que más personas puedan descubrirlos».',
      'Este sábado 14 de noviembre, de 16 a 21 hs, en Av. Kelly N° 832: degustación sin cargo de la línea Bravento.',
    ],
    menciones: ['@thewinesco'],
  },
  vinedos: {
    id: 'vino-vinedos',
    clave: 'vinedos',
    nombre: 'Balcarce, el nuevo origen del vino: los viñedos abren sus puertas',
    hashtag: 'Vino',
    escenas: [
      { titulo: 'Sábado 14 de noviembre', voz: 'Este sábado catorce, los viñedos de Balcarce te abren sus puertas, sin costo.', subtitulo: 'Este sábado 14, los viñedos de Balcarce te abren sus puertas, sin costo.' },
      { titulo: 'Bodegas y Viñedos Balcarce', lugar: 'vinedos.balcarce', voz: 'Bodegas y Viñedos Balcarce, de cuatro a seis de la tarde.', subtitulo: 'Bodegas y Viñedos Balcarce, de 4 a 6 de la tarde.' },
      { titulo: 'Viñedo Los Pinos', lugar: 'vinedolospinos', voz: 'Viñedo Los Pinos, de cuatro a cinco y media de la tarde.', subtitulo: 'Viñedo Los Pinos, de 4 a 5 y media de la tarde.' },
      CIERRE_DE('Consultá y reservá en cada lugar.'),
    ],
    texto: [
      '¡Los viñedos de Balcarce te esperan! Este sábado 14 de noviembre, viñedos locales abren sus puertas: sin costo, en grupos guiados y con capacidad limitada.',
      'Bodegas y Viñedos Balcarce (@vinedos.balcarce): de 16 a 18 hs, visitas abiertas al público.',
      'Viñedo Los Pinos (@vinedolospinos): de 15 a 16 hs, abierto a residentes de Los Pinos; de 16 a 17:30 hs, visitas abiertas al público.',
      'Para anotarte o consultar, entrá al Instagram de los viñedos.',
    ],
    menciones: ['@vinedos.balcarce', '@vinedolospinos', ...MUNICIPALES],
  },
  vinotecas: {
    id: 'vino-vinotecas',
    clave: 'vinotecas',
    nombre: 'Balcarce se copa: degustaciones sin cargo en tres vinotecas',
    hashtag: 'Vino',
    escenas: [
      { titulo: 'Sábado 14 de noviembre', voz: 'Este sábado catorce, Balcarce se copa: degustaciones sin cargo.', subtitulo: 'Este sábado 14, Balcarce se copa: degustaciones sin cargo.' },
      { titulo: 'The Wines Co.', lugar: 'thewinesco', voz: 'The Wines Co., en avenida Kelly al ochocientos treinta y dos.', subtitulo: 'The Wines Co., en avenida Kelly al 832.' },
      { titulo: 'Talou Vinoteca', lugar: 'talouvinoteca137', voz: 'Talou Vinoteca, en calle veintidós al seiscientos cuarenta y tres.', subtitulo: 'Talou Vinoteca, en calle 22 al 643.' },
      { titulo: '1980 Almacén de Vinos', lugar: 'almacendevinos1980', voz: 'Mil novecientos ochenta Almacén de Vinos, en calle veintiséis al ochocientos veintiocho.', subtitulo: '1980 Almacén de Vinos, en calle 26 al 828.' },
      CIERRE_DE(),
    ],
    texto: [
      '«Balcarce se copa»: este sábado 14 de noviembre, de 16 a 21 hs, degustaciones sin cargo en tres vinotecas. ¡Descubrí el sabor de nuestros suelos!',
      'The Wines Co. (@thewinesco), Av. Kelly N° 832: líneas Bravento y Séptimo Chukker.',
      'Talou Vinoteca (@talouvinoteca137), calle 22 N° 643: línea Bravento de Bodega Puerta Abra.',
      '1980 Almacén de Vinos (@almacendevinos1980), calle 26 N° 828: líneas Bravento, de Bodega Puerta Abra, y Séptimo Chukker, de Viñedos y Bodegas Balcarce.',
    ],
    menciones: ['@thewinesco', '@talouvinoteca137', '@almacendevinos1980', ...MUNICIPALES],
  },
  gastronomia: {
    id: 'vino-gastronomia',
    clave: 'gastronomia',
    nombre: 'Cenar con vinos locales: la propuesta gastronómica del sábado',
    hashtag: 'Vino',
    escenas: [
      { titulo: 'Sábado 14 de noviembre', voz: 'Este sábado, desde las nueve, cenás con vinos de acá.', subtitulo: 'Este sábado, desde las 9, cenás con vinos de acá.' },
      { titulo: 'Cavas Vinos & Resto', lugar: 'cavas_restaurante', voz: 'Cavas Vinos y Resto, calle veintisiete al ochocientos ochenta y seis.', subtitulo: 'Cavas Vinos y Resto, calle 27 al 886.' },
      { titulo: 'Parrilla Bodegón Los Troncos', lugar: 'parrillabodegonlostroncos', voz: 'Parrilla Bodegón Los Troncos, avenida Central al seiscientos veintiséis.', subtitulo: 'Parrilla Bodegón Los Troncos, avenida Central al 626.' },
      { titulo: 'Casa Quinta, cocina de autor', lugar: 'casaquinta.resto', voz: 'Casa Quinta, calle cincuenta y nueve al novecientos cincuenta.', subtitulo: 'Casa Quinta, calle 59 al 950.' },
      CIERRE_DE('Consultá y reservá en cada lugar.'),
    ],
    texto: [
      'Este sábado 14 de noviembre, desde las 21 hs, propuestas gastronómicas con vinos locales. ¡Conocé el maridaje perfecto de los vinos balcarceños!',
      'Cavas Vinos & Resto (@cavas_restaurante), calle 27 N° 886: copa de bienvenida con la línea Bravento de Bodega Puerta Abra.',
      'Parrilla Bodegón Los Troncos (@parrillabodegonlostroncos), Av. Central N° 626: degustación de la línea Séptimo Chukker de Viñedos y Bodegas Balcarce.',
      'Casa Quinta cocina de autor (@casaquinta.resto), calle 59 N° 950: copa y maridaje con la línea Bravento de Bodega Puerta Abra.',
      'Consultá y reservá en cada lugar. Es parte de «Balcarce, el nuevo origen del vino».',
    ],
    menciones: ['@cavas_restaurante', '@parrillabodegonlostroncos', '@casaquinta.resto', ...MUNICIPALES],
  },
});

const normalizar = (s) => String(s).toLowerCase().replace(/^@/, '');

/** Fotos que no se usan en ningún lado (por contenido, no por nombre: si la reemplazan por otra, la nueva pasa). Hernán, 13/11: la botella negra de Hidden Sea, de The Wines Co. */
export const FOTOS_PROHIBIDAS_SHA1 = Object.freeze(['9215533c2b585cc1d1a751a19f421701bcc5fb87']);
const sha1 = (ruta) => crypto.createHash('sha1').update(fs.readFileSync(ruta)).digest('hex');

/**
 * Las fotos que hay en cada carpeta (salida-vino/fotos y salida-vino/fotos-extra): { '<cuenta sin arroba>/<archivo>': ruta completa }, sin las prohibidas, sin los logos (`logo.*`) ni las hojas de contactos
 * (`hoja.*`). Una carpeta que no existe no suma nada. Si no hay ninguna, el programa de armado falla al pedir las escenas (no hay placas de relleno).
 */
export function fotosDeVino(...carpetas) {
  const r = {};
  for (const carpeta of carpetas.flat().filter(Boolean)) {
    if (!fs.existsSync(carpeta)) continue;
    for (const d of fs.readdirSync(carpeta, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      for (const f of fs.readdirSync(path.join(carpeta, d.name))) {
        if (!/\.(jpe?g|png|webp)$/i.test(f) || /^(logo|hoja)\./i.test(f)) continue;
        const ruta = path.resolve(carpeta, d.name, f);
        if (!FOTOS_PROHIBIDAS_SHA1.includes(sha1(ruta))) r[`${normalizar(d.name)}/${f.toLowerCase()}`] = ruta;
      }
    }
  }
  return r;
}

/**
 * Las escenas de un reel con su foto, todas: la de cada escena es la de `FOTOS_ELEGIDAS[clave]` en su lugar de la lista, ninguna repetida. NUNCA cae a placa: si la tabla no cubre una escena, repite una
 * foto o nombra una que no está en `fotos`, tira un error que dice cuál escena y qué foto falta.
 */
export function escenasConFotos(reel, fotos = {}, elegidas = FOTOS_ELEGIDAS[reel.clave]) {
  if (!elegidas || elegidas.length !== reel.escenas.length) throw new Error(`reel «${reel.id}»: la tabla FOTOS_ELEGIDAS tiene ${elegidas?.length ?? 0} fotos y el reel tiene ${reel.escenas.length} escenas: todas llevan foto`);
  const repetidas = elegidas.filter((f, i) => elegidas.indexOf(f) !== i);
  if (repetidas.length) throw new Error(`reel «${reel.id}»: foto repetida en la tabla (${[...new Set(repetidas)].join(', ')}): ningún reel repite imagen`);
  const faltan = [];
  const escenas = reel.escenas.map(({ lugar, ...e }, i) => {
    const ruta = fotos[normalizar(elegidas[i])];
    if (!ruta) faltan.push(`escena ${i + 1} («${e.titulo}»): falta ${elegidas[i]}`);
    return { ...e, foto: { ruta, credito: reel.credito ?? CREDITO_DE_LAS_FOTOS } };
  });
  if (faltan.length) throw new Error(`reel «${reel.id}»: faltan fotos y no se arma con placas. ${faltan.join('; ')}. Ponelas en salida-vino/fotos o fotos-extra (o cambiá la tabla FOTOS_ELEGIDAS de previa-vino.mjs).`);
  return escenas;
}

/** La nota publicada de la que cuelga el enlace (id y slug de su dirección). Sin dirección (sólo previa): una provisoria, que nunca se publica. */
export function notaDeLaDireccion(url) {
  const limpia = String(url ?? '').trim().split('?')[0].split('#')[0];
  if (!limpia) return { id: 'vino', slug: 'balcarce-el-nuevo-origen-del-vino', titulo: TITULO_DE_LA_NOTA, provisoria: true };
  const ultimo = limpia.replace(/\/$/, '').split('/').pop();
  const id = ultimo.split('-').pop();
  const slug = ultimo.slice(0, -(id.length + 1));
  if (!/\/nota\//.test(limpia) || !id || !slug) throw new Error('NOTA_URL no parece la dirección de una nota (https://radarbalcarce.com/nota/…)');
  return { id, slug, titulo: TITULO_DE_LA_NOTA, provisoria: false };
}

/** Las entradas del plan de ensayo: una por reel, con su guion escrito y su texto. `publicar`: suma los canales de Buffer. `fotos`: lo que devuelve `fotosDeVino` (el programa siempre la pasa: si falta una foto, falla). Sin `fotos` (undefined), sólo el guion sin imágenes: es para las pruebas de texto, nunca se publica. */
export function itemsDelVino({ piezas = Object.keys(REELS), nota, publicar = false, menciones = null, fotos } = {}) {
  return piezas.map((clave, fila) => {
    const r = REELS[clave];
    if (!r) throw new Error(`no conozco la pieza «${clave}» (hay: ${Object.keys(REELS).join(', ')})`);
    return {
      fila,
      id: r.id,
      nombre: r.nombre,
      arma: 'pieza-escrita',
      variante: null,
      momento: null,
      formato: 'reel',
      hora: '08:00',
      horaDelDia: 8,
      bloque: 'manana',
      saluda: false,
      buffer: publicar ? ['tiktok', 'youtube', 'x'] : [],
      voz: 1,
      hashtag: r.hashtag,
      primeraDelBloque: false,
      datos: {
        pieza: { id: r.id, rotulo: ROTULO, seccion: SECCION, firma: FIRMA, notaId: nota.id, escenas: fotos === undefined ? r.escenas.map(({ lugar, ...e }) => e) : escenasConFotos(r, fotos) },
        texto: menciones && !menciones.length ? r.texto.map((l) => l.replace(/ \(@[^)]+\)/g, '')) : r.texto, // MENCIONES=-: sin las cuentas entre paréntesis
        nota,
        menciones: menciones ?? r.menciones,
      },
    };
  });
}

const esElPrograma = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (esElPrograma) {
  const env = process.env;
  const publicar = /^s[ií]$/i.test(String(env.PUBLICAR ?? '').trim());
  const conVoz = publicar || /^s[ií]$/i.test(String(env.VOZ ?? '').trim());
  const nota = notaDeLaDireccion(env.NOTA_URL);
  if (publicar) {
    if (nota.provisoria) throw new Error('PUBLICAR=si necesita NOTA_URL: la nota «Balcarce, el nuevo origen del vino» tiene que estar publicada');
    const r = await fetch(env.NOTA_URL, { headers: { 'user-agent': 'RadarBalcarce-previa' } });
    if (!r.ok) throw new Error(`la nota respondió ${r.status}: no se publica nada`);
    if (!/origen del vino/i.test(await r.text())) throw new Error('esa página no es la nota «Balcarce, el nuevo origen del vino»: no se publica nada');
  }
  const piezas = String(env.PIEZAS ?? '').split(/[\s,]+/).filter(Boolean);
  const mencionesPedidas = String(env.MENCIONES ?? '').trim();
  const menciones = mencionesPedidas === '-' ? [] : mencionesPedidas ? mencionesPedidas.split(/[\s,]+/).filter(Boolean).map((m) => (m.startsWith('@') ? m : `@${m}`)) : null;
  const carpetaDeFotos = String(env.FOTOS_VINO ?? '').trim();
  if (carpetaDeFotos === '-') throw new Error('FOTOS_VINO=- ya no existe: los reels llevan fotos en todas las escenas, sin placas');
  const carpetaBase = path.resolve(carpetaDeFotos || path.join(env.SALIDA_PIEZAS || 'salida-vino', 'fotos'));
  const soloVoz = /^s[ií]$/i.test(String(env.SOLO_VOZ ?? '').trim()); // SOLO_VOZ=si: en la nube, sin fotos, para generar la voz y bajarla; nunca publica
  if (soloVoz && publicar) throw new Error('SOLO_VOZ no se combina con PUBLICAR');
  const fotos = soloVoz ? undefined : fotosDeVino(carpetaBase, path.join(path.dirname(carpetaBase), 'fotos-extra'));
  console.log(`fotos disponibles: ${fotos ? Object.keys(fotos).length : 'ninguna (SOLO_VOZ)'}`);
  const items = itemsDelVino({ piezas: piezas.length ? piezas : undefined, nota, publicar, menciones, fotos });
  const plan = { dia: new Date().toISOString().slice(0, 10), activas: publicar, vozTope: 10, vozQuedan: 10, piezas: items, descartes: [] };
  const fetchFn = async (u) => ({ ok: true, status: 200, json: async () => (String(u).endsWith('/piezas/plan') ? plan : { ok: true }), text: async () => '{}' });
  // Sin VOZ=si (y sin publicar) la clave no entra al programa: salen mudos y no se gasta nada.
  const entorno = { ...env, TELEGRAM_TOKEN: env.TELEGRAM_TOKEN || 'previa', GEMINI_API_KEY_REDES_V3: conVoz ? env.GEMINI_API_KEY_REDES_V3 : '' };
  if (!conVoz) entorno.GEMINI_API_KEY_REDES = '';
  const deps = await dependenciasReales(entorno);
  const salida = await correr({ env: entorno, carpeta: path.resolve(env.SALIDA_PIEZAS || 'salida-vino'), deps: { ...deps, fetchFn, log: console.log } });
  for (const p of salida.piezas) console.log(JSON.stringify({ pieza: p.pieza, estado: p.estado, error: p.error, duracion: p.duracion, sinVoz: p.sinVoz, guion: p.guion, texto: p.texto, acciones: p.acciones }, null, 1));
  if (!salida.piezas.length || salida.piezas.some((p) => p.estado === 'error')) process.exitCode = 1;
}
