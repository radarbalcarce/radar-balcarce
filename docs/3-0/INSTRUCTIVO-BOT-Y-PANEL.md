# Instructivo: el bot de Telegram y el panel de Radar Balcarce

*Para Hernán y Andrés. Escrito el 11/11/2026 para repasar el jueves 13/11. Todo lo que dice acá está probado; si el bot o el panel hacen otra cosa, el que está mal es el programa y se corrige.*

Radar tiene **dos puertas** para manejar lo que se publica:

- **El bot de Telegram** (`@radarbalcarce_bot`): para escribir notas propias y para dar órdenes rápidas desde el celular.
- **El panel** (`radarbalcarce.com/panel`): una página privada, hecha para el celular, donde ves todas las notas y cambiás texto, sección, fotos, estado y redes.

Las dos hacen lo mismo sobre las notas ya publicadas. Usá la que te quede más cómoda.

---

## 1. Entrar al panel

1. Escribile **`/panel`** al bot.
2. Te manda un enlace. **Sirve una sola vez y vence a los 15 minutos.**
3. Abrilo y tocá el botón **«Entrar al panel»**.
4. Queda abierta tu sesión por **30 días** en ese navegador. Para salir, «Salir» dentro del panel.

Si el enlace ya se usó o venció, no pasa nada: pedí otro con `/panel`. Sin sesión, el panel no muestra ningún dato. Nadie que no tenga el bot puede entrar.

---

## 2. Escribir una nota propia (con el bot)

Es el camino para notas tuyas: una opinión, una entrevista, algo que te pasaron.

1. **Mandale el material** al bot: texto, audios, fotos (hasta 10) o enlaces. Puede ser todo en varios mensajes.
2. Escribí **«armala»** (o `/nota`). El bot arma la nota y te la muestra **antes de publicar**: título, bajada, cuerpo, sección y firma.
3. Mirá la nota. Si querés cambios, decíselos con palabras. Podés cambiar la **sección** y el **formato de las fotos** con los botones que trae.
4. **«ok»** la publica. **«no»** o `/cancelar` la descarta.
5. Después te pregunta **cómo sale en las redes**. Tocá cada formato para marcarlo o desmarcarlo y apretá **«Confirmar»**:
   - **Posteo:** el posteo con foto, en todas las redes.
   - **Historia:** la historia de esa nota.
   - **Reel:** el video con voz (con 1 a 3 fotos).
   - **Todo:** los tres. **«Sólo la web»:** no sale en ninguna red.
   Si no elegís en una hora, queda **sólo en la web**.
6. Si querés **nombrar cuentas** (por ejemplo la de la persona de la nota), mandá un mensaje con las cuentas antes de confirmar: `@fulano @otra`. Siempre se suma `@radarbalcarce`.

Lo que tenés que saber:
- La nota sale firmada con tu nombre. **No hay carrusel de fotos**: el único carrusel que existe es el resumen del domingo.
- Una nota propia **no entra en los repasos** salvo que se lo pidas (`/repaso`).
- Si no hay foto que sirva, sale con la placa del medio hasta que aparezca una.

---

## 3. Los comandos del bot

Todos aceptan el **enlace** de la nota o su **id** (lo último de la dirección, por ejemplo `3dff9bp`).

| Comando | Qué hace |
|---|---|
| `/ayuda` | La lista de todo lo que entiende. |
| `/ultimas` | Las 10 últimas notas publicadas, con su enlace. |
| `/pendientes` | Los borradores que esperan. |
| `/corregir <nota>` | Cambiar título, bajada o una frase. Te muestra el **antes y el después** y espera tu «sí». |
| `/seccion <nota> <sección>` | Cambia la sección. Ejemplo: `/seccion mi-nota-67zuqsi Argentina`. |
| `/ocultar <nota>` | La saca del sitio y de las redes **sin borrarla**. Se puede volver atrás. |
| `/ocultas` | Lista las notas ocultas. |
| `/mostrar <nota>` | Vuelve a publicar una oculta. |
| `/retirar <nota> <motivo>` | La saca del sitio con un motivo. Te muestra el título y espera tu «sí». |
| `/redes <nota> <formatos>` | Manda una nota ya publicada a las redes. Formatos: `posteo`, `historia`, `reel` o `todo`. Ejemplo: `/redes mi-nota-67zuqsi reel posteo`. |
| `/repaso <nota>` | La pone **primera** en el próximo repaso en video (el de las 10, las 15 o las 21). |
| `/foto <nota>` | Cambia las fotos. Mandás las fotos (la **primera es la portada**) y cerrás con «listo». `/foto <id> ninguna` las saca todas. |
| `/menciones <nota> @a @b` | Las cuentas que se nombran en las redes de esa nota. «ninguna» las saca. Sin enlace, usa la última nota propia. |
| `/panel` | El enlace para entrar al panel. |
| `/estado` | Si el bot está conectado. |

