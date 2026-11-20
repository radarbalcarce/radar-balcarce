# Las redes: las reglas

*Módulo `v3/redes/` (Worker `radar-redes`). Hace dos cosas: **publicar las notas del sitio en Facebook, con su espejo en Instagram** (§ 1 a 9) y **armar y publicar las piezas de video con voz** (§ 11). Desde el 5/11 X, TikTok y YouTube salen por Buffer y Threads y Bluesky publican enlaces (§ 12); el canal de Telegram no tiene programa. Escrito el 3/11/2026, § 2 revisada el 17/11/2026 con las decisiones de `docs/propuestas/PLAN-RADAR-3-0.md` (§ 3.9 y sección 10). Si el programa hace otra cosa que esto, el programa está mal.*

Cada red tiene su propio `REGLAS.md` con el detalle: `facebook/REGLAS.md` e `instagram/REGLAS.md`. Acá va lo que comparten.

## 1. Qué hace y cuándo

- **Cada 15 minutos, de 8:00 a 22:00 de Balcarce**, el Worker mira las notas publicadas y decide si toca publicar una. Publica **como mucho una por vuelta** en Facebook
  (más su espejo en Instagram).
- **A las 22:05** manda por Telegram el resumen del día: cuántos posteos salieron en cada red, cuáles (con la hora) y cuáles fallaron.
- Todo se cuenta por **día de Balcarce** (de las 00:00 a las 24:00 de acá, UTC-3 todo el año).

## 2. El interruptor: PRENDIDO desde el 3/11/2026 (revisado el 17/11/2026 contra el código y `wrangler.toml`)

- La variable **`REDES_ACTIVAS`** del Worker (`v3/redes/wrangler.toml`) vale **«si»**: las redes **publican de verdad**. Con «no» el Worker simula (elige, arma el texto, lo anota en `publicaciones` con
  `simulado = 1` y no llama a Meta); el código sigue teniendo ese modo, pero hoy no se usa. Lo simulado y lo real no se mezclan (cupos y espaciado se cuentan por separado). El 17/11 `/salud` dio `activas: true` y `simulado: 0`.
  **Mandan los valores de `wrangler.toml`, no las variables de GitHub `REDES_ACTIVAS = No` y `REDES_ACTIVAS_NUBE = No`**: son del sistema viejo y confunden (auditoría del 17/11, H-12).
- **Los demás interruptores del Worker** (`wrangler.toml`): `POSTEOS_ACTIVOS = si` («no» frena sólo los posteos de notas; los reels y las historias siguen), `POSTEOS_CON_PLACA = si` (el posteo sale con la placa de la marca, nunca con la foto sola),
  `INSTAGRAM_ESPEJO = si`, `X_CON_ENLACE = no`, `TOPE_YOUTUBE_POR_DIA = 12`. El cupo de voz (15 por día) está en el código (§ 11).
- **Qué publica hoy cada red** (según el código; el detalle por pieza, en `docs/3-0/CONTENIDO-REDES-3-0.md`):
  - **Facebook:** posteos de notas (placa 4:5 con el enlace tocable; hasta 10 por día: 5 de Balcarce y 5 de lo más contado, § 4), y las piezas de video: reels y historias de los repasos, clima, farmacia, efeméride, Participá, útiles, feriado y avisos de clima (§ 11), más el álbum de «La semana en Balcarce» los domingos.
  - **Instagram:** el espejo de cada posteo de Facebook (la misma placa, sin enlace: «link en la bio») y reels e historias con voz; el carrusel del domingo.
  - **TikTok, YouTube Shorts y X (por Buffer):** el mismo mp4 de cada pieza de video (YouTube con tope de 12 por día y sin los de más de 60 s); X además publica la placa de cada nota que salió en Facebook, sin enlace (§ 12). TikTok modo foto: sin confirmar.
  - **Threads y Bluesky:** las notas que ya salieron en Facebook, con su placa y el enlace, hasta 3 por red y por corrida (§ 12). La tarjeta de servicio (clima, farmacia, efeméride) está **apagada** (`TARJETAS_DE_SERVICIO: 'no'` en `v3-piezas.yml`, § 19).
  - **Canal de Telegram:** sin programa (`docs/3-0/REDES.md`).
  - **En pausa (`pausada: true` en `piezas-del-dia.mjs`):** el reel de agenda del jueves, el carrusel «El finde en Balcarce» y el carrusel de cada nota propia.
  - **No verificado el 17/11:** los posteos de TikTok por Buffer de ese día (el error del 13/11 no se pudo mirar en la tabla `publicaciones`).
- Con las redes prendidas **sólo cuentan las notas `publicada`**.

## 3. Qué notas van

Una nota va a las redes si cumple **todo** esto:

1. **Es del núcleo** (la escribió y verificó el sistema nuevo). Las notas migradas del sistema viejo y las que escribe una persona por Telegram no van por acá (las de Telegram
   tienen su propia pregunta de redes, que se atiende en una etapa siguiente).
2. **Es de Balcarce, o la cuentan muchos medios.** Lo de Balcarce va siempre. Lo de afuera, sólo si lo cuentan **5 medios distintos o más**. Lo de la zona (otras ciudades) no va.
3. **Tiene foto** (`nota.foto.url`, la que eligió el núcleo, o la ilustración con IA del núcleo: REGLAS del núcleo § 7 quater). Sin foto, no va: todo lo que sale a redes lleva imagen. **Única excepción (Hernán, 6/11):** una nota **de Balcarce** sin ninguna imagen sale en el posteo de feed (y en Instagram) y en la imagen de enlace con **la placa de su sección** en lugar de la foto; lo de afuera sin imagen sigue sin salir. **Espera de la foto (10/11, Hernán vio varios posteos con placa cuyas notas tuvieron foto después):** la placa sola sale recién **150 minutos después de publicada la nota** (`esperaDeLaFotoMin`), el tiempo en que el núcleo agota la búsqueda de foto (4 intentos cada 45 min) y la ilustra con IA; si la foto llega antes, el posteo sale enseguida con la foto. **Una foto que no baja nunca deja salir a una nota de afuera con placa (12/11, caso Espinoza):** en los reels de repaso y los carruseles una foto que no se pudo bajar iba con la placa de la sección *sea de donde sea la nota*; ahora, si la nota no es de Balcarce, la pieza falla («la foto de una nota de afuera no bajó, no sale con placa») y se reintenta en la corrida siguiente (`notasDeAfueraConFotoCaida`, `piezas/correr.mjs`). Sólo Balcarce sin foto (o con la foto caída) sale con placa, y recién pasada la espera. Pruebas: `piezas/correr.test.mjs` y `elegir.test.mjs` (caso real).
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

## 11. Las piezas de video (reels e historias con voz)

*Qué sale, a qué hora y con qué dibujo: `piezas/REGLAS.md` (el dibujo es el de hoy) y la tabla de horarios `piezas-del-dia.mjs` (los de hoy). Este apartado es sólo cómo se arman y se publican.*

