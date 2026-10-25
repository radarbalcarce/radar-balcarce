# Módulo A: código, archivos y configuración que no se usan o no son coherentes

*Auditoría de sólo lectura, 24/10/2026, sobre la rama `worktree-agent-ad3266d4b20eb5c89` (parte de `main` en `ebe183a2`). Método: se recorrieron
los 579 archivos de programa del repo con búsquedas por nombre y por nombre exportado (en programas, pruebas, workflows, `package.json` y
documentos), y cada hallazgo se volvió a buscar a mano. "Uso" = lo importa o ejecuta algo que no sea sólo una prueba.*

## Resumen

1. El repo está **mucho más limpio de lo que se podía temer**: de 579 archivos de programa, sólo 14 no los llama nadie (y 8 de esos son herramientas
   a mano que los documentos nombran). No hay dependencias de `package.json` sin uso (`next`, `react`, `pagefind`, `@resvg/resvg-js`, `ffmpeg-static` se usan).
2. Los 44 archivos de `web/data/` tienen lector; ninguno está huérfano. `muy-contadas.json` y `vistas.json` sólo los lee una persona o un script de medición (no es un error).
3. **Tres funciones exportadas que nadie llama, ni siquiera las pruebas**: `armarRecuperado`, `ultimosDiasConNumeros`, `SECCIONES_DE_LA_FICHA`.
4. **Un módulo entero que sólo corre en pruebas**: `redes/texto-por-red.mjs` (`textoParaRed`, escrito para redes sin cuenta). Y otras 12 funciones o constantes
   que sólo existen para que las pruebe una prueba (`sePuedeSola`, `agruparPorHecho`, `parecidoEntreTextos`, etc.). Esas pruebas cuidan código que producción no usa.
5. **Dos interruptores que el código lee pero ningún workflow pasa**: `ENLACES_CORTOS` y `FOTOS_EN_R2`. Si alguien los pone en "Si" en GitHub, no pasa nada en Actions
   (sólo `FOTOS_EN_R2` llega al motor de Cloudflare por otro camino, y tampoco está en `cargar-variables.mjs`). Esto es lo más importante del informe: es una incoherencia que puede costar una tarde.
6. **Una variable al revés**: los workflows pasan `SECCIONES_NUEVAS` en 7 lugares y `huella-del-sitio.mjs` la cuenta como entrada del sitio, pero el interruptor se sacó el 17/10 (y una prueba lo afirma).
7. **Workflows**: de 42, 35 son sólo a mano y 7 tienen reloj propio; hay tres pares casi duplicados (`reloj-cloudflare` y `vigilante-cloudflare` contra `desplegar-nube`; `ensayo-nube` y `motor-ensayo`; `probar-ilustraciones` y `probar-imagenes`). Nada está roto.
8. **Documentos**: `CLAUDE.md` dice "la próxima regla es la 284" y el registro ya va por la 307; dice que `docs/` no tiene programas y hay tres (`docs/etapa-1-fuentes/*.mjs`) que además importa `scripts/medir/informe-del-dia.mjs`; no nombra `motor/` ni `comercial/`.
9. Hay unas 220 exportaciones que sólo se usan dentro de su propio archivo (el `export` sobra). Es ruido, no riesgo; no se lista una por una.
10. Total seguro para borrar ya: unas 40 líneas de programa y 3 símbolos, sin tocar ninguna prueba. El resto necesita una decisión de Hernán o Andrés (módulos dormidos a propósito).

## Hallazgos

Riesgo = de borrarlo hoy. Recomendación: **borrar**, **mover a histórico** o **dejar**.

### A. Código muerto (nadie lo llama)