**Diferencia entre ocultar y retirar:** *ocultar* es reversible y sin explicaciones («la saco un rato»); *retirar* deja constancia del motivo («esta nota no tendría que haber salido»). En los dos casos la nota deja de verse en el sitio y en las redes.

---

## 4. El panel, pantalla por pantalla

### La lista (`/panel`)
Todas las notas, de la más nueva a la más vieja, 50 por página. De cada una ves foto chica, título, sección, estado y fecha. Podés **filtrar** por:
- **Título** (escribís una palabra).
- **Estado:** publicada, oculta o retirada.
- **Sección:** las 14 del sitio.
- **Origen:** propias (las que escribiste vos) o automáticas.

Tocá una nota para abrirla.

### La nota (`/panel/nota/<id>`)
Arriba, el título, la bajada, la portada y el enlace a la nota pública. Abajo, **cuatro formularios**. Cada uno guarda por separado y te avisa arriba si salió bien.

1. **Texto:** título, bajada, cuerpo (los párrafos se separan con una línea en blanco) y sección. **La dirección de la nota no cambia nunca**, aunque cambies el título. Cada cambio queda anotado (qué había antes y qué hay ahora).
2. **Estado:** *Ocultar*, *Mostrar* o *Retirar* (este pide un motivo y un «¿seguro?»).
3. **Redes:** casillas de **posteo, historia y reel**, la casilla **«Al próximo repaso»** y el campo de **menciones** (cuentas con `@`; `@radarbalcarce` se suma sola). Lo que marques sale aunque la nota no la cuenten otros medios; la ley, el tono y la foto siguen valiendo. Más abajo ves lo que ya salió en cada red.
4. **Fotos:** las que tiene la nota con su crédito. Podés elegir cuál es la **portada**, cambiar el **crédito**, **sacar** una o **subir** nuevas (hasta 10 por nota, 8 MB cada una, JPG, PNG o WEBP).

Después de cada cambio, el sitio se actualiza. En tu pantalla se ve enseguida; en las demás, **hasta 5 minutos**.

### Lo que el panel todavía no hace
- No achica las fotos que subís (conviene subirlas ya livianas).
- Si sacás una foto, la nota deja de usarla pero el archivo queda guardado.
- No crea notas nuevas: eso se hace con el bot.

---

## 5. Cómo se usan juntos: casos de todos los días

**«Escribí una nota y quiero que salga en todas partes.»**
Bot: mandás el material → «armala» → «ok» → botón **Todo** → **Confirmar**. Si querés nombrar a alguien, mandás `@cuenta` antes de confirmar.

**«Salió una nota automática con la sección equivocada.»**
`/seccion <nota> <sección>` en el bot, o el formulario **Texto** del panel.

**«Una nota tiene un error de escritura.»**
`/corregir <nota>` (te muestra el antes y el después) o el formulario **Texto**.

**«No me gusta la foto.»**
`/foto <nota>` o el formulario **Fotos**.

**«Esta nota está buena y quiero que salga en las redes.»**
`/redes <nota> posteo` (o `reel`, `historia`, `todo`) o las casillas de **Redes** en el panel.

**«Quiero que una nota aparezca en el próximo repaso en video.»**
`/repaso <nota>` o la casilla **Al próximo repaso**.

**«Hay que sacar algo ya.»**
`/ocultar <nota>` si querés poder volver atrás, o `/retirar <nota> <motivo>` si no.

---

## 6. Si algo no anda

- **El bot no contesta:** probá `/estado`. Si tampoco, el vigilante te manda un mail a `radarbalcarce@gmail.com`.
- **El enlace del panel dice que venció:** pedí otro con `/panel`.
- **Cambié algo y no se ve:** esperá hasta 5 minutos y recargá.
- **No salen notas nuevas:** el vigilante te avisa por Telegram si pasan 2 horas sin notas, si los pedidos de IA del día llegan al 80 % del tope, o si hay 12 notas elegidas esperando redacción.
- **Algo grave:** `/ocultar` y avisanos.

## 7. Qué NO hay (a propósito)

- **Carrusel de fotos en notas propias:** no existe. Sólo el resumen de los domingos.
- **Respuestas del bot a lectores:** el bot es sólo para ustedes dos.
- **Cambiar la dirección de una nota:** la dirección queda fija desde que sale.

---

*Dónde está el código, por si hace falta: el bot en `v3/redaccion/telegram/` (comandos en `administrar.mjs`, notas propias en `nota-propia.mjs`) y el panel en `v3/sitio/panel.mjs` y `v3/sitio/vistas/panel.mjs`. Las reglas detalladas están en los `REGLAS.md` de cada carpeta.*
