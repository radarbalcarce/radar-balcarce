// La pestaña "Escribir" del panel del celular (30/10/2026, Hernán: "que en el panel yo pueda publicar notas directamente, donde tenga que solo pegar título,
// copete y cuerpo de la nota, además de subir fotos para poner entre la nota, más la de portada y quién firma … y en qué tamaño deberían estar las
// imágenes"). Sin red y sin navegador: se prueba lo que no toca el DOM (medidas, marcas, controles, armado de lo que se guarda y de la pantalla). El lienzo
// y GitHub (achicarFoto, publicarRedaccion en app.js) se controlan por su texto y se probaron a mano; ver docs/09-PANEL.md, «Escribir una nota».

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  MEDIDAS, PLAN_DE_ACHIQUE, MAXIMO_DE_FOTOS, AUTOR_POR_DEFECTO, MINIMO_DE_PALABRAS, AVISO_DE_MENORES, MOTIVO_DE_LA_NOTA,
  medidasAchicadas, pesoLegible, avisosDeUnaFoto, slugDe, claveNueva, idDeNotaDeRedaccion, nombreDeFoto, rutaDelRepositorio, archivoDeLaWeb, tokenNuevo, enlaceDeLaNota,
  marcaDeFoto, normalizarCuerpo, insertarMarca, quitarFotoDelCuerpo, partirCuerpo, palabrasDelCuerpo, creditoDeFoto, leyendaDeFoto, autorDeLaFirma,
  problemasDelFormulario, avisosDelFormulario, armarEntrada, formularioDesdeLaEntrada, formularioVacio, borradorDelFormulario, borradorTieneAlgo, formularioDesdeElBorrador,
  htmlDelFormulario, htmlDeLaVistaPrevia, htmlDeMisNotas,
} from '../web/public/panel/escribir.js';
import {
  ARCHIVOS, formatear, conNotaDeRedaccion, conNotaDeRedaccionRetirada, conNotaDeRedaccionRepuesta, seccionesDelPanel,
} from '../web/public/panel/github.js';
import {
  notasDeRedaccion, motivoDeRechazo, partirCuerpo as partirCuerpoDeLaLib, idDeNotaDeRedaccion as idDeLaLib, creditoDeFoto as creditoDeLaLib, leyendaDeFoto as leyendaDeLaLib,
  esFotoDeRedaccion, autorDeLaEntrada, SECCIONES_DE_REDACCION, MAXIMO_DE_FOTOS_EN_UNA_NOTA, AUTOR_POR_DEFECTO as AUTOR_DE_LA_LIB, palabrasDelCuerpoEscrito,
} from '../web/lib/notas-de-redaccion.js';
import { slugDe as slugDeLaWeb } from '../web/lib/ruta.js';
import { PESTANAS } from '../web/public/panel/textos.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\r\n/g, '\n');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const chip = (s) => `<chip>${s}</chip>`;
const AHORA = new Date('2026-10-30T15:00:00Z');
const P1 = 'El Hospital Municipal inauguró una sala nueva de atención pediátrica con cuatro camas, equipamiento donado por la Cooperativa y una guardia reforzada para el invierno.';
const P2 = 'El intendente destacó el trabajo del personal y anunció que en noviembre se suman dos pediatras más al servicio de guardia del hospital.';

const FORM = (extra = {}) => ({
  ...formularioVacio('Hernán Accomo', 'rmg3k9x2ab'),
  titulo: 'Inauguraron una sala pediátrica en el Hospital Municipal',
  copete: 'Tiene cuatro camas y equipamiento donado por la Cooperativa.',
  cuerpo: `${P1}\n\n[foto 1]\n\n${P2}`,
  portada: { archivo: 'fotos-notas/redaccion-mg3k9x2ab-p-0a1b.jpg', ancho: 1600, alto: 900, epigrafe: 'El corte de cinta', credito: 'Hernán Accomo' },
  fotos: [{ archivo: 'fotos-notas/redaccion-mg3k9x2ab-1-2c3d.jpg', ancho: 1200, alto: 800, epigrafe: 'La sala nueva', credito: 'Hernán Accomo' }],
  ...extra,
});

// ------------------------------------------------------------------ las medidas

test('las fotos se achican a 1600 px (portada) y 1200 px (de adentro), sin agrandar nunca, y lo más largo nunca pasa del máximo', () => {
  assert.deepEqual([MEDIDAS.portada.ancho, MEDIDAS.portada.alto, MEDIDAS.portada.proporcion], [1600, 900, '16:9']);
  assert.equal(MEDIDAS.interna.ancho, 1200);
  assert.equal(MEDIDAS.bytesMaximos, 400 * 1024);
  assert.equal(MEDIDAS.calidad, 0.82);
  assert.equal(PLAN_DE_ACHIQUE[0].calidad, 0.82);
  // una foto de celular de 4000 × 3000 (4:3): la portada baja a 1600 × 1200 y la de adentro a 1200 × 900
  assert.deepEqual(medidasAchicadas({ ancho: 4000, alto: 3000 }, 1600), { ancho: 1600, alto: 1200, escala: 0.4 });
  assert.deepEqual(medidasAchicadas({ ancho: 4000, alto: 3000 }, 1200), { ancho: 1200, alto: 900, escala: 0.3 });
  // una vertical se achica por el alto
  assert.deepEqual(medidasAchicadas({ ancho: 3000, alto: 4000 }, 1200), { ancho: 900, alto: 1200, escala: 0.3 });
  // la panorámica 16:9 de 1920 × 1080 llega a 1600 × 900
  assert.deepEqual(medidasAchicadas({ ancho: 1920, alto: 1080 }, 1600), { ancho: 1600, alto: 900, escala: 1600 / 1920 });
  // una foto chica no se agranda
  assert.deepEqual(medidasAchicadas({ ancho: 800, alto: 600 }, 1600), { ancho: 800, alto: 600, escala: 1 });
  assert.deepEqual(medidasAchicadas({ ancho: 0, alto: 0 }, 1200), { ancho: 1, alto: 1, escala: 1 });
});

