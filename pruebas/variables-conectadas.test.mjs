// Regla 311: una variable que el código lee tiene que llegarle. GitHub sólo le pasa a un paso las variables que el workflow nombra en su
// `env:`; Workers Builds, sólo las que carga `infra/motor-cloudflare/cargar-variables.mjs`; los Workers, las de su `wrangler.toml` o las
// que se les pasa con `--var`. Antes de esta regla, `ENLACES_CORTOS` y `FOTOS_EN_R2` se leían en el código pero no llegaban a ningún lado
// (poner "Si" en GitHub no hacía nada), y `POLICIAL_NACIONAL` y `FUTBOL_SOLO_ARGENTINO` estaban en la lista de Workers Builds pero el
// workflow que la llena no las mandaba. Esta prueba recorre el código, busca cada `process.env.NOMBRE` / `env.NOMBRE` y falla si el
// nombre no llega por ningún camino ni está en la lista de los que se dejan sin pasar a propósito (con su motivo). Sin red.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8').replace(/\r\n/g, '\n');

// ------------------------------------------------------------------ lo que el código lee

const CARPETAS_QUE_NO_CUENTAN = new Set(['node_modules', '.git', '.next', 'out', 'data', '.claude', 'pruebas', 'docs', 'render-publico', '.cache', 'salida']);
function archivos(dir, salida = []) {
  for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    if (CARPETAS_QUE_NO_CUENTAN.has(e.name)) continue;
    const rel = `${dir}/${e.name}`.replace(/^\.\//, '');
    if (e.isDirectory()) archivos(rel, salida);
    else if (/\.(mjs|js)$/.test(e.name)) salida.push(rel);
  }
  return salida;
}
function variablesQueSeLeen() {
  const quien = {};
  for (const f of archivos('.')) {
    for (const m of leer(f).matchAll(/\b(?:process\.env|env)\??\.([A-Z][A-Z0-9_]{2,})\b/g)) (quien[m[1]] ??= new Set()).add(f);
  }
  return quien;
}

// ------------------------------------------------------------------ por dónde llegan

