# Fotos de las notas en R2 y no en git

*Escrito el 23/10/2026; completado el 24/10/2026 (regla 316: todo lo que usa una foto la trae de R2 antes de usarla, la migración está probada y el paso a paso está abajo). Todo detrás de un interruptor **APAGADO**: la variable `FOTOS_EN_R2` con valor `Si`. Sin ella, todo queda exactamente como hoy. Nada de esto se ejecutó todavía: ni la migración, ni se tocó ninguna variable, ni se subió una sola foto a R2.*

## Por qué

Las fotos de las notas (`web/public/fotos-notas/`) se guardan en git en cada vuelta del motor (`infra/motor-cloudflare/vuelta.mjs` las commitea por la API de GitHub). Son el 71 % del peso del árbol de git y el 60 % de sus archivos. Ya existen el depósito R2 `radar-archivo`, el Worker `radar-balcarce-archivo` (que sirve `/fotos-notas/*` desde R2 cuando Pages no tiene el archivo, con `FOTOS_DE_RESPALDO=1` y la ruta puesta) y el exportador `archivar-a-r2.mjs`, que ya sube a R2 las fotos de las notas viejas con la clave `fotos-notas/<archivo>`. Lo que faltaba es que las fotos nuevas no pasen por git y que nada se rompa por no tenerlas en disco.

## Cuánto hay hoy (medido el 24/10/2026, sobre `main`)

| Qué | Cantidad | Peso |
|---|---|---|
| Árbol de git completo (archivos rastreados) | 2.539 archivos | 145,6 MB |
| `web/public/fotos-notas/` | 1.531 archivos (60 % de los archivos) | 103,4 MB (**71 % del peso**) |
| Se mueven a R2 (lo que dice el simulacro) | **1.503** fotos | **102,1 MB** |
| Se quedan en git a propósito (las fijas: `clima-*` y `efemeride-fondo`) | 28 | 1,3 MB |
| De las que se mueven: fotos de notas (incluye unas 13 manuales) / ilustraciones con IA | 1.463 / 40 | 94,9 MB / 7,2 MB |
| Las que hoy muestra alguna nota de la portada o del archivo del sitio (500 notas) | unas 430 | unos 31 MB |
| Las que no muestra ninguna nota del sitio (de notas que ya salieron del tope de 500; la web las sirve del archivo permanente) | unas 1.070 | unos 71 MB |
| Peso de una foto | 69 KB en promedio, 584 KB la más grande | |
| Ilustraciones nuevas por día (modo automático) | unas 12 | unos 2 MB por día en el historial |
| Historia de git empaquetada | | 283 MB (esto **no** baja moviendo las fotos: para eso está «Compactar el historial») |

**Cuánto bajaría, de verdad:**

- **El árbol de git** (lo que se baja al clonar y se ve en el disco): de 145,6 MB y 2.539 archivos a unos **42 MB y 1.036 archivos** (menos 71 % del peso, menos 59 % de los archivos).
- **Lo que se sube a Pages en cada vuelta** (`out/`): hoy lleva las 1.531 fotos (`next build` copia `public/` entero). Con el interruptor lleva las fijas y las que la vuelta trae de R2 para las notas del sitio (unas 460): **menos unos 1.070 archivos y unos 71 MB por subida**.
- **El tiempo de la compilación casi no cambia.** Copiar las fotos a `out/` tarda en la PC un segundo (1,05 s las 1.531; 0,43 s las 456): lo pesado de `next build` son las páginas y las tarjetas, no las fotos. Lo que se gana es clonar, commitear y subir menos; lo que se pierde, hasta 150 segundos por vuelta en el peor caso de la hidratación (800 fotos, 8 a la vez, dentro de Cloudflare). **No se promete un número de minutos: se mide en las dos primeras vueltas con el interruptor prendido** (paso 11).
- **El historial de git no se achica** (283 MB) hasta que se compacte. Compactar antes de prender no sirve (las fotos nuevas seguirían entrando).

## Flujo de hoy (interruptor apagado)

