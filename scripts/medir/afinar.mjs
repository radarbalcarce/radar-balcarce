// Fuentes v3 (16/10/2026), pedido de Hernán y Andrés: (B) comprobar que los medios "de Balcarce" sean de la
// zona, y (C) una lista MÁS CORTA de medios de afuera (entre 30 y 40) con un criterio que se pueda medir.
// Lo usa generar-revision.mjs para la pestaña "Versión corta (recomendada)". SÓLO LEE: no toca
// ingesta/fuentes*.mjs (las activaciones las deciden ellos con la página).

import { leerPublicadas, simularLista, mediosDelRegistro, minimoDe } from '../../ingesta/auditar-fuentes.mjs';
import { AREAS_CHICAS } from '../../ingesta/criterio.mjs';

/** (B) Quién es cada fuente "de Balcarce" y dónde está su redacción. Comprobado en sus sitios el 15 y 16/10/2026
 *  (pie de página, contacto, "quiénes somos", teléfono 02266). `veredicto`: 'si' (de Balcarce), 'mezcla' (de
 *  Balcarce pero con mucho de afuera: lo filtra historiaDeAca), 'no' (no es un medio de la zona aunque nombre
 *  Balcarce) o 'duda' (no se pudo confirmar). La clave es el nombre del medio en el registro. */
export const VERIFICACION_LOCAL = {
  'Diario La Vanguardia': { veredicto: 'mezcla', redaccion: 'Calle 16 N° 662, 1° piso, Balcarce; tel. (02266) 42-4151 ("Multimedios Balcarce", con Radio Líder).', cubre: 'Balcarce, y además muchas notas nacionales e internacionales copiadas.', propuesta: 'Dejar como de Balcarce. Lo nacional que copia ya no cuenta como de acá (historiaDeAca).' },
  'Radio Gabal (FM 104.1)': { veredicto: 'mezcla', redaccion: 'Calle 8 N° 546, Balcarce.', cubre: '"Balcarce y la región"; tiene secciones El País y El Mundo (16 de 64 títulos de la portada).', propuesta: 'Dejar: ya se leen sólo sus secciones locales (Comunidad, Policiales, Política, Deportes, Agro), no El País ni El Mundo.' },
  'Infórmese Primero (FM 104.9)': { veredicto: 'mezcla', redaccion: 'El pie dice "2007-2026, Balcarce" y los "hechos de nuestra ciudad"; no publica dirección.', cubre: 'Balcarce, más secciones Provincial y Nacional.', propuesta: 'Dejar. Si se quiere menos ruido, leer sólo las etiquetas La Ciudad, Zonales y Deportes (ver Balcarce a fondo).' },
  'El Diario Balcarce': { veredicto: 'si', redaccion: 'Calle 17 N° 792, Balcarce (Imagen Balcarce SRL). Se presenta como el único diario de Balcarce en papel y digital.', cubre: 'Balcarce; tiene secciones Nacionales y El mundo que no se raspan.', propuesta: 'Dejar.' },
  'Puntonueve (FM 100.9)': { veredicto: 'si', redaccion: 'Av. Adolfo Gonzales Chaves 486, 1° piso, Balcarce; tel. 02266-43-1625 (oficina y planta transmisora).', cubre: 'Casi todo de Balcarce (22 de 26 títulos).', propuesta: 'Dejar.' },
  'News Balcarce (FM 91.7)': { veredicto: 'si', redaccion: 'No publica dirección ni teléfono; firma "Radio News", FM 91.7.', cubre: 'Balcarce y algo provincial; ningún título nacional en la portada.', propuesta: 'Dejar (de Balcarce por lo que publica; no hay dato formal).' },
  'Acción 5 (Balcarce)': { veredicto: 'si', redaccion: 'No publica contacto; el sitio da el clima de Balcarce y cubre la Liga Balcarceña, Ferro, Atlético Unidos y el autódromo.', cubre: 'Deporte de Balcarce.', propuesta: 'Dejar sólo el feed: el sitio está vulnerado (spam de apuestas en la portada y en la descripción para redes).' },
  'Ahora Balcarce': { veredicto: 'no', redaccion: 'No se encontró redacción en Balcarce: no hay dirección, autor ni teléfono; el pie dice "© 2018". Es parte de la red "Ahora" (su sitio trae los feeds de Ahora Mar Chiquita, Ahora Buenos Aires, ahoranoticias.ar, Dolores y Mar del Plata). Las 10 notas del feed las subió el mismo usuario el 03/10 en hora y media; no publicó más.', cubre: 'Gacetillas del Municipio de Balcarce, copiadas.', propuesta: 'Sacarla del bloque de Balcarce: no es un medio de la zona sino un portal de una red que copia al Municipio (que ya se lee). Opciones: apagarla, o pasarla a alcance "region" con peso 8 para que no cuente como medio de acá ni como un segundo medio en el cruce.' },
  'Municipalidad de Balcarce': { veredicto: 'si', redaccion: 'Calle 16 N° 602, Balcarce; tel. (02266) 43-0240. Organismo oficial.', cubre: 'Sólo Balcarce y sus localidades.', propuesta: 'Dejar.' },
  'Concejo Deliberante de Balcarce': { veredicto: 'si', redaccion: 'Calle 20 N° 569, Balcarce; tel. 02266 42-4089. Organismo oficial.', cubre: 'Sólo Balcarce; publica poco.', propuesta: 'Dejar.' },
  'Facultad de Ciencias Agrarias (UNMdP)': { veredicto: 'no', redaccion: 'Ruta 226 km 73,5, Balcarce (es de la Universidad Nacional de Mar del Plata).', cubre: 'Cursos de posgrado e informes técnicos (ensayos de maíz en varias localidades): no son noticias del partido.', propuesta: 'Queda en Balcarce, pero no es un medio local: pasarla a alcance "region" (Agro), para que sus notas sean de acá sólo cuando nombren a Balcarce. Puede seguir como oficial.' },
};