| Qué | Dónde | Evidencia de que no se usa | Riesgo | Recomendación |
|---|---|---|---|---|
| `armarRecuperado` (función exportada del Worker del vigilante) | `infra/vigilante-cloudflare/worker.mjs:512` | Una sola aparición en todo el repo: su propia definición. Ni pruebas ni otro programa. | bajo | **Borrar** (el Worker se vuelve a subir sólo cuando alguien lo despliega) |
| `ultimosDiasConNumeros` | `ingesta/estadistica-seleccion.mjs:326` | Una sola aparición: su definición. Sin pruebas. | bajo | **Borrar** |
| `SECCIONES_DE_LA_FICHA` (constante) | `ingesta/lectura-ia.mjs:51` | Fuera de documentos, sólo su definición; el código usa `seccionesDeLaFicha()` (`:48`, `:173`, `:193`, `:272`). Nadie importa la constante. | bajo | **Borrar** la constante, dejar la función |
| `SECCIONES_NUEVAS` dentro de `VARIABLES_DEL_SITIO` | `web/scripts/huella-del-sitio.mjs:29` (y `actualizar.yml:157,174,190,287,351`, `cloudflare-deploy.yml:80`, `motor-variables.yml:51`) | Ningún programa lee `process.env.SECCIONES_NUEVAS`; el interruptor se sacó el 17/10 (regla 215/211) y `pruebas/secciones-sumadas.test.mjs:93` lo dice. Hoy sólo sirve para que, si alguien creara la variable, se recompile. | bajo | **Borrar** de los 3 workflows y de la lista; `pruebas/menos-compilaciones.test.mjs:181` revisa que cada variable de la lista esté en el workflow, así que se sacan las dos cosas juntas |
| `datosDeFecha` | `ingesta/verificar.mjs:394` | Sin uso en producción: sólo `pruebas/verificador-copia-fechas-letras.test.mjs:163-168`. | bajo | **Borrar** con su prueba (4 líneas de prueba) |
| `parecidoEntreTextos` | `ingesta/fuentes-para-la-ia.mjs:70` | Sin uso en producción; sólo `pruebas/entrada-ampliada.test.mjs:181-182`. | bajo | **Borrar** con sus 2 aserciones |
| `medirCambiosDeFoto` | `redes/foto-cambiada.mjs:88` | Sólo `pruebas/foto-cambiada.test.mjs:209`. | bajo | **Borrar** con su aserción |
| `publicadasDelDia` | `ingesta/estadistica-seleccion.mjs:313` | Sólo `pruebas/estadistica-seleccion.test.mjs:191-192`. | bajo | **Borrar** con sus 2 aserciones |
| `repetidasDeLoPublicado` (alias de `parejasConLoPublicado`) | `ingesta/repetidas-publicadas.mjs:381` | Producción usa `parejasConLoPublicado`; el alias lo ejercitan sólo ~6 aserciones de `pruebas/repetidas-publicadas.test.mjs` (`:57,62,126,127`…). | medio (hay que pasar esas pruebas a la otra función) | **Borrar**, repuntando las pruebas |
| `agruparPorHecho` | `ingesta/cruce.mjs:133` | Producción llama a `agruparConDetalle` (`ingesta/ingesta.mjs:23`). `agruparPorHecho` es un envoltorio que usan 2 pruebas. Pero 6 documentos lo presentan como "el corazón del cruce" (`docs/02-INGESTA.md:250`, `CRUCE-COHERENTE.md:3`, etc.). | medio | **Dejar** o **borrar** corrigiendo los documentos; decide quien mantenga el cruce |
| `sePuedeSola` | `redes/elegir.mjs:486` | Ningún programa la llama; la usan `pruebas/celular.test.mjs` y `pruebas/cuerpo.test.mjs` (6 pruebas) y `CLAUDE.md:219` la nombra como lugar donde tocar. Es una regla escrita que no manda nada. | **alto** (si la regla era la que decide qué sale sola, alguien tiene que confirmar que la reemplazó otra) | **Dejar** hasta confirmar qué decide hoy "se puede sola"; si no decide nada, borrar con sus pruebas y sacarla de `CLAUDE.md` |
| `diasPreparados` | `redes/efemeride.mjs:62` | Sólo pruebas (`efemeride-viva`, `efemerides-aprobacion`). | bajo | **Borrar** con 3 aserciones, o dejar como ayuda de diagnóstico |
| `TAMBIEN_REEL_EN_FACEBOOK` | `redes/piezas.mjs:228` | Sólo `pruebas/donde-sale-cada-pieza.test.mjs:5,18`. La prueba fija una lista que producción no lee. | medio (la lista puede estar duplicada en otro lado y desfasarse) | **Dejar** y revisar si el comportamiento real coincide |
| `REDES_QUE_PUBLICAN` | `redes/texto-por-red.mjs:42` | Sólo `pruebas/texto-por-red.test.mjs:75`. | bajo | Ver el módulo entero, abajo |
| `NUMEROS_DE_REDES` | `ingesta/criterio.mjs:387` | Sólo `pruebas/redes-criterio.test.mjs:73` (controla la tabla del criterio). | bajo | **Dejar** (es el control de la tabla) |
| `CRITERIO_EDITORIAL` (re-exportación) | `reels/reescritura.mjs:100` | Sólo `pruebas/criterio.test.mjs:137`. | bajo | **Dejar** |
| `RECORTE_ESCRITORIO`, `AVATAR_CELULAR`, `ZONA_SEGURA`, `cajasDeTexto` | `reels/portada.mjs:29` y siguientes, `:84` | Sólo `pruebas/formatos.test.mjs:150-168`. Se calculan para que la prueba controle márgenes. | bajo | **Dejar** (son controles de diseño) |
| `FechaExacta` | `web/components/piezas.js:248` | Nadie la importa; la única mención es `pruebas/fecha-y-antes.test.mjs:52` que lee el archivo como texto y busca `export function FechaExacta`. Ninguna página la dibuja. | medio | **Borrar** componente y aserción, o confirmar con Hernán que se quiere en pantalla |
| `medidasDelHtml`, `LARGO_MAXIMO_TITULO_DE_SECCION`, `SECCIONES_DE_PISTAS`, `leerManifiestoPrevio`, `soltarEnlacesCortos`, `reiniciarEstadoDelProceso`, `olvidarElIndice`, `horaDeBalcarce`, `tareaPorNombre`, `tareaPorWorkflow`, `SECCIONES_DE_LA_FICHA_NUEVAS`, `cargarAMano`, `OFERTAS`, `CATALOGO`, `ofertaSugerida`, `ETAPAS`, `notasDeLaBase`, `notasPorSeccion`, `resumenFondo`, `POR_ID` | `web/lib/auditoria-html.js:79`, `web/lib/datos.js:573`, `web/lib/notas-de-pistas.js:17`, `web/scripts/archivar-a-r2.mjs:565`, `redes/enlaces-cortos.mjs`, `reels/openrouter.mjs:93`, `infra/enlaces-cloudflare/worker.mjs:44`, `infra/reloj-cloudflare/worker.mjs:46`, `infra/tareas-cloudflare/tareas.mjs:162-163`, `ingesta/secciones-nuevas.mjs:85`, `comercial/*`, `motor/importar.mjs:243,248`, `docs/etapa-1-fuentes/balcarce-fondo.mjs` | Sólo se usan en pruebas, y la mayoría son ayudas para que la prueba vuelva a empezar limpia (`olvidarElIndice`, `soltarEnlacesCortos`, `reiniciarEstadoDelProceso`) o controles de tablas. | bajo | **Dejar** (son ganchos de prueba, no basura) |