1. `web/scripts/generar-datos.mjs` busca la foto de cada nota (`elegirFotosNuevas`, `web/scripts/fotos-notas.mjs`; revisión con IA en `ingesta/fotos.mjs`), la achica a 1.200 px JPEG (`achicar-foto.mjs`) y la escribe en `web/public/fotos-notas/<id>.jpg`; anota todo en `web/data/banco-fotos.json`.
2. También escriben ahí: las fotos libres de F1 y fútbol (`foto-libre.mjs`), las fijas (`clima-*`, `efemeride-fondo`), las ilustraciones con IA (`-ia.jpg`, «Ilustrar notas sin foto», que corre en el Worker de tareas y commitea por la API) y las fotos manuales del panel (`foto-manual.mjs`, o el celular directo por la API de GitHub).
3. `generar-datos` pregunta en seis lugares «¿existe esa foto?» con `fs.existsSync` y `fotoDelArchivoAlDia` le saca la foto a la nota si el archivo no está. La poda (`podarFotos`) borra del disco lo que ya no tiene nota (a la semana).
4. `npm run build` copia `public/` a `out/`; las tarjetas, `dimensionesDeFoto` (datos estructurados) y `rss-disco.js` leen la foto **del disco**.
5. `cambiosDesde` (`infra/motor-cloudflare/archivos.mjs`) compara el disco con la foto del principio de la vuelta y manda en el commit lo nuevo, lo cambiado y lo borrado, fotos incluidas.

## Con `FOTOS_EN_R2=Si`: quién necesita la foto en disco y cómo la consigue

Código: `infra/compartido/fotos-r2.mjs` (sin dependencias) y sus enganches. Pruebas: `pruebas/fotos-en-r2.test.mjs` (la vuelta del motor) y `pruebas/fotos-en-r2-hidratacion.test.mjs` (todo lo demás, regla 316). Todas con R2 y GitHub de mentira.

| Quién | Para qué usa la foto | Cómo la consigue con el interruptor prendido |
|---|---|---|
| **La vuelta del motor** (Workers Builds) | Tarjetas, medidas de imagen, RSS | Lista las fotos de R2 (índice en `.cache/fotos-r2.json`), **baja** a disco las 40 ilustraciones más nuevas del libro (`fotos-ia.json`: el Worker de tareas las sube sólo a R2 y en esta misma vuelta una nota puede empezar a mostrarlas) y las que muestran la portada y el archivo (hasta 800 en total, 150 s, 8 a la vez) y arma con «¿existe?» = disco **o** índice. Al terminar, las fotos **nuevas** se suben a R2 y salen del commit; si una subida falla, esa foto va en el commit como hoy. `banco-fotos.json` se guarda después. |
| **El repaso de los reels** (`reels/plan.mjs --generar`; lo corren «Redes», «Piezas» y «Piezas de redes») | La foto de cada nota dentro del video del podcast (`fotoParaElRepaso` lee **del disco**) | **Regla 316:** el propio `plan.mjs` trae del sitio las fotos de la portada **antes de armar el plan**. El repaso se arma dentro de `planDelDia`, que es anterior a generar los videos, y antes dependía de que un paso previo del workflow las hubiera bajado. Ahora no depende del orden de los pasos. Los tres workflows pasan `FOTOS_EN_R2` al paso que arma. |
| **El render de video público** (`infra/render-publico/`) | Dibujar el video | **No necesita nada:** las fotos viajan **dentro del pedido** (van en los SVG como imagen en base64) que arma el repositorio principal. No lleva claves ni toca R2. Por eso no hace falta sincronizarlo. |
| **Facebook y las piezas de Instagram** (`redes/publicar.mjs`, también en el Worker de tareas) | Hoy ninguna lee fotos del disco (Facebook usa el enlace de la nota) | Trae por el sitio las de la portada (hasta 80, 60 s) por si una pieza las usara. Es un resguardo inocuo. |
| **La revisión del archivo** (`revisar-archivo.yml`) | Mirar con IA de visión la foto de notas viejas | **Regla 316:** antes de cada tanda trae las fotos de las notas pendientes más viejas (hasta 200, 120 s). Si una no llega, la nota queda **pendiente** (se vuelve a probar en la tanda siguiente, hasta tres veces) en lugar de darse por revisada sin mirar su foto. |
| **«Ilustrar notas sin foto»** (el Worker de tareas y el workflow de GitHub) | Volver a mirar las ilustraciones viejas sin control (regla 206) | **Regla 316:** las busca en git, en R2 (el depósito `ARCHIVO`, por binding, sin claves) y, si no, por el sitio. Si no la consigue, **no la da por mala** (antes habría sacado la ilustración por un corte de red): la deja como está. La copia traída de R2 es de trabajo: no se sube a git ni se borra de git. |
| **Las ilustraciones nuevas** | Guardarse | En el **Worker de tareas** (con el interruptor y el depósito `ARCHIVO`): se suben a R2 **antes** del commit que las nombra y no van al commit; si R2 falla, van al commit. En el **workflow de GitHub** (vuelta atrás): siguen yendo a git. |

