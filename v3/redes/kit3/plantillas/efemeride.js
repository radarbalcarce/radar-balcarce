/* Plantilla de «Un día como hoy» (variante C de v2, con más imagen): la foto a todo el ancho y pegada arriba, sin márgenes (se recorta como mucho un 34 %, el retrato sin cortar la cabeza; ver `geom` en kit.js), sin nada
   encima salvo el rótulo chico «UN DÍA COMO HOY · 19 NOV». Donde termina la foto empieza la franja de papel con la regla roja y el AÑO GIGANTE en tinta montado sobre esa línea (corre hasta su valor); debajo, el hecho
   y «Hace N años». Cada hecho que dice la voz («También, en…», «En…», «Además…») tiene su escena: su foto (la de ESE hecho, nunca repetida; sin foto libre confiable, fondo de la marca con el velo de papel), su año gigante (o «HOY» si no tiene año) y su texto. Ningún crédito dentro del video: el de Wikimedia Commons va en el texto del posteo. Sin foto libre, fondo de la marca (oscuro, con anillos). Lee SPEC.datos (desde-pieza.mjs). */
const TINTA = '#14161A', PAPEL = '#F3EBD8', ROJO = '#C7381C';
const GRAD = 'linear-gradient(165deg,#3A1A14 0%,#14161A 62%,#0B0D10 100%)';
const EM = (K, texto) => Math.min(360, K.fit(texto, 960, 360, 120, 0.6)); // el tamaño del año gigante: el que entra en 960 de ancho
const anioTop = (em, PT) => Math.round(PT - em * 0.55); // el número monta sobre la línea: casi todo arriba, la base sobre el papel
const AN = (em) => 'position:absolute;left:60px;font-family:SS4;font-weight:900;font-size:' + em + 'px;line-height:1;letter-spacing:-.03em;white-space:nowrap;font-variant-numeric:tabular-nums;color:' + TINTA + ';z-index:5;text-shadow:0 0 30px rgba(243,235,216,.35);';
const planoDe = (f, o) => Object.assign({ src: f ? f.src : null, w: f ? f.w : 1080, h: f ? f.h : 1920, relleno: f ? f.relleno : null, panel: PAPEL, regla: ROJO, grad: GRAD, fijo: 880, fijoEscena: 880, margenArriba: 170 }, o); // margenArriba: una imagen entera (un flyer) queda debajo del rótulo y no se lo tapa // la efeméride lleva mucho texto bajo la foto: su alto fijo sigue en 880
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
  /* UNA ESCENA POR CADA HECHO QUE DICE LA VOZ (20/11): D.hechos = [principal, ...además], cada uno con su año (o sin año: «HOY»), su texto, su foto (o fondo de marca) y el segundo en que la voz lo empieza (t).
     Entre hecho y hecho: el año viejo sale hacia arriba y entra el nuevo DIRECTO (deslizando y con fundido, sin contar desde el anterior), el texto cambia y la foto cruza en fundido. */
  const D = S.datos, TL = K.TL, FIN = S.dur - 1.5, H = D.hechos;
  const PT = K.geom(planoDe(null, {})).PT, T1 = PT + 160;
  const em = EM(K, '2026');
  velo(K, K.CT, PT);
  const inicios = H.map((h, i) => (i === 0 ? 0 : Math.max(h.t, 0)));
  const fines = H.map((h, i) => (i + 1 < H.length ? inicios[i + 1] : FIN));
  H.forEach((h, i) => {
    const t0 = inicios[i], t1 = fines[i], ultimo = i === H.length - 1, sale = ultimo ? null : t1 - 0.05;
    // la foto: la primera de corte (desde el principio), las demás cruzan en fundido; sin foto, el fondo de la marca con el velo de papel
    K.foto(planoDe(h.foto, i === 0 ? { t0: 0, t1, z: 1 } : { t0, t1, entrada: 'fundido', de: 0.7, dir: i % 2 ? -1 : 1, z: 1 + i }));
    // el año gigante (o «HOY») sobre la línea
    const texto = h.anio ? String(h.anio) : 'HOY';
    const an = K.div(K.CT, '', AN(em) + 'top:' + anioTop(em, PT) + 'px', i === 0 ? String(D.anioDesde) : texto); // sólo el primer año corre hasta su valor; los siguientes entran DIRECTO con el año verdadero (nunca se ve pasar un año que no existe, p. ej. 1800 entre 1694 y 1905)
    const entra = i === 0 ? 0.3 : t0 + 0.15;
    TL.set(an, { autoAlpha: 0 }, 0); TL.set(an, { autoAlpha: 1 }, entra);
    TL.fromTo(an, { y: i === 0 ? 40 : 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, entra);
    if (i === 0 && h.anio) {
      const cont = { v: D.anioDesde };
      TL.fromTo(cont, { v: D.anioDesde }, { v: h.anio, duration: 1.5, ease: 'power3.out', onUpdate() { an.textContent = String(Math.round(cont.v)); } }, entra + 0.1);
    }
    if (sale !== null) TL.to(an, { y: -70, opacity: 0, duration: 0.35, ease: 'power2.in' }, sale - 0.3);
    if (sale !== null) TL.set(an, { autoAlpha: 0 }, sale + 0.05);
    // la franja: el hecho (el principal en grande) y cuánto hace
    if (i === 0) {
      const tam = K.fitBox(D.titulo, 960, 110, 54, 34, 1.12, 0.62);
      const t = K.div(K.CT, '', 'position:absolute;left:60px;top:' + T1 + 'px;width:960px');
      K.linea(t, D.titulo, '', 'font-weight:700;font-size:' + tam + 'px;line-height:1.12;letter-spacing:.01em;text-transform:uppercase;color:' + TINTA + ';text-wrap:balance', 0.45, { salida: sale });
      if (D.hace) K.aparece(K.div(K.CT, '', 'position:absolute;left:60px;top:' + Math.round(T1 + alturaDe(K, D.titulo, tam, 1.12, 0.62) + 12) + 'px;font-weight:600;font-size:40px;color:' + TINTA + ';opacity:.85;white-space:nowrap', D.hace), 0.7, { y: 20, salida: sale });
    } else {
      const k = K.div(K.CT, '', 'position:absolute;left:60px;top:' + T1 + 'px;font-weight:700;font-size:30px;letter-spacing:.14em;text-transform:uppercase;color:' + ROJO + ';white-space:nowrap', (i === 1 ? 'También' : 'Y además') + (h.hace ? ' · ' + h.hace : ''));
      K.aparece(k, t0 + 0.2, { y: 20, salida: sale });
      const tt = K.fitBox(h.texto, 960, 140, 44, 30, 1.18, 0.55);
      const b = K.div(K.CT, '', 'position:absolute;left:60px;top:' + (T1 + 46) + 'px;width:960px');
      K.linea(b, h.texto, '', 'font-weight:600;font-size:' + tt + 'px;line-height:1.18;color:' + TINTA + ';text-wrap:balance', t0 + 0.3, { salida: sale });
    }
  });
}
