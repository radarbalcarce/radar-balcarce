# Las piezas animadas de redes: las reglas

*Módulo `v3/redes/piezas/` (Radar 3.0, etapa D). Arma, como datos, cada pieza de las redes y la dibuja con el motor de siempre (resvg + ffmpeg). **No publica nada, no pide la voz y
no usa claves.** Escrito el 3/11/2026 con `docs/propuestas/REDES-3-0-FORMATOS.md` y las respuestas de Hernán del 3/11 (`PLAN-RADAR-3-0.md`, sección 10). Si el programa hace otra cosa que
esto, el programa está mal. Los números están todos en `variables.mjs`.*

## 1. Lo que vale para todas

- **Todas las piezas de video llevan una animación breve:** cada cosa entra sola (sube un poco y se aclara) en menos de un segundo, y las escenas se funden una con otra. No hay placas quietas.
- **Una sola zona segura** para todo lo vertical (1080 × 1920): el texto va **entre x 80 y 890 y entre y 270 y 1250** (arriba no, por el nombre de la cuenta; abajo no, por el texto del posteo y la
  música; a la derecha no, por los botones). **La firma «Radar Balcarce» y la dirección están juntas en la fila 1216** (la raya en la 1150), dentro de esa caja, y **debajo de ella no hay nada de texto**.
  La barra roja de avance sí queda más abajo: es adorno, y si la tapan no pasa nada. Una prueba mira todos los textos de todas las escenas.
- **Letra:** titulares de 64 px o más; el resto, de 40 o más; los créditos de las fotos y los rótulos chicos, de 28 a 30. Las cifras grandes (la temperatura, el año), de 220 a 320.
- **La foto de una nota** va entera o recortada con el crédito **debajo** (nunca encima de la foto, nunca una marca de agua). La foto de feed (4:5) va siempre **entera** sobre el fondo de la marca.
- **Todo lo que habla lleva el aviso** «Voz generada con inteligencia artificial.» en el texto del posteo; las que no hablan, no.
- **Saludos (Hernán, 3/11): sólo la primera pieza de la mañana y la primera de la noche.** Mañana es de 5:00 a 11:59 («Buen día, Balcarce.») y noche de 19:00 a 4:59 («Buenas noches, Balcarce.»); de tarde
  ninguna saluda. Cuál es «la primera» lo dice quien llama (`primeraDelBloque`): el armador no mira un reloj ni lo ya publicado.
- **El guion es breve:** 2,5 palabras por segundo, menos 1,65 s de adorno al final. Si el texto no entra, los datos de una nota se acortan en una oración entera (nunca a la mitad de una palabra).
  La voz de cada escena es el pedazo de guion que le toca; cuando haya audio de verdad, las duraciones se ajustan a lo que mida.
- **Sin música por ahora** (Hernán: después). Cada pieza deja el lugar: `musica = { activa: no, dbBajoLaVoz: −18, suboAlCierreDb: +6, pista: ninguna }`, y el renderizador sabe mezclar una pista
  a −18 dB con 0,5 s de entrada y 1 s de salida cuando se le pase.
- **Nada de muertes de menores, suicidios ni chicos graves** y nada rojo: eso lo decide la compuerta de tono (R41) **antes** de llegar acá; las piezas no la repiten.
- **Las notas propias llevan su sección**, como cualquier nota (Hernán, 3/11): nunca dice «Nota propia» en ninguna escena, en el guion ni en el texto en pantalla.

## 2. Pieza por pieza

**Clima (mañana o noche)** — video 9:16, **18 s** (entre 15 y 20), voz de la locutora. Cuatro escenas: (1) *ahora*, 3 s: la fecha, la temperatura grande que «cuenta» hasta su valor, el cielo y su ícono;
(2) *el día*, 6 s: lo que importa del día en una frase grande (lluvia, frío, calor, viento o «un buen día») y la sensación térmica con el viento; (3) *los datos*, 5 s: máxima, mínima y lluvia en tres cajas
(de noche cuenta **cómo amanece mañana**); (4) *cierre*, 4 s: «Que tengan un buen día» o «Que descansen», «Mandáselo a alguien…» y `radarbalcarce.com/clima`. Saluda sólo si es la primera del bloque.

**Clima auspiciado** — el mismo clima **con 4 segundos más (22 s)**. **La mención va al inicio:** la primera escena es el auspicio («el clima de hoy lo auspicia [comercio]», y la cuenta de Instagram dicha como
«arroba …») y **desde el segundo 3 queda fija, en todas las escenas, la franja «Auspicia: comercio · @cuenta»** arriba de la firma (≥ 30 px, dentro de la caja segura). La voz lo dice antes que el tiempo.
Un solo auspiciante por clima. Los demás datos del clima no cambian.

**Repaso (mañana, tarde, noche)** — video 9:16, **máximo 3 notas** (con 3, **30 s**; con 2, 22 s; nunca menos de 2), la voz alterna (locutor de mañana y noche, locutora de tarde). Apertura de 3 s («Repaso de la mañana» y
el número de noticias), **una escena de 8 s por nota** (foto con su crédito, sección en su color, «1 de 3», titular de hasta 90 caracteres) y cierre de 3 s con **los titulares** y «Todo en Radar Balcarce punto com».
**Lo de Balcarce va primero y tiene que haber al menos una nota de Balcarce** (si no, no se arma). Sin música.

