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

4. **Lo que siempre**: decir de dónde sale cada dato en la ficha, señalar lo que las fuentes contradicen entre sí, el contexto local
   cuando lo hay.
5. **Prueba con 20 historias reales** del día: se muestran la nota de hoy y la nueva, lado a lado, y ustedes eligen. Se ajusta y recién
   ahí se aprueba.

El prompt vive en `nucleo/REDACCION.md`, lo leen la IA y ustedes, y cambiarlo no toca código.

## 5. Lo que se tira (lista explícita)

El semáforo y sus listas; los cuatro mecanismos de repetidas; las notas automáticas de F1, fútbol, dólar y clima; Next.js y la compilación; `web/data/*.json` y los commits cada media hora; las tarjetas en R2;
el presupuesto de minutos; las cuatro claves gratis con sus respaldos (Groq, Mistral); la medición de uso por clave; el banco de fotos
y los otros tres caminos de fotos; el contrato del día; la revisión del archivo con IA; la auditoría con IA de lo publicado (la
verificación de 3.5 la reemplaza); los workflows de GitHub (los 48); la pausa general (la reemplaza un botón en Telegram: «pará
todo»); 37.000 líneas de documentación (queda un `REGLAS.md` por módulo y `docs/DECISIONES.md`); las 327 reglas y las 40.

Lo que **queda** porque es patrimonio: las fuentes, la estética (colores, placas, animaciones, voces), las efemérides («Un día como hoy», reel y nota; Hernán, 1/11), el panel del celular, las
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
| B | El núcleo (3.1 a 3.7) escribiendo en D1 sin publicar todavía (no hay etapa en sombra: sección 10); la sesión del prompt | 3 a 4 días de sesiones | las 20 historias lado a lado; un listado diario de qué habría salido y por qué |
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

**Sumado el 1/11 a la noche** (Hernán, al ver el mapa de la 3.0, `docs/propuestas/MAPA-RADAR-3-0-01-11.html`):

- **Efemérides: siguen como hoy**, con su reel y su nota de «Un día como hoy» (se saca de la lista de la sección 5). A lo sumo se mejoran
  los temas, para que sean más del interés de la gente, si hace falta; pero la idea es que siga.
- **Clave paga de Gemini:** Hernán le carga el monto el 2/11 (pendiente suyo). Queda **un solo tope de gasto**, el que él pone en la consola
  de Google (US$ 20 de crédito); el autofreno de `nucleo/REGLAS.md` se alinea a ese mismo número y avisa por Telegram al 80 %.
- **Claves y recursos sin uso: se borran todos** y se cuida de ahí en más: claves de IA que no se usen, tokens, variables, Workers, KV y R2
  sin uso, en Google, Cloudflare y GitHub. Queda una sola lista de qué clave vive dónde y para qué (amplía la «limpieza total»).
- **Redes: hay que armar el cronograma de todas** (Facebook, Instagram, TikTok, YouTube, X, Threads y el canal de Telegram): qué pieza,
  cuántas por día, a qué hora y por qué camino sale. Hay un borrador más abajo, para ajustar. **YouTube, por API directa** (gratis, el cupo
  diario alcanza para 1 o 2 Shorts). **TikTok y X siguen con Buffer** mientras no haya vía directa (TikTok exige una revisión de la app
  antes de publicar directo: se pide en la etapa D). Threads, cuando esté configurado.
- **Canal público de Telegram:** se suma como red. Cada nota de Balcarce con su enlace, publicada por el mismo bot, sin algoritmo en el
  medio. Un canal de WhatsApp para lectores no tiene API: queda para compartir a mano, si se quiere.
- **Recomendaciones del mapa, aceptadas** («todo lo que sea para sumar, mejor»): (a) un segundo camino de aviso, por mail de Cloudflare,
  sólo para «el bot de Telegram no responde»; (b) copia diaria de D1 a R2 con 30 días guardados; (c) D1 guarda el motivo de cada decisión
  de selección (entró, no entró, por qué) para seguir regulando con la estadística como hoy; (d) la vista previa por Telegram también para lo
  automático que la IA marca `no_publicar` o deja en duda, con botones publicar y descartar; (e) Cloudflare Web Analytics (sin cookies)
  además de Google Analytics; (f) cada nota propia sobre un negocio o institución deja su contacto cargado en la agenda del medio;
  (g) las redes se prenden de a una, con una semana de números cada una y un número escrito que decide si la red se queda; (h) una lista
  de control escrita para el día del corte (redirecciones, sitemap en Search Console, RSS en la misma dirección, enlaces cortos en las redes).
- **Las preguntas de la sección 9**, a hoy: 1 respondida (100 por día); 2 pendiente del cronograma; 3 (el reel como historia) sin respuesta;
  4, 5 y 6 respondidas.

