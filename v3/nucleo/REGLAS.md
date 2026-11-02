# El núcleo: las reglas

*Módulo `v3/nucleo/`. Es el corazón de Radar 3.0: lee las fuentes, junta la misma noticia contada por varios, decide qué sale, la escribe,
la verifica y le busca foto. Todo lo que está acá es lo que el programa hace; si el programa hace otra cosa, el programa está mal.
Escrito el 1/11/2026 con las decisiones de `docs/propuestas/PLAN-RADAR-3-0.md` (sección 10). Lo corrige Hernán cuando quiera.*

## 1. Las fuentes (`fuentes.json`)

- Una sola lista, en un solo archivo. Cada fuente: nombre del medio, dirección del feed, **alcance** (`balcarce`, `zona`, `provincia`,
  `pais`), si es **oficial** (municipio, concejo, organismos), y `activa`. Nada más.
- Se parte de las 95 fuentes del sistema viejo (`fuentes.exportadas.json`, 15 de Balcarce y 80 del país; 69 activas). Se limpian al
  armar el lector: lo que no aportó nada en 30 días se apaga, y Hernán decide si se borra.
- Una fuente que falla 3 días seguidos se marca y se avisa por Telegram una vez; no se insiste cada vuelta. (Una fuente que nunca anduvo bien se
  avisa después de un día entero de fallas, no por un tropiezo.)
- **Dos medios de Balcarce no tienen feed** (El Diario Balcarce y Diario La Vanguardia): se leen entrando a la **portada** (tipo `portada`). Se sacan los
  enlaces de la portada con un patrón escrito en `fuentes.json`, se descartan los que ya están guardados y de los nuevos se baja la página, de a **15
  por vuelta** como mucho. De la página salen el texto, la imagen y la fecha de publicación (`article:published_time`; si no trae zona horaria es hora de
  Balcarce; si no trae fecha, se toma como recién leído). Una página que no llega queda para la próxima vuelta; una de más de 36 horas no entra, pero se
  guarda sin agrupar para no bajarla otra vez. Los sepelios de El Diario no se cuelan en el texto (se toma el cuerpo de la nota, no el bloque más largo).

## 2. Leer

- Cada **15 minutos**, todas las fuentes activas, en paralelo, con tope de 10 segundos cada una. Lo que no llegó, llega en la próxima.
- De cada artículo se guarda: título, bajada, texto (si el feed lo trae; si no, se baja la página una sola vez), fecha, enlace,
  imágenes candidatas (dirección, ancho y alto si se saben) y de qué fuente vino. Se guarda una vez: el mismo enlace no se vuelve a leer.
- Lo que tiene más de **36 horas** al leerlo por primera vez no entra (no estrenamos noticias viejas).

## 3. Agrupar la misma noticia (una sola técnica)

- Cada artículo nuevo recibe una **huella de significado** (vector, Workers AI, gratis) de su título y primer párrafo.
- Se compara con las historias vivas de las últimas 72 horas. Si la cercanía supera el umbral alto, se une a esa historia. Si queda en
  la **banda de duda** (entre los dos umbrales), lo decide una IA chica con una pregunta de sí o no: «¿Estos dos textos cuentan el mismo
  hecho?». Por debajo del umbral bajo, es una historia nueva.
- Los umbrales se calibran una vez con 200 pares reales antes del corte y quedan escritos acá con su fecha. No hay cruce por palabras,
  ni cruce coherente, ni juez de hecho principal: **esta es la única manera**.
- Una historia tiene un solo **hecho**: si la IA de duda dice que dos textos de la misma historia hablan de hechos distintos (por ejemplo,
  una nota de Balcarce pegada a un evento nacional), se parte. Esa es la única excepción, y queda registrada.
- La **fecha del hecho** es la mediana de las fechas de sus artículos. Nunca rejuvenece.

## 4. Elegir (antes de escribir)

Sin semáforo, sin puntajes, sin cupos por sección. Una historia sale si cumple **una** de estas tres:

1. **Es de Balcarce o la zona** (lo dice una fuente de alcance `balcarce` o `zona` con texto propio, o el título nombra Balcarce o una
   localidad del partido). Sale siempre, con una sola fuente alcanza.
2. **La cuentan 3 medios distintos** del país (2 si es de un área chica: Tecnología, Ciencia, Salud, Educación, Cultura, Agro,
   Automovilismo). Medios distintos: no cuentan dos feeds del mismo medio ni una agencia y su copia textual.
3. **La pidió una persona** (por Telegram o el panel).

Y no sale, aunque cumpla, si:

- Identifica a un **menor** o a una **víctima** que no es figura pública, o es una **lista de sepelios**. (Los dos únicos frenos legales:
  los aplica la IA en el mismo pedido de redacción, con una marca `no_publicar` y el motivo; si marca, no se publica y se avisa.)
- Es del extranjero sin ningún argentino en el título ni en la primera oración.
- Es horóscopo, lotería, cotización del día o un sorteo comercial.
- Ya hay una historia viva del mismo hecho (eso lo resuelve el punto 3; si falla y se descubre después, se unen y la nueva redirige).

