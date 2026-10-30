// El modo de prueba del panel del celular (radarbalcarce.com/panel/?demo): notas
// inventadas, sin GitHub y sin guardar nada. Sirve para ver cómo se usa y para
// revisarlo en un navegador sin una llave de verdad. Arma los mismos archivos
// que arma la web (celular-pendientes.json versión 2, celular-estado.json,
// redes.json), así la prueba ejercita también cómo se abren.

import { crearLlaves } from './cifrado.js';
import { hoyEnBalcarce } from './textos.js';

const hace = (min) => new Date(Date.now() - min * 60000).toISOString();
const CUERPO = 'El Concejo Deliberante aprobó por mayoría el presupuesto 2027 en la sesión del martes. La ordenanza prevé obras de cloacas en los barrios Norte, Sur y Villa Dolores, y un aumento de la partida de salud, según informó el cuerpo.\n\nEl intendente había enviado el proyecto en octubre. La oposición votó en contra y pidió más fondos para caminos rurales.\n\nLa próxima sesión será el martes 13 de octubre.';

let llaves = null;
export async function llavesDePrueba() {
  llaves ??= await crearLlaves();
  return llaves;
}

/** Lo que espera a una persona, como lo arma paraDecidir (panel/celular-datos.mjs). */
const PENDIENTES = [
  {
    id: 'e1', titulo: 'Detienen a un hombre por el robo de una moto en la 226', seccion: 'Policiales', motivo: 'necesita ojo humano: "detenido"', fecha: hace(55), local: true,
    resumen: 'La Policía informó la detención de un hombre de 34 años acusado de robar una moto en la ruta 226. El vehículo fue recuperado.',
    fuentes: [
      { medio: 'Un medio de Balcarce', enlace: 'https://example.com/c', fecha: hace(60), oficial: false, resumen: 'Un hombre de 34 años fue detenido por el robo de una moto en la ruta 226. La moto apareció horas después.' },
      { medio: 'Policía de la Provincia', enlace: 'https://example.com/d', fecha: hace(80), oficial: true, resumen: 'Personal policial aprehendió a un masculino de 34 años sindicado como autor del robo de un motovehículo.' },
    ],
    ficha: { ambito: 'balcarce', impacto: 'directo', importancia: 'media', porque: 'Es un hecho policial en la ruta de acceso a la ciudad.' },
  },
  {
    id: 'e3', titulo: 'Sortean dos entradas para el recital del sábado en el Club', seccion: 'Cultura y agenda', motivo: 'parece promoción, no noticia: "sorteo"', fecha: hace(140),
    resumen: 'Una radio sortea entradas para el recital del sábado en el Club Social.',
    fuentes: [{ medio: 'Una radio de Balcarce', enlace: 'https://example.com/e', fecha: hace(150), oficial: false, resumen: 'Participá del sorteo de dos entradas para el recital del sábado.' }],
  },
  {
    id: 'e2', titulo: 'Un choque en la ruta 55 deja dos heridos', seccion: 'Policiales', motivo: 'necesita ojo humano: "heridos"', fecha: hace(300),
    resumen: 'Dos personas resultaron heridas en un choque entre un auto y una camioneta en la ruta 55.',
    fuentes: [{ medio: 'Un medio de Balcarce', enlace: 'https://example.com/f', fecha: hace(310), oficial: false, resumen: 'Choque entre un auto y una camioneta: dos heridos leves.' }],
    decision: { estado: 'descartada', por: 'Prueba', cuando: hace(200) },
  },
];

/** Lo que retiró una persona, como lo arma paraLaPapelera. */
const PAPELERA = [
  {
    id: 'r1', titulo: 'Corte de calle por obras en la avenida Favaloro', copete: 'La Municipalidad corta el tránsito entre la 13 y la 15 hasta el viernes.', cuerpo: CUERPO,
    seccion: 'Balcarce', fecha: hace(2000), slug: 'corte-de-calle-por-obras-en-la-avenida-favaloro', deIA: true, retirada: hace(900), por: 'Hernán', motivo: 'el corte se suspendió', desde: 'panel',
  },
];

