# Qué sale en las redes de Radar 3.0 (y qué pidió Hernán el 17/11)

*Escrito el 17/11/2026 leyendo el código (`v3/redes/piezas-del-dia.mjs`, `piezas-plan.mjs`, `piezas/variables.mjs` y `armadores.mjs`, `elegir.mjs`, `redes.mjs`, `disparar-acciones.mjs`, `wrangler.toml`, `efemerides/`, `v3/redaccion/telegram/administrar.mjs`) y las dos auditorías del 17/11. Nada de acá se probó publicando: lo que no se pudo confirmar va marcado **[NO VERIFICADO]**. Si este documento y el código no coinciden, manda el código.*

Palabras que se usan: **reel** = video vertical de Instagram/Facebook; **historia** = video corto de 24 horas; **posteo** = imagen con el enlace (Facebook) y su espejo en Instagram; **carrusel** = varias imágenes en un mismo posteo. Hora siempre de Balcarce. Las piezas con voz las dibuja un workflow de GitHub que despierta el reloj de Cloudflare **una vez por hora, a los :07** (de 7:07 a 23:07): una pieza puede salir hasta una hora después de su hora fija.

---

## A. Lo que sale HOY según el código

Todas las redes publican de verdad (`REDES_ACTIVAS = "si"`). Cupo de voz: **15 audios por día**, fijos; el reparto va por prioridad (repaso, después clima y farmacia, después efeméride y feriado, al final lo opcional). Todo lo que habla lleva «Voz generada con inteligencia artificial.» y pasa por la compuerta de tono (R41) y por los frenos legales.

**Dónde sale cada formato** (`accionesDe`, `piezas-del-dia.mjs`): una **historia** de la tabla (clima, farmacia, avisos) sale, desde el 19/11/2026, igual que un reel: **reel e historia en Instagram y en Facebook** (antes en Instagram era sólo historia); un **reel** (repaso, efeméride, Participá, útiles, feriado, nota propia) sale como reel e historia en las dos. **TikTok, YouTube Shorts y X** reciben el mismo mp4 de todas las piezas de video por Buffer (YouTube con tope de 12 por día y sin los de más de 60 s). Threads y Bluesky no reciben video.

### A.1 Piezas de video con voz (reloj de las piezas)

