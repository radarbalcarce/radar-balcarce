# Fotos de las notas en R2 y no en git

*23/10/2026. Escrito e implementado detrás de un interruptor APAGADO: la variable de GitHub y de Workers Builds `FOTOS_EN_R2` con valor `Si`. Sin ella, todo queda exactamente como hoy. Rama `agente/fotos-en-r2`, sin desplegar.*

## Por qué

Las fotos de las notas (`web/public/fotos-notas/`, unos 160 MB en el historial, el 60 % del total) se guardan en git en cada vuelta del motor (`infra/motor-cloudflare/vuelta.mjs` las commitea por la API de GitHub). Ya existen el depósito R2 `radar-archivo`, el Worker `radar-balcarce-archivo` (que sirve `/fotos-notas/*` desde R2 cuando Pages no tiene el archivo, con `FOTOS_DE_RESPALDO=1` y la ruta puesta) y el exportador `archivar-a-r2.mjs`, que ya sube a R2 las fotos de las notas viejas con la clave `fotos-notas/<archivo>`. Lo que faltaba es que las fotos nuevas no pasen por git.

## Flujo de hoy

1. `web/scripts/generar-datos.mjs` busca la foto de cada nota (`elegirFotosNuevas`, `web/scripts/fotos-notas.mjs`; revisión con IA en `ingesta/fotos.mjs`), la achica a 1.200 px JPEG (`achicar-foto.mjs`) y la escribe en `web/public/fotos-notas/<id>.jpg`; anota todo en `web/data/banco-fotos.json`.
2. También escriben ahí: los collages de los repasos (`collage.mjs`), las fotos libres de F1 y fútbol (`foto-libre.mjs`), las fijas (`clima-*`, `efemeride-fondo`), las ilustraciones con IA (`-ia.jpg`, workflow «Ilustrar notas sin foto» que corre en el Worker de tareas y commitea por la API) y las fotos manuales del panel (`foto-manual.mjs`).
3. `generar-datos` pregunta en seis lugares «¿existe esa foto?» con `fs.existsSync` (banco, ilustraciones, manuales, clima, pistas, F1/fútbol) y `fotoDelArchivoAlDia` le saca la foto a la nota si el archivo no está. La poda (`podarFotos`) borra del disco lo que ya no tiene nota (a la semana).
4. `npm run build` copia `public/` a `out/`; las tarjetas (`opengraph-image`, `instagram.png`: `web/lib/tarjeta.js` → `fotoDeLaNota`), `dimensionesDeFoto` (datos estructurados) y `rss-disco.js` leen la foto **del disco**. Las páginas apuntan a `/fotos-notas/<archivo>` (o a `FOTOS_BASE` si se pone).
5. `cambiosDesde` (`infra/motor-cloudflare/archivos.mjs`) compara el disco con la foto del principio de la vuelta y manda en el commit lo nuevo, lo cambiado y lo borrado, fotos incluidas.
6. Las redes (`redes/publicar.mjs`: placas, collages, reels de repaso `reels/escenas/repaso.mjs`) usan las fotos del disco del clon que tengan a mano.

## Flujo propuesto (con `FOTOS_EN_R2=Si`)

Código nuevo: `infra/compartido/fotos-r2.mjs` (sin dependencias), enganches en `infra/motor-cloudflare/vuelta.mjs`, `web/scripts/generar-datos.mjs` y `redes/publicar.mjs`; migración en `scripts/migrar-fotos-a-r2.mjs` (no se ejecuta sola); pruebas en `pruebas/fotos-en-r2.test.mjs`.

En la vuelta del motor, en este orden:

1. **Índice.** Se listan las fotos del depósito (`fotos-notas/*`) y se deja el índice en `.cache/fotos-r2.json` (no es un archivo del repositorio). El armado lo recibe en `FOTOS_R2_INDICE`.
2. **Hidratación.** Se toma la foto del principio (`fotografiar`) y **después** se bajan de R2 a disco las fotos que muestran la portada y el archivo (hasta 800, 150 s, 8 a la vez). Las que R2 no tiene o que fallan se cuentan y se siguen sin ellas. Así las tarjetas, las medidas de imagen y los reels las encuentran en disco, y las páginas y el RSS no cambian.
3. **Armado.** `generar-datos` pregunta `existeFoto` (`crearExisteFoto`): disco **o** índice de R2. Una nota no pierde su foto por no estar en disco. Apagado, es `fs.existsSync` de siempre.
4. **Subida.** Terminada la compilación y antes de guardar, `separarCambios` aparta las fotos nuevas (nuevo archivo en la carpeta, que no sea fija ni una copia bajada de R2) y se suben a R2 con la clave `fotos-notas/<archivo>` (S3, mismo cliente que ya usa la vuelta). Salen del commit. **Si una subida falla, esa foto va en el commit como hoy.** `banco-fotos.json` se guarda recién después: nunca apunta a una foto que no esté ni en R2 ni en git.
5. **Qué se borra.** La poda sigue borrando del disco y de git lo que ya estaba en git. De R2 **sólo** se borran las fotos de notas retiradas (menores y víctimas: `retirada` en el banco, `retiradas.json`, `revision-archivo.json`; la nota y su `-ia`). La poda normal no borra de R2: una nota archivada en R2 sigue mostrando su foto, y R2 es barato (10 GB gratis).
6. **Publicar.** Pages recibe en `out/` las fotos hidratadas y las nuevas (hasta unas 500 con el tope de hoy); el resto lo sirve el Worker del archivo desde R2 (`/fotos-notas/*` con `FOTOS_DE_RESPALDO=1`, ruta ya preparada: workflow «Archivo permanente (producción)» con `activar_fotos`).

