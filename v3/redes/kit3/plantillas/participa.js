/* Plantilla «Participá» del kit 3.0 (rehecha el 20/11/2026 con la devolución de Hernán): una SERIE de cuatro convocatorias que se reconoce, todas con el dibujo de «¿Viste algo?»: fondo rojo Balcarce, la pregunta grande
   (primera parte en blanco, segunda en una caja de papel), fotos REALES de Balcarce que llegan a un chat, la respuesta de Radar y el contacto. Cambian las palabras y las fotos, no el estilo.
   SPEC.datos.variante: 'viste' (¿Viste algo?), 'nota' (Tu nota), 'evento' (Tu evento, tu feria, tu comercio) y 'marca' (Sumá tu marca: la respuesta del chat suma el alcance real en Facebook e Instagram y la última foto lleva
   el aviso de ejemplo «Tu comercio acá»). Nada se inventa: ni eventos ni comercios con nombre ni números.
   Zona segura (§ 27): todo entre las filas 270 y 1250 y dentro de x = 60..940; los subtítulos van en 1264-1480 (sobre tinta o color: nunca sobre papel); nada debajo de la 1670. Lee SPEC.datos (desde-pieza.mjs, adaptarParticipa). */
const TINTA = '#14161A', PAPEL = '#FAF8F3', ROJO = '#C7381C';
const SERIF = 'font-family:SS4;font-weight:900;';
const BASE = 'position:absolute;white-space:nowrap;';

function anillos(K, parent, TL, o) {
  for (let i = 0; i < o.n; i++) {
    const r = K.div(parent, '', 'position:absolute;left:' + (o.cx - 300) + 'px;top:' + (o.cy - 300) + 'px;width:600px;height:600px;border-radius:50%;border:4px solid ' + (o.color || 'rgba(255,255,255,.5)') + ';opacity:0');
    if (o.estatico) { TL.set(r, { scale: 0.5 + i * 0.7, opacity: 0.22 - i * 0.05 }, 0); continue; }
    TL.fromTo(r, { scale: 0.25, opacity: 0.55 }, { scale: 2.4, opacity: 0, duration: 3.2, ease: 'power1.out', repeat: o.rep, repeatDelay: 0 }, o.t0 + i * (3.2 / o.n));
  }
}

/* un texto que se escribe letra por letra (cada letra es un span que se enciende en su momento); devuelve el segundo en que termina */
function tipear(K, el, texto, t0, paso, o) {
  o = o || {};
  el.textContent = '';
  const spans = [...texto].map((c) => { const s = document.createElement('span'); s.textContent = c; s.style.opacity = 0; el.appendChild(s); return s; });
  const caret = document.createElement('span'); caret.textContent = '|'; caret.style.cssText = 'opacity:0;font-weight:400;margin-left:2px;' + (o.caret || ''); el.appendChild(caret);
  K.TL.set(spans, { opacity: 0 }, 0);
  spans.forEach((s, i) => K.TL.set(s, { opacity: 1 }, t0 + i * paso));
  const fin = t0 + spans.length * paso;
  K.TL.set(caret, { opacity: 1 }, t0);
  for (let k = 0; k < 6; k++) { K.TL.set(caret, { opacity: k % 2 ? 1 : 0 }, fin + 0.05 + k * 0.32); }
  K.TL.set(caret, { opacity: 0 }, fin + 0.05 + 6 * 0.32);
  return fin;
}
const miles = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
/* un número que sube hasta `n` (con punto de miles), escrito cuadro por cuadro en la línea de tiempo */
function subir(K, el, n, t, d) {
  const e = gsap.parseEase('power3.out'), pasos = Math.max(2, Math.round(d * 30));
  el.textContent = '0';
  // OJO: GSAP toma «27.710» como el número 27,71 y le saca el cero; el espacio de ancho cero al final lo deja como texto
  for (let i = 0; i <= pasos; i++) K.TL.set(el, { textContent: (i === pasos ? miles(n) : miles(n * e(i / pasos))) + '​' }, t + (d * i) / pasos);
}
const mostrar = (K, el, t) => { K.TL.set(el, { autoAlpha: 0 }, 0); K.TL.set(el, { autoAlpha: 1 }, t); };

