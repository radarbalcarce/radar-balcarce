// Los controles de fotos del 17/10/2026 (reglas 203 a 206), con los casos REALES de la auditoría del 16/10 (docs/auditoria-2-0/03-FOTOS.md).
// Sin red: Gemini, Groq, Wikimedia y los medios son de mentira; ffmpeg también (las funciones que lo usan se reemplazan).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  elegirFoto, elegirFotoParaNota, descargarImagen, buscarFotoWikimedia, anioDeLaFoto, nombraALaPersona, esDudosa, tipoPorLosBytes,
  ANTIGUEDAD_MAXIMA_WIKIMEDIA,
} from '../ingesta/fotos.mjs';
import {
  elegirFotosNuevas, podarFotos, sePuedeReintentar, fotoDelArchivoAlDia, fotoRepetidaEnElBanco, mismoTema, HORAS_DE_GRACIA_DE_LA_PODA,
} from '../web/scripts/fotos-notas.mjs';
import { huellaDePixeles, distanciaDeHuellas, mismaFoto, fotoParaGuardar } from '../web/scripts/achicar-foto.mjs';

const RAIZ = path.join(import.meta.dirname, '..');

// ------------------------------------------------------------------ ayudas

const JPEG = (n = 200, relleno = 7) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(n - 4, relleno)]);
const conDatos = (medios) => medios.map((medio, i) => ({
  medio, enlace: `https://${i}.com/nota`, imagen: `https://${i}.com/f.jpg`, datos: { mime: 'image/jpeg', base64: JPEG(100 + i).toString('base64') },
}));
const respuestaGemini = (obj) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }) });
const respuestaGroq = (obj) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(obj) } }] }) });
const BIEN = { tiene_marca: false, menor: false, jovenes: false, corresponde: 'si', de_archivo: false, grafica: false, stock: false };
const sinFfmpeg = { prepararParaIA: async () => null, huellaDe: async () => null, achicar: async () => null };

// ------------------------------------------------------------------ regla 203: las fotos mal puestas no se eligen

test('regla 203: la captura con "Activar Windows", el flyer de la rifa, la foto de stock y la que no corresponde no se eligen (casos reales)', async () => {
  const casos = [
    // 1vhit3n: Radio Gabal, el matadero municipal. Captura de pantalla con el cartel de Windows abajo a la derecha.
    { titulo: 'El segundo llamado a licitación del matadero municipal queda desierto', foto: { ...BIEN, grafica: true, descripcion: 'captura de pantalla de un video aéreo con el cartel "Activar Windows"' }, motivo: /captura de pantalla/ },
    // 66so6t: Puntonueve. El flyer de la rifa (autos, montos), todo texto.
    { titulo: 'El Merendero Doña Norma lanza su tercera campaña solidaria con rifa', foto: { ...BIEN, grafica: true, descripcion: 'flyer de una rifa con premios' }, motivo: /flyer/ },
    // 130eay0: La Vanguardia. Chatarra electrónica de banco de imágenes.
    { titulo: 'La recolección de residuos electrónicos pasa para el lunes', foto: { ...BIEN, stock: true, corresponde: 'generica' }, motivo: /stock/ },
    // gizbaj: un F1 de 2016 para un choque de GT.
    { titulo: 'Max Verstappen choca al argentino Ezequiel Pérez Companc en Portugal', foto: { ...BIEN, corresponde: 'no', de_archivo: true }, motivo: /no corresponde/ },
  ];
  for (const c of casos) {
    const r = await elegirFoto({ titulo: c.titulo, seccion: 'Balcarce' }, conDatos(['Medio']), {
      clave: 'g', claveRespaldo: null, fetchFn: async () => respuestaGemini({ elegida: 'A', razon: 'la única', fotos: [{ letra: 'A', ...c.foto }] }),
    });
    assert.equal(r.elegida, null, c.titulo);
    assert.match(r.razon, c.motivo, c.titulo);
  }
});

