# Orden del repositorio y minutos de Actions (20/11/2026)

*Relevamiento hecho sólo mirando (sin commitear, borrar ni tocar la historia). Ningún valor sensible aparece acá: se dice archivo y qué es. Cierra y actualiza el hallazgo H-08 de `AUDITORIA-SISTEMA-17-11.md`.*

## 1. Resumen en cinco líneas

1. **No hay claves reales subidas** (ni en lo último ni en la historia revisada). Los hallazgos de tipo `AIza`, `ghp_`, `AKIA`, `EAA` son datos de prueba dentro de tests o texto de imágenes embebidas.
2. **Hay datos personales y comerciales subidos** que conviene bajar: 6 borradores en `notas-propias/`, un mail personal en `comercios.json`, la ficha y los precios del primer anunciante.
3. **La grilla con teléfonos ya está en `.gitignore`** (se arregló desde la auditoría). Falta `scripts/pc/` entero y decidir `MAPA-Y-CRONOGRAMA-25-10.html`.
4. **Los minutos de Actions están peor de lo que se creía**: con el kit 3.0 prendido, cada corrida de piezas gasta de 5 a 13 minutos (no 2 a 4), casi todo en instalar ffmpeg con `apt`. Hoy se va camino de 5.000 a 6.000 min/mes.
5. **Con los cambios de abajo se llega a unos 1.900 a 2.400 min/mes**: justo en el borde de los 2.000. Para pasar a privado con tranquilidad hace falta además sacar piezas y fotos a un repositorio público de render (ya decidido en PENDIENTES) o a Workers.

## 2. Datos sensibles en lo subido (`git ls-files`)

