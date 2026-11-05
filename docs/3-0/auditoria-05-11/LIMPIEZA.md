# Auditoría de limpieza del repositorio, 5/11/2026

*Hecha el 5/11/2026 en modo solo lectura: no se borró ni se cambió nada, salvo este informe. Para Hernán y Andrés. Dice qué sobra, qué se puede sacar ahora, qué se puede sacar recién cuando se apague el respaldo del sistema viejo y qué dudo. Ante la duda, el ítem va en C.*

## Cómo se verificó (para que se pueda repetir)

- **Imports:** un programa chico recorrió todos los archivos de `v3/` y siguió los `import` en cadena (también los `import()` dinámicos) para saber qué archivos de afuera de `v3/` se usan de verdad. Resultado: **47 archivos** del sistema viejo (lista en la sección B).
- **Workflows:** para cada uno de los 58 se buscó su nombre en el código (`infra/`, `redes/`, `panel/`, `web/`, `ingesta/`, `reels/`, `v3/`, `scripts/`), en las pruebas (`pruebas/`) y se miró si tiene `schedule` (horario propio de GitHub).
- **Fechas:** `git log -1 --format=%cs -- <ruta>` (último cambio). Desde el 30/10 el código viejo no se tocó: lo único que cambia del lado viejo son los datos de `web/data/` (el motor viejo sigue escribiendo "Datos de la portada" cada 30 minutos; el último commit de esos es de hoy, 16:05).
- **Tamaños:** lo que está en git, con `git ls-tree -l`; lo que no está en git (carpetas ignoradas), con `du`.
- **Limitación:** las referencias que hacen el sitio viejo (Next.js) con atajos como `@/lib/…` no las detecta un buscador de imports simple. Por eso **no propongo borrar nada de `web/lib/` ni `web/components/` ni `web/app/` en A**: todo eso va en B.

## Lo más importante antes de borrar nada

1. **El 3.0 todavía usa el viejo de cuatro maneras** (detalle en B): importa 47 archivos viejos para dibujar y publicar las redes; el video que lee Buffer lo sirve el Worker viejo `radar-balcarce-tareas`; el workflow de redes 3.0 lee tres archivos de `web/data/` (efemérides, feriados) que arma el motor viejo; y el sitio nuevo le pide al sitio viejo (`RESPALDO_VIEJO = "si"`) las fotos y archivos fijos que R2 no tenga.
2. **Dos cosas del viejo arrastran todo el motor viejo adentro del 3.0** sólo por una pieza chica cada una: `redes/participa.mjs` (los textos de «Participá», que importa `redes/guiones.mjs`, que importa `ingesta/verificar.mjs` y `ingesta/fuentes.mjs`) e `ingesta/alertas.mjs` (que importa `ingesta/ingesta.mjs`, 130 KB). Si esas dos piezas se copian a `v3/redes/`, desaparece buena parte de la atadura.
3. **Nadie hace copia de seguridad de la base D1 `radar-nucleo`**, que es donde vive todo el 3.0 (notas, fotos, piezas). El workflow «Respaldo» de los domingos sólo copia el repositorio. Mientras el viejo siga, el repo guarda las 500 notas viejas; cuando se apague, no queda nada fuera de D1. Conviene resolverlo antes del apagado general (ver C13).
4. **La frase «Nada importa nada de afuera de `v3/`»** de `v3/LEEME.md` hoy es falsa (47 archivos). Hay que corregir la frase o mudar esos archivos.
5. **Hay dos sistemas de vigilancia e informes corriendo a la vez** (el viejo, con mail a las 8:15 y 21:15 más el resumen de las 22, y el 3.0 por Telegram a las 8 y a las 20). Se duplican avisos.

---

## A. Se puede borrar ya, sin riesgo

*Criterio: no lo llama ningún código ni ninguna prueba, no corre solo, y su tema ya terminó o lo reemplazó algo; o es basura local que no está en git.*

### A1. Basura local (no está en git; sólo en la PC de Hernán)

| Ruta | Tamaño | Por qué sobra | Cómo se verificó |
|---|---|---|---|
| `panel/datos/` | 4,6 MB | Restos del panel de la PC, retirado el 17/10. Tiene `CLAVES-INICIALES.txt`, `secreto.txt`, `usuarios.json` (contraseñas con hash) y la dirección del túnel. El propio `.gitignore` dice «borrarlo a mano en esa PC». **Es lo más delicado de la lista: borrarlo primero.** | Ignorado por git (`git status --ignored`); nada del código vigente lee `panel/datos/` (el panel de la PC se retiró) |
| `respaldos/` | 14 MB | Copias del panel de la PC del 24 al 28/9, ignoradas; el `.gitignore` aclara que tienen contraseñas con hash y datos del buzón | Ignorado por git; 0 archivos versionados; ningún programa lo lee |
| `.cache/tarjetas/` y los `.cache/informe-del-dia-*.json` | ~360 MB | Cachés del motor viejo y de informes de mediciones de octubre; se regeneran solas | Ignorado por git; son cachés |
| `reels/salida/` | 71 MB | Videos y placas de prueba (el último, 1/11) | Ignorado; carpeta de salida |
| `docs/propuestas/redes-3-0/videos/` | 55 MB | Videos de ejemplo de las maquetas; se regeneran con `v3/redes/piezas/ejemplos.mjs` | Ignorado por git |
| `v3/sitio/scripts/salida/` | 9 MB | SQL de la migración del archivo (`archivo-001…014.sql`) y de la nota del media kit; los vuelve a generar `migrar.mjs` y el workflow de despliegue | Ignorado; `migrar.mjs` los rehace |
| `web/.next/` | 54 MB | Compilación del sitio viejo, local | Ignorado |
| `ingesta/salida/`, `comercial/salida/`, `comercial/datos/osm-crudo.json`, `infra/render-publico/reels/salida/`, `v3/nucleo/scripts/salida/`, `reels/a-mano/publicidad-radar.mp4` | menos de 4 MB en total | Salidas regenerables | Ignoradas |
| `.git/objects/pack/tmp_pack_*` (26 archivos) y `tmp_obj_*` | a medir | `git count-objects` avisa «garbage found»: restos de empaquetados cortados. Se limpian con `git gc --prune=now` (lo corre una persona; no lo hice). El paquete pesa 636 MB | Aviso de `git count-objects -vH` |