**Quién hace qué.** El Worker `radar-redes` **decide**; GitHub Actions **dibuja y habla** (resvg y ffmpeg no corren en un Worker; el repositorio es público y los minutos son gratis). Los dos hablan por HTTP con la misma contraseña que el bot (derivada de `TELEGRAM_TOKEN`):

1. El workflow «Radar 3.0: piezas de redes» (`v3-piezas.yml`, una vez por hora de 7:07 a 23:07, o a mano) corre `piezas/correr.mjs`.
2. `POST /piezas/plan` al Worker: mira la tabla de horarios (hora, ventana, día de la semana), **reserva** en la tabla `piezas` lo que toca y le arma los datos que salen de la base: las notas del repaso (Balcarce primero, hasta 2; lo demás, lo más contado; 3 en total, con foto, sin tono triste, sin lo que frenó la ley y sin repetir las de un repaso anterior del día) y el comercio del clima (tabla `avisos`, lugar `clima`; uno por día, rotando; la cuenta de Instagram sale del enlace; sin aviso, clima normal).
3. El programa junta lo que no está en la base (clima de Open-Meteo, farmacia de turno del sitio del Colegio, efeméride de `web/data/efemerides-piezas.json`), arma la pieza, **pide la voz** (la locutora o el locutor propios, `CRITERIO-REDES.md` § 6), dibuja el video con la voz y los subtítulos de la voz y le cuenta el resultado al Worker (`POST /piezas/resultado`).
4. **Ensayo** (`REDES_ACTIVAS` en «no», el mismo interruptor que los posteos): el mp4, el mp3 y un `.json` por pieza quedan como adjunto de la corrida (7 días) y la fila de `piezas` queda en «lista» con el guion, el texto del posteo, los archivos y **lo que se habría publicado** (red, reel o historia; la hora está en la fila). **No se llama nunca a Meta.** El resumen de las 22:05 cuenta las piezas armadas y las fallas. **Real** («si»): reel e historia en Instagram y Facebook (el clima y la farmacia: historia en Instagram, y reel e historia en Facebook), con el mismo mp4.

**Reglas que no cambian.**
- **Cupo de voz: 15 audios por día, fijos** (Hernán, 13/11/2026; las notas propias de Hernán no lo gastan). Un solo lugar: `REGLAS_PIEZAS.audiosPorDia` en `piezas-plan.mjs`; `VOZ_CUPO_DIARIO` (`piezas/variables.mjs`) y `AUDIOS_POR_DIA` (`reels/cupo-voz.mjs`) tienen que valer lo mismo y una prueba lo controla. `VOZ_TOPE_DIARIO` sólo sirve para ensayar con otro número: no se pone en `wrangler.toml` ni en los workflows. El Worker no reserva una pieza si dejaría sin audio a otra más importante que falta hoy (el repaso antes que el clima y la farmacia, esos antes que la efeméride, todos antes que Participá). Un audio de la memoria de voces no gasta cupo. Si Google dice que se acabó el del día, la pieza queda en «sin-cupo» y **no sale**: nunca con otra voz.
- Cada pieza sale **una sola vez por día y por modo** (índice único). Si falla, se reintenta en la corrida siguiente, hasta 3 errores; si falta un dato de afuera («sin-datos»: el clima no responde, no hay efeméride preparada) tampoco gasta voz y se reintenta mientras dure su ventana. Una reserva que no vuelve en 45 minutos se da por cortada.
- **Ensayo sin voz:** mientras `REDES_ACTIVAS` sea «no» y no exista el secreto `GEMINI_API_KEY_REDES_V3`, las piezas se dibujan MUDAS (subtítulos estimados del guion; el `.json` dice «sin voz: ensayo») para no gastar el cupo de la clave del sistema viejo. Con `_V3` hablan; en real, con `GEMINI_API_KEY_REDES`.
- **El repaso sale siempre con 3 notas** (Hernán, 17/11: § 21). **El repaso y Balcarce:** una nota es «de Balcarce» según el núcleo (su motivo), no según su sección (puede estar en Cultura o Educación). Una nota de Balcarce **sin foto entra igual** y va con la placa de su sección; lo de afuera sin foto no. Si en la ventana no hay ninguna de Balcarce, el repaso sale con las más contadas y el `.json` anota «sin notas de Balcarce en la ventana».
- Ensayo y real no se mezclan (cupos y reservas por separado), y `solo`/`ahora` sólo valen con las redes apagadas.
- El texto del posteo: nombre de la pieza, lo que cuenta, «Voz generada con inteligencia artificial.», `#Balcarce #RadarBalcarce` y el tema; Facebook con `radarbalcarce.com`, Instagram con «link en la bio». Nunca la fuente ni `.com.ar`.
- Si la voz dura más que el video, la última escena se estira para no cortarla (los tiempos finos de cada placa contra la voz: pendiente).
- **Piezas de servicio (3/11):** teléfonos útiles (sábados 17:00), agenda del fin de semana (jueves 12:00, sólo si el municipio tiene eventos en los próximos días), feriado (8:00, sólo si el feriado tiene datos verificados y el panel no pidió cambiarlo) y avisos de clima por helada fuerte, granizo o viento de 60 o más (07:00 a 22:00, historia con voz, sin saludo, sin Buffer). Las tres condicionales entran al plan sólo si el programa (`correr.mjs`) mira antes y manda `conDatos` a `/piezas/plan`; sin datos no se reservan ni gastan voz.
- **Nunca de servicio:** la nota del clima diario, el media kit, el dólar del día y cualquier nota con `ficha.marca` no salen como posteo, reel, repaso ni historia (`esNotaDeServicio` y `esCotizacionDelDia`, `elegir.mjs`).

**Secretos y variables.** GitHub: `TELEGRAM_TOKEN`, `GEMINI_API_KEY_REDES`, `META_TOKEN`; opcional `GEMINI_API_KEY_REDES_V3` (una clave de voz aparte para el ensayo: con la misma clave del sistema viejo, los dos gastan el mismo cupo de Google); variable `V3_REDES_URL` (`V3_AUDIOS_POR_DIA` ya no se lee: el cupo está en el código). Worker: `REDES_ACTIVAS`.
**Cómo se prueba:** `node --test "v3/redes/**/*.test.mjs"` (el plan con la base en memoria; el programa de punta a punta contra el Worker de verdad, con una voz, un dibujo y un Meta de mentira).

## 12. Buffer, Bluesky y Threads (3/11)

