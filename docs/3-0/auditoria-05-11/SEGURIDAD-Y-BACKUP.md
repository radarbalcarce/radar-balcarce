# Seguridad y respaldo de Radar 3.0, 5/11/2026

*Hecha el 5/11/2026 leyendo el código de `v3/`, los workflows `v3-*.yml` y el historial reciente de git. No se desplegó nada, no se corrió ningún workflow, no se tocó producción y no se borró nada. Todo lo arreglado tiene su prueba (`node --test`); las 659 pruebas de `v3/` pasan. Para Hernán y Andrés.*

## En una línea

No hay claves filtradas, el HTML escapa todo lo que viene de la base y los workflows ya estaban bien armados. Lo más importante que había era **que no existía copia de la base D1**: ahora hay un respaldo diario listo para activar (queda esperando que una persona lo corra una vez). Encontré **una cosa que tiene que decidir Hernán**: sus mensajes de Telegram se están guardando en el repositorio público.

---

## 1. El respaldo de la base (lo pedido en el punto 1)

| Qué | Dónde |
|---|---|
| Workflow diario (4:20 de Balcarce) y a mano | `.github/workflows/v3-respaldo-d1.yml` |
| El programa (exporta, controla, comprime, sube, verifica, restaura de prueba, poda) | `v3/nucleo/scripts/respaldo-d1.mjs` |
| Pruebas (14: nombres, poda, controles del volcado, orden de la corrida, restauración de prueba con SQLite de verdad) | `v3/nucleo/scripts/respaldo-d1.test.mjs` |
| Cómo se restaura, paso a paso, y la propuesta para las fotos | `v3/nucleo/REGLAS.md`, § 13 |

**Decisiones y por qué:**

- **Depósito `radar-render`, carpeta `respaldos/d1/AAAA-MM-DD.sql.gz`.** Las claves de R2 que ya están en GitHub escriben ahí (las usan las piezas de redes): no hace falta crear ninguna clave nueva. `radar-fotos` la sirve el Worker del sitio al público, y una base con borradores y notas propias no debe vivir al lado de lo que se sirve. Condición: `radar-render` tiene que seguir **sin acceso público** (hoy sólo se sirve por `/placa/…` del Worker de redes).
- **Se conservan los últimos 30 días y el primer respaldo de cada uno de los últimos 12 meses** (unos 40 archivos). Los 30 diarios alcanzan para un error que se nota en un mes; el mensual sirve para algo que se descubre tarde (una nota mal publicada hace tres meses). Sólo se borran archivos con exactamente ese formato de nombre.
- **Orden pensado para no perder nunca lo que ya hay:** exportar → controlar que parezca una base de verdad → subir → bajar de vuelta y comparar → **restaurarlo de prueba** en una base SQLite en memoria (cuenta notas, historias y artículos) → recién ahí podar. Si algo falla antes de podar, no se borra nada y llega un aviso por Telegram.
- **El volcado nunca es un adjunto de la corrida:** el repositorio es público y los adjuntos se pueden bajar. Tampoco se imprime ni se commitea (`.gitignore` ahora ignora `*.sql.gz`, `.dev.vars` y `respaldo-d1-*/`).
- **Time Travel de D1 es el primer recurso** (Cloudflare guarda solo los últimos días y se restaura en el lugar con un comando); el respaldo propio cubre lo que Time Travel no: la base borrada o un problema de hace más de una semana. Los dos caminos, con comandos, están en el § 13.
- **Una cosa a saber:** exportar bloquea la base unos segundos. Por eso está a las 4:20 y en el minuto :20 (la vuelta del núcleo sale a los :00, :15, :30 y :45). Si justo cae una, esa vuelta falla y la repite la siguiente.

**Fotos (`radar-fotos`), propuesta sin implementar** (detalle en el § 13): hoy nada es irrecuperable, porque las copias conservan su dirección original, las de `fotos-notas/` están en el historial del repositorio viejo y en `radar-archivo`, y las tipografías están en el repositorio. Por eso la prioridad es baja. Si se quiere: (1) por ahora, nada (el respaldo de la base guarda las direcciones originales); (2) un segundo depósito en la misma cuenta copiando sólo lo nuevo cada día (las claves son el contenido, así que lo ya copiado no cambia): protege de un borrado por error, cuesta centavos y **exige ampliar el permiso de las claves de R2**; (3) una copia fuera de Cloudflare, mensual: la única que protege de perder la cuenta, y **exige una cuenta y una clave nueva**. No hice ninguna porque piden claves.

