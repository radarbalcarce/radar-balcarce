// El criterio editorial es uno solo: CRITERIO-EDITORIAL.md.
//
// Hasta el 25/09 el criterio estaba repartido entre EDITORIAL.md, MANUAL.md,
// el prompt escrito adentro de reels/reescritura.mjs y números sueltos en
// cinco archivos, y no se sabía cuál mandaba. Hernán y Andrés pidieron un solo
// documento que todos respeten. Estas pruebas cuidan que siga así:
//
//   · la IA lee la instrucción de ese archivo, y no de una copia en el código;
//   · si el archivo falta o está roto, el código falla a la vista (nunca
//     escribe sin criterio);
//   · cada número de la tabla "Los números" es el que usa el código, y cada
//     número del código está en la tabla;
//   · los números que el documento repite en el texto y en la instrucción de
//     la IA dicen lo mismo que la tabla.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as criterio from '../ingesta/criterio.mjs';
import { leerCriterio, RUTA_DEL_CRITERIO } from '../ingesta/prompt-editorial.mjs';
import { LIMITES } from '../ingesta/verificar.mjs';
import * as fuentes from '../ingesta/fuentes.mjs';
import {
  INSTRUCCION_EDITORIAL, CRITERIO_EDITORIAL, PALABRAS_SERIAS, esTemaSerio,
  MAXIMO_DE_INTENTOS, PALABRAS_MINIMAS_DE_MATERIAL, DIAS_DE_INTENTOS, REESCRITURAS_POR_CORRIDA,
} from '../reels/reescritura.mjs';
import { REGLAS_FACEBOOK, REGLAS_PIEZAS, SECCIONES_QUE_ESPERAN_PERSONA } from '../redes/elegir.mjs';
import { PALABRAS_MINIMAS_CUERPO } from '../web/lib/cuerpo.js';
import { HORAS_EN_PORTADA, DIAS_DE_ARCHIVO, MAXIMO_EN_ARCHIVO } from '../web/lib/archivo.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8').replace(/\r\n/g, '\n');
const DOC = leer('CRITERIO-EDITORIAL.md');
const {
  TITULO, BAJADA, CUERPO, PARTES, REESCRITURA, PORTADA, FACEBOOK, PIEZAS, COPIA_MAXIMA,
} = criterio;

/** Las filas de la tabla "Los números": { clave, numero }. */
function filasDeLaTabla() {
  const a = DOC.indexOf('<!-- NUMEROS:INICIO -->');
  const b = DOC.indexOf('<!-- NUMEROS:FIN -->');
  assert.ok(a >= 0 && b > a, 'falta la tabla "Los números" entre sus marcas');
  return DOC.slice(a, b).split('\n')
    .map((l) => l.match(/^\|\s*[^|]+\|\s*([\d.]+)\s*\|\s*`([\p{L}_]+(?:\.[\p{L}_ ]+)?)`\s*\|\s*$/u))
    .filter(Boolean)
    .map((m) => ({ numero: Number(m[1]), clave: m[2] }));
}

/** Todos los números del código, por clave ("TITULO.maximo"). */
function numerosDelCodigo() {
  const salida = {};
  for (const [nombre, valor] of Object.entries(criterio.NUMEROS_DEL_CRITERIO)) {
    if (typeof valor === 'number') salida[nombre] = valor;
    else for (const [k, v] of Object.entries(valor)) salida[`${nombre}.${k}`] = v;
  }
  return salida;
}

test('la tabla "Los números" del criterio dice lo mismo que el código, fila por fila', () => {
  const filas = filasDeLaTabla();
  const codigo = numerosDelCodigo();
  assert.ok(filas.length >= 50, `la tabla tiene sólo ${filas.length} filas: ¿cambió el formato?`);
  const vistas = new Set();
  for (const { clave, numero } of filas) {
    assert.ok(!vistas.has(clave), `la clave ${clave} está dos veces en la tabla`);
    vistas.add(clave);
    assert.ok(clave in codigo, `la tabla nombra ${clave}, que no existe en ingesta/criterio.mjs`);
    assert.equal(numero, codigo[clave], `${clave}: el documento dice ${numero} y el código ${codigo[clave]}`);
  }
  for (const clave of Object.keys(codigo)) {
    assert.ok(vistas.has(clave), `${clave} está en ingesta/criterio.mjs y falta en la tabla del documento`);
  }
});

