# P. Revisión independiente: técnica y SEO

*24/10/2026. Hecha "a ciegas": leí `CLAUDE.md`, `docs/CRITERIO-EN-UNA-PAGINA.md`, `PENDIENTES.md`, `docs/proyecto/COSTOS-Y-RECURSOS.md`,
`docs/auditoria-2-0/O-SEARCH-CONSOLE-24-10.md`, partes del código (`web/app/`, `web/lib/`, `infra/archivo-cloudflare/`, el panel) y los datos de `web/data/`,
y miré el sitio publicado con pedidos reales. **No leí los otros informes de `docs/auditoria-2-0/`**, así que puede haber coincidencias o choques.
No cambié código.*

*Alcance, por pedido del dueño: **no** evalúo el criterio editorial ni qué noticias se eligen. Evalúo (1) si técnicamente está bien hecho, (2) el mejor SEO
posible con lo que hay, (3) cómo preparar la estructura para notas propias, columnistas y autores, y (4) las 10 mejoras de mayor impacto para 30 días.
Cada afirmación sobre Google o Cloudflare tiene su fuente al final, con URL y fecha. Lo que es suposición mía dice **[a validar]**.*

---

## 0. En diez líneas

1. **La base técnica es buena y prolija**: sitio estático rápido de servir, HTTPS y cabeceras de seguridad bien puestas, `canonical` correcto en cada página, sitemap de noticias bien armado, datos estructurados `NewsArticle` + `BreadcrumbList` + `NewsMediaOrganization` muy completos, fuentes citadas en el marcado (`citation`, `isBasedOn`), feed RSS, `llms.txt`.
2. **El problema de arquitectura de fondo es el tope de archivos**: casi toda la complejidad (tope de 500 notas, archivo en R2 con un Worker adelante, tope de redirecciones, minutos de armado) existe para esquivar el límite de 20.000 archivos de Cloudflare Pages. **Con el plan Workers Paid que ya pagan, Workers con "static assets" admite 100.000 archivos por versión** (documentación de Cloudflare, actualizada el 12/10/2026). Vale la pena planificar la mudanza.
3. **La causa técnica número uno de las 337 "descubiertas sin indexar" es que las notas se quedan sin camino**: cada nota está unos 4 días en el sitio y en el sitemap; después pasa a R2, sale del sitemap (el mapa del archivo está apagado) y ninguna página del sitio la enlaza. Para Google, aparece y desaparece.
4. **Las 117 "rastreadas sin indexar" tienen además una parte de calidad**: páginas de plantilla que se repiten todos los días (clima diario, repasos de redes) y páginas cuyo texto principal ya existe, con otras palabras, en muchos otros sitios. Se ataca con **`noindex` estratégico** y con **más valor visible por página**, no con más páginas.
5. **Los datos estructurados están bien, pero la imagen está mal elegida**: el marcado ofrece la "tarjeta" con el título escrito encima (PNG de 474 KB), no la foto. Google pide fotos relevantes, en 16x9, 4x3 y 1x1, y "no logotipos ni leyendas".
6. **Para recibir notas propias y columnistas falta el modelo**: no hay autores como personas, ni páginas de autor, ni tipos de contenido (nota, columna, opinión, entrevista), ni un estado de borrador/revisión. Es el momento de armarlo, antes de que llegue el primer columnista.
7. **Seguridad: lo más urgente es lo más simple**: verificación en dos pasos en todas las cuentas (sigue pendiente) y una alerta de presupuesto en Cloudflare (no hay). Después, sacar la llave de GitHub del panel del mismo dominio que el sitio público.
8. **El monitoreo vive en el mismo proveedor que lo que vigila**, y los números de visitas están contaminados por robots (100 a 113 "visitas" diarias desde Francia).
9. **Encontré errores visibles del cruce** en notas de hoy (fuentes de otro tema en "Fuentes", conteo de medios inflado, dos temas en una nota). Son técnicos y se arreglan con pruebas del caso real.
10. **Las diez mejoras de la sección 5** son, casi todas, de esfuerzo bajo o medio y reversibles.

---

## 1. Qué medí (24/10/2026, a la tarde)

| Qué | Resultado | Cómo |
|---|---|---|
| Respuesta de una nota | 200, comprimida (`br`), ~156 ms; HTML de 73 KB | Pedido real |
| JavaScript por página | 8 archivos, **~487 KB sin comprimir** (React/Next), con caché de un año (`immutable`) | Pedido real de cada archivo |
| Foto de una nota | JPG de 1200×675, 46 KB, caché de 7 días | Pedido real |
| Imagen de compartir (`opengraph-image`) | PNG de 1200×630, **474 KB**, mitad foto y mitad título escrito | Pedido real |
| Cabeceras | HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; **sin Content-Security-Policy completa en el sitio** (sí en el panel) | `curl -I` |
| `canonical` | Presente y correcto en notas, secciones, páginas de servicio y paginación (`/seccion/politica-2` se apunta a sí misma) | HTML |
| Datos estructurados de una nota | `NewsArticle` (con `citation`, `isBasedOn`, `contentLocation`, `wordCount`), `BreadcrumbList`, `NewsMediaOrganization` con `publishingPrinciples`, `correctionsPolicy`, `ownershipFundingInfo`, `masthead`, etc. | HTML |
| `author` | `Organization` "Radar Balcarce", con `url` a Quiénes somos | HTML |
| `image` del marcado | **sólo la tarjeta** (`/opengraph-image`), no la foto | HTML |
| `dateModified` | Igual a `datePublished` | HTML |
| Sitemap principal | 554 direcciones: 493 notas (66 con imagen), 46 páginas de sección (paginadas), 15 fijas | `sitemap.xml` |
| Sitemap de noticias | 79 notas de las últimas ~48 h; **incluye los "repasos" de redes** | `sitemap-news.xml` |
| Mapa del archivo | `/nota/sitemap-archivo.xml` da **404** (la variable `SITEMAP_DEL_ARCHIVO` está apagada) | Pedido real |
| Notas viejas (del 5/10), 6 probadas | **4 abren desde R2** (cabecera `X-Radar-Archivo: r2`); **2 dan 404**: un repaso y una nota común que no figura en ningún archivo de retiradas ni de revisión | Pedido real |
| Página 404 | Tiene **dos** etiquetas `robots` (`noindex` y `index, follow`) | HTML |
| Páginas de tema (`/tema/...`) | Existen en el código; `/tema/rutas` (un tema que usan las notas) da 404; la portada no enlaza ninguna | Pedido real |
| Search Console (28 días) | 1.428 indexadas; 337 descubiertas sin indexar; 117 rastreadas sin indexar; 74 `noindex`; 70 404; sin datos de Core Web Vitals | `O-SEARCH-CONSOLE-24-10.md` |
| Visitas | 98 a 157 "visitas" por día, pero desde el 19/10: Francia 101 a 113 por día (computadora, "directo"), Argentina 6 a 16 | `web/data/estadisticas.json` |