### A2. Workflows de GitHub que ya cumplieron su trabajo (sólo a mano, sin horario, sin código ni pruebas que los nombren)

Todos son `workflow_dispatch` (sólo a mano). Se borra el archivo `.github/workflows/<nombre>.yml` (~1 a 3 KB cada uno). Hay que sacar también la mención en los documentos que los nombran (marcado abajo).

| Workflow | Por qué sobra | Cómo se verificó |
|---|---|---|
| `probar-mail.yml` | Probó el 15/10 que llegan los avisos por mail. Los avisos del 3.0 son por Telegram | 0 referencias en código y pruebas; último cambio 15/10; se nombra en 3 documentos |
| `ver-facebook.yml` | Miraba a mano la página de Facebook (8/10) | 0 referencias; último cambio 8/10; 4 documentos lo nombran |
| `reparar-estadisticas.yml` | Arreglo único de días en cero de `estadisticas.json` (15/10) | 0 referencias; 15/10; 4 documentos |
| `probar-imagenes.yml` | Comparaba dos modelos de imágenes (22/10) | 0 referencias en código, pruebas y documentos; 22/10 |
| `probar-ilustraciones.yml` | Rehacía ilustraciones de prueba (27/10) | 0 referencias en todo; 27/10 |
| `imagenes-sueltas.yml` | Generó una vez imágenes con el Worker de imágenes (30/10) | 0 referencias en todo; 30/10 |
| `sitio-de-prueba.yml` | Subía una vista previa `prueba.radar-balcarce.pages.dev` del sitio viejo (25/10). El sitio de verdad ya es el 3.0 | 0 referencias en todo; 25/10 |
| `motor-ensayo.yml` y `ensayo-nube.yml` | Ensayos de la mudanza a Cloudflare del 22/10 (despertar una vuelta del motor, correr tareas en simulacro) | 0 referencias en todo; 22/10 |

### A3. Archivos sueltos y documentos vencidos

| Ruta | Tamaño | Por qué sobra | Cómo se verificó |
|---|---|---|---|
| `docs/CHECKLIST-JUEVES-29-10.md` | 8 KB | Era para el jueves 29/10, ya pasó. `PENDIENTES.md` (línea 175) ya decía que el 30/10 y el 1/11 había que pasarlo a `docs/historico/` | Fecha vencida; mover con `git mv` a `docs/historico/` |
| `docs/efemerides-octubre-para-revisar.md` | 20 KB | Efemérides de octubre, mes terminado. Mismo aviso de `PENDIENTES.md` línea 175 | Último cambio 8/10; vencido |
| `infra/sitio-por-worker/` (+ `pruebas/sitio-por-worker.test.mjs` y `pruebas/comparar-sitios.test.mjs`, 20 KB las dos; y `docs/proyecto/SITIO-POR-WORKER-PLAN.md`) | 58 KB + 20 KB | Era la idea de armar las páginas del sitio viejo con un Worker. Lo resolvió el 3.0 de otra forma (`v3/sitio/`), sin tocar este código. Nunca se subió: no hay workflow ni Worker que lo despliegue | `grep` del nombre: sólo lo nombran sus dos pruebas y dos documentos; último cambio 24/10 |
| `v3/sitio/scripts/capturas-media-kit/` | 4,6 MB (12 archivos) | Capturas del sitio sacadas el 3/11 para el media kit; se regeneran con `capturas-media-kit.mjs`. **Sólo si ya no se va a rehacer el media kit de noviembre** (si se rehace, `imagenes-media-kit.mjs` las usa; ver C4) | Sólo las usa `imagenes-media-kit.mjs` |

*Nota: el resto de lo que «parece muerto» (`reels/catalogo-plantillas.mjs`, `reels/guion-del-dia.mjs`, `reels/promo.mjs`, `ingesta/fecha-del-hecho.mjs`, `web/scripts/auditar-seo-vivo.mjs`, varios `scripts/medir/*`) no tiene importador, pero se corre a mano o lo cita un documento, o lo cuida una prueba: va en B o C, no acá.*

---

## B. Se puede borrar cuando se apague el respaldo del sistema viejo

*Condición: `RESPALDO_VIEJO = "no"` en `v3/sitio/wrangler.toml` **y** las redes 3.0 sin depender de los archivos de abajo **y** un respaldo de D1.*

### B1. Qué usa hoy el 3.0 del viejo (hay que mudarlo antes de borrar)

