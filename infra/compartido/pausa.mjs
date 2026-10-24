// La PAUSA GENERAL: el botón de emergencia que frena toda la publicación automática (24/10/2026, regla 317, PENDIENTES.md C8).
//
// Un solo interruptor, un solo archivo en el depósito R2 del motor (`radar-motor`, clave `pausa/estado.json`). Lo prende y lo apaga una persona desde el
// panel del celular (por el reloj: infra/reloj-cloudflare/panel-api.mjs) y lo LEEN, al empezar, todos los que podrían publicar algo:
//
//   · el reloj, al principio de cada minuto: no pide ni la vuelta del motor ni las tareas que frena (TRABAJOS_QUE_FRENA);
//   · el Worker de tareas: aunque alguien se las pida por fuera del reloj, no corre redes, auditoría IA, pistas ni ilustraciones (TAREAS_QUE_FRENA);
//   · la vuelta del motor, en Workers Builds: si arranca igual (un push, el botón de Cloudflare), termina en segundos sin armar ni publicar nada;
//   · el vigilante y el informe diario: avisan «en pausa desde X por Y» (y no confunden la pausa con una web rota).
//
// QUÉ FRENA: la web nueva (no entra ninguna nota; el sitio ya publicado sigue sirviéndose entero), las redes (nada sale a Facebook ni a Instagram),
// y todo lo que gasta IA por su cuenta (la lectura de la vuelta, la auditoría, las pistas, las ilustraciones, la revisión del archivo).
// QUÉ NO FRENA, a propósito: la vigilancia y el informe diario (son los que avisan), los respaldos, el reloj mismo y el panel del celular.
//
// Si el depósito no se puede leer, NO se asume pausa (`lecturaFallida`): si R2 está caído tampoco anda el resto, y una pausa fantasma sería peor que
// una publicación de más. Sin dependencias: corre igual en un Worker y en Node (los dos lados le pasan cómo leer y cómo escribir).

export const CLAVE_DE_LA_PAUSA = 'pausa/estado.json';

/** Los workflows (los nombres que usa el reloj) que la pausa frena. El motor y todo lo que publica o gasta IA. */
export const TRABAJOS_QUE_FRENA = ['actualizar.yml', 'redes.yml', 'auditoria-ia.yml', 'pistas.yml', 'ilustrar-notas.yml', 'revisar-archivo.yml'];
/** Los que la pausa NO frena nunca: los que vigilan y avisan. */
export const TRABAJOS_QUE_NO_FRENA = ['vigilancia.yml', 'informe-diario.yml'];
/** Las tareas del Worker de tareas que la pausa frena (el nombre de cada una en infra/tareas-cloudflare/tareas.mjs). */
export const TAREAS_QUE_FRENA = ['redes', 'auditoria-ia', 'pistas', 'ilustrar-notas'];

/** Cuántas veces se prendió o apagó se recuerdan en el archivo. */
export const HISTORIAL_DE_LA_PAUSA = 20;
export const LARGO_DEL_MOTIVO = 200;
export const LARGO_DEL_NOMBRE = 40;

/** Minutos después de reanudar en que el vigilante no se alarma por lo que quedó atrasado durante la pausa. */
export const MINUTOS_DE_GRACIA_DESPUES_DE_REANUDAR = 180;

export const estadoVacio = () => ({
  version: 1, pausada: false, desde: null, por: null, login: null, motivo: null, ultima: null, historial: [],
});

const limpiar = (t, largo) => String(t ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, largo);
const esFecha = (t) => typeof t === 'string' && Number.isFinite(Date.parse(t));

