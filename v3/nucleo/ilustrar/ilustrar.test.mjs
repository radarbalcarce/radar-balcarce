// Pruebas de las ilustraciones con IA (REGLAS § 7, paso 3): qué notas se saltan, cuándo se agotó la búsqueda de foto real, el prompt, el control con visión, el reintento,
// que una falla no tira nada y que lo guardado tiene el formato de las copias propias del sitio. Sin red: Gemini, Workers AI y R2 son falsos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CREDITO, motivoParaSaltar, busquedaAgotada, leTocaIlustrar, tonoDeLaNota, armarInstruccion, promptFinal, problemaDelPrompt, interpretarControl, controlarImagen,
  ilustrarUna, guardarIlustracion, huellaDe, generarImagen, debeBuscarFotoReal, conIlustracionHecha, conEstadoDeIlustracion, sinIlustracion, esIlustracion,
  debeRevisarFotoRealUnaVez, REVISION_FOTO_REAL, motivoPorPersona, tipoDeImagen, NEURONAS_POR_IMAGEN, NEURONAS_GRATIS_POR_DIA, POR_DIA, MODELO_DE_IMAGEN,
} from './ilustrar.mjs';
import { conCopiaPropia, esCopiaPropia } from '../../sitio/fotos-copia.mjs';
import { creditoConPrefijo } from '../../redes/texto.mjs';

const AHORA = new Date('2026-11-06T15:00:00Z');
const hace = (h) => new Date(AHORA.getTime() - h * 3600_000).toISOString();
const JPEG = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4, 5, 6]);
const PROMPT_BUENO = 'Candid documentary photograph of an empty tree-lined street with low houses and gentle hills far away, sharp focus, high detail, natural light, no people, no text, no logos';
const CONTROL_OK = { personas: false, rostros: false, texto: false, logos: false, sensible: false, raro: false, razon: 'Una calle vacía.' };

const nota = (extra = {}) => ({
  id: 'abc1234', titulo: 'Arreglan el alumbrado de una calle céntrica', bajada: 'La obra termina esta semana.', cuerpo: ['Se cambian las luminarias.', 'Los trabajos siguen.'], seccion: 'Balcarce',
  ficha: { que: 'Cambio de luminarias', donde: 'Balcarce' }, noPublicar: null, foto: null, creada: hace(30), verificacion: { fotoIntentos: 4, fotoMotivo: 'sin-candidatas' }, ...extra,
});

/** Un Gemini falso: `texto(prompt, { json, imagenes })`. Contesta el prompt (si es el pedido de prompt) o el control (si trae imagen). */
function geminiFalso({ prompts = [PROMPT_BUENO], controles = [CONTROL_OK], falla = null } = {}) {
  let p = 0; let c = 0;
  const g = {
    pedidos: [],
    async texto(pedido, { json = false, imagenes = [] } = {}) {
      g.pedidos.push({ pedido, json, imagenes: imagenes.length });
      if (falla) throw new Error(falla);
      if (imagenes.length) { const r = controles[Math.min(c, controles.length - 1)]; c += 1; if (r instanceof Error) throw r; return r; }
      const r = prompts[Math.min(p, prompts.length - 1)]; p += 1; return r;
    },
  };
  return g;
}
const aiFalso = ({ falla = null, bytes = JPEG } = {}) => ({
  llamadas: [],
  async run(modelo, params) {
    this.llamadas.push({ modelo, params });
    if (falla) throw new Error(falla);
    return { image: Buffer.from(bytes).toString('base64') };
  },
});
const bucketFalso = () => ({ objetos: new Map(), puts: 0, async head(k) { return this.objetos.has(k) ? { key: k } : null; }, async put(k, v, o) { this.puts += 1; this.objetos.set(k, { v, o }); } });

// ------------------------------------------------------------------ qué notas

