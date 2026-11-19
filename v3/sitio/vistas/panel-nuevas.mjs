// Las pantallas nuevas del panel (etapas 2, 4 y 5 del plan): «Redes de hoy», «Estado» y «Cargar una nota» (formulario, vista previa de un borrador).
// Mismas reglas que vistas/panel.mjs: HTML armado en el servidor, todo lo que viene de la base o del formulario pasa por `esc`, botones de 44 px, nada de afuera.
import { esc, SECCIONES, fechaCorta } from '../util.mjs';
import { marco, aviso, opciones, fotoMostrable, badge } from './panel.mjs';
import { nombreDeRed } from '../panel-redes.mjs';
import { REGLAS_PIEZAS } from '../../redes/piezas-plan.mjs';

const hora = (iso) => { const d = new Date(Date.parse(iso) - 3 * 3600 * 1000); return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(11, 16); };
const FECHA_LARGA = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const diaEnLetras = (dia) => { try { return FECHA_LARGA.format(new Date(`${dia}T12:00:00Z`)); } catch { return dia; } };

const SIMBOLO = { ok: '✔', error: '✖', simulada: '·', simulado: '·' };
const accionesHtml = (acciones) => (acciones.length
  ? `<div class="cinta">${acciones.map((a) => `<span class="chip ${a.estado === 'ok' ? 'ok' : a.estado === 'error' ? 'mal' : 'ensayo'}">${esc(nombreDeRed(a.red))} ${SIMBOLO[a.estado] ?? '·'}${a.tipo ? ` ${esc(a.tipo.toLowerCase())}` : ''}</span>`).join('')}</div>${acciones.filter((a) => a.error).map((a) => `<p class="nota-chica">${esc(nombreDeRed(a.red))}: ${esc(a.error)}</p>`).join('')}`
  : '');
const MOTIVO_DE_FALLA = { error: 'No salió por un error', 'sin-datos': 'No salió: no había datos para armarla', 'sin-cupo': 'No salió: se acabó el cupo de voz del día' };

const ESTADO_DE_PIEZA = { publicada: ['salió', 'ok'], lista: ['armada en ensayo', 'ensayo'], 'en-curso': ['se está armando', ''], error: ['falló', 'mal'], 'sin-datos': ['sin datos', 'mal'], 'sin-cupo': ['sin cupo de voz', 'mal'] };

function filaDePieza(p, { conTituloDeNota = false } = {}) {
  const nota = conTituloDeNota && p.idNota ? `<br><a href="/panel/nota/${encodeURIComponent(p.idNota)}">«${esc(p.tituloNota || p.idNota)}»</a>` : '';
  const ensayo = p.simulado ? ' <span class="chip ensayo">ensayo</span>' : '';
  const [textoEstado, claseEstado] = ESTADO_DE_PIEZA[p.estado] ?? [p.estado, ''];
  const estado = conTituloDeNota ? ` <span class="chip ${claseEstado}">${esc(textoEstado)}</span>` : '';
  const falla = MOTIVO_DE_FALLA[p.estado];
  return `<li><div><span class="titulo">${esc(p.hora)} ${esc(p.nombre)}</span>${estado}${ensayo}${nota}
${falla ? `<p class="nota-chica" style="color:var(--rojo)">${esc(falla)}${p.error ? `: ${esc(p.error)}` : ''}</p>` : ''}${accionesHtml(p.acciones)}</div></li>`;
}
const lista = (items) => `<ul class="lista">${items.join('\n')}</ul>`;
const MOMENTO = { espera: 'todavía no es la hora', ahora: 'le toca ahora', paso: 'pasó su hora y no salió' };

