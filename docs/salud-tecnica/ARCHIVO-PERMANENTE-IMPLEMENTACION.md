# Archivo permanente: lo que se construyó y cómo se activa

*Escrito el 15/10/2026; actualizado el 16/10/2026 con todo lo de producción. Continúa `ARCHIVO-PERMANENTE.md` (el diseño, variante "a": R2 + un Worker delante de las notas). Hernán, 16/10: **"el archivo en R2 hay que hacerlo sí o sí"** (el sitio no puede perder notas viejas; con hasta 150 notas por día el tope de 3.700 se llena en ~25 días).*

**Estado al 25/10/2026: ENCENDIDO.** Desde el 23/10 la ruta `radarbalcarce.com/nota/*` va al Worker `radar-balcarce-archivo`, el depósito
`radar-archivo` existe, `R2_ARCHIVO` está cargada y `TOPE_DE_NOTAS` = 500. El 25/10 se volvió a subir el Worker, que ahora también sirve el mapa
del archivo (`/nota/sitemap-archivo.xml`, un índice con un mapa por mes; `SITEMAP_DEL_ARCHIVO` = Si). Falta la ruta de las fotos
(`activar_fotos`: `docs/etapa-10-operacion/FOTOS-EN-R2.md`). El diseño original (`ARCHIVO-PERMANENTE.md`) pasó a `docs/historico/`.
Lo que sigue es cómo quedó al 16/10 y el paso a paso que se usó.

**Estado al 16/10/2026 (historia):** el ensayo en staging anduvo (corridas 38908149824 y 38911113087). Está **todo listo para producción y probado sin red, pero NO activado**: no se creó el depósito `radar-archivo`, no se subió el Worker de producción, no hay ninguna ruta de `radarbalcarce.com` hacia el Worker, la variable `R2_ARCHIVO` no existe (el paso del despliegue está dormido) y `MAXIMO_EN_ARCHIVO` sigue en 3.700. El sitio publica exactamente lo mismo que ayer.

Lo que sigue sin verificar contra Cloudflare real está marcado **SIN VERIFICAR**.

## 1. Qué hay construido

| Archivo | Para qué sirve |
|---|---|
| `infra/archivo-cloudflare/worker.mjs` | El Worker. Pregunta primero al sitio; sólo si el sitio dice 404 (o no contesta) busca la nota en R2 y la sirve con la misma dirección. Sólo **lee** R2. Muestra `/_archivo/estado` (el resumen de la última corrida, para el vigilante). |
| `infra/archivo-cloudflare/wrangler.toml` | Dos entornos: `staging` (depósito `radar-archivo-staging`) y producción (`radar-balcarce-archivo`, depósito `radar-archivo`). Los dos en workers.dev. **Ninguna ruta del sitio vive acá.** |
| `infra/archivo-cloudflare/ruta.mjs` | Pone, saca o mira las rutas del sitio hacia el Worker (`radarbalcarce.com/nota/*` y, aparte, `radarbalcarce.com/fotos-notas/*`) con la API de Cloudflare. Sólo toca rutas de este Worker. |
| `infra/archivo-cloudflare/verificar.mjs` | Las comprobaciones contra Cloudflare de verdad, antes y después de poner la ruta. |
| `web/scripts/archivar-a-r2.mjs` | El exportador. Decide qué notas archivar, toma su HTML del sitio compilado (`web/out`), lo prepara para que dure, lo sube a R2 (sólo lo nuevo o cambiado), borra lo retirado, y deja `manifiesto.json` y `estado.json` en el depósito. Por defecto es una simulación. |
| `.github/workflows/archivo-staging.yml` | A mano. El ensayo (no toca producción). |
| `.github/workflows/archivo-produccion.yml` | A mano. Crea el depósito, sube el Worker sin ruta, carga todas las notas, comprueba; pone la ruta **sólo si se tilda**; la vuelta atrás; sacar notas ya. |
| `.github/workflows/cloudflare-deploy.yml`, paso **«Archivar las notas por salir (R2)»** | En cada despliegue (cada media hora), después de compilar y antes de subir: archiva lo que está por salir del sitio y borra lo retirado. **Dormido** mientras no exista la variable `R2_ARCHIVO`. Si falla no frena el sitio: avisa por mail. |
| `web/lib/archivo.js` (`topeDeNotas`, `topeDeEstaVuelta`) y `generar-datos.mjs` | El tope de notas del sitio se puede **bajar** con la variable `TOPE_DE_NOTAS`, sólo con el archivo prendido y de a 100 notas por vuelta. |
| `redes/vigilar.mjs` (`problemasDelArchivoR2`), `redes/informe-diario.mjs`, `web/scripts/contar-archivos.mjs` | El vigilante avisa si el archivo deja de correr o falla; el informe diario no avisa del tope cuando el archivo está prendido; el recuento distingue archivos de Pages de lo que está en R2. |
| Pruebas: `archivar-a-r2.test.mjs` (40), `archivo-cloudflare.test.mjs` (27), `archivo-produccion.test.mjs` (18), más una en `informe-diario.test.mjs` | Sin red. Incluyen la **prueba de contrato** (sección 3) y **«UNA NOTA RETIRADA NO QUEDA EN R2»** (de punta a punta). Regla 183. |