| Pieza | Formato | Redes | Hora (ventana) | Cada cuánto | Fija / a pedido | Fotos | Voz | Duración | Qué la frena |
|---|---|---|---|---|---|---|---|---|---|
| **Clima de la mañana** (`clima-manana`) | historia | Instagram (historia); Facebook (reel e historia); TikTok, YouTube, X | 7:00 (hasta 11:00) | todos los días | fija | ninguna: escena animada del cielo; con comercio auspiciante, franja ámbar | locutora, prioridad 2 | 18 s (22 s con auspicio) | sin datos de Open-Meteo; cupo; 3 errores en el día |
| **Clima de la noche** (`clima-noche`) | historia | las mismas | 20:00 (hasta 24:00) | todos los días | fija | ninguna | locutora | 18 s | las mismas |
| **Farmacia de turno** | historia | las mismas | 19:00 (hasta 24:00) | todos los días | fija | ninguna: una ficha por farmacia, **hasta 3** (el código corta en 3) | locutor, prioridad 2 | 14 s | sin cronograma del Colegio de Farmacéuticos; cupo |
| **Un día como hoy** (efeméride) | reel | Instagram y Facebook (reel e historia); Buffer | 9:00 (hasta 12:00) | todos los días | fija | ninguna (escena con el año que corre hacia atrás); 1 hecho principal y 1 «Y además» | locutora, prioridad 3 | 15 s | día sin pieza en `web/data/efemerides-piezas.json` (hay 121 días armados, diciembre a marzo); cupo |
| **Repaso de la mañana** (`noticia1`) | reel | Instagram, Facebook (reel e historia); Buffer | 10:00 (hasta 13:00) | todos los días | fija | 1 por nota (hasta 3) | locutor, prioridad 1 | 30 s con 3 notas, 21 s con 2 | menos de 2 notas válidas; cupo |
| **Repaso de la tarde** (`noticia2`) | reel | ídem | 15:00 (hasta 19:00) | todos los días | fija | ídem | locutora | ídem | ídem |
| **Repaso de la noche** (`podcast`) | reel | ídem | 21:00 (hasta 24:00) | todos los días | fija | ídem | locutor | ídem | ídem |
| **Participá** (4 variantes) | reel | ídem | 12:00 (hasta 13:00) | lunes «noticias», martes «tu evento», miércoles «tu reclamo», viernes «tu nota» (jueves, sábado y domingo no) | fija | ninguna: pregunta grande, franja verde con el WhatsApp 2266 51-1612 | voz alterna, prioridad 4 (la primera que se queda sin cupo) | 18 s | cupo (es la última en el reparto) |
| **Teléfonos útiles** | reel | ídem | sábados 17:00 (hasta 18:00) | semanal | fija | ninguna | locutor, prioridad 4 | 20 s | cupo |
| **Feriado** | reel | ídem | 8:00 (hasta 12:00) | sólo si hay feriado con datos verificados | condicional | ninguna | prioridad 3 | 18 s | que no haya feriado; que el panel pida cambiarlo |
| **Aviso de clima** (helada fuerte, granizo, viento de 60 o más) | historia | las mismas que el clima | desde 7:00 hasta 22:00 | sólo si hay un aviso grave; una vez por día cada tipo | condicional | ninguna | prioridad 2 | 15 s | que no haya aviso |
| **Reel de una nota propia** (`reel-nota-<id>`) | reel (con historia) | Instagram y Facebook; Buffer | apenas se publica la nota, de 8:00 a 23:00 | una vez por nota, hasta 72 h después | **a pedido** de quien la escribió (en el bot, «Reel») | **de 1 a 3** (portada y las de adentro), tienen que tener dirección pública | prioridad 1; **no gasta el cupo** (decisión del 13/11) | 14 s con 1 foto, 22 con 2, 30 con 3 | sin foto pública; la compuerta de tono; 3 errores |
| **Reel de una nota del diario ya publicada** | reel (con historia) | ídem | próxima corrida horaria (:07) tras el pedido, de 8:00 a 23:00 | una vez por nota, dentro de las 72 h del pedido | **a pedido** (`/redes <nota> reel`, o el panel) | de 1 a 3 de la nota, con dirección pública | prioridad 1 como el anterior **[NO VERIFICADO si gasta cupo; el código sólo exime a lo pedido con `PEDIDO_POR_PERSONA`]** | igual que el anterior | ley, tono, sin foto pública |

**Pausadas** (`pausada: true` en `piezas-del-dia.mjs`): el reel «Qué hacer este fin de semana» (jueves 12:00), el carrusel «El finde en Balcarce» (jueves 18:00) y el carrusel de cada nota propia con 3 fotos o más. Están escritas y se reactivan sacando la marca.

### A.2 Posteos de imagen y carruseles

