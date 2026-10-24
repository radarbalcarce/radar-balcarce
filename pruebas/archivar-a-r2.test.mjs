// El exportador del archivo permanente (web/scripts/archivar-a-r2.mjs, 15/10/2026): qué notas se archivan, cómo se prepara su HTML, el
// manifiesto, las guardas (nunca el depósito de respaldos, nunca sin querer producción, nunca imprimir una clave) y la PRUEBA DE CONTRATO:
// una nota archivada devuelve el mismo HTML que el sitio (salvo lo que no se puede congelar). Sin red: wrangler se reemplaza por un registro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  juntarNotas, elegirViejas, prepararHtml, fotosDeLaPagina, armarPlan, armarManifiesto, diferencias, comprobarDeposito, sinSecretos,
  leerArgumentos, principal, subirAlDeposito, idsDesaparecidos, borradoRazonable, fusionarManifiesto, leerManifiestoPrevio, depositosProtegidos, MINIMO_DE_BYTES_DE_UNA_PAGINA, CLAVE_DEL_MANIFIESTO,
  CLAVE_DEL_ESTADO, huellaDeContenido, margenPorRitmo, manifiestoTrasSubir, borrarParaQuitar, leerManifiestoConEstado, armarEstado, MARGEN_POR_DEFECTO,
} from '../web/scripts/archivar-a-r2.mjs';
import { manejar, rutaCanonicaDe, analizarRuta } from '../infra/archivo-cloudflare/worker.mjs';
import { MAXIMO_EN_ARCHIVO } from '../web/lib/archivo.js';
import { parteDeNota } from '../web/lib/ruta.js';

// ------------------------------------------------------------------ un sitio de mentira con la forma del que arma Next 15

const CSS = '.envoltura{max-width:1100px}@font-face{font-family:Inter;src:url(/fuentes/inter-latin.woff2)}.chapa-superior{color:red}';

function paginaDeNext({ parte, titulo, foto = 'abc1234.jpg', tarjeta = false, cuerpo = 'Un párrafo de la nota. '.repeat(120) }) {
  const url = `https://radarbalcarce.com/nota/${parte}`;
  return [
    '<!DOCTYPE html><!--dCYxzWaYvne373NFkZZ9h--><html lang="es-AR"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>',
    '<link rel="stylesheet" href="/_next/static/css/4467603058cc61b6.css" data-precedence="next"/>',
    '<link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack-f51b7a4e7e383c5e.js"/>',
    '<script src="/_next/static/chunks/4bd1b696-c023c6e3521b1417.js" async=""></script>',
    '<link rel="preload" href="/fuentes/inter-latin.woff2" as="font" type="font/woff2" crossorigin="anonymous"/>',
    `<title>${titulo}</title><meta name="description" content="La bajada de ${titulo}"/><meta name="robots" content="index, follow"/>`,
    `<link rel="canonical" href="${url}"/><meta property="og:title" content="${titulo}"/><meta property="og:url" content="${url}"/>`,
    tarjeta ? `<meta property="og:image" content="${url}/opengraph-image"/>` : '<meta property="og:image" content="https://radarbalcarce.com/opengraph-image"/>',
    '<script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle","headline":"x"}</script>',
    '<script src="/_next/static/chunks/polyfills-42372ed130431b0a.js" noModule=""></script></head>',
    '<body><div hidden=""><!--$--><!--/$--></div><a class="saltar" href="#contenido">Saltar al contenido</a>',
    '<div class="chapa-superior"><div class="envoltura"><span>Jueves, 15 de octubre</span><a href="/clima"><span class="pastilla"><span class="fuerte">14<!-- -->°</span></span></a></div></div>',
    '<header class="principal"><div class="envoltura"><a href="/" class="logo">Radar <span>Balcarce</span></a><button type="button" class="abrir-buscador" aria-label="Buscar en el sitio"><svg></svg><span>Buscar</span></button></div></header>',
    `<main id="contenido"><article class="cuerpo-nota" data-pagefind-body=""><div class="chapa-nota"><span class="tag">Balcarce</span><time class="meta" dateTime="2026-10-10T12:30:24.000Z" data-hace="">hace 5 días</time></div>`,
    `<p class="fecha-de-la-nota"><time class="meta fecha-exacta" dateTime="2026-10-10T12:30:24.000Z">sábado 10 de octubre de 2026 · 09:30</time></p><h1>${titulo}</h1><p class="copete">La bajada</p>`,
    `<figure><img src="/fotos-notas/${foto}" alt="${titulo}" width="1200" height="675"/><figcaption>Foto: Municipalidad</figcaption></figure>`,
    `<p>${cuerpo}</p><button type="button" class="boton-compartir whatsapp">WhatsApp</button><button type="button" class="boton-compartir">Copiar</button>`,
    '<section class="bloque-seccion"><div class="titulo-seccion"><span class="barra"></span><h2>Seguí leyendo</h2><a href="/seccion/balcarce" class="ver-todo">Ver todo →</a></div>',
    '<div class="fila-nota"><a href="/nota/otra-nota-que-despues-se-retira-zz9">Otra nota que después se retira</a></div></section>',
    '<section class="cierre"><p>¿Tenés más información sobre esto?</p></section></article></main>',
    '<footer class="principal"><div class="aclaracion" data-armada="15:32">Los resúmenes los escribe una inteligencia artificial.</div></footer>',
    '<script src="/_next/static/chunks/webpack-f51b7a4e7e383c5e.js" id="_R_" async=""></script>',
    '<script>(self.__next_f=self.__next_f||[]).push([0])</script><script>self.__next_f.push([1,"1:\\"$Sreact.fragment\\"\\n"])</script></body></html>',
  ].join('');
}

/** Arma en una carpeta temporal un sitio compilado (out) y sus datos. Devuelve { raiz, out, datos, borrar }. */
function armarSitio(notas, { retiradas = {}, historico = [] } = {}) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'archivo-prueba-'));
  const out = path.join(raiz, 'out');
  const datos = path.join(raiz, 'data');
  fs.mkdirSync(path.join(out, '_next', 'static', 'css'), { recursive: true });
  fs.mkdirSync(path.join(out, 'nota'), { recursive: true });
  fs.mkdirSync(path.join(out, 'fotos-notas'), { recursive: true });
  fs.mkdirSync(path.join(datos, 'historico'), { recursive: true });
  fs.writeFileSync(path.join(out, '_next', 'static', 'css', '4467603058cc61b6.css'), CSS);
  for (const n of notas) {
    if (n.sinHtml) continue;
    const parte = parteDeNota(n);
    fs.writeFileSync(path.join(out, 'nota', `${parte}.html`), paginaDeNext({ parte, titulo: n.titulo, foto: `${n.id}.jpg`, tarjeta: !!n.tarjeta }));
    fs.writeFileSync(path.join(out, 'fotos-notas', `${n.id}.jpg`), `JPG-${n.id}`);
    if (n.tarjeta) {
      fs.mkdirSync(path.join(out, 'nota', parte), { recursive: true });
      fs.writeFileSync(path.join(out, 'nota', parte, 'opengraph-image'), `PNG-${n.id}`);
      fs.writeFileSync(path.join(out, 'nota', parte, 'instagram.png'), `IG-${n.id}`);
    }
  }
  fs.writeFileSync(path.join(datos, 'archivo.json'), JSON.stringify({ notas }));
  fs.writeFileSync(path.join(datos, 'retiradas.json'), JSON.stringify({ notas: retiradas }));
  fs.writeFileSync(path.join(datos, 'historico', '2026-09.json'), JSON.stringify({ notas: historico }));
  return { raiz, out, datos, borrar: () => fs.rmSync(raiz, { recursive: true, force: true }) };
}

const nota = (id, dia, extra = {}) => ({ id, slug: `titular-${id}`, titulo: `Titular ${id}`, fecha: `2026-09-${String(dia).padStart(2, '0')}T12:00:00.000Z`, ...extra });

// ------------------------------------------------------------------ qué notas

test('juntarNotas: el archivo manda sobre el histórico y no hay ids repetidos', () => {
  const todas = juntarNotas([{ id: 'a', titulo: 'del archivo' }], [[{ id: 'a', titulo: 'del histórico' }, { id: 'b' }], [{ id: 'c' }]]);
  assert.deepEqual(todas.map((n) => n.id).sort(), ['a', 'b', 'c']);
  assert.equal(todas.find((n) => n.id === 'a').titulo, 'del archivo');
});