### B. Módulos y archivos que nadie ejecuta ni importa (salvo pruebas o a mano)

| Qué | Dónde | Evidencia | Riesgo | Recomendación |
|---|---|---|---|---|
| `redes/texto-por-red.mjs` entero (`textoParaRed`, formatos de Threads, X, Telegram, Bluesky, TikTok, YouTube) | `redes/texto-por-red.mjs` (≈ 40 exportaciones) + `pruebas/texto-por-red.test.mjs` | Ningún programa de `redes/`, `reels/`, `web/` ni workflow lo importa. Su propio encabezado dice "Esta función NO publica nada" y que las redes "todavía no tienen cuenta". `CLAUDE.md:220` lo lista en "Dónde tocar" como si mandara el texto de cada red; no manda: los textos reales los arman `mensajeDeNota` y `pieDePieza`. | medio (es trabajo hecho para el día que haya otras redes) | **Mover a histórico** (o dejar y sacarlo de `CLAUDE.md` para que nadie lo toque pensando que cambia Facebook) |
| `comercial/` (`base`, `esquema`, `importar-osm`, `propuestas`, `verificar`, `vigencia`, `vista`, `datos/`) | `comercial/` | Ningún workflow ni programa fuera de `comercial/` y sus pruebas lo llama. `COMERCIAL.md:50` lo admite ("Hoy nada lo llama fuera de su prueba"). `CLAUDE.md` no lo nombra. | medio (hay datos reales de comercios, `comercios.json`, `calles.json`) | **Dejar**, pero agregarlo al mapa de `CLAUDE.md` |
| `motor/importar.mjs`, `motor/esquema.sql` | `motor/` | Cimientos de una base D1 del "motor nuevo"; sólo los toca su prueba. `motor/README.md` dice "ninguno toca producción". `CLAUDE.md` no lo nombra. | medio | **Dejar** o **mover a histórico** si el motor definitivo es Workers Builds (`infra/motor-cloudflare/`) y D1 se descartó. Decide quien lleve la mudanza |
| `docs/etapa-1-fuentes/afinar.mjs`, `balcarce-fondo.mjs`, `generar-revision.mjs` | `docs/etapa-1-fuentes/` | Son programas dentro de `docs/`, contra `CLAUDE.md` ("Sin programas adentro"). `generar-revision.mjs` sólo rehace `REVISION-FUENTES.html`; `afinar.mjs` lo importa además `scripts/medir/informe-del-dia.mjs:46` (VERIFICACION_LOCAL), y `pruebas/revision-fuentes.test.mjs`. | medio | **Mover** `afinar.mjs` y `balcarce-fondo.mjs` a `ingesta/` o `scripts/medir/`; el generador, a `scripts/medir/` |
| `reels/guion-del-dia.mjs`, `reels/catalogo-plantillas.mjs`, `reels/ejemplos-plantillas.mjs` | `reels/` | Herramientas a mano que los documentos nombran (`docs/redes/GUION-DEL-DIA-EJEMPLO.md`, `docs/01-ARBOL.md:189`). `ejemplos-plantillas` sí lo importan pruebas y el catálogo. Ningún workflow. | bajo | **Dejar** |
| `scripts/medir/armar-reglas-html.mjs`, `repetidas-2-0.mjs`, `secciones-por-dia.mjs`, `tarjetas-por-vuelta.mjs` | `scripts/medir/` | Mediciones a mano (así las define `CLAUDE.md`). Ninguna prueba ni workflow. | bajo | **Dejar** |
| `web/scripts/hacer-iconos.mjs` | `web/scripts/` | Se usó una vez para hacer los iconos; sólo lo nombran documentos. | bajo | **Dejar** o mover a `scripts/` |
| `comercial/importar-osm.mjs`, `scripts/migrar-fotos-a-r2.mjs`, `ingesta/listar-fuentes.mjs` | donde dicen | Herramientas de línea de comandos documentadas y probadas. | bajo | **Dejar** |
| `ingesta/secciones-nuevas-sombra.mjs` | `ingesta/` | Sólo lo usa `scripts/medir/informe-del-dia.mjs`; el interruptor que lo justificaba se sacó (ya está anotado como B5 en `docs/etapa-10-operacion/AUDITORIA-INTEGRAL-23-10.md:63`). | bajo | **Mover** a `scripts/medir/` |

