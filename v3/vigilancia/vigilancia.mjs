// Radar 3.0, etapa F: la vigilancia. Lógica pura e inyectable (sin red, sin Cloudflare): worker.mjs la conecta con los Workers y el KV
// de verdad, y vigilancia.test.mjs la prueba con falsos. Las reglas, en palabras de persona, están en REGLAS.md.

export const MINUTOS_SIN_VUELTA = 40;        // el núcleo tiene que haber hecho una vuelta en los últimos 40 minutos
export const UMBRAL_DE_GASTO = 0.8;          // se avisa al 80 % del freno mensual de IA
export const FALLAS_DE_TRES_DIAS = 288;      // 3 días × 96 vueltas (una cada 15 minutos)
export const FALLAS_SI_NUNCA_ANDUVO = 96;    // una fuente que nunca anduvo bien: un día entero de fallas
export const MINUTOS_WEBHOOK_VIEJO = 45;     // el bot revisa su webhook cada 15 minutos; tres revisiones sin novedad es mucho
export const LARGO_DE_MENSAJE = 3500;
export const CONFIRMAR_SI_NO_RESPONDE = 2;   // «no responde» tiene que verse en dos chequeos seguidos (una hora) antes de avisar

// ---------------------------------------------------------------------------------------------- tiempo y formato

const MS_HORA_BALCARCE = 3 * 3600 * 1000; // Balcarce es UTC-3 todo el año
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const aBalcarce = (iso) => new Date(new Date(iso).getTime() - MS_HORA_BALCARCE);
export const diaDeBalcarce = (iso) => aBalcarce(iso).toISOString().slice(0, 10);
export const horaDeBalcarce = (iso) => aBalcarce(iso).getUTCHours();
const dosCifras = (n) => String(n).padStart(2, '0');
export const horaCorta = (iso) => { const d = aBalcarce(iso); return `${dosCifras(d.getUTCHours())}:${dosCifras(d.getUTCMinutes())}`; };
export const fechaCorta = (iso) => { const d = aBalcarce(iso); return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`; };
const fechaLarga = (iso) => { const d = aBalcarce(iso); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`; };

export const usd = (n) => `US$ ${(Number(n) || 0).toFixed(2).replace('.', ',')}`;
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/** Parte líneas en mensajes de hasta `max` caracteres, sin cortar una línea (una más larga se corta a la fuerza). */
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

// ---------------------------------------------------------------------------------------------- qué está mal

/**
 * Mira lo que contestaron los Workers y devuelve la lista de problemas de este momento. Función pura.
 *   nucleo: { ok, salud }   la respuesta de GET /salud del núcleo
 *   bot:    { ok, salud }   la del bot de Telegram
 *   sitio:  null | { ok }   el sitio, si está conectado
 * Cada problema: { clave, texto, confirmar (en cuántos chequeos seguidos tiene que verse), silencioso (no se avisa que volvió), mes }.
 */
