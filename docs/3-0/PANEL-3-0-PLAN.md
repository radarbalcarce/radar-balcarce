# Plan del panel de Radar 3.0 (y el video de YouTube en las notas)

*Escrito el 17/11/2026 leyendo el código (`v3/sitio/panel.mjs`, `v3/sitio/vistas/panel.mjs`, `v3/redaccion/telegram/administrar.mjs`, `nota-propia.mjs`, `worker.mjs`, `v3/redes/piezas-del-dia.mjs`, `schema-redes.sql`) y `CONTENIDO-REDES-3-0.md`. Nada de esto está desplegado ni cambiado, salvo la parte del video (§ 7). Lo que dice «NO VERIFICADO» no se pudo comprobar leyendo.*

**Lo que quiere Hernán:** dedicarse sólo al contenido y manejar todo desde un panel (o por Telegram, o pidiéndoselo a Claude).

---

## 1. Qué existe hoy (con evidencia)

El panel **ya existe** y es más grande de lo que parece: lo que falta no es construirlo, es **completarlo y que avise**.

| Pedido de Hernán | ¿Existe? | Dónde está | Qué tan escondido |
|---|---|---|---|
| (a) Ver las notas | **Sí** | Lista con filtros (título, estado, sección, origen), 50 por página: `listarParaPanel` (`v3/sitio/panel.mjs:134`), `paginaLista` (`vistas/panel.mjs:~120`). En el bot: `/ultimas`, `/pendientes` (`administrar.mjs:145-146`) | Hay que pedir un enlace por Telegram con `/panel` (`administrar.mjs:432`). Después queda adentro 30 días |
| (a) Editar título, bajada, cuerpo, sección | **Sí** | `cambiarTexto` (`panel.mjs:~219`): valida, anota cada corrección en `ficha.correcciones`, no cambia la dirección, borra la caché. Bot: `/corregir`, `/seccion` | Es el primer formulario de la ficha. Visible |
| (a) Editar fotos | **Sí** | `cambiarFotos` (`panel.mjs:~262`): portada, crédito, sacar, subir hasta 10 de 8 MB a R2 | Visible. **No achica** las fotos; al sacar una el archivo queda guardado |
| (b) Ocultar / mostrar | **Sí, completo** | `cambiarEstado` (`panel.mjs:~243`): `ocultar` y `mostrar` reversibles; `retirar` con motivo. Bot: `/ocultar`, `/mostrar`, `/ocultas`, `/retirar` | Visible, pero «Ocultar» está **debajo** del texto: hay que bajar bastante en el celular |
| (c) Botón «que salga en reel» | **A medias** | Tres casillas Posteo / Historia / Reel + «Al próximo repaso» + menciones: `cambiarRedes` (`panel.mjs:~253`, mismas reglas que `/redes` y `/repaso`: `administrar.mjs:314-350`). Un reel a pedido lo arma el reloj de las piezas (`reel-nota`, `piezas-del-dia.mjs:35`) | Es una casilla, no un botón. **No** muestra qué redes concretas (hoy son todas), **no** elige las fotos (de 1 a 3), **no** dice a qué hora saldrá |
| (c) Tildar red por red (IG, FB, TikTok, YouTube, X, Threads, Bluesky) | **No** | Los destinos están decididos por código: Facebook e Instagram por la tabla `accionesDe`; TikTok, YouTube y X reciben **todos** los videos por Buffer (`REDES_DE_BUFFER`, `piezas-del-dia.mjs:94`); Bluesky y Threads, el enlace de lo que salió en Facebook. `notas.redes.lista` sólo guarda **formatos**, no redes | Hay que agregar un campo nuevo (ver § 4) |
| (c) Usar las plantillas nuevas (kit 3.0) | **No conectado** | El kit está en `D:\BalcarDev\RadarMedia\reels-3-0\` (no tiene LEEME; se arma con `node todo.mjs <pieza>`, `package.json`: HyperFrames + gsap; piezas hechas: clima, convocando, efeméride, farmacias, nota-propia, podcast). Producción sigue con el armador viejo `nota-propia` de `v3/redes/piezas/armadores.mjs` | Falta decidir cómo entra el kit al render de producción (§ 6, etapa 3) |
| (d) Pedir una nota propia con texto, audio, fotos, enlace | **Sí, sólo en el bot** | `nota-propia.mjs` (565 líneas): material → «armala» → muestra la nota → «ok» → pregunta redes | Bien resuelto, pero **no está en el panel**; el panel dice «No crea notas nuevas» (`INSTRUCTIVO`, § 4) |
| (d) Vista previa antes de publicar | **Sí, sólo en el bot** (texto en el chat, no la página real) | `nota-propia.mjs` | No se ve como la ve el lector |
| (e) Aviso cuando salió o por qué no | **No** | El bot contesta sólo en el momento del pedido (`administrar.mjs:314-338`); el doc de redes lo marca «NO VERIFICADO» y el código no manda nada cuando el reloj arma el reel. La ficha del panel muestra una tabla `publicaciones` (`panel.mjs:~160`) pero **sólo posteos** de Facebook/Instagram, no piezas de video | Es el hueco más grande |
| (f) Qué salió hoy en cada red y qué está programado | **No** | Las tablas existen: `publicaciones` (por nota y red) y `piezas` (por pieza, con `acciones` por red y `estado`: `schema-redes.sql:4,25`), pero **ninguna pantalla las lee todas**. Lo programado está en `PIEZAS_DEL_DIA` (código) | Hay que armar la pantalla |
| Entrar | Enlace por Telegram | `enlaceDelPanel` (`administrar.mjs:432`): token de 32 bytes, vale 15 minutos y una vez; sesión de 30 días en cookie `HttpOnly; Secure; SameSite=Strict`; en la base sólo la huella SHA-256 (`panel.mjs:~75-95`) | Bien hecho; es incómodo (hay que pedirlo cada vez que se pierde la sesión) |

**Lo seguro que ya tiene:** CSRF en cada formulario (`csrfDe`), CSP propia y `no-store` (`CABECERAS_DEL_PANEL`), `noindex`, nada sensible en el HTML (todo se arma en el servidor tras la sesión), todo texto escapado (`esc`). Las pruebas están en `v3/sitio/panel.test.mjs`.

## 2. Qué falta (resumen)

1. **Avisos** de resultado (salió / no salió y por qué), por Telegram y en la ficha.
2. **Botón «Que esta nota salga en reel»** de verdad: con redes tildadas, formato, 1 a 3 fotos elegidas y hora estimada.
3. Pantalla **«Redes de hoy»** (salió / está programado / falló).
4. **Pedir una nota propia** desde el panel, con vista previa real.
5. Un lugar para **Ajustes** (interruptores y ver el estado), sin tocar variables a mano.
6. Plantillas del kit 3.0 en los reels de nota.

## 3. El diseño: cuatro pantallas más ajustes

Pensado para el celular, una sola columna, botones grandes (mínimo 44 px de alto), todo en castellano simple. Se reaprovecha el HTML armado en el servidor que ya hay (sin framework, sin JavaScript de terceros).

### 3.1 Lista de notas (`/panel`)

```
┌──────────────────────────────┐
│ Radar · Panel          Salir │
├──────────────────────────────┤
│ [Notas] [Redes de hoy]       │
│ [Pedir nota] [Ajustes]       │
├──────────────────────────────┤
│ 🔍 Buscar en el título       │
│ [Estado ▾] [Sección ▾] [Filtrar]│
├──────────────────────────────┤
│ ┌───┐ Título de la nota…     │
│ │foto│ PUBLICADA · Balcarce  │
│ └───┘ hoy 10:12 · 🎬 FB IG   │ ← ícono de lo que ya salió
│        [Ocultar] [Reel]      │ ← dos botones al toque
├──────────────────────────────┤
│ ┌───┐ Otro título…           │
│ │foto│ OCULTA · Política     │
│ └───┘ ayer 21:40             │
│        [Mostrar]             │
└──────────────────────────────┘
```
Cambios sobre hoy: (1) botones rápidos **Ocultar/Mostrar** y **Reel** en cada fila (hoy hay que abrir la nota y bajar); (2) una marca de lo que ya salió en redes; (3) menú de arriba con las 5 secciones del panel.

### 3.2 Ficha de la nota (`/panel/nota/<id>`)

```
┌──────────────────────────────┐
│ ← Todas las notas            │
│ [foto portada]               │
│ PUBLICADA · Balcarce · 10:12 │
│ Título…                      │
│ Bajada…   [Ver en el sitio ↗]│
├──────────────────────────────┤
│ ACCIONES RÁPIDAS             │
│ [🎬 Que salga en reel]       │
│ [👁 Ocultar]  [✏ Editar]     │
├──────────────────────────────┤
│ ¿QUÉ SALIÓ DE ESTA NOTA?     │
│ Facebook posteo   ✔ 10:30    │
│ Instagram reel    ⏳ 11:07   │
│ TikTok            ✖ sin foto │
├──────────────────────────────┤
│ ▸ Texto  ▸ Fotos  ▸ Video    │ ← desplegables cerrados
│ ▸ Retirar (pide motivo)      │
└──────────────────────────────┘
```
La ficha pasa a mostrar **primero lo que se hace seguido** y deja los formularios largos en desplegables (`<details>`, sin JavaScript).

### 3.3 «Que esta nota salga en reel» (`/panel/nota/<id>/reel`)

```
┌──────────────────────────────┐
│ ← Volver a la nota           │
│ Reel de: «Título de la nota» │
├──────────────────────────────┤
│ 1) ¿Dónde sale?              │
│ [✔] Instagram  [✔] Facebook  │
│ [✔] TikTok     [✔] YouTube   │
│ [ ] X          [ ] Threads   │
│ [ ] Bluesky                  │
├──────────────────────────────┤
│ 2) ¿En qué formato?          │
│ (•) Reel  ( ) Historia       │
│ ( ) Posteo                   │
│ [✔] Sumarla al próximo repaso│
├──────────────────────────────┤
│ 3) Fotos (elegí de 1 a 3)    │
│ [☑ foto1] [☑ foto2] [☐ foto3]│
│ la 1.ª es la de portada      │
├──────────────────────────────┤
│ Sale hoy a las 11:07 aprox.  │
│ (cupo de voz: quedan 9 de 15)│
│                              │
│ [ 🎬 Pedir el reel ]         │
│ Te aviso por Telegram cuando │
│ salga o si no puede salir.   │
└──────────────────────────────┘
```

### 3.4 Redes de hoy (`/panel/redes`)

```
┌──────────────────────────────┐
│ Redes de hoy · mar 17/11     │
├──────────────────────────────┤
│ YA SALIÓ                     │
│ 07:00 Clima mañana  IG✔ FB✔ TT✔ YT✔ X✔
│ 09:00 Un día como hoy IG✔ FB✔│
│ 10:00 Repaso mañana  IG✔ FB✖ │
│        └ FB: error de Meta   │
│        [Reintentar]          │
├──────────────────────────────┤
│ PROGRAMADO                   │
│ 15:00 Repaso tarde           │
│ 19:00 Farmacia de turno      │
│ 20:00 Clima noche            │
│ 21:00 Repaso noche           │
├──────────────────────────────┤
│ SALEN DE NOTAS A PEDIDO      │
│ 11:07 Reel «Título…»  ⏳     │
├──────────────────────────────┤
│ Cupo de voz: 6 de 15 usados  │
└──────────────────────────────┘
```

### 3.5 Pedir nota (`/panel/pedir`) y Ajustes (`/panel/ajustes`)

- **Pedir nota:** un formulario con texto, enlace, fotos y (con el micrófono del teléfono) un audio; al mandar, entra al mismo camino que el bot (`nota-propia.mjs`) y devuelve una **vista previa con la plantilla real de la nota** marcada como borrador; botones «Publicar», «Cambiar» y «Descartar». Es la parte más grande: va en la etapa 4.
- **Ajustes** (sólo lectura al principio): estado de las redes (`REDES_ACTIVAS`), cupo de voz del día, último error de cada red, pausa. Los interruptores que hoy se cambian a mano en GitHub o Cloudflare se pasan al panel **de a uno y con confirmación**, en la etapa 5.

## 4. Qué hace cada botón por detrás

| Botón | Qué escribe / llama | Tabla o endpoint |
|---|---|---|
| Ocultar / Mostrar | `UPDATE notas SET estado` y borra la caché de la nota, la portada y la sección | **Ya existe:** `POST /panel/nota/<id>/estado` |
| Editar texto | `UPDATE notas` + anota `ficha.correcciones` | **Ya existe:** `POST /panel/nota/<id>/texto` |
| Editar fotos | `notas.foto` y R2 `fotos-notas/` | **Ya existe:** `POST /panel/nota/<id>/fotos` |
| Pedir reel | Escribe en `notas.redes` (JSON): `{ lista: ['reel'], destinos: ['instagram','facebook','tiktok',…], fotos: [0,2], repaso: true, pedida, forzada }`. El reloj de las piezas (`:07`, de 8 a 23) la ve y la arma | **Nuevo:** `POST /panel/nota/<id>/reel`. Mismo patrón que `cambiarRedes`; el campo `destinos` es nuevo y hay que enseñarle a `accionesDe` a respetarlo (zona de `v3/redes/`) |
| Aviso de resultado | Cuando una pieza `reel-nota-<id>` queda `publicada`, `error` o `sin-datos` en `piezas`, el Worker de las redes manda un Telegram: «Salió: enlace» o «No salió: motivo». También se guarda en `piezas.acciones` y se ve en la ficha | **Nuevo:** `avisar()` al cerrar la pieza (ya existe `avisar` en `disparar-acciones.mjs:66`); **no** requiere tabla nueva |
| Redes de hoy | Lee `piezas` (`dia = hoy`) y `publicaciones` (`dia = hoy`); lo programado sale de `PIEZAS_DEL_DIA` | **Nuevo:** `GET /panel/redes` (sólo lectura: lo más seguro) |
| Reintentar | Marca la fila como reintentable (`piezas.estado` vuelve a libre) respetando el máximo de 3 errores por día | **Nuevo**, etapa 5; recién después de que haya avisos |
| Pedir nota | Misma función que el bot, pero entrando por formulario; el audio se transcribe afuera como hoy | **Nuevo:** `POST /panel/pedir` + `GET /panel/borrador/<id>` |
| Video de YouTube en la nota | Escribe `sitio_notas.extra.video = { youtube, titulo, despuesDe }` | **Nuevo**, ver § 7 |

## 5. Cómo se entra: ¿alcanza el enlace de Telegram o conviene Cloudflare Access?

**Hoy** (enlace de 15 minutos por Telegram + sesión de 30 días): es **seguro** (un solo uso, huella en la base, cookie `HttpOnly`/`Strict`, CSRF). Lo que molesta: cada vez que se pierde la sesión (otro teléfono, borrar datos) hay que ir a Telegram y pedir `/panel`. Además **depende de que el bot esté vivo**: si el bot se cae, no se entra (justo cuando más hace falta).

**Cloudflare Access** (gratis hasta 50 usuarios): se entra con el mail (`radarbalcarce@gmail.com`, el de Hernán y el de Andrés) y un código de un solo uso que llega al correo; no hay contraseñas. Ventajas: **no depende del bot**; también protege `/panel` **antes** de que el pedido llegue al Worker (si alguien ataca la ruta, Cloudflare lo corta); sirve para varios dispositivos; la sesión puede durar semanas. Contras: es una **configuración en el panel de Cloudflare** (la hace una persona, no el código), hay que dejar fuera de Access lo que usa el bot (`/panel/entrar` ya no haría falta), y el código que valida la sesión tiene que **leer la cabecera firmada** `Cf-Access-Jwt-Assertion` y comprobar la firma (si no, una cabecera falsificada desde otro lado entraría).

**Recomendación:** **no cambiar ahora.** El enlace de Telegram alcanza y ya está probado. En la **etapa 6** sumar Cloudflare Access **como segunda puerta** (se puede entrar por cualquiera de las dos), y recién después de un mes sin problemas decidir si se apaga la de Telegram. Mientras tanto, dos mejoras chicas: que la sesión se renueve sola con el uso (hoy dura 30 días fijos) y que `/panel` en el bot avise «vence en 15 minutos» (ya lo hace).

**Seguridad, regla general (el repositorio es público):** ningún dato sensible en el HTML ni en los archivos estáticos; todo se arma en el servidor **después** de validar la sesión; los tokens y claves no viajan al navegador; las respuestas son `no-store`; todo lo que viene de la base pasa por `esc`; cada acción que cambia algo lleva CSRF y queda escrita con «cuándo» y «por» (`POR = 'Hernán (panel)'`). La pantalla «Redes de hoy» sólo **lee**. Los ajustes que cambian interruptores (etapa 5) piden confirmación y quedan en un registro.

## 6. Plan por etapas (chicas, desplegables de a una)

Cada etapa se prueba con `node --test "v3/sitio/**/*.test.mjs"` (y las del bot/redes cuando las toca) y se despliega sola, sin gastar IA ni voz en las pruebas.

| Etapa | Qué trae | Esfuerzo | Pruebas | Riesgo |
|---|---|---|---|---|
| **1. Lo que más rinde** (la que se hace primero) | (a) Botones rápidos **Ocultar/Mostrar** y **Reel** en cada fila de la lista; (b) la ficha reordenada: acciones arriba, formularios largos en desplegables; (c) la pantalla del reel (§ 3.3) con **redes tildadas** y fotos 1 a 3, guardando en `notas.redes.destinos` y `fotos`; (d) **aviso por Telegram** de resultado (salió con enlace / no salió y por qué) para los reels a pedido | **Medio-bajo** (2 a 3 días): casi todo reusa `cambiarRedes`; (c) y (d) tocan `v3/redes/` (hay que coordinarlo) | Un test por botón (OCULTAR/MOSTRAR desde la lista; el reel guarda los destinos válidos y rechaza redes desconocidas; sin foto con dirección pública avisa; nota con freno o no publicada rechaza); test del aviso con Telegram simulado | **Bajo**: ocultar/mostrar ya están probados; el reel sólo suma un campo que, si el reloj no lo entiende, se ignora |
| **2. Redes de hoy** | Pantalla `GET /panel/redes` de sólo lectura (§ 3.4) y la tabla «qué salió de esta nota» en la ficha, con las piezas de video además de los posteos | Bajo (1 a 2 días) | Test con filas simuladas de `piezas` y `publicaciones` (salió, error, programado, sin datos) | Muy bajo: no escribe nada |
| **3. Plantillas del kit 3.0** | Que el reel de nota (`nota-propia`) use el kit nuevo (`reels-3-0`: HyperFrames, tapa para el feed, foto a pantalla completa, zócalo único) | **Alto** (3 a 5 días): hay que llevar el kit al render público (el repositorio de render) y comparar con la pieza actual; **primero hay que escribir el LEEME del kit** (falta) | Render de ensayo sin publicar y comparación de cuadros; el test de `previa-vino` y de piezas | Medio: toca el render; se hace detrás de un interruptor (`KIT_3_0=si`) |
| **4. Pedir una nota desde el panel** | Formulario con texto, enlace, fotos y audio; vista previa real; publicar | **Alto** (4 a 6 días) | Tests del flujo con transcripción simulada; el borrador nunca se ve en el sitio ni en `sitemap`; vista previa con `noindex` | Medio: es la única parte que **crea** contenido |
| **5. Ajustes e interruptores** | Estado de redes, cupo de voz, pausa y reintentar piezas con error | Medio (2 a 3 días) | Test de que cada cambio pide confirmación y queda registrado | Medio: los interruptores son delicados; se pasan de a uno |
| **6. Cloudflare Access como segunda puerta** | Entrar con el mail, sin depender del bot | Bajo en código (validar la cabecera firmada) pero lo hace una persona en Cloudflare | Test de firma válida / inválida / vencida / cabecera falsa | Medio: mal hecho abre o cierra todo; por eso va **segunda** |

**Mientras tanto**, lo que ya existe se puede usar hoy: `/ocultar`, `/mostrar`, `/redes <nota> reel`, `/repaso` y el panel completo. Y Claude puede hacer lo mismo por pedido (los mismos cambios en `notas.redes` y `notas.estado`), pero **sin** tocar `v3/redes/` ni `v3/nucleo/` sin avisar.

**Estado de la etapa 1 (19/11, hecho en el código, sin desplegar):** (a) botones Ocultar/Mostrar/Reel en cada fila: **hecho**; (b) ficha reordenada con desplegables: **hecho**; (c) pantalla `/panel/nota/<id>/reel` con redes, formato y 1 a 3 fotos, que guarda `notas.redes.destinos` y `fotos`: **hecho en el panel**, pero **el reloj de las redes todavía no los lee** (falta enseñarle a `accionesDe` y al armado del reel de nota, zona de `v3/redes/`); (d) aviso por Telegram de resultado: **NO hecho** (toca `v3/redes/`, hay que coordinarlo). Detalle y pruebas: `v3/sitio/REGLAS.md` § 13. Hay que desplegar sólo el sitio (no hay migración).

**Estado del 19/11 (segunda tanda, en el código, sin desplegar; detalle en `v3/sitio/REGLAS.md` § 13):** **etapa 2 hecha** (`/panel/redes` y las piezas de video en «¿Qué salió de esta nota?»); **etapa 5, sólo la lectura, hecha** (`/panel/ajustes`, «Estado»: sin interruptores, sin reintentar ni pausa: eso queda para después); **etapa 6 hecha en el código y apagada** (Cloudflare Access como segunda puerta, con roles dueño y editor: falta que una persona cree la aplicación en Cloudflare y complete `ACCESS_EQUIPO`, `ACCESS_AUD`, `ACCESS_MAILS` y `ACCESS_EDITORES`); **etapa 4 hecha en su versión sin IA** (`/panel/pedir`: borrador, vista previa, publicar, seguir editando, descartar, video de YouTube; **falta**: el texto por audio, la transcripción y la casilla «Pasarla por el criterio de Radar (IA)», que hoy sólo queda anotada como `ficha.pideCriterio`); la **sesión se renueva con el uso**. **Siguen pendientes:** etapa 1 (d) aviso por Telegram y que el reloj de las redes lea `destinos` y `fotos` (zona de `v3/redes/`), etapa 3 (kit 3.0) y de la etapa 5 los interruptores y «reintentar».

## 7. Video de YouTube en las notas (hecho)

**Decisión:** una nota puede llevar **un** video de YouTube **propio** (del canal de Radar o de Se hace), incrustado de forma liviana.

**Cómo funciona** (en `v3/sitio/vistas/nota.mjs`):
- El dato se guarda en `sitio_notas.extra` (el mismo lugar que `fotosEnCuerpo`): `{"video": {"youtube": "dQw4w9WgXcQ", "titulo": "Así quedó el club", "despuesDe": 1}}`. `despuesDe` es opcional (por defecto, después del primer párrafo; 0 = arriba).
- **Seguridad:** sólo se acepta el **ID de 11 caracteres** (`/^[A-Za-z0-9_-]{11}$/`). Una dirección completa, HTML u otro largo se **ignora** (la nota sale igual, sin video). El título del video se escapa.
- **Peso:** al cargar la página **no** se baja el reproductor: sólo una miniatura (`i.ytimg.com`, con carga diferida) y un botón de reproducir. **Sin cookies** y sin JavaScript de YouTube hasta que el lector toca.
- **Al tocar:** un script propio de unas pocas líneas cambia la miniatura por el reproductor `https://www.youtube-nocookie.com/embed/<id>`. **Sin JavaScript** el enlace funciona igual y abre el video en YouTube.
- **CSP** (`v3/sitio/sitio.mjs`, modo sólo informar): se sumó `frame-src https://www.youtube-nocookie.com` e `img-src https://i.ytimg.com`.
- **Datos estructurados:** se suma un `VideoObject` simple (nombre, miniatura, `embedUrl`, `uploadDate` = fecha de la nota).
- Una nota **sin** video no cambia ni un carácter.

