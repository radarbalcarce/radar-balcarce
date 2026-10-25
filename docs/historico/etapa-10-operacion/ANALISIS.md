# Etapa 10 · Operación: sacar el robot de GitHub y llevarlo a Cloudflare

*Auditoría del 15/10/2026. Sólo se leyó, se midió y se escribió acá: no se tocó ningún archivo existente ni se hizo commit. Meta de los dueños (15/10): "mucho menos GitHub y mucho más Cloudflare, que la página dure años", repositorio privado más adelante, todo el proyecto dentro de un tope de unos US$ 25 por mes, con Cloudflare Workers Paid (US$ 5) ya contratado.*

*17/10/2026: los programas de esta medición (`*.cjs`) y los datos crudos (`runs-14d.ndjson`, `pruebas-tiempos.csv`, `pruebas-inventario.txt`, `pruebas-cabeceras.txt`, `extra-redes-y-fallas.txt`) se borraron en la limpieza final (quedan en el historial de git). Quedan `pruebas-clasificadas.csv` y `pruebas-nucleo.txt`: respaldan el recorte de pruebas que todavía tienen que aprobar los dueños (`docs/COMO-FUNCIONA-HOY.html` § 13).*

**Cómo leer las marcas.** **[MEDIDO]** salió de las corridas reales de GitHub (los números están en esta carpeta). **[DOCS 15/10]** lo confirmé hoy en la documentación oficial de Cloudflare o GitHub (la leyó un modelo chico que resume la página: conviene que una persona mire las cifras clave antes de firmar algo). **[NO VERIFICADO]** es memoria o suposición mía: hay que probarlo antes de apostar a eso.

---

## 0. En diez líneas (y qué hay que decidir)

1. **Hoy GitHub gasta unos 13.700 minutos reales por mes (unos 19.000 si GitHub redondea cada corrida al minuto)** [MEDIDO]. En privado costaría **entre US$ 70 y US$ 136 por mes**, según el precio del minuto (US$ 0,006 según la página de GitHub de hoy; ustedes usaron 0,008) y el redondeo. Los "US$ 100" de ustedes están en el medio. Es 3 a 5 veces el tope total.
2. **Dos tercios de ese gasto son desperdicio que se arregla sin mudar nada**: "Cloudflare Pages" vuelve a compilar el mismo sitio que "Actualizar la web" ya compiló (2,4 minutos × 48 veces por día) y se corren 2.000 pruebas antes de cada vuelta.
3. **Las pruebas ya congelaron la web**: el 11/10, de 13:00 a 20:00 (hora de Balcarce) la web no se actualizó 7 horas porque falló una prueba de *diseño de las escenas de video*, no de una noticia. El 4/10, 12 horas por una página vacía.
4. **No hay respaldo real fuera de GitHub**: el workflow "Respaldo" corre, pero GitLab y R2 nunca se configuraron (no existen `GITLAB_TOKEN` ni `R2_RESPALDOS`); lo único que hay es un artefacto de 90 días dentro de GitHub. Esto hay que arreglarlo **antes** de mover nada.
5. **Todo lo que no es video cabe en Cloudflare**: leer feeds, cruzar, IA, verificar, publicar en Meta, vigilar, panel, pistas, auditoría. **El video con ffmpeg no cabe en un Worker**: necesita un contenedor de Cloudflare o un "runner" aparte (propuesta: un repositorio público chico, sin secretos, sólo para renderizar).
6. **Repositorio privado y gratis se logra en la fase 4**, cuando "Actualizar la web" deje de correr en GitHub. Antes de eso, no cierra.
7. **El sitio puede dejar de "compilarse" cada media hora**: hoy son 1.687 páginas y 5.109 archivos (de un tope de 20.000) que se rearman y se vuelven a subir. Propongo que un Worker arme las páginas al pedirlas desde una base (D1) y deje las fotos en R2: se acaban el tope de 20.000 archivos, el de 2.000 redirecciones y el de 3.500 notas, y los enlaces de las notas siguen idénticos.
8. **Costo estimado de Cloudflare en régimen: US$ 5 a 8 por mes** (el Workers Paid ya pago, más centavos de uso y, si se elige contenedor para el video, unos US$ 0 a 3) [estimación].
9. **Riesgo principal**: reescribir ~100 archivos que hoy leen y escriben archivos del disco, y que los medios bloqueen a Cloudflare (hoy ya fallan unas 65 de 236 fuentes desde GitHub). Se baja con un sondeo previo y con migrar por etapas, dejando siempre GitHub como plan B.
10. **Pruebas**: de 169 archivos / 2.039 pruebas, propongo una "suite magra" de 44 archivos / 583 pruebas para proteger lo legal y lo que ya se publicó mal, y borrar 13 archivos (157 pruebas) de código muerto. Ahorro: ~1.200 minutos/mes de Actions y, sobre todo, se terminan los congelamientos por detalles.

**Decisiones que necesito de ustedes** (resumen; el detalle está en la sección 9):
A) ¿Se aprueba el orden: respaldo → sacar desperdicio → vigilancia/redes/panel a Workers → motor a Workers → sitio desde D1 → repo privado?
B) Video: ¿contenedor de Cloudflare (todo en una cuenta, algo más caro y más nuevo) o repo público de render sin secretos (gratis, pero GitHub sigue en el medio)?
C) ¿Se acepta una pausa de pocas horas en dos momentos (fase 4 y fase 5)? Ya dijeron que sí a pausas cortas el 15/10.
D) ¿Se aceptan las pruebas magras y borrar el panel de la PC y `comercial/`?
E) Cuenta de GitHub: ¿qué plan tiene `radarbalcarce@gmail.com` (Free = 2.000 min incluidos, Pro = 3.000)?

---

## 1. Qué usa GitHub Actions de verdad

### 1.1 Cómo se midió

`gh api repos/radarbalcarce/radar-balcarce/actions/runs` día por día, del 1 al 14 de octubre (14 días completos). `gh run list --limit 500` sólo alcanza para 1,7 días porque "Redes" corre unas 124 veces por día, por eso se paginó por fecha. Minutos reales = hora de última actualización − hora de arranque de la corrida. "Facturables" = lo mismo pero redondeando cada corrida hacia arriba al minuto (cada workflow tiene un solo job, así que equivale a redondear por job; **GitHub históricamente redondea así, pero la página de precios que consulté hoy no lo aclara** [NO VERIFICADO]). Los scripts y los datos crudos están en esta carpeta (`medir-minutos.cjs`, `runs-14d.ndjson`, `tabla-minutos-14d.md`). Las cuentas se pueden repetir con `node medir-minutos.cjs runs-14d.ndjson 2026-10-01 2026-10-14`.

Ojo: el repositorio se mudó el 15/10, pero GitHub conservó el historial de corridas; hasta el 15/10 14:46 UTC el reloj fue cron-job.org y ahora es el Worker, y el ritmo es el mismo (53 corridas de "Actualizar" por día).

### 1.2 Resultado (1 al 14 de octubre) [MEDIDO]