| Dependencia | Dónde se ve | Qué hay que hacer antes de borrar |
|---|---|---|
| **47 archivos importados por las redes 3.0** | Cadena de imports desde `v3/redes/` y `v3/redes/piezas/` (ver lista abajo) | Copiarlos a `v3/redes/` (o a una carpeta compartida de `v3/`) y actualizar los `import` y las pruebas |
| **Worker viejo `radar-balcarce-tareas`, ruta `/video/<huella>/<nombre>`** | `v3/redes/piezas/correr.mjs` (línea 343); `v3/redes/REGLAS.md` §10 lo dice: «ese Worker tiene que seguir en pie». Código: `infra/tareas-cloudflare/worker.mjs` (línea 50) | Sirve el mp4 que Buffer lee para TikTok, YouTube y X. Hay que hacer esa ruta de video en un Worker 3.0 (por ejemplo `radar-redes`) antes de apagar tareas. **Es la atadura más fácil de olvidar** |
| **`web/data/efemerides-piezas.json`, `feriados-piezas.json`, `efemerides-elegidas.json`** | `v3/redes/piezas/correr.mjs` (líneas 292 y 295) los lee del repo en el workflow `v3-piezas.yml`. Los arma el motor viejo (`ingesta/generar-efemerides.mjs`, corrida mensual del 20) | O se mantiene el motor viejo sólo para eso, o el 3.0 aprende a generarlos |
| **`web/public/` (panel, escudos, compartir, íconos, fuentes)** | `v3-desplegar.yml` los sube a R2 (`radar-fotos/estaticos/…`); `v3/sitio/scripts/imagenes-media-kit.mjs` lee las fuentes tipográficas y `icon-512.png` | Dejar `web/public/` hasta que se decida la suerte del panel viejo (C1) |
| **`web/data/archivo.json`, `web/data/historico/` (12 MB) y `web/public/_redirects`** | `v3/sitio/scripts/migrar.mjs`, `migrar-archivo.mjs`, `generar-redirecciones.mjs` (la migración de las notas viejas; es repetible) | Una vez confirmada la migración final, guardar una copia fuera del repo y recién ahí borrar. `redirecciones-viejas.mjs` (36 KB) ya está generado y **se queda** |
| **`RESPALDO_VIEJO` / `ORIGEN_VIEJO` → `radar-balcarce.pages.dev`** | `v3/sitio/sitio.mjs`: `origenViejo()` (línea 82) y tres lugares donde se pide al viejo (líneas 382, 392, 393 y 401): (1) fotos `/fotos-notas/` y `/fuentes/` que R2 no tenga; (2) archivos fijos (`/panel/`, escudos, videos de compartir, íconos) que R2 no tenga; (3) cualquier ruta que `esRutaPropia()` no reconozca; (4) lo que `armar()` marque para probar en el viejo | Antes de poner «no»: correr la copia de fotos (`v3-fotos-propias.yml` y `copiar-fotos.mjs`) hasta que no falte ninguna, subir los estáticos (`v3-desplegar` opción `sitio`), y mirar los 404 de una semana. El inventario ya lo cuida `v3/sitio/cierre.test.mjs` |
| **`v3/nucleo/fuentes.exportadas.json`** | Es una foto del 1/11 de `ingesta/fuentes.mjs`; `generar-fuentes.mjs` regenera `fuentes.json` desde ahí | No depende del viejo en producción; queda como semilla histórica. Al borrar `ingesta/fuentes.mjs` se queda sin origen (está bien) |
| **`v3/nucleo/scripts/comparar.mjs`** | Importa `web/lib/ruta.js` (sólo ese script, no producción) | Sacar la importación o el script |
| **Raíz `package.json` / `package-lock.json` / `node_modules`** | `v3-piezas.yml` y `v3-fotos-propias.yml` hacen `npm ci` en la raíz (para `@resvg/resvg-js` y `ffmpeg-static`) | **No se borran**; sólo se podan cuando el `package.json` pase a `v3/` |

**Los 47 archivos viejos que importa el 3.0 en producción** (no tocar hasta mudarlos):
`infra/compartido/r2-s3.mjs`; `ingesta/` → `alertas, articulo, criterio, cruce, exenciones, fuentes-cruce, fuentes, futbol-argentino, hecho-principal, ingesta, menores, muy-contada, no-es-nota, policial-nacional, popularidad, repetidas-publicadas, secciones-nuevas, utiles, verificar, zona`; `redes/` → `buffer, guiones, meta, participa, piezas-del-dia, prompt-redes`; `reels/` → `alinear, animacion, claves, cupo-voz, duracion, placa, reel, tiempos, voz-gemini, voz` y `reels/escenas/` → `clima, comun, del-plan, fechas, registro, repaso, servicios`; `web/lib/` → `tarjeta-diseno, texto, titulos`. (Más `web/lib/ruta.js` sólo desde un script.) Además, `reels/marca/fuentes/` y `reels/placa.mjs` necesitan sus tipografías.

### B2. Qué se puede borrar al apagar el viejo (con cuándo y por qué)

