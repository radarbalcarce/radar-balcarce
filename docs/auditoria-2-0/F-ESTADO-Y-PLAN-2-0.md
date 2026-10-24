# Módulo F: estado real de Radar Balcarce y plan para declarar la versión 2.0

*24/10/2026. Auditoría de sólo lectura: no se tocó código, datos ni configuración. Para Hernán y Andrés. Todo lo que dice "verificado" se comprobó
contra el código de `main`, los workflows, las variables y secretos reales de GitHub (`gh variable list`, `gh secret list`, `gh run list`) y el
sitio en vivo; lo que dice "no verificado" lo afirma un documento y no pude comprobarlo desde acá (casi siempre porque vive en el panel de
Cloudflare, que no puedo leer). Donde un documento y la realidad no coinciden, mando la realidad y lo marco como DOC VIEJO.*

## 0. El resumen en diez renglones

1. **El robot ya vive en Cloudflare y anda.** Verificado: en GitHub no corre ningún "Actualizar la web" ni "Redes" ni "Vigilancia" (las últimas 40
   corridas son sólo pruebas, armado vacío, "Revisar el archivo" y "Piezas de redes" disparado por el Worker). El sitio contesta 200 y el archivo
   permanente de R2 contesta `ok: true` con 1.466 notas y 223 MB.
2. **Lo que falta para "2.0" no es construir: es cerrar.** Quedan cinco bloques: (a) apagar lo viejo de GitHub y poner el tope de gasto en US$ 0;
   (b) sacar las fotos de git (R2) y compactar el historial; (c) pasar el repositorio a privado; (d) SEO y lectores (Search Console, Bing,
   Google News); (e) ordenar las redes (qué piezas, cuántas, con qué voces).
3. **Hay un solo rojo hoy:** la prueba "una historia retoma el TEMA del repaso anterior…" falló en `main` (commit `7689ab3f`, regla 307; 1 de 3.037).
   No frena la web (la vuelta de 30 minutos sólo corre el núcleo legal) pero hay que arreglarla antes de seguir (día 1).
4. **Los documentos se contradicen.** `HOY.html` (17/10) y `PASOS-PARA-HERNAN-Y-ANDRES.html` dicen que faltan llaves que ya están cargadas
   (OpenRouter, los dos tokens de GitHub, las llaves de R2, `R2_RENDER`); `TRASPASO.md` también. `CLAUDE.md` todavía dice que la mudanza está "sin prender".
   Hay cuatro listas de pendientes. La propuesta de la sección 3 las junta en una.
5. **Repositorio privado: todavía no.** El repo pesa 291 MB (`diskUsage` de GitHub), las fotos siguen en git y quedan cosas que gastan minutos
   de GitHub (sobre todo "Pruebas" en cada cambio de código). Con tope de gasto en US$ 0, una vez superados los 2.000 minutos incluidos en el
   plan gratis, los workflows privados dejan de correr (no es un cobro, es un corte). Hay que medir antes (sección 4).
6. **Plata:** hoy se paga el dominio y Workers Paid (US$ 5 por mes). Todo lo demás es gratis. El riesgo de gasto no es Gemini sino los minutos de
   compilación de Cloudflare (Workers Builds) y los minutos de GitHub si se pasa a privado.
7. **Lo más frágil:** que dependa de que no se pierdan los avisos del reloj de Cloudflare (ya se perdió uno el 23/10, hoy hay un vigilante de
   vueltas), que las claves gratis de IA se queden sin cupo (429) y que **nadie mire los mails** si ustedes no están.
8. **Se puede lanzar en 10 a 30 días** si se hace en este orden: arreglar el rojo y apagar lo viejo (día 1 a 3), fotos a R2 (semana 1),
   observar y compactar (semana 2), privado + SEO (semana 3), redes con calma (semana 3 y 4). El plan está en la sección 5.
9. **Qué no hace falta para lanzar:** rehacer el panel del celular, páginas por barrio, portada nueva, newsletter, TikTok/YouTube. Todo eso es
   después del lanzamiento.
10. **Lo que más conviene decidir ya (una sola vez cada una):** cuántos posteos de notas por día en Facebook (propuesta: 2 o 3, o 8 según
    documento; ver 2.3), si se corre la compactación (ya dijeron que sí), cuándo se pasa a privado y si se prende `FOTOS_MENORES_OFICIALES`.

---

## 1. El tablero único

Leyenda: **HECHO** = andando y verificado. **APAGADO** = escrito y probado pero con el interruptor apagado. **CLAUDE** = lo hace Claude.
**PERSONA** = lo hace Hernán o Andrés (cuentas, claves, permisos, clics en pantallas de ellos). **BLOQUEADO** = no se puede hasta que pase otra cosa.

### 1.1 Hecho y funcionando (verificado)

| Qué | Cómo lo verifiqué |
|---|---|
| El motor (leer, cruzar, elegir, escribir con IA, verificar, armar, subir) corre en Cloudflare Workers Builds, no en GitHub | `gh run list`: cero corridas de "Actualizar la web" en las últimas 40; el sitio se sigue actualizando (commits "Datos de la portada" cada media hora) |
| El reloj de Cloudflare dispara el motor, redes, vigilancia, informe, etc. | Los commits de datos y las corridas de "Piezas de redes" salen disparadas por `workflow_dispatch` del Worker |
| Archivo permanente en R2 (encendido el 23/10) | `…workers.dev/_archivo/estado` → `ok: true`, 1.466 notas, 2.738 objetos, 223 MB |
| `TOPE_DE_NOTAS=500` (el sitio guarda 500 notas con página; el resto sale de R2) | Variable de GitHub verificada |
| Vigilante de vueltas (si la última buena tiene 40 min o más, el reloj vuelve a pedir) | Código `infra/reloj-cloudflare/nube.mjs` (`motorAtrasado`) |
| Selección sin cupos; 14 secciones; lo muy contado (8+) con 24 h; policial nacional (8+ o muerte de famoso) y fútbol sólo argentino | Código + variables: ninguna de las dos está en GitHub, y por código valen **prendidas** salvo que se ponga "no" |
| Reglas 289 a 296 (auditoría integral), 297 a 299 (semáforo y sin cuerpo), 303 (descartes después del cruce), 304 a 306 (menos compilación), 307 (sin "fuente principal") | `docs/DECISIONES.md` y el código |
| Respaldo semanal (domingos) y a mano | `gh run list --workflow Respaldo`: éxito el 15/10, 18/10 y 23/10 |
| Compactar el historial: el workflow existe, exige escribir `COMPACTAR` y un Respaldo bueno de las últimas 24 h | `compactar-historial.yml`; respaldo bueno del 23/10 |
| Claves de IA cargadas: tres de Gemini, Groq, **OpenRouter (23/10)**, Tavily, Meta, Cloudflare | `gh secret list` |
| Llaves de la mudanza cargadas: `RADAR_GITHUB_TOKEN`, `RENDER_GITHUB_TOKEN`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `MOTOR_DEPLOY_HOOK`, `CF_BUILDS_TOKEN`; variable `R2_RENDER` | `gh secret list` / `gh variable list` (todas del 22/10) |
| Permisos del token de Cloudflare para rutas y R2 (el archivo en R2 tiene su ruta puesta) | El archivo contesta; si no estuvieran, no andaría |
| El repositorio de render público existe | `radarbalcarce/radar-balcarce-render`, público, último push 17/10 |
| Pruebas: 3.036 pasan, 1 falla | Corrida de "Pruebas" del 24/10 03:22 UTC |
| SEO: robots, sitemaps, `llms.txt`, datos estructurados, IndexNow | `robots.txt` en vivo; `docs/seo/AUDITORIA-SEO-LLM.md` |