test('elegirViejas: se queda con las primeras (tope - margen) en el orden del sitio y archiva el resto, la más vieja primero', () => {
  const notas = [nota('n1', 1), nota('n2', 2), nota('n3', 3), nota('n4', 4), nota('n5', 5)];
  const { viejas, quedan } = elegirViejas(notas, { tope: 4, margen: 1 });
  assert.deepEqual(quedan.map((n) => n.id), ['n5', 'n4', 'n3']);
  assert.deepEqual(viejas.map((n) => n.id), ['n1', 'n2']);
  assert.equal(elegirViejas(notas, { tope: 10, margen: 2 }).viejas.length, 0, 'con lugar de sobra no se archiva nada');
  assert.equal(elegirViejas(notas, { tope: 1, margen: 5 }).quedan.length, 0, 'el margen no deja el cupo en negativo');
});

test('elegirViejas: las que salieron en redes se quedan primero (como actualizarArchivo), y las retiradas no se archivan nunca', () => {
  const notas = [nota('n1', 1, { redes: true }), nota('n2', 2), nota('n3', 3), nota('n4', 4), nota('retirada', 0)];
  const { viejas, quedan } = elegirViejas(notas, { tope: 3, margen: 0, retiradas: new Set(['retirada']) });
  assert.deepEqual(quedan.map((n) => n.id), ['n1', 'n4', 'n3']);
  assert.deepEqual(viejas.map((n) => n.id), ['n2']);
  const porLibro = elegirViejas(notas.slice(0, 4), { tope: 2, margen: 0, enRedes: new Set(['n2']) });
  assert.deepEqual(porLibro.quedan.map((n) => n.id), ['n2', 'n1']);
});

test('el tope y el margen por defecto son los del sitio', async () => {
  const sitio = armarSitio([nota('n1', 1)]);
  try {
    const salida = [];
    await principal([`--out=${sitio.out}`, `--datos=${sitio.datos}`], { escribir: (t) => salida.push(t) });
    assert.match(salida.join('\n'), new RegExp(`tope ${MAXIMO_EN_ARCHIVO}, margen 200`));
  } finally { sitio.borrar(); }
});

// ------------------------------------------------------------------ el HTML

const copiaCss = (href) => (href === '/_next/static/css/4467603058cc61b6.css' ? CSS : null);
const unaPagina = (extra = {}) => paginaDeNext({ parte: 'titular-n1', titulo: 'Titular n1', ...extra });

test('prepararHtml: copia el CSS adentro, saca los scripts de Next y deja los datos estructurados', () => {
  const { html, problemas } = prepararHtml(unaPagina(), { css: copiaCss });
  assert.deepEqual(problemas, []);
  assert.ok(html.includes(`<style>${CSS}</style>`));
  assert.ok(!/<link\b[^>]*rel="stylesheet"/.test(html));
  assert.ok(!/_next\/static/.test(html));
  assert.ok(!/<script\b(?![^>]*ld\+json)/.test(html), 'no queda ningún script salvo los datos estructurados');
  assert.equal((html.match(/<script type="application\/ld\+json">/g) ?? []).length, 1);
  assert.ok(!/__next_f/.test(html));
  assert.ok(html.includes('<link rel="preload" href="/fuentes/inter-latin.woff2" as="font"'), 'las tipografías (dirección fija) se quedan');
  assert.ok(html.startsWith('<!DOCTYPE html><html'), 'la huella del armado no queda pegada al doctype');
});

test('prepararHtml: saca lo que se congela mal (franja del día, "hace 5 días", botones muertos) y no toca la fecha exacta', () => {
  const { html } = prepararHtml(unaPagina(), { css: copiaCss });
  assert.ok(!/<div class="chapa-superior">/.test(html), 'la franja con la fecha y el clima del día del armado');
  assert.ok(!html.includes('Jueves, 15 de octubre'));
  assert.ok(!html.includes('hace 5 días') && !/data-hace/.test(html));
  assert.ok(!/<button\b/.test(html));
  assert.ok(html.includes('sábado 10 de octubre de 2026 · 09:30'), 'la fecha exacta de la nota se queda');
  assert.ok(html.includes('<header class="principal">') && html.includes('<footer class="principal">'), 'el resto de la estructura no cambia');
  // quitar la franja no se come lo de al lado
  assert.ok(html.includes('<a class="saltar" href="#contenido">Saltar al contenido</a><header'));
});

test('prepararHtml: es idempotente y se puede apagar lo dinámico', () => {
  const una = prepararHtml(unaPagina(), { css: copiaCss }).html;
  assert.equal(prepararHtml(una, { css: () => null }).html, una);
  const conserva = prepararHtml(unaPagina(), { css: copiaCss, quitarDinamico: false }).html;
  assert.ok(conserva.includes('chapa-superior') && conserva.includes('hace 5 días') && conserva.includes('<button'));
});

test('prepararHtml: avisa si falta el CSS, si queda algo de Next, si no hay titular o si está cortada', () => {
  assert.match(prepararHtml(unaPagina(), { css: () => null }).problemas.join(' '), /hoja de estilo/);
  assert.match(prepararHtml('<!DOCTYPE html><html><body>' + 'x'.repeat(MINIMO_DE_BYTES_DE_UNA_PAGINA) + '</body></html>', { css: copiaCss }).problemas.join(' '), /titular/);
  assert.match(prepararHtml('<html><h1>a</h1></html>', { css: copiaCss }).problemas.join(' '), /corta/);
  assert.match(prepararHtml(unaPagina().replace('</html>', ''), { css: copiaCss }).problemas.join(' '), /<\/html>/);
  const conRastro = unaPagina().replace('<title>', '<img src="/_next/static/media/x.png"/><title>');
  assert.match(prepararHtml(conRastro, { css: copiaCss }).problemas.join(' '), /_next\/static/);
});

test('fotosDeLaPagina: sólo las del propio sitio (las de FOTOS_BASE ya están en otro lado)', () => {
  const html = '<img src="/fotos-notas/190bbf8.jpg"/><meta property="og:image" content="/fotos-notas/otra-2.jpg"/><img src="https://fotos.radarbalcarce.com/fotos-notas/x.jpg"/><img src="/fotos-notas/../malo"/>';
  assert.deepEqual(fotosDeLaPagina(html), ['190bbf8.jpg', 'otra-2.jpg']);
});

// ------------------------------------------------------------------ el plan, el manifiesto y las diferencias

test('armarPlan: página, tarjetas y foto de cada nota vieja; omite lo que no tiene HTML o sale mal', () => {
  const notas = [nota('n1', 1, { tarjeta: true }), nota('n2', 2), nota('n3', 3, { sinHtml: true })];
  const sitio = armarSitio(notas);
  try {
    // una con la dirección canónica cambiada a mano: no se archiva
    const mala = nota('n4', 4);
    fs.writeFileSync(path.join(sitio.out, 'nota', `${parteDeNota(mala)}.html`), paginaDeNext({ parte: 'otra-cosa-n4', titulo: 'x' }));
    const plan = armarPlan([...notas, mala], { out: sitio.out });
    assert.deepEqual(plan.entradas.map((e) => e.id), ['n1', 'n2']);
    const n1 = plan.entradas[0];
    assert.deepEqual(n1.objetos.map((o) => o.clave), ['nota/n1.html', 'nota/n1/opengraph-image', 'fotos-notas/n1.jpg'], 'la imagen de Instagram no se archiva por defecto');
    assert.equal(n1.objetos[0].tipo, 'text/html; charset=utf-8');
    assert.equal(n1.objetos[1].buffer.toString(), 'PNG-n1');
    assert.equal(n1.objetos[2].tipo, 'image/jpeg');
    assert.equal(plan.entradas[1].objetos.length, 2, 'sin tarjeta propia: página y foto');
    assert.deepEqual(plan.omitidas.map((o) => [o.id, o.motivo]), [['n3', 'sin-html-en-el-sitio'], ['n4', 'html-invalido']]);
    assert.match(plan.omitidas[1].detalle.join(' '), /canónica/);
    const sinFotos = armarPlan([notas[0]], { out: sitio.out, conFotos: false });
    assert.equal(sinFotos.entradas[0].objetos.length, 2);
    const conIg = armarPlan([notas[0]], { out: sitio.out, conInstagram: true });
    assert.deepEqual(conIg.entradas[0].objetos.map((o) => o.clave).slice(1, 3), ['nota/n1/opengraph-image', 'nota/n1/instagram.png']);
    // armar el plan no escribe nada en el sitio
    assert.ok(!fs.existsSync(path.join(sitio.out, 'nota', 'nota')));
  } finally { sitio.borrar(); }
});