/* las franjas negras de la grilla del feed (arriba hasta la 240, abajo desde la 1525) y el rótulo de la tapa */
function marco(K, T, D) {
  K.div(T, '', 'position:absolute;left:0;top:0;width:1080px;height:240px;background:' + TINTA);
  K.div(T, '', 'position:absolute;left:0;top:1525px;width:1080px;height:395px;background:' + TINTA + ';z-index:7');
  K.div(T, '', 'position:absolute;left:60px;top:91px;height:58px;padding:0 24px;display:flex;align-items:center;background:' + D.chipBg + ';color:' + D.chipFg + ';font-weight:700;font-size:28px;letter-spacing:.16em;text-transform:uppercase;border-radius:4px;white-space:nowrap;z-index:8', D.chip);
}

/* ================================================================ el cierre de contacto (igual en todas): WhatsApp con el número que se tipea, mail y «es tu espacio» (o la frase de cierre de la variante) */
function contacto(K, D, fondo) {
  const TL = K.TL, CT = K.CT, c = D.c;
  const tinta = K.div(CT, '', 'position:absolute;inset:0;background:radial-gradient(100% 60% at 80% 100%,#1D2A24 0%,#14161A 70%)');
  TL.set(tinta, { opacity: 0 }, 0); TL.to(tinta, { opacity: 1, duration: 0.6, ease: 'power2.inOut' }, c.escribinos - 0.15);
  const tC = c.escribinos - 0.1;
  const wa = K.div(CT, '', 'position:absolute;left:0;top:410px;width:1080px;height:270px;background:linear-gradient(100deg,#0F7A43 0%,#16A05A 100%);box-shadow:0 20px 60px rgba(0,0,0,.45)');
  mostrar(K, wa, tC + 0.1);
  TL.fromTo(wa, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.55, ease: 'power3.inOut' }, tC + 0.1);
  K.div(wa, '', 'position:absolute;left:60px;top:34px;width:64px;height:64px', '<svg viewBox="0 0 64 64" width="64" height="64"><path d="M32 6C17.6 6 6 17.4 6 31.5c0 4.9 1.4 9.5 3.9 13.4L6 58l13.5-3.6a26 26 0 0 0 12.5 3.2C46.4 57.6 58 46.2 58 32S46.4 6 32 6z" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M24 20c-1.2 0-3 1.1-3.4 3.6-.5 3.3 1.5 8 5.6 12.2 4.1 4.2 8.5 6.4 11.8 6 2.5-.3 3.8-2.2 3.8-3.4 0-.5-.2-.9-.8-1.2l-4-1.9c-.6-.3-1.200-.2-1.600.3l-1.700 2c-2.400-.9-5.800-4.100-6.900-6.900l1.900-1.600c.5-.4.600-1 .3-1.600l-1.800-4.100c-.3-.6-.7-.9-1.200-.9z" fill="#fff"/></svg>');
  K.div(wa, '', BASE + 'left:146px;top:40px;font-weight:700;font-size:34px;letter-spacing:.14em;text-transform:uppercase;color:#fff;line-height:52px', 'Escribinos por WhatsApp');
  const num = K.div(wa, '', BASE + 'left:56px;top:112px;font-weight:700;font-size:114px;line-height:1.3;letter-spacing:-.02em;color:#fff;font-variant-numeric:tabular-nums', '');
  tipear(K, num, D.whatsapp, c.whatsapp - 0.1, 0.105, { caret: 'color:#fff' });
  const ml = K.div(CT, '', 'position:absolute;left:0;top:720px;width:1080px;height:200px;background:' + PAPEL + ';box-shadow:0 20px 60px rgba(0,0,0,.4)');
  mostrar(K, ml, c.mail - 0.25);
  TL.fromTo(ml, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 0.5, ease: 'power3.inOut' }, c.mail - 0.25);
  K.div(ml, '', 'position:absolute;left:60px;top:30px;width:64px;height:64px', '<svg viewBox="0 0 64 64" width="64" height="64"><rect x="6" y="14" width="52" height="36" rx="6" fill="none" stroke="#14161A" stroke-width="4"/><path d="M8 18l24 18 24-18" fill="none" stroke="#C7381C" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/></svg>');
  K.div(ml, '', BASE + 'left:146px;top:36px;font-weight:700;font-size:34px;letter-spacing:.14em;text-transform:uppercase;color:#14161A;line-height:52px', 'O por mail');
  const mail = K.div(ml, '', BASE + 'left:58px;top:104px;font-weight:700;font-size:56px;line-height:1.15;letter-spacing:-.01em;color:#14161A', '');
  tipear(K, mail, D.mail, c.mail + 0.15, 0.06, { caret: 'color:#C7381C' });
  /* la frase de cierre: «Radar Balcarce / es tu espacio.» (o, en «Sumá tu marca», «Tu comercio, / en el medio de Balcarce») */
  if (D.cierre) {
    const l1 = K.div(CT, '', BASE + 'left:60px;top:960px;' + SERIF + 'font-size:104px;line-height:1.05;letter-spacing:-.02em;color:#fff', D.cierre[0]);
    K.aparece(l1, c.radar, { y: 50, d: 0.45 });
    const l2 = K.div(CT, '', BASE + 'left:60px;top:1074px;' + SERIF + 'font-size:70px;line-height:1.1;letter-spacing:-.015em;color:#fff;display:flex;align-items:center;gap:18px', '');
    const a = K.div(l2, '', '', D.cierre[1]);
    const b = K.div(l2, '', 'padding:0 22px 8px;border-radius:18px;background:' + PAPEL + ';color:' + ROJO + ';transform:rotate(-1.5deg)', D.cierre[2]);
    K.aparece(a, c.es, { y: 40, d: 0.4 });
    mostrar(K, b, c.espacio);
    TL.fromTo(b, { scale: 0.6, y: 30 }, { scale: 1, y: 0, duration: 0.55, ease: 'back.out(2)' }, c.espacio);
    return tC;
  }
  const e1 = K.div(CT, '', BASE + 'left:56px;top:960px;' + SERIF + 'font-size:112px;line-height:1.05;letter-spacing:-.02em;color:#fff', '');
  const rr = K.div(e1, '', 'display:inline-block', 'Radar'); const bb = K.div(e1, '', 'display:inline-block;margin-left:26px;color:#E5543A', 'Balcarce');
  K.aparece(rr, c.radar, { y: 50, d: 0.45 }); K.aparece(bb, c.balcarce, { y: 50, d: 0.45 });
  const e2 = K.div(CT, '', BASE + 'left:60px;top:1088px;' + SERIF + 'font-size:84px;line-height:1.1;letter-spacing:-.015em;color:#fff;display:flex;align-items:center;gap:20px', '');
  const es = K.div(e2, '', '', 'es'); const tu = K.div(e2, '', '', 'tu');
  const esp = K.div(e2, '', 'padding:0 26px 8px;border-radius:20px;background:' + PAPEL + ';color:' + ROJO + ';transform:rotate(-1.5deg)', 'espacio.');
  K.aparece(es, c.es, { y: 40, d: 0.4 }); K.aparece(tu, c.tu, { y: 40, d: 0.4 });
  mostrar(K, esp, c.espacio);
  TL.fromTo(esp, { scale: 0.6, y: 30 }, { scale: 1, y: 0, duration: 0.55, ease: 'back.out(2)' }, c.espacio);
  return tC;
}

