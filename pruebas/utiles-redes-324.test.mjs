// Regla 324 (24/10/2026): los teléfonos útiles de los sábados, rediseñados. Sin red ni voz: se dibuja con resvg y las tipografías del proyecto.
//
// Lo que se cuida:
//   · los números que se ven salen de NUMEROS (ingesta/utiles.mjs) y nunca se escriben a mano en las pantallas;
//   · la voz dice exactamente lo que se ve, ni más ni menos (antes decía «la comisaría y el municipio» y no aparecían);
//   · dos pantallas en vez de una lista larga, con el número grande y el nombre en una línea;
//   · todo dentro de la zona segura: nada pasa de la columna 960 (botones de la app) y la firma sube a la fila 1330;
//   · el color es uno de la tabla de CRITERIO-REDES.md § 8 (el marrón #8C2D18 se sacó);
//   · las demás placas (Participá, la agenda…) conservan su pie de siempre.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import {
  ANCHO, ALTO, ZONA_TEXTO, COLORES, COLOR_SECCION, COLOR_UTILES, DERECHA_SEGURA, Y_PIE_UTILES, Y_PIE,
  placaUtiles, placaAgenda, placaParticipa, archivosDeFuente, pantallaQueEntra,
} from '../reels/placa.mjs';
import { escenaDeUtiles } from '../reels/escenas/servicios.mjs';
import { escenaDeLosUtiles } from '../reels/escenas/del-plan.mjs';
import { planDelDia } from '../reels/plan.mjs';
import { partirSvg, clasificar } from '../reels/animacion.mjs';
import { NUMEROS, PANTALLAS_DE_UTILES, pantallasDeUtiles, queDiceLaVoz } from '../ingesta/utiles.mjs';
import { guionUtiles } from '../redes/guiones.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const fuentes = archivosDeFuente();
const pantallas = pantallasDeUtiles();
const DURACION = 18;

/** Cada <text> del dibujo, medido con las tipografías de verdad. */
function cajasDeTexto(svg) {
  return [...svg.matchAll(/<text[\s\S]*?<\/text>/g)].map((m) => m[0]).map((t) => {
    const b = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}">${t}</svg>`, {
      font: { fontFiles: fuentes, loadSystemFonts: false, defaultFontFamily: 'Inter' },
    }).getBBox();
    const texto = t.replace(/<[^>]+>/g, '').trim();
    return b ? { texto, x: b.x, y: b.y, ancho: b.width, alto: b.height, tam: Number(t.match(/font-size="([\d.]+)"/)?.[1] ?? 0) } : null;
  }).filter(Boolean);
}

/** Los tiempos en que se ve cada pantalla de la escena (la primera en su mitad, la segunda en la suya, con todo ya adentro). */
const CUADRO = { primera: 5.5, segunda: 14 };

// ------------------------------------------------------------ los números

test('cada tarjeta nombra un contacto de NUMEROS y muestra su número principal: nunca un número escrito a mano', () => {
  const vistos = [];
  for (const p of pantallas) for (const g of p.grupos) for (const it of g.items) {
    const origen = NUMEROS.find((n) => it.numero === n.numero.split(' / ')[0].trim() && n.nombre === PANTALLAS_DE_UTILES.flatMap((x) => x.grupos).flatMap((x) => x.items).find((y) => y.nombre === it.nombre)?.de);
    assert.ok(origen, `${it.nombre}: su número (${it.numero}) no es el primero de ningún contacto de NUMEROS`);
    vistos.push(origen.nombre);
  }
  assert.equal(new Set(vistos).size, vistos.length, 'un contacto no sale dos veces');
  // Y en el código de las pantallas no hay ningún número de teléfono escrito: salen de NUMEROS.
  const fuente = fs.readFileSync(path.join(RAIZ, 'ingesta/utiles.mjs'), 'utf8');
  const bloque = fuente.slice(fuente.indexOf('export const PANTALLAS_DE_UTILES'), fuente.indexOf('export function pantallasDeUtiles'));
  assert.doesNotMatch(bloque, /\d{2}-\d{4}|\b0800|\b911\b|\b107\b|\b100\b/, 'PANTALLAS_DE_UTILES tiene un número escrito a mano');
});

test('una tarjeta que nombra un contacto que no está en NUMEROS hace fallar la lista (mejor eso que un sábado sin número)', () => {
  assert.throws(() => pantallasDeUtiles(NUMEROS.filter((n) => n.nombre !== 'Bomberos')), /Bomberos/);
});

