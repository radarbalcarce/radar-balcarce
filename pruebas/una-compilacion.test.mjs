// Regla 189 (17/10/2026, auditoría 2.0, 01-ARMADO-E-INFRA, alternativa A): el sitio se compila UNA vez por vuelta. "Actualizar la web" compila,
// guarda los datos en main y sube a Cloudflare lo que compiló; "Cloudflare Pages" (cloudflare-deploy.yml) queda sólo a mano. Antes la
// segunda compilación repetía lo mismo (~2,5 minutos por vuelta, ~4.000 minutos de GitHub por mes). Lo que no puede perderse en el cambio:
// que no se publique si no compila o si no se guardó en main, que lo publicado sea lo que quedó en main (si entró algo que el sitio lee
// mientras se armaba, se recompila), el archivo R2, el aviso si falla, IndexNow y que una subida a mano siga siendo posible.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { hayQueRecompilar, archivosEntre, NO_CAMBIAN_EL_SITIO } from '../web/scripts/recompilar.mjs';
import { QUE_SIGNIFICA_EL_PASO, WORKFLOWS_VIGILADOS } from '../redes/vigilar.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const sinComentarios = (t) => t.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
const paso = (yml, nombre) => {
  const i = yml.indexOf(`- name: ${nombre}`);
  assert.ok(i > 0, `falta el paso "${nombre}"`);
  const j = yml.indexOf('- name:', i + 8);
  return yml.slice(i, j < 0 ? undefined : j);
};

test('lo que el sitio no lee no obliga a recompilar; todo lo demás, sí (ante la duda, recompila)', () => {
  assert.deepEqual(hayQueRecompilar([]), { recompilar: false, porque: [] });
  for (const a of ['web/data/vigilancia.json', 'web/data/estadisticas.json', 'web/data/estadisticas-piezas.json', 'web/data/auditoria-ia.json',
    'docs/08-INFRAESTRUCTURA.md', 'CLAUDE.md', 'pruebas/x.test.mjs', '.github/workflows/redes.yml', 'infra/reloj-cloudflare/worker.mjs']) {
    assert.equal(hayQueRecompilar([a]).recompilar, false, a);
  }
  // Lo que cambia lo que ve el lector: lo legal del celular, el libro de redes (los podcasts tienen nota), las notas de pistas, el código.
  for (const a of ['web/data/retiradas.json', 'web/data/correcciones.json', 'web/data/celular-decisiones.json', 'web/data/redes.json',
    'web/data/notas-de-pistas.json', 'web/data/fotos-ia.json', 'web/data/fotos-manuales.json', 'web/public/fotos-notas/x.jpg', 'web/lib/datos.js',
    'ingesta/criterio.mjs', 'web/package-lock.json', 'web/data/cualquier-cosa-nueva.json', 'docs.md/raro']) {
    assert.equal(hayQueRecompilar([a]).recompilar, true, a);
  }
  const mezcla = hayQueRecompilar(['web/data/vigilancia.json', 'web/data/retiradas.json']);
  assert.deepEqual(mezcla, { recompilar: true, porque: ['web/data/retiradas.json'] });
  // con barras de Windows también
  assert.equal(hayQueRecompilar(['web\\data\\vigilancia.json']).recompilar, false);
  // ninguna regla de la lista deja pasar web/data entera ni web/ entera
  for (const r of NO_CAMBIAN_EL_SITIO) assert.ok(!r.test('web/data/portada.json') && !r.test('web/app/page.js'), String(r));
});

test('archivosEntre le pregunta a git los archivos que cambiaron entre el commit compilado y main', () => {
  let visto = null;
  const archivos = archivosEntre('abc123', 'HEAD', { git: (args) => { visto = args; return 'web/data/redes.json\n\nweb/data/vigilancia.json\n'; } });
  assert.deepEqual(visto, ['diff', '--name-only', 'abc123', 'HEAD']);
  assert.deepEqual(archivos, ['web/data/redes.json', 'web/data/vigilancia.json']);
});