### 1.2 Hecho pero APAGADO (interruptores)

Estado real = lo que dicen las variables y secretos de GitHub hoy. "Quién lo prende" es quién tiene que dar la orden (la persona) y quién hace el clic.

| Interruptor | Qué hace | Estado real hoy (verificado) | Por defecto en código | Quién lo prende |
|---|---|---|---|---|
| `FOTOS_EN_R2` | Las fotos nuevas de las notas van a R2 y no a git | **No existe la variable → apagado.** El código y 16 pruebas están en `main` (`infra/compartido/fotos-r2.mjs`) | Apagado (sólo "Sí") | Una persona crea la variable en GitHub **y** en Workers Builds; antes, Claude corre simulacro y migración (ver 5, semana 1) |
| Ruta de fotos en el Worker del archivo (`activar_fotos`) | Si una foto no está en Pages, la sirve R2 | **No verificado** (la prueba por HTTP dio 404 igual con o sin ruta). Según `TRASPASO.md`, "falta" | `FOTOS_DE_RESPALDO=1` en el Worker, pero sin ruta no actúa | Una persona corre el workflow «Archivo permanente (producción)» con `activar_fotos` |
| `NUBE` (variable del **reloj**, en Cloudflare) | Qué trabajos van a Cloudflare y cuáles a GitHub | **No verificado el valor** (no se ve desde GitHub). Se deduce que incluye `actualizar.yml` y `redes.yml`. "Revisar el archivo" sigue yendo a GitHub (no es mudable) | Vacía = todo GitHub | Se cambia con el workflow «Desplegar Workers de Cloudflare» (`nube`) |
| `REDES_ACTIVAS` (GitHub) y `REDES_ACTIVAS_NUBE` | Interruptor de redes. Dos variables distintas: la de GitHub dice **No**, la de la nube dice **Sí** | **Verificado: GitHub No, nube Sí** (22/10). Es a propósito, pero confunde: si alguien mira sólo GitHub cree que las redes están apagadas | Apagado | Hernán/Andrés |
| `REVISION_DEL_ARCHIVO` | Repaso de las 1.459 notas viejas con el criterio de hoy | **`no` (pausada el 23/10, llevaba 291).** Ojo: el reloj igual la pide cada 2 h y GitHub la arranca y la deja sin hacer nada (gasta un arranque de máquina por tanda) | Prendida | Hernán decide cuándo (después de cerrar las reglas de fotos) |
| `FOTOS_MENORES_OFICIALES` | Fotos con chicos de fuentes de Balcarce (deportes, escuela, cultura; nada policial) | **No existe → apagada** (Hernán dijo el 17/10 que sí está bien; falta crear la variable) | Apagada | Una persona crea la variable con "Si" |
| `ENLACES_CORTOS` | Enlaces cortos en Facebook (178 a 36 caracteres) | **No existe → apagado.** El Worker (`infra/enlaces-cloudflare/`) no está subido y no tiene ruta | Apagado | Decide Hernán; después una persona sube el Worker y pone la ruta (`docs/redes/ACORTADOR-DE-ENLACES.md`) |
| `POLICIAL_NACIONAL` | Policial de afuera con 8+ medios o muerte de famoso | No existe → **prendido** por código | Prendido | Se apaga poniendo "no" |
| `FUTBOL_SOLO_ARGENTINO` | Fútbol de afuera sólo con argentinos o Primera | No existe → **prendido** por código | Prendido | Se apaga poniendo "no" |
| `MINIMO_NACIONAL` / `MINIMO_AREAS_CHICAS` | Cuántos medios hacen falta (3 / 2) | No existen → valen 3 y 2 | 3 y 2 | Hernán, con la estadística en la mano |
| `COMPILAR_SIEMPRE` | Fuerza compilar aunque nada haya cambiado | No existe | Apagado (se compila si cambió algo o pasaron 3 h) | Sólo para probar |
| `INFORME_RESPALDO_EN_GITHUB` | Informe diario de respaldo desde GitHub | `No` | — | — |
| `OPENROUTER_API_KEY` | Último respaldo de las IA (modelos `:free`, tope propio 45 por día) | **Cargada el 23/10 → prendida.** `TRASPASO.md` y `PASOS-PARA-HERNAN-Y-ANDRES.html` dicen que falta: **DOC VIEJO** | Sin clave no llama a nadie | Ya está |
| `WHATSAPP_CANAL_URL`, `TELEGRAM_CANAL_URL`, `BLUESKY_URL` | Botones de esos canales en el sitio | No existen → no hay botones | Sin botones | Las personas crean las cuentas y pegan las direcciones |
| Panel de Cloudflare (`Workers Builds`): `TOPE_DE_NOTAS` y variables del motor | Lo que lee el motor | **No verificado** (se cargan con «Cargar variables del motor»). Si faltara una, el motor usa el valor de siempre | — | Ver `docs/etapa-10-operacion/` |

### 1.3 Pendiente de CLAUDE (lo que puedo hacer sin que ustedes pongan nada)

Ordenado por importancia para el lanzamiento. "Lanza" = hace falta antes del lanzamiento.

