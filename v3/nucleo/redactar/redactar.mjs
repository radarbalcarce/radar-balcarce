// Pedido 1: la nota y la ficha. Un solo JSON con todo.
//
//   armarPedido(historia, articulos, { perfil, redaccion, aviso? }) → { sistema, prompt, fuentesUsadas }
//   redactar(historia, articulos, { gemini, perfil, redaccion, aviso?, maxPedidos? }) → Nota (sin foto ni id)
//
// Con `conGrafico` (interruptor NOTAS_CON_GRAFICO), el MISMO pedido puede traer un campo opcional `grafico` (redactar/grafico.mjs): si todas sus cifras están en las fuentes va a `ficha.grafico`; si no, se descarta sin tocar la nota.
// Si la respuesta no valida, un reintento con el error explicado (mientras queden pedidos); si vuelve a fallar, tira.

import { graficoDeRespuesta } from './grafico.mjs';

export const SECCIONES = [
  'Balcarce', 'Política', 'Policiales', 'Educación', 'Salud', 'Fútbol', 'Deportes',
  'Automovilismo', 'Agro', 'Economía', 'Ciencia', 'Cultura', 'Tecnología', 'Argentina',
];

export const MAX_POR_FUENTE = 6000;
export const MAX_TOTAL = 18000;
export const MIN_PALABRAS = 70;
export const FIRMA = 'Redacción Radar Balcarce';

const esquema = (conGrafico) => `{
  "titulo": "string, propio, informa qué pasó",
  "bajada": "string, una sola oración",
  "cuerpo": ["párrafo corto", "párrafo corto"],
  "seccion": "una de: ${SECCIONES.join(', ')}",
  "enDosLineas": "string: qué pasó y qué sigue, en dos líneas",
  "ficha": {
    "que": "string", "quien": "string", "donde": "string", "cuando": "string",
    "numeros": [{ "valor": "string", "unidad": "string", "que": "string", "fuente": "medio que lo dice" }],
    "cronologia": [{ "fecha": "string", "que": "string" }],
    "faltaSaber": ["string"]
  },
  "noPublicar": null${conGrafico ? `,
  "grafico": null o ${ESQUEMA_GRAFICO}` : ''}
}`;

const ESQUEMA_GRAFICO = `{ "tipo": "barras" | "linea", "titulo": "string corto", "unidad": "$, %, personas…", "fuente": "medio de donde salen las cifras", "datos": [{ "etiqueta": "string corta", "valor": número }] }`;

export const PEDIDO_DE_GRAFICO = 'Gráfico (opcional): si la nota tiene de 3 a 8 cifras que se pueden comparar entre sí (precios, porcentajes, cantidades por categoría, o una misma cifra en distintas fechas), todas con la misma unidad y dichas tal cual en las fuentes, devolvé `grafico`. '
  + 'Cada `valor` es el número exacto de la fuente (sin sumar, promediar, redondear ni calcular). Etiquetas de pocas palabras. Barras para comparar categorías; línea sólo para una evolución en el tiempo. Si no hay cifras comparables, `grafico`: null. No fuerces uno.';

const cantidadDePalabras = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;

function bloqueDeFuente(a, indice, tope) {
  const partes = [a.titulo, a.bajada, a.texto].map((x) => String(x ?? '').trim()).filter(Boolean);
  const contenido = partes.join('\n').slice(0, Math.max(0, Math.min(MAX_POR_FUENTE, tope)));
  const cabecera = `### Fuente ${indice}: ${a.medio}${a.oficial ? ' (oficial)' : ''}\nFecha: ${a.fecha ?? 's/d'}\nURL: ${a.url}\n`;
  return { texto: `${cabecera}${contenido}`, usados: contenido.length };
}

export function armarPedido(historia, articulos, { perfil = '', redaccion = '', aviso = '', conGrafico = false } = {}) {
  const ordenados = [...articulos].sort((a, b) => (b.oficial ? 1 : 0) - (a.oficial ? 1 : 0));
  const bloques = [];
  let restante = MAX_TOTAL;
  let n = 0;
  for (const a of ordenados) {
    if (restante <= 0) break;
    n += 1;
    const b = bloqueDeFuente(a, n, restante);
    bloques.push(b.texto);
    restante -= b.usados;
  }

  const prompt = [
    `Hoy es ${new Date().toISOString().slice(0, 10)}. Historia: ${historia?.titulo ?? ''} (hecho de ${historia?.fechaHecho ?? 's/d'}).`,
    `Fuentes (${bloques.length}), las oficiales primero:`,
    bloques.join('\n\n'),
    aviso ? `AVISO: ${aviso}` : '',
    'Escribí la nota siguiendo las reglas de escritura. Devolvé SOLO un JSON con exactamente esta forma:',
    esquema(conGrafico),
    conGrafico ? PEDIDO_DE_GRAFICO : '',
    'Si hay que marcar `no_publicar`, poné "noPublicar": { "motivo": "..." }; si no, null.',
  ].filter(Boolean).join('\n\n');

  return { sistema: `${perfil}\n\n${redaccion}`.trim(), prompt, fuentesUsadas: bloques.length };
}

