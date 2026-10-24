# Plan: publicar los reels también en las otras redes

*15/10/2026. Es un **plan**, no código en producción: no se creó ninguna cuenta, no se tocó ninguna clave y no se publicó nada. Lo único
que se escribió en el repositorio es el esqueleto `redes/destinos.mjs` (con su prueba, `pruebas/destinos.test.mjs`), que arranca
**apagado y simulando**. *(17/10/2026: ese esqueleto se sacó del repositorio porque nadie lo usaba — pedido de los dueños: "que no
quede nada que no se use". Queda en el historial de git: se busca el commit que borró `redes/destinos.mjs` y se lo recupera tal cual el
día que se retome este plan.)* Todo lo que dice "según la documentación oficial" se leyó el 15/10/2026; lo que no se pudo confirmar en una
fuente oficial está marcado con **(sin confirmar)** y figura en el § 9.*

Hoy los reels salen por la API de Meta a **Facebook** (página) e **Instagram** (`@radarbalcarce`). La pregunta es si el **mismo video**
(el que ya se arma para esas dos, sin gastar un audio más) puede ir también a TikTok, YouTube Shorts, Threads, X, Bluesky, Telegram,
WhatsApp, Pinterest y LinkedIn, y a qué costo en trámites, plata y riesgo.

## 0. En una pantalla

| Red | ¿API oficial para subir video? | ¿Se puede **sin ningún trámite humano**? | Trámite una sola vez | Costo | Encaja con un medio local | Esfuerzo (Claude) | Veredicto |
|---|---|---|---|---|---|---|---|
| **Telegram (canal)** | Sí, Bot API (`sendVideo`) | Casi: sólo crear el bot y el canal | 10 minutos | 0 | Medio (sirve para lo útil: farmacia, clima) | 0,5 día | **Hacerlo primero** |
| **Bluesky** | Sí (AT Protocol) | Casi: crear la cuenta y una "contraseña de aplicación" | 15 minutos | 0 | Bajo hoy (poca gente de Argentina), costo cero | 1 día | **Hacerlo** |
| **YouTube Shorts** | Sí, YouTube Data API v3 (`videos.insert`) | No: autorizar una vez con la cuenta | 30 a 45 minutos (Google Cloud) | 0 | **Alto** (la gente busca "Balcarce"; el video queda meses) | 1 día | **Hacerlo** (el de más alcance) |
| **Threads** | Sí, Threads API (`threads_publish`) | No: invitación de "tester" y token | 30 minutos | 0 (+ un depósito de videos, dentro del gratis) | Medio (es la misma gente de Instagram) | 1,5 días | Después de las anteriores |
| **X** | Sí, X API v2 (pago por uso) | No: crear la app y cargar crédito con tarjeta | 20 minutos + tarjeta | **~US$ 2 por mes** si el posteo **no lleva enlace** (US$ 30 si lo lleva) | Bajo a medio | 1,5 días | Opcional, con tope de gasto |
| **TikTok** | Sí, Content Posting API, **pero** sin auditoría todo queda **privado** | **No** | Aplicar a una auditoría que tarda semanas y puede ser rechazada | 0 | Alto en alcance, pero la red es difícil de automatizar | 2 días + espera | **Pedir la auditoría ya; mientras tanto, a mano** |
| **WhatsApp (canal)** | **No hay API oficial** | No | Crear el canal (5 minutos) | 0 a mano; vía terceros, riesgo de bloqueo | **El más cercano a la gente de acá** | — | **A mano** (20 segundos por repaso); no automatizar |
| **Pinterest** | Sí (v5), pero sin "acceso Standard" los pines son **sólo visibles para vos** | No | Revisión con video de demostración | 0 | Muy bajo | 1 día | **No** |
| **LinkedIn** | Sí (Videos API + Posts API), con **producto restringido** (Community Management) y revisión | No | Revisión de la aplicación con video; pide empresa | 0 | Muy bajo | 2 días + espera | **No** por ahora |

Una advertencia de realismo, con datos propios (`web/data/estadisticas.json`): hoy Facebook trae casi todas las visitas (referente
`facebook.com`), la página tiene 53 seguidores y Instagram 7. **Sumar redes no va a cambiar el tamaño de la audiencia de un día para el
otro**: sirve para que el medio exista donde la gente lo busca (YouTube y Google, Telegram, X) a **costo casi cero**. Por eso el orden
elegido pone primero lo gratis, sin revisión y sin riesgo de cuenta.

## 1. Lo que ya tenemos (y no hay que rehacer)

- **Un solo video por pieza**, armado una vez por `reels/plan.mjs` / `reels/reel.mjs` para Instagram y Facebook: **1080 × 1920 (9:16)**,
  H.264 (`libx264`, `yuv420p`, 30 cuadros por segundo), audio AAC 160 kbps a 44,1 kHz, `+faststart`, **subtítulos quemados en la imagen**,
  voz de Gemini ya normalizada de volumen. Dura de 6 a 58 segundos (el tope lo fija `PODCAST_VOZ.segundosMaximoHistoria`, 58). Pesa de
  **0,4 a 1,5 MB**. Cumple los límites de **todas** las redes de este plan, sin recodificar.
- **El cupo de voz no se toca**: repartir un video ya armado no pide ningún audio (10 por día, un día normal usa 7 a 9).
- **El libro** (`web/data/redes.json`) y su regla de no repetir; **los problemas** (`libro.problemas`); **el interruptor** `REDES_ACTIVAS`
  (`estaActivo`, `redes/elegir.mjs`); **el candado** `concurrency: redes`; **la simulación**; **el aviso de la voz** («Voz generada con
  inteligencia artificial.», regla 114).
- **Qué piezas son reels** hoy (`redes/piezas.mjs`, `redes/horarios.mjs`): "Un día como hoy" 9:00, los tres repasos 10:00 / 15:00 / 21:00,
  Participá o la agenda a las 12:00 de lunes a viernes, los teléfonos útiles los sábados 17:00 y el feriado 8:00. El clima de la mañana y
  de la noche y la farmacia son **historia** en Instagram (y reel sólo en Facebook).
- **Dónde está el video en la corrida**: sólo en la máquina de GitHub mientras corre "Redes" (`reels/salida/*.mp4`); después queda 3 días
  como artefacto. Por eso la primera versión **reparte en la misma corrida**, justo después de Instagram y Facebook (§ 7).
- **Lo que las cuentas ya tienen** (`PERFILES.md`): X `@RadarBalcarce` y Threads `@radarbalcarce` creadas el 15/10; TikTok `@radarbalcarce`
  creada (la bio y el logo no se veían: revisar); **YouTube todavía no tiene canal**; Telegram y Bluesky, sin cuenta.

## 2. Red por red

Para cada una: qué dice la documentación oficial, qué hace falta, límites, costo, riesgos y si encaja. Los enlaces están en el § 10.

### 2.1 Telegram (canal) — el más fácil

- **API:** Bot API oficial. `sendVideo` (subida directa del archivo, `multipart/form-data`). Gratis, sin revisión, sin auditoría.
- **Requisitos:** un bot (se crea hablando con **@BotFather**), un **canal** (público, con dirección `t.me/…`), y el bot agregado al canal como
  **administrador con permiso de publicar**.
