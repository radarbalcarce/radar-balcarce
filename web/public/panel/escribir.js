// La pestaña "Escribir" del panel del celular (30/10/2026, Hernán: "que en el panel yo pueda publicar notas directamente, donde tenga que solo pegar título,
// copete y cuerpo de la nota, además de subir fotos para poner entre la nota, más la de portada y quién firma").
//
// Una persona escribe la nota a mano (título, bajada, cuerpo, sección, firma), sube la foto de portada y las que van entre los párrafos, y la publica:
// las fotos se achican en el celular, se suben a web/public/fotos-notas/ y la nota queda en web/data/notas-de-redaccion.json (web/lib/notas-de-redaccion.js
// la arma). No pasa por la IA ni por el verificador: lo que se escribe es lo que sale, con la firma de quien la escribió.
//
// Acá, sin nada del DOM ni de la red (se prueba con Node, pruebas/escribir-panel.test.mjs): las medidas y el plan para achicar una foto, las marcas
// "[foto N]" del cuerpo, los controles antes de publicar, el armado de la entrada que se guarda y el HTML de la pantalla, la vista previa y la lista.
// Lo que toca el celular (elegir un archivo, el lienzo, GitHub) está en app.js. Varias funciones repiten a propósito las de web/lib (el panel no puede
// importar nada de afuera de su carpeta): una prueba controla que den lo mismo.

import { seccionesDelPanel } from './github.js';

// ------------------------------------------------------------------ las medidas de las fotos

/**
 * Las medidas que se recomiendan y que el panel aplica solo al elegir una foto (se achica en el celular, antes de subirla):
 *   portada   hasta 1.600 px de ancho; la página la muestra en 16:9 (si la foto tiene otra proporción, se recorta: queda la franja del medio).
 *   interna   hasta 1.200 px de ancho; se ve entera, sin recortar.
 * Ninguna pasa de ~400 KB (se baja la calidad hasta que entre). Lo más largo de una foto nunca pasa del ancho máximo (una foto vertical se achica por el alto).
 */
export const MEDIDAS = {
  portada: { ancho: 1600, alto: 900, anchoMinimo: 1200, proporcion: '16:9' },
  interna: { ancho: 1200, anchoMinimo: 600 },
  bytesMaximos: 400 * 1024,
  calidad: 0.82,
};

export const MAXIMO_DE_FOTOS = 10;
export const AUTOR_POR_DEFECTO = 'Hernán Accomo';
export const MINIMO_DE_PALABRAS = 30;
export const MAXIMO_DEL_TITULO = 150;
export const TITULO_RECOMENDADO = 90;
export const AVISO_DE_MENORES = 'No publiques nombres ni fotos de menores ni de víctimas de delitos sexuales o violencia de género.';
export const MOTIVO_DE_LA_NOTA = 'nota escrita por la redacción';

/** A cuánto se achica una foto: { ancho, alto, escala }. Lo más largo no pasa de `anchoMaximo`; nunca se agranda. */
export function medidasAchicadas({ ancho, alto }, anchoMaximo) {
  const a = Math.max(1, Number(ancho) || 1);
  const b = Math.max(1, Number(alto) || 1);
  const escala = Math.min(1, anchoMaximo / a, anchoMaximo / b);
  return { ancho: Math.max(1, Math.round(a * escala)), alto: Math.max(1, Math.round(b * escala)), escala };
}

/** Los intentos para que una foto entre en el peso máximo: primero se baja la calidad y, si no alcanza, también el tamaño. Cada paso pesa menos que el anterior. */
export const PLAN_DE_ACHIQUE = [
  { calidad: 0.82, escala: 1 }, { calidad: 0.74, escala: 1 }, { calidad: 0.66, escala: 1 }, { calidad: 0.58, escala: 1 },
  { calidad: 0.6, escala: 0.85 }, { calidad: 0.5, escala: 0.85 }, { calidad: 0.55, escala: 0.7 }, { calidad: 0.45, escala: 0.6 },
];

/** "340 KB", "1,2 MB". */
export function pesoLegible(bytes) {
  const b = Number(bytes) || 0;
  return b >= 1024 * 1024 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
}

