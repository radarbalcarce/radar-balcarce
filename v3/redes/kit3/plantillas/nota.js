/* Plantilla de la nota (reel de una nota y nota propia) del kit 3.0: de 1 a 3 fotos a pantalla completa, cada una con su movimiento y su entrada; el titular (en la primera) o una frase de la nota
   (en las otras) entero, en serif blanco; el rótulo con la sección en su color; el crédito de la foto, chico, abajo (nunca encima de la imagen como marca), y en la nota propia «Por Hernán Accomo»
   a la derecha de la fila del crédito. Sin foto, fondo de la marca. Lee SPEC.datos (desde-pieza.mjs). */
const planoDe = (f, o) => Object.assign({ src: f ? f.src : null, w: f ? f.w : 1080, h: f ? f.h : 1920, contain: f ? f.contain : false, yc: f ? f.yc : 700, cw: 1080 }, o);
function tapa(K, S) {
  const T = K.TAPA, D = S.datos, X = D.tapa, f = X.foto;
  K.fotoEstatica(T, f ? { src: f.src, w: f.w, h: f.h, contain: f.contain, top: 0, alto: 1920, yc: 700, f: [0.5, 0.5] } : { top: 0, alto: 1920, yc: 700 });
  K.div(T, '', 'position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,10,14,.4) 0%,rgba(8,10,14,0) 22%,rgba(8,10,14,0) 44%,rgba(8,10,14,.72) 66%,rgba(8,10,14,.86) 100%)');
  K.div(T, '', 'position:absolute;left:60px;top:315px;height:58px;padding:0 24px;display:flex;align-items:center;background:' + D.color + ';color:#fff;font-weight:700;font-size:28px;letter-spacing:.16em;text-transform:uppercase;border-radius:4px', D.seccion);
  const tam = K.fitBox(X.titulo, 960, 440, 92, 48, 1.06, 0.56);
  const t = K.div(T, '', 'position:absolute;left:60px;top:1000px;width:960px;font-family:SS4;font-weight:900;font-size:' + tam + 'px;line-height:1.06;color:#FAF8F3;text-shadow:0 4px 24px rgba(0,0,0,.5);text-wrap:balance', '');
  t.textContent = X.titulo;
  if (X.credito) { const c = K.div(T, '', 'position:absolute;left:60px;top:1470px;width:960px;font-weight:600;font-size:24px;line-height:30px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:rgba(255,255,255,.9);text-shadow:0 2px 10px rgba(0,0,0,.8)', ''); c.textContent = X.credito; }
}
function escenas(K, S) {
  const D = S.datos, E = D.escenas, t = D.t, FIN = S.dur - 1.5;
  const ENTRADAS = ['corte', 'izq', 'circulo', 'abajo'];
  const FOCOS = [[[0.55, 0.5], [0.6, 0.35]], [[0.7, 0.7], [0.62, 0.62]], [[0.4, 0.4], [0.55, 0.5]]];
  E.forEach((e, i) => {
    const t0 = t[i], t1 = i < E.length - 1 ? t[i + 1] : FIN, f = e.foto;
    const fo = FOCOS[i % 3];
    if (t1 - t0 > 5) {
      const tm = t0 + (t1 - t0) * 0.55;
      K.foto(planoDe(f, { t0, t1: tm, entrada: ENTRADAS[i % 4], f0: fo[0], f1: fo[1], s0: 1.0, s1: 1.1, z: i * 2 + 1 }));
      K.foto(planoDe(f, { t0: tm, t1, entrada: 'circulo', f0: [0.8 - fo[0][0] * 0.4, 0.45], f1: [0.55, 0.5], s0: 1.25, s1: 1.15, z: i * 2 + 2 }));
    } else K.foto(planoDe(f, { t0, t1, entrada: ENTRADAS[i % 4], f0: fo[0], f1: fo[1], s0: 1.0, s1: 1.1, z: i * 2 + 1 }));
    const tam = K.fitBox(e.titular, 960, 560, i === 0 ? 96 : 84, 42, 1.06, 0.56);
    const b = K.div(K.CT, '', 'position:absolute;left:60px;bottom:900px;width:960px');
    K.linea(b, e.titular, '', 'font-family:SS4;font-weight:900;font-size:' + tam + 'px;line-height:1.06;color:#fff;text-wrap:balance;text-shadow:0 5px 26px rgba(0,0,0,.55)', t0 + 0.35, { d: 0.6, salida: i < E.length - 1 ? t1 - 0.05 : null });
    K.credito(e.credito, t0, i < E.length - 1 ? t1 : null, D.firma ? { firma: D.firma } : null);
  });
}
