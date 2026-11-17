# Radar Balcarce

*Reescrito el 17/11/2026 para Radar 3.0, que es el sistema vigente (en `v3/`; empezar por `docs/3-0/LEEME.md`). Corto a propósito: el detalle está en el `REGLAS.md` de cada
carpeta de `v3/` y en `docs/3-0/`. **Si esto y el código no coinciden, manda el código, y se corrige esto.** El CLAUDE.md anterior (el del sistema viejo, con las reglas R1 a R41 y
toda su historia) quedó entero en `docs/historico/CLAUDE-SISTEMA-VIEJO.md`.*

Medio digital automático de Balcarce (Buenos Aires), en `radarbalcarce.com`. Cada 15 minutos lee unos 95 feeds activos (hoy 95 de 126 en `v3/nucleo/fuentes.json`), junta la misma noticia
contada por varios medios, decide qué publicar, la escribe con IA, la verifica contra las fuentes y la publica en el sitio; varias veces por día arma reels, historias y posteos con voz para
Facebook e Instagram (y TikTok, YouTube y X por Buffer; Threads y Bluesky con enlaces), todo sin nadie despierto. Los usuarios son Hernán y Andrés (no programan): escribir siempre en
castellano rioplatense, claro y sin voseo forzado. **Ahorrar tokens es regla (Hernán, 1/11/2026):** el modelo grande sólo orquesta y decide; lo mecánico (buscar, medir, exportar, código de
rutina, revisar) va a subagentes chicos (`haiku`, `sonnet`), y lo que se pueda resolver con un script o un workflow se automatiza en vez de hacerlo a mano con el modelo.

**Marca (12/11/2026):** antes de armar cualquier imagen, placa, gráfico, pieza de redes o página, mirar `docs/3-0/MANUAL-DE-MARCA.html` (hay `.pdf`): colores por sección, letras, firma de cierre,
formatos y lo que nunca se hace. Formato de imágenes compartibles: `docs/3-0/FORMATO-DE-IMAGENES.md`.

## Cómo está armado

Todo es JavaScript sin dependencias, en Workers de Cloudflare; cada módulo de `v3/` trae su `REGLAS.md` (qué hace, en palabras de una persona) y sus pruebas. Una regla que no está en un `REGLAS.md` no existe.

    v3/nucleo/      Worker radar-nucleo, cada 15 min: leer fuentes, agrupar repetidas, elegir, redactar, verificar, fotos, nota diaria del clima, respaldo de la base.
                    Base D1 `radar-nucleo`; R2 `radar-fotos`. Interruptor de publicar: NUCLEO_PUBLICA. Fuentes: fuentes.json (se genera: ver "Dónde tocar")
    v3/sitio/       Worker radar-sitio: arma cada página de radarbalcarce.com desde la base (portada, secciones, notas, clima, farmacias, dólar, agenda, SEO, avisos, panel /panel)
    v3/redes/       Worker radar-redes: decide qué sale a las redes y despierta los workflows que dibujan; piezas/ (reels, placas, voz), efemerides/, una carpeta por red
    v3/redaccion/telegram/   Worker radar-telegram, el bot @radarbalcarce_bot: notas propias de Hernán, retirar/corregir, /redes y /repaso
    v3/vigilancia/  Worker radar-vigilancia: chequeo cada 30 min, informes de las 8 y las 20 por Telegram
    .github/workflows/v3-*.yml   lo que corre en GitHub Actions: desplegar, piezas de redes (video con voz), fotos propias, estadísticas, respaldo de la base, efemérides, notas a mano
    Sistema viejo: ingesta/, reels/, redes/, panel/, web/, infra/, pruebas/ (ver la última sección). No se tocan sin preguntar: el código 3.0 todavía importa 21 archivos de ahí.

**Quién despierta qué.** El reloj de las piezas y de las fotos es el Worker `radar-redes` (cron de Cloudflare → API de GitHub con el secreto `RELOJ_GITHUB_TOKEN`; `v3/redes/disparar-acciones.mjs`,
`v3/redes/REGLAS.md` § 14): GitHub llega a lanzar sus `schedule:` hasta 9 horas tarde. Si ese token vence, **dejan de salir reels, historias y fotos propias**: es el punto único de falla
(`docs/3-0/AUDITORIA-SISTEMA-17-11.md`, H-01). El resto corre solo en su Worker. Los cuatro `/salud` (`radar-nucleo`, `radar-redes`, `radar-telegram`, `radar-vigilancia`, en `workers.dev`) dicen cómo está cada módulo.