/** Lo que conviene avisar de una foto ya achicada (`tipo`: 'portada' o 'interna'); nunca bloquea. */
export function avisosDeUnaFoto({ ancho, alto }, tipo) {
  const avisos = [];
  const proporcion = ancho / alto;
  if (tipo === 'portada') {
    if (ancho < MEDIDAS.portada.anchoMinimo) avisos.push(`Es chica (${ancho} px de ancho): para la portada conviene ${MEDIDAS.portada.anchoMinimo} px o más.`);
    if (proporcion < 1.25) avisos.push('Es bastante alta: en la portada se ve recortada (queda la franja del medio, un poco más arriba que abajo). Mirá el recuadro.');
    else if (proporcion > 2.2) avisos.push('Es muy ancha: en la portada se recortan los costados. Mirá el recuadro.');
  } else if (ancho < MEDIDAS.interna.anchoMinimo) {
    avisos.push(`Es muy chica (${ancho} px de ancho): se va a ver borrosa en la nota.`);
  }
  return avisos;
}

// ------------------------------------------------------------------ la clave, la dirección y los nombres

/** El titular como parte de una dirección (igual que slugDe de web/lib/ruta.js; una prueba controla que den lo mismo). */
export function slugDe(titulo = '') {
  const limpio = String(titulo).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (limpio.length <= 70) return limpio || 'nota';
  const corte = limpio.slice(0, 70);
  const ultimo = corte.lastIndexOf('-');
  return (ultimo > 20 ? corte.slice(0, ultimo) : corte).replace(/-+$/, '');
}

/** La clave de una nota nueva: "r" y letras y números (la hora en base 36 y dos al azar). No depende del título: no cambia nunca aunque se edite. */
export function claveNueva(ahora = Date.now(), azar = Math.random) {
  return `r${Number(ahora).toString(36)}${Math.floor(azar() * 1296).toString(36).padStart(2, '0')}`;
}

/** El id de la nota (igual que idDeNotaDeRedaccion de web/lib/notas-de-redaccion.js). */
export const idDeNotaDeRedaccion = (clave) => `nr${String(clave ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase().replace(/^r/, '').slice(0, 24)}`;

/** El nombre del archivo de una foto: sin carpetas, todo junto en fotos-notas/ (así lo sirve el sitio). `cual`: 'portada' o el número de subida. */
export const nombreDeFoto = (clave, cual, token) => `redaccion-${String(clave).toLowerCase()}-${cual === 'portada' ? 'p' : cual}-${token}.jpg`;
export const rutaDelRepositorio = (nombre) => `web/public/fotos-notas/${nombre}`;
export const archivoDeLaWeb = (nombre) => `fotos-notas/${nombre}`;
export const tokenNuevo = (azar = Math.random) => Math.floor(azar() * 1679616).toString(36).padStart(4, '0');

/** La dirección de la nota en el sitio. */
export const enlaceDeLaNota = (clave, entrada, base = 'https://radarbalcarce.com') => `${base}/nota/${entrada?.slug || slugDe(entrada?.titulo)}-${idDeNotaDeRedaccion(clave)}`;

// ------------------------------------------------------------------ el cuerpo y las marcas de las fotos

const MARCA_SOLA = /^\s*\[\s*foto\s*(\d{1,2})\s*\]\s*$/i;
const MARCA_EN_EL_TEXTO = /\s*\[\s*foto\s*\d{1,2}\s*\]\s*/gi;

/** "[foto 2]". */
export const marcaDeFoto = (n) => `[foto ${n}]`;

