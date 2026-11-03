# Telegram: las reglas

*Módulo `v3/redaccion/telegram/`. Bot `@radarbalcarce_bot`. Worker `radar-telegram`. Última revisión: 2/11/2026 (etapa E).*

## Qué es

La única puerta por la que una persona le habla al sistema desde el celular, y por la que el sistema le avisa. Reemplaza al WhatsApp
de avisos y a la pestaña «pedir una nota» del panel viejo.

## Quién puede hablarle

- **Un solo dueño**: el primer chat que le escribe al bot queda registrado como dueño (hoy, Hernán). A cualquier otro chat se le contesta
  «Este bot es privado de Radar Balcarce» y no se hace nada más.
- Para cambiar de dueño se borra la clave `dueno` del KV `ESTADO` (panel de Cloudflare) y el próximo que escriba queda como dueño.
- Andrés u otra persona entran cuando se decida; hoy lo maneja Hernán solo (decisión del 1/11).

## Qué hace hoy

| Le mandan | Contesta |
|---|---|
| Primer mensaje | Que quedó como dueño |
| `/start`, «hola» | Que está conectado |
| `/estado` | Dueño, desde cuándo y cómo se arma una nota |
| Texto, audio, foto o un enlace | «Recibido, mandá más o decí "armala"» (y lo guarda para la nota) |
| «armala» o `/nota` | Arma la nota y muestra la vista previa |
| `/cancelar` | Descarta lo que se venía juntando o la vista previa |
| Un video o un sticker | Que todavía no los sabe leer |

## La nota propia por Telegram (etapa E, 2/11/2026)

Es el camino de las notas firmadas por Hernán (la de Nancy, la de Halloween), de punta a punta y sin la PC.

1. **Contás.** Mandás por el bot lo que quieras: texto, uno o varios audios, fotos y/o un enlace, en los mensajes que haga falta. Todo lo que llega con
   menos de 10 minutos entre un mensaje y el siguiente es el mismo pedido. Cada mensaje se contesta «Recibido, mandá más o decí "armala"» (un álbum
   de fotos, una sola vez). Hasta 8 audios por nota.
2. **«Armala»** (o `/nota`). El bot transcribe los audios, baja el texto del enlace (si el enlace no se puede leer, sigue sin él y se lo avisa a la IA)
   y escribe la nota con el perfil y las reglas de redacción, como nota propia: firmada «Hernán Accomo», con tu postura cuando lo que contaste la
   tiene, cerrando con una idea fuerte, y sin inventar nada que no esté en lo que mandaste o en el enlace. Tarda alrededor de un minuto. Con fotos
   solas, sin nada de texto o audio, no arma.
3. **Vista previa.** Te manda título, bajada, cuerpo, sección y qué foto usaría (la primera que mandaste; sin fotos saldría la placa). Contestás:
   - **«ok»** (también «dale», «publicala», «sí»…): se publica. Sólo cuenta si el mensaje es *nada más* que eso: «ok pero sacá lo del tránsito» es una corrección.
   - **«no»** o `/cancelar`: se descarta.
   - **Cualquier otro texto o audio**: es una corrección. Rehace la nota con tu pedido, a partir de lo anterior y del material original, y vuelve a mostrar
     la vista previa. Una foto sola pasa a ser la de portada (sin gastar IA).
   La vista previa espera 24 horas. Si mandás material nuevo sin contestarla, se toma como corrección: para empezar de cero, `/cancelar`.
4. **«ok» publica.** La nota se guarda en la base (`notas`: estado `publicada`, origen `redaccion`, firma «Hernán Accomo») y el bot te da el enlace
   `radarbalcarce.com/nota/<título>-<código>`. **Todavía no hay corte:** el enlace se va a ver cuando el sitio nuevo esté en línea. La foto se sube al
   bucket de fotos si existe; si no, queda anotada como pendiente (la referencia de Telegram) hasta que haya dónde guardarla.
5. **Redes.** Enseguida te pregunta con tres botones: **Todo** (posteo con foto en todas las redes, historia con la tarjeta y reel con voz), **Posteo e
   historia**, **Sólo la web**. Si no contestás en 1 hora, queda **Sólo la web** y te avisa. También podés escribir la opción. Las redes de la 3.0 todavía no
   existen: por ahora sólo se anota la elección en la nota (columna `redes`).

Límites y cuidados: contesta **sólo a Hernán** (a cualquier otro chat le dice que el bot es privado y no guarda ni gasta nada); **20 pedidos de IA por
día** para este flujo (con el tope cumplido no arma ni corrige, pero lo que mandaste queda guardado y una vista previa ya hecha se puede publicar);
la clave de Gemini y el token nunca se escriben en ningún mensaje ni registro. Si algo falla, el bot lo cuenta sin datos secretos y lo que mandaste sigue guardado.

Técnico, corto: el estado del pedido vive en el KV `ESTADO` (`mat:…` por cada mensaje, `pedido` con la fase `vista` o `redes`); las notas, en la base D1
`radar-nucleo` (columnas `origen`, `slug`, `publicada_en`, `redes`, que suma `schema-redaccion.sql`); el código del flujo, en `nota-propia.mjs`; el Worker
arranca por `principal.mjs`, que le trae PERFIL.md y REDACCION.md. Hace falta el secreto `GEMINI_API_KEY` (el workflow lo carga desde
`GEMINI_API_KEY_RESPALDO`). Cuando también escribís para contestarle a Claude (la entrevista por Telegram), esos mensajes se juntan como material de nota:
si pasa, `/cancelar` y listo.

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
- **E (redacción propia):** la nota propia por Telegram ya está (arriba). Falta: investigar en internet, gacetillas y mails (resumen → «armala» →
  borrador → OK) y la agenda («agregá a la agenda …»).
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

`node --test "v3/**/*.test.mjs"` (sin red; la base es SQLite en memoria): quién queda como dueño, qué se contesta a cada cosa, que a un extraño no se le contesta nada
más que «privado»; `nota-propia.test.mjs` cubre juntar mensajes, «armala» con audio y foto, correcciones, el «ok» a D1, los botones de redes y su valor por defecto, «no», el tope y los errores.
