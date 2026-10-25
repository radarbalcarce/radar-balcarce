# Auditoría de los feeds de Radar Balcarce

*15/10/2026. Pregunta de Hernán y Andrés: "¿tenemos bien armado nuestro feed de texto y de audio?".*

## La respuesta corta

- **Feed de texto (RSS): sí, está bien armado, con detalles.** Es un RSS 2.0 válido, con el texto completo de cada nota, la foto con su
  crédito, fechas correctas, direcciones fijas, un feed por sección y aviso automático en el `<head>`. Esta auditoría encontró
  detalles (no decía quién escribió cada nota, no tenía `enclosure` ni `ttl`, el tipo de archivo era genérico, un carácter raro podía
  romperlo entero) y **los arregló en el código** (todavía sin publicar: hace falta que corra "Actualizar la web").
- **Feed de audio (podcast): no existe.** Ni el archivo, ni dónde alojar los audios, ni la portada. Hoy el audio de cada repaso se
  **descarta** al terminar la corrida. Lo que sí hay: la voz, las tres piezas por día, y la nota de cada repaso en la web (que es
  justo el texto que necesita cada episodio). Esta auditoría dejó el **generador** del feed de podcast hecho y probado, **sin conectar a
  nada**, y el diseño de lo que falta.
- **JSON Feed y Atom: no hay, y no hacen falta.** Todos los lectores y los directorios hablan RSS.

## 1. Lo que se publica hoy (con evidencias)

Medido con `curl` contra `https://radarbalcarce.com` el 15/10/2026 a las 20:19 (hora de Balcarce).

| Feed | Dirección | Ítems | Peso | Resultado |
|---|---|---|---|---|
| General | `/feed.xml` | 45 (las de las últimas 36 horas) | 92.952 bytes (21.683 con gzip) | 200 |
| Por sección | `/seccion/<ranura>/feed.xml` | hasta 30 (Balcarce: 24) | de 18 KB (Policiales) a 64 KB (Economía) | 200 en las 10 secciones con notas (`ranura`: `balcarce`, `politica`, `policiales`, `futbol`, `deportes`, `automovilismo`, `agro`, `economia`, `cultura`, `tecnologia`, `argentina`) |
| Por tema | no hay | — | — | `/tema/<t>` es una página, no un feed |
| Podcast | `/podcast.xml`, `/podcast`, `/rss.xml`, `/atom.xml`, `/feed`, `/feed.json` | — | — | **404** todas |

Lo que está bien (verificado):

- **XML bien formado**: el general y el de Balcarce se leyeron con un analizador XML estricto (Python `ElementTree`) sin errores.
- **RSS 2.0**: `<channel>` con `title`, `link`, `description`, `language` = `es-AR`, `lastBuildDate` (RFC 822, en GMT), `atom:link rel="self"`
  apuntando a sí mismo, `generator`. Espacios de nombres `content`, `dc` y `atom` declarados.
