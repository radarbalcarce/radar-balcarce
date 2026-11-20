// Las piezas para invitar a participar (IDEAS 18; cronograma del 30/09): una historia con voz
// (desde el 20/11/2026 a las 17:00, de lunes a viernes, una por día), cada una con su pregunta. Acá está lo que dice cada una;
// la placa es placaParticipa (reels/placa.mjs) y el día, la hora y el nombre, la tabla de redes/piezas-del-dia.mjs.
// Sin dependencias de afuera de Node.

import { semillaDe, variante } from './guiones.mjs';
import { piezaDelDia } from './piezas-del-dia.mjs';

export const WHATSAPP = '2266 51-1612';
/** El mail de la redacción (6/10): reenvía a la cuenta del medio con Cloudflare Email Routing. Los otros: contacto@ (lectores y comercios) y publicidad@. */
export const MAIL_REDACCION = 'redaccion@radarbalcarce.com';

/** El día de la semana (0 = domingo) y el nombre de una pieza de participá, de la tabla de las piezas del día. */
const deLaTabla = (id) => ({ dia: piezaDelDia(id)?.dias[0] ?? null, nombre: piezaDelDia(id)?.nombre ?? (id === 'participa-marca' ? 'Sumá tu marca' : id) }); // 'participa-marca' (20/11/2026) sólo está en la tabla de v3/redes/piezas-del-dia.mjs: el sistema viejo no se toca

/** Cada pieza: su id en el cronograma, el día y el nombre (de la tabla), el color de su sección y lo que dice. */
export const PIEZAS_PARTICIPA = {
  'participa-noticias': {
    ...deLaTabla('participa-noticias'), rotulo: 'Participá', seccion: 'Balcarce',
    pregunta: '¿Viste algo que tendría que ser noticia?', pie1: 'Mandanos la foto o el dato.', pie2: 'Antes de publicar, lo chequeamos.',
    sub: 'Mandanos la foto o el dato',
    voz: ['¿Viste algo que tendría que ser noticia? Mandanos la foto o el dato. Antes de publicar, lo chequeamos.'],
  },
  'participa-evento': {
    ...deLaTabla('participa-evento'), rotulo: 'Tu evento', seccion: 'Cultura y agenda',
    pregunta: '¿Organizás un evento, una feria o tenés un comercio?', pie1: 'Contanos qué, cuándo y dónde.', pie2: 'Lo sumamos a la agenda de Balcarce.',
    sub: 'Sumalo a la agenda de Balcarce',
    voz: ['¿Organizás un evento, una feria o tenés un comercio? Contanos qué, cuándo y dónde, y lo sumamos a la agenda de Balcarce.'],
  },
  'participa-reclamos': {
    ...deLaTabla('participa-reclamos'), rotulo: 'Tu reclamo', seccion: 'Balcarce',
    pregunta: '¿Hay algo en tu cuadra que hace rato espera arreglo?', pie1: 'Contanos qué y dónde.', pie2: 'Lo chequeamos antes de publicar.',
    sub: 'Contanos qué y dónde',
    voz: ['¿Hay algo en tu cuadra que hace rato espera arreglo? Contanos qué y dónde.'],
  },
  'participa-nota': {
    ...deLaTabla('participa-nota'), rotulo: 'Tu nota', seccion: 'Cultura y agenda',
    pregunta: '¿Tenés algo para contar de tu club, tu escuela o tu barrio?', pie1: 'Mandanos tu nota o tu historia.', pie2: 'La leemos y, si corresponde, la publicamos.',
    sub: 'Mandanos tu nota o tu historia',
    voz: ['¿Tenés algo para contar de tu club, tu escuela o tu barrio? Mandanos tu nota o tu historia.'],
  },
  // 4.ª convocatoria (20/11/2026): dos diseños armados (A sobria y B dinámica, `kit3/plantillas/participa.js`); está en pausa hasta que Hernán elija uno y la apruebe.
  'participa-marca': {
    ...deLaTabla('participa-marca'), rotulo: 'Sumá tu marca', seccion: 'Balcarce',
    pregunta: '¿Querés que tu comercio acompañe las noticias de Balcarce?', pie1: 'Escribinos y te contamos cómo anunciar.', pie2: 'Tu comercio, en el medio de Balcarce.',
    sub: 'Escribinos y te contamos cómo anunciar en Radar',
    voz: ['¿Querés que tu comercio acompañe las noticias de Balcarce? Escribinos y te contamos cómo anunciar en Radar.'],
  },
};

export const IDS_PARTICIPA = Object.keys(PIEZAS_PARTICIPA);

const SALUDOS = {
  manana: ['Buen día, Balcarce.', 'Buen día.'],
  tarde: ['Buenas tardes, Balcarce.', 'Buenas tardes.'],
  noche: ['Buenas noches, Balcarce.', 'Buenas noches.'],
};

/** Lo que dice la locutora: saludo, la pregunta y cómo escribir (el número va en la placa, no se lee). */
export function guionParticipa(id, { fecha = new Date(), momento = 'manana' } = {}) {
  const p = PIEZAS_PARTICIPA[id];
  if (!p) return '';
  const s = semillaDe(id, fecha);
  return [variante(SALUDOS[momento] ?? SALUDOS.manana, s, 'saludo'), ...p.voz, 'Escribinos por WhatsApp o por mail: los datos están en pantalla.', 'Radar Balcarce.'].join(' ');
}