**Qué falta para activarlo (lo hace una persona):** ver «Lo que queda para una persona», puntos 1 y 2.

---

## 2. Auditoría de seguridad (punto 2)

### 2.1 Claves y tokens filtrados: sin hallazgos

- Árbol actual completo y todo el historial (5.232 commits) buscando formatos conocidos: claves de Gemini (`AIza…`), Groq (`gsk_…`), tokens de bot de Telegram (`123456789:AA…`), tokens de Meta (`EAA…`), GitHub (`ghp_`, `github_pat_`), Amazon/R2 (`AKIA…`), llaves privadas y asignaciones `token = "…"` con valores largos. Lo que apareció fue **sólo falsos positivos**: valores inventados de las pruebas (`token-de-prueba-123`, `AIzaSyABCDEFGHIJ…` en una prueba que verifica que el bot oculte una clave) e imágenes en base64.
- Ningún `.env`, `.pem`, `.dev.vars` ni archivo de secretos versionado.
- El código lee los secretos del entorno (`env.TELEGRAM_TOKEN`, etc.); los `wrangler.toml` dicen «los carga el workflow desde GitHub Secrets. Nunca acá». Gemini va por cabecera (`x-goog-api-key`), Meta por `Authorization: Bearer`, y los errores pasan por `sinToken` antes de registrarse.
- **Límite de esta revisión:** busqué por formato. El token de Cloudflare (40 caracteres sin prefijo) y las claves de R2 no tienen una forma que se pueda buscar sin falsos positivos. Si se quiere certeza total antes de pasar el repositorio a privado o público de nuevo, correr una herramienta dedicada (gitleaks o trufflehog) sobre todo el historial: no la instalé porque trae un programa nuevo.

### 2.2 Endpoints de los Workers

| Worker | Ruta | Protección | Resultado |
|---|---|---|---|
| radar-telegram | `POST /telegram` | contraseña derivada del token en `x-telegram-bot-api-secret-token` | **Arreglado:** se comparaba con `!==`; ahora en tiempo constante (`iguales`). Probado: sin cabecera, vacía, casi igual y en mayúsculas dan 403 y no guardan nada. |
| radar-telegram | `POST /decir`, `GET /entrada` | `x-radar-contrasena` | Bien (ya era tiempo constante). Prueba nueva. |
| radar-telegram | `GET /salud` | pública | **Arreglado:** decía el nombre del dueño. Ahora sólo dice desde cuándo hay uno. |
| radar-nucleo | `POST /vuelta`, `/resumen`, `GET /notas` | `x-radar-contrasena` | Bien. |
| radar-nucleo | `GET /salud` | pública | Dice la última vuelta, notas de hoy, fuentes con falla, gasto estimado en dólares y topes. Sin secretos. Queda anotado (punto F). |
| radar-redes | `/vuelta`, `/resumen`, `/piezas/*`, `/enlaces/*`, `/posteos/*` | `x-radar-contrasena` | Bien. |
| radar-redes | `GET /placa/<nombre>` | pública a propósito (Meta la baja) | Bien: el nombre pasa por una expresión estricta (`^[A-Za-z0-9_-]{1,40}-[0-9a-f]{8}\.jpg$`) y sólo lee `placas/`. |
| radar-redes | `GET /salud` | pública | Booleanos de si hay claves, nunca valores. |
| radar-vigilancia | `GET /salud` | pública | El último chequeo; sin secretos. |
| radar-sitio | todo `GET`/`HEAD` | público | Cualquier otro método da 405. **Nuevo:** `POST /csp-reporte` (ver 2.5). |

No existe ninguna ruta `/admin` ni `/estado`. Ninguna ruta pública escribe en la base.

### 2.3 Inyección en el HTML: sin hallazgos