/** GET /panel/redes: qué salió hoy, qué falló y por qué, qué está programado y qué salió de las notas. Sólo lectura. */
export function paginaRedesDeHoy({ datos, csrf, rol = 'dueno' }) {
  const d = datos;
  const sec = (titulo, cuerpo) => `<section class="caja"><h2>${titulo}</h2>${cuerpo}</section>`;
  const salio = d.yaSalio.length ? lista(d.yaSalio.map((p) => filaDePieza(p))) : '<p class="nota-chica">Todavía no salió ninguna pieza de video hoy.</p>';
  const partes = [
    sec('Ya salió', salio),
    d.enEnsayo.length ? sec('Armadas en ensayo (no se publicaron)', lista(d.enEnsayo.map((p) => filaDePieza(p)))) : '',
    d.fallaron.length ? sec('No salió', `${lista(d.fallaron.map((p) => filaDePieza(p)))}<p class="nota-chica">Una pieza que falló por un error se vuelve a intentar mientras siga dentro de su horario, hasta ${REGLAS_PIEZAS.intentosPorPieza} veces por día.</p>`) : '',
    d.enCurso.length ? sec('Armándose ahora', lista(d.enCurso.map((p) => filaDePieza(p)))) : '',
    sec('Programado', d.programadas.length
      ? lista(d.programadas.map((p) => `<li><div><span class="titulo">${esc(p.hora)} ${esc(p.nombre)}</span><p class="nota-chica">${esc(MOMENTO[p.momento])}${p.condicional ? ' · sale sólo si hay algo que contar' : ''}</p></div></li>`))
      : '<p class="nota-chica">No queda nada programado para hoy.</p>'),
    sec('Salen de notas (reels y fotos pedidos)', d.deNota.length || d.sinArmar.length
      ? lista([
        ...d.deNota.map((p) => filaDePieza(p, { conTituloDeNota: true })),
        ...d.sinArmar.map((n) => `<li><div><span class="titulo">Pedido: <a href="/panel/nota/${encodeURIComponent(n.id)}">«${esc(n.titulo || n.id)}»</a></span> <span class="chip">esperando su turno</span><p class="nota-chica">Lo toma el reloj de las piezas en su próxima vuelta (de 8 a 23 h).</p></div></li>`),
      ])
      : '<p class="nota-chica">Hoy no hay reels de notas.</p>'),
    sec('Posteos de notas', d.posteos.length
      ? `<table><tr><th>Hora</th><th>Red</th><th>Nota</th><th>Cómo</th></tr>${d.posteos.map((p) => `<tr><td>${esc(hora(p.cuando))}</td><td>${esc(nombreDeRed(p.red))}</td><td><a href="/panel/nota/${encodeURIComponent(p.notaId)}">${esc(p.titulo || p.notaId)}</a></td><td>${p.simulado ? '<span class="chip ensayo">ensayo</span>' : p.estado === 'ok' ? '<span class="chip ok">salió</span>' : p.estado === 'error' ? '<span class="chip mal">falló</span>' : esc(p.estado)}${p.error ? `<br><span class="nota-chica">${esc(p.error)}</span>` : ''}</td></tr>`).join('')}</table>`
      : '<p class="nota-chica">Hoy no salió ningún posteo de notas.</p>'),
    sec('Cupo de voz', `<p><span class="cuenta">${d.cupo.usado} de ${d.cupo.tope}</span> audios usados hoy.</p>`),
  ].filter(Boolean).join('\n');
  const cuerpo = `<h1>Redes de hoy · ${esc(diaEnLetras(d.dia))}</h1>
${d.hayTablas ? '' : '<p class="nota-chica">Todavía no hay nada anotado hoy (o la base no tiene las tablas de las redes).</p>'}
${partes}
<p class="nota-chica">Esta pantalla sólo muestra: no cambia nada. La hora es la de Balcarce.</p>`;
  return marco('Redes de hoy', cuerpo, { csrf, rol, activa: 'redes' });
}

