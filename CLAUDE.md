# Radar Balcarce

*Actualizado el 23/10/2026 (estado en `docs/TRASPASO.md`). Corto a propósito: el detalle está en `docs/` (empezar por
`docs/00-INDICE.md`). Si esto y el código no coinciden, manda el código, y se corrige
esto.*

Medio digital automático de Balcarce (Buenos Aires), en `radarbalcarce.com`. Cada media
hora lee unos cien feeds de unos setenta medios (la cuenta exacta, en `FUENTES.md`), junta la misma
noticia contada por varios, decide qué publicar, lo escribe con IA, lo verifica contra
las fuentes, arma el sitio y lo sube, sin nadie despierto; varias veces por día publica
en Facebook e Instagram con voz. Los usuarios son Hernán y Andrés (no programan):
escribir siempre en castellano rioplatense, claro y sin voseo forzado.

## Cómo está armado

    ingesta/   el motor: fuentes, cruce, selección, lectura con IA, verificador, números del criterio. SIN dependencias
    reels/     placas, voz (Gemini), video… y la reescritura con IA (reels/reescritura.mjs). SÍ tiene dependencias (resvg, ffmpeg)
    redes/     Facebook e Instagram (API de Meta), contrato del día, vigilante, WhatsApp. SIN dependencias
    panel/     lo del panel del celular que corre en GitHub (cifrado, pedidos a la IA, pistas). SIN dependencias (el panel de la PC se retiró el 17/10)
    web/       el sitio (Next.js 15, JavaScript, HTML estático); web/public/panel/ es el panel del celular; web/scripts/generar-datos.mjs arma los datos
    pruebas/   `npm test`: unas 2.600 pruebas, sin red (en la vuelta de 30 minutos sólo corre el núcleo legal, `npm run test:nucleo`)
    docs/      la documentación: 00-INDICE a 13-EFEMERIDES, DECISIONES.md, propuestas/ (lo abierto) e historico/. Sin programas adentro
    scripts/medir/  mediciones a mano: repetidas por significado, cruce coherente, informe del día, calibrar repetidas

Flujo: fuentes → ingesta → cruce → sección, puntaje y semáforo → lectura con IA →
reescritura con IA → verificación → `web/data/*.json` → una sola compilación → Cloudflare Pages, todo
en "Actualizar la web" (regla 189; "Cloudflare Pages" quedó a mano, de rescate); después, redes
y vigilancia. Desde el 23/10 corre en Cloudflare (motor en Workers Builds, tareas en un Worker; GitHub Actions queda de vuelta atrás: `docs/TRASPASO.md`), disparado por el Worker de Cloudflare
`radar-balcarce-reloj` (`infra/reloj-cloudflare/`). **La web, las redes, la
vigilancia y el panel del celular andan con la PC apagada.**

## Comandos

    npm test              las pruebas (correr SIEMPRE antes de commitear)
    npm run auditar       qué está decidiendo el filtro sobre las noticias de hoy
    npm run auditar-fotos qué notas tienen foto y, de las que no, por qué (no gasta cupo; `-- --dias=7`, `-- --html` para ver las fotos)
    node ingesta/auditar-fuentes.mjs   cuánto aportó cada fuente en la semana y cuál se durmió (sin red; `--dias=30`, `--json`)
    node ingesta/listar-fuentes.mjs    rehace FUENTES.md después de tocar una fuente
    cd web && npm run build     compilar con los datos que hay (git pull antes). `npm run datos` lo corre Actions: en la PC no hace nada (ARMAR_EN_LA_PC=1 para la corrida entera, con IA)
    node reels/comparar-instruccion.mjs actual otra.txt   compara versiones de las reglas de la IA (gasta cupo)

## Reglas que no se negocian

(La lista numerada, con la prueba que cuida cada una: `docs/10-REGLAS-Y-PRUEBAS.md`; la
próxima regla es la 304 (la 297 a la 303, del semáforo, el sin cuerpo y el descarte después del cruce) (la 289 a la 296, de la auditoría integral del 23/10: policial nacional, fútbol sólo argentino, Balcarce sin amarillo, lo muy contado sin frenos, Balcarce con 36 horas, Agro y Automovilismo en 2 medios, el celular sin tope y la limpieza; la 284 a la 288, de otras tandas del 23/10) (la 260 a la 263, el criterio simple, la estadística y las instrucciones de la IA más cortas) (la 280 a la 283, lo que va a Facebook e Instagram, los hashtags fijos, los enlaces cortos y la foto cambiada; las 258 a 279, de otras tandas): del 189 al 210 son los arreglos de Radar 2.0 del 17/10, por tandas y con huecos; la 211, las fotos con chicos de las
fuentes de Balcarce; la 212, la revisión del archivo entero por tandas; la 215 a la 218, lo nacional por popularidad sin cupos, las secciones nuevas
siempre activas, las fuentes de ciencia, salud, educación y tecnología, y el orden por popularidad; la 230 a la 235, la mudanza a Cloudflare; la 240, OpenRouter;
la 260 a la 263, la selección en seis líneas con su estadística, las fuentes de las áreas chicas y las instrucciones de la IA más cortas.)

