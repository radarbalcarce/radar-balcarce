# Las piezas animadas de redes: las reglas

*Módulo `v3/redes/piezas/` (Radar 3.0, etapa D). Arma, como datos, cada pieza de las redes y la dibuja con el motor de siempre (resvg + ffmpeg). **No publica nada, no pide la voz y
no usa claves** (eso lo hace `correr.mjs`, que arma estas piezas en GitHub Actions con la voz y las publica o las deja en ensayo: `../REGLAS.md` § 11). Escrito el 3/11/2026 con `docs/propuestas/REDES-3-0-FORMATOS.md` y las respuestas de Hernán del 3/11 (`PLAN-RADAR-3-0.md`, sección 10); **rehecho ese mismo día después
de que Hernán viera los primeros ejemplos** («muy comprimido, todo para arriba; mucho mejor la que está hoy, el formato de hoy; más visual, aunque Facebook tape algún texto»): los
videos usan **las escenas de hoy tal cual** (`reels/escenas/`, `reels/placa.mjs`, `reels/animacion.mjs`) y este módulo sólo suma lo nuevo. Si el programa hace otra cosa que
esto, el programa está mal. Los números están todos en `variables.mjs`.*

## 1. Lo que vale para todas

- **El dibujo es el de hoy.** Clima, efeméride, farmacia y Participá son **una sola escena entera** de `reels/escenas/` (`escenaDeClima`, `escenaDeEfemeride`, `escenaDeFarmacia`,
  `escenaDeParticipa`); el repaso, la nota y la nota propia son una **secuencia de placas del repaso** (`placaDeNotaDelRepaso`, `placaRepaso`, `escenaDelRepaso`): la foto con su crédito
  abajo, la sección en su color, el titular que entra palabra por palabra, las rayitas de avance y la deriva lenta de la foto. **La primera imagen del reel (la tapa) es la de hoy**: el
  cuadro 0 es la escena ya compuesta (en el repaso, la lista numerada). Lo único nuevo en pantalla: la franja del auspicio, la firma de la nota propia y el «Link en la bio» de la historia.
- **Todas las piezas de video se animan** con las entradas de hoy (cada cosa sube un poco y se aclara en menos de un segundo; el cielo y la lluvia del clima se mueven todo el tiempo) y
  llevan la barra roja de avance abajo. No hay placas quietas.
- **Zona segura relajada (3/11).** No se comprime nada hacia arriba: el margen es el de hoy (72 px), el contenido llega hasta la fila 1440, la raya de la firma y «Radar Balcarce ·
  radarbalcarce.com» quedan **donde están hoy (filas 1478 a 1544)** —ya arriba del texto del posteo, que tapa más o menos los 250 px de abajo (desde la fila 1670)— y los subtítulos, donde
  siempre (fila 1660). **Lo único que se vigila es que ningún texto importante pase de la fila 1670**; si Facebook o Instagram tapan algo, se acepta. La barra roja sí queda en esos 250 px: es
  adorno. Una prueba mira todos los textos de todas las piezas.
- **La foto de una nota** va recortada en su caja con el crédito **debajo** (nunca encima de la foto, nunca una marca de agua). La foto de feed (4:5) va siempre **entera** sobre el fondo de la marca.
- **Todo lo que habla lleva el aviso** «Voz generada con inteligencia artificial.» en el texto del posteo; las que no hablan, no.
- **Saludos (Hernán, 3/11): sólo la primera pieza de la mañana y la primera de la noche.** Mañana es de 5:00 a 11:59 («Buen día, Balcarce.») y noche de 19:00 a 4:59 («Buenas noches, Balcarce.»); de tarde
  ninguna saluda. Cuál es «la primera» lo dice quien llama (`primeraDelBloque`): el armador no mira un reloj ni lo ya publicado.
- **El guion es breve:** 2,5 palabras por segundo, menos 1,65 s de adorno al final. Si el texto no entra, los datos de una nota se acortan en una oración entera (nunca a la mitad de una palabra).
  La voz de cada escena es el pedazo de guion que le toca; cuando haya audio de verdad, las placas entran cuando la voz llega a su `marca` (como hoy, `placasConTiempos`) y las duraciones se ajustan a lo que mida.
