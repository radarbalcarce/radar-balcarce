# Radar Balcarce contra la competencia (5/11/2026)

*Para Hernán y Andrés. Investigación de sólo lectura: no se tocó código, variables ni secretos. Todo lo que dice «visto» lo miramos el 5/11/2026; lo que no se pudo verificar, está marcado «NO VERIFICADO».*

## Cómo se hizo y qué límites tuvo

- Nuestro sitio se revisó en vivo (portada, una nota, la sección Balcarce, /clima, /farmacias, /dolar, robots, sitemaps, manifest, RSS) bajándolo con `curl` y leyendo el HTML.
- Los medios de la competencia se abrieron con una herramienta que resume la portada. Eso sirve para saber qué bloques tienen, **no** para ver el diseño en el celular. De Clarín, TN, Mar del Plata (MDZ) y los tres sitios hiperlocales del mundo (Block Club Chicago, Mission Local, Berkeleyside) el servidor nos rechazó (403) o no dejó abrirlos: de ellos casi todo es **NO VERIFICADO**, salvo lo que se cita de buscadores.
- No se midió la velocidad en un celular real (sólo el peso del HTML y el tiempo de respuesta desde la PC). No se corrió Lighthouse.
- «No aparece» quiere decir que no se vio en la portada o en el HTML; puede estar en otra pantalla.

## 1. Tabla comparativa corta

| Cosa | Radar Balcarce (visto) | Medios de Balcarce | Mar del Plata (0223, La Capital, El Marplatense) | Nacionales | Hiperlocales del mundo |
|---|---|---|---|---|---|
| Portada | Última hora, «Lo último de Balcarce», «Más de hoy», clima, farmacia y dólar arriba | Más cargada; La Vanguardia y El Diario Balcarce mezclan local, sucesos, campo, fúnebres | 0223: muchas secciones y servicios; La Capital: «Lo más visto hoy» | Portadas enormes | NO VERIFICADO |
| Más leídas / «seguí leyendo» en la nota | **No aparece** (la nota termina en compartir, fuentes y publicidad) | NO VERIFICADO | 0223 «Lo más leído»; La Capital «Lo más visto hoy» | Infobae y La Nación tienen bloques de notas (sólo vi portada) | NO VERIFICADO |
| Canal de WhatsApp para lectores | **No** (sólo un número para mandar datos) | No vimos enlace | El Marplatense: sí, enlace al canal. 0223: sólo un contacto wa.me | Infobae: enlace a un canal de WhatsApp en la portada | Block Club: dicen que tiene (fuente secundaria, poco confiable) |
| Newsletter | **No** | No vimos | 0223: sí, botón «Suscribirme». La Capital y El Marplatense: no vimos | La Nación: enlace a newsletters; Página 12: no vimos; Clarín y TN: la palabra aparece en el código | Block Club: es su motor (140.000 lectores de newsletter, 2021) |
| Notificaciones push | **No** | No vimos | 0223: banner para activarlas | Clarín: algo en el código (NO VERIFICADO) | NO VERIFICADO |
| Modo oscuro | Tiene estilos oscuros sólo en clima/día (3 reglas); el sitio en general es claro | No | No vimos | Infobae/Clarín: aparece la palabra en el código, NO VERIFICADO | NO VERIFICADO |
| Peso de la portada (HTML) | **74 KB**, un solo script (el contador de Cloudflare) | La Vanguardia 57 KB, News Balcarce 181 KB, Puntonueve 394 KB | 0223: 1,6 MB | Infobae 0,79 MB, TN 0,6 MB, Clarín 4 MB | NO VERIFICADO |
| Clima / farmacia / dólar | Los tres, con página propia, gráfico hora por hora, región y semana | El Diario Balcarce: clima; La Vanguardia: farmacias y edictos | 0223: clima completo con cámaras, farmacias, dólar y más; La Capital: farmacias, cotizaciones, quiniela | Cotizaciones en Ámbito, Cronista, La Nación | — |
| Firma / quién escribió | «Radar Balcarce» en lo automático + línea «Escrita con IA y verificada contra sus fuentes · Cómo trabajamos»; fuentes desplegables | NO VERIFICADO | NO VERIFICADO | Página 12 tiene un «Protocolo de IA» publicado | — |
| Publicidad | Espacios propios (T1 a T4, N2, P1), media kit, AdSense en revisión | Banners | Media kit, banners | Banners | Membresía + avisos (Block Club) |
| SEO | NewsArticle completo, sitemap de noticias, sitemap por mes, llms.txt, RSS, manifest, canónicas | Sin datos estructurados en La Vanguardia y News Balcarce (visto) | Con JSON-LD (0223) | Con JSON-LD | — |
| Fúnebres / quiniela / horóscopo | No (los fúnebres no se publican por regla) | Fúnebres en La Vanguardia y El Diario Balcarce | Fúnebres, quiniela, horóscopo | — | — |