| Qué | Tamaño aprox. | Por qué es del viejo | Cómo se verificó |
|---|---|---|---|
| **`web/`** (Next.js: `app/`, `components/`, `lib/` salvo lo mudado, `scripts/`) | 1,1 MB código | El sitio viejo, que sólo sirve de respaldo | Último cambio 30/10; `radarbalcarce.com` lo sirve `v3/sitio`; sólo lo toca `RESPALDO_VIEJO` |
| **`web/data/`** (los ~49 JSON; excepto lo de B1) | 22 MB | Datos del motor viejo (portada, banco de fotos 3,6 MB, archivo 2,4 MB, correcciones, retiradas, uso de IA, etc.). Ninguno es leído por `v3/` salvo los de B1 | `grep` de cada nombre en `v3/`: 0 referencias salvo `archivo`, `historico`, `agenda*`, `efemerides*`, `feriados*`, `estadisticas`, `f1`, `futbol` (los de agenda/F1/fútbol aparecen sólo en comentarios y pruebas: confirmar uno por uno) |
| **`web/public/fotos-notas/`** | 94 MB (1.365 archivos) | Fotos de las notas del sistema viejo. El 3.0 hace su copia propia en R2 | Sólo se necesitan hasta que `v3-fotos-propias` y `copiar-fotos.mjs` terminen de copiar todo |
| **`web/public/compartir/`** | 9,7 MB (2 mp4) | Videos de «compartir». El 3.0 los sirve desde R2 | Los sube `v3-desplegar` (opción sitio): mudarlos a otra carpeta antes |
| **`ingesta/`** (el motor viejo), salvo los archivos de B1 | ~1 MB | Lo reemplazó `v3/nucleo` | Última modificación 30/10; el 3.0 sólo usa 20 archivos suyos |
| **`panel/`** y **`web/public/panel/`** | 0,1 MB + 0,45 MB | El panel del celular. Lo reemplazan el bot de Telegram y la futura `/admin` | **Decide Hernán** (C1) |
| **`redes/`** salvo 6 archivos de B1 | 0,6 MB | Redes viejas (apagadas desde el 3/11 con `REDES_ACTIVAS_NUBE = No`) | Último commit de «libro de publicaciones»: 3/11 |
| **`reels/`** salvo lo de B1 (incluye `reels/a-mano/`, `reels/fijas/`) | 9,4 MB | Reels del sistema viejo; `fijas` y `a-mano` sólo los usan `fijar-piezas.yml` y `reel-a-mano.yml`/`publicar-a-mano.yml` | `grep`: `v3/` no usa `reels/fijas` ni `reels/a-mano` (sólo menciona `reels/publicidad.mjs` en un comentario) |
| **`infra/`**: `reloj-cloudflare`, `tareas-cloudflare` (después de mover la ruta `/video/`), `motor-cloudflare`, `vigilante-cloudflare`, `archivo-cloudflare`, `imagenes-cloudflare`, `render-publico`, `compartido` (salvo `r2-s3.mjs`) | 2,2 MB | Los Workers del sistema viejo | Cada uno tiene su `wrangler.toml` con otro nombre (`radar-balcarce-*`); sólo `tareas` lo usa el 3.0 |
| **`pruebas/`** (276 archivos, 4 MB) | 4 MB | Las ~3.000 pruebas del viejo. Hoy `pruebas.yml` corre sólo esto en cada subida; el 3.0 no tiene un workflow que corra sus pruebas en cada push (sólo `v3-desplegar.yml`, a mano) | Ver C12 |
| **`scripts/medir/`, `scripts/sincronizar-render-publico.mjs`, `scripts/migrar-fotos-a-r2.mjs`, `scripts/media-kit.mjs`** | ~500 KB | Mediciones y utilidades del viejo (`media-kit.mjs` se usa para el media kit: ver C4) | Sin importadores salvo documentos; algunos se corren a mano |
| **Raíz**: `FUENTES.md` (44 KB), `CRITERIO-EDITORIAL.md`, `CRITERIO-REDES.md`, `FORMATOS.md`, `PERFILES.md`, `INVESTIGACION.md` | ~200 KB | Documentos del sistema viejo. **Ojo:** `CRITERIO-EDITORIAL.md` y `CRITERIO-REDES.md` pueden seguir siendo el criterio de la IA del 3.0: `v3/nucleo/REGLAS.md`/`PERFIL.md` dicen cuál manda | Decidir antes cuál es el criterio vigente (C6) |
| **Workflows viejos** (los 52 de la tabla de más abajo) | ~250 KB | Todos para el sistema viejo (52 de los 58) | Ver tabla de workflows |

### B3. Orden sugerido de apagado (de menos a más riesgo)

1. Prender `RESPALDO_VIEJO = "no"` **después** de copiar todas las fotos y los estáticos (mirar una semana de 404).
2. Apagar el informe diario por mail viejo y la vigilancia vieja (duplican a la 3.0).
3. Mover la ruta `/video/` y los 47 archivos; apagar el reloj, el motor y las tareas viejas (con el motor viejo se ahorran los minutos de Workers Builds y de GitHub Actions).
4. Respaldar D1 y las notas viejas; recién ahí borrar `web/`, `ingesta/`, `redes/`, `reels/` (lo no mudado), `pruebas/` y `infra/` viejos.

---

## C. Dudoso: decide Hernán

