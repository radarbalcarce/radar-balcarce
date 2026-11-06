# Las redes en Radar 3.0

*Para Hernán y Andrés. Escrito el 3/11/2026 leyendo `v3/redes/` (REGLAS, `piezas-del-dia.mjs`, `piezas/REGLAS.md`, Facebook e Instagram), `docs/propuestas/REDES-3-0-FORMATOS.md`, la sección 10 del plan y los datos reales de `web/data/redes.json`. Lo que no se pudo confirmar en el código está marcado **a confirmar**. Si este documento y el programa no coinciden, manda el programa.*

## 1. La foto de hoy en una pantalla

Hay **dos sistemas de redes conviviendo**:

| | Sistema viejo (2.0) | Sistema nuevo (3.0, Worker `radar-redes`) |
|---|---|---|
| Estado | **Es el que publica de verdad hoy** en Facebook, Instagram, TikTok, YouTube y X | **En ensayo**: arma y simula todo, pero **no llama nunca a Meta** (interruptor `REDES_ACTIVAS` = «no») |
| Qué falta para pasar | Se apaga cuando la 3.0 pase a real | Unos días de ensayo, mirar que salga bien, prender el interruptor (lo hace una persona) y apagar las redes viejas |

Mientras tanto, **lo que ven los seguidores sigue saliendo por el sistema viejo**. La 3.0 hace lo mismo "en seco" y deja anotado qué habría publicado, para compararlo.

Un detalle que conviene saber: las **redes 3.0 en ensayo** dibujan los videos **mudos** (sin voz), para no gastar el cupo de audios de la clave que usa el sistema viejo. Hablan recién cuando exista la clave de voz aparte `GEMINI_API_KEY_REDES_V3` o cuando se pase a real.

## 2. Tabla por red

Leyenda de estado: **Andando** = publica de verdad hoy; **Ensayo** = la 3.0 lo arma pero no publica; **Falta** = no hay programa todavía.

| Red | Qué se publica (decidido para la 3.0) | Cuántas por día | Voz | Estado hoy |
|---|---|---|---|---|
| **Facebook** (página «Radar Balcarce») | Posteo con foto de una nota (título + 2 líneas + enlace + `#Balcarce #RadarBalcarce`); **reel** con voz de cada pieza del día; **historia** (el mismo video, hasta 58 s); carrusel cuando una nota tenga 3 o más fotos propias | Hasta **10 posteos** (5 de Balcarce + 5 de lo más contado del país), más los reels e historias de la tabla de la sección 4 | Los reels e historias, sí. El posteo con foto, no | **Andando** (sistema viejo: 5 posteos por día, reels e historias). **Ensayo** en la 3.0 |
| **Instagram** (`@radarbalcarce`) | **Espejo** de los posteos de Facebook de Balcarce (la **misma imagen**, sin enlace: «link en la bio»); **reel** y **historia** de cada pieza; carrusel de hasta 10 láminas | 5 posteos (los de Balcarce) + los reels e historias | Reels e historias, sí | **Andando** (viejo). **Ensayo** en la 3.0. Hay fallas en la subida de algunos reels (ver sección 9) |
| **TikTok** | Los mismos reels (sin farmacia, útiles ni agenda); modo foto para carruseles. Se marca «contenido con IA». Enlace: «link en la bio» | Hasta **4** (propuesta) | Sí | **Andando** por el sistema viejo vía Buffer (unos 7 por día la última semana). **Falta** en la 3.0: no hay programa. Falta además la revisión de la app de TikTok para publicar directo |
| **YouTube Shorts** | Los mismos reels como Shorts, con título «pieza · Radar Balcarce»; listas de reproducción (Clima, Repasos, Un día como hoy) | **4** (techo técnico: 6 por día, por el cupo gratis de YouTube) | Sí | **Andando** por el sistema viejo vía Buffer (unos 4 por día). **Falta** en la 3.0. Falta pedir la auditoría de YouTube para publicar directo por la API |
| **X** | Imagen de la nota con el titular, **sin enlace** por defecto (con enlace cuesta mucho más por posteo); los repasos como un posteo con 3 titulares; video adjunto sólo si aceptan gastar | **5** (respuesta de Hernán del 3/11) | Sólo si se adjunta el reel | **Andando** por el sistema viejo vía Buffer, de forma reciente: apareció el 30/10 y la última semana salieron unos 12. **Falta** en la 3.0 |
| **Threads** | Igual que X, pero con enlace tocable | 5 a 8 (propuesta) | Sólo si se adjunta el reel | **Falta** (no hay programa ni permiso de Meta para Threads todavía) |
| **Bluesky** | Igual que X, con enlace declarado aparte; hasta 4 fotos | 5 a 8 (propuesta) | Sólo si se adjunta el reel | **Falta**: **Hernán tiene que crear la cuenta** y después se arma el programa |
| **Canal de Telegram** | Una por cada nota de Balcarce (titular + bajada + enlace con vista previa) + los repasos, clima y farmacia como texto o video; el clima y la farmacia del día quedan fijados | Una por nota de Balcarce, sin tope, más las piezas de servicio | Video con pie de hasta 1.024 caracteres | **Falta**: no hay programa. **A confirmar** si el canal ya está creado (el código sólo tiene el bot, que es otra cosa: ver `TELEGRAM.md`) |
| **WhatsApp** | **No se publica en WhatsApp.** El número del medio, **2266 51-1612**, es para que lectores y comercios escriban (Participá, avisos, publicidad). Un «canal de WhatsApp» para lectores no tiene forma de publicar por programa: si se quiere, sería a mano | — | — | **No aplica** (es un buzón, no una red de publicación) |

