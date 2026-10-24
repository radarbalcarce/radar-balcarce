// La foto de una nota ya posteada en Facebook cambia: se le pide a Facebook que relea la página, una vez por cambio (regla 283, 17/10/2026). Sin red.
//
// El caso real: «Santiago Gilligan busca sumar sus primeros minutos en la Serie A de Italia» (id 19nga6r). Se publicó en Facebook a las 14:35 UTC del 17/10
// con la ilustración de IA generada a las 14:22; a las 17:02 El Diario Balcarce subió su foto y el banco la puso en la nota.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  fotosCambiadasDespuesDelPosteo, fotoQueSeVe, esFotoDeIA, esperaFotoDefinitiva, HORAS_DE_RELECTURA,
} from '../redes/foto-cambiada.mjs';
import { elegirParaFacebook, REGLAS_FACEBOOK, libroNuevo } from '../redes/elegir.mjs';
import { crearCliente } from '../redes/meta.mjs';
import { main, ARCHIVOS_QUE_LEE } from '../redes/publicar.mjs';

// ---- lo grabado de web/data el 17/10 (redes.json, fotos-ia.json y banco-fotos.json), con lo que importa
const POSTEO = {
  cuando: '2026-10-17T14:35:51.990Z', postId: '1254237411116171_122112943731495512', titulo: 'Santiago Gilligan busca sumar sus primeros minutos en la Serie A de Italia',
  enlace: 'https://radarbalcarce.com/nota/santiago-gilligan-busca-sumar-sus-primeros-minutos-en-la-serie-a-de-19nga6r', temas: [],
};
const IA = { '19nga6r': { archivo: 'fotos-notas/19nga6r-ia.jpg', credito: 'Ilustración generada con IA', origen: 'ia', cuando: '2026-10-17T14:22:12.554Z' } };
const BANCO = { '19nga6r': { archivo: 'fotos-notas/19nga6r.jpg', medio: 'El Diario Balcarce', credito: 'Foto: El Diario Balcarce', origen: 'medio', cuando: '2026-10-17T17:02:17.203Z' } };
const LIBRO = { facebook: { '19nga6r': POSTEO }, instagram: {} };
const A_LAS_17_30 = new Date('2026-10-17T17:30:00Z');

test('el caso real: la foto real llegó 2 horas y media DESPUÉS del posteo con la ilustración y hay que pedir la relectura', () => {
  const r = fotosCambiadasDespuesDelPosteo({ libro: LIBRO, banco: BANCO, fotosIA: IA, manuales: {}, ahora: A_LAS_17_30 });
  assert.equal(r.length, 1);
  assert.deepEqual({ id: r[0].id, enlace: r[0].enlace, origen: r[0].origen, desde: r[0].desde }, {
    id: '19nga6r', enlace: POSTEO.enlace, origen: 'real', desde: '2026-10-17T17:02:17.203Z',
  });
  assert.deepEqual(fotoQueSeVe('19nga6r', { banco: BANCO, fotosIA: IA }), { origen: 'real', cuando: '2026-10-17T17:02:17.203Z', archivo: 'fotos-notas/19nga6r.jpg' });
});

test('una sola vez por cambio: con la relectura ya anotada no se repite; un cambio NUEVO sí vuelve a pedirla', () => {
  const hecha = { facebook: { '19nga6r': { ...POSTEO, relectura: { cuando: '2026-10-17T17:31:00.000Z', deLaFoto: '2026-10-17T17:02:17.203Z', ok: true } } } };
  assert.deepEqual(fotosCambiadasDespuesDelPosteo({ libro: hecha, banco: BANCO, fotosIA: IA, ahora: A_LAS_17_30 }), []);
  const otraFoto = { '19nga6r': { ...BANCO['19nga6r'], cuando: '2026-10-17T18:10:00.000Z' } };
  assert.equal(fotosCambiadasDespuesDelPosteo({ libro: hecha, banco: otraFoto, ahora: new Date('2026-10-17T18:30:00Z') }).length, 1);
});

