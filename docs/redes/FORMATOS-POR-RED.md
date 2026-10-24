# Formatos de cada red: qué se puede publicar, cómo, con qué medidas y con qué enlaces

*16/10/2026. Es una **investigación**, no código: no se creó ninguna cuenta, no se tocó ninguna clave, no se publicó nada y no se cambió ningún archivo del robot. Se
leyó la documentación oficial de cada red el 15 y 16/10/2026 (las páginas de Meta de Threads y WhatsApp dicen "actualizado 13 y 8 de octubre de 2026"). Lo que viene de blogs, de
notas de prensa o de memoria y **no se pudo leer en una fuente oficial** está marcado **(sin confirmar)**. Complementa a `PLAN-REELS-OTRAS-REDES.md` y a
`AUTOMATIZAR-REDES-ALTERNATIVAS.md` (de ayer), y confirma o corrige algunos de sus puntos (§ 8). Pedido de Hernán y Andrés, antes de repensar todas las redes: "averiguar si ya
podemos automatizar todos o cuáles, y qué formato tienen de publicación: historias, reels, posteos, si aceptan links, formato de imagen o video, tamaños, etc.".*

## 0. Resumen para Hernán y Andrés

1. **Hoy se automatizan solos, gratis y con la PC apagada: Facebook, Instagram (ya andan), Telegram, Bluesky, Threads y YouTube.** Las tres últimas piden un trámite de una vez (crear
   la cuenta o el canal y autorizar), nada más. Todas tienen API oficial para video, fotos y texto.
2. **X también se automatiza, pero cuesta**: US$ 0,015 por posteo sin enlace (unos US$ 1,80 por mes con 4 por día) y **US$ 0,20 si el texto lleva un enlace** (13 veces más; con uno por día,
   US$ 6 por mes). Confirmado hoy en la página oficial de precios.
3. **TikTok no se automatiza solo con un programa nuestro**: sus reglas dicen que la API no es para "una herramienta propia que sube a las cuentas que uno maneja", y sin auditoría todo
   queda privado. Se puede **por un servicio de terceros** (Buffer, Publer…) o **a mano**, y además TikTok pide no poner marcas ni textos promocionales dentro del video: nuestras placas
   llevan "Radar Balcarce" y la dirección abajo (ver § 2.4).
4. **El canal de WhatsApp no tiene ninguna vía oficial**: el registro de cambios oficial de la plataforma de WhatsApp (al día hasta el 12/10/2026) no nombra "canales" ni "newsletters"
   ni una vez. Va **a mano**.
5. **Historias**: sólo existen en Instagram y en Facebook (las dos por API oficial, hasta 60 segundos). **Ninguna historia por API acepta pegatina de enlace.** Telegram sólo deja
   historias a cuentas de empresa conectadas, no a canales.
6. **Enlaces**: en **Instagram** el enlace de un posteo o un reel **no se puede tocar** (hay que decir "link en la bio"); en **Facebook** sí, **pero Meta está probando un tope de 2 posteos con
   enlace por mes para las páginas que no pagan** (los "publicadores" de noticias estarían exentos; no está claro si Radar Balcarce cuenta como tal, § 3.1); en **YouTube Shorts** los enlaces
   de la descripción dejaron de ser tocables; en **Threads, Bluesky y Telegram** el enlace anda bien y arma una tarjeta (Threads: sólo en posteos de puro texto).
7. **Hallazgo que hay que mirar ya**: nuestros 5 posteos por día en Facebook llevan el enlace en el texto. Si Meta nos cuenta como página común, después del segundo del mes el enlace se vería
   como texto muerto y sin tarjeta. **Revisar en la página si los enlaces de los posteos de los últimos días se ven tocables** (no hace falta ningún programa) y, si no, decidir (§ 6).
8. **Lo que hoy sale encaja bien con cuatro redes de video** (Facebook, Instagram, YouTube Shorts, TikTok): nuestro mp4 vertical 1080 × 1920, 30 cuadros, H.264 + AAC, de 6 a 58 segundos y
   1 MB, **cumple los límites de todas** sin recodificar. Las redes de texto (X, Threads, Bluesky, Telegram) aceptan el mismo video **o** sólo texto con enlace, que es lo que mejor les sienta.
9. **La evidencia sobre buenas prácticas es débil para un pueblo de 53 seguidores**: lo que hay es de medios chicos de Estados Unidos (video corto de bajo costo, repasos semanales,
   constancia antes que viralidad) y de estudios de marcas en general. Lo que sí mide Radar Balcarce: **tres de cada cuatro visitas al sitio vienen de Facebook** (523 de 709 en 17 días);
   Google, 7. Esto ordena las prioridades (§ 5).
10. **Propuesta para discutir** (§ 7): Facebook e Instagram como hoy pero con el enlace pensado para cada uno; sumar **Telegram y Bluesky** (gratis, sin riesgo) y **YouTube Shorts** (gratis, el video no
    caduca); **Threads** después; **X sólo si aceptan gastar** unos US$ 2 a 8 por mes; **TikTok a mano o por Buffer**; **WhatsApp a mano**. Costo total: entre US$ 0 y 8 por mes.

### Una pantalla: qué se puede automatizar

| Red | ¿API oficial hoy? | ¿Gratis y sin PC? | Qué tipos acepta la API | Veredicto |
|---|---|---|---|---|
| **Facebook (página)** | Sí | Sí (ya anda) | Texto, enlace, foto, reel, historia (video y foto) | **Automático** |
| **Instagram** | Sí | Sí (ya anda) | Foto, carrusel (hasta 10), reel, historia (sin pegatinas) | **Automático** |
| **Telegram (canal)** | Sí (Bot API) | Sí | Texto, foto, video, álbum, encuesta | **Automático** |
| **Bluesky** | Sí (AT Protocol) | Sí | Texto, hasta 4 fotos, 1 video, tarjeta de enlace | **Automático** |
| **Threads** | Sí | Sí, con un depósito de videos gratis y renovar el token cada 60 días | Texto (con enlace), foto, video, carrusel (hasta 20) | **Automático** |
| **YouTube** | Sí | Sí (100 subidas por día) | Videos y Shorts (no hay API de "comunidad", sin confirmar) | **Automático** |
| **X** | Sí | **No: se paga por posteo** | Texto, 4 fotos, 1 video | **Automático con costo** |
| **TikTok** | Sí, **pero** sin auditoría todo es privado y la auditoría no es para este uso | No | Video y fotos (hasta 35) | **Terceros o a mano** |
| **WhatsApp canal** | **No** | — | — | **A mano** |
| Pinterest, LinkedIn | Sí, con revisión (nota § 4.9) | — | — | **No por ahora** |

## 0b. El texto de cada red (17/10/2026): largo, enlace, hashtags y plantilla

*Pedido de Hernán, 17/10: "revisá el formato del texto de lo que va en Facebook, en Instagram y en cada red social: no todas usan el mismo ni respetan los links. Los hashtags: 'Balcarce' y
'Radar Balcarce' deberían ser FIJOS y después, según la nota, los que correspondan." Esta sección es la tabla; el código de Facebook e Instagram es `mensajeDeNota` y `pieDePieza`; el que armaba el texto de las otras redes (`textoParaRed`, `redes/texto-por-red.mjs`) se borró el 24/10/2026 (regla 308, ninguna tiene cuenta; está en el historial de git, con
sus pruebas). Hoy sólo publican Facebook e Instagram; para las demás el texto queda listo, no hay ninguna cuenta ni se publica nada. Lo que no pude leer en la
ayuda o la documentación oficial de cada red el 17/10/2026 está marcado **SIN VERIFICAR**; lo marcado "leído hoy" se leyó el 17/10 en la página que se cita.*

### Los hashtags (regla 281)