test('armarManifiesto y diferencias: sólo se suben los objetos nuevos o cambiados; sólo se borra lo retirado', () => {
  const sitio = armarSitio([nota('n1', 1, { tarjeta: true }), nota('n2', 2)]);
  try {
    const plan = armarPlan([nota('n1', 1, { tarjeta: true }), nota('n2', 2)], { out: sitio.out });
    const m = armarManifiesto(plan, { bucket: 'radar-archivo-staging', tope: 10, margen: 2, creado: '2026-10-15T00:00:00.000Z' });
    assert.equal(m.totales.notas, 2);
    assert.equal(m.totales.objetos, 5);
    assert.ok(!JSON.stringify(m).includes('PNG-n1'), 'el manifiesto no lleva los datos, sólo claves, tamaños y huellas');
    assert.match(m.notas.n1.objetos[0].sha256, /^[0-9a-f]{64}$/);

    const primera = diferencias(plan, null);
    assert.equal(primera.subir.length, 5);
    assert.equal(primera.iguales, 0);

    const segunda = diferencias(plan, m);
    assert.equal(segunda.subir.length, 0);
    assert.equal(segunda.iguales, 5);

    // cambia la página de n2 (una corrección): sólo ese objeto
    const cambiado = JSON.parse(JSON.stringify(m));
    cambiado.notas.n2.objetos[0].huella = '0'.repeat(64); // las páginas se comparan por su huella de contenido
    assert.deepEqual(diferencias(plan, cambiado).subir.map((o) => o.clave), ['nota/n2.html']);

    // n1 se retiró (menor, víctima, retirada a mano): se borran sus objetos, también su foto (16/10/2026)...
    const d = diferencias({ entradas: [plan.entradas[1]], omitidas: [] }, m, new Set(['n1']));
    assert.deepEqual(d.borrar.map((b) => b.clave).sort(), ['fotos-notas/n1.jpg', 'nota/n1.html', 'nota/n1/opengraph-image']);
    // ...salvo que la misma foto la use otra nota que se queda
    const compartida = JSON.parse(JSON.stringify(m));
    compartida.notas.n2.objetos.push({ clave: 'fotos-notas/n1.jpg', bytes: 1, sha256: 'x' });
    const d2 = diferencias({ entradas: [], omitidas: [] }, compartida, new Set(['n1']));
    assert.deepEqual(d2.borrar.map((b) => b.clave).sort(), ['nota/n1.html', 'nota/n1/opengraph-image']);
    // dos retiradas con la misma foto: se borra una sola vez
    const dos = { notas: { a: { objetos: [{ clave: 'nota/a.html' }, { clave: 'fotos-notas/f.jpg' }] }, b: { objetos: [{ clave: 'nota/b.html' }, { clave: 'fotos-notas/f.jpg' }] } } };
    assert.deepEqual(diferencias({ entradas: [], omitidas: [] }, dos, new Set(['a', 'b'])).borrar.map((x) => x.clave).sort(), ['fotos-notas/f.jpg', 'nota/a.html', 'nota/b.html']);
    // una nota que sólo desapareció del plan (el tope cambió) NO se borra: el archivo es permanente
    assert.deepEqual(diferencias({ entradas: [plan.entradas[1]], omitidas: [] }, m).borrar, []);
  } finally { sitio.borrar(); }
});

// ------------------------------------------------------------------ las guardas

test('comprobarDeposito: nunca respaldos ni fotos; sin --produccion sólo depósitos de ensayo', () => {
  const env = { R2_RESPALDOS: 'radar-respaldos', R2_FOTOS: 'radar-fotos', R2_PIEZAS: 'otro-nombre' };
  assert.equal(comprobarDeposito('otro-nombre', { env, produccion: true }).ok, false, 'el de las piezas de las redes, tampoco (R2_PIEZAS)');
  assert.equal(comprobarDeposito('radar-piezas', { env: {}, produccion: true }).ok, false, 'ni algo que se llame "piezas"');
  assert.equal(comprobarDeposito('radar-archivo-staging', { env }).ok, true);
  assert.equal(comprobarDeposito('radar-archivo-prueba', { env }).ok, true);
  assert.equal(comprobarDeposito('radar-archivo', { env }).ok, false, 'producción pide --produccion');
  assert.equal(comprobarDeposito('radar-archivo', { env, produccion: true }).ok, true);
  for (const protegido of ['radar-respaldos', 'radar-fotos', 'mis-backups-staging', 'respaldo-prueba']) {
    assert.equal(comprobarDeposito(protegido, { env, produccion: true }).ok, false, protegido);
  }
  for (const raro of ['', undefined, 'Con Espacios', '../x', 'a']) assert.equal(comprobarDeposito(raro, { env, produccion: true }).ok, false, String(raro));
  assert.deepEqual(depositosProtegidos({ R2_RESPALDOS: ' a ', R2_FOTOS: '', R2_PIEZAS: 'p' }), ['a', 'p']);
});

test('sinSecretos tapa los valores de las claves en cualquier texto', () => {
  const env = { CLOUDFLARE_API_TOKEN: 'tok_SECRETO_123456', CLOUDFLARE_ACCOUNT_ID: 'cuenta987654' };
  assert.equal(sinSecretos('error con tok_SECRETO_123456 y cuenta987654 y otra vez tok_SECRETO_123456', env), 'error con *** y *** y otra vez ***');
});

test('leerArgumentos', () => {
  assert.deepEqual(leerArgumentos(['--subir', '--bucket=x-staging', '--max=5', 'suelto']), { subir: true, bucket: 'x-staging', max: '5' });
});

// ------------------------------------------------------------------ la corrida

/**
 * Un wrangler de mentira que anota lo que le piden. `previo` es el manifiesto que devuelve el depósito (o una lista: uno por cada lectura,
 * para simular otra corrida que lo cambió en el medio). Guarda lo que se sube como texto en `subido` (clave → texto).
 */
function wranglerFalso({ fallan = () => false, previo = null } = {}) {
  const llamadas = [];
  const subido = new Map();
  let lecturas = 0;
  const ejecutar = async (args) => {
    llamadas.push(args);
    if (fallan(args)) return { ok: false, salida: 'boom tok_SECRETO_123456' };
    if (args[1] === 'object' && args[2] === 'get') {
      const este = Array.isArray(previo) ? previo[Math.min(lecturas, previo.length - 1)] : previo;
      lecturas += 1;
      if (!este) return { ok: false, salida: '✘ [ERROR] The specified key does not exist.' };
      fs.writeFileSync(args[args.indexOf('--file') + 1], JSON.stringify(este));
    }
    if (args[1] === 'object' && args[2] === 'put' && /\.json$/.test(args[3])) subido.set(args[3].split('/').slice(1).join('/'), fs.readFileSync(args[args.indexOf('--file') + 1], 'utf8'));
    return { ok: true, salida: '' };
  };
  return { llamadas, ejecutar, subido };
}

const ENV_CON_CLAVES = { CLOUDFLARE_API_TOKEN: 'tok_SECRETO_123456', CLOUDFLARE_ACCOUNT_ID: 'cuenta987654' };

test('SIMULACIÓN (lo de por defecto): no llama a wrangler, no escribe nada en el sitio ni en los datos', async () => {
  const notas = [nota('n1', 1), nota('n2', 2), nota('n3', 3), nota('n4', 4)];
  const sitio = armarSitio(notas, { retiradas: { n2: { motivo: 'menor', cuando: '2026-10-01', por: 'andres' } } });
  try {
    const antes = fs.readdirSync(sitio.raiz, { recursive: true }).sort().join('|');
    const w = wranglerFalso();
    const salida = [];
    const codigo = await principal([`--out=${sitio.out}`, `--datos=${sitio.datos}`, '--tope=2', '--margen=0'], { env: ENV_CON_CLAVES, ejecutar: w.ejecutar, escribir: (t) => salida.push(t) });
    assert.equal(codigo, 0);
    assert.deepEqual(w.llamadas, []);
    assert.equal(fs.readdirSync(sitio.raiz, { recursive: true }).sort().join('|'), antes, 'no apareció ni cambió ningún archivo');
    const texto = salida.join('\n');
    assert.match(texto, /SIMULACIÓN/);
    assert.match(texto, /viejas a archivar: 1 /, 'n2 está retirada: no cuenta; quedan n4 y n3, y sólo n1 es vieja');
    assert.ok(!texto.includes('tok_SECRETO'));
  } finally { sitio.borrar(); }
});

