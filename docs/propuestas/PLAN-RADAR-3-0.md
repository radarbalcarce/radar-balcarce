# Radar 3.0: rehacer el sistema de punta a punta

*Propuesta del 31/10/2026, para que Hernán y Andrés la lean, la corrijan y la aprueben antes de programar una línea. Nada de lo que
dice acá está hecho. Está escrita para personas, no para programadores: cada módulo dice qué hace, qué regla sigue y qué se tira.*

## 0. Lo que ya decidieron (no se vuelve a discutir)

- Balcarce entra todo. Lo nacional y provincial, sólo lo popular: lo que cuentan varios medios. Somos un diario más: si la noticia es
  popular, sale.
- **Se saca el semáforo.** Si las fuentes ya son medios serios, no hace falta un segundo filtro de palabras. Quedan sólo dos frenos de
  fondo, que no son editoriales sino legales: no identificar a un menor ni a una víctima, y no publicar listas de sepelios.
- Fútbol, F1 y cualquier otro tema se tratan como todo lo demás: ninguna sección tiene reglas propias.
- Ninguna nota del mismo hecho repetida en el sitio, ninguna foto compartida entre dos notas.
- Se paga una clave de IA (US$ 20 para empezar) y se deja de malabarear cupos gratis. Lo que no se publica no se escribe.
- Las redes siguen andando durante el cambio. El sitio puede quedar quieto dos o tres días si hace falta.
- Lo viejo no se hereda: se vuelve a pensar cada pedazo. Las pruebas viejas sirven sólo como lista de "esto ya pasó y no puede volver".

## 1. Siete principios que ordenan todo

1. **Primero elegir, después escribir.** Hoy se escriben notas que después no salen. En 3.0 la IA escribe únicamente lo que ya está
   decidido que se publica. Cero pedidos desperdiciados.
2. **Una sola manera de hacer cada cosa.** Una técnica para detectar repetidas (no cuatro), una regla para la foto, una clave de IA, una
   nube (Cloudflare), un lugar donde viven los datos.
3. **Cada módulo es una carpeta con tres cosas:** `REGLAS.md` (lo que hace, en castellano, para ustedes), el programa, y sus pruebas.
   Si mañana quieren hablar de Facebook, abren `redes/facebook/REGLAS.md` y ahí está todo lo de Facebook. La IA lee esos mismos archivos.
4. **El sitio no se recompila.** Cada página se arma cuando cambia su nota, no quinientas páginas cada media hora.
5. **Nada se inventa.** Todo lo que dice una nota está en alguna fuente; lo que no está, se saca. Las "cosas de más" (datos, cronología,
   gráficos) se arman por programa con los datos que la IA sacó de las fuentes, no con texto libre.
6. **Las piezas son una; las redes, varias.** Un reel es un reel. Después cada red decide si lo publica como reel, historia o video, con
   qué texto y a qué hora.
7. **Si algo falla, avisa a una persona y sigue.** Nada se traba esperando. Nada se reintenta diez veces gastando plata.

## 2. El mapa de carpetas

    nucleo/        fuentes → leer → agrupar repetidas → elegir → redactar → verificar → foto → guardar. Corre en un Worker de Cloudflare
    sitio/         el Worker que arma cada página al pedirla (portada, secciones, nota, archivo, buscador), con SEO y lugares para avisos
    redes/
      piezas/      lo común a todas las redes: placa, imagen de nota, reel con voz, infografía en imagen
      facebook/  instagram/  tiktok/  youtube/  x/  threads/     cada una con REGLAS.md + publicar.mjs
    redaccion/     notas propias: Telegram (audio, texto, foto), investigación, gacetillas por mail, agenda
    panel/         el panel del celular (queda, apuntando al sistema nuevo)
    vigilancia/    un Worker que mira que todo corra y avisa por Telegram; el informe diario corto
    docs/          un documento por módulo y este plan. Nada más