**Buffer (TikTok, YouTube Shorts y X), igual que el sistema viejo.** Después de publicar en Meta, el programa sube el mp4 a R2 (`listos/<día>-<pieza>-<fila>/<archivo>` en el bucket `R2_RENDER`) y Buffer lo lee por `https://radar-balcarce-tareas.radarbalcarce.workers.dev/video/…`: **ese Worker tiene que seguir en pie.** Reparto (`redesDeBuffer`, `piezas-del-dia.mjs`; **Hernán, 5/11: «en todas las redes sale todo el material que se genere y la red lo permita, medimos una semana qué sirve y después recortamos»**): TikTok, YouTube Shorts y X reciben **todos** los videos, historias y avisos de clima incluidos (no hay razón técnica para dejar nada afuera: es el mismo mp4 y Buffer lo lee igual). Los únicos frenos de YouTube: el tope de 12 por día (variable `TOPE_YOUTUBE_POR_DIA`, en `wrangler.toml`) y los videos de más de 60 s (quedan como «omitida» en las acciones de la pieza y no gastan el tope). Que Buffer falle o no tenga `BUFFER_API_KEY` no cambia el estado de la pieza (lo decide Meta): queda anotado en sus acciones y en el aviso. En ensayo queda `simulada`.

**Bluesky y Threads, como «enlace».** Son las notas que ya salieron en Facebook ese día (así ya pasaron ley, tono, foto y cupos), una vez por red, la más vieja primero, hasta 3 por red y por corrida, dentro de las 12 horas. El Worker decide (`/enlaces/plan`, `/enlaces/resultado`, `enlaces.mjs`); GitHub dibuja la imagen 1,91:1, llama a la API y cuenta cómo salió (`piezas/enlaces.mjs`, paso «Publicar los enlaces» de `v3-piezas.yml`). Con `REDES_ACTIVAS` en «no» sólo deja texto e imagen en la carpeta de salida. En real, una red sin secretos no publica (no se simula).
- Bluesky: handle `radarbalcarce.bsky.social` (variable `BLUESKY_HANDLE`) y secreto `BLUESKY_APP_PASSWORD` (contraseña de aplicación: Bluesky → Configuración → Privacidad y seguridad → Contraseñas de aplicación → Agregar; nunca la de la cuenta). Texto de hasta 300 grafemas con tarjeta de enlace e imagen.
- Threads: secretos `THREADS_TOKEN` (respaldo: el token vigente lo guarda y renueva solo el Worker, § 25) y `THREADS_USER_ID`. También reciben el video de cada pieza (§ 26). Texto de hasta 500 con una sola etiqueta y el enlace. **Desde el 10/11/2026 lleva la placa de SU nota** (caso del Papa: con sólo texto + `link_attachment`, Meta armó la tarjeta leyendo la página y tomó una miniatura de «Seguí leyendo», una foto de Colapinto de otra nota): el Worker (`enlaces.mjs`) le pasa `imagen` = la dirección pública `/placa/<id>-<huella>.jpg` de esa misma nota, sólo si la placa ya está dibujada en R2; el cliente (`threads.mjs`) crea un contenedor `IMAGE` con `image_url` y el enlace dentro del texto (sin `link_attachment`), espera FINISHED y publica. Sin placa dibujada, sale como antes (`TEXT` + enlace). Si Threads no puede bajar la imagen, el posteo falla y se reintenta como cualquier error (no cae a `TEXT`, que traería de nuevo la miniatura equivocada). La etiqueta `#Balcarce` no cambia (decisión de los dueños). **El token de larga duración vence a los 60 días**: renovarlo antes (`th_refresh_token`) y volver a pegarlo.
- **X con la placa de cada nota (5/11).** Va como una tercera red del paso «Publicar los enlaces» (`enlaces.mjs` y `piezas/enlaces.mjs`): las mismas notas que salieron en Facebook, pero sólo cuando su placa ya está dibujada en R2. La imagen es la **placa 4:5 (1080 × 1350)**, ya pública en `/placa/<nombre>` del Worker `radar-redes` (se eligió ésa y no la imagen de enlace 1080 × 565 porque no hay que subir nada nuevo y en el celular se ve más grande). El texto (`x.mjs`): titular + `#Balcarce #RadarBalcarce` + 1 del tema, **sin enlace** (`X_CON_ENLACE` = «si», variable del Worker, lo agrega con su origen). Se publica con `publicarFoto` / `publicarImagen` de `redes/buffer.mjs` (`assets: [{ image: { url } }]`, según la documentación de Buffer). Interruptor `BUFFER_IMAGENES` (variable de GitHub; «no» lo apaga; por defecto encendido). Hace falta el secreto `BUFFER_API_KEY` en ese paso (ya está cargado en el workflow). **No probado todavía contra el canal de X de verdad.** TikTok modo foto: sin confirmar en la API de Buffer, queda en `docs/3-0/PENDIENTES-3-0.md`.
- Prueba: `v3/redes/servicios-nuevos.test.mjs` (los dos últimos bloques son los de X).
- Prueba: `v3/redes/servicios-nuevos.test.mjs`.

## 14. Quién dispara las piezas y las fotos propias (10/11)

GitHub dejó de lanzar sus horarios (`schedule:`) durante horas el 10/11/2026, así que **el reloj de estos dos workflows es ahora el Worker `radar-redes`** (`disparar-acciones.mjs`): a cada hora le pide a la API de GitHub un `workflow_dispatch` (responde 204) y los dos workflows ya no tienen `schedule:`.
- **Piezas de redes** (`v3-piezas.yml`): cron `7 10-23,0-2 * * *` (UTC), de 7:07 a 23:07 de Balcarce. Manda `automatico = true` y nada más: es lo que toca ahora, y publica de verdad si `REDES_ACTIVAS` es «si», igual que antes. El workflow no distingue horario de a mano.
- **Fotos propias** (`v3-fotos-propias.yml`): cron `40 9,11,13,15,17,19,21,23,1 * * *` (UTC, lo mismo que `40 9-23/2,1`), de 6:40 a 22:40 de Balcarce. Manda `automatico = true`, `simular = false` y `tope = 60`: copia de verdad, pero el job sólo corre si la variable de GitHub `FOTOS_PROPIAS_ACTIVAS` vale «si» (como antes con el horario). A mano, `automatico` queda en `false` y manda `simular` (por defecto sí).
- **Secreto:** `GITHUB_TOKEN_ACCIONES` (token de grano fino con «Actions: lectura y escritura» sobre este repositorio; el workflow de desplegar lo carga desde el secreto de GitHub `RELOJ_GITHUB_TOKEN`). Sin él no dispara y deja un aviso en el log.
- **Si GitHub no contesta 204:** reintenta una vez a los 3 segundos; si vuelve a fallar, avisa por Telegram. Nunca frena el resto del `scheduled`.
- **Desde el 17/11/2026 (auditoría H-03; GitHub llegó a lanzar sus `schedule:` 9 h tarde) esos dos crons despiertan además, con `ademas` y sin gastar crons (el plan gratis da cinco por Worker):** las estadísticas (0:07 UTC, 21:07 de Balcarce; `v3-estadisticas.yml` ya no tiene `schedule:`: con los dos mandaría el resumen dos veces), «Un día como hoy» y feriados del mes que viene (el día 20 a las 13:07 UTC, `diaDelMesUTC`; con `automatico` espera la variable `EFEMERIDES_V3_ACTIVAS`) y el respaldo de la base (1:40 UTC = 22:40 de Balcarce, con el cron de las fotos). `v3-efemerides.yml` y `v3-respaldo-d1.yml` conservan su `schedule:` de GitHub como respaldo tardío porque no duplican trabajo (las efemérides suman a lo armado y no commitean sin cambios; el respaldo de la base lleva la fecha del día, y la copia tardía es de otro día). Quedan con `schedule:` de GitHub: `pruebas.yml` (control de los lunes) y los workflows del sistema viejo. Pruebas al final de `disparar-acciones.test.mjs`.
- Los otros crons (`*/15 0,11-23`, `0 1`, `5 1`) siguen haciendo lo de siempre: el `scheduled` decide por el cron exacto y sólo los dos nuevos disparan.
- Para volver a los horarios de GitHub: sacar los dos crons de `wrangler.toml` y devolverle el `schedule:` a cada workflow (las horas de antes quedaron escritas en sus comentarios).
- Pruebas: `v3/redes/disparar-acciones.test.mjs` (cron, cuerpo, reintento, aviso, sin token, horarios contra wrangler.toml y workflows).

