import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { generarSql, filasDeNotaVieja, motivoDeSalto } from './scripts/migracion.mjs';
import { crearSitio } from './sitio.mjs';
import { baseDePrueba } from './ayuda-pruebas.mjs';

const sitio = crearSitio();
const ir = (env, ruta) => sitio.manejar(new Request(`https://radar-sitio.example${ruta}`), env, null, { cache: null });

// Cinco notas reales del archivo viejo, elegidas entre las más leídas de web/data/estadisticas.json (cuerpo recortado).
const REALES = [
  { id: 'r4bjyj', slug: 'emerson-fittipaldi-visitara-el-museo-fangio-en-noviembre', seccion: 'Automovilismo', titulo: 'Emerson Fittipaldi visitará el Museo Fangio en noviembre', fecha: '2026-10-31T13:12:21.000Z', foto: { archivo: 'fotos-notas/r4bjyj.jpg', credito: 'Foto: El Diario Balcarce' }, medios: ['El Diario Balcarce'], fuentesConsultadas: [{ medio: 'El Diario Balcarce', enlace: 'https://eldiariobalcarce.com.ar/emerson-fittipaldi-visitara-el-museo-fangio-244' }], cuerpo: 'Representantes de la Fundación Fangio mantuvieron un encuentro.\n\nLa visita será en noviembre.', copete: 'La leyenda llega al museo.', como: 'automatica', guion: 'x' },
  { id: '164o14u', slug: 'el-club-de-leones-entrega-nuevos-equipos-al-hospital-municipal', seccion: 'Balcarce', titulo: 'El Club de Leones entrega nuevos equipos al Hospital Municipal', fecha: '2026-10-02T13:18:34.000Z', foto: { archivo: 'fotos-notas/164o14u.jpg', credito: 'Foto: Municipalidad de Balcarce' }, medios: ['News Balcarce (FM 91.7)', 'Municipalidad de Balcarce'], fuentesConsultadas: [{ medio: 'Municipalidad de Balcarce', enlace: 'https://balcarce.gob.ar/2026/10/02/el-club-de-leones-realizo-una-nueva-donacion-al-hospital/' }], cuerpo: 'El Club de Leones entregó una bomba de infusión para la Sala.', copete: 'Donación.', como: 'automatica', guion: 'x' },
  { id: '15i90co', slug: 'concejales-proponen-crear-un-registro-municipal-de-acompanantes', seccion: 'Balcarce', titulo: 'Concejales proponen crear un registro municipal de acompañantes terapéuticos', fecha: '2026-10-01T15:01:12.943Z', medios: ['Diario La Vanguardia'], fuentesConsultadas: [{ medio: 'Diario La Vanguardia', enlace: 'https://www.diariolavanguardia.com/noticias/44961-buscan-crear-un-registro-municipal-de-acompanantes-terapeuticos-en-balcarce/' }], cuerpo: 'Un proyecto de ordenanza ingresado en el Concejo Deliberante.', copete: 'Proyecto.', como: 'automatica', guion: 'x' },
  { id: 'alddw5', slug: 'la-cooperativa-de-electricidad-corta-el-suministro-el-viernes', seccion: 'Balcarce', titulo: 'La Cooperativa de Electricidad corta el suministro el viernes', fecha: '2026-10-01T16:05:14.000Z', foto: { archivo: 'fotos-notas/alddw5.jpg', credito: 'Foto: Puntonueve (FM 100.9)' }, medios: ['Puntonueve (FM 100.9)'], fuentesConsultadas: [{ medio: 'Puntonueve (FM 100.9)', enlace: 'https://puntonueve.com.ar/corte-de-energia-programado-para-este-viernes-5/' }, { medio: 'Radio Gabal (FM 104.1)', enlace: 'https://www.radiogabal.com.ar/index.php/comunidad/se-realizara-un-corte-del-servicio-electrico-este-viernes-en-un-sector-de-la-ciudad' }], cuerpo: 'La Cooperativa de Electricidad de Balcarce realiza un corte programado.', copete: 'Corte.', como: 'automatica', guion: 'x' },
  { id: '18jx7kk', slug: 'virginia-aparicio-habla-en-radio-sobre-su-situacion-en-el-inta', seccion: 'Agro', titulo: 'Virginia Aparicio brinda su testimonio el viernes en Polémica en Gabal', fecha: '2026-10-09T13:47:33.000Z', medios: ['Radio Gabal (FM 104.1)'], fuentesConsultadas: [{ medio: 'Radio Gabal (FM 104.1)', enlace: 'https://www.radiogabal.com.ar/index.php/comunidad/virginia-aparicio-dara-su-testimonio-en-exclusiva-en-polemica-en-gabal' }], cuerpo: 'La investigadora Virginia Aparicio dialogará el viernes a la tarde.', copete: 'Testimonio.', como: 'automatica', guion: 'x' },
];

