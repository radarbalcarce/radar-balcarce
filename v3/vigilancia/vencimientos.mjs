// Radar 3.0: los vencimientos. Una tabla de las cosas que hay que renovar (con su fecha, quién las renueva y cómo) y una función pura que,
// dada la fecha de hoy, dice qué avisos tocan. Sin dependencias ni red: vigilancia.mjs la conecta al chequeo y al KV.
// Reglas en palabras de persona: REGLAS.md § 2 bis y docs/3-0/VIGILANCIA-Y-VENCIMIENTOS.md. NUNCA se inventa una fecha: sin dato, 'desconocida'.
//
// `fecha` puede ser:
//   'AAAA-MM-DD'  una fecha cargada; avisa cuando faltan `avisos` días (30, 14, 7 y 1 por defecto) y, si pasa, avisa que venció (y lo repite cada 7 días);
//   'desconocida' no sabemos cuándo vence: avisa UNA vez por mes pidiendo que alguien mire la fecha y la cargue;
//   'no-vence'    el documento dice que no vence: no avisa nunca (pero figura en la tabla).
// `estimada: true` marca una fecha que sale de una regla documentada y no de la consola del servicio: el aviso lo dice.
// `retirado`: el motivo por el que ya no corre (del sistema viejo): no avisa y no entra en los resúmenes.

export const AVISOS_POR_DEFECTO = Object.freeze([30, 14, 7, 1]);
export const DIAS_DEL_RESUMEN = 60;          // el resumen de los lunes mira estos días hacia adelante
export const REPETIR_VENCIDO_CADA = 7;       // un vencido se vuelve a decir cada 7 días

