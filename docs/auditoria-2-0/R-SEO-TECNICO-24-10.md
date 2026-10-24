# R. SEO técnico de bajo riesgo: qué se arregló del informe P y cómo se prende lo que quedó apagado

*24/10/2026. Sigue al informe `P-REVISION-INDEPENDIENTE.md` (secciones 2.5, 3.1 a 3.10 y 5) y a `O-SEARCH-CONSOLE-24-10.md`. Alcance del dueño: **sólo técnica y SEO**; no se
toca qué noticias se eligen, ni la firma, ni cómo se muestran las fuentes, ni `ingesta/`, `reels/` ni `redes/`. Regla 321 (`docs/10-REGLAS-Y-PRUEBAS.md`), prueba
`pruebas/seo-tecnico-321.test.mjs`. Nada se desplegó, ninguna variable se prendió.*

## 1. Antes y después (compilación real, con los datos del 24/10, `SITIO=https://radarbalcarce.com`)

| Qué | Antes | Después (todo apagado, como va a producción) | Con `SITEMAP_PARTIDO` prendida |
|---|---|---|---|
| Archivos de `web/out` | 3.902 | **3.906** (+4: los dos mapas por mes, `2026-09` y `2026-10`, y 2 archivos de Next para esa ruta) | 3.906 |
| HTML de una nota (la de los abogados, mismo dominio) | 70.518 bytes | 70.689 bytes (+171: el enlace de la sección) | igual |
| `image` del marcado de las 500 notas | 200 con la **tarjeta** primero, 300 con la foto primero, 500 con tarjeta | **434 con la foto sola**, 66 sin imagen (sin foto o foto de menos de 50.000 píxeles); **0** con tarjeta | igual |
| Páginas 404: etiquetas `robots` | `noindex` + `index, follow, max-image-preview…` (en producción) | **una**: `noindex` | igual |
| Notas con `noindex` en el sitio | 7 (sin cuerpo) | **28** (+21 plantillas) | igual |
| `sitemap.xml` | 554 direcciones (493 notas + 61 páginas) | 533 (472 notas + 61 páginas) | **61** (sólo páginas) |
| `sitemap-news.xml` | 78 | **71** | igual |
| Mapas de notas por mes | no existían | existen, sin anunciar | `2026-10` (452) y `2026-09` (20), en `/sitemap-index.xml` |
| `dateModified` distinto de `datePublished` | 9 notas | 9 hoy; **hasta 15** apenas corra "Actualizar la web" con este cambio (6 notas del sitio tienen un arreglo de la auditoría, § 2.1) | igual |

## 2. Qué se hizo

### 2.1 Datos estructurados (punto 1)

- **`image` ofrece la foto de la nota y nunca la tarjeta con el titular** (`imagenesDeNota`, `web/lib/datos-estructurados.js`): un `ImageObject` con su ancho y alto reales y su
  crédito. Mínimo, el de Google: 50.000 píxeles (antes se pedía ancho de 696 px y la tarjeta iba primero cuando la foto era chica). Si no se pudo medir (foto en otro lado,
  `FOTOS_BASE`), se declara su dirección sola. Sin foto o con una diminuta, **no se declara imagen** (la tarjeta, la placa de la sección y las ilustraciones sin foto no son
  foto). La tarjeta sigue siendo la `og:image` para WhatsApp, Facebook y X (no cambió).
- **16:9, 4:3 y 1:1: no se pudo sin generar archivos.** Google recomienda las tres proporciones. El sitio guarda **una** foto por nota con la proporción que tenía (en las 515
  notas con foto hay 1200×676, 1200×900, 1200×630, 1200×800, 1024×1024, 600×316…) y la página la recorta a 16:9 con CSS, que Google no ve. Tres recortes serían tres archivos por nota
  (1.500 archivos nuevos solo para las 500 notas del sitio, el 7,5 % del tope de 20.000 de Cloudflare Pages). **Opción sin archivos nuevos, para decidir:** las transformaciones de
  imagen de Cloudflare (`/cdn-cgi/image/width=1200,height=675,fit=cover/...`) recortan al pedirse, con un cupo gratis de 5.000 transformaciones únicas por mes **[a validar en la cuenta
  y en el panel de Cloudflare antes de contar con eso]**; hay que activarlas en la zona y después es un cambio chico en `imagenesDeNota`. No se hizo: toca la cuenta de Cloudflare.
