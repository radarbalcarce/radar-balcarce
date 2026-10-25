# El plan de cambio: del robot en GitHub al robot en Cloudflare, paso a paso

*18/10/2026. Para Hernán y Andrés. Cada paso dice **quién lo hace**, **qué se pega y dónde**, **cómo se sabe que salió bien** y **cómo se vuelve atrás**. Antes de empezar, leer `MIGRACION-A-CLOUDFLARE.md` (por qué se eligió esto, qué cuesta y qué quedó afuera). Todo el código ya está en la rama; **no hay que programar nada**, hay que subir, pegar llaves y mirar.*

**La regla de oro del plan:** hasta el paso 7 **nada cambia lo que anda hoy**. Cada paso nuevo es un interruptor que se prende y que se apaga. El interruptor se llama `NUBE` y vive en el reloj de Cloudflare: es la lista de workflows que corren en Cloudflare. **Vacía = todo en GitHub, igual que ayer.**

**Tiempo:** media jornada para llegar al paso 9 (mirando entre paso y paso) y 3 días de observación antes de pasar el repositorio a privado.

**Qué no se hace desde un chat:** las llaves. Las crea y las pega una persona en GitHub o en Cloudflare. Ninguna va en un mensaje ni en el código.

---

## Lo que hay que tener a mano (una sola vez)

### Llaves y variables nuevas

| Qué | Dónde se crea | Permisos | Dónde se pega | Para qué |
|---|---|---|---|---|
| `RADAR_GITHUB_TOKEN` | GitHub (cuenta `radarbalcarce`) → Settings → Developer settings → Fine-grained tokens. **Sólo** el repositorio `radarbalcarce/radar-balcarce`; sin vencimiento | Contents: lectura y escritura · Actions: lectura y escritura · Metadata: lectura | GitHub: secreto de Actions `RADAR_GITHUB_TOKEN` · y, en el paso 8, variable secreta de Workers Builds | Guardar datos por la API, despertar «Piezas de redes», leer corridas |
| `RENDER_GITHUB_TOKEN` | La misma pantalla, **sólo** el repositorio `radarbalcarce/radar-balcarce-render` | Contents: lectura y escritura (es lo que pide `repository_dispatch`) | GitHub: secreto `RENDER_GITHUB_TOKEN` | Despertar al render público |
| `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY` | Cloudflare → R2 → Manage API tokens → Create API token → **Object Read & Write**, sólo los depósitos `radar-motor` y `radar-render` | — | GitHub: dos secretos con esos nombres · y variables secretas de Workers Builds (paso 8) | Memoria del motor, candado y firma de direcciones del render |
| `MOTOR_DEPLOY_HOOK` | Se crea en el paso 8 (Workers Builds → Settings → Builds → Deploy Hooks) | — | GitHub: secreto `MOTOR_DEPLOY_HOOK` (el workflow lo copia al reloj) | Despertar la vuelta del motor |
| `CLOUDFLARE_API_TOKEN` (**el que ya está**) | Cloudflare → My Profile → API Tokens | **Sumar**: Workers R2 Storage: Edit · Workers KV Storage: Edit · Workers Scripts: Edit · Cloudflare Pages: Edit | Ya está en GitHub | Subir los Workers, crear depósitos, subir a Pages |
| Variable de GitHub `R2_RENDER` | GitHub → Settings → Variables → Actions | — | valor `radar-render` | El depósito del render |