**Siempre `#Balcarce #RadarBalcarce`, primeros y en ese orden**, en Facebook, Instagram y el pie de los reels (también en las notas de afuera: es la marca). Después, de **1 a 3 de la nota**
(las etiquetas que escribió la IA y verificó el verificador; si la nota no trae etiquetas, el tema de su sección: #Economía, #Fútbol…; en los reels, el tipo de pieza: #Noticias, #Clima,
#FarmaciaDeTurno…). Sin repetir (ni "Balcarce" otra vez, ni con otra tilde). **Con los dos fijos son cinco como mucho: el tope que Instagram anunció en diciembre de 2025** (ver la fila de Instagram).
Los otros hashtags que puede traer una nota quedan afuera; el tope sale de `POSTEO.hashtagsMaximo` (3) en `ingesta/criterio.mjs` y la tabla de `CRITERIO-REDES.md`.

### La tabla

| Red | Texto máximo | Hasta dónde conviene | ¿El enlace se ve tocable? | Hashtags | Plantilla de una nota |
|---|---|---|---|---|---|
| **Facebook** (posteo de nota, con foto) | 63.206 **SIN VERIFICAR** (lo dicen terceros; la ayuda de Meta no se pudo leer) | ~500 (en el celular se ve la parte de arriba y "Ver más": 240 a 480 según el aparato, **SIN VERIFICAR**, de terceros) | **Sí en el texto de un posteo.** En el pie de una *foto* se ve como texto con enlace: **SIN VERIFICAR** si Facebook lo hace tocable y si da tarjeta (no la da; la tarjeta es de los posteos "enlace"). Meta **prueba** un tope de 2 posteos con enlace por mes para páginas que no pagan; los publicadores quedaron afuera según la prensa (TechCrunch, 17/12/2025; sin novedades de 2026 en la búsqueda de hoy) | Sin tope oficial; usamos 5 (2 fijos + 3) | texto de la IA (280) o titular + bajada · "Seguí leyendo en Radar Balcarce: `radarbalcarce.com/r/f/<id>`" · `#Balcarce #RadarBalcarce #…` · "Foto: crédito" |
| **Facebook** (reel) | pie del reel: igual que arriba | ~300 | Sí, UN enlace: el de la nota del repaso (`radarbalcarce.com/nota/repaso<día><turno>`) | 2 fijos + 1 de la pieza | título · lista de titulares (•) · "Las notas, acá: <enlace>" · "Voz generada con inteligencia artificial." · `#Balcarce #RadarBalcarce #Noticias` |
| **Facebook** (historia) | sin texto | — | No (la API de historias no tiene pegatina de enlace: leído el 16/10) | — | sin texto |
| **Instagram** (espejo de la nota) | 2.200 (leído el 16/10 en la referencia de la API) | ~500 | **No**: en el pie no se tocan (hay una prueba de Meta sólo para suscriptores; **SIN VERIFICAR**). Va "link en la bio" | **5**: Instagram anunció en diciembre de 2025 que baja de 30 a 5 por posteo (prensa: BetaNews, 19/12/2025; la fuente primaria —el anuncio de @creators— no se pudo leer: **SIN VERIFICAR**) | texto de la IA · "La nota completa, en radarbalcarce.com (link en la bio)" · hashtags · "Foto: crédito" |
| **Instagram** (reel) | 2.200 | ~300 | No: "Todas las notas, en radarbalcarce.com (link en la bio)" | 2 fijos + 1 | igual que el reel de Facebook, sin enlace |
| **Instagram** (historia) | sin texto | — | No (sin pegatina por API) | — | sin texto |
| **Instagram** (carrusel) | 2.200 | — | No | 5 | **No se usa**: todo lo que va a Instagram es video con voz salvo el espejo de Facebook (regla de siempre) |
| **Threads** | **500** (leído hoy en la referencia de publicar) | ~400 | **Sí.** Hasta 5 enlaces por posteo. La *tarjeta* de enlace (`link_attachment`) **sólo existe en posteos de puro texto**: no con foto ni video (leído hoy) | **Uno solo**: la etiqueta de tema (`topic_tag`, 1 a 50 caracteres, sin punto ni &); si el texto trae varios, vale el primero (leído hoy) | titular o texto de la IA · línea en blanco · `radarbalcarce.com/r/h/<id>` (la primera URL se vuelve tarjeta) · etiqueta de tema `Balcarce` en su campo, no en el texto |
| **X** | **280**; cada enlace cuenta 23 y cada emoji 2 (leído el 16/10) | ~270 | Sí, pero **US$ 0,20 por posteo con enlace contra US$ 0,015 sin él** (13 veces más; precios leídos el 16/10) | La ayuda de X recomienda **no más de 2** por posteo (resumen del buscador; la página dio 403 al abrirla hoy: **SIN VERIFICAR** directo) | titular (recortado en una palabra entera) · `#Balcarce #RadarBalcarce` · **sin enlace** por defecto |
| **Telegram** (canal) | **4.096** el texto; **1.024** el pie de una foto o video (leído hoy en el Bot API) | ~900 | **Sí**, y arma vista previa del primer enlace (`link_preview_options`) | Libres; usamos 5 | titular · texto de la IA o bajada · `radarbalcarce.com/r/t/<id>` · hashtags |
| **Bluesky** | **300** "graphemes" (lo que ve una persona como una letra). **SIN VERIFICAR hoy**: la documentación redirige a otro dominio sin contenido y el esquema de GitHub dio 404; el valor es el del 16/10 | ~280 | Sí, pero **hay que declararlo**: el enlace y cada hashtag son "facetas" con posición en BYTES de UTF-8 (`facetasDeBluesky` las arma). La tarjeta con imagen la arma quien publica | Libres; usamos 2 fijos | titular · enlace · `#Balcarce #RadarBalcarce` · + facetas |
| **TikTok** | **2.200** UTF-16 en el pie de un video (leído hoy); los `#` y `@` se reconocen por los espacios | ~400 | **No** en el pie (**SIN VERIFICAR**); "link en la bio" | Libres; usamos 5 | título · lista · "Más en radarbalcarce.com (link en la bio)" · aviso de la voz · hashtags |
| **YouTube Shorts** | título **100** y descripción **5.000** (**SIN VERIFICAR** en la documentación de hoy) | ~800 | **No** en la descripción de un Short (desde 2023, según prensa; **SIN VERIFICAR**): se dice la dirección | **Hasta 3** se muestran arriba del título; **con más de 60 YouTube ignora todos** (leído hoy en su ayuda); van en el título o en la descripción | título "<pieza> · Radar Balcarce" · descripción con la lista y "Más en radarbalcarce.com" · aviso · `#Balcarce #RadarBalcarce #Noticias` |
| **Canal de WhatsApp** | **SIN VERIFICAR** (no hay API ni encontré el límite en una página oficial) | ~700 | Sí (**SIN VERIFICAR** la vista previa) | No hacen falta (**SIN VERIFICAR**) | titular · bajada · `radarbalcarce.com/r/w/<id>` · va **a mano** |

Dónde se leyó hoy (17/10/2026): Threads <https://developers.facebook.com/docs/threads/posts>; Telegram <https://core.telegram.org/bots/api>; TikTok
<https://developers.tiktok.com/doc/content-posting-api-reference-direct-post>; YouTube <https://support.google.com/youtube/answer/6390658>; Instagram, Facebook, X y Bluesky, las del 16/10 (§ 10 de este
archivo) más la búsqueda de hoy para el tope de 5 hashtags de Instagram y el de 2 enlaces de Facebook. La API de Meta para releer una página compartida (`POST /?id=<url>&scrape=true`) está en
<https://developers.facebook.com/docs/graph-api/reference/url/>.

### Qué hace el código con esto (regla 281)

- **Facebook e Instagram** (lo que ya se publica): `mensajeDeNota` y `pieDePieza` arman el texto; ahora siempre cierran con los hashtags (también las notas sin `textoRedes`, que antes no llevaban ninguno).
- **El resto** (el programa se borró el 24/10/2026, regla 308; lo que sigue describe lo que hacía, por si se abre una cuenta): `textoParaRed('<red>', { tipo: 'nota' | 'reel' | 'historia', nota, pieza })` devuelve `{ texto, titulo, descripcion, enlace, hashtags, etiquetaDeTema, facetas, largo, maximo, cabe, avisos }`; si no
  entra, recorta en una palabra entera y avisa. TikTok y YouTube no publican notas (son de video). Una historia no lleva texto en ninguna. No publica nada ni habla con ninguna red.
- **Los enlaces**: con `ENLACES_CORTOS` prendida salen como `radarbalcarce.com/r/<letra de la red>/<id>` (ver `ACORTADOR-DE-ENLACES.md`); apagada, con las UTM largas de siempre.

## 1. Cómo leer esto

- **API oficial**: el robot le habla a la red directo, sin intermediario. Es lo que hoy hacemos con Meta.
- **Servicio de terceros**: el robot le manda el video a Buffer, Publer u otro, que publica con su propia aplicación aprobada (se paga o se usa el plan gratis). Detalles y precios en
  `AUTOMATIZAR-REDES-ALTERNATIVAS.md` § 4; no se repiten acá.
- **A mano**: una persona toca "publicar" (el robot puede dejar el video y el texto listos).
- Las medidas están en píxeles (ancho × alto). "9:16" es vertical de celular.

## 2. Lo que hoy produce el robot (leído del código)

### 2.1 Las piezas y cómo salen hoy

Fuente: `redes/piezas.mjs`, `redes/meta.mjs`, `redes/elegir.mjs`, `redes/horarios.mjs`, `CRITERIO-REDES.md`. Todas las horas son de Balcarce.

| Pieza | Cuándo | Qué es | Dónde sale hoy |
|---|---|---|---|
| **Posteo de una nota** | Hasta 5 por día, de 8:00 a 22:00, uno cada 90 minutos como mínimo | Foto (la tarjeta de la nota) + texto de la IA (`textoRedes`) o titular y bajada + una línea con el enlace a radarbalcarce.com + hasta 3 hashtags | **Facebook**: foto de 1080 × 1350 (4:5) con el texto y el enlace escrito en él (si la foto falla 3 veces, sale como enlace con tarjeta de 1200 × 630). **Instagram**: el espejo, la misma tarjeta 4:5 con el mismo texto y el crédito de la foto |
| **Repaso de la mañana / tarde / noche** | 10:00, 15:00, 21:00 | Video con voz: 4 notas, de 20 a 58 segundos | **Reel en Facebook e Instagram** + la misma pieza como **historia** en las dos (si pasa de 58 s, la historia sube una copia cortada) |
| **Clima de la mañana / de la noche** | 7:00 / 20:00 | Video con voz de 10 a 25 s | **Historia en Instagram**; en Facebook, **historia y reel** |
| **Farmacia de turno** | 19:00 | Video con voz de 6 a 25 s | Igual que el clima |
| **Un día como hoy** (efeméride) | 9:00, todos los días | Video con voz | Reel + historia en las dos |
| **El feriado** | 8:00, sólo feriados | Video con voz | Reel + historia en las dos |
| **Agenda** | Jueves 12:00 | Video con voz | Reel + historia |
| **Teléfonos útiles** | Sábados 17:00 | Video con voz | Reel + historia |
| **Participá** (noticias, evento, reclamos, nota) | 12:00, lunes a viernes | Video con voz (fijo, armado de antemano) | Reel + historia |
| **Aviso de clima** (helada, granizo, viento fuerte) | Cuando se detecta, una vez | Video con voz | Sólo historia |

