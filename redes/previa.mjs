// Lo que va a salir hoy en las redes, para el panel del celular (29/09).
//
// Hernán pidió ver el cronograma y "qué noticias se van a elegir en los
// podcasts". Esto arma esa vista con las mismas reglas que usan el reloj y el
// plan: el cronograma del día (redes/piezas.mjs), las notas de cada repaso
// (redes/repasos.mjs, la misma función que usa reels/plan.mjs) y la cola de
// Facebook (redes/elegir.mjs). Lo escribe "Actualizar la web" cada media hora en
// web/data/celular-estado.json; el celular le suma lo que ya salió mirando el
// libro (web/data/redes.json), que se actualiza en cada vuelta de las redes.
//
// Todo es de lo ya publicado en la web, así que no hay nada que cifrar. Sin
// dependencias.

import { cronogramaDelDia, PODCASTS, ventanaDe } from './piezas.mjs';
import {
  vaAFacebookPorLoQueEs, aprobadaParaLasRedes, temaParecido, yaPublicada, REGLAS_FACEBOOK,
} from './elegir.mjs';
import { repasosDelDia } from './repasos.mjs';
import { REPARTO } from './prompt-redes.mjs';
import { diaAR, minutoDelDiaAR, minutosDeHora } from '../ingesta/zona.mjs';

/** Cómo se llama cada pieza para una persona. */
export const NOMBRES_DE_PIEZAS = {
  'clima-manana': 'El clima de la mañana',
  noticia1: 'El repaso de la mañana',
  utiles: 'Los teléfonos útiles',
  noticia2: 'El repaso de la tarde',
  agenda: 'La agenda del fin de semana',
  'participa-noticias': 'Participá: mandanos noticias',
  'participa-evento': 'Tu evento o emprendimiento',
  'participa-reclamos': 'Tu reclamo',
  'participa-nota': 'Tu nota',
  feriado: 'El feriado',
  farmacia: 'La farmacia de turno',
  'clima-noche': 'Cómo sigue el clima esta noche',
  podcast: 'El repaso del día',
};

const nombreDePieza = (nombre) => NOMBRES_DE_PIEZAS[nombre] ?? (String(nombre).startsWith('aviso-') ? 'Aviso de clima' : nombre);
const vozDe = (nombre) => REPARTO[String(nombre).startsWith('aviso-') ? 'aviso' : nombre] ?? null;
const minutosDesde = (iso, ahora) => (ahora.getTime() - Date.parse(iso)) / 60000;

/** Dónde está una pieza en su día: 'antes' de su hora, 'en-hora' (dentro de su
 *  ventana: el reloj la puede armar) o 'cerrada' (pasó la ventana; si no salió,
 *  ya no sale hoy). */
export function momentoDePieza(hora, ventana, ahora = new Date()) {
  const desde = minutosDeHora(hora);
  const ahoraMin = minutoDelDiaAR(ahora);
  if (ahoraMin < desde) return 'antes';
  return ahoraMin < desde + ventana ? 'en-hora' : 'cerrada';
}

/**
 * La previa del día: { generado, piezas, repasos, facebook }.
 *
 *   · piezas: el cronograma de hoy (hora, nombre, qué es, voz, historia o reel);
 *   · repasos: por cada uno, las notas que contó (si ya salió) o las que contaría
 *     si saliera ahora (puede cambiar si entran notas nuevas o si una se retira);
 *   · facebook: lo que salió hoy, la cola (las marcadas por una persona primero)
 *     y cuándo puede salir el próximo.
 */
