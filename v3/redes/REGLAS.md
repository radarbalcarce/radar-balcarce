# Las redes: las reglas

*Módulo `v3/redes/` (Worker `radar-redes`). Hoy hace una sola cosa: **publicar las notas del sitio en Facebook, con su espejo en Instagram**. Los reels con voz,
las placas, las historias, X, Threads, TikTok, YouTube y el canal de Telegram vienen después (etapa D, segunda parte); hasta el corte siguen saliendo por el sistema
viejo. Escrito el 3/11/2026 con las decisiones de `docs/propuestas/PLAN-RADAR-3-0.md` (§ 3.9 y sección 10). Si el programa hace otra cosa que esto, el programa está mal.*

Cada red tiene su propio `REGLAS.md` con el detalle: `facebook/REGLAS.md` e `instagram/REGLAS.md`. Acá va lo que comparten.

## 1. Qué hace y cuándo

- **Cada 15 minutos, de 8:00 a 22:00 de Balcarce**, el Worker mira las notas publicadas y decide si toca publicar una. Publica **como mucho una por vuelta** en Facebook
  (más su espejo en Instagram).
- **A las 22:05** manda por Telegram el resumen del día: cuántos posteos salieron en cada red, cuáles (con la hora) y cuáles fallaron.
- Todo se cuenta por **día de Balcarce** (de las 00:00 a las 24:00 de acá, UTC-3 todo el año).

## 2. El interruptor: apagado por defecto

- La variable **`REDES_ACTIVAS`** del Worker está en **«no»**. Con «no», el Worker **simula**: elige, arma el texto, lo anota en la tabla `publicaciones` con
  `simulado = 1` y **no llama nunca a Meta**. El resumen de las 22:05 dice «habría publicado N posteos» con los titulares. Es el mismo camino que el de verdad, menos la llamada.
- Lo simulado y lo real **no se mezclan**: los cupos del día y el espaciado de 90 minutos se cuentan por separado. Al prender las redes (**«si»**, lo hace una persona),
  la primera vuelta arranca el día de cero.
- En simulación se ven también las notas en `borrador` (hoy el núcleo no publica nada solo y sin eso no habría qué simular). Con las redes prendidas, **sólo cuentan las notas `publicada`**.

## 3. Qué notas van

Una nota va a las redes si cumple **todo** esto:

1. **Es del núcleo** (la escribió y verificó el sistema nuevo). Las notas migradas del sistema viejo y las que escribe una persona por Telegram no van por acá (las de Telegram
   tienen su propia pregunta de redes, que se atiende en una etapa siguiente).
2. **Es de Balcarce, o la cuentan muchos medios.** Lo de Balcarce va siempre. Lo de afuera, sólo si lo cuentan **5 medios distintos o más**. Lo de la zona (otras ciudades) no va.
3. **Tiene foto** (`nota.foto.url`, la que eligió el núcleo). Sin foto, no va: todo lo que sale a redes lleva imagen.
4. **No la frenó la ley** (`noPublicar`: un menor, una víctima, lo rojo). Nunca.
5. **Pasa la compuerta de tono (R41).** No sale en ninguna red la muerte de un menor o un bebé, un suicidio, ni un menor grave por un accidente o una agresión. Se mira sólo el título,
   la bajada y las dos líneas (nunca el cuerpo). La web no cambia: esto es sólo para redes. Caso real: «Un niño de dos años muere tras caer a una pileta» (28/10) abrió el repaso de las 21.
6. **Salió hace menos de 8 horas.** Una nota más vieja ya no se postea.
7. **No salió ya**, y no falló dos veces. Una nota sale una sola vez por red; si Meta la rechaza, se reintenta una vez más en la vuelta siguiente y a la segunda se abandona.

## 4. Cuántas por día

- **Facebook: hasta 10 posteos por día: 5 de Balcarce + 5 de lo más contado del país**, con **90 minutos como mínimo** entre uno y el siguiente y **como mucho 3 nacionales de una misma sección**.
  Son un tope, no una cuota: si no hay con qué, no salen.
- Se **alterna**: va primero el tipo que lleva menos posteos en el día (a igualdad, Balcarce). Si de ese tipo no hay nota, sale del otro.
- De Balcarce sale la **más nueva**; de lo nacional, la **más contada** (a igual cantidad de medios, la más nueva).
- **Instagram** copia a Facebook (ver `instagram/REGLAS.md`): no tiene cupo propio.

## 5. Qué dice cada posteo

**Título + dos líneas + enlace + `#Balcarce #RadarBalcarce`** y, al final, el crédito de la foto. Nunca el nombre de la fuente, nunca «resumen hecho con IA», nunca `.com.ar`.
La foto va **entera** (nunca la tarjeta recortada ni con marcas de agua ni nombres de otros medios encima): el crédito se dice en el texto.

## 6. Qué hace si algo falla

- **Meta rechaza un posteo:** queda anotado el error (sin el token) con el código de Meta entre corchetes. Se reintenta una vez; a la segunda, esa nota se abandona. Los intentos con error **no**
  cuentan para el cupo ni para el espaciado.
- **Meta contesta error pero el posteo salió** (pasó en el sistema viejo: «límite de pedidos» y publicó igual): antes de darlo por fallado se mira si el título ya está entre los últimos
  posteos de la página; si está, se da por publicado y no se repite.
