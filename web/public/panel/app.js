// El panel del celular de Radar Balcarce (29/09).
//
// Aprobar lo que espera a una persona, retirar (y volver a publicar), editar
// (también la sección), pedirle a la IA que escriba o reescriba una nota,
// mandar una nota a las redes y ver lo que sale hoy en Facebook e Instagram,
// desde el celular y con la PC apagada. Sin servidor propio: habla con GitHub
// con la llave de quien lo usa (github.js). Lo que espera a una persona y las
// retiradas llegan cifradas para este celular (cifrado.js). Los textos que
// explican cada cosa están en textos.js. Cómo funciona todo: docs/09-PANEL.md.

import {
  crearCliente, ARCHIVOS, seccionesDelPanel, ErrorDeGitHub, marcaNueva, corridaConMarca,
  conDecision, sinDecision, conRedes, conCorreccion, conLlave, sinRetirada, haceCuanto, palabras, conEleccionDeDia, conDecisionDeFeriado, conDecisionDePieza, conPistaSinNovedad, conPistaEstado, conPistaResultado, conNotaDePista, conNotaDePistaRetirada, idDeNotaDePista, conFotoManual,
} from './github.js';
import {
  ESTILOS, COLOR_DE_ESTILO, ROLES, etiquetaCorta, etiquetaLarga, semanas, borradorDe, rolDe, marcarEn, eleccionDeDia, estadoDelDia,
  haceTexto, marcaLegible, diasArmados, mesesDe, nombreDelMes, celdasDelMes, resumenDelMes, estadoDeFeriado, estadoDeDiaArmado, huellaDelDia, decisionVencida,
} from './fechas.js';
import { crearLlaves, abrir, cerrar as cerrarSobre } from './cifrado.js';
import {
  explicarMotivo, motivoCorto, explicarFicha, estadoSinCuerpo, explicarMotivoSinCuerpo, PESTANAS, PREGUNTAS, preguntaRedes, comoSalenLosPosteos,
  REGLAS_FACEBOOK, proximoPosteo, estadoDePieza, horaEnBalcarce, hoyEnBalcarce,
} from './textos.js';
import { htmlDeNumeros, indiceDeNotas, resumenDeCorridas, diaDeBalcarce } from './numeros.js';
import { htmlDeRevision, contarRevision } from './revision.js';
import { resumenDeHoy, htmlDeHoy } from './hoy.js';
import { clasificarBorradores, htmlDeBorradores } from './borradores.js';
import { pasosDeLaNota, htmlDelRecorrido } from './recorrido.js';
import { htmlDeFormulario, htmlDeLista, htmlDeUnaPista, htmlDeCerrarPista } from './pistas.js';
import {
  armarContactos, htmlDeContactos, htmlDeUnContacto, htmlDeFormularioContacto, htmlDeCola, colaDeEnvio, contactoPropio, conHistorial, enlaceWhatsApp, enlaceMail,
} from './contactos.js';
import {
  notasSinFoto, htmlDeFotos, htmlDeUnaNotaSinFoto, urlDeFotoValida, creditoDeFoto, motivoDeFoto, MOTIVOS_DE_FOTO,
} from './fotos.js';
import { estadoPorRed, explicarFalloDeRed, problemasDeHoy, NOMBRE_DE_RED, NOMBRE_DE_PARTE } from './redes-estado.js';
import {
  crearClienteDeLaNube, explicarErrorDeLaNube, datosDeHoyDeLaNube, htmlDeLaPausaEnMas, resumenDeVueltasDelMotor, PREGUNTA_DE_PAUSA, PREGUNTA_DE_REANUDAR, AVISOS_DE_LA_NUBE,
} from './nube.js';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });
const COLOR = {
  Balcarce: 'balcarce', Política: 'politica', Policiales: 'policiales', Fútbol: 'futbol', Deportes: 'deportes', Automovilismo: 'automovilismo',
  Agro: 'agro', Economía: 'economia', 'Cultura y agenda': 'cultura', Tecnología: 'tecnologia', Argentina: 'pais',
  // Las tres que se suman a las once (reglas 187 y 211).
  Educación: 'educacion', Salud: 'salud', Ciencia: 'ciencia',
};
const chip = (s) => (s ? `<span class="chip" style="background:var(--s-${COLOR[s] ?? 'pais'})">${esc(s)}</span>` : '');
const GUARDADO = 'radar-panel';
/** Los archivos del panel (los mismos que guarda sw.js): "Actualizar el panel" los vuelve a bajar. */
const ARCHIVOS_DEL_PANEL = ['app.js', 'github.js', 'cifrado.js', 'textos.js', 'fechas.js', 'numeros.js', 'redes-estado.js', 'revision.js', 'pistas.js', 'contactos.js', 'fotos.js', 'hoy.js', 'borradores.js', 'recorrido.js', 'nube.js', 'index.html'].map((a) => `/panel/${a}`);
const DEMO = new URLSearchParams(location.search).has('demo');
const VOCES = { locutora: 'la locutora', locutor: 'el locutor' };
const enlaceDeNota = (n) => `https://radarbalcarce.com/nota/${n.slug ? `${n.slug}-${n.id}` : n.id}`;

// --------------------------------------------------------------- lo guardado

function leerAjustes() {
  try { return JSON.parse(localStorage.getItem(GUARDADO) ?? 'null'); } catch { return null; }
}
function guardarAjustes(a) {
  try { localStorage.setItem(GUARDADO, JSON.stringify(a)); } catch { /* sin almacenamiento */ }
}

// La llave privada del celular vive en IndexedDB: el navegador la guarda sin
// dejar que nadie la lea (ni este código).
function bd() {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(GUARDADO, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('llaves');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}
async function llavesDelCelular() {
  try {
    const db = await bd();
    return await new Promise((ok) => {
      const q = db.transaction('llaves').objectStore('llaves').get('celular');
      q.onsuccess = () => ok(q.result ?? null);
      q.onerror = () => ok(null);
    });
  } catch { return null; }
}
async function guardarLlavesDelCelular(v) {
  const db = await bd();
  await new Promise((ok, mal) => {
    const t = db.transaction('llaves', 'readwrite');
    t.objectStore('llaves').put(v, 'celular');
    t.oncomplete = ok;
    t.onerror = () => mal(t.error);
  });
}

// ------------------------------------------------------------------ el estado

const E = {
  cliente: null, nombre: '', llaves: null, pestana: 'hoy', busqueda: '',
  // La nube de Cloudflare (nube.js, regla 317): el cliente, y lo último que contestó /panel/estado ({ pausa, motor }, o { error }).
  nubeCliente: null, nube: null, nubeCargadaEn: 0,
  portada: null, esperando: [], intentosMaximos: 3, pendientes: null, descartadas: [], papelera: [], publicos: [],
  decisiones: { notas: {}, redes: {} }, correcciones: { notas: {} }, archivo: null, estadoCel: null, libro: {},
  // La pestaña Fechas (se carga la primera vez que se abre).
  fechas: null, mesFechas: null, subfechas: 'piezas', pieza: null, dia: null, borrador: null, filtroEstilo: null, feriado: null,
  // Lo que se está haciendo en la nube sin trabar el panel (la IA escribiendo, una foto sumándose): { [id]: { clase, estado, … } }.
  trabajos: {}, tareas: {}, relojDeTareas: null, pistasLibro: null, pistaAbierta: null, banco: null, publicadasTodas: false, scrollLista: null, restaurar: null,
};

function aviso(texto, {
  conActualizar = false, ms = 7000, ver = null, abrirPista = null,
} = {}) {
  const a = $('#aviso');
  a.innerHTML = `${esc(texto)}${conActualizar ? '<br><button type="button" data-accion="actualizar-web">Actualizar la web ahora</button>' : ''}${ver ? `<br><button type="button" data-accion="ver-borrador" data-tipo="${esc(ver.tipo)}" data-id="${esc(ver.id)}">Ver el borrador</button>` : ''}${abrirPista ? `<br><button type="button" data-accion="abrir-pista" data-id="${esc(abrirPista)}">Abrir la pista</button>` : ''}<button type="button" class="cerrar" data-accion="cerrar-aviso" aria-label="Cerrar">✕</button>`;
  a.hidden = false;
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => { a.hidden = true; }, conActualizar ? 14000 : ms);
}

function explicarError(e) {
  if (e instanceof ErrorDeGitHub) {
    if (e.estado === 401) return 'La llave no anda (venció o la borraron en GitHub). Cargá una nueva desde "Más".';
    if (e.estado === 403) return `GitHub no deja hacer esto con esta llave (${e.message}). Revisá los permisos: Contents y Actions, lectura y escritura.`;
    if (e.estado === 404) return 'GitHub no encontró el archivo o el workflow. Puede que la llave no tenga acceso al repositorio.';
    return `GitHub contestó ${e.estado}: ${e.message}`;
  }
  return navigator.onLine === false ? 'No hay conexión.' : `Algo falló: ${e?.message ?? e}`;
}

/**
 * Una pregunta antes de algo que no se deshace fácil (Hernán, 29/09: "estaría
 * bueno que re pregunte antes de mandar"). Devuelve { ok, texto }: `texto` es lo
 * que escribió, si la pregunta pedía un motivo o un pedido para la IA.
 */
function preguntar({
  titulo, texto, si = 'Sí', no = 'Cancelar', conMotivo = null, conPedido = null,
}) {
  return new Promise((listo) => {
    const d = document.createElement('dialog');
    d.className = 'pregunta';
    d.setAttribute('aria-labelledby', 'pregunta-titulo');
    const campo = conMotivo || conPedido;
    // El foco: en el motivo si hace falta escribirlo; si el pedido es opcional,
    // en "Sí" (que no se abra el teclado); si no hay nada que escribir, en
    // "Cancelar" (que un toque de más no confirme).
    d.innerHTML = `<form method="dialog">
      <h2 id="pregunta-titulo">${esc(titulo)}</h2>
      ${texto ? `<p>${esc(texto)}</p>` : ''}
      ${campo ? `<label for="respuesta">${esc(campo)}</label><textarea id="respuesta" rows="3" maxlength="300" ${conMotivo ? 'autofocus' : ''}></textarea>
        ${conPedido ? '<p class="ayuda">Queda a la vista en GitHub: no pongas nombres.</p>' : ''}` : ''}
      <div class="botones"><button value="si" class="boton principal" ${conPedido && !conMotivo ? 'autofocus' : ''}>${esc(si)}</button><button value="no" class="boton" ${campo ? '' : 'autofocus'}>${esc(no)}</button></div>
    </form>`;
    document.body.append(d);
    // La respuesta se toma en el toque (el evento "close" del diálogo puede
    // llegar tarde si la página no se está dibujando).
    let listoYa = false;
    const terminar = (dijoQueSi) => {
      const valor = d.querySelector('#respuesta')?.value?.trim() ?? '';
      if (dijoQueSi && conMotivo && !valor) {
        if (!d.querySelector('.falta')) d.querySelector('#respuesta').insertAdjacentHTML('afterend', '<p class="problemas falta">Hace falta escribir el motivo.</p>');
        d.querySelector('#respuesta').focus();
        return;
      }
      if (listoYa) return;
      listoYa = true;
      if (d.open) d.close();
      d.remove();
      listo({ ok: dijoQueSi, texto: valor });
    };
    d.querySelector('form').addEventListener('submit', (ev) => { ev.preventDefault(); terminar(ev.submitter?.value === 'si'); });
    d.addEventListener('cancel', (ev) => { ev.preventDefault(); terminar(false); });
    d.addEventListener('close', () => terminar(d.returnValue === 'si'));
    d.showModal();
  });
}

// ------------------------------------------------------------------ la llave

function vistaLlave(mensaje = '') {
  $('#pestanas').hidden = true;
  $('#recargar').hidden = true;
  const a = leerAjustes();
  app.innerHTML = `
    <h1>Entrar al panel</h1>
    <p>Desde acá se aprueban, se editan y se retiran notas, se le pide a la IA que las escriba y se ve lo que sale en las redes. Para entrar hace falta una <strong>llave de GitHub</strong>, que se crea una sola vez: sólo quien la tenga puede tocar algo.</p>
    ${mensaje ? `<p class="problemas">${esc(mensaje)}</p>` : ''}
    <details ${a ? '' : 'open'}>
      <summary>Cómo crear la llave (5 minutos, una sola vez)</summary>
      <ol class="pasos">
        <li>Entrá a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com → crear llave</a> con la cuenta de Radar (balcardev@gmail.com).</li>
        <li><strong>Token name</strong>: "Panel del celular". <strong>Expiration</strong>: un año (anotá la fecha).</li>
        <li><strong>Repository access</strong>: "Only select repositories" → <strong>radar-balcarce</strong>.</li>
        <li><strong>Permissions</strong> → Repository permissions: <strong>Contents</strong> "Read and write" y <strong>Actions</strong> "Read and write". Nada más.</li>
        <li><strong>Generate token</strong>, copiala y pegala acá abajo. GitHub no la vuelve a mostrar: si se pierde, se crea otra.</li>
      </ol>
      <p class="ayuda">La llave queda guardada sólo en este celular. Nunca la mandes por chat ni por mail. Si perdés el celular, borrala en GitHub (Settings → Developer settings → Fine-grained tokens).</p>
    </details>
    <form id="form-llave">
      <label for="nombre">Tu nombre (va en cada decisión)</label>
      <input type="text" id="nombre" autocomplete="name" required maxlength="30" value="${esc(a?.nombre ?? '')}" placeholder="Hernán">
      <label for="token">La llave de GitHub</label>
      <input type="password" id="token" autocomplete="off" required placeholder="github_pat_…">
      <div class="botones"><button class="boton principal ancho" type="submit">Entrar</button></div>
    </form>`;
  $('#form-llave').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const nombre = $('#nombre').value.trim();
    const token = $('#token').value.trim();
    if (!nombre || !token) return;
    app.innerHTML = '<div class="girando"></div><p class="vacio">Probando la llave…</p>';
    try {
      const cliente = crearCliente({ token });
      if (!(await cliente.puedeEscribir())) { vistaLlave('Esa llave no puede escribir en el repositorio radar-balcarce: revisá los permisos (Contents: Read and write).'); return; }
      await registrarCelular(cliente, nombre);
      guardarAjustes({ token, nombre });
      await arrancar();
    } catch (e) {
      vistaLlave(explicarError(e));
    }
  });
}

/** La primera vez: el par de llaves de este celular, y la pública al repositorio. */
async function registrarCelular(cliente, nombre) {
  let llaves = await llavesDelCelular();
  if (!llaves) {
    llaves = await crearLlaves();
    await guardarLlavesDelCelular(llaves);
  }
  const { json } = await cliente.leer(ARCHIVOS.llaves);
  if (!(json.llaves ?? []).some((l) => l.publica === llaves.publica)) {
    await cliente.guardar(ARCHIVOS.llaves, (j) => conLlave(j, { nombre: `Celular de ${nombre}`, publica: llaves.publica, huella: llaves.huella }), `Panel del celular: se registra el celular de ${nombre}`);
  }
  return llaves;
}

// ------------------------------------------------------------------ los datos

/** Lee un archivo que puede no existir todavía (lo crea la próxima actualización de la web). */
async function leerSiHay(cliente, ruta, porDefecto) {
  try { return (await cliente.leer(ruta)).json; } catch (e) {
    if (e instanceof ErrorDeGitHub && e.estado === 404) return porDefecto;
    throw e;
  }
}

/**
 * Abre lo que llega cifrado para este celular: un sobre por nota (versión 2,
 * con las retiradas) o un solo sobre para todo (la 1, la de antes).
 */
async function abrirPrivado(sobre) {
  if (!E.llaves || !sobre) return { pendientes: null, papelera: [] };
  if (sobre.version === 2) {
    const abrirTodas = async (mapa = {}, orden = Object.keys(mapa)) => (await Promise.all(orden.map((id) => abrir(mapa[id], E.llaves)))).filter(Boolean);
    const ids = Object.keys(sobre.notas ?? {});
    const pendientes = await abrirTodas(sobre.notas ?? {}, sobre.orden ?? ids);
    // Ningún sobre es para este celular: se registró después de la última actualización.
    if (ids.length && !pendientes.length) return { pendientes: null, papelera: [] };
    return { pendientes, papelera: await abrirTodas(sobre.retiradas ?? {}, sobre.ordenRetiradas ?? Object.keys(sobre.retiradas ?? {})) };
  }
  const viejo = await abrir(sobre, E.llaves);
  return { pendientes: viejo?.pendientes ?? null, papelera: [] };
}

async function cargar({ archivo = false } = {}) {
  const c = E.cliente;
  const [portada, esperando, privado, decisiones, correcciones, estadoCel, libro, banco] = await Promise.all([
    c.leer(ARCHIVOS.portada), c.leer(ARCHIVOS.esperando), leerSiHay(c, ARCHIVOS.pendientes, null),
    c.leer(ARCHIVOS.decisiones), c.leer(ARCHIVOS.correcciones), leerSiHay(c, ARCHIVOS.estado, null), leerSiHay(c, ARCHIVOS.libro, {}), leerSiHay(c, ARCHIVOS.banco, {}),
  ]);
  E.portada = portada.json;
  E.esperando = esperando.json.notas ?? [];
  E.intentosMaximos = esperando.json.intentosMaximos ?? 3;
  E.decisiones = { notas: {}, redes: {}, ...decisiones.json };
  E.correcciones = { notas: {}, ...correcciones.json };
  E.estadoCel = estadoCel;
  E.libro = libro ?? {};
  E.banco = banco ?? {};
  E.publicos = E.portada.pendientes ?? [];
  const abierto = await abrirPrivado(privado);
  E.pendientes = abierto.pendientes ? abierto.pendientes.filter((n) => !n.decision) : null;
  E.descartadas = abierto.pendientes ? abierto.pendientes.filter((n) => n.decision) : [];
  E.papelera = abierto.papelera ?? [];
  if (archivo) E.archivo = (await c.leer(ARCHIVOS.archivo)).json.notas ?? [];
  await cargarRevision();
  await cargarPistas();
}

/** Los hallazgos de la auditoría con IA: un sobre cifrado por nota (ingesta/auditoria-ia.mjs). Si falla, la pestaña sigue sin ellos. */
async function cargarRevision() {
  try {
    const j = await leerSiHay(E.cliente, ARCHIVOS.auditoria, null);
    // Y lo que dejó para una persona la revisión del archivo entero (regla 212): los mismos sobres, de notas viejas.
    const r = await leerSiHay(E.cliente, ARCHIVOS.revisionArchivo, null).catch(() => null);
    const sobres = { ...(r?.sobres ?? {}), ...(j?.sobres ?? {}) };
    const ids = Object.keys(sobres);
    const abiertos = (await Promise.all(ids.map(async (id) => { const e = await abrir(sobres[id], E.llaves); return e ? { id, ...e } : null; }))).filter(Boolean);
    // Lo que corrigió sola (ortografía chica y segura, 2/10): es público y no se cifra; sólo los últimos días.
    const cambios = await leerSiHay(E.cliente, ARCHIVOS.cambiosIA, null);
    const desde = Date.now() - 3 * 864e5;
    const corregidas = Object.entries(cambios?.notas ?? {}).map(([id, e]) => ({ id, ...e })).filter((e) => Date.parse(e.cuando) >= desde);
    E.revision = { items: abiertos, abierto: !ids.length || abiertos.length > 0, generado: j?.generado ?? null, corregidas };
  } catch { E.revision = null; }
}