test('el plan para que entre en 400 KB baja la calidad primero y el tamaño después, y cada paso pesa menos que el anterior', () => {
  const peso = (p) => p.calidad * p.escala * p.escala;
  for (let i = 1; i < PLAN_DE_ACHIQUE.length; i += 1) assert.ok(peso(PLAN_DE_ACHIQUE[i]) < peso(PLAN_DE_ACHIQUE[i - 1]), `paso ${i}`);
  assert.deepEqual(PLAN_DE_ACHIQUE.slice(0, 4).map((p) => p.escala), [1, 1, 1, 1], 'primero sólo la calidad');
  assert.ok(PLAN_DE_ACHIQUE.at(-1).escala < 1 && PLAN_DE_ACHIQUE.at(-1).calidad >= 0.4, 'al final, más chica pero no destruida');
  assert.equal(pesoLegible(340 * 1024), '340 KB');
  assert.equal(pesoLegible(1.2 * 1024 * 1024), '1,2 MB');
  assert.equal(pesoLegible(0), '1 KB');
});

test('los avisos de una foto dicen cuándo la portada queda chica o se recorta mucho, y nunca bloquean', () => {
  assert.deepEqual(avisosDeUnaFoto({ ancho: 1600, alto: 900 }, 'portada'), []);
  assert.deepEqual(avisosDeUnaFoto({ ancho: 1600, alto: 1200 }, 'portada'), [], '4:3 se recorta un poco y está bien');
  assert.match(avisosDeUnaFoto({ ancho: 900, alto: 506 }, 'portada')[0], /chica.*1200/);
  assert.match(avisosDeUnaFoto({ ancho: 1200, alto: 1600 }, 'portada')[0], /alta.*recortada/);
  assert.deepEqual(avisosDeUnaFoto({ ancho: 1600, alto: 1067 }, 'portada'), [], '3:2, la proporción de una cámara, está bien');
  assert.deepEqual(avisosDeUnaFoto({ ancho: 1280, alto: 1024 }, 'portada'), [], '5:4 todavía está bien');
  assert.match(avisosDeUnaFoto({ ancho: 1600, alto: 600 }, 'portada')[0], /ancha.*costados/);
  assert.deepEqual(avisosDeUnaFoto({ ancho: 1200, alto: 1600 }, 'interna'), [], 'adentro de la nota se ve entera: no se recorta');
  assert.match(avisosDeUnaFoto({ ancho: 400, alto: 300 }, 'interna')[0], /muy chica/);
});

// ------------------------------------------------------------------ lo que repite la web, igual que la web

test('lo que el panel repite de web/lib da lo mismo que la web (la dirección, el id, el pie de una foto, las marcas, las palabras)', () => {
  for (const t of ['Inauguraron una sala pediátrica en el Hospital Municipal', 'Ñandú, niño y "comillas": ¿qué pasó?', '', '   ', 'x'.repeat(120), 'Un título larguísimo que sigue y sigue y sigue hasta pasar el límite de la dirección de una nota']) {
    assert.equal(slugDe(t), slugDeLaWeb(t), t);
  }
  for (const c of ['rmg3k9x2ab', 'Rmg3-k9X2ab', 'r', '', 'abc', undefined]) assert.equal(idDeNotaDeRedaccion(c), idDeLaLib(c), String(c));
  for (const c of ['', 'Foto: Hernán', 'hernán  accomo', 'x'.repeat(200), null]) assert.equal(creditoDeFoto(c), creditoDeLaLib(c), String(c));
  for (const [e, c] of [['Vista del acto.', 'Hernán'], ['', ''], ['Sin punto', ''], ['', 'Municipalidad'], ['  espacios   de más  ', 'foto: X']]) assert.equal(leyendaDeFoto(e, c), leyendaDeLaLib(e, c));
  const cuerpos = [
    '', 'uno', `${P1}\n\n[foto 1]\n\n${P2}`, `[Foto 2]\n\n${P1}\n  [ FOTO1 ]  \n${P2}`, 'Mirá [foto 1] esto.', `${P1}\n\n[foto 9]\n\n[foto 1]\n\n[foto 1]`, 'a\r\nb\r\n\r\n\r\n\r\nc', `${P1}\n[foto 1]\n[foto 2]`,
  ];
  for (const c of cuerpos) for (const n of [0, 1, 2, 3]) {
    assert.deepEqual(partirCuerpo(c, n), partirCuerpoDeLaLib(c, n), `${JSON.stringify(c)} con ${n} fotos`);
    assert.equal(palabrasDelCuerpo(c, n), palabrasDelCuerpoEscrito(c, n));
  }
  assert.equal(AUTOR_POR_DEFECTO, AUTOR_DE_LA_LIB);
  assert.equal(MAXIMO_DE_FOTOS, MAXIMO_DE_FOTOS_EN_UNA_NOTA);
  for (const f of ['Por Hernán', ' por   Hernán  Accomo', 'Por', 'por ', 'Hernán Accomo', 'Porfirio Díaz', '']) assert.equal(autorDeLaFirma(f), autorDeLaEntrada({ firma: f }), f);
  assert.equal(autorDeLaFirma('Porfirio Díaz'), 'Porfirio Díaz', '"Por" sólo se saca si es una palabra aparte');
  assert.equal(seccionesDelPanel().length, 14, 'las catorce');
  assert.deepEqual([...seccionesDelPanel()].sort(), [...SECCIONES_DE_REDACCION].sort(), 'el panel y la web ofrecen las mismas secciones');
});