### C. Variables y configuración incoherentes

| Qué | Dónde | Evidencia | Riesgo | Recomendación |
|---|---|---|---|---|
| `ENLACES_CORTOS` leída pero nunca pasada | lee: `redes/enlaces-cortos.mjs:95`, `redes/publicar.mjs:311`. No está en ningún `.github/workflows/*.yml` ni en `infra/motor-cloudflare/cargar-variables.mjs` | `CLAUDE.md` y la regla 282 dicen "variable `ENLACES_CORTOS` = Si". En GitHub Actions el programa recibe `env.ENLACES_CORTOS` vacío aunque la variable exista en GitHub, porque los workflows `redes.yml`, `piezas.yml` y `actualizar.yml` no la declaran en `env:`. Sólo el Worker de enlaces (`infra/enlaces-cloudflare/wrangler.toml`) la menciona, y ése no publica. | **medio** (hoy está apagada y funciona; el día que la prendan, no pasará nada y nadie sabrá por qué) | **Arreglar antes de prenderla**: sumarla al `env:` de los workflows de redes (o decirlo en la regla 282) |
| `FOTOS_EN_R2` leída pero nunca pasada | lee: `infra/compartido/fotos-r2.mjs:29`, `infra/motor-cloudflare/vuelta.mjs:94`. No está en ningún workflow ni en la lista `VARIABLES` de `cargar-variables.mjs` | `docs/etapa-10-operacion/FOTOS-EN-R2.md:3` dice "variable de GitHub y de Workers Builds". Pero «Cargar variables del motor» no la manda a Workers Builds ni `actualizar.yml` a Actions. Sólo existe si alguien la carga a mano en el panel de Cloudflare. | **medio** | Sumarla a `VARIABLES` de `cargar-variables.mjs` y a los `env:` que correspondan antes de seguir el paso 5 del documento |
| `SECCIONES_NUEVAS` pasada pero nunca leída | ver tabla A | idem | bajo | Borrar |
| `FACEBOOK_COMO_FOTO`, `REELS_ESCENAS`, `MEMORIA_DE_ACA`, `CRUCE_COHERENTE`, `INGESTA_PERMITIR_VACIA`, `ARCHIVO_PERMITIR_BAJA`, `AUDITORIA_SIN_CORREGIR`, `TARJETAS_SIN_CACHE`, `META_PAGE_ID`, `ARCHIVO_ESTADO_URL`, `AVISOS_URL`, `CLOUDFLARE_SITE_TAG` | los lee el código (`redes/publicar.mjs:95`, `reels/plan.mjs:183`, `ingesta/cruce.mjs:89,95`…) | Ningún workflow las pasa. Son interruptores de apagado de emergencia ("sin la variable, todo como siempre") o llegan de otro modo (secretos en el Worker). No hay contradicción con los documentos, pero tampoco se pueden usar desde GitHub sin tocar el workflow. | bajo | **Dejar**; anotar en `docs/08-INFRAESTRUCTURA.md` cuáles se pueden tocar sin tocar un workflow |
| Variables de GitHub que nadie lee | `GITLAB_REPO` (`respaldo.yml`), `INFORME_RESPALDO_EN_GITHUB` (`informe-diario.yml:46`), `REDES_ACTIVAS_NUBE` (`desplegar-nube.yml:93`) | Se usan sólo dentro del workflow (condición o `--var`); no hay lector en programa. Es correcto, no es un hallazgo. | — | **Dejar** |
| `muy-contadas.json` | escribe `web/scripts/generar-datos.mjs:1339`; lista de "sólo para armar los datos" en `huella-del-sitio.mjs` | Nadie lo lee con programa: es para que Hernán mire títulos. | bajo | **Dejar** |

