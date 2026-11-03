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

**Repaso (mañana, tarde, noche)** — video 9:16, **máximo 3 notas** (con 3, **30 s**; con 2, 21 s; nunca menos de 2). Las placas de hoy: la lista numerada de tapa (cuadro 0, medio segundo), una placa de **9 s por nota** (foto con su
crédito, sección en su color, «1 de 3», rayitas, titular de hasta 90 caracteres) y la lista otra vez al final (3 s, «Todo en Radar Balcarce punto com»). La voz alterna (locutor de mañana y noche, locutora de tarde).
**Lo de Balcarce va primero y tiene que haber al menos una nota de Balcarce** (si no, no se arma). Sin música.

**Efeméride corta («Un día como hoy»)** — video 9:16, **15 s**, voz de la locutora, **a prueba una semana** (Hernán, 3/11). La escena de hoy: el año grande en el color de su tipo que corre hacia atrás, el título, una sola
oración del hecho y **un solo «Y además»** (el de hoy dice hasta tres; acá, uno). **Sólo la principal va en el video**; las otras quedan en la nota de la web. La voz dice «También, en …». Nunca la foto de un menor ni de una víctima.

**Nota de Balcarce o nacional (reel)** — video 9:16, **25 s**: tres placas del repaso (8, 8,5 y 8,5 s): la primera con el titular y la foto, y dos con el hecho en frases (el titular de cada una es esa frase), cada una con su
crédito abajo. El rótulo es «Noticia de Balcarce» o «Noticia del día» y el color es **el de la sección de la nota**. La voz arranca con un gancho de 8 palabras o menos y cierra «La nota completa, en Radar Balcarce punto com».
(Hoy no hay reel de una sola nota: se basó en el de la nota propia de Halloween.)

**Nota propia (la que manda Hernán)** — video 9:16, **como salió la de Halloween**: rótulo «Nota de Radar Balcarce», una placa por foto (**de 1 a 3: la de portada y las de adentro**), con el titular de la nota en la primera y una frase en cada
una, el crédito de la foto y, **a la derecha de la fila del crédito, «Por Hernán Accomo»** (el único retoque). Con una foto dura 14 s, con dos 22 y con tres 30 (nunca más de 35). **Lleva la sección que le corresponde**,
no «Nota propia». Cierra con la voz: «La nota completa, con todas las fotos, en Radar Balcarce punto com». Nada sale sin el «ok» de Hernán (`requiereOkDeHernan`).

**Historia de nota** — video 9:16 **sin voz**, 6 s, animado: la placa de nota del repaso (foto con su crédito, sección, titular) con «Nota completa» y «Link en la bio» arriba (la API no deja el sticker de enlace). Una por cada nota de Balcarce.

**Posteo de feed (4:5)** — *(le gustó, queda)* imagen 1080 × 1350 en oscuro: la foto **entera** sobre el fondo de la marca (con los anillos del radar), la sección, el titular (dentro del cuadrado central, para que sirva también recortado a 1:1) y la
firma. Una sola imagen para Facebook e Instagram. Sin foto no se arma.

**Carrusel** — *(le gustó, queda)* de **3 a 10 láminas** de 1080 × 1350 (el tope de 10 es el de la API de Instagram), en oscuro: la portada primero (foto, titular, «Deslizá →»), una lámina por foto con su epígrafe, y la última con «La nota completa»
y el botón del sitio. Hacen falta 3 fotos o más; no se rellena para llegar. Todas del mismo tamaño.

**Farmacia de turno** — video 9:16, **14 s**, voz del locutor. La escena de hoy: la cruz verde que late, una ficha por farmacia (hasta 3) con la dirección **escrita y dicha sin «N°»** («Calle 17, 537») y su teléfono, y la franja verde «De turno hasta mañana a las 8:30».
Color de Farmacias.

**Participá** — video 9:16, **18 s**, voz alterna. La escena de hoy: la pregunta grande, la franja verde del WhatsApp con el número **2266 51-1612** que se tipea (la voz lo dice dígito por dígito), el sobre con el mail y los dos pies.
Las cuatro variantes de hoy (noticia, evento, reclamo, nota) y una quinta, «¿qué querés que contemos?», con el mismo formato. Las fotos de la gente: todavía no (Hernán: después).

**Imagen de enlace (X, Threads, Bluesky)** — imagen 1080 × 565 (1,91:1; se ve completa también en 16:9 y 2:1): la foto a la izquierda, la sección, el titular y la firma a la derecha. Legible aunque se vea chica.

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