## Comandos

    node --test "v3/**/*.test.mjs"                    las pruebas de la 3.0 (correr SIEMPRE antes de commitear; sin red)
    node --test v3/redes/disparar-acciones.test.mjs   un módulo
    node v3/nucleo/scripts/generar-fuentes.mjs        rehace v3/nucleo/fuentes.json (después de tocar scripts/generar-fuentes.mjs)
    node v3/sitio/scripts/lecturas.mjs                lecturas del sitio (contador propio)
    gh workflow run "Radar 3.0: desplegar" -f que=<telegram|nucleo|sitio|redes|vigilancia|fotos|migrar>   despliega (ver "Cosas que muerden")

## Reglas que no se negocian

(Autoridad: el `REGLAS.md` de cada módulo; las legales y editoriales están en `v3/nucleo/REGLAS.md` § 4 y `v3/nucleo/redactar/REDACCION.md`. Estas siguen vigentes desde el sistema viejo.)

- **Nunca identificar a un menor ni a una víctima, ni publicar listas de sepelios.** Son los dos frenos legales: los aplica la IA en el mismo pedido de redacción con la marca `no_publicar`.
  **No tocar esa lista sin preguntar a Hernán.** Lo rojo no sale a ningún lado.
- **Nunca una marca de agua ni el nombre de otro medio pegado encima de una imagen**: el crédito va en el epígrafe o en el pie. Nunca foto real de un menor o una víctima. La foto de una nota con
  fuentes sale de las fuentes de esa nota (Wikimedia Commons no ilustra notas con fuentes; sólo la efeméride de «Un día como hoy» la usa, por decisión de Hernán). Sin foto que sirva, placa
  de la sección o ilustración con IA declarada.
- **Lo que escribe la IA se verifica contra la fuente** (`v3/nucleo/redactar/verificar.mjs`). **Cada nota dice quién la escribió** (firma «Radar Balcarce» en las automáticas; «Hernán Accomo» en las propias).
  Lo de afuera sin vínculo con la Argentina no se publica. Cada nota lleva dos pedidos a la IA (redactar y verificar), y lo que no pasa la verificación no sale (`v3/nucleo/REGLAS.md` § 5).
- **Todo lo que habla lleva el aviso «Voz generada con inteligencia artificial.»** y **nada sale a redes sin pasar la compuerta de tono (R41):** ni la muerte de un menor o un bebé, ni un suicidio.
  Todo lo que va a Instagram es video con voz, salvo el espejo de cada posteo de Facebook. **Nunca con otra voz:** si no hay cupo, la pieza no sale.
- **Tokens y claves nunca en un chat ni en el código.** Van a GitHub Secrets o al panel de Cloudflare, y los pega una persona. El repositorio es **público** (todavía): no subir material con
  teléfonos, contactos o borradores (la grilla, `scripts/pc/`, `docs/3-0/notas-propias/`; ver H-08 de la auditoría).
- **Volumen de notas:** el tope nacional (60 por día, 4 medios, 2 en áreas chicas, 3 el fin de semana) lo cambia sólo Hernán: dijo que **no se baja**. Balcarce entra siempre, con una sola fuente.
- **AdSense:** no pedir la revisión hasta que Hernán lo autorice, después de 3 a 4 semanas de contenido propio y firmado. Nunca poner como propio lo que no lo es.
- **No gastar voz ni IA "para probar"** en CI ni a mano: el cupo de voz (15 audios por día) y el freno mensual de Gemini (US$ 7) son plata o cuota real.

## Cosas que muerden

- **Los archivos del repo están en CRLF.** En scripts, editar por líneas; un `\n` literal en un reemplazo multilínea no encuentra nada. Para regex con `\b`, `\s`, `\d`: escribir un `.cjs` con Write, no `node -e` ni un heredoc.
- **Despliegues:** se piden a mano, uno solo por vez y sin juntarlo con un commit; antes, `gh api user` tiene que dar **radarbalcarce**. El permiso automático a veces bloquea el comando: pedir el OK a Hernán en el chat y reintentar.
  Cambiar un `wrangler.toml` o un `.mjs` de un Worker no sube nada hasta desplegar ese módulo. Cambiar un workflow `.yml` sólo vale después de subirlo (push).
