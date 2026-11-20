/* Kit Radar Balcarce reels 3.0: Radar.run(SPEC, escenas). Todo se mueve con una sola linea de tiempo GSAP (determinista). */
window.Radar = (function () {
  const W = 1080, H = 1920;
  function div(parent, cls, css, html) { const d = document.createElement('div'); if (cls) d.className = cls; if (css) d.style.cssText = css; if (html != null) d.innerHTML = html; parent.appendChild(d); return d; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const FOTO_ALTO = 980; /* el alto de TODAS las fotos de las escenas; el texto va debajo, entre FOTO_ALTO y la fila 1255, y los subtítulos terminan antes de la fila 1480 (la interfaz de Instagram empieza en la 1540) */
  let TL, ROOT, PL, CT, S;

  /* La geometria de una foto (puro): va SIEMPRE a todo el ancho (1080), pegada arriba (y=0), sin margenes. Se permite recortar hasta un 34 % del lado que sobra:
     alto mostrado = min(1090, altoNaturalA1080 / 0.66), con un minimo de 900. El panel empieza donde termina la foto (PT).
     modo 'cobertura': la foto llena el ancho y el alto (recorte centrado a los lados; en vertical, sesgado hacia arriba, y en retratos sin recortar la cabeza).
     modos 'ancha' (panoramica extrema) y 'angosta' (retrato muy angosto): aun recortando 34 % no llena; se usa un relleno desenfocado oscuro, sin sombra ni borde de tarjeta.
     'sin': sin foto, fondo de la marca. Devuelve { modo, PT, iw, ih, left, top }. */
  function geom(o) {
    o = o || {};
    /* ALTO FIJO (las escenas de video): todas las fotos de una pieza miden lo mismo (FOTO_ALTO) y el panel de texto empieza siempre en la misma fila. La foto cubre de borde a borde con recorte centrado
       (sesgado hacia arriba para no cortar cabezas: en vertical se recorta más abajo que arriba); si es muy apaisada se recortan los costados. Sin foto, el fondo de la marca con el mismo alto. */
    if (!o.maxH && !o.minH) {
      const PT = o.fijo || FOTO_ALTO;
      if (!o.src) return { modo: 'sin', PT, iw: W, ih: PT, left: 0, top: 0 };
      const s = Math.max(W / o.w, PT / o.h), iw = o.w * s, ih = o.h * s, sesgo = o.h > o.w ? 0.15 : 0.35;
      return { modo: 'cobertura', PT, iw, ih, left: (W - iw) / 2, top: -(ih - PT) * sesgo };
    }
    const MAXH = o.maxH || 1090, MINH = o.minH || 900, F = 0.66;
    if (!o || !o.src) return { modo: 'sin', PT: MAXH, iw: W, ih: MAXH, left: 0, top: 0 };
    const Hn = o.h * W / o.w;
    if (Hn / F < MINH) { const s = W / (o.w * F), iw = o.w * s, ih = o.h * s; return { modo: 'ancha', PT: MINH, iw, ih, left: (W - iw) / 2, top: (MINH - ih) / 2 }; }
    if (Hn > MAXH / F) { const iw = o.w * MAXH / o.h; return { modo: 'angosta', PT: MAXH, iw, ih: MAXH, left: (W - iw) / 2, top: 0 }; }
    const PT = Math.round(Math.min(MAXH, Hn / F)), s = Math.max(W / o.w, PT / o.h), iw = o.w * s, ih = o.h * s, sesgo = o.h > o.w ? 0 : 0.35;
    return { modo: 'cobertura', PT, iw, ih, left: (W - iw) / 2, top: -(ih - PT) * sesgo };
  }
  /* la region de la foto (0..PT) con la foto adentro; `parent` la recibe. Devuelve { reg, g, im } */
  function regionDeFoto(parent, o) {
    const g = geom(o), reg = div(parent, '', 'position:absolute;left:0;top:' + (o.off || 0) + 'px;width:' + W + 'px;height:' + g.PT + 'px;overflow:hidden;background:#14161A');
    if (g.modo === 'sin') {
      div(reg, '', 'position:absolute;inset:0;background:' + (o.grad || 'linear-gradient(165deg,#222B38 0%,#14161A 58%,#0B0D10 100%)'));
      return { reg, g, im: null };
    }
    if (g.modo !== 'cobertura') { // relleno desenfocado, oscuro y parejo
      const bg = new Image(); bg.src = o.src; const cv = Math.max(W / o.w, g.PT / o.h) * 1.2;
      bg.style.cssText = 'position:absolute;max-width:none;width:' + o.w * cv + 'px;height:' + o.h * cv + 'px;left:' + (W - o.w * cv) / 2 + 'px;top:' + (g.PT - o.h * cv) / 2 + 'px;filter:blur(40px) ' + (o.fondoFiltro || 'brightness(.32) saturate(.9)');
      reg.appendChild(bg);
    }
    const wrap = div(reg, '', 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + g.PT + 'px');
    const im = new Image(); im.src = o.src;
    im.style.cssText = 'position:absolute;max-width:none;width:' + g.iw + 'px;height:' + g.ih + 'px;left:' + g.left + 'px;top:' + g.top + 'px;filter:' + (o.filtro || 'none');
    wrap.appendChild(im);
    return { reg, g, im, wrap };
  }
  /* foto a todo el ancho, pegada arriba, con movimiento suave (zoom lento hacia adentro 1.00 -> 1.06, ya cubriendo: nunca se ve el borde) y, si se pide, el panel de abajo (o.panel = color; o.regla = color de la regla).
     o: src,w,h,t0,t1,entrada(corte|izq|der|arriba|abajo|fundido),de,dir,z0,z1,panel,regla; sin src: fondo de la marca con anillos. Devuelve el plano (con .PT). */
  function foto(o) {
    const pl = div(PL, 'plano'); pl.style.zIndex = o.z != null ? o.z : PL.children.length;
    const kb = div(pl, 'kb');
    const dur = (o.t1 - o.t0) + 0.5, dir = o.dir || 1;
    const R = regionDeFoto(kb, o), g = R.g; pl.PT = g.PT;
    if (g.modo === 'sin') {
      fx.anillos(R.reg, { n: 4, cx: 540, cy: o.yc || g.PT / 2, color: o.anillo || 'rgba(255,255,255,.16)', t0: o.t0, t1: o.t1 + 1, max: 6 });
    } else {
      R.wrap.style.transformOrigin = (540 + dir * 70) + 'px 0px';
      TL.fromTo(R.wrap, { scale: o.z0 || 1.0 }, { scale: o.z1 || 1.06, duration: dur, ease: 'sine.inOut' }, o.t0);
    }
    if (o.panel) div(kb, '', 'position:absolute;left:0;top:' + g.PT + 'px;width:' + W + 'px;height:' + (H - g.PT) + 'px;background:' + o.panel);
    if (o.regla) div(kb, '', 'position:absolute;left:0;top:' + g.PT + 'px;width:' + W + 'px;height:10px;background:' + o.regla);
    const e = o.entrada || 'corte', d = o.de || 0.45;
    const clips = { izq: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'], der: ['inset(0 0 0 100%)', 'inset(0 0 0 0%)'], arriba: ['inset(0 0 100% 0)', 'inset(0 0 0% 0)'], abajo: ['inset(100% 0 0 0)', 'inset(0% 0 0 0)'] };
    if (o.t0 > 0) {
      TL.set(pl, { autoAlpha: 0 }, 0);
      TL.set(pl, { autoAlpha: 1 }, o.t0);
      if (clips[e]) TL.fromTo(pl, { clipPath: clips[e][0] }, { clipPath: clips[e][1], duration: d, ease: 'power3.inOut' }, o.t0);
      else if (e === 'fundido') TL.fromTo(pl, { opacity: 0 }, { opacity: 1, duration: d }, o.t0);
    }
    return pl;
  }
  /* linea de texto que entra con mascara (sube desde abajo) */
  function linea(parent, html, cls, css, t, o) {
    o = o || {};
    const m = div(parent, 'mask ' + (cls || ''), css); const s = document.createElement('span'); s.innerHTML = html; m.appendChild(s);
    TL.set(m, { autoAlpha: 0 }, 0); TL.set(m, { autoAlpha: 1 }, t);
    TL.fromTo(s, { yPercent: 118 }, { yPercent: 0, duration: o.d || 0.5, ease: 'power4.out' }, t);
    if (o.salida != null) TL.to(m, { autoAlpha: 0, duration: 0.2 }, o.salida);
    return m;
  }
  /* elemento que aparece en t (sube y se asienta) y se va en salida */
  function aparece(el, t, o) {
    o = o || {};
    TL.set(el, { autoAlpha: 0 }, 0); TL.set(el, { autoAlpha: 1 }, t);
    TL.fromTo(el, Object.assign({ y: o.y != null ? o.y : 40, scale: o.s || 1 }, o.from || {}), { y: 0, x: 0, scale: 1, duration: o.d || 0.5, ease: o.ease || 'power3.out' }, t);
    if (o.salida != null) TL.to(el, { autoAlpha: 0, duration: 0.2 }, o.salida);
    return el;
  }
  function contar(el, a, b, t, d, o) {
    o = o || {}; const p = { v: a }, dec = o.dec || 0;
    const fmt = (v) => (dec ? v.toFixed(dec).replace('.', ',') : String(Math.round(v))) + (o.suf || '');
    el.textContent = fmt(a);
    TL.fromTo(p, { v: a }, { v: b, duration: d, ease: o.ease || 'power2.out', onUpdate() { el.textContent = fmt(p.v); } }, t);
  }
  /* tamanos de letra que entran: una linea (fit) o una caja con varias lineas (fitBox). k = ancho medio de una letra en em */
  function lineasDe(texto, ancho, size, k) {
    let n = 1, cur = 0; const esp = size * k * 0.55;
    String(texto).split(/\s+/).filter(Boolean).forEach((w) => { const wl = w.length * size * k; if (cur > 0 && cur + esp + wl > ancho) { n++; cur = wl; } else cur += (cur ? esp : 0) + wl; });
    return n;
  }
  function fit(texto, ancho, max, min, k) { k = k || 0.58; return Math.max(min, Math.min(max, Math.floor(ancho / (String(texto).length * k)))); }
  function fitBox(texto, ancho, alto, max, min, lh, k) { k = k || 0.56; for (let s = max; s >= min; s -= 2) if (lineasDe(texto, ancho, s, k) * s * lh <= alto) return s; return min; }
  /* la firma de la nota propia («Por Hernan Accomo»): una linea chica a la derecha del rotulo; NO es un credito de foto (los creditos van en el texto del posteo, nunca dentro del video) */
  function firma(texto, t0, t1, o) {
    o = o || {};
    if (!texto) return null;
    const f = div(CT, '', 'position:absolute;right:60px;top:' + (o.top || 305) + 'px;font-weight:700;font-size:30px;line-height:38px;white-space:nowrap;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.8)', '');
    f.textContent = texto; aparece(f, t0 + 0.3, { y: 0, d: 0.4, salida: t1 != null ? t1 - 0.05 : null });
    return f;
  }
  /* una foto quieta (para las tapas). Regla de la grilla del feed (recorte 4:5, filas 285-1635): las filas 0 a o.off (240) son una BANDA LISA #14161A (sin desenfoque ni espejo) y la foto empieza en la fila o.off, a todo el ancho,
     y NUNCA se recorta por arriba: si sobra alto se recorta por abajo (arriba y centrado), así la grilla pierde como mucho 45 px del borde superior de la foto y las cabezas quedan enteras. El alto de la foto es el de siempre (geom).
     Si la foto es tan apaisada que cubrir ese alto obligaría a recortar más del 40 % de los costados, va entera a todo el ancho, pegada al panel, con la banda más alta y un degradado suave hacia la foto. El rótulo de la tapa va en la banda.
     o.panel / o.regla dibujan el panel de abajo. Deja en parent.__transicion lo que hace falta para llevar la foto a su lugar de escena (alto fijo desde la fila 0): ver run(). Devuelve { PTt, ... }. */
  function fotoEstatica(parent, o) {
    const g0 = geom(o), PTt = g0.PT + (o.off || 0);
    const off = o.off || 0, AH = g0.PT; // la foto ocupa las filas off .. off + AH
    const reg = div(parent, '', 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + PTt + 'px;overflow:hidden;background:' + (o.src ? 'transparent' : '#14161A'));
    const g = Object.assign({}, g0, { PTt }); let tr = null;
    if (!o.src) {
      div(reg, '', 'position:absolute;inset:0;background:' + (o.grad || 'linear-gradient(165deg,#222B38 0%,#14161A 58%,#0B0D10 100%)'));
      [260, 520, 780, 1040].forEach((d) => div(reg, 'anillo', 'width:' + d + 'px;height:' + d + 'px;left:' + (540 - d / 2) + 'px;top:' + ((o.yc || PTt / 2.2) - d / 2) + 'px;border-color:rgba(255,255,255,.14);border-width:4px'));
    } else {
      const s0 = Math.max(W / o.w, AH / o.h), iw0 = o.w * s0, ih0 = o.h * s0;
      let from, suave = 0;
      if (1 - W / iw0 <= 0.4) from = { left: (W - iw0) / 2, top: off, width: iw0, height: ih0 };
      else { const s = W / o.w, ih = o.h * s; from = { left: 0, top: off + AH - ih, width: W, height: ih }; suave = 170; }
      const e = geom({ src: o.src, w: o.w, h: o.h, fijo: o.fijoEscena });
      /* la imagen vive en su lugar de ESCENA y la tapa la lleva a la posición de tapa con una transformación (mover y escalar con transform: sin saltos de píxel) */
      const im = new Image(); im.src = o.src;
      im.style.cssText = 'position:absolute;max-width:none;transform-origin:0 0;left:' + e.left + 'px;top:' + e.top + 'px;width:' + e.iw + 'px;height:' + e.ih + 'px';
      reg.appendChild(im);
      const band = div(reg, '', 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + Math.round(from.top + suave) + 'px;background:' + (suave ? 'linear-gradient(180deg,#14161A 0px,#14161A ' + Math.round(from.top) + 'px,rgba(20,22,26,0) 100%)' : '#14161A'));
      const sc = from.width / e.iw;
      tr = { reg, im, band, PTt, PT: e.PT, x0: from.left - e.left, y0: from.top - e.top, s0: sc };
    }
    parent.__transicion = tr;
    if (o.panel) div(parent, '', 'position:absolute;left:0;top:' + PTt + 'px;width:' + W + 'px;height:' + (H - PTt) + 'px;background:' + o.panel);
    if (o.regla) div(parent, '', 'position:absolute;left:0;top:' + PTt + 'px;width:' + W + 'px;height:10px;background:' + o.regla);
    return g;
  }
  const fx = {
    lluvia(parent, o) {
      const r = rng(o.seed || 7), n = o.n || 34;
      const lay = div(parent, '', 'position:absolute;left:-300px;top:0;width:1680px;height:1920px;overflow:hidden;pointer-events:none;transform:rotate(12deg);transform-origin:50% 0;opacity:' + (o.alpha != null ? o.alpha : 1));
      for (let i = 0; i < n; i++) {
        const g = div(lay, 'gota'); const len = 70 + r() * 110, d = 0.55 + r() * 0.45;
        g.style.height = len + 'px'; g.style.opacity = (0.25 + r() * 0.4).toFixed(2); g.style.left = (r() * 1680) + 'px';
        const rep = Math.ceil((o.t1 - o.t0) / d) + 1;
        TL.fromTo(g, { y: -300 }, { y: 2300, duration: d, ease: 'none', repeat: rep }, o.t0 + r() * d);
      }
      TL.set(lay, { autoAlpha: 0 }, 0); TL.set(lay, { autoAlpha: 1 }, o.t0);
      if (o.t1 < 1e3) TL.to(lay, { autoAlpha: 0, duration: 0.3 }, o.t1);
      return lay;
    },
    estrellas(parent, o) {
      const r = rng(o.seed || 3), alto = o.alto || 900;
      const lay = div(parent, '', 'position:absolute;left:0;top:0;width:1080px;height:' + alto + 'px;overflow:hidden');
      for (let i = 0; i < (o.n || 60); i++) {
        const s = div(lay, 'estrella'); const z = 2 + r() * 4;
        s.style.cssText += `;left:${r() * 1080}px;top:${r() * alto}px;width:${z}px;height:${z}px;opacity:${(.4 + r() * .6).toFixed(2)}`;
        TL.to(s, { opacity: 0.08 + r() * 0.25, duration: 0.8 + r() * 1.6, yoyo: true, repeat: Math.ceil((o.t1 || 20) / 1.2), ease: 'sine.inOut' }, r());
      }
      return lay;
    },
    anillos(parent, o) {
      const lay = div(parent, '', 'position:absolute;left:0;top:0;width:1080px;height:1920px;overflow:hidden');
      for (let i = 0; i < (o.n || 4); i++) {
        const a = div(lay, 'anillo'); const sz = 300;
        a.style.cssText += `;width:${sz}px;height:${sz}px;left:${(o.cx || 540) - sz / 2}px;top:${(o.cy || 700) - sz / 2}px;border-color:${o.color || 'rgba(255,255,255,.5)'}`;
        TL.fromTo(a, { scale: 0.2, opacity: 0.7 }, { scale: o.max || 5, opacity: 0, duration: 3.2, ease: 'power1.out', repeat: Math.ceil((o.t1 || 12) / 3.2) + 1 }, (o.t0 || 0) + i * 0.8);
      }
      return lay;
    }
  };

  function run(spec, escenas, tapaFn) {
    S = spec; ROOT = document.getElementById('root');
    const T0 = spec.T0 || 0.8;
    const M = gsap.timeline({ paused: true });
    TL = gsap.timeline();           // contenido: su reloj arranca en T0 (despues de la tapa)
    PL = div(ROOT, 'abs', 'inset:0');
    if (spec.video) {              // fondo de video ya preparado con ffmpeg (1080x1920, dura T0 + dur)
      const v = document.createElement('video'); v.id = 'fondo'; v.className = 'clip'; v.muted = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
      v.setAttribute('data-start', '0'); v.setAttribute('data-duration', String(+(spec.dur + T0).toFixed(2))); v.setAttribute('data-track-index', '0');
      v.src = spec.video; v.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1920px;z-index:0;object-fit:cover';
      ROOT.insertBefore(v, PL);
    }
    const scrim = div(ROOT, 'abs', 'inset:0;z-index:20;pointer-events:none;background:' + (spec.scrim || 'linear-gradient(0deg,rgba(8,10,14,.80) 0%,rgba(8,10,14,.62) 22%,rgba(8,10,14,.18) 42%,rgba(8,10,14,0) 52%),linear-gradient(180deg,rgba(8,10,14,.45) 0%,rgba(8,10,14,0) 20%)'));
    CT = div(ROOT, 'abs', 'inset:0;z-index:25');
    const K = { W, H, div, foto, linea, aparece, contar, fx, fit, fitBox, lineasDe, fotoEstatica, geom, firma, TL, PL, CT, ROOT, rng, clamp, SC: scrim, T0, M, kit: spec.kit || 'k1' };
    escenas(K, spec);
    if (spec.rotulo) {
      const r = div(ROOT, '', ''); r.id = 'rotulo'; r.style.cssText += `;background:${spec.rotulo.bg};color:${spec.rotulo.fg || '#fff'};z-index:30`; r.textContent = spec.rotulo.txt;
      TL.set(r, { autoAlpha: 0 }, 0); TL.set(r, { autoAlpha: 1 }, 0.15); TL.fromTo(r, { x: -60 }, { x: 0, duration: 0.5, ease: 'power3.out' }, 0.15);
    }
    const subs = div(ROOT, '', 'z-index:30'); subs.id = 'subs'; if (spec.subsTop != null) subs.style.top = spec.subsTop + 'px';
    const grupos = {}; spec.palabras.forEach((p, i) => { (grupos[p.g] = grupos[p.g] || []).push(i); });
    const gk = Object.keys(grupos).map(Number).sort((a, b) => a - b);
    const hl = spec.hl || { bg: '#C7381C', fg: '#fff' };
    const SF = (spec.subs && spec.subs.fg) || '#fff', SH = (spec.subs && spec.subs.sh != null) ? spec.subs.sh : '0 3px 14px rgba(0,0,0,.75)';
    gk.forEach((g, gi) => {
      const idx = grupos[g], d = div(subs, 'sg'); const chars = idx.reduce((s, i) => s + spec.palabras[i].w.length, 0);
      if (chars > 15) d.classList.add('ch');
      idx.forEach((i) => { const s = document.createElement('span'); s.className = 'sw'; s.textContent = spec.palabras[i].w; s.id = 'w' + i; d.appendChild(s); });
      const first = spec.palabras[idx[0]], last = spec.palabras[idx[idx.length - 1]];
      const nxt = grupos[gk[gi + 1]] ? spec.palabras[grupos[gk[gi + 1]][0]].a : 1e9;
      const a = Math.max(first.a - 0.04, 0), b = Math.min(last.b + 0.1, nxt - 0.07, spec.dur - 1.5);
      TL.set(d, { opacity: 1 }, a);
      TL.fromTo(d, { y: 22, scale: 0.94 }, { y: 0, scale: 1, duration: 0.15, ease: 'back.out(2.2)' }, a);
      TL.set(d, { opacity: 0 }, b);
      idx.forEach((i) => {
        const p = spec.palabras[i], el = '#w' + i;
        TL.set(el, { color: SF, textShadow: SH, opacity: 0 }, 0); TL.set(el, { opacity: 1 }, p.a); /* la palabra no se ve hasta que se dice */
        TL.set(el, { backgroundColor: hl.bg, color: hl.fg, textShadow: 'none' }, p.a);
        TL.set(el, { backgroundColor: 'rgba(0,0,0,0)', color: SF, textShadow: SH }, Math.max(p.b, p.a + 0.05));
      });
    });
    const tc = spec.dur - 1.5;
    if (K.kit === 'k2') {
      const mk = div(ROOT, '', 'z-index:40', 'Radar Balcarce'); mk.id = 'marca';
      const br = div(ROOT, '', 'z-index:40', '<i></i>'); br.id = 'mbarra';
      TL.set([mk, br], { autoAlpha: 0 }, 0); TL.set([mk, br], { autoAlpha: 1 }, 0.1);
      TL.fromTo(mk, { y: 10 }, { y: 0, duration: 0.4, ease: 'power3.out' }, 0.1);
      TL.to('#mbarra i', { scaleX: 1, duration: tc, ease: 'none' }, 0);
      TL.to([mk, br], { autoAlpha: 0, duration: 0.05 }, tc + 0.3);
    }
    const c = div(ROOT, '', '', '<div class="cf">Radar <b>Balcarce</b></div><div class="raya"></div><div class="cu">radarbalcarce.com</div>'); c.id = 'cierre';
    TL.fromTo(c, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.4, ease: 'power3.inOut' }, tc);
    TL.fromTo('#cierre .cf', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power4.out' }, tc + 0.25);
    TL.to('#cierre .raya', { width: 560, duration: 0.45, ease: 'power3.out' }, tc + 0.45);
    TL.fromTo('#cierre .cu', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35 }, tc + 0.6);
    TL.set({}, {}, spec.dur);
    M.add(TL, T0);
    // tapa: es la imagen del feed y los primeros 0,8 s del video
    if (tapaFn) {
      const tp = div(ROOT, '', ''); tp.id = 'tapa';
      tapaFn(Object.assign({}, K, { TAPA: tp, TL: M }), spec);
      /* marca al pie de la TAPA, dentro del recorte 1080x1350 (base y 1585): «Radar Balcarce» (bicolor) a la izquierda y radarbalcarce.com a la derecha, una en cada punta; se va con la cortina */
      const mk = (tinta, rojo) => '<span style="font-family:SS4;font-weight:900;font-size:44px;letter-spacing:-.02em;color:' + tinta + '">Radar <b style="font-weight:900;color:' + rojo + '">Balcarce</b></span><span style="font-family:Inter;font-weight:600;font-size:28px;color:' + tinta + ';opacity:.92">radarbalcarce.com</span>';
      const caja = 'position:absolute;left:60px;top:1548px;width:960px;height:50px;display:flex;align-items:baseline;justify-content:space-between;white-space:nowrap;z-index:9;line-height:1';
      if (spec.marcaTapa && spec.marcaClara) { /* tapas de fondo claro: sin velo, tinta y rojo */
        div(tp, '', caja, mk('#14161A', '#C7381C'));
      } else if (spec.marcaTapa) {
        div(tp, '', 'position:absolute;left:0;top:1440px;width:1080px;height:480px;background:linear-gradient(180deg,rgba(8,10,14,0) 0%,rgba(8,10,14,.6) 42%,rgba(8,10,14,.6) 100%);z-index:8');
        div(tp, '', caja + ';text-shadow:0 2px 12px rgba(0,0,0,.55)', mk('#FAF8F3', '#C7381C'));
      }
      if (K.kit === 'k2') div(tp, '', 'position:absolute;left:60px;top:1394px;height:36px;font-family:SS4;font-weight:900;font-size:34px;line-height:36px;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.65);white-space:nowrap;z-index:9', 'Radar Balcarce');
      const tr = tp.__transicion;
      if (tr) {
        /* la tapa pasa a la primera escena sin corte: la foto (la misma de la primera escena, que ya está debajo) baja de alto y se acomoda en su lugar de escena (alto fijo desde la fila 0) en 0,5 s, mientras el
           resto de la tapa (título, lista, marca, panel) sube y se desvanece; al final la foto se funde con la de la escena (que es la misma) y la tapa se va. La tapa quieta (t = 0,3 s) no cambia. */
        tp.style.background = 'transparent';
        const resto = Array.prototype.filter.call(tp.children, (c) => c !== tr.reg);
        const D = 0.5, E = 'power3.inOut';
        M.to(resto, { y: -50, opacity: 0, duration: 0.25, ease: 'power1.in' }, T0);
        M.fromTo(tr.reg, { clipPath: 'inset(0px 0px 0px 0px)' }, { clipPath: 'inset(0px 0px ' + (tr.PTt - tr.PT) + 'px 0px)', duration: D, ease: E }, T0);
        M.fromTo(tr.im, { x: tr.x0, y: tr.y0, scale: tr.s0 }, { x: 0, y: 0, scale: 1, duration: D, ease: E }, T0);
        if (tr.band) M.to(tr.band, { opacity: 0, y: -60, duration: 0.3, ease: 'power2.in' }, T0);
        M.to(tr.reg, { opacity: 0, duration: 0.12, ease: 'none' }, T0 + D);
        M.set(tp, { display: 'none' }, T0 + D + 0.15);
      } else {
        M.fromTo(tp, { clipPath: 'inset(0% 0 0 0)' }, { clipPath: 'inset(0% 0 100% 0)', duration: 0.45, ease: 'power3.inOut' }, T0 - 0.05);
        M.set(tp, { display: 'none' }, T0 + 0.5);
      }
    }
    M.set({}, {}, T0 + spec.dur);
    window.__timelines = window.__timelines || {}; window.__timelines['main'] = M; M.seek(0);
  }
  return { run, div, rng };
})();
