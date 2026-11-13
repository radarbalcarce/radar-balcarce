// Los tres reels de «Balcarce, el nuevo origen del vino» (sábado 14/11/2026): viñedos, vinotecas y gastronomía. Guiones escritos a mano, en frases cortas y completas (las direcciones
// no se cortan), sobre placas de la marca SIN foto (sección Balcarce): no hay foto oficial. Sólo hay datos de la nota (docs/3-0/notas-propias/vino-nuevo-origen-*.md, contrastados con la gacetilla
// de Prensa Municipal del 12/11). Usa el mismo camino que la previa de una nota (`correr.mjs`, pieza `pieza-escrita`): ensayo por defecto, NO publica nada.
//
//   node v3/redes/piezas/previa-vino.mjs                   los tres, MUDOS (sin clave: no gasta voz ni IA), en salida-vino/ (o SALIDA_PIEZAS)
//   VOZ=si GEMINI_API_KEY_REDES_V3=… node …                con voz (un audio por reel, la locutora; la voz se guarda en la memoria: si se publica, suena igual)
//   PUBLICAR=si NOTA_URL=https://radarbalcarce.com/nota/… node …   PUBLICA DE VERDAD (reel e historia en Facebook e Instagram; TikTok, YouTube y X por Buffer). Sólo con el OK de una persona y la nota ya publicada.
//   PIEZAS=vinedos,vinotecas,gastronomia                   cuáles (por defecto las tres)
//   MENCIONES=-                                            sin cuentas en el texto (por defecto, las confirmadas de cada reel; ver `REELS`)
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { correr, dependenciasReales } from './correr.mjs';

export const SECCION = 'Balcarce';
export const ROTULO = 'El nuevo origen del vino';
export const FIRMA = 'Hernán Accomo';
export const TITULO_DE_LA_NOTA = 'Balcarce, el nuevo origen del vino';
export const CIERRE = 'El programa completo, en Radar Balcarce punto com.';

/**
 * Los reels. `escenas`: lo que se VE (titulo) y lo que se DICE (voz), una frase entera por escena. Números y direcciones van en palabras en la voz (la voz no lee «832» ni «hs»).
 * `texto`: las líneas del posteo (la nota completa, el aviso de la voz con IA y los hashtags los suma `textoDePieza`). `menciones`: cuentas confirmadas en el borrador del posteo.
 */
export const REELS = Object.freeze({
  vinedos: {
    id: 'vino-vinedos',
    nombre: 'Balcarce, el nuevo origen del vino: los viñedos abren sus puertas',
    hashtag: 'Vino',
    escenas: [
      { titulo: 'Los viñedos abren sus puertas', voz: 'Balcarce, el nuevo origen del vino. Este sábado catorce, los viñedos abren sus puertas.' },
      { titulo: 'Dos viñedos, con inscripción previa', voz: 'Dos viñedos reciben visitas del público, con inscripción previa obligatoria: Bodegas y Viñedos Balcarce, y Viñedo Los Pinos.' },
      { titulo: 'Inscripción y horarios: @vinedos.balcarce y @vinedolospinos', voz: 'Para anotarse y ver los horarios, hay que ir al Instagram de los viñedos: arroba vinedos punto balcarce, y arroba viñedo los pinos.' },
      { titulo: 'El programa completo, en radarbalcarce.com', voz: CIERRE },
    ],
    texto: [
      'Este sábado 14 de noviembre, dos viñedos reciben visitas del público, con inscripción previa obligatoria: Bodegas y Viñedos Balcarce y Viñedo Los Pinos.',
      'Para anotarse y ver los horarios, hay que ir al Instagram de los viñedos: @vinedos.balcarce y @vinedolospinos.',
    ],
    menciones: [],
  },
  vinotecas: {
    id: 'vino-vinotecas',
    nombre: 'Balcarce se copa: degustaciones gratuitas en tres vinotecas',
    hashtag: 'Vino',
    escenas: [
      { titulo: 'Balcarce se copa: degustaciones gratuitas', voz: 'Balcarce, el nuevo origen del vino. Este sábado, tres vinotecas ofrecen degustaciones gratuitas, de las cuatro de la tarde a las nueve de la noche.' },
      { titulo: 'The Wines Co.: Avenida Kelly 832', voz: 'The Wines Co., en la avenida Kelly, ochocientos treinta y dos.' },
      { titulo: '1980 Almacén de Vinos: Calle 21, número 715', voz: 'Mil novecientos ochenta Almacén de Vinos, en la calle veintiuno, número setecientos quince.' },
      { titulo: 'Talou Vinoteca: Calle 22, número 643', voz: 'Y Talou Vinoteca, en la calle veintidós, número seiscientos cuarenta y tres.' },
      { titulo: 'El programa completo, en radarbalcarce.com', voz: CIERRE },
    ],
    texto: [
      '«Balcarce se copa»: este sábado 14 de noviembre, degustaciones gratuitas de 16 a 21 en tres vinotecas.',
      'The Wines Co.: avenida Kelly 832.',
      '1980 Almacén de Vinos: calle 21, N° 715.',
      'Talou Vinoteca: calle 22, N° 643.',
    ],
    menciones: ['@thewinesco', '@almacendevinos1980', '@talouvinoteca137'],
  },
  gastronomia: {
    id: 'vino-gastronomia',
    nombre: 'Cenar con vinos locales: la propuesta gastronómica del sábado',
    hashtag: 'Vino',
    escenas: [
      { titulo: 'Cenar con vinos de Balcarce', voz: 'Balcarce, el nuevo origen del vino. El sábado, desde las nueve de la noche, hay propuestas gastronómicas con vinos locales.' },
      { titulo: 'Cavas Bar, Casa Quinta Restó y Parrilla y Bodegón Los Troncos', voz: 'Las ofrecen Cavas Bar, Casa Quinta Restó y Parrilla, y Bodegón Los Troncos.' },
      { titulo: 'El programa completo, en radarbalcarce.com', voz: 'El programa completo del sábado, en Radar Balcarce punto com.' },
    ],
    texto: [
      'Este sábado 14 de noviembre, desde las 21, propuestas gastronómicas con vinos locales en Cavas Bar, Casa Quinta Restó y Parrilla y Bodegón Los Troncos.',
      'Es parte de «Balcarce, el nuevo origen del vino», en el marco del 126° aniversario de Los Pinos.',
    ],
    menciones: ['@cavas_restaurante', '@casaquinta.resto', '@parrillabodegonlostroncos'],
  },
});

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

/** Las entradas del plan de ensayo: una por reel, con su guion escrito y su texto. `publicar`: suma los canales de Buffer. */
export function itemsDelVino({ piezas = Object.keys(REELS), nota, publicar = false, menciones = null } = {}) {
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
        pieza: { id: r.id, rotulo: ROTULO, seccion: SECCION, firma: FIRMA, notaId: nota.id, escenas: r.escenas },
        texto: r.texto,
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
  const items = itemsDelVino({ piezas: piezas.length ? piezas : undefined, nota, publicar, menciones });
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
