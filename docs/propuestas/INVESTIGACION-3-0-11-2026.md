# Investigación para Radar 3.0 (3/11/2026)

Hecha con búsquedas web y lectura de páginas oficiales de Google. Donde un dato no se encontró, está dicho. Lo que sale de blogs de terceros va marcado como "(tercero)": hay que verificarlo antes de decidir.
Las partes 5 y 6 salen en buena parte de criterio general, no de fuentes que haya leído esta vez; también están marcadas.

---

## 1. Google AdSense para un medio chico en Argentina

### Qué piden de verdad (oficial)
- Contenido "de alta calidad, original y que atraiga audiencia", cumplir las políticas del programa, ser mayor de 18 y poder tocar el HTML del sitio. Fuente: https://support.google.com/adsense/answer/9724
- Rechazo por "contenido insuficiente": páginas con poco texto, plantillas vacías o sitios "en construcción". Google no da mínimo de palabras, ni de notas, ni de visitas. Fuente: https://blog.google/products/adsense/how-to-address-insufficient-content/
- Contenido copiado o apenas retocado ("con sinónimos o técnicas automatizadas") puede quedar sin anuncios. Fuente: https://support.google.com/adsense/answer/10015918?hl=es
- Prohibido pedir clics, usar flechas o formatos que confundan el aviso con la nota; las etiquetas deben ser honestas ("Publicidad"). Fuente: https://support.google.com/adsense/answer/48182
- Las cifras de "20 a 60 notas", "600 palabras", "6 meses de antigüedad" que circulan son consejos de blogs, **no requisitos** (tercero).
- **No encontré** un plazo oficial de revisión ni una política escrita de AdSense sobre contenido de IA. La práctica que sí es oficial es la de Search (ver punto 4).

### El riesgo específico de Radar
Radar es un sitio que **reescribe con IA lo que cuentan otros medios**. Para AdSense, "contenido modificado ligeramente con técnicas automatizadas" es justo lo que puede darle un rechazo por contenido no original. La defensa: que cada nota tenga valor propio (fuentes citadas, cruce de varias fuentes, datos locales, firma, contexto de Balcarce), y que lo propio (agenda, farmacia, clima, notas de redacción de Hernán, notas con datos) pese en el sitio. Es una predicción mía, no un dato confirmado.