Reglas del criterio que valen para cualquier red: nunca Política ni Policiales solos, nunca identificar a un menor o víctima, nunca nombrar la fuente, nunca "en vivo", el aviso
«Voz generada con inteligencia artificial.» en todo lo que lleva voz, un solo nombre ("Radar Balcarce"), dirección escrita `radarbalcarce.com`.

### 2.2 El video de hoy contra los límites de cada red

Nuestro mp4 (`reels/reel.mjs`): **1080 × 1920, 30 cuadros por segundo, H.264 `yuv420p`, audio AAC 160 kbps a 44,1 kHz, `+faststart`, subtítulos quemados en la imagen**, de 6 a 58 s (tope
`PODCAST_VOZ.segundosMaximoHistoria`), 0,4 a 1,5 MB. La placa tiene la firma abajo ("Radar Balcarce" y `radarbalcarce.com`) y una barra roja de avance.

| Límite | Facebook reel | Facebook historia | Instagram reel | Instagram historia | Threads | Bluesky | YouTube Short | X | TikTok | Telegram |
|---|---|---|---|---|---|---|---|---|---|---|
| Duración máxima | 90 s | **60 s** | 15 min | **60 s** | 5 min | 3 min | 3 min | 20 min | según cuenta (`max_video_post_duration_sec`) | sin tope práctico |
| Nuestro tope (58 s) | cumple | cumple | cumple | cumple | cumple | cumple | cumple | cumple | cumple | cumple |
| Peso máximo | (no figura) | (no figura) | 300 MB | 100 MB | 1 GB | 100 MB | 256 GB | 8 GB | por pedazos de 5 a 64 MB | 50 MB (bots) |
| Códec | H.264/H.265 | ídem | H.264/HEVC | ídem | H.264/HEVC | MP4 | cualquiera | (sin confirmar) | MP4/WebM/MOV | MPEG4 |
| Audio | AAC-LC, **48 kHz** estéreo, 128 kbps o más | ídem | AAC hasta 48 kHz, 128 kbps | ídem | AAC hasta 48 kHz | — | — | — | — | — |
| Cuadros | 24 a 60 fijos | ídem | 23 a 60 | ídem | 23 a 60 | — | — | — | — | — |

Lo que hay que mirar: **Facebook documenta audio a 48 kHz y el nuestro es de 44,1**; hoy anda (sale publicado), así que no es urgente, pero cuando se toque `reel.mjs` conviene pasarlo a 48
(sin costo). Instagram y Threads piden además "sin listas de edición y con el bloque `moov` al principio": ya tenemos `+faststart` (lo primero está), lo segundo se comprueba con la primera prueba
real (como ya decía el plan).

### 2.3 Qué tamaño tiene la audiencia (datos propios, `web/data/estadisticas.json`)

- **Seguidores el 15/10**: Facebook 53, Instagram 7. Alcance de Instagram de esa medición: 4.
- **De dónde llegan las visitas al sitio** (17 días, del 29/09 al 15/10): `facebook.com` 523, directo 179, `google.com` 7. Es decir, 74 % Facebook. **Hoy casi toda la audiencia que llega a la web vino por Facebook.**
- **Aparatos**: 66 % celular. **Horas** con más visitas (hora de Balcarce): 10 a 11, 15 a 16 y 21 a 23, con un pico menor a las 8 a 9.
- **Muestra chica** (646 visitas en total): sirve para ordenar prioridades, no para sacar conclusiones finas.

### 2.4 Tres detalles del contenido que chocan con alguna red

1. **TikTok**: sus reglas para quien publica por API piden "evitar agregar material no deseado": que las aplicaciones "no superpongan nombre de marca, logo, marca de agua, otra marca
   promocional, **enlace o texto promocional** sobre el contenido compartido". Nuestra firma de abajo ("Radar Balcarce" + `radarbalcarce.com`) podría caer ahí; dicen que puede llevar a contenido borrado o
   cuentas deshabilitadas (**¿alcanza con una firma discreta del propio medio? sin confirmar**; es lo primero para preguntar o probar a mano).
2. **Originalidad en Meta** (comunicado de Meta del 13/3/2026): Facebook da prioridad al contenido "filmado o producido directamente" por la página y reduce el alcance de lo duplicado o con cambios
   menores de lo de otro. Nuestros videos y tarjetas son propios (voz, placa y texto armados por el medio), así que no es un problema; sí lo sería repostear tal cual el video de otro medio.
   El mismo mp4 en Instagram y en Facebook sale de la misma cuenta, no cuenta como copia.
3. **Etiqueta de IA**: Meta pide avisar cuando se publica video foto-realista o **audio de apariencia realista** generado con IA (política de 2024, **sin confirmar si sigue igual en 2026**). Nosotros avisamos
   en el texto. Las redes tienen un campo propio que se puede marcar por API: Instagram `is_ai_generated`, TikTok `is_aigc`, YouTube `status.containsSyntheticMedia`; X, Bluesky y Telegram no tienen. Proponemos
   marcarlos donde existan (§ 7.3); si cambia el alcance en Instagram, se ve en la primera prueba.

## 3. Red por red

Cada red: (a) tipos y qué se puede por API, (b) medidas, (c) enlaces, (d) historias, (e) cómo encaja lo nuestro, (f) buenas prácticas con evidencia y (h) qué se puede automatizar. Todo lo que no
tiene "(sin confirmar)" se leyó en la fuente indicada.

### 3.1 Facebook (página "Radar Balcarce")

**(a) Tipos y vía.** Todos por la API de Meta que ya usamos (`redes/meta.mjs`).

| Tipo | ¿API oficial? | ¿Lo usamos? | Nota |
|---|---|---|---|
| Texto o enlace (`/feed`) | Sí | Como respaldo si la foto falla | Con enlace, Facebook arma la tarjeta |
| Foto con texto (`/photos`) | Sí | **Sí**, los 5 posteos por día | |
| Reel (`/video_reels`) | Sí | **Sí** | Límite: **30 reels por API cada 24 horas** |
| Historia de video o de foto (`/video_stories`, `/photo_stories`) | Sí | **Sí** | La historia de foto, hasta 10 MB y .jpeg/.png/.gif/.bmp/.tiff |
| Álbum de varias fotos, video largo, "en vivo", encuestas | La API existe para varios **(sin confirmar, no se leyó hoy)** | No | No hacen falta |

**(b) Medidas.** *Reel e historia de video*: 9:16 (se aceptan relaciones entre 16:9 y 9:16), **1080 × 1920 recomendado, mínimo 540 × 960**, 24 a 60 cuadros fijos, H.264 o H.265 (también VP9
y AV1), 4:2:0, GOP cerrado de 2 a 5 s, audio AAC-LC estéreo de 48 kHz y 128 kbps o más. Duración: reel de **3 a 90 s**; historia de video, la tabla dice 3 a 90 pero la sección de límites dice
**60 s como máximo** (se toma el 60). Peso máximo: no figura. *Foto*: 4:5 o cuadrada (1080 × 1350 o 1080 × 1080, dato de `FORMATOS.md`). *Tarjeta de enlace*: 1200 × 630 (1,91:1). *Largo del texto*:
Facebook admite textos larguísimos (63.206 caracteres, **sin confirmar**); nosotros no pasamos de 280 + enlace + 3 hashtags, que es lo que conviene (sólo se ven unas líneas antes de "Ver más").

**(c) Enlaces.**
- Un enlace en el texto es **tocable**. Si el posteo es un *enlace* (no una foto), Facebook arma una **tarjeta** con la imagen de la nota (`og:image`, 1200 × 630), el titular y el sitio. En un posteo de **foto**
  con el enlace escrito en el pie, el enlace se ve pero **no hay tarjeta** (sin confirmar, es el comportamiento habitual); es lo que hacemos hoy.
- **Hallazgo 15/10**: desde diciembre de 2025 Meta **prueba** limitar a **2 posteos con enlace por mes** a los perfiles en modo profesional y a las páginas que no pagan Meta Verified / Meta One
  (desde US$ 14,99 por mes por perfil; escalones de US$ 50, 150 y 500). Pasado el tope, el posteo sale igual, pero el enlace se ve como texto y sin tarjeta, y el alcance tiende a cero. En septiembre de
  2026 la prueba se habría ampliado con el lanzamiento de Meta One para empresas.
  - **Exenciones que nombran las fuentes**: los enlaces dentro de los **comentarios**, los **afiliados** y los **enlaces a posteos de Facebook, Instagram o WhatsApp** (TechCrunch, 17/12/2025). Un blog de
    septiembre de 2026 dice que los comentarios podrían contar también (sin confirmar).
  - **Los "publicadores" de noticias**: TechCrunch (diciembre) y Social Media Today (17/9/2026) dicen que Meta los dejó **afuera de la prueba**. Pero otra nota de prensa del sector (Newscast Studio, 30/9)
    la plantea como problema grave para las redacciones, y ninguna fuente aclara **qué es un "publicador"**: **no sabemos si una página de categoría "medio de noticias" chica como la nuestra lo es** (sin confirmar).
  - Meta no publicó la regla en un documento oficial que se haya podido leer; todo es de prensa. Su Widely Viewed Content Report dice que sólo el 1,3 % de las vistas de feed en EE. UU. del primer trimestre
    de 2026 tenían enlace externo (contra 9,8 % en 2022).
