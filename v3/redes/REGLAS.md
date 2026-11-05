# Las redes: las reglas

*Módulo `v3/redes/` (Worker `radar-redes`). Hace dos cosas: **publicar las notas del sitio en Facebook, con su espejo en Instagram** (§ 1 a 9) y **armar y publicar las piezas de video con voz** (§ 11, en ensayo). X, Threads, TikTok, YouTube y el canal de Telegram vienen después (etapa D, segunda parte); hasta el corte siguen saliendo por el sistema
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
| **Reel** (mp4 9:16, con voz) | **igual** en todas las que siguen: el mismo mp4 1080 × 1920 | igual | igual, **todos** (desde el 5/11: también farmacia, útiles, agenda, clima y avisos); marcar «contenido con IA»; la firma de abajo puede chocar con su regla de no poner marcas (primera prueba a mano) | igual, **todos** menos los de más de 60 s; techo de 12 por día (`TOPE_YOUTUBE_POR_DIA`) | video adjunto, **todos** (por Buffer) | video adjunto | video adjunto | video con pie de hasta 1.024 caracteres |
| *Lo que cambia en el texto* | enlace tocable a la nota del repaso; `#Balcarce #RadarBalcarce` + 1 | **sin enlace: «link en la bio»**; mismos hashtags | «link en la bio»; hasta 5 hashtags | título «pieza · Radar Balcarce»; la dirección dicha, no se toca; hasta 3 hashtags | 280 caracteres, titular + hashtags, sin enlace (con enlace cuesta 13 veces más) | 500 caracteres, 1 sola etiqueta de tema | 300 caracteres; enlace y hashtags declarados como «facetas» | enlace con vista previa |
| **Historia** (6 a 60 s) | sí, el mismo video (recortado a 58 s si hace falta) | sí, el mismo | el mismo mp4 (desde el 5/11) | el mismo mp4 si dura 60 s o menos (desde el 5/11) | el mismo mp4 (desde el 5/11) | — | — | — |
| *Lo que cambia* | sin pegatina de enlace (la API no la tiene): el enlace va en la bio de la página | ídem: «Nota completa: link en la bio» | | | | | | |
| **Posteo 4:5** (1080 × 1350, en oscuro) | sí, la misma imagen; texto con enlace tocable (`radarbalcarce.com/r/f/id`) y crédito | sí, la **misma imagen**, espejo de todo posteo de Facebook; texto sin enlace, «link en la bio»; los 2 fijos + hasta 3 de la nota | — | — | **sí (5/11): la misma placa**, titular + `#Balcarce #RadarBalcarce` + el tema, sin enlace (`X_CON_ENLACE` lo agrega) | — (usa la imagen de enlace) | — (usa la imagen de enlace) | la misma imagen como foto, pie de hasta 1.024 con el enlace |
| **Carrusel** (3 a 10 láminas 4:5) | álbum con las mismas láminas | carrusel, hasta 10 | modo foto (con música cuando haya) | — | hasta 4 fotos | hasta 10 (la API admite 20) | hasta 4 fotos | álbum de 2 a 10 |
| *Lo que cambia* | | un carrusel de Instagram no es video con voz: sólo se usa si Hernán lo pide para una nota propia | | | corta a las 4 primeras | | corta a las 4 primeras | |
| **Imagen de enlace** (1080 × 565) | — (la tarjeta la arma Facebook con la nota) | — | — | — | — (desde el 5/11 X usa la placa 4:5 del posteo, no esta imagen) | sí: texto con el enlace (la tarjeta sólo existe en posteos de texto) | sí, con el enlace y su tarjeta | — (la vista previa del enlace) |

Lo que **no cambia nunca**: el aviso «Voz generada con inteligencia artificial.» en todo lo que habla, la sección de la nota en su color, el crédito de la foto en el pie, nada rojo ni de menores, y **ninguna pieza sale sin pasar por la
compuerta de tono** (R41). Todo lo que va a Instagram es video con voz, salvo el espejo de cada posteo de Facebook.

## 11. Las piezas de video (reels e historias con voz): armadas en ensayo

*Qué sale, a qué hora y con qué dibujo: `piezas/REGLAS.md` (el dibujo es el de hoy) y la tabla de horarios `piezas-del-dia.mjs` (los de hoy). Este apartado es sólo cómo se arman y se publican.*

**Quién hace qué.** El Worker `radar-redes` **decide**; GitHub Actions **dibuja y habla** (resvg y ffmpeg no corren en un Worker; el repositorio es público y los minutos son gratis). Los dos hablan por HTTP con la misma contraseña que el bot (derivada de `TELEGRAM_TOKEN`):

