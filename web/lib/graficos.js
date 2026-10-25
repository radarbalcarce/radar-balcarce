// Gráficos propios en SVG, con su tabla equivalente (24/10/2026, regla 323; docs/auditoria-2-0/K-DATOS-E-INFOGRAFIAS-POR-TEMA.md § 1.2).
//
// Funciones puras, sin dependencias y sin React: reciben datos con su fecha y devuelven texto SVG (dibujado con código nuestro, sin imágenes
// de terceros ni librerías) y la tabla HTML que dice lo mismo. Las usa la nota (web/components/bloque-de-datos.js) y pueden usarse en las
// placas (reels/placa.mjs pasa SVG a PNG con resvg: `anidarSvg` mete el dibujo adentro de otro SVG).
//
// Cada función devuelve `null` si el dato no alcanza: sin dato real no hay gráfico (nunca uno vacío o de relleno). Y devuelve
// `{ svg, tabla, alt, ancho, alto, interior }`:
//   · `svg`      el dibujo completo, accesible: role="img", <title> y <desc> (el texto alternativo);
//   · `tabla`    la tabla HTML equivalente (para quien no ve el dibujo, para los buscadores y para los asistentes de IA);
//   · `alt`      el texto alternativo en una oración;
//   · `interior` lo de adentro del <svg>, para `anidarSvg`.
//
// Temas: el dibujo lleva clases (g-texto, g-suave, g-f0…, g-t0…) y, como respaldo, el color puesto en cada atributo. En la página, ESTILO_DE_GRAFICOS
// pinta las clases con variables CSS (claro y oscuro); resvg ignora las clases y usa los atributos, con la paleta que se pida (`tema`: 'claro',
// 'oscuro' o 'css', que es 'claro' en los atributos). Nunca el color solo dice algo: la segunda serie de un gráfico de líneas va con otro trazo.
//
// Sin imports con "@/": las pruebas lo cargan con node pelado.

const NS = 'http://www.w3.org/2000/svg';
const FUENTE = 'Inter, Arial, Helvetica, sans-serif';

/** Los colores de cada tema, con el contraste que pide WCAG para gráficos (3:1) sobre el fondo de cada uno. */
export const PALETAS = {
  claro: {
    texto: '#14161A', suave: '#5B605D', linea: '#E4DFD2', eje: '#9A9D98', fondo: '#FFFFFF', enlace: '#C7381C', series: ['#C7381C', '#16615B', '#3730A3', '#8A6500'],
  },
  oscuro: {
    texto: '#F4F1EA', suave: '#B7BBB6', linea: '#3A3F44', eje: '#6F746F', fondo: '#14161A', enlace: '#F08A6C', series: ['#F08A6C', '#4FB3A9', '#9A94F0', '#E0B043'],
  },
};
const paletaDe = (tema) => PALETAS[tema] ?? PALETAS.claro;

/** Las reglas CSS que pintan las clases del dibujo con variables, claro y oscuro. La página las carga una vez (components/bloque-de-datos.js). */
export const ESTILO_DE_GRAFICOS = (() => {
  const vars = (p) => `--g-texto:${p.texto};--g-suave:${p.suave};--g-linea:${p.linea};--g-eje:${p.eje};--g-fondo:${p.fondo};--g-enlace:${p.enlace};${p.series.map((c, i) => `--g-s${i}:${c};`).join('')}`;
  const clases = [
    '.grafico-svg .g-texto{fill:var(--g-texto)}',
    '.grafico-svg .g-suave{fill:var(--g-suave)}',
    '.grafico-svg .g-linea{stroke:var(--g-linea)}',
    '.grafico-svg .g-eje{stroke:var(--g-eje)}',
    '.grafico-svg .g-fondo{fill:var(--g-fondo)}',
    ...[0, 1, 2, 3].map((i) => `.grafico-svg .g-f${i}{fill:var(--g-s${i})}.grafico-svg .g-t${i}{stroke:var(--g-s${i})}`),
  ].join('\n');
  return `.bloque-de-datos{${vars(PALETAS.claro)}}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .bloque-de-datos{${vars(PALETAS.oscuro)}}}
:root[data-theme="dark"] .bloque-de-datos{${vars(PALETAS.oscuro)}}
${clases}`;
})();

