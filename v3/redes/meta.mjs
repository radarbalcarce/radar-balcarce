// El cliente de Meta (Graph API) de Radar 3.0: lo que hace falta para publicar una foto en la página de Facebook y en el Instagram del medio.
// Salió de redes/meta.mjs del sistema viejo (ya probado en producción), con sólo lo que usan los posteos de notas. Sin dependencias, sólo fetch.
//
// Tres cuidados que no se negocian:
//   1. El token viaja en el encabezado Authorization y nunca en la dirección.
//   2. Si Meta devuelve un error, el mensaje se limpia antes de mostrarse, por si repite el token.
//   3. Acá no se decide QUÉ se publica (eso es de elegir.mjs). Este archivo sólo sabe hablar con Meta.

const BASE = 'https://graph.facebook.com';
const VERSION = 'v23.0';

/** La página de Facebook "Radar Balcarce" para la API (no es el número de la dirección de la página). Se puede cambiar con la variable PAGINA_DE_FACEBOOK. */
export const PAGINA_DE_FACEBOOK = '1254237411116171';

/** El error de Meta con lo que sirve para decidir qué hacer: si reintentar, si el token murió, si el contenido fue rechazado. */
export class ErrorMeta extends Error {
  constructor(mensaje, { codigo = null, subcodigo = null, tipo = null, http = null } = {}) {
    super(mensaje);
    this.name = 'ErrorMeta';
    this.codigo = codigo;
    this.subcodigo = subcodigo;
    this.tipo = tipo;
    this.http = http;
  }

  /** El token venció o lo revocaron: no tiene sentido seguir intentando. */
  get tokenMuerto() {
    return this.codigo === 190;
  }
}

