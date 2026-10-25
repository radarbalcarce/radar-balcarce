# Audio en la página y podcast general

*17/10/2026 (al final del día: el prototipo del reproductor, `web/lib/audio-de-nota.js` y `web/components/reproductor-de-audio.js`,
y el generador del feed, `web/scripts/podcast-feed.mjs`, se borraron en la limpieza final porque nada los usaba; si se retoma este
plan se recuperan del historial de git, del commit anterior a «Limpieza final (2)»). Respuesta a la pregunta de Hernán: "los podcasts se pueden escuchar desde la página misma, cuando hacemos el resumen de las
cuatro noticias... No sé si vale la pena, o mejor cuando tengamos un podcast más generalista (10 minutos), que después a su vez
separemos en reels". Es un **informe y un plan**: no se publicó nada, no se tocó ninguna página y no se creó ningún depósito. Lo único
nuevo en el código es un prototipo **apagado y sin conectar** (§ 7). Lo que sale de internet y no es de la documentación oficial está
marcado **(sin confirmar)**.*

## 0. Resumen para Hernán y Andrés

**Las dos ideas no compiten: comparten el 80 % del trabajo.** Para escuchar un audio en la web, y para que Spotify o Apple lo levanten, y
para armar el podcast largo, hace falta lo mismo: **guardar el audio de cada episodio en un lugar público propio** (hoy se tira, o queda en
un depósito privado) y **que la nota sepa dónde está**. Eso es lo que hay que construir primero. Con eso hecho, el reproductor en la nota
cuesta casi nada.

**Recomendación en cuatro pasos:**

1. **Sí al reproductor, pero como segundo paso de la infraestructura, no como proyecto propio.** Hoy, por sí solo, no mueve nada: entre
   el 29/9 y el 15/10 las notas de repaso tuvieron **39 visitas de las 1.071 que tuvieron todas las notas** (unas 3 por día; el sitio
   tiene unas 50 visitas diarias) y los reels de repaso en Instagram, 7 vistas cada uno. Escucharlo en la web lo escucharían muy pocos. Pero
   cuesta lo mismo que el podcast para Spotify, y el costo de plata es **cero** (§ 2).
2. **Primero el piloto del podcast largo, a mano, sin programar.** Dos o tres semanas de un episodio por semana de unos 8 a 10 minutos
   (con NotebookLM o leído con las voces propias), para ver si a alguien le interesa **antes** de construir una máquina. Sin gasto.
3. **Si el piloto funciona, automatizar el podcast general** con el guion escrito por la IA a partir de las notas ya verificadas, las
   dos voces propias y los reels cortados **por tema** (no cortando el audio a ciegas). Cuesta **USD 0,135 por episodio de 10 minutos**
   (unos **USD 4 por mes** si sale todos los días, USD 8 desde el 1/1/2027). Es la parte más trabajosa (§ 5).
4. **Lo que no recomiendo:** un podcast de Spotify hecho con los tres repasos de un minuto tal cual. Episodios de 55 segundos tres veces por
   día son raros para ese formato; ya lo decía `IDEAS.md` (RS-2).

**Lo que hace falta de ustedes** (una vez, unos 30 minutos): crear un depósito público de Cloudflare y conectarle `audio.radarbalcarce.com`
(un par de clics, ya tienen la cuenta y el token), y diseñar una portada cuadrada del podcast (§ 3, etapa 0).

## 1. Qué hay hoy (con evidencia)

- **El audio de cada repaso existe y se tira.** `reels/voz-gemini.mjs` devuelve un mp3 de 24 kHz, mono, 128 kbps, en `reels/salida/`. Se usa
  para armar el video y después queda sólo en la máquina de GitHub Actions (artefacto de 3 o 7 días). Es la voz **cruda**, sin el volumen
  parejo (`VOLUMEN_PAREJO` se aplica sólo al armar el video, `reels/reel.mjs`).