test('motivoParaSaltar: una nota común se ilustra; foto, muerte, velorio, sepelio, lo rojo, no_publicar y las de servicio, no', () => {
  assert.equal(motivoParaSaltar(nota()), null);
  assert.equal(motivoParaSaltar(nota({ foto: { url: 'https://x.test/a.jpg', credito: 'Foto: Medio' } })), 'ya tiene foto');
  assert.equal(motivoParaSaltar(nota({ foto: { url: 'https://radarbalcarce.com/foto/aaaaaaaaaaaaaaaaaaaaaaaa.jpg', ilustracion: true } })), 'ya tiene ilustración');
  assert.match(motivoParaSaltar(nota({ titulo: 'Murió un vecino en la ruta 226' })), /muerte/);
  assert.match(motivoParaSaltar(nota({ cuerpo: ['El velatorio será mañana.'] })), /muerte|velorio/);
  assert.match(motivoParaSaltar(nota({ titulo: 'Sepelios de hoy en Balcarce' })), /nunca se publica|muerte/);
  assert.match(motivoParaSaltar(nota({ titulo: 'Detuvieron a un hombre por abuso sexual' })), /semáforo rojo/);
  assert.match(motivoParaSaltar(nota({ bajada: 'Hubo un caso de grooming en una escuela' })), /semáforo rojo/);
  assert.equal(motivoParaSaltar(nota({ noPublicar: { motivo: 'identifica a un menor' } })), 'marcada no_publicar');
  assert.equal(motivoParaSaltar(nota({ id: 'clima-2026-11-06' })), 'nota de servicio');
  assert.equal(motivoParaSaltar(nota({ ficha: { marca: 'servicio' } })), 'nota de servicio');
  assert.equal(motivoParaSaltar({ titulo: 'sin id' }), 'sin id o título');
});

test('motivoPorPersona e ilustrarUna: una nota sobre una persona pública identificable no se ilustra (caso del Papa, 10/11: «sin nadie» daba un patio vacío) y no gasta Gemini ni imagen; sin persona, sí', async () => {
  assert.match(motivoPorPersona(nota({ titulo: 'El Papa León XIV llegó a la Argentina para iniciar una visita de cuatro días', seccion: 'Argentina' })), /persona identificable.*Papa León/);
  assert.match(motivoPorPersona(nota({ titulo: 'Colapinto largará desde el fondo en Interlagos' })), /persona identificable/);
  assert.equal(motivoPorPersona(nota({ titulo: 'Cambian las luminarias de la plaza' })), null);
  // motivoParaSaltar no la mira (la foto de archivo del lugar sí sirve para una nota sobre una persona)
  assert.equal(motivoParaSaltar(nota({ titulo: 'El Papa León XIV llegó a la Argentina' })), null);
  let pedidos = 0;
  const gemini = { texto: async () => { pedidos += 1; return PROMPT_BUENO; } };
  const ai = { run: async () => { pedidos += 1; return {}; } };
  const r = await ilustrarUna(nota({ titulo: 'El Papa León XIV llegó a la Argentina para iniciar una visita de cuatro días' }), { gemini, ai });
  assert.equal(r.ok, false);
  assert.equal(r.final, true);
  assert.match(r.motivo, /persona identificable/);
  assert.equal(pedidos, 0);
});

test('debeRevisarFotoRealUnaVez: sólo ilustraciones con IA de notas del núcleo, de los últimos 7 días y una sola vez; no el clima ni lo propio', () => {
  const foto = { url: 'https://radarbalcarce.com/foto/aaaaaaaaaaaaaaaaaaaaaaaa.jpg', ilustracion: true };
  const il = (extra = {}) => nota({ id: 'abc1234', creada: hace(60), foto, verificacion: { ilustracion: { hecha: true, ...extra } } });
  assert.equal(debeRevisarFotoRealUnaVez(il(), AHORA), true);
  assert.equal(debeRevisarFotoRealUnaVez(il({ revisionFotoReal: REVISION_FOTO_REAL }), AHORA), false, 'ya se revisó una vez');
  assert.equal(debeRevisarFotoRealUnaVez(il({ realIntentada: hace(0.1) }), AHORA), false, 'intento reciente');
  assert.equal(debeRevisarFotoRealUnaVez({ ...il(), creada: hace(24 * 8) }, AHORA), false, 'más de 7 días');
  assert.equal(debeRevisarFotoRealUnaVez({ ...il(), id: 'clima-2026-11-06' }, AHORA), false);
  assert.equal(debeRevisarFotoRealUnaVez({ ...il(), id: 'redaccion-1' }, AHORA), false);
  assert.equal(debeRevisarFotoRealUnaVez({ ...il(), ficha: { marca: 'servicio' } }, AHORA), false);
  assert.equal(debeRevisarFotoRealUnaVez({ ...il(), foto: { url: 'https://x.test/a.jpg' } }, AHORA), false, 'una foto real no se revisa');
});

