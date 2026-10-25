// Qué se publica hoy y a qué hora, con techo.
//   node reels/plan.mjs              muestra el plan del día
//   node reels/plan.mjs --generar    además arma los videos
//
// Qué sale cada día (el contrato, redes/contrato.mjs y docs/07-REDES.md): tres reels,
// que son los tres podcasts (mañana, tarde y noche, cada uno subido también
// como historia), y las historias fijas de servicio (el clima de la mañana y el
// de la noche, la farmacia), más los extras semanales (teléfonos útiles,
// agenda) y el aviso de clima cuando hay uno grave. Desde el 24/09 no hay
// reels ni historias de UNA nota: una noticia sola dicha en voz alta sonaba
// rara, y las notas salen dentro de los podcasts.

import fs from 'node:fs';
import path from 'node:path';
import { placaClima, placaFarmacia, placaRepaso, placaUtiles, placaAgenda, placaParticipa, placaEfemeride, COLOR_FERIADO, COLOR_UTILES, COLOR_SECCION, COLORES } from './placa.mjs';
import { PIEZAS_PARTICIPA, IDS_PARTICIPA, guionParticipa, MAIL_REDACCION } from '../redes/participa.mjs';
import { feriadoDelDia, fechaDeFeriado, datosParaContar, guionFeriado } from '../redes/feriado.mjs';
import { pantallasDeUtiles, HORA_DE_CAMBIO, MINUTO_DE_CAMBIO } from '../ingesta/utiles.mjs';
import { horariosDe, toca } from '../redes/horarios.mjs';
import { enlaceDeNota } from '../redes/elegir.mjs';
import { fijaVigente } from './fijas.mjs';
import { efemerideDelDia } from '../redes/efemeride.mjs';
import { placasDelDia, COLOR_UN_DIA_COMO_HOY } from './placas-efemeride.mjs';
import { diaAR, minutoDelDiaAR, minutosDeHora } from '../ingesta/zona.mjs';
import {
  textoDelCupo, hayQueAvisar, reservaPara, porPrioridad,
} from './cupo-voz.mjs';
import { guardarArmada, usarArmada, limpiarArmadas } from './armadas.mjs';
import {
  escenaDelClima, escenaDelAviso, escenaDeLaFarmacia, escenaDeLosUtiles, escenaDeLaAgenda, escenaDeLaEfemeride, escenaDelFeriado, escenaDeParticipaDelPlan,
} from './escenas/del-plan.mjs';
import { repasosDelDia } from '../redes/repasos.mjs';
import { CONTRATO_DIARIO } from '../ingesta/criterio.mjs';
import { datosDeLaWeb } from '../redes/datos.mjs';
import {
  guionClima, guionClimaNoche, guionFarmacia, guionUtiles, guionAgenda, comoNombre, conMemoriaDelDia, cierreDePodcast,
} from '../redes/guiones.mjs';
import { conLineaEditorialDelDia } from '../redes/linea-del-dia.mjs';
import { secuenciaDelRepaso, fotoParaElRepaso } from './escenas/repaso.mjs';
import { entradaDelManifiesto } from './pedido.mjs';
import { traerFotosDeLaPortada } from '../infra/compartido/fotos-r2.mjs';
import { INDICACIONES, momentoDeHora } from '../redes/prompt-redes.mjs';
import { revisarTexto } from '../redes/guiones.mjs';
import { nombreDeEvento } from '../web/lib/eventos.js';
import {
  PODCASTS, NOMBRES_DE_PODCAST, HORA_AVISO, avisoDeClima, piezasPublicadasHoy, historiasQueSobran, SALE_COMO_REEL, cronogramaDelDia, ventanaDe,
} from '../redes/piezas.mjs';

// El cupo de reels es el recurso escaso del día, así que NO se gasta en lo que
// se repite todas las mañanas. Clima, farmacia y agenda van a historias, que
// no compiten entre sí y son justo donde la gente busca ese dato. Los reels
// son los tres podcasts: si un día no hay notas para un repaso, ese reel no
// sale y está bien.
export const REGLAS = {
  reelsPorDia: CONTRATO_DIARIO.reelsPorDia, // techo duro: los tres podcasts
  // Las historias del contrato son 6 (los tres podcasts, el clima de la mañana y
  // el de la noche, la farmacia) y el techo del día es 8: las 6 más como máximo
  // dos extras (teléfonos útiles y agenda). Se aplica de verdad en planDelDia.
  historiasPorDia: CONTRATO_DIARIO.historiasPorDia,
  historiasMaximasPorDia: CONTRATO_DIARIO.historiasMaximasPorDia,
};

// El color de los teléfonos útiles es COLOR_UTILES (reels/placa.mjs): el de Balcarce, de la tabla de CRITERIO-REDES.md § 8. Hasta el 24/10 había un marrón
// (#8C2D18) que no estaba en la tabla; una prueba (pruebas/utiles-redes.test.mjs) vigila que no vuelva.

const SALIDA = path.join(import.meta.dirname, 'salida');

export const fechaLarga = (d = new Date()) => {
  const t = d.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires',
  });
  // Sin la coma que pone Node ("lunes, 28 de…"): todas las placas escriben la
  // fecha igual que la de la farmacia, "Lunes 28 de septiembre" (28/09).
  const sinComa = t.replace(',', '');
  return sinComa.charAt(0).toUpperCase() + sinComa.slice(1);
};

// --- lo que muestran las placas (28/09, diseño "Historia diaria") ----------

const DIA_CORTO = {
  lun: 'LUN', mar: 'MAR', mié: 'MIÉ', mie: 'MIÉ', jue: 'JUE', vie: 'VIE', sáb: 'SÁB', sab: 'SÁB', dom: 'DOM',
};

/** El recuadro de un día del pronóstico: "MAR · 82% lluvia", máxima y mínima. */
export function cajaDeDia(d, titulo = null) {
  if (!d) return null;
  const nombre = titulo ?? DIA_CORTO[String(d.dia ?? '').toLowerCase()] ?? String(d.dia ?? '').toUpperCase();
  const lluvia = Number(d.lluvia) >= 10 ? ` · ${d.lluvia}% lluvia` : '';
  return { titulo: `${nombre}${lluvia}`, valor: `${d.max}°`, secundario: `${d.min}°` };
}

