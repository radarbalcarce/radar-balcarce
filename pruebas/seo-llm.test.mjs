// SEO y asistentes de IA (16/10/2026, docs/seo/AUDITORIA-SEO-LLM.md): robots.txt con su política hacia la IA, datos estructurados más completos,
// sitemaps sin páginas noindex, los tres JSON "para agentes", llms.txt y IndexNow. Sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  textoDeRobots, BOTS_DE_BUSQUEDA_Y_ASISTENTES, BOTS_DE_ENTRENAMIENTO, ENTRENAMIENTO_IA, RESPUESTAS_IA,
} from '../web/lib/robots.js';
import {
  politicasDelMedio, puntosDeContacto, imagenesDeNota, lugarDeNota, palabrasDeNota, camposExtraDeNota, fotoParaElSitemap, ANCLAS_DE_POLITICAS,
} from '../web/lib/datos-estructurados.js';
import { medirImagen, dimensionesDeFoto } from '../web/lib/dimensiones-foto.js';
import {
  armarUltimas, armarIndice, armarServicios, notaParaAgentes, COLUMNAS_DEL_INDICE, MAXIMO_ULTIMAS, MAXIMO_INDICE, ESQUEMA,
} from '../web/lib/para-agentes.js';
import { autorDeNota } from '../web/components/metadatos.js';
import { CLAVE_INDEXNOW } from '../redes/indexnow.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const BASE = 'https://radarbalcarce.com';
const cuerpo = Array.from({ length: 90 }, (_, i) => `palabra${i}`).join(' ');
const nota = (id, extra = {}) => ({
  id, ruta: `/nota/titulo-${id}`, titulo: `Titular ${id}`, copete: `Bajada de ${id}`, cuerpo, seccion: 'Balcarce', fecha: '2026-10-15T20:00:00.000Z',
  medios: ['El Diario Balcarce', 'La Nación'], local: true, como: 'automatica', guion: 'x', etiquetas: ['autódromo'], ...extra,
});

// ----------------------------------------------------------------- robots.txt

test('robots.txt: todo permitido menos el panel, con la política hacia la IA escrita y los dos sitemaps', () => {
  const t = textoDeRobots({ base: BASE, propio: true });
  assert.match(t, /^User-agent: \*\nContent-Signal: search=yes, ai-input=yes, ai-train=yes\nAllow: \/\nDisallow: \/panel\/$/m);
  assert.match(t, new RegExp(`^Sitemap: ${BASE}/sitemap\\.xml$`, 'm'));
  assert.match(t, new RegExp(`^Sitemap: ${BASE}/sitemap-news\\.xml$`, 'm'));
  // Cada bot de IA está nombrado una vez, y un grupo con bots propios repite el /panel/ (si no, Google lo leería como permitido para ellos).
  for (const bot of [...BOTS_DE_BUSQUEDA_Y_ASISTENTES, ...BOTS_DE_ENTRENAMIENTO]) {
    assert.equal((t.match(new RegExp(`^User-agent: ${bot}$`, 'mg')) ?? []).length, 1, bot);
  }
  for (const bloque of t.split('\n\n').filter((b) => /^User-agent:/m.test(b))) {
    assert.match(bloque, /^Disallow: \/panel\/$/m, `un grupo no protege el panel:\n${bloque}`);
  }
  assert.ok(!/Disallow: \/$/m.test(t), 'con la política de hoy no se bloquea a nadie');
  assert.equal(ENTRENAMIENTO_IA, true);
  assert.equal(RESPUESTAS_IA, true);
});

test('robots.txt: los buscadores y asistentes de IA que traen lectores están permitidos aunque se cierre el entrenamiento', () => {
  const t = textoDeRobots({ base: BASE, propio: true, entrenamiento: false });
  assert.match(t, /ai-train=no/);
  assert.match(t, /^User-agent: GPTBot\n[\s\S]*?^Disallow: \/$/m, 'GPTBot queda cerrado');
  assert.match(t, /^User-agent: OAI-SearchBot\n[\s\S]*?^Allow: \/$/m, 'el buscador de ChatGPT sigue abierto');
  // Nunca se nombran como bloqueables los de búsqueda con el entrenamiento cerrado.
  const bloqueados = t.split('\n\n').filter((b) => /^Disallow: \/$/m.test(b)).join('\n');
  for (const bot of BOTS_DE_BUSQUEDA_Y_ASISTENTES) assert.ok(!new RegExp(`^User-agent: ${bot}$`, 'm').test(bloqueados), bot);
});