**Borrador del cronograma de todas las redes** (1/11; parte de las horas de hoy en `redes/piezas-del-dia.mjs` y de la sección 10; es para
que Hernán lo corrija, no está decidido). «Buffer» es el puente mientras no haya vía directa; «API» es publicación directa.

| Hora | Pieza | Facebook | Instagram | TikTok | YouTube | X y Threads | Canal de Telegram |
|---|---|---|---|---|---|---|---|
| 7:00 | El clima de la mañana (reel con voz) + nota del clima | reel | reel + historia | Buffer | Short, API | imagen del clima + enlace a la nota | texto + imagen + enlace |
| 8:00 (feriados) | El feriado (reel) | reel | reel | Buffer | Short, API | imagen + enlace | texto + enlace |
| 9:00 | Un día como hoy (reel + nota) | reel | reel + historia | Buffer | Short, API | imagen + enlace a la nota | texto + enlace |
| 10:00 | El repaso de la mañana (3 noticias, al menos 1 de Balcarce) | reel | reel + historia | Buffer | Short, API | 3 titulares con sus enlaces | 3 titulares con enlaces |
| 12:00 | Lun a vie: Participá / Tu evento / Tu reclamo / Tu nota; jue: Qué hacer el fin de semana | reel | reel | — | — | sólo la agenda del jueves, con enlace | sólo la agenda |
| 15:00 | El repaso de la tarde | reel | reel + historia | Buffer | Short, API | 3 titulares con enlaces | 3 titulares con enlaces |
| 17:00 (sáb.) | Teléfonos útiles | reel | reel | — | — | — | texto |
| 19:00 | Farmacia de turno | reel | historia | — | — | texto | texto |
| 20:00 | El clima de la noche | reel | reel + historia | Buffer | Short, API | imagen + enlace | texto + imagen |
| 21:00 | El repaso del día | reel | reel + historia | Buffer | Short, API | 3 titulares con enlaces | 3 titulares con enlaces |
| 8:00 a 22:00, cada 90 min como mínimo | Posteos de notas: 5 de Balcarce + 5 nacionales (máx. 3 por sección) | posteo con foto y enlace | espejo sólo si lo quieren | — | — | cada nota de Balcarce y lo más contado, con enlace (10 a 15 por día) | — |
| Al publicarse | Cada nota de Balcarce | — | historia con la tarjeta (texto corto, enlace de la bio) | — | — | texto + enlace | texto + enlace (es la red donde el enlace llega entero) |
| Cuando hay | Carrusel: nota con 3 fotos propias o más | varias fotos | hasta 20 fotos | modo foto, Buffer | — | hasta 4 fotos | álbum |
| Cuando Hernán lo pide | Nota propia: según los botones «Todo», «Posteo e historia», «Sólo la web» | según botón | según botón | según botón | según botón | según botón | sí, siempre que salga a la web |

Con eso el día tiene 6 reels con voz (2 clima, 3 repasos, 1 efeméride; más el feriado cuando toca), 10 posteos en Facebook, y en X,
Threads y el canal de Telegram todas las notas de Balcarce. Lo que hay que mirar del cupo: 6 a 8 Shorts por día entran en el cupo gratis
de YouTube; en X, la cuenta gratuita tiene un tope mensual que hay que medir antes de prometer 10 a 15 por día.

**Sumado el 1/11 a la noche, segunda parte** (preguntas de Hernán al leer lo anterior):

- **Sí, cada red se arma por formato.** El `REGLAS.md` de cada red (3.9) dice qué formato lleva cada pieza. La grilla de partida, para
  corregir, es la tabla «Formatos por red» de abajo. Carrusel, reel, historia y posteo no son todo lo que existe: también hay álbum, hilo,
  lista de reproducción, pestaña Comunidad, encuesta y mensaje fijado, y la tabla dice cuáles se usan y cuáles no, a conciencia.
- **Otras redes, para decidir** (ninguna está decidida): **Bluesky** es la que recomiendo sumar, porque su API es gratis y simple, recibe el
  mismo texto que X y Threads, y no tiene algoritmo en el medio (un módulo `bluesky/` chico). **Los repasos como podcast de audio** (un RSS en
  el sitio que Spotify, Apple y YouTube Music leen solos; los audios ya existen, cuesta casi nada). **Google News y Discover** no son una red,
  pero pueden traer más lectores que todas juntas: se ve en la auditoría SEO (`docs/seo/`). Quedan afuera a conciencia: LinkedIn, Pinterest,
  Mastodon, el boletín por mail y el canal de WhatsApp para lectores (sin API: sólo a mano, si alguien quiere compartir ahí).