- **Existe un archivo privado de piezas** (`redes/archivar-piezas.mjs`, `docs/redes/ARCHIVO-DE-PIEZAS.md`): copia el mp3 crudo a `piezas/AAAA/MM/DD/audio/`
  en el depósito R2 `R2_PIEZAS`. Está **apagado** hasta que alguien cree esa variable, y el documento dice que **tiene que seguir privado**.
  Sirve de respaldo, **no** para publicar: tiene también los videos y piezas que esperan a una persona. El audio público tiene que ir en
  **otro depósito**.
- **La nota de cada repaso ya existe** (`web/lib/notas-propias.js`, id `repaso<AAAAMMDD><manana|tarde|noche>`, página `/nota/<id>`): lista los
  titulares con sus enlaces y, por nota, un par de oraciones. Es el "texto de apoyo" del episodio. Sólo se arma si hay al menos 2 notas con
  página y ninguna es de Política, Policiales o semáforo rojo; si el repaso se retira, la nota se cae. Hoy esa página sólo tiene enlaces a
  Instagram y Facebook.
- **El generador del feed de podcast ya está hecho y probado, sin conectar** (`web/scripts/podcast-feed.mjs`, 9 pruebas; el diseño, en
  `docs/seo/AUDITORIA-FEEDS.md` § 4). Espera un manifiesto de audios (`url`, `bytes`, `segundos`) que todavía no existe.
- **La Content-Security-Policy del sitio es sólo `frame-ancestors 'self'`** (`web/public/_headers`): no limita de dónde se cargan medios, así
  que un `<audio>` de otro host **no necesita ningún cambio hoy**. Si algún día se pone una CSP completa, habrá que agregar
  `media-src https://audio.radarbalcarce.com`. (La CSP estricta es sólo la del panel del celular, que no tiene audio.)
- **La página de la nota no tiene reproductor** (`web/app/nota/[id]/page.js`). Muestra título, bajada, foto, cuerpo, `destacados` (los botones
  a Instagram y Facebook) y las fuentes.

## 2. ¿Vale la pena el reproductor en la nota de cada repaso?

### Quién lo usaría (números del 29/9 al 15/10, `web/data/estadisticas.json` y `estadisticas-piezas.json`)

| Medida | Valor |
|---|---|
| Días con datos | 13 |
| Visitas al sitio | 646 (**~50 por día**) |
| Vistas de notas (todas) | 1.071 |
| Vistas de notas de repaso | **39** (3,6 %; ~3 por día) |
| Reels de repaso en Instagram | 40 reels, **275 vistas** en total (~7 cada uno) |

La audiencia es chica. Un reproductor en esa página lo van a usar, hoy, una o dos personas por día. **No justifica un proyecto propio.** Sí
justifica la parte que es gratis de sumar una vez que el audio está guardado, y sobre todo sirve de ensayo para el audio público.

### Cómo se hace (la versión que recomiendo)

1. **Conservar un mp3 pensado para escuchar** (no el crudo): mono, 44,1 kHz, **64 kbps**, con el mismo filtro de volumen parejo
   (`VOLUMEN_PAREJO`, -16 LUFS) y etiquetas ID3 (título, autor, álbum). Se arma con el ffmpeg que ya está (`ffmpeg-static`) en `reels/`
   (en `redes/` no se puede importar nada de afuera de Node, regla de `CLAUDE.md`).
2. **Subirlo a un depósito R2 público, aparte**, p. ej. `radar-audio`, con el dominio propio `audio.radarbalcarce.com`
   (ruta `repasos/AAAA-MM-DD-manana.mp3`; nombre estable, el contenido no cambia, cabecera `Cache-Control: public, max-age=31536000, immutable`).
3. **Anotar dónde quedó** (`url`, `bytes`, `segundos`) **en el libro de publicaciones** (`web/data/redes.json`, sección nueva `audios`), que
   ya guarda `redes.yml` en cada corrida. Así **no hace falta un archivo nuevo en `web/data/`** (que habría que agregar a la línea
   `git add` de `actualizar.yml` o se perdería). `podcastsDelLibro` lo pasa a la nota del repaso como `nota.audio`.
4. **El reproductor**: `<audio controls preload="none">` del navegador, sin JavaScript propio (§ 7).

### Peso (medido con ffmpeg sobre un mp3 real de la voz, 14,5 s, 24 kHz, 128 kbps = 233 KB)