**Cómo salen las notas a X, Threads, Bluesky y el canal:** con la imagen de enlace (1080 × 565), que se arma en el módulo de piezas; ya está dibujada, falta el programa que la publique.

### Qué cambia de una red a otra (resumen)

| Cosa | Facebook | Instagram | TikTok / YouTube | X / Threads / Bluesky | Canal de Telegram |
|---|---|---|---|---|---|
| Enlace a la nota | Tocable en el texto | **No**: «link en la bio» | **No**: «link en la bio» (YouTube dice la dirección) | X sin enlace; Threads y Bluesky con enlace | Tocable, con vista previa |
| Cantidad máxima de hashtags | `#Balcarce #RadarBalcarce` + 1 | 5 | TikTok 5, YouTube 3 | Threads 1 etiqueta; X y Bluesky los de la nota | — |
| Largo del texto | Corto (se ven unas líneas antes de «Ver más») | Hasta 2.200 caracteres | 2.200 / 100 de título | X 280, Threads 500, Bluesky 300 | Pie hasta 1.024 |
| Carrusel | Álbum | Hasta 10 | TikTok: modo foto | Hasta 4 fotos (Threads hasta 10) | Álbum de 2 a 10 |

Lo que **no cambia nunca**: el aviso «**Voz generada con inteligencia artificial.**» en todo lo que habla, la sección de la nota en su color, el crédito de la foto, y que **nada rojo ni de menores** sale en ninguna red.

## 3. Qué piezas hay

Cada pieza usa **las escenas de hoy** (el mismo dibujo, las mismas animaciones, la voz de la locutora o el locutor propios), no placas quietas.