| # | Qué | Lanza | Dónde está descripto |
|---|---|---|---|
| C1 | **Arreglar la prueba roja** de `main` ("una historia retoma el TEMA del repaso anterior…"); regla de la casa: `npm test` antes de seguir | Sí | Corrida de Pruebas del 24/10 |
| C2 | **Fotos a R2**: simulacro, subir sin quitar, mirar dos vueltas, prender; luego la hidratación que falta para `revisar-archivo`, `ilustrar-notas` y el render público | Sí | `etapa-10-operacion/FOTOS-EN-R2.md` |
| C3 | Medir los minutos de Workers Builds por día contra el presupuesto (200 por día) y si el reloj está salteando vueltas | Sí | `infra/motor-cloudflare/presupuesto.mjs` |
| C4 | Que la revisión pausada **deje de despertar a GitHub** cada 2 h (el reloj no debería pedirla si `REVISION_DEL_ARCHIVO=no`) | Sí (si pasan a privado) | Reloj + `revisar-archivo.yml` |
| C5 | Reducir lo que gasta "Pruebas" en GitHub (hoy corre en cada push a `main` con código; con agentes trabajando son muchas) | Sí (si pasan a privado) | `.github/workflows/pruebas.yml` |
| C6 | Poner `CLAUDE.md`, `TRASPASO.md`, `HOY.html` y `PASOS…html` al día con la realidad de este informe (mudanza hecha, llaves cargadas, tope 500, 289 a 307) y numerar bien las reglas (en `CLAUDE.md` dice que la próxima es la 284; es más de la 308) | Sí | Sección 3 |
| C7 | Lo que quedó sin hacer de la auditoría integral: sacar `impacto` de la ficha de la IA (se saca cuando se rehaga el panel), bajar la entrada de feeds de acá de 72 a 36 h, regenerar `REGLAS-Y-PROMPTS.html` y mover los HTML viejos de `docs/flujo/` a `historico/` | No | `AUDITORIA-INTEGRAL-23-10.md` |
| C8 | Reordenar las IA: Gemini/Groq sólo para escribir y verificar notas; Cloudflare y OpenRouter para lo demás; medir los 429 | Conviene | `TRASPASO.md` ("Mío", 2) |
| C9 | Mostrar a Hernán por qué se descartan hechos de 10+ medios (leer `muy-contadas.json`, ya con motivos separados) | Conviene | `TRASPASO.md` ("Mío", 3) |
| C10 | Fotos de deportes (pasan el control 5 de 10), notas más completas (300 palabras), fútbol sólo Primera, secciones flojas (Agro, Ciencia, Tecnología, Automovilismo) | Conviene | `TRASPASO.md` ("Mío", 4 a 8) |
| C11 | Policial nacional y muertes de famosos: mirar con datos reales una semana | Conviene | Reglas 289 a 296 |
| C12 | Sacar de git lo que sólo lee el robot (libro de redes, vigilancia, estadísticas, fichas): bajaría ~100 commits por día a ~10 | **No** (después) | `MENOS-COMMITS.md` y plan "que dure", etapa 1; **bloqueado por el panel** (ver 1.5) |
| C13 | Sitio liviano: bajar `TOPE_DE_NOTAS` a ~400 y compilar en 1 a 2 minutos | No | Plan "que dure", etapa 3; bloqueado por las fotos (ruta) |
| C14 | Agente de notas propias, cronograma y formato de piezas de redes, estadísticas de robots contra lectores | No | `TRASPASO.md` ("Mío", 10 a 12) |
| C15 | Animaciones del repaso, guiones con continuidad y voces nuevas | Conviene | Reglas 300 a 302; falta "oírlo y verlo" |
| C16 | Leer las respuestas de ChatGPT y Gemini guardadas en el Chrome y anotarlas en `08-IDEAS-DE-OTRAS-IA.md` | No | `TRASPASO.md` ("En curso", 2) |
| C17 | Actualizar acciones de GitHub con Node 20 deprecado (`checkout`, `setup-node`, `cache`) probando en workflow manual | Conviene | `PENDIENTES.md` |
| C18 | Dos errores de escritura congelados en `correcciones.json` ("campen", "Séleccion") | No | `PENDIENTES.md` (decide una persona) |

### 1.4 Pendiente de una PERSONA (Hernán o Andrés)

Una sola vez cada cosa. Va primero lo que desbloquea el lanzamiento.

| # | Qué | Dónde | Por qué importa |
|---|---|---|---|
| P1 | **Apagar los 7 workflows viejos** en GitHub → Actions: Actualizar la web, Redes, Vigilancia, Auditoría IA, Pistas, Informe diario, Ilustrar notas sin foto (tres puntitos → *Disable workflow*). **No apagar** "Revisar el archivo", "Piezas de redes", "Pruebas", "Respaldo", "Reloj de Cloudflare", "Vigilante de Cloudflare", "Desplegar Workers de Cloudflare" ni "Compactar el historial". Hoy "Informe diario" tiene un horario de respaldo propio (11:45 y 00:45 UTC) que aparece como "saltada": al apagarlo, esa red de seguridad desaparece. Si se necesita volver atrás, hay que prenderlos otra vez. | github.com/radarbalcarce/radar-balcarce/actions | Evita que alguien los dispare a mano y corra el robot doble; es la condición para pasar a privado |
| P2 | **Tope de gasto de Actions en US$ 0** | github.com → Settings → Billing → Budgets | Que GitHub nunca cobre; con el repo público no pasa nada, pero es la red de seguridad antes de pasar a privado |
| P3 | **Correr "Compactar el historial"** (escribir `COMPACTAR`) — Hernán ya dio el OK el 23/10, pero **recién después de mover las fotos** (ver 1.5): si se compacta antes, las fotos vuelven a entrar | Actions → «Compactar el historial» | Baja el repo de ~290 MB a ~100 MB o menos; después, en la PC: `git fetch origin && git reset --hard origin/main && git reflog expire --expire=now --all && git gc --prune=now --aggressive` |
| P4 | **Crear la variable `FOTOS_EN_R2`** (cuando Claude avise que el simulacro salió bien), en GitHub **y** en Workers Builds | Settings → Variables | Es lo que saca las fotos de git |
| P5 | **Pasar el repositorio a privado** — cuando se cumplan las condiciones de la etapa 4 del plan | Settings → Danger zone | Cierra la exposición pública del código (el repo hoy es público, los secretos no se ven pero sí todo el código y los datos) |
| P6 | **Activar la verificación en dos pasos (2FA)** en Google (radarbalcarce@gmail.com), Meta/Facebook, Instagram, GitHub, Cloudflare y DonWeb. Y revisar el mail de "cambio de contraseña" de Instagram que apareció en el Gmail del medio | Cada cuenta | Es el mayor riesgo real: una cuenta robada deja sin medio de un día para el otro |
| P7 | **Search Console** (ya existe `sc-domain:radarbalcarce.com`) mirarla una vez por semana; **Bing Webmaster Tools** (importar desde Search Console, 5 minutos); **Google Noticias / Publisher Center** (trámite manual) | search.google.com/search-console, bing.com/webmasters | Hoy "nadie mira Search Console ni Bing" (`AUDITORIA-SEO-LLM.md`); sin eso no se sabe si Google indexa |
| P8 | Decidir **cuántos posteos de notas por día** en Facebook y **la barra de 5 medios** para lo de afuera (los documentos dicen 5 por día hoy, propuesta de 8 en un lado y "bajar a 2 o 3" en otro: ver 2.3) | Charla con Claude | Define el ritmo de las redes |
| P9 | Decidir si se prende **`FOTOS_MENORES_OFICIALES`** (Hernán ya dijo que sí; falta crear la variable con "Si") | Settings → Variables | Muchas notas de escuela y deporte de Balcarce salen sin foto de otra manera |
| P10 | Cuentas de **Bluesky** y **Telegram** (y el bot con @BotFather); si quieren, **canal de WhatsApp**; pegar las direcciones como variables | bsky.app, web.telegram.org | Sólo si quieren más canales; no bloquea el lanzamiento |
| P11 | **Clave paga de Gemini para las voces**, y antes **guardar la referencia de las voces actuales** (las dos voces propias vencen el 29/09/2027). Poner un límite de gasto en Google | AI Studio | Sin clave paga el cupo es de 10 audios por día |
| P12 | **Ordenar las claves de Google**: la facturación está en un proyecto que Radar no usa | `docs/auditoria-2-0/09-CLAVES-DE-IA-ORDEN.md` | Evita que una clave "gratis" termine cobrando |
| P13 | En la PC: borrar `panel\datos` y `respaldos` (tienen claves); dar de baja Tailscale si no se usa | La PC de Hernán | Quedan claves viejas en un disco |
| P14 | Borrar el Worker `radar-balcarce-sondeo-fuentes` y el secreto `SONDEO_TOKEN` (el secreto sigue en la lista; el workflow «Sondeo de fuentes (temporal)» también); borrar los trabajos pausados de cron-job.org; borrar el proyecto de Vercel y limpiar el DNS | Cloudflare / cron-job.org / Vercel | Limpieza de superficie de ataque |
| P15 | **Respaldo afuera de GitHub**: el Respaldo semanal sube a R2 si hay `R2_RESPALDOS` (existe la variable); falta GitLab (no hay `GITLAB_TOKEN`) y una copia a Google Drive o la PC | `docs/propuestas/PASOS-PARA-USTEDES.md` §1 | Hoy el único historial completo está en GitHub y en artefactos que se borran a los 90 días |
| P16 | Aprobar que los pull requests de afuera no corran solos (Settings → Actions → General → *Require approval for all outside collaborators*) | GitHub | Sólo importa mientras el repo sea público |
| P17 | Un documento de **"si mañana falta uno de nosotros"** (dominio, cuentas, pagos, recuperación) — lo redacta Claude con la lista, lo guardan ustedes fuera del repositorio | — | Ver 4.5 |
| P18 | Decisiones de contenido: el cartel "Redacción asistida con IA" (ya está dentro de "Fuentes"), fotos con leyenda contra ilustración, control de nombres de chicos y víctimas en lo local, un informe por día en vez de dos, elegir una de las dos portadas | Charla con Claude | Ninguna bloquea el lanzamiento |
| P19 | Completar bios y perfiles de Instagram y Facebook (categoría, enlace, botón de WhatsApp, historias destacadas) | Meta | Instagram tiene 7 seguidores y Facebook 53 (23/10); hay que cuidar la puerta de entrada |
| P20 | Renovar el dominio `radarbalcarce.com` (DonWeb) **antes del 21/09/2027** y las voces antes del 29/09/2027 | DonWeb / AI Studio | El vigilante avisa 30 días antes |

