// La nota diaria de «Un día como hoy» (la arma v3/redes/efemerides/nota.mjs; se reconoce por `ficha.efemerides.hechos`): una línea del tiempo que se anima y, debajo, las historias
// del día tratadas por igual (año grande, título, texto, tres datos y la foto con su crédito, o la placa del medio). Colores del sitio; sin JavaScript (sólo CSS) y quieta si el
// aparato pide menos movimiento. Las dimensiones de cada foto van en el HTML para que la página no salte al cargar.
import { esc, urlSegura } from '../util.mjs';

export const esEfemerides = (n) => Array.isArray(n?.ficha?.efemerides?.hechos) && n.ficha.efemerides.hechos.length > 0;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const diaLargo = (dia) => { const d = new Date(`${dia}T12:00:00Z`); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; };

/** Los años de las marcas del eje: del comienzo de la década del más viejo hasta el año de hoy. */
export function ejeDelTiempo(anios, anioActual) {
  const desde = Math.floor(Math.min(...anios) / 10) * 10;
  const total = Math.max(1, anioActual - desde);
  const pos = (a) => Math.round(((a - desde) / total) * 1000) / 10;
  const paso = Math.max(5, Math.ceil(total / 4 / 5) * 5);
  const marcas = [];
  for (let a = desde; a < anioActual - paso / 2; a += paso) marcas.push(a);
  return { desde, pos, marcas };
}

function hechoHtml(h, i) {
  const foto = h.foto && urlSegura(h.foto.url) ? h.foto : null;
  const medidas = foto?.ancho && foto?.alto ? ` width="${Number(foto.ancho)}" height="${Number(foto.alto)}"` : '';
  const imagen = foto
    ? `<img class="ef-img" src="${esc(foto.url)}" alt="${esc(foto.alt || h.titulo)}"${medidas} ${i === 0 ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}>`
    : `<div class="ef-placa" aria-hidden="true"><b>${esc(h.anio)}</b><span>Radar Balcarce</span></div>`;
  const pie = foto ? esc(foto.credito ? `Foto: ${foto.credito}` : '') : 'Sin una foto libre que sirva, va la placa del medio.';
  const datos = (h.datos ?? []).slice(0, 3).map((d) => `<div class="ef-dato"><b>${esc(d.b)}</b><span>${esc(d.s)}</span></div>`).join('');
  return `<article class="ef-hecho" style="--i:${i}">${imagen}${pie ? `<p class="ef-pie">${pie}</p>` : ''}<div class="ef-cuerpo"><p class="ef-anio">${esc(h.anio)}</p><h2>${esc(h.titulo)}</h2>${h.texto ? `<p>${esc(h.texto)}</p>` : ''}${datos ? `<div class="ef-datos">${datos}</div>` : ''}</div></article>`;
}

/** El cuerpo de la nota de efemérides (reemplaza al de párrafos). Lo único que pide: `n.ficha.efemerides = { dia, hechos: [{ anio, titulo, texto, datos, foto }] }`. */
export function efemeridesHtml(n) {
  const { dia, hechos } = n.ficha.efemerides;
  const anioActual = Number(String(dia).slice(0, 4)) || new Date().getUTCFullYear();
  const orden = [...hechos].sort((a, b) => b.anio - a.anio);
  const eje = ejeDelTiempo(orden.map((h) => h.anio), anioActual);
  const puntos = orden.map((h, i) => `<span class="ef-pt${i % 2 ? ' ef-abajo' : ''}" style="left:${eje.pos(h.anio)}%;--d:${(1.2 + (i * 4) / Math.max(1, orden.length)).toFixed(1)}s"><b>${esc(h.anio)}</b></span>`).join('');
  const ticks = [...eje.marcas.map((a) => `<span>${a}</span>`), '<span>HOY</span>'].join('');
  return `<section class="ef-linea" aria-label="Línea del tiempo de las historias"><h2 class="ef-kicker">Un día como hoy</h2><p class="ef-dia">${esc(diaLargo(dia))}</p><div class="ef-eje" aria-hidden="true"><i class="ef-base"></i><i class="ef-prog"></i><i class="ef-marca"></i>${puntos}</div><div class="ef-ticks" aria-hidden="true">${ticks}</div></section>${orden.map(hechoHtml).join('')}`;
}