| Workflow | Corridas (por día) | Minutos reales | Minutos facturables | Proyección 30 días (facturables) | Si fuera privado (US$ 0,008 / 0,006) |
|---|---|---|---|---|---|
| Actualizar la web | 765 (55) | 3.177 | 3.557 | 7.622 | 61 / 46 |
| Redes | 1.730 (124) | 1.051 | 2.228 | 4.774 | 38 / 29 |
| Cloudflare Pages | 765 (55) | 1.653 | 1.993 | 4.271 | 34 / 26 |
| Vigilancia | 722 (52) | 344 | 789 | 1.691 | 14 / 10 |
| Auditoría IA | 62 (4) | 72 | 104 | 223 | 2 / 1 |
| Panel del celular (varias) | 77 (5) | 29 | 78 | 167 | 1 / 1 |
| Pistas | 40 (3) | 18 | 41 | 88 | 1 / 1 |
| Armado con datos vacíos | 35 (2,5) | 12 | 35 | 75 | 1 / 0 |
| Todo lo demás (auditoría, pruebas otra hora, piezas, respaldo, sondeos…) | ~25 | ~40 | ~55 | ~120 | 1 / 1 |
| **Total** | **4.220 (301)** | **6.397** | **8.879** | **≈19.000** | **≈152 / ≈114 antes de descontar lo gratis** |

Proyección con minutos reales: **13.700 por mes**.

**Costo en privado, descontando lo incluido** (GitHub Free incluye 2.000 min en repos privados, Pro y Team 3.000 [DOCS 15/10]):

| Supuesto | Minutos | A US$ 0,008 | A US$ 0,006 |
|---|---|---|---|
| Minutos reales (13.700) − 2.000 | 11.700 | US$ 94 | US$ 70 |
| Minutos facturables (19.000) − 2.000 | 17.000 | US$ 136 | US$ 102 |

O sea: **US$ 70 a 136 por mes**. Coincide con el "unos US$ 100" que ustedes usaron. La estimación vieja (10.000 min) estaba corta.

### 1.3 Lo que se ve en los números

1. **Se compila el sitio dos veces por vuelta.** En las últimas 5 corridas buenas [MEDIDO paso por paso con `gh run view`]:
   - "Actualizar la web": pruebas 50 s · buscar noticias + IA 132 s · **compilar el sitio 143 s** · resto ~20 s.
   - "Cloudflare Pages" (arranca cuando la anterior termina bien): **compilar el sitio otra vez 142 s** · subir 28 s.
   La primera compilación sólo sirve de chequeo (y de revisar el SEO). Unir las dos en un solo trabajo ahorra unos 2 minutos por vuelta: **≈2.800 min/mes**.
2. **Las pruebas corren 48 veces por día** con los mismos resultados (el código no cambió entre una vuelta y la otra). 50 s × 1.440 vueltas = **≈1.200 min/mes**.
3. **"Redes" corre 124 veces por día y 89 % duran menos de un minuto** (1.539 de 1.730: 456 minutos reales, pero 1.539 facturables). El reloj de Cloudflare la despierta 3 veces por hora para preguntar "¿toca alguna pieza?" y casi siempre la respuesta es no. Las que sí arman piezas son 191 en 14 días (~14/día) y consumen **595 min reales** (≈1.275 por mes): **eso es todo el video**. Parte de ese tiempo es esperar a que Instagram procese el video (`redes/meta.mjs` consulta cada 2 s hasta 10 minutos): en un Worker esa espera no cuesta.
4. **"Vigilancia" corre 52 veces por día, 29 s cada una** y paga un minuto entero cada vez (344 reales contra 789 facturables). Es sólo mirar la web y mandar un WhatsApp: ideal para un Worker.
5. **Las fallas de "Actualizar la web" son 52 de 765 (6,8 %)** y se concentran en tres días:
   - 4/10: 24 fallas seguidas (12 horas), no compilaba (`generateStaticParams` vacío, ya tiene su prueba).
   - **11/10: 17 fallas seguidas, de 13:00 a 20:00 de Balcarce.** Fallaron dos pruebas de *escenas de video* ("hay 49 ejemplos", "no puede leer `dia` de null"): nada que ver con una noticia. La web quedó 7 horas sin actualizarse.
   - 5/10: 8 fallas.
   En la práctica, **la puerta de las pruebas es la causa más fuerte de congelamiento después de la compilación**.
6. **El repositorio engorda por los commits de datos**: 182 commits desde el 14/10 a las 00:00 UTC (≈107 por día) [MEDIDO con `gh api …/commits`]. El paquete de respaldo (`git bundle`) pesa **172 MB** a seis semanas de vida y `datos-y-fotos` 52 MB; `.git` en la PC ya pasa de 249 MB. Las cachés de Actions suman 2,9 GB en 739 entradas (`cruce-<id de corrida>` crea una nueva cada media hora y GitHub las va borrando).
7. **El reloj de Cloudflare anda bien**: ningún hueco de más de 60 minutos entre corridas de "Actualizar" en 14 días [MEDIDO].
8. **Desde GitHub fallan muchos feeds**: en la corrida de las 14:03 (hora de Balcarce) del 15/10 hay 65 avisos de "no llegó a conectar a tiempo" o "tiempo agotado (15 s)" sobre 236 feeds [MEDIDO en el registro de una corrida]. Los documentos anteriores sospechan que algunos medios bloquean las IP de GitHub. **Si Cloudflare lo hace mejor o peor, hay que medirlo (fase 1).**

### 1.4 Escenarios de costo si el repositorio fuera privado

| Escenario | Qué cambia | Minutos facturables por mes (aprox.) | Costo en privado (US$ 0,006–0,008, con 2.000 incluidos) |
|---|---|---|---|
| **Hoy** | Nada | ≈19.000 | 102–136 |
| **A · Ordenar sin mudar** | Una sola compilación y subida en "Actualizar"; las pruebas salen de la vuelta | ≈15.000 | 78–104 |
| **B · A + vigilancia, reloj/Facebook de redes, panel, pistas y auditoría IA en Workers** | Quedan en Actions sólo "Actualizar" y las piezas con video | ≈9.400 | 44–59 |
| **C · B + "Actualizar la web" en Cloudflare** | En Actions queda el video (≈1.500) y las pruebas por cambio de código (≈300) | ≈1.800 | **0** (entra en los 2.000 gratis; muy justo) |
| **D · C + video fuera de Actions** (contenedor o runner público) | En Actions sólo las pruebas | ≈300 | **0** |

Las cifras de A, B, C, D son estimaciones mías a partir de lo medido (restando lo que se mueve). **Conclusión: el repositorio sólo puede ser privado y gratis cuando "Actualizar la web" se vaya de Actions (escenarios C o D).** Mudar sólo vigilancia, panel y redes no alcanza.

---

## 2. Paso por paso: dónde vive cada cosa

### 2.1 Límites de Cloudflare que importan [DOCS 15/10] (Workers Paid salvo que diga otra cosa)