### Cómo atiende el Worker un pedido a `/nota/*`

1. Le pide la página al sitio (Pages, por `ORIGEN_PAGES`). Si contesta cualquier cosa que no sea 404/410/5xx, **devuelve esa respuesta tal cual**. Las notas recientes no notan que existe el Worker.
2. Si el sitio dice 404 (o no contesta), busca la nota en R2 **por su identificador**:
   - está y la dirección es la canónica → **200** con la página guardada y las mismas cabeceras de seguridad que `web/public/_headers`;
   - está pero la dirección es otra (titular viejo, `/nota/ID`, `?fbclid=…`) → **301** a la canónica;
   - no está → **el 404 del propio sitio**.
3. Una nota ya vista queda en la caché de Cloudflare 1 hora (`CACHE_SEGUNDOS`), **pero antes de servirla desde la caché se confirma que sigue en R2** (`head`, sin bajarla): lo que se borra de R2 deja de verse en el pedido siguiente.
4. También sirve `/nota/<titular-id>/opengraph-image` y, si se pone la ruta de las fotos, `/fotos-notas/*` (el sitio primero; R2 sólo para las fotos que el sitio ya borró).
5. Si R2 falla, devuelve lo que dijo el sitio. Nunca lanza una excepción. `ARCHIVO_ACTIVO=0` lo vuelve un tubo.

### Cómo prepara el exportador una nota (`prepararHtml`)

Toma el HTML de `web/out/nota/<titular-id>.html` y **sólo**: copia el CSS adentro (`<style>`; el de Next cambia de nombre en cada armado); saca los `<script>` de Next (deja los datos estructurados); saca lo que se congela mal: la franja del día (fecha, clima, farmacia), los "hace 5 días", los tres botones que sólo andan con JavaScript y, **desde el 16/10, el «Seguí leyendo»** (cuatro títulos de otras notas del día del armado: congelados mostrarían para siempre una nota que después se retira). Todo lo demás es el HTML del sitio letra por letra. Cada página se valida antes de subirla; si algo no da, se omite y queda anotada.

**Huella de contenido (16/10):** el ensayo mostró que **las 20 páginas ya archivadas cambiaban de bytes de un armado al otro** (la hora del armado en el pie, el «Seguí leyendo»): sin arreglo, cada media hora se habrían vuelto a subir las ~200 notas del margen. Ahora cada página lleva una huella de lo que **dice** (cabeza sin estilos, datos estructurados y artículo) y sólo se resube si cambia eso (por ejemplo, una corrección).

### Qué notas se archivan

Las que quedan fuera de las primeras `tope − margen` en el mismo orden con que el sitio se queda con las suyas (primero las que salieron en redes, después las más nuevas). En el despliegue el margen es **`--margen=auto`**: 4 días al ritmo de la última semana, nunca menos de 200 (con 46 notas por día da 200; con 150, 600). El tope es el de la corrida (`topeDeNotas`: 3.700, o `TOPE_DE_NOTAS` si se bajó). Nunca se archiva lo de `retiradas.json`. Las 289 notas que ya salieron antes de que existiera esto no tienen HTML (sección 7).