### 1.5 BLOQUEADO (y por qué)

| Qué | Bloqueado por | Se destraba cuando |
|---|---|---|
| Compactar el historial con efecto real | Las fotos nuevas siguen entrando a git; compactar antes no achica (auditoría D10) | `FOTOS_EN_R2` prendida + `--subir --quitar` + ruta de fotos puesta |
| Bajar `TOPE_DE_NOTAS` de 500 a ~400 | La ruta de fotos en el Worker (sin ella una foto sacada de Pages da 404) | P4 y `activar_fotos` hechos |
| Repositorio privado | Minutos de GitHub (P1, P2, C4, C5), historial compactado (P3) y tres días de observación sin que nada vuelva a GitHub | Etapa 4 del plan |
| Sacar estado (libro de redes, vigilancia, fichas, estadísticas) de git | El panel del celular y el informe diario leen esos archivos de git; el panel se rehace de cero aparte | Se decide rehacer el panel (después del lanzamiento) |
| Revisión del archivo (1.459 notas, 291 hechas) | Pausada por decisión (esperar a cerrar reglas de fotos y selección). Además, con fotos fuera de git la revisión no puede ver la foto de una nota vieja hasta que se le sume la hidratación (C2) | Cerrar C2 y reglas de fotos |
| Voces nuevas | Clave paga de Gemini y guardar la referencia de las actuales (P11) | Las personas |
| Enlaces cortos | Decisión de Hernán + subir el Worker y poner la ruta | Decisión |
| Más redes (X, Threads, TikTok, YouTube, Telegram, Bluesky) | Cuentas sin crear o sin publicar; textos por red listos | P10 |
| Panel nuevo del celular, audio en la página, páginas por barrio | Se retiró lo viejo y no hay prioridad antes del lanzamiento | Después del lanzamiento |
| Fuentes de España (cuatro apagadas) | Decisión de Hernán: "no es necesario sumar fuentes de afuera" | No se prenden |

---

## 2. Cosas que no coinciden entre sí (hallazgos)

| # | Hallazgo | Evidencia | Qué hacer |
|---|---|---|---|
| H1 | `TRASPASO.md`, `HOY.html` y `PASOS-PARA-HERNAN-Y-ANDRES.html` dicen que faltan la clave de OpenRouter, los dos tokens de GitHub, las llaves de R2 y `R2_RENDER`. **Ya están cargados** (`gh secret list`, 22 y 23/10) | Fechas de los secretos | Tildarlos como hechos y sacarlos de la lista (C6) |
| H2 | `CLAUDE.md` dice "mudanza escrita y probada, sin prender" y "todo corre en GitHub Actions". Es falso desde el 22/10 (`MENOS-COMMITS`, `TRASPASO`, auditoría integral M8) | `gh run list` | Corregir `CLAUDE.md` (C6). Es lo que leen los agentes antes de tocar código: si queda así, algún agente "arregla" volviendo atrás |
| H3 | `CLAUDE.md` dice que la próxima regla es la 284. Hay reglas hasta la 307 | `DECISIONES.md` | Corregir |
| H4 | "Posteos por día": `TRASPASO` y `RESUMEN` dicen "5 por día, propongo bajar a 2 o 3"; el catálogo y `PENDIENTES` proponen subir a 8 y bajar el mínimo de relevancia de 75 a 62; el 23/10 se acordó "no bajar posteos de notas con las estadísticas de hoy: la cuenta recién arranca" | `TRASPASO.md` | Hernán decide una vez (P8); mientras, no tocar |
| H5 | Reloj pide la revisión del archivo cada 2 h aunque esté pausada | Corridas de "Revisar el archivo" cada 2 h hasta el 24/10 | C4 |
| H6 | El repo pesa 291 MB y la PC tiene 84 MB de basura de empaquetados cortados (`git gc` limpia la PC, no GitHub) | `gh repo view` y auditoría integral | Se resuelve con P3 y `git gc` en la PC |
| H7 | `REDES_ACTIVAS` figura como "No" en GitHub y "Sí" en la nube | `gh variable list` | Dejar escrito en `08-INFRAESTRUCTURA.md`, o unificar en una sola variable (C6) |
| H8 | `TRASPASO` dice que el Informe diario/vigilancia "bajó los mails", pero el Informe diario sigue teniendo un horario propio de respaldo en GitHub (11:45 y 00:45 UTC) | `informe-diario.yml` | Decidir con P1 si se apaga o se deja de respaldo |
| H9 | El "tope de 3.700 notas" sigue escrito en `CLAUDE.md` y en el informe diario; el real hoy es **500** | Auditoría integral M3 | Corregir (C6, ya hay regla de que el informe use el tope real) |
| H10 | Cuatro listas de pendientes (sección 3) | — | Una sola lista maestra |

---

## 3. Una lista maestra y qué archivos se archivan

### 3.1 El problema

Hoy el mismo pendiente aparece en hasta cuatro lugares con estados distintos:

| Archivo | Qué es de verdad | Estado |
|---|---|---|
| `PENDIENTES.md` (21 KB) | Historial de pendientes de 15 a 17/10, con "al 23/10, ver RESUMEN y TRASPASO" arriba | **Viejo**, mezcla hecho y por hacer |
| `IDEAS.md` (100 KB) | 1.000+ líneas de ideas del 28/09 al 15/10, con tablas de "valor / esfuerzo"; ninguna decidida | **Banco de ideas**, no lista de tareas |
| `docs/TRASPASO.md` (13 KB) | Estado al 23/10 + lista "Mío" y "De Hernán y Andrés", más decisiones abiertas | El más al día, pero con cosas ya hechas (H1) |
| `docs/DECISIONES.md` (46 KB) | Registro de qué se decidió, por qué y quién, con "Preguntas abiertas" al final | **Registro** (no se borra, se agrega arriba) |
| `docs/RESUMEN-Y-PENDIENTES.html` | La versión con casillas, 23/10 | Útil para el celular; duplica TRASPASO |
| `docs/HOY.html`, `docs/PASOS-PARA-HERNAN-Y-ANDRES.html` | Estados del 17/10 | **Viejos** |