| Pieza | Formato | Redes | Hora | Cada cuánto | Fija / a pedido | Fotos | Voz | Qué la frena |
|---|---|---|---|---|---|---|---|---|
| **Posteo de una nota** | imagen 4:5 (placa de la marca: foto entera, sección, título, bajada) | Facebook (con enlace tocable) y su espejo en Instagram (sin enlace, «link en la bio»); X (la misma placa, sin enlace, por Buffer) | vueltas de 15 min entre 8:00 y 22:00, **una por vuelta**, mínimo 90 min entre una y otra | hasta 10 por día: 5 de Balcarce + 5 de lo más contado (5 medios o más; máximo 3 de una misma sección) | automática; o a pedido (`/redes <nota> posteo`) | 1 (la foto de la nota; una nota de Balcarce sin foto sale con la placa, pero espera 150 min) | no | ley y tono; nota de más de 8 h; ya salió; 3 fallos en 2 h; sin foto (lo de afuera); lista de sepelios, clima, dólar del día, media kit |
| **Enlace en Bluesky y Threads** | imagen 1,91:1 o placa + texto + enlace | Bluesky, Threads | cada corrida horaria | hasta 3 por red y por corrida, las notas que ya salieron en Facebook (menos de 12 h) | automática | 1 (la placa de su nota) | no | que la placa no esté dibujada (Threads); falta de secretos |
| **«La semana en Balcarce»** | carrusel de 5 a 8 notas + portada + cierre (hasta 10 láminas 4:5) | Facebook (álbum), Instagram (carrusel) | domingos 11:00 (hasta 14:00) | semanal | fija | 1 por lámina (placa de color si la nota no tiene foto) | no | menos de 5 notas válidas |
| **Tarjeta de servicio** (clima, farmacia, efeméride, imagen fija + enlace) | imagen | Bluesky y Threads | después del video de su fila | con cada una de esas tres piezas | automática | ninguna | no | **APAGADA** (`TARJETAS_DE_SERVICIO: 'no'` en `v3-piezas.yml`, desde el 13/11, porque colgó el programa) |

**Lo que no existe hoy:** historia de una nota sola (el armador está escrito, pero ninguna fila de la tabla la pide), el canal de Telegram (sin programa), TikTok modo foto (sin confirmar con Buffer), música (decidida «después»), TikTok y YouTube con API propia (salen por Buffer).

### A.3 Lo que sale en la web (no en redes)

| Qué | Cuándo | Dónde se ve | Notas |
|---|---|---|---|
| Nota diaria del clima (`clima-AAAA-MM-DD`) | una por día, primera vuelta desde las 7:30 | portada y sección Balcarce ese día; `/clima` | `noindex` y fuera de los mapas; sin foto (ilustración del estado del cielo hecha con IA); la revisión de las 19 está apagada (`REVISION_DE_LAS_19 = false`), así que **no hay nota de la noche** |
| Nota de «Un día como hoy» | 7:07 (la primera corrida del día), antes del reel de las 9 | sección Cultura | hasta 4 hechos, sin IA; `noindex`; foto sólo de Wikimedia Commons con licencia libre |
| Página de farmacias `/farmacias` | siempre al día, sale del cronograma del Colegio de Farmacéuticos | turno de hoy («hasta las 8:30 del día siguiente») y calendario hasta fin de mes | con datos estructurados (JSON-LD) |
| Notas de los repasos | **no existen**: se decidió el 3/11 que el repaso es un video que lleva a las tres notas | | |

### A.4 Qué frena a todo (resumen)

1. **La ley y el tono:** menor, víctima, sepelios, lo rojo y R41 (muerte de un menor, suicidio): ninguna pieza sale.
2. **Cupo de voz:** 15 por día; si falta, la pieza espera o no sale, **nunca con otra voz**. Un audio ya guardado en la memoria no gasta.
3. **Datos faltantes** (clima, farmacia, efeméride): la pieza queda «sin-datos» y se reintenta mientras dure su ventana.
4. **Tres errores en el día** de una misma pieza: se abandona. Una reserva que no vuelve en 45 minutos se da por cortada.
5. **Interruptores:** `REDES_ACTIVAS`, `POSTEOS_ACTIVOS`, `INSTAGRAM_ESPEJO`, `TARJETAS_DE_SERVICIO`, `pausada: true`.
6. **El reloj:** si el token `RELOJ_GITHUB_TOKEN` vence, **no sale ninguna pieza con voz** y sólo avisa Telegram tras dos fallas (auditoría H-01).

---