- **Dónde poner el enlace** (en orden de seguridad frente al tope): (1) en el **primer comentario** del propio posteo (la API deja comentar con el token de la página) — **a probar**; (2) en el texto, como hoy; (3) en el botón
  de la página ("Más información" hacia el sitio, ya definido en `PERFILES.md`).

**(d) Historias.** Foto o video; **hasta 60 s**; 9:16; 24 horas de vida (el archivo de historias puede estar activado); **la documentación de la API de historias de página no menciona pegatinas ni
enlaces** (confirmado: no hay). Un video o foto ya usado en un posteo no se puede usar en una historia: nuestras historias son piezas propias, no hay problema. Estado actual: ya sale el repaso, el clima,
la farmacia y las piezas fijas.

**(e) Encaje.** Es la red que **trae casi todas las visitas** (74 %). Lo que más conviene: seguir con los 5 posteos de notas con foto + reels. Ver el riesgo de los enlaces arriba.

**(f) Buenas prácticas con evidencia.**
- Meta (13/3/2026): prioriza lo original y deprioriza lo repetido; las vistas de reels originales casi se duplicaron en el segundo semestre de 2025 (fuente: comunicado de Meta).
- Buffer, 52 millones de posts de más de 200.000 cuentas (2024-2025): el mejor horario general para Instagram es jueves 9:00, miércoles 12:00 y miércoles 18:00 (mediana de engagement por seguidores);
  vale para "tipos de post mezclados" y no separa Facebook; para Facebook otro resumen cita jueves 9:00 (**sin confirmar contra la página de Buffer**).
- Medios locales: video corto con texto en pantalla (30 a 90 minutos de trabajo) y **resúmenes semanales de 30 a 60 segundos** son los formatos que más funcionan "porque son constantes, no virales"
  (Instituto de periodismo de EE. UU., American Journalism Project, 2026). Los reels sirven sobre todo como **herramienta de marca y fidelidad**, no de tráfico directo (Local Media Association, 3/2026).
- Frecuencia: nuestra frecuencia (5 posteos + 3 a 4 reels por día) es muy superior a la que recomienda Buffer para marcas (3 a 5 por semana y 1 a 2 historias por día). Para un medio de noticias la
  comparación no es justa, pero con 53 seguidores conviene **medir** si más no es peor (alcance por posteo en el panel de Números).

**(h) Automatización.** Automático, gratis, ya andando.

### 3.2 Instagram (`@radarbalcarce`)

**(a) Tipos y vía.** Todos por la API de Meta (publicación de contenido), cuenta profesional vinculada a la página. Límite: **100 posteos por API cada 24 horas** (la propia página dice 50 en otra
sección: dato contradictorio, no nos acerca ninguno).

| Tipo | ¿API? | ¿Lo usamos? | Medidas y límites |
|---|---|---|---|
| Foto de feed | Sí | **Sí** (el espejo) | **Sólo JPEG**, hasta 8 MB, relación entre **4:5 y 1,91:1**, ancho 320 a 1440 px, sRGB; la imagen debe estar en una dirección pública |
| Carrusel | Sí | No | Hasta **10** fotos o videos; se recortan a la proporción de la primera |
| **Reel** | Sí | **Sí** | **3 s a 15 min**, hasta **300 MB**, MP4 o MOV, H.264/HEVC, 23 a 60 fps, ancho máx. 1920, audio AAC hasta 48 kHz, 128 kbps, 9:16 recomendado (acepta de 0,01:1 a 10:1) |
| **Historia** (foto o video) | Sí | **Sí** | Foto JPEG 8 MB; video **3 a 60 s**, hasta **100 MB**, 9:16 recomendado; vive 24 horas |
| Reel de prueba (*trial reel*) | Sí (`trial_params`) | No | Se muestra primero a gente que no te sigue; se "gradúa" a mano o solo según el rendimiento |
| En vivo, canales de difusión | **No** por la API de publicación (sin confirmar) | No | |
| Programar | Sí | Hacemos nosotros el reloj | |

Otros campos útiles que la API admite: **portada del reel** (`cover_url` o `thumb_offset`), `share_to_feed`, **colaboradores** (hasta 3, no en historias), **etiquetar usuarios** (también en historias,
desde 7/2025), **texto alternativo** de hasta 1.000 caracteres (sólo fotos), `is_ai_generated` (autodeclaración de IA, § 2.4).

**(b) Texto.** Pie de **hasta 2.200 caracteres**; la API dice **hasta 30 hashtags** y 20 menciones, pero **Instagram anunció en diciembre de 2025 un tope de 5** hashtags por posteo (prensa, sin confirmar el
texto oficial); nuestros 3 están dentro de cualquier versión. Hashtag sin tilde o con tilde: no importa.

**(c) Enlaces.** **En el pie de un posteo o de un reel los enlaces no se tocan** (se ven como texto). Hay una prueba de Meta (marzo de 2026) de enlaces tocables en pies sólo para suscriptores de Meta Verified,
con tope mensual y sin anuncio de extensión (sin confirmar). Las vías reales: **"link en la bio"** (nuestro perfil lleva `https://radarbalcarce.com`), el **botón de contacto** (WhatsApp) y la **pegatina de enlace
en una historia**, pero esa pegatina **no se puede poner por API** ("publicar pegatinas de enlace, encuesta o ubicación no está soportado"; sí se puede mencionar a otro usuario sin pegatina).
Hoy escribimos la dirección completa con UTM en el pie, que **no sirve para tocar**; lo más útil es decir **"Nota completa: link en la bio"** y dejar el enlace limpio sólo si alguien lo quiere copiar.

**(d) Historias.** Foto o video; hasta 60 s por API (en la app también se pueden armar más largas, pero cada pedazo es de 60); 24 horas; sin pegatinas por API; sin texto alternativo; sin colaboradores. Se
pueden **destacar** en el perfil a mano (ya tenemos "Farmacia · Teléfonos · Agenda · Clima · Participá" definidas en `PERFILES.md`).

**(e) Encaje.** Hoy: 7 seguidores. La regla del proyecto ("todo es video con voz salvo el espejo") ordena bien lo que ya hay. Instagram es la red donde más vale **el aspecto y el sonido**; los enlaces son
secundarios. Un reel es además **elegible para el feed de personas que no nos siguen**, que es lo que Instagram premia hoy.

**(f) Buenas prácticas.** Buffer (9,6 millones de posts de Instagram, 2024-2025): miércoles y jueves son los días de más engagement mediano; 18 a 23 h rinde mejor entre semana excepto el jueves, que rinde de 7 a 9;
**sábados y viernes, flojos**; 1 a 5 de la madrugada, lo peor; recomienda **3 a 5 posteos de feed por semana y 1 a 2 historias por día**. Es dato de marcas; **nuestros horarios de repaso (10, 15, 21)
coinciden con los picos de visitas de Balcarce**, así que no se tocan sin medir.

**(h) Automatización.** Automático, gratis, ya andando.

### 3.3 Telegram (canal)

**(a) Tipos y vía.** Bot API oficial: gratis, sin revisión, sin auditoría, sin tope de publicaciones que importe.

| Tipo | Método | Límites (leídos hoy en la documentación del Bot API) |
|---|---|---|
| Texto | `sendMessage` | **1 a 4.096 caracteres**, con formato (negrita, enlaces) |
| Foto | `sendPhoto` | Hasta **10 MB**, ancho + alto ≤ 10.000, relación máx. 20; pie de **0 a 1.024** caracteres |
| Video | `sendVideo` | MPEG4; los bots suben hasta **50 MB**; pie de **0 a 1.024** |
| Álbum | `sendMediaGroup` | Fotos y videos juntos |
| Encuesta, documento, audio, nota de voz | `sendPoll`, `sendDocument`, `sendAudio`, `sendVoice` | Hasta 50 MB (documento y audio) |
| **Historia** | `postStory` | **Sólo "en nombre de una cuenta de empresa" conectada al bot**; no hay historia de canal por bot (para canales hace falta ser impulsado, y es del cliente, no del bot) |
| Silencioso | `disable_notification` | Llega sin sonido |

**(b) Enlaces.** Sí, **tocables**. Telegram arma una **vista previa** del primer enlace del texto y se controla con `link_preview_options` (`is_disabled`, `url` para forzar cuál,
`prefer_large_media` para imagen grande, `show_above_text` para ponerla arriba). Con un video, el enlace va en el pie (tocable). Es la red con **menos fricción** para el enlace.

**(c) Historias y en vivo.** No para el canal (ver arriba).

**(e) Encaje.** El canal es la red de "lo útil" (farmacia, clima, agenda): cada mensaje llega al celular. En un pueblo se usa poco, pero cuesta cero y es el mejor lugar de prueba del circuito. Sirve además de
**buzón para el WhatsApp a mano** (el robot deja ahí el video y el texto, ustedes reenvían).

**(f) Buenas prácticas.** Sin estudio específico de medios locales en Telegram encontrado hoy. Práctica general (sin confirmar con cita): pocos mensajes con sonido, el resto en silencio; el plan ya propone sonar
sólo el repaso de la mañana, la farmacia y el repaso de la noche.

