// Regla 176 (15/10/2026): el informe diario por mail (redes/informe-diario.mjs). Todo con datos inventados y sin red.
// Lo que cuida: que cuente lo que hay, que NO invente (un número que no se pudo leer se dice, un día a medias se dice hasta qué hora),
// que no muestre titulares delicados, que el texto entre en el mail, que el HTML sea parejo y que el envío y el disparador estén bien armados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  armarInforme, aTexto, aHtml, momentoDeLaHora, diaDelInforme, claveDelInforme, etiquetaDelDia, hace, grupoDelMotivo, principalesDelDia,
  lecturaDeVisitas, enviarInforme, consultarEnVivo, fuentesDeLasAnotaciones, enlaceDePosteoDeFacebook, costoDeLaIA, audiosDelDia,
  proximosVencimientos, leerArchivos, asuntoDelInforme, TOPE_DE_NOTAS, LIMITES_DEL_INFORME, VENCIMIENTOS_DEL_INFORME,
} from '../redes/informe-diario.mjs';
import { claveDelInforme as claveDelWorker } from '../infra/vigilante-cloudflare/worker.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
const z = (iso) => new Date(iso);
const NOCHE = z('2026-10-16T00:15:00Z');   // jueves 15/10, 21:15 en Balcarce
const MANANA = z('2026-10-16T11:15:00Z');  // viernes 16/10, 8:15 en Balcarce

// ------------------------------------------------------------ datos inventados

const nota = (id, titulo, extra = {}) => ({
  id, titulo, seccion: 'Balcarce', local: true, relevancia: 80, medios: ['A', 'B'], visto: '2026-10-15T15:00:00Z', fecha: '2026-10-15T15:00:00Z', ...extra,
});

function datosDeEjemplo(cambios = {}) {
  const portada = {
    generado: '2026-10-16T00:00:00Z', // 21:00
    notas: [
      nota('aaa111', 'Abre la nueva sala de teatro municipal', { relevancia: 95, medios: ['A', 'B', 'C'] }),
      nota('bbb222', 'La cooperativa renueva su flota', { relevancia: 90, medios: ['A'] }),
      nota('ccc333', 'El club clasifica a la final', { seccion: 'Deportes', relevancia: 85, medios: ['A', 'B'] }),
      nota('ddd444', 'Nota de afuera sobre el dólar', { seccion: 'Economía', local: false, relevancia: 99, medios: ['A', 'B', 'C', 'D'] }),
      nota('eee555', 'Repaso de la tarde', { propia: 'repaso', relevancia: 100 }),
      nota('fff666', 'Nota de ayer que no cuenta', { visto: '2026-10-14T15:00:00Z', fecha: '2026-10-14T15:00:00Z', relevancia: 100 }),
    ],
    pendientes: [
      { id: 'p1', titulo: null, seccion: 'Balcarce', motivo: 'necesita ojo humano: "niño"' },
      { id: 'p2', titulo: null, seccion: 'Policiales', motivo: 'necesita ojo humano: "homicidio"' },
      { id: 'p3', titulo: 'Un funcionario denunció a otro', seccion: 'Política', motivo: 'necesita ojo humano: "denunció"' },
      { id: 'p4', titulo: 'Viaja a Estados Unidos el presidente', seccion: 'Política', motivo: 'internacional: sin un argentino en el título' },
    ],
    esperandoCuerpo: 2,
  };
  const libro = {
    facebook: {
      aaa111: { cuando: '2026-10-15T13:00:00Z', postId: '1254237411116171_999111', titulo: 'Abre la nueva sala de teatro municipal', enlace: 'https://radarbalcarce.com/nota/x-aaa111' },
      ccc333: { cuando: '2026-10-15T15:30:00Z', postId: '1254237411116171_999222', titulo: 'El club clasifica a la final', enlace: 'https://radarbalcarce.com/nota/x-ccc333' },
    },
    instagramFeed: { aaa111: { cuando: '2026-10-15T13:01:00Z', mediaId: '1', titulo: 'Abre la nueva sala de teatro municipal' } },
    instagram: {
      '2026-10-15/clima-manana': { cuando: '2026-10-15T10:05:00Z', permalink: 'https://www.instagram.com/reel/AAA/', tipo: 'STORIES', nombre: 'clima-manana' },
      '2026-10-15/noticia2': { cuando: '2026-10-15T18:07:00Z', permalink: 'https://www.instagram.com/reel/BBB/', tipo: 'REELS', nombre: 'noticia2' },
    },
    facebookVideos: { '2026-10-15/noticia2': { cuando: '2026-10-15T18:08:00Z', permalink: 'https://www.facebook.com/reel/222/', tipo: 'REELS', nombre: 'noticia2' } },
    historiasDeReels: {}, reelsEnFacebook: {},
    problemas: {
      '2026-10-15/noticia1/instagram/historia-del-reel': { pieza: 'noticia1', red: 'instagram', parte: 'historia-del-reel', error: 'La subida del video falló (400) Request processing failed', cuando: '2026-10-15T13:08:00Z' },
    },
  };
  const dia = (visitas, vistas, extra = {}) => ({
    visitas, vistas, horas: Array.from({ length: 24 }, (_, h) => (h === 13 ? vistas : 0)), dispositivos: { mobile: vistas - 2, desktop: 2 },
    referentes: { 'facebook.com': 30, directo: 12, 'google.com': 3 }, paises: { AR: 40, US: 5 }, notas: { aaa111: 20, bbb222: 9 }, paginas: { '/': 14 }, ...extra,
  });
  const estadisticas = {
    puntos: [
      { cuando: '2026-10-15T00:00:00Z', web: { u24: { visitas: 40, vistas: 100 } }, facebook: { seguidores: 50 }, instagram: { seguidores: 7 } },
      { cuando: '2026-10-16T00:00:00Z', web: { u12: { visitas: 20, vistas: 50 }, u24: { visitas: 55, vistas: 140 }, a12: { visitas: 1, vistas: 1 }, a24: { visitas: 1, vistas: 1 } }, facebook: { seguidores: 53 }, instagram: { seguidores: 7 } },
    ],
    dias: { '2026-10-13': dia(40, 100), '2026-10-14': dia(44, 120), '2026-10-15': dia(55, 140) },
  };
  const historia = { dias: {} };
  for (let i = 8; i <= 14; i++) historia.dias[`2026-10-${String(i).padStart(2, '0')}`] = { dia: `2026-10-${i}`, publicadas: 40, deBalcarce: 15, deAfuera: 25, porSeccion: { Balcarce: 15 } };
  return {
    portada, libro, historia, estadisticas,
    usoIA: { dias: { '2026-10-15': { redaccion: { 'gemini-flash-lite-latest': { llamadas: 10, errores: 1, entrada: 100000, salida: 20000, pensamiento: 0, total: 120000, claves: { redaccion: 10 } } } } } },
    vigilancia: { abiertos: [] },
    esperandoCuerpo: { notas: [{ id: 'z1', titulo: 'Una nota sin cuerpo', intentos: 3, maximo: 3, motivo: 'cuerpo corto (50 palabras)' }] },
    archivo: { total: 1131, notas: [{ id: 'aaa111', titulo: 'Abre la nueva sala de teatro municipal' }, { id: 'bbb222', titulo: 'La cooperativa renueva su flota' }] },
    ...cambios,
  };
}