1. El workflow «Radar 3.0: piezas de redes» (`v3-piezas.yml`, una vez por hora de 7:07 a 23:07, o a mano) corre `piezas/correr.mjs`.
2. `POST /piezas/plan` al Worker: mira la tabla de horarios (hora, ventana, día de la semana), **reserva** en la tabla `piezas` lo que toca y le arma los datos que salen de la base: las notas del repaso (Balcarce primero, hasta 2; lo demás, lo más contado; 3 en total, con foto, sin tono triste, sin lo que frenó la ley y sin repetir las de un repaso anterior del día) y el comercio del clima (tabla `avisos`, lugar `clima`; uno por día, rotando; la cuenta de Instagram sale del enlace; sin aviso, clima normal).
3. El programa junta lo que no está en la base (clima de Open-Meteo, farmacia de turno del sitio del Colegio, efeméride de `web/data/efemerides-piezas.json`), arma la pieza, **pide la voz** (la locutora o el locutor propios, `CRITERIO-REDES.md` § 6), dibuja el video con la voz y los subtítulos de la voz y le cuenta el resultado al Worker (`POST /piezas/resultado`).
4. **Ensayo** (`REDES_ACTIVAS` en «no», el mismo interruptor que los posteos): el mp4, el mp3 y un `.json` por pieza quedan como adjunto de la corrida (7 días) y la fila de `piezas` queda en «lista» con el guion, el texto del posteo, los archivos y **lo que se habría publicado** (red, reel o historia; la hora está en la fila). **No se llama nunca a Meta.** El resumen de las 22:05 cuenta las piezas armadas y las fallas. **Real** («si»): reel e historia en Instagram y Facebook (el clima y la farmacia: historia en Instagram, y reel e historia en Facebook), con el mismo mp4.

**Reglas que no cambian.**
- **Cupo de voz: 10 audios por día** (`VOZ_TOPE_DIARIO` en el Worker lo cambia). El Worker no reserva una pieza si dejaría sin audio a otra más importante que falta hoy (el repaso antes que el clima y la farmacia, esos antes que la efeméride, todos antes que Participá). Un audio de la memoria de voces no gasta cupo. Si Google dice que se acabó el del día, la pieza queda en «sin-cupo» y **no sale**: nunca con otra voz.
- Cada pieza sale **una sola vez por día y por modo** (índice único). Si falla, se reintenta en la corrida siguiente, hasta 3 errores; si falta un dato de afuera («sin-datos»: el clima no responde, no hay efeméride preparada) tampoco gasta voz y se reintenta mientras dure su ventana. Una reserva que no vuelve en 45 minutos se da por cortada.
- **Ensayo sin voz:** mientras `REDES_ACTIVAS` sea «no» y no exista el secreto `GEMINI_API_KEY_REDES_V3`, las piezas se dibujan MUDAS (subtítulos estimados del guion; el `.json` dice «sin voz: ensayo») para no gastar el cupo de la clave del sistema viejo. Con `_V3` hablan; en real, con `GEMINI_API_KEY_REDES`.
- **El repaso y Balcarce:** una nota es «de Balcarce» según el núcleo (su motivo), no según su sección (puede estar en Cultura o Educación). Una nota de Balcarce **sin foto entra igual** y va con la placa de su sección; lo de afuera sin foto no. Si en la ventana no hay ninguna de Balcarce, el repaso sale con las más contadas y el `.json` anota «sin notas de Balcarce en la ventana».
- Ensayo y real no se mezclan (cupos y reservas por separado), y `solo`/`ahora` sólo valen con las redes apagadas.
- El texto del posteo: nombre de la pieza, lo que cuenta, «Voz generada con inteligencia artificial.», `#Balcarce #RadarBalcarce` y el tema; Facebook con `radarbalcarce.com`, Instagram con «link en la bio». Nunca la fuente ni `.com.ar`.
- Si la voz dura más que el video, la última escena se estira para no cortarla (los tiempos finos de cada placa contra la voz: pendiente).
- **Piezas de servicio (3/11):** teléfonos útiles (sábados 17:00), agenda del fin de semana (jueves 12:00, sólo si el municipio tiene eventos en los próximos días), feriado (8:00, sólo si el feriado tiene datos verificados y el panel no pidió cambiarlo) y avisos de clima por helada fuerte, granizo o viento de 60 o más (07:00 a 22:00, historia con voz, sin saludo, sin Buffer). Las tres condicionales entran al plan sólo si el programa (`correr.mjs`) mira antes y manda `conDatos` a `/piezas/plan`; sin datos no se reservan ni gastan voz.
- **Nunca de servicio:** la nota del clima diario, el media kit, el dólar del día y cualquier nota con `ficha.marca` no salen como posteo, reel, repaso ni historia (`esNotaDeServicio` y `esCotizacionDelDia`, `elegir.mjs`).

