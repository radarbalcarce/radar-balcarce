// Dibuja con las funciones REALES de v3/redes/piezas/ (armadores + escenas + resvg) cada pieza de redes en cada estilo y deja
// JPG chicos en docs/3-0/mockup-redes/img/ más catalogo.json (lo que lee construir.mjs). No publica nada, no usa red ni claves.
//   node docs/3-0/mockup-redes/dibujar.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { aPng, COLOR_SECCION } from '../../../reels/placa.mjs';
import {
  armarClima, armarRepaso, armarEfemeride, armarNotaReel, armarNotaPropia, armarHistoriaDeNota, armarPosteo, armarCarrusel, armarCarruselSemana, armarCarruselFinde,
  armarFarmacia, armarParticipa, armarEnlace, armarAgenda, armarUtiles, armarFeriado, armarAviso,
} from '../../../v3/redes/piezas/armadores.mjs';
import { resolverFotos } from '../../../v3/redes/piezas/fotos.mjs';
import { escenaDeVideo, imagenComoSvg } from '../../../v3/redes/piezas/escenas.mjs';
import { tipoDeEfemeride, tipoDeFeriado } from '../../../reels/escenas/del-plan.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');
const SALIDA = path.join(import.meta.dirname, 'img');
const TEMP = path.join(import.meta.dirname, '.tmp');
fs.rmSync(SALIDA, { recursive: true, force: true });
fs.mkdirSync(SALIDA, { recursive: true });
fs.mkdirSync(TEMP, { recursive: true });
const leer = (f) => JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', f), 'utf8'));
const portada = leer('portada.json');
const catalogo = {};

async function guardar(svg, nombre, ancho) {
  const png = path.join(TEMP, `${nombre}.png`);
  await aPng(svg, png, ancho);
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', png, '-q:v', '4', path.join(SALIDA, `${nombre}.jpg`)]);
  fs.rmSync(png);
  return `img/${nombre}.jpg`;
}

// ------------------------------------------------------------------ datos reales
function desdePortada(id) {
  const n = portada.notas.find((x) => x.id === id);
  if (!n) throw new Error(`no encuentro la nota ${id}`);
  return {
    id: n.id, titulo: n.titulo, bajada: n.copete ?? '', enDosLineas: n.copete ?? '', cuerpo: String(n.cuerpo ?? '').split(/\n{2,}/).filter(Boolean), seccion: n.seccion,
    firma: 'Redacción Radar Balcarce', fechaCorta: '',
    foto: n.foto ? { ruta: path.join('web', 'public', n.foto.archivo), credito: n.foto.credito, alt: n.titulo } : null,
  };
}
// Una nota de ejemplo por sección: la primera con foto que tenga la portada de hoy (así el ejemplo nunca queda viejo).
const SECCIONES_EJEMPLO = {};
for (const s of ['Balcarce', 'Política', 'Fútbol', 'Deportes', 'Automovilismo', 'Agro', 'Economía', 'Cultura y agenda', 'Tecnología', 'Salud', 'Argentina']) {
  const n = portada.notas.find((x) => x.seccion === s && x.foto?.archivo);
  if (n) SECCIONES_EJEMPLO[s] = n.id;
}
const notaDe = (seccion) => desdePortada(SECCIONES_EJEMPLO[seccion]);

function notaPropia() {
  const r = leer('notas-de-redaccion.json').notas.rhalloween26;
  const f = (x) => ({ ruta: path.join('web', 'public', x.archivo), credito: x.credito, epigrafe: x.epigrafe, ancho: x.ancho, alto: x.alto });
  return { id: 'rhalloween26', titulo: r.titulo, bajada: r.copete, cuerpo: String(r.cuerpo).split(/\n{2,}/).filter(Boolean), seccion: r.seccion, firma: r.firma, portada: f(r.portada), foto: f(r.portada), fotos: r.fotos.map(f) };
}