- **YouTube por API, cómo se gestiona** (resumen; el paso a paso para personas va a `docs/11-OPERACION.md` cuando llegue la etapa D):
  en Google Cloud, con `radarbalcarce@gmail.com`, un proyecto con la **YouTube Data API v3** habilitada, una pantalla de consentimiento y un
  cliente OAuth; la cuenta dueña del canal autoriza **una sola vez**, en el Chrome de Radar, y el permiso de larga duración (*refresh token*)
  queda como secreto del Worker de redes, nunca en un chat ni en el código. Tres cosas que muerden y hay que confirmar al armar: (1) la app
  tiene que estar «En producción», no «En prueba», porque en prueba el permiso vence a los 7 días; (2) un proyecto nuevo sin la auditoría de
  cumplimiento de YouTube sube los videos **como privados**: hay que pedir esa auditoría (un formulario, gratis) o los Shorts no se ven;
  (3) el cupo gratis es de 10.000 unidades por día y cada subida gasta 1.600: **6 Shorts por día es el techo**; el día de feriado son 7 y no
  entra, así que se pide más cupo (formulario, gratis) o el feriado no va a YouTube. Las listas de reproducción (Clima, Repasos, Un día como
  hoy) se arman con la misma API y casi no gastan.
- **Modelos chicos para cada tarea: está registrado**, en dos planos. (a) **Al construir**, la regla de arriba de esta misma sección
  («Ahorrar tokens al construir») y la de `CLAUDE.md`: el modelo grande orquesta y decide; `haiku` busca y mide, `sonnet` escribe el código de
  rutina y revisa. (b) **En producción**, qué IA hace cada tarea estaba repartido por la sección 3; queda junto en la tabla «Qué modelo hace qué»
  de abajo, y los respaldos se deciden en la limpieza de claves (ninguna clave sin un uso escrito en esa tabla sobrevive).
- **El push con la cuenta equivocada** (nota de Hernán): pasa porque en la PC conviven varios proyectos y cuentas; con la 3.0 la PC queda sólo
  con Radar Balcarce. Mientras tanto, el arreglo del 1/11 en el repositorio alcanza (los commits y pushes salen como `radarbalcarce`).

**Formatos por red** (borrador del 1/11, para corregir; «sí» es automático, «a mano» lo hace una persona desde la app, «no» queda afuera):

| Red | Posteo (foto + enlace) | Reel / video | Historia | Carrusel / álbum | Otros formatos de la red |
|---|---|---|---|---|---|
| Facebook | sí, 10 por día | sí, los 6 del día | sí: el reel del día y la tarjeta de cada nota de Balcarce | álbum con las fotos propias (3 o más) | video largo, evento, encuesta, Live, grupos: **no** (los grupos de Balcarce, a mano si se quiere) |
| Instagram | espejo de Facebook sólo si lo quieren | sí, los 6 | sí: con el sticker de enlace a la nota | hasta 20 fotos | destacados (Clima, Farmacia, Agenda): a mano una vez; Live, Notas, «Colaborador» con un comercio en una nota propia: a mano |
| TikTok | no existe | sí, los 6 (Buffer) | no | modo foto con música (Buffer) | — |
| YouTube | no existe | sí, como Shorts (API; techo 6 por día) | no | no | listas de reproducción por pieza: sí (API); pestaña Comunidad (texto + imagen): después, si suma; video largo: no |
| X | tuit con enlace (la tarjeta la arma X) | sí, el reel adjunto | no | hasta 4 fotos | hilo: el repaso como 1 tuit + 3 respuestas; artículos: no |
| Threads | texto con enlace | sí | no | sí | igual que X; sin apuro |
| Bluesky (si se suma) | texto con enlace | sí (video corto) | no | hasta 4 fotos | hilo igual que X |
| Canal de Telegram | texto + enlace (vista previa entera) | sí, el reel | no | álbum | mensaje fijado con el clima y la farmacia del día; encuesta («¿qué te interesa?»): a definir |

**Qué modelo hace qué en la 3.0** (producción; junta lo que la sección 3 dice en cada paso):

| Tarea | Modelo | Dónde corre | Costo |
|---|---|---|---|
| Huella de significado de cada noticia (3.2) | un modelo de *embeddings* de Workers AI | Cloudflare | gratis |
| Leer, agrupar, decidir, redactar y verificar (3.4 y 3.5) | `gemini-3.1-flash-lite` o el liviano pago del momento, con la clave paga y **un solo tope** | Google, desde el Worker | unos pocos dólares por mes |
| Ilustración cuando no hay foto (3.7) | un modelo de imagen de Workers AI, marcada «Ilustración» | Cloudflare | gratis |
| Voz de los reels (3.9) | `gemini-3.8-flash-tts`, las dos voces propias (vencen el 29/09/2027) | Google | US$ 10 por mes de tope |
| Respaldos cuando Gemini falla | se decide en la limpieza de claves; hoy existen Groq y Mistral gratis | — | gratis |
| Construir la 3.0 (Claude Code) | el grande orquesta y decide; `haiku` busca y mide; `sonnet` código de rutina y revisión | la PC | tokens de la suscripción |