test('la clave de una nota nueva no depende del título, es corta y sólo letras y números; el nombre de cada foto va en una sola carpeta y la web lo acepta', () => {
  const k = claveNueva(Date.parse('2026-10-30T15:00:00Z'), () => 0.5);
  assert.match(k, /^r[a-z0-9]{8,14}$/);
  assert.equal(k, claveNueva(Date.parse('2026-10-30T15:00:00Z'), () => 0.5), 'determinista con el mismo reloj y el mismo azar');
  assert.notEqual(k, claveNueva(Date.parse('2026-10-30T15:00:01Z'), () => 0.5));
  assert.notEqual(k, claveNueva(Date.parse('2026-10-30T15:00:00Z'), () => 0.9));
  assert.match(claveNueva(), /^r[a-z0-9]+$/);
  assert.match(tokenNuevo(() => 0), /^0000$/);
  assert.match(tokenNuevo(), /^[a-z0-9]{4}$/);
  const portada = nombreDeFoto('rmg3k9x2ab', 'portada', 'ab12');
  const interna = nombreDeFoto('rmg3k9x2ab', 3, 'cd34');
  assert.equal(portada, 'redaccion-rmg3k9x2ab-p-ab12.jpg');
  assert.equal(interna, 'redaccion-rmg3k9x2ab-3-cd34.jpg');
  assert.equal(rutaDelRepositorio(portada), 'web/public/fotos-notas/redaccion-rmg3k9x2ab-p-ab12.jpg');
  assert.equal(archivoDeLaWeb(portada), 'fotos-notas/redaccion-rmg3k9x2ab-p-ab12.jpg');
  for (const n of [portada, interna]) {
    assert.ok(esFotoDeRedaccion(archivoDeLaWeb(n)), 'la web la acepta');
    assert.ok(!n.includes('/'), 'sin subcarpetas');
    assert.ok(rutaDelRepositorio(n).startsWith('web/public/fotos-notas/') && !rutaDelRepositorio(n).slice('web/public/fotos-notas/'.length).includes('/'));
  }
  assert.equal(enlaceDeLaNota('rmg3k9x2ab', { slug: 'una-nota', titulo: 'Otra' }), 'https://radarbalcarce.com/nota/una-nota-nrmg3k9x2ab');
  assert.equal(enlaceDeLaNota('rmg3k9x2ab', { titulo: 'Una Nota Nueva' }), 'https://radarbalcarce.com/nota/una-nota-nueva-nrmg3k9x2ab');
});

// ------------------------------------------------------------------ el cuerpo y las marcas

test('"Insertar foto N aquí" deja la marca sola en su línea, con una línea en blanco antes y después, en el lugar del cursor', () => {
  assert.deepEqual(insertarMarca('', 0, 1), { texto: '[foto 1]\n\n', posicion: 10 });
  // al final del texto
  let r = insertarMarca(`${P1}`, P1.length, 1);
  assert.equal(r.texto, `${P1}\n\n[foto 1]\n\n`);
  assert.equal(r.posicion, r.texto.length, 'el cursor queda listo para seguir escribiendo');
  // entre dos párrafos, justo en el salto
  const dos = `${P1}\n\n${P2}`;
  r = insertarMarca(dos, P1.length, 2);
  assert.equal(r.texto, `${P1}\n\n[foto 2]\n\n${P2}`);
  assert.equal(r.texto.slice(r.posicion), P2);
  // en el medio de una frase: parte el párrafo
  r = insertarMarca('Primera mitad. Segunda mitad.', 14, 1);
  assert.equal(r.texto, 'Primera mitad.\n\n[foto 1]\n\nSegunda mitad.');
  // pegado al principio
  assert.equal(insertarMarca('Texto', 0, 3).texto, '[foto 3]\n\nTexto');
  // cursor fuera de rango o sin cursor: al final
  assert.equal(insertarMarca('Texto', 999, 1).texto, 'Texto\n\n[foto 1]\n\n');
  assert.equal(insertarMarca('Texto', undefined, 1).texto, 'Texto\n\n[foto 1]\n\n');
  // la marca que inserta es una marca de verdad para la lib
  assert.deepEqual(partirCuerpo(insertarMarca(dos, P1.length, 1).texto, 1).fotosEn, [{ n: 1, despuesDe: 1 }]);
  assert.equal(marcaDeFoto(7), '[foto 7]');
});