**Lo que sigue en git a propósito:** las fijas (`clima-*`, `efemeride-fondo`: las lee la compilación siempre), `banco-fotos.json`, `fotos-ia.json`, `fotos-manuales.json`, los escudos, **las fotos manuales del panel** (las escribe el celular, o «Panel del celular», con la llave de GitHub de quien lo usa: no puede ni debe tener claves de R2; son unas 13 en total, de ~70 KB) y las ilustraciones que se hagan por el camino de GitHub Actions. Después, cada vez que se corra la migración (`--subir --quitar`) esas también se mueven, porque el script no distingue: el árbol de git vuelve a quedar sin fotos.

**Qué se borra:** la poda sigue borrando del disco y de git lo que ya estaba en git. De R2 **sólo** se borran las fotos de notas retiradas (menores y víctimas: `retirada` en el banco, `retiradas.json`, `revision-archivo.json`; la nota y su `-ia`). La poda normal no borra de R2: una nota archivada sigue mostrando su foto, y R2 es barato (10 GB gratis).

## La migración (`scripts/migrar-fotos-a-r2.mjs`)

Cuatro formas, de menos a más:

| Forma | Qué hace | Qué toca |
|---|---|---|
| (sin nada) **simulacro** | Cuenta cuántas fotos hay en el árbol, cuánto pesan y cuáles se quedan | Nada; no usa la red |
| `--mirar` | Además **lee** R2 y dice cuántas tiene ya y cuántas le faltan | Nada; sólo lectura |
| `--subir` (con `--max=N`) | Sube a R2 las que faltan, hasta N nuevas por vez | R2 (sólo agrega). No pisa lo que R2 ya tiene. No saca nada de git |
| `--subir --quitar` | Además `git rm` de las que R2 confirma tener **iguales, byte por byte** | R2 y el árbol de git (deja los borrados preparados) |

Reglas del script (todas probadas): nunca borra nada de R2; una foto que R2 tiene **distinta** (otro contenido con el mismo nombre) se queda en git y se avisa («DISTINTAS»); `--quitar` sin `--subir` no hace nada; sin las claves de R2 no hace nada (sale con código 2); si alguna subida falla sale con código 1 y esa foto no se saca de git; las fijas no se tocan; `--max=N` cuenta sólo las **nuevas**, así que repetir el mismo comando avanza de a N hasta terminar.

**Quién lo corre: un botón.** Para que nadie tenga que pegar claves en una ventana, existe el workflow **«Fotos a R2 (migración)»** (Actions → Run workflow; sólo a mano, nunca solo). Elige el modo (`simulacro`, `mirar`, `subir`, `subir-y-quitar`) y el máximo. Usa los secretos y la variable que ya hay (`CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ARCHIVO`). **Se niega a sacar fotos de git si `FOTOS_EN_R2` no está en «Si».** El resultado queda escrito en el resumen de la corrida.

## Paso a paso

Cada paso dice **quién** lo hace, **qué mirar** al terminar y **cómo volver atrás**. No hay apuro: cada fase se puede dejar días. Cuando dice «entre vueltas» es unos 10 minutos después de cada :00 y de cada :30 (el motor arranca a esas horas y tarda unos minutos), y antes de apretar el botón se mira en «Estado del motor» que no haya una vuelta en curso: sacar fotos de git mientras una vuelta guarda sus datos las podría hacer chocar.

### Fase 0 · Preparar (no cambia nada de lo que ve el lector)

1. **Claude: llevar esta rama a `main`.** Mirar: las pruebas dan verde y la vuelta siguiente del motor sale sana («Estado del motor»). Con el interruptor apagado, todo sigue igual. *Volver atrás: `git revert` del merge.*
2. **Una persona: subir el Worker de tareas** (para que tenga el depósito `ARCHIVO` y la variable): Actions → «Desplegar Workers de Cloudflare» → `que` = `tareas`. **Cuidado:** en el campo `nube` hay que copiar **lo mismo que dice hoy la variable `NUBE` del reloj** (el despliegue vuelve a escribir esa variable en el Worker de tareas; con el campo vacío la dejaría vacía). Dejar «con_nube» apagado. Mirar: la corrida termina verde. Si no se hace este paso, no se rompe nada: las ilustraciones siguen yendo a git. *Volver atrás: volver a subir el Worker de antes.*
3. **Una persona: poner la ruta de las fotos en el Worker del archivo:** Actions → «Archivo permanente (producción)» con `activar_ruta` y `activar_fotos`. Mirar: una foto vieja que ya no esté en el sitio responde 200 con el encabezado `X-Radar-Archivo: r2` (sin esto, una foto que no está en Pages da 404). *Volver atrás: el mismo workflow con `sacar_ruta`.*

