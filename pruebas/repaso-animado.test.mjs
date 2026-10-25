// Regla 209 (17/10/2026): el repaso sigue a la voz. Mientras cuenta cada nota se ve su foto (o la placa de su sección) con su titular;
// arranca con la primera nota (la más fuerte), cierra con la lista completa, y la tapa del reel (el cuadro 0) es la lista. Sin red ni
// cupo: voz falsa con los tiempos que daría Gemini; el video se arma de verdad con ffmpeg, pero no se publica.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import {
  secuenciaDelRepaso, placaDeNotaDelRepaso, tiemposDeLasMarcas, placasConTiempos, fotoParaElRepaso,
} from '../reels/escenas/repaso.mjs';
import { partirSvg } from '../reels/animacion.mjs';
import { armarReel, medirDuracion } from '../reels/reel.mjs';
import { palabrasSinteticas } from '../reels/previa-efemerides.mjs';
import { armarPodcast, cierreDePodcast } from '../redes/guiones.mjs';
import { planDelDia, secuenciaDelPlan } from '../reels/plan.mjs';

const FECHA = new Date('2026-10-16T10:05:00-03:00');
const NOTAS = [
  { titulo: 'Ferroviarios gana el Apertura y va por la final', seccion: 'Fútbol', foto: { datos: 'data:image/jpeg;base64,AAAA', credito: 'Foto: Acción 5 (Balcarce)' } },
  { titulo: 'Cortan el agua en el centro por una obra', seccion: 'Balcarce', foto: null },
  { titulo: 'Nueva muestra en el museo', seccion: 'Cultura y agenda', foto: { datos: 'data:image/jpeg;base64,BBBB', credito: 'Ilustración generada con IA' } },
];
const guionDe = (notas) => armarPodcast(notas.map((n) => ({ titular: n.titulo, detalle: '' })), { momento: 'manana', fecha: FECHA });

test('una placa por nota con su foto, el crédito ABAJO de la foto (nunca encima), "i de n" y la lista al final y de tapa', () => {
  const cierre = cierreDePodcast('manana', { fecha: FECHA });
  const s = secuenciaDelRepaso({ titulo: 'El repaso de la mañana', momento: 'manana', fecha: 'Viernes 16 de octubre', notas: NOTAS, cierre });
  assert.equal(s.placas.length, 4, 'tres notas y la lista');
  assert.equal(s.placas[0].marca, null, 'la primera arranca con el video: es el titular más fuerte, lo primero que se ve');
  assert.equal(s.placas[1].marca, NOTAS[1].titulo);
  assert.equal(s.placas[3].marca, cierre, 'la lista entra con el cierre');
  assert.match(s.tapa, /Cuatro noticias|Tres noticias/, 'la tapa es la lista completa');
  const p0 = s.placas[0].svg;
  assert.match(p0, /<image href="data:image\/jpeg;base64,AAAA"/);
  assert.match(p0, /1 de 3/);
  assert.match(p0, /Foto: Acción 5 \(Balcarce\)/);
  // El crédito va debajo de la caja de la foto (epígrafe), no adentro.
  const yFoto = Number(p0.match(/<image[^>]*\sy="(\d+)"/)[1]);
  const altoFoto = Number(p0.match(/<image[^>]*\sheight="(\d+)"/)[1]);
  const yCredito = Number(p0.match(/<text x="\d+" y="(\d+)"[^>]*>Foto: Acción 5/)[1]);
  assert.ok(yCredito > yFoto + altoFoto, 'el crédito queda fuera de la imagen');
  // Sin foto: la placa con el color de la sección y sin <image>.
  assert.ok(!/<image/.test(s.placas[1].svg));
  assert.match(s.placas[1].svg, /fill="#B91C1C"/);
  // Todas se pueden animar con la entrada de siempre.
  for (const p of s.placas) assert.ok(partirSvg(p.svg), 'la placa se puede partir en bloques');
  assert.equal(secuenciaDelRepaso({ titulo: 'x', notas: NOTAS.slice(0, 1) }), null, 'con menos de dos notas no hay repaso');
});