**(h) Automatización.** Automático, gratis, sin renovar nada. Crear el bot (@BotFather) y el canal lo hace una persona.

### 3.4 Bluesky

**(a) Tipos y vía.** Protocolo abierto (AT Protocol), gratis, sin revisión. Se entra con usuario y **contraseña de aplicación**.

| Tipo | Límite |
|---|---|
| Texto | **300 caracteres** (graphemes) |
| Fotos | Hasta **4** por posteo; el tope por foto es de **1 MB** según la documentación vieja y **2 MB** desde abril de 2026 según la prensa (TechCrunch, 23/4/2026; el texto del esquema dice "antes 1 MB") (sin confirmar contra el esquema oficial) |
| Video | **1** por posteo, hasta **3 minutos y 100 MB**, MP4; hace falta correo verificado (comunicados de Bluesky de 2024 y 2025); cuota diaria de unos 25 videos o 10 GB (`getUploadLimits`) |
| Tarjeta de enlace | La arma la aplicación que publica: título, descripción y miniatura de hasta 1 MB (sin confirmar) |
| Etiquetas, idioma, texto alternativo | Sí (el video pide texto alternativo por accesibilidad) |

**(b) Enlaces.** Tocables, **marcados aparte** del texto (hay que declarar su posición); la tarjeta de enlace con imagen la tiene que armar el robot (descarga el `og:image` y lo sube). No castigan los
enlaces (sin cita; práctica de la comunidad de periodismo). **Historias: no existen.**

**(e) Encaje.** Bajo hoy (poca gente de Argentina), pero costo cero y buena comunidad de periodistas. Un nombre de usuario con el propio dominio (`@radarbalcarce.com`) sirve de sello.

**(f)** Sin estudio de buenas prácticas verificable hoy. **(h)** Automático, gratis, sin renovar nada.

### 3.5 Threads

**(a) Tipos y vía.** Threads API de Meta (leída hoy, "actualizada el 13/10/2026"). Dos pasos: crear el contenedor y publicarlo (conviene esperar unos 30 s entre uno y otro).

| Tipo | Límite |
|---|---|
| Texto | **500 caracteres** (los emojis cuentan por bytes) |
| Foto | JPEG o PNG, hasta **8 MB**, relación hasta 10:1, ancho 320 a 1440 |
| Video | MOV o MP4, H.264/HEVC, 23 a 60 fps, ancho máx. 1920, AAC ≤ 48 kHz, **hasta 5 min y 1 GB**, 9:16 recomendado, sin listas de edición |
| Carrusel | **2 a 20** fotos o videos |
| Etiqueta de tema | **Una** por posteo (`topic_tag`, 1 a 50 caracteres) |
| Tope | **250 posteos por API cada 24 horas** |
| Encuestas, GIF (GIPHY), citas, reposts, archivos de texto | Sí, no los necesitamos |

**Importante para nuestro uso:** *el video y la foto se pasan por una dirección pública* (Threads los baja de ahí), no se suben como archivo: hace falta el depósito de videos (R2) del plan.

**(b) Enlaces.** Tocables. **`link_attachment` (la tarjeta de enlace) sólo funciona en posteos de puro texto**: no con foto, video ni carrusel. Si el posteo es de texto y trae un enlace, la **primera URL** se
vuelve tarjeta. Hasta **5 enlaces** únicos por posteo (desde el 22/12/2025, más de 5 da error). Es decir: **o tarjeta de enlace, o video**, no las dos cosas. Con video, el enlace va en el texto, tocable pero sin tarjeta
(sin confirmar). **Historias**: no hay API; existe una función para "compartir en Instagram Stories" desde la app (manual).

**(e) Encaje.** Es la misma cuenta y público de Instagram; el posteo de texto con enlace y tarjeta es su formato natural: "titular + bajada + enlace".

**(f)** Sin estudio verificable hoy. **(h)** Automático y gratis, con dos trámites: la invitación de "tester" (hasta que Meta apruebe la app, sólo se publica a nombre de los testers) y **renovar el token cada 60 días**
(en el plan: lo hace el robot).

### 3.6 YouTube (Shorts)

**(a) Tipos y vía.** YouTube Data API v3, `videos.insert` (leído hoy). No hay API aparte para Shorts: **un video vertical o cuadrado de hasta 3 minutos es un Short** (regla desde el 15/10/2024).

| Dato | Valor |
|---|---|
| Peso máximo | 256 GB |
| Cuota | **100 subidas por día** (1 unidad del balde de subidas por llamada) |
| Privacidad por defecto | **Público** si no se indica. La página oficial de hoy dice textual: "Los videos subidos desde proyectos de API **no verificados no** están restringidos a modo privado". Algunos blogs repiten lo viejo: **se resuelve con la prueba de "no listado" del plan** |
| Título / descripción | Hasta 100 caracteres / 5.000 (sin confirmar en la documentación, es lo conocido); hashtags en la descripción; `#Shorts` ayuda a clasificar |
| Etiqueta de IA | `status.containsSyntheticMedia` |
| Subtítulos | Se pueden subir aparte, pero los nuestros ya están quemados |
| Publicaciones de comunidad, historias, en vivo | Comunidad e historias: **sin API** (sin confirmar); en vivo existe API pero no aplica |

**(b) Enlaces.** Desde agosto de 2023 YouTube **desactivó los enlaces tocables en la descripción y los comentarios de los Shorts** (por el spam; según notas de prensa y blogs, sin una página oficial leída hoy; sin
confirmar si sigue igual). Vías que sí andan: el **video relacionado** (un enlace a un video largo nuestro) y los **enlaces del canal**. **No hay nada que ponga un enlace a una nota desde un Short**. Es una red
de marca y de búsqueda, no de visitas.

**(e) Encaje.** El de más alcance a largo plazo: un Short sobre "Balcarce" se encuentra por Google y YouTube durante meses. En Argentina el video por YouTube crece (Informe de Noticias Digitales 2026 del
Instituto Reuters: la transmisión en vivo y el video de formato conversación en YouTube son "una fuente de información cada vez más importante, sobre todo entre los jóvenes").

**(f)** Datos de proveedores (poco fiables): Tubular Labs dice que en noticias de Latinoamérica en YouTube los videos de menos de 30 segundos tienen el mayor engagement por video; un estudio académico sobre 67 millones
de posts de más de 1.100 medios de noticias (ScienceDirect, 2026) encontró que **un contenido más corto no se asocia con más engagement** (la evidencia es mezclada). **(h)** Automático, gratis. Trámite: canal + proyecto
de Google Cloud + una autorización; **la pantalla de consentimiento debe quedar "En producción"** o el acceso muere a los 7 días.

### 3.7 X

**(a) Tipos y vía.** API v2, **pago por uso** (leído hoy en `docs.x.com`), sin suscripciones.

| Dato | Valor |
|---|---|
| Crear un posteo | **US$ 0,015** |
| Crear un posteo **con una URL** | **US$ 0,20** |
| Subir metadatos de medio | US$ 0,005 por pedido |
| Texto | **280** caracteres; **toda URL cuenta 23**; cada emoji cuenta 2 |
| Medios por posteo | **Hasta 4 fotos, o 1 GIF, o 1 video** |
| Foto | JPG, PNG, GIF, WEBP hasta **5 MB** |
| Video (cuenta común) | **0,5 s a 20 min**, hasta **8 GB**; con X Premium, hasta 125 min y 16 GB (los límites siguen al usuario, no a la API) |
| Reglas | Marcar la cuenta como "automatizada" (sin confirmar el texto actual) |
| Crédito de bienvenida | US$ 20 al guardar la primera tarjeta, más un 20 % de vuelta en créditos de xAI (según la página de precios) |

**(b) Enlaces.** Se permiten y se tocan; X arma una tarjeta con las etiquetas `og:` de la página (sin confirmar). **Pero cuestan 13 veces más** y se cree que el algoritmo los castiga (**sin documento oficial leído**).
Con 4 posteos por día sin enlace: 4 × 30 × 0,015 = **US$ 1,80 por mes**. Un posteo diario con enlace: + 30 × 0,20 = **US$ 6 por mes**; cinco notas por día con enlace: **US$ 30**. Sirve poner el enlace en
una **respuesta** al propio posteo (cuenta como posteo con URL: US$ 0,20 también).

**(d) Historias:** no existen. **(e) Encaje:** bajo a medio (periodistas, entidades de la zona). **(f)** Sin estudio verificable. **(h)** Automático, **con costo**. Se necesita tarjeta (la carga una persona).

### 3.8 TikTok

**(a) Tipos y vía.** Content Posting API (leída hoy, "actualizada el 24/8/2026").