El sitio usa `esc()` en todo lo que muestra; lo comprobé con una prueba en vez de leer 260 interpolaciones a ojo. **`v3/sitio/inyeccion.test.mjs`** arma una nota con una carga hostil (`</title><script>…`, `<img onerror>`, comillas que cierran atributos, `javascript:` y `data:` en fuentes y fotos, un ancho con `"onload=`) en **todos** los campos que el sitio muestra (título, bajada, cuerpo, en dos líneas, firma, la ficha entera, crédito y alt de las fotos, medios y enlaces de las fuentes) y mira la nota, la portada, la sección, `/hoy`, la búsqueda, el RSS, el feed de sección y los mapas. Resultado: nada queda vivo, ningún `javascript:`/`data:` llega a un `href` o `src` (`urlSegura`), los datos estructurados escapan `<` y la búsqueda devuelve lo escrito escapado, con `no-store` y `noindex`. El JSON para agentes lleva el texto crudo pero es JSON válido, con `nosniff`. También probé rutas con basura (`%3Cscript%3E`, UTF-8 roto): 404, 410 o 503, nunca reflejadas como código. Las consultas a D1 son todas con parámetros (`bind`); las pocas interpolaciones en SQL son identificadores armados por el código (o una fecha validada con expresión regular).

### 2.4 Direcciones de afuera: **hallazgo, arreglado**

El programa de las copias de fotos (`v3/sitio/scripts/copiar-fotos-de-notas.mjs`) baja la foto de la dirección que trae el feed de otro medio, desde un servidor de GitHub. Tenía tres huecos:

1. **No validaba la dirección:** una dirección `http://169.254.169.254/…` (los metadatos de la nube), `localhost` o una IP interna se pedía igual.
2. **Seguía redirecciones a ciegas** (`redirect: 'follow'`): un sitio público podía mandarlo a la red interna.
3. **Leía el cuerpo entero antes de mirar el tamaño** si el servidor no avisaba el largo: un archivo gigante se cargaba en memoria.

Lo que se devolvía igual tenía que ser una imagen (se mira por los bytes), así que no había fuga de datos, pero igual no corresponde pedir esas direcciones. **Arreglo** (`v3/sitio/direccion-publica.mjs` + `descargar`): sólo `http(s)` en el puerto de siempre, sin usuario ni contraseña, nada de `localhost`, nombres sin punto, `.local`/`.internal`, IP interna escrita de cualquier forma (decimal, hexadecimal, octal, entera) ni IPv6; las redirecciones se siguen a mano, hasta 4, validando cada una; el cuerpo se lee con tope de 15 MB y se corta apenas se pasa. Pruebas: `v3/sitio/direccion-publica.test.mjs` (30 direcciones buenas y malas, redirección a la red interna, redirecciones relativas y el tope sobre un flujo infinito); las 17 pruebas anteriores del programa siguen pasando.

*No cubierto:* un nombre público que apunte a una IP interna (no se resuelve DNS en esta capa) lo frena la red de GitHub; y los Workers del núcleo que bajan páginas e imágenes de los medios corren en Cloudflare, que no deja llegar a redes privadas. Anotado, sin cambio.

### 2.5 Content-Security-Policy, sólo para informar: agregada

- Cabecera **`Content-Security-Policy-Report-Only`** en todas las páginas HTML del sitio (no en RSS, mapas ni robots), con una política que permite lo que cargan hoy AdSense, Google Analytics, Cloudflare Analytics y las fotos de otros medios, y cierra lo que nadie usa (`object-src 'none'`, `base-uri`, `frame-ancestors 'self'`, `form-action 'self'`). **No bloquea nada**: es el mismo aspecto, los mismos anuncios. Si la respuesta ya trae una CSP (el panel, el sitio viejo), no se pisa.
- Los avisos de lo que habría bloqueado llegan a **`POST /csp-reporte`**: cuerpo de hasta 8 KB (413 si se pasa, aunque no avise el largo), responde 204, y anota **sólo** una línea en el registro del Worker (regla, página sin parámetros y lo bloqueado sin parámetros). No guarda nada en la base.
- Limitaciones honestas: lleva `'unsafe-inline'` porque las páginas tienen scripts y estilos escritos adentro (pasar a «nonces» es un trabajo aparte); `img-src https:` por las fotos ajenas (cuando las copias propias cubran todo se puede cerrar).
- Para verla trabajar: `npx wrangler tail radar-sitio` (o los registros del Worker en Cloudflare) y buscar `csp-reporte`. **Pasar a bloquear** sólo después de dos semanas sin avisos inesperados y con el visto bueno de una persona (basta cambiar el nombre de la cabecera en `sitio.mjs`).
- Pruebas (6) en `v3/sitio/seguridad.test.mjs`.

### 2.6 Workflows de 3.0

