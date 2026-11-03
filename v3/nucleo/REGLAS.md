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

Tope de **40 nacionales por día** y **5 medios** (3 en las áreas chicas) desde el 3/11 (opción B de Hernán; variables `NUCLEO_TOPE_NACIONAL`, `NUCLEO_MINIMO_NACIONAL`, `NUCLEO_MINIMO_AREAS_CHICAS` de `wrangler.toml`; antes 100 y 3); si se llena, entran las más contadas. Balcarce nunca tiene tope. Lo que ya salió
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
quién lo dice) y **Más en Radar** (historias vivas del mismo tema, por huella). «En dos líneas» va siempre.
«Qué dicen las fuentes» **no existe** (decisión del 1/11): queda el desplegable «Fuentes (N)» con nombre y enlace.

## 7. Fotos

En este orden, y se para en la primera que sirve:

1. **Una foto de las fuentes** de esta historia: la más grande que no sea logo ni placa. Una IA de visión contesta tres cosas: ¿tiene
   marca de agua o nombre de otro medio? ¿muestra a un menor o a una víctima? ¿es de esta noticia o de archivo? Con un «sí» en las dos
   primeras, o si no tiene relación con la noticia, se descarta; la de archivo sirve. Crédito del medio en el epígrafe, siempre.
   **Cómo se busca (3/11, caso «falleció un jugador», 6 fuentes y sin foto):** (a) se prueban las imágenes que el lector guardó (feed y, si bajó la página,
   `og:image`), con las medidas que declara la dirección cuando el feed no las trae (`medidasDeUrl`: `_2000x1500_`, `/1200x675/`, `?width=`) y una miniatura de
   WordPress (`-300x200.jpg`) vuelve a su original; (b) si ninguna sirve, se bajan las páginas de las fuentes (hasta 6) y se miran su `og:image` y
   `twitter:image` (un feed con el texto completo nunca bajaba la página); (c) la visión mira hasta **6** candidatas y corta apenas una sirve; dos fallos
   seguidos de Gemini cortan la búsqueda. Si no hay foto, `verificacion.fotoMotivo` dice por qué (`sin-candidatas`, `chicas`, `logo-o-forma`, `error-descarga`,
   `todas-con-marca`, `todas-con-menor-o-victima`, `todas-descartadas`, `error-vision`) junto con `fotoIntentos` y `fotoIntentada`.
   **Reintento:** una vez por vuelta, hasta 5 notas publicadas en las últimas 24 h sin foto vuelven a buscarla (45 minutos entre intentos, 4 en total).
   **Pendiente:** los pasos 2 (foto libre confirmada por la visión) y 3 (ilustración con Workers AI) de esta lista todavía no están hechos.
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
los US$ 7 en el mes y avisa (Hernán, 3/11: texto y voces juntos, menos de US$ 10).

## 10. Pruebas

Cada regla de arriba tiene una prueba con un caso real (`*.test.mjs`, sin red). Cuando algo sale mal publicado, se suma el caso acá
y en la prueba, no una regla nueva.

- **Limpieza diaria** (con el resumen de las 21:30, `podar` en `db/db.mjs`): se borran los artículos de más de 14 días que no son de una historia con nota, las historias `no_sale` de más de 14 días y las dudas de más de 30; si falla, el resumen sigue.

## 11. El interruptor de publicar (`NUCLEO_PUBLICA`)

Variable de `v3/nucleo/wrangler.toml`, `"no"` por defecto. **La cambia una persona el día del corte**, nadie más (ni un workflow ni una IA).

- **`"no"`**: todo como antes. Las notas quedan `estado = 'borrador'`, el sitio no las muestra, el resumen de las 21:30 dice «hoy habría publicado N notas».
- **`"si"`**: cada nota que el núcleo termina (verificada y sin `noPublicar`) se guarda `estado = 'publicada'` (con `publicada_en` si la base tiene esa
  columna). Una nota frenada (`noPublicar`: menor, víctima, verificación) sigue en borrador, siempre. Además, **una vez por vuelta** se pasan a publicadas
  los borradores del núcleo de las últimas 24 h que estén bien (título y cuerpo, sin freno): sirve para el arranque, y no repite nada porque lo ya
  publicado deja de ser borrador. El resumen dice «hoy publicó N notas». El slug lo fija el sitio la primera vez que la muestra (`sitio_notas`).
- `/salud` dice `publicando: true|false`.
- Apagarlo (`"no"`) no despublica nada: lo ya publicado se retira a mano.

Otra regla de esta vuelta: cada fuente con falla guarda en `fuentes_estado.ultima_falla` cuándo y por qué (el texto del error, 90 caracteres) y `/salud`
lo muestra como `ultimaFalla` (120 caracteres como mucho). Los feeds tienen dos relojes: 10 s para que el sitio responda y 25 s para bajar el cuerpo,
hasta 1,5 MB, y se leen los primeros 80 ítems (Infobae manda ~1 MB por feed).

## 12. La nota diaria del clima (`clima/clima.mjs`, 3/11/2026, aprobada por Hernán)

- **Una nota por día**, id `clima-AAAA-MM-DD` (una fila en `notas` y su historia con motivo `clima`). Sale en la **primera vuelta desde las 7:30** (hora de Balcarce); si a
  las 12:00 todavía no salió (Open-Meteo caído toda la mañana), ese día no sale: no se publica a la tarde un pronóstico de la mañana. Vueltas siguientes: no hace nada.