### D. Workflows

| Qué | Dónde | Evidencia | Riesgo | Recomendación |
|---|---|---|---|---|
| `reloj-cloudflare.yml` y `vigilante-cloudflare.yml` | `.github/workflows/` | Hacen lo mismo que `desplegar-nube.yml` con `que=reloj` y `que=vigilante` (que además sabe el orden y los bindings). Cada uno sube el Worker de siempre con `wrangler deploy`. `CLAUDE.md` todavía manda a "correr a mano «Reloj de Cloudflare»". | medio (es el camino que `CLAUDE.md` recuerda) | **Dejar** uno de los caminos: o borrar estos dos y cambiar `CLAUDE.md`, o dejarlos y que `desplegar-nube` sea sólo para la mudanza. Hay tests: `pruebas/reloj-nube.test.mjs`, `pruebas/vigilante-nube.test.mjs` |
| `ensayo-nube.yml` y `motor-ensayo.yml` | `.github/workflows/` | Los dos son ensayos manuales de la mudanza (uno pide a las tareas simular; el otro despierta el motor). Sin pruebas ni documentos que los nombren. | bajo | **Dejar** hasta cerrar la mudanza; después **borrar** |
| `motor-estado.yml`, `reloj-estado.yml`, `motor-variables.yml` | idem | Diagnóstico de la mudanza; los nombra `docs/TRASPASO.md`. | bajo | **Dejar** hasta cerrar la mudanza |
| `probar-ilustraciones.yml` y `probar-imagenes.yml` | idem | Dos formas de probar lo mismo (modelos de imágenes); ninguna prueba ni documento vivo las nombra. | bajo | **Borrar** una (la de `probar-imagenes`, que usa el Worker del 16/10) o fusionarlas |
| `diagnostico-instagram.yml`, `ver-facebook.yml`, `reparar-estadisticas.yml`, `probar-mail.yml`, `probar-gemini.yml`, `auditar-voz.yml`, `compactar-historial.yml` | idem | Manuales, de diagnóstico. Los documentos del índice los describen (`docs/01-ARBOL.md`, `docs/08-INFRAESTRUCTURA.md`); `compactar-historial.yml` lo cita `docs/etapa-10-operacion/MENOS-COMMITS.md` como parte del plan. | bajo | **Dejar** |
| Cron propios: `armado-vacio.yml` (lunes 9:17), `pruebas.yml` (lunes 6:17), `pruebas-otra-hora.yml` (lunes 8:43), `auditoria.yml` (lunes 12:00), `respaldo.yml` (domingos), `informe-diario.yml` (respaldo) | idem | Corren por reloj de GitHub, no por el Worker. Coinciden con lo documentado, pero `CLAUDE.md` dice "Todo… disparado por el Worker". | bajo | **Dejar**; aclarar en `CLAUDE.md` que estos son semanales y propios |