- **Tres fallos en las últimas dos horas** frenan la vuelta (algo anda mal: no se insiste). Se retoma solo cuando pasan.
- **El token de Meta venció (error 190):** se avisa por Telegram **una sola vez por día**. Hay que cargar uno nuevo en GitHub Secrets (`META_TOKEN`) y volver a subir «redes».
- **Dos vueltas que se pisan** no publican dos veces la misma nota (la base lo impide).
- **Sin `TELEGRAM_TOKEN`** o con el bot caído, el Worker sigue publicando; sólo no avisa.
- **Faltan `META_TOKEN` o el Instagram vinculado:** queda un error claro en `publicaciones`; no se cae nada.

## 7. Qué guarda

La tabla `publicaciones` (en la misma base `radar-nucleo`): red, nota, sección, tipo (local o nacional), cuándo, día, estado (`enviando`, `ok`, `simulado`, `error`), si fue simulado,
el id que devolvió Meta, el error y el texto del posteo. No se borra nada.

## 8. Secretos y variables

- Secretos (los pega una persona, nunca en un chat): `META_TOKEN` (el del usuario del sistema `publicador-radar`, el mismo del sistema viejo) y `TELEGRAM_TOKEN`.
- Variables en `wrangler.toml`: `REDES_ACTIVAS` («no»), `INSTAGRAM_ESPEJO` («si»), `SITIO`. Opcional: `PAGINA_DE_FACEBOOK` (si no está, la página «Radar Balcarce»).
- La cuenta de Instagram se encuentra sola: es la que tiene vinculada la página de Facebook.

## 9. Cómo se prueba

`node --test "v3/redes/**/*.test.mjs"`: la elección (horario, espaciado, cupos, tono, sin foto), el texto, el cliente de Meta con un Meta de mentira, la vuelta entera con una base de
SQLite en memoria (simulado y real) y la puerta HTTP. Sin red.

## 10. Qué comparte cada red

*Hernán, 3/11. Quién sale igual y quién cambia algo. Los posteos van en Facebook e Instagram (Instagram espeja los de Balcarce); lo que no existe en una red va en «—». Los detalles de cada red están en
`docs/propuestas/REDES-3-0-FORMATOS.md` § 2 y en `docs/redes/FORMATOS-POR-RED.md`; las piezas, en `v3/redes/piezas/REGLAS.md`.*

| Pieza | Facebook | Instagram | TikTok | YouTube Shorts | X | Threads | Bluesky | Canal de Telegram |
|---|---|---|---|---|---|---|---|---|
| **Reel** (mp4 9:16, con voz) | **igual** en todas las que siguen: el mismo mp4 1080 × 1920 | igual | igual, sin farmacia, útiles ni agenda; marcar «contenido con IA»; la firma de abajo puede chocar con su regla de no poner marcas (primera prueba a mano) | igual (6 por día como techo; no van el repaso de la tarde ni el clima de la noche) | video adjunto (sólo si aceptan gastar) | video adjunto | video adjunto | video con pie de hasta 1.024 caracteres |
| *Lo que cambia en el texto* | enlace tocable a la nota del repaso; `#Balcarce #RadarBalcarce` + 1 | **sin enlace: «link en la bio»**; mismos hashtags | «link en la bio»; hasta 5 hashtags | título «pieza · Radar Balcarce»; la dirección dicha, no se toca; hasta 3 hashtags | 280 caracteres, titular + hashtags, sin enlace (con enlace cuesta 13 veces más) | 500 caracteres, 1 sola etiqueta de tema | 300 caracteres; enlace y hashtags declarados como «facetas» | enlace con vista previa |
| **Historia** (6 a 60 s) | sí, el mismo video (recortado a 58 s si hace falta) | sí, el mismo | — | — | — | — | — | — |
| *Lo que cambia* | sin pegatina de enlace (la API no la tiene): el enlace va en la bio de la página | ídem: «Nota completa: link en la bio» | | | | | | |
| **Posteo 4:5** (1080 × 1350, en oscuro) | sí, la misma imagen; texto con enlace tocable (`radarbalcarce.com/r/f/id`) y crédito | sí, la **misma imagen**, sólo las notas de Balcarce (espejo); texto sin enlace, «link en la bio»; hasta 5 hashtags | — | — | — (usa la imagen de enlace) | — (usa la imagen de enlace) | — (usa la imagen de enlace) | la misma imagen como foto, pie de hasta 1.024 con el enlace |
| **Carrusel** (3 a 10 láminas 4:5) | álbum con las mismas láminas | carrusel, hasta 10 | modo foto (con música cuando haya) | — | hasta 4 fotos | hasta 10 (la API admite 20) | hasta 4 fotos | álbum de 2 a 10 |
| *Lo que cambia* | | un carrusel de Instagram no es video con voz: sólo se usa si Hernán lo pide para una nota propia | | | corta a las 4 primeras | | corta a las 4 primeras | |
| **Imagen de enlace** (1080 × 565) | — (la tarjeta la arma Facebook con la nota) | — | — | — | sí, con el titular y **sin enlace por defecto** | sí: texto con el enlace (la tarjeta sólo existe en posteos de texto) | sí, con el enlace y su tarjeta | — (la vista previa del enlace) |

Lo que **no cambia nunca**: el aviso «Voz generada con inteligencia artificial.» en todo lo que habla, la sección de la nota en su color, el crédito de la foto en el pie, nada rojo ni de menores, y **ninguna pieza sale sin pasar por la
compuerta de tono** (R41). Todo lo que va a Instagram es video con voz, salvo el espejo de cada posteo de Facebook.