| # | Ruta | Por qué lo dudo | Qué verifiqué |
|---|---|---|---|
| C1 | `panel/` y `web/public/panel/` (panel del celular viejo) y el workflow `panel.yml` | Hoy se sigue sirviendo en `/panel/` desde R2 y escribe con la llave de GitHub. El bot de Telegram hace «retirar», «corregir», «últimas» y «pendientes», pero no está claro si cubre las pestañas Fotos, Fechas, Contactos, Pistas, Números y Revisión | `docs/3-0/UN-DIA-DEL-SITIO.md` §8 dice que sigue «hasta que se apague el viejo»; la futura `/admin` no existe (`v3/panel/` no está) |
| C2 | `comercial/` (672 KB en disco, 0,4 MB en git; guía de comercios) y `motor/` (28 KB; cimientos de una base D1) | `CLAUDE.md` los marca como «dormidos: los despierta o los borra el dueño». Probablemente los reemplazó `v3/nucleo/db` (el 3.0 ya usa D1) y el media kit, pero la base comercial podría servir para vender avisos | Sólo los nombran pruebas (`comercial.test.mjs`, `propuestas.test.mjs`, `motor-espejo.test.mjs`) y documentos; última modificación 27/9 y 25/10 |
| C3 | `infra/enlaces-cloudflare/` (acortador `radarbalcarce.com/r/*`, apagado) | Las redes 3.0 no lo usan, pero queda el interruptor `ENLACES_CORTOS` en el viejo. Podría servir para X sin enlace largo | Último cambio de la 3.0 que lo nombra: ninguno; 0 referencias en `v3/` |
| C4 | `docs/propuestas/MEDIA-KIT-2026-11.html` (1,5 MB) y `.pdf` (1,4 MB), `docs/propuestas/media-kit/`, `anunciantes/`, `scripts/media-kit.mjs`, `v3/sitio/media-kit/` (1,5 MB), `v3/sitio/scripts/{capturas,imagenes,nota}-media-kit.mjs` | Es el material para vender publicidad; vigente (3/11). Son archivos pesados en git. Si hay un primer aviso real conviene guardarlos | Último cambio 3/11; `v3-desplegar.yml` sube las imágenes |
| C5 | `docs/propuestas/tapa-3-0/` (15 MB): las maquetas B «Tarjetas» y C «Revista» (`b-*`, `c-*`, `sitio-a-*`, `sitio-en-vivo-*`) | Hernán eligió la A «Diario» y el código cita `a-diario.html`. B y C ya no sirven, pero son diseños descartados que algún día se querrán ver | `v3/sitio/vistas/{base,portada}.mjs` citan sólo `a-diario.html`; `docs/propuestas/redes-3-0/` (24 MB) lo mismo: maquetas ya aplicadas |
| C6 | `CRITERIO-EDITORIAL.md` (92 KB) y `CRITERIO-REDES.md` (36 KB), `docs/CRITERIO-EN-UNA-PAGINA.md` | Son «el criterio» del sistema viejo; `v3/nucleo/PERFIL.md` y `REGLAS.md` ya tienen el del 3.0. Hay que decidir cuál es el vigente para no tener dos | `v3/nucleo/REGLAS.md` cita `docs/propuestas/PLAN-RADAR-3-0.md`, no esos archivos |
| C7 | `scripts/claude-con-openrouter.cmd`, `usar-claude.cmd`, `usar-deepseek.cmd`, `deepseek.mjs` | Son herramientas personales de Hernán para seguir trabajando si se acaba el cupo de Claude; OpenRouter se retiró **de producción** el 26/10, pero el script lo sigue usando de forma personal | Último cambio 17/10; los nombran `DECISIONES.md`, `TRASPASO.md`, `11-OPERACION.md` |
| C8 | `docs/propuestas/MAPA-Y-CRONOGRAMA-25-10.html` (43 KB) | **No está en git** (archivo suelto de la carpeta, tocado el 3/11): si se borra no se recupera. Parece un mapa/cronograma de la 2.0 | Aparece como `??` en `git status`; ningún documento lo nombra |
| C9 | `docs/propuestas/` (47 MB tracked): `MAPA-RADAR-3-0-01-11.html`, `RADAR-3-0-RESUMEN.html`, `MUESTRA-NOTAS-3-0.html`, `COMO-FUNCIONA-LA-IA.html` (121 KB), `LIMPIEZA-DE-DOCUMENTOS-25-10.md` (45 KB), `SIMPLIFICAR-PRUEBAS.md`, `PASOS-PARA-USTEDES.md`, `THREADS-X-BUFFER-30-10.md`, `COMPARATIVA-MODELOS-30-10.md`, `DISENOS-A-ARMAR.md`, `EN-LOS-MEDIOS-DE-BALCARCE.md` | Mezcla de propuestas viejas de la 2.0 (la carpeta se declaraba «abierta» el 25/10) y de la 3.0. Muchas ya se decidieron (el `LEEME.md` de la carpeta, de 25/10, no menciona nada de la 3.0) y deberían ir a `docs/historico/` | Última modificación: entre el 15/10 y el 3/11; `LEEME.md` de la carpeta desactualizado |
| C10 | `docs/COMO-FUNCIONA-HOY.html` (72 KB, 23/10), `docs/REGLAS-Y-PROMPTS.html` (212 KB, 24/10, generado por `scripts/medir/armar-reglas-html.mjs`), `docs/diseno/`, `docs/secciones/`, `docs/panel/`, `docs/criterio/`, `docs/flujos/INFORME-DE-HOY.html`, `docs/etapa-1-fuentes/` (1 MB) | Fotos del sistema viejo y prototipos de diseño viejos; probablemente deberían pasar a `docs/historico/`. No los borré de la lista A porque la historia del criterio se lee ahí | Último cambio entre el 24 y el 27/10; 0 enlaces desde la 3.0 |
| C11 | Los otros workflows de «diagnóstico» que pueden servir al 3.0: `diagnostico-instagram.yml` (usa `META_TOKEN`; sirve también para Instagram 3.0), `buffer.yml` («probar» lista canales; `PENDIENTES-3-0.md` pide correr `redes/buffer.mjs --probar`), `probar-gemini.yml`, `claves-huella.yml`, `compactar-historial.yml` | Son diagnósticos sin horario que no dispara nadie; probablemente útiles para la 3.0 | 0 referencias en código; último cambio 22/10, 25/10, 30/10, 2/11, 23/10 |
| C12 | `.github/workflows/pruebas.yml` y `pruebas-otra-hora.yml` | Corren las 3.000 pruebas del viejo en cada push y los lunes, y **no corren las pruebas de `v3/`** (sólo `v3-desplegar.yml`, a mano, ejecuta `node --test "v3/**/*.test.mjs"`). Conviene un workflow de pruebas para la 3.0 antes de apagar el del viejo | `pruebas.yml` ejecuta `npm test` (que es `pruebas/*.test.mjs`) |
| C13 | Respaldo: `respaldo.yml`, `probar-restauracion.yml`, `compactar-historial.yml` | Siguen siendo el único respaldo, pero no copian la base D1 `radar-nucleo` | Ningún workflow ni Worker tiene `d1 export` |
| C14 | `web/data/` — `celular-borradores.json` (177 KB), `celular-decisiones.json`, `celular-llaves.json`, `contactos-celular.json`, `notas-de-pistas.json`, `pistas.json`, `fotos-manuales.json`, `notas-de-redaccion.json`, `correcciones.json` | Son las decisiones que escribió una persona con el panel viejo (retiradas, correcciones, notas propias de redacción). Pueden tener valor de historia; **no se borran sin mirar si el 3.0 ya las migró** | `v3/` no las referencia; faltaría confirmar que la migración las incluyó |
| C15 | `docs/etapa-10-operacion/pruebas-clasificadas.csv`, `pruebas-nucleo.txt`, `docs/redes/previews/utiles-24-10/`, `docs/proyecto/panel-prototipo/`, `docs/proyecto/PANEL-REDISENO.md`, `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md` | Documentos de proyecto del viejo; algunos pueden ser la base de lo que se haga en la `/admin` o del cronograma de redes de la 3.0 | Sin verificar a fondo |

