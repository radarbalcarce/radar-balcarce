/* Plantilla del repaso (mañana, tarde, noche) del kit 3.0: siempre 3 notas numeradas 1-2-3, sin rótulos ni colores de sección (sólo tinta, papel y el rojo de la marca), titulares
   ENTEROS (la letra se achica hasta caber; nunca «…»). Las tres notas, la MISMA composición: la foto a todo el ancho, pegada arriba (se recorta como mucho un 34 %; ver `geom` en kit.js), con movimiento suave; el número sobre la foto; el titular DEBAJO de la foto, sobre fondo oscuro (nunca encima de una cara); los subtítulos más abajo. Ningún crédito de foto dentro del video: va en el texto del posteo.
   Lee SPEC.datos (desde-pieza.mjs). */
const ROJO = '#C7381C', PAPEL = '#FAF8F3';
const PANEL = '#14161A';
const planoDe = (f, o) => Object.assign({ src: f ? f.src : null, w: f ? f.w : 1080, h: f ? f.h : 1920, relleno: f ? f.relleno : null, panel: PANEL }, o);
function tapa(K, S) {
  const T = K.TAPA, D = S.datos, N = D.notas;
  K.div(T, '', 'position:absolute;inset:0;background:#14161A');
  const nf = N.find((x) => x.foto);
  const PT = K.fotoEstatica(T, planoDe(nf ? nf.foto : null, { off: 240, maxH: 900, minH: 900 })).PTt; // la foto arranca en la fila 240: la grilla (285-1635) no le corta la cabeza
  K.div(T, '', 'position:absolute;left:60px;top:91px;height:58px;padding:0 24px;display:flex;align-items:center;background:' + ROJO + ';color:#fff;font-weight:700;font-size:28px;letter-spacing:.16em;text-transform:uppercase;border-radius:4px;white-space:nowrap', 'Repaso · ' + D.momentoTexto);
  K.div(T, '', 'position:absolute;left:60px;top:' + (PT + 28) + 'px;font-family:SS4;font-weight:900;font-size:' + K.fit(D.titulo, 960, 84, 56, 0.5) + 'px;line-height:1;color:#FAF8F3;white-space:nowrap', D.titulo);
  // la lista: la letra más grande que deje los tres titulares enteros entre el título y la fila 1530
  const LT = PT + 130;
  let tam = 28;
  for (const s of [46, 44, 42, 40, 38, 36, 34, 32, 30, 28, 26, 24]) { const alto = N.reduce((a, x) => a + K.lineasDe(x.titular, 830, s, 0.56) * (s + 8), 0) + 18 * (N.length - 1); tam = s; if (alto <= 1530 - LT) break; }
  const lista = K.div(T, '', 'position:absolute;left:60px;top:' + LT + 'px;width:960px;display:flex;flex-direction:column;gap:18px');
  N.forEach((n, i) => {
    const fila = K.div(lista, '', 'display:flex;align-items:flex-start;gap:26px');
    K.div(fila, '', 'flex:none;width:' + (tam + 8) + 'px;height:' + (tam + 8) + 'px;background:' + ROJO + ';color:#fff;font-family:SS4;font-weight:900;font-size:' + Math.round(tam * 0.85) + 'px;line-height:' + (tam + 8) + 'px;text-align:center;border-radius:50%', String(i + 1));
    K.div(fila, '', 'width:830px;font-weight:700;font-size:' + tam + 'px;line-height:' + (tam + 8) + 'px;color:#FAF8F3;text-wrap:balance', n.titular);
  });
}
function escenas(K, S) {
  const D = S.datos, N = D.notas, t = D.t, n = N.length, FIN = S.dur - 1.5;
  const ENTRADAS = ['izq', 'abajo', 'der'];
  const tFin = Math.min(t[n] != null ? t[n] : FIN, FIN - 0.8); // donde arranca «Todo en Radar Balcarce»
  // la primera foto arranca con el título del repaso y sigue como la nota 1 (un solo plano: no se corta ni se reinicia)
  const a = 'font-family:SS4;font-weight:900;color:#fff;text-shadow:0 6px 30px rgba(0,0,0,.55);';
  const PTS = N.map((x) => K.geom(planoDe(x.foto, {})).PT); // dónde termina cada foto: ahí empieza su panel y su titular
  const tit = K.div(K.CT, '', 'position:absolute;left:60px;top:' + (PTS[0] + 25) + 'px;width:960px');
  K.linea(tit, D.l1, '', a + 'font-size:140px;line-height:1', 0.3, { d: 0.6, salida: t[0] - 0.1 });
  K.linea(tit, D.l2, '', a + 'font-size:96px;line-height:1.05', 0.42, { d: 0.6, salida: t[0] - 0.1 });
  N.forEach((nota, i) => {
    const t0 = i === 0 ? 0 : t[i], t1 = i < n - 1 ? t[i + 1] : FIN, tn = t[i], f = nota.foto, tSale = i < n - 1 ? t1 : tFin; // la última foto sigue hasta el cierre con el logo
    K.foto(planoDe(f, { t0, t1, entrada: i === 0 ? 'corte' : ENTRADAS[i % 3], de: 0.5, dir: i % 2 ? -1 : 1, z: 10 + i * 2 }));
    const tam = K.fitBox(nota.titular, 960, 1255 - PTS[i] - 25, 62, 38, 1.1, 0.6);
    const bloque = K.div(K.CT, '', 'position:absolute;left:60px;top:' + (PTS[i] + 25) + 'px;width:960px');
    K.linea(bloque, nota.titular, '', 'font-family:SS4;font-weight:900;font-size:' + tam + 'px;line-height:1.1;color:#fff;text-wrap:balance;text-shadow:0 4px 22px rgba(0,0,0,.6)', tn + 0.35, { d: 0.6, salida: tSale - 0.05 });
  });
  // el cierre: NO se repiten las tres noticias (la tapa ya las tiene). Mientras la voz dice «Todo en Radar Balcarce punto com» la última foto sigue en pantalla y, en lugar de su titular, queda la firma de la marca
  const fb = K.div(K.CT, '', 'position:absolute;left:60px;top:' + (PTS[n - 1] + 25) + 'px;width:960px');
  K.linea(fb, 'Radar <span style="color:' + ROJO + '">Balcarce</span>', '', a + 'font-size:130px;line-height:1.05', tFin + 0.1, { d: 0.6 });
  K.linea(fb, 'radarbalcarce.com', '', 'font-family:Inter;font-weight:600;color:#fff;text-shadow:0 4px 22px rgba(0,0,0,.6);font-size:54px;line-height:1.3', tFin + 0.3, { d: 0.6 });
  /* el gráfico animado (sólo con KIT3_GRAFICOS=si y si la nota trae uno válido; desde-pieza.mjs lo deja en SPEC.datos.grafico): si algo falla al dibujarlo, el video sale igual sin gráfico */
  if (D.grafico) { try { RadarDatos.grafico(K, D.grafico); } catch (e) { /* sin gráfico */ } }
}