test('robots.txt: fuera del dominio propio prohíbe indexar y el feed nunca se bloquea', () => {
  const t = textoDeRobots({ base: 'http://localhost:3000', propio: false });
  assert.match(t, /^User-agent: \*\nDisallow: \/$/m);
  assert.ok(!/Content-Signal/.test(t));
  assert.ok(!/feed\.xml/.test(textoDeRobots({ base: BASE, propio: true }).split('\n').filter((l) => /^Disallow/.test(l)).join('\n')));
});

test('robots.txt es una ruta (no web/app/robots.js, que no deja escribir Content-Signal) y los JSON para agentes no se bloquean', () => {
  assert.ok(!fs.existsSync(new URL('../web/app/robots.js', import.meta.url)), 'robots.js y robots.txt/route.js a la vez se pisan');
  assert.match(leer('web/app/robots.txt/route.js'), /textoDeRobots\(\)/);
  assert.match(leer('web/app/robots.txt/route.js'), /force-static/);
  assert.ok(!/Disallow: \/agentes/.test(textoDeRobots({ base: BASE, propio: true })));
  const h = leer('web/public/_headers');
  assert.match(h, /^\/agentes\/\*\n  X-Robots-Tag: noindex$/m);
  assert.match(h, /^  Access-Control-Allow-Origin: \*$/m);
});

// ----------------------------------------------------------------- datos estructurados

test('las políticas editoriales del medio apuntan a anclas que existen en las páginas', () => {
  const p = politicasDelMedio(BASE);
  for (const k of ['publishingPrinciples', 'correctionsPolicy', 'actionableFeedbackPolicy', 'ethicsPolicy', 'verificationFactCheckingPolicy', 'noBylinesPolicy', 'ownershipFundingInfo', 'masthead']) {
    assert.ok(p[k]?.startsWith(`${BASE}/`), k);
  }
  const paginas = { '/quienes-somos': leer('web/app/quienes-somos/page.js'), '/contacto': leer('web/app/contacto/page.js') };
  for (const ancla of Object.values(ANCLAS_DE_POLITICAS)) {
    const [pagina, id] = ancla.split('#');
    assert.ok(paginas[pagina].includes(`id="${id}"`), `${pagina} no tiene el título con id="${id}"`);
  }
  // Lo que ya estaba no cambió de lugar.
  assert.equal(p.publishingPrinciples, `${BASE}/quienes-somos`);
  assert.equal(p.correctionsPolicy, `${BASE}/contacto`);
});

test('el medio publica cómo contactarlo con lo mismo que el pie del sitio, sin inventar teléfonos', () => {
  const [c] = puntosDeContacto({ email: 'contacto@radarbalcarce.com', whatsapp: '5492266511612' });
  assert.equal(c['@type'], 'ContactPoint');
  assert.equal(c.telephone, '+5492266511612');
  assert.equal(c.email, 'contacto@radarbalcarce.com');
  const ficha = leer('web/components/ficha.js');
  assert.match(ficha, /\.\.\.politicasDelMedio\(base\)/);
  assert.match(ficha, /contactPoint: puntosDeContacto\(\{ email: 'contacto@radarbalcarce\.com', whatsapp: WHATSAPP\.numero \}\)/);
  // No se inventa lo que no se sabe: ni fecha de fundación ni domicilio (Google penaliza marcado que la página no muestra).
  assert.ok(!/foundingDate|streetAddress|postalCode/.test(ficha), 'datos del medio que no tenemos');
});

test('el autor de una nota apunta a la página donde se explica quién escribe', () => {
  assert.equal(autorDeNota({ guion: 'x', como: 'automatica', medios: ['X'] }, BASE).url, `${BASE}/quienes-somos`);
  assert.equal(autorDeNota({ propia: true }, BASE).url, `${BASE}/quienes-somos`);
  assert.equal(autorDeNota({ guion: 'x', como: 'publicada' }, BASE).url, `${BASE}/quienes-somos`);
  // Cuando el texto es de la fuente, el autor es el medio de la fuente (como siempre).
  assert.equal(autorDeNota({ guion: null, como: 'automatica', medios: ['El Diario Balcarce'] }, BASE).name, 'El Diario Balcarce');
});