// ------------------------------------------------------------------ lo común

/** Escapa un texto para ponerlo en HTML o en SVG. */
export function esc(texto) {
  return String(texto ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const esNumero = (n) => typeof n === 'number' && Number.isFinite(n);

/** 1540 → "1.540", 1540.5 → "1.540,5", -3.1 → "-3,1" (puntos de miles y coma decimal, igual que el resto del sitio). */
export function numeroAR(n, decimales = 0) {
  if (!esNumero(n)) return '';
  // Se redondea sobre el valor y no con toFixed (que escribe 1540,5 para 1540.55 por cómo se guardan los decimales).
  const factor = 10 ** decimales;
  const redondeado = Math.round(Math.abs(n) * factor) / factor;
  const [entera, dec] = redondeado.toFixed(decimales).split('.');
  const miles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const signo = n < 0 && redondeado !== 0 ? '-' : '';
  return `${signo}${miles}${dec ? `,${dec}` : ''}`;
}

/** Un ancho aproximado en píxeles: el SVG no puede medir el texto, y un rótulo que se sale del dibujo se corta (K § 1.2, `anchoAproximado`). */
export const anchoAproximado = (texto, tamano) => String(texto ?? '').length * tamano * 0.58;

/** Corta un rótulo para que entre en `ancho` píxeles. El texto entero queda en la tabla. */
function ajustar(texto, ancho, tamano) {
  const t = String(texto ?? '');
  if (anchoAproximado(t, tamano) <= ancho) return t;
  const letras = Math.max(1, Math.floor(ancho / (tamano * 0.58)) - 1);
  return `${t.slice(0, letras).trimEnd()}…`;
}

const idSeguro = (id) => String(id ?? 'g').replace(/[^A-Za-z0-9_-]/g, '') || 'g';

/** Parte un texto en renglones que entren en `ancho` píxeles (hasta `maximo`; el último se corta con «…» si todavía sobra). */
export function partirEnRenglones(texto, ancho, tamano, maximo = 3) {
  const palabras = String(texto ?? '').split(/\s+/).filter(Boolean);
  const renglones = [];
  let actual = '';
  for (const w of palabras) {
    const prueba = actual ? `${actual} ${w}` : w;
    if (actual && anchoAproximado(prueba, tamano) > ancho) { renglones.push(actual); actual = w; } else actual = prueba;
  }
  if (actual) renglones.push(actual);
  if (renglones.length > maximo) return [...renglones.slice(0, maximo - 1), ajustar(renglones.slice(maximo - 1).join(' '), ancho, tamano)];
  return renglones.map((r) => ajustar(r, ancho, tamano));
}

/** El <svg> completo, accesible. */
function envolver({ id, ancho, alto, titulo, alt, interior }) {
  const i = idSeguro(id);
  const svg = `<svg xmlns="${NS}" class="grafico-svg" viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}" role="img" aria-labelledby="${i}-t ${i}-d" font-family="${FUENTE}"><title id="${i}-t">${esc(titulo)}</title><desc id="${i}-d">${esc(alt)}</desc>${interior}</svg>`;
  return { svg, interior, ancho, alto, alt };
}

/**
 * Una tabla HTML. `columnas` son los encabezados y `filas` las filas (la primera celda de cada una es el encabezado de fila).
 * Con `titulo`, un <caption> (lo que lee un lector de pantalla antes de la tabla).
 */
export function tablaHtml({ titulo, columnas = [], filas = [], clase = 'g-tabla' }) {
  const cab = columnas.length ? `<thead><tr>${columnas.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>` : '';
  const cuerpo = filas.map((f) => `<tr>${f.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('');
  return `<table class="${esc(clase)}">${titulo ? `<caption>${esc(titulo)}</caption>` : ''}${cab}<tbody>${cuerpo}</tbody></table>`;
}

/** Texto con sus dos formas: clases para la página y color en el atributo para resvg. */
const texto = (x, y, t, { tamano = 14, peso = 400, ancla = 'start', clase = 'g-texto', color }) => `<text x="${x}" y="${y}" font-size="${tamano}" font-weight="${peso}" text-anchor="${ancla}" class="${clase}" fill="${color}">${esc(t)}</text>`;

/** El título y la fuente dibujados en la propia imagen (para las placas y para compartir: viajan con el dibujo). */
function cabeza({ titulo, pie, ancho, p, y0 }) {
  let arriba = '';
  let abajo = '';
  let alto = 0;
  let bajo = 0;
  if (titulo) {
    arriba = texto(12, y0 + 20, ajustar(titulo, ancho - 24, 17), { tamano: 17, peso: 700, color: p.texto });
    alto = 34;
  }
  if (pie) {
    bajo = 26;
    abajo = (y) => texto(12, y + 18, ajustar(pie, ancho - 24, 12), { tamano: 12, clase: 'g-suave', color: p.suave });
  }
  return { arriba, abajo, alto, bajo };
}

// ------------------------------------------------------------------ barras

/**
 * Barras horizontales que parten de cero (una barra engaña si no parte de cero).
 *
 * @param {object} o
 * @param {string} o.titulo      qué dice el gráfico (la conclusión, no el tema): va en el <title>
 * @param {{ etiqueta: string, valor: number, destacada?: boolean }[]} o.items  mínimo 2 con un número real y no negativo
 * @param {(n: number) => string} [o.formato]  cómo se escribe cada valor (por defecto, número argentino)
 * @param {string} [o.tema]      'css' (la página), 'claro' o 'oscuro'
 * @param {number} [o.ancho]     ancho del dibujo (480 en la página; más grande para una placa)
 * @param {string} [o.pie]       "Fuente: … · dato del …" dibujado abajo (opcional: la página lo muestra en HTML)
 * @param {boolean} [o.conTitulo] dibuja también el título en la imagen
 * @param {string[]} [o.columnas] encabezados de la tabla (por defecto "Dato" y "Valor")
 */
export function barrasSvg({
  id = 'barras', titulo, items = [], formato = (n) => numeroAR(n, 0), tema = 'css', ancho = 480, pie = null, conTitulo = false, columnas = ['Dato', 'Valor'],
}) {
  const validos = (items ?? []).filter((x) => x && String(x.etiqueta ?? '').trim() && esNumero(x.valor) && x.valor >= 0);
  if (validos.length < 2) return null;
  const p = paletaDe(tema);
  const tamano = 14;
  const fila = 34;
  const valores = validos.map((x) => formato(x.valor));
  const anchoEtiquetas = Math.min(ancho * 0.45, Math.max(...validos.map((x) => anchoAproximado(x.etiqueta, tamano))) + 8);
  const anchoValores = Math.max(...valores.map((v) => anchoAproximado(v, tamano))) + 10;
  const x0 = 12 + anchoEtiquetas;
  const largoMaximo = Math.max(20, ancho - 12 - x0 - anchoValores);
  const mayor = Math.max(...validos.map((x) => x.valor));
  const c = cabeza({ titulo: conTitulo ? titulo : null, pie, ancho, p, y0: 0 });
  const alto = c.alto + validos.length * fila + 8 + c.bajo;
  let filas = '';
  validos.forEach((x, i) => {
    const y = c.alto + 4 + i * fila;
    const largo = mayor > 0 ? Math.round((x.valor / mayor) * largoMaximo * 10) / 10 : 0;
    const k = x.destacada ? 0 : 1;
    // La barra destacada (la del dato de la nota) lleva el color de la serie 0; las demás, el de la serie 1.
    filas += texto(12, y + 21, ajustar(x.etiqueta, anchoEtiquetas, tamano), { tamano, clase: 'g-texto', color: p.texto });
    if (largo > 0) filas += `<rect x="${x0}" y="${y + 5}" width="${largo}" height="${fila - 12}" rx="3" class="g-f${k}" fill="${p.series[k]}"/>`;
    filas += texto(x0 + largo + 6, y + 21, valores[i], { tamano, peso: 700, clase: 'g-texto', color: p.texto });
  });
  filas += `<line x1="${x0}" y1="${c.alto + 2}" x2="${x0}" y2="${c.alto + 6 + validos.length * fila}" stroke-width="1" class="g-eje" stroke="${p.eje}"/>`;
  const pieDibujado = c.bajo ? c.abajo(c.alto + validos.length * fila + 8) : '';
  const alt = `${titulo}. Barras: ${validos.map((x, i) => `${x.etiqueta}, ${valores[i]}`).join('; ')}.`;
  const g = envolver({ id, ancho, alto, titulo, alt, interior: c.arriba + filas + pieDibujado });
  return { ...g, tabla: tablaHtml({ titulo, columnas, filas: validos.map((x, i) => [x.etiqueta, valores[i]]) }) };
}

// ------------------------------------------------------------------ líneas

/** Cuántos puntos hacen falta para dibujar una línea: con menos no hay "tendencia" que mostrar. */
export const PUNTOS_MINIMOS_DE_UNA_LINEA = 3;

/**
 * Líneas simples sobre un eje de días (o de lo que sea) en orden. Una o dos series. El último punto de cada serie va marcado y con su valor.
 * El eje vertical NO parte de cero (en una línea importa el cambio, no el nivel): se rotula con sus números.
 *
 * @param {object} o
 * @param {string[]} o.etiquetas  el eje horizontal, en orden ("2026-09-25", o ya escrito "25/09")
 * @param {{ nombre: string, valores: (number|null)[] }[]} o.series  cada una con un valor por etiqueta (null = sin dato ese día). Una serie con
 *   menos de PUNTOS_MINIMOS_DE_UNA_LINEA puntos reales no se dibuja; si no queda ninguna, devuelve null.
 */
export function lineaSvg({
  id = 'linea', titulo, etiquetas = [], series = [], formato = (n) => numeroAR(n, 0), tema = 'css', ancho = 480, alto = 250, pie = null, conTitulo = false,
  columnaX = 'Fecha',
}) {
  const buenas = (series ?? [])
    .slice(0, 2)
    .map((s) => ({ nombre: String(s?.nombre ?? '').trim(), valores: (etiquetas ?? []).map((_, i) => (esNumero(s?.valores?.[i]) ? s.valores[i] : null)) }))
    .filter((s) => s.nombre && s.valores.filter((v) => v !== null).length >= PUNTOS_MINIMOS_DE_UNA_LINEA);
  if (!buenas.length) return null;
  const p = paletaDe(tema);
  const tam = 14;
  const todos = buenas.flatMap((s) => s.valores.filter((v) => v !== null));
  let menor = Math.min(...todos);
  let mayor = Math.max(...todos);
  if (mayor === menor) { menor -= 1; mayor += 1; }
  const aire = (mayor - menor) * 0.12;
  menor -= aire; mayor += aire;
  const rotulosY = [menor + aire, (menor + mayor) / 2, mayor - aire].map((v) => formato(v));
  const izq = Math.max(...rotulosY.map((r) => anchoAproximado(r, tam))) + 14;
  const ultimos = buenas.map((s) => formato(s.valores.findLast((v) => v !== null)));
  // A la derecha se deja lugar para el valor final de cada serie: dibujado sobre la línea se pisaba con ella.
  const der = Math.max(...ultimos.map((r) => anchoAproximado(r, tam))) + 22;
  const c = cabeza({ titulo: conTitulo ? titulo : null, pie, ancho, p, y0: 0 });
  const leyenda = buenas.length > 1 ? 22 : 0;
  const arriba = c.alto + leyenda + 12;
  const abajo = alto - c.bajo - 26;
  const n = etiquetas.length;
  const X = (i) => izq + (n <= 1 ? 0 : (i / (n - 1)) * (ancho - izq - der));
  const Y = (v) => arriba + (1 - (v - menor) / (mayor - menor)) * (abajo - arriba);
  let dibujo = c.arriba;
  // Las tres líneas guía y sus números.
  [menor + aire, (menor + mayor) / 2, mayor - aire].forEach((v, i) => {
    dibujo += `<line x1="${izq}" y1="${Y(v).toFixed(1)}" x2="${ancho - der}" y2="${Y(v).toFixed(1)}" stroke-width="1" class="g-linea" stroke="${p.linea}"/>`;
    dibujo += texto(izq - 6, Y(v) + 4, rotulosY[i], { tamano: tam, ancla: 'end', clase: 'g-suave', color: p.suave });
  });
  // Los días del eje: el primero, el último y el del medio si hay de sobra.
  const marcas = n >= 7 ? [0, Math.floor((n - 1) / 2), n - 1] : [0, n - 1];
  for (const i of new Set(marcas)) {
    const ancla = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
    dibujo += texto(X(i), abajo + 20, etiquetas[i], { tamano: tam, ancla, clase: 'g-suave', color: p.suave });
  }
  let ultimoRotulo = -100;
  let ultimoPunto = 0;
  buenas.forEach((s, k) => {
    // Los huecos (null) cortan la línea en vez de unir lo que no se midió.
    let tramo = [];
    const tramos = [];
    s.valores.forEach((v, i) => {
      if (v === null) { if (tramo.length) tramos.push(tramo); tramo = []; } else tramo.push(`${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
    });
    if (tramo.length) tramos.push(tramo);
    const trazo = k === 1 ? ' stroke-dasharray="7 4"' : '';
    for (const t of tramos) {
      if (t.length > 1) dibujo += `<polyline points="${t.join(' ')}" fill="none" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" class="g-t${k}" stroke="${p.series[k]}"${trazo}/>`;
    }
    const ultimo = s.valores.reduce((a, v, i) => (v === null ? a : i), -1);
    const px = X(ultimo);
    const py = Y(s.valores[ultimo]);
    dibujo += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4.5" class="g-f${k}" fill="${p.series[k]}"/>`;
    // El valor final, a la derecha del punto; si las dos series terminan casi a la misma altura, el segundo va más abajo para no pisarse.
    let ry = py + 4;
    if (k === 1 && Math.abs(ry - ultimoRotulo) < 15) ry = ultimoRotulo + (py >= ultimoPunto ? 15 : -15);
    ultimoRotulo = ry;
    ultimoPunto = py;
    dibujo += texto(px + 9, ry, ultimos[k], { tamano: tam, peso: 700, ancla: 'start', clase: 'g-texto', color: p.texto });
  });
  if (leyenda) {
    let x = izq;
    buenas.forEach((s, k) => {
      dibujo += `<line x1="${x}" y1="${c.alto + 11}" x2="${x + 22}" y2="${c.alto + 11}" stroke-width="2.5" class="g-t${k}" stroke="${p.series[k]}"${k === 1 ? ' stroke-dasharray="7 4"' : ''}/>`;
      dibujo += texto(x + 28, c.alto + 15, s.nombre, { tamano: tam, clase: 'g-texto', color: p.texto });
      x += 28 + anchoAproximado(s.nombre, tam) + 18;
    });
  }
  if (c.bajo) dibujo += c.abajo(alto - c.bajo);
  const describir = (s) => {
    const idx = s.valores.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0);
    const a = idx[0];
    const z = idx.at(-1);
    return `${s.nombre}: de ${formato(s.valores[a])} el ${etiquetas[a]} a ${formato(s.valores[z])} el ${etiquetas[z]}`;
  };
  const alt = `${titulo}. Líneas: ${buenas.map(describir).join('; ')}.`;
  const g = envolver({ id, ancho, alto, titulo, alt, interior: dibujo });
  const tabla = tablaHtml({
    titulo,
    columnas: [columnaX, ...buenas.map((s) => s.nombre)],
    filas: etiquetas.map((e, i) => [e, ...buenas.map((s) => (s.valores[i] === null ? '–' : formato(s.valores[i])))]).filter((f) => f.slice(1).some((x) => x !== '–')),
  });
  return { ...g, tabla };
}

