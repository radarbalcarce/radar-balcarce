// Revisa de antemano las FOTOS de «Un día como hoy» (Hernán, 20/11/2026: «todo tiene que tener foto»). Recorre los días que vienen de web/data/efemerides-piezas.json y para cada hecho
// (el principal y los «además» que entran en el video) dice qué foto saldría y de dónde (fija = elegida a mano en el json / Wikipedia / Commons) o «SIN FOTO». Para cada SIN FOTO busca
// hasta 3 candidatas con licencia libre (búsqueda amplia por el tema, en Commons y en los artículos de Wikipedia) y arma una hoja PNG de contacto con las candidatas numeradas, para que una
// persona elija. NO carga nada en el json: la persona pone `"foto": { "commons": "File:…", "credito": "…" }` en el hecho. Sin IA, sin claves, sólo lectura de Wikipedia y Commons.
//
//   node v3/redes/efemerides/revisar-fotos.mjs                                   los próximos 30 días (desde mañana), en ./revision-fotos
//   node v3/redes/efemerides/revisar-fotos.mjs --desde=2026-11-22 --dias=40 --salida=D:\ruta
//   node v3/redes/efemerides/revisar-fotos.mjs --mes-que-viene                   el mes que sigue a hoy (lo usa el workflow v3-efemerides.yml el día 20)
//   node v3/redes/efemerides/revisar-fotos.mjs --sin-hoja                        sólo la lista (sin PNG)
//
// Deja en la carpeta de salida: lista.txt (qué foto sale en cada hecho), lista.json, hoja-sin-foto-N.png (si hay hechos sin foto y resvg está instalado) y telegram.txt (el aviso corto).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fotosDeLosHechos, json as pedirJson, bajar as pedirBytes } from '../kit3/efemeride-foto.mjs';
import { sujetosDeWikipedia, LICENCIA_LIBRE, NO_SIRVE, sinEtiquetas, creditoDeCommons } from './nota.mjs';
import { mesQueSigue } from './armar.mjs';
import { renglones } from './placas.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');
const FUENTES = path.join(RAIZ, 'reels', 'marca', 'fuentes');
const ADEMAS_EN_VIDEO = 3; // los «además» que entran en el video (EFEMERIDE.ademasEnVideo)
const MAX_CANDIDATAS = 3;

