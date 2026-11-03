// Radar 3.0, las redes (etapa D, primera parte: los posteos de notas en Facebook y su espejo en Instagram). La lógica del Worker `radar-redes`
// (worker.mjs la arma con las dependencias de verdad). Todo se inyecta (fetch, reloj, cliente de Meta) para poder probarlo sin red.
//
//   Cron: cada 15 minutos de 8 a 22 de Balcarce una vuelta (elegir una nota y publicarla); a las 22:05 el resumen del día por Telegram.
//   REDES_ACTIVAS = «no» (por defecto): simula. Elige, arma el texto, lo anota en `publicaciones` con simulado = 1 y NO llama a Meta.
//   Secretos: META_TOKEN (para publicar de verdad) y TELEGRAM_TOKEN (para avisar). Binding DB (D1) y TELEGRAM (service binding a radar-telegram).

import { elegirParaFacebook, elegirEspejo, diaDeBalcarce, minutoDelDia, rangoDelDia } from './elegir.mjs';
import { textoFacebook, textoInstagram, SITIO } from './texto.mjs';
import { publicarEnFacebook } from './facebook/publicar.mjs';
import { publicarEnInstagram } from './instagram/publicar.mjs';
import { crearCliente, ErrorMeta, PAGINA_DE_FACEBOOK, sinToken } from './meta.mjs';
import * as db from './db.mjs';
import * as dbp from './piezas-db.mjs';
import { planear, registrarResultado, lineasDeLasPiezas } from './piezas-plan.mjs';

/** El cron del resumen del día: 01:05 UTC = 22:05 de Balcarce. Cualquier otro cron es una vuelta. */
export const CRON_DEL_RESUMEN = '5 1 * * *';

/** Dónde vive el bot (el mismo de v3/redaccion/telegram/worker.mjs; una prueba controla que digan lo mismo). */
export const DIRECCION_TELEGRAM = 'https://radar-telegram.radarbalcarce.workers.dev';