/* ================================================================ la serie: una convocatoria que se reconoce (rojo Balcarce, pregunta grande, fotos reales que llegan a un chat, respuesta, contacto) */
const CHAT = { top: 600, alto: 650 };
const altoDeLaCaja = (D) => Math.round(D.fsB * 1.02) + 46; // alto de la caja de la segunda parte del título (con su aire de abajo)

/* el título: la primera parte («¿Viste») en blanco y la segunda («algo?») en una caja de papel con letra roja; las dos cambian de una convocatoria a otra */
function seriePregunta(K, parent, D, y0) {
  const vi = K.div(parent, '', BASE + 'left:52px;top:' + y0 + 'px;z-index:2;' + SERIF + 'font-size:290px;line-height:1;letter-spacing:-.025em;color:#fff;transform-origin:0 0;text-shadow:0 6px 40px rgba(0,0,0,.28)', D.a);
  const caja = K.div(parent, '', 'position:absolute;left:44px;top:' + (y0 + 290) + 'px;padding:0 34px 46px;border-radius:30px;background:' + PAPEL + ';transform-origin:0 0', '');
  K.div(caja, '', SERIF + 'font-size:' + D.fsB + 'px;line-height:1.02;letter-spacing:-.03em;color:' + D.color + ';white-space:nowrap', D.b);
  return { vi, caja };
}
function fondoDeLaSerie(K, parent, D) {
  K.div(parent, '', 'position:absolute;inset:0;background:' + D.fondo);
  K.div(parent, '', 'position:absolute;inset:0;background:radial-gradient(90% 55% at 15% 22%,' + D.brillo + ' 0%,rgba(255,255,255,0) 60%)');
}
/* la burbuja de una foto en el chat (con la hora y las tildes); `aviso`: el cartelito chico «Publicidad · Tu comercio acá» (de ejemplo) sobre la foto, como se vería en una nota del sitio */
function fotoDeChat(K, parent, f, o) {
  const hora = '<span style="position:absolute;right:12px;bottom:10px;padding:2px 12px;border-radius:14px;background:rgba(0,0,0,.45);color:#fff;font-size:24px;font-weight:600">' + f.hora + ' <b class="tk" style="color:#B8C4CA">✓✓</b></span>';
  const aviso = f.aviso
    ? '<span style="position:absolute;left:12px;bottom:10px;padding:5px 14px 6px;border-radius:9px;background:' + PAPEL + ';line-height:1.05"><span style="display:block;font-weight:700;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:' + o.color + '">Publicidad</span><span style="display:block;' + SERIF + 'font-size:24px;color:' + TINTA + '">Tu comercio acá</span></span>'
    : '';
  const b = K.div(parent, '', o.caja, '');
  K.div(b, '', 'position:relative;width:' + o.w + 'px;height:' + o.h + 'px;border-radius:' + o.r + 'px;background:url(fotos/' + f.id + '.jpg) center/cover', hora + aviso);
  return b;
}