### Qué se midió (16/10/2026)

| Cosa | Medido |
|---|---|
| Preparar las 1.130 notas del sitio (en la PC) | 20 segundos |
| Todo el sitio archivado | 1.130 notas, 2.128 objetos, 167 MB (~150 KB por nota) |
| Subida real en el ensayo (corrida 38911113087) | 600 notas, 1.058 objetos en 11 min 8 s con 6 a la vez (~3,8 s por llamada de wrangler) |
| **Carga inicial de producción** (estimada con lo medido) | ~2.130 objetos con 10 a la vez: **15 a 25 minutos** |
| **Vuelta normal del despliegue**, con 3 notas nuevas en el margen (simulada con la demora real) | **20 s** (7 llamadas) |
| Vuelta sin novedades (lo de hoy: con 1.130 notas y tope 3.700 no hay nada por salir) | **8 s** (2 llamadas: leer el manifiesto, escribir el estado) |
| Peor caso: un margen entero sin archivar (~200 notas, 291 objetos) | ~3,5 minutos (el paso corta solo a los 6 y sigue en la vuelta siguiente) |

A eso se suma la primera descarga de wrangler (~10 s), que el paso siguiente («Subir a Cloudflare Pages») igual necesita: el despliegue no se alarga en la práctica.

## 2. Qué cambia en el sitio al activarlo (y qué no)

**No cambia** el sitio compilado: las mismas páginas, `_redirects`, `_headers`, sitemap, feed y secciones.

**Cambia, en este orden (cada paso se puede volver atrás sin tocar el siguiente):**
1. La carga inicial y el Worker en workers.dev: **nada visible**.
2. La variable `R2_ARCHIVO`: el despliegue empieza a archivar lo que está por salir. **Nada visible.**
3. La ruta `radarbalcarce.com/nota/*`: las notas pasan por el Worker. Hoy todas siguen en el sitio, así que **lo único distinto** es que una dirección con otro titular (`/nota/otro-titular-ID`) redirige con 301 a la nota en vez de mostrar la página 404. Cuando las notas empiecen a salir del sitio, se sirven desde R2 con la misma dirección.
4. (Cuando haga falta) la ruta de las fotos, o `FOTOS_BASE` (sección 5, paso 5).
5. (Decisión aparte) bajar el tope con `TOPE_DE_NOTAS`.

## 3. La prueba de contrato

`pruebas/archivar-a-r2.test.mjs` → "CONTRATO": lo que se guarda en R2 tiene la misma cabeza, los mismos datos estructurados y el mismo `<article>` que el sitio (salvo las diferencias a propósito: scripts, estilos, "hace N", botones, franja del día y «Seguí leyendo»); el Worker devuelve ese texto con 200; la foto y la tarjeta están en el depósito. La segunda prueba, con el sitio real compilado (`cd web && npx next build`), **pasó el 16/10 con las 1.131 notas reales**.

## 4. Ensayo en staging (hecho el 16/10)

Worker `radar-balcarce-archivo-staging` en `https://radar-balcarce-archivo-staging.radarbalcarce.workers.dev`: una nota archivada da 200 (mismo título y h1 que el sitio), una dirección vieja da 301 a la canónica y lo inexistente da 404. **Ojo:** el ensayo corrió el código de `main` de ese momento; lo agregado el 16/10 (estado, caché que se confirma contra R2, huella, «Seguí leyendo», borrado de fotos, `--quitar`) **está probado sólo sin red** hasta que se suba y se repita el ensayo (sección 5, paso 0).

## 5. Cómo se activa (pasos exactos)

### Paso 0. Antes de todo (lo corre una persona o Claude con permiso; ~20 minutos)

1. `npm test` en verde (borrando antes `web/out` y `web/.next`) y commit + push de estos cambios.
2. **Repetir el ensayo con el código nuevo:** Actions → **Archivo permanente (staging)** → Run workflow → `cargar_muestra` ☑, `cuantas` = 20. Cuando termine:
   ```
   curl -s https://radar-balcarce-archivo-staging.radarbalcarce.workers.dev/_archivo/estado
   ```
   tiene que dar `{"version":1,…,"ok":true,…,"notas":…}`. Y con una nota de la muestra (`RUTA=/nota/<titular-id>`, sale en el resumen de la corrida):
   ```
   curl -sI https://radar-balcarce-archivo-staging.radarbalcarce.workers.dev$RUTA          → 200, x-radar-archivo: r2
   curl -s  https://radar-balcarce-archivo-staging.radarbalcarce.workers.dev$RUTA | grep -c "Seguí leyendo"   → 0
   ```