test('motivoParaSaltar: Policiales y Política con tono sobrio sí se ilustran (regla 185: la imagen nunca lleva personas)', () => {
  assert.equal(motivoParaSaltar(nota({ seccion: 'Policiales', titulo: 'Allanaron una casa por una estafa', cuerpo: ['Hubo dos allanamientos.'] })), null);
  assert.equal(motivoParaSaltar(nota({ seccion: 'Política', titulo: 'El Concejo aprobó el presupuesto' })), null);
});

test('busquedaAgotada: 2 intentos (11/11; antes 4), un motivo final con 2 intentos, o una nota de más de 3 h (antes 24); mientras, no', () => {
  assert.equal(busquedaAgotada(nota({ creada: hace(2), verificacion: { fotoIntentos: 4 } }), AHORA), true);
  assert.equal(busquedaAgotada(nota({ creada: hace(2), verificacion: { fotoIntentos: 3, fotoMotivo: 'error-vision' } }), AHORA), false);
  assert.equal(busquedaAgotada(nota({ creada: hace(2), verificacion: { fotoIntentos: 2, fotoMotivo: 'todas-con-marca' } }), AHORA), true);
  assert.equal(busquedaAgotada(nota({ creada: hace(2), verificacion: { fotoIntentos: 1, fotoMotivo: 'chicas' } }), AHORA), false);
  assert.equal(busquedaAgotada(nota({ creada: hace(2), verificacion: { fotoIntentos: 2, fotoMotivo: 'error-vision' } }), AHORA), false, 'error-vision no es un motivo final');
  assert.equal(busquedaAgotada(nota({ creada: hace(30), verificacion: { fotoIntentos: 1 } }), AHORA), true, 'más de 24 h: nadie la vuelve a buscar');
  assert.equal(busquedaAgotada(nota({ creada: hace(2), verificacion: {} }), AHORA), false);
});

test('leTocaIlustrar: sólo con la búsqueda agotada; lo resuelto, lo saltado y un intento reciente no', () => {
  assert.deepEqual(leTocaIlustrar(nota(), AHORA), { toca: true, motivo: null });
  assert.equal(leTocaIlustrar(nota({ creada: hace(2), verificacion: { fotoIntentos: 1 } }), AHORA).toca, false);
  assert.equal(leTocaIlustrar(nota({ verificacion: { fotoIntentos: 4, ilustracion: { final: true, motivo: 'x' } } }), AHORA).toca, false);
  const saltada = leTocaIlustrar(nota({ titulo: 'Falleció un vecino' }), AHORA);
  assert.equal(saltada.toca, false);
  assert.equal(saltada.saltar, true);
  assert.equal(leTocaIlustrar(nota({ verificacion: { fotoIntentos: 4, ilustracion: { fallos: 1, intentada: hace(0.1) } } }), AHORA).toca, false);
  assert.equal(leTocaIlustrar(nota({ verificacion: { fotoIntentos: 4, ilustracion: { fallos: 1, intentada: hace(1) } } }), AHORA).toca, true);
});

// ------------------------------------------------------------------ el prompt

