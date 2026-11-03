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
