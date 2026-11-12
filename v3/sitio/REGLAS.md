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
Las fotos de las notas **nuevas** del núcleo guardan la URL del medio de origen y las copia aparte el programa de `radar-fotos` (§ 15: mientras tanto el sitio las sirve por `/foto-nota/<id>.jpg`).

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
`/farmacias`, `/clima`, `/dolar`, `/agenda`, `/hoy`, `/llms.txt`, `/agentes/…`, `/compartir/…`, `/escudos/…`, `/tema/…`, `/tablas/…`, el `.txt` de verificación, el manifiesto, los íconos,
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
- **Para máquinas:** `/llms.txt`, `/agentes/{ultimas,indice,servicios}.json` (CORS abierto, no se indexan), `/sitemap-news.xml` (48 horas), `/sitemap-paginas.xml` (páginas fijas, secciones y eventos; entra en `/sitemap.xml`), `/seccion/<x>/feed.xml`. El `robots.txt` pide no entrar a `/panel`.
- **Direcciones del viejo que se conservan:** `/sitemap-index.xml` y `/sitemap-notas/AAAA-MM/sitemap.xml` (301 a los mapas de acá), `/seccion/<x>-<n>` (301 a `?pagina=n`), `/seccion/servicios` y `/seccion/pais` (301), y las notas que el viejo había unido a otra o retirado (`redirecciones-viejas.mjs`, generado por `scripts/generar-redirecciones.mjs` desde `web/public/_redirects`; 301 a la nota que quedó o a su sección). Una nota que no está en la base ni en esa tabla da **410** con una búsqueda con las palabras del titular: **nunca se le pide al viejo**. Las tarjetas `/…/opengraph-image` dan 404 (la foto de cada página va en su `og:image`). `/tema/…` da 410.
- **Archivos fijos** (`estaticos.mjs`): los escudos, los videos de `/compartir`, los íconos, el manifiesto y el archivo de verificación de Google salen del depósito R2 `radar-fotos` con clave `estaticos/<misma ruta>`. Los sube el workflow «Radar 3.0: desplegar» (opción sitio) desde `web/public/` (los archivos del panel viejo que ese paso todavía sube a `estaticos/panel/` ya no se sirven: `/panel` es el panel nuevo, § 13). Si el depósito no tiene uno, cae al viejo (o 404 propio si `RESPALDO_VIEJO = "no"`).
- **`RESPALDO_VIEJO`** (`wrangler.toml`, hoy `"si"`): con `"no"`, nada sale hacia el sitio viejo: lo que nadie maneja y las fotos que R2 no tiene dan 404 propio. Con `"si"`, sólo van allá las rutas que nadie maneja y los archivos que el depósito no tiene todavía.
- **SEO chico (7/11):** `/.well-known/security.txt` (RFC 9116, `securityTxt` en `vistas/agentes.mjs`; **vence el 7/11/2027, renovar** el `Expires`) y `/security.txt` (301 a ese). Datos estructurados: `/farmacias` y `/clima` llevan un `WebPage` (`paginaLd`; la farmacia de turno como `Pharmacy` sólo si hay datos) y `/quienes-somos` un `AboutPage` con el medio (`organizacionDelMedio`) sin `WebSite`. Pruebas: `marcado.test.mjs` y `cierre.test.mjs`.
- Pruebas: `cierre.test.mjs` (incluye el inventario: ninguna ruta del viejo sale hacia él) y `corte.test.mjs`.

## Nota sin foto: placa de su sección (6/11)

La página de una nota sin foto muestra una placa de su sección (`placaDeNota` en `vistas/nota.mjs`, estilo `.placa-nota`: color y nombre, sólo CSS) en vez de nada; el clima diario no la lleva. Las tarjetas y filas de la portada ya tenían su placa (`imagenODePlaca`). El `og:image` de una nota sin foto sigue siendo el genérico (una imagen por sección pide generar PNG con `scripts/imagen-og.mjs`; no se hizo). Prueba: `portada.test.mjs`.

## 11. El contador propio de lecturas y de avisos (10/11)

**Para qué.** Cloudflare Analytics cuenta robots y Google Analytics sólo mide a quien acepta cookies. Este contador da un número propio de páginas vistas y de cuántas veces se mostró y se tocó cada aviso (para el reporte a un comercio). **Sin cookies y sin datos personales**: no se guarda IP, ni User-Agent, ni ningún identificador; sólo sumas por día (`db/lecturas.mjs`, tablas `lecturas_dia` y `avisos_dia` de `db/schema-sitio.sql`).