const pad = (n) => String(n).padStart(2, '0');
const manana = (ahora) => new Date(new Date(ahora).getTime() - 3 * 3600_000 + 86400_000).toISOString().slice(0, 10);
const sumarDias = (dia, n) => new Date(Date.parse(`${dia}T12:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);

const jsonDe = pedirJson; // con reintentos (Wikimedia frena las ráfagas con 429)
const bytesDe = pedirBytes;

// ------------------------------------------------------------------ los hechos de cada día

/** Los hechos que entran en el video de un día, como los que le pasa `fotosDeLosHechos`: [{ anio, titulo, texto, foto }] con el principal primero. */
export function hechosDelVideo(dia) {
  const p = dia?.principal;
  if (!p?.titulo) return [];
  const ademas = (dia.ademas ?? []).filter((o) => o?.texto).slice(0, ADEMAS_EN_VIDEO);
  return [{ anio: p.anio ?? null, titulo: p.titulo, texto: p.cuerpo ?? '', foto: p.foto ?? null }, ...ademas.map((o) => ({ anio: o.anio ?? null, titulo: o.texto, texto: o.texto, foto: o.foto ?? null }))];
}

// ------------------------------------------------------------------ las candidatas para un hecho sin foto

const PALABRAS_VACIAS = new Set(['sobre', 'entre', 'desde', 'hacia', 'donde', 'cuando', 'porque', 'primer', 'primera', 'primeros', 'segunda', 'segundo', 'nuevo', 'nueva', 'argentina', 'argentino', 'argentinos', 'publica', 'publican', 'nacen', 'nace', 'muere', 'funda', 'firma', 'firman', 'lanza', 'gana', 'vence', 'sale', 'comienzan', 'comienza', 'inaugura', 'establece', 'presenta', 'estrena', 'declarado', 'conocido', 'mundo', 'mundial', 'internacional', 'nacional', 'historia', 'creador', 'autor', 'hoy', 'dias', 'como', 'esta', 'este', 'tras', 'para', 'con', 'una', 'uno', 'del', 'los', 'las', 'que', 'por']);
const sinTildes = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Las búsquedas amplias por el TEMA del hecho: el sujeto (nombre propio o «Día de…»), las palabras clave del titular y las del texto. Hasta 3, sin repetir. */
export function consultasDeTema(hecho) {
  const titulo = String(hecho?.titulo ?? '').replace(/[«»"]/g, ' ');
  const clave = (t, max) => [...new Set(sinTildes(t).toLowerCase().split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 4 && !PALABRAS_VACIAS.has(w)))].slice(0, max).join(' ');
  const sujeto = sujetosDeWikipedia(hecho, 3).map((s) => s.replace(/^D[ií]a (?:de|del) (?:la |el |los |las )?/i, '')).find((x) => x && !/^argentina$/i.test(x)) ?? '';
  const lista = [sujeto, clave(titulo, 4), clave(`${hecho?.texto ?? ''}`, 4)].map((q) => q.trim()).filter((q) => q.length >= 4);
  return [...new Map(lista.map((q) => [sinTildes(q).toLowerCase(), q])).values()].slice(0, 3);
}

/** Hasta `max` candidatas libres para un hecho: de cada búsqueda (Commons y artículos de Wikipedia) la mejor, y después la segunda, etc. Cada una: { archivo, titulo, licencia, autor, pagina, consulta, via, miniatura (data URI) }. */
export async function candidatasDelHecho(hecho, { traer = fetch, max = MAX_CANDIDATAS, excluir = [] } = {}) {
  const consultas = consultasDeTema(hecho);
  const porConsulta = await Promise.all(consultas.map(async (q) => {
    const nombres = [];
    const c = await jsonDe(`https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&list=search&srnamespace=6&srlimit=10&srsearch=${encodeURIComponent(q)}`, traer);
    for (const x of c?.query?.search ?? []) nombres.push({ n: String(x.title ?? '').replace(/^File:/, ''), via: 'Commons' });
    const w = await jsonDe(`https://es.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=4&gsrnamespace=0&prop=pageimages&piprop=name`, traer);
    for (const p of (w?.query?.pages ?? []).sort((a, b) => (a.index ?? 9) - (b.index ?? 9))) if (p.pageimage) nombres.push({ n: String(p.pageimage), via: `Wikipedia: ${p.title}` });
    return { q, nombres: nombres.filter((x) => x.n && !NO_SIRVE.test(x.n) && !excluir.includes(x.n)) };
  }));
  const todos = [...new Set(porConsulta.flatMap((c) => c.nombres.map((x) => x.n)))].slice(0, 40);
  if (!todos.length) return [];
  const info = await jsonDe(`https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=480&titles=${todos.map((n) => encodeURIComponent(`File:${n}`)).join('%7C')}`, traer);
  const libres = new Map();
  for (const p of info?.query?.pages ?? []) {
    const i = p?.imageinfo?.[0]; if (!i) continue;
    const meta = i.extmetadata ?? {}; const licencia = sinEtiquetas(meta.LicenseShortName?.value);
    const mimeOk = /^image\/(jpeg|png|webp)$/.test(i.mime ?? '') || (/^image\/tiff?$/.test(i.mime ?? '') && /\.(jpe?g|png)(\?|$)/i.test(i.thumburl ?? ''));
    if (!LICENCIA_LIBRE.test(licencia) || /non-?free|fair use|copyrighted/i.test(`${licencia} ${meta.Copyrighted?.value ?? ''}`) || meta.NonFree?.value === 'true' || !mimeOk || i.width < 700) continue;
    const archivo = String(p.title ?? '').replace(/^File:/, '');
    libres.set(archivo, { archivo, titulo: sinEtiquetas(meta.ObjectName?.value) || archivo.replace(/\.[a-z]+$/i, ''), licencia, autor: sinEtiquetas(meta.Artist?.value).slice(0, 60), pagina: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(archivo.replace(/ /g, '_'))}`, thumb: i.thumburl || i.url });
  }
  const elegidas = [];
  for (let k = 0; elegidas.length < max && k < 10; k += 1) {
    for (const c of porConsulta) {
      const x = c.nombres.filter((y) => libres.has(y.n))[k];
      if (x && !elegidas.some((e) => e.archivo === x.n) && elegidas.length < max) elegidas.push({ ...libres.get(x.n), consulta: c.q, via: x.via });
    }
  }
  for (const e of elegidas) {
    const b = await bytesDe(e.thumb, traer);
    e.miniatura = b?.bytes?.length ? `data:${/^image\//.test(b.mime) ? b.mime : 'image/jpeg'};base64,${Buffer.from(b.bytes).toString('base64')}` : null;
    delete e.thumb;
  }
  return elegidas.filter((e) => e.miniatura);
}

// ------------------------------------------------------------------ la revisión

/** @returns {Promise<{ desde, hasta, dias: Array<{ dia, hechos: Array<{ anio, titulo, de, archivo, credito, candidatas }> }>, total, conFoto, sinFoto }>} */
export async function revisar({ piezas, desde, dias = 30, traer = fetch, conCandidatas = true, log = () => {}, paralelo = 2 } = {}) {
  const hasta = sumarDias(desde, dias - 1);
  const dia = async (d) => {
    const entrada = piezas.dias[d];
    const hechos = hechosDelVideo(entrada);
    let fotos = [];
    try { fotos = await fotosDeLosHechos({ principal: entrada.principal, ademas: hechos.slice(1).map((h) => ({ anio: h.anio, texto: h.titulo, foto: h.foto })) }, { traer }); } catch { fotos = []; }
    const usadas = fotos.filter(Boolean).map((f) => f.archivo).filter(Boolean);
    const filas = await Promise.all(hechos.map(async (h, i) => {
      const f = fotos[i] ?? null;
      const fila = { anio: h.anio, titulo: h.titulo, de: f ? (f.origen === 'fija' ? 'fija' : f.origen === 'wikipedia' ? 'Wikipedia' : 'Commons') : null, archivo: f?.archivo ?? null, credito: f?.credito ?? null, candidatas: [] };
      if (!f && conCandidatas) { try { fila.candidatas = await candidatasDelHecho(h, { traer, excluir: usadas }); } catch { fila.candidatas = []; } }
      return fila;
    }));
    log(`${d}: ${filas.filter((x) => x.de).length}/${filas.length} con foto`);
    return { dia: d, hechos: filas };
  };
  const lista = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) if (piezas?.dias?.[d]) lista.push(d);
  const salida = new Array(lista.length);
  let siguiente = 0;
  await Promise.all(Array.from({ length: Math.min(paralelo, lista.length) }, async () => { while (siguiente < lista.length) { const i = siguiente; siguiente += 1; salida[i] = await dia(lista[i]); } }));
  const total = salida.reduce((n, d) => n + d.hechos.length, 0);
  const sinFoto = salida.reduce((n, d) => n + d.hechos.filter((h) => !h.de).length, 0);
  return { desde, hasta, dias: salida, total, conFoto: total - sinFoto, sinFoto };
}