- **`dateModified`** (también `og:modifiedTime` y el `lastmod` de los mapas de notas) es la última vez que cambió algo: `publicadaCuando`, `corregidaCuando` (una persona) o
  **`auditadaCuando`** (la auditoría con IA arregló una falta; nuevo). Nunca antes de `datePublished`. `conCambiosDeLaAuditoria` (`web/lib/archivo.js`) la deja en la nota con el
  `cuando` de `correcciones-auditoria.json`, también cuando el texto ya venía arreglado de una corrida anterior (el archivo). Con los datos de hoy: 6 notas del sitio y 27 del histórico
  cambian su `dateModified`. **No** aparece como «Actualizado» para el lector (sigue siendo sólo lo que corrige una persona, regla 252): un arreglo de una letra no es una novedad. Aparece
  cuando corra "Actualizar la web" (los datos de `portada.json` y `archivo.json` se rehacen ahí).

### 2.2 La página 404 (punto 2)

`web/app/not-found.js` exporta `metadata = { robots: null }`: la plantilla ya no escribe su etiqueta (`index, follow, max-image-preview:large…`) y queda la única que agrega Next a
toda 404, `noindex`. Comprobado en la compilación (`web/out/404.html`).

### 2.3 Las plantillas que se repiten: `noindex, follow` y fuera de los mapas (punto 3)

`web/lib/indexacion.js` (`motivoDePlantilla`, `esPlantillaRepetida`, `noSeIndexa`). **Son exactamente estas seis**, según el informe P § 3.7 y los datos de `web/data` (1.942 notas conocidas
al 24/10: archivo, portada e histórico):

| Qué | Cómo se reconoce | Notas hoy en los datos (sitio / total conocido) | La página fija que sí se indexa |
|---|---|---|---|
| Clima diario | `propia = 'clima'` | 5 / 16 | `/clima` |
| Repasos de redes (mañana, tarde, noche) | `propia = 'repaso'` | 12 / 70 | las notas que cuenta cada repaso |
| Dólar del día | `propia = 'dolar'` | 0 / 2 | `/dolar` |
| Horarios de la F1 («en hora argentina») | `tipoF1 = 'horarios'` | 1 / 3 | `/tablas/formula-1` |
| Horarios y partidos del fútbol («lo que falta de la fecha, con horarios») | `tipoFutbol = 'partidos'` | 1 / 3 | `/tablas/liga-profesional` |
| Códigos de un juego o de descuento («códigos gratuitos de Free Fire para hoy») | el título: «código(s)» junto a un juego conocido, «canje» o «descuento/promocional/cupón» | 2 / 2 | ninguna |

Total: **21 en el sitio, 96 de 1.942 conocidas**. **No** entran: los resultados, la parrilla y la sprint de la F1, los resultados y las tablas del fútbol, las efemérides, las pistas, ni
ninguna nota común (una prueba recorre los datos reales y falla si algo de Policiales o Política cae en la lista, o si una nota común se marca por algo que no sean los códigos).
«Notas sin fecha real» ya quedaban fuera del mapa de noticias.

Qué cambia: la página lleva `<meta name="robots" content="noindex, follow">` y no figura en `sitemap.xml`, `sitemap-news.xml` ni en el mapa de notas por mes ni en el del archivo (el
exportador anota `indexar: false` leyendo el HTML). Qué **no** cambia: la portada, las secciones, el feed, `/hoy`, el buscador del sitio y los datos para agentes las siguen mostrando, y
cualquiera puede abrir, compartir y enlazar la página (por eso `follow`). `noSeOfreceAGoogle` (la nota sin cuerpo de verdad) no cambió. Reversible: sacar un tipo de
`motivoDePlantilla` lo vuelve a ofrecer en la compilación siguiente.