- **Qué cuenta.** Un GET con respuesta 200 de tipo HTML, de una página para personas, sin el encabezado `x-radar-respaldo` y que no parezca un robot. No cuentan: `/panel/`, `/admin`, `/agentes/`, `/foto/`, `/fotos-notas/`, `/fuentes/`, `/buscar`, `/csp-reporte`, `/ir/`, feeds, mapas, `robots.txt`, `.txt`, `.xml`, `.json`, ni los 301, 404, 410 o 5xx. Robot = User-Agent vacío o con (bot, crawl, spider, preview, WhatsApp, Telegram, facebookexternalhit, GPTBot, ClaudeBot, Bytespider, Google-InspectionTool, headless, curl, wget, python, etc.: `ROBOTS`) o un pedido `Sec-Purpose`/`Purpose: prefetch`.
- **Qué se anota (por día de Balcarce).** `tipo` (portada, nota, seccion, clima, farmacias, otra), `ruta` (sin consulta, 200 caracteres como mucho), `zona` (de `request.cf`: balcarce, provincia = resto de Buenos Aires, argentina, afuera, **desconocido** si Cloudflare no da el país), `origen` (del Referer: directo, interno, google, facebook, instagram, x, otro-sitio), `aparato` (celular, escritorio; las tablets cuentan como escritorio) y `vistas`. `INSERT … ON CONFLICT DO UPDATE SET vistas = vistas + 1`.
- **Dónde se cuenta.** En `manejar` (`sitio.mjs`), con la respuesta ya armada: así cuenta igual si la página salió de la base o de la caché. Va en `ctx.waitUntil` con try/catch: si D1 falla se pierde ese conteo y la página sale igual. Una vista de cada mil además poda lo de más de 400 días (`podarLecturas`).
- **Interruptor:** `CONTADOR_PROPIO` en `wrangler.toml` (`"si"` por defecto; `"no"` no cuenta nada, ni vistas ni avisos ni clics).
- **Avisos.** La **impresión** se saca del propio HTML que sale (cada `<aside … data-anunciante="id" data-lugar="T1">`), así que vale lo mismo para una página recién armada que para una de la caché, y con los rotativos cuenta el aviso que de verdad se mostró (el que quedó en la página guardada). Los de AdSense (`data-adsense`) y el aviso propio de relleno «Tu comercio acá» (`data-aviso-propio`) no se cuentan. El **clic**: el enlace del aviso apunta a `/ir/aviso/<id>?l=<lugar>`, que suma el clic y redirige (302, `no-store`, `noindex`) a la dirección **guardada en la base** (aviso activo, dentro de sus fechas, con https); jamás a una que venga en el pedido; inexistente, vencido, apagado o sin enlace, 404. Los robots son redirigidos pero no suman. El enlace lleva `rel="sponsored nofollow noopener"`; `/ir/` está bloqueado en `robots.txt`.
- **Leerlo:** `node v3/sitio/scripts/lecturas.mjs [--dias=7]` (con `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`; sólo lee): vistas por día, por tipo, zona, origen y aparato, las 10 notas más leídas y los avisos con sus impresiones y clics. Las consultas están en `db/lecturas.mjs` (`vistasPorDia`, `vistasPor`, `notasMasLeidas`, `avisosEntre`).
- **Para tener en cuenta:** es una medición propia, no la de Google ni la de Cloudflare: los números no van a coincidir. Un robot con User-Agent de navegador cuenta como persona (no hay forma barata de distinguirlo). Una vista = un pedido a la página; recargar suma.
- Pruebas: `contador.test.mjs`.

## 12. Las fotos siempre por https (10/11)

Algunas notas guardan la foto del medio de origen con `http://…` y el navegador la bloquea o la degrada. Todas las direcciones de foto pasan por `aNota` (`db/consultas.mjs`) antes de llegar al HTML (img, `og:image`, datos estructurados), y ahí `conFotoHttps` (`util.mjs`) convierte `http://` en `https://` (foto de portada, `chica`, `fotos` y `fotosEnCuerpo`). No toca las propias (`/foto/…`, `/fotos-notas/…`). Prueba: `contador.test.mjs`.

## 13. El panel (`/panel`, 11/11)

**Qué es.** Una página privada para Hernán, pensada para el celular, en `https://radarbalcarce.com/panel`: la lista de notas y, en cada una, lo mismo que hacen los comandos del bot
(`/corregir`, `/seccion`, `/ocultar`, `/mostrar`, `/retirar`, `/redes`, `/repaso`, `/menciones`, `/foto`), con la misma forma de escribir en la base. Reemplaza al panel del celular viejo,
que ya no se sirve (lo que el despliegue todavía sube a `estaticos/panel/` en R2 queda sin uso). Código: `panel.mjs` (sesión, base, depósito) y `vistas/panel.mjs` (el HTML); sin JavaScript
salvo el «¿seguro?» de Retirar; nada de afuera.