Dónde viven los datos: una base D1 de Cloudflare (gratis, es una base de datos de verdad) con las noticias leídas, los grupos, las
notas publicadas y las fotos. Las fotos y los videos, en R2. Se termina `web/data/*.json` en el repositorio y los commits "Datos de la
portada" cada media hora.

## 3. Módulo por módulo

### 3.1 Fuentes

Un solo archivo `fuentes.json`: nombre, dirección del feed, alcance (`balcarce` / `zona` / `nacional`), peso (1 a 3) y, si la
fuente lo trae, la sección que sugiere. **Nada más**: sin listas de palabras por fuente, sin reglas de sección por palabra. Lo que la
fuente no dice, lo decide la IA al redactar. Los ~125 feeds actuales pasan tal cual; se revisan una vez cuáles aportan (con el mismo
informe de hoy: cuánto trajo cada una en 30 días) y se apagan las que no.

### 3.2 Leer

Cada 15 minutos un Worker lee los feeds y guarda cada noticia nueva como una fila: dirección, título, bajada, fecha, foto, fuente. El
texto completo de la página se baja **sólo** para las noticias que van a entrar (3.4): hoy se baja todo y se usa poco.

### 3.3 Agrupar repetidas (una sola técnica)

Cada noticia nueva se convierte en una "huella de significado" (un vector; lo hace Workers AI de Cloudflare, gratis) y se compara con
las de las últimas 48 horas. Si se parece por encima de un umbral, se suma al grupo; si queda en la duda (una franja estrecha), una
pregunta de sí o no a la IA barata lo resuelve. Un grupo = una historia = una nota, con N fuentes. Una noticia que llega después se
suma al grupo que ya está, aunque la nota ya haya salido: se actualiza, no se duplica. Si a pesar de eso se publicaran dos notas del
mismo hecho, la segunda se une a la primera y redirige. Se tiran: el cruce, el cruce coherente, las huellas por palabras y el juez
del hecho principal.

### 3.4 Elegir (sin semáforo)

Dos preguntas, en orden:

1. **¿Es de Balcarce?** Fuente de alcance `balcarce`, o una fuente de la zona o nacional que nombra Balcarce o el partido en el
   título o la bajada. → **Entra.**
2. **¿Es nacional o provincial?** Entra si la cuentan **3 medios distintos** (2 en las áreas chicas: Tecnología, Ciencia, Salud,
   Educación, Cultura, Agro, Automovilismo). Esos dos números son los únicos del criterio y los cambian ustedes sin tocar código.

Nada más: sin listas de palabras sensibles, sin "internacional", sin "promocional", sin excepciones por sección. Los dos frenos legales
(menor o víctima identificable; lista de sepelios) los aplica la IA en el mismo pedido de redacción: si la historia es eso, no la
escribe y lo anota. Se tiran: las cinco luces del semáforo, `sueltaElAmarillo`, la lista internacional, los famosos muertos, etc.

Opcional (lo deciden ustedes): un **tope de notas nacionales por día** (por ejemplo 40); con tope, entran las más contadas. Sin tope,
como hoy (unas 120 notas por día en total).

Las notas automáticas de horarios y resultados (F1, fútbol, dólar, clima, farmacia) **no se escriben más como notas**: lo que sirve
(clima y farmacia) pasa a ser un cuadrito fijo de la portada; el resto se borra.

### 3.5 Redactar y verificar

Un solo pedido a la IA por historia, con las N fuentes completas (y un tope de letras por fuente), que devuelve un paquete:

- título, bajada y cuerpo (el largo depende de cuánto hay: 120 a 350 palabras; nunca relleno),
- sección (una de las 14) y etiquetas,
- la **ficha**: qué pasó, quién, dónde, cuándo, los números que aparecen, la cronología si hay, y una frase de lo que dice cada fuente,
- qué foto de las fuentes conviene y por qué (3.7),
- y una marca si la historia toca un menor o una víctima identificable, o es una lista de sepelios (no se publica).