- **Ítems**: `title`, `link`, `guid isPermaLink="true"` igual a la dirección de la nota (que es fija desde que sale: `CLAUDE.md`, "una sola
  dirección"), `pubDate` en RFC 822, `dc:creator`, `category` (la sección), `description` (la bajada) y `content:encoded` con el texto completo en CDATA.
  Sin direcciones repetidas (0 de 45) y ordenados del más nuevo al más viejo.
- **Texto completo y foto**: las 45 tienen más de dos párrafos; 36 llevan foto (`<img>` con `<figcaption>` con el crédito: la
  regla de las fotos de `CLAUDE.md`); las 36 son `.jpg`. Una foto de ejemplo (`/fotos-notas/n6v2wu.jpg`) contesta `image/jpeg`, 41.226 bytes, `Accept-Ranges: bytes`, `Cache-Control: public, max-age=604800`.
- **Autodescubrimiento**: la portada trae `<link rel="alternate" type="application/rss+xml" title="Radar Balcarce" href="/feed.xml">`
  (`web/app/layout.js`, líneas 36 y 91). Cada página de sección trae además el de su feed (`web/app/seccion/[ranura]/page.js`).
  También lo anuncia `/llms.txt`.
- **Cabeceras**: `200`, `ETag`, `Cache-Control: public, max-age=0, must-revalidate` (siempre se revalida; con el `ETag` la respuesta
  es un **304** — probado), `Content-Encoding: gzip`, `Access-Control-Allow-Origin: *`, HSTS, `nosniff`.
- **Qué entra y qué no**: el feed no tiene ningún filtro propio. Lee `web/data/portada.json` (la general) y `notasDeLaSeccion` (las secciones,
  con las mismas condiciones que las páginas: cuerpo de 70 palabras o más, respaldo, fecha real). Por eso **lo que no sale en la web
  tampoco sale en el feed**: lo retirado a mano (`retiradas.json`), lo que decidió sacar una persona desde el celular, las
  repetidas unidas a otra, lo que está en espera de una persona (Política y Policiales *en las redes*; en la web se publican y están en el
  feed: hay 5 de Política en el general), lo "sin cuerpo", y lo de verificación BAJA (la frena `reels/reescritura.mjs`:
  `FRENO_POR_VERIFICACION`, queda amarillo hasta que una persona lo apruebe). Lo rojo (menores y víctimas) no llega a `portada.json`.
  Las listas de sepelios y la cotización del dólar siguen las mismas reglas que la web. **El feed no agrega ningún dato nuevo**: título,
  bajada, cuerpo, foto y crédito son los de la página.

## 2. Problemas encontrados, por gravedad

### Media

1. **El ítem no decía quién escribió la nota.** `CLAUDE.md`: "cada nota dice quién la escribió". La página lo dice (la firma corta del
   pie: "Redacción con IA, verificada contra las fuentes", "Texto de <medio>"…), pero el feed firmaba todo con `dc:creator` = "Radar
   Balcarce" y no traía la firma. Un lector que sólo ve el feed (o un agregador que lo republica) no sabía que la redactó una IA ni
   cuando el texto era el de otro medio. **Arreglado** (ver § 3).
2. **Un carácter que XML no admite rompe el feed entero.** Un control (`\u0008`, `\u0000`…) o un medio par de sustitutos en un
   título, una bajada o un cuerpo (pasa con texto copiado de PDF y de algunas fuentes) hace que el XML sea inválido: Google Noticias y
   los lectores descartan **todo** el feed, no sólo esa nota. Hoy no pasa (se leyó sin errores), pero nada lo impedía. **Arreglado.**
3. **No existe el feed de podcast** (§ 4).

### Baja

4. **Tipo de contenido genérico**: Cloudflare Pages servía `/feed.xml` como `application/xml`, sin juego de caracteres. Los lectores lo
   aceptan, pero lo correcto es `application/rss+xml; charset=utf-8`. **Arreglado** en `web/public/_headers`. Ojo con un efecto
   visible: algunos navegadores de PC **descargan** el archivo en vez de mostrar el código; es lo normal en un feed (por eso el feed no
   se anuncia con un enlace en el pie, ver el comentario de `layout.js`).
5. **La foto sólo estaba dentro del HTML** (`<img>` en `content:encoded`). Muchos lectores (Feedly, Inoreader, NetNewsWire, las
   miniaturas de Google Noticias) buscan la imagen en `<enclosure>` o `media:content`. **Arreglado**: las dos, con el tamaño real
   (`length`) y el tipo (`image/jpeg`, `image/png` o `image/webp`). Sólo si se sabe cuánto pesa la foto se declara el `enclosure`; un
   `length="0"` engaña al lector.
6. **Sin `ttl`, `managingEditor`, `webMaster` ni imagen del canal.** **Arreglado**: `ttl` 30 (el sitio se rearma cada media hora),
   responsable `contacto@radarbalcarce.com` (el correo público de la página de contacto, `MAIL`) e imagen `/icon-192.png`
   (RSS 2.0 pide hasta 144 px; está declarada de 144 y los lectores la achican).
7. **El `description` quedaba vacío si una nota no traía bajada.** **Arreglado**: usa las primeras palabras del cuerpo.
8. **Sin tope de ítems en el general.** Hoy son 45 (36 horas); un día de mucho movimiento podría pasar de 60. **Arreglado**: tope de 50
   (los más nuevos primero). Las secciones siguen en 30.
9. **Las imágenes no tienen texto alternativo** (`alt=""` en las 36). Es correcto para una foto decorativa con epígrafe al lado; queda
   como mejora posible (usar el título como `alt`).

### Sin tocar (decisión de otros o de ustedes)

10. **El `<link rel="alternate">` de las secciones no tiene `title`** (`web/app/seccion/[ranura]/page.js`) y las páginas de nota y de tema
    no traen ninguno propio (heredan el del sitio). Es metadato de página, lo tiene otro trabajo en curso; no lo toqué.
11. **No hay feed por tema** (`/tema/…`). No hace falta mientras no se pida.
12. **Cultura y agenda**: su `ranura` es `cultura` (`/seccion/cultura/feed.xml` anda; `/seccion/cultura-y-agenda/` da 404, es normal).
13. **El `lastBuildDate` es la hora en que se armaron los datos, no la del ítem más nuevo.** Está bien y el vigilante
    (`infra/vigilante-cloudflare/worker.mjs`) lo usa para saber cuándo se armó la web; no lo cambié ni su formato.

## 3. Lo que se implementó (feed de texto)

Archivos: `web/lib/rss.js` (el armado), `web/lib/rss-disco.js` (nuevo; lo único que lee el disco: cuánto pesa cada foto),
`web/app/feed.xml/route.js` y `web/app/seccion/[ranura]/feed.xml/route.js` (le pasan el correo, el logo y el tamaño de las fotos),
`web/public/_headers` (tipo de contenido) y `pruebas/rss.test.mjs` (13 pruebas; 8 son nuevas).

- Ningún carácter inadmisible llega al XML (`limpiarXml`, aplicado a todo texto y a los CDATA).
- `dc:creator` dice lo mismo que la página (`autorDeNota`): el medio, si el texto es el suyo; Radar Balcarce, si no. La firma (`firmaCorta`)
  va al final del contenido, antes del enlace "La nota completa, con sus fuentes".
- `<enclosure>` (con `length` real y `type`) y `<media:content medium="image">` con `<media:credit>`, para fotos con extensión conocida.
- Canal: `ttl`, `managingEditor`, `webMaster`, `image`, `xmlns:media`.
- Ítems de más nuevo a más viejo; tope de 50 en el general.
- Descripción de respaldo si no hay bajada.
- Prueba nueva que fija que `_headers` declara `application/rss+xml; charset=utf-8` para `/feed.xml` y `/seccion/*/feed.xml`.

Con datos reales (portada + archivo) el feed general queda en 50 ítems y unos 114 KB (36 `enclosure`), y se lee sin errores con un
analizador XML estricto. **No se publicó nada**: los cambios llegan con el próximo "Actualizar la web". Cuando lleguen, repetir los
`curl` de arriba (en especial `Content-Type` y que haya `<enclosure` en el feed).

Nota para quien mantiene las reglas (`docs/10-REGLAS-Y-PRUEBAS.md`, no lo toqué porque lo están editando otros): texto sugerido para la
próxima regla: *"El feed RSS dice quién escribió cada nota igual que la página, nunca lleva un carácter que XML no admite y declara sus fotos con el
tamaño real; los feeds salen como `application/rss+xml` (`pruebas/rss.test.mjs`)."*

## 4. El podcast de los repasos

### Qué hay hoy

- Tres repasos por día: mañana (`noticia1`, 10:00), tarde (`noticia2`, 15:00) y noche (`podcast`, 21:00) (`redes/piezas.mjs`,
  `docs/07-REDES.md`). Cada uno es una voz (Gemini, dos voces propias) que dice los titulares de 2 a 4 notas; entre 55 y 140 segundos
  (el video más largo que registra `reels/salida/piezas.json` dura 140 s).
- **El audio se descarta.** `reels/reel.mjs` escribe `reels/salida/<pieza>.mp3` (voz sola, 24 kHz mono, 128 kbps, sin normalizar: el
  volumen parejo `VOLUMEN_PAREJO` se aplica sólo al armar el video), pero `redes.yml` sólo guarda el `.mp4` como artefacto por 3 días y el
  libro (`web/data/redes.json`) guarda el `mediaId` y el enlace de Instagram y Facebook, no el audio. `IDEAS.md` (RS-1, RS-2, Q1) ya lo
  tenía anotado como pendiente.
- Para cada repaso **ya existe su texto en la web**: la nota propia `repasoAAAAMMDD{manana|tarde|noche}` (`web/lib/notas-propias.js`) con título, las notas
  que se dijeron y sus enlaces. Es el "show notes" de cada episodio. Sólo existe si el repaso tiene 2 notas con página y ninguna es de
  Política, Policiales o rojo: la regla de redes ya cuida lo sensible, y un repaso que se retira de la web también se cae del podcast.
- No hay dónde alojar el audio, no hay portada cuadrada de 1400 a 3000 px (lo más grande que hay es `icon-512.png`), no hay `/podcast.xml`.

### Lo que se dejó hecho: el generador (sin conectar)

`web/scripts/podcast-feed.mjs` (pruebas: `pruebas/podcast-feed.test.mjs`, 9 pruebas; **los dos se borraron el 17/10** porque nada los usaba: quedan en el historial de git). **Ningún workflow ni página lo usaba** (una prueba lo
vigila: si se conecta, esa prueba se cambia a propósito).

- Entrada: el **manifiesto de audios** `web/data/podcast-audios.json` (todavía no existe: lo escribirá el paso que suba cada mp3) y las
  notas de los repasos. Formato por episodio: `"2026-10-15/noticia1": { "url", "bytes", "segundos", "tipo" }`.
- Salida: RSS 2.0 con las etiquetas de iTunes: canal con `title`, `description`, `language` `es-AR`, `itunes:author`, `itunes:owner`
  (nombre y correo `contacto@radarbalcarce.com`), `itunes:image`, `itunes:category` News → Daily News, `itunes:explicit` false,
  `itunes:type` episodic, `atom:link rel="self"`; cada episodio con `title`, `guid isPermaLink="false"` (`radar-balcarce-repaso20261015manana`,
  estable para siempre), `pubDate`, `description` (de qué se habla + aviso de voz), `content:encoded` (las notas con sus enlaces),
  `enclosure` (`url`, `length` real, `type`), `itunes:duration`, `itunes:explicit`, `itunes:episodeType`.
- **Aviso de voz en el canal y en cada episodio**: "La voz de este audio está generada con inteligencia artificial. Los textos son de
  Radar Balcarce." (Spotify retira lo que imita voces reales y Apple y Spotify piden no hacer pasar una voz de IA por humana: `IDEAS.md` RS-2. Nuestras voces son propias, creadas para el medio:
  `CRITERIO-REDES.md` § 6.)