En las redes (`redes/publicar.mjs`, para `--facebook` y `--piezas`) se bajan por la dirección pública del sitio las fotos de la portada (hasta 80, 60 s) antes de armar nada, con el mismo Worker como fuente. Sin interruptor no hace nada.

Lo que **sigue en git** a propósito: las fijas (`clima-*`, `efemeride-fondo`: las lee la compilación siempre), `banco-fotos.json`, `fotos-ia.json`, `fotos-manuales.json`, los escudos. Las ilustraciones con IA y las fotos manuales las commitean el Worker de tareas y el panel directamente por la API, fuera de la vuelta: por ahora siguen en git (son pocas; ver «Falta»).

## Migración (script, no ejecutado)

`node scripts/migrar-fotos-a-r2.mjs` (simulacro) · `--subir` (sube las que R2 no tiene) · `--subir --quitar` (además `git rm` de las que R2 confirma con el mismo tamaño; no commitea). Hace falta `CLOUDFLARE_ACCOUNT_ID`, `R2_ARCHIVO`, `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY` en el entorno. Con `--max=N` se va de a poco. El historial no se achica con esto: para eso está «Compactar el historial».

## Pasos para prenderlo de a poco

1. Verificar que el token de R2 de la vuelta (`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`) tiene permiso de escritura sobre `radar-archivo` (hoy se usa con el depósito del motor; si no lo tiene, la subida falla y las fotos siguen yendo a git, sin daño). Que `R2_ARCHIVO=radar-archivo` esté cargada en Workers Builds («Cargar variables del motor»).
2. Poner la ruta de las fotos en el Worker del archivo: workflow «Archivo permanente (producción)» con `activar_fotos` (sin esto, una foto que no está en Pages da 404).
3. Correr el simulacro: «Motor: ensayo» o `node infra/motor-cloudflare/vuelta.mjs --simular` (no sube nada); y `node scripts/migrar-fotos-a-r2.mjs` (cuenta).
4. Subir las fotos que hoy están en git **sin quitarlas**: `--subir`. Mirar `/fotos-notas/<una>.jpg` en `workers.dev` con `ARCHIVO_PRIMERO=1`.
5. Poner la variable `FOTOS_EN_R2=Si` en GitHub y en Workers Builds (desde el 24/10, regla 311, la variable de GitHub llega a `actualizar.yml`, `redes.yml` y `piezas.yml`, y «Cargar variables del motor» la lleva a Workers Builds: ya no hace falta cargarla a mano en el panel de Cloudflare). Mirar dos vueltas: en el log «Fotos de R2: N en el depósito, M traídas», «Fotos nuevas: K a R2»; el commit de datos ya no trae fotos nuevas; la portada y una tarjeta de Facebook (`/nota/<id>/opengraph-image`) siguen con foto.
6. Cuando esté todo bien, entre vueltas: `--subir --quitar`, commit y push a mano. Solo ahí baja el peso del árbol.
7. Para volver atrás: vaciar la variable. Las fotos nuevas vuelven a git; lo ya movido sigue sirviéndose desde R2 por el Worker.

## Riesgos

- **Lo más delicado es el «¿existe?»**: si alguna parte del armado sigue mirando sólo el disco, la nota pierde su foto. Se cambiaron los seis lugares de `generar-datos` (prueba que lo vigila) y `fotoDelArchivoAlDia`. Quedan leyendo sólo el disco, a propósito: la compilación (tarjetas, medidas, RSS), que se cubre con la hidratación; lo no hidratado sale con la placa en la tarjeta y sin medida en los datos estructurados, nunca rompe.
- **Tiempo de la vuelta**: hasta 150 s extra (800 bajadas desde R2). Con `TOPE_DE_NOTAS=500` son ~500. Las bajadas son por S3 dentro de Cloudflare.
- **Menores y víctimas**: la foto retirada ya no está en git para borrarla ahí; se borra de R2 con la vuelta siguiente a la retirada. Mientras tanto la copia cacheada del Worker dura hasta una semana (`max-age=604800`) y la de Pages hasta que se compile sin ella: igual que hoy.
- **Permisos del token de R2** (ver paso 1): si no alcanza, nada se rompe pero tampoco se ahorra.
- **Rutas de Pages y 20.000 archivos**: no cambia (las hidratadas entran a `out/`), pero con el tiempo se puede bajar a hidratar sólo la portada.
- **Revisión del archivo y Worker de tareas** (`revisar-archivo.mjs`, `ilustrar-notas.mjs`, panel): leen fotos del disco de un clon pelado. Con el interruptor prendido y las fotos fuera de git, la revisión no podrá ver la foto de una nota vieja (la deja para una persona) hasta que se les sume la misma hidratación.

## Falta (no está hecho)

- Hidratar para `revisar-archivo.mjs`, `ilustrar-notas` (`despuesDeBajar` del Worker de tareas, que hoy baja las ilustraciones por la API de GitHub) y los reels que corren en el repositorio público de render (`infra/render-publico/`, que recibe las fotos dentro del pedido).
- Mover también las ilustraciones con IA y las fotos manuales a R2 (hoy las commitean otros programas).
- Otros archivos de `web/data` que sólo usa el robot (`celular-pendientes.json`, `fichas.json`, etc.) siguen en git: ya está en `docs/etapa-10-operacion/MENOS-COMMITS.md`.
- Hacer correr la migración y compactar el historial.