test('el titular largo nunca pisa la foto ni la firma', () => {
  const largo = 'Un titular larguísimo que no termina nunca porque cuenta muchas cosas a la vez sobre la ciudad, el campo, el clima y el fútbol del fin de semana en Balcarce';
  const svg = placaDeNotaDelRepaso({ nota: { titulo: largo, seccion: 'Agro', foto: null }, i: 0, n: 4, titulo: 'El repaso de la tarde' });
  const ys = [...svg.matchAll(/<text x="72" y="(\d+)" font-family="Source Serif 4 60pt"/g)].map((m) => Number(m[1]));
  assert.ok(ys.length >= 3);
  assert.ok(Math.max(...ys) <= 1440, `el último renglón queda en ${Math.max(...ys)}`);
  assert.ok(Math.min(...ys) > 380 + 585, 'debajo de la foto');
});

test('cada placa entra cuando la voz empieza la oración de su nota ("Por otro lado: …"), con los tiempos de las palabras', () => {
  const guion = guionDe(NOTAS);
  const palabras = palabrasSinteticas(guion);
  const t = tiemposDeLasMarcas(palabras, [NOTAS[1].titulo, NOTAS[2].titulo]);
  assert.equal(t.length, 2);
  // El momento es el de la primera palabra del conector, no el del titular.
  const k = palabras.findIndex((p) => p.texto === 'Cortan');
  assert.ok(t[0] < palabras[k].desde, 'entra antes del titular, con el conector');
  assert.ok(t[0] > palabras[k - 5].desde - 0.01);
  assert.ok(t[1] > t[0]);
  assert.equal(tiemposDeLasMarcas(palabras, ['Esto no está en el guion']), null);
  const s = secuenciaDelRepaso({ titulo: 'R', notas: NOTAS, cierre: cierreDePodcast('manana', { fecha: FECHA }) });
  const conTiempos = placasConTiempos(s, palabras, { retardo: 0.25 });
  assert.equal(conTiempos.length, 4);
  assert.equal(conTiempos[0].desde, 0);
  assert.ok(conTiempos.every((p, i) => i === 0 || p.desde > conTiempos[i - 1].desde + 1.4));
  // Si no se encuentra una marca, no hay secuencia (la pieza sale con la lista, como antes).
  assert.equal(placasConTiempos(s, palabrasSinteticas('Buen día. Otra cosa.')), null);
});

