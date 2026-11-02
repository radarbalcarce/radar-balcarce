// El núcleo de Radar 3.0 armado: la vuelta de 15 minutos, el resumen diario y la puerta HTTP (REGLAS.md, CONTRATO.md).
// Acá no hay `import` de archivos .md ni .json: el punto de entrada (worker.mjs) los trae y se los pasa a `crearNucleo`, así esto se prueba
// con Node sin red (D1, Workers AI, Gemini y fetch se inyectan).
//
// Principio: avisa y sigue. El error de una fuente, de un artículo o de una historia se anota y no frena a las demás.
import { leerFuente } from './leer/leer.mjs';
import { crearHuella } from './agrupar/huella.mjs';
import { agrupar, textoParaDuda } from './agrupar/agrupar.mjs';
import { elegir } from './elegir/elegir.mjs';
import { crearGemini } from './redactar/gemini.mjs';
import { verificarYReescribir } from './redactar/verificar.mjs';
import { elegirFoto } from './fotos/fotos.mjs';
import * as db from './db/db.mjs';
import { DIRECCION, contrasenaDelWebhook } from '../redaccion/telegram/worker.mjs';

// ---------------------------------------------------------------------------------------------- constantes

const HORA = 3600 * 1000;
const UTC_MENOS_3 = 3 * HORA; // Balcarce: UTC-3 todo el año
const LEIDOS_RECIENTES_DIAS = 7; // los enlaces leídos en este plazo no se vuelven a bajar
const FUENTES_EN_PARALELO = 10;
const MAX_ARTICULOS_POR_VUELTA = 100; // tope de seguridad: D1 y subpedidos de una invocación son 1.000; lo que sobra se lee en la próxima vuelta
const ERRORES_SEGUIDOS_DE_HUELLA = 5; // si Workers AI no contesta 5 veces seguidas, se corta el agrupado de esta vuelta
const FALLOS_POR_HISTORIA = 3; // después de 3 vueltas fallando al redactar una historia, se la da por no redactable
const LARGO_DE_MENSAJE = 3500;
const HORAS_PARA_REDACTAR = 48; // una historia elegida que no se alcanzó a redactar en este plazo ya es vieja

// Precio estimado de Gemini 3.1 Flash-Lite, en US$ por millón de tokens. SE CONFIRMAN CON LA LISTA DE PRECIOS DE GOOGLE: si cambian, se
// cambian acá y sólo acá. Es una estimación para frenar a tiempo, no la factura.
export const PRECIO_ENTRADA_POR_MILLON = 0.10;
export const PRECIO_SALIDA_POR_MILLON = 0.40;
export const FRENO_MENSUAL_USD = 15;

export const costoEstimado = ({ tokensEntrada = 0, tokensSalida = 0 }) =>
  (tokensEntrada / 1e6) * PRECIO_ENTRADA_POR_MILLON + (tokensSalida / 1e6) * PRECIO_SALIDA_POR_MILLON;

// ---------------------------------------------------------------------------------------------- días

/** El «día de Balcarce» (AAAA-MM-DD) de un instante: UTC-3, siempre. */
export function diaDeBalcarce(fecha = new Date()) {
  return new Date(new Date(fecha).getTime() - UTC_MENOS_3).toISOString().slice(0, 10);
}

/** [desde, hasta) en ISO UTC del día de Balcarce `dia`: de las 03:00 UTC a las 03:00 UTC del día siguiente. */
export function rangoDelDia(dia) {
  const desde = new Date(`${dia}T00:00:00.000Z`).getTime() + UTC_MENOS_3;
  return { desde: new Date(desde).toISOString(), hasta: new Date(desde + 24 * HORA).toISOString() };
}

const numero = (v, defecto) => {
  const n = Number(v);
  return v !== undefined && v !== '' && Number.isFinite(n) && n >= 0 ? n : defecto;
};

const usd = (n) => `US$ ${n.toFixed(2).replace('.', ',')}`;

function idDeNota(azar = Math.random) {
  let s = '';
  while (s.length < 7) s += Math.floor(azar() * 36).toString(36);
  return s;
}