function aplicar(sqlite, notas, opciones) {
  const r = generarSql(notas, opciones);
  for (const a of r.archivos) sqlite.exec(a.sql);
  return r;
}

test('cinco direcciones reales del archivo viejo resuelven igual en el sitio nuevo (misma dirección, 200, sin redirigir)', async () => {
  const { sqlite, env } = baseDePrueba();
  const r = aplicar(sqlite, REALES);
  assert.equal(r.migradas, 5);
  for (const n of REALES) {
    const res = await ir(env, `/nota/${n.slug}-${n.id}`);
    assert.equal(res.status, 200, n.id);
    const h = await res.text();
    assert.ok(h.includes('<h1>' + n.titulo + '</h1>'), n.id);
    assert.ok(h.includes(`https://radarbalcarce.com/nota/${n.slug}-${n.id}`), 'canónica con la misma dirección');
    // y la corta de antes (sólo el id) lleva a la larga
    assert.equal((await ir(env, `/nota/${n.id}`)).headers.get('location'), `/nota/${n.slug}-${n.id}`);
  }
});

test('la nota migrada conserva sección, fecha, foto con crédito, fuentes y firma', async () => {
  const { sqlite, env } = baseDePrueba();
  aplicar(sqlite, REALES);
  const h = await (await ir(env, '/nota/la-cooperativa-de-electricidad-corta-el-suministro-el-viernes-alddw5')).text();
  assert.match(h, /<img src="https:\/\/radarbalcarce\.com\/fotos-notas\/alddw5\.jpg"/);
  assert.match(h, /Foto: Puntonueve \(FM 100\.9\)/);
  assert.match(h, /Fuentes \(2\)/);
  assert.match(h, /radiogabal\.com\.ar/);
  assert.match(h, /escrita con IA a partir de 2 fuentes/);
  assert.match(h, /datetime="2026-10-01T16:05:14\.000Z"/);
  const fila = sqlite.prepare("SELECT n.estado, n.seccion, s.origen, s.slug FROM notas n JOIN sitio_notas s ON s.id = n.id WHERE n.id = 'alddw5'").get();
  assert.deepEqual({ ...fila }, { estado: 'publicada', seccion: 'Balcarce', origen: 'viejo', slug: 'la-cooperativa-de-electricidad-corta-el-suministro-el-viernes' });
  assert.match(await (await ir(env, '/seccion/agro')).text(), /Virginia Aparicio/);
});

test('migrar dos veces no duplica ni pisa (INSERT OR IGNORE)', () => {
  const { sqlite } = baseDePrueba();
  aplicar(sqlite, REALES);
  sqlite.prepare("UPDATE notas SET titulo = 'Corregido a mano' WHERE id = 'alddw5'").run();
  aplicar(sqlite, REALES);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM notas').get().n, 5);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sitio_notas').get().n, 5);
  assert.equal(sqlite.prepare("SELECT titulo FROM notas WHERE id = 'alddw5'").get().titulo, 'Corregido a mano');
});