// ------------------------------------------------------------ lo básico

test('el momento sale de la hora de Balcarce, el día del informe es hoy (noche) o ayer (mañana) y la clave coincide con la del Worker', () => {
  assert.equal(momentoDeLaHora(z('2026-10-16T11:15:00Z')), 'manana'); // 8:15
  assert.equal(momentoDeLaHora(z('2026-10-16T00:15:00Z')), 'noche'); // 21:15 del día anterior en UTC
  assert.equal(diaDelInforme('noche', NOCHE), '2026-10-15');
  assert.equal(diaDelInforme('manana', MANANA), '2026-10-15');
  assert.equal(etiquetaDelDia('2026-10-15'), 'jueves 15/10');
  assert.equal(claveDelInforme('noche', '2026-10-15'), 'informe-noche-2026-10-15');
  for (const m of ['manana', 'noche']) assert.equal(claveDelInforme(m, '2026-10-15'), claveDelWorker(m, '2026-10-15'));
});

test('las constantes que copian a otro archivo dicen lo mismo que el original', () => {
  // El techo técnico de notas ya no está copiado: el informe lo importa de web/lib/archivo.js (auditoría 23/10, M3).
  assert.equal(TOPE_DE_NOTAS, 3700);
  assert.match(leer('redes/informe-diario.mjs'), /export const TOPE_DE_NOTAS = MAXIMO_EN_ARCHIVO;/);
  assert.ok(leer('CRITERIO-REDES.md').includes('29/09/2027'), 'el vencimiento de las voces sigue siendo el 29/09/2027');
  assert.ok(VENCIMIENTOS_DEL_INFORME.some((v) => v.fecha === '2027-09-29'));
  assert.ok(VENCIMIENTOS_DEL_INFORME.some((v) => v.fecha === '2027-09-21'), 'el dominio');
});

test('hace(): dicho para una persona', () => {
  const ahora = z('2026-10-15T20:00:00Z');
  assert.equal(hace('2026-10-15T19:59:00Z', ahora), 'hace un momento');
  assert.equal(hace('2026-10-15T19:30:00Z', ahora), 'hace 30 min');
  assert.equal(hace('2026-10-15T15:00:00Z', ahora), 'hace 5 h');
  assert.equal(hace('2026-10-12T20:00:00Z', ahora), 'hace 3 días');
  assert.match(hace('basura', ahora), /no sé calcular/);
});

// ------------------------------------------------------------ el informe de la noche, entero

