// Mide el cruce coherente (regla 184) contra el cruce de antes, con la MISMA lectura guardada: arma el conjunto del cruce
// como lo arma ingestar() (las notas de cada feed, sin las descartadas ni las viejas, sin repetir, más la memoria de 36
// horas) y corre armarHistorias() dos veces, con CRUCE_COHERENTE apagado y prendido. No llama a ninguna IA, no lee
// feeds y no escribe nada en web/data. Pedido del 16/10/2026; resultados en docs/flujos/CRUCE-COHERENTE.md.
//
//   node scripts/medir/cruce-coherente.mjs                                  la última lectura de .cache/informe-del-dia-*.json
//   node scripts/medir/cruce-coherente.mjs --ingesta=.cache/informe-del-dia-202610161200.json --memoria=.cache/cruce-memoria.json
//   node scripts/medir/cruce-coherente.mjs --ref=disco                      lo publicado del disco (web/data) en vez de origin/main
//   node scripts/medir/cruce-coherente.mjs --horas=30 --promedio=0.24 --resto=0.2 --max=25    para calibrar
//   node scripts/medir/cruce-coherente.mjs --json=salida.json               además, todo en un archivo
//   node scripts/medir/cruce-coherente.mjs --ejemplos                       los grupos partidos más grandes, nota por nota
//
// La lectura (`--ingesta`) es la que guarda scripts/medir/informe-del-dia.mjs: trae cada nota de cada feed («crudas»:
// medio, título, enlace, fecha y 300 caracteres del resumen). Las páginas raspadas no traen el cuerpo que la ingesta baja de
// cada nota: el conjunto es una aproximación muy cercana (el 16/10, 7.812 notas contra 7.746 de la corrida y el mismo grupo
// de fútbol de 223 a 228 notas).

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  TODAS_LAS_FUENTES, MEMORIA_DEL_CRUCE, armarHistorias, contarMedios, mediosMinimosDe, paraPruebas,
} from '../../ingesta/ingesta.mjs';
import { CRUCE, desdeLaMemoria } from '../../ingesta/cruce.mjs';
import { enlaceNormalizado, compararNotas } from '../../ingesta/repetidas-publicadas.mjs';
import { PORTADA } from '../../ingesta/criterio.mjs';

const { normalizar, marcarDeAfuera, idDe, clasificar } = paraPruebas;
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..', '..');
const HORA = 3600e3;
const arg = (nombre) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3) ?? null;

/** El conjunto del cruce de una lectura guardada (lo mismo que arma ingestar() antes de agrupar). */
export function conjuntoDeLaLectura(corrida, memoriaNotas = []) {
  const generado = Date.parse(corrida.generado);
  const fuentes = new Map(TODAS_LAS_FUENTES.map((f) => [f.id, f]));
  const vistas = new Set();
  const todas = [];
  for (const c of corrida.crudas ?? []) {
    if (c.x || c.v) continue;
    const f = fuentes.get(c.f);
    if (!f || f.activa === false) continue;
    const k = `${c.m}|${normalizar(c.t).replace(/\s+/g, '')}`;
    const e = enlaceNormalizado(c.e);
    if (vistas.has(k) || (e && vistas.has(e))) continue;
    vistas.add(k); if (e) vistas.add(e);
    const fecha = c.d ? new Date(c.d) : new Date(generado);
    // Lo raspado de más de 72 horas no entra (como ingestar).
    if (f.tipo === 'scrape' && c.d && generado - fecha.getTime() > 72 * HORA) continue;
    const n = {
      titulo: c.t, cuerpo: c.r ?? '', enlace: c.e, fecha, fechaEstimada: !c.d, medio: c.m, fuenteId: c.f,
      alcance: f.alcance, oficial: !!f.oficial, peso: f.peso ?? 10, categorias: [],
    };
    if (f.alcance !== 'local') marcarDeAfuera(n);
    todas.push(n);
  }
  const enEsta = new Set(todas.flatMap((n) => [n.enlace, enlaceNormalizado(n.enlace)]).filter(Boolean));
  const deAntes = memoriaNotas
    .filter((n) => Date.parse(n.fecha) >= generado - CRUCE.horasDeMemoria * HORA)
    .filter((m) => !enEsta.has(m.enlace) && !enEsta.has(enlaceNormalizado(m.enlace)))
    .map(desdeLaMemoria);
  deAntes.forEach(marcarDeAfuera);
  return { conjunto: [...todas, ...deAntes], deLaMemoria: deAntes.length, generado };
}

