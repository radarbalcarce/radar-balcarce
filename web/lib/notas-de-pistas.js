// Las notas propias que nacen de una pista (3/10/2026, Hernán: "si investiga y si puede armar algo, publicarlas como propias"). La IA escribe un
// borrador con el texto de las notas de los medios (panel/nota-de-pista.mjs), una persona lo revisa en el celular y, al aprobarlo, queda en
// web/data/notas-de-pistas.json. Acá se lee ese archivo y se arman las notas, con la forma de las otras notas propias (la del dólar, la de F1).
// Sin dependencias: lo usan el generador de datos y las pruebas.
//
// Cada entrada: { titulo, copete, cuerpo, seccion, fuentes: [{ medio, enlace, fecha }], pista, motivo, cuando, por, retirada? }. Sin `motivo`, `cuando`
// y `por` no se acepta (como correcciones.json: lo hizo una persona y tiene que decir quién y cuándo).

import { tieneCuerpo } from './cuerpo.js';

/** La relevancia con que entra una nota de una pista: alta, como pidió Hernán ("las notas que sean pistas tienen que estar bien valoradas"). */
export const RELEVANCIA_DE_PISTA = 95;
/** Cuánto tiempo sigue existiendo la nota (como las demás: 180 días). */
export const DIAS_DE_UNA_NOTA_DE_PISTA = 180;

const SECCIONES = ['Balcarce', 'Política', 'Policiales', 'Educación', 'Salud', 'Ciencia', 'Fútbol', 'Deportes', 'Automovilismo', 'Agro', 'Economía', 'Cultura y agenda', 'Tecnología', 'Argentina'];
export const SECCIONES_DE_PISTAS = SECCIONES;

/** El id de la nota: "np" y lo que sea de la pista, sólo letras y números (la dirección de una nota usa lo que va después del último guion). */
export const idDeNotaDePista = (idPista) => `np${String(idPista ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase().replace(/^pista/, '').slice(0, 16)}`;

const lista = (t) => {
  const medios = t.map((m) => m).filter(Boolean);
  if (medios.length <= 1) return medios[0] ?? '';
  return `${medios.slice(0, -1).join(', ')} y ${medios.at(-1)}`;
};

/** La firma: dice que la escribió la IA con lo que publicaron los medios y que la revisó una persona (CRITERIO-EDITORIAL § 10). */
export const firmaDePista = (medios = [], { automatica = false } = {}) => automatica
  ? `Nota de Radar Balcarce, escrita con IA a partir de lo que publicaron ${lista(medios)} y controlada contra esas fuentes`
  : `Nota de Radar Balcarce, escrita con IA a partir de lo que publicaron ${lista(medios)} y revisada por la redacción`;

const esHttps = (u) => /^https?:\/\//.test(String(u ?? ''));

/** ¿La entrada está completa? Devuelve el motivo si no, o null. */
export function motivoDeRechazo(e) {
  if (!e || typeof e !== 'object') return 'no es un objeto';
  if (!e.motivo || !e.cuando || !e.por) return 'falta motivo, cuándo o quién';
  if (!Number.isFinite(Date.parse(e.cuando))) return 'la fecha no es válida';
  if (!String(e.titulo ?? '').trim() || !String(e.copete ?? '').trim()) return 'falta el título o la bajada';
  if (!SECCIONES.includes(e.seccion)) return 'la sección no existe';
  if (!(Array.isArray(e.fuentes) && e.fuentes.some((f) => esHttps(f?.enlace)))) return 'falta al menos una fuente con enlace';
  if (!tieneCuerpo({ cuerpo: e.cuerpo, copete: e.copete })) return 'el cuerpo es muy corto';
  return null;
}

/** Las notas armadas con lo guardado, las que no están retiradas ni vencidas. Una entrada rota se saltea (no rompe a las demás). */
export function notasDePistas(json, { ahora = new Date() } = {}) {
  const entradas = json && typeof json === 'object' ? Object.entries(json.notas ?? {}) : [];
  const salida = [];
  for (const [id, e] of entradas) {
    if (motivoDeRechazo(e) || e.retirada) continue;
    const fecha = new Date(e.cuando).toISOString();
    if (ahora - Date.parse(fecha) > DIAS_DE_UNA_NOTA_DE_PISTA * 864e5) continue;
    const fuentes = e.fuentes.filter((f) => esHttps(f?.enlace)).map((f) => ({ medio: String(f.medio ?? '').slice(0, 80) || 'Una fuente', enlace: f.enlace, fecha: f.fecha ?? null }));
    salida.push({
      id: idDeNotaDePista(id),
      propia: 'pista',
      pista: id,
      titulo: String(e.titulo).trim(),
      copete: String(e.copete).trim(),
      cuerpo: String(e.cuerpo).trim(),
      guion: null,
      seccion: e.seccion,
      local: e.seccion === 'Balcarce',
      relevancia: RELEVANCIA_DE_PISTA,
      medios: fuentes.map((f) => f.medio),
      enlace: fuentes[0].enlace,
      fuentesConsultadas: fuentes,
      fecha,
      sinFecha: false,
      visto: fecha,
      publicadaPor: String(e.por).slice(0, 30),
      publicadaCuando: fecha,
      temas: [],
      etiquetas: Array.isArray(e.etiquetas) ? e.etiquetas.slice(0, 6) : [],
      como: 'publicada',
      // Una persona puede pedir que la nota entre a los repasos (podcasts) de las redes: `aprobadaParaRedes` (la decisión ya es de ella) y, para
      // que entre al PRÓXIMO repaso aunque no le alcance el puntaje, `paraElRepaso` (vale 12 horas desde que se aprobó; 16/10/2026, la nota de Azul).
      ...(e.aprobadaParaRedes === true ? { aprobadaParaRedes: true } : {}),
      ...(e.paraElRepaso === true && ahora - Date.parse(fecha) < 12 * 3600e3 ? { paraElRepaso: true } : {}),
      firma: firmaDePista(fuentes.map((f) => f.medio), { automatica: e.automatica === true }),
    });
  }
  return salida;
}