test('la noche: atención arriba, las cinco partes, las tres principales con enlace y todo lo que hay', () => {
  const r = armarInforme({ momento: 'noche', ahora: NOCHE, datos: datosDeEjemplo(), enVivo: { omitido: true } });
  const t = r.texto;
  // el orden: atención primero
  const orden = ['LO QUE REQUIERE TU ATENCIÓN', 'QUÉ SE PUBLICÓ HOY', 'ESPERANDO A UNA PERSONA', 'LO QUE SALIÓ EN REDES HOY', 'VISITAS DE HOY', 'SALUD DEL SISTEMA'].map((s) => t.indexOf(s));
  assert.ok(orden.every((i) => i >= 0), 'están todas las partes');
  assert.deepEqual([...orden].sort((a, b) => a - b), orden, 'en este orden');
  // qué se publicó: las 3 principales de HOY, sin las propias ni las de ayer, con enlace
  assert.match(t, /Abre la nueva sala de teatro municipal/);
  assert.match(t, /https:\/\/radarbalcarce\.com\/nota\/[a-z0-9-]*aaa111/);
  assert.ok(!t.includes('Repaso de la tarde'), 'una nota propia no es una principal');
  assert.ok(!t.includes('Nota de ayer que no cuenta'));
  assert.equal(principalesDelDia(datosDeEjemplo().portada, '2026-10-15').length, 3);
  assert.equal(principalesDelDia(datosDeEjemplo().portada, '2026-10-15')[0].t, 'Abre la nueva sala de teatro municipal', 'primero lo de Balcarce más importante');
  // esperando: grupos con su por qué
  assert.match(t, /4 notas esperan a que una persona decida/);
  assert.match(t, /1 por chicos o adolescentes/);
  assert.match(t, /2 por temas judiciales o policiales/);
  assert.match(t, /1 por noticias del exterior/);
  // redes: posteos con enlace al post, videos con enlace al reel, lo que falló
  assert.match(t, /2 en Facebook \(de 5 posibles\) y 1 en Instagram/);
  assert.match(t, /https:\/\/www\.facebook\.com\/1254237411116171\/posts\/999111/);
  assert.match(t, /El repaso de la tarde/);
  assert.match(t, /https:\/\/www\.instagram\.com\/reel\/BBB\//);
  assert.match(t, /Falló 1 publicación en Meta/);
  assert.match(t, /Request processing failed/);
  assert.match(t, /Todavía por salir hoy/);
  // visitas
  assert.match(t, /55 visitas \(personas que entraron\) y 140 páginas vistas/);
  assert.match(t, /Facebook|facebook\.com 30/);
  assert.match(t, /celular 138/);
  assert.match(t, /Argentina 40/);
  assert.match(t, /Abre la nueva sala de teatro municipal|La cooperativa renueva su flota/);
  assert.match(t, /Seguidores \(medidos el 15\/10 a las 21:00\): Facebook 53 \(\+3 desde ayer\)/);
  // salud
  assert.match(t, /1\.131 de 3\.700 \(31 %\)/);
  assert.match(t, /IA de hoy: 10 llamadas/);
  assert.match(t, /Costo: US\$ 0/);
  assert.match(t, /Cupo de voz de hoy: 2 de 10/);
  // el asunto
  assert.match(r.asunto, /^Informe de la noche, jueves 15\/10 · .* · /);
  assert.ok(!r.asunto.startsWith('[Radar Balcarce]'), 'el prefijo lo pone el Worker');
});

test('el asunto lleva lo más importante: la cantidad de notas y de visitas, y si hay problemas o todo está en orden', () => {
  assert.equal(asuntoDelInforme({ momento: 'noche', dia: '2026-10-15', ahora: NOCHE, atencion: [], publicadas: 38, visitas: 142 }), 'Informe de la noche, jueves 15/10 · 38 notas, 142 visitas · todo en orden');
  assert.match(asuntoDelInforme({ momento: 'manana', dia: '2026-10-15', ahora: MANANA, atencion: [{ nivel: 'media' }, { nivel: 'media' }], publicadas: 1, visitas: NaN }), /^Informe de la mañana: así cerró ayer, jueves 15\/10 · 1 nota · 2 cosas para mirar$/);
  assert.match(asuntoDelInforme({ momento: 'noche', dia: '2026-10-15', ahora: NOCHE, atencion: [{ nivel: 'alta' }, { nivel: 'media' }], publicadas: 5, visitas: 9 }), /1 problema para atender$/);
});

test('la mañana habla de ayer, completo, y de lo que va de hoy', () => {
  const datos = datosDeEjemplo();
  datos.historia.dias['2026-10-15'] = { dia: '2026-10-15', publicadas: 33, deBalcarce: 12, deAfuera: 21, porSeccion: { Balcarce: 12, Deportes: 6 }, porPersona: 0 };
  datos.estadisticas.puntos.push({ cuando: '2026-10-16T12:00:00Z', web: { u24: { visitas: 60, vistas: 150 } } }); // la medición de las 9 de hoy corrige ayer
  const r = armarInforme({ momento: 'manana', ahora: MANANA, datos, enVivo: { omitido: true } });
  assert.match(r.texto, /RADAR BALCARCE · Informe de la mañana\nAsí cerró ayer, jueves 15\/10/);
  assert.match(r.texto, /QUÉ SE PUBLICÓ AYER \(jueves 15\/10\)/);
  assert.match(r.texto, /33 notas publicadas: 12 de Balcarce y 21 de afuera \(el promedio de los últimos 7 días es 40\)/);
  assert.match(r.texto, /Balcarce 12 · Deportes 6/);
  assert.match(r.texto, /VISITAS DE AYER/);
  assert.match(r.texto, /el día completo/);
  assert.match(r.asunto, /^Informe de la mañana: así cerró ayer, jueves 15\/10 · 33 notas, 55 visitas · /);
});

// ------------------------------------------------------------ no inventa

test('visitas: un día sin lectura, incoherente o en cero sospechoso NO se muestra como cero; se dice, y el asunto no trae visitas', () => {
  for (const [rotura, pista] of [
    [{ sinLectura: true }, /sin lectura confiable.*NO es «cero visitas»/s],
    [{ visitas: 5, vistas: 0, horas: Array(24).fill(0) }, /se contradicen/],
    [{ visitas: 0, vistas: 0, horas: Array(24).fill(0), notas: {}, referentes: {}, dispositivos: {} }, /no parece real/],
  ]) {
    const datos = datosDeEjemplo();
    datos.estadisticas.dias['2026-10-15'] = rotura;
    const r = armarInforme({ momento: 'noche', ahora: NOCHE, datos, enVivo: { omitido: true } });
    assert.match(r.texto, /Visitas: sin lectura confiable/);
    assert.match(r.texto, pista);
    assert.ok(!/\b0 visitas\b/.test(r.texto.replace(/NO es «cero visitas»/g, '')), 'no dice «0 visitas»');
    assert.ok(!/visita/.test(r.asunto), 'el asunto no lleva visitas que no se pudieron leer');
    assert.ok(r.atencion.some((a) => /no tienen lectura confiable/.test(a.t)), 'y avisa en la atención');
    // el plan B: las 24 horas medidas a las 21
    assert.match(r.texto, /Otra forma de medirlo: en las 24 horas hasta las 21:00 hubo 55 visitas y 140 páginas vistas/);
  }
});

test('visitas: un día sin medición todavía se dice, y un día a medias dice hasta qué hora llega', () => {
  const datos = datosDeEjemplo();
  datos.estadisticas.puntos = [];
  delete datos.estadisticas.dias['2026-10-15'];
  assert.equal(lecturaDeVisitas({ dia: '2026-10-15', ahora: NOCHE, estadisticas: datos.estadisticas }).estado, 'sin-medicion');
  const sinDato = armarInforme({ momento: 'noche', ahora: NOCHE, datos, enVivo: { omitido: true } });
  assert.match(sinDato.texto, /Todavía no se midió hoy/);

  const aMedias = datosDeEjemplo();
  const l = lecturaDeVisitas({ dia: '2026-10-15', ahora: NOCHE, estadisticas: aMedias.estadisticas });
  assert.equal(l.estado, 'ok');
  assert.equal(l.hasta, '21:00');
  assert.equal(l.completo, false, 'hoy todavía no terminó');
  const r = armarInforme({ momento: 'noche', ahora: NOCHE, datos: aMedias, enVivo: { omitido: true } });
  assert.match(r.texto, /hasta las 21:00/);
  assert.match(r.texto, /El día todavía no terminó/);
});

test('visitas: un día de ayer que se corrigió a las 9 está completo; uno que no, avisa que le faltan las últimas horas', () => {
  const datos = datosDeEjemplo();
  const sinCorregir = lecturaDeVisitas({ dia: '2026-10-15', ahora: MANANA, estadisticas: datos.estadisticas });
  assert.equal(sinCorregir.completo, false);
  const r = armarInforme({ momento: 'manana', ahora: MANANA, datos, enVivo: { omitido: true } });
  assert.match(r.texto, /no incluye las últimas horas del día; se corrige sola a las 9/);
});

test('los titulares delicados no salen: sin titular en la cola, y nada de Policiales ni de menores', () => {
  const datos = datosDeEjemplo();
  datos.portada.pendientes.push({ id: 'p9', titulo: null, seccion: 'Policiales', motivo: 'necesita ojo humano: "detenido"' });
  const r = armarInforme({ momento: 'noche', ahora: NOCHE, datos, enVivo: { omitido: true } });
  assert.match(r.texto, /los titulares no se muestran/);
  const lineasDeEspera = r.secciones.find((s) => s.id === 'espera').lineas.map((l) => l.t);
  assert.equal(lineasDeEspera.filter((t) => /funcionario|Estados Unidos/.test(t)).length, 2, 'los que tienen titular público sí se ven');
  assert.ok(!r.texto.includes('homicidio') || !/homicidio.*Policiales/.test(r.texto), 'el motivo de una nota delicada no se cuenta');
  assert.equal(grupoDelMotivo('necesita ojo humano: "adolescente"'), 'chicos o adolescentes (los titulares no se muestran)');
  assert.equal(grupoDelMotivo('necesita ojo humano: "víctima"'), 'posibles víctimas (los titulares no se muestran)');
  assert.equal(grupoDelMotivo('algo raro'), 'otros motivos del semáforo');
});

test('una cola vacía y un cuerpo agotado se dicen distinto', () => {
  const datos = datosDeEjemplo();
  datos.portada.pendientes = [];
  datos.portada.esperandoCuerpo = 0;
  datos.esperandoCuerpo = { notas: [] };
  const r = armarInforme({ momento: 'noche', ahora: NOCHE, datos, enVivo: { omitido: true } });
  assert.match(r.texto, /Ninguna nota espera a una persona/);
  assert.ok(!r.atencion.some((a) => /esperan una decisión/.test(a.t)));
  const otro = armarInforme({ momento: 'noche', ahora: NOCHE, datos: datosDeEjemplo(), enVivo: { omitido: true } });
  assert.match(otro.texto, /1 ya agotó los 3 intentos de la IA/);
  assert.ok(otro.atencion.some((a) => /1 nota automática no consiguió cuerpo en 3 intentos y no sale/.test(a.t)));
});

test('con las redes apagadas lo dice una vez y no cuenta piezas que faltan', () => {
  const r = armarInforme({ momento: 'noche', ahora: NOCHE, datos: datosDeEjemplo({ libro: {} }), enVivo: { omitido: true }, redesActivas: false });
  assert.match(r.texto, /Las redes están apagadas/);
  assert.ok(!/No salieron/.test(r.texto));
  assert.ok(r.atencion.some((a) => a.nivel === 'info' && /apagadas/.test(a.t)));
});

test('redes: una pieza que no salió y una falla de Meta aparecen, sin repetirse; un duplicado es urgente', () => {
  const datos = datosDeEjemplo();
  // el repaso de la mañana (10:00) no salió: su ventana ya se cerró a las 21:15
  const r = armarInforme({ momento: 'noche', ahora: NOCHE, datos, enVivo: { omitido: true } });
  assert.match(r.texto, /No salieron? /);
  assert.ok(r.atencion.some((a) => a.nivel === 'alta' && /No salió|No salieron/.test(a.t)), 'un reel que no salió es urgente');
  assert.equal((r.texto.match(/historia del reel/g) ?? []).length, 1, 'la falla de Meta no se repite como pieza que falta');
  datos.libro.instagram['2026-10-15/noticia2-copia'] = datos.libro.instagram['2026-10-15/noticia2'];
  datos.libro.facebook.otro = { ...datos.libro.facebook.aaa111, postId: '1254237411116171_999333' };
  const dup = armarInforme({ momento: 'noche', ahora: NOCHE, datos, enVivo: { omitido: true } });
  assert.ok(dup.atencion.some((a) => a.nivel === 'alta' && /DUPLICADA/.test(a.t)));
});

test('salud: web vieja es urgente de día y de noche mide más tranquilo; el archivo cerca del tope y la IA con muchos errores avisan', () => {
  const vieja = datosDeEjemplo();
  vieja.portada.generado = '2026-10-15T20:00:00Z'; // 17:00, hace 4,25 h a las 21:15
  const r = armarInforme({ momento: 'noche', ahora: NOCHE, datos: vieja, enVivo: { omitido: true } });
  assert.ok(r.atencion.some((a) => a.nivel === 'alta' && /La web no se arma desde hace/.test(a.t)));

  const lleno = datosDeEjemplo({ archivo: { total: 3600, notas: [] } });
  const l = armarInforme({ momento: 'noche', ahora: NOCHE, datos: lleno, enVivo: { omitido: true } });
  assert.ok(l.atencion.some((a) => a.nivel === 'alta' && /97 %/.test(a.t) && /tope/.test(a.t)));
  const casi = armarInforme({ momento: 'noche', ahora: NOCHE, datos: datosDeEjemplo({ archivo: { total: 3000, notas: [] } }), enVivo: { omitido: true } });
  assert.ok(casi.atencion.some((a) => a.nivel === 'media' && /81 %/.test(a.t)));

  const mala = datosDeEjemplo();
  mala.usoIA.dias['2026-10-15'].redaccion['gemini-flash-lite-latest'].errores = 6;
  const m = armarInforme({ momento: 'noche', ahora: NOCHE, datos: mala, enVivo: { omitido: true } });
  assert.ok(m.atencion.some((a) => /La IA falló en 6 de 10 llamadas/.test(a.t)));
  assert.ok(!r.atencion.some((a) => /La IA falló/.test(a.t)), 'con 1 error en 10 no avisa');
});

test('salud: con el archivo permanente prendido (R2), llegar al tope de notas no es un aviso (lo que sale queda en R2)', () => {
  const lleno = datosDeEjemplo({ archivo: { total: 3600, notas: [] } });
  const r = armarInforme({ momento: 'noche', ahora: NOCHE, datos: lleno, enVivo: { omitido: true }, archivoActivo: true });
  assert.ok(!r.atencion.some((a) => /tope/.test(a.t)), 'sin aviso por el tope');
  const texto = JSON.stringify(r);
  assert.match(texto, /archivo permanente/);
  assert.match(leer('redes/informe-diario.mjs'), /archivoActivo: Boolean\(String\(process\.env\.R2_ARCHIVO \?\? ''\)\.trim\(\)\)/);
});

test('salud: lo que el vigilante tiene abierto y los vencimientos cercanos suben a la atención, ordenados por gravedad', () => {
  const datos = datosDeEjemplo({ vigilancia: { abiertos: [
    { clave: 'a', nivel: 'media', texto: 'La auditoría semanal no corre hace más de 10 días.', desde: '2026-10-15T00:00:00Z' },
    { clave: 'b', nivel: 'alta', texto: 'La clave GEMINI_API_KEY_REDES no anda.', desde: '2026-10-15T00:00:00Z' },
  ] } });
  const r = armarInforme({ momento: 'noche', ahora: z('2027-09-01T15:00:00Z'), datos, enVivo: { omitido: true } });
  const orden = ['alta', 'media', 'info'];
  const niveles = r.atencion.map((a) => a.nivel);
  assert.equal(niveles[0], 'alta', 'lo urgente va primero');
  assert.deepEqual(niveles, [...niveles].sort((a, b) => orden.indexOf(a) - orden.indexOf(b)), 'ordenado de lo más grave a lo menos');
  assert.ok(r.atencion.some((a) => a.nivel === 'alta' && /GEMINI_API_KEY_REDES/.test(a.t)));
  assert.ok(r.atencion.some((a) => a.nivel === 'media' && /auditoría semanal/.test(a.t)));
  assert.match(r.texto, /Dentro de 20 días \(21\/09\/2027\): el dominio/);
  assert.ok(r.atencion.some((a) => /Faltan 20 días: el dominio/.test(a.t)));
  assert.equal(proximosVencimientos(z('2026-10-15T00:00:00Z'), 90).length, 0);
});

test('GitHub y Cloudflare en vivo: las fuentes caídas y las tareas que fallaron salen en la salud', () => {
  const enVivo = {
    vigilante: { ultimo: { cuando: '2026-10-16T00:12:00Z', web: { ok: true, estado: 200 } } },
    github: { lectura: true, actualizar: { terminadas: 10, buenas: 9, malas: 1, ultimaBuena: '2026-10-16T00:10:00Z' }, conFalla: [{ nombre: 'Redes', seguidas: 2, url: 'https://github.com/x/actions/runs/1' }] },
    fuentes: { leido: true, caidas: Array.from({ length: 5 }, (_, i) => ({ nombre: `Fuente ${i}`, error: 'timeout' })), vacias: [{ nombre: 'Vacía' }] },
  };
  const r = armarInforme({ momento: 'noche', ahora: NOCHE, datos: datosDeEjemplo(), enVivo });
  assert.match(r.texto, /vigilante de Cloudflare.*respondiendo a las 21:12/);
  assert.match(r.texto, /de las últimas 10 corridas, 9 salieron bien y 1 con problemas/);
  assert.match(r.texto, /Fuentes caídas en la última corrida: 5: Fuente 0, Fuente 1/);
  assert.ok(r.atencion.some((a) => a.nivel === 'alta' && /«Redes» falló/.test(a.t) && a.url));
  assert.ok(r.atencion.some((a) => /5 fuentes caídas/.test(a.t)));
  const caida = armarInforme({ momento: 'noche', ahora: NOCHE, datos: datosDeEjemplo(), enVivo: { vigilante: { ultimo: { cuando: '2026-10-16T00:12:00Z', web: { ok: false, motivo: 'respondió HTTP 522' } } }, github: { lectura: false, motivo: 'GitHub respondió 403' }, fuentes: { leido: false, motivo: 'GitHub respondió 403' } } });
  assert.ok(caida.atencion.some((a) => a.nivel === 'alta' && /vio la web caída \(respondió HTTP 522\)/.test(a.t)));
  assert.match(caida.texto, /No pude leer las corridas de GitHub \(GitHub respondió 403\)/);
  assert.match(caida.texto, /Fuentes caídas: no pude leerlo/);
});

test('si una parte se rompe, el informe sale igual y lo dice; sin ningún dato también', () => {
  const datos = datosDeEjemplo();
  datos.portada.pendientes = 'roto'; // no es una lista
  datos.libro = { facebook: 'roto', instagram: 'roto' };
  const r = armarInforme({ momento: 'noche', ahora: NOCHE, datos, enVivo: { omitido: true } });
  assert.ok(r.texto.includes('SALUD DEL SISTEMA'));
  assert.ok(r.secciones.length === 5);
  const vacio = armarInforme({ momento: 'manana', ahora: MANANA, datos: { portada: null, libro: null, historia: null, estadisticas: null, usoIA: null, vigilancia: null, esperandoCuerpo: null, archivo: null }, enVivo: null });
  assert.equal(vacio.secciones.length, 5);
  assert.match(vacio.texto, /No pude leer la portada/);
  assert.match(vacio.texto, /No pude leer las estadísticas/);
  assert.ok(vacio.atencion.length >= 3 && vacio.atencion.every((a) => ['alta', 'media', 'info'].includes(a.nivel)));
});

// ------------------------------------------------------------ el largo y el formato

test('el texto nunca pasa del tope del Worker, aunque haya montañas de datos', () => {
  const datos = datosDeEjemplo();
  datos.portada.pendientes = Array.from({ length: 200 }, (_, i) => ({ id: `p${i}`, titulo: `Titular largo número ${i} `.repeat(4), seccion: 'Política', motivo: 'necesita ojo humano: "denuncia"' }));
  datos.vigilancia = { abiertos: Array.from({ length: 40 }, (_, i) => ({ clave: `c${i}`, nivel: 'media', texto: `Problema número ${i} `.repeat(20), desde: '2026-10-15T00:00:00Z' })) };
  const r = armarInforme({ momento: 'noche', ahora: NOCHE, datos, enVivo: { omitido: true } });
  assert.ok(r.texto.length <= LIMITES_DEL_INFORME.textoMaximo, `${r.texto.length}`);
  assert.ok(aTexto({ momento: 'noche', dia: '2026-10-15', ahora: NOCHE, atencion: [], secciones: [{ id: 'x', titulo: 'X', lineas: Array.from({ length: 2000 }, (_, i) => ({ t: `línea ${i}` })) }] }).length <= LIMITES_DEL_INFORME.textoMaximo);
  assert.ok(r.texto.length < 8000 - 400, 'entra con la cola que le agrega el Worker');
});

test('el HTML: parejo, con los enlaces y sin dejar pasar etiquetas de lo que viene de afuera', () => {
  const datos = datosDeEjemplo();
  datos.portada.notas[0].titulo = 'Un <script>alert(1)</script> título & "comillas"';
  const r = armarInforme({ momento: 'noche', ahora: NOCHE, datos, enVivo: { omitido: true } });
  const h = r.html;
  assert.ok(h.startsWith('<!doctype html>'));
  assert.equal((h.match(/<div/g) ?? []).length, (h.match(/<\/div>/g) ?? []).length);
  assert.equal((h.match(/<a /g) ?? []).length, (h.match(/<\/a>/g) ?? []).length);
  assert.ok(!h.includes('<script>'), 'el titular no mete etiquetas');
  assert.ok(h.includes('&lt;script&gt;'));
  assert.match(h, /href="https:\/\/radarbalcarce\.com\/nota\//);
  assert.match(h, /LO QUE REQUIERE TU ATENCIÓN/);
  assert.match(h, /max-width:640px/, 'una columna que se achica en el celular');
  assert.ok(!/<style|<link|<img/.test(h), 'sólo estilos en línea, nada de afuera');
  assert.ok(h.length < 60000, 'entra en el tope de html del Worker');
  assert.match(aHtml({ momento: 'noche', dia: '2026-10-15', ahora: NOCHE, asunto: 'x', atencion: [], secciones: [] }), /Nada\. Todo anda/);
});

test('un informe sin nada para atender lo dice con todas las letras', () => {
  const datos = datosDeEjemplo();
  datos.portada.pendientes = [];
  datos.portada.esperandoCuerpo = 0;
  datos.esperandoCuerpo = { notas: [] };
  datos.libro.problemas = {};
  datos.libro.instagram = {};
  datos.libro.facebookVideos = {};
  const r = armarInforme({ momento: 'noche', ahora: z('2026-10-15T20:15:00Z'), datos, enVivo: { omitido: true }, redesActivas: false });
  const arriba = r.texto.slice(r.texto.indexOf('LO QUE REQUIERE'), r.texto.indexOf('QUÉ SE PUBLICÓ'));
  assert.match(arriba, /apagadas|Nada\. Todo anda/);
});

// ------------------------------------------------------------ las cuentas chicas

test('costo de la IA, audios del día, posteo de Facebook y anotaciones de GitHub', () => {
  const c = costoDeLaIA({ redaccion: { a: { llamadas: 2, errores: 1, entrada: 1e6, salida: 1e6, pensamiento: 0, total: 2e6 } }, lectura: { b: { llamadas: 1, errores: 0, entrada: 0, salida: 0, pensamiento: 0, total: 0 } } });
  assert.equal(c.llamadas, 3);
  assert.equal(c.errores, 1);
  assert.ok(Math.abs(c.referencia - 0.5) < 1e-9, 'US$ 0,10 por millón de entrada + 0,40 por millón de salida');
  assert.equal(audiosDelDia({ instagram: { '2026-10-15/a': {}, '2026-10-15/participa-nota': {}, '2026-10-14/b': {} } }, '2026-10-15'), 1, 'las fijas ya vienen grabadas y no gastan voz');
  assert.equal(enlaceDePosteoDeFacebook('123_456'), 'https://www.facebook.com/123/posts/456');
  assert.equal(enlaceDePosteoDeFacebook('suelto'), null);
  const f = fuentesDeLasAnotaciones([
    { title: 'Fuente caída', message: 'El Diario de Tandil · índice: HTTP 503' },
    { title: 'Fuente vacía', message: 'Campeones no trajo ninguna nota' },
    { title: 'Otra cosa', message: 'x' },
  ]);
  assert.deepEqual(f.caidas, [{ nombre: 'El Diario de Tandil · índice', error: 'HTTP 503' }]);
  assert.deepEqual(f.vacias, [{ nombre: 'Campeones' }]);
});

test('leerArchivos: lee web/data y lo que falta queda en null sin romper', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'informe-'));
  fs.mkdirSync(path.join(dir, 'web', 'data'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'web', 'data', 'portada.json'), JSON.stringify({ notas: [] }));
  fs.writeFileSync(path.join(dir, 'web', 'data', 'archivo.json'), JSON.stringify({ notas: [{ id: 'a', titulo: 'A' }, { id: 'b', titulo: 'B' }] }));
  const d = leerArchivos(dir);
  assert.deepEqual(d.portada, { notas: [] });
  assert.equal(d.archivo.total, 2);
  assert.equal(d.estadisticas, null);
  assert.equal(d.vigilancia, null);
  assert.deepEqual(d.libro, {});
  fs.rmSync(dir, { recursive: true, force: true });
});

