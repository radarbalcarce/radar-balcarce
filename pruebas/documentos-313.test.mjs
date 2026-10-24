// Segunda vuelta de auditoría de los documentos (24/10/2026, regla 313, docs/auditoria-2-0/M-SEGUNDA-VUELTA.md).
//
// Los documentos se fueron quedando atrás de las reglas 286 a 312: la página del criterio decía una cosa, `docs/03-SELECCION.md` otra
// ("Policiales de afuera, nunca"), `CLAUDE.md` decía que la próxima regla era la 284 cuando ya iban por la 307 y seis reglas habían quedado
// pegadas al final de `docs/10` fuera de su tabla. Estas pruebas cuidan lo que se puede controlar sin que alguien lea todo:
//
//   · "la próxima regla" de CLAUDE.md es la que sigue a la última de `docs/10`; ninguna regla se repite; todas están dentro de una tabla;
//   · los números que la página `docs/CRITERIO-EN-UNA-PAGINA.md` y `CLAUDE.md` repiten en el texto son los del código;
//   · los documentos de selección no dicen más que Policiales de afuera "nunca" sale, ni que al celular van "cinco por día";
//   · la firma que dicen los documentos es la que pone el sitio;
//   · hay una sola lista de pendientes, y el traspaso es corto.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PORTADA, MUY_CONTADA, POPULARIDAD, CUERPO, COPIA_MAXIMA, LECTURA_IA, REESCRITURA, FACEBOOK, AREAS_CHICAS,
} from '../ingesta/criterio.mjs';
import { AUDIOS_POR_DIA } from '../reels/cupo-voz.mjs';
import { TOPE_MINIMO_DE_NOTAS } from '../web/lib/archivo.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8').replace(/\r\n/g, '\n');
const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const REGLAS = leer('docs/10-REGLAS-Y-PRUEBAS.md').split('\n');
const FILAS = REGLAS.map((l, i) => ({ l, i, m: l.match(/^\| (\d+) \|/) })).filter((f) => f.m).map((f) => ({ n: Number(f.m[1]), i: f.i }));

test('la próxima regla de CLAUDE.md es la que sigue a la última de docs/10 (y ninguna regla se repite)', () => {
  const numeros = FILAS.map((f) => f.n);
  const ultima = Math.max(...numeros);
  assert.equal(new Set(numeros).size, numeros.length, `hay reglas repetidas en docs/10: ${numeros.filter((n, i) => numeros.indexOf(n) !== i).join(', ')}`);
  const dice = leer('CLAUDE.md').match(/la próxima regla es la (\d+)/);
  assert.ok(dice, 'CLAUDE.md tiene que decir "la próxima regla es la N"');
  assert.equal(Number(dice[1]), ultima + 1, `CLAUDE.md dice que la próxima regla es la ${dice[1]} y la última de docs/10 es la ${ultima}`);
});

test('cada regla numerada de docs/10 está dentro de una tabla (la 307 a la 312 habían quedado sueltas al final del archivo)', () => {
  for (const { n, i } of FILAS) {
    assert.ok(REGLAS[i - 1]?.startsWith('|'), `la regla ${n} (línea ${i + 1}) no está pegada a una tabla: la línea de arriba es "${(REGLAS[i - 1] ?? '').slice(0, 60)}"`);
  }
});

test('la página del criterio en una página dice los números del código', () => {
  const d = leer('docs/CRITERIO-EN-UNA-PAGINA.md');
  const debeDecir = (frase) => assert.ok(d.includes(frase), `CRITERIO-EN-UNA-PAGINA.md no dice: ${frase}`);
  debeDecir(`| **${POPULARIDAD.minimoNacional}** medios | Lo nacional sale |`);
  debeDecir(`| **${POPULARIDAD.minimoAreasChicas}** medios | Áreas chicas |`);
  debeDecir(`| **${MUY_CONTADA.medios}** medios | "Muy contada"`);
  debeDecir(`| **${REESCRITURA.fuentesParaUnIntentoExtra} / ${REESCRITURA.fuentesParaDosIntentosExtra}** medios |`);
  debeDecir(`| **${PORTADA.horas}** h | Portada y listas`);
  debeDecir(`| **${PORTADA.horasParaEstrenar}** h | Estreno de lo de afuera`);
  debeDecir(`| **${MUY_CONTADA.horasDelHecho}** h | Estreno y vigencia de lo muy contado`);
  debeDecir(`| **${CUERPO.minimoParaPublicar}** palabras | Mínimo de cuerpo`);
  debeDecir(`| **${COPIA_MAXIMA}** palabras | Copiar del original`);
  debeDecir(`| **${LECTURA_IA.pedidosPorDiaConClavePropia} / ${LECTURA_IA.pedidosPorDia}** |`);
  debeDecir(`| **${REESCRITURA.porDia} / ${REESCRITURA.porDiaSinClaveDeLectura}** |`);
  debeDecir(`| **${TOPE_MINIMO_DE_NOTAS}** notas | Tope de notas con página`);
  debeDecir(`techo técnico del código es ${miles(PORTADA.maximoDeNotas)}`);
  debeDecir(`| **${FACEBOOK.mediosParaRedes}** medios | Lo de afuera que va a Facebook`);
  debeDecir(`hasta **${PORTADA.horasParaEstrenarDeAca} horas**`);
  debeDecir(`hasta **${MUY_CONTADA.horasDelHecho} horas**`);
  debeDecir(`${PORTADA.horasParaEstrenar} horas lo de afuera, ${MUY_CONTADA.horasDelHecho} lo muy contado, ${PORTADA.horasParaEstrenarDeAca} lo de Balcarce`);
  for (const area of AREAS_CHICAS) {
    const nombre = area === 'Tecnología' ? 'Tecnología e IA' : area === 'Cultura y agenda' ? 'Cultura' : area;
    assert.ok(d.includes(nombre), `CRITERIO-EN-UNA-PAGINA.md no nombra el área chica ${nombre}`);
  }
});

