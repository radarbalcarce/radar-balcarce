// El gráfico propio de una nota (Hernán, 19/11): barras horizontales o una línea, en SVG dibujado acá (sin librerías ni imágenes que bajar), con la estética de Radar:
// papel, tinta, regla del color de la sección, título en serif, la fuente y la firma bicolor «Radar Balcarce» al pie. Sale de `ficha.grafico` (forma y reglas: v3/nucleo/redactar/grafico.mjs).
// El SVG lleva todos los colores escritos (no variables CSS): así se puede bajar como PNG y compartir tal cual, y se ve igual en modo claro y oscuro (es una tarjeta de papel).
// Accesible: <figure>, el SVG con role="img" y aria-label con los datos, y una tabla con los mismos datos para lectores de pantalla. Descargar y Compartir necesitan JavaScript (sin él, no se ven).
// Reglas: v3/sitio/REGLAS.md § 17. Formato de imágenes: docs/3-0/FORMATO-DE-IMAGENES.md.
import { esc } from '../util.mjs';
import { normalizarGrafico } from '../../nucleo/redactar/grafico.mjs';

/** Los colores de cada sección, los mismos de base.mjs (`--s-<ranura>`); una prueba controla que coincidan. */
export const COLOR_DE_SECCION = {
  Balcarce: '#B91C1C', Política: '#3730A3', Policiales: '#831843', Educación: '#1D4BE0', Salud: '#004E5C', Fútbol: '#7C3AED', Deportes: '#0F766E',
  Automovilismo: '#A84D08', Agro: '#5A6B0A', Economía: '#8A6500', Ciencia: '#772E9E', Cultura: '#9D2C8F', Tecnología: '#0B6FB8', Argentina: '#4B5563',
};
const ROJO = '#C7381C';
const TINTA = '#14161A';
const PAPEL = '#FFFDF8';
const LINEA = '#E4DFD2';
const SUAVE = '#5C6068';
const SERIF = '"Source Serif 4",Georgia,"Times New Roman",serif';
const SANS = 'Inter,"Helvetica Neue",Arial,sans-serif';

const ANCHO = 400;
const P = 22; // margen lateral
const f = (n) => String(Math.round(n * 10) / 10);

/** El gráfico de la ficha de una nota, ya revisado, o null. Nunca tira: una ficha rara simplemente no dibuja nada. */
export function graficoDeNota(n) {
  const r = normalizarGrafico(n?.ficha?.grafico);
  return r.grafico ?? null;
}

