# 05 · Las fotos: el banco de fotos y dónde se muestran

*Escrito el 28/09/2026 contra el código de ese día; puesto al día el 17/10/2026 con los controles de las reglas 203 a 206 (§ 14). Si el
código cambia, manda el código.*

Este documento cuenta cómo una nota ya publicada consigue una foto: de dónde
sale, cómo se elige, cómo se evita una marca de agua, qué se guarda, dónde se
muestra y dónde no. El criterio (qué foto se puede usar y por qué) está en
`CRITERIO-EDITORIAL.md` § 2, "Las fotos"; lo legal, en `INVESTIGACION.md` § 7.

## En una frase

En cada corrida de "Actualizar la web", a hasta 10 notas publicadas que todavía
no se probaron se les busca la foto principal de cada medio que las contó, una
IA con visión elige la mejor **sin marca de agua, sin chicos, que corresponda a la nota y que no sea un flyer, una captura ni una foto de
stock** (en los casos dudosos la mira además un segundo modelo; la misma foto no puede ilustrar dos notas de temas distintos). **La foto de
una nota con fuentes sale siempre de las fuentes de esa nota** (regla 319, 24/10/2026): si ninguna sirve, la nota sale con la placa (o con la
ilustración marcada como IA); nunca con una foto de Wikimedia Commons buscada por el nombre de una persona (§ 7).
Se guarda en el banco propio con su crédito y se muestra en la página de la
nota con el crédito debajo y en el espejo de Instagram (el crédito va en el
texto del posteo) y en la tarjeta para compartir el enlace; los videos siguen
con placa.
La placa es lo que sale cuando no hay foto que sirva.

### Por qué hay un banco de fotos

Una fotografía es una obra protegida y citar la fuente no alcanza para usarla
(`INVESTIGACION.md` § 7). Hasta el 27/09 el sitio usaba siempre una placa
propia. Ese día Hernán decidió, con el riesgo explicado y aceptado, que se
puede usar la foto de otro medio o de un organismo oficial con dos
condiciones: **nunca con la marca de agua ni el nombre del otro medio pegado
encima** (el crédito va en la cita, debajo) y **siempre guardada en el banco propio**
para poder revisarla y reusarla. Desde el 28/09 está construido y en vivo.

---

## El recorrido, paso a paso

### 1. Cuándo corre

