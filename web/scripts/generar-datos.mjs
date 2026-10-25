// Arma los datos de la web (web/data/) a partir de las noticias y de lo que
// decidieron el semáforo y las personas.
//
// Por qué archivos estáticos: la web es HTML estático en Cloudflare Pages.
// "Actualizar la web" (GitHub Actions) corre este script cada media hora, guarda
// lo que cambió en el repositorio, compila y publica.
//
// Qué hace, en orden:
//
//   1. Corre la ingesta en el momento y lee las decisiones de las personas (el
//      celular, web/data/celular-decisiones.json).
//   2. Anota la primera vez que vio cada nota y fija su fecha (fechaReal).
//   3. La lectura con IA (fichas, repetidas) y, otra vez, la popularidad que
//      pide lo de afuera (3 medios, 2 en las áreas chicas; no hay cupos desde el 17/10).
//   4. La reescritura con IA de lo que va a salir.
//   5. Decide qué nota se publica (notaPublicada): la decisión de una persona o
//      el semáforo, que no llegue tarde, las correcciones a mano, lo que no se
//      publica nunca y "sin cuerpo no se publica".
//   6. El banco de fotos.
//   7. El archivo: lo que se retira y lo que se corrige de lo ya publicado.
//   8. Las notas propias (el dólar del día y los repasos de los podcasts).
//   9. La portada (sólo lo vigente, sin repetidas), el archivo y la agenda.
//  10. La farmacia de turno, el clima, los útiles y las pendientes.
//  11. La estadística del día, las notas que esperan cuerpo y, si cambió algo
//      que importa, la portada.
//
// Qué escribe (cada uno sólo si falta o si cambió):
//
//   web/data/portada.json           lo que se muestra (portada, secciones, feed)
//   web/data/archivo.json           todo lo publicado con página (lib/archivo.js)
//   web/data/agenda.json            los eventos con página (lib/eventos.js)
//   web/data/intentos-ia.json       cuántas veces se le pidió cada nota a Gemini
//   web/data/dolar-historia.json    la cotización de cada día hábil
//   web/data/fichas.json            las fichas de la lectura con IA
//   web/data/notas-por-dia.json     la estadística diaria de notas
//   web/data/estadistica-seleccion.json  dónde cayó cada historia que llegó, por día y sección (regla 260)
//     + web/public/panel/estadistica-seleccion.html   su reporte (un artefacto del sitio, no se versiona)
//   web/data/banco-fotos.json       el banco de fotos, y las fotos en
//     + web/public/fotos-notas/     web/public/fotos-notas/
//   web/data/esperando-cuerpo.json  las notas que esperan cuerpo
//   web/data/vistas.json            la primera vez que se vio cada nota
//   web/data/celular-pendientes.json lo que espera a una persona, cifrado para
//     + .cache/celular-notas.json    el celular; y las notas enteras, en la
//                                    caché de Actions (panel/celular-datos.mjs)
//
// Lee, además, las correcciones (correcciones.json) y las retiradas (retiradas.json).
//
//   node scripts/generar-datos.mjs   (en GitHub Actions; en la PC, ver más abajo)

import fs from 'node:fs';
import { crearExisteFoto } from '../../infra/compartido/fotos-r2.mjs';
import path from 'node:path';
import { leerJson, leerJsonEstricto } from '../../ingesta/json.mjs';
import { NUMEROS, tocaHoy, diaDeEstaSemana, diaDeTurno, comoISO, decisionHumana } from '../../ingesta/utiles.mjs';
import { avisosDelClima } from '../../ingesta/alertas.mjs';
import {
  reescribirAutomaticas, previasDeLaPortada, extrasParaLaWeb, sinExtras, CAMPOS_EXTRA, podarIntentos, fuentesConsultadasDeOrigenes,
  MAXIMO_DE_INTENTOS, intentosMaximosPara,
} from '../../reels/reescritura.mjs';
import { TEMAS, MOTIVO_COTIZACION, REGLAS_SEMAFORO } from '../../ingesta/fuentes.mjs';
import { tieneCuerpo } from '../lib/cuerpo.js';
import { tituloAutomatico } from '../lib/titulos.js';
import { sinNotasRepetidas } from '../lib/texto.js';
import { pendientesDeLaIngesta } from '../../redes/avisos.mjs';
import { cuentaDelDia, anotarDia, comoHistoriaJson as comoNotasPorDiaJson } from '../../ingesta/estadistica-diaria.mjs';
import {
  vigenteEnPortada, slugsConocidos, fijarSlug, actualizarArchivo, aligerarViejas, idsEnRedes, sinPuntaje, comoArchivoJson, guardiaDelArchivo, ingestaSana, bajasDelArchivo, mesDeLaNota, conBajasEnElHistorico,
  idsRetiradosAMano, correccionesAMano, conCorreccion, cambiosDeLaAuditoria, conCambiosDeLaAuditoria, fechaDeLaNota, llegaTarde, horasParaEstrenar,
  conFechaSinError, HORAS_DE_UN_HECHO, idsQueYaTienenPagina, seccionSinSaltos,
  esDeLoQueNuncaSePublica, pierdeLaPagina, podarRetiradas, comoRetiradasJson, sePodaPorFaltaDeCuerpo, topeDeNotas, topeDeEstaVuelta, MAXIMO_EN_ARCHIVO,
} from '../lib/archivo.js';
import { diaAR, diaSemanaAR } from '../../ingesta/zona.mjs';
import {
  esperaSoloPorCantidad, semaforoDelTexto, esEfemerideAjena, esDeUnMedioDeAca, esDeAca, cuantosMediosDeAca, contarMedios, MOTIVO_POCO_CONTADA,
} from '../../ingesta/ingesta.mjs';
import { MOTIVO_ESPERA_LECTURA } from '../../ingesta/lectura-ia.mjs';
import {
  observarCorrida, anotarCorrida, contarUnSoloMedio, motivoDeUnaMuyContada, sinMotivo, leerEstado as leerEstadisticaDeLaSeleccion, comoJson as comoEstadisticaDeLaSeleccionJson,
} from '../../ingesta/estadistica-seleccion.mjs';
import { reporteHtml as reporteDeLaSeleccionHtml } from '../../scripts/medir/estadistica-seleccion.mjs';
import { MUY_CONTADA } from '../../ingesta/criterio.mjs';

/** Cuántas horas puede tener el hecho de esta nota para estrenarse: 12 si es de afuera, 24 si la cuentan MUY_CONTADA.medios o más, 36 si es de acá (regla 306). */
const horasDeEstreno = (n) => horasParaEstrenar(contarMedios(n.medios), esDeAca(n));
import { bancoFinal, textoDelBanco, hayQueEscribirElBanco } from './banco-sin-ruido.mjs';
import { conFotosDelBanco, podarFotos, esIlustracionDeNota, ilustracionPermitida, fotoConMenorPermitida, fotoDelArchivoAlDia } from './fotos-notas.mjs';
import { idsRetiradosPorLaRevision, parejasDeLaRevision } from '../lib/revision-archivo.js';
import { actualizarAgenda, aplicarSuspendidos, comoAgendaJson } from '../lib/eventos.js';
import { traerDolar } from '../lib/dolar.js';
import {
  cuandoArmarDolar, entradaDelDia, sumarAlHistorial, comoHistoriaJson, notasDelDolar, notasDeRepasos,
  cuandoArmarClima, entradaDelClima, sumarClimaAlHistorial, comoClimaJson, notasDelClima, notasDeEfemerides,
} from '../lib/notas-propias.js';
import {
  leerDecisionesCelular, paraDecidir, notasParaEscribir, papeleraAlDia, paraLaPapelera,
} from '../../panel/celular-datos.mjs';
import { leerLlaves, cerrarCadaUno } from '../../panel/cifrado.mjs';
import { previaDelDia } from '../../redes/previa.mjs';
import { estaActivo } from '../../redes/elegir.mjs';
import {
  repetidasConOtraDireccion, fotosParaLaQueQueda, conFusionadas, parejasSospechosas, sumarFuentesDeParejas, unionesFirmes, conLaPublicadaPrimero,
  PAREJAS,
} from '../lib/repetidas.js';
import { diceEnVivo } from '../../ingesta/verificar.mjs';
import { parejasConLoPublicado, conFuentesDeLasUnidas } from '../../ingesta/repetidas-publicadas.mjs';
import { anclasConfirmadas } from '../../ingesta/huellas-significado.mjs';
import { traerF1, notasDeF1, comoF1Json } from '../../ingesta/f1.mjs';
import { traerFutbol, notasDeFutbol, comoFutbolJson } from '../../ingesta/futbol.mjs';
import { notasDePistas } from '../lib/notas-de-pistas.js';
import { SECCIONES_SUMADAS } from '../../ingesta/secciones-nuevas.mjs';
import { minimoNacional, minimoAreasChicas, popularidadDe } from '../../ingesta/popularidad.mjs';

const AQUI = import.meta.dirname;
const SALIDA = path.join(AQUI, '..', 'data', 'portada.json');
// Todo lo publicado, aunque ya no esté en la portada: ver lib/archivo.js.
const ARCHIVO = path.join(AQUI, '..', 'data', 'archivo.json');
// El libro de lo publicado en las redes: de ahí salen las direcciones de los
// enlaces que ya están en Facebook.
const LIBRO_REDES = path.join(AQUI, '..', 'data', 'redes.json');
// Los eventos con página propia (/agenda/<nombre>-<id>): los del municipio,
// más los que ya pasaron hace menos de 60 días. Ver lib/eventos.js.
const AGENDA_WEB = path.join(AQUI, '..', 'data', 'agenda.json');
// Cuántas veces se le pidió cada nota a Gemini (reels/reescritura.mjs,
// MAXIMO_DE_INTENTOS): { id: { intentos, ultimo, motivo } }, podado a 7 días.
// Va versionado: es la única memoria entre corridas de lo que NO salió.
const INTENTOS_IA = path.join(AQUI, '..', 'data', 'intentos-ia.json');
// La cotización del dólar de las 11 de cada día hábil, 60 días: de ahí sale la
// nota propia del dólar y su comparación con días anteriores
// (lib/notas-propias.js). Va versionado, como intentos-ia.json.
const HISTORIA_DOLAR = path.join(AQUI, '..', 'data', 'dolar-historia.json');
const HISTORIA_CLIMA = path.join(AQUI, '..', 'data', 'clima-historia.json');
// Las notas que nacieron de una pista y aprobó una persona desde el celular (3/10, web/lib/notas-de-pistas.js): las escribe el celular, ningún workflow las toca.
const NOTAS_DE_PISTAS = path.join(AQUI, '..', 'data', 'notas-de-pistas.json');
// La Fórmula 1 (ingesta/f1.mjs, 3/10): calendario, resultado y campeonato de Jolpica, y cuándo salió cada nota.
const F1_JSON = path.join(AQUI, '..', 'data', 'f1.json');
// El fútbol (ingesta/futbol.mjs, 3/10): partidos, resultados y tablas de la Liga y las copas, de ESPN, y cuándo salió cada nota.
const FUTBOL_JSON = path.join(AQUI, '..', 'data', 'futbol.json');
// Las fichas de la lectura con IA, que decide desde el 27/09 (ingesta/lectura-ia.mjs).
const FICHAS = path.join(AQUI, '..', 'data', 'fichas.json');
// El banco de fotos (28/09, scripts/fotos-notas.mjs): qué nota ya se probó,
// tenga foto o no, para no volver a gastar cupo preguntando dos veces.
const BANCO_FOTOS = path.join(AQUI, '..', 'data', 'banco-fotos.json');
// Las fotos elegidas, versionadas junto con el resto de lo público (como
// reels/marca/fuentes/): así también las sirve Cloudflare Pages sin nada
// más que hacer.
const FOTOS_NOTAS = path.join(AQUI, '..', 'public', 'fotos-notas');
// ¿Existe esa foto? En disco o, con FOTOS_EN_R2 prendida, en R2 (el índice que deja la vuelta del motor): una nota no pierde su foto porque no esté en disco.
const existeFoto = crearExisteFoto(FOTOS_NOTAS);
// Las notas que esperan cuerpo, con lo necesario para escribirlo a mano (28/09:
// Gemini sin cupo dejaba 34 esperando y la portada con notas de días atrás; así
// Claude u otra persona las redacta en web/data/correcciones.json).
const ESPERANDO_CUERPO = path.join(AQUI, '..', 'data', 'esperando-cuerpo.json');
// La primera vez que vimos cada nota de la ingesta, publicada o no (28/09).
// Un feed sin fecha le pone "ahora" en cada corrida: sin esta memoria, una nota
// que llevaba días en el feed salía como recién publicada. Se poda a 7 días.
const VISTAS = path.join(AQUI, '..', 'data', 'vistas.json');
const DIAS_DE_VISTAS = 7;
// La revisión del archivo (regla 212, web/scripts/revisar-archivo.mjs; web/data/revision-archivo.json, lo escribe sólo su workflow): lo
// que retiró por lo que hoy no saldría nunca (rojo, "nunca", "no es nota", sin cuerpo) y las copias de una noticia que ya estaba.
const REVISION_DEL_ARCHIVO = leerJson(path.join(AQUI, '..', 'data', 'revision-archivo.json'), null);
const RETIRADAS_POR_LA_REVISION = idsRetiradosPorLaRevision(REVISION_DEL_ARCHIVO);
const REPETIDAS_DE_LA_REVISION = parejasDeLaRevision(REVISION_DEL_ARCHIVO);
// Lo que se sacó a mano de la web, fuera del panel (lib/archivo.js), y lo que retiró la revisión del archivo: cuenta igual (no sale en
// ninguna lista, no tiene página, su foto se borra) y, como esa lista no se poda los lunes, no vuelve aunque un feed la traiga de nuevo.
const RETIRADAS_A_MANO = new Set([...idsRetiradosAMano(leerJson(path.join(AQUI, '..', 'data', 'retiradas.json'), null)), ...RETIRADAS_POR_LA_REVISION]);
if (RETIRADAS_POR_LA_REVISION.size || REPETIDAS_DE_LA_REVISION.length) console.log(`  revisión del archivo: ${RETIRADAS_POR_LA_REVISION.size} retiradas, ${REPETIDAS_DE_LA_REVISION.length} unidas a la que ya estaba`);
// Lo que se corrigió a mano (título, bajada, sección), fuera del panel.
const CORRECCIONES = correccionesAMano(leerJson(path.join(AQUI, '..', 'data', 'correcciones.json'), null));
// Las notas que se unieron a otra (lib/repetidas.js, 29/09): su dirección redirige a la que quedó. Desde el 15/10 (regla 175)
// también se leen al empezar: la ingesta prefiere la dirección de la que quedó y la unión queda firme (UNIDAS_FIRMES).
const FUSIONADAS = path.join(AQUI, '..', 'data', 'fusionadas.json');
const FUSIONADAS_ANTES = leerJson(FUSIONADAS, null);
// Lo que corrigió sola la auditoría con IA (ortografía chica y segura, 2/10): web/data/correcciones-auditoria.json, lo escribe sólo "Auditoría IA".
const CAMBIOS_AUDITORIA = cambiosDeLaAuditoria(leerJson(path.join(AQUI, '..', 'data', 'correcciones-auditoria.json'), null));
// El panel del celular (29/09, panel/celular-datos.mjs): lo que decidió una
// persona desde el celular (aprobar, descartar, retirar) y lo que marcó para que
// también vaya a Facebook e Instagram. Lo escribe sólo el celular.
const CELULAR = leerDecisionesCelular(leerJson(path.join(AQUI, '..', 'data', 'celular-decisiones.json'), null));
// Lo que espera a una persona, cifrado para cada celular registrado
// (panel/cifrado.mjs), y las notas completas para que GitHub las pueda escribir
// con IA cuando el celular lo pide (en la caché de Actions, que no es pública).
const CELULAR_LLAVES = path.join(AQUI, '..', 'data', 'celular-llaves.json');
const CELULAR_PENDIENTES = path.join(AQUI, '..', 'data', 'celular-pendientes.json');
const CELULAR_NOTAS = path.join(AQUI, '..', '..', '.cache', 'celular-notas.json');
// Lo que el celular muestra aparte de las notas: cuántas hay y lo que va a salir
// hoy en las redes (redes/previa.mjs). Es de lo ya publicado: no va cifrado.
const CELULAR_ESTADO = path.join(AQUI, '..', 'data', 'celular-estado.json');
// La papelera (lo que retiró una persona, para poder volver a publicarlo). En la
// caché de Actions: no es pública.
const PAPELERA = path.join(AQUI, '..', '..', '.cache', 'papelera.json');

