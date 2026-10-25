# Auditoría de SEO y de asistentes de IA — Radar Balcarce

*16/10/2026. Hecha mirando el sitio real (`curl` y navegador a radarbalcarce.com), el código del
repositorio y la documentación oficial vigente a esta fecha (los enlaces están al final, con lo que
dice cada uno). Lo que se pudo medir está medido; lo que no, está dicho.*

## En diez líneas

1. **La base técnica está bien**: HTML estático rápido (una nota baja unos 380 KB en total, el HTML
   pesa 12 KB comprimido, sin saltos de diseño), `https` y un solo dominio con redirecciones 301,
   canónico en cada página, sitemaps, `NewsArticle` en cada nota, `IndexNow` andando, ningún bot de
   IA bloqueado.
2. **El riesgo grande no es técnico, es de política de Google**: Radar Balcarce es un medio que
   reescribe con IA lo que publican otros. La política de spam de Google trata como abuso el
   contenido generado en masa y el "raspado con retoques" **cuando no agrega valor**. Hoy hay
   defensas buenas (fuente citada, varias fuentes juntadas, verificación, sin cuerpo no se
   publica, `noindex` en lo débil) pero el 58% de lo indexable es de afuera de Balcarce. Es lo
   primero para mirar en Search Console (punto A1).
3. **Nadie mira Search Console ni Bing**: el sitio se publicó, se verificó, se mandaron los
   sitemaps el 24/09 y no hay ningún dato de lo que Google hizo con eso (B1, B2).
4. **72% de los títulos de nota llegan a Google cortados con "…"** (814 de 1.124): es una decisión
   vieja y medida en su momento, pero hoy conviene revisarla (B3).
5. **Los asistentes de IA (ChatGPT, Claude, Perplexity, Copilot) pueden leer todo el sitio**: probé
   con sus nombres y el sitio contesta 200. Hoy faltaba escribirlo; ahora `robots.txt` lo dice y
   declara la política (D1).
6. **`llms.txt`**: Google dice que no lo usa para nada. Lo dejamos (cuesta cero y lo audita
   Lighthouse) pero **no se hace `llms-full.txt`**: no hay ningún sistema que lo pida y duplicaría
   todo el contenido.
7. **Lo que sí sirve para agentes**: tres archivos JSON públicos (`/agentes/…`) y un **servidor
   MCP de sólo lectura** (Worker de Cloudflare) para que un asistente pregunte "qué pasó hoy en
   Balcarce" o "qué farmacia está de turno" y cite bien. Está escrito y probado, **no activado**.
8. **Se implementó** (todo invisible para el lector): política de bots en `robots.txt`, JSON-LD
   más completo (políticas editoriales, contacto, imágenes con tamaño real, lugar, autor con
   dirección), sitemaps sin páginas `noindex` y con fotos, `llms.txt` mejorado, los tres JSON, el
   Worker MCP, 45 pruebas nuevas. IndexNow ya estaba hecho el 8/10 (clave publicada y probada).
9. **Lo que decide Hernán** está en la parte 9: la IA puede entrenarse con el sitio (hoy sí),
   si se indexa sólo lo de Balcarce, activar o no el MCP, y las páginas visibles que conviene
   sumar ("Quién escribe", correcciones públicas).
10. **Trámites que son de ustedes** (con enlaces) en la parte 7; ninguno cuesta plata.
11. **Ronda 2 (17/10/2026)**: mapa de noticias e índice, marcado completo, títulos de sección, velocidad medida, nota con "Publicado" y "Actualizado", `/hoy`, "Cómo trabajamos" y canales: parte 11.

---

## 1. Qué se miró y cómo

- **Sitio publicado**: `robots.txt`, `llms.txt`, `sitemap.xml` (1.245 direcciones), `sitemap-news.xml`,
  `feed.xml`, portada, una sección, una nota, "Quiénes somos", "Contacto", farmacias, agenda y tablas:
  encabezados HTTP, metadatos, JSON-LD, pesos, redirecciones, 404.
- **Bots**: pedí la misma nota con los nombres de GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot,
  ChatGPT-User, Googlebot, bingbot, Google-Extended, CCBot, Bytespider, Applebot y programas
  genéricos: todos 200. *Limitación*: son nombres falsificados, no las IP reales de esas
  empresas; para estar seguros hay que mirar en Cloudflare (parte 7, trámite 7).
- **Medición en el navegador** (nota real, PC de Hernán): primer byte 0,2 a 0,3 s, carga en 1,3 s,
  16 pedidos, CLS (saltos de diseño) 0. *No se pudo* correr PageSpeed Insights (la API sin clave
  devolvió 429) ni mirar Search Console (no es público).
- **Código**: `web/app/`, `web/components/ficha.js`, `metadatos.js`, `web/lib/`, `_headers`,
  `.github/workflows/actualizar.yml` (el paso "Revisar que el SEO siga en pie"),
  `redes/indexnow.mjs`.
- **Documentación oficial** consultada hoy: Google Search Central, Google News, Discover, Bing,
  IndexNow, OpenAI, Anthropic, Perplexity, Cloudflare, el sitio de MCP, Microsoft (NLWeb).
  Lo que salió sólo de notas de prensa o blogs de terceros está marcado como *(fuente secundaria)*.

---

## 2. Estado real, con evidencia

### 2.1 Rastreo e indexación

| Tema | Hallazgo | Evidencia | Estado |
|---|---|---|---|
| `https` y un solo dominio | `http://` y `www.` redirigen con 301 a `https://radarbalcarce.com/` | `curl -I` | Bien |
| Barra final | `/seccion/balcarce/` redirige 308 a `/seccion/balcarce`; `/index.html` a `/` | `curl -I` | Bien |
| 404 | Las direcciones que no existen dan 404 de verdad (no "soft 404") y rescatan por el id de la nota | `curl -I /nota/no-existe-abc` | Bien |
| `robots.txt` | Permite todo menos `/panel/`; apunta a los dos sitemaps; no bloquea el feed | `curl /robots.txt` | Bien (ahora con política de IA, 2.7) |
| `sitemap.xml` | 1.245 URL: 1.136 notas, 94 páginas de sección, 4 de servicios, 4 de agenda, 3 de tablas, 3 páginas de confianza. Pesa 278 KB (límite de Google: 50 MB / 50.000) | descarga | Bien. `changefreq` y `priority` los ignora Google (ruido, no daño) |
| `sitemap-news.xml` | Sólo las últimas 48 h, con fecha real (sin las de "fecha de relleno"), nombre `Radar Balcarce`, idioma `es`. Cumple la guía de Google | descarga + guía | Bien |
| Canónico | Autorreferencial en cada página; la portada sin barra | HTML | Bien |
| Páginas `noindex` | Notas sin cuerpo de verdad: `noindex, follow` | `web/lib/cuerpo.js` | Bien. **Faltaba** que los sitemaps no las listaran (ya está) |
| Paginación | `/seccion/x-2`, `-3`… con canónico propio. Google ya no usa `rel=prev/next`; está bien | HTML | Bien |
| `hreflang` | No hace falta: hay un solo idioma y un solo país (`lang="es-AR"` en `<html>`, `og:locale es_AR`) | HTML | Bien (nada que hacer) |
| Páginas de tema (`/tema/…`) | Existen pero no se enlazan (`MOSTRAR_TEMAS = false`) y **no están** en el sitemap (el `SEO.md` viejo decía lo contrario) | sitemap | Oportunidad (C8) |
| Archivo | La nota dura 180 días o 3.700 notas; después 404. Con el Worker del archivo en R2 (todavía sin activar) seguirían vivas | `docs/salud-tecnica/` | Pendiente conocido |

### 2.2 Metadatos por tipo de página

| Página | Título | Descripción | `h1` | Veredicto |
|---|---|---|---|---|
| Portada | "Radar Balcarce · Noticias de Balcarce, clima y farmacia de turno" (64) | 161 caracteres (Google muestra unos 155), con qué ofrece | Oculto a la vista pero presente | Bien |
| Sección | "Balcarce · Radar Balcarce" | "Noticias de Balcarce: {2 últimos titulares}…" (cambia con las notas) | Nombre de la sección | Bien; el título es pobre (C9) |
| Nota | Titular cortado a 60 caracteres **con "…"** | Bajada cortada a 155 con "…" | Titular entero | Mejorable (B3) |
| Servicios | "Farmacias de turno · Radar Balcarce", "Agenda…", "Tabla de posiciones de la Liga Profesional…" | Una frase útil cada una | Propio | Bien |
| Confianza | "Quiénes somos", "Contacto y correcciones" | Propias | Propio | Bien |

