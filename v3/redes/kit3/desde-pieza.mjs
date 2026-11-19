// El adaptador del kit 3.0: recibe la pieza TAL COMO la arman hoy los armadores de producción (`../piezas/armadores.mjs`: clima, repaso, efeméride, farmacia, nota de Balcarce y nota propia,
// con las fotos ya bajadas por `resolverFotos`) y devuelve lo que pide una plantilla del kit (`plantillas/*.js`): los datos de la escena, las palabras del guion con sus tiempos, las fotos y el
// fondo. Es PURO (sin red, sin archivos, sin hora del sistema): lo dibuja `kit3.mjs`.
//
// Lo que no cambia: el guion es el de la pieza (el que lee la voz: el saludo sólo está si el armador lo puso, sin «paraguas» ni «de acá»), el aviso «Voz generada con inteligencia artificial.» sigue
// en el texto del posteo (eso lo arma `publicar.mjs`, no el video) y a una foto que no baja el armador la saca antes. Los tiempos son los de la voz (`palabras` de `reels/alinear.mjs`) o, sin
// audio, los estimados a 2,5 palabras por segundo.
import { comentarioDelDia } from '../piezas/armadores.mjs';
import { estadoDelCielo, renglonesDelCielo } from './cielo.mjs';
import {
  agruparEnCarteles, buscarFrase, buscarMarcas, duracionDelKit, finDeFrase, inicioDeLasPartes, normalizar, palabrasDeLaVoz, palabrasEstimadas, tiempoDe,
} from './tiempos.mjs';
import { CIERRE_SEGUNDOS, COLA_SEGUNDOS, FOTOS_MAXIMO, MARCA, PIEZAS_DEL_KIT } from './variables.mjs';

export const aplicaKit3 = (pieza) => pieza?.tipo === 'video' && PIEZAS_DEL_KIT.includes(pieza.id);