test('"Actualizar la web" compila una vez, guarda en main y recién ahí sube lo compilado (y recompila sólo si entró algo que el sitio lee)', () => {
  const yml = leer('.github/workflows/actualizar.yml');
  const s = sinComentarios(yml);
  const orden = ['Núcleo legal de las pruebas', 'Buscar noticias y armar los datos', 'Compilar el sitio', 'Revisar que el SEO siga en pie',
    'Guardar si cambió algo', 'Ver si entró algo que cambie el sitio', 'Volver a compilar con lo que entró', 'Archivar las notas por salir (R2)',
    'Avisar si el archivo permanente falló', 'Subir a Cloudflare Pages', 'Avisar a Bing de las notas nuevas'];
  const posiciones = orden.map((n) => s.indexOf(`- name: ${n}`));
  posiciones.forEach((p, i) => assert.ok(p > 0, `falta "${orden[i]}"`));
  for (let i = 1; i < posiciones.length; i++) assert.ok(posiciones[i - 1] < posiciones[i], `"${orden[i - 1]}" va antes que "${orden[i]}"`);
  // una sola compilación fija; la otra es condicional
  assert.equal((s.match(/npm run build/g) ?? []).length, 2, 'la compilación de siempre y la de "volver a compilar"');
  assert.match(paso(s, 'Volver a compilar con lo que entró'), /if: steps\.recompilar\.outputs\.recompilar == 'true'/);
  assert.match(paso(s, 'Volver a compilar con lo que entró'), /node scripts\/revisar-seo\.mjs/, 'lo recompilado también pasa por el control del SEO');
  // el commit compilado sale del paso que guarda y llega al que decide
  assert.match(paso(s, 'Guardar si cambió algo'), /id: guardar/);
  assert.match(paso(s, 'Guardar si cambió algo'), /compilado=\$\(git rev-parse HEAD\)/);
  assert.match(paso(s, 'Guardar si cambió algo'), /echo "compilado=\$compilado" >> "\$GITHUB_OUTPUT"/);
  assert.match(paso(s, 'Ver si entró algo que cambie el sitio'), /node web\/scripts\/recompilar\.mjs "\$\{\{ steps\.guardar\.outputs\.compilado \}\}"/);
  // la subida: sin `if` (sólo si todo lo anterior salió bien), sin continue-on-error (si falla, se ve), con wrangler fijo
  const subir = paso(s, 'Subir a Cloudflare Pages');
  // sólo se omite si la huella dice que nada cambió (regla 304: menos-compilaciones.test.mjs); ningún `if` de éxito: si algo falló antes, no corre
  assert.ok(!/success\(\)|always\(\)/.test(subir), 'no se sube por encima de un fallo anterior');
  assert.match(subir, /if: \$\{\{ steps\.huella\.outputs\.igual != 'true' \|\| steps\.recompilar\.outputs\.recompilar == 'true' \}\}/);
  assert.ok(!/continue-on-error/.test(subir), 'si la subida falla, la corrida sale en rojo y el vigilante lo avisa');
  assert.match(subir, /npx --yes wrangler@\d+\.\d+\.\d+ pages deploy out --project-name="\$PROYECTO" --branch=main/);
  assert.match(subir, /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
  assert.ok(Number(/timeout-minutes: (\d+)/.exec(s)[1]) >= 25, 'el tope de la corrida alcanza para subir');
});

test('"Cloudflare Pages" queda sólo a mano, con los mismos pasos y la misma versión de wrangler', () => {
  const w = leer('.github/workflows/cloudflare-deploy.yml');
  const s = sinComentarios(w);
  assert.match(s, /on:\n\s+workflow_dispatch:\n/);
  assert.ok(!/workflow_run|schedule:|push:/.test(s), 'ya no arranca sola');
  assert.match(s, /ref: main/, 'sube lo que está en main');
  for (const n of ['Compilar el sitio', 'Archivar las notas por salir (R2)', 'Subir a Cloudflare Pages', 'Avisar a Bing de las notas nuevas']) paso(s, n);
  const version = (t) => /wrangler@(\d+\.\d+\.\d+) pages deploy/.exec(t)[1];
  assert.equal(version(w), version(leer('.github/workflows/actualizar.yml')), 'la misma versión de wrangler en los dos');
  // ningún workflow espera a que termine "Actualizar la web" para volver a compilar o subir
  for (const f of fs.readdirSync(new URL('../.github/workflows/', import.meta.url)).filter((x) => x.endsWith('.yml'))) {
    const t = sinComentarios(leer(`.github/workflows/${f}`));
    assert.ok(!(/workflow_run:/.test(t) && /Actualizar la web/.test(t) && /pages deploy/.test(t)), `${f} vuelve a subir después de "Actualizar la web"`);
  }
});

test('el vigilante explica la falla de la subida y ya no mira "Cloudflare Pages", que es a mano', () => {
  assert.match(QUE_SIGNIFICA_EL_PASO['Subir a Cloudflare Pages'], /versión anterior/);
  assert.ok(QUE_SIGNIFICA_EL_PASO['Volver a compilar con lo que entró']);
  assert.ok(!WORKFLOWS_VIGILADOS['cloudflare-deploy.yml']);
  assert.equal(WORKFLOWS_VIGILADOS['actualizar.yml'], 'Actualizar la web');
});