| Límite | Valor | Por qué importa acá |
|---|---|---|
| Pedidos salientes (subrequests) por ejecución | 50 en Free; **10.000 en Paid** (se puede subir) | Una vuelta lee ~236 feeds + notas + llamadas a IA: entra |
| Conexiones abiertas a la vez | **6** | Los 236 feeds se leen de a 6: tarda ~1 minuto, no es problema para un cron, sí para una página |
| CPU por ejecución de cron cuando corre **cada menos de 1 hora** | **30 s** (15 min si es cada hora o más) | Nuestro reloj es cada 30 minutos: **el cron no puede hacer todo el trabajo**; tiene que arrancar un Workflow o poner mensajes en una cola |
| CPU por pedido HTTP | 30 s por defecto, hasta 5 min | Páginas armadas al pedirlas: sobra |
| Tiempo total (reloj de pared) de cron y de consumidores de cola | 15 min | Lo que espera a Gemini cuenta acá |
| Memoria por ejecución | 128 MB | Hay que procesar feed por feed, no cargar todo junto |
| Tamaño del Worker | 64 MiB sin comprimir | Entra (la dependencia pesada de hoy, `ffmpeg-static`, no va ahí) |
| Archivos estáticos por versión de Worker | 20.000 Free / **100.000 Paid** | Reemplaza el tope de 20.000 de Pages |
| Cloudflare Workflows | **sin límite de tiempo por paso**, 30 s de CPU por paso (configurable hasta 5 min), 10.000 pasos, hasta 10.000 pedidos salientes, espera `step.sleep` hasta un año, estado de 1 GB, historial de 30 días | Es la herramienta natural para la vuelta de media hora: cada etapa es un paso con reintentos |
| Colas (Queues) | Disponible en Free (10.000 operaciones por día) y en Paid (1 millón al mes, luego US$ 0,40 por millón); reintentos 3; conservación 4 días en Paid | Para repartir los 236 feeds en tandas |
| D1 | **500 MB en Free / 10 GB por base en Paid**; Paid incluye 25.000 millones de filas leídas y 50 millones escritas por mes | Sobra (ver 3.3) |
| R2 | 10 GB-mes, 1 millón de operaciones de escritura y 10 millones de lectura por mes **gratis**; **salida de datos sin costo** | Fotos, audios, videos, respaldos |
| KV (opcional) | Paid: 10 millones de lecturas y 1 millón de escrituras al mes incluidas | Caché chica; no hace falta |
| Workers AI | 10.000 "neurons" por día gratis, US$ 0,011 por 1.000 después; hay `gpt-oss-120b` a US$ 0,35 / 0,75 por millón de tokens y varios Qwen, Llama, Gemma | Opción barata para clasificar/leer; la calidad la define la etapa de IA |
| Browser Rendering | 10 horas por mes en Paid | No hace falta (las placas son SVG→PNG) |
| Containers | Plan Paid; incluye 375 vCPU-min, 25 GiB-horas de memoria y 200 GB-horas de disco por mes; después US$ 0,000020/vCPU-s, US$ 0,0000025/GiB-s; tipos desde "lite" (1/16 vCPU, 256 MiB) hasta 4 vCPU. **La página no dice si está en beta o disponible general** | Para ffmpeg. Ver 2.3 |
| Workers Builds (compilar en Cloudflare desde Git) | Free 3.000 min/mes, Paid 6.000 (US$ 0,005 por minuto extra), compilación máxima 20 min, 6 a la vez en Paid | Una compilación diaria o por cambio de código, no una por vuelta |
| Pages (para saber qué se deja) | 500 compilaciones/mes en Free; **20.000 archivos por sitio** (100.000 en Paid con `PAGES_WRANGLER_MAJOR_VERSION=4`); archivo máximo 25 MiB; **`_redirects`: 2.000 fijas + 100 dinámicas** | El sitio de hoy usa 5.109 archivos y ~1.000 redirecciones (tope propio 1.900) |

Qué **no** pude verificar sin red real o sin probar: que `@resvg/resvg-wasm` dibuje bien *nuestras* placas (fuentes, filtros) dentro de un Worker; que el pedido a los medios salga con éxito desde las IP de Cloudflare; que el adaptador de Next para Workers (OpenNext) sirva para este sitio; que D1 sirva buscador de texto (FTS5) como reemplazo de Pagefind; los límites de la API de Instagram al subir desde un Worker. Todos [NO VERIFICADO]: ahí van los "sondeos" de la fase 1.

### 2.2 Tabla de la tubería

