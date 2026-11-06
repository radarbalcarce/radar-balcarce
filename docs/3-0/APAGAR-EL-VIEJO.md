# Apagar el sistema viejo, paso a paso

*Escrito el 6/11/2026 para Hernán y Andrés. Todo lo que dice «medido» salió de pedirle cosas de verdad a `radarbalcarce.com` ese día (con un encabezado que apaga la red de seguridad del sitio, así se ve qué sirve el 3.0 solo) y de leer el código. **Nada se apagó ni se borró para escribir esto.** Cada paso se puede deshacer; está dicho cómo.*

## En dos líneas

1. El sitio nuevo ya sirve casi todo solo. **Faltan tres cosas**: copiar **380 fotos viejas** al depósito nuevo, **subir** lo que preparé para los videos de TikTok/YouTube/X (la ruta `/video/`) y **las efemérides** de fin de mes, que todavía las arma el motor viejo.
2. Recién con eso hecho se apaga, en este orden: red de seguridad → avisos duplicados → reloj → Workers viejos → (mucho después) borrar código.

## 1. Qué sirve todavía el sistema viejo (medido el 6/11)

**Cómo se midió:** 1.538 direcciones reales de `radarbalcarce.com`, todas con el encabezado `x-radar-respaldo: 1` (el sitio nuevo, al verlo, **no** le pregunta al viejo). Lo que da 200 así, lo sirve el 3.0 solo.

| Qué | Cuántas | Resultado sin el viejo | Qué falta |
|---|---|---|---|
| Portada, secciones, notas, buscador, clima, farmacias, dólar, agenda, tablas, `/hoy`, `/util`, `/compartir`, quiénes somos, contacto, privacidad, feeds, mapas del sitio, `robots.txt`, `ads.txt`, `llms.txt`, datos para agentes | unas 40 rutas | **200, las sirve el 3.0** | nada |
| Notas viejas por su dirección corta (`/nota/uutosd`) | 688 redirecciones | **301 a la nota nueva**, las sirve el 3.0 | nada |
| Panel del celular (`/panel/…`), escudos, videos de «compartir», íconos, manifiesto, verificación de Google, tipografías | unos 80 archivos | **200, salen del depósito R2** | nada |
| **Fotos de notas viejas (`/fotos-notas/…`)** | 1.431 en el repositorio | **1.051 andan; 380 dan 404** (el viejo sí las tiene). **296 de las 380 las pide alguna nota migrada** | **Copiarlas a R2** (paso 0) |
| `/nota/indice.json` (índice de notas para agentes) | 1 | daba 410 | **Hecho en el código:** ahora redirige (301) a `/agentes/indice.json`. Falta subir el sitio |
| Tarjetas de vista previa viejas (`/opengraph-image`, `/hoy/opengraph-image`, `/seccion/x/opengraph-image`) | 3 tipos | 404 (el viejo daba imagen) | **Nada, es a propósito** (decisión del cierre, la cuida `cierre.test.mjs`). Sólo afecta a vistas previas viejas guardadas en WhatsApp/Facebook |
| Notas más viejas que lo que tenía la portada del viejo | — | 410 «ya no está» | Nada: **el viejo tampoco las tenía** (probado con 59 notas de su archivo: el viejo daba 404 en todas) |
| Páginas numeradas de secciones (`/seccion/balcarce-2`) | 35 | 301 a `?pagina=2` | nada |
| `/agenda` | 1 | anda; si el municipio no contesta, 503 un rato | nada (es la fuente, no el viejo) |
| **`/video/<huella>/<nombre>.mp4`** (lo que lee Buffer para TikTok, YouTube y X) | — | **No vive en radarbalcarce.com**: lo sirve el Worker viejo `radar-balcarce-tareas` | **Hecho en el código:** la misma ruta ahora la sirve el Worker `radar-redes`. Falta subirlo (paso 2) |
| Archivos del repositorio que el 3.0 todavía importa (47 de `ingesta/`, `redes/`, `reels/`, `web/lib/`) y 3 JSON de `web/data/` (efemérides y feriados) | 47 + 3 | funcionan | **Mudarlos** antes de borrar carpetas (paso 8). Nada de esto se toca al apagar los Workers |