Un repaso dura unos **53 segundos de voz** (presupuesto de 55 con el adorno del video; `CRITERIO-REDES.md` § 5).

| Formato | Por segundo | Un repaso (53 s) | Los tres de un día (~160 s) | Un año |
|---|---|---|---|---|
| mp3 128 kbps (como sale hoy) | 16 KB | ~850 KB | ~2,6 MB | ~0,95 GB |
| **mp3 64 kbps mono (recomendado)** | 8 KB | **~425 KB** | **~1,3 MB** | **~0,5 GB** |
| mp3 48 kbps | 6 KB | ~320 KB | ~1,0 MB | ~0,35 GB |
| Opus 24 kbps (`.ogg`/`.webm`) | 3 KB | ~150 KB | ~0,45 MB | ~0,16 GB |

**El cálculo de "100 a 150 KB por repaso" sólo se cumple con Opus**, que el feed de podcast no admite (Apple y Spotify piden mp3 o m4a) y que
no todos los navegadores viejos reproducen. Con mp3 a 64 kbps son **~425 KB**, y sólo se bajan **si la persona aprieta "reproducir"**
(`preload="none"`): la página no engorda ni un byte para el resto.

### Costos

- **R2:** 10 GB gratis por mes de almacenamiento; la bajada de archivos no se cobra (`docs/redes/ARCHIVO-DE-PIEZAS.md` § Cuánto cuesta, leído de la
  página oficial de precios el 15/10). Con ~0,5 GB por año, **gratis por muchos años**. Operaciones: unas decenas por día, 0,2 % de lo gratis.
- **Plata en total: 0.** Sin código nuevo de pago, ningún servicio nuevo. (Sí hace falta que la cuenta de Cloudflare tenga R2 activado, que ya
  es requisito del archivo de piezas y del archivo de notas.)

### Cosas a cuidar

1. **El audio no va en Cloudflare Pages.** Pages ya tiene ~15.900 de los 20.000 archivos que admite (`CLAUDE.md`); tres audios por día lo agotarían,
   y cada uno engordaría cada armado. Por eso el depósito aparte. Tampoco GitHub (el repositorio es público y crecería ~0,5 a 1 GB por año).
2. **Dominio propio, no `*.r2.dev`**: `r2.dev` tiene límite de pedidos y no es para producción (`docs/seo/AUDITORIA-FEEDS.md`).
3. **`Range` y `HEAD`:** R2 con dominio propio los contesta (206 + `Content-Range`), que es lo que piden Apple y los navegadores para avanzar y retroceder.
   Si en vez de dominio directo se sirviera por un Worker, el Worker tendría que implementar `Range` a mano. **Recomiendo el dominio directo.**
   Probar con `curl -I -H "Range: bytes=0-99" <url>` (debe dar `206`).
4. **Lo retirado se borra del depósito.** Si una nota de repaso se retira (`retiradas.json`, panel del celular), su nota se cae pero el mp3 sigue
   ahí, y quien tenga la dirección lo puede escuchar. Hace falta un paso que borre el objeto (como el archivo de piezas, que ya tiene el
   mismo problema documentado). Reglas que no cambian: **sólo se publica el audio de repasos que tienen su nota** (nada de Política, Policiales
   ni rojo) y **nunca el crudo del archivo privado**.
5. **Cupo de voz:** guardar el audio **no gasta ningún audio más** (se codifica el mismo que ya se pidió). Los 10 pedidos por día no se tocan.
6. **CSP:** hoy no hay que hacer nada (§ 1). Dejarlo anotado.
7. **No cambiar el volumen del video**: el mp3 público se normaliza aparte; el del reel no se toca.

### Accesibilidad y transcripción

- El `<audio controls>` nativo se maneja con teclado y lector de pantalla. Tiene que decir **antes** cuánto dura y que la voz es generada
  con IA (el prototipo lo hace: "Escuchá el repaso: 53 segundos. Voz generada con inteligencia artificial.").
