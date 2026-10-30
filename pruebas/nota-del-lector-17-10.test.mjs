// La página de la nota para el lector (17/10/2026, reglas 253, 254 y 256): "Publicado" y "Actualizado", compartir por WhatsApp y copiar enlace,
// la fuente original a la vista y avisar de un error. Sin red y sin compilar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fechaDeModificacion, actualizadaCuando, MINUTOS_PARA_ACTUALIZADA } from '../web/lib/tiempo.js';
import { correccionesAMano, conCorreccion } from '../web/lib/archivo.js';
import { enlaceDeWhatsApp } from '../web/lib/compartir.js';
import { fuentesDeLaNota } from '../web/lib/fuentes-de-la-nota.js';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const AHORA = Date.parse('2026-10-17T18:00:00Z');
const nota = (extra = {}) => ({ id: 'a', titulo: 'T', fecha: '2026-10-17T12:00:00.000Z', ...extra });

// ----------------------------------------------------------- Publicado y Actualizado (regla 253)

test('"Actualizado" sólo aparece si una persona corrigió la nota más de media hora después de que salió', () => {
  assert.equal(MINUTOS_PARA_ACTUALIZADA, 30);
  assert.equal(actualizadaCuando(nota(), AHORA), null, 'sin corrección no hay nada que decir');
  assert.equal(actualizadaCuando(nota({ corregidaCuando: '2026-10-17T12:20:00.000Z' }), AHORA), null, 'a los 20 minutos es parte de salir');
  assert.equal(actualizadaCuando(nota({ corregidaCuando: '2026-10-17T15:30:00.000Z' }), AHORA), '2026-10-17T15:30:00.000Z');
  assert.equal(actualizadaCuando(nota({ corregidaCuando: '2026-10-17T10:00:00.000Z' }), AHORA), null, 'nunca antes de que saliera');
  assert.equal(actualizadaCuando(nota({ corregidaCuando: '2026-10-18T10:00:00.000Z' }), AHORA), null, 'ni una fecha del futuro');
  assert.equal(actualizadaCuando(nota({ corregidaCuando: 'no es una fecha' }), AHORA), null);
  assert.equal(actualizadaCuando(nota({ fecha: 'rota', corregidaCuando: '2026-10-17T15:30:00.000Z' }), AHORA), null);
});

test('"Actualizado" no es publicadaCuando: cuándo se aprobó no es cuándo se corrigió', () => {
  assert.equal(actualizadaCuando(nota({ publicadaCuando: '2026-10-17T16:00:00.000Z' }), AHORA), null);
});

test('la fecha de la nota no se mueve: dateModified sube con la corrección pero datePublished es `fecha`', () => {
  const n = nota({ publicadaCuando: '2026-10-17T12:10:00.000Z', corregidaCuando: '2026-10-17T15:30:00.000Z' });
  assert.equal(fechaDeModificacion(n), '2026-10-17T15:30:00.000Z');
  assert.equal(n.fecha, '2026-10-17T12:00:00.000Z');
  // Lo de siempre: nunca anterior a la de publicación, y sin nada más, igual a `fecha`.
  assert.equal(fechaDeModificacion(nota()), '2026-10-17T12:00:00.000Z');
  assert.equal(fechaDeModificacion(nota({ publicadaCuando: '2026-10-17T10:00:00.000Z' })), '2026-10-17T12:00:00.000Z');
  assert.equal(fechaDeModificacion(nota({ publicadaCuando: '2026-10-17T13:00:00.000Z' })), '2026-10-17T13:00:00.000Z');
  assert.equal(fechaDeModificacion({ id: 'x', fecha: 'rota', publicadaCuando: '2026-10-17T13:00:00.000Z' }), '2026-10-17T13:00:00.000Z');
});

test('una corrección a mano deja la fecha de su corrección en la nota, sin tocar `fecha`', () => {
  const c = correccionesAMano({ notas: {
    a: { titulo: 'Título corregido', motivo: 'error', cuando: '2026-10-17T15:30:00.000Z', por: 'Hernán' },
    b: { titulo: 'Sin fecha válida', motivo: 'error', cuando: 'mañana' },
    c: { motivo: 'sin campos', cuando: '2026-10-17T15:30:00.000Z' },
  } });
  assert.deepEqual([...c.keys()], ['a', 'b']);
  const r = conCorreccion(nota(), c);
  assert.equal(r.titulo, 'Título corregido');
  assert.equal(r.corregidaCuando, '2026-10-17T15:30:00.000Z');
  assert.equal(r.fecha, '2026-10-17T12:00:00.000Z');
  assert.equal(conCorreccion(nota({ id: 'b' }), c).corregidaCuando, undefined);
});