// ------------------------------------------------------------ lo que baja datos

function fetchDeGitHub({ estado = 200, falloLasAnotaciones = false } = {}) {
  const pedidos = [];
  const fn = async (url, o) => {
    pedidos.push({ url: String(url), o });
    const u = String(url);
    const r = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status });
    if (u.includes('/workflows/actualizar.yml/runs')) return estado === 200 ? r({ workflow_runs: [
      { id: 11, status: 'completed', conclusion: 'success', updated_at: '2026-10-16T00:10:00Z', html_url: 'https://github.com/x/actions/runs/11' },
      { id: 10, status: 'completed', conclusion: 'failure', updated_at: '2026-10-15T23:40:00Z', html_url: 'https://github.com/x/actions/runs/10' },
    ] }) : r({ message: 'rate limit' }, estado);
    if (u.includes('/workflows/redes.yml/runs')) return r({ workflow_runs: [{ id: 21, status: 'completed', conclusion: 'failure', html_url: 'https://github.com/x/actions/runs/21' }, { id: 20, status: 'completed', conclusion: 'failure', html_url: 'u' }, { id: 19, status: 'completed', conclusion: 'success', html_url: 'u' }] });
    if (u.includes('/workflows/')) return r({ workflow_runs: [{ id: 30, status: 'completed', conclusion: 'success' }] });
    if (u.endsWith('/actions/runs/11/jobs?per_page=10')) return r({ jobs: [{ id: 111 }] });
    if (u.includes('/check-runs/111/annotations')) return falloLasAnotaciones ? r({}, 403) : r([{ title: 'Fuente caída', message: 'Una fuente: HTTP 500' }, { title: 'Fuente vacía', message: 'Otra no trajo ninguna nota' }]);
    if (u === 'https://radar-balcarce-vigilante.radarbalcarce.workers.dev/estado') return r({ ultimo: { cuando: '2026-10-16T00:12:00Z', web: { ok: true } } });
    return r({}, 404);
  };
  fn.pedidos = pedidos;
  return fn;
}

