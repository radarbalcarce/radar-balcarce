// Mide, CON RED, cuánto rinde cada fuente activa con el lector de la 3.0.
// Uso: node v3/nucleo/scripts/probar-fuentes.mjs
// Escribe v3/nucleo/scripts/salida/probar-fuentes.md (no se commitea).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cargarFuentes } from '../fuentes.mjs';
import { leerFuente } from '../leer/leer.mjs';

const aca = dirname(fileURLToPath(import.meta.url));
const fuentes = cargarFuentes(JSON.parse(readFileSync(join(aca, '..', 'fuentes.json'), 'utf8')));

// de a 12 fuentes a la vez, para no ahogar la red ni a los servidores
async function enLotes(lista, n, fn) {
  const salida = new Array(lista.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < lista.length) { const k = i++; salida[k] = await fn(lista[k]); }
  }));
  return salida;
}

const ahora = new Date();
const filas = await enLotes(fuentes, 12, async (f) => {
  const t0 = Date.now();
  const { articulos, error } = await leerFuente(f, { ahora });
  return {
    f,
    error,
    ms: Date.now() - t0,
    n: articulos.length,
    conTexto: articulos.filter((a) => a.texto.length >= 400).length,
    conImagen: articulos.filter((a) => a.imagenes.length > 0).length,
  };
});

const ok = filas.filter((x) => !x.error);
const fallan = filas.filter((x) => x.error);
const sinNada = ok.filter((x) => x.n === 0);
const lineas = [];
lineas.push('# Prueba de fuentes con el lector de la 3.0');
lineas.push('');
lineas.push(`*Corrida del ${ahora.toISOString()}. Artículos de menos de 36 horas.*`);
lineas.push('');
lineas.push(`- Fuentes activas: **${filas.length}**`);
lineas.push(`- Respondieron bien: **${ok.length}** (de ellas, ${sinNada.length} sin nada de menos de 36 h)`);
lineas.push(`- Fallaron: **${fallan.length}**`);
lineas.push(`- Artículos: **${filas.reduce((s, x) => s + x.n, 0)}**; con texto de 400+ caracteres: **${filas.reduce((s, x) => s + x.conTexto, 0)}**; con imagen: **${filas.reduce((s, x) => s + x.conImagen, 0)}**`);
lineas.push('');
lineas.push('| Fuente | Alcance | Estado | < 36 h | Con texto 400+ | Con imagen | ms |');
lineas.push('|---|---|---|---:|---:|---:|---:|');
for (const x of filas.sort((a, b) => (a.error ? 0 : 1) - (b.error ? 0 : 1) || a.f.id.localeCompare(b.f.id))) {
  lineas.push(`| ${x.f.id} | ${x.f.alcance} | ${x.error ? 'ERROR: ' + x.error.replace(/\|/g, '/') : 'ok'} | ${x.n} | ${x.conTexto} | ${x.conImagen} | ${x.ms} |`);
}
mkdirSync(join(aca, 'salida'), { recursive: true });
writeFileSync(join(aca, 'salida', 'probar-fuentes.md'), lineas.join('\n') + '\n');
console.log(lineas.slice(0, 8).join('\n'));
for (const x of fallan) console.log(`FALLA ${x.f.id}: ${x.error}`);
for (const x of sinNada) console.log(`VACÍA ${x.f.id}`);
