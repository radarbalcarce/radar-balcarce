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
| Un audio | Cuántos segundos recibió y que la transcripción llega en la etapa E |
| Una foto | Que la recibió y que la nota con foto llega en la etapa E |
| Otra cosa | «Anotado» |

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

`node --test v3/redaccion/telegram/` (sin red): quién queda como dueño, qué se contesta a cada cosa, que a un extraño no se le contesta nada
más que «privado».