Fuentes de la tabla: https://radarbalcarce.com, https://www.0223.com.ar, https://www.lacapitalmdp.com, https://www.elmarplatense.com, https://www.diariolavanguardia.com/, https://eldiariobalcarce.com.ar/, https://newsbalcarce.com.ar, https://puntonueve.com.ar, https://www.infobae.com, https://www.lanacion.com.ar, https://www.pagina12.com.ar, https://www.ambito.com, https://www.cronista.com, https://www.perfil.com, https://www.clarin.com, https://tn.com.ar. Hiperlocales: https://en.wikipedia.org/wiki/Block_Club_Chicago y https://gatewayjr.org/?p=11312 (cifras de 2021).

## 2. Qué vimos en nuestro propio sitio (celular primero)

**Lo que está bien**
- Es liviano: 74 KB la portada, 50 KB una nota, respuesta en 0,15 s desde Cloudflare, una sola librería externa. Eso es una ventaja real contra los 0,6 a 4 MB de los medios grandes (https://radarbalcarce.com).
- Tiene lo que los diarios chicos casi no tienen: NewsArticle completo con `citation` e `isBasedOn`, sitemap de noticias, sitemaps por mes, `llms.txt`, RSS, canónicas y un manifest (https://radarbalcarce.com/sitemap.xml, https://radarbalcarce.com/sitemap-news.xml, https://radarbalcarce.com/manifest.webmanifest).
- /clima es más completo que lo que vimos en 0223 y en cualquier medio de Balcarce: gráfico de 48 horas, siete días, región, UV, alertas del SMN. /farmacias tiene la semana entera con teléfono y mapa (https://radarbalcarce.com/clima, https://radarbalcarce.com/farmacias).
- La nota se lee limpia: «En dos líneas», «Los datos», «Qué falta saber», compartir con WhatsApp primero, fuentes cerradas.

**Lo que falla o queda atrás**
1. **Las fotos se cargan desde la página de otro medio.** Las 21 imágenes de la portada y la de la nota que miramos apuntan a servidores ajenos (`radiogabal.com.ar`, `diariolavanguardia.com`), y la `og:image` de la portada hoy es una foto de La Vanguardia. Si ellos la borran o bloquean, la foto se rompe en nuestro sitio y en lo que se comparte. Además choca con la regla de guardar la foto en el banco propio (ya está anotado como idea 3 del resumen del 5/11). Ver mejora 1.
2. **Al final de una nota no hay adónde ir.** Ni notas relacionadas, ni «más de Balcarce», ni «lo más leído». Es la causa más probable de que se lea una nota y se salga del sitio.
3. **No hay forma de quedarse con nosotros fuera de las redes**: ni canal de WhatsApp, ni newsletter, ni push. Sólo hay un WhatsApp para que nos manden datos.
4. **En el HTML de la portada y de las notas no encontramos** la etiqueta `max-image-preview:large` (Google la pide para mostrar imagen grande en Discover), ni un `<link rel="manifest">`, ni ícono ni `theme-color` enlazados (el archivo del manifest existe, pero no lo vimos enlazado). Puede que lleguen por otro camino; hay que confirmarlo.
5. **La portada no tiene datos estructurados** (ni `WebSite` con buscador ni `Organization`). Las notas sí.
6. **La foto principal de portada mide 640 × 400**: para Google Discover Google recomienda imágenes de 1.200 px de ancho o más (https://developers.google.com/search/docs/advanced/mobile/google-discover?hl=es; la cifra de 1.200 sale de fuentes secundarias en la búsqueda, **verificar en la documentación oficial**).
7. **Accesibilidad**: tiene `lang="es-AR"`, foco visible, textos alternativos y colores con contraste cuidado; pero no vimos un enlace «saltar al contenido» y hay muy pocos `aria-*` (4 etiquetas, 2 de menú). No se probó con lector de pantalla.
8. **Los pie de cookies y los espacios de publicidad** ocupan lugar: en cada nota hay dos bloques de «¿Querés publicitar?» antes del pie. No se midió si empujan el contenido (CLS).
9. **No es PWA de verdad**: no vimos service worker, así que no hay lectura sin conexión ni instalación guiada.

## 3. Qué hacen los otros que nosotros no (por grupo)

**Medios de Balcarce (La Vanguardia, El Diario Balcarce, News Balcarce, Puntonueve)**
- Servicios comunitarios que nosotros no publicamos: fúnebres/edictos (La Vanguardia, El Diario Balcarce), clima en el encabezado (El Diario Balcarce), banners de comercios locales. Nuestra regla de no publicar sepelios se mantiene; los edictos legales son otra cosa y no los evaluamos.
- Técnicamente atrás: La Vanguardia y News Balcarce no tienen datos estructurados ni manifest (visto en el HTML). Nuestro sitio es más liviano que Puntonueve (394 KB) y News Balcarce (181 KB).
- Cosas que **no** pudimos verificar: si tienen canal de WhatsApp o newsletter propio fuera de la portada, y su tráfico.

**Mar del Plata (0223, La Capital, El Marplatense)**
- 0223: «Lo más leído», newsletter, push, media kit, clima con cámaras en vivo, farmacias, dólar completo (oficial, blue, MEP, CCL, euro, bitcoin), quiniela, horóscopo, fúnebres, radio en vivo, registro de usuarios, y notas con la hora en la dirección (https://www.0223.com.ar).
- La Capital: «Lo más visto hoy», farmacias, cotizaciones, Merval y UVA, quiniela, horóscopo, cartelera (https://www.lacapitalmdp.com).
- El Marplatense: canal de WhatsApp, secciones de tono liviano («Guau & Miau», «Me siento bien»), publicidad (https://www.elmarplatense.com).
- MDZ/Mdq Noticias: no se pudo abrir. NO VERIFICADO.

**Nacionales**
- Infobae: enlace a un canal de WhatsApp (https://www.whatsapp.com/channel/0029Va9TEIjLdQefbAqn7T1g, encontrado en el HTML de https://www.infobae.com) y un manifest.
- La Nación: accesos a newsletters, suscripción y app (https://www.lanacion.com.ar).
- Página 12: apps para Android y Apple, un «Protocolo de IA», notas «para socios» (https://www.pagina12.com.ar). Es el único que vimos con una política pública de IA, parecida a nuestro «Cómo trabajamos».
- Ámbito y El Cronista: cotizaciones en la portada (https://www.ambito.com, https://www.cronista.com).
- Clarín y TN: la palabra «newsletter» y de «push» aparece en el código, pero no pudimos ver las pantallas. NO VERIFICADO. Pesan 4 MB y 0,6 MB.
- Cuántos seguidores tienen los canales de WhatsApp de los medios argentinos: **no encontramos cifras** (búsqueda del 5/11).

**Hiperlocales del mundo**
- Block Club Chicago: sitio de barrios, de lo gratuito a lo pago ($5 por mes), con newsletter como principal activo (140.000 lectores de newsletter y 15.500 pagos en 2021, dato viejo) (https://en.wikipedia.org/wiki/Block_Club_Chicago, https://gatewayjr.org/?p=11312). Una fuente poco confiable dice que su canal de WhatsApp juntó 3.200 seguidores en 6 semanas: NO VERIFICADO.
- Mission Local y Berkeleyside: no se pudieron abrir ni encontramos datos. NO VERIFICADO.
- Lo que sí enseña el caso de Block Club: lo que retiene al lector chico no es la portada, es el mail o el chat que le llega solo.

## 4. Mejoras concretas, de más a menos importante

Referencia de costo: el presupuesto extra es menos de US$ 10 por mes. «Costo» dice lo que cuesta; todo lo que no tiene costo marcado es gratis.

| # | Mejora | Quién ya lo hace | Esfuerzo | Costo | Riesgo |
|---|---|---|---|---|---|
| 1 | **Guardar copia propia de cada foto usada y servirla desde radarbalcarce.com** (hoy se cargan desde el servidor del otro medio). Evita fotos rotas, mejora velocidad y la `og:image` de lo compartido. Ya está en el resumen como idea 3. | Es lo normal en todo medio (el nuestro es la excepción vista) | Medio | R2 de Cloudflare, dentro del plan gratis hasta 10 GB (si pasa, centavos); verificar | Medio: la regla de crédito y marca de agua tiene que seguir cumpliéndose; probar con las fotos reales |
| 2 | **Bloque «Seguí leyendo» al final de cada nota**: 3 notas de la misma sección y 2 de Balcarce, y «lo más leído» del día. | 0223 «Lo más leído»; La Capital «Lo más visto hoy» | Bajo/medio | Gratis | Bajo |
| 3 | **Canal de WhatsApp de Radar Balcarce** con el repaso del día y alertas importantes (clima, cortes, farmacia). Enlace en el encabezado, el pie, cada nota y las redes. Los canales no muestran el número de los lectores. | Infobae (visto); El Marplatense (visto); La Nación publicó la guía en 2023 (https://www.lanacion.com.ar/tecnologia/la-nacion-en-los-canales-de-whatsapp-como-recibir-alertas-y-ultimas-noticias-nid20092023/) | Bajo (crearlo es de una persona; publicar puede salir del bot que ya tenemos) | Gratis | Bajo; ojo: es un trámite de Hernán con el número de WhatsApp del medio |
| 4 | **Etiqueta `max-image-preview:large` y `og:image` de 1.200 px de ancho o más** en notas y portada, y revisar que el encabezado la lleve. Condición de Google para mostrar la foto grande en Discover. | Estándar para quien quiere Discover (Google Search Central) | Bajo | Gratis | Bajo; depende de que haya foto grande y propia (mejora 1) |
| 5 | **Perfil en Google (Publisher Center / «Seguir en Google»)**: ya está en las ideas del resumen (idea 6). El sitio ya tiene sitemap de noticias y NewsArticle, que es lo difícil. | Medios de todo tamaño; no verificamos cuáles de Balcarce lo tienen | Bajo | Gratis | Bajo; trámite de una persona. Los requisitos exactos: NO VERIFICADO, leer la ayuda de Google |
| 6 | **Newsletter semanal o diario** («Lo que pasó en Balcarce»), armado solo con las notas más leídas, el clima y la farmacia de la semana. | 0223 (visto); La Nación (visto); Block Club Chicago lo tiene como motor | Medio | Hay servicios gratis hasta unos cientos de suscriptores y pagos desde ~US$ 10 por mes (precio actual NO VERIFICADO). Marcar: puede pasar del presupuesto | Medio: pide un formulario y un aviso de privacidad (datos personales) |
| 7 | **Notificaciones push web** para lo urgente (alerta del SMN, corte de ruta, farmacia del día). Requiere service worker y manifest enlazado. | 0223 (visto) | Medio/alto | Gratis hasta cierto volumen en OneSignal (plan actual NO VERIFICADO); si no, desarrollo propio con Cloudflare | Medio: molestar al lector con demasiados avisos; un tope diario |
| 8 | **Enlazar el manifest, íconos y `theme-color` en el HTML** y sumar el botón «Instalar Radar» en Android. Hoy el archivo existe, pero no vimos que se enlace. | Infobae tiene manifest (visto); 0223 también | Bajo | Gratis | Bajo |
| 9 | **Modo oscuro de todo el sitio** (hoy sólo tiene estilos oscuros en clima y día). Muchos leen de noche en el celular. | No lo encontramos en los medios de la zona | Medio | Gratis | Bajo; cuidar contraste y colores de sección |
| 10 | **«Saltar al contenido», más etiquetas `aria`, probar con lector de pantalla y revisar el contraste de las 14 secciones** (varios de los colores de sección son claros sobre crema). | Casi nadie en la zona; es ventaja y requisito legal futuro | Bajo/medio | Gratis | Bajo |
| 11 | **Datos estructurados en la portada** (`WebSite` con buscador, `Organization` con redes), `sameAs` con Facebook, Instagram, X, TikTok, YouTube. | 0223 y los nacionales (JSON-LD visto) | Bajo | Gratis | Bajo |
| 12 | **Más datos útiles de Balcarce, que ya tenemos por fuentes y se pueden armar sin IA**: feriados/días sin bancos (se viene un fin de semana largo hasta el 11/11, según Perfil), horarios de colectivos y de oficinas, teléfonos útiles, estado de rutas 226 y 55. | 0223 (servicios), La Capital (quiniela, cartelera) | Medio | Gratis; cuidar que el dato salga de fuente oficial | Medio: un dato viejo es peor que no tenerlo; con fecha de «última revisión» |
| 13 | **Quiniela y horóscopo** (la gente los busca). Quiniela viene de datos públicos; el horóscopo se arma con texto propio. | 0223 y La Capital (vistos) | Bajo/medio | Gratis | Medio: la quiniela debe salir de fuente oficial; ojo con juego (decisión editorial de Hernán) |
| 14 | **Más leídas por sección y «Lo más leído de la semana»** en la portada, medido con lo que ya mide Cloudflare. | 0223, La Capital | Medio | Gratis | Bajo |
| 15 | **Una portada más corta en el celular**: hoy hay varios bloques de lista seguidos (Última hora, Lo último, Más de hoy, Más noticias). Probar con 8 a 10 notas y botón «Ver más». Cambio visible: se consulta antes con Hernán. | Medios de ciudades chicas del mundo usan portadas cortas (NO VERIFICADO) | Medio | Gratis | Medio: cambia lo que la gente ve; medir antes y después |
| 16 | **Perfil de autor / firma con página** para lo que firma una persona (Hernán): foto, qué cubre, contacto. Ya hay «Quiénes somos» y «Cómo trabajamos». Suma confianza (la señal de experiencia que Google valora, E-E-A-T: NO VERIFICADO el peso exacto). | Página 12 publica un protocolo de IA (visto) | Bajo | Gratis | Bajo |
| 17 | **Cámaras o fotos del tiempo de Balcarce** (sólo si hay una fuente pública autorizada) y alerta de lluvia en el celular. Hoy el clima es el mejor servicio del sitio; falta hacerlo notar en el encabezado. | 0223 tiene cámaras en vivo (visto) | Medio | Gratis o pagos a terceros (NO VERIFICADO) | Medio: derechos de las cámaras |
| 18 | **Botón «Compartir» nativo del celular** (el menú del teléfono) además de WhatsApp/Facebook/X/Telegram, y un botón «Copiar enlace». | Estándar en medios nacionales (no verificado en detalle) | Bajo | Gratis | Bajo |
| 19 | **Medir la velocidad real** en un celular de gama baja con 4G (Lighthouse, PageSpeed, Cloudflare Web Analytics) para tener una línea de base y cuidar el CLS de los espacios de publicidad antes de que AdSense los llene. | — | Bajo | Gratis | Bajo; AdSense suele empeorar la velocidad y el salto de diseño |
| 20 | **Service worker simple para leer la última portada sin señal** (en el campo la señal falla). Va con la mejora 8. | Nadie visto | Medio | Gratis | Medio: caché mal hecha muestra noticias viejas; vencimiento corto |
| 21 | **Sección o etiqueta «Servicios»** que junte clima, farmacia, dólar, teléfonos útiles y feriados en una sola pestaña del menú, en vez de tres enlaces sueltos. | 0223 («servicios» en el menú, visto) | Bajo | Gratis | Bajo; es un cambio de menú: consultar |
| 22 | **Hacer pública la política de IA con más detalle** (qué se automatiza, cómo se corrige, cómo se reclama) y un enlace «Corregir/avisar un error» en cada nota por WhatsApp. | Página 12 publica un «Protocolo de IA» (visto) | Bajo | Gratis | Bajo; refuerza la regla «cada nota dice quién la escribió» |

### Lo que NO recomendamos (y por qué)
- **AMP**: para imágenes grandes en Discover Google pide `max-image-preview:large` **o** AMP, así que alcanza con la etiqueta (https://developers.google.com/search/docs/advanced/mobile/google-discover?hl=es). Con el sitio tan liviano que ya tenemos, no vale la pena.
- **Fúnebres**: los competidores locales los publican, pero nuestra regla es no publicarlos nunca. No lo tocamos sin pregunta.
- **Registro de usuarios con clave** (como 0223): suma datos personales y riesgo, y no hay un beneficio claro hoy.

## 5. Las 8 más importantes, en una línea

1. Guardar las fotos en nuestro servidor (hoy se cargan del de otro medio).
2. «Seguí leyendo» y «lo más leído» al final de cada nota.
3. Canal de WhatsApp propio del medio.
4. `max-image-preview:large` e imágenes grandes para Google Discover.
5. Perfil en Google (Publisher Center / «Seguir en Google»).
6. Newsletter semanal (ojo con el costo si crece).
7. Manifest, íconos y botón «Instalar» (y luego avisos push).
8. Modo oscuro completo y mejoras de accesibilidad.

## 6. Qué quedó sin verificar

- Diseño real en el celular de todos los competidores (sólo leímos texto de portada).
- Clarín, TN, MDZ/Mdq Noticias, Block Club Chicago, Mission Local y Berkeleyside: no abrieron.
- Seguidores de los canales de WhatsApp y de las newsletters de los medios argentinos.
- Precios actuales de servicios de newsletter y push (podrían pasar de US$ 10 por mes).
- Si los medios de Balcarce tienen canal de WhatsApp, newsletter o redes con más alcance que las nuestras.
- Los requisitos exactos del Publisher Center para un medio nuevo.