---

## Los workflows de `.github/workflows` (58)

**Solo 8 de los 58 tienen horario propio de GitHub: 2 del 3.0** (`v3-fotos-propias` y `v3-piezas`, cada hora) **y 6 del viejo** (`armado-vacio`, `auditoria`, `informe-diario`, `pruebas-otra-hora`, `pruebas`, `respaldo`). El núcleo, el sitio, la vigilancia y el bot del 3.0 corren con el horario de sus Workers (`v3/*/wrangler.toml`), no con GitHub.

| Grupo | Workflows | Qué hacen / quién los dispara | Destino |
|---|---|---|---|
| **3.0 (6)** | `v3-corte`, `v3-desplegar`, `v3-fotos-propias`, `v3-nucleo`, `v3-piezas`, `v3-telegram` | `v3-piezas` y `v3-fotos-propias` con horario; los otros a mano. `v3-nucleo` sólo calibra el agrupado (el núcleo corre en Worker). `v3-corte` es el botón de volver atrás (`sacar`) | Se quedan |
| **Viejos que dispara el reloj o el motor viejo (corren mientras el viejo corra) (11)** | `actualizar` (rescate), `informe-diario` (además con horario de GitHub 11:45 y 00:45 UTC: **duplica** el informe de la 3.0), `vigilancia`, `pistas`, `auditoria-ia`, `ilustrar-notas`, `revisar-archivo`, `redes`, `redes-piezas`, `piezas`, `reintentar` | Los llama `infra/reloj-cloudflare`, `infra/tareas-cloudflare` o el vigilante viejo. Las cuatro de redes están apagadas desde el 3/11 (`REDES_ACTIVAS_NUBE = No`) | B, al apagar el reloj. Las de redes se pueden retirar antes si Hernán confirma que no vuelve atrás |
| **Viejos con horario de GitHub (5, más `informe-diario` de arriba)** | `armado-vacio` (push y lunes), `auditoria` (lunes 9:00 audita lo publicado con el criterio viejo), `pruebas-otra-hora` (lunes), `pruebas` (push, PR y lunes) y `respaldo` (domingos) | Corren solos; `auditoria` puede dar falsas alarmas porque `radarbalcarce.com` ya es otro sitio | B (C12 y C13 para pruebas y respaldo) |
| **Mantenimiento de infraestructura del viejo (11)** | `desplegar-nube`, `reloj-cloudflare`, `vigilante-cloudflare`, `cloudflare-deploy`, `archivo-produccion`, `archivo-staging`, `imagenes-cloudflare`, `motor-variables`, `motor-estado`, `reloj-estado`, `fotos-a-r2` | A mano, para subir o mirar los Workers y el sitio viejos | B |
| **A mano, redes viejas (3)** | `publicar-a-mano`, `reel-a-mano`, `fijar-piezas` | Reemplazados por «repetir una nota a mano» del 3.0 | B |
| **A mano, diagnósticos sin dueño (5)** | `diagnostico-instagram`, `buffer`, `probar-gemini`, `claves-huella`, `compactar-historial` | Ver C11 | C |
| **A mano, de una sola vez (A2)** | `probar-mail`, `ver-facebook`, `reparar-estadisticas`, `probar-imagenes`, `probar-ilustraciones`, `imagenes-sueltas`, `sitio-de-prueba`, `motor-ensayo`, `ensayo-nube` | Ver A2 | A |
| **Otros del viejo** | `auditar-voz`, `crear-voces` (las voces propias vencen el 29/09/2027: se usan para las voces de 3.0; **no borrar sin avisar**), `generar-fondos-clima`, `probar-restauracion` | A mano | C (`crear-voces` y `auditar-voz` se quedan hasta que las voces se pasen a la 3.0; los otros, B) |

