import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio } from './sitio.mjs';
import { ESTILOS } from './vistas/base.mjs';
import { baseDePrueba, insertarNota } from './ayuda-pruebas.mjs';

const sitio = crearSitio({ traer: async () => { throw new Error('sin red'); }, ahora: () => new Date('2026-11-02T21:00:00.000Z') });
const ir = (env, ruta) => sitio.manejar(new Request(`https://radarbalcarce.com${ruta}`), env, null, { cache: null });

test('«Saltar al contenido»: primer enlace del cuerpo, lleva a un main con id, y sólo se ve al enfocarlo', async () => {
  const { env } = baseDePrueba();
  const html = await (await ir(env, '/')).text();
  assert.match(html, /<body>\s*<a class="saltar" href="#contenido">Saltar al contenido<\/a>/);
  assert.match(html, /<main class="ancho" id="contenido" tabindex="-1">/);
  assert.match(ESTILOS, /\.saltar\{position:absolute;left:-9999px/);
  assert.match(ESTILOS, /\.saltar:focus\{left:8px/);
});

test('toques de 44 px en el celular: botón de secciones, Buscar, resumen de Fuentes, fuentes, pie y cookies', () => {
  const bloque = ESTILOS.slice(ESTILOS.indexOf('@media(max-width:759px),(pointer:coarse){'));
  for (const regla of ['#mb,form.buscar button,form.buscar input{min-height:44px}', 'details.fuentes summary{display:flex;align-items:center;min-height:44px}', 'details.fuentes li a{display:inline-flex;align-items:center;min-height:44px',
    'footer.pie p a,footer.pie button.enlace{display:inline-block;padding:13px 6px}', '.ck button{min-height:44px', 'a.etiqueta::after,.migas a::after{content:""']) assert.ok(bloque.includes(regla), regla);
});

test('max-image-preview:large sólo en las notas indexables; lo que no se indexa sigue con noindex', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  const nota = await (await ir(env, '/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234')).text();
  assert.ok(nota.includes('<meta name="robots" content="max-image-preview:large">'));
  assert.ok(!(await (await ir(env, '/seccion/balcarce')).text()).includes('max-image-preview'));
  const sinIndexar = await (await sitio.manejar(new Request('https://radarbalcarce.com/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234'), { ...env, INDEXAR: 'no' }, null, { cache: null })).text();
  assert.ok(sinIndexar.includes('noindex,nofollow') && !sinIndexar.includes('max-image-preview'));
});