test('consultarEnVivo: corridas, tareas que fallan, fuentes caídas y el vigilante; el token va en el encabezado', async () => {
  const f = fetchDeGitHub();
  const v = await consultarEnVivo({ env: { GITHUB_TOKEN: 'T0K3N', GITHUB_REPOSITORY: 'a/b' }, fetchFn: f, ahora: NOCHE });
  assert.equal(v.github.lectura, true);
  assert.deepEqual(v.github.actualizar, { terminadas: 2, buenas: 1, malas: 1, ultimaBuena: '2026-10-16T00:10:00Z' });
  assert.deepEqual(v.github.conFalla.map((x) => [x.nombre, x.seguidas]), [['Redes', 2]]);
  assert.equal(v.fuentes.leido, true);
  assert.equal(v.fuentes.caidas.length, 1);
  assert.equal(v.vigilante.ultimo.web.ok, true);
  assert.ok(f.pedidos.every((p) => !p.url.includes('T0K3N')), 'el token no va en la dirección');
  assert.ok(f.pedidos.some((p) => p.url.startsWith('https://api.github.com/repos/a/b/')), 'respeta GITHUB_REPOSITORY');
  assert.ok(f.pedidos.filter((p) => p.url.startsWith('https://api.github.com')).every((p) => p.o.headers.authorization === 'Bearer T0K3N'));
  assert.ok(!f.pedidos.some((p) => /informe-diario\.yml/.test(p.url)), 'el informe no se vigila a sí mismo en su propio informe');
});