function workflows() {
  return fs.readdirSync(path.join(RAIZ, '.github/workflows')).filter((f) => f.endsWith('.yml')).map((f) => [f, leer(`.github/workflows/${f}`)]);
}
/** Los nombres que algún workflow declara (`NOMBRE: …` en un env:, o `--var "NOMBRE:…"` al desplegar un Worker). */
function pasadasPorWorkflows() {
  const s = new Set();
  for (const [, t] of workflows()) {
    for (const m of t.matchAll(/^\s*([A-Z][A-Z0-9_]{2,}):/gm)) s.add(m[1]);
    for (const m of t.matchAll(/--var "([A-Z][A-Z0-9_]{2,}):/g)) s.add(m[1]);
  }
  return s;
}
/** Lo que traen los wrangler.toml de infra/ (bindings y [vars]). */
function pasadasPorWrangler() {
  const s = new Set();
  for (const d of fs.readdirSync(path.join(RAIZ, 'infra'), { withFileTypes: true }).filter((e) => e.isDirectory())) {
    for (const f of fs.readdirSync(path.join(RAIZ, 'infra', d.name)).filter((x) => /\.toml(\.parte)?$/.test(x))) {
      const t = leer(`infra/${d.name}/${f}`);
      for (const m of t.matchAll(/binding\s*=\s*"([A-Z][A-Z0-9_]+)"/g)) s.add(m[1]);
      for (const m of t.matchAll(/^([A-Z][A-Z0-9_]{2,})\s*=/gm)) s.add(m[1]);
    }
  }
  return s;
}
/** Las listas de cargar-variables.mjs: lo fijo, las variables de GitHub y los secretos que viajan a Workers Builds. */
function listasDeCargarVariables() {
  const t = leer('infra/motor-cloudflare/cargar-variables.mjs');
  const lista = (nombre) => [...(t.match(new RegExp(`const ${nombre} = \\[([^\\]]*)\\]`))?.[1] ?? '').matchAll(/'([A-Z][A-Z0-9_]+)'/g)].map((m) => m[1]);
  const fijas = [...(t.match(/const FIJAS = \{([^}]*)\}/)?.[1] ?? '').matchAll(/([A-Z][A-Z0-9_]+):/g)].map((m) => m[1]);
  return { fijas, variables: lista('VARIABLES'), secretos: lista('SECRETOS') };
}

// ------------------------------------------------------------------ lo que se deja sin pasar, a propósito

const SIN_PASAR_A_PROPOSITO = {
  'las pone el propio entorno (GitHub, Node, Workers Builds)': [
    'GITHUB_ACTIONS', 'GITHUB_OUTPUT', 'GITHUB_RUN_ID', 'GITHUB_STEP_SUMMARY', 'NODE_TEST_CONTEXT', 'WORKERS_CI_BUILD_UUID', 'WORKERS_CI_COMMIT_SHA',
  ],
  'las pone otro programa al llamar al siguiente (no son de nadie desde afuera)': [
    'MOTOR_SIMULAR', 'FOTOS_R2_INDICE', 'MOTOR_ID', 'RADAR_RAIZ', 'RADAR_MOTOR', 'RADAR_DATOS_FIJOS', 'USO_IA_ARCHIVO', 'PIEZAS_WRANGLER_JSON', 'REFERENCIAS_DE_VOZ',
    'ARMAR_EN_LA_PC', 'RENDER_REPOSITORIO',
  ],
  'apagados de emergencia: sin la variable todo anda como siempre, y se pueden crear a mano en el Worker o en el panel (docs/08-INFRAESTRUCTURA.md)': [
    'FACEBOOK_COMO_FOTO', 'REELS_ESCENAS', 'REELS_ANIMADOS', 'MEMORIA_DE_ACA', 'CRUCE_COHERENTE', 'INGESTA_PERMITIR_VACIA', 'ARCHIVO_PERMITIR_BAJA',
    'TARJETAS_SIN_CACHE', 'TARJETAS_CACHE', 'META_PAGE_ID', 'ARCHIVO_ESTADO_URL', 'ARCHIVO_URL', 'AVISOS_URL', 'CLOUDFLARE_SITE_TAG',
    'ESTADO_DEL_VIGILANTE', 'MOTOR_SIN_TOPE', 'MOTOR_REPOSITORIO', 'TAREAS_R2', 'R2_MOTOR',
  ],
  'son de un Worker y se ponen en su panel de Cloudflare (no son de GitHub)': [
    'ARCHIVO', 'MOTOR', 'AVISOS', 'ESTADO', 'MEMORIA',
  ],
};
const A_PROPOSITO = new Set(Object.values(SIN_PASAR_A_PROPOSITO).flat());

// ------------------------------------------------------------------ las pruebas

test('cada variable que el código lee llega por algún camino, o está en la lista de las que se dejan sin pasar a propósito', () => {
  const llegan = new Set([...pasadasPorWorkflows(), ...pasadasPorWrangler()]);
  const cv = listasDeCargarVariables();
  for (const n of [...cv.fijas, ...cv.variables, ...cv.secretos]) llegan.add(n);
  const sinCamino = Object.entries(variablesQueSeLeen())
    .filter(([n]) => !llegan.has(n) && !A_PROPOSITO.has(n))
    .map(([n, quien]) => `${n} (la lee ${[...quien].slice(0, 2).join(', ')})`);
  assert.deepEqual(sinCamino, [], 'el código lee variables que ningún workflow, wrangler.toml o cargar-variables.mjs pasa: sumarlas a un env: (o, si de verdad se dejan sin pasar, a SIN_PASAR_A_PROPOSITO con su motivo)');
});

test('la lista de las que se dejan sin pasar no tiene restos: todas se leen todavía y ninguna llega ya por otro camino', () => {
  const leidas = variablesQueSeLeen();
  const pasan = new Set([...pasadasPorWorkflows(), ...pasadasPorWrangler()]);
  const restos = [...A_PROPOSITO].filter((n) => !(n in leidas));
  assert.deepEqual(restos, [], 'se dejaron en la lista nombres que el código ya no lee: sacarlos');
  const yaPasan = [...A_PROPOSITO].filter((n) => pasan.has(n) && !['MOTOR', 'ESTADO', 'MEMORIA', 'ARCHIVO', 'AVISOS'].includes(n));
  assert.deepEqual(yaPasan, [], 'ya llegan por un workflow o un wrangler.toml: sacarlos de la lista');
});

test('los dos interruptores apagados (ENLACES_CORTOS y FOTOS_EN_R2) llegan a todo lo que los lee, y siguen apagados por defecto', () => {
  const deNombre = (nombre, texto) => new RegExp(`^\\s*${nombre}: \\$\\{\\{ vars\\.${nombre} \\}\\}`, 'm').test(texto);
  const pasos = (archivo) => leer(`.github/workflows/${archivo}`);
  // ENLACES_CORTOS: los pasos que publican (Facebook, piezas), el reintento y Workers Builds.
  for (const f of ['redes.yml', 'piezas.yml', 'reintentar.yml', 'motor-variables.yml']) assert.ok(deNombre('ENLACES_CORTOS', pasos(f)), `ENLACES_CORTOS en ${f}`);
  assert.equal((pasos('redes.yml').match(/ENLACES_CORTOS: \$\{\{ vars\.ENLACES_CORTOS \}\}/g) ?? []).length, 2, 'redes.yml: el paso de Facebook y el de las piezas');
  // FOTOS_EN_R2: lo que arma los datos, los pasos que publican y Workers Builds.
  for (const f of ['actualizar.yml', 'redes.yml', 'piezas.yml', 'motor-variables.yml']) assert.ok(deNombre('FOTOS_EN_R2', pasos(f)), `FOTOS_EN_R2 en ${f}`);
  const cv = listasDeCargarVariables();
  for (const n of ['ENLACES_CORTOS', 'FOTOS_EN_R2', 'POLICIAL_NACIONAL', 'FUTBOL_SOLO_ARGENTINO']) assert.ok(cv.variables.includes(n), `${n} en cargar-variables.mjs`);
  // Apagados por defecto: sin la variable (o vacía), nada se prende. Sólo "Si" prende.
  assert.match(leer('infra/compartido/fotos-r2.mjs'), /export const fotosEnR2Activas = \(env = process\.env\) => si\(env\?\.FOTOS_EN_R2\)/);
  assert.match(leer('redes/enlaces-cortos.mjs'), /esSi\(process\.env\?\.ENLACES_CORTOS\)/);
});

test('todo lo que cargar-variables.mjs manda a Workers Builds sale de una variable o un secreto que motor-variables.yml le pasa', () => {
  const yml = leer('.github/workflows/motor-variables.yml');
  const cv = listasDeCargarVariables();
  const faltan = [
    ...cv.variables.filter((n) => !new RegExp(`^\\s*${n}: \\$\\{\\{ vars\\.${n} \\}\\}`, 'm').test(yml)).map((n) => `${n} (variable)`),
    ...cv.secretos.filter((n) => !new RegExp(`^\\s*${n}: \\$\\{\\{ secrets\\.${n} \\}\\}`, 'm').test(yml)).map((n) => `${n} (secreto)`),
  ];
  assert.deepEqual(faltan, [], 'cargar-variables.mjs las espera en el entorno pero el workflow no las pasa: nunca llegarían a Workers Builds');
});