3. **El token** (`CLOUDFLARE_API_TOKEN`): para la carga alcanza con lo que ya tiene (Workers Scripts: Edit, Workers R2 Storage: Edit). **Para la ruta hace falta además** «Zone → Workers Routes: Edit» y «Zone → Zone: Read» sobre `radarbalcarce.com` (Cloudflare → My Profile → API Tokens → editar el token). Si no se quiere dar «Zone: Read», crear la variable de GitHub `CLOUDFLARE_ZONE_ID` con el id de la zona (Cloudflare → radarbalcarce.com → Overview, abajo a la derecha). **SIN VERIFICAR** si el token actual ya los tiene: si no, el paso de la ruta falla a la vista y no cambia nada.
4. Mirar en el celular una nota del ensayo (la dirección de staging de arriba) y pegarla en el depurador de Facebook (Sharing Debugger): título, bajada e imagen.

### Paso 1. Carga inicial, sin ruta (~25 minutos, nada visible)

GitHub → Actions → **Archivo permanente (producción)** → Run workflow, con:
- `sacar_ruta` ☐ · `quitar_ids` vacío · `cargar_notas` ☑ · `activar_ruta` ☐ · `activar_fotos` ☐

Hace: pruebas → comprueba que el depósito no sea de respaldos/fotos/piezas → crea `radar-archivo` (privado) si no existe → sube el Worker `radar-balcarce-archivo` (sólo workers.dev) → compila el sitio → sube todas las notas (`--tope=1 --margen=0 --borrar`) → comprueba el Worker. Tiene que terminar en verde con «Todo bien.» en el resumen. Verificar a mano:
```
curl -s  https://radar-balcarce-archivo.radarbalcarce.workers.dev/_archivo/estado
   → "ok":true y "notas" cerca de 1.130
curl -sI https://radar-balcarce-archivo.radarbalcarce.workers.dev/nota/<titular-id de una nota de ayer>
   → 200, SIN x-radar-archivo (la sirve el sitio)
curl -sI https://radar-balcarce-archivo.radarbalcarce.workers.dev/nota/cualquier-cosa-<id de esa nota>
   → 301, location: /nota/<titular-id>   (esto lo hace el archivo: prueba que R2 tiene la nota)
curl -sI https://radar-balcarce-archivo.radarbalcarce.workers.dev/nota/no-existe-zzzzzz
   → 404
curl -sI https://radarbalcarce.com/nota/cualquier-cosa-<id>
   → 404 (el sitio no cambió: todavía no hay ruta)
```

### Paso 2. Prender el archivado automático (1 minuto, nada visible)

GitHub → Settings → Secrets and variables → Actions → **Variables** → New repository variable: `R2_ARCHIVO` = `radar-archivo`.

Desde el próximo despliegue (≤ 30 minutos) corre el paso «Archivar las notas por salir (R2)». Verificar: Actions → **Cloudflare Pages** → la última corrida, ese paso en verde y en el resumen «… notas archivadas en total»; `/_archivo/estado` con `cuando` de hace minutos. La variable también hace que el vigilante mire el archivo (avisa si deja de correr más de 6 horas o si falla) y que el informe diario no avise por llegar al tope. **Dejarlo andar dos o tres despliegues antes del paso 4.**

*(Recomendado)* ensayo de borrado: Actions → Archivo permanente (producción) → `quitar_ids` = el id de una nota cualquiera de la semana pasada → Run. Después `curl -sI https://radar-balcarce-archivo.radarbalcarce.workers.dev/nota/cualquier-cosa-<id>` tiene que dar **404** (ya no está en R2). No le pasa nada a la nota: sigue en el sitio y se vuelve a archivar sola cuando le toque salir.

### Paso 3. Las comprobaciones antes de poner la ruta (checklist)