/** Las dos que se dicen de Balcarce y no están en el bloque local (para la sección "¿Son de la zona?"). */
export const OTRAS_QUE_SE_DICEN_DE_BALCARCE = [
  { nombre: 'Argenpapa', veredicto: 'no', redaccion: 'Calle 19 N° 859, Balcarce; tel. (02266) 42-0703.', cubre: 'La papa de todo el país y del mundo (Mercado Central, Idaho, Países Bajos): 1 de 19 títulos nombra a Balcarce.', propuesta: 'La redacción es de acá pero el contenido no: tratarla como agro nacional (alcance "pais", sección Agro) y bajarle el peso de 16 a 8.' },
  { nombre: 'Radio Sudestada (apagada)', veredicto: 'mezcla', redaccion: 'radiosudestada.com.ar, WhatsApp 2266; Cooperativa de Trabajo La Barrosa Ltda.', cubre: '"Noticias de Balcarce y la región", con mucho nacional e internacional y necrológicas.', propuesta: 'Dejarla apagada (decisión del 30/09). Si vuelve, como Radio Gabal: sólo lo que nombra a Balcarce.' },
];

/** (C) La meta de la lista corta: entre 30 y 40 medios de afuera; se apunta al medio. */
export const OBJETIVO = { minimo: 30, maximo: 40, meta: 36, limitePerdida: 6 };