## 15. Lo que se pide a mano desde Telegram: /redes y /repaso (11/11)

- **`/redes <nota> <formatos>`** deja en `notas.redes` `forzada: true`, `confirmada: true`, `lista` (los formatos) y `pedida`. Para una nota del **motor** (origen distinto de `redaccion`) eso la hace salir como una propia, sin serlo: `forzada` en `db.mjs` (`notasDelNucleo` lee `redes` y trae `forzada` y `redesElegidas`; en una base sin esa columna todo sigue como antes).
  - **Posteo:** `tipoDeNota` la trata como `nacional` si no es de Balcarce (no pide 5 medios), `saleEn` la limita a los formatos pedidos, no cuenta contra los cupos del día ni espera los 90 minutos entre posteos y va antes que el resto; `motivoDeExclusion` sigue frenando lo de la ley (`no-publicar`, sepelios, servicio, tono R41, sin foto) y sólo se saltea `no-es-noticia`. Su edad se cuenta desde el pedido (8 horas), no desde que se publicó: una nota de hace días se puede mandar.
  - **Reel, historia y carrusel:** `notasPropiasParaCarrusel` (`piezas-db.mjs`) también trae las del motor con `forzada` y pedido dentro de las 72 horas, con la firma **«Radar Balcarce»** (el armador del reel usa la firma de Hernán si la nota no trae una que no empiece con «Redacción») y los créditos de sus fotos intactos. Sale por el mismo camino que el reel y el carrusel de una nota propia: una vez por nota, de 8 a 23.
  - Lo que **no** cambia: lo que ya salió (publicaciones, `piezas`) no se repite; una nota `oculta` o `retirada` no entra a nada (todas las consultas de las redes piden `estado = 'publicada'`).
- **`/repaso <nota>`** deja `redes.repaso = true` y `pedida`. `notasParaRedes` la trae con `alRepaso` (y también las propias, que de otro modo no entran en los repasos). `notasDelRepaso` pone primeras (hasta 3, la más reciente pedida primero) las que tienen `alRepaso` y el pedido de hace menos de 24 horas, aunque no las cuenten tantos medios; después completa como siempre (Balcarce hasta 2 contando las pedidas, y lo más contado). Mismo filtro de ley, tono y foto. «Una nota, un formato» no frena el pedido a mano si ya salió como posteo, pero lo que ya contó otro repaso (hoy o ayer) no se repite.

## 13. Los carruseles (5/11)

*Desde el 11/11 sin carrusel de nota propia; sólo el del domingo (Hernán): la pieza `carrusel-nota` está `pausada: true` y el plan sólo la arma si se la pide con `solo`.*

*Hernán, 5/11: «en todas las redes sale todo el material que se genere y la red lo permita, así medimos una semana qué sirve». Un carrusel son varias imágenes 4:5 (1080 × 1350) en un solo posteo: **álbum en Facebook** y **carrusel en Instagram** (hasta 10 imágenes). No tiene voz, así que no gasta ningún audio del cupo, y no pasa por Buffer. TikTok modo foto y X con fotos: no son de este apartado (ver `docs/3-0/PENDIENTES-3-0.md`, ítem 7).*

**Los tres carruseles**
1. **«La semana en Balcarce»** (domingos a las 11:00, hora de Balcarce; ventana de 3 horas). Portada, una lámina por cada una de las 5 a 8 notas de Balcarce más importantes de los últimos 7 días y una lámina de cierre «Todo en radarbalcarce.com». «Más importantes» = las que más medios contaron y, si empatan, las más nuevas; nunca dos del mismo tema. Pasan por la misma compuerta que los repasos: nada rojo, nada de menores, nada de tono triste (R41), nada de servicio (clima del día, dólar, media kit). Cada lámina lleva el título y la sección en su color, la foto con su crédito en el pie o, si la nota no tiene foto, la placa de color de su sección con el nombre grande (nunca una tarjeta vacía). Si hay menos de 5 notas, ese domingo no sale.
2. **«El finde en Balcarce»** (jueves a las 18:00; ventana de 2 horas). Portada, láminas con la agenda del municipio (hasta 3 actividades por lámina, hasta 9 actividades) y cierre. Es **condicional**, como la pieza de agenda: el programa mira antes si hay eventos en los próximos 4 días y sólo si los hay lo pide al plan.
3. **El carrusel de una nota propia** (de la redacción, con 3 fotos o más). Sale apenas se publica la nota, **una sola vez por nota** (lo cuida la tabla `piezas` con una fila `carrusel-nota-<id de la nota>`, en cualquier día) y hasta 72 horas después de publicada. La portada es la foto principal con el título; sigue una lámina por foto y la última lleva «La nota completa». Cuentan sólo las fotos que tienen dirección pública (`https`): las que están sólo guardadas en el depósito del sitio, sin dirección, todavía no entran. Si la persona eligió «Sólo la web» a propósito (con confirmación), no sale; si nunca eligió, sale (regla de Hernán: todo lo que se genera). El bot de Telegram guarda todas las fotos de la nota (hasta 10) en `fotos-notas/redaccion-<id>-<n>.jpg` con dirección pública, así que este carrusel sale de las notas propias con 3 fotos o más.

**Cómo se publica.** Igual que las piezas de video: el Worker `radar-redes` decide y reserva (`piezas-plan.mjs`, `piezas-carruseles.mjs`); el programa de GitHub dibuja (`piezas/correr.mjs`). Cada lámina se pasa a JPEG y se sube al mismo depósito que las placas de los posteos (`placas/` de R2) con el nombre `lam-<día>-<sem|fin|n<id de nota>>-<número>-<huella>.jpg`; Meta la baja por `https://radar-redes.radarbalcarce.workers.dev/placa/<nombre>` (pública). Después `publicarCarruselEnInstagram` y `publicarAlbumEnFacebook` (`redes/meta.mjs`) publican con las mismas direcciones. **Si una lámina no se puede subir, no se publica nada** (un carrusel a medias no sirve) y la pieza queda en error para reintentarse en la corrida siguiente (hasta 3 veces).