Open Graph y Twitter Card: completos en todas (`og:title/description/url/site_name/locale/image` con
1200 × 630 y `alt`, `article:published_time/modified_time/section` en las notas,
`summary_large_image`). La tarjeta de cada nota pesa **343 KB**: WhatsApp suele descartar imágenes
de más de unos 300 KB (C1).

### 2.3 Datos estructurados (JSON-LD) — antes y después de hoy

| Qué | Antes | Ahora |
|---|---|---|
| `NewsMediaOrganization` | nombre, URL, correo, redes (`sameAs`), logo 512, zona (`areaServed`), `publishingPrinciples`, `correctionsPolicy` | + descripción, nombre alternativo (`radarbalcarce.com`), contacto (correo y WhatsApp, los del pie), `actionableFeedbackPolicy`, `ethicsPolicy`, `verificationFactCheckingPolicy`, `noBylinesPolicy`, `ownershipFundingInfo`, `masthead` (apuntan a títulos de "Quiénes somos" y "Contacto", que ahora tienen ancla) |
| `WebSite` | nombre, idioma, editor | + nombre alternativo |
| `NewsArticle` | título, bajada, cuerpo completo, fechas con zona, sección, autor, `citation` (medios), `isBasedOn` (enlace de la fuente), palabras clave, imagen = **sólo la tarjeta con titular encima** | + **foto de la nota con su tamaño real y su crédito** (si mide 1200 px o más va primera; Discover la pide así), + `contentLocation` Balcarce en las notas locales, + `wordCount`, + `author.url` a "Quiénes somos" |
| `BreadcrumbList` | Portada › Sección › Nota | igual |
| `Event` | En cada ficha de agenda | igual |
| Servicios (farmacias, clima) | nada | nada a propósito (ver C7) |

Qué no se inventó: fecha de fundación, domicilio, CUIT. Google pide que el marcado diga lo que la
página dice; esos datos no están en ningún lado del sitio.

**Decidido y hecho el 16/10/2026 (D5, ver sección 9)**: el `author.name` de las notas escritas con IA es
"Radar Balcarce (nota escrita con IA y verificada automáticamente contra las fuentes)". Es una
regla de transparencia propia (la firma del lector y el marcado dicen lo mismo, hay una prueba).
La guía de Google para `Article` pide que `author.name` sea **sólo el nombre**. Hoy no hay daño
visible (el autor "Organización" no se muestra en resultados), pero es un incumplimiento literal.
Ahora `author.name` es sólo "Radar Balcarce" y la aclaración pasó a `author.description` y `publishingPrinciples`.

### 2.4 Velocidad (lo medido)

| Medida | Resultado | Referencia |
|---|---|---|
| Primer byte (HTML) | 0,2 a 0,3 s (Cloudflare, servido desde Buenos Aires) | Bien (< 0,8 s) |
| Carga completa (nota, esta PC) | 1,3 s | Bien |
| Saltos de diseño (CLS) | 0 | Bien (< 0,1) |
| HTML de una nota | 55 KB crudo, 12 KB con Brotli | Bien |
| JS + CSS de una página | ~160 KB comprimido (3 archivos de JS de Next + 8 KB de CSS) | Aceptable |
| **Tipografías** | Source Serif 4 = **123 KB**, Inter = 73 KB (precargadas en todas las páginas) | Lo más pesado después de la foto (C2) |
| Fotos de las notas | promedio 72 KB; 62% miden 1200 px o más, 29% entre 700 y 1200, 9% son más chicas | Bien |
| Peso total de una nota | 383 KB en 16 pedidos | Bien |
| Datos de campo (CrUX) | **No medido**: hace falta Search Console → "Experiencia de página" o PageSpeed Insights | Pendiente (B1) |

Umbrales de Google para "bueno": LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1.

### 2.5 Confianza (E-E-A-T) de un medio automático

| Señal | Estado |
|---|---|
| Quién hace el medio | "Quiénes somos": "Hernán y Andrés, dos vecinos de Balcarce", independiente. **Sólo nombres de pila** (decisión de privacidad; ver D6) |
| Transparencia sobre la IA | Muy buena: aviso en el pie de todas las páginas, firma de una línea en cada nota ("Redacción con IA, verificada contra las fuentes"), explicación larga en el desplegable, página "Quiénes somos" con lo que se hace y lo que no, JSON-LD que lo repite |
| Fuentes | Desplegable "Fuentes (N)" con el medio y el enlace en cada nota; `citation` e `isBasedOn` en el marcado |
| Correcciones | Un párrafo en "Contacto y correcciones" y un botón de correo. **No hay registro público de correcciones** (D6) |
| Contacto | WhatsApp y correo en el pie y en la página de contacto |
| Autor | Organización "Radar Balcarce" (correcto para un medio automático; no hay personas que firmen) |
| Fechas | Fecha de publicación con hora y zona; la nota envejece y no rejuvenece (regla propia): lo que Google Noticias pide |
| Privacidad | Política publicada; analítica sin cookies |

### 2.6 SEO local

- **Qué hay**: `areaServed` Balcarce, 41% de las notas son "de acá", páginas de servicio que la
  gente busca solas (farmacia de turno, clima, agenda, teléfonos útiles), `Event` en la agenda,
  `contentLocation` en las notas locales (nuevo).
- **Google Business Profile / Bing Places**: **no corresponde** salvo que tengan un local u oficina
  con atención al público en horarios fijos. La guía de Google exige un lugar que los clientes
  visiten o un negocio que viaje hacia ellos; un medio sólo en internet no califica. No lo
  intenten con una dirección particular (puede costar la cuenta).
- **Lo que reemplaza al perfil**: una entidad clara (Organization con `sameAs`), Search Console,
  la página "Quiénes somos" y que otros sitios de Balcarce los mencionen y enlacen (municipio,
  clubes, comercios, la Cámara de Comercio): son los enlaces que más valen en un lugar chico.
- **Páginas de entidad** (autódromo, Fangio, Concejo Deliberante, clubes): existe el código
  (`/tema/…`) pero está apagado. Es la mayor oportunidad a años (C8).

### 2.7 Bots de IA y `robots.txt` (política y por qué)

| Operador | Bot | Para qué | Respeta robots.txt | Decisión |
|---|---|---|---|---|
| OpenAI | `OAI-SearchBot` | buscador de ChatGPT | Sí | **Permitido** |
| OpenAI | `ChatGPT-User` | una persona le pide a ChatGPT que abra una página | Puede no aplicarse (acción de un usuario) | **Permitido** |
| OpenAI | `GPTBot` | entrenamiento | Sí | Permitido hoy (D1) |
| Anthropic | `Claude-SearchBot`, `Claude-User` | búsqueda / acción de un usuario | Sí | **Permitidos** |
| Anthropic | `ClaudeBot` | entrenamiento | Sí (y respeta `Crawl-delay`) | Permitido hoy (D1) |
| Perplexity | `PerplexityBot` | buscador (no entrena modelos, dice su documentación) | Sí | **Permitido** |
| Perplexity | `Perplexity-User` | acción de un usuario | En general no | **Permitido** |
| Google | `Googlebot` | Search, Noticias, Discover **y las respuestas con IA de Google** | Sí | **Permitido** (si se bloquea, se desaparece de Google) |
| Google | `Google-Extended` | permiso para Gemini; **no afecta a Search** | Sí | Permitido hoy (D1) |
| Microsoft | `bingbot` | Bing, Copilot, y de ahí ChatGPT en parte | Sí | **Permitido** |
| Apple | `Applebot` / `Applebot-Extended` | Siri y Spotlight / IA de Apple | Sí | Permitidos |
| Otros | `CCBot` (Common Crawl), `Meta-ExternalAgent`, `Amazonbot`, `Bytespider` (ByteDance) | entrenamiento y respuestas | Los tres primeros sí; Bytespider, según varios informes, no *(fuente secundaria)* | Permitidos hoy; Bytespider no se frena con robots.txt (sólo con el WAF) |

