// Radar 3.0 · armar el mes de «Un día como hoy» y los feriados SIN el motor viejo (6/11/2026).
//
// Lo que el sistema viejo hacía a mano (`ingesta/generar-efemerides.mjs`) y con una rutina de Claude (el día 20 de cada mes), acá lo hace un programa:
//
//   1. `armarCandidatas`: baja de Wikipedia el Portal Argentina y el feed «un día como hoy», mide qué tan conocido es cada tema (Wikidata), puntúa y se queda
//      con las 20 mejores de cada día, con la propuesta automática (lo mismo que el viejo: `motor.mjs`).
//   2. `armarFeriados`: los feriados que vienen (API de feriados) con la ficha curada de cada uno (`curadas.json`).
//   3. `armarPiezas`: de la propuesta de cada día, la pieza que lee el 3.0: `{ voz, principal, ademas, guion }` (`web/data/efemerides-piezas.json`).
//
// Es POR REGLAS y sin IA ni segunda fuente: por eso es más cauteloso que la rutina de Claude (ver `esUsable`): sólo entra como principal lo curado, lo del Portal
// Argentina de Wikipedia y lo del mundo que conocen 150 idiomas o más; un día sin principal usable queda sin pieza (ese día no sale nada, que no es una falla).
// Una pieza que ya estaba en el archivo y no la armó este programa (la de una persona o la de Claude) NUNCA se pisa. Sin dependencias; la red entra por `traer`.
import {
  parsearPortal, especialesDelDia, candidatasDelDia, lasMejores, curadasDelDia, leerCuradas, piezasDeFeriados, ANIO_DE_REFERENCIA, fijarAnioDeReferencia,
  RE_PAGINA_GENERICA, IDIOMAS_FIGURA_MUNDIAL, IDIOMAS_ARGENTINO_CONOCIDO, mismoHecho, PUNTAJE_MINIMO, proponerDias, MARCAS_QUE_EXCLUYEN, IDIOMAS_MUNDIAL,
} from './motor.mjs';

export const UA = 'RadarBalcarce/3.0 (https://radarbalcarce.com; radarbalcarce@gmail.com)';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const pad = (n) => String(n).padStart(2, '0');
const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const normal = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 32);
const enLotes = (lista, n) => { const r = []; for (let i = 0; i < lista.length; i += n) r.push(lista.slice(i, i + n)); return r; };

// ------------------------------------------------------------------ las fechas

/** El mes que sigue a `hoy` (hora de Balcarce): { desde: 'AAAA-MM-01', dias }. */
export function mesQueSigue(ahora = new Date()) {
  const [a, m] = new Date(new Date(ahora).getTime() - 3 * 3600_000).toISOString().slice(0, 7).split('-').map(Number);
  const anio = m === 12 ? a + 1 : a;
  const mes = m === 12 ? 1 : m + 1;
  return { desde: `${anio}-${pad(mes)}-01`, dias: new Date(Date.UTC(anio, mes, 0)).getUTCDate() };
}

// ------------------------------------------------------------------ la red (todo entra por `traer`)

