// Las convocatorias «Participá» del kit 3.0 (20/11/2026): el adaptador y los datos fijos. Sin red, sin Chrome, sin voz. El dibujo real se mira con `ensayo-participa.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { aplicaKit3, desdePieza } from './desde-pieza.mjs';
import { armarParticipa } from '../piezas/armadores.mjs';
import { ALCANCE_PARTICIPA } from '../piezas/variables.mjs';
import { PIEZAS_DEL_DIA } from '../piezas-del-dia.mjs';
import { FOTOS_PARTICIPA, PIEZAS_DEL_KIT } from './variables.mjs';

const AQUI = import.meta.dirname;
const PIEZAS = [['noticia', null], ['nota', null], ['evento', null], ['marca', 'a'], ['marca', 'b']];
const armar = (v, d) => armarParticipa(v, { hora: 17, saludo: null, ...(d ? { diseno: d } : {}) });

test('el kit dibuja las cuatro convocatorias (el reclamo y la encuesta del viejo, no)', () => {
  for (const id of ['participa-noticia', 'participa-nota', 'participa-evento', 'participa-marca']) assert.ok(PIEZAS_DEL_KIT.includes(id), id);
  assert.ok(aplicaKit3(armar('noticia')));
  assert.ok(!aplicaKit3(armarParticipa('reclamo', { hora: 17, saludo: null })));
  assert.ok(!aplicaKit3(armarParticipa('encuesta', { hora: 17, saludo: null })));
});

test('cada variante: marcas en orden creciente y antes del contacto, contacto al final, sin fotos descargadas, subtítulos desde después de la pregunta', () => {
  for (const [v, d] of PIEZAS) {
    const pieza = armar(v, d);
    const r = desdePieza(pieza);
    assert.equal(r.plantilla, 'participa');
    assert.deepEqual(r.fotos, []);
    const m = Object.values(r.datos.m);
    assert.ok(m.every((t, i) => i === 0 || t >= m[i - 1]), `${v}: las marcas crecen`);
    const c = Object.values(r.datos.c);
    assert.ok(c.every((t, i) => i === 0 || t > c[i - 1]), `${v}: el contacto crece`);
    assert.ok(r.dur > r.datos.c.espacio, `${v}: el video dura más que la última marca`);
    assert.equal(r.datos.whatsapp, '2266 51-1612');
    assert.equal(r.datos.mail, 'redaccion@radarbalcarce.com');
    assert.match(r.guion, /Radar Balcarce es tu espacio\.$/);
    assert.ok(r.palabras[0].w.length > 0 && r.palabras.length < pieza.guion.split(/\s+/).length, `${v}: los subtítulos saltean la pregunta escrita en pantalla`);
    assert.equal(r.rotulo.top, 91);
  }
});

test('«¿Viste algo?»: cuatro fotos fijas del kit (archivos que existen), con crédito para el posteo y la respuesta antes del contacto', () => {
  assert.equal(FOTOS_PARTICIPA.length, 4);
  for (const f of FOTOS_PARTICIPA) {
    assert.ok(fs.existsSync(path.join(AQUI, 'fotos-participa', `${f.id}.jpg`)), f.id);
    assert.ok(f.credito, `${f.id} sin crédito`);
  }
  const r = desdePieza(armar('noticia'));
  assert.deepEqual(r.datos.fotos.map((f) => f.id), FOTOS_PARTICIPA.map((f) => f.id));
  assert.deepEqual(r.creditosFijos.sort(), ['Diario La Vanguardia', 'Municipalidad de Balcarce', 'Radio Gabal (FM 104.1)']);
  assert.ok(r.datos.tFotos.every((t, i) => i === 0 || t > r.datos.tFotos[i - 1]));
  assert.ok(r.datos.tFotos.at(-1) < r.datos.tRespuesta && r.datos.tRespuesta < r.datos.c.escribinos);
  assert.ok(!r.datos.resto.some((w) => /^[A-Z]/.test(w.w) && /algo/i.test(w.w)));
});

test('«Sumá tu marca»: los números salen de ALCANCE_PARTICIPA (tabla estadisticas), el aviso es de ejemplo («Tu comercio acá») y el cierre en pantalla es el pedido', () => {
  for (const d of ['a', 'b']) {
    const r = desdePieza(armar('marca', d));
    assert.equal(r.datos.variante, d === 'a' ? 'marcaA' : 'marcaB');
    assert.deepEqual([r.datos.alcance.paginasVistas, r.datos.alcance.fbAlcance, r.datos.alcance.igAlcance], [ALCANCE_PARTICIPA.paginasVistas, ALCANCE_PARTICIPA.fbAlcance, ALCANCE_PARTICIPA.igAlcance]);
    assert.deepEqual(r.datos.cierre, ['Tu comercio,', 'en el medio de', 'Balcarce']);
  }
  assert.ok(ALCANCE_PARTICIPA.paginasVistas > 0 && ALCANCE_PARTICIPA.dias === 14);
  const fuente = fs.readFileSync(path.join(AQUI, 'plantillas', 'participa.js'), 'utf8');
  assert.match(fuente, /Tu comercio acá/);
});