/** El criterio, escrito para la página (cada paso se puede volver a medir con los mismos datos). */
export const CRITERIO_CORTA = [
  'Se parte de los 52 medios de afuera de la versión de 63 (63 = 52 de afuera + 11 de Balcarce). Todo lo de Balcarce queda.',
  'Sin redundancia de dueño: de cada grupo (Grupo Clarín; el sistema eleco.com.ar) queda uno solo, el que solo hace perder menos notas. En el cruce los del mismo dueño cuentan como una sola voz: el segundo no suma un medio. Tiene un costo, y la página lo muestra: los del mismo dueño cuentan historias distintas.',
  'Aporte único: queda siempre el que trajo 3 o más notas que no contó nadie más en 30 días, o el de la zona con 5 o más notas de acá.',
  'Secciones: ninguna sección puede quedar con menos medios que su mínimo más uno (contando los que aparecieron en 3 notas o más de esa sección). Así Fútbol y Deportes (piden 4), Agro, Economía, Tecnología y Automovilismo (piden 2) y Policiales de la zona no se quedan sin medios.',
  'Después se saca de a uno el que menos notas hace perder: con las notas ya publicadas desde el 3/9 se mide cuántas notas de afuera habrían llegado igual al mínimo de medios de su sección sin él (velocidad y calidad no se pueden medir con lo guardado; el aporte sí). Empate: el que menos veces fue imprescindible y menos visitas tuvo.',
  'Se para al llegar a 36 medios de afuera, o antes si el próximo hiciera perder más de 6 notas.',
];

const datoDeAca = (m) => Number(String(m.datoMedido ?? '').match(/de acá (\d+)/)?.[1] ?? 0);

/** Las secciones donde un medio "aparece" (3 notas o más de esa sección). */
function seccionesDe(notas, nombre) {
  const c = {};
  for (const n of notas) if (n.medios.includes(nombre) && n.seccion) c[n.seccion] = (c[n.seccion] ?? 0) + 1;
  return Object.entries(c).filter(([, k]) => k >= 3).map(([s]) => s);
}

/**
 * Arma la lista corta a partir de los medios de armarDatos(). Devuelve
 * { base, quedan, salen: [{ nombre, paso, motivo }], cobertura: { de63, corta }, porSeccion }.
 */
