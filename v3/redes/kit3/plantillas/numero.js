/* Plantilla de «El número del día» del kit 3.0 (diseño del ejemplo 1 aprobado por Hernán el 20/11/2026, adaptado a la zona segura): la foto de la nota arriba (oscurecida hacia la tinta), la CIFRA enorme que cuenta
   hasta su valor, qué es, y debajo la comparación en dos barras (la cifra anterior contra la de ahora), o la variación en porcentaje, o, si no hay comparación, el titular de la nota; al pie la fuente.
   Todo entre las filas 372 y 1245 y dentro de x = 60..940 (los subtítulos siguen en 1264-1480). Cifras siempre en Inter (nunca serif). Ningún crédito de foto dentro del video (va en el texto del posteo).
   Lee SPEC.datos (desde-pieza.mjs, `adaptarNumero`). */
const PANEL = '#14161A', PAPEL = '#FAF8F3', ROJO = '#C7381C';
const FOTO_ESCENA = 640; /* la foto de esta pieza es más baja que la de las notas: el número manda */
const planoDe = (f, o) => Object.assign({ src: f ? f.src : null, w: f ? f.w : 1080, h: f ? f.h : 1920, panel: PANEL }, o);
const textoDe = (c, pre, suf) => (pre || '') + c.texto + (suf || '');
function tapa(K, S) {
  const T = K.TAPA, D = S.datos, p = D.principal;
  K.div(T, '', 'position:absolute;inset:0;background:#14161A');
  const PT = K.fotoEstatica(T, planoDe(D.foto, { off: 240, maxH: 700, minH: 620, fijoEscena: FOTO_ESCENA })).PTt;
  K.div(T, '', 'position:absolute;left:60px;top:91px;height:58px;padding:0 24px;display:flex;align-items:center;background:' + D.color + ';color:#fff;font-weight:700;font-size:28px;letter-spacing:.16em;text-transform:uppercase;border-radius:4px;white-space:nowrap', D.seccion + ' · El número del día');
  const num = textoDe(p, p.pre, p.suf);
  const tam = K.fit(num, 900, 190, 96, 0.6);
  K.div(T, '', 'position:absolute;left:56px;top:' + (PT + 14) + 'px;font-weight:700;font-size:' + tam + 'px;line-height:1;letter-spacing:-.04em;color:' + D.acento + ';white-space:nowrap;font-variant-numeric:tabular-nums', num);
  let y = PT + 14 + tam + 6;
  if (p.unidadAparte) { K.div(T, '', 'position:absolute;left:60px;top:' + y + 'px;width:900px;font-weight:700;font-size:48px;line-height:1.1;color:#FAF8F3;white-space:nowrap', p.unidadAparte); y += 62; }
  const alto = 1530 - y - 20;
  const t = K.div(T, '', 'position:absolute;left:60px;top:' + y + 'px;width:960px;font-family:SS4;font-weight:900;font-size:' + K.fitBox(D.titulo, 960, alto, 60, 34, 1.06, 0.56) + 'px;line-height:1.06;color:#FAF8F3;text-shadow:0 4px 24px rgba(0,0,0,.5);text-wrap:balance', '');
  t.textContent = D.titulo;
}
function escenas(K, S) {
  const D = S.datos, p = D.principal, TL = K.TL, FIN = S.dur - 1.5, f = D.foto;
  K.foto(planoDe(f, { t0: 0, t1: FIN, entrada: 'corte', fijo: FOTO_ESCENA, filtro: 'brightness(.62) saturate(1.05)', z: 1 }));
  /* la foto se funde con la tinta hacia abajo */
  K.div(K.CT, '', 'position:absolute;left:0;top:' + (FOTO_ESCENA - 240) + 'px;width:1080px;height:241px;background:linear-gradient(180deg,rgba(20,22,26,0) 0%,#14161A 100%)');
  const tC = D.tCifra;
  /* la cifra que cuenta */
  const num = textoDe(p, p.pre, p.suf), tam = K.fit(num, 900, 250, 110, 0.6), ny = 470;
  const n = K.div(K.CT, '', 'position:absolute;left:56px;top:' + ny + 'px;font-weight:700;font-size:' + tam + 'px;line-height:1;letter-spacing:-.045em;color:#fff;white-space:nowrap;font-variant-numeric:tabular-nums', num);
  TL.set(n, { autoAlpha: 0 }, 0); TL.fromTo(n, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, tC);
  RadarDatos.contar(K, n, 0, p.n, tC, 1.7, p.dec, p.pre, p.suf, num, 'power3.out');
  let y = ny + tam + 4;
  if (p.unidadAparte) {
    const u = K.div(K.CT, '', 'position:absolute;left:60px;top:' + y + 'px;width:880px;font-weight:700;font-size:52px;line-height:1.1;color:#fff;white-space:nowrap', p.unidadAparte);
    K.aparece(u, tC + 1.0, { y: 14, d: 0.45 }); y += 66;
  }
  const q = K.div(K.CT, '', 'position:absolute;left:60px;top:' + (y + 6) + 'px;width:880px;font-weight:600;font-size:' + K.fitBox(p.que, 880, 78, 38, 28, 1.18, 0.55) + 'px;line-height:1.18;color:' + D.acento, '');
  q.textContent = p.que; K.aparece(q, tC + 1.3, { y: 14, d: 0.45 });
  /* abajo: comparación en barras, variación o el titular */
  const B0 = 975, tS = D.tSegunda != null ? D.tSegunda : tC + 2.2;
  if (D.comparacion) {
    const c = D.comparacion, MAXW = 560;
    const fila = (yy, et, v, col, txtCol, t0) => {
      const g = K.div(K.CT, '', 'position:absolute;left:60px;top:' + yy + 'px;width:880px;height:100px');
      K.div(g, '', 'position:absolute;left:0;top:0;width:880px;font-weight:600;font-size:' + K.fit(et, 880, 27, 18, 0.7) + 'px;letter-spacing:.08em;text-transform:uppercase;line-height:1.1;color:rgba(255,255,255,.78);white-space:nowrap', '').textContent = et;
      K.div(g, '', 'position:absolute;left:0;top:44px;width:' + (MAXW + 10) + 'px;height:34px;border-radius:17px;background:rgba(255,255,255,.12)');
      const rel = K.div(g, '', 'position:absolute;left:0;top:44px;width:' + Math.max(40, MAXW * v.n / c.maximo) + 'px;height:34px;border-radius:17px;background:' + col);
      TL.fromTo(rel, { scaleX: 0 }, { scaleX: 1, duration: 1.0, ease: 'power3.out', transformOrigin: 'left' }, t0);
      const val = K.div(g, '', 'position:absolute;left:' + (MAXW + 30) + 'px;top:34px;font-weight:700;font-size:40px;line-height:1.2;white-space:nowrap;font-variant-numeric:tabular-nums;color:' + txtCol, '');
      RadarDatos.contar(K, val, 0, v.n, t0, 1.0, v.dec, p.pre, p.suf, textoDe(v, p.pre, p.suf), 'power3.out');
      K.aparece(g, t0 - 0.1, { y: 16, d: 0.4 });
    };
    fila(B0, c.que, c, '#8F9AA8', '#C7CDD6', tS);
    fila(B0 + 112, 'Ahora', p, D.acento, D.acento, tS + 0.45);
  } else if (D.variacion) {
    const v = D.variacion, y0 = B0 + 6;
    const flecha = K.div(K.CT, '', 'position:absolute;left:62px;top:' + (y0 + 22) + 'px;width:0;height:0;border-left:44px solid transparent;border-right:44px solid transparent;' + (v.baja ? 'border-top:76px solid #E9C46A' : 'border-bottom:76px solid ' + D.acento));
    K.aparece(flecha, tS, { y: v.baja ? -24 : 24, d: 0.5 });
    const vt = (v.baja ? '−' : '+') + v.texto + ' %';
    const vn = K.div(K.CT, '', 'position:absolute;left:180px;top:' + y0 + 'px;font-weight:700;font-size:130px;line-height:1.05;letter-spacing:-.03em;color:' + D.acento + ';white-space:nowrap;font-variant-numeric:tabular-nums', vt);
    TL.set(vn, { autoAlpha: 0 }, 0); TL.set(vn, { autoAlpha: 1 }, tS);
    RadarDatos.contar(K, vn, 0, v.n, tS, 1.2, v.dec, v.baja ? '−' : '+', ' %', vt, 'power3.out');
    const vq = K.div(K.CT, '', 'position:absolute;left:60px;top:' + (y0 + 150) + 'px;width:880px;font-weight:600;font-size:' + K.fitBox(v.que, 880, 70, 34, 26, 1.18, 0.55) + 'px;line-height:1.18;color:rgba(255,255,255,.88)', '');
    vq.textContent = v.que; K.aparece(vq, tS + 0.5, { y: 12, d: 0.4 });
  } else {
    const alto = 1205 - B0;
    const t = K.div(K.CT, '', 'position:absolute;left:60px;top:' + B0 + 'px;width:880px;font-family:SS4;font-weight:900;font-size:' + K.fitBox(D.titulo, 880, alto, 62, 34, 1.08, 0.56) + 'px;line-height:1.08;color:#fff;text-wrap:balance', '');
    t.textContent = D.titulo; K.aparece(t, tS, { y: 20, d: 0.55 });
  }
  if (D.fuente) {
    const txt = 'Fuente: ' + D.fuente + ', según la nota de Radar Balcarce';
    const fu = K.div(K.CT, '', 'position:absolute;left:60px;top:1213px;width:880px;font-weight:500;font-size:' + K.fit(txt, 880, 26, 17, 0.55) + 'px;letter-spacing:.02em;color:rgba(255,255,255,.62);white-space:nowrap', '');
    fu.textContent = txt; K.aparece(fu, tS + 1.1, { y: 8, d: 0.4 });
  }
}