No pude correr PageSpeed Insights (la API devolvió "cupo diario agotado"). Lo de rendimiento es medido a mano, no con Lighthouse.

---

## 2. ¿Técnicamente lo estamos haciendo bien?

### 2.1 Lo que está bien (y no hay que tocar)

- **Sitio estático en Cloudflare**: es la forma más barata y robusta de servir un medio. Que haya más lectores casi no cuesta.
- **Una sola dirección por nota y redirección a la canónica** (también desde R2): es lo correcto para SEO.
- **El Worker del archivo** está bien pensado: le pregunta primero al sitio, sólo si da 404 busca en R2, nunca escribe, tiene interruptor y pruebas.
- **El sitemap de noticias** filtra lo que tiene `noindex` y lo que no tiene hora real. Muy bien.
- **Las cabeceras de seguridad** y la política propia del panel (`connect-src` sólo a GitHub) están bien.
- **Las pruebas como red de seguridad** (unas 3.000) son lo que permite que dos personas que no programan cambien un sistema grande.

### 2.2 El tope de archivos y lo que arrastra

Hoy: Cloudflare Pages acepta 20.000 archivos; cada nota son ~4,2 archivos (página, tarjeta, imagen de Instagram, etc.); por eso el sitio guarda 500 notas y el resto sale de R2 por un Worker. Eso obliga a: tope de notas, exportador a R2, Worker del archivo, mapa del archivo aparte, tope de 1.950 redirecciones (el de Pages es 2.000 estáticas y 100 dinámicas), y un armado completo cada media hora.

Lo que encontré:

- **Cloudflare Workers con "static assets" admite 100.000 archivos por versión en el plan Workers Paid** (fuente 1, actualizada el 12/10/2026). Ese plan ya se paga.
- **Pages también admite 100.000 en "planes pagos"** si se pone la variable `PAGES_WRANGLER_MAJOR_VERSION=4` (fuente 2, actualizada el 5/9/2026), pero la página nombra planes de zona (Pro, Business) y **no queda claro si Workers Paid cuenta** **[a validar con una prueba o con soporte]**.
- **Cloudflare dijo que Pages sigue funcionando, pero que toda la inversión nueva va a Workers**, y tiene una guía de migración (fuentes 3 y 4).

**Qué recomiendo**: planificar la mudanza del sitio de Pages a **un Worker con static assets**, con la lógica del archivo adentro del mismo Worker. Gana:
- 5 veces más archivos (de ~3.700 a ~18.000 notas posibles con el mismo diseño), o sea, **el tope de 500 deja de ser una urgencia**;
- las redirecciones se resuelven en código (sin tope de 2.000);
- un solo despliegue para sitio + archivo (hoy son dos cosas que tienen que coincidir).

No es para hacer a ciegas: hay `_headers` y `_redirects` que pasar a código, y conviene probarlo primero en `workers.dev`. Ya existe `infra/sitio-por-worker/`, que va en la misma dirección.

### 2.3 Las páginas del archivo quedan "congeladas"

Las notas de R2 son el HTML tal como estaba el día que salieron del sitio. Consecuencias:
- **Una mejora de SEO no les llega**: si mañana se cambia el marcado (`Person`, foto en el `image`, `dateModified`), las más de mil notas archivadas siguen con el marcado viejo, el menú viejo y los enlaces viejos.
- Hay que decidir si se **re-exportan** cada tanto (costo: minutos) o si, a futuro, las notas se **dibujan a pedido** desde los datos (JSON en R2) con caché. Lo segundo es lo que resuelve el problema de raíz y es compatible con la mudanza a Workers **[a validar el costo en CPU del Worker; con este tráfico debería ser mínimo]**.

### 2.4 Git como base de datos

`web/data/` se reescribe y se commitea cada media hora (estado de redes, estadísticas, fichas, fotos). El repositorio pesa ~291 MB y crece; los conflictos de `git pull` ya están documentados como "cosa que muerde". Funciona, pero es frágil para crecer. **Recomendación**: no sumar estado nuevo a git; lo nuevo (autores, borradores, correcciones a futuro) que viva en R2 o en una base D1 desde el principio, y mudar de a poco lo que cambia cada media hora. Esto está bloqueado hoy por el panel, que lee de git (lo dice `PENDIENTES.md`).

### 2.5 Notas que se pierden

