// Las páginas del panel privado (/panel, REGLAS.md «El panel»). HTML armado en el servidor, pensado para el celular, sin nada de afuera.
// Todo lo que viene de la base o del pedido pasa por `esc`. La lógica (sesión, base, depósito) está en ../panel.mjs; acá sólo se dibuja.
import { esc, SECCIONES, ranuraDe, fechaCorta } from '../util.mjs';
import { ESTILOS } from './base.mjs';
import { nombreDeRed } from '../panel-redes.mjs';

// Los colores de las secciones, los mismos del sitio (se sacan de ESTILOS para no tener otra copia).
const COLORES = (ESTILOS.match(/--s-[a-z]+:#[0-9a-f]{3,8}/gi) || []).join(';');

const CSS = `:root{${COLORES};--tinta:#14161A;--suave:#5C6068;--linea:#E4DFD2;--fondo:#F4F1EA;--papel:#FFFDF8;--azul:#0B57D0;--rojo:#B3261E;--verde:#1B6E3A}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--fondo);color:var(--tinta);font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow-wrap:break-word}
a{color:var(--azul)}img{max-width:100%;display:block}
.barra{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 16px;background:var(--tinta);color:#fff;position:sticky;top:0;z-index:5}
.barra a{color:#fff;font-weight:700;text-decoration:none}.barra form{margin:0}
main{max-width:760px;margin:0 auto;padding:16px}
h1{font-size:22px;margin:4px 0 12px}h2{font-size:18px;margin:0 0 10px}
.caja{background:var(--papel);border:1px solid var(--linea);border-radius:10px;padding:14px;margin:0 0 16px}
label{display:block;font-weight:600;font-size:14px;margin:10px 0 4px}
input[type=text],input[type=search],select,textarea{width:100%;font:inherit;padding:10px;border:1px solid #bbb;border-radius:8px;background:#fff}
textarea{min-height:320px;line-height:1.5}textarea.bajada{min-height:90px}
button,.boton{display:inline-block;font:600 16px system-ui,sans-serif;padding:11px 16px;border-radius:8px;border:0;background:var(--azul);color:#fff;cursor:pointer;text-decoration:none;margin:6px 6px 0 0}
button.chico{padding:6px 12px;font-size:14px;margin:0;background:#3a3f47}
button.peligro{background:var(--rojo)}button.gris{background:#5C6068}
.ok,.error{padding:10px 12px;border-radius:8px;margin:0 0 14px;font-weight:600}
.ok{background:#E3F4E8;color:var(--verde)}.error{background:#FBE4E2;color:var(--rojo)}
.filtros{display:grid;grid-template-columns:1fr 1fr;gap:8px}.filtros .todo{grid-column:1/-1}
.lista{list-style:none;margin:0;padding:0}
.lista li{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--linea)}
.lista a.fila{display:flex;gap:10px;color:inherit;text-decoration:none;width:100%}
.mini{flex:0 0 72px;width:72px;height:54px;border-radius:6px;object-fit:cover;background:var(--s-argentina)}
.datos{font-size:13px;color:var(--suave);margin-top:4px}
.titulo{font-weight:600;line-height:1.3}
.estado{display:inline-block;font-size:12px;font-weight:700;padding:1px 7px;border-radius:10px;color:#fff;background:#5C6068}
.estado.publicada{background:var(--verde)}.estado.oculta{background:#8a6d00}.estado.retirada{background:var(--rojo)}
.paginas{display:flex;justify-content:space-between;margin:14px 0}
.vista h2{font-size:21px;line-height:1.25}.vista .baj{color:var(--suave)}
.foto{border:1px solid var(--linea);border-radius:8px;padding:8px;margin:0 0 10px}
.foto img{max-height:220px;width:auto;margin:0 0 6px;border-radius:6px}
.chequeos label{display:flex;gap:8px;align-items:center;font-weight:400;font-size:16px;margin:8px 0}
.chequeos input[type=checkbox]{width:22px;height:22px;flex:0 0 22px}
.filtros>*,.lista a.fila>*{min-width:0}select{max-width:100%}main{overflow-x:hidden}
.nota-chica{font-size:13px;color:var(--suave)}
table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid var(--linea);padding:4px;text-align:left}
.lista li{flex-wrap:wrap}.acciones{display:flex;flex-wrap:wrap;gap:8px;width:100%;padding-left:82px}.acciones form{margin:0}
.acciones button,.acciones .boton,.rapidas button,.rapidas .boton{min-height:44px;margin:0}
.rapidas{display:flex;flex-wrap:wrap;gap:8px}.rapidas form{margin:0}
button.claro,.boton.claro{background:#fff;color:var(--tinta);border:1px solid #bbb}
.sala{display:flex;gap:8px;align-items:center;font-weight:400;margin:8px 0}
details.caja>summary{font-weight:700;font-size:18px;cursor:pointer;min-height:44px;display:flex;align-items:center}
details.caja[open]>summary{margin-bottom:8px}
.fotos-reel{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
.fotos-reel label{font-weight:400;margin:0}.fotos-reel img{height:90px;width:100%;object-fit:cover;border-radius:6px}
.menu{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.menu .boton{margin:0;min-height:44px}
.navbar{display:flex;flex-wrap:wrap;gap:6px;width:100%}.navbar a{min-height:44px;display:inline-flex;align-items:center;padding:0 14px;border-radius:8px;border:1px solid #5C6068;font-weight:600}
.navbar a.activa{background:#fff;color:var(--tinta)}.barra{flex-wrap:wrap}
.cinta{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0}.chip{display:inline-block;font-size:13px;font-weight:700;padding:2px 9px;border-radius:10px;background:#E4DFD2;color:var(--tinta)}
.chip.ok{background:#E3F4E8;color:var(--verde)}.chip.mal{background:#FBE4E2;color:var(--rojo)}.chip.ensayo{background:#FFF1C7;color:#6b5400}
.cuenta{font-size:28px;font-weight:800}
.vista-previa{background:#fff;border:2px dashed #8a6d00;border-radius:10px;padding:14px;margin:0 0 16px}`;

/** Dónde puede salir un reel pedido desde el panel (clave guardada, nombre para las personas). X se guarda como `twitter`, el nombre que usa Buffer. */
export const DESTINOS_DEL_REEL = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'], ['twitter', 'X'], ['threads', 'Threads'], ['bluesky', 'Bluesky']];

/** La barra de arriba: de acá se llega a cada pantalla. «Estado» sólo la ven los dueños (los editores no entran). */
export function menuDe(rol, activa) {
  const items = [['notas', '/panel', 'Notas'], ['redes', '/panel/redes', 'Redes de hoy'], ['pedir', '/panel/pedir', 'Cargar una nota'], ...(rol === 'dueno' ? [['ajustes', '/panel/ajustes', 'Estado']] : [])];
  return `<nav class="navbar" aria-label="Secciones del panel">${items.map(([c, h, t]) => `<a href="${h}"${c === activa ? ' class="activa" aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
}

/** La hoja entera del panel. `csrf` presente = hay sesión: se muestra «Salir» y el menú. `rol`: dueno o editor. `activa`: qué pantalla marcar en el menú. */
export function marco(titulo, cuerpo, { csrf = null, rol = 'dueno', activa = '' } = {}) {
  const salir = csrf ? `<form method="post" action="/panel/salir"><input type="hidden" name="csrf" value="${esc(csrf)}"><button class="chico" type="submit">Salir</button></form>` : '';
  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="no-referrer">
<title>${esc(titulo)} · Panel de Radar Balcarce</title>
<style>${CSS}</style>
</head>
<body>
<header class="barra"><a href="/panel">Radar · Panel</a>${salir}${csrf ? menuDe(rol, activa) : ''}</header>
<main>
${cuerpo}
</main>
</body>
</html>`;
}

/** Sin sesión: cómo se entra. */
export function paginaSinSesion() {
  return marco('Entrar', `<div class="caja"><h1>Panel de Radar Balcarce</h1>
<p>Para entrar, pedile el enlace al bot de Telegram: escribí <strong>/panel</strong> en el chat con @radarbalcarce_bot.</p>
<p class="nota-chica">El enlace sirve una sola vez y vence en 15 minutos. Después, este teléfono queda adentro 30 días.</p></div>`);
}

/** El enlace del bot: un botón para entrar (así la vista previa de Telegram no gasta el enlace). */
export function paginaEntrar(token) {
  return marco('Entrar', `<div class="caja"><h1>Entrar al panel</h1>
<p>Tocá el botón para entrar. Este teléfono queda adentro 30 días.</p>
<form method="post" action="/panel/entrar"><input type="hidden" name="t" value="${esc(token)}"><button type="submit">Entrar al panel</button></form></div>`);
}

/** El enlace ya se usó, venció o no existe. */
export function paginaEnlaceVencido() {
  return marco('Enlace vencido', `<div class="caja"><h1>Ese enlace ya no sirve</h1>
<p>Ya se usó o pasaron más de 15 minutos. Pedile uno nuevo al bot de Telegram con <strong>/panel</strong>.</p></div>`);
}

export function paginaPanelError(mensaje, { csrf = null, rol = 'dueno' } = {}) {
  return marco('Panel', `<div class="caja"><h1>No se pudo</h1><p>${esc(mensaje)}</p><p><a href="/panel">Volver a la lista</a></p></div>`, { csrf, rol });
}

const ESTADOS = { publicada: 'Publicada', oculta: 'Oculta', retirada: 'Retirada', borrador: 'Borrador' };
export const badge = (estado) => `<span class="estado ${esc(estado)}">${esc(ESTADOS[estado] || estado)}</span>`;
export const opciones = (lista, elegida) => lista.map(([v, t]) => `<option value="${esc(v)}"${v === elegida ? ' selected' : ''}>${esc(t)}</option>`).join('');

/** Una foto que se puede mostrar (https o propia); si no, null. */
export const fotoMostrable = (u) => {
  const s = String(u ?? '');
  if (/^http:\/\//i.test(s)) return `https://${s.slice(7)}`;
  return /^https:\/\//i.test(s) || /^\/fotos-notas\/[A-Za-z0-9._-]+$/.test(s) ? s : null;
};

function miniatura(n) {
  const url = fotoMostrable(n.fotoPortada);
  return url
    ? `<img class="mini" src="${esc(url)}" alt="" loading="lazy">`
    : `<span class="mini" style="background:var(--s-${esc(ranuraDe(n.seccion))})" aria-hidden="true"></span>`;
}

/** Los botones al toque de cada fila: Ocultar (publicada), Mostrar (oculta) y Reel (publicada). `volver`: la lista tal como está (filtros y página). */
function botonesRapidos(n, csrf, volver) {
  const base = `/panel/nota/${encodeURIComponent(n.id)}`;
  const campos = `<input type="hidden" name="csrf" value="${esc(csrf)}"><input type="hidden" name="volver" value="${esc(volver)}">`;
  const botones = [];
  if (n.estado === 'publicada') {
    botones.push(`<form method="post" action="${base}/estado">${campos}<input type="hidden" name="accion" value="ocultar"><button class="chico gris" type="submit">Ocultar</button></form>`);
    botones.push(`<a class="boton chico" href="${base}/reel" style="padding:6px 12px;font-size:14px">Reel</a>`);
  }
  if (n.estado === 'oculta') botones.push(`<form method="post" action="${base}/estado">${campos}<input type="hidden" name="accion" value="mostrar"><button class="chico" type="submit">Mostrar</button></form>`);
  return botones.length ? `<div class="acciones">${botones.join('')}</div>` : '';
}

/** La lista de notas, con filtros. `filtros`: { q, estado, seccion, origen }. */
export function paginaLista({ notas, filtros, pagina, hayMas, csrf, ok = null, error = null, rol = 'dueno' }) {
  const enlace = (p) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(filtros)) if (v) q.set(k, v);
    if (p > 1) q.set('p', String(p));
    const s = q.toString();
    return `/panel${s ? `?${s}` : ''}`;
  };
  const filas = notas.length
    ? notas.map((n) => `<li><a class="fila" href="/panel/nota/${encodeURIComponent(n.id)}">${miniatura(n)}<span><span class="titulo">${esc(n.titulo || '(sin título)')}</span>
<span class="datos">${badge(n.estado)} ${esc(n.seccion || '')} · ${esc(fechaCorta(n.fecha))}${n.origen === 'redaccion' ? ' · propia' : ''}</span></span></a>${botonesRapidos(n, csrf, enlace(pagina))}</li>`).join('\n')
    : '<li>No hay notas con esos filtros.</li>';
  const cuerpo = `<h1>Notas</h1>
${aviso(ok, error)}
<form class="caja filtros" method="get" action="/panel">
<div class="todo"><label for="q">Buscar en el título</label><input type="search" id="q" name="q" value="${esc(filtros.q)}" maxlength="80"></div>
<div><label for="estado">Estado</label><select id="estado" name="estado">${opciones([['', 'Publicadas, ocultas y retiradas'], ['publicada', 'Publicadas'], ['oculta', 'Ocultas'], ['retirada', 'Retiradas']], filtros.estado)}</select></div>
<div><label for="seccion">Sección</label><select id="seccion" name="seccion">${opciones([['', 'Todas'], ...SECCIONES.map((s) => [s.nombre, s.nombre])], filtros.seccion)}</select></div>
<div><label for="origen">Origen</label><select id="origen" name="origen">${opciones([['', 'Todas'], ['propias', 'Propias'], ['automaticas', 'Automáticas']], filtros.origen)}</select></div>
<div><label>&nbsp;</label><button type="submit">Filtrar</button></div>
</form>
<ul class="lista">
${filas}
</ul>
<nav class="paginas">${pagina > 1 ? `<a href="${esc(enlace(pagina - 1))}">← Más nuevas</a>` : '<span></span>'}${hayMas ? `<a href="${esc(enlace(pagina + 1))}">Más viejas →</a>` : ''}</nav>`;
  return marco('Notas', cuerpo, { csrf, rol, activa: 'notas' });
}

// Los avisos de arriba después de guardar: sólo códigos conocidos (nunca se muestra texto que venga en la dirección).
export const MENSAJES_OK = {
  texto: 'Listo, el texto quedó guardado. El sitio lo muestra en unos minutos.',
  'sin-cambios': 'No había nada distinto para guardar.',
  oculta: 'Listo, la nota quedó oculta: no se ve en el sitio ni sale en redes.',
  mostrada: 'Listo, la nota se vuelve a ver en el sitio.',
  retirada: 'Listo, la nota quedó retirada.',
  redes: 'Listo, las redes de esta nota quedaron guardadas.',
  fotos: 'Listo, las fotos quedaron guardadas.',
  'reel-pedido': 'Listo, el pedido quedó anotado. El reloj de las piezas lo toma en su próxima vuelta (de 8 a 23 h).',
  subidas: 'Listo, las fotos nuevas quedaron subidas.',
  'borrador-guardado': 'Listo, el borrador quedó guardado. Todavía no se ve en el sitio.',
  'publicada-nueva': 'Listo, la nota quedó publicada. El sitio la muestra en unos minutos.',
  descartada: 'Listo, el borrador quedó descartado.',
};
export const MENSAJES_ERROR = {
  titulo: 'El título tiene que tener entre 3 y 300 letras.',
  bajada: 'La bajada puede tener como mucho 600 letras.',
  cuerpo: 'El cuerpo no puede quedar vacío (y tiene un máximo de 40.000 letras).',
  seccion: 'Esa sección no existe. Elegí una de la lista.',
  'ya-oculta': 'Esa nota ya estaba oculta.',
  'no-publicada': 'Sólo se puede hacer eso con una nota publicada.',
  'no-oculta': 'Sólo vuelve a mostrarse una nota oculta.',
  'ya-retirada': 'Esa nota ya está retirada.',
  motivo: 'Para retirar hace falta el motivo (hasta 300 letras).',
  accion: 'No entendí qué hacer.',
  freno: 'Esa nota tiene un freno puesto o no está publicada: no se la manda a las redes.',
  'sin-fotos': 'No elegiste ninguna foto.',
  'muchas-fotos': 'Son demasiadas: una nota tiene como mucho 10 fotos.',
  'foto-grande': 'Una de las fotos pesa más de 8 MB. Achicala y probá de nuevo.',
  'foto-formato': 'Una de las fotos no es JPG, PNG ni WEBP.',
  'sin-deposito': 'El sitio no tiene dónde guardar fotos (falta el depósito). No se cambió nada.',
  credito: 'Un crédito puede tener como mucho 200 letras.',
  formato: 'No entendí el formato. Elegí Reel, Historia o Posteo.',
  destino: 'Una de las redes elegidas no existe.',
  'sin-destinos': 'Elegí al menos una red donde tiene que salir.',
  'foto-elegida': 'Una de las fotos elegidas no sirve (no está en la nota o no tiene dirección pública).',
  'sin-fotos-elegidas': 'Elegí de 1 a 3 fotos para el reel.',
  'sin-foto-publica': 'Esta nota no tiene ninguna foto que se pueda usar en un reel. Sumá una foto desde «Fotos».',
  'muchas-fotos-reel': 'Para un reel alcanzan 3 fotos como mucho.',
  'titulo-puntos': 'El título tiene que estar entero: no puede terminar en «…» ni en puntos suspensivos.',
  'bajada-vacia': 'Falta la bajada (hasta 600 letras).',
  'pocos-parrafos': 'La nota necesita al menos 3 párrafos (dejá una línea en blanco entre uno y otro).',
  firma: 'La firma no puede quedar vacía ni tener más de 80 letras.',
  'fuente-medio': 'El nombre del medio de la fuente puede tener hasta 80 letras.',
  'fuente-enlace': 'El enlace de la fuente tiene que empezar con https:// y ser una dirección completa.',
  grafico: 'El gráfico no está completo: hace falta un título (hasta 90 letras), una fuente, y cada fila con su etiqueta (hasta 40 letras) y un número. Si es de barras, sin negativos, y no todos iguales.',
  'grafico-fila': 'No pude leer una fila del gráfico. Escribí una por línea, así: «Etiqueta: 60.000» (el número con punto de miles y coma de decimales).',
  'grafico-pocas-filas': 'El gráfico necesita al menos 3 filas (una por línea).',
  'grafico-muchas-filas': 'El gráfico admite hasta 8 filas.',
  video: 'Ese enlace no es de un video de YouTube. Pegá la dirección completa del video (o su código de 11 letras).',
  'sin-permiso': 'Tu usuario no puede hacer eso: es sólo para los dueños del panel.',
  'no-borrador': 'Ese borrador ya no existe o ya se publicó.',
  'fotos-no-subidas': 'El borrador quedó guardado, pero las fotos no se pudieron subir. Probá de nuevo desde «Fotos».',
};

export function aviso(ok, error) {
  if (ok && MENSAJES_OK[ok]) return `<p class="ok" role="status">${esc(MENSAJES_OK[ok])}</p>`;
  if (error && MENSAJES_ERROR[error]) return `<p class="error" role="alert">${esc(MENSAJES_ERROR[error])} No se cambió nada.</p>`;
  return '';
}

const ESTADO_DE_PIEZA = { publicada: ['salió', 'ok'], lista: ['armada en ensayo (no se publica)', 'ensayo'], 'en-curso': ['se está armando', ''], error: ['falló', 'mal'], 'sin-datos': ['sin datos', 'mal'], 'sin-cupo': ['sin cupo de voz', 'mal'] };
/** Las piezas de video de una nota (su reel o sus fotos, y los repasos donde entró), para «¿Qué salió de esta nota?». */
export function piezasDeLaNota(piezas) {
  if (!piezas.length) return '';
  const filas = piezas.map((p) => {
    const [texto, clase] = ESTADO_DE_PIEZA[p.estado] ?? [p.estado, ''];
    const que = p.enRepaso ? `Entró en «${p.nombre}»` : p.nombre;
    const redes = p.acciones.map((a) => `${esc(nombreDeRed(a.red))} ${a.estado === 'ok' ? '✔' : a.estado === 'error' ? '✖' : '·'}`).join(' ');
    return `<tr><td>${esc(que)}<br><span class="nota-chica">${esc(fechaCorta(p.dia))}${p.hora ? ` ${esc(p.hora)}` : ''}</span></td><td><span class="chip ${clase}">${esc(texto)}</span>${redes ? `<br><span class="nota-chica">${redes}</span>` : ''}${p.error ? `<br><span class="nota-chica">${esc(p.error)}</span>` : ''}</td></tr>`;
  }).join('');
  return `<p class="nota-chica">Piezas de video:</p><table><tr><th>Pieza</th><th>Cómo salió</th></tr>${filas}</table>`;
}

const REDES = [['posteo', 'Posteo'], ['historia', 'Historia'], ['reel', 'Reel']];

/**
 * La página de una nota. `nota`: { id, titulo, bajada, parrafos, seccion, estado, noPublicar, fotos: [{url, credito}], redes: { lista, repaso, menciones }, url, origen, fecha, firma }.
 * `publicaciones`: [{ red, cuando, estado, simulado }] (lo que ya salió en redes; vacío si no hay o no se pudo leer).
 */
export function paginaNota({ nota, csrf, ok, error, publicaciones = [], piezas = [], abrir = null, rol = 'dueno' }) {
  const base = `/panel/nota/${encodeURIComponent(nota.id)}`;
  const oculto = `<input type="hidden" name="csrf" value="${esc(csrf)}">`;
  const portada = fotoMostrable(nota.fotos[0]?.url);
  const vista = `<section class="caja vista">${badge(nota.estado)} <span class="nota-chica">${esc(nota.seccion)} · ${esc(fechaCorta(nota.fecha))} · ${esc(nota.firma || '')}</span>
${portada ? `<img src="${esc(portada)}" alt="" style="margin:10px 0;border-radius:8px">` : ''}
<h2>${esc(nota.titulo)}</h2>
${nota.bajada ? `<p class="baj">${esc(nota.bajada)}</p>` : ''}
${nota.estado === 'publicada' ? `<p><a href="${esc(nota.url)}" target="_blank" rel="noopener">Ver la nota en el sitio ↗</a></p>` : `<p class="nota-chica">Dirección: ${esc(nota.url)} (no se ve mientras no esté publicada)</p>`}
${nota.noPublicar ? `<p class="nota-chica">Freno: ${esc(nota.noPublicar.motivo ?? nota.noPublicar.razon ?? 'sin motivo')}${nota.noPublicar.por ? ` (${esc(nota.noPublicar.por)})` : ''}</p>` : ''}
</section>`;

  const texto = `<details class="caja" id="editar"${abrir === 'texto' ? ' open' : ''}><summary>Texto</summary>
<form method="post" action="${base}/texto">${oculto}
<label for="titulo">Título</label><input type="text" id="titulo" name="titulo" value="${esc(nota.titulo)}" maxlength="300" required>
<label for="bajada">Bajada</label><textarea class="bajada" id="bajada" name="bajada" maxlength="600">${esc(nota.bajada)}</textarea>
<label for="cuerpo">Cuerpo <span class="nota-chica">(dejá una línea en blanco entre párrafos)</span></label><textarea id="cuerpo" name="cuerpo" maxlength="40000">${esc(nota.parrafos.join('\n\n'))}</textarea>
<label for="seccion-nota">Sección</label><select id="seccion-nota" name="seccion">${opciones(SECCIONES.map((s) => [s.nombre, s.nombre]), nota.seccion)}</select>
<button type="submit">Guardar el texto</button>
<p class="nota-chica">La dirección de la nota no cambia aunque cambies el título. Lo que había queda anotado.</p>
</form></details>`;

  // Acciones al toque, arriba de todo: lo que se hace seguido (reel, ocultar o mostrar, editar el texto).
  const rapidas = `<section class="caja"><h2>Acciones rápidas</h2><div class="rapidas">
${nota.estado === 'publicada' ? `<a class="boton" href="${base}/reel">🎬 Que salga en reel</a>` : ''}
${nota.estado === 'publicada' ? `<form method="post" action="${base}/estado">${oculto}<input type="hidden" name="accion" value="ocultar"><button class="gris" type="submit">Ocultar</button></form>` : ''}
${nota.estado === 'oculta' ? `<form method="post" action="${base}/estado">${oculto}<input type="hidden" name="accion" value="mostrar"><button type="submit">Mostrar</button></form>` : ''}
${nota.estado !== 'retirada' ? `<a class="boton claro" href="${base}?abrir=texto#editar">Editar el texto</a>` : ''}
</div>
<p class="nota-chica">Ocultar la saca del sitio y de las redes sin borrarla (se vuelve con «Mostrar»).${nota.estado === 'retirada' ? ' Esta nota está retirada.' : ''}</p></section>`;

  const botonesEstado = [
    nota.estado !== 'retirada' ? `<form method="post" action="${base}/estado" onsubmit="return confirm('¿Retirar la nota? No se puede volver atrás desde acá.')">${oculto}<input type="hidden" name="accion" value="retirar">
<label for="motivo">Motivo para retirar</label><input type="text" id="motivo" name="motivo" maxlength="300" required><button class="peligro" type="submit">Retirar</button></form>` : '<p>Esta nota está retirada.</p>',
  ].join('\n');
  const estado = rol !== 'dueno' ? '' : `<details class="caja"><summary>Retirar la nota</summary>
<p class="nota-chica">Retirar es definitivo desde acá y pide el motivo. Para sacarla un rato, usá «Ocultar».</p>
${botonesEstado}</details>`;

  const lista = nota.redes.lista;
  const salidas = publicaciones.length
    ? `<p class="nota-chica">Ya salió:</p><table><tr><th>Red</th><th>Cuándo</th><th>Cómo</th></tr>${publicaciones.map((p) => `<tr><td>${esc(p.red)}</td><td>${esc(fechaCorta(p.cuando))}</td><td>${esc(p.simulado ? 'ensayo' : p.estado)}</td></tr>`).join('')}</table>`
    : '<p class="nota-chica">Todavía no salió en ninguna red.</p>';
  const pedido = nota.redes.destinos.length
    ? `<p class="nota-chica">Pedido de reel: ${esc(nota.redes.destinos.map((d) => (DESTINOS_DEL_REEL.find(([c]) => c === d) ?? [d, d])[1]).join(', '))}${nota.redes.fotos.length ? ` · fotos ${esc(nota.redes.fotos.map((n) => n + 1).join(', '))}` : ''}${nota.redes.pedida ? ` · pedido el ${esc(fechaCorta(nota.redes.pedida))}` : ''}.</p>`
    : '';
  const quePaso = `<section class="caja"><h2>¿Qué salió de esta nota?</h2>
${salidas}${piezasDeLaNota(piezas)}${pedido}</section>`;
  const redes = `<details class="caja"><summary>Redes (formatos, repaso y menciones)</summary>
<form method="post" action="${base}/redes" class="chequeos">${oculto}
${REDES.map(([clave, etiqueta]) => `<label><input type="checkbox" name="lista" value="${clave}"${lista.includes(clave) ? ' checked' : ''}> ${esc(etiqueta)}</label>`).join('\n')}
<label><input type="checkbox" name="repaso" value="si"${nota.redes.repaso ? ' checked' : ''}> Al próximo repaso en video (10, 15 o 21 h)</label>
<label for="menciones" style="display:block;font-weight:600;font-size:14px">Cuentas que se nombran (@fulano @otra)</label>
<input type="text" id="menciones" name="menciones" value="${esc(nota.redes.menciones.join(' '))}" maxlength="400">
<p class="nota-chica">Lo que marques sale aunque no la cuenten otros medios; la ley, el tono y la foto siguen valiendo. El reel pide al menos una foto. Se suma @radarbalcarce.</p>
<button type="submit">Guardar redes</button>
</form></details>`;

  const fotosActuales = nota.fotos.length
    ? `<form method="post" action="${base}/fotos">${oculto}<input type="hidden" name="accion" value="guardar">
${nota.fotos.map((f, i) => { const u = fotoMostrable(f.url); return `<div class="foto">${u ? `<img src="${esc(u)}" alt="" loading="lazy">` : `<p class="nota-chica">(sin vista: ${esc(f.url || 'sin dirección')})</p>`}
<label class="chequeos" style="margin:0"><span><input type="radio" name="portada" value="${i}"${i === 0 ? ' checked' : ''}> De portada</span></label>
<label for="credito-${i}">Crédito</label><input type="text" id="credito-${i}" name="credito_${i}" value="${esc(f.credito)}" maxlength="200">
<label class="chequeos" style="margin:0"><span><input type="checkbox" name="borrar_${i}" value="si"> Sacar esta foto</span></label></div>`; }).join('\n')}
<button type="submit">Guardar las fotos</button></form>`
    : '<p>Esta nota no tiene fotos: sale con la placa de su sección.</p>';
  const fotos = `<details class="caja"${abrir === 'fotos' ? ' open' : ''}><summary>Fotos</summary>
${fotosActuales}
<form method="post" action="${base}/fotos" enctype="multipart/form-data" style="margin-top:14px">${oculto}<input type="hidden" name="accion" value="subir">
<label for="nuevas">Sumar fotos (JPG, PNG o WEBP; hasta 10, de 8 MB cada una)</label><input type="file" id="nuevas" name="fotos" accept="image/jpeg,image/png,image/webp" multiple>
<label for="credito-nuevas">Crédito de las fotos nuevas</label><input type="text" id="credito-nuevas" name="credito" value="Radar Balcarce" maxlength="200">
<button type="submit">Subir</button></form></details>`;

  return marco(nota.titulo || 'Nota', `<p><a href="/panel">← Todas las notas</a></p>
${aviso(ok, error)}
${vista}
${rapidas}
${quePaso}
${texto}
${fotos}
${redes}
${estado}`, { csrf, rol, activa: 'notas' });
}

/**
 * La pantalla «Que esta nota salga en reel»: dónde, en qué formato y con qué fotos (de 1 a 3). `nota` es el mismo objeto de paginaNota (más `noPublicable`).
 * El pedido se guarda en `notas.redes` (formato → `lista`, `destinos`, `fotos`); lo arma el reloj de las piezas de las redes.
 */
export function paginaReel({ nota, csrf, error = null, rol = 'dueno' }) {
  const base = `/panel/nota/${encodeURIComponent(nota.id)}`;
  const volver = `<p><a href="${base}">← Volver a la nota</a></p>`;
  if (nota.noPublicable) return marco('Reel', `${volver}<div class="caja"><h1>Esta nota no puede ir a las redes</h1><p>Para mandar una nota a las redes tiene que estar publicada y sin freno.</p></div>`, { csrf, rol, activa: 'notas' });
  const usables = nota.fotos.map((f, i) => ({ i, url: fotoMostrable(f.url) })).filter((f) => f.url);
  const previas = nota.redes.fotos.length ? nota.redes.fotos : usables.slice(0, 1).map((f) => f.i);
  const destinos = nota.redes.destinos.length ? nota.redes.destinos : ['instagram', 'facebook', 'tiktok', 'youtube'];
  const casilla = (nombre, valor, etiqueta, marcada) => `<label class="sala"><input type="checkbox" name="${nombre}" value="${esc(valor)}"${marcada ? ' checked' : ''} style="width:22px;height:22px"> ${etiqueta}</label>`;
  const fotos = usables.length
    ? `<div class="fotos-reel">${usables.map((f) => `<div>${casilla('fotos', String(f.i), `Foto ${f.i + 1}${f.i === 0 ? ' (portada)' : ''}`, previas.includes(f.i))}<img src="${esc(f.url)}" alt="" loading="lazy"></div>`).join('')}</div>
<p class="nota-chica">La primera que marques es la de portada del reel.</p>`
    : '<p class="error">Esta nota no tiene ninguna foto que se pueda usar. Sumá una desde «Fotos» en la nota.</p>';
  const cuerpo = `${volver}<h1>Reel de: «${esc(nota.titulo)}»</h1>
${aviso(null, error)}
<form method="post" action="${base}/reel" class="chequeos">
<input type="hidden" name="csrf" value="${esc(csrf)}">
<section class="caja"><h2>1) ¿Dónde sale?</h2>
${DESTINOS_DEL_REEL.map(([c, t]) => casilla('destinos', c, esc(t), destinos.includes(c))).join('\n')}
</section>
<section class="caja"><h2>2) ¿En qué formato?</h2>
${[['reel', 'Reel (video con voz)'], ['historia', 'Historia'], ['posteo', 'Posteo']].map(([v, t], i) => `<label class="sala"><input type="radio" name="formato" value="${v}"${i === 0 ? ' checked' : ''} style="width:22px;height:22px"> ${esc(t)}</label>`).join('\n')}
${casilla('repaso', 'si', 'Sumarla también al próximo repaso en video', nota.redes.repaso)}
</section>
<section class="caja"><h2>3) Fotos (elegí de 1 a 3)</h2>
${fotos}
</section>
<section class="caja"><h2>¿Cuándo sale?</h2>
<p>El reloj de las piezas lo arma en su próxima vuelta (de 8 a 23 h) y respeta el cupo de voz del día (15 audios). Una nota tiene un solo reel.</p>
<p class="nota-chica">Importante: por ahora el reloj de las redes todavía no mira qué redes ni qué fotos elegiste: usa las de siempre. Queda anotado para cuando las respete.</p>
${usables.length ? '<button type="submit">🎬 Pedir el reel</button>' : ''}
</section>
</form>`;
  return marco('Reel', cuerpo, { csrf, rol, activa: 'notas' });
}