test('lo que NO cambió o no importa: foto de antes del posteo, ilustración detrás de una foto real, posteo de hace más de 48 horas', () => {
  // La foto ya estaba al publicar.
  assert.deepEqual(fotosCambiadasDespuesDelPosteo({ libro: LIBRO, banco: { '19nga6r': { ...BANCO['19nga6r'], cuando: '2026-10-17T14:00:00Z' } }, ahora: A_LAS_17_30 }), []);
  // Había foto real y después se generó una ilustración (la web sigue mostrando la real: no cambió nada visible).
  assert.deepEqual(fotosCambiadasDespuesDelPosteo({ libro: LIBRO, banco: { '19nga6r': { ...BANCO['19nga6r'], cuando: '2026-10-17T14:00:00Z' } }, fotosIA: { '19nga6r': { ...IA['19nga6r'], cuando: '2026-10-17T16:00:00Z' } }, ahora: A_LAS_17_30 }), []);
  // Pasaron 48 horas.
  assert.deepEqual(fotosCambiadasDespuesDelPosteo({ libro: LIBRO, banco: BANCO, ahora: new Date(Date.parse(POSTEO.cuando) + (HORAS_DE_RELECTURA + 1) * 3600e3) }), []);
  assert.equal(HORAS_DE_RELECTURA, 48);
  // Sin cuándo no se sabe: no se pide a ciegas. Sin foto, tampoco.
  assert.deepEqual(fotosCambiadasDespuesDelPosteo({ libro: LIBRO, banco: { '19nga6r': { archivo: 'x.jpg' } }, ahora: A_LAS_17_30 }), []);
  assert.deepEqual(fotosCambiadasDespuesDelPosteo({ libro: LIBRO, ahora: A_LAS_17_30 }), []);
  // Un posteo de otra nota, sin foto nueva.
  assert.deepEqual(fotosCambiadasDespuesDelPosteo({ libro: { facebook: { otra: { ...POSTEO, enlace: 'https://radarbalcarce.com/nota/otra-otra' } } }, banco: BANCO, ahora: A_LAS_17_30 }), []);
});

test('Meta: la relectura es POST /?id=<enlace>&scrape=true con el token de la página, que viaja en el encabezado', async () => {
  const pedidos = [];
  const fetchFn = async (url, init) => {
    pedidos.push({ url: String(url), init });
    const esPagina = String(url).includes('/123?');
    return { ok: true, status: 200, json: async () => (esPagina ? { name: 'Radar', access_token: 'TOKEN-DE-PAGINA', instagram_business_account: { id: '9', username: 'r' } } : { success: true }) };
  };
  const api = crearCliente({ token: 'TOKEN-SECRETO', paginaId: '123', fetchFn });
  const r = await api.releerEnlace({ enlace: POSTEO.enlace });
  assert.equal(r.ok, true);
  const p = pedidos.at(-1);
  assert.equal(p.init.method, 'POST');
  assert.match(p.url, /^https:\/\/graph\.facebook\.com\/v23\.0\/$/, 'la dirección no lleva el token ni el enlace');
  assert.equal(p.init.headers.Authorization, 'Bearer TOKEN-DE-PAGINA');
  const cuerpo = new URLSearchParams(p.init.body);
  assert.equal(cuerpo.get('id'), POSTEO.enlace);
  assert.equal(cuerpo.get('scrape'), 'true');
});

// ---- de punta a punta: el programa de Facebook, con un Meta de mentira y carpetas de mentira

