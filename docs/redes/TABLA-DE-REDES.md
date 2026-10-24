# Tabla de redes: qué hay, qué publicar en cada una y qué se puede automatizar

> **24/10/2026:** el cronograma maestro (qué sale hoy hora por hora, qué falta, el orden de alta de cada red, WhatsApp, herramientas gratis y publicar a mano) está en [`docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md`](../proyecto/REDES-CRONOGRAMA-MAESTRO.md). Esta tabla es el detalle de cada servicio.

*17/10/2026. Es una **investigación**, no código: no se creó ninguna cuenta, no se tocó ninguna clave, no se publicó nada y no se cambió ningún archivo del robot. Los datos de precios y límites se leyeron el 17/10/2026 en las páginas oficiales de cada servicio cuando se pudo; lo que sólo salió de blogs o de notas de prensa, o que no se pudo abrir (varias páginas de ayuda de TikTok, Meta y WhatsApp cargan con JavaScript y no se dejan leer), está marcado **SIN VERIFICAR**. Complementa y actualiza `AUTOMATIZAR-REDES-ALTERNATIVAS.md` (15/10) y `FORMATOS-POR-RED.md` (16/10); no los reemplaza: los detalles técnicos (medidas de video, topes de la API) siguen estando ahí.*

**Cómo leer los veredictos**

| Veredicto | Qué quiere decir |
|---|---|
| **AUTOMÁTICO YA** | El robot ya publica solo, con la PC apagada |
| **AUTOMÁTICO CON TRÁMITE** | El robot puede publicar solo, pero antes una persona tiene que crear la cuenta, el bot o la autorización (una sola vez) |
| **A MANO** | No hay vía automática segura o gratis: el sistema deja el texto y el video listos y una persona (o un agente con una persona al lado) los sube |
| **NO CONVIENE** | No suma para un medio de un pueblo de 45.000 habitantes, cuesta de más o arriesga la cuenta |

---

## 1. Resumen en 10 líneas

1. **Hoy sólo Facebook e Instagram salen solos** (53 y 7 seguidores el 15/10). Facebook trae tres de cada cuatro visitas al sitio: ahí está la audiencia hoy, y no hay que recortarla.
2. **Ya tenemos cuenta, sin publicar nada, en X, Threads y TikTok** (creadas el 15/10). **No tenemos** canal de YouTube, Telegram, Bluesky, canal de WhatsApp ni LinkedIn.
3. **Cuatro redes se automatizan gratis con su propia API**, sin pagar ningún servicio: Telegram, Bluesky, Threads y YouTube Shorts; X también, pero con un costo de unos US$ 2 por mes. Lo único que piden es que Hernán o Andrés creen la cuenta o la autorización una vez.
4. **TikTok y el canal de WhatsApp no tienen camino propio automático.** TikTok: sólo por un servicio de terceros (Buffer, a probar) o a mano; el canal de WhatsApp: a mano, siempre.
5. **Los servicios gratis que sirven de verdad son uno solo: Buffer Free** (3 canales, 10 posteos en cola por canal y API incluida, 3.000 pedidos cada 30 días). Alcanza en volumen para unas 6 piezas por día **si el robot las manda de a una, cerca de la hora de salida**. Si deja TikTok en el plan gratis es **SIN VERIFICAR** (se prueba en la prueba de 14 días).
6. **Metricool gratis NO alcanza**: la página oficial de hoy dice **20 posteos por mes** (no 50; la propia Metricool todavía muestra "50" en otra página, que quedó vieja) y sin API. **Later no tiene plan gratis** (sólo prueba de 14 días; el más barato, US$ 18,75 por mes con pago anual). **Publer gratis** programa a mano para 3 cuentas pero sin API.
7. **La programación nativa gratis** (TikTok Studio de escritorio, YouTube Studio, Meta Business Suite, Threads, LinkedIn) permite dejar piezas programadas de a varios días con la PC prendida: sirve para el "agente a mano" (sección 5).
8. **El "agente a mano" cuesta poco tiempo**: con el paquete diario armado por el sistema, unos **15 a 25 minutos por día** para TikTok, YouTube y el canal de WhatsApp (estimación nuestra, no medida).
9. **Lo que no conviene en ningún caso**: Pinterest, Reddit, Mastodon, Snapchat, Twitch/Kick, Google Business Profile (no corresponde a un medio sin local) y publicar solos en grupos de Facebook (Meta cerró esa API en abril de 2024).
10. **Costo total recomendado: entre US$ 0 y US$ 7 por mes** por encima de lo que ya se paga (X unos US$ 2 y Buffer Essentials US$ 5, ambos sólo si hacen falta; sin ellos, US$ 0).

---

## 2. Tabla maestra de redes

**Datos propios de partida** (`web/data/estadisticas.json`, 29/09 al 15/10, muestra chica de 646 visitas): Facebook 523 visitas, directo 179, Google 7. Seguidores: Facebook 53, Instagram 7. 66 % de las visitas son desde el celular.

**Piezas que el robot ya produce** (de `FORMATOS-POR-RED.md` § 2.1): hasta 5 notas por día con foto (Facebook y espejo en Instagram), 3 repasos con voz (10:00, 15:00, 21:00), clima (7:00 y 20:00), farmacia (19:00), "Un día como hoy" (9:00), feriado, agenda (jueves), teléfonos útiles (sábado), "Participá" (lunes a viernes 12:00). Todo video es vertical 1080 × 1920, 6 a 58 s.

### 2.1 Las que ya tenemos o ya funcionan

| Red | ¿La tenemos? | Qué publicar (de lo que ya existe) | Frecuencia | Qué rinde en Balcarce | API oficial y costo | Veredicto | Qué hace falta |
|---|---|---|---|---|---|---|---|
| **Facebook (página "Radar Balcarce")** | Sí. 53 seguidores | Notas con foto 4:5, reels de los repasos y piezas fijas, historias (clima, farmacia, repasos) | Hasta 5 notas + 3 a 4 reels + 3 a 6 historias por día | **Lo más importante hoy**: 74 % de las visitas | Sí (Graph API de Meta). Gratis. 30 reels por día por API | **AUTOMÁTICO YA** | Revisar si los enlaces de los posteos de los últimos días se ven tocables (Meta prueba un tope de 2 posteos con enlace por mes para páginas que no pagan; no se sabe si somos "publicador"; `FORMATOS-POR-RED.md` § 3.1) |
| **Instagram feed, reels e historias (`@radarbalcarce`)** | Sí. 7 seguidores | Espejo de la nota (foto 4:5), reels con voz, historias | Igual que Facebook | Bajo hoy; es donde el aspecto y el sonido pesan | Sí (Graph API). Gratis. 100 posteos por API por día | **AUTOMÁTICO YA** | Completar lo que falta en el perfil (categoría, enlace, botón de WhatsApp, historias destacadas: sección 6). El enlace de un pie no se toca: decir "link en la bio" |
| **Mensajes de Facebook e Instagram** | Sí (bandeja) | Contestar a mano, o respuestas armadas fuera de horario | A demanda | Sirve para recibir datos y fotos del barrio | Sí (Messenger e Instagram Messaging API): se contesta sólo dentro de las 24 h; hace falta revisión de la app (trámite SIN VERIFICAR) | **A MANO** hoy; **AUTOMÁTICO CON TRÁMITE** más adelante (etapa 3 de `docs/auditoria-2-0/06`) | Hoy: configurar saludo y mensaje de ausencia en la bandeja (sección 6) |
| **X (`@RadarBalcarce`)** | Sí, creada el 15/10; no publica | Textos cortos de nota (titular + frase, sin enlace) y los repasos en video | 3 a 4 por día | Bajo a medio (periodistas, entidades) | Sí, **pago por uso**: US$ 0,015 por posteo, US$ 0,20 si el texto lleva enlace (página oficial de X, 17/10). Unos US$ 1,80 por mes con 4 por día sin enlace | **AUTOMÁTICO CON TRÁMITE** (con costo) | Cargar tarjeta con tope de gasto; crear la app. Opcional |
| **Threads (`@radarbalcarce`)** | Sí, creada el 15/10; no publica | Nota en texto con tarjeta de enlace; los repasos en video (no las dos cosas en un posteo) | 3 a 6 por día (tope de la API: 250 por 24 h) | Medio: es la gente de Instagram | Sí (Threads API). Gratis. Hace falta un depósito público de videos (R2) y renovar el token cada 60 días | **AUTOMÁTICO CON TRÁMITE** | Invitación de "tester" y token; depósito de videos |
| **TikTok (`@radarbalcarce`)** | Sí, creada el 15/10; la bio y el logo no se veían (revisar) | Videos de los repasos y las piezas fijas que no caducan (efeméride, feriado, agenda, útiles, participá) | 2 por día | Alto en alcance, bajo en visitas; no se sabe cómo rinde en un pueblo | API propia: **no** viable (las reglas de TikTok dicen que no es para "una herramienta para subir contenido a las cuentas que uno maneja", y sin auditoría todo queda privado). Por un servicio aprobado (Buffer) o a mano | **A MANO** hoy (programado con TikTok Studio); probar **AUTOMÁTICO CON TRÁMITE** vía Buffer | Cuenta Business o Creator (para programar); revisar si la firma dentro del video molesta a TikTok (`FORMATOS-POR-RED.md` § 2.4) |

