// La pantalla de entrada del panel: "Hoy" (8/10/2026, rediseño del panel; maqueta en docs/propuestas/material/panel-nuevo-maqueta.html).
//
// Junta en un solo lugar lo que hay que mirar al abrir el panel: qué espera el toque de una persona, qué borradores de la IA hay para leer,
// cuántas notas no tienen foto, cómo viene el día en las redes y si hay una pista con novedad. Cada renglón es un atajo a la pestaña donde se
// resuelve. No decide nada ni publica nada: sólo muestra y lleva. Funciones puras, sin datos de afuera (se prueban en pruebas/panel-hoy.test.mjs).

import { htmlDelCartelDePausa } from './nube.js';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const BALCARCE = 'America/Argentina/Buenos_Aires';

/** "jueves 8": el día de Balcarce de una fecha. */
export function diaDeHoy(ahora = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: BALCARCE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora).split('-').map(Number);
  return `${DIAS[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()]} ${p[2]}`;
}

/** La hora (en Balcarce) del próximo armado de la web: cada media hora, en punto y y media. */
export function proximoArmado(ahora = new Date()) {
  const t = new Date(Math.ceil((ahora.getTime() + 1) / 1800e3) * 1800e3);
  return new Intl.DateTimeFormat('es-AR', { timeZone: BALCARCE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(t);
}

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/**
 * Lo que se muestra, ya contado. `datos`:
 *   esperan { n, deBalcarce, masVieja }    notas que esperan el OK de una persona
 *   sinCuerpo                              notas que salen solas pero todavía no tienen cuerpo
 *   borradores { listos, conMarca, enCurso:[titulo] }   lo que se le pidió a la IA
 *   sinFoto { n, firmes }                  notas de la portada sin foto, y cuántas por una regla firme
 *   redes { problemas, salieron, total, proxima:{ que, hora }|null } | null
 *   pistas, graves                         pistas con novedad y avisos graves de la revisión
 */
export function resumenDeHoy(datos = {}, ahora = new Date()) {
  const e = datos.esperan ?? { n: 0, deBalcarce: 0, masVieja: null };
  const b = datos.borradores ?? { listos: 0, conMarca: 0, enCurso: [] };
  const f = datos.sinFoto ?? { n: 0, firmes: 0 };
  const necesitaToque = [];
  if (e.n) {
    necesitaToque.push({
      id: 'esperan', n: e.n, titulo: e.n === 1 ? 'Nota espera tu OK' : 'Notas esperan tu OK',
      detalle: `${e.deBalcarce ? `${e.deBalcarce} de Balcarce` : 'ninguna de Balcarce'}${e.masVieja ? ` · la más vieja, ${e.masVieja}` : ''}`,
    });
  }
  if (datos.sinCuerpo) necesitaToque.push({ id: 'esperan', n: datos.sinCuerpo, titulo: datos.sinCuerpo === 1 ? 'Nota sin cuerpo todavía' : 'Notas sin cuerpo todavía', detalle: 'la IA las vuelve a intentar sola' });
  if (b.listos) {
    necesitaToque.push({
      id: 'borradores', n: b.listos, titulo: b.listos === 1 ? 'Borrador listo para leer' : 'Borradores listos para leer',
      detalle: b.conMarca ? `${plural(b.conMarca, 'tiene algo', 'tienen algo')} marcado por el verificador` : 'el verificador no marcó nada',
    });
  }
  if (f.n) {
    const arreglables = f.n - (f.firmes ?? 0);
    necesitaToque.push({ id: 'fotos', n: f.n, titulo: f.n === 1 ? 'Nota de la portada sin foto' : 'Notas de la portada sin foto', detalle: `${arreglables} se pueden arreglar${f.firmes ? ` · ${f.firmes} por una regla firme` : ''}` });
  }
  const delDia = [];
  if (datos.redes) {
    const r = datos.redes;
    delDia.push({
      id: 'redes', icono: r.problemas ? '⚠' : '✓',
      titulo: r.problemas ? plural(r.problemas, 'problema en las redes de hoy', 'problemas en las redes de hoy') : `Redes: ${r.salieron} de ${r.total} piezas salieron`,
      detalle: r.proxima ? `Próxima: ${r.proxima.que} a las ${r.proxima.hora}` : (r.total ? 'No queda nada más por hoy' : ''),
    });
  }
  if (datos.pistas) delDia.push({ id: 'pistas', icono: '●', titulo: plural(datos.pistas, 'pista con novedad', 'pistas con novedad'), detalle: 'La cubrió un medio más o cambió algo' });
  if (datos.graves) delDia.push({ id: 'revision', icono: '⚠', titulo: plural(datos.graves, 'aviso grave de la revisión', 'avisos graves de la revisión'), detalle: 'La IA marcó algo en notas ya publicadas' });
  return {
    fecha: diaDeHoy(ahora),
    generado: datos.generado ?? null,
    proximoArmado: proximoArmado(ahora),
    enCurso: b.enCurso ?? [],
    necesitaToque,
    delDia,
    // Regla 317: la pausa general (si está prendida) y cómo viene el motor (su última vuelta), que contesta la nube (nube.js). Sin eso, como siempre.
    pausa: datos.pausa ?? null,
    motor: datos.motor ?? null,
    todoEnOrden: !necesitaToque.length && !delDia.some((x) => x.icono === '⚠') && !datos.pausa && datos.motor?.clase !== 'mal',
  };
}

/** El HTML de la pantalla. `apps`: { esc, haceCuanto, horaEnBalcarce } (los de app.js). */
export function htmlDeHoy(r, { esc, haceCuanto, horaEnBalcarce }) {
  const fila = (x, conNumero) => `<button type="button" class="tarjeta fila-hoy" data-pestana="${esc(x.id)}">
      <div class="menu-item">${conNumero ? `<span class="numero-hoy">${esc(x.n)}</span>` : `<span class="menu-icono">${esc(x.icono)}</span>`}
      <div><div class="titulo">${esc(x.titulo)}</div>${x.detalle ? `<div class="meta">${esc(x.detalle)}</div>` : ''}</div><span class="meta">›</span></div></button>`;
  const web = r.pausa
    ? 'La web ya publicada sigue andando; no se arma nada nuevo hasta que reanudes.'
    : (r.generado ? `La web se armó a las ${esc(horaEnBalcarce(r.generado))} (${esc(haceCuanto(r.generado))}) · la próxima, a las ${esc(r.proximoArmado)}.` : `La próxima actualización de la web, a las ${esc(r.proximoArmado)}.`);
  const curso = r.enCurso.length
    ? `<p class="estado">✎ La IA está escribiendo ${r.enCurso.map((t) => `“${esc(t)}”`).join(', ')}.</p>` : '';
  const motor = r.motor ? `<p class="${r.motor.clase === 'mal' ? 'problemas' : 'estado'}">⚙ ${esc(r.motor.texto)}</p>` : '';
  return `<h1>Hoy, ${esc(r.fecha)}</h1>
    <button type="button" class="boton principal ancho" data-pestana="escribir">✍ Escribir una nota</button>
    ${r.pausa ? htmlDelCartelDePausa(r.pausa, { esc, haceCuanto }) : ''}
    <p class="estado">${web}</p>${motor}${curso}
    ${r.necesitaToque.length ? `<h2>Necesita tu toque</h2>${r.necesitaToque.map((x) => fila(x, true)).join('')}` : ''}
    ${r.delDia.length ? `<h2>Cómo viene el día</h2>${r.delDia.map((x) => fila(x, false)).join('')}` : ''}
    ${r.todoEnOrden ? '<p class="vacio">✓ No hay nada que necesite tu toque ahora. Todo en orden.</p>' : ''}`;
}
