# Threads, X y Buffer: cómo publicar solos (datos al 30/10/2026)

Los datos salen de las páginas oficiales que se pudieron leer (Meta, X, Buffer). Lo que no apareció en una fuente oficial figura como **no confirmado**. Las páginas no traen fecha de vigencia, así que los precios hay que volver a mirarlos antes de contratar.

## 1. Threads

- **Hay API oficial para publicar.** Es la Threads API de Meta: [developers.facebook.com/docs/threads](https://developers.facebook.com/docs/threads). Se publica en dos pasos: crear un contenedor (`POST /{threads-user-id}/threads`) y después publicarlo (`POST /{threads-user-id}/threads_publish`). Meta recomienda esperar unos 30 segundos entre un paso y otro. Fuente: [Threads Posts](https://developers.facebook.com/documentation/threads/posts).
- **App:** se agrega el caso de uso «Threads» en developers.facebook.com/apps. La doc dice que la app recibe un **App ID y secret propios de Threads**, distintos a los de Facebook, y que hay que usar esos. **No confirmado** si se puede agregar a la app «Radar Balcarce Publicador» existente o si conviene una app aparte. Fuente: [Get Started](https://developers.facebook.com/docs/threads/get-started).
- **Permisos:** `threads_basic` (obligatorio para todo) y `threads_content_publish` (para publicar). Fuente: [Get Started](https://developers.facebook.com/docs/threads/get-started).
- **Revisión de la app (App Review):** hace falta para usuarios de la app que **no tengan rol** en ella. Los **Threads testers** (roles de la app) pueden dar los permisos sin revisión. Así se puede probar el flujo entero antes de la revisión. **No confirmado** si la cuenta que vamos a usar cuenta como tester o con rol de admin sin revisión; conviene que Meta lo muestre en el panel.
- **Token:** es de **usuario de Threads, no de usuario del sistema**. No encontré en ninguna fuente que el token de usuario del sistema (el que tenemos en Facebook, sin vencimiento) sirva para Threads: **no confirmado**.
  - Token corto: 1 hora. Token largo: **60 días**. Se renueva antes de vencer con `GET /refresh_access_token`. Fuente: [Get Started](https://developers.facebook.com/docs/threads/get-started) y [Overview](https://developers.facebook.com/docs/threads/overview).
  - Hay que programar la renovación (cada 30 a 50 días, por ejemplo) para no quedar sin token.
  - Un permiso dura 90 días si el perfil es público; se extiende al renovar el token.
- **Qué se puede publicar:**
  - Texto: hasta **500 caracteres** (emojis cuentan por bytes UTF-8).
  - **Texto con enlace:** sí, con `link_attachment` (solo en posts de texto; máximo 5 enlaces).
  - **Imagen:** JPEG o PNG, hasta 8 MB, ancho entre 320 y 1440 px. Meta la descarga de una URL pública en el momento de publicar.
  - **Video:** MOV o MP4, hasta 5 minutos y 1 GB, entre 23 y 60 FPS.
  - Carrusel: de 2 a 20 elementos (cuenta como un solo posteo).
  - Fuente de límites: [Overview](https://developers.facebook.com/docs/threads/overview) y [Threads Posts](https://developers.facebook.com/documentation/threads/posts).
- **Límite por día:** **250 posteos por perfil en 24 horas** (ventana móvil). Para nosotros sobra. Hay también `GET /{threads-user-id}/threads_publishing_limit` para ver el uso.
- **Borrar:** existe el permiso `threads_delete` (límite de 100 por 24 h). Fuente: [Overview](https://developers.facebook.com/docs/threads/overview).
- **Vincular con Instagram:** **la doc no lo exige.** Habla de cuentas de Threads. **No confirmado** si la cuenta de Threads debe estar ligada a la de Instagram profesional para algún paso.
- **Pasos para una persona en el panel de Meta** (según la guía oficial):
  1. En developers.facebook.com/apps, abrir la app y agregar el caso de uso **Threads** (o crear una app nueva con ese caso).
  2. Anotar el **Threads App ID** y el **Threads App Secret** (no los de Facebook).
  3. App Dashboard → App roles → Roles → Add People → **Threads Tester**, con la cuenta de Radar Balcarce.
  4. En Threads, esa cuenta acepta la invitación (Configuración de la cuenta → Permisos de sitios web).
  5. Generar el token corto con el flujo de autorización, canjearlo por el de 60 días y guardarlo en GitHub Secrets o en Cloudflare, nunca en un chat.
  6. Verificar el token con el Access Token Debugger de Meta.
  7. Para cada vez que se publica una imagen o video: que la URL esté públicamente accesible en ese momento.

## 2. X (Twitter)

- **Hay API oficial para publicar** (X API v2, `POST /2/tweets`). Documentación: [docs.x.com/x-api](https://docs.x.com/x-api). Fuente de precios: [Pricing](https://docs.x.com/x-api/getting-started/pricing.md).
- **Planes y precios (oficial):** la doc oficial describe **sólo pago por uso**: «The X API uses pay-per-usage pricing with no subscriptions». Se compran créditos en la Developer Console y se descuentan por pedido.
  - Crear un posteo: **US$ 0,015** por pedido.
  - Crear un posteo **con URL**: **US$ 0,200** por pedido (13 veces más).
  - Crear un posteo «summoned»: US$ 0,010.
  - Lectura de posts: US$ 0,005 por recurso. Media Metadata: US$ 0,005 por pedido.
  - Tope de 3 millones de lecturas por ciclo de facturación; más volumen, plan Enterprise.
  - Los precios «están sujetos a cambios» (la página).
- **Plan gratis:** **no aparece en la doc oficial**. Varias guías de terceros dicen que el plan gratis (500 posteos por mes) se retiró en febrero de 2026 con el pago por uso, y que los planes Basic y Pro quedan sólo para quien ya los tenía. **No confirmado** en fuente oficial. Quedan dudas sobre si hay alguna cuota gratis mínima.
- **Imágenes y video:** la doc oficial de precios no dice si cada posteo permite medios ni sus límites. **No confirmado** el costo y los límites de subir imagen o video en v2; la v1.1 conserva algunos endpoints de medios.
- **Claves:** se sacan en la Developer Console (console.x.com) → X developer Apps: API Key, API Secret y un Access Token. Para publicar en nombre de la cuenta hace falta **OAuth 1.0a User Context** o **OAuth 2.0 PKCE** (con el flujo de tres patas) para generar tokens de la cuenta de Radar. Fuente: [Authentication](https://docs.x.com/fundamentals/authentication/overview). **No confirmado** si hace falta aprobación previa.
- **Cuánto cuesta para nosotros** (cálculo con la tabla oficial, 5 posteos por día = 150 por mes):
  - Sin enlace: 150 × US$ 0,015 = **US$ 2,25/mes** (sin contar medios).
  - Con enlace: 150 × US$ 0,20 = **US$ 30/mes**.
  - Si además se suben 3 a 8 videos por día para X, habría que sumar lo de medios (**no confirmado**).

## 3. Buffer

- **Buffer publica en Threads y en X:** sí. La página de precios de Buffer lista Instagram, Facebook, TikTok, LinkedIn, X, YouTube, Threads, Pinterest, Google Business Profile, Bluesky, Mastodon y Substack. Fuente: [buffer.com/pricing](https://buffer.com/pricing). Los hilos se pueden publicar en X y Threads.
- **Planes (página oficial, precios de noviembre de 2025):**
  - **Free:** gratis, **hasta 3 canales**, 10 posteos programados por canal en cola (no es un tope mensual).
  - **Essentials:** US$ 5/mes por canal (US$ 60/año), posteos programados ilimitados (tope de uso justo de 5.000 por canal).
  - **Team:** US$ 10/mes por canal (US$ 120/año), usuarios ilimitados.
  - Nuestro caso: Facebook, Instagram, TikTok, YouTube, Threads y X son **6 canales**. Con Free no alcanza. Si todo va por Buffer (6 × US$ 5): **unos US$ 30/mes**. **No confirmado** si el precio mensual o anual se cobra exacto así para 6 canales. Fuente: [buffer.com/pricing](https://buffer.com/pricing) y [FAQ de Buffer](https://buffer.com/pricing).
- **API de Buffer:**
  - La API **legacy (REST) está cerrada a nuevos clientes** (cerró el alta en 2019). Buffer anunció el retiro: brownouts el **11/11/2026** y el **9/12/2026**, y retiro total el **1/2/2027**. Fuente: [anuncio oficial](https://buffer.com/resources/legacy-rest-api-retired/) (publicado el 27/07/2026).
  - Existe una **API pública nueva (GraphQL)**, lanzada en mayo de 2026 según la página de anuncio. Mutaciones de ejemplo: crear post de texto, de imagen, de video, hilo, borrador y programado. Se obtiene una API key en publish.buffer.com (Configuración). Fuente: [developers.buffer.com](https://developers.buffer.com/).
  - **No confirmado** si la API nueva acepta **nuevos desarrolladores hoy** (la página oficial no lo dice; hay que escribir a developersupport@buffer.com). **No confirmado** si crea posts con enlace y si Threads y X están habilitados en la API (la página sólo dice «todas las redes principales»).

## 4. Recomendación

- **Threads: API propia de Meta.** Es gratis, usa el mismo panel de Meta y el mismo tipo de publicación de Facebook e Instagram. Hay que agregar el caso de uso Threads, hacer el tester, y programar la renovación del token cada 60 días. El límite de 250 por día no es un problema.
- **X: depende de cuánto enlace mandamos.**
  - Si los posteos llevan enlace, **Buffer (Essentials, US$ 5/mes por canal)** sale más barato que la API de X (US$ 30/mes), **siempre que** la API de Buffer habilite a nuestro programa (no confirmado). Si no, usar la app de Buffer a mano para X.
  - Si el enlace va en la respuesta o en el texto sin link, la API oficial de X (~US$ 2 a 3/mes) es lo más barato, pero hay que confirmar costo de medios y acceso.
- **Buffer completo** (todas las redes) no conviene todavía: con 6 canales cuesta ~US$ 30/mes y el alta de la API no está confirmada. Mejor usarlo sólo para X si hace falta.
- **Antes de contratar o programar:** (1) probar Threads con el tester; (2) pedir a Buffer, por mail, si la API nueva acepta clientes nuevos; (3) cargar créditos de X sólo después de confirmar el costo de medios.

## Tabla resumen

| Red | Vía recomendada | Costo mensual aprox. | Token / acceso | Límites clave | Pendiente |
|---|---|---|---|---|---|
| Threads | API propia (Meta) | US$ 0 | Token de usuario, 60 días, renovable con `refresh_access_token` | 250 posteos/24 h; texto 500 car.; imagen 8 MB; video 5 min / 1 GB | Confirmar si la app existente sirve; token de usuario del sistema no confirmado; vínculo con Instagram no confirmado |
| X | API oficial (pago por uso) o Buffer | API: US$ 2,25 sin enlace / US$ 30 con enlace; Buffer: US$ 5 | Claves de la Developer Console + OAuth de la cuenta | Pago por pedido; no hay plan gratis confirmado | Costo de medios no confirmado; plan gratis y aprobación no confirmados |
| Buffer | Sólo para X si hace falta | US$ 5/mes por canal (Essentials); 6 canales = ~US$ 30 | API key en publish.buffer.com | Free: 3 canales, 10 en cola por canal | Alta de nuevos desarrolladores en la API GraphQL no confirmada; Threads y X en la API no confirmados; retiro de la API legacy: 11/11, 9/12/2026 y 1/2/2027 |

## Fuentes

- [Threads API (overview)](https://developers.facebook.com/documentation/threads)
- [Threads Posts](https://developers.facebook.com/documentation/threads/posts)
- [Threads Get Started](https://developers.facebook.com/docs/threads/get-started)
- [Threads Overview](https://developers.facebook.com/docs/threads/overview)
- [X API: precios](https://docs.x.com/x-api/getting-started/pricing.md)
- [X API: autenticación](https://docs.x.com/fundamentals/authentication/overview)
- [Buffer: precios](https://buffer.com/pricing)
- [Buffer: retiro de la API legacy](https://buffer.com/resources/legacy-rest-api-retired/)
- [Buffer developers](https://developers.buffer.com/)
- Terceros (sólo para contexto, no confirmado): guías de precios de X de 2026 (bundle.social, wearefounders.uk) y de Buffer (socialpilot, zernio).