Por suerte, **ningún workflow viejo dispara nada del 3.0 ni al revés**: los `v3-*` sólo corren archivos de `v3/` (más los 47 archivos importados). El único cruce es que `v3-desplegar.yml` sube a R2 los archivos de `web/public/`.

---

## Documentos desactualizados

### `PENDIENTES.md` (28 KB, 182 líneas, «25/10/2026»)
- **No menciona la 3.0 ni una vez** (`grep` de «3.0» y «v3/»: 0). La lista viva de la 3.0 es `docs/3-0/PENDIENTES-3-0.md` (3/11, ampliada el 5/11).
- La sección 1 dice que «todo corre en Cloudflare» (motor, tareas, reloj) como estado final: hoy es el respaldo.
- Fechas vencidas: línea 174 (decidir sitio por Worker el 29/10) y 175 (pasar documentos a histórico el 30/10 y el 1/11).
- C22 (ordenar el correo con avisos de mail resumidos) y C23 (TikTok y YouTube por Buffer a prueba desde el 25/10) ya los absorbió la 3.0 (avisos por Telegram; TikTok y YouTube salen por Buffer desde el 5/11).
- La tabla de variables apagadas (`FOTOS_EN_R2`, `ENLACES_CORTOS`, `NOTAS_CON_DATOS`, `FOTOS_MENORES_OFICIALES`…) es del viejo; en el 3.0 las fotos propias ya están en R2 y las copias las hace `v3-fotos-propias.yml`.
- **Recomendación:** pasarlo a `docs/historico/` (como ya se hizo con la lista de 24/10) y dejar `docs/3-0/PENDIENTES-3-0.md` como única lista. Mientras el viejo siga, dejar sólo una línea que remita a ella.

### `IDEAS.md` (100 KB, 1.030 líneas, «15/10/2026»)
- Es del 15/10 (más «ideas del 8/10»). No menciona la 3.0. Muchas ideas ya se hicieron en la 3.0 (carruseles, tapa, botones de compartir, bot de Telegram, vigilancia por Telegram, TikTok/YouTube/X por Buffer, firma corta) y otras las anotó la auditoría del 5/11 (`docs/3-0/LISTA-DE-MEJORAS-05-11.md`).
- **Recomendación:** partirlo: mover a `docs/historico/` lo que ya se hizo y dejar un banco corto de ideas vigentes; o anotarle arriba «banco de la 2.0; la lista de la 3.0 es `docs/3-0/LISTA-DE-MEJORAS-05-11.md`».

### `docs/3-0/` (hay que corregirlos, son de hoy o de hace dos días)
- **`LEEME.md`, `REDES.md` y `UN-DIA-DEL-SITIO.md` (3/11, 13:09) quedaron viejos desde las 13:33 del mismo día**: dicen que las redes 3.0 están «en ensayo» y que el viejo es el que publica; pero el commit `3a3ea116` («Redes 3.0 en real: REDES_ACTIVAS = si; las redes del sistema viejo se apagaron con REDES_ACTIVAS_NUBE = No») cambió eso. `v3/redes/wrangler.toml` hoy dice `REDES_ACTIVAS = "si"`, `POSTEOS_ACTIVOS = "si"`. Además dicen que TikTok, YouTube y X «todavía no tienen módulo»: desde el 5/11 salen por Buffer (`PENDIENTES-3-0.md`, punto 7).
- Tres listas parecidas: `PENDIENTES-3-0.md`, `RESUMEN-Y-PENDIENTES-05-11.md` y `LISTA-DE-MEJORAS-05-11.md`. Dejar una como principal (la de mejoras, que es más reciente) y que las otras apunten a ella.
- `v3/LEEME.md` lista `v3/panel/` (no existe) y la frase «Nada importa nada de afuera de `v3/`» ya no es cierta.

### `docs/00-INDICE.md`, `docs/DECISIONES.md`, `docs/TRASPASO.md`, `docs/08-INFRAESTRUCTURA.md`
- 0 menciones de la 3.0 en los cuatro (último cambio 25/10 a 2/11; `DECISIONES.md`, el 27/10). Las decisiones de la 3.0 están sólo en `docs/propuestas/PLAN-RADAR-3-0.md` sección 10. Falta una entrada en cada uno que remita a `docs/3-0/LEEME.md`.
- `docs/propuestas/LEEME.md` (25/10) declara «abierto» todo lo que hay en la carpeta.