### 2.2 Las que no tenemos y conviene abrir

| Red | ¿La tenemos? | Qué publicar | Frecuencia | Qué rinde en Balcarce | API oficial y costo | Veredicto | Qué hace falta |
|---|---|---|---|---|---|---|---|
| **Telegram (canal)** | No (por confirmar) | Todo: notas con enlace y vista previa, repasos en video, farmacia, clima, agenda | Hasta 5 notas + 7 a 8 videos por día; silenciosos salvo 3 | Bajo en un pueblo; cuesta cero y sirve de buzón del WhatsApp a mano | Sí (Bot API). Gratis, sin revisión. Videos de hasta 50 MB (los nuestros pesan 1 o 2) | **AUTOMÁTICO CON TRÁMITE** | Crear el bot con @BotFather y el canal; pegar el token en GitHub Secrets |
| **Bluesky** | No (por confirmar) | Titular + enlace (300 caracteres, con tarjeta); repasos en video | 3 a 7 por día | Bajo (poca gente de Argentina); buena comunidad de periodistas | Sí (protocolo abierto). Gratis, sin revisión. Video hasta 3 min y 100 MB | **AUTOMÁTICO CON TRÁMITE** | Crear la cuenta, confirmar el correo, crear una contraseña de aplicación |
| **YouTube (Shorts y canal)** | **No tiene canal** | Los videos que no caducan: repaso de la noche, efeméride, feriado, agenda, teléfonos útiles | 2 por día (3 a 4 con agenda, útiles o feriado) | **El de más alcance a largo plazo**: un video sobre "Balcarce" se encuentra por Google durante meses. Los enlaces de la descripción de un Short no se tocan | Sí (YouTube Data API). Gratis, 100 subidas por día. **Duda abierta**: si lo que sube un proyecto sin verificar queda privado; la página oficial dice que no, varios blogs dicen que sí. Se resuelve con una prueba de 5 minutos con un video "no listado" | **AUTOMÁTICO CON TRÁMITE** | Canal, proyecto de Google Cloud, pantalla de consentimiento "En producción", autorizar una vez, prueba del "no listado → público" |
| **YouTube: podcast** | No | El repaso del día como audio con portada | 1 por día | Medio a largo plazo | YouTube Music/Podcasts leen un RSS; sin costo | **AUTOMÁTICO CON TRÁMITE**, más adelante (ver "Podcasts" abajo) | El feed `/podcast.xml` (hoy sin conectar; `docs/redes/AUDIO-EN-LA-PAGINA-Y-PODCAST-GENERAL.md`) |
| **WhatsApp: canal** | No (por confirmar; figura "a crear") | Farmacia de turno, el repaso de la mañana (o el mejor titular del día), agenda | 1 a 3 por día | **El más cercano a la gente de acá**; el número del medio ya es el contacto | **No existe API oficial** (Meta no la tiene; el registro de cambios oficial no nombra canales). Las vías de terceros (Whapi, WAHA) usan el número como WhatsApp Web: riesgo de perder el 2266 51-1612 | **A MANO** | Crear el canal (5 minutos, con el teléfono). 20 segundos por pieza |
| **WhatsApp: Business app (el número 2266 51-1612)** | Por confirmar si es la app común o la Business | Recibir fotos y datos ("Participá"); saludo, ausencia, respuestas rápidas | A demanda | Alto como buzón | La app es gratis. La **Business API** (para contestar con un programa) cobra por mensaje de marketing y es gratis para responder dentro de las 24 h; exige un número que no esté en el WhatsApp común | **A MANO** (app) / API: **AUTOMÁTICO CON TRÁMITE** sólo para contestar, etapa 3 | Pasar a WhatsApp Business app (sección 6) |
| **WhatsApp: comunidad y grupos propios** | No | Nada | — | Pide moderar todo el día | No hay API | **NO CONVIENE** por ahora | — |
| **Grupos de Facebook de Balcarce** | Por confirmar a cuáles se puede entrar | El mejor titular del día o la farmacia, sin enlaces a cada nota; sin Política ni Policiales | 1 por día, a mano | Puede traer visitas; depende de la regla de cada grupo | **No**: Meta quitó la API para publicar en grupos en abril de 2024 (fuentes de terceros; SIN VERIFICAR contra Meta) | **A MANO** | Pedir permiso a los administradores y respetar sus reglas; una persona publica. Nunca automatizar |

### 2.3 Buscadores, audio y mail

| Red | ¿La tenemos? | Qué publicar | Frecuencia | Qué rinde en Balcarce | API oficial y costo | Veredicto | Qué hace falta |
|---|---|---|---|---|---|---|---|
| **Google Noticias** | Se decide solo | El sitio mismo (notas, sitemap de noticias) | Cada nota | Alto si se cumplen las reglas | **No hay alta**: la ayuda oficial de Google dice "Google automatically considers all web content for inclusion in Google News, so you don't need to apply". Publisher Center ya no es para entrar, sirve para ingresos y Showcase | **AUTOMÁTICO YA** (depende del sitio) | Seguir con la página "quién escribe y cómo corregimos" y los datos estructurados (`docs/seo/AUDITORIA-SEO-LLM.md`) |
| **Google Discover** | Se decide solo | Notas con buena imagen (1200 px o más) y título claro | — | Puede ser fuerte, pero Google no lo promete ni se pide | No se pide | **AUTOMÁTICO YA** (nada para hacer) | Fotos grandes en las notas |
| **Google Business Profile** | No | — | — | — | Gratis, pero la política de Google excluye los negocios sólo online (la lista de no elegibles incluye "online-only businesses"); un medio sin atención en persona probablemente no califica | **NO CONVIENE** | — |
| **Apple News** | No | — | — | — | Por invitación o selección y sin confirmar que haya servicio en Argentina (no se pudo leer la lista oficial) | **NO CONVIENE** por ahora (SIN VERIFICAR) | — |
| **Podcasts: Spotify, Apple Podcasts, YouTube Music** | No | Un episodio diario con los tres repasos juntos (no tres de 55 s) | 1 por día | Medio, a largo plazo | Spotify for Creators es gratis y también se puede mandar un RSS externo (la ayuda de Spotify dice que hay que enviarlo a cada plataforma a mano: "we don't distribute automatically"). Apple Podcasts: RSS con portada cuadrada (3000 × 3000 recomendado en el plan; SIN VERIFICAR en la página de Apple) | **AUTOMÁTICO CON TRÁMITE**, etapa tardía | Conectar `/podcast.xml`, portada, envío a cada plataforma una vez |
| **Newsletter por mail** | No | "Balcarce a las 7": 5 notas, farmacia, clima | 1 por día | Medio; es audiencia propia, sin algoritmo | Brevo: plan gratis de 300 mails por día (la página de precios no mostró el detalle hoy; la cifra sale de las páginas de Brevo, SIN VERIFICAR en la tabla). MailerLite gratis hoy: **250 suscriptores y 2.500 mails por mes** (página oficial, 17/10): sirve para 10 envíos por mes con 250 personas, no para uno diario. Buttondown: gratis los primeros 100 suscriptores; el resto cuesta | **AUTOMÁTICO CON TRÁMITE** | Elegir servicio (Brevo si es diario), formulario de alta con confirmación y baja, dominio de envío en Cloudflare |
| **Mail de la redacción** | Sí (`contacto@`, `redaccion@`, `publicidad@radarbalcarce.com`, reenvían a Gmail) | Recibir datos, gacetillas y avisos | A demanda | Alto como fuente | Cloudflare Email Routing, gratis | **AUTOMÁTICO YA** | — |