### 3.2 Propuesta

**Una sola lista maestra: `PENDIENTES.md`**, reescrita desde cero en una página, con este formato fijo (sin historia):

1. *Antes del lanzamiento* (lo de las secciones 1.3 y 1.4 marcadas "Lanza"), una línea por tarea: quién, qué, "listo cuando…", fecha.
2. *Después del lanzamiento* (lo marcado "No/Conviene").
3. *Decisiones abiertas* (una pregunta por renglón).
4. *Con fecha* (vencimientos: dominio, voces, llaves).

Y **cuatro reglas** para que no se duplique de nuevo:

- Cada pendiente vive **sólo** en `PENDIENTES.md`. Lo demás lo enlaza, no lo copia.
- `DECISIONES.md` queda como **registro** (qué, por qué, quién, cuándo). Una pregunta abierta se anota en `PENDIENTES.md` y recién cuando se decide pasa a `DECISIONES.md`.
- `TRASPASO.md` queda **corto**: cómo se trabaja, estado de hoy en diez renglones, qué hacer si se corta la sesión. Sin listas de tareas.
- `IDEAS.md` queda como **banco**; una idea que se decide hacer se mueve a `PENDIENTES.md` con una línea y se marca en `IDEAS.md` "pasó a pendientes".

**Qué archivos se archivan** (mover a `docs/historico/`; quedan en git): `docs/HOY.html`, `docs/PASOS-PARA-HERNAN-Y-ANDRES.html` (al convertirse en la sección "Personas" de la lista maestra), el cuerpo viejo de `PENDIENTES.md` (como `PENDIENTES-HASTA-23-10.md`) y las partes de `IDEAS.md` anteriores al 8/10 que ya están en `docs/historico/HISTORIA.md`. `docs/RESUMEN-Y-PENDIENTES.html` se **regenera** a partir de la lista maestra (para seguir con casillas en el celular).

---

## 4. Riesgos operativos para lanzar

### 4.1 Costos

| Concepto | Hoy | Riesgo | Cómo se controla |
|---|---|---|---|
| Dominio `radarbalcarce.com` (DonWeb) | Anual, vence 21/09/2027 | Si vence, se cae la web y todos los enlaces | Vigilante avisa 30 días antes |
| **Cloudflare Workers Paid** | **US$ 5 por mes** | Es lo único fijo. Incluye 6.000 minutos de compilación (Workers Builds) por mes y cobra US$ 0,005 por minuto de más | `presupuesto.mjs` reparte 6.000 min a 200 por día y saltea vueltas si se pasa; nunca deja más de 3 horas sin vuelta |
| **Minutos de compilación** | El diseño suponía una vuelta de ~4,5 min × 48 = 6.480 al mes. El 23/10 se anotó que las primeras vueltas con `TOPE_DE_NOTAS` tardan ~14 min porque exportan 100 notas cada una | **Si la vuelta tarda más de 4,5 min, el presupuesto salta vueltas y la web puede quedar hasta 3 horas sin actualizarse al final del mes** | **C3**: medir los minutos reales por día esta semana. Si pasan de 200, mirar `MOTOR_SIN_TOPE` (costaría unos US$ 6 por mes extra, decisión de ustedes) |
| GitHub Actions (repo público) | US$ 0 (minutos gratis en público) | Ninguno mientras sea público | — |
| GitHub Actions si se pasa a **privado** | Plan gratis: 2.000 minutos por mes; más allá se corta con tope en US$ 0 | Lo que sigue corriendo en GitHub: "Pruebas" (en cada cambio de código y cada lunes), "Armado con datos vacíos", "Revisar el archivo" (cada 2 h aunque esté pausada), "Piezas de redes" (el pedido de la voz, ~14 por día), "Respaldo", "Auditoría" semanal. **No lo medí en minutos**; las corridas de las últimas 14 horas muestran ~20 corridas de "Pruebas" por cambios de código | Medir antes (semana 1); reducir "Pruebas" (C5) y la revisión (C4); tope de gasto en US$ 0 (P2) |
| Gemini (tres claves) | Gratis desde el 29/09 | Cupo diario y 429 | Respaldos Groq y OpenRouter; ver 4.2 |
| Voz | 10 audios por día gratis | Si se acaba, **la pieza no sale** (nunca otra voz) | Es a propósito. Clave paga: ~US$ 3 a 4 por mes (P11) |
| Groq, Tavily, OpenRouter | Gratis (OpenRouter con US$ 10 de crédito en la cuenta y tope propio de 45 pedidos por día) | Límite por día | Ver 4.2 |
| R2 | 10 GB gratis. Hoy 223 MB de notas + las fotos que se sumen | Pasar de 10 GB tardaría años | Mirar el tamaño en el informe diario |
| Workers AI (imágenes con FLUX, texto de los prompts) | Dentro de lo incluido | Cuotas diarias de Cloudflare | `docs/etapa-10-operacion/ANALISIS.md` |
| Meta | Gratis | Token sin vencimiento; si se revoca, no sale ninguna red | P6 (2FA) |

### 4.2 Qué pasa si falla una clave o se agota un cupo

| Falla | Qué se nota | Qué hace el sistema solo | Qué hace una persona |
|---|---|---|---|
| Una clave de Gemini rechazada (401/402/403) | Aviso `clave-…` por mail | No gasta los intentos de la nota; prueba el respaldo (la otra Gemini, Groq, OpenRouter) | Crear otra clave y pegarla en GitHub (y en Cloudflare, ver abajo) |
| Cupo diario de redacción agotado (429) | Aviso `pocos-cuerpos`, crece "Esperando cuerpo" | Usa las otras claves; con 3 fallos descarta la nota con motivo | Esperar al día siguiente o escribir el cuerpo en el panel |
| Se acaba el cupo de voz (10 audios por día) | Faltan piezas de video | La pieza no sale | Esperar al día siguiente |
| OpenRouter sin crédito o al tope de 45 | Registro de uso | Sigue sin él | Recargar o ignorar |
| La clave está en GitHub pero **no en los Workers de Cloudflare** | Una tarea falla en silencio desde la nube | — | Después de cambiar un secreto, correr «Desplegar Workers de Cloudflare» (copia los secretos a los Workers) o «Cargar variables del motor» |
| Cloudflare pierde un aviso del reloj (pasó el 23/10 a las 12:30) | Web sin actualizar 45 minutos | **Vigilante de vueltas**: pide la vuelta si la última buena tiene ≥ 40 min | Nada |
| Falla el vigilante mismo | No llegan los mails | Resumen de respaldo a las 22 del Worker | Mirar `…workers.dev/estado` |
| El motor falla en una vuelta | Corrida roja en Workers Builds | La web sigue con lo anterior; la vuelta siguiente reintenta | Mirar log; "Estado del motor" (workflow a mano) |
| Falla una prueba del núcleo legal | Mail "la web no se actualiza" | La web queda congelada **hasta que se arregle** (a propósito, para no publicar algo roto) | Claude arregla; es el motivo de C1 aunque hoy no sea del núcleo |
| Se cae Cloudflare Pages | Aviso `web-caida` | Nada | Mirar el panel de Cloudflare |