- **`ingesta/`, `panel/` y `redes/` no importan nada de afuera de Node.** Una prueba lo
  vigila (sigue los imports en cadena).
- **Cuando se arregla algo que estuvo mal publicado, se escribe una prueba** con el caso
  real y, si es una regla nueva, se anota en `docs/10-REGLAS-Y-PRUEBAS.md`.
- **El criterio editorial es uno solo: `CRITERIO-EDITORIAL.md`.** La IA lee su § 12 tal
  cual (`ingesta/prompt-editorial.mjs`; si falta, no escribe) y sus números están en
  `ingesta/criterio.mjs`, controlados contra su tabla. Lo de las redes, en
  `CRITERIO-REDES.md` (el código también lo lee tal cual). No borrar las marcas `<!-- … -->`.
- **Nunca identificar a un menor ni a una víctima** (el semáforo rojo; **no tocar esa
  lista sin preguntar**). **Nunca una marca de agua ni el nombre de otro medio pegado
  encima de una imagen**: el crédito va en la cita. **Lo que escribe la IA se verifica contra la
  fuente. Cada nota dice quién la escribió. Política y Policiales esperan a una persona en
  todas las piezas de redes.**
- **Las fotos**: la de otro medio o de un organismo, sólo sin su marca (lo que estaba en
  la escena, como el micrófono de una radio, sí: 29/09), con el crédito en el epígrafe y guardada en el banco propio
  (`web/data/banco-fotos.json`). Nunca foto real de un menor o una víctima, ni en
  Policiales salvo fuente oficial (`docs/05-FOTOS.md`). **Única excepción (reglas 186 y 211, Hernán,
  17/10: "si es de fuentes de Balcarce no hay problema, sobre todo si no son de tinte policial"):**
  la foto propia de una **fuente de Balcarce** —un medio de acá o un organismo; son las de
  `alcance: 'local'` de `ingesta/fuentes.mjs` (`FUENTES_DE_BALCARCE_PARA_FOTOS_DE_MENORES`), de su
  propia página y nunca de su sección policial— con chicos en una actividad deportiva, escolar,
  cultural o recreativa que no toque nada policial, judicial, de salud, accidentes, violencia, abuso,
  muertes, desaparecidos ni chicos bajo protección, sin marca, sin nombres de chicos, con el crédito
  en el epígrafe y nunca en el collage de redes (`ingesta/fotos-menores.mjs`), y sólo con la variable
  de GitHub `FOTOS_MENORES_OFICIALES` en "Si" (por defecto apagada: la prende una persona; apagarla
  saca esas fotos de la web). La placa es lo que sale cuando no hay foto que sirva.
- **Todo lo que va a Instagram es video con voz**, salvo el espejo de cada posteo de Facebook.
- **Tokens y claves nunca en un chat ni en el código.** Van a GitHub Secrets o al `.env`,
  y los pega una persona. El repositorio es **público**: por eso lo que espera a una
  persona viaja cifrado para el celular.
- **Sin cuerpo no se publica**: una nota automática sin cuerpo de 70 palabras o más no va a
  ningún lado (`web/lib/cuerpo.js`); se reintenta hasta tres veces (cuatro con 5 medios, cinco con 8: `REESCRITURA.fuentesParaUnIntentoExtra` y `fuentesParaDosIntentosExtra`) (mientras, en
  `web/data/esperando-cuerpo.json`). Lo de una persona se respeta; un cuerpo en
  `web/data/correcciones.json` cuenta como cuerpo.
- **El lector ve la nota, no el análisis**: título, bajada, cuerpo y un desplegable
  cerrado "Fuentes (N)". Verificación BAJA y la cotización del dólar no salen solas.

## Cosas que muerden

- **Los archivos del repo están en CRLF.** En scripts, editar por líneas; un `\n` literal
  en un reemplazo multilínea no encuentra nada. Para regex con `\b`, `\s`, `\d`: escribir
  un `.cjs` con Write, no `node -e` ni un heredoc (se comen las barras).