### 2.4 Redes que no conviene abrir

| Red | Por qué no | Veredicto |
|---|---|---|
| **LinkedIn (página)** | Público profesional; la API pide un producto restringido con revisión; la programación nativa gratis existe pero no hay a quién llegar en el pueblo | **NO CONVIENE** por ahora |
| **Pinterest** | No es una red de noticias locales; sin "acceso Standard" los pines se ven sólo desde la propia cuenta | **NO CONVIENE** |
| **Mastodon** | Poca gente de Argentina, sin audiencia local | **NO CONVIENE** |
| **Reddit** | La API gratuita (unas 100 consultas por minuto) no permite uso comercial; el acceso comercial pide aprobación y un gasto mínimo que no se publica (fuentes de terceros, SIN VERIFICAR); no encontré evidencia de una comunidad de Balcarce | **NO CONVIENE** |
| **Snapchat** | Público joven, sin publicación automática accesible | **NO CONVIENE** |
| **Twitch / Kick** | Es transmisión en vivo; el robot no hace en vivo (regla del criterio) | **NO CONVIENE** |
| **Apps de mensajería local** | No encontré ninguna en Balcarce | **Por confirmar**: si Hernán y Andrés conocen alguna (grupo de vecinos, app del municipio), se evalúa aparte |

---

## 3. Los servicios para automatizar, comparados

**Cómo leer**: "plan gratis" es lo que figura en la página oficial el 17/10/2026. Todos corren en sus servidores: no hace falta la PC. "API" = que nuestro robot (GitHub Actions) pueda mandarle el contenido. Nuestro robot ya hace de "pegamento" gratis (GitHub Actions): Make, Zapier, n8n e IFTTT **no suman** salvo para unir un servicio sin API.

| Servicio | Plan gratis HOY | Precio de pago (inicio) | Redes que importan | API o integración para el robot | Veredicto para nosotros |
|---|---|---|---|---|---|
| **Buffer** (`buffer.com/pricing`) | **Sí: 3 canales, 10 posteos en cola por canal, 100 ideas, 1 usuario, API incluida** (1 clave, 3.000 pedidos cada 30 días) | Essentials US$ 5 por canal por mes (US$ 60 al año); Team US$ 10 por canal | Instagram, Facebook, TikTok, YouTube (Shorts), Threads, X, Bluesky, LinkedIn, Pinterest, Mastodon, Google Business, Substack. **No Telegram, no WhatsApp** | **Sí, en todos los planes** (GraphQL, clave personal). El video hay que alojarlo en un enlace público y debe seguir disponible hasta que se publique. Su hoja de ruta (24/02/2026) todavía listaba "TikTok por API" como "Exploring": **SIN VERIFICAR** si el API publica a TikTok | **El único gratis que sirve.** Usarlo para TikTok (probar), y como respaldo de YouTube/Threads |
| **Metricool** (`metricool.com/pricing`) | **Sí: 1 marca, 20 posteos por mes**, 1 cuenta por red (sin LinkedIn ni X), 30 días de analítica | Starter desde €16 (anual) o US$ 20; Advanced desde €43 (US$ 53) | Facebook, Instagram, Threads, Bluesky, Pinterest, TikTok, YouTube, Twitch, Google Business | API (y Zapier/Make) **sólo en Advanced** | **No alcanza** (20 por mes ≈ menos de 1 por día). Sirve para mirar números, no para publicar |
| **Later** (`later.com/pricing`) | **No hay plan gratis**: sólo prueba de 14 días (blogs dicen que existió uno chiquito; SIN VERIFICAR) | Starter US$ 18,75 por mes (anual): 1 conjunto de 8 perfiles, 30 posteos por perfil por mes | Instagram, Facebook, Threads, Pinterest, TikTok, LinkedIn, YouTube, Snapchat (no X ni Bluesky) | La página no menciona API ni Zapier | **Descartado** |
| **Publer** (ayuda oficial) | Sí: 3 cuentas (sin X), 10 posteos en cola por cuenta, 25 borradores, historial de 24 h; **sin API** | Professional desde US$ 5; Business desde US$ 10 (cada cuenta o miembro extra suma US$ 4 a 7; los blogs traen otros precios: mirar el sitio) | TikTok, YouTube, Threads, Bluesky, Telegram, Pinterest, Mastodon y más (SIN VERIFICAR la lista completa) | **API sólo en Business** (sube el archivo directo); además tiene "universal posting" por notificación | Plan gratis útil para **programar a mano** TikTok/YouTube con un agente; para API, Business US$ 10 |
| **Postiz** (`postiz.com/pricing`) | No hay gratis en la nube (prueba de 7 días). **Autoalojado: gratis**, pero pide un servidor prendido siempre | Nube Standard US$ 29 por mes (US$ 23 anual): 5 canales, posteos ilimitados, API incluida | 30 y pico redes, incluidas TikTok, YouTube, Threads, Bluesky, Telegram | Sí, API pública y MCP en todos los planes | Caro frente a Buffer/Publer; autoalojar rompe la regla "andar sin servidores propios". **Descartado** |
| **Mixpost** (`mixpost.app/pricing`) | **Lite gratis y de código abierto** (Facebook Pages, X, Mastodon; sin Instagram ni TikTok) | Pro US$ 299 pago único (1 dominio) | Pro: Facebook, Instagram, X, LinkedIn, YouTube, TikTok, Pinterest, Threads, Bluesky, Mastodon | API en Pro | Hay que alojarlo (PHP, MySQL, Redis). **Descartado** |
| **Typefully** | La página oficial no se pudo leer. Blogs: tiene gratis limitado | Entre US$ 12,50 y 29 según la fuente (SIN VERIFICAR) | X, LinkedIn y, según algunos, Threads y Bluesky | SIN VERIFICAR | **Descartado** (pensado para escribir hilos a mano) |
| **Fedica** | La página oficial no se pudo abrir (error 404) | SIN VERIFICAR | X, Threads, Bluesky, Instagram | SIN VERIFICAR | **Descartado** |
| **SocialBee** (`socialbee.com/pricing`) | No: sólo 14 días de prueba | Bootstrap US$ 29 (US$ 24 anual): 5 perfiles | Facebook, Instagram, Threads, LinkedIn, X, Pinterest, TikTok, YouTube, Google Business, Bluesky. **Telegram: no** | La página no habla de API; usa Zapier, Pabbly y Make | **Descartado** |
| **Repurpose.io** (`repurpose.io/pricing`) | **10 videos gratis, sin tarjeta**, y 14 días de prueba | Starter US$ 35 por mes (US$ 349 al año): 3 cuentas por red | Copia videos de Facebook/Instagram a TikTok y YouTube (la página nombra Instagram, TikTok y YouTube) | No es API: se configura por la web | Podría copiar nuestros reels sin tocar código, pero cuesta más que Buffer. **Plan C** |
| **Blotato** (`blotato.com/pricing`) | No: prueba de 7 días (sin API) | Starter US$ 29: 20 cuentas | 9 redes (TikTok, YouTube, Instagram, Facebook, X, Threads, Bluesky, LinkedIn, Pinterest) | Sí desde Starter. Dice que su app de TikTok pasó la auditoría | Caro para lo que se necesita |
| **Ayrshare** (`ayrshare.com/pricing`) | No (prueba de 28 días sólo en el plan Launch) | Premium US$ 149 por mes | 13 a 14 redes | Sí, es lo más "para programadores" | **Descartado** por precio |
| **Hootsuite** (`hootsuite.com/plans`) | No (14 días de prueba) | Standard US$ 99 por usuario por mes | Varias | Sin confirmar | **Descartado** por precio |
| **Make** (`make.com`) | Sí: **1.000 créditos por mes** (ayuda oficial) | Sin confirmar en la página | Telegram, YouTube, Bluesky con módulo propio; TikTok sin módulo de publicación | Es pegamento, no una red | No suma: el robot ya es el pegamento |
| **Zapier** (`zapier.com/pricing`) | Sí: **100 tareas por mes**, sólo Zaps de 2 pasos | Professional US$ 19,99 por mes (anual): 750 tareas | Muchas | Es pegamento | No suma |
| **n8n** | Autoalojado gratis (licencia "de uso sostenible"; pide un servidor). Nube de pago: entre €20 y 24 por mes según la fuente (blogs, SIN VERIFICAR) | — | Telegram, YouTube, Bluesky con módulo; Threads por HTTP | Es pegamento | No suma |
| **IFTTT** (`ifttt.com/plans`) | Sí: **2 applets**; sin webhooks | Pro US$ 2,99 por mes (US$ 35,88 anual), con webhooks | Limitado | Webhook sólo en Pro | No suma |
| **Meta Business Suite** (programador de Meta) | **Gratis**, para Facebook e Instagram | — | Facebook e Instagram | Es lo mismo que la API de Meta que ya usamos | Sólo sirve a mano: **hasta 75 días** de anticipación (nota de Social Media Examiner; la ayuda oficial de Meta no se pudo abrir; SIN VERIFICAR) |
| **Programación nativa** de TikTok Studio, YouTube Studio, LinkedIn y Threads | Gratis | — | Cada una de su red | **No tienen API**: sólo a mano o con un agente en el navegador | Ver sección 5 |

