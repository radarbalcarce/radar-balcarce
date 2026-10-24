# El motor en Cloudflare (`radar-balcarce-motor` + Workers Builds)

"Actualizar la web" (`.github/workflows/actualizar.yml`, 8.100 minutos de GitHub por mes) como **un programa de Node que corre dentro de Workers Builds**, la máquina de compilación de Cloudflare
(6.000 minutos por mes incluidos en Workers Paid). Todo el porqué, los números y los pasos: `docs/etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md` y `PLAN-DE-CAMBIO.md`.

```
reloj (:00 y :30) ──presupuesto──▶ POST deploy hook ──▶ Workers Builds
                                                        └─ node infra/motor-cloudflare/vuelta.mjs      (Build command)
                                                        └─ node infra/motor-cloudflare/listo.mjs       (Deploy command: no hace nada)
```

| Archivo | Qué hace |
|---|---|
| `vuelta.mjs` | La vuelta, paso por paso como el workflow: candado → instalar → núcleo legal → memoria del cruce (R2) → `generar-datos.mjs` → compilar → SEO → **guardar por la API de GitHub** → ¿entró algo que el sitio lee? recompilar → archivo permanente → `wrangler pages deploy` → IndexNow → anotar la vuelta y soltar el candado. `MOTOR_SIMULAR=Si` (o `--simular`) hace todo menos guardar, subir o escribir en R2. |
| `archivos.mjs` | Qué archivos guarda (la línea `git add` del workflow, igualada por una prueba) y cómo sabe cuáles cambiaron (foto de SHA antes/después). |
| `estado-r2.mjs` | La memoria (`.cache/`), el candado, el estado de la última vuelta y el registro de minutos del mes, en el depósito R2 `radar-motor`. |
| `presupuesto.mjs` | Cuántos minutos de Workers Builds lleva el mes y si conviene saltearse una vuelta (lo usa el reloj antes de pedirla). Cuenta por **ciclo de facturación de Cloudflare (del 11 al 10; variable `MOTOR_CICLO_DIA`, regla 315)** y no por mes calendario, y migra solo el registro por mes que había. Desde el 24/10 (regla 312) también suma el tiempo de cada paso, proyecta el mes al ritmo pedido (`proyectar`) y arma el aviso del vigilante (`avisoDeMinutos`). |
| `tarjetas-r2.mjs` | Con `TARJETAS_EN_R2=Si`: después de compilar sube a R2 las tarjetas dibujadas de nuevo, anota cuáles se pidieron hoy y borra las de más de 3 días (la parte de leer está en `../compartido/tarjetas-r2.mjs`). Ver `docs/etapa-10-operacion/MINUTOS-DE-WORKERS-BUILDS.md`. |
| `worker.mjs` + `wrangler.toml` | El Worker al que se conecta el repositorio (sólo `GET /estado` con `x-token`). |

**Qué NO es:** no guarda los datos en R2 (siguen en `web/data/` del repositorio; ver la sección 2 de la migración), no corre las pruebas enteras (sólo el núcleo legal, como antes) y no publica en redes.

**Variables y secretos de la compilación** (Workers Builds → Settings → Builds): la lista exacta está en el paso 8 del plan. Falta una llave → la vuelta se niega a empezar y lo dice (no armaría nada que se pueda guardar).

**Ensayo:** `node infra/motor-cloudflare/vuelta.mjs --simular` en una máquina con las dependencias instaladas arma todo sin guardar ni subir (la vuelta le pone `RADAR_MOTOR=cloudflare` a `generar-datos.mjs`, que si no se niega a armar fuera de GitHub). **Cuidado: gasta cupo de IA de verdad**, y deja `web/data/` cambiado en esa máquina (no subirlo).