test('regla 203: la IA contesta las preguntas nuevas y lo que vio queda en la ficha de la foto (vision)', async () => {
  let instruccion = '';
  const fetchFn = async (url, init) => {
    instruccion = JSON.parse(init.body).contents[0].parts[0].text;
    return respuestaGemini({ elegida: 'A', razon: 'ok', fotos: [{ letra: 'A', ...BIEN, corresponde: 'si', de_archivo: true, descripcion: 'el frente de la Municipalidad' }] });
  };
  const nota = { id: 'abc123', titulo: 'La Municipalidad abre la inscripción a talleres', seccion: 'Cultura y agenda', fuentesConsultadas: [{ medio: 'M', enlace: 'https://m.com/n' }] };
  const fetchTodo = async (url, init) => {
    if (String(url).includes('generativelanguage')) return fetchFn(url, init);
    if (url === 'https://m.com/n') return { ok: true, text: async () => '<meta property="og:image" content="https://m.com/f.jpg">' };
    return { ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => JPEG(500) };
  };
  const { banco } = await elegirFotosNuevas([nota], { clave: 'g', claveRespaldo: null, fetchFn: fetchTodo, ...sinFfmpeg });
  for (const pregunta of ['"corresponde"', '"de_archivo"', '"grafica"', 'Activar Windows', '"stock"', '"descripcion"', 'MENOR DE 18']) assert.ok(instruccion.includes(pregunta), pregunta);
  assert.equal(banco.abc123.vision.proveedor, 'gemini');
  assert.equal(banco.abc123.vision.corresponde, 'si');
  assert.equal(banco.abc123.vision.deArchivo, true);
  assert.equal(banco.abc123.vision.descripcion, 'el frente de la Municipalidad');
});

// ------------------------------------------------------------------ regla 203: los fallos de código

test('regla 203: las fotos se le mandan a la IA achicadas y se guarda la original (Groq contestaba 413 con las enteras)', async () => {
  const grande = JPEG(3 * 1024 * 1024);
  const chica = JPEG(50_000, 9);
  const nota = { id: 'n1', titulo: 'El Concejo trata el presupuesto', seccion: 'Política', fuentesConsultadas: [{ medio: 'M', enlace: 'https://m.com/n' }] };
  let tamanoMandado = 0;
  const fetchFn = async (url, init) => {
    if (String(url).includes('generativelanguage')) { tamanoMandado = init.body.length; return respuestaGemini({ elegida: 'A', razon: 'ok', fotos: [{ letra: 'A', ...BIEN }] }); }
    if (url === 'https://m.com/n') return { ok: true, text: async () => '<meta property="og:image" content="https://m.com/f.jpg">' };
    return { ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => grande };
  };
  const guardadas = [];
  const { archivos } = await elegirFotosNuevas([nota], {
    clave: 'g', claveRespaldo: null, fetchFn, prepararParaIA: async () => chica, huellaDe: async () => null,
    achicar: async (bytes) => { guardadas.push(bytes.length); return null; },
  });
  assert.ok(tamanoMandado < 200_000, `a la IA fue la achicada (${tamanoMandado} bytes)`);
  assert.deepEqual(guardadas, [grande.length], 'lo que se guarda sale de la original');
  assert.equal(archivos['fotos-notas/n1.jpg'].length, grande.length);
});