De 6 direcciones del 5/10 que probé, **2 dan 404**: un "repaso" (las notas propias de ese tipo no se archivan) y una nota común (`benin-enfrenta-a-la-seleccion-…-ialwkh`) que no figura en retiradas ni en la revisión del archivo. Si eso se repite, explica parte de los **70 404** de Search Console. **Recomendación**: (a) que el exportador también archive los repasos (o que esas direcciones redirijan a la sección); (b) una prueba que tome una muestra de notas que alguna vez estuvieron en el sitemap y verifique que respondan 200 o 301; (c) para lo retirado a propósito, **410** en vez de 404 (le dice a Google "se fue para siempre").

### 2.6 Robustez y monitoreo

- **El vigilante corre en Cloudflare**, igual que el reloj, el motor y el sitio. Si se cae la cuenta de Cloudflare (o el pago), nadie avisa. Cuando se apaguen los workflows viejos de GitHub, se pierde el único control "de afuera". **Recomendación**: un control externo mínimo, por ejemplo un workflow de GitHub cada 3 horas que pida la portada y avise por mail si no está actualizada (gratis mientras el repositorio sea público; en privado son unos pocos minutos por mes **[a validar]**), o un servicio de monitoreo gratuito.
- **Alerta de presupuesto en Cloudflare**: el panel muestra "sin alertas configuradas". Es un botón; ponerla en US$ 10.
- **Los números de visitas no sirven tal como están**: desde el 19/10, más de dos tercios de las "visitas" vienen de Francia, de computadora y sin referente; también hay EE. UU., Suecia e Irlanda (donde Meta tiene centros de datos). **Recomendación**: que `redes/estadisticas-detalle.mjs` separe "Argentina" del resto y que ése sea el número del informe diario.
- **Minutos de armado**: el 24/10 se proyectaban ~8.500 en el ciclo contra 6.000 incluidos (`O-SEARCH-CONSOLE-24-10.md`). Las palancas ya están escritas y apagadas (`MOTOR_NOCHE_CADA_HORA`, `TARJETAS_EN_R2`). La de la noche es la de menor riesgo.

### 2.7 Respaldos

El respaldo de los domingos va a R2, o sea, **al mismo proveedor**. Falta una copia en otro lado y, sobre todo, **probar una restauración** una vez (ambas cosas están en `PENDIENTES.md`, P15). Un respaldo que nunca se restauró no se sabe si sirve.

### 2.8 Seguridad

| # | Riesgo | Por qué | Qué hacer | Esfuerzo |
|---|---|---|---|---|
| 1 | **Cuenta robada** | Todo cuelga de `radarbalcarce@gmail.com`; la verificación en dos pasos sigue pendiente (P10) y hubo un aviso de "cambio de contraseña" de Instagram | Dos pasos en Google, Meta, GitHub, Cloudflare y DonWeb, con códigos de recuperación guardados fuera del celular | Bajo |
| 2 | **La llave de GitHub del panel vive en el mismo dominio que el sitio** | El panel guarda la llave en `localStorage` de `radarbalcarce.com`. Cualquier script que lograra ejecutarse en cualquier página del sitio (que no tiene CSP completa y muestra texto que viene de feeds) podría leerla. Hoy React escapa el texto y el riesgo es bajo, pero el daño sería total (escribir en el repositorio) | Pasar el panel a un subdominio propio (`panel.radarbalcarce.com` es otro "origen" para el navegador) y usar llaves de GitHub "fine-grained" con permiso sólo sobre ese repositorio, sólo lo necesario, y con vencimiento | Medio |
| 3 | **Repositorio público** | Ya se cifra lo sensible; el plan de pasarlo a privado está escrito | Mientras sea público: "Require approval for all outside collaborators" en Actions (P de `PENDIENTES.md`) | Bajo |
| 4 | **Sin CSP en el sitio** | Está explicado en `_headers` (el analytics y el JSON-LD van en línea) | Una CSP en modo "sólo informar" (`Content-Security-Policy-Report-Only`) para ver qué rompería, sin romper nada | Bajo |

### 2.9 Rendimiento

- Servir es rápido (156 ms, comprimido, caché larga en los archivos fijos).
- **Peso de JavaScript alto para páginas que son texto**: ~487 KB sin comprimir. No hay datos de Core Web Vitals (poco tráfico), así que no se sabe si molesta. **Recomendación**: medir con Lighthouse en la PC una nota, la portada y `/farmacias` en modo celular, y recién ahí decidir. Lo más probable es que alcance con revisar qué componentes son "de cliente" **[a validar]**.
- **El HTML repite el cuerpo de la nota tres veces** (en la página, en el JSON-LD y en los datos internos de Next). No es grave, pero suma.
- **La tarjeta PNG de 474 KB** se podría servir como JPG/WebP (para compartir alcanza con ~100 KB).

---

## 3. El mejor SEO posible con lo que hay

### 3.1 Por qué hay 337 "descubiertas" y 117 "rastreadas" sin indexar

**Causas técnicas** (se arreglan con código):

1. **Rotación muy rápida y notas huérfanas.** Entran ~80 direcciones nuevas por día. Cada nota está ~4 días en el sitemap y en las listas; después pasa a R2, **sale del sitemap** (el del archivo está apagado) y **ninguna página la enlaza** (las secciones sólo listan lo que está en el sitio). Google ve una dirección nueva, no llega a rastrearla, y cuando vuelve ya no está en ningún mapa. Es la descripción exacta de "descubierta, actualmente sin indexar" en un sitio con poca autoridad.
2. **La paginación de las secciones cambia cada media hora.** `/seccion/politica-3` hoy tiene unas notas y mañana otras. Está bien que exista, pero no sirve como camino estable hacia las notas viejas.
3. **Páginas de plantilla que se repiten**: una nota de clima nueva cada día ("El clima de hoy en Balcarce: mínima de 8°…"), los repasos de redes (4 en la portada de hoy, que repiten títulos de otras notas) y notas de tipo "códigos de un juego para hoy". Están indexables y algunas en el sitemap de noticias. Le muestran a Google muchas páginas parecidas entre sí.
4. **Poca autoridad**: el sitio es nuevo y casi no tiene enlaces de afuera. Esto no se arregla con código, pero sí ayuda que Google gaste su tiempo en las páginas que valen.