test('los números reales de las emergencias y del hospital siguen siendo los de siempre (911, 107, 100, el 0800 de la Cooperativa)', () => {
  const lista = pantallas.flatMap((p) => p.grupos).flatMap((g) => g.items).map((i) => i.numero);
  for (const n of ['911', '107', '100', '0800 222 2342', '(02266) 42-2017', '(02266) 43-1042', '(02266) 42-4044', '(02266) 43-0695']) {
    assert.ok(lista.includes(n), `falta ${n}`);
  }
});

// ------------------------------------------------------------ la voz

test('la voz dice exactamente lo que se ve: cada grupo o tarjeta tiene su frase y no sobra ni falta ninguna', () => {
  for (const p of PANTALLAS_DE_UTILES) for (const g of p.grupos) {
    assert.ok(g.dice || g.items.every((i) => i.dice), `"${g.rotulo}": la voz no sabe qué decir de lo que muestra`);
    if (g.dice) assert.ok(g.items.every((i) => !i.dice), `"${g.rotulo}": dice el grupo y también cada tarjeta`);
  }
  const dichas = queDiceLaVoz();
  assert.ok(dichas.length >= 5);
  for (const f of ['2026-10-10', '2026-10-17', '2026-10-24', '2026-10-31']) {
    const g = guionUtiles({ fecha: new Date(`${f}T20:00:00Z`), momento: 'tarde' });
    const oracion = g.match(/Están los de ([^.]+)\./)?.[1];
    assert.ok(oracion, `${f}: no dice qué teléfonos son: ${g}`);
    const dicho = oracion.replace(/ y /g, ', ').split(', ');
    assert.deepEqual(dicho, dichas, `${f}: lo que dice la voz no es lo que se ve`);
  }
  // La comisaría que se dice es la que está en pantalla (la de la Mujer): no una «comisaría» a secas.
  assert.doesNotMatch(guionUtiles(), /la comisaría y/);
});

// ------------------------------------------------------------ el dibujo

test('son dos pantallas, cada una con su título, y ninguna se achica: entran a tamaño completo', () => {
  assert.equal(pantallas.length, 2);
  for (const p of pantallas) {
    const armada = pantallaQueEntra(p);
    // A tamaño completo el número principal de una fila se dibuja en 60 o más; el de una tarjeta de emergencia, en 100 o más.
    const numeros = cajasDeTexto(armada.bloques.map((b) => b.svg).join('')).filter((c) => /^[\d() -]+$/.test(c.texto));
    assert.ok(numeros.length >= 3, `${p.titulo}: no se midieron los números`);
    for (const c of numeros) assert.ok(c.tam >= (c.texto.length <= 3 ? 100 : 60), `${p.titulo}: el número ${c.texto} se achicó a ${c.tam}`);
  }
  assert.equal(escenaDeUtiles({ pantallas }).variante, 'utiles-2');
});

test('en la escena, cada pantalla se ve a su hora y la otra no: la primera al principio, la segunda a partir de la mitad', () => {
  const escena = escenaDeUtiles({ pantallas });
  const primera = escena.cuadro(CUADRO.primera, DURACION);
  const segunda = escena.cuadro(CUADRO.segunda, DURACION);
  assert.match(primera, /Emergencias y salud/);
  assert.doesNotMatch(primera, /Municipio y servicios/);
  assert.match(segunda, /Municipio y servicios/);
  assert.doesNotMatch(segunda, /Emergencias y salud/);
  assert.match(primera, /1 DE 2/);
  assert.match(segunda, /2 DE 2/);
  for (const n of ['911', '107', '100']) assert.ok(primera.includes(`>${n}<`), `la primera pantalla no muestra el ${n}`);
  for (const n of ['0800 222 2342', '(02266) 43-1042']) assert.ok(segunda.includes(`>${n}<`), `la segunda no muestra ${n}`);
  // Con una duración muy distinta, el cambio sigue siendo a la mitad.
  assert.match(escena.cuadro(12, 30), /Emergencias y salud/);
  assert.match(escena.cuadro(20, 30), /Municipio y servicios/);
});

