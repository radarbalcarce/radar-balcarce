# Auditoría técnica del sitio, 5/11/2026

*Hecha entre las 14:55 y las 15:10 (UTC; 11:55 a 12:10 en Balcarce) contra radarbalcarce.com en vivo, con curl, el navegador del panel en tamaño celular (375 × 812) y la lectura del código de `v3/sitio/`. No se cambió nada. Lo que no se pudo medir está marcado.*

**Aclaración sobre lo que se vio en vivo.** El último commit del sitio (`eb28f9bb`, 12:01 de Balcarce) trae «Seguí leyendo» al final de la nota, botones de compartir con íconos y saca la línea «Escrita con IA…». Cuando se auditó, el sitio en vivo todavía servía la versión anterior (botones con texto, sin «Seguí leyendo»). Por eso lo de «falta seguí leyendo» figura como **resuelto en el código, falta verificar el despliegue** (hallazgo 9).

## Resumen

Lo sólido: HTML liviano (40 a 70 KB, con Brotli), tipografías propias con caché de un año, `NewsArticle` en todas las notas revisadas, canónicas bien, sitemaps partidos por mes y de Google News, RSS, `llms.txt`, `ads.txt`, 404 y 410 con `noindex`, paginación con `rel=next/prev`, AdSense y Analytics sólo después de aceptar cookies, foco visible, contraste casi siempre por encima de 4,5, y ningún enlace interno roto en las 10 páginas rastreadas (56 enlaces; el único distinto de 200 es `/publicidad`, que redirige 301 a propósito).

Lo grave: las fotos de portada y de las notas **se muestran desde los servidores de otros medios**, pesadas, sin tamaños adaptados, y a veces con una dirección firmada que puede vencer. Eso daña la vista previa al compartir, el rendimiento en celular y la independencia del medio.

---

## Hallazgos, de más a menos graves

### 1. Las fotos se cargan desde los servidores de otros medios (hotlink), sin copia propia
- **Qué pasa.** En la portada, las 21 imágenes vienen de 11 dominios ajenos (`radiogabal.com.ar` 4, `diariolavanguardia.com` 3, `resizer.glanacion.com` 3, `clarin.com` 2, `blogger.googleusercontent.com` 2, `ole.com.ar`, `cronista.com`, `ambito.com`, `dib.com.ar`, `accion5.com`, `imagenes.eldiariobalcarce.com.ar` 2). Las notas migradas con foto guardada (`/fotos-notas/xxxx.jpg`) sí son propias; las nuevas del motor 3.0 apuntan a la fuente. Consecuencias medidas:
  - Clarín y Olé devolvieron **403** a un pedido de curl sin cabeceras de navegador (con User-Agent de celular y Referer del sitio dieron 200). Hoy andan en un navegador, pero dependen de que el otro medio no cierre el acceso.
  - La foto de la nota de Cristiano Ronaldo usa una dirección de La Nación **firmada** (`?auth=…`). Cuánto dura esa firma no se verificó; si vence, la foto se rompe.
  - Dos fotos vienen por `http://` (`imagenes.eldiariobalcarce.com.ar`): el servidor de origen las redirige con 301 a https, un salto de más y contenido mixto si el navegador no lo mejora solo.
  - Es la idea n.º 3 del resumen del 5/11 («Fotos propias»); acá queda medido que es de lo más urgente.
- **Dónde se ve.** `https://radarbalcarce.com/` (21 imágenes), `https://radarbalcarce.com/nota/cristiano-ronaldo-anuncio-su-retiro-de-la-seleccion-de-portugal-yo1m5yf`, `https://radarbalcarce.com/nota/la-cooperativa-de-electricidad-advierte-por-falsos-empleados-que-gbopuel`.
- **Cómo se arregla.** Al publicar, que el motor baje la foto, la achique (varios anchos, WebP/JPEG) y la guarde en almacenamiento propio (R2 o `/fotos-notas/`); la nota apunta a la copia. Si la fuente no deja bajarla, placa propia. Mientras tanto, pasar `http://` a `https://` al armar la dirección.
- **Esfuerzo.** Medio.

