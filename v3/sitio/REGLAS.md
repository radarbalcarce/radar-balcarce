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

## 3. Mientras viva en workers.dev

La variable `INDEXAR` vale `no`: todas las páginas llevan `noindex` y `robots.txt` pide que no entre nadie. Se pone en `si` el día del corte,
cuando `radarbalcarce.com` apunte al Worker. Las direcciones canónicas ya dicen `https://radarbalcarce.com/…`.

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
