# Redes 3.0: formatos, medidas y variables de todas las piezas

*3/11/2026. Etapa D (redes) del Radar 3.0. Es una **propuesta para corregir**, no está programada ni decidida. Parte de lo que Hernán decidió (`PLAN-RADAR-3-0.md`, § 3.9 y sección 10), de cómo suenan y se ven hoy las piezas (`CRITERIO-REDES.md`, `redes/piezas-del-dia.mjs`) y de la investigación del 16/10 (`docs/redes/FORMATOS-POR-RED.md`), más 18 búsquedas nuevas de hoy. Cada dato técnico lleva su fuente. Lo que sale de blogs de terceros o no se pudo confirmar en una página oficial está marcado **(sin confirmar)**: en este tema la mayoría de los números de "lo recomendado" son de blogs de marketing, no de las redes, y lo digo cada vez.*

## 0. Resumen en una pantalla

1. **Una sola regla de uniformidad:** todo lo vertical (reel, historia, tarjeta) se arma sobre **1080 × 1920** con **una sola zona segura** para el texto (la más exigente de todas las redes) y todo lo cuadrado/vertical de feed se arma sobre **1080 × 1350 (4:5)** con el título dentro del cuadrado central (así sirve también recortado a 1:1).
2. **Duraciones:** los repasos pasan a **3 notas y unos 30 segundos**; el clima queda como está (**15 a 20 s**); efeméride y notas, **un poco más breves** (**25 a 30 s**). Ninguna pasa de **40 s**, salvo la nota propia con video de Hernán (hasta 45 s). El tope duro es el de las historias de Meta: **60 s**.
3. **Subtítulos siempre.** En Facebook sobre todo se mira sin sonido (el dato más repetido es "85 %", pero es de 2016 y de un solo origen: sin confirmar); en TikTok, con sonido. Por eso la pieza tiene que entenderse con el sonido apagado y disfrutarse con él.
4. **Música:** sí, **muy baja**, sólo en piezas "de ánimo" (efeméride, feriado, Participá, publicidad propia, nota propia con video, carrusel); **no** en repasos, farmacia ni teléfonos útiles, y en el clima es opcional y a prueba. Sólo música con licencia que sirva **fuera de Meta** (usamos el mismo video en YouTube y TikTok). Ver § 1.3.
5. **Corrección importante al plan:** el plan dice "Instagram hasta 20 fotos" por carrusel. **La API de Instagram acepta hasta 10** (la app, no sé; la API, 10: fuente oficial en § 2.2). Todas las variables usan 10.
6. **Hallazgo sobre lo que hacemos hoy:** la firma y la barra de avance de nuestras placas están en la fila ~1478 de 1920, justo donde Instagram, Facebook, TikTok y Shorts ponen el texto del posteo y los botones. Con la zona segura universal hay que **subir la firma** (o aceptar que a veces quede tapada). Ver § 1.2 y pregunta 9.
7. **Instagram como espejo de Facebook:** propongo que **todo reel de Facebook sea también reel de Instagram** (hoy el clima sólo sale como historia). Es la decisión del 2/11; acá queda armada.
8. Las 8 redes quedan con sus medidas, cupos y horarios en § 2; las variables para programar, en § 3; ideas para llegar a **1.000 seguidores**, en § 4; las preguntas para Hernán, todas juntas, en § 5.

---

## 1. Lo común: una pieza, muchas redes

### 1.1 Reglas que valen para todas las piezas

| Regla | Valor propuesto | Por qué (fuente) |
|---|---|---|
| Video vertical | 1080 × 1920, 9:16, 30 cuadros/s, H.264, audio AAC **48 kHz** estéreo, `+faststart` | Facebook documenta AAC 48 kHz, 128 kbps o más, 24 a 60 cuadros, 1080 × 1920 recomendado (`docs/redes/FORMATOS-POR-RED.md` § 3.1, leído de la documentación de Meta el 16/10). Hoy el audio es 44,1 kHz: pasar a 48 al tocar `reel.mjs`. |
| Imagen de feed | 1080 × 1350 (4:5), JPEG sRGB, título y rostros dentro del cuadrado central de 1080 × 1080 | Instagram acepta de 4:5 a 1,91:1, sólo JPEG, 8 MB (`FORMATOS-POR-RED.md` § 3.2). Con el título en el cuadrado central, la misma imagen se recorta a 1:1 sin perder nada. |
| Foto de una nota | Siempre entera, nunca la tarjeta recortada, nunca con marca de agua; el crédito va en el epígrafe de la imagen y en el texto | Reglas de la casa (`CLAUDE.md`, `v3/redes/REGLAS.md` § 5). |
| Aviso de IA | «Voz generada con inteligencia artificial.» en el texto de toda pieza con voz; marcar el campo de IA donde exista | Regla 114 de la casa; los campos existen en Instagram (`is_ai_generated`), TikTok (`is_aigc`) y YouTube (`status.containsSyntheticMedia`), según `FORMATOS-POR-RED.md` § 2.4. |
| Compuerta de tono | Nada de muertes de menores, suicidios ni chicos graves en ninguna pieza de redes; lo bueno o resuelto de Balcarce va antes que lo trágico | R41 y decisión de Hernán del 2/11. |
| Una pieza por hecho | Nada de repetir una nota en dos piezas el mismo día (repaso o posteo, no los dos) | `CRITERIO-REDES.md` § 3. |
| Originalidad | Nunca reposteamos el video de otro medio; todo es propio | Meta prioriza lo original y baja el alcance de lo repetido (comunicado de Meta del 13/3/2026, citado en `FORMATOS-POR-RED.md` § 2.4). Los blogs repiten que Instagram también (sin confirmar): <https://www.eclincher.com/articles/how-the-instagram-algorithm-works-in-2026>. |

### 1.2 Zona segura universal (para texto, caras y cosas que importan)

**Qué es:** la parte del cuadro que no tapa la interfaz de ninguna red (nombre de la cuenta arriba; texto del posteo, nombre del audio y botones de "me gusta/comentar/compartir" abajo y a la derecha).

**Lo que dicen las fuentes (no hay medidas oficiales únicas; discrepan):**
- Instagram Reels: la cifra más citada es **270 px arriba, 672 abajo y 65 por lado** (14 %, 35 % y 6 %), presentada como de la guía de anuncios de Meta; otras guías dicen 250 arriba y 340 abajo. <https://www.hopperhq.com/blog/instagram-reel-size/>, <https://www.firstpier.com/resources/instagram-ad-safe-zones>. **(sin confirmar contra Meta)**
- Historias de Instagram: **250 arriba y 340 abajo** (la barra de respuesta). <https://moda.app/resources/sizes/instagram-story> (comunidad, no es una medida publicada por Meta).
- TikTok: no publica medidas fijas; dice que depende del largo del texto y del formato. Guías de terceros: 130 a 240 arriba, 480 a 660 abajo, 120 a 150 por lado. <https://affroom.com/blog/tiktok-safe-zone/>, <https://www.socialync.io/tools/safe-zones/tiktok>. TikTok entrega plantillas oficiales en su centro de ayuda de anuncios: **bajarlas antes de la primera prueba**.
- YouTube Shorts: un verificador propone **288 arriba, 672 abajo, 48 a la izquierda y 192 a la derecha**. <https://www.revid.ai/youtube-shorts-safe-zone>. Otra guía propone un cuadro universal de **900 × 1400** centrado. <https://reap.video/blog/short-form-video-safe-zones>. Todas coinciden en que son estimaciones de la comunidad y que cambian con la versión de la app.

**Mi propuesta (la más exigente de las que aparecen, para que valga en todas):**

| | Valor | Se aplica a |
|---|---|---|
| Arriba libre | **270 px** (filas 0 a 270) | texto crítico: nada |
| Abajo libre | **670 px** (filas 1250 a 1920) | texto crítico: nada. Se permiten fondos, la foto y la barra de avance, que si se tapan no pasa nada |
| Derecha libre | **190 px** (columnas 890 a 1080) | texto crítico: nada (botones) |
| Izquierda libre | **80 px** | márgenes de lectura |
| Caja de texto crítico | **x 80 a 890, y 270 a 1250** = 810 × 980 px | titulares, subtítulos, cifras, auspicio, llamado a la acción |
| Historias solas (tarjeta de nota, 9:16 sin voz) | 250 arriba, 340 abajo, 80 por lado | sólo cuando la pieza **no** se reparte como reel |