async function conMundo(libro, { activo = true, banco = BANCO, ia = IA } = {}, correr) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'foto-cambiada-'));
  fs.mkdirSync(path.join(raiz, 'web', 'data'), { recursive: true });
  const escribir = (f, o) => fs.writeFileSync(path.join(raiz, 'web', 'data', f), JSON.stringify(o));
  escribir('portada.json', { notas: [] });
  escribir('redes.json', libro);
  escribir('banco-fotos.json', banco);
  escribir('fotos-ia.json', ia);
  escribir('fotos-manuales.json', {});
  const llamadas = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    llamadas.push({ url: String(url), metodo: init.method ?? 'GET', cuerpo: init.body ? String(init.body) : '' });
    const esPagina = /graph\.facebook\.com\/v[\d.]+\/\d+\?/.test(String(url));
    return { ok: true, status: 200, json: async () => (esPagina ? { name: 'Radar', access_token: 'TP', instagram_business_account: { id: '9', username: 'r' } } : { success: true }) };
  };
  const mudo = console.log;
  const tokenAntes = process.env.META_TOKEN;
  console.log = () => {};
  process.env.META_TOKEN = 'TOKEN-SECRETO'; // (publicar.mjs lo lee de process.env)
  try {
    const env = { META_TOKEN: 'TOKEN-SECRETO', REDES_ACTIVAS: activo ? 'Si' : 'No', SITIO: 'https://radarbalcarce.com' };
    const codigo = await correr({ raiz, env });
    return { llamadas, codigo, libro: JSON.parse(fs.readFileSync(path.join(raiz, 'web', 'data', 'redes.json'), 'utf8')) };
  } finally {
    console.log = mudo;
    if (tokenAntes === undefined) delete process.env.META_TOKEN; else process.env.META_TOKEN = tokenAntes;
    globalThis.fetch = original;
    fs.rmSync(raiz, { recursive: true, force: true });
  }
}

/** Un libro con el posteo de la nota "hace 3 horas" y la foto real "hace 1 hora" (relativo a ahora: la función mira el reloj de verdad). */
const libroDeAhora = () => {
  const ahora = Date.now();
  return {
    libro: { facebook: { '19nga6r': { ...POSTEO, cuando: new Date(ahora - 3 * 3600e3).toISOString() } }, instagram: {} },
    banco: { '19nga6r': { ...BANCO['19nga6r'], cuando: new Date(ahora - 3600e3).toISOString() } },
    ia: { '19nga6r': { ...IA['19nga6r'], cuando: new Date(ahora - 3 * 3600e3 - 13 * 60e3).toISOString() } },
  };
};

test('de punta a punta: se pide la relectura UNA vez, queda anotada en el libro y la vuelta siguiente no repite', async () => {
  const { libro, banco, ia } = libroDeAhora();
  const r = await conMundo(libro, { banco, ia }, ({ raiz, env }) => main({ argv: ['--facebook'], env, raiz }));
  assert.equal(r.codigo, 0);
  const lecturas = r.llamadas.filter((l) => l.metodo === 'POST');
  assert.equal(lecturas.length, 1);
  assert.match(lecturas[0].url, /graph\.facebook\.com\/v23\.0\/$/);
  assert.equal(new URLSearchParams(lecturas[0].cuerpo).get('id'), POSTEO.enlace);
  assert.equal(new URLSearchParams(lecturas[0].cuerpo).get('scrape'), 'true');
  const anotada = r.libro.facebook['19nga6r'].relectura;
  assert.equal(anotada.ok, true);
  assert.equal(anotada.deLaFoto, banco['19nga6r'].cuando);
  assert.equal(r.libro.facebook['19nga6r'].postId, POSTEO.postId, 'el posteo no se toca');
  // Segunda vuelta con el libro ya anotado: ninguna relectura más.
  const otra = await conMundo(r.libro, { banco, ia }, ({ raiz, env }) => main({ argv: ['--facebook'], env, raiz }));
  assert.equal(otra.llamadas.filter((l) => l.metodo === 'POST').length, 0);
});

test('con las redes apagadas no se pide nada (simula), y el programa lee los tres libros de fotos', async () => {
  const { libro, banco, ia } = libroDeAhora();
  const r = await conMundo(libro, { banco, ia, activo: false }, ({ raiz, env }) => main({ argv: ['--facebook'], env, raiz }));
  assert.equal(r.llamadas.filter((l) => l.metodo === 'POST').length, 0);
  assert.equal(r.libro.facebook['19nga6r'].relectura, undefined);
  for (const f of ['web/data/banco-fotos.json', 'web/data/fotos-manuales.json', 'web/data/fotos-ia.json']) assert.ok(ARCHIVOS_QUE_LEE.includes(f), `${f} no está en lo que lee el programa`);
});

