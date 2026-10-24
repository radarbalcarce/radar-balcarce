// La salud de la configuración: las fuentes y los archivos en sí.
//
// Ninguna de estas pruebas mira una noticia. Miran el tipo de error que ya
// pasó y que no se ve leyendo el código: una fuente a la que le falta un
// campo y genera enlaces rotos, o un carácter invisible que desactiva una
// expresión regular sin que nada falle.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { TODAS_LAS_FUENTES } from '../ingesta/ingesta.mjs';
import {
  REGLAS_SECCION, REGLAS_SEMAFORO, FARMACIAS_A_MANO, TEMAS,
} from '../ingesta/fuentes.mjs';

const AQUI = import.meta.dirname;
const RAIZ = path.join(AQUI, '..');

// ------------------------------------------------------------- las fuentes

test('toda fuente tiene nombre y dirección', () => {
  for (const f of TODAS_LAS_FUENTES) {
    assert.ok(f.nombre, 'fuente sin nombre: ' + JSON.stringify(f).slice(0, 80));
    assert.ok(f.url, 'fuente sin url: ' + f.nombre);
    assert.match(f.url, /^https?:\/\//, f.nombre + ' tiene una url rara');
  }
});

test('las que se leen a mano saben armar el enlace', () => {
  // El 18/09 los ochenta enlaces de El Diario apuntaban a "undefined/...":
  // la fuente se había copiado al estado del panel sin el campo `base`, y
  // nadie lo vio hasta hacer clic. Cada nota que publicamos tiene que poder
  // volver a su fuente: es la mitad de lo que ofrecemos.
  for (const f of TODAS_LAS_FUENTES.filter((x) => x.tipo === 'scrape')) {
    assert.ok(f.base, 'fuente de scrape sin base: ' + f.nombre);
    assert.match(f.base, /^https?:\/\//, f.nombre + ' tiene una base rara');
  }
});

test('no hay dos fuentes con el mismo nombre', () => {
  // Dos fuentes con el mismo nombre se pisan en el panel y en la firma de
  // la nota, y no hay forma de saber cuál se leyó.
  const vistos = new Set();
  for (const f of TODAS_LAS_FUENTES) {
    assert.ok(!vistos.has(f.nombre), 'nombre repetido: ' + f.nombre);
    vistos.add(f.nombre);
  }
});

test('no hay dos fuentes con el mismo id', () => {
  // El panel guarda las decisiones por id. Dos fuentes con el mismo id se
  // pisan y una de las dos deja de leerse, sin que nada lo avise.
  const vistos = new Set();
  for (const f of TODAS_LAS_FUENTES) {
    assert.ok(!vistos.has(f.id), 'id repetido: ' + f.id);
    vistos.add(f.id);
  }
});

test('las reglas de sección tienen palabras', () => {
  for (const r of REGLAS_SECCION) {
    assert.ok(r.seccion, 'regla sin sección');
    assert.ok(Array.isArray(r.palabras) && r.palabras.length, r.seccion + ' sin palabras');
    for (const p of r.palabras) {
      assert.equal(typeof p, 'string');
      assert.equal(p, p.trim(), 'palabra con espacios de más en ' + r.seccion + ': "' + p + '"');
      assert.ok(p.length >= 2, 'palabra de una letra en ' + r.seccion + ': "' + p + '"');
    }
  }
});

test('el semáforo tiene sus listas', () => {
  assert.ok(REGLAS_SEMAFORO.rojo.length, 'sin temas bloqueados');
  assert.ok(REGLAS_SEMAFORO.amarillo.length, 'sin temas que pidan ojo humano');
});

test('las farmacias cargadas a mano tienen dirección', () => {
  // Es el único motivo por el que existe esa lista: si no trae dirección,
  // no agrega nada a lo que ya sabemos.
  for (const [clave, f] of Object.entries(FARMACIAS_A_MANO)) {
    assert.equal(clave, clave.toLowerCase(), 'la clave tiene que estar normalizada: ' + clave);
    assert.ok(f.nombre, clave + ' sin nombre');
    assert.ok(f.direccion, clave + ' sin dirección');
  }
});

test('cada tema tiene nombre, ranura y palabras', () => {
  for (const t of TEMAS) {
    assert.ok(t.nombre, 'tema sin nombre');
    assert.match(t.ranura, /^[a-z0-9-]+$/, `ranura rara en ${t.nombre}: ${t.ranura}`);
    assert.ok(t.palabras?.length, `${t.nombre} sin palabras`);
    for (const p of t.palabras) {
      assert.equal(p, p.toLowerCase(), `la palabra va en minúscula: "${p}"`);
      assert.ok(p.length >= 4, `palabra demasiado corta en ${t.nombre}: "${p}"`);
    }
  }
});

test('no hay dos temas con la misma ranura', () => {
  // La ranura es la dirección de la página: /tema/autodromo. Dos iguales y
  // una de las dos no existe.
  const vistas = new Set();
  for (const t of TEMAS) {
    assert.ok(!vistas.has(t.ranura), `ranura repetida: ${t.ranura}`);
    vistas.add(t.ranura);
  }
});

// ------------------------------------------------- nada instalado en el motor

/** Los imports ESTÁTICOS de un archivo: `import … from '…'` (aunque ocupe
 *  varias líneas), `import '…'` y `export … from '…'`, con comillas simples o
 *  dobles. Los `import()` dinámicos van aparte: son perezosos, se cargan sólo
 *  cuando se usan, y por eso se permiten. */
function importsDe(texto) {
  const estaticos = [];
  const dinamicos = [];
  // Se busca desde el principio de la línea para no confundir un import con
  // la palabra "import" dentro de un comentario o de un texto. Entre la
  // palabra y el `from` no puede haber comillas ni paréntesis: así un
  // `export function f() {` no se come medio archivo buscando un from.
  const ESTATICO = /^[ \t]*(?:import[ \t]*(['"])([^'"\r\n]+)\1|(?:import|export)\s[^'"`;()]*?\bfrom\s*(['"])([^'"\r\n]+)\3)/gm;
  for (const m of texto.matchAll(ESTATICO)) estaticos.push(m[2] ?? m[4]);
  for (const m of texto.matchAll(/\bimport\(\s*(['"`])([^'"`]+)\1\s*\)/g)) dinamicos.push(m[2]);
  return { estaticos, dinamicos };
}

const DEL_SISTEMA = new Set(builtinModules);
const esDeNode = (de) => de.startsWith('node:') || DEL_SISTEMA.has(de);

/** Sigue los imports estáticos relativos desde `inicio`, de archivo en
 *  archivo, y devuelve los paquetes de afuera que aparecen en el camino,
 *  cada uno con la cadena que lleva hasta él. */
function paquetesQueArrastra(inicio) {
  const encontrados = [];
  const vistos = new Set();
  const pendientes = [[inicio, [path.relative(RAIZ, inicio)]]];
  while (pendientes.length) {
    const [archivo, cadena] = pendientes.pop();
    if (vistos.has(archivo)) continue;
    vistos.add(archivo);
    let texto;
    try { texto = fs.readFileSync(archivo, 'utf8'); } catch { continue; }
    for (const de of importsDe(texto).estaticos) {
      if (de.startsWith('.')) {
        const destino = path.resolve(path.dirname(archivo), de);
        pendientes.push([destino, [...cadena, path.relative(RAIZ, destino)]]);
      } else if (!esDeNode(de)) {
        encontrados.push(`${cadena.join(' → ')} importa ${de}`.replaceAll('\\', '/'));
      }
    }
  }
  return encontrados;
}

/** Los .mjs de una carpeta, con sus subcarpetas, sin lo que se genera. */
function modulosDe(carpeta, acumulado = []) {
  for (const e of fs.readdirSync(carpeta, { withFileTypes: true })) {
    if (['node_modules', 'datos', 'salida'].includes(e.name)) continue;
    const completo = path.join(carpeta, e.name);
    if (e.isDirectory()) modulosDe(completo, acumulado);
    else if (e.name.endsWith('.mjs')) acumulado.push(completo);
  }
  return acumulado;
}

test('el motor no necesita nada instalado', () => {
  // Es lo que hace que GitHub Actions tarde segundos y no minutos, y que
  // nada se rompa solo cuando una dependencia de afuera cambia. Dos veces
  // se coló un import pesado arriba de un archivo (resvg, ffmpeg) y las
  // pruebas rompieron en la nube andando en la máquina.
  //
  // Se sigue la cadena entera, no sólo el import directo: el 25/09 el panel
  // importaba reels/voz-gemini.mjs, que arriba de todo trae ffmpeg-static, y
  // la prueba vieja no lo veía porque el panel en sí no importaba nada raro.
  //
  // Los de reels/ sí pueden usar paquetes, pero cargándolos con import()
  // cuando hacen falta y no al importar el archivo. Los import() dinámicos
  // que hoy cuelgan de ingesta/, panel/ y redes/ (al 25/09):
  //   ingesta/alertas.mjs → import('./ingesta.mjs')        (del proyecto)
  //   reels/placa.mjs     → import('@resvg/resvg-js')     (sólo al dibujar)
  //   reels/plan.mjs      → import('./reel.mjs')          (sólo al armar un reel)
  const sucios = [];
  for (const carpeta of ['ingesta', 'panel', 'redes']) {
    for (const archivo of modulosDe(path.join(RAIZ, carpeta))) sucios.push(...paquetesQueArrastra(archivo));
  }
  assert.deepEqual([...new Set(sucios)], [], [...new Set(sucios)].join(' · '));
});

test('el detector de imports ve todas las formas de escribirlos', () => {
  // Si esto falla, la prueba de arriba podría estar pasando por no mirar.
  const { estaticos, dinamicos } = importsDe([
    "import fs from 'node:fs';",
    'import ffmpeg from "ffmpeg-static";',
    'import {',
    '  uno,',
    '  dos,',
    "} from './varios.mjs';",
    "import './solo-efecto.mjs';",
    "export { tres } from '../otro.mjs';",
    "export * from './todo.mjs';",
    "import * as todo from 'paquete-con-asterisco';",
    'export function f() { return 1; }',
    "export const X = 'no es un import';",
    "// import comentado from 'no-cuenta';",
    "const { Resvg } = await import('@resvg/resvg-js');",
  ].join('\r\n'));
  assert.deepEqual(estaticos, [
    'node:fs', 'ffmpeg-static', './varios.mjs', './solo-efecto.mjs', '../otro.mjs',
    './todo.mjs', 'paquete-con-asterisco',
  ]);
  assert.deepEqual(dinamicos, ['@resvg/resvg-js']);
  assert.ok(esDeNode('node:fs') && esDeNode('fs') && esDeNode('child_process'));
  assert.ok(!esDeNode('ffmpeg-static') && !esDeNode('@resvg/resvg-js'));
});

// ------------------------------------------------------------- los archivos

/** Los archivos de código del proyecto, sin node_modules ni lo generado. */
function archivosDeCodigo(desde = RAIZ, acumulado = []) {
  // `.claude` (las copias de trabajo de los agentes) y `out` (lo que arma la compilación, p. ej. el buscador) no son código nuestro (24/10/2026).
  const IGNORAR = new Set(['node_modules', '.next', '.git', '.claude', 'out', 'datos', 'data', 'salida']);
  for (const entrada of fs.readdirSync(desde, { withFileTypes: true })) {
    if (IGNORAR.has(entrada.name)) continue;
    const completo = path.join(desde, entrada.name);
    if (entrada.isDirectory()) archivosDeCodigo(completo, acumulado);
    else if (/\.(mjs|js)$/.test(entrada.name)) acumulado.push(completo);
  }
  return acumulado;
}

test('no hay caracteres de control escondidos en el código', () => {
  // Esto no es paranoia. En sentenciar() había un carácter de retroceso
  // (0x08) donde tenía que ir una barra: la expresión regular quedó pidiendo
  // un carácter que no existe en ningún texto, así que nunca encontró nada.
  // No falla, no avisa, no rompe el build: simplemente deja de funcionar, y
  // durante semanas los títulos salieron sin los nombres propios.
  const sucios = [];
  for (const archivo of archivosDeCodigo()) {
    const texto = fs.readFileSync(archivo, 'utf8');
    // Se permiten el salto de línea (10), el retorno (13) y el tabulador
    // (9). Cualquier otro carácter por debajo del espacio no tiene por qué
    // estar en un archivo de código. Se cuenta por código y no con una
    // expresión regular para no tener que escribir acá los mismos
    // caracteres que estamos buscando.
    let malos = 0;
    for (let i = 0; i < texto.length; i += 1) {
      const c = texto.charCodeAt(i);
      if (c < 32 && c !== 9 && c !== 10 && c !== 13) malos += 1;
    }
    if (malos) sucios.push(path.relative(RAIZ, archivo) + ' (' + malos + ')');
  }
  assert.deepEqual(sucios, [], 'archivos con caracteres de control: ' + sucios.join(', '));
});