const clima = { ahora: portada.clima.ahora, dias: portada.clima.dias };
const HOY = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);

// ------------------------------------------------------------------ cada pieza: { clave, titulo, armada, stills a mostrar }
async function video(clave, armada, { cuales = null, ancho = 270 } = {}) {
  const pieza = await resolverFotos(armada);
  const escena = escenaDeVideo(pieza);
  let stills = escena.stills();
  if (cuales) stills = cuales.map((n) => stills.find((s) => s.nombre === n)).filter(Boolean);
  const imagenes = [];
  for (const st of stills) imagenes.push({ nombre: st.nombre, src: await guardar(escena.cuadro(st.t, escena.total), `${clave}-${st.nombre}`, ancho) });
  catalogo[clave] = { tipo: 'video', id: armada.id, duracion: pieza.duracion, voz: pieza.voz, saludo: pieza.saludo, aviso: pieza.aviso, guion: pieza.guion, franja: pieza.franja ?? null, imagenes };
  console.log('video', clave, imagenes.length, pieza.duracion);
  return pieza;
}
async function imagenes(clave, armada, ancho = 324) {
  const pieza = await resolverFotos(armada);
  const imgs = [];
  for (const [i, e] of pieza.escenas.entries()) imgs.push({ nombre: e.tipo, src: await guardar(imagenComoSvg(e), `${clave}-${i + 1}`, ancho) });
  catalogo[clave] = { tipo: pieza.tipo, id: armada.id, ancho: pieza.ancho, alto: pieza.alto, imagenes: imgs };
  console.log(pieza.tipo, clave, imgs.length);
  return pieza;
}

// clima: mañana, noche, auspiciado y los 7 cielos de día y de noche
await video('clima-manana', armarClima(clima, { fecha: HOY, hora: 7, primeraDelBloque: true }), { cuales: ['completa'] });
await video('clima-noche', armarClima(clima, { fecha: HOY, hora: 20, primeraDelBloque: true, momento: 'noche' }), { cuales: ['completa'] });
await video('clima-auspiciado', armarClima(clima, { fecha: HOY, hora: 7, primeraDelBloque: true, auspicio: { comercio: 'Sweet Candy Bar', cuenta: '@_sweet.candy.bar' } }), { cuales: ['con-franja'] });
const CIELOS = { despejado: 'Despejado', parcial: 'Parcialmente nublado', nublado: 'Nublado', llovizna: 'Llovizna', lluvia: 'Lluvia', tormenta: 'Tormenta', niebla: 'Niebla' };
catalogo['clima-cielos'] = { tipo: 'cielos', imagenes: [] };
for (const [base, cielo] of Object.entries(CIELOS)) {
  for (const esDeDia of [true, false]) {
    const c = { ...clima, ahora: { ...clima.ahora, cielo, esDeDia }, dias: clima.dias.map((d, i) => (i === 0 ? { ...d, cielo } : d)) };
    const pieza = armarClima(c, { fecha: HOY, hora: esDeDia ? 7 : 20, primeraDelBloque: false, momento: esDeDia ? 'manana' : 'noche' });
    const escena = escenaDeVideo(pieza);
    const st = escena.stills().find((s) => s.nombre === 'completa') ?? escena.stills().at(-1);
    catalogo['clima-cielos'].imagenes.push({ nombre: `${base}${esDeDia ? '' : '-noche'}`, src: await guardar(escena.cuadro(st.t, escena.total), `cielo-${base}${esDeDia ? '' : '-noche'}`, 200) });
  }
}
// avisos de clima
const AVISOS = {
  helada: { tipo: 'helada', titulo: 'Helada fuerte esta noche', texto: 'Se esperan -3° de mínima esta noche en Balcarce. Cubrí las plantas y cuidá las cañerías.', dia: new Date(Date.now() + 21 * 3600_000).toISOString().slice(0, 10) },
  granizo: { tipo: 'granizo', titulo: 'Tormenta con granizo hoy', texto: 'El pronóstico da tormenta con granizo para hoy en Balcarce. Guardá los autos bajo techo.', dia: HOY },
  viento: { tipo: 'viento', titulo: 'Viento fuerte hoy', texto: 'Se esperan ráfagas de hasta 70 km/h hoy en Balcarce. Asegurá lo que pueda volarse.', dia: HOY },
};
for (const [k, a] of Object.entries(AVISOS)) await video(`aviso-${k}`, armarAviso(a, clima, { fecha: HOY }), { cuales: ['aviso'] });