### 2. Fotos enormes sin versiones chicas: la portada y las notas pesan megabytes en el celular
- **Qué pasa.** Las 21 imágenes de la portada suman **unos 7,4 MB** (dos de La Nación 1,7 y 1,0 MB; un PNG de La Vanguardia 1,0 MB; un PNG de Radio Gabal 0,5 MB; Clarín y Olé ~0,35 a 0,4 MB cada una) para mostrarse a 104 a 200 px de ancho (medido con curl y User-Agent de celular). En la nota de Cristiano Ronaldo la imagen mide **5000 px de ancho** y se muestra a 343 px en el celular; pesa 1,7 MB. Ninguna imagen usa `srcset` ni `sizes`.
- **Dónde se ve.** Portada; nota de Cristiano en el navegador a 375 px (`naturalWidth` 5000, ancho mostrado 343).
- **Cómo se arregla.** Junto con el 1: copias propias a 480, 800 y 1200 px con `srcset`/`sizes`. Si no se puede ahora, un redimensionador delante de las fotos ajenas (Cloudflare Image Resizing, si el plan lo permite; no verificado).
- **Esfuerzo.** Medio (junto con el 1).

### 3. Las vistas previas al compartir faltan o son inconsistentes (Open Graph y Twitter)
- **Qué pasa.**
  - La portada y todas las páginas que no son notas (`/seccion/*`, `/clima`, `/farmacias`, `/dolar`, `/hoy`, `/agenda`, `/tablas`, `/util`, `/quienes-somos`, `/contacto`) **no tienen `og:image`**, salvo la portada, que toma la foto de la primera nota (hoy `https://www.diariolavanguardia.com/img/noticias/img_d-66296.jpg`, cambia con cada nota y es ajena). Al pegar el enlace de una sección en WhatsApp o Facebook sale sin imagen.
  - Las notas sin foto no tienen `og:image` ni `image` en el `NewsArticle` (Google lo pide para el resultado enriquecido y Discover). Ejemplo: `https://radarbalcarce.com/nota/realizaron-jornadas-de-reflexion-en-la-escuela-secundaria-n-1-sobre-koso8wy` (`twitter:card=summary`).
  - Faltan `og:image:width/height/alt`, `article:published_time` y `article:section`. (`twitter:title/image` no hacen falta, X toma `og:*`.)
  - `og:image` es la foto original de otro medio, sin recorte 1200 × 630.
  - `/og-default.png` da 404: no hay imagen de respaldo.
- **Dónde se ve en el código.** `pagina()` en `v3/sitio/vistas/base.mjs` sólo escribe `og:image` si recibe `p.imagen`.
- **Cómo se arregla.** Una imagen de respaldo propia 1200 × 630 con el logo, usada en todo lo que no tenga foto (incluidas las notas sin foto, o su placa); sumar `og:image:width/height/alt` y `article:*`. Verificar con el depurador de Facebook y el inspector de resultados enriquecidos de Google.
- **Esfuerzo.** Bajo.

### 4. Las notas «Cómo viene el…» (clima diario) están en `noindex` pero figuran en el sitemap
- **Qué pasa.** Llevan `<meta name="robots" content="noindex,nofollow">` y aun así el mapa del mes las lista: señal contradictoria para Google («enviada en el sitemap pero excluida por noindex»). Hoy son 3 (2026-11-03, -04 y -05) y se suma una por día.
- **Causa verificada en el código.** `sitemapDelMes` filtra con `noSeIndexa(n)` (lee `n.ficha.indexar === false`, `vistas/clima-diario.mjs:14`), pero `notasDelMes` (`v3/sitio/db/consultas.mjs:89-93`) sólo trae `id, titulo, seccion, slug, publicada`, sin `ficha`; el filtro nunca se cumple. El RSS y el mapa de noticias sí usan `listar`, que trae la ficha (no se encontraron notas de clima en ellos).
- **Dónde se ve.** `https://radarbalcarce.com/sitemap-2026-11.xml` (buscar `como-viene-el`) y `https://radarbalcarce.com/nota/como-viene-el-jueves-5-de-noviembre-en-balcarce-dia-nublado-y-sin-clima-2026-11-05`.
- **Cómo se arregla.** Que `notasDelMes` traiga `n.ficha` y sumar una prueba con una nota de clima.
- **Esfuerzo.** Bajo.

### 5. `http://` no redirige a https y el sitio no manda cabeceras de seguridad
- **Qué pasa.** `http://radarbalcarce.com/` responde **200** (no 301 a https); sólo `www` redirige. La portada no manda `Strict-Transport-Security`, `Referrer-Policy`, `X-Frame-Options`/`frame-ancestors` ni `Content-Security-Policy` (verificado con `curl -I`). Dos versiones del mismo sitio pueden indexarse; las canónicas a https lo mitigan, no lo reemplazan.
- **Dónde se ve.** `curl -I http://radarbalcarce.com/` → `200 OK`.
- **Cómo se arregla.** En Cloudflare: «Always Use HTTPS» y HSTS (empezar con `max-age` corto). Las demás cabeceras, en `respuesta()` de `v3/sitio/sitio.mjs`; la CSP, primero en modo sólo-reporte por AdSense y Analytics.
- **Esfuerzo.** Bajo (https y HSTS); medio (CSP).