- **Permisos mínimos:** los 7 declaran `permissions:` arriba y sólo piden `contents`. Escriben (`contents: write`) únicamente `v3-nucleo` y `v3-telegram`, que guardan un archivo en el repositorio. Los demás, `read`.
- **Inyección de comandos:** ningún `${{ inputs.* }}` ni `github.event.*` va pegado dentro de un comando: todos entran por `env:`. Una prueba nueva lo vigila para los 7 workflows (`v3/nucleo/workflows-v3.test.mjs`).
- **Hallazgo chico, arreglado:** «retirar una nota» (`v3-nucleo.yml`) validaba el id con `echo "$NOTA" | grep -Eq '^[a-z0-9]{3,30}$'`; `grep` mira línea por línea, así que un valor de dos líneas (la primera buena) pasaba y llegaba a la consulta SQL. Ahora es `[[ "$NOTA" =~ ^[a-z0-9]{3,30}$ ]]`, que mira el texto entero. Sólo lo puede disparar quien ya tiene permiso de escribir en el repositorio, por eso es chico; igual está cerrado.
- **Versiones de las acciones:** todas están fijadas por versión mayor (`actions/checkout@v4`, `setup-node@v4`, `cache@v4`, `upload-artifact@v4`) y son de GitHub mismo; `wrangler` va fijado (`@4.139.0`) y el servidor, en `ubuntu-24.04`. No hay acciones de terceros. Fijar por código exacto (SHA) sería más estricto pero no cambia el riesgo real mientras sean sólo de GitHub; recomiendo activar **Dependabot** para las actualizaciones (punto G). La prueba nueva obliga a que toda acción futura tenga versión fija.
- **Secretos:** ninguno se imprime (prueba). El nuevo respaldo usa sólo secretos que ya existen.
- **Adjuntos:** los que se suben (`fotos-copia.json`, videos y registro de piezas) son contenido público de todos modos; el respaldo de la base **no** se sube como adjunto (prueba).

### 2.7 Límites de tamaño y frecuencia

- **Formularios:** el sitio no tiene ninguno que escriba: sólo la búsqueda (`GET`), con la consulta cortada a 80 caracteres, comodines escapados y página `no-store`. Los pedidos con cuerpo de las rutas privadas (`/decir` máx. 50 textos) ya piden contraseña.
- **Frecuencia:** el código no limita pedidos por IP (un Worker no puede hacerlo bien sin estado). Los puntos débiles son (a) `/buscar`, que cada vez va a D1 sin caché, y (b) los 404/410 de notas inexistentes, que tampoco se guardan (sólo se guardan los 200) y consultan D1; (c) `/csp-reporte`. Ninguno gasta IA ni dinero fuera de lecturas de D1, pero un robot insistente puede subir el uso. La solución es una **regla de límite de pedidos en Cloudflare** (punto B), no código.
- **Cabeceras:** el sitio ya tenía HSTS, `nosniff`, `Referrer-Policy` y `X-Frame-Options` y el 301 de http a https (el hallazgo 5 de la auditoría técnica ya estaba resuelto en el código).

### 2.8 Lo que está bien y no hizo falta tocar

`urlSegura` y `urlDeImagen` (sólo `http(s)` o rutas propias), `rel="sponsored noopener"` en los avisos, validación de los identificadores de AdSense, GA y Cloudflare Analytics antes de ponerlos en la página, `www` → apex sin armar la dirección con datos del pedido, el sitio viejo como respaldo (no manda cookies, no se llama a sí mismo, rechaza `radarbalcarce.com` como origen), `.ics` con escape, nombres de archivo del depósito con lista cerrada de caracteres.

---

## Lo que queda para una persona

Ordenado por importancia. «Hernán» decide; «Andrés o Claude con permiso» ejecuta.