function tapaSerie(K, S) {
  const T = K.TAPA, D = S.datos;
  fondoDeLaSerie(K, T, D);
  anillos(K, T, K.TL, { n: 3, cx: 640, cy: 1020, estatico: true });
  marco(K, T, D);
  seriePregunta(K, T, D, 300);
  K.div(T, '', BASE + 'left:60px;top:' + (590 + altoDeLaCaja(D) + 27) + 'px;font-weight:700;font-size:48px;line-height:1.1;color:#fff;text-shadow:0 3px 18px rgba(0,0,0,.3)', D.tapaTexto);
  const f = D.fotos[0];
  const z = D.fsB < 330 ? 1.3 : 1; /* con el título más bajo, la foto de la tapa es más grande: no queda vacío */
  fotoDeChat(K, T, { ...f, aviso: false }, { caja: 'position:absolute;left:' + (940 - (480 * z + 16)) + 'px;top:' + Math.round(1092 - 330 * (z - 1)) + 'px;width:' + (480 * z + 16) + 'px;padding:8px;border-radius:26px 26px 6px 26px;background:#005C4B;box-shadow:0 24px 60px rgba(0,0,0,.4);transform:rotate(3deg);transform-origin:50% 50%', w: 480 * z, h: 360 * z, r: 20 });
}

