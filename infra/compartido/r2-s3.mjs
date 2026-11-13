// Hablar con R2 por su API de S3, sin dependencias (18/10/2026, mudanza a Cloudflare: docs/etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md).
//
// Sirve para dos cosas que un Worker o un script de Node necesitan y que `wrangler` no da:
//   1. Leer y escribir objetos de R2 desde un script que corre FUERA de Cloudflare Workers (la vuelta del motor dentro de Workers Builds,
//      el trabajo de armar pedidos de video en GitHub Actions): `clienteR2`.
//   2. Armar direcciones temporales firmadas (`urlFirmada`) para que un tercero SIN SECRETOS —el repositorio público de render— baje el pedido
//      y suba el video, sin que nunca vea una clave. La dirección vale pocos minutos y sólo sirve para ese objeto y ese verbo (GET o PUT).
//
// Usa sólo `fetch` y `crypto.subtle`, que existen igual en Node 24 y en Workers: el mismo archivo corre en los dos lados.
// La firma es AWS Signature Version 4 (la que acepta R2: región "auto", servicio "s3"). Las claves (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`)
// se crean en Cloudflare → R2 → "Manage API tokens", las pega una persona, y NUNCA se imprimen ni van en una dirección firmada (sólo la
// firma, que no permite recuperarlas).

const codificador = new TextEncoder();

const aHex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** SHA-256 en hexadecimal de un texto o de bytes. */
export async function sha256Hex(datos) {
  const bytes = typeof datos === 'string' ? codificador.encode(datos) : datos;
  return aHex(await crypto.subtle.digest('SHA-256', bytes));
}

async function hmac(clave, datos) {
  const k = await crypto.subtle.importKey('raw', typeof clave === 'string' ? codificador.encode(clave) : clave, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, typeof datos === 'string' ? codificador.encode(datos) : datos));
}

/** La clave de firma de un día, región y servicio (la cadena de HMAC de SigV4). */
export async function claveDeFirma(secreto, dia, region = 'auto', servicio = 's3') {
  const fecha = await hmac(`AWS4${secreto}`, dia);
  const reg = await hmac(fecha, region);
  const serv = await hmac(reg, servicio);
  return hmac(serv, 'aws4_request');
}

