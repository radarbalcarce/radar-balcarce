# Auditoría del sitio en vivo, 17/11/2026

Solo lectura sobre https://radarbalcarce.com (hecha a las 15:55 hora de Balcarce, con curl). No se editó nada del repo ni se enviaron formularios. Muestra: portada, 4 secciones (balcarce, tecnologia, politica, policiales), 13 notas (las 12 pedidas más una policial; entre ellas las 3 firmadas por Hernán, 5 de Balcarce y 4 nacionales/tecnología), las páginas de confianza y los servicios.

Lo que NO pude verificar: cómo se ve en un celular real (solo leí el HTML y el CSS), la velocidad real (Lighthouse/PageSpeed no corrió; solo tamaños), si el aviso de cookies aparece y funciona (solo vi que existe la cookie `radar_cookies` y el botón «Cookies»), si los datos del clima, el dólar y la farmacia coinciden con sus fuentes originales (solo vi que están fechados hoy y que citan fuente), y si el contenido de cada nota es fiel a su fuente.

## Resumen en una frase

El sitio está técnicamente muy bien armado (HTTP, canonical, JSON-LD, sitemaps, 410, servicios al día). Lo que más pesa para AdSense no es técnico: es que las notas son **cortas y casi todas salen de una sola fuente ajena, con foto de otro medio**, que **faltan las páginas de confianza que Google espera** (autor, correcciones, términos, política editorial) y que hay **notas de relleno propias** (el media kit como «nota», tres notas de Hernán con fechas de hace una semana).

## 1. Contenido: 13 notas revisadas

Cuerpo en palabras (contado del HTML): Hydrogen 173, Omni 126, Fable 176, corte de luz 107, adultos mayores 114, piloto 85, Cazzola 145, choque 56, presupuesto provincial 116, riesgo país 170, GTA horario 140, GTA truco 171, adolescente Mendoza 144. Media: 125 palabras.

| Problema | Cuántas de 13 | Notas |
|---|---|---|
| Cuerpo de menos de 100 palabras | 2 | piloto (85), choque en 17 y 8 (56) |
| Cuerpo de menos de 130 palabras | 6 | las dos anteriores, Omni, corte de luz, adultos mayores, presupuesto provincial |
| Ninguna pasa de 176 palabras | 13 | AdSense mira esto: casi todo son 2 o 3 párrafos |
| Una sola fuente en «Fuentes (N)» | 6 | Omni, corte de luz, adultos mayores, piloto, choque, presupuesto provincial |
| Foto de otro medio (Clarín, La Nación, Radio Gabal) | 8 | corte de luz, piloto, choque, presupuesto, riesgo país, GTA x2, adolescente Mendoza |
| Foto que es una placa o imagen genérica | 3 | las 3 de Hernán: placa azul 1200x630 con crédito «Imagen: sehace.com» |
| Bajada repetida: bajada = meta description = og:description = «En dos líneas» casi igual | 13 | todas |
| Dato de fecha dudoso | 1 | adultos mayores: dice «viernes 14 de noviembre» y el 14/11/2026 es sábado (la nota misma dice que hoy es martes 17) |
| Casi duplicadas entre sí | 1 par | `gta-6-llega-esta-semana-...-1zm28yr` y `como-utilizar-el-truco-de-nueva-zelanda-...-eeh7fdk` (mismo tema, misma sección, misma hora, mismas fuentes) |
| Errores de escritura, textos pegados sin espacio, títulos cortados | 0 | no encontré ninguno en el texto de las 13 |
| Fotos rotas | 0 | todas responden 200 |
| JSON-LD inválido | 0 | todas con NewsArticle, fechas, imagen y autor |
| Enlaces internos rotos | 0 | 87 enlaces internos revisados, solo `/publicidad` da 301 |

Detalles con evidencia:

- **Las tres de Hernán** (`/nota/gemini-4-hydrogen-...-hhydrog`, `/nota/gemini-omni-1-2-flash-...-hgomni1`, `/nota/claude-fable-5-2-...-hfable2`): firman «Hernán Accomo» en la línea de fecha y el JSON-LD pone `"author":{"@type":"Person","name":"Hernán Accomo"}` sin `url`. Se publicaron el 16/11 entre las 18:06 y las 18:08 (tres en dos minutos) y cuentan hechos del 5, 9 y 12 de noviembre, o sea de hace 5 a 12 días. Omni tiene una sola fuente (la de Google). En Fable hay un bloque `adsbygoogle` metido entre dos párrafos del cuerpo (se ve la palabra «Publicidad» a mitad de la nota): con una nota de 176 palabras, el aviso queda en medio del texto.
- **Notas de Balcarce muy finas**: `/nota/choque-entre-dos-camionetas-en-el-centro-de-la-ciudad-m8ui45e` tiene 56 palabras («Tras la colisión, el utilitario terminó su recorrido sobre la vereda.» es todo el segundo párrafo). `/nota/el-piloto-balcarceno-sergio-sosa-...-j3lzchn`, 85. Con la firma «Radar Balcarce» y una fuente (Radio Gabal), parece reescritura corta de otro medio, que es justo lo que AdSense llama contenido de bajo valor.
- **Triple repetición dentro de cada nota**: bajada, bloque «En dos líneas», cuerpo y bloque «Los datos» (Qué/Quién/Dónde/Cuándo) dicen lo mismo. Ejemplo `/nota/adultos-mayores-...-ohuynfq`: la bajada, el «En dos líneas» y el primer párrafo cuentan la cena de cierre; el cuadro repite sala, fecha y organizadores. Hace que una nota de 114 palabras parezca de 300 pero con nada nuevo.
- **«Seguí leyendo» sin relación**: en la nota de Fable (tecnología) salen una policial, una de economía y una de deportes. La nota de Hernán lleva al lector a «Murió un boxeador».
- **Firma de las automáticas**: la línea dice «17 de noviembre de 2026 a las 10:00 · Radar Balcarce». `/como-trabajamos` promete: «Las automáticas se firman Redacción Radar Balcarce y aclaran que fueron escritas con IA y verificadas». En la nota misma no aparece esa aclaración; solo está en el pie general del sitio («escritas con ayuda de IA, verificadas contra las fuentes»). Es una promesa que la página no cumple nota por nota.
- **Fuentes**: el desplegable existe y tiene enlaces con `rel="noopener nofollow"`. Bien.
- **Alt de imágenes**: 26 imágenes en la portada, 0 sin alt. Dos alts raros: `alt="Imagen de «Luna»"` (efeméride) y `alt="Corte de servicio eléctrico en Diversos sectores de la ciudad"` (la D en mayúscula, se nota que lo armó una máquina).

## 2. Técnica y SEO

