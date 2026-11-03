# El sitio (`v3/sitio/`, Worker `radar-sitio`)

*Qué hace, en palabras de una persona. Si una regla no está acá, no existe. Etapa C del plan (`docs/propuestas/PLAN-RADAR-3-0.md`, § 3.8).*

## 1. Qué es

Un solo Worker de Cloudflare que arma cada página en el momento, leyendo la base D1 `radar-nucleo` (la misma del núcleo). No hay compilación,
no hay tope de notas ni de archivos: una nota publicada en la base está en el sitio al instante. Para no pegarle a la base en cada visita,
guarda cada página armada unos minutos en la caché de Cloudflare.

## 2. Qué se ve

- **Sólo notas publicadas.** Una nota en `borrador` o `retirada` no existe para el sitio: da 404 aunque se conozca su dirección.
- **La nota** (`/nota/<titular-en-guiones>-<id>`): título, bajada, «En dos líneas», foto con su crédito, cuerpo, los bloques que salen de la
  ficha **sólo cuando hay con qué** (Los datos, Cronología —3 fechas o más—, Cifras, Qué falta saber), la firma (quién la escribió, siempre),
  la fecha, y un desplegable **cerrado** «Fuentes (N)» con el nombre de cada medio y su enlace. No hay análisis ni «qué dicen las fuentes».
- **La dirección es una sola y no cambia.** Lo que cuenta es el id del final. Si llega la dirección con un titular distinto (o sólo el id), se
  redirige a la verdadera. El titular de la dirección se fija la primera vez que la nota se muestra y queda guardado.
- **Las secciones** (`/seccion/<seccion>`, 10 por página, `?pagina=2`): las mismas catorce de siempre.
- **La portada** (`/`) es **provisoria**: las últimas notas con foto. La definitiva la elige Hernán entre las maquetas de `docs/propuestas/tapa-3-0/`.
- **Buscar** (`/buscar?q=`): busca las palabras en título y bajada. No se indexa.
- **Para buscadores y lectores de feeds:** `/sitemap.xml` (índice) y un mapa por mes (`/sitemap-2026-11.xml`), `/rss.xml`, `/robots.txt`.
- **Avisos:** hay un lugar fijo y tres rotativos, vacíos y marcados en el HTML. Los datos de los avisos vienen después.

## 3. Mientras viva en workers.dev

La variable `INDEXAR` vale `no`: todas las páginas llevan `noindex` y `robots.txt` pide que no entre nadie. Se pone en `si` el día del corte,
cuando `radarbalcarce.com` apunte al Worker. Las direcciones canónicas ya dicen `https://radarbalcarce.com/…`.

## 4. El archivo viejo

Todas las notas del sistema viejo (el sitio de hoy, su archivo y las de la redacción) se pasan a la base con **su misma dirección**, para que
Google no pierda nada. Se marcan `origen = 'viejo'`; las del núcleo, `'nucleo'`; las que escribe una persona desde Telegram o el panel, `'redaccion'`.
Las fotos viejas se siguen pidiendo a `radarbalcarce.com/fotos-notas/…` (hay que dejarlas en pie o moverlas a R2 antes de apagar el sitio de hoy).
La migración es de a pocas notas por archivo `.sql`, con `INSERT OR IGNORE`: correrla de nuevo no duplica ni pisa nada.

## 5. Cuánto dura cada cosa en caché

Portada y secciones: 5 minutos. Notas: 1 hora (una corrección tarda hasta una hora en verse, salvo que se purgue). Mapas del sitio: 1 hora. RSS: 10 minutos.
Búsquedas y errores: nada.

## 6. Pruebas

`node --test "v3/sitio/*.test.mjs"` (sin red, con SQLite en memoria): la nota con y sin bloques, 404, borradores ocultos, sección paginada,
mapas, RSS, redirecciones de dirección y la migración con cinco notas reales.
