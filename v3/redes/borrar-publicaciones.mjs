// Borra publicaciones ya hechas en Facebook e Instagram por su id (los que guarda `piezas.acciones`), con la llave de Meta (META_TOKEN). Sólo a mano, desde el workflow
// «Radar 3.0: borrar publicaciones» (Hernán, 20/11/2026: la efeméride salió con una foto equivocada y se borró). No toca TikTok, YouTube ni X: lo que salió por Buffer se borra desde cada red.
//
//   IDS="facebook:123,instagram:456" node v3/redes/borrar-publicaciones.mjs
//
// Nunca imprime la llave. Instagram, según la versión de la API, puede no permitir borrar: si contesta que no, se avisa y hay que borrarlo desde la aplicación.
const BASE = 'https://graph.facebook.com/v23.0';

/** «facebook:123,instagram:456» → [{ red, id }]; ignora lo que no tenga forma de red:número. */
export function leerIds(texto = '') {
  return String(texto).split(/[\s,]+/).map((x) => x.trim()).filter(Boolean).map((x) => {
    const [red, id] = x.split(':');
    return { red: String(red || '').toLowerCase(), id: String(id || '') };
  }).filter((x) => ['facebook', 'instagram'].includes(x.red) && /^\d{5,}$/.test(x.id));
}

/** Pide a Meta que borre cada publicación. Devuelve [{ red, id, ok, detalle }]. */
export async function borrar(publicaciones, { token, fetchFn = fetch } = {}) {
  const r = [];
  for (const p of publicaciones) {
    try {
      const res = await fetchFn(`${BASE}/${p.id}?access_token=${encodeURIComponent(token)}`, { method: 'DELETE' });
      const cuerpo = await res.json().catch(() => ({}));
      const ok = res.ok && (cuerpo.success === true || cuerpo === true);
      r.push({ ...p, ok, detalle: ok ? 'borrada' : String(cuerpo?.error?.message || `HTTP ${res.status}`).slice(0, 200) });
    } catch (e) {
      r.push({ ...p, ok: false, detalle: String(e?.message || e).slice(0, 200) });
    }
  }
  return r;
}

const esElPrograma = process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL((await import('node:path')).resolve(process.argv[1])).href;
if (esElPrograma) {
  const token = process.env.META_TOKEN;
  const lista = leerIds(process.env.IDS);
  if (!token) { console.error('falta META_TOKEN'); process.exit(1); }
  if (!lista.length) { console.error('no hay ids válidos (formato: facebook:123,instagram:456)'); process.exit(1); }
  const r = await borrar(lista, { token });
  for (const x of r) console.log(`${x.red} ${x.id}: ${x.ok ? 'BORRADA' : `NO se pudo (${x.detalle})`}`);
  if (r.some((x) => !x.ok)) process.exitCode = 1;
}
