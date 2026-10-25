# El Worker de tareas (`radar-balcarce-tareas`)

Seis workflows de GitHub que gastaban minutos esperando respuestas de una IA o de Meta, ahora en un Worker de Cloudflare (18/10/2026). **No tiene horarios propios:** lo despierta el reloj
(`infra/reloj-cloudflare/`) por un *binding* de servicio, según la variable `NUBE`. Sin `NUBE` (o sin el archivo de la tarea en la lista) no corre nada. Todo el porqué, los números y el plan:
`docs/historico/etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md` y `PLAN-DE-CAMBIO.md`.

| Tarea | Reemplaza a | Programa que corre (el de siempre) | Guarda |
|---|---|---|---|
| `vigilancia` | `vigilancia.yml` | `redes/vigilar.mjs` (`main`) | `web/data/{vigilancia,estadisticas,estadisticas-piezas}.json` |
| `auditoria-ia` | `auditoria-ia.yml` | `redes/auditar-notas.mjs` | `web/data/{auditoria-ia,correcciones-auditoria}.json` |
| `pistas` | `pistas.yml` | `panel/revisar-pistas.mjs` (une con lo que escribió una persona) | `web/data/{pistas,notas-de-pistas}.json` |
| `informe-diario` | `informe-diario.yml` | `redes/informe-diario.mjs` | nada (manda el mail) |
| `ilustrar-notas` | `ilustrar-notas.yml` | `web/scripts/ilustrar-notas.mjs` (`automatico`) | `web/data/fotos-ia.json` y las fotos nuevas |
| `redes` | la mitad de `redes.yml` | `redes/publicar.mjs` (Facebook, publicar el video listo, direcciones de los podcasts) + lo que toca (`estadoDelReloj`) | `web/data/redes.json` |

## Cómo funciona

`corredor.mjs`: baja de GitHub (API, `main`) **sólo** los archivos que la tarea declara (`lee`), los deja en `/tmp/radar` (el sistema de archivos en memoria de `nodejs_compat`), corre el programa con
`RADAR_RAIZ=/tmp/radar`, guarda lo que cambió con **un commit por la API** (mismo mensaje y autor que el workflow) y anota cómo salió en KV. Un candado por tarea evita que dos corridas se pisen. Si el
programa falla a mitad, **igual se guarda lo que alcanzó a hacer**.

- `GET /` · en hora. `GET /estado` (con `x-token`) · cómo salió la última corrida de cada tarea (lo mira el vigilante de afuera) y, en `empezo`, cuándo ARRANCÓ la última (regla 318: si es más nueva que `cuando`, esa corrida no llegó a anotar cómo terminó, la cortaron). El reloj deja correr una tarea 15 minutos: ninguna debería acercarse (la auditoría IA no empieza pedidos nuevos pasados los 240 s).
- `POST /correr` (con `x-token`: `VIGILANTE_TOKEN`) · `{ "tarea": "vigilancia", "inputs": {…}, "simular": true }`. **`simular` corre todo y no guarda nada**: es el ensayo del plan.

## Qué hay que saber al tocar

- `lee`/`escribe` en `tareas.mjs` **no se inventan**: `pruebas/tareas-cloudflare.test.mjs` corre cada programa con los datos reales y falla si lee o escribe algo no declarado. Agregar un archivo nuevo a una tarea = agregarlo ahí.
- El Worker necesita `entrada.mjs` como `main`: `arranque.mjs` se carga ANTES que todo (lleva `CRITERIO-EDITORIAL.md` y `CRITERIO-REDES.md` como texto, porque los programas los leen del disco al importar).
- `[define]` de `wrangler.toml` reemplaza `import.meta.dirname`/`url` (en un Worker no existen) por una carpeta de `/tmp`; los programas usan `RADAR_RAIZ` (`redes/raiz.mjs`).
- **No se probó dentro de `workerd`** (esta PC no lo corre). Se probó en Node y el empaquetado con `wrangler deploy --dry-run`. El plan tiene el ensayo en seco.
- Secretos y variables: la lista está en `worker.mjs` (arriba) y en `.github/workflows/desplegar-nube.yml`. Las variables (`REDES_ACTIVAS`, `R2_ARCHIVO`, `WORKFLOWS_EN_LA_NUBE`) se editan en el panel de Cloudflare.
- **Fotos en R2 (regla 316).** Con la variable `FOTOS_EN_R2` en «Si» (el despliegue la lleva con `--var`; vacía = apagada), la tarea `ilustrar-notas` sube las ilustraciones nuevas al depósito `radar-archivo` por el binding `ARCHIVO` (antes del commit del libro; si R2 falla, van al commit) y trae de ahí (o del sitio) las que tiene que volver a mirar; esas copias de trabajo llevan `deR2` y el corredor no las sube ni las borra de git. Apagada, nada de esto se usa. Detalle: `docs/etapa-10-operacion/FOTOS-EN-R2.md`.
- Para subirlo: workflow «Desplegar Workers de Cloudflare» (a mano).