test('imágenes de una nota: la foto grande primero, la chica después de la tarjeta, la diminuta nunca', () => {
  const tarjeta = `${BASE}/nota/x/opengraph-image`;
  const urlFoto = (a) => `${BASE}/${a}`;
  const n = { foto: { archivo: 'fotos-notas/a.jpg', credito: 'Foto: TN' } };
  const con = (d) => imagenesDeNota({ nota: n, tarjeta, urlFoto, dimensiones: () => d });
  const grande = con({ ancho: 1200, alto: 800 });
  assert.equal(grande.length, 2);
  assert.equal(grande[0]['@type'], 'ImageObject');
  assert.equal(grande[0].url, `${BASE}/fotos-notas/a.jpg`);
  assert.equal(grande[0].width, 1200);
  assert.equal(grande[0].creditText, 'Foto: TN');
  assert.equal(grande[1], tarjeta);
  const chica = con({ ancho: 800, alto: 500 });
  assert.equal(chica[0], tarjeta);
  assert.equal(chica[1].width, 800);
  assert.deepEqual(con({ ancho: 206, alto: 132 }), [tarjeta], 'una foto diminuta no se declara');
  assert.deepEqual(con({ ancho: 1200, alto: 4000 }).slice(0, 1), [tarjeta], 'una foto muy vertical no es la imagen principal');
  assert.deepEqual(con(null), [tarjeta], 'sin saber cuánto mide, no se promete');
  assert.deepEqual(imagenesDeNota({ nota: {}, tarjeta, urlFoto }), [tarjeta]);
  // Sin crédito no se inventa uno.
  assert.ok(!('creditText' in imagenesDeNota({ nota: { foto: { archivo: 'fotos-notas/a.jpg' } }, tarjeta, urlFoto, dimensiones: () => ({ ancho: 1200, alto: 800 }) })[0]));
});

test('el lugar y las palabras de la nota: Balcarce sólo si la nota es de acá, y el conteo sale del cuerpo', () => {
  assert.equal(lugarDeNota({ local: true }).name, 'Balcarce');
  assert.equal(lugarDeNota({ local: false }), undefined);
  assert.equal(palabrasDeNota({ cuerpo }), 90);
  assert.equal(palabrasDeNota({ cuerpo: '' }), undefined);
  const extra = camposExtraDeNota({ nota: nota('a'), tarjeta: 't', urlFoto: (a) => a, dimensiones: () => null });
  assert.deepEqual(Object.keys(extra), ['image', 'contentLocation', 'wordCount']);
  const ficha = leer('web/components/ficha.js');
  assert.match(ficha, /\.\.\.camposExtraDeNota\(\{/);
  assert.match(ficha, /dimensiones: dimensionesDeFoto/);
});

test('la medida de una foto sale de su cabecera (JPEG y PNG) y de una foto real del banco', () => {
  // Un JPEG mínimo: SOI, un segmento APP0 corto y un SOF0 de 640 × 480.
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x01, 0xe0, 0x02, 0x80, 0x01, 0x01, 0x11, 0x00]);
  assert.deepEqual(medirImagen(jpeg), { ancho: 640, alto: 480 });
  const png = Buffer.alloc(32);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
  png.writeUInt32BE(13, 8); png.write('IHDR', 12); png.writeUInt32BE(1200, 16); png.writeUInt32BE(630, 20);
  assert.deepEqual(medirImagen(png), { ancho: 1200, alto: 630 });
  assert.equal(medirImagen(Buffer.from('no es una imagen, pero es largo como para serlo')), null);
  assert.equal(dimensionesDeFoto('../../data/portada.json'), null, 'sólo fotos del banco');
  assert.equal(dimensionesDeFoto('fotos-notas/no-existe-ninguna.jpg'), null);
  const una = fs.readdirSync(new URL('../web/public/fotos-notas/', import.meta.url)).find((f) => f.endsWith('.jpg'));
  if (una) {
    const d = dimensionesDeFoto(`fotos-notas/${una}`);
    assert.ok(d && d.ancho > 100 && d.alto > 100, `no se pudo medir ${una}`);
  }
});

test('la foto para el sitemap de imágenes sólo si vale la pena', () => {
  const urlFoto = (a) => `${BASE}/${a}`;
  const n = { foto: { archivo: 'fotos-notas/a.jpg' } };
  assert.equal(fotoParaElSitemap({ nota: n, urlFoto, dimensiones: () => ({ ancho: 1200, alto: 800 }) }), `${BASE}/fotos-notas/a.jpg`);
  assert.equal(fotoParaElSitemap({ nota: n, urlFoto, dimensiones: () => ({ ancho: 200, alto: 100 }) }), null);
  assert.equal(fotoParaElSitemap({ nota: {}, urlFoto }), null);
});

