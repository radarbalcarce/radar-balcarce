/* Plantilla «Participá» del kit 3.0 (20/11/2026, diseños aprobados por Hernán): una convocatoria con movimiento por variante, todas con el mismo cierre de contacto.
   SPEC.datos.variante: 'viste' (¿Viste algo?, rojo Balcarce y fotos que llegan a un chat), 'nota' (Tu nota, papel con morado de Cultura y renglón de cuaderno), 'evento' (Tu evento, tinta con ámbar y tarjetas
   QUÉ / CUÁNDO / DÓNDE que saltan a la agenda), 'marcaA' (Sumá tu marca, sobria: papel y tinta) y 'marcaB' (Sumá tu marca, dinámica: celular y contadores). Las dos de marca están a la espera de que Hernán elija una.
   Zona segura (§ 27): todo entre las filas 270 y 1250 y dentro de x = 60..940; los subtítulos van en 1264-1480 (sobre tinta o color: nunca sobre papel); nada debajo de la 1670. Lee SPEC.datos (desde-pieza.mjs, `adaptarParticipa`). */
const TINTA = '#14161A', PAPEL = '#FAF8F3', ROJO = '#C7381C', MORADO = '#9D2C8F', AMBAR = '#E8A33C', LINEA = '#E4DFD2';
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

/* lo que se va cuando empieza el contacto: un grupo que sube y se desvanece */
const retirar = (K, els, tC) => K.TL.to(els, { autoAlpha: 0, y: '-=50', duration: 0.35, ease: 'power2.in' }, tC);