// Corre en GitHub Actions ("Actualizar la web"). Desde el 17/10 no hay "modo PC": el panel de la PC, que guardaba las noticias
// y las decisiones en panel/datos/, se retiró. En la PC no corre solo: haría la corrida entera (la ingesta, la lectura y la
// redacción con IA, las fotos) y dejaría web/data/ cambiado. Para ver el sitio con los datos de GitHub alcanza con `git pull` y
// `npm run build`; para correrlo igual en la PC, ARMAR_EN_LA_PC=1 (y lo que cambie en web/data/ no se sube).
// 18/10/2026: la vuelta del motor en Cloudflare (infra/motor-cloudflare/vuelta.mjs, Workers Builds) también arma de verdad: RADAR_MOTOR=cloudflare.
if (process.env.GITHUB_ACTIONS !== 'true' && process.env.RADAR_MOTOR !== 'cloudflare' && process.env.ARMAR_EN_LA_PC !== '1') {
  console.log('  generar-datos arma la web de verdad (ingesta, IA, fotos) y corre en GitHub Actions: en la PC no hace nada.');
  console.log('  Para ver el sitio: git pull y npm run build. Para correrlo igual: ARMAR_EN_LA_PC=1 npm run datos (sin subir web/data/).');
  process.exit(0);
}

const { ingestar } = await import('../../ingesta/ingesta.mjs');
const { agendaCompleta } = await import('../../ingesta/agenda.mjs');
// Los identificadores ya publicados: cuando otro medio se suma a una
// historia, la nota no cambia de dirección (ingesta/cruce.mjs).
const notasDeAntes = [...leerJson(SALIDA, { notas: [] }).notas ?? [], ...leerJson(ARCHIVO, { notas: [] }).notas ?? []];
const idsConocidos = new Set(notasDeAntes.map((n) => n.id));
// Los medios que pide lo de afuera (reglas 215 y 260, ingesta/popularidad.mjs): 3, o 2 en las áreas chicas. Se regulan con las
// variables de GitHub MINIMO_NACIONAL y MINIMO_AREAS_CHICAS; el registro lo dice para que se vea en la corrida cuál rigió.
console.log(`  popularidad: lo nacional pide ${minimoNacional()} medios y las áreas chicas ${minimoAreasChicas()}`);
let ultima = await ingestar({
  silencioso: true, idsConocidos, idsUnidos: new Set(Object.keys(FUSIONADAS_ANTES?.notas ?? {})),
});
// Lo que llegó del cruce, antes de la lectura con IA: para la estadística de la selección (regla 260, ingesta/estadistica-seleccion.mjs).
const delCruce = (ultima.notas ?? []).map((n) => ({
  id: n.id, titulo: n.titulo, seccion: n.seccion, medios: contarMedios(n.medios), deAca: esDeAca(n) || esDeUnMedioDeAca(n) || n.alcance === 'local',
  oficial: !!n.oficial,
}));
const agenda = await agendaCompleta().catch(() => null);
// Las decisiones de las personas son las del celular (las del panel de la PC, web/data/decisiones.json, vacías desde el 28/09,
// se dejaron de leer el 17/10).
const estado = { decisiones: { ...CELULAR.notas } };
console.log(`  ${ultima.notas.length} historias · ${Object.keys(estado.decisiones).length} decisiones desde el celular`);

// Una fuente que se vacía no avisa. Algunas se leen raspando el HTML de
// la página: el día que El Diario la rediseñe, esas notas dejan
// de entrar sin ningún error, y lo único que se nota es que el sitio
// tiene menos. Estas líneas ("::warning::") las muestra GitHub arriba de
// la corrida, donde se ve sin abrir el registro.
// W-10: si casi todas las fuentes fallaron, la corrida termina acá con error y la web queda como estaba (el vigilante avisa).
{
  const sana = ingestaSana(ultima.fuentes);
  if (!sana.ok && process.env.INGESTA_PERMITIR_VACIA !== '1') {
    console.log(`::error title=Ingesta casi vacía::${sana.motivo}`);
    process.exit(1);
  }
  for (const f of ultima.fuentes ?? []) {
    if (f.estado === 'error') console.log(`::warning title=Fuente caída::${f.nombre}: ${f.error}`);
    else if (f.notas === 0) console.log(`::warning title=Fuente vacía::${f.nombre} no trajo ninguna nota`);
  }
}

// Cuándo vimos cada nota por primera vez.
//
// Las fuentes que no publican la hora obligaban a mostrar "sin hora", que
// se lee como un error nuestro. Sabemos algo honesto y útil: cuándo la
// vimos aparecer. La ingesta no sirve para eso —a una nota sin fecha le
// pone la hora de ahora, así que se mueve en cada corrida—, pero la
// portada anterior está versionada en el repositorio y corre tanto acá
// como en GitHub Actions. De ahí sale el primer avistaje, y no se pisa.
const anterior = leerJson(SALIDA, { notas: [] });
// El archivo también guarda el primer avistaje: una nota que salió de la
// portada y vuelve no cambia de hora.
const archivoAnterior = leerJsonEstricto(ARCHIVO, { notas: [] });
// Las fechas que el cruce envejeció por error (regla 194, lib/archivo.js): una nota automática que figura con una fecha de más
// de dos días antes de la primera vez que la vimos no se pudo haber estrenado así; envejeció después, cuando el cruce le pegó una
// nota vieja de otro hecho (el Concejo Estudiantil del 14/10 figuraba del 30/04). Pasa a la primera vez que la vimos, una sola
// vez: con eso ya no cumple la condición y no se vuelve a tocar.
{
  let corregidas = 0;
  for (const lista of [archivoAnterior.notas ?? [], anterior.notas ?? []]) {
    for (let i = 0; i < lista.length; i += 1) {
      const c = conFechaSinError(lista[i]);
      if (c !== lista[i]) { lista[i] = c; corregidas += 1; }
    }
  }
  if (corregidas) console.log(`  fechas que el cruce había envejecido por error (regla 194): ${corregidas} corregidas a la primera vez que se vieron`);
}
const vistoAntes = Object.fromEntries([...(archivoAnterior.notas ?? []), ...(anterior.notas ?? [])]
  .filter((n) => n.visto)
  .map((n) => [n.id, n.visto]));
// La fecha con la que ya salió cada nota: una nota no rejuvenece cuando el
// medio actualiza la suya (fechaDeLaNota, lib/archivo.js).
const fechaAntes = Object.fromEntries([...(archivoAnterior.notas ?? []), ...(anterior.notas ?? [])]
  .filter((n) => n.fecha && !n.sinFecha)
  .map((n) => [n.id, n.fecha]));
// La sección con la que ya salió cada nota (regla 314, S4): la de la portada anterior manda sobre la del archivo.
const seccionConLaQueSalio = Object.fromEntries([...(archivoAnterior.notas ?? []), ...(anterior.notas ?? [])]
  .filter((n) => n.id && n.seccion)
  .map((n) => [n.id, n.seccion]));
// Lo que ya salió alguna vez (la portada anterior y el archivo): sólo eso puede
// seguir en las listas con el hecho de más de HORAS_PARA_ESTRENAR (llegaTarde,
// lib/archivo.js).
const yaSalieron = new Set([...(archivoAnterior.notas ?? []), ...(anterior.notas ?? [])].map((n) => n.id));
const ahoraISO = new Date().toISOString();
// Desde cuándo es muy contada cada nota (regla 197): va primera en su sección MUY_CONTADA.horasPrimeraEnSuSeccion
// horas desde ese momento (web/lib/datos.js), y esa hora no se mueve en cada corrida.
const muyContadaDesde = new Map([...(archivoAnterior.notas ?? []), ...(anterior.notas ?? [])]
  .filter((n) => n.muyContada?.desde).map((n) => [n.id, n.muyContada.desde]));

// Las uniones firmes (regla 175, hueco 4): una nota que ya se unió a otra (fusionadas.json) no vuelve a tener página propia ni se
// vuelve a escribir con IA aunque en esta corrida las dos ya no "se reconozcan" (la VTV del 15/10 volvió a la portada y se escribió
// 4 veces). Se deshace si una persona la aprueba después de la unión, o borrando su renglón de web/data/fusionadas.json.
const UNIDAS_FIRMES = (() => {
  const humanasAlEmpezar = Object.entries(estado.decisiones ?? {}).filter(([, d]) => decisionHumana(d));
  return unionesFirmes(FUSIONADAS_ANTES, {
    conPagina: yaSalieron,
    retiradasPorPersona: new Set([...RETIRADAS_A_MANO, ...humanasAlEmpezar.filter(([, d]) => d.estado === 'bloqueada' || d.estado === 'descartada').map(([id]) => id)]),
    aprobadas: new Map(humanasAlEmpezar.filter(([, d]) => d.estado === 'publicada').map(([id, d]) => [id, d.cuando ?? null])),
    enRedes: new Set([...idsEnRedes(leerJson(LIBRO_REDES, {})), ...[...(archivoAnterior.notas ?? []), ...(anterior.notas ?? [])].filter((n) => n.redes).map((n) => n.id)]),
  });
})();
if (UNIDAS_FIRMES.size) console.log(`  uniones firmes (fusionadas.json): ${UNIDAS_FIRMES.size}`);

// La primera vez que vimos cada nota (VISTAS). Se anota antes de decidir nada.
const vistasAntes = leerJson(VISTAS, {});
const vistas = {};
{
  const limite = Date.now() - DIAS_DE_VISTAS * 864e5;
  for (const [id, cuando] of Object.entries(vistasAntes)) if (new Date(cuando).getTime() >= limite) vistas[id] = cuando;
  for (const n of ultima.notas ?? []) if (!vistas[n.id]) vistas[n.id] = vistoAntes[n.id] ?? ahoraISO;
  // Un id por renglón: el diff de cada corrida queda chico y legible.
  const texto = `${JSON.stringify(vistas).replace(/,"/g, ',\n"')}\n`;
  if (!fs.existsSync(VISTAS) || fs.readFileSync(VISTAS, 'utf8') !== texto) fs.writeFileSync(VISTAS, texto, 'utf8');
}

/**
 * La fecha de una nota, una sola regla para todo (28/09): si la fuente no dio
 * hora, la primera vez que la vimos; si la dio, la más vieja que se conoce
 * (sus fuentes, la ya publicada, la primera vez que la vimos) y, desde la regla 314, para lo muy
 * contado y lo de acá, la mediana de sus fuentes en vez de la más vieja. Es la que se
 * muestra, la que ordena y la que decide si llega tarde (llegaTarde).
 */
const primeraVista = (n) => vistoAntes[n.id] ?? vistas[n.id];
// Regla 194: las fuentes de más de HORAS_DE_UN_HECHO antes de la primera vez que la vimos (notas viejas de otro hecho que el
// cruce pegó) no la envejecen. La fecha ya publicada sigue mandando (fechaAntes, corregida arriba si era un error).
const fechaReal = (n) => (n.cuando === 'sin fecha en la fuente'
  ? (primeraVista(n) ?? ahoraISO)
  // Regla 314: lo muy contado y lo de acá toman la mediana de sus fuentes, no la más vieja (ingesta/fecha-del-hecho.mjs; FECHA_DEL_HECHO="vieja" vuelve a lo de antes).
  : fechaDeLaNota(n, {
    fechaAnterior: fechaAntes[n.id], visto: primeraVista(n), horas: HORAS_DE_UN_HECHO, medios: contarMedios(n.medios), deAca: esDeAca(n),
  }));