**Sumado el 2/11** (Hernán, a la mañana):

- **Publicidad: aparece el primer comercio local** que quiere pautar. La política general está en `PUBLICIDAD.md`; la aplicación a
  este caso (paquete de lanzamiento de unos $ 5.000 por mes con aviso, nota rotulada «Emprendedores de Balcarce · espacio
  patrocinado», historia con voz y un plus de marketing básico; cuestionario estándar de 10 preguntas; qué pedirles; media kit de una
  carilla sin cifras de audiencia hasta limpiarlas de robots) está en `docs/propuestas/PUBLICIDAD-PRIMER-COMERCIO.md`. **En la 3.0** el
  módulo de avisos vive en D1: imagen, enlace, fechas, **rotación** (ningún comercio compra un lugar fijo: Hernán), cuántas veces se
  mostró y se tocó cada aviso, pestaña en `/admin` para cargarlos y ver los números, página `/publicidad` con el media kit, y la serie
  «Emprendedores de Balcarce» como tipo de nota con su rótulo. El mix de avisos locales, de los emprendimientos propios y, si algún día
  se abre, de una red publicitaria, se decide con los números de los primeros meses.
- **YouTube por API, los tiempos:** la auditoría de cumplimiento y el pedido de más cupo tardan de una a varias semanas y pueden pedir
  aclaraciones; no frenan nada. Se piden apenas se crea el proyecto, **se sigue con Buffer mientras tanto** y se cambia cuando aprueben;
  si no aprueban, YouTube se queda en Buffer y listo (Hernán, 2/11).
- **Formatos compartidos entre redes:** `redes/piezas/` arma cada pieza una sola vez y cada red toma la que le sirve. El reel vertical
  (9:16, con voz) es el mismo para Facebook, Instagram, TikTok, Shorts, X, Threads, Bluesky y el canal de Telegram; la imagen de nota
  cuadrada (1:1) sirve para el posteo de Facebook e Instagram y para X, Threads, Bluesky y Telegram; la vertical (9:16, sin voz) es la
  historia y la tarjeta; el carrusel son las mismas fotos achicadas al tamaño de cada red (20 en Instagram, 4 en X y Bluesky, álbum en
  Facebook y Telegram). La tabla «Formatos por red» de arriba dice qué toma cada una.
- **Bluesky y Threads:** Hernán crea las cuentas (Bluesky nueva; Threads ya existe con la cuenta de Instagram) con `radarbalcarce@gmail.com`.
  Para publicar hacen falta: en Bluesky, una «contraseña de aplicación» generada en la configuración de la cuenta; en Threads, el permiso
  de la misma app de Meta. Van como secretos del Worker de redes, nunca en el chat.

**Sumado el 2/11, segunda parte** (Hernán, al leer la propuesta de publicidad):

- **Publicidad, decidido:** tres combos por mes, **$ 5.000 (Presencia), $ 10.000 (Destacado) y $ 15.000 (Auspicio)**, en
  `docs/propuestas/PUBLICIDAD-PRIMER-COMERCIO.md`, con el media kit de una carilla en `docs/propuestas/MEDIA-KIT-2026-11.html` (en la 3.0 es
  la página `/publicidad`). La nota «Emprendedores de Balcarce» **va sin rótulo de patrocinio** (Hernán: «innecesario»; `PUBLICIDAD.md`
  cambiado ese día); el cuestionario se manda por WhatsApp y se responde por audio o por escrito. **No se ofrece marketing al comercio**
  (revisar sus redes, hacerle imágenes): «no nos metamos en algo que no vamos a poder abarcar». **Se pauta con la 3.0**, no se toca la 2.0.
  Propuesta pendiente: los primeros tres comercios llevan Destacado al precio de Presencia el primer mes.
- **Arrancar ya con los cambios profundos** (Hernán, 2/11). Qué falta de su lado y qué no: para la **etapa B** sólo la **clave paga con
  monto** (la carga el 2/11) y **una charla de una hora para `PERFIL.md`** (el borrador está en `docs/propuestas/PERFIL-BORRADOR.md`; se
  puede hacer por audio de Telegram, de a una pregunta). Nada más traba la B. Para las etapas **C y D**, cuando lleguen: la cuenta de
  **Bluesky** (la crea Hernán), el permiso de **Threads** y la revisión de la app de **TikTok** (lo prepara Claude, lo aprueba Hernán en el
  Chrome de Radar), el proyecto de **YouTube** (ídem) y corregir el **cronograma**. Para el corte (**F**): nada que comprar; el dominio y
  las cuentas son los de hoy. **No hay que sacar nada todavía**: la limpieza de claves y recursos se hace en el corte, con la lista.
  Lo que no necesita la clave y arranca primero: el esqueleto de `v3/` (núcleo, sitio, redes, redacción, vigilancia), el esquema de D1,
  la lectura de fuentes, la huella con Workers AI y su calibración con 200 pares.

