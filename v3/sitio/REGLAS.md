# El sitio (`v3/sitio/`, Worker `radar-sitio`)

*Qué hace, en palabras de una persona. Si una regla no está acá, no existe. Etapa C del plan (`docs/propuestas/PLAN-RADAR-3-0.md`, § 3.8).*

## 1. Qué es

Un solo Worker de Cloudflare que arma cada página en el momento, leyendo la base D1 `radar-nucleo` (la misma del núcleo). No hay compilación,
no hay tope de notas ni de archivos: una nota publicada en la base está en el sitio al instante. Para no pegarle a la base en cada visita,
guarda cada página armada unos minutos en la caché de Cloudflare.

## 2. Qué se ve

- **Sólo notas publicadas.** Una nota en `borrador` o `retirada` no existe para el sitio: da 404 aunque se conozca su dirección.
- **La nota** (`/nota/<titular-en-guiones>-<id>`): título, bajada, «En dos líneas», foto con su crédito, cuerpo, los bloques que salen de la
  ficha **sólo cuando hay con qué** (Los datos, Cronología —3 fechas o más—, Cifras sin la fuente al lado; «Qué falta saber» no se muestra: Hernán, 3/11), la firma (quién la escribió, siempre),
  la fecha, y un desplegable **cerrado** «Fuentes (N)» con el nombre de cada medio y su enlace. No hay análisis ni «qué dicen las fuentes».
- **La dirección es una sola y no cambia.** Lo que cuenta es el id del final. Si llega la dirección con un titular distinto (o sólo el id), se
  redirige a la verdadera. El titular de la dirección se fija la primera vez que la nota se muestra y queda guardado.
- **Las secciones** (`/seccion/<seccion>`, 10 por página, `?pagina=2`): las mismas catorce de siempre.
- **La portada** (`/`) es la tapa A «Diario» que eligió Hernán (maqueta en `docs/propuestas/tapa-3-0/a-diario.html`): cuadro de clima y farmacia de turno, aviso fijo, la nota principal con tres titulares al costado, una grilla de 6 con fotos, aviso rotativo 1, «Última hora» (12) con la columna lateral (aviso rotativo 2 y «Lo último de Balcarce»: todavía no hay datos de lecturas para «Lo más leído»), la invitación a escribir por WhatsApp (2266 51-1612), aviso rotativo 3 y «Más de hoy» (8). Salen las notas de las **últimas 36 horas** (si hay menos de 8, se completa con las últimas 30 publicadas). **Balcarce primero**: la principal, los titulares y la grilla toman antes las de Balcarce; la principal y la grilla piden foto. Sin foto, placa con el color de la sección. Lo reparte `armarPortada` (`vistas/portada.mjs`).
- **Encabezado, menú y pie** son los mismos en todas las páginas (`vistas/base.mjs`): barra superior con fecha, clima y farmacia, logo, buscador, menú de 14 secciones (en el celular se abre con un botón; sin JavaScript queda a la vista) y pie. El único JavaScript del sitio es el del botón del menú.
- **Clima y farmacia** (`datos-del-dia.mjs`): el clima sale de Open-Meteo (Balcarce, −37,846 / −58,255) y se guarda 30 minutos en la caché de Cloudflare; la farmacia de turno sale del Colegio de Farmacéuticos (`colbalcarce.com`: cronograma del mes y direcciones, el mismo camino del sistema viejo) y se guarda una hora; el turno cambia a las 8:30. Si algo falla, el cuadro dice «Clima no disponible» o manda al Colegio: nunca se inventa. Cada pedido espera como mucho 2,5 segundos.
- **Buscar** (`/buscar?q=`): busca las palabras en título y bajada. No se indexa.
- **Para buscadores y lectores de feeds:** `/sitemap.xml` (índice) y un mapa por mes (`/sitemap-2026-11.xml`), `/rss.xml`, `/robots.txt`.
- **Avisos:** hay un lugar fijo y tres rotativos, vacíos y marcados en el HTML. Los datos de los avisos vienen después.

## 3. Indexar (`INDEXAR`)

Con `INDEXAR = "no"` (workers.dev, antes del corte) todas las páginas llevan `noindex` y `robots.txt` pide que no entre nadie. Desde el corte vale `si`. Las direcciones canónicas ya dicen `https://radarbalcarce.com/…`.

## 4. El archivo viejo