export function evaluar({ ahora, nucleo, bot, sitio = null, direccionDelBot }) {
  const problemas = [];
  const t = new Date(ahora).getTime();
  const minutos = (iso) => (t - new Date(iso).getTime()) / 60000;

  // El núcleo
  if (!nucleo?.ok || !nucleo.salud) {
    problemas.push({ clave: 'nucleo-no-responde', texto: 'El núcleo (radar-nucleo) no contesta.', confirmar: CONFIRMAR_SI_NO_RESPONDE });
  } else {
    const s = nucleo.salud;
    const v = s.ultimaVuelta;
    const pasaron = v && !Number.isNaN(new Date(v).getTime()) ? minutos(v) : null;
    if (pasaron === null) {
      problemas.push({ clave: 'nucleo-vuelta', texto: 'El núcleo todavía no registra ninguna vuelta.', confirmar: 1 });
    } else if (pasaron > MINUTOS_SIN_VUELTA) {
      problemas.push({ clave: 'nucleo-vuelta', texto: `El núcleo no hace una vuelta desde las ${horaCorta(v)} (hace ${Math.round(pasaron)} minutos; tendría que hacer una cada 15).`, confirmar: 1 });
    }

    const mes = s.uso?.mes;
    if (mes && mes.frenoUsd > 0 && typeof mes.gastoEstimadoUsd === 'number') {
      const parte = mes.gastoEstimadoUsd / mes.frenoUsd;
      if (parte >= UMBRAL_DE_GASTO) {
        problemas.push({
          clave: 'gasto',
          texto: `El gasto estimado de IA del mes llegó a ${usd(mes.gastoEstimadoUsd)} de ${usd(mes.frenoUsd)} (${Math.round(parte * 100)} %). Al llegar al freno el núcleo deja de redactar.`,
          confirmar: 1, silencioso: true, mes: String(s.dia || ahora).slice(0, 7),
        });
      }
    }

    for (const f of s.fuentes?.conFalla ?? []) {
      const tope = f.ultimoOk ? FALLAS_DE_TRES_DIAS : FALLAS_SI_NUNCA_ANDUVO;
      if (f.fallasSeguidas >= tope) {
        const dias = Math.max(1, Math.floor(f.fallasSeguidas / 96));
        problemas.push({ clave: `fuente:${f.id}`, texto: `La fuente ${f.id} falla hace ${plural(dias, 'día', 'días')}.`, confirmar: 1 });
      }
    }
  }

  // El bot
  if (!bot?.ok || !bot.salud || !bot.salud.token) {
    problemas.push({
      clave: 'bot',
      texto: bot?.ok && bot.salud && !bot.salud.token ? 'El bot de Telegram no tiene su token cargado.' : 'El bot de Telegram (radar-telegram) no responde.',
      confirmar: CONFIRMAR_SI_NO_RESPONDE,
    });
  } else {
    const w = bot.salud.webhook;
    const esperado = direccionDelBot ? `${direccionDelBot}/telegram` : null;
    if (!w || !w.url) {
      problemas.push({ clave: 'webhook', texto: 'Telegram no tiene registrado el webhook del bot (no le llegarían los mensajes).', confirmar: 1 });
    } else if (esperado && w.url !== esperado) {
      problemas.push({ clave: 'webhook', texto: 'Telegram tiene registrada otra dirección para el bot, distinta de la nuestra.', confirmar: 1 });
    } else if (w.cuando && minutos(w.cuando) > MINUTOS_WEBHOOK_VIEJO) {
      problemas.push({ clave: 'webhook', texto: `El bot no revisa su webhook desde las ${horaCorta(w.cuando)} (tendría que hacerlo cada 15 minutos).`, confirmar: 1 });
    }
  }

  // El sitio, si ya está conectado
  if (sitio && !sitio.ok) problemas.push({ clave: 'sitio', texto: 'El sitio (radar-sitio) no contesta.', confirmar: CONFIRMAR_SI_NO_RESPONDE });

  return problemas;
}

/**
 * Compara los problemas de ahora con los que ya se conocían. Función pura.
 *   previo: { [clave]: { desde, vistas, avisado, texto, silencioso, mes, mailEnviado, confirmar, resuelto } }
 * Devuelve el estado nuevo (todavía sin marcar nada como avisado), los problemas para avisar ahora y los que se arreglaron.
 * Un problema se avisa una sola vez: mientras siga abierto y avisado, no vuelve a molestar.
 */
export function decidirAvisos(previo, problemas, ahoraISO) {
  const estado = {};
  const nuevos = [];
  const base = previo && typeof previo === 'object' ? previo : {};
  for (const p of problemas) {
    let antes = base[p.clave];
    // El gasto es del mes: si cambió el mes, es otro problema.
    if (antes && p.mes && antes.mes && antes.mes !== p.mes) antes = undefined;
    const e = {
      desde: antes?.desde ?? ahoraISO, vistas: (antes?.vistas ?? 0) + 1, avisado: Boolean(antes?.avisado),
      texto: p.texto, silencioso: Boolean(p.silencioso), mes: p.mes, mailEnviado: Boolean(antes?.mailEnviado), confirmar: p.confirmar ?? 1,
    };
    estado[p.clave] = e;
    if (!e.avisado && e.vistas >= e.confirmar) nuevos.push({ clave: p.clave, ...e });
  }
  const arreglados = [];
  for (const [clave, e] of Object.entries(base)) {
    if (estado[clave]) continue;
    if (e.avisado && !e.silencioso) arreglados.push({ clave, ...e });
  }
  return { estado, nuevos, arreglados };
}

const ARREGLOS = {
  'nucleo-no-responde': 'el núcleo contesta de nuevo.',
  'nucleo-vuelta': 'el núcleo volvió a hacer vueltas.',
  bot: 'el bot de Telegram responde de nuevo.',
  webhook: 'el webhook del bot está registrado de nuevo.',
  sitio: 'el sitio contesta de nuevo.',
};

/** El «volvió a andar» de un problema arreglado. */
export function textoDeArreglo(clave) {
  if (clave.startsWith('fuente:')) return `la fuente ${clave.slice(7)} volvió a andar.`;
  return ARREGLOS[clave] ?? `${clave} volvió a andar.`;
}