test('al sacar una foto desaparece su marca y las que venían después se corren un lugar; el cuerpo se prolija', () => {
  const t = `${P1}\n\n[foto 1]\n\n${P2}\n\n[Foto 2]\n\nCierre.\n\n[foto 3]`;
  assert.equal(quitarFotoDelCuerpo(t, 2), `${P1}\n\n[foto 1]\n\n${P2}\n\nCierre.\n\n[foto 2]`);
  assert.equal(quitarFotoDelCuerpo(t, 1), `${P1}\n\n${P2}\n\n[foto 1]\n\nCierre.\n\n[foto 2]`);
  assert.equal(quitarFotoDelCuerpo(t, 3), `${P1}\n\n[foto 1]\n\n${P2}\n\n[Foto 2]\n\nCierre.`);
  assert.equal(quitarFotoDelCuerpo('Sin marcas', 1), 'Sin marcas');
  assert.equal(normalizarCuerpo('  Uno  \r\n\r\n\r\n\r\nDos \t\n'), 'Uno\n\nDos');
});

// ------------------------------------------------------------------ controlar antes de publicar

test('antes de publicar se controla título, bajada, 30 palabras, marcas de fotos, sección y firma; lo demás son avisos que no bloquean', () => {
  assert.deepEqual(problemasDelFormulario(FORM()), []);
  const campos = (f) => problemasDelFormulario(f).map((p) => p.campo);
  assert.deepEqual(campos(FORM({ titulo: ' ' })), ['titulo']);
  assert.deepEqual(campos(FORM({ titulo: 'x'.repeat(151) })), ['titulo']);
  assert.deepEqual(campos(FORM({ copete: '' })), ['copete']);
  assert.deepEqual(campos(FORM({ seccion: 'Chimentos' })), ['seccion']);
  assert.deepEqual(campos(FORM({ firma: 'Por ' })), ['firma']);
  assert.match(problemasDelFormulario(FORM({ cuerpo: 'Muy corto' }))[0].texto, /2 palabras: hacen falta 30/);
  assert.equal(problemasDelFormulario(FORM({ cuerpo: Array.from({ length: 30 }, (_, i) => `p${i}`).join(' '), fotos: [] })).length, 0, '30 palabras pasan');
  assert.equal(problemasDelFormulario(FORM({ cuerpo: `${Array.from({ length: 29 }, (_, i) => `p${i}`).join(' ')}\n\n[foto 1]` })).length, 1, 'la marca no suma palabras');
  // una marca de una foto que no está subida
  assert.match(problemasDelFormulario(FORM({ cuerpo: `${P1}\n\n[foto 4]\n\n${P2}` }))[0].texto, /\[foto 4\].*no está subida/);
  // una marca pegada a un texto
  assert.match(problemasDelFormulario(FORM({ cuerpo: `${P1} [foto 1] ${P2}` }))[0].texto, /sola en su línea/);
  // más fotos de las que entran
  assert.deepEqual(campos(FORM({ fotos: Array.from({ length: 11 }, (_, i) => ({ archivo: `fotos-notas/redaccion-x-${i}-ab12.jpg` })) })), ['fotos']);
  // avisos
  assert.deepEqual(avisosDelFormulario(FORM()), []);
  assert.ok(avisosDelFormulario(FORM({ portada: null })).some((a) => /placa/.test(a)));
  assert.ok(avisosDelFormulario(FORM({ cuerpo: `${P1}\n\n${P2}` })).some((a) => /foto 1 no tiene su marca.*al final/.test(a)));
  assert.ok(avisosDelFormulario(FORM({ cuerpo: `${P1}\n\n[foto 1]\n\n[foto 1]\n\n${P2}` })).some((a) => /más de una vez/.test(a)));
  assert.ok(avisosDelFormulario(FORM({ titulo: 'x'.repeat(100) })).some((a) => /se corta/.test(a)));
  assert.match(AVISO_DE_MENORES, /menores.*víctimas de delitos sexuales o violencia de género/);
  assert.equal(MINIMO_DE_PALABRAS, 30);
});

// ------------------------------------------------------------------ lo que se guarda