### 4.3 Qué pasa si el reloj pierde ticks

El reloj dispara a los :00 y :30 más un cron extra a los :10, :25, :40, :50 y :55. Si la última vuelta buena tiene 40 minutos o más, se vuelve a pedir
(verificado en `nube.mjs`). El peor caso es una vuelta que no sale hasta la siguiente; **no hay respaldo de GitHub** (se sacó el 17/10): si el
Worker del reloj muere por completo (token `RELOJ_GITHUB_TOKEN` rechazado, por ejemplo), nada corre y sólo avisa el Vigilante de Cloudflare por mail.
Ese es el punto único de falla de todo el proyecto: conviene que **dos personas** sepan que "radar-balcarce-reloj" es lo primero que se mira.

### 4.4 Respaldos

| Qué | Cuándo | Dónde queda | Riesgo |
|---|---|---|---|
| `respaldo.yml`: bundle de git (todo el historial) y copia de datos y fotos | Domingos 3:17 de Balcarce y a mano | Artefacto de GitHub (90 días) y, si `R2_RESPALDOS` está (existe), un depósito R2 | Sube partido si pasa de 250 MB. **No verificado** que haya archivos en R2 de la semana |
| Espejo en GitLab | No configurado (falta `GITLAB_TOKEN`) | — | Si se pierde la cuenta de GitHub, hay que reconstruir desde R2 o artefactos |
| Archivo de notas en R2 | Cada vuelta | `radar-archivo` (verificado, 1.466 notas) | Es un archivo, no un respaldo del código |
| "Probar la restauración del respaldo" | A mano | — | Hacerla **una vez antes del lanzamiento** (día 2 del plan) |
| Compactar el historial | A mano; irreversible | Un solo commit; el bundle del Respaldo queda 90 días | Sólo con un Respaldo bueno de 24 h: lo exige el propio workflow |

La regla de ChatGPT/Opus que ya está en `PENDIENTES.md` sigue vigente: respaldo en cuatro lugares (GitHub, GitLab, Drive, PC). Hoy hay uno y medio.

### 4.5 Monitoreo y qué se rompe si Hernán y Andrés no están tres días

Qué mira por ustedes: el Vigilante de Cloudflare (mail), los informes de las 8:15 y las 21:15, el vigilante de vueltas, el aviso de vencimientos.
Qué **no** mira nadie por ustedes:

| Si no están 3 días… | Qué pasa |
|---|---|
| La web | Sigue publicando sola. Lo amarillo y rojo (Política, Policiales, víctimas) no sale; hay ~4 historias por día "esperando" que nadie lee. Esa cola no se pierde pero queda vieja |
| Redes | Siguen automáticas con cupo de voz de 10 audios por día. Sin nadie que mire los comentarios, mensajes ni errores |
| Comentarios y mensajes de lectores | Nadie los contesta (WhatsApp 2266 51-1612) |
| Una clave rechazada | Llega el mail pero nadie lo lee; el sistema usa respaldos hasta que se acaban |
| Un error de publicación grave (nombre de menor o víctima) | La política es "rojo no sale", pero si algo se cuela nadie lo saca. Sacar una nota: `web/data/retiradas.json` o el panel del celular |
| Una cuenta robada | Nada lo detecta (de ahí P6) |
| Se agota un token que no vence | No aplica; los tokens importantes están sin vencimiento |
| Se llena el repositorio | Informe diario avisa a ≥ 600 MB |
| Dominio y pagos | Nada vence antes de septiembre 2027 |

**Recomendación:** antes de lanzar, que quede escrito en un documento fuera de GitHub (P17) quién tiene qué cuenta, cómo recuperarla, a quién llamar,
y la receta de tres líneas "apagar todo" (poner `REDES_ACTIVAS_NUBE` en No y desplegar; poner en `retiradas.json` la nota; o pausar la vuelta).
Hoy **no hay un botón de emergencia** para frenar toda la publicación automática (lo pide `PENDIENTES.md` desde el 15/10): conviene hacerlo
antes del lanzamiento (C-nuevo, 1 hora de trabajo).

### 4.6 Otros riesgos que vi

- **Mucho tráfico falso.** Desde el 19/10 casi todas las visitas figuran de Francia y Estados Unidos (robots); los lectores reales son 6 a 11 por día
  desde Argentina. Es buen momento para lanzar con calma, pero también significa que **la medición real todavía no existe**: separar robots de lectores
  (C14) debería ser antes del lanzamiento, no después, porque sin eso no se pueden leer las métricas de 30 días.
- **Prueba roja que llega sola.** Hoy hay una; los agentes trabajan en paralelo y a veces rompen cosas ajenas. Conviene una sola persona (o un solo agente) que una ramas a `main`.
- **Repositorio público = todo el criterio y los datos visibles.** Mientras no sea privado, el criterio editorial, los prompts, las listas y la lista de fuentes
  los puede leer cualquiera (y copiar). Eso ya se aceptó; es un motivo más para el paso a privado.
- **Hechos de 8+ medios que no salen.** Hay 94 de 140 en "otros" (sin motivo claro) del 23/10; ya se separó el motivo (regla 296/298), pero hay que **mirar la lista de la semana** antes de lanzar (C9).
- **Fotos con IA: 5 de 10 pasan el control.** Las que no pasan, salen con placa. No es un riesgo de seguridad, es de aspecto (C10).

---

## 5. Plan por etapas (fechas relativas) con criterio de "listo"

*Día 1 = lunes 26/10/2026. Una persona por mensaje, un paso por vez (como ya acordaron). "Listo cuando" es medible: un número, una pantalla, un resultado de comando.*

### Etapa 0 · Días 1 a 3: dejar la casa en orden

| Quién | Qué | Listo cuando |
|---|---|---|
| Claude | **C1**: arreglar la prueba roja | `npm test` verde en `main` (3.037 de 3.037) y "Pruebas" verde en GitHub |
| Claude | **C6 + lista maestra** (sección 3): `PENDIENTES.md` nuevo, `CLAUDE.md`/`TRASPASO.md` al día, archivar `HOY.html` y `PASOS…html` | Un solo `PENDIENTES.md` de una página; `docs/pruebas` de documentos pasa |
| Claude | **C3**: medir minutos de Workers Builds por día de los últimos 7 días y vueltas salteadas | Número escrito en la lista maestra: "promedio X min/día de 200"; **meta: menos de 190** |
| Claude | **C4**: que el reloj no pida la revisión si está en "no" | Cero corridas nuevas de «Revisar el archivo» en 24 h |
| Claude | Botón de emergencia (frena todo lo automático) | Un interruptor documentado; probado con una nota de prueba |
| Personas | **P6**: 2FA en Google, Meta, Instagram, GitHub, Cloudflare, DonWeb | Las seis cuentas con 2FA; códigos de recuperación guardados fuera de la PC |
| Personas | **P1 + P2**: apagar los 7 workflows viejos y tope de gasto de Actions en US$ 0 (**sólo después de que Claude confirme que ninguno es respaldo vivo**) | `gh workflow list` muestra los 7 como *disabled_manually*; la web y las redes siguen saliendo 24 h |
| Claude + persona | Correr «Probar la restauración del respaldo» una vez | La corrida termina verde; dice qué restauró y en cuánto tiempo |
| Personas | **P13/P14**: borrar `panel\datos`, `respaldos`, Worker del sondeo, `SONDEO_TOKEN`, Vercel, trabajos de cron-job.org | Lista tildada |

