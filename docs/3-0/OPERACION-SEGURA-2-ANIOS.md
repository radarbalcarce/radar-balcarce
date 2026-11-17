# Operación segura para 2 años: que nada venza y el sitio siga sin tocarlo

*Escrito el 17/11/2026 para Hernán. Lo que dice «medido» se midió ese día con `gh` (sólo lectura) y leyendo el código; lo que dice «documentación» se leyó en la documentación oficial de GitHub, Cloudflare y Meta ese día. Lo que no pude ver desde acá está marcado **[verificar]**. Nada se borró, ni se commiteó, ni se tocaron secretos ni Workers: sólo se desactivaron 19 workflows viejos de GitHub (se vuelven a prender con `gh workflow enable`).*

## 1. Recomendación en cuatro líneas

1. **Repositorios: dejar el código en el repositorio público de hoy y sacar de ahí lo delicado** (documentos de decisiones, anunciantes, contactos, borradores) a un repositorio **privado chico** que no corre nada (0 minutos). Es la opción A+ de abajo.
2. **Llave del reloj (`RELOJ_GITHUB_TOKEN`): una llave de GitHub «sin vencimiento», de un solo repositorio y sólo con permiso de Actions.** Más seguro todavía y sin vencer nunca: una «GitHub App» (queda como mejora, no hace falta ahora).
3. **Threads (vence cada 60 días): que el propio Worker `radar-redes` la renueve solo** con el aviso oficial de renovación. Hoy no lo hace nadie.
4. **La vigilancia ya avisa de lo que vence** (`v3/vigilancia/vencimientos.mjs`); falta cargar las fechas reales (paso 2 de la lista de Hernán).

## 2. Los números medidos

### 2.1 Minutos de GitHub Actions por mes (últimas 2 semanas, del 3 al 17/11, ×30/14)

Cada trabajo se redondea hacia arriba al minuto. En repositorio público, los minutos son gratis y sin tope. En privado, el plan Free da **US$ 12 de uso por mes, que a la tarifa de Linux de 2 núcleos (US$ 0,006 el minuto) son unos 2.000 minutos**; el plan Pro (US$ 4 por mes) da US$ 18, unos 3.000 (documentación de GitHub, «About billing for GitHub Actions», 17/11).

| Workflow | Corridas en 14 días | Promedio | Minutos por mes |
|---|---|---|---|
| Radar 3.0: piezas de redes (cada hora) | 230 | 2,0 min | **1.211** |
| Radar 3.0: desplegar (a mano, desarrollo) | 110 | 3,2 min | 866 (en quietud, casi 0) |
| Pruebas (en cada subida y lunes) | 167 | 1,5 min | 651 (en quietud, unos 100) |
| Radar 3.0: fotos propias (cada 2 h) | 114 | 1,1 min | **377** |
| Revisar el archivo (viejo, ya desactivado) | 80 | 0,4 min | 174 |
| Reels del vino (de un solo uso) | 12 | 2,5 min | 79 |
| Un día como hoy (armar el mes, el 20) | 4 | 5,5 min | 51 |
| Respaldo de la base | 12 | 1,1 min | 45 |
| Cargar nota a mano | 19 | 0,6 min | 43 |
| Nota de Un día como hoy | 14 | 0,9 min | 41 |
| Estadísticas | 13 | 0,5 min | 28 |
| Todo lo demás (previa, Telegram, unir repetidas, respaldo viejo…) | — | — | unos 100 |
| **Total medido** | | | **unos 3.700** (con mucho desarrollo) |

**En quietud (sin desplegar a cada rato) son unos 1.870 minutos por mes**, casi todo por «piezas de redes» y «fotos propias» (1.590). Detalle: la mitad de las corridas de piezas (111 de 226) duran menos de 1 minuto porque no había nada para armar, y de las de fotos propias 108 de 114: igual cobran 1 minuto entera cada una.

### 2.2 Qué alcanza y qué no

| Camino | Minutos gratis | Alcanza |
|---|---|---|
| Repositorio público (hoy) | sin tope | Sí, siempre |
| Privado, plan Free | ~2.000 | **Justo, y peligroso**: 1.870 en quietud, 3.700 cuando se desarrolla. Si se pasa y el tope de gasto está en US$ 0 (lo recomendado), **los reels dejan de salir** hasta el mes siguiente |
| Privado, plan Pro (US$ 4/mes) | ~3.000 | Sí en quietud; no con desarrollo intenso. Mes que se pasa: o se corta o se paga el excedente |

### 2.3 Pruebas

- **3.0:** 76 archivos y **1.096 pruebas, todas pasan**; tardan entre 35 y 95 segundos según la máquina (medido hoy, `node --test "v3/**/*.test.mjs"`). Es lo que corre «Pruebas» en GitHub.
- **Sistema viejo:** 265 archivos en `pruebas/` (unas 3.000 pruebas; no se corrieron hoy). **`pruebas.yml` corre sólo las del 3.0**: las 265 de `pruebas/` hoy no las corre nadie en GitHub.

