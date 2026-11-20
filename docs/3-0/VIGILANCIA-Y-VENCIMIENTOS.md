# Vigilancia y vencimientos de Radar 3.0

*Escrito el 17/11/2026. Todo lo que dice «verificado» se miró ese día en el código, en `gh` (sólo lectura, cuenta `radarbalcarce`) o en el `/salud` público del núcleo. Lo que no se pudo ver, está marcado así. El detalle técnico de la vigilancia está en `v3/vigilancia/REGLAS.md`.*

## 1. Qué vigila hoy la vigilancia (cada 30 minutos)

| Qué mira | Cuándo avisa |
|---|---|
| El **núcleo** hizo una vuelta | Pasaron más de 40 minutos sin vuelta (tendría que hacer una cada 15) |
| El **núcleo contesta** y **publica** (`publicando`) | No contesta en dos chequeos seguidos; o está en modo prueba (nuevo, 17/11) |
| **Redacción** | 12 notas o más esperando redactarse durante una hora; el tope de pedidos de IA llegó al 80 % del día; el gasto de IA llegó al 80 % del freno del mes |
| **Fuentes** | Una fuente falla hace 3 días seguidos (si nunca anduvo, a un día) |
| **Notas sin foto** | Notas publicadas hace más de 3 horas sin foto ni ilustración |
| **El sitio `radarbalcarce.com`**, mirado desde afuera como un lector | La portada no da 200 o no muestra notas; el feed o el mapa del sitio no responden; ninguna nota nueva en 2 horas de día; alguna de las 5 notas más nuevas da error |
| **Las redes** (Facebook, Instagram, Bluesky, Threads, X), con lo que registra `radar-redes` | Una red lleva demasiadas horas sin publicar (dentro del horario de 8 a 22) o falló 3 veces seguidas |
| **El token de Threads** (nuevo, 20/11), con lo que informa `radar-redes` | La renovación automática falló 2 veces seguidas; faltan menos de 10 días y no se renovó; el token guardado no se puede leer |
| **El bot de Telegram** | No responde, no tiene token o tiene mal el webhook. Si el bot está caído, avisa por mail |
| **Vencimientos** (nuevo, 17/11) | Ver el punto 3 |

Además, a las 8:00 y a las 20:00 manda el informe del día. Todo se avisa una vez y, cuando se arregla, dice «volvió a andar».

**Lo que se hizo el 17/11:** se agregó el aviso de «el núcleo está en modo prueba» y la tabla de vencimientos con sus avisos; se sacó el enlace al Worker `radar-sitio` (no tiene `/salud`: el chequeo del sitio ya se hace desde afuera, y por eso el `/salud` de la vigilancia mostraba `sitio: false`). El chequeo del sitio y de las redes ya existía desde antes (la auditoría del día lo daba por no hecho porque miraba ese `false`).

**Lo que todavía no mira (y cómo se haría):**
- *Que la llave de GitHub de las redes siga valiendo.* Hoy se nota por efecto: si vence, las redes dejan de publicar y salta «Facebook no publica desde hace N horas». Para verla antes de que falle haría falta que el Worker `radar-redes` tenga un `GET /llave` que pregunte a GitHub `GET /rate_limit` con su llave y devuelva sólo sí o no (2 horas de trabajo). Mientras tanto, la fecha se vigila con la tabla de vencimientos.
- *Que un workflow de GitHub haya fallado.* Hace falta una llave de lectura de GitHub en la vigilancia (la que tenía el vigilante viejo venció el 14/11). Lo más simple: que `v3-piezas.yml` avise por Telegram cuando termina mal (un paso `if: failure()`). Necesita decisión (punto 6).
- *Errores por tarea de IA:* el `/salud` del núcleo sólo da pedidos y tokens.

## 2. ¿Sigue vigente que `RELOJ_GITHUB_TOKEN` es un punto único de falla?

**Sí, sigue vigente. Hernán entendió mal cómo corren hoy los reels: no usan un repositorio privado ni un Worker de render.** Evidencia:

- El Worker `radar-redes` (reloj) despierta dos workflows de GitHub Actions con la API de GitHub: «piezas de redes» (`v3-piezas.yml`, una vez por hora de 7:07 a 23:07) y «fotos propias» (`v3-fotos-propias.yml`, cada 2 horas). Código: `v3/redes/disparar-acciones.mjs:1-8, 18-26, 55-73`. El secreto del Worker se llama `GITHUB_TOKEN_ACCIONES` y se carga desde el secreto de GitHub `RELOJ_GITHUB_TOKEN` (`.github/workflows/v3-desplegar.yml:306`).
- Esos workflows corren en `radarbalcarce/radar-balcarce`, que es **público** (`gh repo view`: PUBLIC), en `ubuntu-24.04` (`v3-piezas.yml:54`), y ahí se arman el video y la voz. Las últimas tres corridas (17/11, 17:07, 18:07 y 19:07 UTC) fueron `workflow_dispatch` exitosas, o sea, disparadas por ese token.
- El repositorio `radarbalcarce/radar-balcarce-render` existe y es **público** (no privado), pero el 3.0 no lo usa: ningún archivo de `v3/` ni de los `v3-*.yml` lo nombra ni usa `RENDER_GITHUB_TOKEN`, y su última corrida es del 3/11 (`gh run list`), de la época del sistema viejo. Mover el armado de videos allá sigue siendo sólo una propuesta (`docs/3-0/APAGAR-EL-VIEJO.md`, opción B). `infra/render-publico/` es esa copia vieja.
- Lo que SÍ está en Cloudflare: la base, el depósito R2 donde quedan los videos y las placas, y el Worker que sirve los videos a Buffer (`v3/redes/video-publico.mjs`). Pero **el armado del video no**: sin un disparo de GitHub, no se arma nada.
- **Qué pasa si el token vence:** GitHub contesta 401 al disparo. El Worker reintenta una vez y manda un aviso por Telegram («No se pudo lanzar "piezas de redes"… mirar el token», `disparar-acciones.mjs:73`) y sigue. Se paran reels, historias, clima, repasos, posteos con placa y fotos propias. La vigilancia lo vería recién cuando una red pase 6 a 8 horas sin publicar, y la mayoría de las piezas del día se habrían perdido.
- **Fecha de vencimiento: no se puede ver desde acá** (sólo se ve en GitHub con la cuenta dueña de la llave). `docs/08-INFRAESTRUCTURA.md` (líneas 244 y 631) dice «creado sin vencimiento», pero la llave vecina, cargada el mismo día (15/10), venció el 14/11, así que ese dato no es confiable. Por eso en la tabla figura como `desconocida` y la vigilancia pide cada mes que alguien la mire.
- **Cómo la ve Hernán:** entrar a GitHub con `radarbalcarce@gmail.com` → su foto → Settings → Developer settings → Personal access tokens → Fine-grained tokens. Cada llave muestra «Expires on …» (o «Never»). Es la que tiene permiso «Actions: Read and write» sobre `radarbalcarce/radar-balcarce`. Si no se sabe cuál es cuál, el listado muestra «last used»: la del reloj se usó hace minutos.

## 3. La tabla de vencimientos

La vigilancia avisa **por Telegram, una sola vez**, 30, 14, 7 y 1 días antes (el dominio y las voces también 60). Si algo ya venció, lo repite cada 7 días. Si no se sabe la fecha, pide una vez por mes que se mire. Los lunes manda un resumen de lo que vence en los próximos 60 días. Los avisos salen de 9 a 21. La tabla está en `v3/vigilancia/vencimientos.mjs`; no se inventó ninguna fecha.

| Qué | Cuándo vence | Quién lo renueva | Cómo |
|---|---|---|---|
| Dominio `radarbalcarce.com` | **21/09/2027** | Hernán | Pagar la renovación en DonWeb. Si vence, se cae el sitio y los enlaces de las redes |
| Las dos voces propias de Gemini | **29/09/2027** | Claude, con el visto bueno de Hernán | Crearlas de nuevo con «Crear voces» y cambiar los identificadores en `CRITERIO-REDES.md` § 6. Si vencen, los reels dejan de tener voz |
| `security.txt` del sitio | **7/11/2027** | Claude | Subir la fecha «Expires» en `v3/sitio/vistas/agentes.mjs` y desplegar el sitio |
| Token de Threads (`THREADS_TOKEN`) | **Se renueva solo** (desde el 20/11/2026) | Nadie | El Worker `radar-redes` guarda el token vigente (cifrado, en su base) y lo renueva cada 30 días (`v3/redes/threads-token.mjs`, `v3/redes/REGLAS.md` § 25). La vigilancia avisa por Telegram si la renovación falla dos veces seguidas o si faltan menos de 10 días; sólo entonces habría que generar uno nuevo en la consola de Meta, pegarlo en el secreto `THREADS_TOKEN` de GitHub y subir «redes». El secreto de GitHub se deja cargado como respaldo |
| Llave de GitHub del reloj (`RELOJ_GITHUB_TOKEN`) | **Desconocida** (ver punto 2) | Hernán | GitHub → Developer settings → Fine-grained tokens; si hace falta, crear otra con «Actions: lectura y escritura» sólo sobre este repositorio |
| Llave de Cloudflare para desplegar (`CLOUDFLARE_API_TOKEN`) | **Desconocida** | Hernán | Cloudflare → My Profile → API Tokens: ver «Expires on» |
| `RADAR_GITHUB_TOKEN` | **Desconocida** (ni siquiera está claro que el 3.0 la use) | Hernán / Claude | Mirar la fecha; si Claude confirma que no se usa, borrar el secreto |
| Clave de Buffer (`BUFFER_API_KEY`) | **Desconocida** | Hernán | Buffer → Settings → API |
| Token de Meta (`META_TOKEN`) | Sin vencimiento según los documentos (no verificado hoy) | Hernán | Si Facebook o Instagram fallan al publicar, regenerarlo en Meta Business con todos los permisos |
| Llave «Vigilante de Cloudflare (lectura)» (`VIGILANTE_GITHUB_TOKEN`) | Venció el **14/11/2026**; es del sistema viejo, **no hace falta renovarla** | Nadie | Borrar el secreto (punto 5). Figura en la tabla como «retirada»: no avisa |