const abierto = (e) => e.vistas >= e.confirmar && !e.resuelto;

// ---------------------------------------------------------------------------------------------- el chequeo de cada 30 minutos

/**
 * Un chequeo completo. Todo lo de afuera llega por `deps`:
 *   ahora()             ISO de este momento
 *   traer()             → { nucleo, bot, sitio }  (lo que contestaron los Workers)
 *   direccionDelBot     la dirección pública del bot
 *   leer(clave)/guardar(clave, valor)   el KV (JSON)
 *   decir(textos)       → true si Telegram los mandó
 *   mail(asunto, texto) → true si el mail salió
 */
export async function chequear(deps) {
  const ahora = deps.ahora();
  const { nucleo, bot, sitio } = await deps.traer();
  const problemas = evaluar({ ahora, nucleo, bot, sitio, direccionDelBot: deps.direccionDelBot });
  const previo = (await deps.leer('problemas')) ?? {};
  const { estado, nuevos, arreglados } = decidirAvisos(previo, problemas, ahora);

  const botCaido = Boolean(estado.bot && estado.bot.vistas >= estado.bot.confirmar);
  const resultado = { ahora, problemas: problemas.length, avisados: [], arreglados: [], mail: null };

  // Por Telegram, salvo que el bot esté caído (intentarlo no sirve: ahí va el mail).
  let enviado = false;
  if (!botCaido && (nuevos.length || arreglados.length)) {
    const lineas = [];
    if (nuevos.length) {
      lineas.push(`Radar 3.0 (prueba): ${nuevos.length === 1 ? 'hay un problema' : `hay ${nuevos.length} problemas`}`);
      for (const n of nuevos) lineas.push(`· ${n.texto}`);
    }
    if (arreglados.length) {
      if (lineas.length) lineas.push('');
      for (const a of arreglados) lineas.push(`Volvió a andar: ${textoDeArreglo(a.clave)}`);
    }
    try { enviado = await deps.decir(partirEnMensajes(lineas)); } catch (e) { console.error(`decir: ${e.message}`); }
    if (enviado) {
      for (const n of nuevos) estado[n.clave].avisado = true;
      resultado.avisados = nuevos.map((n) => n.clave);
      resultado.arreglados = arreglados.map((a) => a.clave);
    }
  }
  if (!enviado) {
    // Lo que se arregló no se pierde: se vuelve a decir en el próximo chequeo que Telegram funcione.
    for (const a of arreglados) { const { clave, ...resto } = a; estado[clave] = { ...resto, resuelto: true }; }
  }

  // El bot no responde: mail al dueño, una sola vez por caída.
  if (botCaido && !estado.bot.mailEnviado) {
    const e = estado.bot;
    const abiertos = Object.values(estado).filter(abierto).map((x) => `· ${x.texto}`);
    const cuerpo = [
      'El bot de Telegram de Radar 3.0 no responde, así que no puedo avisarte por ahí.',
      '', 'Lo que está mal ahora:', ...abiertos, '',
      `Se detectó a las ${horaCorta(e.desde)} del ${fechaCorta(e.desde)}. Cuando el bot vuelva, te aviso por Telegram.`,
    ].join('\n');
    let salio = false;
    try { salio = await deps.mail('Radar 3.0: el bot de Telegram no responde', cuerpo); } catch (x) { console.error(`mail: ${x.message}`); }
    resultado.mail = salio;
    if (salio) { e.mailEnviado = true; e.avisado = true; resultado.avisados.push('bot'); }
  }

  await deps.guardar('problemas', estado);
  const abiertos = Object.entries(estado).filter(([, e]) => abierto(e)).map(([clave, e]) => ({ clave, texto: e.texto, desde: e.desde, avisado: e.avisado }));
  const mes = nucleo?.salud?.uso?.mes ?? null;
  await deps.guardar('chequeo', {
    cuando: ahora, ok: abiertos.length === 0, problemas: abiertos,
    nucleo: { responde: Boolean(nucleo?.ok), ultimaVuelta: nucleo?.salud?.ultimaVuelta ?? null },
    bot: { responde: Boolean(bot?.ok && bot.salud?.token) },
    gasto: mes ? { mesUsd: mes.gastoEstimadoUsd ?? null, frenoUsd: mes.frenoUsd ?? null } : null,
  });
  return resultado;
}

// ---------------------------------------------------------------------------------------------- el informe de las 8 y las 20

