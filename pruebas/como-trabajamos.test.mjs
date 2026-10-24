// "Cómo trabajamos" y el canal de correcciones (17/10/2026, regla 256). Sin red y sin compilar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ANCLAS_DE_POLITICAS } from '../web/lib/datos-estructurados.js';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const pagina = leer('web/app/quienes-somos/page.js');
const contacto = leer('web/app/contacto/page.js');

test('"Cómo trabajamos" cuenta lo que un lector, otro medio o un buscador quieren saber', () => {
  const texto = pagina.replace(/\s+/g, ' ');
  for (const [que, re] of [
    ['que se resume lo que publicaron otros medios', /Resumimos lo que publicaron otros medios/],
    ['que las fuentes están en un desplegable, con enlace', /desplegable «Fuentes \(N\)» que lista todos los medios que se usaron, cada uno con el enlace/],
    ['que se usa IA', /Las notas las escribe una inteligencia artificial/],
    ['que la IA puede equivocarse', /puede equivocarse/],
    ['qué espera a una persona', /Lo sensible lo revisa una persona/],
    ['cómo se corrige un error', /Cómo corregimos un error/],
    ['cómo pedir que no usemos algo', /Si no querés que usemos algo/],
    ['las fechas', /Las fechas son las del hecho/],
    ['las ilustraciones con IA', /ilustración hecha con IA, que lo dice en el epígrafe/],
  ]) assert.match(texto, re, `falta: ${que}`);
});

test('los títulos que usan los datos estructurados siguen en su lugar, y los nuevos se pueden enlazar', () => {
  for (const ancla of [ANCLAS_DE_POLITICAS.quienes, ANCLAS_DE_POLITICAS.comoTrabajamos, ANCLAS_DE_POLITICAS.loQueNoHacemos]) {
    const id = ancla.split('#')[1];
    assert.ok(pagina.includes(`id="${id}"`), `/quienes-somos perdió #${id}`);
  }
  assert.ok(contacto.includes(`id="${ANCLAS_DE_POLITICAS.correcciones.split('#')[1]}"`), '/contacto perdió #correcciones');
  for (const id of ['si-algo-esta-mal', 'como-corregimos', 'no-usar-algo']) assert.ok(pagina.includes(`id="${id}"`), `falta #${id}`);
});

test('el canal de correcciones usa el correo y el WhatsApp que ya existen en el sitio: no se inventa ninguna dirección', () => {
  assert.match(pagina, /import \{ MAIL, whatsapp, WHATSAPP \} from '@\/lib\/datos'/);
  // Ningún correo escrito a mano en la página: todo sale de MAIL.
  assert.ok(!/[\w.-]+@[\w-]+\.\w+/.test(pagina.replace(/\/\/.*$/gm, '')), 'hay una dirección de correo escrita a mano');
  const datos = leer('web/lib/datos.js');
  assert.match(datos, /export const MAIL = 'contacto@radarbalcarce\.com'/);
  assert.match(pagina, /mailto:\$\{MAIL\}/);
  // La página de contacto sigue ofreciendo los dos canales y explica cómo seguimos un pedido.
  assert.match(contacto, /#como-corregimos/);
  assert.match(contacto, /#no-usar-algo/);
});

test('el pie y cada nota llevan a "Cómo trabajamos" y a cómo corregimos', () => {
  const pie = leer('web/app/layout.js');
  assert.match(pie, /href="\/quienes-somos#como-trabajamos">Cómo trabajamos/);
  assert.match(pie, /href="\/contacto">Contacto y correcciones/);
  assert.match(leer('web/components/piezas.js'), /href="\/quienes-somos#como-corregimos">cómo corregimos/);
  // El desplegable de fuentes ya tenía el suyo.
  assert.match(leer('web/components/verificacion.js'), /<a href="\/quienes-somos">Cómo trabajamos<\/a>/);
});

test('la página no promete lo que no existe', () => {
  const texto = pagina.replace(/\s+/g, ' ');
  // No hay registro público de correcciones (D6 de la auditoría SEO): la página lo dice en vez de prometerlo.
  assert.match(texto, /Hoy no llevamos un registro público de correcciones/);
  // Ni plazos de respuesta, ni garantías que el código no cumple.
  assert.ok(!/en \d+ (horas|días)|24 horas|inmediatamente|siempre revisada por una persona/i.test(texto), 'promete un plazo o una revisión humana total');
  // Sigue sin nombrar apellidos ni teléfonos particulares.
  assert.ok(!/gerace|balcar-?dev/i.test(pagina));
});

test('la página sigue en castellano rioplatense, sin voseo forzado ni vosotros', () => {
  assert.ok(!/\b(vosotros|vuestro|tenéis|escribidnos|pedidnos)\b/i.test(pagina));
  assert.ok(!/pedínoslo/.test(pagina));
});