**Falta (zona de otro agente, no se tocó): `v3/nucleo/notas-manuales/cargar.mjs`.** Hoy sólo escribe `extra` cuando hay `fotosEnCuerpo`. Para cargar un video desde el archivo JSON de una nota manual hay que cambiar 3 líneas (en `sqlDeNota`):

```js
// 1) antes del "if (Array.isArray(n.fotosEnCuerpo)..." armar el extra completo:
const extra = {};
if (Array.isArray(n.fotosEnCuerpo) && n.fotosEnCuerpo.length) extra.fotosEnCuerpo = n.fotosEnCuerpo;
if (n.video && /^[A-Za-z0-9_-]{11}$/.test(String(n.video.youtube ?? ''))) extra.video = { youtube: n.video.youtube, titulo: String(n.video.titulo ?? ''), ...(Number.isInteger(n.video.despuesDe) ? { despuesDe: n.video.despuesDe } : {}) };
// 2) cambiar la condición a "if (Object.keys(extra).length)" y en el JSON usar j(extra) en vez de j({ fotosEnCuerpo: n.fotosEnCuerpo })
```
Mientras tanto el campo se puede escribir en la base a mano (o desde el panel, en la etapa 1: una casilla «Video de YouTube» con el ID, que valida con la misma expresión).