**Lo que NO es servicio pero sí depende del viejo:** el depósito R2 `radar-archivo` (de ahí salen las fotos para copiar) y `radar-render` (placas y videos del 3.0). **Los depósitos no se borran nunca** al apagar los Workers.

## 2. Lo que dejé listo (con pruebas, ya commiteado, sin subir)

| Cambio | Archivos | Pruebas |
|---|---|---|
| `/video/…` en el Worker de redes: GET, HEAD y por partes (Range), igual que el viejo; el programa de piezas le da a Buffer la dirección nueva (`radar-redes…/video/…`) | `v3/redes/video-publico.mjs`, `v3/redes/redes.mjs`, `v3/redes/piezas/correr.mjs` | `v3/redes/video-publico.test.mjs` (4) |
| `/nota/indice.json` → 301 a `/agentes/indice.json` | `v3/sitio/restos-del-viejo.mjs`, `v3/sitio/sitio.mjs` | `v3/sitio/restos-del-viejo.test.mjs` (2); todo `v3/sitio` (191) y `v3/redes` (212) en verde |
| Fotos propias cada 2 horas en vez de cada una (ahorra minutos de GitHub, ver § 5) | `.github/workflows/v3-fotos-propias.yml` | — (volver: el cron anterior está en el comentario del archivo) |

**Para que valga hay que subirlo** (lo hace una persona, en GitHub → Actions → «Radar 3.0: desplegar»): opción `sitio` (redirección) y opción `redes` (la ruta `/video/`). Los videos que Buffer ya tiene pendientes con la dirección vieja siguen andando mientras `radar-balcarce-tareas` esté prendido: **por eso el Worker de tareas se apaga último y esperando un par de días**.

## 3. Orden de apagado

Regla: **un paso por día, mirar un día, seguir.** Si algo se rompe, se hace lo de la columna «Volver atrás». Los pasos 1 a 3 no tocan nada que vea el público.

### Paso 0. Antes de apagar nada (se hace una vez)

1. **Copiar las 380 fotos que faltan a R2.** Actions → «Radar 3.0: desplegar» → opción `migrar` (corre `copiar-fotos.mjs`, que salta lo que ya está y sube lo que falta; se puede repetir). Después, medirlo de nuevo (pedirle a Claude «repetí el inventario de fotos»): tiene que dar **0 faltantes**. *Riesgo: ninguno, sólo agrega archivos.*
2. **Subir `sitio` y `redes`** (§ 2) y comprobar `https://radar-redes.radarbalcarce.workers.dev/video/xxx/yyy.mp4` con un video real de `listos/` (Claude lo prueba con HEAD y Range).
3. **Efemérides y feriados (hecho en el código el 6/11, sin subir):** el 3.0 ya las arma solo (`v3/redes/efemerides/`, workflow `v3-efemerides.yml`, día 20 de cada mes a las 10:00; escribe los mismos tres JSON de `web/data/` que lee el 3.0, más las candidatas). Falta que una persona cree la variable de GitHub `EFEMERIDES_V3_ACTIVAS` = `si` (por defecto no corre solo) y, antes de eso, probarlo a mano con «Radar 3.0: armar Un día como hoy y los feriados» (opción `simular`). Con eso ya se puede apagar el motor viejo sin esperar al 20/11; si no, el 20/11 se corre a mano. Ojo: lo que arma el programa es más cauto que la rutina de Claude (sin segunda fuente: sólo fechas curadas, Portal Argentina y lo muy conocido), así que algunos días pueden quedar sin pieza.

### Paso 1. Apagar la red de seguridad del sitio

| | |
|---|---|
| Qué es | `RESPALDO_VIEJO = "si"` en `v3/sitio/wrangler.toml`: lo que el sitio nuevo no sabe, se lo pide a `radar-balcarce.pages.dev` |
| Lo reemplaza el 3.0 | Sí, tras el paso 0 |
| Riesgo | Bajo: si faltara algo, da 404 (no se rompe nada más) |
| Cómo | Claude cambia `"si"` por `"no"` y se sube `sitio`. Mirar los 404 una semana (pestaña de eventos / vigilancia) |
| Volver atrás | Poner `"si"` y subir `sitio` (5 minutos) |

### Paso 2. Videos de Buffer por el Worker nuevo