// ----------------------------------------------------------------- sitemaps

test('los sitemaps no ofrecen lo que lleva noindex', () => {
  assert.match(leer('web/app/sitemap.js'), /notas\.filter\(\(n\) => !noSeOfreceAGoogle\(n\)\)/);
  assert.match(leer('web/lib/sitemap-noticias.js'), /\.filter\(\(n\) => !noSeOfreceAGoogle\(n\)\)/);
  assert.match(leer('web/app/sitemap.js'), /images: \[foto\]/);
  assert.match(leer('web/scripts/revisar-seo.mjs'), /ofrece \$\{n\.ruta\}, que lleva noindex/);
});

// ----------------------------------------------------------------- datos para agentes

test('ultimas.json: sólo lo que Google puede ver, más nuevo primero, sin el cuerpo, con fuentes y firma', () => {
  const notas = [
    nota('vieja', { fecha: '2026-10-14T10:00:00.000Z' }),
    nota('nueva', { fecha: '2026-10-15T22:00:00.000Z' }),
    nota('sincuerpo', { cuerpo: 'corto' }),
    nota('sinruta', { ruta: undefined }),
  ];
  const j = armarUltimas({ notas, base: BASE, generado: '2026-10-15T23:00:00.000Z' });
  assert.equal(j.esquema, ESQUEMA);
  assert.deepEqual(j.notas.map((n) => n.id), ['nueva', 'vieja']);
  assert.equal(j.cantidad, 2);
  const n = j.notas[0];
  assert.deepEqual(Object.keys(n), ['id', 'titulo', 'bajada', 'seccion', 'fecha', 'de_balcarce', 'url', 'fuentes', 'redaccion']);
  assert.equal(n.url, `${BASE}/nota/titulo-nueva`);
  assert.deepEqual(n.fuentes, ['El Diario Balcarce', 'La Nación']);
  assert.equal(n.redaccion, 'Redacción asistida con IA, verificada contra las fuentes');
  assert.ok(!JSON.stringify(j).includes('palabra5'), 'el cuerpo no viaja');
  assert.match(j.como_citar, /fuente original/);
  assert.equal(j.correcciones, `${BASE}/contacto`);
  assert.equal(notaParaAgentes(nota('x', { sinFecha: true }), BASE).fecha, null, 'una fecha de relleno no se publica como real');
});

test('ultimas.json: nunca más de MAXIMO_ULTIMAS; el índice, nunca más de MAXIMO_INDICE y con las columnas en orden', () => {
  const muchas = Array.from({ length: 2000 }, (_, i) => nota(`n${i}`, { fecha: new Date(Date.UTC(2026, 9, 1) + i * 60000).toISOString() }));
  assert.equal(armarUltimas({ notas: muchas, base: BASE }).notas.length, MAXIMO_ULTIMAS);
  const idx = armarIndice({ notas: muchas, base: BASE });
  assert.equal(idx.filas.length, MAXIMO_INDICE);
  assert.deepEqual(idx.columnas, COLUMNAS_DEL_INDICE);
  assert.ok(idx.filas.every((f) => f.length === COLUMNAS_DEL_INDICE.length));
  assert.equal(idx.filas[0][0], 'n1999', 'las más nuevas primero');
  assert.equal(idx.filas[0][6], '/nota/titulo-n1999');
  // Cada fila pesa poco: el índice de mil quinientas notas cabe holgado en 1 MB.
  assert.ok(JSON.stringify(idx).length < 1024 * 1024, `índice de ${JSON.stringify(idx).length} bytes`);
});