### Etapa 1 · Semana 1 (días 4 a 10): fotos y datos del robot a R2

Todo lo del documento `docs/etapa-10-operacion/FOTOS-EN-R2.md`, en este orden (cada paso con vuelta atrás):

| Paso | Quién | Listo cuando |
|---|---|---|
| 1. Simulacro: `node scripts/migrar-fotos-a-r2.mjs` y «Motor: ensayo» | Claude | Cuenta cuántas fotos hay en git y cuántas faltan en R2; "Motor: ensayo" verde; el token de R2 tiene escritura en `radar-archivo` |
| 2. Poner la **ruta de fotos** (`activar_fotos`) | Persona (clic) | `radarbalcarce.com/fotos-notas/<una foto vieja que ya no está en Pages>.jpg` responde 200 con el encabezado `X-Radar-Archivo: r2` |
| 3. `--subir` (sin quitar) con `--max=N` de a poco | Claude | R2 tiene el 100 % de las fotos de git, mismo tamaño |
| 4. Variable `FOTOS_EN_R2=Si` en GitHub y en Workers Builds (**P4**) | Persona | En el log de dos vueltas seguidas: "Fotos de R2: N en el depósito, M traídas" y "Fotos nuevas: K a R2"; el commit de datos ya no trae fotos nuevas; portada y una tarjeta de Facebook con foto |
| 5. Hidratación para `revisar-archivo`, `ilustrar-notas` y el render público | Claude | Las tres tareas funcionan con `FOTOS_EN_R2=Si` en un ensayo; pruebas nuevas |
| 6. Medir 3 días | Claude | Cero notas que perdieron la foto; tiempo de vuelta no pasó de +150 s; minutos de Workers Builds dentro del presupuesto |
| 7. Bajar `TOPE_DE_NOTAS` a ~400 | Persona (variable) | Compilación de 6,5 a 2 minutos o menos; menos de 10.000 archivos en cada subida a Pages |

**Si algo sale mal:** vaciar la variable `FOTOS_EN_R2`; las fotos nuevas vuelven a git y lo ya movido sigue sirviéndose desde R2.

### Etapa 2 · Semana 2 (días 11 a 17): observar, compactar, correr la revisión

| Paso | Quién | Listo cuando |
|---|---|---|
| 1. `--subir --quitar` (las fotos salen del árbol) + commit y push **entre vueltas** | Claude | `web/public/fotos-notas/` sólo con las fijas (clima, efeméride, escudos); el repo sigue compilando y mostrando fotos |
| 2. **Compactar el historial (P3)** con Respaldo bueno de las últimas 24 h, y en la PC `git gc` | Persona | `gh repo view` → `diskUsage` menor a **100 MB** (hoy 291 MB); `git count-objects -vH` en la PC sin `tmp_pack_*` |
| 3. Reactivar `REVISION_DEL_ARCHIVO` (si Hernán dice que sí) | Persona | Variable vacía; la estadística de `revision-archivo.json` avanza hacia 1.459; retiradas sin errores en el informe diario |
| 4. **Revisar la estadística de la selección de la semana**: cuántas llegan, con cuántos medios, por qué caen (C9); decidir `MINIMO_NACIONAL` y `MINIMO_AREAS_CHICAS` | Hernán y Claude | Una decisión escrita en `DECISIONES.md`, "se mantiene 3 y 2" o "cambia a …" |
| 5. Mirar 14 días de vueltas | Claude | **Al menos 95 % de las vueltas esperadas** (hasta 48 por día) salieron buenas; **ninguna vuelta con más de 60 minutos sin publicar** |

### Etapa 3 · Semana 3 (días 18 a 24): repositorio privado y SEO

| Paso | Quién | Listo cuando |
|---|---|---|
| 1. **Medir los minutos de GitHub de 7 días** (con Pruebas ya reducido, C5; revisión en pausa o ligera, C4) | Claude | **Menos de 1.200 minutos reales proyectados al mes** (hay que dejar margen del 40 % sobre los 2.000 del plan gratis) |
| 2. **Pasar a privado (P5)** | Persona | Configuración del repo = Private; a las 2 horas: una vuelta del motor, una pieza de redes y el informe diario salieron bien; **si algo falla, volver a público** (la vuelta atrás es en el mismo lugar) |
| 3. Verificar que **Workers Builds sigue conectado** al repo privado y que `radar-balcarce-render` (público) sigue recibiendo pedidos | Claude | Una vuelta completa y una pieza de video después del cambio |
| 4. **SEO y buscadores (P7)**: Search Console (revisar Experiencia de página y cobertura), Bing Webmaster (importar), Google Noticias/Publisher Center (pedir alta), Core Web Vitals reales | Persona + Claude | En Search Console: sitemap leído, ≥ 90 % de las páginas del sitemap indexadas o con motivo claro, 0 páginas con error de servidor; Bing con el sitio verificado |
| 5. Separar visitas robots de lectores en las estadísticas (C14) | Claude | El informe diario muestra "lectores reales" y "robots" por separado |

### Etapa 4 · Semana 4 (días 25 a 30): redes, reels y declarar 2.0

| Paso | Quién | Listo cuando |
|---|---|---|
| 1. Cerrar **cuántos posteos de notas por día** (P8) y qué reels (clima de la mañana, farmacia, efeméride y resumen del día rinden; repaso de la noche casi no) | Hernán | Decisión escrita con números en la mano |
| 2. Animaciones del repaso y guiones con continuidad | Claude | Se ven y se oyen (todavía falta "oírlo y verlo"); aprobados por Hernán |
| 3. Voces: guardar la referencia actual; clave paga (P11) | Persona | Referencia guardada; clave cargada; las dos voces nuevas probadas en una pieza |
| 4. Bios, perfiles, historias destacadas (P19) | Personas | Las tres cuentas con perfil completo |
| 5. Documento "si falta uno de nosotros" (P17) | Claude redacta, personas guardan | Copia fuera del repositorio; las dos personas confirman que la tienen |
| 6. **Declarar la 2.0** | Todos | Se cumple la lista de abajo |

### 5.1 Criterio de "versión 2.0 lista" (todo, medible)

- [ ] `npm test` verde en `main` y "Pruebas" verde en GitHub.
- [ ] Siete workflows viejos apagados; tope de gasto de Actions en US$ 0 (P1, P2).
- [ ] 2FA en las seis cuentas (P6) y documento de emergencia guardado fuera del repo (P17).
- [ ] `FOTOS_EN_R2=Si` hace 7 días o más y cero notas con foto perdida.
- [ ] Repositorio compactado: `diskUsage` menor a 100 MB.
- [ ] Repositorio privado y 7 días seguidos de vueltas, redes e informes saliendo bien.
- [ ] Minutos de Workers Builds: menos de 190 por día en promedio.
- [ ] Al menos 95 % de las vueltas esperadas salieron buenas en los últimos 14 días; ninguna sin publicar más de 60 minutos.
- [ ] Search Console y Bing verificados y leídos al menos una vez por semana por una persona.
- [ ] Una copia de respaldo probada en restauración y una segunda copia fuera de GitHub (R2 o Drive).
- [ ] `PENDIENTES.md` único y al día; `CLAUDE.md` sin contradicciones con la realidad.
- [ ] Decisiones de redes tomadas (posteos por día, voces, bios).