**Señales de calidad** (lo que Google dice que mira): la política de spam de Google describe como riesgo generar muchas páginas leyendo feeds y transformándolas automáticamente sin agregar valor, "no importa cómo se haya creado" (fuente 5), y la guía de contenido útil pregunta si la página está "resumiendo lo que dicen otros sin agregar mucho valor" (fuente 6). Sin entrar en qué se publica, **técnicamente** hay tres formas de mostrar el valor que el sistema ya genera y hoy no se ve o no se marca:
- **Lo que suma el cruce**: "Lo contaron 4 medios", "qué se sabe y qué no" (`seSabe`, `noConfirmado` ya existen en los datos), "antecedentes" (ya existen). Que se vean arriba, no adentro de un desplegable, y que estén en el marcado.
- **Enlaces internos a lo propio**: cada nota de un tema recurrente (OSEBAL, el Concejo, la ruta 226) enlazando a una página fija de ese tema y a las páginas de servicio.
- **`noindex` estratégico** de lo que es plantilla o repetición (3.7).

### 3.2 Sitemaps

| Hoy | Recomendación |
|---|---|
| Un `sitemap.xml` con todo (notas, secciones paginadas, fijas) | **Partirlo por tipo y por mes**: `sitemap-fijas.xml`, `sitemap-secciones.xml`, `sitemap-notas-2026-10.xml`, `sitemap-notas-2026-09.xml`… Los meses cerrados no cambian más. Search Console muestra la indexación **por sitemap**, y eso dice dónde está el problema |
| El mapa del archivo, escrito y apagado | **Prenderlo** (P4 de `PENDIENTES.md`). Es la medida de mayor impacto contra las "descubiertas" |
| `priority` y `changefreq` en cada entrada | Google **no los usa** (fuente 7); se pueden dejar, pero no hay que gastar tiempo en ellos |
| `lastmod` = fecha de la nota | Correcto. Cuando haya correcciones, que `lastmod` y `dateModified` digan la fecha de la corrección (Google usa `lastmod` si es creíble: fuente 7) |
| El sitemap de noticias incluye los repasos | Sacar del sitemap de noticias todo lo que lleve `noindex` estratégico (3.7) |
| Las páginas de sección paginadas están todas en el sitemap | Dejar sólo la primera de cada sección; las demás se descubren por los enlaces |

### 3.3 Canonical, robots y paginación

- `canonical` está bien en todo lo que miré. Mantener la regla de "una sola dirección" para siempre.
- La paginación con `canonical` propio y `index, follow` es lo que recomienda Google para listas. Bien.
- **Arreglar la página 404**, que tiene dos etiquetas `robots` contradictorias (manda la más restrictiva, pero es un descuido).
- **Agregar páginas de archivo por fecha**, estables: `/archivo/2026/10/24` con todas las notas de ese día (de la portada o de R2), enlazadas desde el pie y desde cada nota ("Más notas del 24 de octubre"). Las puede servir el Worker del archivo a partir del manifiesto que ya existe. Así **ninguna nota queda huérfana**. Es la segunda medida de mayor impacto.

### 3.4 Datos estructurados

| Propiedad | Hoy | Recomendación (con fuente) |
|---|---|---|
| `image` | Sólo la tarjeta con el título escrito | **La foto real**, en tres recortes **16x9, 4x3 y 1x1**, con al menos 50.000 píxeles; Google pide "imágenes relevantes, no logotipos ni leyendas" (fuente 8). La tarjeta puede seguir como `og:image` para redes. El Worker de imágenes que ya existe podría hacer los recortes **[a validar]** |
| `author` | `Organization` | Para lo automático está bien (y hay `noBylinesPolicy`). Para lo propio: `Person` con `name` (sólo el nombre), `url` a su página de autor, una entrada por autor si son varios (fuente 8) |
| `dateModified` | Igual a la publicación | La fecha real de la última corrección, con zona horaria (fuente 8) |
| Tipo | Siempre `NewsArticle` | Según el tipo (sección 4.3): `OpinionNewsArticle` para opinión y columnas, `ReportageNewsArticle` para lo propio con trabajo de calle, `AnalysisNewsArticle` para análisis **[son tipos de schema.org; Google los trata como `NewsArticle`]** |
| Imágenes hechas con IA | Las ilustraciones dicen "generada con IA" en el crédito | Además, el metadato IPTC `DigitalSourceType` = `TrainedAlgorithmicMedia` adentro del archivo, que es lo que Google pide para identificar imágenes de IA (fuente 9) **[a validar si el generador ya lo pone]** |
| Página de autor | No existe | `ProfilePage` con `mainEntity` = `Person`; Google lo pone como caso válido: "una página de autor en un sitio de noticias" (fuente 10) |
| Agenda | Ya hay páginas de evento | Mantener `Event`; cuidar `eventStatus` cuando se suspende (hay `agenda-suspendidos.json`) |

### 3.5 Títulos, descripciones e imágenes