**Sumado el 2/11, tercera parte** (Hernán, a lo largo del día; relevamiento de las reglas de voz y de tapa hecho ese día):

- **Publicidad, lo que cambió después de ver el primer media kit:** el kit es un PDF con la marca del sitio y capturas reales de la
  portada con el lugar del aviso marcado; las redes se nombran una sola vez; **sin cifras de audiencia ni «números del mes» al
  anunciante**; nada que no esté decidido (rubros vedados, rótulo «espacio publicitario», patrocinio en Política y Policiales: se evalúa
  si llega, `PUBLICIDAD.md` corregido). **Lanzamiento: el primer comercio lleva Destacado más la mención en la voz del clima por $ 5.000 el
  primer mes.** La **ficha estándar del anunciante** (Hernán manda el enlace, Claude mira lo público desde el Chrome de Radar y deja la
  ficha con quiénes son, qué fotos pedir, el aviso, la prenota y qué mandarles) está en `PUBLICIDAD-PRIMER-COMERCIO.md` § 6; la primera,
  **Sweet Candy Bar** (`docs/propuestas/anunciantes/sweet-candy-bar.md`). En la 3.0 el bot de Telegram recibe el enlace y devuelve la ficha.
- **Guía comercial: hay que armarla**, como parte relevante de Radar (Hernán, 2/11). Hoy no existe (`comercial/` está dormido y vacío de
  datos). En la 3.0: cada anunciante entra solo; los demás comercios, por carga desde el admin o desde la ficha; con rubro, dirección,
  horarios, WhatsApp y foto; página `/comercios` y un bloque en la nota propia sobre un comercio. Se decide cuándo en el orden de etapas.
- **Autopublicidad:** en algún momento, una campaña propia («Radar Balcarce está abierto a publicidad, precios muy económicos») en la web,
  las redes y la voz, con el media kit genérico como respuesta estándar. Se arma después del primer comercio, con lo aprendido.
- **Redes en la 3.0, lo que Hernán pide (2/11):** estandarizar todo, **mejor calidad visual**, más dinámico y más convocante. En particular
  las piezas de **Participá** (hoy tres: Tu evento, Tu reclamo, Tu nota; más Participá general): tienen que invitar de verdad a que la
  gente mande su novedad, su reclamo o lo que vio en la calle, con ejemplos nuestros («vieron esto en la calle, nos lo mandaron, hicimos
  la nota»), y ser más que tres si hace falta. El canal de entrada es WhatsApp y, en la 3.0, el bot.
- **Las voces, lo que hay hoy** (relevamiento del 2/11 sobre `CRITERIO-REDES.md`, `redes/guiones.mjs`, `reels/plan.mjs`): la regla «de
  corrido, como una sola transmisión del día» **nunca se escribió**; lo que existe y se cumple es «saludo por franja con memoria» (8/10 y
  regla 301): la primera pieza de cada franja (mañana, tarde, noche) saluda según la hora real, las que salen dentro de los 150 minutos
  siguientes empiezan con un puente o un gancho de continuidad, y todas cierran con el deseo de la franja y la misma firma. Por eso a las
  7 saluda, a las 9 no, a las 10 vuelve a saludar (pasaron 180 minutos), a las 15 «buenas tardes», a las 19 saluda, a las 20 y 21 no. Hay
  dos bancos de saludos duplicados (feriado y Participá) y una línea vieja en `CRITERIO-REDES.md` § 3 («No lleva nunca: Política ni
  Policiales») que contradice la R40. **Para decidir, Hernán:** (a) dejar el saludo por franja como está, o (b) saludar sólo en la primera
  pieza de la mañana y en la primera de la noche y que el resto del día sea continuidad. En la 3.0, un solo banco de saludos y puentes en
  `redes/piezas/`, y la decisión escrita en el `REGLAS.md` de voz.
