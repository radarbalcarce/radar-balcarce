// Repartir el tiempo de un audio entre las palabras del texto, sin transcribir.
//
// Es la parte pura de alinear.mjs: recibe las pausas ya detectadas y devuelve
// cuándo arranca y termina cada palabra. Está aparte, sin importar nada, para
// poder probarla sin ffmpeg.
//
// EL ERROR QUE ESTO CORRIGE (21/09): la versión anterior tomaba las PRIMERAS
// pausas del audio como finales de oración. Pero la voz también respira en las
// comas y en los dos puntos ("Primero: …"), así que aparecían más pausas que
// oraciones, se usaban las tempranas y los subtítulos iban por delante de la
// voz. En un audio de 35 segundos llegaban a adelantarse varios segundos.
//
// Ahora el texto se parte en cláusulas (en cada signo de puntuación) y, para
// cada corte, se busca la pausa que cae CERCA de donde tendría que estar según
// el peso en sílabas. Si no hay ninguna cerca, se queda con la estimación. Y
// después de cada corte se recalcula la velocidad con lo que queda de audio,
// así el error no se acumula.

const UNIDADES = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece',
  'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidos',
  'veintitres', 'veinticuatro', 'veinticinco', 'veintiseis', 'veintisiete', 'veintiocho', 'veintinueve',
];
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

/**
 * Un número como lo dice la voz. Sólo importa para contar sílabas: "715" se
 * dice "setecientos quince" (6 sílabas) y contarlo como una palabra de una
 * sílaba corría todo el subtítulo. Llega hasta 999.999, sobra para un pueblo.
 */
export function numeroEnPalabras(n) {
  if (n < 30) return UNIDADES[n];
  if (n < 100) return `${DECENAS[Math.floor(n / 10)]}${n % 10 ? ` y ${UNIDADES[n % 10]}` : ''}`;
  if (n === 100) return 'cien';
  if (n < 1000) return `${CENTENAS[Math.floor(n / 100)]}${n % 100 ? ` ${numeroEnPalabras(n % 100)}` : ''}`;
  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  return `${miles === 1 ? '' : `${numeroEnPalabras(miles)} `}mil${resto ? ` ${numeroEnPalabras(resto)}` : ''}`;
}

const FUERTES = 'aeoáéó';
const DEBILES = 'iuü';
const ACENTUADAS_DEBILES = 'íú';

/**
 * Sílabas de una palabra, con diptongos: "diez" es una, "país" son dos.
 * Contar cada vocal como una sílaba inflaba el peso de las palabras con
 * diptongo (diez, cuatro, aire, ciento…) y corría todo el reparto de tiempo.
 */
function silabasDeLetras(palabra) {
  const w = palabra.toLowerCase().replace(/(q|g)u(?=[eiéí])/g, '$1');
  let cuenta = 0;
  let previa = '';
  for (const c of w) {
    const esVocal = FUERTES.includes(c) || DEBILES.includes(c) || ACENTUADAS_DEBILES.includes(c);
    if (!esVocal) { previa = ''; continue; }
    const diptongo = previa
      && ((DEBILES.includes(previa) && (FUERTES.includes(c) || DEBILES.includes(c)))
        || (FUERTES.includes(previa) && DEBILES.includes(c)));
    if (!diptongo) cuenta += 1;
    previa = c;
  }
  return cuenta;
}

/** Aproximación de sílabas: alcanza de sobra para repartir tiempo. */
export const silabas = (p) => {
  const dicha = String(p).replace(/\d+/g, (n) => ` ${n.length > 6 ? 'x'.repeat(n.length) : numeroEnPalabras(Number(n))} `);
  return Math.max(1, dicha.split(/\s+/).reduce((a, w) => a + silabasDeLetras(w), 0));
};

/**
 * ffmpeg (silencedetect) a veces parte UNA pausa en dos tramos pegados (el segundo empieza 1 ms después de que termina el primero). Si cada tramo cuenta como una pausa,
 * el reparto corta en el final del primero y la voz de la oración siguiente se muestra más de medio segundo antes de decirse (repaso del 19/11/2026: «Anthropic»).
 * Une los tramos separados por menos de `hueco` segundos.
 */
export function unirPausas(pausas, hueco = 0.06) {
  const salida = [];
  for (const p of [...(pausas ?? [])].sort((a, b) => a.desde - b.desde)) {
    const ult = salida.at(-1);
    if (ult && p.desde - ult.hasta <= hueco) ult.hasta = Math.max(ult.hasta, p.hasta);
    else salida.push({ desde: p.desde, hasta: p.hasta });
  }
  return salida;
}

const TERMINA_FRASE = /[.!?…]$/;
const TERMINA_CLAUSULA = /[.,;:!?…]$/;

/** Parte las palabras en cláusulas: un corte en cada signo de puntuación. */
export function clausulas(palabras) {
  const segmentos = [];
  let actual = [];
  for (const p of palabras) {
    actual.push(p);
    if (TERMINA_CLAUSULA.test(p)) {
      segmentos.push({ palabras: actual, tipo: TERMINA_FRASE.test(p) ? 'frase' : 'coma' });
      actual = [];
    }
  }
  if (actual.length) segmentos.push({ palabras: actual, tipo: 'fin' });
  return segmentos;
}

