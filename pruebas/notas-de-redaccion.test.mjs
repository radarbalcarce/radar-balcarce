// Las notas que escribe una persona de la redacción desde el panel del celular (30/10/2026, Hernán: "que en el panel yo pueda publicar notas
// directamente, donde tenga que solo pegar título, copete y cuerpo de la nota, además de subir fotos para poner entre la nota, más la de portada y
// quién firma"). Sin red. Lo del panel (achicar, marcas, pantalla) está en pruebas/escribir-panel.test.mjs.
//
// Qué cuida: una entrada completa y con motivo/cuándo/quién (como correcciones.json); un id y una fecha que no cambian al editar; las fotos entre los
// párrafos con su pie; la firma de la persona (en la página y en el marcado); que no salga un "Fuentes (0)" vacío; que no salte sola a las redes;
// que las fotos nunca se poden y que la web las compile (no hay un motor que las escriba: las sube el celular).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  notasDeRedaccion, motivoDeRechazo, partirCuerpo, cuerpoPlano, idDeNotaDeRedaccion, idsRetiradosDeRedaccion, archivosDeFotosDeRedaccion, esFotoDeRedaccion,
  leyendaDeFoto, creditoDeFoto, sinLasFotosQueFaltan, firmaDeRedaccion, autorDeLaEntrada, RELEVANCIA_DE_REDACCION, SECCIONES_DE_REDACCION, DIAS_DE_UNA_NOTA_DE_REDACCION,
  palabrasDelCuerpoEscrito,
} from '../web/lib/notas-de-redaccion.js';
import { SECCIONES_DE_PISTAS } from '../web/lib/notas-de-pistas.js';
import { partesDelCuerpo, TAMANO_DE_RESERVA } from '../web/lib/cuerpo-con-fotos.js';
import { tieneCuerpo, noSeOfreceAGoogle, esperaCuerpo, tieneRespaldo, PALABRAS_MINIMAS_CUERPO, PALABRAS_MINIMAS_CUERPO_DE_REDACCION } from '../web/lib/cuerpo.js';
import { quienEscribio, firmaCorta, autorDeNota, explicacionDeFirma } from '../web/components/metadatos.js';
import { fuentesDeLaNota } from '../web/lib/fuentes-de-la-nota.js';
import { fuentesParaElMarcado } from '../web/lib/datos-estructurados.js';
import { noSeIndexa } from '../web/lib/indexacion.js';
import { actualizarArchivo, fijarSlug, sePodaPorFaltaDeCuerpo } from '../web/lib/archivo.js';
import { slugDe } from '../web/lib/ruta.js';
import { fechaDeModificacion, actualizadaCuando } from '../web/lib/tiempo.js';
import { quedaAfueraDeLasRedes, vaAFacebookPorLoQueEs, esNotaPropia, sePuedeEnUnRepaso } from '../redes/elegir.mjs';
import { podarFotos } from '../web/scripts/fotos-notas.mjs';
import { hayQueRecompilar, NO_CAMBIAN_EL_SITIO } from '../web/scripts/recompilar.mjs';
import { SOLO_PARA_ARMAR_LOS_DATOS } from '../web/scripts/huella-del-sitio.mjs';
import { ARCHIVOS_DEL_MOTOR } from '../infra/motor-cloudflare/archivos.mjs';
import { fotosQueNecesitan, esRutaDeFoto, sePuedeMoverAR2 } from '../infra/compartido/fotos-r2.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\r\n/g, '\n');
const AHORA = new Date('2026-10-30T15:00:00Z');
const CLAVE = 'rmg3k9x2ab';

const PARRAFO_1 = 'El Hospital Municipal inauguró una sala nueva de atención pediátrica con cuatro camas, equipamiento donado por la Cooperativa y una guardia reforzada para el invierno.';
const PARRAFO_2 = 'El intendente destacó el trabajo del personal y anunció que en noviembre se suman dos pediatras más al servicio de guardia del hospital.';
const CUERPO = `${PARRAFO_1}\n\n[foto 1]\n\n${PARRAFO_2}\n\n[foto 2]`;
const PORTADA = { archivo: 'fotos-notas/redaccion-mg3k9x2ab-p-0a1b.jpg', ancho: 1600, alto: 900, epigrafe: 'El corte de cinta', credito: 'Hernán Accomo' };
const FOTO_1 = { archivo: 'fotos-notas/redaccion-mg3k9x2ab-1-2c3d.jpg', ancho: 1200, alto: 800, epigrafe: 'La sala nueva', credito: 'Hernán Accomo' };
const FOTO_2 = { archivo: 'fotos-notas/redaccion-mg3k9x2ab-2-4e5f.jpg', ancho: 800, alto: 1200, epigrafe: '', credito: '' };