test('regla 203: si Groq contesta 413 con tres fotos, prueba una vez con una sola; y el error de Gemini queda guardado', async () => {
  const pedidosGroq = [];
  const fetchFn = async (url, init) => {
    if (String(url).includes('generativelanguage')) return { ok: false, status: 429, text: async () => JSON.stringify({ error: { message: 'Resource has been exhausted (e.g. check quota).' } }) };
    const imagenes = JSON.parse(init.body).messages[0].content.filter((c) => c.type === 'image_url').length;
    pedidosGroq.push(imagenes);
    if (imagenes > 1) return { ok: false, status: 413, text: async () => '{"error":{"message":"Request too large"}}' };
    return respuestaGroq({ elegida: 'A', razon: 'ok', fotos: [{ letra: 'A', ...BIEN }] });
  };
  const r = await elegirFoto({ titulo: 'El dólar cierra estable', seccion: 'Economía' }, conDatos(['A', 'B', 'C']), { clave: 'g', claveRespaldo: 'r', fetchFn });
  assert.deepEqual(pedidosGroq, [3, 1]);
  assert.equal(r.elegida.medio, 'A');
  assert.match(r.errorGemini, /HTTP 429: Resource has been exhausted/);

  // Si Groq también falla, la razón dice las dos cosas (y sigue empezando como una falla, así se reintenta).
  const falla = async (url) => (String(url).includes('generativelanguage')
    ? { ok: false, status: 503, text: async () => '{"error":{"message":"The model is overloaded"}}' }
    : { ok: false, status: 429, text: async () => '' });
  const r2 = await elegirFoto({ titulo: 'x', seccion: 'Economía' }, conDatos(['A']), { clave: 'g', claveRespaldo: 'r', fetchFn: falla });
  assert.match(r2.razon, /^Groq también falló: HTTP 429 \(Gemini: HTTP 503: The model is overloaded\)$/);
  assert.equal(sePuedeReintentar({ intentado: true, origen: 'ninguna', razon: r2.razon, cuando: '2026-10-16T10:00:00Z' }, { ahora: new Date('2026-10-16T12:00:00Z') }), true);
});

test('regla 203: "no se pudo volver a bajar la elegida": una foto AVIF, "image/jpg" u octet-stream se guarda pasada a JPEG', async () => {
  assert.equal(tipoPorLosBytes(JPEG()), 'image/jpeg');
  assert.equal(tipoPorLosBytes(Buffer.concat([Buffer.from([0, 0, 0, 0x1c]), Buffer.from('ftypavif'), Buffer.alloc(8)])), 'image/avif');
  const respuesta = (tipo, bytes) => async () => ({ ok: true, headers: { get: () => tipo }, arrayBuffer: async () => bytes });
  assert.equal((await descargarImagen('x', { fetchFn: respuesta('image/jpg', JPEG()) })).mime, 'image/jpeg');
  assert.equal((await descargarImagen('x', { fetchFn: respuesta('application/octet-stream', JPEG()) })).mime, 'image/jpeg');
  assert.equal(await descargarImagen('x', { fetchFn: respuesta('application/octet-stream', Buffer.from('<html>no es una foto</html>')) }), null);
  // Sin extensión conocida, sirve la versión de ffmpeg aunque pese más.
  const g = await fotoParaGuardar(Buffer.from('avif'), null, { achicar: async () => JPEG(900) });
  assert.equal(g.ext, 'jpg');
  assert.equal(await fotoParaGuardar(Buffer.from('avif'), null, { achicar: async () => null }), null);
});

// ------------------------------------------------------------------ regla 203: la poda y el archivo

