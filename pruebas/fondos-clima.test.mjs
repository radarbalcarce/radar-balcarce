// Regla 181 (16/10/2026, Hernán: "nuestra nota del clima está saliendo sin imagen"). La nota del clima lleva una ilustración genérica hecha con IA
// (un paisaje de la pampa, sin personas ni texto), elegida de un grupo de imágenes fijas según el estado del tiempo y la fecha, y siempre con la
// leyenda "Ilustración generada con IA". No se llama a ninguna red: las imágenes se generaron una vez y están en web/public/fotos-notas/clima-*.jpg.
// Una imagen de IA sólo se permite para el clima y las efemérides (genéricos): ninguna nota de un hecho la lleva (docs/05-FOTOS.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FONDOS_DEL_CLIMA, ESTADO_GENERICO, CREDITO_FONDO_CLIMA, estadoDelCielo, estadoDelTiempo, numeroDeDia, archivoDelFondo, fondoDelClima,
} from '../web/lib/fondos-clima.js';
import { notaDelClima, entradaDelClima, notasDelClima } from '../web/lib/notas-propias.js';
import { conCreditoDeFoto } from '../redes/elegir.mjs';
import { podarFotos } from '../web/scripts/fotos-notas.mjs';

const CARPETA = fileURLToPath(new URL('../web/public/fotos-notas/', import.meta.url));
const ESTADOS = ['despejado', 'parcialmente-nublado', 'nublado', 'lluvia', 'tormenta', 'niebla', 'viento', 'frio', 'calor'];
const AR = (iso, hora) => new Date(`${iso}T${hora}:00-03:00`);
const entrada = (hoy = {}, ahora = {}, dia = '2026-10-16') => ({
  dia, consultado: AR(dia, '07:40').toISOString(), fuente: 'Open-Meteo',
  ahora: { temp: 12, sensacion: 11, humedad: 70, viento: 10, rumbo: 'S', cielo: 'Nublado', ...ahora },
  hoy: { fecha: dia, dia: 'vie', max: 20, min: 8, lluvia: 10, viento: 15, cielo: 'Nublado', ...hoy },
  siguientes: [],
});

test('hay un grupo de imágenes para cada estado del tiempo, con archivos propios del clima y sin repetirse', () => {
  assert.deepEqual(Object.keys(FONDOS_DEL_CLIMA).sort(), [...ESTADOS].sort());
  assert.ok(FONDOS_DEL_CLIMA[ESTADO_GENERICO], 'el estado genérico existe');
  const todos = Object.values(FONDOS_DEL_CLIMA).flat();
  assert.equal(new Set(todos).size, todos.length, 'ninguna imagen se repite entre estados');
  for (const [estado, lista] of Object.entries(FONDOS_DEL_CLIMA)) {
    assert.ok(lista.length >= 2 && lista.length <= 3, `${estado}: dos o tres imágenes para que varíe`);
    for (const f of lista) assert.match(f, new RegExp(`^clima-${estado}-\\d\\.jpg$`), `${f}: clima-<estado>-<n>.jpg`);
  }
});

test('las imágenes existen y pesan poco (cada una, bajo 400 KB; en conjunto, bajo 6 MB)', (t) => {
  const hay = fs.readdirSync(CARPETA).some((f) => /^clima-.*\.jpg$/.test(f));
  if (!hay) { t.skip('todavía no se guardaron las imágenes del clima (workflow "Generar fondos del clima")'); return; }
  let total = 0;
  for (const f of Object.values(FONDOS_DEL_CLIMA).flat()) {
    const ruta = path.join(CARPETA, f);
    assert.ok(fs.existsSync(ruta), `falta web/public/fotos-notas/${f}`);
    const bytes = fs.statSync(ruta).size;
    assert.ok(bytes > 10_000 && bytes < 400_000, `${f} pesa ${bytes} bytes`);
    const cabecera = fs.readFileSync(ruta).subarray(0, 3);
    assert.deepEqual([...cabecera], [0xff, 0xd8, 0xff], `${f} es un JPEG`);
    total += bytes;
  }
  assert.ok(total < 6_000_000, `en conjunto pesan ${total} bytes`);
  const sobran = fs.readdirSync(CARPETA).filter((f) => /^clima-.*\.jpg$/.test(f) && !Object.values(FONDOS_DEL_CLIMA).flat().includes(f));
  assert.deepEqual(sobran, [], 'no quedan imágenes del clima sin usar');
});