- Los títulos de las notas no llevan el nombre del sitio y los de las secciones sí ("· Radar Balcarce"). Elegir uno y hacerlo igual en todo; para un medio nuevo conviene sumarlo **[criterio común, Google puede reescribir el título igual]**.
- El texto alternativo de la foto repite el título. Mejor que describa la foto ("La dirigente sindical en el estudio de la radio") o, si no se sabe, que diga de quién es la foto.
- Discover pide imágenes de al menos 1.200 px de ancho y `max-image-preview:large` (fuente 11): **ya se cumple**. Lo que falta es que la imagen que se ofrece sea la foto (3.4).

### 3.6 Enlaces internos

- **Páginas de tema de verdad**: hay temas en los datos (`temas`, `etiquetas`) y código de `/tema/...`, pero `/tema/rutas` da 404 y nada las enlaza. Recomendación: una lista corta y fija de **temas permanentes de Balcarce** (OSEBAL, Concejo Deliberante, ruta 226, Estudiantina, hospital, Liga Balcarceña), cada uno con su página estable, un texto fijo corto escrito por una persona, la lista de todas las notas (incluidas las archivadas) y enlaces a los servicios. Son las páginas que pueden posicionar búsquedas como "osebal", que ya aparece en Search Console.
- **"Antecedentes"** ya existe en los datos: que siempre se muestre y enlace.
- **Desde cada nota**: a su sección, a su tema, a su día de archivo y a 3 o 4 relacionadas (hoy hay 4 relacionadas: bien).

### 3.7 `noindex` estratégico (lo de bajo valor)

`noindex, follow` deja la página abierta para el lector y le dice a Google "no la cuentes". Es reversible. Propongo marcarlo para:

| Qué | Por qué | La página que sí se indexa |
|---|---|---|
| La nota diaria del clima | Una por día, misma plantilla | `/clima` |
| Los repasos de redes (mañana, tarde, noche) | Repiten títulos de otras notas | Las notas que enlazan |
| La nota del dólar, si la hay | Misma plantilla todos los días | `/dolar` |
| Horarios y "dónde ver" de F1 o fútbol | Plantilla; la tabla es la que dura | `/tablas/...` |
| Notas con "códigos", promociones o similares | Google las asocia con granjas de contenido | — |
| Notas sin fecha real de la fuente | Ya quedan fuera del sitemap de noticias | — |

Y una regla técnica: **todo lo que lleve `noindex` sale de los dos sitemaps** (hoy el código ya lo hace para las notas sin cuerpo; hay que extenderlo).

Además, como **experimento medible**, se puede probar `noindex` por un mes en un grupo acotado de notas automáticas (por ejemplo, las de verificación MEDIA o las de un solo medio) y comparar en Search Console si mejora la indexación del resto. No cambia qué se publica: sólo qué se le ofrece a Google.

### 3.8 Google Noticias y Discover

- **No hay que anotarse**: la inclusión en Google Noticias es automática desde 2019, y desde abril de 2024 el Publisher Center no deja agregar publicaciones (fuente 12).
- **Lo que pide la política de transparencia de Google Noticias** (fuente 13) y cómo está Radar:

| Pide | Radar hoy | Falta |
|---|---|---|
| Fechas y firmas | Fecha sí; firma "Redacción asistida con IA…" | Firma de persona cuando sea propio |
| Información de los autores | No | Páginas de autor (4.2) |
| Información de la empresa o personas detrás, dueños o financiamiento | "Hernán y Andrés", sin apellidos ni dueño | **Una página de redacción** con nombres completos, foto, rol, ciudad, quién es el titular y cómo se financia |
| Política editorial | Resumida en "Cómo trabajamos" | **Una página propia** `/politica-editorial` (el marcado ya apunta a anclas de Quiénes somos; mejor que apunte a páginas reales) |
| Contacto no genérico | WhatsApp y un correo escondido por la protección de Cloudflare | El correo visible para personas (la protección de Cloudflare lo oculta a quien no tiene JavaScript, incluidos algunos robots) |
| Etiquetar el tipo de nota (opinión, noticia) | No hay tipos | 4.3 |
| Correcciones | Política sí; **registro público, no** | Una página `/correcciones` armada sola con lo que ya está en `correcciones.json`, `correcciones-auditoria.json` y `revision-archivo.json` (sólo lo que es corrección de un error, con fecha y motivo) **[a validar qué entradas de esos archivos son correcciones y cuáles son cuerpos cargados]** |

- Google aclara que publicar sin firma, como filosofía editorial, **no descalifica** a una fuente (fuente 14). Lo que más pesa es que se vea **quién está detrás**.
- **"Fuentes preferidas"**: desde el 30/04/2026 cualquier usuario puede marcar un medio como preferido en "Noticias principales", en todos los idiomas (fuente 15). Un botón o un texto en la portada ("Agregá Radar como fuente preferida en Google") cuesta nada.
- **No usar la API de indexación de Google para las notas**: es sólo para ofertas de trabajo y transmisiones en vivo (fuente 16). Para avisar notas nuevas está bien el sitemap de noticias e IndexNow (que ya se usa para Bing).

### 3.9 Feeds, `robots.txt`, `llms.txt` e IA

- `feed.xml` general y por sección: bien. Sumar, cuando existan, **feed por autor y por columna**.
- `robots.txt` está claro y bien comentado. Permitir el entrenamiento de IA (`ai-train=yes`) es una decisión del dueño, no de SEO: no afecta a Google Search (que usa `Googlebot`, no `Google-Extended`).
- `llms.txt` y `/agentes/*.json`: bien hechos y honestos (aclaran que es un resumen automático). No hay evidencia de que hoy muevan tráfico; no invertir más ahí **[a validar con el tiempo]**.

### 3.10 Core Web Vitals

Sin datos de campo (poco tráfico). Lo probable es que la carga sea buena (HTML estático, imagen principal con `fetchPriority="high"` y medidas puestas, sin fuentes externas). El riesgo está en el JavaScript (2.9). Medir con Lighthouse antes de tocar.