/* «Sumá tu marca»: la respuesta lleva el alcance real en redes (los números suben); es una burbuja ancha del chat */
function respuestaConAlcance(K, parent, D, SLOT, PH, GAP) {
  const r = K.div(parent, '', 'position:absolute;left:26px;top:' + (SLOT + PH + GAP) + 'px;width:820px;padding:16px 26px 18px;border-radius:24px 24px 24px 6px;background:#202C33;color:#E9EDEF', '');
  K.div(r, '', 'font-weight:500;font-size:31px;line-height:40px', D.respuesta);
  const fila = K.div(r, '', 'display:flex;gap:30px;margin-top:8px', '');
  const nums = [[D.alcance.fbAlcance, 'de alcance en Facebook'], [D.alcance.igAlcance, 'de alcance en Instagram']].map(([n, que]) => {
    const col = K.div(fila, '', 'width:370px', '');
    const num = K.div(col, '', 'font-weight:700;font-size:78px;line-height:1.05;letter-spacing:-.04em;color:#fff;font-variant-numeric:tabular-nums', miles(n));
    K.div(col, '', 'font-weight:600;font-size:26px;line-height:1.2;color:#9FB1BA', que);
    return { num, n };
  });
  K.div(r, '', 'margin-top:8px;font-weight:500;font-size:21px;line-height:1.2;color:#8FA3AD', D.alcance.texto);
  return { r, nums };
}