/** Lo guardado (texto o objeto) como un estado con todos sus campos; lo roto o ajeno es «sin pausa». */
export function normalizar(crudo) {
  let j = crudo;
  if (typeof crudo === 'string') { try { j = JSON.parse(crudo); } catch { j = null; } }
  if (!j || typeof j !== 'object' || Array.isArray(j)) return estadoVacio();
  const pausada = j.pausada === true && esFecha(j.desde);
  const ultima = j.ultima && typeof j.ultima === 'object' && esFecha(j.ultima.hasta)
    ? {
      desde: esFecha(j.ultima.desde) ? j.ultima.desde : null, hasta: j.ultima.hasta,
      por: limpiar(j.ultima.por, LARGO_DEL_NOMBRE) || null, reanudadaPor: limpiar(j.ultima.reanudadaPor, LARGO_DEL_NOMBRE) || null, motivo: limpiar(j.ultima.motivo, LARGO_DEL_MOTIVO) || null,
    } : null;
  return {
    version: 1,
    pausada,
    desde: pausada ? j.desde : null,
    por: pausada ? (limpiar(j.por, LARGO_DEL_NOMBRE) || 'alguien') : null,
    login: pausada ? (limpiar(j.login, LARGO_DEL_NOMBRE) || null) : null,
    motivo: pausada ? (limpiar(j.motivo, LARGO_DEL_MOTIVO) || null) : null,
    ultima,
    historial: (Array.isArray(j.historial) ? j.historial : [])
      .filter((h) => h && typeof h === 'object' && ['pausa', 'reanudar'].includes(h.accion) && esFecha(h.cuando))
      .map((h) => ({ accion: h.accion, cuando: h.cuando, por: limpiar(h.por, LARGO_DEL_NOMBRE) || null, ...(h.motivo ? { motivo: limpiar(h.motivo, LARGO_DEL_MOTIVO) } : {}) }))
      .slice(-HISTORIAL_DE_LA_PAUSA),
  };
}

/**
 * Lee la pausa. `leer(clave)` devuelve el texto o null (un R2 por binding o por S3). Nunca tira: si no se puede leer devuelve «sin pausa» con
 * `lecturaFallida: true` para que quien quiera lo diga.
 */
export async function leerPausa(leer) {
  if (typeof leer !== 'function') return { ...estadoVacio(), lecturaFallida: true };
  try { return normalizar(await leer(CLAVE_DE_LA_PAUSA)); } catch { return { ...estadoVacio(), lecturaFallida: true }; }
}

/** Cómo leer de un binding R2 de un Worker (`env.MOTOR`). Sin binding, nada que leer. */
export const lectorDeBinding = (deposito) => (deposito
  ? async (clave) => { const o = await deposito.get(clave); return o ? o.text() : null; }
  : null);
/** Cómo escribir en un binding R2. */
export const escritorDeBinding = (deposito) => async (clave, texto) => { await deposito.put(clave, texto, { httpMetadata: { contentType: 'application/json' } }); };
/** Cómo leer de un cliente R2 por S3 (infra/compartido/r2-s3.mjs: la vuelta del motor en Workers Builds). */
export const lectorDeS3 = (cliente) => (cliente?.leerTexto ? (clave) => cliente.leerTexto(clave) : null);

/** Prende la pausa. Si ya estaba prendida no cambia nada (conserva quién y desde cuándo) y lo dice con `yaEstaba`. */
export function pausar(estado, { por, login = null, motivo = '', ahora = new Date() } = {}) {
  const e = normalizar(estado);
  if (e.pausada) return { estado: e, yaEstaba: true };
  const quien = limpiar(por, LARGO_DEL_NOMBRE) || limpiar(login, LARGO_DEL_NOMBRE) || 'alguien';
  const razon = limpiar(motivo, LARGO_DEL_MOTIVO);
  const cuando = ahora.toISOString();
  return {
    estado: {
      ...e, pausada: true, desde: cuando, por: quien, login: limpiar(login, LARGO_DEL_NOMBRE) || null, motivo: razon || null,
      historial: [...e.historial, { accion: 'pausa', cuando, por: quien, ...(razon ? { motivo: razon } : {}) }].slice(-HISTORIAL_DE_LA_PAUSA),
    },
    yaEstaba: false,
  };
}

