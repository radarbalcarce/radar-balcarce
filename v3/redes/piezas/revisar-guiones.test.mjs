// Prueba del control de guiones (20/11/2026): los guiones de todas las piezas, con datos de ejemplo, no tienen nada grave; y el control SÍ detecta cada cosa que Hernán no quiere oír. Sin red, sin voz.
import test from 'node:test';
import assert from 'node:assert/strict';
import { revisarGuion, revisarTodo, piezasDeEjemplo, informe, GRAVE } from './revisar-guiones.mjs';

const reglas = (guion, o) => revisarGuion(guion, o).filter((h) => h.nivel === GRAVE).map((h) => h.regla);

test('todas las piezas con voz, con datos variados, salen sin problemas graves', () => {
  const r = revisarTodo();
  assert.ok(r.piezas.length >= 50, `se revisaron ${r.piezas.length} piezas`);
  assert.equal(r.graves, 0, `\n${informe(r)}`);
  // se cubre cada tipo de pieza
  const nombres = r.piezas.map((p) => p.nombre).join('|');
  for (const que of ['clima mañana', 'clima noche', 'farmacia 1', 'farmacia 2', 'farmacia 3', 'repaso mañana, 3', 'repaso tarde, 2', 'efeméride 1 hecho', 'efeméride 4 hechos', 'efeméride sin año', 'número del día', 'nota propia', 'nota de Balcarce', 'participá', 'útiles', 'feriado', 'aviso', 'agenda']) {
    assert.ok(nombres.includes(que), `falta revisar: ${que}`);
  }
  assert.ok(piezasDeEjemplo().every((p) => !p.error), 'ningún armador falla con sus datos de ejemplo');
});

test('detecta el caso de Hernán: «Farmacia de turno hoy: Galindo. Galindo, calle 18…»', () => {
  const r = reglas('Farmacia de turno hoy: Galindo. Galindo, Calle 18, 715 entre 19 y 21. Guardá el dato.');
  assert.ok(r.includes('palabra-repetida'), r.join());
  assert.ok(reglas('Hoy abre Galindo Galindo y cierra tarde.').includes('palabra-repetida'));
  assert.ok(revisarGuion('Hoy abre Galindo, en calle; Galindo cierra tarde.').some((h) => h.regla === 'palabra-cerca'), 'a menos de 4 palabras');
});

test('detecta frases repetidas, «mañana… Mañana», saludos dobles, signos raros, números mal dichos y guiones largos', () => {
  assert.ok(reglas('Se inauguró la nueva sala. Es lindo. Se contó que la nueva sala sirve.').includes('frase-repetida'));
  assert.ok(reglas('Mañana, una noche tranquila. Mañana: máxima de 22.').includes('manana-doble'));
  assert.ok(reglas('Buen día, Balcarce. Buenos días a todos. Hoy llueve.').includes('saludo-doble'));
  assert.ok(!reglas('Buen día, Balcarce. Hoy llueve. Que tengan un buen día.').includes('saludo-doble'), 'la despedida no es un saludo');
  for (const malo of ['Hoy abre ## en la plaza.', 'Hoy abre .. en la plaza.', 'Hoy abre en la plaza , sí.', 'Hoy abre en la plaza..', 'Hoy abre en la plaza & más.', 'Qué lindo día hoy?']) assert.ok(reglas(malo).includes('signo-raro'), malo);
  for (const malo of ['Abre a las 8:30 en la plaza.', 'Subió 5 % el precio.', 'Cuesta $500 en la plaza.', 'Hace 12° en la plaza.', 'Vive en Calle 17 N° 537 por ahí.', 'Abre de 10-12 en la plaza.', 'Queda en Av. Chaves esquina quince.', 'Queda en la calle 5 e/ 6 y 7 acá.']) assert.ok(reglas(malo).includes('numero-mal-dicho'), malo);
  assert.ok(reglas('Hoy hay una plaza abierta en el centro de la ciudad todos los días del año.', { duracion: 3 }).includes('no-entra'));
  assert.ok(reglas('').includes('vacio'));
  assert.ok(reglas('Hoy abre en la plaza').includes('sin-punto-final'));
  assert.ok(reglas('Hoy abre undefined en la plaza.').includes('resto-de-codigo'));
});

test('no da falsas alarmas con lo que sí se puede decir', () => {
  assert.deepEqual(reglas('Farmacia de turno hoy: Galindo, en calle 18 al 715, entre 19 y 21. Guardá el dato.'), []);
  assert.deepEqual(reglas('Escribinos por WhatsApp al 2 2 6 6, 5 1, 1 6 1 2, o por mail.'), [], 'los dígitos sueltos se repiten sin problema');
  assert.deepEqual(reglas('El clima de hoy lo auspicia Sweet Candy Bar. En Instagram, arroba sweet candy bar. Ahora hay 17 grados.'), [], 'el usuario de la red repite el nombre a propósito');
  assert.deepEqual(reglas('Frente a octubre: 813 millones de dólares. Hoy son 3394 millones de dólares.'), []);
  assert.deepEqual(reglas('', { habla: false }), []);
});