/** Saca el token de cualquier texto antes de mostrarlo. */
export function sinToken(texto, token) {
  const t = String(texto ?? '');
  return token ? t.split(token).join('***') : t;
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Cuánto se espera a Meta en un pedido común. Un pedido que Meta deja colgado no puede dejar a la vuelta esperando para siempre. */
export const ESPERA_MAXIMA = 20_000;

/**
 * @param {object} o
 * @param {string} o.token          el del usuario del sistema (META_TOKEN)
 * @param {string} [o.paginaId]     la página de Facebook
 * @param {Function} [o.fetchFn]    para las pruebas
 * @param {Function} [o.esperar]    para las pruebas: no dormir de verdad
 */
export function crearCliente({ token, paginaId = PAGINA_DE_FACEBOOK, fetchFn = fetch, esperar = dormir, version = VERSION, espera = ESPERA_MAXIMA }) {
  if (!token) throw new Error('Falta el token de Meta (META_TOKEN).');
  if (!paginaId) throw new Error('Falta el ID de la página de Facebook.');

  let cache = null;

  async function pedir(camino, { metodo = 'GET', params = {}, conToken = token } = {}) {
    const url = new URL(`${BASE}/${version}/${camino.replace(/^\//, '')}`);
    const init = { method: metodo, headers: { Authorization: `Bearer ${conToken}` }, signal: AbortSignal.timeout(espera) };

    if (metodo === 'GET') {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    } else {
      init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      init.body = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    }

    let r;
    try {
      r = await fetchFn(url, init);
    } catch (e) {
      throw new ErrorMeta(`No se pudo hablar con Meta: ${sinToken(sinToken(e.message, token), conToken)}`);
    }

    let json = null;
    try { json = await r.json(); } catch { /* respuesta vacía o no JSON */ }

    if (!r.ok || json?.error) {
      const e = json?.error ?? {};
      throw new ErrorMeta(sinToken(sinToken(e.message ?? `Meta respondió ${r.status}`, token), conToken), {
        codigo: e.code ?? null, subcodigo: e.error_subcode ?? null, tipo: e.type ?? null, http: r.status,
      });
    }
    return json;
  }

  /** La página, su token propio y la cuenta de Instagram que tiene vinculada. */
  async function pagina() {
    if (cache) return cache;
    const j = await pedir(paginaId, { params: { fields: 'name,link,access_token,instagram_business_account{id,username}' } });
    cache = {
      nombre: j.name,
      enlace: j.link ?? null,
      // Las publicaciones se hacen con el token de la página, no con el del usuario del sistema: es lo que Meta pide para escribir en su nombre.
      tokenPagina: j.access_token ?? token,
      instagramId: j.instagram_business_account?.id ?? null,
      instagramUsuario: j.instagram_business_account?.username ?? null,
    };
    return cache;
  }

  /** Una foto en la página de Facebook con su texto. Facebook la baja de `imagenUrl` (pública). Devuelve el id del posteo. */
  async function publicarFotoEnFacebook({ imagenUrl, mensaje }) {
    const p = await pagina();
    const j = await pedir(`${paginaId}/photos`, {
      metodo: 'POST', conToken: p.tokenPagina, params: { url: imagenUrl, message: mensaje, published: 'true' },
    });
    return { id: j.post_id ?? j.id };
  }

  /** Una foto en el feed de Instagram. `imagenUrl` tiene que ser pública y JPEG: Instagram la descarga desde ahí. */
  async function publicarFotoEnInstagram({ imagenUrl, pie }) {
    const p = await pagina();
    if (!p.instagramId) throw new ErrorMeta('La página no tiene un Instagram vinculado.');

    const contenedor = await pedir(`${p.instagramId}/media`, { metodo: 'POST', conToken: p.tokenPagina, params: { image_url: imagenUrl, caption: pie } });

    // Las fotos casi siempre están listas al instante, pero Meta no lo garantiza: se pregunta unas veces antes de rendirse.
    for (let i = 0; i < 10; i += 1) {
      const estado = await pedir(contenedor.id, { conToken: p.tokenPagina, params: { fields: 'status_code' } });
      if (estado.status_code === 'FINISHED' || estado.status_code === undefined) break;
      if (estado.status_code === 'ERROR' || estado.status_code === 'EXPIRED') throw new ErrorMeta(`Instagram rechazó la imagen (${estado.status_code}).`);
      await esperar(2000);
    }

    const j = await pedir(`${p.instagramId}/media_publish`, { metodo: 'POST', conToken: p.tokenPagina, params: { creation_id: contenedor.id } });
    return { id: j.id };
  }

  /** Lo último publicado en la página (texto y hora), para comprobar si algo ya salió antes de darlo por fallado. */
  async function publicacionesRecientesDeFacebook({ limite = 15 } = {}) {
    const p = await pagina();
    const j = await pedir(`${paginaId}/published_posts`, { conToken: p.tokenPagina, params: { fields: 'id,message,created_time', limit: limite } });
    return (Array.isArray(j?.data) ? j.data : []).map((x) => ({ id: x.id, texto: x.message ?? '', cuando: x.created_time }));
  }

  /** Lo último publicado en el feed de Instagram (texto y hora). */
  async function publicacionesRecientesDeInstagram({ limite = 15 } = {}) {
    const p = await pagina();
    if (!p.instagramId) return [];
    const j = await pedir(`${p.instagramId}/media`, { conToken: p.tokenPagina, params: { fields: 'id,caption,timestamp', limit: limite } });
    return (Array.isArray(j?.data) ? j.data : []).map((x) => ({ id: x.id, texto: x.caption ?? '', cuando: x.timestamp }));
  }

  /** Un chequeo sin efectos: sirve para saber si el acceso quedó bien. */
  async function verificar() {
    const p = await pagina();
    return { pagina: p.nombre, enlace: p.enlace, instagram: p.instagramUsuario, instagramId: p.instagramId };
  }

  return { pedir, pagina, publicarFotoEnFacebook, publicarFotoEnInstagram, publicacionesRecientesDeFacebook, publicacionesRecientesDeInstagram, verificar };
}