Sobre las claves de IA (Gemini, Mistral, Groq): no tienen fecha de vencimiento, se invalidan sólo si alguien las borra o cambia la facturación; ya las vigila el aviso de gasto y de pedidos del núcleo. No hay en ningún documento una fecha de tarjeta o de facturación, así que no se cargó ninguna; si Hernán quiere que se vigile una (por ejemplo la tarjeta del respaldo pago de Gemini), que pase la fecha y se suma.

## 4. Qué tiene que hacer una persona, y cuándo

1. **Esta semana (15 minutos):** Hernán mira en GitHub la fecha de `RELOJ_GITHUB_TOKEN` (punto 2) y en Cloudflare la de `CLOUDFLARE_API_TOKEN`, y se las pasa a Claude para cargarlas. Si alguna vence en menos de 60 días, renovarla ya.
2. **Cuando suene un aviso de vencimiento:** el mensaje dice qué es, cuándo vence y cómo se renueva; después de renovar, avisarle a Claude para que ponga la fecha nueva en la tabla (lo hace una vez, en `vencimientos.mjs`, y despliega la vigilancia). Sin ese cambio, la fecha vieja seguiría figurando.
3. ~~Hacia el 20/12/2026: el token de Threads~~ **Ya no hace falta** (20/11/2026): se renueva solo. Lo único que hay que hacer es subir «redes» una vez, para que el Worker reciba el primero.
4. **El lunes de cada semana:** leer el resumen «qué hay que renovar en los próximos 60 días».

## 5. Para borrar o desactivar (lo aprueba el dueño; nada de esto se tocó)

Todo lo de abajo está **fuera de `v3/vigilancia/`**, que ya no nombra nada del sistema viejo (se sacó sólo el enlace a `radar-sitio`; el resto estaba limpio).

