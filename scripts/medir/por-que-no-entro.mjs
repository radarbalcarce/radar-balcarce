// Repetición sin red de «por qué no entró» (informe docs/auditoria-2-0/N-POR-QUE-NO-ENTRO.md, 24/10/2026; arreglos en
// docs/etapa-10-operacion/POR-QUE-NO-ENTRO-ARREGLOS.md, regla 314).
//
// Corre el cruce, el semáforo y la popularidad con el código de hoy sobre la memoria del cruce guardada (.cache/cruce-memoria.json)
// y dice, de las historias de 8 medios o más y de las de Balcarce, cuántas ya estaban publicadas, cuántas estaban frenadas por el
// semáforo y cuántas quedarían «tarde» según de dónde se tome la fecha del hecho: la de la fuente más vieja (`vieja`, como hasta el
// 24/10), la mediana de las fuentes (`mediana`, regla 314) o la tercera más nueva (`tercera`, sólo para comparar). Además cuenta cuántas
// historias se leerían con IA y en qué orden (S6) y el motivo de cada una con la fecha de antes y la de ahora (S8). No llama a ninguna
// IA, no lee feeds y no escribe nada en web/data.
//
//   node scripts/medir/por-que-no-entro.mjs                            memoria de ../../.cache, publicadas de lo que hay en disco
//   node scripts/medir/por-que-no-entro.mjs --memoria=RUTA --ahora=2026-10-23T20:17:00Z
//   node scripts/medir/por-que-no-entro.mjs --ref=948ac394             lo publicado (archivo + portada + vistas) de esa versión de git
//   node scripts/medir/por-que-no-entro.mjs --ejemplos                 además, las historias que cambian, una por renglón
//   node scripts/medir/por-que-no-entro.mjs --json=salida.json
//
// Límites: la memoria es la de una PC (no la de producción) y no trae la lectura con IA (fichas, repetidas): el semáforo es el de la
// ingesta. Sirve para comparar dos reglas con los mismos datos, no para contar lo que sale en producción.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  TODAS_LAS_FUENTES, armarHistorias, armarPortada, aplicarPopularidad, contarMedios, esDeAca, esDeUnMedioDeAca, paraPruebas, MOTIVO_POCO_CONTADA,
} from '../../ingesta/ingesta.mjs';
import { leerMemoria, desdeLaMemoria } from '../../ingesta/cruce.mjs';
import { ordenParaLeer, llegaPorCantidad, MOTIVO_ESPERA_LECTURA } from '../../ingesta/lectura-ia.mjs';
import { observarCorrida } from '../../ingesta/estadistica-seleccion.mjs';
import { popularidadDe } from '../../ingesta/popularidad.mjs';
import { MUY_CONTADA } from '../../ingesta/criterio.mjs';
import { enlaceNormalizado } from '../../ingesta/repetidas-publicadas.mjs';
import { fechaDeLaNota, horasParaEstrenar, llegaTarde, HORAS_DE_UN_HECHO } from '../../web/lib/archivo.js';

const { idDe, marcarDeAfuera } = paraPruebas;
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..', '..');
const HORA = 3600e3;
const arg = (nombre) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3) ?? null;
const hay = (nombre) => process.argv.includes(`--${nombre}`);

/** La memoria del cruce más a mano: la de este árbol, y si no, la del repositorio principal (los árboles de trabajo no la tienen). */
function buscarMemoria() {
  const candidatas = [arg('memoria'), path.join(RAIZ, '.cache', 'cruce-memoria.json'), path.join(RAIZ, '..', '..', '..', '.cache', 'cruce-memoria.json')].filter(Boolean);
  return candidatas.find((c) => fs.existsSync(c)) ?? null;
}

function deGit(ref, archivo) {
  try { return execFileSync('git', ['show', `${ref}:${archivo}`], { cwd: RAIZ, maxBuffer: 1 << 29 }).toString('utf8'); } catch { return null; }
}
function deDisco(archivo) {
  try { return fs.readFileSync(path.join(RAIZ, archivo), 'utf8'); } catch { return null; }
}

/** Las fechas del hecho que se comparan, en milisegundos: la más vieja (como hasta el 24/10), la mediana de las fuentes (regla 314; con «forzar», también para lo que la regla no toca, sólo para ver qué pasaría), la tercera más nueva y la más nueva. */
export function fechasDelHecho(nota, visto, { medios = 0, forzar = false } = {}) {
  const t = (f) => (f ? new Date(f).getTime() : NaN);
  const vieja = t(fechaDeLaNota(nota, { visto, modo: 'vieja' }));
  if (!Number.isFinite(vieja)) return null;
  const mediana = t(fechaDeLaNota(nota, { visto, medios, deAca: forzar, modo: 'mediana' }));
  const fuentes = (nota?.origenes?.length ? nota.origenes.map((o) => t(o?.fecha)) : [t(nota?.fecha)]).filter(Number.isFinite).sort((a, b) => a - b);
  const vista = t(visto);
  const cercanas = Number.isFinite(vista) ? fuentes.filter((x) => x >= vista - HORAS_DE_UN_HECHO * HORA) : fuentes;
  const cuentan = cercanas.length ? cercanas : fuentes;
  return { vieja, mediana, tercera: cuentan[Math.max(0, cuentan.length - 3)] ?? vieja, nueva: cuentan.at(-1) ?? vieja, fuentes: cuentan.length };
}