**Nuevo el 20/11, prendido ese mismo día por pedido de Hernán (tres interruptores, ver `v3/redes/kit3/REGLAS.md`):** (1) **gráfico animado dentro de los reels** del repaso, de una nota y de una nota propia, cuando la nota trae su gráfico: una escena corta después de la foto con el titular, sin audio extra; (2) **«El número del día»**, un reel diario a las 13:00 con la cifra más fuerte de las notas de las últimas 24 horas (con su comparación si la hay); si ese día no hay una cifra clara, no sale, y no le quita voz a las demás piezas; (3) la **línea de tiempo** en la página de la nota (sitio, no redes).

## B. Lo que pidió Hernán el 17/11, contra lo que hay hoy

| Pedido | Hoy | Diferencia | Qué hay que cambiar |
|---|---|---|---|
| **Clima a la mañana y a la noche** | **Ya está:** reel/historia a las 7:00 y a las 20:00, 18 s | Ninguna en el video. La **nota** web sólo es de la mañana | Nada en redes. Ver C.2 para la nota |
| **Efemérides** (con el estilo definido, armar hasta marzo) | Reel diario de 15 s a las 9:00; 121 días armados de diciembre a marzo (13/11), 4 con un dato en `verificar` | El estilo ya está definido (15 s, 1 hecho + 1 «Y además»). Faltan **abril en adelante**; el 20/11 corre el armado automático del mes siguiente, pero el propio `REGLAS.md` dice que sus piezas automáticas **no alcanzan** para salir solas | Armar con Claude desde abril de 2027 (el tramo que Hernán elija) y revisar los 4 días en `verificar` **antes del 20/11** (hay que decidir si se apaga el armado automático) |
| **Turnos de farmacia, entre 1 y 3 farmacias según el día** | **Ya está:** historia diaria 19:00, una ficha por farmacia, **tope 3** | El código corta en 3 sin avisar si el cronograma trae 4 o más | Una prueba que falle si el cronograma trae más de 3 en un día; revisar que la ficha de 3 se lea bien en 14 s |
| **Reel «convocando» a participar, varios estilos** | Un solo diseño de pantalla (pregunta grande + franja verde de WhatsApp), con **cuatro textos** (noticias, evento, reclamo, nota; lunes, martes, miércoles y viernes). Existe una quinta variante («¿qué querés que contemos?») escrita pero **sin fila en la tabla** | Hernán pide **varios estilos visuales**, no sólo textos | Elegir 3 o 4 estilos con Hernán (los reels B, D, E, F, G, H del lienzo del 15/11 siguen sin elegir), una plantilla por estilo en `escenas.mjs` y que el día de la semana elija el estilo; sumar la quinta variante a la tabla |
| **Podcast/repaso de SIEMPRE 3 noticias**, mañana, tarde y noche, Balcarce primero y lo nacional más relevante | Tres repasos (10:00, 15:00 y 21:00) de **2 a 3 notas**. Pasan sólo las de Balcarce (hasta 2) y lo de afuera **contado por 5 medios o más**, con foto y de menos de 24 h; **no repite** una nota que ya salió como posteo ni en otro repaso; si no llega a 2, el repaso no sale | «Siempre 3» no está garantizado: con 2 sale de 21 s, con 0 o 1 no sale. Lo nacional pide 5 medios en redes aunque el sitio ya publica desde 4 (3 el fin de semana) | (1) bajar el piso de lo nacional para el repaso a lo que ya publica el sitio y ordenar por medios; (2) si faltan, completar con notas de ayer o del repaso anterior; (3) permitir que una nota ya posteada entre al repaso; (4) decidir si el repaso de la noche puede ser «lo mejor del día». Todo en `notasDelRepaso` y `completarRepaso` (`piezas-plan.mjs`), `REGLAS_PIEZAS`. Pide un cambio del criterio «una nota, un formato» (decisión del 23/10): **pregunta para Hernán** |
| **Reel de nota propia con 1 a 3 fotos** | **Ya está:** 14, 22 o 30 s según las fotos; se elige «Reel» en el bot; una vez por nota, hasta 72 h | Nada | Nada |
| **Reel a pedido de una nota ya publicada en el diario** | **Ya existe, pero escondido** (ver B.1) | Hay que saber el comando y esperar la próxima hora entera; no avisa cuándo salió | Ver B.1 |
| **En la web: nota del clima de mañana y de noche** | Una nota por día a las 7:30; la de la noche está apagada | Falta la edición de la noche | Ver C.2 |
| **En la web: nota de efemérides** | **Ya está** (7:07, sección Cultura, `noindex`) | Ninguna | Nada |
| **En la web: notas de los 3 podcasts** | No existen, a propósito (3/11) | Hay que revertir esa decisión | Ver C.3: recomiendo una sola página diaria, no tres notas |
| **En la web: turnos de farmacia siempre al día** | **Ya está** (`/farmacias`, cronograma al día, calendario) | Ninguna | Ver C.4 |