/** GET /panel/ajustes: el estado (sólo lectura, sin interruptores). Sólo para dueños. */
export function paginaEstado({ datos, csrf, rol = 'dueno' }) {
  const d = datos;
  const p = d.publica;
  const publica = p.valor === 'si' ? '<span class="chip ok">Publican de verdad</span>' : p.valor === 'no' ? '<span class="chip ensayo">En ensayo: no publican</span>' : '<span class="chip">No se sabe todavía</span>';
  const de = { variable: 'Según la variable REDES_ACTIVAS.', 'lo-ultimo-que-salio': 'Se deduce de lo último que armaron las redes (el interruptor vive en el Worker de las redes: REDES_ACTIVAS en su wrangler.toml).', 'sin-datos': 'No hay piezas ni posteos de los últimos días para saberlo.' }[p.fuente];
  const errores = d.errores.map((e) => `<tr><td>${esc(e.nombre)}</td><td>${e.error ? `${esc(fechaCorta(e.error.cuando))} ${esc(hora(e.error.cuando))}<br><span class="nota-chica">${esc(e.error.mensaje)} (${esc(e.error.de)})</span>` : '<span class="nota-chica">sin errores anotados</span>'}</td></tr>`).join('');
  const cuerpo = `<h1>Estado</h1>
<section class="caja"><h2>Las redes</h2><p>${publica}</p><p class="nota-chica">${esc(de)}</p></section>
<section class="caja"><h2>Cupo de voz de hoy</h2><p><span class="cuenta">${d.cupo.usado} de ${d.cupo.tope}</span> audios usados.</p></section>
<section class="caja"><h2>Notas publicadas hoy</h2><p><span class="cuenta">${d.notasHoy.total}</span> en total · ${d.notasHoy.propias} propias · ${d.notasHoy.automaticas} automáticas</p></section>
<section class="caja"><h2>Último error de cada red</h2><table><tr><th>Red</th><th>Último error</th></tr>${errores}</table></section>
<p class="nota-chica">Esta pantalla sólo muestra: no tiene interruptores ni cambia nada.</p>`;
  return marco('Estado', cuerpo, { csrf, rol, activa: 'ajustes' });
}

// ------------------------------------------------------------------------------------------------------------ cargar una nota

const CASILLA = 'style="width:22px;height:22px"';

/** El formulario de una nota (nueva o un borrador). `valores`: lo escrito. `borrador`: { id, fotos } si se está editando uno. */
function formulario({ csrf, accion, valores, borrador = null }) {
  const v = valores;
  const campos = `<input type="hidden" name="csrf" value="${esc(csrf)}">
<label for="titulo">Título (entero, sin «…» al final)</label><input type="text" id="titulo" name="titulo" value="${esc(v.titulo)}" maxlength="300" required>
<label for="bajada">Bajada</label><textarea class="bajada" id="bajada" name="bajada" maxlength="600" required>${esc(v.bajada)}</textarea>
<label for="seccion-nota">Sección</label><select id="seccion-nota" name="seccion">${opciones(SECCIONES.map((s) => [s.nombre, s.nombre]), v.seccion)}</select>
<label for="cuerpo">Cuerpo <span class="nota-chica">(al menos 3 párrafos; dejá una línea en blanco entre uno y otro)</span></label><textarea id="cuerpo" name="cuerpo" maxlength="40000" required>${esc(v.cuerpo)}</textarea>
<label for="firma">Firma</label><input type="text" id="firma" name="firma" value="${esc(v.firma)}" maxlength="80" required>
<label for="fuente_medio">Fuente (opcional): medio</label><input type="text" id="fuente_medio" name="fuente_medio" value="${esc(v.fuenteMedio)}" maxlength="80">
<label for="fuente_url">Fuente (opcional): enlace</label><input type="text" id="fuente_url" name="fuente_url" value="${esc(v.fuenteUrl)}" maxlength="500" inputmode="url" placeholder="https://…">
<label for="video">Video de YouTube propio (opcional): pegá la dirección</label><input type="text" id="video" name="video" value="${esc(v.video)}" maxlength="200" inputmode="url">
<label for="video_titulo">Título del video (opcional)</label><input type="text" id="video_titulo" name="video_titulo" value="${esc(v.videoTitulo)}" maxlength="120">
<p class="nota-chica">Sólo videos del canal de Radar o de Se hace. Se guarda nada más que el código del video; sale después del primer párrafo.</p>
<label class="sala"><input type="checkbox" name="pide_criterio" value="si"${v.pideCriterio ? ' checked' : ''} ${CASILLA}> Pasarla por el criterio de Radar (IA)</label>
<p class="nota-chica">Todavía no revisa la IA: la casilla queda anotada en la nota y, por ahora, la revisa la redacción antes de dejarla a la vista.</p>`;
  const fotos = borrador ? '' : `<label for="fotos-nuevas">Fotos (opcional; JPG, PNG o WEBP, hasta 10, de 8 MB cada una)</label><input type="file" id="fotos-nuevas" name="fotos" accept="image/jpeg,image/png,image/webp" multiple>
<label for="credito-fotos">Crédito de las fotos</label><input type="text" id="credito-fotos" name="credito" value="Radar Balcarce" maxlength="200">`;
  const enctype = borrador ? '' : ' enctype="multipart/form-data"';
  return `<form method="post" action="${accion}"${enctype}>${campos}${fotos}
<button type="submit">${borrador ? 'Guardar los cambios' : 'Guardar como borrador y ver la vista previa'}</button>
<p class="nota-chica">Se guarda como borrador: no se ve en el sitio, ni en el mapa del sitio, ni sale a las redes hasta que toques «Publicar».</p></form>`;
}

