// La pestaña "Números" del panel del celular (1/10/2026): cuánta gente lee,
// qué lee, a qué hora, de dónde llega, y cómo crecen las redes. Todo sale de
// archivos que ya están en el repositorio y que arma la nube sola:
//
//   web/data/estadisticas.json   `dias` (el detalle de la web día por día) y `puntos` (las mediciones de las 9 y las 21)
//   web/data/notas-por-dia.json  cuántas notas se publicaron por día y sección
//   web/data/estadistica-seleccion.json  cómo cae la selección: qué llega, qué sale y por qué no sale el resto (regla 260)
//   web/data/portada.json y archivo.json   qué es cada nota (sección, medios, de acá o de afuera)
//   web/data/redes.json          lo publicado en Facebook e Instagram
//
// Sin nada del DOM ni de la red: son funciones que reciben los datos y
// devuelven números o HTML (como el resto del panel, se prueba con Node:
// pruebas/numeros-panel.test.mjs). Sólo números agregados, nunca quién entró.

export const RANGOS = [7, 14, 30];

const COLOR = {
  Balcarce: 'balcarce', Política: 'politica', Policiales: 'policiales', Fútbol: 'futbol', Deportes: 'deportes', Automovilismo: 'automovilismo',
  Agro: 'agro', Economía: 'economia', 'Cultura y agenda': 'cultura', Tecnología: 'tecnologia', Argentina: 'pais',
  Educación: 'educacion', Salud: 'salud', Ciencia: 'ciencia',
};
const DIA_MS = 86400e3;
const NOMBRES_DE_DIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

// ------------------------------------------------------------------ fechas

/** El día de Balcarce como AAAA-MM-DD (Balcarce no cambia de hora: siempre UTC-3). */
export function diaDeBalcarce(fecha = new Date()) {
  return new Date(new Date(fecha).getTime() - 3 * 3600e3).toISOString().slice(0, 10);
}

/** Los últimos `n` días terminados en `hoy`, del más viejo al de hoy. */
export function ultimosDias(hoy, n) {
  const fin = Date.parse(`${hoy}T12:00:00Z`);
  return Array.from({ length: n }, (_, i) => new Date(fin - (n - 1 - i) * DIA_MS).toISOString().slice(0, 10));
}

