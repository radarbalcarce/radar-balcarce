# 02 · La ingesta: de dónde salen las noticias y cómo se leen

*Actualizado el 17/10/2026. Si el código cambia, manda el código.*

El primer tramo del recorrido: desde que se sale a buscar a los medios hasta que
cada hecho queda armado como una "historia" con sus fuentes. Qué se decide
después está en `docs/03-SELECCION.md`; cómo se escribe, en
`docs/04-REDACCION.md`; las fotos, en `docs/05-FOTOS.md`.

## En una frase

Cada media hora se leen todas las fuentes activas, se descarta lo que por su
sección nunca le importaría a Balcarce, se juntan las notas de distintos medios
que cuentan el mismo hecho (el "cruce de medios") y de cada hecho queda una sola
historia con todas sus fuentes numeradas.

**Tres palabras antes de empezar:**

- **Feed (o fuente):** una dirección que se lee. Un medio puede tener varias (TN
  tiene la general, Política, Economía, Deportes, Sociedad y su índice de noticias).
- **Medio:** el diario, la radio o el organismo. Todos los feeds de un medio
  llevan el mismo nombre en el campo `medio`, así un medio cuenta una sola vez.
- **Nota e historia:** una nota es lo que publicó un medio; una historia es un
  hecho, con todas las notas que lo contaron. Lo que publica Radar es una historia.

---

## El recorrido, paso a paso

### 1. Quién la dispara

- **En la nube (lo normal):** "Actualizar la web" (`.github/workflows/actualizar.yml`,
  cada media hora; lo dispara el reloj de Cloudflare, el Worker `radar-balcarce-reloj`
  de `infra/reloj-cloudflare/`, a los :00 y :30; desde el 17/10 el workflow no tiene
  `schedule` propio) corre `web/scripts/generar-datos.mjs`.
  Ese script llama
  a `ingestar()` de `ingesta/ingesta.mjs`, con `idsConocidos`: los identificadores
  de lo que ya está en `web/data/portada.json` y `web/data/archivo.json`, para que
  una nota publicada no cambie de dirección (paso 12), e `idsUnidos`: las que ya se
  unieron a otra (`web/data/fusionadas.json`, regla 175).
- **En la PC:** `generar-datos.mjs` no hace nada (sale con un aviso) salvo con
  `ARMAR_EN_LA_PC=1 npm run datos`, y lo que deja en `web/data/` no se sube. El
  panel de la PC (puerto 4321) se retiró el 17/10/2026: nunca se usó; queda en el
  historial de git.
- **A mano:** `node ingesta/ingesta.mjs` corre todo y deja el resultado en
  `ingesta/salida/` (`portada.json`, `preview.html`, `farmacias-crudo.txt`).

### 2. La lista de fuentes

Las fuentes viven en dos archivos y se juntan en `TODAS_LAS_FUENTES`
(`ingesta/ingesta.mjs`). Se leen sólo las que no dicen `activa: false`.

| Lista | Archivo | Qué son |
|---|---|---|
| `FUENTES` | `ingesta/fuentes.mjs` | Los medios de Balcarce y la Municipalidad |
| `FUENTES_NACIONALES` | `ingesta/fuentes.mjs` | Región, provincia, nacionales y temáticas "de siempre" |
| `FUENTES_CRUCE` | `ingesta/fuentes-cruce.mjs` | Las del cruce de medios, una por línea |

Al 16/10 son 265 configuradas y **103 activas, de 71 medios**: 15 feeds de 11 medios
de Balcarce, 11 de la región (casi todos de Mar del Plata y Tandil), 11 de la provincia y 66 de 38
medios nacionales. El 15/10 se apagó todo lo que quedó fuera de la lista elegida
(todas las de Balcarce, las mejores del país y las mejores de Tandil y Mar del Plata;
`docs/DECISIONES.md`): queda configurado con `activa: false` y la nota "fuera de la
lista elegida". La cuenta al día y la lista entera están en **`FUENTES.md`**, que no se edita a mano: lo escribe
`node ingesta/listar-fuentes.mjs`, y `pruebas/fuentes-registro.test.mjs` falla si
alguien toca una fuente y no lo vuelve a correr.

Cada fuente es una ficha con estos datos:

| Campo | Qué dice | Para qué sirve |
|---|---|---|
| `id`, `nombre` | Identificador y nombre del feed | Registro y panel |
| `medio` | El nombre del medio, **igual para todos sus feeds** | Contar medios distintos en el cruce (`pruebas/cruce-coherente.test.mjs`) |
| `url` | Dónde se lee | — |
| `tipo` | `rss`, `atom`, `sitemap` o `scrape` | Cómo se lee (paso 4) |
| `alcance` | `local`, `region`, `provincia` o `pais` | Qué es de Balcarce, qué entra al filtro y al cruce |
| `ciudad` | De dónde es el medio (las de Balcarce y las nacionales no la llevan) | La recibe la lectura con IA (`docs/03-SELECCION.md`, paso 8) |
| `peso` | Cuánto suma a la relevancia: 24 a 30 los de Balcarce; de los nacionales, 8 la mayoría (44 de 66) y 7 a 16 el resto | Ordenar, nunca decidir si sale (`docs/03-SELECCION.md`, paso 3) |
| `oficial` | `true` si es un organismo público. Activos hoy: la Municipalidad, el Concejo Deliberante y la Facultad de Ciencias Agrarias de Balcarce (el Gobierno de la Provincia sigue en la lista, apagado). El INTA va **sin** la marca, a propósito: con ella saldría solo sin que lo cuente otro medio | Verde en el semáforo y verificación ALTA. La historia es oficial si **cualquiera** de sus fuentes lo es (paso 13). Un organismo de Balcarce no pide medios ni espera a la IA (regla 180, `docs/03-SELECCION.md`) |
| `grupo` | El dueño o el sistema que comparten varios medios (`Grupo Clarín`, `eleco.com.ar`) | Al contar medios, los del mismo grupo cuentan **una** vez (`contarMedios`, `ingesta/ingesta.mjs`, desde el 15/10) |
| `activa`, `nota` | `activa: false` apaga la fuente; `nota` dice por qué y desde cuándo | Sólo se leen las activas |
| `seccion` | La sección fija, si el feed ya viene separado por tema | Clasificar (`docs/03-SELECCION.md`, paso 2) |
| `temas` | Descripción para personas | Nada automático (salvo `automovilismo`, que exime del filtro de "autos") |
| `patronEnlace`, `base`, `prefijoTitulo` | Sólo en las que se raspan | Reconocer los enlaces a notas en el HTML |
| `agente`, `sinCompresion`, `maxNotas` | Arreglos para un sitio puntual: otro nombre de navegador, pedir sin compresión, cortar un feed enorme | Ver "Fuentes apagadas por bloqueo", al final |

`fichaDeFuente()` (`ingesta/fuentes.mjs`) deduce de esos campos el **tipo** de
fuente (oficial, de Balcarce, de la región, provincial, nacional por sección o
general) y su **ciudad**.

### 3. Bajar cada fuente

`traer()` baja todas las fuentes **a la vez**, cada una con 15 segundos como
máximo y el User-Agent `RadarBalcarce/0.1 (agregador local de noticias de
Balcarce)`. Lee como UTF-8 y, si queda lleno de caracteres rotos, vuelve a leer
como latin1 (varios sitios no dicen cómo están escritos).

Si falló por algo del momento (la conexión se cortó, un error 5xx o "demasiados
pedidos", 429), se vuelve a probar **una** vez a los dos segundos
(`traerConReintento`); un 403, un 404 o el tiempo vencido no se reintentan.
Una fuente que falla no frena a las demás: queda con `estado: 'error'`, y en
GitHub `generar-datos.mjs` escribe un aviso amarillo arriba de la corrida
("Fuente caída", o "Fuente vacía" si no trajo ninguna nota).

### 4. Leer cada tipo de fuente

**RSS y Atom** (`parsearFeed`). De cada entrada se toma:

- el **título**, sin HTML y con las entidades traducidas (`decodificar`, de
  `ingesta/articulo.mjs`);
- el **enlace**. En Atom se busca el de la página (`enlaceAlternativo`): Blogger
  (Infórmese Primero) pone primero la entrada del feed, que es XML. Ese primer
  enlace se guarda como `enlaceFeed`: con él se calcula el identificador (para que
  no cambie ninguno ya publicado) y de ahí se baja el texto completo;
- la **fecha** (`pubDate`, `published`, `updated` o `dc:date`); sin fecha, o con
  una que no se entiende, la hora de ahora (paso 5);
- el **resumen** (`content:encoded`, `content`, `description` o `summary`), sin
  HTML. Con más de 400 caracteres la nota queda marcada `textoCompleto`;
- la **imagen** (enclosure, `media:content`, `media:thumbnail` o la primera
  `<img>`) y las **categorías** del medio.

**Índices de noticias** (`sitemap`, los que cada sitio arma para Google News).
Traen todo el día, no sólo las últimas 10 o 20 notas, pero sin resumen: en el
cruce se comparan por el título. `tituloDelSitemap` arregla a La Tecla, que pone
palabras sueltas en el título ("Vista") y el título de verdad en el epígrafe de la
foto: con cinco palabras o menos y un epígrafe de seis o más que no empieza con
"Foto", "Crédito" o "Gentileza", se usa el epígrafe.

**Páginas que se raspan** (`parsearScrape`, los medios sin feed: El Diario
Balcarce, La Vanguardia, Argenpapa). Se buscan en el HTML los enlaces con la forma
de una nota del medio (`patronEnlace`; por defecto, direcciones que terminan en
"-número"). Si la tarjeta trae un `<h2>`, ése es el título; `prefijoTitulo` saca
una etiqueta fija ("Argentina:"). Un texto de menos de 25 o más de 140 caracteres
no es un título (así se coló una vez el "quiénes somos" de un medio). Estas notas
llegan **sin fecha ni resumen** y quedan marcadas `fechaEstimada`.

### 5. Las fechas

Una nota sin fecha no puede competir con las que la tienen y, peor, parecería de
hoy en cada corrida. Por eso:

1. **Las notas raspadas se abren una por una** (`ampliar`, de a 4, 12 segundos
   cada una). De los metadatos de la página se toma la bajada (`og:description`,
   si pasa de 40 caracteres), el título entero (`og:title`, si el de la portada
   venía cortado), **la fecha real** (`article:published_time` u
   `og:updated_time`, por vieja que sea, si no es de más de un día en el futuro) y
   la foto (`og:image`, sólo como señal de nota trabajada: no se publica).
2. **Lo raspado de más de 72 horas no se trae** (`HORAS_DE_UNA_NOTA_NUEVA`): la
   portada de un medio mostraba notas de 2025 como de hoy. Una nota a la que no se
   le pudo sacar la fecha **sí entra**, con la hora de ahora y la marca "sin fecha
   en la fuente". Desde el 16/10 (regla 180) pasa lo mismo con **los feeds de los
   medios de Balcarce**: lo de más de 72 horas que nunca salió no entra al cruce
   (`esViejaSinSalir`: el Concejo traía notas de marzo y arrastraban a las nuevas a
   "llegar tarde"); lo ya publicado y lo sin fecha entran igual. Es un colador grueso: los cortes de verdad (12 horas para
   estrenar, 36 en la portada) los hace la web (`docs/03-SELECCION.md`, paso 10).
3. **La primera vez que se vio cada nota** (`web/data/vistas.json`). En cada
   corrida, antes de decidir nada, `generar-datos.mjs` anota por identificador la
   primera hora en que apareció. Se poda a 7 días (`DIAS_DE_VISTAS`), un
   identificador por renglón. Una nota "sin fecha en la fuente" usa esa hora como
   su fecha; una con fecha nunca puede ser más nueva que ella (`fechaReal`,
   `docs/03-SELECCION.md`, paso 10).

### 6. El filtro de entrada: lo que no se trae

`motivoDeDescarte()` mira cada nota y dice por qué no entra, o nada.

0. **La quiniela y la lotería** (`TITULO_LOTERIA`), de **cualquier** medio, también
   de los de Balcarce, salvo que la nota nombre algo de Balcarce. Motivo: "lotería o
   quiniela: sólo si gana alguien de Balcarce". (Desde el 15/10 de verdad: antes la
   función se llamaba sólo para los de afuera, regla 175.)