**Qué dice el texto.** El nombre del carrusel, la lista breve (las notas numeradas, las actividades con día y hora, o el título de la nota), y «Todo en radarbalcarce.com» con su enlace en Facebook (con el origen `utm_campaign=carrusel`) o «link en la bio» en Instagram. Después `#Balcarce #RadarBalcarce` y el tema. **Sin el aviso de voz con IA**: no hay voz.

**Ensayo.** Con `REDES_ACTIVAS` distinto de «si» sólo se dibujan las láminas (quedan como adjunto de la corrida, 7 días) y la fila de `piezas` queda en «lista» con el texto y lo que se habría publicado (Instagram/CARRUSEL y Facebook/ALBUM); no se sube nada a R2 ni se llama a Meta.

**Qué falta confirmar con Meta de verdad** (no se pudo probar sin publicar): que Instagram acepte los JPEG de `/placa/` como hijos del carrusel y que el álbum de Facebook salga con las fotos en el orden de las láminas. Mirar el primer posteo real.

**Código y pruebas.** Armadores `armarCarruselSemana` y `armarCarruselFinde` (`piezas/armadores.mjs`), láminas `lamina-portada|nota|eventos|cierre` (`piezas/escenas.mjs`), filas `carrusel-semana`, `carrusel-finde` y `carrusel-nota` de `piezas-del-dia.mjs` (`sinVoz: true`). Pruebas: `v3/redes/carruseles.test.mjs`.

## 16. La nota del diario de «Un día como hoy» (12/11, Hernán)

- Primero la nota y después las piezas: a las 7:07 (primera vuelta del día) el Worker `radar-redes` despierta el workflow `v3-nota-efemeride.yml` (`ademas` de `disparar-acciones.mjs`, sin un cron más) y a las 9 salen el reel, la historia y el posteo con su enlace (las piezas con enlace: pendiente de la segunda etapa).
- La arma un programa sin IA (`v3/redes/efemerides/nota.mjs` y `publicar-nota.mjs`): hasta CUATRO hechos tratados por igual (la principal y «Y además» de la pieza y, si faltan, las mejores candidatas que `esUsable` deja pasar), de la más nueva a la más vieja; firma «Radar Balcarce», sección Cultura, `ficha.indexar = false` (no se indexa: son datos de Wikipedia armados por reglas), redes «sólo la web» (el carrusel no existe).
- Los tres datos de cada hecho se calculan (años desde entonces, década o siglo, tema); nunca se inventan.
- Foto: sólo la imagen de la página de Wikipedia del hecho si está en Wikimedia Commons con licencia libre (dominio público, CC0, CC BY, CC BY-SA); nunca bandera, mapa, logo, svg ni imagen chica; con el crédito del autor y «vía Wikimedia Commons» al pie, y el epígrafe dice de qué página es. Sin foto que sirva, la placa del medio. Es la excepción que Hernán autorizó SÓLO para las efemérides (la regla de fotos de las notas con fuentes sigue igual).
- Idempotente: si la nota del día ya existe no se toca (salvo `forzar`, que actualiza texto, fotos y ficha, nunca su fecha, su estado ni su dirección). Sin hechos publicables ese día, no sale nota y no es una falla.
- **El título de la nota nunca lleva un titular cortado (19/11/2026, caso «Microsoft… lanza el videojuego y otras 3 historias», que perdió «Halo 2»).** Cada hecho entra en el título entero o con su forma completa más corta (`titular.mjs`: primera oración, antes de «:» o de un guion; una coma sólo si lo que queda es una idea completa y lo que se saca es un agregado como «, tras…», nunca un inciso: «Microsoft, en asociación con Bungie, lanza…» no se corta en la coma). Un hecho sin forma completa que entre se saltea; si ninguno entra, el título lleva la fecha y el año: «Un día como hoy, 19 de noviembre: 2004 y otras 3 historias».
- **«Para ponerlo en contexto» sólo si el artículo es del hecho (19/11/2026).** El enlace de un hecho a veces es un artículo general («Microsoft Corporation» para un videojuego). `detalleDeWikipedia` sólo trae el texto cuando el título del artículo (el del enlace o al que redirige, sin paréntesis) aparece entero como palabras en el titular del hecho; ante la duda no hay bloque (sin IA no hay otra forma segura de saberlo).
- Pruebas: `v3/redes/efemerides/nota.test.mjs` y `disparar-acciones.test.mjs`.

## 17. El reel enlaza a su nota y la efeméride no pierde los enlaces (13/11)

- El reel/historia/posteo de «Un día como hoy» y el del clima de mañana llevan «La nota completa: <enlace con origen>» (Instagram: «link en la bio»): `notaDeLaPiezaEnLaWeb` (`piezas/publicar.mjs`). El enlace es `/nota/un-dia-como-hoy-efemeride-<día>` o `/nota/el-clima-clima-<día>` (el sitio redirige cualquier slug con el id correcto). La pieza lleva `dia` desde `piezas-plan.mjs`.
- Volver a correr la nota de una efeméride (`forzar`) **conserva `ficha.reels`** (los enlaces a los reels ya publicados): `sqlDeEfemeride` hace `json_set` sobre la ficha nueva con los reels de la vieja. Prueba en `efemerides/nota.test.mjs`.

## 18. Efemérides de diciembre a marzo: armadas y verificadas a mano (13/11, Hernán: «armar hasta marzo, los guiones, todo; sin audios hasta que salga»)

- Las 121 fechas del 1/12/2026 al 31/3/2027 tienen pieza en `web/data/efemerides-piezas.json` (guion con el formato de siempre, un principal y tres «y además»). El programa por reglas (`generar.mjs`) sólo dio 55 y la revisión las marcó casi todas (frases cortadas tipo «en 1901: Nace…», errores de fecha, temas fuera de criterio): **se sacaron y se rehicieron todas**, con cada hecho confirmado con la misma fecha en Wikipedia en español e inglés (o una fuente seria). `web/data/efemerides-candidatas.json` quedó con las candidatas del 12/11 al 31/3 (las usa la nota del día para completar hasta cuatro historias).
- Criterio: interés general (inventos, ciencia, deportes, cultura, música, cine, historia); sin política, religión, dictaduras, policiales ni tragedias; guion de 60 a 110 palabras, sin siglas raras ni paréntesis. Quedan 4 días con una nota en `verificar` (un dato con una sola fuente fuerte): mirarlos antes de salir. Sin audios: la voz se pone el día que sale la pieza (cupo de voz).
- Cuando haga falta el mes siguiente: `generar.mjs` sirve para las candidatas, pero sus piezas automáticas **no alcanzan** para salir solas; hay que revisarlas como en esta tanda (workflow `v3-efemerides.yml` sigue apagado: `EFEMERIDES_V3_ACTIVAS`).
- El título de la nota baja la primera letra sólo de un verbo o artículo (`PRIMERAS_PALABRAS_COMUNES`), nunca de un nombre propio («y amelia Earhart»).

