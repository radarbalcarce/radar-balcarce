/* Escenas de DATOS del kit 3.0 (20/11/2026): el gráfico animado que se suma dentro del repaso y del reel de una nota (`RadarDatos.grafico`) y los trozos de «El número del día» (cifra que cuenta, barras
   de comparación). Se carga después de kit.js y antes de la plantilla. Todo se mueve con la misma línea de tiempo GSAP del kit (K.TL, determinista: los números que cuentan se escriben cuadro por cuadro).
   Zona segura (Hernán, 19/11): el contenido va entre las filas 372 y 1236 y dentro de x = 60..920 (la hoja de papel va de borde a borde); los subtítulos siguen en 1264-1480; nada debajo de la 1480 ni en los 140 px de la derecha. */
window.RadarDatos = (function () {
  const TINTA = '#14161A', PAPEL = '#FAF8F3', ROJO = '#C7381C', LINEA = '#E4DFD2', PISTA = '#EFEADB', SUAVE = '#5C6068';
  /* 2350000 -> «2.350.000», 12.5 -> «12,5» (con `dec` decimales fijos) */
  function fmt(n, dec) { const s = Math.abs(n).toFixed(dec || 0); const p = s.split('.'); return (n < 0 ? '−' : '') + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (p[1] ? ',' + p[1] : ''); }
  /* un número que cuenta de a hasta b, escrito cuadro por cuadro en la línea de tiempo (se puede saltar a cualquier instante); al final queda el texto exacto `final` */
  function contar(K, el, a, b, t, d, dec, pre, suf, final, ease) {
    const e = gsap.parseEase(ease || 'power3.out'), n = Math.max(2, Math.round(d * 30));
    el.textContent = (pre || '') + fmt(a, dec) + (suf || '');
    for (let i = 0; i <= n; i++) K.TL.set(el, { textContent: i === n && final != null ? final : (pre || '') + fmt(a + (b - a) * e(i / n), dec) + (suf || '') }, t + (d * i) / n);
  }
  const aparecer = (K, el, t, o) => K.aparece(el, t, o);
  const svgEl = (p, tag, at) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in at) e.setAttribute(k, at[k]); p.appendChild(e); return e; };

  /* El gráfico: una tarjeta de papel (filas 372 a 1236) que sube sobre la foto de la nota entre t0 y t1 y dibuja barras que se llenan o una línea que se traza.
     G = { tipo: 'barras'|'linea', titulo, fuente, color, filas: [{ etiqueta, n, texto }], dec, pre, suf, t0, t1 }. */
  function grafico(K, G) {
    const TL = K.TL, div = K.div, t0 = G.t0, t1 = G.t1, dur = t1 - t0, N = G.filas.length;
    const X = 0, Y = 372, AN = 1080, AL = 864, CX = 60, CW = 860; /* tarjeta y contenido (coordenadas locales de la tarjeta) */
    const card = div(K.ROOT, '', 'position:absolute;left:' + X + 'px;top:' + Y + 'px;width:' + AN + 'px;height:' + AL + 'px;background:' + PAPEL + ';border-radius:28px 28px 0 0;box-shadow:0 -10px 50px rgba(0,0,0,.35);overflow:hidden;z-index:26');
    TL.set(card, { autoAlpha: 0 }, 0); TL.set(card, { autoAlpha: 1 }, t0);
    TL.fromTo(card, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.5, ease: 'power3.inOut' }, t0);
    TL.to(card, { autoAlpha: 0, duration: 0.2 }, t1 - 0.05);
    div(card, '', 'position:absolute;left:0;top:0;width:' + AN + 'px;height:14px;background:' + G.color);
    const tam = K.fitBox(G.titulo, CW, 128, 56, 34, 1.08, 0.56);
    const tit = div(card, '', 'position:absolute;left:' + CX + 'px;top:38px;width:' + CW + 'px;font-family:SS4;font-weight:900;font-size:' + tam + 'px;line-height:1.08;color:' + TINTA, '');
    tit.textContent = G.titulo;
    K.aparece(tit, t0 + 0.2, { y: 24, d: 0.5 });
    const raya = div(card, '', 'position:absolute;left:' + CX + 'px;top:182px;width:120px;height:6px;background:' + G.color);
    TL.fromTo(raya, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power3.out', transformOrigin: 'left' }, t0 + 0.3);
    const AREA_Y = 214, AREA_H = 500;
    const area = div(card, '', 'position:absolute;left:' + CX + 'px;top:' + AREA_Y + 'px;width:' + CW + 'px;height:' + AREA_H + 'px');
    const ventana = Math.max(0.8, dur - 0.5 - 1.0); /* tiempo disponible para dibujar; el último segundo queda quieto para leer */
    const max = Math.max.apply(null, G.filas.map((f) => f.n)), min = Math.min.apply(null, G.filas.map((f) => f.n));
    const imax = G.filas.findIndex((f) => f.n === max);
    if (G.tipo === 'barras') {
      const rowH = Math.min(112, Math.floor(AREA_H / N)), fl = rowH >= 90 ? 30 : rowH >= 70 ? 26 : 23, vf = fl + 8, bh = Math.min(46, Math.round(rowH * 0.36));
      const vw = Math.max.apply(null, G.filas.map((f) => f.texto.length)) * vf * 0.6, maxW = Math.max(300, CW - vw - 24);
      const paso = Math.min(0.45, (ventana * 0.8) / N), bd = Math.min(0.9, ventana - paso * (N - 1));
      G.filas.forEach((f, i) => {
        const ti = t0 + 0.5 + i * paso, y = i * rowH, w = Math.max(6, (maxW * f.n) / max), esMax = i === imax;
        const fila = div(area, '', 'position:absolute;left:0;top:' + y + 'px;width:' + CW + 'px;height:' + rowH + 'px');
        const et = div(fila, '', 'position:absolute;left:0;top:0;white-space:nowrap;font-weight:600;font-size:' + fl + 'px;line-height:1.15;color:' + TINTA, ''); et.textContent = f.etiqueta;
        const top = Math.round(fl * 1.15) + 6;
        div(fila, '', 'position:absolute;left:0;top:' + top + 'px;width:' + maxW + 'px;height:' + bh + 'px;border-radius:7px;background:' + PISTA);
        const rel = div(fila, '', 'position:absolute;left:0;top:' + top + 'px;width:' + w + 'px;height:' + bh + 'px;border-radius:7px;background:' + (esMax ? ROJO : G.color));
        TL.fromTo(rel, { scaleX: 0 }, { scaleX: 1, duration: bd, ease: 'power3.out', transformOrigin: 'left' }, ti);
        const v = div(fila, '', 'position:absolute;left:' + (w + 16) + 'px;top:' + (top + bh / 2 - vf * 0.62) + 'px;font-weight:700;font-size:' + vf + 'px;line-height:1.2;white-space:nowrap;font-variant-numeric:tabular-nums;color:' + (esMax ? ROJO : TINTA), '');
        K.aparece(fila, ti - 0.1, { y: 14, d: 0.4 });
        contar(K, v, 0, f.n, ti, bd, G.dec, G.pre, G.suf, f.texto, 'power3.out');
      });
    } else {
      const svg = svgEl(area, 'svg', { width: CW, height: AREA_H, viewBox: '0 0 ' + CW + ' ' + AREA_H }); svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
      const L = 70, R = CW - 70, T = 60, B = 400, base = min >= 0 ? 0 : min, rango = (max - base) || 1;
      const px = (i) => (N === 1 ? (L + R) / 2 : L + ((R - L) * i) / (N - 1)), py = (v) => B - ((v - base) / rango) * (B - T);
      svgEl(svg, 'line', { x1: 0, y1: B, x2: CW, y2: B, stroke: LINEA, 'stroke-width': 3 });
      const d = G.filas.map((f, i) => (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(f.n).toFixed(1)).join(' ');
      const trazo = svgEl(svg, 'path', { d: d, fill: 'none', stroke: G.color, 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1 });
      trazo.style.strokeDasharray = '1 1';
      const T_LINEA = Math.min(2.8, ventana * 0.9), ini = t0 + 0.5;
      TL.fromTo(trazo, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: T_LINEA, ease: 'none' }, ini);
      const lf = N <= 5 ? 26 : N <= 6 ? 23 : 21, vf = N <= 6 ? 32 : 26, lw = Math.min(150, Math.floor((R - L) / Math.max(1, N - 1)) - 6);
      G.filas.forEach((f, i) => {
        const ti = ini + (N === 1 ? 0 : (i / (N - 1)) * T_LINEA), esMax = i === imax;
        const pt = svgEl(svg, 'circle', { cx: px(i).toFixed(1), cy: py(f.n).toFixed(1), r: 13, fill: esMax ? ROJO : G.color, stroke: PAPEL, 'stroke-width': 4 });
        TL.set(pt, { opacity: 0 }, 0); TL.fromTo(pt, { opacity: 0, scale: 0.2, transformOrigin: px(i).toFixed(1) + 'px ' + py(f.n).toFixed(1) + 'px' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, ti);
        const v = div(area, '', 'position:absolute;left:' + (px(i) - 75) + 'px;width:150px;text-align:center;top:' + (py(f.n) - vf - 22) + 'px;font-weight:700;font-size:' + vf + 'px;line-height:1.1;white-space:nowrap;font-variant-numeric:tabular-nums;color:' + (esMax ? ROJO : TINTA), '');
        v.textContent = f.texto; K.aparece(v, ti, { y: 10, d: 0.35 });
        const e = div(area, '', 'position:absolute;left:' + (px(i) - lw / 2) + 'px;width:' + lw + 'px;text-align:center;top:' + (B + 20) + 'px;font-weight:600;font-size:' + lf + 'px;line-height:1.1;color:#3A3E45', ''); e.textContent = f.etiqueta;
        K.aparece(e, ti - 0.05, { y: 8, d: 0.3 });
      });
    }
    const fu = div(card, '', 'position:absolute;left:' + CX + 'px;top:742px;width:' + CW + 'px;font-weight:500;font-size:24px;line-height:1.25;color:' + SUAVE, ''); fu.textContent = 'Fuente: ' + G.fuente;
    K.aparece(fu, t0 + Math.min(dur - 0.9, 1.4), { y: 8, d: 0.4 });
    return card;
  }

  return { grafico, contar, fmt, aparecer };
})();
