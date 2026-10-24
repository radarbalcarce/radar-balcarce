// La puerta del panel del celular a la nube (24/10/2026, regla 317; PENDIENTES.md C6 y C8). El panel no tiene servidor propio: hasta ahora hablaba sólo con GitHub.
// Con el motor y las tareas en Cloudflare, dos cosas ya no se pueden hacer desde GitHub, y este archivo las hace desde el Worker del reloj (que ya tiene el
// depósito R2 del motor, la dirección secreta de Workers Builds y la contraseña de los Workers):
//
//   GET  /panel/estado   cómo viene el motor (su última vuelta, si hay una en marcha) y si la PAUSA GENERAL está prendida. Alimenta la pestaña Hoy.
//   POST /panel/pausa    { pausar: true, motivo?, nombre? } prende la pausa general; { pausar: false, nombre? } la apaga. Un toque en cada sentido.
//   POST /panel/vuelta   { nombre? } pide UNA vuelta del motor ahora («Actualizar la web ahora»): el deploy hook de Workers Builds, sin que el secreto pase por el navegador.
//
// CÓMO SE AUTENTICA (nada nuevo que guardar ni que pegar): el panel manda la MISMA llave de GitHub con la que ya trabaja (`Authorization: Bearer …`); el Worker le pregunta
// a GitHub si esa llave puede escribir en el repositorio (lo mismo que mira el panel al entrar) y recién entonces obedece. Quien no es colaborador con permiso de escritura
// no puede pausar ni pedir vueltas. Para el caso en que GitHub no conteste, y para el procedimiento a mano (docs/11-OPERACION.md), vale también la contraseña de los Workers
// (`x-token`, VIGILANTE_TOKEN), que nunca viaja en el navegador. Los navegadores sólo pueden llamar desde el sitio y el panel (CORS); el resto da igual: sin llave no pasa nada.
//
// Sin dependencias.

import { despertarMotor } from './nube.mjs';
import {
  leerPausa, lectorDeBinding, escritorDeBinding, guardarPausa, pausar, reanudar, textoDeLaPausa, vistaPublica,
} from '../compartido/pausa.mjs';

export const REPOSITORIO = 'radarbalcarce/radar-balcarce';
/** Los únicos sitios que un navegador puede usar para llamar a esta puerta. */
export const ORIGENES_DEL_PANEL = ['https://radarbalcarce.com', 'https://www.radarbalcarce.com', 'https://radar-balcarce.pages.dev'];
/** Entre dos «Actualizar la web ahora» tienen que pasar al menos tantos minutos (un doble toque o un dedo nervioso no pide dos vueltas). */
export const MINUTOS_ENTRE_VUELTAS_PEDIDAS = 3;
export const CLAVE_DEL_ULTIMO_PEDIDO = 'panel/ultima-vuelta-pedida.json';
/** Cuánto vale el candado de la vuelta (igual a MINUTOS_DE_VIGENCIA_DEL_CANDADO de infra/motor-cloudflare/estado-r2.mjs; una prueba controla que digan lo mismo: acá no se importa porque usa node:fs). */
export const MINUTOS_DEL_CANDADO = 25;
const LARGO_MAXIMO_DEL_PEDIDO = 4000;

/** Compara dos textos sin que el tiempo delate cuántas letras coinciden. */
export function mismoToken(a, b) {
  const x = String(a ?? ''); const y = String(b ?? '');
  if (!x || !y || x.length !== y.length) return false;
  let r = 0;
  for (let i = 0; i < x.length; i++) r |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return r === 0;
}

/** Los encabezados CORS para un origen: sólo el sitio y el panel. */
export function cabecerasCors(origen) {
  if (!ORIGENES_DEL_PANEL.includes(origen)) return { vary: 'Origin' };
  return {
    'access-control-allow-origin': origen,
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-max-age': '600',
    vary: 'Origin',
  };
}

const responder = (cuerpo, estado, origen) => new Response(JSON.stringify(cuerpo), {
  status: estado, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cabecerasCors(origen) },
});

/**
 * ¿Quién llama? Devuelve { ok: true, login, via } o { ok: false, estado, error }.
 *   · `x-token` igual a VIGILANTE_TOKEN: la contraseña de los Workers (procedimiento a mano);
 *   · `Authorization: Bearer <llave de GitHub>`: sólo si esa llave puede escribir en el repositorio.
 */
