/* Plantilla de la farmacia de turno (1 a 3 por día) del kit 3.0: verde de Farmacias, fondo gráfico propio (degradado con cruces que suben y una cruz grande que se dibuja y late),
   el nombre grande, la dirección en dos renglones (sin «N°») y el teléfono. Con una sola farmacia: nombre, dirección, teléfono y «Turno hasta…»; con 2 o 3: una ficha por farmacia.
   La letra se achica hasta que el nombre entre. Lee SPEC.datos (desde-pieza.mjs). */
const VERDE = '#13804A', VERDE_OSC = '#0B3D2A';
const SERIF = 'font-family:SS4;font-weight:900;line-height:1.04;color:#fff;text-shadow:0 5px 26px rgba(0,0,0,.55);';
const SANS = 'font-weight:700;color:#fff;text-shadow:0 3px 18px rgba(0,0,0,.6);';
const CRUZ = 'M80 10h40a10 10 0 0 1 10 10v50h50a10 10 0 0 1 10 10v40a10 10 0 0 1-10 10h-50v50a10 10 0 0 1-10 10H80a10 10 0 0 1-10-10v-50H20a10 10 0 0 1-10-10V80a10 10 0 0 1 10-10h50V20a10 10 0 0 1 10-10z';
function cruzSvg(size, stroke, fill) { return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 200 200" style="overflow:visible"><path class="cz" d="' + CRUZ + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="4" stroke-linejoin="round"/></svg>'; }
function fondoGrafico(K, cont, t0, t1, idx, estatico) {
  const TL = K.TL;
  K.div(cont, '', 'position:absolute;inset:0;background:linear-gradient(' + (160 + idx * 25) + 'deg,#0F6B3F 0%,' + VERDE_OSC + ' 55%,#06201A 100%)');
  for (let i = 0; i < 14; i++) {
    const r = K.rng(idx * 31 + i + 3)(), sz = 46 + (i % 3) * 20;
    const c = K.div(cont, '', 'position:absolute;left:' + ((i * 211 + idx * 90) % 1000) + 'px;top:' + ((i * 397) % 1900) + 'px;opacity:' + (0.05 + r * 0.07), cruzSvg(sz, 'none', '#fff'));
    if (!estatico) TL.to(c, { y: -420 - r * 300, duration: 9 + r * 6, ease: 'none', repeat: 4 }, t0);
  }
  const cx = [860, 330, 860][idx % 3], cy = [1230, 1250, 1210][idx % 3], S = 560;
  const halo = K.div(cont, '', 'position:absolute;left:' + (cx - 420) + 'px;top:' + (cy - 420) + 'px;width:840px;height:840px;border-radius:50%;background:radial-gradient(closest-side,rgba(46,200,120,.3),rgba(46,200,120,0))');
  const g = K.div(cont, '', 'position:absolute;left:' + (cx - S / 2) + 'px;top:' + (cy - S / 2) + 'px;width:' + S + 'px;height:' + S + 'px;filter:drop-shadow(0 0 40px rgba(70,230,150,.55))', cruzSvg(S, 'rgba(123,224,174,.7)', 'rgba(255,255,255,0)'));
  const path = g.querySelector('path'), L = path.getTotalLength();
  path.style.strokeDasharray = L; path.style.strokeDashoffset = estatico ? 0 : L;
  if (estatico) { path.setAttribute('fill', 'rgba(31,168,98,.3)'); path.setAttribute('stroke', 'rgba(123,224,174,.7)'); }
  else {
    TL.fromTo(path, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut' }, t0 + 0.15);
    TL.fromTo(path, { attr: { fill: 'rgba(31,168,98,0)' } }, { attr: { fill: 'rgba(31,168,98,.3)' }, duration: 0.6 }, t0 + 1.2);
    TL.fromTo(g, { scale: 1 }, { scale: 1.06, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: Math.ceil((t1 - t0) / 1.1) + 1, transformOrigin: '50% 50%' }, t0 + 1.8);
    TL.fromTo(halo, { opacity: 0.5 }, { opacity: 1, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: Math.ceil((t1 - t0) / 1.1) + 1 }, t0);
  }
}
const CLIPS = [null, 'inset(0 100% 0 0)', 'inset(100% 0 0 0)'];
function plano(K, t0, t1, idx) {
  const pl = K.div(K.PL, 'plano'); pl.style.zIndex = idx;
  fondoGrafico(K, pl, t0, t1, idx, false);
  if (t0 > 0) {
    K.TL.set(pl, { autoAlpha: 0 }, 0); K.TL.set(pl, { autoAlpha: 1 }, t0);
    const c = CLIPS[idx % 3 ? idx % 3 : 1];
    if (c) K.TL.fromTo(pl, { clipPath: c }, { clipPath: 'inset(0 0 0 0)', duration: 0.5, ease: 'power3.inOut' }, t0);
  }
  return pl;
}
const tamNombre = (K, n, max, min) => K.fit(n, 960, max, min, 0.52);
function tapa(K, S) {
  const T = K.TAPA, D = S.datos, N = D.nombres, uno = D.modo === 1;
  const bg = K.div(T, '', 'position:absolute;inset:0;overflow:hidden');
  fondoGrafico(K, bg, 0, 3, 0, true);
  K.div(T, '', 'position:absolute;left:60px;top:315px;height:58px;padding:0 24px;display:flex;align-items:center;background:' + VERDE + ';color:#fff;font-weight:700;font-size:28px;letter-spacing:.16em;text-transform:uppercase;border-radius:4px;z-index:6', uno ? 'Farmacia de turno' : 'Farmacias de turno');
  K.div(T, '', 'position:absolute;left:60px;top:' + (uno ? 500 : 480) + 'px;z-index:6;white-space:nowrap;font-size:' + (uno ? 150 : 120) + 'px;' + SERIF, 'De turno hoy');
  if (uno) {
    const tn = tamNombre(K, N[0], 190, 90);
    K.div(T, '', 'position:absolute;left:60px;top:720px;z-index:6;white-space:nowrap;font-size:' + tn + 'px;letter-spacing:-.02em;line-height:1;' + SANS, N[0]);
    const y = 720 + Math.round(tn * 1.1) + 20;
    K.div(T, '', 'position:absolute;left:60px;top:' + y + 'px;z-index:6;white-space:nowrap;font-size:' + K.fit(D.dir[0][0], 960, 72, 44, 0.56) + 'px;' + SANS, D.dir[0][0]);
    if (D.dir[0][1]) K.div(T, '', 'position:absolute;left:60px;top:' + (y + 90) + 'px;z-index:6;white-space:nowrap;font-size:54px;font-weight:600;opacity:.95;' + SANS, D.dir[0][1]);
    K.div(T, '', 'position:absolute;left:60px;top:' + (y + 210) + 'px;z-index:6;height:92px;padding:0 36px;display:flex;align-items:center;background:#FAF8F3;color:#14161A;border-radius:46px;font-weight:700;font-size:46px;white-space:nowrap', (D.tel[0] ? 'Tel. ' + D.tel[0] + ' · ' : '') + 'hasta 8:30');
  } else {
    N.forEach((n, i) => {
      const y = 690 + i * 230;
      K.div(T, '', 'position:absolute;left:60px;top:' + y + 'px;width:64px;height:64px;border-radius:50%;background:' + VERDE + ';color:#fff;font-weight:700;font-size:38px;display:flex;align-items:center;justify-content:center;z-index:6', String(i + 1));
      K.div(T, '', 'position:absolute;left:150px;top:' + (y - 14) + 'px;z-index:6;white-space:nowrap;font-size:' + K.fit(n, 870, 96, 56, 0.52) + 'px;letter-spacing:-.02em;line-height:1.05;' + SANS, n);
      K.div(T, '', 'position:absolute;left:150px;top:' + (y + 92) + 'px;z-index:6;white-space:nowrap;font-size:' + K.fit(D.dir[i][0] + (D.dir[i][1] ? ' ' + D.dir[i][1] : ''), 870, 50, 32, 0.52) + 'px;font-weight:600;' + SANS, D.dir[i][0] + (D.dir[i][1] ? ' ' + D.dir[i][1] : ''));
    });
  }
}
function escenas(K, S) {
  const D = S.datos, TL = K.TL, FIN = S.dur - 1.5, N = D.nombres, m = D.marcas;
  if (D.modo === 1) {
    const tNom = m[0], tDir = Math.max(m[1], m[0] + 0.8), tTel = Math.max(m[2], tDir + 0.8);
    plano(K, 0, tNom, 0); plano(K, tNom, tTel, 1); plano(K, tTel, FIN, 2);
    const t1 = K.div(K.CT, '', 'position:absolute;left:60px;top:520px;width:900px');
    K.linea(t1, 'De turno', '', SERIF + 'font-size:150px', 0.5, { salida: tNom - 0.05 });
    K.linea(t1, 'hoy', '', SERIF + 'font-size:150px', 0.65, { salida: tNom - 0.05 });
    const tn = tamNombre(K, N[0], 180, 84);
    const t2 = K.div(K.CT, '', 'position:absolute;left:60px;top:430px;width:960px');
    K.linea(t2, N[0], '', SANS + 'font-size:' + tn + 'px;letter-spacing:-.02em;line-height:1.05;white-space:nowrap', tNom + 0.1, { salida: tTel - 0.05 });
    K.linea(t2, D.dir[0][0], '', SANS + 'font-size:' + K.fit(D.dir[0][0], 960, 68, 40, 0.56) + 'px;margin-top:10px;white-space:nowrap', tDir, { salida: tTel - 0.05 });
    if (D.dir[0][1]) K.linea(t2, D.dir[0][1], '', SANS + 'font-size:52px;font-weight:600;opacity:.95;white-space:nowrap', tDir + 0.12, { salida: tTel - 0.05 });
    const t3 = K.div(K.CT, '', 'position:absolute;left:60px;top:430px;width:960px');
    if (D.tel[0]) K.linea(t3, 'Tel. ' + D.tel[0], '', SANS + 'font-size:140px;letter-spacing:-.02em;font-variant-numeric:tabular-nums;white-space:nowrap', tTel + 0.1);
    K.linea(t3, D.hasta, '', SANS + 'font-size:' + (D.tel[0] ? 58 : 84) + 'px;font-weight:600;margin-top:12px;white-space:nowrap', tTel + 0.3);
  } else {
    const tt = m.concat([FIN]);
    plano(K, 0, tt[0], 0);
    N.forEach((n, i) => {
      plano(K, tt[i], tt[i + 1], i + 1);
      const b = K.div(K.CT, '', 'position:absolute;left:60px;top:470px;width:960px');
      K.linea(b, n, '', SANS + 'font-size:' + tamNombre(K, n, 160, 76) + 'px;letter-spacing:-.02em;line-height:1.05;white-space:nowrap', tt[i] + 0.12, { salida: tt[i + 1] - 0.05 });
      K.linea(b, D.dir[i][0], '', SANS + 'font-size:' + K.fit(D.dir[i][0], 960, 64, 40, 0.56) + 'px;margin-top:10px;white-space:nowrap', tt[i] + 0.3, { salida: tt[i + 1] - 0.05 });
      if (D.dir[i][1]) K.linea(b, D.dir[i][1], '', SANS + 'font-size:48px;font-weight:600;opacity:.95;white-space:nowrap', tt[i] + 0.4, { salida: tt[i + 1] - 0.05 });
      if (D.tel[i]) K.linea(b, 'Tel. ' + D.tel[i], '', SANS + 'font-size:56px;margin-top:14px;font-variant-numeric:tabular-nums;white-space:nowrap', tt[i] + 0.55, { salida: tt[i + 1] - 0.05 });
      const c = K.div(K.CT, '', 'position:absolute;right:120px;top:290px;height:58px;padding:0 20px;display:flex;align-items:center;background:rgba(20,22,26,.72);color:#fff;font-weight:700;font-size:30px;letter-spacing:.12em;border-radius:4px', (i + 1) + '/' + N.length);
      K.aparece(c, tt[i] + 0.1, { y: 0, from: { x: 40 }, salida: tt[i + 1] - 0.05 });
    });
    const t0 = K.div(K.CT, '', 'position:absolute;left:60px;top:520px;width:900px');
    K.linea(t0, 'De turno', '', SERIF + 'font-size:150px', 0.5, { salida: tt[0] - 0.05 });
    K.linea(t0, 'hoy', '', SERIF + 'font-size:150px', 0.65, { salida: tt[0] - 0.05 });
    const pie = K.div(K.CT, '', 'position:absolute;left:60px;top:990px;height:68px;padding:0 30px;display:flex;align-items:center;background:#FAF8F3;color:#14161A;border-radius:34px;font-weight:700;font-size:36px;white-space:nowrap', D.hasta);
    K.aparece(pie, 0.9, { y: 20 });
  }
}