/** El cuerpo prolijo: renglones sin espacios al final, a lo sumo una línea en blanco seguida, sin blancos ni al principio ni al final. */
export function normalizarCuerpo(texto) {
  return String(texto ?? '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Pone la marca de la foto `n` en el lugar del cursor (`posicion`), sola en su línea y con una línea en blanco antes y después.
 * Devuelve { texto, posicion } con la posición justo después de la marca (para seguir escribiendo desde ahí).
 */
export function insertarMarca(texto, posicion, n) {
  const t = String(texto ?? '');
  const p = Math.max(0, Math.min(t.length, Number.isFinite(posicion) ? posicion : t.length));
  const izq = t.slice(0, p).replace(/[ \t]+$/, '');
  const der = t.slice(p).replace(/^[ \t]+/, '');
  const antes = izq === '' ? '' : izq.endsWith('\n\n') ? '' : izq.endsWith('\n') ? '\n' : '\n\n';
  const despues = der.startsWith('\n\n') ? '' : der.startsWith('\n') ? '\n' : '\n\n';
  const hasta = `${izq}${antes}${marcaDeFoto(n)}${despues}`;
  // El cursor queda al principio de lo que sigue (después de la línea en blanco), listo para seguir escribiendo.
  return { texto: hasta + der, posicion: hasta.length + (/^\n{1,2}/.exec(der)?.[0].length ?? 0) };
}

/** Saca del cuerpo la marca de la foto `n` (cuando se saca esa foto) y corre una menos las marcas de las que venían después. */
export function quitarFotoDelCuerpo(texto, n) {
  const lineas = String(texto ?? '').replace(/\r\n?/g, '\n').split('\n').flatMap((l) => {
    const m = MARCA_SOLA.exec(l);
    if (!m) return [l];
    const k = Number(m[1]);
    if (k === n) return [];
    return [k > n ? marcaDeFoto(k - 1) : l];
  });
  return normalizarCuerpo(lineas.join('\n'));
}

/**
 * Parte el cuerpo en párrafos y dice dónde va cada foto: lo mismo que partirCuerpo de web/lib/notas-de-redaccion.js (una prueba controla que den
 * lo mismo). { parrafos, fotosEn: [{ n, despuesDe }], sinMarca, invalidas, repetidas, sueltas }.
 */
export function partirCuerpo(texto, cantidadDeFotos = 0) {
  const lineas = String(texto ?? '').replace(/\r\n?/g, '\n').split('\n');
  const parrafos = [];
  const fotosEn = [];
  const usadas = new Set();
  const invalidas = [];
  const repetidas = [];
  const sueltas = [];
  let actual = [];
  const cerrar = () => {
    if (!actual.length) return;
    const crudo = actual.join(' ').replace(/\s+/g, ' ').trim();
    const limpio = crudo.replace(MARCA_EN_EL_TEXTO, ' ').replace(/\s+/g, ' ').trim();
    if (limpio !== crudo) sueltas.push(crudo);
    if (limpio) parrafos.push(limpio);
    actual = [];
  };
  for (const linea of lineas) {
    const m = MARCA_SOLA.exec(linea);
    if (m) {
      cerrar();
      const n = Number(m[1]);
      if (n < 1 || n > cantidadDeFotos) invalidas.push(n);
      else if (usadas.has(n)) repetidas.push(n);
      else { usadas.add(n); fotosEn.push({ n, despuesDe: parrafos.length }); }
      continue;
    }
    if (!linea.trim()) { cerrar(); continue; }
    actual.push(linea.trim());
  }
  cerrar();
  const sinMarca = [];
  for (let n = 1; n <= cantidadDeFotos; n += 1) {
    if (usadas.has(n)) continue;
    sinMarca.push(n);
    fotosEn.push({ n, despuesDe: parrafos.length });
  }
  return { parrafos, fotosEn, sinMarca, invalidas, repetidas, sueltas };
}

/** Cuántas palabras tiene el cuerpo sin contar las marcas (igual que palabrasDe de web/lib/cuerpo.js: letras o números seguidos). */
export const palabrasDelCuerpo = (texto, cantidadDeFotos = 0) => (partirCuerpo(texto, cantidadDeFotos).parrafos.join(' ').match(/[\p{L}\p{N}]+/gu) ?? []).length;

/** "Foto: Hernán Accomo" (igual que creditoDeFoto de web/lib/notas-de-redaccion.js). */
export function creditoDeFoto(texto) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim().replace(/^foto:\s*/i, '').slice(0, 80).trim();
  return t ? `Foto: ${t}` : '';
}

/** Lo que se lee debajo de la foto: el epígrafe y el crédito (igual que leyendaDeFoto de web/lib/notas-de-redaccion.js). */
export function leyendaDeFoto(epigrafe, credito) {
  const e = String(epigrafe ?? '').replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '');
  const c = creditoDeFoto(credito);
  return [e ? `${e}.` : '', c].filter(Boolean).join(' ');
}

// ------------------------------------------------------------------ controlar antes de publicar

