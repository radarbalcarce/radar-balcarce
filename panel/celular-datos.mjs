// Lo que el panel del celular decide y lo que necesita para decidir (29/09).
//
// El panel del celular (web/public/panel/) no tiene servidor: habla directo con
// GitHub con la llave de quien lo usa. Escribe dos archivos, que ningún
// workflow toca (así nunca se pisan):
//
//   · web/data/celular-decisiones.json   aprobar, descartar o retirar una
//     nota, y marcar las que también pueden ir a Facebook e Instagram;
//   · web/data/correcciones.json         editar título, bajada, cuerpo o
//     sección de una nota (el mismo archivo de siempre, lib/archivo.js).
//
// Y lee, cifrado para cada celular (panel/cifrado.mjs), lo que espera a una
// persona: web/data/celular-pendientes.json, que arma web/scripts/generar-datos.mjs.
//
// Todo acá son funciones puras, sin red ni disco: se prueban enteras
// (pruebas/celular.test.mjs). Sin dependencias.

import { decisionHumana } from '../ingesta/utiles.mjs';
import { esDeAca, esDeUnMedioDeAca } from '../ingesta/ingesta.mjs';

/** ¿Es de acá, para esperar a una persona? (esDeAca, o un organismo o un medio de Balcarce que nombra algo de acá) */
const deAcaParaUnaPersona = (n) => esDeAca(n) || esDeUnMedioDeAca(n);

/**
 * De lo amarillo que todavía no miró nadie, lo que va a una persona (regla 200, 17/10/2026): sólo lo de acá. Lo de afuera que
 * no sale solo no va al celular: desde el 8/10 no hubo una sola decisión de una persona y esperaban unas 33 notas por día, casi
 * todas de afuera (docs/auditoria-2-0/02-FUENTES-CRITERIO-REPETIDAS.md § 5.1). Desde el 23/10/2026 (regla 295, Hernán, auditoría D7)
 * ya no hay tope de cinco por día: casi nada de acá queda amarillo (verificación baja, promoción dudosa) y lo que queda lo tiene
 * que ver alguien. Devuelve los identificadores que quedan.
 */
export function idsParaUnaPersona(notas = []) {
  const quedan = new Set();
  // Lo descartado con motivo (el parte del dólar, la publicidad de afuera: regla 298) no espera a nadie.
  for (const n of notas) if (n?.id && !n.descartada && deAcaParaUnaPersona(n)) quedan.add(n.id);
  return quedan;
}

/** Lo que puede decidir una persona desde el celular. */
export const ESTADOS_DEL_CELULAR = ['publicada', 'descartada', 'bloqueada'];

/** Las partes para la redacción que puede traer una nota aprobada (reels/reescritura.mjs, CAMPOS_EXTRA). */
const EXTRAS = ['claves', 'seSabe', 'noConfirmado', 'textoRedes', 'etiquetas', 'fuentesConsultadas', 'antecedentes', 'verificacion'];

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
const esFecha = (v) => typeof v === 'string' && Number.isFinite(Date.parse(v));

/**
 * Por qué una decisión del celular no vale (o null si vale). Cada una tiene que
 * decir quién y cuándo; aprobar una nota pide su texto entero (título, bajada y
 * cuerpo): una decisión humana sin texto publicaría el de la fuente tal cual,
 * que es copiar a otro medio (generar-datos.mjs, `notaPublicada`). Retirar pide
 * el motivo.
 */
export function problemaDeDecision(d) {
  if (!d || typeof d !== 'object') return 'no es una decisión';
  if (!ESTADOS_DEL_CELULAR.includes(d.estado)) return `estado desconocido: ${d.estado}`;
  if (!texto(d.por) || d.por === 'ia') return 'falta quién decidió (por)';
  if (!esFecha(d.cuando)) return 'falta cuándo (cuando)';
  if (d.estado === 'publicada' && (!texto(d.titulo) || !texto(d.copete) || !texto(d.cuerpo))) return 'para publicar hace falta título, bajada y cuerpo';
  if (d.estado === 'bloqueada' && !texto(d.motivo)) return 'para retirar hace falta el motivo';
  return null;
}

/**
 * Lee web/data/celular-decisiones.json: { notas: { id: decisión }, redes: { id:
 * { por, cuando } } }. Lo que no vale se saltea (y la prueba del repositorio
 * avisa antes de publicar). Sin archivo, nada.
 */
export function leerDecisionesCelular(json) {
  const notas = {};
  const redes = {};
  for (const [id, d] of Object.entries(json?.notas ?? {})) {
    if (problemaDeDecision(d)) continue;
    const decision = {
      estado: d.estado, por: texto(d.por), cuando: d.cuando, desdeElCelular: true,
      ...(texto(d.motivo) ? { motivo: texto(d.motivo) } : {}),
    };
    if (d.estado === 'publicada') {
      Object.assign(decision, {
        titulo: texto(d.titulo), copete: texto(d.copete), cuerpo: texto(d.cuerpo),
        guion: texto(d.guion) || `${texto(d.titulo).replace(/[.:]+$/, '')}.`,
        deIA: d.deIA === true,
      });
      for (const k of EXTRAS) if (d[k] != null) decision[k] = d[k];
    }
    notas[id] = decision;
  }
  for (const [id, r] of Object.entries(json?.redes ?? {})) {
    if (texto(r?.por) && esFecha(r?.cuando)) redes[id] = { por: texto(r.por), cuando: r.cuando };
  }
  return { notas, redes };
}