- **Límites:** los bots suben archivos de hasta **50 MB** (nuestros videos pesan 1 o 2); texto del video (`caption`) de hasta **1.024
  caracteres**; hasta 20 mensajes por minuto en un grupo y unos 30 por segundo en total, muy lejos de lo nuestro. No hay tope diario de
  publicaciones que importe a este volumen.
- **Autenticación:** el token del bot **viaja en la dirección** (`https://api.telegram.org/bot<TOKEN>/sendVideo`). Choca con la regla "el
  token nunca en la dirección" de `redes/meta.mjs`: hay que limpiar cualquier error que lo repita (igual que `sinToken`).
- **Notificaciones:** `disable_notification` deja un mensaje en silencio. Con 7 a 9 videos por día conviene que **suenen sólo el repaso
  de la mañana, la farmacia y el repaso de la noche**; el resto, en silencio.
- **Riesgos:** casi ninguno. Un bot que publica en su propio canal no es "spam". Si se pierde el token, se regenera con @BotFather.
- **Encaje:** medio. En un pueblo, Telegram se usa poco, pero el canal sirve para quien quiera la farmacia de turno y el clima sin abrir
  Instagram, y es lo único "de mensajería" que se puede automatizar (WhatsApp no).
- **Esfuerzo:** medio día. Es el mejor lugar para **probar todo el circuito nuevo** (simulación, libro, problemas).

### 2.2 Bluesky

- **API:** AT Protocol, abierta. Se entra con **usuario + contraseña de aplicación** (se crea en Configuración → Contraseñas de aplicación;
  se puede revocar sin cambiar la contraseña real). Para video: pedir una credencial de servicio, subir el archivo al servicio de video,
  esperar a que lo procese y crear el posteo con el video incrustado (`app.bsky.embed.video`). **(sin confirmar el detalle de los
  pasos: la página oficial del tutorial no se pudo leer; verificarlo al implementar)**.
- **Límites:** 1 video por posteo; **hasta 3 minutos y 100 MB** desde marzo de 2025 (antes 60 segundos); formatos `.mp4`, `.mpeg`, `.webm`, `.mov`;
  cuota diaria de unos **25 videos o 10 GB** por cuenta (cifras de Bluesky; `app.bsky.video.getUploadLimits` da el número real de la cuenta).
  Exige **correo verificado** para subir video. El texto del posteo llega a 300 caracteres y los enlaces se marcan aparte.
- **Costo:** 0. **Revisión:** ninguna.
- **Riesgos:** bajos. Hay que declarar un texto alternativo del video (accesibilidad) y respetar el tope diario.
- **Encaje:** bajo hoy (poca gente de Argentina), pero costo cero y buena comunidad de periodismo. El nombre de usuario puede ser el
  propio dominio (`@radarbalcarce.com`, se prueba con un registro DNS), que sirve de "sello" de que la cuenta es del sitio.

### 2.3 YouTube Shorts — el de más alcance a largo plazo

- **API:** YouTube Data API v3, `videos.insert` con subida "reanudable". **No existe una API aparte de Shorts**: un video es Short si es
  **vertical o cuadrado y dura hasta 3 minutos** (regla vigente desde el 15/10/2024); el nuestro lo cumple solo. Poner `#Shorts` en el
  título ayuda a mostrarlo, pero no lo decide.
- **Requisitos:** un **canal** de YouTube (hoy no hay), un proyecto de **Google Cloud** con la API activada, una **pantalla de
  consentimiento OAuth** y una autorización hecha **una vez** por una persona con la cuenta del canal (alcance `youtube.upload`). El robot
  guarda el *refresh token* y pide un acceso nuevo en cada corrida.
- **Límites y cuota (según la documentación oficial, leída hoy):** cada subida cuesta **1 unidad del "balde" de subidas, con tope de 100
  subidas por día**. Antes costaba 1.600 unidades de 10.000 (seis subidas por día) y desde el 4/12/2025 bajó; desde el 1/6/2026 las
  subidas tienen su propio balde. Con 2 a 3 por día sobra.