export function listaEnTexto(r) {
  const L = [`Fotos de «Un día como hoy» del ${r.desde} al ${r.hasta}: ${r.conFoto} de ${r.total} hechos con foto, ${r.sinFoto} SIN FOTO.`, ''];
  for (const d of r.dias) {
    L.push(d.dia);
    for (const h of d.hechos) {
      L.push(`  ${h.anio ?? 'HOY'}  ${String(h.titulo).slice(0, 80)}  =>  ${h.de ? `${h.de}: ${h.archivo} (${h.credito})` : 'SIN FOTO'}`);
      h.candidatas.forEach((c, k) => L.push(`      candidata ${k + 1}: ${c.archivo}  [${c.licencia}]  (${c.via}; búsqueda «${c.consulta}»)  ${c.pagina}`));
    }
  }
  return `${L.join('\n')}\n`;
}

/** El aviso corto para Telegram (menos de ~3.500 letras). */
export function avisoDeTelegram(r, { etiqueta = 'los próximos días' } = {}) {
  const faltan = r.dias.flatMap((d) => d.hechos.filter((h) => !h.de).map((h) => `${d.dia.slice(5).replace('-', '/')}${h.anio ? ` (${h.anio})` : ''}: ${String(h.titulo).slice(0, 60)}`));
  if (!r.total) return `Fotos de «Un día como hoy» de ${etiqueta}: no hay días armados todavía.`;
  if (!faltan.length) return `Fotos de «Un día como hoy» de ${etiqueta} (${r.desde} al ${r.hasta}): los ${r.total} hechos tienen foto.`;
  let t = `Fotos de «Un día como hoy» de ${etiqueta} (${r.desde} al ${r.hasta}): ${r.sinFoto} de ${r.total} hechos quedan SIN FOTO (esos hechos saldrían sacados del video; si es el principal, el video no sale). Para cargarla: «foto»: { «commons»: «File:…», «credito»: «…» } en el hecho de web/data/efemerides-piezas.json. La hoja con candidatas está en los artefactos del workflow.\n`;
  for (const f of faltan) { if ((t + f).length > 3300) { t += '…'; break; } t += `\n- ${f}`; }
  return t;
}

