// Cuando la foto de una nota ya posteada en Facebook cambia (regla 283, 17/10/2026).
//
// El caso real (Hernán, 17/10): «Santiago Gilligan busca sumar sus primeros minutos en la Serie A de Italia» (id 19nga6r) se publicó en Facebook a las
// 14:35 UTC con la ilustración de IA que se le había generado a las 14:22. A las 17:02 El Diario Balcarce subió su foto real y el banco de fotos la
// puso en la nota. La web muestra la real; Facebook se quedó con la ilustración.
//
// Dos cosas distintas, y conviene no confundirlas:
//
//   · La TARJETA DE VISTA PREVIA de un enlace (la que Facebook arma con la imagen de la página, `og:image`) la guarda Facebook y no la actualiza sola.
//     Se le puede pedir que vuelva a leer la página: `POST /?id=<url>&scrape=true` (referencia de la API de Meta para el nodo URL; es lo que hace el
//     "Sharing Debugger"). Eso es lo que hace `releerEnlace` (redes/meta.mjs) para los posteos que salieron como ENLACE.
//   · La FOTO de un posteo con foto (lo que sale por defecto: `publicarFotoEnFacebook`) la baja Facebook de la tarjeta de la nota en el momento
//     de publicar y la GUARDA en la página. Releer la dirección de la nota no la cambia: Facebook no tiene una llamada para reemplazar la imagen de un
//     posteo ya publicado (sí el texto). Por eso lo que de verdad evita el problema es esperar a la foto definitiva antes de publicar
//     (`esperaFotoDefinitiva`, apagada por defecto: FACEBOOK.horasEsperandoFotoReal en 0). Ver docs/redes/FOTO-CAMBIADA-DESPUES-DEL-POSTEO.md.
//
// Todo acá es una función pura (sin red, sin reloj propio): se prueba con datos grabados.
//
// Sin dependencias: sólo lo que trae Node.

/** Cuánto tiempo después del posteo se vuelve a leer la página si cambia la foto: el posteo viejo ya no importa. */
export const HORAS_DE_RELECTURA = 48;

const tiempo = (iso) => {
  const t = Date.parse(iso ?? '');
  return Number.isFinite(t) ? t : null;
};

/**
 * La foto que la web le muestra a una nota, por lo que dicen los tres libros de fotos: lo de una persona (`manuales`) y lo que eligió el robot (`banco`)
 * mandan sobre la ilustración con IA (`fotosIA`, la de menor prioridad: web/scripts/fotos-notas.mjs, conFotosDelBanco).
 * Devuelve { origen: 'real' | 'ia' | null, cuando: ISO | null, archivo }.
 */
export function fotoQueSeVe(id, { banco = {}, manuales = {}, fotosIA = {} } = {}) {
  const reales = [banco?.[id], manuales?.[id]].filter((f) => f?.archivo);
  if (reales.length) {
    const ultima = reales.reduce((a, b) => ((tiempo(b.cuando) ?? 0) > (tiempo(a.cuando) ?? 0) ? b : a));
    return { origen: 'real', cuando: ultima.cuando ?? null, archivo: ultima.archivo };
  }
  const ia = fotosIA?.[id];
  if (ia?.archivo) return { origen: 'ia', cuando: ia.cuando ?? null, archivo: ia.archivo };
  return { origen: null, cuando: null, archivo: null };
}

/**
 * Los posteos de Facebook de las últimas `horas` horas cuya foto cambió DESPUÉS de publicarse y cuya relectura todavía no se pidió para ese cambio.
 * Cada uno, una sola vez por cambio: `libro.facebook[id].relectura.deLaFoto` guarda el momento del cambio que ya se atendió.
 *
 * @returns {{ id: string, enlace: string, titulo: string, posteo: string, desde: string, origen: string, comoSalio: string|null }[]}
 */
export function fotosCambiadasDespuesDelPosteo({ libro = {}, banco = {}, manuales = {}, fotosIA = {}, ahora = new Date(), horas = HORAS_DE_RELECTURA } = {}) {
  const limite = new Date(ahora).getTime() - horas * 3600e3;
  const salida = [];
  for (const [id, p] of Object.entries(libro?.facebook ?? {})) {
    const posteo = tiempo(p?.cuando);
    if (!posteo || posteo < limite || !p.enlace) continue;
    const foto = fotoQueSeVe(id, { banco, manuales, fotosIA });
    const cambio = tiempo(foto.cuando);
    if (!cambio || cambio <= posteo) continue; // la foto ya estaba al publicar (o no se sabe cuándo llegó)
    const atendido = tiempo(p.relectura?.deLaFoto);
    if (atendido && atendido >= cambio) continue; // ya se pidió para este cambio
    salida.push({ id, enlace: String(p.enlace).replace(/[?#].*$/, ''), titulo: p.titulo ?? '', posteo: p.cuando, desde: foto.cuando, origen: foto.origen, comoSalio: p.como ?? null });
  }
  return salida.sort((a, b) => tiempo(a.desde) - tiempo(b.desde));
}

/** ¿Es una ilustración hecha con IA la foto de esta nota (la de la portada)? Por el archivo (`<id>-ia.jpg`) o por el epígrafe. */
export const esFotoDeIA = (nota) => /-ia\.\w+$/i.test(String(nota?.foto?.archivo ?? '')) || /^ilustraci[oó]n generada con ia/i.test(String(nota?.foto?.credito ?? ''));

/**
 * ¿Conviene esperar un poco más a que aparezca la foto real antes de publicar? Sólo si la nota hoy tiene una ilustración de IA (no una foto real),
 * no la marcó una persona y todavía no pasaron `horas` horas desde que la nota salió en la web. Con `horas` en 0 (el valor por defecto) nunca espera:
 * es una propuesta, no una regla (docs/redes/FOTO-CAMBIADA-DESPUES-DEL-POSTEO.md). Una nota SIN foto ya espera `horasEsperandoFoto` en elegirParaFacebook.
 *
 * @param {object} nota
 * @param {number} edadMinutos  minutos desde que la nota salió en la web (o desde que una persona la marcó)
 */
export function esperaFotoDefinitiva(nota, edadMinutos, horas = 0) {
  if (!(horas > 0) || nota?.aprobadaParaRedes) return false;
  return esFotoDeIA(nota) && edadMinutos < horas * 60;
}