- **Subtítulos:** son los de hoy (Inter 64, fila 1660, la palabra que se dice en ámbar) y salen de los tiempos de la voz. En los ejemplos mudos se queman con **tiempos estimados** (`subtitulosEstimados`)
  sólo para ver cómo queda la pantalla.
- **Sin música por ahora** (Hernán: después). Cada pieza deja el lugar: `musica = { activa: no, dbBajoLaVoz: −18, suboAlCierreDb: +6, pista: ninguna }`, y el renderizador sabe mezclar una pista
  a −18 dB con 0,5 s de entrada y 1 s de salida cuando se le pase.
- **Nada de muertes de menores, suicidios ni chicos graves** y nada rojo: eso lo decide la compuerta de tono (R41) **antes** de llegar acá; las piezas no la repiten.
- **Las notas propias llevan su sección**, como cualquier nota (Hernán, 3/11): nunca dice «Nota propia» en ninguna escena, en el guion ni en el texto en pantalla.

## 2. Pieza por pieza

**Clima (mañana o noche)** — video 9:16, **18 s** (entre 15 y 20), voz de la locutora. Es **la escena de hoy entera**: la cabecera («Hoy en Balcarce» y la fecha), el panel con el cielo que se
mueve y la temperatura que cuenta hasta su valor, y los días que siguen (de noche, «Así sigue la noche» con la tarjeta oscura y la luna). El guion: ahora, lo que importa del día, máxima, mínima y lluvia, y el cierre
(«Que tengan un buen día» o «Que descansen»). Saluda sólo si es la primera del bloque. Las variantes de cielo y los avisos (helada, granizo, viento) son los de hoy.

**Clima auspiciado** — el mismo clima **con 4 segundos más (22 s)**. **La mención va al inicio del guion** («el clima de hoy lo auspicia [comercio]», y la cuenta de Instagram dicha como «arroba …») y **desde
el segundo 3 queda fija, hasta el final, la franja ámbar «Auspicia · comercio · @cuenta»** (la del mockup `docs/propuestas/redes-3-0/png/02-clima-auspiciado.png`: fondo crema, borde ámbar, una línea). Va en la fila
1568, **entre la firma de la placa de hoy y los subtítulos**: no toca nada del diseño. Antes del segundo 3 la escena es idéntica a la de hoy. Un solo auspiciante por clima. Un nombre largo achica la letra y, si hace falta, se acorta.

**Repaso (mañana, tarde, noche)** — video 9:16, **siempre 3 notas** (con 3, **30 s**; con 2, 21 s, sólo si no hubo cómo llegar a 3 sin repetir —y queda anotado—; nunca menos de 2: `../REGLAS.md` § 21). Las placas de hoy: la lista numerada de tapa (cuadro 0, medio segundo), una placa de **9 s por nota** (foto con su
crédito, sección en su color, «1 de 3», rayitas, titular entero: la letra se achica hasta un mínimo y, si no entra, su forma completa más corta; nunca «…»: `../REGLAS.md` § 22) y la lista otra vez al final (3 s, «Todo en Radar Balcarce punto com»). La voz alterna (locutor de mañana y noche, locutora de tarde).
**Lo de Balcarce va primero y tiene que haber al menos una nota de Balcarce** (si no, no se arma). Sin música.

**Efeméride («Un día como hoy»)** — video 9:16, **de 15 a 40 s según la voz**, voz de la locutora (Hernán, 20/11: «cuenta sólo una cosa»). **Una escena por cada hecho que dice la voz:** el principal y todos los «además» del día (hasta 3), cada uno con su año grande (o «HOY» si no tiene año), su texto corto y su foto de Commons (elegida de antemano, la de Wikipedia o la búsqueda estricta). Un hecho sin foto no sale en la pieza (REGLAS § 27); sin foto el principal, la pieza no sale y se avisa. La voz dice «También, en …», «En …» y «Además, …»; el armador (`armarEfemeride`) recorta «además» desde el final si no entran en `EFEMERIDE.maximo` (40 s, ~95 palabras) y la voz tampoco los dice: no puede decir algo que no se ve. Nunca la foto de un menor ni de una víctima.