Después, un segundo pedido, barato, de **verificación**: cada afirmación del cuerpo contra las fuentes. Lo que no está respaldado se
corrige o se saca; la nota no se tira (hoy una verificación BAJA la frena). Dos pedidos por nota publicada, cero por nota no
publicada. Con 120 notas por día y el modelo liviano pago (`gemini-3.1-flash-lite` o el equivalente del momento), el gasto estimado es
de **unos pocos dólares por mes**; se confirma con la lista de precios al armar y se pone un tope mensual en la cuenta.

El **prompt se escribe de nuevo**, con ustedes, en una sesión aparte (sección 4). No se hereda el § 12 actual.

### 3.6 Lo que hace a la nota nuestra (valor agregado)

Esto es lo que pediste para que las notas sean originales y Google las trate como tales, sin inventar nada. Se arma **por programa**
con la ficha de 3.5, nunca con texto libre de la IA:

- **«En dos líneas»**: el resumen de la ficha arriba del cuerpo.
- **«Los datos»**: un cuadro con los números y fechas que aparecen en las fuentes (montos, cantidades, horarios, lugares).
- **Cronología**, cuando el hecho tiene antes y después.
- **Gráfico** (barras o línea, en SVG, con los colores del sitio) cuando hay una serie de números (inflación, precios, casos, votos).
  Ese mismo gráfico sale como imagen para redes.
- **«Qué dicen las fuentes»**: las N fuentes con una frase de cada una y su enlace. Es la parte más original y la más honesta: ningún
  medio la hace.
- **«Antes en Radar»**: las notas nuestras anteriores sobre el mismo tema o lugar.
- **Contexto local** cuando la nota es nacional y toca a Balcarce (una línea, de la ficha o de notas nuestras anteriores).

Qué bloques aparecen depende de qué datos hay; una nota chica sale sin ninguno.

### 3.7 Fotos (una regla, en orden)

1. **La foto de una fuente** de esa misma historia, la de mejor tamaño y proporción, con el crédito en el epígrafe. En el mismo
   pedido de redacción la IA mira las fotos candidatas y dice: ¿tiene marca de agua o logo encima? ¿es de esta noticia o es de archivo?
   ¿muestra a un menor o a una víctima? Lo que no pasa, se descarta.
2. Si ninguna sirve, **una foto libre** buscada por nombre (Wikimedia Commons u Openverse, licencias libres) **sólo** si la IA de
   visión confirma que es la persona o el lugar correcto. Esto resuelve "Messi con otra foto que no usan todos", sin el riesgo de
   poner a la persona equivocada, que es por lo que hoy está prohibido.
3. Si no, **una ilustración con IA** (Workers AI, gratis) en el estilo del sitio, marcada «Ilustración».
4. La **placa** queda sólo para redes.

Cada foto publicada guarda una huella: **la misma foto no va en dos notas vivas** (la segunda busca otra o baja al paso siguiente).
Se tiran: el banco de fotos en JSON, las fotos a mano, las fotos con IA como workflow aparte, los cuatro caminos de hoy.

### 3.8 El sitio

Un Worker de Cloudflare arma cada página cuando alguien la pide, leyendo D1, y la deja en la caché de Cloudflare. Cuando se publica o
se corrige una nota, se invalidan su página, la portada y su sección: **nada se recompila**. Consecuencias:

- Una nota nueva está en la web **segundos** después de redactarse, no en la próxima vuelta.
- No hay tope de 500 notas ni límite de 20.000 archivos: el archivo es todo, para siempre, y el buscador lo busca todo.
- La página es liviana (HTML y poco más), rápida en el celular, lo que Google premia.
- **SEO desde el día uno:** direcciones fijas y cortas, marcado `NewsArticle` con fecha, autor y fuentes, mapa del sitio de noticias
  (de las últimas 48 h) y mapas por mes, `robots.txt` claro, imágenes con tamaño y texto alternativo. Se pide la indexación a Google
  (Search Console ya está).