## 19. La tarjeta de servicio: clima, farmacia y efeméride en Bluesky y Threads (13/11)

- El clima (mañana y noche), la farmacia de turno y «Un día como hoy» salían sólo como video vertical; Bluesky y Threads no los veían. Ahora, **después** de que sale el video de su fila, `correr.mjs` (`hacerTarjetas`) publica una **imagen fija** con la marca (la imagen de enlace 1080 × 565 de las notas, `armarEnlace`, sin foto, con el color de su sección: Balcarce o Cultura) más el texto y el enlace. Por eso, si el video se reintenta, la tarjeta no se repite; un fallo de la tarjeta nunca cambia el estado de la pieza (queda en `informe.tarjetas` y en `registro.json`).
- Qué se arma (`piezas/tarjeta-servicio.mjs`, puro, sólo datos que ya trae la pieza; sin el dato no hay tarjeta): «El clima de hoy/mañana en Balcarce: máxima de X°, mínima de Y° y Z% de lluvia» → `/clima`; «Farmacia de turno hoy en Balcarce: nombre, dirección» → `/farmacias`; «Un día como hoy, en AAAA: título» → la nota del día (`/nota/un-dia-como-hoy-efemeride-<día>`, el sitio redirige a la canónica). Los enlaces llevan `utm_campaign=servicio`. Bluesky: hasta 300 grafemas con `#Balcarce #RadarBalcarce` y el tema; Threads: hasta 500 con la imagen pública (subida como las láminas) y una sola etiqueta.
- **Redes:** primero Bluesky y Threads. X y el feed de Facebook e Instagram no (decisión de Hernán: después de ver cómo anda).
- **Interruptores:** vale `REDES_ACTIVAS` (en «no» sólo deja `tarjetas/<id>.jpg` y `.json` en la carpeta de salida y no llama a nadie); en real, una red sin sus secretos queda «sin-secretos» (no se simula); y la variable propia `TARJETAS_DE_SERVICIO` en «no» las apaga (por defecto, prendida). No gasta IA ni audios.
- **Todavía dormida en producción:** el paso «Armar las piezas que tocan» de `v3-piezas.yml` no tiene los secretos de Bluesky y Threads (sólo el paso «Publicar los enlaces»); hasta sumarlos ahí no publica nada. Hace falta, además, que la nota de la efeméride exista (si ese día no hay hechos publicables, el enlace daría 410).
- Pruebas: `piezas/tarjeta-servicio.test.mjs`.

## 20. R42: la pieza se marca antes de cualquier trabajo extra (13/11)

- **Qué pasó:** la tarjeta de servicio corría después de publicar y antes de contarle al Worker (`/piezas/resultado`). Se colgó (Node salió con «unsettled top-level await», exit 13), el Worker nunca supo que el clima había salido, la pieza venció a los 45 minutos y se republicó: salió 3 veces en Facebook, Instagram y TikTok.
- **La regla:** `correr.mjs` le cuenta al Worker cómo salió la pieza ANTES de hacer cualquier trabajo extra (hoy, las tarjetas). Todo lo posterior a publicar corre con `conTope` (60 s por pieza, `TOPE_DE_EXTRAS_MS`), con try/catch, y no puede cambiar el estado de la pieza ni romper el programa. Los fetch de ese tramo llevan `AbortSignal.timeout` (el cliente de R2, `infra/compartido/r2-s3.mjs`, 120 s; Bluesky y Threads ya tenían 20 s). Cada paso de la tarjeta (imagen, Bluesky, Threads) deja una línea en el log. El programa termina con `process.exit`.
- Pruebas: `piezas/correr.test.mjs` («R42 …»).

## 21. El repaso, siempre con 3 noticias (17/11/2026, Hernán)

- **La regla:** los tres repasos del día (mañana, tarde y noche) salen con **3 notas**. Antes salía con 2 o 3 y no salía con menos de 2.
- **Cómo se llega a 3** (`repasoConMotivo`, `piezas-plan.mjs`), en este orden y con la misma compuerta que los posteos (ley, tono R41, foto; nunca lo rojo; lo de afuera sin foto no):
  (a) lo de **Balcarce de las últimas 24 h** (hasta 2; las más nuevas; con foto primero, la de la placa sólo si no hay otra); (b) lo **nacional más contado** de 24 h, con el **mismo piso de medios con que el sitio publica**
  —4 entre semana, 3 sábado y domingo, 2 en las áreas chicas—, importado del núcleo (`mediosParaPublicar`, `MINIMOS_PUBLICADOS` en `v3/nucleo/elegir/elegir.mjs`; una prueba controla que coincidan con `wrangler.toml` del núcleo: no hay una copia del número);
  (c) lo de **Balcarce de las últimas 48 h** que no salió en un posteo ni en un repaso; (d) lo **nacional de 48 h** con más medios. **Balcarce va primero en el video**; lo que una persona mandó con `/repaso` va antes que todo.
- **Lo que se mantiene:** no repite una nota que ya salió como **posteo** de Facebook (hoy, ayer o anteayer) ni la de **otro repaso** (hoy, ayer o anteayer); una nota sale en un solo formato. El piso de medios de los **posteos** sigue siendo 5 (`REGLAS.mediosParaNacional`, `elegir.mjs` de las redes): sólo el repaso baja al del sitio.
- **Si aun así no hay 3:** con 2 notas el repaso sale corto (21 s) y **queda anotado**: `planear` devuelve `avisos: [{ pieza, motivo: 'repaso-corto (solo-2-notas)', notas: 2 }]`, el plan de la pieza lleva `datos.motivoCorto` y el resumen de las 22:05 dice «⚠ Repaso … salió con 2 notas» (`lineasDeLasPiezas`). Con menos de 2 **no sale** (`sin-notas`): no se inventa nada para llegar a 3.
- Variable nueva en `REGLAS_PIEZAS`: `edadDeRespaldoHoras: 48` (la ventana ampliada; las notas se piden a D1 desde 48 h atrás). Pruebas: `piezas-plan.test.mjs` («repaso de 3: …», seis casos más dos con la base: día normal, día flojo que completa con ayer, no repite posteos ni otros repasos —tampoco a 48 h—, piso de medios, tono y ley, motivo anotado).

## 22. El titular entero, siempre (17/11/2026, Hernán)

