/* Plantilla de «Un día como hoy» (opción C del kit 3.0): la foto ocupa todo el cuadro hasta la franja de papel; el año va en una pestaña de papel con borde rojo y corre hasta su valor;
   en la franja, el hecho y «hace N años» y, cuando la voz dice «También…», el segundo hecho. La foto es la de Wikimedia Commons con su crédito en la franja (nunca encima de la imagen).
   Sin foto libre, fondo de la marca (oscuro, con anillos). Lee SPEC.datos (desde-pieza.mjs). */
const TINTA = '#14161A', PAPEL = '#F3EBD8', ROJO = '#C7381C', FY = 1330, TAB_T = 400, TAB_H = 215;
const AN = 'font-family:SS4;font-weight:900;font-size:196px;line-height:1;letter-spacing:-.02em;white-space:nowrap;font-variant-numeric:tabular-nums;color:' + TINTA + ';';
function capas(K, cont) { // franja + regla roja + pestana del anio
  const o = {};
  o.f = K.div(cont, '', 'position:absolute;left:0;top:' + FY + 'px;width:1080px;height:' + (1920 - FY) + 'px;background:' + PAPEL);
  o.r = K.div(cont, '', 'position:absolute;left:0;top:' + FY + 'px;width:1080px;height:10px;background:' + ROJO);
  o.t = K.div(cont, '', 'position:absolute;left:0;top:' + TAB_T + 'px;width:700px;height:' + TAB_H + 'px;background:' + PAPEL + ';border-top:10px solid ' + ROJO);
  return o;
}
const planoDe = (f, o) => Object.assign({ src: f ? f.src : null, w: f ? f.w : 1080, h: f ? f.h : 1920, contain: f ? f.contain : false, yc: 640, cw: 1080, k: 1.0 }, o);
function tapa(K, S) {
  const T = K.TAPA, D = S.datos, f = D.foto;
  K.div(T, '', 'position:absolute;inset:0;background:' + PAPEL);
  K.fotoEstatica(T, f ? { src: f.src, w: f.w, h: f.h, contain: f.contain, top: 0, alto: FY, yc: 640, f: [0.5, 0.5] } : { top: 0, alto: FY, yc: 600, grad: 'linear-gradient(165deg,#3A1A14 0%,#14161A 62%,#0B0D10 100%)' });
  K.div(T, '', 'position:absolute;left:0;top:0;width:1080px;height:520px;background:linear-gradient(180deg,rgba(8,10,14,.4) 0%,rgba(8,10,14,0) 100%)');
  K.div(T, '', 'position:absolute;left:0;top:1000px;width:1080px;height:' + (FY - 1000) + 'px;background:linear-gradient(180deg,rgba(8,10,14,0),rgba(8,10,14,.55))');
  capas(K, T);
  K.div(T, '', 'position:absolute;left:60px;top:' + (TAB_T + 10) + 'px;' + AN + 'z-index:5', String(D.anio));
  K.div(T, '', 'position:absolute;left:60px;top:315px;height:58px;padding:0 24px;display:flex;align-items:center;background:' + ROJO + ';color:#fff;font-weight:700;font-size:28px;letter-spacing:.16em;text-transform:uppercase;border-radius:4px;z-index:6', D.rotulo);
  const tam = K.fitBox(D.titulo, 960, 130, 56, 34, 1.12, 0.62);
  const t = K.div(T, '', 'position:absolute;left:60px;top:1372px;width:960px;font-weight:700;font-size:' + tam + 'px;line-height:1.12;letter-spacing:.01em;text-transform:uppercase;color:' + TINTA + ';z-index:6;text-wrap:balance', '');
  t.textContent = D.titulo;
  const alto = K.lineasDe(D.titulo, 960, tam, 0.62) * tam * 1.12;
  if (D.hace) K.div(T, '', 'position:absolute;left:60px;top:' + Math.round(1372 + alto + 14) + 'px;font-weight:600;font-size:44px;color:' + TINTA + ';opacity:.85;z-index:6;white-space:nowrap', D.hace);
  if (D.credito) { const c = K.div(T, '', 'position:absolute;left:60px;top:1610px;width:960px;font-weight:600;font-size:24px;line-height:30px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:rgba(20,22,26,.8);z-index:6', ''); c.textContent = D.credito; }
}
function escenas(K, S) {
  const D = S.datos, TL = K.TL, FIN = S.dur - 1.5, f = D.foto;
  const tA = D.ademas ? D.tAdemas : null; // cuando la voz llega al segundo hecho
  const tG = tA !== null ? tA : Math.max(3, (FIN) * 0.55); // el plano cambia aunque no haya segundo hecho
  K.foto(planoDe(f, { t0: 0, t1: tG, f0: [0.2, 0.5], f1: [0.55, 0.5], s0: 1.0, s1: 1.1, z: 1 }));
  K.foto(planoDe(f, { t0: tG, t1: FIN, entrada: 'circulo', f0: [0.8, 0.4], f1: [0.55, 0.45], s0: 1.3, s1: 1.18, z: 2 }));
  const lay = K.div(K.CT, '', 'position:absolute;inset:0');
  const c = capas(K, lay);
  TL.fromTo(c.f, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: 'power4.out' }, 0.25);
  TL.fromTo(c.r, { scaleX: 0, transformOrigin: 'left' }, { scaleX: 1, duration: 0.7, ease: 'power3.out' }, 0.5);
  TL.fromTo(c.t, { xPercent: -100 }, { xPercent: 0, duration: 0.6, ease: 'power4.out' }, 0.45);
  const a1 = K.div(K.CT, '', 'position:absolute;left:60px;top:' + (TAB_T + 10) + 'px;' + AN, String(D.anioDesde));
  TL.set(a1, { autoAlpha: 0 }, 0); TL.set(a1, { autoAlpha: 1 }, 0.6);
  TL.fromTo(a1, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, 0.6);
  const cont = { v: D.anioDesde };
  TL.fromTo(cont, { v: D.anioDesde }, { v: D.anio, duration: 1.5, ease: 'power3.out', onUpdate() { a1.textContent = String(Math.round(cont.v)); } }, 0.7);
  // la franja, fase 1: el hecho y cuanto hace
  const tam = K.fitBox(D.titulo, 960, 130, 56, 34, 1.12, 0.62);
  const t1 = K.div(K.CT, '', 'position:absolute;left:60px;top:1372px;width:960px');
  K.linea(t1, D.titulo, '', 'font-weight:700;font-size:' + tam + 'px;line-height:1.12;letter-spacing:.01em;text-transform:uppercase;color:' + TINTA + ';text-wrap:balance', 1.1, { salida: tA !== null ? tA - 0.05 : null });
  const alto = K.lineasDe(D.titulo, 960, tam, 0.62) * tam * 1.12;
  if (D.hace) {
    const h = K.div(K.CT, '', 'position:absolute;left:60px;top:' + Math.round(1372 + alto + 14) + 'px;font-weight:600;font-size:44px;color:' + TINTA + ';opacity:.85;white-space:nowrap', D.hace);
    K.aparece(h, 1.4, { y: 20, salida: tA !== null ? tA - 0.05 : null });
  }
  // fase 2: «También, en 1955…»
  if (D.ademas) {
    const k = K.div(K.CT, '', 'position:absolute;left:60px;top:1372px;font-weight:700;font-size:32px;letter-spacing:.14em;text-transform:uppercase;color:' + ROJO + ';white-space:nowrap', 'También' + (D.ademas.anio ? ' · ' + D.ademas.anio : ''));
    K.aparece(k, tA + 0.1, { y: 20 });
    const tt = K.fitBox(D.ademas.texto, 960, 170, 46, 30, 1.18, 0.55);
    const b = K.div(K.CT, '', 'position:absolute;left:60px;top:1424px;width:960px');
    K.linea(b, D.ademas.texto, '', 'font-weight:600;font-size:' + tt + 'px;line-height:1.18;color:' + TINTA + ';text-wrap:balance', tA + 0.25);
  }
  K.credito(D.credito, 0, null, { top: 1610, oscuro: true });
}