**Nota de Balcarce o nacional (reel)** — video 9:16, **25 s**: tres placas del repaso (8, 8,5 y 8,5 s): la primera con el titular y la foto, y dos con el hecho en frases (el titular de cada una es esa frase), cada una con su
crédito abajo. El rótulo es «Noticia de Balcarce» o «Noticia del día» y el color es **el de la sección de la nota**. La voz arranca con un gancho de 8 palabras o menos y cierra «La nota completa, en Radar Balcarce punto com».
(Hoy no hay reel de una sola nota: se basó en el de la nota propia de Halloween.)

**Nota propia (la que manda Hernán)** — video 9:16, **como salió la de Halloween**: rótulo «Nota de Radar Balcarce», una placa por foto (**de 1 a 3: la de portada y las de adentro**), con el titular de la nota en la primera y una frase en cada
una, el crédito de la foto y, **a la derecha de la fila del crédito, «Por Hernán Accomo»** (el único retoque). Con una foto dura 14 s, con dos 22 y con tres 30 (nunca más de 35). **Lleva la sección que le corresponde**,
no «Nota propia». Cierra con la voz: «La nota completa, con todas las fotos, en Radar Balcarce punto com». Nada sale sin el «ok» de Hernán (`requiereOkDeHernan`).

**Historia de nota** — video 9:16 **sin voz**, 6 s, animado: la placa de nota del repaso (foto con su crédito, sección, titular) con «Nota completa» y «Link en la bio» arriba (la API no deja el sticker de enlace). Una por cada nota de Balcarce.

**Posteo de feed (4:5)** — *(le gustó, queda)* imagen 1080 × 1350 en oscuro: la foto **entera** sobre el fondo de la marca (con los anillos del radar), la sección, el titular (dentro del cuadrado central, para que sirva también recortado a 1:1) y la
firma. Una sola imagen para Facebook e Instagram. Sin foto no se arma, salvo una nota de Balcarce (§ 5 bis).

**Carrusel** — *(le gustó, queda)* de **3 a 10 láminas** de 1080 × 1350 (el tope de 10 es el de la API de Instagram), en oscuro: la portada primero (foto, titular, «Deslizá →»), una lámina por foto con su epígrafe, y la última con «La nota completa»
y el botón del sitio. Hacen falta 3 fotos o más; no se rellena para llegar. Todas del mismo tamaño.

**Farmacia de turno** — video 9:16, **14 s** (hasta 20 si con tres fichas la voz es más larga), voz del locutor. La escena de hoy: la cruz verde que late, una ficha por farmacia (de 1 a 3; con más la pieza falla: `../REGLAS.md` § 23) con la dirección **escrita y dicha sin «N°»** («Calle 17, 537») y su teléfono, y la franja verde «De turno hasta mañana a las 8:30».
Color de Farmacias.

**Participá** — video 9:16, **18 s**, voz alterna. La escena de hoy: la pregunta grande, la franja verde del WhatsApp con el número **2266 51-1612** que se tipea (la voz lo dice dígito por dígito), el sobre con el mail y los dos pies.
Las cuatro variantes de hoy (noticia, evento, reclamo, nota) y una quinta, «¿qué querés que contemos?», con el mismo formato. Las fotos de la gente: todavía no (Hernán: después).

**Imagen de enlace (X, Threads, Bluesky)** — imagen 1080 × 565 (1,91:1; se ve completa también en 16:9 y 2:1): la foto a la izquierda, la sección, el titular y la firma a la derecha. Legible aunque se vea chica.