export function elegirCorta(medios, { notas = leerPublicadas(), registro } = {}) {
  const reg = mediosDelRegistro(registro);
  const grupoDe = (m) => reg.get(m)?.grupo ?? null;
  const esDeBalcarce = (m) => !!reg.get(m)?.local;
  const deAfuera = medios.filter((m) => m.activo && !m.descartada && m.grupo !== 'balcarce');
  const porNombre = new Map(deAfuera.map((m) => [m.nombre, m]));
  const S = new Set(deAfuera.map((m) => m.nombre));
  const salen = [];
  const sim = (conj) => simularLista(notas, conj, { grupoDe, esDeBalcarce });
  const base = sim(S);

  // 1. Un medio por dueño
  const porGrupo = new Map();
  for (const m of deAfuera) if (grupoDe(m.nombre)) {
    const g = grupoDe(m.nombre);
    if (!porGrupo.has(g)) porGrupo.set(g, []);
    porGrupo.get(g).push(m);
  }
  for (const [g, ms] of porGrupo) {
    if (ms.length < 2) continue;
    // Queda el que, solo, hace perder menos notas (a igualdad, el más imprescindible).
    const costo = (queda) => {
      const c = new Set(S);
      for (const m of ms) if (m !== queda) c.delete(m.nombre);
      return sim(S).llegan - sim(c).llegan;
    };
    const orden = ms.map((m) => ({ m, costo: costo(m) })).sort((a, b) => a.costo - b.costo || (b.m.imprescindible ?? 0) - (a.m.imprescindible ?? 0));
    const queda = orden[0].m;
    for (const { m } of orden.slice(1)) {
      const antes = sim(S).llegan;
      S.delete(m.nombre);
      const perdida = antes - sim(S).llegan;
      salen.push({ nombre: m.nombre, paso: 'dueno', perdida, motivo: `Mismo dueño que ${queda.nombre} (${g}): en el cruce cuentan como una sola voz, así que ${m.nombre} no suma un medio distinto. De los del grupo, ${queda.nombre} es el que solo hace perder menos notas. Ojo, el costo medido: sin ${m.nombre} se pierden ${perdida} ${perdida === 1 ? 'nota' : 'notas'} de afuera que llegaban al mínimo (historias que el grupo contaba sólo por ${m.nombre}).` });
    }
  }

  // 2 y 3. Protegidos por aporte único o por sección
  const protegidoPorAporte = (m) => (m.unica30 ?? 0) >= 3 || (m.grupo === 'zona' && datoDeAca(m) >= 5);
  const secciones = new Map([...S].map((n) => [n, seccionesDe(notas, n)]));
  const todasLasSecciones = [...new Set([...AREAS_CHICAS, ...notas.map((n) => n.seccion).filter(Boolean)])].filter((s) => s !== 'Balcarce');
  const cuantosCubren = (s, conj) => [...conj].filter((n) => (secciones.get(n) ?? []).includes(s)).length;
  const dejaCortaUnaSeccion = (nombre) => (secciones.get(nombre) ?? []).find((s) => {
    const ahora = cuantosCubren(s, S);
    return ahora - 1 < minimoDe(s) + 1 && ahora - 1 < cuantosCubren(s, new Set(deAfuera.map((m) => m.nombre)));
  });

  // 4. De a uno, el que menos hace perder
  let llegan = sim(S).llegan;
  while (S.size > OBJETIVO.meta) {
    const candidatos = [];
    for (const nombre of S) {
      const m = porNombre.get(nombre);
      if (protegidoPorAporte(m) || dejaCortaUnaSeccion(nombre)) continue;
      const sin = new Set(S);
      sin.delete(nombre);
      candidatos.push({ m, perdida: llegan - sim(sin).llegan });
    }
    candidatos.sort((a, b) => a.perdida - b.perdida || (a.m.imprescindible ?? 0) - (b.m.imprescindible ?? 0) || (a.m.vistas ?? 0) - (b.m.vistas ?? 0) || a.m.pub30 - b.m.pub30);
    const elegido = candidatos[0];
    if (!elegido || elegido.perdida > OBJETIVO.limitePerdida) break;
    S.delete(elegido.m.nombre);
    llegan -= elegido.perdida;
    const m = elegido.m;
    const sinHistorial = m.nuevo ? ' Es un alta del 15/10 sin historial: no hay con qué medir que aporte; puede volver si en la versión de 63 demuestra algo.' : '';
    salen.push({ nombre: m.nombre, paso: 'aporte', perdida: elegido.perdida, motivo: `Si se saca, ${elegido.perdida === 0 ? 'no se pierde ninguna nota' : `se pierden ${elegido.perdida} ${elegido.perdida === 1 ? 'nota' : 'notas'}`} de afuera de las que llegaban al mínimo de medios (desde el 3/9). Fue imprescindible ${m.imprescindible ?? 0} ${m.imprescindible === 1 ? 'vez' : 'veces'}, ${m.pub30} notas publicadas en 30 días y ${m.vistas ?? 0} visitas a sus notas.${sinHistorial}` });
  }
  const corta = sim(S);
  const quedan = deAfuera.filter((m) => S.has(m.nombre)).map((m) => ({
    nombre: m.nombre,
    porque: protegidoPorAporte(m) ? `aporte único (${m.unica30 ?? 0} notas que sólo contó él${datoDeAca(m) ? `, ${datoDeAca(m)} de acá` : ''})`
      : dejaCortaUnaSeccion(m.nombre) ? `sostiene la sección ${dejaCortaUnaSeccion(m.nombre)}` : `aporta (imprescindible ${m.imprescindible ?? 0} veces, ${m.pub30} publicadas en 30 días)`,
  }));
  return {
    base: deAfuera.length,
    quedan,
    salen,
    cobertura: { de63: base, corta },
    secciones: todasLasSecciones.map((s) => ({ seccion: s, minimo: minimoDe(s), de63: cuantosCubren(s, new Set(deAfuera.map((m) => m.nombre))), corta: cuantosCubren(s, S), notas63: base.porSeccion[s] ?? { total: 0, llegan: 0 }, notasCorta: corta.porSeccion[s] ?? { total: 0, llegan: 0 } })),
  };
}