const palabras = (s) => new Set(normalizar(s).split(/\s+/).filter((w) => w.length > 3));
/** El parecido de dos títulos que usa el informe del día (lo «lejano» es menos de 0,08). */
export function parecido(a, b) {
  const A = palabras(a); const B = palabras(b);
  if (!A.size || !B.size) return 0;
  let c = 0;
  for (const w of A) if (B.has(w)) c += 1;
  return c / (A.size + B.size - c);
}

const idDeNota = (n) => idDe(n.enlaceFeed ?? n.enlace);
const horasDe = (g) => {
  const t = [g.principal, ...g.tambien].filter((n) => !n.fechaEstimada).map((n) => n.fecha.getTime());
  return t.length ? (Math.max(...t) - Math.min(...t)) / HORA : 0;
};
const BALDES = [['2', 2, 2], ['3 a 5', 3, 5], ['6 a 10', 6, 10], ['11 a 25', 11, 25], ['26 a 50', 26, 50], ['51 a 100', 51, 100], ['más de 100', 101, Infinity]];

/** Corre el cruce con y sin coherencia sobre el mismo conjunto y compara. */
export function medir({ corrida, memoria, idsConocidos = new Set(), idsUnidos = new Set(), parametros } = {}) {
  const correr = (coherente) => {
    const { conjunto } = conjuntoDeLaLectura(corrida, memoria);
    const t0 = Date.now();
    const r = armarHistorias(conjunto, { idsConocidos, idsUnidos, coherente, parametros });
    return { ...r, conjunto, ms: Date.now() - t0 };
  };
  const antes = correr(false);
  const despues = correr(true);
  const resumen = (r) => {
    const historias = r.grupos.map((g) => {
      const notas = [g.principal, ...g.tambien];
      return {
        id: idDeNota(g.principal), titulo: g.principal.titulo, fecha: g.principal.fecha.toISOString(), notas: notas.length,
        cuerpo: String(g.principal.cuerpo ?? '').slice(0, 300), aca: g.principal.alcance === 'local' || !!g.principal.deLaZona,
        // ¿Llega a los medios que pide su sección? (lo de acá no se mide por medios: siempre sí)
        alcanza: g.principal.alcance === 'local' || !!g.principal.nombraBalcarce || !!g.principal.deLaZona
          || contarMedios(g.medios) >= mediosMinimosDe(clasificar(g.principal), g.principal),
        medios: contarMedios(g.medios), horas: horasDe(g), enlaces: notas.map((n) => n.enlace),
        lejanas: notas.filter((n) => parecido(n.titulo, g.principal.titulo) < 0.08).length,
        ids: notas.map(idDeNota), titulos: notas.map((n) => ({ t: n.titulo, m: n.medio, f: n.fechaEstimada ? null : n.fecha.toISOString() })),
      };
    });
    const varios = historias.filter((h) => h.medios >= 2);
    const baldes = Object.fromEntries(BALDES.map(([k, a, b]) => [k, varios.filter((h) => h.notas >= a && h.notas <= b).length]));
    const mayor = [...historias].sort((a, b) => b.notas - a.notas)[0];
    return {
      historias, ms: r.ms, total: historias.length, varios: varios.length, baldes,
      masDe24: varios.filter((h) => h.horas > 24).length, masDe36: varios.filter((h) => h.horas > 36).length, masDe25Notas: varios.filter((h) => h.notas > 25).length,
      mayor: mayor ? { titulo: mayor.titulo, notas: mayor.notas, lejanas: mayor.lejanas } : null,
      lejanasEnGrandes: historias.filter((h) => h.notas >= 8).reduce((s, h) => s + h.lejanas, 0),
      notasEnGrandes: historias.filter((h) => h.notas >= 8).reduce((s, h) => s + h.notas, 0),
      alcanzan: historias.filter((h) => h.alcanza).length,
      revisados: r.revisados, partidos: r.partidos, unSoloMedio: r.deUnSoloMedio, otraCiudad: r.deOtraCiudad,
    };
  };
  const A = resumen(antes);
  const D = resumen(despues);

  // Cada nota del conjunto, en un solo grupo (los dos cruces arman una partición: nada se pierde ni se repite).
  const particion = (r) => {
    const visto = new Map();
    r.grupos.forEach((g, k) => [g.principal, ...g.tambien].forEach((n) => visto.set(n, (visto.get(n) ?? 0) + 1 + k * 0)));
    return { repetidas: [...visto.values()].filter((v) => v > 1).length, enGrupos: visto.size };
  };
  // Lo publicado: qué historias tienen la dirección de una nota ya publicada, antes y después.
  const idsA = new Map(A.historias.map((h) => [h.id, h]));
  const idsD = new Map(D.historias.map((h) => [h.id, h]));
  const repetidosD = D.historias.length - idsD.size;
  const publicadasA = A.historias.filter((h) => idsConocidos.has(h.id));
  const publicadasD = D.historias.filter((h) => idsConocidos.has(h.id));
  const pierden = publicadasA.filter((h) => !idsD.has(h.id));
  // Las publicadas que conservan su dirección pero se quedan con menos notas (las otras se fueron a otro grupo).
  const dejanDeAlcanzar = publicadasA.filter((h) => h.alcanza && idsD.has(h.id) && !idsD.get(h.id).alcanza).map((h) => ({ id: h.id, titulo: h.titulo }));
  const achicadas = publicadasA.filter((h) => idsD.has(h.id) && idsD.get(h.id).notas < h.notas)
    .map((h) => ({ id: h.id, titulo: h.titulo, antes: h.notas, despues: idsD.get(h.id).notas, mediosAntes: h.medios, mediosDespues: idsD.get(h.id).medios }));
  // Las publicadas que antes estaban tapadas por otra principal y ahora vuelven a ser su propia historia (su dirección de siempre).
  const vuelven = publicadasD.filter((h) => !idsA.has(h.id)).map((h) => ({ id: h.id, titulo: h.titulo, notas: h.notas, medios: h.medios }));
  // Las publicadas que cambian de grupo: notas de una historia publicada que después quedan en una historia con otra dirección.
  let notasPublicadasQueSeMudan = 0;
  const historiaDeEnlaceD = new Map();
  for (const h of D.historias) for (const e of h.enlaces) historiaDeEnlaceD.set(e, h.id);
  for (const h of publicadasA) for (const e of h.enlaces) if (historiaDeEnlaceD.get(e) !== h.id) notasPublicadasQueSeMudan += 1;
  // Historias de dos medios o más que antes no estaban (nacen de partir un grupo).
  const nuevasVarios = D.historias.filter((h) => h.medios >= 2 && !idsA.has(h.id));
  // Las nuevas que vienen de partir una historia publicada (riesgo de repetida si la historia publicada era el mismo hecho).
  const deUnaPublicada = nuevasVarios.filter((h) => publicadasA.some((p) => p.enlaces.some((e) => h.enlaces.includes(e))));
  // Las que se pueden estrenar (el hecho tiene menos de PORTADA.horasParaEstrenar): las otras llegan tarde y no salen solas.
  const generado = Date.parse(corrida.generado);
  const estrenables = nuevasVarios.filter((h) => generado - Date.parse(h.fecha) <= PORTADA.horasParaEstrenar * HORA);
  // De las que salen de partir una publicada, las que la barrera de repetidas sin IA (regla 171) uniría igual a la publicada.
  const comoNota = (h) => ({ id: h.id, titulo: h.titulo, copete: h.cuerpo, fecha: h.fecha, local: h.aca });
  for (const h of deUnaPublicada) {
    const madre = publicadasA.find((p) => p.enlaces.some((e) => h.enlaces.includes(e)));
    h.madre = madre.titulo;
    h.laBarreraLaUne = compararNotas(comoNota(madre), comoNota(h)).misma;
  }
  // Los «hermanos»: pedazos de 2+ medios que salen del mismo grupo de antes. Si cuentan el mismo hecho, la barrera de
  // repetidas sin IA (regla 171) o la de la IA tienen que unirlos después; acá se cuenta cuántos uniría la de sin IA.
  const deAntesPorEnlace = new Map();
  for (const h of A.historias) for (const e of h.enlaces) deAntesPorEnlace.set(e, h.id);
  const porMadre = new Map();
  for (const h of D.historias.filter((x) => x.medios >= 2)) {
    const madre = deAntesPorEnlace.get(h.enlaces[0]);
    if (madre) (porMadre.get(madre) ?? porMadre.set(madre, []).get(madre)).push(h);
  }
  const hermanos = [];
  for (const lista of porMadre.values()) {
    for (let a = 0; a < lista.length; a += 1) {
      for (let b = a + 1; b < lista.length; b += 1) {
        const [x, y] = [lista[a], lista[b]];
        const c = compararNotas(comoNota(x), comoNota(y));
        const ambasEstrenables = estrenables.includes(x) && estrenables.includes(y);
        hermanos.push({ a: x.titulo, b: y.titulo, misma: c.misma, ambasEstrenables });
      }
    }
  }
  return {
    hermanos: {
      pares: hermanos.length, laBarreraUne: hermanos.filter((h) => h.misma).length,
      ambasEstrenables: hermanos.filter((h) => h.ambasEstrenables).length,
      ambasEstrenablesSinUnir: hermanos.filter((h) => h.ambasEstrenables && !h.misma),
    },
    antes: A, despues: D,
    particionAntes: particion(antes), particionDespues: particion(despues), conjunto: antes.conjunto.length,
    publicadas: {
      conocidas: idsConocidos.size, antes: publicadasA.length, despues: publicadasD.length, pierden: pierden.map((h) => ({ id: h.id, titulo: h.titulo })),
      achicadas, vuelven, dejanDeAlcanzar, notasPublicadasQueSeMudan, repetidosDespues: repetidosD,
    },
    nuevasVarios: nuevasVarios.map((h) => ({ id: h.id, titulo: h.titulo, notas: h.notas, medios: h.medios, horas: +h.horas.toFixed(1) })),
    nuevasDeUnaPublicada: deUnaPublicada.map((h) => ({
      id: h.id, titulo: h.titulo, notas: h.notas, medios: h.medios, madre: h.madre, laBarreraLaUne: h.laBarreraLaUne, estrenable: estrenables.includes(h),
    })),
    estrenables: estrenables.length,
  };
}