### E. Documentos y comentarios que describen cosas que ya no existen

| Qué | Dónde | Evidencia | Riesgo | Recomendación |
|---|---|---|---|---|
| "La próxima regla es la 284" | `CLAUDE.md` (sección de reglas) | `docs/10-REGLAS-Y-PRUEBAS.md` tiene filas hasta la 307. | bajo | **Corregir** |
| "`docs/` … sin programas adentro" | `CLAUDE.md` (mapa) | Hay 3 `.mjs` en `docs/etapa-1-fuentes/` (ver tabla B). | bajo | Corregir el mapa o mover los programas |
| El mapa de `CLAUDE.md` no nombra `motor/`, `comercial/`, `infra/` | `CLAUDE.md` | Existen y tienen pruebas. | bajo | Agregar una línea |
| `redes/destinos.mjs` "ya lo prevé" | `docs/redes/AUTOMATIZAR-REDES-ALTERNATIVAS.md:109` y `FORMATOS-POR-RED.md` | El archivo se sacó el 17/10 (`docs/00-INDICE.md:138`). | bajo | Corregir la frase |
| Paso 6 "Probar: `node web/scripts/podcast-feed.mjs …`" | `docs/seo/AUDITORIA-FEEDS.md:203` | Se borró el 17/10 (el mismo documento lo dice en `:134`). | bajo | Quitar el paso o marcarlo como borrado |
| `CLAUDE.md`: "Estado (17/10/2026)" y "Mudanza a Cloudflare, escrita y probada…, sin prender (18/10)" | `CLAUDE.md` | `docs/TRASPASO.md` dice que la mudanza está hecha; ya lo anota `AUDITORIA-INTEGRAL-23-10.md` como M8. | bajo | Corregir (ya está en la otra auditoría) |
| `docs/REGLAS-Y-PROMPTS.html`, `docs/COMO-FUNCIONA-HOY.html`, `docs/COMO-SE-ELIGE-UNA-NOTA.html`, `docs/RADAR-COMO-FUNCIONA.html`, `docs/RESUMEN-Y-PENDIENTES.html`, `docs/HOY.html`, `docs/FOTOS-ANTES-Y-DESPUES.html` (≈ 900 KB) | `docs/` | Fotografías de un momento (algunas con copias del prompt de la IA). Ningún programa las regenera. Ya anotado como B9 en la otra auditoría. | bajo | **Mover a histórico** las que no se regeneren |
| `docs/flujo/` y `docs/flujos/` | `docs/` | Dos carpetas con nombre casi igual y contenido distinto. | bajo | Unir |
| `docs/criterio/PROMPT-V2-CANDIDATO.txt`, `CRITERIO-EDITORIAL-PROPUESTA.md`, `PROPUESTA-EDICION-V2.md` | `docs/criterio/` | Versiones candidatas del criterio; sólo las citan documentos y un comentario de `ingesta/fuentes-para-la-ia.mjs`. Quien manda es `CRITERIO-EDITORIAL.md` (único para la IA). | bajo | **Mover a histórico** |