| Qué | Resultado |
|---|---|
| Portada `/` | 200, 80 KB de HTML (21 KB con brotli), título único, description, canonical, og:image `/og-default.png` 1200x630 de 37 KB |
| Secciones `/seccion/<x>` | 200, title y description únicos por sección, canonical propio, paginación `?pagina=2` con canonical propio (no es noindex, va bien) |
| `/balcarce`, `/tecnologia`, `/politica`, `/policiales` | 404 (las secciones viven en `/seccion/...`; si Google o la gente tienen enlaces cortos viejos, no redirigen) |
| `/publicidad` | **301** a `/nota/publicita-en-radar-balcarce-mediakit`, que es una NewsArticle indexable, firmada «Hernán Accomo», en la sección Balcarce, con 161 palabras y está en `sitemap-2026-11.xml` |
| `/politica-de-privacidad` | 200. `/privacidad`, `/terminos`, `/correcciones`, `/autor/...`, `/equipo`, `/redaccion`, `/politica-editorial`: todas 404 |
| 404 y 410 | Una nota inexistente (`/nota/nada`) da **410** «Esa nota ya no está» con `noindex,nofollow`; una página inexistente da 404 con `noindex`. Correcto |
| `robots.txt` | Permite todo, bloquea `/buscar`, `/panel`, `/ir/`; lista `sitemap.xml` y `sitemap-news.xml` |
| `ads.txt` | 200: `google.com, pub-2759023791445864, DIRECT, f08c47fec0942fa0` (coincide con `google-adsense-account` del `<head>`) |
| `sitemap.xml` | Índice: `sitemap-paginas.xml` (31 URLs), `sitemap-news.xml` (190 URLs, del 15/11 19:00 al 17/11 18:45, o sea 48 h), `sitemap-2026-11.xml` (1.732 URLs con `lastmod` e imagen), `-10` y `-09`. Bien armado |
| JSON-LD | NewsArticle con headline, description, datePublished, dateModified (= datePublished en todas), inLanguage, articleSection, image, wordCount, author, publisher (NewsMediaOrganization con logo), citation. BreadcrumbList. En la portada, WebSite con SearchAction y NewsMediaOrganization con `sameAs` a 5 redes. Válido |
| Title/description de notas | Únicos, pero casi todos los títulos pasan de 60 caracteres con el sufijo « \| Radar Balcarce» (Omni: unos 100) y se cortan en Google |
| Notas con `noindex` | Clima de hoy (`...-clima-2026-11-17`): sí. El resto de las notas, indexables |
| Headers | HSTS 6 meses (sin includeSubDomains ni preload), `x-content-type-options`, `x-frame-options`, `referrer-policy`. **La CSP es `content-security-policy-report-only`, o sea no bloquea nada.** No hay `Permissions-Policy` |
| Caché del HTML | Portada y notas `max-age=14400` (4 horas en el navegador del lector, `s-maxage=300` en Cloudflare); secciones y clima `max-age=60`. Una portada que dice «hace 1 h» puede quedar 4 h vieja en el celular |
| http y www | 301 a https (y www a la raíz) |
| Compresión | Brotli |
| Fuentes tipográficas | Propias (woff2, `font-display:swap`, `immutable` 1 año). Bien |
| Imágenes de la portada | 26 imágenes, **3,9 MB en total**. Las miniaturas `/foto/<huella>-640.jpg` pesan 10 a 90 KB (bien). Pero las 5 fotos `/foto-nota/<id>.jpg` salen **sin versión chica**: `dj1f4qs.jpg` pesa **1,6 MB**, `swq4ezy.jpg` 533 KB (2000x1500), `gq0vyba.jpg` 284 KB, `crt15if.jpg` 257 KB, `49l5lm5.jpg` 241 KB. Son 2,9 MB que en la portada se muestran a 480x320. Caché de esas: `max-age=3600` (las otras, 1 año) |
| Accesibilidad | `lang="es-AR"`, enlace «saltar», `focus-visible` marcado, botones de 40-42 px, fuente base 16 px (20 px la bajada, 17 px el cuerpo), inputs de 16 px (no hace zoom en iPhone). Sin evidencia de contraste malo (colores de sección oscuros con texto blanco); no medí cada par |
| RSS | `/rss.xml` 200, 30 ítems |
| `llms.txt` | 200, bien redactado |
| `/agentes/portada.json` | 404 (no sé si la ruta correcta es otra; el pie de `llms.txt` no la menciona en las primeras líneas) |

## 3. Páginas de confianza