Lo que no alcanza: las notas ya guardadas en R2 son el HTML de cuando salieron (sin `noindex`) y siguen en su mapa hasta que se vuelvan a exportar; el exportador compara por huella y
resube las que cambiaron mientras están en el margen. Una plantilla vieja ya archivada tarda en dejar de ofrecerse. Es poco (en las que quedan en el sitio, 21).
`redes/indexnow.mjs` (no se toca: `redes/`) sigue avisando de estas direcciones a Bing; es inofensivo (Bing las lee y respeta el `noindex`).

### 2.4 El mapa del archivo en R2 y el mapa del sitio, partidos (punto 4)

Todo **escrito, probado y apagado**.

- **Del archivo (R2)**: `mapasDelArchivo` (`infra/archivo-cloudflare/worker.mjs`) arma, desde el manifiesto, **un mapa por cada mes** (`/nota/sitemap-archivo-AAAA-MM.xml`, mes en hora de
  Balcarce) y **un índice** (`/nota/sitemap-archivo.xml`, que antes era un mapa único). El exportador (`web/scripts/archivar-a-r2.mjs`) los sube **antes** del manifiesto (primero los
  meses, al final el índice) y **sólo los que cambiaron**: la huella de cada mapa viaja en el manifiesto (`mapas`), así lo que falló se reintenta y lo que no cambió no cuesta los ~4 s
  de una subida con wrangler (importa por los minutos de Workers Builds). El Worker del archivo sirve el índice y cada mes (`/nota/sitemap-archivo-2026-10.xml`; un mes mal escrito, otro
  método o el Worker apagado son un tubo, como antes).
- **Del sitio**: con `SITEMAP_PARTIDO` = Si, `sitemap.xml` queda con las páginas (fijas, 46 de secciones y los eventos; sigue siendo un mapa común y conserva el `lastmod` que lee el
  vigilante) y las notas pasan a `/sitemap-notas/AAAA-MM/sitemap.xml` (con el mapa de imágenes de Google), que lista `/sitemap-index.xml`. Los mapas de cada mes se arman siempre
  (4 archivos más), para poder mirarlos antes de anunciarlos.
- **Un índice no puede listar a otro** (protocolo de sitemaps; Google lo rechaza). Como `/nota/sitemap-archivo.xml` ahora es un índice, **`/sitemap-index.xml` ya no lo lista** (**corrige la
  regla 310**): con `SITEMAP_DEL_ARCHIVO` = Si se anuncia en `robots.txt` (`Sitemap: https://radarbalcarce.com/nota/sitemap-archivo.xml`) y se agrega a mano en Search Console.
- «Por tipo» quedó así: **páginas** (`sitemap.xml`), **noticias de las últimas 48 horas** (`sitemap-news.xml`), **notas del sitio por mes** y **notas del archivo por mes**. Search
  Console muestra la indexación de cada una por separado, que es lo que pedía el informe P.

**Orden exacto de prendido** (una persona, de a un paso, mirando entre uno y otro; ningún paso rompe el anterior):

0. **Antes de nada**: mezclar esta rama. Con el primer "Actualizar la web" ya valen, sin variables, la foto en el marcado, `dateModified`, la 404 y el `noindex` de las plantillas. Mirar
   un día en Search Console que baje lo «rastreado, sin indexar» sin que suba nada raro.
1. **Subir el Worker del archivo** (workflow «Archivo permanente (producción)», `docs/salud-tecnica/ARCHIVO-PERMANENTE-IMPLEMENTACION.md`; la ruta `radarbalcarce.com/nota/*` ya está puesta).
   Sin la variable, nadie le pide nada nuevo. Comprobar: `curl -sI https://radarbalcarce.com/nota/sitemap-archivo-2026-10.xml` → 404 «Todavía no hay mapa del archivo» (el Worker nuevo lo
   reconoce) y no el 404 de la web.