**Por qué permitir**: para un medio de 10 meses de una ciudad de ~40.000 habitantes, el problema
es que no los conozcan. Los asistentes de IA son un canal de descubrimiento nuevo ("¿qué farmacia
está de turno en Balcarce?", "últimas noticias de Balcarce"), y los modelos que se entrenan hoy
son los que responderán dentro de unos años. El contenido es un resumen con la fuente citada, no
una exclusiva que valga plata. **Por qué podría no convenir**: lo ya aprendido no se "des-entrena",
no hay pago de por medio y el día que quieran cobrar (Cloudflare tiene "pay per crawl") conviene
haberlo pensado. Es reversible hacia adelante: una constante (`ENTRENAMIENTO_IA`, `web/lib/robots.js`).

Lo nuevo en `robots.txt` (`web/lib/robots.js`, ya sin `robots.js` de Next):

- una línea `Content-Signal: search=yes, ai-input=yes, ai-train=yes` (la política de Cloudflare
  para decir qué usos se permiten; **si alguien activa "robots.txt administrado" en Cloudflare,
  éste la pisaría con `ai-train=no`**: ya queda explícito qué decidimos);
- los bots de IA nombrados en dos grupos (buscadores/asistentes y entrenamiento) para poder cerrar
  el segundo sin tocar el primero;
- cada grupo repite `Disallow: /panel/` (un bot con grupo propio no lee el grupo general).

Lo que **un `robots.txt` no hace**: obligar. Lo cumplen los bots serios. Lo que bloquea de verdad
es el WAF / "AI Crawl Control" de Cloudflare. El estándar del IETF (`aipref`, cabecera
`Content-Usage`) todavía es un borrador sin implementaciones; no vale la pena aún.

### 2.8 `llms.txt` y `llms-full.txt`

- **Evidencia**: la guía oficial de Google para optimizar para respuestas con IA (15/05/2026,
  actualizada después) dice que Search **no usa** archivos de IA ni "chunking", y que no hace falta
  crearlos. John Mueller lo llamó "puramente especulativo" (junio 2026). Ningún asistente grande
  declaró leerlo. A la vez, Lighthouse 13.3 trae una auditoría ("Agentic Browsing") que mira si
  existe *(fuentes secundarias para estos tres datos; la frase "no hace falta crear archivos de IA"
  sí está en la página oficial de Google)*.
- **Decisión**: `llms.txt` **se mantiene** (cuesta cero, lo mide Lighthouse, ayuda a un agente
  que ya conoce el sitio) y se mejoró: cómo citar, servicios, datos para programas. **No se hace
  `llms-full.txt`**: duplicaría las notas, nadie lo pide y los archivos del sitio son un recurso
  contado (20.000 por límite de Cloudflare Pages, 15.900 usados).
- Se agregó a las pruebas que `llms.txt` no anuncie un MCP hasta que exista.

### 2.9 IndexNow

Ya estaba hecho (regla 150, 8/10/2026): `redes/indexnow.mjs` corre después de cada despliegue y le
avisa a Bing, Yandex, Naver, Seznam y otros (no a Google) la portada y las notas de los últimos 45
minutos que Google también puede ver. La clave de 32 caracteres está en
`web/public/0776b1b28b613625cba478a97201b517.txt` (el 15/10 la respuesta del sitio es 200 con ese
contenido). No se generó otra: una segunda clave y otro archivo no suman nada. Se agregó una
prueba que cuida que haya **una sola** clave publicada y que sea hexadecimal de 32 caracteres.
Lo que falta es ver los resultados: alta en Bing Webmaster Tools (trámite 2).

---

## 3. Problemas por gravedad e impacto

**A — Pueden costar el sitio entero o la mayor parte del tráfico**

- **A1. Política de Google contra contenido a escala y raspado.** *Impacto: máximo; probabilidad
  desconocida.* La política (página oficial, actualizada 28/08/2026) trata como spam "usar IA para
  generar muchas páginas sin agregar valor", "raspar feeds para generar páginas, incluso con
  transformaciones automáticas" y "combinar contenido de distintas páginas sin agregar valor". No
  dice cuánta reescritura alcanza. Radar Balcarce es, descripto sin adornos, un agregador que
  reescribe con IA. Lo que juega a favor: cita y enlaza cada fuente, junta varias fuentes de la
  misma noticia (67% de las notas tienen dos medios o más), verifica contra la fuente, exige un
  cuerpo de 70 palabras o más (mediana 116), deja en `noindex` lo débil, tiene servicios propios
  (farmacia, clima, agenda, tablas, repasos) y no hay publicidad ni trampas. **Lo que juega en
  contra**: 58% de lo indexable es de afuera de Balcarce (Economía 168, Política 143, Fútbol 132,
  Automovilismo 122, Argentina 86…) y 29% de las notas salen de **un solo medio**, que es lo más
  parecido a "reescribir una nota ajena". *Qué hacer*: no cambiar nada a ciegas; mirar en Search
  Console durante 4 semanas qué páginas se indexan y cuáles quedan en "Rastreada: actualmente sin
  indexar" (señal clásica de contenido de poco valor). Si el patrón se confirma, la salida es
  indexar sólo lo de Balcarce, lo propio y lo que cuentan dos medios o más (D2).
- **A2. Google Noticias / Discover y el contenido automático.** *Impacto: alto en tráfico
  potencial.* Publisher Center pide transparencia (fechas, autores, quién publica, contacto) y los
  sitios de noticias de IA suelen ser rechazados cuando no hay reporte original. Hoy el sitio
  cumple lo formal. No está claro que lo acepten. **Probar es gratis**, pero un rechazo no daña la
  búsqueda normal.

**B — Impacto alto y se arreglan**

- **B1. No hay lectura de Search Console.** Sin ella no se sabe qué indexó Google, qué consultas
  traen gente ni cómo están las Core Web Vitals en campo. *Arreglo*: mirar una vez por semana
  (trámite 1); la propuesta de leer su API por día está en `docs/historico/analiticas/ANALISIS.md` (11).
- **B2. Bing sin alta.** IndexNow avisa pero no hay panel. Bing alimenta Copilot y, en parte,
  ChatGPT. Desde febrero de 2026 su panel tiene un reporte de **citas de IA** ("AI Performance",
  *fuente secundaria*): es la única métrica pública de cuántas veces una IA los citó. *Arreglo*:
  trámite 2 (importar desde Search Console, 5 minutos).
- **B3. (Resuelto el 16/10, D5) 72% de los títulos de nota llevaban "…" en la etiqueta `<title>`.** Se cortan a 60
  caracteres para que Google no los corte a mitad de palabra (decisión del 29/09, cuando la marca
  "· Radar Balcarce" se sumaba al final). Hoy no hay marca y el corte explícito deja un título que
  parece incompleto: Google lo reescribe con más frecuencia y se pierden las palabras clave del
  final. *Recomendación*: usar el titular entero (Google corta solo en pantalla, y para eso no
  hace falta ayudarlo). Es invisible para el lector (sólo se ve en la pestaña del navegador);
  queda para confirmar porque cambia una decisión previa y una prueba (D5).
- **B4. (Resuelto el 16/10, D5) `author.name` con aclaración entre paréntesis.** Ver 2.3. Decisión editorial (D5).
- **B5. (Resuelto hoy) La imagen declarada de cada nota era siempre la tarjeta con el titular
  pegado**, y Discover pide fotos de 1200 px o más y evita las que tienen texto. Ahora se declara
  la foto (62% miden 1200 px o más) con su crédito y, detrás, la tarjeta.
- **B6. (Resuelto hoy) Los sitemaps listaban notas con `noindex`.** Search Console lo marca como
  error ("enviada pero con noindex"). En la práctica la portada nunca tiene notas sin cuerpo, así
  que era un riesgo y no un daño actual.

**C — Impacto medio o bajo**

- **C1. Tarjetas para compartir de 343 KB** (WhatsApp, Facebook). Ya estaba anotado como A8 en
  `PENDIENTES.md`. Bajarlas a menos de 300 KB (JPEG en vez de PNG) mejora la vista previa.
- **C2. Tipografías**: 196 KB entre las dos. Source Serif 4 en una sola variante o con menos
  pesos bajaría ~60 KB. Es del diseño: se consulta antes.
- **C3. Faltan** `ads.txt` (sólo si algún día hay AdSense) y `security.txt`. Ninguno afecta a
  Google; no se hicieron (el segundo vence y exige mantenimiento).
- **C4. La 404 tiene dos etiquetas `robots`** (`noindex` y la general `index, follow`). Google toma
  la más restrictiva y además el código es 404; sin consecuencias.
- **C5. El sitemap lleva `changefreq` y `priority`** que Google ignora. Ruido.
- **C6. Páginas 2, 3, 4… de cada sección** (94 URL en el sitemap) son listas de a 10 notas ya
  enlazadas desde el sitemap: de poco valor. Si Search Console las muestra como "sin indexar", se
  pueden sacar del sitemap.
- **C7. Farmacias y clima sin marcado.** `Pharmacy` (marcado de comercios de terceros) o
  `WeatherForecast` no dan resultados enriquecidos. No hacer: riesgo de parecer marcado
  engañoso por poco beneficio.
- **C8. Páginas de entidad apagadas** (`MOSTRAR_TEMAS = false` desde el 21/09). Un buscador no
  entiende un medio local por sus notas sueltas sino por temas que se repiten: "Autódromo Fangio",
  "Concejo Deliberante", "Club Ferroviarios". Reactivar enlaces es un cambio visible → consulta
  (D6).
- **C9. Los títulos de sección son pobres**: "Balcarce · Radar Balcarce" no dice "noticias". Un
  título como "Noticias de Balcarce · Radar Balcarce" es invisible para el lector y mejor para
  Google. Pendiente de decidir junto con B3.
- **C10. Si hay alguna vez dos medios que digan lo mismo con el mismo texto**: ya está resuelto
  por la fusión de repetidas (regla 171 y 175).

---

## 4. Lo que se implementó hoy (todo invisible para el lector)

| Qué | Dónde | Prueba |
|---|---|---|
| `robots.txt` con política de IA (`Content-Signal`, grupos de bots) | `web/lib/robots.js`, `web/app/robots.txt/route.js` (reemplaza `robots.js`) | `pruebas/seo-llm.test.mjs`, `seo-paginas.test.mjs` |
| JSON-LD del medio más completo (políticas, contacto, descripción) | `web/components/ficha.js`, `web/lib/datos-estructurados.js`; anclas en `quienes-somos` y `contacto` | `seo-llm.test.mjs` |
| JSON-LD de la nota: foto con tamaño real y crédito, lugar, palabras, autor con dirección | idem + `web/components/metadatos.js`, `web/lib/dimensiones-foto.js` | idem |
| Sitemaps sin `noindex` y con foto de cada nota | `web/app/sitemap.js`, `sitemap-news.xml/route.js`, `web/scripts/revisar-seo.mjs` | idem |
| `llms.txt` mejorado (cómo citar, servicios, datos para programas) | `web/app/llms.txt/route.js` | idem |
| Datos para agentes: `/agentes/ultimas.json`, `indice.json`, `servicios.json` | `web/lib/para-agentes.js`, `web/app/agentes/*/route.js`, `_headers` | idem |
| ~~Servidor MCP de sólo lectura (sin activar)~~ **borrado el 16/10** (commit `73be4c80`; ver 5.0) | `infra/mcp-cloudflare/` (ya no está) | `pruebas/mcp-worker.test.mjs` (ya no está) |
| IndexNow | ya estaba (regla 150) | `pruebas/indexnow.test.mjs`, y la nueva sobre la clave única |

Lo que **no** se tocó, por pedido: feed RSS y podcast; diseño y navegación visibles.

---

## 5. Servidor MCP y datos para agentes

### 5.0 Recomendación del 17/10/2026: no hace falta un MCP propio; alcanza con lo que hay

*Pregunta de Hernán: "No sé si hace falta un MCP propio para ubicar bien a Radar; analizalo." No se implementó nada. El Worker de abajo (5.1 a 5.4) **se borró en la limpieza del 16/10** (commit `73be4c80`: "servidor MCP escrito
y nunca activado"); está en el historial: `git show 73be4c80^:infra/mcp-cloudflare/worker.mjs` (648 líneas, 7 herramientas, 512 de pruebas). Lo de abajo se conserva como referencia de cómo se haría.*

1. **Hoy no.** ChatGPT, Gemini y Claude encuentran a un medio por la **búsqueda y el rastreo**: HTML con datos estructurados (`NewsArticle`), sitemap de noticias, `robots.txt` que deja entrar a los bots de búsqueda e IndexNow. Eso ya está (partes 1 a 4 y 11) y es lo que mueve citas y visitas.
2. **Un servidor MCP no se descubre solo:** quien lo quiere usar tiene que cargar su dirección a mano. En ChatGPT hace falta el modo desarrollador y un plan pago; en Claude, un conector personalizado de los planes pagos; para la aplicación común de Gemini no encontré el paso (Simon Willison, *Adding a custom MCP server to Claude and ChatGPT*; Kadoa; comparativas de julio de 2026: fuentes secundarias, 17/10/2026). Eso lo hace un técnico, no el vecino que pregunta qué farmacia está de turno.
3. **MCP no resuelve descubrimiento, ranking ni confianza:** sólo da un canal directo a quien ya nos eligió (Contexte Tech, RuntimeWire, 17/10/2026; secundaria). Medios con MCP encontré uno solo y es una agencia que lo vende a clientes (Reuters, según un agregador); de medios locales, ninguno.
4. **Su hermano más difundido, `llms.txt`, casi no se lee:** el 97 % de los archivos no recibió ni un pedido en mayo de 2026 (Ahrefs, 137.000 dominios, vía ppc.land, junio de 2026) y Google dice que lo ignora (fuente secundaria). Por eso esta auditoría ya decidió no hacer `llms-full.txt`.
5. **Lo que ya cubre la misma necesidad:** `/agentes/ultimas.json`, `indice.json` y `servicios.json` (`web/lib/para-agentes.js`), `llms.txt`, `/hoy` y `/sitemap-news.xml`: un script o un asistente con navegación tiene todo, sin servidor nuevo.
6. **Cuándo sí rehacerlo (revisar en enero de 2027):** (a) si Cloudflare muestra pedidos de agentes de IA a `/agentes/*` (más de ~100 por semana; hoy no se mide), (b) si un directorio de conectores (el registro oficial de MCP, el de Claude o el de ChatGPT) permite listarlo y que se instale con un clic, o (c) si el municipio o el Concejo quieren consultar al medio por asistente. Costaría ~1 hora restaurar el código borrado.
7. **Qué conviene hacer en su lugar** (gratis; recomendación general, sin fuente leída): una entrada de **Wikidata** y fichas de **Google Business Profile** y **Bing Places** para "Radar Balcarce" con el sitio y las redes (el marcado ya declara `sameAs`); Search Console y Bing Webmaster al día; y medir las visitas con *referer* de `chatgpt.com`, `perplexity.ai` y `gemini.google.com` en la pestaña Números.
8. **Riesgo de hacerlo ahora:** un servicio más para mantener y vigilar, otro punto de ataque (aunque sólo lee lo público) y asistentes que citen un resumen de IA sin remitir a la fuente.
9. **Qué se cambió en este documento:** D4 pasa de "sí, en 2 o 3 semanas" a "no por ahora"; el renglón 8 del plan queda descartado; el Worker figura como borrado.
10. **Respuesta corta:** no hace falta un MCP propio para que ubiquen bien a Radar; lo que ubica es el sitio bien marcado, citado y enlazado, y eso se sigue trabajando.

### 5.1 Qué es y para qué sirve

MCP (Model Context Protocol) es un estándar abierto con el que los asistentes de IA llaman a
"herramientas" de otros servicios. Si un asistente tiene configurado el servidor de Radar
Balcarce, puede **buscar notas, pedir la última hora, ver una sección, la agenda, la farmacia de
turno y el clima**, y devolverle al usuario la respuesta con el enlace y las fuentes. Es la
versión "programa a programa" de lo que hoy hacen las personas entrando al sitio.

**Beneficio real hoy**: bajo a medio. Los usuarios que conectan un servidor MCP son pocos y
técnicos; los demás asistentes llegan por búsqueda web. **Beneficio a años**: alto si el hábito de
"preguntarle al asistente" reemplaza a "abrir el diario", porque el medio que ya está
estructurado para eso (y citado con enlace) tiene ventaja. Costo de tenerlo listo: cero (plan
gratis de Workers: 100.000 pedidos por día).

### 5.2 Diseño

- **Un Worker de Cloudflare** (`infra/mcp-cloudflare/worker.mjs`), sin dependencias, sin base de
  datos, sin claves, sin tocar nada del sitio. Lee los tres JSON de `/agentes/` (armados en cada
  compilación) y la página de cada nota (el cuerpo está en su JSON-LD).
- **Protocolo**: MCP por HTTP sin sesiones, `POST /mcp`, respuestas en JSON. Habla las dos épocas
  del estándar a la vez: la actual (**2026-07-28**: sin `initialize`, cada pedido trae su versión
  en `_meta`, existe `server/discover`) y las anteriores (**2025-11-25**, 2025-06-18, 2025-03-26),
  que usan casi todos los clientes de hoy. Se validan los encabezados `MCP-Protocol-Version`,
  `Mcp-Method` y `Mcp-Name` contra el cuerpo y se devuelven los errores `-32020` y `-32022` que
  manda la especificación.
- **Siete herramientas**, todas con `readOnlyHint`: `ultimas_noticias`, `buscar_notas`,
  `noticias_por_seccion`, `obtener_nota`, `agenda_de_eventos`, `farmacia_de_turno`,
  `clima_de_balcarce`.
- **Para que citen bien**: cada nota trae `url`, `fuentes` (los medios originales), `redaccion`
  (quién la escribió) y un aviso de "resumen automático: remití a la fuente original". Las
  instrucciones del servidor (`instructions`) piden lo mismo y piden no inventar.
- **Datos para agentes en la web**: los tres JSON públicos sirven también sin MCP (un script, un
  asistente con navegación). Llevan `como_citar` y no llevan el cuerpo (el cuerpo se pide por
  `obtener_nota` y se lee de la página).

### 5.3 Seguridad y límites

| Riesgo | Cómo se atiende |
|---|---|
| Raspado masivo | Lo que devuelve **ya es público** en la web; el servidor sólo lo hace más cómodo. Límites: 20 notas por respuesta, 12.000 caracteres de cuerpo, 16 KB por pedido, caché de 5 minutos, binding de límite de pedidos (opcional, `LIMITADOR`) y regla de límite en el WAF (obligatoria al activar; LEEME paso 3) |
| Costos | Plan gratis; la caché hace que una ráfaga no llegue al origen (Cloudflare Pages también es gratis). Sin IA adentro: no gasta cupo de Gemini |
| Que lo usen para atacar a otros / SSRF | `obtener_nota` sólo abre `https://radarbalcarce.com/nota/…`; cualquier otra dirección da error (probado con `file://`, otros dominios, `http`, subdominios parecidos) |
| Navegadores maliciosos (DNS rebinding) | La especificación pide validar `Origin`. Se valida con una lista configurable; por defecto `*` porque no hay nada local ni credenciales que robar (documentado en `wrangler.toml`) |
| Inyección de instrucciones en lo que devolvemos | Las notas son texto de nuestra IA verificado contra fuentes; el servidor no tiene ninguna herramienta que escriba, borre o gaste. Aun así un asistente que lee texto ajeno puede ser engañado: por eso todo viene marcado como datos con su fuente |
| Que los asistentes citen mal | No se puede controlar lo que hagan después. Se baja el riesgo con la firma, el aviso, las fuentes y los enlaces en cada resultado. Medir: buscar con frecuencia qué dicen los asistentes de Radar Balcarce |
| Estado "sin activar" | Sin rutas, sin dominio, `workers_dev = false`, ningún workflow lo sube; una prueba lo vigila |

### 5.4 Qué falta para activarlo (pasos en `infra/mcp-cloudflare/LEEME.md`)

1. Esperar al próximo despliegue del sitio (publica los JSON).
2. `npx wrangler deploy` desde la cuenta `radarbalcarce@gmail.com`.
3. Regla de límite en el WAF.
4. Dominio `mcp.radarbalcarce.com` (descomentar una línea).
5. Probar con el inspector oficial y con un asistente.
6. Poner la dirección en `MCP_URL` de `llms.txt` y registrarlo en `docs/08-INFRAESTRUCTURA.md`.

**Si crece**: Cloudflare recomienda `createMcpHandler` con el SDK oficial de MCP para servidores
nuevos (`McpAgent` quedó congelado). Este Worker es mínimo a propósito, como el resto del
repositorio (sin dependencias); migrar es cuestión de reemplazar el despacho.

### 5.5 Otras cosas que existen y por qué no se usan

- **NLWeb (Microsoft)**: proyecto abierto para preguntarle en lenguaje natural a un sitio (cada
  instancia es también un servidor MCP). Necesita un índice vectorial y un modelo de lenguaje
  propios: costo y complejidad que acá no se justifican; el MCP sencillo alcanza. Se revisa en un
  año.
- **WebMCP (Google y Microsoft, W3C)**: las páginas le exponen herramientas al navegador del
  usuario. En prueba de origen en Chrome; la interfaz cambió de nombre en 2026 *(fuente
  secundaria)*. John Mueller lo prefiere a `llms.txt`. Para un diario no hay acciones que ofrecer
  (no se compra ni se reserva nada). No hacer.
- **`/.well-known/mcp` (descubrimiento)**: todavía no está estandarizado.
- **"Markdown for Agents" de Cloudflare** (convierte el HTML a Markdown cuando el cliente lo
  pide): si el plan lo ofrece, es un interruptor en el panel que no cuesta nada. Verificar en
  Cloudflare → radarbalcarce.com → Speed / Optimization.

---

## 6. Plan priorizado

| # | Qué | Esfuerzo | Quién | Impacto |
|---|---|---|---|---|
| 1 | Mirar Search Console una vez por semana: páginas indexadas, "rastreada sin indexar", Core Web Vitals, consultas (A1, B1) | 15 min/semana | Ustedes | Muy alto: decide todo lo demás |
| 2 | Alta en Bing Webmaster Tools (importar de Search Console) y mirar "AI Performance" | 10 min | Ustedes | Alto |
| 3 | Dentro de 4 semanas, decidir D2 (indexar sólo lo de Balcarce y lo con respaldo) con los datos del paso 1 | 1 hora | Hernán + Claude | Muy alto |
| 4 | Decidir D1 (entrenamiento de IA) y D5 (título entero, autor) | 15 min | Hernán | Medio |
| 5 | Publicar la página "Quién escribe y cómo corregimos" (política editorial y de IA, registro de correcciones, responsables con apellido si quieren) y enlazarla en el pie (D6) | 2 horas | Claude, tras aprobación | Alto para E-E-A-T y Publisher Center |
| 6 | Reactivar las páginas de tema/entidad con enlaces discretos (C8, D6) | 3 horas | Claude, tras aprobación | Alto a años |
| 7 | Solicitar Google Publisher Center (D7) | 30 min | Ustedes | Incierto, gratis |
| 8 | ~~Activar el MCP (D4)~~ **descartado por ahora** (5.0), revisar en enero de 2027 | 1 hora | Ustedes + Claude | Bajo hoy, alto a años |
| 9 | Tarjetas de compartir < 300 KB (C1) y tipografías más livianas (C2) | 3 horas | Claude | Medio |
| 10 | Conseguir 5 a 10 enlaces de sitios de Balcarce (municipio, Cámara de Comercio, clubes, escuelas, bibliotecas): "Radar Balcarce" en sus páginas de links | Continuo | Ustedes | El que más mueve en SEO local |
| 11 | Revisar este informe cada 3 meses: Google cambia sus guías de IA seguido (la de optimización es de mayo de 2026 y ya se actualizó) | 1 hora | Claude | Mantenimiento |

---

## 7. Trámites que hacen ustedes

Ninguno cuesta plata. Todos con la cuenta `radarbalcarce@gmail.com`.

1. **Search Console** (ya verificado el 24/09): <https://search.google.com/search-console>.
   Mirar: *Páginas* (cuántas indexadas, motivos de las no indexadas), *Sitemaps* (los dos deben
   decir "Correcto"), *Experiencia > Core Web Vitals*, *Rendimiento* (consultas y páginas), *Discover*
   (cuando haya datos). Revisar en *Seguridad y acciones manuales* que no haya avisos.
2. **Bing Webmaster Tools**: <https://www.bing.com/webmasters> → *Importar sitios* → Google
   Search Console. Después: *Informes > AI Performance* (citas de Copilot), *IndexNow*.
3. **Google Publisher Center**: <https://publishercenter.google.com> (opcional, D7). Cargar el
   sitio, el logo (`/icon-512.png`) y las secciones. Requiere la página de políticas visible (D6).
4. **Botón "Fuentes preferidas" de Google**: permite que un lector marque a Radar Balcarce como
   fuente preferida para Noticias destacadas; el botón es un código que se pega en la página
   (ver la documentación en <https://blog.google/products/search/preferred-sources/>). Es
   **visible** → se consulta antes (D6). Sólo sirve a quien ya los conoce.
5. **Google Business Profile**: no corresponde (parte 2.6), salvo oficina con atención al público.
6. **Enlaces de otros sitios**: ver plan, paso 10.
7. **Cloudflare**: (a) en la sección *Security / Bots* del panel (los nombres exactos cambian: "AI Crawl Control",
   "Block AI bots", "robots.txt administrado"): confirmar que **no** estén activados el bloqueo de
   bots de IA ni el robots.txt administrado (pisaría la política); (b) *Analytics > AI Crawl Control* muestra qué bots de IA
   vienen de verdad y cuánto; (c) al activar el MCP, la regla de límite en *Security > WAF*; (d)
   opcional: *Caching > Cache Rules* para guardar el HTML 5 minutos en el borde.
8. **Directorios de MCP** (cuando se active): <https://registry.modelcontextprotocol.io>.
9. **Vistas previas**: probar una nota en el depurador de Facebook
   (<https://developers.facebook.com/tools/debug/>) y en el validador de datos estructurados
   (<https://search.google.com/test/rich-results>) una vez que el cambio de hoy esté publicado.

---

## 8. Cómo se mide si sirve

| Qué | Dónde | Meta (3 meses) |
|---|---|---|
| Páginas indexadas / enviadas | Search Console → Páginas | Más del 70% de las notas del sitemap |
| Clics e impresiones de Google | Search Console → Rendimiento | Crecimiento semanal sostenido |
| Notas en Noticias / Discover | Search Console → Discover y Noticias | Alguna impresión |
| Citas de IA | Bing → AI Performance; Cloudflare → AI Crawl Control | Algún dato |
| Visitas desde asistentes de IA | Cloudflare Web Analytics (referrers chatgpt.com, perplexity.ai, claude.ai) | Ver si aparecen |
| Velocidad en campo | Search Console → Core Web Vitals | LCP < 2,5 s, CLS < 0,1, INP < 200 ms |
| Uso del MCP (si se activa) | Cloudflare → Workers → radar-balcarce-mcp | Pocos pedidos sin picos raros |

---

## 9. Decisiones para Hernán

- **D1. ¿Dejamos que las IA se entrenen con el sitio?** *Hoy: sí* (todos los bots permitidos).
  Alternativa: cerrar sólo el entrenamiento (`GPTBot`, `ClaudeBot`, `Google-Extended`,
  `Applebot-Extended`, `CCBot`, `Meta-ExternalAgent`, `Amazonbot`, `Bytespider`) y dejar abiertos
  los buscadores y asistentes. *Recomendación*: dejarlo abierto hasta que el medio sea conocido;
  se cambia con una línea (`ENTRENAMIENTO_IA = false` en `web/lib/robots.js`).
- **D2. ¿Indexamos sólo lo de Balcarce y lo propio?** Resolver con datos en 4 semanas (plan,
  paso 3). La opción fuerte es poner `noindex` a lo nacional con una sola fuente. Se pierde esa
  parte del tráfico potencial, se protege el resto del sitio.
- **D3. ¿Las fotos van al sitemap de imágenes?** *Hoy: sí* (62% son de 1200 px o más, y siempre
  con crédito). Ayuda a Google Imágenes y Discover; también deja que otros medios vean sus fotos
  ahí. Para sacarlo: borrar `images: [foto]` en `web/app/sitemap.js`.
- **D4. ¿Activamos el MCP?** *(17/10/2026: no por ahora, ver 5.0; el Worker se borró el 16/10.)* Recomendación de entonces: **sí, en 2 o 3 semanas**, después de ver los números
  de Search Console y con la regla de límite puesta. Nada de lo que hoy hay en la web cambia.
- **D5. (HECHA el 16/10/2026) Título de las notas y firma del autor en el marcado.** (a) Que la etiqueta `<title>`
  lleve el titular entero y no cortado con "…"; (b) que `author.name` sea sólo "Radar Balcarce" y
  la aclaración "escrita con IA y verificada" pase a una propiedad aparte (la firma del lector no
  cambia). Los dos son invisibles; cambian una decisión y una prueba previas.
  *Hecho (Hernán y Andrés: "lo que digas que es mejor"):* (a) `<title>`, `og:title` y `twitter:title` llevan el
  titular entero; " · Radar Balcarce" se suma detrás sólo si todo junto no pasa de 70 caracteres; la meta description
  va entera hasta ~160 caracteres y, si es más larga, se corta en un final de oración (o en una palabra entera con "…").
  (b) `author.name` = "Radar Balcarce" con `author.url` a "Quiénes somos"; la aclaración de la IA pasó a
  `author.description` y a `publishingPrinciples` de la nota (apunta a "Cómo trabajamos"). La firma visible no cambió.
  Ver regla 177 (6) en `docs/historico/REGLAS-1-A-327.md` (hoy en la R30 de `docs/10-REGLAS-Y-PRUEBAS.md`).
- **D6. Páginas visibles que conviene sumar** (se proponen, no se hicieron): "Quién escribe y
  cómo corregimos" (política de IA, fuentes, registro público de correcciones, y responsables:
  ¿con apellido?); un enlace discreto en el pie; reactivar temas y entidades; el botón de fuentes
  preferidas.
- **D7. Publisher Center**: probar o no. Riesgo: ninguno para la búsqueda normal.
- **D8. Datos legales del medio** (nombre de la razón social o del responsable, ciudad, número de
  registro si lo hay): son los que Google pide para evaluar confianza (los usarían `ownershipFundingInfo`
  y la página de D6). Qué publicar es cosa de ustedes.

---

## 11. Ronda 2 (17/10/2026): mapas, marcado, velocidad, nota, /hoy y canales

*Pedido de Hernán: "mejorá todo lo que puedas, innová; cuando quede todo bien hacemos publicidad". Sin costo nuevo. Se hizo lo que no cambia la
estructura visible (reglas 250 a 257); la portada nueva queda como vista previa para elegir (`docs/diseno/VISTA-PREVIA-PORTADA-2.html`).*

### 11.1 Lo que se hizo

| # | Qué | Dónde | Prueba |
|---|---|---|---|
| 1 | **Mapa de noticias** con `<news:news>` (publicación, idioma, fecha con zona, título): últimas 48 horas, hora real, sin `noindex`, hasta 1.000, más nuevas primero. **Índice de mapas** `/sitemap-index.xml`; `robots.txt` anuncia los tres. `sitemap.xml` NO se convirtió en índice: el vigilante de Cloudflare lee su `<lastmod>` | `web/lib/sitemap-noticias.js`, `web/app/sitemap-news.xml/`, `web/app/sitemap-index.xml/`, `web/lib/robots.js` | `sitemaps-noticias.test.mjs`; `revisar-seo.mjs` mira el compilado |
| 1b | **IndexNow verificado**: la clave publicada, el aviso después de cada subida en los tres caminos (`actualizar.yml`, `cloudflare-deploy.yml`, el motor de Cloudflare) y nada con `noindex`. No se tocó | `redes/indexnow.mjs` | `indexnow.test.mjs` y la nueva |
| 2 | **Datos estructurados**: `publisher` completo (nombre, dirección, logo 512) en cada `NewsArticle`; la foto de la nota, no la tarjeta del sitio, primera en el marcado de las notas archivadas; `CollectionPage` + `ItemList` en cada sección; `sameAs` con los canales si existen; `dateModified` sube con una corrección a mano. Ya estaban `headline`, `image`, `datePublished`, `author`, `description`, `isAccessibleForFree` y las migas | `web/lib/datos-estructurados.js`, `web/components/ficha.js` | `seo-fichas-17-10.test.mjs` |
| 2b | **Títulos y descripciones de sección** (C9): "Salud en Balcarce: hospital y vacunas · Radar Balcarce" en vez de "Salud · Radar Balcarce", para las 14 secciones (Educación, Salud, Ciencia y Tecnología e IA incluidas); la descripción suma titulares enteros, nunca uno cortado | `tituloDeSeccion`, `descripcionDeSeccion` (`web/lib/datos.js`) | idem |
| 2c | **Open Graph/Twitter con la imagen de cada nota**: la tarjeta propia (la de la portada y las de redes) y su foto detrás si mide 1200 px o más; las notas archivadas comparten su foto con el tamaño real (antes, la tarjeta del sitio, igual para todas); `article:tag` | `imagenesParaCompartir`, `web/app/nota/[id]/page.js` | idem; `revisar-seo.mjs` controla que la foto exista |
| 3 | **Velocidad**: control del HTML compilado: toda imagen con ancho y alto, una sola prioritaria (`fetchpriority="high"`) y el resto `loading="lazy"`, ningún recurso de otro dominio, ninguna tipografía de Google, scripts `async`. Se arregló lo que faltaba (postales, destacada, logo de aviso). **WebP no**: cada copia suma archivos al tope de 20.000 de Cloudflare Pages; mejor cuando las fotos vivan en R2 | `web/lib/auditoria-html.js`, `web/scripts/revisar-seo.mjs` | `velocidad-html.test.mjs` (con el HTML de verdad si está compilado) |
| 4 | **Nota**: "Publicado" y, si una persona la corrigió más de media hora después, "Actualizado" (la fecha de la nota no se mueve: regla de una sola fecha); **fuente original a la vista** con enlace; WhatsApp como **enlace común** (anda sin JavaScript, con la dirección canónica) y "Copiar enlace"; "Avisanos" de un error | `web/components/piezas.js`, `compartir.js`, `copiar-enlace.js`, `web/lib/tiempo.js`, `web/lib/archivo.js` | `nota-del-lector-17-10.test.mjs` |
| 5 | **`/hoy`**: lo de Balcarce primero, lo más contado, farmacia de turno y agenda de hoy, con el día en el título y en la tarjeta; en el sitemap y el pie | `web/app/hoy/`, `web/lib/hoy.js` | `hoy.test.mjs` |
| 7 | **Cómo trabajamos** completado en `/quienes-somos` y un camino claro de correcciones (el correo y el WhatsApp que ya existían) | `web/app/quienes-somos/page.js`, `web/app/contacto/page.js` | `como-trabajamos.test.mjs` |
| 8 | **Canales** (WhatsApp, Telegram, Bluesky): sólo si se carga la variable `WHATSAPP_CANAL_URL`, `TELEGRAM_CANAL_URL` o `BLUESKY_URL` | `web/lib/canales.js`, `web/components/canales.js`, los workflows | `canales-del-medio.test.mjs` |

### 11.2 Lo que se propone y no se hizo

- **6. Etiquetas por barrio, calle y ruta.** Ya hay un mecanismo (`/tema/ranura`, `TEMAS` en `ingesta/fuentes.mjs`), pero: (a) está apagado (`MOSTRAR_TEMAS = false`)
  y las páginas de tema no están en el sitemap a propósito (son finas); (b) sólo mira las notas de las últimas 36 horas, no el archivo; (c) no hay una lista cerrada de
  barrios ni de calles (`ingesta/perfil-balcarce.md` nombra las localidades del partido y dos rutas); (d) lo que habría que sumar a `TEMAS` es de la selección editorial.
  Notas con ese lugar en el título, la bajada o el cuerpo, en las 1.296 que tenía el repositorio el 17/10: Napaleofú 1, Ramos Otero 2, San Agustín 3 (ambigua con otros San
  Agustín), Los Pinos 8 (ambigua), Laguna La Brava 3, Cerro El Triunfo 8, ruta 226 13, ruta 55 4, hospital 21, autódromo 105 (esas cuatro últimas ya son temas). *Qué hace falta*:
  una lista cerrada de lugares aprobada por Hernán (con barrios y calles de verdad, y con la regla de las localidades ambiguas de la regla 179), que las páginas de tema lean
  el archivo y no sólo la portada, un mínimo de 3 notas para generar la página, y decidir si se enlazan (cambio visible: se consulta). Con 1 o 2 notas por lugar hoy serían
  páginas finas que Google puede tomar por contenido de poco valor (A1): se hace cuando haya volumen.
- **Portada más visual**: dos propuestas en `docs/diseno/VISTA-PREVIA-PORTADA-2.html`, para elegir.
- **Fotos en tres tamaños y WebP**: sólo cuando las fotos estén en R2 (`FOTOS_BASE`).
- **Registro público de correcciones** (D6): sigue sin hacerse; la página dice que hoy no hay. Lo único que se ve es "Actualizado" en la nota corregida.

### 11.3 Para decidir (Hernán)

- **D9. ¿Va bien el compromiso de "Si no querés que usemos algo"?** La página dice que, si un medio o autor lo pide, se revisa y "si corresponde" se saca el contenido o se deja de usar la fuente. Es una promesa editorial: confirmar o cambiar el texto.
- **D10. ¿"Actualizado" sólo por correcciones de una persona?** Hoy es así (no por una nueva versión de la fuente ni por arreglos de ortografía de la auditoría). Un cambio chico: una nota cuyo cuerpo escribió una persona horas después de aparecer puede mostrar "Actualizado".
- **D11. Enlaces nuevos en el pie**: "Lo de hoy" y "Cómo trabajamos" (menores; se sacan con una línea).
- **D12. ¿Un enlace a `/hoy` desde la portada?** No se hizo (la portada y el menú no se tocan sin vista previa).

### 11.4 Trámites nuevos (de ustedes, sin costo)

1. Search Console y Bing: cargar `https://radarbalcarce.com/sitemap-index.xml` (opcional: ya tienen los otros dos).
2. Crear el canal de WhatsApp, y si quieren el de Telegram y la cuenta de Bluesky, y cargar la dirección en GitHub → Settings → Secrets and variables → Actions → **Variables**
   (`WHATSAPP_CANAL_URL`, `TELEGRAM_CANAL_URL`, `BLUESKY_URL`); si el motor corre en Cloudflare, las mismas variables en su configuración. Sin variable no aparece nada.
3. Google Publisher Center (D7): el mapa de noticias sólo cuenta si el sitio está aceptado en Noticias; mientras tanto no hace daño.

## 10. Fuentes consultadas (16/10/2026)

**Google**
- Cómo aparecer en las funciones de IA de Google (actualizada 10/12/2025): <https://developers.google.com/search/docs/appearance/ai-features>. Dice que no hacen falta archivos ni marcado nuevos.
- Políticas de spam (actualizada 28/08/2026): <https://developers.google.com/search/docs/essentials/spam-policies>
- Datos estructurados de `Article` (actualizada 08/09/2026): <https://developers.google.com/search/docs/appearance/structured-data/article>
- Sitemap de noticias: <https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap>
- Discover (actualizada 09/03/2026): <https://developers.google.com/search/docs/appearance/google-discover>
- Políticas de contenido de Google Noticias: <https://support.google.com/news/publisher-center/answer/6204050>
- Rastreadores de Google (12/06/2026): <https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers>
- Fuentes preferidas: <https://blog.google/products/search/preferred-sources/>
- Perfil de empresa, directrices: <https://support.google.com/business/answer/3038177>
- Guía de IA de Mayo/2026 y opinión sobre `llms.txt` *(fuentes secundarias)*: <https://www.searchenginejournal.com/google-says-llms-txt-is-purely-speculative-for-now/577576/> · <https://www.techwyse.com/news/ai-search/google-ai-search-optimization-guide-llms-txt-lighthouse-audit>

**Otros buscadores y operadores de IA**
- IndexNow: <https://www.bing.com/indexnow/getstarted>
- Bing, reporte de citas de IA *(secundaria)*: <https://searchengineland.com/bing-webmaster-tools-testing-new-ai-performance-report-468039>
- OpenAI, bots: <https://developers.openai.com/api/docs/bots>
- Anthropic, rastreadores: <https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler>
- Perplexity: <https://docs.perplexity.ai/guides/bots>
- Cloudflare, política de señales de contenido: <https://blog.cloudflare.com/content-signals-policy/> · robots.txt administrado: <https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/>
- IETF `aipref` (borrador): <https://datatracker.ietf.org/doc/draft-ietf-aipref-attach/>

**MCP y agentes**
- Especificación 2026-07-28, cambios: <https://modelcontextprotocol.io/specification/2026-07-28/changelog>
- Transporte Streamable HTTP: <https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http>
- Versiones y compatibilidad: <https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning>
- Herramientas: <https://modelcontextprotocol.io/specification/2026-07-28/server/tools> · Descubrimiento: <https://modelcontextprotocol.io/specification/2026-07-28/server/discover>
- MCP en Cloudflare Workers: <https://developers.cloudflare.com/agents/model-context-protocol/transport/> · Límite de pedidos: <https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/>
- NLWeb: <https://news.microsoft.com/source/features/company-news/introducing-nlweb-bringing-conversational-interfaces-directly-to-the-web/> · <https://github.com/microsoft/NLWeb>
- WebMCP *(secundaria)*: <https://www.eweek.com/fr/news/google-webmcp-chrome-ai-web-standard-preview/>

---

## Anexo — Evidencia cruda

- `GET /robots.txt` antes de hoy: `User-Agent: *`, `Allow: /`, `Disallow: /panel/`, dos `Sitemap:`.
- `GET /llms.txt`: 1.687 bytes; `GET /llms-full.txt`: 404.
- `GET /sitemap.xml`: 278.234 bytes, 1.245 `<url>`; `sitemap-news.xml`: 22 KB.
- Notas ofrecibles en el repositorio al 15/10: 1.124 de 1.131; de acá 41% (457) + 1% de la zona;
  medios por nota: 0 → 53, 1 → 321, 2 o más → 750; escritas con IA 1.006, texto de la fuente 118;
  con foto 78%; mediana 116 palabras de cuerpo; títulos de más de 60 caracteres 72%.
- Fotos del banco (864): 536 de 1200 px o más con proporción de fotografía, 250 medianas, 78
  chicas; promedio 72 KB.
- Nota de ejemplo en el navegador: 383 KB, 16 pedidos, primer byte 578 ms (la primera vez, con
  conexión nueva), carga 1,27 s, CLS 0.
- Encabezados: HSTS, `nosniff`, `frame-ancestors`, `referrer-policy`; HTML con Brotli y HTTP/3;
  fotos y CSS con caché del borde (`HIT`); el HTML se sirve `DYNAMIC` (sin caché del borde).
- Bots con nombre falsificado: 13 de 13 reciben 200.

## 12. Lo básico del SEO del sitio: qué está hecho, cómo se audita y qué cuidar

*Antes era `SEO.md`, en la raíz (actualizado el 16/10/2026); se unió acá el 25/10/2026. Lo que falta, con quién y qué urgencia, vive en `PENDIENTES.md`.
Desde entonces cambió: los mapas del sitio están partidos por mes y el del archivo en R2 se anuncia aparte (regla 321, prendidos el 25/10:
`docs/auditoria-2-0/R-SEO-TECNICO-24-10.md`), y las plantillas que se repiten llevan `noindex` (`web/lib/indexacion.js`).*

| Tema | Cómo está | Dónde |
|---|---|---|
| **Direcciones fijas** | `/nota/titulo-de-la-nota-id`, fija desde la primera vez que sale aunque cambie el titular. La 404 rescata direcciones viejas por el identificador (`/nota/indice.json`); lo que sale del sitio lo sirve el archivo en R2 con la misma dirección | `web/lib/ruta.js`, `web/lib/archivo.js`, `pruebas/archivo.test.mjs` |
| **Redirecciones 301** | Se escriben en cada compilación en `web/public/_redirects`: las direcciones viejas de las notas (`/nota/id`) y de las secciones y las notas repetidas (la que se retira redirige a la que queda: `web/lib/repetidas.js`, `web/data/fusionadas.json`). `www` va al dominio sin `www` (regla de Cloudflare; el vigilante avisa si deja de andar) | `web/scripts/generar-redirects.mjs`, `pruebas/redirects.test.mjs` |
| **Sitemaps** | `sitemap-index.xml` (lista `sitemap.xml`, `sitemap-news.xml` y un mapa de notas por mes), `sitemap-news.xml` (formato Google News, últimas 48 horas) y el del archivo, `nota/sitemap-archivo.xml`. Enviados a Search Console | `web/app/sitemap.js`, `web/lib/sitemap-sitio.js`, `web/app/sitemap-notas/`, `infra/archivo-cloudflare/worker.mjs` |
| **`robots.txt`** | En el dominio propio permite todo menos **`/panel/`** y declara la política hacia las IA (`Content-Signal`, bots nombrados). Fuera del dominio propio (vistas previas) prohíbe indexar | `web/app/robots.txt/route.js`, `web/lib/robots.js`, `web/lib/sitio.js` |
| **Canónico** | Siempre `https` y sin `www`; cada página declara el suyo y sólo la portada es `/` | `web/lib/sitio.js`, `web/components/metadatos.js`, `pruebas/seo.test.mjs` |
| **Título, descripción y `h1`** | Propios en la portada, cada sección, cada tema y cada nota; el título de una nota se corta en 60 caracteres y la descripción en 155 (`recortarEn`, `web/lib/texto.js`) | `pruebas/seo-paginas.test.mjs` |
| **Datos estructurados** | `NewsArticle` en cada nota (el autor dice lo mismo que la firma), `NewsMediaOrganization` con logo, `WebSite` y `BreadcrumbList` | `web/components/ficha.js`, `web/lib/datos-estructurados.js` |
| **Imagen para compartir** | Una tarjeta de 1200 × 630 por nota y otra de 1080 × 1350 para Instagram, con la foto del banco si hay (sin marca de agua ni crédito adentro) o la banda de color | `web/lib/tarjeta.js`; medidas en `FORMATOS.md` |
| **Íconos y manifiesto** | `favicon.ico`, `icon-192`, `icon-512`, `apple-touch-icon` y `manifest.webmanifest` | `web/public/`, `web/scripts/hacer-iconos.mjs` |
| **Páginas de servicio y de confianza** | `/farmacias`, `/clima`, `/dolar` (nunca dice "en vivo"), `/agenda`, `/util`; "Quiénes somos", "Contacto" y la política de privacidad, enlazadas desde el pie | `web/app/` |
| **Notas con cuerpo** | Una nota automática sin cuerpo de 70 palabras no se publica. Las viejas con "EN VIVO" o "minuto a minuto" en el título se retiran solas (`diceEnVivo`) | `web/lib/cuerpo.js`; R17 de `docs/10-REGLAS-Y-PRUEBAS.md` |
| **Encabezados** (`_headers`) | HSTS, `nosniff`, `frame-ancestors`; caché de un año para `/_next/static` y de una semana para las fotos; el panel del celular, con su propia política de seguridad | `web/public/_headers`, `pruebas/seo-paginas.test.mjs` |
| **Idioma y accesibilidad básica** | `lang="es-AR"`, etiquetas de sección con contraste de al menos 4,5:1, el buscador con nombre para lectores de pantalla | `pruebas/seo-paginas.test.mjs` |
| **Feed y `llms.txt`** | `feed.xml` (RSS) y una descripción del sitio para buscadores con IA | `web/app/feed.xml/`, `web/app/llms.txt/` |
| **Search Console y analítica** | Dominio verificado con un registro TXT en Cloudflare (24/09). Cloudflare Web Analytics, gratis y sin cookies (`CLOUDFLARE_ANALYTICS_TOKEN`) | `radarbalcarce@gmail.com` |

**Cómo se audita.** En cada compilación, `web/scripts/revisar-seo.mjs` (título, descripción, canónico y `h1` de las páginas generadas). A demanda,
`node web/scripts/auditar-seo-vivo.mjs [url]` revisa lo publicado (título, descripción, `h1`, canónico, ícono, imagen para compartir).

**Reglas a cuidar.** No cambiar la dirección de una nota sin redirección 301. Una nota repetida no se borra: se une a la que queda y redirige
(`web/data/fusionadas.json`). No indexar la web desde una dirección que no sea `radarbalcarce.com` (`web/lib/sitio.js` lo evita solo). El canónico
apunta siempre al dominio sin `www`.
