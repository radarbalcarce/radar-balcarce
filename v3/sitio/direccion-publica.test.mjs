// Auditoría de seguridad del 5/11/2026: el programa que baja fotos de afuera no se deja mandar a la red interna, ni se carga en memoria un archivo infinito.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esDireccionPublica } from './direccion-publica.mjs';
import { descargar, leerConTope, BYTES_MAXIMOS } from './scripts/copiar-fotos-de-notas.mjs';

const JPEG = Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.alloc(40, 1)]);

test('esDireccionPublica: acepta los medios de siempre', () => {
  for (const u of ['https://www.clarin.com/img/a.jpg', 'http://imagenes.eldiariobalcarce.com.ar/x.jpg', 'https://resizer.glanacion.com/r/a.jpg?auth=abc', 'https://cdn.medio.com:443/a.jpg', 'https://8.8.8.8/a.jpg']) {
    assert.equal(esDireccionPublica(u), true, u);
  }
});

test('esDireccionPublica: rechaza la red interna, los metadatos de la nube y lo que no es http(s), escrito como se escriba', () => {
  for (const u of [
    'http://localhost/a.jpg', 'http://LOCALHOST./a.jpg', 'http://127.0.0.1/a.jpg', 'http://169.254.169.254/latest/meta-data/', 'http://10.0.0.5/a.jpg', 'http://192.168.1.1/a.jpg',
    'http://172.16.0.1/a.jpg', 'http://172.31.255.255/a.jpg', 'http://100.64.0.1/a.jpg', 'http://0.0.0.0/a.jpg',
    'http://2130706433/a.jpg', 'http://0x7f000001/a.jpg', 'http://0177.0.0.1/a.jpg', 'http://127.1/a.jpg', 'http://[::1]/a.jpg', 'http://[::ffff:127.0.0.1]/a.jpg',
    'http://intranet/a.jpg', 'http://servidor.local/a.jpg', 'http://metadata.google.internal/a', 'http://app.localhost/a.jpg',
    'file:///etc/passwd', 'ftp://medio.com/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'https://usuario:clave@medio.com/a.jpg', 'https://medio.com:8443/a.jpg',
    '', 'no es una url', null, undefined,
  ]) {
    assert.equal(esDireccionPublica(u), false, String(u));
  }
});

test('descargar: no sale a una dirección interna ni sigue una redirección hacia ella', async () => {
  let pedidos = 0;
  const nunca = async () => { pedidos++; return new Response(JPEG); };
  await assert.rejects(descargar('http://169.254.169.254/latest/meta-data/', { fetchFn: nunca }), /direccion-no-permitida/);
  assert.equal(pedidos, 0, 'ni siquiera se pidió');
  // Una redirección de un sitio público a la red interna se corta antes de pedirla.
  const vistos = [];
  const redirige = async (u) => { vistos.push(u); return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1:8080/admin' } }); };
  await assert.rejects(descargar('https://medio.example/a.jpg', { fetchFn: redirige }), /direccion-no-permitida/);
  assert.deepEqual(vistos, ['https://medio.example/a.jpg']);
});

test('descargar: sigue redirecciones públicas (relativas también) hasta 4 y no más', async () => {
  const vistos = [];
  const ok = async (u) => {
    vistos.push(u);
    if (u === 'https://medio.example/a.jpg') return new Response(null, { status: 301, headers: { location: '/b.jpg' } });
    if (u === 'https://medio.example/b.jpg') return new Response(null, { status: 302, headers: { location: 'https://cdn.example/c.jpg' } });
    return new Response(JPEG, { status: 200 });
  };
  assert.equal((await descargar('https://medio.example/a.jpg', { fetchFn: ok })).length, JPEG.length);
  assert.deepEqual(vistos, ['https://medio.example/a.jpg', 'https://medio.example/b.jpg', 'https://cdn.example/c.jpg']);
  const sinFin = async () => new Response(null, { status: 302, headers: { location: 'https://medio.example/otra.jpg' } });
  await assert.rejects(descargar('https://medio.example/a.jpg', { fetchFn: sinFin }), /muchos-saltos/);
});

test('leerConTope: corta apenas se pasa del tope aunque el servidor no avise el tamaño', async () => {
  let leidos = 0;
  const infinito = new ReadableStream({
    pull(c) { leidos++; c.enqueue(new Uint8Array(1024 * 1024)); },
    cancel() {},
  });
  await assert.rejects(leerConTope(new Response(infinito), 3 * 1024 * 1024), /muy-pesada/);
  assert.ok(leidos <= 6, `leyó ${leidos} MB antes de cortar`);
  assert.equal((await leerConTope(new Response(JPEG), BYTES_MAXIMOS)).length, JPEG.length);
});