| Página | Existe | Qué tiene | Qué le falta frente a AdSense/Google |
|---|---|---|---|
| `/quienes-somos` | sí | Misión, postura («centro o centro-derecha»), perfil de Hernán (con LinkedIn) y de Andrés, cómo se hace una nota; JSON-LD con fundador | Sin fotos de las personas, sin domicilio ni teléfono de redacción, sin año de fundación; Andrés Gerace figura como «cofundador de BalcarDev» sin su rol en el diario ni enlace |
| `/como-trabajamos` | sí | Proceso en 4 pasos, uso de IA, verificación, qué no se publica, correcciones, publicidad | Es la mejor página del sitio. Le falta una política editorial formal (cómo se decide qué se publica, política de fuentes anónimas, qué es publicidad vs. nota) y la promesa de la firma nota por nota (ver arriba) |
| `/contacto` | sí | WhatsApp, mail `contacto@radarbalcarce.com`, Facebook/Instagram | Sin dirección física ni teléfono fijo ni nombre de responsable; sin formulario (no es obligatorio) |
| `/politica-de-privacidad` | sí | Muy buena: Ley 25.326, Cloudflare Web Analytics sin cookies, cookie propia, AdSense y Analytics con aviso, enlaces a `policies.google.com/technologies/partner-sites` y `adssettings.google.com`, derechos, autoridad de control | Bien para AdSense. Podría mencionar el nombre de las cookies de Google y los socios de publicidad, pero lo pedido está |
| Términos y condiciones | **no** (404) | | Falta: uso del sitio, derechos de autor de las notas y fotos, enlaces a terceros, limitación de responsabilidad |
| Correcciones | **no como página** (está como párrafo dentro de Cómo trabajamos) | | Falta una página `/correcciones` con el procedimiento y, ideal, un registro de las correcciones hechas |
| Publicidad | **no como página** (301 a una nota) | | Falta una página de publicidad real, no una nota fechada el 3/11 |
| Página de autor | **no** (`/autor/hernan-accomo` 404) | | Falta para Hernán Accomo y Andrés Gerace: foto, bio, enlaces, y que la firma de cada nota enlace ahí. Hoy la firma es texto plano y el JSON-LD no tiene `url` del autor |
| Política editorial / ética | **no** | | Es lo que Google busca como señal de confianza en medios |

## 4. Experiencia en celular (solo por código; no vi un celular real)

- `meta viewport` correcto, el layout usa `.ancho{max-width:1200px;padding:0 16px}`, menú desplegable con botón «Menú» y 2 columnas, buscador a ancho completo.
- Scroll horizontal: encontré `main{overflow-x:hidden}` solo en `vistas/panel.mjs` (es del panel) y `overflow-x:auto` solo en `.tabla-planes` (media kit). Las tablas del clima ocultan una columna debajo de 520 px. No vi nada que obligue a scroll horizontal; no lo puedo asegurar sin probarlo en un teléfono.
- **Notas sin foto**: en la portada se ve una placa (`.placa`, 16:9, borde de color de la sección, título adentro y «Radar Balcarce» abajo). En la portada de hoy hay una: «Detuvieron a dos hombres tras una persecución policial por la Panamericana», donde el título aparece dos veces seguidas (dentro de la placa y como título de la tarjeta). En la nota abierta se usa `.placa-nota` (21:9, color de la sección). Funciona y no queda un agujero.
- **Peso en datos móviles**: los 3,9 MB de imágenes de la portada (ver arriba) son el punto flojo en 4G.
- Tres cajas de aviso propio por página («¿Querés publicitar en el diario y en las redes? Hacé clic acá...») más el rótulo visible «Espacio T1/T2/T3» (portada) y «Espacio S1» (secciones). Son textos de uso interno que ve el lector.

## 5. Servicios (al 17/11/2026)

| Servicio | Estado | Fuente visible | Observaciones |
|---|---|---|---|
| Clima `/clima` | Al día: «Hoy 17 de noviembre», ahora 21°, 7 días, región, nota diaria del 17/11 | Sí: «Datos de Open-Meteo para Balcarce» | Dice «Mayormente despejado» ahora y a la vez «lluvia 100 %, 26,1 mm» para hoy; puede ser correcto (la lluvia viene a la tarde) pero choca a simple vista. A revisar, no lo confirmé |
| Farmacia `/farmacias` | Al día: de turno «Del Cerro», rige hasta las 8:30 del 18/11, calendario hasta el 24/11 | Sí: «cronograma del mes del Colegio de Farmacéuticos de Balcarce» | Bien |
| Dólar `/dolar` | Al día: oficial 12:00 y blue 14:57 de hoy, 7 tipos, gráfico | Sí: DolarApi.com y ArgentinaDatos | Pequeña inconsistencia: la tarjeta de la portada dice blue venta $1.605 y el texto del gráfico, «$1.600 (17 nov)» |
| Agenda `/agenda` | Al día, pero **solo 3 eventos** (21/11 dos, 27/11 uno) y 8 «fiestas del año» sin fecha | Sí: agenda oficial de la Municipalidad | Poco contenido propio; hay semanas enteras vacías |
| Hoy `/hoy` | «59 notas de hoy» | n/a | Bien |