const ENTRADA = (extra = {}) => ({
  titulo: 'Inauguraron una sala pediátrica en el Hospital Municipal',
  copete: 'Tiene cuatro camas y equipamiento donado por la Cooperativa.',
  cuerpo: CUERPO,
  seccion: 'Balcarce',
  firma: 'Hernán Accomo',
  portada: PORTADA,
  fotos: [FOTO_1, FOTO_2],
  slug: 'inauguraron-una-sala-pediatrica-en-el-hospital-municipal',
  cuando: '2026-10-30T12:30:00.000Z',
  por: 'Hernán',
  motivo: 'nota escrita por la redacción',
  ...extra,
});
const una = (e = ENTRADA(), json = null) => notasDeRedaccion(json ?? { notas: { [CLAVE]: e } }, { ahora: AHORA })[0];

test('una entrada completa se arma como nota propia de la redacción: firmada, con relevancia alta, sin fuentes y publicada por una persona', () => {
  const n = una();
  assert.equal(n.propia, 'redaccion');
  assert.equal(n.id, 'nrmg3k9x2ab');
  assert.equal(n.relevancia, RELEVANCIA_DE_REDACCION);
  assert.equal(n.como, 'publicada', 'la publicó una persona: el verificador y el "automática" no se meten');
  assert.equal(n.titulo, 'Inauguraron una sala pediátrica en el Hospital Municipal');
  assert.equal(n.local, true);
  assert.equal(n.autor, 'Hernán Accomo');
  assert.equal(n.firma, 'Por Hernán Accomo, de la redacción de Radar Balcarce');
  assert.equal(n.publicadaPor, 'Hernán');
  assert.equal(n.fecha, '2026-10-30T12:30:00.000Z');
  assert.equal(n.slug, 'inauguraron-una-sala-pediatrica-en-el-hospital-municipal');
  assert.deepEqual(n.medios, []);
  assert.deepEqual(n.fuentesConsultadas, []);
  assert.equal(n.enlace, null);
  assert.equal(n.guion, null, 'no la escribió la IA');
  assert.equal(SECCIONES_DE_REDACCION, SECCIONES_DE_PISTAS, 'las mismas catorce secciones');
  assert.equal(SECCIONES_DE_REDACCION.length, 14);
  // el cuerpo de la nota no trae las marcas de las fotos
  assert.equal(n.cuerpo, `${PARRAFO_1}\n\n${PARRAFO_2}`);
  assert.ok(!/\[foto/i.test(n.cuerpo));
});

test('la foto de portada es la foto de la nota, con epígrafe y crédito; sin portada la nota no trae foto (el sitio pone la placa)', () => {
  assert.deepEqual(una().foto, { archivo: PORTADA.archivo, credito: 'El corte de cinta. Foto: Hernán Accomo' });
  const sin = una(ENTRADA({ portada: null }));
  assert.equal(sin.foto, undefined);
  assert.equal(una(ENTRADA({ portada: { ...PORTADA, epigrafe: '', credito: '' } })).foto.credito, 'Foto: Radar Balcarce', 'la portada siempre tiene algo en el pie');
  assert.equal(leyendaDeFoto('Vista del acto.', 'foto: Hernán Accomo'), 'Vista del acto. Foto: Hernán Accomo');
  assert.equal(leyendaDeFoto('', ''), '');
  assert.equal(leyendaDeFoto('Solo el epígrafe', ''), 'Solo el epígrafe.');
  assert.equal(creditoDeFoto('Foto: Municipalidad'), 'Foto: Municipalidad');
});

test('una entrada sin motivo, cuándo o quién, con fecha mala, sin título o bajada, de una sección que no existe, sin firma o con poco cuerpo no se publica', () => {
  const rechazos = {
    sinMotivo: ENTRADA({ motivo: '' }), sinQuien: ENTRADA({ por: undefined }), sinCuando: ENTRADA({ cuando: undefined }), fechaMala: ENTRADA({ cuando: 'ayer' }),
    sinTitulo: ENTRADA({ titulo: '   ' }), sinBajada: ENTRADA({ copete: '' }), seccion: ENTRADA({ seccion: 'Chimentos' }), sinFirma: ENTRADA({ firma: ' Por  ' }),
    tituloEnorme: ENTRADA({ titulo: 'x'.repeat(300) }), corto: ENTRADA({ cuerpo: 'Muy corto.' }),
  };
  for (const [nombre, e] of Object.entries(rechazos)) {
    assert.ok(motivoDeRechazo(e), nombre);
    assert.equal(una(e), undefined, nombre);
  }
  assert.equal(motivoDeRechazo(ENTRADA()), null);
  assert.ok(motivoDeRechazo(null) && motivoDeRechazo('texto') && motivoDeRechazo([]));
});

test('el cuerpo pide 30 palabras (no 70) y las marcas de las fotos no cuentan; para todo lo demás sigue valiendo 70', () => {
  const palabras = (n) => Array.from({ length: n }, (_, i) => `palabra${String.fromCharCode(97 + (i % 26))}`).join(' ');
  assert.equal(PALABRAS_MINIMAS_CUERPO_DE_REDACCION, 30);
  assert.equal(PALABRAS_MINIMAS_CUERPO, 70);
  assert.equal(motivoDeRechazo(ENTRADA({ cuerpo: palabras(30), fotos: [] })), null, '30 pasan');
  assert.match(motivoDeRechazo(ENTRADA({ cuerpo: palabras(29), fotos: [] })), /cuerpo/, '29 no');
  assert.match(motivoDeRechazo(ENTRADA({ cuerpo: `${palabras(25)}\n\n[foto 1]\n\n[foto 1]`, fotos: [FOTO_1] })), /cuerpo/, 'las marcas no suman palabras');
  assert.equal(palabrasDelCuerpoEscrito(`uno dos\n\n[foto 1]\n\ntres`, 1), 3);
  assert.equal(tieneCuerpo({ propia: 'redaccion', cuerpo: palabras(30), copete: 'otra bajada' }), true);
  assert.equal(tieneCuerpo({ cuerpo: palabras(30), copete: 'otra bajada' }), false, 'una nota común sigue pidiendo 70');
  assert.equal(tieneCuerpo({ propia: 'pista', cuerpo: palabras(30) }), false);
  assert.equal(tieneCuerpo({ propia: 'redaccion', cuerpo: palabras(29) }), false);
  // el cuerpo no puede ser la bajada repetida
  assert.equal(tieneCuerpo({ propia: 'redaccion', copete: palabras(30), cuerpo: palabras(30) }), false);
});

test('una nota de 30 a 69 palabras de la redacción se respeta en todos lados: no es "automática", no pierde la página, se ofrece a Google y entra al archivo', () => {
  const corto = Array.from({ length: 40 }, (_, i) => `dato${i}`).join(' ');
  const n = una(ENTRADA({ cuerpo: corto, fotos: [], portada: null }));
  assert.ok(n);
  assert.equal(esperaCuerpo(n), false);
  assert.equal(noSeOfreceAGoogle(n), false);
  assert.equal(noSeIndexa(n), false, 'no es una plantilla repetida ni está sin cuerpo');
  assert.equal(sePodaPorFaltaDeCuerpo(n), false);
  assert.equal(tieneRespaldo(n), true);
  // entra al archivo cuando está en la portada
  const archivo = actualizarArchivo({ archivo: [], publicadas: [n], enPortada: new Set([n.id]), ahora: AHORA.getTime() });
  assert.deepEqual(archivo.map((x) => x.id), [n.id]);
});

test('el id, la dirección y la fecha son los de la primera vez: editar la nota (título, cuerpo, fotos) no los cambia ni la rejuvenece', () => {
  const antes = una();
  const editada = una(ENTRADA({ titulo: 'Otro título totalmente distinto', cuerpo: `${CUERPO}\n\nUn párrafo nuevo que agregó la redacción al editar.`, editada: '2026-10-31T09:00:00.000Z', editadaPor: 'Andrés' }));
  assert.equal(editada.id, antes.id);
  assert.equal(editada.slug, antes.slug, 'la dirección sigue siendo la fijada al publicar');
  assert.equal(editada.fecha, antes.fecha, 'la fecha de la nota no rejuvenece');
  assert.equal(editada.publicadaCuando, antes.publicadaCuando);
  assert.equal(editada.titulo, 'Otro título totalmente distinto');
  assert.equal(editada.corregidaCuando, '2026-10-31T09:00:00.000Z', 'lo que se ve es "Actualizado" y la fecha de modificación');
  assert.equal(fechaDeModificacion(editada), '2026-10-31T09:00:00.000Z');
  assert.equal(actualizadaCuando(editada, new Date('2026-10-31T10:00:00Z').getTime()), '2026-10-31T09:00:00.000Z');
  assert.equal(antes.corregidaCuando, undefined);
  // la dirección: con slug guardado nunca depende del título; la fija la web (fijarSlug) y la conserva
  assert.equal(fijarSlug(editada, { [editada.id]: 'una-vieja' }).slug, 'una-vieja', 'lo que ya está en el archivo manda');
  // el id no depende del título ni de la firma
  assert.equal(idDeNotaDeRedaccion(CLAVE), 'nrmg3k9x2ab');
  assert.equal(idDeNotaDeRedaccion('Rmg3-k9X2ab'), 'nrmg3k9x2ab');
  assert.ok(!idDeNotaDeRedaccion('r-a-b').includes('-'), 'un id nunca lleva guiones (la dirección usa lo que va después del último)');
  // un slug que no sirve se ignora (la web arma el del título la primera vez)
  assert.equal(una(ENTRADA({ slug: '../raro/slug' })).slug, undefined);
  assert.equal(fijarSlug(una(ENTRADA({ slug: 'MAL SLUG' })), {}).slug, slugDe(una().titulo));
});

test('una nota retirada, vencida o rota no sale y no rompe a las otras', () => {
  const json = {
    notas: {
      rok: ENTRADA(),
      rretirada: ENTRADA({ retirada: { cuando: '2026-10-30T13:00:00Z', por: 'Hernán', motivo: 'error' }, titulo: 'Retirada' }),
      rvieja: ENTRADA({ cuando: '2026-01-01T00:00:00Z', titulo: 'Vieja' }),
      rrota: null, rtexto: 'hola', rvacia: {}, rarray: [],
    },
  };
  const notas = notasDeRedaccion(json, { ahora: AHORA });
  assert.deepEqual(notas.map((n) => n.titulo), ['Inauguraron una sala pediátrica en el Hospital Municipal']);
  assert.deepEqual([...idsRetiradosDeRedaccion(json)], ['nrretirada']);
  assert.equal((AHORA - Date.parse('2026-01-01T00:00:00Z')) / 864e5 > DIAS_DE_UNA_NOTA_DE_REDACCION, true);
  for (const roto of [null, undefined, 'x', 5, [], {}, { notas: null }, { notas: 'x' }, { notas: [1, 2] }]) assert.deepEqual(notasDeRedaccion(roto, { ahora: AHORA }), [], String(roto));
  assert.deepEqual([...idsRetiradosDeRedaccion(null)], []);
});

test('partir el cuerpo: las fotos van entre los párrafos donde están sus marcas, las que no tienen marca van al final', () => {
  const p = partirCuerpo(CUERPO, 2);
  assert.deepEqual(p.parrafos, [PARRAFO_1, PARRAFO_2]);
  assert.deepEqual(p.fotosEn, [{ n: 1, despuesDe: 1 }, { n: 2, despuesDe: 2 }]);
  assert.deepEqual(p.sinMarca, []);

  // foto 2 sin marca: va al final, después de todo
  const sinMarca = partirCuerpo(`${PARRAFO_1}\n\n[foto 1]\n\n${PARRAFO_2}`, 2);
  assert.deepEqual(sinMarca.fotosEn, [{ n: 1, despuesDe: 1 }, { n: 2, despuesDe: 2 }]);
  assert.deepEqual(sinMarca.sinMarca, [2]);

  // una foto al principio, antes del primer párrafo; mayúsculas y espacios en la marca (el teclado del celular pone la F mayúscula)
  const alPrincipio = partirCuerpo(`[Foto 2]\n\n${PARRAFO_1}\n  [ FOTO1 ]  \n${PARRAFO_2}`, 2);
  assert.deepEqual(alPrincipio.fotosEn, [{ n: 2, despuesDe: 0 }, { n: 1, despuesDe: 1 }]);
  assert.deepEqual(alPrincipio.parrafos, [PARRAFO_1, PARRAFO_2], 'una marca corta el párrafo aunque no haya línea en blanco');

  // las líneas de un mismo párrafo se juntan; CRLF y espacios de más no molestan
  assert.deepEqual(partirCuerpo('Una línea\r\ncontinúa acá   \r\n\r\n\r\n\r\nOtro párrafo', 0).parrafos, ['Una línea continúa acá', 'Otro párrafo']);

  // una marca de una foto que no existe se descarta; la segunda marca de una misma foto, también
  const mala = partirCuerpo(`${PARRAFO_1}\n\n[foto 5]\n\n[foto 1]\n\n[foto 1]\n\n${PARRAFO_2}`, 1);
  assert.deepEqual(mala.invalidas, [5]);
  assert.deepEqual(mala.repetidas, [1]);
  assert.deepEqual(mala.fotosEn, [{ n: 1, despuesDe: 1 }]);
  assert.ok(!mala.parrafos.some((x) => /foto/i.test(x)));

  // una marca pegada a un texto no es una marca: se saca del párrafo y se avisa (el panel no deja publicarla)
  const suelta = partirCuerpo('Mirá [foto 1] esto que pasó en la sala nueva.', 1);
  assert.deepEqual(suelta.parrafos, ['Mirá esto que pasó en la sala nueva.']);
  assert.equal(suelta.sueltas.length, 1);
  assert.deepEqual(suelta.sinMarca, [1]);

  assert.equal(cuerpoPlano(CUERPO, 2), `${PARRAFO_1}\n\n${PARRAFO_2}`);
  assert.deepEqual(partirCuerpo('', 0), { parrafos: [], fotosEn: [], sinMarca: [], invalidas: [], repetidas: [], sueltas: [] });
});

test('las fotos de adentro quedan con su lugar (despuesDe), su pie y su tamaño; las rotas se saltean sin tirar la nota', () => {
  const n = una();
  assert.deepEqual(n.fotosEnCuerpo.map((f) => [f.archivo, f.despuesDe]), [[FOTO_1.archivo, 1], [FOTO_2.archivo, 2]]);
  assert.equal(n.fotosEnCuerpo[0].leyenda, 'La sala nueva. Foto: Hernán Accomo');
  assert.equal(n.fotosEnCuerpo[0].ancho, 1200);
  assert.equal(n.fotosEnCuerpo[1].leyenda, '', 'sin epígrafe ni crédito, va sin pie');
  // una foto cuyo archivo no es de la redacción (otra carpeta, una subcarpeta, un ../) no entra; la nota sí, y las demás fotos conservan su marca
  const rota = una(ENTRADA({ fotos: [{ archivo: '../../etc/passwd' }, FOTO_2, { archivo: 'fotos-notas/redaccion/r1/2.jpg' }, { archivo: 'https://otro.com/x.jpg' }, null, 'x'], portada: { archivo: 'fotos-notas/otra.jpg' }, cuerpo: `${PARRAFO_1}\n\n[foto 2]\n\n${PARRAFO_2}` }));
  assert.ok(rota);
  assert.deepEqual(rota.fotosEnCuerpo.map((f) => f.archivo), [FOTO_2.archivo]);
  assert.equal(rota.fotosEnCuerpo[0].despuesDe, 1);
  assert.equal(rota.foto, undefined, 'una portada que no es de la redacción no entra');
  for (const bueno of ['fotos-notas/redaccion-mg3k-p-ab12.jpg', 'fotos-notas/redaccion-mg3k-3-ab12.png']) assert.equal(esFotoDeRedaccion(bueno), true, bueno);
  for (const malo of ['fotos-notas/redaccion/mg3k/1.jpg', 'fotos-notas/otra.jpg', 'web/public/fotos-notas/redaccion-x.jpg', '/fotos-notas/redaccion-x.jpg', 'fotos-notas/redaccion-x.svg', 'fotos-notas/redaccion-.jpg', 'fotos-notas/redaccion-../x.jpg', '', null]) assert.equal(esFotoDeRedaccion(malo), false, String(malo));
  // más de diez fotos: sólo las diez primeras
  const muchas = Array.from({ length: 12 }, (_, i) => ({ archivo: `fotos-notas/redaccion-mg3k-${i + 1}-ab12.jpg` }));
  assert.equal(una(ENTRADA({ fotos: muchas, cuerpo: CUERPO })).fotosEnCuerpo.length, 10);
});

test('una foto que no está en el disco (ni en R2) se saca de la nota: nunca una imagen rota', () => {
  const n = una();
  const existe = (nombre) => nombre !== 'redaccion-mg3k9x2ab-p-0a1b.jpg' && nombre !== 'redaccion-mg3k9x2ab-2-4e5f.jpg';
  const s = sinLasFotosQueFaltan(n, existe);
  assert.equal(s.foto, undefined);
  assert.deepEqual(s.fotosEnCuerpo.map((f) => f.archivo), [FOTO_1.archivo]);
  assert.equal(sinLasFotosQueFaltan(n, () => true), n, 'si están todas, la misma nota');
  assert.equal(sinLasFotosQueFaltan(n, () => false).fotosEnCuerpo, undefined);
  const otra = { propia: 'dolar', foto: { archivo: 'fotos-notas/x.jpg' } };
  assert.equal(sinLasFotosQueFaltan(otra, () => false), otra, 'sólo toca las de la redacción');
  assert.deepEqual([...archivosDeFotosDeRedaccion({ notas: { r1: ENTRADA() } })].sort(), ['redaccion-mg3k9x2ab-1-2c3d.jpg', 'redaccion-mg3k9x2ab-2-4e5f.jpg', 'redaccion-mg3k9x2ab-p-0a1b.jpg']);
});

test('la firma es la de la persona: se lee como "Por …" en la nota y es el autor (Person) en el marcado; el pie no muestra un "Fuentes" vacío', () => {
  const n = una();
  assert.deepEqual(quienEscribio(n), { reescrita: false, revisada: false, propia: true, persona: 'Hernán Accomo' });
  assert.equal(firmaCorta(n), 'Por Hernán Accomo, de la redacción de Radar Balcarce');
  assert.equal(explicacionDeFirma(n), null);
  assert.deepEqual(autorDeNota(n, 'https://radarbalcarce.com'), { '@type': 'Person', name: 'Hernán Accomo', url: 'https://radarbalcarce.com/quienes-somos' });
  // sin fuentes: el pie es la firma sola (components/verificacion.js: PieConFuentes sin fuentes)
  assert.deepEqual(fuentesDeLaNota(n), []);
  assert.deepEqual(fuentesParaElMarcado(n), { citation: [], isBasedOn: undefined });
  // "Por" de más, espacios de más
  assert.equal(autorDeLaEntrada({ firma: '  Por   Andrés  Gerace ' }), 'Andrés Gerace');
  assert.equal(una(ENTRADA({ firma: 'por Andrés Gerace' })).autor, 'Andrés Gerace');
  assert.equal(firmaDeRedaccion('Andrés Gerace'), 'Por Andrés Gerace, de la redacción de Radar Balcarce');
  // las otras notas propias no cambian
  assert.deepEqual(quienEscribio({ propia: 'dolar' }), { reescrita: false, revisada: false, propia: true });
  assert.deepEqual(quienEscribio({ propia: 'pista', autor: 'Fulano' }), { reescrita: false, revisada: false, propia: true }, 'sólo la de la redacción trae persona');
  assert.equal(autorDeNota({ propia: 'dolar' }, 'https://x').name, 'Radar Balcarce');
  assert.equal(autorDeNota({ propia: 'dolar' }, 'https://x')['@type'], 'Organization');
});

test('no sale sola a Facebook, Instagram ni a los videos: es una nota propia que no pidió las redes (decisión abierta en PENDIENTES.md)', () => {
  const n = una();
  assert.equal(esNotaPropia(n), true);
  assert.equal(quedaAfueraDeLasRedes(n), true);
  assert.equal(vaAFacebookPorLoQueEs(n), false);
  assert.equal(sePuedeEnUnRepaso(n), false);
  assert.ok(!('aprobadaParaRedes' in n) && !('paraElRepaso' in n));
  assert.match(leer('PENDIENTES.md'), /notas de la redacción[\s\S]{0,400}redes|redes[\s\S]{0,400}notas de la redacción/i, 'la decisión abierta está anotada');
});

test('el cuerpo con fotos se arma en orden, con ancho y alto, texto alternativo y pie; sin fotos no cambia nada', () => {
  const n = una();
  const partes = partesDelCuerpo(n, { urlFoto: (a) => `https://fotos.radarbalcarce.com/${a}`, dimensiones: () => null });
  assert.deepEqual(partes.map((p) => p.tipo), ['parrafo', 'foto', 'parrafo', 'foto']);
  assert.deepEqual(partes[1], { tipo: 'foto', src: `https://fotos.radarbalcarce.com/${FOTO_1.archivo}`, ancho: 1200, alto: 800, alt: 'La sala nueva', leyenda: 'La sala nueva. Foto: Hernán Accomo' });
  assert.equal(partes[3].alt, n.titulo, 'sin epígrafe, el texto alternativo es el título');
  assert.deepEqual([partes[3].ancho, partes[3].alto], [800, 1200]);
  assert.equal(partes[3].leyenda, '');
  // una foto sin medidas guardadas se mide (si se puede) y, si no, reserva un tamaño para que la página no se mueva
  const sinMedidas = { ...n, fotosEnCuerpo: [{ archivo: FOTO_1.archivo, despuesDe: 0, leyenda: '' }] };
  assert.deepEqual(partesDelCuerpo(sinMedidas, { dimensiones: () => ({ ancho: 900, alto: 600 }) })[0].ancho, 900);
  const reservada = partesDelCuerpo(sinMedidas)[0];
  assert.deepEqual([reservada.ancho, reservada.alto], [TAMANO_DE_RESERVA.ancho, TAMANO_DE_RESERVA.alto]);
  // lo que está después del último párrafo va al final; antes del primero, al principio
  const extremos = partesDelCuerpo({ cuerpo: 'A\n\nB', fotosEnCuerpo: [{ archivo: 'x.jpg', despuesDe: 0 }, { archivo: 'y.jpg', despuesDe: 99 }] });
  assert.deepEqual(extremos.map((p) => p.tipo), ['foto', 'parrafo', 'parrafo', 'foto']);
  // sin fotos: los mismos párrafos de siempre
  assert.deepEqual(partesDelCuerpo({ cuerpo: 'Uno\n\nDos' }).map((p) => p.tipo), ['parrafo', 'parrafo']);
  assert.deepEqual(partesDelCuerpo({}), []);
});

test('la página de la nota dibuja las fotos entre los párrafos en una <figure> con su pie, con tamaño y carga diferida, y las demás notas siguen como estaban', () => {
  const componente = leer('web/components/cuerpo-con-fotos.js');
  assert.match(componente, /<figure /);
  assert.match(componente, /<figcaption /);
  assert.match(componente, /loading="lazy"/);
  assert.match(componente, /width=\{p\.ancho\}/);
  assert.match(componente, /height=\{p\.alto\}/);
  assert.match(componente, /alt=\{p\.alt\}/);
  assert.match(componente, /partesDelCuerpo\(nota/);
  assert.match(componente, /p\.leyenda &&/, 'sin pie no hay <figcaption> vacío');
  const pagina = leer('web/app/nota/[id]/page.js');
  assert.match(pagina, /import CuerpoConFotos from '@\/components\/cuerpo-con-fotos'/);
  assert.match(pagina, /n\.fotosEnCuerpo\?\.length > 0 && <CuerpoConFotos nota=\{n\} \/>/);
  assert.match(pagina, /!\(n\.fotosEnCuerpo\?\.length > 0\) && parrafosConEnlaces\(n\.cuerpo, n\.enlacesEnTexto\)/, 'las notas sin fotos de adentro se dibujan como siempre');
  assert.match(pagina, /\{!n\.foto && n\.propia === 'redaccion' && <PlacaSeccion seccion=\{n\.seccion\} chica \/>\}/, 'sin portada, la placa de la sección');
  assert.match(pagina, /n\.propia === 'redaccion' && n\.autor && <p className="autor-de-la-nota"/, 'la firma también arriba, como en un diario');
  assert.match(pagina, /<FuentesDeLaNota nota=\{n\} \/>/);
  assert.match(leer('web/lib/cuerpo-con-fotos.js'), /^import \{ parrafosConEnlaces \} from '\.\/enlaces-en-texto\.js';$/m, 'la lógica no importa nada con "@/" ni de afuera');
});

test('las fotos de la redacción no se podan nunca (el celular las sube antes que la nota) y no son del banco', () => {
  const r = podarFotos({ banco: {}, enDisco: ['redaccion-mg3k9x2ab-p-0a1b.jpg', 'redaccion-mg3k9x2ab-1-2c3d.jpg', 'huerfana.jpg', 'clima-sol-1.jpg'], quedan: new Set(), retiradas: new Set() });
  assert.deepEqual(r.borrar, ['huerfana.jpg']);
  const g = leer('web/scripts/fotos-notas.mjs');
  assert.match(g, /const DE_NOTA_PROPIA = \/\^\(collage-\|libre-\|clima-\|efemeride\|redaccion-\)\//);
  assert.equal(fs.existsSync(path.join(RAIZ, 'web/public/fotos-notas/redaccion')), false, 'nada de subcarpetas: el sitio, el archivo en R2 y la poda leen web/public/fotos-notas/ plano');
});

test('si un día las fotos pasan a R2 (FOTOS_EN_R2), las de adentro de una nota de la redacción también se piden y viajan: la carpeta es plana', () => {
  const n = una();
  assert.deepEqual(fotosQueNecesitan([n]), ['redaccion-mg3k9x2ab-p-0a1b.jpg', 'redaccion-mg3k9x2ab-1-2c3d.jpg', 'redaccion-mg3k9x2ab-2-4e5f.jpg']);
  assert.deepEqual(fotosQueNecesitan([{ foto: { archivo: 'fotos-notas/abc.jpg' } }]), ['abc.jpg'], 'las demás notas, como siempre');
  for (const nombre of ['redaccion-mg3k9x2ab-p-0a1b.jpg']) {
    assert.equal(esRutaDeFoto(`web/public/fotos-notas/${nombre}`), true);
    assert.equal(sePuedeMoverAR2(nombre), true);
  }
  assert.equal(esRutaDeFoto('web/public/fotos-notas/redaccion/mg3k9x2ab/1.jpg'), false, 'una subcarpeta no se movería a R2: por eso las fotos van planas');
});

test('generar-datos lee el archivo, arma las notas con las demás propias, saca las retiradas del archivo y no deja que lo viejo pise una edición', () => {
  const g = leer('web/scripts/generar-datos.mjs');
  assert.match(g, /import \{ notasDeRedaccion, idsRetiradosDeRedaccion, sinLasFotosQueFaltan \} from '\.\.\/lib\/notas-de-redaccion\.js'/);
  assert.match(g, /const NOTAS_DE_REDACCION = path\.join\(AQUI, '\.\.', 'data', 'notas-de-redaccion\.json'\)/);
  assert.match(g, /\.\.\.repasos, \.\.\.notasDeRedaccion\(leerJson\(NOTAS_DE_REDACCION, null\)\)\]/);
  assert.match(g, /for \(const id of idsRetiradosDeRedaccion\(leerJson\(NOTAS_DE_REDACCION, null\)\)\) retiradas\.add\(id\);/);
  assert.match(g, /\.map\(\(n\) => sinLasFotosQueFaltan\(n, existeFoto\)\)/);
  assert.match(g, /n\.propia === 'redaccion' \? \{ foto: undefined, fotosEnCuerpo: undefined, corregidaCuando: undefined, \.\.\.n \}/);
  // lo que hace ese `undefined`: la edición que saca la portada o una foto no arrastra lo viejo del archivo
  const previa = { ...una(), foto: { archivo: PORTADA.archivo, credito: 'x' }, fotosEnCuerpo: [{ archivo: FOTO_1.archivo, despuesDe: 0 }] };
  const editada = { foto: undefined, fotosEnCuerpo: undefined, corregidaCuando: undefined, ...una(ENTRADA({ portada: null, fotos: [], cuerpo: PARRAFO_1 + ' ' + PARRAFO_2 })) };
  const archivo = actualizarArchivo({ archivo: [previa], publicadas: [editada], enPortada: new Set(), ahora: AHORA.getTime() });
  assert.equal(archivo[0].foto, undefined);
  assert.equal(archivo[0].fotosEnCuerpo, undefined);
  // retirada: la saca del archivo
  const sin = actualizarArchivo({ archivo: [previa], publicadas: [], retiradas: idsRetiradosDeRedaccion({ notas: { [CLAVE]: ENTRADA({ retirada: { cuando: 'x', por: 'y', motivo: 'z' } }) } }), ahora: AHORA.getTime() });
  assert.deepEqual(sin, []);
});

test('llega al sitio: es un archivo que escribe sólo el celular (no está en lo que guarda el motor), obliga a recompilar y su carpeta de fotos ya viaja con el motor', () => {
  const archivo = 'web/data/notas-de-redaccion.json';
  const j = JSON.parse(leer(archivo));
  assert.equal(typeof j.notas, 'object');
  assert.deepEqual(Object.keys(j), ['notas']);
  assert.match(leer('web/public/panel/github.js'), /notasDeRedaccion: 'web\/data\/notas-de-redaccion\.json'/);
  // Cambiar el archivo o sumar una foto obliga a recompilar (si no, la nota no saldría hasta el próximo cambio de otra cosa).
  for (const a of [archivo, 'web/public/fotos-notas/redaccion-mg3k9x2ab-p-0a1b.jpg']) {
    assert.equal(hayQueRecompilar([a]).recompilar, true, a);
    assert.ok(!NO_CAMBIAN_EL_SITIO.some((r) => r.test(a)) && !SOLO_PARA_ARMAR_LOS_DATOS.some((r) => r.test(a)), a);
  }
  // La lista del motor es la del `git add` de actualizar.yml (lo prueba motor-cloudflare.test.mjs): lo que ESCRIBE la vuelta. Éste lo escribe el celular, como
  // celular-decisiones.json, correcciones.json y notas-de-pistas.json: no va en ninguna de las dos (si estuviera, el motor lo pisaría con su copia vieja).
  const workflow = leer('.github/workflows/actualizar.yml');
  const gitAdd = workflow.split('\n').find((l) => /^\s*git add web\/data\/portada\.json/.test(l));
  assert.ok(gitAdd);
  assert.ok(!gitAdd.includes('notas-de-redaccion'));
  assert.ok(!ARCHIVOS_DEL_MOTOR.includes(archivo));
  assert.ok(ARCHIVOS_DEL_MOTOR.includes('web/public/fotos-notas/'), 'las fotos nuevas viajan con la carpeta que ya guarda el motor');
  assert.ok(gitAdd.includes('web/public/fotos-notas/'));
  // Las tareas del Worker no leen ni escriben este archivo: ninguna lo necesita.
  assert.ok(!leer('infra/tareas-cloudflare/tareas.mjs').includes('notas-de-redaccion'));
  // sin dependencias de afuera: la lib sólo importa lo de web/lib
  const imports = [...leer('web/lib/notas-de-redaccion.js').matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
  assert.deepEqual(imports.sort(), ['./cuerpo.js', './notas-de-pistas.js']);
});