### 6. Falta marcado estructurado de sitio y migas de pan
- **Qué pasa.** La portada y las secciones no tienen ningún JSON-LD. Faltan `WebSite` (con búsqueda), la editorial `NewsMediaOrganization` (hoy sólo aparece como `publisher` dentro de cada nota) y `BreadcrumbList`. Tampoco hay migas de pan visibles; la nota sólo tiene la etiqueta de sección arriba del título.
- **Dónde se ve.** `https://radarbalcarce.com/` y `https://radarbalcarce.com/seccion/futbol` (cero `application/ld+json`).
- **Cómo se arregla.** Agregar los bloques en `vistas/portada.mjs`, `listas.mjs` y `nota.mjs` (`datosEstructurados` es la plantilla) y una línea de migas (`Inicio › Fútbol`).
- **Esfuerzo.** Bajo.

### 7. Toques demasiado chicos en el celular (medidos a 375 px)
- **Qué pasa.** Mínimo recomendado 44 × 44 px. En la nota de Cristiano Ronaldo, 24 elementos tocables miden menos:
  - «Secciones ☰»: 117 × **37**; «Buscar»: 75 × **42**; campo de búsqueda: **42** de alto.
  - Etiqueta de sección sobre el título: 67 × **22**.
  - «Fuentes (6)» (el desplegable): **23** de alto; cada fuente adentro (TN, La Nación, Clarín, Olé, Ámbito, 0223): **19** de alto; TN mide 21 de ancho.
  - Enlaces del pie (Quiénes somos, Cómo trabajamos, Contacto, Publicidad, Política de privacidad, RSS): **16** de alto, pegados; «Cookies»: 50 × 20.
  - En los avisos: «Clic acá» **17**, «WhatsApp 2266 51-1612» **34**.
  - Banner de cookies: «Sólo necesarias» y «Aceptar» **34**; «Más información» 36.
  - Bien: el menú de secciones (~44) y los botones de compartir (`min-height:44px`).
- **Dónde se ve.** `https://radarbalcarce.com/nota/cristiano-ronaldo-anuncio-su-retiro-de-la-seleccion-de-portugal-yo1m5yf` a 375 px. CSS: `ESTILOS` en `v3/sitio/vistas/base.mjs`.
- **Cómo se arregla.** `min-height:44px` y relleno en `#mb`, el botón y campo de buscar, `details.fuentes summary`, los enlaces de fuentes (en lista vertical), `.pie a` (en bloque con relleno), los botones de `.ck` y la etiqueta de sección.
- **Esfuerzo.** Bajo.

### 8. Notas migradas sin foto, parecidas entre sí y repasos indexables
- **Qué pasa (muestreo de 14 notas del sitemap; no es un recuento total).**
  - 6 de 14 **no tienen ninguna imagen**: p. ej. `fiorella-cacace-detalla-la-labor-de-los-escribanos-y1kgx4`, `suspenden-clases-en-el-jardin-905-por-el-robo-de-canos-de-ga…`, `kicillof-homenajea-a-tulio-crespi-en-el-autodromo-en-balcarc…`, `la-nasa-advierte-la-caida-sin-control-de-un-telescopio-espac…`. Sin imagen no hay vista previa al compartir. Cómo se ven en las listas no se verificó.
  - El mapa tiene 3.155 direcciones (sep 376, oct 2.276, nov 503). Hay **8 grupos con el mismo comienzo de dirección** (p. ej. tres del autódromo «reabre sus puertas», dos de «identifican en Neuquén una nueva especie de dinosaurio…»). Las tres del autódromo tienen títulos y textos distintos (22, 24 y 25/9), no son copias; las otras siete no se abrieron. Vale una pasada de unir repetidas.
  - Los «repasos» (`el-repaso-de-la-noche-en-radar-balcarce-…`) están indexables y figuran en el mapa (59 en octubre y 8 en noviembre, por el nombre). El sistema viejo no indexaba los repasos (`web/lib/indexacion.js`); en 3.0 no se aplica.
  - Las fechas de las migradas se ven coherentes en el muestreo (p. ej. nota del 25/9 con `datePublished` `2026-09-25T08:03:43Z` mostrada a las 05:03). No se encontraron fechas raras.