- **GitHub Actions regenera `web/data/` cada media hora** (corre a los :00 y :30 UTC y
  tarda ~5 minutos con la subida). Antes de `git push`, `git pull --rebase`; si choca en `web/data/`,
  `git checkout --theirs` sobre esos archivos y seguir. Commitear sólo los archivos
  tocados (`git commit -- archivos`). Correr `ARMAR_EN_LA_PC=1 npm run datos` en la PC deja esos
  archivos cambiados: no subirlos. Subir `banco-fotos.json` o fotos sólo entre corridas.
- **Los archivos que escribe una persona**: `web/data/celular-decisiones.json` y
  `web/data/correcciones.json` (los escribe el celular; ningún workflow los toca) y
  `web/data/retiradas.json` (a mano; los lunes "Actualizar la web" le saca las de más de
  7 días). Siempre con `motivo`, `cuando` y `por`: sin eso la web falla y se congela. Lo que
  retira la revisión del archivo (regla 212) va aparte, en `web/data/revision-archivo.json`, que
  escribe sólo su workflow y no se poda: cuenta igual que lo retirado a mano.
- **Las ventanas de tiempo**: la portada muestra **36 horas** (`HORAS_EN_PORTADA`; las secciones
  guardan todo, 10 por página); lo que nunca salió no se estrena si el hecho tiene más de **12** (**24** si lo cuentan 8 medios o más: regla 287; **36** si es de Balcarce: regla 293);
  la página dura 180 días en teoría, pero el tope de notas en el sitio es el de la variable `TOPE_DE_NOTAS` (hoy **500**; el techo técnico de 3.700 es `PORTADA.maximoDeNotas`, medido el 15/10: 15.900 archivos de los 20.000 de Cloudflare) y, con unas 120 notas por día, una nota está unos 4 días en el sitio; el resto lo da el archivo permanente en R2; lo raspado de más de 72 horas no entra. Los
  números viven en `ingesta/criterio.mjs` y `web/lib/archivo.js` los importa (no hay copias, desde la regla 293).
- **Una nota tiene una sola fecha**, que envejece y nunca rejuvenece (`fechaReal`,
  `fechaDeLaNota`; una nota vieja de otro hecho que el cruce pega, de más de 48 h antes de verla, no la envejece: regla 194), y **una sola dirección**, fija desde que sale. La misma noticia que
  vuelve con otra dirección se une a la que ya estaba y redirige (`web/lib/repetidas.js`).
- **"De acá" tiene una sola definición** (`esDeAca`): lo que toca la zona; si no, lo de un
  medio de Balcarce o lo que dice Balcarce **en el título**. Un medio de acá que copia una
  noticia de afuera no la hace de Balcarce (`historiaDeAca`), y lo de un medio de acá que
  no nombra nada de acá espera a la IA (`mencionaAca`).
- **Lo de afuera se publica por popularidad, sin cupos ni topes** (reglas 215 y 260, Hernán 17/10), en seis
  líneas: Balcarce entra todo; lo nacional, con **3 medios** distintos (`MINIMO_NACIONAL`); en las áreas
  chicas (Tecnología e IA, Ciencia, Salud, Educación, Cultura, Agro y Automovilismo: regla 294), con **2** (`MINIMO_AREAS_CHICAS`); sin cupos ni
  topes; lo muy contado (8 medios o más) va primero y **no se frena por palabras sensibles, la lista internacional ni "es del extranjero"** (reglas 288 y 292; el rojo,
  nunca); del extranjero, sólo con un argentino (`conArgentino`), y el fútbol de afuera sin argentinos, ni con 8 medios (regla 290); Policiales de afuera, sólo lo contado por 8 medios o más y la muerte de un famoso (regla 289). Los
  dos números se cambian con variables de GitHub, sin tocar código (`ingesta/popularidad.mjs`, `POPULARIDAD` en
  `ingesta/criterio.mjs`). Nunca con un solo medio. Lo que ya salió no se baja. Cómo cae todo se mide en
  `web/data/estadistica-seleccion.json` (regla 261): Hernán lo mira cada semana y regula.
- **Las listas de sepelios no se publican nunca**, ni aprobadas por una persona.
- **Las palabras clave cortas engañan** ("gol" encontraba "golpe"): las ambiguas van en
  `PALABRAS_DEBILES` y sólo deciden desde el titular.
- **Las secciones son catorce** (desde el 17/10, regla 211; el interruptor `SECCIONES_NUEVAS` se sacó):
  Balcarce, Política, Policiales, Educación, Salud, Fútbol, Deportes, Automovilismo, Agro, Economía,
  Ciencia, Cultura y agenda (se lee "Cultura"), Tecnología (se lee "Tecnología e IA") y Argentina, con el
  menú "Más secciones". La sección de una nota la decide el feed (si el título la confirma), las palabras
  (`seccionSumada`, `ingesta/secciones-nuevas.mjs`, que nunca se lleva una de Política o Policiales) y la
  IA. Cada sección tiene que tener notas todos los días: si no, no vale la pena tenerla (menos Policiales,
  que es sólo de acá).