/** El nombre de la firma, sin "Por" adelante (igual que autorDeLaEntrada de web/lib/notas-de-redaccion.js). */
export const autorDeLaFirma = (firma) => String(firma ?? '').replace(/\s+/g, ' ').trim().replace(/^por(?:\s+|$)/i, '').slice(0, 60).trim();

/**
 * Lo que impide publicar: [{ campo, texto }]. `f` es la nota que se está escribiendo:
 *   { titulo, copete, cuerpo, seccion, firma, portada, fotos: [{ archivo | base64 }] }
 */
export function problemasDelFormulario(f) {
  const problemas = [];
  const titulo = String(f?.titulo ?? '').trim();
  if (!titulo) problemas.push({ campo: 'titulo', texto: 'Falta el título.' });
  else if (titulo.length > MAXIMO_DEL_TITULO) problemas.push({ campo: 'titulo', texto: `El título es muy largo (${titulo.length} caracteres; hasta ${MAXIMO_DEL_TITULO}).` });
  if (!String(f?.copete ?? '').trim()) problemas.push({ campo: 'copete', texto: 'Falta la bajada (el copete).' });
  const fotos = Array.isArray(f?.fotos) ? f.fotos : [];
  if (fotos.length > MAXIMO_DE_FOTOS) problemas.push({ campo: 'fotos', texto: `Son demasiadas fotos adentro de la nota (hasta ${MAXIMO_DE_FOTOS}).` });
  const parte = partirCuerpo(f?.cuerpo, fotos.length);
  const palabras = (parte.parrafos.join(' ').match(/[\p{L}\p{N}]+/gu) ?? []).length;
  if (palabras < MINIMO_DE_PALABRAS) problemas.push({ campo: 'cuerpo', texto: `El cuerpo tiene ${palabras} palabras: hacen falta ${MINIMO_DE_PALABRAS} o más.` });
  for (const n of [...new Set(parte.invalidas)]) problemas.push({ campo: 'cuerpo', texto: `El cuerpo dice [foto ${n}] pero esa foto no está subida (subila o sacá la marca).` });
  if (parte.sueltas.length) problemas.push({ campo: 'cuerpo', texto: 'Una marca [foto N] tiene que ir sola en su línea, entre dos párrafos. Está pegada a un texto.' });
  if (!seccionesDelPanel().includes(f?.seccion)) problemas.push({ campo: 'seccion', texto: 'Elegí la sección.' });
  if (!autorDeLaFirma(f?.firma)) problemas.push({ campo: 'firma', texto: 'Falta la firma (quién escribe la nota).' });
  return problemas;
}

/** Lo que conviene saber antes de publicar y no impide nada: [texto]. */
export function avisosDelFormulario(f) {
  const avisos = [];
  const fotos = Array.isArray(f?.fotos) ? f.fotos : [];
  const parte = partirCuerpo(f?.cuerpo, fotos.length);
  if (String(f?.titulo ?? '').trim().length > TITULO_RECOMENDADO) avisos.push(`El título tiene más de ${TITULO_RECOMENDADO} caracteres: en Google y en WhatsApp se corta. Si podés, hacelo más corto.`);
  for (const n of parte.sinMarca) avisos.push(`La foto ${n} no tiene su marca en el texto: va al final de la nota.`);
  for (const n of [...new Set(parte.repetidas)]) avisos.push(`La marca [foto ${n}] está más de una vez: la foto se muestra una sola vez, donde aparece primero.`);
  if (!f?.portada) avisos.push('No tiene foto de portada: en la portada y en la nota va la placa de la sección.');
  return avisos;
}

// ------------------------------------------------------------------ armar lo que se guarda

const comoFoto = (foto) => (foto ? {
  archivo: foto.archivo,
  ...(foto.ancho ? { ancho: foto.ancho } : {}),
  ...(foto.alto ? { alto: foto.alto } : {}),
  epigrafe: String(foto.epigrafe ?? '').replace(/\s+/g, ' ').trim().slice(0, 300),
  credito: String(foto.credito ?? '').replace(/\s+/g, ' ').trim().replace(/^foto:\s*/i, '').slice(0, 80),
} : null);

