// El núcleo de Radar 3.0 armado: la vuelta de 15 minutos, el resumen diario y la puerta HTTP (REGLAS.md, CONTRATO.md).
// Acá no hay `import` de archivos .md ni .json: el punto de entrada (worker.mjs) los trae y se los pasa a `crearNucleo`, así esto se prueba
// con Node sin red (D1, Workers AI, Gemini y fetch se inyectan).
//
// Principio: avisa y sigue. El error de una fuente, de un artículo o de una historia se anota y no frena a las demás.
import { leerFuente } from './leer/leer.mjs';
import { crearHuella } from './agrupar/huella.mjs';
import { agrupar, textoParaDuda } from './agrupar/agrupar.mjs';
import { elegir, cupoNacional, minimoDelDia } from './elegir/elegir.mjs';
import { crearGemini } from './redactar/gemini.mjs';
import { verificarYReescribir } from './redactar/verificar.mjs';
import { elegirFotoConMotivo } from './fotos/fotos.mjs';
import * as db from './db/db.mjs';
import * as IL from './ilustrar/ilustrar.mjs';
import * as AF from './archivo-fotos/archivo-fotos.mjs';
import { queToca, horaLocal, idDeLaNota, traerPronostico, comparar, redactarNotaDelClima, parrafoDeActualizacion, estadoDelDia, FIRMA_CLIMA, FUENTE_CLIMA, TIPO_DE_NOTA } from './clima/clima.mjs';
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
const FOTOS_REINTENTADAS_POR_VUELTA = 5; // notas publicadas sin foto a las que se les vuelve a buscar una por vuelta (REGLAS § 7)
const HORAS_PARA_REINTENTAR_FOTO = 24; // sólo las publicadas en las últimas 24 h
const MAX_INTENTOS_DE_FOTO = 4; // contando el de la redacción
const MINUTOS_ENTRE_INTENTOS_DE_FOTO = 45;const REHACER_POR_DIA = 60; // notas migradas sin foto que se rehacen por día (variable NUCLEO_REHACER_POR_DIA; 0 lo apaga; REGLAS § 7 ter)
const REHACER_POR_VUELTA = 3; // y cuántas por vuelta (NUCLEO_REHACER_POR_VUELTA)
const REHACER_INTENTOS = 3; // por si Gemini o la red fallan: un intento que no pudo decidir (error-vision) se repite hasta 3 veces
const SECCIONES_SIN_FOTO_AJENA = new Set(['Policiales']); // nunca foto real de un menor o una víctima, ni en Policiales salvo fuente oficial: la migrada de Policiales queda con placa
const ILUSTRAR_POR_VUELTA = 2; // notas a las que se les hace una ilustración por vuelta (NUCLEO_ILUSTRAR_POR_VUELTA; 0 lo apaga; REGLAS § 7 paso 3)
const ILUSTRAR_POR_DIA = 40; // imágenes por día (NUCLEO_ILUSTRAR_POR_DIA): ~77 neuronas cada una, ~3.100 de las 10.000 gratis
const ILUSTRAR_MARCAS_POR_VUELTA = 20; // notas que no se pueden ilustrar y se marcan por vuelta para no volver a mirarlas
const ILUSTRADAS_CON_BUSQUEDA_REAL_POR_VUELTA = 2; // ilustradas a las que se les vuelve a buscar una foto real por vuelta
const ARCHIVO_POR_VUELTA = 2; // notas a las que se les busca una foto de archivo por vuelta (NUCLEO_ARCHIVO_POR_VUELTA; 0 lo apaga; REGLAS § 7 paso 2 bis)
const HORAS_PARA_REDACTAR = 48; // una historia elegida que no se alcanzó a redactar en este plazo ya es vieja

// Precio estimado de Gemini 3.1 Flash-Lite, en US$ por millón de tokens. SE CONFIRMAN CON LA LISTA DE PRECIOS DE GOOGLE: si cambian, se
// cambian acá y sólo acá. Es una estimación para frenar a tiempo, no la factura.
export const PRECIO_ENTRADA_POR_MILLON = 0.10;
export const PRECIO_SALIDA_POR_MILLON = 0.40;
export const FRENO_MENSUAL_USD = 7; // Hernán, 3/11: texto y voces juntos por debajo de US$ 10 por mes (las voces son ~US$ 2)

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