Ya hecho en el paso 0.2; este paso es sólo **mirar un día** que TikTok, YouTube y X sigan recibiendo videos (la vigilancia 3.0 y el mail de Buffer lo dicen). *Volver atrás:* volver al commit anterior de `correr.mjs` (Claude).

### Paso 3. Avisos duplicados (informe por mail y vigilancia vieja)

| Cosa vieja | Qué hace | ¿Lo reemplaza el 3.0? | Riesgo | Cómo se apaga |
|---|---|---|---|---|
| Workflow `informe-diario.yml` + tarea `informe-diario` del Worker de tareas | Dos mails por día (8:15 y 21:15) con lo publicado, redes, visitas | Sí: el 3.0 avisa por Telegram (`v3/vigilancia`). **Hernán dijo que quería el informe: confirmar que el de Telegram lo cubre** | Bajo | Sacar `informe-diario.yml` de la variable `NUBE` del reloj y volver a subir el reloj; o apagar el reloj entero (paso 4) |
| Worker `radar-balcarce-vigilante` (cron cada 30 min) | Mira la web y avisa por mail si falla; también avisa del reloj | Sí (`radar-vigilancia`), pero **vigila la web nueva?** a confirmar | Medio: sin vigilante, una caída se nota tarde | Cloudflare → Workers → `radar-balcarce-vigilante` → Settings → Triggers → borrar el Cron |
| Workflow `vigilancia.yml` (tarea `vigilancia`, cada 3 h) | Idem, por WhatsApp (sin cupo hoy) | Sí | Bajo | Idem informe |

*Volver atrás:* volver a poner el cron / la variable `NUBE`.

### Paso 4. Apagar el reloj viejo (el que dispara todo lo demás)

`radar-balcarce-reloj` es el despertador: cada minuto decide si toca despertar al motor, a las redes viejas, a la revisión del archivo, a las pistas, etc. **Apagarlo para todo lo viejo de una vez.** Es el paso que más ahorra: el motor viejo gasta minutos de Workers Builds y casi todo lo demás gasta minutos de GitHub.

| | |
|---|---|
| Qué despierta hoy | motor `actualizar.yml` (cada 30 min, «Datos de la portada»), `redes.yml` (apagado desde el 3/11), `ilustrar-notas.yml`, `pistas.yml`, `auditoria-ia.yml`, **`revisar-archivo.yml`** (cada 2 h, siempre en GitHub), `vigilancia.yml`, `informe-diario.yml` |
| Lo reemplaza el 3.0 | Notas y sitio: **sí** (`radar-nucleo` cada 15 min). Redes: **sí** (`radar-redes`). Ilustraciones, pistas, auditoría IA, revisión del archivo: **no** (son del panel viejo y del criterio viejo; el 3.0 retira/corrige por Telegram) |
| Riesgo | **Medio.** Antes: confirmar que Hernán no usa pistas, ilustraciones automáticas ni la revisión del archivo. Antes también: **panel del celular** (paso 7) usa el Worker del reloj para «Actualizar la web ahora» y la pausa |
| Cómo | Cloudflare → Workers → `radar-balcarce-reloj` → Settings → Triggers → borrar los Cron (o dejar `NUBE` vacío y subirlo: eso lo manda todo a GitHub, **no** es apagar). Más prolijo: pedirle a Claude «sacá los crons del reloj» (queda registrado en git) |
| Volver atrás | Volver a poner los Cron o correr el workflow «Reloj de Cloudflare» |
| Ojo | cron-job.org sigue **pausado**; no despertarlo |

### Paso 5. Workflows de GitHub

De los 50 workflows sin prefijo `v3-`, **sólo 6 corren solos (por horario o en cada subida)**; los otros 43 son «a mano» y no gastan nada mientras nadie los toque.