// ------------------------------------------------------------------ ficha

/**
 * Una ficha de pares "dato: valor" (una tabla de pocas filas, con su dibujo para las placas).
 * @param {{ etiqueta: string, valor: string }[]} o.filas  las que tengan etiqueta y valor; con menos de 1, null
 */
export function fichaDeTabla({
  id = 'ficha', titulo, filas = [], tema = 'css', ancho = 480, pie = null, conTitulo = false, columnas = ['Dato', 'Valor'],
}) {
  const validas = (filas ?? []).filter((f) => f && String(f.etiqueta ?? '').trim() && String(f.valor ?? '').trim());
  if (!validas.length) return null;
  const p = paletaDe(tema);
  const tam = 14;
  const fila = 30;
  const c = cabeza({ titulo: conTitulo ? titulo : null, pie, ancho, p, y0: 0 });
  const anchoEtiquetas = Math.min(ancho * 0.42, Math.max(...validas.map((f) => anchoAproximado(f.etiqueta, tam))) + 8);
  const anchoValores = ancho - 24 - anchoEtiquetas - 8;
  // El valor puede ocupar hasta tres renglones (una frase como «largó 15º y abandonó tras 29 vueltas» no entra en uno): la fila crece.
  const partidas = validas.map((f) => partirEnRenglones(f.valor, anchoValores, tam, 3));
  const altos = partidas.map((r) => Math.max(fila, r.length * 18 + 12));
  const alto = c.alto + altos.reduce((a, b) => a + b, 0) + 8 + c.bajo;
  let dibujo = c.arriba;
  let y = c.alto + 4;
  validas.forEach((f, i) => {
    dibujo += `<line x1="12" y1="${y + altos[i]}" x2="${ancho - 12}" y2="${y + altos[i]}" stroke-width="1" class="g-linea" stroke="${p.linea}"/>`;
    dibujo += texto(12, y + 20, ajustar(f.etiqueta, anchoEtiquetas, tam), { tamano: tam, clase: 'g-suave', color: p.suave });
    partidas[i].forEach((r, j) => { dibujo += texto(12 + anchoEtiquetas + 8, y + 20 + j * 18, r, { tamano: tam, peso: 700, clase: 'g-texto', color: p.texto }); });
    y += altos[i];
  });
  if (c.bajo) dibujo += c.abajo(y + 4);
  const alt = `${titulo}. ${validas.map((f) => `${f.etiqueta}: ${f.valor}`).join('. ')}.`;
  const g = envolver({ id, ancho, alto, titulo, alt, interior: dibujo });
  return { ...g, tabla: tablaHtml({ titulo, columnas, filas: validas.map((f) => [f.etiqueta, f.valor]) }) };
}

// ------------------------------------------------------------------ para las placas

/**
 * Mete un dibujo adentro de otro SVG (una placa de reels/placa.mjs): un <svg> anidado con su posición y su ancho; el alto sale de la proporción.
 * resvg lo dibuja como cualquier grupo. Devuelve { svg, alto } con `alto` el que ocupa, para apilar lo que sigue.
 */
export function anidarSvg(grafico, { x = 0, y = 0, ancho = grafico?.ancho } = {}) {
  if (!grafico?.interior) return { svg: '', alto: 0 };
  const alto = Math.round((grafico.alto / grafico.ancho) * ancho);
  return {
    svg: `<svg x="${x}" y="${y}" width="${ancho}" height="${alto}" viewBox="0 0 ${grafico.ancho} ${grafico.alto}" font-family="${FUENTE}">${grafico.interior}</svg>`,
    alto,
  };
}