## 3. Las opciones para el repositorio y el armado de videos

El armado de videos (voz, escenas, ffmpeg) hoy corre en GitHub Actions del repositorio principal; el reloj de Cloudflare lo despierta con la llave. **Ojo con el recuerdo:** el repositorio `radar-balcarce-render` existe y es **público**, pero el 3.0 no lo usa (última corrida 3/11); mover allá el armado es sólo una propuesta de `APAGAR-EL-VIEJO.md` (opción B).

| | Costo | Riesgo | Trabajo | Qué queda expuesto |
|---|---|---|---|---|
| **A. Seguir como hoy (público)** | US$ 0 | Bajo, pero todo lo que está en el repositorio (y en su historial de 850 MB) lo lee cualquiera | Ninguno | Todo: documentos, decisiones, anunciantes, grillas, historial |
| **A+ (recomendada): público el código, lo delicado a un repositorio privado chico** | US$ 0 (el privado no corre Actions) | Bajo. El código no tiene llaves (revisé el árbol actual y no hay ninguna; el historial no lo revisé entero **[verificar con una herramienta de secretos]**) | Medio-bajo: 2 a 3 horas de Claude + 3 decisiones de Hernán | El código y el historial antiguo; no lo nuevo delicado |
| **B. Principal privado + repositorio público sólo para render** (lo que Hernán recuerda del plan) | US$ 0 si los minutos alcanzan | Medio: dos repositorios con el mismo código que hay que mantener iguales; el repositorio público necesita copias de las llaves de redes (voz, Meta, Buffer); si se desfasan, los reels salen con código viejo | **Alto**: copiar `v3/redes`, `reels/` y los 21 archivos viejos que `v3` importa; mantener `scripts/sincronizar-render-publico.mjs` al día; una segunda llave de GitHub | Código de render; el resto privado |
| **C. Sacar el armado de GitHub (Cloudflare)** | **Mínimo US$ 5/mes** | Alto. Cloudflare Containers sólo existe en el plan pago (el gratis no tiene); Workflows en el plan gratis da 10 ms de CPU por paso, que no alcanza para ffmpeg (documentación de Cloudflare, 17/11) | **Muy alto**: reescribir el armado de video para correr en un contenedor | Depende |
| **D. Todo privado + GitHub Pro** | US$ 4/mes | Medio: si la tarjeta falla, se cortan las Actions (otro vencimiento más); en meses de mucho desarrollo se pasa de 3.000 | Bajo: pasar a privado y probar | Nada |

**Por qué A+ y no el resto:** B, C y D agregan piezas que pueden fallar sin que nadie toque nada, justo lo que Hernán no quiere; A+ no cambia cómo corre nada, y deja afuera lo que daría vergüenza o perjudicaría (anunciantes, contactos, decisiones internas). Si Hernán prefiere «todo privado» sí o sí, **D** es el camino con menos trabajo, con US$ 4 por mes y el tope de gasto en 0 (y entonces conviene bajar minutos: fotos propias cada 4 horas y no despertar «piezas de redes» en las horas sin pieza; con eso quedan ~1.500 minutos).

### Qué hay de delicado hoy en el repositorio público

- 3.224 archivos y un historial de unos 850 MB; todo se puede bajar.
- Documentos con decisiones y estrategia: `docs/propuestas/` (primer anunciante, media kit, `anunciantes/sweet-candy-bar.*` con PDF), `docs/3-0/` (auditorías, plan de trabajo, `PUBLICIDAD.md`, `auditoria-05-11/MAPA-COMERCIAL-Y-DATOS-MUNICIPALES.md`), `docs/3-0/notas-propias/` (borradores y un mensaje a comercios; **sí están en git**, aunque `PENDIENTES-3-0.md` dice que no), `docs/3-0/correo/` (filtros y script de avisos).
- Contactos: `ingesta/contactos-agenda.json` y `comercial/datos/comercios.json` (datos de comercios sacados de mapas públicos), `web/data/contactos-celular.json` (va cifrado según `CLAUDE.md`).
- **Sin seguimiento todavía y sin `.gitignore`** (un `git add .` los publicaría): `docs/3-0/grilla/`, `LISTADO-UNICO-BALCARCE.md`, `LISTADO-BALCARCE.html`, `SALIDA-BALCARCE.html`, `GRILLA-NOTAS-TURISTICAS.md`, `EDIFICIO-MUSEO-FANGIO.md`, `scripts/pc/`, `docs/propuestas/MAPA-Y-CRONOGRAMA-25-10.html` (la grilla tiene teléfonos y mails). Esto está dicho en la auditoría (H-08).
- El número de WhatsApp del medio y `contacto@radarbalcarce.com` son públicos a propósito (están en el sitio).
- No hay llaves: busqué patrones de GitHub, Google, Groq, Meta y Telegram en el árbol actual: sin resultados reales (hubo falsos positivos de imágenes embebidas).

### Qué implica pasar el principal a privado (por si algún día se decide B o D)