test('si Meta rechaza la relectura, queda anotado el intento (no se insiste cada media hora) y el programa sigue', async () => {
  const { libro, banco, ia } = libroDeAhora();
  const raizOriginal = globalThis.fetch;
  const r = await conMundo(libro, { banco, ia }, async ({ raiz, env }) => {
    const buena = globalThis.fetch;
    globalThis.fetch = async (url, init = {}) => {
      if (init.method === 'POST') return { ok: false, status: 400, json: async () => ({ error: { message: 'Invalid URL', code: 100 } }) };
      return buena(url, init);
    };
    return main({ argv: ['--facebook'], env, raiz });
  });
  assert.equal(r.codigo, 0);
  assert.equal(r.libro.facebook['19nga6r'].relectura.ok, false);
  assert.match(r.libro.facebook['19nga6r'].relectura.error, /Invalid URL/);
  assert.equal(globalThis.fetch, raizOriginal);
});

// ---- esperar a la foto definitiva (la alternativa propuesta; apagada)

test('esFotoDeIA y esperaFotoDefinitiva: sólo una ilustración de IA espera, sólo si la regla está prendida y sólo hasta cumplir las horas', () => {
  const conIA = { id: 'x', foto: { archivo: 'fotos-notas/x-ia.jpg', credito: 'Ilustración generada con IA' } };
  const conReal = { id: 'y', foto: { archivo: 'fotos-notas/y.jpg', credito: 'Foto: El Diario Balcarce' } };
  assert.equal(esFotoDeIA(conIA), true);
  assert.equal(esFotoDeIA(conReal), false);
  assert.equal(esFotoDeIA({ id: 'z' }), false);
  assert.equal(esperaFotoDefinitiva(conIA, 30, 0), false, 'apagada por defecto');
  assert.equal(REGLAS_FACEBOOK.horasEsperandoFotoReal, 0);
  assert.equal(esperaFotoDefinitiva(conIA, 30, 3), true);
  assert.equal(esperaFotoDefinitiva(conIA, 181, 3), false, 'pasadas las horas, sale con la ilustración');
  assert.equal(esperaFotoDefinitiva(conReal, 30, 3), false);
  assert.equal(esperaFotoDefinitiva({ ...conIA, aprobadaParaRedes: '2026-10-17T10:00:00Z' }, 30, 3), false, 'lo que marcó una persona no espera');
});

test('elegirParaFacebook respeta la espera cuando se prende (la ilustración espera; la foto real no)', () => {
  const ahora = new Date('2026-10-17T15:00:00Z'); // 12:00 en Balcarce
  const nota = (id, foto) => ({
    id, titulo: `Titular distinto ${id} con palabras largas`, copete: 'c', cuerpo: Array.from({ length: 90 }, () => 'palabra').join(' '), seccion: 'Balcarce', local: true, relevancia: 90,
    medios: ['El Diario Balcarce'], publicadaCuando: '2026-10-17T13:30:00Z', foto, temas: [],
  });
  const ia = nota('ia', { archivo: 'fotos-notas/ia-ia.jpg', credito: 'Ilustración generada con IA' });
  const real = nota('real', { archivo: 'fotos-notas/real.jpg', credito: 'Foto: X' });
  assert.deepEqual(elegirParaFacebook({ notas: [ia], libro: libroNuevo(), ahora }).map((n) => n.id), ['ia'], 'hoy: sale con la ilustración');
  const prendida = { ...REGLAS_FACEBOOK, horasEsperandoFotoReal: 3 };
  assert.deepEqual(elegirParaFacebook({ notas: [ia], libro: libroNuevo(), ahora, reglas: prendida }), [], 'prendida: espera la foto real (1 h 30 de vida, pide 3)');
  assert.deepEqual(elegirParaFacebook({ notas: [real], libro: libroNuevo(), ahora, reglas: prendida }).map((n) => n.id), ['real']);
  assert.deepEqual(elegirParaFacebook({ notas: [ia], libro: libroNuevo(), ahora: new Date('2026-10-17T17:00:00Z'), reglas: prendida }).map((n) => n.id), ['ia'], 'a las 3 horas sale igual');
});