| Paso de hoy | Cómo es hoy | Dónde puede vivir | Notas y límites | Qué se mantiene fuera |
|---|---|---|---|---|
| **Reloj** (despertar cada 30 min) | Worker `radar-balcarce-reloj` llama a GitHub | **Ya en Cloudflare** (fase 0) | Pasa a lanzar directamente el Workflow, ya no a pedirle a GitHub | — |
| **Leer 236 feeds** | `ingesta/ingesta.mjs`, Node, 41 s | **Cola (Queue) + Worker**: un mensaje por tanda de 10–20 feeds; cada consumidor guarda lo leído en D1 | 6 conexiones a la vez, 128 MB, 15 s de espera por feed. Sin dependencias: se puede empaquetar tal cual | Si los medios bloquean Cloudflare, los que fallen se leen desde otro lado (runner) o se sacan |
| **Texto de la nota original** | `ingesta/articulo.mjs` baja la página | Worker (mismo mecanismo) | Hasta cientos de pedidos por vuelta: dentro de 10.000 | — |
| **Cruce de medios** (TF-IDF, memoria de 36 h) | `ingesta/cruce.mjs`, memoria en caché de Actions (`.cache`) | Worker/Workflow; memoria en D1 (tabla de items de 36 h) | CPU: unos segundos para ~600–1.000 items; entra en un paso de 30 s o se parte | — |
| **Sección, puntaje, semáforo** | funciones puras | Workflow | Cero problema | — |
| **Lectura con IA** (Gemini/Groq) | `ingesta/lectura-ia.mjs`, 22 s | Workflow, un paso por tanda de 12 notas | Espera de red cuenta como tiempo de pared (15 min en cola, ilimitado en Workflow). Opcional: AI Gateway o Workers AI (a evaluar en la etapa de IA) | Las claves de Gemini/Groq siguen siendo de Google/Groq |
| **Reescritura con IA** | `reels/reescritura.mjs` (1.276 líneas) | Workflow, un paso por nota | Es el mayor consumo de tiempo de pared (hasta 40 notas × ~10 s): con 6 conexiones a la vez, ~1–2 min | — |
| **Verificación** | `ingesta/verificar.mjs`, funciones puras | Workflow | Cero problema | — |
| **Fotos: elegir, comparar con IA** | `ingesta/fotos.mjs` | Workflow (pedidos a Gemini/Groq/Wikimedia) | — | — |
| **Fotos: achicar a 1.200 px** | `web/scripts/achicar-foto.mjs` llama a **ffmpeg** | Cloudflare Images (binding) o `cf.image` al pedir la foto; si no, en el contenedor | [NO VERIFICADO] cupo gratis de transformaciones | Si no se resuelve: el contenedor/runner de video |
| **Collage y foto de efeméride** | `web/scripts/collage.mjs`, `foto-efemeride.mjs` con **ffmpeg** (hoy ya falla: "no se pudo armar la foto de 2026-10-12") | Contenedor o runner de video | Son pocas por día | Contenedor/runner |
| **Armar `web/data/*.json`** | `web/scripts/generar-datos.mjs` escribe archivos en el disco | **D1 + R2** (ver 3) | Es la parte que más cambia: ~45 módulos leen y escriben archivos | — |
| **Compilar Next (1.687 páginas, 143 s)** | `next build` con `output: 'export'`, `pagefind`, resvg para tarjetas | **Desaparece** como paso por vuelta: un Worker arma las páginas al pedirlas (con caché de borde). La compilación queda sólo para cambios de código (Workers Builds) | Hay que probar Next-sobre-Workers u otra capa de HTML [NO VERIFICADO]; el buscador (Pagefind) se rehace | — |
| **Subir a Pages** | `wrangler pages deploy` | Desaparece (o queda sólo para los archivos fijos) | — | — |
| **SEO: `revisar-seo.mjs`, IndexNow** | Corren tras compilar | Prueba de humo del Worker (pedir 5 páginas y mirar el HTML) + IndexNow desde el Workflow | — | — |
| **Publicar en Facebook/Instagram** | `redes/publicar.mjs`, `redes/meta.mjs` (sin dependencias) | **Workflow**: la espera de Meta se hace con `step.sleep`, sin costo | Subir un video a Instagram por *rupload* desde un Worker: [NO VERIFICADO]. Alternativa: pasar la URL pública del video en R2 | — |
| **Reloj de redes** (`redes/reloj.mjs`) | Despierta un runner 72 veces por día | Pasa a ser una función del Worker (decide si toca algo y recién entonces lanza el armado) | Necesita leer `redes.json` y el plan: de D1 | — |
| **Placas SVG → PNG** | `reels/placa.mjs` con `@resvg/resvg-js` (nativo) | `@resvg/resvg-wasm` en Worker, o dentro del contenedor | [NO VERIFICADO] que se vea igual (las fuentes se cargan a mano) | Alternativa: contenedor |
| **Voz (Gemini TTS)** | `reels/voz-gemini.mjs` (llamada de red) | Workflow/Worker | Después usa `ffmpeg` para convertir y medir silencios (`reels/alinear.mjs`) | Contenedor/runner (sólo esa parte) |
| **Video (ffmpeg)** | `reels/reel.mjs`, `animacion.mjs`, `presentacion.mjs` | **Contenedor de Cloudflare** o **runner público sin secretos** (ver 2.3) | ffmpeg no corre en un Worker | Sí |
| **Vigilancia** | `redes/vigilar.mjs`, 891 líneas, sin dependencias, 52 corridas/día | **Worker con cron** (fase 1) | Es todo `fetch` más WhatsApp. Estado en D1 | — |
| **WhatsApp (CallMeBot)** | `redes/whatsapp.mjs` | Worker | Puede cambiarse a mail/Telegram (decisión del 12/10) | — |
| **Panel del celular** | App estática que escribe en GitHub con la llave de cada persona y dispara `panel.yml` | Fase 5: la app habla con un Worker (detrás de **Cloudflare Access**, gratis hasta 50 usuarios [NO VERIFICADO]) y no con GitHub; la IA se pide a un Workflow | Mientras tanto, sigue andando con GitHub (privado igual funciona con las llaves de grano fino) | — |
| **Pistas** (Tavily) | `panel/revisar-pistas.mjs`, 40 corridas/14 d | Worker con cron | — | — |
| **Auditoría IA** (Groq, cada hora) | `redes/auditar-notas.mjs` | Worker con cron | — | — |
| **Auditoría semanal, Auditar redes, Ver Facebook** | A mano o semanales | Worker (semanal) o se quedan a mano | Bajo uso | — |
| **Respaldo** | `respaldo.yml`: bundle de git + tar | Worker semanal que vuelca D1 a R2 + copia mensual **fuera de Cloudflare** (ver fase 0) | — | Una copia en otro proveedor |
| **Estadísticas** (Cloudflare Analytics + Meta) | `redes/estadisticas.mjs` | Worker; las de visitas pueden pasar de la API a *Analytics Engine* [NO VERIFICADO] | — | — |
| **Pruebas** | `npm test` en cada vuelta | PR/push (GitHub o Workers Builds), no en cada vuelta | Ver sección 5 | — |

### 2.3 Video: las dos salidas

| | **V1 · Contenedor de Cloudflare** | **V2 · Repositorio público de render, sin secretos** |
|---|---|---|
| Qué es | Un contenedor (Docker con ffmpeg, resvg, fuentes) que un Worker enciende para cada video | Un repositorio *aparte y público* con sólo el código de render. El Worker lo dispara y le pasa direcciones temporales (presignadas) de R2 para bajar el audio/las placas y subir el mp4 |
| Costo | Dentro de lo incluido (375 vCPU-min; ~6 videos × 3 min × 1/4 vCPU ≈ 5 vCPU-min por día ≈ 150 por mes) → **≈US$ 0** [estimación sobre DOCS 15/10] | **US$ 0** (repositorios públicos no pagan minutos) |
| Todo en una cuenta | Sí | No: sigue GitHub en el camino |
| Riesgo | Producto relativamente nuevo (la página no dice si ya es general o beta) [NO VERIFICADO]; hay que armar la imagen Docker | Dependemos de que GitHub no cambie la política de minutos gratis en públicos; las direcciones presignadas quedan en el registro público unos minutos |
| Dificultad | Media | Baja (ya hay 20 archivos de `reels/` listos; se separan) |
| Cuando el repo principal es privado | Sin cambios | Sin cambios (el repo de render es otro) |

**Recomendación**: empezar con **V2** (rápida, gratis, reversible) y pasar a **V1** cuando Containers esté probado. Si se queda el video en el mismo repo privado, entra en los 2.000 minutos gratis pero con muy poco margen (~1.500 por mes).

---

## 3. De dónde lee el sitio y cómo no se rompen los enlaces

### 3.1 Qué hay hoy [MEDIDO]
- `archivo.json`: 1.120 notas, desde el 3/9 (≈27 por día, 2,6 KB cada una, 2,9 MB); `banco-fotos.json`: 1.334 entradas (0,8 MB); `fichas.json` 0,6 MB; `web/data` entero 6,3 MB.
- 862 fotos en `web/public/fotos-notas/` (63 MB). La variable `FOTOS_BASE` y la prueba `fotos-base` ya existen: **la mitad de la mudanza de fotos está hecha** y `fotos-a-r2.yml` también; falta crear el depósito y cargar `R2_FOTOS`/`FOTOS_BASE` (hoy no existen).
- 5.109 archivos en el sitio compilado y 1.687 páginas; ~1.000 líneas de `_redirects` (el tope propio es 1.900 de las 2.000 que permite Pages).
- A este ritmo: ~10.000 notas y ~25 MB de datos por año; ~550 MB de fotos por año. D1 (10 GB) y R2 (10 GB gratis) alcanzan para décadas.

### 3.2 Diseño recomendado ("la página dura años")