- **Se rompe poco:** los Workers del 3.0 se despliegan con una llave de Cloudflare desde las Actions; ningún Worker del 3.0 lee el repositorio por la web pública (`grep` en `v3/`: sólo el disparo de Actions con la llave). Cloudflare Pages viejo y Workers Builds viejo estaban conectados al repositorio: no importa, se apagan.
- Pierden gratuidad las Actions (punto 2.2) y la «previa» por enlace público de archivos del repositorio, si alguna página los usa **[verificar con una prueba antes de cambiar]**.
- Hacerlo es un clic en GitHub (Settings → Danger zone → Change visibility). Antes: cerrar el `.gitignore`, decidir `notas-propias/` y decidir si se corre el workflow «Compactar el historial» (reescribe el historial; **irreversible**, hacer respaldo antes).

### Pasos de A+ (los hace Claude con la OK de Hernán)

1. Crear el repositorio privado `radarbalcarce/radar-balcarce-privado` (sin Actions).
2. Mover ahí (con su historial no hace falta): `docs/propuestas/anunciantes/`, `docs/3-0/notas-propias/`, `docs/3-0/grilla/`, `docs/3-0/correo/`, los `LISTADO*`/`SALIDA*`, `MAPA-COMERCIAL-Y-DATOS-MUNICIPALES.md`, `scripts/pc/`, borradores de media kit. Dejar en el principal sólo un `LEEME` que diga dónde están.
3. Agregar esas rutas al `.gitignore` del principal.
4. Decidir si se limpia el historial viejo con «Compactar el historial» (opcional, bajo respaldo).
5. Escribir en `CLAUDE.md` nuevo: «lo delicado vive en `radar-balcarce-privado`».

## 4. Inventario de llaves (sólo nombres, ningún valor)

«Vence» = lo que dice la documentación oficial o lo que se vio; **[verificar]** = hay que mirarlo en la consola de cada servicio.

| Llave | Quién la usa | Permisos mínimos que necesita | ¿Vence? |
|---|---|---|---|
| `RELOJ_GITHUB_TOKEN` (en el Worker como `GITHUB_TOKEN_ACCIONES`) | `radar-redes`: despierta «piezas de redes» y «fotos propias» (`v3/redes/disparar-acciones.mjs`) | Un repositorio (`radar-balcarce`), sólo «Actions: lectura y escritura» | **Desconocido [verificar]**. Una llave vecina del mismo día venció el 14/11 (por defecto GitHub las hace de 30 días) y ésta sigue andando, así que se creó con otra fecha |
| `CLOUDFLARE_API_TOKEN` | Desplegar Workers, subir a R2, base D1 (`v3-desplegar`, respaldos) | Workers Scripts: editar; D1: editar; R2: editar; rutas/zona del sitio; nada más | **[verificar]**: las llaves de Cloudflare pueden tener fecha o no |
| `CLOUDFLARE_ACCOUNT_ID` | Idem | No es una clave secreta (un identificador) | No |
| `CLOUDFLARE_ANALYTICS_TOKEN` | Estadísticas, informe | Analytics: sólo lectura | **[verificar]** |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Subir y bajar archivos del depósito desde GitHub (piezas, respaldos) | Sólo los depósitos `radar-render`, `radar-fotos`, respaldos; lectura y escritura | No vencen salvo que se les ponga fecha **[verificar]** |
| `META_TOKEN` | Publicar en Facebook e Instagram; leer métricas | Páginas y publicación, `instagram_basic`, `instagram_content_publish`, `read_insights` | Según los documentos, sin vencimiento (usuario del sistema con «Nunca» en la fecha). **[verificar con `debug_token`: `expires_at` = 0]** |
| `THREADS_TOKEN`, `THREADS_USER_ID` | Publicar en Threads | `threads_basic`, `threads_content_publish` | **Sí, cada 60 días** (documentación de Meta). Estimado del vencimiento: **4/1/2027**. Se puede renovar solo (punto 6) |
| `BLUESKY_APP_PASSWORD` | Publicar en Bluesky | Contraseña de aplicación (no la de la cuenta) | No |
| `BUFFER_API_KEY` | TikTok, YouTube y X vía Buffer | La clave de Buffer (da acceso a los canales conectados) | **[verificar]**: no hay dato en los documentos |
| `GEMINI_API_KEY_REDACCION`, `_CLASIFICACION`, `_RESPALDO`, `_REDES` | Redactar, leer, voz (`_REDES` sólo voz) | Una clave por proyecto de Google; la de respaldo y la de voces tienen tope de gasto | No vencen; se cortan si se borra el proyecto o falla la facturación. **La voz propia sí vence el 29/09/2027** (no es la clave, es el modelo de voz) |
| `GROQ_API_KEY`, `MISTRAL_API_KEY` | Lectura de respaldo y último respaldo de redacción | Una clave de cada una | No |
| `TELEGRAM_TOKEN` | Bot `@radarbalcarce_bot`: redacción, avisos | El bot | No (si no se regenera con BotFather) |
| `GITLAB_TOKEN`, `GITLAB_REPO` | Espejo semanal de «Respaldo» | **No están cargadas**: el espejo en GitLab no se hace | — |
| `VIGILANTE_TOKEN` | Un workflow activo lo nombra (**[verificar para qué]**; ver punto 6 de la lista de borrar) | — | — |
| Dominio `radarbalcarce.com` (DonWeb) | Todo el sitio y los enlaces | — | **21/09/2027** |