async function enParalelo(lista, cuantos, fn) {
  const resultados = new Array(lista.length);
  let siguiente = 0;
  const trabajadores = Array.from({ length: Math.min(cuantos, lista.length) }, async () => {
    while (siguiente < lista.length) {
      const i = siguiente++;
      resultados[i] = await fn(lista[i], i);
    }
  });
  await Promise.all(trabajadores);
  return resultados;
}

// ---------------------------------------------------------------------------------------------- Telegram

/** Manda textos al dueño por el bot (POST /decir). Devuelve true si salieron. Sin token no hace nada. */
export async function decirPorTelegram(env, textos, fetchFn) {
  if (!env.TELEGRAM_TOKEN) return false;
  const lista = (Array.isArray(textos) ? textos : [textos]).filter((t) => typeof t === 'string' && t.trim());
  if (!lista.length) return true;
  try {
    // Con el enlace directo entre Workers (service binding TELEGRAM) si está; si no, por la dirección pública (pruebas).
    const llamar = env.TELEGRAM?.fetch ? (u, o) => env.TELEGRAM.fetch(u, o) : fetchFn;
    const r = await llamar(`${DIRECCION}/decir`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-radar-contrasena': await contrasenaDelWebhook(env.TELEGRAM_TOKEN) },
      body: JSON.stringify({ textos: lista }),
    });
    return !!r.ok;
  } catch {
    return false;
  }
}

/** Parte líneas en mensajes de hasta `max` caracteres, sin cortar una línea (una línea más larga se corta a la fuerza). */
export function partirEnMensajes(lineas, max = LARGO_DE_MENSAJE) {
  const mensajes = [];
  let actual = '';
  for (let linea of lineas) {
    while (linea.length > max) {
      if (actual) { mensajes.push(actual); actual = ''; }
      mensajes.push(linea.slice(0, max));
      linea = linea.slice(max);
    }
    if (actual && actual.length + 1 + linea.length > max) { mensajes.push(actual); actual = ''; }
    actual = actual ? `${actual}\n${linea}` : linea;
  }
  if (actual) mensajes.push(actual);
  return mensajes;
}

// ---------------------------------------------------------------------------------------------- el núcleo

/**
 * recursos: { fuentes (las activas, ya validadas), perfil, redaccion, umbrales }
 * deps (todo opcional, para pruebas): { fetch, ahora (Date|ISO), azar }
 */