Tope de **100 nacionales por día** (decisión del 1/11); si se llena, entran las más contadas. Balcarce nunca tiene tope. Lo que ya salió
no se baja. Cada decisión queda anotada (`motivo`), para que `¿por qué no salió?` tenga respuesta sin adivinar.

La **sección** la decide la IA al redactar, entre catorce: Balcarce, Política, Policiales, Educación, Salud, Fútbol, Deportes,
Automovilismo, Agro, Economía, Ciencia, Cultura, Tecnología y Argentina. Lo de Balcarce va a Balcarce aunque sea de otra cosa.

## 5. Redactar y verificar (dos pedidos por nota)

- **Pedido 1, la nota y la ficha.** La IA recibe el perfil (`PERFIL.md`), las reglas de escritura (`REDACCION.md`) y hasta 6.000
  caracteres de cada fuente (18.000 en total, las fuentes oficiales primero). Devuelve, en un solo JSON: título propio, bajada de una
  oración, cuerpo (párrafos cortos, lo más importante primero), sección, **«En dos líneas»** (qué pasó y qué sigue), la **ficha**
  (qué, quién, dónde, cuándo, números con su unidad y su fuente, fechas de la cronología, qué falta saber) y la marca `no_publicar`
  si toca un freno legal.
- **Pedido 2, la verificación.** Otra llamada, con el texto escrito y las fuentes: «marcá cada oración que diga algo que ninguna fuente
  dice». Si marca una, se saca esa oración; si marca más de dos, la nota se reescribe una vez (pedido 1 de nuevo); si vuelve a fallar,
  no sale y se avisa. Nunca más de 4 pedidos de texto por historia (redactar, verificar, reescribir, verificar; lo normal son 2).
- El **largo** lo da el material: una fuente corta, 120 a 180 palabras; tres o más fuentes, 250 a 400; una historia con muchos datos,
  hasta 550. Nunca relleno.
- **Firma:** «Redacción Radar Balcarce», con la leyenda «escrita con IA a partir de N fuentes y verificada contra ellas». Las notas que
  pide Hernán: «Hernán Accomo».
- Lo que nunca: inventar, agregar lo que ninguna fuente dice, copiar oraciones, adjetivar, «en las últimas horas», «según trascendió».

## 6. Valor agregado (lo arma el programa, nunca la IA)

De la ficha salen, sólo cuando hay con qué: **Los datos** (campos de la ficha), **Cronología** (3 fechas o más), **Cifras** (números con
unidad), **Contexto** (de una tabla fija de Radar: distancias, nombres de lugares, antecedentes; o un dato que trae una fuente, con
quién lo dice), **Qué falta saber** y **Más en Radar** (historias vivas del mismo tema, por huella). «En dos líneas» va siempre.
«Qué dicen las fuentes» **no existe** (decisión del 1/11): queda el desplegable «Fuentes (N)» con nombre y enlace.

## 7. Fotos

En este orden, y se para en la primera que sirve:

1. **Una foto de las fuentes** de esta historia: la más grande que no sea logo ni placa. Una IA de visión contesta tres cosas: ¿tiene
   marca de agua o nombre de otro medio? ¿muestra a un menor o a una víctima? ¿es de esta noticia o de archivo? Con un «sí» en las dos
   primeras, o si no tiene relación con la noticia, se descarta; la de archivo sirve. Crédito del medio en el epígrafe, siempre.
2. **Una foto libre** (Wikimedia Commons u Openverse) buscada por el nombre de la persona o el lugar, **sólo si la visión confirma** que
   es esa persona o ese lugar.
3. **Una ilustración** generada (Workers AI), con «Ilustración: Radar Balcarce» en el epígrafe.

Cada foto publicada tiene una **huella visual**: la misma foto (o casi) no puede estar en dos notas vivas; la segunda sigue al paso
siguiente. Nombre de archivo y texto alternativo descriptivos, generados de la ficha (`balcarce-camioneros-examen-licencia.jpg`), nunca
el nombre original del medio. Nunca una foto real de un menor o una víctima.

## 8. Lo que el núcleo entrega

Una nota lista en la base (D1) con: id corto, título, bajada, cuerpo, sección, «en dos líneas», ficha, bloques de valor agregado ya
armados, foto (en R2) con crédito y alt, fuentes (nombre y enlace), fecha del hecho, firma, motivo de selección. El sitio la muestra al
instante; las redes la toman de ahí. El núcleo no sabe nada del sitio ni de las redes.

## 9. Costos por nota publicada

2 pedidos de texto a la clave paga (3 si hubo reescritura), 1 a 3 pedidos de visión (gratis o centavos), huellas gratis. Lo que no se
publica cuesta **cero** pedidos de texto. Tope mensual en la clave: lo pone Hernán en Google; el núcleo además se frena solo si pasa
los US$ 15 en el mes y avisa.

## 10. Pruebas

Cada regla de arriba tiene una prueba con un caso real (`*.test.mjs`, sin red). Cuando algo sale mal publicado, se suma el caso acá
y en la prueba, no una regla nueva.