- **D1** guarda: notas (todas, para siempre), fichas, banco de fotos (metadatos), libro de redes, vistas, pistas, estado de la vigilancia, intentos de IA, memoria del cruce (36 h), redirecciones.
- **R2** guarda: fotos (`/fotos-notas/ID.jpg` con el mismo camino), audios y videos (30 días), tarjetas para compartir ya dibujadas, respaldos.
- **Un Worker web** (Workers + archivos estáticos) sirve: lo estático (CSS, íconos, el panel), y las páginas de nota, sección, agenda, sitemap, feed y tarjetas, armadas desde D1 con caché de borde (portada y secciones 1–5 minutos; notas viejas un año). Así:
  - desaparece el límite de **20.000 archivos** (las notas no son archivos);
  - desaparece el de **2.000 redirecciones** (se resuelven en el Worker);
  - desaparece el **tope de 3.500 notas / 180 días**: se puede conservar todo y decidir por criterio editorial, no por el techo;
  - la "vuelta de media hora" ya no compila: cambiar una nota es una fila en D1 y una caché que se purga;
  - cualquier URL vieja resiste a un cambio de código.
- **Qué sigue en git** (hasta decidir otra cosa): lo que escriben personas (`celular-decisiones`, `correcciones`, `retiradas`, `agenda-suspendidos`, `contactos`), porque git da historial y "deshacer" gratis. El Worker las lee por la API de GitHub con una llave de sólo lectura. En la fase 5 se pasan a D1 con historial propio.

Es la parte más costosa y menos probada: **antes de apostar a esto, una prueba de dos días** (fase 3): servir *una* página de nota y la portada desde un Worker de prueba con datos copiados, y comparar HTML, tarjetas y velocidad con la actual. Si Next-sobre-Workers no cierra, la alternativa es armar el HTML con React en el servidor (`react-dom/server`) reutilizando `web/components/` (son componentes simples). [NO VERIFICADO: cuánto del código actual se reutiliza sin cambios.]

### 3.3 Conservar las direcciones

1. **Formato de nota actual**: `/nota/titular-en-guiones-ID`. El ID es lo que va después del último guion. El Worker toma el ID, busca la fila y: si el titular de la URL coincide, sirve la página; si no, **301** a la dirección canónica (hoy lo hace `_redirects` y `404` con `nota/indice.json`). Una nota tiene "una sola dirección, fija desde que sale" (regla del proyecto): se guarda en D1 en la columna `ruta` y **nunca se recalcula**.
2. **`/nota/ID`** (formato viejo) → 301 a la canónica; **repetidas unidas** (`fusionadas.json`) → 301 a la nota que quedó; **`/seccion/servicios` y `/seccion/pais`** → 301 a su sección nueva. Todo eso va a una tabla `redirecciones` (importar de `fusionadas.json` y `_redirects`).
3. **Notas retiradas**: igual que hoy (la página no existe; 404/410 según la regla vigente).
4. **Importación**: un script de una sola vez que lee `archivo.json` + `web/data/historico/*.json` (agosto–septiembre) + `retiradas`/`correcciones` y llena D1, y una **prueba de espejo**: para las 1.120 notas, pedir la URL vieja y la nueva y comparar estado, título, canónica y foto. No se apaga lo viejo hasta que esa prueba dé 100 %.
5. **Sitemaps, feed, `llms.txt`, robots, tarjetas OG (`/nota/ID/opengraph-image`, `instagram.png`)**: mismas direcciones, generadas al pedirlas (con `resvg-wasm`) y guardadas en R2/caché. Las publicaciones de Facebook/Instagram ya hechas apuntan a esas direcciones: son lo primero que hay que probar.
6. **Fotos**: mismo camino `/fotos-notas/ID.jpg`, servido desde R2 (o `fotos.radarbalcarce.com`; el código ya prevé `FOTOS_BASE`).
7. **Buscador**: Pagefind se arma al compilar y ya no habría compilación. Alternativa: búsqueda de texto en D1 [NO VERIFICADO que D1 traiga FTS5 en nuestro plan]; o seguir generando el índice una vez por hora. Es una decisión de producto menor.

---

## 4. Plan por fases

Principio: **cada fase es reversible**, deja a GitHub corriendo en paralelo y sólo apaga lo viejo cuando lo nuevo lleva una semana sin fallar. Los costos son extra sobre lo que ya se paga (US$ 5 de Workers Paid y el dominio).

| Fase | Qué se hace | Qué se ahorra de Actions | Costo Cloudflare/mes | Riesgo | Cómo se vuelve atrás |
|---|---|---|---|---|---|
| **0 · Hecha** | Reloj propio en Cloudflare (15/10) | 0 | US$ 5 (ya pago) | Que venza el token `RELOJ_GITHUB_TOKEN` (aviso del vigilante) | Reactivar los 3 trabajos pausados de cron-job.org |
| **0b · Respaldo de verdad (antes de todo lo demás)** | Crear el depósito R2 de respaldos (`R2_RESPALDOS`) y una **copia mensual fuera de Cloudflare y de GitHub** (otro Git alojado o un disco de la PC); probar una restauración. Configurar `FOTOS_BASE`/`R2_FOTOS` y correr "Fotos a R2" | 0 | US$ 0 (dentro de los 10 GB gratis) | Bajo | Nada que revertir |
| **1 · Sacar el desperdicio (1–2 días)** | Una sola compilación y subida en "Actualizar la web" (sin el 2.º build de Pages); las pruebas salen de la vuelta y quedan en push/PR (sección 5); guardas chicas de datos en su lugar (validar los JSON que edita una persona); cache de `npm` | **≈ −4.000 min/mes** (de ≈19.000 a ≈15.000) | US$ 0 | Bajo | Volver a poner los pasos en el `.yml` |
| **2 · Sondeo: ¿andan las fuentes y las placas desde Cloudflare? (1 día)** | Un Worker de prueba que lee las 236 fuentes y reporta cuáles responden; otro que dibuja 3 placas con resvg-wasm y las compara con las actuales | 0 | US$ 0 | Si los medios bloquean Cloudflare, el motor tendrá que salir de otra IP | Se borra el Worker de prueba |
| **3 · Vigilancia, reloj de redes, Facebook, auditoría IA y pistas a Workers (1 semana)** | Mover los que son sólo `fetch`: `vigilar.mjs`, `reloj.mjs`, `publicar.mjs --facebook`, `auditar-notas.mjs`, `revisar-pistas.mjs`. Estado en D1 (tablas `vigilancia`, `libro_redes`) | **≈ −5.500 min/mes** (a ≈9.400): se acabaron 1.800 corridas por semana | ≈US$ 0 (centavos de uso) | Medio: duplicar publicaciones si los dos lados publican a la vez. Se evita con un interruptor por componente y con `REDES_ACTIVAS=No` en el lado que no manda | Reactivar el workflow viejo y apagar el interruptor nuevo |
| **4 · Motor de noticias a Workflows + D1 + R2 (2–3 semanas)** | Cola para leer feeds, Workflow para cruce → lectura → reescritura → verificación → fotos → datos. Reescribir la capa de archivos (`leerJson`/`escribirJson` y los ~70 módulos que usan `node:fs`) detrás de una interfaz "almacén" que ya tiene su primer ladrillo en `ingesta/datos-vivos.mjs`. **Corre en paralelo con GitHub 1 semana**, con el de Cloudflare en "sombra" (escribe en otra base y se compara) y recién después manda | **Sale lo grande** ("Actualizar la web" ya no corre): a ≈1.800 (escenario C) | ≈US$ 1–3 (Workflows, D1, colas) [estimación] | **Alto**: es el corazón. Mitigación: modo sombra, comparación de resultados notas por nota, y dejar `actualizar.yml` sólo con `workflow_dispatch` como plan B | `actualizar.yml` vuelve a `schedule`/reloj; el Worker de Cloudflare se apaga |
| **5 · Sitio desde D1/R2 y repositorio privado (2 semanas)** | Prueba de 2 días con una nota y la portada (sección 3.2); luego importación del archivo, redirecciones, tarjetas OG, sitemaps, feed; pausa corta para cambiar la ruta del dominio; **pasar el repo a privado** | Sin compilación por vuelta; las compilaciones quedan sólo para código | ≈US$ 0–1 | Alto en SEO si algo cambia en el HTML o en las URLs. Mitigación: la prueba de espejo de las 1.120 notas y mantener el sitio viejo desplegado en una ruta de reserva | Volver a apuntar el dominio al proyecto de Pages (se deja desplegado, sin tocar) |
| **6 · Panel sin GitHub y video propio (opcional, 2–3 semanas)** | El panel habla con un Worker detrás de **Access** (sin llaves de GitHub en los celulares); mover los datos de personas a D1 con historial; video a contenedor (V1) | Quita el último uso fuerte de Actions | ≈US$ 0–3 | Medio (cambia el flujo de Hernán y Andrés) | El panel viejo sigue andando hasta que el nuevo esté probado |