export function previaDelDia({ portada = {}, libro = {}, archivo = [], ahora = new Date() } = {}) {
  const hoy = diaAR(ahora);
  const notas = [...(portada.notas ?? [])].sort((a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0));
  // Los títulos, también del archivo: una nota que ya se contó puede no estar más en la portada.
  const porId = new Map([...(archivo ?? []), ...notas].map((n) => [n.id, n]));
  const nota = (id) => ({ id, titulo: porId.get(id)?.titulo ?? null, seccion: porId.get(id)?.seccion ?? null });

  const piezas = cronogramaDelDia(ahora, { clima: portada.clima ?? null }).map((p) => ({
    nombre: p.nombre, tipo: p.tipo, hora: p.hora, que: nombreDePieza(p.nombre), voz: vozDe(p.nombre), ventana: ventanaDe(p.nombre),
    momento: momentoDePieza(p.hora, ventanaDe(p.nombre), ahora),
    salio: libro?.instagram?.[`${hoy}/${p.nombre}`]?.cuando ?? null,
  }));

  const pendientes = repasosDelDia(notas, { libro, fecha: ahora });
  const repasos = PODCASTS.map((p) => {
    const hecho = libro?.instagram?.[`${hoy}/${p.nombre}`] ?? null;
    const momento = momentoDePieza(p.hora, ventanaDe(p.nombre), ahora);
    // Si ya pasó su hora y no salió, hoy ya no sale: no se muestran notas.
    const ids = hecho
      ? [...new Set([hecho.notaId, ...(hecho.notaIds ?? [])].filter(Boolean))]
      : (momento === 'cerrada' ? [] : (pendientes[p.nombre]?.notas ?? []).map((n) => n.id));
    return {
      nombre: p.nombre, titulo: p.titulo, hora: p.hora, voz: vozDe(p.nombre), momento,
      salio: hecho?.cuando ?? null,
      segundos: hecho || momento === 'cerrada' || !pendientes[p.nombre] ? null : Math.round(pendientes[p.nombre].segundos),
      notas: ids.map(nota),
    };
  });

  // Facebook, con las mismas reglas que elegirParaFacebook: sin repetir un tema de
  // las últimas 24 horas y sólo lo que tiene edad de salir (hasta 8 horas desde que
  // salió en la web, o desde que una persona la marcó).
  const publicados = Object.entries(libro?.facebook ?? {});
  const deHoy = publicados
    .filter(([, v]) => v?.cuando && diaAR(new Date(v.cuando)) === hoy)
    .map(([id, v]) => ({ id, titulo: v.titulo ?? porId.get(id)?.titulo ?? null, cuando: v.cuando }))
    .sort((a, b) => Date.parse(a.cuando) - Date.parse(b.cuando));
  const recientes = publicados
    .filter(([, v]) => v?.cuando && minutosDesde(v.cuando, ahora) <= REGLAS_FACEBOOK.horasSinRepetirTema * 60)
    .map(([id, v]) => ({ titulo: v.titulo, temas: v.temas ?? porId.get(id)?.temas ?? [] }));
  const cola = notas
    .filter((n) => !yaPublicada(libro, 'facebook', n.id) && vaAFacebookPorLoQueEs(n))
    .filter((n) => !recientes.some((p) => temaParecido(n, p)))
    .filter((n) => {
      const salio = n.aprobadaParaRedes ?? n.publicadaCuando ?? n.fecha;
      return salio && minutosDesde(salio, ahora) <= REGLAS_FACEBOOK.edadMaximaHoras * 60;
    })
    .sort((a, b) => (Number(aprobadaParaLasRedes(b)) - Number(aprobadaParaLasRedes(a))) || ((b.relevancia ?? 0) - (a.relevancia ?? 0)))
    .slice(0, 8)
    .map((n) => ({ ...nota(n.id), marcada: aprobadaParaLasRedes(n) }));
  const ultimo = publicados.reduce((max, [, v]) => Math.max(max, Date.parse(v?.cuando ?? '') || 0), 0);
  return {
    generado: ahora.toISOString(),
    piezas,
    repasos,
    facebook: {
      hoy: deHoy,
      cola,
      cupo: Math.max(0, REGLAS_FACEBOOK.porDia - deHoy.length),
      proximoDesde: ultimo ? new Date(ultimo + REGLAS_FACEBOOK.minutosEntrePosteos * 60000).toISOString() : null,
      // Las reglas, para que el celular recalcule con el libro de ahora sin números propios.
      porDia: REGLAS_FACEBOOK.porDia,
      minutosEntrePosteos: REGLAS_FACEBOOK.minutosEntrePosteos,
      edadMaximaHoras: REGLAS_FACEBOOK.edadMaximaHoras,
      desdeHora: REGLAS_FACEBOOK.desdeHora,
      hastaHora: REGLAS_FACEBOOK.hastaHora,
    },
  };
}