**Cómo se entra (sin secretos nuevos).**
1. En Telegram, `/panel` al bot: da un enlace `https://radarbalcarce.com/panel/entrar?t=<token>` que **sirve una vez y vence en 15 minutos** (el mensaje sale sin vista previa).
2. El enlace abre una página con el botón «Entrar al panel» (un `POST`: así ningún programa que sólo mire el enlace lo gasta). Al tocarlo, el enlace queda usado y se abre una sesión de
   **30 días**: cookie `panel` (`Path=/panel; HttpOnly; Secure; SameSite=Strict`). Un enlace usado, vencido o inventado dice que se pida otro.
3. Sin sesión, cualquier `/panel/…` muestra «pedí /panel al bot» (200, `noindex`) y ningún dato. «Salir» (`POST /panel/salir`) borra la sesión.
- **En la base sólo quedan huellas SHA-256** (hex) de los tokens: `panel_accesos (token, vence, usado)` y `panel_sesiones (token, creada, vence, ultima)`, en `db/schema-sitio.sql`
  (el bot también crea `panel_accesos`, por si se sube antes). Al entrar se borran las sesiones vencidas y los enlaces de más de un día.
- **CSRF:** todo cambio es un `POST` con el campo oculto `csrf` = SHA-256 de `csrf:<token de la sesión>`; si no coincide, 403 y no se cambia nada. Más `SameSite=Strict`.
- **Cabeceras:** toda respuesta del panel lleva `cache-control: no-store`, `x-robots-tag: noindex, nofollow`, `x-frame-options: DENY`, `referrer-policy: no-referrer` y una CSP estricta
  (`CSP_PANEL`: sólo lo propio, fotos de cualquier https, sin marcos, formularios sólo acá). El panel se atiende **antes** que la caché pública y que el contador: nunca se guarda ni se cuenta.

**Qué se ve y qué se cambia.**
- **`/panel`:** las notas (todas menos los borradores), de la más nueva a la más vieja, 50 por página (`?p=2`), con foto chica (o el color de la sección), título, sección, estado y fecha.
  Filtros: título (`?q=`), estado (publicada, oculta, retirada), sección (las 14 del sitio) y origen (propias = `origen = 'redaccion'`, automáticas).
- **`/panel/nota/<id>`:** la vista (título, bajada, portada) con el enlace a la nota pública, y cuatro formularios. Después de cada uno vuelve a la nota con un aviso arriba
  (`?ok=…` o `?error=…`; sólo se muestran textos fijos).
  - **Texto** (`…/texto`): título (3 a 300), bajada (hasta 600), cuerpo (párrafos separados por una línea en blanco; se guarda como lista JSON en `notas.cuerpo`) y sección (una de las 14).
    Cada cambio de título, bajada o cuerpo se anota en `ficha.correcciones[]` (`cuando`, `campo`, `antes`, `despues`, `por: "Hernán (panel)"`), como `/corregir`. **La dirección no cambia:**
    si la nota todavía no tenía su titular fijado en `sitio_notas`, se fija con el de antes de cambiar el título.
  - **Estado** (`…/estado`): Ocultar (de publicada a `oculta`, no toca `no_publicar`), Mostrar (sólo desde oculta) y Retirar (pide motivo, hasta 300; `estado = retirada` y
    `no_publicar = {motivo, cuando, por}`), igual que el bot.
  - **Redes** (`…/redes`): casillas posteo, historia y reel (son la `lista` que se quiere: reemplazan a la anterior; desde el 11/11 no hay carrusel de nota propia, sólo el del domingo), «Al próximo repaso» y las menciones. Si se suma un formato que
    no estaba: `forzada: true` y `pedida` (como `/redes`); repaso marcado y antes no: `repaso: true` y `pedida` (como `/repaso`; desmarcado se saca); siempre `confirmada: true` y `eleccion`;
    menciones con `@` y `@radarbalcarce` al final (vacío las saca), como `/menciones`. Pedir algo nuevo sólo vale para una nota publicada y sin freno; sacar, siempre. Debajo, lo que ya salió
    (tabla `publicaciones` de las redes, si existe).
  - **Fotos** (`…/fotos`): las que tiene, con su crédito; se elige la de portada, se cambia el crédito (vacío deja el que estaba) y se saca una (sin ninguna, `foto = NULL`). Subir: hasta 10 por
    nota, 8 MB cada una, sólo JPG, PNG o WEBP **por sus primeros bytes**; si una no sirve no se sube ninguna. Van al depósito `FOTOS` como `fotos-notas/redaccion-<id>-p<sello>-<n>.<ext>`
    (el sitio las sirve en `https://radarbalcarce.com/fotos-notas/…`) y se suman al final de `notas.foto` (lista; la primera es la portada) con `{url, credito, alt: título}`. No se achican.