export const VALORES_VACIOS = Object.freeze({ titulo: '', bajada: '', seccion: 'Balcarce', cuerpo: '', firma: 'Hernán Accomo', fuenteMedio: '', fuenteUrl: '', video: '', videoTitulo: '', pideCriterio: false });

/** GET /panel/pedir (y el mismo formulario con error): nota nueva. `borradores`: los que quedaron a medias. */
export function paginaPedir({ csrf, rol = 'dueno', valores = VALORES_VACIOS, error = null, ok = null, borradores = [] }) {
  const aMedias = borradores.length
    ? `<section class="caja"><h2>Borradores a medias</h2><ul class="lista">${borradores.map((b) => `<li><a class="fila" href="/panel/borrador/${encodeURIComponent(b.id)}"><span><span class="titulo">${esc(b.titulo || '(sin título)')}</span><span class="datos">${esc(b.seccion || '')} · ${esc(fechaCorta(b.creada))}</span></span></a></li>`).join('')}</ul></section>`
    : '';
  const cuerpo = `<h1>Cargar una nota</h1>
${aviso(ok, error)}
${aMedias}
<section class="caja">${formulario({ csrf, accion: '/panel/pedir', valores })}</section>`;
  return marco('Cargar una nota', cuerpo, { csrf, rol, activa: 'pedir' });
}