---

## 6. Métricas para mirar los primeros 30 días

Cuatro grupos. Para cada una: dónde se ve y qué es "bien". Los números "bien" son propuestas basadas en lo medido hasta el 23/10; hay que ajustarlos con la primera semana.

### 6.1 Salud del robot

| Métrica | Dónde | Qué es "bien" |
|---|---|---|
| Vueltas buenas por día | Informe diario, `motor/estado.json` | ≥ 40 de 48; ninguna pausa de más de 60 min |
| Minutos de Workers Builds por día | Registro de R2 `motor/minutos/AAAA-MM.json` | < 190 de 200 |
| Notas publicadas por día | Informe diario | 100 a 140 (15 a 20 de Balcarce) |
| Notas de Balcarce que llegaron contra las que salieron | Estadística de la selección | Hoy 22 de 72 el 22/10 (con repetidas); **subir**, y que cada pérdida tenga motivo escrito |
| Hechos de 8+ medios que no salieron | `muy-contadas.json` | Cero sin motivo, cada día |
| Notas "esperando cuerpo" y descartadas | `esperando-cuerpo.json` | 0 a 2 por día (el 22 y 23/10 hubo 7 y 8: vigilar) |
| 429 de las IA | `uso-ia.json`, `intentos-ia.json` | < 5 % de los pedidos; Gemini y Groq sólo para escribir |
| Peso del repositorio y commits por día | `gh repo view`, `git log --since=1.day` | Después de compactar: crecimiento < 2 MB por día; commits < 100 (o < 20 si se sacan los de estado) |
| Corridas y minutos de GitHub | `gh run list` | Proyectado < 1.200 al mes en privado |

### 6.2 Calidad editorial

| Métrica | Dónde | Qué es "bien" |
|---|---|---|
| Notas retiradas por error | `retiradas.json`, `revision-archivo.json` | 0 con nombre de menor o víctima |
| Correcciones por semana | Panel del celular, `correcciones.json` | Bajando |
| Fotos con IA que pasan el control | Informe de fotos (`npm run auditar-fotos`) | De 5/10 a 7/10; las que no pasan, con placa |
| Notas sin foto | `auditar-fotos` | < 20 % |
| Repetidas escapadas (la misma noticia dos veces) | `fusionadas.json` y revisión | < 1 por día |
| Notas por sección por día (cada sección tiene que tener todos los días) | Estadística de selección | Cada una ≥ 1; Agro y Automovilismo (hoy 0 con 139 llegadas el 22/10) ≥ 1 |

### 6.3 Lectores y buscadores (lo que más importa para "lanzar")

| Métrica | Dónde | Qué es "bien" |
|---|---|---|
| **Lectores reales de Argentina por día** (hoy 6 a 11) | Cloudflare Web Analytics, informe | Objetivo a 30 días: pasar de 10 a **100 por día**. Sin números iniciales sólidos, el objetivo se ajusta a fin de la semana 1 |
| Porcentaje de visitas de robots | Estadísticas | Bajando (de ~90 % a < 50 %) |
| De dónde llegan (Facebook, directo, Google) | `estadisticas.json` | Facebook es hoy 74 % de las visitas; que Google empiece a aparecer |
| Páginas indexadas y clics/impresiones | Search Console | Indexadas ≥ 90 % del sitemap; impresiones creciendo semana a semana |
| Core Web Vitals (CrUX) | Search Console / PageSpeed | LCP < 2,5 s en celular |
| Páginas más leídas | `vistas.json` | Para saber qué sección rinde |
| Alta en Google Noticias | Publisher Center | Presentada en la semana 3 |

### 6.4 Redes

| Métrica | Dónde | Qué es "bien" |
|---|---|---|
| Seguidores (Facebook 53, Instagram 7 al 23/10) | `estadisticas.json`, informe | +20 % a 30 días (Facebook), +10 seguidores (Instagram) |
| Reproducciones por pieza (clima mañana 5.115 promedio; clima noche 370; farmacia 227; efeméride 204; repasos 181; repaso de noche 15) | Informe | Que el clima de la mañana y el resumen del día se mantengan, y decidir con datos qué piezas cortar |
| Clics a la web desde posteos de notas (hoy 0,1) | Informe | Si sigue en ~0, bajar posteos y subir reels |
| Cupo de voz usado | `uso-ia.json`, aviso | < 10 por día; ninguna pieza sin salir por cupo |
| Piezas que fallaron | Informe y `redes.json` | 0 sin motivo |
| Mensajes y comentarios sin responder | A mano | Una persona los mira todos los días |

### 6.5 Cómo mirarlas sin tiempo

Que una sola página las junte (el informe diario ya tiene casi todo): **una vez por semana, lunes, 10 minutos**: vueltas, minutos de compilación,
notas por día, lectores reales, indexadas, seguidores, piezas, gasto. Si algo cambia 30 % para mal, se anota en `PENDIENTES.md` y se mira.

---

## 7. Los archivos que usé

- Documentos: `CLAUDE.md`, `PENDIENTES.md`, `IDEAS.md`, `docs/TRASPASO.md`, `docs/DECISIONES.md`, `docs/08-INFRAESTRUCTURA.md`, `docs/11-OPERACION.md`,
  `docs/HOY.html`, `docs/RESUMEN-Y-PENDIENTES.html`, `docs/PASOS-PARA-HERNAN-Y-ANDRES.html`, `docs/seo/AUDITORIA-SEO-LLM.md`,
  `docs/etapa-10-operacion/` (`AUDITORIA-INTEGRAL-23-10.md`, `ANALISIS-SEMAFORO-Y-SIN-CUERPO.md`, `FOTOS-EN-R2.md`, `PLAN-DE-CAMBIO.md`, `MENOS-COMMITS.md`).
- Código y workflows: `infra/reloj-cloudflare/nube.mjs`, `infra/motor-cloudflare/presupuesto.mjs`, `infra/archivo-cloudflare/`, `infra/compartido/fotos-r2.mjs`,
  `ingesta/policial-nacional.mjs`, `ingesta/futbol-argentino.mjs`, `redes/enlaces-cortos.mjs`, `web/scripts/revisar-archivo.mjs`, y los workflows
  `respaldo.yml`, `compactar-historial.yml`, `pruebas.yml`, `armado-vacio.yml`, `redes-piezas.yml`, `desplegar-nube.yml`, `informe-diario.yml`.
- Comprobaciones en vivo (sólo lectura): `gh variable list`, `gh secret list` (sólo nombres y fechas), `gh run list`, `gh workflow list`, `gh repo view`,
  `radarbalcarce.com` (200), `…workers.dev/_archivo/estado`, `robots.txt`.

**Qué no pude comprobar (no está a mi alcance):** el valor de `NUBE` y de las variables del panel de Cloudflare (Workers Builds, Worker de tareas, reloj);
si la ruta de fotos está puesta; qué hay dentro de los depósitos R2 de respaldo; los minutos reales de Workers Builds de este mes; cuánta plata
se gastó este mes en Cloudflare.