### 3.1 ¿Alcanza el plan gratis para unas 6 piezas por día?

Cuentas con 6 piezas por día = 180 al mes por red.

| Plan gratis | Límite que manda | Cuántas piezas entran | ¿Alcanza para 6 por día? | Para qué sirve en el plan |
|---|---|---|---|---|
| **Buffer Free** | 3 canales; 10 en cola por canal (se libera al publicarse); 3.000 pedidos cada 30 días | Con 3 canales y 6 por día cada uno, son 540 posteos por mes: caben si cada posteo gasta 5 pedidos o menos (hay que medirlo; un posteo suele gastar 1 a 3, SIN VERIFICAR) | **Sí, si el robot las manda cerca de la hora** (no hacer cola de 10 días) | TikTok (a probar) + respaldo de YouTube o Threads |
| **Metricool Free** | 20 posteos por mes, total | 20 piezas por mes en una sola red = 1 pieza cada 1,5 días | **No** (cubre 3 días de 30) | Nada; sólo estadísticas |
| **Later** | No hay gratis | — | No | Nada |
| **Publer Free** | 10 en cola por cuenta, sin API | 10 programadas a la vez por red, cargadas a mano | Sí, **si alguien las carga a mano todos los días** | Opción para el agente a mano si no se quiere usar TikTok Studio |
| **APIs propias** (Telegram, Bluesky, Threads, YouTube) | Topes altos: 250 por día en Threads; 100 subidas por día en YouTube | Sin problema | **Sí, gratis** | Lo que conviene hacer primero |

Dos aclaraciones sobre lo que figuraba en el pedido: (a) **Metricool gratis: 20, no 50** por mes (su página de precios, hoy; la comparación "Metricool vs Buffer" del mismo sitio todavía dice 50); (b) **Later gratis: no existe como plan publicado**. Buffer coincide con lo informado: 3 canales y 10 en cola por canal, **más** API gratis.

---

## 4. Plan recomendado por etapas (de lo más fácil a lo más difícil)

Principio: **primero lo gratis, sin revisión y sin riesgo de cuenta.** Lo que cada etapa construye el robot (Claude) con su prueba; las cuentas y las claves las crean y las pegan Hernán y Andrés. Ninguna etapa recorta lo que ya sale en Facebook e Instagram.

| Etapa | Qué | Quién | Cuánto lleva | Costo |
|---|---|---|---|---|
| **0 · esta semana, lo que no depende de nadie más** | Terminar los perfiles que ya existen (Instagram: categoría, enlace, botón de WhatsApp, destacadas; TikTok: bio y logo; WhatsApp Business: saludo, ausencia, respuestas) con los textos de la sección 6. Comprobar que los nombres estén libres. Mirar si los enlaces de Facebook se ven tocables | Hernán y Andrés (con la lista de la sección 6) | 1 a 2 horas en total | 0 |
| **1 · semana 1** | Crear el canal de **Telegram** (@BotFather), la cuenta de **Bluesky** y el **canal de YouTube** con `radarbalcarce@gmail.com`. Después, Claude arma Telegram y Bluesky (apagados y simulando una semana, después "Sí") | Hernán y Andrés crean cuentas; Claude programa | 1 hora + 1,5 días de Claude | 0 |
| **2 · semana 1 a 2** | **El agente a mano**: TikTok, YouTube y el canal de WhatsApp con el paquete diario (sección 5). Aprender cuánto lleva y qué rinde | Un agente con Claude en el Chrome de la PC o una persona; el sistema deja el paquete | 15 a 25 min por día (estimación) | 0 |
| **3 · semana 2 a 3** | **YouTube por API** si la prueba de "no listado" sale bien; si no, Buffer o Publer. **Threads** (con depósito de videos y token que se renueva solo) | Claude + Hernán (autoriza una vez) | 1 día + 3 días | 0 |
| **4 · semana 3 a 4** | **TikTok por Buffer** en la prueba de 14 días: ver si Buffer deja TikTok en el plan gratis y si su API publica video a TikTok. Si sí, pasa a automático; si no, queda a mano | Hernán o Andrés abren la cuenta de Buffer con el mail del medio (el robot no crea cuentas) y pegan la clave en GitHub Secrets | 1 día | 0 a US$ 5 |
| **5 · mes 2** | **Newsletter** "Balcarce a las 7" (Brevo, 300 por día gratis) y **podcast** (feed + Spotify, Apple, YouTube Music). **X** si les parece, con tope de gasto. **Mensajes** (Messenger e Instagram) con la Ventanilla | Claude + trámites de Hernán y Andrés | Varios días | 0 a US$ 2 |
| **6 · mes 2 a 3** | Medir (alcance, seguidores, visitas con UTM) y decidir qué red se queda y cuál se apaga | Todos | — | — |

**No se hace en ninguna etapa**: publicar solos en grupos de Facebook o canales de WhatsApp, mandar campañas por WhatsApp, y manejar TikTok, X o WhatsApp con un navegador sin una persona al lado (ver el aviso de la sección 5).

---

## 5. El "agente a mano": cómo se publica lo que no se puede automatizar

**Para qué sirve**: TikTok (hasta que Buffer lo resuelva o si no lo resuelve), YouTube (hasta que se pruebe la API), el canal de WhatsApp y los grupos de Facebook. El sistema deja **todo armado**; quien publica sólo sube, pega y programa.

### 5.1 Qué dejaría listo el sistema: el paquete diario

Hoy los mp4 de cada pieza quedan 3 días como archivo adjunto de GitHub ("Guardar las piezas para revisarlas" en `redes.yml`), solo para quien entra a GitHub. Lo que habría que **construir** (propuesta, no existe todavía; unos 1 a 2 días de Claude):