/** La vista previa de un borrador, con los botones Publicar, Seguir editando y Descartar. `b`: borradorParaVer. */
export function paginaBorrador({ b, csrf, rol = 'dueno', ok = null, error = null }) {
  const base = `/panel/borrador/${encodeURIComponent(b.id)}`;
  const oculto = `<input type="hidden" name="csrf" value="${esc(csrf)}">`;
  const portada = fotoMostrable(b.fotos[0]?.url);
  const video = b.video ? `<p class="nota-chica">🎬 Video de YouTube (${esc(b.video)}): se verá después del primer párrafo.${b.videoTitulo ? ` Título: ${esc(b.videoTitulo)}.` : ''}</p>` : '';
  const fuente = b.fuenteMedio || b.fuenteUrl ? `<p class="nota-chica">Fuente: ${esc(b.fuenteMedio || '')}${b.fuenteUrl ? ` · ${esc(b.fuenteUrl)}` : ''}</p>` : '';
  const vista = `<article class="vista-previa vista"><p>${badge('borrador')} <span class="nota-chica">${esc(b.seccion)} · ${esc(b.firma)}</span></p>
${portada ? `<img src="${esc(portada)}" alt="" style="margin:10px 0;border-radius:8px">` : ''}
<h2>${esc(b.titulo)}</h2>
<p class="baj">${esc(b.bajada)}</p>
${b.parrafos.map((p, i) => `<p>${esc(p)}</p>${i === 0 ? video : ''}`).join('\n')}
${b.parrafos.length ? '' : video}
${fuente}
${b.fotos.length > 1 ? `<p class="nota-chica">Más fotos: ${b.fotos.length - 1}.</p>` : ''}
</article>`;
  const criterio = b.pideCriterio ? '<p class="error" role="status" style="font-weight:400">Pidió pasar por el criterio de Radar (IA): todavía no lo hace la IA, la revisa la redacción antes de publicar.</p>' : '';
  const fotosActuales = b.fotos.length
    ? `<form method="post" action="${base}/fotos">${oculto}<input type="hidden" name="accion" value="guardar">
${b.fotos.map((f, i) => { const u = fotoMostrable(f.url); return `<div class="foto">${u ? `<img src="${esc(u)}" alt="" loading="lazy">` : ''}
<label class="chequeos" style="margin:0"><span><input type="radio" name="portada" value="${i}"${i === 0 ? ' checked' : ''}> De portada</span></label>
<label for="credito-${i}">Crédito</label><input type="text" id="credito-${i}" name="credito_${i}" value="${esc(f.credito)}" maxlength="200">
<label class="chequeos" style="margin:0"><span><input type="checkbox" name="borrar_${i}" value="si"> Sacar esta foto</span></label></div>`; }).join('\n')}
<button type="submit">Guardar las fotos</button></form>`
    : '<p>Sin fotos: sale con la placa de su sección.</p>';
  const fotos = `<details class="caja" id="fotos"><summary>Fotos</summary>${fotosActuales}
<form method="post" action="${base}/fotos" enctype="multipart/form-data" style="margin-top:14px">${oculto}<input type="hidden" name="accion" value="subir">
<label for="nuevas">Sumar fotos (JPG, PNG o WEBP; hasta 10, de 8 MB cada una)</label><input type="file" id="nuevas" name="fotos" accept="image/jpeg,image/png,image/webp" multiple>
<label for="credito-nuevas">Crédito de las fotos nuevas</label><input type="text" id="credito-nuevas" name="credito" value="Radar Balcarce" maxlength="200">
<button type="submit">Subir</button></form></details>`;
  const cuerpo = `<p><a href="/panel/pedir">← Cargar otra nota</a></p>
<h1>Vista previa</h1>
${aviso(ok, error)}
<p class="nota-chica">Así queda el texto. Todavía es un borrador: no se ve en el sitio ni sale a las redes.</p>
${criterio}
${vista}
<section class="caja"><div class="rapidas">
<form method="post" action="${base}/publicar" onsubmit="return confirm('¿Publicar la nota? Se va a ver en el sitio.')">${oculto}<button type="submit">Publicar</button></form>
<a class="boton claro" href="${base}/editar">Seguir editando</a>
<form method="post" action="${base}/descartar" onsubmit="return confirm('¿Descartar el borrador? Deja de aparecer en el panel.')">${oculto}<button class="peligro" type="submit">Descartar</button></form>
</div><p class="nota-chica">Publicada, queda como una nota propia: firma «${esc(b.firma)}», origen redacción, y sin salir a las redes hasta que pidas un reel desde la nota.</p></section>
${fotos}`;
  return marco('Vista previa', cuerpo, { csrf, rol, activa: 'pedir' });
}

/** Seguir editando un borrador: el mismo formulario, con lo ya escrito. */
export function paginaEditarBorrador({ b, valores = null, csrf, rol = 'dueno', error = null }) {
  const v = valores ?? { titulo: b.titulo, bajada: b.bajada, seccion: b.seccion, cuerpo: b.parrafos.join('\n\n'), firma: b.firma, fuenteMedio: b.fuenteMedio, fuenteUrl: b.fuenteUrl, video: b.video, videoTitulo: b.videoTitulo, pideCriterio: b.pideCriterio };
  const cuerpo = `<p><a href="/panel/borrador/${encodeURIComponent(b.id)}">← Volver a la vista previa</a></p>
<h1>Seguir editando</h1>
${aviso(null, error)}
<section class="caja">${formulario({ csrf, accion: `/panel/borrador/${encodeURIComponent(b.id)}/editar`, valores: v, borrador: b })}</section>
<p class="nota-chica">Las fotos se cambian desde la vista previa («Fotos»).</p>`;
  return marco('Seguir editando', cuerpo, { csrf, rol, activa: 'pedir' });
}