- **Antes de `git push`, `git pull --rebase`.** Commitear sólo los archivos tocados (`git commit -- archivos`). El correo de los commits automáticos es el noreply de GitHub: no cambiarlo.
- **Cuentas:** siempre `radarbalcarce@gmail.com` (Chrome, Cloudflare, GitHub, Google, Meta). Nunca otra.
- **`REDES_ACTIVAS` manda en `v3/redes/wrangler.toml`** (hoy «si»: publica de verdad). Las variables de GitHub `REDES_ACTIVAS = No` y `REDES_ACTIVAS_NUBE = No` son del sistema viejo y **no mandan sobre la 3.0**, pero confunden.
- **Una sola fuente de verdad por número:** el cupo de voz (15) vive en `v3/redes/piezas-plan.mjs` (`REGLAS_PIEZAS.audiosPorDia`); una prueba controla que `piezas/variables.mjs`, `reels/cupo-voz.mjs`, `wrangler.toml` y los documentos digan lo mismo.
- **Cron de Cloudflare:** el plan gratis da cinco por Worker; `radar-redes` ya usa los cinco. Un trabajo nuevo se suma con el campo `ademas` de `DISPAROS` (`disparar-acciones.mjs`), a una hora fija, no con un cron nuevo.
- **Las palabras clave cortas engañan** y las secciones son catorce (Balcarce, Política, Policiales, Educación, Salud, Fútbol, Deportes, Automovilismo, Agro, Economía, Ciencia, Cultura, Tecnología, Argentina).
- **El turno de farmacia dura hasta las 8:30 del día siguiente.** Si Open-Meteo falla, el clima sale con su plantilla sin IA.
- **Hora de Balcarce = UTC−3 todo el año.** Los crons de Cloudflare son UTC.
- **Vencimientos** (tabla en `docs/3-0/VIGILANCIA-Y-VENCIMIENTOS.md`): voces propias 29/09/2027, dominio 21/09/2027, `security.txt` 7/11/2027, token de Threads (60 días, **renovar**), tokens de GitHub (el «Vigilante de Cloudflare (lectura)» venció el 14/11), token de Meta (**no verificado**).
- **Ahorro de IA:** Gemini texto (`gemini-3.1-flash-lite`, clave paga con freno mensual de US$ 7), Mistral de respaldo (gratis), Workers AI para huellas e ilustraciones. Claves de voz aparte (`GEMINI_API_KEY_REDES`).

## Dónde tocar cada cosa

| Quiero… | Dónde |
|---|---|
| Sumar, apagar o corregir una fuente | `v3/nucleo/scripts/generar-fuentes.mjs` (`APAGAR`, `ENCENDER`, `NOTAS`, `SUMAR`, `CORREGIR_URL`) y después `node v3/nucleo/scripts/generar-fuentes.mjs`: **`fuentes.json` se genera, no se edita** |
| Cuántos medios pide lo de afuera, tope por día, fin de semana | `v3/nucleo/wrangler.toml` (`NUCLEO_MINIMO_NACIONAL`, `..._FINDE`, `..._AREAS_CHICAS`, `NUCLEO_TOPE_NACIONAL`); `v3/nucleo/REGLAS.md` § 4 |
| Cómo escribe y verifica la IA | `v3/nucleo/redactar/REDACCION.md` y `verificar.mjs`; lo que sabe de Balcarce, `v3/nucleo/PERFIL.md` |
| Fotos (elegir, copia propia, ilustración, foto de archivo) | `v3/nucleo/fotos/`, `v3/nucleo/ilustrar/`, `v3/sitio/fotos-copia.mjs`, `v3/sitio/foto-proxy.mjs`; `v3/nucleo/REGLAS.md` § 7 |
| Una página, SEO, avisos, cookies | `v3/sitio/` (`sitio.mjs` rutas, `vistas/`), `v3/sitio/REGLAS.md` |
| Qué sale a redes y cuándo | `v3/redes/elegir.mjs` (posteos), `piezas-del-dia.mjs` (tabla de piezas con hora), `piezas-plan.mjs` (plan y cupo de voz), `redes.mjs` (la vuelta); resumen para personas: `docs/3-0/CONTENIDO-REDES-3-0.md` |
| El dibujo o el guion de una pieza | `v3/redes/piezas/` (`armadores.mjs`, `escenas.mjs`, `variables.mjs`); `v3/redes/piezas/REGLAS.md` |
| Efemérides («Un día como hoy») y feriados | `v3/redes/efemerides/`, `web/data/efemerides-piezas.json` (121 días armados de diciembre a marzo), `v3-efemerides.yml` (arma el mes que viene el día 20) |
| Quién dispara los workflows y a qué hora | `v3/redes/disparar-acciones.mjs` + `v3/redes/wrangler.toml` (los dos tienen que decir lo mismo: una prueba lo controla) |
| Notas propias, /retirar, /corregir, /redes, /repaso | `v3/redaccion/telegram/` (`administrar.mjs`, `nota-propia.mjs`); `docs/3-0/TELEGRAM.md` |
| Qué vigila la vigilancia y a quién avisa | `v3/vigilancia/`; `docs/3-0/VIGILANCIA-Y-VENCIMIENTOS.md` |
| Avisos publicitarios | `docs/3-0/PUBLICIDAD.md`, `v3/sitio/scripts/cargar-aviso.mjs` |
| Estadísticas | `v3/redes/estadisticas.mjs`, `docs/3-0/ESTADISTICAS-DIARIAS.md` |
| Qué hay pendiente | `docs/3-0/PENDIENTES-3-0.md` (la única lista de tareas) |