**Efeméride corta («Un día como hoy»)** — video 9:16, **15 s**, voz de la locutora, **a prueba una semana** (Hernán, 3/11). Tres escenas: el año grande que «cuenta» y «Hace N años» (4 s), el hecho principal con su
título y una sola oración (6 s), y **un solo «También»** con otro año y otro dato (5 s). **Sólo la principal va en el video**; las otras quedan en la nota de la web. Si hay una imagen de archivo con licencia libre o una
ilustración, va en la escena del hecho con su crédito (nunca la foto de un menor ni de una víctima). Color de Cultura y agenda.

**Nota de Balcarce o nacional (reel)** — video 9:16, **25 s**: el titular grande con la foto (3 s), el hecho en tres frases con la foto y su crédito abajo (dos escenas, 8 y 9 s) y el cierre «La nota completa, en Radar
Balcarce punto com» con el botón del sitio (5 s). El rótulo y el color son los de **la sección de la nota**. La voz arranca con un gancho de 8 palabras o menos (el título si es corto, o lo que va antes de los dos puntos).

**Nota propia (la que manda Hernán)** — video 9:16, **35 s** (nunca más de 45): la portada (3 s: sección, titular, foto y la firma «Hernán Accomo» con el ícono del medio), **una escena por foto** (hasta 5, de 4,5 a 9 s, con
una frase de la nota y el epígrafe de la foto), y el cierre (5 s) con el botón del sitio y la firma. **Lleva la sección que le corresponde**, no «Nota propia». Nada sale sin el «ok» de Hernán (`requiereOkDeHernan`).

**Historia de nota** — video 9:16 **sin voz**, 6 s, animado: la sección, la foto con su crédito, el titular y «Nota completa: link en la bio» (la API no deja el sticker de enlace). Una por cada nota de Balcarce.

**Posteo de feed (4:5)** — imagen 1080 × 1350: la foto **entera** sobre el fondo de la marca (con los anillos del radar), la sección, el titular (dentro del cuadrado central, para que sirva también recortado a 1:1) y la
firma. Una sola imagen para Facebook e Instagram. Sin foto no se arma.

**Carrusel** — de **3 a 10 láminas** de 1080 × 1350 (el tope de 10 es el de la API de Instagram): la portada primero (foto, titular, «Deslizá →»), una lámina por foto con su epígrafe, y la última con «La nota completa»
y el botón del sitio. Hacen falta 3 fotos o más; no se rellena para llegar. Todas del mismo tamaño.

**Farmacia de turno** — video 9:16, **14 s**, voz del locutor: «Farmacia de turno esta noche» con los nombres (3 s), cada dirección **dicha y escrita grande, sin «N°»** («Calle 17, 537») con su teléfono (7 s) y
«Guardá el dato» con «Turno hasta mañana a las 8:30» (4 s). Hasta 3 farmacias. Color de Farmacias.

**Participá** — video 9:16, **18 s**, voz alterna. Una pregunta que invita (4 s), el ejemplo con tres cosas que se pueden mandar (7 s), cómo mandarlo («Escribinos por WhatsApp» en la franja verde con el número **2266 51-1612**,
dicho dígito por dígito, 5 s) y «Con tu foto o tu audio alcanza» (2 s). Cinco variantes: tu noticia, tu evento o emprendimiento, tu reclamo, tu nota y «¿qué querés que contemos?». Las fotos de la gente: todavía no (Hernán: después).

**Imagen de enlace (X, Threads, Bluesky)** — imagen 1080 × 565 (1,91:1; se ve completa también en 16:9 y 2:1): la foto a la izquierda, la sección, el titular y la firma a la derecha. Legible aunque se vea chica.

## 3. Qué hace y qué no hace este módulo

- **Hace:** decidir las escenas, sus duraciones, el texto que se ve y el guion de voz de cada pieza; dibujarlas (cuadro por cuadro con las mismas animaciones de entrada de las escenas de hoy) y dejar un mp4 **mudo**
  (con una pista de silencio de 48 kHz para que las apps lo acepten) o un PNG.
- **No hace:** pedir la voz (no gasta cupo), mezclar música (hay lugar, no hay pista), subir nada a ninguna red, elegir qué nota va ni a qué hora (eso es de `v3/redes/elegir.mjs` y del reloj), ni los subtítulos
  quemados (necesitan los tiempos de la voz de verdad). Tampoco hace todavía la nota propia con el video de Hernán ni los avisos de clima por helada o granizo.
- **Los datos entran armados por quien llama:** la nota con la forma de `v3/nucleo/CONTRATO.md` (`titulo`, `bajada`, `cuerpo` en párrafos, `seccion`, `firma`, `foto: { url | ruta | datos, credito }`), el clima de
  `portada.json` o de Open-Meteo, el auspicio `{ comercio, cuenta }` y la efeméride de `efemerides-piezas.json`. El renderizador baja las fotos por `url` o las lee de `ruta`.

## 4. Cómo se prueba

`node --test "v3/redes/piezas/*.test.mjs"` (sin red ni archivos). Miran: las escenas y las duraciones de cada pieza, que el guion entre en el presupuesto de voz, los saludos según la hora, la sección de la nota propia,
el auspicio al inicio con su franja desde el segundo 3, el máximo de 3 notas del repaso y la zona segura (ningún texto fuera de la caja ni debajo de la fila de la firma).
Para ver cómo quedan: `node v3/redes/piezas/ejemplos.mjs` (ver el comando y las opciones al principio del archivo).