| Pieza | Formato | Duración | Qué lleva |
|---|---|---|---|
| **El clima** (mañana y noche) | Video 9:16 | 15 a 20 segundos | Cielo animado, temperatura que cuenta hasta su valor, los días que siguen. Con auspicio, **22 s** |
| **Clima auspiciado** | Igual que el clima | 22 s | La voz dice al inicio «el clima de hoy lo auspicia [comercio]» y una franja fija «Auspicia · comercio · @cuenta» desde el segundo 3 hasta el final |
| **El repaso** (mañana, tarde, noche) | Video 9:16 | 21 s con 2 notas, **30 s con 3** | Máximo 3 notas; **al menos una de Balcarce**; lista numerada de tapa y cierre |
| **Un día como hoy** (efeméride) | Video 9:16 | 15 s | Un hecho principal y un «también». *A prueba una semana* (Hernán, 3/11) y se compara el alcance |
| **Farmacia de turno** | Video 9:16 | 14 s | Hasta 3 farmacias con dirección y teléfono; «De turno hasta mañana a las 8:30» |
| **Participá** | Video 9:16 | 18 s | La pregunta, el WhatsApp 2266 51-1612 que se tipea, el mail |
| **Nota de Balcarce o nacional** (reel) | Video 9:16 | 25 s | Tres placas con la foto y el hecho |
| **Nota propia** (la que manda Hernán) | Video 9:16 | 14 s con 1 foto, 22 s con 2, 30 s con 3 | «Por Hernán Accomo»; **lleva la sección que le corresponde**, nunca dice «Nota propia». Sale sólo con el «ok» de Hernán |
| **Historia de una nota** | Video 6 s **sin voz** | 6 s | Foto, sección, titular y «Link en la bio» arriba |
| **Posteo de feed 4:5** | Imagen 1080 × 1350 | — | Foto entera sobre fondo oscuro con la marca; sirve también recortada a cuadrado |
| **Carrusel** | De 3 a 10 láminas 4:5 | — | Portada, una lámina por foto con epígrafe, y la última con «La nota completa». Hacen falta 3 fotos o más |
| **Imagen de enlace** | 1080 × 565 | — | Para X, Threads y Bluesky |

Detalles que valen para todas (de `v3/redes/piezas/REGLAS.md`):

- **Saludo:** sólo la **primera pieza de la mañana** («Buen día, Balcarce.», de 5:00 a 11:59) y la **primera de la noche** («Buenas noches, Balcarce.», de 19:00 a 4:59). De tarde, ninguna saluda.
- **Sin música por ahora.** Queda el lugar preparado (muy baja, a −18 dB bajo la voz) para cuando se decida.
- **Subtítulos siempre**, con la palabra que se dice resaltada.
- **Zona segura:** ningún texto importante pasa de la fila 1670 de 1920 (donde las redes ponen su propio texto y botones).
- Se animan todas; ninguna es una placa quieta.

### Todavía no existen en la 3.0

Agenda del fin de semana, teléfonos útiles, feriados y avisos de clima por helada, granizo o viento. Por ahora los sigue haciendo el sistema viejo.

## 4. A qué hora sale cada pieza (3.0)

Tabla de `v3/redes/piezas-del-dia.mjs` (hora de Balcarce). «Ventana» es cuánto tiempo después de su hora todavía puede salir si la corrida se atrasó.

| Hora | Pieza | Días | Ventana | Prioridad de voz | Dónde sale |
|---|---|---|---|---|---|
| 07:00 | El clima de la mañana | Todos | 4 h | 2 | Instagram: historia. Facebook: reel e historia |
| 09:00 | Un día como hoy | Todos | 3 h | 3 | Reel e historia en Facebook e Instagram |
| 10:00 | El repaso de la mañana | Todos | 3 h | 1 | Reel e historia en las dos |
| 12:00 | Participá con noticias | Lunes | 1 h | 4 (opcional) | Reel e historia en las dos |
| 12:00 | Tu evento o emprendimiento | Martes | 1 h | 4 | Ídem |
| 12:00 | Tu reclamo | Miércoles | 1 h | 4 | Ídem |
| 12:00 | Tu nota | Viernes | 1 h | 4 | Ídem |
| 15:00 | El repaso de la tarde | Todos | 4 h | 1 | Reel e historia en las dos |
| 19:00 | Farmacia de turno | Todos | 5 h | 2 | Instagram: historia. Facebook: reel e historia |
| 20:00 | El clima de la noche | Todos | 4 h | 2 | Instagram: historia. Facebook: reel e historia |
| 21:00 | El repaso del día | Todos | 3 h | 1 | Reel e historia en las dos |

**Jueves:** a las 12:00 la tabla del sistema viejo ponía la agenda. En la 3.0 esa pieza todavía no existe, así que **el jueves no sale nada a esa hora**.