/** Lo que viene, en una oración: "Chaparrones. Entre 9° y 14°, con 82% de
 *  probabilidad de lluvia y viento de hasta 27 km/h." */
export function pronosticoDe(d) {
  const partes = [`Entre ${d.min}° y ${d.max}°`];
  const extra = [
    Number(d.lluvia) >= 10 ? `${d.lluvia}% de probabilidad de lluvia` : null,
    d.viento ? `viento de hasta ${d.viento} km/h` : null,
  ].filter(Boolean);
  const cielo = d.cielo ? `${d.cielo}. ` : '';
  return `${cielo}${partes[0]}${extra.length ? `, con ${extra.join(' y ')}` : ''}.`;
}

/** Hasta cuándo dura el turno que sale a esa hora: el cambio es a las 8:30. */
export function hastaCuandoElTurno(hora = '19:00') {
  const [h, m] = String(hora).split(':').map(Number);
  const cambio = `${HORA_DE_CAMBIO}:${String(MINUTO_DE_CAMBIO).padStart(2, '0')}`;
  return (h * 60 + (m || 0)) >= HORA_DE_CAMBIO * 60 + MINUTO_DE_CAMBIO
    ? `De turno hasta mañana a las ${cambio}.`
    : `De turno hasta hoy a las ${cambio}.`;
}

const F_AGENDA_WEB = path.join(import.meta.dirname, '..', 'web', 'data', 'agenda.json');

/** Los horarios de las piezas fijas: los de fábrica (redes/horarios.mjs), o los que se pasen en `estado` (las pruebas apagan piezas así).
 *  Desde el 17/10 ya no se lee el estado.json del panel de la PC, que está en desuso. */
function horariosConfigurados(estado) {
  const porId = {};
  for (const h of horariosDe(estado)) porId[h.id] = h;
  return porId;
}

/** Los eventos de los próximos días, listos para la placa: los de la agenda
 *  publicada en la web (web/data/agenda.json, los mismos que tienen página en
 *  /agenda). Sin agenda, devuelve vacío: la pieza simplemente no se arma. */
export function eventosProximos(dias = 4, { web = F_AGENDA_WEB, hoy: desde = new Date() } = {}) {
  let eventos = null;
  try { eventos = JSON.parse(fs.readFileSync(web, 'utf8')).eventos; } catch { return []; }
  if (!Array.isArray(eventos)) return [];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const hoy = new Date(desde); hoy.setHours(0, 0, 0, 0);
  const tope = new Date(hoy.getTime() + dias * 86400000);

  return (eventos ?? []).filter((e) => !e.retirado).map((e) => {
    const m = String(e.desde ?? '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (!m) return null;
    const f = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (f < hoy || f > tope) return null;
    const dia = DIAS[f.getDay()];
    return {
      // Como en su página: "22° FIESTA NACIONAL DEL POSTRE" pasa a "22° Fiesta Nacional del Postre".
      nombre: nombreDeEvento(e.nombre),
      lugar: nombreDeEvento(e.lugar ?? ''),
      cuando: m[4] ? `${dia} ${m[4]}:${m[5]}` : dia,
      orden: f.getTime(),
    };
  }).filter(Boolean).sort((a, b) => a.orden - b.orden);
}

const PORTADA_WEB = path.join(import.meta.dirname, '..', 'web', 'data', 'portada.json');
const LIBRO_REDES = path.join(import.meta.dirname, '..', 'web', 'data', 'redes.json');

/** Lo ya publicado en las redes, para no repetir notas. Vacío si no hay. */
function leerLibro() {
  try { return JSON.parse(fs.readFileSync(LIBRO_REDES, 'utf8')); } catch { return null; }
}

/** Lo ya publicado en la web (web/data/portada.json): una pieza nunca habla de algo que la web no muestra. Desde el 17/10 no hay
 *  "modo PC" (los datos del panel de la PC, en desuso). */
function leerDatos() {
  if (fs.existsSync(PORTADA_WEB)) return datosDeLaWeb(JSON.parse(fs.readFileSync(PORTADA_WEB, 'utf8')));
  throw new Error('Todavía no hay datos: falta web/data/portada.json (lo arma "Actualizar la web"; en la PC, git pull)');
}

// --- los guiones -----------------------------------------------------------
// Los arma redes/guiones.mjs con lo ya publicado (titulares, copetes propios,
// el clima, la farmacia) y el libro de recursos de CRITERIO-REDES.md (saludos,
// conectores, cierres): el guion no lo escribe un modelo. Gemini sólo pone la
// voz, con la indicación de su hora. Dos reglas que valen para todos:
// 1. La voz NO lee la placa. La placa muestra el dato; la voz cuenta qué
//    significa. Si dicen lo mismo, la pieza dura el doble y no aporta nada.
// 2. La fuente no se nombra nunca en redes. La atribución y el link van en la
//    nota de la página, que es donde corresponde.

// --- el plan ---------------------------------------------------------------

/**
 * La secuencia animada de un repaso (regla 209): una placa por nota, con su foto de la web, y la lista al final. null si las escenas
 * están apagadas (REELS_ESCENAS=no) o algo falla: el repaso sale con la lista, como antes.
 */
export function secuenciaDelPlan({ ronda, repaso, fecha, banco = {} }) {
  if (process.env.REELS_ESCENAS === 'no') return null;
  try {
    const cierre = cierreDePodcast(ronda.momento, { fecha });
    return secuenciaDelRepaso({
      titulo: ronda.titulo, momento: ronda.momento, fecha: fechaLarga(fecha), segundos: repaso.segundos,
      notas: [
        ...repaso.notas.map((n) => ({ titulo: n.titulo, seccion: n.seccion, foto: fotoParaElRepaso(n, { banco }) })),
        // El bloque del tiempo (regla 325): sin foto, con su tarjeta; la voz llega a él con su frase.
        ...(repaso.resumen ? [{
          titulo: repaso.resumen.titulo, seccion: repaso.resumen.seccion, foto: null, dato: repaso.resumen.dato, marca: repaso.resumen.frase,
        }] : []),
      ],
      // El cierre del guion, para que la lista entre cuando la voz se despide. Si el guion no termina así, la última nota queda hasta el final.
      cierre: String(repaso.guion ?? '').trim().endsWith(cierre.trim()) ? cierre : '',
    });
  } catch (e) {
    console.warn(`    secuencia de ${ronda.nombre}: no se pudo armar (${String(e.message).split('\n')[0]}); sale con la lista`);
    return null;
  }
}

/**
 * Las piezas de HOY que todavía no salieron y siguen a tiempo (su ventana no cerró), sin las fijas vigentes (no gastan voz). Es lo que
 * el contador de voz mira para guardar audios para las más importantes (reservaPara, reels/cupo-voz.mjs).
 */
export function pendientesDelDia({ libro = null, fecha = new Date(), fija = (nombre) => fijaVigente(nombre, diaAR(fecha)) } = {}) {
  const hechas = piezasPublicadasHoy(libro, fecha);
  const ahora = minutoDelDiaAR(fecha);
  return cronogramaDelDia(fecha)
    .filter((p) => !hechas.has(p.nombre) && ahora < minutosDeHora(p.hora) + ventanaDe(p.nombre) && !fija(p.nombre))
    .map((p) => p.nombre);
}

/** El banco de fotos (para no llevar a las redes las fotos con chicos de la excepción de la regla 186). */
function leerBanco() {
  try { return JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'web', 'data', 'banco-fotos.json'), 'utf8')); } catch { return {}; }
}