- **Qué no va a la tapa de las redes (la muerte de un chico en el repaso):** el caso es real: la nota «Un niño de dos años muere tras caer
  a una pileta» (28/10, de Balcarce, 1 medio) **abrió** el repaso de las 21 de ese día (Instagram, reel DfD5bAYgSx-). Pasó porque hoy
  **no existe ningún filtro de tono para redes**: a redes sólo no va lo rojo, lo sin cuerpo y lo propio; el amarillo (niño, bebé, murió) se
  suelta entero para lo de Balcarce (regla 291) y el repaso ordena por Balcarce primero y relevancia, sin mirar de qué se trata. Tampoco
  hay preferencia por lo que la gente festeja (una detención, un logro). **Propuesta, para que Hernán diga sí:** una compuerta de tono
  **sólo para redes** (la web no cambia; el rojo no se toca): no entra a ningún repaso, posteo ni historia la muerte de un menor o un bebé,
  ni un accidente o una enfermedad con un chico muerto o grave, ni un suicidio, ni una tragedia familiar de acá; y en el orden del repaso,
  lo de Balcarce que es bueno o resuelto (detuvieron, recuperaron, inauguraron, ganaron, se hizo) va antes que lo trágico. Se escribe en
  `CRITERIO-REDES.md` como regla nueva con la prueba del caso real (nota 8s2k9s). **Se puede hacer ya en la 2.0** (`sePuedeEnUnRepaso` y el
  orden de `elegirParaPodcast`, `redes/elegir.mjs`) y pasa igual a la 3.0. Tono general que pide Hernán: serio pero simpático, «de centro
  o centro-derecha», un medio donde también se festejan cosas; va al `PERFIL.md`.

**Sumado el 2/11, cuarta parte** (Hernán, a la tarde, después del segundo media kit):

- **Publicidad, combos definitivos:** **$ 5.000 «Nota»** (la nota sobre el emprendimiento, el reel con voz y la historia sobre esa nota,
  y un posteo por mes con una promoción de ellos), **$ 10.000 «Nota + aviso»** (lo anterior, dos historias por semana con sus promociones
  y el aviso rotativo en el sitio todo el mes, en el lugar que Radar decida; es el que se espera que más usen) y **$ 30.000 «Auspicio»**
  (lo anterior, historias todas las semanas, el aviso en los tres lugares y el auspicio del clima dos veces en el mes, con el nombre en la
  voz). El de $ 15.000 se sacó. **No hay «primer comercio»: son precios de promoción hasta diciembre de 2026 para cualquiera.** Más
  adelante se mide qué clima (mañana o noche) se ve más, para saber cuál vender y si hacen falta otros combos.
- **Las cuatro piezas estándar de publicidad** (Hernán, 2/11), todas hechas: (1) el **media kit genérico**, PDF
  (`docs/propuestas/MEDIA-KIT-2026-11.pdf`); (2) el **media kit personalizado** a partir de las redes del comercio (un JSON por comercio en
  `docs/propuestas/anunciantes/`, y `node scripts/media-kit.mjs <json>` arma el PDF con una cuarta página: cómo quedaría su nota, el reel
  y qué le pedimos); (3) **las preguntas estándar y la lista de material** (logo, fotos sin chicos, datos, promoción:
  `PUBLICIDAD-PRIMER-COMERCIO.md` § 3 y § 4); (4) **las preguntas personalizadas** cuando se conocen sus redes (en la ficha de cada
  comercio, § 5). La plantilla vive en `docs/propuestas/media-kit/` (`plantilla.html`, `pagina-personal.html`, las dos capturas): el
  aviso se dibuja adentro de la captura real de la portada, con el nombre del comercio. En la 3.0, la página `/publicidad` sale de la
  misma plantilla y el bot arma el kit personalizado cuando Hernán le manda un enlace.

**Sumado el 2/11, quinta parte** (Hernán, a la tarde; corrige la cuarta parte):

- **Publicidad, la escalera definitiva de cuatro** (Hernán pidió que Claude la decidiera: «estoy perdido»; se corrige número por número):
  todas incluyen la nota, el reel con voz y la historia sobre la nota, y el aviso con su contacto en el sitio; crecen las promociones suyas
  y las veces que auspician el clima. **Nota $ 5.000** (1 historia al mes, aviso en 1 lugar); **Nota + clima $ 10.000** (1 historia por
  semana, clima 1 vez por semana, aviso en 1 lugar; **promoción hasta diciembre de 2026: $ 5.000**, para cualquiera); **Auspicio $ 30.000**
  (2 historias por semana, 1 posteo al mes, clima 2 veces por semana, aviso en los 3 lugares); **Banner fijo $ 50.000** (aviso fijo junto al
  clima y rotativo en los otros 2, 15 historias y 2 posteos, clima 15 veces). `PUBLICIDAD-PRIMER-COMERCIO.md` § 2.
- **El media kit es una sola hoja** (Hernán: «lindo, prolijo, con nuestro logo y color, pintoresco»): cabecera roja con la marca y un sello
  redondo, la captura del celular inclinada con cintas como las postales del sitio y el aviso del comercio dibujado adentro, «todas las
  opciones incluyen», las cuatro cajas, y para un comercio una línea con el título tentativo de su nota. `docs/propuestas/media-kit/plantilla.html`
  y `node scripts/media-kit.mjs [json]`. Las preguntas y el material pedido van aparte, en PDF (`docs/propuestas/PREGUNTAS-ESTANDAR.pdf` y
  `anunciantes/<comercio>-preguntas.pdf`), porque Hernán no puede bajar `.md` desde el celular.