test('la entrada que arma el panel la acepta la web tal cual y sale la nota firmada, con sus fotos; es la que se guarda una nota por renglón', () => {
  const entrada = armarEntrada(FORM({ firma: 'Por Hernán Accomo', titulo: '  Inauguraron   una sala  pediátrica en el Hospital Municipal ' }), { por: 'Hernán', ahora: AHORA });
  assert.equal(entrada.titulo, 'Inauguraron una sala pediátrica en el Hospital Municipal');
  assert.equal(entrada.firma, 'Hernán Accomo', 'la firma se guarda sin el "Por"');
  assert.equal(entrada.slug, 'inauguraron-una-sala-pediatrica-en-el-hospital-municipal');
  assert.equal(entrada.cuando, '2026-10-30T15:00:00.000Z');
  assert.equal(entrada.por, 'Hernán');
  assert.equal(entrada.motivo, MOTIVO_DE_LA_NOTA);
  assert.equal(entrada.motivo, 'nota escrita por la redacción');
  assert.equal(entrada.cuerpo, `${P1}\n\n[foto 1]\n\n${P2}`, 'el cuerpo se guarda como se escribió (con las marcas), para poder editarlo');
  assert.deepEqual(entrada.portada, { archivo: 'fotos-notas/redaccion-mg3k9x2ab-p-0a1b.jpg', ancho: 1600, alto: 900, epigrafe: 'El corte de cinta', credito: 'Hernán Accomo' });
  assert.deepEqual(entrada.fotos.map((f) => f.archivo), ['fotos-notas/redaccion-mg3k9x2ab-1-2c3d.jpg']);
  assert.equal(motivoDeRechazo(entrada), null);
  // sin portada
  assert.equal(armarEntrada(FORM({ portada: null }), { por: 'Hernán', ahora: AHORA }).portada, null);
  // el credito escrito "Foto: X" se guarda como "X"
  assert.equal(armarEntrada(FORM({ portada: { archivo: 'fotos-notas/redaccion-a-p-ab12.jpg', credito: 'Foto: Municipalidad' } }), { por: 'H', ahora: AHORA }).portada.credito, 'Municipalidad');
  // una sola línea por nota en el archivo, y la web la arma
  const json = conNotaDeRedaccion({ notas: {} }, 'rmg3k9x2ab', entrada, { ahora: AHORA });
  const texto = formatear(ARCHIVOS.notasDeRedaccion, json);
  assert.equal(texto.trim().split('\n').length, 3, 'abre, una nota por renglón, cierra');
  assert.deepEqual(JSON.parse(texto), json);
  const [nota] = notasDeRedaccion(JSON.parse(texto), { ahora: AHORA });
  assert.equal(nota.id, 'nrmg3k9x2ab');
  assert.equal(nota.autor, 'Hernán Accomo');
  assert.equal(nota.fotosEnCuerpo.length, 1);
  assert.equal(ARCHIVOS.notasDeRedaccion, 'web/data/notas-de-redaccion.json');
});

test('editar una nota ya publicada conserva su dirección, su fecha y quién la publicó, anota la edición y deja la retirada como estaba; la clave no cambia', () => {
  const primera = armarEntrada(FORM(), { por: 'Hernán', ahora: AHORA });
  let json = conNotaDeRedaccion({ notas: {} }, 'rmg3k9x2ab', primera, { ahora: AHORA });
  const despues = new Date('2026-10-31T10:00:00Z');
  const editada = armarEntrada({ ...FORM({ titulo: 'Un título nuevo y distinto' }), slug: null }, { por: 'Andrés', ahora: despues });
  json = conNotaDeRedaccion(json, 'rmg3k9x2ab', editada, { ahora: despues });
  const e = json.notas.rmg3k9x2ab;
  assert.equal(Object.keys(json.notas).length, 1);
  assert.equal(e.titulo, 'Un título nuevo y distinto');
  assert.equal(e.slug, primera.slug, 'la dirección no cambia aunque cambie el título');
  assert.equal(e.cuando, primera.cuando, 'la fecha no rejuvenece');
  assert.equal(e.por, 'Hernán', 'quien la publicó sigue siendo quien la publicó');
  assert.equal(e.editada, '2026-10-31T10:00:00.000Z');
  assert.equal(e.editadaPor, 'Andrés');
  const [n] = notasDeRedaccion(json, { ahora: despues });
  assert.equal(n.fecha, '2026-10-30T15:00:00.000Z');
  assert.equal(n.corregidaCuando, '2026-10-31T10:00:00.000Z');
  assert.equal(n.id, 'nrmg3k9x2ab');
  // retirar y volver a publicar: sólo una marca; no se borra nada
  const retirada = conNotaDeRedaccionRetirada(json, 'rmg3k9x2ab', { por: 'Hernán', motivo: 'error de fecha', ahora: despues });
  assert.deepEqual(retirada.notas.rmg3k9x2ab.retirada, { cuando: '2026-10-31T10:00:00.000Z', por: 'Hernán', motivo: 'error de fecha' });
  assert.deepEqual(notasDeRedaccion(retirada, { ahora: despues }), []);
  assert.equal(retirada.notas.rmg3k9x2ab.fotos.length, 1, 'las fotos y el texto quedan');
  const editandoRetirada = conNotaDeRedaccion(retirada, 'rmg3k9x2ab', editada, { ahora: despues });
  assert.ok(editandoRetirada.notas.rmg3k9x2ab.retirada, 'editar una retirada no la vuelve a publicar sola');
  const repuesta = conNotaDeRedaccionRepuesta(retirada, 'rmg3k9x2ab', { por: 'Hernán', ahora: despues });
  assert.equal(repuesta.notas.rmg3k9x2ab.retirada, undefined);
  assert.equal(notasDeRedaccion(repuesta, { ahora: despues }).length, 1);
  assert.equal(conNotaDeRedaccionRetirada(json, 'otra', { por: 'x', motivo: 'y' }), json, 'una clave que no existe no cambia nada');
  assert.equal(conNotaDeRedaccionRepuesta(json, 'otra', { por: 'x' }), json);
  // el formulario de editar trae lo guardado y ya no es una nota nueva
  const f = formularioDesdeLaEntrada('rmg3k9x2ab', e);
  assert.equal(f.existente, true);
  assert.equal(f.titulo, e.titulo);
  assert.equal(f.cuerpo, primera.cuerpo);
  assert.equal(f.slug, primera.slug);
  assert.deepEqual(f.fotos.map((x) => x.archivo), primera.fotos.map((x) => x.archivo));
  assert.deepEqual(problemasDelFormulario(f), []);
});