/** "mar 30/9". */
export function etiquetaDeDia(dia) {
  const d = new Date(`${dia}T12:00:00Z`);
  return `${NOMBRES_DE_DIA[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

// ------------------------------------------------------------ lo medido

/**
 * Lo medido de un día: el detalle (`dias`) y, si no lo hay (antes del 1/10), lo
 * que se pueda sacar de la medición de las 21 de ese día (sus "últimas 24 horas").
 */
export function datosDelDia(estadisticas, dia) {
  const d = estadisticas?.dias?.[dia];
  // Un día con todo en cero (o marcado `sinLectura`) casi nunca es un día sin lectores: es una
  // lectura de Cloudflare que falló (15/10/2026: el 11, 13, 14 y 15/10 figuraban en cero). Se
  // trata como "sin lectura", no como cero visitas.
  const nula = (v) => v === undefined || v === 0;
  const sinLectura = Boolean(d) && (d.sinLectura === true || ((d.vistas === 0 || d.visitas === 0) && nula(d.vistas) && nula(d.visitas)));
  if (d && !sinLectura && (d.vistas !== undefined || d.visitas !== undefined)) return { ...d, dia, detalle: true };
  // La medición de las 21 de Balcarce es la de las 00:00 UTC del día siguiente (una medición toda en cero tampoco sirve).
  const fin = Date.parse(`${dia}T00:00:00Z`) + DIA_MS;
  const p = (estadisticas?.puntos ?? [])
    .filter((x) => x.web?.u24 && (x.web.u24.vistas || x.web.u24.visitas) && Math.abs(Date.parse(x.cuando) - fin) <= 2 * 3600e3)
    .sort((a, b) => Math.abs(Date.parse(a.cuando) - fin) - Math.abs(Date.parse(b.cuando) - fin))[0];
  if (p) return { dia, visitas: p.web.u24.visitas, vistas: p.web.u24.vistas, detalle: false };
  if (sinLectura) return { dia, detalle: false, sinLectura: true };
  return { ...(d ?? {}), dia, detalle: Boolean(d) };
}

const suma = (xs) => xs.reduce((a, b) => a + (Number(b) || 0), 0);

/** Visitas y vistas de una lista de días. */
export function totales(lista) {
  return { visitas: suma(lista.map((d) => d.visitas)), vistas: suma(lista.map((d) => d.vistas)) };
}

/** "↑ 12 %", "↓ 5 %" o "" comparando con el período anterior. */
export function variacion(actual, antes) {
  if (!antes) return '';
  const pct = Math.round(((actual - antes) / antes) * 100);
  return pct === 0 ? 'igual que antes' : `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct)} % que antes`;
}

/** Suma un campo de tipo { clave: número } de varios días: [[clave, total]] de mayor a menor. */
export function sumarMapa(lista, campo) {
  const t = {};
  for (const d of lista) for (const [k, n] of Object.entries(d[campo] ?? {})) t[k] = (t[k] ?? 0) + (Number(n) || 0);
  return Object.entries(t).sort((a, b) => b[1] - a[1]);
}

/** Las 24 horas del día, sumando los días (en hora de Balcarce). */
export function horasSumadas(lista) {
  const h = Array(24).fill(0);
  for (const d of lista) (d.horas ?? []).forEach((n, i) => { h[i] += Number(n) || 0; });
  return h;
}

// ------------------------------------------------- qué se lee, por sección

/** Un mapa id → nota con lo que hay en la portada y en el archivo. */
export function indiceDeNotas(...listas) {
  const m = new Map();
  for (const l of listas) for (const n of l ?? []) if (n?.id && !m.has(n.id)) m.set(n.id, n);
  return m;
}

/**
 * Qué sección se lee más. Cada fila: vistas, notas publicadas en el período
 * (de notas-por-dia.json) y vistas por nota publicada.
 */
export function porSeccion({ lista, indice, produccion }) {
  const vistas = {};
  let sinIdentificar = 0;
  for (const [id, n] of sumarMapa(lista, 'notas')) {
    const nota = indice.get(id);
    if (!nota?.seccion) { sinIdentificar += n; continue; }
    vistas[nota.seccion] = (vistas[nota.seccion] ?? 0) + n;
  }
  const publicadas = {};
  for (const d of lista) for (const [s, n] of Object.entries(produccion?.dias?.[d.dia]?.porSeccion ?? {})) publicadas[s] = (publicadas[s] ?? 0) + n;
  const secciones = new Set([...Object.keys(vistas), ...Object.keys(publicadas)]);
  const filas = [...secciones].map((seccion) => ({
    seccion, vistas: vistas[seccion] ?? 0, publicadas: publicadas[seccion] ?? 0,
    porNota: publicadas[seccion] ? (vistas[seccion] ?? 0) / publicadas[seccion] : null,
  })).sort((a, b) => b.vistas - a.vistas || b.publicadas - a.publicadas);
  return { filas, sinIdentificar };
}

/** Las notas más leídas del período. */
export function notasMasLeidas({ lista, indice, cuantas = 10 }) {
  return sumarMapa(lista, 'notas').slice(0, cuantas).map(([id, vistas]) => ({ id, vistas, nota: indice.get(id) ?? null }));
}

/** Vistas por medio: cada nota cuenta para todos los medios que la contaron. */
export function porMedio({ lista, indice, cuantos = 8 }) {
  const t = {};
  for (const [id, n] of sumarMapa(lista, 'notas')) for (const m of indice.get(id)?.medios ?? []) t[m] = (t[m] ?? 0) + n;
  return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, cuantos);
}

/** Lo de Balcarce contra lo de afuera: vistas y notas leídas. */
export function deAcaYDeAfuera({ lista, indice }) {
  const r = { aca: 0, afuera: 0, sin: 0 };
  for (const [id, n] of sumarMapa(lista, 'notas')) {
    const nota = indice.get(id);
    if (!nota) r.sin += n; else if (nota.local || nota.seccion === 'Balcarce') r.aca += n; else r.afuera += n;
  }
  return r;
}

// ------------------------------------------------------------------- redes

/** Cuántas piezas salieron cada día en Facebook e Instagram (del libro de publicaciones). */
export function piezasPorDia(libro, dias) {
  const por = Object.fromEntries(dias.map((d) => [d, { facebook: 0, instagram: 0 }]));
  const contar = (mapa, red) => {
    for (const v of Object.values(mapa ?? {})) {
      const d = v?.cuando ? diaDeBalcarce(v.cuando) : null;
      if (d && por[d]) por[d][red] += 1;
    }
  };
  contar(libro?.facebook, 'facebook');
  contar(libro?.instagram, 'instagram');
  contar(libro?.instagramFeed, 'instagram');
  return por;
}

/** Cómo cambiaron los seguidores entre la primera y la última medición del período. */
export function evolucionDeSeguidores(puntos, red, desdeDia) {
  const lista = (puntos ?? []).filter((p) => p[red]?.seguidores !== undefined && p[red]?.seguidores !== null);
  if (!lista.length) return null;
  const ultimo = lista.at(-1);
  const corte = Date.parse(`${desdeDia}T03:00:00Z`);
  const primero = lista.find((p) => Date.parse(p.cuando) >= corte) ?? lista[0];
  return { ahora: ultimo[red].seguidores, antes: primero[red].seguidores, desde: primero.cuando };
}

// ------------------------------------------------------------- la selección

const MOTIVOS_DE_LA_SELECCION = [
  ['unMedio', 'un solo medio'], ['pocasFuentes', 'pocas fuentes'], ['semaforo', 'el semáforo'], ['ia', 'la IA'], ['repetida', 'repetidas'],
  ['sinCuerpo', 'sin cuerpo'], ['tarde', 'llegó tarde'], ['retirada', 'retirada o unida'], ['otros', 'otros'],
];

/**
 * Un resumen chico de cómo cae la selección (web/data/estadistica-seleccion.json, regla 260): por día cuántas historias llegan y cuántas salen,
 * por qué no salen las demás y qué secciones tuvieron días sin notas. null si todavía no hay días medidos.
 */
export function resumenDeLaSeleccion(seleccion, { hoy, dias = 7 } = {}) {
  const lista = ultimosDias(hoy, dias).filter((d) => seleccion?.dias?.[d]);
  if (!lista.length) return null;
  const suma = (f) => lista.reduce((t, d) => t + (Number(f(seleccion.dias[d])) || 0), 0);
  const motivos = MOTIVOS_DE_LA_SELECCION.map(([clave, texto]) => ({
    clave, texto, cuantas: suma((d) => Object.values(d.secciones ?? {}).reduce((t, s) => t + (s.quedaronAfuera?.[clave] ?? 0), 0)),
  }));
  const secciones = new Set(lista.flatMap((d) => Object.keys(seleccion.dias[d].secciones ?? {})));
  const sinNotas = [...secciones].map((s) => ({ seccion: s, dias: lista.filter((d) => !(seleccion.dias[d].secciones?.[s]?.publicadas > 0)).length }))
    .filter((x) => x.dias > 0).sort((a, b) => b.dias - a.dias);
  return {
    dias: lista.length,
    llegan: suma((d) => d.llegaron) / lista.length, salen: suma((d) => d.publicadas) / lista.length,
    deAca: suma((d) => d.deAcaPublicadas) / lista.length, deAfuera: suma((d) => d.deAfueraPublicadas) / lista.length,
    motivos, sinNotas,
  };
}

/** El bloque "Cómo cae la selección" de la pestaña. Vacío si no hay números todavía. */
export function htmlDeLaSeleccion(seleccion, { hoy, rango = 7 } = {}) {
  const r = resumenDeLaSeleccion(seleccion, { hoy, dias: rango });
  if (!r) return '';
  const dec = (n) => (Math.round(n * 10) / 10).toLocaleString('es-AR');
  const motivos = r.motivos.filter((m) => m.cuantas).map((m) => `${esc(m.texto)} <strong>${n0(m.cuantas / r.dias)}</strong>`).join(' · ');
  const sin = r.sinNotas.map((x) => `${esc(x.seccion)} (${x.dias} de ${r.dias})`).join(', ');
  return `<h2>Cómo cae la selección</h2><div class="caja"><ul class="lista-simple">
    <li>Por día llegan <strong>${n0(r.llegan)}</strong> historias y salen <strong>${dec(r.salen)}</strong> (${dec(r.deAca)} de acá y ${dec(r.deAfuera)} de afuera).</li>
    ${motivos ? `<li>Las que no salen, por día: ${motivos}.</li>` : ''}
    <li>${sin ? `Secciones con días sin notas: ${sin}.` : 'Todas las secciones tuvieron notas todos los días.'}</li></ul>
    <p class="estado">Promedio de ${r.dias} ${r.dias === 1 ? 'día medido' : 'días medidos'}. <a href="estadistica-seleccion.html" target="_blank" rel="noopener">Ver el reporte completo</a>
    (cuántas notas habría con otro mínimo). Los mínimos se cambian en GitHub, Settings, Secrets and variables, Actions, Variables: MINIMO_NACIONAL y MINIMO_AREAS_CHICAS.</p></div>`;
}

// ------------------------------------------------------------------- salud

/** Lo que dicen las últimas corridas de un workflow de GitHub Actions. */
export function resumenDeCorridas(corridas = []) {
  const hechas = corridas.filter((c) => c.status === 'completed');
  const fallas = hechas.filter((c) => c.conclusion === 'failure');
  return { total: hechas.length, fallas: fallas.length, ultimaFalla: fallas[0]?.created_at ?? null, ultima: hechas[0]?.conclusion ?? null };
}

// -------------------------------------------------------------------- HTML

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n0 = (n) => Math.round(Number(n) || 0).toLocaleString('es-AR');
const pct = (parte, todo) => (todo ? `${Math.round((parte / todo) * 100)} %` : '–');
const chipDe = (s) => (s ? `<span class="chip" style="background:var(--s-${COLOR[s] ?? 'pais'})">${esc(s)}</span>` : '');

const PAISES = (() => { try { return new Intl.DisplayNames(['es'], { type: 'region' }); } catch { return null; } })();
const nombreDePais = (c) => { try { return PAISES?.of(c) ?? c; } catch { return c; } };
const APARATOS = { mobile: 'Celular', desktop: 'Computadora', tablet: 'Tablet', otro: 'Otro' };
const REFERENTES = { directo: 'Directo o WhatsApp', 'facebook.com': 'Facebook', 'instagram.com': 'Instagram', 'google.com': 'Google', 'x.com': 'X (Twitter)' };

/** Barras verticales (una por día o por hora) en SVG. */
export function graficoDeBarras(valores, etiquetas, { resaltar = -1, titulo = '' } = {}) {
  const ancho = 320;
  const alto = 84;
  const n = valores.length || 1;
  const max = Math.max(1, ...valores.map((v) => v ?? 0));
  const paso = ancho / n;
  const barra = Math.max(2, paso - (n > 14 ? 2 : 4));
  const cada = n > 14 ? (n > 24 ? 5 : 3) : 1;
  const barras = valores.map((v, i) => {
    // Un valor `null` es un día sin lectura: no se dibuja como cero, se marca con una rayita punteada.
    if (v === null || v === undefined) {
      return `<line x1="${(i * paso + paso / 2).toFixed(1)}" y1="${alto - 14}" x2="${(i * paso + paso / 2).toFixed(1)}" y2="${alto}" stroke="var(--suave)" stroke-width="2" stroke-dasharray="2 3" opacity="0.7"><title>${esc(etiquetas[i])}: sin lectura</title></line>`;
    }
    const h = Math.max(v ? 2 : 0, Math.round((v / max) * alto));
    return `<rect x="${(i * paso + (paso - barra) / 2).toFixed(1)}" y="${alto - h}" width="${barra.toFixed(1)}" height="${h}" rx="2" fill="${i === resaltar ? 'var(--rojo)' : 'var(--verde)'}" opacity="${i === resaltar ? 1 : 0.85}"><title>${esc(etiquetas[i])}: ${n0(v)}</title></rect>`;
  }).join('');
  const textos = etiquetas.map((e, i) => (i % cada === 0 || i === n - 1 ? `<text x="${(i * paso + paso / 2).toFixed(1)}" y="${alto + 13}" text-anchor="middle" font-size="9.5" fill="var(--suave)">${esc(e)}</text>` : '')).join('');
  return `<svg viewBox="0 0 ${ancho} ${alto + 18}" width="100%" role="img" aria-label="${esc(titulo)}">${barras}${textos}</svg>`;
}

/** Una lista de filas con barra horizontal: [{ texto, valor, nota? }]. */
export function filasConBarra(filas, { maximo, total = null, sufijo = '' } = {}) {
  const tope = maximo ?? Math.max(1, ...filas.map((f) => f.valor));
  return `<ul class="barras">${filas.map((f) => `<li>
    <div class="barras-linea"><span class="barras-texto">${f.texto}</span><span class="barras-valor">${n0(f.valor)}${sufijo}${total ? ` · ${pct(f.valor, total)}` : ''}</span></div>
    <div class="barras-fondo"><div class="barras-relleno" style="width:${Math.max(2, Math.round((f.valor / tope) * 100))}%${f.color ? `;background:${f.color}` : ''}"></div></div>
    ${f.nota ? `<div class="meta">${f.nota}</div>` : ''}</li>`).join('')}</ul>`;
}

const tarjeta = (titulo, valor, pie = '') => `<div class="tile"><div class="tile-titulo">${esc(titulo)}</div><div class="tile-valor">${valor}</div>${pie ? `<div class="meta">${esc(pie)}</div>` : ''}</div>`;

/**
 * La pestaña entera.
 *
 * @param {object} o
 * @param {object} o.estadisticas  web/data/estadisticas.json
 * @param {object} o.produccion    web/data/notas-por-dia.json
 * @param {object} [o.seleccion]   web/data/estadistica-seleccion.json (regla 260)
 * @param {Map}    o.indice        id → nota (indiceDeNotas)
 * @param {object} o.libro         web/data/redes.json
 * @param {object} o.corridas      { actualizar, redes, vigilancia } → resumenDeCorridas, si se pudieron traer
 * @param {number} o.rango         7, 14 o 30
 * @param {string} o.hoy           AAAA-MM-DD de Balcarce
 * @param {(id:string)=>string} o.enlace  la dirección de una nota
 * @param {{esperan:number, sinCuerpo:number}} o.espera
 */
export function htmlDeNumeros({ estadisticas, produccion, seleccion = null, indice, libro, corridas, rango = 7, hoy, enlace, espera = {}, haceCuanto = () => '' }) {
  const dias = ultimosDias(hoy, rango);
  const lista = dias.map((d) => datosDelDia(estadisticas, d));
  const previos = ultimosDias(new Date(Date.parse(`${dias[0]}T12:00:00Z`) - DIA_MS).toISOString().slice(0, 10), rango).map((d) => datosDelDia(estadisticas, d));
  const t = totales(lista);
  const tPrevio = totales(previos);
  const hayPrevio = previos.some((d) => d.vistas !== undefined);
  const conDetalle = lista.filter((d) => d.detalle);
  const diasConDetalle = conDetalle.length;
  // Los días que ya terminaron y no tienen lectura (no se cuenta hoy, que recién empieza).
  const sinLectura = lista.filter((d) => d.dia !== hoy && d.sinLectura === true).length;

  const botones = RANGOS.map((r) => `<button type="button" data-accion="rango-numeros" data-rango="${r}" aria-current="${r === rango}">${r} días</button>`).join('');
  const vistasPorVisita = t.visitas ? (t.vistas / t.visitas).toFixed(1).replace('.', ',') : '–';

  // --- cuánta gente
  const hoyEnCurso = lista.at(-1);
  let html = `<h1>Números</h1>
    <div class="sub">${botones}</div>
    <p class="estado">Visitas de la web medidas por Cloudflare, sin cookies y sin saber quién entró. Son aproximadas: Cloudflare no cuenta a quien tiene un bloqueador ni a los robots, y estima parte del total.</p>
    <div class="tiles">
      ${tarjeta('Visitas', n0(t.visitas), hayPrevio ? variacion(t.visitas, tPrevio.visitas) : `en ${rango} días`)}
      ${tarjeta('Páginas vistas', n0(t.vistas), hayPrevio ? variacion(t.vistas, tPrevio.vistas) : `en ${rango} días`)}
      ${tarjeta('Vistas por visita', vistasPorVisita, 'más es mejor: leen más de una cosa')}
      ${tarjeta('Hoy, hasta ahora', n0(hoyEnCurso.vistas ?? 0), `${n0(hoyEnCurso.visitas ?? 0)} visitas`)}
    </div>
    <h2>Por día</h2>
    <div class="caja">${graficoDeBarras(lista.map((d) => (d.vistas === undefined ? null : d.vistas)), dias.map((d) => etiquetaDeDia(d).replace(/^\S+ /, '')), { resaltar: lista.length - 1, titulo: 'Páginas vistas por día' })}
    <p class="estado">Páginas vistas por día. El último es hoy y todavía no terminó.${sinLectura ? ` ${sinLectura === 1 ? 'Un día figura' : `${sinLectura} días figuran`} con la rayita punteada: Cloudflare no dio una lectura confiable, no es que nadie haya entrado.` : ''}</p></div>`;

  if (!diasConDetalle) {
    html += '<p class="problemas">El detalle (qué se lee, a qué hora, de dónde llegan) se empieza a juntar con la próxima medición de las 9 o las 21. Mientras tanto se ven los totales de arriba.</p>';
  } else if (diasConDetalle < rango) {
    html += `<p class="estado">El detalle está medido en ${diasConDetalle} de los ${rango} días: se completa solo, dos veces por día.</p>`;
  }

  if (diasConDetalle) {
    // --- qué sección se lee
    const s = porSeccion({ lista: conDetalle, indice, produccion });
    const conPublicadas = s.filas.filter((f) => f.vistas || f.publicadas);
    const maxS = Math.max(1, ...conPublicadas.map((f) => f.vistas));
    html += `<h2>Qué sección se lee más</h2>
      <div class="caja">${filasConBarra(conPublicadas.map((f) => ({
        texto: chipDe(f.seccion), valor: f.vistas,
        nota: `${f.publicadas} ${f.publicadas === 1 ? 'nota publicada' : 'notas publicadas'}${f.porNota !== null ? ` · ${f.porNota.toFixed(1).replace('.', ',')} vistas por nota` : ''}`,
        color: `var(--s-${COLOR[f.seccion] ?? 'pais'})`,
      })), { maximo: maxS })}
      <p class="estado">"Vistas por nota" es lo que mejor compara: una sección con pocas notas y muchas vistas por nota rinde más que una que publica mucho y se lee poco. Sólo cuentan los ${diasConDetalle} días con detalle${s.sinIdentificar ? ` (${n0(s.sinIdentificar)} vistas son de notas que ya no están en el archivo)` : ''}.</p></div>`;

    const ay = deAcaYDeAfuera({ lista: conDetalle, indice });
    const totalAy = ay.aca + ay.afuera;
    if (totalAy) {
      html += `<h2>Lo de Balcarce y lo de afuera</h2><div class="caja">${filasConBarra([
        { texto: 'Notas de Balcarce', valor: ay.aca, color: 'var(--s-balcarce)' },
        { texto: 'Notas de afuera', valor: ay.afuera, color: 'var(--s-pais)' },
      ], { total: totalAy })}</div>`;
    }

    // --- las notas más leídas
    const top = notasMasLeidas({ lista: conDetalle, indice });
    if (top.length) {
      html += `<h2>Las notas más leídas</h2><ol class="lista-simple">${top.map((f) => `<li>${f.nota ? `${chipDe(f.nota.seccion)}<a href="${esc(enlace(f.nota))}" target="_blank" rel="noopener">${esc(f.nota.titulo ?? '')}</a>` : '<span class="meta">una nota que ya no está en la web</span>'} <strong>${n0(f.vistas)}</strong></li>`).join('')}</ol>`;
    }
    const medios = porMedio({ lista: conDetalle, indice });
    if (medios.length) {
      html += `<h2>Qué medios cuentan lo más leído</h2><div class="caja">${filasConBarra(medios.map(([m, v]) => ({ texto: esc(m), valor: v })))}
        <p class="estado">Cada nota cuenta para todos los medios que la contaron, así que los números se superponen.</p></div>`;
    }

    // --- cuándo
    const horas = horasSumadas(conDetalle);
    if (suma(horas)) {
      const mejor = horas.indexOf(Math.max(...horas));
      html += `<h2>A qué hora entra la gente</h2><div class="caja">${graficoDeBarras(horas, horas.map((_, i) => String(i)), { resaltar: mejor, titulo: 'Páginas vistas por hora del día' })}
        <p class="estado">Hora de Balcarce. La que más vistas junta: <strong>${mejor}:00 a ${mejor}:59</strong>. Sirve para elegir cuándo sale cada pieza.</p></div>`;
    }

    // --- de dónde
    const ref = sumarMapa(conDetalle, 'referentes');
    const totalRef = suma(ref.map((r) => r[1]));
    if (totalRef) {
      html += `<h2>De dónde llegan</h2><div class="caja">${filasConBarra(ref.slice(0, 8).map(([k, v]) => ({ texto: esc(REFERENTES[k] ?? k), valor: v })), { total: totalRef })}
        <p class="estado">"Directo o WhatsApp" suma a quien abre el enlace desde WhatsApp, el favorito o escribe la dirección: WhatsApp no dice de dónde viene.</p></div>`;
    }
    const aparatos = sumarMapa(conDetalle, 'dispositivos');
    const totalAp = suma(aparatos.map((r) => r[1]));
    if (totalAp) html += `<h2>Con qué entran</h2><div class="caja">${filasConBarra(aparatos.map(([k, v]) => ({ texto: esc(APARATOS[k] ?? k), valor: v })), { total: totalAp })}</div>`;
    const paises = sumarMapa(conDetalle, 'paises');
    const totalPa = suma(paises.map((r) => r[1]));
    if (totalPa) {
      html += `<h2>Desde qué país</h2><div class="caja">${filasConBarra(paises.slice(0, 6).map(([k, v]) => ({ texto: esc(nombreDePais(k)), valor: v })), { total: totalPa })}
        <p class="estado">Lo de afuera de la Argentina suele ser de robots y buscadores, no de lectores.</p></div>`;
    }
    const paginas = sumarMapa(conDetalle, 'paginas').slice(0, 8);
    if (paginas.length) {
      const nombre = (c) => (c === '/' ? 'Portada' : c.startsWith('/seccion/') ? `Sección ${decodeURIComponent(c.slice(9))}` : c);
      html += `<h2>Otras páginas</h2><div class="caja">${filasConBarra(paginas.map(([k, v]) => ({ texto: esc(nombre(k)), valor: v })))}</div>`;
    }
  }

  // --- redes
  const por = piezasPorDia(libro, dias);
  const fb = suma(Object.values(por).map((p) => p.facebook));
  const ig = suma(Object.values(por).map((p) => p.instagram));
  const seg = (red, nombre) => {
    const e = evolucionDeSeguidores(estadisticas?.puntos, red, dias[0]);
    if (!e) return '';
    const d = e.ahora - e.antes;
    return `<li>${nombre}: <strong>${n0(e.ahora)}</strong> seguidores${d ? ` (${d > 0 ? '+' : ''}${n0(d)} en el período)` : ' (sin cambios en el período)'}</li>`;
  };
  const ultimo = (estadisticas?.puntos ?? []).at(-1);
  const metas = [
    ultimo?.facebook?.vistas !== undefined ? `Facebook, últimas 24 h: ${n0(ultimo.facebook.vistas)} vistas y ${n0(ultimo.facebook.interacciones ?? 0)} interacciones` : '',
    ultimo?.instagram?.alcance !== undefined ? `Instagram, últimas 24 h: alcance ${n0(ultimo.instagram.alcance)}, ${n0(ultimo.instagram.vistas ?? 0)} vistas y ${n0(ultimo.instagram.interacciones ?? 0)} interacciones` : '',
  ].filter(Boolean);
  html += `<h2>Redes</h2><div class="caja"><ul class="lista-simple">${seg('facebook', 'Facebook')}${seg('instagram', 'Instagram')}
    <li>Publicado en el período: <strong>${n0(fb)}</strong> posteos de Facebook y <strong>${n0(ig)}</strong> piezas de Instagram</li>
    ${metas.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
    <p class="estado">Las redes recién arrancan: los números chicos son normales. Los alcances y las interacciones son del último día medido.</p></div>`;

  // --- producción
  const prod = lista.map((d) => produccion?.dias?.[d.dia]?.publicadas ?? 0);
  if (suma(prod)) {
    html += `<h2>Cuántas notas salen</h2><div class="caja">${graficoDeBarras(prod, dias.map((d) => etiquetaDeDia(d).replace(/^\S+ /, '')), { resaltar: prod.length - 1, titulo: 'Notas publicadas por día' })}
      <p class="estado">${n0(suma(prod))} notas publicadas en ${rango} días, ${(suma(prod) / rango).toFixed(1).replace('.', ',')} por día${t.vistas ? ` · ${(t.vistas / Math.max(1, suma(prod))).toFixed(1).replace('.', ',')} vistas por nota publicada` : ''}.</p></div>`;
  }

  // --- la selección (regla 260)
  html += htmlDeLaSeleccion(seleccion, { hoy, rango });

  // --- salud
  const filaCorrida = (nombre, r) => (r ? `<li>${esc(nombre)}: ${r.fallas ? `<span class="est mal">${r.fallas} con falla de las últimas ${r.total}</span>${r.ultimaFalla ? ` (la última, ${esc(haceCuanto(r.ultimaFalla))})` : ''}` : `<span class="est ok">sin fallas en las últimas ${r.total}</span>`}</li>` : '');
  const salud = corridas ? `${filaCorrida('Actualizar la web', corridas.actualizar)}${filaCorrida('Redes', corridas.redes)}${filaCorrida('Vigilancia', corridas.vigilancia)}` : '';
  html += `<h2>Cómo anda el sistema</h2><div class="caja"><ul class="lista-simple">
    <li>Esperando a una persona: <strong>${n0(espera.esperan ?? 0)}</strong> · Sin cuerpo: <strong>${n0(espera.sinCuerpo ?? 0)}</strong></li>
    ${salud || '<li class="meta">No se pudieron traer las corridas de GitHub.</li>'}</ul>
    <p class="estado">Una falla suelta casi siempre es de GitHub (se cae una descarga) y se arregla sola en la corrida siguiente. Si se repite, avisale a Claude.</p></div>`;
  return html;
}