---

## 4. Cómo armar la estructura para contenido propio

La idea: que mañana pueda entrar una nota de un periodista, una columna semanal o una entrevista **sin tocar el motor**, con su firma, su página de autor y su plantilla, y que el lector y Google distingan siempre qué es automático y qué es de una persona.

### 4.1 El modelo de datos (qué campos tiene cada pieza)

Hoy una nota tiene `como` (`automatica` / `publicada`) y `propia` (repaso, clima, dólar). Propongo sumar, sin romper lo que hay:

| Campo | Valores | Para qué |
|---|---|---|
| `origen` | `automatica`, `propia`, `plantilla` | Lo que hoy se deduce de `como` + `propia`, dicho de una vez. Decide la etiqueta visible y el `author` del marcado |
| `tipo` | `nota`, `columna`, `opinion`, `entrevista`, `analisis`, `agenda`, `servicio`, `resumen` (lo automático) | Decide la plantilla, la etiqueta y el tipo de schema |
| `autores` | lista de ids (`["andres-gerace"]`) | Una o varias firmas, cada una con su página |
| `serie` | id de la columna (`"la-columna-del-campo"`) | Agrupa las columnas de un autor |
| `estado` | `borrador`, `en-revision`, `programada`, `publicada`, `corregida`, `retirada` | El flujo editorial (4.4) |
| `revisoPor`, `aproboCuando` | persona y fecha | Rastro de quién dejó salir qué |
| `actualizaciones` | lista de `{cuando, que, por}` | "Actualizado" visible y `dateModified` real |
| `fuentesConsultadas` | ya existe | En lo propio: a quién se entrevistó, qué documento se leyó |

Y un archivo nuevo, **`autores`** (mejor en R2/D1 que en git, por lo dicho en 2.4), escrito sólo por personas: `id`, nombre completo, rol, bio corta, foto, ciudad, redes (`sameAs`), correo, desde cuándo escribe, y si está activo.

### 4.2 Autores y firmas

- **Página de autor** `/autor/andres-gerace`: foto, bio, rol, redes, contacto, y la lista de todo lo que firmó (también lo archivado). Marcado `ProfilePage` + `Person` (fuente 10). Feed RSS propio.
- **Firma en la nota**: "Por Andrés Gerace" con enlace a su página, arriba, junto a la fecha. En el marcado, `author` = `Person` con `url` a esa página (fuente 8).
- **Página de la redacción** (`/redaccion`): todas las personas, con rol. Es el `masthead` que hoy apunta a un ancla.
- **Las automáticas siguen firmadas como hoy** ("Redacción asistida con IA, verificada contra las fuentes"), con `author` = `Organization`. **Nunca un nombre de persona en algo que escribió la IA**, ni siquiera "revisado por" si la revisión fue de un vistazo: o se revisó de verdad (y se anota quién) o no. Hay un antecedente público de lo que pasa cuando un medio local pone nombres inventados a notas de IA (Hoodline, 2024: fuente 17).

### 4.3 Tipos de contenido y plantillas

| Tipo | Etiqueta visible | Schema | Plantilla | Firma |
|---|---|---|---|---|
| Resumen automático (lo de hoy) | "Resumen de N medios" | `NewsArticle` | La de hoy, con "qué se sabe / qué no" y fuentes a la vista | Organización (IA) |
| Nota propia | "Nota de la redacción" o ninguna | `NewsArticle` / `ReportageNewsArticle` | Foto propia arriba, firma, "con información de…" si corresponde | Persona |
| Columna | "Columna" + nombre de la serie | `OpinionNewsArticle` | Foto y bio del autor al pie, enlace a la serie | Persona |
| Opinión | "Opinión" (bien visible, Google pide etiquetar: fuente 13) | `OpinionNewsArticle` | Aviso "Las opiniones son del autor" | Persona |
| Entrevista | "Entrevista" | `NewsArticle` (con `about` = la persona entrevistada) | Preguntas y respuestas, foto del entrevistado | Persona |
| Análisis | "Análisis" | `AnalysisNewsArticle` | Datos, gráfico, fuentes | Persona |
| Agenda | "Agenda" | `Event` | La de hoy | Organización |
| Servicio (clima, farmacias) | — | `WebPage` | Páginas fijas, siempre la misma dirección | Organización |

**Direcciones**: todo sigue en `/nota/titular-id` (la regla de "una sola dirección" no se toca). El tipo se ve en la página y en el marcado, no en la dirección. Las series tienen su página (`/columna/la-columna-del-campo`) y los autores la suya.

### 4.4 El flujo editorial técnico: borrador → revisión → publicación

Dos opciones, de menor a mayor esfuerzo:

1. **Sobre lo que ya existe (el panel del celular)**: el panel ya tiene borradores (`celular-borradores.json`) y publica escribiendo en GitHub. Sumar el campo `estado` y una pantalla "Para revisar". Ventaja: nadie aprende nada nuevo. Contra: el panel está pensado para aprobar notas automáticas, no para escribir largo.
2. **Un editor "basado en git" para quien escribe** (por ejemplo, Sveltia CMS, gratuito y de código abierto, sucesor de Netlify/Decap CMS, en beta pública: fuente 18): el columnista escribe en el navegador, con vista de cómo queda; se guarda como un archivo en una carpeta `contenido/` del repositorio; **la revisión es un "pull request"** que aprueba otra persona; al aprobarlo, la próxima vuelta del motor lo publica. Ventaja: rastro completo de quién cambió qué, gratis. Contra: alguien tiene que configurarlo una vez y la persona que escribe necesita cuenta de GitHub **[a validar si hay que darles una cuenta a cada columnista]**.