| Tipo / dato | Valor |
|---|---|
| **Publicación directa de video** (`video.publish`) | Sale en el perfil. Pie de **hasta 2.200** caracteres UTF-16 con #hashtags y @menciones; elegir privacidad, comentarios, dúo y *stitch*; `is_aigc` (etiqueta de IA); portada por `video_cover_timestamp_ms` |
| **Subir a borradores** (`video.upload`) | El video llega al buzón y **la persona termina de publicarlo** |
| **Fotos** (`/content/init/`) | Hasta **35** fotos por URL pública (dominio verificado), título de **90** y descripción de **4.000** caracteres; modo `DIRECT_POST` o `MEDIA_UPLOAD` |
| Subida del video | Por pedazos de **5 a 64 MB** (el último, hasta 128 MB); los de menos de 5 MB, enteros; el enlace de subida vale 1 hora |
| Topes | 6 pedidos por minuto y token; unas **15 publicaciones por día** por cuenta (`spam_risk_too_many_posts`) |
| **Duración máxima** | La entrega `max_video_post_duration_sec` de `creator_info` (en la app, 10 minutos y más; **sin confirmar** el valor de hoy) |
| **Sin auditoría** | **Todo queda en "sólo yo"**, la cuenta debe ser privada y hay un tope de 5 usuarios por día (`unaudited_client_can_only_post_to_private_accounts`) |
| **Uso previsto** (reglas de TikTok) | "Un público amplio", **no** "una herramienta para subir contenidos a la cuenta o cuentas que uno o su equipo maneja"; **no** "copiar contenido de otras plataformas"; la persona debe poder elegir la privacidad y dar su consentimiento en cada video |

Por eso **nuestro propio cliente no es viable**: es exactamente el uso que TikTok dice que no quiere (esto corrige el punto 2.6 del plan de ayer, ya corregido en la investigación de las alternativas). Los servicios (Buffer, Publer…)
tienen su propia app aprobada. **Marcas dentro del video**: § 2.4.

**(b) Enlaces.** Los enlaces en los pies de TikTok **no son tocables** (sin confirmar con una fuente leída hoy); el enlace va en la **biografía del perfil** (el botón de sitio web de las cuentas de empresa; condiciones y
cantidad de seguidores, **sin confirmar**). **(d) Historias:** TikTok tiene "historias" en la app, **sin API** (sin confirmar). **(e) Encaje:** alto en alcance, bajo en visitas. **(f)** La evidencia más fuerte para medios chicos es de Block Club Chicago (TikTok creció más de 3.000 % en 2025)
y WyoFile (Instagram duplicado en menos de un año, con video social), ambos en American Journalism Project 2026: son **medios con periodistas que salen a filmar**, no se parecen a lo nuestro (voz de IA, placas). **(h)** Terceros o a mano.

### 3.9 WhatsApp (canal)

**(a)** **No hay ninguna API oficial para publicar en un Canal.** Leído hoy: la plataforma de WhatsApp Business (Cloud API) sólo tiene mensajes, plantillas, llamadas y grupos, y su **registro de cambios oficial,
actualizado hasta el 12/10/2026, no menciona "canal" ni "newsletter"**. Un tutorial de 2026 de un tercero dice "sin API". Las vías de terceros (Whapi, WAHA) usan el **número conectado por código QR** como WhatsApp Web, que los términos de
WhatsApp prohíben (riesgo de perder el 2266 51-1612).

**(b) Tipos que acepta el canal** (a mano): texto, foto, video, pegatinas, encuestas; el texto de un anuncio se puede editar durante unos 30 días (prensa, sin confirmar los límites de largo y duración, que no encontré en la ayuda oficial hoy).
**Enlaces**: se ven tocables con vista previa (sin confirmar). Los seguidores no se enteran por la ayuda del Canal.

**(e) Encaje:** es la red más cercana a la gente de acá (nuestro propio número es el contacto del medio). **(f)** Sin estudio de buenas prácticas verificable. **(h)** **A mano**: 20 segundos por repaso con el video y el texto que el robot deje listos.

### 3.10 Notas: Pinterest y LinkedIn

- **Pinterest**: API v5 con video, pero sin acceso "Standard" los pines son visibles sólo para quien los crea (trámite de 1 a 4 semanas, según guías de terceros). No es red de noticias locales. **No.**
- **LinkedIn**: Videos API + Posts API con el producto restringido "Community Management" y revisión; pide página de empresa; MP4 de 3 s a 30 min y 75 KB a 500 MB (lo dice el plan de ayer, leído en Microsoft Learn). Público profesional. **No por ahora.**

Ninguna de las dos se volvió a leer hoy; los datos son los del plan del 15/10.

## 4. Comparativos

### 4.1 Medidas de imagen y de texto

| Red | Imagen de posteo | Relación | Peso | Cantidad | Texto máximo | Hashtags |
|---|---|---|---|---|---|---|
| Facebook | 1080 × 1350 (foto) / 1200 × 630 (tarjeta de enlace) | 4:5 / 1,91:1 | 10 MB (historia) | (sin confirmar) | muy largo (sin confirmar) | los que quieras (usamos ≤ 3) |
| Instagram | 1080 × 1350 JPEG | 4:5 a 1,91:1 | 8 MB | hasta 10 (carrusel) | 2.200 | API 30; **tope de 5 anunciado** |
| Telegram | cualquiera | cualquiera (≤ 20:1) | 10 MB | álbum | 4.096 (pie 1.024) | libres |
| Bluesky | cualquiera | cualquiera | 1 a 2 MB (según fuente) | 4 | 300 | libres |
| Threads | JPEG/PNG, ancho 320 a 1440 | hasta 10:1 | 8 MB | 20 (carrusel) | 500 | **uno** (tema) |
| YouTube | miniatura aparte (sin confirmar) | 9:16 / 1:1 | — | — | título 100 / desc. 5.000 (sin confirmar) | en la descripción |
| X | JPG, PNG, GIF, WEBP | libre | 5 MB | 4 | 280 (URL = 23) | libres |
| TikTok | fotos por URL (hasta 35) | 9:16 recomendado (sin confirmar) | (sin confirmar) | 35 | título 90 / desc. 4.000 (fotos); 2.200 (video) | libres |

### 4.2 Video

| Red | Relación | Resolución | Duración | Peso | Códec / audio |
|---|---|---|---|---|---|
| Facebook reel / historia | 9:16 | 1080 × 1920 (mín. 540 × 960) | 3 a 90 s / **hasta 60 s** | (no figura) | H.264/H.265, AAC 48 kHz |
| Instagram reel / historia | 9:16 (acepta de 0,01:1 a 10:1) | ancho ≤ 1920 | 3 s a 15 min / **3 a 60 s** | 300 MB / 100 MB | H.264/HEVC, AAC ≤ 48 kHz |
| Telegram | cualquiera | cualquiera | sin tope práctico | **50 MB** (bots) | MPEG4 |
| Bluesky | cualquiera | — | **3 min** | **100 MB** | MP4 |
| Threads | 9:16 recomendado (0,01:1 a 10:1) | ancho ≤ 1920 | hasta 5 min | 1 GB | H.264/HEVC, AAC ≤ 48 kHz |
| YouTube Short | vertical o cuadrado | hasta 1080p | **hasta 3 min** | 256 GB | cualquiera |
| X | libre | (sin confirmar) | 0,5 s a 20 min | 8 GB | (sin confirmar) |
| TikTok | 9:16 | (sin confirmar) | según cuenta | por pedazos | MP4/WebM/MOV |

### 4.3 Enlaces

| Red | ¿Tocables en un posteo normal? | ¿Tarjeta (Open Graph)? | ¿Castigo o costo? | Dónde conviene el enlace |
|---|---|---|---|---|
| Facebook | Sí | Sí, si el posteo es "enlace" (1200 × 630); con foto no | **Prueba de Meta: 2 posteos con enlace por mes para páginas que no pagan** (publicadores, exentos según prensa) | En el **primer comentario** o en el texto; botón de la página |
| Instagram | **No** (prueba sólo para Meta Verified) | No | — | **Link en la bio**; pegatina en historia (sólo a mano) |
| Telegram | Sí | Sí, configurable (`link_preview_options`) | No | En el texto o el pie |
| Bluesky | Sí (declarado aparte) | La arma quien publica | No | En el texto, con tarjeta |
| Threads | Sí | **Sólo en posteos de puro texto** (`link_attachment`) | No (hasta 5 enlaces) | En el texto del posteo de texto |
| YouTube Shorts | **No** en descripción ni comentarios (según prensa) | — | — | Video relacionado; enlaces del canal |
| X | Sí | Sí (sin confirmar) | **US$ 0,20 por posteo con URL** (13 veces más) | En una respuesta, o no ponerlo |
| TikTok | **No** (sin confirmar) | — | — | Biografía del perfil |
| WhatsApp canal | Sí (sin confirmar) | Sí (sin confirmar) | — | En el texto |

### 4.4 Historias, en vivo, comunidad

| Red | Historias por API | Pegatina de enlace por API | Otros formatos |
|---|---|---|---|
| Facebook | **Sí**, foto y video hasta 60 s | **No** | Reels, fotos, en vivo (sin confirmar) |
| Instagram | **Sí**, foto y video, 3 a 60 s | **No** (se pueden mencionar usuarios, sin pegatina) | Reels, carrusel, reel de prueba |
| Telegram | Sólo cuentas de empresa conectadas | — | Álbum, encuesta |
| Bluesky, Threads, X | **No existen** | — | Threads: encuestas |
| YouTube | No | — | Comunidad: sin API (sin confirmar) |
| TikTok | Historias en la app, sin API (sin confirmar) | — | Fotos |
| WhatsApp | "Estados": sin API (sin confirmar) | — | — |

## 5. Buenas prácticas con evidencia (y sus límites)

