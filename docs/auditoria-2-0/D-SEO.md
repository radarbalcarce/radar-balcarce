# Módulo D: SEO y visibilidad en buscadores y asistentes de IA

*Auditoría del 24/10/2026. Sólo lectura: se miró `radarbalcarce.com` con `curl` (sólo GET) y el código/docs del repositorio (`docs/seo/AUDITORIA-SEO-LLM.md` del 16 y 17/10, `PENDIENTES.md`, `IDEAS.md`, `docs/DECISIONES.md`). No se pudo mirar Search Console ni Bing (no son públicos): todo lo que dependa de ellos está marcado "sin dato".*

## Resumen en diez líneas

1. **La base técnica sigue sana y mejoró**: HTML estático rápido (nota = 68 KB crudo, 14 KB con Brotli), canónico propio en cada página, `robots.txt` con política de bots de IA, tres sitemaps, `NewsArticle` completo, RSS, `llms.txt`, `/agentes/*.json` e IndexNow, todo contestando 200.
2. **Lo que pasó desde la auditoría del 16/10**: la tarjeta de compartir bajó de 343 KB a unos 47 KB (C1 resuelto), los títulos van enteros (B3) y el autor es sólo "Radar Balcarce" (B4). Lo medido hoy coincide con lo que el doc dice haber hecho.
3. **El mayor hallazgo nuevo: el tope de notas (500) achicó el sitemap de 1.245 a 556 direcciones** (493 notas). Las notas viejas siguen vivas (probé una del 6/10: 200, bien armada, con foto y `NewsArticle`), pero **salieron del sitemap**, no tienen "Seguí leyendo" y su imagen para compartir es la genérica del sitio. Google puede seguir rastreándolas, pero ya no se las ofrecemos: es una pérdida de SEO silenciosa que va a crecer todos los días (A1).
4. **El riesgo de fondo no cambió**: es un medio que reescribe con IA lo que publican otros; la política de Google contra contenido a escala sigue siendo el peligro mayor. Esto no se puede resolver sin datos de Search Console, y **nadie los mira todavía** (la decisión del 12/10 fue "SEO después de la renovación"; la renovación ya está hecha).
5. **Regla 307 (sin "fuente principal" suelta)**: SEO neutro a favorable, con un detalle. El desplegable "Fuentes (N)" está en el HTML (`<details>` con los enlaces reales, rastreables, sin `nofollow`), así que Google ve todas las fuentes. Pero el marcado `isBasedOn` sigue apuntando a una sola fuente (la primera) y `citation` lista sólo nombres, sin enlace; y `/quienes-somos` todavía dice "enlaza a la nota original justo debajo del texto", que ya no es cierto.
6. **E-E-A-T**: hay "Quiénes somos y cómo trabajamos", "Contacto y correcciones", política de privacidad, firma "Redacción asistida con IA" en cada nota. Faltan lo que piden Google Noticias y los evaluadores: **apellidos o responsable legal**, **registro público de correcciones** (`/correcciones` da 404) y una dirección/figura jurídica.
7. **Notas sin foto con placa**: no dañan el índice (tienen texto, título, canónico), pero en esas notas el marcado sólo declara la tarjeta con el titular (PNG de 1200x630, sin foto), que es lo que Discover evita. Cuantas más placas, menos chances en Discover/Imágenes.
8. **Ventana de 36 h**: sólo afecta a la portada; las notas conservan su página. No es un problema de SEO en sí. Lo sensible es el sitemap de noticias (48 h, 104 URL: correcto) y que la portada cambie siempre (bien para rastreo).
9. **SEO local**: Google Business Profile no corresponde (no hay local con atención al público); lo local lo sostienen `areaServed`, `contentLocation`, `/farmacias`, `/clima`, `/agenda`, `/util`. Lo que falta son enlaces desde sitios de Balcarce y las páginas de entidad (`/tema/*` hoy dan 404).
10. **Hacer ya**: (a) sitemap del archivo en R2, (b) corregir el texto de "Quiénes somos", (c) `/correcciones` y datos del responsable, (d) arrancar la rutina de Search Console y Bing (una persona). El resto puede esperar al lanzamiento.

---

## 1. Inventario de lo anotado sobre SEO/LLM

Fuente principal: `docs/seo/AUDITORIA-SEO-LLM.md` (rondas del 16 y 17/10). Revisé también `PENDIENTES.md`, `IDEAS.md` y `docs/DECISIONES.md`.

