// Pruebas de la comparación de formatos nuevo contra viejo. Sin red: el cliente de Meta es de mentira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tipoDePieza, franjaDeLaHora, filasDeD1, publicacionesDeLasFilas, valorDeInsight, insightsDeUna, medirPublicaciones, claseDelCociente,
  compararGrupos, veredicto, armarInforme, textoParaTelegram, compararFormatos, MIN_PIEZAS,
} from './comparar-formatos.mjs';

const AHORA = new Date('2026-11-23T15:00:00Z');

let n = 0;
const fila = ({ pieza = 'noticia1', actualizada, marca = null, red = 'facebook', tipo = 'REELS', id, simulado = 0, duracion = 40 }) => ({
  pieza, simulado, estado: 'publicada', creada: actualizada, actualizada, duracion,
  archivos: JSON.stringify([`${pieza}.mp4`, `${pieza}.json`, ...(marca ? [marca] : [])]),
  acciones: JSON.stringify([{ red, tipo, estado: 'ok', id: id ?? `${100000000 + (n += 1)}` }]),
});

test('tipos y franjas', () => {
  assert.equal(tipoDePieza('podcast'), 'repaso de la noche');
  assert.equal(tipoDePieza('aviso-viento'), 'aviso de clima');
  assert.equal(tipoDePieza('6a1b-nota-de-hernan'), 'nota propia');
  assert.equal(franjaDeLaHora(7), 'mañana');
  assert.equal(franjaDeLaHora(15), 'tarde');
  assert.equal(franjaDeLaHora(21), 'noche');
});

test('filasDeD1 entiende lo que devuelve wrangler', () => {
  const f = [{ pieza: 'x' }];
  assert.deepEqual(filasDeD1(JSON.stringify([{ results: f, success: true }])), f);
  assert.deepEqual(filasDeD1(`algo de wrangler\n${JSON.stringify([{ results: f }])}`), f);
  assert.deepEqual(filasDeD1(JSON.stringify(f)), f);
});

test('separa viejo y nuevo: marca, ids conocidos, sin marca después del corte (supuesto), simulado y antiguo afuera', () => {
  const filas = [
    fila({ actualizada: '2026-11-15T13:00:00Z' }), // viejo
    fila({ actualizada: '2026-11-05T13:00:00Z' }), // más de 7 días antes: no entra
    fila({ actualizada: '2026-11-20T13:00:00Z', marca: 'kit3:si' }), // nuevo
    fila({ actualizada: '2026-11-20T13:00:00Z', marca: 'kit3:no' }), // cayó al dibujo viejo
    fila({ actualizada: '2026-11-20T00:09:00Z', id: '1405368464859882', pieza: 'podcast' }), // conocida
    fila({ actualizada: '2026-11-21T13:00:00Z' }), // sin marca, después del corte: supuesto nuevo
    fila({ actualizada: '2026-11-21T13:00:00Z', simulado: 1, marca: 'kit3:si' }), // ensayo: no
    fila({ actualizada: '2026-11-21T13:00:00Z', tipo: 'CAROUSEL' }), // no es reel ni historia
  ];
  const p = publicacionesDeLasFilas(filas, { ahora: AHORA });
  assert.equal(p.length, 5);
  assert.deepEqual(p.map((x) => x.lado), ['viejo', 'nuevo', 'viejo', 'nuevo', 'nuevo']);
  assert.deepEqual(p.map((x) => x.kit3Origen), ['anterior', 'marca', 'marca', 'conocida', 'supuesto']);
  assert.equal(p[4].franja, 'mañana');
  assert.equal(p[3].franja, 'noche'); // 00:09 UTC = 21:09 en Balcarce
});

test('valorDeInsight: número, total_value, objeto de reacciones y vacío', () => {
  assert.equal(valorDeInsight({ data: [{ values: [{ value: 7 }] }] }), 7);
  assert.equal(valorDeInsight({ data: [{ total_value: { value: 9 } }] }), 9);
  assert.equal(valorDeInsight({ data: [{ values: [{ value: { like: 3, love: 2 } }] }] }), 5);
  assert.equal(valorDeInsight({ data: [] }), null);
});