1. **Una carpeta por día** `paquete/AAAA-MM-DD/` con: los videos (`0900-efemeride.mp4`, `2100-repaso-noche.mp4`…), las placas en PNG, un `.txt` por red con el texto ya escrito en el tono de `CRITERIO-REDES.md` (TikTok, YouTube título y descripción, WhatsApp canal, grupos de Facebook), y un `LEEME.md` con el checklist de la hora y el enlace de cada pieza.
2. **Dónde queda para bajarlo**: lo más simple es un archivo `.zip` en el depósito **R2** (que ya se usa para el archivo de notas) con un enlace con vencimiento, y **el enlace va en el mail de las 21:15** (informe diario). Otra opción, más barata de armar: el mismo `.zip` como adjunto de GitHub, 7 días, bajándolo desde el panel del celular.
3. **Qué piezas no se pueden dejar para "mañana"**: los repasos, el clima y la farmacia se arman a su hora con las noticias del momento; no existen la noche anterior. Lo que sí está de antemano: "Un día como hoy", el feriado, la agenda, los teléfonos útiles y "Participá" (piezas fijas que salen siempre iguales o de contenido ya conocido; confirmar cuáles se arman con anticipación). Por eso hay **dos pasadas por día**: a la mañana (lo del día) y a la noche (repaso de las 21:00 y, si el sistema ya lo dejó, lo de mañana).

### 5.2 La programación nativa de cada red (gratis, con la PC prendida)

Lo que se pudo confirmar y lo que no. **Las páginas oficiales de ayuda de TikTok, Meta y WhatsApp cargan con JavaScript y no se pudieron leer**: los datos de TikTok, Meta Business Suite y Threads salen de guías de terceros (algunas de la competencia, como Buffer) y están marcados.

| Red y herramienta | Con cuánta anticipación | Requisitos | Qué acepta | Notas |
|---|---|---|---|---|
| **TikTok Studio** (tiktok.com/tiktokstudio, escritorio) | **10 días** según la mayoría de las guías; **30 días** según la guía de Buffer (SIN VERIFICAR en la página oficial: se prueba en la cuenta) | Cuenta **Creator o Business**; con cuenta personal no deja | Videos. Fotos y carruseles: las guías no lo aclaran (SIN VERIFICAR) | Una vez programado no se puede editar: hay que borrar y volver a subir. Existe también la app TikTok Studio de celular (según Buffer; otras fuentes dicen que sólo escritorio) |
| **YouTube Studio** | Fecha y hora libres. Se sube como **privado** y pasa a público a la hora elegida | Canal | Videos y Shorts | Elegir bien la zona horaria. Ayuda oficial: *Schedule video publish time* (support.google.com/youtube/answer/1270709) |
| **Meta Business Suite** (Facebook e Instagram) | **Hasta 75 días** (Social Media Examiner; ayuda de Meta no legible, SIN VERIFICAR) | Página y cuenta profesional vinculadas | Posteos y reels; las historias, desde la app para celular (SIN VERIFICAR) | No hace falta: el robot ya publica solo en estas dos |
| **Threads** (app y web) | **Hasta 75 días** (guías de terceros, SIN VERIFICAR) | Cuenta | Posteos sueltos; no respuestas ni hilos | No hace falta si va por API |
| **LinkedIn** (página, escritorio) | De 10 minutos a 3 meses | Página de empresa | Texto, imagen, video; no encuestas ni varias fotos (Social Media Today, 21/03/2023 y guías 2026) | No la abriríamos |

### 5.3 El paso a paso diario (con el paquete listo)

**Pasada de la mañana (hacia las 8:30, para TikTok, YouTube y WhatsApp):**

1. Bajar el `.zip` del día (enlace del mail de las 21:15 de ayer o del panel).
2. **TikTok Studio**: subir `0900-efemeride.mp4` (y lo que corresponda), pegar el texto del `.txt`, marcar "contenido generado con IA", programar la hora.
3. **YouTube Studio**: subir el mismo video como Short, título (menos de 100 caracteres), descripción del `.txt`, elegir "programar".
4. **Canal de WhatsApp** (desde el celular): publicar el texto de la farmacia o el titular del día. **Esto no se programa**: es en el momento.
5. Si corresponde, pegar el texto del día en los **grupos de Facebook** permitidos, a mano.

**Pasada de la noche (hacia las 21:30):** subir el repaso de las 21:00 a YouTube y TikTok; si el sistema ya dejó las piezas de mañana, programarlas. Marcar en el `LEEME.md` lo que quedó hecho.

**Cuánto lleva (estimación nuestra, SIN MEDIR; hay que cronometrar la primera semana):**

| Tarea | Por pieza | Piezas por día | Por día |
|---|---|---|---|
| TikTok (subir + texto + programar) | 2 a 3 min | 2 | 5 a 6 min |
| YouTube (subir + texto + programar) | 2 a 3 min | 2 | 5 a 6 min |
| Canal de WhatsApp (desde el celular) | 0,5 a 1 min | 1 a 3 | 1 a 3 min |
| Grupos de Facebook | 1 min por grupo | 1 a 3 | 1 a 3 min |
| Bajar el paquete y revisar | — | — | 3 min |
| **Total** | | | **15 a 25 min** (una persona con checklist lleva lo mismo; un agente agrega el tiempo de equivocarse de botón) |

### 5.4 Quién lo hace y con qué cuidado

- **Opción A, una persona con el checklist** (la más segura): 15 a 25 minutos por día desde la PC y el celular. Puede ser Hernán, Andrés o alguien de confianza.
- **Opción B, Claude en el Chrome de la PC con una persona sentada**: el agente completa los campos y la persona toca "Programar" o "Publicar". Es "a mano con ayuda", no automatización.
- **Opción C, Claude solo con la PC prendida y sin nadie**: se puede, pero **no se recomienda para TikTok ni para WhatsApp**. Los términos de TikTok prohíben "scripts automatizados" que interactúen con el servicio, y los de WhatsApp el acceso automatizado (leídos el 15/10/2026; `AUTOMATIZAR-REDES-ALTERNATIVAS.md` § 5): el riesgo es perder la cuenta o el número. Además la PC tiene que estar prendida, sin suspenderse y con la sesión abierta; si no está, la pieza no sale y nadie se entera. Para YouTube, el navegador no hace falta: hay API.
- **Si no hay nadie para hacerlo un día**: no pasa nada grave. El sistema sigue publicando en Facebook, Instagram, Telegram y Bluesky; las piezas de TikTok, YouTube y WhatsApp de ese día quedan en el paquete y se saltean (no son noticias que caduquen, salvo el repaso).

---

## 6. Los perfiles, listos para pegar

### 6.1 Lo ya decidido (se respeta tal cual)

- **El texto único** (decisión de Andrés, 15/10; `PERFILES.md` y `docs/DECISIONES.md`): *"Todo lo que pasa en Balcarce y la región, en un solo lugar. radarbalcarce.com"*. **77 caracteres** contados hoy (el documento decía 78). Sin "agenda", sin "noticias de acá", sin "fuente a la vista". Sin emojis ni promesas. Sin nombrar farmacias (decisión del 26/09).
- **El sitio es el único enlace**: `radarbalcarce.com` (nunca `.com.ar`). Nada de enlaces a notas sueltas en perfiles.
- **Nombre y usuario**: `Radar Balcarce` y `@radarbalcarce`. En Instagram y TikTok y Threads el nombre que se ve es `Radar Balcarce · Noticias`.
- **El logo es el mismo en todas**: `reels/salida/avatar.png` (1080 × 1080, azul petróleo `#1D4F63`, "RADAR" en crema, "BALCARCE" y los anillos en el rojo de la marca `#C7381C`, punto ámbar `#E8A33C`). Se muestra redondo: no poner nada en las esquinas.
- **Colores y letras** (`MEDIA-KIT.md`): tinta `#14161A`, crema `#F4F1EA`, papel `#FAF8F3`; **Source Serif 4** para títulos e **Inter** para texto (archivos en `reels/marca/fuentes/`).
- **WhatsApp del medio**: 2266 51-1612. Mails: `contacto@` (lectores y comercios), `redaccion@` (datos, fotos y notas), `publicidad@radarbalcarce.com`; reenvían a `radarbalcarce@gmail.com`.
- **La línea de transparencia** ya usada en Facebook: *"Escrito con IA y verificado contra las fuentes; lo sensible lo revisa una persona."* (82 caracteres; entra donde hay lugar, nunca en las bios de menos de 150).

