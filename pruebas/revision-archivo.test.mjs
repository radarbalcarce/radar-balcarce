// Regla 212 (17/10/2026, Hernán: "revisar la totalidad de las notas con algún modelo menor e ir auditando que todas estén bien con sus
// fotos, título, copete y nota… organizalo en tandas, no hay apuro"): la revisión del archivo entero, por tandas, desde el 22/10/2026
// (web/scripts/revisar-archivo.mjs, .github/workflows/revisar-archivo.yml, docs/flujos/REVISION-DEL-ARCHIVO.md). Sin red: la IA es un
// fetchFn de mentira. Los casos reales están en pruebas/datos-fijos/revision-archivo-17-10.json (copiados de web/data/archivo.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  REVISION, estadoVacio, comoRevisionJson, notasConPagina, enElAlcance, pendientes, esDeUnaPersona, motivoParaRetirar, paresDeCambio,
  arreglosQueNoInventan, repetidaDe, revisionDeLaFoto, motivoDeLaVision, fotoRepetidaDeOtroTema, revisarSinIA, revisarTanda, aplicarTanda,
  descartarFoto, porQueNoCorre, apagada, simular, POR,
} from '../web/scripts/revisar-archivo.mjs';
import { idsRetiradosPorLaRevision, parejasDeLaRevision, idsParaIlustrar } from '../web/lib/revision-archivo.js';
import { arreglarEscritura } from '../ingesta/verificar.mjs';
import { conCambiosDeLaAuditoria, cambiosDeLaAuditoria, actualizarArchivo, bajasDelArchivo, podarRetiradas } from '../web/lib/archivo.js';
import { REGLAS_SEMAFORO } from '../ingesta/fuentes.mjs';
import { abrir } from '../panel/cifrado.mjs';
import { elegirCandidatas } from '../web/scripts/ilustrar-notas.mjs';
import { lineasDeLaRevision } from '../redes/informe-diario.mjs';
import { trabajosDelMinuto, HORAS_REVISION_UTC, horaDeBalcarce } from '../infra/reloj-cloudflare/worker.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
const REALES = new Map(JSON.parse(leer('pruebas/datos-fijos/revision-archivo-17-10.json')).notas.map((n) => [n.id, n]));
const real = (id) => structuredClone(REALES.get(id));
const DESPUES = new Date('2026-10-22T05:12:00Z');

const CUERPO = 'El Concejo Deliberante aprobó por unanimidad el proyecto que reordena el tránsito en el centro de la ciudad. La iniciativa prevé nuevas sendas para bicicletas, más lugares para motos y una revisión de los semáforos de la avenida principal, según informaron los concejales en la sesión ordinaria del jueves. El intendente deberá reglamentar la ordenanza en los próximos treinta días y la Dirección de Tránsito tendrá a cargo la señalización, que se hará por etapas a partir del mes que viene, empezando por las calles con más accidentes.';
const nota = (o = {}) => ({
  id: 'n1', titulo: 'El Concejo aprueba el nuevo plan de tránsito para el centro', copete: 'La ordenanza reordena calles y semáforos.', cuerpo: CUERPO,
  seccion: 'Balcarce', medios: ['Radio Gabal (FM 104.1)', 'Diario La Vanguardia'], fecha: '2026-10-01T12:00:00.000Z', visto: '2026-10-01T12:00:00.000Z',
  publicadaCuando: '2026-10-01T12:05:00.000Z', como: 'automatica', publicadaPor: null, local: true, fuentesConsultadas: [], slug: 'el-concejo-aprueba', ...o,
});

// ------------------------------------------------------------------ cuándo y qué

test('regla 212: empieza el 22/10/2026 (antes no hace nada), la variable REVISION_DEL_ARCHIVO en "no" la frena y al terminar no corre más', () => {
  assert.equal(REVISION.desde, '2026-10-22T03:00:00.000Z', 'el jueves 22/10 a las 0 de Balcarce');
  assert.match(porQueNoCorre({ ahora: new Date('2026-10-21T23:00:00-03:00'), env: {} }), /todavía no empieza: arranca el 2026-10-22/);
  assert.equal(porQueNoCorre({ ahora: new Date('2026-10-22T00:05:00-03:00'), env: {} }), null);
  for (const no of ['no', 'No', 'apagada', '0']) assert.match(porQueNoCorre({ ahora: DESPUES, env: { REVISION_DEL_ARCHIVO: no } }), /apagó/, no);
  for (const si of ['', 'si', undefined]) assert.equal(apagada({ REVISION_DEL_ARCHIVO: si }), false);
  const terminada = { ...estadoVacio(), terminada: '2026-11-08T10:00:00.000Z', contadores: { faltan: 0 } };
  assert.match(porQueNoCorre({ ahora: DESPUES, env: {}, estado: terminada }), /ya terminó/);
  // Con una versión nueva del criterio, vuelve a correr.
  assert.equal(porQueNoCorre({ ahora: DESPUES, env: {}, estado: terminada, criterio: { ...REVISION, version: REVISION.version + 1 } }), null);
});