test('la zona segura: nada de lo que se escribe pasa de la columna 960 ni de la fila 1330 + la firma, ni sube de la fila 250', () => {
  const escena = escenaDeUtiles({ pantallas });
  const dibujos = {
    'pantalla 1': escena.cuadro(CUADRO.primera, DURACION),
    'pantalla 2': escena.cuadro(CUADRO.segunda, DURACION),
    'placa de respaldo': placaUtiles({ pantallas }),
  };
  for (const [nombre, svg] of Object.entries(dibujos)) {
    const cajas = cajasDeTexto(svg);
    assert.ok(cajas.length > 8, `${nombre}: no se midió nada`);
    for (const c of cajas) {
      assert.ok(c.x >= 71, `${nombre}: "${c.texto}" se sale por la izquierda (${c.x.toFixed(0)})`);
      assert.ok(c.x + c.ancho <= DERECHA_SEGURA + 1, `${nombre}: "${c.texto}" pasa de la columna ${DERECHA_SEGURA} (termina en ${(c.x + c.ancho).toFixed(0)}) y lo tapan los botones de la app`);
      assert.ok(c.y >= ZONA_TEXTO.arriba - 1, `${nombre}: "${c.texto}" queda bajo la interfaz de arriba (${c.y.toFixed(0)})`);
      assert.ok(c.y + c.alto <= Y_PIE_UTILES + 100, `${nombre}: "${c.texto}" baja de la fila ${Y_PIE_UTILES + 100} (${(c.y + c.alto).toFixed(0)})`);
    }
    // Nada se pisa: ni la lista con la firma, ni dos textos entre sí.
    const ordenadas = cajas.slice().sort((a, b) => a.y - b.y);
    for (let i = 0; i < ordenadas.length; i += 1) for (let j = i + 1; j < ordenadas.length; j += 1) {
      const a = ordenadas[i]; const b = ordenadas[j];
      const cruzanX = a.x < b.x + b.ancho - 2 && b.x < a.x + a.ancho - 2;
      const cruzanY = a.y < b.y + b.alto - 4 && b.y < a.y + a.alto - 4;
      assert.ok(!(cruzanX && cruzanY), `${nombre}: "${a.texto}" y "${b.texto}" se pisan`);
    }
    // Las tarjetas terminan antes de la raya de la firma (que está en la fila 1330).
    const rects = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx=/g)].map((m) => ({ x: +m[1], y: +m[2], ancho: +m[3], alto: +m[4] }));
    assert.ok(rects.length >= 2, `${nombre}: sin tarjetas`);
    for (const r of rects) {
      assert.ok(r.y + r.alto <= Y_PIE_UTILES - 20, `${nombre}: una tarjeta llega a la fila ${r.y + r.alto}, encima de la firma`);
      assert.ok(r.x + r.ancho <= DERECHA_SEGURA + 1, `${nombre}: una tarjeta pasa de la columna ${DERECHA_SEGURA}`);
    }
    assert.match(svg, new RegExp(`<rect x="72" y="${Y_PIE_UTILES}" width="${DERECHA_SEGURA - 72}" height="3"`), `${nombre}: la raya de la firma no está en la fila ${Y_PIE_UTILES}`);
  }
});

test('el pie de los útiles sube, pero la entrada animada lo sigue tratando como pie; las demás placas conservan el de siempre', () => {
  const partida = partirSvg(placaUtiles({ pantallas }));
  assert.ok(partida, 'la placa de útiles se puede partir para animarla');
  const tipos = clasificar(partida.hijos);
  const pies = tipos.filter((c) => c.tipo === 'pie');
  assert.equal(pies.length, 1, 'el pie subido es un solo bloque de pie');
  assert.match(pies[0].h, /data-pie/);
  assert.ok(tipos.filter((c) => c.tipo === 'bloque').length >= 3, 'las tarjetas entran de a una');
  // Participá, la agenda y compañía: el pie en la fila 1478 y hasta el margen derecho de siempre.
  for (const svg of [
    placaParticipa({ rotulo: 'Participá', pregunta: '¿Qué te gustaría ver en Radar Balcarce?', pie1: 'Escribinos', pie2: 'Gracias' }),
    placaAgenda({ eventos: [{ cuando: 'sábado 10:00', nombre: 'Feria', lugar: 'Plaza' }] }),
  ]) {
    assert.match(svg, new RegExp(`<rect x="72" y="${Y_PIE}" width="${ANCHO - 144}" height="3"`));
    assert.doesNotMatch(svg, /data-pie/);
  }
});

// ------------------------------------------------------------ el color