/** Gasto del día en US$, de las filas de uso del día (o del campo ya calculado, si el núcleo lo trae). */
export function gastoDelDia(uso) {
  const hoy = uso?.hoy;
  if (hoy && typeof hoy.gastoEstimadoUsd === 'number') return { usd: hoy.gastoEstimadoUsd, pedidos: hoy.pedidos ?? 0 };
  const filas = Array.isArray(hoy) ? hoy : [];
  const ent = filas.reduce((s, f) => s + (f.tokens_entrada || 0), 0);
  const sal = filas.reduce((s, f) => s + (f.tokens_salida || 0), 0);
  // Mismos precios que el núcleo (PRECIO_ENTRADA_POR_MILLON y PRECIO_SALIDA_POR_MILLON en nucleo.mjs).
  return { usd: (ent / 1e6) * 0.10 + (sal / 1e6) * 0.40, pedidos: filas.reduce((s, f) => s + (f.pedidos || 0), 0) };
}

/** Las notas del núcleo desde `desdeISO`, separadas en las que salen y las frenadas (con su motivo). */
export function resumirNotas(notas, desdeISO) {
  const d = new Date(desdeISO).getTime();
  const salen = [];
  const frenadas = [];
  for (const n of notas) {
    if (new Date(n.creada).getTime() < d) continue;
    (n.noPublicar ? frenadas : salen).push(n);
  }
  const porSeccion = {};
  for (const n of salen) { const s = n.seccion || 'sin sección'; porSeccion[s] = (porSeccion[s] || 0) + 1; }
  const motivos = {};
  for (const n of frenadas) { const m = String(n.noPublicar.motivo || 'sin motivo').trim().slice(0, 120); motivos[m] = (motivos[m] || 0) + 1; }
  return {
    salen: salen.length, frenadas: frenadas.length,
    porSeccion: Object.entries(porSeccion).sort((a, b) => b[1] - a[1]),
    motivos: Object.entries(motivos).sort((a, b) => b[1] - a[1]),
    // Mientras no haya corte, todo lo que sale es borrador: se dice «habría publicado».
    enPrueba: salen.every((n) => n.estado === 'borrador'),
  };
}

/**
 * El texto del informe, en líneas. Función pura.
 *   nucleo: { ok, salud }, notas: null | array (null = no se pudieron leer), problemas: [{texto}] abiertos ahora.
 */
export function armarInforme({ ahora, desde, nucleo, notas, problemas = [] }) {
  const hora = horaDeBalcarce(ahora);
  const lineas = [`Radar 3.0 (prueba): informe de las ${hora}:00, ${fechaLarga(ahora)}`];
  lineas.push(`Desde el informe anterior (${fechaCorta(desde)} ${horaCorta(desde)}).`);
  lineas.push('');

  const salud = nucleo?.ok ? nucleo.salud : null;
  if (notas) {
    const r = resumirNotas(notas, desde);
    const verbo = r.enPrueba ? 'habría publicado' : 'publicó';
    lineas.push(r.salen
      ? `Notas: el núcleo ${verbo} ${plural(r.salen, 'nota', 'notas')} (${r.porSeccion.map(([s, n]) => `${s} ${n}`).join(', ')}).`
      : `Notas: el núcleo no ${verbo} ninguna.`);
    if (r.frenadas) {
      lineas.push(`Frenó ${plural(r.frenadas, 'nota', 'notas')}:`);
      for (const [m, n] of r.motivos) lineas.push(`· ${m}${n > 1 ? ` (${n})` : ''}`);
    } else {
      lineas.push('No frenó ninguna nota.');
    }
  } else {
    lineas.push('Notas: no pude leerlas del núcleo.');
  }

  if (salud?.uso) {
    const dia = gastoDelDia(salud.uso);
    const mes = salud.uso.mes;
    const partes = [`hoy ${usd(dia.usd)} (${plural(dia.pedidos, 'pedido', 'pedidos')})`];
    if (mes) {
      const pct = mes.frenoUsd > 0 ? ` (${Math.round((mes.gastoEstimadoUsd / mes.frenoUsd) * 100)} % del freno de ${usd(mes.frenoUsd)})` : '';
      partes.push(`en el mes ${usd(mes.gastoEstimadoUsd)}${pct}`);
    }
    lineas.push(`Gasto de IA (estimado): ${partes.join(', ')}.`);
  }

  if (salud) {
    const caidas = (salud.fuentes?.conFalla ?? []).filter((f) => f.fallasSeguidas >= (f.ultimoOk ? FALLAS_DE_TRES_DIAS : FALLAS_SI_NUNCA_ANDUVO));
    lineas.push(caidas.length ? `Fuentes caídas hace 3 días o más (${caidas.length}): ${caidas.map((f) => f.id).join(', ')}.` : 'Fuentes caídas: ninguna.');
  }

  lineas.push('');
  if (problemas.length) {
    lineas.push('Para mirar:');
    for (const p of problemas) lineas.push(`· ${p.texto}`);
  } else if (!salud || !notas) {
    lineas.push('No pude revisar todo: el núcleo no contestó.');
  } else {
    lineas.push('Todo en orden.');
  }
  return lineas;
}