test('la página muestra "Publicado" siempre y "Actualizado" sólo cuando corresponde, en <time> con la fecha exacta', () => {
  const p = leer('web/components/piezas.js');
  assert.match(p, /export function FechasDeLaNota/);
  // 30/10: sin la palabra "Publicado" (Hernán: la fecha va chica y discreta, como en los diarios).
  assert.match(p, /<span className="meta fecha-exacta"><time dateTime=\{new Date\(nota\.fecha\)\.toISOString\(\)\}>/);
  assert.match(p, /actualizadoISO && \(/);
  assert.match(p, /Actualizado: <time dateTime=\{actualizadoISO\}>/);
  assert.match(leer('web/app/nota/[id]/page.js'), /<FechasDeLaNota nota=\{n\} \/>/);
  // El marcado dice lo mismo que la página.
  assert.match(leer('web/components/ficha.js'), /dateModified: fechaDeModificacion\(nota\)/);
});

// ----------------------------------------------------------- compartir (regla 254)

test('WhatsApp es un enlace común con el titular y la dirección canónica, sin JavaScript', () => {
  const href = enlaceDeWhatsApp('Fangio  vuelve\na Balcarce', 'https://radarbalcarce.com/nota/fangio-vuelve-abc');
  assert.equal(href, `https://wa.me/?text=${encodeURIComponent('Fangio vuelve a Balcarce\n\nhttps://radarbalcarce.com/nota/fangio-vuelve-abc')}`);
  const c = leer('web/components/compartir.js');
  assert.ok(!c.includes("'use client'"), 'el botón de WhatsApp tiene que armarse al compilar, no en el navegador');
  assert.match(c, /<a href=\{enlaceDeWhatsApp\(titulo, url\)\}/);
  assert.match(c, /rel="noopener noreferrer"/);
  assert.match(c, /const url = enlace\(camino \?\? '\/'\)/);
  // Nada de terceros ni de cookies.
  for (const f of ['web/components/compartir.js', 'web/components/copiar-enlace.js', 'web/lib/compartir.js']) {
    assert.ok(!/document\.cookie|<script|facebook\.com\/sharer|platform\.twitter|addthis|sharethis/i.test(leer(f)), `${f} mete algo de terceros`);
  }
});

test('copiar enlace es lo único que necesita JavaScript y copia la dirección canónica, no la del navegador', () => {
  const c = leer('web/components/copiar-enlace.js');
  assert.match(c, /^'use client';/m);
  assert.match(c, /navigator\.clipboard\.writeText\(url\)/);
  assert.ok(!/window\.location/.test(c), 'copiar lo que el navegador tenga en la barra mandaría los parámetros de seguimiento');
  // La nota y la agenda le pasan su dirección.
  assert.match(leer('web/app/nota/[id]/page.js'), /<Compartir titulo=\{n\.titulo\} camino=\{n\.ruta\} \/>/);
  assert.match(leer('web/app/agenda/[id]/page.js'), /camino=\{e\.ruta\}/);
});

// ----------------------------------------------------------- la fuente original a la vista (regla 254)

test('la nota no muestra una "fuente principal" suelta: todas las fuentes van en el desplegable (24/10, Hernán: la nota se arma con todas)', () => {
  const p = leer('web/app/nota/[id]/page.js');
  assert.ok(!/FuenteOriginal/.test(p), 'la página de la nota vuelve a mostrar una sola fuente como principal');
  assert.ok(p.includes('<FuentesDeLaNota nota={n} />'), 'el desplegable con todas las fuentes sigue estando');
  assert.ok(!/Leer la nota original/.test(leer('web/components/piezas.js')));
});

test('la fuente que se enlaza es una que el lector puede abrir: nunca la entrada XML de un feed', () => {
  const f = fuentesDeLaNota({ medios: ['Infórmese Primero'], enlace: 'http://www.blogger.com/feeds/123/posts/default/456', fuentesConsultadas: [{ medio: 'La Nación', enlace: 'https://www.lanacion.com.ar/x' }] });
  assert.equal(f[0].enlace, 'https://www.lanacion.com.ar/x');
  const solo = fuentesDeLaNota({ medios: ['Infórmese Primero'], enlace: 'http://www.blogger.com/feeds/123/posts/default/456' });
  assert.equal(solo[0].enlace, null, 'sin página para el lector, no hay enlace (el componente no dibuja nada)');
});

// ----------------------------------------------------------- avisar de un error (regla 256)

test('cada nota tiene un enlace para avisar de un error, con el titular y la dirección ya escritos', () => {
  const c = leer('web/components/piezas.js');
  assert.match(c, /export function AvisarDeUnError/);
  assert.match(c, /Corrección: \$\{titulo\}/);
  assert.match(c, /mailto:\$\{MAIL\}\?subject=/);
  assert.match(c, /#como-corregimos/);
  assert.match(leer('web/app/nota/[id]/page.js'), /<AvisarDeUnError titulo=\{n\.titulo\} url=\{enlace\(n\.ruta\)\} \/>/);
});