const corrida = () => {
  const archivoMemoria = buscarMemoria();
  if (!archivoMemoria) { console.error('No encuentro .cache/cruce-memoria.json (--memoria=RUTA).'); process.exit(1); }
  const ahora = Date.parse(arg('ahora') ?? fs.statSync(archivoMemoria).mtime.toISOString());
  const ref = arg('ref');
  const leer = (a) => (ref ? deGit(ref, a) : deDisco(a));
  const publicadasIds = new Set();
  const enlacesPublicados = new Set();
  for (const a of ['web/data/archivo.json', 'web/data/portada.json']) {
    try {
      for (const n of JSON.parse(leer(a) ?? '{}').notas ?? []) {
        publicadasIds.add(n.id);
        for (const e of [n.enlace, ...(n.fuentesConsultadas ?? []).map((x) => x?.enlace)]) if (e) enlacesPublicados.add(enlaceNormalizado(e));
      }
    } catch { /* sin ese archivo */ }
  }
  let vistas = {};
  try { vistas = JSON.parse(leer('web/data/vistas.json') ?? '{}'); } catch { /* sin vistas */ }

  const memoria = leerMemoria(archivoMemoria, { ahora });
  const conjunto = memoria.map(desdeLaMemoria);
  conjunto.filter((n) => n.alcance !== 'local').forEach(marcarDeAfuera);
  const { grupos } = armarHistorias(conjunto, { idsConocidos: publicadasIds });
  const { portada } = armarPortada(grupos);
  aplicarPopularidad(portada, { ahora, publicadas: publicadasIds });

  const filas = portada.map((n) => {
    const medios = contarMedios(n.medios);
    const deAca = esDeAca(n);
    const visto = vistas[n.id] ?? new Date(ahora).toISOString();
    const fechas = fechasDelHecho(n, visto, { medios, forzar: true });
    const aplica314 = deAca || medios >= MUY_CONTADA.medios;
    const horas = horasParaEstrenar(medios, deAca);
    const enSitio = [n.id, ...(n.origenes ?? []).map((o) => idDe(o.enlaceFeed ?? o.enlace ?? ''))].some((id) => publicadasIds.has(id))
      || (n.origenes ?? []).some((o) => o.enlace && enlacesPublicados.has(enlaceNormalizado(o.enlace)));
    const tarde = (ms) => (ms == null ? false : llegaTarde(new Date(ms).toISOString(), ahora, horas));
    return {
      id: n.id, titulo: n.titulo, seccion: n.seccion, medios, deAca: deAca || esDeUnMedioDeAca(n) || n.alcance === 'local', muy: medios >= MUY_CONTADA.medios,
      semaforo: n.semaforo, motivo: n.motivo, enSitio, horas,
      edades: fechas ? Object.fromEntries(['vieja', 'mediana', 'tercera', 'nueva'].map((k) => [k, Math.round(((ahora - fechas[k]) / HORA) * 10) / 10])) : null,
      tarde: { vieja: tarde(fechas?.vieja), mediana: tarde(fechas?.mediana), tercera: tarde(fechas?.tercera), regla314: tarde(aplica314 ? fechas?.mediana : fechas?.vieja) },
      referencia: fechaDeLaNota(n, { visto }),
    };
  });
  // Regla 314 (S6): qué se leería con IA y en qué orden.
  const { paraLeer, sinLeer } = ordenParaLeer(portada);
  const lectura = { historias: portada.length, sinLeer: sinLeer.length, llegan: paraLeer.filter(llegaPorCantidad).length, soloConOtraSeccion: paraLeer.filter((n) => !llegaPorCantidad(n)).length };
  // Regla 314 (S8): el motivo de cada historia con la fecha del hecho de antes (la fuente más vieja) y con la de ahora (la mediana en lo muy contado y lo de acá).
  const motivosCon = (cual) => {
    const obs = observarCorrida({
      delCruce: portada.map((n, i) => ({ id: n.id, titulo: n.titulo, seccion: n.seccion, medios: filas[i].medios, deAca: filas[i].deAca, oficial: !!n.oficial })),
      finales: portada.map((n, i) => ({ id: n.id, seccion: n.seccion, semaforo: n.semaforo, motivo: n.motivo, medios: filas[i].medios, descartada: !!n.descartada })),
      publicadas: new Set(filas.filter((f) => f.enSitio).map((f) => f.id)),
      tarde: new Set(filas.filter((f) => !f.enSitio && f.tarde[cual]).map((f) => f.id)),
      llegaPorCantidad: (h) => popularidadDe({ seccion: h.seccion, titulo: h.titulo }, h.medios).llega,
      motivos: { pocoContada: MOTIVO_POCO_CONTADA, esperaLectura: MOTIVO_ESPERA_LECTURA },
      ahora: new Date(ahora),
    });
    const cuenta = {};
    for (const o of obs) cuenta[o.motivo] = (cuenta[o.motivo] ?? 0) + 1;
    return Object.fromEntries(Object.entries(cuenta).sort((a, b) => b[1] - a[1]));
  };
  const motivos = { antes: motivosCon('vieja'), despues: motivosCon('regla314') };
  return { filas, lectura, motivos, ahora, archivoMemoria, ref, notasDeLaMemoria: memoria.length, historias: portada.length };
};