Todas las notas del sistema viejo (el sitio de hoy, su archivo y las de la redacción) se pasan a la base con **su misma dirección**, para que
Google no pierda nada. Se marcan `origen = 'viejo'`; las del núcleo, `'nucleo'`; las que escribe una persona desde Telegram o el panel, `'redaccion'`.
La migración es de a pocas notas por archivo `.sql`, con `INSERT OR IGNORE`: correrla de nuevo no duplica ni pisa nada.

**El archivo permanente de R2** (`radar-archivo`, ~1.500 páginas ya dibujadas) no se migra leyendo el HTML: los datos enteros de esas mismas notas siguen
en `web/data/historico/AAAA-MM.json`, y de ahí sale `scripts/migrar-archivo.mjs` (`archivo-NNN.sql`). Con credenciales de Cloudflare además baja `manifiesto.json`
del depósito viejo y, si hubiera una nota que el manifiesto tiene y el histórico no, la arma leyendo su página (`notaDesdeHtml`, con la dirección canónica; pierde las fuentes).
No se migran las retiradas, las unidas a otra por la revisión, ni las que nunca tuvieron cuerpo (eran `noindex`).

**Las fotos viejas** se piden a `https://radarbalcarce.com/fotos-notas/…`; el día del corte ese dominio es este Worker, que las sirve desde el depósito R2 `radar-fotos`
(binding `FOTOS`, claves `fotos-notas/<archivo>`), con caché larga (el navegador una semana, Cloudflare un mes). Lo mismo `/fuentes/<archivo>` (tipografías, un año).
`scripts/copiar-fotos.mjs` las sube desde `web/public/fotos-notas/` y `web/public/fuentes/`, y rescata del depósito viejo las que piden las notas y el repositorio no tiene.
Las fotos de las notas **nuevas** del núcleo siguen guardando la URL del medio de origen (no se copian a `radar-fotos`); queda para después.

## 5. Cuánto dura cada cosa en caché

Portada y secciones: 5 minutos (el clima y la farmacia dentro de la página se ven con esa demora más la de su propia caché). Notas: 1 hora (una corrección tarda hasta una hora en verse, salvo que se purgue). Mapas del sitio: 1 hora. RSS: 10 minutos.
Búsquedas y errores: nada.

## 6. Pruebas

`node --test "v3/sitio/*.test.mjs"` (sin red, con SQLite en memoria): la nota con y sin bloques, 404, borradores ocultos, sección paginada,
mapas, RSS, redirecciones de dirección y la migración con cinco notas reales. Más `portada.test.mjs`: el reparto de la portada, Balcarce primero, los cuatro avisos, el encabezado compartido, el clima y la farmacia con un fetch falso y su caída.

## 7. Pendientes del clima y la farmacia

- **Farmacia sin cruce de fuentes.** El sistema viejo cruza el cronograma del Colegio con La Vanguardia y Radio Gabal, completa el turno de hoy si el Colegio no lo trae y avisa discrepancias. El sitio nuevo lee sólo el Colegio: si no trae el día, el cuadro dice que no pudo leerlo. Falta decidir si se suma el cruce.
- **Directorio de direcciones:** nombres de tres palabras o más con «de la» («San José de la Plaza») no se reconocen en la página del Colegio y salen sin dirección (el sistema viejo las completa con La Vanguardia y una lista a mano).
- **Página de farmacias propia** (`/farmacias`, con los próximos días): no existe todavía; mientras tanto el cuadro enlaza al Colegio sólo cuando no puede leer el turno.
- **Lo más leído:** sin datos de lecturas; la columna lateral muestra lo último de Balcarce.

## 8. El corte (radarbalcarce.com pasa a este Worker)

**Qué hace.** Dos rutas de Workers (`radarbalcarce.com/*` y `www.radarbalcarce.com/*` → `radar-sitio`) hacen que el dominio lo sirva este Worker. Las pone y las saca
`scripts/corte.mjs` (API de Cloudflare, workflow «Radar 3.0: corte»: `ver` | `poner` | `sacar`), no el `wrangler.toml`: subir el Worker de nuevo nunca pone ni saca una ruta.
Al poner, también saca las rutas del archivo viejo (`/nota/*` y `/fotos-notas/*` de `radar-balcarce-archivo`) y anota cuáles había. No toca ninguna otra ruta (p. ej. `/r/*`).
Primero pone las del sitio y recién después saca las del archivo; si una ruta del sitio ya es de otro Worker, no hace nada.