### B.1 El reel a pedido de una nota ya publicada: cómo funciona de verdad

Se pide hoy de **tres maneras**: el bot de Telegram (`/redes`), el mismo bot con `/repaso`, y el panel `/panel` del sitio (casillas «posteo, historia, reel» y «al próximo repaso»; mismas reglas que el bot).

- **`/redes <enlace o id> <formatos>`** (`mandarARedes`, `administrar.mjs`): formatos `posteo`, `historia`, `reel` o `todo`. Sólo vale para notas **publicadas** y sin freno legal. Marca la nota `forzada`: sale **aunque no la cuenten 5 medios**, con la firma «Radar Balcarce» y los créditos de sus fotos, y no cuenta contra los 10 posteos del día. Sigue frenando la ley, el tono, los sepelios y la falta de foto.
  - **Posteo:** sale en la próxima vuelta de las redes (de 8 a 22).
  - **Reel o historia:** los arma el reloj de las piezas, **en la próxima corrida horaria (a los :07), de 8 a 23**, una sola vez por nota y siempre que el pedido tenga menos de 72 horas. **Hace falta que la nota tenga foto con dirección pública**: si no, el bot avisa «sin foto con dirección pública el reel no se arma» y sugiere `/foto <nota>`.
- **`/repaso <enlace o id>`** (`mandarAlRepaso`): la nota va **primera** en el próximo repaso en video (10, 15 o 21), vale 24 horas desde el pedido, pasa por la ley, el tono y la foto, y lo que ya contó otro repaso no se repite.
- **Lo que no se sabe [NO VERIFICADO]:** si el bot avisa cuando el reel ya salió (el código sólo contesta en el momento del pedido), y cuánto cupo de voz gasta un reel pedido a mano (el que pide una persona con `PEDIDO_POR_PERSONA` no gasta; el reloj no lo marca así).

**Qué mejorar** (de menor a mayor esfuerzo): (1) que `/redes <nota> reel` conteste **a qué hora saldría** y que el bot avise por Telegram con el enlace cuando salió o por qué no salió; (2) que `/redes <nota>` sin formatos pregunte con botones en vez de dar un error; (3) tomar la foto de `copia` (nuestra copia propia en `radar-fotos`) para que casi ninguna nota quede «sin dirección pública»; (4) un botón «Hacer reel» en la lista de `/ultimas` y en el panel; (5) permitir 1 a 3 fotos elegidas a mano (hoy las toma de la nota); (6) vista previa del video sin publicar (hoy sólo existe a mano en GitHub: `v3-reel-previa.yml`).

---

## C. Reglas visuales nuevas (Hernán, 17/11) y recomendaciones para la web

### C.1 Las cinco reglas visuales

