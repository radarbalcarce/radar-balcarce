// Las notas que escribe una persona de la redacción desde el panel del celular (30/10/2026, Hernán: "que en el panel yo pueda publicar notas
// directamente, donde tenga que solo pegar título, copete y cuerpo de la nota, además de subir fotos para poner entre la nota, más la de
// portada y quién firma"). A diferencia de las notas de una pista, no pasan por la IA ni por el verificador: lo que la persona escribe es lo que
// sale. Quedan en web/data/notas-de-redaccion.json (las escribe sólo el celular) y acá se leen y se arman, con la forma de las otras notas
// propias (la del dólar, la de una pista). Sin dependencias: lo usan el generador de datos, la página de la nota y las pruebas.
//
// Cada entrada de `notas` (la clave es la del panel: "r" y letras y números, y no cambia nunca aunque se edite):
//   { titulo, copete, cuerpo, seccion, firma, portada: { archivo, ancho, alto, epigrafe, credito } | null,
//     fotos: [{ archivo, ancho, alto, epigrafe, credito }], slug, cuando, por, motivo, editada?, editadaPor?, retirada? }
// Sin `motivo`, `cuando` y `por` no se acepta (como correcciones.json: lo hizo una persona y tiene que decir quién y cuándo).
//
// El cuerpo se guarda tal como se escribió: los párrafos se separan con una línea en blanco y una foto va "entre" los párrafos con una línea sola
// "[foto 1]", "[foto 2]"… (el número de la foto dentro de `fotos`). Una foto sin su marca va al final. La nota armada lleva el cuerpo SIN las marcas
// (`cuerpo`, texto plano para el buscador, el feed y los datos para Google) y las fotos con el lugar en que van (`fotosEnCuerpo`, `despuesDe`:
// cuántos párrafos van antes de ella).

import { tieneCuerpo, palabrasDe } from './cuerpo.js';
import { SECCIONES_DE_PISTAS } from './notas-de-pistas.js';

/** La relevancia con que entra una nota de la redacción: alta, como las de una pista (lo que escribe una persona se ve). */
export const RELEVANCIA_DE_REDACCION = 95;
/** Cuánto tiempo sigue existiendo la nota (como las demás: 180 días). */
export const DIAS_DE_UNA_NOTA_DE_REDACCION = 180;
/** Las mismas catorce secciones de siempre. */
export const SECCIONES_DE_REDACCION = SECCIONES_DE_PISTAS;
/** La firma que trae el formulario. */
export const AUTOR_POR_DEFECTO = 'Hernán Accomo';
export const MAXIMO_DE_FOTOS_EN_UNA_NOTA = 10;

const MAXIMO_TITULO = 200;

/** El id de la nota: "nr" y la clave del panel sin su "r" de adelante, sólo letras y números (la dirección de una nota usa lo que va después del último guion). */
export const idDeNotaDeRedaccion = (clave) => `nr${String(clave ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase().replace(/^r/, '').slice(0, 24)}`;

/** Una foto de la nota: carpeta fotos-notas/ (donde las sirve el sitio), a la vista, sin subcarpetas. */
const FOTO_VALIDA = /^fotos-notas\/redaccion-[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|jpeg|png|webp)$/;
export const esFotoDeRedaccion = (archivo) => FOTO_VALIDA.test(String(archivo ?? ''));

const SLUG_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ------------------------------------------------------------------ el cuerpo y sus fotos

/** Una línea que es sólo la marca de una foto: "[foto 1]" (mayúsculas, espacios de más y "[Foto1]" valen igual: el teclado del celular pone la F mayúscula). */
const MARCA_SOLA = /^\s*\[\s*foto\s*(\d{1,2})\s*\]\s*$/i;
const MARCA_EN_EL_TEXTO = /\s*\[\s*foto\s*\d{1,2}\s*\]\s*/gi;