- **Qué cobran los demás:** no hay tarifas públicas de medios de Balcarce ni de la zona; sólo pauta oficial a medios grandes (millones por
  mes), que no compara. La escalera está abajo de todo a propósito. Para saberlo de verdad: pedir presupuesto como cliente a tres o cuatro
  medios de Balcarce por WhatsApp (pendiente, si Hernán quiere). Detalle en `PUBLICIDAD-PRIMER-COMERCIO.md` § 2 ter.

**Sumado el 2/11 a la noche** (Hernán; cierra la publicidad y reemplaza la cuarta y la quinta parte):

- **Publicidad, cerrado.** La bienvenida (nota + reel con voz + historia) es una sola vez y para todo comercio que se suma; no se cobra
  aparte. **Lo que se vende por mes** son los climas auspiciados, las historias con sus promociones y el aviso. **Cinco planes:** $ 5.000,
  $ 10.000, $ 20.000, $ 30.000 y $ 50.000, con climas 0 / 2 / 3 / 4 / 6 (promoción hasta diciembre de 2026: 4 / 5 / 6 / 8 / 10), historias
  4 / 6 / 8 / 10 / 12, posteos con foto en los dos de arriba, y aviso rotativo en 1 / 2 / 3 / 3 lugares y fijo en el de $ 50.000. Tabla y
  razones en `PUBLICIDAD-PRIMER-COMERCIO.md` § 2; `PUBLICIDAD.md` actualizado. Las preguntas para la nota se hicieron más amenas y **sin
  pedirle al comercio una promoción para lectores de Radar** (Hernán: «eso hay que sacarlo»). El kit es una hoja sin capturas (Hernán:
  «queda una imagen pegada arriba de la otra»), con el ícono del sitio, «nos gustaría trabajar con ustedes», la bienvenida, la tabla y
  los lugares.
- **Para la 3.0, lo que esto obliga a construir:** (a) **cuatro espacios de aviso**: uno fijo (entre el clima y las notas principales, en
  la portada; se vende a uno solo por mes) y tres rotativos (después de las postales, la columna del costado, el pie de cada nota) que se
  reparten por igual entre los que pagan, por carga de página; (b) **el calendario de climas**: cada reel y nota del clima lleva un solo
  auspiciante, reservado por fecha y en orden de llegada, con lista de espera; la pieza dice «El clima de hoy llega con X» y la nota del
  clima lo muestra; (c) en `/admin`, una pestaña de avisos y auspicios: cargar el comercio, el plan, desde y hasta, el calendario de
  climas, las historias y posteos pendientes de ese mes; (d) **los avisos de afuera** (AdSense), si alguna vez se prenden, en espacios
  propios (dentro de la nota entre el tercer y el cuarto párrafo, y al final de las secciones), nunca en los cuatro locales ni rotando con
  ellos. Hernán quiere ver después, en la 3.0, exactamente dónde queda cada espacio en el celular y en la computadora.

**Sumado el 2/11 a la noche, segunda parte** (Hernán aprobó el kit: «quedó espectacular»):

- **El media kit y las preguntas estándar son el referente.** Hernán quiere pedirlos por Telegram (o el panel): «armame un media kit y
  preguntas para X Instagram». **Se puede, en la 3.0, sin claves nuevas ni otra IA:** (1) el bot recibe el enlace; (2) el Worker lee el perfil
  público por la **API de Meta («Business Discovery»)**, que con nuestro mismo `META_TOKEN` devuelve biografía, seguidores, cantidad de
  publicaciones y los últimos posteos con sus textos, fechas y me gusta de cualquier cuenta de empresa o creador (Sweet Candy Bar lo es:
  «Producto/servicio»); si la cuenta es personal, el bot avisa y se hace a mano desde el Chrome de Radar; (3) **Gemini** (la clave de
  redacción, con las reglas de `PERFIL.md` y la ficha estándar como plantilla) escribe la ficha: quiénes son, qué fotos pedir, el título
  tentativo de la nota, el texto del aviso y las diez preguntas personalizadas; (4) la ficha queda en D1 y el kit y las preguntas se arman
  con **las mismas plantillas HTML de hoy** (`docs/propuestas/media-kit/`), y el PDF lo hace **Browser Rendering de Cloudflare** (un Chrome
  sin ventana en la nube; tiene una franja gratis de minutos por día que alcanza para esto: se confirma al armar, y si no, el bot manda el
  enlace a la hoja en la web y el PDF se baja desde el celular); (5) el bot devuelve los dos PDF y el borrador del mensaje de WhatsApp.
  **No hace falta la API de Anthropic** (más cara y no suma nada acá) ni una IA que busque en internet (Tavily queda para las pistas).
  Las fotos no se bajan de Instagram: se le piden al comercio. Va como pieza de la etapa E (redacción propia). Mientras tanto, se pide por
  este chat y se hace en la PC.