test('una nota de la redacción vieja: origen redaccion, id con «nr», firma de la persona y fotos de adentro en su lugar', async () => {
  const { sqlite, env } = baseDePrueba();
  const nota = {
    id: 'nrdesidia626', propia: 'redaccion', titulo: 'La desidia estatal', copete: 'Una docente denunció.', cuerpo: 'Uno.\n\nDos.\n\nTres.', seccion: 'Argentina',
    fecha: '2026-10-30T13:08:29.315Z', slug: 'la-desidia-estatal-que-mato-dos-veces', firma: 'Por Hernán Accomo, de la redacción de Radar Balcarce',
    foto: { archivo: 'fotos-notas/redaccion-rdesidia626-portada.jpg', credito: 'Foto: Radar Balcarce' },
    fotosEnCuerpo: [{ archivo: 'fotos-notas/redaccion-rdesidia626-1-0002.png', ancho: 1200, alto: 916, leyenda: 'Infografía: Radar Balcarce', despuesDe: 1 }],
    fuentesConsultadas: [{ medio: 'Canal 26', enlace: 'https://www.canal26.com/x' }],
  };
  aplicar(sqlite, [nota]);
  const fila = sqlite.prepare("SELECT origen FROM sitio_notas WHERE id = 'nrdesidia626'").get();
  assert.equal(fila.origen, 'redaccion');
  const res = await ir(env, '/nota/la-desidia-estatal-que-mato-dos-veces-nrdesidia626');
  assert.equal(res.status, 200);
  const h = await res.text();
  assert.match(h, /Por Hernán Accomo, de la redacción de Radar Balcarce/);
  assert.ok(h.indexOf('<p>Uno.</p>') < h.indexOf('redaccion-rdesidia626-1-0002.png') && h.indexOf('redaccion-rdesidia626-1-0002.png') < h.indexOf('<p>Dos.</p>'), 'la foto va entre el primer y el segundo párrafo');
  assert.match(h, /Infografía: Radar Balcarce/);
});

test('se saltan las notas sin cuerpo, sin título o sin fecha; las repetidas se cuentan; «Cultura y agenda» pasa a Cultura', () => {
  const buena = { ...REALES[0] };
  const r = generarSql([
    buena, { ...buena }, { ...REALES[1], cuerpo: '' }, { ...REALES[2], titulo: ' ' }, { ...REALES[3], fecha: null, visto: null },
    { ...REALES[4], seccion: 'Cultura y agenda' },
  ]);
  assert.equal(r.migradas, 2);
  assert.equal(r.repetidas, 1);
  assert.deepEqual(r.saltadas.map((s) => s.motivo), ['sin cuerpo', 'sin título', 'sin fecha']);
  assert.equal(filasDeNotaVieja({ ...REALES[4], seccion: 'Cultura y agenda' }).nota.seccion, 'Cultura');
  assert.equal(motivoDeSalto({ id: 'a-b', titulo: 'x', cuerpo: 'y', fecha: '2026-01-01' }), 'sin id válido');
});

test('el SQL escapa las comillas y parte en archivos de a tantas notas', () => {
  const r = generarSql([{ ...REALES[0], titulo: "L'Équipe dice 'sí'; DROP TABLE notas;--" }, REALES[1], REALES[2]], { porArchivo: 2 });
  assert.equal(r.archivos.length, 2);
  assert.deepEqual(r.archivos.map((a) => a.notas), [2, 1]);
  assert.match(r.archivos[0].sql, /'L''Équipe dice ''sí''; DROP TABLE notas;--'/);
  const { sqlite } = baseDePrueba();
  for (const a of r.archivos) sqlite.exec(a.sql);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM notas').get().n, 3);
  assert.equal(sqlite.prepare("SELECT titulo FROM notas WHERE id = 'r4bjyj'").get().titulo, "L'Équipe dice 'sí'; DROP TABLE notas;--");
});

test('con los datos reales del repositorio, toda nota migrada resuelve en su misma dirección', { skip: !existsSync(new URL('../../web/data/archivo.json', import.meta.url)) && 'no están los datos viejos' }, async () => {
  const leer = (f) => JSON.parse(readFileSync(new URL(`../../web/data/${f}`, import.meta.url), 'utf8')).notas;
  const notas = [...leer('portada.json'), ...leer('archivo.json')];
  const { sqlite, env } = baseDePrueba();
  const r = aplicar(sqlite, notas);
  assert.ok(r.migradas > 100);
  const filas = sqlite.prepare('SELECT s.id, s.slug FROM sitio_notas s').all();
  assert.equal(filas.length, r.migradas);
  for (const f of filas.slice(0, 120)) assert.equal((await ir(env, `/nota/${f.slug}-${f.id}`)).status, 200, f.id);
});