export const VENCIMIENTOS = Object.freeze([
  {
    clave: 'dominio', nombre: 'Dominio radarbalcarce.com', fecha: '2027-09-21', avisos: [60, 30, 14, 7, 1],
    que: 'El nombre de la web, renovado cada año en DonWeb. Si vence, se cae el sitio y todos los enlaces de las redes.',
    quien: 'Hernán', como: 'Entrar a DonWeb con la cuenta del dominio y pagar la renovación.',
    fuente: 'CLAUDE.md (Cuentas) y docs/08-INFRAESTRUCTURA.md (Vencimientos)',
  },
  {
    clave: 'voces-propias', nombre: 'Las dos voces propias de Gemini (locutora y locutor)', fecha: '2027-09-29', avisos: [60, 30, 14, 7, 1],
    que: 'Las voces de los reels, creadas con Voice Design; Google las borra a los 12 meses. Si vencen, las piezas con voz dejan de salir.',
    quien: 'Claude, con el visto bueno de Hernán', como: 'Crearlas de nuevo con «Crear voces» (reels/crear-voces.mjs) y cambiar los identificadores en CRITERIO-REDES.md § 6.',
    fuente: 'CLAUDE.md (claves de IA), docs/3-0/INFORME-REELS-DINAMICOS.md',
  },
  {
    clave: 'security-txt', nombre: 'security.txt del sitio', fecha: '2027-11-07',
    que: 'El archivo /.well-known/security.txt declara hasta cuándo vale; vencido, los buscadores y los que reportan fallas lo ignoran.',
    quien: 'Claude', como: 'Subir la fecha «Expires» en v3/sitio/vistas/agentes.mjs y desplegar el sitio.',
    fuente: 'v3/sitio/vistas/agentes.mjs, docs/3-0/PENDIENTES-3-0.md',
  },
  {
    clave: 'threads-token', nombre: 'Token de Threads (THREADS_TOKEN)', fecha: 'no-vence',
    que: 'El token de larga duración de Threads vale 60 días, pero desde el 20/11/2026 el Worker de redes lo renueva solo (una vez por día mira si pasaron 30 días). Si la renovación falla dos veces seguidas, o faltan menos de 10 días, la vigilancia avisa por Telegram (no por esta tabla).',
    quien: 'Nadie (se renueva solo)', como: 'Sólo si el aviso de la vigilancia dice que no pudo: generar un token nuevo en la consola de Meta (Threads API, token de larga duración), pegarlo en el secreto THREADS_TOKEN de GitHub y subir «redes» con «Radar 3.0: desplegar».',
    nota: 'Se renueva solo: no tiene fecha fija. Lo vigila evaluarTokenDeThreads (sitio-y-redes.mjs) con lo que informa el Worker en /actividad.',
    fuente: 'v3/redes/threads-token.mjs, v3/redes/REGLAS.md § 25',
  },
  {
    clave: 'reloj-github-token', nombre: 'Llave de GitHub del reloj (RELOJ_GITHUB_TOKEN)', fecha: 'desconocida', avisos: [30, 14, 7, 1],
    que: 'Es la llave con la que el Worker radar-redes despierta, en GitHub, las piezas de redes (reels, historias, clima, repasos) y las fotos propias. Si vence, todo eso para sin ruido.',
    quien: 'Hernán', como: 'GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens: ver «Expires», y si hace falta crear otra con «Actions: lectura y escritura» solo sobre radarbalcarce/radar-balcarce y pegarla en el secreto RELOJ_GITHUB_TOKEN.',
    nota: 'docs/08-INFRAESTRUCTURA.md dice «creado sin vencimiento» (15/10), pero la llave vecina del vigilante, de la misma fecha, venció el 14/11. Nadie confirmó la fecha real.',
    fuente: 'v3/redes/disparar-acciones.mjs, docs/08-INFRAESTRUCTURA.md línea 244',
  },
  {
    clave: 'meta-token', nombre: 'Token de Meta (META_TOKEN: Facebook e Instagram)', fecha: 'no-vence',
    que: 'Token del usuario del sistema «publicador-radar»; según los documentos no vence. Se invalida si se cambia la contraseña o se saca el permiso.',
    quien: 'Hernán', como: 'Si Facebook o Instagram dejan de publicar con «falló N veces seguidas», regenerarlo en Meta Business (usuario del sistema) con todos los permisos, y pegarlo en GitHub.',
    nota: 'Sin vencimiento según CLAUDE.md; no se pudo verificar hoy. La vigilancia ya avisa si la red falla al publicar.',
    fuente: 'CLAUDE.md (Cuentas), docs/08-INFRAESTRUCTURA.md',
  },
  {
    clave: 'cloudflare-api-token', nombre: 'Llave de Cloudflare para desplegar (CLOUDFLARE_API_TOKEN)', fecha: 'desconocida',
    que: 'Con ella el workflow «Radar 3.0: desplegar» sube los Workers, y las fotos propias escriben en R2. Si vence, no se puede desplegar ni copiar fotos.',
    quien: 'Hernán', como: 'Cloudflare → My Profile → API Tokens: ver «Expires on», y si hace falta crear otra con los mismos permisos (Workers, D1, R2, KV) y pegarla en GitHub.',
    nota: 'No hay una fecha en ningún documento.', fuente: '.github/workflows/v3-desplegar.yml, v3-fotos-propias.yml',
  },
  {
    clave: 'radar-github-token', nombre: 'Llave de GitHub del núcleo y los workflows (RADAR_GITHUB_TOKEN)', fecha: 'desconocida',
    que: 'Llave de GitHub guardada como secreto del repositorio (cargada el 22/10/2026). Hay que confirmar si el 3.0 todavía la usa.',
    quien: 'Hernán', como: 'GitHub → Settings → Developer settings → Tokens: ver «Expires». Si Claude confirma que ya no se usa, se borra el secreto y esta línea.',
    nota: 'No hay una fecha en ningún documento.', fuente: 'lista de secretos del repositorio (gh secret list)',
  },
  {
    clave: 'buffer-api-key', nombre: 'Clave de Buffer (BUFFER_API_KEY: TikTok, YouTube Shorts y X)', fecha: 'desconocida',
    que: 'Con ella se programan los videos y posteos de X, TikTok y YouTube. Si deja de valer, esas tres redes paran.',
    quien: 'Hernán', como: 'Buffer → Settings → API: ver si la clave tiene vencimiento y, si hace falta, crear otra y pegarla en el secreto de GitHub.',
    nota: 'No hay una fecha en ningún documento. La vigilancia avisa si X o las otras redes llevan horas sin publicar.', fuente: '.github/workflows/v3-piezas.yml',
  },
  {
    clave: 'vigilante-github-token', nombre: 'Llave «Vigilante de Cloudflare (lectura)» (VIGILANTE_GITHUB_TOKEN)', fecha: '2026-11-14',
    retirado: 'Era del vigilante viejo, ya apagado; el 3.0 no la usa (sólo la nombran workflows viejos). Venció el 14/11/2026 y no hace falta renovarla.',
    que: 'Llave de lectura del sistema viejo.', quien: 'Nadie', como: 'Nada: se puede borrar el secreto cuando se apaguen los workflows viejos.',
    fuente: 'docs/3-0/PENDIENTES-3-0.md § 0 quater',
  },
]);

// ---------------------------------------------------------------------------------------------- cuentas con fechas

const MS_DIA = 24 * 3600 * 1000;
const esFecha = (f) => /^\d{4}-\d{2}-\d{2}$/.test(String(f));
const aUTC = (f) => Date.UTC(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)));

/** Días que faltan desde `hoy` hasta `fecha` (ambas AAAA-MM-DD). Negativo = ya venció. null si alguna no es una fecha. */
export function diasHasta(fecha, hoy) {
  if (!esFecha(fecha) || !esFecha(hoy)) return null;
  return Math.round((aUTC(fecha) - aUTC(hoy)) / MS_DIA);
}

const fechaCorta = (f) => `${Number(f.slice(8, 10))}/${Number(f.slice(5, 7))}/${f.slice(0, 4)}`;
const diaDeLaSemana = (hoy) => new Date(`${hoy}T12:00:00Z`).getUTCDay();
const cuandoTexto = (dias) => (dias < 0 ? `venció hace ${-dias === 1 ? 'un día' : `${-dias} días`}` : dias === 0 ? 'vence hoy' : dias === 1 ? 'vence mañana' : `vence en ${dias} días`);

