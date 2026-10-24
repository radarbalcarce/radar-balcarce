// La página de revisión de fuentes (scripts/medir/generar-revision.mjs): se arma en memoria con los
// datos reales del repositorio y tiene que mostrar cada fuente activa del registro, un solo archivo y sin red.
// Desde el 15/10 tiene dos secciones nuevas: "Balcarce a fondo" (arriba, con lo investigado en
// scripts/medir/balcarce-fondo.mjs) y "Descartadas" (plegada, al final, con el motivo de cada una).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { FUENTES, FUENTES_NACIONALES } from '../ingesta/fuentes.mjs';
import { FUENTES_CRUCE } from '../ingesta/fuentes-cruce.mjs';
import { armarDatos, generarHTML, generarMarkdownBalcarce, leerCSV, esc, sugerenciaDe, dudasDe, descarteDe, DESCARTADAS_POR_CLAUDE, leerCandidatas, PESTANAS } from '../scripts/medir/generar-revision.mjs';
import { VERIFICACION_LOCAL, OBJETIVO, CRITERIO_CORTA } from '../scripts/medir/afinar.mjs';
import os from 'node:os';
import { BALCARCE_FONDO, COMO, resumenFondo } from '../scripts/medir/balcarce-fondo.mjs';

const registro = [...FUENTES, ...FUENTES_NACIONALES, ...FUENTES_CRUCE];
const activas = registro.filter((f) => f.activa !== false);
const datos = armarDatos();
const html = generarHTML(datos);
const md = generarMarkdownBalcarce(datos);
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** La parte de la página que NO es la sección plegada de descartadas. */
const [principal, plegada = ''] = html.split('<details class="descartadas"');

test('cada fuente activa del registro aparece en la página: su medio, su dirección y su id (en la tabla o en Descartadas)', () => {
  assert.ok(activas.length >= 100, 'el registro tiene que traer sus fuentes activas');
  for (const f of activas) {
    assert.ok(html.includes(`data-feed="${esc(f.id)}"`), `falta la dirección ${f.id}`);
    assert.ok(html.includes(esc(f.medio ?? f.nombre)), `falta el medio ${f.medio ?? f.nombre}`);
  }
  const filasActivas = datos.medios.filter((m) => m.activo);
  assert.equal(filasActivas.length, new Set(activas.map((f) => f.medio ?? f.nombre)).size);
  assert.equal(datos.resumen.feedsActivos, activas.length);
});

test('también están las apagadas, y la lista elegida da 11 de Balcarce, 48 del país (eran 50) y 10 de Tandil y Mar del Plata', () => {
  for (const f of registro.filter((x) => x.activa === false)) assert.ok(html.includes(`data-feed="${esc(f.id)}"`), `falta la apagada ${f.id}`);
  const p = datos.resumen.porGrupoLista;
  assert.equal(p.balcarce, 11);
  // Eran 50: la regla 260 (17/10) apagó dos de la lista porque casi no publican (Agencia CyTA y el Ministerio de Capital Humano).
  assert.equal(p.pais, 48);
  assert.equal(p.zona, 10);
  // Los 11 medios que se sumaron el 17/10 (regla 215) no estaban en LISTA-ELEGIDA.md; la regla 260 apagó cuatro (ANMAT, CONAE, INTI y la
  // Secretaría de Innovación, Ciencia y Tecnología: casi no publican) y quedan 7 activos.
  assert.equal(p.sumadas, 7, 'los 7 medios de ciencia, salud, educación y tecnología que se sumaron el 17/10 y siguen activos');
  assert.equal(p.otras, 0, 'una activa quedó fuera de LISTA-ELEGIDA.md');
  // lo que queda en la pantalla principal más lo descartado de cada grupo es la lista entera
  const d = datos.medios.filter((m) => m.descartada && m.activo);
  assert.equal(datos.resumen.porGrupo.pais + d.filter((m) => m.grupo === 'pais').length, 48);
  assert.equal(datos.resumen.porGrupo.zona + d.filter((m) => m.grupo === 'zona').length, 10);
  assert.equal(datos.resumen.porGrupo.balcarce, 11);
});