Con cualquiera de las dos:
- **Programar**: `programada` con fecha; el motor la publica cuando llega la hora.
- **Vista previa** antes de publicar (una dirección privada, con `noindex`).
- **Lo propio no pasa por el verificador automático** (que compara contra fuentes), pero sí por un control mínimo: tiene autor existente, foto con crédito, tipo, y en `opinion`/`columna` la etiqueta.
- **Correcciones** siempre con `{cuando, que, por}`: se ve "Actualizado el…" y se anota en `/correcciones` si fue un error.

### 4.5 Cómo mezclar lo automático y lo propio sin confundir

- **La diferencia se ve siempre**, arriba, no adentro de un desplegable: "Resumen automático de 4 medios" vs. "Por Andrés Gerace".
- **El marcado dice lo mismo que la página**: `Organization` para lo automático, `Person` para lo propio (Google pide que el marcado coincida con lo que se ve: fuente 8).
- **Lo propio, primero**: en la portada y en cada sección, un lugar fijo para lo propio ("De la redacción", "Columnas"), para que no se pierda entre 60 automáticas.
- **Sitemaps separados** (`sitemap-propias.xml`) para medir en Search Console cómo indexa Google lo propio. Es el dato que va a decir si vale la pena.
- **Si una nota propia trata el mismo hecho que una automática**: la propia es la que queda, y la automática se une a ella y redirige (el sistema ya sabe unir repetidas: `web/lib/repetidas.js`).

---

## 5. Las 10 mejoras de mayor impacto para los próximos 30 días

Ordenadas por impacto. Esfuerzo y riesgo, en palabras simples: **bajo** = horas y reversible; **medio** = días, con pruebas; **alto** = semanas o toca algo central.

| # | Qué | Impacto | Esfuerzo | Riesgo |
|---|---|---|---|---|
| 1 | **Seguridad básica**: dos pasos en todas las cuentas, alerta de presupuesto en Cloudflare (US$ 10), llaves de GitHub "fine-grained" con vencimiento | Evita perder todo en un día | Bajo (lo hace una persona) | Bajo |
| 2 | **Prender el mapa del archivo** (`SITEMAP_DEL_ARCHIVO`) y **partir el sitemap** por tipo y por mes; sacar de los sitemaps la paginación y todo lo que lleve `noindex` | El mayor golpe a las 337 "descubiertas sin indexar" | Bajo (el mapa ya está escrito) a medio | Bajo |
| 3 | **Páginas de archivo por día** (`/archivo/AAAA/MM/DD`) servidas por el Worker del archivo desde el manifiesto, enlazadas desde el pie y desde cada nota; arreglar las 2 de 6 notas viejas que dan 404 (repasos sin archivar, nota perdida) y usar **410** para lo retirado | Ninguna nota huérfana; menos 404 | Medio | Bajo |
| 4 | **`noindex` estratégico** de lo que es plantilla o repetición (clima diario, repasos, dólar, horarios, "códigos") y sacarlo del sitemap de noticias | Menos páginas parecidas; Google gasta su tiempo en lo que vale (ataca las 117 "rastreadas") | Bajo | Bajo (reversible) |
| 5 | **Datos estructurados**: la foto real en 16x9, 4x3 y 1x1 en `image`; `dateModified` real; IPTC en las ilustraciones de IA; arreglar la doble etiqueta `robots` de la 404; tarjeta en JPG/WebP | Mejor elegibilidad en "Noticias principales" y Discover | Bajo a medio | Bajo |
| 6 | **Transparencia en páginas reales**: `/redaccion` (nombres completos, foto, rol, titular, financiamiento), `/politica-editorial`, `/correcciones` (registro armado solo con los archivos que ya existen), correo visible; que el marcado apunte a esas páginas | Requisito de Google Noticias; confianza | Medio (texto de una persona + una plantilla) | Bajo |
| 7 | **Modelo para contenido propio**: campos `origen`, `tipo`, `autores`, `estado`, `actualizaciones`; archivo de autores; página `/autor/...` con `ProfilePage`; plantillas de nota propia, columna y opinión; etiqueta visible "Resumen automático" vs. "Por…" | Deja todo listo para el primer columnista sin tocar el motor | Medio | Bajo (no cambia lo automático) |
| 8 | **Arreglar los errores visibles del cruce**, con prueba del caso real: fuentes de otro tema en "Fuentes" (nota del Instituto Adventista: aparece una nota de "75 familias… regularización dominial"), conteo de medios inflado (nota de Nazareno Ramírez Bazán: 15 "medios", la mayoría sobre el cierre general de los Juegos Bonaerenses), dos temas en una nota ("La inteligencia artificial en la educación y los avances en oncología"), sección equivocada (un concejal de Tandil hablando de PAMI en Policiales) | Lo que más rápido le quita confianza al lector y a Google | Medio | Medio (toca el motor: por eso, con pruebas) |
| 9 | **Panel en un subdominio propio** (`panel.radarbalcarce.com`) para que la llave de GitHub no comparta "origen" con el sitio público; y una CSP del sitio en modo "sólo informar" | Cierra el riesgo de seguridad de mayor daño | Medio | Bajo a medio (hay que volver a cargar la llave en cada celular) |
| 10 | **Prueba de la mudanza a Workers con static assets** (100.000 archivos con Workers Paid) en `workers.dev`: el sitio + la lógica del archivo en un solo Worker, redirecciones en código. Sólo la prueba en estos 30 días; la mudanza, después | Saca la urgencia del tope de 500 notas, el tope de redirecciones y la mitad de la complejidad del archivo | Alto | Medio (por eso, primero en paralelo) |