## 5. Reemplazo de `RELOJ_GITHUB_TOKEN`

Comparación (las cuatro cosas que pidió Hernán):

| Camino | Qué es | ¿Vence? | Qué puede hacer quien la robe | Trabajo | Comentario |
|---|---|---|---|---|---|
| **1. Llave «fine-grained» sin vencimiento, un repositorio, sólo Actions** | Lo mismo de hoy pero sin fecha (GitHub permite «sin vencimiento» salvo que una organización lo prohíba: esta cuenta es personal) | No | Despertar workflows de este repositorio. Nada más | 10 minutos de Hernán, sin tocar código (se vuelve a cargar el secreto y se despliega `redes`) | **Recomendada ahora**: lo más simple y robusto |
| 2. GitHub App con instalación | Una «aplicación» propia instalada sólo en este repositorio; el Worker firma un papel con su clave y pide una llave de 1 hora cada vez | La clave privada no vence; las llaves de 1 hora se piden solas | Con la clave privada, lo mismo que la 1 | 30 minutos de Hernán (más pantallas) + 2 horas de Claude en `v3/redes` | La más durable y la mejor para 2 años. Queda como mejora (**decisión de Hernán**) |
| 3. `repository_dispatch` | Otro modo de despertar workflows | — | — | — | **No resuelve nada**: también necesita una llave con permiso sobre el repositorio |
| 4. Un cron propio sin GitHub | Que el reloj no dependa de GitHub | — | — | — | No se puede sin sacar el armado de GitHub (opción C): el armado vive allá |

**No usar el `GITHUB_TOKEN` que viene solo en las Actions**: sólo existe adentro de una corrida, no sirve para despertarla desde afuera.

### Paso a paso para Hernán (camino 1), pantalla por pantalla

*Con la cuenta `radarbalcarce@gmail.com`. La llave nueva no se pega nunca en un chat.*

1. Entrar a github.com. Arriba a la derecha tocar la foto → **Settings**.
2. Abajo en el menú de la izquierda: **Developer settings** → **Personal access tokens** → **Fine-grained tokens**.
3. Mirar la llave de siempre: cada una dice «Expires on…». Anotar la fecha de la que dice «last used: hace minutos» (es la del reloj) y pasársela a Claude.
4. Botón **Generate new token**. Nombre: `reloj-radar-redes`.
5. **Expiration:** elegir **No expiration** (sin vencimiento). Si la lista sólo ofrece fechas, elegir la más lejana (366 días) y anotar la fecha: la vigilancia avisa antes.
6. **Repository access:** **Only select repositories** → elegir `radarbalcarce/radar-balcarce`.
7. **Permissions → Repository permissions → Actions: Read and write**. (Metadata «Read-only» se agrega sola.) Nada más.
8. **Generate token** → copiar la llave que aparece (sólo se ve una vez).
9. En el repositorio: **Settings → Secrets and variables → Actions → Repository secrets → `RELOJ_GITHUB_TOKEN` → Update** → pegar → **Update secret**.
10. Ir a **Actions → «Radar 3.0: desplegar»** → Run workflow → elegir **redes** (el secreto llega al Worker en el despliegue, `v3-desplegar.yml`) → **Run workflow**. (Claude pide la OK de Hernán, es un despliegue.)
11. Esperar a la hora en punto: tiene que aparecer una corrida nueva de «Radar 3.0: piezas de redes». Revocar la llave vieja (la del paso 3): **Delete**.

### Cómo queda vigilado

- Se carga la fecha en `v3/vigilancia/vencimientos.mjs`: 30, 14, 7 y 1 días antes por Telegram (ya existe la tabla).
- **Decisión 1 (de la auditoría):** un paso `if: failure()` en `v3-piezas.yml` que avise por Telegram si el armado falla. **Decisión 2:** `GET /llave` en `radar-redes`, que pregunta a GitHub si la llave sigue viva. Con las dos, una llave vencida se ve en horas y no el día que faltan los reels.

## 6. Las otras llaves, una por una