test('--max cuenta notas archivables: las viejas sin HTML (las del histórico) no gastan el cupo', async () => {
  const sitio = armarSitio([nota('n0', 1, { sinHtml: true }), nota('n1', 2), nota('n2', 3), nota('n3', 4)]);
  try {
    const m = path.join(sitio.raiz, 'm.json');
    assert.equal(await principal([`--out=${sitio.out}`, `--datos=${sitio.datos}`, '--tope=1', '--margen=0', '--max=2', `--manifiesto=${m}`], { escribir: () => {} }), 0);
    assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(m, 'utf8')).notas), ['n1', 'n2'], 'las dos más viejas que SÍ tienen página');
  } finally { sitio.borrar(); }
});

test('la simulación guarda el manifiesto donde se pida, nunca dentro de web/data', async () => {
  const sitio = armarSitio([nota('n1', 1), nota('n2', 2)]);
  try {
    const destino = path.join(sitio.raiz, 'afuera', 'm.json');
    assert.equal(await principal([`--out=${sitio.out}`, `--datos=${sitio.datos}`, '--tope=1', '--margen=0', `--manifiesto=${destino}`], { escribir: () => {} }), 0);
    const m = JSON.parse(fs.readFileSync(destino, 'utf8'));
    assert.equal(m.totales.notas, 1);
    assert.deepEqual(Object.keys(m.notas), ['n1']);
    const dentro = path.join(sitio.datos, 'm.json');
    assert.equal(await principal([`--out=${sitio.out}`, `--datos=${sitio.datos}`, `--manifiesto=${dentro}`], { escribir: () => {} }), 2);
    assert.ok(!fs.existsSync(dentro));
  } finally { sitio.borrar(); }
});

test('--subir se niega sin depósito de ensayo, con depósito de respaldos, o sin credenciales', async () => {
  const sitio = armarSitio([nota('n1', 1), nota('n2', 2)]);
  try {
    const w = wranglerFalso();
    const base = [`--out=${sitio.out}`, `--datos=${sitio.datos}`, '--tope=1', '--margen=0', '--subir'];
    for (const [args, env] of [
      [base, ENV_CON_CLAVES],
      [[...base, '--bucket=radar-archivo'], ENV_CON_CLAVES],
      [[...base, '--bucket=radar-respaldos', '--produccion'], ENV_CON_CLAVES],
      [[...base, '--bucket=radar-fotos-staging'], { ...ENV_CON_CLAVES, R2_FOTOS: 'radar-fotos-staging' }],
      [[...base, '--bucket=radar-archivo-staging'], {}],
    ]) {
      const salida = [];
      assert.equal(await principal(args, { env, ejecutar: w.ejecutar, escribir: (t) => salida.push(t) }), 2, args.join(' '));
      assert.ok(!salida.join('\n').includes('tok_SECRETO'));
    }
    assert.deepEqual(w.llamadas, [], 'no se llegó a llamar a wrangler');
  } finally { sitio.borrar(); }
});

test('--subir al depósito de ensayo: sube cada objeto con su tipo y su caché, el manifiesto al final, y no imprime las claves', async () => {
  const sitio = armarSitio([nota('n1', 1, { tarjeta: true }), nota('n2', 2), nota('n3', 3)]);
  try {
    const w = wranglerFalso();
    const salida = [];
    const codigo = await principal([`--out=${sitio.out}`, `--datos=${sitio.datos}`, '--tope=1', '--margen=0', '--subir', '--bucket=radar-archivo-staging'], { env: ENV_CON_CLAVES, ejecutar: w.ejecutar, escribir: (t) => salida.push(t) });
    assert.equal(codigo, 0);
    const puts = w.llamadas.filter((a) => a[2] === 'put');
    // n1 (3 objetos) + n2 (2): n3 es la que se queda en el sitio; después el manifiesto, el mapa del archivo (regla 309) y el estado
    assert.equal(puts.length, 5 + 3);
    assert.equal(puts.at(-3)[3], `radar-archivo-staging/${CLAVE_DEL_MANIFIESTO}`, 'el manifiesto va después de los objetos');
    assert.equal(puts.at(-2)[3], 'radar-archivo-staging/sitemap-archivo.xml', 'el mapa del archivo, armado con ese manifiesto');
    assert.equal(puts.at(-1)[3], `radar-archivo-staging/${CLAVE_DEL_ESTADO}`, 'y el estado al final');
    for (const p of puts.slice(0, -3)) {
      assert.ok(p.includes('--remote'));
      assert.ok(p[3].startsWith('radar-archivo-staging/'));
      assert.ok(p.includes('--content-type') && p.includes('--cache-control'));
    }
    const html = puts.find((p) => p[3] === 'radar-archivo-staging/nota/n1.html');
    assert.equal(html[html.indexOf('--content-type') + 1], 'text/html; charset=utf-8');
    assert.ok(!w.llamadas.some((a) => a[2] === 'delete'));
    assert.ok(!salida.join('\n').includes('tok_SECRETO') && !salida.join('\n').includes('cuenta987654'));
    assert.match(salida.join('\n'), /subidos 5, borrados 0, fallidos 0, manifiesto al día · 2 notas archivadas en total/);
    // el estado: chico, sin claves, con lo que hizo
    const estado = JSON.parse(w.subido.get(CLAVE_DEL_ESTADO));
    assert.equal(estado.ok, true);
    assert.equal(estado.notas, 2);
    assert.equal(estado.subidos, 5);
    assert.equal(estado.bucket, 'radar-archivo-staging');
    assert.ok(!JSON.stringify(estado).includes('tok_SECRETO') && !JSON.stringify(estado).includes('cuenta987654'));
    const control = puts.at(-1);
    assert.equal(control[control.indexOf('--cache-control') + 1], 'no-store', 'el estado no se guarda en ninguna caché');
  } finally { sitio.borrar(); }
});

test('la segunda vez no vuelve a subir lo que no cambió; --borrar saca del depósito lo retirado', async () => {
  const notas = [nota('n1', 1, { tarjeta: true }), nota('n2', 2), nota('n3', 3)];
  const sitio = armarSitio(notas);
  try {
    const args = [`--out=${sitio.out}`, `--datos=${sitio.datos}`, '--tope=1', '--margen=0', '--subir', '--bucket=radar-archivo-staging'];
    const manifiesto = path.join(sitio.raiz, 'm.json');
    await principal([...args, `--manifiesto=${manifiesto}`], { env: ENV_CON_CLAVES, ejecutar: wranglerFalso().ejecutar, escribir: () => {} });
    const previo = JSON.parse(fs.readFileSync(manifiesto, 'utf8'));

    const w2 = wranglerFalso({ previo });
    await principal(args, { env: ENV_CON_CLAVES, ejecutar: w2.ejecutar, escribir: () => {} });
    assert.deepEqual(w2.llamadas.filter((a) => a[2] === 'put').map((a) => a[3]), [`radar-archivo-staging/${CLAVE_DEL_ESTADO}`], 'nada cambió: sólo el estado (ni el manifiesto)');

    // n1 pasa a retiradas: sin --borrar no se toca nada; con --borrar se borran sus objetos de nota
    fs.writeFileSync(path.join(sitio.datos, 'retiradas.json'), JSON.stringify({ notas: { n1: { motivo: 'menor', cuando: '2026-10-15', por: 'hernan' } } }));
    const w3 = wranglerFalso({ previo });
    await principal(args, { env: ENV_CON_CLAVES, ejecutar: w3.ejecutar, escribir: () => {} });
    assert.ok(!w3.llamadas.some((a) => a[2] === 'delete'));
    const w4 = wranglerFalso({ previo });
    await principal([...args, '--borrar'], { env: ENV_CON_CLAVES, ejecutar: w4.ejecutar, escribir: () => {} });
    assert.deepEqual(w4.llamadas.filter((a) => a[2] === 'delete').map((a) => a[3]).sort(), [
      'radar-archivo-staging/fotos-notas/n1.jpg', 'radar-archivo-staging/nota/n1.html', 'radar-archivo-staging/nota/n1/opengraph-image',
    ], 'la página, la tarjeta y la foto (que no usa ninguna otra nota)');
    assert.ok(!JSON.parse(w4.subido.get(CLAVE_DEL_MANIFIESTO)).notas.n1, 'y sale del manifiesto');
  } finally { sitio.borrar(); }
});