function escenasSerie(K, S) {
  const D = S.datos, TL = K.TL, CT = K.CT, M = D.m, c = D.c;
  fondoDeLaSerie(K, CT, D);
  const anill = K.div(CT, '', 'position:absolute;inset:0;overflow:hidden');
  anillos(K, anill, TL, { n: 3, cx: 640, cy: 1020, t0: 0, rep: 3 });
  TL.to(anill, { opacity: 0, duration: 0.5 }, c.escribinos - 0.15);
  /* A. la pregunta, palabra por palabra con la voz */
  const qg = K.div(CT, '', 'position:absolute;inset:0');
  const q = seriePregunta(K, qg, D, 340);
  const hCaja = altoDeLaCaja(D), yResto = 630 + hCaja + 36;
  K.aparece(q.vi, M.a, { y: 70, d: 0.5, ease: 'back.out(1.6)' });
  mostrar(K, q.caja, M.b);
  TL.fromTo(q.caja, { scale: 0.7, rotation: -4, y: 40 }, { scale: 1, rotation: -1.5, y: 0, duration: 0.55, ease: 'back.out(2)' }, M.b);
  const bloque = K.div(qg, '', 'position:absolute;left:60px;top:' + yResto + 'px;width:880px');
  const fila = K.div(bloque, '', 'display:flex;flex-wrap:wrap;gap:0 18px');
  const palabras = D.resto.map((w) => {
    const s = K.div(fila, '', 'font-weight:700;font-size:58px;line-height:1.14;color:#fff;white-space:nowrap;text-shadow:0 3px 18px rgba(0,0,0,.25)', w.w);
    K.aparece(s, w.a, { y: 36, d: 0.35 });
    return s;
  });
  const apagar = palabras.slice();
  if (D.ayuda) {
    const ayuda = K.div(bloque, '', 'margin-top:12px;font-weight:600;font-size:32px;color:rgba(255,255,255,.82)', D.ayuda);
    K.aparece(ayuda, D.resto[D.resto.length - 1].a + 0.45, { y: 14, d: 0.4 });
    apagar.push(ayuda);
  }
  /* B. la pregunta se achica arriba y las fotos llegan al chat */
  const tB = D.tB;
  TL.to(apagar, { autoAlpha: 0, y: -30, duration: 0.25, ease: 'power2.in' }, tB);
  const viW = q.vi.offsetWidth, cajaW = q.caja.offsetWidth;
  const sCaja = Math.min(0.34 * 330 / D.fsB, (900 - (52 + 4 + viW * 0.34 + 16)) / cajaW);
  const xCaja = 52 + 4 + viW * 0.34 + 16 - 44, yCaja = (392 + 50) - (630 + (hCaja * sCaja) / 2);
  TL.to(q.vi, { scale: 0.34, x: 4, y: 52, duration: 0.6, ease: 'power3.inOut' }, tB);
  TL.to(q.caja, { scale: sCaja, x: xCaja, y: yCaja, rotation: 0, duration: 0.6, ease: 'power3.inOut' }, tB);
  const WT = CHAT.top, WH = CHAT.alto, HD = 84, VH = WH - HD;
  const win = K.div(CT, '', 'position:absolute;left:60px;top:' + WT + 'px;width:880px;height:' + WH + 'px;border-radius:36px;background:#0B141A;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.5)');
  mostrar(K, win, tB + 0.2);
  TL.fromTo(win, { y: 120, scale: 0.96 }, { y: 0, scale: 1, duration: 0.55, ease: 'power3.out' }, tB + 0.2);
  const hd = K.div(win, '', 'position:absolute;left:0;top:0;width:880px;height:' + HD + 'px;background:#1F2C34;z-index:5');
  K.div(hd, '', 'position:absolute;left:26px;top:16px;width:52px;height:52px;border-radius:50%;background:' + D.color + ';color:#fff;' + SERIF + 'font-size:32px;line-height:52px;text-align:center', 'R');
  K.div(hd, '', 'position:absolute;left:98px;top:10px;font-weight:700;font-size:30px;color:#fff;line-height:36px', 'Radar Balcarce');
  K.div(hd, '', 'position:absolute;left:98px;top:46px;font-weight:500;font-size:22px;color:#8FA3AD;line-height:28px', 'en línea');
  const vista = K.div(win, '', 'position:absolute;left:0;top:' + HD + 'px;width:880px;height:' + VH + 'px;overflow:hidden');
  const PH = 421, GAP = 14, SLOT = VH - 18 - PH;
  const burb = D.fotos.map((f) => fotoDeChat(K, vista, f, { color: D.color, caja: 'position:absolute;left:298px;top:' + SLOT + 'px;width:556px;padding:8px;border-radius:24px 24px 6px 24px;background:#005C4B', w: 540, h: 405, r: 18 }));
  let reply, REPLY_H, contadores = [];
  if (D.alcance) {
    const ra = respuestaConAlcance(K, vista, D, SLOT, PH, GAP);
    reply = ra.r; contadores = ra.nums; REPLY_H = reply.offsetHeight + GAP;
  } else {
    reply = K.div(vista, '', 'position:absolute;left:26px;top:' + (SLOT + PH + GAP) + 'px;width:480px;padding:18px 24px 20px;border-radius:24px 24px 24px 6px;background:#202C33;font-weight:500;font-size:31px;line-height:40px;color:#E9EDEF', D.respuesta + ' <b style="color:#53BDEB">✓</b>');
    REPLY_H = 138;
  }
  D.fotos.forEach((f, i) => {
    const t = D.tFotos[i];
    mostrar(K, burb[i], t);
    TL.fromTo(burb[i], { x: 110, y: 150, scale: 0.9 }, { x: 0, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.5)' }, t);
    TL.set(burb[i].querySelector('.tk'), { color: '#53BDEB' }, t + 0.7);
    for (let j = 0; j < i; j++) TL.to(burb[j], { y: -(PH + GAP) * (i - j), duration: 0.5, ease: 'power3.out' }, t);
  });
  const tR = D.tRespuesta, n = burb.length;
  mostrar(K, reply, tR);
  TL.fromTo(reply, { x: -80, y: 60, scale: 0.92 }, { x: 0, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, tR);
  for (let j = 0; j < n; j++) TL.to(burb[j], { y: -(PH + GAP) * (n - 1 - j) - REPLY_H, duration: 0.45, ease: 'power3.out' }, tR);
  TL.to(reply, { y: -REPLY_H, duration: 0.45, ease: 'power3.out' }, tR);
  contadores.forEach((x) => subir(K, x.num, x.n, tR + 0.2, 1.1));
  const tC = contacto(K, D);
  TL.to([win], { y: 200, autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, tC);
  TL.to([q.vi, q.caja], { autoAlpha: 0, y: '-=60', duration: 0.35, ease: 'power2.in' }, tC);
}

/* ================================================================ la entrada */
function tapa(K, S) { tapaSerie(K, S); }
function escenas(K, S) { escenasSerie(K, S); }