/**
 * Parte el cuerpo escrito en párrafos y dice dónde va cada foto.
 * Devuelve { parrafos: [texto], fotosEn: [{ n, despuesDe }], sinMarca: [n], invalidas: [n], repetidas: [n], sueltas: [párrafos con una marca pegada a un texto] }.
 *   · Un párrafo termina en una línea en blanco o en la marca de una foto; las líneas de un mismo párrafo se juntan con un espacio.
 *   · `[foto N]` con N que no existe (`cantidadDeFotos`) se descarta; la segunda marca de una misma foto, también (una foto se muestra una sola vez).
 *   · Las fotos que no tienen su marca van al final, en orden.
 *   · Una marca pegada a un texto ("mirá [foto 1] esto") no es una marca: se saca del párrafo y se avisa en `sueltas` (el panel no deja publicarla).
 */
export function partirCuerpo(texto, cantidadDeFotos = 0) {
  const lineas = String(texto ?? '').replace(/\r\n?/g, '\n').split('\n');
  const parrafos = [];
  const fotosEn = [];
  const usadas = new Set();
  const invalidas = [];
  const repetidas = [];
  const sueltas = [];
  let actual = [];
  const cerrar = () => {
    if (!actual.length) return;
    const crudo = actual.join(' ').replace(/\s+/g, ' ').trim();
    const limpio = crudo.replace(MARCA_EN_EL_TEXTO, ' ').replace(/\s+/g, ' ').trim();
    if (limpio !== crudo) sueltas.push(crudo);
    if (limpio) parrafos.push(limpio);
    actual = [];
  };
  for (const linea of lineas) {
    const m = MARCA_SOLA.exec(linea);
    if (m) {
      cerrar();
      const n = Number(m[1]);
      if (n < 1 || n > cantidadDeFotos) invalidas.push(n);
      else if (usadas.has(n)) repetidas.push(n);
      else { usadas.add(n); fotosEn.push({ n, despuesDe: parrafos.length }); }
      continue;
    }
    if (!linea.trim()) { cerrar(); continue; }
    actual.push(linea.trim());
  }
  cerrar();
  const sinMarca = [];
  for (let n = 1; n <= cantidadDeFotos; n += 1) {
    if (usadas.has(n)) continue;
    sinMarca.push(n);
    fotosEn.push({ n, despuesDe: parrafos.length });
  }
  return { parrafos, fotosEn, sinMarca, invalidas, repetidas, sueltas };
}

/** El cuerpo sin las marcas, como texto plano: párrafos separados por una línea en blanco. */
export const cuerpoPlano = (texto, cantidadDeFotos = 0) => partirCuerpo(texto, cantidadDeFotos).parrafos.join('\n\n');

// ------------------------------------------------------------------ la leyenda de una foto

/** "Foto: Hernán Accomo": el crédito como va en el epígrafe (igual que creditoDeFoto de web/public/panel/fotos.js). */
export function creditoDeFoto(texto) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim().replace(/^foto:\s*/i, '').slice(0, 80).trim();
  return t ? `Foto: ${t}` : '';
}

/** Lo que se lee debajo de la foto: el epígrafe y el crédito ("Vista del acto. Foto: Hernán Accomo"). Vacío si no hay ninguno. */
export function leyendaDeFoto(epigrafe, credito) {
  const e = String(epigrafe ?? '').replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '');
  const c = creditoDeFoto(credito);
  return [e ? `${e}.` : '', c].filter(Boolean).join(' ');
}

const medida = (x) => (Number.isInteger(x) && x >= 1 && x <= 10000 ? x : undefined);