test('idsDesaparecidos, borradoRazonable y fusionarManifiesto', () => {
  const previo = { notas: { a: { objetos: [{ clave: 'nota/a.html', bytes: 10 }] }, b: { objetos: [{ clave: 'nota/b.html', bytes: 20 }, { clave: 'fotos-notas/b.jpg', bytes: 5 }] }, c: { objetos: [] } } };
  assert.deepEqual(idsDesaparecidos(previo, [{ id: 'a' }, { id: 'c' }]), ['b']);
  assert.deepEqual(idsDesaparecidos(null, [{ id: 'a' }]), []);
  assert.equal(borradoRazonable(3, 1000).ok, true);
  assert.equal(borradoRazonable(10, 20).ok, true, 'hasta 10 notas siempre se puede');
  assert.equal(borradoRazonable(50, 100).ok, false, 'la mitad del depósito de golpe parece un archivo roto');
  assert.match(borradoRazonable(50, 100).motivo, /confirmar-borrado/);
  assert.equal(borradoRazonable(50, 1000).ok, true, 'el 5 % o menos se acepta');
  const nuevo = { creado: 'x', notas: { c: { objetos: [{ clave: 'nota/c.html', bytes: 7 }] }, d: { objetos: [{ clave: 'nota/d.html', bytes: 1 }] } } };
  const m = fusionarManifiesto(previo, nuevo, new Set(['a']));
  assert.deepEqual(Object.keys(m.notas).sort(), ['b', 'c', 'd']);
  assert.deepEqual(m.notas.c.objetos, [{ clave: 'nota/c.html', bytes: 7 }], 'manda lo nuevo');
  assert.deepEqual(m.totales, { notas: 3, objetos: 4, bytes: 33 });
  assert.equal(fusionarManifiesto(null, nuevo).totales.notas, 2);
});

test('el manifiesto del depósito se ACUMULA entre corridas (no se olvida de las notas anteriores)', async () => {
  const sitio = armarSitio([nota('n1', 1), nota('n2', 2), nota('n3', 3), nota('n4', 4)]);
  try {
    const base = [`--out=${sitio.out}`, `--datos=${sitio.datos}`, '--tope=1', '--margen=0', '--subir', '--bucket=radar-archivo-staging'];
    const m1 = path.join(sitio.raiz, 'm1.json');
    await principal([...base, '--max=1', `--manifiesto=${m1}`], { env: ENV_CON_CLAVES, ejecutar: wranglerFalso().ejecutar, escribir: () => {} });
    const primero = JSON.parse(fs.readFileSync(m1, 'utf8'));
    assert.deepEqual(Object.keys(primero.notas), ['n1']);
    const m2 = path.join(sitio.raiz, 'm2.json');
    const w = wranglerFalso({ previo: primero });
    await principal([...base, '--max=2', `--manifiesto=${m2}`], { env: ENV_CON_CLAVES, ejecutar: w.ejecutar, escribir: () => {} });
    const segundo = JSON.parse(fs.readFileSync(m2, 'utf8'));
    assert.deepEqual(Object.keys(segundo.notas).sort(), ['n1', 'n2'], 'n1 sigue en el manifiesto aunque esta vez no se subió');
    assert.equal(w.llamadas.filter((a) => a[2] === 'put' && a[3].endsWith('/nota/n1.html')).length, 0, 'ni se volvió a subir');
    assert.equal(segundo.totales.notas, 2);
  } finally { sitio.borrar(); }
});

test('--borrar también saca lo que desapareció del archivo vivo (el semáforo la retiró); un borrado enorme se frena', async () => {
  const sitio = armarSitio([nota('n1', 1), nota('n2', 2), nota('n3', 3)]);
  try {
    const base = [`--out=${sitio.out}`, `--datos=${sitio.datos}`, '--tope=1', '--margen=0', '--subir', '--bucket=radar-archivo-staging', '--borrar'];
    const previo = { version: 1, notas: {
      n1: { ruta: '/nota/titular-n1-n1', objetos: [{ clave: 'nota/n1.html', sha256: 'x' }] },
      zzz: { ruta: '/nota/retirada-zzz', objetos: [{ clave: 'nota/zzz.html', sha256: 'x' }, { clave: 'nota/zzz/opengraph-image', sha256: 'x' }, { clave: 'fotos-notas/zzz.jpg', sha256: 'x' }] },
    } };
    const w = wranglerFalso({ previo });
    const m = path.join(sitio.raiz, 'm.json');
    const salida = [];
    // zzz es 1 de 2 notas del depósito: más del 5 %, pero hasta 10 notas siempre se puede
    assert.equal(await principal([...base, `--manifiesto=${m}`], { env: ENV_CON_CLAVES, ejecutar: w.ejecutar, escribir: (t) => salida.push(t) }), 0);
    assert.deepEqual(w.llamadas.filter((a) => a[2] === 'delete').map((a) => a[3]).sort(), ['radar-archivo-staging/fotos-notas/zzz.jpg', 'radar-archivo-staging/nota/zzz.html', 'radar-archivo-staging/nota/zzz/opengraph-image']);
    assert.ok(!JSON.parse(fs.readFileSync(m, 'utf8')).notas.zzz, 'ya no figura en el manifiesto');

    // un depósito grande al que "se le fue" casi todo: frenado salvo --confirmar-borrado
    const grande = { version: 1, notas: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`v${i}`, { objetos: [{ clave: `nota/v${i}.html`, sha256: 'x' }] }])) };
    const w2 = wranglerFalso({ previo: grande });
    const salida2 = [];
    assert.equal(await principal(base, { env: ENV_CON_CLAVES, ejecutar: w2.ejecutar, escribir: (t) => salida2.push(t) }), 1);
    assert.ok(!w2.llamadas.some((a) => a[2] === 'delete'));
    assert.match(salida2.join(' '), /parece un archivo roto/);
    const w3 = wranglerFalso({ previo: grande });
    assert.equal(await principal([...base, '--confirmar-borrado'], { env: ENV_CON_CLAVES, ejecutar: w3.ejecutar, escribir: () => {} }), 0);
    assert.equal(w3.llamadas.filter((a) => a[2] === 'delete').length, 40);

    // sin --borrar nunca se borra nada
    const w4 = wranglerFalso({ previo: grande });
    await principal(base.filter((x) => x !== '--borrar'), { env: ENV_CON_CLAVES, ejecutar: w4.ejecutar, escribir: () => {} });
    assert.ok(!w4.llamadas.some((a) => a[2] === 'delete'));
  } finally { sitio.borrar(); }
});

test('si una subida falla (con reintentos), la corrida falla, el manifiesto anota sólo lo que sí se subió y no filtra la clave', async () => {
  const sitio = armarSitio([nota('n1', 1), nota('n2', 2), nota('n3', 3)]);
  try {
    const w = wranglerFalso({ fallan: (a) => a[3]?.endsWith('/nota/n1.html') });
    const salida = [];
    const codigo = await principal([`--out=${sitio.out}`, `--datos=${sitio.datos}`, '--tope=1', '--margen=0', '--subir', '--bucket=radar-archivo-prueba'], { env: ENV_CON_CLAVES, ejecutar: w.ejecutar, escribir: (t) => salida.push(t) });
    assert.equal(codigo, 1);
    assert.equal(w.llamadas.filter((a) => a[3]?.endsWith('/nota/n1.html')).length, 3, 'tres intentos');
    const m = JSON.parse(w.subido.get(CLAVE_DEL_MANIFIESTO));
    assert.deepEqual(Object.keys(m.notas), ['n2'], 'n1 no figura (se reintenta la próxima vez); n2 sí, y no se vuelve a subir');
    assert.equal(JSON.parse(w.subido.get(CLAVE_DEL_ESTADO)).ok, false, 'el estado dice que falló (lo ve el vigilante)');
    assert.match(salida.join('\n'), /FALLÓ nota\/n1\.html/);
    assert.ok(!salida.join('\n').includes('tok_SECRETO') && !w.subido.get(CLAVE_DEL_ESTADO).includes('tok_SECRETO'));
  } finally { sitio.borrar(); }
});