- [ ] Paso 0 completo (pruebas, ensayo con el código nuevo, token, celular, Facebook).
- [ ] Paso 1 en verde, con los cinco `curl` como se esperaba.
- [ ] Paso 2: al menos dos corridas de «Cloudflare Pages» con el paso del archivo en verde y `/_archivo/estado` fresco.
- [ ] La vigilancia (Actions → Vigilancia, el registro) dice «… guardadas en el archivo permanente (R2 …, bien)».
- [ ] El ensayo de borrado dio 404.
- [ ] Decidido qué hacer con las fotos (paso 5) o anotado para antes de que salga la primera nota.

### Paso 4. Poner la ruta (EL cambio; ~3 minutos)

Actions → **Archivo permanente (producción)** → Run workflow con `cargar_notas` ☐ (o ☑ para refrescar) y **`activar_ruta` ☑**. El workflow comprueba primero el Worker en workers.dev; sólo si da bien pone `radarbalcarce.com/nota/*`, espera 20 segundos y comprueba el sitio (una nota de ayer 200 y no del archivo; una dirección con otro titular 301; lo inexistente 404). **Si el sitio no da bien, saca la ruta solo** y la corrida queda en rojo. Verificar a mano:
```
curl -sI https://radarbalcarce.com/nota/<titular-id de una nota de hoy>    → 200, SIN x-radar-archivo
curl -sI https://radarbalcarce.com/nota/cualquier-cosa-<id>                 → 301, location: /nota/<titular-id>
curl -sI https://radarbalcarce.com/nota/no-existe-zzzzzz                     → 404
curl -sI https://radarbalcarce.com/                                          → 200 (la portada no pasa por el Worker)
```
y abrir dos o tres notas en el celular.

### Paso 5. Las fotos (antes de que salga la primera nota del sitio)

Hoy las fotos viven en el sitio (`/fotos-notas/…`, no hay `FOTOS_BASE`) y **se borran del sitio cuando la nota sale** (`podarFotos`). El exportador ya guarda la foto de cada nota en R2, pero la página archivada la pide a `radarbalcarce.com/fotos-notas/…`. Sin hacer nada, una nota archivada se ve sin foto. Dos caminos (decisión 2):
- **Ruta de las fotos por el Worker** (listo): correr el workflow con `activar_ruta` ☑ **y `activar_fotos` ☑**. El Worker pregunta primero al sitio y sólo si la foto ya no está la sirve de R2. Costo: una invocación del Worker por cada foto que se ve (portada incluida); con las visitas de hoy está lejos del cupo gratis (100.000 por día, **SIN VERIFICAR**).
- **Fotos a R2 con `FOTOS_BASE`** (`fotos-a-r2.yml`): las páginas piden la foto a otro dominio y el archivo no la necesita. Es un proyecto aparte.

**Cuándo sale la primera nota:** cuando el sitio llegue a 3.700: (3.700 − 1.130) / ritmo → ~56 días a 46 por día (~10/12), ~17 días a 150 por día (~2/11).

### Paso 6. Bajar el tope del sitio (decisión 6; aparte y reversible)

Sólo con el paso 2 andando hace días. **Primero** correr el workflow de producción con `cargar_notas` ☑ (deja en R2 todo lo que tiene el sitio), **después** crear la variable de GitHub `TOPE_DE_NOTAS` (por ejemplo `2000`). Qué pasa: `generar-datos` baja el tope de a 100 notas por vuelta (de 3.700 a 2.000 son 17 vueltas, ~8 horas), y el exportador archiva con el tope pedido antes que el sitio, así cada nota que sale ya está en R2. Sin `R2_ARCHIVO` la variable no hace nada; nunca sube de 3.700 ni baja de 500. Verificar: el registro de «Actualizar la web» dice «tope de notas de esta vuelta: …» y el de `contar-archivos` «Notas con página en el sitio: … (tope …)». Con 1.130 notas hoy, no cambia nada hasta que el sitio pase el tope nuevo. Volver atrás: borrar la variable (las que ya salieron siguen servidas desde R2). **No se tocó `MAXIMO_EN_ARCHIVO` ni el criterio**: si un día se quiere cambiar el máximo, es `web/lib/archivo.js` **y** `ingesta/criterio.mjs` **y** la tabla de `CRITERIO-EDITORIAL.md` (una prueba los compara).

