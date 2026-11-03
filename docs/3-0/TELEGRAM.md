# El bot de Telegram (@radarbalcarce_bot)

*Para Hernán y Andrés. Escrito el 3/11/2026 leyendo el código de `v3/redaccion/telegram/` (el Worker `radar-telegram`). Lo que no está claro en el código está marcado como **a confirmar**. Si este documento y el programa no coinciden, manda el programa.*

## 1. Qué es y para qué sirve

El bot es **la única puerta** por la que una persona le habla al sistema desde el celular, y por la que el sistema le avisa a esa persona. Reemplaza al WhatsApp de avisos y al panel del celular viejo (las pestañas «Escribir», «retirar» y «corregir»).

Con el bot se pueden hacer tres cosas:

| Para qué | Cómo |
|---|---|
| **Escribir una nota propia** (las que van firmadas por Hernán, como la de Halloween) | Le mandás el material y decís «armala» |
| **Administrar lo ya publicado** (ver, retirar, corregir) | Comandos `/ultimas`, `/pendientes`, `/retirar`, `/corregir` |
| **Recibir avisos** del sistema (errores, informes de las 8 y las 20, resumen de redes) | Llegan solos al mismo chat |

El bot **no usa la PC**. Todo corre en Cloudflare, así que funciona con la computadora apagada.

## 2. Quién puede hablarle

- **Un solo dueño.** El primer chat que le escribió al bot quedó registrado como dueño (hoy, Hernán).
- A cualquier otro chat le contesta *«Este bot es privado de Radar Balcarce»* y no hace nada más: no guarda lo que le mandan ni gasta IA.
- **Andrés todavía no puede usarlo.** Se decidió que por ahora lo maneje Hernán solo (decisión del 1/11). Para cambiar de dueño hay que borrar la clave `dueno` del almacén `ESTADO` en el panel de Cloudflare; el próximo que escriba queda como dueño. *(Si más adelante se quiere que entren los dos, es un cambio de código: **a confirmar** con quien programa.)*

## 3. Todos los comandos, en una tabla

| Escribís | Qué pasa |
|---|---|
| `/start` o «hola» | Te dice que está conectado y escuchando |
| `/estado` | Te dice quién es el dueño, desde cuándo, y cómo se arma una nota |
| `/ayuda` | La lista de todo lo que sabe hacer |
| Texto, audio, foto o un enlace | Lo guarda como material para una nota y contesta «Recibido, mandá más o decí "armala"» |
| «armala» o `/nota` | Arma la nota con todo lo que mandaste y te muestra la vista previa |
| «ok» (también «dale», «publicala», «sí», «listo»…) | Publica la nota que estás viendo |
| «no» o `/cancelar` | Descarta lo que se venía juntando, o la vista previa |
| `/ultimas` | Las 10 últimas notas publicadas, con su enlace |
| `/pendientes` | Los borradores que esperan (con su código) |
| `/retirar <enlace o código> <motivo>` | Saca una nota del sitio (pide tu «sí») |
| `/corregir <enlace o código>` | Cambia el título, la bajada o una frase del cuerpo (pide tu «sí») |
| Un video o un sticker | Contesta que todavía no los sabe leer |
| Un comando que no existe | Te manda a `/ayuda` |

## 4. Escribir una nota propia, paso a paso

Es el camino de las notas firmadas «Hernán Accomo», de punta a punta y sin la PC.

### Paso 1. Contás

Mandás por el bot lo que quieras, en los mensajes que haga falta:

- texto,
- uno o varios **audios** (hasta 8 por nota; el bot los transcribe),
- **fotos** (la primera que mandes es la de portada),
- un **enlace** (el bot baja el texto; si el enlace no se puede leer, sigue sin él y se lo avisa a la IA).

Todo lo que llega con **menos de 10 minutos** entre un mensaje y el siguiente cuenta como **el mismo pedido**. Cada mensaje se contesta «Recibido, mandá más o decí "armala"» (un álbum de fotos, una sola vez).

### Paso 2. «Armala»

Escribís «armala» (o `/nota`). El bot:

1. transcribe los audios,
2. baja el texto del enlace,
3. escribe la nota con el perfil del medio (`v3/nucleo/PERFIL.md`) y las reglas de redacción,

como nota propia: **firmada «Hernán Accomo»**, con tu postura cuando lo que contaste la tiene, cerrando con una idea fuerte, y **sin inventar nada** que no esté en lo que mandaste o en el enlace. Tarda alrededor de **un minuto**.

Dos cosas a tener en cuenta:

- Con **fotos solas**, sin nada de texto ni audio, **no arma**.
- Si lo último que mandaste es de hace **más de una hora**, no lo arma solo: te pide que lo mandes de nuevo.
- Si la IA detecta algo que no se puede publicar (por ejemplo un menor o una víctima), no arma la nota, te dice el motivo y lo que mandaste sigue guardado.