| Dónde | Qué es | Gravedad | Qué hacer |
|---|---|---|---|
| `docs/3-0/notas-propias/` (6 archivos: 2 borradores de CAME, `ahora-pymes-embargos-NOTA`, y 3 del vino, uno es `...MENSAJE-A-COMERCIOS` con las 8 cuentas de Instagram a las que se escribiría) | Borradores no publicados y mensaje comercial sin enviar | Media | `git rm --cached` y agregar la carpeta a `.gitignore`; guardar en `D:\BalcarDev\RadarMedia\`. Lo ya publicado queda en el sitio |
| `comercial/datos/comercios.json` (unas 25 líneas con teléfono; una con mail personal tipo hotmail) | Base de comercios sacada de OpenStreetMap, con datos de contacto de personas | Media | Sacar de git (ya se regenera con `importar-osm.mjs`; ya se ignora `osm-crudo.json`, sumar este) o al menos borrar los mails/teléfonos de particulares |
| `docs/propuestas/anunciantes/sweet-candy-bar.{md,json,pdf}` y `...-preguntas.pdf`, `PUBLICIDAD-PRIMER-COMERCIO.md`, `docs/propuestas/MEDIA-KIT-2026-11.*`, `docs/3-0/PUBLICIDAD.md` | Nombre de un anunciante concreto, su negociación y precios | Media | Mover a la carpeta privada y dejar en el repo sólo plantillas sin nombres ni precios. El media kit es para mandarlo: puede seguir si Hernán lo da por público |
| `docs/08-INFRAESTRUCTURA.md`, `09-PANEL.md`, `COMO-FUNCIONA-HOY.html`, `docs/proyecto/PANEL-REDISENO.md`, `docs/historico/panel/PLAN-NUEVO-PANEL.md` (y `web/public/panel/app.js`) | Nombran el mail de la cuenta vieja `balcardev@gmail.com` | Baja | Dejar (no es secreto), o reemplazar el mail por «la cuenta vieja» |
| `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md` (línea 1620) | Una dirección larga con `sk-` adentro (parte de una URL de un artículo), no es clave | Ninguna | Dejar |
| Tests: `v3/redaccion/telegram/nota-propia.test.mjs`, `v3/redes/piezas/correr.test.mjs`, `pruebas/pausa-general.test.mjs`, `pruebas/r2-s3.test.mjs`, `pruebas/fotos-notas.test.mjs`, `docs/historico/FOTOS-ANTES-Y-DESPUES.html` | Valores falsos de prueba (de ejemplo) e imágenes en base64 | Ninguna | Dejar |
| `docs/etapa-1-fuentes/BALCARCE-INVESTIGACION.md`, `REVISION-FUENTES.html`, `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md`, `docs/redes/TABLA-DE-REDES.html`, `PERFILES.md` | Teléfonos y mails de instituciones y comercios (públicos en sus propias páginas) | Baja | Dejar |
| WhatsApp del medio `2266 51-1612` y `contacto@radarbalcarce.com` | Contactos públicos del medio | Ninguna | Dejar |
| `.claude/settings.local.json` (sólo en la PC, ignorado, nunca subido) | Tiene una clave de OpenAI vieja (PENDIENTES § 0) | Alta para la PC, nula para el repo | **Revocarla** en OpenAI: es lo único que de verdad hay que hacer |

## 3. Historia de git

| Qué se miró | Resultado |
|---|---|
| Patrones de claves (Google `AIza`, GitHub `ghp_`/`github_pat_`, OpenAI/OpenRouter/Anthropic `sk-`, Slack, llaves privadas) en todas las ramas, 5.605 commits, en `v3`, `docs`, `scripts`, `.github`, `infra`, `ingesta`, `reels`, `redes`, `panel`, `comercial`, `motor`, `pruebas` y archivos `.md`/`.json` de la raíz | **Sin hallazgos** |
| Archivos que nunca debieron subirse (`.env*`, `.dev.vars*`, `.claude/*`, `respaldos/`, `panel/datos/`, `*.sql.gz`, `.pem`, `.key`, grilla, `scripts/pc/`, `LISTADO*`, `SALIDA-BALCARCE*`) | **Ninguno fue agregado alguna vez** |
| Límite del control | `web/` (sitio viejo, 1.867 archivos, la mayor parte datos y fotos) se revisó sólo en parte; si Hernán quiere certeza total, correr un escáner (gitleaks) en su PC. No se pudo confirmar a mano ningún token de Meta ni de Buffer |
| Peso | `.git` pesa 851 MB. Existe el workflow `compactar-historial.yml`; se usa sólo si algún día hay que sacar algo de la historia, que **hoy no hace falta** |

Conclusión: no hay nada en la historia que obligue a revocar claves. Lo único con dato personal que ya está en historia (borradores y la base de comercios) no se puede «des-publicar» sin reescribir la historia; es de gravedad media y se decide después.

## 4. Orden del repositorio

| Tema | Estado | Propuesta |
|---|---|---|
| `.gitignore` | La grilla (`docs/3-0/grilla/`, `LISTADO-*`, `SALIDA-BALCARCE.html`, `GRILLA-NOTAS-TURISTICAS.md`, `EDIFICIO-MUSEO-FANGIO.md`) **ya está**. Falta `INFORME-REELS-DINAMICOS.md` si todavía existe | Agregar `scripts/pc/` entero (hoy sólo dos `.mjs` están ignorados; los `.bat`, `.ps1` quedan sueltos: son de la PC de Hernán, con rutas `D:`, sin secretos), `docs/3-0/notas-propias/`, `comercial/datos/comercios.json`, `docs/propuestas/anunciantes/`, `.claude/` ya está |
| `docs/propuestas/MAPA-Y-CRONOGRAMA-25-10.html` (sin seguir, 42 KB) | Mapa de octubre, del sistema viejo; sin datos sensibles | Ignorar o guardar en `docs/historico/`; no subirlo tal cual (confunde con los horarios viejos) |
| Raíz con 12 `.md` sueltos (`COMERCIAL`, `FORMATOS`, `FUENTES`, `IDEAS`, `INVESTIGACION`, `MEDIA-KIT`, `PENDIENTES`, `PERFILES`, `POLITICA-PRIVACIDAD`, `PUBLICIDAD`, `CRITERIO-*`) | Los últimos cambios son de septiembre a noviembre; `PENDIENTES.md` y `FUENTES.md` son del viejo. Los dos `CRITERIO-*` los cita el código 3.0 | Dejar `CRITERIO-*` y `POLITICA-PRIVACIDAD.md`. Mover el resto a `docs/historico/` (verificando antes con `grep` que ningún test o código los lea) |
| Sistema viejo: `web/` (37 MB), `reels/` (10 MB), `pruebas/` (5 MB), `infra/` (2 MB), `ingesta/`, `redes/`, `panel/`, `motor/`, `scripts/` (parte) | Según `APAGAR-EL-VIEJO.md` y la auditoría (H-10), el código 3.0 todavía importa 21 archivos de ahí | **No borrar todavía.** Orden: mover esos 21 archivos a `v3/`, después `panel/`, `motor/`, `pruebas/` y los 35 workflows viejos; `web/` va al final (sólo `web/data` de efemérides/feriados se usa) |
| `.github/workflows` | 57 archivos; sólo 18 son `v3-*`. Los otros 39 son del viejo (12 desactivados, ~20 «activos» sin horario) | Borrar los viejos en un solo commit después de confirmar que ningún `v3-*` los llame; reduce ruido y riesgo de que alguien los dispare |
| Variables y secretos de GitHub del viejo | `OPENROUTER_API_KEY`, `WHATSAPP_*`, `REDES_ACTIVAS*` | Borrar (los borra Hernán en GitHub → Settings) |

## 5. Minutos de GitHub Actions: medición y estimación

**Qué se midió** (corridas de los últimos 7 días, redondeando cada trabajo al minuto como cobra GitHub, y los pasos de una corrida con el kit):

| Workflow | Corridas en 7 días | Minutos cobrados | Equivale por mes |
|---|---|---|---|
| Piezas de redes | 122 | 330 (mayormente **antes** del kit) | 1.400 (hoy, con kit: 3.600 o más) |
| Fotos propias | 63 | 122 | 520 |
| Desplegar | 29 | 120 | 510 |
| Pruebas (en cada push) | 62 | 80 | 340 |
| Vino, ensayo del kit, nota a mano, respaldo, efeméride, estadísticas, comparar | 63 | 118 | 500 |
| **Total** | 345 | 790 | **3.400** (con el kit en todas las horas: 5.000 a 6.000) |

Hallazgo clave: el paso «ffmpeg y ffprobe» con `apt-get` tardó 239, 419 y 736 segundos en las tres corridas de la noche del 19 al 20, y **corre en cada hora, hasta cuando no hay nada para armar**. Las corridas ociosas (9 de las 17 del día) hoy cuestan lo mismo que las que arman. El checkout tarda unos 15 s siempre.

**Piezas con trabajo real** (según `piezas-del-dia.mjs`): 07:00 clima, 09:00 efeméride, 10:00 repaso, 15:00 repaso, 19:00 farmacia, 20:00 clima, 21:00 repaso del día, más las notas propias (variable) y los avisos de clima si hay. Son unas 8 a 9 corridas útiles por día de las 17 que hoy se disparan.

### Cambios y número después de cada uno (acumulados, minutos por mes)

| # | Cambio | Dónde | Queda | Ahorro |
|---|---|---|---|---|
| 0 | Hoy, con el kit 3.0 prendido | | **~5.500** (4.500 a 6.500) | |
| 1 | **Guardar con `actions/cache`**: `node_modules` del kit, Chrome de hyperframes (`~/.cache/hyperframes`) y el `.deb` de ffmpeg (o usar el `ffmpeg-static` del repo y no usar `apt`) | `v3-piezas.yml`, mismos pasos | ~3.700 (una corrida útil pasa de 8 a 5 min, una ociosa de 8 a 1,5) | −1.800 |
| 2 | **No lanzar la corrida si no toca nada**: el Worker `radar-redes` ya sabe qué toca (`POST /piezas/plan`); que lo consulte antes de despertar GitHub y sólo dispare si hay piezas o notas propias nuevas | `v3/redes/disparar-acciones.mjs` (el cron queda igual, cuesta cero minutos) | ~3.300 | −400 |
| 3 | **Podar el resto**: `Pruebas` sólo si cambia `v3/**` (−170); fotos propias de cada 2 h a 3 por día o sólo si el Worker ve fotos pendientes (−300); borrar workflows viejos «activos» (0); `ensayo del kit` y `comparar` sólo a mano (ya lo son) | `.github/workflows/*.yml` | ~2.800 | −500 |
| 4 | **Mover trabajo liviano a Workers de Cloudflare** (gratis): respaldo de la base a R2 (la API REST de D1 exporta sin `wrangler`), estadísticas diarias, nota de «Un día como hoy», nota a mano y el cambio de sección (ya existe el bot de Telegram en un Worker), la copia de fotos (el sitio ya tiene `fotos-copia.mjs` y el binding a R2) | `v3/nucleo`, `v3/redes`, `v3/sitio` | ~2.400 | −400 |
| 5 | **Juntar las piezas en 5 corridas fijas por día** (07:07, 10:07, 15:07, 19:07, 21:07 de Balcarce; las ventanas de 3 a 5 horas lo permiten) y copiar `checkout` con `sparse-checkout` (sólo `v3/`, `package*.json`, `web/data`) | `piezas-del-dia.mjs`, `disparar-acciones.mjs`, `v3-piezas.yml` | **~1.900 a 2.000** | −450 |
| 6 | **Alternativa fuerte (ya decidida en PENDIENTES § 0, «mudanza de repositorios»):** `radar-balcarce-render` queda público y corre piezas y fotos propias con minutos ilimitados; el repositorio principal privado sólo despliega y prueba | repositorio nuevo | **~800 a 1.200** en el privado | −1.100 más |

Lectura: los cambios 1 a 5 son todos chicos y no tocan el contenido, pero **dejan el uso en el borde de los 2.000 minutos**, sin margen para las pruebas de más ni los despliegues de un día de trabajo (cada desplegar son unos 4 minutos y corre las 1.059 pruebas). Con el 6 sobra espacio. Las cuentas son un cálculo con datos de 7 días y no una garantía: hay que mirar `Settings → Billing` una semana antes de pasar a privado.

Pendiente que no depende de los minutos: pasar a privado también cuenta el almacenamiento de artefactos y de `actions/cache` (500 MB gratis); los videos de `Dejar las piezas para ver` conviene borrarlos a los 3 días (`retention-days: 3`).

## 6. Orden sugerido (sin tocar nada hoy)

| Paso | Qué | Quién | Tiempo |
|---|---|---|---|
| 1 | Revocar la clave de OpenAI de la PC | Hernán | 5 min |
| 2 | `.gitignore` + sacar de git (`git rm --cached`) `notas-propias/`, `comercios.json`, `anunciantes/`; guardar copias en `RadarMedia` | Claude con OK de Hernán | 20 min |
| 3 | Cambios 1 y 2 de la tabla de minutos (cache y no disparar en vacío): son los que más rinden | Claude, y despliegue de `redes` a mano | 2 h |
| 4 | Mover los 21 archivos del viejo a `v3/` y borrar los workflows viejos | Claude | 1 jornada |
| 5 | Decidir mudanza de render (cambio 6) y recién después pasar a privado | Hernán | — |