| Workflow | Qué hace | ¿Lo reemplaza el 3.0? | Riesgo al apagar | Cómo |
|---|---|---|---|---|
| **`pruebas.yml`** | Corre las ~3.000 pruebas del sistema viejo **en cada subida (push)** y los lunes | No: el 3.0 no tiene pruebas automáticas en cada subida | **Medio** (sin él nadie avisa si se rompe algo compartido) pero **hoy falla 58 de 100 veces** y es lo que más minutos gasta (§ 5). Antes de apagarlo, que Claude arme uno `v3-pruebas.yml` que corra sólo las pruebas del 3.0 | Actions → Pruebas → ⋯ → Disable workflow |
| `armado-vacio.yml` (en cada push y lunes) | Arma el sitio viejo con datos vacíos | No hace falta | Ninguno | Disable workflow |
| `pruebas-otra-hora.yml` (lunes) | Pruebas con otra hora | No hace falta | Ninguno | Disable workflow |
| `auditoria.yml` (lunes) | Mira imágenes, íconos y SEO **del sitio viejo** | Parcial | Bajo | Disable workflow |
| `informe-diario.yml` (2 por día) | Informe por mail | Ver paso 3 | Bajo | Disable workflow |
| `respaldo.yml` (domingos) | Copia de **todo el repositorio** | Parcial: `v3-respaldo-d1` copia la base, no el código | Medio | **Dejarlo** hasta que el repositorio tenga otro respaldo de código; es 1 corrida por semana |
| `actualizar.yml`, `revisar-archivo.yml`, `ilustrar-notas.yml`, `pistas.yml`, `auditoria-ia.yml`, `vigilancia.yml`, `redes.yml`, `panel.yml`, `piezas.yml`, `redes-piezas.yml`, `reintentar.yml`, `publicar-a-mano.yml`, `reel-a-mano.yml`, `fijar-piezas.yml`, `buffer.yml` | Todo el motor, el panel y las redes del sistema viejo | Notas/sitio/redes: sí. `panel.yml`, `pistas.yml`, `ilustrar-notas.yml`: no (paso 7) | Bajo (los despierta el reloj, que ya está apagado) | Quedan sin uso; **Disable workflow** al final, en tandas |
| Infraestructura que se subió una vez (`desplegar-nube.yml`, `reloj-cloudflare.yml`, `vigilante-cloudflare.yml`, `imagenes-cloudflare.yml`, `archivo-produccion.yml`, `archivo-staging.yml`, `cloudflare-deploy.yml`, `motor-variables.yml`, `motor-estado.yml`, `reloj-estado.yml`) | Subir o mirar los Workers y Pages viejos | No | Ninguno | Disable workflow después del paso 6 |
| Herramientas a mano (`claves-huella`, `probar-gemini`, `probar-restauracion`, `diagnostico-instagram`, `generar-fondos-clima`, `fotos-a-r2`, `compactar-historial`, `auditar-voz`, `crear-voces`) | Diagnósticos y tareas únicas | `crear-voces` y `auditar-voz`: **no tocar** (las voces propias vencen el 29/09/2027) | Ninguno | Dejarlos; no gastan |

*Cómo se desactiva uno (sin código):* GitHub → Actions → elegir el workflow a la izquierda → botón **⋯** arriba a la derecha → **Disable workflow**. Se vuelve a prender con **Enable workflow**. No se borra nada.

### Paso 6. Workers y Pages viejos de Cloudflare

Un Worker se apaga sin borrarlo: Cloudflare → Workers & Pages → el Worker → Settings → «Domains & Routes» → desactivar el `workers.dev` (y Triggers → borrar Cron). Se vuelve a prender igual.