test('subirAlDeposito y leerManifiestoPrevio dejan limpia la carpeta temporal', async () => {
  const antes = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith('archivo-r2-')).length;
  const w = wranglerFalso();
  await subirAlDeposito({ bucket: 'x-staging', hacer: { subir: [{ clave: 'nota/a.html', buffer: Buffer.from('a'), tipo: 'text/html', control: 'public' }], borrar: [] }, manifiesto: { version: 1 }, ejecutar: w.ejecutar });
  assert.equal(await leerManifiestoPrevio({ bucket: 'x-staging', ejecutar: wranglerFalso().ejecutar }), null);
  assert.equal(fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith('archivo-r2-')).length, antes);
});

test('el exportador no lleva claves escritas y sólo usa wrangler fijo', () => {
  const codigo = fs.readFileSync(new URL('../web/scripts/archivar-a-r2.mjs', import.meta.url), 'utf8');
  assert.ok(!/ghp_|github_pat_|Bearer [A-Za-z0-9_]{20,}/.test(codigo));
  assert.match(codigo, /VERSION_DE_WRANGLER = '4\.139\.0'/);
  assert.ok(!/console\.(log|error)\([^)]*process\.env/.test(codigo), 'no imprime el entorno');
});

// ------------------------------------------------------------------ producción (16/10/2026): margen por ritmo, huella, estado, tiempo, quitar

test('prepararHtml saca el "Seguí leyendo" (títulos de otras notas del día del armado) y deja el resto del pie', () => {
  const { html } = prepararHtml(unaPagina(), { css: copiaCss });
  assert.ok(!html.includes('Seguí leyendo') && !html.includes('Otra nota que después se retira'), 'una nota retirada después no puede quedar nombrada en otra archivada');
  assert.ok(html.includes('<section class="cierre">'), 'las otras secciones del artículo quedan');
  assert.ok(html.includes('</article></main>'));
});

test('margenPorRitmo: 4 días al ritmo de la última semana, nunca menos de 200', () => {
  const ahora = Date.parse('2026-10-16T12:00:00Z');
  const deHace = (horas) => ({ id: `x${horas}`, fecha: new Date(ahora - horas * 3600e3).toISOString() });
  const poco = Array.from({ length: 70 }, (_, i) => deHace(i * 2)); // 70 notas en una semana = 10 por día
  assert.equal(margenPorRitmo(poco, { ahora }).margen, MARGEN_POR_DEFECTO);
  const mucho = Array.from({ length: 1050 }, (_, i) => deHace((i % 160) + 0.5)); // 150 por día
  const r = margenPorRitmo(mucho, { ahora });
  assert.equal(r.ritmo, 150);
  assert.equal(r.margen, 600);
  assert.equal(margenPorRitmo([deHace(24 * 9), { id: 'sin' }], { ahora }).margen, MARGEN_POR_DEFECTO, 'lo de hace más de una semana y lo sin fecha no cuentan');
});

test('huellaDeContenido: no cambia con lo que cambia en cada armado; sí con el texto de la nota', () => {
  const base = prepararHtml(unaPagina(), { css: copiaCss }).html;
  const otroArmado = base.replace('data-armada="15:32"', 'data-armada="16:02"').replace('<style>', '<style>.nuevo{}').replace('Radar <span>Balcarce</span>', 'Radar <span>Balcarce</span><a href="/temas/x">Tema del día</a>');
  assert.notEqual(otroArmado, base);
  assert.equal(huellaDeContenido(otroArmado), huellaDeContenido(base));
  assert.notEqual(huellaDeContenido(base.replace('La bajada</p>', 'La bajada corregida</p>')), huellaDeContenido(base), 'una corrección del texto se vuelve a subir');
  assert.notEqual(huellaDeContenido(base.replace('<title>Titular n1</title>', '<title>Otro</title>')), huellaDeContenido(base));
  assert.match(huellaDeContenido('sin cabeza ni artículo'), /^[0-9a-f]{64}$/);
});

test('diferencias usa la huella: la misma nota armada otra vez (otro pie, otro CSS) NO se vuelve a subir', () => {
  const sitio = armarSitio([nota('n1', 1), nota('n2', 2)]);
  try {
    const plan = armarPlan([nota('n1', 1)], { out: sitio.out });
    const previo = armarManifiesto(plan, { tope: 1, margen: 0 });
    assert.ok(previo.notas.n1.objetos[0].huella, 'el manifiesto guarda la huella de la página');
    const parte = parteDeNota(nota('n1', 1));
    const archivo = path.join(sitio.out, 'nota', `${parte}.html`);
    fs.writeFileSync(archivo, fs.readFileSync(archivo, 'utf8').replace('data-armada="15:32"', 'data-armada="18:00"'));
    const otra = armarPlan([nota('n1', 1)], { out: sitio.out });
    assert.notEqual(otra.entradas[0].objetos[0].sha256, plan.entradas[0].objetos[0].sha256, 'los bytes cambiaron');
    assert.equal(diferencias(otra, previo).subir.length, 0, 'pero lo que dice la nota no');
    // un manifiesto viejo, sin huella: se sube una vez y desde ahí queda la huella
    const viejo = JSON.parse(JSON.stringify(previo));
    delete viejo.notas.n1.objetos[0].huella;
    assert.deepEqual(diferencias(otra, viejo).subir.map((o) => o.clave), ['nota/n1.html']);
  } finally { sitio.borrar(); }
});

test('leerManifiestoConEstado distingue "no hay" de "no se pudo leer"', async () => {
  const sin = await leerManifiestoConEstado({ bucket: 'x-staging', ejecutar: wranglerFalso().ejecutar });
  assert.equal(sin.estado, 'no-existe');
  const roto = await leerManifiestoConEstado({ bucket: 'x-staging', ejecutar: async () => ({ ok: false, salida: 'fetch failed: ECONNRESET' }) });
  assert.equal(roto.estado, 'error');
  const bien = await leerManifiestoConEstado({ bucket: 'x-staging', ejecutar: wranglerFalso({ previo: { notas: {} } }).ejecutar });
  assert.equal(bien.estado, 'ok');
});

test('si no se puede leer el manifiesto del depósito NO se sube nada (se perdería la memoria de lo archivado) y el estado lo dice', async () => {
  const sitio = armarSitio([nota('n1', 1), nota('n2', 2)]);
  try {
    const llamadas = [];
    const subido = new Map();
    const ejecutar = async (args) => {
      llamadas.push(args);
      if (args[2] === 'get') return { ok: false, salida: 'Failed to fetch: 500 Internal Server Error tok_SECRETO_123456' };
      if (args[2] === 'put') subido.set(args[3], fs.readFileSync(args[args.indexOf('--file') + 1], 'utf8'));
      return { ok: true, salida: '' };
    };
    const salida = [];
    const codigo = await principal([`--out=${sitio.out}`, `--datos=${sitio.datos}`, '--tope=1', '--margen=0', '--subir', '--borrar', '--bucket=radar-archivo-staging'], { env: ENV_CON_CLAVES, ejecutar, escribir: (t) => salida.push(t) });
    assert.equal(codigo, 1);
    assert.deepEqual([...subido.keys()], [`radar-archivo-staging/${CLAVE_DEL_ESTADO}`], 'sólo el estado, ninguna nota ni manifiesto');
    const estado = JSON.parse(subido.get(`radar-archivo-staging/${CLAVE_DEL_ESTADO}`));
    assert.equal(estado.ok, false);
    assert.match(estado.motivo, /manifiesto/);
    assert.ok(!JSON.stringify(estado).includes('tok_SECRETO') && !salida.join('\n').includes('tok_SECRETO'));
  } finally { sitio.borrar(); }
});