const decididaEnElCelular = (id) => E.decisiones.notas?.[id] ?? null;
/** Cuánto duran las listas del panel (2/10, Hernán: "así no se acumulan cosas sin sentido"): lo que espera se va a las 48 horas; las publicadas y las retiradas, a las 24. */
const HORAS_EN_ESPERAN = 48;
const HORAS_RETIRADAS = 24;
const dentroDe = (iso, horas) => { const t = Date.parse(iso ?? ''); return !Number.isFinite(t) || t >= Date.now() - horas * 36e5; };
/** Las notas que salen solas pero esperan su cuerpo, de las últimas 48 horas y sin las que una persona ya completó. */
const sinCuerpoVigentes = () => E.esperando.filter((n) => !E.correcciones.notas?.[n.id]?.cuerpo && dentroDe(n.fecha, HORAS_EN_ESPERAN));
/** Lo de "Esperan", en tres grupos: sin decidir, aprobadas (salen en la próxima actualización) y descartadas; sólo lo de las últimas 48 horas. */
function listasDeEsperan() {
  const todas = [...(E.pendientes ?? E.publicos), ...E.descartadas].filter((n) => dentroDe(n.fecha, HORAS_EN_ESPERAN));
  const con = (estado) => todas.filter((n) => decididaEnElCelular(n.id)?.estado === estado);
  return { sinDecidir: todas.filter((n) => !decididaEnElCelular(n.id)), aprobadas: con('publicada'), descartadas: con('descartada') };
}
const marcadaParaRedes = (id) => !!E.decisiones.redes?.[id];
const enFacebook = (id) => E.libro?.facebook?.[id] ?? null;
const enInstagram = (id) => E.libro?.instagramFeed?.[id] ?? null;
const reglasFb = () => ({ ...REGLAS_FACEBOOK, ...(E.estadoCel?.redes?.facebook ?? {}) });
/** ¿Una persona la volvió a publicar después de retirarla? (se ve en la próxima actualización) */
const vueltaAPublicar = (n) => {
  const d = decididaEnElCelular(n.id);
  return d?.estado === 'publicada' && (Date.parse(d.cuando) || 0) > (Date.parse(n.retirada ?? '') || 0);
};

// ------------------------------------------------------------------ las listas

/** Los íconos de la barra de abajo (trazos simples, del color del texto). */
const ICONOS = {
  hoy: '<svg viewBox="0 0 24 24"><path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/></svg>',
  esperan: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  publicadas: '<svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M9 9h6M9 13h6"/></svg>',
  fotos: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  redes: '<svg viewBox="0 0 24 24"><path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/></svg>',
  mas: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg>',
};

function pestanas() {
  const nav = $('#pestanas');
  const esperan = listasDeEsperan().sinDecidir.length + sinCuerpoVigentes().length;
  const hace24 = Date.now() - 24 * 36e5;
  const ultimas = (E.portada?.notas ?? []).filter((n) => !n.propia && (Date.parse(n.fecha) || 0) >= hace24).length;
  const sinFoto = E.banco ? resumenDeFotos().items.length : null;
  const rev = E.revision ? contarRevision(E.revision.items) : null;
  const items = [
    ['hoy', 'Hoy', '·'], ['esperan', 'Esperan', esperan], ['publicadas', 'Publicadas', ultimas],
    ['redes', 'Redes', problemasDeHoy(E.libro, hoyEnBalcarce()).length ? '⚠' : '◷'], ['mas', 'Más', rev?.graves ? '⚠' : (pistasConNovedad() || sinFoto ? '●' : '⋯')],
  ];
  const actual = EN_MAS.has(E.pestana) ? 'mas' : E.pestana;
  // El globito: rojo si hay algo que atender, gris si es un total, verde si está todo bien; sin globito si no hay nada que mostrar.
  const globo = (id, n) => {
    if (n === '·' || n === '⋯' || n === 0 || n === '0') return '';
    const clase = id === 'fotos' && n === '✓' ? 'ok' : (id === 'publicadas' ? 'suave' : '');
    return `<span class="numero ${clase}">${n === '◷' ? '' : n}</span>`;
  };
  nav.innerHTML = items.map(([id, t, n]) => `<button type="button" data-pestana="${id}" ${actual === id ? 'aria-current="page"' : ''}><span class="icono">${ICONOS[id]}${n === '◷' ? '' : globo(id, n)}</span>${t}</button>`).join('');
  nav.hidden = false;
}

const queEs = (pestana) => `<details class="que-es"><summary>¿Qué es esto?</summary><p>${esc(PESTANAS[pestana])}</p></details>`;

function tarjeta(n, { tipo, extra = '' }) {
  const d = decididaEnElCelular(n.id);
  const trabajo = E.trabajos[n.id]?.clase === 'ia' ? { escribiendo: '<span class="marca espera">✎ la IA la está escribiendo…</span>', publicando: '<span class="marca espera">✎ publicándola…</span>', listo: '<span class="marca">✎ borrador listo: abrila para revisarlo</span>', fallo: '<span class="marca mal">⚠ la IA no pudo escribirla</span>' }[E.trabajos[n.id].estado] ?? '' : '';
  const marcas = [
    trabajo,
    d && tipo !== 'retirada' ? `<span class="marca">${{ publicada: '✓ aprobada', descartada: '✕ descartada', bloqueada: '✕ retirada' }[d.estado] ?? ''}</span>` : '',
    enFacebook(n.id) ? '<span class="marca">✓ en Facebook</span>' : (marcadaParaRedes(n.id) ? '<span class="marca">→ en la cola de las redes</span>' : ''),
  ].join('');
  return `<button type="button" class="tarjeta" style="--franja:var(--s-${COLOR[E.correcciones.notas?.[n.id]?.seccion ?? n.seccion] ?? 'pais'})" data-abrir="${esc(tipo)}" data-id="${esc(n.id)}">
    <div>${chip(E.correcciones.notas?.[n.id]?.seccion ?? n.seccion)}<span class="meta">${esc(haceCuanto(n.fecha))}</span>${marcas}</div>
    <div class="titulo">${esc(E.correcciones.notas?.[n.id]?.titulo ?? (d?.estado === 'publicada' ? d.titulo : null) ?? n.titulo ?? 'Nota sensible: abrila para ver de qué se trata')}</div>
    ${extra}</button>`;
}

function vistaLista() {
  if (E.pestana === 'sin-cuerpo') E.pestana = 'esperan';
  pestanas();
  $('#recargar').hidden = false;
  const cuando = E.portada?.generado ? `La web se armó ${haceCuanto(E.portada.generado)}.` : '';
  if (E.pestana === 'hoy') vistaHoy();
  else if (E.pestana === 'esperan') vistaEsperan(cuando);
  else if (E.pestana === 'fotos') vistaFotos();
  else if (E.pestana === 'borradores') vistaBorradores();
  else if (E.pestana === 'publicadas') vistaPublicadas(cuando);
  else if (E.pestana === 'redes') vistaRedes();
  else if (E.pestana === 'contactos') vistaContactos();
  else if (E.pestana === 'pistas') vistaPistas();
  else if (E.pestana === 'revision') vistaRevision();
  else if (E.pestana === 'fechas') vistaFechas();
  else if (E.pestana === 'numeros') vistaNumeros();
  else vistaMas();
  // Un botón para volver a "Más" desde lo que se abre desde ahí (las fechas tienen el suyo cuando hay un día abierto).
  if (EN_MAS.has(E.pestana) && !E.dia && !E.feriado && !E.pieza && !E.pistaAbierta && !E.cerrandoPista && !E.contactoAbierto && !E.nuevoContacto && !E.cola) app.insertAdjacentHTML('afterbegin', '<button type="button" class="boton volver-mas" data-pestana="mas">← Más</button>');
  // Volver a donde se estaba: después de abrir una nota, aprobarla o descartarla, la lista sigue en el mismo lugar.
  if (E.restaurar != null) { const y = E.restaurar; E.restaurar = null; requestAnimationFrame(() => window.scrollTo(0, y)); }
}

// ------------------------------------------------------------------ la pestaña Borradores (borradores.js)

/** El tipo con que se abre una nota para escribirle un borrador: en qué lista está hoy. */
function tipoDeNota(id) {
  for (const t of ['pendiente', 'sin-cuerpo', 'retirada', 'publicada']) if (buscar(t, id)) return t;
  return 'pendiente';
}

/** Cómo está la nota de un borrador: espera, la aprobaron, la descartaron, la retiraron o ya está en la web. */
function estadoDeLaNota(id) {
  const d = decididaEnElCelular(id);
  if (d?.estado === 'publicada') return 'aprobada';
  if (d?.estado === 'descartada') return 'descartada';
  if (d?.estado === 'bloqueada') return 'retirada';
  if ((E.portada?.notas ?? []).some((n) => n.id === id)) return 'publicada';
  return 'espera';
}

/** Lee el archivo de borradores cifrado y abre cada sobre con la llave de este celular (como mucho 40, los más nuevos). */
async function cargarBorradores() {
  const { json } = await E.cliente.leer(ARCHIVOS.borradores);
  const sobres = Object.entries(json.borradores ?? {})
    .map(([clave, sobre]) => ({ clave, sobre, cuando: Date.parse(sobre?.cuando ?? '') }))
    .filter((x) => Number.isFinite(x.cuando)).sort((a, b) => b.cuando - a.cuando).slice(0, 40);
  const abiertos = await Promise.all(sobres.map(async (x) => {
    const b = E.llaves ? await abrir(x.sobre, E.llaves).catch(() => null) : null;
    return b ? { ...x, b } : null;
  }));
  const items = abiertos.filter(Boolean).map(({ clave, cuando, b }) => {
    const deLaPista = clave.startsWith('nota-');
    const id = deLaPista ? clave.slice(5) : clave;
    const nota = deLaPista ? null : buscar(tipoDeNota(id), id);
    (E.borradoresIA ??= {})[clave] ??= { b, cuando };
    return { id, clave, tipo: deLaPista ? 'nota-pista' : tipoDeNota(id), cuando, b, estado: deLaPista ? 'espera' : estadoDeLaNota(id), tituloNota: nota?.titulo, seccionNota: nota?.seccion };
  });
  E.borradoresLista = { cargadoEn: Date.now(), items, sinLlave: !E.llaves };
}

function vistaBorradores() {
  const enCurso = Object.values(E.trabajos).filter((t) => t.clase === 'ia' && t.estado === 'escribiendo').map((t) => t.titulo).filter(Boolean);
  const L = E.borradoresLista;
  if (!L || Date.now() - L.cargadoEn > 60000) {
    if (!E.cargandoBorradores) {
      E.cargandoBorradores = true;
      cargarBorradores().catch((e) => { aviso(explicarError(e), { ms: 9000 }); E.borradoresLista ??= { cargadoEn: Date.now(), items: [] }; })
        .finally(() => { E.cargandoBorradores = false; if (E.pestana === 'borradores' && enUnaLista()) vistaBorradores(); });
    }
    if (!L) { app.innerHTML = htmlDeBorradores({}, { esc, haceCuanto, chip }, { cargando: true, enCurso }); return; }
  }
  app.innerHTML = htmlDeBorradores(clasificarBorradores(L.items), { esc, haceCuanto, chip }, { sinLlave: L.sinLlave && !L.items.length, enCurso });
}

/** La pantalla de entrada (hoy.js): lo que hay que mirar al abrir el panel, con un atajo a cada cosa. */
function vistaHoy() {
  const { sinDecidir } = listasDeEsperan();
  // Con la lista de Borradores ya cargada, sólo cuentan los que esperan una persona; si no, los de esta sesión.
  const borradores = E.borradoresLista
    ? clasificarBorradores(E.borradoresLista.items).paraLeer.map((x) => x.b)
    : Object.values(E.borradoresIA ?? {}).map((g) => g.b).filter((b) => b?.ok && b.texto);
  const enCurso = Object.values(E.trabajos).filter((t) => t.clase === 'ia' && t.estado === 'escribiendo').map((t) => t.titulo).filter(Boolean);
  const fotos = E.banco ? resumenDeFotos().items : [];
  const r = E.estadoCel?.redes;
  const hoy = hoyEnBalcarce();
  const piezas = r?.piezas ?? [];
  const salio = (p) => E.libro?.instagram?.[`${hoy}/${p.nombre}`]?.cuando ?? null;
  const proxima = piezas.filter((p) => !salio(p) && estadoDePieza({ hora: p.hora, ventana: p.ventana, salio: null }).clase !== 'mal').sort((a, b) => String(a.hora).localeCompare(String(b.hora)))[0] ?? null;
  const masVieja = sinDecidir.map((n) => Date.parse(n.fecha)).filter(Number.isFinite).sort((a, b) => a - b)[0];
  const rev = E.revision ? contarRevision(E.revision.items) : null;
  const resumen = resumenDeHoy({
    generado: E.portada?.generado ?? null,
    esperan: { n: sinDecidir.length, deBalcarce: sinDecidir.filter((n) => n.seccion === 'Balcarce').length, masVieja: masVieja ? haceCuanto(new Date(masVieja).toISOString()) : null },
    sinCuerpo: sinCuerpoVigentes().length,
    borradores: { listos: borradores.length, conMarca: borradores.filter((b) => (b.problemas ?? []).length).length, enCurso },
    sinFoto: { n: fotos.length, firmes: fotos.filter((x) => MOTIVOS_DE_FOTO[x.motivo]?.firme).length },
    redes: r ? { problemas: problemasDeHoy(E.libro, hoy).length, salieron: piezas.filter(salio).length, total: piezas.length, proxima: proxima ? { que: proxima.que, hora: proxima.hora } : null } : null,
    pistas: pistasConNovedad(),
    graves: rev?.graves ?? 0,
    // Regla 317: la pausa general y la última vuelta del motor, de la nube (no de las corridas de GitHub).
    ...datosDeHoyDeLaNube(E.nube, { haceCuanto }),
  });
  app.innerHTML = htmlDeHoy(resumen, { esc, haceCuanto, horaEnBalcarce });
  // Si lo de la nube es viejo (más de un minuto) se vuelve a pedir; al llegar, la pantalla se dibuja de nuevo.
  if (Date.now() - E.nubeCargadaEn > 60000) refrescarNube();
}

// ------------------------------------------------------------------ la nube: pausa general y vueltas del motor (regla 317)

/** Pide a la nube si la pausa está prendida y cómo viene el motor. Nunca tira: si falla, queda anotado el motivo. Vuelve a dibujar Hoy o Más si están a la vista. */
async function refrescarNube() {
  if (!E.nubeCliente) return;
  E.nubeCargadaEn = Date.now();
  try { E.nube = await E.nubeCliente.estado(); } catch (e) { E.nube = { error: explicarErrorDeLaNube(e) }; }
  if (E.pestana === 'hoy') vistaHoy();
  else if (E.pestana === 'mas') vistaMas();
}

/** Prende o apaga la pausa general (un toque, con una pregunta antes). */
async function cambiarPausa(prender) {
  if (!E.nubeCliente) return;
  const r = await preguntar(prender ? PREGUNTA_DE_PAUSA : PREGUNTA_DE_REANUDAR);
  if (!r.ok) return;
  try {
    const j = prender ? await E.nubeCliente.pausar({ motivo: r.texto, nombre: E.nombre }) : await E.nubeCliente.reanudar({ nombre: E.nombre });
    aviso(prender ? (j.yaEstaba ? AVISOS_DE_LA_NUBE.yaPausada : AVISOS_DE_LA_NUBE.pausada) : (j.yaEstaba ? AVISOS_DE_LA_NUBE.yaReanudada : AVISOS_DE_LA_NUBE.reanudada), { ms: 9000 });
  } catch (e) { aviso(explicarErrorDeLaNube(e), { ms: 12000 }); }
  await refrescarNube();
}

/** Si la nota va a tener foto cuando se publique, y si no, por qué (2/10, Hernán: "saber si la nota que uno revisa va a tener o no foto"). */
function fotoDeLaNota(n) {
  const entrada = E.banco?.[n.id];
  if (E.trabajos[n.id]?.clase === 'foto' && E.trabajos[n.id].estado === 'listo') return { clase: 'ok', corto: '📷 foto sumada', largo: 'Ya se le sumó una foto: sale con ella cuando se publique.' };
  if (entrada?.archivo || n.foto?.archivo) return { clase: 'ok', corto: '📷 Va con foto', largo: `Tiene foto${entrada?.credito ? ` (${entrada.credito})` : ''}: sale con ella cuando se publique.` };
  const motivo = motivoDeFoto(n, entrada);
  // Todavía no se le buscó: se busca al publicarla, con las fotos de sus fuentes.
  if (motivo === 'sinProbar') return { clase: 'espera', corto: '📷 Foto: se busca al publicarla', largo: 'Todavía no se le buscó foto: se la busca cuando se publica, entre las fotos de sus fuentes. Si no hay una que sirva, queda sin foto y podés sumarle una desde la pestaña Fotos.' };
  const m = MOTIVOS_DE_FOTO[motivo];
  return { clase: m.firme ? 'mal' : 'espera', corto: '🚫 Sin foto', largo: `Hoy saldría sin foto. ${m.texto}` };
}

/** Por qué una nota todavía no salió, en una frase que se entienda, y qué falta para que salga. */
function porQueNoSalio(n, tipo) {
  if (tipo === 'sin-cuerpo') {
    const e = estadoSinCuerpo({ intentos: n.intentos ?? 0, maximo: n.maximo ?? E.intentosMaximos, conCuerpo: !!E.correcciones.notas?.[n.id]?.cuerpo });
    const medios = n.fuentes?.length ?? 0;
    return {
      etiqueta: 'Falta el cuerpo', clase: e.clase === 'mal' ? 'mal' : 'espera',
      porque: `La IA todavía no logró escribir un cuerpo que pase el verificador${medios > 1 ? ` (la cuentan ${medios} medios)` : ''}. ${e.texto}`,
      detalle: explicarMotivoSinCuerpo(n.motivo),
      queHacer: e.clase === 'mal' ? 'Se agotaron los intentos: escribila con IA o a mano para que salga.' : 'La IA lo reintenta sola. Si es importante, tocá "Publicar" para que la escriba ahora.',
    };
  }
  return {
    etiqueta: 'Necesita tu OK', clase: 'espera',
    porque: `No sale sola: ${motivoCorto(n.motivo)}.`,
    detalle: '',
    queHacer: 'Abrila: decidí si se publica, se escribe con IA o se descarta.',
  };
}

/**
 * "Esperan": una sola lista de todo lo que todavía no salió, sea porque necesita tu OK o porque le falta el cuerpo (2/10, Hernán: "tienen
 * que ser solo uno… muchas veces no entiendo por qué no salen"). Cada nota dice, con todas las letras, por qué no salió, qué falta y si
 * va a tener foto.
 */
function vistaEsperan(cuando) {
  const { sinDecidir, aprobadas, descartadas } = listasDeEsperan();
  const sinCuerpo = sinCuerpoVigentes();
  const items = [
    ...sinDecidir.map((n) => ({ n, tipo: 'pendiente' })),
    ...sinCuerpo.map((n) => ({ n, tipo: 'sin-cuerpo' })),
  ].sort((a, b) => (Date.parse(b.n.fecha) || 0) - (Date.parse(a.n.fecha) || 0));
  const tarjetaDe = ({ n, tipo }) => {
    const p = porQueNoSalio(n, tipo);
    const f = fotoDeLaNota(n);
    return tarjeta(n, { tipo, extra: `<span class="est ${p.clase}"><strong>${esc(p.etiqueta)}</strong> · ${esc(p.porque)}</span><span class="est ${f.clase}">${esc(f.corto)}</span>` });
  };
  const aOk = items.filter((x) => x.tipo === 'pendiente').length;
  app.innerHTML = `
    <h1>Esperan</h1>
    ${queEs('esperan')}
    <p class="estado">${esc(cuando)} <strong>${items.length}</strong> notas todavía no salieron: <strong>${aOk}</strong> necesitan tu OK y <strong>${items.length - aOk}</strong> esperan que la IA escriba su cuerpo. ${E.pendientes ? '' : 'El detalle de las que esperan tu OK todavía no llegó cifrado para este celular: llega en la próxima actualización (cada media hora).'}</p>
    ${items.length ? items.map(tarjetaDe).join('') : '<p class="vacio">No hay nada esperando.</p>'}
    ${aprobadas.length ? `<h2>Aprobadas (salen en la próxima actualización)</h2>${aprobadas.map((n) => tarjeta(n, { tipo: 'pendiente' })).join('')}` : ''}
    ${descartadas.length ? `<h2>Descartadas (se pueden volver a traer)</h2>${descartadas.map((n) => tarjeta(n, { tipo: 'pendiente' })).join('')}` : ''}`;
}

/** Las horas que cubre la lista de "Publicadas" por defecto (2/10, Hernán: "sólo las últimas 24 horas, así son menos y es más fácil empezar a mirar"). */
const HORAS_EN_PUBLICADAS = 24;