### 6.2 Los textos largos (los usan varias redes)

**Texto mediano, hasta 255 caracteres** (Telegram, canal de WhatsApp, Bluesky): 199 caracteres.

```
Todo lo que pasa en Balcarce y la región, en un solo lugar. Noticias, clima y datos del día a día. Escrito con IA y verificado contra las fuentes; lo sensible lo revisa una persona. radarbalcarce.com
```

**Texto largo** (YouTube, LinkedIn, Facebook): es el de Facebook ya aprobado en `PERFILES.md`:

```
Radar Balcarce reúne en un solo lugar todo lo que pasa en Balcarce y la región:
noticias, clima y los datos del día a día. Cada nota dice quién la
escribió y de dónde sale la información.

Las notas se escriben con inteligencia artificial y se verifican contra las
fuentes; lo sensible lo revisa una persona antes de salir. Si ves un error,
escribinos y lo corregimos.

¿Viste algo que tendría que ser noticia? Mandanos la foto o el dato por
WhatsApp al 2266 51-1612.

Todas las notas y el clima, en radarbalcarce.com
```

**Hashtags base** (propuesta; el robot usa hasta 3 por posteo, `#Balcarce` primero si la nota es de acá, y Instagram anunció un tope de 5): `#Balcarce`, `#RadarBalcarce`, `#UnDíaComoHoy` (sólo la efeméride). Para un perfil no se necesitan hashtags en la bio.

### 6.3 Red por red

Leyenda de límites: los de **texto** se cuentan en caracteres; los de **imagen**, en píxeles. Todo lo que dice SIN VERIFICAR no pudo leerse en una página oficial hoy o necesita entrar a la cuenta para ver el campo. **Antes de crear cualquier cuenta: buscar que el nombre y el usuario estén libres.**

#### Facebook (página "Radar Balcarce"): ya existe

| Campo | Qué poner |
|---|---|
| Nombre / usuario | `Radar Balcarce` / `radarbalcarce` (el más parecido que Facebook permita) |
| Categoría | La más cercana a "Sitio web de noticias y medios de comunicación" |
| Presentación | La bio única (límite de la información breve: 101) y, debajo, el texto largo de arriba |
| Contacto | Sitio `https://radarbalcarce.com`; ubicación "Balcarce, Buenos Aires"; mail `contacto@radarbalcarce.com` |
| Horario | Sin local de atención: no cargar horario de atención de local (si Facebook lo pide, "siempre abierto") |
| Botón de acción | "Enviar mensaje de WhatsApp" al 2266 51-1612 (o "Más información" hacia el sitio) |
| Imágenes | Perfil: `avatar.png` 1080 × 1080 (se ve a unos 176 px en la compu y 196 px en el celular; fuente de una guía de 2026, SIN VERIFICAR). Portada: `reels/salida/portada-facebook.png` 1640 × 924 (se ve a 820 × 312 en la compu y 640 × 360 en el celular; `FORMATOS.md`) |
| Mensajes | Saludo y ausencia, abajo (6.4) |
| Estado | Hecho 15/10. Falta el botón y mirar el cuidado de los enlaces |

#### Instagram (`@radarbalcarce`): ya existe

| Campo | Qué poner |
|---|---|
| Nombre / usuario | `Radar Balcarce · Noticias` / `@radarbalcarce` (no se toca) |
| Bio (150) | La bio única (77) |
| Categoría | "Sitio web de noticias y medios de comunicación" (hoy figura "Blog personal") |
| Contacto | Enlace `https://radarbalcarce.com` (sólo desde el celular); mail `contacto@radarbalcarce.com`; botón de contacto WhatsApp 2266 51-1612 |
| Imagen | Perfil: `avatar.png`, se muestra redondo. No tiene portada |
| Destacadas (nombre de hasta 15 letras) | **Farmacia** · **Teléfonos** · **Agenda** · **Clima** · **Participá**. Portada de cada una: círculo con un ícono simple, sin texto, 1080 × 1920 con el ícono en el centro (tamaño SIN VERIFICAR en Meta) |
| Respuestas | Respuestas guardadas: usar las de 6.4 (la función existe en cuentas profesionales; SIN VERIFICAR el nombre exacto del menú) |
| Estado | Hecho el 15/10: bio y nombre. Falta (según `PERFILES.md`): categoría, enlace, botón, destacadas |

#### Threads (`@radarbalcarce`): ya existe

| Campo | Qué poner |
|---|---|
| Nombre / usuario | `Radar Balcarce · Noticias` (viene de Instagram; Threads limita el nombre a 30 y la bio a 150, guía de 2026, SIN VERIFICAR) / `@radarbalcarce` |
| Bio | La bio única |
| Enlace | `https://radarbalcarce.com` |
| Imagen | La de Instagram (320 × 320 recomendada; se recorta redonda) |
| Estado | Hecho 15/10 |

#### X (`@RadarBalcarce`): ya existe

| Campo | Qué poner |
|---|---|
| Nombre / usuario | `Radar Balcarce` (hasta 50) / `@RadarBalcarce` (hasta 15; son 13) |
| Bio (160) | La bio única; sitio en el campo "sitio web": `radarbalcarce.com` |
| Ubicación (30) | Balcarce, Buenos Aires |
| Imágenes | Perfil: `avatar.png` (400 × 400 recomendada, redonda). Cabecera: 1500 × 500 (3:1) **a diseñar** con el mismo azul petróleo; límites de imagen SIN VERIFICAR en página oficial |
| Cuenta automatizada | Cuando el robot publique, marcarla como "automatizada" en la configuración de X (SIN VERIFICAR el texto actual) |
| Estado | Hecho 15/10 (texto y logo). Falta la cabecera |

#### TikTok (`@radarbalcarce`): ya existe

| Campo | Qué poner |
|---|---|
| Nombre / usuario | `Radar Balcarce · Noticias` (hasta 30) / `@radarbalcarce` (hasta 24; letras, números, guion bajo y punto) |
| Bio | La bio única entra (el límite es 80: son 77). Una guía dice que TikTok lo subió a 160, pero conviene quedarse en 80 |
| Enlace | Campo "Sitio web" `radarbalcarce.com` (los enlaces dentro del texto no se tocan; el campo puede pedir cuenta Business) |
| Tipo de cuenta | **Business o Creator** (para poder programar desde TikTok Studio) |
| Imagen | `avatar.png` (mínimo 200 × 200, SIN VERIFICAR). Sin portada |
| Estado | Se cargó el 15/10 pero TikTok no mostraba bio ni logo: **revisar** entrando a la cuenta |

#### YouTube: no tiene canal (crear con `radarbalcarce@gmail.com`)

| Campo | Qué poner |
|---|---|
| Nombre / identificador | `Radar Balcarce` / `@radarbalcarce` (se puede cambiar 2 veces cada 14 días) |
| Descripción (1.000) | La bio única como primera línea y, debajo, el texto largo de arriba (≈ 560 caracteres). Entra |
| Enlaces (hasta 14; el primero se ve cerca de "Suscribirse") | `radarbalcarce.com` |
| Contacto | Mail `contacto@radarbalcarce.com` en "Información de contacto" |
| País | Argentina |
| Imágenes | Perfil: `avatar.png` (800 × 800 recomendada; la página oficial no da el tamaño, SIN VERIFICAR). Banner: **2560 × 1440** (mínimo 2048 × 1152; parte segura 1235 × 338 al mínimo, 1546 × 423 al máximo; hasta 6 MB; guías de terceros, SIN VERIFICAR) **a diseñar** |
| Categoría | "Noticias y política" (la lista de YouTube; SIN VERIFICAR el nombre exacto) |
| Después | Activar "No es contenido para niños" y marcar los videos con voz sintética (`containsSyntheticMedia`) cuando lo haga el robot |