- **Avisos:** la plantilla nace con lugares para publicidad (arriba de la portada, entre notas, al costado en la nota) que hoy
  muestran avisos locales de ustedes y mañana AdSense. Para que AdSense acepte el sitio hace falta contenido propio y verificable: 3.6
  ayuda directo a eso.

Se tira Next.js con su compilación, las tarjetas en R2, el presupuesto de minutos, la vuelta de noche, `_redirects` con tope.

### 3.9 Redes: una pieza, muchas redes

**Lo común (`redes/piezas/`):** la imagen de nota (foto + título, formato cuadrado y vertical), la placa, el reel con voz (la nota en
40-60 segundos, con la misma estética animada de hoy) y la infografía como imagen. Las voces siguen siendo las dos propias de Gemini.

**Cada red tiene su `REGLAS.md`** con: qué publica, cuántas por día, en qué horarios, qué texto (largo, con o sin enlace, hashtags),
qué formato, y qué hace si falla. Propuesta inicial, para ajustar con ustedes:

| Red | Qué | Cuántas por día | Texto |
|---|---|---|---|
| Facebook | Posteo con **foto** y el enlace en el texto (la foto entera, nunca la tarjeta recortada); 1 reel; las historias son los reels del día | 6 a 8 posteos, 1 reel | Título + 2 líneas + enlace + 2 hashtags |
| Instagram | 1 o 2 reels con voz; historias: la imagen de cada nota publicada (con el enlace, que Instagram sí permite en historias); espejo de los posteos de Facebook sólo si lo quieren | 1-2 reels, 4-6 historias | Pie corto, sin enlace (no es clickeable), hashtags |
| TikTok | Los mismos reels | 1-2 | Pie corto |
| YouTube | Los mismos reels como Shorts | 1-2 | Título + descripción con enlace |
| X | Cada nota publicada de Balcarce y lo más contado del país, con enlace | 10 a 15 | Título + enlace |
| Threads | Igual que X, sin apuro (falta la configuración del jueves) | 10 a 15 | Título + enlace |

Qué notas van a redes: las de Balcarce todas, y de lo nacional las más contadas del día hasta cubrir el cupo de cada red. **Todo lo que
va a redes lleva imagen**, siempre (3.7 lo garantiza).

**Sobre compartir el reel como historia** (para que la historia le sume vistas al reel): la API de Meta **no permite** "compartir a la
historia" un reel ya publicado; sólo permite subir un video o una imagen como historia nueva, que es lo que hacemos hoy y no le suma
vistas al reel. Lo que sí se puede: que el sistema publique el reel y les mande por Telegram el enlace, y quien tenga el celular lo
comparte a la historia desde la app en dos toques (eso sí suma al reel). Lo dejo como opción: automático (historia aparte) o a mano
(suma vistas).

**Mockups antes de publicar:** para cada red se arma una página con cómo queda cada formato (imagen, reel, texto) con notas reales de
ese día, y recién con el OK de ustedes se prende. Se tiran: el contrato del día, la tabla de piezas con prioridad de voz, el libro de
publicaciones en el repositorio, los dos interruptores (queda uno).

### 3.10 Redacción propia: Telegram, gacetillas y agenda

- **Telegram** (gratis, sin límite, con audio): un bot en un Worker. Le mandan un audio, un texto o una foto. El sistema transcribe el
  audio, entiende el pedido ("investigá tal tema", "acá hay un pozo en tal esquina"), busca en internet (Tavily ya está pagado) y en
  nuestras notas anteriores, redacta con el perfil y la línea de ustedes (un `PERFIL.md` que escriben ustedes: quiénes somos, qué
  defendemos, cómo hablamos), elige o arma la foto (la de ustedes, si la mandaron) y la infografía si hay datos, y les devuelve el
  borrador. Responden «publicá» y sale, firmada por quien la pidió; o marcan correcciones. Si en el audio dicen «publicá directo», sale
  sin pasar por el borrador.