export const ESTILOS_EFEMERIDES = `
.ef-linea{background:var(--papel);border:1px solid var(--linea);border-radius:14px;padding:20px 18px 16px;margin:0 0 22px;overflow:hidden}
.ef-kicker{margin:0 0 4px;font:800 13px var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--rojo)}
.ef-dia{margin:0 0 16px;font:900 clamp(24px,5vw,30px)/1.1 var(--serif);color:var(--tinta)}
.ef-eje{position:relative;height:104px;margin:0 10px}
.ef-base,.ef-prog{position:absolute;left:0;top:50px;height:6px;border-radius:3px}
.ef-base{right:0;background:var(--linea)}
.ef-prog{width:0;background:var(--rojo);animation:ef-crece 5s ease-out .3s forwards}
.ef-marca{position:absolute;top:36px;left:0;width:32px;height:32px;margin-left:-16px;border-radius:50%;background:var(--tinta);border:5px solid var(--papel);animation:ef-viaja 5s ease-out .3s forwards}
.ef-pt{position:absolute;top:44px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:#C9C2B1;opacity:0;animation:ef-aparece .5s var(--d) forwards}
.ef-pt b{position:absolute;top:-28px;left:50%;transform:translateX(-50%);font:700 15px var(--sans);color:var(--tinta);white-space:nowrap}
.ef-abajo b{top:26px}
.ef-ticks{display:flex;justify-content:space-between;margin:8px 10px 0;font:600 13px var(--sans);color:var(--suave)}
.ef-hecho{background:var(--papel);border:1px solid var(--linea);border-radius:14px;margin:0 0 20px;overflow:hidden;opacity:0;transform:translateY(12px);animation:ef-sube .6s ease-out calc(.3s + var(--i) * .25s) forwards}
.ef-img{display:block;width:100%;height:auto;max-height:340px;object-fit:cover}
.ef-placa{display:flex;flex-direction:column;align-items:center;justify-content:center;height:190px;background:var(--tinta);color:#fff}
.ef-placa b{font:900 64px/1 var(--serif)}
.ef-placa span{font:700 14px var(--sans);letter-spacing:.14em;text-transform:uppercase}
.ef-pie{margin:0;padding:8px 18px 0;font-size:12.5px;color:var(--suave)}
.ef-cuerpo{padding:14px 18px 18px}
.ef-anio{margin:0;font:900 clamp(48px,12vw,64px)/1 var(--serif);color:var(--rojo)}
.ef-cuerpo h2{margin:6px 0 10px;font:900 clamp(22px,5vw,28px)/1.15 var(--serif);color:var(--tinta)}
.ef-cuerpo p{margin:0 0 12px}
.ef-datos{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:12px 0 0}
.ef-dato{padding:10px 3px;border:1px solid var(--linea);border-radius:10px;background:var(--crema);text-align:center}
.ef-dato b{display:block;font:900 clamp(14px,3.9vw,21px)/1.15 var(--serif);color:var(--tinta);overflow-wrap:normal;word-break:normal}
.ef-dato span{font-size:12.5px;color:var(--suave)}
@keyframes ef-crece{to{width:100%}}@keyframes ef-viaja{to{left:100%}}@keyframes ef-aparece{to{opacity:1;background:var(--rojo)}}@keyframes ef-sube{to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.ef-prog{animation:none;width:100%}.ef-marca{animation:none;left:100%}.ef-pt{animation:none;opacity:1;background:var(--rojo)}.ef-hecho{animation:none;opacity:1;transform:none}}
`;