- **Gemini, cómo lo va a dejar Hernán:** todo en la cuenta de Radar Balcarce, **dos claves pagas** (una para las voces, otra para la
  redacción, US$ 5 cada una) y **la clave gratis para la redacción** sigue. Pide que el código **se imponga un límite** para que la paga de
  redacción no se gaste «como si nada» (pasó el 30/10). **Hoy ya existen esos frenos** y se conservan en la 3.0: `GEMINI_RESPALDO_TOPE_DIARIO`
  (30 pedidos por día a la clave paga de texto, `reels/claves.mjs`), el modelo siempre más barato (`GEMINI_MODELO_BARATO`, R40) y el **cupo de
  voz de 10 audios por día**. Dos cosas que conviene que Hernán sepa al cargar: (1) Google no deja «cargar US$ 5»: cobra a fin de mes lo que
  se usó, con una tarjeta; el «presupuesto» de la consola **sólo avisa, no frena**: el freno de verdad es el tope del código; (2) una clave
  por proyecto de Google Cloud, con el nombre de para qué es (`radar-voces`, `radar-redaccion`), así la factura dice cuánto gastó cada una.
  Con el núcleo nuevo (dos pedidos por nota publicada, cero por nota no publicada) el gasto esperado es de centavos por día.
- **Compuerta de tono para redes: Hernán dijo «sí, hacelo».** Se hace ya en la 2.0 (`esTragediaParaRedes` en `redes/elegir.mjs`,
  prueba `pruebas/tono-redes.test.mjs` con el caso real 8s2k9s, regla 4.10 de `CRITERIO-REDES.md`, **R41** en `docs/10-REGLAS-Y-PRUEBAS.md`)
  y pasa igual a la 3.0. La web no cambia; el rojo no se toca. El orden «lo bueno antes que lo trágico» queda para la 3.0.

**Sumado el 2/11 a la noche, tercera parte** (Hernán, al cerrar el día):

- **Gemini, cómo carga Hernán:** ya probó que Google le deja **cargar saldo prepago** (US$ 10 o 20) y la API gasta de ahí, no cobra lo que
  quiere; con eso el tope de gasto es el saldo. Los topes del código quedan igual (30 pedidos por día a la clave paga de redacción, porque
  la gratis debería alcanzar; y un tope de voz cuando la clave de voces sea paga). **Excepción a mano:** si Hernán pide por Telegram «este
  audio igual hacelo», o es una nota propia suya o una pieza de un auspiciante, se hace aunque esté fuera del tope de audios del día: los
  topes frenan lo automático, no lo que pide una persona. **Los primeros días después de la 3.0 se mira el gasto juntos** por el chat
  (redacción y audios) y se ajustan los números. Sobre las voces: una clave nueva en el **mismo proyecto de Google** conserva las dos
  voces propias; un proyecto nuevo las pierde (Voice Design no las repite). Hernán no sabe con qué cuenta hizo el proyecto de voces; si no
  es la de Radar, no importa: se le carga saldo a esa y listo.
- **Publicidad de Radar (autopromoción):** se arma primero **la animación sola, sin voz** (para no gastar cupo), con la estética del sitio y los
  precios visibles y detallados; Hernán la ve y después se suma la voz. El texto, **más ameno, como el del media kit**: invita a los
  comercios de forma económica, «queremos que participen todos». Lo mismo para **las tres piezas de Participá** (Tu evento, Tu reclamo, Tu
  nota): buscarles un gancho, pensarlas más virales, en distintos tonos, para que la gente se sume a contar sus eventos y lo que ve.
- **Guía comercial, otra vez:** retomar en algún momento el mapa comercial que se había armado (datos de Google y de «millones de lados»),
  como servicio de Radar: comercios, turismo, alojamientos (Airbnb), indexados y con la invitación a participar en el medio («es un ida y
  vuelta»). Se trabaja aparte, después del corte. Los auspiciantes son para financiar en parte el medio, no una ganancia.
- **La tapa y las listas de notas:** Hernán la ve «media anticuada»; quiere analizar con modelos chicos cómo modernizarla y que las notas en
  lista lleven más foto y se vean mejor. Entra en la etapa C (el sitio por Worker): antes de dibujar, una propuesta con dos o tres
  maquetas para que elija (ver [[feedback-cambios-visibles-del-sitio]]: la portada se propone antes de cambiarla).
- **Todo tiene que quedar guardado y armado para arrancar la 3.0 «ya, en lo inmediato»**: lo que falta de Hernán es sólo la clave paga (está
  en eso) y la charla de `PERFIL.md`.