- `problemasDelPodcast` frena el envío si falta la portada (`.jpg`/`.png` por https), el correo del dueño, el tamaño del audio, la duración
  o hay `guid` repetidos. El programa a mano **se niega a escribir** un feed con problemas (hoy: "no hay ningún episodio", que Apple rechaza).
- Tope de 100 episodios (unas cinco semanas a tres por día).

### Requisitos de Apple Podcasts y Spotify (cómo los cubre el diseño)

Los requisitos son los que yo conozco; **verificarlos en el momento del trámite**, porque cambian.

| Requisito | Estado |
|---|---|
| RSS 2.0 público por https, dirección estable | Diseñado: `https://radarbalcarce.com/podcast.xml` |
| Título, descripción, idioma, autor | Hechos en el generador |
| Portada JPG o PNG, cuadrada, de 1400 a 3000 px, RGB, por https y sin pasar de unos 500 KB | **Falta** (diseñarla: la hace una persona; sugerencia 3000 × 3000, JPG) |
| Categoría de iTunes | News → Daily News |
| `itunes:explicit` | `false` |
| Dueño con correo (ahí llega el código de verificación) | `contacto@radarbalcarce.com` (tiene Email Routing: confirmar que **recibe** y a dónde llega) |
| Un `enclosure` por episodio con `url`, `length` exacto y `type` | Hecho (el `length` sale del manifiesto) |
| Audio mp3 (o m4a), dirección directa, **soporta HEAD y `Range`**, sin pasar por redirecciones raras | **Falta el alojamiento** (abajo) |
| `guid` único y permanente por episodio | Hecho |
| Fechas RFC 822 | Hecho |
| `itunes:duration` | Hecho |
| Aviso de contenido generado con IA | En el texto; revisar si el formulario de cada plataforma pide marcarlo |