test('los que usan los números los toman del criterio (o dicen lo mismo)', () => {
  // El verificador.
  assert.deepEqual(LIMITES, {
    titulo: TITULO.maximo,
    copete: BAJADA.maximo,
    guion: criterio.GUION.maximo,
    cuerpo: CUERPO.maximo,
    clave: PARTES.clave,
    dato: PARTES.dato,
    aporte: PARTES.aporte,
    textoRedes: PARTES.textoRedes,
    etiqueta: PARTES.etiqueta,
    copiaMaxima: COPIA_MAXIMA,
  });
  // La reescritura.
  assert.equal(MAXIMO_DE_INTENTOS, REESCRITURA.intentosMaximos);
  assert.equal(PALABRAS_MINIMAS_DE_MATERIAL, REESCRITURA.palabrasMinimasDeMaterial);
  assert.equal(DIAS_DE_INTENTOS, REESCRITURA.diasDeIntentos);
  assert.equal(REESCRITURAS_POR_CORRIDA, REESCRITURA.porCorrida);
  // La popularidad de lo de afuera: fuentes.mjs la reexporta, es la misma. No hay cupos (regla 215) ni mínimos por sección.
  assert.equal(fuentes.POPULARIDAD, criterio.POPULARIDAD);
  assert.equal(fuentes.AREAS_CHICAS, criterio.AREAS_CHICAS);
  assert.equal(fuentes.SECCIONES_SOLO_DE_ACA, criterio.SECCIONES_SOLO_DE_ACA);
  assert.ok(!('SECCIONES_SIN_FRONTERAS' in fuentes) && !('SECCIONES_SIN_FRONTERAS' in criterio), 'la ciencia y la tecnología ya no tienen excepción (regla 260)');
  assert.ok(!('PISO_DE_AFUERA' in fuentes), 'el piso de puntaje ya no existe (27/09)');
  for (const viejo of ['CUPO_DE_AFUERA', 'CUPO_POR_DEFECTO', 'MEDIOS_DE_AFUERA', 'MEDIOS_POR_DEFECTO', 'MEDIOS_CON_FIGURA']) {
    assert.ok(!(viejo in fuentes) && !(viejo in criterio), `${viejo} ya no existe (Hernán, 17/10: no hay ningún cupo de nada)`);
  }
  // Las redes.
  for (const k of Object.keys(FACEBOOK)) assert.equal(REGLAS_FACEBOOK[k], FACEBOOK[k], `Facebook: ${k}`);
  // Desde el 28/09 las piezas sólo usan el piso de los podcasts: las historias
  // de una nota y el feed de fotos de Instagram se sacaron del código (no salían
  // desde el 24/09), y sus números (historiasDeNotas, relevanciaFeed y
  // feedPorDia) se borraron de ingesta/criterio.mjs y de la tabla.
  // Desde el 29/09, también lo de afuera en los repasos: su puntaje mínimo y
  // cuántas como mucho.
  assert.deepEqual(Object.keys(REGLAS_PIEZAS), ['relevanciaParaPodcast', 'relevanciaAfuera', 'afueraPorPodcast']);
  for (const k of ['historiasDeNotas', 'relevanciaFeed', 'feedPorDia']) assert.ok(!(k in PIEZAS), `PIEZAS.${k} ya no existe`);
  assert.equal(REGLAS_PIEZAS.relevanciaParaPodcast, PIEZAS.relevanciaPodcast);
  assert.equal(REGLAS_PIEZAS.relevanciaAfuera, PIEZAS.relevanciaAfueraPodcast);
  assert.equal(REGLAS_PIEZAS.afueraPorPodcast, PIEZAS.notasDeAfueraPorPodcast);
  assert.deepEqual([...SECCIONES_QUE_ESPERAN_PERSONA].sort(), [...criterio.SECCIONES_QUE_ESPERAN_PERSONA].sort());
  // Los tres que viven en web/lib porque los compila la web.
  assert.equal(PALABRAS_MINIMAS_CUERPO, CUERPO.minimoParaPublicar);
  assert.equal(HORAS_EN_PORTADA, PORTADA.horas);
  assert.equal(DIAS_DE_ARCHIVO, PORTADA.diasDeArchivo);
  assert.equal(MAXIMO_EN_ARCHIVO, PORTADA.maximoDeNotas);
  const ventana = leer('web/lib/datos.js').match(/const VENTANA_HORAS = (\d+);/);
  assert.ok(ventana, 'no encuentro VENTANA_HORAS en web/lib/datos.js');
  assert.equal(Number(ventana[1]), PORTADA.horasNotaGrande);
  // El texto completo que recibe la IA.
  assert.match(leer('ingesta/articulo.mjs'), /max = REESCRITURA\.caracteresDelTextoCompleto/);
});