/** El aviso de un ítem con fecha cargada (o vencido). */
function textoDeAviso(v, dias) {
  const estimada = v.estimada ? ' (fecha estimada, sin confirmar)' : '';
  return `· ${v.nombre}: ${cuandoTexto(dias)} (${fechaCorta(v.fecha)})${estimada}. ${v.que} Lo renueva ${v.quien}: ${v.como}`;
}

/** El aviso mensual de una fecha desconocida. */
function textoDeDesconocida(v) {
  return `· ${v.nombre}: no sabemos cuándo vence. Hay que mirar la fecha y pasársela a Claude para cargarla. ${v.nota ?? ''} Cómo mirarla: ${v.como}`.replace(/\s+/g, ' ');
}

/**
 * Decide qué avisos tocan hoy. Función pura.
 *   tabla: VENCIMIENTOS; hoy: 'AAAA-MM-DD' de Balcarce; estado: lo que guardó la vez anterior ({ items: {...}, resumen: 'AAAA-MM-DD' | null }).
 * Devuelve { avisos: [{ clave, tipo, texto }], resumen: [líneas] | null, estado } con el estado que quedaría SI se mandan los avisos
 * (quien llama lo guarda sólo cuando Telegram los entregó; si no, mañana se vuelve a intentar).
 * Una vez por umbral (el más chico que ya se cumplió), los vencidos cada 7 días, las desconocidas una vez por mes, el resumen los lunes.
 */
export function decidirVencimientos({ tabla = VENCIMIENTOS, hoy, estado }) {
  const previo = estado && typeof estado === 'object' ? estado : {};
  const items = {};
  const avisos = [];
  const mes = hoy.slice(0, 7);
  for (const v of tabla) {
    if (v.retirado || v.fecha === 'no-vence') continue;
    const antes = previo.items?.[v.clave] ?? {};
    if (v.fecha === 'desconocida') {
      const e = { ...antes, fecha: 'desconocida' };
      if (antes.desconocidaMes !== mes) { e.desconocidaMes = mes; avisos.push({ clave: v.clave, tipo: 'desconocida', texto: textoDeDesconocida(v) }); }
      items[v.clave] = e;
      continue;
    }
    const dias = diasHasta(v.fecha, hoy);
    if (dias === null) continue; // fecha mal escrita: la prueba de la tabla lo agarra, acá no se rompe el chequeo
    const e = antes.fecha === v.fecha ? { ...antes } : { fecha: v.fecha }; // otra fecha = se renovó: se empieza de cero
    if (dias < 0) {
      const desde = e.vencidoAvisado ? diasHasta(e.vencidoAvisado, hoy) : null;
      if (desde === null || -desde >= REPETIR_VENCIDO_CADA) { e.vencidoAvisado = hoy; avisos.push({ clave: v.clave, tipo: 'vencido', texto: textoDeAviso(v, dias) }); }
    } else {
      const umbral = [...(v.avisos ?? AVISOS_POR_DEFECTO)].sort((a, b) => a - b).find((u) => dias <= u);
      if (umbral !== undefined && (e.umbral === undefined || umbral < e.umbral)) { e.umbral = umbral; avisos.push({ clave: v.clave, tipo: 'umbral', umbral, texto: textoDeAviso(v, dias) }); }
    }
    items[v.clave] = e;
  }

  let resumen = null;
  let resumenDe = previo.resumen ?? null;
  if (diaDeLaSemana(hoy) === 1 && previo.resumen !== hoy) {
    resumen = resumenSemanal({ tabla, hoy });
    resumenDe = hoy;
  }
  return { avisos, resumen, estado: { items, resumen: resumenDe } };
}

/** El resumen de los lunes: lo vencido, lo que vence en los próximos 60 días y lo que no tiene fecha. Líneas de texto. */
export function resumenSemanal({ tabla = VENCIMIENTOS, hoy }) {
  const vivos = tabla.filter((v) => !v.retirado && v.fecha !== 'no-vence');
  const conFecha = vivos.filter((v) => esFecha(v.fecha)).map((v) => ({ v, dias: diasHasta(v.fecha, hoy) })).sort((a, b) => a.dias - b.dias);
  const vencidos = conFecha.filter((x) => x.dias < 0);
  const proximos = conFecha.filter((x) => x.dias >= 0 && x.dias <= DIAS_DEL_RESUMEN);
  const sinFecha = vivos.filter((v) => v.fecha === 'desconocida');
  const lineas = [`Vencimientos: qué hay que renovar en los próximos ${DIAS_DEL_RESUMEN} días`];
  for (const { v, dias } of vencidos) lineas.push(`· YA VENCIÓ: ${v.nombre} (${fechaCorta(v.fecha)}). Lo renueva ${v.quien}.`);
  if (proximos.length) for (const { v, dias } of proximos) lineas.push(`· ${v.nombre}: ${cuandoTexto(dias)} (${fechaCorta(v.fecha)})${v.estimada ? ', fecha estimada' : ''}. Lo renueva ${v.quien}.`);
  else lineas.push('· Nada con fecha cargada vence en ese plazo.');
  if (sinFecha.length) lineas.push(`Sin fecha conocida (hay que mirarla): ${sinFecha.map((v) => v.nombre).join('; ')}.`);
  return lineas;
}