**El número del día** (20/11/2026) — reel de unos 13 segundos, todos los días a las 13:00 (ventana de 3 horas), con voz y el aviso de voz generada. **Prendido el 20/11/2026** (nació pausado con `pausada: true` en su fila de `piezas-del-dia.mjs`): sale sólo si se la saca o se la pide a mano con `solo`. Lo decide el Worker (`datos-de-nota.mjs`, `numeroDelDia`): de las notas de las últimas 24 horas que ninguna otra pieza usó hoy, pasan por la misma compuerta que los repasos (freno legal, servicio, tono R41, edad, y además nada de Policiales ni de menores) y se queda la de **cifra más fuerte** de `ficha.numeros`: 100 puntos si trae la cifra y la anterior (misma unidad, que hablen de lo mismo; se dibujan dos barras), 70 si trae una variación en porcentaje del mismo tema, 30 si es una cifra sola con una unidad que dice algo (plata, porcentajes, personas, hectáreas; no goles ni votos) y figura en el titular o la bajada. A igualdad, Balcarce y después la más nueva. **Sin cifra que valga ese día, no sale**: no se reserva, no gasta voz y se anota `sin-numero-fuerte`. Prioridad de voz baja (5, con un margen de 2 audios: si queda poco cupo, no le saca lugar al repaso, al clima ni a la efeméride). Texto del posteo: el titular, la fuente de la cifra y el enlace a la nota. Pruebas: `datos-de-nota.test.mjs`, `piezas-plan.test.mjs`, `correr.test.mjs`.

## 3. Qué hace y qué no hace este módulo

- **Hace:** decidir las escenas, sus duraciones, el texto que se ve y el guion de voz de cada pieza; dibujarlas (cuadro por cuadro, con las mismas animaciones de las escenas de hoy) y dejar un mp4 **mudo**
  (con una pista de silencio de 48 kHz para que las apps lo acepten) o un PNG.
- **No hace:** pedir la voz (no gasta cupo), mezclar música (hay lugar, no hay pista), subir nada a ninguna red, elegir qué nota va ni a qué hora (eso es de `v3/redes/elegir.mjs` y del reloj), ni los subtítulos
  con los tiempos de la voz de verdad (los de los ejemplos son estimados). Tampoco hace todavía la nota propia con el video de Hernán ni los avisos de clima por helada o granizo con auspicio.
- **Los datos entran armados por quien llama:** la nota con la forma de `v3/nucleo/CONTRATO.md` (`titulo`, `bajada`, `cuerpo` en párrafos, `seccion`, `firma`, `foto: { url | ruta | datos, credito }`), el clima de
  `portada.json` o de Open-Meteo (con la `fecha` AAAA-MM-DD de cada día), el auspicio `{ comercio, cuenta }` y la efeméride de `efemerides-piezas.json`. El renderizador baja las fotos por `url` o las lee de `ruta`.
- **No modifica `reels/`, `redes/` ni `web/`: los importa.** Si una escena de hoy cambia, las piezas cambian con ella.

## 4. Cómo se prueba

`node --test "v3/redes/piezas/*.test.mjs"` (sin red ni archivos). Miran: las escenas y las duraciones de cada pieza, que el guion entre en el presupuesto de voz, los saludos según la hora, la sección de la nota
propia y su firma, el auspicio al inicio con su franja desde el segundo 3 (y que antes sea idéntico al clima de hoy), el máximo de 3 notas del repaso, de 1 a 3 fotos en la nota propia y la zona segura relajada
(ningún texto pasa de la fila 1670).
Para ver cómo quedan: `node v3/redes/piezas/ejemplos.mjs` (ver el comando y las opciones al principio del archivo).

## 5. Nota sin foto en la lista del repaso (Hernán, 6/11)

En la tapa del repaso, la miniatura de una nota sin foto es **la placa de su sección** (el color de la sección con su nombre en blanco, `placaMiniaturaDeSeccion`), nunca un número suelto. Prueba: `piezas.test.mjs`.

## 5 bis. Una nota de Balcarce sin imagen, en el posteo y en el enlace (Hernán, 6/11)