- **No hay actualización de las 19** (Hernán, 3/11): la nota sale **una sola vez por día, a la mañana**, y no se toca más. El código de la revisión sigue escrito pero apagado
  (`REVISION_DE_LAS_19 = false` en `clima.mjs`; `queToca` nunca devuelve `'revisar'`). Lo que sigue, hasta «Datos», describe esa revisión apagada. En el sitio, la nota del día va en la
  tapa y en la sección Balcarce como una nota más (sólo la de hoy; las de días anteriores quedan con su página pero fuera de las listas) y lleva al final «Mirá el clima de hoy en video»,
  con Facebook e Instagram.
- _(apagado)_ **A las 19:00** (entre las 19:00 y las 22:00, una sola vez) se pide el pronóstico de nuevo y se compara con el que guardó la nota (`verificacion.resumen`). Si cambió de
  forma importante se **actualiza la misma nota** (mismo id, misma dirección, `creada` intacta: no rejuvenece) y arriba va un párrafo «Actualización de las 19: …». Cambia de
  forma importante si, **para Balcarce**: (a) mañana o pasado la lluvia aparece o desaparece; (b) la máxima de mañana o pasado se mueve **4° o más**; (c) se suma o se va una
  tormenta; (d) aparece una ráfaga de **60 km/h o más**; (e) para lo que queda de hoy (desde las 19) aparece o desaparece lluvia o tormenta. Open-Meteo **no trae alertas
  oficiales**: la tormenta y la ráfaga fuerte son lo más cercano; las alertas del SMN las lee la gente en smn.gob.ar/alertas (la nota lo dice siempre). Si no cambió, la
  nota queda igual y se anota `revisada19`.
- **Datos:** un solo pedido a Open-Meteo con cinco coordenadas (Balcarce, Mar del Plata, Miramar, Necochea, Tandil; las mismas del sitio, copiadas), por hora y por día,
  3 días. Con eso el código arma un **resumen numérico cerrado** (máxima, mínima, probabilidad y milímetros de lluvia, ventanas de lluvia —horas con ≥ 0,2 mm o ≥ 70 % de
  probabilidad, juntando las separadas por una hora—, viento y ráfagas, tormenta, y las diferencias de la costa y la sierra con Balcarce). Los números salen sólo de ahí.
- **Redacción:** la **plantilla** (código puro) siempre se arma primero: título «Cómo viene el martes en Balcarce: lluvia de 15 a 19 y máxima de 20°», bajada, cinco
  párrafos (Balcarce hoy con el consejo «llevá paraguas de 15 a 19», temperatura contra la costa y la sierra, dónde y a qué hora llueve, viento, los dos días que siguen) y el
  cierre fijo con `radarbalcarce.com/clima` y `smn.gob.ar/alertas`. Después **Gemini** (la misma clave, modelo y contador del núcleo; tarea `clima` en `uso_ia`) reescribe con
  mejor prosa **a partir del resumen** (pedido 1) y el **verificador de `redactar/verificar.mjs`** lo revisa con el resumen como única fuente (pedido 2). Además el código
  controla que **todo número del texto esté en el resumen** (o sea una diferencia suya). Sale la plantilla, sin error, si: no hay clave, se llegó al **tope diario** o al **freno
  mensual** (en esos casos ni se llama), Gemini falla, el JSON no cumple (título que no empieza con «Cómo viene», 4 o 5 párrafos, sin direcciones web ni emojis), hay un número
  que no está en el resumen o el verificador marca más de 2 oraciones sin respaldo. Cada nota guarda `verificacion.redactor` (`gemini` o `plantilla`) y `motivoPlantilla`.
  Costo: 2 pedidos por edición (0 si sale la plantilla), como mucho 4 por día.
- **Firma** «Radar Balcarce», sección Balcarce, fuente «Open-Meteo». **Sin foto** (`foto = null`; la búsqueda de fotos la salta por el id `clima-%`): el sitio pone la placa o una
  ilustración (ver abajo).
- **Marcas para el sitio** (en `ficha`, que el sitio ya lee): `ficha.marca = { tipo: 'clima-diario', fecha: 'AAAA-MM-DD' }` (cómo reconocer la nota), `ficha.indexar = false`
  (el clima diario iba con `noindex` en el sitio viejo; el núcleo no tiene hoy una columna ni un campo propio de «no indexar»: la marca es ésta y el sitio decide),
  `ficha.estadoDelCielo` (despejado, parcialmente-nublado, nublado, lluvia, tormenta, niebla, viento, frio o calor: los nombres de las ilustraciones `clima-<estado>-<n>.jpg` del
  sitio viejo) y `ficha.actualizadaEn` (ISO, sólo con la revisión de las 19, hoy apagada: siempre `null`).
- **El resultado de la vuelta** trae `clima`: `null` (no tocaba), `{ accion: 'salio' | 'actualizo' | 'sin-cambios' | 'error', redactor, motivoPlantilla, … }`.
- Con `NUCLEO_PUBLICA = no` queda en borrador como todas. Pruebas: `clima/clima.test.mjs` (horarios, resumen, plantilla, decisión de actualizar, Gemini y sus fallos, la vuelta entera).