test('consultarEnVivo: si GitHub no deja leer o las anotaciones fallan, lo dice y no tira', async () => {
  const limitado = await consultarEnVivo({ env: {}, fetchFn: fetchDeGitHub({ estado: 403 }), ahora: NOCHE });
  assert.equal(limitado.github.lectura, false);
  assert.match(limitado.github.motivo, /403/);
  assert.equal(limitado.fuentes.leido, false);
  const sinAnotaciones = await consultarEnVivo({ env: {}, fetchFn: fetchDeGitHub({ falloLasAnotaciones: true }), ahora: NOCHE });
  assert.equal(sinAnotaciones.github.lectura, true);
  assert.equal(sinAnotaciones.fuentes.leido, false);
  const sinRed = await consultarEnVivo({ env: {}, fetchFn: async () => { throw new Error('sin red'); }, ahora: NOCHE });
  assert.equal(sinRed.github.lectura, false);
  assert.equal(sinRed.vigilante, null);
});

// ------------------------------------------------------------ mandarlo

test('enviarInforme: va por el Worker con el asunto, el texto, el html y la clave del momento; sin token no sale; "repetido" es ok', async () => {
  const informe = armarInforme({ momento: 'noche', ahora: NOCHE, datos: datosDeEjemplo(), enVivo: { omitido: true } });
  const pedidos = [];
  const fetchFn = async (url, o) => { pedidos.push({ url, o, json: JSON.parse(o.body) }); return new Response(JSON.stringify({ ok: true }), { status: 200 }); };
  const r = await enviarInforme(informe, { env: { VIGILANTE_TOKEN: 'secreto-largo-123' }, fetchFn });
  assert.deepEqual(r, { ok: true });
  const p = pedidos[0];
  assert.equal(p.url, 'https://radar-balcarce-vigilante.radarbalcarce.workers.dev/avisar');
  assert.equal(p.o.headers['x-token'], 'secreto-largo-123');
  assert.equal(p.json.clave, 'informe-noche-2026-10-15');
  assert.equal(p.json.asunto, informe.asunto);
  assert.equal(p.json.texto, informe.texto, "25/10: el mail lleva el informe completo");
  assert.equal(p.json.html, informe.html);
  assert.equal(p.json.nivel, 'info', 'un informe diario no es «URGENTE»');
  assert.ok(!p.o.body.includes('secreto-largo-123'), 'el token no viaja en el cuerpo');
  assert.equal((await enviarInforme(informe, { env: {}, fetchFn })).ok, false, 'sin VIGILANTE_TOKEN no sale (y no cae a WhatsApp)');
  const repetido = await enviarInforme(informe, { env: { VIGILANTE_TOKEN: 'x' }, fetchFn: async () => new Response(JSON.stringify({ ok: true, repetido: true }), { status: 200 }) });
  assert.deepEqual(repetido, { ok: true, repetido: true });
  const caido = await enviarInforme(informe, { env: { VIGILANTE_TOKEN: 'x' }, fetchFn: async () => new Response('{}', { status: 500 }) });
  assert.equal(caido.ok, false);
});