## Cuentas

- **GitHub:** cuenta de `radarbalcarce@gmail.com`, repositorio `radarbalcarce/radar-balcarce`, **público** todavía (pasarlo a privado está pendiente: `PENDIENTES-3-0.md`).
- **Todo lo demás:** `radarbalcarce@gmail.com` (Cloudflare, Google/Gemini, AdSense `pub-2759023791445864`, Search Console, Meta, Buffer).
- **Meta:** app «Radar Balcarce Publicador», página de Facebook «Radar Balcarce» (ID `1254237411116171`), Instagram `@radarbalcarce`. Token en el secreto `META_TOKEN`.
- **Dominio** `radarbalcarce.com` (DonWeb), vence el **21/09/2027**. WhatsApp del medio: 2266 51-1612. Mail: `contacto@radarbalcarce.com`.

## Documentos

Empezar por **`docs/3-0/LEEME.md`** (índice) y **`docs/3-0/UN-DIA-DEL-SITIO.md`** (cómo funciona hoy, hora por hora). Los que más se usan: `docs/3-0/REDES.md` y `docs/3-0/CONTENIDO-REDES-3-0.md` (qué sale en cada red),
`docs/3-0/TELEGRAM.md`, `docs/3-0/PENDIENTES-3-0.md`, `docs/3-0/AUDITORIA-SISTEMA-17-11.md` y `AUDITORIA-SITIO-17-11.md` (estado verificado del 17/11), `docs/3-0/PLAN-DE-TRABAJO-17-11.md`,
`docs/3-0/APAGAR-EL-VIEJO.md` y los dos criterios (`CRITERIO-EDITORIAL.md`, `CRITERIO-REDES.md`, que el código 3.0 todavía cita).

## Sistema viejo (en retirada)

El sistema anterior (`ingesta/`, `reels/`, `redes/`, `panel/`, `web/`, `infra/`, `pruebas/`, con GitHub Actions y Workers Builds) quedó **apagado en lo que publicaba**: su reloj y su vigilante no tienen horarios,
12 de sus workflows están desactivados y la red de seguridad del sitio viejo (`RESPALDO_VIEJO`) está en «no». **Pero no se puede borrar todavía:** el código de `v3/` importa 21 archivos de esas
carpetas, quedan Workers y secretos viejos sin apagar (`OPENROUTER_API_KEY`, `WHATSAPP_*`) y el repositorio es público. Se apaga de a un paso por día con `docs/3-0/APAGAR-EL-VIEJO.md`.
`npm test` (la carpeta `pruebas/`) es del viejo: ya no es la vara de la 3.0. Su CLAUDE.md completo, con las reglas R1 a R41, está en `docs/historico/CLAUDE-SISTEMA-VIEJO.md`; la historia de las reglas 1 a 327, en `docs/historico/REGLAS-1-A-327.md`.