### Paso 3. La vista previa

Te manda el **título, la bajada, el cuerpo, la sección y qué foto usaría** (la primera que mandaste; sin fotos, saldría la placa). Contestás:

| Contestás | Qué pasa |
|---|---|
| **«ok»** (o «dale», «publicala», «sí»…) | Se publica. **Sólo cuenta si el mensaje es nada más que eso.** |
| **«no»** o `/cancelar` | Se descarta |
| **Cualquier otro texto o audio** | Es una **corrección**: rehace la nota con tu pedido (a partir de lo anterior y del material original) y vuelve a mostrar la vista previa |
| **Una foto sola** | Pasa a ser la foto de portada, sin gastar IA |

**Ejemplo importante:** «ok pero sacá lo del tránsito» **no publica**: se toma como una corrección. Si querés publicar, mandá solamente «ok».

La vista previa espera **24 horas**. Si mandás material nuevo sin contestarla, se toma como corrección; para empezar de cero, `/cancelar`.

### Paso 4. «Ok» publica

La nota se guarda como publicada, con origen «redacción» y firma «Hernán Accomo», y el bot te da el enlace, con esta forma:

`radarbalcarce.com/nota/<titular-en-guiones>-<código>`

La nota lleva **la sección que le corresponde** (Balcarce, Cultura, etc.), como cualquier nota. Nunca dice «Nota propia» como sección.

### Paso 5. Las redes (tres botones)

Enseguida el bot pregunta qué hacer en redes, con tres botones:

| Botón | Qué significa |
|---|---|
| **Todo** | Posteo con foto en todas las redes, historia con la tarjeta y reel con voz |
| **Posteo e historia** | Lo mismo sin el reel con voz |
| **Sólo la web** | No sale en redes |

Si **no contestás en 1 hora**, queda **«Sólo la web»** y el bot te avisa. También podés escribir la opción en vez de tocar el botón.

> **A confirmar:** el código anota la elección en la nota (columna `redes`), pero la documentación del bot dice que las redes de la 3.0 «todavía no existen» y las redes 3.0 están hoy **en ensayo**. Mientras no se pasen a real, no hay que esperar que esa elección publique nada en las redes. Ver `REDES.md`.

### Ejemplo de conversación

> **Hernán:** *(audio de 40 segundos contando lo del festival de la escuela)*
> **Bot:** Recibido, mandá más o decí «armala».
> **Hernán:** *(dos fotos)*
> **Bot:** Recibido, mandá más o decí «armala».
> **Hernán:** armala
> **Bot:** *(a los 60 segundos)* Título: … Bajada: … Cuerpo: … Sección: Cultura. Foto: la primera que mandaste. Respondé «ok» para publicarla, «no» para descartarla, o mandame la corrección y la rehago.
> **Hernán:** Cambiá el título, que diga «festival» y no «muestra»
> **Bot:** *(nueva vista previa con el título corregido)*
> **Hernán:** ok
> **Bot:** Publicada: radarbalcarce.com/nota/… ¿Qué hacemos en redes? [Todo] [Posteo e historia] [Sólo la web]

## 5. Administrar lo ya publicado

Sólo el dueño. **Nunca usa IA** (no gasta nada) y escribe directo en la base de notas.

### `/ultimas` y `/pendientes`

- `/ultimas`: las 10 últimas notas publicadas, con título corto y enlace.
- `/pendientes`: los **borradores** que esperan, con su código.

### `/retirar`

Formato: `/retirar <enlace o código> <motivo>`

Ejemplo: `/retirar radarbalcarce.com/nota/la-escuela-67zuqsi la fuente se equivocó con la fecha`

1. El bot te muestra el título de la nota.
2. Te pide que contestes **«sí»**.
3. Con el «sí», la nota pasa a **retirada** y se anota el motivo, la fecha y «Hernán (Telegram)».

**Sin motivo no avanza.** La nota no se borra: queda retirada en la base (sirve de historial).

### `/corregir`

Formato: `/corregir <enlace o código>`

El bot muestra título y bajada y acepta tres tipos de cambio:

| Escribís | Qué cambia |
|---|---|
| `título: Nuevo título` | El título |
| `bajada: Nueva bajada` | La bajada |
| `cuerpo: reemplazá "X" por "Y"` | Una frase del cuerpo (reemplazo literal, **sólo la primera vez** que aparece) |

Te muestra el **antes y el después** y pide «sí». Cada corrección queda anotada con fecha, qué campo, el texto de antes y el de después: **el texto original no se pierde**. A una nota retirada no se la puede corregir.

### El código de la nota

Lo podés pegar de dos maneras: el **enlace entero** o el **código del final** del enlace. Ejemplo: en `la-escuela-67zuqsi` el código es `67zuqsi`. Las notas del clima tienen un código con fecha (`clima-2026-11-03`) que se usa entero.

### Cuándo vence una acción pendiente