/** Más viejo que esto, portada.json ya no sirve para el clima ni la farmacia. */
export const EDAD_MAXIMA_DE_LA_PORTADA_HORAS = 2;
const PIEZAS_QUE_ENVEJECEN = ['clima-manana', 'clima-noche', 'farmacia'];

export function planDelDia(datos, {
  libro = null, fecha = new Date(), estado = {}, eventos = null,
  // Piezas que se piden aunque hoy no les toque (para armarlas de antemano: `--incluir=` y reels/fijas.mjs).
  forzar = [],
  banco = leerBanco(),
} = {}) {
  const hoy = fecha.getDate();
  const turno = datos.farmacias?.turnos?.find((t) => t.dia === hoy) ?? null;

  // Sólo compiten por un podcast las notas ya publicadas en la web (portada.json, `yaPublicadas`: pasaron el semáforo y lo que decidió
  // una persona). Si alguna vez llegaran datos que no pasaron por la web, sólo la verde, que sale sola: la amarilla espera y la roja
  // nunca (28/09). Lo que decidía una persona en el panel de la PC ya no se lee (17/10): esas decisiones llegan por la web.
  const publicables = datos.notas
    .filter((n) => datos.yaPublicadas || n.semaforo === 'verde')
    .sort((a, b) => b.relevancia - a.relevancia);

  const piezas = [];

  // Los horarios y los días son los de fábrica (redes/horarios.mjs). Si una
  // pieza está apagada o hoy no le toca, directamente no se arma.
  const cuando = horariosConfigurados(estado);
  // `toca` (redes/horarios.mjs) es la MISMA función que usa el reloj de Redes:
  // los teléfonos útiles salen los sábados.
  const tocaHoy = (id) => forzar.includes(id) || toca(cuando[id], fecha, { estado });

  // --- El aviso de clima: la única pieza que no espera su horario ---------
  //
  // Helada fuerte, granizo o viento de más de 60 km/h. Sale cuando hay algo
  // que avisar y no cuando le toca, porque un aviso que espera a las 20:00
  // no es un aviso. Los umbrales están altos a propósito (ingesta/alertas.mjs):
  // si esto saltara todas las semanas dejaría de mirarlo nadie, y el día que
  // importa pasaría de largo. Cuál es y a qué "hora" (HORA_AVISO: desde las
  // 7:00, con ventana hasta las 22:00, así la primera vuelta del reloj que lo
  // ve lo pide) lo dice avisoDeClima, en redes/piezas.mjs: el reloj usa la
  // misma función y pide el mismo nombre que acá se arma.
  const a = avisoDeClima(datos.clima, fecha);
  if (a) {
    piezas.push({
      tipo: 'historia',
      hora: HORA_AVISO,
      nombre: a.nombre,
      titulo: a.titulo,
      motivo: 'aviso de clima · sale apenas se detecta, sin esperar horario',
      seccion: 'Clima',
      guion: `${a.titulo}. ${a.texto} Radar Balcarce.`,
      // "Historia diaria" con el recuadro del aviso: el título del aviso
      // manda (es lo que hay que ver de reojo) y abajo lo que hay que saber.
      svg: placaClima({
        temp: datos.clima.ahora.temp,
        cielo: datos.clima.ahora.cielo,
        esDeDia: datos.clima.ahora.esDeDia !== false,
        sensacion: datos.clima.ahora.sensacion ?? null,
        viento: datos.clima.ahora.viento ?? null,
        rumbo: datos.clima.ahora.rumbo ?? '',
        max: datos.clima.dias[0].max,
        min: datos.clima.dias[0].min,
        fecha: a.titulo,
        kicker: `Aviso de clima · ${a.dia === datos.clima.dias[0].fecha ? 'hoy' : 'mañana'}`,
        etiqueta: 'El clima ahora',
        aviso: { titulo: a.titulo, texto: a.texto },
        cajas: datos.clima.dias.slice(0, 3).map((d, i) => cajaDeDia(d, i === 0 ? 'HOY' : null)).filter(Boolean),
      }),
      acento: COLOR_SECCION.Policiales ?? COLOR_SECCION.Clima,
      // La escena animada (9/10): si no se puede armar, sale con la placa de `svg`.
      escena: escenaDelAviso({ aviso: a, clima: datos.clima, fecha }),
    });
  }

  // --- Historias: lo de todos los días, que es servicio y no noticia -------
  // El clima de la mañana y el de la noche se deciden cada uno por su lado: el
  // de la noche estaba anidado dentro del de la mañana y, si se apagaba el de
  // la mañana en el panel, desaparecía también el de la noche (28/09).
  const c = datos.clima?.ahora;
  const climaHoy = datos.clima?.dias?.[0];
  const climaManana = datos.clima?.dias?.[1];

  if (datos.clima && tocaHoy('clima-manana')) {
    const hoy = climaHoy;
    piezas.push({
      tipo: 'historia', reelEnFacebook: true, hora: cuando['clima-manana'].hora, nombre: 'clima-manana', titulo: 'El clima de hoy',
      motivo: 'servicio fijo · no gasta cupo de reel', seccion: 'Clima',
      guion: guionClima(datos.clima, turno),
      momento: 'manana', indicacion: INDICACIONES.manana,
      escena: escenaDelClima({ momento: 'manana', clima: datos.clima, fecha }),
      // "Historia diaria" (28/09): la tarjeta del clima ahora, hoy y los dos
      // días que siguen. Sin dólar: si se mueve, sale como nota propia.
      svg: placaClima({
        temp: c.temp,
        cielo: c.cielo,
        esDeDia: c.esDeDia !== false,
        sensacion: c.sensacion ?? null,
        viento: c.viento ?? null,
        rumbo: c.rumbo ?? '',
        max: hoy.max,
        min: hoy.min,
        fecha: fechaLarga(fecha),
        kicker: 'Hoy en Balcarce',
        etiqueta: 'El clima ahora',
        cajas: datos.clima.dias.slice(0, 3).map((d, i) => cajaDeDia(d, i === 0 ? 'HOY' : null)).filter(Boolean),
      }),
      acento: COLOR_SECCION.Clima,
    });
  }

  // Segundo pase: de noche, cuando la gente ya está en casa y lo que
  // importa es cómo amanece mañana. "Cómo sigue el clima esta noche" y no "cómo
  // sigue el día": a las 20 el día ya pasó (29/09, Hernán). La mínima de esta
  // noche es la de mañana: el pronóstico da una por día y la de mañana es la
  // de la madrugada; la de hoy casi siempre ya pasó.
  if (datos.clima && tocaHoy('clima-noche')) {
    const hoy = climaHoy;
    const manana = climaManana;
    piezas.push({
      tipo: 'historia', reelEnFacebook: true, hora: cuando['clima-noche'].hora, nombre: 'clima-noche', titulo: 'Cómo sigue el clima esta noche',
      motivo: 'segundo pase del clima · mira para adelante', seccion: 'Clima',
      guion: guionClimaNoche(datos.clima),
      momento: 'noche', indicacion: INDICACIONES.noche,
      escena: escenaDelClima({ momento: 'noche', clima: datos.clima, fecha }),
      // Mira para adelante: esta noche, mañana y pasado.
      svg: placaClima({
        temp: c.temp,
        cielo: c.cielo,
        esDeDia: c.esDeDia !== false,
        sensacion: c.sensacion ?? null,
        viento: c.viento ?? null,
        rumbo: c.rumbo ?? '',
        max: hoy.max,
        min: hoy.min,
        fecha: 'Cómo sigue el clima esta noche',
        kicker: 'Esta noche en Balcarce',
        etiqueta: 'Ahora',
        pronostico: manana ? { titulo: 'Mañana', texto: pronosticoDe(manana) } : null,
        cajas: [
          { titulo: 'ESTA NOCHE', valor: `${(manana ?? hoy).min}°`, secundario: 'mín.' },
          ...(manana ? [cajaDeDia(manana, 'MAÑANA')] : []),
          ...(datos.clima.dias[2] ? [cajaDeDia(datos.clima.dias[2])] : []),
        ],
      }),
      acento: COLOR_SECCION.Clima,
    });
  }

  // La farmacia va tarde a propósito: sirve cuando las demás ya cerraron.
  if (turno && tocaHoy('farmacia')) {
    piezas.push({
      tipo: 'historia', reelEnFacebook: true, hora: cuando.farmacia.hora, nombre: 'farmacia', titulo: `Farmacia de turno: ${comoNombre(turno.farmacias.join(' y '))}`,
      motivo: 'a la hora en que cierran las demás', seccion: 'Farmacias',
      guion: guionFarmacia(turno, { momento: momentoDeHora(cuando.farmacia.hora) }),
      momento: momentoDeHora(cuando.farmacia.hora), indicacion: INDICACIONES[momentoDeHora(cuando.farmacia.hora)],
      escena: escenaDeLaFarmacia({ turno, fecha, hasta: hastaCuandoElTurno(cuando.farmacia.hora) }),
      svg: placaFarmacia({
        detalle: turno.detalle,
        farmacias: turno.farmacias,
        dia: turno.dia,
        diaSemana: turno.diaSemana,
        mes: turno.mes ?? null,
        hasta: hastaCuandoElTurno(cuando.farmacia.hora),
      }),
      acento: COLOR_SECCION.Farmacias,
    });
  }

  // Números útiles: una vez por semana, los sábados (ingesta/utiles.mjs
  // decide cuál). No es noticia ni clima: es contenido de utilidad pura, así
  // que no compite por cupo de reel ni tiene por qué salir todos los días.
  if (tocaHoy('utiles')) {
    // Dos pantallas con los contactos más buscados, un número por contacto y la voz diciendo lo que se ve (24/10, regla 324).
    const pantallas = pantallasDeUtiles();
    piezas.push({
      tipo: 'reel', hora: cuando.utiles.hora, nombre: 'utiles',
      titulo: 'Teléfonos útiles de Balcarce', motivo: 'una vez por semana, los sábados',
      // No hay sección Servicios desde el 27/09: lo práctico de acá va a
      // Balcarce (CLAUDE.md, "Las secciones son once").
      seccion: 'Balcarce',
      guion: guionUtiles({ momento: momentoDeHora(cuando.utiles.hora) }),
      momento: momentoDeHora(cuando.utiles.hora), indicacion: INDICACIONES[momentoDeHora(cuando.utiles.hora)],
      svg: placaUtiles({ pantallas }),
      escena: escenaDeLosUtiles({ pantallas }),
      acento: COLOR_UTILES,
    });
  }

  // La agenda del fin de semana: los jueves a la tarde, que es cuando la
  // gente empieza a pensar qué hacer. Es la pieza que ninguno de los otros
  // medios de Balcarce tiene, así que es de lo que más nos diferencia.
  const deLaAgenda = eventos ?? eventosProximos(4);
  if (tocaHoy('agenda') && deLaAgenda.length) {
    piezas.push({
      tipo: 'reel', hora: cuando.agenda.hora, nombre: 'agenda',
      titulo: 'Qué hacer este fin de semana', motivo: 'los jueves, si hay eventos cargados',
      seccion: 'Cultura y agenda',
      guion: guionAgenda(deLaAgenda, { momento: momentoDeHora(cuando.agenda.hora) }),
      momento: momentoDeHora(cuando.agenda.hora), indicacion: INDICACIONES[momentoDeHora(cuando.agenda.hora)],
      svg: placaAgenda({ eventos: deLaAgenda }),
      escena: escenaDeLaAgenda({ eventos: deLaAgenda }),
      acento: '#6D4BA0',
    });
  }

  // El feriado (30/09): el hueco de las 9:00 de los días de feriado. Los datos vienen con su fuente.
  if (tocaHoy('feriado')) {
    const f = feriadoDelDia(fecha);
    const momento = momentoDeHora(cuando.feriado.hora);
    piezas.push({
      tipo: 'reel', hora: cuando.feriado.hora, nombre: 'feriado',
      titulo: f.nombre, motivo: 'hoy es feriado',
      seccion: 'Argentina',
      guion: guionFeriado(f, { fecha, momento }),
      momento, indicacion: INDICACIONES[momento],
      escena: escenaDelFeriado({ feriado: f, dato: datosParaContar(f)[0] }),
      svg: placaEfemeride({ rotulo: `Feriado · ${fechaDeFeriado(f.fecha)}`, titulo: f.nombre, cuerpo: datosParaContar(f).join(' '), color: COLOR_FERIADO }),
      acento: COLOR_FERIADO,
    });
  }

  // "Un día como hoy" (1/10): a las 9:00, todos los días que tienen su efeméride preparada (redes/efemeride.mjs).
  // Es un REEL con dos placas (la principal y "Además…") y la voz de la locutora, y como todo reel se sube también como historia (5/10, Hernán: "las efemérides
  // tienen que ser reel e historia"). Es el mismo audio y el mismo video: no gasta voz de más. No cuenta en el techo de los tres reels de los podcasts ni se saca por el de historias.
  if (tocaHoy('efemeride')) {
    const e = efemerideDelDia(fecha);
    if (e) {
      const momento = momentoDeHora(cuando.efemeride.hora);
      const placas = placasDelDia(e.fecha, e);
      piezas.push({
        tipo: 'reel', hora: cuando.efemeride.hora, nombre: 'efemeride',
        titulo: `Un día como hoy: ${e.principal.titulo}`, motivo: 'un día como hoy, todos los días a las 9:00',
        seccion: 'Cultura y agenda',
        guion: e.guion,
        momento, indicacion: INDICACIONES[momento],
        svg: placas.principal, svg2: placas.ademas,
        escena: escenaDeLaEfemeride({ efemeride: e, fecha }),
        acento: COLOR_UN_DIA_COMO_HOY,
      });
    }
  }

  // Participá (30/09): al mediodía, una invitación a escribir por WhatsApp; cada día de la
  // semana toca una distinta (redes/participa.mjs).
  for (const id of IDS_PARTICIPA) {
    if (!tocaHoy(id)) continue;
    const p = PIEZAS_PARTICIPA[id];
    const momento = momentoDeHora(cuando[id].hora);
    piezas.push({
      tipo: 'reel', hora: cuando[id].hora, nombre: id,
      titulo: p.nombre, motivo: 'invitación a participar, al mediodía',
      seccion: p.seccion,
      guion: guionParticipa(id, { fecha, momento }),
      momento, indicacion: INDICACIONES[momento],
      escena: escenaDeParticipaDelPlan({ id }),
      svg: placaParticipa({ rotulo: p.rotulo, pregunta: p.pregunta, pie1: p.pie1, pie2: p.pie2, color: COLOR_SECCION[p.seccion], mail: MAIL_REDACCION }),
      acento: COLOR_SECCION[p.seccion],
    });
  }

  // --- Reels: los tres podcasts del día ------------------------------------
  //
  // Las reglas de qué se puede contar solo (nada de Política ni Policiales,
  // sólo lo de Balcarce) y cómo se eligen las notas están en redes/elegir.mjs,
  // donde se prueban.
  //
  // Con el libro de lo ya publicado, el plan sabe qué podcasts salieron y qué
  // notas se contaron. Cuando a las 15:00 se arma sólo el de la tarde, elige
  // las mejores notas que QUEDAN y no repite las de las 10:00: nada de lo que
  // ya se contó en un podcast de hoy o de los dos días anteriores
  // (notasContadasEnPodcasts). Sin esto, una nota local de puntaje alto se
  // repetía en el repaso de la mañana, la tarde y la noche, varios días
  // seguidos (27/09, Hernán: "veo de nuevo la nota de McCain").
  // Qué cuenta cada repaso que falta hoy: la misma función que usa la previa del
  // panel del celular (redes/repasos.mjs), así lo que muestra el celular es lo
  // que arma el plan.
  const repasos = repasosDelDia(publicables, { libro, fecha, clima: datos.clima });
  const hechas = piezasPublicadasHoy(libro, fecha);

  // Tres podcasts por día en vez de noticias sueltas (24/09: una noticia sola
  // dicha en voz alta sonaba rara). Los tres cuentan cuatro notas de temas
  // distintos, sin repetir entre sí (29/09); el de la noche, lo que dejó el día
  // y no se contó. Cada uno lleva su lista de notas con el enlace en el texto del posteo,
  // y sin nombrar la fuente. Cada podcast se sube también como historia.
  // La lista (nombre, título, momento, hora) es una sola: PODCASTS, en
  // redes/piezas.mjs. Cada uno habla como corresponde a su hora: el saludo, el
  // cierre y el tono salen de CRITERIO-REDES.md (redes/guiones.mjs).
  const SITIO = process.env.SITIO ?? 'https://radarbalcarce.com';
  // Los tres en una sola vuelta (antes eran dos bloques casi iguales). El de la noche es el repaso de lo que dejó el día (sin piso de
  // puntaje, redes/repasos.mjs); el del 25/09 (4 notas, 62,7 s) dejó sin historia a las dos redes: por eso todos tienen presupuesto.
  // El VIDEO sigue a la voz (17/10, regla 209, reels/escenas/repaso.mjs): mientras cuenta cada nota se ve su foto y su titular, arranca
  // con la primera (la más fuerte) y cierra con la lista completa, que es también la tapa. `svg` (la lista) queda de respaldo.
  for (const ronda of PODCASTS) {
    const repaso = repasos[ronda.nombre];
    if (!repaso) continue;
    const { guion, notas: elegidas } = repaso;
    const esNoche = ronda.momento === 'noche';
    piezas.push({
      tipo: 'reel', hora: ronda.hora, nombre: ronda.nombre, ...(esNoche ? {} : { notaId: elegidas[0].id }),
      notaIds: elegidas.map((n) => n.id),
      // Las secciones de lo que cuenta (la línea editorial del día retoma el tema, nunca el titular: redes/linea-del-dia.mjs).
      secciones: elegidas.map((n) => n.seccion),
      // La lista del posteo: las notas con su enlace y, si cierra con el tiempo (regla 325), su línea sin enlace (notaIds y secciones son sólo de las notas).
      items: [...elegidas.map((n) => ({ titulo: n.titulo, enlace: enlaceDeNota(n, SITIO) })), ...(repaso.resumen ? [{ titulo: repaso.resumen.titulo, enlace: null }] : [])],
      titulo: ronda.titulo, momento: ronda.momento, indicacion: INDICACIONES[ronda.momento],
      motivo: esNoche
        ? `el podcast diario: los titulares más fuertes, un solo audio · ~${repaso.segundos.toFixed(0)} s`
        : `podcast de ${elegidas.length} notas${repaso.resumen ? ' y el tiempo' : ''}, tres de acá de temas distintos y lo más contado del día o el tiempo (regla 325) · ~${repaso.segundos.toFixed(0)} s`,
      segundosEstimados: repaso.segundos,
      seccion: 'Balcarce', guion,
      // "Repaso · tapa" (28/09): la lista numerada de las notas que cuenta, cada una con el color de su sección.
      svg: placaRepaso({
        titulo: ronda.titulo, momento: ronda.momento, fecha: fechaLarga(fecha), segundos: repaso.segundos,
        notas: [...elegidas.map((n) => ({ seccion: n.seccion, titulo: n.titulo })), ...(repaso.resumen ? [{ seccion: repaso.resumen.seccion, titulo: repaso.resumen.titulo, resumen: true }] : [])], color: COLORES.rojo,
      }),
      secuencia: secuenciaDelPlan({ ronda, repaso, fecha, banco }),
      acento: COLORES.rojo,
    });
  }

  // El techo: si hay más reels de los permitidos, se van los de menos motivo.
  // Sólo los podcasts cuentan para el techo: "Un día como hoy" es un reel más, aparte.
  const reels = piezas.filter((p) => p.tipo === 'reel' && NOMBRES_DE_PODCAST.includes(p.nombre));
  if (reels.length > REGLAS.reelsPorDia) {
    reels.slice(REGLAS.reelsPorDia).forEach((p) => { p.fueraDeTecho = true; });
  }

  // El techo de historias del día (8 = las 6 del contrato + 2 extras). Cuentan
  // los tres podcasts (cada uno se sube también como historia), aunque ya hayan
  // salido. Si se pasa, se dejan de armar los extras: primero los teléfonos
  // útiles, después la agenda. Las del contrato y los avisos nunca se sacan.
  const historiasDelDia = [
    ...piezas.filter((p) => p.tipo === 'historia' || SALE_COMO_REEL(p.nombre) || NOMBRES_DE_PODCAST.includes(p.nombre)).map((p) => p.nombre),
    ...NOMBRES_DE_PODCAST.filter((n) => hechas.has(n)),
  ];
  for (const nombre of historiasQueSobran(historiasDelDia, REGLAS.historiasMaximasPorDia)) {
    const p = piezas.find((x) => x.nombre === nombre);
    if (p) { p.fueraDeTecho = true; p.motivo = `${p.motivo} · no sale: el día ya tiene ${REGLAS.historiasMaximasPorDia} historias`; }
  }

  // La línea editorial del día (18/10, regla 301; redes/linea-del-dia.mjs): enlaces entre las piezas, el gancho de continuidad por momento, lo ya contado
  // retomado por tema y el mismo llamado en todas. Se aplica después de la memoria del día, con lo que salió hoy y lo que cerró ayer (el libro).
  const aplicarLineaDelDia = () => {
    const seccionDe = new Map(publicables.map((n) => [n.id, n.seccion]));
    const deLaPieza = (dia, nombre) => {
      const v = libro?.instagram?.[`${dia}/${nombre}`];
      return [v?.notaId, ...(v?.notaIds ?? [])].filter(Boolean).map((id) => seccionDe.get(id)).filter(Boolean);
    };
    const hoy = diaAR(fecha);
    const repasosDeHoy = [
      ...PODCASTS.filter((r) => hechas.has(r.nombre)).map((r) => ({ nombre: r.nombre, hora: r.hora, secciones: deLaPieza(hoy, r.nombre) })),
      ...piezas.filter((p) => NOMBRES_DE_PODCAST.includes(p.nombre) && !hechas.has(p.nombre)).map((p) => ({ nombre: p.nombre, hora: p.hora, secciones: p.secciones ?? [] })),
    ];
    const deAyer = deLaPieza(diaAR(new Date(fecha.getTime() - 86400e3)), 'podcast');
    return conLineaEditorialDelDia(piezas, { fecha, yaSalieron: hechas, repasosDeHoy, ayer: deAyer.length ? { secciones: deAyer } : null });
  };

  // Si la web lleva horas congelada, portada.json es de hace rato: el clima, el aviso de clima y la farmacia hablarían de ayer ("Buen día"
  // con la temperatura de la madrugada, o la farmacia que ya no es de turno). Esas piezas no se arman hasta que la portada se renueve (C-15).
  const edadHoras = datos.generado ? (fecha.getTime() - Date.parse(datos.generado)) / 3600e3 : 0;
  if (edadHoras > EDAD_MAXIMA_DE_LA_PORTADA_HORAS) {
    for (const p of [...piezas]) {
      if (PIEZAS_QUE_ENVEJECEN.includes(p.nombre) || p.nombre?.startsWith('aviso')) piezas.splice(piezas.indexOf(p), 1);
    }
    console.warn(`  la portada tiene ${edadHoras.toFixed(1)} horas: no se arman el clima ni la farmacia hasta que la web se renueve.`);
    conMemoriaDelDia(piezas, momentoDeHora, { fecha });
    aplicarLineaDelDia();
    return { piezas, turno, portadaVieja: true };
  }

  // La locución con memoria del día (8/10): la primera pieza de cada franja saluda y las que salen enseguida empiezan con un puente.
  conMemoriaDelDia(piezas, momentoDeHora, { fecha });
  aplicarLineaDelDia();
  return { piezas, turno };
}