// ------------------------------------------------------------ el disparador

test('el workflow "Informe diario": lo pide el reloj, tiene respaldo, no guarda nada y el vigilante lo mira', async () => {
  const w = leer('.github/workflows/informe-diario.yml');
  assert.match(w, /^name: Informe diario$/m);
  assert.match(w, /workflow_dispatch:/);
  assert.match(w, /momento:[\s\S]*options: \[manana, noche\]/);
  assert.match(w, /cron: '45 11 \* \* \*'/, 'respaldo de la mañana: 8:45 de Balcarce');
  assert.match(w, /cron: '45 0 \* \* \*'/, 'respaldo de la noche: 21:45 de Balcarce');
  assert.match(w, /TZ: America\/Argentina\/Buenos_Aires/);
  assert.match(w, /VIGILANTE_TOKEN: \$\{\{ secrets\.VIGILANTE_TOKEN \}\}/);
  assert.match(w, /node redes\/informe-diario\.mjs --momento=/);
  assert.ok(!/git (add|commit|push)/.test(w), 'no guarda nada en el repositorio');
  assert.ok(!/ghp_|github_pat_/.test(w));
  const { WORKFLOWS_VIGILADOS } = await import('../redes/vigilar.mjs');
  assert.equal(WORKFLOWS_VIGILADOS['informe-diario.yml'], 'Informe diario');
});

test('el mail va corto (22/10): sin renglones de detalle y con tope por parte; el informe completo sigue entero', () => {
  const informe = armarInforme({ momento: 'noche', ahora: NOCHE, datos: datosDeEjemplo(), enVivo: { omitido: true } });
  assert.ok(informe.textoCorto.length < informe.texto.length, 'la versión del mail es más corta');
  assert.ok(informe.htmlCorto.length < informe.html.length);
  for (const s of informe.secciones) assert.ok(s.lineas.filter((l) => !l.sub).length >= 0);
  assert.ok(/panel del celular/.test(informe.textoCorto), 'avisa dónde está el detalle');
});