Formato de audio recomendado para exportar (a hacer en el paso nuevo): mp3 **mono, 44,1 kHz, 128 kbps constante**, con el mismo
filtro `VOLUMEN_PAREJO` de `reels/reel.mjs` (-16 LUFS), y etiquetas ID3 (título, autor, álbum = nombre del podcast). Pesa entre 1 y 2,5 MB por repaso.

### Dónde alojar el audio

**Recomendado: Cloudflare R2 con un dominio propio** (`audio.radarbalcarce.com`).

- R2 contesta `Content-Length`, `Accept-Ranges: bytes` y los pedidos `Range`/`HEAD` (lo que Apple exige). Con dominio propio, Cloudflare
  lo sirve desde su red; sin costo de salida. Plan gratis de R2: 10 GB de almacenamiento; a 3 repasos por día (de 3 a 7 MB por día, 1 a 2,5 GB por año) alcanza para años.
- El dominio ya está en Cloudflare (Pages, Email Routing, el Worker del reloj), así que "conectar un dominio" a un depósito es un clic, no un trámite.
- Ya hay camino abierto: `docs/propuestas/PASOS-PARA-USTEDES.md` describe la activación de R2 (hace falta tarjeta) y `web/scripts/archivar-a-r2.mjs` /
  "Fotos a R2" suben archivos con un token. Para el audio hace falta **un depósito aparte y público** (`radar-podcast`); no usar el de
  respaldos ni el `radar-archivo` (que es privado a propósito).