test('la IA lee la instrucción de CRITERIO-EDITORIAL.md, no de una copia en el código', () => {
  const c = leerCriterio();
  const [antesDelTono, despuesDelTono] = c.reglas.split('{{TONO}}');
  assert.ok(INSTRUCCION_EDITORIAL.startsWith(antesDelTono), 'la instrucción no empieza con las reglas del documento');
  assert.ok(INSTRUCCION_EDITORIAL.includes(c.tonoAmeno + despuesDelTono), 'el tono de todos los días no es el del documento');
  assert.ok(INSTRUCCION_EDITORIAL.endsWith(c.notaPanel), 'la nota del panel no es la del documento');
  assert.equal(CRITERIO_EDITORIAL, c.texto);
  assert.deepEqual(PALABRAS_SERIAS, c.palabrasSerias);
  // Nada del prompt quedó escrito en el código.
  const codigo = leer('reels/reescritura.mjs');
  assert.doesNotMatch(codigo, /Sos el editor digital/);
  assert.doesNotMatch(codigo, /const (REGLAS_FIJAS|TONO_AMENO|TONO_SERIO) = `/);
  // Se lee al cargar el módulo: si falla, no carga.
  assert.match(codigo, /^const CRITERIO = leerCriterio\(\);$/m);
  // La ruta sale del propio archivo, no del directorio desde el que se corre
  // (GitHub Actions, el panel y las pruebas arrancan desde lugares distintos).
  assert.equal(path.resolve(RUTA_DEL_CRITERIO), path.resolve(RAIZ, 'CRITERIO-EDITORIAL.md'));
  assert.match(leer('ingesta/prompt-editorial.mjs'), /fileURLToPath\(import\.meta\.url\)/);
});

test('las palabras que piden el tono serio salen del documento', () => {
  assert.ok(PALABRAS_SERIAS.includes('robo'));
  assert.ok(PALABRAS_SERIAS.includes('corte de luz'));
  assert.ok(PALABRAS_SERIAS.includes('inundación'));
  assert.ok(esTemaSerio({ seccion: 'Servicios', titulo: 'Corte de luz en el barrio Norte' }));
  assert.ok(!esTemaSerio({ seccion: 'Cultura y agenda', titulo: 'Llega la Fiesta del Postre' }));
});

test('sin criterio no se escribe: si el archivo falta o está roto, leerCriterio falla a la vista', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'criterio-'));
  const escribir = (texto) => { const r = path.join(dir, `c${Math.random()}.md`); fs.writeFileSync(r, texto); return r; };
  assert.throws(() => leerCriterio(path.join(dir, 'no-existe.md')), /no se pudo leer.*La IA no escribe sin criterio/s);
  // Sin las marcas.
  assert.throws(() => leerCriterio(escribir('# Criterio\n\nSin marcas.')), /falta la marca/);
  // Con el documento de verdad, pero sin el lugar del tono.
  assert.throws(() => leerCriterio(escribir(DOC.replace(/\{\{TONO\}\}\n6\./, '6.'))), /\{\{TONO\}\}/);
  // Con una parte vacía.
  const sinSerio = DOC.replace(/(<!-- PROMPT:TONO_SERIO:INICIO -->)[\s\S]*?(<!-- PROMPT:TONO_SERIO:FIN -->)/, '$1\n\n$2');
  assert.throws(() => leerCriterio(escribir(sinSerio)), /TONO_SERIO está vacía/);
  // Una marca repetida (por ejemplo, copiada en el texto) también es un error.
  assert.throws(() => leerCriterio(escribir(`${DOC}\n<!-- PROMPT:INICIO -->`)), /repetida/);
  // Sin palabras serias.
  const sinPalabras = DOC.replace(/(<!-- PALABRAS_SERIAS:INICIO -->)[\s\S]*?(<!-- PALABRAS_SERIAS:FIN -->)/, '$1\nninguna\n$2');
  assert.throws(() => leerCriterio(escribir(sinPalabras)), /tono serio/);
  // En CRLF (como en la PC) se lee igual que en LF (como en GitHub).
  const lf = leerCriterio(escribir(DOC));
  const crlf = leerCriterio(escribir(DOC.replace(/\n/g, '\r\n')));
  assert.equal(crlf.reglas, lf.reglas);
  assert.equal(crlf.notaPanel, lf.notaPanel);
  fs.rmSync(dir, { recursive: true, force: true });
});

const EN_PALABRAS = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco'];

test('los números que la instrucción de la IA dice en palabras son los de la tabla', () => {
  const { reglas, notaPanel } = leerCriterio();
  const plano = (s) => s.replace(/\s+/g, ' ');
  const r = plano(reglas);
  const p = plano(notaPanel);
  assert.ok(r.includes(`apunta a unos ${TITULO.objetivo} caracteres y NUNCA pasa de ${TITULO.maximo}`), 'título');
  assert.ok(r.includes(`unas ${BAJADA.palabras} palabras como mucho`), 'bajada');
  assert.ok(r.includes(`Va de ${CUERPO.palabrasPedidasMinimo} a ${CUERPO.palabrasPedidasMaximo} palabras`), 'cuerpo');
  assert.ok(r.includes(`hasta ${PARTES.textoRedes} caracteres`), 'texto para redes');
  assert.ok(r.includes(`de ${PARTES.clavesMinimo} a ${PARTES.clavesMaximo} puntos cortos`), 'claves');
  assert.ok(r.includes(`de ${PARTES.etiquetasMinimo} a ${PARTES.etiquetasMaximo} palabras o frases`), 'etiquetas');
  assert.ok(p.includes(`al menos ${CUERPO.minimoParaPublicar} palabras`), 'nota del panel: cuerpo mínimo');
  assert.ok(p.includes(`como mucho ${EN_PALABRAS[REESCRITURA.intentosMaximos]} veces`), 'nota del panel: intentos');
  assert.ok(p.includes(`hasta ${EN_PALABRAS[REESCRITURA.antecedentesMaximo]} notas`), 'nota del panel: antecedentes');
  assert.ok(p.includes(`últimos ${REESCRITURA.diasDeAntecedentes} días`), 'nota del panel: días de antecedentes');
});

test('los números que el documento repite en el texto son los de la tabla', () => {
  // Sin negritas ni saltos de línea: así se lee la frase entera.
  const t = DOC.replace(/\*\*/g, '').replace(/\s+/g, ' ').toLowerCase();
  const frases = [
    `apunta a unos ${TITULO.objetivo} caracteres y nunca pasa de ${TITULO.maximo}`,
    `unas ${BAJADA.palabras} palabras como mucho`,
    `de ${CUERPO.palabrasPedidasMinimo} a ${CUERPO.palabrasPedidasMaximo} palabras`,
    `con menos de ${CUERPO.minimoParaPublicar} no se publica`,
    `tiene ${CUERPO.minimoParaPublicar} palabras o más`,
    `más de ${COPIA_MAXIMA} palabras seguidas`,
    `menos de ${REESCRITURA.palabrasMinimasDeMaterial} palabras de resumen`,
    `${EN_PALABRAS[REESCRITURA.intentosMaximos]} intentos por nota`,
    `hasta ${EN_PALABRAS[REESCRITURA.antecedentesMaximo]} notas`,
    `últimos ${REESCRITURA.diasDeAntecedentes} días`,
    `hasta ${FACEBOOK.porDia} notas por día`,
    `relevancia ${FACEBOOK.relevanciaMinima} o más`,
    `de ${FACEBOOK.desdeHora} a ${FACEBOOK.hastaHora}:00 en punto`,
    `con ${FACEBOOK.minutosEntrePosteos} minutos entre una y otra`,
    `en las últimas ${FACEBOOK.horasSinRepetirTema} horas`,
    `relevancia ${PIEZAS.relevanciaPodcast} o más`,
    `con menos de ${EN_PALABRAS[PIEZAS.notasMinimasPodcast]} notas, ese podcast no sale`,
    `la página dura ${PORTADA.diasDeArchivo} días`,
  ];
  for (const f of frases) assert.ok(t.includes(f.toLowerCase()), `el documento no dice "${f}"`);
});

test('las frases de relleno son las mismas en el código, en el documento y en la instrucción de la IA (28/09)', () => {
  const a = DOC.indexOf('<!-- RELLENO:INICIO -->');
  const b = DOC.indexOf('<!-- RELLENO:FIN -->');
  assert.ok(a >= 0 && b > a, 'falta la lista de relleno entre sus marcas');
  const delDocumento = [...DOC.slice(a, b).matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  assert.deepEqual(delDocumento, criterio.RELLENO, 'la lista del documento y RELLENO de ingesta/criterio.mjs no dicen lo mismo');
  // La instrucción de la IA (achicada en la regla 263) nombra sólo las más comunes: el verificador (RELLENO) saca o rechaza todas las demás.
  const { reglas } = leerCriterio();
  const lasMasComunes = ['cabe destacar', 'en el marco de', 'fuentes consultadas', 'pudo saber', 'hito histórico', 'dijo presente', 'sin dudas', 'una gran noticia'];
  for (const frase of lasMasComunes) {
    assert.ok(criterio.RELLENO.includes(frase), `"${frase}" no es una frase de relleno del código`);
    assert.ok(reglas.includes(`"${frase}"`), `la instrucción de la IA no le prohíbe "${frase}"`);
  }
  for (const frase of criterio.RELLENO) assert.equal(frase, frase.toLowerCase(), `en minúscula: ${frase}`);
});

test('EDITORIAL.md ya no existe y ningún documento lo nombra: el criterio es uno solo', () => {
  assert.ok(!fs.existsSync(path.join(RAIZ, 'EDITORIAL.md')));
  for (const doc of ['CLAUDE.md', 'PENDIENTES.md', 'docs/seo/AUDITORIA-SEO-LLM.md', 'web/README.md', 'ingesta/README.md', ...fs.readdirSync(path.join(RAIZ, 'docs')).filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`)]) {
    if (!fs.existsSync(path.join(RAIZ, doc))) continue;
    assert.doesNotMatch(leer(doc).replace(/CRITERIO-EDITORIAL\.md/g, ''), /\bEDITORIAL\.md/, `${doc} todavía nombra EDITORIAL.md`);
  }
  assert.match(leer('CLAUDE.md'), /CRITERIO-EDITORIAL\.md/);
});