/**
 * La entrada de web/data/notas-de-redaccion.json. Todas las fotos tienen que tener ya su `archivo` (se suben antes). `por` es quien usa el panel.
 * (Si la nota ya existía, conNotaDeRedaccion de github.js conserva su dirección, su fecha y quién la publicó.)
 */
export function armarEntrada(f, { por, ahora = new Date() }) {
  const titulo = String(f.titulo).replace(/\s+/g, ' ').trim();
  return {
    titulo,
    copete: String(f.copete).replace(/\s+/g, ' ').trim(),
    cuerpo: normalizarCuerpo(f.cuerpo),
    seccion: f.seccion,
    firma: autorDeLaFirma(f.firma),
    portada: comoFoto(f.portada),
    fotos: (f.fotos ?? []).map(comoFoto),
    slug: f.slug || slugDe(titulo),
    cuando: ahora.toISOString(),
    por,
    motivo: MOTIVO_DE_LA_NOTA,
  };
}

/** El formulario para editar una nota ya publicada: lo guardado, con las fotos como "ya subidas". */
export function formularioDesdeLaEntrada(clave, e) {
  const foto = (x) => (x ? { archivo: x.archivo, ancho: x.ancho, alto: x.alto, epigrafe: x.epigrafe ?? '', credito: x.credito ?? '' } : null);
  return {
    clave, existente: true, slug: e.slug ?? null, titulo: e.titulo ?? '', copete: e.copete ?? '', cuerpo: e.cuerpo ?? '', seccion: e.seccion ?? 'Balcarce',
    firma: e.firma ?? AUTOR_POR_DEFECTO, portada: foto(e.portada), fotos: (e.fotos ?? []).map(foto), vista: false, contador: 0,
  };
}

/** Un formulario vacío. `firma` es la última que se usó en este celular. */
export function formularioVacio(firma = AUTOR_POR_DEFECTO, clave = claveNueva()) {
  return {
    clave, existente: false, slug: null, titulo: '', copete: '', cuerpo: '', seccion: 'Balcarce', firma: firma || AUTOR_POR_DEFECTO, portada: null, fotos: [], vista: false, contador: 0,
  };
}

/** Lo que se guarda como borrador en el celular (sólo el texto: las fotos no entran en el almacenamiento del navegador). */
export function borradorDelFormulario(f) {
  return {
    clave: f.clave, existente: !!f.existente, titulo: f.titulo, copete: f.copete, cuerpo: f.cuerpo, seccion: f.seccion, firma: f.firma,
  };
}

/** ¿Vale la pena guardar este borrador? Sólo si se escribió algo. */
export const borradorTieneAlgo = (b) => !!b && [b.titulo, b.copete, b.cuerpo].some((t) => String(t ?? '').trim());

/** Pone el borrador guardado en un formulario vacío (sin fotos: hay que volver a elegirlas). */
export function formularioDesdeElBorrador(b, firma) {
  return { ...formularioVacio(firma, b.clave || undefined), titulo: b.titulo ?? '', copete: b.copete ?? '', cuerpo: b.cuerpo ?? '', seccion: b.seccion || 'Balcarce', firma: b.firma || firma || AUTOR_POR_DEFECTO };
}

// ------------------------------------------------------------------ la pantalla

const srcDeFoto = (foto) => (foto.base64 ? `data:image/jpeg;base64,${foto.base64}` : `/${foto.archivo}`);