1. **Constancia antes que viralidad**: "los resúmenes de 30 a 60 segundos de lo mejor de la semana" y el video corto con texto en pantalla son los formatos más estables para redacciones locales (American Journalism Project, 2026). Encaja con nuestros repasos.
2. **El video social de un medio local es una herramienta de marca y fidelidad, no de visitas**: no se mide por clics (Local Media Association, 3/2026). Por eso conviene medir seguidores y alcance, y no solamente "visitas desde Instagram".
3. **Gancho en 8 a 10 segundos**; la parte más fuerte, temprano (Block Club Chicago y WyoFile, AJP 2026). Nuestros repasos arrancan con saludo y entrada: probar si lo primero que se oye es la noticia.
4. **Horarios**: el estudio de Buffer (52 millones de posts) sugiere miércoles y jueves entre semana y de 18 a 23 h; son medianas de engagement de marcas en general, **no de Argentina ni de noticias**. Los picos de nuestras propias visitas (10-11, 15-16, 21-23) mandan.
5. **Frecuencia**: Buffer sugiere 3 a 5 posteos de feed por semana y 1 a 2 historias por día para marcas. Nosotros somos un medio (más frecuencia es normal), pero conviene medir si 5 posteos más 3 reels por día funcionan mejor que menos.
6. **Originalidad**: Meta premia lo propio y deprioriza lo duplicado (13/3/2026). Mantener que cada pieza sea producida por el medio.
7. **Tono**: el de `CRITERIO-REDES.md` (vecino, sin exclamaciones). Sin estudio comparativo encontrado; se mantiene.
8. **Etiquetas de IA**: se avisa en el texto; marcar el campo propio donde exista (§ 2.4). Meta 2024 exige avisar si hay audio realista generado.
9. **Lo que no pude respaldar con un estudio citado**: la mejor hora y frecuencia en Telegram, Bluesky, Threads y X para medios locales; "los enlaces castigan el alcance" en X, Instagram y Facebook (sólo hay datos de uso: el 1,3 % de las vistas de Facebook en EE. UU. tenían enlace externo en el primer trimestre de 2026).

## 6. Hallazgos que hay que decidir antes de repensar las redes

| # | Hallazgo | Qué cambia | Qué hacer |
|---|---|---|---|
| 1 | **Meta prueba un tope de 2 posteos con enlace por mes a páginas que no pagan** (publicadores, exentos según prensa) | Nuestros 5 posteos por día llevan el enlace en el texto | **Mirar en la página si los enlaces de las últimas semanas se ven tocables**; si no, probar el enlace en el primer comentario; decidir si se paga Meta One o se vive sin enlace en Facebook. Preguntar a Meta (soporte de la página) si una página de medio de noticias es "publicador" |
| 2 | **El enlace de Instagram no se puede tocar** | Hoy escribimos la dirección larga con UTM en el pie | Cambiar el texto del espejo por "link en la bio" (sólo el texto; nada de código por ahora) |
| 3 | **TikTok no admite herramienta propia y pide sin marcas dentro del video** | Nuestra firma de la placa | Probar a mano con un video; si no hay problema, vía Buffer |
| 4 | **Threads: tarjeta de enlace sólo en posteos de texto** | Nuestro plan era reparto de video | Dos formatos en Threads: texto con enlace para notas, video para repasos |
| 5 | **X: US$ 0,20 si el texto lleva URL** | Plan de ayer: sin enlace | Sin enlace, o un posteo diario con enlace (US$ 6 por mes) |
| 6 | **YouTube Shorts sin enlaces tocables** | | Usarlo como marca y búsqueda; "radarbalcarce.com" dicho y en la placa |
| 7 | **Audio a 44,1 kHz** | Facebook documenta 48 kHz | Pasar a 48 cuando se toque `reel.mjs` |
| 8 | **Etiqueta de IA con campo propio** | | Marcar `is_ai_generated` (Instagram), `is_aigc` (TikTok), `containsSyntheticMedia` (YouTube) |
| 9 | **Bluesky: tope de imagen 1 o 2 MB** | | Achicar a menos de 1 MB para ir seguros (sin confirmar el valor actual) |
| 10 | **Hashtags en Instagram: tope de 5 anunciado** | Usamos 3 | Nada |

## 7. Propuesta para discutir (sin implementar)

### 7.1 Principios propuestos

1. **El mismo video** (cero audios nuevos) a las redes de video; en las de texto, además, **texto con enlace** para las notas.
2. **Una pieza que caduca no va a las redes donde el video queda** (clima de las 7, repaso de la mañana a YouTube y TikTok).
3. **El enlace según la red**: tocable donde existe, "link en la bio" donde no, ninguno donde cuesta.
4. **Las redes nuevas arrancan apagadas y simulando** (reglas ya propuestas en el plan: interruptor por red).
5. **Cantidad moderada por red**: Telegram todo; Bluesky, Threads y X los repasos y la efeméride; YouTube y TikTok sólo lo que sigue valiendo mañana.

### 7.2 Tabla: qué publicar en cada red

Leyenda de enlace: **T** tocable; **bio** "link en la bio"; **—** sin enlace; **$** con costo. Los textos son sugerencias en el tono de `CRITERIO-REDES.md`; ninguno nombra la fuente.

| Pieza | Red | Formato | Texto sugerido | ¿Link? |
|---|---|---|---|---|
| **Nota de Balcarce con foto** (hasta 5 por día) | Facebook | Foto 1080 × 1350 + texto | Titular + una frase + "Toda la nota acá:" + enlace + 2 o 3 hashtags | T (en el **primer comentario**, a probar; si no, en el texto) |
| | Instagram | Foto 4:5 (el espejo) | Lo mismo, pero "Nota completa: link en la bio" + crédito de foto | bio |
| | Telegram | Texto con vista previa grande (o foto + pie) | Titular + una frase + enlace | T |
| | Bluesky | Texto 300 caracteres + tarjeta de enlace | Titular corto + enlace (con tarjeta) | T |
| | Threads | Texto con `link_attachment` (tarjeta) | Titular + una frase + enlace | T |
| | X | Texto | Titular sin enlace; o 1 por día con enlace (US$ 6 por mes) | — / $ |
| | YouTube, TikTok | no | | |
| **Repaso de la mañana (10:00)** | Facebook e Instagram | Reel + historia | Como hoy; lista de notas con enlaces sólo en Facebook; en Instagram "Todo en radarbalcarce.com (bio)" | T (FB) / bio |
| | Telegram | Video (con sonido) | "Las noticias para arrancar el día." + lista | T |
| | Bluesky, Threads | Video | Una línea de resumen | — |
| | X | Video | Una línea | — |
| | YouTube, TikTok | no (caduca) | | |
| **Repaso de la tarde (15:00)** | Facebook e Instagram | Reel + historia | Como hoy | T / bio |
| | Telegram | Video en silencio | | T |
| | Bluesky, Threads, X | Video | Una línea | — |
| **Repaso de la noche (21:00)** | Facebook e Instagram | Reel + historia | Como hoy | T / bio |
| | Telegram | Video (con sonido) | | T |
| | **YouTube Short** | Video | Título: "El repaso del día en Balcarce" (< 100) + descripción con las notas sin enlaces tocables | — (dirección dicha) |
| | TikTok | Video (a mano o Buffer) | | bio |
| | Bluesky, Threads, X | Video | | — |
| **Un día como hoy (9:00)** | Facebook e Instagram | Reel + historia | Como hoy | bio |
| | Telegram (silencio), Bluesky, Threads, X, **YouTube, TikTok** | Video | "Un día como hoy, en Balcarce…" + hashtag #UnDíaComoHoy | — |
| **El feriado (8:00)** | Facebook e Instagram | Reel + historia | Como hoy | — |
| | Telegram, Bluesky, Threads, X, YouTube, TikTok | Video | | — |
| **Clima de la mañana (7:00) / de la noche (20:00)** | Instagram | Historia | Como hoy | — |
| | Facebook | Historia + reel | Como hoy | — |
| | Telegram | Video en silencio | | — |
| | Threads, Bluesky, X | **Opcional**: texto de 1 línea con la máxima, la mínima y la lluvia (sin voz) | "Hoy en Balcarce: 8° ahora, máxima 19°, sin lluvia." | — |
| **Farmacia de turno (19:00)** | Facebook e Instagram | Historia (en FB también reel) | Como hoy | — |
| | Telegram | Video con sonido | | — |
| | WhatsApp canal | **A mano**: video o texto | "Farmacia de turno: …" | — |
| **Aviso de clima** | Instagram y Facebook | Historia | Como hoy | — |
| | Telegram | Video con sonido | | — |
| | WhatsApp canal | A mano | | — |
| **Agenda (jueves)** | Facebook e Instagram | Reel + historia | Como hoy | T / bio |
| | Telegram, YouTube | Video | | — |
| | WhatsApp canal | A mano | | T |
| **Teléfonos útiles (sábados)** | Facebook e Instagram | Reel + historia | Como hoy | — |
| | Telegram, YouTube | Video | | — |
| | WhatsApp canal | A mano | | — |
| **Participá** (L a V 12:00) | Facebook e Instagram | Reel + historia | Como hoy | — |
| | Telegram | Video | | — |
| | WhatsApp canal | A mano | Con el número de WhatsApp | — |

### 7.3 Etiquetas de IA (propuesta)

Marcar donde existan: `is_ai_generated` (Instagram), `is_aigc` (TikTok), `containsSyntheticMedia` (YouTube); el aviso de texto sigue en todas.

### 7.4 Volumen por red (un día común, propuesta)