- **Los títulos automáticos se arreglan sin inventar** (`arreglarEscritura`,
  `tituloAutomatico`); lo de una persona no se toca.
- **Las redes tienen un interruptor**: la variable de GitHub `REDES_ACTIVAS` ("Si"); apagado,
  todo simula. "Piezas" con `solo` vacío no arma nada (marcar `todas`). En GitHub las piezas
  salen de lo ya publicado (`web/data/portada.json`), con los horarios de `redes/horarios.mjs`.
- **Cuatro claves de IA, todas gratis desde el 29/09** (`reels/claves.mjs`):
  `GEMINI_API_KEY_REDACCION` (redactar), `GEMINI_API_KEY_REDES` (las voces; respaldo de la
  redacción sólo con 429), `GEMINI_API_KEY_CLASIFICACION` (lectura con IA y fotos; último
  respaldo de la redacción) y `GROQ_API_KEY` (respaldo de la lectura y las fotos; no
  redacta); aparte, `TAVILY_API_KEY` (búsqueda, sólo Pistas). **Opcional, `OPENROUTER_API_KEY`**
  (17/10, regla 240): el último respaldo de la lectura, la redacción y las auditorías con modelos `:free`
  (50 pedidos por día, tope propio de 45, `reels/openrouter.mjs`); sin ella no se llama a nadie. **Cupo de voz: 10 audios por
  día**; si se acaba, la pieza no sale (nunca con otra voz). Una clave rechazada
  (401/402/403) no gasta los intentos de una nota. Texto: `gemini-flash-lite-latest`; voz:
  `gemini-3.8-flash-tts`, dos voces propias que **vencen el 29/09/2027** (`CRITERIO-REDES.md` § 6).
- **Para que "hoy" sea el de Balcarce en Actions** hay que poner
  `TZ: America/Argentina/Buenos_Aires` en el workflow (`ingesta/zona.mjs`).
- **El turno de farmacia dura hasta las 8:30 del día siguiente** (la web no dice hasta qué
  hora). **Si Open-Meteo falla, el clima sale de `api.met.no`**, sin sensación térmica.
- **El reloj es el Worker `radar-balcarce-reloj`** (desde el 15/10; cron-job.org, pausado):
  si algo deja de salir, mirar Cloudflare → Workers → radar-balcarce-reloj. Desde el 17/10
  (regla 190) cada cosa corre sólo cuando hace falta (`trabajosDelMinuto`): Redes de 7 a 23,
  Vigilancia cada 3 horas, Auditoría IA y Pistas sin horario de GitHub. **No se sube solo**:
  después de tocar `infra/reloj-cloudflare/`, correr a mano «Reloj de Cloudflare».
- **`_redirects` tiene tope** (2.000 en Cloudflare; se escriben como mucho 1.950, regla 191):
  no sumar redirecciones por nota; las cortas `/nota/ID` son sólo de antes del 25/09.
- **El correo de los commits automáticos** es el noreply de GitHub: no cambiarlo.
- **El panel del celular** (`web/public/panel/`) no tiene servidor: escribe con la llave de
  GitHub de quien lo usa; lo sensible viaja cifrado (`panel/cifrado.mjs`); pedirle a la IA
  dispara "Panel del celular" (`panel.yml`), que lee las notas de la caché de Actions. Su
  página tiene su propia CSP en `web/public/_headers`: no cargar nada de afuera ahí.

## Estado (17/10/2026)

- **Sin cupos desde el 17/10** (reglas 215 y 260): lo nacional sale por cuántos medios lo cuentan (3, o 2 en las áreas
  chicas); Educación, Salud y Ciencia son secciones de siempre. Esta primera semana no se toca nada: se mira la estadística
  de la selección (`scripts/medir/estadistica-seleccion.mjs`, el informe diario y la pestaña Números) y el lunes se decide
  si hace falta cambiar `MINIMO_NACIONAL` o `MINIMO_AREAS_CHICAS`.

- **Todo andando en la nube** (web, redes con voz y escenas animadas, vigilancia, panel del
  celular). El 15/10 el repositorio se mudó y el reloj pasó al Worker: mirar que dispare.
- **Rediseño desde cero, una etapa por vez** (empieza por las fuentes). Las reglas de arriba
  valen hasta que se cambien con su prueba; las claves nuevas, cuando se elijan los modelos.
- **17/10, limpieza final**: se retiraron el panel de la PC y su "modo PC", los ensayos en sombra (selección nueva, feed de
  podcast, audio en la página, video de presentación), `pruebas-modelos/`, `criterio-unico/` y los programas de `docs/`
  (los que se usan, en `scripts/medir/`). Todo queda en el historial de git (`docs/DECISIONES.md`, 17/10).