test('regla 212: revisa TODO lo que tiene página (archivo y portada, sin repetir), lo publicado antes de empezar, de lo más viejo a lo más nuevo', () => {
  const vieja = nota({ id: 'v', fecha: '2026-09-03T21:00:00.000Z', visto: '2026-09-03T21:00:00.000Z', publicadaCuando: '2026-09-03T21:10:00.000Z' });
  const media = nota({ id: 'm', fecha: '2026-10-10T12:00:00.000Z', visto: '2026-10-10T12:00:00.000Z', publicadaCuando: '2026-10-10T12:00:00.000Z' });
  const nueva = nota({ id: 'z', fecha: '2026-10-23T12:00:00.000Z', visto: '2026-10-23T12:00:00.000Z', publicadaCuando: '2026-10-23T12:00:00.000Z' });
  const notas = notasConPagina({ archivo: [media, vieja, nueva], portada: [{ ...media, titulo: 'De la portada' }] });
  assert.equal(notas.length, 3);
  assert.equal(notas.find((n) => n.id === 'm').titulo, 'De la portada', 'lo de la portada manda');
  assert.equal(enElAlcance(nueva), false, 'lo publicado desde el 22/10 ya nació con el criterio de hoy');
  assert.deepEqual(pendientes(notas, estadoVacio()).map((n) => n.id), ['v', 'm']);
  // Lo revisado con esta versión ya no falta; con la versión anterior, sí.
  const e = { notas: { v: { v: REVISION.version, r: 'ok', f: 'ok', t: 'ok' }, m: { v: REVISION.version - 1, r: 'ok', f: 'ok', t: 'ok' } } };
  assert.deepEqual(pendientes(notas, e).map((n) => n.id), ['m']);
  // Lo que quedó a medias (una parte pendiente) vuelve.
  assert.deepEqual(pendientes(notas, { notas: { v: { v: REVISION.version, r: 'ok', f: 'pendiente', t: 'ok' } } }).map((n) => n.id), ['v', 'm']);
});

test('regla 212: el tamaño de las tandas termina el archivo en unas dos o tres semanas sin pasar el cupo gratis', () => {
  // ~1.450 notas para el 22/10; ~1.000 con texto para la IA y ~830 fotos sin ficha; 12 tandas por día (cada 2 horas).
  const tandasPorDia = HORAS_REVISION_UTC.length;
  assert.equal(tandasPorDia, 12);
  const dias = Math.max(1000 / (REVISION.textoPorTanda * tandasPorDia), 830 / (REVISION.fotosPorTanda * tandasPorDia));
  assert.ok(dias >= 10 && dias <= 21, `${dias.toFixed(1)} días`);
  // Groq gpt-oss-20b: 1.000 pedidos por día (la Auditoría IA usa ~13); la visión, otros 1.000. Gemini, sólo de respaldo y con tope.
  const pedidosDeTexto = Math.ceil(REVISION.textoPorTanda / REVISION.porPedido) * tandasPorDia;
  assert.ok(pedidosDeTexto <= 50, `${pedidosDeTexto} pedidos de texto por día`);
  assert.ok(REVISION.fotosPorTanda * tandasPorDia <= 100);
  assert.ok(REVISION.geminiPorDia <= 20, 'Gemini casi no se toca: lo necesitan la lectura y la redacción del día');
});

// ------------------------------------------------------------------ (a) lo que no usa IA

test('regla 212 (a): lo que hoy no saldría se retira: los casos reales de "no es nota" (el autobombo de Radio Líder y el pronóstico de Gabal)', () => {
  const lider = motivoParaRetirar(real('1m2za7b'));
  assert.equal(lider.tipo, 'no-es-nota');
  assert.match(lider.motivo, /el medio habla de sí mismo/);
  assert.equal(lider.aUnaPersona, false);
  const clima = motivoParaRetirar(real('i06m20'));
  assert.equal(clima.tipo, 'no-es-nota');
  assert.match(clima.motivo, /pronóstico/);
  // Si fue a las redes (su enlace circula), no se retira solo: lo decide una persona.
  assert.equal(motivoParaRetirar(real('1m2za7b'), { enRedes: true }).aUnaPersona, true);
  // Sin cuerpo, igual.
  const sinCuerpo = motivoParaRetirar(nota({ cuerpo: 'Corto.' }));
  assert.equal(sinCuerpo.tipo, 'sin-cuerpo');
  // Una nota normal, nada.
  assert.equal(motivoParaRetirar(nota()), null);
});

test('regla 212 (a): el rojo se retira siempre, también lo de una persona; lo demás de una persona no se toca', () => {
  const palabra = REGLAS_SEMAFORO.rojo[0];
  const roja = nota({ cuerpo: `${CUERPO} Se habló de ${palabra}.` });
  assert.equal(motivoParaRetirar(roja).tipo, 'rojo');
  assert.equal(motivoParaRetirar({ ...roja, como: 'publicada', publicadaPor: 'Hernán' }).tipo, 'rojo');
  assert.equal(motivoParaRetirar({ ...roja, corregidaAMano: true }).tipo, 'rojo');
  // Lo demás de una persona: ni "no es nota" ni el cuerpo.
  for (const p of [{ como: 'publicada', publicadaPor: 'Hernán' }, { corregidaAMano: true }, { cuerpoAMano: true }]) {
    assert.equal(esDeUnaPersona(nota(p)), true);
    assert.equal(motivoParaRetirar({ ...real('1m2za7b'), ...p }), null, JSON.stringify(p));
    assert.equal(motivoParaRetirar(nota({ ...p, cuerpo: 'Corto.' })), null);
  }
  // La lista de sepelios: nunca, como en cada vuelta de la web.
  const sepelio = REGLAS_SEMAFORO.nunca[0];
  assert.equal(motivoParaRetirar(nota({ titulo: `${sepelio} del día` })).tipo, 'nunca');
});