function vistaPublicadas(cuando) {
  const q = E.busqueda.toLowerCase();
  const retiradas = E.papelera.filter((n) => dentroDe(n.retirada, HORAS_RETIRADAS));
  const enPortada = E.portada?.notas ?? [];
  const deLasFuentes = enPortada.filter((n) => !n.propia);
  const propias = enPortada.length - deLasFuentes.length;
  const desde = Date.now() - HORAS_EN_PUBLICADAS * 36e5;
  const ultimas = deLasFuentes.filter((n) => (Date.parse(n.fecha) || 0) >= desde);
  const todas = [...enPortada, ...(E.archivo ?? []).filter((a) => !enPortada.some((n) => n.id === a.id))].filter((n) => !n.propia);
  // Buscando, se busca en todo lo que está cargado; sin buscar, sólo lo de las últimas 24 horas (o todo, si se pidió).
  const base = q || E.publicadasTodas ? todas : ultimas;
  const lista = base.filter((n) => !q || `${n.titulo} ${n.seccion}`.toLowerCase().includes(q)).sort((a, b) => (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0)).slice(0, 80);
  const enArchivo = E.estadoCel?.archivo;
  const alcance = q ? `Buscando en ${todas.length} notas${E.archivo ? ' (portada y archivo)' : ' de la portada'}.`
    : E.publicadasTodas ? `Mostrando todas: ${todas.length} notas${E.archivo ? ' (portada y archivo)' : ' de la portada (36 horas)'}.`
      : 'Mostrando sólo las últimas 24 horas.';
  app.innerHTML = `
    <h1>Publicadas</h1>
    ${queEs('publicadas')}
    <p class="estado">${esc(cuando)} <strong>${ultimas.length}</strong> en las últimas ${HORAS_EN_PUBLICADAS} horas (${deLasFuentes.length} en la portada, que muestra 36)${propias ? `, más ${propias} del sitio (el dólar y los repasos, que no se editan desde acá)` : ''}${enArchivo ? ` · <strong>${enArchivo}</strong> con página en el archivo (hasta 180 días)` : ''}.</p>
    <input type="search" id="buscar" placeholder="Buscar por título o sección (en todo el archivo)" value="${esc(E.busqueda)}" aria-label="Buscar">
    <p class="estado">${esc(alcance)} ${E.publicadasTodas ? '<button type="button" class="boton" data-accion="solo-24">Sólo las últimas 24 horas</button>' : (q ? '' : '<button type="button" class="boton" data-accion="todas-las-publicadas">Ver también las anteriores</button>')}
    ${E.archivo ? '' : '<button type="button" class="boton" data-accion="archivo">Cargar el archivo (para buscar más atrás)</button>'}</p>
    ${lista.map((n) => tarjeta(n, { tipo: 'publicada', extra: E.correcciones.notas?.[n.id] ? '<span class="marca">✎ corregida</span>' : '' })).join('') || '<p class="vacio">Nada con eso.</p>'}
    <h2 id="retiradas">Retiradas en las últimas ${HORAS_RETIRADAS} horas (se pueden volver a publicar)</h2>
    ${retiradas.length ? retiradas.map((n) => tarjeta({ ...n, fecha: n.retirada }, {
    tipo: 'retirada',
    extra: `<span class="meta">retirada${n.por ? ` por ${esc(n.por)}` : ''}${n.motivo ? `: ${esc(n.motivo)}` : ''}</span>${vueltaAPublicar(n) ? '<span class="marca">↺ vuelve en la próxima actualización</span>' : ''}`,
  })).join('')
    : `<p class="estado">${E.pendientes ? `No hay notas retiradas en las últimas ${HORAS_RETIRADAS} horas.` : 'La lista de retiradas llega cifrada con la próxima actualización de la web.'}</p>`}`;
  $('#buscar').addEventListener('input', (ev) => {
    E.busqueda = ev.target.value;
    clearTimeout(vistaPublicadas.t);
    vistaPublicadas.t = setTimeout(() => { vistaLista(); const b = $('#buscar'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }, 250);
  });
}

// ------------------------------------------------------------------ las fotos

/** Las notas de la portada sin foto, con el porqué y dónde buscarla (fotos.js). Para sumarla, la nube la baja y la guarda (foto-manual.mjs). */
function resumenDeFotos() {
  const notas = (E.portada?.notas ?? []).filter((n) => !n.propia || n.propia === 'pista');
  const items = notasSinFoto(notas, E.banco ?? {});
  return { items, total: notas.length, conFoto: notas.length - items.length };
}

function vistaFotos() {
  pestanas();
  $('#recargar').hidden = false;
  const { items, total, conFoto } = resumenDeFotos();
  const marcas = {};
  for (const [id, t] of Object.entries(E.trabajos)) {
    if (t.clase !== 'foto') continue;
    marcas[id] = { escribiendo: '<span class="marca espera">⏳ sumando la foto…</span>', listo: '<span class="marca">✓ foto sumada: sale en la próxima actualización</span>', fallo: `<span class="marca mal">⚠ no se pudo sumar${t.motivo ? `: ${esc(t.motivo)}` : ''}</span>` }[t.estado] ?? '';
  }
  app.innerHTML = htmlDeFotos({ items, total, conFoto, marcas }, { esc, chip, haceCuanto }) + queEs('fotos');
}

function vistaFoto(id) {
  const espera = buscar('pendiente', id) ?? buscar('sin-cuerpo', id);
  const item = resumenDeFotos().items.find((x) => x.nota.id === id)
    ?? (espera && !E.banco?.[id]?.archivo ? { nota: espera, motivo: motivoDeFoto(espera, E.banco?.[id]), entrada: E.banco?.[id] ?? null } : null);
  if (!item) { aviso('Esa nota ya tiene foto o ya no está en la lista.'); vistaLista(); return; }
  $('#pestanas').hidden = true;
  app.innerHTML = htmlDeUnaNotaSinFoto(item, { esc, chip, haceCuanto });
  window.scrollTo(0, 0);
  $('#form-foto').addEventListener('submit', (ev) => {
    ev.preventDefault();
    sumarFoto(id, { url: $('#f-url').value.trim(), credito: $('#f-credito').value, confirmo: $('#f-ok').checked });
  });
}

/** Achica una foto en el celular: JPEG de hasta 1.200 px de ancho, como las del banco. Devuelve el base64 (sin el encabezado). */
async function achicarEnElCelular(archivo, { ancho = 1200, calidad = 0.82 } = {}) {
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, ancho / imagen.width);
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  const blob = await new Promise((ok) => { lienzo.toBlob(ok, 'image/jpeg', calidad); });
  if (!blob) throw new Error('No pude achicar la foto.');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Sube una foto nuestra desde el celular: se achica acá, se guarda en el repositorio y queda anotada SIN fuente (salvo que se escriba un crédito). */
async function subirFotoPropia(id) {
  const archivo = $('#f-archivo')?.files?.[0];
  if (!archivo) { aviso('Elegí primero la foto (tocá "Elegir archivo").'); return; }
  if (!$('#f-ok')?.checked) { aviso('Tildá la confirmación: sin marca de otro medio y sin menores reconocibles.'); return; }
  const credito = ($('#f-credito-propio')?.value ?? '').replace(/\s+/g, ' ').trim().replace(/^foto:\s*/i, '').slice(0, 80);
  E.trabajos[id] = { clase: 'foto', estado: 'escribiendo', desde: Date.now() };
  aviso('Subiendo la foto…');
  try {
    const base64 = await achicarEnElCelular(archivo);
    await E.cliente.subirArchivo(`web/public/fotos-notas/${id}.jpg`, base64, `Panel del celular: ${E.nombre} sube la foto de una nota`);
    await E.cliente.guardar(ARCHIVOS.fotosManuales, (j) => conFotoManual(j, id, {
      archivo: `fotos-notas/${id}.jpg`, medio: credito || null, credito: credito ? `Foto: ${credito}` : null, licencia: null, origen: 'subida', por: E.nombre, cuando: new Date().toISOString(),
    }), `Panel del celular: ${E.nombre} anota la foto de una nota`);
    E.trabajos[id] = { clase: 'foto', estado: 'listo' };
    E.restaurar = E.scrollLista ?? null;
    vistaLista();
    aviso(`Foto subida${credito ? '' : ' (sin fuente)'}: sale en la web en la próxima actualización.`, { conActualizar: true });
  } catch (e) {
    E.trabajos[id] = { clase: 'foto', estado: 'fallo', motivo: String(e?.message ?? e).slice(0, 160) };
    aviso(`No se pudo subir la foto: ${explicarError(e)}`, { ms: 12000 });
  }
}

/** Le pide a la nube que baje la foto y la guarde, sin trabar el panel: la marca queda en la lista de Fotos. */
async function sumarFoto(id, { url, credito, confirmo }) {
  if (!urlDeFotoValida(url)) { aviso('El enlace no sirve: pegá la dirección completa de la nota o de la imagen (empieza con http:// o https://).', { ms: 9000 }); return; }
  if (!creditoDeFoto(credito)) { aviso('Falta el crédito: quién sacó la foto o de dónde es.'); return; }
  if (!confirmo) { aviso('Tildá la confirmación: sin marca de otro medio y sin menores reconocibles.'); return; }
  const r = await preguntar({
    titulo: '¿Sumar esta foto?', texto: `Se baja, se achica y sale en la nota con el crédito “${creditoDeFoto(credito)}”. Tarda un par de minutos y se ve en la web en la próxima actualización.`, si: 'Sí, sumarla',
  });
  if (!r.ok) return;
  E.trabajos[id] = { clase: 'foto', estado: 'escribiendo', desde: Date.now() };
  E.restaurar = E.scrollLista ?? null;
  vistaLista();
  aviso('Pedido: la nube está sumando la foto. Podés seguir con otra nota.');
  const marca = marcaNueva();
  try {
    await E.cliente.disparar('panel.yml', { accion: 'foto', id, pedido: url, credito: creditoDeFoto(credito).replace(/^Foto:\s*/, ''), marca });
    await esperarCorrida('panel.yml', marca, { mensajeSiFalla: 'la nube no pudo bajar esa imagen (¿es la dirección de la imagen y no la de la página? ¿pesa mucho?). El motivo está en GitHub → Actions → "Panel del celular"' });
    E.trabajos[id] = { clase: 'foto', estado: 'listo' };
    aviso('Foto sumada: sale en la web en la próxima actualización.', { conActualizar: true });
  } catch (e) {
    E.trabajos[id] = { clase: 'foto', estado: 'fallo', motivo: String(e?.message ?? e).slice(0, 160) };
    aviso(`No se pudo sumar la foto: ${explicarError(e)}`, { ms: 12000 });
  }
  if (enUnaLista()) vistaLista();
}

function vistaRedes() {
  const r = E.estadoCel?.redes;
  if (!r) {
    app.innerHTML = `<h1>Redes</h1>${queEs('redes')}<p class="vacio">El cronograma de las redes aparece después de la próxima actualización de la web.</p>`;
    return;
  }
  const hoy = hoyEnBalcarce();
  const reglas = reglasFb();
  const tituloDe = (id) => (E.portada?.notas ?? []).find((n) => n.id === id)?.titulo ?? (E.archivo ?? []).find((n) => n.id === id)?.titulo ?? null;
  const salioPieza = (nombre) => E.libro?.instagram?.[`${hoy}/${nombre}`]?.cuando ?? null;
  // La previa se armó hoy o es de ayer (pasada la medianoche, hasta la próxima actualización).
  const deHoy = Number.isFinite(Date.parse(r.generado ?? '')) && hoyEnBalcarce(new Date(r.generado)) === hoy;
  const piezas = (r.piezas ?? []).map((p) => {
    const e = estadoDePieza({ hora: p.hora, ventana: p.ventana, salio: salioPieza(p.nombre) });
    return `<li class="fila"><span class="hora">${esc(p.hora)}</span><span class="que">${esc(p.que)}<span class="meta"> · ${p.tipo === 'reel' ? 'video' : 'historia'}${p.voz ? `, ${esc(VOCES[p.voz] ?? p.voz)}` : ''}</span></span><span class="est ${e.clase}">${e.icono} ${esc(e.texto)}</span></li>`;
  }).join('');
  const repasos = (r.repasos ?? []).map((p) => {
    const salio = salioPieza(p.nombre) ?? (deHoy ? p.salio : null);
    const ventana = (r.piezas ?? []).find((x) => x.nombre === p.nombre)?.ventana ?? 0;
    const e = estadoDePieza({ hora: p.hora, ventana, salio });
    // Si pasó su hora y no salió, no se muestran notas: hoy ya no las cuenta.
    const notas = salio || e.clase !== 'mal' ? (p.notas ?? []) : [];
    const lista = notas.length ? `<ol class="notas-repaso">${notas.map((n) => `<li>${chip(n.seccion)}${esc(n.titulo ?? tituloDe(n.id) ?? 'una nota que ya no está en la web')}</li>`).join('')}</ol>` : '';
    const explicacion = salio ? (notas.length ? 'Contó:' : '')
      : e.clase === 'mal' ? 'Hoy ya no sale.'
        : notas.length ? `Si saliera ahora contaría esto${p.segundos ? ` (unos ${esc(p.segundos)} segundos)` : ''}. Puede cambiar hasta su hora: si entra una nota nueva o si se retira una.`
          : 'Todavía no hay notas para contar. Si a su hora no hay, no sale.';
    return `<div class="caja"><h3>${esc(p.titulo)} <span class="meta">· ${esc(p.hora)}${p.voz ? `, ${esc(VOCES[p.voz] ?? p.voz)}` : ''}</span></h3>
      <p class="est ${e.clase}">${e.icono} ${esc(e.texto)}</p>
      ${explicacion ? `<p class="estado">${explicacion}</p>` : ''}${lista}</div>`;
  }).join('');
  const posteos = Object.entries(E.libro?.facebook ?? {})
    .filter(([, v]) => v?.cuando && hoyEnBalcarce(new Date(v.cuando)) === hoy)
    .sort((a, b) => Date.parse(a[1].cuando) - Date.parse(b[1].cuando));
  const ultimo = Object.values(E.libro?.facebook ?? {}).reduce((max, v) => Math.max(max, Date.parse(v?.cuando ?? '') || 0), 0);
  const cola = (r.facebook?.cola ?? []).filter((n) => !enFacebook(n.id));
  app.innerHTML = `
    <h1>Redes</h1>
    ${queEs('redes')}
    ${r.activas === false ? '<p class="problemas"><strong>Las redes están apagadas</strong> (la variable REDES_ACTIVAS de GitHub no dice "Si"): nada de esto sale. Es lo que saldría si estuvieran prendidas.</p>' : ''}
    <p class="estado">${deHoy ? `Las notas de cada repaso se calcularon ${esc(haceCuanto(r.generado))}; lo que ya salió está al día.` : 'Es la previa de ayer: la de hoy se arma en la próxima actualización de la web.'}</p>
    <h2>Hoy</h2>
    <ul class="cronograma">${piezas}</ul>
    <h2>Qué salió y qué no, red por red</h2>
    ${seccionPorRed(r, hoy)}
    <h2>Qué cuenta cada repaso</h2>
    ${repasos}
    <h2>Facebook (y su foto en Instagram)</h2>
    <p class="estado">Hoy salieron <strong>${posteos.length}</strong> de ${reglas.porDia}. ${esc(proximoPosteo({ ultimo: ultimo ? new Date(ultimo).toISOString() : null, hoySalieron: posteos.length, reglas }))}</p>
    ${posteos.length ? `<ul class="lista-simple">${posteos.map(([id, v]) => `<li><span class="meta">${esc(horaEnBalcarce(v.cuando))}</span> ${esc(v.titulo ?? tituloDe(id) ?? '')}</li>`).join('')}</ul>` : ''}
    <h3>En la cola</h3>
    ${cola.length ? `<ol class="lista-simple">${cola.map((n) => `<li>${n.marcada ? '<span class="marca">→ la mandó una persona</span> ' : ''}${chip(n.seccion)}${esc(n.titulo ?? tituloDe(n.id) ?? '')}</li>`).join('')}</ol>
      <p class="ayuda">Sale la primera de la cola cuando toca. Para mandar otra, abrila en Publicadas y tocá "Mandar también a las redes".</p>`
    : `<p class="estado">No hay notas en la cola. Entran solas las de Balcarce con relevancia alta, y las que manda una persona, de las últimas ${reglas.edadMaximaHoras} horas.</p>`}`;
}

// ------------------------------------------------- qué salió y qué no, red por red

/** Cada pieza de hoy, partida en reel, historia, Instagram y Facebook, con el motivo si algo falló y un botón para reintentar. */
function seccionPorRed(r, hoy) {
  const estados = estadoPorRed({ libro: E.libro, piezas: r.piezas ?? [], dia: hoy });
  if (!estados.length) return '<p class="estado">Hoy no hay piezas armadas.</p>';
  const icono = { ok: '✓', mal: '✕', espera: '⏳' };
  return estados.map(({ pieza, partes }) => `<div class="caja"><h3>${esc(pieza.hora)} · ${esc(pieza.que)}</h3><ul class="partes">${partes.map((p) => `<li>
      <span>${esc(NOMBRE_DE_RED[p.red])} · ${esc(NOMBRE_DE_PARTE[p.parte])}</span>
      <span class="est ${p.clase}">${icono[p.clase]} ${esc(p.texto)}</span>
      ${p.clase === 'mal' ? `<span class="meta">${esc(p.error !== null ? explicarFalloDeRed(p.error) : 'No quedó anotado por qué: pasó su horario sin armarse (o es de antes de que se registraran los fallos). Sin video guardado no se puede reintentar.')}</span>` : ''}
      ${p.puedeReintentar ? `<button type="button" class="boton" data-accion="reintentar" data-pieza="${esc(pieza.nombre)}" data-red="${esc(p.red)}" data-parte="${esc(p.parte)}">Reintentar</button>` : ''}</li>`).join('')}</ul></div>`).join('');
}

/** Sube de nuevo una parte que no salió, con el video que ya estaba armado (no gasta voz). */
async function reintentarParte(pieza, red, parte) {
  const r = await preguntar({
    titulo: '¿Reintentar?', texto: `Se vuelve a subir ${NOMBRE_DE_PARTE[parte].toLowerCase()} a ${NOMBRE_DE_RED[red]} con el video que ya estaba armado: no gasta voz. Tarda un par de minutos.`, si: 'Sí, reintentar',
  });
  if (!r.ok) return;
  $('#pestanas').hidden = true;
  app.innerHTML = '<div class="girando"></div><p class="vacio">Subiéndolo de nuevo…<br>Tarda un par de minutos.</p>';
  const marca = marcaNueva();
  try {
    await E.cliente.disparar('reintentar.yml', { pieza, red, parte, dia: hoyEnBalcarce(), marca });
    const corrida = await esperarCorrida('reintentar.yml', marca, { intentos: 60, sinLanzar: true });
    await cargar({ archivo: !!E.archivo });
    E.pestana = 'redes';
    vistaLista();
    aviso(corrida.conclusion === 'success' ? 'Listo: salió.' : 'Volvió a fallar: abajo se ve el motivo.', { ms: 9000 });
  } catch (e) {
    aviso(explicarError(e), { ms: 9000 });
    E.pestana = 'redes';
    vistaLista();
  }
}

// ------------------------------------------------------------------ los contactos

/** Trae las instituciones (archivo público) y lo privado (contactos propios y a quién se le escribió, cifrado para los celulares). */
async function cargarContactos() {
  const [publicos, privado] = await Promise.all([
    leerSiHay(E.cliente, ARCHIVOS.contactosPublicos, { contactos: [] }), leerSiHay(E.cliente, ARCHIVOS.contactosCelular, { contactos: {} }),
  ]);
  const entradas = {};
  let sinAbrir = 0;
  await Promise.all(Object.entries(privado.contactos ?? {}).map(async ([clave, sobre]) => {
    const e = E.llaves ? await abrir(sobre, E.llaves) : null;
    if (e) entradas[clave] = e; else sinAbrir += 1;
  }));
  E.contactos = { publicos: publicos.contactos ?? [], entradas, sinAbrir };
  E.filtroContactos ??= 'todos';
}

const listaDeContactos = () => armarContactos({ publicos: E.contactos?.publicos ?? [], entradas: E.contactos?.entradas ?? {} });

function vistaContactos() {
  pestanas();
  $('#recargar').hidden = false;
  if (!E.contactos) { app.innerHTML = '<div class="girando"></div>'; cargarContactos().then(() => { if (E.pestana === 'contactos') vistaContactos(); }).catch((e) => { aviso(explicarError(e), { ms: 9000 }); }); return; }
  if (E.nuevoContacto) {
    app.innerHTML = htmlDeFormularioContacto({ esc });
    $('#form-contacto').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const nuevo = contactoPropio({
        nombre: $('#c-nombre').value, rol: $('#c-rol').value, organizacion: $('#c-org').value, whatsapp: $('#c-wa').value, mail: $('#c-mail').value, nota: $('#c-nota').value,
      });
      if (!nuevo) { aviso('Falta el nombre.'); return; }
      try {
        await guardarContacto(`p-${nuevo.id}`, nuevo);
        E.nuevoContacto = false;
        aviso('Contacto guardado (cifrado: sólo lo ven los celulares registrados).');
      } catch (e) { aviso(explicarError(e), { ms: 9000 }); }
      vistaContactos();
    });
    return;
  }
  if (E.cola) { app.innerHTML = htmlDeCola({ cola: E.cola, indice: E.cola.indice }, { esc }); window.scrollTo(0, 0); return; }
  const lista = listaDeContactos();
  const uno = E.contactoAbierto ? lista.find((c) => c.id === E.contactoAbierto) : null;
  if (uno) { app.innerHTML = htmlDeUnContacto(uno, { esc }); window.scrollTo(0, 0); return; }
  E.contactoAbierto = null;
  app.innerHTML = htmlDeContactos({ lista, filtro: E.filtroContactos, q: E.busquedaContactos ?? '', sinAbrir: E.contactos.sinAbrir }, { esc }) + queEs('contactos');
  $('#buscar-contactos').addEventListener('input', (ev) => {
    E.busquedaContactos = ev.target.value;
    clearTimeout(vistaContactos.t);
    vistaContactos.t = setTimeout(() => { vistaContactos(); const b = $('#buscar-contactos'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }, 250);
  });
}