test('un formulario vacío trae la última firma y la sección Balcarce; el borrador se guarda sólo con el texto y se retoma sin fotos', () => {
  const v = formularioVacio('Andrés Gerace', 'rabc');
  assert.deepEqual([v.firma, v.seccion, v.existente, v.clave], ['Andrés Gerace', 'Balcarce', false, 'rabc']);
  assert.equal(formularioVacio('', 'rabc').firma, 'Hernán Accomo', 'sin una firma anterior, la de siempre');
  assert.equal(formularioVacio().firma, AUTOR_POR_DEFECTO);
  assert.equal(borradorTieneAlgo(borradorDelFormulario(v)), false, 'un formulario vacío no se guarda como borrador');
  const b = borradorDelFormulario(FORM());
  assert.deepEqual(Object.keys(b).sort(), ['clave', 'copete', 'cuerpo', 'existente', 'firma', 'seccion', 'titulo']);
  assert.equal(JSON.parse(JSON.stringify(b)).titulo, FORM().titulo);
  assert.equal(borradorTieneAlgo(b), true);
  assert.equal(borradorTieneAlgo(null), false);
  const r = formularioDesdeElBorrador(b, 'Hernán Accomo');
  assert.equal(r.cuerpo, FORM().cuerpo);
  assert.equal(r.clave, 'rmg3k9x2ab', 'la clave del borrador se conserva (la dirección no cambia)');
  assert.deepEqual(r.fotos, []);
  assert.equal(r.portada, null);
});

// ------------------------------------------------------------------ la pantalla

test('el formulario trae todo lo que se pidió, con botones grandes, el aviso de menores y el tamaño recomendado; escapa lo que se escribe', () => {
  const h = htmlDelFormulario(FORM({ titulo: 'Con <script>alert(1)</script> y "comillas"' }), { esc });
  for (const campo of ['titulo', 'copete', 'cuerpo', 'seccion', 'firma']) assert.match(h, new RegExp(`data-campo="${campo}"`), campo);
  assert.match(h, /id="w-seccion"[\s\S]*<option selected>Balcarce<\/option>/);
  for (const s of seccionesDelPanel()) assert.ok(h.includes(`<option ${s === 'Balcarce' ? 'selected' : ''}>${s}</option>`), s);
  assert.match(h, /No publiques nombres ni fotos de menores ni de víctimas de delitos sexuales o violencia de género/);
  assert.match(h, /1600 × 900 px \(16:9\)/);
  assert.match(h, /hasta 1200 px de ancho/);
  assert.match(h, /type="file"[^>]*accept="image\/\*"[^>]*data-subir="interna"[^>]*multiple/);
  assert.match(h, /data-accion="insertar-foto" data-n="1"/);
  assert.match(h, /data-accion="vista-previa-redaccion"/);
  assert.match(h, /data-accion="publicar-redaccion"[^>]*>Publicar</);
  assert.match(h, /data-accion="quitar-portada"/);
  assert.match(h, /Insertar foto 1 aquí/);
  assert.ok(!h.includes('<script>alert(1)</script>'), 'se escapa');
  assert.ok(h.includes('Con &lt;script&gt;alert(1)&lt;/script&gt; y &quot;comillas&quot;'));
  assert.match(h, /Sale como “Por Hernán Accomo”/);
  // sin portada: el botón de elegirla
  assert.match(htmlDelFormulario(FORM({ portada: null }), { esc }), /data-subir="portada"/);
  // editando: otro título y otro botón
  const ed = htmlDelFormulario({ ...FORM(), existente: true }, { esc });
  assert.match(ed, /<h1>Editar la nota<\/h1>/);
  assert.match(ed, /Guardar los cambios/);
  assert.match(ed, /data-accion="cancelar-edicion"/);
  assert.match(htmlDelFormulario(FORM(), { esc, procesando: 'Achicando la foto…' }), /Achicando la foto…/);
  // más de diez fotos: ya no ofrece sumar
  assert.ok(!/data-subir="interna"/.test(htmlDelFormulario(FORM({ fotos: Array.from({ length: 10 }, (_, i) => ({ archivo: `fotos-notas/redaccion-x-${i}-ab12.jpg`, ancho: 1200, alto: 800 })) }), { esc })));
});