test('regla 212 (a): los arreglos que no inventan, como pares que la web sabe aplicar: "este domingo" en una nota vieja pasa a "el domingo"', () => {
  const desfile = real('g333ki');
  const arreglos = arreglosQueNoInventan(desfile, { hoy: DESPUES });
  assert.ok(arreglos.length >= 1);
  const corregida = conCambiosDeLaAuditoria(desfile, new Map([[desfile.id, arreglos]]));
  assert.ok(!/\b[Ee]ste domingo\b/.test(`${corregida.copete} ${corregida.cuerpo}`), 'ya no dice "este domingo"');
  assert.equal(corregida.titulo, desfile.titulo, 'el título lo arregla cada vuelta (tituloAutomatico): no se toca');
  // "de este lunes" pasa a "del lunes", nunca a "de el lunes" (pra9a0, real).
  const semillas = real('pra9a0');
  const c = conCambiosDeLaAuditoria(semillas, new Map([[semillas.id, arreglosQueNoInventan(semillas, { hoy: DESPUES })]]));
  assert.ok(!/\bde el (lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b/.test(`${c.copete} ${c.cuerpo}`));
  assert.match(c.cuerpo, /del lunes/);
  // Lo de una persona, nunca.
  assert.deepEqual(arreglosQueNoInventan({ ...desfile, corregidaAMano: true }, { hoy: DESPUES }), []);
  // Una tilde sola sólo en "-ción"/"-sión": "position" no pasa a "positión".
  const ingles = nota({ cuerpo: `${CUERPO} La pole position quedó para el piloto local.` });
  assert.ok(!arreglosQueNoInventan(ingles, { hoy: DESPUES }).some((p) => /positi/.test(p.despues)));
});

test('regla 212: arreglarEscritura contrae "de el" y "a el" con un día ("del sábado", "al martes"); "Un día el viernes" no se toca', () => {
  const { nuevo } = arreglarEscritura({ cuerpo: 'La reunión de este lunes se pasó a el martes. Quedó para después de el sábado. Un día el viernes cantan.' }, { hoy: new Date('2026-10-22T12:00:00-03:00') });
  assert.equal(nuevo.cuerpo, 'La reunión del lunes se pasó al martes. Quedó para después del sábado. Un día el viernes cantan.');
});

test('regla 212: paresDeCambio arma pares únicos y, aplicados, dan exactamente el texto nuevo', () => {
  const casos = [
    ['Se juega este sábado y este domingo en el club.', 'Se juega el sábado y el domingo en el club.'],
    ['Cabe destacar que el club abre. El club abre el sábado.', 'El club abre. El club abre el sábado.'],
    ['Hola mundo', 'Chau mundo'],
    ['Hola', 'Chau'],
  ];
  for (const [antes, despues] of casos) {
    const pares = paresDeCambio(antes, despues);
    assert.ok(pares?.length, antes);
    const r = conCambiosDeLaAuditoria({ id: 'x', cuerpo: antes }, cambiosDeLaAuditoria({ notas: { x: { cambios: pares.map((p) => ({ campo: 'cuerpo', ...p })) } } }));
    assert.equal(r.cuerpo, despues, antes);
  }
  assert.equal(paresDeCambio('igual', 'igual'), null);
  // Agregar al final no se puede decir con un par seguro (el después contendría al antes): no se arregla.
  assert.equal(paresDeCambio('Uno dos tres', 'Uno dos tres cuatro'), null);
});

test('regla 212 (a): la misma noticia publicada dos veces se une a la que ya estaba (casos reales: McCain y Campo de Pato)', () => {
  const notas = ['t79sy5', '7fmhve', '1825h24', '1iyhhh6'].map(real);
  const mccain = repetidaDe(notas.find((n) => n.id === '7fmhve'), notas);
  assert.equal(mccain.queda, 't79sy5', 'queda la que se vio primero');
  assert.equal(repetidaDe(notas.find((n) => n.id === 't79sy5'), notas), null, 'la primera no es copia de nada');
  assert.equal(repetidaDe(notas.find((n) => n.id === '1iyhhh6'), notas).queda, '1825h24');
  // Notas distintas, no.
  assert.equal(repetidaDe(nota({ id: 'a' }), [nota({ id: 'b', titulo: 'Abre la inscripción para el torneo de ajedrez escolar', copete: 'Hasta el viernes.', cuerpo: 'Otra cosa.' })]), null);
  // Lo de una persona no se une solo.
  assert.equal(repetidaDe({ ...notas[1], como: 'publicada', publicadaPor: 'Hernán' }, notas), null);
});

// ------------------------------------------------------------------ (b) la foto

const BANCO = (o = {}) => ({ n1: { archivo: 'fotos-notas/n1.jpg', credito: 'Foto: Radio Gabal', origen: 'medio', titulo: 'El Concejo aprueba el nuevo plan de tránsito para el centro', cuando: '2026-10-01T12:10:00.000Z', huella: '00000000000000ff', imagenOriginal: 'https://gabal/x.jpg', ...o } });
const CON_FOTO = nota({ foto: { archivo: 'fotos-notas/n1.jpg', credito: 'Foto: Radio Gabal' } });
const FICHA_BIEN = { proveedor: 'gemini', marca: false, menor: false, jovenes: false, deArchivo: false, grafica: false, stock: false, corresponde: 'si' };

test('regla 212 (b): lo que ya vio la IA (la ficha) decide como hoy: chicos, marca, gráfica, stock, que no corresponda o de archivo sin el hecho, se saca', () => {
  for (const [cambio, motivo] of [
    [{ menor: true }, /un menor/], [{ marca: true }, /marca/], [{ grafica: true }, /flyer/], [{ stock: true }, /stock/],
    [{ corresponde: 'no' }, /no corresponde/], [{ deArchivo: true, corresponde: 'generica' }, /de archivo/],
  ]) {
    const r = revisionDeLaFoto(CON_FOTO, { banco: BANCO({ vision: { ...FICHA_BIEN, ...cambio } }) });
    assert.equal(r.accion, 'sacar', JSON.stringify(cambio));
    assert.match(r.motivo, motivo);
  }
  // Una ficha completa y buena alcanza; de archivo pero mostrando el hecho, también.
  assert.equal(revisionDeLaFoto(CON_FOTO, { banco: BANCO({ vision: FICHA_BIEN }) }).accion, 'ok');
  assert.equal(revisionDeLaFoto(CON_FOTO, { banco: BANCO({ vision: { ...FICHA_BIEN, deArchivo: true } }) }).accion, 'ok');
  // Sin ficha, o con gente muy joven sin segunda opinión: la mira la IA.
  assert.equal(revisionDeLaFoto(CON_FOTO, { banco: BANCO() }).accion, 'mirar');
  assert.equal(revisionDeLaFoto(CON_FOTO, { banco: BANCO({ vision: { ...FICHA_BIEN, jovenes: true } }) }).accion, 'mirar');
  // La segunda opinión que vio un menor también saca.
  assert.match(motivoDeLaVision({ ...FICHA_BIEN, segunda: { menor: true } }), /un menor/);
});

test('regla 212 (b): no se tocan las ilustraciones, las fotos propias, las que sumó una persona, las libres de F1 y lo que publicó una persona', () => {
  assert.equal(revisionDeLaFoto(nota()).accion, 'sin-foto');
  assert.equal(revisionDeLaFoto(nota({ foto: { archivo: 'fotos-notas/n1-ia.jpg' } })).accion, 'no-aplica');
  assert.equal(revisionDeLaFoto(nota({ foto: { archivo: 'fotos-notas/collage-x.jpg' } })).accion, 'no-aplica');
  assert.equal(revisionDeLaFoto(CON_FOTO, { banco: BANCO({ origen: 'manual' }) }).accion, 'no-aplica');
  assert.equal(revisionDeLaFoto({ ...CON_FOTO, propia: 'futbol' }, { banco: BANCO({ origen: 'libre' }) }).accion, 'no-aplica', 'la libre del estadio de una nota propia de fútbol queda');
  assert.equal(revisionDeLaFoto(CON_FOTO, { banco: BANCO({ origen: 'libre' }) }).accion, 'sacar', 'una libre en una nota con fuentes se saca (regla 319)');
  assert.equal(revisionDeLaFoto({ ...CON_FOTO, como: 'publicada', publicadaPor: 'Hernán' }, { banco: BANCO() }).accion, 'no-aplica');
  assert.equal(revisionDeLaFoto(CON_FOTO, { banco: BANCO(), manuales: { n1: { archivo: 'fotos-notas/n1.jpg' } } }).accion, 'no-aplica');
  // Con el interruptor de la excepción de chicos apagado (en las pruebas), una foto que entró por ella no se mira: la web ya no la muestra.
  assert.equal(revisionDeLaFoto(CON_FOTO, { banco: BANCO({ excepcion: { regla: 'menorEnActividadOficial' } }) }).accion, 'no-aplica');
});

test('regla 212 (b): la misma foto en otra nota de OTRO tema se saca de la que la tuvo después; una sacada por repetida no veta a la primera', () => {
  const otra = { archivo: 'fotos-notas/o.jpg', origen: 'medio', titulo: 'Milei recibe un premio en Francia', cuando: '2026-09-20T10:00:00.000Z', huella: '00000000000000fe' };
  assert.match(fotoRepetidaDeOtroTema(CON_FOTO, BANCO().n1, { ...BANCO(), o: otra }), /ya ilustra «Milei recibe un premio/);
  // Si la nuestra es la primera, queda.
  assert.equal(fotoRepetidaDeOtroTema(CON_FOTO, BANCO().n1, { ...BANCO(), o: { ...otra, cuando: '2026-10-05T10:00:00.000Z' } }), null);
  // Del mismo tema, queda.
  assert.equal(fotoRepetidaDeOtroTema(CON_FOTO, BANCO().n1, { ...BANCO(), o: { ...otra, titulo: 'El Concejo aprueba el plan de tránsito del centro' } }), null);
  // La que se sacó de otra nota porque repetía ESTA no la veta; la que sacó una persona por otra cosa, sí.
  const sacadaPorRepetida = { intentado: true, titulo: 'Otra', descartada: { motivo: 'la misma foto ya ilustraba "El Concejo…" (n1), que es de otro tema (regla 204)', huella: '00000000000000ff' } };
  assert.equal(fotoRepetidaDeOtroTema(CON_FOTO, BANCO().n1, { ...BANCO(), s: sacadaPorRepetida }), null);
  const sacadaPorFlyer = { intentado: true, titulo: 'La rifa', descartada: { motivo: 'es el flyer de una rifa', huella: '00000000000000ff' } };
  assert.match(fotoRepetidaDeOtroTema(CON_FOTO, BANCO().n1, { ...BANCO(), s: sacadaPorFlyer }), /se sacó de «La rifa»/);
  // La misma foto copiada a propósito al unir dos notas (el mismo archivo) no es repetida.
  assert.equal(fotoRepetidaDeOtroTema(CON_FOTO, BANCO().n1, { ...BANCO(), c: { ...otra, archivo: 'fotos-notas/n1.jpg' } }), null);
});

test('regla 212 (b) y 319: una foto de Wikimedia Commons en una nota con fuentes se saca siempre, con año reciente y ficha buena también', () => {
  const wiki = (o) => BANCO({ origen: 'wikimedia', enlace: 'https://commons.wikimedia.org/wiki/File:Fito_P%C3%A1ez.jpg', razon: 'se usó una foto libre de "Fito Páez" de Wikimedia Commons', vision: { ...FICHA_BIEN, anio: 2025 }, ...o });
  const fito = nota({ titulo: 'Fito Páez cuestiona a la seguridad en su show', fecha: '2026-10-10T12:00:00.000Z', foto: { archivo: 'fotos-notas/n1.jpg' } });
  const r = revisionDeLaFoto(fito, { banco: wiki() });
  assert.equal(r.accion, 'sacar');
  assert.match(r.motivo, /regla 319/);
  assert.equal(revisionDeLaFoto({ ...fito, titulo: 'Un show en el Luna Park' }, { banco: wiki() }).accion, 'sacar');
  // También si la nota la publicó una persona (la foto la puso el robot), pero no la que sumó una persona a mano.
  assert.equal(revisionDeLaFoto({ ...fito, como: 'publicada', publicadaPor: 'Hernán' }, { banco: wiki() }).accion, 'sacar');
  assert.equal(revisionDeLaFoto(fito, { banco: wiki({ origen: 'manual' }) }).accion, 'no-aplica');
});

// ------------------------------------------------------------------ (c) la tanda, con la IA de mentira

const respuestaGroq = (contenido) => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(contenido) } }] }) });
const respuestaGemini = (contenido) => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(contenido) }] } }] }) });
const FICHA_IA_BIEN = { menor: false, tiene_marca: false, grafica: false, stock: false, corresponde: 'si', de_archivo: false, descripcion: 'una sesión del Concejo' };