test('CLAUDE.md dice los números del código', () => {
  const d = leer('CLAUDE.md').replace(/\s+/g, ' ');
  const debeDecir = (frase) => assert.ok(d.includes(frase), `CLAUDE.md no dice: ${frase}`);
  debeDecir(`con **${POPULARIDAD.minimoNacional} medios** distintos (\`MINIMO_NACIONAL\`)`);
  debeDecir(`con **${POPULARIDAD.minimoAreasChicas}** (\`MINIMO_AREAS_CHICAS\`)`);
  debeDecir(`lo muy contado (${MUY_CONTADA.medios} medios o más)`);
  debeDecir(`la portada muestra **${PORTADA.horas} horas**`);
  debeDecir(`más de **${PORTADA.horasParaEstrenar}** (**${MUY_CONTADA.horasDelHecho}** si lo cuentan ${MUY_CONTADA.medios} medios o más: regla 287; **${PORTADA.horasParaEstrenarDeAca}** si es de Balcarce`);
  debeDecir(`el techo técnico de ${miles(PORTADA.maximoDeNotas)} es \`PORTADA.maximoDeNotas\``);
  debeDecir(`Cupo de voz: ${AUDIOS_POR_DIA} audios por día`);
  debeDecir(`cuatro con ${REESCRITURA.fuentesParaUnIntentoExtra} medios, cinco con ${REESCRITURA.fuentesParaDosIntentosExtra}`);
  debeDecir(`sin cuerpo de ${CUERPO.minimoParaPublicar} palabras o más`);
});

test('los documentos de selección no dicen que Policiales de afuera "nunca" sale ni que al celular van cinco por día (reglas 289 y 295)', () => {
  for (const f of ['docs/03-SELECCION.md', 'docs/CRITERIO-EN-UNA-PAGINA.md', 'CRITERIO-EDITORIAL.md', 'CLAUDE.md', 'docs/02-INGESTA.md']) {
    const d = leer(f).replace(/\s+/g, ' ');
    assert.doesNotMatch(d, /Policiales de afuera,? nunca(?! sale solo)/, `${f} todavía dice que Policiales de afuera "nunca" sale`);
    assert.doesNotMatch(d, /Policiales de afuera espera aunque lo cuenten treinta medios/, `${f} todavía dice que Policiales de afuera espera aunque lo cuenten treinta medios`);
    assert.doesNotMatch(d, /los policiales son sólo de Balcarce/, `${f} todavía dice que los policiales son sólo de Balcarce`);
    assert.doesNotMatch(d, /sólo lo de acá, cinco por día/, `${f} todavía dice que al celular van cinco por día`);
  }
  // Las áreas chicas incluyen Agro y Automovilismo (regla 294): ningún documento de selección las pone en el mínimo de todos.
  const sel = leer('docs/03-SELECCION.md');
  assert.match(sel, /Lo nacional \(Política, Economía, Fútbol, Deportes, Argentina…\)/);
  assert.match(sel, /Agro y Automovilismo \(vuelven en la regla 294\)/);
});

test('la firma que dicen los documentos es la que pone el sitio', () => {
  const sitio = leer('web/components/metadatos.js');
  assert.ok(sitio.includes('Redacción asistida con IA, verificada contra las fuentes'));
  for (const f of ['docs/04-REDACCION.md', 'docs/09-PANEL.md', 'docs/12-GLOSARIO.md', 'CRITERIO-EDITORIAL.md']) {
    assert.doesNotMatch(leer(f), /"Redacción con IA[",]/, `${f} dice "Redacción con IA" y el sitio dice "Redacción asistida con IA"`);
  }
});

test('hay una sola lista de pendientes y el traspaso es corto', () => {
  const p = leer('PENDIENTES.md');
  for (const titulo of ['Hecho y andando', 'APAGADO', 'Pendiente de Claude', 'Pendiente de una persona', 'Decisiones abiertas', 'Bloqueado', 'Con fecha']) {
    assert.ok(p.includes(titulo), `PENDIENTES.md no tiene la parte "${titulo}"`);
  }
  assert.ok(p.split('\n').length < 220, 'PENDIENTES.md tiene que ser una lista corta, sin historia');
  assert.ok(leer('docs/TRASPASO.md').split('\n').length <= 60, 'docs/TRASPASO.md tiene que ser corto: las tareas viven en PENDIENTES.md');
  assert.doesNotMatch(leer('docs/TRASPASO.md'), /^\| #/m, 'docs/TRASPASO.md no lleva tablas de tareas');
  for (const viejo of ['PENDIENTES-HASTA-24-10.md', 'TRASPASO-HASTA-24-10.md', 'HOY.html', 'PASOS-PARA-HERNAN-Y-ANDRES.html', 'RESUMEN-Y-PENDIENTES.html']) {
    assert.ok(fs.existsSync(path.join(RAIZ, 'docs/historico', viejo)), `falta docs/historico/${viejo}`);
  }
  for (const viejo of ['HOY.html', 'PASOS-PARA-HERNAN-Y-ANDRES.html', 'RESUMEN-Y-PENDIENTES.html']) {
    assert.ok(!fs.existsSync(path.join(RAIZ, 'docs', viejo)), `docs/${viejo} tendría que estar archivado en docs/historico`);
  }
});
