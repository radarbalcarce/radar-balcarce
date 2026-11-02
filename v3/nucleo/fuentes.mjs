// Cargar y validar la lista de fuentes (fuentes.json). Ver REGLAS.md §1 y CONTRATO.md.
const ALCANCES = ['balcarce', 'zona', 'provincia', 'pais'];
const TIPOS = ['rss', 'atom'];

// json: el objeto ya parseado ({ fuentes: [...] } o directamente el arreglo) o el texto JSON.
// Devuelve sólo las activas. Tira Error con todos los problemas juntos si algo está mal armado.
export function cargarFuentes(json) {
  const dato = typeof json === 'string' ? JSON.parse(json) : json;
  const lista = Array.isArray(dato) ? dato : dato && dato.fuentes;
  if (!Array.isArray(lista)) throw new Error('fuentes: se esperaba una lista');
  const problemas = [];
  const ids = new Set();
  for (const [i, f] of lista.entries()) {
    const donde = `fuente ${i} (${f && f.id})`;
    if (!f || typeof f !== 'object') { problemas.push(`${donde}: no es un objeto`); continue; }
    for (const campo of ['id', 'nombre', 'medio', 'url']) {
      if (typeof f[campo] !== 'string' || !f[campo].trim()) problemas.push(`${donde}: falta ${campo}`);
    }
    if (!TIPOS.includes(f.tipo)) problemas.push(`${donde}: tipo inválido (${f.tipo})`);
    if (!ALCANCES.includes(f.alcance)) problemas.push(`${donde}: alcance inválido (${f.alcance})`);
    if (typeof f.oficial !== 'boolean') problemas.push(`${donde}: oficial tiene que ser true o false`);
    if (typeof f.activa !== 'boolean') problemas.push(`${donde}: activa tiene que ser true o false`);
    try { new URL(f.url); } catch { problemas.push(`${donde}: url inválida`); }
    if (ids.has(f.id)) problemas.push(`${donde}: id repetido`);
    ids.add(f.id);
  }
  if (problemas.length) throw new Error('fuentes inválidas:\n' + problemas.join('\n'));
  return lista.filter((f) => f.activa);
}

function clave(medio) {
  return String(medio || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')      // "(FM 91.7)", "(Mar del Plata)"
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Dos fuentes (o dos nombres de medio) son del mismo medio si comparten `medio` ignorando mayúsculas, tildes y paréntesis.
export function mismoMedio(a, b) {
  const ma = typeof a === 'string' ? a : a && a.medio;
  const mb = typeof b === 'string' ? b : b && b.medio;
  const ka = clave(ma);
  return ka !== '' && ka === clave(mb);
}