test('servicios.json: farmacia de turno, clima y agenda con sus fuentes y sus enlaces', () => {
  const farmacias = {
    hoy: { fecha: '2026-10-15', diaSemana: 'JUEVES', farmacias: ['NORTE'], detalle: [{ nombre: 'Norte', direccion: 'Calle 15 esquina 8', telefono: '42-4656' }] },
    proximos: [
      { fecha: '2026-10-15', diaSemana: 'JUEVES', farmacias: ['NORTE'], detalle: [{ nombre: 'Norte', direccion: 'Calle 15 esquina 8', telefono: '42-4656' }] },
      { fecha: '2026-10-16', diaSemana: 'VIERNES', farmacias: ['DEL PATIO'], detalle: [{ nombre: 'Del Patio', direccion: 'Av. 39 N° 793', telefono: '42-2200' }] },
    ],
  };
  const clima = { ahora: { temp: 14, sensacion: 10, humedad: 65, viento: 19, rumbo: 'SE', cielo: 'Nublado' }, dias: [{ fecha: '2026-10-15', max: 14, min: 9, lluvia: 22, viento: 19, cielo: 'Nublado' }], fuente: 'Open-Meteo' };
  const eventos = [{ id: 'muni-1', nombre: 'TC Pick Up Balcarce', desde: '2026-10-24 09:00:00', hasta: '2026-10-25 17:00:00', lugar: 'Autodromo Juan Manuel Fangio', organizador: 'ACTC', fuente: 'Municipalidad de Balcarce', ruta: '/agenda/tc-pick-up-balcarce-muni1' }];
  const j = armarServicios({ farmacias, clima, eventos, base: BASE, generado: 'x' });
  assert.equal(j.farmacias_de_turno.hoy.farmacias[0].telefono, '42-4656');
  assert.deepEqual(j.farmacias_de_turno.proximos_dias.map((d) => d.fecha), ['2026-10-16'], 'hoy no se repite en los próximos');
  assert.equal(j.farmacias_de_turno.fuente, 'Colegio de Farmacéuticos de Balcarce');
  assert.match(j.farmacias_de_turno.aviso, /teléfono/);
  assert.equal(j.clima.ahora.temperatura_c, 14);
  assert.equal(j.clima.pagina, `${BASE}/clima`);
  assert.equal(j.agenda.eventos[0].url, `${BASE}/agenda/tc-pick-up-balcarce-muni1`);
  assert.match(j.agenda.eventos[0].cuando, /del sábado 24 al domingo 25 de octubre/);
  assert.equal(armarServicios({ base: BASE }).clima, null);
});

test('las rutas de los JSON están y son estáticas', () => {
  for (const [carpeta, fn] of [['ultimas', 'armarUltimas'], ['indice', 'armarIndice'], ['servicios', 'armarServicios']]) {
    const r = leer(`web/app/agentes/${carpeta}.json/route.js`);
    assert.match(r, /force-static/);
    assert.match(r, new RegExp(fn));
    assert.match(r, /application\/json/);
  }
});

// ----------------------------------------------------------------- llms.txt e IndexNow

test('llms.txt dice cómo citar, enlaza los datos para programas y no anuncia un MCP que no está andando', () => {
  const r = leer('web/app/llms.txt/route.js');
  for (const frase of ['## Cómo citarnos', '/agentes/ultimas.json', '/agentes/indice.json', '/agentes/servicios.json', '/farmacias', 'fuente original']) {
    assert.ok(r.includes(frase), `falta: ${frase}`);
  }
  assert.match(r, /export const MCP_URL = null;/, 'no se anuncia ningún servidor MCP (el que estaba escrito en infra/mcp-cloudflare/ sin activar se borró el 17/10/2026)');
  assert.ok(!fs.existsSync(new URL('../web/app/llms-full.txt', import.meta.url)), 'llms-full.txt no se hace a propósito (ver el informe)');
});

test('IndexNow: la clave publicada, de 32 caracteres hexadecimales, y nadie más la usa', () => {
  assert.match(CLAVE_INDEXNOW, /^[0-9a-f]{32}$/);
  assert.equal(fs.readFileSync(new URL(`../web/public/${CLAVE_INDEXNOW}.txt`, import.meta.url), 'utf8').trim(), CLAVE_INDEXNOW);
  const txt = fs.readdirSync(new URL('../web/public/', import.meta.url)).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  assert.deepEqual(txt, [`${CLAVE_INDEXNOW}.txt`], 'una sola clave de IndexNow en el sitio');
});

test('el informe SEO/LLM existe y nombra lo que se hizo y lo que decide Hernán', () => {
  const md = leer('docs/seo/AUDITORIA-SEO-LLM.md');
  for (const t of ['Estado real', 'Problemas por gravedad', 'Plan priorizado', 'Trámites', 'Servidor MCP', 'Decisiones para Hernán']) {
    assert.ok(md.includes(t), `falta la sección: ${t}`);
  }
});