test('tonoDeLaNota y el pedido a Gemini: sobrio en Policiales, alegre en fiestas, con la escena de la sección y sin permitir gente', () => {
  assert.equal(tonoDeLaNota(nota({ seccion: 'Policiales' })), 'sobrio');
  assert.equal(tonoDeLaNota(nota({ titulo: 'Se viene la fiesta de la primavera' })), 'alegre');
  assert.equal(tonoDeLaNota(nota({ titulo: 'Choque en la ruta 55' })), 'sobrio');
  assert.equal(tonoDeLaNota(nota()), 'neutro');
  const p = armarInstruccion(nota({ seccion: 'Política', titulo: 'El Concejo aprobó el presupuesto' }));
  assert.match(p, /ninguna persona/);
  assert.match(p, /POLÍTICA: nada de escritorio/);
  assert.match(p, /INGLÉS/);
  assert.match(p, /El Concejo aprobó el presupuesto/);
  assert.match(armarInstruccion(nota({ seccion: 'Fútbol' })), /DEPORTE/);
  assert.match(armarInstruccion(nota({ titulo: 'Pedro Gómez presentó su disco', seccion: 'Cultura' })), /PERSONA REAL/);
});

test('promptFinal: una línea, sin comillas, con el tono y el agregado, siempre dentro del máximo', () => {
  const p = promptFinal('"Candid documentary photograph of an empty street.\n"', 'alegre');
  assert.ok(!/["\n]/.test(p));
  assert.match(p, /bright warm sunny daylight/);
  assert.match(p, /signage-free$/);
  assert.ok(promptFinal('x '.repeat(900), 'neutro').length <= 700);
  assert.equal(promptFinal('', 'neutro'), '');
});

test('problemaDelPrompt: nunca gente, armas, marcas, la escena de un hecho ni el nombre de alguien de la nota; «no people» está bien', () => {
  assert.equal(problemaDelPrompt(PROMPT_BUENO, nota()), null);
  assert.match(problemaDelPrompt('Candid documentary photograph of a crowd of fans at a stadium, sharp focus, natural light', nota()), /crowd/);
  assert.match(problemaDelPrompt('Candid documentary photograph of a child with a toy near a school gate, sharp focus, natural light', nota()), /child/);
  assert.match(problemaDelPrompt('Candid documentary photograph of a police car on an empty road, sharp focus, natural light', nota({ seccion: 'Policiales' })), /police car/);
  assert.match(problemaDelPrompt('Candid documentary photograph of a desk with a laptop in an office, sharp focus, natural light', nota({ seccion: 'Política' })), /desk|laptop/);
  assert.match(problemaDelPrompt('Candid documentary photograph of smoke over an empty street at dusk, sharp focus, natural light', nota({ seccion: 'Policiales' })), /smoke/);
  assert.match(problemaDelPrompt('Candid documentary photograph of an empty street, sharp focus, natural light, a flag on a pole', nota()), /flag/);
  assert.match(problemaDelPrompt('corto', nota()), /demasiado corto/);
  const conNombre = nota({ titulo: 'Fito Páez cantó en el Teatro Español', cuerpo: ['Fito Páez tocó el piano.'] });
  assert.match(problemaDelPrompt('Candid documentary photograph of the stage where Páez played the piano, sharp focus, natural light', conNombre), /nombra a/);
});

// ------------------------------------------------------------------ el control con visión

test('interpretarControl: pasa sólo con las seis claves en false; una que falta es un no', () => {
  assert.equal(interpretarControl(CONTROL_OK).ok, true);
  const mal = interpretarControl({ ...CONTROL_OK, texto: true, logos: true });
  assert.equal(mal.ok, false);
  assert.match(mal.motivo, /texto, logos/);
  const { raro, ...sinRaro } = CONTROL_OK;
  assert.equal(interpretarControl(sinRaro).ok, false);
  assert.equal(interpretarControl(null).ok, false);
  assert.equal(interpretarControl([]).ok, false);
});

test('controlarImagen: manda la imagen a la visión; si Gemini no puede mirarla, no la da por mala (noPudo), y el tope diario se relanza', async () => {
  const g = geminiFalso();
  assert.equal((await controlarImagen(g, JPEG)).ok, true);
  assert.equal(g.pedidos[0].imagenes, 1);
  assert.equal(g.pedidos[0].json, true);
  const r = await controlarImagen(geminiFalso({ controles: [new Error('gemini-429: sin cupo')] }), JPEG);
  assert.deepEqual([r.ok, r.noPudo], [false, true]);
  await assert.rejects(controlarImagen(geminiFalso({ controles: [new Error('tope-diario')] }), JPEG), /tope-diario/);
});

// ------------------------------------------------------------------ el generador

test('generarImagen: usa FLUX schnell con pasos, sin semilla (Cloudflare la rechaza), y acepta JPEG y PNG, nada más', async () => {
  const ai = aiFalso();
  const b = await generarImagen(ai, PROMPT_BUENO);
  assert.deepEqual([...b], [...JPEG]);
  assert.equal(ai.llamadas[0].modelo, '@cf/black-forest-labs/flux-1-schnell');
  assert.equal(ai.llamadas[0].modelo, MODELO_DE_IMAGEN);
  assert.deepEqual(ai.llamadas[0].params, { prompt: PROMPT_BUENO, steps: 6 });
  assert.deepEqual([...(await generarImagen(aiFalso({ bytes: PNG }), 'x'))], [...PNG]);
  await assert.rejects(generarImagen(aiFalso({ bytes: new Uint8Array([0x47, 0x49, 0x46, 0x38, 1, 2, 3, 4, 5, 6, 7, 8, 9]) }), 'x'), /JPEG ni un PNG/);
  await assert.rejects(generarImagen({ run: async () => ({}) }, 'x'), /no devolvió imagen/);
});

test('PNG (lo que devuelve FLUX schnell): tipo, mime para el control de Gemini y content-type en R2 con el mismo nombre .jpg que sirve el sitio', async () => {
  assert.equal(tipoDeImagen(PNG), 'image/png');
  assert.equal(tipoDeImagen(JPEG), 'image/jpeg');
  assert.equal(tipoDeImagen(new Uint8Array([1, 2, 3])), null);
  const g = geminiFalso();
  let mime = null;
  const texto = g.texto.bind(g);
  g.texto = async (p, o = {}) => { if (o.imagenes?.length) mime = o.imagenes[0].mime; return texto(p, o); };
  const r = await ilustrarUna(nota(), { gemini: g, ai: aiFalso({ bytes: PNG }) });
  assert.equal(r.ok, true);
  assert.equal(mime, 'image/png');
  const b = bucketFalso();
  const foto = await guardarIlustracion(b, PNG, nota(), '2026-11-06T15:00:00.000Z');
  const huella = await huellaDe(PNG);
  assert.equal(b.objetos.get(`copias/${huella}.jpg`).o.httpMetadata.contentType, 'image/png');
  assert.equal(foto.url, `https://radarbalcarce.com/foto/${huella}.jpg`);
  assert.equal(esCopiaPropia(foto.copia), true);
});

test('el costo: ~77 neuronas por imagen y el tope de 40 por día entra holgado en las 10.000 gratis', () => {
  assert.equal(NEURONAS_POR_IMAGEN, 77);
  assert.ok(POR_DIA * NEURONAS_POR_IMAGEN < NEURONAS_GRATIS_POR_DIA / 2);
});

// ------------------------------------------------------------------ una nota

test('ilustrarUna: prompt, imagen y control; a la primera sale una sola imagen', async () => {
  const g = geminiFalso();
  const ai = aiFalso();
  const r = await ilustrarUna(nota(), { gemini: g, ai, azar: () => 0.5 });
  assert.equal(r.ok, true);
  assert.equal(r.generadas, 1);
  assert.match(r.prompt, /Candid documentary photograph/);
  assert.match(r.prompt, /bright natural daylight/, 'lleva el tono de la nota');
  assert.deepEqual([...r.bytes], [...JPEG]);
  assert.equal(ai.llamadas.length, 1);
  assert.equal(g.pedidos.length, 2, 'un pedido de prompt y uno de control');
});

test('ilustrarUna: si el control rechaza, UN reintento con otra semilla; si pasa, sale; si vuelve a rechazar, queda sin imagen (final)', async () => {
  const mal = { ...CONTROL_OK, texto: true };
  let ai = aiFalso();
  const ok = await ilustrarUna(nota(), { gemini: geminiFalso({ controles: [mal, CONTROL_OK] }), ai, azar: Math.random });
  assert.equal(ok.ok, true);
  assert.equal(ok.generadas, 2);
  assert.equal(ai.llamadas.length, 2);

  ai = aiFalso();
  const no = await ilustrarUna(nota(), { gemini: geminiFalso({ controles: [mal, mal] }), ai });
  assert.deepEqual([no.ok, no.final], [false, true]);
  assert.match(no.motivo, /el control vio: texto/);
  assert.equal(ai.llamadas.length, 2, 'nunca más de dos imágenes por nota');
});

test('ilustrarUna: un prompt que nombra gente se pide una vez más; si vuelve a fallar, final y sin generar nada', async () => {
  const gente = 'Candid documentary photograph of a crowd of people in a square, sharp focus, natural light';
  let ai = aiFalso();
  const g1 = geminiFalso({ prompts: [gente, PROMPT_BUENO] });
  assert.equal((await ilustrarUna(nota(), { gemini: g1, ai })).ok, true);
  assert.equal(g1.pedidos.filter((x) => !x.imagenes).length, 2);

  ai = aiFalso();
  const r = await ilustrarUna(nota(), { gemini: geminiFalso({ prompts: [gente, gente] }), ai });
  assert.deepEqual([r.ok, r.final], [false, true]);
  assert.match(r.motivo, /prompt descartado/);
  assert.equal(ai.llamadas.length, 0);
});

test('ilustrarUna: una falla técnica (Gemini, Workers AI o la visión) nunca tira: devuelve ok false y no final', async () => {
  const a = await ilustrarUna(nota(), { gemini: geminiFalso({ falla: 'gemini-503: saturado' }), ai: aiFalso() });
  assert.deepEqual([a.ok, a.final], [false, false]);
  assert.match(a.motivo, /Gemini no escribió el prompt/);

  const b = await ilustrarUna(nota(), { gemini: geminiFalso(), ai: aiFalso({ falla: 'AiError: 3040 capacity' }) });
  assert.deepEqual([b.ok, b.final, b.generadas], [false, false, 2]);
  assert.match(b.motivo, /Workers AI/);

  const c = await ilustrarUna(nota(), { gemini: geminiFalso({ controles: [new Error('gemini-429')] }), ai: aiFalso() });
  assert.deepEqual([c.ok, c.final], [false, false]);
  assert.match(c.motivo, /no se pudo mirar/);
});

test('ilustrarUna: sin cupo de imágenes no genera (ni cuenta un intento); el tope diario de Gemini se relanza', async () => {
  const ai = aiFalso();
  const r = await ilustrarUna(nota(), { gemini: geminiFalso(), ai, cupo: async () => false });
  assert.deepEqual([r.ok, r.final, r.sinCupo], [false, false, true]);
  assert.equal(ai.llamadas.length, 0);
  let usadas = 0;
  const dos = await ilustrarUna(nota(), { gemini: geminiFalso({ controles: [{ ...CONTROL_OK, rostros: true }, { ...CONTROL_OK, rostros: true }] }), ai: aiFalso(), cupo: async () => { usadas += 1; return true; } });
  assert.equal(usadas, 2);
  assert.equal(dos.final, true);
  await assert.rejects(ilustrarUna(nota(), { gemini: geminiFalso({ falla: 'tope-diario' }), ai: aiFalso() }), /tope-diario/);
});

// ------------------------------------------------------------------ guardar

test('guardarIlustracion: R2 copias/<huella>.jpg con caché eterna y la foto con el crédito de IA, en el formato de las copias propias del sitio', async () => {
  const b = bucketFalso();
  const foto = await guardarIlustracion(b, JPEG, nota(), '2026-11-06T15:00:00.000Z');
  const huella = await huellaDe(JPEG);
  assert.match(huella, /^[0-9a-f]{24}$/);
  assert.deepEqual([...b.objetos.keys()], [`copias/${huella}.jpg`]);
  const o = b.objetos.get(`copias/${huella}.jpg`);
  assert.equal(o.o.httpMetadata.contentType, 'image/jpeg');
  assert.match(o.o.httpMetadata.cacheControl, /immutable/);
  assert.equal(foto.url, `https://radarbalcarce.com/foto/${huella}.jpg`);
  assert.equal(foto.credito, 'Ilustración generada con IA');
  assert.equal(foto.credito, CREDITO);
  assert.equal(foto.ilustracion, true);
  assert.match(foto.alt, /^Ilustración generada con IA: Cambio de luminarias en Balcarce$/);
  assert.equal(esIlustracion(foto), true);
  // el sitio la reconoce como copia propia (no la vuelve a copiar) y la muestra tal cual
  assert.equal(esCopiaPropia(foto.copia), true);
  const mostrada = conCopiaPropia(foto);
  assert.equal(mostrada.url, foto.url);
  assert.equal(mostrada.credito, 'Ilustración generada con IA');
  // las redes la tratan como ilustración: el crédito no lleva «Foto:» delante
  assert.equal(creditoConPrefijo(foto.credito), 'Ilustración generada con IA');
  // la misma imagen dos veces se guarda una sola
  await guardarIlustracion(b, JPEG, nota(), '2026-11-06T16:00:00.000Z');
  assert.equal(b.puts, 1);
});

// ------------------------------------------------------------------ las marcas

test('las marcas en verificacion: hecha (con prompt y control), estado técnico y vuelta atrás cuando una foto real la reemplaza', () => {
  const v = conIlustracionHecha({ fotoIntentos: 4, fotoMotivo: 'sin-candidatas' }, { prompt: PROMPT_BUENO, control: { ok: true, razon: 'Una calle.' }, ahoraISO: '2026-11-06T15:00:00Z' });
  assert.equal(v.fotoMotivo, 'sin-candidatas', 'se conserva por qué no había foto real');
  assert.deepEqual([v.ilustracion.hecha, v.ilustracion.final, v.ilustracion.modelo], [true, false, MODELO_DE_IMAGEN]);
  assert.equal(v.ilustracion.control.ok, true);
  assert.deepEqual(conEstadoDeIlustracion(v, { realIntentos: 1 }).ilustracion.hecha, true);
  const sin = sinIlustracion(v, '2026-11-06T18:00:00Z');
  assert.equal(sin.ilustracion, undefined);
  assert.equal(sin.ilustracionReemplazada, '2026-11-06T18:00:00Z');
});

test('debeBuscarFotoReal: sólo una ilustración hecha, hasta 3 intentos, cada 3 h y durante 72 h', () => {
  const il = (extra) => nota({ foto: { url: 'https://radarbalcarce.com/foto/a.jpg', ilustracion: true }, verificacion: { ilustracion: { hecha: true, cuando: hace(5), ...extra } } });
  assert.equal(debeBuscarFotoReal(il({}), AHORA), true);
  assert.equal(debeBuscarFotoReal(il({ realIntentos: 3 }), AHORA), false);
  assert.equal(debeBuscarFotoReal(il({ realIntentada: hace(1) }), AHORA), false);
  assert.equal(debeBuscarFotoReal(il({ realIntentada: hace(4) }), AHORA), true);
  assert.equal(debeBuscarFotoReal(il({ cuando: hace(80) }), AHORA), false);
  assert.equal(debeBuscarFotoReal(nota(), AHORA), false);
});