function lectorDeDatos(ref) {
  return (ruta, porDefecto) => {
    try {
      if (ref && ref !== 'disco') return JSON.parse(execFileSync('git', ['show', `${ref}:${ruta}`], { cwd: RAIZ, maxBuffer: 1 << 28 }).toString('utf8'));
      return JSON.parse(fs.readFileSync(path.join(RAIZ, ruta), 'utf8'));
    } catch { return porDefecto; }
  };
}

function principal() {
  const cache = path.join(RAIZ, '.cache');
  const rutaIngesta = arg('ingesta') ? path.resolve(arg('ingesta'))
    : fs.readdirSync(cache).filter((f) => /^informe-del-dia-\d+\.json$/.test(f)).sort().map((f) => path.join(cache, f)).at(-1);
  if (!rutaIngesta) { console.error('No hay lecturas guardadas: correr antes scripts/medir/informe-del-dia.mjs'); process.exit(1); }
  const rutaMemoria = arg('memoria') ? path.resolve(arg('memoria')) : MEMORIA_DEL_CRUCE;
  const corrida = JSON.parse(fs.readFileSync(rutaIngesta, 'utf8'));
  const memoria = fs.existsSync(rutaMemoria) ? JSON.parse(fs.readFileSync(rutaMemoria, 'utf8')).notas ?? [] : [];
  const leer = lectorDeDatos(arg('ref') ?? 'origin/main');
  const portada = leer('web/data/portada.json', { notas: [] });
  const archivo = leer('web/data/archivo.json', { notas: [] });
  const fusionadas = leer('web/data/fusionadas.json', { notas: {} });
  const idsConocidos = new Set([...(portada.notas ?? []), ...(archivo.notas ?? [])].map((n) => n.id));
  const parametros = {};
  if (arg('horas')) parametros.horasDeUnHecho = Number(arg('horas'));
  if (arg('promedio')) parametros.promedioMinimo = Number(arg('promedio'));
  if (arg('resto')) parametros.restoMinimo = Number(arg('resto'));
  if (arg('max')) parametros.maxNotas = Number(arg('max'));
  const r = medir({ corrida, memoria, idsConocidos, idsUnidos: new Set(Object.keys(fusionadas.notas ?? {})), parametros });
  const fila = (k, a, d) => console.log(`  ${k.padEnd(52)} ${String(a).padStart(8)} ${String(d).padStart(8)}`);
  console.log(`\nCruce coherente: ${path.relative(RAIZ, rutaIngesta)} · ${r.conjunto} notas al cruce · ${idsConocidos.size} publicadas conocidas`);
  console.log(`  parámetros: ${JSON.stringify({ ...CRUCE.coherente, ...parametros })}\n`);
  console.log(`  ${''.padEnd(52)} ${'antes'.padStart(8)} ${'después'.padStart(8)}`);
  fila('historias (entran al resto del filtro)', r.antes.total, r.despues.total);
  fila('historias de 2 medios o más (dueños juntos)', r.antes.varios, r.despues.varios);
  for (const [k] of BALDES) fila(`  con ${k} notas`, r.antes.baldes[k], r.despues.baldes[k]);
  fila('de 2+ medios con más de 24 h entre la 1.ª y la última', r.antes.masDe24, r.despues.masDe24);
  fila('de 2+ medios con más de 36 h', r.antes.masDe36, r.despues.masDe36);
  fila('de 2+ medios con más de 25 notas', r.antes.masDe25Notas, r.despues.masDe25Notas);
  fila('la más grande (notas)', r.antes.mayor?.notas, r.despues.mayor?.notas);
  fila('  …de ellas, sin nada que ver con el título', r.antes.mayor?.lejanas, r.despues.mayor?.lejanas);
  fila('notas sin nada que ver, en historias de 8+ notas', `${r.antes.lejanasEnGrandes}/${r.antes.notasEnGrandes}`, `${r.despues.lejanasEnGrandes}/${r.despues.notasEnGrandes}`);
  fila('grupos encadenados revisados / partidos', '-', `${r.despues.revisados}/${r.despues.partidos}`);
  fila('llegan a los medios que pide su sección (o son de acá)', r.antes.alcanzan, r.despues.alcanzan);
  fila('de afuera con un solo medio (no entran)', r.antes.unSoloMedio, r.despues.unSoloMedio);
  fila('notas repetidas en dos grupos (debe ser 0)', r.particionAntes.repetidas, r.particionDespues.repetidas);
  fila('direcciones repetidas en dos historias (debe ser 0)', '-', r.publicadas.repetidosDespues);
  fila('historias con dirección ya publicada', r.publicadas.antes, r.publicadas.despues);
  fila('  publicadas que pierden su dirección (debe ser 0)', '-', r.publicadas.pierden.length);
  fila('  publicadas que quedan con menos notas', '-', r.publicadas.achicadas.length);
  fila('  publicadas que dejan de llegar a los medios de su sección', '-', r.publicadas.dejanDeAlcanzar.length);
  fila('  notas de historias publicadas que se mudan de grupo', '-', r.publicadas.notasPublicadasQueSeMudan);
  fila('  publicadas tapadas que vuelven con su dirección', '-', r.publicadas.vuelven.length);
  fila('historias nuevas de 2+ medios', '-', r.nuevasVarios.length);
  fila('  …con el hecho de menos de 12 h (las demás llegan tarde)', '-', r.estrenables);
  fila('  …que salen de partir una publicada', '-', r.nuevasDeUnaPublicada.length);
  fila('    …y se podrían estrenar', '-', r.nuevasDeUnaPublicada.filter((h) => h.estrenable).length);
  fila('    …y la barrera de repetidas igual uniría a la publicada', '-', r.nuevasDeUnaPublicada.filter((h) => h.laBarreraLaUne).length);
  fila('pares de pedazos hermanos de 2+ medios', '-', r.hermanos.pares);
  fila('  …que la barrera de repetidas sin IA uniría', '-', r.hermanos.laBarreraUne);
  fila('  …los dos con el hecho de menos de 12 h', '-', r.hermanos.ambasEstrenables);
  fila('milisegundos del cruce', r.antes.ms, r.despues.ms);
  if (r.publicadas.pierden.length) console.log('\n  PIERDEN SU DIRECCIÓN:', r.publicadas.pierden);
  if (process.argv.includes('--ejemplos')) {
    console.log('\nLas publicadas que se achican:');
    for (const a of r.publicadas.achicadas.slice(0, 15)) console.log(`  ${a.antes}→${a.despues} notas (${a.mediosAntes}→${a.mediosDespues} medios) · ${a.titulo.slice(0, 90)}`);
    console.log('\nHistorias nuevas de 2+ medios (las más grandes):');
    for (const h of [...r.nuevasVarios].sort((a, b) => b.notas - a.notas).slice(0, 25)) console.log(`  ${String(h.notas).padStart(3)} notas, ${h.medios} medios, ${h.horas} h · ${h.titulo.slice(0, 95)}`);
    console.log('\nNuevas que salen de partir una publicada y se podrían estrenar:');
    for (const h of r.nuevasDeUnaPublicada.filter((x) => x.estrenable)) {
      console.log(`  ${h.laBarreraLaUne ? '[la barrera la une] ' : ''}${h.notas} notas, ${h.medios} medios · ${h.titulo.slice(0, 80)}\n      ← publicada: ${h.madre.slice(0, 80)}`);
    }
    console.log('\nPedazos hermanos que se podrían estrenar los dos y la barrera sin IA no une (los mira la IA de repetidas):');
    for (const h of r.hermanos.ambasEstrenablesSinUnir) console.log(`  ${h.a.slice(0, 70)}\n    ${h.b.slice(0, 70)}`);
    console.log('\nLas historias más grandes, después:');
    for (const h of [...r.despues.historias].sort((a, b) => b.notas - a.notas).slice(0, 12)) console.log(`  ${String(h.notas).padStart(3)} notas, ${h.medios} medios, ${h.horas.toFixed(1)} h, ${h.lejanas} lejanas · ${h.titulo.slice(0, 90)}`);
  }
  if (arg('json')) fs.writeFileSync(path.resolve(arg('json')), JSON.stringify(r, null, 1), 'utf8');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) principal();