**Costo total esperado en régimen**: Workers Paid US$ 5 + uso (Workflows/colas/D1/R2) US$ 0–3 + contenedor US$ 0–3 ≈ **US$ 5 a 11 por mes**, más el dominio y las IA (que son otra etapa).

### 4.1 Cómo se mantiene la cadencia de 30 minutos
- El Cron Trigger `0,30 * * * *` **sólo arranca un Workflow** (30 s de CPU máximo para cron de menos de una hora [DOCS 15/10]); el Workflow hace el trabajo en pasos y cada paso tiene sus reintentos. Hoy una vuelta dura ~4 minutos; el plazo máximo es 15 min por cron, sin tope por paso en Workflows.
- Un segundo cron liviano (cada 5 o 10 min) hace el "reloj de redes" y la vigilancia sin gastar nada.
- **Candados**: un Workflow con el mismo nombre de instancia por vuelta evita dos corridas a la vez (hoy lo hace `concurrency`).
- **Plan B**: durante las fases 3–5 se mantiene `actualizar.yml` en `workflow_dispatch`, el vigilante avisa si pasan más de 100 minutos sin vuelta y el Worker del reloj puede, con una variable, volver a llamar a GitHub.

### 4.2 Qué hay que tener presente de los límites
- **El cron no es el trabajo.** Con 30 s de CPU por cron de menos de una hora [DOCS 15/10], el Worker del reloj sólo dispara.
- **6 conexiones a la vez**: leer 236 feeds con 15 s de espera máxima = unos 60–90 s. No hay que servir nada al lector durante ese tiempo: por eso el lector sólo lee D1 y la caché, nunca el motor.
- **128 MB de memoria**: procesar un feed por vez y descartar; no armar 600 historias enteras en un solo objeto.
- **Node → Workers**: los módulos usan `node:fs`, `node:path`, `process.env`, `import.meta.dirname`, y `ingesta/prompt-editorial.mjs` lee `CRITERIO-EDITORIAL.md` del disco: hay que empaquetar los `.md` como texto dentro del Worker (el pedido de "si falta, no escribe" se mantiene). 14 de 33 archivos de `ingesta/`, 13 de 32 de `redes/`, 7 de 20 de `panel/`, 20 de 25 de `reels/` y 14 de 17 de `web/scripts/` importan `fs/path/child_process`. `TZ` no existe en Workers: `ingesta/zona.mjs` ya concentra la hora de Balcarce, lo cual ayuda.

---

## 5. Recortar las pruebas

### 5.1 Qué hay hoy [MEDIDO]
- 169 archivos `*.test.mjs` (170 con el nuevo `fuentes-lista-elegida`), **2.039 pruebas**. En la PC (Windows, con otros agentes trabajando) tardan 3 min 12 s; en GitHub ~50 s por vuelta.
- Dos archivos concentran el tiempo local: `reel-dos-placas` (arma un video con ffmpeg, ~180 s en la PC) y `sintaxis-scripts` (~175 s); el resto, 16 s o menos cada uno (`pruebas-tiempos.csv`; los números se inflan porque se corrieron 6 a la vez con la PC cargada).
- Una prueba falla hoy en el árbol de trabajo (`cruce-coherente`) por una edición de fuentes en curso de otro agente: es justo el tipo de falla que, en la nube, congelaría la web.

### 5.2 Clasificación (hecha por mí leyendo la cabecera de cada archivo; coincide con su 86/70/13)
| Clase | Qué es | Archivos | Pruebas | Qué hacer |
|---|---|---|---|---|
| **a** | Protege un error que ya llegó a lo publicado, una regla legal o de seguridad, o que la web se congele | 85 | 1.224 | Se queda, pero **sólo 44 archivos son "núcleo"** |
| **b** | Detalle, diseño o tono (escenas, tipografías, colores, pestañas del panel, textos de piezas) | 72 | 616 | Se corre una vez por semana, falla = tarea, **nunca frena una publicación** |
| **c** | Código que se puede borrar (panel de la PC, `comercial/`, herramientas de una sola vez) | 13 | 157 | Borrar con su código |

Detalle por archivo: `pruebas-clasificadas.csv`. La clase c que propongo: `acceso`, `panel`, `panel-seguridad`, `respaldo`, `buzon`, `agenda-panel`, `horarios` (panel de la PC, "en desuso"), `comercial`, `propuestas` (nadie los usa), `exportar-efemerides`, `combinar-auditorias`, `presentacion`, `perfiles`.

### 5.3 La suite magra
**Núcleo (44 archivos, 583 pruebas, ~15–25 s en la nube [estimación]):** `pruebas-nucleo.txt`. Cubre:
- **Lo legal y sensible**: `semaforo` (menores, víctimas, sepelios), `verificar`, `loteria`, `escape-en-el-texto`, `json-ia`, `cuerpo`.
- **Qué se publica**: `de-aca`, `criterios-extranjero-zona`, `copia-de-afuera`, `cruce`, `entrada`, `efemerides-ajenas`, `repetidas`, `repetidas-esperando`, `notas`, `portada`, `zona`, `hora-balcarce`, `fechas-balcarce`, `fecha-y-antes`, `farmacias` (turno hasta las 8:30), `fotos`, `foto-logo`, `criterio` (que `criterio.mjs` y `CRITERIO-EDITORIAL.md` digan lo mismo), `fuentes`, `fuentes-registro`, `lectura-ia`, `reescritura`.
- **Que la web no se congele ni pierda enlaces**: `archivo`, `ruta`, `redirects`, `armado-vacio`, `temas-vacios`, `seo`, `datos-fijos`.
- **Que las redes no publiquen doble**: `instagram-duplicados`, `espejo`, `contrato`, `meta-tiempo`, `reintentar`, `voz-memoria`.
- **Seguridad del panel y de lo que se filtra a un repositorio público**: `celular`, `celular-app`, `pistas`.