**El respaldo al sitio viejo.** El sistema viejo sigue publicándose en `https://radar-balcarce.pages.dev` (variable `ORIGEN_VIEJO`; sin ella o apuntando a radarbalcarce.com no hay respaldo).
Todo lo que este sitio no maneja se le pide allá y vuelve tal cual (estado, encabezados útiles, cuerpo; sin cookies; redirecciones sin seguir; caché corta de 60 s):
`/panel/…`, `/farmacias`, `/clima`, `/dolar`, `/agenda`, `/hoy`, `/llms.txt`, `/agentes/…`, `/compartir/…`, `/escudos/…`, `/tema/…`, `/tablas/…`, el `.txt` de verificación, el manifiesto, los íconos,
`/sitemap-news.xml`… También las **notas que no están en la base** y las **fotos** que R2 no tiene. Lo que este sitio sí sirve (`/`, `/seccion/<x>`, `/nota/…` de la base, `/buscar`, los mapas, `/rss.xml`, `/feed.xml`, `/robots.txt`, `/fotos-notas/` de R2) **nunca** se pide al viejo.
Sólo GET y HEAD. Si el viejo también da 404, el 404 de acá; si no responde o da 5xx, un 502 que no se guarda. El pedido va a `pages.dev` (nunca a radarbalcarce.com) y lleva `x-radar-respaldo`: un pedido con ese encabezado no se reenvía, así no hay bucles.
El `wrangler.toml` lleva `global_fetch_strictly_public` (sin eso, pedirle a otro sitio de Cloudflare desde acá da error 1019).

**También.** `/feed.xml` (la dirección del RSS viejo) sirve el mismo RSS que `/rss.xml`. `www.radarbalcarce.com/<ruta>` da 301 a `https://radarbalcarce.com/<ruta>` (con la consulta); http → https lo hace Cloudflare.
`INDEXAR = "si"`: sin `noindex`, el `robots.txt` abierto y los mapas con `https://radarbalcarce.com`. El núcleo, con `NUCLEO_PUBLICA = "si"`, publica solo.

**Cómo se deshace.** `sacar` en el mismo workflow (un minuto): saca las dos rutas del sitio y devuelve las del archivo viejo (`--archivo=notas,fotos`, `ninguna`…). El dominio vuelve al sitio viejo.
A mano: Cloudflare → Workers → `radar-sitio` → Domains & Routes → borrar las dos rutas. Las notas que el núcleo publicó mientras tanto quedan en la base, pero el sitio viejo no las muestra.
Pruebas: `corte.test.mjs` (respaldo, feed, www, indexación) y `corte-script.test.mjs` (el script con una API falsa).

## 9. Páginas de texto, avisos, AdSense y medición (3/11)

- **Páginas propias:** `/quienes-somos`, `/como-trabajamos`, `/contacto`, `/politica-de-privacidad` y `/publicidad` (`vistas/paginas.mjs`), enlazadas en el pie. La firma de las notas con IA lleva el enlace «Cómo trabajamos».
- **Avisos locales:** tabla `avisos` (`db/schema-sitio.sql`); cuatro lugares (`fijo`, `postales`, `columna`, `pie`, en `vistas/avisos.mjs`); uno al azar por lugar y por armado de página, sin repetir comercio en la misma página; sin avisos, el propio «Tu comercio acá» que lleva a `/publicidad`. Con avisos cargados, portada, secciones y notas duran 5 minutos en caché. Se cargan con `scripts/cargar-aviso.mjs`; manual en `docs/propuestas/MANUAL-AVISOS-3-0.md`.
- **AdSense y Google Analytics, apagados:** variables `ADSENSE_CLIENTE`, `ADSENSE_SLOT_NOTA`, `ADSENSE_SLOT_SECCION` y `GA_ID`. Con alguna aparece el aviso de cookies (cookie propia `radar_cookies`, 6 meses) y Google se carga sólo si el lector aceptó. Con `ADSENSE_CLIENTE`: `/ads.txt` y los bloques (nota, entre el 3.º y el 4.º párrafo, nunca en Policiales; final de las secciones). Sin variables no existe nada de eso.
- **Cloudflare Web Analytics:** `CF_BEACON` (token público); el script va en el `<head>` de todas las páginas y no depende de las cookies.
- **Fotos de la nota:** además de la de portada, las de `nota.fotos` (o `extra.fotos`) se reparten entre párrafos con su epígrafe y crédito.
- Pruebas: `avisos.test.mjs`.