- Después de cada cambio se borra de la caché de Cloudflare (la de ese centro de datos) la página de la nota, la portada y su sección; en los demás, la nota se ve como mucho a los 5 minutos.
- Pruebas: `panel.test.mjs` (entrada, enlace gastado y vencido, cookie, sin sesión, CSRF, cabeceras, texto y escape, sección, estado, redes, fotos con depósito falso, filtros, salir) y la de `/panel`
  en `v3/redaccion/telegram/administrar.test.mjs`.

## 14. La nota de «Un día como hoy» (12/11)

- Se reconoce por `ficha.efemerides.hechos` (`esEfemerides`, `vistas/efemerides-nota.mjs`). Reemplaza al cuerpo de párrafos por una línea del tiempo que se anima y las historias iguales (año, título, texto, tres datos y foto con crédito o placa); sin foto principal aparte, sin «En dos líneas» ni «Los datos».
- Sólo CSS (sin JavaScript); con «reducir movimiento» queda quieta. Los años de la línea se escalonan para que no se pisen. Va con `noindex` (`ficha.indexar = false`).

## 15. Ninguna foto del otro medio en el HTML, y las imágenes en el mapa (12/11, Hernán: «todas las fotos se deberían bajar y hacer bien el SEO»)

- **Qué pasaba.** La copia propia (`/foto/<huella>.jpg`) la hace un programa aparte en GitHub (`scripts/copiar-fotos-de-notas.mjs`, ffmpeg) cada 2 horas a los :40 y sólo si `FOTOS_PROPIAS_ACTIVAS` = si (60 por corrida, 3 horas entre reintentos).
  Una nota recién publicada mostraba hasta ~2 horas la dirección del otro medio (el 12/11, 5 de 26 imágenes de la portada: radiogabal, La Vanguardia, La Nación, Perfil, balcarce.gob.ar). Copiar al elegir la foto no se puede dentro del núcleo (el Worker no corre ffmpeg).
- **Qué hace el sitio ahora** (`foto-proxy.mjs`, `fotoParaMostrar` en `db/consultas.mjs`). Sin copia propia, la foto de portada de una nota sale como `https://radarbalcarce.com/foto-nota/<id>.jpg` (img, tarjetas, `og:image`, NewsArticle, RSS, mapas); la ruta
  baja la foto de la fuente UNA vez (RadarBalcarceBot, sin cabeceras de navegador, sólo la dirección guardada en esa nota publicada, pública y con tope de 8 MB; imagen comprobada por los bytes), la guarda un día en la caché de Cloudflare y la sirve con nuestra dirección.
  Con copia propia ya hecha, la nota usa `/foto/<huella>.jpg` y esa ruta redirige (301) a la copia. Si el medio niega la foto, redirige (302, 5 minutos) a la original: nunca una imagen rota (único hotlink que queda, y sólo si la fuente no nos deja bajarla). Crédito, epígrafe y alt no cambian.
  Por qué proxy y no placa: la placa le quitaría la foto a toda nota nueva durante horas; el proxy no cambia lo que ve el lector y saca la dirección ajena del HTML. Los filtros de marca de agua, menores y víctimas son los del núcleo (la foto elegida no cambia).
- **Mapa del sitio.** `sitemap-AAAA-MM.xml` declara `xmlns:image` y cada `<url>` lleva `<image:image><image:loc>` con la imagen de portada tal como se muestra (copia propia o `/foto-nota/`) y `<image:title>` con el crédito si mide 160 o menos (`imagenDeMapa`, `vistas/xml.mjs`). Sin foto, sin imagen.
- **Lo que no cubre.** Las fotos de adentro de la nota (`fotos`, `fotosEnCuerpo`) siguen con su dirección. `/foto-nota/` pasa por la caché de Cloudflare pero no es R2: una foto que la fuente borra después de un día se pierde hasta que el programa de copias la guarde.
- **Propuesta (no hecha): nombre legible.** Hoy `/foto/<huella24>.jpg`. Para SEO sería `/foto/<slug>-<huella24>.jpg`: el Worker leería sólo la huella del final (`/([0-9a-f]{24}(?:-640)?)\.jpg$/`) y pediría `copias/<huella>.jpg` (las copias hechas siguen valiendo y la caché también); `urlDeCopia(huella, chica, base, slug)` agregaría el slug y
  `conCopiaPropia` lo armaría con el título de la nota (no hay que tocar R2). Riesgo: las URLs ya publicadas en Google cambiarían (habría que dejar las viejas sirviendo, lo que ya pasa), y la huella pasa a nombrar dos rutas. Valor chico (Google usa `alt` y el texto de la nota más que el nombre); queda para después.
- **Pruebas:** `foto-proxy.test.mjs` (proxy, seguridad, caché, mapa con imágenes).