- **El punto delicado:** durante años, los proyectos de Google Cloud **sin auditar** quedaban con los videos **forzados a privado**. La
  página oficial de `videos.insert` de hoy dice lo contrario ("los videos subidos desde proyectos no verificados **no** están restringidos
  a modo privado"), pero muchos blogs repiten lo viejo y no encontré una nota de cambio oficial. **Se resuelve con una prueba de 5
  minutos**: subir un video de prueba como "no listado" y mirar si se puede cambiar a público. Si quedara forzado a privado, el trámite
  es el formulario de auditoría de YouTube API Services (§ 3), gratis, de semanas.
- **Otra trampa conocida:** si la pantalla de consentimiento queda en estado **"Pruebas"**, el *refresh token* **vence a los 7 días**. Hay
  que dejarla "En producción" (con un alcance sensible pero sólo para uso propio alcanza con la advertencia de "app no verificada").
- **Etiqueta de contenido sintético:** `status.containsSyntheticMedia` existe en la API. Decisión para ustedes (§ 9): marcarla en
  verdadero por transparencia (la voz es generada) o no marcarla porque la voz no imita a nadie.
- **Costo:** 0. **Riesgos:** bajos si se respeta la cuota y se declara el contenido. Un canal nuevo tiene límites hasta verificarse por teléfono.
- **Encaje:** **alto**. Un Short sobre "Balcarce" se encuentra en Google y en YouTube durante meses; es la única red de este plan donde el
  video **no caduca** en horas. Por eso va con las piezas que no vencen (la efeméride, el repaso de la noche, los útiles, la agenda y el feriado).

### 2.4 Threads

- **API:** Threads API oficial de Meta. Dos pasos: crear el "contenedor" del video y, unos 30 segundos después, publicarlo.
- **Lo que complica:** el video se pasa **por una dirección pública** (`video_url`); Threads lo baja desde ahí. No se sube el archivo
  directo como en Instagram. Hace falta **alojar el video un rato en una dirección pública** (§ 7.5: un depósito de Cloudflare R2 con un
  dominio propio, que además ya está medio preparado con "Fotos a R2").
- **Requisitos de formato:** MP4 o MOV, H.264 o HEVC, 23 a 60 cuadros por segundo, ancho máximo 1920, audio AAC de hasta 48 kHz, **sin
  "edit lists" y con el bloque `moov` al principio**, hasta 5 minutos y 1 GB. Nuestros videos cumplen todo salvo, tal vez, las "edit
  lists" (ffmpeg a veces las deja); si la primera prueba falla por eso, se arregla copiando el video sin recodificar con `-use_editlist 0`
  **(sin confirmar)**.
- **Cuenta y permisos:** una app de Meta con el caso de uso "Threads" (se puede agregar a la app que ya existe, "Radar Balcarce
  Publicador"), permisos `threads_basic` y `threads_content_publish`. **No hace falta revisión de Meta** para publicar en la propia cuenta:
  alcanza con invitar a `@radarbalcarce` como **"Threads Tester"** y aceptar la invitación desde la cuenta.
- **Token que vence:** el token largo dura **60 días y hay que renovarlo** (cada renovación vale otros 60). Sin renovar, hay que repetir
  el trámite a mano. Por eso este es el destino que obliga a tener un **lugar donde guardar un token que cambia** (§ 7.4).
- **Límite:** 250 posteos por día por perfil (nos sobra). Texto de hasta 500 caracteres.
- **Costo:** 0 (el depósito R2 está dentro de lo gratis a este volumen **(sin confirmar la tabla de precios vigente)**).
- **Encaje:** medio: es la misma cuenta y el mismo público que Instagram. Si en Instagram hay 7 seguidores, ahí también.

### 2.5 X (Twitter)

- **API:** X API v2. Video por subida en pedazos (`/2/media/upload/…`), después `POST /2/tweets` con el identificador del video.
- **Costo (leído en la documentación oficial hoy):** modelo **pago por uso**, sin planes mensuales para cuentas nuevas. **Crear un posteo
  cuesta US$ 0,015**; **si el posteo lleva un enlace, US$ 0,20** (13 veces más). La subida de medios no figura con precio propio
  **(sin confirmar)**. Con 4 posteos por día **sin enlace**: 4 × 30 × 0,015 = **~US$ 1,80 por mes**. Con enlace: ~US$ 24 por mes. Se compra
  crédito por adelantado en la consola (hay un crédito de bienvenida de US$ 20 al guardar la primera tarjeta) y se puede poner un **tope de
  gasto**. Recomendación: **sin enlace** en el texto; decir "radarbalcarce.com" en la imagen/voz ya alcanza. **(sin confirmar si escribir el
  dominio pelado cuenta como enlace para el cobro: la primera prueba lo dice en la consola)**.
- **Límites:** videos de hasta 20 minutos para una cuenta común; el texto, 280 caracteres. Los topes por tiempo no figuran en la página de
  precios oficial; no nos acerca ninguno.
- **Autenticación:** una app en la consola de X, con permiso de lectura y escritura, y las cuatro claves de la cuenta (API Key/Secret, Access
  Token/Secret) con firma OAuth 1.0a (se hace con `node:crypto`). Esas claves **no vencen**. La alternativa OAuth 2.0 rota el token y obliga a
  guardarlo. **(sin confirmar que la subida v2 de medios acepte OAuth 1.0a: es lo primero que hay que probar)**.
- **Riesgos:** X cambia precios y reglas seguido. Marcar la cuenta como **"automatizada"** en su configuración (recomendado y exigido por sus
  reglas para cuentas que publican solas) y no responder ni seguir desde el robot.
- **Encaje:** bajo a medio: periodistas, municipio y entidades de la zona están ahí; el público general, mucho menos. Decisión de ustedes si
  vale ~US$ 2 por mes y una tarjeta cargada.

### 2.6 TikTok — el difícil

- **API:** Content Posting API. Dos caminos:
  1. **Publicación directa (Direct Post)**: el video sale en el perfil. Hace falta una app aprobada con el permiso `video.publish` y que el
     dueño de la cuenta la autorice (Login Kit). **Mientras la app no pase una auditoría, TODO lo que publique queda en privado
     ("solo yo")**, y además la cuenta tiene que ser privada al publicar y sólo hasta 5 usuarios por día. El error aparece como
     `unaudited_client_can_only_post_to_private_accounts`.
  2. **Subir a borradores (Upload)**: el video llega al "buzón" de TikTok y **la persona termina de publicarlo desde la app**. Permiso
     `video.upload`; máximo 5 envíos pendientes por 24 horas. La documentación no dice que exija auditoría **(sin confirmar)**.
- **La auditoría:** la pide el propio panel de desarrolladores, hay que mostrar un video de la app funcionando y que el uso cumpla las
  condiciones de TikTok. Las guías de terceros hablan de **2 a 6 semanas** y de que TikTok quiere productos **"para un público amplio"**,
  no una herramienta propia para una sola cuenta; hay muchos rechazos **(sin confirmar: no hay una fuente oficial para eso)**. Además, las
  reglas de experiencia de TikTok piden que el usuario elija a mano la privacidad, los comentarios y dé consentimiento expreso en cada
  video: **una publicación 100 % automática choca con esas reglas**, aunque la documentación no la prohíbe con esas palabras.
- **Límites si se aprueba:** 6 pedidos por minuto por usuario; un tope de unas 15 publicaciones por día por cuenta, compartido entre apps
  (`spam_risk_too_many_posts`); video de hasta 5 minutos según la cuenta (consulta `creator_info`); el enlace de subida vale 1 hora.
- **Etiqueta de IA:** el campo `is_aigc` marca el video como "generado por IA" (la etiqueta propia de TikTok).
- **Costo:** 0. **Riesgo:** una cuenta que automatiza por afuera de la API (con robots que simulan un navegador) **se bloquea**; no se hace.
- **Recomendación:** (a) **pedir la auditoría igual**, es gratis y el tiempo de espera es largo: conviene tener la solicitud en curso mientras
  se construye lo demás, con el cuidado de describir con honestidad qué hace el producto; (b) mientras tanto, **publicar a mano 1 o 2 videos
  por día** bajando el mp4 del artefacto de la corrida (3 días de vida) o con el camino "Upload a borradores"; (c) **no** contratar un
  intermediario de pago hasta ver si el alcance lo justifica.

### 2.7 WhatsApp (canal)

- **Hoy no existe una API oficial para publicar en un Canal de WhatsApp.** La API de WhatsApp Business (Cloud API) sirve para conversaciones y
  mensajes a contactos; los Canales siguen siendo una función de la app (consumo y Business) **sin API anunciada** en lo que pude encontrar
  **(sin confirmar al 15/10/2026: mirar de nuevo antes de decidir)**. Existen servicios de terceros que publican en canales con un número
  conectado por QR, pero usan una vía **no oficial**: riesgo de bloqueo del número (el 2266 51-1612 es el WhatsApp del medio y no se arriesga).
- **Recomendación:** crear el canal y **publicar a mano** el repaso de la mañana y el de la noche (20 segundos con el celular), o simplemente
  **mandar el enlace de Telegram/YouTube**. Es el canal más cercano a la gente de acá, así que vale la pena aunque sea manual.
- **Ojo con lo que ya existe:** `redes/whatsapp.mjs` (CallMeBot) sólo manda avisos al teléfono de ustedes; no es un canal ni se debe usar como tal.

### 2.8 Pinterest

- **API v5** con video (se sube a un almacenamiento temporal, se registra y se crea el pin). **Con acceso "Trial", los pines son visibles sólo
  para quien los crea**; hacerlos públicos exige el acceso **"Standard"**, que se pide con un video del flujo OAuth (incluso para una app
  de un solo usuario) y tarda de 1 a 4 semanas según guías de terceros. Pinterest no es una red de noticias locales. **No vale la pena.**

### 2.9 LinkedIn

- **API:** Videos API + Posts API con el permiso `w_organization_social`, que pertenece al producto **Community Management**, un "producto
  vetted" con nivel de Desarrollo y nivel Estándar (video de demostración). Hace falta una **página de empresa** y ser administrador. Video
  MP4 de 3 segundos a 30 minutos y de 75 KB a 500 MB. Funciona, pero el trámite es de empresa y el público (profesional, B2B) no es el de un
  medio de barrio. **No por ahora**; se vuelve a mirar si hay un perfil comercial del medio.

## 3. Qué se automatiza YA y qué necesita que una persona haga un trámite

**"Ya" quiere decir: sin ningún trámite nuevo, solo con lo que existe.** Ninguna red de este plan se puede publicar desde cero sin una persona,
porque todas piden crear o autorizar una cuenta (y crear cuentas o pegar claves es algo que **sólo hacen ustedes**). La diferencia está en
cuánto trámite es y en qué pasa **después**:

| Red | ¿Después del trámite, corre solo? | Qué hay que renovar |
|---|---|---|
| Telegram | Sí, para siempre | Nada |
| Bluesky | Sí | Nada (la contraseña de aplicación no vence; si se revoca, se crea otra) |
| YouTube | Sí | Nada, mientras se use al menos cada 6 meses (los *refresh token* sin uso vencen a los 6 meses) |
| X | Sí | Nada (claves OAuth 1.0a); sólo **cargar crédito** |
| Threads | Sí, si el robot renueva el token | El token largo **vence a los 60 días**: lo renueva el propio robot cada vez que corre, y el vigilante avisa si no pudo |
| TikTok | Sólo con auditoría aprobada | Renovar el acceso cada 24 horas (automático) y el permiso de la cuenta cada tanto |
| WhatsApp / Pinterest / LinkedIn | No (ver arriba) | — |

### 3.1 Los trámites, uno por uno (los hace una persona; ningún valor se pega en un chat)

> Regla de siempre: **claves, tokens y contraseñas van a GitHub → Settings → Secrets and variables → Actions** (secretos) o **Variables**
> (lo que no es secreto). Nunca en un chat ni en el código. El interruptor de cada red es una **variable** (`REDES_TELEGRAM`, etc.) que
> arranca en **No**: se pasa a **Si** recién cuando la prueba en modo simulación salió bien.

**A. Telegram — 10 minutos**
1. En Telegram, hablar con **@BotFather** (https://t.me/BotFather) → `/newbot` → nombre "Radar Balcarce" y usuario terminado en `bot`
   (por ejemplo `RadarBalcarceBot`). Copiar el *token* que da.
2. Crear un **canal público** llamado "Radar Balcarce" con dirección `t.me/radarbalcarce` (si está tomada, `t.me/radarbalcarce_ok`). Texto
   de presentación: la bio oficial de `PERFILES.md`. Logo: `reels/salida/avatar.png`.
3. En el canal → Administradores → agregar el bot con permiso **Publicar mensajes**.
4. En GitHub: secreto `TELEGRAM_BOT_TOKEN` (el token), variable `TELEGRAM_CANAL` (`@radarbalcarce`).

**B. Bluesky — 15 minutos**
1. Crear la cuenta en https://bsky.app con `radarbalcarce@gmail.com` y **confirmar el correo** (sin eso no deja subir video).
2. Nombre de usuario: `radarbalcarce.bsky.social`, o mejor el dominio propio `radarbalcarce.com` (Configuración → Cambiar usuario → "Tengo mi
   propio dominio" → agregar el registro TXT que indica, en el DNS del dominio).
3. https://bsky.app/settings/app-passwords → crear una **contraseña de aplicación** llamada "robot Radar" **sin** permiso de mensajes directos.
4. En GitHub: secretos `BLUESKY_USUARIO` (el usuario completo) y `BLUESKY_CLAVE_APP`.

**C. YouTube — 30 a 45 minutos**
1. Crear el canal con `radarbalcarce@gmail.com`: https://www.youtube.com/create_channel (nombre "Radar Balcarce", logo oficial, la bio oficial).
   Verificar el teléfono en https://www.youtube.com/verify.
2. En https://console.cloud.google.com crear un proyecto "radar-balcarce-youtube" y **activar la API**:
   https://console.cloud.google.com/apis/library/youtube.googleapis.com
3. Pantalla de consentimiento: https://console.cloud.google.com/apis/credentials/consent → tipo **Externo** → agregar el alcance
   `.../auth/youtube.upload` → **publicar la aplicación ("En producción")**. **Si queda en "Pruebas", el acceso muere a los 7 días.**
4. Credenciales: https://console.cloud.google.com/apis/credentials → "ID de cliente de OAuth" (aplicación de escritorio). Copiar el ID y el
   secreto.
5. **Autorizar una vez** con la cuenta del canal (eligiendo el canal de marca "Radar Balcarce"): Claude deja un script chico
   (`redes/youtube-autorizar.mjs`, a escribir) que se corre **en la PC de ustedes**, abre el navegador y muestra el *refresh token* en la
   terminal, sin guardarlo en ningún archivo.
6. En GitHub: secretos `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.
7. Si la primera subida de prueba queda **privada**: formulario de auditoría y ampliación de cuota de YouTube API Services (§ 10).

**D. Threads — 30 minutos (más el depósito de videos, § 7.5)**
1. https://developers.facebook.com/apps/ → la app **"Radar Balcarce Publicador"** (ID 2302218363874399) → Agregar caso de uso **"Acceder a la API
   de Threads"** → permisos `threads_basic` y `threads_content_publish`.
2. En esa app → Roles → **Threads Tester** → invitar a `radarbalcarce`. Aceptar la invitación en Threads (Configuración → Cuenta → Permisos de
   sitios web / invitaciones; el nombre exacto del menú puede variar **(sin confirmar)**).
3. En la sección de Threads de la app, generar el **token de acceso** de la cuenta y cambiarlo por uno **de larga duración** (60 días). Lo
   hace un script de Claude (`redes/threads-autorizar.mjs`, a escribir) en la PC de ustedes.
4. En GitHub: secretos `THREADS_TOKEN`, `THREADS_USER_ID`, `THREADS_APP_SECRET` (el secreto de la app **de Threads**, no el de Facebook) y,
   cuando exista el depósito, la variable `VIDEOS_BASE`.

**E. X — 20 minutos y una tarjeta**
1. Con la cuenta `@RadarBalcarce`, entrar a la consola de desarrolladores: https://console.x.com → crear una app → "Autenticación de
   usuario" con permiso de **leer y escribir** → generar *API Key/Secret* y *Access Token/Secret*.
2. **Cargar crédito** (empezar con US$ 5 a 10) y poner un **tope de gasto** y la recarga automática **apagada**. Lo hace una persona con su
   tarjeta; ni Claude ni el robot tocan datos de pago.
3. Activar la etiqueta de **cuenta automatizada** en la configuración de la cuenta.
4. En GitHub: secretos `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`.

**F. TikTok — 30 minutos para pedirlo y semanas para esperarlo**
1. Entrar a https://developers.tiktok.com con la cuenta `@radarbalcarce` → "Manage apps" → crear una app → agregar **Login Kit** y **Content
   Posting API** (con *Direct Post*). Hace falta una página de términos y de privacidad del sitio (revisar si `radarbalcarce.com` las tiene).
2. Probar en el entorno de pruebas ("sandbox", los videos salen privados) y enviar la solicitud de **auditoría** con el video de demostración
   (el formulario está en el panel de la app; guía: https://developers.tiktok.com/doc/content-posting-api-get-started).
3. Cuando esté aprobada: secretos `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` y `TIKTOK_REFRESH_TOKEN` (lo emite una autorización hecha una
   vez por la cuenta).

**G. WhatsApp (canal), a mano — 5 minutos**: en el WhatsApp Business del medio → Novedades/Actualizaciones → Canales → "+" → Crear canal
(https://www.whatsapp.com/channels). Cargar nombre, la bio oficial y el logo. No hay ningún secreto involucrado.

## 4. Recomendación priorizada

| Orden | Qué | Por qué | Cuándo (si les parece) |
|---|---|---|---|
| **0** | **Pedir hoy la auditoría de TikTok** y crear el canal de YouTube y la cuenta de Bluesky | Son los trámites con espera; los demás son de minutos | Ahora, en paralelo |
| **1** | **Base común** (`redes/destinos.mjs`, esqueleto sacado el 17/10; queda en el historial) + **Telegram** | Gratis, sin revisión, sin riesgo; prueba todo el circuito | Semana 1 |
| **2** | **Bluesky** | Gratis, sin revisión; mismo molde | Semana 1 |
| **3** | **YouTube Shorts** | El de más alcance y el único donde el video no caduca; 100 subidas por día de cuota | Semana 2 |
| **4** | **Threads** (con el depósito de videos y la renovación del token) | Mismo público que Instagram; obliga a resolver "guardar un token que cambia", que sirve después para TikTok | Semana 3 |
| **5** | **X** (si les parece bien ~US$ 2 por mes) | Costo chico pero real, con tarjeta | Semana 3 o 4 |
| **6** | **TikTok** cuando la auditoría salga (mientras, a mano 1 o 2 por día) | Depende de TikTok | Cuando haya respuesta |
| — | WhatsApp canal: **a mano**. Pinterest y LinkedIn: **no** | Sin API oficial / sin público / trámite de empresa | — |

**Orden recomendado de las seis automatizadas:** Telegram → Bluesky → YouTube → Threads → X → TikTok (si pasa la auditoría).

Cada red entra primero **una semana en simulación** (`REDES_<RED>` en "No": el robot dice qué
publicaría y no toca nada) y después se prende (`Si`). Como con el resto del proyecto, **se mide cuatro semanas** (alcance, seguidores, visitas
al sitio con las marcas UTM `utm_source=<red>`) y se decide si se queda, se ajusta el horario o se apaga.

## 5. Cronograma: cuándo sale cada reel en cada red

**Principios** (los mismos de `CRITERIO-REDES.md`): cada pieza sale **dentro de su franja** (nada de "buen día" a la tarde); se reutiliza
**el mismo video** de Instagram y Facebook (cero audios nuevos); sale **justo después** de Instagram y Facebook, en la misma corrida del
reloj, **entre 0 y 30 minutos después** de la hora de la tabla (el reloj corre a los :05, :35 y :45); nunca Política ni Policiales (los
repasos ya los excluyen); y el volumen por red está pensado para no parecer un robot: **cuatro por día en las redes de texto, dos o tres en
las de video que quedan**.

**Qué horarios tiene la audiencia de acá.** La muestra propia es chica (17 días, `web/data/estadisticas.json`, visitas por hora de
Balcarce): se ven picos a las **10 a 11**, a las **15 a 16** y de **21 a 23**, con un pico menor a las 8 a 9. Coincide con los horarios de los
tres repasos, que fueron elegidos con ese criterio. **Es una hipótesis para medir, no una certeza**: se rehace con los números de cada red
después de las cuatro semanas.

### 5.1 Qué pieza va a qué red (`va` en `redes/destinos.mjs`)

| Pieza | Hora (Balcarce) | Días | Telegram | Bluesky | Threads | X | YouTube | TikTok |
|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Clima de la mañana | 07:00 | todos | sí (en silencio) | | | | | |
| El feriado | 08:00 | feriados | sí | sí | sí | sí | sí | sí |
| Un día como hoy | 09:00 | todos | sí (en silencio) | sí | sí | sí | sí | sí |
| Repaso de la mañana | 10:00 | todos | **sí (con sonido)** | sí | sí | sí | | |
| Participá / Agenda | 12:00 | lun a vie; la agenda los jueves | sí (en silencio) | | | | agenda: sí | |
| Repaso de la tarde | 15:00 | todos | sí (en silencio) | sí | sí | sí | | |
| Teléfonos útiles | 17:00 | sábados | sí (en silencio) | | | | sí | |
| Farmacia de turno | 19:00 | todos | **sí (con sonido)** | | | | | |
| Clima de la noche | 20:00 | todos | sí (en silencio) | | | | | |
| Repaso del día | 21:00 | todos | **sí (con sonido)** | sí | sí | sí | sí | sí |
| Aviso de clima | cuando se detecta | si hay | sí (con sonido) | | | | | |

Por qué así: **Telegram recibe todo** porque es el canal de lo útil (farmacia, clima, agenda) y no cuesta nada; **Bluesky, Threads y X**
reciben los tres repasos y la efeméride (lo que es "noticia" y "dato del día"); **YouTube y TikTok** reciben sólo lo que **sigue valiendo
mañana** (la efeméride y el repaso de la noche; en YouTube también los útiles y la agenda): un resumen de las 10 de la mañana ya es viejo
cuando un Short se descubre una semana después. Participá se queda en Telegram (invita a mandar noticias por WhatsApp, que es lo local).

### 5.2 La semana completa, por red (Fase 1: se publica a la hora del reel de Meta)

| Hora | Lun | Mar | Mié | Jue | Vie | Sáb | Dom |
|---|---|---|---|---|---|---|---|
| 07:00 | TG clima | TG clima | TG clima | TG clima | TG clima | TG clima | TG clima |
| 08:00 | *(feriado: TG, BS, TH, X, YT, TT)* | | | | | | |
| 09:00 | TG, BS, TH, X, YT, TT efeméride | ídem | ídem | ídem | ídem | ídem | ídem |
| 10:00 | TG, BS, TH, X repaso mañana | ídem | ídem | ídem | ídem | ídem | ídem |
| 12:00 | TG Participá | TG Participá | TG Participá | TG + YT agenda | TG Participá | | |
| 15:00 | TG, BS, TH, X repaso tarde | ídem | ídem | ídem | ídem | ídem | ídem |
| 17:00 | | | | | | TG + YT útiles | |
| 19:00 | TG farmacia | TG farmacia | TG farmacia | TG farmacia | TG farmacia | TG farmacia | TG farmacia |
| 20:00 | TG clima noche | TG clima noche | TG clima noche | TG clima noche | TG clima noche | TG clima noche | TG clima noche |
| 21:00 | TG, BS, TH, X, YT, TT repaso | ídem | ídem | ídem | ídem | ídem | ídem |

*(TG Telegram · BS Bluesky · TH Threads · X · YT YouTube Shorts · TT TikTok.)*

**Volumen por red y por día**

| Red | Un día común | Máximo | Límite de la red | Gasto |
|---|---|---|---|---|
| Telegram | 7 a 8 | 9 | sin tope práctico | 0 |
| Bluesky | 4 | 5 | ~25 videos | 0 |
| Threads | 4 | 5 | 250 | 0 |
| X | 4 | 5 | (sin tope práctico) | ~US$ 1,80 por mes (sin enlace) |
| YouTube | 2 | 4 (jueves con agenda, sábado con útiles, feriado) | 100 subidas | 0 |
| TikTok | 2 | 3 | ~15 | 0 |
| **Audios de voz nuevos** | **0** | **0** | 10 por día (se siguen usando 7 a 9 para Meta) | — |

### 5.3 Horarios propios (Fase 4, sólo si lo justifican los números)

Con la primera versión, todo sale a la hora de Meta. Si después de cuatro semanas los números dicen que otra hora rinde más, el cambio más
lógico es **YouTube y TikTok**: la efeméride a las **12:30** (almuerzo) en lugar de las 9:00, y el repaso de la noche a las **21:15**, y
Threads/X con la efeméride a las **8:30** (viaje al trabajo). Eso exige **guardar el video** hasta su hora (un depósito con la cola, § 7.5) en
vez de repartirlo en la misma corrida. Hoy no hace falta.

## 6. Herramientas y formatos

**ffmpeg ya está** (`ffmpeg-static`). **No hace falta ninguna herramienta nueva**: el video de hoy sirve para las seis redes sin recodificar.

| Dato | Nuestro video | Telegram | Bluesky | YouTube Shorts | Threads | X | TikTok |
|---|---|---|---|---|---|---|---|
| Relación | 9:16 | cualquiera | cualquiera (9:16 ok) | **vertical o cuadrado** | 9:16 recomendado | 9:16 ok | 9:16 |
| Tamaño | 1080 × 1920 | 1080 ok | ok | hasta 1080p | ancho máx. 1920 | ok | ok |
| Duración | 6 a 58 s | libre | 60 s (antes) / 3 min | **hasta 3 min** | hasta 5 min | hasta 20 min | hasta 5 min (según cuenta) |
| Peso | 0,4 a 1,5 MB | 50 MB | 100 MB | 256 GB | 1 GB | 8 GB | según `creator_info` |
| Códec / audio | H.264 + AAC | ok | ok | ok | H.264, 23 a 60 c/s, AAC 48 kHz máx.; **sin "edit lists"** | ok | MP4/H.264 |
| Texto del posteo | `pieDePieza` (largo) | **1.024** | **300** | título **100**, descripción 5.000 | **500** | **280** | ~2.200 |
| Enlaces | con UTM | sí | sí (se marcan aparte) | en la descripción | sí | **no** (cuesta 13 veces más) | no clicables |

- **Subtítulos:** ya están **quemados en la imagen**, así que se leen sin sonido en todas las redes; no hace falta subir archivos de
  subtítulos. Opcional más adelante: derivar un `.srt` del `.ass` que ya genera `reels/reel.mjs` para YouTube.
- **Texto alternativo:** Bluesky pide un texto alternativo del video (accesibilidad) → el título de la pieza.
- **Portada (cover):** hoy se usa la que elige cada red del primer segundo; la entrada animada es de 2,3 s, y la placa queda quieta
  después. Si algún día importa, TikTok acepta `video_cover_timestamp_ms` y YouTube una miniatura aparte (requiere canal verificado).
- **Etiqueta de IA:** TikTok (`is_aigc`) y YouTube (`status.containsSyntheticMedia`) tienen campo propio; en las demás va el aviso en
  texto. Decisión en el § 9.
- **Textos por red:** un único constructor que reciba la pieza y el nombre de la red y devuelva el texto con el largo permitido
  (`pieDePieza(pieza, red)` ya sabe poner la marca UTM por red). Cada cliente **recorta sin cortar palabras ni el aviso de voz**: primero se
  saca la lista de notas del repaso, antes que el aviso.

## 7. Diseño técnico

### 7.1 Principios

1. **Un archivo por red**: `redes/telegram.mjs`, `redes/bluesky.mjs`, `redes/youtube.mjs`, `redes/threads.mjs`, `redes/x.mjs`,
   `redes/tiktok.mjs`. **Sin dependencias externas** (sólo `fetch`, `FormData`, `Blob` y `node:crypto` de Node 24); una prueba vigila que
   `redes/` no importe nada de afuera.
2. **Un contrato común** (`redes/destinos.mjs`, **escrito como esqueleto y sacado el 17/10; queda en el historial de git**): el catálogo (`DESTINOS`), el interruptor por red
   (`destinoPrendido`), las claves que faltan (`faltanClaves`), qué pieza va a qué red (`destinosDeLaPieza`) y el repartidor
   (`publicarEnDestinos`), que **simula por defecto**.
3. **El cliente de cada red cumple una sola función**: `publicarVideo({ video, pieza, pie }) → { id, enlace? }`. No decide *qué* se publica
   (eso es del catálogo) ni cuándo (eso es del reloj y de la ventana de la pieza).
4. **Una red que falla no frena a las otras ni al libro** (reintenta 3 veces en la corrida, anota el problema en `libro.problemas` y sigue).
5. **No se arma nada nuevo**: se reparte el mp4 que ya se armó para Meta. No se toca el cupo de voz.

### 7.2 Dónde se engancha (sin tocar lo que anda)

En `.github/workflows/redes.yml`, **después** del paso "Publicar en Instagram y en la página de Facebook" y **antes** de "Guardar lo
publicado", un paso nuevo:

```yaml
- name: Publicar en las otras redes
  if: always() && steps.armar.outcome == 'success'
  continue-on-error: true          # una falla acá nunca tumba Instagram, Facebook ni el libro
  run: node redes/publicar.mjs --destinos
  env:
    REDES_ACTIVAS: ${{ vars.REDES_ACTIVAS }}
    REDES_TELEGRAM: ${{ vars.REDES_TELEGRAM }}     # una variable por red, todas arrancan en "No"
    TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
    TELEGRAM_CANAL: ${{ vars.TELEGRAM_CANAL }}
    # … las de cada red, a medida que se agregan
```

y en `redes/publicar.mjs` un modo `--destinos` que lee `reels/salida/piezas.json`, arma los clientes de las redes **con claves** y llama a
`publicarEnDestinos`. El libro guarda `libro.destinos[red]["AAAA-MM-DD/pieza"]` (el mismo molde que `facebookVideos`) y se commitea con la línea
`git add web/data/redes.json` que ya existe. El reloj (`redes/reloj.mjs`) **no cambia**: las redes nuevas **siguen** al reel de Instagram.

**Límite conocido de la Fase 1:** el reloj decide qué pieza armar mirando sólo el libro de Instagram. Si una red nueva falla las 3 veces, esa
pieza **no se vuelve a intentar** en las corridas siguientes (el video ya no está armado y rearmarlo gastaría voz). Es aceptable: son copias,
no el contenido principal. Se anota en `libro.problemas` para que se vea. Cuando exista el depósito de videos (§ 7.5), el reintento se hace
desde ahí sin rearmar nada.

### 7.3 Interruptores (como `REDES_ACTIVAS`)

- **Interruptor general:** `REDES_ACTIVAS` sigue mandando: apagado, **nada** sale a ninguna red.
- **Interruptor por red:** una variable de GitHub por red (`REDES_TELEGRAM`, `REDES_BLUESKY`, `REDES_THREADS`, `REDES_X`, `REDES_YOUTUBE`,
  `REDES_TIKTOK`). Una red sale **sólo si** las dos dicen "Si" **y** no falta ninguna clave. En cualquier otro caso **simula** y escribe por
  qué (`falta REDES_ACTIVAS=Si y REDES_X=Si` o `faltan las claves …`), sin tocar el libro.
- Esto permite prender Telegram sin que se entere Threads, y **apagar una sola red** si algo sale mal sin parar Instagram y Facebook.

### 7.4 Secretos y tokens que cambian

| Red | Secretos (GitHub → Secrets) | Variables (GitHub → Variables) | ¿Algo se renueva solo? |
|---|---|---|---|
| Telegram | `TELEGRAM_BOT_TOKEN` | `TELEGRAM_CANAL`, `REDES_TELEGRAM` | No |
| Bluesky | `BLUESKY_USUARIO`, `BLUESKY_CLAVE_APP` | `REDES_BLUESKY` | No (la sesión se abre en cada corrida) |
| YouTube | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` | `REDES_YOUTUBE` | No (el *refresh token* queda igual; el acceso se pide en cada corrida) |
| Threads | `THREADS_TOKEN`, `THREADS_USER_ID`, `THREADS_APP_SECRET` | `VIDEOS_BASE`, `REDES_THREADS` | **Sí: vence a los 60 días** |
| X | `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` | `REDES_X` | No |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REFRESH_TOKEN` | `REDES_TIKTOK` | **Sí: el acceso dura 24 horas y el *refresh token* se renueva** **(sin confirmar los plazos)** |

**El problema de los tokens que cambian (Threads, TikTok).** Un secreto de GitHub no lo puede reescribir el propio workflow sin una
herramienta de cifrado que `node:crypto` no trae (el sobre "sealed box" de GitHub). Hay tres salidas; **se recomienda la primera**:

1. **Guardar el token vigente cifrado en el repositorio**, en un archivo de `web/data/` (el repo es **público**, por eso va cifrado con AES-256-GCM
   y una clave que vive en un secreto, `DESTINOS_CLAVE`). Cada corrida lo abre, lo renueva si le faltan menos de 15 días y lo vuelve a
   guardar. Sin dependencias; la misma idea del cifrado del panel (`panel/cifrado.mjs`), pero con una clave del robot y no una de cada celular.
2. Un valor en el **KV de Cloudflare** (el Worker del vigilante ya tiene uno): más infraestructura, pero separada del repositorio.
3. Un **token de GitHub con permiso de escribir secretos** y cifrado con libsodium: obliga a sumar una dependencia y un permiso muy amplio. **No.**

En cualquiera: el **vigilante** (`redes/vigilar.mjs`, `VENCIMIENTOS`) avisa por WhatsApp si un token de este tipo está a menos de 15 días de
vencer y no se pudo renovar, igual que ya hace con las voces del 29/09/2027.

### 7.5 El depósito de videos (sólo Threads lo necesita hoy)

Threads baja el video de una dirección pública. Las demás redes reciben el archivo directo. La salida más simple es un depósito de
**Cloudflare R2** con dominio propio (`videos.radarbalcarce.com`) y una regla de borrado a los 2 días: el robot sube el mp4 con `wrangler r2
object put` (herramienta y secretos `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` que ya usan "Respaldo" y "Fotos a R2"), publica y lo
borra. El trámite es de una persona (activar el dominio del depósito: "Fotos a R2" ya explica cómo). Lo bueno de armarlo: si más adelante
se quiere publicar **a otra hora distinta** (§ 5.3) o **reintentar** sin rearmar, ya está la cola. Alternativas descartadas: un *release* de
GitHub (la dirección redirige y no queda claro que Threads la siga) y Cloudflare Pages (tiene un tope de 20.000 archivos y ya está al 80 %).

### 7.6 Qué pruebas lleva cada red

- `pruebas/destinos.test.mjs` (**ya escrita**, 13 pruebas): catálogo coherente, el interruptor doble, las claves que faltan, qué pieza va a
  qué red, que apagado **no llama a ningún cliente ni toca el libro**, que una red que falla no frena a las otras, que no se repite ni sale
  fuera de hora, y que una clave muerta corta sólo esa red.
- Una prueba por cliente (`pruebas/telegram.test.mjs`, …), con un `fetch` de mentira como `pruebas/piezas.test.mjs` hace con Meta: arma bien el
  pedido, **limpia el token de los errores**, respeta el largo del texto, y reintenta o corta según el error.
- Una prueba de **documentos contra código** (como las de `redes-criterio.test.mjs`): los secretos de `DESTINOS` aparecen por nombre en
  `docs/08-INFRAESTRUCTURA.md`.
- La prueba existente de "ni `ingesta/`, ni `panel/`, ni `redes/` importan nada de afuera de Node" cubre los archivos nuevos sin cambiarla.

### 7.7 Reglas nuevas propuestas (para anotar en `docs/10-REGLAS-Y-PRUEBAS.md` cuando se implemente; la próxima libre es la 174)

- **174.** Cada red nueva arranca apagada y simulando; sale sólo con `REDES_ACTIVAS` y su interruptor propio en "Si" y con todas sus claves.
- **175.** Una red que falla no frena a Instagram, a Facebook ni a las otras, ni impide guardar el libro.
- **176.** Repartir un video a una red nueva nunca gasta un audio: se reparte el mismo mp4 que se armó para Meta.
- **177.** En las redes nuevas sale lo mismo que ya salió en los reels (nunca Política ni Policiales, nunca una víctima o un menor), con el aviso
  de voz sintética, y **sin enlace en X** mientras el enlace cueste más.

## 8. Riesgos y cómo se cuidan

| Riesgo | Qué puede pasar | Cómo se cuida |
|---|---|---|
| **Cuenta limitada o bloqueada** | Publicar muy seguido o por fuera de la API puede limitar la cuenta | Sólo APIs oficiales; volumen bajo (§ 5.2); cuenta marcada como automatizada en X; **nunca** robots que simulan un navegador |
| **Publicaciones privadas sin auditoría** | TikTok (seguro) y, según fuentes viejas, YouTube dejan los videos privados | Prueba con un video "no listado" antes de prender YouTube; TikTok sólo después de la auditoría o a mano |
| **Token vencido** | Threads a los 60 días, TikTok a los 24 horas, YouTube si la pantalla de consentimiento queda en "Pruebas" (7 días) | § 7.4; el vigilante avisa; checklist de los trámites (§ 3.1) |
| **Plata** | X cobra por posteo; un enlace en el texto lo multiplica por 13 | Sin enlaces en X, tope de gasto en la consola, recarga automática apagada |
| **Tokens a la vista** | El repositorio es público | Todo secreto en GitHub; lo que se renueva, cifrado; ningún token en la dirección sin limpiar (Telegram) |
| **Lo editorial** | Algo sensible llegando a una red nueva sin revisión | Las redes nuevas sólo reciben lo que ya pasó por el criterio de los reels; Política y Policiales no están en ningún repaso |
| **Duplicados** | Una pieza que sale dos veces | El libro (`libro.destinos`), el candado `concurrency: redes` y que la red decida por la clave `día/pieza` |
| **Cambios de las plataformas** | X y Meta cambian precios y permisos seguido | Cada cliente es un archivo chico y aislado; el interruptor por red permite apagar una sola; la auditoría semanal de formatos (`FORMATOS.md`) se extiende a las redes nuevas |
| **Transparencia** | La voz es sintética | Aviso de voz en el texto de todas; etiquetas de IA propias donde existen (§ 9) |
| **Tiempo de Actions** | Más pasos en cada corrida | El paso nuevo sólo corre si hay piezas; los videos pesan 1 MB; se estima menos de 1 minuto extra por corrida con piezas |

## 9. Decisiones para Hernán y Andrés, y lo que no pude confirmar

**Decisiones**
1. ¿Se anima a empezar por **Telegram + Bluesky + YouTube** (todo gratis y sin tarjeta)?
2. ¿**X** a ~US$ 2 por mes, con una tarjeta cargada y tope de gasto? (Es la única que cuesta plata.)
3. ¿Se **pide la auditoría de TikTok** ya, sabiendo que puede ser rechazada y que mientras tanto se sube a mano?
4. **Etiquetas de IA:** ¿marcar `is_aigc` (TikTok) y `containsSyntheticMedia` (YouTube) en verdadero? Recomiendo que sí, por la misma razón por
   la que el aviso de la voz está en el texto.
5. ¿Quieren un **canal de WhatsApp** manejado a mano (repaso de la mañana y de la noche)?
6. ¿**Mismo horario que Meta** (Fase 1) o ya con horarios propios para YouTube y TikTok (Fase 4)? Recomiendo empezar igual y medir.

**Lo que no pude confirmar en una fuente oficial (revisar al implementar)**
- Si el YouTube de hoy deja **públicos** los videos de un proyecto sin auditar (la página oficial dice que sí; los blogs, que no).
- Los pasos exactos de la subida de video de **Bluesky** (la página del tutorial oficial no cargó).
- Si **X** acepta OAuth 1.0a para la subida de medios v2 y si el dominio pelado cuenta como enlace en el cobro.
- El costo de la **subida de medios en X** (no figura en la página de precios).
- Si TikTok exige auditoría para el camino **"Upload a borradores"**, y los **criterios reales** de la auditoría (qué tan rechazable es una
  herramienta de una sola cuenta); los plazos de 2 a 6 semanas son de guías de terceros.
- Los **plazos de los tokens** de TikTok y el menú exacto para aceptar la invitación de tester en Threads.
- Si **WhatsApp** anunció algo para Canales en 2026.
- Los **precios vigentes de R2** (almacenamiento y operaciones) para confirmar que alcanza el plan gratis.
- Si las **"edit lists"** de ffmpeg le molestan a Threads con nuestros videos (se ve en la primera prueba).

## 10. Fuentes (leídas el 15/10/2026)

- TikTok, Content Posting API (empezar): https://developers.tiktok.com/doc/content-posting-api-get-started
- TikTok, reglas de uso (consentimiento, límites, auditoría): https://developers.tiktok.com/doc/content-sharing-guidelines
- TikTok, referencia de publicación directa (errores, `is_aigc`, límites): https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- TikTok, subir a borradores: https://developers.tiktok.com/doc/content-posting-api-reference-upload-video
- YouTube, `videos.insert`: https://developers.google.com/youtube/v3/docs/videos/insert
- YouTube, cuota y auditoría: https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits
- YouTube, historial de cambios (cuota de subida bajó el 4/12/2025; balde propio desde el 1/6/2026): https://developers.google.com/youtube/v3/revision_history
- YouTube, recurso `videos` (`containsSyntheticMedia`): https://developers.google.com/youtube/v3/docs/videos
- YouTube, Shorts de hasta 3 minutos: https://support.google.com/youtube/answer/15424877
- Google, vencimiento de *refresh tokens* (7 días en "Pruebas"): https://developers.google.com/identity/protocols/oauth2
- Threads, publicar: https://developers.facebook.com/docs/threads/posts
- Threads, empezar (roles de tester, tokens de 60 días): https://developers.facebook.com/docs/threads/get-started
- Threads, tokens de larga duración: https://developers.facebook.com/docs/threads/get-started/long-lived-tokens/
- X, precios de la API (pago por uso): https://docs.x.com/x-api/getting-started/pricing
- X, subida de video en pedazos: https://docs.x.com/x-api/media/quickstart/media-upload-chunked
- Bluesky, video (límites, correo verificado): https://bsky.social/about/blog/09-11-2024-video
- Bluesky, tutorial de video: https://docs.bsky.app/docs/tutorials/video
- Bluesky, límites de subida de la cuenta: https://docs.bsky.app/docs/api/app-bsky-video-get-upload-limits
- Telegram, Bot API: https://core.telegram.org/bots/api
- Telegram, preguntas frecuentes (límites de envío y de archivos): https://core.telegram.org/bots/faq
- WhatsApp, Canales (a mano): https://www.whatsapp.com/channels — y, sobre la falta de API, guía de 360dialog:
  https://docs.360dialog.com/docs/whatsapp-marketing/driving-users-to-your-whatsapp-account/whatsapp-channels
- Pinterest, niveles de acceso: https://developers.pinterest.com/docs/key-concepts/access-tiers/
- LinkedIn, Videos API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api
- LinkedIn, Community Management API (niveles Desarrollo y Estándar): https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview

**Enlaces de los trámites (§ 3.1):** @BotFather https://t.me/BotFather · Bluesky https://bsky.app y https://bsky.app/settings/app-passwords ·
YouTube https://www.youtube.com/create_channel · Google Cloud https://console.cloud.google.com/apis/credentials/consent ·
API de YouTube https://console.cloud.google.com/apis/library/youtube.googleapis.com · Meta para desarrolladores https://developers.facebook.com/apps/ ·
X https://console.x.com · TikTok https://developers.tiktok.com · WhatsApp Canales https://www.whatsapp.com/channels. El formulario de auditoría y
ampliación de cuota de YouTube API Services se llega desde la página de cuota y auditoría de arriba (el enlace del formulario cambia: entrar
desde ahí).

Relacionado: `docs/07-REDES.md`, `docs/propuestas/CRONOGRAMA-REDES.md`, `CRITERIO-REDES.md`, `PERFILES.md`, `FORMATOS.md`,
`docs/08-INFRAESTRUCTURA.md`, `redes/destinos.mjs`.