**Dónde corre**
1. **Núcleo**: en cada push o pedido de cambio de código (GitHub si sigue ahí; si no, Workers Builds/CI de Cloudflare), y como **requisito para desplegar el Worker del motor**. **Nunca dentro de la vuelta de 30 minutos.**
2. **Por área** (el resto de la clase a, 41 archivos): sólo si cambió la carpeta que protegen (`ingesta/`, `redes/`, `reels/`, `web/lib`, `panel/`).
3. **Clase b**: semanal (reemplaza a "Pruebas con otra hora", que además falló 2 de 3 veces). Si falla, abre un aviso, no corta.
4. **En la vuelta**: en lugar de 2.000 pruebas, **guardas de datos** de pocos milisegundos: que `correcciones.json`/`retiradas.json` sean JSON válidos y con `motivo/cuando/por`; que el resultado tenga un mínimo de notas; que la portada no quede vacía. Lo que antes "congelaba" sin avisar pasa a ser un aviso.

**Ahorro**: ~1.200 min/mes de Actions (50 s × 1.440 vueltas), ~75 min/mes de "Armado con datos vacíos" (pasa al núcleo) y, sobre todo, se acaban los congelamientos por detalles (7 horas el 11/10). Las clases b y c suman 773 de las 1.997 pruebas contadas (39 %): son las que se escribieron junto a decisiones de diseño que hoy se están repensando (rediseño por etapas del 15/10), así que además de costar minutos, obligan a arreglar pruebas cada vez que se cambia algo a propósito.

**Prueba que cambia con la mudanza**: `workflows-fijos`, `checkout-main`, `sintaxis-scripts`, `reloj-cloudflare`, `fotos-base`, `contar-archivos` y `redirects` dependen de GitHub/Pages: se reescriben o se retiran en las fases 4–5.

---

## 6. Claves y cuentas

Lista real de GitHub (nombres y fecha de carga; los valores no se pueden ver) [MEDIDO con `gh secret list`]. Las variables: sólo existe `REDES_ACTIVAS = Si`.

| Nombre | De qué servicio | Cargado | Dónde vive hoy | Dónde debe vivir después | Recrear en | Observación |
|---|---|---|---|---|---|---|
| `GEMINI_API_KEY_REDACCION`, `_REDES`, `_CLASIFICACION` | Google AI Studio | 28–29/09 | GitHub Secrets | Secretos del Worker/Workflow (`wrangler secret`) | `radarbalcarce@gmail.com` (decisión del 15/10: claves nuevas "cuando se elijan los modelos") | Las **dos voces propias** viven en el proyecto de `_REDES` y vencen el 29/09/2027: si se cambia la clave de proyecto, se vuelven a crear |
| `GROQ_API_KEY` | Groq | 28/09 | GitHub | Worker | `radarbalcarce@gmail.com` | Se usa en la auditoría IA (horaria) y de respaldo |
| `TAVILY_API_KEY` | Tavily | 03/10 | GitHub | Worker | `radarbalcarce@gmail.com` | Uso real bajísimo: 4 pistas y 4 notas de pista en `web/data` |
| `META_TOKEN` | Meta (usuario del sistema `publicador-radar`) | 28/09 | GitHub | Worker | Se queda; es de la app "Radar Balcarce Publicador" | No vence. Si se regenera, tildar `read_insights` e `instagram_manage_insights` |
| `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY` | CallMeBot | 25/09 | GitHub | Worker (o mail/Telegram) | n/a | Se había decidido pasar a mail por falta de cupo |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Cloudflare | 24/09 | GitHub (para subir Pages, el Worker y R2) | Desaparecen de GitHub cuando no haya despliegue desde Actions (el Worker usa *bindings*, no tokens) | Cloudflare de `radarbalcarce@gmail.com` | Hoy el mismo token sube el sitio y lee Analytics |
| `CLOUDFLARE_ANALYTICS_TOKEN` | Cloudflare (Web Analytics) | 25/09 | GitHub | Worker (o consulta directa a Analytics Engine) | idem | — |
| `RELOJ_GITHUB_TOKEN` | GitHub (grano fino) | 15/10 | Worker `radar-balcarce-reloj` | **Se retira** cuando el reloj deje de llamar a GitHub (fase 4) | — | Vence en un año |
| *(no existe)* `GITLAB_TOKEN`, `GITLAB_REPO`, `R2_RESPALDOS`, `R2_FOTOS`, `FOTOS_BASE`, `CLOUDFLARE_PROJECT` | — | — | Citadas en los workflows | — | — | **No están cargadas**: no hay espejo de código ni copia de fotos |
| Llaves de panel (una por celular) | GitHub (grano fino) | — | En cada celular | Se reemplazan por **Cloudflare Access** (fase 6) | — | Hernán y Andrés |
| Token de cron-job.org | GitHub (`balcardev`) | — | cron-job.org (pausado) | Revocar y borrar la cuenta cuando el Worker lleve 2 semanas estable | — | Vence el 21/09/2027 |
| Dominio `radarbalcarce.com` | DonWeb | — | DonWeb (DNS en Cloudflare) | Mismo | — | **Vence el 21/09/2027** (pasar el registro a Cloudflare Registrar sería opcional) |

Qué conviene hacer con las cuentas: todo ya está en `radarbalcarce@gmail.com`; falta sólo **un gestor de contraseñas compartido** para los valores (hoy se pegan y no se pueden releer).

---

## 7. Herramientas y servicios

"Se usa de verdad" = evidencia medida o encontrada en el código/datos.