- **Cloudflare:** panel → My Profile → API Tokens: ver «Expires on» de la llave de desplegar y de la de estadísticas. Si tiene fecha, editarla a «sin fecha» (Edit → TTL vacío) o renovarla. Permisos mínimos: ver la tabla del punto 4. Antes de borrar una llave vieja, confirmar que no es la del reloj viejo.
- **Meta (Facebook, Instagram):** Meta Business → Configuración → Usuarios del sistema → `publicador-radar` → Generar token con vencimiento **«Nunca»** y los permisos del punto 4. Para ver la fecha real: herramienta «Access Token Debugger» de Meta (pegar la llave **sólo ahí**), mirar «Expires». **Aparte:** Meta pide una vez por año el «Data Use Checkup» a las aplicaciones: llega por mail a `radarbalcarce@gmail.com` **[verificar que figure]**; si no se contesta, la app se puede restringir. Anotarlo en el calendario.
- **Threads:** según la documentación de Meta la llave larga dura 60 días y se renueva con `GET https://graph.threads.com/refresh_access_token?grant_type=th_refresh_token&access_token=…`, **siempre que tenga más de 24 horas y no haya vencido** (una vencida no se puede renovar: hay que sacar otra a mano). Cada renovación vuelve a dar 60 días. **Se puede automatizar:** el Worker `radar-redes` pide la renovación cada 30 días, y guarda la llave nueva en su base (un secreto de Cloudflare no se reescribe solo). Trabajo de Claude, 2 horas, **antes del 4/1/2027**; hasta entonces, Hernán la renueva a mano desde la consola de Meta y avisa.
- **Buffer:** Buffer → Settings → API/Access → ver si la clave tiene fecha **[verificar]**. Si no tiene, listo; si tiene, renovar y cargar `BUFFER_API_KEY`.
- **Gemini y las otras IAs:** las claves no vencen. Lo que sí puede cortarlas: borrar el proyecto de Google, la tarjeta del respaldo pago (tope de US$ 10 por mes) o que Google retire un modelo viejo (`gemini-3.8-flash-tts` o el de texto). Mirar el correo de Google Cloud / AI Studio **[verificar que lleguen a una casilla que se lea]** y el aviso de gasto de la vigilancia.
- **Dominio:** DonWeb → Mis servicios → `radarbalcarce.com` → renovar **por varios años** y activar la renovación automática (la tarjeta cargada tiene que vencer después). Aviso en la vigilancia desde 60 días antes (22/07/2027).
- **Voces propias de Gemini:** vencen el **29/09/2027**: rehacerlas con «Crear voces» (`crear-voces.yml`, **dejado activo**), con visto bueno de Hernán, en agosto de 2027.

## 7. Calendario de lo que vence (24 meses, sólo los meses con algo)

| Mes | Qué | Quién |
|---|---|---|
| **Nov 2026** (ahora) | Mirar las fechas de `RELOJ_GITHUB_TOKEN`, de la llave de Cloudflare y de Meta; cargar la llave nueva del reloj; decidir A+ | Hernán |
| **Dic 2026** | Que `radar-redes` renueve Threads solo (o renovarla a mano antes del 20/12); armar efemérides de abril en adelante | Claude / Hernán |
| **4/1/2027** | Fecha estimada de vencimiento de Threads si nadie la renovó | Se renueva sola (o Hernán) |
| **Cada mes** | Los 5 minutos del punto 9 | Hernán |
| **Mar 2027** | Efemérides del año armadas (antes del 20/3) | Claude |
| **Abr–may 2027** | A los 6 meses, mirar el cupo de voz y el gasto de IA; GitHub puede subir la versión forzada de Node de las acciones (`checkout@v4` y otras): subirlas en bloque | Claude |
| **Jul 2027** | 22/07: primer aviso del dominio; renovarlo | Hernán |
| **Ago 2027** | Rehacer las voces (vencen el 29/09) | Claude + Hernán |
| **21/09/2027** | **Vence el dominio** (renovar antes) | Hernán |
| **29/09/2027** | **Vencen las dos voces propias** | Claude |
| **7/11/2027** | Vence el `security.txt` del sitio: subir la fecha y desplegar el sitio | Claude |
| **Nov 2027** | Fecha de la llave de GitHub si se eligió 366 días; Data Use Checkup de Meta (anual) **[verificar]** | Hernán |

**Aviso importante, GitHub:** en repositorios públicos, los workflows con horario (`schedule:`) **se desactivan solos si en 60 días no hubo ninguna actividad en el repositorio** (comportamiento conocido de GitHub **[verificar en la documentación vigente]**). Hoy casi todo se despierta por la API (no es horario) y «Un día como hoy» sube commits, pero «Respaldo» (domingos) y «v3-efemerides» (día 20) conservan `schedule:`. Si se llega a un largo período sin tocar nada, revisar que sigan «active».

## 8. Lo que ya quedó desactivado hoy (17/11/2026), reversible

Se hizo con `gh workflow disable` (se vuelve a prender con `gh workflow enable <nombre>`). Son workflows **sólo manuales** del sistema viejo, sin horario, que ningún archivo de `v3/` ni ningún workflow activo dispara (revisé `v3/redes/disparar-acciones.mjs`, los `workflow_call`/`workflow_run` —no hay— y los documentos):