// farmacia, útiles, agenda
await video('farmacia', armarFarmacia(portada.farmacias.hoy.detalle, { fecha: HOY, hora: 19, primeraDelBloque: true }), { cuales: ['completa'] });
await video('farmacia-3', armarFarmacia([
  { nombre: 'Del Cerro', direccion: 'Calle 28 N° 920 e/ 27 y 29', telefono: '42-1611' }, { nombre: 'Central', direccion: 'Calle 17 N° 531', telefono: '42-2020' }, { nombre: 'Mitre', direccion: 'Calle 15 N° 400', telefono: '42-3030' },
], { fecha: HOY, hora: 19, primeraDelBloque: true }), { cuales: ['completa'] });
const utiles = await video('utiles', armarUtiles({ hora: 17 }), { cuales: ['pantalla-1', 'pantalla-2'] });
await video('agenda', armarAgenda([
  { nombre: 'Primera Feria del Vino', cuando: 'sábado 11:00', lugar: 'Plaza Mitre' }, { nombre: 'Cine bajo las estrellas', cuando: 'sábado 21:00', lugar: 'Parque Cardenal Samoré' },
  { nombre: 'Torneo de pádel', cuando: 'domingo 10:00', lugar: 'Club Atlético' }, { nombre: 'Feria de artesanos', cuando: 'domingo', lugar: 'Paseo de la Estación' },
], { hora: 12 }), { cuales: ['completa'] });

// feriados: un tipo por cada estilo (datos reales de feriados-piezas.json)
const feriados = leer('feriados-piezas.json').feriados;
const feriadoPorTipo = {};
for (const f of feriados) { if (!(f.datos ?? []).length) continue; const t = tipoDeFeriado(f); if (!feriadoPorTipo[t]) feriadoPorTipo[t] = f; }
catalogo['feriados'] = { tipo: 'feriados', imagenes: [], tipos: Object.keys(feriadoPorTipo) };
for (const [t, f] of Object.entries(feriadoPorTipo)) {
  const pieza = await resolverFotos(armarFeriado({ fecha: f.fecha, nombre: f.nombre, tipo: f.tipo, alcance: f.alcance ?? 'nacional' }, { datos: [f.datos[0].texto], hora: 8, primeraDelBloque: true }));
  const escena = escenaDeVideo(pieza);
  const st = escena.stills().find((s) => s.nombre === 'completa');
  catalogo['feriados'].imagenes.push({ nombre: `${t} · ${f.nombre}`, src: await guardar(escena.cuadro(st.t, escena.total), `feriado-${t}`, 270) });
}
// efemérides: un tipo por cada estilo
const efe = leer('efemerides-piezas.json').dias;
const efePorTipo = {};
for (const [dia, e] of Object.entries(efe)) { if (!e?.principal?.titulo) continue; const t = tipoDeEfemeride(e.principal); if (!efePorTipo[t]) efePorTipo[t] = { dia, e }; }
catalogo['efemerides'] = { tipo: 'efemerides', imagenes: [], tipos: Object.keys(efePorTipo) };
for (const [t, { dia, e }] of Object.entries(efePorTipo)) {
  const pieza = await resolverFotos(armarEfemeride({ ...e, fecha: dia }, { fecha: dia, anioActual: 2026, tambien: e.ademas?.[0]?.texto ? e.ademas[0] : null, hora: 9, primeraDelBloque: true }));
  const escena = escenaDeVideo(pieza);
  const st = escena.stills().find((s) => s.nombre === 'completa');
  catalogo['efemerides'].imagenes.push({ nombre: t, src: await guardar(escena.cuadro(st.t, escena.total), `efemeride-${t}`, 270) });
}
// Participá: 5 variantes
catalogo['participa'] = { tipo: 'participa', imagenes: [] };
for (const v of ['noticia', 'evento', 'reclamo', 'nota', 'encuesta']) {
  const pieza = armarParticipa(v, { hora: 12 });
  const escena = escenaDeVideo(pieza);
  catalogo['participa'].imagenes.push({ nombre: v, src: await guardar(escena.cuadro(8, escena.total), `participa-${v}`, 270) });
}
// repasos (mañana, tarde, noche)
const tres = [notaDe('Balcarce'), notaDe('Política'), notaDe('Economía')];
const fechaLarga = 'Jueves 5 de noviembre';
for (const [m, h] of [['manana', 10], ['tarde', 15], ['noche', 21]]) {
  await video(`repaso-${m}`, armarRepaso(tres, { fecha: fechaLarga, hora: h, primeraDelBloque: m !== 'tarde', momento: m }), { cuales: ['leyendo-1', 'cierre'] });
}
await video('nota-reel', armarNotaReel(notaDe('Balcarce'), { hora: 13 }));
await video('nota-propia', armarNotaPropia(notaPropia(), { hora: 16 }));
await video('historia-nota', armarHistoriaDeNota(notaDe('Balcarce')), { cuales: ['completa'] });

