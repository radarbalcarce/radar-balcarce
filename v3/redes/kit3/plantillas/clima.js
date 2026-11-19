/* Plantilla del clima (mañana y noche) del kit 3.0. Corre en el navegador de HyperFrames: lee SPEC.datos (lo arma desde-pieza.mjs) y dibuja con el kit (kit/kit.js).
   Video de fondo (fondo.mp4) si hay clips del cielo; si no, un cielo gráfico propio (degradado, nubes, estrellas o lluvia según el estado). Los números cuentan hasta su valor. */
const SERIF = 'font-family:SS4;font-weight:900;line-height:1.02;color:#fff;text-shadow:0 6px 30px rgba(0,0,0,.5);';
const NUM = 'white-space:nowrap;font-family:Inter;font-weight:500;line-height:.92;letter-spacing:-.04em;font-variant-numeric:tabular-nums;color:#fff;text-shadow:0 8px 40px rgba(0,0,0,.45);';
const LAB = 'font-weight:700;font-size:34px;letter-spacing:.16em;text-transform:uppercase;text-shadow:0 2px 12px rgba(0,0,0,.6);color:#fff;';
const AZUL = '#3F5A8C';
const CHIPK = 'position:absolute;left:60px;background:rgba(20,22,26,.6);padding:12px 22px;border-radius:4px;font-weight:700;font-size:30px;letter-spacing:.14em;text-transform:uppercase';
/* fondo grafico propio por estado del cielo: [degradado, nubes, estrellas, lluvia, sol] */
const PALETAS = {
  'despejado': { f: 'linear-gradient(180deg,#2A74C2 0%,#5FA6E6 52%,#BFE0F5 100%)', sol: 1, nubes: 0.12 },
  'parcialmente-nublado': { f: 'linear-gradient(180deg,#3A78BC 0%,#86B4DC 55%,#C9DEEE 100%)', nubes: 0.34, sol: 0.5 },
  'nublado': { f: 'linear-gradient(180deg,#58687B 0%,#7F8D9B 55%,#A9B4BE 100%)', nubes: 0.38 },
  'lluvia': { f: 'linear-gradient(180deg,#313C4B 0%,#4C5B6C 55%,#6D7B8A 100%)', nubes: 0.3, lluvia: 46 },
  'llovizna': { f: 'linear-gradient(180deg,#3F4D5E 0%,#5F6E7E 55%,#8794A1 100%)', nubes: 0.3, lluvia: 24 },
  'tormenta': { f: 'linear-gradient(180deg,#171C27 0%,#2B3243 55%,#474E60 100%)', nubes: 0.22, lluvia: 60 },
  'niebla': { f: 'linear-gradient(180deg,#7E8991 0%,#A9B2B9 55%,#CDD3D8 100%)', nubes: 0.5 },
  'viento': { f: 'linear-gradient(180deg,#4F86B3 0%,#8FB8D8 55%,#CFE2EF 100%)', nubes: 0.3, rapido: 1 },
  'helada-frio': { f: 'linear-gradient(180deg,#5F86AA 0%,#9CBAD3 55%,#DCE8F2 100%)', nubes: 0.2 },
  'calor': { f: 'linear-gradient(180deg,#D9792F 0%,#EFA24F 55%,#F9D08A 100%)', sol: 1, nubes: 0.08 },
  'noche-despejada': { f: 'linear-gradient(180deg,#050A1C 0%,#0F1D40 58%,#1C3260 100%)', estrellas: 90 },
  'noche-nublada': { f: 'linear-gradient(180deg,#0A0F1E 0%,#1B2438 58%,#323C52 100%)', estrellas: 26, nubes: 0.22 }
};
function cielo(K, parent, D, estatico, dur) {
  const P = PALETAS[D.estado] || PALETAS['parcialmente-nublado'];
  K.div(parent, '', 'position:absolute;inset:0;z-index:0;background:' + P.f);
  if (D.noche && !P.estrellas) K.div(parent, '', 'position:absolute;inset:0;z-index:0;background:rgba(6,10,26,.5)');
  if (P.sol) { const s = K.div(parent, '', 'position:absolute;left:560px;top:-160px;width:900px;height:900px;border-radius:50%;z-index:0;background:radial-gradient(closest-side,rgba(255,244,205,' + P.sol * 0.85 + '),rgba(255,230,150,0))'); if (!estatico) K.TL.fromTo(s, { scale: 1 }, { scale: 1.08, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: Math.ceil(dur / 3) }, 0); }
  if (P.estrellas) {
    const r = K.rng(5);
    for (let i = 0; i < P.estrellas; i++) {
      const z = 2 + r() * 4, st = K.div(parent, 'estrella', 'z-index:0;left:' + r() * 1080 + 'px;top:' + r() * 1000 + 'px;width:' + z + 'px;height:' + z + 'px;opacity:' + (0.4 + r() * 0.6).toFixed(2));
      if (!estatico) K.TL.to(st, { opacity: 0.1 + r() * 0.25, duration: 0.8 + r() * 1.6, yoyo: true, repeat: Math.ceil(dur / 1.2), ease: 'sine.inOut' }, r());
    }
  }
  if (P.nubes) {
    [[330, 18, 0], [560, 24, 1], [780, 21, 2], [1000, 27, 3]].forEach((n, i) => {
      const x0 = estatico ? -200 + i * 330 : -1000;
      const d = K.div(parent, '', 'position:absolute;left:' + x0 + 'px;top:' + n[0] + 'px;width:1000px;height:240px;border-radius:50%;z-index:0;background:radial-gradient(closest-side,rgba(255,255,255,' + P.nubes + '),rgba(255,255,255,0));filter:blur(18px)');
      if (!estatico) K.TL.fromTo(d, { x: 0 }, { x: 2300, duration: n[1] / (P.rapido ? 2 : 1), ease: 'none', repeat: Math.ceil(dur / n[1]) + 1 }, -i * 5);
    });
  }
  if (P.lluvia && !estatico) K.fx.lluvia(parent, { t0: 0.1, t1: 1e4, n: P.lluvia, alpha: 0.4, seed: 11 });
}
function barra(K, top, t, d, de, a, color) {
  const pista = K.div(K.CT, '', 'position:absolute;left:60px;top:' + top + 'px;width:900px;height:16px;border-radius:8px;background:rgba(255,255,255,.28)');
  const rel = K.div(pista, '', 'position:absolute;left:0;top:0;bottom:0;width:100%;border-radius:8px;background:' + (color || '#fff') + ';transform-origin:left;transform:scaleX(' + de + ')');
  K.TL.fromTo(rel, { scaleX: de }, { scaleX: a, duration: d, ease: 'power3.out' }, t + 0.1);
  return pista;
}
function respira(K, el, t, d) { K.TL.fromTo(el, { scale: 1 }, { scale: 1.035, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: Math.max(1, Math.ceil(d / 1.2)), transformOrigin: '0% 60%' }, t + 1.2); }
const grados = (v) => v + '°';
function tapa(K, S) {
  const T = K.TAPA, D = S.datos, noche = D.momento === 'noche', X = D.tapa;
  if (S.tapaFondo) { const im = new Image(); im.src = 'fotos/tapa-fondo.jpg'; im.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1920px'; T.appendChild(im); }
  else { const c = K.div(T, '', 'position:absolute;inset:0;overflow:hidden'); cielo(K, c, D, true, 0); }
  K.div(T, '', 'position:absolute;inset:0;background:' + S.scrim);
  K.div(T, '', 'position:absolute;left:60px;top:315px;height:58px;padding:0 24px;display:flex;align-items:center;background:' + AZUL + ';color:#fff;font-weight:700;font-size:28px;letter-spacing:.16em;text-transform:uppercase;border-radius:4px', X.chip);
  K.div(T, '', 'position:absolute;left:50px;top:440px;' + LAB, X.etiqueta);
  K.div(T, '', 'position:absolute;left:40px;top:482px;font-size:620px;' + NUM, grados(X.numero));
  const tam = K.fit(X.titulo, 960, 150, 70, 0.56);
  K.div(T, '', 'position:absolute;left:60px;top:1100px;white-space:nowrap;font-size:' + tam + 'px;' + SERIF, X.titulo);
  X.chips.forEach((c, i) => K.div(T, '', 'position:absolute;left:' + (60 + (i ? (noche ? 300 : 280) : 0)) + 'px;top:1300px;height:72px;padding:0 30px;display:flex;align-items:center;background:' + (c.claro ? '#fff' : AZUL) + ';color:' + (c.claro ? '#14161A' : '#fff') + ';border-radius:8px;font-weight:700;font-size:40px;white-space:nowrap', c.t));
}
function escenas(K, S) {
  const D = S.datos, TL = K.TL, sec = D.secuencia;
  if (!S.video) cielo(K, K.PL, D, false, S.dur);
  sec.forEach((s, i) => {
    const t0 = s.t, t1 = i < sec.length - 1 ? sec[i + 1].t - 0.1 : null;
    if (s.tipo === 'cielo') {
      const k1 = K.div(K.CT, '', CHIPK + ';top:400px', D.fechaTexto);
      K.aparece(k1, t0 + 0.4, { salida: t1 });
      const tam = Math.min.apply(null, D.cieloLineas.map((l) => K.fit(l, 900, 200, 100, 0.56)));
      const b = K.div(K.CT, '', 'position:absolute;left:60px;top:490px;width:900px');
      D.cieloLineas.forEach((l, j) => K.linea(b, l, '', SERIF + 'font-size:' + tam + 'px', t0 + 0.6 + j * 0.15, { salida: t1 }));
      const chip = K.div(K.CT, '', 'position:absolute;left:60px;top:' + Math.round(490 + D.cieloLineas.length * tam * 1.04 + 40) + 'px;background:' + AZUL + ';color:#fff;padding:8px 26px;border-radius:6px;font-weight:700;font-size:44px;font-variant-numeric:tabular-nums', 'Ahora <span>0°</span>');
      K.aparece(chip, t0 + 1.0, { y: 30, from: { x: -50 }, salida: t1 });
      K.contar(chip.querySelector('span'), 0, D.ahora.temp, t0 + 1.1, 1.0, { suf: '°', ease: 'power2.out' });
    } else if (s.tipo === 'comentario') {
      const tam = K.fitBox(D.comentario.titulo, 900, 300, 150, 80, 1.04, 0.56);
      const b = K.div(K.CT, '', 'position:absolute;left:60px;top:410px;width:900px');
      K.linea(b, D.comentario.titulo, '', SERIF + 'font-size:' + tam + 'px;text-wrap:balance', t0 + 0.1, { salida: t1 });
      if (D.comentario.icono === 'lluvia') {
        const arriba = Math.max(720, Math.round(410 + K.lineasDe(D.comentario.titulo, 900, tam, 0.56) * tam * 1.06 + 40));
        const n = K.div(K.CT, '', 'position:absolute;left:50px;top:' + arriba + 'px');
        K.div(n, '', LAB + 'margin-left:10px;margin-bottom:-6px', 'Probabilidad de lluvia');
        const num = K.div(n, '', NUM + 'font-size:280px', '0%');
        K.aparece(n, t0 + 0.3, { y: 60, salida: t1 });
        K.contar(num, 0, D.lluvia, t0 + 0.4, 1.3, { suf: '%', ease: 'power3.out' });
      }
    } else if (s.tipo === 'maxima') {
      const n2 = K.div(K.CT, '', 'position:absolute;left:50px;top:380px');
      K.div(n2, '', LAB + 'margin-left:10px;margin-bottom:-6px', 'Máxima');
      const num = K.div(n2, '', NUM + 'font-size:470px', '0°');
      K.aparece(n2, t0, { y: 60, salida: t1 });
      K.contar(num, 0, D.max, t0 + 0.1, 1.5, { suf: '°', ease: 'power3.out' });
      if (t1 !== null) respira(K, num, t0, t1 - t0);
      const b2 = barra(K, 850, t0, 1.5, 0, Math.max(0.04, Math.min(1, D.max / 40))); K.aparece(b2, t0, { y: 0, salida: t1 });
      const tMin = Math.max(D.tMin, t0 + 0.6);
      const chip = K.div(K.CT, '', 'position:absolute;left:60px;top:910px;background:' + AZUL + ';color:#fff;padding:8px 26px;border-radius:6px;font-weight:700;font-size:44px;font-variant-numeric:tabular-nums', 'Mínima <span>0°</span>');
      K.aparece(chip, tMin, { y: 30, from: { x: -50 }, salida: t1 });
      K.contar(chip.querySelector('span'), 0, D.min, tMin + 0.1, 0.9, { suf: '°', ease: 'power2.out' });
    } else if (s.tipo === 'manana') {
      const b = K.div(K.CT, '', 'position:absolute;left:60px;top:410px;width:900px');
      K.linea(b, 'Mañana', '', SERIF + 'font-size:190px', t0 + 0.1, { salida: t1 });
      const tam = Math.min.apply(null, D.manana.cieloLineas.map((l) => K.fit(l, 900, 110, 64, 0.56)));
      D.manana.cieloLineas.forEach((l, j) => K.linea(b, l, '', SERIF + 'font-size:' + tam + 'px', t0 + 0.3 + j * 0.15, { salida: t1 }));
      const y = Math.round(410 + 190 * 1.02 + D.manana.cieloLineas.length * tam * 1.02 + 50);
      const tMax = Math.max(D.tMax, t0 + 0.5), tMin = Math.max(D.tMin, tMax + 0.6);
      const c1 = K.div(K.CT, '', 'position:absolute;left:60px;top:' + y + 'px;background:' + AZUL + ';color:#fff;padding:8px 26px;border-radius:6px;font-weight:700;font-size:44px;font-variant-numeric:tabular-nums', 'Mín <span>0°</span>');
      const c2 = K.div(K.CT, '', 'position:absolute;left:290px;top:' + y + 'px;background:#fff;color:#14161A;padding:8px 26px;border-radius:6px;font-weight:700;font-size:44px;font-variant-numeric:tabular-nums', 'Máx <span>0°</span>');
      K.aparece(c2, tMax, { from: { x: -50 }, salida: t1 }); K.aparece(c1, tMin, { from: { x: -50 }, salida: t1 });
      K.contar(c2.querySelector('span'), 0, D.max, tMax + 0.1, 0.8, { suf: '°' }); K.contar(c1.querySelector('span'), 0, D.min, tMin + 0.1, 0.8, { suf: '°' });
    } else if (s.tipo === 'lluvia') {
      const n3 = K.div(K.CT, '', 'position:absolute;left:50px;top:420px');
      K.div(n3, '', LAB + 'margin-left:10px;margin-bottom:-6px', 'Probabilidad de lluvia');
      const num3 = K.div(n3, '', NUM + 'font-size:400px', '0%');
      K.aparece(n3, t0, { y: 60, salida: t1 });
      K.contar(num3, 0, D.lluvia, t0 + 0.1, 1.4, { suf: '%', ease: 'power3.out' });
      if (t1 !== null) respira(K, num3, t0, t1 - t0);
      const b3 = barra(K, 800, t0, 1.4, 0, Math.max(0.02, D.lluvia / 100), '#9EC1F0'); K.aparece(b3, t0, { y: 0, salida: t1 });
    }
  });
  if (D.franja) {
    const f = K.div(K.CT, '', 'position:absolute;left:60px;top:1336px;width:960px;height:54px;padding:0 22px;display:flex;align-items:center;background:#FAF8F3;border:3px solid #E8A33C;border-radius:6px;color:#14161A;font-weight:700;font-size:28px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis', '');
    f.textContent = D.franja.texto;
    K.aparece(f, D.franja.desde, { y: 20, d: 0.5 });
  }
}