/** Un cliente de JSON con reintentos. `traer` es `fetch`; `esperar(ms)` se cambia en las pruebas. 404 = null. */
export function clienteJson({ traer = fetch, esperar = (ms) => new Promise((r) => { setTimeout(r, ms); }), intentos = 3 } = {}) {
  return async function json(url) {
    for (let i = 1; ; i += 1) {
      try {
        const res = await traer(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        if (i >= intentos) throw new Error(`${url}: ${e.message}`);
        await esperar(1500 * i);
      }
    }
  };
}

/** Del feed de Wikipedia, lo que puede valer la pena, con las páginas que trae cada hecho. */
export function delFeed({ events, births } = {}) {
  const salida = [];
  const paginas = (x) => (x.pages ?? []).map((p) => ({ qid: p.wikibase_item ?? null, descripcion: p.description ?? '', url: p.content_urls?.desktop?.page ?? null }));
  for (const e of events?.events ?? []) {
    if (!e.text || !e.year) continue;
    salida.push({ anio: e.year, texto: mayuscula(e.text.trim()), paginas: paginas(e) });
  }
  for (const b of births?.births ?? []) {
    if (!b.text || !b.year) continue;
    salida.push({ anio: b.year, texto: ('Nace ' + b.text.trim()).replace(/\s+/g, ' '), paginas: paginas(b), nacimiento: true });
  }
  return salida;
}

const esGenerica = (descripcion) => RE_PAGINA_GENERICA.test(descripcion);

/** Lo más específico de un hecho del feed: el máximo de idiomas entre sus páginas que no son un país, un año o una ciudad. */
function importanciaDelFeed(paginas, wd) {
  let mejor = { idiomas: 0, url: paginas[0]?.url ?? null };
  for (const p of paginas) {
    const d = p.qid ? wd.get(p.qid) : null;
    if (!d || esGenerica(d.descripcion || p.descripcion)) continue;
    if (d.idiomas > mejor.idiomas) mejor = { idiomas: d.idiomas, url: p.url ?? mejor.url };
  }
  return mejor;
}

/**
 * Baja todo lo que hace falta para `dias` días desde `desde` y devuelve las candidatas con la propuesta, en el formato de `web/data/efemerides-candidatas.json`.
 * @param {{desde: string, dias: number, json: Function, esperar?: Function, curadas?: object, ahora?: Date, avisar?: Function}} o
 */
export async function armarCandidatas({ desde, dias, json, esperar = async () => {}, curadas = leerCuradas(), ahora = new Date(), avisar = () => {} }) {
  const inicio = new Date(`${desde}T12:00:00Z`);
  if (Number.isNaN(inicio.getTime())) throw new Error(`desde inválido: ${desde}`);
  fijarAnioDeReferencia(inicio.getUTCFullYear());
  const feed = (tipo, mes, dia) => json(`https://es.wikipedia.org/api/rest_v1/feed/onthisday/${tipo}/${pad(mes)}/${pad(dia)}`);
  const portalDelDia = async (mes, dia) => {
    for (const numero of dia === 1 ? ['1º', '1'] : [String(dia)]) {
      const titulo = encodeURIComponent(`Portal:Argentina/Efemérides del ${numero} de ${MESES[mes - 1]}`);
      const j = await json(`https://es.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&page=${titulo}`);
      if (j?.parse?.wikitext) return parsearPortal(j.parse.wikitext);
    }
    return [];
  };

  const crudos = [];
  for (let i = 0; i < dias; i += 1) {
    const f = new Date(inicio.getTime() + i * 86400000);
    const iso = f.toISOString().slice(0, 10);
    const mes = f.getUTCMonth() + 1; const dia = f.getUTCDate();
    const portal = await portalDelDia(mes, dia);
    const holidays = await feed('holidays', mes, dia);
    const events = await feed('events', mes, dia);
    const births = await feed('births', mes, dia);
    crudos.push({ iso, mes, dia, semana: DIAS[f.getUTCDay()], portal, especiales: especialesDelDia(holidays?.holidays?.map((h) => h.text) ?? []), feed: delFeed({ events, births }) });
    avisar(`${iso}: bajado`);
    await esperar(400);
  }

  // Qué tan conocido es cada tema (en cuántos idiomas de Wikipedia tiene página), por títulos y por identificadores de Wikidata.
  const paginaQid = new Map();
  const wd = new Map();
  const titulos = [...new Set(crudos.flatMap((c) => c.portal.map((p) => p.pagina).filter(Boolean)))];
  for (const lote of enLotes(titulos, 40)) {
    const j = await json('https://es.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=pageprops&ppprop=wikibase_item&titles=' + encodeURIComponent(lote.join('|')));
    const q = j?.query ?? {};
    const siguiente = (t) => {
      let x = (q.normalized ?? []).find((n) => n.from === t)?.to ?? t;
      x = (q.redirects ?? []).find((n) => n.from === x)?.to ?? x;
      return x;
    };
    const porTitulo = new Map((q.pages ?? []).map((p) => [p.title, p.pageprops?.wikibase_item ?? null]));
    for (const t of lote) paginaQid.set(t, porTitulo.get(siguiente(t)) ?? null);
    await esperar(200);
  }
  const qids = [...new Set([...crudos.flatMap((c) => c.portal.map((p) => paginaQid.get(p.pagina)).filter(Boolean)), ...crudos.flatMap((c) => c.feed.flatMap((x) => x.paginas.map((p) => p.qid)).filter(Boolean))])];
  for (const lote of enLotes(qids, 50)) {
    const j = await json('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks|descriptions&languages=es&ids=' + lote.join('|'));
    for (const id of lote) {
      const e = j?.entities?.[id];
      const idiomas = Object.keys(e?.sitelinks ?? {}).filter((k) => /wiki$/.test(k) && !/^(commons|species|meta|wikidata|mediawiki|wikimania)wiki$/.test(k)).length;
      wd.set(id, { idiomas, descripcion: e?.descriptions?.es?.value ?? '' });
    }
    await esperar(300);
  }

  const resultado = {};
  for (const c of crudos) {
    const mmdd = pad(c.mes) + '-' + pad(c.dia);
    const portal = c.portal.map((p) => {
      const qid = paginaQid.get(p.pagina);
      const d = qid ? wd.get(qid) : null;
      const importancia = d && !esGenerica(d.descripcion) ? d.idiomas : 0;
      return { anio: p.anio, texto: p.texto, importancia, enlace: p.pagina ? 'https://es.wikipedia.org/wiki/' + encodeURIComponent(p.pagina.replace(/ /g, '_')) : null };
    });
    const dePortal = 'https://es.wikipedia.org/wiki/' + encodeURIComponent('Portal:Argentina/Efemérides_del_' + c.dia + '_de_' + MESES[c.mes - 1]);
    for (const p of portal) p.enlace ??= dePortal;
    const delMundo = c.feed.map((x) => {
      const m = importanciaDelFeed(x.paginas, wd);
      return { anio: x.anio, texto: x.texto, importancia: m.idiomas, enlace: m.url ?? 'https://es.wikipedia.org/wiki/' + c.dia + '_de_' + MESES[c.mes - 1], nacimiento: x.nacimiento };
    }).filter((x) => !x.nacimiento || (/argentin|balcarce/i.test(x.texto) ? x.importancia >= IDIOMAS_ARGENTINO_CONOCIDO : x.importancia >= IDIOMAS_FIGURA_MUNDIAL));
    resultado[c.iso] = { diaSemana: c.semana, candidatas: candidatasMejores(mmdd, { portal, especiales: c.especiales, feed: delMundo, curadas: curadasDelDia(mmdd, curadas) }) };
    avisar(`${c.iso}: ${resultado[c.iso].candidatas.length} en la lista`);
  }
  const propuestas = proponerDias(resultado);
  for (const [iso, p] of Object.entries(propuestas)) resultado[iso].propuesta = p;
  return { generado: ahora.toISOString(), anioDeReferencia: ANIO_DE_REFERENCIA, desde, dias, porDia: resultado };
}

/** Candidatas de un día → las mejores 20 (puntaje mínimo, sin repetidas, sin que un estilo se coma la lista). Es lo que hace el viejo en `main()`. */
export function candidatasMejores(mmdd, fuentes) {
  let todas = candidatasDelDia(mmdd, fuentes);
  const vistas = new Set();
  todas = todas.filter((x) => x.puntaje >= PUNTAJE_MINIMO && !vistas.has(normal(x.texto)) && vistas.add(normal(x.texto)));
  todas = todas.filter((x, i) => !todas.slice(0, i).some((y) => mismoHecho(x, y)));
  return lasMejores(todas);
}

/** El archivo `efemerides-candidatas.json` (mismo formato que el viejo: la cabecera y un día por renglón). */
export function candidatasComoArchivo({ generado, anioDeReferencia, desde, dias, porDia }) {
  const salida = { generado, anioDeReferencia, desde, dias };
  const renglones = Object.entries(porDia).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',\n');
  return `{${JSON.stringify(salida).slice(1, -1)},\n"dias":{\n${renglones}\n}}\n`;
}