- **Mudanza a Cloudflare: HECHA (23/10)** (según `docs/TRASPASO.md`): web, tareas, redes y video corren en Cloudflare con el reloj `NUBE`; el motor guarda lo que dice `infra/motor-cloudflare/archivos.mjs`; los workflows viejos de GitHub quedan de vuelta atrás y se apagan a mano. Antes de tocar "dónde corre" cada cosa, mirar el traspaso y `NUBE`, no esta lista. Lo que sigue es lo que se escribió el 18/10:
- **Mudanza a Cloudflare, escrita el 18/10 (hoy hecha, ver arriba):** el motor en Workers Builds, las tareas chicas en un Worker (`radar-balcarce-tareas`) y el video en un repositorio público sin secretos; todo detrás de la variable `NUBE` del reloj (vacía = todo en GitHub, como hoy). Qué se eligió, con qué números y cómo se prende: `docs/etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md` y `PLAN-DE-CAMBIO.md` (reglas 230 a 235).
- Lo que falta: **`PENDIENTES.md`**. Qué se decidió y las preguntas abiertas: **`docs/DECISIONES.md`**.

## Dónde tocar cada cosa

| Quiero… | Dónde |
|---|---|
| Sumar, sacar o apagar una fuente, o cambiar un peso | `ingesta/fuentes.mjs` o `ingesta/fuentes-cruce.mjs` (`activa: false`); después, `node ingesta/listar-fuentes.mjs` |
| Pasar un trabajo de GitHub a Cloudflare (o volver), el motor en Workers Builds, el Worker de tareas, el render público | `NUBE` en `infra/reloj-cloudflare/nube.mjs`; `infra/motor-cloudflare/`; `infra/tareas-cloudflare/tareas.mjs` (`lee`/`escribe`); `infra/render-publico/` (copia de `reels/`: `node scripts/sincronizar-render-publico.mjs`); cómo se sube: workflow «Desplegar Workers de Cloudflare» y `docs/etapa-10-operacion/PLAN-DE-CAMBIO.md` |
| Que una palabra mande una nota a otra sección | `REGLAS_SECCION` (`ingesta/fuentes.mjs`); si es ambigua, también `PALABRAS_DEBILES` (`ingesta/ingesta.mjs`) |
| Que algo espere a una persona o no salga nunca | `REGLAS_SEMAFORO` (`ingesta/fuentes.mjs`: `rojo` —no sin preguntar—, `nunca`, `amarillo`, `cotizacion`, `internacional`, `promocional`); lo de Balcarce y lo que cuentan 8 medios o más no esperan por el amarillo (reglas 291 y 292: `sueltaElAmarillo`, `ingesta/ingesta.mjs`); la cotización, `esCotizacionDelDia`; la muerte de un famoso en Policiales, `esMuerteDeFamosoEnPoliciales` (regla 289) |
| Qué es "de acá" o "la zona" | `esDeAca` (`ingesta/ingesta.mjs`), `PALABRAS_LOCALES` y `PALABRAS_ZONA` (`ingesta/fuentes.mjs`) |
| Cómo se juntan las notas del mismo hecho | `CRUCE` y el cruce coherente, que no encadena (`CRUCE.coherente`, `CRUCE_COHERENTE`, regla 184: `docs/flujo/CRUCE-COHERENTE.md`) (`ingesta/cruce.mjs`), `agruparRepetidas` y `quitarRepetidas` (`ingesta/lectura-ia.mjs`), y las que vuelven con otra dirección, `web/lib/repetidas.js`; lo de acá con otras palabras, la huella de significado (`ingesta/huellas-significado.mjs`, regla 195: `docs/flujo/REPETIDAS-2-0.md`) |
| Cualquier número del criterio | `ingesta/criterio.mjs` **y** la tabla "Los números" de `CRITERIO-EDITORIAL.md` |
| Cuántos medios pide lo de afuera (3) y en las áreas chicas (2) | Las variables de GitHub `MINIMO_NACIONAL` y `MINIMO_AREAS_CHICAS` (sin tocar código); el valor de siempre y qué áreas son chicas, `POPULARIDAD` y `AREAS_CHICAS` (`ingesta/criterio.mjs` **y** la tabla del criterio), `ingesta/popularidad.mjs` (regla 260) |
| Cómo cae la selección (qué llega, con cuántos medios, qué sale y por qué no; cuántas notas habría con otro mínimo) | `web/data/estadistica-seleccion.json` (`ingesta/estadistica-seleccion.mjs`), `node scripts/medir/estadistica-seleccion.mjs` (`--ahora` mide el momento sin IA), `web/public/panel/numeros.js`, la línea «La selección» de `redes/informe-diario.mjs` (regla 261) |
| Cómo decide la lectura con IA | `ingesta/lectura-ia.mjs`; lo que sabe de Balcarce, `ingesta/perfil-balcarce.md` (va tal cual a la IA) |
| Cómo escribe la IA | `CRITERIO-EDITORIAL.md` § 4 y § 12; medir un cambio con `reels/comparar-instruccion.mjs` |
| El verificador o los arreglos que no inventan | `ingesta/verificar.mjs` (`verificar`, `arreglarEscritura`, `diceEnVivo`) |
| Cuándo una nota pierde su página | `pierdeLaPagina` (`web/lib/archivo.js`), `tieneRespaldo` (`web/lib/cuerpo.js`) |
| Sacar o corregir una nota sin el celular | `web/data/retiradas.json` / `web/data/correcciones.json` (motivo, cuándo y quién) |
| Sacar de la agenda un evento suspendido que el municipio sigue teniendo | `web/data/agenda-suspendidos.json` (`id`, motivo, cuándo y quién; regla 163) |
| Las estadísticas (pestaña Números del panel del celular) | `redes/estadisticas.mjs` (mide) y `redes/estadisticas-detalle.mjs` (el detalle diario de Cloudflare: horas, notas, de dónde llegan, aparatos, países → `web/data/estadisticas.json`), `web/public/panel/numeros.js` (lo que se muestra) |
| La auditoría con IA de lo ya publicado (pestaña Revisión del panel; avisa y corrige sola sólo la ortografía chica y segura, regla 98) | `ingesta/auditoria-ia.mjs` (qué lee, qué busca y `cambioMecanico`), `redes/auditar-notas.mjs`, `.github/workflows/auditoria-ia.yml`, `web/public/panel/revision.js`, `web/data/correcciones-auditoria.json` (lo escriben la auditoría y la revisión del archivo), `conCambiosDeLaAuditoria` (`web/lib/archivo.js`; desde el 17/10 también sobre las notas viejas del archivo) |
| La revisión del archivo entero, por tandas, con el criterio de hoy (desde el 22/10/2026, cada 2 h a los :12 por el reloj de Cloudflare: retira lo que hoy no saldría, une repetidas, saca fotos que no pasan, corrige lo seguro y deja lo dudoso para una persona; regla 212) | `web/scripts/revisar-archivo.mjs` (`REVISION`: tandas, cupo, versión del criterio y `desde`; `simular` sin IA), `.github/workflows/revisar-archivo.yml`, `web/data/revision-archivo.json` (lo escribe sólo ese workflow; su lista `retiradas` no se poda), `web/lib/revision-archivo.js` (lo que leen generar-datos, «Ilustrar notas sin foto» y el informe diario), variable `REVISION_DEL_ARCHIVO` ("no" la frena); `docs/flujos/REVISION-DEL-ARCHIVO.md` |
| Las notas sin foto del panel (pestaña Fotos: por qué, dónde buscarla y sumarla a mano) | `web/public/panel/fotos.js`, `web/scripts/foto-manual.mjs`, `web/data/fotos-manuales.json` (lo escribe sólo "Panel del celular"), `accion=foto` de `panel.yml` |
| Los contactos del celular (instituciones y propios, a quién se le escribió; cifrado) | `web/public/panel/contactos.js`, `web/public/panel/cifrado.js` (`cerrar`), `web/data/contactos-celular.json`, `ingesta/contactos-agenda.json` (público) |
| Las pistas del panel (pegar un tuit o un enlace; quedan abiertas, se vuelven a mirar cada 3 horas y se sigue en qué quedó cada una) | `ingesta/pistas.mjs`, `panel/pistas-libro.mjs`, `panel/revisar-pistas.mjs`, `.github/workflows/pistas.yml`, `web/data/pistas.json`, `web/public/panel/pistas.js`, `panel/celular.mjs` (acciones `pista` y `nota-pista`) |
| Hacer una nota propia de una pista (búsqueda con texto en internet, Tavily) | `ingesta/busqueda.mjs`, `panel/nota-de-pista.mjs`, `web/lib/notas-de-pistas.js`, `web/data/notas-de-pistas.json` (lo escribe sólo el celular) |
| El panel del celular | `web/public/panel/` (la app), `panel/celular-datos.mjs` (lo que decide y lo que recibe), `panel/cifrado.mjs`, `panel/celular.mjs` y `panel/reescribir-una.mjs` (el pedido a la IA), `.github/workflows/panel.yml` |
| "Un día como hoy" y los feriados (el mes armado se aprueba, se saca o se frena en la pestaña Fechas → Mes armado: `redes/efemeride.mjs`, regla 97) | `ingesta/efemerides.mjs` (candidatas y puntaje), `ingesta/generar-efemerides.mjs` (la corrida mensual), `ingesta/efemerides-curadas.json` (fechas patrias y de Balcarce), pestaña Fechas del panel (`web/public/panel/fechas.js`); `docs/13-EFEMERIDES.md` |
| La nota del diario de "Un día como hoy" (sale cuando sale el video; texto propio, ilustración fija con IA) | `notasDeEfemerides` (`web/lib/notas-propias.js`), `web/public/fotos-notas/efemeride-fondo.jpg`; regla 165 |
| La imagen de la nota del clima (ilustración fija con IA según el estado del tiempo y la fecha; regla 181) | `web/lib/fondos-clima.js`, `web/public/fotos-notas/clima-<estado>-<n>.jpg`, workflow manual `generar-fondos-clima.yml` (genera candidatas nuevas) |
| Ilustrar con IA las notas sin foto (automático cada 2 h de 7 a 23 por el reloj de Cloudflare, o a mano: revisar y después aplicar; reglas 182, 185 y 206: un solo camino, Cloudflare gratis; Gemini web quedó desactivado el 17/10) | Workflow «Ilustrar notas sin foto» (`ilustrar-notas.yml`), `web/scripts/ilustrar-notas.mjs` (filtros `motivoParaSaltar`, tono, prompt, topes y `cupoAutomatico`), `web/data/fotos-ia.json` (lo escribe ese workflow; prioridad más baja en `conFotosDelBanco`) |
| La firma de las notas | `quienEscribio`, `firmaCorta` (`web/components/metadatos.js`) |
| Las fotos | `web/scripts/fotos-notas.mjs`, `ingesta/fotos.mjs`, `web/scripts/achicar-foto.mjs` |
| Una sección nueva, su nombre o su color | `SECCIONES` (`web/lib/datos.js`), `--s-*` (`web/app/globals.css`), `REGLAS_SECCION`, `SECCIONES_DE_LA_FICHA` (`ingesta/lectura-ia.mjs`), `SECCIONES` de `web/public/panel/github.js`; las del mapa de 17, activas Educación, Salud y Ciencia: `SECCIONES_SUMADAS` y `seccionSumada` (`ingesta/secciones-nuevas.mjs`), `seccionesDelSitio` y `navegacionDelSitio` (`web/lib/datos.js`), `COLOR_SECCION` + `CRITERIO-REDES.md` § 8 y `--s-*` (reglas 187 y 211) |
| La tapa, las secciones o "Seguí leyendo" | `armarTapa` (`web/lib/datos.js`), `web/lib/seguir-leyendo.js` |
| La nota del dólar o la de cada podcast | `web/lib/notas-propias.js` |
| Las notas de F1 (horarios, clasificación, resultado; Jolpica) y de fútbol (Liga, Copa Argentina, Libertadores y Sudamericana con equipos argentinos; ESPN) | `ingesta/f1.mjs`, `ingesta/futbol.mjs`, `web/data/f1.json`, `web/data/futbol.json`; la foto libre, `web/scripts/foto-libre.mjs` |
| Qué va a las redes (sólo Balcarce y lo más contado del país: `FACEBOOK.mediosParaRedes`, regla 280) | `vaAFacebookPorLoQueEs`, `esPopularParaRedes`, `elegirParaFacebook`, `sePuedeSola`; en los repasos, `elegirParaPodcast` y `sePuedeEnUnRepaso` (`redes/elegir.mjs`); cuántos por día: `docs/redes/PROPUESTA-POSTEOS-POR-DIA.md` |
| El texto de cada red y los hashtags fijos (`#Balcarce #RadarBalcarce`, regla 281) | `hashtagsDe`, `mensajeDeNota` (`redes/elegir.mjs`), `hashtagsDePieza`, `pieDePieza` (`redes/piezas.mjs`), `textoParaRed` (`redes/texto-por-red.mjs`); la tabla por red: `docs/redes/FORMATOS-POR-RED.md` |
| Los enlaces cortos de las redes (`ENLACES_CORTOS`, apagado; regla 282) | `redes/enlaces-cortos.mjs`, `infra/enlaces-cloudflare/` (Worker y ruta); `docs/redes/ACORTADOR-DE-ENLACES.md` |
| La foto de una nota que cambia después de salir en Facebook (regla 283) | `redes/foto-cambiada.mjs`, `releerEnlace` (`redes/meta.mjs`), `FACEBOOK.horasEsperandoFotoReal`; `docs/redes/FOTO-CAMBIADA-DESPUES-DEL-POSTEO.md` |
| A qué hora sale una pieza | `HORAS_REELS`, `VENTANAS` (`redes/piezas.mjs`) y `HISTORIAS_FIJAS` (`redes/horarios.mjs`) |
| Cómo suenan o qué dicen las piezas | `CRITERIO-REDES.md` y `redes/guiones.mjs` |
| Las voces | `CRITERIO-REDES.md` § 6; crearlas, "Crear voces" (`reels/crear-voces.mjs`) |
| El contrato del día | `redes/contrato.mjs` y `CONTRATO_DIARIO` (`ingesta/criterio.mjs` **y** `CRITERIO-EDITORIAL.md`) |
| El dibujo de una placa o de una tarjeta | `reels/placa.mjs`; `web/lib/tarjeta.js` y `web/lib/tarjeta-diseno.js` |
| Los colores de las placas (qué color es de qué) | `CRITERIO-REDES.md` § 8 y `COLOR_SECCION` (`reels/placa.mjs`); una prueba controla que digan lo mismo |
| Qué vigila el vigilante o qué dice el WhatsApp | `redes/vigilar.mjs` (`evaluar`, `revisarClaves`, `VENCIMIENTOS`), `redes/avisos.mjs` |
| Los informes diarios por mail (8:15 y 21:15: qué se publicó, qué espera, redes, visitas, salud; regla 176) | `redes/informe-diario.mjs`, `.github/workflows/informe-diario.yml`, el horario en `infra/reloj-cloudflare/` (`trabajosDelMinuto`) y el `html` de `POST /avisar` en `infra/vigilante-cloudflare/worker.mjs`; el resumen de las 22 del Worker es sólo el respaldo |
| Qué archivos guarda "Actualizar la web" | La línea `git add` de `.github/workflows/actualizar.yml` (un archivo nuevo de `web/data/` que no esté ahí se pierde) |
| Qué obliga a recompilar antes de subir, y las redirecciones | `NO_CAMBIAN_EL_SITIO` (`web/scripts/recompilar.mjs`, regla 189); `planDeRedirecciones` (`web/scripts/generar-redirects.mjs`, regla 191) |
| La política hacia buscadores e IA (`robots.txt`, bots), los datos estructurados, los sitemaps, `llms.txt`, y los datos para agentes (el servidor MCP escrito y sin activar se borró el 17/10) | `web/lib/robots.js`, `web/lib/datos-estructurados.js`, `web/components/ficha.js`, `web/app/sitemap.js`, `web/app/llms.txt/route.js`, `web/lib/para-agentes.js` (`/agentes/*.json`); el estado, los trámites y las decisiones: `docs/seo/AUDITORIA-SEO-LLM.md` |
| Los avisos publicitarios | `web/data/avisos.json`, a mano, con quién y cuándo en el commit (`PUBLICIDAD.md`); la agenda sale sólo del municipio (`ingesta/agenda.mjs`) |
| Qué se decidió, por qué y quién; las preguntas abiertas | `docs/DECISIONES.md` (lo nuevo arriba) |