/** Una foto de la entrada, limpia; null si no sirve (sin archivo válido). */
function fotoLimpia(f) {
  if (!f || typeof f !== 'object' || !esFotoDeRedaccion(f.archivo)) return null;
  return {
    archivo: f.archivo,
    ancho: medida(f.ancho),
    alto: medida(f.alto),
    epigrafe: String(f.epigrafe ?? '').replace(/\s+/g, ' ').trim().slice(0, 300),
    credito: String(f.credito ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
  };
}

// ------------------------------------------------------------------ validar y armar

/** ¿La entrada está completa? Devuelve el motivo si no, o null. */
export function motivoDeRechazo(e) {
  if (!e || typeof e !== 'object') return 'no es un objeto';
  if (!e.motivo || !e.cuando || !e.por) return 'falta motivo, cuándo o quién';
  if (!Number.isFinite(Date.parse(e.cuando))) return 'la fecha no es válida';
  const titulo = String(e.titulo ?? '').trim();
  if (!titulo || !String(e.copete ?? '').trim()) return 'falta el título o la bajada';
  if (titulo.length > MAXIMO_TITULO) return 'el título es larguísimo';
  if (!SECCIONES_DE_REDACCION.includes(e.seccion)) return 'la sección no existe';
  if (!autorDeLaEntrada(e)) return 'falta la firma';
  const fotos = Array.isArray(e.fotos) ? e.fotos : [];
  const plano = cuerpoPlano(e.cuerpo, fotos.length);
  if (!tieneCuerpo({ propia: 'redaccion', cuerpo: plano, copete: e.copete })) return 'el cuerpo es muy corto';
  return null;
}

/** La firma que se lee: el nombre sin "Por" adelante, hasta 60 caracteres. */
export const autorDeLaEntrada = (e) => String(e?.firma ?? '').replace(/\s+/g, ' ').trim().replace(/^por(?:\s+|$)/i, '').slice(0, 60).trim();

/** La frase de la firma al pie de la nota (components/metadatos.js, firmaCorta): dice quién la escribió. */
export const firmaDeRedaccion = (autor) => `Por ${autor}, de la redacción de Radar Balcarce`;

/** Los ids de las notas de la redacción retiradas por una persona (generar-datos las saca del archivo: su página deja de existir). */
export function idsRetiradosDeRedaccion(json) {
  const entradas = json && typeof json === 'object' ? Object.entries(json.notas ?? {}) : [];
  return new Set(entradas.filter(([, e]) => e && typeof e === 'object' && e.retirada).map(([clave]) => idDeNotaDeRedaccion(clave)));
}

/**
 * Las fotos (de la entrada) que usa una nota, para que ninguna se pode: las de portada y las de adentro, por nombre de archivo.
 * (web/scripts/fotos-notas.mjs, podarFotos, nunca borra un archivo "redaccion-…", pero esto sirve para controlar y para el panel.)
 */
export function archivosDeFotosDeRedaccion(json) {
  const salida = new Set();
  const entradas = json && typeof json === 'object' ? Object.values(json.notas ?? {}) : [];
  for (const e of entradas) {
    for (const f of [e?.portada, ...(Array.isArray(e?.fotos) ? e.fotos : [])]) if (f && esFotoDeRedaccion(f.archivo)) salida.add(f.archivo.split('/').pop());
  }
  return salida;
}

/**
 * Las notas armadas con lo guardado, las que no están retiradas ni vencidas. Una entrada rota se saltea (no rompe a las demás); una foto rota
 * (un archivo que no corresponde) se saltea sin tirar la nota. La fecha es la de la primera vez: editar una nota no la rejuvenece (`editada`
 * sólo suma "Actualizado" y la fecha de modificación).
 */
export function notasDeRedaccion(json, { ahora = new Date() } = {}) {
  const entradas = json && typeof json === 'object' ? Object.entries(json.notas ?? {}) : [];
  const salida = [];
  for (const [clave, e] of entradas) {
    if (motivoDeRechazo(e) || e.retirada) continue;
    const fecha = new Date(e.cuando).toISOString();
    if (ahora - Date.parse(fecha) > DIAS_DE_UNA_NOTA_DE_REDACCION * 864e5) continue;
    const autor = autorDeLaEntrada(e);
    const fotosGuardadas = (Array.isArray(e.fotos) ? e.fotos : []).slice(0, MAXIMO_DE_FOTOS_EN_UNA_NOTA);
    const { parrafos, fotosEn } = partirCuerpo(e.cuerpo, fotosGuardadas.length);
    const fotos = fotosGuardadas.map(fotoLimpia);
    const fotosEnCuerpo = fotosEn
      .filter(({ n }) => fotos[n - 1])
      .map(({ n, despuesDe }) => {
        const f = fotos[n - 1];
        const leyenda = leyendaDeFoto(f.epigrafe, f.credito);
        return {
          archivo: f.archivo,
          ...(f.ancho ? { ancho: f.ancho } : {}),
          ...(f.alto ? { alto: f.alto } : {}),
          ...(f.epigrafe ? { epigrafe: f.epigrafe } : {}),
          ...(f.credito ? { credito: creditoDeFoto(f.credito) } : {}),
          leyenda,
          despuesDe,
        };
      });
    const portada = fotoLimpia(e.portada);
    const editada = Number.isFinite(Date.parse(e.editada ?? '')) ? new Date(e.editada).toISOString() : null;
    salida.push({
      id: idDeNotaDeRedaccion(clave),
      propia: 'redaccion',
      redaccion: clave,
      titulo: String(e.titulo).replace(/\s+/g, ' ').trim(),
      copete: String(e.copete).replace(/\s+/g, ' ').trim(),
      cuerpo: parrafos.join('\n\n'),
      guion: null,
      seccion: e.seccion,
      local: e.seccion === 'Balcarce',
      relevancia: RELEVANCIA_DE_REDACCION,
      // Sin fuentes: la escribió una persona. Nada de "Fuentes (N)" vacío al pie (components/verificacion.js): queda la línea de la firma sola.
      medios: [],
      enlace: null,
      fuentesConsultadas: [],
      fecha,
      sinFecha: false,
      visto: fecha,
      publicadaPor: String(e.por).slice(0, 30),
      publicadaCuando: fecha,
      temas: [],
      etiquetas: [],
      // La publicó una persona: se respeta (no es "automática"), el verificador no la toca.
      como: 'publicada',
      autor,
      firma: firmaDeRedaccion(autor),
      ...(typeof e.slug === 'string' && SLUG_VALIDO.test(e.slug) && e.slug.length <= 80 ? { slug: e.slug } : {}),
      ...(portada ? { foto: { archivo: portada.archivo, credito: leyendaDeFoto(portada.epigrafe, portada.credito) || 'Foto: Radar Balcarce' } } : {}),
      ...(fotosEnCuerpo.length ? { fotosEnCuerpo } : {}),
      ...(editada ? { corregidaCuando: editada } : {}),
    });
  }
  return salida;
}

/**
 * A la nota armada le saca las fotos cuyo archivo no está (`existe(nombre)` dice si está en web/public/fotos-notas/): nunca una imagen rota.
 * Devuelve la misma nota si todo está; una nota nueva si hubo que sacar algo.
 */
export function sinLasFotosQueFaltan(nota, existe) {
  if (nota?.propia !== 'redaccion') return nota;
  const nombre = (a) => String(a ?? '').split('/').pop();
  let salida = nota;
  if (nota.foto?.archivo && !existe(nombre(nota.foto.archivo))) { const { foto, ...resto } = salida; salida = resto; }
  if (nota.fotosEnCuerpo?.length) {
    const quedan = nota.fotosEnCuerpo.filter((f) => existe(nombre(f.archivo)));
    if (quedan.length !== nota.fotosEnCuerpo.length) {
      const { fotosEnCuerpo, ...resto } = salida;
      salida = quedan.length ? { ...resto, fotosEnCuerpo: quedan } : resto;
    }
  }
  return salida;
}

/** Cuántas palabras tiene el cuerpo sin las marcas de las fotos (lo que cuenta el mínimo de 30). */
export const palabrasDelCuerpoEscrito = (texto, cantidadDeFotos = 0) => palabrasDe(cuerpoPlano(texto, cantidadDeFotos));