// La lectura con IA (plan V2.2, ingesta/lectura-ia.mjs). Desde el 27/09 DECIDE
// (Hernán: sin prueba, se corrige en vivo): una IA lee cada nota nueva con el
// perfil de Balcarce y su ficha saca lo que no es para Radar, corrige la
// sección y dice qué es de Balcarce. El semáforo sigue mandando: la IA nunca
// destraba nada. Sin ficha (o si falla), queda lo de siempre. Va antes de la
// reescritura para no gastar cuota en lo que no va a salir.
let sacadasPorLaIA = new Set();
let motivosDeLaIA = new Map();
let repetidasFuera = new Set();
// Con cuál quedó cada una de las que juntó la lectura (id → id de la que queda): sólo para la estadística de la selección (regla 314).
let repetidasCon = new Map();
// Las parejas de notas que la IA confirmó que cuentan el mismo hecho con otras palabras (1/10): [[idA, idB], …]. Se
// preguntan más abajo, con los títulos ya escritos; acá van las que se confirmaron antes (fichas.json).
const confirmadasDe = (pares = {}) => Object.entries(pares).filter(([, v]) => v).map(([k]) => k.split('|'));
// Más las de significado (regla 195): cada nueva con UNA sola ancla, la que ya estaba primero ([ancla, nueva]).
const confirmadasDeLasFichas = (rep = {}) => [...confirmadasDe(rep.pares), ...anclasConfirmadas(rep.significado)];
let parejasConfirmadas = confirmadasDeLasFichas(leerJson(FICHAS, {}).repetidas);
// Las [ancla, nueva] de significado: en la unión, la nueva nunca es la que queda (como las de la regla 171).
let anclasDeSignificado = anclasConfirmadas(leerJson(FICHAS, {}).repetidas?.significado);
{
  try {
    const {
      leerNotasNuevas, aplicarFichas, comoFichasJson, agruparRepetidas, quitarRepetidas, unirGrupos, candidatasParaAgrupar, ordenParaLeer, LECTURA,
      cupoDelMomento,
    } = await import('../../ingesta/lectura-ia.mjs');
    const { claveClasificacion } = await import('../../reels/claves.mjs');
    const { aplicarPopularidad, MOTIVO_POCO_CONTADA } = await import('../../ingesta/ingesta.mjs');
    const fichasAntes = leerJson(FICHAS, {});
    // Lo de un medio de acá se lee primero (regla 198): si el cupo diario de la lectura se acaba, lo que espera a la IA
    // (MOTIVO_ESPERA_LECTURA) es lo de acá, y lo de acá entra todo. Lo demás, por puntaje.
    // Regla 314 (S6): después lo que ya llega a los medios que pide su sección, al final lo que sólo podría salir con otra sección o juntándose
    // con otra, y lo que no puede salir por cantidad de ninguna manera no se lee (ordenParaLeer, ingesta/lectura-ia.mjs).
    const { paraLeer: primeroLoDeAca, sinLeer } = ordenParaLeer(ultima.notas ?? []);
    if (sinLeer.length) console.log(`  lectura con IA: ${sinLeer.length} historias no se leen (no llegan ni a los medios de un área chica)`);
    const { archivo: fichas, cuenta } = await leerNotasNuevas(primeroLoDeAca, { guardado: fichasAntes, registro: console.log });
    if (cuenta.sinClave) console.log('  lectura con IA: sin clave, se decide como siempre');
    const { notas: conFichas, cambios } = aplicarFichas(ultima.notas ?? [], fichas.fichas, {
      // Lo de un medio de acá que no nombra nada de acá espera a la IA, si la
      // lectura anda (28/09, la de Suiza en Balcarce).
      esperarSinFicha: !cuenta.sinClave,
      yaPublicadas: yaSalieron,
    });
    sacadasPorLaIA = new Set(cambios.sacadas.map((c) => c.id));
    motivosDeLaIA = new Map(cambios.sacadas.map((c) => [c.id, c.motivo]));

    // Las repetidas: la misma noticia contada con otro título (27/09, McCain).
    // Se pide sólo si cambió lo que hay para publicar, con tope por día.
    // Sólo lo que va a salir: con las 270 notas de la ingesta (ruido incluido)
    // la IA no vio las tres de McCain; con las publicables, sí (27/09).
    // Y aparte, lo de afuera que espera por tener pocos medios: si otro medio
    // cuenta lo mismo, al juntarlas llega a los que pide su sección y puede
    // salir. Antes quedaba frenado antes de poder juntarse, y lo nacional
    // desaparecía (27/09). Van en dos pedidos: con todo junto la IA ve peor.
    const candidatas = candidatasParaAgrupar(conFichas);
    const deUnMedio = conFichas.filter((n) => n.semaforo === 'amarillo' && String(n.motivo ?? '').startsWith(MOTIVO_POCO_CONTADA));
    const claveDeLaLista = [...candidatas, ...deUnMedio].map((n) => n.id).sort().join(',');
    const hoy = fichas.dia;
    // Los grupos se conservan de un día al otro (mientras sus notas sigan en la
    // ingesta); sólo el contador de pedidos vuelve a cero.
    const rep = fichas.repetidas?.dia === hoy ? fichas.repetidas : {
      dia: hoy, pedidosHoy: 0, grupos: fichas.repetidas?.grupos ?? [], pares: fichas.repetidas?.pares ?? {},
      // Las parejas por significado (regla 195) también se conservan de un día al otro; se podan con las notas del pool.
      ...(fichas.repetidas?.significado ? { significado: fichas.repetidas.significado } : {}),
    };
    const clave = claveClasificacion();
    // El tope del día, repartido por hora (regla 196, cupoDelMomento): nunca se gasta todo antes de la noche. Si la lista trae
    // algo de acá que la vuelta anterior no vio, puede adelantarse un poco.
    const vistasAntes = new Set(String(rep.lista ?? '').split(','));
    const hayAlgoDeAcaNuevo = candidatas.some((n) => !vistasAntes.has(n.id) && (n.local || n.deLaZona || n.alcance === 'local'));
    const hayCupo = cupoDelMomento({ usados: rep.pedidosHoy, tope: LECTURA.pedidosRepetidasPorDia, prioridad: hayAlgoDeAcaNuevo });
    if (clave && rep.lista !== claveDeLaLista && hayCupo && candidatas.length > 1) {
      rep.pedidosHoy += 1;
      try {
        const nuevos = await agruparRepetidas(candidatas, { clave });
        const deAfuera = deUnMedio.length > 1 ? await agruparRepetidas(deUnMedio, { clave }) : [];
        // Regla 322: cada grupo se parte en los pedazos que comparten el hecho principal (ingesta/hecho-principal.mjs).
        rep.grupos = unirGrupos(rep.grupos, [...nuevos, ...deAfuera], new Set((ultima.notas ?? []).map((n) => n.id)), { notas: ultima.notas ?? [] });
        rep.lista = claveDeLaLista;
      } catch (e) {
        console.log(`  repetidas: falló el pedido (${e.message}); quedan los grupos de antes`);
      }
    }
    fichas.repetidas = rep;
    // Queda la que ya está publicada (en la portada anterior o en el archivo): si no, desaparece de la
    // portada y queda una que todavía espera cuerpo (27/09, la de YPF y la de
    // la maestra china).
    // Regla 314 (S3): todas las que tienen página, no sólo las que siguen dentro de las horas de la portada (la fecha de una historia es la
    // de su fuente más vieja y una ya publicada salía del grupo a las pocas horas, dejando como sobreviviente a una sin cuerpo o «tarde»).
    const yaPublicadas = idsQueYaTienenPagina({ anterior: anterior.notas ?? [], archivo: archivoAnterior.notas ?? [] });
    // Regla 322: también los grupos guardados de antes (fichas.json) pasan por la guarda del hecho principal.
    const { notas, repetidas } = quitarRepetidas(conFichas, rep.grupos, { publicadas: yaPublicadas, guardaDeHecho: true });
    repetidasFuera = new Set(repetidas.map((r) => r.id));
    repetidasCon = new Map(repetidas.map((r) => [r.id, r.queda]));
    // Con los medios de las repetidas sumados, una nota de afuera puede llegar
    // a los que pide su sección, y con la sección que corrigió la IA el mínimo
    // puede ser otro: la regla se vuelve a mirar, en los dos sentidos. Lo que
    // la IA dijo que no es de acá también la cumple.
    // La popularidad (reglas 215 y 260): sin cupo. Lo ya publicado no se baja por cantidad (si se sube el mínimo, una nota que salió
    // con 2 medios no desaparece de las listas) y lo muy contado (regla 197) va primero en su sección.
    aplicarPopularidad(notas.sort((a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0)), { publicadas: yaSalieron, fecha: fechaReal });
    ultima = { ...ultima, notas };
    console.log(`  lectura con IA: ${cuenta.nuevas} fichas nuevas en ${cuenta.pedidos} pedidos (${fichas.pedidosHoy ?? 0} hoy${cuenta.groq ? `, ${cuenta.groq} con Groq de respaldo` : ''})`
      + ` · sacó ${cambios.sacadas.length}, ${cambios.dejanDeSerLocales.length} dejaron de ser de Balcarce,`
      + ` ${cambios.otraSeccion.length} cambiaron de sección, ${cambios.aEsperar.length} a esperar, ${repetidas.length} repetidas`
      + (cambios.seccionContradicha?.length ? ` · ${cambios.seccionContradicha.length} con la sección de las palabras porque la ficha decía Policiales sin nada policial (regla 322)` : ''));
    for (const r of repetidas.slice(0, 10)) console.log(`    repetida: ${r.titulo}`);
    for (const c of cambios.sacadas.slice(0, 15)) console.log(`    fuera (${c.motivo}): ${c.titulo}`);
    const texto = comoFichasJson(fichas);
    if (!fs.existsSync(FICHAS) || fs.readFileSync(FICHAS, 'utf8') !== texto) fs.writeFileSync(FICHAS, texto, 'utf8');
  } catch (e) {
    console.log(`  lectura con IA: no se pudo (${e.message}); se decide como siempre`);
  }
}

// Reescritura automática, sin que nadie la mire. Es el único lugar que la hace.
//
// `previas` es lo que ya se reescribió en una corrida anterior (la portada
// de la vez pasada y, desde el 25/09, el archivo): así no se le vuelve a
// pedir a Gemini la misma nota en cada corrida de acá a que alguien la
// revise. Lo de la portada va último para que mande si están en los dos.
//
// Si no estaba hecha, no se reescribe una nota que ya salió de las listas (más
// de HORAS_EN_PORTADA): sería gastar cuota en una nota que nadie va a ver.
let reescritas = {};
const intentosAntes = leerJson(INTENTOS_IA, null);
const intentos = podarIntentos(intentosAntes ?? {});
// Cómo estaban al empezar, ya podados: al final se escriben sólo si cambiaron.
const intentosAlEmpezar = JSON.stringify(intentos);
{
  const previas = previasDeLaPortada([...(archivoAnterior.notas ?? []), ...(anterior.notas ?? [])]);
  // Lo que ya tiene el cuerpo escrito en correcciones.json no se le pide a
  // Gemini: sería gastar cupo en algo que después no se usa (27/09).
  const paraReescribir = (ultima.notas ?? [])
    .filter((n) => !CORRECCIONES.get(n.id)?.cuerpo)
    // Lo que ya se unió a otra nota no se escribe otra vez (regla 175): no va a salir con su dirección.
    .filter((n) => !UNIDAS_FIRMES.has(n.id))
    .filter((n) => {
      if (previas[n.id]) return true;
      const fecha = fechaReal(n);
      // Lo que ya no se va a estrenar (hecho de más de HORAS_PARA_ESTRENAR,
      // nunca salió) tampoco: no va a salir (28/09).
      return vigenteEnPortada({ fecha }) && (yaSalieron.has(n.id) || !llegaTarde(fecha, Date.now(), horasDeEstreno(n)));
    });
  // El archivo va también como fuente de ANTECEDENTES: lo que el sitio ya
  // publicó sobre el mismo tema en los últimos 30 días (CRITERIO-EDITORIAL.md).
  reescritas = await reescribirAutomaticas(paraReescribir, {
    previas, decisiones: estado.decisiones, retiradas: RETIRADAS_A_MANO, archivo: archivoAnterior.notas ?? [], intentos,
  });
  const nuevas = Object.keys(reescritas).filter((id) => !previas[id]).length;
  if (nuevas) console.log(`  ${nuevas} notas reescritas con IA en esta corrida`);
}

// Los lunes, la lista de retiradas pierde las de más de una semana
// (lib/archivo.js, podarRetiradas). Una vez por semana y no en cada corrida:
// así el archivo cambia sólo ese día y no choca con lo que se cargue a mano.
if (diaSemanaAR() === 1) {
  const ruta = path.join(AQUI, '..', 'data', 'retiradas.json');
  const { json, quitadas } = podarRetiradas(leerJson(ruta, null), {
    hoy: diaAR(), enLaIngesta: new Set((ultima.notas ?? []).map((n) => n.id)),
    // Una retirada que sigue aprobada en las decisiones no se poda: sin la lista la nota volvería (C-14).
    conAprobacion: new Set(Object.entries(estado.decisiones ?? {})
      .filter(([, d]) => decisionHumana(d) && (d.estado === 'publicada' || d.estado === 'automatica')).map(([id]) => id)),
  });
  if (quitadas.length) {
    fs.writeFileSync(ruta, comoRetiradasJson(json), 'utf8');
    console.log(`  retiradas: ${quitadas.length} de más de una semana, fuera de la lista`);
  }
}

// Se escribe siempre que falte (el workflow lo suma con `git add`) o cambie.
const intentosFinal = podarIntentos(intentos);
if (!intentosAntes || JSON.stringify(intentosFinal) !== intentosAlEmpezar) {
  fs.writeFileSync(INTENTOS_IA, `${JSON.stringify(intentosFinal, null, 1)}\n`, 'utf8');
}

// La dirección de cada nota se fija la primera vez que sale y no cambia más,
// aunque después la IA o una persona le cambien el titular (lib/ruta.js).
const libroRedes = leerJson(LIBRO_REDES, {});
const direcciones = slugsConocidos({
  archivo: archivoAnterior.notas ?? [], anterior: anterior.notas ?? [], libro: libroRedes,
});

// Las notas automáticas que no se publican porque no tienen cuerpo (regla del
// 25/09, web/lib/cuerpo.js). Sólo las que irían a las listas: el vigilante
// las cuenta en el resumen de las 21.
const esperandoCuerpo = [];
// Las que agotaron todos sus intentos (regla 299): ya no esperan, se descartan con el motivo del último intento. Se anotan aparte en
// esperando-cuerpo.json (`descartadas`) para que se vea qué pasó; si más tarde la cuentan más medios y tiene más intentos, vuelve a esperar sola.
const descartadasSinCuerpo = [];

/** ¿El título o la bajada son de lo que no se publica nunca (REGLAS_SEMAFORO.nunca)? */
const nuncaSePublica = (nota) => esDeLoQueNuncaSePublica(nota, REGLAS_SEMAFORO.nunca);

/**
 * Una nota que el semáforo puso en ROJO (un menor, una víctima) no sale con el texto que la puso en rojo, ni aunque una persona la
 * apruebe (C-10, 8/10/2026: "se rompe la regla de no identificar a un menor o a una víctima por un clic equivocado"). Si la persona
 * la reescribió y el texto final ya no toca la lista roja, sí puede salir: lo que se mira es lo que se va a publicar.
 */
const sigueRoja = (original, final) => original?.semaforo === 'rojo'
  && semaforoDelTexto([final?.titulo, final?.copete, final?.cuerpo].filter(Boolean).join('\n'))?.color === 'rojo';