## 8. Recomendación: reels propios del canal de YouTube dentro de las notas

**Qué se gana:**
- **Tiempo en la página** (lo que AdSense y Google miran): un video de 15 a 30 s que se ve entero suma bastante más que un párrafo.
- **Tráfico y vistas para el canal** (Radar y Se hace), que es donde Hernán quiere crecer; cada reproducción dentro de la nota cuenta como vista del canal.
- Sirve a la **nota de un solo tema** donde el video aporta algo que el texto no.

**Qué se arriesga:**
- **Peso y velocidad**: por eso la fachada liviana (no se baja nada hasta tocar). Con esto el costo es una miniatura de unos 15 KB.
- **Páginas finas**: una nota que es *sólo* un video y 2 líneas es contenido flaco para AdSense. El video **acompaña** a una nota con texto real (mínimo 70 palabras, la regla de siempre), no la reemplaza.
- **Repetir**: el mismo reel del clima en cien páginas diarias no suma valor, y empeora «contenido duplicado».
- Un video **que ya salió en redes** no es una novedad para quien ya lo vio: el valor está en el que **no** vio.

**En qué notas sí:**
- **Notas propias de Hernán** (entrevistas, lugares, eventos) con un video **hecho para esa nota** y del canal: sí, es lo que mejor funciona.
- **Se hace / sehace.com**: la nota de Tecnología que resume un video largo del canal, con ese video: sí (es contenido propio y relacionado).
- **Nota de efemérides** («Un día como hoy»): sí, y es la mejor candidata: el reel de las 9 de ese día, **una vez por día**, en una página que de por sí ya es del día.