Los demás secretos que usan las tareas (`VIGILANTE_TOKEN`, `META_TOKEN`, las claves de Gemini y Groq, `TAVILY_API_KEY`, `WHATSAPP_*`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ANALYTICS_TOKEN`, `RELOJ_GITHUB_TOKEN`) **ya están en GitHub**: el workflow «Desplegar Workers de Cloudflare» los copia a los Workers.

### Anotar los valores de hoy

Abrir GitHub → Settings → Secrets and variables → Actions → **Variables** y anotar los valores de: `REDES_ACTIVAS`, `R2_ARCHIVO`, `TOPE_DE_NOTAS`, `FOTOS_MENORES_OFICIALES`, `SECCIONES_NUEVAS`, `FOTOS_BASE`, `R2_RESPALDOS`, `R2_FOTOS`, `R2_PIEZAS`, `CLOUDFLARE_PROJECT`. Se copian tal cual a Cloudflare en los pasos 3 y 8.

---

## Paso 1 · Llevar el trabajo a `main` (código nada más)

- **Quién:** una persona con acceso, desde la PC.
- **Qué:** unir la rama `worktree-agent-a472a22f1929f4a29` a `main` (`git pull --rebase` antes, como siempre). **No se despliega nada**: son archivos nuevos y cambios chicos en programas que ya corren con los mismos resultados.
- **Cómo se sabe que salió bien:** el workflow «Pruebas» sale verde en GitHub y «Actualizar la web» de la media hora siguiente sigue saliendo verde y publicando.
- **Atrás:** `git revert` del merge. Ningún dato cambió.

## Paso 2 · Crear el repositorio público de render

- **Quién:** una persona, en GitHub.
- **Qué:** crear `radarbalcarce/radar-balcarce-render` como **público**, copiarle **el contenido** de `infra/render-publico/` (con `.github/workflows/render.yml` en la raíz; el archivo `.gitignore` también) y subirlo. **No cargar ningún secreto ahí.**
- **Cómo se sabe que salió bien:** pestaña *Actions* → *Render* → *Run workflow* (a mano) → verde (la prueba de humo arma un video de mentira con una voz de mentira en ~1 minuto y lo deja como adjunto `humo`).
- **Atrás:** borrar el repositorio. Nadie lo usa todavía.

## Paso 3 · Pegar las llaves y subir los Workers (sin prender nada)

- **Quién:** una persona.
- **Qué:**
  1. Crear y pegar las llaves nuevas de la tabla de arriba (sin `MOTOR_DEPLOY_HOOK`, que viene en el paso 8).
  2. Crear la variable `R2_RENDER`.
  3. Comprobar que el Worker de imágenes (`radar-balcarce-imagenes`) está subido (workflow «Imágenes con Workers AI»): el Worker de tareas lo llama por *binding* y Cloudflare rechaza el despliegue si no existe.
  4. GitHub → Actions → **Desplegar Workers de Cloudflare** → Run workflow → `que: todo`, `con_nube`: **apagado**, `nube`: vacío.
  5. Cloudflare → Workers & Pages → **radar-balcarce-tareas** → Settings → Variables and Secrets → agregar las **variables** (texto) `REDES_ACTIVAS` (el valor de hoy), `R2_ARCHIVO` (el valor de hoy) y `WORKFLOWS_EN_LA_NUBE` (vacía por ahora).
- **Qué hace el workflow:** crea los depósitos `radar-motor`, `radar-render`, `radar-tareas`, la memoria (KV) de las tareas y la del vigilante, sube los cuatro Workers y carga sus secretos. **El reloj y el vigilante se suben como siempre** (sin la nube): siguen pidiendo todo a GitHub.
- **Cómo se sabe que salió bien:**
  - El workflow sale verde. Si falla en «Crear los depósitos de R2», crearlos a mano en Cloudflare → R2 y repetir.
  - `https://radar-balcarce-tareas.<cuenta>.workers.dev/` dice «Tareas de Radar Balcarce: en hora.» (si dice un error de Cloudflare, **el Worker no arrancó**: es lo que el truco de `arranque.mjs` tenía que evitar. Mirar Logs, no seguir, avisar).
  - `https://radar-balcarce-motor.<cuenta>.workers.dev/` dice «Motor de Radar Balcarce: en hora…».
  - Todo lo demás de la web y las redes sigue igual (nada lo toca).
- **Atrás:** borrar los Workers `radar-balcarce-tareas` y `radar-balcarce-motor` desde Cloudflare. El reloj no los conoce.

## Paso 4 · Ensayo en seco de las tareas (no guarda ni publica nada)

- **Quién:** una persona, con `curl` o el panel de Cloudflare (Workers → radar-balcarce-tareas → «Send request» no sirve: usar `curl` con el encabezado). La contraseña es `VIGILANTE_TOKEN` (en el encabezado `x-token`, **nunca en la dirección**).
- **Qué:** para cada tarea, un pedido con `"simular": true` (corre de verdad, pero no guarda en GitHub, ni en R2, ni avisa por mail de nada nuevo):

  ```
  curl -X POST https://radar-balcarce-tareas.<cuenta>.workers.dev/correr \
    -H "x-token: $VIGILANTE_TOKEN" -H "content-type: application/json" \
    -d '{"tarea":"vigilancia","simular":true}'
  ```

  Repetir con `auditoria-ia`, `pistas`, `informe-diario` (con `"inputs":{"momento":"noche","enviar":"false"}`: arma el informe y no lo manda), `ilustrar-notas` y `redes` (con `REDES_ACTIVAS` en `No` en el Worker: Facebook simula).
- **Cómo se sabe que salió bien:** cada respuesta trae `"ok": true` y `"simulada": true`; en Cloudflare → radar-balcarce-tareas → **Logs** se ve lo mismo que en el registro del workflow de GitHub («N archivos bajados», «simulacro, habría guardado…»). **Si alguna dice `ok: false`, el motivo viene en el mismo JSON.** Las dudas conocidas que este paso resuelve (ninguna se pudo probar en `workerd` desde la PC): que `process.env` traiga las variables, que `fs.readFileSync` del paquete funcione y que las lecturas de `/tmp` anden.
- **Atrás:** nada que deshacer (no guardó nada).

## Paso 5 · Pasar las tareas chicas (vigilancia, informe, auditoría IA, pistas)

- **Quién:** una persona.
- **Qué:**
  1. Cloudflare → radar-balcarce-tareas → variable `WORKFLOWS_EN_LA_NUBE` = `vigilancia.yml,informe-diario.yml,auditoria-ia.yml,pistas.yml`.
  2. GitHub → Actions → **Desplegar Workers de Cloudflare** → `que: todo`, `con_nube`: **prendido**, `nube`: `vigilancia.yml,informe-diario.yml,auditoria-ia.yml,pistas.yml`. (Sube el reloj y el vigilante con la nube.)
  3. GitHub → Settings → Variables → crear `INFORME_RESPALDO_EN_GITHUB` = `No` (apaga el respaldo de las 8:45 y 21:45; el vigilante de Cloudflare manda su resumen a las 22 si el informe no llega).
- **Cómo se sabe que salió bien (esperar una hora y media):**
  - A los **:23 de una hora múltiplo de 3** (Pistas), a los **:41** (Auditoría IA), cada 3 horas (Vigilancia) y a las **8:15 o 21:15** (Informe diario): en GitHub → Actions **no aparece** una corrida nueva de esos workflows; en el repositorio aparecen los commits `Auditoría IA · dd/mm hh:mm`, `Vigilancia: estado de avisos · …`, `Pistas · …` **con el mismo autor de siempre** (Radar Balcarce, noreply de `balcar-dev`).
  - Llega el mail del informe (si toca).
  - `https://radar-balcarce-vigilante.<cuenta>.workers.dev/estado` muestra en `ultimo.nube` que el Worker de tareas contestó.
  - En Cloudflare → radar-balcarce-reloj → Logs: `{"minuto":41,"resultados":[{"archivo":"auditoria-ia.yml","ok":true,"estado":200}]}`.
- **Atrás (minutos):** volver a correr «Desplegar Workers de Cloudflare» con `con_nube` **apagado** (o la lista vacía). Los workflows `vigilancia.yml`, `auditoria-ia.yml`, `pistas.yml` e `informe-diario.yml` siguen existiendo y el reloj vuelve a pedírselos a GitHub. Si hace falta de urgencia, en el panel del reloj editar la variable `NUBE` y dejarla vacía (la próxima vez que se suba el reloj vale lo que diga el workflow).

## Paso 6 · Ilustraciones

- **Qué:** sumar `ilustrar-notas.yml` a `WORKFLOWS_EN_LA_NUBE` (panel de Cloudflare) y a `nube` (workflow, `que: reloj` y `que: vigilante` alcanzan).
- **Cómo se sabe que salió bien:** a las próximas `:20` de hora par UTC (7:20, 9:20… de Balcarce), commit `Ilustraciones con IA para notas sin foto (automático)` si hubo notas sin foto (si no hubo, no hay commit, como antes); en Logs, «Modo automático. Notas a ilustrar…»; el cupo del día sigue sumando entre corridas (R2 `radar-tareas`, `memoria/ilustrar-notas/.cache/cuentas/`).
- **Atrás:** sacarla de la lista.

## Paso 7 · Redes y video

- **Quién:** una persona. **Este es el paso más delicado: es lo que ven los lectores.**
- **Antes:** estar en horario con una pieza próxima (por ejemplo, 15 minutos antes del clima de la noche o del repaso). Confirmar que el paso 2 (render público) sale verde.
- **Qué:**
  1. Con `REDES_ACTIVAS` en **`No`** en el Worker de tareas (panel de Cloudflare), sumar `redes.yml` a `WORKFLOWS_EN_LA_NUBE` y a `nube`, y subir reloj y vigilante.
  2. A los :05/:35/:45 siguientes, mirar los Logs del Worker de tareas: debe decir «Nada para publicar en Facebook ahora» o «(modo prueba: no se publicó)», y **«las redes están apagadas (REDES_ACTIVAS): no se arma ninguna pieza»**. No se pide nada a «Piezas de redes».
  3. Con una pieza próxima: poner `REDES_ACTIVAS` en **`Si`** en el Worker (efecto inmediato) **y apagar «Redes» de GitHub**: la variable de GitHub `REDES_ACTIVAS` pasa a `No` (para que, si alguien lo corre a mano, no publique encima).
- **Cómo se sabe que salió bien (una pieza de punta a punta, ~5 a 8 minutos):**
  - Logs de tareas: «Pedido a «redes-piezas.yml»: noticia1…».
  - GitHub → Actions → **Piezas de redes** (~1 minuto, verde): termina con «enviada al render».
  - Repositorio de render → Actions → **Render** (~2 a 4 minutos, verde); en R2 `radar-render` aparece `listos/<huella>/manifiesto.json`.
  - En la vuelta siguiente de las `:05/:35/:45`, Logs de tareas: «Video listo: noticia1 (…)» → «publicado: 1784…». El video está en Instagram y en la página.
  - El libro `web/data/redes.json` tiene la pieza anotada (commit `Redes: libro de publicaciones · …`).
  - Facebook: el posteo de la nota sale como siempre.
- **Atrás:** `REDES_ACTIVAS` en `No` en el Worker (corta de inmediato), sacar `redes.yml` de la lista, subir el reloj; en GitHub, la variable `REDES_ACTIVAS` vuelve a `Si`. Una pieza que ya estaba "en camino" se pierde o la publica el «Redes» viejo (no hay doble publicación: el libro es el mismo).
- **Ojo:** el botón «Reintentar pieza» del panel baja el adjunto de una corrida de «Redes»; con las redes en la nube no hay adjunto. El reloj reintenta solo (hasta 4 pedidos por pieza y por día).

## Paso 8 · El motor en Workers Builds

- **Quién:** una persona. **El segundo paso más delicado: es lo que arma la web.**
- **Qué (preparar, sin cortar nada):**
  1. Cloudflare → Workers & Pages → **radar-balcarce-motor** → Settings → **Builds** → *Connect* → autorizar la aplicación de Cloudflare en GitHub para el repositorio `radarbalcarce/radar-balcarce` (público hoy; si ya fuera privado, se autoriza igual). Rama: `main`. **Directorio raíz:** `/`. 
  2. **Build command:** `node infra/motor-cloudflare/vuelta.mjs` · **Deploy command:** `node infra/motor-cloudflare/listo.mjs`.
  3. **Build watch paths** (Include): `infra/motor-cloudflare/**`. **Esto es lo que evita que cada commit de datos arranque una compilación nueva**; sin esto, cada commit del robot dispararía otra vuelta (un ciclo). Verificar en el paso 8c.
  4. **Build variables and secrets** (el límite es 64; son ~26):
     - Variables (texto): `NODE_VERSION`=`24`, `TZ`=`America/Argentina/Buenos_Aires`, `SITIO`=`https://radarbalcarce.com`, `CLOUDFLARE_PROJECT` (el de hoy), `R2_MOTOR`=`radar-motor`, `MOTOR_SIMULAR`=`Si` (por ahora), y los valores anotados de `REDES_ACTIVAS`, `R2_ARCHIVO`, `TOPE_DE_NOTAS`, `FOTOS_MENORES_OFICIALES`, `SECCIONES_NUEVAS`, `FOTOS_BASE`, `R2_RESPALDOS`, `R2_FOTOS`, `R2_PIEZAS`.
     - Secretos: `RADAR_GITHUB_TOKEN`, `CLOUDFLARE_API_TOKEN` (el de Pages y R2), `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `GEMINI_API_KEY_REDACCION`, `GEMINI_API_KEY_REDES`, `GEMINI_API_KEY_CLASIFICACION`, `GROQ_API_KEY`, `VIGILANTE_TOKEN`, `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY`.
  5. En *Deploy Hooks*: crear uno con la rama `main`, copiar la dirección y pegarla como secreto de GitHub `MOTOR_DEPLOY_HOOK`; correr «Desplegar Workers de Cloudflare» con `que: reloj` (con la nube y la lista de hoy) para que el reloj la tenga.
- **8a · Ensayo (GitHub sigue mandando):** `curl -X POST <la dirección del hook>` (sin encabezados). En Workers Builds → Builds aparece una compilación. Esperado: el registro dice «Vuelta … · SIMULACRO», pasa por «Núcleo legal», «Buscar noticias», «Compilar el sitio», «Revisar que el SEO siga en pie», «Guardar si cambió algo: N archivo(s) distintos. (simulacro: no se guarda)», «Subir a Cloudflare Pages: (simulacro: no se sube)» y termina en «Vuelta terminada en N s». **Anotar el tiempo.** Si tarda más de 7 minutos, ver `MIGRACION-A-CLOUDFLARE.md` §5 (la web se armará menos de 48 veces por día; es lo esperado, no es un error).
- **8b · Comprobar que un commit de datos NO arranca una compilación:** esperar a que GitHub haga su próximo commit `Datos de la portada · …` y mirar que Workers Builds **no** lista una compilación nueva por él. Si la lista, afinar los *watch paths* antes de seguir.
- **8c · El corte:** (1) esperar a que «Actualizar la web» de GitHub no esté en curso (Actions); (2) en Workers Builds borrar la variable `MOTOR_SIMULAR`; (3) correr «Desplegar Workers de Cloudflare» (`que: reloj` y `que: vigilante`, con la nube) con `nube` = la lista de antes **más `actualizar.yml`**; (4) poner `actualizar.yml` también en `WORKFLOWS_EN_LA_NUBE` de las tareas (así `vigilar.mjs` no busca sus corridas en GitHub).
- **Cómo se sabe que salió bien (primeras tres vueltas, ~20 minutos):** la web se arma (el mapa del sitio, `radarbalcarce.com/sitemap.xml`, cambia de `lastmod`); aparece el commit `Datos de la portada · …` **creado por la API** (autor Radar Balcarce); Cloudflare → Pages → Deployments muestra un despliegue nuevo cada vuelta; `https://radar-balcarce-motor.<cuenta>.workers.dev/estado` (con `x-token`) trae `"ultima": { "ok": true … }` y `"mes": { "minutos": N }`; y el vigilante no avisa nada. **Medir el costo real:** Cloudflare → Workers Builds → uso del mes contra el `mes.minutos` del registro. Si Cloudflare marca más de lo que el registro dice, subir `MINUTOS_DE_MAS_POR_VUELTA` en `presupuesto.mjs`.
- **Atrás (cinco minutos):** subir el reloj con la lista **sin** `actualizar.yml`; «Actualizar la web» vuelve a correr en GitHub en la media hora siguiente. Esperar a que no haya una vuelta de Cloudflare en curso (`/estado` lo dice) para que no se pisen (el candado en R2 ya frena a la segunda: la vuelta vieja de GitHub no lo mira, pero termina en ~5 minutos).

## Paso 9 · Apagar lo de GitHub que ya no se usa

- **Quién:** una persona.
- **Qué:** nada se borra. En GitHub → Actions → cada workflow que se mudó (*Actualizar la web*, *Redes*, *Vigilancia*, *Auditoría IA*, *Pistas*, *Informe diario*, *Ilustrar notas sin foto*) → «…» → **Disable workflow**. Así nadie lo corre por error encima del Worker. **Se reactivan en un clic para volver atrás.**
- **Qué queda corriendo en GitHub:** Pruebas, Armado con datos vacíos, los semanales (Auditoría, Respaldo, Pruebas con otra hora), **Piezas de redes**, **Panel del celular** y las herramientas a mano.

## Paso 10 · Tres días de observación

Mirar cada mañana (el informe de las 8:15 lo trae casi todo):

| Qué mirar | Bien |
|---|---|
| Notas publicadas por día | las de siempre (~46) |
| La web se arma | cada ~30 a 45 minutos (`/estado` del motor: `presupuesto`) |
| Piezas de redes del día | las del contrato (informe diario) |
| Mails del vigilante | ninguno, o uno que se arregla solo |
| GitHub → Settings → Billing → Actions | minutos del mes vs. 2.000 (si el ritmo da más, ver palancas en `MIGRACION-A-CLOUDFLARE.md` §5) |
| Cloudflare → Workers Builds | minutos del mes vs. 6.000 |

Si algo falla y no se arregla en el día: **vuelta atrás total** (abajo).

## Paso 11 · Repositorio principal a privado

- **Quién:** una persona, **solo cuando el paso 10 salió limpio**.
- **Antes:** (1) GitHub → Settings → Billing → **Budgets and alerts**: poner el tope de gasto de Actions en **US$ 0** (así, si algo pasara de los 2.000 minutos, los workflows se frenan en vez de cobrar; el robot ya no depende de ellos). (2) Revisar que ningún secreto esté en el código (hay una prueba, pero la historia pública ya existe: nada de lo que hoy figura en el historial se "borra" por pasar a privado).
- **Qué:** Settings → General → *Danger zone* → **Change visibility → Make private**.
- **Cómo se sabe que salió bien:** `radarbalcarce.com` sigue igual (es Cloudflare); el panel del celular sigue leyendo (usa la llave de cada persona, que ve el privado); la vuelta del motor sigue guardando (la llave `RADAR_GITHUB_TOKEN` ve el privado); «Pruebas» corre sin problemas; el vigilante de afuera deja de leer GitHub sin llave (con el motor en la nube ya no lo necesita).
- **Atrás:** Settings → *Change visibility → Make public* (los secretos no se ven en un repositorio público; las llaves se cargaron a mano).

---

## La vuelta atrás, completa

| Si quiero volver… | Hago… | Tarda |
|---|---|---|
| **Todo a como estaba** | «Desplegar Workers de Cloudflare» → `que: reloj` y `que: vigilante`, `con_nube` **apagado**; reactivar los workflows de GitHub (paso 9); poner `REDES_ACTIVAS` de GitHub en `Si` y la del Worker en `No`; variable `INFORME_RESPALDO_EN_GITHUB` borrada; repositorio público otra vez si ya se hizo privado | 10 minutos |
| **Sólo el motor** | Subir el reloj con la lista sin `actualizar.yml` | 5 minutos |
| **Sólo Redes** | Igual, sin `redes.yml`; `REDES_ACTIVAS` | 5 minutos |
| **Una tarea** | Igual, sin su archivo | 5 minutos |
| **Freno de emergencia** | En el panel del reloj: variable `NUBE` vacía (efecto inmediato; el workflow la pisa al próximo despliegue) | 1 minuto |

**No hay datos que devolver:** la verdad siempre estuvo (y sigue) en `web/data/` del repositorio; la nube sólo guarda memoria que se rearma sola (el cruce de medios) y contadores.

## Cuántos minutos de GitHub quedarían

Estimación y cuentas en `MIGRACION-A-CLOUDFLARE.md` §5: **~1.620 a 1.820 por mes** contra los 2.000 incluidos (el 80 % es «Piezas de redes», «Pruebas» y «Panel del celular»). **Se mide en la primera semana**: Settings → Billing → Usage. Con el tope de gasto en US$ 0 (paso 11) el peor caso es que se frene la última semana del mes lo que queda en Actions (pruebas y piezas), **nunca** la web ni lo ya mudado.