### Lo que hay que corregir en `CLAUDE.md` (sólo anotar, no se tocó)
1. **No dice una palabra de Radar 3.0** (`v3/`, Workers `radar-nucleo`, `radar-sitio`, `radar-redes`, `radar-vigilancia`, `radar-telegram`; D1 `radar-nucleo`; R2 `radar-fotos` y `radar-render`; workflows `v3-*`). Tiene que decir que **el 3.0 es el sistema vigente** y el viejo (el resto de las carpetas) es el respaldo, con el árbol de `v3/` en «Cómo está armado».
2. Encabezado y sección «Estado (25/10/2026)»: reescribir con el estado de hoy (corte del 3/11, redes 3.0 en real, `RESPALDO_VIEJO = "si"`).
3. «Cada media hora lee unos 125 feeds de unos 75 medios»: el 3.0 es **cada 15 minutos**, 105 fuentes (81 activas) según `v3/nucleo/REGLAS.md`; el motor viejo (30 min) sigue como respaldo.
4. «Flujo… Cloudflare Pages, todo en “Actualizar la web”» y «La web, las redes, la vigilancia y el panel del celular andan con la PC apagada»: el sitio ya lo sirve un Worker con D1, no Pages.
5. «Las redes están prendidas en la nube (`REDES_ACTIVAS_NUBE` = Sí al 22/10)» y la regla del interruptor de redes: hoy mandan `REDES_ACTIVAS = "si"` en `v3/redes/wrangler.toml` y `REDES_ACTIVAS_NUBE = No` (las viejas apagadas).
6. «El panel del celular»: se reemplaza por el bot de Telegram `@radarbalcarce_bot` (agregar «Dónde tocar» para el bot: `v3/redaccion/telegram/`).
7. «`ingesta/`, `panel/` y `redes/` no importan nada de afuera de Node»: sigue valiendo para ellos, pero hay que agregar la regla del 3.0 («`v3/` no importa de afuera de `v3/`, salvo la lista de B1, hasta que se muden») y cuidar que `pruebas/` siga verde porque el 3.0 depende de esos archivos.
8. «Comandos»: agregar `node --test "v3/**/*.test.mjs"` y `node v3/…` (calibrar, copiar fotos, corte). `npm test` sólo prueba el viejo.
9. «Dónde tocar cada cosa»: ninguna fila apunta a `v3/` (núcleo, sitio, redes por red, bot, vigilancia, avisos, fotos propias, corte, despliegue). Agregarlas.
10. «Cuentas»: faltan Buffer, Bluesky, Threads, Telegram (bot), Google Analytics y AdSense; y la nota de que Cloudflare corre el 3.0 con el mismo dominio.
11. «Documentos»: agregar `docs/3-0/LEEME.md` y `docs/propuestas/PLAN-RADAR-3-0.md`; quitar de «los que más se usan» los que quedarán históricos.
12. «Sin cupos desde el 17/10», «Criterio limpio de tiempos» y las reglas de las ventanas están descritas para el motor viejo; el 3.0 tiene sus propios números (agrupado por huella de significado, 72 horas). Aclarar a cuál se refiere.

---

## Resumen en 15 líneas

1. **Lo que se puede borrar ya** (A): basura local de ~550 MB (`panel/datos`, `respaldos`, cachés, salidas, 55 MB de videos de maquetas) y 9 workflows de una sola vez; más `infra/sitio-por-worker/`, dos documentos vencidos y las capturas del media kit si no se rehacen.
2. **Lo más delicado de A:** `panel/datos/` y `respaldos/` (contraseñas con hash y claves iniciales en la PC de Hernán).
3. **El 3.0 todavía depende del viejo** de cuatro maneras: 47 archivos importados (`ingesta/`, `redes/`, `reels/`, `web/lib/`), la ruta `/video/` del Worker viejo `radar-balcarce-tareas`, tres JSON de `web/data/` (efemérides y feriados) y el respaldo `RESPALDO_VIEJO = "si"` para fotos y archivos fijos.
4. **Atadura más fácil de olvidar:** apagar `radar-balcarce-tareas` rompería los videos de TikTok, YouTube y X (`v3/redes/REGLAS.md` §10).
5. **Dos piezas chicas arrastran todo el motor viejo:** `redes/participa.mjs` y `ingesta/alertas.mjs`; mudándolas se reduce mucho lo que hay que conservar.
6. **Falta un respaldo de la base D1** `radar-nucleo`: el «Respaldo» de los domingos sólo copia el repo. Resolverlo antes de apagar el viejo.
7. **Hay dos sistemas de vigilancia e informes** corriendo a la vez (mail 8:15 y 21:15 viejos, Telegram 8 y 20 del 3.0).
8. **Workflows:** de 58, 8 tienen horario de GitHub (2 del 3.0, 6 del viejo) y 52 son del viejo; el 3.0 no tiene un workflow de pruebas (sólo `v3-desplegar`, a mano), mientras `pruebas.yml` corre sólo las pruebas viejas.
9. **El viejo no se toca desde el 30/10**, salvo que su motor sigue escribiendo «Datos de la portada» cada 30 minutos; apagarlo ahorra minutos de Workers Builds.
10. **Dudoso (C):** el panel viejo (¿cubre el bot todo?), `comercial/` y `motor/`, el acortador, los media kits, las maquetas B y C de la tapa, los dos criterios en la raíz, `docs/propuestas/` entera y los diagnósticos útiles.
11. **`PENDIENTES.md` (25/10) no menciona la 3.0:** la lista viva es `docs/3-0/PENDIENTES-3-0.md`; pasarlo a histórico.
12. **`IDEAS.md` (15/10, 1.030 líneas)** tiene muchas ideas ya hechas en la 3.0; partirlo o marcarlo.
13. **`docs/3-0/LEEME.md`, `REDES.md` y `UN-DIA-DEL-SITIO.md`** dicen que las redes 3.0 están en ensayo: desde las 13:33 del 3/11 están en real.
14. **`CLAUDE.md`** no menciona la 3.0, tiene el estado del 25/10, el reparto viejo de redes y ninguna fila de «Dónde tocar» para `v3/` (12 correcciones anotadas arriba).
15. **Orden sugerido:** borrar A → mudar los 47 archivos y la ruta de video → `RESPALDO_VIEJO = "no"` tras una semana mirando 404 → respaldar D1 → apagar el viejo → borrar B.