- **Dónde se ve.** `https://radarbalcarce.com/sitemap-2026-09.xml`, `https://radarbalcarce.com/sitemap-2026-10.xml`.
- **Cómo se arregla.** Pasada de fotos/placas sobre lo migrado (la idea 5 del resumen la incluye); decidir si los repasos van `noindex` (misma marca que el clima: `ficha.indexar=false`); repetir la unión de repetidas por huella de significado.
- **Esfuerzo.** Medio.

### 9. «Seguí leyendo»: implementado, sin desplegar al momento de la auditoría
- **Qué pasa.** Al auditar, ninguna nota tenía notas relacionadas: terminaba en compartir, fuentes y un aviso. El commit `eb28f9bb` agrega `seguirLeyendoHtml` (hasta 6 notas: la mitad de la misma sección y el resto lo último del sitio, más «Más de [sección]» e «Ir a la portada»), pero a las 15:03 UTC el sitio en vivo seguía sin él (0 coincidencias).
- **Límites del diseño** (`paraSeguirLeyendo`, `v3/sitio/db/consultas.mjs:54-59`): relaciona sólo por sección y por lo último, no por tema; no hay etiquetas ni páginas de tema (`/etiqueta/fangio` y `/tag/fangio` dan 404); no hay migas.
- **Dónde se ve.** Cualquier nota, p. ej. `https://radarbalcarce.com/nota/cristiano-ronaldo-anuncio-su-retiro-de-la-seleccion-de-portugal-yo1m5yf`.
- **Cómo se arregla.** Verificar el despliegue, que las filas midan 44 px o más y que no choque con los avisos. Después, relacionadas por tema (personas, lugares de la ficha) y migas.
- **Esfuerzo.** Bajo para verificar; medio para relacionadas por tema.

### 10. La foto principal de la nota carga con `loading="lazy"`
- **Qué pasa.** En la nota, `figura()` pone siempre `loading="lazy"`, también a la foto de portada, que está sobre el pliegue: empeora el LCP (no medido, el navegador del panel no entregó la métrica). En la portada la primera sí es `eager` con `fetchpriority="high"`. Las notas migradas declaran `width="1200" height="630"` (las 3 revisadas): si la imagen real tiene otra proporción, el recuadro no coincide (no verificado a ojo).
- **Dónde se ve.** `https://radarbalcarce.com/nota/la-cooperativa-de-electricidad-advierte-por-falsos-empleados-que-gbopuel`; código en `v3/sitio/vistas/nota.mjs`, función `figura`.
- **Cómo se arregla.** Parámetro de prioridad en `figura()` para la foto de portada (`eager` y `fetchpriority="high"`); guardar la medida real de la foto al bajarla (hallazgo 1).
- **Esfuerzo.** Bajo.

### 11. Caché del navegador larga y rótulos internos de publicidad a la vista
- **Qué pasa.**
  - Portada, secciones y notas: `Cache-Control: public, max-age=14400, s-maxage=300/3600`. El borde se refresca en 5 minutos pero el navegador del lector puede quedarse **4 horas** con la misma portada. Para un diario con notas cada 15 minutos es mucho. Clima, farmacias y dólar: 60 s (bien); `/buscar` y los 404, `no-store` (bien); fotos propias 7 días y fuentes un año `immutable` (bien).
  - Los lugares de publicidad vacíos muestran el rótulo **«Espacio T1», «Espacio N2», «Espacio S1»**… (`v3/sitio/vistas/avisos.mjs:61`, clase `aviso-espacio`). Sirve al anunciante, pero para un lector es un texto interno.
  - AdSense y Analytics se cargan sólo después de «Aceptar» (bien). Sin aceptar, el único script de terceros es el de Cloudflare Web Analytics. El peso real con anuncios activos no se pudo medir (no se aceptó el banner).
- **Cómo se arregla.** Bajar el `max-age` del navegador a 300 a 600 s en portada y secciones (`CACHE`, `v3/sitio/sitio.mjs`); mostrar el rótulo «Espacio …» sólo en el media kit.
- **Esfuerzo.** Bajo.