/* ================================================================ 1. ¿Viste algo? */
function vistePregunta(K, parent, D, y0) {
  const vi = K.div(parent, '', BASE + 'left:52px;top:' + y0 + 'px;z-index:2;' + SERIF + 'font-size:290px;line-height:1;letter-spacing:-.025em;color:#fff;transform-origin:0 0;text-shadow:0 6px 40px rgba(0,0,0,.28)', '¿Viste');
  const caja = K.div(parent, '', 'position:absolute;left:44px;top:' + (y0 + 290) + 'px;padding:0 34px 46px;border-radius:30px;background:' + PAPEL + ';transform-origin:0 0', '');
  K.div(caja, '', SERIF + 'font-size:330px;line-height:1.02;letter-spacing:-.03em;color:' + ROJO + ';white-space:nowrap', 'algo?');
  return { vi, caja };
}
function tapaViste(K, S) {
  const T = K.TAPA, D = S.datos;
  K.div(T, '', 'position:absolute;inset:0;background:' + D.fondo);
  K.div(T, '', 'position:absolute;inset:0;background:radial-gradient(90% 55% at 15% 22%,rgba(255,140,90,.28) 0%,rgba(255,140,90,0) 60%)');
  anillos(K, T, K.TL, { n: 3, cx: 640, cy: 1020, estatico: true });
  marco(K, T, D);
  vistePregunta(K, T, D, 300);
  K.div(T, '', BASE + 'left:60px;top:1000px;font-weight:700;font-size:48px;line-height:1.1;color:#fff;text-shadow:0 3px 18px rgba(0,0,0,.3)', 'Mandanos la foto o el dato.');
  const b = K.div(T, '', 'position:absolute;left:444px;top:1092px;width:496px;padding:8px;border-radius:26px 26px 6px 26px;background:#005C4B;box-shadow:0 24px 60px rgba(0,0,0,.4);transform:rotate(3deg);transform-origin:50% 50%', '');
  K.div(b, '', 'width:480px;height:360px;border-radius:20px;background:url(fotos/' + D.fotos[0].id + '.jpg) center/cover;position:relative', '<span style="position:absolute;right:12px;bottom:10px;padding:2px 12px;border-radius:14px;background:rgba(0,0,0,.45);color:#fff;font-size:24px;font-weight:600">' + D.fotos[0].hora + ' <b style="color:#53BDEB">✓✓</b></span>');
}
function escenasViste(K, S) {
  const D = S.datos, TL = K.TL, CT = K.CT, M = D.m, c = D.c;
  K.div(CT, '', 'position:absolute;inset:0;background:' + D.fondo);
  K.div(CT, '', 'position:absolute;inset:0;background:radial-gradient(90% 55% at 15% 22%,rgba(255,140,90,.28) 0%,rgba(255,140,90,0) 60%)');
  const anill = K.div(CT, '', 'position:absolute;inset:0;overflow:hidden');
  anillos(K, anill, TL, { n: 3, cx: 640, cy: 1020, t0: 0, rep: 3 });
  TL.to(anill, { opacity: 0, duration: 0.5 }, c.escribinos - 0.15);
  /* A. la pregunta, palabra por palabra con la voz */
  const qg = K.div(CT, '', 'position:absolute;inset:0');
  const q = vistePregunta(K, qg, D, 340);
  K.aparece(q.vi, M.viste, { y: 70, d: 0.5, ease: 'back.out(1.6)' });
  mostrar(K, q.caja, M.algo);
  TL.fromTo(q.caja, { scale: 0.7, rotation: -4, y: 40 }, { scale: 1, rotation: -1.5, y: 0, duration: 0.55, ease: 'back.out(2)' }, M.algo);
  const fila = K.div(qg, '', 'position:absolute;left:60px;top:1050px;display:flex;gap:18px;white-space:nowrap');
  const palabras = D.resto.map((w) => {
    const s = K.div(fila, '', 'font-weight:700;font-size:58px;line-height:1.1;color:#fff;white-space:nowrap;text-shadow:0 3px 18px rgba(0,0,0,.25)', w.w);
    K.aparece(s, w.a, { y: 36, d: 0.35 });
    return s;
  });
  const ayuda = K.div(qg, '', 'position:absolute;left:60px;top:1140px;width:700px;font-weight:600;font-size:32px;color:rgba(255,255,255,.82)', 'Una calle, una obra, algo que pasó.');
  K.aparece(ayuda, M.noticia + 0.5, { y: 14, d: 0.4 });
  /* B. la pregunta se achica arriba y las fotos llegan al chat */
  const tB = M.mandanos - 0.1;
  TL.to(palabras.concat([ayuda]), { autoAlpha: 0, y: -30, duration: 0.25, ease: 'power2.in' }, tB);
  TL.to(q.vi, { scale: 0.34, x: 4, y: 52, duration: 0.6, ease: 'power3.inOut' }, tB);
  TL.to(q.caja, { scale: 0.34, x: 253, y: -250, rotation: 0, duration: 0.6, ease: 'power3.inOut' }, tB);
  const WT = 600, WH = 650, HD = 84, VH = WH - HD;
  const win = K.div(CT, '', 'position:absolute;left:60px;top:' + WT + 'px;width:880px;height:' + WH + 'px;border-radius:36px;background:#0B141A;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.5)');
  mostrar(K, win, tB + 0.2);
  TL.fromTo(win, { y: 120, scale: 0.96 }, { y: 0, scale: 1, duration: 0.55, ease: 'power3.out' }, tB + 0.2);
  const hd = K.div(win, '', 'position:absolute;left:0;top:0;width:880px;height:' + HD + 'px;background:#1F2C34;z-index:5');
  K.div(hd, '', 'position:absolute;left:26px;top:16px;width:52px;height:52px;border-radius:50%;background:' + ROJO + ';color:#fff;' + SERIF + 'font-size:32px;line-height:52px;text-align:center', 'R');
  K.div(hd, '', 'position:absolute;left:98px;top:10px;font-weight:700;font-size:30px;color:#fff;line-height:36px', 'Radar Balcarce');
  K.div(hd, '', 'position:absolute;left:98px;top:46px;font-weight:500;font-size:22px;color:#8FA3AD;line-height:28px', 'en línea');
  const vista = K.div(win, '', 'position:absolute;left:0;top:' + HD + 'px;width:880px;height:' + VH + 'px;overflow:hidden');
  const PH = 421, GAP = 14, SLOT = VH - 18 - PH;
  const burb = D.fotos.map((f) => {
    const b = K.div(vista, '', 'position:absolute;left:298px;top:' + SLOT + 'px;width:556px;padding:8px;border-radius:24px 24px 6px 24px;background:#005C4B', '');
    K.div(b, '', 'position:relative;width:540px;height:405px;border-radius:18px;background:url(fotos/' + f.id + '.jpg) center/cover', '<span style="position:absolute;right:12px;bottom:10px;padding:2px 12px;border-radius:14px;background:rgba(0,0,0,.45);color:#fff;font-size:24px;font-weight:600">' + f.hora + ' <b class="tk" style="color:#B8C7CF">✓✓</b></span>');
    return b;
  });
  const reply = K.div(vista, '', 'position:absolute;left:26px;top:' + (SLOT + PH + GAP) + 'px;width:480px;padding:18px 24px 20px;border-radius:24px 24px 24px 6px;background:#202C33;font-weight:500;font-size:31px;line-height:40px;color:#E9EDEF', '¡Gracias! Lo chequeamos antes de publicar. <b style="color:#53BDEB">✓</b>');
  const REPLY_H = 138;
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
  const tC = contacto(K, D);
  TL.to([win], { y: 200, autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, tC);
  TL.to([q.vi, q.caja], { autoAlpha: 0, y: '-=60', duration: 0.35, ease: 'power2.in' }, tC);
}

/* ================================================================ 2. Tu nota (papel con morado, renglón de cuaderno) */
/* el papel llega hasta la fila 1250; abajo, tinta (los subtítulos blancos siempre sobre oscuro) */
function papel(K, parent, hasta, lineas = true) {
  K.div(parent, '', 'position:absolute;inset:0;background:' + TINTA);
  const p = K.div(parent, '', 'position:absolute;left:0;top:240px;width:1080px;height:' + (hasta - 240) + 'px;background:' + PAPEL + ';overflow:hidden');
  if (lineas) {
    for (let y = 420; y < hasta - 20; y += 76) K.div(p, '', 'position:absolute;left:60px;top:' + (y - 240) + 'px;width:960px;height:2px;background:' + LINEA);
    K.div(p, '', 'position:absolute;left:44px;top:0;width:2px;height:' + (hasta - 240) + 'px;background:rgba(199,56,28,.18)');
  }
  return p;
}
const NOTA_SERIF = 'font-size:150px;line-height:1.08;letter-spacing:-.025em;color:' + TINTA;
function stickers(K, parent, tiempos, estatico) {
  const defs = [['tu club', MORADO, 60, 770, -2], ['tu escuela', TINTA, 250, 872, 1.5], ['tu barrio', ROJO, 130, 974, -1]];
  return defs.map((d, i) => {
    const s = K.div(parent, '', BASE + 'left:' + d[2] + 'px;top:' + d[3] + 'px;padding:12px 32px 16px;border-radius:16px;background:' + d[1] + ';color:#fff;font-weight:700;font-size:58px;line-height:1.1;transform:rotate(' + d[4] + 'deg);box-shadow:0 10px 26px rgba(20,22,26,.22)', d[0]);
    if (!estatico) { mostrar(K, s, tiempos[i]); K.TL.fromTo(s, { scale: 0.5, y: 40, rotation: d[4] - 6 }, { scale: 1, y: 0, rotation: d[4], duration: 0.55, ease: 'back.out(2.4)' }, tiempos[i]); }
    return s;
  });
}
function tapaNota(K, S) {
  const T = K.TAPA, D = S.datos;
  const p = K.div(T, '', 'position:absolute;inset:0');
  K.div(p, '', 'position:absolute;inset:0;background:' + TINTA);
  const hoja = K.div(p, '', 'position:absolute;left:0;top:240px;width:1080px;height:1285px;background:' + PAPEL + ';overflow:hidden');
  for (let y = 420; y < 1500; y += 76) K.div(hoja, '', 'position:absolute;left:60px;top:' + (y - 240) + 'px;width:960px;height:2px;background:' + LINEA);
  marco(K, T, D);
  K.div(T, '', BASE + 'left:60px;top:330px;' + SERIF + NOTA_SERIF, '¿Tenés algo');
  K.div(T, '', BASE + 'left:60px;top:492px;' + SERIF + NOTA_SERIF, 'para contar?');
  K.div(T, '', 'position:absolute;left:60px;top:660px;width:640px;height:14px;background:' + MORADO + ';border-radius:2px');
  stickers(K, T, null, true);
  K.div(T, '', BASE + 'left:60px;top:1130px;font-weight:700;font-size:56px;line-height:1.2;color:' + TINTA, 'Mandanos tu nota o tu historia.');
  K.div(T, '', BASE + 'left:60px;top:1210px;font-weight:500;font-size:34px;color:#6B6F6C', 'Por vos');
}
function escenasNota(K, S) {
  const D = S.datos, TL = K.TL, CT = K.CT, M = D.m;
  const base = papel(K, CT, 1250);
  const grupo = K.div(CT, '', 'position:absolute;inset:0');
  const l1 = K.div(grupo, '', BASE + 'left:60px;top:330px;' + SERIF + NOTA_SERIF, '');
  const l2 = K.div(grupo, '', BASE + 'left:60px;top:492px;' + SERIF + NOTA_SERIF, '');
  const fin1 = tipear(K, l1, '¿Tenés algo', M.tenes, 0.075, { caret: 'color:' + MORADO });
  const t2 = Math.max(fin1 + 0.15, M.para);
  const fin2 = tipear(K, l2, 'para contar?', t2, 0.07, { caret: 'color:' + MORADO });
  const raya = K.div(grupo, '', 'position:absolute;left:60px;top:660px;width:640px;height:14px;background:' + MORADO + ';border-radius:2px;transform-origin:0 50%');
  TL.set(raya, { scaleX: 0 }, 0); TL.to(raya, { scaleX: 1, duration: 0.5, ease: 'power3.out' }, Math.max(fin2, M.contar) - 0.1);
  const st = stickers(K, grupo, [M.club, M.escuela, M.barrio], false);
  const man = K.div(grupo, '', BASE + 'left:60px;top:1130px;font-weight:700;font-size:56px;line-height:1.2;color:' + TINTA, 'Mandanos tu nota o tu historia.');
  K.aparece(man, M.mandanos, { y: 30, d: 0.45 });
  const por = K.div(grupo, '', BASE + 'left:60px;top:1210px;font-weight:500;font-size:34px;color:#6B6F6C', 'Por vos');
  K.aparece(por, M.historia + 0.25, { y: 10, d: 0.4 });
  const tC = contacto(K, D);
  TL.to(base, { autoAlpha: 0, duration: 0.45 }, tC);
  retirar(K, [grupo], tC);
}

/* ================================================================ 3. Tu evento, tu feria, tu comercio (tinta con ámbar; QUÉ / CUÁNDO / DÓNDE) */
const EV_LINEAS = ['¿Organizás', 'un evento,', 'una feria o tenés', 'un comercio?'];
const EV_SIZE = 100;
function eventoTitulo(K, parent, tiempos) {
  return EV_LINEAS.map((t, i) => {
    const color = i === 3 ? AMBAR : '#fff';
    const e = K.div(parent, '', BASE + 'left:60px;top:' + (290 + i * 106) + 'px;' + SERIF + 'font-size:' + EV_SIZE + 'px;line-height:1.06;letter-spacing:-.02em;color:' + color, t);
    if (tiempos) K.aparece(e, tiempos[i], { y: 50, d: 0.45 });
    return e;
  });
}
const EV_CARTAS = [['QUÉ', 'Feria de plantas'], ['CUÁNDO', 'Sábado, 16 h'], ['DÓNDE', 'Plaza Libertad']];
function cartaDeEvento(K, parent, i, valor) {
  const y = 760 + i * 124;
  const c = K.div(parent, '', 'position:absolute;left:60px;top:' + y + 'px;width:860px;height:108px;border-radius:14px;overflow:hidden;background:' + PAPEL + ';box-shadow:0 12px 34px rgba(0,0,0,.35)', '');
  K.div(c, '', 'position:absolute;left:0;top:0;width:210px;height:108px;background:' + AMBAR + ';color:' + TINTA + ';font-weight:700;font-size:34px;letter-spacing:.08em;line-height:108px;text-align:center', EV_CARTAS[i][0]);
  const v = K.div(c, '', BASE + 'left:240px;top:0;font-weight:600;font-size:58px;line-height:108px;color:' + TINTA, valor === null ? '' : EV_CARTAS[i][1]);
  return { c, v };
}
function tapaEvento(K, S) {
  const T = K.TAPA, D = S.datos;
  K.div(T, '', 'position:absolute;inset:0;background:radial-gradient(100% 60% at 80% 100%,#1D2A24 0%,#14161A 70%)');
  marco(K, T, D);
  eventoTitulo(K, T, null);
  [0, 1, 2].forEach((i) => cartaDeEvento(K, T, i));
  K.div(T, '', BASE + 'left:60px;top:1160px;font-weight:700;font-size:44px;color:' + AMBAR, '→ a la agenda de Balcarce');
}
function escenasEvento(K, S) {
  const D = S.datos, TL = K.TL, CT = K.CT, M = D.m;
  K.div(CT, '', 'position:absolute;inset:0;background:radial-gradient(100% 60% at 80% 100%,#1D2A24 0%,#14161A 70%)');
  const grupo = K.div(CT, '', 'position:absolute;inset:0');
  eventoTitulo(K, grupo, [M.organizas, M.un1, M.una, M.un2]);
  const cartas = [0, 1, 2].map((i) => cartaDeEvento(K, grupo, i, null));
  const tt = [M.que, M.cuando, M.donde];
  cartas.forEach((o, i) => {
    mostrar(K, o.c, tt[i] - 0.2);
    TL.fromTo(o.c, { x: -70, scale: 0.96 }, { x: 0, scale: 1, duration: 0.45, ease: 'power3.out' }, tt[i] - 0.2);
    tipear(K, o.v, EV_CARTAS[i][1], tt[i] + 0.05, 0.06, { caret: 'color:' + AMBAR });
  });
  const flecha = K.div(grupo, '', BASE + 'left:60px;top:1160px;font-weight:700;font-size:44px;color:' + AMBAR, '→ a la agenda de Balcarce');
  K.aparece(flecha, M.agenda, { y: 16, d: 0.4 });
  /* las tarjetas saltan a la agenda: un panel de papel con el evento resaltado */
  const ag = K.div(CT, '', 'position:absolute;left:60px;top:740px;width:860px;height:430px;border-radius:22px;overflow:hidden;background:' + PAPEL + ';box-shadow:0 30px 80px rgba(0,0,0,.5)', '');
  K.div(ag, '', 'position:absolute;left:0;top:0;width:860px;height:96px;background:' + MORADO + ';color:#fff;font-weight:700;font-size:36px;letter-spacing:.14em;text-transform:uppercase;line-height:96px;padding-left:34px;white-space:nowrap', 'Agenda de Balcarce');
  const fila = K.div(ag, '', 'position:absolute;left:24px;top:120px;width:812px;height:120px;border-radius:14px;background:' + AMBAR, '');
  K.div(fila, '', 'position:absolute;left:0;top:0;width:150px;height:120px;color:' + TINTA + ';font-weight:700;font-size:30px;text-align:center;line-height:1.1;padding-top:24px', 'SÁB<br><span style="font-size:48px">16:00</span>');
  K.div(fila, '', BASE + 'left:176px;top:16px;font-weight:700;font-size:48px;color:' + TINTA, 'Feria de plantas');
  K.div(fila, '', BASE + 'left:176px;top:72px;font-weight:600;font-size:34px;color:rgba(20,22,26,.75)', 'Plaza Libertad');
  [0, 1].forEach((i) => {
    K.div(ag, '', 'position:absolute;left:24px;top:' + (262 + i * 76) + 'px;width:812px;height:60px;border-radius:12px;background:#EFEBDF', '');
    K.div(ag, '', 'position:absolute;left:48px;top:' + (284 + i * 76) + 'px;width:' + (360 - i * 90) + 'px;height:16px;border-radius:8px;background:#D5CFBE', '');
  });
  mostrar(K, ag, M.agenda);
  TL.fromTo(ag, { scale: 0.86, y: 70 }, { scale: 1, y: 0, duration: 0.6, ease: 'back.out(1.6)' }, M.agenda);
  TL.to(cartas.map((o) => o.c), { autoAlpha: 0, scale: 0.9, duration: 0.3, ease: 'power2.in' }, M.agenda - 0.05);
  TL.to(flecha, { autoAlpha: 0, duration: 0.2 }, M.agenda + 0.9);
  TL.fromTo(fila, { scale: 1 }, { scale: 1.03, duration: 0.35, yoyo: true, repeat: 3, ease: 'sine.inOut' }, M.agenda + 0.6);
  const tC = contacto(K, D);
  retirar(K, [grupo, ag], tC);
}

/* ================================================================ 4. Sumá tu marca (dos versiones; Hernán elige una) */
const MARCA_LINEAS = ['¿Querés que tu', 'comercio acompañe', 'las noticias', 'de Balcarce?'];
const MK_SIZE = 82;
function marcaTitulo(K, parent, color, acento, tiempos) {
  return MARCA_LINEAS.map((t, i) => {
    const e = K.div(parent, '', BASE + 'left:60px;top:' + (285 + i * 86) + 'px;' + SERIF + 'font-size:' + MK_SIZE + 'px;line-height:1.06;letter-spacing:-.02em;color:' + (i === 3 ? acento : color), t);
    if (tiempos) K.aparece(e, tiempos[i], { y: 40, d: 0.45 });
    return e;
  });
}
/* el aviso de ejemplo: un recuadro con «Tu comercio acá». Nunca un comercio real. */
function avisoDeEjemplo(K, parent, o) {
  const a = K.div(parent, '', 'position:absolute;left:' + o.x + 'px;top:' + o.y + 'px;width:' + o.w + 'px;height:' + o.h + 'px;border-radius:12px;background:#fff;border:3px solid ' + o.borde + ';overflow:hidden', '');
  K.div(a, '', BASE + 'left:' + o.pad + 'px;top:' + Math.round(o.h * 0.1) + 'px;font-weight:700;font-size:' + o.fs1 + 'px;letter-spacing:.14em;text-transform:uppercase;color:' + o.borde, o.rotulo);
  K.div(a, '', BASE + 'left:' + o.pad + 'px;top:' + Math.round(o.h * 0.34) + 'px;' + SERIF + 'font-size:' + o.fs2 + 'px;line-height:1.05;color:' + TINTA, 'Tu comercio acá');
  K.div(a, '', BASE + 'left:' + o.pad + 'px;top:' + Math.round(o.h * 0.72) + 'px;font-weight:600;font-size:' + o.fs3 + 'px;color:#6B6F6C', o.msg || 'Tu mensaje, junto a las noticias');
  return a;
}
/* un renglón gris que imita texto */
const linea = (K, p, x, y, w, c) => K.div(p, '', 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:12px;border-radius:6px;background:' + (c || '#D9D4C6'));

function tapaMarcaA(K, S) {
  const T = K.TAPA, D = S.datos;
  const hoja = K.div(T, '', 'position:absolute;left:0;top:240px;width:1080px;height:1285px;background:' + PAPEL);
  K.div(T, '', 'position:absolute;left:0;top:0;width:1080px;height:240px;background:' + TINTA);
  marco(K, T, D);
  marcaTitulo(K, T, TINTA, ROJO, null);
  tarjetaNota(K, T, { x: 60, y: 660, w: 540, h: 440 }).c.style.height = '440px';
  tarjetaHistoria(K, T, { x: 650, y: 660, w: 248, h: 440 });
  franjaA(K, T, D, null);
  K.div(T, '', BASE + 'left:60px;top:1300px;font-weight:700;font-size:40px;color:' + ROJO, 'Tu comercio, en el medio de Balcarce');
}
/* la nota del sitio con el aviso: tarjeta clara */
function tarjetaNota(K, parent, o) {
  const c = K.div(parent, '', 'position:absolute;left:' + o.x + 'px;top:' + o.y + 'px;width:' + o.w + 'px;height:' + o.h + 'px;border-radius:18px;background:#fff;box-shadow:0 18px 50px rgba(20,22,26,.22);overflow:hidden', '');
  K.div(c, '', 'position:absolute;left:0;top:0;width:' + o.w + 'px;height:52px;background:' + TINTA + ';color:#fff;font-weight:600;font-size:24px;line-height:52px;padding-left:22px;white-space:nowrap', 'radarbalcarce.com · una nota');
  K.div(c, '', BASE + 'left:24px;top:72px;font-weight:700;font-size:22px;letter-spacing:.14em;text-transform:uppercase;color:' + ROJO, 'Balcarce');
  K.div(c, '', BASE + 'left:24px;top:104px;' + SERIF + 'font-size:40px;line-height:1.08;color:' + TINTA, 'Titular de una nota<br>de Balcarce');
  linea(K, c, 24, 208, o.w - 48); linea(K, c, 24, 232, o.w - 90); linea(K, c, 24, 256, o.w - 60);
  const a = avisoDeEjemplo(K, c, { x: 24, y: 290, w: o.w - 48, h: 130, borde: ROJO, pad: 20, rotulo: 'Publicidad', fs1: 18, fs2: 40, fs3: 24 });
  return { c, a };
}
/* la historia de Radar con el aviso en el tercio de abajo: celular vertical */
function tarjetaHistoria(K, parent, o) {
  const c = K.div(parent, '', 'position:absolute;left:' + o.x + 'px;top:' + o.y + 'px;width:' + o.w + 'px;height:' + o.h + 'px;border-radius:28px;background:' + TINTA + ';padding:8px;box-shadow:0 18px 50px rgba(20,22,26,.3)', '');
  const p = K.div(c, '', 'position:relative;width:100%;height:100%;border-radius:22px;overflow:hidden;background:linear-gradient(170deg,#D6401F 0%,#8E2410 100%)', '');
  K.div(p, '', BASE + 'left:18px;top:20px;font-weight:700;font-size:18px;letter-spacing:.14em;text-transform:uppercase;color:#fff;background:rgba(0,0,0,.28);padding:6px 12px;border-radius:4px', 'Radar Balcarce');
  K.div(p, '', 'position:absolute;left:18px;top:96px;width:' + (o.w - 52) + 'px;' + SERIF + 'font-size:36px;line-height:1.08;color:#fff', 'Una historia<br>de hoy en<br>Balcarce');
  const a = K.div(p, '', 'position:absolute;left:12px;bottom:18px;width:' + (o.w - 40) + 'px;height:128px;border-radius:12px;background:#fff;overflow:hidden', '');
  K.div(a, '', BASE + 'left:14px;top:12px;font-weight:700;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:' + ROJO, 'Auspicia');
  K.div(a, '', BASE + 'left:14px;top:40px;' + SERIF + 'font-size:27px;line-height:1.05;color:' + TINTA, 'Tu comercio acá');
  K.div(a, '', BASE + 'left:14px;top:90px;font-weight:600;font-size:16px;color:#6B6F6C', 'Tu mensaje en la historia');
  return { c, a };
}
function contadoresDeAlcance(K, D) {
  return [
    { n: D.alcance.paginasVistas, que: 'páginas vistas en el sitio', color: ROJO },
    { n: D.alcance.fbAlcance, que: 'de alcance en Facebook', color: '#1B5FC9' },
    { n: D.alcance.igAlcance, que: 'de alcance en Instagram', color: MORADO },
  ];
}
/* los tres contadores de la versión A en una franja (filas 1128 a 1250); con `t` suben cuando la voz dice «contamos», sin `t` quedan quietos (la tapa) */
function franjaA(K, parent, D, t) {
  const franja = K.div(parent, '', 'position:absolute;left:60px;top:1128px;width:880px;height:96px');
  contadoresDeAlcance(K, D).forEach((c, i) => {
    const col = K.div(franja, '', 'position:absolute;left:' + (i * 295) + 'px;top:0;width:280px;height:96px;border-top:5px solid ' + c.color, '');
    const n = K.div(col, '', BASE + 'left:0;top:8px;font-weight:700;font-size:56px;line-height:1;letter-spacing:-.03em;color:' + TINTA + ';font-variant-numeric:tabular-nums', miles(c.n));
    K.div(col, '', BASE + 'left:0;top:68px;font-weight:600;font-size:23px;line-height:1.1;color:#4B4F4C', c.que);
    if (t != null) { K.aparece(col, t + i * 0.18, { y: 22, d: 0.4 }); subir(K, n, c.n, t + i * 0.18 + 0.1, 1.3); }
  });
  const nota = K.div(parent, '', BASE + 'left:60px;top:1226px;font-weight:500;font-size:22px;color:#6B6F6C', D.alcance.texto);
  if (t != null) K.aparece(nota, t + 0.6, { y: 8, d: 0.4 });
}
function escenasMarcaA(K, S) {
  const D = S.datos, TL = K.TL, CT = K.CT, M = D.m;
  const base = papel(K, CT, 1250, false);
  const grupo = K.div(CT, '', 'position:absolute;inset:0');
  marcaTitulo(K, grupo, TINTA, ROJO, [M.queres, M.comercio, M.las, M.de]);
  /* cómo se ve: dentro de una nota del sitio y dentro de una historia de Radar */
  const nota = tarjetaNota(K, grupo, { x: 60, y: 660, w: 540, h: 440 });
  nota.c.style.height = '440px';
  const hist = tarjetaHistoria(K, grupo, { x: 650, y: 660, w: 248, h: 440 });
  K.aparece(nota.c, M.noticias + 0.1, { y: 60, d: 0.55, ease: 'back.out(1.4)' });
  K.aparece(hist.c, M.escribinos, { y: 60, d: 0.55, ease: 'back.out(1.4)' });
  const pulso = (el, t) => TL.fromTo(el, { boxShadow: '0 0 0 0 rgba(199,56,28,.55)' }, { boxShadow: '0 0 0 18px rgba(199,56,28,0)', duration: 0.9, repeat: 2, ease: 'power1.out' }, t);
  pulso(nota.a, M.noticias + 0.7); pulso(hist.a, M.escribinos + 0.7);
  /* el alcance, con números reales de las estadísticas del sitio y las redes */
  franjaA(K, grupo, D, M.contamos);
  const tC = contacto(K, D);
  TL.to(base, { autoAlpha: 0, duration: 0.45 }, tC);
  retirar(K, [grupo], tC);
}
function tapaMarcaB(K, S) {
  const T = K.TAPA, D = S.datos;
  K.div(T, '', 'position:absolute;inset:0;background:' + D.fondo);
  anillos(K, T, K.TL, { n: 3, cx: 300, cy: 980, estatico: true });
  marco(K, T, D);
  marcaTitulo(K, T, '#fff', '#9FC0FF', null);
  celular(K, T, { x: 60, y: 680, w: 300, h: 534 });
  contadoresB(K, T, D, null);
  K.div(T, '', 'position:absolute;left:420px;top:1206px;width:520px;font-weight:500;font-size:22px;line-height:1.25;color:rgba(255,255,255,.72)', D.alcance.texto);
}
/* el celular: dos pantallas, la nota del sitio con el aviso y la historia con el aviso */
function celular(K, parent, o) {
  const c = K.div(parent, '', 'position:absolute;left:' + o.x + 'px;top:' + o.y + 'px;width:' + o.w + 'px;height:' + o.h + 'px;border-radius:40px;background:#0B0D10;padding:10px;box-shadow:0 30px 80px rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.18)', '');
  const p = K.div(c, '', 'position:relative;width:100%;height:100%;border-radius:32px;overflow:hidden;background:#fff', '');
  /* pantalla 1: la nota */
  const s1 = K.div(p, '', 'position:absolute;inset:0;background:#fff', '');
  K.div(s1, '', 'position:absolute;left:0;top:0;width:100%;height:46px;background:' + TINTA + ';color:#fff;font-weight:600;font-size:18px;line-height:46px;padding-left:18px', 'radarbalcarce.com');
  K.div(s1, '', BASE + 'left:18px;top:62px;font-weight:700;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:' + ROJO, 'Balcarce');
  K.div(s1, '', BASE + 'left:18px;top:86px;' + SERIF + 'font-size:30px;line-height:1.08;color:' + TINTA, 'Titular de una<br>nota de Balcarce');
  linea(K, s1, 18, 168, o.w - 56); linea(K, s1, 18, 190, o.w - 90); linea(K, s1, 18, 212, o.w - 70);
  const aviso = avisoDeEjemplo(K, s1, { x: 14, y: 250, w: o.w - 48, h: 150, borde: '#1B5FC9', pad: 16, rotulo: 'Publicidad', fs1: 15, fs2: 29, fs3: 16, msg: 'Junto a las noticias' });
  linea(K, s1, 18, 424, o.w - 70); linea(K, s1, 18, 446, o.w - 100);
  /* pantalla 2: la historia */
  const s2 = K.div(p, '', 'position:absolute;inset:0;background:linear-gradient(170deg,#D6401F 0%,#8E2410 100%)', '');
  K.div(s2, '', BASE + 'left:16px;top:20px;font-weight:700;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#fff;background:rgba(0,0,0,.28);padding:5px 10px;border-radius:4px', 'Radar Balcarce');
  K.div(s2, '', 'position:absolute;left:16px;top:84px;width:' + (o.w - 52) + 'px;' + SERIF + 'font-size:36px;line-height:1.08;color:#fff', 'Una historia<br>de hoy en<br>Balcarce');
  const a2 = K.div(s2, '', 'position:absolute;left:12px;bottom:26px;width:' + (o.w - 44) + 'px;height:118px;border-radius:12px;background:#fff;overflow:hidden', '');
  K.div(a2, '', BASE + 'left:14px;top:12px;font-weight:700;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:#1B5FC9', 'Auspicia');
  K.div(a2, '', BASE + 'left:14px;top:38px;' + SERIF + 'font-size:28px;line-height:1.05;color:' + TINTA, 'Tu comercio acá');
  K.div(a2, '', BASE + 'left:14px;top:84px;font-weight:600;font-size:16px;color:#6B6F6C', 'Tu mensaje en la historia');
  return { c, s1, s2, aviso, a2 };
}
/* los tres contadores de la versión B, en columna a la derecha del celular */
function contadoresB(K, parent, D, tiempos) {
  const cont = contadoresDeAlcance(K, D), salida = [];
  cont.forEach((c, i) => {
    const col = K.div(parent, '', 'position:absolute;left:420px;top:' + (668 + i * 176) + 'px;width:600px;height:160px;border-left:8px solid ' + (i === 0 ? '#fff' : i === 1 ? '#9FC0FF' : AMBAR) + ';padding-left:28px', '');
    const n = K.div(col, '', BASE + 'left:28px;top:0;font-weight:700;font-size:112px;line-height:1.1;letter-spacing:-.04em;color:#fff;font-variant-numeric:tabular-nums', miles(c.n));
    K.div(col, '', BASE + 'left:28px;top:116px;font-weight:600;font-size:34px;line-height:1.1;color:rgba(255,255,255,.88)', c.que);
    salida.push({ col, n, c });
    if (tiempos) { K.aparece(col, tiempos[i], { y: 40, d: 0.45, from: { x: 60 } }); subir(K, n, c.n, tiempos[i] + 0.1, 1.5); }
  });
  return salida;
}
function escenasMarcaB(K, S) {
  const D = S.datos, TL = K.TL, CT = K.CT, M = D.m;
  K.div(CT, '', 'position:absolute;inset:0;background:' + D.fondo);
  const anill = K.div(CT, '', 'position:absolute;inset:0;overflow:hidden');
  anillos(K, anill, TL, { n: 3, cx: 300, cy: 980, t0: 0, rep: 3 });
  const tC = D.c.escribinos - 0.1;
  TL.to(anill, { opacity: 0, duration: 0.5 }, tC);
  const grupo = K.div(CT, '', 'position:absolute;inset:0');
  marcaTitulo(K, grupo, '#fff', '#9FC0FF', [M.queres, M.comercio, M.las, M.de]);
  const cel = celular(K, grupo, { x: 60, y: 680, w: 300, h: 534 });
  K.aparece(cel.c, M.noticias, { y: 120, d: 0.6, ease: 'back.out(1.3)' });
  /* el aviso resalta en la nota; después la pantalla desliza a la historia y resalta en ella */
  TL.fromTo(cel.aviso, { boxShadow: '0 0 0 0 rgba(27,95,201,.6)' }, { boxShadow: '0 0 0 16px rgba(27,95,201,0)', duration: 0.9, repeat: 1, ease: 'power1.out' }, M.noticias + 0.7);
  TL.set(cel.s2, { yPercent: 100 }, 0);
  TL.to(cel.s2, { yPercent: 0, duration: 0.6, ease: 'power3.inOut' }, M.escribinos);
  TL.fromTo(cel.a2, { boxShadow: '0 0 0 0 rgba(255,255,255,.6)' }, { boxShadow: '0 0 0 16px rgba(255,255,255,0)', duration: 0.9, repeat: 1, ease: 'power1.out' }, M.escribinos + 0.8);
  /* los contadores suben uno por uno */
  contadoresB(K, grupo, D, [M.escribinos + 0.1, M.escribinos + 0.7, M.escribinos + 1.3]);
  const nota = K.div(grupo, '', 'position:absolute;left:420px;top:1206px;width:520px;font-weight:500;font-size:22px;line-height:1.25;color:rgba(255,255,255,.72)', D.alcance.texto);
  K.aparece(nota, M.escribinos + 1.6, { y: 8, d: 0.4 });
  contacto(K, D);
  retirar(K, [grupo], tC);
}

/* ================================================================ la entrada */
function tapa(K, S) {
  ({ viste: tapaViste, nota: tapaNota, evento: tapaEvento, marcaA: tapaMarcaA, marcaB: tapaMarcaB })[S.datos.variante](K, S);
}
function escenas(K, S) {
  ({ viste: escenasViste, nota: escenasNota, evento: escenasEvento, marcaA: escenasMarcaA, marcaB: escenasMarcaB })[S.datos.variante](K, S);
}