/** Los días de Balcarce (AAAA-MM-DD) que cubre la ventana, de a lo sumo tres (los más recientes). */
export function diasDeLaVentana(desdeISO, hastaISO) {
  const hasta = diaDeBalcarce(hastaISO);
  const dias = [];
  let t = new Date(hastaISO).getTime();
  while (dias.length < 3) {
    const dia = diaDeBalcarce(new Date(t).toISOString());
    if (dia < diaDeBalcarce(desdeISO)) break;
    dias.unshift(dia);
    t -= 24 * 3600 * 1000;
  }
  return dias.length ? dias : [hasta];
}

/**
 * El informe de las 8 o las 20. `deps` es lo mismo que en `chequear` más:
 *   traerNotas(dia) → array | null
 * El momento del último informe queda en el KV (`informe`) sólo si Telegram lo mandó.
 */
export async function informar(deps) {
  const ahora = deps.ahora();
  const previo = await deps.leer('informe');
  const desde = previo?.cuando && !Number.isNaN(new Date(previo.cuando).getTime()) ? previo.cuando : new Date(new Date(ahora).getTime() - 12 * 3600 * 1000).toISOString();
  const { nucleo } = await deps.traer();
  let notas = null;
  if (nucleo?.ok) {
    notas = [];
    for (const dia of diasDeLaVentana(desde, ahora)) {
      const del = await deps.traerNotas(dia);
      if (del === null) { notas = null; break; }
      notas.push(...del);
    }
  }
  const problemas = Object.values((await deps.leer('problemas')) ?? {}).filter(abierto).map((e) => ({ texto: e.texto }));
  const mensajes = partirEnMensajes(armarInforme({ ahora, desde, nucleo, notas, problemas }));
  let enviado = false;
  try { enviado = await deps.decir(mensajes); } catch (e) { console.error(`informe: ${e.message}`); }
  if (enviado) await deps.guardar('informe', { cuando: ahora });
  return { ahora, desde, mensajes: mensajes.length, enviado };
}

// ---------------------------------------------------------------------------------------------- el mail

const aBase64 = (texto) => {
  const bytes = new TextEncoder().encode(texto);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const partirBase64 = (b64) => b64.match(/.{1,76}/g)?.join('\r\n') ?? '';

/** El mensaje de mail crudo (MIME), con asunto y cuerpo en UTF-8. */
export function armarMime({ de, para, asunto, texto, fecha = new Date(), id = crypto.randomUUID() }) {
  return [
    `From: Radar Balcarce <${de}>`,
    `To: ${para}`,
    `Subject: =?UTF-8?B?${aBase64(asunto)}?=`,
    `Date: ${new Date(fecha).toUTCString()}`,
    `Message-ID: <${id}@${de.split('@')[1] || 'radarbalcarce.com'}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    partirBase64(aBase64(texto)),
    '',
  ].join('\r\n');
}

/**
 * Manda un mail al dueño por el binding `EMAIL` (Cloudflare Email Routing). Sin binding no rompe: lo anota en el log y devuelve false.
 * `claseDeMensaje` es EmailMessage de «cloudflare:email»; se pasa en las pruebas, donde ese módulo no existe.
 */
export async function mandarMail(env, asunto, texto, { claseDeMensaje, ahora = new Date() } = {}) {
  if (!env?.EMAIL?.send) { console.error('mail: no hay binding EMAIL (falta activar Email Routing); no se mandó el aviso por mail.'); return false; }
  const para = env.MAIL_PARA || 'radarbalcarce@gmail.com';
  const de = env.MAIL_DE || 'vigilancia@radarbalcarce.com';
  try {
    const Clase = claseDeMensaje ?? (await import('cloudflare:email')).EmailMessage;
    await env.EMAIL.send(new Clase(de, para, armarMime({ de, para, asunto, texto, fecha: ahora })));
    return true;
  } catch (e) {
    console.error(`mail: ${e.message}`);
    return false;
  }
}