- **La regla:** en reels, tapas, placas, posteos y textos de X, Bluesky y Threads, el titular **nunca termina en «…» ni en «...»** ni queda cortado a mitad de palabra o de frase.
- **Cómo:** (1) si no entra, **se achica la letra** (de a 2 px, hasta el 80 % del escalón más chico: el mínimo legible) — `repartir`, `reels/placa.mjs`, que usan el repaso (placa de cada nota y lista de tapa), las notas, las historias y las láminas; (2) si aun así no entra, se usa **una forma completa más corta del título**:
  su primera oración, lo de antes de los dos puntos o de un guion, o hasta una coma (3 palabras o más, sin una palabra colgada al final como «en» o «de») — `variantesDeTitulo` y `tituloQueEntra`; (3) sólo si no hay ninguna, las palabras que entren, sin «…».
  `tituloEnPantalla` (`piezas/voz.mjs`) ya no corta a 90: deja pasar hasta 160 caracteres (`TITULAR_MAX_CARACTERES`) y la escena achica la letra; en las placas de la nota, de la propia y del repaso, lo mismo.
- **Un solo algoritmo, dos lugares:** `v3/redes/titular.mjs` (lo usan los armadores, X y Bluesky/Threads) y su copia en `reels/placa.mjs` (el render público sólo se lleva `reels/`; `infra/render-publico/` se rehizo con `node scripts/sincronizar-render-publico.mjs`). Una prueba controla que den lo mismo.
- **Lo que NO cambia:** el crédito de la foto, el nombre de un comercio y el lugar siguen con «…» si no entran (el crédito no puede perderse en silencio); la bajada de la placa del posteo ya era entera desde el 6/11 (`bajadaConcreta`); el resumen del guion en el texto del posteo de Facebook.
  Las placas de las efemérides (`efemerides/placas.mjs`) llevan frases propias y no titulares: quedan como estaban.
- Pruebas: `titulares-enteros.test.mjs` (cinco títulos largos de notas reales —126, 119, 104, 96 y 89 caracteres— y dos de estrés, por los armadores de repaso, nota, nota propia, historia, posteo, enlace, carrusel y semana, dibujados en varios momentos, y por los textos de X, Bluesky y Threads), `piezas.test.mjs`, `servicios-nuevos.test.mjs`.

**Estadísticas: el aviso por Telegram no tumba el trabajo (19/11/2026).** En `v3-estadisticas.yml`, el paso «Mandar por Telegram» reintenta el aviso 2 veces más (esperas de 20 y 40 s) y, si Telegram sigue sin contestar (502 «Telegram no contestó»), termina bien con un aviso amarillo (`::warning::`) en el log: las estadísticas ya se midieron en el paso anterior. Sólo vale después de subir el workflow (push).

## 23. Farmacias de turno: de 1 a 3 por día (17/11/2026, Hernán)

- La ficha tiene lugar para **3** (`FARMACIA.fichasMaximo`). Con **más de 3** en el cronograma, `armarFarmacia` **falla** con «el cronograma trae N farmacias de turno y son de 1 a 3 por día: revisar el cronograma del Colegio de Farmacéuticos antes de publicar»:
  antes cortaba en 3 en silencio y salían unas farmacias de turno y otras no, un dato falso para el público. La falla queda en el resumen de las 22:05 («Fallaron … intentos de piezas»); la página `/farmacias` del sitio muestra todas.
- Con 3 fichas la voz es más larga (34 palabras): la pieza sube de 14 s a lo que haga falta (hasta 20 s), así la ficha de 3 se dice sin apuro y entra entera (texto arriba de la zona de abajo). Prueba: `piezas.test.mjs` («farmacias: de 1 a 3 por día»).

## 24. El reel pedido desde el panel: redes y fotos elegidas, aviso por Telegram, y Participá en pausa (19/11/2026, Hernán)

- **Redes elegidas (`notas.redes.destinos`).** Cuando el panel pide un reel guarda en qué redes: `instagram`, `facebook`, `tiktok`, `youtube`, `twitter` (la X), `threads`, `bluesky`. Si la nota trae al menos una clave válida, **esa nota sale sólo en esas redes**: el reel y la historia (`accionesDe` filtra Instagram y Facebook; `redesDeBuffer` filtra TikTok, YouTube y X, y el tope diario de YouTube sigue mandando) y también el posteo y el enlace (`saleEn`: Facebook, Instagram, Threads, Bluesky y X). Sin destinos, todo sigue exactamente como antes. Las claves que no existen se ignoran. Instagram sigue siendo sólo video con voz: nunca se cambia el formato, sólo se saca o se deja la red. Threads y Bluesky no llevan reel (son enlaces con imagen): si el pedido es sólo Threads o Bluesky, no se arma reel para esa nota (`propiasConReel`).
- **Sin Meta, decide Buffer.** Si el pedido es sólo TikTok, YouTube o X, la pieza no tiene acciones de Facebook ni Instagram: queda «publicada» si Buffer publicó algo y en «error» si no (antes «Meta rechazó todo»).
- **Fotos elegidas (`notas.redes.fotos`).** Son lugares **desde 0** dentro de la lista `notas.foto` (tal cual las numera el panel; la primera es la portada). El reel usa esas fotos **en ese orden**, hasta 3 (`fotosDelReel`). Las que no sirven (fuera de la lista, sin dirección https pública, repetidas) se saltean; si no queda ninguna, o no se pidió ninguna, el reel usa las primeras 3 de la nota como siempre.
- **Aviso por Telegram de un reel pedido a mano** (`avisarReelPedido`, al contar el programa cómo salió la pieza): sólo para `reel-nota-<id>` de una nota con `redes.forzada` o con `destinos` (los reels automáticos no avisan), nunca en ensayo y una sola vez por pieza. «Salió el reel de «título»: enlace(s)» (los de Facebook e Instagram; si sólo salió por Buffer, dice en qué redes). «No salió el reel de «título»: motivo en palabras simples» cuando se abandona (el tercer error) o, si faltaron datos o cupo de voz, la primera vez (después se sigue reintentando sin repetir el aviso). Usa el mismo envío por Telegram del Worker (`decirPorTelegram`); si Telegram falla, el resultado de la pieza igual queda guardado.
- **Participá en pausa.** Las cuatro filas «Participá» de `piezas-del-dia.mjs` (`participa-noticias`, `-evento`, `-reclamos`, `-nota`: el reel que convoca a mandar material por WhatsApp o mail) tienen `pausada: true` desde hoy: el plan no las reserva ni les guarda lugar en el cupo de voz de las demás. Con `solo` se las puede ensayar. **Para prenderlas de nuevo: sacar `pausada: true` de esas cuatro filas** (el armador y las pruebas no se tocaron). Es independiente de `disparar-acciones.mjs` y de `wrangler.toml`.

## 25. El token de Threads se renueva solo (20/11/2026, Hernán: «que el token de Threads no venza más»)

- **El problema:** el token de larga duración de Threads vale 60 días y antes lo renovaba una persona. Threads permite renovarlo con una llamada mientras no haya vencido y tenga más de 24 horas
  (`GET https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=…`; contesta el token nuevo y `expires_in`, unos 60 días).