// Devuelve { error } o { nota } (campos normalizados).
export function validar(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return { error: 'la respuesta no es un objeto JSON' };
  const noPublicar = r.noPublicar ?? null;
  if (noPublicar !== null && (typeof noPublicar !== 'object' || !String(noPublicar.motivo ?? '').trim())) {
    return { error: 'noPublicar tiene que ser null o { motivo }' };
  }
  const cuerpo = Array.isArray(r.cuerpo) ? r.cuerpo.map((p) => String(p).trim()).filter(Boolean) : null;
  if (!noPublicar) {
    for (const campo of ['titulo', 'bajada', 'enDosLineas']) {
      if (typeof r[campo] !== 'string' || !r[campo].trim()) return { error: `falta el campo ${campo}` };
    }
    if (!cuerpo) return { error: 'cuerpo tiene que ser una lista de párrafos' };
    if (!SECCIONES.includes(r.seccion)) return { error: `seccion inválida (${JSON.stringify(r.seccion)}); tiene que ser una de: ${SECCIONES.join(', ')}` };
    if (!r.ficha || typeof r.ficha !== 'object') return { error: 'falta la ficha' };
    const palabras = cantidadDePalabras(cuerpo.join(' '));
    if (palabras < MIN_PALABRAS) return { error: `el cuerpo tiene ${palabras} palabras; el mínimo es ${MIN_PALABRAS}` };
  }
  const f = r.ficha && typeof r.ficha === 'object' ? r.ficha : {};
  return {
    nota: {
      titulo: String(r.titulo ?? '').trim(),
      bajada: String(r.bajada ?? '').trim(),
      cuerpo: cuerpo ?? [],
      seccion: SECCIONES.includes(r.seccion) ? r.seccion : null,
      enDosLineas: String(r.enDosLineas ?? '').trim(),
      ficha: {
        que: String(f.que ?? ''), quien: String(f.quien ?? ''), donde: String(f.donde ?? ''), cuando: String(f.cuando ?? ''),
        numeros: Array.isArray(f.numeros) ? f.numeros : [],
        cronologia: Array.isArray(f.cronologia) ? f.cronologia : [],
        faltaSaber: Array.isArray(f.faltaSaber) ? f.faltaSaber.slice(0, 3) : [],
        // Marca de que «falta saber» se pidió con la regla de sólo cuando aporta (3/11): el sitio lo muestra únicamente así.
        faltaSaberSelectivo: true,
      },
      noPublicar: noPublicar ? { motivo: String(noPublicar.motivo).trim() } : null,
    },
  };
}

function fuentesSinRepetirMedio(articulos) {
  const vistos = new Set();
  const salida = [];
  for (const a of articulos) {
    if (vistos.has(a.medio)) continue;
    vistos.add(a.medio);
    salida.push({ medio: a.medio, url: a.url });
  }
  return salida;
}

/** Pone `ficha.grafico` si el que devolvió la IA pasa la forma y sus cifras están en las fuentes. Devuelve el motivo del descarte (o null si salió o no había). */
function agregarGrafico(nota, crudo, articulos) {
  const r = graficoDeRespuesta(crudo, articulos);
  if (r.grafico) { nota.ficha.grafico = r.grafico; return null; }
  return r.motivo === 'sin-grafico' ? null : r.motivo;
}

export async function redactar(historia, articulos, { gemini, perfil, redaccion, aviso = '', maxPedidos = 2, conGrafico = false } = {}) {
  let pedidos = 0;
  let avisoActual = aviso;
  let ultimoError = '';
  while (pedidos < Math.max(1, maxPedidos)) {
    const { sistema, prompt } = armarPedido(historia, articulos, { perfil, redaccion, aviso: avisoActual, conGrafico });
    pedidos += 1;
    let respuesta;
    try {
      respuesta = await gemini.texto(prompt, { json: true, sistema });
    } catch (e) {
      if (e.message !== 'json-invalido') throw e;
      ultimoError = 'la respuesta no era JSON válido';
      avisoActual = `${aviso} Tu respuesta anterior fue rechazada: ${ultimoError}. Devolvé sólo el JSON.`.trim();
      continue;
    }
    const v = validar(respuesta);
    if (v.nota) {
      const conMotivo = conGrafico && !v.nota.noPublicar ? agregarGrafico(v.nota, respuesta?.grafico, articulos) : null;
      return {
        historiaId: historia?.id ?? null,
        ...v.nota,
        verificacion: { oracionesQuitadas: [], reescrita: false, ...(conMotivo ? { graficoDescartado: conMotivo } : {}) },
        foto: null,
        fuentes: fuentesSinRepetirMedio(articulos),
        fechaHecho: historia?.fechaHecho ?? null,
        firma: FIRMA,
        pedidos,
      };
    }
    ultimoError = v.error;
    avisoActual = `${aviso} Tu respuesta anterior fue rechazada: ${v.error}. Corregilo.`.trim();
  }
  throw new Error(`redaccion-invalida: ${ultimoError}`);
}