test('regla 203: la poda espera una semana antes de borrar la foto de una nota que dejó de estar (ha42x9, 19q2x7e: seis notas vivas la perdieron)', () => {
  const banco = { ha42x9: { archivo: 'fotos-notas/ha42x9.jpg', credito: 'Foto: Radio Mitre', titulo: 'El boleto de colectivo en el AMBA sube desde noviembre' } };
  const lunes = new Date('2026-10-16T15:30:00Z');
  // Una vuelta en que no figura: queda anotada, la foto no se borra.
  const a = podarFotos({ banco, enDisco: ['ha42x9.jpg'], quedan: new Set(), ahora: lunes });
  assert.deepEqual(a.borrar, []);
  assert.equal(a.banco.ha42x9.ausenteDesde, lunes.toISOString());
  assert.equal(a.banco.ha42x9.archivo, 'fotos-notas/ha42x9.jpg');
  // Vuelve: se le saca la marca y sigue con su foto.
  const b = podarFotos({ banco: a.banco, enDisco: ['ha42x9.jpg'], quedan: new Set(['ha42x9']), ahora: new Date('2026-10-16T16:00:00Z') });
  assert.equal(b.banco.ha42x9.ausenteDesde, undefined);
  assert.deepEqual(b.borrar, []);
  // Si sigue faltando más de una semana, ahí sí.
  const c = podarFotos({ banco: a.banco, enDisco: ['ha42x9.jpg'], quedan: new Set(), ahora: new Date(lunes.getTime() + (HORAS_DE_GRACIA_DE_LA_PODA + 1) * 3_600_000) });
  assert.deepEqual(c.borrar, ['ha42x9.jpg']);
  assert.equal(c.banco.ha42x9.borrada, true);
  assert.equal(c.banco.ha42x9.retirada, undefined);
  // Una foto podada de una nota que vuelve a publicarse se prueba otra vez; la de una retirada a mano, nunca.
  assert.equal(sePuedeReintentar(c.banco.ha42x9), true);
  const r = podarFotos({ banco, enDisco: ['ha42x9.jpg'], quedan: new Set(['ha42x9']), retiradas: new Set(['ha42x9']) });
  assert.deepEqual(r.borrar, ['ha42x9.jpg'], 'lo retirado a mano se borra en el momento');
  assert.equal(sePuedeReintentar(r.banco.ha42x9), false);
});

test('regla 203: las imágenes rotas del archivo apuntan a la que existe, o la nota queda sin foto (casos reales: 1vgvciw .png, 1a6c23d el logo)', () => {
  const existe = (f) => ['1vgvciw.jpg', 'z9-ia.jpg', 'collage-r1.jpg'].includes(f);
  const banco = {
    '1vgvciw': { archivo: 'fotos-notas/1vgvciw.jpg', credito: 'Foto: Radio Gabal (FM 104.1)' },
    '1a6c23d': { intentado: true, origen: 'ninguna', razon: 'La única foto disponible corresponde al logo del medio' },
    pol1: { archivo: 'fotos-notas/1vgvciw.jpg', credito: 'Foto: El Eco' },
    sac1: { intentado: true, descartada: { motivo: 'flyer' } },
  };
  const kevin = { id: '1vgvciw', titulo: 'Kevin Gómez presenta su título argentino en el gimnasio', seccion: 'Deportes', foto: { archivo: 'fotos-notas/1vgvciw.png', credito: 'Foto: Radio Gabal (FM 104.1)' } };
  assert.deepEqual(fotoDelArchivoAlDia(kevin, banco, { existe }).foto, { archivo: 'fotos-notas/1vgvciw.jpg', credito: 'Foto: Radio Gabal (FM 104.1)' });
  const ultra = { id: '1a6c23d', titulo: 'La Ultra Trail Tierras del Diablo abre los últimos cupos', seccion: 'Deportes', foto: { archivo: 'fotos-notas/1a6c23d.png', credito: 'Foto: Diario La Vanguardia' } };
  assert.equal(fotoDelArchivoAlDia(ultra, banco, { existe }).foto, undefined);
  // Policiales sin fuente oficial, como en la portada; una foto sacada; una ilustración que existe; una nota propia sin su archivo.
  assert.equal(fotoDelArchivoAlDia({ id: 'pol1', seccion: 'Policiales', foto: { archivo: 'fotos-notas/1vgvciw.jpg', credito: 'Foto: El Eco' } }, banco, { existe }).foto, undefined);
  assert.equal(fotoDelArchivoAlDia({ id: 'sac1', seccion: 'Balcarce', foto: { archivo: 'fotos-notas/sac1.jpg', credito: 'Foto: X' } }, banco, { existe: () => true }).foto, undefined);
  const il = { id: 'z9', seccion: 'Balcarce', foto: { archivo: 'fotos-notas/z9-ia.jpg', credito: 'Ilustración generada con IA' } };
  assert.equal(fotoDelArchivoAlDia(il, banco, { existe }), il);
  assert.equal(fotoDelArchivoAlDia({ id: 'r2', propia: 'repaso', foto: { archivo: 'fotos-notas/collage-r2.jpg' } }, banco, { existe }).foto, undefined);
  // generar-datos lo usa en el archivo, antes de la regla 186 y de la ilustración.
  const g = fs.readFileSync(path.join(RAIZ, 'web/scripts/generar-datos.mjs'), 'utf8');
  assert.match(g, /\.map\(conLaFotoPasada\)\.map\(conLaFotoAlDia\)\.map\(sinFotoConMenorBloqueada\)/);
});