test('la vista previa muestra la nota como saldría: título, bajada, firma, y cada foto en su lugar con su pie; avisa lo que falta', () => {
  const h = htmlDeLaVistaPrevia(FORM({ cuerpo: `${P1}\n\n[foto 1]\n\n${P2}` }), { esc, chip });
  assert.ok(h.indexOf(P1) < h.indexOf('La sala nueva. Foto: Hernán Accomo') && h.indexOf('La sala nueva. Foto: Hernán Accomo') < h.indexOf(P2), 'la foto está entre los dos párrafos');
  assert.match(h, /<figure class="foto-previa"><img src="\/fotos-notas\/redaccion-mg3k9x2ab-1-2c3d\.jpg" alt="La sala nueva"><figcaption>La sala nueva\. Foto: Hernán Accomo<\/figcaption>/);
  assert.match(h, /marco-portada/);
  assert.match(h, /El corte de cinta\. Foto: Hernán Accomo/);
  assert.match(h, /Inauguraron una sala pediátrica/);
  assert.match(h, /<chip>Balcarce<\/chip>/);
  assert.match(h, /Por <strong>Hernán Accomo<\/strong>/);
  assert.match(h, /data-accion="seguir-editando"/);
  assert.match(h, /data-accion="publicar-redaccion"/);
  assert.ok(!h.includes('[foto'), 'las marcas no se ven');
  // una foto recién elegida (todavía sin subir) se ve con su propia imagen
  const nueva = htmlDeLaVistaPrevia(FORM({ fotos: [{ base64: 'AAAA', ancho: 10, alto: 10, epigrafe: '', credito: '' }] }), { esc, chip });
  assert.match(nueva, /src="data:image\/jpeg;base64,AAAA"/);
  // sin marca: la foto va al final, y lo avisa
  const alFinal = htmlDeLaVistaPrevia(FORM({ cuerpo: `${P1}\n\n${P2}` }), { esc, chip });
  assert.ok(alFinal.indexOf(P2) < alFinal.indexOf('La sala nueva. Foto: Hernán Accomo'));
  assert.match(alFinal, /La foto 1 no tiene su marca en el texto/);
  // con problemas, los muestra
  assert.match(htmlDeLaVistaPrevia(FORM({ titulo: '' }), { esc, chip }), /Antes de publicar:[\s\S]*Falta el título/);
  assert.match(htmlDeLaVistaPrevia(FORM({ portada: null }), { esc, chip }), /Sin foto de portada: va la placa/);
  assert.match(htmlDeLaVistaPrevia({ ...FORM(), existente: true }, { esc, chip }), /Guardar los cambios/);
});

test('"Mis notas publicadas": la más nueva primero, con abrir en la web, editar y retirar; las retiradas se pueden volver a publicar', () => {
  const json = {
    notas: {
      rvieja: { titulo: 'Una nota vieja', seccion: 'Política', firma: 'Andrés Gerace', cuando: '2026-10-28T10:00:00Z', slug: 'una-nota-vieja' },
      rnueva: { titulo: 'La nota <b>nueva</b>', seccion: 'Balcarce', firma: 'Hernán Accomo', cuando: '2026-10-30T10:00:00Z', slug: 'la-nota-nueva', editada: '2026-10-30T11:00:00Z' },
      rretirada: { titulo: 'Retirada', seccion: 'Salud', firma: 'Hernán', cuando: '2026-10-29T10:00:00Z', retirada: { cuando: '2026-10-29T12:00:00Z', por: 'Hernán', motivo: 'se equivocó la fecha' } },
    },
  };
  const h = htmlDeMisNotas(json, { esc, chip, haceCuanto: (i) => `hace ${i.slice(8, 10)}` });
  assert.match(h, /Mis notas publicadas \(3\)/);
  assert.ok(h.indexOf('La nota &lt;b&gt;nueva&lt;/b&gt;') < h.indexOf('Retirada') && h.indexOf('Retirada') < h.indexOf('Una nota vieja'));
  assert.match(h, /href="https:\/\/radarbalcarce\.com\/nota\/la-nota-nueva-nrnueva"/);
  assert.match(h, /data-accion="editar-redaccion" data-clave="rnueva"/);
  assert.match(h, /data-accion="retirar-redaccion" data-clave="rnueva"/);
  assert.match(h, /data-accion="reponer-redaccion" data-clave="rretirada"/);
  assert.ok(!/data-accion="retirar-redaccion" data-clave="rretirada"/.test(h));
  assert.match(h, /retirada: se equivocó la fecha/);
  assert.match(h, /Por Andrés Gerace/);
  assert.match(h, /editada hace 30/);
  assert.ok(!h.includes('<b>nueva</b>'), 'escapado');
  assert.match(htmlDeMisNotas({ notas: {} }, { esc, chip, haceCuanto: () => '' }), /Todavía no publicaste ninguna/);
  assert.match(htmlDeMisNotas(null, { esc, chip, haceCuanto: () => '' }), /Todavía no publicaste ninguna/);
});

// ------------------------------------------------------------------ cómo está enchufado en el panel