**Posteos con foto de notas:** cada 15 minutos entre las **8:00 y las 22:00**, uno por vuelta como máximo, con **90 minutos como mínimo** entre uno y otro (entran 10 en el día justo: 8:00, 9:30 … 21:30). Si no hay con qué, salen menos.

### Cuántas piezas con voz hay por día

Clima × 2 + farmacia + efeméride + repasos × 3 = **7 por día**; los lunes, martes, miércoles y viernes se suma Participá: **8**. Eso entra holgado en el **cupo de 10 audios por día**.

## 5. Qué nunca va a las redes

| Cosa | Por qué |
|---|---|
| **Lo rojo** (identifica a un menor o a una víctima, lista de sepelios) | La ley del medio: ni en la web ni en redes. Lo frena el núcleo con la marca `no_publicar` |
| **Notas de servicio**: el clima diario, el media kit y toda nota con marca de servicio | No son noticias; tienen su propia pieza (el reel del clima) o no se promocionan por esta vía |
| **Tragedias: la muerte de un menor o un bebé, un suicidio, un menor grave por un accidente o una agresión** | «Compuerta de tono» (regla R41). Se mira sólo el título, la bajada y las dos líneas. La web no cambia: esto es sólo para redes. Caso real que la motivó: el niño que murió en una pileta (28/10) abriendo el repaso de las 21 |
| **Notas sin foto** (en posteos) | Todo posteo lleva imagen, y el núcleo ilustra con IA las que se quedan sin foto real («Ilustración generada con IA», crédito propio). Una nota **de Balcarce** que igual no tenga ninguna imagen sale en el posteo de feed y en la imagen de enlace con la placa de su sección (y en los repasos, igual); **lo de afuera sin imagen, no** (Hernán, 6/11) |
| **Lo de afuera que cuentan menos de 5 medios** | Para redes se pide más que para el sitio. Lo de Balcarce va siempre |
| **Lo de la zona (otras ciudades)** | No es de acá ni es lo más contado del país |
| **Notas de hace más de 8 horas** | Una nota vieja ya no se postea |
| **Una nota que ya salió** | Sale una sola vez por red; si Meta la rechaza, se reintenta una vez y a la segunda se abandona |
| **Fotos con marca de agua o con el nombre de otro medio pegado** | El crédito va en el texto, no encima de la foto |
| **Una pieza con otra voz cuando se acabó el cupo** | Nunca: si no hay audio, la pieza no sale |

## 6. El clima auspiciado

Un comercio puede auspiciar el clima. Funciona así:

- **Un solo auspiciante por clima** (mañana y noche son dos climas por día, 60 por mes). Se reserva por fecha, en orden de llegada, y si se llena queda lista de espera.
- **En el reel:** la voz dice al inicio «el clima de hoy lo auspicia [comercio]; los encontrás en Instagram como [arroba cuenta]», y desde el segundo 3 queda una franja fija «Auspicia · comercio · @cuenta». Dura **22 s** en lugar de 18.
- **En la nota diaria del clima y en la página `/clima`:** un recuadro «El clima de hoy llega con [comercio]» con el logo y un enlace a su red (espacio **C1**, ver `PUBLICIDAD.md`).
- **En el texto del posteo:** «Auspicia: [comercio] · [@cuenta]».
- El comercio sale de la tabla de avisos (lugar `clima`), uno por día, rotando. **Sin aviso cargado, sale el clima normal.**
- Un nombre muy largo achica la letra de la franja y, si hace falta, se acorta.

## 7. El cupo de 10 voces por día

- Hay un tope de **10 audios por día** (variable `VOZ_TOPE_DIARIO`).
- El Worker **no reserva una pieza si dejaría sin audio a otra más importante** que falta hoy. El orden de importancia (columna «prioridad de voz» de la tabla): primero los repasos (1), después clima y farmacia (2), después la efeméride (3), y último Participá (4).
- Un audio que ya existe en la memoria de voces no gasta cupo.
- Si Google dice que se acabó el cupo, la pieza queda como «sin cupo» y **no sale**.
- **Excepción a mano (decidida el 2/11):** si Hernán pide por Telegram «este audio igual hacelo», o es una nota propia suya, o una pieza de un auspiciante, se hace aunque esté fuera del tope. Los topes frenan lo automático, no lo que pide una persona. *(**A confirmar** si ya está implementado: no encontré el comando en el bot.)*
- Cada pieza sale **una sola vez por día**. Si falla, se reintenta en la corrida siguiente hasta 3 errores. Una reserva que no vuelve en 45 minutos se da por cortada.