- **Transcripción:** la nota de repaso ya es un texto con los titulares y las oraciones de cada nota, pero **no es literalmente lo que dice la voz**
  (el guion de `redes/guiones.mjs` tiene saludo, conectores y cierre). Para que cumpla de verdad como transcripción (criterio de accesibilidad
  para audio solo), alcanza con **guardar el guion junto al audio** (`guion` en la misma fila del libro) y mostrarlo en un desplegable cerrado
  "Texto del audio". Es la regla "el lector ve la nota": el desplegable va al pie, cerrado, como "Fuentes (N)". Costo: S.
- Una aclaración honesta: para el lector común, la nota **ya es** la versión en texto; el audio es una comodidad, no la única forma de enterarse.

### Esfuerzo y riesgos

| Parte | Esfuerzo | Riesgo |
|---|---|---|
| Codificar el mp3 público (64 kbps, volumen parejo, ID3) y duración | S | Bajo (ffmpeg ya está) |
| Subirlo al depósito público y anotarlo en el libro | M | Medio: toca el flujo de publicación; va **antes** de guardar el libro, con `continue-on-error`, para no frenar nunca a Instagram ni Facebook |
| Borrar el audio cuando se retira un repaso | S | Medio si se olvida (queda público) |
| Pasar `audio` a la nota (`podcastsDelLibro` / `notaDeRepaso`) y mostrar el reproductor | S | Bajo, con el interruptor |
| Guion como transcripción en desplegable | S | Bajo |
| **Total** | **M** (1 a 2 días de Claude más 30 min de ustedes) | Controlable |

## 3. El feed de podcast y plan por etapas del audio

**Etapa 0, ustedes (una vez, ~30 min):** crear en Cloudflare el depósito público `radar-audio`, conectarle el dominio `audio.radarbalcarce.com`
(R2 → depósito → Settings → Custom Domains; el dominio ya está en Cloudflare), crear la variable de GitHub `R2_AUDIO`, confirmar que
`contacto@radarbalcarce.com` **recibe** correo (Apple y Spotify mandan un código ahí), y diseñar la **portada** cuadrada 3000 × 3000 en JPG de menos de
500 KB. Verificar los requisitos de cada plataforma el día del trámite: cambian.

**Etapa 1, Claude (M):** codificar, subir, anotar en el libro, borrar al retirar (§ 2). Sin nada visible. Se prueba con "Piezas" a mano.

**Etapa 2, Claude (S):** pasar `audio` a la nota y **prender el reproductor** (interruptor `AUDIO_EN_LA_PAGINA`). Es un cambio visible: se
consulta antes, como todo lo del sitio.

**Etapa 3, Claude (S) + ustedes (trámites):** conectar `web/scripts/podcast-feed.mjs` (la ruta `/podcast.xml`, el tipo `application/rss+xml` en
`_headers`, el `<link rel="alternate">`) y enviarlo a Apple Podcasts, Spotify, YouTube Music y Pocket Casts (`docs/seo/AUDITORIA-FEEDS.md` § 4,
con la lista de trámites y los validadores). Decidir **antes** si el podcast son los tres repasos o **uno por día que los junte** (opción B de
ese documento, ~3 minutos, se arma con ffmpeg; mejor para quien escucha en el auto). Mi recomendación: **no enviar los repasos sueltos**;
esperar al formato largo o a la opción B.

## 4. ¿Y el podcast general de 10 minutos?

**Sí tiene sentido como producto** (es lo que hace un medio local con audio y lo que se escucha en Spotify), pero es mucho más caro de
hacer bien que el reproductor y **hoy no hay prueba de que alguien lo quiera**. Por eso: piloto a mano primero.

### Piloto a mano (sin código, 2 a 3 semanas, costo cero)

- **NotebookLM (Google)** a partir de las 8 a 10 notas propias más fuertes de la semana. Lo que dicen fuentes de terceros **(sin confirmar,
  no se pudo leer la página oficial)**: la cuenta gratis permite unos 3 resúmenes de audio por día, el Plus (con Google AI Pro, ~USD 20 por mes)
  20, y en julio de 2026 el producto habría pasado a llamarse "Gemini Notebook"; **no hay API ni se pueden elegir voces propias**. Tampoco pude
  confirmar si el idioma español neutro o rioplatense está disponible ni qué dicen los términos sobre usar el audio generado en un producto
  comercial. **Antes de publicar nada: leer los términos de Google y escuchar el episodio entero.**