### Hecho (confirmado hoy en el sitio)

| Cosa | Evidencia de hoy |
|---|---|
| `robots.txt` con `Content-Signal`, bots de IA en dos grupos, `Disallow: /panel/`, tres `Sitemap:` | `curl /robots.txt` |
| `sitemap.xml`, `sitemap-news.xml` (48 h, `<news:news>` con idioma y fecha real), `sitemap-index.xml` | los tres devuelven 200 |
| `NewsArticle` con titular, bajada, `articleBody`, fechas con zona, sección, `publisher` con logo, `author`, `citation`, `isBasedOn`, `wordCount`, palabras clave | nota real `.../leonel-jaime-...-6bgesn` |
| `NewsMediaOrganization` con políticas, contacto, `sameAs` y `WebSite` | todas las páginas |
| `BreadcrumbList` en notas; `CollectionPage` + `ItemList` en secciones | páginas de sección |
| Título entero en la nota y descripción de ~160 caracteres (D5) | `<title>` de la nota = titular sin "…" |
| Títulos de sección con intención ("Fútbol de Balcarce y de Argentina · Radar Balcarce") | `/seccion/futbol` |
| `lang="es-AR"`, `og:locale es_AR`, sin `hreflang` (no hace falta) | HTML |
| Open Graph y Twitter Card completos en notas (imagen 1200x630 con `alt`, `article:*`) | HTML |
| Un solo dominio: `http`, `www` -> 301 a `https://radarbalcarce.com/`; barra final -> 308; 404 real | `curl -I` |
| Id corto `/nota/ID` -> 301 a la dirección completa | probado con 3 ids |
| RSS `/feed.xml` (50 ítems, autodescubrible en `<head>`) | 200 |
| `llms.txt` (cómo citar, secciones, servicios, datos para programas) | 200 |
| `/agentes/ultimas.json` (60 notas), `indice.json` (493), `servicios.json` | 200, caché 5 min |
| IndexNow: clave publicada | `/0776b1b2...txt` da 200 |
| Tarjeta para compartir liviana (C1) | `opengraph-image` de una nota = 47 KB |
| `/hoy`, `/quienes-somos`, `/contacto` con título, descripción y canónico propios | 200 |
| Velocidad: HTML de portada 110 KB, nota 68 KB; un solo `h1` por página | medido |
| Desplegable "Fuentes (N)" con los enlaces en el HTML (rastreable) | `<details class="fuentes-nota">` con `<a href>` a Olé, TyC, etc. |

### Pendiente (anotado y no hecho)

- **Search Console semanal, Bing Webmaster (importar), "AI Performance" de Bing**: de ustedes. En `PENDIENTES.md` (renglones 80 y 132) figura "después de la renovación"; no hay fecha.
- **Google Publisher Center / Fuentes preferidas (D7)**: sin decidir. `IDEAS.md` #9 todavía dice "trámite manual"; la línea 782 de `IDEAS.md` dice que Google Noticias ya no tiene alta, entonces las dos notas se contradicen.
- **D2: indexar sólo lo de Balcarce y lo respaldado**: se iba a decidir "en 4 semanas" con datos de Search Console. No hay datos, así que no se decidió.
- **D6 / `IDEAS.md` #21: `/correcciones` público y "quién escribe" con responsables**: no existe (`/correcciones` = 404; la página dice que hoy no hay registro).
- **D8: datos legales del medio**: sin decidir.
- **Páginas de entidad/tema (`MOSTRAR_TEMAS = false`)**: `/tema/autodromo` da 404; `IDEAS.md` #24 y #41 lo siguen pidiendo, y el doc del 17/10 lo deja "cuando haya volumen".
- **`IDEAS.md` #12 (`/util` como página de emergencias)** y **#22 (guías que quedan)**: sin hacer.
- **Cloudflare**: confirmar que no estén activos el bloqueo de IA ni el "robots.txt administrado" (pisaría `ai-train=yes`); mirar "AI Crawl Control".
- **Fotos en WebP y varios tamaños**: esperando R2 para fotos.
- **Revisar el informe cada 3 meses**: nadie lo agendó.

### Obsoleto o que cambió