// ------------------------------------------------------------------ la hoja de contacto (PNG con resvg)

const xml = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ANCHO = 1800, FILA = 400, CABEZA = 90, POR_HOJA = 5;

export function svgDeHoja(filas, { pagina, paginas, desde, hasta }) {
  const alto = CABEZA + FILA * filas.length;
  const partes = [`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${ANCHO}" height="${alto}" viewBox="0 0 ${ANCHO} ${alto}"><rect width="${ANCHO}" height="${alto}" fill="#FAF8F3"/>`,
    `<text x="40" y="58" font-family="Inter" font-weight="700" font-size="34" fill="#14161A">Hechos sin foto · ${xml(desde)} al ${xml(hasta)} · hoja ${pagina} de ${paginas}</text>`];
  filas.forEach((f, i) => {
    const y = CABEZA + i * FILA;
    partes.push(`<line x1="40" y1="${y}" x2="${ANCHO - 40}" y2="${y}" stroke="#D8D2C4" stroke-width="2"/>`);
    partes.push(`<text x="40" y="${y + 50}" font-family="Inter" font-weight="700" font-size="26" fill="#C7381C">${xml(f.dia)}</text>`);
    partes.push(`<text x="40" y="${y + 120}" font-family="Source Serif 4 60pt" font-weight="900" font-size="72" fill="#14161A">${xml(f.anio ?? 'HOY')}</text>`);
    renglones(f.titulo, 360, 24, 0.55, 7).forEach((l, k) => partes.push(`<text x="40" y="${y + 165 + k * 30}" font-family="Inter" font-weight="600" font-size="24" fill="#14161A">${xml(l)}</text>`));
    if (!f.candidatas.length) partes.push(`<text x="460" y="${y + 200}" font-family="Inter" font-weight="600" font-size="28" fill="#6B6F6C">Sin candidatas libres: cargar la foto a mano.</text>`);
    f.candidatas.forEach((c, k) => {
      const x = 440 + k * 440;
      partes.push(`<rect x="${x}" y="${y + 20}" width="420" height="270" fill="#E7E2D4"/>`);
      partes.push(`<image x="${x}" y="${y + 20}" width="420" height="270" preserveAspectRatio="xMidYMid meet" xlink:href="${c.miniatura}"/>`);
      partes.push(`<circle cx="${x + 34}" cy="${y + 54}" r="26" fill="#C7381C"/><text x="${x + 34}" y="${y + 65}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="32" fill="#fff">${k + 1}</text>`);
      renglones(c.titulo, 410, 20, 0.55, 2).forEach((l, j) => partes.push(`<text x="${x}" y="${y + 318 + j * 24}" font-family="Inter" font-weight="600" font-size="20" fill="#14161A">${xml(l)}</text>`));
      partes.push(`<text x="${x}" y="${y + 372}" font-family="Inter" font-weight="400" font-size="18" fill="#6B6F6C">${xml(`${c.licencia} · ${c.via}`.slice(0, 60))}</text>`);
    });
  });
  partes.push('</svg>');
  return partes.join('');
}

