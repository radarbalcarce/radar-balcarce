/* Plantilla del repaso (mañana, tarde, noche) del kit 3.0: siempre 3 notas numeradas 1-2-3, sin rótulos ni colores de sección (sólo tinta, papel y el rojo de la marca), titulares
   ENTEROS (la letra se achica hasta caber; nunca «…»), cada foto a pantalla completa con su crédito abajo. Lee SPEC.datos (desde-pieza.mjs). */
const ROJO = '#C7381C', PAPEL = '#FAF8F3';
const CHIP = 'position:absolute;left:60px;height:58px;padding:0 24px;display:flex;align-items:center;background:' + ROJO + ';color:#fff;font-weight:700;font-size:28px;letter-spacing:.16em;text-transform:uppercase;border-radius:4px;white-space:nowrap';
function numero(K, parent, i, n, css) { // cuadrado rojo con el numero grande + una barra de avance por nota
  const w = K.div(parent, '', css + ';display:flex;align-items:center;gap:22px');
  K.div(w, '', 'width:112px;height:112px;background:' + ROJO + ';color:#fff;font-family:SS4;font-weight:900;font-size:90px;line-height:112px;text-align:center;border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,.4)', String(i + 1));
  const b = K.div(w, '', 'display:flex;gap:10px');
  for (let k = 0; k < n; k++) K.div(b, '', 'width:58px;height:12px;border-radius:4px;background:' + (k === i ? PAPEL : 'rgba(255,255,255,.35)'));
  return w;
}
const planoDe = (f, o) => Object.assign({ src: f ? f.src : null, w: f ? f.w : 1080, h: f ? f.h : 1920, contain: f ? f.contain : false, yc: f ? f.yc : 640, cw: 1080 }, o);
function tapa(K, S) {
  const T = K.TAPA, D = S.datos, N = D.notas;
  K.div(T, '', 'position:absolute;inset:0;background:#14161A');
  const nf = N.find((x) => x.foto);
  K.fotoEstatica(T, nf ? { src: nf.foto.src, w: nf.foto.w, h: nf.foto.h, contain: nf.foto.contain, top: 285, alto: 560, yc: 280, f: [0.5, 0.58] } : { top: 285, alto: 560, yc: 280 });
  K.div(T, '', 'position:absolute;left:0;top:285px;width:1080px;height:560px;background:linear-gradient(180deg,rgba(8,10,14,.35) 0%,rgba(8,10,14,0) 30%,rgba(8,10,14,0) 82%,rgba(20,22,26,.9) 100%)');
  K.div(T, '', CHIP + ';top:315px', D.titulo);
  K.div(T, '', 'position:absolute;left:60px;top:858px;font-family:SS4;font-weight:900;font-size:84px;line-height:1;color:#FAF8F3;white-space:nowrap', D.titulo);
  // la lista: la letra más grande que deje los tres titulares enteros entre la fila 980 y la 1420
  let tam = 28;
  for (const s of [36, 34, 32, 30, 28]) { const alto = N.reduce((a, x) => a + K.lineasDe(x.titular, 830, s, 0.56) * (s + 8), 0) + 30 * (N.length - 1); tam = s; if (alto <= 440) break; }
  const lista = K.div(T, '', 'position:absolute;left:60px;top:980px;width:960px;display:flex;flex-direction:column;gap:30px');
  N.forEach((n, i) => {
    const fila = K.div(lista, '', 'display:flex;align-items:flex-start;gap:26px');
    K.div(fila, '', 'flex:none;width:64px;height:64px;background:' + ROJO + ';color:#fff;font-family:SS4;font-weight:900;font-size:50px;line-height:64px;text-align:center;border-radius:6px;margin-top:2px', String(i + 1));
    K.div(fila, '', 'width:830px;font-weight:700;font-size:' + tam + 'px;line-height:' + (tam + 8) + 'px;color:#FAF8F3;text-wrap:balance', n.titular);
  });
}
function escenas(K, S) {
  const D = S.datos, N = D.notas, t = D.t, n = N.length;
  const ENTRADAS = ['izq', 'abajo', 'der'];
  const f0 = N[0];
  K.foto(planoDe(f0.foto, { t0: 0, t1: t[0], f0: [0.45, 0.5], f1: [0.55, 0.5], s0: 1.0, s1: 1.06, z: 1 }));
  K.credito(f0.credito, 0, t[0]);
  const tit = K.div(K.CT, '', 'position:absolute;left:60px;top:790px;width:960px');
  const a = 'font-family:SS4;font-weight:900;color:#fff;text-shadow:0 6px 30px rgba(0,0,0,.55);';
  K.linea(tit, D.l1, '', a + 'font-size:150px;line-height:1', 0.2, { d: 0.6, salida: t[0] - 0.1 });
  K.linea(tit, D.l2, '', a + 'font-size:104px;line-height:1.05', 0.38, { d: 0.6, salida: t[0] - 0.1 });
  N.forEach((nota, i) => {
    const t0 = t[i], t1 = t[i + 1], tm = t0 + (t1 - t0) * 0.52, f = nota.foto;
    const foco = [0.3 + 0.15 * (i % 3), 0.7 - 0.1 * (i % 3)];
    K.foto(planoDe(f, { t0, t1: tm, entrada: ENTRADAS[i % 3], de: 0.5, f0: [foco[0], 0.5], f1: [(foco[0] + foco[1]) / 2, 0.5], s0: 1.0, s1: 1.07, z: 10 + i * 2 }));
    K.foto(planoDe(f, { t0: tm, t1, entrada: 'circulo', de: 0.55, f0: [foco[1], 0.45], f1: [foco[1] + 0.05, 0.45], s0: 1.12, s1: 1.2, z: 11 + i * 2 }));
    const tam = K.fitBox(nota.titular, 960, 420, 64, 40, 1.1, 0.54);
    const bloque = K.div(K.CT, '', 'position:absolute;left:60px;bottom:900px;width:960px');
    K.linea(bloque, nota.titular, '', 'font-family:SS4;font-weight:900;font-size:' + tam + 'px;line-height:1.1;color:#fff;text-wrap:balance;text-shadow:0 4px 22px rgba(0,0,0,.6)', t0 + 0.35, { d: 0.6, salida: t1 - 0.05 });
    const num = numero(K, K.CT, i, n, 'position:absolute;left:60px;top:290px');
    K.aparece(num, t0 + 0.1, { y: 0, from: { x: -60 }, salida: t1 - 0.05 });
    K.credito(nota.credito, t0, i < n - 1 ? t1 : null);
  });
}