## 8. Cómo se mira lo que salió

| Dónde | Qué ves |
|---|---|
| **Telegram, 22:05** | Resumen del día: cuántos posteos salieron en cada red, cuáles (con la hora) y cuáles fallaron. En ensayo dice «habría publicado N posteos» con los titulares, y cuenta las piezas armadas y las fallas |
| **Telegram, 8:00 y 20:00** | Informe de la vigilancia (ver `UN-DIA-DEL-SITIO.md`). *Hoy no incluye números de redes: la vigilancia todavía no las mira* |
| **GitHub → Actions → «Radar 3.0: piezas de redes»** | Cada corrida (una por hora, de 7:07 a 23:07) deja como adjunto el video, el audio y un `.json` por pieza durante 7 días: se pueden bajar y mirar |
| **Facebook e Instagram** | Las propias páginas y sus estadísticas |
| **`web/data/redes.json`** | Lo que el sistema viejo publicó (con sus fechas y códigos) y las fallas |
| **`web/data/estadisticas.json`** | Seguidores, vistas e interacciones de Facebook e Instagram, cada 12 horas |
| **Base de datos `radar-nucleo`** (tablas `publicaciones` y `piezas`) | Todo lo que la 3.0 simuló o publicó, con su estado (`enviando`, `ok`, `simulado`, `error`) |

Si el token de Meta venció (error 190), el sistema avisa por Telegram **una sola vez por día**.

## 9. Qué anda mal hoy (para mirar)

- **Reels de Instagram de las 10:00:** en `redes.json` figuran fallas con el mensaje «La subida del video falló (400)» el 31/10 y el 1/11 (hasta 21 intentos). **A confirmar** la causa; mirar el resumen de las 22:05.
- **El sistema viejo anota «sin candidatas»** en algunas vueltas (lo vemos en `redes.json`, por ejemplo el 29/10, 31/10, 1/11 y 3/11): casi todas las notas miradas se descartan por «no va a redes». Aun así, la última semana llegó a los 5 posteos por día en Facebook e Instagram.
- **Buffer** (TikTok, YouTube, X) a veces rechaza un video («Video could not be read from its URL»): pasó el 25 y 26/10.

## 10. Qué falta para que las redes 3.0 pasen a real

1. **Unos días de ensayo** mirando el resumen de las 22:05 y los videos adjuntos.
2. **Una clave de voz para el ensayo** (`GEMINI_API_KEY_REDES_V3`) si se quiere oír cómo suenan antes de pasar.
3. **Decidir** las preguntas abiertas del cronograma: música, Instagram como espejo completo de Facebook (los reels como reels), TikTok y YouTube por Buffer o por API directa, y la animación de cada pieza.
4. **Prender** `REDES_ACTIVAS` = «si» en el Worker `radar-redes` (lo hace una persona) y **apagar las redes del sistema viejo** para no duplicar.
5. **Construir lo que falta:** TikTok, YouTube, X, Threads, Bluesky y el canal de Telegram como módulos de la 3.0; crear la cuenta de Bluesky (Hernán); pedir la auditoría de YouTube y la revisión de la app de TikTok; el permiso de Threads.
6. **Piezas que faltan:** agenda, teléfonos útiles, feriados y avisos de clima por helada, granizo o viento.

## 11. Los números que importan para decidir

La meta de Hernán (3/11): **1.000 seguidores en Facebook y 1.000 en Instagram**. Los números de hoy y las vistas de los reels de la última semana están en `ESTADISTICAS-LINEA-DE-BASE-2026-11-03.md`, para comparar el lunes 10/11.