export async function quienLlama(request, env, { fetchFn = fetch } = {}) {
  const contrasena = request.headers.get('x-token');
  if (contrasena) {
    return mismoToken(contrasena, env.VIGILANTE_TOKEN) ? { ok: true, login: null, via: 'contraseña' } : { ok: false, estado: 401, error: 'La contraseña no es la correcta.' };
  }
  const m = String(request.headers.get('authorization') ?? '').match(/^Bearer\s+(\S{10,300})$/i);
  if (!m) return { ok: false, estado: 401, error: 'Falta la llave de GitHub.' };
  const cabeceras = {
    authorization: `Bearer ${m[1]}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'radar-balcarce-reloj',
  };
  let repo;
  try {
    const r = await fetchFn(`https://api.github.com/repos/${REPOSITORIO}`, { headers: cabeceras });
    if (r.status === 401) return { ok: false, estado: 401, error: 'La llave de GitHub no anda (venció o la borraron).' };
    if (!r.ok) return { ok: false, estado: 403, error: 'Esa llave no llega al repositorio.' };
    repo = await r.json();
  } catch { return { ok: false, estado: 502, error: 'GitHub no contestó: no se pudo comprobar la llave. Probá de nuevo en un minuto.' }; }
  if (!repo?.permissions?.push) return { ok: false, estado: 403, error: 'Esa llave no puede escribir en el repositorio: no alcanza para esto.' };
  let login = null;
  try {
    const u = await fetchFn('https://api.github.com/user', { headers: cabeceras });
    if (u.ok) login = String((await u.json())?.login ?? '').slice(0, 40) || null;
  } catch { /* sin el nombre de usuario se usa el que mande el panel */ }
  return { ok: true, login, via: 'GitHub' };
}

async function leerJson(deposito, clave) {
  try { const o = await deposito.get(clave); return o ? JSON.parse(await o.text()) : null; } catch { return null; }
}

/** Cómo viene el motor, para el panel: su última vuelta, las últimas, y si hay una en marcha (el candado de la vuelta). */
export async function estadoDelMotorParaElPanel(deposito, ahora = new Date()) {
  if (!deposito) return null;
  const [estado, candado, pedido] = await Promise.all([leerJson(deposito, 'motor/estado.json'), leerJson(deposito, 'motor/candado.json'), leerJson(deposito, CLAVE_DEL_ULTIMO_PEDIDO)]);
  const minutosDelCandado = candado?.desde ? (ahora.getTime() - Date.parse(candado.desde)) / 60000 : null;
  return {
    ultima: estado ? { cuando: estado.cuando ?? null, ok: estado.ok !== false, segundos: estado.segundos ?? null, motivo: estado.motivo ?? null } : null,
    ultimaBuena: estado?.ultimaBuena ?? null,
    recientes: (Array.isArray(estado?.historial) ? estado.historial : []).slice(-6).map((v) => ({ cuando: v.cuando, ok: v.ok !== false, segundos: v.segundos ?? null })),
    enMarcha: Number.isFinite(minutosDelCandado) && minutosDelCandado >= 0 && minutosDelCandado < MINUTOS_DEL_CANDADO ? { desde: candado.desde } : null,
    ultimoPedidoDelPanel: pedido?.cuando ? { cuando: pedido.cuando, por: pedido.por ?? null } : null,
  };
}

/** El texto de un pedido que llega como JSON; lo roto o grande es un pedido vacío. */
async function cuerpoDe(request) {
  try {
    const texto = await request.text();
    if (texto.length > LARGO_MAXIMO_DEL_PEDIDO) return {};
    const j = JSON.parse(texto || '{}');
    return j && typeof j === 'object' && !Array.isArray(j) ? j : {};
  } catch { return {}; }
}