/** 2350000 → «2.350.000», 12.5 → «12,5» (punto de miles, coma decimal). */
export function numeroAR(v) {
  const negativo = v < 0;
  const a = Math.abs(v);
  const [ent, dec] = (Math.round(a * 100) / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '').split('.');
  const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '−' : ''}${miles}${dec ? `,${dec}` : ''}`;
}

/** El valor con su unidad: «$ 60.000» (los signos de plata van delante), «12,5 %» y el resto detrás («3.200 hectáreas»). */
export function valorConUnidad(v, unidad) {
  const u = String(unidad ?? '').trim();
  const n = numeroAR(v);
  if (!u) return n;
  if (/^(\$|us\$|u\$s|ar\$)$/i.test(u)) return `${u} ${n}`;
  if (u === '%') return `${n} %`;
  return `${n} ${u}`;
}

const cortar = (t, max) => (t.length <= max ? t : `${t.slice(0, Math.max(1, max - 1)).replace(/\s+\S*$/, (m) => (m.length > max / 2 ? '' : m)).trimEnd()}…`);

/** Parte un texto en líneas de hasta `max` letras sin cortar palabras (la última lleva «…» si no entra). */
export function partirEnLineas(texto, max, lineasMax) {
  const palabras = String(texto).split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (prueba.length <= max || !actual) actual = prueba; else { lineas.push(actual); actual = p; }
  }
  if (actual) lineas.push(actual);
  if (lineas.length > lineasMax) {
    const quedan = lineas.slice(0, lineasMax);
    quedan[lineasMax - 1] = cortar(`${quedan[lineasMax - 1]} ${lineas.slice(lineasMax).join(' ')}`, max);
    return quedan;
  }
  return lineas.map((l) => (l.length > max ? cortar(l, max) : l));
}

const texto = (x, y, t, { size = 14, peso = 400, color = TINTA, ancla = 'start', familia = SANS } = {}) => `<text x="${f(x)}" y="${f(y)}" font-family='${familia}' font-size="${size}" font-weight="${peso}" fill="${color}" text-anchor="${ancla}">${esc(t)}</text>`;

/** El resumen en palabras (aria-label y descripción): «Título. Gráfico de barras. A: $ 1; B: $ 2». */
export function resumenDelGrafico(g) {
  const forma = g.tipo === 'linea' ? 'Gráfico de línea' : 'Gráfico de barras';
  return `${g.titulo}. ${forma} con ${g.datos.length} datos. ${g.datos.map((d) => `${d.etiqueta}: ${valorConUnidad(d.valor, g.unidad)}`).join('; ')}. Fuente: ${g.fuente}.`;
}

function cuerpoDeBarras(g, y0, color) {
  const max = Math.max(...g.datos.map((d) => d.valor), 1e-9);
  const reservado = 104; // el lugar del número, a la derecha de la barra más larga
  const anchoMax = ANCHO - 2 * P - reservado;
  let y = y0;
  let svg = '';
  for (const d of g.datos) {
    const w = d.valor <= 0 ? 0 : Math.max(3, (d.valor / max) * anchoMax);
    svg += texto(P, y + 13, d.etiqueta, { size: 13.5, color: TINTA });
    svg += `<rect x="${P}" y="${f(y + 20)}" width="${f(anchoMax + 4)}" height="16" rx="3" fill="#F1EDE0"/>`;
    if (w > 0) svg += `<rect x="${P}" y="${f(y + 20)}" width="${f(w)}" height="16" rx="3" fill="${color}"/>`;
    svg += texto(P + w + 8 > ANCHO - P - 60 ? ANCHO - P : P + w + 8, y + 33, valorConUnidad(d.valor, g.unidad), { size: 13.5, peso: 700, color: TINTA, ancla: P + w + 8 > ANCHO - P - 60 ? 'end' : 'start' });
    y += 46;
  }
  return { svg, alto: y - y0 };
}

function cuerpoDeLinea(g, y0, color) {
  const n = g.datos.length;
  const alto = 150;
  const x0 = P + 14;
  const x1 = ANCHO - P - 14;
  const vals = g.datos.map((d) => d.valor);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const rango = mx - mn || 1;
  const lo = mn >= 0 ? Math.max(0, mn - rango * 0.3) : mn - rango * 0.15;
  const hi = mx + rango * 0.2;
  const yTop = y0 + 22;
  const x = (i) => x0 + ((x1 - x0) * i) / (n - 1);
  const y = (v) => yTop + (alto - 22) * (1 - (v - lo) / (hi - lo));
  let svg = '';
  for (let k = 0; k <= 3; k++) { const yy = yTop + ((alto - 22) * k) / 3; svg += `<line x1="${P}" x2="${ANCHO - P}" y1="${f(yy)}" y2="${f(yy)}" stroke="${LINEA}" stroke-width="1"/>`; }
  svg += `<polyline points="${g.datos.map((d, i) => `${f(x(i))},${f(y(d.valor))}`).join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
  const iMax = vals.indexOf(mx);
  const iMin = vals.indexOf(mn);
  const conValor = (i) => n <= 4 || i === 0 || i === n - 1 || i === iMax || i === iMin;
  g.datos.forEach((d, i) => {
    svg += `<circle cx="${f(x(i))}" cy="${f(y(d.valor))}" r="4.5" fill="${PAPEL}" stroke="${color}" stroke-width="2.5"/>`;
    if (conValor(i)) {
      const ancla = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
      const cx = i === 0 ? Math.max(P, x(i) - 6) : i === n - 1 ? Math.min(ANCHO - P, x(i) + 6) : x(i);
      svg += texto(cx, y(d.valor) - (i === 0 ? 16 : 10), valorConUnidad(d.valor, g.unidad), { size: 12.5, peso: 700, ancla });
    }
  });
  const cadaCuanto = n > 6 ? 2 : 1;
  g.datos.forEach((d, i) => {
    if (i % cadaCuanto && i !== n - 1) return;
    const ancla = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
    const cx = i === 0 ? P : i === n - 1 ? ANCHO - P : x(i);
    svg += texto(cx, y0 + alto + 14, cortar(d.etiqueta, n > 5 ? 9 : 14), { size: 12, color: SUAVE, ancla });
  });
  return { svg, alto: alto + 22 };
}