// ------------------------------------------------------------------ los feriados

/** Los feriados que vienen, con su ficha curada (el contenido de `feriados-piezas.json`). */
export async function armarFeriados({ json, curadas = leerCuradas(), ahora = new Date(), diasHaciaAdelante = 240 }) {
  const hoy = new Date(new Date(ahora).getTime() - 3 * 3600_000).toISOString().slice(0, 10);
  const limite = new Date(new Date(ahora).getTime() + diasHaciaAdelante * 86400000).toISOString().slice(0, 10);
  const anio = Number(hoy.slice(0, 4));
  const feriados = [];
  for (const a of [anio, anio + 1]) feriados.push(...((await json(`https://api.argentinadatos.com/v1/feriados/${a}`)) ?? []));
  return { generado: new Date(ahora).toISOString(), feriados: piezasDeFeriados(feriados, curadas, { desde: hoy, hasta: limite }) };
}

// ------------------------------------------------------------------ las piezas (lo que lee el 3.0)

const ORIGENES_PROPIOS = new Set(['curada', 'portal']);

/**
 * ¿Esta candidata puede salir sin que nadie la mire? Cauto a propósito: lo curado a mano (menos lo que pide revisión de una persona), lo del Portal Argentina de Wikipedia
 * y lo del mundo que conocen 150 idiomas o más; nada con marcas delicadas ni sin año (la escena del año que corre necesita el año).
 */
export function esUsable(c) {
  if (!c?.anio || !c?.texto) return false;
  if (c.revisaUnaPersona) return false;
  if (c.origen !== 'curada' && (c.marcas ?? []).some((m) => MARCAS_QUE_EXCLUYEN.includes(m))) return false;
  if (ORIGENES_PROPIOS.has(c.origen)) return true;
  return c.origen === 'feed' && (c.importancia ?? 0) >= IDIOMAS_MUNDIAL;
}