// Mismo criterio que el panel: sin decisión manda el semáforo (verde =
// automática, rojo = bloqueada, el resto pendiente). Sólo lo publicado o
// automático llega a la web.
function notaPublicada(n) {
  if (RETIRADAS_A_MANO.has(n.id)) return null;
  // Unida a otra en una corrida anterior (regla 175): esa noticia ya tiene su nota; ésta redirige a ella.
  if (UNIDAS_FIRMES.has(n.id)) return null;
  const d = estado.decisiones[n.id];
  // Sólo manda lo que decidió una persona. Lo que guardó la máquina es una
  // foto de un semáforo viejo: ver decisionHumana en ingesta/utiles.mjs.
  const delSemaforo = { verde: 'automatica', rojo: 'bloqueada' }[n.semaforo] ?? 'pendiente';
  const humana = decisionHumana(d);
  const st = humana ? d.estado : delSemaforo;
  if (st !== 'publicada' && st !== 'automatica') return null;
  // La fecha de la nota, una sola vez: decide si llega tarde y es la que sale.
  const fecha = fechaReal(n);
  // Una nota que nunca salió no se estrena con el hecho de más de
  // HORAS_PARA_ESTRENAR (llegaTarde, lib/archivo.js). Lo que publicó una
  // persona se respeta. Sin excepción para las notas sin hora: se cuentan desde
  // la primera vez que las vimos (fechaReal).
  if (!humana && !yaSalieron.has(n.id) && llegaTarde(fecha, Date.now(), horasDeEstreno(n))) return null;
  // Lo que decidió una persona manda. Si no, lo que ya reescribió la IA sola
  // en esta corrida o en una anterior. Si ninguna de las dos cosas pasó,
  // queda el resumen mecánico de la fuente, como salía antes de todo esto.
  // Que `guion` tenga algo es justamente la señal que usa <Firma> para decir
  // "esto lo redactó una IA": no hace falta un campo aparte para lo mismo.
  const auto = reescritas[n.id];
  // De dónde sale el texto: lo de una persona manda siempre. Una decisión "de la
  // máquina", sólo si tiene cuerpo de verdad; si no, lo que se reescribió acá.
  // Antes un cuerpo vacío guardado en una decisión tapaba uno bueno escrito acá.
  const deLaDecision = humana || tieneCuerpo(d) || !auto ? d : undefined;
  // Si ni la IA ni una persona completaron "fuentesConsultadas" (una nota sin
  // reescribir, o corregida a mano sólo en título/copete/sección/cuerpo), se
  // arma con los enlaces reales que ya trae el cruce: sin esto, el lector
  // veía el link sólo en la primera fuente y el resto de los medios sin
  // enlace (27/09, Hernán: "sólo tiene link la primera fuente").
  const extras = extrasParaLaWeb(deLaDecision, auto);
  if (!extras.fuentesConsultadas?.length) {
    const armadas = fuentesConsultadasDeOrigenes(n);
    if (armadas.length) extras.fuentesConsultadas = armadas;
  }
  // Con su dirección fijada: la que ya tenía, o la del titular de hoy si es
  // la primera vez que sale.
  const nota = fijarSlug({
    id: n.id,
    // Los arreglos mecánicos del título (lib/titulos.js): sin "en Balcarce" al
    // final, sin una etiqueta conocida adelante ("Rugby: …") y sin una coma o un
    // conector colgando al final. Lo que escribió una
    // persona se respeta tal cual.
    titulo: humana ? (deLaDecision?.titulo ?? n.titulo) : tituloAutomatico(deLaDecision?.titulo ?? auto?.titulo ?? n.titulo),
    copete: deLaDecision?.copete ?? auto?.copete ?? n.resumenFuente ?? '',
    // Sólo existe cuando la reescribió la IA (o lo cargó una persona a
    // mano): el resumen mecánico de la fuente no tiene de dónde sacar un
    // cuerpo propio, así que la nota queda con el copete nada más, como
    // siempre — ver CRITERIO-EDITORIAL.md.
    cuerpo: deLaDecision?.cuerpo ?? auto?.cuerpo ?? null,
    guion: humana ? (deLaDecision?.guion ?? null) : (tituloAutomatico(deLaDecision?.guion ?? auto?.guion ?? '') || null),
    // Regla 314 (S4): una nota ya publicada no salta entre Política y Policiales de una vuelta a otra (la ficha de la IA, las palabras del título y
    // cuál es la principal de la historia no siempre dicen lo mismo). Lo que corrige una persona (conCorreccion, más abajo) sigue mandando.
    seccion: seccionSinSaltos(n.seccion, seccionConLaQueSalio[n.id]),
    // Si la IA o el clasificador la pasó a Educación, Salud o Ciencia (regla 211), la sección de antes: sirve para el hashtag de las redes
    // (#Balcarce si era de Balcarce, redes/elegir.mjs) y para saber de dónde vino.
    ...(n.seccionAntes ? { seccionAntes: n.seccionAntes } : {}),
    medios: n.medios,
    enlace: n.enlace,
    // La imagen de la fuente no se guarda en la nota (regla 311: el campo `teniaImagenLaFuente` no lo leía nadie). La foto que sí sale en
    // la página es la del banco de fotos (28/09, `foto`, más abajo: conFotosDelBanco), elegida sin marca de agua y con el crédito en la cita.
    // La hora para ordenar. Si la fuente no la publica, la ingesta pone la de
    // ahora en cada corrida: la nota saltaba arriba de todo una y otra vez. En
    // ese caso manda la primera vez que la vimos, que no cambia.
    // Con fecha: la más vieja que se conoce, nunca una más nueva que la ya
    // publicada (un medio que actualiza su nota no la trae de vuelta, 28/09).
    fecha,
    // Cuando la fuente no publica la hora, la ingesta pone la de ahora para
    // poder ordenar. Se guarda el aviso para que la web no mienta un
    // "hace 1 minuto" que no es cierto.
    sinFecha: n.cuando === 'sin fecha en la fuente',
    // La primera vez que la vimos. Sólo se usa cuando la fuente no dio
    // hora; para el resto manda la fecha del medio.
    visto: vistoAntes[n.id] ?? ahoraISO,
    relevancia: n.relevancia,
    local: n.local,
    // Una fuente oficial alcanza sola: la página la conserva aunque la cuente
    // un solo medio (tieneRespaldo, lib/cuerpo.js; 28/09).
    ...(n.oficial ? { oficial: true } : {}),
    // Lo de la zona sale con un solo medio (esDeAca) y también conserva la
    // página: sin esta marca, el archivo lo descartaba al dejar la portada.
    ...(n.deLaZona ? { deLaZona: true } : {}),
    // Lo que cuenta un organismo o un medio de Balcarce nombrando algo de acá sale con un solo medio aunque la IA diga
    // que el hecho es de la región, y también conserva la página (regla 180, esDeUnMedioDeAca y tieneRespaldo).
    ...(esDeUnMedioDeAca(n) ? { deUnMedioDeAca: true } : {}),
    // Lo de afuera que cuenta medio país (regla 197): va primera en su sección unas horas (web/lib/datos.js).
    ...(n.muyContada ? { muyContada: { medios: n.muyContada.medios, porque: n.muyContada.porque, desde: muyContadaDesde.get(n.id) ?? ahoraISO } } : {}),
    // Lo de acá que cuentan tres medios de Balcarce o más (regla 198): la primera candidata a la nota grande y a Facebook.
    ...((esDeAca(n) || esDeUnMedioDeAca(n)) && cuantosMediosDeAca(n) >= MUY_CONTADA.mediosDeAca ? { muyContadaDeAca: cuantosMediosDeAca(n) } : {}),
    publicadaPor: d?.por ?? null,
    publicadaCuando: d?.cuando ?? null,
    // Una persona la marcó desde el celular para que también vaya a Facebook e
    // Instagram (29/09): hasta Política y Policiales, que solas no van nunca
    // (redes/elegir.mjs). La fecha es la de ese visto bueno.
    ...(CELULAR.redes[n.id] ? { aprobadaParaRedes: CELULAR.redes[n.id].cuando } : {}),
    // Cómo llegó a publicarse: sola por el semáforo verde, o porque
    // alguien la miró y le dio el visto bueno. La nota lo dice al pie.
    // Que parte de lo que publicamos lo redacte una IA no es algo para
    // esconder en la letra chica: el día que alguien lo descubra por su
    // cuenta, va a parecer que lo escondíamos.
    // Los temas de larga duración que toca. En un pueblo las historias
    // duran meses: el que entra por una nota del autódromo tiene que
    // poder ver las otras once.
    temas: n.temas ?? [],
    como: st,
    // Las partes nuevas (25/09): claves, qué se sabe, qué falta confirmar,
    // fuentes consultadas, antecedentes, texto para redes, etiquetas y el
    // nivel de verificación. Sólo en lo reescrito desde ese día: lo de antes
    // se ve como se veía. Nunca se mezclan las de una persona con las de la
    // IA (extrasParaLaWeb en reels/reescritura.mjs).
    ...extras,
  }, direcciones);
  // Lo corregido a mano manda (web/data/correcciones.json), y va antes de
  // mirar el cuerpo: el cuerpo también se puede escribir ahí (27/09).
  const corregida = conCambiosDeLaAuditoria(conCorreccion(nota, CORRECCIONES), CAMBIOS_AUDITORIA);
  // Lo que no se publica nunca (las listas de sepelios), mirado en el texto
  // FINAL: el título de la fuente puede ser otro y el texto venir del panel,
  // escrito con una página que traía las necrológicas pegadas (27/09). Tampoco
  // lo que aprobó una persona (28/09): la regla es "no se publican nunca", y
  // una lista de sepelios con "falleció" llegaba al panel como amarilla.
  if (nuncaSePublica(corregida)) return null;
  if (sigueRoja(n, corregida)) return null;
  // SIN CUERPO NO SE PUBLICA (25/09): una nota automática sin cuerpo de
  // verdad (70 palabras o más, distinto de la bajada) queda "esperando
  // cuerpo" y no aparece en ninguna lista, ni en el feed, el sitemap o las
  // redes (todo sale de acá). Lo que publicó una persona se respeta.
  if (!humana && !tieneCuerpo(corregida)) {
    const hechos = intentos[n.id]?.intentos ?? 0;
    const agotada = hechos > 0 && hechos >= intentosMaximosPara((n.origenes ?? []).length) && intentos[n.id]?.motivo !== 'con cuerpo';
    if (vigenteEnPortada(corregida) && agotada) {
      descartadasSinCuerpo.push({
        id: n.id, titulo: corregida.titulo, seccion: corregida.seccion, fecha: corregida.fecha, intentos: hechos,
        motivo: `agotó los ${hechos} intentos; ${String(intentos[n.id]?.motivo ?? 'sin motivo').slice(0, 140)}`,
      });
    } else if (vigenteEnPortada(corregida)) {
      esperandoCuerpo.push({
        id: n.id, titulo: corregida.titulo, copete: corregida.copete, seccion: corregida.seccion, fecha: corregida.fecha,
        fuentes: (n.origenes ?? []).map((o) => ({ medio: o.medio, enlace: o.enlace, fecha: o.fecha ?? null })),
        // Cuántas veces la IA ya lo intentó (de MAXIMO_DE_INTENTOS): el celular
        // dice si todavía puede salir sola (29/09).
        intentos: intentos[n.id]?.intentos ?? 0,
        // Por qué el verificador rechazó el último intento (copia, relleno, un número que no coincide…): el celular lo explica (1/10).
        motivo: String(intentos[n.id]?.motivo ?? '').slice(0, 200),
        // Cuántos intentos tiene esta nota: una muy contada tiene más (criterio.mjs, REESCRITURA).
        maximo: intentosMaximosPara((n.origenes ?? []).length),
      });
    }
    return null;
  }
  return corregida;
}

// Lo que viene de las fuentes. Las notas propias se suman más abajo, después
// de saber qué salió del archivo.
let deLaIngesta = (ultima.notas ?? [])
  .map(notaPublicada)
  .filter(Boolean);

// ---------------------------------------------------------------- las fotos
//
// El banco de fotos, en vivo (28/09, CRITERIO-EDITORIAL.md, "Las fotos"):
// sólo para lo que viene de las fuentes (las notas propias
// no llevan foto de otro), y con memoria propia (web/data/banco-fotos.json)
// para no volver a preguntar por una nota ya probada. Si algo falla acá, la
// nota sigue publicándose igual, sin foto, como hasta ahora.
//
// Elegir fotos NUEVAS gasta cupo de IA; las que YA están en el banco se ponen
// siempre, aunque elegir falle (28/09).
// Las fotos que sumó una persona desde la pestaña Fotos del panel (2/10, web/scripts/foto-manual.mjs) mandan sobre las del
// banco: las anota sólo el workflow "Panel del celular" y así no chocan con esta corrida. Sólo si el archivo está en disco.
const FOTOS_MANUALES = path.join(AQUI, '..', 'data', 'fotos-manuales.json');
// "Un día como hoy" (14/10/2026): lo que dice el video de cada día; la nota sale cuando el video sale (lib/notas-propias.js).
const EFEMERIDES_PIEZAS = path.join(AQUI, '..', 'data', 'efemerides-piezas.json');
const fotosManuales = Object.fromEntries(Object.entries(leerJson(FOTOS_MANUALES, {}))
  .filter(([, f]) => f?.archivo && existeFoto(path.basename(f.archivo))));
// El banco tal como estaba AL EMPEZAR la corrida: de acá salen las horas de `ausenteDesde` que no deben moverse (regla 306, banco-sin-ruido.mjs).
const bancoGuardadoAlEmpezar = leerJson(BANCO_FOTOS, {});
let bancoDeFotos = { ...leerJson(BANCO_FOTOS, {}), ...fotosManuales };
// Las ilustraciones hechas con IA para notas sin foto (regla 182, web/scripts/ilustrar-notas.mjs): las anota sólo el workflow manual "Ilustrar
// notas sin foto", después de que una persona las miró; esta corrida nunca escribe ese archivo. Van con la prioridad MÁS BAJA (primero las
// ilustraciones, encima el banco y encima las manuales): si después aparece una foto real, gana. Quedan afuera del banco a propósito, así
// la búsqueda de fotos reales (elegirFotosNuevas) sigue probando esas notas y la poda no las toca. Sólo si el archivo está en disco.
const FOTOS_IA = path.join(AQUI, '..', 'data', 'fotos-ia.json');
const ilustracionesIA = Object.fromEntries(Object.entries(leerJson(FOTOS_IA, {}))
  .filter(([, f]) => f?.archivo && esIlustracionDeNota(f) && existeFoto(path.basename(f.archivo))));