function resumen(filas, filtro) {
  const g = filas.filter(filtro);
  const noSitio = g.filter((f) => !f.enSitio);
  const verdesSinSalir = noSitio.filter((f) => f.semaforo === 'verde');
  const cuenta = (lista, k) => lista.filter((f) => f.tarde[k]).length;
  return {
    historias: g.length, enElSitio: g.filter((f) => f.enSitio).length, sinSalir: noSitio.length,
    amarillas: noSitio.filter((f) => f.semaforo === 'amarillo').length, rojas: noSitio.filter((f) => f.semaforo === 'rojo').length,
    verdesSinSalir: verdesSinSalir.length,
    tardeVieja: cuenta(verdesSinSalir, 'vieja'), tardeMediana: cuenta(verdesSinSalir, 'mediana'), tardeTercera: cuenta(verdesSinSalir, 'tercera'),
    saldrianConMediana: verdesSinSalir.filter((f) => f.tarde.vieja && !f.tarde.mediana).length,
    saldrianConTercera: verdesSinSalir.filter((f) => f.tarde.vieja && !f.tarde.tercera).length,
    // Con la regla 314 tal cual (mediana sólo para lo muy contado y lo de acá; el resto, la más vieja).
    tardeConLaRegla: cuenta(verdesSinSalir, 'regla314'),
    saldrianConLaRegla: verdesSinSalir.filter((f) => f.tarde.vieja && !f.tarde.regla314).length,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { filas, lectura, motivos, ahora, archivoMemoria, ref, notasDeLaMemoria, historias } = corrida();
  const grupos = {
    'ocho medios o más': (f) => f.muy,
    'de Balcarce': (f) => f.deAca,
    'de Balcarce o de ocho medios o más': (f) => f.deAca || f.muy,
    'el resto (nacional, áreas chicas)': (f) => !f.deAca && !f.muy,
  };
  const salida = { ahora: new Date(ahora).toISOString(), memoria: archivoMemoria, ref, notasDeLaMemoria, historias, lectura, grupos: {} };
  console.log(`Memoria: ${archivoMemoria} (${notasDeLaMemoria} notas) · ahora: ${salida.ahora}${ref ? ` · publicadas de ${ref}` : ''} · ${historias} historias`);
  for (const [nombre, filtro] of Object.entries(grupos)) {
    const r = resumen(filas, filtro);
    salida.grupos[nombre] = r;
    console.log(`\n${nombre}: ${r.historias} historias · ${r.enElSitio} ya en el sitio · ${r.sinSalir} sin salir (${r.verdesSinSalir} verdes, ${r.amarillas} amarillas, ${r.rojas} rojas)`);
    console.log(`  de las verdes sin salir, «tarde» con la fecha: más vieja ${r.tardeVieja} · mediana ${r.tardeMediana} · tercera más nueva ${r.tardeTercera}`);
    console.log(`  saldrían de más: con la mediana ${r.saldrianConMediana} · con la tercera ${r.saldrianConTercera} · con la regla 314 (mediana sólo en lo muy contado y lo de acá) ${r.saldrianConLaRegla}`);
  }
  console.log(`\nLectura con IA (regla 314, S6): de ${lectura.historias} historias, ${lectura.llegan} ya llegan a los medios que pide su sección (se leen primero), ${lectura.soloConOtraSeccion} sólo podrían salir con otra sección o juntándose con otra (se leen al final) y ${lectura.sinLeer} no pueden salir (no se leen)`);
  const fila = (cuenta) => Object.entries(cuenta).map(([m, n]) => `${m} ${n}`).join(' · ');
  console.log(`\nMotivo de cada historia (regla 314, S8; la suma es ${historias}):\n  con la fecha de antes:   ${fila(motivos.antes)}\n  con la fecha de ahora:   ${fila(motivos.despues)}`);
  salida.motivos = motivos;
  if (hay('ejemplos')) {
    console.log('\nLas que cambian con la mediana (verdes, sin salir, tarde con la más vieja):');
    for (const f of filas.filter((x) => (x.muy || x.deAca) && !x.enSitio && x.semaforo === 'verde' && x.tarde.vieja && !x.tarde.mediana).slice(0, 60)) {
      console.log(`  ${f.muy ? '8+' : '  '} ${f.deAca ? 'acá' : '   '} ${String(f.medios).padStart(2)} medios · vieja ${f.edades.vieja} h · mediana ${f.edades.mediana} h · nueva ${f.edades.nueva} h · ventana ${f.horas} h · ${f.titulo.slice(0, 90)}`);
    }
  }
  const json = arg('json');
  if (json) fs.writeFileSync(json, JSON.stringify({ ...salida, filas }, null, 1));
}