| Red | Posteos | Tipo | Gasto |
|---|---|---|---|
| Facebook | 5 fotos + 3 a 4 reels + 3 a 6 historias | | 0 |
| Instagram | 5 espejos + 3 a 4 reels + 3 a 6 historias | | 0 |
| Telegram | 5 notas + 7 a 8 videos | | 0 |
| Bluesky | 4 videos + 3 notas (opcional) | | 0 |
| Threads | 4 videos + 3 notas | | 0 |
| X | 4 videos o textos | sin enlace | ~US$ 1,80 por mes |
| YouTube | 2 (3 a 4 los días con agenda, útiles o feriado) | Shorts | 0 |
| TikTok | 2 | a mano | 0 |
| WhatsApp canal | 1 a 3 | a mano | 0 |

## 8. Qué se automatiza ya, qué cuesta y qué va a mano

| Red | Nivel | Costo por mes | Qué hace una persona (una vez) | Estado |
|---|---|---|---|---|
| Facebook | **A. API propia, gratis** | 0 | — | Andando |
| Instagram | **A.** | 0 | — | Andando |
| Telegram | **A.** | 0 | Crear bot con @BotFather y el canal; pegar el token en GitHub | A construir |
| Bluesky | **A.** | 0 | Crear la cuenta, confirmar el correo, crear la contraseña de aplicación | A construir |
| YouTube Shorts | **A.** | 0 | Crear el canal, el proyecto de Google Cloud, dejar la pantalla "En producción" y autorizar una vez; **prueba de "no listado → público"** | A construir |
| Threads | **A.** (con depósito R2 gratis) | 0 | Invitación de tester, token (se renueva solo cada 60 días) | A construir |
| X | **A., con costo** | ~US$ 2 (sin enlaces) a ~US$ 8 | Crear la app, cargar crédito con tope de gasto y marcar "automatizada" | Opcional |
| TikTok | **B. terceros** o **C. a mano** | 0 a 5 (Buffer) | Abrir cuenta en Buffer o publicar desde el celular | Pendiente de probar la firma |
| WhatsApp canal | **C. a mano** | 0 | Reenviar desde Telegram (20 segundos) | Sin vía oficial |
| Pinterest, LinkedIn | No | — | — | Descartadas |

**Correcciones a los planes de ayer**
- La duda sobre YouTube se achica: **la página oficial de hoy sigue diciendo que un proyecto no verificado no queda forzado a privado**; la prueba de 5 minutos sigue siendo la que lo confirma.
- WhatsApp: ahora hay una segunda evidencia oficial (el registro de cambios de la plataforma, hasta el 12/10/2026, sin ninguna mención a canales).
- Hay que **sumar al plan de Threads** que la tarjeta de enlace sólo existe en posteos de texto.
- **X**: el plan decía "US$ 0,20 con enlace": confirmado.
- Falta en los planes: **el tope de enlaces de Meta** (§ 3.1) y **el pedido de TikTok de no superponer marcas ni enlaces** (§ 2.4).

## 9. Lo que no pude confirmar

- Si Radar Balcarce es "publicador" para la prueba de enlaces de Meta; si el enlace **dentro de la foto del posteo** o **en el primer comentario** cuenta; si el tope ya nos afecta (se ve mirando la página).
- Si la **política de audio realista** de Meta de 2024 sigue igual en 2026 y si `is_ai_generated` aplica a reels y estados.
- Si el **tope de 5 hashtags** de Instagram está en el texto oficial y cómo se cuenta (pie + comentario).
- Si el **tope de 2 MB** de las imágenes de Bluesky es oficial y la miniatura de la tarjeta de enlace.
- **Duración, códec y resolución** de video de **TikTok** y **X** (la documentación no los da sin consultar la cuenta); **si los pies de TikTok y las descripciones de Shorts siguen sin enlaces tocables**.
- **Largo y duración** máximos en los **canales de WhatsApp**; si un enlace tiene vista previa.
- Si Facebook admite hoy álbumes y programar por API con las mismas credenciales (no se leyó).
- **Largo de título y descripción** de YouTube en la documentación actual; la ausencia de API de "comunidad".
- Estudios de **horarios y frecuencia** por red para un medio local en **Argentina**: no los encontré; el Informe de Noticias Digitales de Argentina 2026 dice en la ficha del país que "casi 8 de cada 10 se informan en línea" y que el 9 % usa chatbots, pero la tabla de plataformas
  (YouTube, Facebook, WhatsApp, Instagram) no se pudo leer; la edición 2025 (por una nota de Chequeado) citaba 38 % Facebook, 35 % Instagram y 12 % X, **sin confirmar contra el informe**.
- Cualquier dato de Pinterest y LinkedIn (de ayer).

## 10. Fuentes (leídas el 15 y 16/10/2026)

**Oficiales**
- Instagram, referencia de `IG User Media` (medidas de reels, historias, fotos, límites): https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media
- Instagram, publicación de contenido (límites, reels de prueba, IA): https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing
- Facebook, publicar reels: https://developers.facebook.com/docs/video-api/guides/reels-publishing
- Facebook, API de historias de página: https://developers.facebook.com/docs/page-stories-api
- Meta, "Premiar a los creadores originales en Facebook" (13/3/2026): https://about.fb.com/news/2026/03/rewarding-original-creators-on-facebook/
- Threads, publicar (actualizada 13/10/2026): https://developers.facebook.com/docs/threads/posts
- Threads, general: https://developers.facebook.com/docs/threads/overview
- WhatsApp, Cloud API y registro de cambios (hasta 12/10/2026): https://developers.facebook.com/docs/whatsapp/cloud-api/overview y https://developers.facebook.com/docs/whatsapp/cloud-api/changelog
- Telegram, Bot API: https://core.telegram.org/bots/api
- YouTube, `videos.insert`: https://developers.google.com/youtube/v3/docs/videos/insert
- YouTube, Shorts de tres minutos: https://support.google.com/youtube/answer/15424877
- X, precios (pago por uso): https://docs.x.com/x-api/getting-started/pricing
- X, límites de medios: https://docs.x.com/x-api/media/quickstart/best-practices y https://docs.x.com/x-api/media/introduction
- X, cómo se cuentan los caracteres: https://docs.x.com/fundamentals/counting-characters
- TikTok, publicación directa: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- TikTok, fotos: https://developers.tiktok.com/doc/content-posting-api-reference-photo-post
- TikTok, transferencia de medios: https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide
- TikTok, reglas de uso: https://developers.tiktok.com/doc/content-sharing-guidelines
- Informe de Noticias Digitales 2026, Argentina (Instituto Reuters): https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/argentina
- Bluesky, documentación de publicar: https://docs.bsky.app/docs/tutorials/creating-a-post (la raíz de la documentación redirige a otro dominio; los números de imagen y video salen de comunicados y de terceros)

**Prensa, blogs y estudios (leer con cuidado)**
- Tope de enlaces de Facebook: TechCrunch, 17/12/2025: https://techcrunch.com/2025/12/17/facebook-is-testing-a-link-posting-limit-for-professional-accounts-and-pages · Social Media Today (17/9/2026): https://www.socialmediatoday.com/news/facebook-pages-get-charged-for-link-posts/830743 · Social Media Examiner (5/2/2026): https://www.socialmediaexaminer.com/what-facebooks-new-link-rules-mean-for-your-2026-strategy/ · Newscast Studio (30/9/2026, no se pudo leer entera): https://www.newscaststudio.com/2026/09/30/meta-one-journalism-publishers/
- Enlaces en los pies de Instagram (prueba para Meta Verified): https://ppc.land/instagram-tests-clickable-links-in-post-captions-for-meta-verified-users/
- Tope de 5 hashtags en Instagram: https://hipertextual.com/internet/instagram-limite-cinco-hashtags-publicacion/
- Enlaces en Shorts: https://www.phonearena.com/news/youtube-shorts-blocks-clickable-links_id149677
- Imágenes de Bluesky: https://adaptlypost.com/blog/bluesky-image-size-limit
- Mejores horarios y frecuencia (Buffer): https://buffer.com/resources/when-is-the-best-time-to-post-on-instagram
- Video social en redacciones locales (American Journalism Project): https://theajp.org/reaching-new-audiences-six-approaches-to-social-video-in-local-newsrooms/
- Reels y medios locales (Local Media Association, 3/2026): https://localmedia.org/2026/03/why-reels-represent-a-major-opportunity-for-local-media/
- Contenido corto y engagement en 1.100 medios (ScienceDirect, 2026): https://www.sciencedirect.com/science/article/pii/S0040162526001459
- Tubular Labs, video de noticias en Latinoamérica: https://tubularlabs.com/blog/15-latam-insights-for-2026/
- Canales de WhatsApp sin API: https://getkanal.com/blog/whatsapp-channels-feature-guide.md y https://whapi.cloud/blog/whatsapp-channel-api-automation
- Plataformas de noticias en Argentina 2025 (Chequeado, sin fecha explícita): https://chequeado.com/?p=96716

**Del propio proyecto**: `redes/piezas.mjs`, `redes/meta.mjs`, `redes/elegir.mjs`, `redes/formatos.mjs`, `redes/destinos.mjs`, `redes/horarios.mjs`, `reels/reel.mjs`, `CRITERIO-REDES.md`, `FORMATOS.md`,
`PERFILES.md`, `web/data/estadisticas.json`, `docs/redes/PLAN-REELS-OTRAS-REDES.md`, `docs/redes/AUTOMATIZAR-REDES-ALTERNATIVAS.md`.