| Worker / servicio | Qué hace | ¿Lo reemplaza el 3.0? | Riesgo | Antes de apagar |
|---|---|---|---|---|
| `radar-balcarce-tareas` | Tareas de GitHub movidas a la nube (informe, pistas, auditoría, ilustraciones, redes viejas) **y la ruta `/video/` de Buffer** | `/video/` sí (paso 0.2); el resto no se usa | **Alto si se olvida el `/video/`** | Esperar 2 días tras el paso 2: ningún pedido de Buffer pendiente con la dirección vieja. **Apagarlo último** |
| `radar-balcarce-reloj` | El despertador | Sí | Ver paso 4 | — |
| `radar-balcarce-vigilante` | Vigilante viejo por mail | Sí (`radar-vigilancia`) | Medio | Ver paso 3 |
| Motor viejo en Workers Builds (`radar-balcarce-motor`, «Datos de la portada») | Armaba y subía el sitio viejo cada 30 min; hace las efemérides del día 20 | Sí, salvo las efemérides | **Medio hasta resolver 0.3** | Pausar el deploy hook (Workers Builds → el proyecto → Settings → Build → desactivar) |
| `radar-balcarce-archivo` | Archivo permanente del sitio viejo; **hoy sin ruta en radarbalcarce.com** | Sí (las notas viejas están en la base D1) | Bajo | Que la base D1 esté respaldada (`v3-respaldo-d1`) |
| `radar-balcarce-imagenes` | Imágenes con Workers AI para el sitio viejo | No se usa en `v3/` | Bajo | — |
| `radar-balcarce-enlaces` | Acortador de enlaces, **ya apagado** | No se usa | Ninguno | — |
| Cloudflare Pages `radar-balcarce` (`radar-balcarce.pages.dev`) | El sitio viejo; hoy lo usa la red de seguridad | Sí, tras el paso 1 | Bajo, **después de una semana sin 404** | Paso 1 con «no» una semana. Recién entonces pausar el proyecto de Pages |
| Los depósitos R2 (`radar-fotos`, `radar-archivo`, `radar-render`, `radar-motor`, `radar-tareas`) | Datos | `radar-fotos` y `radar-render` los usa el 3.0 | **No borrar nunca** | — |
| Los Workers del 3.0 (`radar-nucleo`, `radar-sitio`, `radar-redes`, `radar-telegram`, `radar-vigilancia`) | El sistema vigente | — | — | **No tocar** |

### Paso 7. El panel viejo del celular (decide Hernán)

`/panel/` sigue sirviéndose desde R2 y sus workflows (`panel.yml`, `pistas.yml`) corren en GitHub. El bot de Telegram hace «retirar», «corregir», «últimas» y «pendientes», pero **no cubre** las pestañas Fotos, Fechas, Contactos, Pistas, Números ni Revisión. Mientras eso no se decida, **dejar el panel, `panel.yml` y las claves de GitHub que usa**. Si se retira: sacar `/panel/` de `v3/sitio/estaticos.mjs` y de `v3-desplegar.yml`.

### Paso 8. Borrar código (mucho después, con respaldo)

Sólo cuando los pasos 1 a 6 lleven una semana sin sustos: (1) mudar los 47 archivos y los 3 JSON a `v3/`, (2) respaldar la base D1 y las notas viejas, (3) recién ahí `web/`, `ingesta/`, `redes/`, `reels/`, `pruebas/`, `infra/`. Detalle y lista: `docs/3-0/auditoria-05-11/LIMPIEZA.md` (listas B y C).

## 4. Qué decidir antes (resumen)

1. ¿El informe de Telegram reemplaza los mails de las 8:15 y las 21:15?
2. ¿Quién genera las efemérides del 20/11? (a mano ese día o pasarlo al 3.0)
3. ¿Se usan todavía el panel viejo, las pistas, las ilustraciones automáticas o la revisión del archivo? Si sí, el reloj no se apaga entero.
4. ¿La vigilancia 3.0 ya mira la web nueva como la vieja? (a confirmar con `v3/vigilancia/REGLAS.md`).

## 5. Minutos de GitHub Actions (por si el repositorio pasa a privado)

Plan gratis: **2.000 minutos por mes**, y cada tarea se redondea **hacia arriba al minuto** (un trabajo de 28 segundos gasta 1 minuto). En un repositorio **público** son gratis y sin tope, hoy no se paga nada.

**Duraciones reales** (sin `gh`: la API pública de GitHub, corridas del 3/11 al 6/11; `piezas`: 40 corridas por horario, 49 en total; `fotos propias`: 10 por horario):

| Workflow | Corridas por mes | Duración real | Minutos facturados | **Minutos por mes** |
|---|---|---|---|---|
| `v3-piezas` (cada hora, de 7:07 a 23:07 de Balcarce: 17 al día) | 527 | mediana 2 min 15 s, media 2 min 37 s; una de 24 min (pico) | **3,08 por corrida** (35 % de las corridas, 1 min; las que arman video, 3 a 7 min) | **≈ 1.620** |
| `v3-fotos-propias` (era cada hora: 18 al día) | 558 | 28 s | 1 | **≈ 560** |
| `v3-fotos-propias` (**ahora, cada 2 h: 9 al día**) | 279 | 28 s | 1 | **≈ 280** |
| `v3-respaldo-d1` (diaria) | 31 | sin corridas todavía; estimado 2 min (baja `wrangler`, exporta, sube) | 2 | ≈ 60 (estimado) |
| `v3-desplegar`, `v3-nucleo`, `v3-telegram`, `v3-unir-repetidas`, `v3-corte` (a mano o por subida) | — | 3 a 10 min cada una | — | ≈ 100 a 200 (hoy más: 58 despliegues en 3 días, 154 min; baja cuando termine la construcción) |
| **Total 3.0 hoy (con fotos cada 2 h)** | | | | **≈ 2.060 a 2.160: justo por encima del tope** |
| *(antes del cambio)* | | | | *≈ 2.340 a 2.440* |