- **Dónde vive el token vigente:** en el Worker `radar-redes`, tabla `threads_token` de su base D1 (una fila), **cifrado con AES-GCM**: la clave sale de `TELEGRAM_TOKEN` (que ya está en el Worker), así un respaldo de
  la base nunca lleva el token en claro. Si algún día cambia `TELEGRAM_TOKEN`, el guardado queda ilegible: la vigilancia avisa y se vuelve a cargar subiendo «redes». Código: `threads-token.mjs`.
- **Quién lo renueva:** el campo `ademas` de `DISPAROS` (`disparar-acciones.mjs`), **sin cron nuevo**: la vuelta de las 12:07 UTC (9:07 de Balcarce) corre `renovarSiToca`. Renueva si pasaron 30 días desde la última
  vez, o si no se sabe cuándo vence (el primero cargado a mano: la primera renovación lo averigua). Un token de menos de 24 horas se saltea. Corre aunque falte `GITHUB_TOKEN_ACCIONES`.
  Si falla, el token anterior sigue guardado y se reintenta al otro día (hay 30 días de margen).
- **Quién lo usa:** los programas de GitHub Actions (`enlaces.mjs`, las tarjetas y los videos de `correr.mjs`) piden el token al Worker (`POST /threads/token`, con la misma contraseña de siempre, derivada de
  `TELEGRAM_TOKEN`). Si el Worker no contesta o no tiene token, usan el secreto `THREADS_TOKEN` de GitHub **(que hay que dejar cargado como respaldo)**. El token nunca se imprime ni se guarda en un registro
  (todo error pasa por `sinSecretos`); `/actividad` informa el estado (si hay, cuándo vence, fallos seguidos) sin el token.
- **El primero:** lo carga el workflow «Radar 3.0: desplegar» (opción redes, paso «Cargar el token de Threads en el Worker») desde el secreto `THREADS_TOKEN`, con `POST /threads/token/cargar`, **sólo si el Worker
  todavía no tiene uno que sirva** (no pisa el vigente: el del Worker es más nuevo). Nadie pega nada de nuevo.
- **Qué vigila la vigilancia** (`evaluarTokenDeThreads`): la renovación falló 2 veces seguidas; faltan menos de 10 días y no se renovó; el token guardado es ilegible; el Worker todavía no tiene token (aviso suave).
  Si el token ya venció o la renovación no puede, el único arreglo manual es generar uno nuevo en la consola de Meta, pegarlo en `THREADS_TOKEN` y subir «redes».
- Pruebas: `threads-token.test.mjs`, `v3/vigilancia/sitio-y-redes.test.mjs`.

## 26. Los videos también en Threads y Bluesky (20/11/2026, Hernán: «sumá todo lo que puedas»)

- **Qué:** cada pieza de video que va a TikTok, YouTube y X (reels, clima, farmacia, repasos, efeméride, número del día, notas propias) sale también en **Threads** y **Bluesky**, con el MISMO mp4 y el texto del
  posteo adaptado (`piezas/videos-sociales.mjs`). Las historias y los carruseles no (no van a Buffer). Una pieza pedida desde el panel con redes elegidas va sólo a las elegidas. Un pedido sólo para Threads o
  Bluesky sigue sin armar reel (`propiasConReel`).
- **Cuándo:** sólo si la pieza ya salió bien en Meta/Buffer (`estado = publicada`): si se reintenta, el video no se duplica. **Nunca frena ni marca como fallida la pieza**: cada red queda en `acciones` con su
  estado (`ok`, `error`, `omitida` —apagada, sin secretos o video fuera de los límites—, `simulada` en ensayo). Tope de 9 minutos por pieza para las dos juntas (`TOPE_DE_VIDEOS_SOCIALES_MS`).
- **El texto:** nombre de la pieza, lo que cuenta, enlace limpio (sin UTM: en 300 caracteres cada letra cuenta), crédito de las fotos, **«Voz generada con inteligencia artificial.» siempre** y hashtags sólo si entran
  (Threads: una sola etiqueta, #Balcarce; Bluesky: `#Balcarce #RadarBalcarce` y el tema). Si no entra todo se achica el cuerpo, después se sacan los hashtags y por último el crédito; nunca puntos suspensivos.
  Límites: Threads 500 (un emoji cuenta por sus bytes), Bluesky 300 grafemas; el enlace de Bluesky va como faceta.
- **Threads** (API oficial, `developers.facebook.com/docs/threads/posts`): contenedor `media_type=VIDEO` con `video_url` pública (la misma dirección de R2 `radar-render` que usa Buffer, `/video/<huella>/<nombre>.mp4` del
  Worker; el mp4 se sube UNA vez), espera `FINISHED` (hasta ~3 minutos; `ERROR` o falta de tiempo = no se publica) y `threads_publish`. Límites oficiales: hasta 300 s y 1 GB, MP4 o MOV, 23 a 60 cuadros por
  segundo, ancho hasta 1920, H.264 o HEVC con AAC; los reels (1080 × 1920, 30 cuadros, AAC 48 kHz, `+faststart`) entran. Mismo permiso (`threads_content_publish`) y mismo token que los enlaces.
- **Bluesky** (servicio de video, lexicones `app.bsky.video.*` y `app.bsky.embed.video` del repositorio oficial `atproto`): `com.atproto.server.getServiceAuth` (para el DID del PDS de la cuenta, método
  `com.atproto.repo.uploadBlob`, 30 minutos; si no lo acepta prueba con `did:web:bsky.social`) → `POST https://video.bsky.app/xrpc/app.bsky.video.uploadVideo?did=…&name=…` (`video/mp4`) →
  `app.bsky.video.getJobStatus` hasta `JOB_STATE_COMPLETED` (devuelve el blob; `JOB_STATE_FAILED` = no se publica) → posteo con `app.bsky.embed.video` (alt = lo que dice la voz, relación 9:16).
  Límites que se aplican: 100 MB y 180 s (prudentes: el esquema acepta hasta 300 MB, y el servicio limita la duración y a unos 25 videos por día; la cuenta tiene que tener el correo verificado).
- **Interruptores** (variables del paso «Armar las piezas que tocan» de `v3-piezas.yml`; sólo «si» prende, y en ensayo sólo las prendidas anotan «simulada»): `THREADS_VIDEOS` = si; `BLUESKY_VIDEOS` = **no**
  hasta ver una pieza salir en la cuenta real (la subida de video de Bluesky no se pudo probar contra la cuenta). Se prende cambiando esa línea y subiendo el workflow.
- Los secretos `THREADS_TOKEN`, `THREADS_USER_ID`, `BLUESKY_APP_PASSWORD` y la variable `BLUESKY_HANDLE` ahora también están en ese paso (antes sólo en «Publicar los enlaces»).
- Pruebas: `piezas/videos-sociales.test.mjs` (textos, clientes con fetch de mentira) y las del final de `piezas/correr.test.mjs`.