/** Guarda una anotación o un contacto propio: un sobre por renglón, cifrado para todos los celulares registrados (y este). */
async function guardarContacto(clave, contenido) {
  const registro = (await E.cliente.leer(ARCHIVOS.llaves)).json.llaves ?? [];
  const sobre = await cerrarSobre(contenido, registro);
  if (!sobre) throw new Error('No hay celulares registrados para cifrar.');
  await E.cliente.guardar(ARCHIVOS.contactosCelular, (j) => ({ version: 1, ...j, contactos: { ...(j.contactos ?? {}), [clave]: sobre } }), `Panel del celular: ${E.nombre} anota un contacto`);
  E.contactos.entradas[clave] = contenido;
}

/** Anota a quién se le escribió o quién respondió. */
async function anotarContacto(id, cambio) {
  const clave = `h-${id}`;
  try {
    await guardarContacto(clave, conHistorial(E.contactos.entradas[clave], id, cambio));
    return true;
  } catch (e) { aviso(explicarError(e), { ms: 9000 }); return false; }
}

/** El mensaje que está escrito en la pantalla (editable) para el contacto, con su enlace de WhatsApp o de correo. */
function abrirCanal(id, canal) {
  const c = listaDeContactos().find((x) => x.id === id);
  if (!c) return;
  const texto = $('#mensaje-contacto')?.value ?? c.mensaje;
  const url = canal === 'whatsapp' ? enlaceWhatsApp(c.whatsapp, texto) : enlaceMail(c.mail, texto);
  if (url) window.open(url, '_blank', 'noopener');
}

// ------------------------------------------------------------------ las pistas

/** Trae las pistas guardadas (web/data/pistas.json, escribe sólo la nube). Si falla, la pestaña sigue sin ellas. */
async function cargarPistas() {
  try { E.pistasLibro = await leerSiHay(E.cliente, ARCHIVOS.pistas, { pistas: {} }); } catch { E.pistasLibro = E.pistasLibro ?? { pistas: {} }; }
}

const pistasConNovedad = () => Object.values(E.pistasLibro?.pistas ?? {}).filter((p) => p.estado === 'abierta' && p.novedad).length;

function vistaPistas() {
  pestanas();
  $('#recargar').hidden = false;
  const apps = { esc, haceCuanto, chip };
  if (!E.pistasLibro) { app.innerHTML = '<div class="girando"></div>'; cargarPistas().then(() => { if (E.pestana === 'pistas') vistaPistas(); }); return; }
  if (E.cerrandoPista && E.pistasLibro.pistas?.[E.cerrandoPista]) { app.innerHTML = htmlDeCerrarPista({ id: E.cerrandoPista, pista: E.pistasLibro.pistas[E.cerrandoPista] }, apps); return; }
  if (E.pistaAbierta) { vistaUnaPista(); return; }
  app.innerHTML = htmlDeFormulario({ texto: E.pista?.texto ?? '' }, apps) + htmlDeLista(E.pistasLibro, apps) + queEs('pistas');
}

/** "/nota/np123" → la dirección completa de la nota, con su titular, si la web ya la armó (portada o archivo); si no, null. */
function enlaceDeUnaNotaDePista(ruta) {
  const id = String(ruta ?? '').split('/').pop();
  const n = (E.portada?.notas ?? []).find((x) => x.id === id) ?? (E.archivo ?? []).find((x) => x.id === id);
  return n ? enlaceDeNota(n) : null;
}

/** Una pista guardada: su informe se abre acá con la llave de este celular; si tenía novedad, se apaga. */
async function vistaUnaPista() {
  const id = E.pistaAbierta;
  const pista = E.pistasLibro?.pistas?.[id];
  if (!pista) { E.pistaAbierta = null; vistaPistas(); return; }
  const informe = pista.sobre && E.llaves ? await abrir(pista.sobre, E.llaves) : null;
  app.innerHTML = htmlDeUnaPista({ id, pista, informe, enCurso: { nota: !!E.tareas[`nota-${id}`], mirar: !!E.tareas[`mirar-${id}`] } }, { esc, haceCuanto, chip, enlaceDeNota: enlaceDeUnaNotaDePista });
  window.scrollTo(0, 0);
  if (pista.novedad) {
    pista.novedad = false;
    E.cliente.guardar(ARCHIVOS.pistas, (j) => conPistaSinNovedad(j, id), `Panel del celular: ${E.nombre} mira una pista`).catch(() => { pista.novedad = true; });
  }
}

// ------------------------------------------------------------ las tareas en curso (3/10)
//
// Hernán: "sigue siendo medio raro el flujo, no se sabe si está haciendo algo o hay que esperar". Todo lo que se le pide a la nube (investigar una pista,
// hacer la nota, volver a mirar) corre en segundo plano: el panel no se traba con una ruedita; arriba, bajo la barra, queda una franja con lo que se
// está haciendo, cuánto lleva y en qué paso va GitHub; al terminar, un aviso con el botón para ver el resultado.

/** Registra una tarea y enciende la franja de arriba. */
function empezarTarea(clave, titulo) {
  E.tareas[clave] = { titulo, desde: Date.now(), paso: 'Mandando el pedido a GitHub…' };
  dibujarProgreso();
  if (!E.relojDeTareas) E.relojDeTareas = setInterval(dibujarProgreso, 1000);
}

function terminarTarea(clave) {
  delete E.tareas[clave];
  dibujarProgreso();
  if (!Object.keys(E.tareas).length && E.relojDeTareas) { clearInterval(E.relojDeTareas); E.relojDeTareas = null; }
}

const reloj = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** La franja "⏳ lo que se está haciendo · 0:42 · paso" bajo la barra de arriba. */
function dibujarProgreso() {
  const caja = $('#progreso');
  if (!caja) return;
  const tareas = Object.values(E.tareas);
  caja.hidden = !tareas.length;
  caja.innerHTML = tareas.map((t) => `<div class="tarea"><span class="reloj">⏳ ${reloj(Date.now() - t.desde)}</span> <strong>${esc(t.titulo)}</strong><span class="paso">${esc(t.paso)}</span></div>`).join('');
}

/** Lo que dice la franja según en qué va la corrida de GitHub: todavía no aparece, en cola o en qué paso va. */
async function ponerPaso(clave, corrida) {
  const t = E.tareas[clave];
  if (!t) return;
  if (!corrida) { t.paso = 'Esperando que GitHub tome el pedido…'; return; }
  if (corrida.status === 'queued') { t.paso = 'En la cola de GitHub (puede haber otra tarea antes)…'; return; }
  try {
    const pasos = (await E.cliente.pasos(corrida.id)).filter((p) => !/^(Set up job|Complete job|Post |Run actions\/)/.test(p.name));
    const i = pasos.findIndex((p) => p.status !== 'completed');
    t.paso = i >= 0 ? `Paso ${i + 1} de ${pasos.length}: ${pasos[i].name}` : 'Terminando…';
  } catch { t.paso = 'GitHub está trabajando…'; }
}

/** Espera una corrida del workflow con esa marca; devuelve la corrida terminada o lanza si tardó o falló. Con `tarea`, va contando en la franja. */
async function esperarCorrida(workflow, marca, { intentos = 72, quePaso = 'La corrida de GitHub', tarea = null, mensajeSiFalla = null, sinLanzar = false } = {}) {
  let corrida = null;
  let repeticiones = 0;
  for (let i = 0; i < intentos; i += 1) {
    await dormir(i === 0 ? 2500 : 4000);
    corrida = corridaConMarca(await E.cliente.corridas(workflow), marca);
    if (tarea) await ponerPaso(tarea, corrida);
    // A-3: con el candado puesto GitHub deja uno solo esperando y cancela al anterior. Si lo cancelaron, no es un error de la persona: se vuelve a pedir.
    if (corrida?.status === 'completed' && corrida.conclusion === 'cancelled' && repeticiones < 2) {
      const nueva = await E.cliente.repetir?.(marca);
      if (nueva) {
        repeticiones += 1;
        marca = nueva;
        corrida = null;
        if (tarea && E.tareas[tarea]) E.tareas[tarea].paso = 'GitHub canceló el pedido porque llegó otro: se vuelve a pedir…';
        continue;
      }
    }
    if (corrida?.status === 'completed') break;
  }
  if (corrida?.status !== 'completed') throw new Error('GitHub tardó demasiado. Probá de nuevo en un rato.');
  if (corrida.conclusion !== 'success' && !sinLanzar) throw new Error(mensajeSiFalla ?? `${quePaso} falló. Mirá "${workflow}" en GitHub → Actions.`);
  return corrida;
}

/** Manda la pista a la nube (workflow "Panel del celular"): se investiga, queda guardada y abierta; mientras, el panel sigue andando. */
async function investigarPista() {
  const texto = ($('#texto-pista')?.value ?? '').trim();
  if (texto.length < 20) { aviso('Pegá el texto de la pista (al menos una frase).'); return; }
  const marca = marcaNueva();
  const id = `pista${marca}`;
  const clave = `investigar-${id}`;
  E.pista = null;
  empezarTarea(clave, 'Investigando la pista');
  aviso('Pedido enviado: la nube busca qué medios lo cubrieron. Tarda un minuto; mirá la franja de arriba. Podés seguir usando el panel.', { ms: 9000 });
  vistaPistas();
  try {
    await E.cliente.disparar('panel.yml', { accion: 'pista', id, pedido: texto, marca });
    await esperarCorrida('panel.yml', marca, { tarea: clave });
    await cargarPistas();
    terminarTarea(clave);
    if (E.pistasLibro.pistas?.[id]) aviso('Lista: la pista quedó abierta y se sigue mirando sola.', { abrirPista: id, ms: 30000 });
    else aviso('La pista no se pudo investigar (puede tocar un tema que no se investiga desde acá). Probá con más detalle.', { ms: 12000 });
  } catch (e) {
    terminarTarea(clave);
    aviso(`No se pudo investigar: ${explicarError(e)}`, { ms: 12000 });
  }
  if (enUnaLista() && E.pestana === 'pistas') vistaPistas();
}

/** Las fuentes de las que escribió la IA, para que quien revisa pueda abrirlas (en "Fuentes" de la nota quedan estas mismas). */
function fuentesDelBorrador(b) {
  const f = b?.fuentes ?? [];
  if (!f.length) return '';
  return `<div class="caja"><strong>Escrita con ${f.length} ${f.length === 1 ? 'fuente' : 'fuentes'}:</strong><ul class="lista-simple">${f.map((x) => `<li><a href="${esc(x.enlace)}" target="_blank" rel="noopener noreferrer">${esc(x.medio)} ↗</a></li>`).join('')}</ul>
    <p class="meta">Abrilas y comprobá que lo central esté en ellas. Con una sola fuente, pensalo dos veces.</p></div>`;
}

/** "Hacer la nota": la nube busca en internet las notas de los medios con su texto y escribe un borrador, en segundo plano; al terminar avisa. */
function hacerNotaDePista(id) {
  const clave = `nota-${id}`;
  if (E.tareas[clave]) { aviso('Ya se está escribiendo la nota de esta pista: mirá la franja de arriba.'); return; }
  empezarTarea(clave, 'Escribiendo la nota de la pista');
  aviso('Pedido enviado: la nube busca en internet, lee las fuentes, escribe y verifica. Tarda 1 o 2 minutos; mirá la franja de arriba. Podés seguir usando el panel.', { ms: 9000 });
  E.pestana = 'pistas';
  E.pistaAbierta = id;
  vistaLista();
  trabajoNotaDePista(id, clave);
}

async function trabajoNotaDePista(id, clave) {
  const marca = marcaNueva();
  const desde = Date.now();
  try {
    await E.cliente.disparar('panel.yml', { accion: 'nota-pista', id, pedido: '', marca });
    await esperarCorrida('panel.yml', marca, { intentos: 90, tarea: clave });
    const { json } = await E.cliente.leer(ARCHIVOS.borradores);
    const sobre = json.borradores?.[`nota-${id}`];
    const borrador = sobre && Date.parse(sobre.cuando) >= desde - 120000 ? await abrir(sobre, E.llaves) : null;
    await cargarPistas();
    terminarTarea(clave);
    if (!borrador) throw new Error('No pude abrir el borrador en este celular. Si recién lo registraste, probá de nuevo.');
    if (!borrador.texto) aviso(borrador.motivo ?? 'No se pudo escribir la nota.', { ms: 15000 });
    else {
      (E.borradoresIA ??= {})[`nota-${id}`] = { b: borrador, cuando: Date.now() };
      aviso(borrador.ok ? 'La nota está lista: revisala y publicala.' : 'La nota está escrita, pero el verificador marcó algo: revisala con cuidado.', { ver: { tipo: 'nota-pista', id }, ms: 60000 });
    }
  } catch (e) {
    terminarTarea(clave);
    aviso(`No se pudo escribir la nota: ${explicarError(e)}`, { ms: 12000 });
  }
  if (enUnaLista() && E.pestana === 'pistas') vistaPistas();
}

/** "Volver a mirar ahora": la nube repite las búsquedas de esa pista (workflow "Pistas"), en segundo plano, y se recarga el libro. */
async function mirarPista(id) {
  const clave = `mirar-${id}`;
  if (E.tareas[clave]) { aviso('Ya se está mirando: mirá la franja de arriba.'); return; }
  empezarTarea(clave, 'Volviendo a mirar la pista');
  aviso('Pedido enviado: la nube repite las búsquedas. Tarda un minuto; mirá la franja de arriba.', { ms: 8000 });
  vistaPistas();
  const marca = marcaNueva();
  try {
    await E.cliente.disparar('pistas.yml', { id, marca });
    await esperarCorrida('pistas.yml', marca, { quePaso: 'La revisión', tarea: clave });
    await cargarPistas();
    terminarTarea(clave);
    aviso('Listo: se volvió a mirar la pista.', { abrirPista: id, ms: 20000 });
  } catch (e) {
    terminarTarea(clave);
    aviso(`No se pudo volver a mirar: ${explicarError(e)}`, { ms: 12000 });
  }
  if (enUnaLista() && E.pestana === 'pistas') vistaPistas();
}

// ------------------------------------------------------------------ la revisión

function vistaRevision() {
  pestanas();
  $('#recargar').hidden = false;
  if (!E.revision) {
    app.innerHTML = `<h1>Revisión</h1>${queEs('revision')}<p class="vacio">Todavía no hay revisión: aparece después de la primera lectura de la IA.</p>`;
    return;
  }
  app.innerHTML = htmlDeRevision(E.revision, { esc, haceCuanto, chip, enlace: (e) => (e.ruta ? `https://radarbalcarce.com${e.ruta}` : null) }) + queEs('revision');
}

// ------------------------------------------------------------------ los números

/** Trae lo que necesita la pestaña (la primera vez que se abre): el detalle de las visitas, la producción, el archivo y las corridas. */
async function abrirNumeros() {
  app.innerHTML = '<div class="girando"></div><p class="vacio">Juntando los números…</p>';
  try {
    const c = E.cliente;
    const traerCorridas = async (w) => { try { return resumenDeCorridas(await c.corridas(w)); } catch { return null; } };
    const [estadisticas, produccion, seleccion, archivo, actualizar, redes, vigilancia] = await Promise.all([
      leerSiHay(c, ARCHIVOS.estadisticas, { puntos: [], dias: {} }), leerSiHay(c, ARCHIVOS.produccion, { dias: {} }), leerSiHay(c, ARCHIVOS.seleccion, null),
      E.archivo ? Promise.resolve(E.archivo) : leerSiHay(c, ARCHIVOS.archivo, { notas: [] }).then((j) => j.notas ?? []),
      traerCorridas('actualizar.yml'), traerCorridas('redes.yml'), traerCorridas('vigilancia.yml'),
    ]);
    E.archivo = archivo;
    // Regla 317: «Actualizar la web» corre en el motor de Cloudflare; si la nube dio sus últimas vueltas, son ésas y no las corridas (viejas) de GitHub.
    E.numeros = { estadisticas, produccion, seleccion, corridas: { actualizar: resumenDeVueltasDelMotor(E.nube?.motor) ?? actualizar, redes, vigilancia } };
    vistaNumeros();
  } catch (e) {
    aviso(explicarError(e), { ms: 9000 });
    app.innerHTML = '<p class="problemas">No se pudieron traer los números.</p><button class="boton" type="button" data-pestana="numeros">Probar de nuevo</button>';
  }
}

function vistaNumeros() {
  pestanas();
  $('#recargar').hidden = false;
  if (!E.numeros) { abrirNumeros(); return; }
  const sinCuerpo = E.esperando.filter((n) => !E.correcciones.notas?.[n.id]?.cuerpo).length;
  app.innerHTML = htmlDeNumeros({
    ...E.numeros, indice: indiceDeNotas(E.portada?.notas, E.archivo), libro: E.libro, rango: E.rangoNumeros ?? 7, hoy: diaDeBalcarce(),
    enlace: enlaceDeNota, espera: { esperan: listasDeEsperan().sinDecidir.length, sinCuerpo }, haceCuanto,
  }) + queEs('numeros');
}

// ------------------------------------------------------------------ las fechas

/** Trae las candidatas, los feriados y lo elegido (la primera vez que se abre la pestaña). */
async function abrirFechas() {
  app.innerHTML = '<div class="girando"></div><p class="vacio">Trayendo las fechas…</p>';
  try {
    const c = E.cliente;
    const [candidatas, feriados, elegidas, piezas] = await Promise.all([
      leerSiHay(c, ARCHIVOS.candidatas, null), leerSiHay(c, ARCHIVOS.feriados, null), leerSiHay(c, ARCHIVOS.elegidas, { dias: {}, feriados: {} }), leerSiHay(c, ARCHIVOS.piezas, null),
    ]);
    E.fechas = { candidatas, feriados, piezas, elegidas: { dias: {}, feriados: {}, piezas: {}, ...elegidas } };
    vistaFechas();
  } catch (e) {
    aviso(explicarError(e), { ms: 9000 });
    app.innerHTML = '<p class="problemas">No se pudieron traer las fechas.</p><button class="boton" type="button" data-accion="volver-fechas">Probar de nuevo</button>';
  }
}

const chipEstilo = (estilo) => '<span class="chip" style="background:var(--s-' + (COLOR_DE_ESTILO[estilo] ?? 'pais') + ')">' + esc(ESTILOS[estilo] ?? estilo) + '</span>';

function vistaFechas() {
  pestanas();
  $('#recargar').hidden = false;
  if (!E.fechas) { abrirFechas(); return; }
  if (E.pieza) { vistaPieza(); return; }
  if (E.dia) { vistaDia(); return; }
  if (E.feriado) { vistaFeriado(); return; }
  const sub = (id, texto) => '<button type="button" data-accion="sub-fechas" data-sub="' + id + '" aria-current="' + (E.subfechas === id) + '">' + texto + '</button>';
  app.innerHTML = '<h1>Fechas</h1>' + queEs('fechas') +
    '<div class="sub">' + sub('piezas', 'Mes armado') + sub('efemerides', 'Candidatas') + sub('feriados', 'Feriados') + '</div>' +
    (E.subfechas === 'piezas' ? listaDePiezas() : E.subfechas === 'efemerides' ? listaDeDias() : listaDeFeriados());
}

