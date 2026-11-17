// El cupo de voz es 15 audios por día fijos (Hernán, 13/11/2026) y está escrito en un solo lugar: lo que decía 10 en tres sitios (auditoría H-05) no puede volver.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { REGLAS_PIEZAS, topeDeVoz } from './piezas-plan.mjs';
import { VOZ_CUPO_DIARIO } from './piezas/variables.mjs';

const aca = dirname(fileURLToPath(import.meta.url));
const raiz = join(aca, '..', '..');
const leer = (...r) => readFileSync(join(raiz, ...r), 'utf8');

test('el plan, la tabla de variables y el contador de voz dicen 15', async () => {
  assert.equal(REGLAS_PIEZAS.audiosPorDia, 15);
  assert.equal(VOZ_CUPO_DIARIO, 15);
  assert.equal(topeDeVoz({}), 15, 'sin variable, el cupo del código');
  const saved = process.env.AUDIOS_POR_DIA;
  delete process.env.AUDIOS_POR_DIA;
  try {
    const { AUDIOS_POR_DIA } = await import(`../../reels/cupo-voz.mjs?sin-variable=${Date.now()}`);
    assert.equal(AUDIOS_POR_DIA, 15);
  } finally { if (saved !== undefined) process.env.AUDIOS_POR_DIA = saved; }
});

test('ni wrangler.toml ni los workflows de la 3.0 pisan el cupo con otro número', () => {
  const toml = leer('v3', 'redes', 'wrangler.toml').split(/\r?\n/).filter((l) => !l.trim().startsWith('#')).join('\n');
  assert.doesNotMatch(toml, /VOZ_TOPE_DIARIO/, 'el cupo vive en el código, no en wrangler.toml');
  for (const w of ['v3-piezas.yml', 'v3-reel-previa-vino.yml']) {
    const y = leer('.github', 'workflows', w).split(/\r?\n/).filter((l) => !l.trim().startsWith('#')).join('\n');
    assert.doesNotMatch(y, /AUDIOS_POR_DIA|V3_AUDIOS_POR_DIA/, `${w} no pasa el cupo`);
  }
});

test('los documentos vivos dicen 15 audios por día, no 10', () => {
  for (const [ruta, texto] of [
    ['CRITERIO-REDES.md', leer('CRITERIO-REDES.md')],
    ['v3/redes/REGLAS.md', leer('v3', 'redes', 'REGLAS.md')],
    ['docs/3-0/REDES.md', leer('docs', '3-0', 'REDES.md')],
    ['docs/3-0/UN-DIA-DEL-SITIO.md', leer('docs', '3-0', 'UN-DIA-DEL-SITIO.md')],
  ]) {
    assert.doesNotMatch(texto, /(?:cupo (?:de|es de) |de )10 audios por d/i, `${ruta} todavía dice 10`);
    assert.match(texto, /15 audios por d/, `${ruta} no dice 15`);
  }
});