/** Atiende /panel/*. `deps` ({ fetchFn, ahora, despertar }) permite probarlo sin red. */
export async function atenderPanel(request, env, deps = {}) {
  const origen = request.headers.get('origin') ?? '';
  const ahora = deps.ahora ?? new Date();
  const fetchFn = deps.fetchFn ?? fetch;
  const despertar = deps.despertar ?? despertarMotor;
  const url = new URL(request.url);
  const ruta = url.pathname.replace(/\/+$/, '');

  if (request.method === 'OPTIONS') {
    return ORIGENES_DEL_PANEL.includes(origen) ? new Response(null, { status: 204, headers: cabecerasCors(origen) }) : new Response(null, { status: 403 });
  }
  if (!['/panel/estado', '/panel/pausa', '/panel/vuelta'].includes(ruta)) return responder({ ok: false, error: 'no existe' }, 404, origen);
  const esperado = ruta === '/panel/estado' ? 'GET' : 'POST';
  if (request.method !== esperado) return responder({ ok: false, error: `Usá ${esperado}.` }, 405, origen);

  const quien = await quienLlama(request, env, { fetchFn });
  if (!quien.ok) return responder({ ok: false, error: quien.error }, quien.estado, origen);
  if (!env.MOTOR) return responder({ ok: false, error: 'Falta el depósito del motor (binding MOTOR): el reloj se subió sin las partes de la nube.' }, 500, origen);
  const leer = lectorDeBinding(env.MOTOR);
  const escribir = escritorDeBinding(env.MOTOR);

  if (ruta === '/panel/estado') {
    const [pausa, motor] = await Promise.all([leerPausa(leer), estadoDelMotorParaElPanel(env.MOTOR, ahora)]);
    return responder({ ok: true, ahora: ahora.toISOString(), pausa: vistaPublica(pausa), pausaLecturaFallida: pausa.lecturaFallida === true, motor }, 200, origen);
  }

  const pedido = await cuerpoDe(request);
  const nombre = String(pedido.nombre ?? '').replace(/\s+/g, ' ').trim().slice(0, 40) || quien.login || 'alguien';

  if (ruta === '/panel/pausa') {
    if (typeof pedido.pausar !== 'boolean') return responder({ ok: false, error: 'Falta decir si se pausa (pausar: true) o se reanuda (pausar: false).' }, 400, origen);
    const actual = await leerPausa(leer);
    // Si el depósito no se pudo leer no se escribe a ciegas: se pisaría un historial que no vimos.
    if (actual.lecturaFallida) return responder({ ok: false, error: 'No se pudo leer el estado de la pausa (el depósito del motor no contestó). No se cambió nada: probá de nuevo.' }, 502, origen);
    const { estado, yaEstaba } = pedido.pausar
      ? pausar(actual, { por: nombre, login: quien.login, motivo: pedido.motivo, ahora })
      : reanudar(actual, { por: nombre, ahora });
    if (!yaEstaba) {
      try { await guardarPausa(escribir, estado); } catch { return responder({ ok: false, error: 'No se pudo guardar la pausa en el depósito del motor. No se cambió nada.' }, 502, origen); }
    }
    console.log(JSON.stringify({ panel: 'pausa', pausar: pedido.pausar, por: nombre, yaEstaba, via: quien.via }));
    return responder({ ok: true, yaEstaba, pausa: vistaPublica(estado), texto: textoDeLaPausa(estado, ahora) }, 200, origen);
  }

  // /panel/vuelta
  const pausa = await leerPausa(leer);
  if (pausa.pausada) {
    return responder({ ok: false, enPausa: true, error: `${textoDeLaPausa(pausa, ahora)}. Reanudá la pausa general antes de pedir una vuelta.` }, 409, origen);
  }
  const ultimo = await leerJson(env.MOTOR, CLAVE_DEL_ULTIMO_PEDIDO);
  const hace = ultimo?.cuando ? (ahora.getTime() - Date.parse(ultimo.cuando)) / 60000 : null;
  if (Number.isFinite(hace) && hace >= 0 && hace < MINUTOS_ENTRE_VUELTAS_PEDIDAS) {
    return responder({ ok: false, repetido: true, error: `Ya se pidió una vuelta hace ${Math.max(1, Math.round(hace))} min. Esperá un poco: tarda unos minutos.` }, 429, origen);
  }
  let r;
  try { r = await despertar(env, { fetchFn, ahora, sinPresupuesto: true }); } catch (e) { r = { ok: false, estado: 0, motivo: String(e?.message ?? e).slice(0, 160) }; }
  if (!r.ok) return responder({ ok: false, error: `Workers Builds no aceptó el pedido${r.motivo ? ` (${r.motivo})` : r.estado ? ` (HTTP ${r.estado})` : ''}.` }, 502, origen);
  try { await escribir(CLAVE_DEL_ULTIMO_PEDIDO, JSON.stringify({ cuando: ahora.toISOString(), por: nombre })); } catch { /* el pedido salió igual: sólo no queda anotado */ }
  console.log(JSON.stringify({ panel: 'vuelta', por: nombre, via: quien.via }));
  return responder({ ok: true, pedida: true, texto: 'Vuelta pedida. Tarda unos 8 minutos en estar en la web.' }, 200, origen);
}
