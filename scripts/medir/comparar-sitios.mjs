// Compara dos sitios publicados dirección por dirección (el de hoy y el nuevo). Ver infra/sitio-por-worker/comparar-sitios.mjs y
// docs/proyecto/SITIO-POR-WORKER-PLAN.md, § 5. Sólo hace pedidos GET, de a uno y con pausa; no escribe en ningún sitio.
//
//   node scripts/medir/comparar-sitios.mjs --lista [--base=https://radarbalcarce.com] [--n=100]      imprime las direcciones a comparar (de los mapas del sitio)
//   node scripts/medir/comparar-sitios.mjs --a=https://radarbalcarce.com --b=https://nuevo.radarbalcarce.com [--lista-de=urls.txt] [--n=100] [--pausa=300]
//                                           [--salida=informe.json] [--ver=1]
//
// Sin --lista-de arma la lista sola desde el /sitemap.xml del sitio A. Termina con código 1 si hay diferencias.

import fs from 'node:fs';
import { listaDeUrls, caminosDeMapa, compararLista } from '../../infra/sitio-por-worker/comparar-sitios.mjs';

const arg = (nombre, defecto = null) => {
  const x = process.argv.find((a) => a === `--${nombre}` || a.startsWith(`--${nombre}=`));
  if (!x) return defecto;
  return x.includes('=') ? x.slice(x.indexOf('=') + 1) : true;
};

async function mapaDe(base) {
  const caminos = [];
  for (const m of ['/sitemap.xml', '/sitemap-news.xml']) {
    try {
      const r = await fetch(`${base}${m}`);
      if (r.ok) caminos.push(...caminosDeMapa(await r.text(), base));
    } catch { /* se sigue con lo que haya */ }
  }
  return caminos;
}

const n = Number(arg('n', 100));
if (arg('lista')) {
  const base = String(arg('base', 'https://radarbalcarce.com')).replace(/\/+$/, '');
  console.log(listaDeUrls(await mapaDe(base), { n }).join('\n'));
  process.exit(0);
}

const a = String(arg('a', '')).replace(/\/+$/, '');
const b = String(arg('b', '')).replace(/\/+$/, '');
if (!a || !b) { console.error('Faltan --a y --b (las dos direcciones de los sitios).'); process.exit(2); }
const archivo = arg('lista-de', null);
const caminos = archivo && archivo !== true
  ? fs.readFileSync(archivo, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('/'))
  : listaDeUrls(await mapaDe(a), { n });

const resultados = await compararLista(caminos, {
  a, b, pausa: Number(arg('pausa', 300)),
  alAvanzar: (r, i, total) => { if (!r.iguales) console.log(`[${i}/${total}] DIFIERE ${r.camino} (${r.a.estado} / ${r.b.estado})`); },
});
const malas = resultados.filter((r) => !r.iguales);
for (const r of malas) {
  console.log(`\n${r.camino}`);
  for (const d of r.diferencias.slice(0, arg('ver') ? 20 : 4)) console.log(`   ${d.campo}: ${JSON.stringify(d.a)?.slice(0, 140)}  →  ${JSON.stringify(d.b)?.slice(0, 140)}`);
}
const lento = (xs) => Math.round(xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length));
console.log(`\n${resultados.length - malas.length} de ${resultados.length} direcciones iguales. Tiempo medio: A ${lento(resultados.map((r) => r.a.ms))} ms, B ${lento(resultados.map((r) => r.b.ms))} ms.`);
if (arg('salida')) fs.writeFileSync(arg('salida'), JSON.stringify({ a, b, cuando: new Date().toISOString(), resultados }, null, 2));
process.exit(malas.length ? 1 : 0);
