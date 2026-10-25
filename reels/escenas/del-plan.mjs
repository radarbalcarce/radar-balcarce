// Del plan del día a la escena animada (9/10/2026). `reels/plan.mjs` le pasa los datos reales de cada pieza y acá se arma su escena
// (reels/escenas/*). Cada función devuelve la escena o `null`: si algo falla o falta un dato, la pieza sale como siempre, con su placa
// (la que ya trae `svg`), nunca se cae por la animación (regla 157). `REELS_ESCENAS=no` las apaga todas.
//
// 18/10/2026 (el video en un repositorio aparte, docs/07-REDES.md): cada escena lleva anotado su `descriptor` ({ fn, args }: qué función de
// reels/escenas/registro.mjs la dibuja y con qué datos, todo JSON), así el render la puede rehacer sin el resto del proyecto.

import { diaAR } from '../../ingesta/zona.mjs';
import { FUNCIONES_DE_ESCENA } from './registro.mjs';
import { COLOR_SECCION } from '../placa.mjs';
import { MAIL_REDACCION, PIEZAS_PARTICIPA } from '../../redes/participa.mjs';

const activas = () => process.env.REELS_ESCENAS !== 'no';

/**
 * Arma la escena o devuelve null (y lo dice una sola vez por pieza) si falla. Le anota a la escena su `descriptor` (o la función que lo da) para
 * que el repositorio de render pueda rehacerla; si no hay video aparte, no se usa.
 */
function conRespaldo(nombre, armar, descriptor = null) {
  if (!activas()) return null;
  try {
    const escena = armar() ?? null;
    if (escena && descriptor) escena.descriptor = typeof descriptor === 'function' ? descriptor() : descriptor;
    return escena;
  } catch (e) {
    console.warn(`    escena de ${nombre}: no se pudo armar (${String(e.message).split('\n')[0]}); sale con la placa de siempre`);
    return null;
  }
}

/**
 * Una escena de la tabla de funciones, con su descriptor. `argsDe` (los datos, o una función que los arma) se calcula adentro del `try`: si algo
 * falla ahí, la pieza sale con su placa, como siempre.
 */
const hacer = (nombre, fn, argsDe, condicion = true) => {
  let args = null;
  return conRespaldo(nombre, () => {
    if (!condicion) return null;
    args = typeof argsDe === 'function' ? argsDe() : argsDe;
    return FUNCIONES_DE_ESCENA[fn](args);
  }, () => ({ fn, args }));
};

/** El día de Balcarce (AAAA-MM-DD) de un Date. */
const iso = (fecha) => diaAR(fecha);

export function escenaDelClima({ momento, clima, fecha }) {
  return hacer(`clima-${momento}`, 'escenaDeClima', () => ({ momento, clima, fecha: iso(fecha) }), Boolean(clima?.ahora && clima.dias?.length));
}

export function escenaDelAviso({ aviso, clima, fecha }) {
  return hacer(aviso?.nombre ?? 'aviso', 'escenaDeClima', () => ({
    momento: 'aviso', clima, fecha: iso(fecha), aviso: { tipo: aviso.tipo, titulo: aviso.titulo, texto: aviso.texto, dia: aviso.dia },
  }), Boolean(clima?.ahora && clima.dias?.length && aviso));
}

export function escenaDeLaFarmacia({ turno, fecha, hasta }) {
  return hacer('farmacia', 'escenaDeFarmacia', () => ({
    fecha: iso(fecha), hasta, farmacias: turno.detalle.map((f) => ({ nombre: f.nombre, direccion: f.direccion, telefono: f.telefono })),
  }), Boolean(turno?.detalle?.length));
}

export function escenaDeLosUtiles({ pantallas }) {
  return hacer('utiles', 'escenaDeUtiles', () => ({ pantallas }), Boolean(pantallas?.length));
}

export function escenaDeLaAgenda({ eventos }) {
  return hacer('agenda', 'escenaDeAgenda', () => ({ eventos }), Boolean(eventos?.length));
}

/**
 * El tipo de una efeméride, por lo que dice. Es una aproximación: sólo decide el color y el dibujito; si no se reconoce, es "historia".
 * Lo delicado (violencia, política) lo frena el criterio antes de llegar acá.
 */
export function tipoDeEfemeride(principal = {}) {
  const t = `${principal.titulo ?? ''} ${principal.cuerpo ?? ''}`.toLowerCase();
  if (/balcarce|fangio|tandil/.test(t)) return 'balcarce';
  if (/independencia|revoluci[oó]n de mayo|san mart[ií]n|belgrano|bandera|escarapela|himno|constituci[oó]n|cabildo|patria|soberan[ií]a/.test(t)) return 'patria';
  if (/campo|rural|agro|agricultor|ganader|cosecha|tractor|siembra|trigo|soja|vaca|estatuto del pe[oó]n/.test(t)) return 'campo';
  if (/nobel|cient[ií]fic|descubr|invent|f[ií]sic|qu[ií]mic|medicin|astr[oó]nom|computadora|sat[eé]lite|telescopio|vacuna/.test(t)) return 'ciencia';
  if (/campe[oó]n|mundial|copa|f[uú]tbol|olimp|tenis|automovil|f[oó]rmula|boxe|b[aá]squet|rugby|selecci[oó]n/.test(t)) return 'deporte';
  if (/m[uú]sic|cantor|canci[oó]n|compositor|escritor|poeta|novela|pintor|pel[ií]cula|cine|teatro|tango|folklore|actriz|actor|libro|orquesta/.test(t)) return 'cultura';
  return 'historia';
}

export function escenaDeLaEfemeride({ efemeride, fecha }) {
  return hacer('efemeride', 'escenaDeEfemeride', () => ({
    fecha: efemeride.fecha ?? iso(fecha), principal: efemeride.principal, ademas: (efemeride.ademas ?? []).slice(0, 3), tipo: tipoDeEfemeride(efemeride.principal),
  }), Boolean(efemeride?.principal?.titulo));
}

/** El tipo de un feriado: lo que dice el dato (trasladable, decreto) y, entre los fijos, Carnaval o los religiosos por su nombre. */
export function tipoDeFeriado(f = {}) {
  const nombre = (f.nombre ?? '').toLowerCase();
  if (/carnaval/.test(nombre)) return 'carnaval';
  if (f.tipo === 'decreto') return 'decreto';
  if (/navidad|inmaculada|viernes santo|jueves santo|semana santa|pascua|reyes/.test(nombre)) return 'religioso';
  if (f.tipo === 'trasladable') return 'trasladable';
  return 'patrio';
}

export function escenaDelFeriado({ feriado, dato }) {
  return hacer('feriado', 'escenaDeFeriado', () => {
    const tipo = tipoDeFeriado(feriado);
    const texto = dato ?? feriado.datos?.[0]?.texto ?? '';
    // El año grande es el del hecho histórico; un decreto (el número 1103/2026) no lleva año.
    const anio = tipo === 'decreto' ? null : (texto.match(/\b(1[0-9]{3}|20[0-9]{2})\b/) ?? [])[1] ?? null;
    return { fecha: feriado.fecha, feriado, dato: { anio, texto }, tipo };
  }, Boolean(feriado?.nombre && feriado.fecha));
}

export function escenaDeParticipaDelPlan({ id }) {
  const p = PIEZAS_PARTICIPA[id];
  return hacer(id, 'escenaDeParticipa', () => ({ p, color: COLOR_SECCION[p.seccion], mail: MAIL_REDACCION }), Boolean(p));
}
