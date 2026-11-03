import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { generarSql } from './scripts/migracion.mjs';
import { idsQueNoSeMigran, juntarHistoricos, idsDelManifiesto, notaDesdeHtml, archivosDeFotosViejas, fotosDelManifiesto, tipoDeArchivo } from './scripts/archivo-viejo.mjs';
import { listarClaves } from './scripts/wrangler.mjs';
import { crearSitio } from './sitio.mjs';
import { baseDePrueba } from './ayuda-pruebas.mjs';

const sitio = crearSitio();
const ir = (env, ruta, init) => sitio.manejar(new Request(`https://radar-sitio.example${ruta}`, init), env, null, { cache: null });

// Una nota del histórico mensual (web/data/historico/2026-10.json), con la forma real: aligerada (sin análisis) y con fuentes {medio, enlace}.
const DEL_HISTORICO = {
  id: '18wosri', titulo: 'El INTA Rafaela implementa cruzamientos entre ganado lechero y carnicero', copete: 'El organismo impulsa el sistema beef on dairy.',
  cuerpo: 'El INTA Rafaela trabaja en un sistema.\n\nSe llama beef on dairy.', seccion: 'Agro', medios: ['INTA', 'Agrositio'], fecha: '2026-10-05T12:00:00.000Z', slug: 'el-inta-rafaela-implementa-cruzamientos-entre-ganado-lechero',
  foto: { archivo: 'fotos-notas/18wosri.jpg', credito: 'Foto: INTA' }, como: 'automatica', guion: 'x',
  fuentesConsultadas: [{ medio: 'INTA', enlace: 'https://www.argentina.gob.ar/noticias/carne-derivada-del-tambo' }, { medio: 'Agrositio', enlace: 'https://www.agrositio.com.ar/noticia/248694.html' }],
};

// La página que guarda R2 (`nota/<id>.html`), armada como la dibuja web/app/nota/[id]/page.js y la deja prepararHtml (sin scripts salvo los datos estructurados).
const HTML_DE_R2 = `<!DOCTYPE html><html lang="es"><head><meta charSet="utf-8"/><title>Concejales proponen un registro | Radar Balcarce</title>
<link rel="canonical" href="https://radarbalcarce.com/nota/concejales-proponen-un-registro-15i90co"/>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle","headline":"Concejales proponen un registro","datePublished":"2026-10-01T15:01:12.943Z","articleSection":"Balcarce"}</script></head>
<body><article class="cuerpo-nota" data-pagefind-body=""><h1>Concejales proponen un registro &quot;municipal&quot; de acompa&#x27;ñantes</h1><p class="copete">Un proyecto ingresó al Concejo.</p>
<figure><img src="https://radarbalcarce.com/fotos-notas/15i90co.jpg" alt=""/><figcaption>Foto: Diario La Vanguardia</figcaption></figure>
<p style="font-size:16px;line-height:1.7;margin-top:16px;color:var(--texto)">Un proyecto de ordenanza ingresó en el <a href="/x">Concejo Deliberante</a>.</p>
<p style="font-size:16px;line-height:1.7;margin-top:16px;color:var(--texto)">Lo firman tres  concejales &amp; piden su tratamiento.</p>
<p class="fecha-de-la-nota"><time dateTime="2026-10-01T15:01:12.943Z">1 de octubre</time></p></article></body></html>`;

test('una nota del histórico mensual se migra igual que una del sitio: misma dirección, fuentes, foto y firma', async () => {
  const { sqlite, env } = baseDePrueba();
  const r = generarSql(juntarHistoricos([{ notas: [DEL_HISTORICO] }]), { prefijo: 'archivo' });
  assert.equal(r.migradas, 1);
  assert.equal(r.archivos[0].nombre, 'archivo-001.sql');
  for (const a of r.archivos) sqlite.exec(a.sql);
  const res = await ir(env, '/nota/el-inta-rafaela-implementa-cruzamientos-entre-ganado-lechero-18wosri');
  assert.equal(res.status, 200);
  const h = await res.text();
  assert.match(h, /Fuentes \(2\)/);
  assert.match(h, /https:\/\/radarbalcarce\.com\/fotos-notas\/18wosri\.jpg/);
  assert.match(h, /Foto: INTA/);
  assert.equal(sqlite.prepare("SELECT origen FROM sitio_notas WHERE id = '18wosri'").get().origen, 'viejo');
});