#### Telegram (canal): no existe

| Campo | Qué poner |
|---|---|
| Nombre (hasta 128) | `Radar Balcarce` |
| Usuario del canal (5 a 32) | `@radarbalcarce` → `t.me/radarbalcarce` (si está ocupado: `@radar_balcarce`) |
| Descripción (255) | El texto mediano de 6.2 (199 caracteres) |
| Imagen | `avatar.png` (cuadrada, se recorta redonda; el tamaño mínimo no se encontró, SIN VERIFICAR) |
| Bot | Crearlo con @BotFather (por ejemplo `@radarbalcarce_bot`) y agregarlo al canal como administrador con permiso de publicar |
| Historias | No hay para canales por bot (sólo con cuenta Premium y "boosts"): no se usa |

#### Bluesky: no existe

| Campo | Qué poner |
|---|---|
| Nombre (64) | `Radar Balcarce` |
| Usuario | `@radarbalcarce.bsky.social`; después, si quieren sello propio, `@radarbalcarce.com` (se verifica agregando un registro en Cloudflare, lo hace Claude) |
| Bio (256) | El texto mediano de 6.2 (199 caracteres) |
| Imágenes | Perfil: `avatar.png` (400 × 400 recomendada). Banner 1500 × 500 (3:1), hasta 1 MB, **a diseñar**. Son recomendaciones de la comunidad, no medidas oficiales |
| Contraseña | Crear una "contraseña de aplicación" (no la de la cuenta) para el robot |

#### WhatsApp Business app (el número 2266 51-1612): por confirmar

Hoy no está escrito si el número usa la app común o la Business. Pasar a la Business **no cambia el número** (SIN VERIFICAR el procedimiento para conservar los chats). Si en el futuro se usa la API para contestar con un programa, ese número tiene que salir del WhatsApp común: decidirlo aparte (`docs/auditoria-2-0/06`, pregunta 4).

| Campo | Qué poner |
|---|---|
| Nombre del negocio | `Radar Balcarce` |
| Categoría | La de "Noticias y medios" o "Medios de comunicación" (el nombre exacto, SIN VERIFICAR) |
| Descripción | `Medio digital de Balcarce. Noticias, clima y datos del día a día. Mandanos tu foto o tu dato por acá. radarbalcarce.com` (119 caracteres; el límite de la app no se pudo leer en una página oficial, SIN VERIFICAR) |
| Dirección | No cargar una dirección de local: el medio no atiende en persona. Poner sólo "Balcarce, Buenos Aires" si el campo lo permite |
| Sitio web / mail | `https://radarbalcarce.com` / `contacto@radarbalcarce.com` |
| Horario de atención | **A decidir por ustedes**. Propuesta: todos los días de 8:00 a 22:00 (es la franja en que sale el robot). Si se carga, el mensaje de ausencia se puede atar a este horario |
| Foto del perfil | `avatar.png` (cuadrada; se recorta redonda) |
| Catálogo | No hace falta |
| Etiquetas | `Dato nuevo`, `Foto o video`, `Corrección`, `Publicidad`, `Reclamo`, `Respondido` |

#### Canal de WhatsApp: por crear (a mano, con el teléfono)

| Campo | Qué poner |
|---|---|
| Nombre | `Radar Balcarce` (el límite de caracteres no se pudo leer, SIN VERIFICAR; es corto, entra) |
| Descripción | El texto mediano de 6.2 (199 caracteres; el límite no se pudo leer, SIN VERIFICAR) |
| Imagen | `avatar.png` (cuadrada, se recorta redonda) |
| Administradores | El canal admite hasta 16 administradores además del dueño (ayuda oficial de WhatsApp, vista en una búsqueda); las invitaciones se mandan desde el teléfono del dueño y **muestran su número** a quien se invita, así que conviene que el dueño sea el número del medio |
| Qué publicar | Texto, foto, video, encuesta y enlaces (a mano, ver la sección 5). Tope de formato: SIN VERIFICAR |
| Enlace | Cuando exista, ponerlo en el pie de la web, en la bio de Instagram (con el sitio) y en los destacados |

#### LinkedIn (página): no se recomienda abrir

Sólo si algún día hace falta: nombre `Radar Balcarce`; URL `linkedin.com/company/radarbalcarce`; eslogan (hasta 120, SIN VERIFICAR) la bio única (77); "Acerca de" el texto largo; logo 400 × 400 (mínimo 268, PNG o JPEG, hasta 3 MB, ayuda oficial de LinkedIn); portada 4200 × 700 (ayuda oficial de LinkedIn; los 1128 × 191 de las guías viejas también andan).

#### Google Business Profile, Pinterest, Mastodon, Reddit, Snapchat, Twitch/Kick

No se crean. **Si algún día se crea alguna** para reservar el nombre, que sea con el mismo `Radar Balcarce` / `@radarbalcarce` y la misma bio.

### 6.4 Mensajes de bienvenida, ausencia y respuestas rápidas

Tono: el del medio (`CRITERIO-REDES.md` § 2), un poco de voseo como en la presentación de Facebook ("escribinos", "mandanos"), sin emojis y sin prometer horarios. Siempre dicen que el mensaje es automático y que lo lee una persona.

**Saludo** (WhatsApp Business: se manda cuando alguien escribe por primera vez o después de 14 días sin hablar; Messenger: saludo de la página) - 218 caracteres:

```
Hola, gracias por escribirle a Radar Balcarce. Este es un mensaje automático. Si querés mandarnos una foto, un dato o un reclamo, escribilo acá: lo lee una persona del equipo. Las noticias del día, en radarbalcarce.com
```

**Mensaje de ausencia** (fuera de horario o cuando no se atiende) - 219 caracteres:

```
Hola, gracias por escribir a Radar Balcarce. Ahora no estamos atendiendo; te respondemos apenas podamos. Si es una noticia o un dato, dejanos acá la foto o el texto y el lugar. Las noticias del día, en radarbalcarce.com
```

**Respuestas rápidas** (WhatsApp Business: se invocan con `/`):

| Atajo | Texto |
|---|---|
| `/dato` | Gracias por avisarnos. ¿Nos contás qué pasó, dónde y a qué hora? Si tenés una foto o un video, mandalos. Si son tuyos, decinos si los podemos publicar y con qué nombre. |
| `/correccion` | Gracias por avisarnos del error. Decinos en qué nota está (el título o el enlace) y qué dato cambiarías; lo revisamos y, si corresponde, lo corregimos. |
| `/ia` | Las notas las escribe una inteligencia artificial y se verifican contra las fuentes. Lo sensible lo revisa una persona antes de salir. |
| `/publicidad` | Para propuestas comerciales escribinos a publicidad@radarbalcarce.com. |
| `/gracias` | Gracias por escribirnos. Seguimos con las noticias de Balcarce en radarbalcarce.com. |

**Instagram y Facebook** (bandeja de mensajes): usar el mismo saludo y la misma ausencia. Meta pide siempre dar un camino para hablar con una persona (por eso el texto dice que "lo lee una persona del equipo").

### 6.5 Qué verificar antes de abrir cada cuenta