| Desactivado ahora | Motivo |
|---|---|
| Archivo permanente (producción) y (staging) | Subían el Worker viejo `radar-balcarce-archivo`; sin ruta en el sitio |
| Cargar variables del motor, Estado del motor | Motor viejo en Workers Builds |
| Cloudflare Pages | Sitio viejo (`radar-balcarce.pages.dev`), red de seguridad ya apagada |
| Desplegar Workers de Cloudflare | Sube los Workers viejos de `infra/` (el 3.0 usa «Radar 3.0: desplegar») |
| Estado del reloj, Reloj de Cloudflare | Reloj viejo |
| Vigilante de Cloudflare | Vigilante viejo (su llave venció el 14/11) |
| Fijar piezas, Piezas, Piezas de redes, Reintentar pieza, Reel a mano, Publicar a mano | Redes y reels del sistema viejo (el 3.0 tiene los suyos) |
| Fotos a R2 (migración), Imágenes con Workers AI | Migraciones del sistema viejo |
| Panel del celular | Panel viejo (el bot de Telegram lo reemplazó; **si algo del panel viejo se usa todavía, volver a prenderlo**) |
| Sondeo de fuentes (temporal) | El archivo del workflow ya no existe en el repositorio |

Ya estaban desactivados antes (a mano): Actualizar la web, Armado con datos vacíos, Auditoría, Auditoría IA, Ilustrar notas sin foto, Informe diario, Pistas, Pruebas con otra hora, Redes, Revisar el archivo, Vigilancia.

**Quedaron activos (no tocar sin pensar):** todos los «Radar 3.0: …», **Pruebas** (la usa el repositorio), **Respaldo** (domingos, copia del repositorio) y **Probar la restauración del respaldo**, **Compactar el historial** (hace falta si se decide limpiar el historial), **Crear voces** y **Auditar voz** (las voces vencen el 29/09/2027), **Buffer (TikTok y YouTube)** (diagnóstico de Buffer), **Huella de las claves de IA**, **Probar las claves de Gemini**, **Diagnóstico de Instagram** y **Generar fondos del clima** (herramientas manuales sin costo, útiles si algo falla; no corren solas).

## 9. Lista para borrar (NO se hizo; Hernán marca cada casillero)

*«Irreversible» = no se puede volver atrás sin volver a crear la cosa (y con las llaves, sacar otra). Los secretos de GitHub **no se pueden leer después de borrados**: si había una llave valiosa, no se recupera.*

### 9.1 Secretos de GitHub

| ☐ | Secreto | Evidencia | Si se borra por error | Reversible |
|---|---|---|---|---|
| ☐ | `OPENROUTER_API_KEY` | Ningún workflow activo ni `v3/` lo nombra; OpenRouter se retiró el 26/10 | Nada | Se puede sacar otra clave; no hace falta |
| ☐ | `WHATSAPP_APIKEY`, `WHATSAPP_TELEFONO` | Idem; el 3.0 sólo usa el número público del sitio | Nada | Idem |
| ☐ | `VIGILANTE_GITHUB_TOKEN` | Venció el 14/11; sólo workflows viejos la nombran | Nada | Idem |
| ☐ | `MOTOR_DEPLOY_HOOK`, `CF_BUILDS_TOKEN` | Del motor viejo en Workers Builds; sólo workflows viejos | Nada si el motor viejo ya está apagado | Cloudflare permite crear otro gancho |
| ☐ | `RENDER_GITHUB_TOKEN` | Para el repositorio `radar-balcarce-render`; el 3.0 no lo usa | Nada | Se crea otra |
| ☐ | `RADAR_GITHUB_TOKEN` | Ningún workflow activo lo nombra; `vencimientos.mjs` lo lista como «no está claro que se use» | Ver si la fecha ya pasó antes de borrar | Se crea otra |
| ☐ | `TAVILY_API_KEY` | Sólo la usaba «Pistas» (desactivada); no está en `v3/` | Nada (Pistas ya apagada) | Se saca otra |
| ☐ | `VIGILANTE_TOKEN` | Un workflow activo lo nombra: **mirar cuál antes de borrar** | **Posible** | Se crea otra |

**No borrar** los demás secretos: están nombrados por workflows activos o por el despliegue: `BLUESKY_APP_PASSWORD`, `BUFFER_API_KEY`, `CLOUDFLARE_*`, `GEMINI_*` (los cuatro), `GROQ_API_KEY`, `META_TOKEN`, `MISTRAL_API_KEY`, `R2_*`, `RELOJ_GITHUB_TOKEN`, `TELEGRAM_TOKEN`, `THREADS_*`.

### 9.2 Variables de GitHub

