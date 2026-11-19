// El gráfico propio de una nota (Hernán, 19/11): datos estructurados que viajan en `ficha.grafico` y que el sitio dibuja (v3/sitio/vistas/grafico-nota.mjs).
// Todo acá es código puro, sin IA y sin red: lo usan la redacción (valida lo que devuelve la IA), el panel (lo que se carga a mano) y las notas a mano (JSON).
//
//   normalizarGrafico(g)                       → { grafico } o { motivo }   (la forma: tipo, título, unidad, fuente y 3 a 8 filas con número)
//   numerosDelTexto(texto)                     → Set de números que aparecen en un texto en castellano (12.500, 3,5 %, 2 millones…)
//   validarContraFuentes(grafico, textoFuentes)→ { grafico } o { motivo }   (cada valor tiene que aparecer en las fuentes)
//   graficoDeRespuesta(crudo, articulos)       → { grafico } o { motivo } o { motivo: 'sin-grafico' } (todo junto, para la redacción)
//   parsearValor(texto) / parsearFilas(texto)  → números y filas «etiqueta: valor» escritos a mano (panel)

export const TIPOS_DE_GRAFICO = ['barras', 'linea'];
export const MIN_FILAS = 3;
export const MAX_FILAS = 8;
const MAX_TITULO = 90;
const MAX_UNIDAD = 24;
const MAX_FUENTE = 90;
const MAX_ETIQUETA = 40;
const TOPE_VALOR = 1e13;

const unaLinea = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** «60.000» → 60000, «12,5» → 12.5, «$2.350.000» → 2350000, «3,5%» → 3.5, «12.5» → 12.5. null si no es un número. */
export function parsearValor(texto) {
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto : null;
  let t = String(texto ?? '').trim().replace(/^(?:US\$|u\$s|\$|ar\$)\s*/i, '').replace(/\s*(?:%|por ciento)$/i, '').replace(/\s+/g, '');
  if (!t) return null;
  const negativo = t.startsWith('-') || t.startsWith('−');
  t = t.replace(/^[-−]/, '');
  if (!/^\d[\d.,]*$/.test(t)) return null;
  let n;
  if (t.includes(',')) {
    if (!/^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(t)) return null;
    n = Number(t.replace(/\./g, '').replace(',', '.'));
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) n = Number(t.replace(/\./g, ''));
  else if (/^\d+(\.\d+)?$/.test(t)) n = Number(t);
  else return null;
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

/** Las filas que se escriben a mano, una por línea: «Etiqueta: valor» (también con «;», tabulador o «=»). Devuelve [{ etiqueta, valor }] o { error } con el número de línea. */
export function parsearFilas(texto) {
  const filas = [];
  const lineas = String(texto ?? '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lineas.length; i++) {
    const m = /^(.*?)\s*(?:[:;=\t])\s*([^:;=\t]+)$/.exec(lineas[i]);
    const valor = m ? parsearValor(m[2]) : null;
    if (!m || !unaLinea(m[1]) || valor === null) return { error: 'fila', linea: i + 1 };
    filas.push({ etiqueta: unaLinea(m[1]), valor });
  }
  return filas;
}

/**
 * La forma del gráfico. Devuelve { grafico } con los campos limpios (texto en una línea, números de verdad) o { motivo } con un código fijo.
 * Reglas: tipo barras o línea; título, unidad (puede ir vacía) y fuente; de 3 a 8 filas con etiqueta y valor finito; en barras nada negativo; no todos los valores iguales.
 */
export function normalizarGrafico(g) {
  if (!g || typeof g !== 'object' || Array.isArray(g)) return { motivo: 'no-es-objeto' };
  if (!TIPOS_DE_GRAFICO.includes(g.tipo)) return { motivo: 'tipo' };
  const titulo = unaLinea(g.titulo);
  const unidad = unaLinea(g.unidad);
  const fuente = unaLinea(g.fuente);
  if (titulo.length < 3 || titulo.length > MAX_TITULO) return { motivo: 'titulo' };
  if (unidad.length > MAX_UNIDAD) return { motivo: 'unidad' };
  if (fuente.length < 2 || fuente.length > MAX_FUENTE) return { motivo: 'fuente' };
  if (!Array.isArray(g.datos)) return { motivo: 'datos' };
  if (g.datos.length < MIN_FILAS) return { motivo: 'pocas-filas' };
  if (g.datos.length > MAX_FILAS) return { motivo: 'muchas-filas' };
  const datos = [];
  for (const d of g.datos) {
    const etiqueta = unaLinea(d?.etiqueta);
    const valor = typeof d?.valor === 'number' ? d.valor : parsearValor(d?.valor);
    if (!etiqueta || etiqueta.length > MAX_ETIQUETA) return { motivo: 'etiqueta' };
    if (valor === null || !Number.isFinite(valor) || Math.abs(valor) > TOPE_VALOR) return { motivo: 'valor' };
    if (g.tipo === 'barras' && valor < 0) return { motivo: 'valor-negativo' };
    datos.push({ etiqueta, valor });
  }
  if (new Set(datos.map((d) => d.valor)).size < 2) return { motivo: 'valores-iguales' };
  return { grafico: { tipo: g.tipo, titulo, unidad, fuente, datos } };
}

const MULTIPLICA = { mil: 1e3, millon: 1e6, millones: 1e6, billon: 1e9, billones: 1e9 };

/**
 * Todos los números que aparecen en un texto, escritos como se escriben en la Argentina (12.500, 3,5 %, $2.350.000), y también en estilo inglés (12.5).
 * «2 millones» y «1,5 mil» suman además 2000000 y 1500. Sirve para comprobar que una cifra «está en la fuente»: es una prueba de presencia, no entiende el contexto.
 */
export function numerosDelTexto(texto) {
  const t = String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const salida = new Set();
  const re = /(\d[\d.,]*)(?:\s+(millones|millon|mil|billones|billon)\b)?/g;
  let m;
  while ((m = re.exec(t))) {
    const crudo = m[1].replace(/[.,]+$/, '');
    const candidatos = new Set();
    const a = parsearValor(crudo);
    if (a !== null) candidatos.add(a);
    // «12.500» también puede ser 12,5 en estilo inglés, y «1,234» 1234: si hay duda se aceptan las dos lecturas.
    if (/^\d{1,3}(\.\d{3})+$/.test(crudo)) candidatos.add(Number(crudo.replace(/\./g, '')));
    if (/^\d+\.\d+$/.test(crudo)) candidatos.add(Number(crudo));
    if (/^\d{1,3}(,\d{3})+$/.test(crudo)) candidatos.add(Number(crudo.replace(/,/g, '')));
    for (const c of candidatos) {
      salida.add(c);
      if (m[2]) salida.add(c * MULTIPLICA[m[2]]);
    }
  }
  return salida;
}

const igual = (a, b) => Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 1e-9);