// ------------------------------------------------------------------ regla 204: la misma foto y la segunda opinión

test('regla 204: la huella reconoce la misma foto y separa dos distintas', () => {
  const gris = (f) => Buffer.from(Array.from({ length: 72 }, (_, i) => f(i % 9, Math.floor(i / 9))));
  const a = huellaDePixeles(gris((x, y) => (x * 20 + y * 3) % 256));
  const casi = huellaDePixeles(gris((x, y) => ((x * 20 + y * 3) % 256) + (x === 4 && y === 2 ? 30 : 0)));
  const otra = huellaDePixeles(gris((x, y) => (255 - x * 25 + y * 7) % 256));
  assert.match(a, /^[0-9a-f]{16}$/);
  assert.ok(mismaFoto(a, casi), 'recomprimida o achicada: la misma');
  assert.ok(!mismaFoto(a, otra));
  assert.equal(distanciaDeHuellas(a, null), 64);
});

test('regla 204: la foto de Messi de 2012 no puede ilustrar el show de Grupo Cali; sí la misma noticia contada otra vez (casos reales)', () => {
  const H = '1935171a9b4c062b';
  const banco = {
    kzftcz: { archivo: 'fotos-notas/kzftcz.jpg', titulo: 'La Messi Cup define fechas y cruces para su segunda edición', huella: H, origen: 'wikimedia', imagenOriginal: 'https://upload.wikimedia.org/x/Suisse_vs_Argentine.jpg?utm=1' },
    '1j6ui2n': { archivo: 'fotos-notas/1j6ui2n.jpg', titulo: 'La ACTC sanciona a Mariano Werner con multa y largada desde el fondo', huella: 'ffff0000ffff0000' },
  };
  const cali = { id: 'kr8nxa', titulo: 'Grupo Cali explica los motivos de la suspensión de su show' };
  assert.match(fotoRepetidaEnElBanco(banco, cali, { huella: H }).motivo, /otro tema/);
  assert.ok(fotoRepetidaEnElBanco(banco, cali, { imagen: 'https://upload.wikimedia.org/x/Suisse_vs_Argentine.jpg' }), 'también por la dirección');
  assert.equal(fotoRepetidaEnElBanco(banco, { id: '144x64h', titulo: 'Mariano Werner recibe millonaria multa y sanción deportiva' }, { huella: 'ffff0000ffff0001' }), null, 'el mismo tema');
  assert.ok(mismoTema('La ACTC sanciona a Mariano Werner con multa', 'Mariano Werner recibe millonaria multa'));
  assert.ok(!mismoTema('Messi discute con un futbolista uruguayo', 'Messi llega a Disney+ en una serie'));
  // Una foto que una persona sacó no vuelve en ninguna nota, ni del mismo tema.
  const conVeto = { x: { intentado: true, titulo: 'El Merendero Doña Norma lanza su campaña con rifa', descartada: { motivo: 'flyer', huella: H } } };
  assert.match(fotoRepetidaEnElBanco(conVeto, { id: 'y', titulo: 'El Merendero Doña Norma lanza su campaña con rifa' }, { huella: H }).motivo, /sacó/);
});