- **No cumple dos reglas del proyecto sin trabajo humano:** "lo que escribe la IA se verifica contra la fuente" (nadie verifica lo que dice
  NotebookLM) y "dos voces propias" (las de NotebookLM son de Google y suenan a otro medio). Sirve para **probar el formato y la reacción**, no
  para producción.
- **Alternativa sin NotebookLM:** que Claude escriba el guion (ver § 5) y leerlo con las voces propias a mano en "Piezas"/"Probar voces". Gasta
  unos USD 0,14 por episodio y sí respeta las reglas.
- **Qué medir** para decidir (en `estadisticas-piezas.json` y las del feed): reproducciones y porcentaje que llega al final, si lo comparten, si
  trae gente a la web. Poner la vara antes (por ejemplo: 30 escuchas por episodio en tres semanas).

## 5. Diseño del podcast general automático (si el piloto da señal)

### Formato

Un episodio por día, **8 a 10 minutos**, con dos voces propias (la locutora y el locutor, `CRITERIO-REDES.md` § 6) que conversan sobre 6 a 8
temas del día, de Balcarce primero. Estructura fija: saludo de la hora, titulares en 20 segundos, los temas (45 a 75 segundos cada uno), cierre y
la dirección dicha ("Radar Balcarce punto com"). Los mismos tres turnos del día pueden servir de guía (mañana más corto, noche más largo).

### Quién escribe el guion

La IA, **a partir de las notas ya publicadas y verificadas** (no de las fuentes crudas), con las mismas reglas de `CRITERIO-REDES.md` § 4: no nombrar
la fuente, nada en vivo, sin exclamaciones ni opinión, jamás menores ni víctimas. Entrada: título, bajada y cuerpo de cada nota (unas 400
palabras por nota × 8 = ~3.200 palabras de entrada); salida: ~1.500 palabras (a 2,4 a 2,5 palabras por segundo son ~10 minutos). Un modelo de texto
(`gemini-flash-lite-latest`) con la clave de clasificación o de redacción: **el costo del texto es despreciable**.

Cada oración del guion lleva la nota de la que sale (`notaId`); después pasa por el **verificador** (`ingesta/verificar.mjs`), usando esas notas
como fuente (confirmar la forma de llamarlo al implementar: hoy verifica notas, no guiones). Lo que no se pueda ubicar en una nota, se saca.
**Política y Policiales quedan afuera** como en los repasos, y un episodio **espera la aprobación de una persona** desde el panel del celular
las primeras semanas (diez minutos de voz generada son mucha superficie para un error).

### La voz: cómo y cuánto cuesta

- El modelo actual (`gemini-3.8-flash-tts`, por la Interactions API, `reels/voz-gemini.mjs`) se usa hoy **con una sola voz por pedido**
  (`speech_config: [{ voice }]`). Fuentes de terceros **(sin confirmar)** dicen que el 3.8 admite un diálogo nativo de **dos hablantes** en un
  mismo pedido; **no está probado con nuestras voces guardadas** (`voice_…`) ni con la forma de configuración de la Interactions API. **Primer paso técnico: una
  prueba de media hora** (S) para ver si acepta dos voces propias en un pedido. Si no, la alternativa es pedir un audio por turno y pegarlos con
  ffmpeg (más pedidos, mismo costo en tokens, pero se pierde parte de la naturalidad de la charla).
- **Precio** (memoria del proyecto): USD 9 por millón de tokens de audio; 25 tokens por segundo: **USD 0,0135 por minuto hasta el 31/12/2026, el
  doble desde el 1/1/2027.**

