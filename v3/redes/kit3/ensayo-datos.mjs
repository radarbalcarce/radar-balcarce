// Ensayo MUDO de las escenas de datos del kit 3.0 (20/11/2026): el gráfico animado dentro del repaso y del reel de una nota, y «El número del día». Sin voz, sin IA, sin publicar, sin base:
// los subtítulos se estiman a 2,5 palabras por segundo (el kit no necesita voz para dibujar). Datos: la nota de Miramar (v3/nucleo/notas-manuales/miramar.json, que trae gráfico) y las notas
// publicadas en radarbalcarce.com (sus cifras salen de la sección «Cifras» de cada página).
//
//   node v3/redes/kit3/ensayo-datos.mjs --salida D:\ruta [grafico-nota grafico-repaso grafico-linea numero-del-dia numero-variacion numero-solo]
import fs from 'node:fs';
import path from 'node:path';
import { armarNotaReel, armarRepaso, armarNumeroDelDia } from '../piezas/armadores.mjs';
import { numeroDelDia, mejorCifraDeLaNota, valorNumerico } from '../piezas/datos-de-nota.mjs';
import { resolverFotos, USER_AGENT } from '../piezas/fotos.mjs';
import { dibujarConKit3 } from './kit3.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');
const SITIO = 'https://radarbalcarce.com';
const txt = (h = '') => String(h).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#x27;/g, "'").trim();
const pedir = (u) => fetch(u, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) });

/** Una nota del sitio publicado: texto, foto con crédito y las cifras de su sección «Cifras» (valor = el número con su signo; unidad = el resto de lo que va en negrita). */
async function notaDelSitio(n) {
  const r = await pedir(n.url);
  if (!r.ok) throw new Error(`${n.id}: ${r.status}`);
  const html = await r.text();
  const ini = html.indexOf('<div class="cuerpo">');
  const fin = ini < 0 ? -1 : html.indexOf('id="los-datos"', ini);
  const cuerpo = ini < 0 ? [] : [...html.slice(ini, fin < 0 ? undefined : fin).matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => txt(m[1])).filter(Boolean);
  const fig = html.match(/<figure>\s*<img src="(https:\/\/radarbalcarce\.com\/[^"]+)"[^>]*>\s*(?:<figcaption>([\s\S]*?)<\/figcaption>)?/);
  const foto = fig ? { url: fig[1], credito: txt(fig[2] ?? '') } : null;
  const cifras = [...(html.match(/<ul class="cifras">([\s\S]*?)<\/ul>/)?.[1] ?? '').matchAll(/<li><b>([\s\S]*?)<\/b>([\s\S]*?)<\/li>/g)].map((m) => {
    const b = txt(m[1]); const v = b.match(/^((?:US\$|u\$s|\$|ar\$)?\s*\d[\d.,]*\s*%?)\s*(.*)$/i);
    return v ? { valor: v[1].trim(), unidad: v[2].trim() || (/%/.test(v[1]) ? '%' : ''), que: txt(m[2]), fuente: '' } : null;
  }).filter(Boolean);
  return { id: n.id, titulo: n.titulo, bajada: n.bajada ?? '', cuerpo, seccion: n.seccion, firma: 'Redacción Radar Balcarce', deBalcarce: !!n.de_balcarce, foto, fotos: foto ? [foto] : [], numeros: cifras, medios: 5, publicada: n.fecha, enDosLineas: '', slug: n.url.split('/nota/')[1] ?? n.id };
}