test('regla 204: una candidata repetida no se le muestra a la IA', async () => {
  const H = '1935171a9b4c062b';
  const nota = { id: 'kr8nxa', titulo: 'Grupo Cali explica los motivos de la suspensión de su show', seccion: 'Cultura y agenda', fuentesConsultadas: [{ medio: 'A', enlace: 'https://a.com/n' }] };
  let llamoALaIA = false;
  const fetchFn = async (url) => {
    if (String(url).includes('generativelanguage')) { llamoALaIA = true; return respuestaGemini({ persona: null }); }
    if (url === 'https://a.com/n') return { ok: true, text: async () => '<meta property="og:image" content="https://a.com/f.jpg">' };
    return { ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => JPEG(300) };
  };
  const banco = { kzftcz: { archivo: 'fotos-notas/kzftcz.jpg', titulo: 'La Messi Cup define fechas', huella: H } };
  const r = await elegirFotoParaNota(nota, { clave: 'g', claveRespaldo: null, fetchFn, huellaDe: async () => H, esRepetida: (f) => fotoRepetidaEnElBanco(banco, nota, f) });
  assert.equal(r.elegida, null);
  assert.match(r.razon, /ya se usó o se sacó/);
  assert.match(r.candidatas[0].repetida.motivo, /otro tema/);
  assert.equal(llamoALaIA, true, 'sólo para preguntar por la persona: ninguna foto le llegó');
});