| Episodio | Tokens de audio | Costo (hasta 31/12/2026) | Costo (desde 1/1/2027) |
|---|---|---|---|
| 1 minuto (un reel) | 1.500 | USD 0,0135 | USD 0,027 |
| 10 minutos | 15.000 | **USD 0,135** | USD 0,27 |
| 10 minutos todos los días (30 días) | 450.000 | **~USD 4,05 por mes** | ~USD 8,10 por mes |
| Con 1 reintento cada 3 episodios (`vozDeMas`, `reels/voz-gemini.mjs`) | — | ~USD 5,4 por mes | ~USD 10,8 por mes |

Hoy un día normal de piezas usa ≈ 3,5 minutos de voz (USD 1,4 por mes, memoria del proyecto). Un episodio diario de 10 minutos **triplicaría**
el gasto de voz (de ~1,4 a ~5,5 por mes): entra en el presupuesto de USD 10 por mes, ajustado desde 2027. **Una edición de fin de semana
(un episodio por semana, ~USD 0,6 por mes) es lo prudente para empezar.**

- **Cupo:** la clave de voz hoy es **gratis, con 10 pedidos por día** (`CLAUDE.md`), y un día normal gasta 7 a 9. Un episodio de 10 minutos
  son **como mínimo 2 a 4 pedidos** (el 3.8 parece cortar el audio de un pedido cerca de los 5 minutos y 27 segundos, límite no documentado, fuente
  de terceros **sin confirmar**), y 8 a 10 si se hace un pedido por tema para cortar reels limpios. **No entra en el cupo gratis: exige la clave paga**
  (`GEMINI_API_KEY_REDES` con crédito, `PENDIENTES.md`).
- **Un pedido largo es frágil:** `vozDeMas` ya descarta un audio que dura de más (la voz leyó algo que no estaba en el texto) y `ESPERA_MAXIMA_VOZ` es de
  120 segundos por pedido. Por eso conviene **trabajar por tema**, no un solo pedido de diez minutos: si falla uno, se repite ese solo.

### Cómo se parte en reels (ffmpeg y subtítulos que ya existen)

**No cortar el audio largo a ciegas:** se corta por tema, que es como ya se arma. Cada tema del guion es un **bloque de 45 a 70 segundos** con su
propio pedido de voz; el episodio largo es esos bloques pegados con ffmpeg (más una música/cortina corta si se decide), y cada reel es el bloque
con su placa:

1. Cada bloque tiene su texto, su audio y sus tiempos de palabra (`reels/alinear.mjs` los saca de los silencios del audio; sirven los subtítulos
   `.ass` de `reels/reel.mjs` sin cambios).
2. `reels/reel.mjs` hoy arma el video con **una voz** (`vozGemini`). Para un bloque de charla hay que extenderlo: los tiempos de dos voces y un color
   de subtítulo por hablante. **Es la parte más grande (L).**
3. Los reels siguen las reglas de siempre: 58 segundos como máximo (historia), el aviso «Voz generada con inteligencia artificial.», Política y
   Policiales a mano, y el enlace sólo en Facebook (nunca en Instagram, `redes/piezas.mjs`).
4. Resultado: un episodio de 10 minutos **y** 6 a 8 reels, con un solo gasto de voz.

### NotebookLM como alternativa manual

Sirve para el piloto (§ 4) y como "plan B" cuando se quiera un episodio especial sin esperar al sistema propio. **No** como producción diaria:
sin API no se automatiza, no usa nuestras voces, no se verifica contra las notas y los términos de uso de lo generado están **sin confirmar**.

### Esfuerzo y riesgos

| Parte | Esfuerzo |
|---|---|
| Prueba de dos voces propias en un pedido | S |
| Guion de charla desde las notas + verificación contra ellas | M |
| Voz por bloque, pegado con ffmpeg y exportación mp3 | M |
| Reel de charla (dos voces, subtítulos por hablante) | L |
| Aprobación en el panel del celular, vigilancia del cupo y del costo | M |
| **Total** | **L** (varios días de Claude, repartidos en etapas) |

Riesgos principales: un error de la IA dicho en voz alta durante 10 minutos (mitigado con verificación y aprobación humana); el cupo de voz si
no se paga la clave; el modelo de voz en versión previa (cambia sin aviso: vencen las voces propias el **29/09/2027** y el precio se duplica el
1/1/2027); y, sobre todo, **construir algo que nadie escuche**. De ahí el piloto.