// --- ejecución -------------------------------------------------------------

if (process.argv[1] && process.argv[1].endsWith('plan.mjs')) {
  const datos = leerDatos();
  // FOTOS_EN_R2 ("Si", regla 316): las fotos de las notas ya no están en git y el repaso de los podcasts las lee DEL DISCO (`fotoParaElRepaso`), y lo
  // hace al armar el plan (`planDelDia`, más abajo), no al generar los videos. Por eso se traen ACÁ, antes de armar el plan y sea quien sea el que corre esto
  // (Redes, Piezas, Piezas de redes): ya no dependen del orden de los pasos de cada workflow. Apagado, o sin red, no hace nada y el repaso sale con las placas
  // de sección como siempre.
  if (process.argv.includes('--generar')) await traerFotosDeLaPortada({ raiz: path.join(import.meta.dirname, '..'), sitio: process.env.SITIO ?? 'https://radarbalcarce.com', env: process.env, log: console.log });
  const incluir = (process.argv.find((a) => a.startsWith('--incluir='))?.slice(10) ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const { piezas } = planDelDia(datos, { libro: leerLibro(), forzar: incluir });

  console.log(`\n\x1b[1mPLAN DEL DÍA · ${fechaLarga()}\x1b[0m`);
  console.log(`  techo: ${REGLAS.reelsPorDia} reels, ${REGLAS.historiasPorDia} historias (hasta ${REGLAS.historiasMaximasPorDia} con los extras)\n`);
  const icono = { reel: '\x1b[33mREEL     \x1b[0m', historia: '\x1b[36mHISTORIA \x1b[0m' };
  for (const p of piezas) {
    console.log(`  ${p.hora}  ${icono[p.tipo]} ${p.titulo.slice(0, 68)}`);
    console.log(`         ${p.seccion} · ${p.motivo}${p.fueraDeTecho ? ' · \x1b[31mno sale: pasa el techo\x1b[0m' : ''}`);
  }

  if (process.argv.includes('--generar')) {
    // --solo=clima-manana,farmacia rehace sólo esas, sin gastar pedidos en el resto.
    const solo = (process.argv.find((a) => a.startsWith('--solo='))?.slice(7) ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean);

    // Se carga acá y no arriba del archivo: armar los videos necesita
    // ffmpeg, que son ochenta megas, y leer el plan del día no. Con el
    // import arriba, las pruebas obligaban a instalarlo en GitHub Actions.
    const { armarReel: armarReelLocal } = await import('./reel.mjs');
    // 18/10/2026 (el video en un repositorio aparte, docs/07-REDES.md): con RENDER_REMOTO=Si la pieza no se arma acá. Se pide la voz a Gemini, se arma el pedido,
    // se sube a R2 y se despierta al repositorio público de render (reels/render-remoto.mjs); el video lo publica el Worker de tareas cuando el render lo deja
    // listo. Sin la variable, todo igual que siempre.
    const remoto = /^\s*(si|sí|true|1)\s*$/i.test(String(process.env.RENDER_REMOTO ?? ''));
    const render = remoto ? await import('./render-remoto.mjs') : null;
    const armarReel = remoto ? render.armarReelRemoto : armarReelLocal;
    const enviadas = [];
    // Una pieza armada de antemano (reels/fijas/, vigente hoy) se sube tal cual: no pide la voz de nuevo.
    // `--sin-fijas` fuerza armarla de cero (para fijar una nueva).
    const sinFijas = process.argv.includes('--sin-fijas');
    // `--de-nuevo` arma de cero aunque ya haya un video de hoy guardado (regla 208).
    const deNuevo = process.argv.includes('--de-nuevo');
    const manifiesto = [];
    const libro = leerLibro();
    const hoy = diaAR();
    // Las piezas que ya salieron no necesitan su video guardado; las que faltan, sí (por si hay que reintentarlas).
    limpiarArmadas({ dia: hoy, publicadas: piezasPublicadasHoy(libro) });
    const pendientes = pendientesDelDia({ libro, fecha: new Date() });
    const vigentes = new Set(datos.notas.map((n) => n.id));
    console.log('\n\x1b[1mARMANDO LOS VIDEOS\x1b[0m');
    console.log(`  ${textoDelCupo()}`);
    // Lo que se pidió y el plan no tiene, dicho a la vista (el 12/10 la farmacia faltó toda la noche sin que nada lo dijera).
    for (const nombre of solo.filter((n) => !piezas.some((p) => p.nombre === n))) {
      const motivo = nombre === 'farmacia' && !datos.farmacias?.turnos?.some((t) => t.dia === new Date().getDate())
        ? 'la web no tiene farmacia de turno para hoy' : 'hoy no hay datos para armarla';
      console.log(`  ${nombre}: no se arma (${motivo})`);
      if (process.env.GITHUB_ACTIONS) console.log(`::warning::${nombre}: no se arma (${motivo})`);
    }
    // Primero la más importante: si el cupo de voz no alcanza, la que queda afuera es la opcional (regla 208).
    for (const p of piezas.filter((x) => x.svg && (!x.fueraDeTecho || incluir.includes(x.nombre))
      && (!solo.length || solo.includes(x.nombre))).sort(porPrioridad)) {
      process.stdout.write(`  ${p.nombre}… `);
      try {
        const fija = sinFijas ? null : fijaVigente(p.nombre, hoy);
        // ¿Ya se armó hoy y no salió? Se sube ese mismo video, con su lista de notas, sin pedir la voz de nuevo.
        const armada = fija || deNuevo ? null : usarArmada({ nombre: p.nombre, dia: hoy, salida: SALIDA, vigentes });
        if (armada) {
          manifiesto.push(armada);
          console.log(`\x1b[32mlisto\x1b[0m ${armada.archivo} · ya estaba armada hoy, no gasta voz`);
          continue;
        }
        let r;
        if (fija && remoto) {
          // Una fija ya es un video armado: no necesita render, se sube a R2 y el Worker de tareas la publica en su hora.
          const { dependenciasDelEntorno } = render;
          r = await render.subirPiezaFija({ p, archivoMp4: fija.ruta, duracion: fija.duracion ?? 0, hasta: fija.hasta, r2: dependenciasDelEntorno().r2 });
        } else if (fija) {
          fs.mkdirSync(SALIDA, { recursive: true });
          const destino = path.join(SALIDA, `${p.nombre}.mp4`);
          fs.copyFileSync(fija.ruta, destino);
          r = { mp4: destino, duracion: fija.duracion ?? 0, historia: null, vozUsada: `fija hasta el ${fija.hasta}, no gasta voz` };
        } else {
          // R-5 (8/10/2026): el control de textos corre ANTES de gastar el cupo de voz. Es un aviso (no frena la pieza):
          // si dice algo que el criterio prohíbe, queda a la vista en la corrida para arreglarlo.
          const dudas = revisarTexto(p.guion, { tipo: 'voz', momento: p.momento });
          if (dudas.length) {
            console.log(`\x1b[33m    AVISO\x1b[0m el texto de ${p.nombre} no cumple el criterio: ${dudas.join('; ')}`);
            if (process.env.GITHUB_ACTIONS) console.log(`::warning::${p.nombre}: el texto no cumple el criterio de las redes (${dudas.join('; ')})`);
          }
          r = await armarReel({ ...p, reservarVoz: reservaPara(p.nombre, pendientes) }, SALIDA);
        }
        if (r.pendiente) {
          // Mandada al render: todavía no hay video. No entra al manifiesto ni a las piezas armadas; la publica el Worker de tareas cuando el render la deja lista.
          enviadas.push({ nombre: p.nombre, huella: r.huella });
          console.log(`\x1b[32menviada\x1b[0m ${p.nombre} al render (${r.huella}) · ${r.vozUsada ?? 'voz de Gemini'}`);
          continue;
        }
        const entrada = {
          ...entradaDelManifiesto(p),
          archivo: path.basename(r.mp4), duracion: Number(r.duracion.toFixed(1)),
          // Si el video pasa de lo que acepta una historia, las historias suben
          // esta versión recortada; el reel sube entero (redes/publicar-piezas.mjs).
          ...(r.historia ? { archivoHistoria: path.basename(r.historia.mp4), duracionHistoria: Number(r.historia.duracion.toFixed(1)) } : {}),
        };
        manifiesto.push(entrada);
        if (!fija) guardarArmada({ entrada, salida: SALIDA, dia: hoy });
        console.log(`\x1b[32mlisto\x1b[0m ${path.basename(r.mp4)} · ${r.duracion.toFixed(1)} s · voz ${r.vozUsada}`);
        if (r.historia) {
          console.log(`\x1b[33m    AVISO\x1b[0m ${r.historia.aviso}`);
          if (process.env.GITHUB_ACTIONS) console.log(`::warning::${p.nombre}: ${r.historia.aviso}`);
        }
      } catch (e) {
        console.log(`\x1b[31mfalló\x1b[0m ${e.message.split('\n')[0]}`);
      }
    }
    console.log(`\n  ${textoDelCupo()}`);
    if (hayQueAvisar() && process.env.GITHUB_ACTIONS) console.log(`::warning::${textoDelCupo()}`);
    console.log(`  Quedaron en ${SALIDA}\n`);
    // El manifiesto le dice a redes/publicar.mjs qué se armó y a qué hora sale
    // cada pieza. Con --solo se pisa: lista sólo lo que se acaba de hacer.
    // La carpeta puede no existir: si el reloj pide una pieza que ya no está
    // ("utiles", sacada el 24/09) no se arma nada y nadie la crea. El 25/09 eso
    // hizo fallar Redes en cada vuelta desde las 10:05.
    fs.mkdirSync(SALIDA, { recursive: true });
    fs.writeFileSync(path.join(SALIDA, 'piezas.json'), JSON.stringify(manifiesto, null, 2));
    if (remoto) fs.writeFileSync(path.join(SALIDA, 'enviadas.json'), JSON.stringify(enviadas, null, 2));
  } else {
    console.log('\n  Para armar los videos:  node reels/plan.mjs --generar\n');
  }
}