- **Cifras de `AUDITORIA-SEO-LLM.md`** (1.245 URL en el sitemap, 278 KB, "180 días / 3.700 notas, después 404", "58% de lo indexable es de afuera"): ya no son ciertas. Hoy el sitemap tiene 556 URL (130 KB), el tope es de 500 notas en el sitio y el resto está en R2 (ver 2.5). El doc debería actualizarse.
- **"El archivo en R2, todavía sin activar"** (sección 2.1): ya está activo (las notas viejas se sirven con 200).
- **El MCP**: descartado y el Worker borrado (decisión del 17/10). Correcto que `llms.txt` ya no lo menciona.
- **Texto de `/quienes-somos`**: dice que cada nota "enlaza a la nota original justo debajo del texto". Desde la regla 307 (24/10) eso ya no se hace; ahora sólo está el desplegable.
- **`CLAUDE.md`**: dice que "la página dura 180 días en teoría, el tope es de 3.700 notas". Para el SEO lo cierto hoy es 500 en el sitio + R2.

### Lo que se perdió de la lista

- La **decisión D2 con fecha** (4 semanas desde el 16/10, o sea cerca del 13/11) no está en `PENDIENTES.md`, sólo en el doc de SEO.
- **D1 (¿dejar que las IA se entrenen con el sitio?)**: sigue con "hoy sí" por defecto; no hay registro de que Hernán lo haya decidido a conciencia.
- **El aviso de enero de 2027** para volver a mirar si hace falta un MCP: no está en `PENDIENTES.md`.
- **El trámite de los canales** (WhatsApp, Telegram, Bluesky: variables `*_CANAL_URL`): no figura en `PENDIENTES.md`; el `sameAs` del sitio sólo lista Instagram y Facebook.
- **Wikidata y Bing Places** ("qué conviene hacer en su lugar", 5.0 punto 7): quedó sólo en un párrafo de la auditoría.
- **Enlaces desde sitios de Balcarce** (plan paso 10: "el que más mueve en SEO local"): no está en ninguna lista de tareas.

---

## 2. Verificación contra el sitio publicado (24/10/2026)

### 2.1 `robots.txt`, sitemaps, `llms.txt`, `/agentes`

- **`robots.txt`**: bien. `User-agent: *` permite todo salvo `/panel/`; buscadores de IA y entrenamiento en grupos aparte; declara `sitemap-index.xml`, `sitemap.xml` y `sitemap-news.xml`.
- **`sitemap.xml`**: 556 `<loc>`: 493 notas, 13 páginas fijas (portada, `/hoy`, servicios, tablas, institucionales) y el resto páginas de sección (hasta 7 páginas por sección). 66 entradas llevan foto (sitemap de imágenes). Pesa 130 KB.
- **`lastmod`**: se actualiza. Las notas llevan la fecha de la nota (de 22/9 a 24/10), los servicios la hora de la última compilación (04:02Z) y portada, `/hoy` y secciones la hora de la última nota (02:06Z). Es coherente. Detalle menor: el índice dice 04:02Z y la portada 02:06Z; no daña.
- **`sitemap-news.xml`**: 104 notas de las últimas 48 h, con `publication_date` real y título. Cumple la guía de Google. Incluye los repasos ("El repaso de la noche"), que son piezas propias de poco texto: conviene confirmar que tengan cuerpo suficiente.
- **`sitemap-index.xml`**: apunta a los otros dos. Bien.
- **`llms.txt`**: 3,4 KB, bien armado. `/llms-full.txt` no existe (decisión correcta).
- **`/agentes/*.json`**: los tres andan, con `generado`, `como_citar`, `correcciones` y `quienes_somos`. `indice.json` tiene 493 filas y pesa 255 KB (cada vez que se hace la compilación se regenera; ver 2.5).
- **IndexNow**: archivo clave publicado (200). No se puede verificar que los avisos lleguen a Bing sin su panel.

### 2.2 Metadatos de cada tipo de página

