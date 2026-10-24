// Carga en Workers Builds las variables y los secretos de la compilación del motor (PLAN-DE-CAMBIO.md, paso 8), con la API de Cloudflare.
// Lo corre el workflow «Cargar variables del motor» con los secretos de GitHub: los valores nunca se imprimen.
// Hace falta CF_BUILDS_TOKEN (token de usuario: «Workers Builds Configuration: Edit» y «Workers Scripts: Read») y CLOUDFLARE_ACCOUNT_ID.

const cuenta = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CF_BUILDS_TOKEN;
const WORKER = 'radar-balcarce-motor';
const base = `https://api.cloudflare.com/client/v4/accounts/${cuenta}`;

// Lo que la compilación lee como texto (valor fijo o de las variables de GitHub) y lo que lee como secreto.
const FIJAS = { NODE_VERSION: '24', TZ: 'America/Argentina/Buenos_Aires', SITIO: 'https://radarbalcarce.com', R2_MOTOR: 'radar-motor' };
const VARIABLES = ['CLOUDFLARE_PROJECT', 'REDES_ACTIVAS', 'R2_ARCHIVO', 'SITEMAP_DEL_ARCHIVO', 'TOPE_DE_NOTAS', 'FOTOS_MENORES_OFICIALES', 'POLICIAL_NACIONAL', 'FUTBOL_SOLO_ARGENTINO', 'FOTOS_EN_R2', 'ENLACES_CORTOS', 'FOTOS_BASE', 'R2_RESPALDOS', 'R2_FOTOS', 'R2_PIEZAS', 'MINIMO_NACIONAL', 'MINIMO_AREAS_CHICAS', 'BLUESKY_URL', 'TELEGRAM_CANAL_URL', 'WHATSAPP_CANAL_URL'];
const SECRETOS = ['RADAR_GITHUB_TOKEN', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'GEMINI_API_KEY_REDACCION', 'GEMINI_API_KEY_REDES', 'GEMINI_API_KEY_CLASIFICACION', 'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'VIGILANTE_TOKEN', 'WHATSAPP_TELEFONO', 'WHATSAPP_APIKEY'];

if (!cuenta || !token) { console.error('Faltan CLOUDFLARE_ACCOUNT_ID o CF_BUILDS_TOKEN.'); process.exit(1); }

async function api(ruta, opciones = {}) {
  const r = await fetch(`${base}${ruta}`, { ...opciones, headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) throw new Error(`${opciones.method ?? 'GET'} ${ruta} → ${r.status} ${JSON.stringify(j.errors ?? j).slice(0, 400)}`);
  return j.result;
}

// El «tag» del Worker (no es su nombre): sale de la lista de Workers.
const scripts = await api('/workers/scripts');
const mio = (Array.isArray(scripts) ? scripts : []).find((s) => s.id === WORKER);
const tag = mio?.tag ?? mio?.etag;
if (!tag) { console.error(`No encontré el Worker ${WORKER} (o su tag). Campos que trae: ${Object.keys(mio ?? {}).join(', ')}`); process.exit(1); }

const triggers = await api(`/builds/workers/${tag}/triggers`);
const lista = Array.isArray(triggers) ? triggers : (triggers?.triggers ?? []);
if (!lista.length) { console.error('El Worker no tiene ninguna conexión de compilación: conectar el repositorio primero (paso A).'); process.exit(1); }
const disparador = lista[0];
console.log(`Disparador encontrado: ${disparador.trigger_name ?? disparador.trigger_uuid} (${lista.length} en total).`);

const cuerpo = {};
for (const [k, v] of Object.entries(FIJAS)) cuerpo[k] = { value: v, is_secret: false };
// MOTOR_SIMULAR=Si: el primer ensayo no guarda, no sube y no escribe en R2 (paso 8a). Se borra en el corte.
if (process.env.SIMULAR !== 'No') cuerpo.MOTOR_SIMULAR = { value: 'Si', is_secret: false };
for (const k of VARIABLES) if (process.env[k]) cuerpo[k] = { value: process.env[k], is_secret: false };
const faltan = [];
for (const k of SECRETOS) { if (process.env[k]) cuerpo[k] = { value: process.env[k], is_secret: true }; else faltan.push(k); }

await api(`/builds/triggers/${disparador.trigger_uuid}/environment_variables`, { method: 'PATCH', body: JSON.stringify(cuerpo) });
// El corte: sacar MOTOR_SIMULAR de verdad (el PATCH sólo suma o cambia, no borra).
if (process.env.SIMULAR === 'No') {
  await api(`/builds/triggers/${disparador.trigger_uuid}/environment_variables/MOTOR_SIMULAR`, { method: 'DELETE' }).catch((e) => console.log(`MOTOR_SIMULAR: ${e.message.slice(0, 160)}`));
}
console.log(`Cargadas ${Object.keys(cuerpo).length} variables (${Object.values(cuerpo).filter((x) => x.is_secret).length} secretas). MOTOR_SIMULAR: ${cuerpo.MOTOR_SIMULAR ? 'Si' : 'borrada'}.`);
if (faltan.length) console.log(`Sin cargar por estar vacías en GitHub: ${faltan.join(', ')}.`);