| Herramienta / servicio | Para qué | Se usa de verdad (evidencia) | Costo | Recomendación |
|---|---|---|---|---|
| **GitHub Actions** | Todo el robot | 4.220 corridas en 14 días | US$ 0 (repo público); US$ 70–136/mes si privado | **Reemplazar** (fases 1–5); queda sólo para pruebas |
| **GitHub (repositorio)** | Código, historial, datos de personas, panel | 107 commits por día, `.git` 249 MB | US$ 0 | **Mantener** como depósito de código; sacar de ahí los datos de máquina |
| **Cloudflare Pages** | Sirve el sitio | 765 despliegues en 14 días, 5.109 archivos | US$ 0 | **Reemplazar** por Worker + estáticos (fase 5) |
| **Cloudflare Worker (reloj)** | Despertar cada 30 min | Sin huecos en 14 días | incluido en US$ 5 | **Mantener** y ampliar |
| **Cloudflare Workers Paid** | Base de lo nuevo | Contratado | US$ 5 | **Mantener** |
| **Cloudflare R2** | Fotos, videos, respaldos | **Nada cargado todavía** (no existen las variables) | 0 con ≤10 GB | **Empezar ya** (fase 0b) |
| **Cloudflare D1 / Queues / Workflows** | Base, repartir feeds, orquestar | No se usan | ~0–3 | **Empezar** en fases 3–4 |
| **Cloudflare Containers / Browser Rendering / Images** | Video, imágenes | No se usan | 0–3 | Containers: **probar** (V1); Browser Rendering: **no** (no hace falta); Images: **probar** para achicar fotos |
| **Cloudflare Web Analytics + DNS** | Visitas y dominio | Estadísticas diarias del vigilante | US$ 0 | **Mantener** |
| **Cloudflare Access** | Entrada al panel | No se usa | US$ 0 (hasta 50 usuarios) [NO VERIFICADO] | **Probar** en fase 6 |
| **cron-job.org** | Reloj anterior | Pausado desde el 15/10 | US$ 0 | **Apagar y borrar** tras 2 semanas de Worker estable |
| **Gemini (3 claves)** | Redactar, leer, voces | 4 notas reescritas por corrida; voz hasta 10/día | US$ 0 (decisión: gratis) | **Mantener** hasta la etapa de IA (otro agente) |
| **Groq** | Respaldo de lectura, auditoría horaria | 57 corridas horarias en 14 días | US$ 0 | **Mantener** (o reemplazar por Workers AI si rinde) |
| **Tavily** | Búsqueda de las Pistas | 4 pistas, 4 notas de pista | US$ 0 (cupo gratis) | **Mantener, uso mínimo**; revisar si vale una clave |
| **Meta Graph API** | Facebook e Instagram | Core | US$ 0 | **Mantener** |
| **CallMeBot (WhatsApp)** | Avisos | Resumen diario, sin cupo cerca del 4/10 | US$ 0 | **Reemplazar** por mail o Telegram (ya decidido el 12/10) |
| **Open-Meteo / met.no, DolarApi / Bluelytics, ESPN, Jolpica, Wikimedia** | Clima, dólar, fútbol, F1, fotos | Notas y servicios del sitio | US$ 0 | **Mantener** (se llaman desde un Worker sin cambios) |
| **IndexNow** | Avisar a Bing | Cada despliegue | US$ 0 | **Mantener** |
| **Pagefind** (npm) | Buscador del sitio | Parte de la compilación | US$ 0 | **Reemplazar** en la fase 5 |
| **Next.js 15 / React** | Armado del sitio | Core | US$ 0 | **Mantener** si el sitio sigue compilado; **evaluar** su reemplazo por HTML desde el Worker |
| **ffmpeg-static / @resvg/resvg-js** | Video, fotos, placas | 20 archivos de `reels/` y 6 de `web/scripts` | US$ 0 | **Mantener** pero afuera del Worker (contenedor/runner); resvg → wasm |
| **GitLab** (espejo) | Copia del código | **No configurado** | US$ 0 | **Configurar** (fase 0b) o elegir otra copia externa |
| **Tailscale** | Entrar al panel de la PC desde afuera | El panel de la PC está en desuso | US$ 0 | **Apagar** |
| **Panel de la PC (puerto 4321)** y `comercial/` | Agenda, avisos, buzón; guía comercial | Sin uso diario; `comercial/` "nada lo corre" | — | **Borrar** (clase c de pruebas) |
| **Vercel** | Hosting anterior | Apagado | US$ 0 | **Borrar el proyecto** (ya en `PENDIENTES`) |
| **DonWeb** | Registro del dominio | Core | (anual, no figura) | **Mantener** hasta el 21/09/2027; evaluar traspaso |
| **Google Search Console, Fonts** | SEO, tipografías | SEO; las fuentes se sirven locales | US$ 0 | **Mantener** |

---

## 8. Hallazgos que valen aparte

1. **Copias de seguridad** (sección 6): sólo hay artefactos de 90 días en GitHub y el historial de git. Hoy, si se pierde la cuenta, se pierde todo salvo la web publicada. Fase 0b.
2. **"Actualizar la web" commitea los datos en `main` ~107 veces por día**: da choques (`git checkout --theirs`), un historial de 172 MB y una dependencia dura de GitHub. Con D1 desaparece.
3. **`cloudflare-deploy.yml` corre aun cuando no hay novedades** (54 veces fue "omitida" porque la anterior falló; las otras 707 despliegan siempre).
4. **El 61 % de los archivos del sitio (3.091 de 5.107) se resube en cada despliegue** [MEDIDO en el registro de Pages]: casi todo cambia de contenido (probablemente el "hace X horas" y las listas de cada página).
5. **Plan de GitHub**: para decidir el costo hay que saber si la cuenta es Free (2.000 min) o Pro (3.000).
6. **Dependencia del repositorio en Actions que habría que tocar al volver privado**: ninguna lectura anónima de `raw.githubusercontent.com` (verificado con búsqueda en el código); el vigilante usa la API con `GITHUB_TOKEN`. Los enlaces públicos al repositorio en documentos dejarían de abrir para el público.
7. **El historial `.git` ya pesa 185 MB empaquetados**; el vaciado (`git filter-repo`) sólo vale si se consigue sacar las fotos antes (fase 0b).

---

## 9. Lo que se necesita de ustedes

1. **Orden de fases**: ¿se aprueba (0b respaldo → 1 desperdicio → 2 sondeos → 3 Workers livianos → 4 motor → 5 sitio y repo privado → 6 panel y video)?
2. **Respaldo**: ¿qué copia externa se elige (otro Git alojado, disco de la PC, Google Drive) y quién la prueba restaurando?
3. **Video**: ¿V2 ahora (repo público sin secretos) y V1 después, o directo V1 (contenedor de Cloudflare)?
4. **Pausas**: ¿se aceptan dos pausas de pocas horas (cambio del motor y cambio del dominio al Worker)?
5. **Pruebas**: ¿se aprueba la suite magra (44 + por área), la baja de las 72 de diseño al calendario semanal y borrar las 13 de código muerto, junto con el panel de la PC y `comercial/`?
6. **Panel y llaves de GitHub**: ¿se acepta pasarlo a Cloudflare Access (sin llaves de GitHub en los celulares) en la fase 6?
7. **Plan de la cuenta de GitHub** y si prefieren un solo lugar de Cloudflare para el dominio.
8. **WhatsApp**: ¿mail o Telegram para reemplazar CallMeBot?

---

## 10. Evidencia en esta carpeta

| Archivo | Qué es |
|---|---|
| `runs-14d.ndjson` | Las 4.220+ corridas de Actions del 1 al 15/10 (de `gh api`) |
| `medir-minutos.cjs`, `tabla-minutos-14d.md` | Cómo se calcularon los minutos y el resultado |
| `extra.cjs`, `extra-redes-y-fallas.txt` | Redes cortas vs. largas, fallas por día |
| `fallas.cjs` | Qué paso falló en las corridas rojas (muestra) |
| `contar-pruebas.cjs`, `pruebas-inventario.txt`, `pruebas-cabeceras.txt` | Inventario de pruebas con su motivo |
| `clasificar-pruebas.cjs`, `pruebas-clasificadas.csv`, `pruebas-nucleo.txt` | Clasificación a/b/c y la suite magra |
| `tiempo-por-prueba.cjs`, `pruebas-tiempos.csv` | Tiempo de cada archivo de pruebas (en la PC, 6 a la vez) |
| `pasos.cjs` | Tiempo por paso de una corrida (necesita `gh` con acceso) |

*Consultas de documentación hechas el 15/10/2026: límites de Workers, Pages, D1 (límites y precios), R2, Queues, Workflows, Containers, Workers AI, Browser Rendering, KV, Workers Builds y facturación de GitHub Actions.*