/** El título y el cuerpo de un hecho: la primera cláusula y el resto («Nace X» / «jurista y político…»). Lo curado ya trae su nombre. */
export function tituloYCuerpo(c) {
  if (c.origen === 'curada') return { titulo: c.titulo, cuerpo: c.texto && c.texto !== c.titulo ? c.texto : '' };
  const texto = c.texto.replace(/\s+/g, ' ').trim().replace(/[.;]\s*$/, '');
  const coma = texto.indexOf(', ');
  if (coma >= 12 && coma <= 90 && texto.length - coma > 12) return { titulo: texto.slice(0, coma), cuerpo: mayuscula(texto.slice(coma + 2)) + '.' };
  if (texto.length <= 110) return { titulo: texto, cuerpo: '' };
  const corte = texto.slice(0, 100).replace(/\s+\S*$/, '');
  return { titulo: corte, cuerpo: mayuscula(texto.slice(corte.length).replace(/^[\s,;:]+/, '')) + '.' };
}

const unaFrase = (t, max = 170) => {
  const x = String(t).replace(/\s+/g, ' ').trim().replace(/[.;]\s*$/, '');
  return x.length <= max ? x : `${x.slice(0, max).replace(/\s+\S*$/, '')}`;
};

/** El guion de la locutora, con plantilla (sin IA). */
export function guionDe({ principal, ademas }) {
  const partes = [`Buen día, Balcarce. Un día como hoy, en ${principal.anio}: ${unaFrase(principal.titulo, 120)}.`];
  if (principal.cuerpo) partes.push(`${unaFrase(principal.cuerpo)}.`);
  if (ademas.length) partes.push(`Y además, un día como hoy: ${ademas.map((a) => `en ${a.anio}, ${unaFrase(a.texto, 130)}`).join('; ')}.`);
  partes.push('Un día como hoy, en Radar Balcarce.');
  return partes.join(' ');
}

/** La pieza de un día a partir de sus candidatas y su propuesta, o null si no hay principal usable. */
export function piezaDelDia(dia) {
  const porId = new Map((dia?.candidatas ?? []).map((c) => [c.id, c]));
  const prop = dia?.propuesta;
  const p = prop?.principal ? porId.get(prop.principal) : null;
  if (!p || !esUsable(p)) return null;
  const { titulo, cuerpo } = tituloYCuerpo(p);
  const ademas = (prop.si ?? []).map((id) => porId.get(id)).filter((c) => c && esUsable(c) && c.id !== p.id)
    .map((c) => ({ id: c.id, anio: c.anio, texto: unaFrase(c.texto, 160) }));
  const principal = {
    id: p.id, anio: p.anio, titulo, cuerpo,
    verificar: [p.origen === 'curada' ? 'armado por reglas desde una fecha curada' : `armado por reglas desde ${p.fuente ?? p.origen}, sin segunda fuente`],
  };
  return { voz: 'locutora', principal, ademas, guion: guionDe({ principal, ademas }), automatico: true };
}

/**
 * Suma al archivo de piezas las del mes armado. Idempotente: lo mismo dos veces da lo mismo; lo que hizo una persona o Claude (sin `automatico`) no se toca; lo que armó
 * este programa se vuelve a armar. Devuelve `{ archivo, nuevas, sinPieza }`.
 */
export function armarPiezas({ candidatas, existentes = null, ahora = new Date() }) {
  const base = existentes?.dias ? existentes : { generado: null, nota: '', hora: '09:00', dias: {} };
  const dias = { ...base.dias };
  const nuevas = []; const sinPieza = [];
  for (const [iso, d] of Object.entries(candidatas.dias ?? {})) {
    if (dias[iso] && !dias[iso].automatico) continue;
    const pieza = piezaDelDia(d);
    if (pieza) { if (JSON.stringify(dias[iso]) !== JSON.stringify(pieza)) nuevas.push(iso); dias[iso] = pieza; } else { sinPieza.push(iso); delete dias[iso]; }
  }
  const ordenados = Object.fromEntries(Object.keys(dias).sort().map((k) => [k, dias[k]]));
  const generado = nuevas.length || sinPieza.length ? new Date(ahora).toISOString().slice(0, 10) : base.generado;
  return { archivo: { generado, nota: base.nota || NOTA, hora: base.hora ?? '09:00', ...Object.fromEntries(Object.entries(base).filter(([k]) => !['generado', 'nota', 'hora', 'dias'].includes(k))), dias: ordenados }, nuevas, sinPieza };
}

const NOTA = 'Un día como hoy: lo que se lee, quién lo lee y cómo se ve. Desde diciembre de 2026 lo arma solo Radar 3.0 el día 20 de cada mes (v3/redes/efemerides): lo que tiene `automatico` lo armó el programa por reglas; lo demás, una persona o Claude. Todos los días a las 9:00, con la locutora.';