test('app.js enchufa la pestaña: menú Más, Hoy, lienzo con orientación EXIF, borrador y firma en localStorage, fotos antes que la nota, y cada botón tiene quien lo atienda', () => {
  const app = leer('web/public/panel/app.js');
  assert.match(app, /from '\.\/escribir\.js'/);
  assert.match(app, /\['escribir', 'Escribir una nota',/);
  assert.match(app, /else if \(E\.pestana === 'escribir'\) vistaEscribir\(\);/);
  assert.match(app, /ACCIONES_DE_ESCRIBIR\.has\(accion\)/);
  // el lienzo: respeta cómo se sacó la foto, JPEG, sin blob: (la política del panel sólo deja data:)
  assert.match(app, /createImageBitmap\(archivo, \{ imageOrientation: 'from-image' \}\)/);
  assert.match(app, /toBlob\(ok, 'image\/jpeg', paso\.calidad\)/);
  assert.match(app, /blob\.size <= MEDIDAS\.bytesMaximos/);
  assert.match(app, /readAsDataURL\(archivo\)/, 'el respaldo para un navegador viejo no usa blob:');
  assert.ok(!/createObjectURL/.test(app), 'ningún blob: (img-src del panel es self y data:)');
  // lo que se escribe queda en el celular
  assert.match(app, /localStorage\.setItem|guardarLocal\(BORRADOR_DE_NOTA/);
  assert.match(app, /const BORRADOR_DE_NOTA = 'radar-panel-borrador-nota'/);
  assert.match(app, /const FIRMA_GUARDADA = 'radar-panel-firma'/);
  assert.match(app, /localStorage\.removeItem\(BORRADOR_DE_NOTA\)/, 'salir también borra el borrador');
  // las fotos se suben ANTES de guardar la nota (y no se suben dos veces si el guardado falla)
  const publicar = app.slice(app.indexOf('async function publicarRedaccion()'), app.indexOf('/** Lo que se ve al publicar'));
  assert.ok(publicar.indexOf('E.cliente.subirArchivo(') > 0 && publicar.indexOf('E.cliente.subirArchivo(') < publicar.indexOf('E.cliente.guardar(ARCHIVOS.notasDeRedaccion'));
  assert.match(publicar, /x\.base64 && !x\.archivo/);
  assert.match(publicar, /foto\.archivo = archivoDeLaWeb\(nombre\)/);
  assert.match(publicar, /Lo que escribiste sigue acá/);
  assert.match(publicar, /problemasDelFormulario\(f\)/);
  assert.match(publicar, /AVISO_DE_MENORES/);
  // después de publicar: aparece en unos minutos y se ofrece actualizar la web
  const resultado = app.slice(app.indexOf('function vistaResultadoRedaccion'), app.indexOf('/** Retirar y volver a publicar'));
  assert.match(resultado, /Aparece en la web en unos minutos/);
  assert.match(resultado, /próxima vuelta del motor/);
  assert.match(resultado, /data-accion="actualizar-web"/);
  assert.match(app, /accion === 'actualizar-web'/, 'ese botón ya lo atiende el panel (regla 317)');
  // todos los botones de escribir.js tienen quien los atienda
  const acciones = new Set([...leer('web/public/panel/escribir.js').matchAll(/data-accion="([a-z-]+)"|data-accion="\$\{([a-z-]+)\}"/g)].map((m) => m[1] ?? m[2]).filter((a) => a && a !== 'quitar'));
  acciones.add('quitar-portada'); acciones.add('quitar-foto');
  const atendidas = new Set([...app.slice(app.indexOf('const ACCIONES_DE_ESCRIBIR = new Set(['), app.indexOf(']);', app.indexOf('const ACCIONES_DE_ESCRIBIR = new Set(['))).matchAll(/'([a-z-]+)'/g)].map((m) => m[1]));
  for (const a of acciones) assert.ok(atendidas.has(a), `nadie atiende "${a}"`);
  for (const a of ['escribir-otra', 'descartar-borrador-redaccion']) assert.ok(atendidas.has(a), a);
  // los archivos del panel
  assert.match(app, /'fotos\.js', 'escribir\.js', 'hoy\.js'/);
  assert.match(leer('web/public/panel/sw.js'), /'\/panel\/escribir\.js'/);
  assert.match(leer('web/public/panel/hoy.js'), /data-pestana="escribir">✍ Escribir una nota</);
  assert.match(leer('web/public/panel/prueba.js'), /'web\/data\/notas-de-redaccion\.json': \{ notas: \{\} \}/);
  assert.ok(PESTANAS.escribir.length > 100 && /sin pasar por la IA/.test(PESTANAS.escribir), 'el "¿Qué es esto?" de la pestaña');
  assert.match(leer('web/public/panel/index.html'), /\.marco-portada \{[^}]*aspect-ratio: 16 \/ 9/);
});

test('la política del panel no cambió: las vistas previas usan data:, nada de afuera', () => {
  const cabeceras = leer('web/public/_headers');
  const linea = cabeceras.split('\n').find((l) => /Content-Security-Policy: default-src 'self'; connect-src 'self' https:\/\/api\.github\.com/.test(l));
  assert.ok(linea, 'la política del panel sigue donde estaba');
  assert.match(linea, /img-src 'self' data:;/);
  assert.ok(!/blob:/.test(linea));
  assert.match(linea, /connect-src 'self' https:\/\/api\.github\.com https:\/\/radar-balcarce-reloj\.radarbalcarce\.workers\.dev;/);
  assert.match(leer('web/public/panel/github.js'), /subirArchivo/, 'ya sube archivos binarios: nada nuevo que permitir');
});

test('la documentación para personas: el paso a paso en docs/09-PANEL.md, la fila en CLAUDE.md y la regla en docs/10-REGLAS-Y-PRUEBAS.md', () => {
  const panel = leer('docs/09-PANEL.md');
  assert.match(panel, /^## Escribir una nota/m);
  assert.match(panel, /1600 × 900/);
  assert.match(panel, /1200 px/);
  assert.match(panel, /\[foto 1\]/);
  const claude = leer('CLAUDE.md');
  assert.match(claude, /web\/data\/notas-de-redaccion\.json/);
  assert.match(claude, /web\/public\/panel\/escribir\.js/);
  const reglas = leer('docs/10-REGLAS-Y-PRUEBAS.md');
  assert.match(reglas, /`notas-de-redaccion`/);
  assert.match(reglas, /`escribir-panel`/);
});