function htmlDeUnaFoto(foto, { esc, donde, i, n }) {
  const tipo = donde === 'portada' ? 'portada' : 'interna';
  const avisos = foto.ancho && foto.alto ? avisosDeUnaFoto(foto, tipo) : [];
  const medidas = foto.ancho && foto.alto ? `${foto.ancho} × ${foto.alto} px${foto.bytes ? ` · ${pesoLegible(foto.bytes)}` : ''}` : '';
  const quitar = donde === 'portada' ? 'quitar-portada' : 'quitar-foto';
  return `<div class="caja foto-de-nota" data-donde="${esc(donde)}" data-i="${esc(i ?? '')}">
      ${donde === 'portada'
    ? `<div class="marco-portada"><img src="${esc(srcDeFoto(foto))}" alt="" width="${esc(foto.ancho ?? 1600)}" height="${esc(foto.alto ?? 900)}"></div>
         <p class="ayuda">Así se ve en la portada y arriba de la nota: recortada en formato 16:9 (el recuadro).</p>`
    : `<img class="miniatura" src="${esc(srcDeFoto(foto))}" alt="" width="${esc(foto.ancho ?? 1200)}" height="${esc(foto.alto ?? 800)}">`}
      <p><strong>${donde === 'portada' ? 'Portada' : `Foto ${n}`}</strong> <span class="meta">${esc(medidas)}${foto.archivo ? ' · ya subida' : ''}</span></p>
      ${avisos.map((a) => `<p class="problemas">${esc(a)}</p>`).join('')}
      <label for="w-${donde}-${i ?? 'p'}-epigrafe">Epígrafe (opcional)</label>
      <input type="text" id="w-${donde}-${i ?? 'p'}-epigrafe" data-campo="epigrafe" data-donde="${esc(donde)}" data-i="${esc(i ?? '')}" maxlength="300" value="${esc(foto.epigrafe ?? '')}" placeholder="Qué se ve en la foto">
      <label for="w-${donde}-${i ?? 'p'}-credito">Crédito (opcional)</label>
      <input type="text" id="w-${donde}-${i ?? 'p'}-credito" data-campo="credito" data-donde="${esc(donde)}" data-i="${esc(i ?? '')}" maxlength="80" value="${esc(foto.credito ?? '')}" placeholder="Hernán Accomo">
      <div class="botones">
        ${donde === 'portada' ? '' : `<button type="button" class="boton" data-accion="insertar-foto" data-n="${esc(n)}">Insertar foto ${esc(n)} aquí</button>`}
        <button type="button" class="boton peligro" data-accion="${quitar}" data-i="${esc(i ?? '')}">Sacar esta foto</button>
      </div>
    </div>`;
}

/** Los controles para subir fotos: el botón grande de elegir y, por dentro, el archivo. */
const htmlDeElegirFotos = ({ esc, donde, texto, multiple }) => `<label class="boton ancho elegir-foto" for="w-subir-${esc(donde)}">📷 ${esc(texto)}</label>
      <input type="file" id="w-subir-${esc(donde)}" class="oculto" accept="image/*" data-subir="${esc(donde)}" ${multiple ? 'multiple' : ''}>`;