export function crearNucleo({ fuentes, perfil, redaccion, umbrales }) {
  const nombreDeFuente = new Map(fuentes.map((f) => [f.id, f.nombre]));

  const contexto = (env, deps = {}) => {
    const fetchFn = deps.fetch || ((...a) => globalThis.fetch(...a));
    const ahora = deps.ahora ? new Date(deps.ahora) : new Date();
    return { fetchFn, ahora, ahoraISO: ahora.toISOString(), dia: diaDeBalcarce(ahora), azar: deps.azar || Math.random };
  };

  // Un Gemini por tarea: cada pedido queda anotado en uso_ia con su tarea, y todos comparten el contador y el tope del día.
  async function prepararGemini(env, c) {
    const topeDiario = numero(env.NUCLEO_TOPE_DIARIO, 150);
    const hoy = await db.usoDelDia(env, c.dia);
    const estado = { pedidosHoy: hoy.reduce((s, f) => s + (f.pedidos || 0), 0), topeDiario, tope: false };
    const para = (tarea) => crearGemini({
      clave: env.GEMINI_API_KEY,
      modelo: env.GEMINI_MODELO || 'gemini-3.1-flash-lite',
      fetch: c.fetchFn,
      topeDiario,
      usoDeHoy: async () => estado.pedidosHoy,
      contarUso: async ({ entrada, salida }) => {
        estado.pedidosHoy += 1;
        await db.anotarUso(env, c.dia, tarea, entrada, salida);
      },
    });
    return { estado, para, hayClave: !!env.GEMINI_API_KEY };
  }

  // ------------------------------------------------------------------------------------------ la vuelta

  async function vuelta(env, deps = {}) {
    const c = contexto(env, deps);
    const r = {
      cuando: c.ahoraISO, fuentesLeidas: 0, fuentesConError: [], articulosNuevos: 0, articulosPospuestos: 0, historiasNuevas: 0, unidas: 0, dudas: 0,
      elegidas: 0, noSalen: {}, redactadas: 0, frenadasPorLey: 0, errores: [], sinClaveGemini: false, topeDiario: false, frenoMensual: false,
    };
    const error = (donde, e) => {
      const msg = `${donde}: ${String((e && e.message) || e).slice(0, 200)}`;
      r.errores.push(msg);
      console.error(msg);
    };

    const gem = await prepararGemini(env, c);
    r.sinClaveGemini = !gem.hayClave;

    // (a) leer todas las fuentes, de a 10, sin bajar lo que ya está guardado
    const recientes = await db.idsRecientes(env, new Date(c.ahora.getTime() - LEIDOS_RECIENTES_DIAS * 24 * HORA).toISOString());
    const conocidos = (ids) => new Set(ids.filter((i) => recientes.has(i)));
    const leidos = await enParalelo(fuentes, FUENTES_EN_PARALELO, async (f) => {
      const res = await leerFuente(f, { fetch: c.fetchFn, ahora: c.ahora, conocidos });
      try { await db.anotarFuente(env, f.id, !res.error, res.error, c.ahoraISO); } catch (e) { error(`anotar fuente ${f.id}`, e); }
      return { fuente: f, ...res };
    });
    const porId = new Map();
    const viejos = new Map();
    for (const l of leidos) {
      if (l.error) r.fuentesConError.push(`${l.fuente.id}: ${l.error}`); else r.fuentesLeidas += 1;
      for (const a of l.articulos || []) if (!recientes.has(a.id) && !porId.has(a.id)) porId.set(a.id, a);
      for (const a of l.viejos || []) if (!recientes.has(a.id)) viejos.set(a.id, a);
    }
    if (viejos.size) {
      try { await db.guardarArticulos(env, [...viejos.values()]); } catch (e) { error('guardar páginas viejas', e); }
    }
    // los más viejos primero (la historia nace con la fecha del primero); lo que pasa del tope queda para la próxima vuelta
    const todos = [...porId.values()].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const nuevos = todos.slice(0, MAX_ARTICULOS_POR_VUELTA);
    r.articulosPospuestos = todos.length - nuevos.length;

    // (b) agrupar contra las historias vivas (cargadas una vez; se actualizan en memoria)
    const vivas = (await db.historiasVivas(env, new Date(c.ahora.getTime() - umbrales.horasVivas * HORA).toISOString())).filter((h) => h.huella);
    const huellaDe = crearHuella(env.AI);
    const dudaGemini = gem.hayClave ? gem.para('duda') : null;
    const preguntarMismoHecho = async (articulo, historia) => {
      if (!dudaGemini) return false;
      try {
        const respuesta = await dudaGemini.texto(textoParaDuda(articulo, historia));
        return /^\s*s[ií]\b/i.test(String(respuesta));
      } catch (e) {
        if (e.message === 'tope-diario') r.topeDiario = true; else error('pregunta de duda', e);
        return false; // ante la duda, historia aparte
      }
    };
    const historiaPorId = new Map(vivas.map((h) => [h.id, h]));
    const tocadas = new Map();
    const guardables = [];
    let seguidos = 0;
    for (const a of nuevos) {
      let res;
      try {
        res = await agrupar(a, [...historiaPorId.values()], { huellaDe, preguntarMismoHecho, umbrales, ahora: c.ahora, azar: c.azar });
        seguidos = 0;
      } catch (e) {
        error(`agrupar ${a.id}`, e);
        if (++seguidos >= ERRORES_SEGUIDOS_DE_HUELLA) { error('agrupar', new Error('Workers AI no contesta; se corta el agrupado de esta vuelta')); break; }
        continue; // no se guarda: se vuelve a leer en la próxima vuelta
      }
      a.historiaId = res.historia.id;
      guardables.push(a);
      historiaPorId.set(res.historia.id, res.historia);
      tocadas.set(res.historia.id, res.historia);
      if (res.nueva) r.historiasNuevas += 1; else r.unidas += 1;
      if (res.duda) {
        r.dudas += 1;
        try { await db.anotarDuda(env, a.id, res.duda.historiaId, res.duda.respuesta, c.ahoraISO); } catch (e) { error('anotar duda', e); }
      }
    }
    r.articulosNuevos = guardables.length;

    // (c) guardar artículos e historias, con (d) la decisión de elegir ya tomada
    const { desde: desdeDia, hasta: hastaDia } = rangoDelDia(c.dia);
    let nacionalesHoy = 0;
    try { nacionalesHoy = await db.contarNacionalesEntre(env, desdeDia, hastaDia); } catch (e) { error('contar nacionales', e); }
    const nuevosPorId = new Map(guardables.map((a) => [a.id, a]));
    try { await db.guardarArticulos(env, guardables); } catch (e) { error('guardar artículos', e); }
    for (const h of tocadas.values()) {
      try {
        let arts = h.articulos.map((id) => nuevosPorId.get(id)).filter(Boolean);
        if (arts.length < h.articulos.length) {
          const guardados = await db.articulosDeHistoria(env, h.id);
          const ya = new Set(arts.map((x) => x.id));
          arts = [...guardados.filter((x) => !ya.has(x.id)), ...arts];
        }
        // Lo que ya salió no se baja (elegida, redactada) ni lo frenado por ley (no_publicar) se vuelve a decidir.
        if (!['elegida', 'redactada', 'no_publicar'].includes(h.estado)) {
          const d = elegir(h, arts, { nacionalesHoy, ahora: c.ahora });
          h.estado = d.sale ? 'elegida' : 'no_sale';
          h.motivo = d.motivo;
          if (d.sale) {
            r.elegidas += 1;
            if (d.motivo === 'nacional-3' || d.motivo === 'area-chica-2') nacionalesHoy += 1;
          } else {
            r.noSalen[d.motivo] = (r.noSalen[d.motivo] || 0) + 1;
          }
        }
        await db.guardarHistoria(env, h, c.ahoraISO);
      } catch (e) {
        error(`historia ${h.id}`, e);
      }
    }

    // (e) redactar
    await redactarPendientes(env, c, gem, r, error);

    try { await db.anotarFuente(env, '_vuelta', true, null, c.ahoraISO); } catch (e) { error('anotar vuelta', e); }
    return r;
  }

  async function redactarPendientes(env, c, gem, r, error) {
    if (!gem.hayClave) return;
    // freno mensual
    const mes = c.dia.slice(0, 7);
    let gastoMes = 0;
    try { gastoMes = costoEstimado(await db.usoDelMes(env, mes)); } catch (e) { error('uso del mes', e); }
    if (gastoMes >= FRENO_MENSUAL_USD) {
      r.frenoMensual = true;
      const marca = `aviso-freno-${mes}`;
      try {
        if (!(await db.usoDelDia(env, marca)).length) {
          await db.anotarUso(env, marca, 'aviso');
          await decirPorTelegram(env, `Radar 3.0 (prueba): el núcleo dejó de redactar. El gasto estimado del mes en Gemini llegó a ${usd(gastoMes)} (freno: ${usd(FRENO_MENSUAL_USD)}). Sigue leyendo y agrupando; vuelve a redactar el mes que viene o si se sube el freno.`, c.fetchFn);
        }
      } catch (e) { error('aviso de freno', e); }
      return;
    }

    const porVuelta = Math.max(0, Math.floor(numero(env.NUCLEO_REDACTAR_POR_VUELTA, 6)));
    if (!porVuelta) return;
    let pendientes;
    try { pendientes = await db.historiasParaRedactar(env, 60); } catch (e) { error('historias para redactar', e); return; }
    // Balcarce (y lo que pidió una persona) primero; adentro de cada grupo, lo más nuevo primero (ya viene así de la base)
    const prioridad = (h) => (['pedido', 'balcarce', 'zona'].includes(h.motivo) ? 0 : 1);
    pendientes = pendientes.map((h, i) => ({ h, i })).sort((x, y) => prioridad(x.h) - prioridad(y.h) || x.i - y.i).map((x) => x.h);

    const geminiTexto = gem.para('redaccion');
    const geminiFoto = gem.para('foto');
    let hechas = 0;
    for (const h of pendientes) {
      if (hechas >= porVuelta) break;
      if (new Date(h.fechaHecho).getTime() < c.ahora.getTime() - HORAS_PARA_REDACTAR * HORA) {
        try { await db.marcarHistoria(env, h.id, 'no_sale', 'vieja', null, c.ahoraISO); r.noSalen.vieja = (r.noSalen.vieja || 0) + 1; } catch (e) { error(`marcar vieja ${h.id}`, e); }
        continue;
      }
      try {
        const arts = await db.articulosDeHistoria(env, h.id);
        if (!arts.length) throw new Error('la historia no tiene artículos');
        const historia = { id: h.id, titulo: h.titulo, fechaHecho: h.fechaHecho, medios: h.medios };
        const nota = await verificarYReescribir(historia, arts, { gemini: geminiTexto, perfil, redaccion });
        if (!nota.noPublicar) {
          try {
            nota.foto = await elegirFoto(nota, arts, { gemini: geminiFoto, fetch: c.fetchFn });
          } catch (e) {
            if (e.message === 'tope-diario') throw e;
            error(`foto de ${h.id}`, e); // sin foto la nota igual se guarda
          }
        }
        await db.guardarNota(env, { ...nota, id: idDeNota(c.azar), historiaId: h.id, creada: c.ahoraISO, estado: 'borrador' }, c.ahoraISO);
        hechas += 1;
        if (nota.noPublicar) r.frenadasPorLey += 1; else r.redactadas += 1;
      } catch (e) {
        if (e.message === 'tope-diario') { r.topeDiario = true; break; } // se corta la redacción de esta vuelta, sin error
        error(`redactar ${h.id}`, e);
        try {
          const marca = `fallo-${h.id}`;
          await db.anotarUso(env, marca, 'redaccion');
          const fallos = (await db.usoDelDia(env, marca)).reduce((s, f) => s + f.pedidos, 0);
          if (fallos >= FALLOS_POR_HISTORIA) {
            await db.marcarHistoria(env, h.id, 'no_sale', 'error-redaccion', null, c.ahoraISO);
            r.noSalen['error-redaccion'] = (r.noSalen['error-redaccion'] || 0) + 1;
          }
        } catch (e2) { error(`anotar fallo de ${h.id}`, e2); }
      }
    }
  }

  // ------------------------------------------------------------------------------------------ el resumen de las 21:30

  async function resumen(env, deps = {}) {
    const c = contexto(env, deps);
    const { desde, hasta } = rangoDelDia(c.dia);
    const [res, usoHoy, usoMes, falladasTodas] = await Promise.all([
      db.resumenEntre(env, desde, hasta),
      db.usoDelDia(env, c.dia),
      db.usoDelMes(env, c.dia.slice(0, 7)),
      db.fuentesParaAvisar(env, c.ahoraISO),
    ]);
    // Una fuente que nunca anduvo bien (ultimo_ok vacío) se avisa recién después de un día entero de fallas (96 vueltas), no por un tropiezo.
    const falladas = falladasTodas.filter((f) => f.ultimo_ok || f.fallas_seguidas >= 96);

    const salen = res.items;
    const lineas = [`Radar 3.0 (prueba): hoy habría publicado ${salen.length} ${salen.length === 1 ? 'nota' : 'notas'}`];
    for (const i of salen) {
      lineas.push(`· [${i.seccion || 'sin sección'}] ${i.titulo || '(sin título)'} (${i.motivo || 'sin motivo'}, ${i.medios} ${i.medios === 1 ? 'medio' : 'medios'}${i.conNota ? '' : ', sin redactar'})`);
    }
    const pedidosHoy = usoHoy.reduce((s, f) => s + f.pedidos, 0);
    const gastoHoy = costoEstimado({
      tokensEntrada: usoHoy.reduce((s, f) => s + f.tokens_entrada, 0),
      tokensSalida: usoHoy.reduce((s, f) => s + f.tokens_salida, 0),
    });
    lineas.push('');
    lineas.push(`Gasto estimado en Gemini: hoy ${usd(gastoHoy)} (${pedidosHoy} pedidos), en el mes ${usd(costoEstimado(usoMes))} (${usoMes.pedidos} pedidos).`);
    const motivos = Object.entries(res.noSalen).sort((a, b) => b[1] - a[1]);
    lineas.push(motivos.length ? `No salieron: ${motivos.map(([m, n]) => `${m} ${n}`).join(', ')}.` : 'No salieron: ninguna historia descartada hoy.');
    if (falladas.length) {
      lineas.push(`Fuentes que fallan hace 3 días o más: ${falladas.map((f) => nombreDeFuente.get(f.fuente_id) || f.fuente_id).join(', ')}.`);
    }

    const mensajes = partirEnMensajes(lineas);
    const enviado = await decirPorTelegram(env, mensajes, c.fetchFn);
    if (enviado) {
      for (const f of falladas) {
        try { await db.marcarFuenteAvisada(env, f.fuente_id); } catch (e) { console.error(`marcar avisada ${f.fuente_id}: ${e.message}`); }
      }
    }
    return { dia: c.dia, total: salen.length, mensajes: mensajes.length, enviado, fuentesAvisadas: enviado ? falladas.map((f) => f.fuente_id) : [] };
  }

  // ------------------------------------------------------------------------------------------ la puerta HTTP

  const json = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

  async function autorizado(pedido, env) {
    if (!env.TELEGRAM_TOKEN) return json({ error: 'sin token' }, 503);
    const esperada = await contrasenaDelWebhook(env.TELEGRAM_TOKEN);
    const recibida = pedido.headers.get('x-radar-contrasena') ?? '';
    let dif = esperada.length ^ recibida.length;
    for (let i = 0; i < esperada.length; i++) dif |= esperada.charCodeAt(i) ^ (recibida.charCodeAt(i) || 0);
    return dif === 0 ? null : json({ error: 'no' }, 403);
  }

  async function salud(env, deps) {
    const c = contexto(env, deps);
    const { desde, hasta } = rangoDelDia(c.dia);
    const [hoy, usoHoy, usoMes, estados] = await Promise.all([
      db.contarEntre(env, desde, hasta), db.usoDelDia(env, c.dia), db.usoDelMes(env, c.dia.slice(0, 7)), db.estadoDeFuentes(env),
    ]);
    const ultima = estados.find((e) => e.fuente_id === '_vuelta');
    const reales = estados.filter((e) => e.fuente_id !== '_vuelta');
    return json({
      ahora: c.ahoraISO,
      dia: c.dia,
      ultimaVuelta: ultima ? ultima.ultimo_ok : null,
      hoy,
      fuentes: { activas: fuentes.length, conFalla: reales.filter((e) => e.fallas_seguidas > 0).map((e) => ({ id: e.fuente_id, fallasSeguidas: e.fallas_seguidas, ultimoOk: e.ultimo_ok })) },
      uso: {
        hoy: usoHoy,
        mes: { ...usoMes, gastoEstimadoUsd: Number(costoEstimado(usoMes).toFixed(4)), frenoUsd: FRENO_MENSUAL_USD },
        topeDiario: numero(env.NUCLEO_TOPE_DIARIO, 150),
      },
      claves: { gemini: !!env.GEMINI_API_KEY, telegram: !!env.TELEGRAM_TOKEN },
    });
  }

  async function manejar(pedido, env, deps = {}) {
    const url = new URL(pedido.url);
    if (pedido.method === 'GET' && url.pathname === '/salud') return salud(env, deps);
    if (pedido.method === 'GET' && url.pathname === '/notas') {
      const no = await autorizado(pedido, env);
      if (no) return no;
      const dia = url.searchParams.get('dia') || contexto(env, deps).dia;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return json({ error: 'dia tiene que ser AAAA-MM-DD' }, 400);
      const { desde, hasta } = rangoDelDia(dia);
      return json({ dia, notas: await db.notasEntre(env, desde, hasta) });
    }
    if (pedido.method === 'POST' && (url.pathname === '/vuelta' || url.pathname === '/resumen')) {
      const no = await autorizado(pedido, env);
      if (no) return no;
      // Se espera hasta que termina (puede tardar unos minutos): el resultado sale en la respuesta.
      return json(url.pathname === '/vuelta' ? await vuelta(env, deps) : await resumen(env, deps));
    }
    return new Response('Radar Balcarce · núcleo 3.0 (prueba)', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  async function programado(evento, env, deps = {}) {
    // El cron diario (30 0 * * *) es el resumen; todo lo demás es la vuelta de 15 minutos.
    if (evento && evento.cron === '30 0 * * *') return resumen(env, deps);
    return vuelta(env, deps);
  }

  return { vuelta, resumen, manejar, programado };
}