## Cuentas

- **GitHub:** cuenta de `radarbalcarce@gmail.com`, repositorio `radarbalcarce/radar-balcarce`
  (desde el 15/10), **público** hasta que el robot salga de Actions (privado costaría unos
  US$ 100 por mes en minutos). Colaboradores invitados: `balcardev`, Andrés y Hernán.
- **Todo lo demás:** `radarbalcarce@gmail.com` (Cloudflare con el Worker del reloj,
  Google/Gemini, Meta, Instagram, Search Console, Tailscale; cron-job.org, pausado;
  Vercel, apagado).
- **Meta:** app "Radar Balcarce Publicador" (ID 2302218363874399), usuario del sistema
  `publicador-radar`, token sin vencimiento en `META_TOKEN` (con `read_insights` e
  `instagram_manage_insights`). Página de Facebook "Radar Balcarce", ID para la API
  **1254237411116171** (`PAGINA_DE_FACEBOOK`, `redes/meta.mjs`). Instagram `@radarbalcarce`.
- **Dominio** `radarbalcarce.com` (DonWeb), vence el **21/09/2027**. WhatsApp del medio: 2266 51-1612.
- Secretos, workflows, costos y vencimientos: `docs/08-INFRAESTRUCTURA.md`.

## Documentos

**`docs/00-INDICE.md`** tiene la lista completa. Los que más se usan: `docs/11-OPERACION.md`,
`docs/10-REGLAS-Y-PRUEBAS.md`, `docs/08-INFRAESTRUCTURA.md`, `docs/09-PANEL.md`, los dos criterios
(`CRITERIO-EDITORIAL.md` y `CRITERIO-REDES.md`), `docs/DECISIONES.md`, `PENDIENTES.md` e `IDEAS.md`.