test('las fotos: sólo las de la web, nunca una con chicos de la excepción de la regla 186', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repaso-foto-'));
  fs.mkdirSync(path.join(dir, 'web', 'public', 'fotos-notas'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'web', 'public', 'fotos-notas', 'a.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  const nota = { id: 'a', foto: { archivo: 'fotos-notas/a.jpg', credito: 'Foto: X' } };
  assert.match(fotoParaElRepaso(nota, { raiz: dir }).datos, /^data:image\/jpeg;base64,/);
  assert.equal(fotoParaElRepaso(nota, { raiz: dir, banco: { a: { excepcion: 'menorEnActividadOficial' } } }), null);
  assert.equal(fotoParaElRepaso({ id: 'b' }, { raiz: dir }), null, 'sin foto en la web, placa');
  assert.equal(fotoParaElRepaso({ id: 'c', foto: { archivo: '../secreto.jpg' } }, { raiz: dir }), null);
});

test('el plan le da a cada repaso su secuencia, con las notas en el orden de la voz', () => {
  const notas = ['a', 'b', 'c', 'd'].map((id, i) => ({
    id, titulo: ['El Municipio abre la inscripción a los talleres de verano', 'Ferroviarios gana el clásico y queda puntero', 'La cosecha de trigo arranca con buenos rindes', 'Campo de Pato juega la semifinal de rugby'][i], seccion: ['Balcarce', 'Fútbol', 'Agro', 'Deportes'][i], relevancia: 95 - i, local: true, temas: [], como: 'automatica', fecha: '2026-10-16T08:00:00Z', cuerpo: 'Una palabra más para el cuerpo de la nota. '.repeat(12),
  }));
  const { piezas } = planDelDia({ yaPublicadas: true, notas, clima: null, farmacias: { turnos: [] } }, { fecha: FECHA, libro: null, eventos: [], banco: {} });
  const r = piezas.find((p) => p.nombre === 'noticia1');
  assert.ok(r?.secuencia, 'el repaso de la mañana trae su secuencia');
  assert.equal(r.secuencia.placas[0].svg.includes(r.items[0].titulo.split(' ')[0]), true);
  assert.equal(r.secuencia.placas.at(-1).marca && r.guion.trim().endsWith(r.secuencia.placas.at(-1).marca.trim()), true, 'la lista entra con el cierre del guion');
  process.env.REELS_ESCENAS = 'no';
  try { assert.equal(secuenciaDelPlan({ ronda: { nombre: 'x', momento: 'manana', titulo: 'x' }, repaso: { notas, guion: '' }, fecha: FECHA }), null); } finally { delete process.env.REELS_ESCENAS; }
});

test('el video del repaso se arma de verdad (sin publicarlo): una placa por nota, la tapa en el cuadro 0, y no deja restos', async (t) => {
  if (!ffmpeg || !fs.existsSync(ffmpeg)) { t.skip('sin ffmpeg'); return; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repaso-video-'));
  // Una foto de verdad (un color liso) para que resvg la decodifique.
  const jpg = path.join(dir, 'foto.jpg');
  execFileSync(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x2266aa:s=320x200', '-frames:v', '1', jpg]);
  const datos = `data:image/jpeg;base64,${fs.readFileSync(jpg).toString('base64')}`;
  const notas = [
    { titulo: 'Ferroviarios gana el Apertura', seccion: 'Fútbol', foto: { datos, credito: 'Foto: Acción 5' } },
    { titulo: 'Cortan el agua en el centro', seccion: 'Balcarce', foto: null },
  ];
  const guion = guionDe(notas);
  const cierre = cierreDePodcast('manana', { fecha: FECHA });
  const secuencia = secuenciaDelRepaso({ titulo: 'El repaso de la mañana', momento: 'manana', notas, cierre });
  const palabras = palabrasSinteticas(guion);
  const duracion = palabras.at(-1).hasta;
  const pedidos = [];
  const hablar = async (_texto, mp3, opciones) => {
    pedidos.push(opciones);
    execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', `sine=frequency=330:duration=${duracion.toFixed(2)}`, '-c:a', 'libmp3lame', mp3], { stdio: 'ignore' });
    return { palabras, duracion };
  };
  const r = await armarReel({
    nombre: 'noticia1', svg: secuencia.tapa, secuencia, guion, acento: '#C7381C', hablar, reservarVoz: 2,
  }, dir);
  assert.ok(fs.existsSync(r.mp4) && fs.statSync(r.mp4).size > 20000, 'el video existe');
  const real = await medirDuracion(r.mp4);
  assert.ok(Math.abs(real - (duracion + 1.65)) < 1.5, `dura ${real}`);
  assert.equal(pedidos[0].pieza, 'noticia1', 'la voz sabe qué pieza es (para el contador)');
  assert.equal(pedidos[0].reservar, 2, 'y cuántos audios guardar para las más importantes');
  assert.deepEqual(fs.readdirSync(dir).filter((f) => /-a\d+-\d{3}\.png$|-base\.mp4$|-s\d+\.png$/.test(f)), [], 'sin cuadros ni restos');
  // El cuadro 0 es la tapa (la lista, fondo papel claro) y a los 2 s ya está la primera nota con su foto azul.
  const cuadro = (seg) => {
    const png = path.join(dir, `c-${seg}.raw`);
    execFileSync(ffmpeg, ['-y', '-v', 'error', '-ss', String(seg), '-i', r.mp4, '-frames:v', '1', '-vf', 'crop=200:120:440:560,scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', png]);
    return [...fs.readFileSync(png)];
  };
  const [r0, g0, b0] = cuadro(0);
  const [r2, g2, b2] = cuadro(2);
  assert.ok(b2 > r2 + 40, `a los 2 s se ve la foto (azul): ${r2},${g2},${b2}`);
  assert.ok(r0 > 200 && g0 > 200, `el cuadro 0 es la tapa sobre papel: ${r0},${g0},${b0}`);
});