/**
 * Dónde cae, en tiempo real, el momento en que se llevan `hablado` segundos de
 * voz desde `t`, saltando los silencios que haya en el medio.
 */
function tiempoReal(t, hablado, silenciosAdelante) {
  let cursor = t;
  let falta = hablado;
  for (const s of silenciosAdelante) {
    if (s.desde <= cursor) { cursor = Math.max(cursor, s.hasta); continue; }
    if (s.desde - cursor >= falta) break;
    falta -= s.desde - cursor;
    cursor = s.hasta;
  }
  return cursor + falta;
}

/**
 * @param {string[]} palabras   las palabras del texto, con su puntuación
 * @param {{desde:number,hasta:number}[]} pausas   silencios del audio
 * @param {number} inicio  cuándo arranca la voz de verdad
 * @param {number} fin     cuándo termina
 * @returns {{ texto: string, desde: number, hasta: number, finFrase: boolean, pausa: boolean }[]}
 */
export function repartir(palabras, pausas, inicio, fin) {
  const segmentos = clausulas(palabras);
  if (!segmentos.length) return [];

  const pesos = segmentos.map((s) => s.palabras.reduce((a, p) => a + silabas(p), 0));
  const silenciosOrdenados = [...pausas].sort((a, b) => a.desde - b.desde).map((p, j) => ({ ...p, j, largo: p.hasta - p.desde }));
  const usadas = new Set();

  let t = inicio;
  let pesoRestante = pesos.reduce((a, b) => a + b, 0);

  segmentos.forEach((seg, i) => {
    seg.desde = t;
    if (i === segmentos.length - 1) {
      seg.hasta = fin;
      seg.sigue = fin;
    } else {
      // Los silencios no tienen voz: el tiempo para hablar es el que queda
      // sin ellos, y se reparte por peso silábico entre las cláusulas que faltan.
      const adelante = silenciosOrdenados.filter((s) => s.hasta > t && s.desde < fin);
      const enSilencio = adelante.reduce((a, s) => a + Math.min(s.hasta, fin) - Math.max(s.desde, t), 0);
      const hablado = Math.max(0.05, (fin - t) - enSilencio);
      const duracion = (hablado * pesos[i]) / pesoRestante;
      const esperado = tiempoReal(t, duracion, adelante);
      const tolerancia = Math.max(0.5, duracion * 0.4);

      // Para cada pausa: cuánto habla la voz hasta llegar a ella (sin contar los
      // silencios anteriores). La que más se parece a lo que dura la cláusula
      // es el corte. Se compara tiempo de voz y no posición en el reloj: si la
      // estimación se pasa un poco, una posición "salta" la pausa y se pega a
      // la siguiente, que es lo que desfasaba el podcast.
      // Al fin de una oración se le premia la pausa larga: ahí la voz se
      // detiene más que en una coma.
      const premio = seg.tipo === 'frase' ? 0.6 : 0.2;
      const cerca = adelante
        .filter((c) => !usadas.has(c.j) && c.desde > t + 0.1)
        .map((c) => {
          const silenciosAntes = adelante
            .filter((x) => x.hasta <= c.desde)
            .reduce((acc, x) => acc + x.hasta - Math.max(x.desde, t), 0);
          const habla = (c.desde - t) - silenciosAntes;
          return { c, error: Math.abs(habla - duracion) };
        })
        .filter((x) => x.error <= tolerancia)
        .sort((x, y) => (x.error - premio * x.c.largo) - (y.error - premio * y.c.largo))[0]?.c;

      if (cerca) {
        usadas.add(cerca.j);
        seg.hasta = cerca.desde;   // la voz se calla acá…
        seg.sigue = cerca.hasta;   // …y la próxima cláusula arranca cuando termina la pausa
      } else {
        seg.hasta = esperado;
        seg.sigue = esperado;
      }
    }
    t = seg.sigue;
    pesoRestante -= pesos[i];
  });

  // Adentro de cada cláusula, las palabras se reparten por peso silábico.
  const resultado = [];
  segmentos.forEach((seg) => {
    const ps = seg.palabras.map(silabas);
    const suma = ps.reduce((a, b) => a + b, 0);
    let desde = seg.desde;
    seg.palabras.forEach((p, j) => {
      const dur = (Math.max(0.05, seg.hasta - seg.desde) * ps[j]) / suma;
      const limpia = p.replace(/^[¡¿("']+|[.,;:!?…)"']+$/g, '');
      resultado.push({
        texto: limpia || p,
        desde,
        hasta: desde + dur,
        finFrase: j === seg.palabras.length - 1 && seg.tipo === 'frase',
        pausa: j === seg.palabras.length - 1 && seg.tipo === 'coma',
      });
      desde += dur;
    });
  });
  return resultado;
}