- **Gacetillas por mail**, con la PC apagada: Cloudflare Email Routing recibe lo que llega a `redaccion@radarbalcarce.com` y se lo da a
  un Worker. Cada gacetilla entra como una fuente más (alcance Balcarce: entra sola si viene de un remitente conocido, o espera un OK
  por Telegram si no). Hay que mirar quiénes mandan gacetillas (municipio, clubes, escuelas, cooperativas, hospital, bomberos) y
  pedirles que nos sumen a su lista: eso lo hacen ustedes con el mail del medio.
- **Agenda**, como módulo aparte: lo del municipio más lo que llega por gacetilla, con su página y su cuadro en la portada.

### 3.11 Panel del celular

Queda, apuntando al sistema nuevo: ver qué espera, corregir o sacar una nota, ver números. Lo que hoy hace de "pedir una nota" pasa a
Telegram, que es más cómodo. Las pestañas que no se usan se sacan.

### 3.12 Vigilancia

Un solo Worker: ¿corrió la lectura? ¿se publicó algo en las últimas horas? ¿fallaron las redes? ¿se acerca el tope de gasto de la
IA? Si algo anda mal, un mensaje por Telegram (o WhatsApp), y un informe diario corto a la mañana. Se tiran los dos informes largos, el
resumen de las 22 y el vigilante de vueltas.

## 4. El prompt de redacción, de cero

Se escribe en una sesión con ustedes, en este orden:

1. **Quiénes somos y para quién** (dos párrafos de ustedes): un medio de Balcarce que cuenta lo de acá y lo del país que importa, para
   gente de Balcarce. Tono: claro, directo, rioplatense sin exagerar, sin sensacionalismo, sin opinión en las notas de noticias.
2. **El largo** según cuánto hay (3.5) y la forma: título que informa (no pregunta ni promete), bajada de una oración, párrafos cortos,
   lo más importante primero, nombres completos la primera vez, cifras con punto de miles.
3. **Lo que nunca**: inventar, agregar lo que ninguna fuente dice, copiar oraciones de una fuente, adjetivar, "en las últimas horas",
   "según trascendió", identificar menores o víctimas, listas de sepelios.

## 10. Lo que Hernán decidió el 31/10 y el 1/11 (manda sobre lo de arriba)

- **Plan aprobado. Sin etapa en sombra**: se construye y se corta; el sitio puede estar apagado unos días. Las redes no paran.
- **Limpieza total**: se borra lo que no se usa, en GitHub y en Cloudflare (Workers, variables, KV, R2 sin uso).
- **Firmas**: automáticas, «Redacción Radar Balcarce» (con la declaración de IA y verificación); las propias, «Hernán Accomo».
- **Perfil y línea**: `docs/propuestas/PERFIL-BORRADOR.md` (centro / centro derecha, siempre crítico con quien gobierne, control
  ciudadano, humor, pro diversidad, pro tecnología). Falta que Hernán lo corrija.
- **Valor agregado**: se saca «Qué dicen las fuentes» (queda sólo el desplegable «Fuentes (N)» de siempre). Quedan «En dos líneas»
  (el que más gustó), «Los datos», cronología, cifras/gráficos, contexto, «Qué falta saber» y «Más en Radar». Se prueban en el diseño
  real del sitio antes de prenderlos; no todos en todas las notas.
- **Tapa**: clima, farmacia y dólar quedan como cuadros fijos. La estética se mejora después del corte (más visual, no «una copia más»).
- **Clima**: una nota por día, profesional (región, gráficos, fuentes comparadas), que sale junto con el reel del clima.
- **Nacionales en la web**: tope de **100 por día** para arrancar, sin tope por sección (se regula mirando la estadística).
- **Posteos**: 5 de Balcarce + 5 nacionales por día, los más populares, con un máximo de 3 de la misma sección entre los nacionales.
- **Reels**: como hoy: 3 podcasts de 3 noticias (menos de 35 segundos, al menos 1 de Balcarce en cada uno), 2 de clima y 1 efeméride.
  Van a todas las redes que lo permitan; cada red con su texto y su enlace.