test('regla 204: el pádel (1ge6irq) y el rugby "Torneo Desarrollo": la segunda opinión (Groq) mira la elegida y, si ve un menor, no va', async () => {
  // La IA nueva describe gente joven aunque diga "adultos": es dudoso.
  const padel = { titulo: 'Deportistas locales participan del Torneo Argentino de Pádel', seccion: 'Deportes' };
  assert.match(esDudosa(padel, { vision: { jovenes: true } }), /joven/);
  assert.match(esDudosa({ titulo: 'Pato Naranja y Pato Negro clasifican a semifinales del Torneo Desarrollo', seccion: 'Deportes' }, {}), /juveniles/);
  assert.equal(esDudosa({ titulo: 'El dólar cierra estable', seccion: 'Economía' }, { vision: { descripcion: 'billetes sobre una mesa' } }), null);
  const pedidos = [];
  const fetchFn = async (url) => {
    if (String(url).includes('generativelanguage')) {
      pedidos.push('gemini');
      return respuestaGemini({ elegida: 'A', razon: 'buena', fotos: [{ letra: 'A', ...BIEN, jovenes: true, descripcion: 'tres jugadores jóvenes' }] });
    }
    pedidos.push('groq');
    return respuestaGroq({ menor: true, tiene_marca: false, grafica: false, corresponde: 'si', descripcion: 'dos de los tres parecen adolescentes' });
  };
  const r = await elegirFoto(padel, conDatos(['Acción 5 (Balcarce)']), { clave: 'g', claveRespaldo: 'r', fetchFn });
  assert.deepEqual(pedidos, ['gemini', 'groq']);
  assert.equal(r.elegida, null);
  assert.match(r.razon, /segunda opinión \(groq[\s\S]*un menor/);
  // Si la segunda opinión no está (sin clave o sin cupo), en un caso dudoso NO se publica: queda como falla y se reintenta.
  const sinGroq = await elegirFoto(padel, conDatos(['Acción 5 (Balcarce)']), { clave: 'g', claveRespaldo: null, fetchFn });
  assert.equal(sinGroq.elegida, null);
  assert.match(sinGroq.razon, /^Segunda opinión no disponible/);
  assert.equal(sePuedeReintentar({ intentado: true, origen: 'ninguna', razon: sinGroq.razon, cuando: '2026-10-16T10:00:00Z' }, { ahora: new Date('2026-10-16T12:00:00Z') }), true);
  // Y si está de acuerdo, va, con las dos opiniones en la ficha.
  const deAcuerdo = async (url) => (String(url).includes('generativelanguage')
    ? respuestaGemini({ elegida: 'A', razon: 'buena', fotos: [{ letra: 'A', ...BIEN, jovenes: true }] })
    : respuestaGroq({ menor: false, tiene_marca: false, grafica: false, corresponde: 'si', descripcion: 'adultos con paletas' }));
  const ok = await elegirFoto(padel, conDatos(['Acción 5 (Balcarce)']), { clave: 'g', claveRespaldo: 'r', fetchFn: deAcuerdo });
  assert.equal(ok.elegida.medio, 'Acción 5 (Balcarce)');
  assert.equal(ok.elegida.vision.segunda.proveedor, 'groq');
  assert.equal(ok.elegida.vision.segunda.menor, false);
});

test('regla 204: si la segunda opinión descarta la elegida, se prueba la siguiente que había aprobado la primera', async () => {
  let groq = 0;
  const fetchFn = async (url) => {
    if (String(url).includes('generativelanguage')) return respuestaGemini({ elegida: 'A', razon: 'x', fotos: [{ letra: 'A', ...BIEN }, { letra: 'B', ...BIEN }] });
    groq += 1;
    return respuestaGroq(groq === 1 ? { menor: true, tiene_marca: false, grafica: false, corresponde: 'si' } : { menor: false, tiene_marca: false, grafica: false, corresponde: 'si' });
  };
  const r = await elegirFoto({ titulo: 'La escuela de vóley suma categorías', seccion: 'Deportes' }, conDatos(['Uno', 'Dos']), { clave: 'g', claveRespaldo: 'r', fetchFn });
  assert.equal(r.elegida.medio, 'Dos');
  assert.match(r.razon, /descartó la de Uno/);
});

// ------------------------------------------------------------------ regla 205: Wikimedia

const paginaCommons = (titulo, anio, url = `https://upload.wikimedia.org/${titulo}`) => ({
  title: `File:${titulo}`, index: 1,
  imageinfo: [{ mime: 'image/jpeg', width: 1200, height: 800, url, thumburl: `${url}?w=1280`, descriptionurl: `https://commons.wikimedia.org/wiki/File:${titulo}`, extmetadata: { LicenseShortName: { value: 'CC BY-SA 3.0' }, ...(anio ? { DateTimeOriginal: { value: `${anio}-02-29` } } : {}) } }],
});

test('regla 205: Wikimedia no da una foto de hace años para un hecho de hoy (Messi 2012) ni una ya usada, y baja la miniatura', async () => {
  assert.equal(anioDeLaFoto({ DateTimeOriginal: { value: '2012-02-29' } }), 2012);
  assert.equal(anioDeLaFoto({ DateTimeOriginal: { value: 'Editado en 1971' } }), 1971);
  assert.equal(anioDeLaFoto({ DateTime: { value: '2016-04-11 21:37:22' } }, 'File:Mariano Werner 2015.JPG'), 2015, 'el del nombre antes que el de la subida');
  assert.equal(anioDeLaFoto({}), null);
  const paginas = { 1: paginaCommons('Suisse_vs_Argentine_-_Granit_Xhaka_&_Lionel_Messi.jpg', 2012), 2: { ...paginaCommons('Messi_2026.jpg', 2026), index: 2 }, 3: { ...paginaCommons('Messi_sin_fecha.jpg', null), index: 3 } };
  const fetchFn = async () => ({ ok: true, json: async () => ({ query: { pages: paginas } }) });
  const r = await buscarFotoWikimedia('Lionel Messi', { fetchFn, anioDeLaNota: 2026 });
  assert.equal(r.imagen, 'https://upload.wikimedia.org/Messi_2026.jpg');
  assert.equal(r.miniatura, 'https://upload.wikimedia.org/Messi_2026.jpg?w=1280');
  assert.equal(r.anio, 2026);
  assert.equal(await buscarFotoWikimedia('Lionel Messi', { fetchFn, anioDeLaNota: 2026, excluir: new Set(['https://upload.wikimedia.org/Messi_2026.jpg?x=1']) }), null, 'la de 2026 ya se usó, la de 2012 es vieja y la otra no tiene fecha');
  assert.equal(ANTIGUEDAD_MAXIMA_WIKIMEDIA, 2);
});

test('regla 205: sólo si el título nombra a la persona (Grupo Cali salió con Messi) y la visión dice que corresponde (un F1 para un choque de GT)', async () => {
  assert.equal(nombraALaPersona('Grupo Cali explica los motivos de la suspensión de su show', 'Lionel Messi'), false);
  assert.equal(nombraALaPersona('La Messi Cup define fechas', 'Lionel Messi'), true);
  // kr8nxa: la IA dice "Lionel Messi" pero el título no lo nombra: ni se busca.
  let buscoEnCommons = false;
  const cali = { titulo: 'Grupo Cali explica los motivos de la suspensión de su show', copete: 'Lo comparan con el show de Messi', seccion: 'Cultura y agenda', fuentesConsultadas: [] };
  const r = await elegirFotoParaNota(cali, {
    clave: 'g', claveRespaldo: null,
    fetchFn: async (url) => { if (String(url).includes('commons')) buscoEnCommons = true; return respuestaGemini({ persona: 'Lionel Messi' }); },
  });
  assert.equal(r.elegida, null);
  assert.equal(buscoEnCommons, false);
  assert.match(r.razon, /el título no/);
  // gizbaj: la foto de Verstappen es de este año, pero la visión ve un Fórmula 1 para un choque de GT: no corresponde.
  const verstappen = { titulo: 'Max Verstappen choca al argentino Ezequiel Pérez Companc en Portugal', seccion: 'Automovilismo', fuentesConsultadas: [], fecha: '2026-10-16T12:00:00Z' };
  const fetchFn = async (url, init) => {
    if (String(url).includes('generativelanguage')) {
      const conImagen = JSON.parse(init.body).contents[0].parts.length > 1;
      return respuestaGemini(conImagen ? { menor: false, tiene_marca: false, grafica: false, stock: false, corresponde: 'no', descripcion: 'un Fórmula 1 Red Bull en pista' } : { persona: 'Max Verstappen' });
    }
    if (String(url).includes('commons.wikimedia.org/w/api.php')) return { ok: true, json: async () => ({ query: { pages: { 1: paginaCommons('Verstappen_2026.jpg', 2026) } } }) };
    return { ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => JPEG(400) };
  };
  const r2 = await elegirFotoParaNota(verstappen, { clave: 'g', claveRespaldo: null, fetchFn });
  assert.equal(r2.elegida, null);
  assert.match(r2.razon, /no corresponde[\s\S]*Fórmula 1/);
});

// ------------------------------------------------------------------ regla 206: un solo camino

test('regla 206: un solo camino de ilustración (Cloudflare con SDXL): sin el código muerto ni los probadores, y el Worker con un solo modelo', async () => {
  for (const f of ['ingesta/foto-ia.mjs', 'ingesta/foto-stock.mjs', 'pruebas/foto-ia.test.mjs', 'pruebas/foto-stock.test.mjs', 'redes/probar-flux.mjs',
    'redes/probar-imagen-nota.mjs', '.github/workflows/probar-flux.yml', '.github/workflows/probar-imagen-nota.yml', 'docs/fotos/PROPUESTA-IMAGEN-IA.md', 'docs/fotos/PROPUESTA-STOCK.md']) {
    assert.ok(!fs.existsSync(path.join(RAIZ, f)), `${f} se borró`);
  }
  const { MODELOS } = await import('../infra/imagenes-cloudflare/worker.mjs');
  assert.deepEqual(Object.keys(MODELOS), ['sdxl', 'flux']);  // flux: prueba del 22/10, si gana pasa a ser el único
  const claves = fs.readFileSync(path.join(RAIZ, 'reels/claves.mjs'), 'utf8');
  assert.ok(!/GEMINI_API_KEY_IMAGENES|claveImagenes/.test(claves), 'sin la clave de imágenes que nunca se usó');
  const ilustrar = fs.readFileSync(path.join(RAIZ, 'web/scripts/ilustrar-notas.mjs'), 'utf8');
  assert.ok(!/GEMINI_API_KEY_REDES|interactions|flash-image/.test(ilustrar), 'la clave paga de las voces nunca se usa para imágenes');
});