- **No usar** `*.r2.dev` (tiene límite de pedidos y no es para producción).
- **No usar Cloudflare Pages**: ya hay unos 15.900 archivos de los 20.000 que admite (`CLAUDE.md`, "Las ventanas de tiempo"); sumar 3 audios
  por día lo agotaría, y cada audio engordaría cada armado.
- **No usar GitHub** (repositorio, Pages ni Releases): el repositorio es público y engordaría ~1 a 2 GB por año; los enlaces de Releases
  redirigen a direcciones firmadas, que algunos directorios no siguen bien y sin garantía de `Range`.

### Qué falta construir (en este orden)

1. **Conservar el mp3 de cada repaso**: al terminar `reels/reel.mjs` para `noticia1`, `noticia2` y `podcast`, pasar el audio por
   `VOLUMEN_PAREJO` y dejarlo como mp3 de podcast (hoy se pierde con la corrida; la memoria de voz de `reels/voz-gemini.mjs` guarda el mp3 crudo,
   que sirve de respaldo).
2. **Subirlo a R2** y anotar `url`, `bytes` y `segundos` en `web/data/podcast-audios.json` (lo escribiría sólo ese paso, como pasa con
   `fotos-manuales.json`; un archivo nuevo de `web/data/` **hay que sumarlo a la línea `git add` de `actualizar.yml`** o se pierde; y
   `redes.yml` y "Actualizar la web" no deben pisarse entre sí: ver el apartado de choques en `CLAUDE.md`).