**De los medios de Balcarce, lo demás entra todo.** De los de afuera, además:

1. **El título, por el horóscopo** (`TITULO_HOROSCOPO`: "horóscopo", "números de
   la suerte", "predicciones para cada signo"…), que algunos medios publican en
   secciones genéricas. Motivo: "consejo genérico".
2. **La sección que le puso el propio medio**, leída de la dirección de la nota
   (los tramos de `infobae.com/mexico/…`, sin el último, que es el nombre de la
   nota): así un juego de palabras no engaña. La lista es `SECCIONES_QUE_NO_ENTRAN`
   (`ingesta/fuentes.mjs`):

| Motivo | Tramos de la dirección | Excepción |
|---|---|---|
| "de otro país" | `mexico`, `espana`, `peru`, `colombia`, `america`, `estados-unidos`, `venezuela`, `chile`, `uruguay`, `el-mundo`, `mundo`, `internacional`, `internacionales`, `futbol-internacional` | Entra igual si la fuente es de automovilismo, si nombra a una figura argentina (`FIGURAS`) o si el título tiene conexión argentina (`CONEXION_ARGENTINA`: argentina/o/s, Milei, Malvinas, Boca, River) |
| "policial de afuera" | `policiales`, `seguridad` | Ninguna: los policiales son sólo de Balcarce |
| "consejo genérico" | `autos`, `horoscopo`, `astrologia`, `recetas` | Ninguna |

El registro de "Actualizar la web" dice cuántas descartó cada fuente ("Clarín: 12
no entran por la sección del medio").

### 7. Las marcas de lo de afuera (`marcarDeAfuera`)

Toda nota de afuera que pasó el filtro recibe **una** de estas marcas, la primera
que corresponda:

1. **`nombraBalcarce`**: el **título** dice Balcarce o una localidad del partido
   (`PALABRAS_LOCALES`: balcarce, balcarceño, Napaleofú, Ramos Otero, Laguna La
   Brava, INTA Balcarce, autódromo Juan Manuel Fangio…). Nombrarla en el texto no
   alcanza: una nota de Necochea que nombraba a Balcarce en una lista de
   localidades no es de Balcarce. Las localidades del partido que también son
   otros lugares o cosas (San Agustín, Los Pinos, Bosch, Juan Vincenty:
   `PALABRAS_LOCALES_DEBILES`) cuentan sólo con respaldo: en el título y con algo
   firme de acá o de la zona en el título o la bajada (`nombraLocalidadDudosa`,
   regla 179, desde el 15/10).
2. **`figura`**: el título o los primeros 400 caracteres nombran a una figura
   argentina (`FIGURAS`: Messi, Scaloni, la Selección, Colapinto, Canapino, Los
   Pumas…). Se guarda el nombre encontrado.
3. **`deLaZona`**: el título o los primeros 600 caracteres tocan la zona sin
   nombrar a Balcarce (`PALABRAS_ZONA`: ruta 226, ruta 55, papa semilla, cosecha
   de papa…), con la frase exacta ("ruta 2260" no es la 226). "Sudeste
   bonaerense" se sacó el 29/09: con eso había salido sola, el 28/09, una fiesta de Copetonas.

Qué hace cada marca: `docs/03-SELECCION.md`, pasos 3, 5 y 6.

### 8. Los repetidos del mismo medio

Una nota puede llegar por dos feeds del mismo medio (la portada y la sección, o el
RSS y el índice). Antes del cruce queda una sola: la clave es el medio más el
título sin tildes, signos ni espacios, **o el enlace** (sin `?utm_…`, «www.», «#»
ni barra final: `enlaceNormalizado`), así la misma nota con el título cambiado
entre un feed y otro tampoco entra dos veces (regla 175, 15/10).

### 9. La memoria del cruce

Para que una nota se junte con la que otro medio publicó hace horas (y que ya no
está en su feed), se guarda lo de afuera de las últimas **36 horas**
(`CRUCE.horasDeMemoria`, `ingesta/cruce.mjs`) y, desde el 17/10 (regla 195), lo de
los medios de Balcarce de las últimas **72** (`CRUCE.horasDeMemoriaDeAca`; la
variable `MEMORIA_DE_ACA=no` lo apaga): El Diario Balcarce publica lo mismo que Radio
Gabal uno o dos días después, cuando la de Gabal ya no está en el feed. Lo de acá que
sólo está en la memoria no vuelve a aparecer como historia: sirve para que se le
sume lo que llega después (y conserve la dirección ya publicada). Lo que dura más que
un hecho lo sigue partiendo el cruce coherente; para eso está la huella de
significado (`docs/flujo/REPETIDAS-2-0.md`).

- **Dónde vive:** `.cache/cruce-memoria.json` (`MEMORIA_DEL_CRUCE`). No va al
  repositorio: en GitHub la guarda la caché de Actions entre corridas.
- **Qué se guarda** (`paraLaMemoria`): título, los primeros 400 caracteres del
  resumen, enlace (y `enlaceFeed`), fecha, cuándo se vio, medio, fuente, alcance,
  si es oficial, sección fija, peso, imagen y categorías. **Sólo lo de afuera**: lo
  de Balcarce entra siempre.
- **Al leerla** (`leerMemoria`) se descarta lo de más de 36 horas (por la fecha de
  la nota) y lo que ya vino en esta corrida (mismo enlace, también normalizado). Lo que queda vuelve como nota (`deLaMemoria`, sin
  texto completo) y recibe otra vez sus marcas (paso 7).
- **Al guardarla** (`guardarMemoria`) se suma lo de afuera de esta corrida, sin
  repetir enlaces y sin lo vencido.

### 10. El cruce de medios: juntar las notas que cuentan el mismo hecho

`agruparPorHecho()` (`ingesta/cruce.mjs`) recibe todas las notas (las de esta
corrida y las de la memoria) y devuelve grupos. Sin IA: tarda segundos.

1. **Las palabras de cada nota** (`palabrasDe`): el título **dos veces** (pesa el
   doble) y los primeros 400 caracteres del resumen, sin tildes, en minúscula, de
   tres letras o más y sin las palabras vacías (`VACIAS`: de, la, que, hoy, nuevo…).
2. **TF-IDF**: cada palabra pesa más cuanto más rara es en el día (una que aparece
   en tres notas dice mucho; "gobierno", poco).
3. **Coseno**: la semejanza entre dos notas, de 0 a 1.
4. **Umbral 0,42** (`CRUCE.umbral`): con 0,42 o más, cuentan el mismo hecho. Se
   midió con 90 medios y 2.664 notas: con 0,25 encadenaba cosas sin relación
   (`docs/historico/CRUCE-DE-MEDIOS.md`).
5. **Para no comparar todas contra todas**, cada nota se compara sólo con las que
   comparten una palabra poco común. Una palabra que está en más del 5 % de las
   notas (`CRUCE.palabraComun`, nunca menos de 3) no sirve para buscar parecidas,
   aunque cuenta en el cálculo.
6. **Dos notas del mismo medio nunca se juntan entre sí**: un medio cuenta una vez.
7. **Los grupos se encadenan**: si A se parece a B y B a C, A, B y C quedan juntas.
8. **El cruce coherente revisa cada grupo** (regla 184, desde el 16/10; interruptor
   `CRUCE_COHERENTE`, prendido salvo que la variable de entorno diga "no"). Encadenar
   juntaba cosas distintas: el 16/10 una sola "historia" de fútbol tenía 228 notas
   (River, Boca, los puntajes, el Tribunal de Disciplina…) y el dólar de dos días
   era uno solo. Ahora `agruparConDetalle` mira cada grupo encadenado y **lo deja
   igual** si tiene hasta 25 notas (`CRUCE.coherente.maxNotas`), entra en 30 horas
   entre la primera y la última (`horasDeUnHecho`), ninguna nota queda lejos del
   resto (`restoMinimo`, 0,2) y no hay dos notas que no puedan ir juntas. Si no, lo
   **rearma** de a dos pedazos, el par más parecido primero, y junta sólo si el
   parecido **promedio** alcanza (`promedioMinimo`, 0,22; no basta un eslabón), si
   entra en 30 horas (48 una noticia en desarrollo contada casi igual:
   `horasEnDesarrollo` y `promedioEnDesarrollo`, 0,45) y si ningún par es de los
   que no van juntos, mirando sólo los títulos (`porQueSeparar`): un anuncio y su
   resultado, un hecho y el contrario (las reglas de
   `ingesta/repetidas-publicadas.mjs`), fechas, días o resultados distintos ("1 a
   1" y "2 a 0"), o tipos de hecho distintos (la previa, el resultado, los
   puntajes, la tabla, la sanción). **Partir sólo separa**: nunca junta lo que el
   cruce de siempre no juntaba. Con la lectura de las 12 del 16/10, la historia más
   grande pasó de 228 notas a 51. Medición: `docs/flujo/CRUCE-COHERENTE.md`.

### 11. Qué grupos quedan

| El grupo… | ¿Queda? |
|---|---|
| Tiene al menos una nota de un medio de Balcarce | Sí |
| Tiene una nota de afuera con `nombraBalcarce` o `deLaZona` | Sí |
| Lo cuentan **dos medios distintos o más** | Sí (cuántos pide su sección se decide después: `docs/03-SELECCION.md`, paso 6) |
| Lo cuenta **un solo medio** de afuera | **No se trae**, ni para esperar a una persona. Vale también para una fuente oficial de afuera sola (el Gobierno de la Provincia) |
| Lo cuentan **sólo medios de la región** (Mar del Plata, Tandil, Necochea…), sin Balcarce en el título ni la zona | **No se trae**: lo que es sólo de Necochea no le sirve a Balcarce |

El registro dice: "cruce: N notas (M de la memoria) · H historias · X de afuera
con un solo medio y Y de otra ciudad de la zona no entran" y, si el cruce coherente
partió algo, "cruce coherente (regla 184): R grupos encadenados revisados, P
partidos en hechos distintos". Un grupo hecho sólo de notas de la memoria sigue
siendo una historia más. Todo esto (pasos 10 a 12) lo hace `armarHistorias`
(`ingesta/ingesta.mjs`), que también usa `scripts/medir/cruce-coherente.mjs`
para medir con una lectura guardada.

### 12. La nota principal de cada historia

De cada grupo sale **una** nota principal, que da el identificador (y por lo tanto
la dirección en la web), el título de partida, la fecha y el enlace principal.

1. **¿La historia es de acá?** (`historiaDeAca`). Sí, si la cuenta un medio de
   Balcarce y, además, ningún medio de afuera la cuenta o algún medio nombra a
   Balcarce (`nombraBalcarce`, o un medio de acá que la nombra en el título o en
   los primeros 600 caracteres: `mencionaBalcarce`). **Un medio de Balcarce que
   cuenta lo mismo que los nacionales sin nombrar nada de acá está copiando una
   noticia de afuera**, y la historia se rige por lo de afuera.
2. **Entre quiénes se elige:** si es de acá, entre las notas de los medios de
   Balcarce; si no, entre las de afuera.
3. **Cuál:** la que ya está publicada (su identificador está en `idsConocidos`),
   así la dirección no cambia cuando otro medio se suma. Desde el 15/10 se busca
   entre **todas** las notas del grupo, no sólo entre las candidatas del punto 2
   (`laYaPublicada`, regla 175): la VTV salió como historia de afuera y, cuando se
   sumaron los medios de Balcarce y pasó a ser de acá, nacía otra nota con los
   mismos 28 medios. Entre dos publicadas manda la que no se unió a otra
   (`idsUnidos`). Si ninguna está publicada, **la que salió primero**.
4. **Lo que toma de las demás:** el título entero si el suyo venía cortado; la
   fecha, si no tenía; la imagen; el resumen largo, si no tenía texto completo; la
   marca `nombraBalcarce` y la figura.
5. **`nombraAca`** (regla 180, 16/10): si la historia es de acá y una nota de un
   medio de Balcarce nombra algo de acá (Balcarce, los balcarceños, una localidad
   del partido, la zona) en el título o en los primeros 600 caracteres, la historia
   lo lleva marcado. Con eso no se cae por cantidad de medios ni por el cupo de
   afuera aunque la IA diga que es "de la región" (`esDeUnMedioDeAca`,
   `docs/03-SELECCION.md`, pasos 6 y 7).

Después se guarda la memoria (paso 9).

### 13. Cómo queda armada cada historia

Antes de decidir nada se sacan los policiales de afuera (`docs/03-SELECCION.md`,
paso 1). Del resto, cada historia queda con estos campos:

| Campo | De dónde sale |
|---|---|
| `id` | Un código corto calculado del enlace de la principal (`idDe`, con `enlaceFeed` si lo hay). La misma nota da siempre el mismo |
| `titulo` | El de la principal. Si venía EN MAYÚSCULAS (75 % o más de las letras), pasa a mayúscula inicial conservando los nombres propios que aparecen bien escritos en el resumen y los de `NOMBRES_PROPIOS` (`sentenciar`) |
| `enlace`, `enlaceFeed` | Los de la principal |
| `fecha`, `cuando` | La de la principal; `cuando` dice "hace 3 h" o "sin fecha en la fuente" |
| `medio`, `medios` | El medio principal y la lista de medios distintos |
| `seccion`, `semaforo`, `motivo`, `relevancia`, `temas` | Ver `docs/03-SELECCION.md` |
| `imagen` | Sólo como dato: la imagen de la fuente no se publica. Las fotos, en `docs/05-FOTOS.md` |
| `resumenFuente` | El resumen de la principal limpio (`limpiarCopete`): sin la firma del medio al final, sin "leer más", sin repetir el título, cortado en 280 caracteres. Vacío si queda en menos de 40 |
| `fuentesTexto` | Los resúmenes limpios de las otras notas del grupo |
| `origenes` | **Cada fuente, en orden, la principal primero**: medio, enlace, fecha, si es oficial y su resumen. Es lo que la IA recibe numerado ("Fuente 1, Fuente 2…"), lo que el lector ve en "Fuentes (N)" y con lo que se calcula el nivel de verificación (`docs/04-REDACCION.md`) |
| `local` | `true` si la principal es de un medio de Balcarce o dice Balcarce en el título (`esDeBalcarce`) |
| `figura`, `deLaZona`, `nombraBalcarce`, `alcance` | Las marcas del paso 7 y el alcance de la principal |
| `nombraAca` | Sólo si la principal es de un medio de Balcarce y la historia nombra algo de acá (paso 12, punto 5; regla 180) |
| `oficial` | `true` si la principal **o cualquiera** de las otras es de una fuente oficial. Lo usan el semáforo, los medios que pide lo de afuera y el archivo (`tieneRespaldo`) |

Además de las noticias, `ingestar()` trae el **clima** (Open-Meteo y, si falla,
`api.met.no`) y las **farmacias de turno** (Colegio de Farmacéuticos, cruzado con
La Vanguardia y Radio Gabal): ver `docs/06-WEB.md`.

### 14. El texto completo de la nota original

Los feeds traen un resumen de unos 200 caracteres: con eso la IA no tiene de dónde
escribir un cuerpo y rellena. Por eso, **en el momento de escribir** (no en la
ingesta), se baja la página de la nota original (`ingesta/articulo.mjs`):

1. **De qué fuentes:** desde el 15/10 (regla 174, "la entrada ampliada")
   `textosDeLasFuentes()` (`reels/reescritura.mjs`) intenta bajar el texto de hasta
   6 fuentes (`REESCRITURA.fuentesQueSeBajan`, 8 si la cuentan 8 medios o más: la principal siempre, con su
   `enlaceFeed` si es Blogger, y las oficiales antes), y `armarFuentesParaLaIA()`
   (`ingesta/fuentes-para-la-ia.mjs`) elige los textos completos que
   entran en el presupuesto de 12.000 caracteres (`caracteresDeTextosEnTotal`; no hay un número fijo de textos),
   la oficial y un medio distinto cada vez primero, y manda TODAS las fuentes numeradas con titular y resumen; dos textos que comparten la mitad o más
   (`copiaEntreFuentes`) son copia y cuentan como una voz. Antes iba el texto de
   una sola fuente. Ver
   `docs/04-REDACCION.md`, paso 4.
2. **Bajar** (`traerTexto`): 8 segundos como máximo, User-Agent
   `RadarBalcarce/1.0 (+https://radarbalcarce.com)`. Si falla, la nota se escribe
   sólo con los resúmenes.
3. **Sacar la nota del HTML** (`extraerTexto`):
   - En una entrada de Atom (Blogger), el texto viene escapado adentro de
     `<content type="html">` (`parrafosDeAtom`).
   - En una página, primero se borran los bloques que nunca son la nota (`script`,
     `style`, `nav`, `header`, `footer`, `aside`, `form`, `svg`, `figure`…).
     Después se arman "tramos" de párrafos `<p>` seguidos (entre dos párrafos de la
     misma nota puede haber hasta 6.000 caracteres de HTML, `SALTO_MAXIMO`) y **se
     queda con el tramo con más texto** (La Nación, Ámbito y Olé tienen varios
     `<article>` y el primero no es la nota).
   - No cuentan los párrafos de menos de 50 caracteres, los de ruido (`RUIDO`:
     compartir, seguinos, suscribite, leé también, copyright…) ni **las
     necrológicas** (`NECROLOGICA`: casa de duelo, sala velatoria, servicios de
     sepelio). Un medio de acá pega debajo de cada nota su bloque de fallecidos, y
     la IA llegó a escribir sobre sepelios en una nota escolar.
4. **El largo:** hasta 4.000 caracteres por fuente (`REESCRITURA.caracteresDelTextoCompleto`,
   `ingesta/criterio.mjs`); con menos de 300 no hay texto completo.
5. **La limpieza** (regla 174): letras rotas arregladas si se puede (una página en
   latin1 se lee como tal, `decodificarPagina`; `repararCodificacion`) y, si no, el
   párrafo afuera; pies de nota y párrafos de otra nota de la página, afuera
   (`limpiarTextoBajado`, `ingesta/fuentes-para-la-ia.mjs`).

---

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué escribe |
|---|---|---|---|
| `ingesta/fuentes.mjs` | Las fuentes de siempre, las palabras de Balcarce y de la zona, el filtro de entrada, las figuras, `fichaDeFuente` (y las reglas de sección y semáforo, ver 03) | Todo el motor | — |
| `ingesta/fuentes-cruce.mjs` | Las fuentes del cruce, una por línea | `ingesta.mjs`, `lectura-ia.mjs`, `listar-fuentes.mjs` | — |
| `ingesta/listar-fuentes.mjs` | Escribe `FUENTES.md` desde el código | Una persona | `FUENTES.md` |
| `ingesta/ingesta.mjs` | `ingestar()`: baja, lee, filtra, marca, cruza; `armarHistorias()` elige la principal y arma cada historia (también clasifica y da el semáforo, ver 03) | `generar-datos.mjs` (nube), a mano | La memoria; a mano, `ingesta/salida/` |
| `ingesta/cruce.mjs` | Agrupa por hecho (TF-IDF, coseno, 0,42), el cruce coherente (`CRUCE_COHERENTE`, regla 184) y la memoria de 36 horas | `ingesta.mjs` | `.cache/cruce-memoria.json` |
| `ingesta/repetidas-publicadas.mjs` | `enlaceNormalizado` (el mismo enlace sin `?utm_…`) y las marcas de "un anuncio y su resultado" y "un hecho y el contrario" que usa el cruce coherente (lo demás, en 03) | `ingesta.mjs`, `cruce.mjs`, `generar-datos.mjs` | — |
| `ingesta/articulo.mjs` | Baja la página original y saca el texto de la nota; `decodificar` | `reels/reescritura.mjs`, `ingesta.mjs` | — |
| `ingesta/fuentes-para-la-ia.mjs` | La entrada ampliada (regla 174): qué textos completos van a la IA, en qué orden, cuáles son copia, y la limpieza del texto bajado | `reels/reescritura.mjs` | — |
| `ingesta/auditar-fuentes.mjs` | La auditoría de las fuentes: cuánto aporta cada medio según lo ya publicado (sin red): sin aporte, dormida, redundante, imprescindible | `node ingesta/auditar-fuentes.mjs` (a mano) | Nada (lo muestra en pantalla) |
| `ingesta/medir-fuentes.mjs` | Mide cada fuente con el archivo y, además, prueba cada feed en vivo (con `--sin-red`, sólo el archivo); sólo lee | A mano (rediseño, etapa 1) | `docs/etapa-1-fuentes/fuentes-medidas.csv` |
| `web/scripts/generar-datos.mjs` | Dispara la ingesta en la nube y anota la primera vista | `actualizar.yml` | `web/data/vistas.json` (y todo lo de 03 a 06) |
| `.github/workflows/actualizar.yml` | Corre todo cada media hora y guarda `.cache/` en la caché de Actions (la memoria del cruce y las notas para el panel del celular) | El reloj de Cloudflare (`radar-balcarce-reloj`) | Los commits "Datos de la portada" |

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Sumar, sacar o apagar una fuente | `FUENTES` o `FUENTES_NACIONALES` (`ingesta/fuentes.mjs`) o una línea de `ingesta/fuentes-cruce.mjs` (`activa: false` para apagar; el mismo `medio` para todos los feeds de un medio). Después, `node ingesta/listar-fuentes.mjs` |
| Cambiar el peso de una fuente | Campo `peso` de su ficha |
| Que un medio sin feed se lea bien | `patronEnlace`, `base` y `prefijoTitulo` de su ficha (`parsearScrape`) |
| Cuántas horas puede tener una nota raspada para entrar | `HORAS_DE_UNA_NOTA_NUEVA` (`ingesta/ingesta.mjs`) |
| Que una sección de un medio de afuera no se traiga | `SECCIONES_QUE_NO_ENTRAN` (`ingesta/fuentes.mjs`) |
| Qué cuenta como conexión argentina en el título | `CONEXION_ARGENTINA` (`ingesta/fuentes.mjs`) |
| Qué palabras hacen que una nota de afuera "diga Balcarce" | `PALABRAS_LOCALES` (`ingesta/fuentes.mjs`): sólo nombres que no aparezcan de casualidad |
| Qué es "la zona" | `PALABRAS_ZONA` (`ingesta/fuentes.mjs`) |
| Qué figuras cuentan | `FIGURAS` (`ingesta/fuentes.mjs`): con nombre y apellido si el apellido solo es ambiguo |
| Cuánto se parecen dos notas para ser el mismo hecho, o cuántas horas se recuerdan | `CRUCE` (`ingesta/cruce.mjs`: `umbral`, `horasDeMemoria`, `palabraComun`) |
| Qué palabras no cuentan en el cruce | `VACIAS` (`ingesta/cruce.mjs`) |
| Cuándo el cruce parte un grupo, o apagar el cruce coherente | `CRUCE.coherente` y `porQueSeparar` (`ingesta/cruce.mjs`); la variable `CRUCE_COHERENTE=no` vuelve al cruce de antes |
| Que dos medios del mismo dueño cuenten como uno | Campo `grupo` de sus fichas (`contarMedios`, `ingesta/ingesta.mjs`) |
| Qué localidades del partido cuentan sólo con respaldo | `PALABRAS_LOCALES_DEBILES` (`ingesta/fuentes.mjs`) |
| Un título de un índice que llega en palabras sueltas | `tituloDelSitemap` (`ingesta/ingesta.mjs`) |
| Un nombre propio que queda en minúscula al pasar un título de MAYÚSCULAS | `NOMBRES_PROPIOS` (`ingesta/fuentes.mjs`) |
| Qué partes de la página original no se leen como nota | `RUIDO` y `NECROLOGICA` (`ingesta/articulo.mjs`) |
| Cuánto texto completo recibe la IA | `REESCRITURA.caracteresDelTextoCompleto` (`ingesta/criterio.mjs`) **y** la tabla de `CRITERIO-EDITORIAL.md` § 11 |

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| Un medio cambia su feed o lo cierra | Aviso amarillo "Fuente caída" en la corrida | Buscar el feed nuevo o apagarla con `activa: false` |
| Un medio que se raspa rediseña su página | Aviso "Fuente vacía" (0 notas), sin ningún error | Ajustar su `patronEnlace` |
| Un feed sin fechas | La nota figura "sin fecha en la fuente"; en la web cuenta desde que se vio (`vistas.json`) | Nada. Ojo: en el puntaje, una entrada sin fecha recibe el premio de frescura en cada corrida (sólo las raspadas quedan `fechaEstimada`) |
| Una página raspada no contesta al abrirla | La nota entra sin fecha real y queda con la hora de la primera vista | Se corrige sola si la página contesta en otra corrida antes de publicarse |
| Se pierde la caché de Actions | El cruce arranca sin memoria: por unas horas, más notas "de un solo medio" no entran | Nada: se rearma sola |
| Dos hechos distintos se juntan (o uno igual no se junta) | Una historia con fuentes que no corresponden, o la misma noticia dos veces | El umbral es `CRUCE.umbral` y lo que parte grupos, `CRUCE.coherente`; la lectura con IA y las repetidas contra lo publicado juntan después lo que el cruce no vio (`docs/03-SELECCION.md`, paso 8) |
| Un medio aparece con dos nombres | Una nota de un solo medio cuenta como de dos | Unificar `medio`; `pruebas/cruce-coherente.test.mjs` lo controla |
| Se cae la plataforma que comparten varios medios de la región | Varios "Fuente caída" juntos (los del grupo `eleco.com.ar`, que comparten la plataforma `…apiv3.eleco.com.ar`; activos al 16/10, LU9, QZ Noticias, El Marplatense y El Eco de Tandil) | Nada: vuelven solos |
| La página original tiene la nota sin `<p>` | No hay texto completo: la IA escribe con los resúmenes (o no escribe, si son cortos) | Mirar `extraerTexto` con esa página (`pruebas/articulo.test.mjs`) |
| Una figura de la lista es ambigua | Entra como "figura" algo que no lo es ("etcheverry" solo tomó una inmobiliaria) | Usar nombre y apellido en `FIGURAS` |

Lo que falta, en `PENDIENTES.md`.

## Fuentes apagadas por bloqueo (30/09)

Varios sitios están detrás de Cloudflare y contestan 403 a los servidores de
GitHub (están en Estados Unidos), aunque desde una PC en Argentina andan. **Lo
que nos bloquea se apaga y se anota, no se usa** (Hernán, 30/09): en
`ingesta/fuentes.mjs` y `ingesta/fuentes-cruce.mjs` queda con `activa: false` y
una `nota` con la fecha y el motivo. Apagadas ese día: El Norte (San Nicolás),
Radio Sudestada (que no es de lo más relevante de Balcarce), El Argentino
Digital, los índices de La Voz del Pueblo y Ecos Diarios (sus feeds Atom siguen),
Sendero Regional y 2261 Lobería (hosting argentino que no deja entrar a GitHub),
el índice de El Diario de Tandil, Municipios vecinos (se reemplazó por General
Alvarado y San Cayetano), y las que nunca traían nada (La Nueva y Solo Ascenso
por sus índices sin título, A24 policiales, Motor1 en inglés y Autoblog, de autos
0 km). Para volver a probar una, se le saca `activa: false` y se mira si aparece
en la corrida de GitHub.

Lo que se arregló ese día: Olé automovilismo ya no se tira entero por "/autos/"
en la dirección; La Vanguardia también se lee en sus notas de deportes; SoloTC se
pide sin compresión (`sinCompresion`) y TNT Sports con otro nombre (`agente`); y
los feeds enormes (OpenAI trae más de mil notas) se cortan en las primeras
(`maxNotas`). Se sumaron Acción 5 (deportes de Balcarce) y unas treinta fuentes
por sección (fútbol, economía, agro, cultura, tecnología e IA con los blogs de
Google, DeepMind, OpenAI, Microsoft, Nvidia, NASA y ESA). Muchas de ésas (OpenAI,
SoloTC, TNT Sports, entre otras) quedaron apagadas el 15/10 por estar fuera de la
lista elegida (paso 2).