- **Historias**: los reels y cada nota de Balcarce (si la API deja poner el enlace; si no, el texto corto y el enlace de la bio).
- **F1**: nota previa linda antes del fin de semana + pieza con los horarios (reel/historia o posteo); el fin de semana entra lo que
  entre por popularidad; el **lunes, nota propia con el resultado**, siempre contando lo bueno o lo malo de Franco Colapinto.
- **Fútbol**: sin piezas fijas. Primera por popularidad; copas, si juegan argentinos; ascenso, sólo el que esté por ascender.
- **Administración**: Telegram (lo maneja Hernán solo, por ahora) + panel `/admin` en el sitio con login de Google: editar, cambiar de
  sección, ocultar, borrar, cambiar foto, y colaboradores con permisos limitados (escriben, no publican).
- **Archivo**: se migran todas las notas; las fotos de Commons se arreglan donde se pueda.
- **Publicidad**: AdSense ya (Hernán tiene monotributo) y espacios propios; cuando no hay anunciante, avisos de los proyectos propios
  (6 apps, sehace.com, BalcarDev.online).
- **Enlaces**: cada nota tiene un enlace corto propio (`radarbalcarce.com/n/…`) y es el que va a las redes.
4. **Lo que siempre**: decir de dónde sale cada dato en la ficha, señalar lo que las fuentes contradicen entre sí, el contexto local
   cuando lo hay.
5. **Prueba con 20 historias reales** del día: se muestran la nota de hoy y la nueva, lado a lado, y ustedes eligen. Se ajusta y recién
   ahí se aprueba.

El prompt vive en `nucleo/REDACCION.md`, lo leen la IA y ustedes, y cambiarlo no toca código.

**Sumado el 1/11 a la tarde** (a partir de la nota de Halloween, la primera crónica propia con fotos y video de Hernán):

- **Carrusel** como pieza de redes: una nota con 3 fotos propias o más sale como posteo con todas las fotos (Instagram hasta 20,
  Facebook varias fotos, X hasta 4, TikTok modo foto), la portada primero. Hoy el sistema publica una sola foto por posteo.
- **Vista previa por Telegram:** una nota que Hernán manda por el bot (texto, audio, fotos, video) vuelve como un enlace privado a la
  página armada, igual a como se vería publicada, sin estar publicada; con «ok» sale. Mismo circuito para las gacetillas.
- **Reel con video propio:** un video corto de Hernán (sin sonido, con el título, la firma y la placa final de papel) como reel e historia,
  armado por el sistema; el 1/11 se hizo a mano con `reels/placa.mjs` + ffmpeg (capa con título y firma sobre el video, placa final).
- **Agenda de comercios e instituciones que avisan:** contactos como el Maxikiosco Pinocho (Instagram @pinocho2kiosco, WhatsApp) en la
  agenda del medio, para pedirles que avisen cuando organizan algo; se charla junto con el mapa comercial (`comercial/`), después de la
  mudanza. Primer paso concreto: escribirle al Pinocho por Instagram con la nota y el reel, y agradecerle.
- **Todas las redes para cada pieza:** el reel, la historia y el posteo de una nota propia tienen que salir en Facebook, Instagram y en el
  resto (TikTok, YouTube Shorts, X, Threads) sin pasos a mano; hoy sólo Facebook e Instagram salen por la API, TikTok y YouTube van por
  Buffer (workflow «Buffer (TikTok y YouTube)») y X y Threads están en propuesta (`docs/propuestas/`). Cada red, su módulo en `v3/redes/`.