function listaDeDias() {
  const cand = E.fechas.candidatas;
  if (!cand) return '<p class="vacio">Todavía no hay candidatas. Se arman con <code>node ingesta/generar-efemerides.mjs</code>.</p>';
  const dias = Object.keys(cand.dias ?? {});
  const el = E.fechas.elegidas;
  const bloques = semanas(dias).map((s) => '<h2>Semana del ' + esc(etiquetaCorta(s.lunes)) + '</h2>' + s.dias.map((d) => {
    const e = el.dias?.[d];
    const prop = !e ? cand.dias[d].propuesta : null;
    const est = prop?.principal ? { texto: '◔ Propuesta automática: falta aprobarla', clase: 'espera' } : estadoDelDia(e);
    const principal = e?.principal ? (e.detalle?.[e.principal]?.titulo ?? '') : (prop?.principal ? (cand.dias[d].candidatas.find((c) => c.id === prop.principal)?.titulo ?? '') : '');
    return '<button type="button" class="tarjeta" data-accion="abrir-dia" data-dia="' + esc(d) + '"><div><strong>' + esc(etiquetaCorta(d)) + '</strong> <span class="est ' + est.clase + '">' + esc(est.texto) + '</span></div>' +
      (principal ? '<div class="meta">' + esc(principal) + '</div>' : '<div class="meta">' + (cand.dias[d].candidatas?.length ?? 0) + ' candidatas</div>') + '</button>';
  }).join('')).join('');
  return '<p class="estado">Armaste ' + diasArmados(dias, el) + ' de ' + dias.length + ' días. Cada uno tiene sus 20 mejores candidatas.</p>' + bloques;
}

function vistaDia() {
  const d = E.dia;
  const cand = E.fechas.candidatas?.dias?.[d]?.candidatas ?? [];
  // Si nadie armó el día, arranca con la propuesta automática (ingesta/efemerides-propuesta.mjs): se aprueba o se cambia.
  const propuesta = E.fechas.elegidas.dias?.[d] ? null : (E.fechas.candidatas?.dias?.[d]?.propuesta ?? null);
  const b = E.borrador ?? borradorDe(E.fechas.elegidas.dias?.[d] ?? propuesta);
  E.borrador = b;
  const estilos = [...new Set(cand.map((c) => c.estilo))];
  const visibles = E.filtroEstilo ? cand.filter((c) => c.estilo === E.filtroEstilo) : cand;
  const filtros = '<div class="filtros"><button type="button" data-accion="filtro-estilo" data-estilo="" aria-pressed="' + !E.filtroEstilo + '">Todas (' + cand.length + ')</button>' +
    estilos.map((s) => '<button type="button" data-accion="filtro-estilo" data-estilo="' + esc(s) + '" aria-pressed="' + (E.filtroEstilo === s) + '">' + esc(ESTILOS[s] ?? s) + '</button>').join('') + '</div>';
  const tarjetas = visibles.map((c) => {
    const rol = rolDe(b, c.id);
    const enlace = /^https?:/.test(c.enlace ?? '') ? c.enlace : (/^https?:/.test(c.fuente ?? '') ? c.fuente : null);
    const boton = (r, texto) => '<button type="button" data-accion="marcar" data-id="' + esc(c.id) + '" data-rol="' + r + '" aria-pressed="' + (rol === r) + '">' + texto + '</button>';
    const marcas = [...(c.marcas ?? []).map((m) => '<span class="motivo">' + esc(marcaLegible(m)) + '</span>'), c.revisaUnaPersona ? '<span class="motivo">la revisa una persona</span>' : ''].join('');
    const datos = c.datos?.length ? '<details><summary>Datos verificados (' + c.datos.length + ')</summary><ul class="datos">' + c.datos.map((x) => '<li>' + esc(x.texto) + (x.fuente && /^https?:/.test(x.fuente) ? ' <a href="' + esc(x.fuente) + '" target="_blank" rel="noopener">fuente</a>' : '') + '</li>').join('') + '</ul></details>' : '';
    return '<div class="cand ' + (rol ?? '') + '">' +
      '<div>' + chipEstilo(c.estilo) + '<span class="meta">' + [c.anio, haceTexto(c.hace), c.importancia ? c.importancia + ' idiomas' : '', c.puntaje + ' pts'].filter(Boolean).map(esc).join(' · ') + '</span></div>' +
      '<div class="texto">' + esc(c.texto) + '</div>' + (marcas ? '<div class="marcas">' + marcas + '</div>' : '') + datos +
      (propuesta?.motivos?.[c.id] ? '<div class="meta"><strong>Por qué se propone:</strong> ' + esc(propuesta.motivos[c.id]) + '</div>' : '') +
      (c.fuente ? '<div class="meta">' + esc(c.fuente) + '</div>' : '') +
      (enlace ? '<a class="ver-nota" href="' + esc(enlace) + '" target="_blank" rel="noopener">Ver la nota en Wikipedia ↗</a>' : '') +
      '<div class="roles">' + ROLES.map(([r, texto]) => boton(r, texto)).join('') + '</div></div>';
  }).join('');
  app.innerHTML = '<button type="button" class="boton" data-accion="volver-fechas">← Los días</button><h1>' + esc(etiquetaLarga(d)) + '</h1>' +
    (propuesta?.principal ? '<p class="problemas">Esta es una <strong>propuesta automática</strong>: ya viene armada con una principal y tres que la acompañan. Cambiala si querés y guardá el día para aprobarla.</p>' : '') +
    '<p class="ayuda">Elegí <strong>una principal</strong>; las que <strong>sí</strong> van; las <strong>opcionales</strong> pueden ir si hace falta; con <strong>no</strong> descartás. Tocá "Ver la nota" para leerla. Lo que elijas queda guardado para afinar el criterio: nada sale solo.</p>' +
    filtros + (tarjetas || '<p class="vacio">No hay candidatas de ese estilo.</p>') +
    '<div class="barra-guardar"><button type="button" class="boton principal ancho" data-accion="guardar-dia">Guardar el día</button></div>';
}

function listaDeFeriados() {
  const lista = E.fechas.feriados?.feriados ?? [];
  if (!lista.length) return '<p class="vacio">Todavía no hay feriados armados.</p>';
  const el = E.fechas.elegidas;
  return '<p class="estado">Los feriados que vienen, cada uno con su enfoque, sus datos y sus fuentes. Los aprobás o pedís cambios.</p>' + lista.map((f) => {
    const e = estadoDeFeriado(el, f.fecha);
    const est = e === 'aprobada' ? '<span class="est ok">✓ aprobado</span>' : e === 'cambiar' ? '<span class="est espera">✎ pediste cambios</span>' : (f.estado === 'por definir' ? '<span class="est mal">por definir</span>' : '<span class="est espera">propuesta</span>');
    return '<button type="button" class="tarjeta" data-accion="abrir-feriado" data-dia="' + esc(f.fecha) + '"><div><strong>' + esc(etiquetaLarga(f.fecha)) + '</strong></div><div class="titulo">' + esc(f.nombre) + '</div><div>' + est + '</div></button>';
  }).join('');
}

function vistaFeriado() {
  const fecha = E.feriado;
  const f = (E.fechas.feriados?.feriados ?? []).find((x) => x.fecha === fecha);
  if (!f) { E.feriado = null; vistaFechas(); return; }
  const e = E.fechas.elegidas.feriados?.[fecha];
  const enlace = (x) => (x.fuente && /^https?:/.test(x.fuente) ? ' <a href="' + esc(x.fuente) + '" target="_blank" rel="noopener">fuente</a>' : '');
  app.innerHTML = '<button type="button" class="boton" data-accion="volver-fechas">← Los feriados</button>' +
    '<h1>' + esc(f.nombre) + '</h1><p class="estado">' + esc(etiquetaLarga(fecha)) + ' · ' + esc(f.tipo) + '</p>' +
    (f.revisaUnaPersona ? '<p class="problemas">Este tema lo revisa una persona antes de salir.</p>' : '') +
    '<div class="caja"><h3>Enfoque propuesto</h3><p>' + esc(f.enfoque ?? 'Todavía no hay un enfoque para este feriado: lo armamos juntos.') + '</p></div>' +
    (f.datos?.length ? '<h2>Datos con su fuente</h2><ul class="datos lista-simple">' + f.datos.map((x) => '<li>' + esc(x.texto) + enlace(x) + (x.segundaFuente === false ? ' <span class="motivo">falta una segunda fuente</span>' : '') + '</li>').join('') + '</ul>' : '') +
    (f.citas?.length ? '<h2>Citas</h2><ul class="datos lista-simple">' + f.citas.map((x) => '<li>«' + esc(x.texto) + '» ' + esc(x.autor ?? '') + enlace(x) + (x.verificada === false ? ' <span class="motivo">sin referencia: confirmar</span>' : '') + '</li>').join('') + '</ul>' : '') +
    (f.nota ? '<p class="ayuda">' + esc(f.nota) + '</p>' : '') +
    '<p class="ayuda">Siempre formal y ameno, sin política partidaria. La pieza habla sólo de la fecha y sale ese día.</p>' +
    (e ? '<p class="estado">Tu decisión: ' + (e.estado === 'aprobada' ? '✓ aprobado' : '✎ cambios pedidos') + (e.comentario ? ' — ' + esc(e.comentario) : '') + ' (' + esc(e.por ?? '') + ')</p>' : '') +
    '<div class="botones"><button type="button" class="boton principal" data-accion="aprobar-feriado">Aprobar el enfoque</button><button type="button" class="boton" data-accion="cambiar-feriado">Pedir cambios</button></div>';
}

// ------------------------------------------------- el mes armado ("Un día como hoy")

/** Los días armados (web/data/efemerides-piezas.json) desde hoy, por semana, con su estado: lo que realmente va a salir a las 9:00. */
function listaDePiezas() {
  const piezas = E.fechas.piezas?.dias ?? {};
  const el = E.fechas.elegidas;
  const hoy = hoyEnBalcarce();
  const dias = Object.keys(piezas).filter((d) => d >= hoy).sort();
  if (!dias.length) return '<p class="vacio">No hay días armados desde hoy. Se arman de a una o dos semanas.</p>';
  const estados = Object.fromEntries(dias.map((d) => [d, estadoDeDiaArmado(piezas[d], el.piezas?.[d])]));
  const salen = dias.filter((d) => estados[d].sale).length;
  const esperan = dias.filter((d) => estados[d].clase === 'espera').length;
  // Los huecos: días sin entrada entre hoy y el último armado (ese día no sale nada).
  const huecos = [];
  for (let d = hoy; d <= dias[dias.length - 1]; d = new Date(Date.parse(`${d}T12:00:00Z`) + 864e5).toISOString().slice(0, 10)) if (!piezas[d]) huecos.push(d);
  const bloques = semanas(dias).map((s) => `<h2>Semana del ${esc(etiquetaCorta(s.lunes))}</h2>${s.dias.map((d) => {
    const e = estados[d];
    const p = piezas[d];
    return `<button type="button" class="tarjeta" data-accion="abrir-pieza" data-dia="${esc(d)}"><div><strong>${esc(etiquetaCorta(d))}</strong> <span class="est ${e.clase}">${esc(e.texto)}</span></div>
      <div class="titulo">${esc(p.principal?.titulo ?? '')}</div>
      <div class="meta">${esc((p.ademas ?? []).length)} más: ${esc((p.ademas ?? []).map((x) => x.anio ?? '').filter(Boolean).join(', '))}${decisionVencida(p, el.piezas?.[d]) ? ' · se rearmó después de tu decisión' : ''}</div></button>`;
  }).join('')}`).join('');
  const feriadosDelAnio = (E.fechas.feriados?.feriados ?? []).map((f) => f.fecha);
  const meses = mesesDe([...dias, ...feriadosDelAnio.filter((f) => f >= hoy)]);
  if (!meses.includes(E.mesFechas)) E.mesFechas = meses[0];
  const celdas = celdasDelMes(E.mesFechas, estados, feriadosDelAnio, { desde: hoy, hasta: dias[dias.length - 1] });
  const r = resumenDelMes(celdas);
  const calendario = `<div class="sub">${meses.map((m) => `<button type="button" data-accion="mes-fechas" data-mes="${esc(m)}" aria-current="${m === E.mesFechas}">${esc(nombreDelMes(m).split(' ')[0])}</button>`).join('')}</div>
    <p class="estado"><strong>${esc(nombreDelMes(E.mesFechas))}:</strong> ${r.salen} salen como están${r.esperan ? ` · <strong>${r.esperan} para mirar</strong>` : ''}${r.noSalen ? ` · ${r.noSalen} sacados` : ''}${r.sinArmar ? ` · ${r.sinArmar} sin armar` : ''}.</p>
    <div class="ley"><span><b class="pt ok"></b>sale</span><span><b class="pt espera"></b>para mirar</span><span><b class="pt mal"></b>no sale</span><span><b class="pt sin"></b>sin armar</span><span><b class="raya"></b>feriado</span></div>
    <div class="cal">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => `<span class="h">${x}</span>`).join('')}${celdas.map((c) => c.vacio ? '<span class="d vac"></span>' : (c.armado ? `<button type="button" class="d ${c.clase}${c.feriado ? ' fer' : ''}" data-accion="abrir-pieza" data-dia="${esc(c.iso)}" aria-label="${esc(etiquetaLarga(c.iso))}">${c.dia}<i></i></button>` : `<span class="d ${c.clase}${c.feriado ? ' fer' : ''}" aria-label="${esc(etiquetaLarga(c.iso))}">${c.dia}${c.clase ? '<i></i>' : ''}</span>`)).join('')}</div>`;
  return `${calendario}<p class="estado"><strong>${salen}</strong> de ${dias.length} días salen como están${esperan ? `; <strong>${esperan}</strong> esperan tu visto bueno` : ''}. Tocá un día para ver todo lo que cuenta la pieza y aprobarlo, sacarlo o pedir cambios.</p>
    ${huecos.length ? `<div class="problemas"><strong>Sin armar (ese día no sale nada):</strong> ${huecos.map((d) => esc(etiquetaCorta(d))).join(', ')}.</div>` : ''}
    ${bloques}`;
}