function iaDeMentira({ texto = () => ({ notas: [] }), vision = () => FICHA_IA_BIEN, groqCae = false, geminiCae = false } = {}) {
  const pedidos = { groqTexto: [], groqVision: 0, gemini: 0 };
  const fetchFn = async (url, o) => {
    const body = JSON.parse(o.body);
    if (String(url).includes('api.groq.com')) {
      if (groqCae) return { ok: false, status: 429, text: async () => '' };
      if (Array.isArray(body.messages[0].content)) { pedidos.groqVision += 1; return respuestaGroq(vision()); }
      const ids = [...body.messages[0].content.matchAll(/"id": "([^"]+)"/g)].map((m) => m[1]);
      pedidos.groqTexto.push(ids);
      return respuestaGroq(texto(ids));
    }
    pedidos.gemini += 1;
    if (geminiCae) return { ok: false, status: 429, text: async () => '' };
    const partes = body.contents[0].parts;
    if (partes.length > 1) return respuestaGemini(vision());
    return respuestaGemini(texto([...partes[0].text.matchAll(/"id": "([^"]+)"/g)].map((m) => m[1])));
  };
  return { fetchFn, pedidos };
}
const llaveDePrueba = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'der' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  const publica = publicKey.toString('base64');
  const huella = crypto.createHash('sha256').update(Buffer.from(publica, 'base64')).digest('base64url').slice(0, 16);
  return { llave: { huella, publica, nombre: 'prueba' }, privada: privateKey };
};
// Cuatro días entre una y otra: así no son "la misma noticia" (regla 195 compara hasta 72 horas).
const dia = (i) => new Date(Date.UTC(2026, 8, 1 + 4 * i, 12)).toISOString();
const notasDePrueba = (n = 8) => Array.from({ length: n }, (_, i) => nota({
  id: `n${i}`, titulo: `${['El Concejo', 'La Cooperativa', 'El Hospital', 'La Escuela', 'El Club', 'La Biblioteca', 'El Museo', 'La Feria'][i % 8]} anuncia ${['obras', 'cortes', 'turnos', 'clases', 'partidos', 'talleres', 'muestras', 'puestos'][i % 8]} número ${i}`,
  fecha: dia(i), visto: dia(i), publicadaCuando: dia(i), copete: `Copete distinto de la nota ${i} con palabras propias ${"abcdefgh"[i % 8].repeat(5)}.`,
  foto: { archivo: `fotos-notas/n${i}.jpg`, credito: 'Foto: Radio Gabal' },
}));
const bancoDe = (notas) => Object.fromEntries(notas.map((n, i) => [n.id, { archivo: n.foto.archivo, credito: 'Foto: Radio Gabal', origen: 'medio', titulo: n.titulo, cuando: n.fecha, huella: crypto.createHash('md5').update(`foto ${i}`).digest('hex').slice(0, 16) }]));

test('regla 212 (c): una tanda lee el texto con Groq de a 3 notas y mira las fotos sin ficha, con tope de notas por tanda', async () => {
  const notas = notasDePrueba(8);
  const { fetchFn, pedidos } = iaDeMentira();
  const { tanda } = await revisarTanda({
    datos: { archivo: notas, banco: bancoDe(notas) }, ahora: DESPUES, claves: { groq: 'g', gemini: 'k' }, fetchFn, dormir: async () => {}, leerFoto: () => ({ mime: 'image/jpeg', base64: 'AAAA' }),
  });
  assert.equal(pedidos.groqTexto.length, 2, 'seis notas de texto por tanda, de a tres');
  assert.ok(pedidos.groqTexto.every((ids) => ids.length <= 3));
  assert.equal(pedidos.groqVision, REVISION.fotosPorTanda);
  assert.equal(pedidos.gemini, 0, 'Gemini no se toca si Groq contesta');
  assert.equal(tanda.resultados.length, REVISION.textoPorTanda, 'las dos que no entraron quedan para la próxima');
  assert.ok(tanda.resultados.every((r) => r.texto === 'ok' && r.foto.accion === 'ok'));
  // De la más vieja a la más nueva.
  assert.deepEqual(tanda.resultados.map((r) => r.id), ['n0', 'n1', 'n2', 'n3', 'n4', 'n5']);
});

test('regla 212 (c): la tilde segura se corrige sola (regla 188); el título o la sección dudosos quedan para una persona, cifrados', async () => {
  const notas = [nota({ id: 'n0', cuerpo: `${CUERPO} La comision analizará el tema.` })];
  const { llave, privada } = llaveDePrueba();
  const { fetchFn } = iaDeMentira({
    texto: () => ({ notas: [{ id: 'n0', hallazgos: [
      { tipo: 'ortografia', gravedad: 'baja', cita: 'comision', detalle: 'falta la tilde', sugerencia: 'comisión' },
      { tipo: 'titulo', gravedad: 'media', cita: 'El Concejo aprueba el nuevo plan de tránsito para el centro', detalle: 'el texto no dice que esté aprobado', sugerencia: '' },
    ] }] }),
  });
  const { tanda } = await revisarTanda({ datos: { archivo: notas, banco: {} }, ahora: DESPUES, claves: { groq: 'g' }, fetchFn, dormir: async () => {}, llaves: [llave] });
  const r = tanda.resultados[0];
  assert.deepEqual(r.tildes, [{ campo: 'cuerpo', antes: 'comision', despues: 'comisión' }]);
  assert.deepEqual(r.dudosos, ['titulo']);
  // En claro sólo viaja el tipo; el detalle va en el sobre, que abre el celular.
  assert.ok(!JSON.stringify(tanda.resultados).includes('el texto no dice'));
  const abierto = abrir(tanda.sobres.n0, { huella: llave.huella, privada });
  assert.equal(abierto.hallazgos[0].tipo, 'titulo');
  assert.equal(abierto.delArchivo, true);
  assert.equal(abierto.ruta, '/nota/el-concejo-aprueba-n0');
});

test('regla 212 (c): sin cupo de Groq, Gemini de respaldo con tope por día; sin ninguno, la nota queda para otra tanda y a los tres intentos sigue sin esa parte', async () => {
  const notas = notasDePrueba(3);
  const caeGroq = iaDeMentira({ groqCae: true });
  const { tanda } = await revisarTanda({ datos: { archivo: notas, banco: bancoDe(notas) }, ahora: DESPUES, claves: { groq: 'g', gemini: 'k' }, fetchFn: caeGroq.fetchFn, dormir: async () => {}, leerFoto: () => ({ mime: 'image/jpeg', base64: 'A' }) });
  assert.ok(caeGroq.pedidos.gemini >= 2, 'texto y fotos por Gemini');
  assert.ok(tanda.resultados.every((r) => r.texto === 'ok'));
  // Con el tope de Gemini del día ya gastado, no se lo usa.
  const tope = iaDeMentira({ groqCae: true });
  const estado = { ...estadoVacio(), uso: { '2026-10-22': { gemini: REVISION.geminiPorDia } } };
  const r2 = await revisarTanda({ datos: { archivo: notas, banco: bancoDe(notas) }, estado, ahora: DESPUES, claves: { groq: 'g', gemini: 'k' }, fetchFn: tope.fetchFn, dormir: async () => {}, leerFoto: () => ({ mime: 'image/jpeg', base64: 'A' }) });
  assert.equal(tope.pedidos.gemini, 0);
  assert.ok(r2.tanda.resultados.every((r) => r.texto === 'pendiente' && r.foto.accion === 'pendiente'));
  // Aplicada: queda pendiente (vuelve en la próxima tanda); al tercer intento, "falla" y se sigue.
  const datos = { archivo: notas, banco: bancoDe(notas) };
  let e = aplicarTanda({ tanda: r2.tanda, datos, ahora: DESPUES }).estado;
  assert.equal(e.notas.n0.t, 'pendiente');
  assert.equal(pendientes(notas, e).length, 3);
  for (let i = 0; i < 2; i += 1) {
    const otra = await revisarTanda({ datos, estado: { ...e, uso: { '2026-10-22': { gemini: 99 } } }, ahora: DESPUES, claves: { groq: 'g' }, fetchFn: iaDeMentira({ groqCae: true }).fetchFn, dormir: async () => {}, leerFoto: () => ({ mime: 'image/jpeg', base64: 'A' }) });
    e = aplicarTanda({ tanda: otra.tanda, datos, estado: e, ahora: DESPUES }).estado;
  }
  assert.equal(e.notas.n0.t, 'falla');
  assert.equal(e.notas.n0.i, 3);
  assert.equal(pendientes(notas, e).length, 0);
});

test('regla 212 (b): la foto que la visión rechaza (un menor) se saca del banco, no vuelve y la nota queda para la ilustración', async () => {
  const notas = notasDePrueba(1);
  const banco = bancoDe(notas);
  const { fetchFn } = iaDeMentira({ vision: () => ({ ...FICHA_IA_BIEN, menor: true }) });
  const { tanda } = await revisarTanda({ datos: { archivo: notas, banco }, ahora: DESPUES, claves: { groq: 'g' }, fetchFn, dormir: async () => {}, leerFoto: () => ({ mime: 'image/jpeg', base64: 'A' }) });
  assert.equal(tanda.resultados[0].foto.accion, 'sacar');
  const { estado, banco: nuevo } = aplicarTanda({ tanda, datos: { archivo: notas, banco }, ahora: DESPUES });
  assert.equal(nuevo.n0.archivo, undefined);
  assert.equal(nuevo.n0.descartada.por, POR);
  assert.match(nuevo.n0.descartada.motivo, /un menor/);
  assert.deepEqual(idsParaIlustrar(estado), ['n0']);
  // La misma descartada con la función de siempre: no vuelve (sePuedeReintentar mira `descartada`).
  assert.ok(descartarFoto(banco.n0, 'x').descartada);
  // Si mientras tanto la foto cambió (el banco tiene otra), no se toca.
  const cambiada = aplicarTanda({ tanda, datos: { archivo: notas, banco: { n0: { ...banco.n0, archivo: 'fotos-notas/n0-2.jpg' } } }, ahora: DESPUES });
  assert.equal(cambiada.banco.n0.archivo, 'fotos-notas/n0-2.jpg');
});

// ------------------------------------------------------------------ aplicar: retirar sin que vuelva

test('regla 212: lo retirado queda con motivo, cuándo y por "revisión del archivo", en una lista que no se poda y que la web suma a lo retirado', async () => {
  const lider = real('1m2za7b');
  const { tanda } = await revisarTanda({ datos: { archivo: [lider], banco: {} }, ahora: DESPUES, claves: {}, fetchFn: iaDeMentira().fetchFn, dormir: async () => {} });
  const { estado } = aplicarTanda({ tanda, datos: { archivo: [lider], banco: {} }, ahora: DESPUES });
  assert.deepEqual(Object.keys(estado.retiradas), ['1m2za7b']);
  const x = estado.retiradas['1m2za7b'];
  assert.ok(x.motivo && x.cuando && x.por === 'revisión del archivo');
  // Lo lee generar-datos (idsRetiradosPorLaRevision): sale del archivo, no va al histórico (una retirada no se guarda en ningún lado).
  const ids = idsRetiradosPorLaRevision(JSON.parse(comoRevisionJson(estado)));
  assert.deepEqual([...ids], ['1m2za7b']);
  const archivo = actualizarArchivo({ archivo: [lider, nota()], retiradas: ids, ahora: Date.parse('2026-10-22T06:00:00Z') });
  assert.deepEqual(archivo.map((n) => n.id), ['n1']);
  assert.deepEqual(bajasDelArchivo([lider, nota()], archivo, ids), []);
  // La poda de los lunes es de retiradas.json, no de esta lista: una retirada de hace meses sigue (no tiene fecha de vencimiento).
  const vieja = { retiradas: { abc: { motivo: 'x', cuando: '2026-01-01T00:00:00.000Z', por: POR } } };
  assert.ok(idsRetiradosPorLaRevision(vieja).has('abc'));
  assert.equal(Object.keys(podarRetiradas({ notas: {} }, { hoy: '2026-10-26' }).json.notas).length, 0, 'retiradas.json es otra lista');
  // Y generar-datos la suma a lo retirado a mano.
  const gen = leer('web/scripts/generar-datos.mjs');
  assert.match(gen, /const RETIRADAS_A_MANO = new Set\(\[\.\.\.idsRetiradosAMano\([^\n]+\.\.\.RETIRADAS_POR_LA_REVISION\]\)/);
  assert.match(gen, /parejasConfirmadas = \[\.\.\.parejasConfirmadas, \.\.\.REPETIDAS_DE_LA_REVISION\];\r?\nanclasDeSignificado = \[\.\.\.anclasDeSignificado, \.\.\.REPETIDAS_DE_LA_REVISION\];\r?\nconst conFotoEnElBanco/);
  assert.match(gen, /\.map\(conLoQueCorrigioLaAuditoria\)/, 'lo corregido solo también llega a las notas viejas del archivo');
});

test('regla 212: si una persona la corrigió mientras tanto, sólo el rojo la retira; lo que ya no tiene página no se toca; hay tope de retiros por tanda', async () => {
  const lider = real('1m2za7b');
  const { tanda } = await revisarTanda({ datos: { archivo: [lider], banco: {} }, ahora: DESPUES, claves: {}, fetchFn: iaDeMentira().fetchFn, dormir: async () => {} });
  const corregida = aplicarTanda({ tanda, datos: { archivo: [{ ...lider, corregidaAMano: true }], banco: {} }, ahora: DESPUES });
  assert.deepEqual(corregida.estado.retiradas, {});
  const sinPagina = aplicarTanda({ tanda, datos: { archivo: [], banco: {} }, ahora: DESPUES });
  assert.deepEqual(sinPagina.estado.retiradas, {});
  assert.equal(sinPagina.hechos.saltadas, 1);
  // Muchas para retirar de golpe (sin cuerpo): una tanda retira como mucho REVISION.retirosPorTanda; el resto, en la próxima.
  const sinCuerpo = Array.from({ length: 10 }, (_, i) => nota({ id: `s${i}`, titulo: `Nota corta número ${i} sobre otra cosa ${i}`, cuerpo: 'Corto.', fecha: `2026-10-0${1 + (i % 8)}T1${i}:00:00.000Z` }));
  const r = await revisarTanda({ datos: { archivo: sinCuerpo, banco: {} }, ahora: DESPUES, claves: {}, fetchFn: iaDeMentira().fetchFn, dormir: async () => {} });
  assert.equal(r.tanda.resultados.filter((x) => x.retirar).length, REVISION.retirosPorTanda);
});

test('regla 212: las repetidas se guardan como parejas que generar-datos une; el estado se guarda una entrada por renglón y se vuelve a leer', async () => {
  const notas = ['t79sy5', '7fmhve'].map(real);
  const { tanda } = await revisarTanda({ datos: { archivo: notas, banco: {} }, ahora: DESPUES, claves: { groq: 'g' }, fetchFn: iaDeMentira().fetchFn, dormir: async () => {} });
  const { estado } = aplicarTanda({ tanda, datos: { archivo: notas, banco: {} }, ahora: DESPUES });
  assert.deepEqual(parejasDeLaRevision(estado), [['t79sy5', '7fmhve']]);
  const texto = comoRevisionJson(estado);
  assert.deepEqual(JSON.parse(texto).repetidas, estado.repetidas);
  assert.ok(texto.split('\n').length > 10);
  assert.equal(estado.contadores.repetidas, 1);
  // El archivo de estado del repositorio se lee bien (desde el 22/10 la revisión real lo va llenando: ya no está vacío).
  const estadoReal = JSON.parse(leer('web/data/revision-archivo.json'));
  assert.equal(estadoReal.version, REVISION.version);
  assert.ok(idsRetiradosPorLaRevision(estadoReal) instanceof Set);
});

test('regla 212: la simulación sin IA sobre notas reales cuenta lo que haría, sin tocar nada', () => {
  const notas = [...REALES.values()].map((n) => structuredClone(n));
  const antes = JSON.stringify(notas);
  const s = simular({ archivo: notas, banco: {} }, { ahora: DESPUES });
  assert.equal(JSON.stringify(notas), antes);
  assert.equal(s.retiraria['no-es-nota'], 2);
  assert.equal(s.uniria, 2);
  assert.ok(s.arreglos.pares >= 2);
});

// ------------------------------------------------------------------ lo que se conecta

test('regla 212: «Ilustrar notas sin foto» toma las notas viejas sin foto DESPUÉS de las del día, y no con ids pedidos a mano', () => {
  const hoy = nota({ id: 'hoy', fecha: '2026-10-22T10:00:00.000Z', publicadaCuando: '2026-10-22T10:00:00.000Z', visto: '2026-10-22T10:00:00.000Z' });
  const vieja = nota({ id: 'vieja', fecha: '2026-09-10T10:00:00.000Z' });
  const { candidatas } = elegirCandidatas({ portada: [hoy], archivo: [vieja, hoy], ahora: new Date('2026-10-22T12:00:00Z'), delArchivo: ['vieja', 'no-esta'] });
  assert.deepEqual(candidatas.map((n) => n.id), ['hoy', 'vieja']);
  assert.deepEqual(elegirCandidatas({ portada: [hoy], archivo: [vieja], ahora: new Date('2026-10-22T12:00:00Z'), ids: ['hoy'], delArchivo: ['vieja'] }).candidatas.map((n) => n.id), ['hoy']);
  assert.match(leer('web/scripts/ilustrar-notas.mjs'), /idsParaIlustrar\(leerJson\(rutas\.revision/);
});

test('regla 212: el informe diario dice cuánto va y qué dejó para una persona (con el título y el enlace, sin el detalle)', () => {
  assert.deepEqual(lineasDeLaRevision(null).lineas, []);
  const revision = {
    generado: '2026-10-25T10:00:00.000Z', contadores: { total: 1450, revisadas: 300, retiradas: 2, repetidas: 5, fotosSacadas: 7, arreglos: 12, paraUnaPersona: 1, fallas: 0 },
    paraUnaPersona: { n1: { cuando: '2026-10-25T09:00:00.000Z', ruta: '/nota/el-concejo-aprueba-n1' } },
  };
  const { lineas, atencion } = lineasDeLaRevision(revision, { ahora: new Date('2026-10-25T12:00:00Z'), notas: [nota()] });
  assert.match(lineas[0].t, /va 300 de 1\.450 notas \(21 %\); retiró 2 notas, unió 5 repetidas a la que ya estaba, sacó 7 fotos/);
  assert.match(lineas[1].t, /1 nota vieja quedó para que la mire una persona/);
  assert.equal(lineas[2].t, 'El Concejo aprueba el nuevo plan de tránsito para el centro');
  assert.equal(lineas[2].url, 'https://radarbalcarce.com/nota/el-concejo-aprueba-n1');
  assert.equal(atencion.length, 1);
  assert.match(leer('redes/informe-diario.mjs'), /revision: d\('revision-archivo\.json'\)/);
});

test('regla 212: el reloj de Cloudflare la pide a los :12 de las horas UTC impares (12 tandas por día) y nada más cambia a esa hora', () => {
  for (let h = 0; h < 24; h++) {
    const r = trabajosDelMinuto(12, h).map((t) => t.archivo);
    assert.deepEqual(r, h % 2 === 1 ? ['revisar-archivo.yml'] : [], `${h}:12 UTC (${horaDeBalcarce(h)}:12 en Balcarce)`);
  }
  assert.deepEqual(trabajosDelMinuto(12), [], 'sin la hora, nada');
  const toml = leer('infra/reloj-cloudflare/wrangler.toml');
  assert.match(toml, /"12 1,3,5,7,9,11,13,15,17,19,21,23 \* \* \*"/);
});

test('regla 212: el workflow revisa sin candado y guarda en la fila de «Actualizar la web», sólo sus archivos, con main recién bajado', () => {
  const w = leer('.github/workflows/revisar-archivo.yml');
  assert.match(w, /workflow_dispatch:/);
  assert.ok(!/schedule:/.test(w.replace(/^\s*#.*$/gm, '')), 'lo despierta el reloj, no el horario de GitHub');
  assert.match(w, /guardar:[\s\S]*concurrency:\s*\n\s*group: actualizar-web/);
  assert.match(w, /ref: main/);
  assert.match(w, /git reset -q --hard origin\/main/);
  assert.match(w, /for f in web\/data\/revision-archivo\.json web\/data\/banco-fotos\.json web\/data\/correcciones-auditoria\.json/);
  assert.match(w, /GROQ_API_KEY: \$\{\{ secrets\.GROQ_API_KEY \}\}/);
  assert.match(w, /GEMINI_API_KEY_CLASIFICACION/);
  assert.ok(!/GEMINI_API_KEY_REDACCION|GEMINI_API_KEY_REDES/.test(w), 'nunca la clave de la redacción ni la de las voces');
  assert.match(w, /REVISION_DEL_ARCHIVO: \$\{\{ vars\.REVISION_DEL_ARCHIVO \}\}/);
});

test('regla 212: el panel muestra en la pestaña Revisión también lo que dejó la revisión del archivo', () => {
  assert.match(leer('web/public/panel/github.js'), /revisionArchivo: 'web\/data\/revision-archivo\.json'/);
  assert.match(leer('web/public/panel/app.js'), /ARCHIVOS\.revisionArchivo/);
});