## 6. Cómo se vuelve atrás en un minuto

1. **Sacar las rutas:** Actions → **Archivo permanente (producción)** → Run workflow con **`sacar_ruta` ☑** (no hace nada más). O sin GitHub: Cloudflare → Workers & Pages → `radar-balcarce-archivo` → Settings → Domains & Routes → borrar `radarbalcarce.com/nota/*` (y `radarbalcarce.com/fotos-notas/*` si estaba). Verificar:
   ```
   curl -sI https://radarbalcarce.com/nota/cualquier-cosa-<id>    → 404 (ya no pasa por el archivo)
   ```
   Desde ese momento el sitio responde solo, como antes; ninguna nota reciente cambia. Las que ya salieron del sitio vuelven a dar 404 (siguen guardadas en R2).
2. **Dormir el archivado:** borrar la variable `R2_ARCHIVO` (el paso del despliegue deja de correr; el vigilante deja de mirar).
3. **Apagar el Worker sin sacar la ruta:** Cloudflare → Worker → Settings → Variables → `ARCHIVO_ACTIVO` = `0` (queda como un tubo).
4. **Volver el repositorio:** sacar el paso del exportador de `cloudflare-deploy.yml`.

## 7. Lo que ya salió del sitio (289 notas del histórico)

No tienen HTML en el sitio: el exportador las anota como `sin-html-en-el-sitio`. Rescatarlas pide un armado especial (decisión 3); no está automatizado.

## 8. Menores, víctimas y retiradas

**Lo retirado no puede quedar en un depósito más** (regla 183).
- El exportador **nunca archiva** lo de `retiradas.json`, y con `--borrar` (siempre prendido en el despliegue) borra de R2 **la página, las tarjetas y la foto** (la foto se queda sólo si otra nota que sigue la usa) de lo que pasó a esa lista **o** desapareció del archivo vivo (el semáforo lo sacó). Un borrado de más del 5 % del depósito (y de más de 10 notas) se frena y pide `--confirmar-borrado`.
- Si el manifiesto del depósito no se puede leer, **la corrida no sube nada** (escribir un manifiesto sin las notas anteriores haría imposible borrarlas después) y el estado queda en `ok:false`.
- Antes de escribir el manifiesto se vuelve a leer, para no pisar lo que anotó otra corrida en el medio.
- **Demora:** el Worker confirma contra R2 cada nota que tenía en caché, así que una nota borrada de R2 **deja de verse en el pedido siguiente**. Lo único que puede seguir mostrándola es la caché del navegador de quien ya la abrió (`max-age` de 5 minutos).

**Cómo purgar una nota al instante:**
1. Lo de siempre: sumarla a `web/data/retiradas.json` (motivo, cuándo, quién) o retirarla desde el celular. Sale del sitio y de R2 en la próxima vuelta (~40 minutos).
2. **Ya:** Actions → **Archivo permanente (producción)** → `quitar_ids` = `<id>` (varios, separados por comas) → Run (~1 minuto, no compila nada). Borra la página, las tarjetas y la foto, aunque el manifiesto no las tenga.
3. **Sin GitHub:** Cloudflare → R2 → `radar-archivo` → Objects → borrar `nota/<id>.html`, `nota/<id>/opengraph-image` y su foto en `fotos-notas/`. Mismo efecto.
4. Verificar: `curl -sI https://radarbalcarce.com/nota/cualquier-cosa-<id>` → 404. *(Purge by URL en Cloudflare → Caching ya no hace falta por la confirmación contra R2; **SIN VERIFICAR** si también limpia la caché del Worker.)*

Ojo: si se usa `quitar_ids` y la nota **sigue en el sitio**, hay que sumarla igual a `retiradas.json`; si no, el despliegue la vuelve a archivar cuando le toque salir.

## 9. Riesgos