/** Cada `valor` del gráfico tiene que estar como número en el texto de las fuentes. Si uno solo no está, se descarta todo (la IA no calcula, no redondea y no inventa). */
export function validarContraFuentes(grafico, textoFuentes) {
  const numeros = [...numerosDelTexto(textoFuentes)];
  for (const d of grafico.datos) {
    if (!numeros.some((n) => igual(n, d.valor))) return { motivo: `valor-sin-respaldo:${d.valor}` };
  }
  return { grafico };
}

/** El texto de las fuentes tal como se le mandó a la IA (título, bajada y texto de cada una, con el tope por fuente). */
export function textoDeFuentes(articulos, { maxPorFuente = 6000, maxTotal = 18000 } = {}) {
  let restante = maxTotal;
  const partes = [];
  for (const a of articulos ?? []) {
    if (restante <= 0) break;
    const t = [a.titulo, a.bajada, a.texto].map((x) => String(x ?? '').trim()).filter(Boolean).join('\n').slice(0, Math.max(0, Math.min(maxPorFuente, restante)));
    restante -= t.length;
    partes.push(t);
  }
  return partes.join('\n\n');
}

/**
 * Lo que devuelve la IA en el campo `grafico`, ya revisado: null o ausente → { motivo: 'sin-grafico' } (no es un error); forma mala o cifra que no está en las fuentes → { motivo }.
 * La fuente que dice el gráfico tiene que ser uno de los medios de la nota; si no, se pone el primero.
 */
export function graficoDeRespuesta(crudo, articulos) {
  if (crudo === null || crudo === undefined || crudo === false || (typeof crudo === 'object' && !Array.isArray(crudo) && Object.keys(crudo).length === 0)) return { motivo: 'sin-grafico' };
  const forma = normalizarGrafico(crudo);
  if (forma.motivo) return forma;
  const medios = [...new Set((articulos ?? []).map((a) => unaLinea(a.medio)).filter(Boolean))];
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const encontrada = medios.find((m) => norm(forma.grafico.fuente).includes(norm(m)) || norm(m).includes(norm(forma.grafico.fuente)));
  const grafico = { ...forma.grafico, fuente: encontrada ?? medios[0] ?? forma.grafico.fuente };
  return validarContraFuentes(grafico, textoDeFuentes(articulos));
}