test('insightsDeUna prueba nombres alternativos, anota las fallas, pasa ms a segundos y calcula la retención', async () => {
  const pedidos = [];
  const cliente = {
    async pedir(camino, { params }) {
      pedidos.push(`${camino}:${params.metric}`);
      if (params.metric === 'views') throw new Error('(#100) metric no longer supported');
      if (params.metric === 'plays') return { data: [{ values: [{ value: 120 }] }] };
      if (params.metric === 'ig_reels_avg_watch_time') return { data: [{ values: [{ value: 12000 }] }] };
      if (params.metric === 'reach') return { data: [{ values: [{ value: 80 }] }] };
      throw new Error('no existe');
    },
  };
  const pub = { red: 'instagram', formato: 'reel', id: '17953783629057303', duracion: 40 };
  const r = await insightsDeUna(cliente, pub);
  assert.equal(r.metricas.reproducciones, 120);
  assert.equal(r.metricas.alcance, 80);
  assert.equal(r.metricas.tiempo_prom, 12);
  assert.equal(r.metricas.retencion, 30);
  assert.ok(pedidos.includes('17953783629057303/insights:views') && pedidos.includes('17953783629057303/insights:plays'));
  assert.ok(r.fallas.some((f) => /guardados/.test(f)));
  assert.ok(!r.fallas.some((f) => /reproducciones/.test(f)));
});

test('medirPublicaciones deja afuera lo que no tiene la edad mínima y no repite fallas', async () => {
  const cliente = { async pedir() { throw new Error('nada'); } };
  const mk = (edadHoras) => ({ red: 'facebook', formato: 'reel', id: '123456789012', tipo: 't', edadHoras, duracion: null });
  const r = await medirPublicaciones(cliente, [mk(30), mk(40), mk(5)], { edadMinHoras: 24 });
  assert.equal(r.medidas.length, 2);
  assert.equal(r.sinEdad.length, 1);
  const unaPorMetrica = new Set(r.fallas.map((f) => f.split(' (')[0]));
  assert.equal(r.fallas.length, unaPorMetrica.size);
});

test('clases del cociente (criterio de Hernán)', () => {
  assert.equal(claseDelCociente(2), 'duplica');
  assert.equal(claseDelCociente(1.5), 'mejora');
  assert.equal(claseDelCociente(1.15), 'mejora');
  assert.equal(claseDelCociente(1), 'igual');
  assert.equal(claseDelCociente(0.85), 'igual');
  assert.equal(claseDelCociente(0.84), 'peor');
  assert.equal(claseDelCociente(null), null);
});

/** Medidas armadas a mano: `cuantas` piezas de un lado con reproducciones fijas. */
const medidas = (tipo, red, lado, valores, { hora = 10, edad = 48, tiempo = 10 } = {}) => valores.map((v) => ({
  tipo, red, formato: 'reel', lado, hora, franja: franjaDeLaHora(hora), finDeSemana: false, edadHoras: edad, kit3Origen: lado === 'nuevo' ? 'marca' : 'anterior',
  metricas: { reproducciones: v, tiempo_prom: tiempo },
}));

test('agrupa por tipo y red sin mezclar y avisa de las pocas piezas', () => {
  const m = [
    ...medidas('repaso de la mañana', 'facebook', 'viejo', [100, 100, 100]), ...medidas('repaso de la mañana', 'facebook', 'nuevo', [250, 250, 250]),
    ...medidas('clima de la noche', 'facebook', 'viejo', [5, 5, 5]), ...medidas('clima de la noche', 'facebook', 'nuevo', [50, 50], { hora: 20 }),
  ];
  const g = compararGrupos(m);
  assert.equal(g.length, 2);
  const rep = g.find((x) => x.tipo === 'repaso de la mañana');
  assert.equal(rep.cociente, 2.5);
  assert.equal(rep.clase, 'duplica');
  assert.ok(rep.suficiente);
  const clima = g.find((x) => x.tipo === 'clima de la noche');
  assert.equal(clima.suficiente, false);
  assert.equal(clima.clase, null);
  assert.match(clima.avisos.join(' '), /pocas piezas/);
  assert.match(clima.avisos.join(' '), /horario difiere/);
  assert.ok(MIN_PIEZAS === 3);
});

const grupoDe = (red, tipo, viejo, nuevo, opciones) => compararGrupos([...medidas(tipo, red, 'viejo', [viejo, viejo, viejo], opciones), ...medidas(tipo, red, 'nuevo', [nuevo, nuevo, nuevo], opciones)]);