3. **Portada** cuadrada, en `web/public/podcast/portada.jpg` (ya está la dirección en el generador).
4. **La ruta `/podcast.xml`**: una copia de `web/app/feed.xml/route.js` que llame a `episodiosDeLosRepasos` + `armarPodcastRss` con
   `todasLasNotas()`; y en `_headers` el tipo `application/rss+xml; charset=utf-8` para `/podcast.xml`. El generador está pensado para eso: sus funciones no leen el disco.
5. **Anunciarlo**: `<link rel="alternate" type="application/rss+xml" title="El repaso de Radar Balcarce" href="/podcast.xml">` en el `<head>`, y
   una página `/podcast` con los botones a cada plataforma y un reproductor (hoy no hay página de podcast; es una decisión de diseño que se
   consulta antes, como todo cambio visible).
6. **Probar** (el generador `web/scripts/podcast-feed.mjs` se borró el 17/10: hay que recuperarlo del historial de git antes de este paso; ver el apartado de arriba): `curl -I -H "Range: bytes=0-99"` contra un audio (tiene que
   contestar `206` con `Content-Range`) y pasar el feed por los validadores (abajo). Recién ahí, enviar.

### Decisión que les toca a Hernán y Andrés

Tres episodios de uno a dos minutos por día quedan raros en un podcast (`IDEAS.md` RS-2 ya lo decía: "uno diario que junte los tres").
Dos caminos, con el mismo generador:

- **A. Los tres repasos tal cual** (mañana, tarde y noche): cero trabajo de audio extra; episodios muy cortos.
- **B. Un episodio por día a las 21:30** que junte los tres mp3 con `ffmpeg` (unos 3 a 5 minutos): más natural para quien escucha en el auto o
  mientras cocina. Cuesta una pieza más que armar y un cierre de la noche.

Mi recomendación: **B**, o A con los tres, y empezar con A porque no necesita nada nuevo salvo conservar y subir el audio.

### Trámites para enviarlo (los hace una persona, cuando el feed esté publicado y validado)

Todos piden el feed ya publicado; los directorios mandan un código al correo del dueño del feed (`itunes:owner`), así que **ese correo tiene que recibir**.

1. Validar antes: <https://podba.se/validate/> y <https://castfeedvalidator.com/>; también <https://validator.w3.org/feed/> para el RSS.
2. **Apple Podcasts**: <https://podcastsconnect.apple.com> (con un Apple ID del medio) → "+" → agregar un programa con RSS. Revisión de unos días.
   También lo leen desde ahí Overcast, Castro y otras aplicaciones.
3. **Spotify**: <https://creators.spotify.com> → agregar un podcast existente con el RSS. Suele aparecer en horas.
4. **YouTube Music**: <https://studio.youtube.com> → Crear → Nuevo podcast → enviar un feed RSS (hace falta el canal de YouTube del medio;
   confirmar que está disponible para Argentina).
5. **Pocket Casts**: <https://pocketcasts.com/submit/>.
6. Opcionales: **Amazon Music y Audible** (<https://podcasters.amazon.com>), **iVoox** (<https://www.ivoox.com>, muy usado en español),
   **Podcast Index** (<https://podcastindex.org/add>; lo usan muchas aplicaciones abiertas).

## 5. Lo que no pude comprobar

- Los cambios del feed de texto no están publicados: la prueba "en vivo" de `Content-Type: application/rss+xml` y de los `enclosure` se hace
  después del próximo armado.
- No pasé el feed por el validador web de W3C ni por los de podcast (requieren el feed ya publicado en una dirección pública; el de
  podcast todavía no existe). Lo verifiqué con un analizador XML estricto y con pruebas.
- Los requisitos de Apple, Spotify, YouTube Music y Pocket Casts son los que conozco hasta hoy; la página de cada trámite manda.
- `contacto@radarbalcarce.com` aparece en la web como correo público; no pude confirmar desde acá que el Email Routing lo entregue a una
  casilla que alguien lee (ver `docs/08-INFRAESTRUCTURA.md`).