### Fase 1 · Mirar y subir, sin sacar nada de git (no cambia nada de lo que ve el lector)

4. **Una persona: botón «Fotos a R2 (migración)» con modo `simulacro`.** Mirar el resumen: debe decir `SIMULACRO · fotos que se mueven: ~1.500 (~102 MB) · se quedan en git: 28`. Si el número es muy distinto, avisar a Claude antes de seguir.
5. **Una persona: modo `mirar`.** Mirar: «R2 ya tiene X de N; le faltan Y». Si da error de claves, falta alguno de los cuatro datos del workflow. *No se puede romper nada: sólo lee.*
6. **Una persona: modo `subir` con `max` = 5.** Es la prueba de **escritura**. Mirar: `subidas 5 · fallidas 0`. Si falla con 403: la clave de R2 que usan los secretos `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` sólo tiene permiso sobre otros depósitos (hoy se usa con `radar-motor` y `radar-render`). Hay que crear en Cloudflare (R2 → Manage API tokens) una clave con «Object Read & Write» sobre `radar-archivo`, `radar-motor` y `radar-render`, y cargarla en los dos secretos. **Las claves las pega una persona; nunca en un chat.** *Volver atrás: no hace falta; lo subido a R2 no molesta (se puede borrar a mano en Cloudflare → R2 → `radar-archivo` → `fotos-notas/`).*
7. **Una persona: modo `subir` con `max` vacío.** Sube todas las que faltan (unas 1.500, ~100 MB; unos minutos). Mirar: `fallidas 0`. Si quedaron fallidas, repetir (no repite lo que ya está). Después, modo `mirar`: «le faltan 0».

### Fase 2 · Prender el interruptor (desde acá las fotos nuevas ya no van a git)

8. **Una persona: crear la variable `FOTOS_EN_R2` = `Si`** en GitHub (Settings → Secrets and variables → Actions → Variables). Con eso quedan prendidos «Actualizar la web» (de vuelta atrás), «Redes», «Piezas», «Piezas de redes», «Revisar el archivo» e «Ilustrar notas».
9. **Una persona: llevarla a Workers Builds:** Actions → «Cargar variables del motor» con **`simular` = `No`**. **ADVERTENCIA: ese campo viene por defecto en `Si`, que deja el motor en ensayo (`MOTOR_SIMULAR=Si`) y la web deja de publicar. Ya pasó el 24/10/2026. Antes de apretar «Run workflow», cambiar `simular` a `No`.** Mirar: verde, y que la vuelta siguiente del motor vuelva a guardar y publicar (si no, volver a correr el workflow con `simular` = `No`). Y repetir el paso 2 (subir el Worker de tareas) para que el Worker también tenga la variable.
10. **Mirar dos vueltas seguidas** (la que arranca a los :00 y la de los :30). En Cloudflare → Workers y Pages → el motor → Builds → registro, buscar: `Fotos de R2: N en el depósito, M traídas` y `Fotos nuevas: K a R2`. En GitHub, abrir el commit «Datos de la portada»: **no debe traer fotos nuevas** (sólo archivos de `web/data/`). En el sitio: la portada y una nota con foto, y la tarjeta de Facebook (`/nota/<id>/opengraph-image`) con foto. En la PC: `npm run auditar-fotos` (después de un `git pull`): ninguna nota con foto que antes tenía y ahora no.
11. **Mirar tres días** (esta es la medición que falta para saber cuánto cambia el tiempo): minutos de Workers Builds de cada vuelta (no deben pasar de +150 s), notas que perdieron la foto (cero), y que el próximo reel de repaso (podcast de la mañana, tarde o noche) tenga las fotos de las notas en lugar de las placas de sección: en el registro de «Piezas de redes» tiene que decir `Fotos traídas de https://radarbalcarce.com: N`. También, en el registro del Worker de tareas, `N foto(s) a R2` después de las ilustraciones. *Volver atrás de toda la fase 2: vaciar la variable en GitHub, correr «Cargar variables del motor» (**con `simular` = `No`: por defecto trae `Si`, que deja el motor en ensayo y la web deja de publicar, como pasó el 24/10**) y subir el Worker de tareas. Desde la vuelta siguiente las fotos nuevas vuelven a git; lo ya subido a R2 queda y se sigue sirviendo.*