const conIlustraciones = { ilustraciones: ilustracionesIA, ilustracionPermitida: (n) => ilustracionPermitida(n, { semaforo: semaforoDelTexto }) };
/** Una nota del archivo sin foto real (o con su ilustración) toma la ilustración que tenga, o la pierde si ya no puede llevarla. */
const conLaIlustracion = (n) => (n && (!n.foto || esIlustracionDeNota(n.foto)) ? conFotosDelBanco([{ ...n }], {}, conIlustraciones)[0] : n);
// La misma noticia contra lo YA publicado, sin IA (regla 171, ingesta/repetidas-publicadas.mjs): una nota que todavía
// no salió y cuenta lo mismo que otra de las últimas 72 horas (el Jardín 905 al día siguiente, la Liga en otra sección)
// se une a ésa como las parejas que confirma la IA: queda una y la otra redirige (más abajo, repetidasConOtraDireccion).
// Las retiradas (web/data/retiradas.json) también se comparan (M3, 15/10): el archivo ya no las trae, pero la ingesta sí
// mientras las fuentes las tengan. Si la mejor pareja de una nota nueva es una retirada, no se publica sola.
const retiradasParaComparar = (ultima.notas ?? []).filter((n) => RETIRADAS_A_MANO.has(n.id)).map((n) => ({
  id: n.id, titulo: n.titulo, copete: n.resumenFuente ?? '', fecha: fechaReal(n), seccion: n.seccion, local: !!n.local, deLaZona: !!n.deLaZona,
}));
// Desde el 15/10 (regla 175) también cuenta que dos notas citen la misma nota de otro medio (con las fuentes de hoy de la ingesta,
// `origenes`), aunque estén en otra sección o una sea de acá y la otra de afuera; y con esa señal sola se comparan también dos
// notas que ya salieron las dos (`entrePublicadas`: queda la que salió primero).
const origenesDeHoy = new Map((ultima.notas ?? []).map((n) => [n.id, n.origenes]));
const conOrigenes = (n) => (origenesDeHoy.get(n.id)?.length ? { ...n, origenes: origenesDeHoy.get(n.id) } : n);
const repetidasSinIA = parejasConLoPublicado(
  [...deLaIngesta.map(conOrigenes), ...(archivoAnterior.notas ?? []), ...retiradasParaComparar],
  { yaPublicadas: yaSalieron, retiradas: RETIRADAS_A_MANO, entrePublicadas: true },
);
const { conRetirada } = repetidasSinIA;
const parejasSinIA = [...repetidasSinIA.parejas, ...repetidasSinIA.entrePublicadas];
if (parejasSinIA.length) console.log(`  repetidas de lo ya publicado (sin IA): ${parejasSinIA.length} (${repetidasSinIA.entrePublicadas.length} entre dos ya publicadas)`);
if (conRetirada.length) {
  // No se publica sola: pasa a esperar a una persona (amarilla, como cualquier otra que espera en el celular).
  const esperan = new Map(conRetirada.map(([retirada, nueva]) => [nueva, retirada]));
  for (const n of ultima.notas ?? []) {
    if (!esperan.has(n.id) || n.semaforo === 'rojo') continue;
    n.semaforo = 'amarillo';
    n.motivo = `igual a una nota retirada (${esperan.get(n.id)})`;
  }
  for (const n of deLaIngesta.filter((x) => esperan.has(x.id))) console.log(`  espera a una persona (igual a una nota retirada, ${esperan.get(n.id)}): ${n.id}`);
  deLaIngesta = deLaIngesta.filter((n) => !esperan.has(n.id));
}
// Si dos notas son la misma noticia, la foto se busca en las fuentes de las dos (1/10).
sumarFuentesDeParejas(deLaIngesta, [...parejasConfirmadas, ...parejasSinIA]);
{
  try {
    const { elegirFotosNuevas } = await import('./fotos-notas.mjs');
    const { claveClasificacion, claveGroq } = await import('../../reels/claves.mjs');
    const bancoAntes = bancoDeFotos;
    const { banco, archivos, porExcepcion, cortadaPorCupo } = await elegirFotosNuevas(deLaIngesta, {
      banco: bancoAntes, clave: claveClasificacion(), claveRespaldo: claveGroq(),
    });
    if (cortadaPorCupo) console.log('  fotos: las IA de control están sin cupo (429): se cortó la búsqueda de esta vuelta; las notas sin foto se vuelven a probar con espera creciente y, mientras tanto, llevan la ilustración o la placa (regla 324)');
    const nuevas = Object.keys(banco).length - Object.keys(bancoAntes).length;
    if (nuevas) console.log(`  fotos: ${nuevas} notas nuevas probadas (${Object.keys(archivos).length} con foto)`);
    // El registro de las fotos con chicos que entraron por la excepción de la regla 186 (FOTOS_MENORES_OFICIALES): queda en el log de la
    // corrida y, para siempre, en la entrada del banco (`excepcion`). npm run auditar-fotos las lista.
    for (const x of porExcepcion ?? []) console.log(`  fotos: CON CHICOS por la excepción menorEnActividadOficial (regla 186): ${x.id} · ${x.fuente} · ${x.motivo} · "${x.titulo}"`);
    for (const [archivo, buffer] of Object.entries(archivos)) {
      const destino = path.join(FOTOS_NOTAS, path.basename(archivo));
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, buffer);
    }
    if (JSON.stringify(banco) !== JSON.stringify(bancoAntes)) {
      fs.mkdirSync(path.dirname(BANCO_FOTOS), { recursive: true });
      fs.writeFileSync(BANCO_FOTOS, `${JSON.stringify(banco, null, 1)}\n`, 'utf8');
    }
    bancoDeFotos = banco;
  } catch (e) {
    console.log(`  fotos: no se pudieron elegir nuevas (${e.message}); quedan las del banco`);
  }
}
conFotosDelBanco(deLaIngesta, bancoDeFotos, conIlustraciones);

// ------------------------------------------------------------- el archivo
//
// Todo lo publicado, aunque ya no esté en la portada, para que ningún enlace
// compartido quede roto (lib/archivo.js). Antes de sumar lo de hoy se mira
// lo ya archivado contra las decisiones de ahora:
//
//   · si una persona la bloqueó o la descartó, o el semáforo ahora la pone
//     en rojo o en amarillo (desde el 25/09 también mira el texto completo y
//     lo que escribió la IA), sale del archivo y su página deja de existir
//     hasta que una persona la apruebe;
//   · si una persona le corrigió el titular o el copete y la ingesta ya no
//     la trae, la corrección llega igual a la página.
const enIngesta = new Map((ultima.notas ?? []).map((n) => [n.id, n]));
// Lo que la IA sacó en esta corrida tampoco conserva su página.
// Una repetida que ya fue a las redes conserva su página: su enlace circula.
const enLasRedes = idsEnRedes(leerJson(LIBRO_REDES, {}));
const retiradas = new Set([...RETIRADAS_A_MANO, ...sacadasPorLaIA, ...[...repetidasFuera].filter((id) => !enLasRedes.has(id))]);
const corregidas = [];
for (const a of archivoAnterior.notas ?? []) {
  const d = estado.decisiones[a.id];
  if (decisionHumana(d)) {
    if (d.estado !== 'publicada' && d.estado !== 'automatica') retiradas.add(a.id);
    else if (!enIngesta.has(a.id)) {
      // La corrección hecha DESPUÉS de aprobar va al final: si no, el texto de la aprobación la pisaba a los 3 días (C-14, 8/10/2026) y,
      // si había sacado un nombre, el nombre volvía.
      corregidas.push(conCorreccion({
        ...sinExtras(a),
        ...extrasParaLaWeb(d, a),
        titulo: d.titulo ?? a.titulo, copete: d.copete ?? a.copete, cuerpo: d.cuerpo ?? a.cuerpo, guion: d.guion ?? a.guion,
      }, CORRECCIONES));
    }
  } else if (pierdeLaPagina(enIngesta.get(a.id), {
    // La cotización del dólar no es sensible: sale de las listas (está en
    // /dolar) pero su página queda, por si el enlace ya circula. Lo de afuera
    // que hoy espera sólo por el cupo o por los medios que la cuentan, tampoco
    // (28/09): no es por lo que dice, y el enlace ya circula.
    conserva: (n) => n.motivo === MOTIVO_COTIZACION || esperaSoloPorCantidad(n),
  })) {
    retiradas.add(a.id);
  }
  // Lo que no se publica nunca (las listas de sepelios) no conserva la página,
  // aunque la haya aprobado una persona (28/09).
  if (nuncaSePublica(conCorreccion(a, CORRECCIONES))) retiradas.add(a.id);
  // Una efeméride de otro medio ya archivada tampoco conserva la página (15/10: la de Radio Gabal del 14/10 salió antes de la regla 164).
  if (!a.propia && esEfemerideAjena(a)) retiradas.add(a.id);
  if (sigueRoja(enIngesta.get(a.id), conCorreccion(a, CORRECCIONES))) retiradas.add(a.id);
  // Una página vieja que promete una cobertura "EN VIVO" o "minuto a minuto" en
  // el título (el texto de otro medio, de antes de la regla): Radar Balcarce no
  // hace coberturas en vivo (29/09; "música en vivo" sí).
  if (!decisionHumana(d) && diceEnVivo(conCorreccion(a, CORRECCIONES).titulo)) retiradas.add(a.id);
}
// ------------------------------------------------------ las notas propias
//
// La del dólar (una por día hábil, desde las 11) y la de cada podcast que
// salió en las redes (lib/notas-propias.js). Texto armado con plantilla a
// partir de datos que tenemos: los números de DolarApi y lo que esas notas
// ya publicaron. Sin IA.
//
// La cotización se guarda en dolar-historia.json (una por día hábil).
const historiaAntes = leerJson(HISTORIA_DOLAR, null);
let historiaDolar = historiaAntes ?? { dias: [] };
{
  const toca = cuandoArmarDolar({ historia: historiaDolar });
  if (toca.armar) {
    const datos = await traerDolar();
    const entrada = datos?.fuente === 'dolarapi' ? entradaDelDia(datos, { consultado: new Date(datos.consultado) }) : null;
    if (entrada) {
      historiaDolar = sumarAlHistorial(historiaDolar, entrada);
      console.log(`  dólar: se guardó la cotización de hoy (oficial ${entrada.cotizaciones.oficial.venta}, blue ${entrada.cotizaciones.blue.venta})`);
    } else {
      console.log('  dólar: DolarApi todavía no tiene la cotización de hoy (o es feriado): se vuelve a probar en la próxima corrida');
    }
  }
}
// Se escribe siempre que falte: el workflow lo suma con `git add`.
if (!historiaAntes || JSON.stringify(historiaDolar) !== JSON.stringify(historiaAntes)) {
  fs.writeFileSync(HISTORIA_DOLAR, comoHistoriaJson(historiaDolar), 'utf8');
}

// El clima del día (8/10, lib/notas-propias.js): una nota por día, a las 7:30 o después, con el pronóstico de lo que ya trae la portada; queda
// congelada en clima-historia.json (como el dólar).
const climaAntes = leerJson(HISTORIA_CLIMA, null);
let historiaClima = climaAntes ?? { dias: [] };
{
  const toca = cuandoArmarClima({ historia: historiaClima, clima: ultima.clima ?? null });
  if (toca.armar) {
    const entrada = entradaDelClima(ultima.clima, { consultado: new Date() });
    if (entrada) {
      historiaClima = sumarClimaAlHistorial(historiaClima, entrada);
      console.log(`  clima: se guardó el pronóstico de hoy (${entrada.hoy.min}° a ${entrada.hoy.max}°)`);
    }
  }
}
if (!climaAntes || JSON.stringify(historiaClima) !== JSON.stringify(climaAntes)) {
  fs.writeFileSync(HISTORIA_CLIMA, comoClimaJson(historiaClima), 'utf8');
}

// La Fórmula 1 (ingesta/f1.mjs): horarios en hora argentina los días del Gran Premio y el resultado
// al terminar. Se consulta Jolpica; si la API falla queda lo último guardado.
const f1Antes = leerJson(F1_JSON, null);
let f1Datos = f1Antes;
{
  try { f1Datos = await traerF1({ antes: f1Antes }); } catch (e) { console.log(`  F1: no se pudo consultar (${e.message}); queda lo guardado`); }
}
let notasF1 = [];
try {
  const { notas, fechas } = notasDeF1(f1Datos ?? {});
  notasF1 = notas;
  if (f1Datos) f1Datos = { ...f1Datos, notas: fechas };
} catch (e) { console.log(`  F1: no se pudo armar la nota (${e.message})`); }
if (f1Datos && JSON.stringify(f1Datos) !== JSON.stringify(f1Antes)) fs.writeFileSync(F1_JSON, comoF1Json(f1Datos), 'utf8');

// El fútbol (ingesta/futbol.mjs): los partidos de cada fecha con horarios, los resultados y las tablas. Se consulta ESPN; si falla, queda lo
// último guardado. Sin IA: sólo datos, con la fuente citada.
const futbolAntes = leerJson(FUTBOL_JSON, null);
let futbolDatos = futbolAntes;
{
  try { futbolDatos = await traerFutbol({ antes: futbolAntes }); } catch (e) { console.log(`  Fútbol: no se pudo consultar (${e.message}); queda lo guardado`); }
}
let notasFutbol = [];
try {
  const { notas, fechas } = notasDeFutbol(futbolDatos ?? {});
  notasFutbol = notas;
  if (futbolDatos) futbolDatos = { ...futbolDatos, notas: fechas };
} catch (e) { console.log(`  Fútbol: no se pudo armar la nota (${e.message})`); }
if (futbolDatos && JSON.stringify(futbolDatos) !== JSON.stringify(futbolAntes)) fs.writeFileSync(FUTBOL_JSON, comoFutbolJson(futbolDatos), 'utf8');

// Las notas con página, para contar cada podcast: lo de esta corrida y el
// archivo, sin lo que se acaba de retirar. Un repaso que ya no se puede armar
// (una de sus notas se retiró) también se retira.
const conPagina = new Map([
  ...(archivoAnterior.notas ?? []).filter((a) => !retiradas.has(a.id)),
  ...deLaIngesta,
].map((n) => [n.id, n]));
const { notas: repasos, noSeArman } = notasDeRepasos(libroRedes, conPagina, { catalogo: TEMAS });
for (const id of noSeArman) retiradas.add(id);
// La regla de cuerpo vale también para lo propio (lib/cuerpo.js).
const propias = [...notasDelDolar(historiaDolar), ...notasDelClima(historiaClima, libroRedes), ...notasDeEfemerides(leerJson(EFEMERIDES_PIEZAS, {}), libroRedes), ...notasF1, ...notasFutbol, ...notasDePistas(leerJson(NOTAS_DE_PISTAS, null)), ...repasos]
  .map((n) => fijarSlug(n, direcciones))
  .filter((n) => tieneCuerpo(n));
if (propias.length) console.log(`  notas propias: ${propias.map((n) => n.id).join(', ')}`);
// La nota de cada repaso lleva un collage con las fotos de las notas que cuenta (1/10, web/scripts/collage.mjs).
{
  const { collageDeRepaso } = await import('./collage.mjs');
  let conCollage = 0;
  for (const n of propias) {
    if (n.propia !== 'repaso' || n.foto) continue;
    const foto = await collageDeRepaso(n, { banco: bancoDeFotos, carpeta: FOTOS_NOTAS });
    if (foto) { n.foto = foto; conCollage += 1; }
  }
  if (conCollage) console.log(`  repasos con foto (collage): ${conCollage}`);
}

// La nota de "Un día como hoy" lleva la ilustración fija con el año y la fecha escritos en la hoja del centro (web/scripts/foto-efemeride.mjs, 15/10).
// Se arma una vez por día; si falla, queda la ilustración sin texto.
{
  const { fotoDeEfemeride } = await import('./foto-efemeride.mjs');
  let conFecha = 0;
  for (const n of propias) {
    if (n.propia !== 'efemeride') continue;
    const foto = await fotoDeEfemeride(n, { carpeta: FOTOS_NOTAS });
    if (foto) { n.foto = foto; conFecha += 1; }
  }
  if (conFecha) console.log(`  efemérides con el año en la hoja: ${conFecha}`);
}

// La nota del clima lleva una de las ilustraciones fijas de web/public/fotos-notas/clima-<estado>-<n>.jpg (web/lib/fondos-clima.js, 16/10/2026). Si el
// archivo no está (todavía no se subió, o se borró), la nota sale sin foto en vez de con una imagen rota.
for (const n of propias) {
  if (n.propia !== 'clima' || !n.foto?.archivo) continue;
  if (!existeFoto(path.basename(n.foto.archivo))) { console.log(`  clima: falta ${n.foto.archivo}, la nota ${n.id} sale sin foto`); delete n.foto; }
}