| Qué | Cómo |
|---|---|
| Que `radarbalcarce` esté libre | Buscarlo en YouTube, Telegram, Bluesky, LinkedIn. En Telegram, un nombre de usuario ocupado se reemplaza por `radar_balcarce` |
| Que el nombre del canal de WhatsApp esté libre | Se ve al crearlo |
| Que el logo se vea bien recortado en redondo | Mirarlo en el celular y en la compu en cada red (el de Facebook se ve distinto en cada una) |
| Que ningún perfil lleve enlaces a notas sueltas | Sólo `radarbalcarce.com` |
| Que el 2266 51-1612 sea el mismo en todos los botones | El de Instagram, Facebook y WhatsApp Business |
| Que cada perfil nuevo diga lo mismo | Copiar de esta sección, no de otro lado (`PERFILES.md` sigue siendo el único lugar del texto de Instagram y Facebook; los textos de las redes nuevas conviene sumarlos ahí cuando se aprueben) |

---

## 7. Lo que no pude confirmar

- **TikTok**: cuántos días de anticipación deja la programación nativa (10 o 30), si la app de celular programa, y si acepta fotos y carruseles. La ayuda oficial no se pudo leer. Se resuelve entrando a TikTok Studio con la cuenta.
- **Buffer**: si el plan gratis incluye TikTok ("only available on our new plans", dice su ayuda) y si su API publica video a TikTok (su hoja de ruta de febrero lo lista como "Exploring"). Se resuelve en la prueba de 14 días.
- **Meta Business Suite**: los 75 días y si programa historias (ayuda de Meta no legible).
- **Threads**: los 75 días y si la web programa (guías de terceros).
- **WhatsApp**: límites de caracteres del nombre y la descripción de la cuenta Business y del canal; si el canal admite todos los tipos de mensaje que dicen los blogs; si el número 2266 51-1612 ya es Business.
- **Facebook**: si Radar Balcarce es "publicador" para la prueba de enlaces de Meta (sigue abierto desde `FORMATOS-POR-RED.md`).
- **YouTube**: si un proyecto sin verificar sube público o privado; los tamaños de perfil y banner (la ayuda oficial no los da).
- **Brevo**: la página de precios no mostró el detalle del plan gratis hoy (300 por día sale de varias páginas de Brevo).
- **Typefully, Fedica**: las páginas oficiales no se pudieron leer.
- **Apple News en Argentina**, **Reddit comercial** y **la API de grupos de Facebook**: sólo hay fuentes de terceros.
- **Tamaños y límites** de X, TikTok, Bluesky y Telegram para los perfiles: salen de guías de terceros.
- **Qué cuentas existen hoy** (por confirmar entrando): Telegram, Bluesky, canal de WhatsApp y Business app; el estado real de TikTok.
- **El tiempo del agente a mano** es una estimación: medirlo la primera semana.
- **El rendimiento en Balcarce** de TikTok, YouTube, Telegram y Bluesky: no hay estudio para pueblos argentinos; sólo nuestras visitas (Facebook 74 %). Informe de Noticias Digitales 2026 (Argentina): el resumen dice que la oferta de Meta domina la búsqueda de información; no pude leer la tabla por plataforma.

## 8. Fuentes (leídas el 17/10/2026, salvo que se indique otra fecha)

**Oficiales o del propio servicio**
- Buffer, precios (Free, Essentials, Team; "última actualización noviembre 2025"): https://buffer.com/pricing
- Buffer, qué es la API (planes, límites, video por enlace público): https://support.buffer.com/en-us/articles/what-is-buffers-api-GtIYIQilz5
- Buffer, usar TikTok (límites, "Notify Me", "sólo en planes nuevos"): https://support.buffer.com/en-us/articles/using-tiktok-with-buffer-oGEroY9Of2
- Buffer, hoja de ruta de la API (actualizada 24/02/2026; TikTok "Exploring"): https://developers.buffer.com/roadmap.html
- Metricool, precios (Free: 1 marca, 20 posteos por mes; API en Advanced): https://metricool.com/pricing/
- Later, precios (sin plan gratis; Starter US$ 18,75 anual): https://later.com/pricing/
- Publer, planes y precios (ayuda oficial): https://publer.com/help/en/article/what-are-publers-plans-and-pricing-15h4yqh/
- Postiz, precios: https://postiz.com/pricing
- Mixpost, precios: https://mixpost.app/pricing
- SocialBee, precios: https://socialbee.com/pricing/
- Repurpose.io, precios: https://repurpose.io/pricing
- Blotato, precios: https://www.blotato.com/pricing
- Ayrshare, precios: https://www.ayrshare.com/pricing/
- Hootsuite, planes: https://www.hootsuite.com/plans
- Zapier, precios: https://zapier.com/pricing · IFTTT, planes: https://ifttt.com/plans · Make: https://www.make.com/en/pricing
- X, precios de la API (pago por uso): https://docs.x.com/x-api/getting-started/pricing
- Google, ayuda de Google Noticias ("no necesitás aplicar"): https://support.google.com/news/producer/answer/1611353
- Google, elegibilidad de Business Profile: https://support.google.com/business/answer/13763036
- YouTube, programar la publicación: https://support.google.com/youtube/answer/1270709 · personalizar el canal: https://support.google.com/youtube/answer/2972003
- Spotify for Creators, el RSS: https://support.spotify.com/us/creators/article/your-rss-feed/
- MailerLite, precios (Free: 250 suscriptores y 2.500 mails por mes): https://www.mailerlite.com/pricing
- Buttondown, precios: https://buttondown.com/pricing · Brevo, precios: https://www.brevo.com/pricing/
- LinkedIn, medidas de imágenes de páginas: https://www.linkedin.com/help/linkedin/answer/70781
- WhatsApp, ayuda de canales: https://faq.whatsapp.com/794229125227200 y https://faq.whatsapp.com/549900560675125 (los textos no cargan: sólo se vieron en resultados de búsqueda); mensajes de ausencia: https://faq.whatsapp.com/2565868990219715
- Telegram, canales con historias y "boosts": https://www.telegram.org/blog/channel-stories/fa?setln=en

**De terceros (leer con cuidado; muchos venden una alternativa)**
- Social Media Examiner, Business Suite hasta 75 días: https://www.socialmediaexaminer.com/10-free-tools-to-easily-manage-instagram-and-facebook/
- Buffer, programar TikTok (30 días, cuenta Business o Creator): https://buffer.com/resources/how-to-schedule-tiktok-posts/
- Threads, programar hasta 75 días: https://adaptlypost.com/en/blog/how-to-schedule-threads-posts
- LinkedIn, programación de páginas (21/03/2023): https://www.socialmediatoday.com/news/LinkedIn-Adds-Native-Post-Scheduling-for-Company-Pages/645635/
- Bajada de la API de grupos de Facebook (abril 2024): https://developers.facebook.com/community/threads/2076398286093257/
- Costo de la API de Reddit: https://www.techloy.com/reddit-api-pricing-in-2026-complete-guide-for-developers-and-businesses/
- Límites de texto de X, Threads, Bluesky, Telegram y TikTok (guías de terceros): https://www.unilink.us/blog/twitter-x-character-limit-2026, https://www.unilink.us/blog/threads-character-limit-2026, https://opentweet.io/answers/bluesky-limits, https://replug.io/blog/tiktok-bio-character-limit
- Apple News y su disponibilidad: https://support.apple.com/en-en/HT5085

**Del propio proyecto**: `CLAUDE.md`, `CRITERIO-REDES.md`, `PERFILES.md`, `MEDIA-KIT.md`, `FORMATOS.md`, `PENDIENTES.md`, `IDEAS.md`, `docs/DECISIONES.md`, `docs/07-REDES.md`, `docs/08-INFRAESTRUCTURA.md`, `docs/auditoria-2-0/06-PROMPTS-Y-AGENTES.md` § 7, `docs/redes/AUTOMATIZAR-REDES-ALTERNATIVAS.md`, `docs/redes/FORMATOS-POR-RED.md`, `docs/redes/PLAN-REELS-OTRAS-REDES.md`, `docs/redes/AUDIO-EN-LA-PAGINA-Y-PODCAST-GENERAL.md`, `docs/seo/AUDITORIA-SEO-LLM.md`, `.github/workflows/redes.yml`, `web/data/estadisticas.json` (datos del 15/10).