async function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--salida');
  const salida = path.resolve(i >= 0 ? args[i + 1] : 'salida-datos');
  const pedidas = args.filter((a, k) => !a.startsWith('--') && args[k - 1] !== '--salida');
  const todas = ['grafico-nota', 'grafico-repaso', 'grafico-linea', 'numero-del-dia', 'numero-comparacion', 'numero-variacion', 'numero-solo'];
  const lista = pedidas.length ? pedidas : todas;
  fs.mkdirSync(salida, { recursive: true });
  const env = { ...process.env, KIT3_GRAFICOS: 'si', KIT3_FONDOS: '' };
  const ahora = new Date();
  const { colorDeSeccion } = await import('../../../reels/placa.mjs');

  const miramar = JSON.parse(fs.readFileSync(path.join(RAIZ, 'v3', 'nucleo', 'notas-manuales', 'miramar.json'), 'utf8'));
  const notaMiramar = { id: 'miramar', titulo: miramar.titulo, bajada: miramar.bajada, cuerpo: miramar.cuerpo, seccion: miramar.seccion, firma: 'Redacción Radar Balcarce', deBalcarce: false, grafico: miramar.grafico, foto: { url: `${SITIO}/fotos-notas/miramar-verano.jpg`, credito: 'Foto: Secretaría de Turismo, Cultura y Deportes de General Alvarado' } };
  notaMiramar.fotos = [notaMiramar.foto];
  const l = await (await pedir(`${SITIO}/agentes/ultimas.json`)).json();
  const del24 = l.notas.filter((n) => Date.parse(n.fecha) >= ahora.getTime() - 24 * 3600_000);
  console.log(`notas de las últimas 24 h en el sitio: ${del24.length}`);
  const notas = [];
  for (const n of del24) { try { const x = await notaDelSitio(n); if (x.foto && x.cuerpo.length >= 2) notas.push(x); } catch (e) { console.log('  se saltea', e.message); } }
  console.log(`con foto y texto: ${notas.length}; con cifras en su ficha: ${notas.filter((n) => n.numeros.length).length}`);
  const elegida = numeroDelDia(notas.map((n) => ({ ...n, deServicio: false })), { ahora });
  console.log(elegida ? `número del día elegido: «${elegida.nota.titulo}» → ${JSON.stringify(elegida.numero.principal)} · comparación ${JSON.stringify(elegida.numero.comparacion)} · variación ${JSON.stringify(elegida.numero.variacion)} · puntaje ${elegida.numero.puntaje}` : 'ninguna nota de las últimas 24 h tiene una cifra que valga (la pieza no saldría hoy)');
  fs.writeFileSync(path.join(salida, 'numero-del-dia-eleccion.json'), JSON.stringify({ ahora, notasDel24h: notas.map((n) => ({ id: n.id, titulo: n.titulo, seccion: n.seccion, cifras: n.numeros, mejor: mejorCifraDeLaNota(n) })), elegida: elegida ? { id: elegida.nota.id, titulo: elegida.nota.titulo, numero: elegida.numero } : null }, null, 2));

  const lineaDe = { ...notaMiramar, id: 'linea', titulo: 'La inflación de los últimos meses sigue bajando mes a mes', seccion: 'Economía', grafico: { tipo: 'linea', titulo: 'Inflación mensual', unidad: '%', fuente: 'INDEC (datos de ejemplo del ensayo)', datos: [{ etiqueta: 'Junio', valor: 3.4 }, { etiqueta: 'Julio', valor: 2.9 }, { etiqueta: 'Agosto', valor: 2.7 }, { etiqueta: 'Septiembre', valor: 2.1 }, { etiqueta: 'Octubre', valor: 1.8 }] } };
  const sinGrafico = notas.filter((n) => n.deBalcarce).concat(notas).filter((n, k, a) => a.indexOf(n) === k && n.id !== 'miramar');
  const piezas = {
    'grafico-nota': () => armarNotaReel(notaMiramar, { hora: 13 }),
    'grafico-linea': () => armarNotaReel(lineaDe, { hora: 13 }),
    'grafico-repaso': () => armarRepaso([sinGrafico[0], notaMiramar, sinGrafico[1]].filter(Boolean).map((n, k) => ({ ...n, deBalcarce: k === 0 })), { fecha: 'Viernes 20 de noviembre', momento: 'tarde', hora: 14, primeraDelBloque: false }),
    'numero-del-dia': () => elegida && armarNumeroDelDia(elegida.nota, elegida.numero, { hora: 13 }),
    'numero-comparacion': () => armarNumeroDelDia({ ...(elegida?.nota ?? sinGrafico[0]) }, { principal: { valor: '3.394', n: 3394, unidad: 'millones de dólares', que: 'superávit comercial de octubre', fuente: 'INDEC' }, comparacion: { valor: '813', n: 813, unidad: 'millones de dólares', que: 'octubre de 2025' }, variacion: null }, { hora: 13 }),
    'numero-variacion': () => armarNumeroDelDia({ ...(elegida?.nota ?? sinGrafico[0]) }, { principal: { valor: '3.394', n: 3394, unidad: 'millones de dólares', que: 'superávit comercial de octubre', fuente: 'INDEC' }, comparacion: null, variacion: { valor: '319', n: 319, unidad: '%', que: 'más que en octubre del año pasado', baja: false } }, { hora: 13 }),
    'numero-solo': () => armarNumeroDelDia({ ...(elegida?.nota ?? sinGrafico[0]) }, { principal: { valor: '1.250', n: 1250, unidad: 'personas', que: 'participaron de la jornada en el predio de Balcarce', fuente: '' }, comparacion: null, variacion: null }, { hora: 13 }),
  };
  for (const id of lista) {
    if (!piezas[id]) { console.log(`no conozco «${id}»`); continue; }
    try {
      const armada = piezas[id]();
      if (!armada) { console.log(`${id}: no hay nota para armarla`); continue; }
      const pieza = await resolverFotos(armada);
      const r = await dibujarConKit3(pieza, path.join(salida, `${id}.mp4`), { env, colorDeSeccion, log: (t) => console.log(`  ${t}`) });
      fs.writeFileSync(path.join(salida, `${id}.json`), JSON.stringify({ pieza: id, guion: pieza.guion, palabras: pieza.guion.split(/\s+/).length, duracion: r.duracion, avisos: r.avisos }, null, 2));
      console.log(`${id}: listo · ${r.duracion} s · avisos: ${JSON.stringify(r.avisos)}`);
    } catch (e) { console.log(`${id}: FALLÓ · ${String(e?.stack ?? e).slice(0, 700)}`); process.exitCode = 1; }
  }
}
void valorNumerico;
const esElPrograma = process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(path.resolve(process.argv[1])).href;
if (esElPrograma) main().catch((e) => { console.error(e.stack || e); process.exit(1); });
