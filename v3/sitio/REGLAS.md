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
- **Directorio de direcciones:** lo que el Colegio nombra en el cronograma y no lista en su directorio («San José Plaza») se completa con `FARMACIAS_A_MANO` (`datos-del-dia.mjs`, 7/11); una farmacia nueva que no esté en ninguno de los dos sale sin dirección hasta sumarla ahí.
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

- **Páginas propias:** `/quienes-somos`, `/como-trabajamos`, `/contacto`, y `/politica-de-privacidad` (`vistas/paginas.mjs`), enlazadas en el pie junto con `/publicidad`. **`/publicidad` no es una página: redirige (301) a la nota del media kit** (`/nota/publicita-en-radar-balcarce-mediakit`, `RUTA_MEDIA_KIT`), una nota propia firmada «Hernán Accomo» que cuenta los planes y precios de noviembre y diciembre de 2026; la página no muestra precios. El texto y su SQL salen de `scripts/nota-media-kit.mjs` (`node v3/sitio/scripts/nota-media-kit.mjs` arma `scripts/salida/nota-media-kit.sql` y `docs/propuestas/NOTA-MEDIA-KIT.md`; el SQL se corre **antes** de desplegar el redirect, si no `/publicidad` da 404). La firma de las notas con IA lleva el enlace «Cómo trabajamos».
- **Avisos locales:** tabla `avisos` (`db/schema-sitio.sql`); cuatro tipos de lugar (`fijo`, `postales`, `columna`, `pie`, en `vistas/avisos.mjs`) con **nombre propio por página** (`NOMBRES_DE_LUGARES`, `data-lugar` en el HTML): tapa T1 fijo, T2 postales, T3 columna, T4 pie; nota N1 arriba y N2 pie; sección S1 fijo y S2 pie; las demás páginas P1 pie; AdSense A1 (en la nota) y A2 (al final de la sección). **En una nota hay un solo aviso local**: N1 si hay un comercio fijo cargado (`hayFijo`) y, si no, N2; el de AdSense va en el medio (Hernán, 3/11); uno al azar por lugar y por armado de página, sin repetir comercio en la misma página; sin avisos, el propio «Tu comercio acá» (con «Espacio T1», etc., en letra chica, sin precios) que lleva a la nota del media kit. Con avisos cargados, portada, secciones y notas duran 5 minutos en caché. Se cargan con `scripts/cargar-aviso.mjs`; manual en `docs/propuestas/MANUAL-AVISOS-3-0.md`.
- **AdSense y Google Analytics, apagados:** variables `ADSENSE_CLIENTE`, `ADSENSE_SLOT_NOTA`, `ADSENSE_SLOT_SECCION` y `GA_ID`. Con alguna aparece el aviso de cookies (cookie propia `radar_cookies`, 6 meses) y Google se carga sólo si el lector aceptó. Con `ADSENSE_CLIENTE`: `/ads.txt` y los bloques (nota, entre el 3.º y el 4.º párrafo, nunca en Policiales; final de las secciones). Sin variables no existe nada de eso.
- **Cloudflare Web Analytics:** `CF_BEACON` (token público); el script va en el `<head>` de todas las páginas y no depende de las cookies.
- **Fotos de la nota:** además de la de portada, las de `nota.fotos` (o `extra.fotos`) se reparten entre párrafos con su epígrafe y crédito.
- Pruebas: `avisos.test.mjs`.

## 10. El cierre del sitio viejo (3/11)

**Objetivo:** que `radar-balcarce.pages.dev` no sirva nada y se pueda apagar. Todo lo que servía pasó a este Worker.