| Regla | Cómo está hoy (según el código) | Qué cambiar |
|---|---|---|
| **Zócalo inferior con un solo criterio en todas las piezas y redes** | No hay zócalo único: cada escena de `reels/escenas/` dibuja su firma. La raya y «Radar Balcarce · radarbalcarce.com» van en las filas 1478 a 1544 (por encima de lo que tapan Instagram y Facebook); los subtítulos en la 1660; la barra roja de avance abajo; el crédito de la foto debajo de ella; el auspicio del clima en una franja propia (fila 1568). Los posteos 4:5 llevan su propia firma | Un solo componente «zócalo» (marca + sitio + crédito) con la misma altura, tamaño y colores en todas las piezas y en los posteos y láminas; decidir si el crédito de la foto va dentro del zócalo. Archivos: `escenas.mjs`, `variables.mjs` (`FIRMA_RAYA_Y`, `ZONA_ABAJO`) |
| **«Radar Balcarce» con sus dos colores** | El rótulo se dibuja de un solo color en las escenas **[NO VERIFICADO escena por escena]** | Usar la versión de dos colores del `MANUAL-DE-MARCA.html` en el zócalo, en la placa final y en las láminas |
| **Subtítulos siempre** | Todas las piezas con voz llevan subtítulos (los de la voz, palabra por palabra, en ámbar). **No los llevan** las que no hablan: la historia de una nota (6 s, sin voz), los posteos y los carruseles | Si se quiere subtitular lo que no habla, hace falta un texto corto en pantalla; confirmar con Hernán si «siempre» incluye esas piezas. **Pendiente de la lista del 3/11:** subir los subtítulos un renglón para que no los tape la cuenta |
| **Tapa pensada para el feed** | La primera imagen del reel es el cuadro 0 de la escena (en el repaso, la lista numerada). **No se usa la portada de Meta** (pendiente 1.1 de `PENDIENTES-3-0.md`): la grilla de reels muestra un cuadro a medio animar | Subir la portada con la API de Meta (el parámetro de portada del reel; **no se usa en este código y no lo probé**) con una imagen de tapa armada a propósito: foto completa, titular grande, color de la sección. Es lo que más cambia el aspecto del feed |
| **Foto a pantalla completa** | La foto va **recortada en una caja** con el crédito debajo (repaso y notas) y se mueve con una deriva lenta. Sólo el posteo 4:5 la muestra entera, sobre fondo oscuro. El clima, la efeméride, la farmacia y Participá no llevan foto | Fondo de foto a 1080 × 1920 con el titular encima (la foto con degradé oscuro abajo para el texto); las notas necesitan una foto de buena resolución: ver `docs/3-0/FOTOS-ORIGINALES-PROPUESTA.md`. El manual dice que las placas no tienen zoom: decidir si el movimiento lento se permite |

*Antes de cambiar nada de esto hay que mirar `docs/3-0/INFORME-REELS-DINAMICOS.md` (híbrido: ffmpeg para fondo, voz y música; HyperFrames para texto y números) y elegir los estilos con Hernán: las propuestas de 3 estilos por pieza todavía no se hicieron (`PLAN-DE-TRABAJO-17-11.md` § 4).*

### C.2 Nota del clima de la mañana y de la noche

- **Hoy:** una nota por día, id `clima-AAAA-MM-DD`, a las 7:30, con `noindex`. La función de la plantilla ya acepta una «edición» (mañana o noche) y existe una **revisión de las 19** escrita pero apagada.
- **Recomendación:** mantener **una sola página por día** (misma dirección) y que a las 20:00 se **actualice** con una segunda edición («Cómo sigue la noche y el mañana»), en vez de crear una nota nueva. Sale con la plantilla del código (sin IA) o con una sola llamada barata de Gemini (el tope del clima es de 4 pedidos por día). Se queda en `noindex`: son datos que cambian cada día y, repetidos 365 veces, restan en AdSense.

### C.3 Notas de los tres podcasts (repasos)