## Tabla de hallazgos

| # | Gravedad | Hallazgo | Evidencia | Arreglo propuesto | Esfuerzo | Dónde se arregla |
|---|---|---|---|---|---|---|
| 1 | ALTA | Notas muy cortas: media de 125 palabras; 2 de 13 con menos de 100 y una de 56 | `choque-...-m8ui45e` (56), `el-piloto-...-j3lzchn` (85) | No publicar notas de menos de 120 palabras salvo que sean servicio (corte de luz); o juntar las breves de un día en una nota de resumen. Subir el mínimo de cuerpo (hoy `web/lib/cuerpo.js` del viejo exigía 70) | medio | `v3/nucleo` (el paso que decide publicar); mínimo de palabras |
| 2 | ALTA | Casi todo es reescritura de una sola fuente ajena con foto de otro medio | 6 de 13 con «Fuentes (1)»; 8 de 13 con foto de Clarín, La Nación o Radio Gabal | Para Balcarce, sumar valor propio (contexto, datos locales, qué cambia para el vecino); exigir 2 fuentes salvo gacetilla oficial; reducir fotos de otros medios en favor de placas propias o fotos oficiales | grande | `v3/nucleo` (redacción y fotos) |
| 3 | ALTA | Faltan páginas de confianza: autor, correcciones, términos, publicidad, política editorial | `/autor/hernan-accomo`, `/correcciones`, `/terminos`, `/politica-editorial` dan 404; `/publicidad` es un 301 | Crear las 5 páginas; que la firma de cada nota enlace a la página de autor; sumar `url` del autor al JSON-LD | medio | `v3/sitio/vistas/paginas.mjs`, `vistas/nota.mjs`, `sitio.mjs` (rutas), `sitemap-paginas` en `vistas/xml.mjs` |
| 4 | ALTA | Página de autor inexistente para Hernán y Andrés | La firma es texto plano; JSON-LD `author` sin `url` | Página por autor con foto, bio, enlaces y últimas notas; Andrés con su rol real en el medio | chico | `vistas/paginas.mjs`, `vistas/nota.mjs` |
| 5 | MEDIA | El media kit es una «nota» indexable en la sección Balcarce y `/publicidad` redirige a ella | `/nota/publicita-en-radar-balcarce-mediakit`, en `sitemap-2026-11.xml` | Convertirlo en página `/publicidad` real; sacar la nota del sitemap o ponerle `noindex`; no firmarla como noticia | chico | `v3/nucleo/notas-manuales`, `vistas/paginas.mjs`, `sitio.mjs` |
| 6 | MEDIA | Las 3 notas de Hernán: tres en 2 minutos, hechos de hace 5 a 12 días, una con una sola fuente y publicidad pegada en medio | `hhydrog`, `hgomni1`, `hfable2` (todas 16/11 18:06-18:08) | Escalonar las publicaciones (una por día); para AdSense pesa más una nota firmada y larga (400+ palabras, con análisis propio) que tres de 130-176; no insertar aviso en notas de menos de unas 300 palabras | chico | `v3/nucleo/notas-manuales/*.json`; regla de avisos en `vistas/avisos.mjs` |
| 7 | MEDIA | Triple repetición en cada nota: bajada, «En dos líneas», cuerpo y «Los datos» | `adultos-mayores-...-ohuynfq` | Mostrar «En dos líneas» solo en notas de más de 300 palabras; «Los datos» solo si aporta algo que el cuerpo no dice | chico | `vistas/nota.mjs` |
| 8 | MEDIA | Fotos de nota enormes sin versión chica (3 MB en la portada) | `/foto-nota/dj1f4qs.jpg` 1,6 MB, `swq4ezy.jpg` 533 KB; caché de 1 h | Servir `-640.jpg` también para las rutas `/foto-nota/`, o recomprimir al bajarlas; cachear largo | medio | `v3/sitio/foto-proxy.mjs`, `fotos-copia.mjs` |
| 9 | MEDIA | La promesa de firma «aclaran que fueron escritas con IA y verificadas» no se cumple dentro de la nota | Línea de fecha: «· Radar Balcarce» y nada más | Poner una línea corta bajo la firma: «Escrita con IA a partir de N fuentes y verificada. Cómo trabajamos» (enlace) | chico | `vistas/nota.mjs` |
| 10 | MEDIA | CSP solo en modo «solo informar» y HTML de la portada cacheado 4 h en el navegador | `content-security-policy-report-only`; `Cache-Control: public, max-age=14400` en `/` y en las notas | Pasar la CSP a obligatoria cuando el reporte esté limpio; bajar el `max-age` del HTML a 60 s como las secciones | chico | headers (`v3/sitio/sitio.mjs` o `_headers`; no ubiqué el punto exacto) |
| 11 | MEDIA | Casi duplicadas: GTA 6 horario y truco de Nueva Zelanda | `gta-6-llega-esta-semana-...-1zm28yr` y `como-utilizar-el-truco-...-eeh7fdk` | Unir en una nota o diferenciar el enfoque; la repetida entre notas es otro dato que mira AdSense | medio | `v3/nucleo` (agrupación) |
| 12 | MEDIA | Una fecha de la semana mal dicha: «viernes 14 de noviembre» (14/11 es sábado) | `adultos-mayores-...-ohuynfq` y su cuadro «Cuándo: Viernes 14 de noviembre» | Que el verificador cruce día de la semana y número; en este caso corregir a mano tras mirar la fuente | chico | verificador del núcleo; la nota, a mano |
| 13 | BAJA | Rótulos internos «Espacio T1/T2/T3/S1» visibles al lector | Portada y secciones | Esconder `.aviso-espacio` salvo en el panel | chico | `vistas/avisos.mjs` línea 73, `vistas/base.mjs` línea 408 |
| 14 | BAJA | «Seguí leyendo» muestra notas de otras secciones en notas de tecnología | `hfable2` | Priorizar la misma sección y no mostrar policiales después de una nota de tecnología | chico | `vistas/nota.mjs`, `seguirLeyendoHtml` (el comentario dice que ya prioriza la sección; evidentemente cae al resto cuando hay pocas) |
| 15 | BAJA | Placa duplica el título (placa + título de tarjeta) | «Detuvieron a dos hombres...» en la portada | Quitar el título de dentro de la placa o el de la tarjeta | chico | `vistas/portada.mjs` línea 60 |
| 16 | BAJA | Títulos largos que se cortan en Google | Omni (~100 caracteres con el sufijo), Hydrogen, Fable, truco GTA | Título de página hasta 60 caracteres (aparte del H1) | chico | `vistas/nota.mjs` (`<title>`) |
| 17 | BAJA | `/balcarce`, `/tecnologia`, etc. dan 404 | curl | Redirigir 301 a `/seccion/<x>` | chico | `sitio.mjs` / `redirecciones-viejas.mjs` |
| 18 | BAJA | Alts raros (`Imagen de «Luna»`, «en Diversos sectores») | HTML de portada y de la nota del corte | Generar el alt con el título de la nota, no con la descripción de la IA | chico | `v3/nucleo` (alt de fotos) |
| 19 | BAJA | Agenda con 3 eventos y 8 fiestas sin fecha | `/agenda` | Sumar la agenda de Facebook de clubes y escuelas; si no, aclarar «vacía esta semana» | medio | `v3/sitio/agenda.mjs` |
| 20 | BAJA | Clima: «mayormente despejado» ahora junto a lluvia 100 %; dólar blue $1.605 en tarjeta vs. $1.600 en el texto del gráfico | `/clima`, `/dolar` | Mostrar la hora del dato y revisar de qué momento sale cada cifra | chico | `v3/sitio/datos-del-dia.mjs` |
| 21 | BAJA | `dateModified` igual a `datePublished` siempre | JSON-LD de todas | Está bien si nunca se modifican; si se corrigen, actualizar | chico | `vistas/nota.mjs` |
| 22 | BAJA | HSTS sin `includeSubDomains`, sin `Permissions-Policy` | headers | Agregar `Permissions-Policy` básico | chico | headers |