**Fuera de la lista, pero en la misma semana que el punto 1**: separar "Argentina" del resto en las estadísticas (hoy los robots de Francia son dos tercios de las "visitas") y sumar un control externo de que la portada se actualiza.

### Lo que no conviene hacer (técnico)

- **No subir `TOPE_DE_NOTAS`** sin resolver antes el límite de archivos: se rompe el despliegue.
- **No cambiar la forma de las direcciones** (`/nota/titular-id`) para meter el tipo o la sección: se pierde lo indexado.
- **No usar la API de indexación de Google** para las notas (es sólo para empleos y transmisiones en vivo: fuente 16).
- **No sumar más estado a git** (autores, borradores nuevos): que nazca en R2 o D1.
- **No poner nombres de personas en lo automático**, ni para "darle autoridad".

---

## 6. Lo que no pude comprobar

- **Lighthouse / PageSpeed**: la API pública estaba sin cupo; lo de rendimiento es medido a mano.
- **Cuáles son exactamente las 117 y las 337**: hay que mirarlas en Search Console (Indexación → Páginas → cada motivo) y exportarlas. Mi diagnóstico es por el comportamiento del sitio, no por esa lista.
- **Si el plan Workers Paid habilita los 100.000 archivos en Pages** (la documentación habla de planes Pro/Business); en Workers static assets, sí, está escrito.
- **Por qué se perdió la nota `…-ialwkh`**: no está en retiradas ni en la revisión del archivo; hay que mirar el registro del exportador.
- **Si las ilustraciones de IA ya traen el metadato IPTC**.
- **Cuántos minutos de GitHub gastaría un control externo** con el repositorio privado.

*Pruebas del repositorio: corrí `npm test` en esta copia de trabajo antes de guardar; fallaron 3 pruebas que no tienen que ver con este documento (dos de `pedir-clima` y una que exige finales de línea LF en `respaldo.yml`, que en esta copia se bajó con CRLF). Este cambio es sólo un documento.*

---

## Fuentes externas (consultadas el 24/10/2026)

1. Cloudflare, "Workers – Limits" (static assets: 20.000 archivos en Free, 100.000 en Workers Paid), actualizada el 12/10/2026: https://developers.cloudflare.com/workers/platform/limits/
2. Cloudflare, "Pages – Limits" (20.000 / 100.000 archivos, `PAGES_WRANGLER_MAJOR_VERSION=4`, 2.000 redirecciones estáticas y 100 dinámicas, 100 reglas de `_headers`), actualizada el 5/9/2026: https://developers.cloudflare.com/pages/platform/limits/
3. Cloudflare, "Migrate from Pages to Workers": https://developers.cloudflare.com/workers/static-assets/migrate-from-pages/
4. Bryce Wray, "From Pages to Workers (again): revisited" (noviembre de 2025; cita el anuncio de Cloudflare de concentrar la inversión en Workers): https://brycewray.com/posts/2025/11/pages-workers-again-revisited/
5. Google Search Central, "Spam policies for Google web search" (abuso de contenido a escala), actualizada el 28/08/2026: https://developers.google.com/search/docs/essentials/spam-policies
6. Google Search Central, "Creating helpful, reliable, people-first content", actualizada el 05/10/2026: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
7. Google Search Central Blog, "Sitemaps ping endpoint is going away" (junio de 2023: no usa `changefreq` ni `priority`; `lastmod` sólo si es creíble): https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping
8. Google Search Central, "Article (Article, NewsArticle, BlogPosting) structured data" (imagen 16x9, 4x3, 1x1; `author` Person/Organization; `dateModified`), actualizada el 08/09/2026: https://developers.google.com/search/docs/appearance/structured-data/article
9. Google Search Central, "Google Search's guidance on using generative AI content" (metadatos IPTC `DigitalSourceType`), actualizada el 01/10/2026: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
10. Google Search Central, "Profile page (ProfilePage) structured data" (incluye "una página de autor en un sitio de noticias"), actualizada el 08/09/2026: https://developers.google.com/search/docs/appearance/structured-data/profile-page
11. Google Search Central, "Discover and your website", actualizada el 09/03/2026: https://developers.google.com/search/docs/appearance/google-discover
12. Search Engine Land, "Google Publisher Center to stop allowing you to add publications" (abril de 2024): https://searchengineland.com/google-publisher-center-to-stop-allowing-you-to-add-publications-439978
13. Google, "Google News policies" (transparencia: fechas, firmas, autores, empresa, contacto; etiquetar opinión): https://support.google.com/news/publisher-center/answer/6204050
14. Google Search Central Blog, "Understanding the sources behind Google News" (junio de 2021; publicar sin firma no descalifica): https://developers.google.com/search/blog/2021/06/google-news-sources
15. 9to5Google, "Google Preferred Sources global language expansion" (30/04/2026): https://9to5google.com/2026/04/30/google-preferred-sources-global-language-expansion/
16. Google Search Central, "Indexing API Quickstart" (sólo para `JobPosting` y `BroadcastEvent`): https://developers.google.com/search/apis/indexing-api/v3/quickstart
17. CNN (vía ABC17), "A national network of local news sites is publishing AI-written articles under fake bylines" (30/05/2024): https://abc17news.com/money/cnn-business-consumer/2024/05/30/a-national-network-of-local-news-sites-is-publishing-ai-written-articles-under-fake-bylines-experts-are-raising-alarm/
18. Sveltia CMS, repositorio oficial (editor de contenido basado en git, beta pública): https://github.com/sveltia/sveltia-cms

*Los números de Radar salen de `web/data/` y de pedidos reales al sitio el 24/10/2026 a la tarde; los de Google y Cloudflare, de `O-SEARCH-CONSOLE-24-10.md`. Si cambian, manda el dato nuevo.*