test('--limite-segundos: pasado el tiempo no empieza subidas nuevas; el manifiesto guarda lo que sí subió y la corrida avisa', async () => {
  const sitio = armarSitio([nota('n1', 1), nota('n2', 2), nota('n3', 3), nota('n4', 4)]);
  try {
    let reloj = 0;
    const w = wranglerFalso();
    const ejecutar = async (args) => { if (args[2] === 'put' && args[3].includes('/nota/')) reloj += 4000; return w.ejecutar(args); };
    const salida = [];
    const codigo = await principal([`--out=${sitio.out}`, `--datos=${sitio.datos}`, '--tope=1', '--margen=0', '--subir', '--bucket=radar-archivo-staging', '--concurrencia=1', '--limite-segundos=5'], { env: ENV_CON_CLAVES, ejecutar, escribir: (t) => salida.push(t), ahora: () => reloj });
    assert.equal(codigo, 1, 'la corrida queda marcada (el vigilante lo ve), aunque lo subido quedó anotado');
    const m = JSON.parse(w.subido.get(CLAVE_DEL_MANIFIESTO));
    assert.deepEqual(Object.keys(m.notas), ['n1'], 'n1 (página y foto) entró antes del límite; las demás, en la próxima corrida');
    const estado = JSON.parse(w.subido.get(CLAVE_DEL_ESTADO));
    assert.ok(estado.pendientes > 0);
    assert.match(estado.motivo, /se acabó el tiempo/);
    assert.match(salida.join('\n'), /pendientes \d+ \(se acabó el tiempo\)/);
  } finally { sitio.borrar(); }
});

test('el manifiesto se vuelve a leer antes de escribirlo: lo que anotó otra corrida en el medio no se pisa', async () => {
  const sitio = armarSitio([nota('n1', 1), nota('n2', 2)]);
  try {
    const alEmpezar = { version: 1, notas: { viejo: { ruta: '/nota/x-viejo', objetos: [{ clave: 'nota/viejo.html', sha256: 'a' }] } } };
    const enElMedio = { version: 1, notas: { ...alEmpezar.notas, otra: { ruta: '/nota/x-otra', objetos: [{ clave: 'nota/otra.html', sha256: 'b' }] } } };
    const w = wranglerFalso({ previo: [alEmpezar, enElMedio] });
    await principal([`--out=${sitio.out}`, `--datos=${sitio.datos}`, '--tope=1', '--margen=0', '--subir', '--bucket=radar-archivo-staging'], { env: ENV_CON_CLAVES, ejecutar: w.ejecutar, escribir: () => {} });
    assert.deepEqual(Object.keys(JSON.parse(w.subido.get(CLAVE_DEL_MANIFIESTO)).notas).sort(), ['n1', 'otra', 'viejo']);
  } finally { sitio.borrar(); }
});

test('manifiestoTrasSubir: lo que falló no entra con su versión nueva; un borrado fallido deja la nota anotada para reintentar', () => {
  const previo = { notas: { a: { objetos: [{ clave: 'nota/a.html', sha256: '1' }] }, r: { objetos: [{ clave: 'nota/r.html' }, { clave: 'fotos-notas/r.jpg' }] } } };
  const nuevo = { notas: { a: { objetos: [{ clave: 'nota/a.html', sha256: '2' }] }, b: { objetos: [{ clave: 'nota/b.html', sha256: '3' }] } } };
  const hacer = { borrar: [{ id: 'r', clave: 'nota/r.html' }, { id: 'r', clave: 'fotos-notas/r.jpg' }] };
  const m = manifiestoTrasSubir(previo, nuevo, hacer, { noSubidas: new Set(['nota/a.html']), noBorradas: new Set(['fotos-notas/r.jpg']) });
  assert.equal(m.notas.a.objetos[0].sha256, '1', 'a queda con lo de antes');
  assert.ok(m.notas.b);
  assert.ok(m.notas.r, 'r sigue anotada: su foto no se pudo borrar');
  assert.ok(!manifiestoTrasSubir(previo, nuevo, hacer).notas.r, 'con todo borrado, sale');
});

test('--quitar: saca YA del depósito la página, las tarjetas y la foto de esas notas, sin sitio compilado, y no sube nada', async () => {
  const previo = { version: 1, notas: {
    abc123: { ruta: '/nota/x-abc123', objetos: [{ clave: 'nota/abc123.html' }, { clave: 'nota/abc123/opengraph-image' }, { clave: 'fotos-notas/abc123.jpg' }] },
    otra1: { ruta: '/nota/y-otra1', objetos: [{ clave: 'nota/otra1.html' }, { clave: 'fotos-notas/compartida.jpg' }] },
    otra2: { ruta: '/nota/z-otra2', objetos: [{ clave: 'nota/otra2.html' }, { clave: 'fotos-notas/compartida.jpg' }] },
  } };
  const w = wranglerFalso({ previo });
  const salida = [];
  const codigo = await principal(['--quitar=abc123,otra1', '--bucket=radar-archivo', '--produccion', '--out=/no/existe'], { env: ENV_CON_CLAVES, ejecutar: w.ejecutar, escribir: (t) => salida.push(t) });
  assert.equal(codigo, 0);
  const borrados = w.llamadas.filter((a) => a[2] === 'delete').map((a) => a[3].replace('radar-archivo/', '')).sort();
  assert.deepEqual(borrados, ['fotos-notas/abc123.jpg', 'nota/abc123.html', 'nota/abc123/instagram.png', 'nota/abc123/opengraph-image', 'nota/otra1.html', 'nota/otra1/instagram.png', 'nota/otra1/opengraph-image'], 'la foto compartida con otra2 se queda');
  assert.ok(!w.llamadas.some((a) => a[2] === 'put' && a[3].includes('/nota/')), 'no sube ninguna nota');
  assert.deepEqual(Object.keys(JSON.parse(w.subido.get(CLAVE_DEL_MANIFIESTO)).notas), ['otra2']);
  assert.equal(JSON.parse(w.subido.get(CLAVE_DEL_ESTADO)).modo, 'quitar');
  assert.match(salida.join('\n'), /retiradas\.json/, 'recuerda sumarla a retiradas.json');
  // las guardas valen igual: sin --produccion no toca producción, y los ids tienen que ser ids
  assert.equal(await principal(['--quitar=abc123', '--bucket=radar-archivo'], { env: ENV_CON_CLAVES, ejecutar: w.ejecutar, escribir: () => {} }), 2);
  assert.equal(await principal(['--quitar=../x', '--bucket=radar-archivo', '--produccion'], { env: ENV_CON_CLAVES, ejecutar: w.ejecutar, escribir: () => {} }), 2);
  assert.equal(await principal(['--quitar=abc123', '--bucket=radar-respaldos', '--produccion'], { env: { ...ENV_CON_CLAVES, R2_RESPALDOS: 'radar-respaldos' }, ejecutar: w.ejecutar, escribir: () => {} }), 2);
  assert.deepEqual(borrarParaQuitar(['q1'], null).map((b) => b.clave), ['nota/q1.html', 'nota/q1/opengraph-image', 'nota/q1/instagram.png'], 'sin manifiesto, las claves de siempre');
});