test('el cielo del pronóstico se traduce a un estado', () => {
  const casos = {
    Despejado: 'despejado', 'Mayormente despejado': 'despejado', 'Parcialmente nublado': 'parcialmente-nublado', Nublado: 'nublado',
    Niebla: 'niebla', 'Niebla con escarcha': 'niebla', 'Llovizna leve': 'lluvia', Lluvia: 'lluvia', 'Lluvia fuerte': 'lluvia', Chaparrones: 'lluvia', Aguanieve: 'lluvia',
    Tormenta: 'tormenta', 'Tormenta con granizo': 'tormenta', 'Lluvia con tormenta': 'tormenta', Nieve: 'frio', 'Sin datos': null, '': null,
  };
  for (const [cielo, estado] of Object.entries(casos)) assert.equal(estadoDelCielo(cielo), estado, cielo);
  assert.equal(estadoDelCielo(null), null);
});

test('el estado del tiempo del día: manda lo más fuerte, y siempre devuelve uno que tiene imágenes', () => {
  assert.equal(estadoDelTiempo(entrada({ cielo: 'Despejado', max: 24 }, { cielo: 'Despejado' })), 'despejado');
  assert.equal(estadoDelTiempo(entrada({ cielo: 'Parcialmente nublado' }, { cielo: 'Parcialmente nublado' })), 'parcialmente-nublado');
  assert.equal(estadoDelTiempo(entrada({ cielo: 'Nublado' })), 'nublado');
  assert.equal(estadoDelTiempo(entrada({ cielo: 'Lluvia', lluvia: 80 })), 'lluvia');
  assert.equal(estadoDelTiempo(entrada({ cielo: 'Tormenta', lluvia: 60 })), 'tormenta');
  assert.equal(estadoDelTiempo(entrada({ cielo: 'Despejado' }, { cielo: 'Niebla' })), 'niebla');
  assert.equal(estadoDelTiempo(entrada({ cielo: 'Despejado', min: 1 }, { cielo: 'Despejado' })), 'frio', 'helada: mínima de 2° o menos');
  assert.equal(estadoDelTiempo(entrada({ cielo: 'Despejado', max: 36 }, { cielo: 'Despejado' })), 'calor');
  assert.equal(estadoDelTiempo(entrada({ cielo: 'Parcialmente nublado', viento: 55 })), 'viento');
  assert.equal(estadoDelTiempo(entrada({ cielo: 'Lluvia', lluvia: 90, viento: 70, min: 0 })), 'lluvia', 'la lluvia gana al viento y al frío');
  // Una llovizna del 15% no hace un día de lluvia: es el caso real del 9/10 (clima-historia.json).
  assert.equal(estadoDelTiempo(entrada({ cielo: 'Llovizna leve', lluvia: 15 }, { cielo: 'Nublado' })), 'nublado');
  assert.equal(estadoDelTiempo(entrada({ cielo: 'Llovizna leve', lluvia: 70 }, { cielo: 'Nublado' })), 'lluvia');
  assert.equal(estadoDelTiempo(entrada({ cielo: 'Llovizna leve', lluvia: 15 }, { cielo: 'Llovizna' })), 'lluvia', 'si ahora llovizna, llovizna');
  // Sin datos o con un cielo que no se reconoce: la imagen genérica, nunca un error.
  assert.equal(estadoDelTiempo(entrada({ cielo: null, max: null, min: null, viento: null, lluvia: null }, { cielo: 'Sin datos' })), ESTADO_GENERICO);
  assert.equal(estadoDelTiempo(null), ESTADO_GENERICO);
  assert.equal(estadoDelTiempo({}), ESTADO_GENERICO);
});

test('la elección es por fecha: la misma fecha da siempre la misma imagen, y los días seguidos van rotando', () => {
  assert.equal(numeroDeDia('1970-01-02'), 1);
  assert.equal(numeroDeDia('mal'), 0);
  for (const estado of ESTADOS) {
    const lista = FONDOS_DEL_CLIMA[estado];
    assert.equal(archivoDelFondo(estado, '2026-10-16'), archivoDelFondo(estado, '2026-10-16'));
    const vistas = new Set();
    for (let d = 1; d <= lista.length; d++) vistas.add(archivoDelFondo(estado, `2026-10-${String(d).padStart(2, '0')}`));
    assert.equal(vistas.size, lista.length, `${estado}: en ${lista.length} días seguidos salen las ${lista.length} imágenes`);
    assert.notEqual(archivoDelFondo(estado, '2026-10-16'), archivoDelFondo(estado, '2026-10-17'), `${estado}: dos días seguidos no repiten`);
  }
  assert.ok(FONDOS_DEL_CLIMA[ESTADO_GENERICO].includes(archivoDelFondo('estado-que-no-existe', '2026-10-16')), 'un estado desconocido usa la genérica');
  assert.ok(FONDOS_DEL_CLIMA.despejado.includes(archivoDelFondo('despejado', undefined)), 'sin fecha, igual da una imagen del estado');
});