test('juntarHistoricos: sin repetir, sin retiradas ni unidas, y la revisión del archivo cuenta', () => {
  const otra = { ...DEL_HISTORICO, id: 'zzz1', titulo: 'Otra' };
  const excluir = idsQueNoSeMigran({
    retiradas: { notas: { aaa1: { motivo: 'repetida' }, bbb2: { titulo: 'sin motivo no vale' } } },
    revision: { retiradas: { ccc3: { motivo: 'no es nota' } }, repetidas: { ddd4: { queda: 'zzz1' } } },
  });
  assert.deepEqual([...excluir].sort(), ['aaa1', 'ccc3', 'ddd4']);
  const notas = juntarHistoricos([{ notas: [DEL_HISTORICO, { ...DEL_HISTORICO, titulo: 'duplicada' }] }, [otra, { ...otra, id: 'aaa1' }, { ...otra, id: 'ddd4' }]], { excluir });
  assert.deepEqual(notas.map((n) => n.id), ['18wosri', 'zzz1']);
  assert.equal(notas[0].titulo, DEL_HISTORICO.titulo, 'gana la primera');
});

test('notaDesdeHtml: la página que guarda R2 se convierte en una nota migrable (respaldo)', async () => {
  const n = notaDesdeHtml(HTML_DE_R2, '15i90co');
  assert.equal(n.titulo, 'Concejales proponen un registro "municipal" de acompa\'ñantes');
  assert.equal(n.copete, 'Un proyecto ingresó al Concejo.');
  assert.equal(n.cuerpo, 'Un proyecto de ordenanza ingresó en el Concejo Deliberante.\n\nLo firman tres concejales & piden su tratamiento.');
  assert.equal(n.seccion, 'Balcarce');
  assert.equal(n.fecha, '2026-10-01T15:01:12.943Z');
  assert.deepEqual(n.foto, { archivo: 'fotos-notas/15i90co.jpg', credito: 'Foto: Diario La Vanguardia' });
  const { sqlite, env } = baseDePrueba();
  const r = generarSql([n], { prefijo: 'archivo' });
  assert.equal(r.migradas, 1);
  sqlite.exec(r.archivos[0].sql);
  const res = await ir(env, '/nota/concejales-proponen-un-registro-15i90co');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Lo firman tres concejales/);
});

test('notaDesdeHtml devuelve null si falta titular, cuerpo, fecha o id', () => {
  assert.equal(notaDesdeHtml('<html><body>nada</body></html>', 'abc'), null);
  assert.equal(notaDesdeHtml(HTML_DE_R2, ''), null);
  assert.equal(notaDesdeHtml(HTML_DE_R2.replace(/line-height:1\.7/g, 'x'), 'abc'), null);
});

test('manifiesto del depósito: ids y fotos', () => {
  const m = { version: 1, notas: {
    a1: { titulo: 'A', objetos: [{ clave: 'nota/a1.html' }, { clave: 'fotos-notas/a1.jpg' }, { clave: 'nota/a1/opengraph-image' }] },
    b2: { titulo: 'B', objetos: [{ clave: 'nota/b2.html' }, { clave: 'fotos-notas/a1.jpg' }, { clave: 'fotos-notas/../x' }] },
  } };
  assert.deepEqual(idsDelManifiesto(m), ['a1', 'b2']);
  assert.deepEqual(fotosDelManifiesto(m), ['a1.jpg']);
  assert.deepEqual(idsDelManifiesto(null), []);
});

test('archivosDeFotosViejas: las del propio sitio, con o sin dominio; las de otro dominio no', () => {
  const n = { foto: { archivo: 'fotos-notas/a.jpg' }, fotosEnCuerpo: [{ archivo: 'https://radarbalcarce.com/fotos-notas/b.png' }, { archivo: 'https://otro.com/fotos-notas/c.jpg' }, { archivo: 'fotos-notas/../d.jpg' }] };
  assert.deepEqual(archivosDeFotosViejas(n).sort(), ['a.jpg', 'b.png']);
  assert.equal(tipoDeArchivo('x.woff2'), 'font/woff2');
  assert.equal(tipoDeArchivo('x.JPG'), 'image/jpeg');
});

test('listarClaves: pagina con el cursor y devuelve null si la API no contesta como se espera', async () => {
  const env = { CLOUDFLARE_ACCOUNT_ID: 'cuenta', CLOUDFLARE_API_TOKEN: 't' };
  const paginas = [
    { success: true, result: [{ key: 'fotos-notas/a.jpg' }], result_info: { cursor: 'c2', is_truncated: true } },
    { success: true, result: [{ key: 'fuentes/b.woff2' }], result_info: { is_truncated: false } },
  ];
  const pedidos = [];
  const fetchFn = async (url) => { pedidos.push(String(url)); return Response.json(paginas.shift()); };
  const claves = await listarClaves('radar-fotos', { env, fetchFn });
  assert.deepEqual([...claves].sort(), ['fotos-notas/a.jpg', 'fuentes/b.woff2']);
  assert.match(pedidos[0], /accounts\/cuenta\/r2\/buckets\/radar-fotos\/objects\?per_page=1000/);
  assert.match(pedidos[1], /cursor=c2/);
  assert.equal(await listarClaves('radar-fotos', { env, fetchFn: async () => new Response('no', { status: 404 }) }), null);
});