test('UNA NOTA RETIRADA NO QUEDA EN R2: de punta a punta, con retiradas.json, --borrar la saca con su foto y el Worker deja de servirla', async () => {
  const notas = [nota('n1', 1, { tarjeta: true }), nota('n2', 2), nota('n3', 3)];
  const sitio = armarSitio(notas);
  try {
    const args = [`--out=${sitio.out}`, `--datos=${sitio.datos}`, '--tope=1', '--margen=0', '--subir', '--borrar', '--produccion', '--bucket=radar-archivo'];
    // el depósito, de mentira pero con estado: lo que se sube queda, lo que se borra se va
    const deposito = new Map();
    const ejecutar = async (a) => {
      const clave = a[3]?.split('/').slice(1).join('/');
      if (a[2] === 'put') deposito.set(clave, fs.readFileSync(a[a.indexOf('--file') + 1]));
      if (a[2] === 'delete') deposito.delete(clave);
      if (a[2] === 'get') {
        if (!deposito.has(clave)) return { ok: false, salida: 'The specified key does not exist.' };
        fs.writeFileSync(a[a.indexOf('--file') + 1], deposito.get(clave));
      }
      return { ok: true, salida: '' };
    };
    assert.equal(await principal(args, { env: ENV_CON_CLAVES, ejecutar, escribir: () => {} }), 0);
    assert.ok(deposito.has('nota/n1.html') && deposito.has('fotos-notas/n1.jpg') && deposito.has('nota/n1/opengraph-image'));
    const r2 = { async get(k) { const b = deposito.get(k); return b ? { httpEtag: '"e"', async text() { return b.toString('utf8'); }, body: b } : null; }, async head(k) { return deposito.has(k) ? {} : null; } };
    const parte = parteDeNota(notas[0]);
    const pedir = () => manejar(new Request(`https://radarbalcarce.com/nota/${parte}`), { ARCHIVO: r2 }, { waitUntil() {} }, { fetchFn: async () => new Response('404', { status: 404 }), cache: null });
    assert.equal((await pedir()).status, 200, 'archivada, se sirve');

    fs.writeFileSync(path.join(sitio.datos, 'retiradas.json'), JSON.stringify({ notas: { n1: { motivo: 'nombra a un menor', cuando: '2026-10-16', por: 'hernan' } } }));
    assert.equal(await principal(args, { env: ENV_CON_CLAVES, ejecutar, escribir: () => {} }), 0);
    assert.ok(![...deposito.keys()].some((k) => k.includes('n1')), `no queda nada de n1 en el depósito: ${[...deposito.keys()].join(', ')}`);
    assert.ok(!JSON.parse(deposito.get(CLAVE_DEL_MANIFIESTO).toString()).notas.n1);
    assert.equal((await pedir()).status, 404, 'y el Worker ya no la sirve');
    assert.ok(deposito.has('nota/n2.html'), 'lo demás sigue');

    // aunque después se borre de retiradas.json (a los 7 días), no vuelve: ya no está en el sitio compilado
    fs.rmSync(path.join(sitio.out, 'nota', `${parte}.html`));
    fs.writeFileSync(path.join(sitio.datos, 'retiradas.json'), JSON.stringify({ notas: {} }));
    const archivo = JSON.parse(fs.readFileSync(path.join(sitio.datos, 'archivo.json'), 'utf8'));
    fs.writeFileSync(path.join(sitio.datos, 'archivo.json'), JSON.stringify({ notas: archivo.notas.filter((n) => n.id !== 'n1') }));
    assert.equal(await principal(args, { env: ENV_CON_CLAVES, ejecutar, escribir: () => {} }), 0);
    assert.ok(![...deposito.keys()].some((k) => k.includes('n1')));
  } finally { sitio.borrar(); }
});

test('armarEstado no lleva nada más que números, fechas y el nombre del depósito', () => {
  const e = armarEstado({ ok: true, bucket: 'radar-archivo', tope: 3700, margen: 200, manifiesto: { totales: { notas: 3, objetos: 5, bytes: 9 } }, resultado: { subidos: 2, fallidos: [{ clave: 'x', salida: 'secreto' }] }, segundos: 4, cuando: '2026-10-16T00:00:00.000Z' });
  assert.deepEqual(e, { version: 1, cuando: '2026-10-16T00:00:00.000Z', ok: true, modo: 'archivar', bucket: 'radar-archivo', tope: 3700, margen: 200, notas: 3, objetos: 5, bytes: 9, subidos: 2, borrados: 0, pendientes: 0, fallidos: 1, omitidas: 0, segundos: 4 });
});

// ------------------------------------------------------------------ LA PRUEBA DE CONTRATO

/** Lo que el lector ve de una página (head y artículo), sin lo que cambia a propósito: scripts, estilos, hace-N, botones y franja del día. */
function lectura(html) {
  const head = /<head>([\s\S]*?)<\/head>/.exec(html)[1];
  const metas = [...head.matchAll(/<(?:meta|link|title)\b[^>]*>(?:[^<]*<\/title>)?/g)]
    .map((m) => m[0])
    .filter((t) => !/rel="(stylesheet|preload)"/.test(t));
  const ld = [...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const articulo = /<article\b[\s\S]*?<\/article>/.exec(html)[0]
    .replace(/<time\b[^>]*data-hace=[^>]*>[\s\S]*?<\/time>/g, '')
    .replace(/<button\b[^>]*>[\s\S]*?<\/button>/g, '')
    // el "Seguí leyendo" (las notas del día del armado) se saca a propósito (16/10/2026); en Next es un <section> sin otros adentro
    .replace(/<section class="bloque-seccion"(?:(?!<\/section>)[\s\S])*?>Seguí leyendo<[\s\S]*?<\/section>/g, '');
  return { metas, ld, articulo };
}

test('CONTRATO: una nota archivada devuelve el mismo HTML que el sitio (cabeza, datos estructurados y artículo, letra por letra)', async () => {
  const n = nota('n1', 1, { tarjeta: true });
  const sitio = armarSitio([n]);
  try {
    const parte = parteDeNota(n);
    const delSitio = fs.readFileSync(path.join(sitio.out, 'nota', `${parte}.html`), 'utf8');
    const plan = armarPlan([n], { out: sitio.out });
    const guardado = plan.entradas[0].objetos[0].buffer.toString('utf8');

    // 1. lo que va a R2 es lo del sitio, con las diferencias a propósito y nada más
    assert.deepEqual(lectura(guardado), lectura(delSitio));
    assert.equal(rutaCanonicaDe(guardado), rutaCanonicaDe(delSitio));
    assert.ok(guardado.includes('<h1>Titular n1</h1>') && guardado.includes('<img src="/fotos-notas/n1.jpg"'));

    // 2. y es lo que el Worker devuelve cuando el sitio ya no la tiene: mismo cuerpo, estado 200
    const deposito = { async get(k) { return k === 'nota/n1.html' ? { httpEtag: '"e"', async text() { return guardado; }, body: null } : null; } };
    const r = await manejar(new Request(`https://radarbalcarce.com/nota/${parte}`), { ARCHIVO: deposito }, { waitUntil() {} }, { fetchFn: async () => new Response('404', { status: 404 }), cache: null });
    assert.equal(r.status, 200);
    assert.equal(await r.text(), guardado);
    assert.deepEqual(lectura(guardado).articulo, lectura(delSitio).articulo);

    // 3. la foto y las tarjetas que la página pide están en el depósito con la misma dirección
    const pedidos = [...guardado.matchAll(/(?:src|content)="((?:https:\/\/radarbalcarce\.com)?\/(?:fotos-notas|nota)\/[^"]+)"/g)].map((m) => new URL(m[1], 'https://radarbalcarce.com').pathname);
    const claves = new Set(plan.entradas[0].objetos.map((o) => o.clave));
    assert.ok(pedidos.includes('/fotos-notas/n1.jpg'));
    for (const p of pedidos.filter((x) => /opengraph-image|fotos-notas/.test(x))) assert.ok(claves.has(analizarRuta(p, { fotos: true }).clave), `${p} no está en el depósito`);
  } finally { sitio.borrar(); }
});

// Con el sitio real compilado (cd web && npx next build) se prueba contra TODAS sus notas; sin él (es lo normal en npm test) se saltea.
const OUT_REAL = new URL('../web/out/', import.meta.url);
test('CONTRATO con el sitio real compilado: cada nota se prepara sin problemas y conserva su artículo', { skip: !fs.existsSync(new URL('nota/', OUT_REAL)) && 'no hay web/out (se compila con: cd web && npx next build)' }, () => {
  const out = fileURLToPathCompat(OUT_REAL);
  const archivos = fs.readdirSync(path.join(out, 'nota')).filter((f) => f.endsWith('.html'));
  assert.ok(archivos.length > 0);
  const hojas = new Map();
  const css = (href) => { const r = path.join(out, href.slice(1)); if (!hojas.has(r)) hojas.set(r, fs.readFileSync(r, 'utf8')); return hojas.get(r); };
  for (const f of archivos) {
    const original = fs.readFileSync(path.join(out, 'nota', f), 'utf8');
    const { html, problemas } = prepararHtml(original, { css });
    assert.deepEqual(problemas, [], f);
    assert.deepEqual(lectura(html), lectura(original), f);
    assert.equal(rutaCanonicaDe(html), `/nota/${f.replace(/\.html$/, '')}`, f);
    assert.equal(prepararHtml(html, { css }).html, html, `${f}: idempotente`);
  }
});

function fileURLToPathCompat(u) { return path.normalize(decodeURIComponent(u.pathname).replace(/^\/([A-Za-z]:)/, '$1')); }