// imágenes fijas: posteo por cada sección (para ver los 11 colores), enlace, carruseles
catalogo['posteos'] = { tipo: 'posteos', imagenes: [] };
for (const s of Object.keys(SECCIONES_EJEMPLO)) {
  const pieza = await resolverFotos(armarPosteo(notaDe(s)));
  catalogo['posteos'].imagenes.push({ nombre: s, src: await guardar(imagenComoSvg(pieza.escenas[0]), `posteo-${s.replace(/\W+/g, '').toLowerCase()}`, 324) });
}
await imagenes('enlace', armarEnlace(notaDe('Balcarce')), 432);
await imagenes('carrusel-nota', armarCarrusel(notaPropia()), 270);
await imagenes('carrusel-semana', armarCarruselSemana(['Balcarce', 'Balcarce', 'Cultura y agenda', 'Deportes', 'Agro'].map((s, i) => {
  const n = i === 1 ? notaDe('Salud') : notaDe(s);
  return { id: n.id, titulo: n.titulo, seccion: n.seccion, foto: i === 3 ? null : n.foto };
}), { desde: new Date(Date.now() - 9 * 86400000).toISOString().slice(0, 10), hasta: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10) }), 270);
await imagenes('carrusel-finde', armarCarruselFinde([
  { nombre: 'Primera Feria del Vino', cuando: 'sábado 11:00', lugar: 'Plaza Mitre' }, { nombre: 'Cine bajo las estrellas', cuando: 'sábado 21:00', lugar: 'Parque Cardenal Samoré' },
  { nombre: 'Torneo de pádel', cuando: 'domingo 10:00', lugar: 'Club Atlético' }, { nombre: 'Feria de artesanos', cuando: 'domingo', lugar: 'Paseo de la Estación' },
], { fechaTexto: 'Sábado 7 y domingo 8 de noviembre' }), 270);

fs.rmSync(TEMP, { recursive: true, force: true });
fs.writeFileSync(path.join(import.meta.dirname, 'catalogo.json'), JSON.stringify(catalogo, null, 1));
console.log('listo', Object.keys(catalogo).length, 'entradas;', fs.readdirSync(SALIDA).length, 'imágenes');
void COLOR_SECCION;