| Qué | Evidencia de que no se usa | Riesgo | Propuesta |
|---|---|---|---|
| Secretos de GitHub `OPENROUTER_API_KEY`, `WHATSAPP_APIKEY`, `WHATSAPP_TELEFONO`, `VIGILANTE_GITHUB_TOKEN`, `VIGILANTE_TOKEN`, `RENDER_GITHUB_TOKEN`, `CF_BUILDS_TOKEN`, `MOTOR_DEPLOY_HOOK` | Ningún `v3-*.yml` ni archivo de `v3/` los nombra (`grep`). OpenRouter se retiró el 26/10 y WhatsApp ya no se usa. Sólo los nombran workflows viejos | Bajo. Cuidado con `RADAR_GITHUB_TOKEN`, `TAVILY_API_KEY`, `CLOUDFLARE_ANALYTICS_TOKEN`, `GEMINI_API_KEY_CLASIFICACION`, `GEMINI_API_KEY_REDACCION`: no se verificó que el 3.0 no los use, no tocar sin mirar | Borrar los ocho primeros, después de desactivar los workflows viejos |
| Variables de GitHub `REDES_ACTIVAS`, `REDES_ACTIVAS_NUBE` (ambas «No»), `R2_PIEZAS`, `R2_ARCHIVO`, `INFORME_RESPALDO_EN_GITHUB`, `TARJETAS_EN_R2`, `SITEMAP_*`, `REVISION_DEL_ARCHIVO`, `TOPE_DE_NOTAS` | Las de redes son del sistema viejo; el 3.0 tiene su propio `REDES_ACTIVAS = "si"` en `v3/redes/wrangler.toml`. **Ojo:** `v3-piezas.yml` y `v3-desplegar.yml` nombran `REDES_ACTIVAS`: verificar antes si leen la variable de GitHub o la propia | Medio: confundir las dos y apagar las redes. No borrar `REDES_ACTIVAS` de GitHub hasta leer esos dos workflows | Primero revisar; después borrar las viejas |
| ~30 workflows viejos en `.github/workflows` aún «active» (Piezas, Panel del celular, Vigilante de Cloudflare, Reloj de Cloudflare, Estado del reloj/motor, Cargar variables del motor, Desplegar Workers de Cloudflare, Cloudflare Pages, Buffer, Reintentar pieza, Fijar piezas, Piezas de redes, Reel a mano, Publicar a mano, Archivo permanente, Imágenes con Workers AI, Fotos a R2, Probar claves, etc.) | En las últimas 400 corridas del repositorio sólo corrieron «Pruebas» (hoy) y «Respaldo» (15/11, `schedule`); ninguno de los otros, ni los `v3-*` salvo los disparados | Bajo si no tienen `schedule`. Cuidado con «Respaldo» (corre sola: mirar qué respalda antes de apagarla) y con «Pruebas» (la usa el repo) | Desactivarlos de a uno con `gh workflow disable`, un paso por día (`APAGAR-EL-VIEJO.md`) |
| Repositorio público `radarbalcarce/radar-balcarce-render` y la carpeta `infra/render-publico/` | `v3/` no los usa; última corrida 3/11 | Bajo; es la opción B de `APAGAR-EL-VIEJO.md` (mover el armado de videos allá para ahorrar minutos): si se quiere ese camino, se conserva | Decidir primero la opción B; si no, archivar el repositorio |
| Workers viejos `radar-balcarce-tareas`, `radar-balcarce-reloj`, `radar-balcarce-vigilante`, Workers Builds del motor (código en `infra/`) | El 3.0 ya sirve `/video/` desde `radar-redes` (`v3/redes/video-publico.mjs`, `v3/redes/piezas/correr.mjs:460`). **No verificado en el panel de Cloudflare** (no hay acceso desde acá). El comentario de `v3-piezas.yml` línea 17 todavía dice que `radar-balcarce-tareas` tiene que seguir en pie: está desactualizado | Medio: un video ya programado en Buffer con la dirección vieja dejaría de verse | Esperar unos días sin videos nuevos con dirección vieja, apagar de a uno según `APAGAR-EL-VIEJO.md` |
| Código de `ingesta/`, `redes/`, `reels/`, `web/`, `infra/`, `panel/`, `docs/historico/` | **No se pueden borrar todavía:** 21 archivos de `v3/` los importan (`v3/redes/piezas/escenas.mjs`, `render.mjs`, `armadores.mjs`, `bajada.mjs`, `datos.mjs`; `v3/sitio/scripts/imagen-og.mjs`; `v3/nucleo/scripts/comparar.mjs`) | Alto | Primero mudar esos archivos a `v3/` (tarea de Claude), después borrar |
| Interruptor `RESPALDO_VIEJO` del sitio | Ya está en `"no"` en `v3/sitio/wrangler.toml:35` | Ninguno | Más adelante, borrar el código que lo lee |

## 6. Qué falta desplegar y qué necesita decisión

- **Desplegar:** la vigilancia, con «Radar 3.0: desplegar» (opción vigilancia, modo manual). Hasta entonces nada de lo nuevo corre. Al desplegar, el primer chequeo del día manda un solo mensaje con los avisos de «fecha desconocida» (cuatro ítems) y, si es lunes, el resumen.
- **Decisión 1:** ¿se agrega un aviso por Telegram cuando `v3-piezas.yml` termina mal (un paso de GitHub)? Es lo único que cubriría las fallas del armado del video, que hoy sólo se notan cuando una red pasa horas sin publicar. Toca un workflow de producción, por eso se pregunta.
- **Decisión 2:** ¿se hace el `GET /llave` en `radar-redes` para ver la llave de GitHub viva? (Punto 1.) Tampoco se hizo sin pedirlo: toca un Worker de producción.
- **Decisión 3:** la lista del punto 5.
- **Pendiente de Hernán:** mirar y pasar las fechas de las llaves (punto 4.1).