export function clienteDePrueba() {
  const hoy = hoyEnBalcarce();
  const diaMas = (n) => new Date(Date.parse(`${hoy}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
  const archivos = {
    'web/data/portada.json': {
      generado: hace(12),
      notas: [
        { id: 'p1', titulo: 'El Concejo aprueba el presupuesto 2027', copete: 'La ordenanza prevé obras de cloacas en tres barrios y más fondos para salud.', cuerpo: CUERPO, seccion: 'Política', fecha: hace(90), slug: 'el-concejo-aprueba-el-presupuesto-2027', guion: 'x', foto: { archivo: 'fotos-notas/p1.jpg', credito: 'Foto: Un medio de Balcarce' }, fuentesConsultadas: [{ medio: 'Un medio de Balcarce', enlace: 'https://example.com/a' }] },
        { id: 'p2', titulo: 'Ferroviarios gana el clásico y queda puntero', copete: 'Ganó 2 a 1 en el estadio de la Liga.', cuerpo: CUERPO, seccion: 'Fútbol', fecha: hace(200), slug: 'ferroviarios-gana-el-clasico', guion: 'x', foto: { archivo: 'fotos-notas/p2.jpg', credito: 'Foto: Liga' } },
        { id: 'p4', titulo: 'Jugadoras locales compiten en un torneo de básquet en Mar del Plata', copete: 'Las categorías U13 y U15 viajaron a un torneo internacional.', cuerpo: CUERPO, seccion: 'Deportes', fecha: hace(300), slug: 'jugadoras-locales-compiten', guion: 'x', fuentesConsultadas: [{ medio: 'Municipalidad de Balcarce', enlace: 'https://example.com/m' }] },
        { id: 'p5', titulo: 'Un choque en la ruta 55 de ayer', copete: 'Dos heridos.', cuerpo: CUERPO, seccion: 'Policiales', fecha: hace(1800), slug: 'un-choque-en-la-ruta-55', guion: 'x', foto: { archivo: 'fotos-notas/p5.jpg', credito: 'Foto: Bomberos' } },
        { id: 'p3', titulo: 'La Cooperativa anuncia un corte de luz para el miércoles', copete: 'Será de 8 a 12 en el barrio Norte por trabajos en la red.', cuerpo: CUERPO, seccion: 'Balcarce', fecha: hace(40), slug: 'la-cooperativa-anuncia-un-corte-de-luz', guion: 'x' },
      ],
      pendientes: [{ id: 'e1', titulo: null, seccion: 'Policiales', motivo: 'necesita ojo humano: "detenido"' }, { id: 'e3', titulo: 'Sortean dos entradas para el recital del sábado en el Club', seccion: 'Cultura y agenda', motivo: 'parece promoción, no noticia: "sorteo"' }],
    },
    'web/data/esperando-cuerpo.json': {
      intentosMaximos: 3,
      notas: [
        { id: 's1', titulo: 'Cortan el agua el jueves en el barrio Norte', copete: 'Por una obra en la red, el jueves no habrá agua de 9 a 14 en el barrio Norte.', seccion: 'Balcarce', fecha: hace(40), intentos: 1, fuentes: [{ medio: 'Municipalidad de Balcarce', enlace: 'https://example.com/b' }] },
        { id: 's2', titulo: 'Abre la inscripción a los talleres culturales de octubre', copete: 'La Casa de la Cultura abre la inscripción a los talleres de octubre.', seccion: 'Cultura y agenda', fecha: hace(400), intentos: 3, fuentes: [{ medio: 'Municipalidad de Balcarce', enlace: 'https://example.com/g' }] },
      ],
    },
    'web/data/banco-fotos.json': { p4: { intentado: true, origen: 'gemini', razon: 'La única foto disponible incluye menores de edad reconocibles, por lo que no se puede usar.', cuando: hace(100), intentos: 1 } },
    'web/data/celular-decisiones.json': { notas: { e2: { estado: 'descartada', por: 'Prueba', cuando: hace(200), motivo: 'descartada desde el celular' } }, redes: {} },
    'web/data/correcciones.json': { notas: {} },
    'web/data/retiradas.json': { notas: {} },
    'web/data/notas-de-redaccion.json': { notas: {} },
    // La pestaña Fechas: un par de días y de feriados de ejemplo.
    'web/data/efemerides-candidatas.json': {
      generado: hace(60), desde: '2026-10-05', dias: {
        '2026-10-05': { diaSemana: 'lunes', candidatas: [
          { id: 'c1', origen: 'portal', estilo: 'nacimiento', anio: 1901, hace: 125, titulo: 'Nace el poeta Carlos Mastronardi', texto: 'Nace en Gualeguay (Entre Ríos) el poeta y ensayista Carlos Mastronardi.', marcas: [], puntaje: 66, fuente: 'Portal Argentina de Wikipedia' },
          { id: 'c2', origen: 'feed', estilo: 'curioso', anio: 1952, hace: 74, titulo: 'Primera patente del código de barras', texto: 'En Estados Unidos sale a la luz la primera patente del código de barras.', marcas: [], puntaje: 51, fuente: 'https://es.wikipedia.org/wiki/C%C3%B3digo_de_barras' },
          { id: 'c3', origen: 'portal', estilo: 'historia', anio: 1904, hace: 122, titulo: 'Asume la presidencia Manuel Quintana', texto: 'Manuel Quintana asume la presidencia de Argentina.', marcas: ['política'], puntaje: 30, fuente: 'Portal Argentina de Wikipedia' },
          { id: 'c4', origen: 'especial', estilo: 'dia-especial', anio: null, hace: null, titulo: 'Día Mundial del Algodón', texto: 'Día Mundial del Algodón.', marcas: [], puntaje: 22, fuente: 'Wikipedia: días especiales' },
        ] },
        '2026-10-06': { diaSemana: 'martes', candidatas: [
          { id: 'c5', origen: 'curada', estilo: 'balcarce', anio: null, hace: null, titulo: 'Fundación del pueblo de Balcarce', texto: 'El 22 de junio de 1876 se fundó el pueblo de San José de Balcarce.', marcas: [], puntaje: 120, fuente: 'https://es.wikipedia.org/wiki/Balcarce_(ciudad)', datos: [{ texto: 'Fue declarado ciudad el 15 de septiembre de 1949.', fuente: 'https://es.wikipedia.org/wiki/Balcarce_(ciudad)' }] },
        ] },
      },
    },
    'web/data/feriados-piezas.json': {
      generado: hace(60), feriados: [
        { fecha: '2026-10-12', nombre: 'Día del Respeto a la Diversidad Cultural', tipo: 'trasladable', estado: 'propuesta', enfoque: 'La historia del nombre de la fecha, en tono institucional, y el censo 2022.', datos: [{ texto: 'El decreto 1584/2010 le cambió el nombre.', fuente: 'https://servicios.infoleg.gob.ar/infolegInternet/anexos/170000-174999/174389/norma.htm' }, { texto: 'En el censo 2022, 1.306.730 personas se reconocieron indígenas o descendientes.', fuente: 'https://censo.gob.ar/' }], citas: [], revisaUnaPersona: false },
        { fecha: '2026-12-08', nombre: 'Día de la Inmaculada Concepción de María', tipo: 'inamovible', estado: 'propuesta', enfoque: 'Sobrio y corto: el dogma de 1854.', datos: [], citas: [], revisaUnaPersona: false },
      ],
    },
    'web/data/efemerides-elegidas.json': { dias: {}, feriados: {}, piezas: {} },
    'ingesta/contactos-agenda.json': { contactos: [
      { id: 'turismo', quien: 'Subsecretaría de Turismo - Municipalidad de Balcarce', rubro: 'municipio', organiza: 'Fiestas, eventos y agenda turística', meses: [2, 7, 8, 10], canales: { whatsapp: '5492266638650', web: 'https://balcarce.gob.ar/events/' }, nota: 'El WhatsApp es el de Turismo.' },
      { id: 'hets', quien: 'Grupo Hets - Organización de Eventos Deportivos', rubro: 'deportes', organiza: 'Ultra Trail Tierras del Diablo y otras carreras', meses: [8, 10, 12], canales: { telefono: '(02266) 15-475024', web: 'https://example.com/hets' } },
      { id: 'postre', quien: 'Fiesta Nacional del Postre Balcarce', rubro: 'fiesta', organiza: 'Fiesta Nacional del Postre en la Sociedad Rural', meses: [7, 10], canales: { whatsapp: '5492266638650', mail: 'postre@example.com' } },
    ] },
    'web/data/contactos-celular.json': { version: 1, contactos: {} },
    'web/data/pistas.json': { version: 1, pistas: {
      pistaA: { creada: hace(300), texto: 'Cierra la fábrica de lácteos de Balcarce', afirmacion: 'Cierra la fábrica de lácteos de Balcarce', consultas: ['cierra fábrica lácteos Balcarce'], estado: 'abierta', ultimaRevision: hace(60), nivel: 'cubierta', total: 3, mediosVistos: ['Medio A', 'Medio B', 'Medio C'], teniamos: false, novedad: true, historial: [{ cuando: hace(300), total: 0, nivel: 'sin-cobertura' }, { cuando: hace(60), total: 3, nivel: 'cubierta' }] },
      pistaB: { creada: hace(2000), texto: 'Dicen que habrá un recital grande en octubre', afirmacion: 'Habrá un recital grande en octubre', consultas: ['recital grande Balcarce octubre'], estado: 'abierta', ultimaRevision: hace(120), nivel: 'sin-cobertura', total: 0, mediosVistos: [], teniamos: false, novedad: false, historial: [] },
    } },
    'web/data/efemerides-piezas.json': {
      generado: hoy, dias: {
        [diaMas(1)]: { voz: 'locutora', principal: { id: 'c1', anio: 1901, titulo: 'Nace el poeta Carlos Mastronardi', cuerpo: 'Poeta y ensayista argentino.', verificar: [] }, ademas: [{ id: 'c2', anio: 1952, texto: 'Se patenta el código de barras' }], guion: 'Buen día, Balcarce. Un día como hoy, en 1901, nació el poeta Carlos Mastronardi. Y además, un día como hoy: en 1952 se patentó el código de barras. Un día como hoy, en Radar Balcarce.' },
        [diaMas(2)]: { sale: false, revision: 'sin revisar', voz: 'locutora', principal: { id: 'c5', anio: 1876, titulo: 'Fundación del pueblo de Balcarce', cuerpo: 'Se fundó San José de Balcarce.', verificar: [] }, ademas: [{ id: 'c6', anio: 1949, texto: 'Balcarce es declarada ciudad' }], guion: 'Buen día, Balcarce. Un día como hoy se fundó el pueblo. Un día como hoy, en Radar Balcarce.' },
        [diaMas(4)]: { sale: false, voz: 'locutora', principal: { id: 'c9', anio: 1900, titulo: 'Otro día', cuerpo: 'Texto.', verificar: [] }, ademas: [{ id: 'c8', anio: 1950, texto: 'Algo más' }], guion: 'Guion corto.' },
      },
    },
    'web/data/celular-llaves.json': { llaves: [] },
    'web/data/celular-borradores.json': { version: 1, borradores: {} },
    'web/data/archivo.json': { notas: [] },
    'web/data/celular-estado.json': {
      generado: hace(12),
      portada: 3,
      archivo: 1240,
      esperandoCuerpo: 2,
      redes: {
        generado: hace(12),
        activas: true,
        piezas: [
          { nombre: 'clima-manana', tipo: 'historia', hora: '07:30', que: 'El clima de la mañana', voz: 'locutora', ventana: 240 },
          { nombre: 'noticia1', tipo: 'reel', hora: '10:00', que: 'El repaso de la mañana', voz: 'locutor', ventana: 300 },
          { nombre: 'noticia2', tipo: 'reel', hora: '15:00', que: 'El repaso de la tarde', voz: 'locutora', ventana: 300 },
          { nombre: 'farmacia', tipo: 'historia', hora: '19:00', que: 'La farmacia de turno', voz: 'locutor', ventana: 300 },
          { nombre: 'clima-noche', tipo: 'historia', hora: '20:00', que: 'Cómo sigue el día (el clima de la noche)', voz: 'locutora', ventana: 240 },
          { nombre: 'podcast', tipo: 'reel', hora: '20:30', que: 'El repaso del día', voz: 'locutor', ventana: 210 },
        ],
        repasos: [
          { nombre: 'noticia1', titulo: 'El repaso de la mañana', hora: '10:00', voz: 'locutor', salio: null, segundos: null, notas: [{ id: 'p3', titulo: 'La Cooperativa anuncia un corte de luz para el miércoles', seccion: 'Balcarce' }, { id: 'p2', titulo: 'Ferroviarios gana el clásico y queda puntero', seccion: 'Fútbol' }] },
          { nombre: 'noticia2', titulo: 'El repaso de la tarde', hora: '15:00', voz: 'locutora', salio: null, segundos: 44, notas: [{ id: 'p1', titulo: 'El Concejo aprueba el presupuesto 2027', seccion: 'Política' }, { id: 'p3', titulo: 'La Cooperativa anuncia un corte de luz para el miércoles', seccion: 'Balcarce' }] },
          { nombre: 'podcast', titulo: 'El repaso del día', hora: '20:30', voz: 'locutor', salio: null, segundos: 52, notas: [{ id: 'p1', titulo: 'El Concejo aprueba el presupuesto 2027', seccion: 'Política' }, { id: 'p3', titulo: 'La Cooperativa anuncia un corte de luz para el miércoles', seccion: 'Balcarce' }, { id: 'p2', titulo: 'Ferroviarios gana el clásico y queda puntero', seccion: 'Fútbol' }] },
        ],
        facebook: {
          cola: [{ id: 'p3', titulo: 'La Cooperativa anuncia un corte de luz para el miércoles', seccion: 'Balcarce', marcada: false }],
          porDia: 5, minutosEntrePosteos: 90, edadMaximaHoras: 8, desdeHora: 8, hastaHora: 22,
        },
      },
    },
    'web/data/redes.json': {
      facebook: { f1: { cuando: hace(150), titulo: 'El Municipio abre la inscripción a la Expo Balcarce' } },
      instagram: { [`${hoy}/clima-manana`]: { cuando: hace(600), nombre: 'clima-manana' } },
      instagramFeed: { f1: { cuando: hace(149) } },
    },
  };
  return {
    async leer(ruta) {
      if (ruta === 'web/data/celular-pendientes.json') {
        // El sobre de la prueba se cierra acá con la llave de prueba, uno por nota, como lo cierra GitHub.
        const { cerrarParaPrueba } = await import('./prueba-sobre.js');
        const l = await llavesDePrueba();
        const cerrar = async (lista) => Object.fromEntries(await Promise.all(lista.map(async (n) => [n.id, await cerrarParaPrueba(n, l)])));
        return {
          json: {
            version: 2, generado: hace(12), cuantas: PENDIENTES.length, orden: PENDIENTES.map((n) => n.id), notas: await cerrar(PENDIENTES),
            retiradas: await cerrar(PAPELERA), ordenRetiradas: PAPELERA.map((n) => n.id),
          },
          sha: 'x',
        };
      }
      if (ruta === 'web/data/celular-llaves.json') {
        const l = await llavesDePrueba();
        return { json: { llaves: [{ nombre: 'Celular de prueba', publica: l.publica, huella: l.huella }] }, sha: 'x' };
      }
      if (!(ruta in archivos)) {
        const { ErrorDeGitHub } = await import('./github.js');
        throw new ErrorDeGitHub(404, 'Not Found');
      }
      return { json: structuredClone(archivos[ruta]), sha: 'x' };
    },
    async guardar(ruta, cambiar) {
      archivos[ruta] = cambiar(structuredClone(archivos[ruta] ?? {})) ?? archivos[ruta];
      return archivos[ruta];
    },
    async puedeEscribir() { return true; },
    async disparar(workflow, inputs) {
      if (workflow !== 'panel.yml') return;
      const { cerrarParaPrueba } = await import('./prueba-sobre.js');
      const borrador = {
        id: inputs.id, ok: false, pedido: inputs.pedido,
        texto: { titulo: 'La Policía detiene a un hombre por el robo de una moto', copete: 'Tiene 34 años. Según la Policía, habría robado la moto en la ruta 226.', cuerpo: 'Según informó la Policía, un hombre de 34 años fue detenido el lunes acusado de robar una moto en la ruta 226. De acuerdo con la denuncia, el hecho habría ocurrido a la tarde.\n\nLa moto fue recuperada y devuelta a su dueño. La causa quedó a cargo de la fiscalía de turno.' },
        problemas: ['el cuerpo tiene 52 palabras: hacen falta 70'], sacadas: 1, aviso: 'necesita ojo humano: "detenido"',
      };
      archivos['web/data/celular-borradores.json'].borradores[inputs.id] = { ...(await cerrarParaPrueba(borrador, await llavesDePrueba())), cuando: new Date().toISOString() };
      this.marca = inputs.marca;
    },
    async pasos() { return [{ name: 'Las notas de la última actualización', status: 'completed' }, { name: 'Escribir con IA', status: 'in_progress' }, { name: 'Guardar el borrador', status: 'queued' }]; },
    async subirArchivo() { return undefined; },
    async corridas() { return [{ display_title: `Panel · escribir · ${this.marca}`, status: 'completed', conclusion: 'success' }]; },
  };
}

/** La nube de mentira del modo de prueba (regla 317): la pausa general se prende y se apaga en memoria, y el motor siempre viene bien. No toca ninguna red. */
export function nubeDePrueba() {
  let pausa = { pausada: false, desde: null, por: null, motivo: null, ultima: null };
  const estado = () => ({
    ok: true,
    ahora: new Date().toISOString(),
    pausa: { ...pausa },
    motor: { ultima: { cuando: hace(12), ok: true, segundos: 310, motivo: null }, ultimaBuena: hace(12), recientes: [], enMarcha: null, ultimoPedidoDelPanel: null },
  });
  return {
    async estado() { return estado(); },
    async pausar({ motivo, nombre }) {
      const yaEstaba = pausa.pausada;
      if (!yaEstaba) pausa = { pausada: true, desde: new Date().toISOString(), por: nombre || 'Prueba', motivo: motivo || null, ultima: pausa.ultima };
      return { ok: true, yaEstaba, pausa: { ...pausa } };
    },
    async reanudar({ nombre }) {
      const yaEstaba = !pausa.pausada;
      if (!yaEstaba) pausa = { pausada: false, desde: null, por: null, motivo: null, ultima: { desde: pausa.desde, hasta: new Date().toISOString(), por: pausa.por, reanudadaPor: nombre || 'Prueba', motivo: pausa.motivo } };
      return { ok: true, yaEstaba, pausa: { ...pausa } };
    },
    async pedirVuelta() {
      if (pausa.pausada) { const { ErrorDeLaNube } = await import('./nube.js'); throw new ErrorDeLaNube(409, 'En pausa general: reanudá antes de pedir una vuelta.', { enPausa: true }); }
      return { ok: true, pedida: true };
    },
  };
}