/** Codifica un pedazo como lo pide SigV4: todo menos letras, números y `-_.~` (y, en una ruta, la barra). */
export function codificar(texto, { barra = false } = {}) {
  const c = encodeURIComponent(String(texto)).replace(/[!'()*]/g, (x) => `%${x.charCodeAt(0).toString(16).toUpperCase()}`);
  return barra ? c.replace(/%2F/g, '/') : c;
}

/** "20261018T123456Z" y "20261018" de un instante. */
export function marcaDeTiempo(fecha = new Date()) {
  const iso = new Date(fecha).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return { amz: iso, dia: iso.slice(0, 8) };
}

const consultaCanonica = (consulta) => Object.keys(consulta).sort()
  .map((k) => `${codificar(k)}=${codificar(consulta[k])}`).join('&');

/**
 * Firma un pedido con encabezados (el modo normal). Devuelve los encabezados a mandar, con `authorization`.
 * `ruta` ya es la ruta completa (`/bucket/clave`, sin codificar); `consulta` es un objeto.
 */
export async function firmarPedido({
  metodo = 'GET', host, ruta, consulta = {}, cabeceras = {}, hashDelCuerpo, accessKey, secretKey, region = 'auto', servicio = 's3', fecha = new Date(),
}) {
  const { amz, dia } = marcaDeTiempo(fecha);
  const hash = hashDelCuerpo ?? await sha256Hex('');
  const todas = {
    ...Object.fromEntries(Object.entries(cabeceras).map(([k, v]) => [k.toLowerCase(), String(v).trim()])),
    host, 'x-amz-content-sha256': hash, 'x-amz-date': amz,
  };
  const nombres = Object.keys(todas).sort();
  const canonicas = nombres.map((n) => `${n}:${todas[n]}\n`).join('');
  const firmadas = nombres.join(';');
  const canonico = [metodo, codificar(ruta, { barra: true }), consultaCanonica(consulta), canonicas, firmadas, hash].join('\n');
  const alcance = `${dia}/${region}/${servicio}/aws4_request`;
  const aFirmar = ['AWS4-HMAC-SHA256', amz, alcance, await sha256Hex(canonico)].join('\n');
  const firma = aHex(await hmac(await claveDeFirma(secretKey, dia, region, servicio), aFirmar));
  return { ...todas, authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${alcance},SignedHeaders=${firmadas},Signature=${firma}` };
}

/**
 * Una dirección firmada que deja hacer UN verbo sobre UN objeto durante `expira` segundos (máximo 7 días; acá, 1 hora por defecto).
 * `host` y `ruta` son los del pedido (para R2: `<cuenta>.r2.cloudflarestorage.com` y `/bucket/clave`).
 */
export async function urlFirmada({
  metodo = 'GET', host, ruta, expira = 3600, accessKey, secretKey, region = 'auto', servicio = 's3', fecha = new Date(), esquema = 'https', consulta = {},
}) {
  const { amz, dia } = marcaDeTiempo(fecha);
  const alcance = `${dia}/${region}/${servicio}/aws4_request`;
  const parametros = {
    ...consulta,
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKey}/${alcance}`,
    'X-Amz-Date': amz,
    'X-Amz-Expires': String(Math.max(1, Math.min(604800, Math.round(expira)))),
    'X-Amz-SignedHeaders': 'host',
  };
  const canonico = [metodo, codificar(ruta, { barra: true }), consultaCanonica(parametros), `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const aFirmar = ['AWS4-HMAC-SHA256', amz, alcance, await sha256Hex(canonico)].join('\n');
  const firma = aHex(await hmac(await claveDeFirma(secretKey, dia, region, servicio), aFirmar));
  return `${esquema}://${host}${codificar(ruta, { barra: true })}?${consultaCanonica(parametros)}&X-Amz-Signature=${firma}`;
}

/** El anfitrión de R2 de una cuenta. */
export const anfitrionDeR2 = (cuenta) => `${cuenta}.r2.cloudflarestorage.com`;

/**
 * Un cliente mínimo de un depósito de R2. `fetchFn` se puede reemplazar para probarlo sin red.
 * Todas las llamadas devuelven algo simple y tiran un error claro (sin las claves) si R2 contesta mal.
 */
export function clienteR2({ cuenta, bucket, accessKey, secretKey, fetchFn = fetch, ahora = () => new Date() }) {
  if (!cuenta || !bucket || !accessKey || !secretKey) throw new Error('Faltan datos de R2 (cuenta, depósito, R2_ACCESS_KEY_ID o R2_SECRET_ACCESS_KEY).');
  const host = anfitrionDeR2(cuenta);
  const rutaDe = (clave) => `/${bucket}/${String(clave).replace(/^\/+/, '')}`;

  async function pedir({ metodo, clave = '', consulta = {}, cuerpo, tipo }) {
    const ruta = clave ? rutaDe(clave) : `/${bucket}`;
    const bytes = cuerpo === undefined ? undefined : (typeof cuerpo === 'string' ? codificador.encode(cuerpo) : cuerpo);
    const cabeceras = await firmarPedido({
      metodo, host, ruta, consulta, accessKey, secretKey, fecha: ahora(),
      hashDelCuerpo: bytes ? await sha256Hex(bytes) : undefined,
      cabeceras: tipo ? { 'content-type': tipo } : {},
    });
    const q = Object.keys(consulta).length ? `?${consultaCanonica(consulta)}` : '';
    const { host: _host, ...paraEnviar } = cabeceras; // `host` lo pone fetch solo
    return fetchFn(`https://${host}${codificar(ruta, { barra: true })}${q}`, { method: metodo, headers: paraEnviar, ...(bytes ? { body: bytes } : {}), signal: AbortSignal.timeout(120_000) });
  }

  const falla = async (r, que) => { throw new Error(`R2 ${que}: HTTP ${r.status} ${String(await r.text().catch(() => '')).slice(0, 160)}`); };

  return {
    host,
    /** Los bytes del objeto, o null si no existe. */
    async leer(clave) {
      const r = await pedir({ metodo: 'GET', clave });
      if (r.status === 404) return null;
      if (!r.ok) await falla(r, `leer ${clave}`);
      return new Uint8Array(await r.arrayBuffer());
    },
    async leerTexto(clave) {
      const b = await this.leer(clave);
      return b === null ? null : new TextDecoder().decode(b);
    },
    async guardar(clave, cuerpo, tipo = 'application/octet-stream') {
      const r = await pedir({ metodo: 'PUT', clave, cuerpo, tipo });
      if (!r.ok) await falla(r, `guardar ${clave}`);
      return true;
    },
    async existe(clave) {
      const r = await pedir({ metodo: 'HEAD', clave });
      if (r.status === 404) return false;
      if (!r.ok) await falla(r, `mirar ${clave}`);
      return true;
    },
    async borrar(clave) {
      const r = await pedir({ metodo: 'DELETE', clave });
      if (!r.ok && r.status !== 404) await falla(r, `borrar ${clave}`);
      return true;
    },
    /** Las claves que empiezan con `prefijo` (hasta 1.000 por página; sigue solo). */
    async listar(prefijo = '') {
      const claves = [];
      let seguir = null;
      do {
        const r = await pedir({ metodo: 'GET', consulta: { 'list-type': '2', prefix: prefijo, ...(seguir ? { 'continuation-token': seguir } : {}) } });
        if (!r.ok) await falla(r, `listar ${prefijo}`);
        const xml = await r.text();
        for (const m of xml.matchAll(/<Key>([^<]*)<\/Key>/g)) claves.push(m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
        seguir = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? (xml.match(/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/)?.[1] ?? null) : null;
      } while (seguir);
      return claves;
    },
    /** Una dirección firmada para que otro (sin claves) baje o suba UN objeto. */
    firmar(clave, { metodo = 'GET', expira = 3600 } = {}) {
      return urlFirmada({ metodo, host, ruta: rutaDe(clave), expira, accessKey, secretKey, fecha: ahora() });
    },
  };
}