| Página | `<title>` | Descripción | `h1` | Canónico | Veredicto |
|---|---|---|---|---|---|
| Portada | "Radar Balcarce · Noticias de Balcarce, clima y farmacia de turno" | Útil y con intención | Uno, visible sólo para lectores de pantalla (`solo-lectores`) | `https://radarbalcarce.com` | Bien |
| Sección `/seccion/futbol` | "Fútbol de Balcarce y de Argentina · Radar Balcarce" | "…: {último titular}." | "Fútbol" | propio | Bien |
| Sección página 2 | "… · página 2 · Radar Balcarce" | igual con "(página 2)" | "Fútbol" | propio (`futbol-2`) | Bien. Las páginas 2 a 7 entran al sitemap con prioridad 0,4 |
| Nota | Titular entero | Bajada (~160 caracteres) | Titular | propio | Bien |
| `/hoy` | "Lo de hoy en Balcarce · sábado 24 de octubre · Radar Balcarce" | Con el día | Uno | propio | Bien |
| `/quienes-somos`, `/contacto` | propios | propias | Uno | propio | Bien |

Hallazgos finos:
- La descripción de las secciones usa el **último titular, que puede no tener nada que ver con la sección**: Policiales muestra "Gonzalo Santamarina analiza la seguridad vial y la salud en Tandil". Mejorar: una frase fija por sección y, a lo sumo, un titular al final.
- `/seccion/politica-8` da 404: correcto (las páginas sólo existen si hay notas).
- Open Graph y Twitter completos. La imagen de la nota es `/nota/<slug>/opengraph-image` (PNG con el titular).

### 2.3 JSON-LD de una nota real

Nota: `leonel-jaime-frena-el-juego-por-un-rival-y-rompe-en-llanto-6bgesn`. Tres bloques:
1. **Medio y sitio**: `NewsMediaOrganization` + `WebSite`. Completo (políticas, contacto, logo 512, `areaServed`, `masthead`, `ownershipFundingInfo`). `sameAs`: Instagram y Facebook (la dirección de Facebook es `profile.php?id=61594865361170`, distinta del ID de la API; es la pública, no hay error, pero conviene confirmar que sea la página y no un perfil).
2. **`NewsArticle`**: `headline`, `description`, `articleBody` (175 palabras), `datePublished` y `dateModified` con zona (`Z`), `articleSection`, `inLanguage es-AR`, `isAccessibleForFree`, `publisher` con logo, `author` Organization "Radar Balcarce" con URL a "Quiénes somos", `publishingPrinciples`, `citation` con 3 medios (sólo nombre), `isBasedOn` con **una** URL y `keywords`. Cumple lo que pide Google para `Article`.
   - **Observación**: `image` es sólo la tarjeta PNG (la nota no tiene foto, tiene placa). En una nota archivada con foto (INTA, 18wosri) el marcado trae la foto con 1200x802, `caption` y `creditText`, más la tarjeta. Es correcto.
   - **Con la regla 307**: conviene que `citation` lleve también la URL de cada fuente (hoy son nombres), y que `isBasedOn` sea una lista con todas, no una sola. Así el marcado dice lo mismo que el desplegable.
   - Nota publicada a las 00:47Z con `dateModified` igual: bien, no rejuvenece.
3. **`BreadcrumbList`**: Portada > Sección > Nota.

### 2.4 Enlaces internos, imágenes, velocidad

- **Portada**: 51 enlaces a notas, 14 `h2`, sólo 5 `<img>` (el resto son placas SVG). 110 KB crudo.
- **Nota**: 67 enlaces internos (menú, pie, "Seguí leyendo"), sin `<img>` cuando usa placa.
- **Nota archivada en R2**: 26 enlaces internos y **sin "Seguí leyendo"**: menos enlaces hacia dentro del sitio.
- **Pie del sitio**: enlaza a las 14 secciones, "Lo de hoy", servicios y las 3 páginas institucionales en cada página. Bien para el rastreo.
- **Fuentes**: el `<details>` se entrega con el contenido ya en el HTML (no se carga con JavaScript), así que lo ve cualquier buscador. Los enlaces salen con `target=_blank rel="noopener noreferrer"` y sin `nofollow`.
- **Peso**: cabecera de caché `max-age=300, s-maxage=3600` en la nota archivada. La tarjeta de compartir de la nota (47 KB) está muy por debajo del tope de WhatsApp.

### 2.5 Tope de 500 notas y el resto en R2: qué pasa con su SEO