| ☐ | Variable | Evidencia | Si se borra por error |
|---|---|---|---|
| ☐ | `REDES_ACTIVAS` y `REDES_ACTIVAS_NUBE` (las dos «No») | Del sistema viejo; el 3.0 manda con `v3/redes/wrangler.toml` (`REDES_ACTIVAS = "si"`). Ojo: dos documentos de `v3-*.yml` nombran la palabra en comentarios, no leen la variable | Nada (confunden más de lo que ayudan) |
| ☐ | `INFORME_RESPALDO_EN_GITHUB`, `R2_ARCHIVO`, `R2_PIEZAS`, `REVISION_DEL_ARCHIVO`, `SITEMAP_DEL_ARCHIVO`, `SITEMAP_PARTIDO`, `TARJETAS_EN_R2`, `TOPE_DE_NOTAS` | Ningún workflow activo ni `v3/` las lee (`grep`) | Nada; se pueden volver a crear con el valor que figura en la lista |
| — | **No borrar:** `EFEMERIDES_V3_ACTIVAS`, `FOTOS_PROPIAS_ACTIVAS`, `R2_RENDER`, `R2_RESPALDOS`, `V3_AUDIOS_POR_DIA` | Las usan workflows 3.0 o su prueba | Se apagan las efemérides, las fotos propias o el respaldo |

### 9.3 Cloudflare (no hay acceso desde acá: **[verificar en el panel]**)

| ☐ | Recurso | Evidencia | Si se borra por error | Reversible |
|---|---|---|---|---|
| ☐ | Worker `radar-balcarce-tareas` | `infra/tareas-cloudflare/`; `/video/` ya lo sirve `radar-redes` | **Videos ya programados en Buffer con la dirección vieja dejan de verse** | **Irreversible el Worker** (el código está en git: se vuelve a subir) |
| ☐ | Worker `radar-balcarce-reloj` | `infra/reloj-cloudflare/` | Si es el que despierta algo que no sé, algo deja de salir | Código en git |
| ☐ | Worker `radar-balcarce-vigilante`, `radar-balcarce-motor` (y Workers Builds), `radar-balcarce-archivo`, `radar-balcarce-imagenes`, `radar-balcarce-enlaces` | Viejos; `APAGAR-EL-VIEJO.md` § 3, paso 6 | Bajo | Código en git |
| ☐ | Cloudflare Pages `radar-balcarce` | Sitio viejo | Bajo | Código en git, pero reconstruir tarda |
| ☐ | Cron de cron-job.org | Pausado | Nada | — |
| **NO** | **Depósitos R2** `radar-fotos`, `radar-render`, `radar-archivo`, `radar-motor`, `radar-tareas`, respaldos | Guardan datos | **Pérdida de datos** | **IRREVERSIBLE** |
| **NO** | Base D1 `radar-nucleo` y los Workers del 3.0 | El sistema vigente | Se cae todo | Irreversible la base |

### 9.4 Repositorio y carpetas

| ☐ | Qué | Evidencia | Si se borra por error | Reversible |
|---|---|---|---|---|
| ☐ | `radarbalcarce/radar-balcarce-render` | Público; última corrida 3/11; el 3.0 no lo nombra | Nada; si se quiere B se vuelve a armar | **Irreversible** (no hay copia): mejor **archivarlo** (Settings → Archive), que sí se deshace |
| ☐ | `infra/` y `infra/render-publico/` | Copia vieja | Nada (queda en el historial de git) | Reversible (git) |
| ☐ | Carpetas viejas `ingesta/`, `redes/`, `reels/`, `web/`, `panel/`, `pruebas/` | **21 archivos de `v3/` las importan** | Se rompen los reels y escenas | Reversible (git) pero **no hacer hasta mudar esos archivos a `v3/`** |

## 10. Pruebas: achicar y unificar sin perder cobertura legal

**Estado:** 3.0: 76 archivos, 1.096 pruebas, 35 a 95 s. Viejo: 265 archivos en `pruebas/`; `pruebas.yml` ya no los corre.

**Se pueden retirar ya** (ninguna protege código que el 3.0 importe): lo del motor, la web y el panel viejos: `archivo*`, `armado-vacio`, `auditoria*`, `celular*`, `panel-*`, `pistas*`, `nota-de-pista`, `notas-de-pistas`, `notas-de-redaccion`, `revision-archivo`, `revision-fuentes`, `motor-*`, `minutos-de-workers-builds`, `ciclo-de-facturacion`, `reloj*`, `tareas-cloudflare`, `desplegar-nube`, `vigilante-*`, `informe-*`, `popularidad-*`, `estadistica-*`, `seo*`, `sitemaps-noticias`, `portada`, `tablas-*`, `titulos-*`, `una-compilacion`, `menos-*`, `next-16`, `redirects`, `velocidad-html`, `ilustrar-notas`, `fotos-en-r2*`, `enlaces-cortos`, `render-publico`, `pausa-general`, `numeros-panel`, `escribir-panel`, `presentacion-celular`, y las de ingesta/cruce/selección/secciones del sistema viejo (`cruce*`, `repetidas*`, `secciones-*`, `lectura-ia`, `reescritura`, `entrada*`, `de-aca`, etc.) **cuando el 3.0 tenga su equivalente legal** (ver abajo: antes de retirarlas, copiar sus casos a `v3/`).