test('el color es el de Balcarce, de la tabla de CRITERIO-REDES.md § 8, y el marrón inventado no vuelve', () => {
  assert.equal(COLOR_UTILES, COLOR_SECCION.Balcarce);
  const todos = [
    escenaDeUtiles({ pantallas }).cuadro(CUADRO.primera, DURACION),
    escenaDeUtiles({ pantallas }).cuadro(CUADRO.segunda, DURACION),
    placaUtiles({ pantallas }),
  ].join('\n');
  const usados = new Set([...todos.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0].toUpperCase()));
  const permitidos = new Set([...Object.values(COLORES), ...Object.values(COLOR_SECCION), '#FFFFFF'].map((h) => h.toUpperCase()));
  for (const c of usados) assert.ok(permitidos.has(c), `${c} no está en la tabla de colores`);
  assert.ok(usados.has(COLOR_SECCION.Balcarce.toUpperCase()));
  // El marrón #8C2D18 no está en ningún programa de las piezas.
  for (const f of ['reels/placa.mjs', 'reels/plan.mjs', 'reels/escenas/servicios.mjs', 'reels/escenas/del-plan.mjs']) {
    assert.doesNotMatch(fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\/.*$/gm, ''), /8C2D18/i, `${f} volvió a usar el marrón`);
  }
  // Una sola pieza, un solo color: en el dibujo sólo aparecen ese color, la tinta, el papel, el blanco y las rayas.
  const sobran = [...usados].filter((c) => ![COLOR_UTILES, COLORES.tinta, COLORES.papel, COLORES.gris, COLORES.linea, COLORES.lineaSuave, COLORES.rojo, '#FFFFFF'].map((h) => h.toUpperCase()).includes(c));
  assert.deepEqual(sobran, [], `colores de más en la pieza: ${sobran.join(', ')}`);
});

test('el contraste es AA: el color de la pieza, el gris y la tinta se leen sobre el blanco de las tarjetas y sobre el papel', () => {
  const luz = (h) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contraste = (a, b) => { const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  for (const frente of [COLOR_UTILES, COLORES.gris, COLORES.tinta]) {
    for (const fondo of ['#FFFFFF', COLORES.papel]) assert.ok(contraste(frente, fondo) >= 4.5, `${frente} sobre ${fondo}: ${contraste(frente, fondo).toFixed(2)}`);
  }
  assert.ok(contraste('#FFFFFF', COLOR_UTILES) >= 4.5, 'el ícono blanco se lee sobre el círculo de color');
});

// ------------------------------------------------------------ el plan

test('el plan del sábado arma los útiles con las dos pantallas, la voz de lo que se ve y el color de Balcarce', () => {
  const portada = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web/data/portada.json'), 'utf8'));
  const { piezas } = planDelDia({
    clima: portada.clima, farmacias: { turnos: [portada.farmacias.hoy].filter(Boolean) }, notas: [], yaPublicadas: true,
  }, { fecha: new Date('2026-10-10T15:00:00Z'), forzar: ['utiles'] });
  const p = piezas.find((x) => x.nombre === 'utiles');
  assert.ok(p, 'los útiles están en el plan del sábado');
  assert.equal(p.acento, COLOR_SECCION.Balcarce);
  assert.equal(p.escena.descriptor.fn, 'escenaDeUtiles');
  assert.equal(p.escena.descriptor.args.pantallas.length, 2, 'el render rehace la escena con las dos pantallas');
  assert.deepEqual(p.escena.descriptor.args.pantallas, pantallas);
  // La placa de respaldo (si la escena no sale) tiene todos los números que dice la voz.
  for (const n of pantallas.flatMap((x) => x.grupos).flatMap((g) => g.items).map((i) => i.numero)) assert.ok(p.svg.includes(`>${n}<`), `la placa de respaldo no tiene el ${n}`);
  for (const dicho of queDiceLaVoz()) assert.ok(p.guion.includes(dicho), `la voz no dice "${dicho}"`);
});

test('sin pantallas no se arma la escena (la pieza sale con su placa), y los `grupos` viejos del render siguen andando', () => {
  assert.equal(escenaDeLosUtiles({ pantallas: [] }), null);
  const vieja = escenaDeUtiles({ grupos: [{ categoria: 'Emergencias', items: [{ nombre: 'Bomberos', numero: '100' }] }] });
  assert.match(vieja.cuadro(6, 14), /Bomberos/);
  assert.equal(vieja.variante, 'utiles');
});