| Riesgo | Cuánto | Qué lo contiene |
|---|---|---|
| El Worker queda delante de **todas** las notas: una caída de Workers de Cloudflare deja `/nota/*` sin responder | Bajo, pero es el costo de la variante | Falla abierta ante errores propios; la ruta se saca en un minuto (sección 6); el workflow la saca solo si el sitio no pasa las comprobaciones. |
| Lo retirado queda en R2 | **El riesgo grave** | `--borrar` siempre (con foto), `quitar_ids` al instante, caché confirmada contra R2, prueba de punta a punta. **Hueco que queda:** si una nota que ya salió del sitio se retira y el paso del archivo falla durante los 7 días que `retiradas.json` la guarda, después ya no se borra sola (sigue en el histórico): el vigilante avisa a las 6 horas de fallas; si pasa, `quitar_ids`. |
| El paso del archivo falla varios días y una nota sale del sitio sin estar en R2 | Bajo (margen de ~4 días) | Mail en cada falla (sin repetir en 6 horas), `estado.json` con `ok:false`, el vigilante (6 h media, 24 h alta). No hay una guarda que impida que el sitio la saque. |
| Al bajar el tope, el exportador falla justo en esas horas | Bajo | Se baja de a 100 por vuelta y **antes** se corre la carga completa (sección 5, paso 6). |
| Dos corridas escriben el manifiesto a la vez (el despliegue y el workflow de producción) | Bajo | Se relee antes de escribir (ventana de segundos). Si una nota quedara subida pero sin anotar, `quitar_ids` la borra igual. |
| El token no tiene los permisos de zona | Seguro hoy (**SIN VERIFICAR**) | El paso de la ruta falla a la vista; se puede poner a mano en Cloudflare. |
| Notas archivadas sin foto | Seguro si no se decide el paso 5 antes de que salga la primera nota | Sección 5, paso 5. |
| La copia queda con el diseño del día en que se archivó | Aceptado | Mientras la nota esté en el sitio, una corrección se resube sola (huella); después, no. |
| Respaldo del depósito | Abierto | `respaldo.yml` no copia `radar-archivo` (decisión 8). |
| El histórico (`web/data/historico/`, repositorio público) guarda una nota que se retiró **después** de salir del sitio | Medio, **anterior a esto** | No lo toca este trabajo; conviene que una retirada también la saque del histórico. |
| Wrangler es lento (3,8 s por objeto) | Bajo | La carga inicial va en su workflow (55 minutos de tope); el despliegue sólo sube lo nuevo y corta solo a los 6 minutos. |

## 10. Decisiones

**Tomadas:** (1) variante (a), Worker delante (Hernán, 16/10: "sí o sí"); (5) si el archivado falla, **el despliegue sigue y avisa** (no frena el sitio); (7) `--borrar` **siempre prendido** en el despliegue.

**Abiertas, para Hernán:**
2. **Fotos**: ruta de las fotos por el Worker (lista, `activar_fotos`) o `FOTOS_BASE`. Hay que decidirlo antes de que salga la primera nota (sección 5, paso 5).
3. **Las 289 notas del histórico**: ¿armado de rescate o se dan por perdidas?
4. **Token**: ¿se le suman los permisos de zona al actual o se crea uno nuevo, sólo con R2 de `radar-archivo` y las rutas de la zona?
6. **Cuánto baja el tope** (con `TOPE_DE_NOTAS`), si baja.
8. **Respaldo del depósito**: ¿una copia mensual a otro lado?
9. **Sitemap de archivo** y una página para navegar lo viejo: ¿ahora, después o nunca?
10. **Los botones y la franja del día** en las notas archivadas (se sacaron porque sin JavaScript quedaban muertos).

## 11. Qué falta y cómo se prueba

- **Construido y probado sin red (16/10):** todo lo de la sección 1; `npm test` en verde; contrato contra las 1.131 notas reales; `wrangler deploy --dry-run` de producción (9,4 KiB, binding `radar-archivo`).
- **Falta, con credenciales (una persona):** los pasos 0 a 4 de la sección 5, en ese orden; decidir el paso 5 antes de que salga la primera nota.
- **SIN VERIFICAR contra Cloudflare real:** `/_archivo/estado`, la confirmación contra R2 (`head`) y `cache.delete` del Worker con el código nuevo (se ve en el paso 0); la caché del Worker en un dominio propio (en workers.dev la caché de Workers no actúa); que la API de rutas acepte el token; el cupo y el precio actuales de Workers y R2; si Purge by URL limpia la caché del Worker.