/** El SVG completo (400 de ancho; el alto sale de los datos). `seccion` elige el color de la regla y de las barras. */
export function graficoSvg(g, { seccion = 'Balcarce' } = {}) {
  const color = COLOR_DE_SECCION[seccion] ?? ROJO;
  const titulo = partirEnLineas(g.titulo, 34, 3);
  let y = 30;
  let cab = '';
  for (const l of titulo) { cab += texto(P + 6, y, l, { size: 19, peso: 800, familia: SERIF }); y += 24; }
  y += 6;
  const cuerpo = g.tipo === 'linea' ? cuerpoDeLinea(g, y, color) : cuerpoDeBarras(g, y, color);
  y += cuerpo.alto + 8;
  const fuente = partirEnLineas(`Fuente: ${g.fuente}`, 62, 2);
  let pie = `<line x1="${P}" x2="${ANCHO - P}" y1="${f(y)}" y2="${f(y)}" stroke="${LINEA}" stroke-width="1"/>`;
  y += 18;
  for (const l of fuente) { pie += texto(P, y, l, { size: 11.5, color: SUAVE }); y += 15; }
  y += 6;
  pie += `<text x="${ANCHO - P}" y="${f(y)}" font-family='${SERIF}' font-size="15" font-weight="800" fill="${TINTA}" text-anchor="end">Radar<tspan fill="${ROJO}">Balcarce</tspan></text>`;
  const alto = y + 16;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO} ${f(alto)}" width="${ANCHO}" height="${f(alto)}" role="img" aria-label="${esc(resumenDelGrafico(g))}" class="gn-svg">`
    + `<title>${esc(g.titulo)}</title>`
    + `<rect x="0.5" y="0.5" width="${ANCHO - 1}" height="${f(alto - 1)}" rx="10" fill="${PAPEL}" stroke="${LINEA}"/>`
    + `<rect x="0" y="0" width="7" height="${f(alto)}" rx="3" fill="${color}"/>`
    + cab + cuerpo.svg + pie + '</svg>';
}

export const ESTILOS_GRAFICO_NOTA = '.gn{margin:22px 0}.gn .gn-svg{display:block;width:100%;max-width:520px;height:auto;border-radius:10px}.gn-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.gn .graf-acciones{margin-top:8px}';

// Baja el gráfico como PNG (3 veces el tamaño, en un canvas) y lo comparte como archivo si el celular puede. Sin JavaScript no se ven los botones. No toca nada de afuera.
const GUION = "(function(){function png(f,cb){var s=f.querySelector('svg');if(!s)return;var img=new Image();img.onload=function(){var w=s.viewBox.baseVal.width,h=s.viewBox.baseVal.height,k=3,c=document.createElement('canvas');c.width=w*k;c.height=h*k;c.getContext('2d').drawImage(img,0,0,c.width,c.height);c.toBlob(cb,'image/png')};img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(s))}var fs=document.querySelectorAll('.gn');for(var i=0;i<fs.length;i++)(function(f){var d=f.querySelector('.gn-bajar'),c=f.querySelector('.gn-comp');if(d){d.hidden=false;d.addEventListener('click',function(){png(f,function(b){if(!b)return;var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=d.getAttribute('data-nombre')||'grafico-radar-balcarce.png';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1500)})})}if(c&&navigator.canShare&&navigator.share){c.hidden=false;c.addEventListener('click',function(){png(f,function(b){if(!b)return;var fl=new File([b],'grafico-radar-balcarce.png',{type:'image/png'});if(navigator.canShare({files:[fl]}))navigator.share({files:[fl],title:c.getAttribute('data-titulo')||'Gráfico de Radar Balcarce'}).catch(function(){})})})}})(fs[i])})()";

const nombreDeArchivo = (g) => `radarbalcarce-grafico-${g.titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'nota'}.png`;

/** La tabla con los mismos datos, sólo para lectores de pantalla y buscadores (fuera de la vista). */
function tablaHtml(g) {
  return `<table class="gn-sr"><caption>${esc(g.titulo)} (fuente: ${esc(g.fuente)})</caption><thead><tr><th scope="col">Dato</th><th scope="col">Valor</th></tr></thead><tbody>${g.datos.map((d) => `<tr><th scope="row">${esc(d.etiqueta)}</th><td>${esc(valorConUnidad(d.valor, g.unidad))}</td></tr>`).join('')}</tbody></table>`;
}

/**
 * El bloque para la nota: <figure> con el SVG, la tabla oculta y, si `acciones`, los botones Descargar y Compartir (más el guion, una sola vez por página). '' si no hay gráfico válido.
 * `seccion`: la de la nota (color). `conEstilos`: false si la página ya trae ESTILOS_GRAFICO_NOTA.
 */
export function graficoHtml(g, { seccion = 'Balcarce', acciones = true, conEstilos = true } = {}) {
  const r = normalizarGrafico(g);
  if (!r.grafico) return '';
  const graf = r.grafico;
  const botones = acciones
    ? `<div class="graf-acciones"><button type="button" class="gn-bajar" data-nombre="${esc(nombreDeArchivo(graf))}" aria-label="Descargar el gráfico como imagen" hidden>Descargar el gráfico</button><button type="button" class="gn-comp" data-titulo="${esc(graf.titulo)}" hidden>Compartir</button></div>`
    : '';
  return `<figure class="gn">${graficoSvg(graf, { seccion })}<figcaption class="gn-sr">${esc(resumenDelGrafico(graf))}</figcaption>${tablaHtml(graf)}${botones}</figure>${conEstilos ? `<style>${ESTILOS_GRAFICO_NOTA}</style>` : ''}${acciones ? `<script>${GUION}</script>` : ''}`;
}