// Lo amarillo que no es para una persona: relleno de afuera que el filtro ya dejó
// afuera por cantidad de medios o por cupo, y la cotización del dólar. Son decenas
// por corrida y casi nunca se aprueban (lo mismo que avisa el WhatsApp,
// redes/avisos.mjs).
const RELLENO = /de afuera y poco contada|pas[oó] el cupo|cotizaci[oó]n del d[oó]lar/i;

const recortar = (t, n) => {
  const s = String(t ?? '').replace(/\s+/g, ' ').trim();
  return s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`;
};

/**
 * Lo que espera a una persona, con lo necesario para decidir en el celular
 * (29/09; Hernán: "es muy poca información para decidir"): el título, el resumen
 * de la fuente principal, el de CADA medio que la contó, el motivo por el que
 * espera, lo que anotó la IA al leerla (`fichas`: de dónde es el hecho, por qué
 * le importaría a un vecino) y las fuentes con su enlace.
 *
 * Nunca una roja (no se publica nunca, ni aprobada), ni lo de más de `horas`
 * (como el WhatsApp). Lo que se descartó desde el celular sigue en la lista,
 * marcado (`decision`), para poder deshacerlo mientras la nota esté en la ingesta.
 * Desde el 17/10/2026 (regla 200), de lo que no miró nadie, sólo lo de acá y como mucho cinco por día
 * (idsParaUnaPersona).
 */
export function paraDecidir(notas = [], decisiones = {}, {
  ahora = new Date(), horas = 72, maximo = 40, fichas = {},
} = {}) {
  const desde = ahora.getTime() - horas * 3600e3;
  const lista = [];
  // Lo que espera sin que nadie lo haya mirado, sólo lo de acá y con tope por día (regla 200). Lo que ya decidió o
  // marcó una persona sigue en la lista, sea de donde sea.
  const enVentana = (n) => {
    const t = Date.parse(n.fecha ?? '');
    return n.cuando === 'sin fecha en la fuente' || !Number.isFinite(t) || t >= desde;
  };
  const automaticas = (notas ?? []).filter((n) => n?.id && n.semaforo === 'amarillo' && !decisionHumana(decisiones?.[n.id])
    && !RELLENO.test(n.motivo ?? '') && enVentana(n));
  const paraUnaPersona = idsParaUnaPersona(automaticas);
  for (const n of notas ?? []) {
    if (!n?.id || n.semaforo === 'rojo') continue;
    const d = decisiones?.[n.id];
    const humana = decisionHumana(d);
    // Lo que una persona descartó desde el celular queda en la lista, marcado, para poder deshacerlo. (Hasta el 17/10 también
    // lo que el panel de la PC, retirado, dejaba "pendiente".)
    const descartadaEnElCelular = humana && d.estado === 'descartada';
    const esperando = humana ? descartadaEnElCelular : n.semaforo === 'amarillo';
    if (!esperando || (!humana && RELLENO.test(n.motivo ?? ''))) continue;
    if (!humana && !paraUnaPersona.has(n.id)) continue;
    if (!enVentana(n)) continue;
    const ficha = fichas?.[n.id];
    lista.push({
      id: n.id,
      titulo: recortar(n.titulo, 200),
      resumen: recortar(n.resumenFuente, 900),
      seccion: n.seccion ?? null,
      motivo: n.motivo ?? 'sin regla automática',
      fecha: n.fecha ?? null,
      local: !!n.local,
      fuentes: (n.origenes ?? []).filter((o) => o?.enlace).slice(0, 6).map((o) => ({
        medio: o.medio ?? null, enlace: o.enlace, fecha: o.fecha ?? null, oficial: !!o.oficial, resumen: recortar(o.resumen, 600),
      })),
      ...(ficha ? {
        ficha: {
          ambito: ficha.ambito ?? null,
          impacto: ficha.impacto ?? null,
          importancia: ficha.importancia ?? null,
          porque: recortar(ficha.porque, 300) || null,
          razon: ficha.razon && ficha.razon !== 'ninguna' ? ficha.razon : null,
        },
      } : {}),
      ...(descartadaEnElCelular ? { decision: { estado: d.estado, por: d.por, cuando: d.cuando } } : {}),
    });
  }
  return lista
    .sort((a, b) => (Date.parse(b.fecha ?? 0) || 0) - (Date.parse(a.fecha ?? 0) || 0))
    .slice(0, maximo);
}

// (El borrador que la IA escribía sola para lo que espera a una persona se sacó
// el 29/09: "si la nota no sale en automático, la idea es que no se escriba
// nada" (Hernán). Lo que espera se escribe sólo si una persona lo pide desde el
// celular. Regla 68.)

// -------------------------------------------------------------- la papelera

/** Cuántos días se puede volver a publicar una nota retirada por una persona. */
export const DIAS_EN_LA_PAPELERA = 30;

/**
 * La papelera (29/09; Hernán: "si las retiro de la web, ¿a dónde vuelven?"). Una
 * nota que retira una persona (desde el celular o en retiradas.json) pierde su página, y hasta ahora no había cómo recuperarla una
 * vez que la ingesta la dejaba de traer. Acá se guarda tal como estaba
 * publicada, y si una persona la vuelve a publicar, vuelve a su página con la
 * misma dirección.
 *
 *   papelera:   { id: { nota, cuando, por, motivo } } (la de la corrida anterior)
 *   retiradas:  Map id → { cuando, por, motivo }: lo que hoy está retirado por una persona
 *   vuelven:    Map id → { cuando, por }: lo que una persona aprobó (estado "publicada")
 *   conPagina:  Map id → nota: lo que tenía página antes de esta corrida
 *
 * Vuelve sólo lo que una persona aprobó DESPUÉS de retirarlo y ya no está
 * retirado. Que deje de estar retirado no alcanza: retiradas.json se poda solo
 * los lunes (regla 69) y eso no es volver a publicar.
 *
 * Devuelve { papelera, restaurar }: la papelera nueva y las notas que hay que
 * volver a publicar. Lo de más de DIAS_EN_LA_PAPELERA días se va. La papelera no
 * va al repositorio (es público, y una nota se puede retirar justamente por lo
 * que dice): vive en la caché de Actions y el celular la ve cifrada.
 */
export function papeleraAlDia({
  papelera = {}, retiradas = new Map(), vuelven = new Map(), conPagina = new Map(), ahora = new Date(),
} = {}) {
  const limite = ahora.getTime() - DIAS_EN_LA_PAPELERA * 864e5;
  const nueva = {};
  const restaurar = [];
  const vuelve = (id, e) => !retiradas.has(id) && vuelven.has(id)
    && (Date.parse(vuelven.get(id)?.cuando ?? '') || 0) > (Date.parse(e?.cuando ?? '') || 0);
  for (const [id, e] of Object.entries(papelera ?? {})) {
    if (vuelve(id, e)) {
      if (e?.nota) restaurar.push(e.nota);
      continue;
    }
    if (Date.parse(e?.cuando ?? '') >= limite) nueva[id] = e;
  }
  for (const [id, r] of retiradas) {
    if (nueva[id] || !conPagina.has(id)) continue;
    nueva[id] = { nota: conPagina.get(id), cuando: r.cuando ?? ahora.toISOString(), por: r.por ?? null, motivo: r.motivo ?? null };
  }
  return { papelera: nueva, restaurar };
}

/**
 * Lo que el celular necesita de cada nota de la papelera: lo que muestra y el
 * texto con el que la vuelve a publicar (una aprobación pide título, bajada y
 * cuerpo: problemaDeDecision). `aMano` son los ids de retiradas.json: para
 * volver a publicar ésas, el celular también las saca de ahí.
 */
export function paraLaPapelera(papelera = {}, { aMano = new Set() } = {}) {
  return Object.entries(papelera).map(([id, e]) => ({
    id,
    titulo: e.nota?.titulo ?? null,
    copete: e.nota?.copete ?? null,
    cuerpo: e.nota?.cuerpo ?? null,
    seccion: e.nota?.seccion ?? null,
    fecha: e.nota?.fecha ?? null,
    slug: e.nota?.slug ?? null,
    deIA: !!e.nota?.guion && !e.nota?.cuerpoAMano,
    retirada: e.cuando ?? null,
    por: e.por ?? null,
    motivo: e.motivo ?? null,
    desde: aMano.has(id) ? 'a mano' : 'panel',
  })).sort((a, b) => (Date.parse(b.retirada ?? 0) || 0) - (Date.parse(a.retirada ?? 0) || 0));
}

/**
 * Lo que necesita GitHub para escribir con IA una nota que pide el celular
 * (panel/celular.mjs): la nota como la trajo la ingesta, con sus fuentes y sus
 * resúmenes. No va al repositorio (es público): queda en la caché de Actions,
 * junto a la memoria del cruce (.cache/). Sólo lo que el celular puede pedir:
 * lo que espera a una persona y lo que espera cuerpo.
 */
export function notasParaEscribir(notas = []) {
  return (notas ?? [])
    .filter((n) => n?.id && n.semaforo !== 'rojo')
    .map((n) => ({
      id: n.id, titulo: n.titulo, seccion: n.seccion, medios: n.medios, fecha: n.fecha, cuando: n.cuando,
      local: n.local, temas: n.temas, resumenFuente: n.resumenFuente, fuentesTexto: n.fuentesTexto,
      origenes: n.origenes, semaforo: n.semaforo, motivo: n.motivo,
    }));
}