/** El formulario entero. `f`: el estado (formularioVacio). `ctx`: { esc, hayBorrador, procesando }. */
export function htmlDelFormulario(f, { esc, procesando = '' }) {
  const fotos = f.fotos ?? [];
  const palabras = palabrasDelCuerpo(f.cuerpo, fotos.length);
  return `<h1>${f.existente ? 'Editar la nota' : 'Escribir una nota'}</h1>
    <p class="estado">${f.existente ? 'Los cambios se ven en la web en la próxima actualización. La dirección y la fecha de la nota no cambian.' : 'Pegá el título, la bajada y el cuerpo, sumá las fotos y publicá. Sale en la web con tu firma, tal cual la escribas: no pasa por la IA ni por el verificador.'}</p>
    <p class="problemas">${esc(AVISO_DE_MENORES)}</p>
    ${f.existente ? '<div class="botones"><button type="button" class="boton" data-accion="cancelar-edicion">Dejar de editar</button></div>' : ''}
    ${procesando ? `<p class="est espera">⏳ ${esc(procesando)}</p>` : ''}
    <form id="form-redaccion" novalidate>
      <label for="w-titulo">Título <span class="ayuda" id="w-c-titulo">${String(f.titulo).length} caracteres (conviene hasta ${TITULO_RECOMENDADO})</span></label>
      <input type="text" id="w-titulo" data-campo="titulo" data-donde="nota" maxlength="${MAXIMO_DEL_TITULO + 20}" value="${esc(f.titulo)}" autocomplete="off">
      <label for="w-copete">Bajada (copete)</label>
      <textarea id="w-copete" data-campo="copete" data-donde="nota" rows="3">${esc(f.copete)}</textarea>
      <label for="w-cuerpo">Cuerpo <span class="ayuda" id="w-c-cuerpo">${palabras} palabras${palabras < MINIMO_DE_PALABRAS ? ` (hacen falta ${MINIMO_DE_PALABRAS})` : ''}</span></label>
      <p class="ayuda">Separá los párrafos con una línea en blanco. Para poner una foto entre dos párrafos, dejá el cursor donde la querés y tocá "Insertar foto N aquí" (aparece cuando subís la foto): escribe <strong>[foto 1]</strong> en una línea sola.</p>
      <textarea id="w-cuerpo" class="cuerpo" data-campo="cuerpo" data-donde="nota">${esc(f.cuerpo)}</textarea>
      ${fotos.length ? `<div class="botones">${fotos.map((_, i) => `<button type="button" class="boton" data-accion="insertar-foto" data-n="${i + 1}">Insertar foto ${i + 1} aquí</button>`).join('')}</div>` : ''}
      <label for="w-seccion">Sección</label>
      <select id="w-seccion" data-campo="seccion" data-donde="nota">${seccionesDelPanel().map((s) => `<option ${s === f.seccion ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      <label for="w-firma">Firma (quién la escribe)</label>
      <input type="text" id="w-firma" data-campo="firma" data-donde="nota" maxlength="60" value="${esc(f.firma)}" autocomplete="off">
      <p class="ayuda">Sale como “Por ${esc(autorDeLaFirma(f.firma) || AUTOR_POR_DEFECTO)}”. Queda guardada en este celular para la próxima.</p>

      <h2>Foto de portada</h2>
      <p class="ayuda">La grande de la nota y de la portada. <strong>Ideal: horizontal, 1600 × 900 px (16:9)</strong>; desde 1200 px de ancho se ve bien. Se achica sola en el celular (hasta 1600 px y ~400 KB). Si no ponés una, va la placa de la sección.</p>
      ${f.portada ? htmlDeUnaFoto(f.portada, { esc, donde: 'portada' }) : htmlDeElegirFotos({ esc, donde: 'portada', texto: 'Elegir la foto de portada' })}

      <h2>Fotos dentro de la nota</h2>
      <p class="ayuda">Hasta ${MAXIMO_DE_FOTOS}. <strong>Tamaño: hasta 1200 px de ancho</strong>, enteras (sin recortar); se achican solas. Cada una tiene su botón “Insertar foto N aquí”; sin marca, va al final.</p>
      ${fotos.map((foto, i) => htmlDeUnaFoto(foto, { esc, donde: 'interna', i, n: i + 1 })).join('')}
      ${fotos.length < MAXIMO_DE_FOTOS ? htmlDeElegirFotos({ esc, donde: 'interna', texto: fotos.length ? 'Sumar más fotos' : 'Elegir fotos para adentro de la nota', multiple: true }) : ''}

      <div class="botones">
        <button type="button" class="boton" data-accion="vista-previa-redaccion">Vista previa</button>
        <button type="button" class="boton principal" data-accion="publicar-redaccion">${f.existente ? 'Guardar los cambios' : 'Publicar'}</button>
      </div>
    </form>`;
}

/** La vista previa: tal como saldría (título, bajada, firma, cuerpo con las fotos en su lugar). `ctx`: { esc, chip }. */
export function htmlDeLaVistaPrevia(f, { esc, chip }) {
  const fotos = f.fotos ?? [];
  const parte = partirCuerpo(f.cuerpo, fotos.length);
  const autor = autorDeLaFirma(f.firma) || AUTOR_POR_DEFECTO;
  const figura = (foto) => {
    const leyenda = leyendaDeFoto(foto.epigrafe, foto.credito);
    return `<figure class="foto-previa"><img src="${esc(srcDeFoto(foto))}" alt="${esc(foto.epigrafe ?? '')}">${leyenda ? `<figcaption>${esc(leyenda)}</figcaption>` : ''}</figure>`;
  };
  const cuerpo = [];
  const pendientes = [...parte.fotosEn];
  parte.parrafos.forEach((p, i) => {
    while (pendientes.length && pendientes[0].despuesDe <= i) { const x = pendientes.shift(); if (fotos[x.n - 1]) cuerpo.push(figura(fotos[x.n - 1])); }
    cuerpo.push(`<p>${esc(p)}</p>`);
  });
  for (const x of pendientes) if (fotos[x.n - 1]) cuerpo.push(figura(fotos[x.n - 1]));
  const problemas = problemasDelFormulario(f);
  const avisos = avisosDelFormulario(f);
  return `<button type="button" class="boton" data-accion="seguir-editando">← Seguir editando</button>
    <h1>Vista previa</h1>
    <p class="estado">Así saldría en la web. Todavía no se publicó nada.</p>
    ${problemas.length ? `<div class="problemas"><strong>Antes de publicar:</strong><ul>${problemas.map((p) => `<li>${esc(p.texto)}</li>`).join('')}</ul></div>` : ''}
    ${avisos.length ? `<div class="caja aviso-motivo"><strong>Ojo:</strong><ul>${avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}
    <article class="texto-nota vista-nota">
      <p>${chip(f.seccion)}</p>
      ${f.portada ? `<div class="marco-portada">${figura(f.portada).replace('<figure class="foto-previa">', '<figure class="foto-previa portada">')}</div>` : '<p class="meta">(Sin foto de portada: va la placa de la sección.)</p>'}
      <div class="titulo-previa">${esc(f.titulo)}</div>
      <p class="bajada">${esc(f.copete)}</p>
      <p class="meta">Por <strong>${esc(autor)}</strong></p>
      ${cuerpo.join('')}
      <p class="meta pie-previa">Por ${esc(autor)}, de la redacción de Radar Balcarce</p>
    </article>
    <div class="botones">
      <button type="button" class="boton" data-accion="seguir-editando">← Seguir editando</button>
      <button type="button" class="boton principal" data-accion="publicar-redaccion">${f.existente ? 'Guardar los cambios' : 'Publicar'}</button>
    </div>`;
}

/**
 * "Mis notas publicadas": las de web/data/notas-de-redaccion.json, la más nueva primero. `ctx`: { esc, chip, haceCuanto, base }.
 */
export function htmlDeMisNotas(json, { esc, chip, haceCuanto, base = 'https://radarbalcarce.com' }) {
  const todas = Object.entries(json?.notas ?? {}).filter(([, e]) => e && typeof e === 'object')
    .map(([clave, e]) => ({ clave, e })).sort((a, b) => (Date.parse(b.e.cuando) || 0) - (Date.parse(a.e.cuando) || 0));
  if (!todas.length) return '<h2>Mis notas publicadas</h2><p class="vacio">Todavía no publicaste ninguna desde acá. Cuando la primera salga, la vas a ver en esta lista.</p>';
  const fila = ({ clave, e }) => `<div class="tarjeta fija" style="--franja:var(--s-${esc(COLOR_DE_SECCION[e.seccion] ?? 'pais')})">
      <div>${chip(e.seccion)}<span class="meta">${esc(haceCuanto(e.cuando))}${e.editada ? ` · editada ${esc(haceCuanto(e.editada))}` : ''}</span>${e.retirada ? '<span class="marca mal">retirada</span>' : '<span class="marca">en la web</span>'}</div>
      <div class="titulo">${esc(e.titulo)}</div>
      <span class="meta">Por ${esc(autorDeLaFirma(e.firma))}${e.retirada?.motivo ? ` · retirada: ${esc(e.retirada.motivo)}` : ''}</span>
      <div class="botones">
        ${e.retirada ? '' : `<a class="boton enlace-boton" href="${esc(enlaceDeLaNota(clave, e, base))}" target="_blank" rel="noopener">Abrir en la web ↗</a>`}
        <button type="button" class="boton" data-accion="editar-redaccion" data-clave="${esc(clave)}">Editar</button>
        ${e.retirada
    ? `<button type="button" class="boton" data-accion="reponer-redaccion" data-clave="${esc(clave)}">Volver a publicar</button>`
    : `<button type="button" class="boton peligro" data-accion="retirar-redaccion" data-clave="${esc(clave)}">Retirar</button>`}
      </div></div>`;
  return `<h2>Mis notas publicadas (${todas.length})</h2>${todas.map(fila).join('')}`;
}

/** El color de cada sección (los mismos de app.js). */
const COLOR_DE_SECCION = {
  Balcarce: 'balcarce', Política: 'politica', Policiales: 'policiales', Fútbol: 'futbol', Deportes: 'deportes', Automovilismo: 'automovilismo',
  Agro: 'agro', Economía: 'economia', 'Cultura y agenda': 'cultura', Tecnología: 'tecnologia', Argentina: 'pais', Educación: 'educacion', Salud: 'salud', Ciencia: 'ciencia',
};