## Lista segura para borrar ya

Sin riesgo: ninguna tiene pruebas que dependan de ella, ni lectores, ni documentos que se rompan.

1. `armarRecuperado`, función exportada de `infra/vigilante-cloudflare/worker.mjs:512` (hasta el final de la función).
2. `ultimosDiasConNumeros`, función de `ingesta/estadistica-seleccion.mjs:326`.
3. `export const SECCIONES_DE_LA_FICHA = seccionesDeLaFicha();`, `ingesta/lectura-ia.mjs:51`.

Casi segura (hay que tocar en el mismo paso, y correr `npm test`):

4. `'SECCIONES_NUEVAS'` de `VARIABLES_DEL_SITIO` (`web/scripts/huella-del-sitio.mjs:29`) **y** sus 7 líneas `SECCIONES_NUEVAS: ${{ vars.SECCIONES_NUEVAS }}` en `actualizar.yml` (157, 174, 190, 287, 351), `cloudflare-deploy.yml:80` y `motor-variables.yml:51`. La huella cambia una vez, así que habrá una compilación extra.
5. `datosDeFecha`, `parecidoEntreTextos`, `medirCambiosDeFoto`, `publicadasDelDia` y las aserciones de prueba que sólo las nombran (`verificador-copia-fechas-letras.test.mjs:163-168`, `entrada-ampliada.test.mjs:181-182`, `foto-cambiada.test.mjs:209`, `estadistica-seleccion.test.mjs:191-192`).

No borrar sin hablar: `sePuedeSola`, `agruparPorHecho`, `redes/texto-por-red.mjs`, `comercial/`, `motor/`, `FechaExacta`, los dos pares de workflows de reloj/vigilante, y los dos interruptores `ENLACES_CORTOS` y `FOTOS_EN_R2` (esos hay que **arreglar**, no borrar).

*Lo que no se pudo confirmar:* si `sePuedeSola` y `TAMBIEN_REEL_EN_FACEBOOK` replican en otro lado lo que hoy deciden las redes (requiere leer `redes/elegir.mjs` y `redes/piezas.mjs` completos con el criterio de redes en la mano); y qué variables de GitHub están realmente cargadas en el repo (sólo se vio lo que los archivos declaran, no el panel de GitHub ni el de Cloudflare).