**Lo viejo que hoy también gasta** (si el repositorio fuera privado, medido del 3/11 al 6/11 y proyectado a 30 días):

| Workflow viejo | Por mes (proyección) | Se corta con |
|---|---|---|
| **Pruebas** (en cada subida: 93 subidas en 3 días, ~4 min cada una) | **≈ 3.300** a este ritmo de trabajo | paso 5 |
| Revisar el archivo (cada 2 h, 1 min) | ≈ 370 | paso 4 |
| Informe diario (2 por día) | ≈ 60 | paso 3 |

**Conclusión:** con el sistema viejo prendido, un repositorio privado **se pasa varias veces** de 2.000. Sin él, el 3.0 queda en **≈ 2.100** y hay que bajar otros ~400 para tener margen.

**Dónde está el gasto de `piezas` (importante para decidir):** no son las corridas vacías (17 de las 49 duraron 1 minuto: ≈ 190 min por mes). Son las que arman videos: dibujar con resvg y juntar con ffmpeg, unos 1.400 min por mes. **Pasar la cadencia de cada hora a cada 2 horas ahorra poco (≈ 200 a 350) y arriesga las piezas de ventana de una hora** (Participá a las 12:00, teléfonos útiles los sábados a las 17:00).

### Propuestas (de más a menos efecto)

| # | Propuesta | Ahorro por mes | Riesgo | Estado |
|---|---|---|---|---|
| A | **Dejar este repositorio público** (hoy lo es). Los minutos son gratis y sin tope. Sólo hace falta que no tenga secretos (los tiene en GitHub Secrets, que no se publican) y compactar el historial | **todo** (≈ 2.100) | Baja: es lo que hoy ya pasa. Pendiente: ya figura en `PENDIENTES.md` y es decisión de Hernán | A decidir |
| B | **Mover sólo el armado de videos al repositorio público de render** (`infra/render-publico/`, ya escrito y probado para el sistema viejo: pedido firmado, 1 hora de validez, sin secretos). `v3-piezas` quedaría con el plan, la voz y las placas (≈ 1 min) y el video se arma gratis | ≈ 1.100 a 1.300 (piezas baja a ≈ 500) | Medio: hay que adaptar `render.mjs` a las piezas del 3.0 y crear el repositorio `radar-balcarce-render`. Trabajo de una etapa. **No lo hice**: toca la publicación en vivo | Propuesto |
| C | **Pruebas sólo del 3.0 y sólo cuando cambia código** (`paths-ignore` de `docs/**`, y no correr las viejas) | ≈ 3.000 (sólo si lo viejo sigue prendido) | Bajo | Propuesto; no aplicado (puede dejar sin red de seguridad al código compartido) |
| D | **Fotos propias cada 2 horas** | ≈ 280 | Muy bajo: sólo demora la copia de una foto | **Aplicado** (commit 952f76b0; el de `/video/` y la redirección, 5c8d2fec). Para volver, el cron anterior está en el comentario del archivo |
| E | Juntar «fotos propias» dentro del trabajo de `piezas` (un solo trabajo, un solo redondeo) | ≈ 250 | Bajo, pero hay que tocar dos workflows | Propuesto |
| F | Que el reloj de Cloudflare despierte `v3-piezas` sólo cuando el plan dice que hay algo (hoy lo despierta un horario fijo) | ≈ 190 (las corridas vacías) | Bajo | No conviene solo: ahorra poco |

**Recomendación:** A si Hernán acepta seguir público (costo cero y cero trabajo); si no, **B + D + C**: queda en **≈ 900 a 1.000** minutos por mes, con margen para despliegues.