### Fase 3 · Sacar las fotos de git (el único paso que cambia el árbol)

12. **Una persona, entre vueltas: botón «Fotos a R2 (migración)» con modo `subir-y-quitar`**, `max` vacío. Sube lo que falte, confirma cada foto leyéndola de R2 y comparándola con la de git, y hace un commit **«Fotos de las notas a R2 · N fotos»** que las saca del árbol (las fijas se quedan). Mirar el resumen: `sacadas de git` ≈ 1.500 y **`DISTINTAS` = 0** (si hay alguna, esa foto se queda en git y hay que mirarla). Mirar: la corrida termina verde y dice «Guardado».
13. **Mirar la vuelta siguiente** como en el paso 10: la portada sigue con fotos, las tarjetas también, `Fotos de R2: N en el depósito, M traídas` con M parecido a antes. *Volver atrás: `git revert` del commit «Fotos de las notas a R2» (devuelve los archivos al árbol) entre vueltas, y vaciar la variable si se quiere volver del todo. Las fotos también están siempre en el historial de git.*
14. **Recién ahora conviene «Compactar el historial»** (a mano, entre vueltas): ahí baja de verdad el tamaño de lo que se clona.

## Riesgos

- **Lo más delicado es el «¿existe?»**: si alguna parte del armado sigue mirando sólo el disco, la nota pierde su foto. Se cambiaron los seis lugares de `generar-datos` (prueba que lo vigila) y `fotoDelArchivoAlDia`. Quedan leyendo sólo el disco, a propósito: la compilación (tarjetas, medidas, RSS), que se cubre con la hidratación; lo no hidratado sale con la placa en la tarjeta y sin medida en los datos estructurados, nunca rompe.
- **Tiempo de la vuelta**: hasta 150 s extra (800 bajadas desde R2). Con `TOPE_DE_NOTAS=500` son ~500. Las bajadas son por S3 dentro de Cloudflare.
- **Menores y víctimas**: la foto retirada ya no está en git para borrarla ahí; se borra de R2 con la vuelta siguiente a la retirada. Mientras tanto la copia cacheada del Worker dura hasta una semana (`max-age=604800`) y la de Pages hasta que se compile sin ella: igual que hoy.
- **Permisos de la clave de R2** (paso 6): si no alcanza, nada se rompe pero tampoco se ahorra (la subida falla y las fotos siguen yendo a git).
- **Una foto que R2 tiene con otro contenido bajo el mismo nombre** (por ejemplo una ilustración sacada y otra nueva con el mismo nombre): el script no la pisa y no saca la de git (aparece en «DISTINTAS»).
- **Rutas de Pages y 20.000 archivos**: no cambia (las hidratadas entran a `out/`), y baja en unos 1.070 archivos.
- **La revisión del archivo y las ilustraciones sin foto en disco**: con el interruptor prendido y una foto que no llega, la revisión deja la nota pendiente (y la tercera vez la da por perdida) y las ilustraciones sin control quedan como están; nunca se sacan por un corte de red.
- **Pasos del workflow de despliegue**: volver a subir el Worker de tareas con el campo `nube` vacío vacía también la variable `WORKFLOWS_EN_LA_NUBE` del Worker (ya pasaba antes de esta regla; por eso el paso 2 pide copiar la lista).

## Falta (no está hecho)

- **Ejecutar la migración y prender el interruptor** (todo lo de arriba): nada se ejecutó.
- Verificar que la clave de R2 que usa la vuelta puede **escribir** en `radar-archivo` (paso 6) y que la ruta de las fotos está puesta (paso 3).
- Otros archivos de `web/data` que sólo usa el robot (`celular-pendientes.json`, `fichas.json`, etc.) siguen en git: ya está en `docs/etapa-10-operacion/MENOS-COMMITS.md`.
- Compactar el historial (paso 14).
- `ENLACES_CORTOS` (apagada) tampoco llega al Worker de tareas, que es quien publica en Facebook en la nube: antes de prenderla hay que pasarla en el despliegue como se hizo con `FOTOS_EN_R2` (regla 316). No es parte de las fotos.