// ------------------------------------------------------------------ el Worker sirve las fotos y las tipografías desde el binding FOTOS

function depositoFalso(objetos) {
  return {
    async get(clave) {
      const o = objetos[clave];
      if (!o) return null;
      return { body: o.cuerpo, httpEtag: o.etag ?? '"e1"', httpMetadata: o.tipo ? { contentType: o.tipo } : {} };
    },
  };
}

test('/fotos-notas/x.jpg sale del binding con su content-type y caché larga; 404 si no está', async () => {
  const { env } = baseDePrueba();
  env.FOTOS = depositoFalso({ 'fotos-notas/x.jpg': { cuerpo: 'JPEGBYTES', tipo: 'image/jpeg' }, 'fotos-notas/y.png': { cuerpo: 'PNG' } });
  const r = await ir(env, '/fotos-notas/x.jpg');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/jpeg');
  assert.match(r.headers.get('cache-control'), /max-age=604800/);
  assert.match(r.headers.get('cache-control'), /s-maxage=2592000/);
  assert.equal(await r.text(), 'JPEGBYTES');
  // sin content-type guardado, lo deduce de la extensión
  assert.equal((await ir(env, '/fotos-notas/y.png')).headers.get('content-type'), 'image/png');
  assert.equal((await ir(env, '/fotos-notas/no-existe.jpg')).status, 404);
  // HEAD sin cuerpo; If-None-Match → 304
  const h = await ir(env, '/fotos-notas/x.jpg', { method: 'HEAD' });
  assert.equal(h.status, 200);
  assert.equal(await h.text(), '');
  assert.equal((await ir(env, '/fotos-notas/x.jpg', { headers: { 'if-none-match': '"e1"' } })).status, 304);
});

test('/fuentes/*.woff2 sale del binding con font/woff2 y caché de un año; los nombres raros dan 404', async () => {
  const { env } = baseDePrueba();
  env.FOTOS = depositoFalso({ 'fuentes/inter-latin.woff2': { cuerpo: 'FONT' }, 'fotos-notas/secreto': { cuerpo: 'no' } });
  const r = await ir(env, '/fuentes/inter-latin.woff2');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'font/woff2');
  assert.match(r.headers.get('cache-control'), /max-age=31536000, immutable/);
  assert.equal((await ir(env, '/fuentes/%2e%2e%2ffotos-notas%2fsecreto')).status, 404);
  assert.equal((await ir(env, '/fuentes/.oculto')).status, 404);
  assert.equal((await ir(env, '/fuentes/otra/carpeta.woff2')).status, 404);
});

test('sin binding FOTOS el sitio no se rompe: 404 en las fotos y todo lo demás sigue igual', async () => {
  const { env } = baseDePrueba();
  assert.equal((await ir(env, '/fotos-notas/x.jpg')).status, 404);
  assert.equal((await ir(env, '/robots.txt')).status, 200);
  env.FOTOS = { async get() { throw new Error('R2 caído'); } };
  assert.equal((await ir(env, '/fotos-notas/x.jpg')).status, 502);
});

test('con el histórico real del repositorio, toda nota migrable resuelve en su dirección (muestra)', { skip: !existsSync(new URL('../../web/data/historico/', import.meta.url)) && 'no está el histórico' }, async () => {
  const carpeta = new URL('../../web/data/historico/', import.meta.url);
  const listas = readdirSync(carpeta).filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).map((f) => JSON.parse(readFileSync(new URL(f, carpeta), 'utf8')));
  const notas = juntarHistoricos(listas);
  const { sqlite, env } = baseDePrueba();
  const r = generarSql(notas, { prefijo: 'archivo' });
  for (const a of r.archivos) sqlite.exec(a.sql);
  assert.ok(r.migradas > 1000, `migradas ${r.migradas}`);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sitio_notas').get().n, r.migradas);
  for (const f of sqlite.prepare('SELECT id, slug FROM sitio_notas ORDER BY id LIMIT 80').all()) assert.equal((await ir(env, `/nota/${f.slug}-${f.id}`)).status, 200, f.id);
});