/** La marca de la foto en `verificacion` (la tabla no tiene columna para esto): por qué no hay (`fotoMotivo`, ver MOTIVOS_SIN_FOTO), cuántos intentos y cuándo fue el último. Con foto, se borra el motivo. */
export function conMotivoDeFoto(verificacion, motivo, intentos, ahoraISO) {
  const { fotoMotivo, ...resto } = verificacion || {};
  return { ...resto, ...(motivo ? { fotoMotivo: motivo } : {}), fotoIntentos: intentos, fotoIntentada: ahoraISO };
}

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
// El interruptor: sólo "si" publica; cualquier otra cosa (o nada) deja todo en borrador. Lo cambia una persona el día del corte.
export const publica = (env) => /^s*s[ií]s*$/i.test(String((env && env.NUCLEO_PUBLICA) || 'no'));

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
      elegidas: 0, noSalen: {}, redactadas: 0, publicadas: 0, publicadasPendientes: 0, fotosReintentadas: 0, fotosEncontradas: 0, frenadasPorLey: 0, errores: [], sinClaveGemini: false, topeDiario: false, frenoMensual: false, clima: null,
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
    const opcionesDeElegir = () => ({
      nacionalesHoy, ahora: c.ahora,
      minimoNacional: minimoDelDia(numero(env.NUCLEO_MINIMO_NACIONAL, 3), numero(env.NUCLEO_MINIMO_NACIONAL_FINDE, 0), c.ahora),
      minimoAreasChicas: numero(env.NUCLEO_MINIMO_AREAS_CHICAS, 2),
      topeNacional: cupoNacional(numero(env.NUCLEO_TOPE_NACIONAL, 100), c.ahora),
    });
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
          // Cuánto de afuera entra: lo fija wrangler.toml; sin variable, lo de REGLAS § 4. El tope se reparte a lo largo del día.
          const d = elegir(h, arts, opcionesDeElegir());
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

    // (d2) lo que el tope dejó esperando sale cuando vuelve a haber cupo, primero lo más contado (REGLAS § 4)
    try {
      const espera = await db.historiasEsperandoCupo(env, new Date(c.ahora.getTime() - 24 * HORA).toISOString());
      for (const h of espera) {
        const o = opcionesDeElegir();
        if (o.nacionalesHoy >= o.topeNacional) break;
        if (tocadas.has(h.id)) continue;
        const d = elegir(h, await db.articulosDeHistoria(env, h.id), o);
        await db.marcarHistoria(env, h.id, d.sale ? 'elegida' : 'no_sale', d.motivo, null, c.ahoraISO);
        if (d.sale) {
          r.elegidas += 1;
          if (d.motivo === 'nacional-3' || d.motivo === 'area-chica-2') nacionalesHoy += 1;
        }
      }
    } catch (e) { error('esperando cupo', e); }

    // (e) redactar
    await redactarPendientes(env, c, gem, r, error);

    // (e2) a las notas ya publicadas sin foto se les vuelve a buscar (hasta 5 por vuelta, las de las últimas 24 h)
    if (gem.hayClave && !r.frenoMensual && !r.topeDiario) await reintentarFotos(env, c, gem, r, error);

    // Rehacer fotos, foto de archivo e ilustraciones no compiten con redactar: pasado NUCLEO_TOPE_SECUNDARIO, el cupo que queda es para las notas (6/11, Hernán).
    const hayCupoSecundario = () => gem.estado.pedidosHoy < numero(env.NUCLEO_TOPE_SECUNDARIO, 400);

    // (e3) las notas migradas del sistema viejo sin foto, de a pocas por vuelta y con tope por día (REGLAS § 7 ter)
    if (gem.hayClave && !r.frenoMensual && !r.topeDiario && hayCupoSecundario()) await rehacerMigradas(env, c, gem, r, error);

    // (e4) las ilustraciones con IA para lo que agotó la búsqueda de foto real (REGLAS § 7, paso 3)
    if (gem.hayClave && !r.frenoMensual && !r.topeDiario && hayCupoSecundario()) {
      try { await ilustrarSinFoto(env, c, gem, r, error); } catch (e) { error('ilustrar', e); }
    }

    // (f) con NUCLEO_PUBLICA = si, los borradores bien hechos de las últimas 24 h que quedaron sin publicar (el arranque, o una vuelta que falló a medias)
    if (publica(env)) {
      try { r.publicadasPendientes = await db.publicarBorradores(env, new Date(c.ahora.getTime() - 24 * HORA).toISOString(), c.ahoraISO); } catch (e) { error('publicar pendientes', e); }
    }

    // (g) la nota diaria del clima (REGLAS § 12): sale a las 7:30 y a las 19:00 se actualiza si el pronóstico cambió mucho
    await climaDelDia(env, c, gem, r, error);

    try { await db.anotarFuente(env, '_vuelta', true, null, c.ahoraISO); } catch (e) { error('anotar vuelta', e); }
    return r;
  }

  // La nota del clima de la región. Una por día (id `clima-AAAA-MM-DD`); la actualización de las 19 reescribe la MISMA fila: no cambia id, `creada` ni la
  // dirección (el sitio fija el slug la primera vez). Si Gemini no se puede usar (sin clave, tope diario o freno mensual) o falla, sale la plantilla.
  async function climaDelDia(env, c, gem, r, error) {
    try {
      const { dia, minutos } = horaLocal(c.ahora);
      const id = idDeLaNota(dia);
      const nota = await db.notaCompleta(env, id);
      const toca = queToca(c.ahora, nota);
      if (!toca) return;

      // ¿Se puede usar Gemini? Mismo freno mensual y mismo tope diario que la redacción; si no, plantilla (no cuesta nada).
      let geminiClima = null;
      if (gem.hayClave && gem.estado.pedidosHoy + 2 <= gem.estado.topeDiario) {
        let gastoMes = 0;
        try { gastoMes = costoEstimado(await db.usoDelMes(env, dia.slice(0, 7))); } catch (e) { error('uso del mes (clima)', e); }
        if (gastoMes < FRENO_MENSUAL_USD) geminiClima = gem.para('clima');
      }

      const desdeHora = toca === 'salir' ? Math.floor(minutos / 60) : 19;
      const resumen = await traerPronostico(c.fetchFn, { desdeHora, ahora: c.ahora });

      if (toca === 'revisar') {
        const viejo = nota.verificacion && nota.verificacion.resumen;
        const cambio = viejo ? comparar(viejo, resumen) : { importante: false, motivos: [] };
        if (!cambio.importante) {
          await db.guardarNota(env, { ...nota, verificacion: { ...nota.verificacion, revisada19: true, revisadaEn: c.ahoraISO } }, c.ahoraISO);
          r.clima = { accion: 'sin-cambios' };
          return;
        }
        const escrita = await redactarNotaDelClima(resumen, { gemini: geminiClima, edicion: 'tarde' });
        const cuerpo = [parrafoDeActualizacion(cambio.motivos), ...escrita.cuerpo];
        await db.guardarNota(env, armarNota({ id, dia, nota, resumen, escrita, cuerpo, ahoraISO: c.ahoraISO, env, edicion: 'tarde', cambio }), c.ahoraISO);
        r.clima = { accion: 'actualizo', redactor: escrita.redactor, motivos: cambio.motivos.map((m) => m.tipo), motivoPlantilla: escrita.motivoPlantilla };
        return;
      }

      const escrita = await redactarNotaDelClima(resumen, { gemini: geminiClima, edicion: 'manana' });
      const n = armarNota({ id, dia, nota: null, resumen, escrita, cuerpo: escrita.cuerpo, ahoraISO: c.ahoraISO, env, edicion: 'manana' });
      await db.guardarHistoria(env, {
        id, creada: c.ahoraISO, fechaHecho: c.ahoraISO, huella: null, titulo: n.titulo, medios: [FUENTE_CLIMA.medio], alcances: ['balcarce'],
        articulos: [], estado: 'redactada', motivo: 'clima', seccion: 'Balcarce', notaId: id,
      }, c.ahoraISO);
      await db.guardarNota(env, n, c.ahoraISO);
      if (n.estado === 'publicada') await db.marcarPublicadaEn(env, [id], c.ahoraISO);
      r.clima = { accion: 'salio', redactor: escrita.redactor, motivoPlantilla: escrita.motivoPlantilla, estado: n.estado };
    } catch (e) {
      r.clima = { accion: 'error', error: String((e && e.message) || e).slice(0, 120) };
      error('nota del clima', e);
    }
  }

  function armarNota({ id, dia, nota, resumen, escrita, cuerpo, ahoraISO, env, edicion, cambio = null }) {
    return {
      id, historiaId: id, creada: nota ? nota.creada : ahoraISO,
      titulo: escrita.titulo, bajada: escrita.bajada, cuerpo, seccion: 'Balcarce', enDosLineas: escrita.enDosLineas,
      ficha: {
        que: 'Pronóstico del tiempo de hoy y los próximos dos días', quien: FIRMA_CLIMA, donde: 'Balcarce, la costa y la sierra', cuando: dia,
        numeros: [], cronologia: [], faltaSaber: [],
        marca: { tipo: TIPO_DE_NOTA, fecha: dia }, indexar: false, estadoDelCielo: estadoDelDia(resumen),
        actualizadaEn: edicion === 'tarde' ? ahoraISO : null,
      },
      noPublicar: null,
      verificacion: {
        tipo: TIPO_DE_NOTA, resumen, redactor: escrita.redactor, motivoPlantilla: escrita.motivoPlantilla, oracionesQuitadas: escrita.oracionesQuitadas,
        revisada19: edicion === 'tarde', actualizadaEn: edicion === 'tarde' ? ahoraISO : null,
        cambios: cambio ? cambio.motivos : (nota && nota.verificacion && nota.verificacion.cambios) || [],
      },
      foto: null, fuentes: [FUENTE_CLIMA], fechaHecho: nota ? nota.fechaHecho : ahoraISO, firma: FIRMA_CLIMA,
      pedidos: (nota ? nota.pedidos : 0) + escrita.pedidos,
      estado: nota ? nota.estado : (publica(env) ? 'publicada' : 'borrador'),
    };
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
            const f = await elegirFotoConMotivo(nota, arts, { gemini: geminiFoto, fetch: c.fetchFn });
            nota.foto = f.foto;
            if (!f.foto) nota.verificacion = conMotivoDeFoto(nota.verificacion, f.motivo, 1, c.ahoraISO);
          } catch (e) {
            if (e.message === 'tope-diario') throw e;
            error(`foto de ${h.id}`, e); // sin foto la nota igual se guarda
            nota.verificacion = conMotivoDeFoto(nota.verificacion, 'error-vision', 1, c.ahoraISO);
          }
        }
        const sale = publica(env) && !nota.noPublicar;
        const idNota = idDeNota(c.azar);
        await db.guardarNota(env, { ...nota, id: idNota, historiaId: h.id, creada: c.ahoraISO, estado: sale ? 'publicada' : 'borrador' }, c.ahoraISO);
        if (sale) { await db.marcarPublicadaEn(env, [idNota], c.ahoraISO); r.publicadas += 1; }
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

  // Vuelve a buscarles foto a las notas publicadas sin foto (las de las últimas 24 h; hasta 5 por vuelta, con 45 minutos entre intentos y 4 intentos en total).
  // Las fuentes de la historia pueden haber crecido desde que se escribió la nota, y la página de una fuente que no se había mirado ahora sí se mira.
  async function reintentarFotos(env, c, gem, r, error) {
    let sinFoto;
    try { sinFoto = await db.notasPublicadasSinFoto(env, new Date(c.ahora.getTime() - HORAS_PARA_REINTENTAR_FOTO * HORA).toISOString()); } catch (e) { error('notas sin foto', e); return; }
    const hace = c.ahora.getTime() - MINUTOS_ENTRE_INTENTOS_DE_FOTO * 60_000;
    const toca = sinFoto
      .filter((n) => (n.verificacion.fotoIntentos || 0) < MAX_INTENTOS_DE_FOTO && !(n.verificacion.fotoIntentada && new Date(n.verificacion.fotoIntentada).getTime() > hace))
      .sort((x, y) => (x.verificacion.fotoIntentos || 0) - (y.verificacion.fotoIntentos || 0)) // las que menos se probaron primero (el orden es estable: adentro, las más nuevas)
      .slice(0, FOTOS_REINTENTADAS_POR_VUELTA);
    if (!toca.length) return;
    const geminiFoto = gem.para('foto');
    for (const n of toca) {
      try {
        const arts = await db.articulosDeHistoria(env, n.historiaId);
        if (!arts.length) continue;
        const f = await elegirFotoConMotivo({ titulo: n.titulo, ficha: n.ficha }, arts, { gemini: geminiFoto, fetch: c.fetchFn });
        r.fotosReintentadas += 1;
        const intentos = (n.verificacion.fotoIntentos || 0) + 1;
        if (f.foto) {
          await db.ponerFotoDeNota(env, n.id, f.foto, conMotivoDeFoto(n.verificacion, null, intentos, c.ahoraISO));
          r.fotosEncontradas += 1;
        } else {
          await db.ponerFotoDeNota(env, n.id, null, conMotivoDeFoto(n.verificacion, f.motivo, intentos, c.ahoraISO));
        }
      } catch (e) {
        if (e.message === 'tope-diario') { r.topeDiario = true; break; }
        error(`reintentar foto de ${n.id}`, e);
      }
    }
  }

  // Rehacer las notas migradas sin foto (REGLAS § 7 ter): la regla de fotos de hoy (sólo las fuentes de la nota, sin marca, sin menores ni víctimas),
  // de a REHACER_POR_VUELTA por vuelta y hasta REHACER_POR_DIA por día (se cuenta en uso_ia con la marca «rehacer-AAAA-MM-DD»). El texto no se toca: el doc
  // de la auditoría (5/11) midió que cuerpo, título y bajada ya cumplen, y lo que falta es la foto. Cada nota queda marcada con `verificacion.rehacerFoto`
  // ('foto', 'sin-foto' o 'saltada') y `rehacerMotivo`: no se vuelve a tocar. No cambia título, cuerpo, fecha, dirección ni firma.
  async function rehacerMigradas(env, c, gem, r, error) {
    const porDia = numero(env.NUCLEO_REHACER_POR_DIA, REHACER_POR_DIA);
    const porVuelta = Math.floor(numero(env.NUCLEO_REHACER_POR_VUELTA, REHACER_POR_VUELTA));
    r.rehacer = { intentadas: 0, conFoto: 0, sinFoto: 0, saltadas: 0 };
    if (!porDia || !porVuelta) return;
    const marcaDelDia = `rehacer-${c.dia}`;
    let hechasHoy;
    try { hechasHoy = (await db.usoDelDia(env, marcaDelDia)).reduce((s, f) => s + f.pedidos, 0); } catch (e) { error('rehacer: contar el día', e); return; }
    const cuantas = Math.min(porVuelta, porDia - hechasHoy);
    if (cuantas <= 0) return;
    let pendientes;
    try { pendientes = await db.migradasSinFotoPendientes(env, cuantas); } catch (e) { error('rehacer: buscar migradas', e); return; }
    if (!pendientes.length) return;
    const geminiFoto = gem.para('rehacer-foto');
    for (const n of pendientes) {
      const marcar = async (estado, motivo, foto, intentos) => {
        const v = conMotivoDeFoto(n.verificacion, motivo, intentos, c.ahoraISO);
        await db.ponerFotoDeNota(env, n.id, foto, { ...v, rehacerFoto: estado, rehacerMotivo: motivo || null, rehacerCuando: c.ahoraISO });
      };
      try {
        const intentos = (n.verificacion.fotoIntentos || 0) + 1;
        const fuentesConUrl = (Array.isArray(n.fuentes) ? n.fuentes : []).filter((f) => f && /^https?:\/\//i.test(f.url || ''));
        if (SECCIONES_SIN_FOTO_AJENA.has(n.seccion)) { await marcar('saltada', 'policiales', null, intentos); r.rehacer.saltadas += 1; }
        else if (!fuentesConUrl.length) { await marcar('saltada', 'sin-fuentes', null, intentos); r.rehacer.saltadas += 1; }
        else {
          const arts = fuentesConUrl.map((f, i) => ({ id: `${n.id}-${i}`, url: f.url, medio: f.medio || 'la fuente', imagenes: [] }));
          const f = await elegirFotoConMotivo({ titulo: n.titulo, ficha: null }, arts, { gemini: geminiFoto, fetch: c.fetchFn });
          if (f.foto) { await marcar('foto', null, f.foto, intentos); r.rehacer.conFoto += 1; }
          else if (f.motivo === 'error-vision' && intentos < REHACER_INTENTOS) {
            // no pudo decidir (cupo, red): queda pendiente, sin la marca final, y vuelve a tocarle en otra vuelta
            await db.ponerFotoDeNota(env, n.id, null, conMotivoDeFoto(n.verificacion, f.motivo, intentos, c.ahoraISO));
          } else { await marcar('sin-foto', f.motivo, null, intentos); r.rehacer.sinFoto += 1; }
        }
        r.rehacer.intentadas += 1;
        await db.anotarUso(env, marcaDelDia, 'rehacer');
      } catch (e) {
        if (e.message === 'tope-diario') { r.topeDiario = true; break; }
        error(`rehacer ${n.id}`, e);
        // un fallo que no es de cupo también gasta el cupo del día y un intento, para no trabarse en la misma nota
        try {
          await db.anotarUso(env, marcaDelDia, 'rehacer');
          await db.ponerFotoDeNota(env, n.id, null, conMotivoDeFoto(n.verificacion, 'error-descarga', (n.verificacion.fotoIntentos || 0) + 1, c.ahoraISO));
        } catch (e2) { error(`rehacer: anotar fallo de ${n.id}`, e2); }
      }
    }
  }

  // Las ilustraciones con IA (REGLAS § 7, paso 3): a las notas publicadas sin foto cuya búsqueda de foto real ya se agotó (4 intentos, 24 h o un motivo final), una ilustración de Workers AI
  // (sin personas, texto ni logos; prompt de Gemini y control con visión de la imagen terminada). Foto real siempre gana: primero se busca una real para las ya ilustradas y, si aparece, reemplaza.
  // Topes: NUCLEO_ILUSTRAR_POR_VUELTA notas por vuelta y NUCLEO_ILUSTRAR_POR_DIA imágenes por día (se cuentan en uso_ia con la marca «ilustrar-AAAA-MM-DD», tarea `ilustracion`; los pedidos a Gemini van
  // en la tarea `ilustracion` del día). Una falla nunca rompe la vuelta. Sin el depósito FOTOS o sin Workers AI (env.AI), no hace nada.
  async function ilustrarSinFoto(env, c, gem, r, error) {
    if (!env.FOTOS) return;
    const porVueltaIl = Math.floor(numero(env.NUCLEO_ILUSTRAR_POR_VUELTA, ILUSTRAR_POR_VUELTA));
    const porDia = Math.floor(numero(env.NUCLEO_ILUSTRAR_POR_DIA, ILUSTRAR_POR_DIA));
    // La foto de archivo (REGLAS § 7, paso 2 bis) va antes de la ilustración y no necesita Workers AI: tiene su propio tope (0 la apaga).
    const archivoPorVuelta = Math.max(0, Math.floor(numero(env.NUCLEO_ARCHIVO_POR_VUELTA, ARCHIVO_POR_VUELTA)));
    const ilustra = !!env.AI?.run && porVueltaIl > 0 && porDia > 0;
    const porVuelta = ilustra ? porVueltaIl : 0;
    if (!ilustra && !archivoPorVuelta) return;
    const il_ = { reales: 0, saltadas: 0, intentadas: 0, hechas: 0, finales: 0, fallos: 0, imagenesHoy: 0 }; // los contadores; sólo salen en el informe (r.ilustraciones) si la ilustración está encendida
    if (ilustra) r.ilustraciones = il_;
    const marca = `ilustrar-${c.dia}`;
    let hechasHoy;
    try { hechasHoy = (await db.usoDelDia(env, marca)).reduce((s, f) => s + f.pedidos, 0); } catch (e) { error('ilustrar: contar el día', e); return; }
    const geminiFoto = gem.para('foto');

    // 1) foto real siempre gana: las ya ilustradas siguen buscando (pocas por vuelta; hasta 3 intentos, 3 horas entre uno y otro, durante 72 h).
    try {
      const ilustradas = await db.notasIlustradas(env, new Date(c.ahora.getTime() - IL.REAL_HORAS_DE_VIGENCIA * HORA).toISOString());
      const buscan = ilustradas.filter((n) => (AF.esFotoDeArchivo(n.foto) ? AF.debeBuscarFotoReal(n, c.ahora) : IL.debeBuscarFotoReal(n, c.ahora))).slice(0, ILUSTRADAS_CON_BUSQUEDA_REAL_POR_VUELTA);
      for (const n of buscan) {
        try {
          const arts = await db.articulosDeHistoria(env, n.historiaId);
          const deArchivo = AF.esFotoDeArchivo(n.foto);
          const il = (deArchivo ? n.verificacion.archivoFoto : n.verificacion.ilustracion) || {};
          const f = arts.length ? await elegirFotoConMotivo({ titulo: n.titulo, ficha: n.ficha }, arts, { gemini: geminiFoto, fetch: c.fetchFn }) : { foto: null, motivo: 'sin-candidatas' };
          if (f.foto) {
            const base = conMotivoDeFoto(n.verificacion, null, (n.verificacion.fotoIntentos || 0) + 1, c.ahoraISO);
            await db.reemplazarIlustracion(env, n.id, f.foto, deArchivo ? AF.sinArchivo(base, c.ahoraISO) : IL.sinIlustracion(base, c.ahoraISO));
            il_.reales += 1;
          } else {
            const cuenta = f.motivo === 'error-vision' ? 0 : 1; // si la visión no pudo decidir (cupo, red), no gasta el intento: se espera y se vuelve a probar
            const estadoReal = { realIntentos: (Number(il.realIntentos) || 0) + cuenta, realIntentada: c.ahoraISO };
            await db.reemplazarIlustracion(env, n.id, null, deArchivo ? AF.conEstadoDeArchivo(n.verificacion, estadoReal) : IL.conEstadoDeIlustracion(n.verificacion, estadoReal));
          }
        } catch (e) {
          if (e.message === 'tope-diario') { r.topeDiario = true; break; }
          error(`foto real para la ilustrada ${n.id}`, e);
        }
      }
    } catch (e) { error('ilustradas: buscar foto real', e); }
    if (r.topeDiario) return;

    // 2) las que toca ilustrar: las publicadas de los últimos 7 días sin foto, las más nuevas primero.
    let candidatas;
    try { candidatas = await db.notasParaIlustrar(env, new Date(c.ahora.getTime() - IL.DIAS_HACIA_ATRAS * 24 * HORA).toISOString(), IL.NOTAS_A_MIRAR); } catch (e) { error('ilustrar: buscar notas', e); return; }
    const tocan = [];
    let marcadas = 0;
    for (const n of candidatas) {
      const t = IL.leTocaIlustrar(n, c.ahora);
      if (t.toca) { if (tocan.length < porVuelta + archivoPorVuelta) tocan.push(n); continue; }
      // Las que no se pueden ilustrar nunca (muerte, velorio, sepelio, lo rojo) se marcan para no volver a mirarlas; son pocas por vuelta para no gastar la base.
      if (t.saltar && ilustra && marcadas < ILUSTRAR_MARCAS_POR_VUELTA) {
        try { await db.ponerFotoDeNota(env, n.id, null, IL.conEstadoDeIlustracion(n.verificacion, { final: true, motivo: `saltada: ${t.motivo}`.slice(0, 120), intentada: c.ahoraISO })); marcadas += 1; il_.saltadas += 1; } catch (e) { error(`ilustrar: marcar ${n.id}`, e); }
      }
    }
    // 2 bis) la foto de archivo: una foto real propia de una nota anterior que muestra el mismo lugar o la misma institución. Lo que la recibe ya no se ilustra.
    let aIlustrar = tocan;
    if (archivoPorVuelta && tocan.length) {
      try {
        const servidas = await fotosDeArchivo(env, c, gem, r, error, tocan.slice(0, archivoPorVuelta));
        aIlustrar = tocan.filter((n) => !servidas.has(n.id));
      } catch (e) { error('foto de archivo', e); }
      if (r.topeDiario) return;
    }
    aIlustrar = aIlustrar.slice(0, porVuelta);
    if (!ilustra || !aIlustrar.length || hechasHoy >= porDia) { il_.imagenesHoy = hechasHoy; return; }

    const geminiIlustrar = gem.para('ilustracion');
    // El último error de ilustración (cuándo y qué) queda en la base y sale en /salud (`ilustraciones.ultimoError`): sin esto no se ve por qué no hay imágenes.
    const anotarError = async (texto) => { try { await db.anotarError(env, '_ilustracion', texto, c.ahoraISO); } catch (e) { error('ilustrar: anotar error', e); } };
    const cupo = async () => {
      if (hechasHoy >= porDia) return false;
      hechasHoy += 1;
      try { await db.anotarUso(env, marca, 'ilustracion'); } catch (e) { error('ilustrar: anotar uso', e); }
      return true;
    };
    for (const n of aIlustrar) {
      const il = n.verificacion.ilustracion || {};
      const marcar = (estado) => db.ponerFotoDeNota(env, n.id, null, IL.conEstadoDeIlustracion(n.verificacion, { intentada: c.ahoraISO, ...estado }));
      try {
        il_.intentadas += 1;
        const res = await IL.ilustrarUna(n, { gemini: geminiIlustrar, ai: env.AI, cupo, azar: c.azar });
        if (res.ok) {
          const foto = await IL.guardarIlustracion(env.FOTOS, res.bytes, n, c.ahoraISO);
          // Escribe sólo si la nota sigue sin foto: si mientras tanto apareció una real (o de una persona), esa gana.
          await db.ponerFotoDeNota(env, n.id, foto, IL.conIlustracionHecha(n.verificacion, { prompt: res.prompt, control: res.control, ahoraISO: c.ahoraISO }));
          il_.hechas += 1;
        } else if (res.final) {
          await anotarError(`${n.id}: ${res.motivo}`);
          await marcar({ final: true, motivo: String(res.motivo).slice(0, 160) });
          il_.finales += 1;
        } else if (res.sinCupo) {
          break; // se acabaron las imágenes de hoy: ninguna nota gasta un intento
        } else {
          await anotarError(`${n.id}: ${res.motivo}`);
          const fallos = (Number(il.fallos) || 0) + 1;
          await marcar(fallos >= IL.FALLOS_TECNICOS_MAXIMOS ? { final: true, fallos, motivo: `técnico: ${res.motivo}`.slice(0, 160) } : { fallos, motivo: String(res.motivo).slice(0, 160) });
          il_.fallos += 1;
        }
      } catch (e) {
        if (e.message === 'tope-diario') { r.topeDiario = true; break; }
        error(`ilustrar ${n.id}`, e);
        await anotarError(`${n.id}: error: ${String(e?.message ?? e)}`);
        il_.fallos += 1;
        try { await marcar({ fallos: (Number(il.fallos) || 0) + 1, motivo: `error: ${String(e?.message ?? e)}`.slice(0, 160) }); } catch (e2) { error(`ilustrar: anotar fallo de ${n.id}`, e2); }
      }
    }
    il_.imagenesHoy = hechasHoy;
  }

  // La foto de archivo (REGLAS § 7, paso 2 bis): para las notas que agotaron la búsqueda de foto real, busca en la base una nota anterior con foto real PROPIA (copia en R2) que comparta un lugar o una
  // institución exactos (AF.lugaresDe) y, si la visión confirma que la foto muestra el lugar sin gente en primer plano, reusa la misma copia con «Foto de archivo: <crédito>». Máximo 3 pedidos de visión
  // por nota, tarea `archivo-foto`; tope NUCLEO_ARCHIVO_POR_VUELTA notas por vuelta. Devuelve el conjunto de ids que recibieron foto. Una falla nunca rompe la vuelta (sólo 'tope-diario' sube).
  async function fotosDeArchivo(env, c, gem, r, error, notas) {
    const servidas = new Set();
    const aMirar = notas.filter((n) => AF.leTocaArchivo(n, c.ahora) && !AF.motivoParaNoRecibir(n) && AF.lugaresDe(n).size > 0);
    if (!aMirar.length) return servidas;
    const cont = (r.fotosDeArchivo = r.fotosDeArchivo || { intentadas: 0, hechas: 0, finales: 0, fallos: 0, miradas: 0 });
    let origenes;
    let huellasDelDia;
    try {
      origenes = await db.notasConFotoRealPropia(env, new Date(c.ahora.getTime() - AF.DIAS_DE_ORIGENES * 24 * HORA).toISOString(), AF.ORIGENES_A_MIRAR);
      huellasDelDia = await db.huellasDeArchivoDesde(env, rangoDelDia(c.dia).desde);
    } catch (e) { error('foto de archivo: buscar orígenes', e); return servidas; }
    const gemini = gem.para('archivo-foto');
    const anotarError = async (texto) => { try { await db.anotarError(env, '_archivo_foto', texto, c.ahoraISO); } catch (e) { error('foto de archivo: anotar error', e); } };
    for (const n of aMirar) {
      const previa = n.verificacion.archivoFoto || {};
      const marcar = async (estado) => {
        const v = AF.conEstadoDeArchivo(n.verificacion, { intentada: c.ahoraISO, ...estado });
        n.verificacion = v; // los pasos que siguen (la ilustración) escriben sobre esta misma verificación
        await db.ponerFotoDeNota(env, n.id, null, v);
      };
      try {
        const res = await AF.fotoDeArchivoPara(n, { origenes, huellasDelDia, bucket: env.FOTOS, gemini, ahoraISO: c.ahoraISO });
        cont.miradas += res.miradas || 0;
        if (res.ok) {
          cont.intentadas += 1;
          // Escribe sólo si la nota sigue sin foto: si mientras tanto apareció una real, esa gana.
          await db.ponerFotoDeNota(env, n.id, res.foto, AF.conEstadoDeArchivo(n.verificacion, res.archivo));
          huellasDelDia.add(res.archivo.huella);
          servidas.add(n.id);
          cont.hechas += 1;
        } else if (res.final && (res.motivo === 'sin-coincidencia' || res.motivo === 'sin-lugar' || String(res.motivo).startsWith('no recibe'))) {
          // sin coincidencia no se marca: no gastó ni un pedido y puede aparecer un origen más tarde (la nota sigue a la ilustración).
        } else if (res.final) {
          cont.intentadas += 1;
          await anotarError(`${n.id}: ${res.motivo}`);
          await marcar({ final: true, motivo: String(res.motivo).slice(0, 160), miradas: res.miradas || 0 });
          cont.finales += 1;
        } else {
          cont.intentadas += 1;
          await anotarError(`${n.id}: ${res.motivo}`);
          const fallos = (Number(previa.fallos) || 0) + 1;
          await marcar(fallos >= AF.FALLOS_TECNICOS_MAXIMOS ? { final: true, fallos, motivo: `técnico: ${res.motivo}`.slice(0, 160) } : { fallos, motivo: String(res.motivo).slice(0, 160) });
          cont.fallos += 1;
        }
      } catch (e) {
        if (e.message === 'tope-diario') { r.topeDiario = true; break; }
        error(`foto de archivo ${n.id}`, e);
        cont.fallos += 1;
        await anotarError(`${n.id}: error: ${String(e?.message ?? e)}`);
        try { await marcar({ fallos: (Number(previa.fallos) || 0) + 1, motivo: `error: ${String(e?.message ?? e)}`.slice(0, 160) }); } catch (e2) { error(`foto de archivo: anotar fallo de ${n.id}`, e2); }
      }
    }
    return servidas;
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
    const publicando = publica(env);
    const cuantas = publicando ? salen.filter((i) => i.conNota).length : salen.length;
    const lineas = [publicando
      ? `Radar 3.0: hoy publicó ${cuantas} ${cuantas === 1 ? 'nota' : 'notas'}`
      : `Radar 3.0 (prueba): hoy habría publicado ${cuantas} ${cuantas === 1 ? 'nota' : 'notas'}`];
    // Sólo números, nunca la lista de notas (Hernán, 3/11: «el bot no me tiene que pasar todas las noticias, sólo estadísticas»).
    const contar = (clave) => Object.entries(salen.reduce((m, i) => { const k = clave(i); m[k] = (m[k] || 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]);
    const deAca = salen.filter((i) => i.motivo === 'balcarce' || i.motivo === 'zona').length;
    lineas.push(`De Balcarce y la zona: ${deAca} · del país: ${salen.length - deAca}`);
    lineas.push(`Por sección: ${contar((i) => i.seccion || 'sin sección').map(([s, n]) => `${s} ${n}`).join(', ') || 'ninguna'}`);
    const sinRedactar = salen.filter((i) => !i.conNota).length;
    if (sinRedactar) lineas.push(`Elegidas sin redactar todavía: ${sinRedactar}`);
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

    // Limpieza diaria de la base (REGLAS § 8). Si falla, el resumen sigue.
    try { await db.podar(env, c.ahoraISO); } catch (e) { console.error(`podar: ${e.message}`); }

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
    // Las migradas sin foto que faltan rehacer (REGLAS § 7 ter). Si la consulta falla, /salud sigue.
    let rehacer = null;
    try {
      const cuenta = await db.contarRehacerFotos(env);
      const topeRehacer = numero(env.NUCLEO_REHACER_POR_DIA, REHACER_POR_DIA);
      const hechasHoy = (await db.usoDelDia(env, `rehacer-${c.dia}`)).reduce((s, f) => s + f.pedidos, 0);
      rehacer = { ...cuenta, hechasHoy, topePorDia: topeRehacer, diasQueFaltan: topeRehacer ? Math.ceil(cuenta.faltan / topeRehacer) : null };
    } catch (e) { console.error(`salud rehacer: ${e.message}`); }
    // Las notas de los últimos 7 días sin foto, por motivo (Hernán, 6/11: saber la causa real). Si la consulta falla, /salud sigue.
    let sinFoto7d = null;
    try { sinFoto7d = await db.contarSinFotoPorMotivo(env, new Date(new Date(c.ahoraISO).getTime() - 7 * 86400000).toISOString()); } catch (e) { console.error(`salud sinFoto: ${e.message}`); }
    // Las ilustraciones con IA (REGLAS § 7, paso 3): cuántas hay, cuántas imágenes se hicieron hoy y los topes. Si la consulta falla, /salud sigue.
    let ilustraciones = null;
    try {
      const cuenta = await db.contarIlustradas(env, new Date(new Date(c.ahoraISO).getTime() - 7 * 86400000).toISOString());
      const imagenesHoy = (await db.usoDelDia(env, `ilustrar-${c.dia}`)).reduce((s, f) => s + f.pedidos, 0);
      const ult = estados.find((e) => e.fuente_id === '_ilustracion');
      ilustraciones = { activas: !!(env.FOTOS && env.AI), total: cuenta.total, ultimos7d: cuenta.desde, imagenesHoy, topePorDia: Math.floor(numero(env.NUCLEO_ILUSTRAR_POR_DIA, ILUSTRAR_POR_DIA)), topePorVuelta: Math.floor(numero(env.NUCLEO_ILUSTRAR_POR_VUELTA, ILUSTRAR_POR_VUELTA)), ultimoError: ult?.ultima_falla ? String(ult.ultima_falla).slice(0, 200) : null };
    } catch (e) { console.error(`salud ilustraciones: ${e.message}`); }
    // Las fotos de archivo (REGLAS § 7, paso 2 bis): cuántas hay, cuántas se pusieron hoy y el último error. Si la consulta falla, /salud sigue.
    let fotosDeArchivo = null;
    try {
      const cuenta = await db.contarFotosDeArchivo(env, new Date(new Date(c.ahoraISO).getTime() - 7 * 86400000).toISOString());
      const hoy = await db.huellasDeArchivoDesde(env, rangoDelDia(c.dia).desde);
      const ult = estados.find((e) => e.fuente_id === '_archivo_foto');
      const tope = Math.floor(numero(env.NUCLEO_ARCHIVO_POR_VUELTA, ARCHIVO_POR_VUELTA));
      fotosDeArchivo = { activas: !!env.FOTOS && tope > 0, total: cuenta.total, ultimos7d: cuenta.desde, hoy: hoy.size, topePorVuelta: tope, ultimoError: ult?.ultima_falla ? String(ult.ultima_falla).slice(0, 200) : null };
    } catch (e) { console.error(`salud fotosDeArchivo: ${e.message}`); }
    // Cómo viene la selección del día: notas publicadas, nacionales contra el cupo de esta hora y por qué quedó afuera cada historia. Si falla, /salud sigue.
    let seleccion = null;
    try {
      const s = await db.seleccionEntre(env, desde, hasta);
      const tope = numero(env.NUCLEO_TOPE_NACIONAL, 100);
      seleccion = { ...s, nacionalesHoy: await db.contarNacionalesEntre(env, desde, hasta), cupoNacionalAhora: cupoNacional(tope, c.ahora), topeNacional: tope, minimoNacional: minimoDelDia(numero(env.NUCLEO_MINIMO_NACIONAL, 3), numero(env.NUCLEO_MINIMO_NACIONAL_FINDE, 0), c.ahora) };
    } catch (e) { console.error(`salud seleccion: ${e.message}`); }
    const ultima = estados.find((e) => e.fuente_id === '_vuelta');
    // Sólo las fuentes que hoy están activas: las apagadas dejan su última falla en la base y no son un problema (5/11/2026).
    const activasHoy = new Set(fuentes.map((f) => f.id));
    const reales = estados.filter((e) => e.fuente_id !== '_vuelta' && activasHoy.has(e.fuente_id));
    return json({
      ahora: c.ahoraISO,
      dia: c.dia,
      ultimaVuelta: ultima ? ultima.ultimo_ok : null,
      hoy,
      seleccion,
      publicando: publica(env),
      fuentes: {
        activas: fuentes.length,
        // ultimaFalla: cuándo y por qué (texto del error, ya recortado al guardarse; acá otra vez a 120 por las dudas). Sin secretos: son códigos HTTP y mensajes de red.
        conFalla: reales.filter((e) => e.fallas_seguidas > 0).map((e) => ({ id: e.fuente_id, fallasSeguidas: e.fallas_seguidas, ultimoOk: e.ultimo_ok, ultimaFalla: e.ultima_falla ? String(e.ultima_falla).slice(0, 120) : null })),
      },
      uso: {
        hoy: usoHoy,
        mes: { ...usoMes, gastoEstimadoUsd: Number(costoEstimado(usoMes).toFixed(4)), frenoUsd: FRENO_MENSUAL_USD },
        topeDiario: numero(env.NUCLEO_TOPE_DIARIO, 150),
      },
      rehacerMigradas: rehacer,
      ilustraciones,
      fotosDeArchivo,
      sinFoto7d,
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