## 6. Plan por etapas (resumen)

| # | Qué | Quién | Esfuerzo | Costo | Visible |
|---|---|---|---|---|---|
| 0 | Depósito público + dominio de audio + portada + confirmar correo de contacto | Hernán/Andrés | ~30 min | 0 | No |
| 1 | Conservar el mp3 público de cada repaso (64 kbps, volumen parejo), subirlo y anotarlo en el libro; borrarlo al retirar | Claude | M | 0 | No |
| 2 | Prender el reproductor en la nota del repaso (prototipo ya hecho, § 7) con el texto del audio en desplegable | Claude | S | 0 | **Sí: se consulta** |
| 3 | Piloto del podcast largo a mano (3 semanas) y medir | Hernán/Andrés | — | 0 a USD 0,14 por episodio | Fuera del sitio |
| 4 | Feed `/podcast.xml` y trámites (Apple, Spotify, YouTube Music, Pocket Casts), con la decisión de qué episodio enviar | Claude + Hernán/Andrés | S | 0 | Sí |
| 5 | Si el piloto funcionó: prueba de dos voces, guion verificado, voz por tema, episodio y reels | Claude | L | ~USD 0,6 por mes (semanal) a USD 5,4 (diario) | Sí |

Las etapas 1 y 2 se pueden hacer ya sin esperar al piloto: son baratas y el audio guardado sirve para todo lo demás. Las 4 y 5 **esperan al piloto**.

## 7. El prototipo (sin conectar, apagado)

- `web/lib/audio-de-nota.js`: `audioDeNota(nota)` decide si hay audio para mostrar y devuelve la dirección, el tipo, la duración y el peso. Acepta
  **sólo** `https://audio.radarbalcarce.com/….mp3|m4a` (nada de `r2.dev`, de Pages, de otro host, con usuario, puerto o parámetros), con `bytes` y
  `segundos` reales. **`AUDIO_EN_LA_PAGINA = false`**: apagado, devuelve siempre `null`, aunque la nota traiga audio.
- `web/components/reproductor-de-audio.js`: componente de servidor, sin JavaScript propio: `<audio controls preload="none">` con enlace de
  respaldo y el aviso de voz generada con IA.
- `pruebas/audio-en-la-pagina.test.mjs` (7 pruebas): apagado por defecto, direcciones válidas e inválidas, duración y peso, el componente no
  baja nada antes de tocar "reproducir", y **ninguna página lo importa todavía** (para conectarlo, esa prueba se cambia a propósito).
- **Para prenderlo** (etapa 2): `podcastsDelLibro`/`notaDeRepaso` agregan `audio` a la nota; `web/app/nota/[id]/page.js` pone
  `<ReproductorDeAudio nota={n} />` después de la bajada; `AUDIO_EN_LA_PAGINA = true`; se actualiza la prueba. Nada de esto se hizo.

## 8. Qué no pude comprobar

- No pude leer la documentación oficial de Gemini TTS ni de NotebookLM: lo del diálogo de dos hablantes, el corte cerca de los 5 minutos y
  los límites diarios de NotebookLM son de sitios de terceros ([foro de Google AI](https://discuss.ai.google.dev/t/gemini-tts-ignores-per-speaker-voice-settings-in-multi-character-prompts/84125),
  [nota sobre Gemini 3.8 TTS](https://mer.vin/news/gemini-3-8-tts-2000-voices-and-native-two-speaker-dialogue/),
  [límites de NotebookLM](https://fast.io/resources/notebooklm-audio-overview-limit/)). Hay que probarlos con nuestras voces.
- No escuché el audio codificado a 64 kbps; el peso sí está medido (ffmpeg, §2). A 64 kbps mono el habla suele entenderse bien, pero conviene
  escuchar un repaso antes de decidir.
- No se activó R2 ni se probó `Range` contra un dominio real: todo el diseño de alojamiento es de la documentación y del archivo de piezas.
- Las cifras de audiencia son de 13 días con datos y de un sitio nuevo; la conclusión sobre el reproductor puede cambiar si crece el tráfico.