test('con la voz real (palabras alineadas) las marcas siguen a la voz', () => {
  const pieza = armar('evento');
  const palabras = pieza.guion.split(/\s+/).map((w, i) => ({ texto: w.replace(/[.,?¿]/g, ''), desde: 1 + i * 0.5, hasta: 1.4 + i * 0.5, ...(/[.?]$/.test(w) ? { finFrase: true } : {}) }));
  const r = desdePieza(pieza, { palabras });
  assert.equal(r.estimado, false);
  assert.ok(r.datos.m.que > r.datos.m.comercio && r.datos.m.agenda < r.datos.c.escribinos);
  assert.ok(Math.abs(r.datos.m.organizas - 0.88) < 0.01, 'la primera palabra de la voz (a 1 s) menos 0,12');
});

test('la tabla de piezas: tres convocatorias aprobadas y la de marca, a las 17:00 de lunes a viernes, voz baja, todo en pausa hasta que Hernán lo prenda', () => {
  const filas = PIEZAS_DEL_DIA.filter((p) => ['participa-noticias', 'participa-nota', 'participa-evento', 'participa-marca'].includes(p.id));
  assert.equal(filas.length, 4);
  const porDia = {};
  for (const p of filas) { assert.equal(p.hora, '17:00'); assert.equal(p.ventana, 60); assert.equal(p.voz, 5); assert.equal(p.margenDeVoz, 2); assert.equal(p.pausada, true); for (const d of p.dias) porDia[d] = p.id; }
  assert.deepEqual(porDia, { 1: 'participa-noticias', 2: 'participa-nota', 3: 'participa-evento', 4: 'participa-marca', 5: 'participa-noticias' });
  assert.ok(!filas.some((p) => p.dias.includes(6) || p.dias.includes(0)), 'el sábado es de Teléfonos útiles');
});

// ------------------------------------------------------------------ la música de fondo (preparada, apagada)

test('música: apagada por defecto; con MUSICA_3_0 sólo suena en las convocatorias y si el archivo existe; los cuatro temas están normalizados y con licencia anotada', async () => {
  const { rutaDeLaMusica } = await import('./kit3.mjs');
  const { MUSICA_DEL_KIT } = await import('./variables.mjs');
  assert.equal(rutaDeLaMusica('participa-noticia', {}), null);
  assert.equal(rutaDeLaMusica('clima', { MUSICA_3_0: 'si' }), null);
  for (const id of ['participa-noticia', 'participa-nota', 'participa-evento', 'participa-marca']) {
    const ruta = rutaDeLaMusica(id, { MUSICA_3_0: 'si' });
    assert.ok(ruta && fs.existsSync(ruta), id);
    assert.ok(fs.statSync(ruta).size < 700 * 1024, `${id}: tema chico`);
  }
  const lic = fs.readFileSync(path.join(AQUI, '..', 'musica', 'LICENCIAS.md'), 'utf8');
  for (const t of Object.values(MUSICA_DEL_KIT.temas)) assert.ok(lic.includes(t), `${t} sin licencia anotada`);
});

test('música: la mezcla baja la cama bajo la voz, con fundido al entrar y al salir, y sin música todo queda como antes', async () => {
  const { argumentosDeMezcla } = await import('./kit3.mjs');
  const sin = argumentosDeMezcla({ crudo: 'c.mp4', voz: 'v.wav', destino: 'd.mp4', total: 15 });
  assert.ok(!sin.join(' ').includes('amix'));
  const con = argumentosDeMezcla({ crudo: 'c.mp4', voz: 'v.wav', destino: 'd.mp4', total: 15, musica: 'm.mp3' }).join(' ');
  assert.match(con, /-stream_loop -1 -i m\.mp3/);
  assert.match(con, /volume=-10dB/);
  assert.match(con, /afade=t=in:st=0:d=0\.5/);
  assert.match(con, /afade=t=out:st=14\.00:d=1/);
  assert.match(con, /amix=inputs=2:duration=first:dropout_transition=0:normalize=0/);
  const muda = argumentosDeMezcla({ crudo: 'c.mp4', destino: 'd.mp4', total: 15, musica: 'm.mp3' }).join(' ');
  assert.match(muda, /volume=-3dB/);
  assert.ok(!muda.includes('amix'));
});