### Ingresos realistas
- No existen datos públicos de RPM de AdSense para noticias locales argentinas. **No lo encontré.**
- Referencias flojas (terceros): noticias en la franja baja, unos US$ 3 a 8 de RPM en mercados ricos; para tráfico de Argentina multiplicar por ~0,25 (https://hacecuentas.com/calculadora-blog-adsense-rpm-nicho). Eso daría del orden de **US$ 0,5 a 2 por mil páginas vistas**, con mucha incertidumbre.
- Cuenta de ejemplo (supuesto mío): 5.000 páginas vistas por día = 150.000 por mes x US$ 1 por mil = ~US$ 150 por mes. Es parecido a un plan chico de publicidad local. No es un negocio por sí solo; es un complemento que se arma una vez.
- Cobro: hay que estar inscripto en Monotributo o régimen general para facturar (https://www.econoblog.com.ar/51166/afip-como-facturar-ingresos-por-google-adsense) y completar los datos impositivos de AdSense. **No encontré** la retención exacta para editores argentinos: consultar a un contador.

### Cómo convive con publicidad local vendida a mano
- Primero los avisos propios (vendidos), AdSense en lugares de relleno (fin de nota, lateral). Reservar lugares fijos y rotulados "Publicidad".
- Cuidado: AdSense **no puede** mostrarse en una nota patrocinada si el anunciante es sensible o compite; hay controles de categorías de anunciantes en el panel de AdSense para bloquear competidores de tus clientes (función de AdSense; verificar en el panel).
- Nunca poner un aviso de AdSense pegado a notas rojas (policiales sensibles, menores): ya es regla de Radar y AdSense también tiene políticas de contenido sensible.

### Qué preparar ANTES de pedir el alta
1. Páginas: Política de privacidad (con mención de cookies y de AdSense), Contacto (mail + WhatsApp), Quiénes somos (quién edita, cómo se usa la IA, cómo se verifica), Política editorial/uso de IA y correcciones. Verificar cuáles ya existen en el sitio.
2. `ads.txt` en la raíz (se genera al dar el alta, lo da AdSense).
3. Espacios de aviso reservados con alto fijo (para no sumar CLS) y una nota al lector "Publicidad".
4. Core Web Vitals: medir LCP, INP y CLS con Cloudflare Web Analytics y Search Console antes. Los avisos suelen empeorar CLS.
5. Consentimiento de cookies: en Argentina **no encontré una norma específica de banner**. Fuentes de terceros dicen que la Ley 25.326 y la AAIP exigen consentimiento informado para el rastreo publicitario, y hay un proyecto de reforma tipo GDPR en debate (https://flexyconsent.com/blog/argentina-data-protection-reform-cookie-consent-guide/, https://cm.twobirds.com/en/trending-topics/global-cookie-review/argentina). Recomendación prudente: aviso simple con aceptar/rechazar para anuncios personalizados, y política de privacidad clara. Verificar con un abogado cuando haya ingresos.
6. Un buen número de notas viejas indexadas y tráfico orgánico estable (el sitio de 3.0 es nuevo: no pedir el alta con 3 semanas de vida).

### Alternativas (terceros, verificar)
- Ezoic habría subido su mínimo a 250.000 páginas por mes en febrero de 2026; Raptive, entre 25.000 y 100.000 según la fuente; Mediavine, 50.000 sesiones para el programa completo; Adsterra sin mínimo pero con RPM bajo (US$ 1 a 8); Newor Media dice aceptar desde 5.000 visitas. Fuente: https://newormedia.com/blog/best-adsense-alternatives/ y https://newormedia.com/blog/?p=1430. Son blogs de las propias redes: no sirven como garantía. Ninguno está probado con medios argentinos chicos.
- **Alternativa real para Radar:** publicidad directa + notas patrocinadas + pauta oficial municipal/provincial (en la Provincia hay antecedentes de pauta local desigual y poco transparente: https://www.letrap.com.ar/nota/2021-8-11-12-38-0-la-supervivencia-de-los-medios-locales-bonaerenses/amp).

---

## 2. Qué hacen otros medios locales

### Medios argentinos que miré (las páginas de inicio)
- **El Diario de Tandil** (https://www.eldiariodetandil.com): secciones Política, Policiales, Deportes, Sociedad, Nacionales, Cultura, **Necrológicas** en el menú y la portada, Radio en vivo, Audios, **Encuesta** sobre lo que más preocupa a los vecinos, formulario de **suscripción** a novedades, **carta al director**, "reportar error", un "Okapi viajes" y "Casas de hoy" (inmobiliario). Los avisos se ven, pero **no hay una página que explique cómo anunciar**.
- **La Nueva (Bahía Blanca)** (https://www.lanueva.com): La ciudad, Punta Alta, La región, **Farmacias, Transportes, Loterías, Datos útiles, Fúnebres, Edictos, Teléfonos de urgencia, Clasificados, El tiempo, Horóscopo, Suplementos**, "Mi cuenta"/registro. Es un diario con red de servicios; no vi agenda ni WhatsApp en la parte que se pudo leer.
- No pude abrir Necochea. Buscando medios de Olavarría, Azul y Mar del Plata no aparecieron datos actuales útiles: **no lo pude relevar**.
- Vía País (grupo Clarín, medios regionales) tiene páginas por ciudad: https://viapais.com.ar/azul/

### Qué servicios aparecen en los medios regionales y cuáles encajan con Radar
Lo que aparece: farmacias de turno, teléfonos útiles, loterías, clima, clasificados, edictos, necrológicas, encuestas, carta al lector, suplementos. Para Radar (sin sepelios):
- **Ya lo tiene o es barato:** farmacias de turno, clima, agenda del municipio.
- **Alto valor/bajo esfuerzo:** "Datos útiles" y teléfonos de urgencia en una página fija (buen SEO local y de servicio), horarios de colectivos/transporte si hay fuente, estado de rutas y cortes de luz/agua (si hay fuente oficial).
- **Engagement:** una encuesta semanal ("¿qué te preocupa?") tipo Tandil, y "carta del lector" con moderación.
- **Edictos y avisos legales:** hay oferta en La Nueva; en Balcarce podría ser una línea de ingreso, pero es un trámite con requisitos legales (diario habilitado). No investigué eso.

### Canales de mensajería (afuera, mejor documentado)
- Nieman Lab abrió un canal de WhatsApp (noviembre 2023) y cita tasas de apertura de ~90% en comunidades de WhatsApp de Reach (cifra del propio medio/vendedor): https://www.niemanlab.org/2023/11/nieman-lab-now-has-a-whatsapp-channel/ y https://www.niemanlab.org/reading/whatsapp-for-publishers-how-reach-is-driving-millions-of-page-views-via-messaging-app/
- Lenfest Local Lab y GroundSource: el SMS/mensaje corto funciona porque no necesita app ni datos y se vuelve conversación: https://www.niemanlab.org/2019/02/how-the-lenfest-local-lab-used-texting-to-inform-philadelphians-about-election-issues/
- El Digital News Report 2025 del Reuters Institute dice que notificaciones y newsletters sirven para profundizar la relación con quien ya te lee; también que pocos medios viven de lectores porque la disposición a pagar es baja. Fuente: https://podcasts.ox.ac.uk/digital-news-report-2025-episode-6-how-people-navigate-local-news-and-information
- **No encontré** un informe del Reuters Institute específico sobre medios locales ni casos concretos de 2025 de Nieman Lab abiertos a texto completo. No inventé ejemplos.

### Cómo monetizan (lo que sí está documentado)
- Los medios locales digitales de EE.UU. que cita Nieman/Newsonomics viven de **patrocinio y eventos**: Charlotte Agenda tomó 65% de sus ingresos de patrocinios (2017); Spirited Media, 75% entre patrocinios y eventos (https://newsonomics.com/newsonomics-how-grows-the-millennial-market-charlotte-agenda-and-spirited-media/). Axios, más de 50% por newsletters patrocinados (https://www.niemanlab.org/reading/axios-will-turn-a-profit-this-year-thanks-to-its-sponsored-newsletter-model-and-will-launch-local-newsletters-in-four-cities/). Datos viejos y de ciudades grandes: sirven como dirección, no como proyección para 45.000 habitantes.
- En Provincia de Buenos Aires la **pauta oficial** es una fuente central y desigual (en 2020, 68 diarios bonaerenses recibieron ~34 millones de pesos en total de pauta nacional; Letra P, 2021, dato viejo). Para Radar: ofrecer pauta a organismos de Balcarce sin depender de ella.

### Recomendaciones de la sección 2 (impacto/esfuerzo)
1. Canal de WhatsApp (el resumen del día + alertas de interés público) y el de Telegram que ya hay: bajo esfuerzo, alto retorno de lectores recurrentes.
2. Newsletter de mail diaria o semanal, con un lugar patrocinado ("Presentado por…"): se puede armar con el motor que ya arma el informe.
3. Página de "Datos útiles" y "Teléfonos de emergencia".
4. Encuesta semanal en el sitio y en historias de Instagram.
5. Botón "Mandanos información" con WhatsApp: pedir foto/video, autorizar uso, y Radar verifica antes de publicar (ya hay panel de pistas).
6. Después: eventos/sorteos con comercios como forma de patrocinio.

---

## 3. Analíticas

### Qué medir
**Web:** lectores únicos con país Argentina (y Balcarce/provincia si la herramienta lo da), visitas por origen (Google, Discover, Facebook, Instagram, directo, WhatsApp), notas más leídas por sección, retorno (nuevos vs recurrentes), páginas por visita, Core Web Vitals reales (LCP, INP, CLS).
**Redes:** alcance de cada pieza, vistas, tiempo medio de visualización, compartidos y guardados, seguidores nuevos, clics al sitio. En Instagram Meta ya cambió: "plays" e "impressions" quedaron deprecadas y la base pasó a **views**; hay `ig_reels_avg_watch_time` y `ig_reels_video_view_total_time` (en milisegundos, según un tercero). **No encontré** una curva de retención por API; parece existir solo en la app. Fuente: https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights/ (verificar nombres vigentes en el changelog de Meta antes de programar).

### Herramientas gratis
- **Cloudflare Web Analytics**: gratis, sin cookies, mide Core Web Vitals (LCP, INP, CLS) de las visitas reales; no tiene eventos ni embudos (terceros). Cloudflare: https://www.cloudflare.com/web-analytics/ . Ventaja para Radar: no necesita banner de cookies para analítica.
- **Search Console**: consultas, páginas, Discover y Google News (informe de rendimiento de Discover, 16 meses): https://developers.google.com/search/docs/appearance/google-discover
- **Google Analytics 4**: da retorno, audiencias y eventos, pero pone cookies y complica el consentimiento. Sumar solo si hace falta (por ejemplo, para vender a anunciantes con más detalle o para AdSense).
- **Meta Business Suite / Graph API**: ya existe `redes/estadisticas.mjs` en el repo; extender a views y tiempo de visualización de los reels.

### Informe diario (que ya existe) y semanal
Diario (corto, para decidir): nota más leída, reel con más vistas, horario de la mejor pieza, qué falló.
Semanal (una página para Hernán, con la acción):
1. Top 10 notas por lectores y por origen; qué sección crece/cae.
2. Los 5 mejores y 5 peores reels: duración, gancho (primeros 3 s), tema, hora.
3. Mejores horarios por red (hora de publicación vs alcance en las primeras 24 h).
4. Lectores recurrentes vs nuevos.
5. Qué replicar (temas y formatos que se repiten en el top) y qué dejar.
6. Salud: notas con LCP lento, errores de Search Console, pérdida de indexación.
Regla simple: cada semana, tres decisiones escritas ("más X, menos Y, probar Z").

---

## 4. SEO para noticias en 2026

Oficial de Google (leído):
- **Discover**: imágenes de al menos 1.200 px de ancho (más de 300.000 píxeles), con `max-image-preview:large` o AMP; título que refleje la nota, sin clickbait ni sensacionalismo; sin datos estructurados especiales. El tráfico es menos predecible que el de búsqueda. https://developers.google.com/search/docs/appearance/google-discover
- **NewsArticle/Article**: no hay propiedades obligatorias; se recomienda `headline`, `image` (varias, en 16:9, 4:3 y 1:1), `datePublished` y `dateModified` con zona horaria, y `author` como `Person` u `Organization` con `url` a una página que identifique al autor (con `ProfilePage`). En `author.name` solo el nombre. https://developers.google.com/search/docs/appearance/structured-data/article
- **Sitemap de noticias**: solo notas de los últimos 2 días, hasta 1.000 por archivo, con `publication name`, `language`, `publication_date` y `title`. https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
- **Google News**: el Publisher Center sirve para configurar la presencia; las notas que cumplen las políticas pueden aparecer sin enviar nada. No leí la política de requisitos oficial, así que no afirmo más.

### Notas escritas con IA
- Google dice que la IA **no está prohibida**; lo que penaliza es generar muchas páginas sin valor para el usuario ("scaled content abuse"). Y recomienda **verificar manualmente** todo lo generado (incluidos títulos, descripciones y datos estructurados), y **explicar al lector cómo se creó** el contenido. https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- Los blogs de SEO dicen que hubo acciones manuales por abuso a escala en 2025 y un spam update en 2026 (fuentes de terceros y con fechas contradictorias): https://ppc.land/scaled-content-abuse/
- Lo que Radar ya hace bien: verificación contra fuentes, firma que dice quién la escribió, retiro de lo flojo. Para reforzar:
  1. Una página pública "Cómo trabajamos" (IA + verificación + correcciones) enlazada desde cada nota y desde Quiénes somos. Es lo que Google sugiere.
  2. Autor con página propia (`ProfilePage`) para "Radar Balcarce" y para Hernán Accomo donde firma, enlazado desde el marcado.
  3. Aportar algo que no esté en la fuente: contexto de Balcarce, "antes en Radar", datos propios. Las notas con 3+ medios resumidos y nada propio son las más expuestas.
  4. Mantener el `noindex` en lo repetitivo (clima diario, repasos, etc.), ya hecho.
  5. No inflar volumen: la regla de popularidad de Radar (sin cupos pero con mínimos) es coherente con esto.
  6. Imagen grande real en cada nota; evitar placas con mucho texto como imagen principal en Discover.

---

## 5. RSS propio y sindicación

(Sin fuentes leídas esta vez: es criterio general. Conviene verificar con un lector RSS.)
- Sirve, sobre todo, para: lectores RSS, agregadores locales, bots de Telegram/Zapier/IFTTT que el propio Radar puede usar para el canal, y como señal de frescura. Que otros medios lo tomen es raro en la práctica; un riesgo es que lo copien sin atribución.
- Buenas prácticas: un feed general (`/rss.xml`) y uno por sección; **solo resumen (titular, bajada y 1–2 frases) + imagen + enlace**; atribución obligatoria con enlace a la nota original; incluir `guid` estable (la dirección de la nota nunca cambia, lo cual ya cumple la regla de Radar); fechas con zona; categorías; sin notas en rojo, sin `noindex` (clima, repasos), sin lo retirado.
- Para publicar texto completo a terceros: ofrecerlo por convenio, no abierto, y con licencia clara (Creative Commons BY o similar) si se decide. Hoy no lo recomiendo: el valor está en traer visitas al sitio.
- Verificar en el repo si ya hay un feed: no lo revisé (la consigna era no tocarlo).

---

## 6. Página de «Publicidad» en el sitio

- De lo visto: El Diario de Tandil y La Nueva **no muestran en la portada cómo anunciar**. Medios más grandes publican un *media kit* (El Tribuno, https://app.eltribuno.com/mediakit/pdf/nuevasTarifas/tarifario_local_2024.pdf; El Economista, https://eleconomista.com.ar/media-kit) con formatos y precio en pesos sin IVA, cobro por CPM o por mes, y formatos estándar (300x250, 728x90, 970x90, 300x600). Los tarifarios de España y México que aparecieron dan la estructura, no los precios.
- **No encontré** media kits de diarios locales chicos argentinos con precios comparables.
- Qué conviene (criterio mío): una página `/publicidad` con
  1. Quiénes lo leen (números reales de Cloudflare: lectores por mes, páginas vistas, % de Argentina, seguidores y vistas en redes), con fecha del dato.
  2. Planes a la vista (los de $ 5.000 a $ 50.000 por mes), qué incluye cada uno (aviso rotativo en el sitio, mención en reel, nota rotulada "Contenido patrocinado", historia) y rotulado claro.
  3. Botón de WhatsApp con mensaje armado ("Hola, quiero anunciar en Radar") y un mail.
  4. Reglas: qué avisos no se aceptan, cómo se rotula, que la publicidad no influye en las notas.
  5. Ejemplo de aviso real o maqueta.
- Precios visibles o no: en medios chicos, mostrar el "desde" ayuda a que el comercio chico llegue sin vergüenza; las tarifas finas y descuentos, por WhatsApp. Es una recomendación, no un dato de mercado.

---

## 10 recomendaciones para las próximas dos semanas (impacto/esfuerzo)

1. **Mirar y arreglar Core Web Vitals reales** en Cloudflare Web Analytics y Search Console antes de sumar cualquier aviso. Es lo que más cuida SEO y AdSense. Esfuerzo bajo/medio.
2. **Publicar la página "Cómo trabajamos"** (IA, verificación, correcciones, fuentes) + páginas Quiénes somos, Contacto y Privacidad completas. Pedido por Google (transparencia) y condición de AdSense. Esfuerzo bajo.
3. **Datos estructurados completos** en cada nota: `NewsArticle` con `author` (con `url`), `image` en tres proporciones, `datePublished`/`dateModified` con zona; página de autor `ProfilePage`. Esfuerzo bajo.
4. **Imágenes de 1.200 px o más y `max-image-preview:large`** en todas las notas (apertura a Discover). Esfuerzo bajo.
5. **Sitemap de noticias** (últimos 2 días, hasta 1.000), distinto del de archivo; enviarlo en Search Console. Esfuerzo bajo/medio.
6. **Página `/publicidad`** con números reales, planes y WhatsApp. Es lo único que genera plata pronto. Esfuerzo bajo.
7. **Canal de WhatsApp y newsletter diaria** con un lugar patrocinado. Alto retorno de lectores que vuelven. Esfuerzo medio.
8. **Informe semanal de decisiones** (top notas, top y peores reels, horarios) con la API de Meta; chequear los nombres de métricas vigentes. Esfuerzo medio.
9. **"Datos útiles" y teléfonos de urgencia + encuesta semanal + botón "Mandanos información"** (aprovechar el panel de pistas). Esfuerzo bajo/medio.
10. **Preparar AdSense pero pedir el alta después**, cuando el sitio nuevo lleve un tiempo indexado y con Core Web Vitals verdes: reservar lugares de aviso con alto fijo, aviso de cookies simple, consultar al contador por el cobro. No contar con más de unos US$ 100–200 por mes al principio (estimación mía, sin dato público). Esfuerzo medio, impacto bajo/medio.

## Lo que no encontré (honestidad)
- RPM real de AdSense en noticias de Argentina; plazo oficial de revisión; política escrita de AdSense sobre IA.
- Norma específica argentina de banner de cookies (solo interpretaciones de terceros).
- Datos actuales de Olavarría, Azul, Necochea y Mar del Plata; casos locales concretos de Nieman Lab/Reuters Institute en texto completo.
- Precios de media kits de diarios locales argentinos chicos.
- Retención de reels por API.