test('la nota del clima lleva foto con la leyenda de IA, de su estado y de su fecha', () => {
  const e = entrada({ cielo: 'Lluvia', lluvia: 85 }, { cielo: 'Lluvia' });
  const nota = notaDelClima(e);
  assert.ok(nota.foto, 'la nota del clima lleva foto');
  assert.equal(nota.foto.credito, CREDITO_FONDO_CLIMA);
  assert.match(nota.foto.credito, /^Ilustración generada con IA/);
  assert.equal(nota.foto.archivo, `fotos-notas/${archivoDelFondo('lluvia', '2026-10-16')}`);
  assert.ok(FONDOS_DEL_CLIMA.lluvia.some((f) => nota.foto.archivo.endsWith(f)));
  assert.deepEqual(notaDelClima(e).foto, nota.foto, 'la misma entrada da siempre la misma foto');
  assert.deepEqual(fondoDelClima(e), nota.foto);
  // Sigue siendo una nota propia, automática y sin fuente de foto de otro medio.
  assert.equal(nota.propia, 'clima');
  assert.equal('teniaImagenLaFuente' in nota, false, 'regla 311: el campo que nadie leía ya no se guarda');
  assert.ok(!/\.\.|^\//.test(nota.foto.archivo));
});

test('cada nota del clima de los últimos días conserva SU imagen, no la de hoy', () => {
  const historia = { dias: ['2026-10-14', '2026-10-15', '2026-10-16'].map((d, i) => entrada({ cielo: ['Despejado', 'Lluvia', 'Niebla'][i], lluvia: 80 }, { cielo: ['Despejado', 'Lluvia', 'Niebla'][i] }, d)) };
  const notas = notasDelClima(historia, {}, { ahora: AR('2026-10-16', '10:00') });
  assert.equal(notas.length, 3);
  const estados = notas.map((n) => ESTADOS.find((s) => FONDOS_DEL_CLIMA[s].some((f) => n.foto.archivo.endsWith(f))));
  assert.deepEqual(estados, ['despejado', 'lluvia', 'niebla']);
});

test('la entrada que arma la portada también da una nota con foto', () => {
  const clima = {
    ahora: { temp: 9, sensacion: 5, humedad: 92, viento: 20, rumbo: 'S', cielo: 'Nublado' },
    dias: [{ fecha: '2026-10-16', dia: 'vie', max: 13, min: 9, lluvia: 22, viento: 21, cielo: 'Nublado' }], fuente: 'Open-Meteo',
  };
  const e = entradaDelClima(clima, { consultado: AR('2026-10-16', '07:40') });
  assert.equal(notaDelClima(e).foto.archivo.startsWith('fotos-notas/clima-nublado-'), true);
});

test('el epígrafe de las redes no dice "Foto:" delante de una ilustración de IA, y la poda nunca borra las del clima', () => {
  assert.match(conCreditoDeFoto('Texto', { foto: { archivo: 'fotos-notas/clima-lluvia-1.jpg', credito: CREDITO_FONDO_CLIMA } }), /\n\nIlustración generada con IA \(Cloudflare Workers AI\)$/);
  assert.match(conCreditoDeFoto('Texto', { foto: { archivo: 'fotos-notas/x.jpg', credito: 'Radio Gabal' } }), /\n\nFoto: Radio Gabal$/);
  const { borrar } = podarFotos({ banco: {}, enDisco: ['clima-lluvia-1.jpg', 'clima-despejado-3.jpg', 'vieja.jpg'], quedan: new Set(), retiradas: new Set() });
  assert.deepEqual(borrar, ['vieja.jpg']);
});

test('generar-datos saca la foto del clima si el archivo no está, y no llama a ninguna red para elegirla', () => {
  const g = fs.readFileSync(new URL('../web/scripts/generar-datos.mjs', import.meta.url), 'utf8');
  assert.match(g, /n\.propia !== 'clima'[\s\S]{0,400}(?:existsSync|existeFoto)[\s\S]{0,200}delete n\.foto/);
  const lib = fs.readFileSync(new URL('../web/lib/fondos-clima.js', import.meta.url), 'utf8');
  assert.ok(!/\bfetch\s*\(|node:https?|XMLHttpRequest/.test(lib), 'elegir la imagen no usa la red');
  assert.ok(!/^import /m.test(lib), 'sin dependencias');
});

test('el workflow que genera las candidatas existe, es manual y no escribe en el repositorio', () => {
  const y = fs.readFileSync(new URL('../.github/workflows/generar-fondos-clima.yml', import.meta.url), 'utf8');
  assert.match(y, /workflow_dispatch/);
  assert.match(y, /contents: read/);
  assert.match(y, /radar-balcarce-imagenes\.radarbalcarce\.workers\.dev\/generar/);
  assert.match(y, /x-token: \$VIGILANTE_TOKEN/);
  assert.match(y, /no people, no text, no logos, no signs/);
  assert.ok(!/git (push|commit)/.test(y));
  for (const estado of ESTADOS) assert.match(y, new RegExp(`^\\s*${estado}\\|`, 'm'), `el workflow tiene escenas de ${estado}`);
});