- **Ahorrar tokens al construir:** Hernán pide que el modelo grande sólo orqueste y decida, y que las tareas mecánicas (buscar, exportar,
  escribir código de rutina, revisar) las hagan modelos chicos. Regla de trabajo para toda la 3.0: subagentes con `haiku` para búsquedas y
  mediciones y `sonnet` para código y revisión; el grande, para las decisiones y lo delicado. Si hace falta, un *workflow* de construcción
  que reparta las tareas así (el usuario lo pide con «usá un workflow»).
- **Las notas propias (Nancy, Halloween) en la 3.0, de punta a punta:** Hernán manda por Telegram texto, audio, fotos o video; el bot
  devuelve la vista previa; con «ok» la nota sale a la web en el momento (sin esperar la vuelta de media hora). Acto seguido el bot pregunta
  **qué hacer en redes, con botones:** «Todo» (posteo con foto en todas las redes + historia con la tarjeta + reel con voz), «Posteo e
  historia», «Sólo la web». Si elige reel con voz, el bot le muestra el guion propuesto y lo cambia con lo que él diga por audio («sin lo del
  tránsito»); nada sale hasta su «ok». Lo que no conteste en una hora: posteo e historia (lo seguro), sin reel. Así no vuelve a pasar lo
  del 1/11: un reel con voz publicado con un guion que él quería cambiar, por un camino a mano de varios pasos.
- **Compartir desde cada nota (sitio 3.0, pedido de Hernán del 1/11):** un botón «Compartir» que abre la hoja de compartir del celular
  (Web Share API, `navigator.share` con `files`) con **la tarjeta de la nota como imagen más el enlace**, para que la gente la suba a sus
  historias de Instagram y TikTok, estados de WhatsApp, etc. (Instagram y TikTok no tienen enlace web de «compartir»: sólo entran por esa
  hoja, y reciben imagen, no enlace); en la PC cae a «copiar enlace». Al lado, los directos que sí existen: WhatsApp, Facebook, X y Telegram,
  más «copiar enlace». Sin íconos sueltos de Instagram ni TikTok. Se mide con el parámetro de origen de cada enlace (UTM) como hoy.
- **Cuentas, para que no vuelva a pasar (1/11):** el `gh` de la PC quedó logueado como `radarbalcarce` (con permiso `workflow`) y el
  repositorio empuja sólo con esa cuenta; nada con `balcar-dev` ni con `hacheaccomo`. El Chrome de Radar es el tercero de los conectados
  (GitHub como radarbalcarce); el otro Chrome de Windows tiene la cuenta personal de Hernán (ahí quedó a medio crear una propiedad de
  Google Analytics que NO hay que aceptar: se rehace con radarbalcarce@gmail.com, pendiente).

## 5. Lo que se tira (lista explícita)

El semáforo y sus listas; los cuatro mecanismos de repetidas; las notas automáticas de F1, fútbol, dólar y clima; las efemérides (se
puede volver a hacer después, a pedido); Next.js y la compilación; `web/data/*.json` y los commits cada media hora; las tarjetas en R2;
el presupuesto de minutos; las cuatro claves gratis con sus respaldos (Groq, Mistral); la medición de uso por clave; el banco de fotos
y los otros tres caminos de fotos; el contrato del día; la revisión del archivo con IA; la auditoría con IA de lo publicado (la
verificación de 3.5 la reemplaza); los workflows de GitHub (los 48); la pausa general (la reemplaza un botón en Telegram: «pará
todo»); 37.000 líneas de documentación (queda un `REGLAS.md` por módulo y `docs/DECISIONES.md`); las 327 reglas y las 40.

Lo que **queda** porque es patrimonio: las fuentes, la estética (colores, placas, animaciones, voces), el panel del celular, las
notas propias ya publicadas, el archivo de notas (se migra a D1 con su dirección para no perder lo que Google ya indexó), la cuenta de
Meta y Buffer, y los casos de las pruebas viejas como lista de control.