Lo medido:
- El sitio ofrece **493 notas**; la más vieja del índice es del 22/9 (la del autódromo, que se conserva a propósito). El mes de octubre solo tiene 789 notas en `web/data/historico/2026-10.json`; **más de 300 de octubre ya no están en el sitio compilado**.
- Una nota fuera del tope (`el-inta-rafaela-...-18wosri`, 6/10): **200**, `index, follow`, canónico propio, `NewsArticle` con foto y crédito, desplegable de fuentes. El id corto (`/nota/1sxk7mg`) redirige 301 a la dirección completa. Una dirección inventada da 404 real.
- Pero: **no está en `sitemap.xml`** (`grep` por su id = 0), **tampoco en `agentes/indice.json`**, su `og:image` es la tarjeta genérica del sitio (`/opengraph-image`) y la de la nota da 404, y no tiene "Seguí leyendo".

Consecuencias SEO:
- **Bueno**: las notas indexadas no se pierden con un 404; los enlaces de Facebook, Instagram y de otros sitios siguen funcionando; los 301 conservan la autoridad.
- **Malo**: sin sitemap, Google se entera de las páginas viejas sólo por lo que ya conoce o por enlaces. La señal "este sitio tiene X páginas" cae a la mitad, y cada día salen ~46 notas del sitemap. Para el tema de "contenido a escala", mostrar menos páginas indexables no perjudica; para el tráfico de cola larga (lo que la gente busca semanas después), sí.
- **Compartir**: si alguien comparte una nota vieja, la vista previa tiene una imagen genérica en lugar de su tarjeta.

Recomendación: generar un `sitemap-archivo.xml` (o varios por mes, con el límite de 50.000) desde el manifiesto de R2, referenciado en el índice, sin tocar el límite de archivos de Cloudflare Pages (se sirve desde el Worker del archivo o se guarda en R2). Decidir si las notas muy viejas (más de 6 a 12 meses) se mantienen indexables o se pasan a `noindex` para que no pesen en la calidad general del sitio.

### 2.6 Paginación y 404

- Las secciones se paginan con direcciones propias (`/seccion/x-2`), cada una con canónico propio e `index, follow`; bien según Google, que ya no usa `rel=prev/next`. Con 10 notas por página y el tope, hay hasta 7 páginas por sección: son listas de poco valor (C6 del doc anterior); si Search Console las muestra como "sin indexar", sacarlas del sitemap.
- La 404 devuelve código 404 real (no "soft 404").

---

## 3. Impacto SEO de las decisiones recientes

| Decisión | Efecto en SEO | Qué hacer |
|---|---|---|
| **Tope de 500 notas + R2** (23/10) | Sitemap de 1.245 a 556 URL; notas viejas vivas pero sin sitemap, sin tarjeta propia y sin "Seguí leyendo" (sección 2.5) | Sitemap del archivo; tarjeta por nota en R2 o foto al `og:image` |
| **Ventana de 36 h** en la portada | Neutro: la portada cambia sola (bueno para el rastreo); las notas siguen existiendo | Nada. Mantener `/hoy` como página de "lo de hoy" |
| **Regla 307: sin "fuente principal" suelta** | Neutro o positivo (menos riesgo de parecer "reescritura de una nota ajena"); el desplegable sigue rastreable. Quedó desalineado el marcado (`isBasedOn` una sola URL, `citation` sin enlaces) y el texto de `/quienes-somos` | Alinear marcado y página (ver 2.3 y la lista de "hacer ya") |
| **Notas sin foto con placa** | Las placas son SVG (no pesan), pero la nota queda sin imagen real para Discover/Imágenes y sin entrada en el sitemap de imágenes | Priorizar foto o ilustración en las notas de Balcarce; medir qué porcentaje son placas (se puede con `npm run auditar-fotos`) |
| **Redacción por IA** | Sigue siendo el riesgo grande (política de spam de Google contra contenido a escala). Las defensas son buenas (fuente enlazada, verificación, cuerpo mínimo de 70 palabras, `noindex` en lo débil, firma de IA) | Medir con Search Console y decidir D2 con datos |

### E-E-A-T (confianza) hoy

| Señal | Estado |
|---|---|
| Quién hace el medio | "Hernán y Andrés, dos vecinos de Balcarce". Sólo nombres de pila. Sin apellidos, razón social ni dirección. Google Noticias suele pedir un responsable identificable |
| Transparencia sobre la IA | Muy buena: firma en cada nota, aviso en el pie, sección "Cómo trabajamos" |
| Firma / autor | Organización "Radar Balcarce"; la nota dice "Redacción asistida con IA, verificada contra las fuentes". Consistente entre lo visible y el marcado |
| Fuentes | Desplegable con todas; marcado parcial (ver 2.3) |
| Corrección de errores | Párrafo y botón "Avisanos" en cada nota; "Actualizado" cuando una persona corrige. **No hay registro público** |
| Contacto | WhatsApp, correo, página de contacto (el correo sale ofuscado por Cloudflare en la página, normal) |
| Política de privacidad | Sí |
| Propiedad/financiamiento | Se declara "independiente"; el marcado apunta a "Quiénes somos" |