/** La contraseña entre Workers, derivada del token del bot (igual que contrasenaDelWebhook del bot; una prueba lo controla). */
export async function contrasenaDelWebhook(token) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`radar-telegram:${token}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

const json = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

/** REDES_ACTIVAS: sólo «si» (o «sí») prende las redes de verdad. Cualquier otra cosa, o nada, simula. */
export const redesActivas = (env) => /^s[ií]$/i.test(String(env?.REDES_ACTIVAS ?? '').trim());
const espejoActivo = (env) => !/^no$/i.test(String(env?.INSTAGRAM_ESPEJO ?? 'si').trim());

const primeraLinea = (t) => String(t ?? '').split('\n')[0].trim();
const hora = (iso) => {
  const d = new Date(new Date(iso).getTime() - 3 * 3600 * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

/** Manda textos al dueño por el bot (POST /decir). Devuelve true si salieron. Sin token no hace nada. */
export async function decirPorTelegram(env, textos, fetchFn = fetch) {
  if (!env.TELEGRAM_TOKEN) return false;
  const lista = (Array.isArray(textos) ? textos : [textos]).filter((t) => typeof t === 'string' && t.trim());
  if (!lista.length) return true;
  try {
    // Con el enlace directo entre Workers (service binding TELEGRAM) si está; si no, por la dirección pública (pruebas).
    const llamar = env.TELEGRAM?.fetch ? (u, o) => env.TELEGRAM.fetch(u, o) : fetchFn;
    const r = await llamar(`${DIRECCION_TELEGRAM}/decir`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-radar-contrasena': await contrasenaDelWebhook(env.TELEGRAM_TOKEN) },
      body: JSON.stringify({ textos: lista }),
    });
    return !!r.ok;
  } catch {
    return false;
  }
}

/** El texto del error para guardarlo: con el código de Meta entre corchetes y sin el token. */
function textoDeError(e, env) {
  const base = sinToken(e?.message ?? String(e), env.META_TOKEN);
  return (e instanceof ErrorMeta && e.codigo ? `[${e.codigo}] ${base}` : base).slice(0, 500);
}

/**
 * @param {object} [deps]
 * @param {Function} [deps.fetchFn]
 * @param {() => Date} [deps.ahora]
 * @param {(env) => object} [deps.clienteMeta]  por defecto crearCliente con META_TOKEN
 */
export function crearRedes(deps = {}) {
  const fetchFn = deps.fetchFn ?? fetch;
  const reloj = deps.ahora ?? (() => new Date());
  const clienteMeta = deps.clienteMeta ?? ((env) => crearCliente({ token: env.META_TOKEN, paginaId: env.PAGINA_DE_FACEBOOK || PAGINA_DE_FACEBOOK, fetchFn }));
  const sitioDe = (env) => env.SITIO || SITIO;

  /** Anota y publica (o simula) una nota en una red. Devuelve lo que pasó. */
  async function publicarUna(env, { red, nota, tipo, simulado, ahora, hechas }) {
    const sitio = sitioDe(env);
    const texto = red === 'facebook' ? textoFacebook(nota, sitio) : textoInstagram(nota, sitio);
    const id = await db.anotarIntento(env, {
      red, notaId: nota.id, seccion: nota.seccion, tipo, cuando: ahora.toISOString(), dia: diaDeBalcarce(ahora), estado: simulado ? 'simulado' : 'enviando', simulado, texto,
    });
    const base = { red, notaId: nota.id, titulo: nota.titulo, tipo, texto };
    if (!id) return { ...base, omitida: 'ya-estaba-anotada' };
    if (simulado) return { ...base, simulado: true };
    try {
      const cliente = clienteMeta(env);
      const publicar = red === 'facebook' ? publicarEnFacebook : publicarEnInstagram;
      const r = await publicar({ cliente, nota, sitio });
      await db.cerrarIntento(env, id, { estado: 'ok', idMeta: r.id });
      return { ...base, ok: true, idMeta: r.id };
    } catch (e) {
      const error = textoDeError(e, env);
      await db.cerrarIntento(env, id, { estado: 'error', error });
      // Un token muerto se avisa una sola vez por día: todo lo demás se ve en el resumen.
      if (e instanceof ErrorMeta && e.tokenMuerto && !hechas.some((h) => h.estado === 'error' && /^\[190\]/.test(h.error ?? ''))) {
        await decirPorTelegram(env, 'Las redes no pueden publicar: el token de Meta (META_TOKEN) venció o lo revocaron. Hay que cargar uno nuevo en GitHub Secrets y volver a subir «redes».', fetchFn);
      }
      return { ...base, error };
    }
  }

  /** Una vuelta: a lo sumo un posteo de Facebook y un espejo de Instagram. */
  async function vuelta(env, { ahora = reloj() } = {}) {
    const simulado = !redesActivas(env);
    const dia = diaDeBalcarce(ahora);
    const notas = await db.notasParaRedes(env, { desdeISO: new Date(ahora.getTime() - 24 * 3600 * 1000).toISOString(), conBorradores: simulado });
    let hechas = await db.publicacionesDelDia(env, dia, simulado);
    const resultado = { simulado, dia, notasMiradas: notas.length, facebook: null, instagram: null, motivo: null };

    const dec = elegirParaFacebook({ notas, hechas, ahora });
    if (dec.nota) {
      resultado.facebook = await publicarUna(env, { red: 'facebook', nota: dec.nota, tipo: dec.tipo, simulado, ahora, hechas });
      hechas = await db.publicacionesDelDia(env, dia, simulado);
    } else {
      resultado.motivo = dec.motivo;
      resultado.descartes = dec.descartes ?? null;
    }

    if (espejoActivo(env)) {
      const esp = elegirEspejo({ notas, hechas, ahora });
      if (esp.nota) resultado.instagram = await publicarUna(env, { red: 'instagram', nota: esp.nota, tipo: esp.tipo, simulado, ahora, hechas });
    }
    return resultado;
  }

  /** El resumen del día por Telegram: qué se publicó (o qué se habría publicado) y qué falló. */
  async function resumen(env, { ahora = reloj() } = {}) {
    const simulado = !redesActivas(env);
    const dia = diaDeBalcarce(ahora);
    const filas = await db.publicacionesDelDia(env, dia, simulado);
    const buenas = filas.filter((h) => h.estado === 'ok' || h.estado === 'simulado' || h.estado === 'enviando');
    const errores = filas.filter((h) => h.estado === 'error');
    const fb = buenas.filter((h) => h.red === 'facebook');
    const ig = buenas.filter((h) => h.red === 'instagram');

    const lineas = [];
    lineas.push(simulado
      ? `Redes de hoy (SIMULADAS, REDES_ACTIVAS está en «no»): habría publicado ${fb.length} posteos en Facebook y ${ig.length} en Instagram.`
      : `Redes de hoy: ${fb.length} posteos en Facebook y ${ig.length} en Instagram.`);
    for (const h of fb) lineas.push(`• ${hora(h.cuando)} · Facebook · ${h.tipo === 'local' ? 'Balcarce' : 'país'} · ${primeraLinea(h.texto)}`);
    for (const h of ig) lineas.push(`• ${hora(h.cuando)} · Instagram · ${primeraLinea(h.texto)}`);
    if (errores.length) {
      lineas.push(`Fallaron ${errores.length} intentos:`);
      for (const h of errores.slice(0, 5)) lineas.push(`• ${hora(h.cuando)} · ${h.red} · ${h.error ?? 'sin detalle'}`);
    }
    const piezas = await dbp.piezasDelDia(env, dia, simulado).catch(() => []);
    lineas.push(...lineasDeLasPiezas(piezas, simulado));
    if (!fb.length && !ig.length && !errores.length && !piezas.length) lineas.push('No hubo nada que publicar (ninguna nota con foto, sin tono triste, de Balcarce o muy contada).');
    const salio = await decirPorTelegram(env, lineas.join('\n'), fetchFn);
    return { dia, simulado, facebook: fb.length, instagram: ig.length, errores: errores.length, avisado: salio, lineas };
  }

  async function autorizado(pedido, env) {
    if (!env.TELEGRAM_TOKEN) return json({ error: 'sin token' }, 503);
    const esperada = await contrasenaDelWebhook(env.TELEGRAM_TOKEN);
    const recibida = pedido.headers.get('x-radar-contrasena') ?? '';
    let dif = esperada.length ^ recibida.length;
    for (let i = 0; i < esperada.length; i += 1) dif |= esperada.charCodeAt(i) ^ (recibida.charCodeAt(i) || 0);
    return dif === 0 ? null : json({ error: 'no' }, 403);
  }

  /** GET /salud (abierto) · POST /vuelta y POST /resumen (piden x-radar-contrasena; en simulación aceptan {"ahora": ISO} para ensayar a otra hora). */
  async function manejar(pedido, env) {
    const url = new URL(pedido.url);
    if (pedido.method === 'GET' && url.pathname === '/salud') {
      const ahora = reloj();
      const ultima = await db.ultimaPublicacion(env).catch(() => null);
      return json({
        ok: true, activas: redesActivas(env), espejoEnInstagram: espejoActivo(env), ahora: ahora.toISOString(), dia: diaDeBalcarce(ahora), minutoDelDia: minutoDelDia(ahora),
        ultima, claves: { meta: !!env.META_TOKEN, telegram: !!env.TELEGRAM_TOKEN },
      });
    }
    if (pedido.method === 'POST' && (url.pathname === '/vuelta' || url.pathname === '/resumen')) {
      const no = await autorizado(pedido, env);
      if (no) return no;
      let cuerpo = {};
      try { cuerpo = await pedido.json(); } catch { /* sin cuerpo */ }
      const opciones = {};
      if (cuerpo?.ahora && !redesActivas(env)) {
        const d = new Date(cuerpo.ahora);
        if (!Number.isNaN(d.getTime())) opciones.ahora = d;
      }
      return json(url.pathname === '/vuelta' ? await vuelta(env, opciones) : await resumen(env, opciones));
    }
    // Las piezas de video: el programa de GitHub Actions (v3/redes/piezas/correr.mjs) pide el plan, arma las piezas con la voz y cuenta cómo salió. Mismo candado que /vuelta.
    if (pedido.method === 'POST' && (url.pathname === '/piezas/plan' || url.pathname === '/piezas/resultado')) {
      const no = await autorizado(pedido, env);
      if (no) return no;
      let cuerpo = {};
      try { cuerpo = await pedido.json(); } catch { /* sin cuerpo */ }
      if (url.pathname === '/piezas/resultado') {
        const r = await registrarResultado(env, cuerpo, { ahora: reloj() });
        return json(r, r.error ? 400 : 200);
      }
      const simulado = !redesActivas(env);
      const opciones = { simulado };
      if (cuerpo?.ahora && simulado) { const d = new Date(cuerpo.ahora); if (!Number.isNaN(d.getTime())) opciones.ahora = d; }
      if (!opciones.ahora) opciones.ahora = reloj();
      if (Array.isArray(cuerpo?.solo) && cuerpo.solo.length && simulado) opciones.solo = cuerpo.solo.map(String);
      return json({ activas: !simulado, ...(await planear(env, opciones)) });
    }
    if (pedido.method === 'GET' && url.pathname === '/piezas/estado') {
      const no = await autorizado(pedido, env);
      if (no) return no;
      const ahora = reloj();
      const dia = url.searchParams.get('dia') || diaDeBalcarce(ahora);
      return json({ dia, simulado: !redesActivas(env), piezas: await dbp.piezasDelDia(env, dia, !redesActivas(env)) });
    }
    return json({ error: 'no encontrado' }, 404);
  }

  async function programado(evento, env) {
    if (evento?.cron === CRON_DEL_RESUMEN) return resumen(env);
    return vuelta(env);
  }

  return { vuelta, resumen, manejar, programado, publicarUna };
}

export { rangoDelDia };