// Una nota propia que una persona armó (la de una pista) y a la que se le subió una foto desde el celular: la foto está en el banco con el id de la nota.
for (const n of propias) {
  const guardada = bancoDeFotos[n.id];
  if (!n.foto && n.propia === 'pista' && guardada?.archivo && existeFoto(path.basename(guardada.archivo))) n.foto = { archivo: guardada.archivo, credito: guardada.credito };
}

// Las notas propias que no tienen la foto de ninguna fuente (la F1: 3/10, Hernán) llevan una foto libre del lugar, de Wikimedia Commons
// (web/scripts/foto-libre.mjs): una vez por nota, se guarda en el banco con su crédito y su licencia. Si falla, sale sin foto.
{
  const { buscarFotoLibre, bajarFotoLibre } = await import('./foto-libre.mjs');
  const { achicarFoto } = await import('./achicar-foto.mjs');
  // Dos notas del mismo lugar (los partidos y los resultados de la misma fecha) no llevan la misma foto (4/10, Hernán): cada una se queda con una que no usó otra.
  const usadas = new Set();
  let nuevas = 0;
  for (const n of propias) {
    const lugarDeLaFoto = n.propia === 'f1' ? n.circuitoF1 : (n.propia === 'futbol' && n.lugarFoto ? `estadio ${n.lugarFoto}` : null);
    if (!lugarDeLaFoto || n.foto) continue;
    const guardada = bancoDeFotos[n.id];
    const repetida = guardada?.imagenOriginal && usadas.has(guardada.imagenOriginal);
    if (!repetida && guardada?.archivo && existeFoto(path.basename(guardada.archivo))) {
      n.foto = { archivo: guardada.archivo, credito: guardada.credito };
      if (guardada.imagenOriginal) usadas.add(guardada.imagenOriginal);
      continue;
    }
    // Si no hubo una foto buena, la nota sale sin foto y se vuelve a probar a las 6 horas (no cada media hora).
    if (guardada?.intentado && Date.now() - Date.parse(guardada.cuando ?? 0) < 6 * 3600e3) continue;
    const elegida = await buscarFotoLibre(`${lugarDeLaFoto}`, { excluir: [...usadas] });
    // Si reemplaza una repetida, lleva otro nombre de archivo (el navegador y Cloudflare guardan el viejo).
    const bajada = elegida ? await bajarFotoLibre(elegida, repetida ? `libre-${n.id}-${Date.now().toString(36)}` : `libre-${n.id}`, { achicar: achicarFoto }) : null;
    if (bajada) {
      fs.mkdirSync(FOTOS_NOTAS, { recursive: true });
      fs.writeFileSync(path.join(FOTOS_NOTAS, path.basename(bajada.archivo)), bajada.bytes);
      bancoDeFotos = { ...bancoDeFotos, [n.id]: bajada.entrada };
      n.foto = { archivo: bajada.archivo, credito: bajada.entrada.credito };
      usadas.add(bajada.entrada.imagenOriginal);
      nuevas += 1;
    } else {
      bancoDeFotos = { ...bancoDeFotos, [n.id]: { intentado: true, origen: 'libre', razon: 'no hubo una foto libre buena', cuando: new Date().toISOString() } };
    }
  }
  if (nuevas || propias.some((n) => n.circuitoF1 && bancoDeFotos[n.id]?.intentado && !bancoDeFotos[n.id]?.archivo)) {
    fs.writeFileSync(BANCO_FOTOS, `${JSON.stringify(bancoDeFotos, null, 1)}\n`, 'utf8');
    if (nuevas) console.log(`  fotos libres (Wikimedia Commons) para notas propias: ${nuevas}`);
  }
}

// Los escudos de los clubes de las notas de fútbol (web/scripts/escudos.mjs): se bajan una vez y quedan en web/public/escudos/.
{
  const { idsDeEscudos, bajarEscudos } = await import('./escudos.mjs');
  const bajados = await bajarEscudos(idsDeEscudos(propias), path.join(AQUI, '..', 'public', 'escudos'));
  if (bajados) console.log(`  escudos de clubes bajados: ${bajados}`);
}

// La misma noticia con otra dirección (lib/repetidas.js, 29/09): queda una y
// la dirección de la otra redirige a ésa (fusionadas.json, generar-redirects.mjs).
// La papelera (panel/celular-datos.mjs, 29/09): lo que retiró una persona (desde
// el celular o en retiradas.json) se guarda como
// estaba; si una persona la vuelve a aprobar, vuelve con la misma dirección.
const humanas = Object.entries(estado.decisiones ?? {}).filter(([, d]) => decisionHumana(d));
const RETIRADAS_POR_PERSONA = new Map([
  ...Object.entries(leerJson(path.join(AQUI, '..', 'data', 'retiradas.json'), { notas: {} }).notas ?? {})
    .filter(([id, r]) => r?.motivo && RETIRADAS_A_MANO.has(id))
    .map(([id, r]) => [id, { cuando: r.cuando ?? null, por: r.por ?? null, motivo: r.motivo }]),
  ...humanas.filter(([, d]) => d.estado === 'bloqueada' || d.estado === 'descartada')
    .map(([id, d]) => [id, { cuando: d.cuando ?? null, por: d.por ?? null, motivo: d.motivo ?? null }]),
]);
const VUELVEN = new Map(humanas.filter(([, d]) => d.estado === 'publicada').map(([id, d]) => [id, { cuando: d.cuando ?? null, por: d.por ?? null }]));
const papeleraAntes = leerJson(PAPELERA, { notas: {} }).notas ?? {};
const { papelera, restaurar } = papeleraAlDia({
  papelera: papeleraAntes,
  retiradas: RETIRADAS_POR_PERSONA,
  vuelven: VUELVEN,
  conPagina: new Map([...(archivoAnterior.notas ?? []), ...(anterior.notas ?? [])].map((n) => [n.id, n])),
});
if (restaurar.length) console.log(`  papelera: ${restaurar.length} nota(s) vuelven a publicarse (una persona las volvió a aprobar)`);
const conPaginaHoy = [...deLaIngesta, ...propias];
// Las repetidas con otras palabras (1/10, Hernán: dos notas de la Cooperativa y dos del RENAPER). Los títulos de las
// fuentes no se parecen; recién con los títulos ya escritos se nota. La IA de la lectura (mira cien notas juntas) a veces
// no las junta: acá se le pregunta sólo por las parejas sospechosas (misma sección, poco tiempo de diferencia, algo de
// parecido) y se guarda lo que contestó (fichas.json, repetidas.pares) para no volver a preguntar.
// Desde el 17/10 (regla 195): contra lo publicado de las últimas 72 horas (antes, sólo lo que seguía en la portada, 36), lo de
// acá también entre secciones, y además las parejas POR SIGNIFICADO de lo de acá (ingesta/huellas-significado.mjs): la huella
// elige a quién preguntar y la IA confirma cada nueva contra su ancla (repetidas.significado). Un solo pedido por corrida, con
// el tope del día repartido por hora (cupoDelMomento, regla 196).
{
  try {
    const { confirmarParejas, comoFichasJson, cupoDelMomento, LECTURA } = await import('../../ingesta/lectura-ia.mjs');
    const {
      huellasDe, parejasPorSignificado, leerHuellas, guardarHuellas, CACHE_DE_HUELLAS, esDeAcaParaHuella, ultimaVezQueVolvio,
    } = await import('../../ingesta/huellas-significado.mjs');
    const { claveClasificacion, claveGroq } = await import('../../reels/claves.mjs');
    const fich = leerJson(FICHAS, {});
    const rep = fich.repetidas ?? { dia: fich.dia, pedidosHoy: 0, grupos: [] };
    const pedidosHoy = rep.dia === fich.dia ? (rep.paresPedidosHoy ?? 0) : 0;
    const ahoraMs = Date.now();
    // Una publicada a la que se le unió una repetida sigue en la ventana desde la última vez que volvió (fusionadas.json).
    const ultimaVez = ultimaVezQueVolvio(FUSIONADAS_ANTES);
    const dentroDeLaVentana = (a) => !Number.isFinite(Date.parse(a.fecha ?? ''))
      || ahoraMs - Math.max(Date.parse(a.fecha), ultimaVez.get(a.id) ?? 0) <= PAREJAS.horas * 3600e3;
    const pool = [...new Map([...(archivoAnterior.notas ?? []).filter((a) => !retiradas.has(a.id) && dentroDeLaVentana(a)), ...conPaginaHoy].map((n) => [n.id, n])).values()];
    const idsDelPool = new Set(pool.map((n) => n.id));
    const enElPool = (k) => k.split('|').every((id) => idsDelPool.has(id));
    const guardadas = Object.fromEntries(Object.entries(rep.pares ?? {}).filter(([k]) => enElPool(k)));
    const significadoAntes = Object.fromEntries(Object.entries(rep.significado ?? {}).filter(([k]) => enElPool(k)));
    const sospechosas = parejasSospechosas(pool, { decididas: guardadas });
    // Las huellas de lo de acá del pool: las de la caché y las que falten (pocas por vuelta).
    const clave = claveClasificacion();
    const { huellas, cache, pedidas, faltan, falla } = await huellasDe(pool, { cache: leerHuellas(CACHE_DE_HUELLAS), clave });
    if (pedidas) guardarHuellas(cache, CACHE_DE_HUELLAS);
    if (falla) console.log(`  huellas de significado: falló el pedido (${falla.message}); se compara con las que ya había`);
    else if (clave && faltan > pedidas) console.log(`  huellas de significado: ${pedidas} nuevas, ${faltan - pedidas} quedan para la próxima vuelta`);
    const porSignificado = parejasPorSignificado(pool, { huellas, yaPublicadas: yaSalieron, decididas: { ...guardadas, ...significadoAntes }, ultimaVez });
    // Primero las de significado (son de acá), después las sospechosas por título; sin repetir.
    const preguntar = [];
    const claves = new Set();
    for (const p of [...porSignificado, ...sospechosas]) if (!claves.has(p.clave)) { claves.add(p.clave); preguntar.push(p); }
    const enEstePedido = preguntar.slice(0, PAREJAS.porPedido);
    let pares = guardadas;
    let significado = significadoAntes;
    let pedidos = pedidosHoy;
    const hayAlgoDeAca = enEstePedido.some((p) => esDeAcaParaHuella(p.a) && esDeAcaParaHuella(p.b));
    if (enEstePedido.length && clave && cupoDelMomento({ usados: pedidosHoy, tope: LECTURA.pedidosParejasPorDia, prioridad: hayAlgoDeAca })) {
      pedidos += 1;
      const r = await confirmarParejas(enEstePedido, { clave, claveRespaldo: claveGroq() });
      const deTitulo = new Set(sospechosas.map((p) => p.clave));
      pares = { ...guardadas, ...Object.fromEntries(Object.entries(r).filter(([k]) => deTitulo.has(k))) };
      significado = { ...significadoAntes };
      for (const p of porSignificado) {
        if (!(p.clave in r)) continue;
        significado[p.clave] = { mismo: r[p.clave], ancla: p.a.id, nueva: p.b.id, s: p.s };
      }
      for (const p of enEstePedido.filter((x) => r[x.clave])) console.log(`    misma noticia (IA): ${p.a.titulo} / ${p.b.titulo}`);
      console.log(`  parejas: ${enEstePedido.length} preguntadas (${porSignificado.filter((p) => claves.has(p.clave)).length} por significado), ${enEstePedido.filter((x) => r[x.clave]).length} son la misma noticia`);
    }
    if (JSON.stringify(pares) !== JSON.stringify(rep.pares ?? {}) || JSON.stringify(significado) !== JSON.stringify(rep.significado ?? {})
      || pedidos !== (rep.paresPedidosHoy ?? 0)) {
      fs.writeFileSync(FICHAS, comoFichasJson({ ...fich, repetidas: { ...rep, pares, significado, paresPedidosHoy: pedidos } }), 'utf8');
    }
    parejasConfirmadas = confirmadasDeLasFichas({ pares, significado });
    anclasDeSignificado = anclasConfirmadas(significado);
  } catch (e) {
    console.log(`  parejas: falló el pedido (${e.message}); se vuelve a probar en la próxima corrida`);
  }
}
// Las copias que encontró la revisión del archivo (regla 212): la misma noticia publicada dos veces, ya fuera de la ventana de 72 horas.
// Se unen como las parejas que confirma la IA, y queda la que ya estaba (como las anclas de significado: la copia nunca queda).
parejasConfirmadas = [...parejasConfirmadas, ...REPETIDAS_DE_LA_REVISION];
anclasDeSignificado = [...anclasDeSignificado, ...REPETIDAS_DE_LA_REVISION];
const conFotoEnElBanco = new Set(Object.entries(bancoDeFotos).filter(([, b]) => b?.archivo).map(([id]) => id));
const fusion = repetidasConOtraDireccion(
  [...(archivoAnterior.notas ?? []).filter((a) => !retiradas.has(a.id)), ...conPaginaHoy],
  {
    enRedes: idsEnRedes(libroRedes),
    confirmadas: [...parejasConfirmadas, ...parejasSinIA],
    // Con lo ya publicado queda SIEMPRE la que ya estaba (una nota no rejuvenece, M2 del 15/10): la nueva no queda aunque traiga foto.
    // También en las parejas que confirmó la IA (regla 175): la que ya salió queda con su sección y su dirección, y la copia nueva
    // (aunque sea de otra sección, o de acá contra una de afuera) no se publica.
    // Y en las de significado (regla 195) la que queda es el ancla, la que ya estaba, aunque las dos hayan salido.
    preferidas: [...parejasSinIA, ...conLaPublicadaPrimero(parejasConfirmadas, yaSalieron), ...anclasDeSignificado],
    conFoto: conFotoEnElBanco,
    // Las uniones de corridas anteriores quedan firmes (regla 175).
    firmes: UNIDAS_FIRMES,
  },
);
for (const id of fusion.keys()) retiradas.add(id);
// Si la nueva trajo la foto y la que queda no tiene, la foto pasa a la que queda (en el banco, con su crédito).
const pasaLaFoto = fotosParaLaQueQueda(fusion, {
  conFoto: conFotoEnElBanco,
  // Una ilustración con IA no cuenta como foto: si la nueva trajo una foto real, pasa (regla 182).
  yaTienen: new Set([...(archivoAnterior.notas ?? []), ...conPaginaHoy].filter((n) => n.foto && !esIlustracionDeNota(n.foto)).map((n) => n.id)),
});
if (pasaLaFoto.size) {
  bancoDeFotos = { ...bancoDeFotos, ...Object.fromEntries([...pasaLaFoto].map(([queda, deLaFoto]) => [queda, { ...bancoDeFotos[deLaFoto] }])) };
  conFotosDelBanco(conPaginaHoy.filter((n) => pasaLaFoto.has(n.id)), bancoDeFotos);
  {
    fs.mkdirSync(path.dirname(BANCO_FOTOS), { recursive: true });
    fs.writeFileSync(BANCO_FOTOS, `${JSON.stringify(bancoDeFotos, null, 1)}\n`, 'utf8');
  }
  console.log(`  repetidas: ${pasaLaFoto.size} foto(s) pasan a la nota que ya estaba publicada`);
}
const conLaFotoPasada = (n) => (pasaLaFoto.has(n?.id) && (!n.foto || esIlustracionDeNota(n.foto)) ? conFotosDelBanco([{ ...n }], bancoDeFotos)[0] : n);
// Regla 186: una nota del archivo con una foto con chicos que entró por la excepción la pierde si se apagó FOTOS_MENORES_OFICIALES o si la
// nota, como está hoy, ya no la permite (después le toca su ilustración, si tiene).
// La foto de cada nota del archivo, al día con el banco (regla 203): sin imágenes rotas ni fotos que se sacaron.
const conLaFotoAlDia = (n) => fotoDelArchivoAlDia(n, bancoDeFotos, { existe: (nombre) => existeFoto(nombre) });
const sinFotoConMenorBloqueada = (n) => {
  const b = bancoDeFotos[n?.id];
  if (!n?.foto?.archivo || !b?.excepcion || n.foto.archivo !== b.archivo || fotoConMenorPermitida(n)) return n;
  const { foto, ...resto } = n;
  return resto;
};
{
  const antes = leerJson(FUSIONADAS, null);
  const porId = new Map([...(archivoAnterior.notas ?? []), ...conPaginaHoy].map((n) => [n.id, n]));
  const json = conFusionadas(antes, fusion, porId);
  // Una por renglón, como retiradas.json.
  if (!antes || JSON.stringify(antes.notas) !== JSON.stringify(json.notas)) fs.writeFileSync(FUSIONADAS, comoRetiradasJson(json), 'utf8');
  if (fusion.size) console.log(`  repetidas con otra dirección: ${fusion.size}, redirigidas a la que queda`);
}
// La que queda suma los medios y las fuentes de las que se le unieron (regla 171): están en su "Fuentes (N)".
const porIdDeLasUnidas = new Map([...(archivoAnterior.notas ?? []), ...conPaginaHoy].map((n) => [n.id, n]));
const conLasUnidas = (lista) => conFuentesDeLasUnidas(lista, fusion, porIdDeLasUnidas);
const publicadas = conLasUnidas(conPaginaHoy.filter((n) => !fusion.has(n.id)))
  .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