Dentro de `web/scripts/generar-datos.mjs`, después de decidir qué notas se
publican (`docs/03-SELECCION.md`, paso 11) y antes de armar el archivo.
**Elegir fotos nuevas es sólo en la nube** (en GitHub Actions: gasta cupo de
IA). **Poner las que ya están en el banco** (`conFotosDelBanco`,
`web/scripts/fotos-notas.mjs`) corre siempre, aunque no se elijan nuevas (28/09:
antes una corrida sin elegir dejaba `portada.json` sin ninguna foto). Si elegir falla,
las notas salen con lo que ya tenía el banco ("fotos: no se pudieron elegir
nuevas (…); quedan las del banco").

### 2. A qué notas se les prueba

`elegirFotosNuevas()` (`web/scripts/fotos-notas.mjs`):

1. Sólo las notas **que se publican en esta corrida y vienen de las fuentes**
   (no las notas propias: el dólar y los repasos no llevan foto de otro).
2. Sólo las que **todavía no están en el banco** (`web/data/banco-fotos.json`).
   Una nota ya probada, tenga foto o no, **no se vuelve a preguntar**: cada
   corrida es cada media hora y se gastaría el cupo de la IA en lo mismo.
3. **Policiales, sólo si alguna de sus fuentes es oficial**
   (`elegiblePorSeccion`). Hoy las únicas fuentes marcadas `oficial` son la
   Municipalidad y el Gobierno de la Provincia; Bomberos o la Policía no son
   fuentes propias. Una nota de Policiales de un medio no se prueba nunca.
4. **Las más nuevas primero** (Hernán, 28/09: "no hace falta completar las
   notas anteriores, pero sí que todas las nuevas tengan fotos").
5. **Hasta 10 por corrida** (`TOPE_POR_CORRIDA`). No es por día: con una
   corrida cada media hora, el banco se completa solo en un par de horas sin
   gastar de una todo el cupo que también usa la lectura con IA (comparten la
   clave `GEMINI_API_KEY_CLASIFICACION`).

### 3. Las fotos candidatas

`candidatasDeNota()` (`ingesta/fotos.mjs`): por cada fuente de la nota (las
"Fuentes consultadas"; si no hay, el enlace principal) se abre **la página de
la nota original** y se toma la foto que el propio medio marca como principal
(`og:image` o, si no está, `twitter:image`: la que el medio eligió para que
WhatsApp y Facebook muestren su enlace). No se usa la imagen que traía el feed.

Cada foto se baja (`descargarImagen`): 20 segundos como máximo, sólo si la
respuesta es una imagen (o viene como "octet-stream" con bytes de imagen) y pesa menos de 6 MB (`TAMANO_MAXIMO`). Una fuente
cuya página o foto no se pudo bajar queda afuera de la comparación. **Desde el 17/10 se le manda a la IA achicada** a 1.024 px en JPEG
(`achicarParaIA`, `web/scripts/achicar-foto.mjs`; antes iba entera y Groq contestaba 413) y se guarda la original. A cada una se le
calcula la **huella** (`huellaDeFoto`): si es la misma foto que ya ilustra otra nota de otro tema, o una que una persona sacó, queda
afuera (`fotoRepetidaEnElBanco`, § 14).

### 4. La comparación con IA

Con las fotos que se pudieron bajar (aunque sea una sola), se hace **un pedido
a Gemini** (`gemini-flash-lite-latest`, temperatura 0) con todas las imágenes,
cada una con una letra (A, B, C…) y el medio que la publicó. La instrucción
(`instruccion()`, en `ingesta/fotos.mjs`) le pide:

- **elegir la que mejor ilustra la nota**: encuadre y nitidez, que se
  identifique el hecho, sin gente irreconocible de más ni nada de mal gusto;
  entre dos casi iguales, la de mejor calidad;
- **mirar cada foto entera buscando una marca de agua**: un logo, un nombre o
  una marca que **el medio agregó** después de sacarla (casi siempre en una
  esquina, a veces semitransparente), con **más atención en los medios locales
  y de la zona**, que son los que más lo hacen (Hernán, 28/09);
- **no confundirla con lo que ya estaba en la escena**: el cartel de un
  sponsor, el escudo de un club, el nombre de un evento o una pantalla no son
  marca de agua ("¿podría estar en una foto que sacó cualquier otra persona
  presente ese día?");
- **el nombre de otro medio que estaba en la escena tampoco es marca** (29/09).
  El 28 y el 29/09 sí lo era (la nota de Reino sobre el Fangio tenía el micrófono
  de "Radio Líder 90.9" y se decidió descartar esas fotos), pero muchas notas
  quedaban sin foto y esa noche se decidió: "lo del micrófono no hay problema que
  salga". Sí es marca lo que un medio **le pegó encima** a la imagen aunque no
  esté en una esquina: el zócalo o el logo de un canal (una captura de la tele),
  un recuadro o una placa con su nombre;
- **marcar a los menores** (28/09): si aparece alguien que parece menor de 18 y
  se lo reconoce, aunque esté en un grupo o un equipo, la foto lleva `menor` y
  no se elige; ante la duda, es menor;
- **contestar, por cada foto** (17/10, regla 203): si **corresponde** a la nota (`si`, `generica`, `no`), si es **de archivo**, si es una
  **gráfica** (flyer, afiche, placa con texto, captura de pantalla: el cartel «Activar Windows»), si es de **stock**, si hay gente muy
  **joven**, y una **descripción** de una línea;
- **nunca elegir una foto marcada**: si la mejor tiene marca, un menor, es una gráfica, es de stock o no corresponde, elegir
  la mejor entre las que no tienen nada de eso, aunque no sea la ideal;
  dejar la elección vacía sólo si ninguna está libre.

Devuelve la letra elegida, una frase con el porqué y, por cada foto, lo de arriba. El código no confía: una foto con `menor`,
`grafica`, `stock` o que no corresponde se trata igual que una con marca (`interpretarRespuesta`, `motivosDeDescarte`). Lo que dijo la
IA de la elegida queda en la ficha (`vision`).

**La segunda opinión** (17/10, regla 204, `conSegundaOpinion`): si la nota habla de chicos o de categorías juveniles (sub-N, U15, escuela,
alumnos, «Torneo Desarrollo», inferiores…) o la primera IA vio o describe gente joven (`esDudosa`), la elegida la mira **el otro**
modelo gratis (Groq si eligió Gemini, Gemini si eligió Groq). Si ve un menor, una marca, una gráfica o que no corresponde, esa foto no va y
se prueba la siguiente que había aprobado la primera (dos como mucho). Si el otro modelo no puede contestar, en un caso dudoso **no** se
publica: queda como falla («Segunda opinión no disponible…») y se reintenta.

### 5. La red de seguridad sobre la respuesta

`interpretarRespuesta()` no confía a ciegas en la letra que eligió la IA:

- si la IA eligió una foto **que ella misma marcó con marca de agua**, se usa
  la primera candidata sin marca en su lugar; si no hay ninguna, no se elige
  nada;
- si la letra no corresponde a ninguna foto que se haya podido bajar, no se
  elige nada.

### 6. Si Gemini falla: Groq

Si Gemini falla o se queda sin cupo, el mismo pedido va a **Groq**
(`GROQ_API_KEY`) con un modelo con visión, `qwen/qwen3.8-27b`
(`MODELO_GROQ_VISION`; Llama 4 Scout dejó de estar el 28/09). Groq acepta **como
mucho 3 imágenes por pedido**, así que se comparan las tres primeras; si igual contesta 413, se prueba una vez con la primera sola. Si
las dos fallan, la nota queda sin foto y se reintenta; **el error de Gemini queda guardado** (en la razón y en `errorGemini`: antes se
perdía y no se sabía si era cupo). Nunca se usa la clave paga de redes.

### 7. Si ninguna foto sirve: la placa (Wikimedia Commons, retirada el 24/10/2026, regla 319)

**Regla 319 (24/10/2026, Hernán: cero errores): la foto de una nota con fuentes sale SIEMPRE de las fuentes de esa nota** (la imagen del propio
artículo de un medio, con su crédito), mientras no tenga marca de agua ni sea autopublicidad de otro medio y pase los controles de siempre.
**Wikimedia Commons no ilustra ninguna nota que tenga fuentes: ni de personas, ni de lugares, ni de objetos.** Si ninguna foto de las fuentes
sirve, la nota sale con la placa o, si ya existe ese camino y está permitido, con la ilustración marcada como IA (§ 12).

Por qué: el 24/10 la nota 1vxdqss, «Fito Páez cuestiona al gobierno de Javier Milei…», salió con una foto de Commons buscada por el nombre. Un nombre
en el título de un archivo de Commons **no garantiza que la persona de la imagen sea la de la noticia** (la IA que la miraba dijo «corresponde» y no
era), y publicar la cara equivocada junto a una nota política es grave. Antes (28/09, idea de la regla 205) se le preguntaba a Gemini si la nota era de
una sola persona pública, se buscaba su nombre en Commons y se tomaba una foto libre de no más de dos años que mirara la IA; ese camino se sacó de
`elegirFotoParaNota` y del de las ilustraciones (`FIGURAS_PUBLICAS`, `buscarLibre`), y `personaPublicaDeNota` y `buscarFotoWikimedia` quedaron
sin uso en producción.

Cómo se cuida (todo en la prueba `pruebas/fotos-sin-commons.test.mjs`):

- `elegirFotoParaNota` (`ingesta/fotos.mjs`) ya no pregunta por la persona ni consulta a Commons.
- `ilustrar-notas.mjs` ya no busca foto real de figuras públicas: la nota de Milei o Kicillof va con la ilustración sin personas.
- `conFotosDelBanco` (`web/scripts/fotos-notas.mjs`) no le pone a una nota con fuentes una foto de origen `wikimedia` (ni `libre`) aunque siga en el
  banco (`esFotoDeCommonsEnNotaConFuentes`). La foto que sumó una persona a mano (`origen: manual`) no entra en esto.
- La revisión del archivo (`revisionDeLaFoto`, `web/scripts/revisar-archivo.mjs`) **saca** esa foto de cualquier nota con fuentes, también si la nota
  la publicó una persona y también si el año y la ficha de visión eran buenos.
- **Lo único que sigue usando Commons** son las notas propias de F1 y fútbol, por el **lugar** (el circuito o el estadio), que no identifica a nadie
  (`web/scripts/foto-libre.mjs`, § "Fotos libres para las notas propias"). Además `buscarFotoLibre` sólo busca consultas de un lugar
  (`consultaEsDeUnLugar`: circuito, autódromo, estadio, arena...): una consulta con el nombre de una persona no sale a la red, y los archivos con
  `portrait`, `retrato` o `headshot` en el nombre no se eligen. Quedó **abierta** la pregunta de si las notas automáticas de F1 y fútbol tienen que
  seguir así (`docs/DECISIONES.md`, 24/10).

Fotos de Commons que estaban publicadas y se sacaron del banco (`descartada`, con motivo, el 24/10/2026; sus archivos se borraron con `git rm`):
1vxdqss (Fito Páez, ya sacada a mano), 1tckq4a (Fito Páez), 9hkq7t y zd48ar (Colapinto, la misma foto), 18tlzl2 (Colapinto) y 1223qry (Kicillof).
Si Hernán quiere devolver una, tiene que decirlo con la nota y la foto (la restituye una persona, con la foto de las fuentes o una propia; no el robot).

De Commons se guarda también **el autor** (`extmetadata.Artist`, pasado a
texto por `textoPlano`), y el crédito dice autor y licencia, como piden CC BY y
CC BY-SA: "Foto: *autor* / Wikimedia Commons (CC BY-SA 4.0)" (`creditoDeFoto`,
`ingesta/fotos.mjs`, 28/09). La foto de un medio dice "Foto: *medio*".

El 28/09 había 3 fotos de Wikimedia en el banco (Mariano Werner y dos de
Colapinto), las tres CC BY-SA 4.0, guardadas **antes** de ese arreglo: su
crédito sigue diciendo sólo "Foto: Wikimedia Commons" (`PENDIENTES.md`).

### 8. Qué se guarda en el banco

Si hay foto elegida, se vuelve a bajar **sólo esa** y se guarda tal cual,
como archivo propio del sitio: `web/public/fotos-notas/<id de la nota>.<jpg,
png o webp>`. Cloudflare Pages la sirve como cualquier archivo del sitio. El
workflow la sube al repositorio junto con el resto de los datos.

**Se guarda achicada (29/09).** Antes la foto se guardaba tal cual la bajaba el medio (hasta
3.778 × 2.126 y 1,8 MB) y el repositorio crecía unos 25 MB por día. Ahora `fotoParaGuardar`
(`web/scripts/achicar-foto.mjs`, con el ffmpeg del proyecto) la pasa a **JPEG de hasta 1.200 px de ancho**;
si no se puede achicar o queda más pesada, se guarda la original. Las 48 fotos pesadas que ya
estaban en el banco se achicaron una vez (`web/scripts/achicar-fotos-existentes.mjs`): de 32,7 a
6,0 MB. Las fotos se sirven con caché de una semana (`web/public/_headers`).

**Las fotos que se quedan sin nota se borran** (28/09, `podarFotos`): en cada
corrida de la nube, la de una nota retirada a mano (`retiradas.json`: puede
haberse retirado por un menor o una víctima), en el momento y con `retirada: true`; y la de una nota que ya no está en
el archivo, la portada ni la ingesta, **recién si sigue faltando una semana** (17/10, regla 203: la primera vez queda `ausenteDesde`;
seis notas vivas habían perdido su foto porque en una vuelta no figuraban). La entrada del banco queda sin `archivo`
y con `borrada: true`; si la nota vuelve a publicarse (y no fue retirada a mano), se prueba de nuevo. Ojo: el
repositorio es público y el historial de git guarda la foto borrada; si una
foto no tenía que estar nunca, hay que pedir que la limpien del historial.

En `web/data/banco-fotos.json`, una entrada por nota:

| Campo | Qué es |
|---|---|
| `archivo` | La ruta de la foto guardada (`fotos-notas/1is0p0y.jpg`) |
| `medio` | De quién es la foto (el medio, o "Wikimedia Commons") |
| `credito` | Lo que se muestra debajo: "Foto: *medio*" |
| `licencia` | La de Wikimedia; `null` para las de un medio |
| `autor` | Sólo en las de Wikimedia guardadas desde el 28/09 |
| `origen` | `medio`, `wikimedia`, `ninguna` o `error` |
| `titulo` | El título de **nuestra** nota |
| `enlace` | La nota del medio de donde salió (o la página de Wikimedia) |
| `imagenOriginal` | La dirección original de la imagen |
| `razon` | Por qué se eligió (lo que dijo la IA, o por qué se usó otra sin marca) |
| `cuando` | Cuándo se probó |
| `vision` | (17/10) Lo que vio la IA: `proveedor`, `marca`, `menor`, `jovenes`, `corresponde`, `deArchivo`, `grafica`, `stock`, `descripcion`; con la segunda opinión, `segunda` y `dudosa`; en Wikimedia, `anio` |
| `huella` | (17/10) La huella de la foto, 16 letras (`huellaDeFoto`): para que no ilustre otra nota de otro tema |
| `errorGemini` | (17/10) El error de Gemini, aunque después haya contestado Groq |
| `descartada` | (17/10) Una persona (o la auditoría) la sacó: `motivo`, `cuando`, `por`, la `huella` y la `imagenOriginal`. No se vuelve a probar y esa foto no vuelve en ninguna nota |
| `ausenteDesde`, `retirada`, `restaurada` | (17/10) La poda: desde cuándo falta la nota; que se retiró a mano; que el script del 17/10 la volvió a bajar |

Las notas probadas **sin** foto quedan con `intentado: true`, el origen, el
título, la razón y la fecha (o el error). Ejemplo real:

```json
"1is0p0y": {"archivo":"fotos-notas/1is0p0y.jpg","medio":"QZ Noticias (Mar del Plata)","credito":"Foto: QZ Noticias (Mar del Plata)",
            "licencia":null,"origen":"medio","titulo":"Diego Santilli visita el autódromo en la vuelta de las categorías nacionales",
            "enlace":"https://www.qznoticias.com/la-region/diego-santilli-visito-el-fangio-…","cuando":"2026-09-28T03:52:09Z"}
```

El 28/09 a la tarde el banco tenía 141 notas probadas: 99 con foto (96 de un
medio, 3 de Wikimedia), 38 sin ninguna que sirviera y 4 con error.

### 9. Dónde se muestra: la página de la nota

`fotoDeLaWeb()` le pasa a la nota sólo `{ archivo, credito }` (campo `foto`).
Viaja en `web/data/portada.json` y `web/data/archivo.json`, así la foto sigue
en la página aunque la nota salga de la portada. **Desde el 17/10 (regla 203) la del archivo se pone al día con el banco en cada vuelta**
(`fotoDelArchivoAlDia`): toma la dirección y el crédito que dice el banco, y si el banco ya no la tiene o el archivo no está, la nota queda
sin foto (su ilustración o la placa). Nueve notas del archivo mostraban una imagen rota.

En `web/app/nota/[id]/page.js`, **entre la bajada y el cuerpo**: la imagen a lo
ancho de la columna (hasta 480 píxeles de alto, recortada por la página para
llenar ese espacio) y, debajo, el crédito en cursiva gris ("Foto: Radio Gabal
(FM 104.1)"). **El crédito aparece una sola vez, en el epígrafe, nunca adentro
de la imagen.** Sin foto, desde el 29/09 va **la placa de la sección**, más
baja que una foto y con el dibujo de su sección (`PlacaSeccion` con `chica` y
`Pictograma`, `web/components/piezas.js`; Hernán: "si no tiene fotos hay que
ponerle la placa de la sección"). Hasta ese día no iba nada. Las notas propias
(el dólar, los repasos) no la llevan. **Nunca una imagen hecha con IA en una
nota de un hecho**: el criterio no la permite y una ilustración inventada de un
hecho real confunde. **La excepción son dos notas genéricas propias, y sólo
ellas** (regla 181): la del clima y la de «Un día como hoy». Llevan una
ilustración hecha con IA (un paisaje de la pampa, o la hoja de almanaque), sin
personas, texto, marcas ni lugares reconocibles, y **siempre con la leyenda
«Ilustración generada con IA»** en el epígrafe. La del clima sale de un grupo de
imágenes fijas (`web/public/fotos-notas/clima-<estado>-<n>.jpg`, generadas una
vez con Workers AI de Cloudflare): `web/lib/fondos-clima.js` elige el estado del
tiempo del día y, entre las dos o tres de ese estado, la que toca por la fecha;
no cuesta nada ni llama a ninguna red al armar el sitio. Para sumar imágenes,
correr a mano "Generar fondos del clima", mirar las candidatas y guardar las
buenas achicadas (1.200 px, JPEG).

**Desde el 16/10 (regla 182), una nota sin foto también puede llevar una
ilustración** (ver § 12 más abajo): un bodegón de objetos sin gente, con la misma
leyenda «Ilustración generada con IA» en el epígrafe. **Desde el 17/10 (regla
185) casi toda nota sin foto la lleva**, también escuelas, chicos, Policiales y
Política (con tono sobrio): como la imagen nunca tiene personas, no identifica a
nadie. Se saltan sólo las muertes, los velorios y los sepelios, el semáforo rojo
y las notas propias que traen su imagen. Se hace sola cada 2 horas (Cloudflare,
con un control con visión que descarta lo que no sirve); desde el 17/10 es el único camino (regla 206). Si después aparece una foto real,
gana la foto.

La nota destacada de una sección o de un tema lleva su foto, con el crédito
debajo, o la placa (`ImagenDestacada`); hasta el 29/09 llevaba siempre la placa.

La prueba `pruebas/fotos-notas.test.mjs` cuida que la foto sea condicional,
que salga del banco y no de la fuente, y que el crédito esté una sola vez.

### 10. Dónde NO se muestra

- **Instagram:** la imagen de cada posteo (`web/app/nota/[id]/instagram.png`)
  lleva la foto del banco desde el 28/09 (`FOTO_EN_INSTAGRAM = true`,
  `web/lib/tarjeta-diseno.js`). Sin foto que sirva, sale la placa sin foto. Lo
  leen la imagen y el texto del posteo (`redes/publicar.mjs`), así nunca va un
  crédito sin foto ni una foto sin crédito: el posteo suma "Foto: *medio*" al
  final (`conCreditoDeFoto`, `redes/elegir.mjs`). Para volver a la placa en
  todos: `false`.
- **Facebook y la tarjeta para compartir enlaces** (WhatsApp, Facebook:
  `opengraph-image.js`): la foto del banco a la izquierda y el título a la
  derecha desde el 28/09 (`FOTO_EN_ENLACE` en `web/lib/tarjeta-diseno.js`), sin
  el crédito adentro: está en el epígrafe de la página. Sin foto, la banda de
  color con los anillos.
- **Podcasts, historias y reels:** placas de datos (`reels/placa.mjs`): no cuentan una sola nota, así que no llevan foto.
- **La imagen que trae la ingesta de cada fuente** (`imagen`) no se publica en
  ningún lado: sólo suma 6 puntos de relevancia como señal de que la nota está
  trabajada.

Ver `docs/07-REDES.md`.

### 11. Lo que nunca lleva foto real

- **Lo que identificaría a un menor o a una víctima**: lo frena el semáforo
  rojo antes de publicarse, así que nunca llega a esta etapa (pero ver "Qué
  puede fallar").
- **Una foto con un chico reconocible** (la IA lo marca con `menor`): nunca, salvo
  la única excepción de las reglas 186 y 211 (§ 13): la foto propia de una fuente de
  Balcarce (un medio de acá o un organismo) en una actividad deportiva, escolar, cultural
  o recreativa, con todo en regla y el interruptor `FOTOS_MENORES_OFICIALES` prendido.
- **Policiales**, salvo que la fuente sea oficial (paso 2).
- **Una foto inventada por IA que parezca real**: el sistema no genera fotos de
  hechos. Las imágenes de IA son las ilustraciones genéricas, etiquetadas, del
  clima y de «Un día como hoy» (regla 181) y los bodegones sin gente que una
  persona suma a mano a una nota sin foto (regla 182, § 12): objetos de la
  actividad, nunca la escena del hecho, nunca personas, y siempre con la
  leyenda «Ilustración generada con IA».

---

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `web/scripts/fotos-notas.mjs` | A qué notas se les prueba foto (`elegirFotosNuevas`, `elegiblePorSeccion`, `TOPE_POR_CORRIDA`; sólo en la nube) y qué se guarda; `fotoDeLaWeb` y `conFotosDelBanco` (las ya guardadas, en cada corrida) | `generar-datos.mjs` | El banco anterior | Devuelve el banco nuevo y los archivos |
| `ingesta/fotos.mjs` | Candidatas (`og:image`), descarga, comparación con Gemini o Groq, red de seguridad contra la marca y las reglas de Commons (`elegirFotoParaNota`; sin Wikimedia desde la regla 319) | `fotos-notas.mjs` | Las páginas de los medios, las APIs de Gemini, Groq y Wikimedia | — |
| `web/scripts/generar-datos.mjs` | Dispara todo y escribe los archivos | `actualizar.yml` | `banco-fotos.json` | `web/data/banco-fotos.json`, `web/public/fotos-notas/`, el campo `foto` de cada nota |
| `web/data/banco-fotos.json` | El banco: qué nota se probó y con qué resultado | — | — | — |
| `web/public/fotos-notas/` | Las fotos elegidas | — | — | — |
| `web/app/nota/[id]/page.js` | Muestra la foto y el crédito | La web al compilar | `portada.json`, `archivo.json` | — |
| `web/lib/tarjeta-diseno.js` | `FOTO_EN_INSTAGRAM` (prendido desde el 28/09) y `fotoDeLaNota` | Tarjeta de Instagram, `redes/publicar.mjs` | — | — |
| `redes/elegir.mjs` | `conCreditoDeFoto`: el crédito en el texto del posteo, si la imagen lleva foto | `redes/publicar.mjs` | — | — |
| `reels/claves.mjs` | `claveClasificacion` y `claveGroq` | `ingesta/fotos.mjs` | `.env`, variables | — |
| `web/scripts/ilustrar-notas.mjs` | Las ilustraciones con IA para notas sin foto (reglas 182 y 185): filtros (`motivoParaSaltar`), tono (`tonoDeLaNota`), prompt con Gemini, imagen con el Worker de Cloudflare, control con visión, topes (`cupoAutomatico`); `revisar`, `aplicar` y `automatico` | `ilustrar-notas.yml` (el reloj de Cloudflare cada 2 h, o a mano) | `portada.json`, `archivo.json`, el banco, las manuales, `fotos-ia.json` | En la revisión, sólo el adjunto; al aplicar (a mano o en automático), `web/data/fotos-ia.json` y `web/public/fotos-notas/<id>-ia.jpg` |
| `web/data/fotos-ia.json` | Las ilustraciones aplicadas (lo escribe sólo «Ilustrar notas sin foto») | — | — | — |
| `web/scripts/achicar-foto.mjs` | Achicar para guardar (1.200 px) y para la IA (1.024 px, `achicarParaIA`); la huella (`huellaDeFoto`, `mismaFoto`) | `fotos-notas.mjs`, `ilustrar-notas.mjs` | — | — |
| `web/scripts/nombres-de-persona.mjs` | `nombresDePersona`: el control del prompt de las ilustraciones (antes en `ingesta/foto-ia.mjs`, que se borró) | `ilustrar-notas.mjs` | — | — |
| `ingesta/fotos-menores.mjs` | La excepción de las reglas 186 y 211 (§ 13): `menorEnActividadOficial`, `esFuenteDeBalcarceParaMenores` (antes `esFuenteOficialParaMenores`, que sigue como alias), `nombraAUnMenor`, las listas `ACTIVIDADES` y `PROHIBIDAS`, el interruptor | `ingesta/fotos.mjs`, `web/scripts/fotos-notas.mjs` | La nota, `FUENTES_DE_BALCARCE_PARA_FOTOS_DE_MENORES` (`ingesta/fuentes.mjs`), `FOTOS_MENORES_OFICIALES` | — |

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Probar más o menos notas por corrida | `TOPE_POR_CORRIDA` (`web/scripts/fotos-notas.mjs`) |
| Que otra sección no lleve foto, o que Policiales lleve | `elegiblePorSeccion` (`web/scripts/fotos-notas.mjs`) |
| Cambiar qué mira la IA (marca de agua, calidad, qué es de la escena) | `instruccion()` en `ingesta/fotos.mjs` |
| Cambiar el modelo | `MODELO_GEMINI` y `MODELO_GROQ_VISION` (`ingesta/fotos.mjs`) |
| Qué licencias de Wikimedia se aceptan | `WIKIMEDIA_LICENCIAS_LIBRES` (`ingesta/fotos.mjs`) |
| Que una nota vuelva a probarse | Borrar su entrada de `web/data/banco-fotos.json` |
| Sacar una foto que no debía salir | En la entrada del banco, sacar `archivo` y `credito` y poner `"intentado": true` y `"descartada": { "motivo": "…", "cuando": "…", "por": "…", "imagenOriginal": "…" }` (como quedaron las que sacó el arreglo del 17/10, § 14), y borrar el archivo de `web/public/fotos-notas/`: no vuelve en esa nota ni en otra |
| Cuántos años puede tener una foto de Wikimedia | `ANTIGUEDAD_MAXIMA_WIKIMEDIA` (`ingesta/fotos.mjs`) |
| Cuándo una foto es "la misma" | `DISTANCIA_DE_LA_MISMA_FOTO` (`web/scripts/achicar-foto.mjs`); cuándo dos notas son "del mismo tema", `mismoTema` (`web/scripts/fotos-notas.mjs`) |
| Qué casos pide la segunda opinión | `esDudosa` y `PALABRAS_JUVENILES` (`ingesta/fotos.mjs`) |
| Cuánto espera la poda | `HORAS_DE_GRACIA_DE_LA_PODA` (`web/scripts/fotos-notas.mjs`) |
| Que el espejo de Instagram lleve (o no) la foto del banco | `FOTO_EN_INSTAGRAM` (`web/lib/tarjeta-diseno.js`; hoy `true`) |
| Cómo se ve en la página | El bloque `{n.foto && …}` de `web/app/nota/[id]/page.js` |
| Ilustrar con IA las notas sin foto | Workflow «Ilustrar notas sin foto» (§ 12; automático cada 2 h); qué se salta, `motivoParaSaltar` (`web/scripts/ilustrar-notas.mjs`) y `tocaUnaMuerte` (`web/scripts/fotos-notas.mjs`); el tono, `tonoDeLaNota` y `TONOS`; los topes, `TOPE_POR_CORRIDA`, `TOPE_POR_DIA` y `cupoAutomatico`; las horas, `HORAS_AUTOMATICAS` y `HORAS_ILUSTRAR_UTC` (`infra/reloj-cloudflare/worker.mjs`); con Gemini web, `docs/flujos/IMAGENES-CON-GEMINI-WEB.md` |
| Qué fuentes entran en la excepción de las fotos con chicos (reglas 186 y 211) | `FUENTES_DE_BALCARCE_PARA_FOTOS_DE_MENORES` (`ingesta/fuentes.mjs`): sale sola de las fuentes con `alcance: 'local'`; una fuente de Balcarce nueva entra sola (la prueba lista las de hoy). La página de un medio cuyas notas no están en el dominio de su feed va en `PAGINAS_DE_LAS_FUENTES_DE_BALCARCE` |
| Qué actividades la permiten y qué temas la frenan | `ACTIVIDADES` y `PROHIBIDAS` (`ingesta/fotos-menores.mjs`) |
| Prender o apagar la excepción | La variable de GitHub `FOTOS_MENORES_OFICIALES` ("Si" la prende; apagarla también saca de la web las fotos que entraron por ella) |
| Sacar una ilustración que no debía salir | Borrar su entrada de `web/data/fotos-ia.json` (y el archivo `<id>-ia.jpg`): la próxima corrida de «Actualizar la web» ya no la pone |

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| **La foto no se recorta de verdad** | El archivo se guarda entero, tal como lo publicó el medio. Lo único que "recorta" es la página, que la ajusta a 480 píxeles de alto: si hubiera un logo en una esquina, puede quedar a la vista, y el archivo en `fotos-notas/` lo conserva | La única defensa contra la marca de agua es que la IA la vea. Revisar el banco a ojo cada tanto, empezando por los medios locales y de la zona |
| La IA no ve una marca de agua | Una foto con el logo de otro medio en la página de una nota | Sacarla del banco (tabla de arriba) y anotar el caso |
| El crédito de una foto de Wikimedia guardada antes del 28/09 | La página dice sólo "Foto: Wikimedia Commons" (lo nuevo ya lleva autor y licencia) | Completar a mano `credito` y `autor` de esas tres entradas del banco (`PENDIENTES.md`) |
| **Una nota amarilla aprobada por una persona puede llevar la foto de un chico** | La exclusión de menores y víctimas depende del semáforo rojo; las notas amarillas por "niño", "adolescente" o "alumno de" que una persona publica desde el panel sí se prueban (sólo Policiales está excluida) | Mirar la foto al aprobar una nota así, o sumar la regla a `elegiblePorSeccion` |
| La elegida no se pudo guardar | Entrada con `"error":"no se pudo guardar la elegida (formato …)"` y su `imagenOriginal`; desde el 17/10 se guarda cualquier formato que ffmpeg pase a JPEG, y la nota se reintenta | Mirar el formato en la entrada |
| La segunda opinión no estuvo | Razón «Segunda opinión no disponible…»: la nota es dudosa y el otro modelo no contestó | Se reintenta sola; si Groq no tiene cupo por días, esas notas quedan con su ilustración |
| Una foto buena salió como «repetida» | Razón «…ya se usó o se sacó…»: comparte huella o dirección con otra nota que `mismoTema` cree de otro tema (dos títulos de la misma noticia con pocas palabras en común) | Es el lado seguro: la nota queda con su ilustración. Si importa, sumar la foto a mano desde el panel |
| Una nota sin foto que después cuentan más medios | Se probó con los medios de ese momento y quedó `intentado`: no se vuelve a probar aunque aparezca una foto mejor | Borrar la entrada si importa |
| Gemini y Groq sin cupo | "fotos: N notas nuevas probadas (0 con foto)"; entradas con la razón "Gemini falló…" o "Groq también falló…" | Desde el 29/09 se reintentan solas, hasta tres veces con una hora entre una y otra (`sePuedeReintentar`); si igual quedan, borrar esas entradas cuando vuelva el cupo |
| La IA de fotos le gana cupo a la lectura con IA | Comparten `GEMINI_API_KEY_CLASIFICACION`: diez pedidos con imágenes por corrida se suman a los de las fichas | Si falta cupo, bajar `TOPE_POR_CORRIDA` |

## Lo que sigue abierto

`CRITERIO-EDITORIAL.md` § 2 ("Las fotos") pide cosas que el código no hace:
una foto propia, oficial, de stock o una ilustración "por defecto" (sin foto
elegida va la placa de la sección desde el 29/09), "recortar" la foto de otro medio (se guarda
entera y la página sólo la encuadra) y revisarla a ojo antes de guardarla (lo
hace sólo la IA). Hay que alinear el criterio o el código: está en
`PENDIENTES.md`, con lo de las fotos de chicos en notas amarillas aprobadas y
los tres créditos viejos de Wikimedia.

---

## Auditar las fotos (1/10/2026)

    npm run auditar-fotos            las notas de los últimos 3 días
    npm run auditar-fotos -- --dias=7
    npm run auditar-fotos -- --html      además arma reels/salida/fotos-sin-foto.html

Con `--html` arma una página (`reels/salida/fotos-sin-foto.html`, sólo en la PC, no se sube) con cada nota sin foto, lo que dijo la IA y las fotos que tenían sus fuentes, para ver con los ojos si la decisión fue buena. Puede mostrar menores: es para revisar, no para compartir.

Lee `web/data/banco-fotos.json`, `portada.json` y `archivo.json` (`ingesta/auditar-fotos.mjs`, no gasta cupo de IA
y no toca nada) y muestra: el porcentaje de notas con foto, por sección, y por qué no la tiene cada una de
las demás. Se mide **por nota**, no por entrada del banco: una entrada "borrada" es una foto podada de una
nota vieja, no una falla. Los motivos que son **reglas firmes** (menor reconocible, marca de agua, nota
propia, Policiales sin fuente oficial) no se tocan; los demás (falla de la IA, la foto no se pudo bajar, la
fuente no trae imagen, no ilustra) son los que se pueden mejorar. El primer resultado (1/10): 86 % de las
notas con foto en tres días; la causa principal de las que no, los menores reconocibles (12 de 25).


### Groq (sondeo del 1/10)

La clave gratis de Groq (se sondeó a mano el 1/10 con un script de prueba que se borró el 15/10/2026; el historial de git lo guarda) ve cuatro modelos de texto: `openai/gpt-oss-120b`, `openai/gpt-oss-20b` y `qwen/qwen3.8-27b` (1.000 pedidos por día y 8.000 tokens por minuto cada uno) y `allam-2-7b` (7.000 por día, 6.000 por minuto; está pensado para árabe). **El único que acepta imágenes es `qwen/qwen3.8-27b`**: los gpt-oss rechazan las imágenes. Por eso no hay un segundo modelo de visión de respaldo en Groq, y con 8.000 tokens por minuto una comparación con varias fotos puede dar 413 o 429.

### El repaso y las fuentes nuevas (1/10/2026)

- **Reintentos**: una nota que quedó sin foto por una falla (sin cupo de la IA, sin fotos para comparar, no se pudo bajar) se prueba de nuevo a la hora, hasta tres veces; pasadas las tres, un repaso cada 6 horas, dos veces más (`REINTENTOS_DE_FOTO`). Lo que la IA descartó a propósito (menores, marcas) no se vuelve a preguntar... salvo que la nota gane fuentes: el banco guarda cuántas tenía (`fuentes`) y, si ahora tiene más, se mira otra vez.
- **Notas que se juntan**: dos notas que cuentan el mismo hecho con otras palabras se fusionan (regla 94) y las fuentes de las dos se suman antes de buscar la foto, así se compara la foto de todos los medios.
- **No se vuelve a bajar la elegida**: se guarda la imagen que ya se bajó para compararla (antes, "no se pudo volver a bajar la elegida" dejó sin foto a una nota con nueve fuentes).
- **Menores**: la IA decide sólo por lo que se ve en la imagen, no por el tema de la nota (una nota "sobre secundarios" no quiere decir que la foto tenga chicos); un adulto a simple vista y quien tiene la cara tapada no cuentan. Sigue valiendo "ante la duda, es menor" para quien se ve chico o no se puede decidir.

### La tapa con fotos y el collage de los repasos (1/10/2026)

- **La tapa** (las cinco postales de la portada, `armarTapa` en `web/lib/datos.js`) prefiere las notas que tienen foto: la principal sale de las que la tienen y las cuatro más nuevas de otras secciones, también. Las que no tienen sólo completan si faltan (con la placa de su sección).
- **Los repasos** (las notas de cada podcast, `web/lib/notas-propias.js`) llevan un **collage** con las fotos de las notas que cuentan: de dos a cuatro fotos del banco con un borde blanco entre una y otra (`web/scripts/collage.mjs`, con el ffmpeg del proyecto). Con una sola foto se usa tal cual; sin ninguna, queda sin foto. El crédito dice los medios ("Fotos: A, B y C"). Se guarda en `web/public/fotos-notas/collage-<id>.jpg` y la poda lo conserva mientras exista la nota del repaso.

## Fotos libres para las notas propias (3/10/2026)

Las notas armadas con datos (la F1; después el fútbol) no tienen la foto de ninguna fuente. `web/scripts/foto-libre.mjs` les busca en **Wikimedia Commons**
una foto del lugar (el circuito) con licencia abierta (dominio público, CC0, CC BY, CC BY-SA), la achica y la guarda en el banco con el crédito y la licencia
(regla 99). La foto de un circuito se busca una vez por nota; las tres notas de un Gran Premio (horarios, clasificación y resultado) llevan la misma.

## 12. Ilustraciones con IA para las notas sin foto (16/10/2026, regla 182; automáticas y más amplias desde el 17/10, regla 185)

Hernán (16/10): "todas las notas de las últimas 24 h que no tengan foto, generarles una con Cloudflare; revisar que no sea nada raro; y que no
gaste ni un dólar de más". Y el 17/10: "falta agregar fotos a bastantes notas, no sé por qué salen sin fotos" y "que TODAS las notas tengan, no
te limites: la imagen no tiene por qué dibujar chicos". Se hace con el workflow **«Ilustrar notas sin foto»** (`web/scripts/ilustrar-notas.mjs`),
que desde el 17/10 corre **solo cada 2 horas** y también se puede correr a mano.

**Qué notas.** Las de la portada de las últimas *horas* (24) sin foto real. Como la imagen **nunca lleva personas ni rostros**, se ilustra casi
todo: también escuelas, chicos, deporte infantil o juvenil, lo policial o judicial, figuras públicas, deportistas nombrados, lo que publicó una
persona, **Policiales y Política** (con tono sobrio). **Se saltan** (con el motivo): las muertes, los velorios y los sepelios (`tocaUnaMuerte` y la
lista de «nunca»), el semáforo rojo (abuso sexual, suicidio, femicidio, trata), las notas propias que traen su imagen (clima, efemérides,
repasos, dólar, F1, fútbol; las de una pista sí) y lo que ya tiene foto o una ilustración que pasó el control.

**Cómo se hace.** Gemini (claves gratis: redacción para el prompt, clasificación para mirar la imagen, cada una de respaldo de la otra) lee la
**nota completa** y escribe un prompt en inglés con el pedido de Hernán (un bodegón sin personas, superficie de trabajo gastada, sin logos ni
textos, fondo desenfocado que sugiere el lugar, luz natural, 16:9 sin texto legible) y con el **tono** de la nota: alegre y luminoso para eventos,
deporte, cultura y escuela; sobrio y neutro (un objeto simbólico, nunca la escena) para Policiales, Política y lo grave; luz natural neutra lo
demás (`tonoDeLaNota`). Si el prompt nombra a alguien o describe personas, manos, armas, sangre, un auto chocado o un patrullero (y en lo sobrio,
juguetes, fuego o ambulancias), se descarta. El Worker de Cloudflare hace la imagen (SDXL 1024 × 576, 20 pasos, con prompt negativo y con
«blank paper, no writing, no letters, no signs, no logos, no people» sumado), y Gemini la vuelve a mirar: personas, rostros, texto aunque sea
deforme, logos, sangre, armas, algo que sugiera un delito, un accidente o una muerte, o que parezca la escena real de un hecho, o algo raro. Todo
tiene que venir en «no».

**Modo automático** (lo dispara el reloj de Cloudflare a los :20 cada 2 horas, de 7:20 a 23:20 de Balcarce, con *automatico* marcado). Genera
con el cupo **repartido en el día** (las de la mañana no se gastan todo: `cupoAutomatico`) y, en el job **«Guardar»**, aplica y sube **sólo las
que pasaron el control**. «Guardar» va en la misma fila que «Actualizar la web» (su grupo de concurrency), así nunca sube mientras la web se
arma, y si el push choca vuelve a bajar `main`, repite el aplicar sobre lo de ahora y empuja otra vez (tres intentos). Deja el resumen en el
registro y el adjunto **«aplicadas»** (`aplicadas.json` y las imágenes). La próxima corrida de «Actualizar la web» las muestra.

**A mano, en dos pasos.** *Revisar* (nada marcado; *ids* vacío o algunas notas): deja todo en el adjunto **«ilustraciones»** (las imágenes,
`index.html` para mirarlas en el celular y `candidatas.json` con el prompt, el tono, el control y las saltadas con su motivo); **no toca el
sitio**. *Aplicar* (marcar *aplicar*, *corrida* = el número de la corrida de revisión, que está en su dirección `…/actions/runs/NÚMERO`; *ids* =
las que estén bien, o vacío para las que pasaron el control): no genera nada, vuelve a filtrar con los datos de ese momento, guarda cada imagen
en `web/public/fotos-notas/<id>-ia.jpg` (1.200 px, JPEG) y la anota en `web/data/fotos-ia.json` (`archivo`, `credito` y `medio` «Ilustración
generada con IA», `origen: "ia"`, `cuando`, el título, `modelo` y el prompt; `automatica: true` si fue el modo automático).

**Gemini web, desactivado el 17/10/2026** (regla 206): 5 de sus 6 ilustraciones rompían las reglas (texto legible, marcas, gente). Queda **un
solo camino**, el automático de Cloudflare. Las de Gemini web que ya estaban (o cualquiera sin `control` anotado: `ilustracionControlada`)
pasan por el mismo control la próxima vez que su nota entra en una revisión: si pasan, quedan y se anota su control; si no, se reemplazan
por una nueva o se sacan. Cada ilustración nueva guarda su `control`. La tarea programada de la PC que hacía las de Gemini web hay que
apagarla a mano (`docs/flujos/IMAGENES-CON-GEMINI-WEB.md`).

**Cuánto gasta.** Gemini, nada (claves gratis). El Worker, unas 212 neuronas por imagen (estimadas: Cloudflare no publica la tarifa de SDXL; se usa
la de flux-schnell). Topes en el código: **12 llamadas por corrida y 20 por día** (cuentan las corridas de hoy, por su adjunto
«cuenta-ilustraciones», que se escribe después de cada llamada, y lo aplicado hoy con el Worker; lo de Gemini web no cuenta), un solo reintento
por imagen. Como mucho unas 4.240 neuronas por día, menos de la mitad de las 10.000 gratis del plan.

**En la web.** `generar-datos.mjs` suma `fotos-ia.json` con la **prioridad más baja**: una foto del banco o una que sumó una persona siempre gana, y
las notas ilustradas siguen en la búsqueda de fotos reales. Una nota propia con imagen, o que después toca una muerte o el semáforo rojo, no la
muestra (`ilustracionPermitida`); una de Policiales con una foto del banco que no es oficial muestra la ilustración en lugar de esa foto. La poda
no borra los `*-ia.jpg` de notas vivas. El epígrafe de la página, el RSS y el pie de Instagram dicen «Ilustración generada con IA».
Para sacar una: borrar su entrada de `fotos-ia.json` y el archivo.

### 12 bis. Figuras públicas, variedad, deportes y política (23/10/2026)

- **Figuras públicas** (Milei, Kicillof, Macri...): hasta el 24/10 se les buscaba una foto real libre en Wikimedia Commons; **se sacó (regla 319, § 7)**.
  La nota de una figura pública sale con la foto de sus fuentes o, si no hay, con la ilustración, que nunca muestra a una persona (ni un parecido).
- **Variedad**: cada nota recibe una variante de toma (encuadre y luz, estable por id) y se le pide a la IA objetos del tema concreto, no un bodegón fijo.
- **Deportes**: lista de objetos lisos (balón liso, conos, red, césped) y lista de lo que FLUX llena de logos y letras (camisetas, trofeos, marcadores,
  carteles); un prompt que las nombra se descarta. El control con visión no cuenta como texto o logo las costuras, rayas o tramas ni lo borroso del fondo.
- **Política**: nada de escritorio, oficina, computadora ni cuaderno; fachadas, escalinatas, plazas y recintos vacíos, sin carteles ni banderas.

## 13. Fotos con chicos de las fuentes de Balcarce (17/10/2026, reglas 186 y 211)

**La ampliación (regla 211, el mismo 17/10).** Hernán: "si es de fuentes de Balcarce no hay problema, sobre todo si no son de tinte policial".
Desde ese día la condición 1 de abajo ya no pide que la foto sea de un **organismo**: alcanza con que sea la foto propia de **cualquier fuente de
Balcarce**, un medio de acá (Radio Gabal, La Vanguardia, El Diario Balcarce, Infórmese Primero, Puntonueve, News Balcarce, Acción 5, Ahora
Balcarce) o un organismo (Municipalidad, Concejo, Facultad). La lista sale sola de las fuentes con `alcance: 'local'` de `ingesta/fuentes.mjs`
(`FUENTES_DE_BALCARCE_PARA_FOTOS_DE_MENORES`, una entrada por medio con el dominio de sus páginas) y una prueba la muestra entera, así que sumar
una fuente de Balcarce la suma acá y se ve. Siguen coincidiendo el nombre del medio **y** el dominio de la página de la foto, y además una foto de
la sección policial de un medio de acá (la dirección dice `polic…`, como `radiogabal.com.ar/index.php/policiales/…`) nunca entra. **Todo lo
demás es igual**: la sección, la actividad, nada sensible (policial, judicial, salud, accidentes, violencia, abuso, muertes, desaparecidos, chicos
bajo protección), sin marca, sin nombres de chicos, el crédito en el epígrafe, nunca en el collage de las redes, y el interruptor
`FOTOS_MENORES_OFICIALES`, **que sigue apagado hasta que lo prenda una persona** (Settings → Secrets and variables → Actions → Variables, «Si»).
Con los datos del 17/10: de las 63 notas del archivo que quedaron sin foto porque la IA vio un chico, pasarían el texto y la fuente **11** (antes de
la ampliación, 3), entre ellas la Escuela Municipal de Básquet contada por Gabal, Puntonueve, Infórmese y La Vanguardia, el torneo de gimnasia
rítmica de Amigos Unidos y el musical del Instituto Adventista; siguen afuera el choque de la moto (Policiales), la charla de Bomberos tras el
terremoto (una emergencia), el fútbol playa con los siete nombres y el Día del Sordo. Que la foto salga depende además de que la IA la vea sin marca.
Prueba: `pruebas/fotos-menores-oficiales.test.mjs` («regla 211…»).

Lo que sigue es la regla 186 como se escribió primero (sólo organismos); donde dice "organismo", desde la 211 vale "fuente de Balcarce".

**La decisión.** Hernán, el 17/10/2026: "si hay menores en la foto y la fuente es de Balcarce y es un juego, olimpíadas o algo
deportivo/escolar/cultural, y son fuentes que realmente no suben nada policial, como el municipio, estaría bueno dejarlo". Hasta ese día la
regla era firme y sin excepciones: ninguna foto real con un menor reconocible. Ese día el 42 % de las notas sin foto lo era por eso (la IA veía
un chico), muchas de una escuela deportiva municipal. Lo implementó Claude el mismo día, **apagado**, para que Andrés lo prenda después de
revisarlo.

**Qué cambia.** Una sola excepción, `menorEnActividadOficial` (`ingesta/fotos-menores.mjs`). La foto con chicos se puede usar **sólo si se
cumple todo**:

1. **La foto es de una fuente de Balcarce** (desde la regla 211; hasta ahí, sólo del organismo y no de un medio): la página de donde sale es
   de `FUENTES_DE_BALCARCE_PARA_FOTOS_DE_MENORES` (`ingesta/fuentes.mjs`): los medios de acá y los organismos (la Municipalidad de Balcarce y
   sus áreas —Deportes, Cultura, Educación, Juventud, Turismo publican en `balcarce.gob.ar`—, el Concejo Deliberante y la Facultad de Ciencias
   Agrarias; ésos siguen en `FUENTES_OFICIALES_PARA_FOTOS_DE_MENORES`). Tienen que coincidir el nombre del medio **y** el dominio, y nunca
   de la sección policial de un medio.
2. **La nota es de una actividad**: sección Deportes, Cultura y agenda, Educación o Balcarce; el título o la bajada nombran algo de la lista
   cerrada `ACTIVIDADES` (torneo, juegos, olimpíadas, escuela, festival, muestra, coro, taller, colonia…).
3. **No toca nada sensible**, en ningún lugar del texto: policial, judicial, salud o discapacidad (la foto de un chico de una escuela especial
   dice algo de su salud), accidentes, violencia, abuso, denuncias, muertes, desaparecidos, chicos bajo protección (`PROHIBIDAS`); ni nada
   que el semáforo marque en rojo o amarillo (`semaforoDelTexto`; la lista roja **no** se tocó); ni la edad de un chico ("un nene de 9 años").
4. **Sin marca**: la IA la evaluó explícitamente sin marca de agua ni logo sobreimpreso (`tiene_marca: false`), como siempre.
5. **Sin nombres**: ni una persona con nombre y apellido en el título o la bajada (el protagonista de la nota puede ser el chico de la foto), ni
   en el cuerpo una lista de nombres o un nombre pegado a "alumna", "jugador", "infantil"… (`nombraAUnMenor`). Salta de más a propósito.
6. **El crédito en el epígrafe**, como cualquier foto ("Foto: Municipalidad de Balcarce").

Fuera de eso, todo sigue igual: ninguna foto real con un menor. Para el resto están las ilustraciones sin personas (§ 12).

**El interruptor.** La variable de GitHub `FOTOS_MENORES_OFICIALES` (Settings → Secrets and variables → Actions → Variables). Con "Si", prendida;
vacía o cualquier otra cosa, apagada (así arranca). Prendida: la IA recibe un párrafo que le dice que la foto de esa letra (la del organismo)
puede elegirse aunque tenga chicos, y que igual los marque; y una nota que ya se había descartado por "menor" se vuelve a probar **una** vez.
Apagada: además de no aceptar ninguna nueva, **las que ya entraron dejan de mostrarse** en la próxima corrida (también si la nota, por una
corrección, pasa a tocar algo prohibido).

**El registro, para auditar.** Cada foto aceptada por la excepción queda: (1) en su entrada de `web/data/banco-fotos.json`, con
`excepcion: { regla, motivo, fuente, cuando }` (la poda le saca el archivo, no esto); (2) en el log del paso «Buscar noticias y armar los datos»
de «Actualizar la web», con la línea «fotos: CON CHICOS por la excepción menorEnActividadOficial (regla 186): id · fuente · motivo · título»; y
(3) en `npm run auditar-fotos`, en «Fotos con chicos aceptadas por la excepción».

**Dónde no van.** El collage de los repasos (que va a las redes) nunca usa una de estas fotos. Una nota de Deportes o Balcarce que sale sola en
Facebook o Instagram sí puede llevarla, como cualquier foto de su nota.

**Cuánto cambia.** Medido con los datos del 17/10 (las notas que la IA descartó por un chico y cuyo texto pasa todas las condiciones, con la foto
del organismo entre las candidatas): de las 11 notas de los últimos 7 días sin foto por un menor, **1** (la Escuela Municipal de Básquet); de 39
en 30 días, **3** (además, el torneo de gimnasia artística y el vóley sub-21). Casi todos los descartes son fotos de medios, que la excepción
no cubre. Se quedan afuera a propósito, entre otras, la nota del fútbol playa (nombra a los siete chicos), la del básquet por el cáncer de mama,
la del Día del Sordo y la del juez Ariel Bilbao (su nombre en el título). Que la foto salga depende además de que la IA la vea sin marca.

**La prueba**: `pruebas/fotos-menores-oficiales.test.mjs` (en el núcleo legal: corre en cada vuelta de «Actualizar la web»).


## 14. Los controles del 17/10/2026 y el arreglo de los datos (reglas 203 a 206)

La auditoría del 16/10 (`docs/auditoria-2-0/03-FOTOS.md`) encontró fotos mal puestas que una sola pasada de IA dejó pasar, fallas de código
que dejaban notas con la placa, imágenes rotas en el archivo y código sin usar. Los dueños: "arreglá todo lo que puedas, borrá, mejorá",
sin sumar costos (sólo las claves gratis y Cloudflare). Lo que cambió:

| Qué | Dónde | Regla |
|---|---|---|
| La IA contesta si la foto corresponde, si es de archivo, si es una gráfica (flyer, captura, «Activar Windows»), si es de stock, si hay gente joven, y la describe; lo que vio queda en `vision` | `instruccion`, `motivosDeDescarte` (`ingesta/fotos.mjs`) | 203 |
| Las fotos van a la IA achicadas; Groq con 413 prueba con una; el error de Gemini se guarda; cualquier formato que ffmpeg lea se guarda | `achicarParaIA`, `pedirAGroq`, `errorDeRespuesta`, `fotoParaGuardar` | 203 |
| La poda espera una semana; lo podado de una nota que vuelve se reintenta | `podarFotos`, `sePuedeReintentar` | 203 |
| El archivo toma la foto del banco en cada vuelta (sin imágenes rotas) | `fotoDelArchivoAlDia`, `generar-datos.mjs` | 203 |
| Lo que una persona saca (`descartada`) no vuelve en esa nota ni en otra | `sePuedeReintentar`, `fotoRepetidaEnElBanco` | 203 |
| La misma foto no ilustra dos notas de temas distintos (huella o dirección) | `huellaDeFoto`, `mismoTema`, `fotoRepetidaEnElBanco` | 204 |
| Segunda opinión del otro modelo gratis en los casos dudosos | `esDudosa`, `conSegundaOpinion`, `revisarUnaFoto` | 204 |
| Wikimedia: el título nombra a la persona, la foto no tiene más de dos años, no se repite y la mira la IA (**retirado el 24/10 por la 319**; sólo queda lo que sacaba) | `nombraALaPersona`, `buscarFotoWikimedia`, `anioDeLaFoto` | 205 |
| Wikimedia Commons no ilustra ninguna nota con fuentes (ni personas, ni lugares, ni objetos): la foto sale de las fuentes; Commons sólo por el lugar en las notas propias de F1 y fútbol; la revisión del archivo saca las que aparezcan | `esFotoDeCommonsEnNotaConFuentes`, `commonsPermitidoParaLaNota` (`ingesta/fotos.mjs`), `consultaEsDeUnLugar` (`web/scripts/foto-libre.mjs`), `conFotosDelBanco`, `revisionDeLaFoto` | 319 |
| Un solo camino de ilustración (Cloudflare); las de Gemini web se controlan igual; se borró el código muerto y los modelos sin uso del Worker | `ilustrar-notas.mjs`, `infra/imagenes-cloudflare/worker.mjs` | 206 |
| `npm run auditar-fotos` separa la foto real de la ilustración y de lo sacado | `motivoDeLaNota` (`ingesta/auditar-fotos.mjs`) | 203 |

**El arreglo de los datos** (un script de una sola vez, `web/scripts/arreglar-fotos-17-10.mjs`, que se corrió el 17/10 y se borró ese
mismo día; queda en el historial de git). Lo que hizo quedó en `web/data/banco-fotos.json` y `web/data/fotos-ia.json`. En orden: (1) sacó las fotos que la auditoría vio mal (`DESCARTES`: la captura con «Activar Windows» `1vhit3n`, el flyer de la
rifa `66so6t`, la foto de stock `130eay0`, el pádel `1ge6irq` y el rugby del «Torneo Desarrollo» `11lwkfl`, `1mfnr70`, `1fi9fiz`, por edad
dudosa) y las de Wikimedia viejas o de otra persona (`WIKIMEDIA_VIEJAS_O_EQUIVOCADAS`: Messi 2012, el F1 de 2016, otro Román González,
otro Julián Álvarez, un paisaje para una diputada, retratos de 2006 a 2019), dejándolas `descartada` con su huella; (2) le puso la huella a
cada foto del banco; (3) sacó las repetidas de temas distintos (quedó la de la nota más vieja); (4) volvió a bajar las fotos de notas vivas
que la poda borró de más, salvo las dos de Virginia Aparicio (posible víctima, sin foto real por las dudas) y las que quedarían repetidas;
(5) sacó de `fotos-ia.json` las cinco de Gemini web que rompían las reglas y una automática con las tiras de Adidas, y anotó el control de la
que estaba bien. Las imágenes rotas del archivo las arregla el código en cada corrida.

Medido el 17/10 con los datos del 16/10 a la noche, antes de aplicarlo: de 1.117 notas con página (sin las propias), **867 con foto real, 11 con
ilustración y 239 con la placa** (9 con la imagen rota); lo esperado después del arreglo, **832 con foto real, 5 con ilustración y 280 con la placa**.
Pierden la foto real 38 notas (7 de la auditoría, 17 de Wikimedia y 14 repetidas de otro tema) y la recuperan 3 (podadas de más); pierden la
ilustración 6. Las notas de las últimas 24 horas que quedaron sin nada las ilustra sola la próxima corrida automática; para las demás,
correr a mano «Ilustrar notas sin foto» con sus ids.