**En cuáles no:**
- **Clima** (`clima-AAAA-MM-DD`): no. Ya es `noindex`, el reel dura 18 s y cambia dos veces por día; sumaría peso a una página que nadie busca por buscador.
- **Repasos**: sólo si se hace la **página diaria única** `/repaso/AAAA-MM-DD` (propuesta C.3 de `CONTENIDO-REDES-3-0.md`): ahí sí, los tres videos del día, `noindex`. **No** en cada nota que el repaso nombra.
- **Notas automáticas** (las del núcleo, de varias fuentes): no, salvo que exista un video propio **del hecho**; un reel genérico no aporta.
- **Policiales y cualquier cosa de la lista roja**: nunca.

**Regla práctica:** *un video por nota, propio, nuevo para quien lo ve, y siempre con un texto de verdad al lado.* Las pruebas ya impiden mostrar nada que no sea un ID de YouTube bien formado.


**Etapa 3 (kit 3.0), 19/11:** el kit está dentro del repositorio, en `v3/redes/kit3/` (adaptador `desde-pieza.mjs`, plantillas, ensayo y fondos), conectado a `piezas/correr.mjs` detrás del interruptor `KIT_3_0` (prendido el 19/11/2026 en `v3-piezas.yml`; sin él todo sale como antes y, si el kit falla, cae al dibujo de siempre). Los pasos ya están en el workflow de piezas; **falta** subir los 36 fondos del clima a R2. Ver `v3/redes/kit3/REGLAS.md`.