2. **Esperar una vuelta del exportador con `R2_ARCHIVO` puesta** (corre dentro de la vuelta del motor, «Archivar las notas por salir»): sube los meses, el índice y el manifiesto con `mapas`. Es la primera vuelta después de actualizar: sube los mapas aunque no haya ninguna nota nueva por archivar (el manifiesto de antes no tiene `mapas`); las siguientes sólo los que cambian.
   Comprobar: `https://radarbalcarce.com/nota/sitemap-archivo.xml` es un `<sitemapindex>` con un mapa por mes y cada mes responde 200 con su `<urlset>`; `X-Radar-Archivo: sitemap`.
3. **`SITEMAP_PARTIDO` = Si** (variable de GitHub; después «Cargar variables del motor» para Workers Builds; regla 311: llega a Actions y a Workers Builds y recompila el sitio). Comprobar:
   `/sitemap-index.xml` lista `sitemap.xml`, `sitemap-news.xml` y un mapa por mes; `/sitemap.xml` ya no tiene notas pero sí su `<lastmod>` (el vigilante no tiene que quejarse del «mapa del
   sitio»); `/sitemap-notas/2026-10/sitemap.xml` responde 200. En Search Console → Sitemaps, `sitemap-index.xml` ya está enviado: en un par de días muestra cada mapa hijo.
4. **`SITEMAP_DEL_ARCHIVO` = Si** (también «Cargar variables del motor»). Comprobar `https://radarbalcarce.com/robots.txt` (aparece la línea del mapa del archivo) y **agregar `nota/sitemap-archivo.xml`
   en Search Console → Sitemaps** (es la parte que hace falta a mano). Es el paso que más ayuda a las 337 «descubiertas, sin indexar» (informe P § 3.1).
5. Una semana después: en Search Console comparar, por mapa, enviadas e indexadas.

Volver atrás: poner cualquiera de las dos variables en «no» (o borrarla) y cargar las del motor: en la compilación siguiente `sitemap.xml` vuelve a tener las notas y `robots.txt` deja de
anunciar el mapa del archivo. No hace falta tocar el Worker ni R2.

### 2.5 «Seguí leyendo» y enlaces internos (punto 6)

- El parecido entre notas suma **una palabra clave del título en común** (palabras de 5 letras o más que no sean vacías como «semana» o «nuevo»; hasta 3 puntos), además de los temas y las
  etiquetas, que muchas notas del archivo no tienen. Las que cuentan la misma historia siguen excluidas (`mismaHistoria`). Las cuatro siguen siendo de la misma sección si las hay.
- **La etiqueta de la sección, arriba de cada nota, es un enlace a la sección.** Antes la nota sólo enlazaba a su sección con «Ver todo →», y sólo si había notas para ofrecer abajo. Un
  enlace visible a la sección en las 500 notas, sin tocar nada más.
- No se sumaron páginas de tema (siguen sin enlazarse: `MOSTRAR_TEMAS` en `false`) ni «antecedentes»: son decisiones de contenido del informe P § 3.6.

## 3. Lo que NO se hizo: las páginas de archivo por día (`/archivo/AAAA/MM/DD`) (punto 5)

**Se midió y se dejó como diseño**, porque no entra sin riesgo con lo que el sitio sabe al compilar.

Medición (24/10): el sitio conoce 1.942 notas, repartidas en **50 días distintos** (hasta 99 notas por día; 45 días sólo en el histórico). Una página por día son **50 archivos** hoy y
**uno más por día** (3.906 de 20.000 → unos 3.956; con los 180 días de vida del archivo, 230 archivos como mucho, el 1 % del tope). El número de archivos **no es el problema**.

Por qué no se hizo:

1. **Se generaría desde `archivo.json` y el histórico, y el histórico no es seguro como fuente de enlaces.** `docs/salud-tecnica/ARCHIVO-PERMANENTE-IMPLEMENTACION.md` (§ 9, Riesgos) lo dice: el histórico
   **guarda notas que se retiraron después de salir del sitio** (menores, víctimas, retiradas a mano); R2 las borra, pero el histórico no. Una página pública con sus titulares las volvería a
   mostrar. Excluirlas exige saber qué está retirado y no hay un único lugar donde figure.
