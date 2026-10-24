# Automatizar TikTok, YouTube, X, Threads y el canal de WhatsApp: alternativas

*15/10/2026. Es una **investigación**, no código: no se creó ninguna cuenta, no se pidió ni se escribió ninguna clave, no se publicó nada. Se leyó la documentación
oficial y las páginas de precios de cada servicio el 15/10/2026. Lo que viene de blogs de terceros (casi siempre de la competencia) o que no se pudo leer
está marcado **(sin confirmar)**. Complementa a `docs/redes/PLAN-REELS-OTRAS-REDES.md` y corrige un punto suyo (el de la auditoría de TikTok, § 2).*

## 0. Resumen para Hernán y Andrés

1. **Telegram, Bluesky, Threads y X se pueden automatizar con la API propia, sin pagar un servicio** (X cuesta unos US$ 2 por mes de la API). Eso ya estaba en el plan; no cambia.
2. **YouTube Shorts también, con la API propia y gratis**, pero hay **una duda que se resuelve con una prueba de 5 minutos**: si los videos suben públicos o quedan forzados a privado (§ 3.2). Si quedaran privados, hay plan B pagando poco.
3. **TikTok es el problema.** Las reglas de TikTok para su API **dicen expresamente que no se permite** "una herramienta para subir contenido a las cuentas que vos o tu equipo manejan". Nuestro robot es exactamente eso. **Pedir nuestra propia auditoría tiene muy pocas chances** (esto corrige lo que decía el plan anterior). La salida real es **usar un servicio de terceros que ya pasó la auditoría** (Buffer, por ejemplo: US$ 0 a 5 por mes, tiene API) o **dejar el video en el borrador de TikTok y tocar "publicar" desde el celular**.
4. **El canal de WhatsApp no tiene ninguna vía oficial** para publicar con un programa. Las vías "no oficiales" (Whapi, WAHA, Baileys) usan el número del medio con un truco que **WhatsApp prohíbe en sus términos**: riesgo de perder el número. **Se hace a mano** (20 segundos) con el video ya listo.
5. **Hacerlo con "la PC prendida" (una IA manejando el navegador) es posible, pero no lo recomiendo**: es frágil, no anda con la PC apagada o bloqueada, y TikTok y WhatsApp prohíben justamente eso en sus términos. Con TikTok y WhatsApp hay riesgo real de perder la cuenta o el número.
6. **Recomendación en una línea:** API propia para Telegram, Bluesky, YouTube, Threads y X (≈ US$ 2 por mes); **TikTok vía Buffer** (probar primero el plan gratis; si no alcanza, US$ 5 por mes por un solo canal); **WhatsApp a mano** con el video listo en Telegram. **Costo total: entre US$ 2 y US$ 8 por mes.**

## 1. Cómo leer esto: qué quiere decir "automático"

Hay cuatro niveles, de más a menos cómodo:

| Nivel | Qué es | Ejemplo |
|---|---|---|
| **A. Automático con API propia** | El robot (GitHub Actions) le habla directo a la red. Sin intermediario, con la PC apagada. | Telegram, Bluesky |
| **B. Automático por un servicio de terceros** | El robot le manda el video a un servicio (Buffer, Publer…) y éste lo publica con su "app aprobada". Se paga o se usa el plan gratis. | TikTok vía Buffer |
| **C. Semiautomático** | El robot deja el video listo (en el borrador de TikTok, en Telegram, en un enlace de descarga) y una persona toca "publicar" desde el celular. | WhatsApp canal; TikTok si falla B |
| **D. Una IA que maneja el navegador de la PC** | Hay que tener la PC prendida y con la sesión abierta; imita a una persona. | No recomendado (§ 5) |

## 2. Lo más importante que encontré: TikTok y su auditoría

- Hasta que TikTok audita la aplicación, **todo lo que publica la API queda en privado ("solo yo")** y como mucho 5 usuarios por día, con la cuenta en privado
  (reglas de uso de TikTok, leídas hoy; actualizadas el 4/8/2026).