## 6. Costos

| Qué | Hoy | 3.0 |
|---|---|---|
| Cloudflare (Workers, D1, R2, Workers AI, Email, caché) | gratis | gratis (los límites del plan gratis alcanzan de sobra para este volumen) |
| IA de texto | gratis con fallas, respaldo pago US$ 10/mes | una clave paga, estimado US$ 3 a 8/mes, con tope |
| Voces | US$ 10/mes | igual |
| Tavily (búsqueda para notas propias) | gratis (cupo) | igual |
| Telegram | — | gratis |
| Buffer (TikTok, YouTube, X) | gratis | igual |
| GitHub | gratis, repo público | sólo el código; privado cuando ustedes quieran |

## 7. Orden y tiempos

Cada etapa termina con algo que ustedes ven y aprueban. Nada llega a producción sin ese OK. Lo viejo sigue andando hasta el corte.

| Etapa | Qué | Trabajo | Qué ven ustedes |
|---|---|---|---|
| A | Aprobar este plan y las preguntas de la sección 9; escribir el `PERFIL.md`; crear la clave paga y el bot de Telegram | esta semana | este documento corregido |
| B | El núcleo (3.1 a 3.7) corriendo **en sombra**: lee, agrupa, elige y redacta en D1 sin publicar; la sesión del prompt | 3 a 4 días de sesiones | las 20 historias lado a lado; un listado diario de qué habría salido y por qué |
| C | El sitio nuevo (3.8) con el archivo migrado, en una dirección de prueba; el **corte** a radarbalcarce.com | 2 a 3 días + 1 de corte | el sitio de prueba en el celular; el día del corte, el sitio quieto unas horas |
| D | Redes (3.9): piezas, una carpeta por red, mockups, prendido de a una red | 2 a 3 días | los mockups de cada red |
| E | Redacción propia (3.10): Telegram, gacetillas, agenda | 2 a 3 días | la primera nota pedida por audio |
| F | Valor agregado (3.6) completo, fotos libres, lugares de avisos, pedido a AdSense, apagado de GitHub | 2 a 3 días | notas con datos y gráficos |

En total, unas tres semanas de trabajo repartidas como se pueda. La B es la que decide: si lo que sale en sombra no les gusta, se
ajusta ahí, sin tocar lo que está publicado.

## 8. Lo que necesito de ustedes

1. La clave paga de Gemini con US$ 20 de crédito y un tope mensual puesto en la consola de Google (la pegan ustedes en Cloudflare; yo
   les digo dónde).
2. Crear el bot de Telegram (5 minutos desde el celular, los guío) y pegar su clave en Cloudflare.
3. Activar Email Routing en Cloudflare para `redaccion@radarbalcarce.com` (lo hago yo con la cuenta; ustedes confirman).
4. El `PERFIL.md`: dos párrafos de quiénes son y qué línea tiene el medio. Puede ser un audio y lo paso a texto.
5. Las respuestas de la sección 9.

## 9. Preguntas abiertas

1. **¿Tope de notas nacionales por día** (por ejemplo 40) o sin tope, como hoy?
2. **¿Cuántas notas por día quieren en redes** en cada una? La tabla de 3.9 es una propuesta; corríjanla.
3. **El reel como historia:** ¿automático (historia aparte, sin sumar vistas al reel) o a mano desde la app con aviso por Telegram (suma
   vistas)?
4. **Las notas viejas:** ¿se migran todas (quedan con su dirección, Google no pierde nada) o sólo las últimas semanas? Recomiendo todas.
5. **Telegram** para hablar con el sistema (gratis, con audio, sin límites) en vez de WhatsApp, que cobra por mensaje y es más trabado.
   ¿De acuerdo?
6. **Clima y farmacia:** ¿quedan como cuadrito fijo en la portada (sí recomiendo) o se sacan?