**Secretos y variables.** GitHub: `TELEGRAM_TOKEN`, `GEMINI_API_KEY_REDES`, `META_TOKEN`; opcional `GEMINI_API_KEY_REDES_V3` (una clave de voz aparte para el ensayo: con la misma clave del sistema viejo, los dos gastan el mismo cupo de Google); variables `V3_AUDIOS_POR_DIA`, `V3_REDES_URL`. Worker: `REDES_ACTIVAS`, `VOZ_TOPE_DIARIO` (opcional).
**Cómo se prueba:** `node --test "v3/redes/**/*.test.mjs"` (el plan con la base en memoria; el programa de punta a punta contra el Worker de verdad, con una voz, un dibujo y un Meta de mentira).

## 12. Buffer, Bluesky y Threads (3/11)

**Buffer (TikTok, YouTube Shorts y X), igual que el sistema viejo.** Después de publicar en Meta, el programa sube el mp4 a R2 (`listos/<día>-<pieza>-<fila>/<archivo>` en el bucket `R2_RENDER`) y Buffer lo lee por `https://radar-balcarce-tareas.radarbalcarce.workers.dev/video/…`: **ese Worker tiene que seguir en pie.** Reparto (`redesDeBuffer`, `piezas-del-dia.mjs`; **Hernán, 5/11: «en todas las redes sale todo el material que se genere y la red lo permita, medimos una semana qué sirve y después recortamos»**): TikTok, YouTube Shorts y X reciben **todos** los videos, historias y avisos de clima incluidos (no hay razón técnica para dejar nada afuera: es el mismo mp4 y Buffer lo lee igual). Los únicos frenos de YouTube: el tope de 12 por día (variable `TOPE_YOUTUBE_POR_DIA`, en `wrangler.toml`) y los videos de más de 60 s (quedan como «omitida» en las acciones de la pieza y no gastan el tope). Que Buffer falle o no tenga `BUFFER_API_KEY` no cambia el estado de la pieza (lo decide Meta): queda anotado en sus acciones y en el aviso. En ensayo queda `simulada`.

**Bluesky y Threads, como «enlace».** Son las notas que ya salieron en Facebook ese día (así ya pasaron ley, tono, foto y cupos), una vez por red, la más vieja primero, hasta 3 por red y por corrida, dentro de las 12 horas. El Worker decide (`/enlaces/plan`, `/enlaces/resultado`, `enlaces.mjs`); GitHub dibuja la imagen 1,91:1, llama a la API y cuenta cómo salió (`piezas/enlaces.mjs`, paso «Publicar los enlaces» de `v3-piezas.yml`). Con `REDES_ACTIVAS` en «no» sólo deja texto e imagen en la carpeta de salida. En real, una red sin secretos no publica (no se simula).
- Bluesky: handle `radarbalcarce.bsky.social` (variable `BLUESKY_HANDLE`) y secreto `BLUESKY_APP_PASSWORD` (contraseña de aplicación: Bluesky → Configuración → Privacidad y seguridad → Contraseñas de aplicación → Agregar; nunca la de la cuenta). Texto de hasta 300 grafemas con tarjeta de enlace e imagen.
- Threads: secretos `THREADS_TOKEN` y `THREADS_USER_ID`. Texto de hasta 500 con una sola etiqueta y el enlace (`link_attachment`; verificar en el primer posteo real que Threads arme la tarjeta). **El token de larga duración vence a los 60 días**: renovarlo antes (`th_refresh_token`) y volver a pegarlo.
- **X con la placa de cada nota (5/11).** Va como una tercera red del paso «Publicar los enlaces» (`enlaces.mjs` y `piezas/enlaces.mjs`): las mismas notas que salieron en Facebook, pero sólo cuando su placa ya está dibujada en R2. La imagen es la **placa 4:5 (1080 × 1350)**, ya pública en `/placa/<nombre>` del Worker `radar-redes` (se eligió ésa y no la imagen de enlace 1080 × 565 porque no hay que subir nada nuevo y en el celular se ve más grande). El texto (`x.mjs`): titular + `#Balcarce #RadarBalcarce` + 1 del tema, **sin enlace** (`X_CON_ENLACE` = «si», variable del Worker, lo agrega con su origen). Se publica con `publicarFoto` / `publicarImagen` de `redes/buffer.mjs` (`assets: [{ image: { url } }]`, según la documentación de Buffer). Interruptor `BUFFER_IMAGENES` (variable de GitHub; «no» lo apaga; por defecto encendido). Hace falta el secreto `BUFFER_API_KEY` en ese paso (ya está cargado en el workflow). **No probado todavía contra el canal de X de verdad.** TikTok modo foto: sin confirmar en la API de Buffer, queda en `docs/3-0/PENDIENTES-3-0.md`.
- Prueba: `v3/redes/servicios-nuevos.test.mjs` (los dos últimos bloques son los de X).
- Prueba: `v3/redes/servicios-nuevos.test.mjs`.