const mayuscula = (t) => { const s = String(t ?? '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
const palabrasDe = (t) => String(t ?? '').split(/\s+/).filter(Boolean).length;

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fechaEnLetras = (iso, opciones) => mayuscula(new Date(`${iso}T12:00:00-03:00`).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', ...opciones }));

// ------------------------------------------------------------------ fotos

/** Una foto del contrato (ya bajada: `datos` data URI, `ancho`, `alto`) para el kit: se guarda como `fotos/<clave>.<ext>` y la plantilla la lee de `datos.*.foto`. */
function fotoParaElKit(foto, fotos) {
  if (!foto?.datos || !(foto.ancho > 0) || !(foto.alto > 0)) return null;
  let f = fotos.find((x) => x.datos === foto.datos);
  if (!f) {
    const ext = /^data:image\/png/.test(foto.datos) ? 'png' : 'jpg';
    f = { clave: `f${fotos.length}`, ext, datos: foto.datos, ancho: foto.ancho, alto: foto.alto, credito: foto.credito ?? '' };
    fotos.push(f);
  }
  // Toda foto va ENTERA (nunca recortada) sobre un fondo que es la misma foto desenfocada: la plantilla la acomoda (kit/kit.js, `foto`).
  return { src: `fotos/${f.clave}.${f.ext}`, w: f.ancho, h: f.alto, credito: f.credito };
}

/** «Foto: La Voz» tal cual viene, sin repetir la palabra si ya la trae. */
export function textoDeCredito(credito) {
  const c = String(credito ?? '').trim();
  if (!c) return '';
  return /^(foto|fotos|imagen|im[aá]genes|ilustraci[oó]n|captura|archivo)\b/i.test(c) ? c : `Foto: ${c}`;
}

// ------------------------------------------------------------------ las palabras

function palabrasDelKit(guion, palabras) {
  const reales = palabrasDeLaVoz(palabras);
  const esperadas = String(guion ?? '').split(/\s+/).filter(Boolean).length;
  // Una voz con muchas menos palabras que el guion (no alineó) no sirve para sincronizar: se estima.
  const usarVoz = reales.length >= Math.max(3, Math.floor(esperadas * 0.6));
  const P = agruparEnCarteles(usarVoz ? reales : palabrasEstimadas(guion));
  return { P, estimadas: !usarVoz };
}

const crecientes = (tiempos, paso = 0.8) => tiempos.reduce((acc, t) => { acc.push(Math.max(t, acc.length ? acc.at(-1) + paso : t)); return acc; }, []);

// ------------------------------------------------------------------ clima

function adaptarClima(pieza, P, ctx) {
  const esc = pieza.escenas[0];
  const { clima, fecha } = esc.datos;
  const noche = esc.datos.momento === 'noche';
  const idx = Math.max(0, clima.dias.findIndex((d) => d.fecha === fecha));
  const hoy = clima.dias[idx];
  const manana = clima.dias[idx + 1] ?? hoy;
  const d = noche ? manana : hoy;
  const comentario = comentarioDelDia(d, noche ? 'noche' : 'manana');
  const cieloAhora = clima.ahora.cielo || hoy.cielo;
  const cielo = noche ? cieloAhora : (hoy.cielo || cieloAhora);
  const lluviaEnComentario = comentario.icono === 'lluvia';

  // Las marcas: la frase del comentario (después de «Ahora hay N grados, …»), la máxima, la mínima y, si el comentario no habló de la lluvia, el «Lluvia: N por ciento».
  const [iAhora] = buscarMarcas(P, ['ahora']);
  const iFinAhora = iAhora >= 0 ? finDeFrase(P, iAhora) : -1;
  const desde = iFinAhora >= 0 ? iFinAhora + 1 : 0;
  const [iMan] = noche ? buscarMarcas(P, ['manana'], { desde }) : [-1];
  const [iMax, iMin, iLl] = buscarMarcas(P, ['maxim', 'minim', 'lluvia'], { desde: Math.max(desde, iMan >= 0 ? iMan : 0) });
  const n = P.length || 1;
  const frac = (f) => Number(((P[Math.min(P.length - 1, Math.floor(n * f))]?.a ?? 0) - 0.12).toFixed(2));
  const tCom = iFinAhora >= 0 && P[iFinAhora + 1] ? tiempoDe(P, iFinAhora + 1) : frac(0.22);
  const tMan = noche ? tiempoDe(P, iMan, frac(0.5)) : null;
  const tMax = tiempoDe(P, iMax, frac(0.5));
  const tMin = tiempoDe(P, iMin, tMax + 1.4);
  const tLl = !lluviaEnComentario && iLl >= 0 ? tiempoDe(P, iLl) : null;

  const secuencia = [{ tipo: 'cielo', t: 0 }, { tipo: 'comentario', t: tCom }];
  if (noche) secuencia.push({ tipo: 'manana', t: tMan });
  else secuencia.push({ tipo: 'maxima', t: tMax });
  if (tLl !== null) secuencia.push({ tipo: 'lluvia', t: tLl });
  const t = crecientes(secuencia.map((s) => s.t));
  secuencia.forEach((s, i) => { s.t = t[i]; });

  const fondo = estadoDelCielo({ cielo: noche ? cieloAhora : cielo, max: d.max, min: d.min, viento: d.viento ?? 0, noche });
  const chipTapa = noche ? 'Clima · Esta noche' : `Clima · ${fechaEnLetras(fecha, { weekday: 'long', day: 'numeric' })}`;
  const datos = {
    momento: noche ? 'noche' : 'manana',
    estado: fondo.estado, noche: fondo.noche,
    fechaTexto: noche ? 'Esta noche' : fechaEnLetras(fecha, { weekday: 'long', day: 'numeric', month: 'long' }),
    cieloLineas: renglonesDelCielo(cielo),
    ahora: { temp: clima.ahora.temp, sensacion: clima.ahora.sensacion ?? null },
    max: d.max, min: d.min, lluvia: d.lluvia ?? 0,
    comentario: { titulo: comentario.titulo, icono: comentario.icono },
    manana: noche ? { cieloLineas: renglonesDelCielo(manana.cielo), max: manana.max, min: manana.min, lluvia: manana.lluvia ?? 0 } : null,
    secuencia, tMax, tMin,
    franja: pieza.franja ? { texto: pieza.franja.texto, desde: pieza.franja.desde } : null,
    tapa: {
      chip: chipTapa,
      etiqueta: noche ? 'Ahora' : 'Máxima',
      numero: noche ? clima.ahora.temp : d.max,
      titulo: noche ? cielo : cielo,
      chips: noche
        ? [{ t: lluviaTexto(manana.lluvia), claro: true }, { t: `Mañana: mín ${manana.min}° · máx ${manana.max}°`, claro: false }]
        : [{ t: `Mín ${d.min}°`, claro: false }, { t: `Lluvia ${d.lluvia ?? 0} %`, claro: true }],
    },
  };
  return {
    plantilla: 'clima', datos,
    hl: { bg: MARCA.azulClima, fg: '#fff' }, rotulo: { txt: 'Clima · Balcarce', bg: MARCA.azulClima },
    scrim: noche ? 'linear-gradient(180deg,rgba(8,12,28,.4) 0%,rgba(8,12,28,.3) 50%,rgba(8,12,28,.55) 100%)' : 'linear-gradient(180deg,rgba(14,18,28,.44) 0%,rgba(14,18,28,.30) 55%,rgba(14,18,28,.5) 100%)',
    fondo: { ...fondo, cortes: secuencia.slice(1).map((s) => s.t), clave: `${fecha}-${noche ? 'n' : 'm'}` },
    fotos: [],
  };
}

const lluviaTexto = (p) => (p > 0 ? `Lluvia ${p} %` : 'Sin lluvia');

// ------------------------------------------------------------------ repaso

function adaptarRepaso(pieza, P, ctx) {
  const placas = pieza.escenas.filter((e) => e.tipo === 'placa-nota');
  const lista = pieza.escenas.find((e) => e.tipo === 'placa-lista');
  const momento = lista?.datos?.momento ?? pieza.momento ?? pieza.id.replace('repaso-', '');
  const l2 = { manana: 'de la mañana', tarde: 'de la tarde', noche: 'de la noche' }[momento] ?? 'del día';
  const partes = [
    ...placas.map((e, i) => ({ palabras: palabrasDe(e.voz), abre: i === 0 ? placas[0].datos.titulo : e.datos.marca ?? e.datos.titulo })),
    { palabras: palabrasDe(lista?.voz), abre: 'Todo en Radar Balcarce' },
  ];
  const apertura = placas[0]?.datos?.palabrasDeApertura ?? 0;
  const primera = apertura && P[apertura] ? tiempoDe(P, apertura, 0) : 0.8;
  const t = inicioDeLasPartes(P, partes, { primera });
  const fotos = [];
  const notas = placas.map((e, i) => {
    const f = fotoParaElKit(e.datos.foto, fotos);
    return { titular: e.datos.titulo, foto: f };
  });
  const datos = { titulo: `El repaso ${l2}`, l1: 'El repaso', l2, notas, t: t.slice(0, placas.length + 1), momento, momentoTexto: { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' }[momento] ?? 'Hoy' };
  return {
    plantilla: 'repaso', datos, fotos, fondo: null, subsTop: 1440,
    hl: { bg: MARCA.rojo, fg: '#fff' },
    scrim: 'linear-gradient(180deg,rgba(8,10,14,.4) 0%,rgba(8,10,14,0) 16%)',
  };
}

// ------------------------------------------------------------------ efeméride

function adaptarEfemeride(pieza, P, ctx) {
  const e = pieza.escenas[0].datos;
  const fotos = [];
  const foto = fotoParaElKit(ctx.fotoEfemeride ?? null, fotos);
  const fotoAdemas = fotoParaElKit(ctx.fotoEfemerideAdemas ?? null, fotos);
  const ademas = e.ademas?.[0] ?? null;
  const [iTambien] = ademas ? buscarMarcas(P, ['tambien']) : [-1];
  const tAdemas = ademas ? (iTambien >= 0 ? tiempoDe(P, iTambien) : Number(((P[Math.floor(P.length * 0.6)]?.a ?? 6) - 0.12).toFixed(2))) : null;
  const [, m, dia] = String(e.fecha).split('-');
  const hace = e.anioActual - e.principal.anio;
  const datos = {
    rotulo: `Un día como hoy · ${Number(dia)} ${MESES_CORTOS[Number(m) - 1]}`,
    anio: e.principal.anio, anioDesde: Math.max(1, e.principal.anio - 100),
    titulo: e.principal.titulo,
    hace: hace > 0 ? `Hace ${hace} ${hace === 1 ? 'año' : 'años'}` : '',
    ademas: ademas ? { anio: ademas.anio, texto: ademas.texto, foto: fotoAdemas, hace: e.anioActual - ademas.anio > 0 ? `Hace ${e.anioActual - ademas.anio} años` : '' } : null, tAdemas,
    foto,
  };
  return {
    plantilla: 'efemeride', datos, fotos, fondo: null,
    hl: { bg: MARCA.rojo, fg: '#fff' }, marcaClara: true, rotulo: { txt: datos.rotulo, bg: MARCA.rojo }, subsTop: 1440, subs: { fg: MARCA.tinta, sh: 'none' },
    scrim: 'linear-gradient(180deg,rgba(8,10,14,.35) 0%,rgba(8,10,14,0) 16%)',
  };
}

// ------------------------------------------------------------------ farmacias

/** «Calle 28, 920 entre 27 y 29» → ['Calle 28, 920', 'entre 27 y 29']. */
export function renglonesDeLaDireccion(d) {
  const t = String(d ?? '').replace(/\s+/g, ' ').trim();
  const m = t.match(/^(.*?)[,\s]+(entre\s.+|esquina\s.+|esq\.\s.+)$/i);
  return m ? [m[1].replace(/,$/, ''), m[2]] : [t, ''];
}

function adaptarFarmacia(pieza, P, ctx) {
  const e = pieza.escenas[0].datos;
  const lista = e.farmacias;
  const n = lista.length;
  const primeras = lista.map((f) => f.nombre.split(/\s+/)[0]);
  const [iNoche] = buscarMarcas(P, ['noche']);
  const frac = (f) => Number(((P[Math.min(P.length - 1, Math.floor(P.length * f))]?.a ?? 0) - 0.12).toFixed(2));
  let marcas;
  if (n === 1) {
    const [iNom, iNom2, iGuarda] = buscarMarcas(P, [primeras[0], primeras[0], 'guarda'], { desde: Math.max(0, iNoche) });
    const largoNombre = palabrasDe(lista[0].nombre);
    marcas = [tiempoDe(P, iNom, frac(0.2)), iNom2 >= 0 ? tiempoDe(P, iNom2 + largoNombre, frac(0.42)) : frac(0.42), tiempoDe(P, iGuarda, frac(0.78))];
  } else {
    // «Farmacia de turno esta noche: A y B. A, dirección. B, dirección. Guardá el dato.»: cada ficha entra cuando la voz repite su nombre para decir la dirección.
    let desde = Math.max(0, iNoche) + 1;
    const indices = [];
    lista.forEach((f, i) => {
      const [iPrimera] = buscarMarcas(P, [primeras[i]], { desde });
      const [iSegunda] = iPrimera >= 0 ? buscarMarcas(P, [primeras[i]], { desde: iPrimera + 1 }) : [-1];
      indices.push(iSegunda);
      if (iSegunda >= 0) desde = iSegunda + 1;
    });
    marcas = crecientes(indices.map((k, i) => tiempoDe(P, k, frac(0.25 + (0.5 * i) / n))), 1.5);
  }
  const datos = {
    modo: n, nombres: lista.map((f) => f.nombre), dir: lista.map((f) => renglonesDeLaDireccion(f.direccion)), tel: lista.map((f) => f.telefono || ''),
    marcas, hasta: String(e.hasta ?? 'De turno hasta mañana a las 8:30.').replace(/\.$/, '').replace(/^De turno hasta/i, 'Turno hasta'),
  };
  return {
    plantilla: 'farmacias', datos, fotos: [], fondo: null,
    hl: { bg: MARCA.verde, fg: '#fff' }, rotulo: { txt: n === 1 ? 'Farmacia de turno' : 'Farmacias de turno', bg: MARCA.verde },
    scrim: 'linear-gradient(180deg,rgba(6,12,10,.55) 0%,rgba(6,12,10,.4) 55%,rgba(6,12,10,.55) 100%)',
  };
}

// ------------------------------------------------------------------ notas (reel de nota y nota propia)

function adaptarNota(pieza, P, ctx) {
  const placas = pieza.escenas.filter((e) => e.tipo === 'placa-nota');
  const primera = placas[0].datos;
  const partes = placas.map((e, i) => ({ palabras: palabrasDe(e.voz), abre: i === 0 ? null : e.datos.marca ?? e.datos.titulo }));
  const t = inicioDeLasPartes(P, partes, { primera: 0 });
  const fotos = [];
  const colorSeccion = ctx.colorDeSeccion?.(primera.seccion) ?? MARCA.rojo;
  const escenas = placas.slice(0, FOTOS_MAXIMO).map((e, i) => {
    const f = fotoParaElKit(e.datos.foto, fotos);
    return { titular: e.datos.titulo, foto: f };
  });
  const datos = {
    seccion: primera.seccion, color: colorSeccion, firma: primera.firma ? `Por ${primera.firma}` : '', escenas, t: t.slice(0, escenas.length),
    tapa: { titulo: primera.titulo, foto: escenas[0].foto },
  };
  return {
    plantilla: 'nota', datos, fotos, fondo: null, subsTop: 1440,
    scrim: 'linear-gradient(180deg,rgba(8,10,14,.4) 0%,rgba(8,10,14,0) 16%)',
    hl: { bg: colorSeccion, fg: '#fff' },
    rotulo: { txt: primera.seccion, bg: colorSeccion },
  };
}

// ------------------------------------------------------------------ la entrada

const ADAPTADORES = {
  clima: adaptarClima, 'clima-auspiciado': adaptarClima, efemeride: adaptarEfemeride, farmacia: adaptarFarmacia, 'nota-reel': adaptarNota, 'nota-propia': adaptarNota,
};

/**
 * La pieza armada → lo que dibuja el kit.
 * @param {object} pieza  la que devuelve un armador (tipo 'video'), con las fotos ya bajadas (`resolverFotos`).
 * @param {object} [o]    `palabras`: las de la voz ({ texto, desde, hasta }), si hay audio; `fotoEfemeride` y `fotoEfemerideAdemas`: { datos, ancho, alto, credito } de la foto del hecho principal y del segundo hecho; `colorDeSeccion(seccion)`.
 * @returns {{ id, plantilla, guion, dur, estimado, palabras, datos, fotos, fondo, hl, scrim, rotulo?, marcaClara?, avisos }}
 */
export function desdePieza(pieza, { palabras = null, fotoEfemeride = null, fotoEfemerideAdemas = null, colorDeSeccion = null } = {}) {
  if (!aplicaKit3(pieza)) throw new Error(`el kit 3.0 no dibuja «${pieza?.id}»`);
  if (!pieza.guion) throw new Error('la pieza no tiene guion');
  const { P, estimadas } = palabrasDelKit(pieza.guion, palabras);
  const adaptar = pieza.id.startsWith('repaso') ? adaptarRepaso : ADAPTADORES[pieza.id];
  const r = adaptar(pieza, P, { fotoEfemeride, fotoEfemerideAdemas, colorDeSeccion });
  const avisos = [];
  if (estimadas) avisos.push('subtítulos con tiempos estimados (sin voz alineada)');
  for (const f of r.fotos) if (!f.credito) avisos.push(`la foto ${f.clave} no trae crédito`);
  return {
    id: pieza.id, kit: 'k1', marcaTapa: true, marcaClara: false, ...r,
    guion: pieza.guion, palabras: P, estimado: estimadas, dur: duracionDelKit(P, { cola: COLA_SEGUNDOS, cierre: CIERRE_SEGUNDOS }), avisos,
  };
}

export { normalizar, buscarFrase };