1. **Activar el respaldo (5 minutos, dos corridas).** GitHub → Actions → «Radar 3.0: respaldo de la base» → Run workflow → tildar **simular** → ver que termine verde y que el resumen diga filas de notas, historias y artículos. Después correrlo **sin** simular y mirar en Cloudflare → R2 → `radar-render` → `respaldos/d1/` que aparezca el archivo. Hacerlo de noche o aceptar unos segundos de base bloqueada. Si falla con 403 en R2 o en la base: la clave de R2 no llega al depósito o el token de Cloudflare no puede leer D1; ver el mensaje del paso «Respaldar la base» (no incluye datos ni claves).
2. **Confirmar que `radar-render` es privado** (Cloudflare → R2 → `radar-render` → Settings: «Public access» y «r2.dev» apagados, sin dominio propio conectado) y que **no tiene una regla de ciclo de vida que borre `respaldos/`**.
3. **Mensajes de Hernán en el repositorio público (decide Hernán).** El workflow «Telegram: leer» commitea todo lo que Hernán le contesta al bot, **transcripto**, en `v3/redaccion/telegram/entrada/` (hoy `2026-11-02.md`: un audio de dos minutos sobre cómo ven el medio y los comerciantes). No hay claves ni datos de terceros, pero es una conversación privada y el repositorio es público. No lo toqué (no se borra nada sin pedirlo). Opciones: (a) pasar el repositorio a privado, que ya estaba previsto (`PENDIENTES.md`); (b) cambiar «leer» para que guarde en el KV/R2 en lugar del repositorio; (c) borrarlo del historial. Hasta decidir, **no usar el bot para pasar cosas que no quiera hacer públicas** (ni claves: ya hay una regla de nunca pegarlas en un chat).
4. **Límite de pedidos en Cloudflare (10 minutos, gratis en el plan que ya hay).** Cloudflare → radarbalcarce.com → Seguridad → WAF → Reglas de límite de pedidos: (a) ruta `/buscar`, 20 pedidos por minuto por IP, acción «bloquear 10 minutos»; (b) `POST /csp-reporte`, 30 por minuto por IP. Opcional: «Bot Fight Mode» encendido.
5. **Tokens con permiso justo.** Hoy un solo `CLOUDFLARE_API_TOKEN` hace de todo (D1, R2, Workers, rutas). Recomiendo crear uno aparte para el respaldo con **sólo «D1: Read»**, guardarlo como secreto `CLOUDFLARE_API_TOKEN_RESPALDO` y cambiar esa línea del workflow (es una línea; lo hago cuando Hernán lo pida). Y revisar que las claves de R2 estén limitadas por depósito.
6. **Dueño del bot.** Si el KV `ESTADO` se vaciara, **el primer chat que le escriba al bot pasa a ser el dueño**. Hoy es un riesgo bajo (hay dueño guardado), pero se cierra con una variable `DUENO_CHAT` con el número de chat de Hernán que el bot exija; lo implemento si Hernán lo aprueba (es poco código, pero cambia cómo arranca el bot).
7. **Dependabot** para las acciones de GitHub (un archivo `.github/dependabot.yml`); no lo agregué porque abre pull requests solos y eso lo decide Hernán.
8. **Workers con dirección pública `workers.dev`:** los cinco la tienen. Las rutas peligrosas piden contraseña, pero `/salud` del núcleo muestra el gasto estimado en dólares y las fuentes con falla. Se puede apagar `workers_dev` en los que sólo se usan por *service binding* (el núcleo y el bot lo necesitan hasta revisar cómo los llaman los workflows y la vigilancia: `DIRECCION_NUCLEO` es una URL pública). No lo cambié: puede cortar la vigilancia.
9. **Antes de pasar a bloquear la CSP:** dos semanas mirando `csp-reporte` en los registros (2.5).
10. **Una vez por trimestre:** correr una herramienta de búsqueda de secretos (gitleaks) sobre todo el historial; es lo único que mi revisión por formatos no garantiza (2.1).

## Archivos tocados

Nuevos: `.github/workflows/v3-respaldo-d1.yml`, `v3/nucleo/scripts/respaldo-d1.mjs` y su prueba, `v3/nucleo/workflows-v3.test.mjs`, `v3/sitio/direccion-publica.mjs` y su prueba, `v3/sitio/inyeccion.test.mjs`, `v3/redaccion/telegram/seguridad.test.mjs`, este informe.
Cambiados: `v3/sitio/sitio.mjs` (CSP sólo informar y `/csp-reporte`), `v3/sitio/seguridad.test.mjs`, `v3/sitio/scripts/copiar-fotos-de-notas.mjs` (descarga segura), `v3/redaccion/telegram/worker.mjs` (comparación en tiempo constante, `/salud` sin nombre), `.github/workflows/v3-nucleo.yml` (validación del id), `.gitignore`, `v3/nucleo/REGLAS.md` (§ 13).