**Las que protegen código que `v3/` todavía importa** (no retirar hasta mudar el código a `v3/`): para `reels/placa.mjs`: `placas`, `placa-*`, `colores-placas`, `formatos`, `movimiento-300`, `animacion`; para `reels/animacion`, `escenas/*`, `reel.mjs`: `animacion`, `escenas`, `escenas-del-plan`, `repaso-animado`, `reel-dos-placas`, `subtitulos-sin-encimar`, `utiles-redes-324`; para `reels/voz.mjs`: `voz`, `subtitulos-sin-encimar`; `web/lib/tarjeta-diseno.js`: `placas`; `web/lib/ruta.js`: `ruta`; `redes/meta.mjs`: `instagram-duplicados`, `facebook-foto`, `foto-cambiada`, `meta-tiempo`, `redes`; `redes/buffer.mjs`: `buffer`; `redes/participa.mjs`: `placa-participa`, `saludo-no-repetido`; `ingesta/utiles.mjs`: `farmacias`, `fechas-balcarce`, `historias-largas`, `notas`; `ingesta/alertas.mjs`: `clima`. (Aproximadamente 35 archivos.) Los archivos `redes/texto.mjs`, `redes/db.mjs`, `redes/piezas/fotos.mjs` y `reels/escenas/fechas.mjs` no tienen una prueba en `pruebas/`: ahí hay que escribir una.

**La cobertura legal (menores, víctimas, sepelios, marcas, tono)** hoy está en dos lugares: `pruebas/nucleo-legal.txt` (24 archivos del sistema viejo: `semaforo`, `exenciones`, `verificar`, `fotos-menores-oficiales`, `fotos-controles`, `copia-de-afuera`, `repetidas-*`, etc.) y en el 3.0 (`v3/nucleo/elegir`, `redactar/verificar`, `leer`, `fotos`, `redes/tono`, `redes/elegir`, `sitio/cierre`). **Antes de borrar el viejo:** una persona (Claude) tiene que confirmar, caso por caso, que cada caso del `nucleo-legal.txt` existe en `v3/`.

**Criterio simple: «una regla, una prueba».**
1. Cada regla de `v3/*/REGLAS.md` nombra **un** archivo de prueba y **un caso real** (el nombre o la fecha de lo que salió mal).
2. Una prueba controla que cada regla nombre un archivo que existe (como la que ya hace `pruebas/10-REGLAS`), pero sobre `v3/`.
3. Un archivo por regla: se unen las que prueban lo mismo con distintos nombres (hoy hay varias `…-17-10`, `…-24-10`, `…-323`: nombres por fecha, no por regla).
4. Lo legal tiene su carpeta y su comando: `v3/legal/` con `npm run test:legal` (menores, víctimas, sepelios, marcas de agua, tono, semáforo rojo). Corre en cada despliegue; si falla, no se despliega.
5. Lo que no es legal ni de una regla (formato, estética) corre sólo los lunes.

Con eso, «Pruebas» en cada subida baja a lo legal (unos 10 segundos) y se gastan menos minutos.

## 11. Pasos únicos de Hernán, numerados y cortos

1. **Mirar las fechas** (15 min): la llave del reloj en GitHub (punto 5, paso 3); la de Cloudflare (My Profile → API Tokens); la de Meta (Access Token Debugger). Pasárselas a Claude, **sin pegar las llaves**.
2. **Sacar la llave del reloj nueva sin vencimiento** (10 min): punto 5, pasos 4 a 11.
3. **Decidir A+** (sí/no): sacar lo delicado del repositorio público.
4. **Dominio:** DonWeb → renovar por varios años y dejar la renovación automática.
5. **Gemini de respaldo:** confirmar que la tarjeta de Google no vence antes de 2028 y que el tope de US$ 10 mensuales sigue.
6. **Marcar los casilleros de la lista para borrar** (punto 9). Claude los borra de a uno, con su OK.
7. **Si hace falta el panel viejo del celular**, decírselo a Claude (se volvió a desactivar el workflow `Panel del celular`).
8. **Cuando suene un aviso de vencimiento por Telegram:** renovar y avisarle a Claude para que cargue la fecha nueva.

## 12. Qué mirar una vez por mes, en 5 minutos

1. **El informe de las 8:00 de Telegram**: ¿llegó todos los días? Si faltó uno, avisar.
2. **`radarbalcarce.com`**: abrir la portada; las notas de más arriba son de hoy.
3. **Una red** (Facebook o Instagram): ¿hay posteos de esta semana? Y Threads/Bluesky.
4. **Los avisos de vencimiento** (el resumen de los lunes): ¿hay algo en rojo?
5. **GitHub → Actions:** que «Radar 3.0: piezas de redes» tenga corridas verdes de hoy (sin cruces rojas).
6. **Mail de `radarbalcarce@gmail.com`:** buscar «vence», «expira», «renovar» y «verificación» de Google, Meta, Cloudflare, GitHub, DonWeb y Buffer.
7. **Gasto de IA**: que el aviso de gasto no esté en rojo (la vigilancia lo dice en el informe).
8. Si algo falla, abrir los cuatro `/salud` (núcleo, redes, telegram, vigilancia) y mandarle a Claude la captura.

*Si este documento y el código no coinciden, manda el código y se corrige este documento.*
