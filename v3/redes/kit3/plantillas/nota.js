/* Plantilla de la nota (reel de una nota y nota propia) del kit 3.0: de 1 a 3 fotos, cada una a todo el ancho y pegada arriba (se recorta como mucho un 34 %; ver `geom` en kit.js), con movimiento suave; el rótulo con la
   sección en su color; el titular (en la primera) o una frase de la nota (en las otras) ENTERO, en serif blanco, DEBAJO de la foto sobre fondo oscuro; los subtítulos más abajo. Ningún crédito de foto dentro del video
   (va en el texto del posteo); la nota propia firma «Por Hernán Accomo» a la derecha del rótulo (es la firma de la nota, no un crédito). Sin foto, fondo de la marca. Lee SPEC.datos (desde-pieza.mjs). */
const PANEL = '#14161A';
const planoDe = (f, o) => Object.assign({ src: f ? f.src : null, w: f ? f.w : 1080, h: f ? f.h : 1920, panel: PANEL }, o);
function tapa(K, S) {
  const T = K.TAPA, D = S.datos, X = D.tapa, f = X.foto;
  K.div(T, '', 'position:absolute;inset:0;background:#14161A');
  const PT = K.fotoEstatica(T, planoDe(f, { off: 240, maxH: 1000, minH: 900 })).PTt; // la foto arranca en la fila 240: la grilla (285-1635) no le corta la cabeza
  K.div(T, '', 'position:absolute;left:60px;top:91px;height:58px;padding:0 24px;display:flex;align-items:center;background:' + D.color + ';color:#fff;font-weight:700;font-size:28px;letter-spacing:.16em;text-transform:uppercase;border-radius:4px', D.seccion);
  const tam = K.fitBox(X.titulo, 960, 1530 - PT - 35, 88, 48, 1.06, 0.56);
  const t = K.div(T, '', 'position:absolute;left:60px;top:' + (PT + 35) + 'px;width:960px;font-family:SS4;font-weight:900;font-size:' + tam + 'px;line-height:1.06;color:#FAF8F3;text-shadow:0 4px 24px rgba(0,0,0,.5);text-wrap:balance', '');
  t.textContent = X.titulo;
}
function escenas(K, S) {
  const D = S.datos, E = D.escenas, t = D.t, FIN = S.dur - 1.5;
  const ENTRADAS = ['corte', 'izq', 'abajo', 'der'];
  E.forEach((e, i) => {
    const t0 = i === 0 ? 0 : t[i], t1 = i < E.length - 1 ? t[i + 1] : FIN, f = e.foto, tn = t[i];
    K.foto(planoDe(f, { t0, t1, entrada: ENTRADAS[i % 4], dir: i % 2 ? -1 : 1, z: i * 2 + 1 }));
    const PT = K.geom(planoDe(f, {})).PT;
    const tam = K.fitBox(e.titular, 960, 1255 - PT - 25, i === 0 ? 70 : 64, 38, 1.08, 0.6);
    const b = K.div(K.CT, '', 'position:absolute;left:60px;top:' + (PT + 25) + 'px;width:960px');
    K.linea(b, e.titular, '', 'font-family:SS4;font-weight:900;font-size:' + tam + 'px;line-height:1.08;color:#fff;text-wrap:balance;text-shadow:0 5px 26px rgba(0,0,0,.55)', tn + 0.35, { d: 0.6, salida: i < E.length - 1 ? t1 - 0.05 : null });
    if (D.firma) K.firma(D.firma, tn, i < E.length - 1 ? t1 : null);
  });
}