// Lo que se MUESTRA (portada, secciones, temas, buscador, feed): sólo lo de
// las últimas HORAS_EN_PORTADA (vigenteEnPortada, lib/archivo.js). El 25/09 la
// portada tenía 43 notas de más de tres días. La página de cada una sigue
// existiendo: está en el archivo.
const vigentes = publicadas.filter((n) => vigenteEnPortada(n));
// Ni dos notas con el mismo titular (o casi) en las listas: se queda la de más
// relevancia y la otra sale de la portada, las secciones, el feed y el sitemap.
// Conserva su página: entra igual al archivo (`enPortada` usa `vigentes`) y sus
// enlaces, que pueden estar ya compartidos, no se rompen.
const notas = sinNotasRepetidas(vigentes);
const repetidas = vigentes.length - notas.length;
if (repetidas) console.log(`  ${repetidas} notas repetidas (mismo titular) salen de las listas y conservan su página`);

// Sin sección Servicios desde el 27/09 (Hernán): lo que quedó con esa sección
// en el archivo pasa a Balcarce si es de acá, y a Argentina si no (País se
// llama Argentina desde el mismo día).
// Y los títulos automáticos del archivo, con los mismos arreglos mecánicos
// (tituloAutomatico: sin "en Balcarce" al final, sin etiqueta adelante, sin
// coma colgando).
const sinCola = (n) => (n && (!n.publicadaPor || n.publicadaPor === 'ia') && !n.propia ? { ...n, titulo: tituloAutomatico(n.titulo) } : n);
const sinServicios = (n) => conCorreccion(sinColaDe(n), CORRECCIONES);
// Lo que corrigió sola la auditoría (correcciones-auditoria.json) también llega a las notas del archivo que ya no trae la ingesta: hasta el
// 17/10 sólo se aplicaba a lo de esta corrida, y lo que corrige la revisión del archivo (regla 212) son justamente notas viejas. Si el texto
// ya cambió (lo corrigió una persona, o ya se aplicó), el par no calza y no hace nada.
const conLoQueCorrigioLaAuditoria = (n) => conCambiosDeLaAuditoria(n, CAMBIOS_AUDITORIA);
const sinColaDe = (n) => sinCola(n?.seccion === 'Servicios' ? { ...n, seccion: n.local ? 'Balcarce' : 'Argentina' }
  : n?.seccion === 'País' ? { ...n, seccion: 'Argentina' } : n);
// El tope de notas con página (16/10/2026): MAXIMO_EN_ARCHIVO, salvo que la variable TOPE_DE_NOTAS lo baje con el archivo permanente
// prendido (R2_ARCHIVO). Baja de a poco (topeDeEstaVuelta) para que cada nota que sale del sitio ya esté guardada en R2.
const pedidoDelTope = topeDeNotas(process.env);
if (pedidoDelTope.aviso) console.log(`  tope de notas: ${pedidoDelTope.aviso}`);
const topeDeHoy = topeDeEstaVuelta(pedidoDelTope.tope, (archivoAnterior.notas ?? []).length);
if (topeDeHoy < MAXIMO_EN_ARCHIVO) console.log(`  tope de notas de esta vuelta: ${topeDeHoy} (se pidió ${pedidoDelTope.tope}; las que salen ya están en el archivo permanente)`);
// Lo de más de unos días guarda sólo lo que ve el lector (aligerarViejas, 29/09).
const archivo = aligerarViejas(actualizarArchivo({
  archivo: conLasUnidas([...(archivoAnterior.notas ?? []), ...restaurar.filter((n) => !(archivoAnterior.notas ?? []).some((a) => a.id === n.id))]).map(conLaFotoPasada).map(conLaFotoAlDia).map(sinFotoConMenorBloqueada).map(conLaIlustracion).map(sinServicios).map(conLoQueCorrigioLaAuditoria),
  // Las partes nuevas que hoy no están (una persona corrigió el texto, o la
  // reescritura se cayó) tampoco quedan de la vez anterior en el archivo: el
  // `undefined` pisa lo viejo al mezclar y no se escribe.
  publicadas: [...corregidas, ...publicadas].map(sinPuntaje)
    .map((n) => ({ ...Object.fromEntries(CAMPOS_EXTRA.map((k) => [k, undefined])), ...n })),
  enPortada: new Set(vigentes.map((n) => n.id)),
  retiradas,
  enRedes: idsEnRedes(libroRedes),
  maximo: topeDeHoy,
}));
if (JSON.stringify(archivo) !== JSON.stringify(archivoAnterior.notas ?? [])) {
  // Lo que se saca a propósito por no tener cuerpo (sePodaPorFaltaDeCuerpo) no cuenta como una baja sospechosa.
  const podadasSinCuerpo = (archivoAnterior.notas ?? []).filter((n) => sePodaPorFaltaDeCuerpo(n)).length;
  const guardia = guardiaDelArchivo((archivoAnterior.notas ?? []).length, archivo.length + podadasSinCuerpo);
  if (!guardia.ok && process.env.ARCHIVO_PERMITIR_BAJA !== '1') {
    throw new Error(`archivo.json: ${guardia.motivo}. Si es a propósito, correr con ARCHIVO_PERMITIR_BAJA=1.`);
  }
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  fs.writeFileSync(ARCHIVO, comoArchivoJson(archivo), 'utf8');
  console.log(`  archivo.json: ${archivo.length} notas con página (${retiradas.size} retiradas)`);
  // Lo que salió por edad o por tope no se pierde: queda en web/data/historico/AAAA-MM.json (C-6).
  const bajas = bajasDelArchivo(archivoAnterior.notas ?? [], archivo, retiradas);
  const porMes = new Map();
  for (const n of bajas) porMes.set(mesDeLaNota(n), [...(porMes.get(mesDeLaNota(n)) ?? []), n]);
  for (const [mes, notasDelMes] of porMes) {
    const ruta = path.join(AQUI, '..', 'data', 'historico', `${mes}.json`);
    fs.mkdirSync(path.dirname(ruta), { recursive: true });
    fs.writeFileSync(ruta, comoArchivoJson(conBajasEnElHistorico(leerJsonEstricto(ruta, { notas: [] }), notasDelMes).notas), 'utf8');
  }
  if (bajas.length) console.log(`  histórico: ${bajas.length} notas pasaron del archivo al histórico`);
}

// Las fotos que ya no tienen nota se borran (podarFotos): las de lo retirado a
// mano siempre, y las de lo que ya no está en el archivo, la portada ni la
// ingesta.
if (fs.existsSync(FOTOS_NOTAS)) {
  const quedan = new Set([...archivo, ...vigentes, ...deLaIngesta].map((n) => n.id));
  const { banco, borrar } = podarFotos({
    banco: bancoDeFotos, enDisco: fs.readdirSync(FOTOS_NOTAS), quedan, retiradas: RETIRADAS_A_MANO, ilustraciones: ilustracionesIA,
  });
  for (const f of borrar) fs.rmSync(path.join(FOTOS_NOTAS, f), { force: true });
  // La hora de `ausenteDesde` no cuenta como cambio si el archivo ya tenía una (conMarcasDeAusenciaDeAntes): evita reescribir 1,7 MB por una hora.
  // Regla 306: con el archivo de AL EMPEZAR (no el de ahora, que esta misma corrida pudo reescribir sin las horas) y comparando el texto final.
  const { final: bancoFinalParaGuardar } = bancoFinal({ banco, bancoDeFotos, alEmpezar: bancoGuardadoAlEmpezar });
  let bancoEnDisco = '';
  try { bancoEnDisco = fs.readFileSync(BANCO_FOTOS, 'utf8'); } catch { /* sin banco todavía */ }
  if (hayQueEscribirElBanco(bancoFinalParaGuardar, bancoEnDisco)) {
    fs.writeFileSync(BANCO_FOTOS, textoDelBanco(bancoFinalParaGuardar), 'utf8');
  }
  if (borrar.length) console.log(`  fotos: ${borrar.length} sin nota, borradas`);
}

// ------------------------------------------------------------- la agenda
//
// Cada evento con fecha confirmada tiene su página: los del municipio se traen
// en cada corrida. Si la API del municipio no contestó, lo suyo queda como
// estaba (no se da por retirado). (Hasta el 17/10 también se leían los que
// cargaba el panel de la PC, eventos-panel.json: no hubo nunca ninguno.)
const agendaAnterior = leerJson(AGENDA_WEB, { eventos: [] });
const eventosAgenda = aplicarSuspendidos(actualizarAgenda({
  anterior: agendaAnterior.eventos ?? [],
  municipio: agenda && agenda.municipioOk !== false ? (agenda.municipio ?? []) : null,
}), leerJson(path.join(AQUI, '..', 'data', 'agenda-suspendidos.json'), null));
// Se escribe siempre que falte: el workflow lo suma con `git add` y un archivo
// que no existe hace fallar el paso entero.
if (!fs.existsSync(AGENDA_WEB) || JSON.stringify(eventosAgenda) !== JSON.stringify(agendaAnterior.eventos ?? [])) {
  fs.writeFileSync(AGENDA_WEB, comoAgendaJson(eventosAgenda), 'utf8');
  console.log(`  agenda.json: ${eventosAgenda.length} eventos con página`);
}

// Qué farmacia está de turno AHORA. La regla del cambio a las 8:30 de la
// mañana está en ingesta/utiles.mjs, con su explicación.
const delTurno = diaDeTurno();
const hoyISO = comoISO(delTurno);
const hoy = delTurno.getDate();

// Si un cronograma viejo no trae fecha armada, se cae al número de día.
const esHoy = (t) => (t.fecha ? t.fecha === hoyISO : t.dia === hoy);
const yaViene = (t) => (t.fecha ? t.fecha >= hoyISO : t.dia >= hoy);
const turnoHoy = ultima.farmacias?.turnos?.find(esHoy) ?? null;
const proximosTurnos = (ultima.farmacias?.turnos ?? []).filter(yaViene).slice(0, 6);

const salida = {
  generado: new Date().toISOString(),
  notas,
  secciones: [...new Set(notas.map((n) => n.seccion))],
  // Sólo los temas que hoy tienen al menos dos notas publicadas: uno con
  // una sola nota no es un tema, es una etiqueta suelta.
  temas: TEMAS
    .map((t) => ({ ...t, palabras: undefined, cuantas: notas.filter((n) => n.temas?.includes(t.ranura)).length }))
    .filter((t) => t.cuantas >= 2)
    .sort((a, b) => b.cuantas - a.cuantas),
  clima: ultima.clima ?? null,
  // Los avisos se calculan acá y no en el navegador: la web es estática y
  // así el aviso ya está en el HTML, sin esperar a que cargue nada.
  avisosClima: avisosDelClima(ultima.clima),
  farmacias: { hoy: turnoHoy, proximos: proximosTurnos, avisos: ultima.farmacias?.avisos ?? [] },
  // Los eventos, con su página, están en data/agenda.json (arriba). Acá
  // quedan sólo las fiestas anuales, que no tienen fecha confirmada.
  agenda: {
    proximosAnuales: agenda?.proximosAnuales ?? [],
  },
  utiles: { numeros: NUMEROS, diaDeLaSemana: diaDeEstaSemana(), tocaHoy: tocaHoy() },
  // Las notas que esperan a una persona en el panel (amarillas), para que el
  // vigilante avise por WhatsApp: en GitHub no hay panel y es la única forma
  // de saberlo. Este archivo es público, así que va lo mínimo, nunca una roja,
  // y sin titular cuando la nota es de Policiales o habla de chicos o de
  // víctimas (redes/avisos.mjs, pendientesDeLaIngesta).
  pendientes: pendientesDeLaIngesta(ultima.notas ?? [], estado.decisiones ?? {}),
  // Cuántas notas automáticas no salen porque todavía no tienen cuerpo: el
  // vigilante lo dice en el resumen de las 21 ("Esperando cuerpo: N").
  esperandoCuerpo: esperandoCuerpo.length,
};

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });

// La estadística del día (27/09): cuántas notas salieron hoy y en qué
// sección. Se reescribe el día de hoy en cada corrida; el WhatsApp de las 21
// la manda (ingesta/estadistica-diaria.mjs). Sólo se toca el archivo si
// cambió algún número: si no, cada corrida haría un commit y una compilación.
const NOTAS_POR_DIA = path.join(AQUI, '..', 'data', 'notas-por-dia.json');
{
  const historia = leerJson(NOTAS_POR_DIA, { dias: {} });
  const cuenta = cuentaDelDia({ portada: salida, ahora: new Date(), libro: libroRedes });
  const texto = comoNotasPorDiaJson(anotarDia(historia, cuenta));
  if (!fs.existsSync(NOTAS_POR_DIA) || fs.readFileSync(NOTAS_POR_DIA, 'utf8') !== texto) fs.writeFileSync(NOTAS_POR_DIA, texto, 'utf8');
  console.log(`  hoy: ${cuenta.publicadas} notas publicadas (${cuenta.deBalcarce} de Balcarce) · ${Object.entries(cuenta.porSeccion).map(([s, n]) => `${s} ${n}`).join(', ') || 'ninguna'}`);
}

// La estadística de la selección (regla 260): dónde cayó cada historia que llegó (publicada, la IA la sacó, pocas fuentes, semáforo,
// repetida, sin cuerpo, un solo medio…), por día y por sección. Se suma a web/data/estadistica-seleccion.json (60 días) y se rehace el
// reporte web/public/panel/estadistica-seleccion.html (no se sube al repositorio: lo arma el sitio). Si algo falla acá, la corrida sigue.
const ESTADISTICA_SELECCION = path.join(AQUI, '..', 'data', 'estadistica-seleccion.json');
const REPORTE_SELECCION = path.join(AQUI, '..', 'public', 'panel', 'estadistica-seleccion.html');
try {
  const ahora = new Date();
  const finales = ultima.notas ?? [];
  const observaciones = observarCorrida({
    delCruce,
    finales: finales.map((n) => ({ id: n.id, seccion: n.seccion, semaforo: n.semaforo, motivo: n.motivo, medios: contarMedios(n.medios), descartada: !!n.descartada })),
    // Publicada es lo que de verdad queda a la vista: una nota que esta misma vuelta se unió a otra (fusion) redirige y no cuenta (regla 314).
    publicadas: new Set(deLaIngesta.filter((n) => !fusion.has(n.id)).map((n) => n.id)),
    sacadasPorLaIA, repetidas: repetidasFuera, sinCuerpo: new Set([...esperandoCuerpo, ...descartadasSinCuerpo].map((e) => e.id)),
    // Regla 314: por qué la sacó la IA, con cuál se unió cada repetida (la lectura, la comparación con lo publicado o una unión firme),
    // cuáles agotaron sus intentos de cuerpo y si alcanzan los medios que pide su sección (la cantidad va antes que «la IA la sacó»).
    razonesDeLaIA: motivosDeLaIA,
    unidas: new Map([
      ...[...repetidasCon].map(([id, con]) => [id, { con, por: 'lectura' }]),
      ...[...fusion].map(([id, con]) => [id, { con, por: 'publicadas' }]),
      ...[...UNIDAS_FIRMES].map(([id, con]) => [id, { con, por: 'firme' }]),
    ]),
    descartadasSinCuerpo: new Set(descartadasSinCuerpo.map((e) => e.id)),
    llegaPorCantidad: (h) => popularidadDe({ seccion: h.seccion, titulo: h.titulo }, h.medios).llega,
    // Lo que no es de la selección sino de lo que pasa después: una persona la retiró (retiradas.json o una decisión del celular) / el hecho llegó pasado de horas.
    retiradas: new Set(finales.filter((n) => RETIRADAS_A_MANO.has(n.id) || (decisionHumana(estado.decisiones[n.id]) && !['publicada', 'automatica'].includes(estado.decisiones[n.id].estado))).map((n) => n.id)),
    tarde: new Set(finales.filter((n) => !yaSalieron.has(n.id) && llegaTarde(fechaReal(n), Date.now(), horasDeEstreno(n))).map((n) => n.id)),
    yaSalieron, motivos: { pocoContada: MOTIVO_POCO_CONTADA, esperaLectura: MOTIVO_ESPERA_LECTURA },
    vistaDe: (id) => vistas[id] ?? null, ahora,
  });
  // Regla 314: toda historia que llega termina con un motivo de la lista cerrada. Si alguna quedó sin motivo es un hueco de la estadística, no de la
  // selección: se avisa arriba de la corrida (no frena nada).
  {
    const sinExplicar = sinMotivo(observaciones);
    if (sinExplicar.length) console.log(`::warning title=Historias sin motivo::${sinExplicar.length} historias llegaron y no se pudo decir por qué no salieron (${sinExplicar.slice(0, 5).map((o) => o.id).join(', ')})`);
  }
  // 23/10/2026 (Hernán: «ver los títulos de los de 10 o más fuentes y qué pasó»): las historias muy contadas (8 medios o más) que NO salieron, con su
  // título y el motivo, de los últimos 3 días: web/data/muy-contadas.json.
  try {
    const rutaMuy = path.join(AQUI, '..', 'data', 'muy-contadas.json');
    const previo = fs.existsSync(rutaMuy) ? JSON.parse(fs.readFileSync(rutaMuy, 'utf8')) : {};
    const dias = previo.dias ?? {};
    const hoy = diaAR(ahora);
    const titulos = new Map(delCruce.map((h) => [h.id, h.titulo]));
    const motivoDeLasFinales = new Map(finales.map((n) => [n.id, n.motivo]));
    dias[hoy] ??= {};
    const finalPorId = new Map(finales.map((n) => [n.id, n]));
    for (const o of observaciones) {
      // Si más tarde salió, deja de figurar como no publicada (en cualquiera de los días guardados, no sólo en el de hoy).
      if (o.resultado === 'publicada') { for (const d of Object.values(dias)) delete d[o.id]; continue; }
      if (o.medios < MUY_CONTADA.medios) continue;
      const final = finalPorId.get(o.id);
      const motivo = motivoDeUnaMuyContada(o, {
        motivo: motivosDeLaIA.get(o.id) ?? motivoDeLasFinales.get(o.id),
        escrita: !!reescritas[o.id],
        descartadaSinCuerpo: descartadasSinCuerpo.find((d) => d.id === o.id)?.motivo ?? null,
        enLaPortada: !final || vigenteEnPortada({ fecha: fechaReal(final) }),
      });
      // Se vuelve a escribir en cada vuelta (con el estado de ahora) y, si estaba en otro día, se mueve al de hoy: una sola entrada por historia.
      for (const d of Object.values(dias)) delete d[o.id];
      dias[hoy][o.id] = [String(titulos.get(o.id) ?? '').slice(0, 140), o.seccion, o.medios, o.resultado, motivo.slice(0, 110)];
    }
    const quedan = Object.keys(dias).sort().slice(-3);
    const texto = JSON.stringify({ version: 1, dias: Object.fromEntries(quedan.map((d) => [d, dias[d]])) }, null, 1) + '\n';
    if (!fs.existsSync(rutaMuy) || fs.readFileSync(rutaMuy, 'utf8') !== texto) fs.writeFileSync(rutaMuy, texto, 'utf8');
  } catch (e) { console.log(`  muy contadas: no se pudo (${e.message})`); }
  // Lo de afuera con un solo medio (miles por vuelta) se cuenta por día de la nota y sección, no una por una.
  const solos = Array.isArray(ultima.deUnSoloMedio) ? contarUnSoloMedio(ultima.deUnSoloMedio, { ahora }) : null;
  const nuevo = anotarCorrida(leerEstadisticaDeLaSeleccion(fs.existsSync(ESTADISTICA_SELECCION) ? fs.readFileSync(ESTADISTICA_SELECCION, 'utf8') : ''), observaciones, { ahora, solos });
  const textoSeleccion = comoEstadisticaDeLaSeleccionJson(nuevo);
  if (!fs.existsSync(ESTADISTICA_SELECCION) || fs.readFileSync(ESTADISTICA_SELECCION, 'utf8') !== textoSeleccion) fs.writeFileSync(ESTADISTICA_SELECCION, textoSeleccion, 'utf8');
  fs.mkdirSync(path.dirname(REPORTE_SELECCION), { recursive: true });
  fs.writeFileSync(REPORTE_SELECCION, reporteDeLaSeleccionHtml(nuevo, { hasta: diaAR(ahora) }), 'utf8');
  const hoyEnLaSeleccion = nuevo.dias[diaAR(ahora)];
  console.log(`  selección de hoy: ${hoyEnLaSeleccion?.llegaron ?? 0} historias llegaron, ${hoyEnLaSeleccion?.publicadas ?? 0} publicadas`);
} catch (e) {
  console.log(`  estadística de la selección: no se pudo (${e.message})`);
}

// ¿Cambió algo que justifique volver a publicar?
//
// `generado` cambia en cada corrida por definición, así que el archivo
// siempre difiere y el workflow siempre commitea — y cada commit dispara una
// compilación entera del sitio.
//
// Hoy eso no molesta: las nueve corridas de ayer publicaron contenido nuevo
// las nueve, porque en un pueblo con 24 fuentes en una hora siempre se movió
// algo. Pero una noche tranquila, o el día que compilar cinco mil notas
// tarde minutos, esto se paga.
//
// La temperatura merece una regla propia. Se mueve un grado cada media hora
// y sola no justifica recompilar ciento setenta páginas, sobre todo porque
// la tarjeta se corrige en el navegador a los dos segundos de abrir la
// página. Pero tampoco puede quedar congelada: un "el clima ahora" de hace
// seis horas es mentira. Dos grados, o que cambie el cielo, sí publican.
function cambioQueImporta(antes, ahora) {
  if (!antes?.notas?.length) return true;

  const salvoClima = (o) => JSON.stringify({ ...o, generado: null, clima: null });
  if (salvoClima(antes) !== salvoClima(ahora)) return true;

  const a = antes.clima?.ahora ?? {};
  const b = ahora.clima?.ahora ?? {};
  if (a.cielo !== b.cielo || a.esDeDia !== b.esDeDia) return true;
  if (Math.abs((a.temp ?? 0) - (b.temp ?? 0)) >= 2) return true;

  // El pronóstico de los próximos días sí se publica siempre que cambie: no
  // se mueve cada media hora y es lo que alguien mira para mañana.
  return JSON.stringify(antes.clima?.dias) !== JSON.stringify(ahora.clima?.dias);
}

{
  const descartadas = descartadasSinCuerpo.slice(0, 40);
  const texto = `${JSON.stringify({ generado: salida.generado, intentosMaximos: MAXIMO_DE_INTENTOS, notas: esperandoCuerpo, descartadas }, null, 1)}\n`;
  const antes = leerJson(ESPERANDO_CUERPO, null);
  if (JSON.stringify(antes?.notas) !== JSON.stringify(esperandoCuerpo) || JSON.stringify(antes?.descartadas ?? []) !== JSON.stringify(descartadas)) fs.writeFileSync(ESPERANDO_CUERPO, texto, 'utf8');
}

// El panel del celular (29/09):
//
//   · lo que espera a una persona, con todo lo que hace falta para decidir, y la
//     papelera: un sobre cifrado por nota para cada celular registrado
//     (panel/cifrado.mjs); una nota que no cambió conserva su sobre. Lo que
//     espera no lo escribe la IA sola: sólo si una persona lo pide (regla 68);
//   · las notas enteras, en la caché de Actions, para el workflow "Panel del celular";
//   · cuántas notas hay y lo que va a salir hoy en las redes (celular-estado.json).
{
  const llaves = leerLlaves(leerJson(CELULAR_LLAVES, null));
  const lista = paraDecidir(ultima.notas ?? [], estado.decisiones ?? {}, { fichas: leerJson(FICHAS, {}).fichas ?? {} });
  fs.mkdirSync(path.dirname(PAPELERA), { recursive: true });
  fs.writeFileSync(PAPELERA, JSON.stringify({ notas: papelera }), 'utf8');

  const sobresAntes = leerJson(CELULAR_PENDIENTES, null);
  const previos = sobresAntes?.version === 2 ? sobresAntes : { notas: {}, retiradas: {} };
  const esperan = cerrarCadaUno(Object.fromEntries(lista.map((n) => [n.id, n])), llaves, previos.notas);
  const enPapelera = paraLaPapelera(papelera, { aMano: RETIRADAS_A_MANO });
  const retiradasCel = cerrarCadaUno(Object.fromEntries(enPapelera.map((n) => [n.id, n])), llaves, previos.retiradas);
  const orden = lista.map((n) => n.id);
  const ordenRetiradas = enPapelera.map((n) => n.id);
  const cambioElOrden = JSON.stringify(orden) !== JSON.stringify(previos.orden ?? [])
    || JSON.stringify(ordenRetiradas) !== JSON.stringify(previos.ordenRetiradas ?? []);
  if (esperan.cambio || retiradasCel.cambio || cambioElOrden || !fs.existsSync(CELULAR_PENDIENTES)) {
    fs.writeFileSync(CELULAR_PENDIENTES, `${JSON.stringify({
      version: 2, generado: salida.generado, cuantas: lista.length, orden, notas: esperan.sobres,
      retiradas: retiradasCel.sobres, ordenRetiradas,
    }, null, 1)}\n`, 'utf8');
    console.log(`  celular: ${lista.length} notas esperando a una persona y ${enPapelera.length} en la papelera, cifradas para ${llaves.length} celular(es)`);
  }
  fs.mkdirSync(path.dirname(CELULAR_NOTAS), { recursive: true });
  fs.writeFileSync(CELULAR_NOTAS, JSON.stringify({ generado: salida.generado, notas: notasParaEscribir(ultima.notas ?? []) }), 'utf8');
}

// Lo que el celular muestra aparte.
{
  const estadoCel = {
    portada: notas.length,
    archivo: archivo.length,
    esperandoCuerpo: esperandoCuerpo.length,
    redes: {
      ...previaDelDia({ portada: salida, libro: libroRedes, archivo }),
      // El interruptor (la variable REDES_ACTIVAS de GitHub): con las redes
      // apagadas, el celular avisa que esto es lo que saldría, no lo que sale.
      activas: process.env.REDES_ACTIVAS === undefined ? null : estaActivo(process.env.REDES_ACTIVAS),
    },
    // Las secciones que se suman a las once (Educación, Salud y Ciencia; regla 211, activas siempre): el panel las ofrece al corregir
    // una nota (seccionesDelPanel, web/public/panel/github.js). El campo queda por los paneles que ya estaban abiertos en un celular.
    seccionesNuevas: [...SECCIONES_SUMADAS],
  };
  const antes = leerJson(CELULAR_ESTADO, null);
  const sinHora = (o) => JSON.stringify({ ...o, generado: null, redes: o?.redes ? { ...o.redes, generado: null } : null });
  if (!antes || sinHora(antes) !== sinHora(estadoCel)) {
    fs.writeFileSync(CELULAR_ESTADO, `${JSON.stringify({ generado: salida.generado, ...estadoCel }, null, 1)}\n`, 'utf8');
  }
}

if (cambioQueImporta(anterior, salida)) {
  fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 2), 'utf8');
  console.log(`  portada.json: ${notas.length} notas publicadas, ${esperandoCuerpo.length} esperando cuerpo, generado ${salida.generado}`);
} else {
  console.log('  sin novedades: la portada quedó igual, no se toca el archivo');
}