export async function hojasDeContacto(r) {
  const filas = r.dias.flatMap((d) => d.hechos.filter((h) => !h.de).map((h) => ({ dia: d.dia, ...h })));
  if (!filas.length) return [];
  const { Resvg } = await import('@resvg/resvg-js');
  const fontFiles = ['Inter-400.ttf', 'Inter-600.ttf', 'Inter-700.ttf', 'SourceSerif4-700.ttf', 'SourceSerif4-900.ttf'].map((f) => path.join(FUENTES, f)).filter((f) => fs.existsSync(f));
  const hojas = [];
  const paginas = Math.ceil(filas.length / POR_HOJA);
  for (let p = 0; p < paginas; p += 1) {
    const svg = svgDeHoja(filas.slice(p * POR_HOJA, (p + 1) * POR_HOJA), { pagina: p + 1, paginas, desde: r.desde, hasta: r.hasta });
    hojas.push(new Resvg(svg, { fitTo: { mode: 'width', value: ANCHO }, font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng());
  }
  return hojas;
}

// ------------------------------------------------------------------ el programa

export async function main({ argv = process.argv.slice(2), ahora = new Date(), traer = fetch, log = (t) => process.stdout.write(`${t}\n`) } = {}) {
  const args = Object.fromEntries(argv.map((a) => a.replace(/^--/, '').split('=')));
  const mes = 'mes-que-viene' in args ? mesQueSigue(ahora) : null;
  const desde = args.desde || mes?.desde || manana(ahora);
  const dias = Number(args.dias || mes?.dias || 30);
  const entrada = args.entrada || path.join(RAIZ, 'web', 'data', 'efemerides-piezas.json');
  const salida = path.resolve(args.salida || 'revision-fotos');
  const piezas = JSON.parse(fs.readFileSync(entrada, 'utf8'));
  const r = await revisar({ piezas, desde, dias, traer, log });
  fs.mkdirSync(salida, { recursive: true });
  const sinMiniaturas = { ...r, dias: r.dias.map((d) => ({ ...d, hechos: d.hechos.map((h) => ({ ...h, candidatas: h.candidatas.map(({ miniatura, ...c }) => c) })) })) };
  fs.writeFileSync(path.join(salida, 'lista.json'), `${JSON.stringify(sinMiniaturas, null, 1)}\n`);
  fs.writeFileSync(path.join(salida, 'lista.txt'), listaEnTexto(r));
  fs.writeFileSync(path.join(salida, 'telegram.txt'), `${avisoDeTelegram(r, { etiqueta: mes ? 'el mes que viene' : 'los próximos días' })}\n`);
  for (const f of fs.readdirSync(salida)) if (/^hoja-sin-foto-\d+\.png$/.test(f)) fs.unlinkSync(path.join(salida, f)); // las hojas de una corrida anterior no se mezclan con las nuevas
  if (!('sin-hoja' in args)) {
    try { (await hojasDeContacto(r)).forEach((png, i) => fs.writeFileSync(path.join(salida, `hoja-sin-foto-${i + 1}.png`), png)); } catch (e) { log(`No se pudo armar la hoja de contacto: ${String(e.message).slice(0, 120)}`); }
  }
  log(`${r.conFoto} de ${r.total} hechos con foto, ${r.sinFoto} sin foto · ${salida}`);
  return r;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((e) => { process.stderr.write(`${e.stack || e.message}\n`); process.exit(1); });
}