### 12. Detalles menores de SEO y accesibilidad
- **Barra final.** `/clima/` y `/sitemap.xml/` responden 200 igual que sin barra; tienen canónica, no es grave, pero conviene un 301.
- **Nombres viejos de sección.** `/seccion/cultura-y-agenda` y `/seccion/tecnologia-e-ia` dan 404. Si el sistema viejo las tenía indexadas, redirigirlas (`redirecciones-viejas.mjs` tiene una tabla `SECCIONES`; no se verificó si cubre estos casos). `/seccion/balcarce-2` sí redirige a `?pagina=2`.
- **Íconos en el `<head>`.** No hay `rel="icon"`, `apple-touch-icon`, `manifest` ni `theme-color` (existen `/favicon.ico`, `/icon-512.png` y `/manifest.webmanifest`). El navegador toma `/favicon.ico` solo, pero Android e iOS no usan el ícono bueno.
- **Secciones.** Todas usan «Las últimas noticias de X en Radar Balcarce» como descripción, y las páginas 2 a 34 (Balcarce tiene 34) la repiten con título «X, página N». Una descripción propia por sección ayuda.
- **Jerarquía.** El `<h1>` de la portada es el título de la primera nota (el logo no es h1); 25 `h2` y 9 `h3`, razonable. En las notas, los `h2` «Los datos / Cronología / Cifras / Qué falta saber» son iguales en todas.
- **Contraste** (calculado desde los colores del CSS): suave sobre crema 5,6; rojo sobre crema 4,6; ámbar sobre tinta 8,4; etiquetas de sección en blanco 5,0 a 9,9. **Único por debajo de 4,5:** el botón verde de WhatsApp con texto blanco (#128C4B, 4,3), que el commit pendiente reemplaza por un ícono. El modo oscuro no se midió.
- **Foco y alternativos.** Contorno de foco de 3 px (bien). Todas las imágenes de portada y notas auditadas tienen `alt`; el de la nota de Cristiano («Retiro de la selección nacional en Portugal») es genérico, no describe la foto.
- **hreflang.** No hace falta: sitio sólo en castellano (`lang="es-AR"`).
- **RSS.** `/rss.xml` y `/feed.xml` son iguales (18,5 KB). No traen foto (`enclosure`/`media:content`) ni `atom:link rel="self"`, que algunos lectores piden.
- **Esfuerzo.** Bajo en conjunto.

---

## Lo que se verificó y está bien

| Cosa | Resultado |
|---|---|
| Portada, secciones, `/clima`, `/farmacias`, `/dolar`, `/hoy`, `/agenda`, `/tablas`, `/util` y páginas de texto | 200, un solo `<h1>`, `title`, `description` y canónica propios |
| 404 y 410 | 404 para páginas inexistentes; 410 «Esa nota ya no está» para notas viejas sin destino; ambos con `noindex,nofollow` |
| `robots.txt` | Permite todo, bloquea `/buscar` y `/panel/`, anuncia los sitemaps |
| Sitemaps | Índice con páginas fijas, noticias (últimas 48 h, 81 notas) y un mapa por mes |
| `llms.txt`, `ads.txt`, `manifest.webmanifest`, `favicon.ico`, `icon-512.png` | Presentes |
| NewsArticle | En las 10 notas revisadas: titular, fechas, sección, `publisher` con logo, `citation` e `isBasedOn` con las fuentes |
| Canónicas | Absolutas y correctas, incluidas las de sección (`?pagina=N`) |
| Paginación | `rel=next/prev` presentes |
| Búsqueda | `/buscar?q=fangio` funciona, con `noindex` y `no-store` |
| Compresión | Brotli en el HTML |
| Tipografías | Propias, `font-display:swap`, `immutable` un año |
| Cookies | AdSense y Analytics sólo tras «Aceptar» |
| Desborde horizontal | Ninguno a 375 px (`scrollWidth` = 375) |
| Redirecciones | `www` → apex, `/publicidad` → media kit, `/seccion/x-2` → `?pagina=2`, tabla de notas viejas |
| Enlaces internos | 56 enlaces en 10 páginas, ninguno roto |

## Qué no se midió

- El peso de una nota con AdSense y Analytics activos (no se aceptó el banner).
- Core Web Vitals reales (el navegador del panel no entregó LCP): lo de rendimiento sale del tamaño de los archivos y del código.
- Modo oscuro completo, lector de pantalla y zoom al 200 %.
- Cuánto dura la firma `?auth=` de las fotos de La Nación y El Cronista.
- Cómo se ve el hueco de las notas sin foto en las listas.

## Orden sugerido

1. Hallazgos 4, 5, 7 y 10 (esfuerzo bajo, ganancia inmediata): sitemap con noindex, https y cabeceras, toques de 44 px, foto principal sin `lazy`.
2. Hallazgos 3 y 6: imagen de respaldo y datos de vista previa, `WebSite` y migas.
3. Hallazgos 1 y 2: fotos propias con tamaños; es lo que más mejora la vista previa, la velocidad y la independencia, y el trabajo más grande.
4. Verificar el despliegue de «Seguí leyendo» (9) y limpiar migradas y repasos (8).