- **Hoy:** el repaso es sólo un video que lleva a las tres notas; el 3/11 se decidió que no hacía falta una nota aparte.
- **Recomendación para AdSense:** **no** crear tres notas por día (serían 1.000 páginas finas al año que repiten lo que ya dicen las notas). Una **única página diaria** `/repaso/AAAA-MM-DD` con los tres videos incrustados, el título y la bajada de cada nota con su enlace, `noindex` y sin avisos publicitarios, que se arme sola. Si Hernán prefiere notas sueltas, que sean **una por día** («Lo más leído del día», con 3 notas y un párrafo propio por cada una).

### C.4 Página de turnos de farmacia

- **Hoy:** `/farmacias` ya está al día (de turno hoy, hasta las 8:30 de mañana; calendario hasta el fin del mes; datos estructurados).
- **Comparación (según los datos del código):**
  - *Nota diaria:* 365 páginas casi iguales (nombre y dirección cambian, el resto no). **Contenido fino repetido**: lo que AdSense llama bajo valor. No.
  - *Nota semanal:* 52 páginas por año, con el cronograma de 7 días. Mejor, pero el cronograma ya cambia mes a mes en la misma página.
  - *Sólo la página:* una dirección que se mantiene, gana autoridad y se actualiza sola.
- **Recomendación:** **sólo la página `/farmacias`**, mejorada (turno de hoy arriba, calendario del mes, ficha de cada farmacia con dirección, teléfono y mapa, y la hora real hasta la que rige el turno) **más una nota mensual** («Farmacias de turno en Balcarce, noviembre 2026: el calendario completo»), indexable, con la tabla del mes. Esa nota es útil, se busca y sale 12 veces por año.

---

## D. Ideas nuevas: a diseñar (no hay nada de esto en el código)

| Idea | Qué sería | Qué falta decidir |
|---|---|---|
| **Datos curiosos y novedades, con animación original** | Un reel corto (15 a 20 s) con una cifra o un dato curioso animado (gráfico propio, no foto de otro medio), con la misma voz y el zócalo único. Puede salir de las 17 fuentes de tecnología y ciencia o de datos propios | Frecuencia (¿semanal?), de dónde sale el dato (fuente verificable), quién lo revisa, si lleva nota en el sitio |
| **Reels y notas a partir de videos de YouTube** (canal de sehace.com, 2 videos largos por semana) | De cada video largo salen: un reel corto con un fragmento (con el permiso del dueño: es el canal de Hernán), una nota de Tecnología firmada por Hernán con la transcripción resumida y el video incrustado, y un posteo con el enlace | Cómo se baja y se corta el video (no hay herramienta en 3.0), quién escribe la nota (Hernán firma sólo si es suyo), cuánto texto propio hace falta para que no sea «contenido de bajo valor», si se publica en el sitio de Radar o en sehace.com |

---

## E. Decisiones que necesita Hernán

1. ¿El repaso tiene que salir **siempre con 3**, aunque haya que repetir una nota que ya salió como posteo o completar con la de ayer? (cambia la regla «una nota, un formato»).
2. ¿Qué **estilos** de reel se eligen (B, D, E, F, G, H del lienzo del 15/11) y cuántos se turnan?
3. ¿Los **subtítulos «siempre»** incluyen a las piezas sin voz?
4. ¿La **nota del clima** de la noche es una **actualización** de la misma página (recomendado) o una nota nueva?
5. ¿**Una página diaria de repasos** (recomendado) o tres notas?
6. ¿Farmacias: **sólo la página + una nota mensual** (recomendado) o también semanal?
7. **Efemérides de abril en adelante:** ¿se arman con Claude antes del 20/11, o se deja el armado automático (sus piezas necesitan revisión)?
8. ¿Se vuelve a prender la **agenda** (reel y carrusel del jueves) o se saca definitivamente? Sigue pausada hasta tener contactos y eventos.