## Los 10 arreglos que más rinden, en orden

1. **Subir la sustancia de las notas de Balcarce** (hallazgos 1 y 2): mínimo de palabras real, dos fuentes salvo comunicado oficial, y un párrafo de contexto local propio. Es lo que más mueve el «bajo valor».
2. **Crear la página de autor de Hernán Accomo y de Andrés Gerace** con foto y bio, y enlazar la firma desde cada nota y desde el JSON-LD (3 y 4).
3. **Páginas que faltan**: `/correcciones`, `/terminos`, `/publicidad` (real), `/politica-editorial` (3).
4. **Sacar el media kit del flujo de notas** (hallazgo 5): que no sea NewsArticle ni salga en el sitemap de noticias.
5. **Notas de Hernán con más cuerpo y escalonadas** (hallazgo 6): una por día, 400 palabras o más, con análisis propio y 2 fuentes; sin aviso en el medio si el texto es corto.
6. **Aclarar en cada nota que es IA + verificada** (hallazgo 9), para que el sitio cumpla lo que promete en Cómo trabajamos.
7. **Achicar las fotos `/foto-nota/`** y cachearlas un año (hallazgo 8): baja la portada de 3,9 MB a cerca de 1 MB.
8. **Unir las repetidas** entre notas (GTA ×2) y que el verificador cruce día de la semana con número (11 y 12).
9. **Sacar la repetición dentro de la nota**: «En dos líneas» y «Los datos» solo cuando aporten (7), y esconder los rótulos «Espacio T1» (13).
10. **HTML con caché corta y CSP obligatoria** (10), más redirigir `/balcarce` etc. a `/seccion/...` (17).

