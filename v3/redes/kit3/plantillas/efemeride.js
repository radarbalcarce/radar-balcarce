/* Plantilla de «Un día como hoy» (variante C de v2, con más imagen): la foto a todo el ancho y pegada arriba, sin márgenes (se recorta como mucho un 34 %, el retrato sin cortar la cabeza; ver `geom` en kit.js), sin nada
   encima salvo el rótulo chico «UN DÍA COMO HOY · 19 NOV». Donde termina la foto empieza la franja de papel con la regla roja y el AÑO GIGANTE en tinta montado sobre esa línea (corre hasta su valor); debajo, el hecho
   y «Hace N años». Si el guion nombra un segundo hecho, cuando la voz dice «También, en…» cambia la foto (la de ESE hecho; si no hay foto libre, la misma con otro encuadre) y el año gigante corre hasta el del segundo
   hecho. Ningún crédito dentro del video: el de Wikimedia Commons va en el texto del posteo. Sin foto libre, fondo de la marca (oscuro, con anillos). Lee SPEC.datos (desde-pieza.mjs). */
const TINTA = '#14161A', PAPEL = '#F3EBD8', ROJO = '#C7381C';
const GRAD = 'linear-gradient(165deg,#3A1A14 0%,#14161A 62%,#0B0D10 100%)';
const EM = (K, texto) => Math.min(360, K.fit(texto, 960, 360, 120, 0.6)); // el tamaño del año gigante: el que entra en 960 de ancho
const anioTop = (em, PT) => Math.round(PT - em * 0.55); // el número monta sobre la línea: casi todo arriba, la base sobre el papel
const AN = (em) => 'position:absolute;left:60px;font-family:SS4;font-weight:900;font-size:' + em + 'px;line-height:1;letter-spacing:-.03em;white-space:nowrap;font-variant-numeric:tabular-nums;color:' + TINTA + ';z-index:5;text-shadow:0 0 30px rgba(243,235,216,.35);';
const planoDe = (f, o) => Object.assign({ src: f ? f.src : null, w: f ? f.w : 1080, h: f ? f.h : 1920, panel: PAPEL, regla: ROJO, grad: GRAD, fijo: 880, fijoEscena: 880 }, o); // la efeméride lleva mucho texto bajo la foto: su alto fijo sigue en 880
// El velo de papel (20/11, el año «se perdía» con fotos oscuras o cargadas): un degradado del papel que sube desde la regla roja sobre el borde de abajo de la foto, así la parte alta del año gigante siempre cae sobre un fondo claro,
// con cualquier foto (y sin foto, sobre el fondo oscuro de la marca). Es opaco en la regla y se vuelve transparente 300 px más arriba: lo importante de la foto (arriba) no se toca.
const VELO_ALTO = 300;
const VELO = 'linear-gradient(to top,rgba(243,235,216,1) 0%,rgba(243,235,216,.97) 30%,rgba(243,235,216,.88) 55%,rgba(243,235,216,.72) 68%,rgba(243,235,216,.35) 86%,rgba(243,235,216,0) 100%)';
const velo = (K, parent, PT) => K.div(parent, '', 'position:absolute;left:0;top:' + (PT - VELO_ALTO) + 'px;width:1080px;height:' + VELO_ALTO + 'px;background:' + VELO + ';z-index:4;pointer-events:none');
const alturaDe =(K, texto, tam, lh, k) => K.lineasDe(texto, 960, tam, k) * tam * lh;
function tapa(K, S) {
  const T = K.TAPA, D = S.datos, f = D.foto;
  K.div(T, '', 'position:absolute;inset:0;background:' + PAPEL);
  const PT = K.fotoEstatica(T, planoDe(f, { off: 240, maxH: 1000, minH: 900 })).PTt, TIT = PT + 150; // la foto arranca en la fila 240: la grilla (285-1635) no le corta la cabeza
  const em = EM(K, String(D.anio));
  velo(K, T, PT);
  K.div(T, '', AN(em) + 'top:' + anioTop(em, PT) + 'px', String(D.anio));
  K.div(T, '', 'position:absolute;left:60px;top:91px;height:58px;padding:0 24px;display:flex;align-items:center;background:' + ROJO + ';color:#fff;font-weight:700;font-size:28px;letter-spacing:.16em;text-transform:uppercase;border-radius:4px;z-index:6;white-space:nowrap', D.rotulo);
  const tam = K.fitBox(D.titulo, 960, 110, 54, 34, 1.12, 0.62);
  const t = K.div(T, '', 'position:absolute;left:60px;top:' + TIT + 'px;width:960px;font-weight:700;font-size:' + tam + 'px;line-height:1.12;letter-spacing:.01em;text-transform:uppercase;color:' + TINTA + ';z-index:6;text-wrap:balance', '');
  t.textContent = D.titulo;
  if (D.hace) K.div(T, '', 'position:absolute;left:60px;top:' + Math.round(TIT + alturaDe(K, D.titulo, tam, 1.12, 0.62) + 12) + 'px;font-weight:600;font-size:40px;color:' + TINTA + ';opacity:.85;z-index:6;white-space:nowrap', D.hace);
}
function escenas(K, S) {
  const D = S.datos, TL = K.TL, FIN = S.dur - 1.5, f = D.foto, A = D.ademas;
  const tA = A ? Math.max(D.tAdemas, 2.8) : null; // cuando la voz llega al segundo hecho
  const tG = tA !== null ? tA : Math.max(3, FIN * 0.55); // el plano cambia aunque no haya segundo hecho
  const f2 = A && A.foto ? A.foto : f; // la foto del segundo hecho; sin ella, la misma con otro encuadre
  const PT1 = K.geom(planoDe(f, {})).PT, PT2 = K.geom(planoDe(f2, {})).PT, T1 = PT1 + 160, T2 = PT2 + 160;
  K.foto(planoDe(f, { t0: 0, t1: tG, z: 1 }));
  K.foto(planoDe(f2, A && A.foto ? { t0: tG, t1: FIN, entrada: 'izq', de: 0.6, dir: -1, z: 2 } : { t0: tG, t1: FIN, entrada: 'fundido', de: 0.7, dir: -1, z0: 1.06, z1: 1.0, z: 2 }));
  // el año gigante sobre la línea: corre hasta el del hecho y, con la voz del segundo hecho, hasta el de ese hecho
  const em = EM(K, String(D.anio));
  const v1 = velo(K, K.CT, PT1);
  const a1 =K.div(K.CT, '', AN(em) + 'top:' + anioTop(em, PT1) + 'px', String(D.anioDesde));
  TL.set(a1, { autoAlpha: 0 }, 0); TL.set(a1, { autoAlpha: 1 }, 0.3);
  TL.fromTo(a1, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, 0.3);
  const cont = { v: D.anioDesde };
  TL.fromTo(cont, { v: D.anioDesde }, { v: D.anio, duration: 1.5, ease: 'power3.out', onUpdate() { a1.textContent = String(Math.round(cont.v)); } }, 0.4);
  if (A && A.anio) {
    TL.fromTo(cont, { v: D.anio }, { v: A.anio, duration: 1.0, ease: 'power3.inOut', onUpdate() { a1.textContent = String(Math.round(cont.v)); } }, tA);
    if (PT2 !== PT1) { TL.to(a1, { y: PT2 - PT1, duration: 0.6, ease: 'power3.inOut' }, tA); TL.to(v1, { y: PT2 - PT1, duration: 0.6, ease: 'power3.inOut' }, tA); }
  }
  // la franja, fase 1: el hecho y cuánto hace
  const tam = K.fitBox(D.titulo, 960, 110, 54, 34, 1.12, 0.62);
  const t1 = K.div(K.CT, '', 'position:absolute;left:60px;top:' + T1 + 'px;width:960px');
  K.linea(t1, D.titulo, '', 'font-weight:700;font-size:' + tam + 'px;line-height:1.12;letter-spacing:.01em;text-transform:uppercase;color:' + TINTA + ';text-wrap:balance', 0.45, { salida: tA !== null ? tA - 0.05 : null });
  if (D.hace) {
    const h = K.div(K.CT, '', 'position:absolute;left:60px;top:' + Math.round(T1 + alturaDe(K, D.titulo, tam, 1.12, 0.62) + 12) + 'px;font-weight:600;font-size:40px;color:' + TINTA + ';opacity:.85;white-space:nowrap', D.hace);
    K.aparece(h, 0.7, { y: 20, salida: tA !== null ? tA - 0.05 : null });
  }
  // fase 2: «También, en 1493…»: su foto, su año y su texto
  if (A) {
    const k = K.div(K.CT, '', 'position:absolute;left:60px;top:' + T2 + 'px;font-weight:700;font-size:30px;letter-spacing:.14em;text-transform:uppercase;color:' + ROJO + ';white-space:nowrap', 'También' + (A.hace ? ' · ' + A.hace : ''));
    K.aparece(k, tA + 0.1, { y: 20 });
    const tt = K.fitBox(A.texto, 960, 140, 44, 30, 1.18, 0.55);
    const b = K.div(K.CT, '', 'position:absolute;left:60px;top:' + (T2 + 46) + 'px;width:960px');
    K.linea(b, A.texto, '', 'font-weight:600;font-size:' + tt + 'px;line-height:1.18;color:' + TINTA + ';text-wrap:balance', tA + 0.25);
  }
}