---

## 4. SEO local y Google Noticias / Discover

- **Google Business Profile / Bing Places**: no corresponde sin un local con atención al público. Se mantiene la conclusión del 16/10.
- **Lo que sí suma en un lugar chico**: enlaces desde el municipio, la Cámara de Comercio, clubes, escuelas, bibliotecas; que las fichas de Instagram y Facebook enlacen al sitio; Wikidata para la entidad "Radar Balcarce". Nada de esto está en una lista de tareas con responsable.
- **Páginas que la gente busca solas y ya existen**: `/farmacias`, `/clima`, `/agenda`, `/util`, `/dolar`, `/tablas/*`, `/hoy`. Son el mejor ancla local. Falta convertir `/util` en página de emergencias (`IDEAS.md` #12) y crear guías permanentes (#22, #41).
- **Google Noticias**: no existe más un "alta" clásica; se entra por el rastreo y se puede usar Publisher Center para ordenar el sitio y las secciones. El `sitemap-news.xml` ya está bien armado. Requisitos que hoy se cumplen: fechas visibles, sección, contacto, política de IA. **Riesgo**: Google evalúa mal a los sitios que sólo reescriben a otros; no hay forma de saberlo sin probar, y probar es gratis.
- **Discover**: pide imágenes de 1200 px o más sin texto encima y contenido que no sea clickbait. Hoy las notas con foto lo cumplen (ejemplo del INTA: 1200x802 con crédito); las que sólo tienen placa, no.
- **Search Console**: la propiedad está verificada por dominio (`sc-domain:radarbalcarce.com`) desde el 24/09. No hay dato de qué indexó Google desde entonces.

---

## 5. Checklist

### Hecho

- [x] `robots.txt` con política de bots de IA y tres sitemaps.
- [x] `sitemap.xml`, `sitemap-news.xml`, `sitemap-index.xml` vivos y con fechas coherentes.
- [x] Canónico, título, descripción y `h1` únicos en portada, sección, nota y páginas institucionales.
- [x] Open Graph y Twitter completos; tarjeta de compartir de 47 KB.
- [x] `NewsArticle` con autor, fechas, publisher, citation, imagen; `NewsMediaOrganization`, `WebSite`, `BreadcrumbList`, `CollectionPage`.
- [x] 301 de `http`/`www`/id corto; 308 de barra final; 404 reales.
- [x] Notas fuera del tope siguen vivas con 200 (R2).
- [x] RSS, `llms.txt`, `/agentes/*.json`, IndexNow.
- [x] Desplegable de fuentes rastreable en el HTML.
- [x] Firma de IA, "Quiénes somos y cómo trabajamos", contacto, privacidad.

### Falta

- [ ] Sitemap de las notas que están en R2 (hoy fuera del sitemap).
- [ ] Imagen propia (`og:image`) para las notas archivadas en R2; "Seguí leyendo" o enlaces relacionados en ellas.
- [ ] Alinear `isBasedOn`/`citation` con el desplegable (todas las fuentes, con enlace) tras la regla 307.
- [ ] Corregir el texto de `/quienes-somos` ("justo debajo del texto").
- [ ] `/correcciones` (registro público) o, al menos, una sección en "Contacto y correcciones" con las correcciones hechas.
- [ ] Descripciones fijas por sección (hoy dependen del último titular, a veces desfasado).
- [ ] Actualizar `docs/seo/AUDITORIA-SEO-LLM.md` con las cifras de hoy (556 URL, tope 500, R2 activo) y el cierre de B3/B4/C1.
- [ ] Páginas de tema/entidad (`/tema/*` dan 404): decidir si se activan.
- [ ] Agendar la revisión trimestral del doc de SEO y la de enero de 2027 sobre MCP.

### Por decidir (Hernán y Andrés)

- [ ] **D1**: ¿se deja que las IA se entrenen con el sitio? (hoy sí, por defecto; confirmarlo a conciencia).
- [ ] **D2**: ¿se indexa sólo lo de Balcarce y lo respaldado por 2 o más medios? Depende de los datos de Search Console.
- [ ] **D6/D8**: ¿se publican apellidos/responsable, razón social o ciudad en "Quiénes somos"?
- [ ] **D7**: ¿se prueba Publisher Center y "Fuentes preferidas"? (sin costo, sin riesgo para la búsqueda normal).
- [ ] ¿Cuánto tiempo permanecen indexables las notas viejas de R2 (por ejemplo 12 meses) antes de pasarlas a `noindex`?
- [ ] ¿Se sacan del sitemap las páginas 2 a 7 de cada sección (poco valor)?
- [ ] ¿Se enlaza `/hoy` desde la portada? (D12 del 17/10).

---

## 6. Prioridades

### Hacer ya, antes de lanzar

1. **Sitemap del archivo (R2)** y revisar que `sitemap-index.xml` lo incluya.
2. **Search Console y Bing**: abrir, ver el estado de indexación, mandar el `sitemap-index.xml` (de ustedes; ver sección 7).
3. **Texto de `/quienes-somos`** y marcado `isBasedOn`/`citation` alineados con la regla 307.
4. **`/correcciones`** (una página simple con las correcciones y la fecha) y decidir qué datos del responsable se publican (D6/D8).
5. **Descripciones por sección** estables.

### Después

6. Tarjeta propia y enlaces relacionados para las notas de R2.
7. Páginas permanentes: emergencias en `/util`, autódromo, hospital, Fiesta del Postre (`IDEAS.md` #12, #22, #41).
8. Reactivar `/tema/*` con 3 notas como mínimo.
9. Fotos WebP en varios tamaños cuando vivan en R2.
10. Revisión trimestral de las guías de Google sobre IA.

---

## 7. Cosas que sólo puede hacer una persona

Todas con `radarbalcarce@gmail.com`, sin costo.

1. **Search Console** (`sc-domain:radarbalcarce.com`): mirar *Páginas* (cuántas indexadas y por qué no las otras, en especial "Rastreada: actualmente sin indexar"), *Sitemaps* (cargar `sitemap-index.xml` y ver el estado), *Core Web Vitals*, *Rendimiento*, *Discover* y *Acciones manuales*. Una vez por semana, 15 minutos.
2. **Bing Webmaster Tools**: importar desde Search Console, cargar el sitemap, mirar "AI Performance".
3. **Google Publisher Center**: cargar el sitio, el logo (`/icon-512.png`) y las secciones. Decisión de ustedes.
4. **"Fuentes preferidas"** de Google: botón visible, se consulta antes.
5. **Cloudflare**: confirmar que no estén prendidos "Block AI bots" ni "robots.txt administrado"; mirar "AI Crawl Control".
6. **Datos del responsable** de "Quiénes somos" (apellidos, razón social, ciudad): sólo ustedes saben qué quieren publicar.
7. **Canales de WhatsApp, Telegram y Bluesky**: crearlos y cargar las variables `WHATSAPP_CANAL_URL`, `TELEGRAM_CANAL_URL`, `BLUESKY_URL` (suman `sameAs`).
8. **Enlaces de otros sitios de Balcarce** (municipio, Cámara de Comercio, clubes, escuelas, bibliotecas): pedirlos de a uno.
9. **Wikidata**: crear la ficha "Radar Balcarce" con el sitio y las redes.
10. **Probar una nota** en el validador de resultados enriquecidos de Google (<https://search.google.com/test/rich-results>) y en el depurador de Facebook.

---

## Anexo: comandos usados (todos GET)

`curl` a `/robots.txt`, `/sitemap.xml`, `/sitemap-index.xml`, `/sitemap-news.xml`, `/llms.txt`, `/feed.xml`, `/agentes/{ultimas,indice,servicios}.json`, portada, `/hoy`, `/quienes-somos`, `/contacto`, `/seccion/{futbol,futbol-2,policiales,politica-8}`, una nota de hoy, una nota del 6/10 fuera del tope, ids cortos, una dirección inexistente, `http`/`www`/barra final, `opengraph-image` de una nota y del sitio, `/tema/autodromo`, `/correcciones`, `/ads.txt`, `/security.txt` y el archivo de IndexNow.