test('es un solo archivo: sin scripts ni estilos de afuera, y el JavaScript de la página se puede leer', () => {
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+rel=["']?stylesheet/i);
  assert.doesNotMatch(html, /@import|url\(\s*https?:/i);
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.ok(script, 'falta el script en línea');
  assert.doesNotThrow(() => new vm.Script(script));
  assert.match(html, /prefers-color-scheme:\s*dark/);
  assert.match(html, /name="viewport"/);
  for (const id of ['q', 'f-grupo', 'f-decision', 'f-sug', 'f-tipo', 'f-origen', 'f-dudosas', 'copiar', 'descargar']) assert.ok(html.includes(`id="${id}"`), `falta #${id}`);
});

test('cada medio y cada candidata de Balcarce tienen los tres botones y un comentario', () => {
  const filas = html.split('<tr class="fila').slice(1);
  const nuevas = datos.filasFondo.filter((x) => !x.medio).length;
  assert.equal(filas.length, datos.medios.length + nuevas + datos.candidatas.length);
  for (const f of filas) {
    assert.match(f, /data-d="Sí"/);
    assert.match(f, /data-d="No"/);
    assert.match(f, /data-d="Duda"/);
    assert.match(f, /class="coment"/);
  }
});

test('los datos de la zona y del cruce salen de los registros y no se inventan', () => {
  const clarin = datos.medios.find((m) => m.nombre === 'Clarín');
  assert.equal(clarin.dueno, 'Grupo Clarín');
  assert.ok(clarin.hermanos.includes('Olé') && clarin.hermanos.includes('TN (Todo Noticias)'));
  assert.ok(clarin.dudas.some((d) => d.tipo === 'hermano'));
  const infobae = datos.medios.find((m) => m.nombre === 'Infobae');
  assert.ok(infobae.dudas.some((d) => d.tipo === 'cloudflare'), 'Infobae bloquea a Cloudflare (sondeo del 15/10)');
  assert.ok(datos.resumen.feedsCruce > 0 && datos.resumen.feedsCruce < datos.resumen.feedsActivos);
});

test('la sugerencia usa un criterio objetivo', () => {
  const base = { activo: true, grupo: 'pais', nuevo: false, hermanos: [], dueno: null, imprescindible: 0, pub30: 40, feeds: [{ activa: true, nivel: 'ok', estado: 'Anda', bloqueado: false }] };
  assert.equal(sugerenciaDe({ ...base }).accion, 'mantener');
  assert.equal(sugerenciaDe({ ...base, pub30: 0 }).accion, 'apagar');
  assert.equal(sugerenciaDe({ ...base, pub30: 1 }).accion, 'revisar');
  assert.equal(sugerenciaDe({ ...base, pub30: 1, imprescindible: 3 }).accion, 'mantener');
  assert.equal(sugerenciaDe({ ...base, pub30: 0, nuevo: true }).accion, 'mantener');
  assert.equal(sugerenciaDe({ ...base, pub30: 0, grupo: 'balcarce' }).accion, 'mantener', 'lo de Balcarce nunca se sugiere apagar por pocas notas');
  const caido = { ...base, feeds: [{ activa: true, nivel: 'mal', estado: 'No responde desde la PC (HTTP 404)', bloqueado: false }] };
  assert.equal(sugerenciaDe(caido).accion, 'apagar');
  assert.ok(dudasDe(caido).some((d) => d.tipo === 'caido'));
  assert.equal(sugerenciaDe({ ...base, activo: false, pub30: 0 }).accion, 'apagar');
  assert.equal(sugerenciaDe({ ...base, activo: false, pub30: 30 }).accion, 'revisar');
});

test('el lector de la planilla entiende comillas y comas', () => {
  const filas = leerCSV('﻿id,motivo,url\r\na,"uno, dos",http://x\r\nb,"dice ""hola""",http://y\r\n');
  assert.equal(filas.length, 2);
  assert.equal(filas[0].motivo, 'uno, dos');
  assert.equal(filas[1].motivo, 'dice "hola"');
});

// ------------------------------------------------------------ Descartadas (pedido de Hernán y Andrés, 15/10)

test('Descartadas: una sección plegada al final con todas las apagadas, las sugeridas "apagar" y las que Claude sacó, cada una con su motivo', () => {
  assert.match(html, /<details class="descartadas" id="descartadas"[^>]*>/, 'la sección tiene que existir');
  assert.doesNotMatch(html, /<details class="descartadas"[^>]*\bopen\b/, 'tiene que estar plegada');
  assert.match(plegada, /Descartadas \(por si querés rescatar alguna\)/);
  const desc = datos.medios.filter((m) => m.descartada);
  assert.equal(datos.resumen.descartadas.total, desc.length);
  // todas las apagadas
  for (const m of datos.medios.filter((x) => !x.activo)) assert.ok(m.descartada, `la apagada ${m.nombre} tiene que estar en Descartadas`);
  // las activas de afuera que el propio HTML sugiere apagar
  for (const m of datos.medios.filter((x) => x.activo && x.grupo !== 'balcarce' && x.sugerencia.accion === 'apagar')) assert.ok(m.descartada, `${m.nombre} se sugiere apagar`);
  // las que Claude sacó a mano (mismo dueño o sin aporte)
  for (const nombre of Object.keys(DESCARTADAS_POR_CLAUDE)) {
    const m = datos.medios.find((x) => x.nombre === nombre);
    assert.ok(m, `el medio ${nombre} de la lista de descartadas tiene que existir en el registro`);
    assert.ok(m.activo, `${nombre} se descarta a mano: tiene que ser un medio activo (si ya está apagado, se descarta solo)`);
    assert.ok(m.descartada && m.descartada.motivo.length > 30, `${nombre} tiene que traer su motivo`);
  }
  // cada una está en la parte plegada y NO en la tabla principal, y con motivo escrito
  for (const m of desc) {
    assert.ok(plegada.includes(`data-k="${esc(m.clave)}"`), `${m.nombre} tiene que estar dentro de Descartadas`);
    assert.ok(!principal.includes(`data-k="${esc(m.clave)}"`), `${m.nombre} no puede quedar en la tabla principal`);
    assert.ok(m.descartada.motivo, `${m.nombre} sin motivo`);
  }
  assert.match(plegada, /class="motivo-desc"/);
  // las que quedan en la pantalla principal no son descartadas
  for (const m of datos.medios.filter((x) => x.activo && !x.descartada)) assert.ok(principal.includes(`data-k="${esc(m.clave)}"`), `${m.nombre} falta en la tabla principal`);
});

test('Descartadas: nada de Balcarce se descarta solo, y los activos que se sacan son de afuera', () => {
  for (const m of datos.medios.filter((x) => x.grupo === 'balcarce')) assert.equal(m.descartada, null, `${m.nombre} es de Balcarce: nunca se descarta solo`);
  assert.equal(descarteDe({ grupo: 'balcarce', activo: true, sugerencia: { accion: 'apagar', texto: 'x' }, feeds: [], nombre: 'X' }), null);
  for (const m of datos.medios.filter((x) => x.activo && x.descartada)) assert.notEqual(m.grupo, 'balcarce');
  // Infobae anda desde la PC y aporta más que nadie: bloquea a Cloudflare pero no se descarta
  assert.equal(datos.medios.find((m) => m.nombre === 'Infobae').descartada, null);
});

test('Descartadas: el "Copiar mis decisiones" las separa y no cuentan en el progreso', () => {
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  assert.match(script, /fila-descartada/);
  assert.match(script, /Descartadas \(Rescatar/);
  assert.match(script, /Rescatar/);
  // las filas descartadas están marcadas para que el contador no las cuente
  assert.ok((plegada.match(/class="fila fila-descartada/g) ?? []).length === datos.resumen.descartadas.total);
  assert.equal((principal.match(/<tr class="fila fila-descartada/g) ?? []).length, 0);
});

// ------------------------------------------------------------ Balcarce a fondo

test('Balcarce a fondo: arriba de la tabla, con las 11 de hoy y las candidatas nuevas marcadas', () => {
  assert.match(html, /id="balcarce-a-fondo"/);
  const iFondo = html.indexOf('id="g-balcarce"');
  const iPais = html.indexOf('id="g-pais"');
  assert.ok(iFondo > 0 && iPais > iFondo, 'Balcarce a fondo tiene que ir antes que los nacionales');
  assert.match(html, /Balcarce a fondo/);
  assert.equal(datos.resumen.balcarceFondo.enUso, 11, 'las 11 fuentes de Balcarce de hoy');
  assert.ok(datos.resumen.balcarceFondo.nuevas >= 3, 'tiene que haber candidatas nuevas');
  assert.equal((html.match(/class="etq etq-nueva"[^>]*>nueva</g) ?? []).length, BALCARCE_FONDO.filter((f) => f.nueva).length);
  // cada una de las 11 del registro tiene su investigación pegada
  for (const m of datos.medios.filter((x) => x.grupo === 'balcarce')) assert.ok(m.fondo, `${m.nombre} no tiene su investigación en balcarce-fondo.mjs`);
});

test('Balcarce a fondo: cada fuente investigada trae lo que se pidió (dirección probada, cadencia, cómo leerla, peso)', () => {
  const ids = new Set();
  for (const f of BALCARCE_FONDO) {
    assert.ok(!ids.has(f.id), `id repetido ${f.id}`);
    ids.add(f.id);
    assert.ok(f.nombre && f.tipoEntidad, `${f.id}: nombre y tipo`);
    assert.ok(Object.keys(COMO).includes(f.como), `${f.id}: "como" tiene que ser uno de ${Object.keys(COMO)}`);
    assert.ok(['mantener', 'revisar', 'sumar', 'nosumar', 'apagar'].includes(f.accion), `${f.id}: acción`);
    assert.ok(['ok', 'aviso', 'mal', 'nada'].includes(f.nivel), `${f.id}: nivel`);
    assert.ok(f.urls.length >= 1 && f.urls.every((u) => u.url && u.rol && u.resultado), `${f.id}: sus direcciones con rol y resultado de la prueba`);
    for (const campo of ['probado', 'cadencia', 'contenido', 'comoLeerla']) assert.ok(String(f[campo] ?? '').length > 2, `${f.id}: falta ${campo}`);
    for (const campo of ['texto', 'foto']) assert.ok(String(f[campo] ?? '').length >= 1, `${f.id}: falta ${campo}`);
    assert.ok(f.peso && 'hoy' in f.peso && 'sugerido' in f.peso && f.peso.criterio, `${f.id}: peso`);
    // lo que se puede leer tiene una dirección real
    if (['feed', 'pagina'].includes(f.como)) assert.ok(f.urls.some((u) => /^https?:\/\//.test(u.url)), `${f.id}: una fuente que se lee tiene que traer su dirección`);
  }
  // los registros que dicen las fichas existen de verdad
  const registroIds = new Set(registro.map((f) => f.id));
  for (const f of BALCARCE_FONDO) for (const id of f.registroIds) assert.ok(registroIds.has(id), `${f.id}: ${id} no está en el registro`);
  // las 11 de Balcarce de hoy están todas cubiertas por alguna ficha
  const deHoy = FUENTES.filter((f) => f.alcance === 'local').map((f) => f.id);
  const cubiertas = new Set(BALCARCE_FONDO.flatMap((f) => f.registroIds));
  for (const id of deHoy) assert.ok(cubiertas.has(id), `${id} es de Balcarce y no tiene su ficha`);
});

test('Balcarce a fondo: las dos advertencias técnicas importantes quedaron escritas', () => {
  const acc = BALCARCE_FONDO.find((f) => f.id === 'accion5');
  assert.ok(acc.alertas.some((a) => /spam|apuestas/i.test(a)), 'Acción 5: el sitio tiene spam de apuestas');
  const muni = BALCARCE_FONDO.find((f) => f.id === 'municipio');
  assert.ok(muni.urls.some((u) => /508/.test(u.resultado)), 'Municipalidad: los feeds por área dan 508');
  // los datos de las candidatas nuevas que se pueden leer
  assert.equal(BALCARCE_FONDO.find((f) => f.id === 'sibom').como, 'pagina');
  assert.equal(BALCARCE_FONDO.find((f) => f.id === 'gabal-cultura').como, 'feed');
  assert.equal(BALCARCE_FONDO.find((f) => f.id === 'coop').como, 'pagina');
  assert.match(html, /Mar del Sud no es de Balcarce/);
});

test('el resumen de Balcarce a fondo suma lo que dice', () => {
  const r = resumenFondo();
  assert.equal(r.total, BALCARCE_FONDO.length);
  assert.equal(Object.values(r.porComo).reduce((a, b) => a + b, 0), BALCARCE_FONDO.length);
  assert.equal(datos.resumen.balcarceFondo.filas, BALCARCE_FONDO.length);
  assert.equal(Object.values(datos.resumen.balcarceFondo.porComo).reduce((a, b) => a + b, 0), BALCARCE_FONDO.length);
});

test('BALCARCE-INVESTIGACION.md: la tabla y una ficha por fuente, y está al día con los datos', () => {
  for (const f of BALCARCE_FONDO) {
    assert.ok(md.includes(f.nombre), `falta ${f.nombre} en el informe`);
    assert.ok(md.includes(`### ${f.orden}. ${f.nombre}`) || md.includes(f.nombre), `falta la ficha de ${f.nombre}`);
  }
  assert.match(md, /^\| # \| Fuente \| Qué es \| Cómo se lee \| Dirección \| Cada cuánto publica \| Sugerencia \|/m);
  assert.equal((md.match(/^### \d+\. /gm) ?? []).length, BALCARCE_FONDO.length);
  assert.match(md, /Mar del Sud/);
  const enDisco = path.join(RAIZ, 'docs', 'etapa-1-fuentes', 'BALCARCE-INVESTIGACION.md');
  if (fs.existsSync(enDisco)) {
    // El informe lleva datos del día (notas publicadas en 30 días, lo que trajo cada feed): comparar todo el texto con lo que sale hoy rompía esta
    // prueba cada vez que cambiaban los datos (la de «Pruebas» en GitHub falló así el 16/10). Se controla la ESTRUCTURA: cada fuente de Balcarce
    // tiene su ficha y la tabla, igual que el informe recién armado.
    const guardado = fs.readFileSync(enDisco, 'utf8').replace(/\r\n/g, '\n');
    for (const f of BALCARCE_FONDO) assert.ok(guardado.includes(f.nombre), `BALCARCE-INVESTIGACION.md no nombra ${f.nombre}: correr node scripts/medir/generar-revision.mjs`);
    assert.equal((guardado.match(/^### \d+\. /gm) ?? []).length, BALCARCE_FONDO.length, 'BALCARCE-INVESTIGACION.md tiene otra cantidad de fichas: correr node scripts/medir/generar-revision.mjs');
  }
});

// ------------------------------------------------------------ Fuentes v3 (16/10): corta, 63, zona y para qué sirve

test('pestañas: Versión corta (recomendada), Versión de 63, Balcarce a fondo, Descartadas y Para qué se usa cada cosa; arranca en la corta', () => {
  for (const [v, t] of PESTANAS) {
    assert.ok(html.includes(`data-vista-btn="${v}"`), `falta la pestaña ${v}`);
    assert.ok(html.includes(esc(t)), `falta el título ${t}`);
  }
  assert.match(html, /Versión corta \(recomendada\)/);
  assert.match(html, /Versión de 63 \(por si querés volver\)/);
  assert.match(html, /data-vista-btn="corta" aria-selected="true"/);
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  assert.match(script, /data-corta === 'sale'|dataset\.corta === 'sale'/, 'la corta esconde lo que sale');
});

test('la versión corta: entre 30 y 40 medios de afuera, todo lo de Balcarce adentro y cada salida con su motivo medido', () => {
  const r = datos.resumen.corta;
  assert.ok(r.deAfuera >= OBJETIVO.minimo && r.deAfuera <= OBJETIVO.maximo, `quedan ${r.deAfuera} de afuera`);
  assert.equal(r.balcarce, 11, 'todas las de Balcarce');
  assert.equal(r.deAfuera + r.salen, r.base, 'lo que queda más lo que sale es la de 63');
  assert.equal(r.base + r.balcarce, datos.resumen.queQuedan.medios, 'la de 63 son los que quedan en pantalla');
  for (const m of datos.medios.filter((x) => x.grupo === 'balcarce')) assert.equal(m.corta.estado, 'balcarce');
  for (const s of datos.afinado.salen) {
    assert.ok(s.motivo.length > 40, `${s.nombre}: motivo`);
    assert.ok(typeof s.perdida === 'number', `${s.nombre}: cuántas notas cuesta`);
    assert.ok(html.includes(esc(s.motivo)), `${s.nombre}: el motivo está en la página`);
  }
  // un solo medio por dueño en la corta
  const grupos = {};
  for (const m of datos.medios.filter((x) => x.corta?.estado === 'queda' && x.dueno)) grupos[m.dueno] = (grupos[m.dueno] ?? 0) + 1;
  for (const [g, n] of Object.entries(grupos)) assert.equal(n, 1, `${g} tiene ${n} medios en la corta`);
  // la cobertura medida no puede ser mayor que la de 63, y está escrita
  assert.ok(datos.afinado.cobertura.corta.llegan <= datos.afinado.cobertura.de63.llegan);
  assert.ok(CRITERIO_CORTA.length >= 5);
  assert.match(html, /Lo que cuesta, medido con las \d+ notas de afuera/);
  // en la página: las filas que salen están marcadas para que la corta las esconda
  assert.equal((html.match(/data-corta="sale"/g) ?? []).length, r.salen);
});

test('¿son de la zona?: cada fuente de Balcarce tiene su verificación, y las que no son de la zona dicen qué proponer', () => {
  for (const m of datos.medios.filter((x) => x.grupo === 'balcarce')) {
    const v = VERIFICACION_LOCAL[m.nombre];
    assert.ok(v, `${m.nombre} no tiene verificación`);
    assert.ok(['si', 'mezcla', 'no', 'duda'].includes(v.veredicto));
    assert.ok(v.redaccion.length > 10 && v.propuesta.length > 3);
  }
  for (const nombre of Object.keys(VERIFICACION_LOCAL)) assert.ok(datos.medios.some((m) => m.nombre === nombre), `${nombre} no está en el registro`);
  assert.equal(VERIFICACION_LOCAL['Ahora Balcarce'].veredicto, 'no', 'Ahora Balcarce es de una red de portales, sin redacción en Balcarce');
  assert.match(html, /id="son-de-la-zona"/);
  assert.match(html, /No son de la zona, aunque nombren a Balcarce: [^<]*Ahora Balcarce/);
  assert.match(md, /## ¿Son de la zona\?/);
});

test('"Para qué se usa cada cosa": fuente, cruce, feed, raspado, peso, dueño, caídas, Sí/No/Duda y la auditoría sola', () => {
  const para = html.split('id="para-que"')[1].split('</section>')[0];
  for (const t of ['Una fuente', 'Fuente de cruce', 'Feed', 'scraping', 'Peso', 'Dueño', 'Cuando una fuente se cae', 'Sí / No / Duda', 'Cómo se revisa sola la lista', 'auditar-fuentes.mjs', 'medir-fuentes.mjs']) {
    assert.ok(para.includes(t), `falta "${t}"`);
  }
  assert.match(para, /confirmar/);
  assert.match(para, /Riesgos/);
});

test('candidatas nuevas: sin el archivo la página no falla; con el archivo aparecen con sus botones', () => {
  const vacio = fs.mkdtempSync(path.join(os.tmpdir(), 'cand-'));
  assert.deepEqual(leerCandidatas(vacio), []);
  fs.writeFileSync(path.join(vacio, 'CANDIDATAS-NUEVAS.json'), '{ no es json');
  assert.deepEqual(leerCandidatas(vacio), []);
  fs.writeFileSync(path.join(vacio, 'CANDIDATAS-NUEVAS.json'), JSON.stringify({ candidatas: [{ nombre: 'Agencia de Ciencia X', url: 'https://x.test/feed', seccion: 'Ciencia', motivo: 'ciencia argentina' }, { medio: 'Policiales Y' }] }));
  const c = leerCandidatas(vacio);
  assert.equal(c.length, 2);
  assert.equal(c[0].nombre, 'Agencia de Ciencia X');
  assert.equal(c[1].nombre, 'Policiales Y');
  const conCand = generarHTML({ ...datos, candidatas: c });
  assert.equal((conCand.match(/class="fila fila-candidata"/g) ?? []).length, 2);
  assert.match(conCand, /Agencia de Ciencia X/);
  fs.rmSync(vacio, { recursive: true, force: true });
  assert.match(html, /id="candidatas"/);
});