- Las mismas reglas, en la sección de usos previstos, dicen que la API debe servir "a un público amplio", "no limitarse a aplicaciones de prueba ni a grupos
  internos o uso privado", y enumeran como **uso NO permitido**: *"A utility tool to help upload contents to the account(s) you or your team manages."*
  Es decir: **un robot propio que sube videos a la cuenta propia es lo que TikTok dice que no quiere**. El plan anterior (`PLAN-REELS-OTRAS-REDES.md`, § 2.6)
  recomendaba "pedir la auditoría igual"; con esta frase leída, **la probabilidad de aprobación es baja** y conviene no contar con ella (sin confirmar el criterio
  real del revisor; hay un caso publicado en GitHub de un usuario de Postiz autoalojado rechazado por "no seguir las guías de experiencia de usuario").
- Además, las reglas de experiencia piden que **una persona elija a mano la privacidad y los permisos de comentarios en cada video y dé su consentimiento**, sin
  valores por defecto. Una publicación 100 % automática desde una app propia choca con eso.
- **¿Cómo publican entonces los servicios?** Tienen su propia app, que sí pasó la auditoría (para un servicio que atiende a miles de usuarios, el uso "público
  amplio" se cumple). Blotato lo dice expresamente; Buffer publica "público por defecto" según su ayuda. Nosotros usaríamos **su** app, no la nuestra.
- **El camino "Subir a borradores"** (permiso `video.upload`): el video llega al buzón de TikTok y la persona lo termina de publicar. Un blog de terceros dice que
  tiene "una vara de aprobación más baja" (sin confirmar). Servicios como Buffer ("Avisame", `Notify Me`), Upload-Post (`MEDIA_UPLOAD`) y Blotato (`isDraft`) lo ofrecen.

## 3. Red por red: qué hay hoy

### 3.1 Resumen

| Red | Con API propia (nivel A) | Con servicio de terceros (nivel B) | Mejor vía hoy |
|---|---|---|---|
| **Telegram** | Sí, gratis, sin revisión | Innecesario (Publer y otros lo soportan; Buffer **no**) | **A** |
| **Bluesky** | Sí, gratis | Buffer, Publer, Metricool, Upload-Post | **A** |
| **Threads** | Sí, gratis, hace falta un depósito de videos con enlace público (R2) y renovar el token cada 60 días | Buffer, Publer, Metricool | **A** |
| **X** | Sí, ~US$ 2 por mes (pago por uso; US$ 0,015 por posteo sin enlace, US$ 0,20 con enlace) | Buffer y Publer (el plan gratis de Publer **no** incluye X) | **A** |
| **YouTube Shorts** | Sí, gratis, cuota de 100 subidas por día; **dudas sobre si salen públicos** (§ 3.2) | Buffer, Publer, Metricool | **A**, con plan B de terceros |
| **TikTok** | Sólo privado hasta una auditoría que probablemente no aprueben (§ 2) | **Sí: Buffer, Publer, Blotato, Upload-Post** | **B** (o C) |
| **WhatsApp canal** | **No existe** | Sólo "no oficiales" con riesgo de perder el número | **C (a mano)** |

### 3.2 YouTube: la duda de "privado o público"

- La página oficial de `videos.insert` (leída hoy) dice: *"Videos uploaded from unverified API projects are not restricted to private viewing mode"* y
  que cada subida gasta 1 unidad de un balde de 100 por día.
- Pero varios blogs de desarrolladores, algunos con fecha de septiembre de 2026, dicen que **el aviso de "privado" sigue vigente** para proyectos creados
  después del 28/7/2020 y que la llamada responde "ok" igual (el video queda privado sin error).
  **No pude resolver la contradicción leyendo**: queda **(sin confirmar)**. Se resuelve subiendo un video de prueba como "no listado" y mirando en YouTube
  Studio si se puede pasar a público. Si estuviera forzado a privado, hay dos salidas: el formulario de auditoría de YouTube API Services (gratis, tarda semanas)
  o usar Buffer/Publer, que ya tienen su proyecto verificado.

### 3.3 WhatsApp canal (lo que se pidió confirmar)

- **Documentación oficial de Meta:** la página de la Cloud API (`developers.facebook.com/docs/whatsapp/cloud-api/overview`, leída hoy) lista tres cosas:
  **mensajes** (texto, medios, interactivos), **llamadas** y **grupos**. **No menciona Canales (newsletters).** Los mensajes fuera de la ventana de atención son
  sólo **plantillas aprobadas**, con consentimiento previo de cada persona, dirigidas a **contactos**. Eso es lo que usa un banco para avisarte un pago: no sirve
  para un canal abierto al que cualquiera se suma. **Confirmado: la Cloud API no es un camino para publicar en un Canal.** (Ojo: "no aparece en la documentación" no
  es lo mismo que "Meta dijo que nunca": no encontré ningún anuncio de 2026 sobre una API de Canales, pero conviene mirar el *changelog* de Meta antes de
  cerrar el tema.)
- **Vías no oficiales:** Whapi.Cloud y WAHA (autoalojado) publican en canales conectando **el número por código QR**, igual que WhatsApp Web; hay también
  automatizaciones que copian un canal de Telegram a uno de WhatsApp (Botize + Whapi). **Los términos de WhatsApp** (leídos hoy) prohíben "mensajes masivos,
  automáticos y similares", el "uso no personal" sin autorización, el acceso "por medios automatizados" y la ingeniería inversa, y dicen que pueden suspender o cerrar la
  cuenta. Es decir: **riesgo real de perder el número 2266 51-1612**, que es la vía de contacto del medio. No se recomienda ni con un número secundario, porque el
  canal queda atado a quien lo creó.
- **Alternativas válidas:**
  - **Telegram como canal "oficial" automático** y, en WhatsApp, un **post a mano** del mejor del día con el enlace de Telegram/YouTube/la web.
  - **Listas de difusión de WhatsApp**: sólo llegan a quienes tienen guardado el número del medio; no tienen API; no sirven para crecer.
  - **Comunidades/grupos**: también a mano; la Cloud API ahora tiene API de "Grupos" (sin confirmar condiciones y costo; no es lo mismo que Canales).
  - **WhatsApp Business Platform con plantillas** a contactos que se anotaron (opt-in): es oficial, pero se paga por conversación (sin confirmar el valor
    vigente en Argentina) y hay que armar la lista de suscriptores. Se puede estudiar más adelante si hubiera 500 o más suscriptores. Hoy no.

## 4. Los servicios de terceros, uno por uno

Precios leídos de la página oficial cuando se pudo; el resto, de terceros **(sin confirmar)**. "Evita la auditoría": la app del servicio ya está auditada, así que
publica en público sin que nosotros tengamos que auditar nada.

| Servicio | Redes que importan | API para que el robot mande el video | Precio | Evita la auditoría de TikTok | Notas y riesgos |
|---|---|---|---|---|---|
| **Buffer** | TikTok, YouTube (Shorts), Threads, X, Bluesky. **Telegram: no.** | **Sí, en todos los planes** (GraphQL; clave personal). Gratis: 1 clave, 100 pedidos/15 min, 250/día, 3.000/mes. **Hay que alojar el video en un enlace público** (no sube archivos): sirve el depósito R2 del plan | Gratis: 3 canales, 10 posteos en cola por canal. Essentials: **US$ 5 por canal por mes** (US$ 60 al año). Team: US$ 10 | **Sí** (su ayuda dice "publica en público por defecto"; modo "Avisame" para terminar a mano) | Es el más conocido y estable. Por TikTok: 25 posteos por día, hashtags ≤ 5, la ayuda aclara que publicar muchas veces por API puede dar videos con "cero vistas" (conviene 1 a 3 por día). **TikTok en el plan gratis: sin confirmar** (la ayuda habla de "planes nuevos"). Que la **API publique video a TikTok**: sin confirmar (un blog de 2026 dice que sí; probar en la prueba gratis de 14 días) |
| **Publer** | TikTok, YouTube, Threads, X, Bluesky, **Telegram** | **Sí, sólo plan Business** (API REST; sube el archivo directo, hasta 200 MB, o por enlace). 100 pedidos cada 2 minutos | Gratis: 3 cuentas, **sin X**, 10 posteos en cola, historial de 24 h, **sin API**. Professional desde **US$ 5** por mes (1 cuenta); **Business desde US$ 10 por mes** (1 cuenta; cada cuenta extra suma US$ 4 a 7, sin confirmar) | Sin confirmar (no pude leer si su app de TikTok es auditada) | La más barata con API que sube el archivo directo y soporta casi todo, incluso Telegram. Los blogs traen precios distintos (US$ 12 y 21): mirar el sitio |
| **Postiz** (código abierto, AGPL) | TikTok, YouTube, X, Threads, Bluesky, Telegram y más (32 a 34) | Sí, API pública en todos los planes (clave; sube el archivo y crea el posteo). 90 pedidos por hora | **Nube:** US$ 29 por mes (5 canales; US$ 23 al año), prueba de 7 días. **Autoalojado:** gratis, pero pide un servidor siempre prendido de 4 GB de RAM mínimo y un dominio con HTTPS | **Nube: sin confirmar** si su app de TikTok es auditada. **Autoalojado: no**, hay que auditar la app propia (y vale lo del § 2) | Autoalojar contradice el principio de este proyecto (todo andando con la PC apagada, sin servidores propios). Hay reportes de TikTok trabado en la nube desde marzo de 2026 (sin confirmar si se arregló) |
| **Metricool** | TikTok, YouTube, Threads, Bluesky (en el plan gratis); X como complemento pago | La API sólo en el plan **Advanced** (desde €43 por mes con pago anual) | Gratis: 1 marca, **20 posteos por mes**. Starter desde €16 | Sin confirmar | La API cuesta demasiado para lo que hace. **Descartado** |
| **Blotato** | TikTok, YouTube, Instagram, Facebook, X, Threads, Bluesky, LinkedIn, Pinterest (**sin Telegram**) | Sí, desde el plan Starter (no en la prueba de 7 días) | **US$ 29 por mes** (Starter) | **Sí** (dice expresamente que su app pasó la auditoría; también tiene modo "borrador") | En Starter: 3 cuentas de TikTok, 10 posteos por cuenta por día. Pide 4 semanas de "uso humano" antes de conectar una cuenta. Caro para lo que se necesita |
| **Upload-Post** | TikTok, YouTube, Threads, X, Bluesky, **Telegram** (22 redes) | Sí (REST, SDK de Node), **con plan gratis sin tarjeta** | Plan gratis; precios de pago: sin confirmar | Sin confirmar (recomienda el modo "borrador" para TikTok) | Servicio chico y joven: mayor riesgo de que cambie o cierre. Para probar, sirve |
| **Zernio (ex Late)** / **PostProxy** | TikTok, YouTube, X, Threads, Bluesky, Telegram | Sí (API) | Zernio: **2 cuentas gratis**; de la 3.ª a la 10.ª, US$ 6 cada una. PostProxy: plan gratis, precios sin confirmar | Sin confirmar | Misma advertencia que Upload-Post: servicios nuevos |
| **Ayrshare** | 13 a 14 redes | Sí, es lo más "para programadores" | **US$ 149 por mes** (Premium) | Sin confirmar | **Descartado** por precio |
| **Hootsuite** | Sí, varias | Sin confirmar | Desde US$ 99 por usuario por mes | Sin confirmar | **Descartado** por precio |
| **Later** | Instagram, Facebook, TikTok, Threads, YouTube Shorts… **sin X ni Bluesky** (sin confirmar) | Sin confirmar (un blog dice que ningún plan da API) | Desde US$ 25 por mes, sin plan gratis | Sin confirmar | **Descartado** |
| **Repurpose.io** | Mueve videos de una red a otras (p. ej. de Facebook/Instagram a TikTok y YouTube) | No es API: se configura por la web | Entre US$ 25 y 35 por mes según el blog (sin confirmar) | Sin confirmar | Podría "copiar" nuestros reels de Facebook a TikTok y YouTube sin tocar código, pero cuesta más que Buffer. Plan C |
| **Zapier / Make / n8n** | Telegram, YouTube, Bluesky tienen módulo propio; Threads sólo por HTTP; **TikTok no tiene módulo de publicación** | Son "pegamento", no publican solos en TikTok: terminan llamando a Buffer, Publer, etc. | Zapier/Make: planes desde ~US$ 10 por mes; n8n autoalojado gratis (licencia "uso sostenible") | No | **No suman nada**: GitHub Actions ya hace de pegamento gratis |

**Qué quiere decir "evita la auditoría" y cuál es el costo escondido (dependencia):** el servicio publica con *su* aplicación. Si el servicio cambia precios,
cierra o TikTok le baja la app, hay que cambiar de servicio. Es un riesgo chico si el robot guarda siempre el mp4 y el texto (ya lo hace durante 3 días) y el
cliente de cada red es un archivo aislado (el esqueleto `redes/destinos.mjs` que lo preveía se sacó el 17/10; queda en el historial de git). Y **todos publican con la PC apagada**, porque corren en sus servidores.

**Riesgo de términos con un servicio de terceros:** publicar por la API de un servicio aprobado **cumple** las reglas de TikTok, YouTube, X y Threads (usa canales
oficiales). El riesgo es otro: el contenido automático de poco valor o repetitivo puede recibir **menos alcance** en TikTok (Buffer misma lo advierte), pero no
baneo por el método.

## 5. Con la PC prendida: un script o una IA que maneja el navegador

**Posible, sí. Recomendable, no.**

- **Qué se necesitaría:** la PC prendida, **sin suspenderse y con la sesión de Windows abierta y desbloqueada** (un navegador no puede abrir una pantalla bloqueada);
  una sesión de cada red ya iniciada (con la verificación en dos pasos resuelta una vez); un script de Playwright, o una IA manejando Chrome (Claude en Chrome)
  o la pantalla (computer use); y una **tarea programada de Windows** (Programador de tareas: acción "iniciar un programa", desencadenador por hora, "ejecutar
  sólo cuando el usuario haya iniciado sesión", "activar la PC para ejecutar esta tarea" y "ejecutar lo antes posible si se perdió el inicio programado").
- **Qué tan frágil es:** mucho. Cada cambio de diseño de TikTok Studio, YouTube Studio o WhatsApp Web rompe el script; las sesiones vencen o piden volver a
  entrar; aparecen captchas y avisos de "¿sos vos?"; una IA que maneja el navegador es más flexible, pero más lenta, gasta cupo y puede equivocarse de botón.
  Hay que mirarlo todos los días.
- **Si se apaga la PC (o se bloquea, se corta la luz, Windows se actualiza):** esa pieza **no sale**, y el robot en la nube no se entera. Es lo contrario de la regla del
  proyecto ("andan con la PC apagada"). Habría que armar un aviso al celular de lo que no salió.
- **Riesgo con los términos:**
  - **TikTok** (términos de servicio, sec. 5, leídos hoy): prohíben "usar scripts automatizados para recopilar información o interactuar con los Servicios",
    el uso comercial sin consentimiento por escrito y esquivar sus medidas de control. Es la vía que más cuentas pierde. **No.**
  - **WhatsApp** (términos, leídos hoy): prohíben mensajes masivos o automáticos, el uso no personal sin autorización y el acceso automatizado. Si se
    maneja WhatsApp Web con un script o una IA, es lo mismo que Whapi/WAHA: puede costar el número. **No.**
  - **X, YouTube:** sus reglas de automatización piden usar la API; no pude leer la página de X (error 403) ni la de YouTube **(sin confirmar)**. Y como ya hay API
    propia en ambas, no hay motivo para el navegador.
- **Lo único defendible:** una **persona sentada** usando a Claude en Chrome como ayudante para completar el formulario, y tocando ella misma "publicar".
  Eso es "a mano con ayuda", no automatización, y aun así TikTok pide que el usuario elija la privacidad cada vez. Sirve para TikTok si falla el nivel B.

## 6. Recomendación, red por red

| Red | Vía hoy | Costo por mes | Por qué | Plan B |
|---|---|---|---|---|
| **Telegram (canal)** | A. API propia | 0 | Gratis, sin revisión, sin riesgo. Todo el circuito se prueba ahí | — |
| **Bluesky** | A. API propia | 0 | Gratis, sin revisión | Upload-Post/Publer |
| **YouTube Shorts** | A. API propia, **tras la prueba del § 3.2** | 0 | El de más alcance y el video no caduca | Buffer Essentials (US$ 5) si quedan privados |
| **Threads** | A. API propia + depósito R2 | 0 | Misma gente que Instagram; ya está en el plan | Buffer gratis (3 canales) |
| **X** | A. API propia, sin enlace en el texto | ~US$ 2 | Casi gratis con tope de gasto | No publicar en X |
| **TikTok** | **B. Buffer** (probar el plan gratis; si no deja, Essentials con 1 canal) | 0 a 5 | Su app está auditada; modo automático o "Avisame" | Publer Business (US$ 10) o Upload-Post, o **C: borrador + tocar publicar** |
| **WhatsApp canal** | **C. A mano** con el video listo | 0 | Sin vía oficial; los términos prohíben automatizar | Publicar el enlace de Telegram/YouTube una vez por día |

**Costo mensual total: entre US$ 2 y US$ 8** (X ~US$ 2; TikTok vía Buffer 0 a 5; el resto, 0). El depósito R2 está dentro del plan gratis (sin confirmar tabla vigente).
Sin X y con Buffer gratis: **US$ 0**.

### 6.1 Plan por etapas

| Etapa | Qué | Quién | Cuánto lleva |
|---|---|---|---|
| **0 (hoy)** | **No pedir la auditoría propia de TikTok** (sale de la lista del plan anterior). Crear el canal de YouTube y la cuenta de Bluesky | Hernán/Andrés | 1 hora en total |
| **1 (semana 1)** | Telegram y Bluesky, siguiendo `PLAN-REELS-OTRAS-REDES.md` (simulación una semana, después "Si"). **Ya queda armado un lugar a donde mandar el video para el WhatsApp a mano**: el canal de Telegram (o un chat privado de Telegram) con el mp4 y el texto | Claude | 1,5 días |
| **2 (semana 2)** | YouTube: **primero la prueba de "no listado → público"**; si anda, cliente propio; si no, Buffer | Claude + Hernán (autorizar una vez) | 1 día |
| **3 (semana 3)** | Threads (con R2 y renovación del token) y, si les parece, X | Claude | 3 días |
| **4 (semana 3 o 4)** | **TikTok vía Buffer**: abrir cuenta de Buffer con el mail del medio (lo hace una persona; el robot no crea cuentas), conectar `@radarbalcarce`, generar la clave de API (la pega una persona en GitHub Secrets), ensayar 3 días con "Avisame" y después pasar a automático | Hernán/Andrés + Claude | 1 día + 14 días de prueba gratis |
| **5 (siempre)** | WhatsApp canal a mano: el robot manda el video y el texto al celular por Telegram; ustedes reenvían al canal (sin confirmar si el menú de compartir de WhatsApp permite elegir un canal propio; si no, se descarga el video y se sube desde el canal) | Hernán/Andrés | 20 segundos por repaso |
| **6 (a los 2 meses)** | Medir (alcance, seguidores, visitas con UTM) y decidir qué red se queda. Revisar si Meta anunció algo para Canales | Todos | — |

## 7. Decisiones para Hernán y Andrés

1. ¿Aceptan **no pedir la auditoría propia de TikTok** y usar **Buffer** (empezando con el plan gratis) para esa red?
2. ¿Aceptan que el **canal de WhatsApp sea a mano** y que el robot sólo deje el video y el texto listos en Telegram?
3. Para X: ¿US$ 2 por mes con tarjeta y tope de gasto, o se deja afuera?
4. ¿Les parece bien probar YouTube con un video "no listado" antes de definir si va por API propia?

## 8. Fuentes (leídas el 15/10/2026)

**Oficiales o del propio servicio**
- TikTok, reglas de uso de la API (usos permitidos y no permitidos, auditoría, límites): https://developers.tiktok.com/doc/content-sharing-guidelines
- TikTok, referencia de publicación directa: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- TikTok, términos de servicio (automatización, uso comercial): https://www.tiktok.com/legal/page/row/terms-of-service/en
- WhatsApp, términos de servicio: https://www.whatsapp.com/legal/terms-of-service
- Meta, WhatsApp Cloud API (mensajes, llamadas, grupos; sin Canales): https://developers.facebook.com/docs/whatsapp/cloud-api/overview
- Threads, empezar (tester, token de 60 días): https://developers.facebook.com/docs/threads/get-started
- X, precios de la API: https://docs.x.com/x-api/getting-started/pricing
- YouTube, `videos.insert`: https://developers.google.com/youtube/v3/docs/videos/insert
- YouTube, cuota y auditorías: https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits
- Buffer, precios: https://buffer.com/pricing
- Buffer, qué es la API (todos los planes, límites, video por enlace): https://support.buffer.com/en-us/articles/what-is-buffers-api-GtIYIQilz5
- Buffer, usar TikTok (automático o "Avisame", límites): https://support.buffer.com/en-us/articles/using-tiktok-with-buffer-oGEroY9Of2
- Buffer, guía para alojar medios de la API: https://developers.buffer.com/guides/hosting-media.html
- Publer, documentación de la API (sólo Business y Enterprise): https://publer.com/docs/overview
- Publer, planes y precios (ayuda): https://publer.com/help/en/article/what-are-publers-plans-and-pricing-15h4yqh/
- Postiz, precios de la nube: https://postiz.com/pricing
- Postiz, API pública: https://docs.postiz.com/public-api/introduction
- Postiz, TikTok: https://docs.postiz.com/providers/tiktok.md
- Metricool, precios: https://metricool.com/pricing/
- Blotato, precios: https://www.blotato.com/pricing y TikTok: https://www.blotato.com/api/tiktok
- Ayrshare, precios: https://www.ayrshare.com/pricing.md
- Upload-Post: https://www.upload-post.com/
- Zernio, precios: https://zernio.com/pricing
- PostProxy: https://postproxy.dev/

**De terceros (leer con cuidado, muchos venden una alternativa)**
- Auditoría de TikTok, plazos y rechazos comunes: https://bundle.social/blog/tiktok-api-approval
- Postiz, rechazo de un usuario autoalojado: https://github.com/gitroomhq/postiz-app/issues/1362 · cola trabada en la nube: https://github.com/gitroomhq/postiz-app/issues/1338
- WhatsApp Canales por API no oficial (Whapi): https://whapi.cloud/blog/whatsapp-channel-api-automation · (WAHA): https://waha.devlike.pro/whatsapp-channels · riesgos: https://www.bot.space/blog/whatsapp-api-vs-unofficial-tools-a-complete-risk-reward-analysis-for-2025
- YouTube, restricción de "privado" según desarrolladores: https://www.upload-post.com/youtube-api/ y https://postproxy.dev/blog/automate-youtube-uploads/
- Hootsuite y Later (precios): https://www.socialpilot.co/blog/hootsuite-pricing y https://www.saaspricepulse.com/tools/later
- Repurpose.io (precios): https://www.creatorstackclub.com/software/repurpose-io/pricing
- Zapier y Make sin módulo de publicación de TikTok: https://community.zapier.com/how-do-i-3/posting-videos-across-multiple-accounts-23495 y https://community.make.com/t/why-i-don-t-have-a-tiktok-module/72300
- Make, módulos de Telegram, YouTube y Bluesky: https://www.make.com/en/help/apps/communication/tiktok (TikTok) y https://make.com/en/help/app/bluesky
- n8n, licencia de uso sostenible: https://www.ssdnodes.com/learn/n8n-sustainable-use-license-explained

## 9. Lo que no pude confirmar

- Si el **plan gratis de Buffer** deja programar a TikTok, y si su **API** publica video a TikTok (solo un blog de 2026 lo dice; probar en la prueba de 14 días).
- Si la **aplicación de TikTok de Publer, Postiz (nube) y Upload-Post** está auditada (sólo Blotato y Buffer lo dicen o lo dejan ver).
- Si YouTube **deja público** lo que sube un proyecto sin verificar (las fuentes se contradicen: § 3.2).
- Si Meta **anunció algo para Canales de WhatsApp** (la documentación de la Cloud API de hoy no lo menciona; revisar el *changelog*).
- Costo y condiciones de la **API de Grupos** de WhatsApp y valor por conversación en Argentina.
- Los términos de **X y YouTube** sobre automatización por navegador (no se pudieron leer).
- Precios exactos de **Publer** (la ayuda dice US$ 5 y 10; los blogs, 12 y 21), **Upload-Post**, **PostProxy** y **Repurpose.io**.
- Los precios vigentes de **R2** (almacenamiento y operaciones).
- Si el menú "compartir" de WhatsApp permite elegir un **canal propio** desde un video recibido por Telegram.