**Lo que cuesta:** hoy el cuerpo de las placas usa las filas 250 a 1480 (`CRITERIO-REDES.md` § 8) y la firma está en la 1478. Con esta zona, el cuerpo baja a 270-1250, el rasgo grande (año, temperatura) se achica y **la firma «Radar Balcarce · radarbalcarce.com» sube a la fila ~1200** (o queda abajo, en la zona de la interfaz, como adorno que no importa si se tapa, y *además* se dice en la voz). Pasa lo mismo que ya vimos con Teléfonos útiles (columna 960, fila 1330). Hernán: pregunta 9.

### 1.3 Música de fondo: ¿vale la pena?

**Mi recomendación: sí, pero poca, baja y sólo donde ayuda.** Fundamento:
- **Contra:** el medio es de noticias y servicio; la voz y el dato son lo central, la música compite con la comprensión, y cada pista es un riesgo de derechos. Nuestro cuadro ya tiene movimiento (entrada animada, barra).
- **A favor:** TikTok es una red "con sonido" (los blogs dicen más del 80 % con sonido; sin confirmar, <https://posteverywhere.ai/social-media-terms/sound-on-vs-sound-off>) y en Reels el sonido es mixto; una cama musical le da ritmo y "marca" a las piezas de ánimo, que son las que se parecen más a contenido de entretenimiento.
- **Cuánto:** la música va **15 a 20 dB por debajo de la voz mientras habla** (guías de mezcla: <https://www.overseeros.com/blog/background-music-volume-under-voiceover>, <https://vidpros.com/fix-background-music-too-loud-video/>); propongo **−18 dB** y que **suba 6 dB sólo en los dos segundos finales** (la placa de cierre), con **ducking** (se baja sola cuando habla). Volumen final de la mezcla: **−14 a −16 LUFS** integrado (YouTube normaliza cerca de −14; fuente de las guías: <https://voxbooster.com/blog/mix-voice-with-background-music>; **no hay norma publicada para Instagram ni TikTok**, sin confirmar). Probarlo siempre en un celular.
- **Cuándo sí / cuándo no:**

| Pieza | Música |
|---|---|
| Repasos (mañana, tarde, noche) | **No**: son informativos y la voz es la protagonista |
| Clima (todos) | **Opcional y a prueba**: Hernán quiere el clima como está; arrancar sin música y probar una cama suave una semana en una sola de las dos franjas |
| Clima auspiciado | Igual que el clima; la mención del auspiciante nunca queda debajo de música |
| Farmacia, teléfonos útiles, agenda | **No** (dato de servicio) |
| Efeméride, feriado | **Sí**, sobria (instrumental suave; tono más solemne en feriados patrios) |
| Participá, publicidad propia | **Sí**, más viva |
| Nota de Balcarce (reel) | **No** por defecto; **sí** si es una nota "de ánimo" (festejo, logro) |
| Nota propia con video de Hernán | **Sí**, si el video no tiene sonido propio importante; **no** si tiene ambiente que cuenta (el 1/11 era sin sonido) |
| Carrusel / modo foto en TikTok | **Sí** en TikTok (el modo foto va con música); en las demás redes, sin música |

- **De dónde sacarla y los derechos (lo más delicado):**
  - **Nunca** usar la biblioteca de música de Instagram o de TikTok en una cuenta de empresa: Meta dice que la música de su biblioteca "es para uso personal, no comercial" (<https://help.instagram.com/ipad-app/402084904469945>, vía resultado de búsqueda) y una cuenta que promueve un negocio cuenta como comercial. Tampoco canciones populares, aunque "suenen en todas".
  - **Meta Sound Collection**: tiene música liberada para uso comercial **pero sólo dentro de los productos de Meta** (Facebook e Instagram): <https://usethirdchair.com/blog/meta-sound-collection-explained-for-brands-and-rights-holders> (blog de terceros, sin confirmar contra los términos de Meta). Como reutilizamos el mismo mp4 en YouTube y TikTok, **no nos sirve sola**.
  - **YouTube Audio Library**, filtrando "sin atribución": libre para videos monetizables en YouTube; hay pistas "CC BY" que exigen crédito. Sobre si se puede usar fuera de YouTube hay versiones encontradas (sin confirmar): <https://www.vidiq.com/blog/post/royalty-free-music-youtube-audio-library>. **Leer los términos de YouTube antes de usarla en Facebook/TikTok.**
  - **Pixabay Music**: su licencia dice que se usa sin atribución, incluso comercialmente (<https://pixabay.com/service/faq/>); no se puede revender ni subir a otro sitio de música. Es la candidata principal por simpleza, pero algunas pistas pueden recibir reclamos automáticos (Content ID) en YouTube: por eso las pistas se prueban subiendo en privado a YouTube antes de usarlas en serie.
  - **Incompetech (Kevin MacLeod)**: licencia CC BY 4.0, **exige crédito** (sin confirmar contra su sitio).
  - **Regla propia:** una carpeta `redes/musica/` con cada pista, **la captura de la licencia el día que se bajó**, la URL y la fecha, y un archivo `LICENCIAS.md`. Sin ese registro, la pista no se usa. Máximo 6 pistas en rotación para que suene como "la música de Radar".
  - Sobre derechos de autor en Argentina (SADAIC, AADI-CAPIF) **no investigué**: si las pistas son de licencia libre y están registradas, no debería aplicar; si alguna vez se usa música comercial con permiso, lo ve alguien que entienda de eso.

### 1.4 Subtítulos, gancho y cierre (valen para todas las piezas con voz)

- **Subtítulos:** siempre, quemados en la imagen, dentro de la caja de texto crítico, centrados abajo de la caja (filas ~1000 a 1200), **máximo 2 líneas y 32 caracteres por línea**, una frase por vez, blanco sobre franja oscura semitransparente. Motivo: se mira mucho sin sonido; los números de completar el video con subtítulos son de proveedores (66 % → 91 %, **sin confirmar**): <https://blog.mean.ceo/?p=11554>.
- **Gancho de los primeros 3 segundos** (ya está en la regla 301 de la casa: "8 palabras o menos"): la **imagen** también tiene que prometer algo en el segundo 0 (el rasgo grande: la temperatura, el año, el titular), no sólo la voz. Los blogs coinciden en que los primeros segundos deciden si la gente se queda (<https://klap.app/blog/how-long-should-reels-be>, sin confirmar con Instagram). Instagram dice que los tres ejes de ranking de Reels son tiempo de reproducción, "me gusta" y **envíos** (Mosseri, enero de 2025, según prensa: <https://www.eclincher.com/articles/how-the-instagram-algorithm-works-in-2026>).
- **Cierre y llamado a la acción:** una sola acción por pieza. Reels: «Todo en Radar Balcarce punto com» (repasos, siempre; las demás, 1 de cada 3 como hoy) y, **en las piezas "para mandar" (clima, farmacia, útiles, agenda), «Mandáselo a alguien»**: los envíos son una señal fuerte de Instagram. En las piezas de Participá, el llamado *es* la pieza.
- **Duración total = voz + 1,65 s de adorno** (valor de hoy, `PODCAST_VOZ.segundosDeAdorno`), con 2,5 palabras por segundo (regla de hoy).

### 1.5 Las piezas, una por una

Convenciones: *Rep.* = qué formato es; *Dur.* = objetivo / máximo en segundos; *Esc.* = escenas (tiempo de cada una); *Voz* = quién habla (el reparto de hoy está en `CRITERIO-REDES.md` § 6: locutora y locutor, alternan por pieza). El horario es el de Balcarce, tomado del cronograma de la sección 10 del plan.

**Sobre las duraciones:** no hay una cifra oficial. Los blogs recomiendan entre 15 y 60 segundos y se contradicen (Instagram: 7-15, 15-30 y 45-60 según el autor: <https://klap.app/blog/how-long-should-reels-be>, <https://www.go-viral.app/blog/instagram-reels-length/>; Facebook: 15-30 s: <https://socialbee.com/blog/how-long-can-a-facebook-reel-be/>; Shorts: 45-90 s, estimación de un blog, y el máximo de 3 minutos es oficial desde el 15/10/2024: <https://www.socialmediatoday.com/news/youtube-expands-3-minute-shorts-to-all-users/736967/>). Lo único firme: el tope de **60 s en las historias de Meta** (`FORMATOS-POR-RED.md` § 3.1 y 3.2) y que la retención importa más que el largo. Por eso elijo **el largo que le toca al contenido**, con Hernán pidiendo menos: 15 a 20 el clima (ya funciona), ~30 las que cuentan algo.

| # | Pieza | Formato | Dur. (objetivo / máx.) | Voz | Música | Sale |
|---|---|---|---|---|---|---|
| 1 | Clima de la mañana | reel 9:16 + historia (mismo video) | 18 / 22 | locutora | opcional (prueba) | 7:00 |
| 2 | Clima de la noche | reel 9:16 + historia | 18 / 22 | locutora | opcional (prueba) | 20:00 |
| 3 | Clima auspiciado | igual que el clima, +4 s de mención | 22 / 26 | la del clima | no sobre la mención | las mismas horas, los días reservados |
| 4 | Repaso de la mañana | reel + historia | 30 / 38 | locutor | no | 10:00 |
| 5 | Repaso de la tarde | reel + historia | 30 / 38 | locutora | no | 15:00 |
| 6 | Repaso de la noche | reel + historia | 30 / 38 | locutor | no | 21:00 |
| 7 | Un día como hoy | reel + historia | 28 / 35 | locutora | sí, sobria | 9:00 |
| 8 | Farmacia de turno | reel + historia | 14 / 20 | locutor | no | 19:00 |
| 9 | Nota de Balcarce (reel) | reel 9:16 | 25 / 35 | alterna | no (sí si es de ánimo) | cuando se publica (máx. 2 por día) |
| 10 | Nota propia | según lo que mande Hernán: reel con voz, reel con su video, posteo, carrusel | 35 / 45 (con su video: 20 / 30) | locutora o locutor | sí si es video sin sonido | cuando Hernán dice «ok» |
| 11 | Posteo de nota | imagen 4:5 (1080 × 1350) con foto entera + texto | — | — | — | 8:00 a 22:00, cada 90 min |
| 12 | Historia de nota | imagen 9:16 (1080 × 1920) con la tarjeta de la nota | se ve ~5 s por pantalla (**sin confirmar**) | no | no | al publicarse una nota de Balcarce |
| 13 | Carrusel | 3 a 10 fotos 4:5, portada primero | — | no | sólo TikTok | cuando una nota tiene 3 fotos propias o más |
| 14 | Participá (4 variantes) | reel + historia | 18 / 25 | alterna | sí, más viva | 12:00, lun a vie |
| 15 | Publicidad propia | reel + historia | 18 / 25 | locutora | sí | 1 vez por semana (a definir) |
| 16 | Feriado | reel + historia | 20 / 28 | locutora | sí, sobria | 8:00, sólo feriados |
| 17 | Agenda del jueves | reel + historia | 22 / 30 | locutora | no | jueves 12:00 |
| 18 | Teléfonos útiles | reel + historia | 18 / 25 | locutor | no | sábado 17:00 |

(Las filas 17 y 18 ya existen hoy y no están en la lista del pedido; las dejo para que el documento sea completo. Los avisos de clima por helada, granizo o viento siguen como hoy: sólo historia, 10 a 15 s.)

#### Escenas, texto en pantalla, gancho y cierre de cada una

Palabras por escena = segundos × 2,5. «Texto» es lo máximo que se lee en pantalla *además* de los subtítulos.

**1 y 2. Clima (mañana / noche)** — *tocar poco, como pidió Hernán.* Escenas: (a) 0-3 s saludo + temperatura de ahora en el rasgo grande (**el gancho es el número**); (b) 3-9 s comentario del día (frío, lluvia, viento…); (c) 9-14 s máxima, mínima y lluvia (3 datos, íconos); (d) 14-18 s cierre cálido + firma. Texto: 3 cifras y 1 línea. Cierre: «Que tengan un buen día» / «Que descansen» (como hoy); llamado: «Mandáselo a alguien que salga temprano» (a probar). Color: Clima `#4A5D8F`. Se agrega la nota del clima (web) con su enlace (`radarbalcarce.com/clima`) en el texto del posteo.

**3. Clima auspiciado** — igual que el clima, con una escena más entre (c) y (d): 14-18 s **«El clima de hoy llega con [comercio]; los encontrás en Instagram como [@cuenta]»** (voz) y en la placa un rótulo fijo **«Auspicia: [comercio] · [@cuenta]»** (texto, ≥ 44 px, dentro de la caja de texto crítico). Lo pone después de los datos (para no demorar lo que la gente vino a buscar) y antes del cierre. El texto del posteo repite «Auspicia: [comercio] · [@cuenta]». Un solo auspiciante por clima (calendario de la sección 10 del plan). Si la cuenta no existe en Instagram, se dice la red que corresponda.

**4, 5 y 6. Repasos (máximo 3 notas, al menos 1 de Balcarce)** — 30 s:
(a) 0-3 s gancho: saludo de la franja + «tres noticias» (imagen: rótulo del repaso + "3 noticias", color rojo de marca); (b) 3-11 s nota 1 (foto, "1 de 3", titular grande; ~20 palabras de voz); (c) 11-19 s nota 2; (d) 19-27 s nota 3; (e) 27-30 s cierre: lista de los tres titulares (que es también la **tapa del reel**) + «Todo en Radar Balcarce punto com». Texto: titular de cada nota (máx. 90 caracteres) y la sección en su color. Orden: **lo de Balcarce primero y lo bueno antes que lo trágico** (decisión del 2/11). Sin repetir notas de los repasos del día ni de los dos anteriores. Sin música.
Por qué 3: Hernán citó la recomendación de que "dure poco todo"; con 4 notas hoy el video llega a 55 s, que pega justo en el límite de la historia (60 s).

**7. Un día como hoy** — 28 s: (a) 0-3 s el año en grande y «Un día como hoy, hace N años» (gancho); (b) 3-19 s el hecho (dos pantallas, una con la imagen de archivo o la ilustración); (c) 19-25 s por qué importa o el dato de Balcarce; (d) 25-28 s cierre + firma. Texto: año + 2 líneas. Música sobria. Color: Cultura `#9D2C8F` (Balcarce `#B91C1C` si es local). Si el día tiene una efeméride principal y otras tres (como hoy), **sólo se cuenta la principal en el video y las otras quedan en la nota web** (pregunta 5).

**8. Farmacia de turno** — 14 s: (a) 0-3 s «Farmacia de turno esta noche» + nombre de la farmacia (gancho); (b) 3-10 s dirección dicha y escrita grande (sin "N°"); (c) 10-14 s «Guardá el dato» + firma. Texto: nombre y dirección. Sin música. Color: Farmacias `#13804A`. Se fija además en el canal de Telegram.

**9. Nota de Balcarce (reel)** — 25 s: (a) 0-3 s el titular en grande sobre la foto; (b) 3-20 s el hecho en 3 frases, con 1 a 3 fotos de la nota con su crédito abajo; (c) 20-25 s «La nota completa, en Radar Balcarce punto com». Máximo 2 por día (las mejores de Balcarce con foto buena); las demás, posteo e historia. Pasa por la compuerta de tono.

**10. Nota propia (las que Hernán manda por Telegram)** — el bot ofrece botones (sección 10 del plan): *Todo* (posteo con foto + historia + reel con voz), *Posteo e historia*, *Sólo la web*. La pieza se arma así:
- **Reel con voz:** 35 s como máximo 45: (a) 0-3 s titular + la foto más fuerte; (b) 3-30 s el hecho con las fotos de Hernán (una por 4-6 s); (c) 30-35 s «La nota completa, en Radar Balcarce punto com» + **firma «Hernán Accomo»** en la placa. El bot muestra el guion antes y nada sale sin su «ok».
- **Reel con video propio:** 20 a 30 s: el video de Hernán (sin sonido) con el título y la firma sobre él los primeros 4 s, texto breve cuando cambia de plano y la **placa final de papel** de 3 s (como la del 1/11). Música sí.
- **Posteo:** foto 4:5 + título + 2 líneas + enlace + hashtags. **Carrusel** si hay 3 fotos o más (§ 1.5, fila 13). **Historia:** tarjeta 9:16.
- **Si no contesta en una hora:** posteo e historia (lo seguro), sin reel.
- Siempre el aviso «Voz generada con inteligencia artificial.» si hay voz, y la firma «Hernán Accomo».

**11. Posteo de nota** — imagen 1080 × 1350 con la foto entera; en el texto: título + 2 líneas + enlace + `#Balcarce #RadarBalcarce` + 1 a 3 de la nota + crédito de la foto (regla 281). 5 de Balcarce + 5 nacionales por día, ≥ 90 min entre uno y otro, máx. 3 nacionales de una misma sección, como ya decidió Hernán.

**12. Historia de nota** — imagen 1080 × 1920 con la zona segura de historias (250 / 340): foto arriba (~60 % del alto), titular grande, sección en su color, firma abajo. **La API no permite poner el sticker de enlace** (`FORMATOS-POR-RED.md` § 3.2 y 3.1); por eso el texto de la historia dice «Nota completa: link en la bio» y la bio de Instagram lleva siempre `radarbalcarce.com`. Una historia por cada nota de Balcarce; máximo 6 por día (**sin confirmar** que más cansen: medir).

**13. Carrusel** — la portada primero (la foto más fuerte con el título); luego las fotos de la nota, una por tarjeta, todas del mismo tamaño 1080 × 1350 (Instagram recorta todas a la proporción de la primera: `FORMATOS-POR-RED.md` § 3.2), la última con «La nota completa, en radarbalcarce.com». Cantidad: **entre 3 y 8; techo 10** por la API de Instagram (<https://developers.facebook.com/docs/instagram-platform/content-publishing>: "hasta 10 identificadores de contenedores"). Los blogs dicen que lo que mejor rinde son 6 a 10 diapositivas, con base en un estudio de 2020 (<https://www.socialinsider.io/data-geeks/Instagram-Carousel-Study.pdf>, sin confirmar); no se rellena para llegar: una tarjeta de relleno hace que la gente abandone.

**14. Participá** — hoy son tres más una general; Hernán pide que **inviten de verdad** y que haya más de tres si hace falta. Estructura de las cuatro (18 s): (a) 0-3 s **una pregunta o un caso real** (gancho: «¿Viste algo en la calle?»); (b) 3-11 s un ejemplo nuestro («nos mandaron esto, hicimos la nota» con una captura de la nota real); (c) 11-16 s **cómo mandarlo**: «Escribinos por WhatsApp al 2266 51-1612» en la franja verde WhatsApp `#0F5132` con el número grande; (d) 16-18 s «Con tu foto o tu audio alcanza» + firma. Variantes: Tu noticia, Tu evento o emprendimiento, Tu reclamo, Tu nota, y sumo dos que propongo: **«Tu foto del día»** (la foto más linda de Balcarce de la semana) y **«¿Qué querés que contemos?»** (encuesta). Ver § 4.

**15. Publicidad propia** — animación ya hecha, sin voz (la vio Hernán), con la estética del sitio y los precios visibles. Antes de usarla en redes: sumar voz, que el texto sea «ameno, como el del media kit» y sacar los precios del video si no se quieren públicos (pregunta 12). 18 s: (a) 0-3 s «¿Tenés un comercio en Balcarce?»; (b) 3-12 s qué incluye; (c) 12-18 s a dónde escribir. Una vez por semana, en el día de menos tránsito de noticias (domingo, a definir).

**16. Feriado** — 20 s: (a) 0-3 s la fecha y el nombre del feriado (gancho); (b) 3-16 s qué se conmemora (un solo dato verificado, tono sobrio); (c) 16-20 s cierre + firma. Color: Feriados `#1E3A6E`.

**17 y 18. Agenda del jueves, Teléfonos útiles** — como hoy (`CRITERIO-REDES.md` § 3): agenda 22 s (la primera actividad con día y lugar + «la agenda completa en Radar Balcarce punto com»); teléfonos 18 s en dos pantallas («Emergencias y salud» / «Municipio y servicios»), **la voz dice exactamente lo que se ve** (regla 324).

---

## 2. Por red

### 2.1 Cuadro de decisiones por red

| | Facebook | Instagram | TikTok | YouTube Shorts | X | Threads | Bluesky | Canal de Telegram |
|---|---|---|---|---|---|---|---|---|
| **Vía** | API de Meta (andando) | API de Meta (andando) | Buffer (revisión de app pendiente) | Buffer hasta que aprueben la API; luego API | Buffer | API de Meta (a configurar) | API (contraseña de aplicación) | Bot API |
| **Reels / video** | sí, todos | sí, todos | sí, los de ánimo e informativos (sin farmacia/útiles/agenda) | sí, 6 por día como techo | sí (video adjunto) | sí | sí | sí |
| **Historia** | sí | sí | no existe | no existe | no | no | no | no |
| **Posteo de nota** | sí, 10 por día | espejo opcional | no | no | cada nota de Balcarce + lo más contado | ídem X | ídem X | cada nota de Balcarce |
| **Carrusel** | álbum | hasta 10 | modo foto | no | hasta 4 | hasta 10 (la API admite 20) | hasta 4 | álbum 2 a 10 |
| **Enlace tocable** | sí en el texto | **no** (link en la bio) | **no** (link en la bio) | **no** (se dice la dirección) | sí (sale caro) | sí | sí (hay que declararlo) | sí, con vista previa |

### 2.2 Ficha por red

**Facebook (página «Radar Balcarce»)**
- *Medidas:* reel e historia 1080 × 1920 (mín. 540 × 960), 24 a 60 cuadros, AAC 48 kHz; foto de posteo 1080 × 1350; tarjeta de enlace 1200 × 630 (<https://developers.facebook.com/docs/graph-api/> según `FORMATOS-POR-RED.md` § 3.1, leído el 16/10).
- *Duración:* reel de 3 a 90 s según la documentación leída el 16/10; algunos blogs dicen que Meta ya no tiene tope (sin confirmar). **Historia: máximo 60 s.** Óptima propuesta: 15 a 35 s. Los blogs dicen "bajo 30 s rinde más" (sin confirmar, no es de Meta): <https://socialbee.com/blog/how-long-can-a-facebook-reel-be/>.
- *Zona segura:* la universal (§ 1.2).
- *Cuántas por día:* 10 posteos (5 Balcarce + 5 nacionales), 6 reels de rutina + los de notas, historias del día. El límite de la API es de 30 reels cada 24 h (`FORMATOS-POR-RED.md` § 3.1): sobra.
- *Horarios:* los del cronograma (7, 8 feriados, 9, 10, 12, 15, 17 sáb., 19, 20, 21); posteos de 8 a 22 con 90 min de separación.
- *Texto:* título + 2 líneas + enlace + hashtags; sólo se ven unas líneas antes de «Ver más», así que lo importante va primero. **Enlace sí**, pero Meta prueba un tope de 2 posteos con enlace por mes para páginas que no pagan (los "publicadores" estarían exentos, sin confirmar si nos cuentan): **revisar en la página si se ven tocables** y, si no, poner el enlace en el primer comentario (`FORMATOS-POR-RED.md` § 3.1 c).
- *Hashtags:* `#Balcarce #RadarBalcarce` + hasta 3.
- *Álbum:* varias fotos de la nota propia (3 o más); la API existe pero no la leí hoy (sin confirmar).
- *Toma de lo común:* todo (filas 1 a 18).

**Instagram (`@radarbalcarce`)**
- *Medidas:* reel e historia 9:16, ancho ≤ 1920, AAC ≤ 48 kHz, 23 a 60 cuadros; foto de feed 1080 × 1350 JPEG hasta 8 MB, relación de 4:5 a 1,91:1 (`FORMATOS-POR-RED.md` § 3.2, documentación de Meta leída el 16/10).
- *Duración:* reel de 3 s a 15 min; **historia 3 a 60 s**, 100 MB. Óptima propuesta: 15 a 35 s. (Los blogs hablan de un cambio a 20 minutos y de que lo óptimo es 7-15, 15-30 o 45-60 s según el autor: sin confirmar, ver § 1.5.)
- *Carrusel:* **hasta 10** fotos o videos por API (<https://developers.facebook.com/docs/instagram-platform/content-publishing>, "hasta 10 identificadores"). **El plan decía 20: corregido.** Si Meta lo sube en la API más adelante, la variable `CARRUSEL_MAX_INSTAGRAM` lo cambia sin tocar el programa.
- *Cuántas por día:* la API deja 100 posteos cada 24 h (<https://developers.facebook.com/docs/instagram-platform/content-publishing>, versión de 30/6/2026; antes decía 50): sobra. Propongo 6 reels + historia de cada reel + hasta 6 historias de notas.
- *Texto:* pie hasta 2.200 caracteres; **los enlaces no se tocan**: se dice «link en la bio» y la bio lleva `radarbalcarce.com`. Hashtags: Instagram anunció en diciembre de 2025 un tope de **5** (prensa, sin confirmar): usamos 5 como máximo.
- *Zona segura:* la universal; para historias solas, 250 / 340.
- *Colaboradores:* hasta 3 por posteo (no en historias): útil para notas sobre comercios (el comercio aparece también en su perfil): ver § 4.
- *Toma de lo común:* todo; el espejo de posteos de Facebook sólo si Hernán lo quiere (el cronograma dice "sólo si lo quieren"). **Propuesta: sí, 5 por día de las de Balcarce**, para sumar seguidores (pregunta 3).

**TikTok**
- *Medidas:* 9:16, 1080 × 1920, MP4/MOV/WebM, H.264. Modo foto: hasta 35 fotos por URL pública, título de 90 y descripción de 4.000 caracteres (`FORMATOS-POR-RED.md` § 3.8, documentación de TikTok leída el 17/10).
- *Duración:* la fija cada cuenta (`max_video_post_duration_sec`). Óptima propuesta: 15 a 30 s.
- *Zona segura:* TikTok no publica medidas fijas; usamos la universal y **bajamos las plantillas oficiales** del centro de ayuda de anuncios antes de la primera prueba (<https://affroom.com/blog/tiktok-safe-zone/>).
- *Cuántas por día:* unas 15 publicaciones diarias es su tope por cuenta (`spam_risk_too_many_posts`); usamos **hasta 4**.
- *Texto:* hasta 2.200 caracteres; **el enlace no se toca**; va «más en radarbalcarce.com (link en la bio)». Hashtags 3 a 5.
- *Vía:* **Buffer**; la publicación directa exige que TikTok revise la app, y mientras no la aprueban todo queda privado y a máximo 5 usuarios por día (`FORMATOS-POR-RED.md` § 3.8). Lo que Buffer permite en fotos y carruseles no pude confirmarlo en su ayuda (los blogs de otras herramientas dicen que algunos programadores sí): **probar con una cuenta de prueba antes de prometerlo**.
- *Aviso:* TikTok pide no tapar el video con marcas o textos promocionales; nuestra firma discreta podría caer ahí (sin confirmar): **primera prueba a mano**. Marcar `is_aigc`.
- *Toma de lo común:* filas 1-3, 4-6, 7, 9, 10, 14 (Participá sí: es muy "de TikTok"), 16 y el carrusel como modo foto. No: farmacia, útiles, agenda.

**YouTube Shorts**
- *Medidas:* vertical o cuadrado, hasta **3 minutos** (desde el 15/10/2024: <https://www.socialmediatoday.com/news/youtube-expands-3-minute-shorts-to-all-users/736967/>). Título hasta 100 y descripción hasta 5.000 (sin confirmar).
- *Duración óptima:* 20 a 40 s (un blog dice 45-90 s; ningún dato propio todavía).
- *Zona segura:* la universal (YouTube es la que más lado derecho pide: 192 px, <https://www.revid.ai/youtube-shorts-safe-zone>).
- *Cuántas por día:* el cupo gratis es de 10.000 unidades por día y **cada subida cuesta 1.600 → 6 Shorts por día es el techo** (cuenta del plan, sección 10 del 1/11). Propongo **4 por día**: clima mañana, repaso de la mañana, efeméride y repaso de la noche; el feriado entra reemplazando al clima de la noche si hace falta.
- *Texto:* título «<pieza> · Radar Balcarce», descripción con la lista de titulares y «Más en radarbalcarce.com». **Los enlaces de la descripción de un Short no son tocables**: se dice la dirección. Hasta 3 hashtags se muestran arriba del título; si hay más de 60, YouTube ignora todos (<https://support.google.com/youtube/answer/6390658>).
- *Vía:* Buffer ahora; la API (YouTube Data API v3) cuando aprueben la auditoría de cumplimiento y el pedido de cupo. En la API, la app tiene que estar «En producción» o el permiso vence a los 7 días, y sin la auditoría los videos suben privados (sección 10 del plan).
- *Listas de reproducción:* Clima, Repasos, Un día como hoy. Marcar `containsSyntheticMedia`.

**X**
- *Medidas:* hasta 4 fotos (JPG/PNG/WEBP, 5 MB) o 1 video (0,5 s a 20 min, 8 GB); texto 280 caracteres, cada enlace cuenta 23 (`FORMATOS-POR-RED.md` § 3.7, `docs.x.com` leído el 16/10).
- *Costo:* US$ 0,015 por posteo; **US$ 0,20 si lleva enlace** (la API, directo). Vía **Buffer** el costo es el del plan de Buffer (no verificado), pero X puede aplicar igual su política.
- *Cuántas por día:* el plan dice 10 a 15; **hay que medir el tope mensual antes de prometerlo**. Propongo arrancar con **5 al día**: los 3 repasos (un posteo con los 3 titulares) y las 2 mejores notas de Balcarce.
- *Texto:* titular + enlace (+ `#Balcarce #RadarBalcarce`). La tarjeta la arma X con las etiquetas `og:` de la nota. Hilo: el repaso como 1 posteo + 3 respuestas (opcional).
- *Zona segura:* no aplica a posteos de imagen; si se adjunta el reel, la universal.
- *Toma de lo común:* imagen de la nota (11), reels de ánimo, repasos como texto.

**Threads**
- *Medidas:* texto 500 caracteres; foto JPEG/PNG de hasta 8 MB, ancho 320 a 1440; video de hasta 5 min y 1 GB; carrusel de 2 a 20; una sola «etiqueta de tema» (`FORMATOS-POR-RED.md` § 3.5, documentación de Meta leída el 17/10). Hasta 250 posteos por API por día.
- *Enlaces:* tocables, hasta 5; **la tarjeta de enlace sólo sale en posteos de puro texto**.
- *Cuántas por día:* 5 a 8, sin apuro.
- *Texto:* titular + enlace en posteo de texto; la etiqueta de tema `Balcarce` va en su campo, no en el texto.
- *Toma de lo común:* igual que X.
- *Vía:* API de Meta (la misma app); hace falta la invitación de «tester» hasta que Meta apruebe, y renovar el token cada 60 días.

**Bluesky**
- *Medidas:* texto 300 caracteres (grafemas); hasta 4 fotos (tope por foto 1 a 2 MB, sin confirmar); 1 video de hasta 3 min y 100 MB (`FORMATOS-POR-RED.md` § 3.4).
- *Enlaces:* tocables pero **declarados aparte** (el programa los arma); la tarjeta con imagen la arma quien publica.
- *Cuántas por día:* igual que Threads.
- *Toma de lo común:* igual que X.
- *Vía:* API con «contraseña de aplicación», sin revisión.

**Canal de Telegram**
- *Medidas:* texto hasta 4.096 caracteres; foto y video con pie de hasta **1.024**; fotos hasta 10 MB; video de bots hasta 50 MB; **álbum de 2 a 10 elementos** (<https://core.telegram.org/bots/api/methods/sendmediagroup.md>; el resto: <https://core.telegram.org/bots/api>, leído el 17/10).
- *Enlaces:* tocables, con vista previa configurable. **Es la red donde el enlace llega entero.**
- *Cuántas por día:* una por cada nota de Balcarce (sin tope), más las piezas de servicio. Los mensajes con sonido sólo para el repaso de la mañana, la farmacia y el repaso de la noche (`disable_notification` en el resto).
- *Mensaje fijado:* el clima y la farmacia del día (se reemplaza cada día).
- *Texto:* titular + bajada corta + enlace. El pie de una foto va hasta 1.024.
- *Toma de lo común:* todo, en texto + imagen; el reel para los repasos y el clima.

### 2.3 Horarios consolidados (hora de Balcarce; base: cronograma de la sección 10 del plan)

| Hora | Pieza | FB | IG | TikTok | YouTube | X / Threads / Bluesky | Telegram |
|---|---|---|---|---|---|---|---|
| 7:00 | Clima de la mañana | reel | reel + historia | sí | Short | imagen + enlace | texto + imagen |
| 8:00 (feriados) | Feriado | reel | reel + historia | sí | Short | imagen + enlace | texto |
| 9:00 | Un día como hoy | reel | reel + historia | sí | Short | imagen + enlace | texto |
| 10:00 | Repaso de la mañana | reel | reel + historia | sí | Short | 3 titulares | 3 titulares |
| 12:00 | Participá (lun a vie) / Agenda (jue) | reel | reel + historia | Participá sí | — | Agenda del jueves | Agenda |
| 15:00 | Repaso de la tarde | reel | reel + historia | sí | — | 3 titulares | 3 titulares |
| 17:00 (sáb.) | Teléfonos útiles | reel | reel + historia | — | — | — | texto |
| 19:00 | Farmacia | reel | reel + historia | — | — | texto | texto + fijado |
| 20:00 | Clima de la noche | reel | reel + historia | sí | — | imagen + enlace | texto + imagen |
| 21:00 | Repaso de la noche | reel | reel + historia | sí | Short | 3 titulares | 3 titulares |
| 8:00 a 22:00 | Posteos de notas | 10 | espejo de Balcarce | — | — | cada nota de Balcarce | cada nota de Balcarce |

(Cambios respecto del borrador: el repaso de la tarde y el clima de la noche **no** van a YouTube para quedar en 4 Shorts al día, y Participá **va a TikTok**. Todo corregible.) Si una pieza pasa a salir antes de las 7 o después de las 23, hay que tocar también el reloj (`infra/reloj-cloudflare/`, `HORAS_REDES_UTC`), como dice `redes/piezas-del-dia.mjs`.

**Mejores horarios (con cuidado):** los estudios grandes de Buffer (52 millones de posteos) dan jueves 9:00, miércoles 12:00 y 18:00 como mejores momentos de Instagram, y los viernes y sábados flojos; son datos de marcas, no de un pueblo (`FORMATOS-POR-RED.md` § 3.1 f). Las visitas de Balcarce se concentran entre las 10-11, 15-16 y 21-23 (`FORMATOS-POR-RED.md` § 2.3, 15/10): **por eso los horarios de los repasos no se mueven sin medir**.

---

## 3. Las variables (la referencia para programar)

*Nombre en MAYÚSCULAS con guiones bajos. «Origen» dice de dónde sale el valor: **hoy** = ya está en el código (se conserva o se mueve), **propuesto** = de este documento, **API** = límite de la red, **a medir** = se ajusta con números.*

### 3.1 Generales

| Variable | Valor | Unidad | Origen |
|---|---|---|---|
| `PALABRAS_POR_SEGUNDO` | 2,5 | palabras/s | hoy (`CRITERIO-REDES.md` § 5) |
| `SEGUNDOS_DE_ADORNO` | 1,65 | s | hoy (`PODCAST_VOZ.segundosDeAdorno`) |
| `VIDEO_ANCHO` / `VIDEO_ALTO` | 1080 / 1920 | px | API de Meta |
| `VIDEO_CUADROS` | 30 | cuadros/s | hoy |
| `VIDEO_AUDIO_HZ` | 48000 | Hz | API de Meta (hoy 44100) |
| `VIDEO_AUDIO_KBPS` | 160 | kbps | hoy |
| `IMAGEN_FEED_ANCHO` / `IMAGEN_FEED_ALTO` | 1080 / 1350 | px | API de Instagram |
| `IMAGEN_CUADRADA_LADO` | 1080 | px | derivada del 4:5 |
| `IMAGEN_TARJETA_ENLACE` | 1200 × 630 | px | API de Facebook |
| `IMAGEN_PESO_MAX_MB` | 8 | MB | API de Instagram |
| `AVISO_DE_IA_TEXTO` | «Voz generada con inteligencia artificial.» | texto | hoy |
| `HASHTAGS_FIJOS` | `#Balcarce #RadarBalcarce` | texto | hoy (regla 281) |
| `HASHTAGS_EXTRA_MAX` | 3 | cantidad | hoy |
| `HASHTAGS_MAX_INSTAGRAM` | 5 | cantidad | prensa (sin confirmar) |
| `LUFS_FINAL` | −15 | LUFS (rango −14 a −16) | propuesto |

### 3.2 Zona segura y letra

| Variable | Valor | Unidad | Origen |
|---|---|---|---|
| `ZONA_ARRIBA` | 270 | px | propuesto |
| `ZONA_ABAJO` | 670 | px | propuesto |
| `ZONA_DERECHA` | 190 | px | propuesto |
| `ZONA_IZQUIERDA` | 80 | px | propuesto |
| `CAJA_TEXTO_X_MIN` / `X_MAX` | 80 / 890 | px | derivada |
| `CAJA_TEXTO_Y_MIN` / `Y_MAX` | 270 / 1250 | px | derivada |
| `HISTORIA_SOLA_ARRIBA` / `ABAJO` | 250 / 340 | px | comunidad (sin confirmar) |
| `FIRMA_FILA` | 1200 (hoy 1478) | px | propuesto |
| `LETRA_TITULAR_MIN` | 64 | px | propuesto (probar en un celular) |
| `LETRA_SUBTITULO` | 52 | px | propuesto |
| `LETRA_TEXTO_MIN` | 40 | px | propuesto (nada menor se lee en el celular) |
| `LETRA_RASGO_GRANDE` | 220 a 320 | px | propuesto |
| `SUBTITULO_MAX_LINEAS` | 2 | líneas | propuesto |
| `SUBTITULO_MAX_CARACTERES_LINEA` | 32 | caracteres | propuesto |
| `TITULAR_MAX_CARACTERES` | 90 | caracteres | propuesto |
| `CONTRASTE_MIN` | 4,5 | relación | hoy (`CRITERIO-REDES.md` § 8) |
| `COLOR_*` | los de la tabla de colores | hex | hoy (`COLOR_SECCION`, no se tocan) |

*(Los tamaños de letra no tienen fuente: son criterio propio para pantallas de ~6 pulgadas; se ajustan mirando la primera prueba en un celular real.)*

### 3.3 Duraciones y escenas

| Variable | Valor | Unidad | Origen |
|---|---|---|---|
| `HISTORIA_MAX_SEGUNDOS` | 60 (corte de seguridad 58) | s | API de Meta; hoy 58 |
| `CLIMA_SEGUNDOS` | 18 (mín. 10, máx. 22) | s | hoy 10-20; sube un poco el máximo |
| `CLIMA_AUSPICIO_SEGUNDOS_EXTRA` | 4 | s | propuesto |
| `CLIMA_ESCENAS` | 3 / 6 / 5 / 4 | s | propuesto (saludo, comentario, datos, cierre) |
| `REPASO_MAX_NOTAS` | **3** | notas | Hernán 3/11 |
| `REPASO_MIN_NOTAS` | 2 | notas | hoy |
| `REPASO_MIN_DE_BALCARCE` | 1 | notas | plan sección 10 |
| `REPASO_APERTURA_SEGUNDOS` | 3 | s | propuesto |
| `REPASO_SEGUNDOS_POR_NOTA` | 8 | s | propuesto (~20 palabras) |
| `REPASO_CIERRE_SEGUNDOS` | 3 | s | propuesto |
| `REPASO_SEGUNDOS_OBJETIVO` / `MAX` | 30 / 38 | s | propuesto (hoy 55) |
| `EFEMERIDE_SEGUNDOS` | 28 (máx. 35) | s | propuesto (hoy sin tope fijo) |
| `EFEMERIDE_PRINCIPALES_EN_VIDEO` | 1 | cantidad | propuesto (pregunta 5) |
| `FARMACIA_SEGUNDOS` | 14 (mín. 6, máx. 20) | s | hoy 6-25 |
| `NOTA_REEL_SEGUNDOS` | 25 (máx. 35) | s | propuesto |
| `NOTA_PROPIA_SEGUNDOS` | 35 (máx. 45) | s | propuesto |
| `NOTA_PROPIA_VIDEO_SEGUNDOS` | 20 (máx. 30) | s | propuesto |
| `PLACA_FINAL_SEGUNDOS` | 3 | s | propuesto (como el 1/11) |
| `PARTICIPA_SEGUNDOS` | 18 (máx. 25) | s | propuesto |
| `PUBLICIDAD_PROPIA_SEGUNDOS` | 18 (máx. 25) | s | propuesto |
| `FERIADO_SEGUNDOS` | 20 (máx. 28) | s | propuesto (hoy 10-25) |
| `AGENDA_SEGUNDOS` / `UTILES_SEGUNDOS` | 22 / 18 | s | hoy 6-25 y 8-20 |
| `HISTORIA_DE_NOTA_SEGUNDOS` | 5 | s | sin confirmar |
| `GANCHO_MAX_PALABRAS` | 8 | palabras | hoy (regla 301) |
| `GANCHO_SEGUNDOS` | 3 | s | hoy |
| `ENTRADA_ANIMADA_SEGUNDOS` | 2,3 | s | hoy (`CRITERIO-REDES.md` § 8) |

### 3.4 Voz y música

| Variable | Valor | Unidad | Origen |
|---|---|---|---|
| `VOZ_CUPO_DIARIO` | 10 | audios/día | hoy (con las 6 de rutina + 3 repasos + Participá = justo; subirlo a 12 si se suman notas con voz) |
| `VOZ_EXCEPCION_A_MANO` | sí | — | decisión del 2/11 (nota propia o auspiciante pedida por Hernán) |
| `MUSICA_ACTIVA` | no / sí por pieza (§ 1.3) | interruptor | propuesto |
| `MUSICA_DB_BAJO_LA_VOZ` | −18 (rango −15 a −20) | dB | guías de mezcla |
| `MUSICA_SUBE_AL_CIERRE_DB` | +6 | dB | propuesto |
| `MUSICA_ENTRADA_SALIDA_SEGUNDOS` | 0,5 / 1,0 | s | propuesto |
| `MUSICA_PISTAS_MAX` | 6 | pistas | propuesto |
| `MUSICA_CARPETA` | `redes/musica/` con `LICENCIAS.md` | ruta | propuesto |
| `MUSICA_PIEZAS` | efemeride, feriado, participa, publicidad, nota-propia-con-video, carrusel-tiktok | lista | propuesto |

### 3.5 Posteos, carruseles y cupos por red

| Variable | Valor | Unidad | Origen |
|---|---|---|---|
| `POSTEOS_FB_POR_DIA` | 10 (5 Balcarce + 5 nacionales) | cantidad | Hernán |
| `POSTEOS_NACIONALES_MAX_POR_SECCION` | 3 | cantidad | Hernán |
| `POSTEOS_ESPACIADO_MINUTOS` | 90 | min | hoy |
| `POSTEOS_HORA_DESDE` / `HASTA` | 08:00 / 22:00 | hora | hoy |
| `POSTEOS_ANTIGUEDAD_MAX_HORAS` | 8 | h | hoy |
| `POSTEOS_IG_ESPEJO_POR_DIA` | 5 | cantidad | propuesto (pregunta 3) |
| `HISTORIAS_DE_NOTA_POR_DIA_MAX` | 6 | cantidad | propuesto |
| `REELS_DE_NOTA_POR_DIA_MAX` | 2 | cantidad | propuesto |
| `CARRUSEL_MIN_FOTOS` | 3 | fotos | plan 1/11 |
| `CARRUSEL_RECOMENDADO_MAX` | 8 | fotos | propuesto |
| `CARRUSEL_MAX_INSTAGRAM` | **10** | fotos | API de Meta (el plan decía 20) |
| `CARRUSEL_MAX_FACEBOOK` | 10 | fotos | propuesto |
| `CARRUSEL_MAX_X` / `BLUESKY` | 4 / 4 | fotos | API |
| `CARRUSEL_MAX_THREADS` | 10 (la API admite 20) | fotos | propuesto |
| `CARRUSEL_MAX_TELEGRAM` | 10 | fotos | API de Telegram |
| `CARRUSEL_MAX_TIKTOK` | 10 (la API admite 35) | fotos | propuesto |
| `CARRUSEL_TAMANO` | 1080 × 1350 | px | derivado |
| `TIKTOK_POR_DIA_MAX` | 4 | cantidad | propuesto (su tope: ~15) |
| `YOUTUBE_SHORTS_POR_DIA_MAX` | 4 (techo duro 6) | cantidad | cuota 10.000 / 1.600 |
| `YOUTUBE_UNIDADES_POR_SUBIDA` | 1600 | unidades | plan sección 10 |
| `X_POR_DIA_MAX` | 5 (a medir) | cantidad | propuesto |
| `THREADS_POR_DIA_MAX` / `BLUESKY_POR_DIA_MAX` | 8 / 8 | cantidad | propuesto |
| `TELEGRAM_SIN_SONIDO` | todo menos repaso mañana, farmacia, repaso noche | lista | propuesto |
| `TEXTO_X_MAX` / `THREADS_MAX` / `BLUESKY_MAX` | 280 / 500 / 300 | caracteres | API |
| `TEXTO_INSTAGRAM_MAX` / `TIKTOK_MAX` | 2200 / 2200 | caracteres | API |
| `TEXTO_TELEGRAM_MAX` / `PIE_TELEGRAM_MAX` | 4096 / 1024 | caracteres | API |
| `YOUTUBE_TITULO_MAX` / `DESCRIPCION_MAX` | 100 / 5000 | caracteres | sin confirmar |
| `ENLACE_X_CUENTA_COMO` | 23 | caracteres | API de X |
| `INSTAGRAM_BIO_ENLACE` | `radarbalcarce.com` | texto | hoy |

### 3.6 Horarios (referencia de `PIEZAS_DEL_DIA`)

| Variable | Valor |
|---|---|
| `HORA_CLIMA_MANANA` / `NOCHE` | 07:00 / 20:00 |
| `HORA_FERIADO` | 08:00 |
| `HORA_EFEMERIDE` | 09:00 |
| `HORA_REPASO_MANANA` / `TARDE` / `NOCHE` | 10:00 / 15:00 / 21:00 |
| `HORA_PARTICIPA` | 12:00 (lun a vie) |
| `HORA_AGENDA` | 12:00 (jue) |
| `HORA_UTILES` | 17:00 (sáb) |
| `HORA_FARMACIA` | 19:00 |
| `HORA_PUBLICIDAD_PROPIA` | domingo 18:00 (a definir) |
| `VENTANA_*` | las de hoy (minutos después de su hora en que todavía sale; nada pasa de medianoche) |

---

## 4. Para crecer: meta de 1.000 seguidores en Facebook y en Instagram

Partimos de **53 seguidores en Facebook y 7 en Instagram** (medición del 15/10, `FORMATOS-POR-RED.md` § 2.3). Tres de cada cuatro visitas al sitio venían de Facebook en esa medición. **Aviso honesto:** casi todo lo que se recomienda en internet para crecer es de blogs de marketing; lo que está documentado para medios locales es más modesto y apunta a **constancia y comunidad, no a viralidad** (Local Media Association, 2026, citada en `FORMATOS-POR-RED.md` § 3.1 f). Estas son ocho ideas, ordenadas por esfuerzo/resultado esperado:

1. **Que la gente mande las cosas (lo más importante).** Una pieza fija, cada semana, que invite con un ejemplo real («vieron esto en la calle, nos lo mandaron y hicimos la nota»). Una redacción local que usó un hashtag propio para recibir contenido de los vecinos cada viernes lo recomienda como estrategia mínima (Poynter sobre el programa de becas de Instagram para medios locales: <https://poynter.org/?p=689216>). Para Radar: el viernes, «Tu foto del día / Tu foto de Balcarce», con un hashtag propio (`#FotoDeBalcarce`) y regla simple (la mejor sale en el reel y con el nombre de quien la mandó, con su permiso). **Qué medir:** cuántos mensajes llegan por semana.
2. **Hacer visible lo que se mandó.** Cada nota que nace de un mensaje de la gente lleva «Nos la mandó [nombre, si quiere]» y se comparte también como historia con el agradecimiento. Es lo que hace que otros manden. Medir: proporción de notas que nacen de la gente.
3. **Los envíos son la señal que más empuja.** Mosseri dijo en enero de 2025 que los "me gusta", el tiempo de reproducción y los envíos son las señales principales; los blogs agregan que los envíos importan más para llegar a gente nueva (sin confirmar: <https://www.eclincher.com/articles/how-the-instagram-algorithm-works-in-2026>). Por eso las piezas de servicio (clima, farmacia, teléfonos) terminan con «Mandáselo a alguien» y se hacen para ser mandadas. Medir: envíos por pieza (en las estadísticas de Meta).
4. **Colaboraciones con comercios.** Cada nota sobre un comercio se publica en Instagram como **posteo en colaboración** (la API admite hasta 3 colaboradores en posteos, no en historias: `FORMATOS-POR-RED.md` § 3.2): sale también en el perfil del comercio y llega a los seguidores de ellos. Es lo que hace crecer a los dos y no cuesta nada. Medir: seguidores nuevos el día de la colaboración. Armar una lista de 10 comercios para empezar (los de la agenda de contactos).
5. **Constancia y horarios que se aprenden.** El clima a las 7 y a las 20, los repasos a las 10, 15 y 21: son citas fijas (el resumen semanal de 30-60 segundos es el formato que más funciona en medios locales «porque es constante, no viral», American Journalism Project 2026, citado en `FORMATOS-POR-RED.md` § 3.1 f). No cambiar horarios sin medir. Medir: alcance por pieza y hora.
6. **Originalidad.** Nada de repostear videos de otros medios (Meta y, según los blogs, Instagram dan prioridad a lo original; <https://www.eclincher.com/articles/how-the-instagram-algorithm-works-in-2026>). Las notas propias de Hernán, las crónicas con fotos y el clima propio son lo que nos diferencia. Más: las notas propias suman también a AdSense (plan, 3/11).
7. **Un lugar fijo para seguirnos.** Un botón «Seguinos» en la nota y en el pie de cada reel con el nombre de las cuentas (`@radarbalcarce`), la bio de las dos redes igual a la del sitio, y un código QR en los avisos y en las piezas que se imprimen. El botón «Compartir» de la nota ya está decidido (plan, 1/11). Medir: visitas del sitio que vienen de cada red y seguidores nuevos por semana.
8. **Publicidad paga chica para seguidores, cuando haya plata.** Hernán ya lo dijo: invertir parte de lo que entre en publicidad de Radar en Facebook e Instagram para Balcarce (plan, 3/11). Con una audiencia tan chica y un pueblo identificable, conviene **segmentar por ciudad** y medir costo por seguidor.

**Panel semanal de números (qué mirar cada lunes):** seguidores por red; alcance de los 3 repasos, del clima y de las notas; envíos y guardados; pieza más y menos vista; visitas al sitio desde cada red; cuántos mensajes llegaron por WhatsApp. Cada red se queda si tras una semana de números llega a un mínimo que Hernán escribe antes de prenderla (decisión (g) del 1/11 a la noche).

**Una nota sobre TikTok:** tiene llegada, pero el video informativo con voz de IA no se parece a lo que le funciona a los medios chicos que crecieron (Block Club Chicago y WyoFile, en American Journalism Project 2026: son periodistas que salen a filmar; `FORMATOS-POR-RED.md` § 3.8). Probar con **Participá, efeméride y notas propias de Hernán con su video**, que son más "de persona".

---

## 5. Preguntas para Hernán (todas juntas, cortas, con mi recomendación)

1. **Música de fondo.** ¿La probamos? *Recomiendo sí*, muy baja, sólo en efeméride, feriado, Participá, publicidad y notas propias con video; no en repasos, farmacia ni útiles; el clima, una semana a prueba en una sola franja.
2. **Saludos de las voces** (pregunta 6 pendiente del 2/11). *Recomiendo* saludar sólo en la primera pieza de la mañana (7:00) y en la primera de la noche (19:00), y que el resto sea continuidad. Además acorta cada pieza unos 2 segundos.
3. **Instagram como espejo de Facebook.** ¿Todos los reels de Facebook salen también como reel en Instagram, y 5 posteos de Balcarce por día como espejo? *Recomiendo sí a las dos* (pasa a historia además del reel).
4. **Carrusel de Instagram: 10, no 20.** La API de Instagram deja 10, no 20 como decía el plan. ¿Aceptás 10? *Recomiendo sí* (y 3 a 8 en la práctica).
5. **Efeméride.** Hoy cuenta una principal y tres más. ¿En el video sólo la principal (28 s) y las demás en la nota web? *Recomiendo sí.*
6. **Dónde va la mención del auspicio del clima.** *Recomiendo* después de los datos y antes del cierre, con «Auspicia: …» fijo en la placa desde el segundo 3 al final.
7. **Bluesky.** ¿Se suma? *Recomiendo sí*, es gratis y simple; si no, se queda afuera y se saca de la lista.
8. **Imagen de feed.** ¿Un solo diseño 4:5 (1080 × 1350) con el título en el cuadrado central, para todas las redes? *Recomiendo sí.*
9. **Zona segura universal.** Va a obligar a subir la firma «Radar Balcarce» y achicar un poco el rasgo grande de las placas. ¿Aceptás ese cambio para todas las piezas (clima incluido, que cambiaría poco)? *Recomiendo sí* y probarlo primero en el clima de una franja.
10. **Largo del clima.** ¿Lo dejamos en 15 a 20 segundos y sólo suma 4 si hay auspicio? *Recomiendo sí.*
11. **TikTok y YouTube mientras tanto, por Buffer.** ¿Seguimos así hasta que aprueben las revisiones? *Recomiendo sí*, y pedir las dos revisiones esta semana.
12. **Publicidad propia en redes.** ¿Con los precios visibles o sólo «escribinos por WhatsApp»? *Recomiendo sin precios en las redes* (los precios quedan en el media kit y en la web), para no mostrarlos antes de diciembre.
13. **Cuántas piezas de Participá.** Hoy hay 4 por semana. ¿Sumamos «Tu foto del día» (viernes) y «¿Qué querés que contemos?» (domingo)? *Recomiendo sí* a la primera, a la segunda más adelante.
14. **Cuánto X.** El tope mensual de X hay que medirlo. ¿Arrancamos con 5 por día (3 repasos + 2 notas) y subimos si aguanta? *Recomiendo sí.*
15. **Música: quién arma la carpeta.** ¿Lo hago yo desde Pixabay Music y YouTube Audio Library, con registro de licencia, y te las muestro antes de usarlas? *Recomiendo sí.*

---

## 6. Fuentes consultadas hoy (3/11/2026)

- Zona segura de Reels y Stories: <https://www.hopperhq.com/blog/instagram-reel-size/>, <https://www.firstpier.com/resources/instagram-ad-safe-zones>, <https://moda.app/resources/sizes/instagram-story>
- TikTok (zona segura, especificaciones): <https://affroom.com/blog/tiktok-safe-zone/>, <https://www.socialync.io/tools/safe-zones/tiktok>
- YouTube Shorts (zona segura, 3 minutos): <https://reap.video/blog/short-form-video-safe-zones>, <https://www.revid.ai/youtube-shorts-safe-zone>, <https://www.socialmediatoday.com/news/youtube-expands-3-minute-shorts-to-all-users/736967/>
- Duración y gancho (blogs, sin confirmar): <https://klap.app/blog/how-long-should-reels-be>, <https://www.go-viral.app/blog/instagram-reels-length/>, <https://socialbee.com/blog/how-long-can-a-facebook-reel-be/>
- Mezcla de música y volumen: <https://www.overseeros.com/blog/background-music-volume-under-voiceover>, <https://vidpros.com/fix-background-music-too-loud-video/>, <https://voxbooster.com/blog/mix-voice-with-background-music>
- Licencias de música: <https://help.instagram.com/ipad-app/402084904469945>, <https://usethirdchair.com/blog/meta-sound-collection-explained-for-brands-and-rights-holders>, <https://www.vidiq.com/blog/post/royalty-free-music-youtube-audio-library>, <https://pixabay.com/service/faq/>
- Subtítulos y sonido apagado: <https://blog.mean.ceo/?p=11554>, <https://posteverywhere.ai/social-media-terms/sound-on-vs-sound-off>
- Carruseles y API de Instagram: <https://developers.facebook.com/docs/instagram-platform/content-publishing>, <https://www.socialinsider.io/data-geeks/Instagram-Carousel-Study.pdf>
- Telegram: <https://core.telegram.org/bots/api/methods/sendmediagroup.md>, <https://core.telegram.org/bots/api>
- Crecimiento de medios locales: <https://poynter.org/?p=689216>, <https://pressgazette.co.uk/media-audience-and-business-data/fastest-growing-news-publishers-on-instagram-in-2024-2026/>, <https://www.eclincher.com/articles/how-the-instagram-algorithm-works-in-2026>
- Lo ya investigado el 15 a 17/10/2026, con sus propias fuentes: `docs/redes/FORMATOS-POR-RED.md`.

**Lo que no pude confirmar hoy y hay que probar o leer en la fuente oficial:** las medidas exactas de la zona segura de cada red (ninguna las publica en una sola página oficial; hay que bajar las plantillas de TikTok y probar en un celular real); si Meta limitó la duración del reel de Facebook; si Buffer acepta fotos/carruseles de TikTok y Shorts; el tope mensual de X; si los 4 tipos de música propuestos pasan sin reclamos en YouTube; los tamaños de letra mínimos (criterio propio, a probar).