## Lo que está BIEN (no tocar)

- Códigos HTTP: 200 en lo que existe, 410 con `noindex` en notas retiradas, 404 con `noindex`, http y www con 301 a https.
- Canonical, title y description únicos por página y por sección, paginación con canonical propio.
- JSON-LD NewsArticle completo y válido, BreadcrumbList, NewsMediaOrganization con `sameAs`, WebSite con buscador.
- Sitemaps: índice, uno por mes con imágenes y `lastmod`, uno de noticias de 48 horas (190 URLs) y uno de páginas; todo declarado en `robots.txt`.
- `ads.txt` correcto y coincidente con el código de AdSense.
- Política de privacidad: completa, con cookies, AdSense, Analytics, derechos y autoridad de control.
- `/como-trabajamos`: clara y honesta sobre IA, verificación, fuentes y qué no se publica.
- Desplegable «Fuentes (N)» con enlaces `nofollow` y el crédito de la foto en el epígrafe.
- Fuentes tipográficas propias, brotli, 21 KB de HTML comprimido, miniaturas de 640 px con caché de un año, `lang="es-AR"`, enlace para saltar, foco visible, alts en todas las imágenes.
- Placas con color de sección cuando no hay foto (no queda hueco ni imagen rota).
- Servicios al día de hoy y con fuente visible: clima (Open-Meteo), farmacia (Colegio de Farmacéuticos, con el horario real del turno), dólar (DolarApi y ArgentinaDatos), agenda (Municipalidad).
- Ninguna nota de la muestra tiene errores de escritura, títulos cortados ni texto pegado.