- **Páginas nuevas** (`vistas/cierre.mjs`): `/agenda` y cada evento (`/agenda/<nombre>-muniNNNN`, con `.ics`, datos para Google, la fiesta suspendida avisada), `/hoy`, `/util` (teléfonos), `/tablas` con `/tablas/liga-profesional` y `/tablas/formula-1`, `/compartir` (no se indexa) y la página «ya no está» (410).
- **La agenda** sale **sólo del municipio** (API de balcarce.gob.ar, `agenda.mjs`), se lee en el momento y se guarda 30 minutos en la caché. Si no contesta, la agenda lo dice y no se guarda; la página de un evento da 503 (no 410). Un evento que ya terminó da 410 (la API sólo trae lo que viene). Los suspendidos a mano están en `AGENDA_SUSPENDIDOS` (`agenda.mjs`, con motivo, cuándo y quién); `eventos.mjs` es copia de `web/lib/eventos.js`. Las fichas de eventos ya no guardan nada: no hay lista de eventos pasados.
- **Las tablas** se piden en el momento a ESPN y Jolpica (`tablas.mjs`), una hora de caché; sin respuesta, la página lo dice.
- **Para máquinas:** `/llms.txt`, `/agentes/{ultimas,indice,servicios}.json` (CORS abierto, no se indexan), `/sitemap-news.xml` (48 horas), `/sitemap-paginas.xml` (páginas fijas, secciones y eventos; entra en `/sitemap.xml`), `/seccion/<x>/feed.xml`. El `robots.txt` pide no entrar a `/panel/`.
- **Direcciones del viejo que se conservan:** `/sitemap-index.xml` y `/sitemap-notas/AAAA-MM/sitemap.xml` (301 a los mapas de acá), `/seccion/<x>-<n>` (301 a `?pagina=n`), `/seccion/servicios` y `/seccion/pais` (301), y las notas que el viejo había unido a otra o retirado (`redirecciones-viejas.mjs`, generado por `scripts/generar-redirecciones.mjs` desde `web/public/_redirects`; 301 a la nota que quedó o a su sección). Una nota que no está en la base ni en esa tabla da **410** con una búsqueda con las palabras del titular: **nunca se le pide al viejo**. Las tarjetas `/…/opengraph-image` dan 404 (la foto de cada página va en su `og:image`). `/tema/…` da 410.
- **Archivos fijos** (`estaticos.mjs`): el panel del celular (`/panel/`, con su CSP propia y `noindex`), los escudos, los videos de `/compartir`, los íconos, el manifiesto y el archivo de verificación de Google salen del depósito R2 `radar-fotos` con clave `estaticos/<misma ruta>`. Los sube el workflow «Radar 3.0: desplegar» (opción sitio) desde `web/public/`. Si el depósito no tiene uno, cae al viejo (o 404 propio si `RESPALDO_VIEJO = "no"`).
- **`RESPALDO_VIEJO`** (`wrangler.toml`, hoy `"si"`): con `"no"`, nada sale hacia el sitio viejo: lo que nadie maneja y las fotos que R2 no tiene dan 404 propio. Con `"si"`, sólo van allá las rutas que nadie maneja y los archivos que el depósito no tiene todavía.
- **SEO chico (7/11):** `/.well-known/security.txt` (RFC 9116, `securityTxt` en `vistas/agentes.mjs`; **vence el 7/11/2027, renovar** el `Expires`) y `/security.txt` (301 a ese). Datos estructurados: `/farmacias` y `/clima` llevan un `WebPage` (`paginaLd`; la farmacia de turno como `Pharmacy` sólo si hay datos) y `/quienes-somos` un `AboutPage` con el medio (`organizacionDelMedio`) sin `WebSite`. Pruebas: `marcado.test.mjs` y `cierre.test.mjs`.
- Pruebas: `cierre.test.mjs` (incluye el inventario: ninguna ruta del viejo sale hacia él) y `corte.test.mjs`.

## Nota sin foto: placa de su sección (6/11)

La página de una nota sin foto muestra una placa de su sección (`placaDeNota` en `vistas/nota.mjs`, estilo `.placa-nota`: color y nombre, sólo CSS) en vez de nada; el clima diario no la lleva. Las tarjetas y filas de la portada ya tenían su placa (`imagenODePlaca`). El `og:image` de una nota sin foto sigue siendo el genérico (una imagen por sección pide generar PNG con `scripts/imagen-og.mjs`; no se hizo). Prueba: `portada.test.mjs`.