test('veredicto: seguir sólo si en las dos redes la mayoría duplica', () => {
  const g = [...grupoDe('facebook', 'a', 100, 220), ...grupoDe('facebook', 'b', 100, 300), ...grupoDe('instagram', 'a', 100, 210), ...grupoDe('instagram', 'b', 100, 90)];
  // Instagram: 1 duplica y 1 igual → no es mayoría
  assert.equal(veredicto(g).clave, 'no-justifica');
  const g2 = [...grupoDe('facebook', 'a', 100, 220), ...grupoDe('instagram', 'a', 100, 250)];
  assert.equal(veredicto(g2).clave, 'seguir');
});

test('veredicto: igual o mejora → no justifica; peor → volver; sin datos y una sola red', () => {
  assert.equal(veredicto([...grupoDe('facebook', 'a', 100, 130), ...grupoDe('instagram', 'a', 100, 100)]).clave, 'no-justifica');
  assert.equal(veredicto([...grupoDe('facebook', 'a', 100, 130), ...grupoDe('instagram', 'a', 100, 60), ...grupoDe('instagram', 'b', 100, 50)]).clave, 'volver');
  assert.equal(veredicto([]).clave, 'sin-datos');
  assert.equal(veredicto(grupoDe('facebook', 'a', 100, 300)).clave, 'parcial');
});

test('veredicto por caída: más de 30 % en 2 tipos → conviene volver; entre 15 y 30 → hay que mirar', () => {
  const v = veredicto([...grupoDe('facebook', 'a', 100, 60), ...grupoDe('facebook', 'b', 100, 65), ...grupoDe('instagram', 'a', 100, 80)]);
  assert.equal(v.redes.facebook.porCaida, 'conviene volver al anterior');
  assert.equal(v.redes.instagram.porCaida, 'hay que mirar');
  const v2 = veredicto([...grupoDe('facebook', 'a', 100, 90)]);
  assert.equal(v2.redes.facebook.porCaida, 'el nuevo rinde igual o mejor');
});

test('el informe avisa siempre cuando se mezclan franjas, y el texto de Telegram entra en 15 líneas', () => {
  const m = [
    ...medidas('repaso de la mañana', 'facebook', 'viejo', [300, 320, 280], { hora: 10, edad: 150 }), ...medidas('repaso de la mañana', 'facebook', 'nuevo', [700, 650, 800], { hora: 10, edad: 40 }),
    ...medidas('repaso de la noche', 'facebook', 'viejo', [3, 2, 3], { hora: 21, edad: 150 }), ...medidas('repaso de la noche', 'facebook', 'nuevo', [5, 5, 4], { hora: 21, edad: 40 }),
    ...medidas('repaso de la mañana', 'instagram', 'viejo', [100, 100, 100]), ...medidas('repaso de la mañana', 'instagram', 'nuevo', [90, 100, 95]),
  ];
  const inf = armarInforme({ medidas: m, fallas: ['facebook/reel vistas_3s (x)'], desde: '2026-11-20', ahora: AHORA });
  assert.ok(inf.avisos.some((a) => /franjas horarias distintas/.test(a)));
  assert.ok(inf.avisos.some((a) => /favorece al formato viejo/.test(a)));
  const t = textoParaTelegram(inf);
  assert.ok(t.split('\n').length <= 15);
  assert.match(t, /VEREDICTO/);
  assert.match(t, /no cambio nada solo/);
  assert.equal(inf.conteo.nuevas, 9);
});

test('compararFormatos de punta a punta con un Meta de mentira', async () => {
  const filas = [];
  for (const dia of [14, 15, 16]) filas.push(fila({ actualizada: `2026-11-${dia}T13:00:00Z` }));
  for (const dia of [20, 21, 21]) filas.push(fila({ actualizada: `2026-11-${dia}T13:00:00Z`, marca: 'kit3:si' }));
  const cliente = {
    async pagina() { return { tokenPagina: 'TOKEN-SECRETO' }; },
    async pedir(camino, { conToken, params }) {
      assert.equal(conToken, 'TOKEN-SECRETO');
      if (params.metric === 'blue_reels_play_count') return { data: [{ values: [{ value: camino.length > 0 ? 100 : 0 }] }] };
      throw new Error('sin permiso');
    },
  };
  const inf = await compararFormatos({ filas, cliente, ahora: AHORA });
  assert.equal(inf.grupos.length, 1);
  assert.equal(inf.grupos[0].cociente, 1);
  assert.equal(inf.veredicto.redes.facebook.mayoria, 'igual-o-mejora');
  assert.equal(inf.veredicto.clave, 'parcial');
  assert.ok(inf.fallas.length > 0);
  assert.ok(!JSON.stringify(inf).includes('TOKEN-SECRETO'));
});