Una nota **de Balcarce** (`deBalcarce`, según el motivo del núcleo, o la sección Balcarce) que no tiene **ninguna** imagen (ni foto de las fuentes ni ilustración) se arma igual: `armarPosteo` (4:5) y
`armarEnlace` (1,91:1) dibujan **la placa de su sección** (el color con el nombre en blanco: `placaDeSeccion`, y en el enlace `placaDeSeccionEnCaja`) en lugar de la foto, con el mismo titular, bajada y pie.
Sin la pastilla sobre la foto (la placa ya dice la sección) y sin crédito. **Lo de afuera sin foto sigue sin armarse** (`posteo: sin foto no va`). El camino completo: `motivoDeExclusion(…, { conPlaca })`
(`elegir.mjs`) no la descarta por «sin-foto» cuando el posteo sale con placa; `candidatas` la lista con `deBalcarce`; el programa de piezas (`posteos.mjs`) la dibuja (una foto que **no bajó** sigue sin dibujarse y
se reintenta); `nombreDePlaca` y `conPlaca` ya aceptaban una nota sin foto; el plan de enlaces la toma si salió en Facebook. Pruebas: `piezas.test.mjs`, `elegir.test.mjs`, `posteos-placa.test.mjs`,
`servicios-nuevos.test.mjs`.

**Kit 3.0 (19/11, prendido con `KIT_3_0: si` en `v3-piezas.yml`; sacar esa línea lo apaga):** con `KIT_3_0=si` `correr.mjs` dibuja clima, repaso, efeméride, farmacias, reel de nota y nota propia con el kit nuevo de `v3/redes/kit3/` (HyperFrames); si falla, cae al dibujo de siempre y lo anota en el aviso del informe. Sin la variable no cambia nada. Reglas: `v3/redes/kit3/REGLAS.md`.

## 6. Los videos también van a Threads y Bluesky (20/11/2026)

El mp4 de cada pieza que va a TikTok sale además en Threads y Bluesky (`videos-sociales.mjs`), con su texto adaptado a 500 y 300 caracteres y siempre con el aviso de la voz con IA. Nunca cambia el estado de la pieza ni
la frena; se anota por red en `acciones`. Interruptores `THREADS_VIDEOS` y `BLUESKY_VIDEOS` en `v3-piezas.yml`. El detalle y los límites de cada API están en `../REGLAS.md` § 26.

## 7. Rehacer una pieza (20/11/2026)

Si una pieza ya publicada salió mal (por ejemplo la efeméride con una foto equivocada), se puede armar y publicar **una vez más hoy**, aunque esté fuera de su ventana. Es sólo a mano; el reloj nunca lo manda.

1. **Borrar la publicación vieja primero.** Facebook: workflow «Radar 3.0: borrar publicaciones». Instagram, TikTok, YouTube y X: a mano. Rehacer no borra nada.
2. Lanzar: `gh workflow run "Radar 3.0: piezas de redes" --repo radarbalcarce/radar-balcarce -f rehacer=efemeride` (el id es el de la tabla de `piezas-del-dia.mjs`; vale un solo id).
3. Usa los datos de hoy (la efeméride del día, las notas de ahora) y el cupo de voz normal: si no hay cupo, no sale y el plan lo dice (`sin-cupo-de-voz`); la publicación anterior queda como estaba en la base.
4. En la base, la fila anterior de esa pieza pasa a estado `rehecha` (el resumen del día y el panel no la cuentan) y la nueva es una fila más con su propio resultado. Un audio ya gastado sigue contando en el cupo; la memoria de voces evita pagarlo de nuevo si el guion es el mismo.
5. Tope: 3 rehechos por pieza y por día (`tope-de-rehechos`). Un id que no existe, una pieza de una nota (`reel-nota-…`) o las redes apagadas se rechazan con un error. Si esa pieza está armándose (reserva en curso, hasta 45 minutos), tampoco se pisa (`rehacer-en-curso`).
6. Con las redes apagadas no se usa: para ensayar siguen `solo` y `ahora`. Código: `rehacer` en `planear` (`piezas-plan.mjs`), `REHACER` en `piezas/correr.mjs`, `rehacer` en `v3-piezas.yml`. Para que valga hay que subir el workflow (push) y desplegar `redes`.