Si el bot te pidió un «sí», esa pregunta **vive 10 minutos**. Mientras exista, un «sí», un «no» o un cambio le toca a esa acción (salvo que escribas `/nota`). «No» o `/cancelar` la descartan.

## 6. Los avisos que manda solo

El bot también es el canal por donde llegan los avisos del sistema (no hace falta pedirlos):

| Aviso | De dónde viene | Cuándo |
|---|---|---|
| Informe de las **8:00 y las 20:00** | Vigilancia | Dos veces por día: qué se publicó, qué se frenó y por qué, gasto de IA, fuentes caídas |
| Aviso de algo que se rompió y de que «volvió a andar» | Vigilancia | Cuando pasa, una sola vez por problema |
| Resumen de **21:30** | Núcleo | Cuántas notas publicó ese día |
| Resumen de **22:05** | Redes | Qué se publicó (o simuló) en cada red |
| Aviso de token de Meta vencido | Redes | Una vez por día mientras siga vencido |

## 7. Qué NO hace (todavía)

| Pedido | Estado |
|---|---|
| Armar el **media kit** y las preguntas para un comercio nuevo (que le pasás el Instagram) | **No está.** Está pensado como pieza de la etapa E; hoy se pide por el chat con Claude y se hace en la PC |
| Investigar un tema en internet y armar la nota | **No está** (queda como pieza de la etapa E) |
| Recibir gacetillas o mails, resumirlos y armar la nota | **No está** |
| «Agregá a la agenda…» | **No está** |
| Leer un **video** que le mandes | No lo sabe leer (te lo dice) |
| Pausar todo el sistema con un botón de emergencia | No existe en el bot. La pausa general era del sistema viejo. En la 3.0 hay dos interruptores en Cloudflare (`NUCLEO_PUBLICA` para las notas y `REDES_ACTIVAS` para las redes); ver `UN-DIA-DEL-SITIO.md`. Un botón de pausa en el bot: **a confirmar** |
| Publicar en redes cuando elegís «Todo» | Ver la nota del paso 5 (a confirmar) |
| Responder a cualquier otra persona | Nunca: sólo al dueño |
| Guardar claves o tokens | Nunca se escriben en un mensaje ni en un registro |

## 8. Límites y cuidados

- **20 pedidos de IA por día** para las notas propias. Con el tope cumplido, no arma ni corrige, pero **lo que mandaste queda guardado** y una vista previa que ya estaba hecha se puede publicar con «ok».
- La **clave de IA y el token** nunca aparecen en ningún mensaje.
- Si algo falla, el bot lo cuenta **sin datos secretos** y lo que mandaste sigue guardado.
- **Aviso:** cuando Claude te escribe preguntas por el bot (como la entrevista del perfil) y vos contestás, esos mensajes se **juntan como material de nota**. Si pasa, escribí `/cancelar` y listo.

## 9. Si el bot no contesta

| Situación | Qué mirar |
|---|---|
| No contesta nada | Abrí `https://radar-telegram.radarbalcarce.workers.dev/salud`: dice si tiene token, si el webhook está registrado y quién es el dueño (nunca muestra el token) |
| Cambiaste el token en BotFather (`/revoke`) | Pegar el token nuevo como secreto `TELEGRAM_TOKEN` en GitHub (Settings → Secrets and variables → Actions) o en Cloudflare (Workers → radar-telegram → Settings → Variables and Secrets) y correr el workflow «Radar 3.0: desplegar» con `telegram`. A los 15 minutos el bot vuelve a registrarse solo |
| Dice «privado» y vos sos el dueño | Escribís desde otra cuenta de Telegram. Mirá cuál es el dueño en `/estado` desde la cuenta correcta |
| El bot está caído y se rompió otra cosa | La vigilancia manda **un mail a radarbalcarce@gmail.com** (si Email Routing está activo: **a confirmar**) |

**Regla de oro:** el token nunca se pega en un chat ni en el código. Lo pega una persona directamente en GitHub o Cloudflare.

## 10. Dónde está cada cosa (para quien programa)

| Qué | Dónde |
|---|---|
| Las reglas, en palabras | `v3/redaccion/telegram/REGLAS.md` |
| Comandos básicos y quién es el dueño | `v3/redaccion/telegram/worker.mjs` |
| La nota propia (juntar, armar, vista previa, «ok», botones de redes) | `v3/redaccion/telegram/nota-propia.mjs` |
| `/ultimas`, `/pendientes`, `/retirar`, `/corregir`, `/ayuda` | `v3/redaccion/telegram/administrar.mjs` |
| Lo que Claude le dice a Hernán por el bot y lo que Hernán contesta | `v3/redaccion/telegram/herramientas.mjs`; workflow «Radar 3.0: Telegram» (acciones `decir` y `leer`) |
| Las preguntas del perfil que se le mandaron a Hernán | `v3/redaccion/telegram/mensajes/perfil-preguntas.md` |