/** Apaga la pausa. Si no estaba prendida no cambia nada (`yaEstaba: true` quiere decir «ya estaba sin pausa»). */
export function reanudar(estado, { por, ahora = new Date() } = {}) {
  const e = normalizar(estado);
  if (!e.pausada) return { estado: e, yaEstaba: true };
  const quien = limpiar(por, LARGO_DEL_NOMBRE) || 'alguien';
  const cuando = ahora.toISOString();
  return {
    estado: {
      ...e, pausada: false, desde: null, por: null, login: null, motivo: null,
      ultima: { desde: e.desde, hasta: cuando, por: e.por, reanudadaPor: quien, motivo: e.motivo },
      historial: [...e.historial, { accion: 'reanudar', cuando, por: quien }].slice(-HISTORIAL_DE_LA_PAUSA),
    },
    yaEstaba: false,
  };
}

/** Guarda el estado con el escritor que se le pase (`escritorDeBinding`, o `(clave, texto) => cliente.guardar(...)`). */
export async function guardarPausa(escribir, estado) {
  await escribir(CLAVE_DE_LA_PAUSA, `${JSON.stringify(normalizar(estado), null, 1)}\n`);
}

/** ¿La pausa frena este workflow del reloj? */
export const frenaA = (archivo) => TRABAJOS_QUE_FRENA.includes(archivo);
/** ¿La pausa frena esta tarea del Worker de tareas? */
export const frenaALaTarea = (nombre) => TAREAS_QUE_FRENA.includes(nombre);

/** De una lista de trabajos del reloj, qué sigue y qué se frena. Sin pausa no se frena nada. */
export function separarPorPausa(trabajos, pausa) {
  if (!pausa?.pausada) return { siguen: trabajos, frenados: [] };
  return { siguen: trabajos.filter((t) => !frenaA(t.archivo)), frenados: trabajos.filter((t) => frenaA(t.archivo)) };
}

/** «24/10 14:05», en hora de Balcarce. */
export function fechaHoraBalcarce(cuando) {
  const t = new Date(cuando);
  if (!Number.isFinite(t.getTime())) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(t).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month} ${String(Number(p.hour) % 24).padStart(2, '0')}:${p.minute}`;
}

/** «hace 25 min», «hace 3 h», «hace 2 días». */
export function haceCuantoTexto(cuando, ahora = new Date()) {
  const t = Date.parse(cuando ?? '');
  if (!Number.isFinite(t)) return '';
  const min = Math.max(0, Math.round((ahora.getTime() - t) / 60000));
  if (min < 2) return 'recién';
  if (min < 90) return `hace ${min} min`;
  if (min < 48 * 60) return `hace ${Math.round(min / 60)} h`;
  return `hace ${Math.round(min / 1440)} días`;
}

/** La frase de siempre: «En pausa desde 24/10 14:05 (hace 2 h) por Hernán: motivo». */
export function textoDeLaPausa(pausa, ahora = new Date()) {
  if (!pausa?.pausada) return 'Sin pausa.';
  const hace = haceCuantoTexto(pausa.desde, ahora);
  return `En pausa desde ${fechaHoraBalcarce(pausa.desde)}${hace ? ` (${hace})` : ''} por ${pausa.por || 'alguien'}${pausa.motivo ? `: ${pausa.motivo}` : ''}`;
}

/** Lo que se muestra a quien pregunta (el panel, el vigilante): el estado sin el historial largo. */
export function vistaPublica(pausa) {
  const p = normalizar(pausa);
  return { pausada: p.pausada, desde: p.desde, por: p.por, motivo: p.motivo, ultima: p.ultima, historial: p.historial.slice(-5) };
}

/** ¿Es un momento en que todavía se perdona lo atrasado por la pausa que terminó? */
export function enGraciaDespuesDeReanudar(pausa, ahora = new Date(), minutos = MINUTOS_DE_GRACIA_DESPUES_DE_REANUDAR) {
  const hasta = Date.parse(pausa?.ultima?.hasta ?? '');
  return !pausa?.pausada && Number.isFinite(hasta) && ahora.getTime() - hasta >= 0 && ahora.getTime() - hasta < minutos * 60000;
}
