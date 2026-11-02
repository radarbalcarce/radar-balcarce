# Telegram: las reglas

*Módulo `v3/redaccion/telegram/`. Bot `@radarbalcarce_bot`. Worker `radar-telegram`. Última revisión: 1/11/2026.*

## Qué es

La única puerta por la que una persona le habla al sistema desde el celular, y por la que el sistema le avisa. Reemplaza al WhatsApp
de avisos y a la pestaña «pedir una nota» del panel viejo.

## Quién puede hablarle

- **Un solo dueño**: el primer chat que le escribe al bot queda registrado como dueño (hoy, Hernán). A cualquier otro chat se le contesta
  «Este bot es privado de Radar Balcarce» y no se hace nada más.
- Para cambiar de dueño se borra la clave `dueno` del KV `ESTADO` (panel de Cloudflare) y el próximo que escriba queda como dueño.
- Andrés u otra persona entran cuando se decida; hoy lo maneja Hernán solo (decisión del 1/11).

## Qué hace hoy (etapa A)

| Le mandan | Contesta |
|---|---|
| Primer mensaje | Que quedó como dueño y que todavía no escribe notas |
| `/start`, «hola» | Que está conectado |
| `/estado` | Dueño, desde cuándo, qué etapa corre |
| Un audio | «Recibí tu audio de N segundos. Lo leo y sigo.» (se guarda; lo transcribe la herramienta `leer`) |
| Una foto | Que la recibió y que la nota con foto llega en la etapa E |
| Otra cosa | «Anotado» |

## Claude habla con Hernán por el bot (2/11/2026)

- Todo lo que escribe el dueño (texto, audio, foto) se guarda en el KV `ESTADO` como `entrada:<ISO>:<message_id>`, 90 días: tipo, texto, `file_id`,
  duración y a qué mensaje contestaba. Si el KV falla, igual se le contesta.
- `POST /decir` `{textos:[…]}` manda mensajes al dueño en orden (texto plano; lo que pasa de 4.096 caracteres se parte por párrafos). `GET /entrada?desde=<ISO>`
  devuelve lo que escribió el dueño (sin `desde`, los últimos 7 días). Las dos piden la cabecera `x-radar-contrasena` (la derivada del token, 403 si falta) y
  nunca devuelven el token ni el chat. Sin dueño, `/decir` da 404.
- `herramientas.mjs`: `decir <archivo.md>` (bloques separados por una línea `---`) y `leer [desde]` (baja el audio, lo transcribe con Groq `whisper-large-v3` y
  escribe `entrada/AAAA-MM-DD.md`, un archivo por día argentino; los ids ya leídos quedan en `entrada/AAAA-MM-DD.json`; el audio no se guarda). Sin `GROQ_API_KEY`
  el audio queda «[audio sin transcribir, N s]».
- Se usa desde el workflow «Radar 3.0: Telegram» (a mano; secretos `TELEGRAM_TOKEN` y `GROQ_API_KEY`). `leer` commitea `entrada/`. Después de tocar el
  Worker hay que volver a correr «Radar 3.0: desplegar» con `telegram`.

## Qué va a hacer (por etapa, según `docs/propuestas/PLAN-RADAR-3-0.md`)

- **B (núcleo):** un mensaje por vuelta de prueba: «hoy habría publicado N notas: …». Avisos de error del núcleo.
- **C (sitio):** aviso cuando una nota sale, con su enlace corto; aviso si el sitio no responde.
- **D (redes):** aviso de cada reel publicado con el enlace, para compartirlo como historia a mano; errores de cada red.
- **E (redacción propia):** audio o foto → transcribe → investiga → borrador → lo manda por acá → «sí» publica / «no» descarta /
  texto corrige. Gacetillas y mails: resumen → «armala» → borrador → OK. Agenda: «agregá a la agenda …».
- **F (vigilancia):** informe de las 8 y de las 20 con visitas del sitio y números de las redes; aviso de gasto de IA.

## Cómo se conecta (técnico, corto)

Telegram no viene a buscarnos: hay que registrarle una dirección (*webhook*). El Worker lo hace solo cada 15 minutos si ve que no está
registrada, con una contraseña derivada del token; cada mensaje que llega sin esa contraseña se tira. Si el token cambia (BotFather →
`/revoke`), se pega el nuevo y a los 15 minutos vuelve a andar.

## Dónde se pega el token

En GitHub: Settings → Secrets and variables → Actions → New repository secret → nombre `TELEGRAM_TOKEN`, y después correr el workflow
«Radar 3.0: desplegar» con `telegram`. O en Cloudflare: Workers → radar-telegram → Settings → Variables and Secrets → Add → Secret
`TELEGRAM_TOKEN`. Nunca en un chat, nunca en el código.

## Salud

`GET https://radar-telegram.radarbalcarce.workers.dev/salud` dice si tiene token, si el webhook está registrado y quién es el dueño
(sin el chat). No muestra el token nunca.

## Pruebas

`node --test "v3/**/*.test.mjs"` (sin red): quién queda como dueño, qué se contesta a cada cosa, que a un extraño no se le contesta nada
más que «privado».