/** Un día armado, entero: lo que cuenta la locutora, los datos y las decisiones. */
function vistaPieza() {
  const dia = E.pieza;
  const d = E.fechas.piezas?.dias?.[dia];
  if (!d) { E.pieza = null; vistaFechas(); return; }
  const decision = E.fechas.elegidas.piezas?.[dia];
  const e = estadoDeDiaArmado(d, decision);
  const yaPaso = dia < hoyEnBalcarce();
  const verificar = (d.principal?.verificar ?? []).filter(Boolean);
  const ademas = (d.ademas ?? []).map((x) => `<li>${x.anio ? `<strong>${esc(x.anio)}</strong> · ` : ''}${esc(x.texto)}</li>`).join('');
  app.innerHTML = `<button type="button" class="boton" data-accion="volver-fechas">← El mes</button>
    <h1>${esc(etiquetaLarga(dia))}</h1>
    <p class="est ${e.clase}">${esc(e.texto)}</p>
    ${decision && !decisionVencida(d, decision) ? `<p class="estado">${esc(decision.por ?? '')} · ${esc(decision.estado === 'aprobada' ? 'lo aprobó' : decision.estado === 'sacada' ? 'lo sacó' : 'pidió cambios')}${decision.comentario ? `: ${esc(decision.comentario)}` : ''}</p>` : ''}
    ${decisionVencida(d, decision) ? '<p class="problemas">Este día se rearmó después de tu decisión: la anterior ya no vale. Mirá lo nuevo y decidí de nuevo.</p>' : ''}
    <div class="caja"><h3>La principal</h3>
      <p><strong>${d.principal.anio ? `${esc(d.principal.anio)} · ` : ''}${esc(d.principal.titulo)}</strong></p>
      <p>${esc(d.principal.cuerpo ?? '')}</p>
      ${verificar.length ? `<p class="meta">Datos que cuenta:</p><ul class="lista-simple">${verificar.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>
    <h2>Y además, un día como hoy</h2>
    <ul class="lista-simple">${ademas}</ul>
    <h2>Lo que dice la locutora (a las 9:00)</h2>
    <div class="texto-nota"><p class="cuerpo">${esc(d.guion)}</p></div>
    ${d.revision ? `<p class="ayuda">${esc(d.revision)}</p>` : ''}
    ${yaPaso ? '<p class="estado">Este día ya pasó.</p>' : `<div class="botones">
      <button type="button" class="boton principal" data-accion="aprobar-pieza">Aprobar el día</button>
      <button type="button" class="boton" data-accion="cambiar-pieza">Pedir cambios</button>
      <button type="button" class="boton peligro" data-accion="sacar-pieza">Sacar el día</button>
      <button type="button" class="boton" data-accion="armar-con-candidatas" data-dia="${esc(dia)}">Elegir otras candidatas</button></div>
      <p class="ayuda">"Aprobar" lo deja salir ese día a las 9:00. "Pedir cambios" y "Elegir otras candidatas" lo frenan hasta que se rearme (se lo contás a Claude y te lo deja listo). "Sacar" lo descarta: ese día no sale nada.</p>`}`;
  window.scrollTo(0, 0);
}

/** Aprobar, sacar o pedir cambios de un día armado: queda en efemerides-elegidas.json (piezas) y el 9:00 lo respeta (redes/efemeride.mjs). */
async function decidirPieza(accion) {
  const dia = E.pieza;
  const d = E.fechas.piezas?.dias?.[dia];
  if (!d) return;
  const estado = { 'aprobar-pieza': 'aprobada', 'sacar-pieza': 'sacada', 'cambiar-pieza': 'cambiar' }[accion];
  let comentario = '';
  if (accion === 'aprobar-pieza') {
    if (!(await preguntar({ titulo: '¿Aprobar el día?', texto: 'Sale ese día a las 9:00 con la locutora, tal cual está.', si: 'Sí, aprobarlo' })).ok) return;
  } else {
    const r = await preguntar(accion === 'sacar-pieza'
      ? { titulo: '¿Sacar el día?', texto: 'Ese día no sale nada. Queda anotado el motivo.', si: 'Sí, sacarlo', conMotivo: '¿Por qué?' }
      : { titulo: 'Pedir cambios', texto: 'Contame qué cambiarías. El día no sale hasta que se rearme.', si: 'Guardar', conMotivo: '¿Qué cambiarías?' });
    if (!r.ok) return;
    comentario = r.texto;
  }
  guardarFechas((j) => conDecisionDePieza(j, dia, { estado, comentario, huella: huellaDelDia(d), por: E.nombre }), `decide el día ${dia} de Un día como hoy`, () => {
    E.pieza = null; vistaFechas();
    aviso({ aprobada: 'Aprobado: sale ese día a las 9:00.', sacada: 'Sacado: ese día no sale nada.', cambiar: 'Anotado: ese día no sale hasta que lo rearmemos.' }[estado]);
  });
}

async function guardarFechas(cambiarJson, mensaje, listo) {
  try {
    app.innerHTML = '<div class="girando"></div><p class="vacio">Guardando en GitHub…</p>';
    E.fechas.elegidas = { dias: {}, feriados: {}, ...(await E.cliente.guardar(ARCHIVOS.elegidas, cambiarJson, 'Panel del celular: ' + E.nombre + ' ' + mensaje)) };
    listo();
  } catch (e) {
    aviso(explicarError(e), { ms: 9000 });
    vistaFechas();
  }
}

/**
 * Lo que no se usa todos los días y salió de la barra de abajo (2/10: la barra tenía 9 pestañas y se partía en dos filas):
 * [id, nombre, ícono, para qué sirve]. Cada una se abre desde "Más" y trae su botón para volver.
 */
const MENU_MAS = [
  ['borradores', 'Borradores', '✎', 'Todo lo que se le pidió a la IA: lo que está para leer y lo que ya se resolvió.'],
  ['fotos', 'Fotos', '📷', 'Las notas de la portada sin foto, por qué no la tienen y dónde buscarle una.'],
  ['contactos', 'Contactos', '👥', 'Instituciones y personas a quienes pedirles fechas y eventos: escribirles y llevar quién respondió.'],
  ['pistas', 'Pistas', '✎', 'Pegá un dato o un tuit y mirá si lo cubrieron los medios.'],
  ['revision', 'Revisión', '✓', 'Lo que la IA marcó en las notas ya publicadas (ortografía, texto roto, temas sensibles).'],
  ['fechas', 'Fechas', '▦', 'Un día como hoy: el mes armado para aprobar, rearmar o sacar; y los feriados.'],
  ['numeros', 'Números', '▮', 'Visitas, producción y crecimiento de las redes.'],
];
const EN_MAS = new Set(MENU_MAS.map(([id]) => id));

function vistaMas() {
  const a = leerAjustes();
  const reglas = reglasFb();
  const rev = E.revision ? contarRevision(E.revision.items) : null;
  const nPistas = pistasConNovedad();
  const nSinFoto = E.banco ? resumenDeFotos().items.length : 0;
  const nBorradores = E.borradoresLista ? clasificarBorradores(E.borradoresLista.items).paraLeer.length : 0;
  const avisoDe = { borradores: nBorradores ? `${nBorradores} para leer` : '', fotos: E.banco ? (nSinFoto ? `${nSinFoto} sin foto` : '✓ todas con foto') : '', pistas: nPistas ? `● ${nPistas} con novedad` : '', revision: rev ? (rev.graves ? `⚠ ${rev.graves} grave${rev.graves === 1 ? '' : 's'}` : (rev.total ? `${rev.total} para mirar` : '✓ sin avisos')) : '' };
  app.innerHTML = `
    <h1>Más</h1>
    ${MENU_MAS.map(([id, nombre, icono, que]) => `<button type="button" class="tarjeta" data-pestana="${id}"><div class="menu-item"><span class="menu-icono">${icono}</span><div><div class="titulo">${esc(nombre)}${avisoDe[id] ? ` <span class="marca${(rev?.graves && id === 'revision') || (id === 'pistas' && nPistas) ? ' mal' : ''}">${esc(avisoDe[id])}</span>` : ''}</div><div class="meta">${esc(que)}</div></div><span class="flecha">›</span></div></button>`).join('')}
    ${htmlDeLaPausaEnMas(E.nube, { esc, haceCuanto })}
    <div class="botones">
      <button type="button" class="boton ancho" data-accion="actualizar-web">Actualizar la web ahora</button>
      <a class="boton ancho enlace-boton" href="https://radarbalcarce.com" target="_blank" rel="noopener">Abrir la web</a>
      <button type="button" class="boton ancho" data-accion="actualizar-panel">Actualizar el panel (si algo se ve viejo)</button>
    </div>
    <p class="estado">Entraste como <strong>${esc(a?.nombre ?? E.nombre)}</strong>. Cada decisión queda en GitHub con tu nombre.</p>
    <h2>Cómo funciona</h2>
    <details><summary>¿Cuándo se ve en la web lo que hago acá?</summary>
      <p>Todo lo que hacés acá (aprobar, corregir, retirar, deshacer, sumar una foto) se guarda al instante en GitHub y sale en la web en la próxima actualización, que es cada media hora. Si no querés esperar, tocá "Actualizar la web ahora": tarda unos 8 minutos.</p></details>
    <details><summary>Esperan: publicar o descartar</summary>
      <p>Arriba, las notas que el sistema no publica solo. Cada una dice por qué espera y qué hay que mirar, y qué contó cada medio (con el enlace a la nota original). La IA no las escribe sola: si querés publicar una, tocás "Publicar" (la IA la escribe en un minuto, la verifica y sale) o "Escribirla con IA para revisarla" (te muestra el texto para corregir antes de publicar), o la escribís a mano. Mientras la IA escribe podés seguir con otra nota: la lista marca "la IA la está escribiendo" y "borrador listo". "Descartar" la saca de la lista; queda en "Descartadas", al final, por si te equivocaste.</p>
      <p>Abajo, las notas que salen solas pero todavía no tienen un cuerpo que pase el verificador. La IA las vuelve a intentar sola, hasta ${esc(E.intentosMaximos)} veces, en las próximas actualizaciones; si lo logra, se publican sin que hagas nada. Cada una dice cuántas veces lo intentó y, si falló, por qué. Si una es importante y querés que salga ya, escribila con la IA o a mano.</p></details>
    <details><summary>Publicadas: corregir, cambiar de sección, reescribir</summary>
      <p>Muestra las últimas 24 horas (y las retiradas de las últimas 24 horas). "Ver también las anteriores" suma el resto de la portada (36 horas) y, con "Cargar el archivo", las más viejas (hasta 180 días); el buscador mira todo lo cargado. "Editar" cambia el título, la bajada, el cuerpo o la sección. "Reescribir con IA" le pide una versión nueva (podés decirle qué cambiar) y te la muestra antes de guardar. La dirección de la nota no cambia nunca.</p></details>
    <details><summary>Fotos: dejar todas las notas con foto</summary>
      <p>Lista las notas de la portada sin foto y por qué. Las que se pueden arreglar traen enlaces para buscarle una (Google Imágenes, Wikimedia Commons, las páginas de sus fuentes). Cuando la encontrás, copiás la dirección de la imagen, la pegás con su crédito y la nube la baja, la achica y la guarda. Las reglas firmes (menores, marcas de agua de otro medio, Policiales sin fuente oficial) no se saltean: por eso pide que confirmes que la foto no tiene marca de otro medio ni menores reconocibles.</p></details>
    <details><summary>Mandar una nota a Facebook e Instagram</summary>
      <p>Solas, a Facebook van sólo notas de Balcarce con relevancia alta. Con "Mandar también a las redes" una persona puede mandar cualquier nota publicada, también de Política o Policiales. Antes te pregunta. Sale en la próxima vuelta de las redes: ${esc(comoSalenLosPosteos(reglas))}. Mientras no salga, se puede sacar de la cola; una vez publicada, sólo se borra a mano en Facebook e Instagram.</p></details>
    <details><summary>Retirar y volver a publicar</summary>
      <p>"Retirar de la web" la saca de la portada y su página deja de existir en la próxima actualización. No se borra: queda en "Retiradas" (al final de Publicadas) 24 horas, y "Volver a publicar" la trae de nuevo con la misma dirección. Si ya había salido en Facebook o Instagram, allá hay que borrarla a mano.</p></details>
    <details><summary>La pestaña Redes</summary>
      <p>El cronograma de hoy (qué pieza sale a qué hora, con qué voz, y si ya salió), qué notas contaría cada repaso si saliera ahora y los posteos de Facebook. Lo que contaría un repaso puede cambiar hasta su hora: si entra una nota nueva o si retirás una.</p></details>
    <details><summary>Instalar el panel como app</summary>
      <p>En Chrome del celular: menú ⋮ → <strong>Instalar app</strong> (o "Agregar a pantalla principal"). Queda con su ícono y se actualiza sola.</p></details>
    <details><summary>Seguridad</summary>
      <p>Lo que espera a una persona y las retiradas llegan cifradas: sólo los celulares registrados las pueden leer. La llave de GitHub queda sólo en este celular; si lo perdés, borrala en GitHub (Settings → Developer settings → Fine-grained tokens).</p></details>
    <details><summary>Pausa general: frenar todo en una emergencia</summary>
      <p>Si algo sale mal (se publica algo que no debía, una fuente manda cualquier cosa, una IA se vuelve loca), "Pausa general" frena todo de un toque: la web ya publicada sigue andando pero no entra ninguna nota nueva, las redes no publican y la IA no escribe, no audita ni ilustra. El vigilante y los informes diarios no se frenan: avisan "en pausa desde tal hora por tal persona". "Reanudar todo" lo deshace también de un toque, y la web vuelve a armarse en la próxima vuelta. Pedir una vuelta a mano ("Actualizar la web ahora") no anda mientras esté en pausa.</p></details>
    <div class="botones"><button type="button" class="boton peligro ancho" data-accion="salir">Salir y borrar la llave de este celular</button></div>`;
  // Regla 317: si lo de la nube es viejo (más de un minuto), se vuelve a pedir y Más se dibuja de nuevo.
  if (Date.now() - E.nubeCargadaEn > 60000) refrescarNube();
}

// ------------------------------------------------------------------ una nota

function buscar(tipo, id) {
  if (tipo === 'pendiente') return [...(E.pendientes ?? E.publicos), ...E.descartadas].find((n) => n.id === id);
  if (tipo === 'sin-cuerpo') return E.esperando.find((n) => n.id === id);
  if (tipo === 'retirada') return E.papelera.find((n) => n.id === id);
  return (E.portada?.notas ?? []).find((n) => n.id === id) ?? (E.archivo ?? []).find((n) => n.id === id);
}

function fuentesConResumen(n) {
  const f = n.fuentes ?? n.fuentesConsultadas ?? [];
  if (!f.length) return '';
  return `<h2>Lo que contó cada medio (${f.length})</h2>${f.map((x) => `<div class="caja">
    <p><strong>${esc(x.medio ?? 'Un medio')}</strong>${x.oficial ? ' · fuente oficial' : ''}${x.fecha ? ` <span class="meta">· ${esc(haceCuanto(x.fecha))}</span>` : ''}</p>
    ${x.resumen ? `<p>${esc(x.resumen)}</p>` : ''}
    ${x.enlace ? `<p><a href="${esc(x.enlace)}" target="_blank" rel="noopener noreferrer">Leer la nota original ↗</a></p>` : ''}</div>`).join('')}`;
}

function textoDeLaNota({ titulo, copete, cuerpo }) {
  return `<div class="texto-nota">${titulo ? `<p class="titulo-borrador">${esc(titulo)}</p>` : ''}<p class="bajada">${esc(copete ?? '')}</p><p class="cuerpo">${esc(cuerpo || '(sin cuerpo)')}</p></div>`;
}

/** Lo que marcó el verificador. El aviso del semáforo va sólo si es otro que el motivo por el que ya espera. */
function listaDeProblemas(b, motivo = null) {
  const semaforo = b?.aviso && !(motivo && String(b.aviso).startsWith(String(motivo))) ? [`el semáforo: ${b.aviso}`] : [];
  const problemas = [...(b?.problemas ?? []), ...semaforo];
  if (!problemas.length) return '<p class="estado">✓ El verificador no encontró nada que no esté en las fuentes.</p>';
  return `<div class="problemas"><strong>Revisá esto antes de publicar</strong> (el verificador lo marcó contra las fuentes):<ul>${problemas.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
}

/** La caja "Foto" de una nota que espera: si va a tener foto cuando se publique y, si no, por qué y cómo arreglarlo. */
function cajaDeFoto(n) {
  const f = fotoDeLaNota(n);
  const puede = f.clase !== 'ok' && !MOTIVOS_DE_FOTO[motivoDeFoto(n, E.banco?.[n.id])]?.firme;
  return `<div class="caja"><strong>Foto:</strong> <span class="est ${f.clase}">${esc(f.largo)}</span>${puede ? `<button type="button" class="boton ancho" data-accion="buscar-foto" data-id="${esc(n.id)}">Buscarle una foto</button>` : ''}</div>`;
}

/** Lo que más se hace con una nota, siempre a la vista abajo (2/10: sin tener que bajar hasta el final para decidir). */
function barraDeAcciones(tipo, id, d) {
  const datos = `data-tipo="${esc(tipo)}" data-id="${esc(id)}"`;
  let botones = '';
  if (tipo === 'pendiente' && !d) botones = `<button type="button" class="boton peligro" data-accion="descartar" ${datos}>Descartar</button><button type="button" class="boton principal" data-accion="publicar-ia" ${datos}>Publicar</button>`;
  else if (tipo === 'sin-cuerpo' && !E.correcciones.notas?.[id]?.cuerpo) botones = `<button type="button" class="boton" data-accion="escribir" ${datos}>Escribir con IA</button><button type="button" class="boton principal" data-accion="publicar-ia" ${datos}>Publicar</button>`;
  else if (tipo === 'publicada' && d?.estado !== 'bloqueada') botones = `<button type="button" class="boton peligro" data-accion="retirar" ${datos}>Retirar</button><button type="button" class="boton principal" data-accion="a-mano" data-tipo="publicada" data-id="${esc(id)}">Editar</button>`;
  return botones ? `<div class="espacio-barra"></div><div class="barra-acciones">${botones}</div>` : '';
}

/** "Su recorrido": de dónde entró la nota, por qué esperó, quién la escribió y la aprobó, adónde salió (recorrido.js). */
function recorridoDeLaNota(tipo, id, n, d) {
  const g = E.borradoresIA?.[id];
  const medios = (n.fuentes ?? n.fuentesConsultadas ?? []).map((f) => f?.medio).filter(Boolean);
  const todos = medios.length ? medios : (n.medios ?? []);
  const pasos = pasosDeLaNota({
    nota: n,
    medios: [...new Set(todos)],
    motivoExplicado: tipo === 'pendiente' && n.motivo ? explicarMotivo(n.motivo) : '',
    decision: d ? { estado: d.estado, por: d.por, cuando: d.cuando, cambioElTitulo: !!d.titulo && d.titulo !== n.titulo } : null,
    borrador: g?.b ? { cuando: g.cuando, pedido: g.b.pedido, marcas: (g.b.problemas ?? []).length } : null,
    escritaPorIA: tipo === 'publicada' && !!n.guion && !n.cuerpoAMano,
    salioEnLaWeb: tipo === 'publicada',
    salioSola: n.como === 'automatica',
    facebook: enFacebook(id), instagram: enInstagram(id), marcadaParaRedes: marcadaParaRedes(id),
  }, { horaEnBalcarce });
  return htmlDelRecorrido(pasos, { esc });
}

function vistaNota(tipo, id) {
  E.notaActual = id;
  const n = buscar(tipo, id);
  if (!n) { aviso('Esa nota ya no está en la lista.'); vistaLista(); return; }
  $('#pestanas').hidden = true;
  const d = decididaEnElCelular(id);
  const c = E.correcciones.notas?.[id];
  let cuerpo = '';
  let acciones = '';
  let extra = '';
  if (tipo === 'pendiente') {
    const conDetalle = !!(n.resumen || n.fuentes?.length);
    cuerpo = `
      <div class="caja aviso-motivo"><strong>Por qué no salió:</strong> ${esc(explicarMotivo(n.motivo))}</div>
      ${cajaDeFoto(n)}
      ${n.ficha ? `<div class="caja"><strong>Lo que anotó la IA al leerla:</strong> ${esc(explicarFicha(n.ficha))}</div>` : ''}
      ${!conDetalle ? '<p class="problemas">El detalle de esta nota llega cifrado en la próxima actualización de la web. Igual se le puede pedir a la IA que la escriba.</p>' : ''}
      ${n.resumen ? `<h2>Lo que dice la fuente principal</h2><div class="texto-nota"><p>${esc(n.resumen)}</p></div>` : ''}
      ${fuentesConResumen(n)}`;
    if (d) {
      acciones = d.estado === 'publicada'
        ? `<p class="estado">La aprobaste ${esc(haceCuanto(d.cuando))}: sale en la próxima actualización.</p><button type="button" class="boton" data-accion="deshacer" data-id="${esc(id)}">Deshacer (vuelve a esperar)</button>`
        : `<p class="estado">La descartaste ${esc(haceCuanto(d.cuando))}${d.por ? ` (${esc(d.por)})` : ''}.</p><button type="button" class="boton principal" data-accion="deshacer" data-id="${esc(id)}">Volver a traerla</button>`;
    } else {
      extra = cajaDeBorrador('pendiente', id);
      acciones = `<button type="button" class="boton principal ancho" data-accion="publicar-ia" data-tipo="pendiente" data-id="${esc(id)}">Publicar</button>
        <button type="button" class="boton" data-accion="escribir" data-tipo="pendiente" data-id="${esc(id)}">Escribirla con IA para revisarla</button>
        <button type="button" class="boton" data-accion="a-mano" data-tipo="pendiente" data-id="${esc(id)}">Escribirla a mano</button>
        <button type="button" class="boton peligro" data-accion="descartar" data-id="${esc(id)}">Descartar</button>`;
    }
  } else if (tipo === 'sin-cuerpo') {
    const e = estadoSinCuerpo({ intentos: n.intentos ?? 0, maximo: n.maximo ?? E.intentosMaximos, conCuerpo: !!c?.cuerpo });
    const porQue = !c?.cuerpo ? explicarMotivoSinCuerpo(n.motivo) : '';
    extra = c?.cuerpo ? '' : cajaDeBorrador('sin-cuerpo', id);
    cuerpo = `<div class="caja aviso-motivo"><strong>Por qué no salió:</strong> la nota está bien para salir, pero la IA todavía no logró escribir un cuerpo que pase el verificador contra las fuentes. <span class="est ${e.clase}">${esc(e.texto)}</span></div>
      ${n.fuentes?.length > 1 ? `<p class="estado">La cuentan ${esc(n.fuentes.length)} medios.</p>` : ''}${porQue ? `<p class="problemas">${esc(porQue)}</p>` : ''}
      ${c?.cuerpo ? '' : cajaDeFoto(n)}
      <h2>Lo que dice la fuente</h2><div class="texto-nota"><p>${esc(n.copete ?? '')}</p></div>
      ${c?.cuerpo ? `<h2>El cuerpo que se escribió</h2>${textoDeLaNota({ copete: c.copete ?? n.copete, cuerpo: c.cuerpo })}` : ''}
      ${fuentesConResumen(n)}`;
    acciones = `${c?.cuerpo ? '' : `<button type="button" class="boton principal ancho" data-accion="publicar-ia" data-tipo="sin-cuerpo" data-id="${esc(id)}">Publicar</button>`}
      <button type="button" class="boton${c?.cuerpo ? ' principal' : ''}" data-accion="escribir" data-tipo="sin-cuerpo" data-id="${esc(id)}">Escribir con IA para revisarla</button>
      <button type="button" class="boton" data-accion="a-mano" data-tipo="sin-cuerpo" data-id="${esc(id)}">${c?.cuerpo ? 'Corregir el cuerpo' : 'Escribir a mano'}</button>`;
  } else if (tipo === 'retirada') {
    cuerpo = `<div class="caja">La retiró ${esc(n.por ?? 'una persona')} ${esc(haceCuanto(n.retirada))}${n.motivo ? `. Motivo: ${esc(n.motivo)}` : ''}. Ya no tiene página en la web.</div>
      ${textoDeLaNota({ copete: n.copete, cuerpo: n.cuerpo })}`;
    acciones = vueltaAPublicar(n)
      ? `<p class="estado">La volviste a publicar ${esc(haceCuanto(d.cuando))}: vuelve en la próxima actualización.</p><button type="button" class="boton" data-accion="retirar-de-nuevo" data-id="${esc(id)}">Deshacer (que siga retirada)</button>`
      : `<button type="button" class="boton principal" data-accion="volver-a-publicar" data-id="${esc(id)}">Volver a publicar</button>
         <button type="button" class="boton" data-accion="a-mano" data-tipo="retirada" data-id="${esc(id)}">Corregirla y volver a publicarla</button>`;
  } else {
    const fb = enFacebook(id);
    const ig = enInstagram(id);
    cuerpo = `${textoDeLaNota({ copete: c?.copete ?? n.copete, cuerpo: c?.cuerpo ?? n.cuerpo })}
      <p><a href="${esc(enlaceDeNota(n))}" target="_blank" rel="noopener">Ver en la web ↗</a></p>
      <p class="estado">${fb ? `✓ Salió en Facebook a las ${esc(horaEnBalcarce(fb.cuando))}${ig ? ' y en Instagram' : ''}.` : (marcadaParaRedes(id) ? '→ Está en la cola de las redes: sale en la próxima vuelta que corresponda (mirá la pestaña Redes).' : 'No salió en las redes.')}</p>
      ${fuentesConResumen(n)}`;
    acciones = d?.estado === 'bloqueada'
      ? `<p class="estado">La retiraste ${esc(haceCuanto(d.cuando))}: sale de la web en la próxima actualización.</p><button type="button" class="boton" data-accion="deshacer-retiro" data-id="${esc(id)}">Deshacer</button>`
      : `<button type="button" class="boton principal" data-accion="a-mano" data-tipo="publicada" data-id="${esc(id)}">Editar</button>
         <button type="button" class="boton" data-accion="pedir-reescribir" data-id="${esc(id)}">Reescribir con IA</button>
         ${fb ? '' : `<button type="button" class="boton" data-accion="redes" data-id="${esc(id)}">${marcadaParaRedes(id) ? 'Sacar de la cola de las redes' : 'Mandar también a las redes'}</button>`}
         <button type="button" class="boton peligro" data-accion="retirar" data-id="${esc(id)}">Retirar de la web</button>`;
  }
  const tr = E.trabajos[id];
  if (tr?.clase === 'ia') extra = `<div class="caja">${{ escribiendo: '✎ La IA la está escribiendo: tarda un minuto. Podés volver a la lista y seguir con otra: te aviso.', publicando: '✎ Se está publicando.', listo: '✎ La IA ya escribió un borrador: abajo está el botón para verlo.', fallo: `⚠ La IA no pudo escribirla: ${esc(tr.motivo ?? '')}` }[tr.estado] ?? ''}</div>${extra}`;
  app.innerHTML = `
    <button type="button" class="boton" data-accion="volver">← Volver</button>
    <p>${chip(c?.seccion ?? n.seccion)}<span class="meta">${esc(haceCuanto(n.fecha))}</span></p>
    <h1>${esc(c?.titulo ?? n.titulo ?? 'Nota sensible')}</h1>
    ${cuerpo}
    ${recorridoDeLaNota(tipo, id, n, d)}
    ${extra}
    <div class="botones">${acciones}</div>${barraDeAcciones(tipo, id, d)}`;
  window.scrollTo(0, 0);
}

// ------------------------------------------------------ el borrador de la IA

/**
 * El borrador que escribió la IA y todavía no se publicó: no se pierde si se vuelve
 * atrás. Mientras la app esté abierta se guarda acá; si ya se cerró, se puede buscar
 * el último que quedó (cifrado, sólo para este celular) en GitHub.
 */
function cajaDeBorrador(tipo, id) {
  const g = E.borradoresIA?.[id];
  const datos = `data-tipo="${esc(tipo)}" data-id="${esc(id)}"`;
  return `<div class="caja">${g
    ? `<p>Hay un borrador que escribió la IA ${esc(haceCuanto(new Date(g.cuando).toISOString()))}. No se perdió.</p><button type="button" class="boton ancho" data-accion="ver-borrador" ${datos}>Ver el borrador</button>`
    : `<button type="button" class="boton ancho" data-accion="borrador-guardado" ${datos}>¿Ya la había escrito la IA? Buscar su último borrador</button>`}</div>`;
}

/**
 * Le pide a la IA que escriba una nota, SIN trabar el panel (2/10, Hernán: "ver las notas, volver, salir, ver si se escriben…"):
 * vuelve a la lista, la nota queda marcada "la IA la está escribiendo", y cuando termina avisa y la marca pasa a "borrador listo".
 * Si se pidió "Publicar" y el verificador no marcó nada, sale sola (en la próxima actualización).
 */
function pedirALaIA(tipo, id, pedido, { publicar = false } = {}) {
  if (E.trabajos[id]?.clase === 'ia' && E.trabajos[id].estado === 'escribiendo') { aviso('La IA ya la está escribiendo.'); return; }
  const titulo = buscar(tipo, id)?.titulo ?? '';
  E.trabajos[id] = { clase: 'ia', estado: 'escribiendo', tipo, titulo, desde: Date.now() };
  E.restaurar = E.scrollLista ?? null;
  vistaLista();
  aviso(`La IA está escribiendo “${titulo}”. Tarda un minuto: podés seguir con otra nota, te aviso cuando esté.`, { ms: 9000 });
  trabajoDeIA(tipo, id, pedido, { publicar, titulo });
}

async function trabajoDeIA(tipo, id, pedido, { publicar, titulo }) {
  const marca = marcaNueva();
  const desde = Date.now();
  try {
    await E.cliente.disparar('panel.yml', { accion: 'escribir', id, pedido: pedido ?? '', marca });
    await esperarCorrida('panel.yml', marca, { mensajeSiFalla: 'La corrida de GitHub falló. Mirá "Panel del celular" en GitHub → Actions.' });
    const { json } = await E.cliente.leer(ARCHIVOS.borradores);
    const sobre = json.borradores?.[id];
    const borrador = sobre && Date.parse(sobre.cuando) >= desde - 120000 ? await abrir(sobre, E.llaves) : null;
    if (!borrador) throw new Error('No pude abrir el borrador en este celular. Si recién lo registraste, probá de nuevo.');
    (E.borradoresIA ??= {})[id] = { b: borrador, cuando: Date.now() };
    // "Publicar" = que la escriba y salga. Sólo si el verificador no marcó nada; si marcó algo, se la muestra a quien decide.
    // Un tema delicado ("necesita ojo humano": un detenido, un chico, una muerte) no sale sin que alguien lea el texto (C-19, 8/10/2026).
    const delicada = /necesita ojo humano/i.test(buscar(tipo, id)?.motivo ?? '');
    if (publicar && !delicada && borrador.ok && borrador.texto && !(borrador.problemas ?? []).length) {
      const t = borrador.texto;
      const seccion = borrador.seccion ?? buscar(tipo, id)?.seccion ?? '';
      E.trabajos[id] = { clase: 'ia', estado: 'publicando', tipo, titulo };
      await guardarTexto(tipo, id, { titulo: t.titulo, copete: t.copete, cuerpo: t.cuerpo, seccion }, {
        deIA: true, extras: t, redes: null, seccionAntes: seccion, cuerpoAntes: '', silencioso: true,
      });
      delete E.trabajos[id];
      if (enUnaLista()) vistaLista();
      return;
    }
    E.trabajos[id] = { clase: 'ia', estado: 'listo', tipo, titulo };
    aviso(publicar ? `La IA escribió “${titulo}”, pero ${delicada ? 'es un tema delicado' : 'el verificador marcó algo'}: leela antes de publicar.` : `Lista la nota “${titulo}”: tocá para revisarla.`, { ver: { tipo, id }, ms: 20000 });
  } catch (e) {
    E.trabajos[id] = { clase: 'ia', estado: 'fallo', tipo, titulo, motivo: explicarError(e) };
    aviso(`No se pudo escribir “${titulo}”: ${explicarError(e)}`, { ms: 12000 });
  }
  if (enUnaLista()) vistaLista();
}

/** ¿Se está viendo una lista (y no una nota o un borrador)? La barra de pestañas sólo está a la vista en las listas. */
const enUnaLista = () => !$('#pestanas').hidden;

/** Editar un texto (el de la IA, o el que ya tiene la nota) y decidir. */
function vistaBorrador(tipo, id, b = null) {
  const n = buscar(tipo, id) ?? {};
  const c = E.correcciones.notas?.[id] ?? {};
  const t = b?.texto ?? { titulo: c.titulo ?? n.titulo ?? '', copete: c.copete ?? n.copete ?? '', cuerpo: c.cuerpo ?? n.cuerpo ?? '' };
  const seccion = c.seccion ?? n.seccion ?? b?.seccion ?? '';
  const deIA = !!b?.texto;
  const boton = { pendiente: 'Publicar', 'sin-cuerpo': 'Publicar con este cuerpo', retirada: 'Volver a publicar', 'nota-pista': 'Publicar como nota propia' }[tipo] ?? 'Guardar';
  const explicacion = {
    'nota-pista': 'La IA la escribió con el texto de las notas de los medios que ves abajo. Si la publicás sale como nota propia de Radar Balcarce, con esas fuentes y la firma "escrita con IA y revisada por la redacción".',
    publicada: 'Los cambios se ven en la web en la próxima actualización. La dirección de la nota no cambia.',
    retirada: 'Vuelve a la web con este texto en la próxima actualización, con la misma dirección.',
  }[tipo] ?? 'Revisalo y corregí lo que haga falta: se publica recién cuando tocás el botón de abajo.';
  app.innerHTML = `
    <button type="button" class="boton" data-accion="volver-nota" data-tipo="${esc(tipo)}" data-id="${esc(id)}">← Volver</button>
    <h1>${deIA ? 'Lo que escribió la IA' : 'Editar la nota'}</h1>
    <p class="estado">${esc(explicacion)}</p>
    ${b && !b.ok && !b.texto ? `<p class="problemas">${esc(b.motivo ?? 'La IA no pudo escribirla.')}</p>` : ''}
    ${deIA ? listaDeProblemas(b, n.motivo) : ''}
    ${b?.sacadas ? `<p class="estado">El verificador sacó ${esc(b.sacadas)} oración(es) con datos que no estaban en las fuentes.</p>` : ''}
    ${tipo === 'nota-pista' ? fuentesDelBorrador(b) : ''}
    <form id="form-texto">
      <label for="t-titulo">Título <span class="ayuda" id="c-titulo"></span></label>
      <input type="text" id="t-titulo" value="${esc(t.titulo)}" maxlength="120">
      <label for="t-copete">Bajada</label>
      <textarea id="t-copete">${esc(t.copete)}</textarea>
      <label for="t-cuerpo">Cuerpo <span class="ayuda" id="c-cuerpo"></span></label>
      <textarea id="t-cuerpo" class="cuerpo">${esc(t.cuerpo)}</textarea>
      <label for="t-seccion">Sección</label>
      <select id="t-seccion">${seccionesDelPanel(E.estadoCel).map((s) => `<option ${s === seccion ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      ${tipo === 'pendiente' || tipo === 'sin-cuerpo' ? `<label class="check"><input type="checkbox" id="t-redes" ${marcadaParaRedes(id) ? 'checked' : ''}> Mandarla también a Facebook e Instagram</label>
      <p class="ayuda">Si no la marcás, sale sólo en la web. Si la marcás, antes te pregunta.</p>` : ''}
      <div class="botones">
        <button type="submit" class="boton principal">${boton}</button>
        ${deIA && tipo !== 'nota-pista' ? `<button type="button" class="boton" data-accion="otra-version" data-tipo="${esc(tipo)}" data-id="${esc(id)}">Pedir otra versión</button>` : ''}
      </div>
    </form>`;
  const contar = () => {
    $('#c-titulo').textContent = `${$('#t-titulo').value.length} caracteres (hasta 90)`;
    const p = palabras($('#t-cuerpo').value);
    $('#c-cuerpo').textContent = `${p} palabras${p < 70 ? ' (con menos de 70 no sale sola)' : ''}`;
  };
  $('#t-titulo').addEventListener('input', contar);
  $('#t-cuerpo').addEventListener('input', contar);
  contar();
  $('#form-texto').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const campos = {
      titulo: $('#t-titulo').value.trim(), copete: $('#t-copete').value.trim(), cuerpo: $('#t-cuerpo').value.trim(), seccion: $('#t-seccion').value,
    };
    guardarTexto(tipo, id, campos, {
      deIA: deIA || (tipo === 'retirada' && !!n.deIA), extras: b?.texto ?? {}, redes: $('#t-redes')?.checked ?? null, seccionAntes: seccion, cuerpoAntes: String(t.cuerpo ?? '').trim(),
    });
  });
  window.scrollTo(0, 0);
}

/** La decisión de publicar una nota con este texto (aprobarla o volver a publicarla). */
const aprobada = ({ titulo, copete, cuerpo }, { deIA, por, motivo = null, extras = {} }) => ({
  estado: 'publicada', titulo, copete, cuerpo, deIA: !!deIA, por,
  ...(motivo ? { motivo } : {}),
  ...(deIA ? Object.fromEntries(Object.entries(extras).filter(([k, v]) => v != null && ['textoRedes', 'etiquetas', 'claves', 'seSabe', 'noConfirmado', 'fuentesConsultadas'].includes(k))) : {}),
});

async function guardarTexto(tipo, id, campos, {
  deIA, extras, redes, seccionAntes, cuerpoAntes, silencioso = false,
}) {
  if (!campos.titulo || !campos.copete) { aviso('Faltan el título o la bajada.'); return; }
  // Con menos de 70 palabras una nota automática no sale sola: se avisa si se
  // aprueba o se completa una, o si se tocó el cuerpo (no por cambiar la sección).
  if (tipo === 'nota-pista' && palabras(campos.cuerpo) < 70) { aviso('Hace falta un cuerpo de 70 palabras o más para que la nota salga.', { ms: 9000 }); return; }
  const corto = palabras(campos.cuerpo) < 70 && (tipo !== 'publicada' || campos.cuerpo !== cuerpoAntes);
  if (corto && !(await preguntar(PREGUNTAS.publicarCorto)).ok) return;
  if (redes && !marcadaParaRedes(id) && !(await preguntar(preguntaRedes(reglasFb()))).ok) return;
  const por = E.nombre;
  const n = buscar(tipo, id) ?? {};
  try {
    if (!silencioso) app.innerHTML = '<div class="girando"></div><p class="vacio">Guardando en GitHub…</p>';
    if (tipo === 'nota-pista') {
      await publicarNotaDePista(id, campos, por);
    } else if (tipo === 'pendiente' || tipo === 'retirada') {
      const motivo = tipo === 'retirada' ? 'vuelta a publicar desde el celular' : null;
      await E.cliente.guardar(ARCHIVOS.decisiones, (j) => {
        let x = conDecision(j, id, aprobada(campos, { deIA, por, motivo, extras }));
        if (redes !== null) x = conRedes(x, id, por, redes);
        return x;
      }, `Panel del celular: ${por} ${tipo === 'retirada' ? 'vuelve a publicar' : 'aprueba'} una nota`);
      if (tipo === 'retirada' && n.desde === 'a mano') await E.cliente.guardar(ARCHIVOS.retiradas, (j) => sinRetirada(j, id), `Panel del celular: ${por} vuelve a publicar una nota retirada a mano`);
      if (campos.seccion !== seccionAntes) {
        await E.cliente.guardar(ARCHIVOS.correcciones, (j) => conCorreccion(j, id, { seccion: campos.seccion }, { motivo: 'sección cambiada desde el celular', por }), `Panel del celular: ${por} cambia la sección`);
      }
    } else {
      const motivo = tipo === 'sin-cuerpo'
        ? (deIA ? 'cuerpo escrito con IA desde el celular y revisado' : 'cuerpo escrito a mano desde el celular')
        : (deIA ? 'reescrita con IA desde el celular y revisada' : 'editada desde el celular');
      const cambios = { ...campos };
      if (campos.seccion === seccionAntes) delete cambios.seccion;
      await E.cliente.guardar(ARCHIVOS.correcciones, (j) => conCorreccion(j, id, cambios, { motivo, por, deIA }), `Panel del celular: ${por} ${tipo === 'sin-cuerpo' ? 'completa' : 'corrige'} una nota`);
      if (redes !== null && redes !== marcadaParaRedes(id)) await E.cliente.guardar(ARCHIVOS.decisiones, (j) => conRedes(j, id, por, redes), `Panel del celular: ${por} manda una nota a las redes`);
    }
    await cargar({ archivo: !!E.archivo });
    const texto = tipo === 'nota-pista' ? 'Sale en la web como nota propia de Radar Balcarce, con sus fuentes, en la próxima actualización. La pista quedó cerrada como "Salió como nota nuestra".' : tipo === 'retirada' ? 'Vuelve a la web en la próxima actualización, con la misma dirección.' : (tipo === 'publicada' ? 'Los cambios se ven en la web en la próxima actualización.' : 'Se mandó a publicar: sale en la web en la próxima actualización.');
    if (silencioso) {
      if (enUnaLista()) vistaLista();
      aviso(texto, { conActualizar: true });
    } else {
      if (tipo === 'publicada' || tipo === 'retirada') E.pestana = 'publicadas';
      vistaResultado({ titulo: tipo === 'nota-pista' ? 'Nota publicada' : tipo === 'retirada' ? 'Vuelve a publicarse' : (tipo === 'publicada' ? 'Cambios guardados' : 'Publicada'), texto });
    }
  } catch (e) {
    aviso(explicarError(e), { ms: 9000 });
    if (!silencioso) vistaBorrador(tipo, id, { texto: campos, ok: true, problemas: [] });
    else (E.trabajos[id] = { clase: 'ia', estado: 'fallo', tipo, motivo: explicarError(e) });
  }
}

/** La siguiente nota que espera (para seguir sin volver a la lista), sin la que se acaba de resolver. */
function siguienteEnEsperan(excluirId) {
  if (E.pestana !== 'esperan') return null;
  const { sinDecidir } = listasDeEsperan();
  const todas = [
    ...sinDecidir.map((n) => ({ n, tipo: 'pendiente' })),
    ...sinCuerpoVigentes().map((n) => ({ n, tipo: 'sin-cuerpo' })),
  ].filter((x) => x.n.id !== excluirId).sort((a, b) => (Date.parse(b.n.fecha) || 0) - (Date.parse(a.n.fecha) || 0));
  return todas.length ? { ...todas[0], cuantas: todas.length } : null;
}

/**
 * Lo que se ve después de publicar, descartar o retirar (2/10, Hernán: "es como que sigue estando en el mismo panel y no sé si se mandó o
 * no"): una pantalla que dice QUÉ pasó, CUÁNDO se ve en la web y deja seguir con la siguiente nota.
 */
function vistaResultado({ titulo, texto, conActualizar = true }) {
  $('#pestanas').hidden = true;
  const sig = siguienteEnEsperan(E.notaActual);
  app.innerHTML = `<div class="resultado"><div class="resultado-icono">✓</div><h1>${esc(titulo)}</h1><p>${esc(texto)}</p>
    ${conActualizar ? '<p class="estado">La decisión ya quedó guardada en GitHub. La web se actualiza sola cada media hora: en ese rato lo ves en radarbalcarce.com. Si no querés esperar, tocá "Actualizar la web ahora" (tarda unos 8 minutos).</p>' : ''}</div>
    <div class="botones">
      ${sig ? `<button type="button" class="boton principal" data-abrir="${esc(sig.tipo)}" data-id="${esc(sig.n.id)}">Siguiente nota (quedan ${sig.cuantas})</button>` : ''}
      <button type="button" class="boton${sig ? '' : ' principal'}" data-accion="volver-lista-resultado">Volver a la lista</button>
      ${conActualizar ? '<button type="button" class="boton" data-accion="actualizar-web">Actualizar la web ahora</button>' : ''}
    </div>`;
  window.scrollTo(0, 0);
}

/** "Descartada. Queda en…" → "Descartada" (el título de la pantalla de resultado). */
const tituloDelResultado = (texto) => String(texto).split(/[.:]/)[0].slice(0, 60);

/** Publica la nota de una pista (queda en web/data/notas-de-pistas.json) y cierra la pista: salió como nota nuestra, con el enlace. */
async function publicarNotaDePista(id, campos, por) {
  const b = E.borradoresIA?.[`nota-${id}`]?.b;
  const fuentes = (b?.fuentes ?? []).map((f) => ({ medio: f.medio, enlace: f.enlace, fecha: f.fecha ?? null }));
  if (!fuentes.length) throw new Error('El borrador no tiene fuentes: pedí hacer la nota de nuevo.');
  await E.cliente.guardar(ARCHIVOS.notasDePistas, (j) => conNotaDePista(j, id, {
    titulo: campos.titulo, copete: campos.copete, cuerpo: campos.cuerpo, seccion: campos.seccion, fuentes, por, motivo: 'nota escrita con IA a partir de una pista y revisada desde el celular',
  }), `Panel del celular: ${por} publica una nota de una pista`);
  E.pistasLibro = await E.cliente.guardar(ARCHIVOS.pistas, (j) => conPistaResultado(j, id, { tipo: 'publicada', ruta: `/nota/${idDeNotaDePista(id)}` }), `Panel del celular: ${por} cierra una pista`);
  E.pestana = 'pistas';
  E.pistaAbierta = id;
}

async function guardarYVolver(pasos, listo) {
  try {
    app.innerHTML = '<div class="girando"></div><p class="vacio">Guardando en GitHub…</p>';
    for (const [ruta, cambiar, mensaje] of pasos) await E.cliente.guardar(ruta, cambiar, mensaje);
    await cargar({ archivo: !!E.archivo });
    vistaResultado({ titulo: tituloDelResultado(listo), texto: listo });
  } catch (e) {
    aviso(explicarError(e), { ms: 9000 });
    E.restaurar = E.scrollLista ?? null;
    vistaLista();
  }
}

// --------------------------------------------------------------- los toques

document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-pestana],[data-abrir],[data-accion]');
  if (!el || el.closest('dialog')) return;
  const { id, tipo } = el.dataset;
  if (el.dataset.pestana) { E.pestana = el.dataset.pestana; E.dia = null; E.feriado = null; E.pieza = null; E.borrador = null; E.restaurar = null; E.contactoAbierto = null; E.nuevoContacto = false; E.cola = null; vistaLista(); window.scrollTo(0, 0); return; }
  if (el.dataset.abrir === 'foto') { E.scrollLista = window.scrollY; vistaFoto(id); return; }
  if (el.dataset.abrir) { if (!el.closest('.resultado, .botones')) E.scrollLista = window.scrollY; vistaNota(el.dataset.abrir, id); return; }
  const accion = el.dataset.accion;
  const por = E.nombre;
  const decision = (cambiar, mensaje) => [ARCHIVOS.decisiones, cambiar, `Panel del celular: ${por} ${mensaje}`];
  if (accion === 'cerrar-aviso') $('#aviso').hidden = true;
  else if (accion === 'investigar-pista') investigarPista();
  else if (accion === 'actualizar-panel') {
    // Baja de nuevo todos los archivos del panel saltéandose la caché del navegador (4/10: Cloudflare los deja 4 horas y el panel se veía viejo) y recarga.
    aviso('Actualizando el panel…');
    try {
      await Promise.all(['/panel/', ...ARCHIVOS_DEL_PANEL].map((a) => fetch(a, { cache: 'reload' })));
      for (const k of await caches.keys()) await caches.delete(k);
      for (const r of await navigator.serviceWorker.getRegistrations()) await r.update();
    } catch { /* se recarga igual */ }
    location.reload();
  } else if (accion === 'abrir-contacto') { E.contactoAbierto = id; vistaContactos(); }
  else if (accion === 'volver-contactos') { E.contactoAbierto = null; E.nuevoContacto = false; E.cola = null; vistaContactos(); window.scrollTo(0, 0); }
  else if (accion === 'filtro-contactos') { E.filtroContactos = el.dataset.filtro; vistaContactos(); }
  else if (accion === 'nuevo-contacto') { E.nuevoContacto = true; vistaContactos(); window.scrollTo(0, 0); }
  else if (accion === 'abrir-whatsapp') abrirCanal(id, 'whatsapp');
  else if (accion === 'abrir-mail') abrirCanal(id, 'mail');
  else if (accion === 'marcar-enviado' || accion === 'marcar-respondio') {
    if (await anotarContacto(id, accion === 'marcar-enviado' ? { contactado: true } : { respondio: true })) aviso(accion === 'marcar-enviado' ? 'Anotado: no se le vuelve a escribir hasta dentro de 30 días.' : 'Anotado: respondió.');
    vistaContactos();
  } else if (accion === 'borrar-contacto') {
    if ((await preguntar({ titulo: '¿Borrar este contacto?', texto: 'Se saca de la lista de todos los celulares.', si: 'Sí, borrarlo' })).ok) {
      try {
        const c = E.contactos.entradas['p-' + id];
        await guardarContacto('p-' + id, { ...c, borrado: true });
        E.contactoAbierto = null;
        aviso('Borrado.');
      } catch (e) { aviso(explicarError(e), { ms: 9000 }); }
      vistaContactos();
    }
  } else if (accion === 'cola-contactos') {
    const cola = colaDeEnvio(listaDeContactos());
    if (!cola.length) { aviso('No hay a quién escribirle ahora: a todos se les escribió hace menos de 30 días.'); return; }
    cola.indice = 0;
    E.cola = cola;
    vistaContactos();
  } else if (accion === 'cola-enviado' || accion === 'cola-saltear') {
    if (accion === 'cola-enviado' && !(await anotarContacto(id, { contactado: true }))) return;
    E.cola.indice += 1;
    vistaContactos();
  } else if (accion === 'abrir-pista') { E.pestana = 'pistas'; E.dia = null; E.feriado = null; E.cerrandoPista = null; E.pistaAbierta = id; vistaPistas(); }
  else if (accion === 'volver-pistas') { E.cerrandoPista = null; E.pistaAbierta = null; vistaPistas(); window.scrollTo(0, 0); }
  else if (accion === 'mirar-pista') mirarPista(id);
  else if (accion === 'archivar-pista' || accion === 'reabrir-pista') {
    const nuevo = accion === 'archivar-pista' ? 'archivada' : 'abierta';
    try {
      E.pistasLibro = await E.cliente.guardar(ARCHIVOS.pistas, (j) => conPistaEstado(j, id, nuevo), `Panel del celular: ${E.nombre} ${nuevo === 'archivada' ? 'archiva' : 'reabre'} una pista`);
      aviso(nuevo === 'archivada' ? 'Archivada: ya no se vuelve a mirar.' : 'Reabierta: se vuelve a mirar 14 días más.');
    } catch (e) { aviso(explicarError(e), { ms: 9000 }); }
    vistaPistas();
  } else if (accion === 'nota-de-pista') hacerNotaDePista(id);
  else if (accion === 'cerrar-pista') { E.cerrandoPista = id; vistaPistas(); window.scrollTo(0, 0); }
  else if (accion === 'resultado-pista') {
    const comentario = ($('#comentario-pista')?.value ?? '').trim();
    try {
      E.pistasLibro = await E.cliente.guardar(ARCHIVOS.pistas, (j) => conPistaResultado(j, id, { tipo: el.dataset.resultado, comentario }), `Panel del celular: ${E.nombre} cierra una pista`);
      aviso('Anotado: queda en el seguimiento de la pista.');
    } catch (e) { aviso(explicarError(e), { ms: 9000 }); }
    E.cerrandoPista = null; E.pistaAbierta = id; vistaPistas(); window.scrollTo(0, 0);
  } else if (accion === 'retirar-nota-pista') {
    const r = await preguntar({ titulo: '¿Retirar la nota?', texto: 'Se saca de la web en la próxima actualización. La pista queda como estaba, con su seguimiento.', si: 'Sí, retirarla', conMotivo: '¿Por qué?' });
    if (r.ok) {
      try {
        await E.cliente.guardar(ARCHIVOS.notasDePistas, (j) => conNotaDePistaRetirada(j, id, { por: E.nombre, motivo: r.texto }), `Panel del celular: ${E.nombre} retira una nota de una pista`);
        aviso('Retirada: sale de la web en la próxima actualización.', { conActualizar: true });
      } catch (e) { aviso(explicarError(e), { ms: 9000 }); }
    }
  }
  else if (accion === 'rango-numeros') { E.rangoNumeros = Number(el.dataset.rango); vistaNumeros(); }
  else if (accion === 'mes-fechas') { E.mesFechas = el.dataset.mes; vistaFechas(); }
  else if (accion === 'sub-fechas') { E.subfechas = el.dataset.sub; vistaFechas(); }
  else if (accion === 'abrir-pieza') { E.pieza = el.dataset.dia; vistaFechas(); window.scrollTo(0, 0); }
  else if (accion === 'armar-con-candidatas') { E.pieza = null; E.subfechas = 'efemerides'; E.dia = el.dataset.dia; E.borrador = null; E.filtroEstilo = null; vistaFechas(); window.scrollTo(0, 0); }
  else if (accion === 'aprobar-pieza' || accion === 'sacar-pieza' || accion === 'cambiar-pieza') decidirPieza(accion);
  else if (accion === 'subir-foto') subirFotoPropia(id);
  else if (accion === 'foto-de-fuente') {
    const medio = el.dataset.medio || 'la fuente';
    sumarFoto(id, { url: el.dataset.url, credito: medio, confirmo: !!$('#f-ok')?.checked });
  } else if (accion === 'buscar-foto') { E.scrollLista = E.scrollLista ?? window.scrollY; vistaFoto(id); }
  else if (accion === 'abrir-dia') { E.dia = el.dataset.dia; E.borrador = null; E.filtroEstilo = null; vistaFechas(); window.scrollTo(0, 0); }
  else if (accion === 'abrir-feriado') { E.feriado = el.dataset.dia; vistaFechas(); window.scrollTo(0, 0); }
  else if (accion === 'volver-fechas') { E.dia = null; E.feriado = null; E.pieza = null; E.borrador = null; if (!E.fechas) E.fechas = null; vistaFechas(); window.scrollTo(0, 0); }
  else if (accion === 'filtro-estilo') { E.filtroEstilo = el.dataset.estilo || null; vistaDia(); }
  else if (accion === 'marcar') { E.borrador = marcarEn(E.borrador, id, el.dataset.rol); const y = window.scrollY; vistaDia(); window.scrollTo(0, y); }
  else if (accion === 'guardar-dia') {
    const dia = E.dia;
    const cand = E.fechas.candidatas?.dias?.[dia]?.candidatas ?? [];
    const eleccion = eleccionDeDia(E.borrador, cand, por);
    // Si eligió otra principal que la del día armado, ese día queda con cambios pedidos: no sale hasta rearmarlo.
    const armado = E.fechas.piezas?.dias?.[dia];
    const cambia = !!armado && !!eleccion.principal && eleccion.principal !== armado.principal?.id;
    guardarFechas((j) => {
      const x = conEleccionDeDia(j, dia, eleccion);
      return cambia ? conDecisionDePieza(x, dia, { estado: 'cambiar', comentario: 'Eligió otra principal en las candidatas', huella: huellaDelDia(armado), por }) : x;
    }, 'arma ' + dia + ' de Un día como hoy', () => {
      E.dia = null; E.borrador = null; vistaFechas(); aviso(eleccion.principal ? 'Guardado. Ese día ya tiene su principal.' : 'Guardado, pero todavía falta elegir la principal.');
    });
  } else if (accion === 'aprobar-feriado' || accion === 'cambiar-feriado') {
    const fecha = E.feriado;
    let comentario = '';
    if (accion === 'cambiar-feriado') {
      const r = await preguntar({ titulo: 'Pedir cambios', texto: 'Contame qué cambiarías del enfoque. Queda anotado.', si: 'Guardar', conMotivo: '¿Qué cambiarías?' });
      if (!r.ok) return;
      comentario = r.texto;
    }
    guardarFechas((j) => conDecisionDeFeriado(j, fecha, { estado: accion === 'aprobar-feriado' ? 'aprobada' : 'cambiar', comentario, por }), 'decide un feriado', () => {
      E.feriado = null; vistaFechas(); aviso(accion === 'aprobar-feriado' ? 'Aprobado.' : 'Anotado: lo cambiamos.');
    });
  } else if (accion === 'volver' || accion === 'volver-lista-resultado') { E.restaurar = E.scrollLista ?? null; vistaLista(); }
  else if (accion === 'volver-fotos') { E.restaurar = E.scrollLista ?? null; vistaLista(); }
  else if (accion === 'todas-las-publicadas') { E.publicadasTodas = true; vistaLista(); }
  else if (accion === 'solo-24') { E.publicadasTodas = false; vistaLista(); }
  else if (accion === 'volver-nota') { if (tipo === 'nota-pista') { E.pestana = 'pistas'; E.pistaAbierta = id; vistaLista(); } else vistaNota(tipo, id); }
  else if (accion === 'escribir') {
    const r = await preguntar({
      titulo: 'Pedirle a la IA que la escriba', texto: 'Tarda un minuto. No se publica nada hasta que lo revises.', si: 'Escribir', conPedido: 'Algo para pedirle (opcional): "que sea corta", "que empiece por el horario"…',
    });
    if (r.ok) pedirALaIA(tipo, id, r.texto);
  } else if (accion === 'reintentar') {
    reintentarParte(el.dataset.pieza, el.dataset.red, el.dataset.parte);
  } else if (accion === 'publicar-ia') {
    const r = await preguntar({
      titulo: '¿Publicarla?', texto: 'La IA la escribe (tarda un minuto) y el verificador la controla contra las fuentes. Si no encuentra problemas, sale sola en la próxima actualización. Si encuentra algo, te la muestra para que decidas.', si: 'Sí, publicarla',
    });
    if (r.ok) pedirALaIA(tipo, id, '', { publicar: true });
  } else if (accion === 'ver-borrador') {
    const g = E.borradoresIA?.[tipo === 'nota-pista' ? `nota-${id}` : id];
    if (g) vistaBorrador(tipo, id, g.b);
  } else if (accion === 'abrir-borrador') {
    const clave = tipo === 'nota-pista' ? `nota-${id}` : id;
    const g = E.borradoresIA?.[clave];
    if (g) vistaBorrador(tipo, id, g.b); else aviso('No pude abrir ese borrador. Probá de nuevo en un momento.');
  } else if (accion === 'borrador-guardado') {
    try {
      const { json } = await E.cliente.leer(ARCHIVOS.borradores);
      const sobre = json.borradores?.[id];
      const b = sobre && E.llaves ? await abrir(sobre, E.llaves) : null;
      if (b) { (E.borradoresIA ??= {})[id] = { b, cuando: Date.parse(sobre.cuando) || Date.now() }; vistaBorrador(tipo, id, b); } else aviso('No hay un borrador guardado de esta nota para este celular.');
    } catch (e) { aviso(explicarError(e), { ms: 9000 }); }
  } else if (accion === 'pedir-reescribir' || accion === 'otra-version') {
    const r = await preguntar({
      titulo: 'Pedir otra versión', texto: 'Tarda un minuto. No cambia nada en la web hasta que la guardes.', si: 'Pedirla', conPedido: '¿Qué cambiar? (opcional)',
    });
    if (r.ok) pedirALaIA(accion === 'otra-version' ? tipo : 'publicada', id, r.texto);
  } else if (accion === 'a-mano') vistaBorrador(tipo, id, null);
  else if (accion === 'descartar') {
    if ((await preguntar(PREGUNTAS.descartar)).ok) {
      guardarYVolver([decision((j) => conDecision(j, id, { estado: 'descartada', por, motivo: 'descartada desde el celular' }), 'descarta una nota')], 'Descartada. Queda en "Descartadas", al final de Esperan, por si te equivocaste.');
    }
  } else if (accion === 'retirar') {
    const r = await preguntar(PREGUNTAS.retirar);
    if (!r.ok) return;
    // Si estaba aprobada desde el celular, se anota: deshacer el retiro la vuelve a dejar aprobada.
    const antes = decididaEnElCelular(id)?.estado === 'publicada' ? { antes: 'publicada' } : {};
    guardarYVolver([decision((j) => conDecision(j, id, { estado: 'bloqueada', por, motivo: r.texto, ...antes }), 'retira una nota')], 'Retirada: sale de la web en la próxima actualización y queda en "Retiradas" 30 días. Si ya estaba en Facebook o Instagram, allá hay que borrarla a mano.');
  } else if (accion === 'deshacer') {
    guardarYVolver([decision((j) => sinDecision(j, id), 'deshace una decisión')], 'Deshecho: se aplica en la próxima actualización.');
  } else if (accion === 'deshacer-retiro') {
    // Todavía no se aplicó: vuelve a como estaba (aprobada, si lo estaba).
    const d = decididaEnElCelular(id);
    const n = buscar('publicada', id) ?? {};
    const c = E.correcciones.notas?.[id] ?? {};
    const texto = { titulo: c.titulo ?? n.titulo, copete: c.copete ?? n.copete, cuerpo: c.cuerpo ?? n.cuerpo };
    const cambiar = d?.antes === 'publicada' && texto.titulo && texto.copete && texto.cuerpo
      ? (j) => conDecision(j, id, aprobada(texto, { deIA: !!n.guion, por, motivo: 'se deshizo el retiro desde el celular' }))
      : (j) => sinDecision(j, id);
    guardarYVolver([decision(cambiar, 'deshace un retiro')], 'Deshecho: la nota sigue en la web.');
  } else if (accion === 'volver-a-publicar') {
    const n = buscar('retirada', id);
    if (!n) return;
    if (!n.titulo || !n.copete || !n.cuerpo) { vistaBorrador('retirada', id, null); aviso('Le falta texto: completalo y tocá "Volver a publicar".'); return; }
    if (!(await preguntar(PREGUNTAS.volverAPublicar)).ok) return;
    const pasos = [decision((j) => conDecision(j, id, aprobada(n, { deIA: n.deIA, por, motivo: 'vuelta a publicar desde el celular' })), 'vuelve a publicar una nota')];
    if (n.desde === 'a mano') pasos.push([ARCHIVOS.retiradas, (j) => sinRetirada(j, id), `Panel del celular: ${por} vuelve a publicar una nota retirada a mano`]);
    guardarYVolver(pasos, 'Vuelve a la web en la próxima actualización, con la misma dirección.');
  } else if (accion === 'retirar-de-nuevo') {
    const n = buscar('retirada', id) ?? {};
    guardarYVolver([decision((j) => conDecision(j, id, { estado: 'bloqueada', por, motivo: n.motivo || 'sigue retirada (se deshizo la vuelta a publicar)' }), 'deja retirada una nota')], 'Listo: sigue retirada.');
  } else if (accion === 'redes') {
    const si = !marcadaParaRedes(id);
    if (!(await preguntar(si ? preguntaRedes(reglasFb()) : PREGUNTAS.sacarDeRedes)).ok) return;
    guardarYVolver([decision((j) => conRedes(j, id, por, si), `${si ? 'manda una nota a' : 'saca una nota de'} las redes`)], si ? 'En la cola de las redes: sale en la próxima vuelta que corresponda. Mirá la pestaña Redes.' : 'Fuera de la cola de las redes.');
  } else if (accion === 'archivo') {
    el.disabled = true;
    try { await cargar({ archivo: true }); vistaLista(); } catch (e) { aviso(explicarError(e)); }
  } else if (accion === 'actualizar-web') {
    // Regla 317 (C6): ya no dispara el workflow viejo de GitHub: le pide una vuelta al motor de Cloudflare por el Worker del reloj (con la misma llave de GitHub de siempre).
    // Con la pausa general prendida el Worker no la hace y lo dice.
    el.disabled = true;
    try { await E.nubeCliente.pedirVuelta({ nombre: E.nombre }); aviso(AVISOS_DE_LA_NUBE.vuelta); } catch (e) { aviso(explicarErrorDeLaNube(e), { ms: 10000 }); }
    el.disabled = false;
    refrescarNube();
  } else if (accion === 'pausar-todo') {
    await cambiarPausa(true);
  } else if (accion === 'reanudar-todo') {
    await cambiarPausa(false);
  } else if (accion === 'recargar-pagina') {
    location.reload();
  } else if (accion === 'salir') {
    if (!(await preguntar({ titulo: '¿Salir de este celular?', texto: 'Se borran la llave y los datos de este celular. Para volver a entrar vas a necesitar una llave.', si: 'Sí, salir' })).ok) return;
    localStorage.removeItem(GUARDADO);
    indexedDB.deleteDatabase(GUARDADO);
    E.cliente = null;
    E.nubeCliente = null;
    E.nube = null;
    vistaLlave();
  }
});

$('#recargar').addEventListener('click', async () => {
  app.innerHTML = '<div class="girando"></div>';
  E.numeros = null;
  E.nubeCargadaEn = 0;
  try { await cargar({ archivo: !!E.archivo }); vistaLista(); } catch (e) { aviso(explicarError(e)); vistaLista(); }
});

// ------------------------------------------------------------------ arrancar

async function arrancar() {
  if (DEMO) {
    const { clienteDePrueba, llavesDePrueba, nubeDePrueba } = await import('./prueba.js');
    $('#demo').hidden = false;
    E.cliente = clienteDePrueba();
    E.nubeCliente = nubeDePrueba();
    E.llaves = await llavesDePrueba();
    E.nombre = 'Prueba';
  } else {
    const a = leerAjustes();
    if (!a?.token) { vistaLlave(); return; }
    E.cliente = crearCliente({ token: a.token });
    E.nubeCliente = crearClienteDeLaNube({ token: a.token });
    E.nombre = a.nombre;
    E.llaves = await llavesDelCelular();
    if (!E.llaves) E.llaves = await registrarCelular(E.cliente, a.nombre);
  }
  app.innerHTML = '<div class="girando"></div><p class="vacio">Trayendo las notas…</p>';
  try {
    await cargar();
    vistaLista();
  } catch (e) {
    if (e instanceof ErrorDeGitHub && e.estado === 401) vistaLlave(explicarError(e));
    else { app.innerHTML = `<p class="problemas">${esc(explicarError(e))}</p><button class="boton" type="button" data-accion="recargar-pagina">Probar de nuevo</button>`; }
  }
}

if ('serviceWorker' in navigator && !DEMO) navigator.serviceWorker.register('/panel/sw.js', { scope: '/panel/' }).catch(() => {});
arrancar();
