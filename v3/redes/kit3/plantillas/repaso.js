/* Plantilla del repaso (mañana, tarde, noche) del kit 3.0: siempre 3 notas numeradas 1-2-3, sin rótulos ni colores de sección (sólo tinta, papel y el rojo de la marca), titulares
   ENTEROS (la letra se achica hasta caber; nunca «…»). Las tres notas, la MISMA composición: la foto a todo el ancho, pegada arriba (se recorta como mucho un 34 %; ver `geom` en kit.js), con movimiento suave; el número sobre la foto; el titular DEBAJO de la foto, sobre fondo oscuro (nunca encima de una cara); los subtítulos más abajo. Ningún crédito de foto dentro del video: va en el texto del posteo.
   Lee SPEC.datos (desde-pieza.mjs). */
const ROJO = '#C7381C', PAPEL = '#FAF8F3';
const PANEL = '#14161A';
function numero(K, parent, i, n, css) { // cuadrado rojo con el numero grande + una barra de avance por nota
  const w = K.div(parent, '', css + ';display:flex;align-items:center;gap:22px');
  K.div(w, '', 'width:104px;height:104px;background:' + ROJO + ';color:#fff;font-family:SS4;font-weight:900;font-size:84px;line-height:104px;text-align:center;border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,.4)', String(i + 1));
  const b = K.div(w, '', 'display:flex;gap:10px');
  for (let k = 0; k < n; k++) K.div(b, '', 'width:58px;height:12px;border-radius:4px;background:' + (k === i ? PAPEL : 'rgba(255,255,255,.35)'));
  return w;
}
const planoDe = (f, o) => Object.assign({ src: f ? f.src : null, w: f ? f.w : 1080, h: f ? f.h : 1920, panel: PANEL }, o);
function tapa(K, S) {
  const T = K.TAPA, D = S.datos, N = D.notas;
  K.div(T, '', 'position:absolute;inset:0;background:#14161A');
  const nf = N.find((x) => x.foto);
  const PT = K.fotoEstatica(T, planoDe(nf ? nf.foto : null, { off: 240, maxH: 900, minH: 900 })).PTt; // la foto arranca en la fila 240: la grilla (285-1635) no le corta la cabeza
  K.div(T, '', 'position:absolute;left:0;top:0;width:1080px;height:420px;background:linear-gradient(180deg,rgba(8,10,14,.4) 0%,rgba(8,10,14,0) 100%)');
  K.div(T, '', 'position:absolute;left:60px;top:315px;height:58px;padding:0 24px;display:flex;align-items:center;background:' + ROJO + ';color:#fff;font-weight:700;font-size:28px;letter-spacing:.16em;text-transform:uppercase;border-radius:4px;white-space:nowrap', 'Repaso · ' + D.momentoTexto);
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
  K.linea(tit, D.l1, '', a + 'font-size:140px;line-height:1', 0.2, { d: 0.6, salida: t[0] - 0.1 });
  K.linea(tit, D.l2, '', a + 'font-size:96px;line-height:1.05', 0.38, { d: 0.6, salida: t[0] - 0.1 });
  N.forEach((nota, i) => {
    const t0 = i === 0 ? 0 : t[i], t1 = i < n - 1 ? t[i + 1] : tFin, tn = t[i], f = nota.foto;
    K.foto(planoDe(f, { t0, t1, entrada: i === 0 ? 'corte' : ENTRADAS[i % 3], de: 0.5, dir: i % 2 ? -1 : 1, z: 10 + i * 2 }));
    const tam = K.fitBox(nota.titular, 960, 1420 - PTS[i] - 25, 62, 38, 1.1, 0.54);
    const bloque = K.div(K.CT, '', 'position:absolute;left:60px;top:' + (PTS[i] + 25) + 'px;width:960px');
    K.linea(bloque, nota.titular, '', 'font-family:SS4;font-weight:900;font-size:' + tam + 'px;line-height:1.1;color:#fff;text-wrap:balance;text-shadow:0 4px 22px rgba(0,0,0,.6)', tn + 0.35, { d: 0.6, salida: t1 - 0.05 });
    const num = numero(K, K.CT, i, n, 'position:absolute;left:60px;top:276px');
    K.aparece(num, tn + 0.1, { y: 0, from: { x: -60 }, salida: t1 - 0.05 });
  });
  // el cierre del repaso: «Todo en Radar Balcarce» con las tres notas; la última foto no queda colgada
  K.foto({ src: null, t0: tFin, t1: FIN, entrada: 'fundido', de: 0.45, z: 15, panel: PANEL });
  const cab = K.div(K.CT, '', 'position:absolute;left:60px;top:300px;width:960px');
  K.linea(cab, 'Todo en', '', a + 'font-size:110px;line-height:1', tFin + 0.3, { d: 0.6 });
  K.linea(cab, 'Radar <span style="color:' + ROJO + '">Balcarce</span>', '', a + 'font-size:124px;line-height:1.05', tFin + 0.45, { d: 0.6 });
  let tam = 28;
  for (const s of [40, 38, 36, 34, 32, 30, 28]) { const alto = N.reduce((x, y) => x + K.lineasDe(y.titular, 830, s, 0.56) * (s + 8), 0) + 36 * (n - 1); tam = s; if (alto <= 560) break; }
  const lista = K.div(K.CT, '', 'position:absolute;left:60px;top:640px;width:960px;display:flex;flex-direction:column;gap:36px');
  N.forEach((x, i) => {
    const fila = K.div(lista, '', 'display:flex;align-items:flex-start;gap:26px');
    K.div(fila, '', 'flex:none;width:64px;height:64px;background:' + ROJO + ';color:#fff;font-family:SS4;font-weight:900;font-size:50px;line-height:64px;text-align:center;border-radius:6px;margin-top:2px', String(i + 1));
    K.div(fila, '', 'width:830px;font-weight:700;font-size:' + tam + 'px;line-height:' + (tam + 8) + 'px;color:#FAF8F3;text-wrap:balance', x.titular);
    K.aparece(fila, tFin + 0.6 + i * 0.25, { y: 24 });
  });
}