2. **Muchas notas del histórico nunca llegaron a R2**: el exportador anota `sin-html-en-el-sitio` (289 el 16/10; § 7 de ese documento) y el informe P encontró 2 de 6 notas del 5/10 con 404. Un enlace a una de
   ellas es un 404 nuevo.
3. **Lo único que sabe qué hay en R2 es el manifiesto, y vive en R2**, no en el repositorio: la compilación no lo ve.

Con las notas que sí están en el sitio la página no aporta (las secciones ya paginan todo lo que hay) y, apenas salen del sitio, desaparecerían de su día.

**Diseño recomendado (para cuando se decida): que el exportador las arme desde el manifiesto y las sirva el Worker del archivo.** El exportador ya tiene el manifiesto final (sólo notas que
de verdad están en R2, sin las retiradas), y ya sube el mapa partido de este documento.

- El sitio compila **una** página molde (`/archivo/molde`, `noindex`, con el menú, el pie y los estilos reales). El exportador toma su HTML (como hace `prepararHtml` con las notas),
  le pone adentro `<h1>Notas del 24 de octubre de 2026</h1>` y la lista (título, sección, hora, enlace) de las notas de ese día **del manifiesto**, y la sube a R2 como
  `archivo/AAAA/MM/DD.html`, más un `archivo.html` con los meses y los días. Sólo se resube el día que cambió (huella, como las notas).
- El Worker del archivo (`infra/archivo-cloudflare/`) sirve `/archivo/*` desde R2 (nueva ruta `radarbalcarce.com/archivo/*`, con `ruta.mjs poner archivo`, y una prueba como las de `/nota/*`).
  Una página de un día vacío no existe (404).
- Los días entran a `sitemap-archivo-AAAA-MM.xml` (o a un mapa de días) y se enlazan desde el pie («Archivo») y desde cada nota («Más notas del 24 de octubre»); esos enlaces van detrás de
  una variable nueva (`ARCHIVO_POR_DIA`), que se prende **después** de poner la ruta, como `SITEMAP_DEL_ARCHIVO`.
- Costo: unas 50 subidas la primera vez (~4 s cada una con wrangler: una corrida con `--limite-segundos`), después 1 a 2 por vuelta. Ningún archivo más en Cloudflare Pages.
- Lo que hay que decidir antes: si se agrega la ruta `/archivo/*` al Worker (cambio de infraestructura) y si las páginas viejas deben reflejar lo retirado (se rehacen con el manifiesto,
  que ya borra lo retirado).

## 4. Qué mirar en vivo después de desplegar

- Una nota con foto: en el código fuente, `"image":[{"@type":"ImageObject","url":".../fotos-notas/….jpg","width":…}]` y ninguna dirección con `opengraph-image` en el JSON-LD (sí en
  `og:image`).
- Una nota del clima, de un repaso o de horarios: `<meta name="robots" content="noindex, follow">`; y que no estén en `sitemap.xml` ni `sitemap-news.xml`.
- `https://radarbalcarce.com/pagina-que-no-existe`: una sola etiqueta `robots` (`noindex`).
- Una nota que la auditoría arregló: `dateModified` posterior a `datePublished`.
- Search Console → Sitemaps: `sitemap.xml` baja de 554 a 533 direcciones (con `SITEMAP_PARTIDO`, a 61); «Páginas → Excluida por etiqueta noindex» sube en unas 20 y vuelve a bajar a medida
  que Google las deja de rastrear; «Rastreada, sin indexar» es la cifra que tiene que bajar.

## 5. Tres cosas del informe P que NO se tocaron (fuera del alcance de este arreglo)

La doble pasada de lo que cambia en cada media hora (`web/data/` en git), el tope de 500 notas y la mudanza a Workers con static assets (§ 2.2 del informe P), y las páginas de
transparencia (`/redaccion`, `/politica-editorial`, `/correcciones`, § 3.8): son decisiones de infraestructura y de contenido, no arreglos de bajo riesgo.
