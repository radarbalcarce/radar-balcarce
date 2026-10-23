# Auditoría integral del 23/10/2026: reglas, números y criterios para la versión 2.0

*Auditoría de lectura: no se cambió ningún programa, prueba ni configuración. Se leyó el código de `main` al 23/10 a la tarde (después de
las reglas 284 a 288) y se probaron cinco casos con el código real, desde un archivo aparte que no quedó en el repositorio. Completa y
corrige lo que ya dicen `docs/CATALOGO-DE-NUMEROS.md` y `docs/etapa-10-operacion/MENOS-COMMITS.md` (no repito lo que ya está bien
explicado ahí). Las decisiones del dueño se toman como dadas: lo que sigue es lo que las contradice.*

## Resumen en diez renglones

1. **La regla 288 ("8 medios o más no se frena") quedó a medias.** La ingesta la cumple, pero el segundo semáforo (el que mira el texto
   completo de las fuentes y lo que escribió la IA) sólo suelta lo de Balcarce: una historia de 20 medios con "nene" en el texto de una
   fuente queda amarilla, y como lo amarillo de afuera ya no le llega a nadie, **no sale** (probado).
2. La lista "internacional" (Trump, Putin, Casa Blanca en el título) y la de "cotización del dólar" **siguen frenando lo de 8 medios o
   más** (probado: Trump-Lula con 12 medios; "el riesgo país supera los 700 y el dólar oficial…" con 16).
3. **Antes de contar medios** se tiran notas una por una por la sección que les pone el medio (`/policiales/`, `/seguridad/`, `/mundo/`,
   `/futbol-internacional/`) y por "fútbol no argentino". Así la excepción del policial nacional nunca ve esas notas y lo muy contado
   pierde medios en la cuenta.
4. **La excepción "muerte de un famoso" en Policiales no funciona con 3 a 7 medios**: la palabra "murió" o "asesinaron" la deja
   amarilla y no sale nunca (probado). Sólo anda con 8 o más, que ya salían por la otra excepción.
5. **Lo de Balcarce también se pierde a las 12 horas** sin salir (no tiene excepción en la ventana de estreno). El 22/10 llegaron 72
   historias de acá y salieron 22 (parte son repetidas, pero 10 cayeron en "otros" y 3 sin cuerpo sólo en la sección Balcarce).
6. **El "8" vive en cinco lugares** (dos sin ninguna prueba que los iguale) y **el "24" de lo muy contado en cuatro**, con nombres distintos.
7. Hay **tres listas distintas** para decidir si algo "tiene un argentino": el semáforo usa una, la IA y el descarte usan otra (que no
   conoce a Estudiantes ni a Nico Paz) y fútbol una tercera.
8. **Documentos que contradicen al código en reglas centrales**: `CRITERIO-EDITORIAL.md` dice a la vez "Policiales de afuera no sale
   nunca" y "salvo 8 medios"; dice que lo muy contado sigue frenado por "acusados" y "el extranjero"; `CLAUDE.md` sigue diciendo que todo
   corre en GitHub y que la mudanza está "sin prender".
9. Tres reglas en producción **no tienen número ni fila** en `docs/10-REGLAS-Y-PRUEBAS.md` (policial nacional, fútbol sólo argentino,
   Balcarce sin amarillo del 22/10), y la 96 y la 200 siguen descriptas como vigentes cuando ya no lo son del todo.
10. Restos de épocas viejas que no hacen nada (`aflojaParaLoDeAca`, `AMARILLO_QUE_SE_SUELTA_*`, `MOTIVO_CUPO`, `reservaParaLocales`) y
    textos que siguen diciendo "sin relación con Balcarce". Se pueden sacar sin cambiar nada de lo que se publica.

---

## Hallazgos

Severidad: **alta** = hoy deja de salir algo que el dueño decidió que salga (o al revés); **media** = contradicción que puede romper
algo en el próximo cambio, o un dato que engaña; **baja** = prolijidad, código muerto, texto viejo.

| # | Sev. | Dónde | Qué pasa | Qué propongo |
|---|---|---|---|---|
| A1 | **alta** | `reels/reescritura.mjs:674` (y `:1325`, `:1424`) | El semáforo de la redacción mira el texto completo de cada fuente, los resúmenes de todos los medios y lo que escribió la IA. Suelta el amarillo **sólo si es de acá** (`esDeAca`), no si lo cuentan 8 medios o más. Cuantos más medios, más textos y más chances de un "nene", "niño" o "una chica de 16 años" en algún párrafo. Probado: nota de 20 medios, "saludó a un nene" en el texto de la fuente → `amarillo`. Lo amarillo de afuera no va a ningún celular (regla 200): **no sale**. Contradice la regla 288 y explica parte de lo muy contado que no sale. | Usar la misma condición que la ingesta (`esDeAca(nota) \|\| cuantosMedios(nota) >= MUY_CONTADA.medios`), con una prueba con el caso de Messi en España (26 medios). El rojo sigue igual. |
| A2 | **alta** | `ingesta/ingesta.mjs:924-934` | La liberación de 8+ medios (`:908`) sólo suelta las palabras sensibles. Después siguen la lista `cotizacion` y la lista `internacional`, que frenan igual. Probado: "Trump recibió a Lula en la Casa Blanca" con 12 medios → amarillo "internacional: sin relación con Balcarce". El 23/10, 5 historias de 8 a 16 medios cayeron por "cotización". Contradice "≥8 no se frena por extranjero" (la regla 288 lo sacó de la IA, no del semáforo). | Internacional: no aplicarla con 8 medios o más (ya decidido). Cotización: ver decisión D2. |
| A3 | **alta** | `ingesta/ingesta.mjs:485-515` (`motivoDeDescarte`), `ingesta/fuentes.mjs:1301-1318` | Se descarta **nota por nota, antes del cruce** (o sea, antes de saber cuántos medios cuentan lo mismo): lo que el medio pone en `/policiales/` o `/seguridad/`, en `/mundo/`, `/internacional/`, `/futbol-internacional/`, `/america/`…, y el fútbol "no argentino". Consecuencias: (a) un policial de 8+ medios o la muerte de un famoso que los diarios publican en `/policiales/` nunca llega a la excepción de `policial-nacional.mjs`; (b) los medios que lo publicaron en esas secciones no suman, y una historia de 9 medios puede contarse como de 6; (c) la excepción de "otro país" usa `CONEXION_ARGENTINA` (ocho palabras: argentina, milei, malvinas, boca, river…), así que una nota de Estudiantes o de Nico Paz en una de esas secciones queda afuera. | Que estos filtros **marquen** en vez de tirar, y que se apliquen después del cruce, con la cuenta de medios a la vista (lo de 8+ y el policial nacional pasan; el resto se saca igual que hoy). Cambio con prueba; no es de una línea. |
| A4 | **alta** | `ingesta/policial-nacional.mjs:1-8`, `ingesta/ingesta.mjs:848-852` y `:908` | La excepción "Policiales de afuera sale con la muerte de un famoso (con 3 medios)" choca con el semáforo: en Policiales `laMuerteFrena` da siempre sí, "murió", "asesinaron" o "asesinato" dan amarillo, y con menos de 8 medios no se suelta. Probado: "Asesinaron al cantante Juan Pérez en Rosario" con 4 medios → amarillo; con 9 → verde. El propio comentario dice "una muerte sigue esperando a una persona", pero lo de afuera no le llega a ninguna persona. **La mitad de la regla no hace nada.** | Decisión D4: o se suelta el amarillo de muerte cuando `muerteDeFamoso` da sí (el rojo sigue), o se saca esa mitad de la regla y de los documentos. |
| A5 | **media** | `web/scripts/generar-datos.mjs:450` y `:527` | La ventana de estreno (12 h; 24 con 8+ medios) se aplica igual a lo de Balcarce. Un medio de acá que publica tarde, o una nota que espera cuerpo, se pierde a las 12 horas. Datos del 22/10: 72 historias de acá, 22 publicadas; en la sección Balcarce, 10 en "otros" y 3 sin cuerpo. Choca con "Balcarce entra todo"; el traspaso ya anota "36 h para lo local" como pendiente. | Decisión D5. |
| A6 | **media** | `CRITERIO-EDITORIAL.md:90-91`, `:120`, `:159`, `:179-181`, `:217-218`; `ingesta/criterio.mjs:180`; `CLAUDE.md:117`, `:129` | Dicen "Policiales de afuera no sale nunca" (el mismo documento dice en `:130` "salvo 8 medios o la muerte de un famoso"); dicen que lo muy contado sigue frenado por "acusados, chimentos, el extranjero" (`:120`), contra la regla 288; Fútbol "de la liga de Balcarce a la Selección" sin el filtro de Primera y argentinos. La IA no lee esa parte (sólo la § 12), pero `CLAUDE.md` y el criterio son lo que leen los agentes antes de tocar código: es la receta para que alguien "arregle" volviendo atrás. | Reescribir esos renglones con las reglas 286 a 288, el policial nacional y el fútbol argentino (arreglo seguro S9). |
| A7 | **media** | `docs/10-REGLAS-Y-PRUEBAS.md` | Sin fila ni número: el policial nacional (`POLICIAL_NACIONAL`, 8 medios o muerte de famoso), el fútbol sólo de Primera y argentinos (`FUTBOL_SOLO_ARGENTINO`, `ingesta/futbol-primera.json`) y "lo de Balcarce no espera por amarillo" (22/10, `liberadaPor`). La 96 ("lo de acá espera menos") sigue escrita como vigente y la 200 sigue diciendo "cinco por día". La casa dice: regla nueva, fila nueva. | Anotarlas (289 a 291) con sus pruebas; marcar la 96 como reemplazada y la 200 como parcialmente reemplazada. `CLAUDE.md:45` dice "la próxima regla es la 284": es la 289. |
| M1 | **media** | `ingesta/criterio.mjs:216`, `web/lib/archivo.js:329`, `ingesta/policial-nacional.mjs:12`, `web/scripts/generar-datos.mjs:1327`, `ingesta/criterio.mjs` (`REESCRITURA.fuentesParaDosIntentosExtra`) | El "8 medios = súper relevante" está escrito cinco veces. Sólo `MEDIOS_MUY_CONTADA` tiene una prueba que lo iguala. `POLICIAL_NACIONAL.medios` no está en la tabla del criterio ni tiene prueba; `muy-contadas.json` usa un `8` pegado en el código. Si Hernán mueve el 8 a 7, el policial nacional y el registro de muy contadas quedan en 8 sin que nadie se entere. | Un solo número (`MUY_CONTADA.medios`) y que los demás lo lean. `fuentesParaDosIntentosExtra` puede quedar aparte si se explica por qué es otro concepto. |
| M2 | **media** | `ingesta/criterio.mjs:160`, `:222`, `:224`; `web/lib/archivo.js:330` | Cuatro "24" para la misma idea ("hasta cuándo una historia de 8+ medios es noticia"): `PORTADA.horasParaEstrenarMuyContada`, `MUY_CONTADA.horasDelHecho`, `MUY_CONTADA.horasDeLaUltimaNota` y la copia de la web. Hoy coinciden porque lo controla una prueba y un comentario. | Dejar uno solo en la tabla (`MUY_CONTADA.horasDelHecho`) y que los otros sean ese. |
| M3 | **media** | `web/lib/archivo.js:27`, `:191`, `:204`, `:324-330`; `redes/informe-diario.mjs:48` | Las copias de la web (36, 12, 24, 8, 180, 3.700) existen "porque la web no puede importar de `ingesta/`". Es falso: `web/lib/datos.js:19` ya importa `ingesta/criterio.mjs` (que no importa nada). Además el informe diario tiene su propia copia `TOPE_DE_NOTAS = 3700`, cuando en producción el tope es 500 (`TOPE_DE_NOTAS`): el mail dice "498 de 3.700 (13 %)". | Importar de `criterio.mjs` y borrar las copias; el informe, que use `topeDeNotas()` de `web/lib/archivo.js`. Sin cambio de comportamiento. |
| M4 | **media** | `ingesta/fuentes.mjs:1335` (`CONEXION_ARGENTINA`), `ingesta/exenciones.mjs:90-93` (`tituloConArgentino`), `FIGURAS`, `ingesta/futbol-primera.json` | Tres respuestas distintas a "¿tiene un argentino?". El semáforo usa una (con Caputo, Bullrich, Casa Rosada); la IA ("es del extranjero", `ingesta/lectura-ia.mjs:505`) y el descarte por sección usan otra, sin clubes; el fútbol usa la lista de Primera y argentinos afuera. El 23/10 la IA sacó a Estudiantes en la Libertadores y a Marcos Rojo con el TAS por "extranjero" (el catálogo lo documenta). Con 8+ ya no; con 3 a 7, sí. | Una sola función `conArgentino(nota)` que junte las tres listas (más la de fútbol) y que la usen los tres lugares. |
| M5 | **media** | `ingesta/lectura-ia.mjs:508` y `:762` | La IA y el juntar repetidas cuentan medios por nombre (`n.medios.length`); el semáforo y la popularidad, con `contarMedios` (los del mismo dueño cuentan uno). La misma historia puede ser "8" para la IA y "6" para el semáforo. | Usar `contarMedios` en los dos lugares. |
| M6 | **media** | `web/scripts/generar-datos.mjs:1315-1333`, `web/data/muy-contadas.json` | El registro de lo muy contado que no sale dice "otros" en 94 de 140 casos del 23/10, con el motivo "sección Fútbol" (o sea, era verde). Entre ellos, Scaloni hasta 2030 (18 medios), la visita del Papa (24), la Ley de Tierras (21). No se sabe si esperaban cuerpo, si estaban en la cola de la IA, si llegaron tarde (antes de la regla 287) o si se unieron a una ya publicada con otra dirección. Una entrada de la mañana queda todo el día aunque la historia haya cambiado. Así no se puede contestar el pedido de Hernán ("ver qué pasó con las de 10 o más"). | Separar "esperando cuerpo", "en la cola de la redacción", "llegó tarde" y "unida a otra"; volver a mirar la entrada en cada vuelta; usar `MUY_CONTADA.medios`. |
| M7 | **media** | `ingesta/fuentes.mjs:1613-1614`, `ingesta/ingesta.mjs:556`, `:929-930`, `:950`, `redes/informe-diario.mjs:217`, `ingesta/lectura-ia.mjs:88-91`, `ingesta/perfil-balcarce.md:11`, `docs/03-SELECCION.md:129`, `scripts/medir/informe-del-dia.mjs:777` | Siguen hablando de "relación con Balcarce": el motivo `'internacional: sin relación con Balcarce'` sale en la estadística y en el mail; el comentario de `:950` dice "la lectura con IA igual saca lo que no tenga relación con acá" (falso desde la regla 286); la instrucción de la IA le sigue pidiendo `impacto` y `razon: "ninguna"`, que ya no deciden nada (tokens gastados en cada pedido); el perfil dice "lo nacional que no cambia nada concreto" no es de Balcarce (correcto para el ámbito, pero empuja a la IA a pensar en "relación"); el informe a mano todavía dice "Fútbol y Deportes 4". | Cambiar textos y comentarios (seguro). Lo de `impacto` en la instrucción: el panel lo muestra (`web/public/panel/textos.js:85`), así que se saca sólo cuando se rehaga el panel. |
| M8 | **media** | `CLAUDE.md:28`, `:92`, `:105`, `:153`, `:177`, `:229` | "Todo en GitHub Actions", "GitHub Actions regenera `web/data/`", "mudanza… sin prender (18/10)", "qué archivos guarda: la línea `git add` de `actualizar.yml`", "tope de 3.700 notas a ~46 por día", "Vigilancia cada 3 horas". El traspaso dice que la mudanza está **hecha**, el motor guarda lo que dice `infra/motor-cloudflare/archivos.mjs`, el tope es 500 y se publican ~120 notas por día; la vigilancia dejó 10 commits en 24 h (ni 3 h ni 24 h). | Poner `CLAUDE.md` al día con el estado real (seguro). |
| M9 | **media** | `ingesta/criterio.mjs:237-242` (`ESPERA_PERSONA.deAcaPorDia`), `panel/celular-datos.mjs:32` | Lo de acá que todavía queda amarillo (parece promoción, verificación baja, espera de la lectura) va al celular **como mucho 5 por día**; la sexta no la ve nadie y no sale. Es un cupo de la época de los cupos. | Decisión D7. |
| M10 | **media** | `pruebas/futbol-y-policial-nacional.test.mjs:103-107` vs `ingesta/futbol-argentino.mjs` | La prueba de la regla 288 asegura que "un clásico europeo que cuentan todos" (9 medios) **no** lo saca la IA. Pero el filtro de fútbol lo tira antes del cruce. Dos decisiones del dueño chocan: "fútbol de afuera sólo Primera y argentinos" y "8+ es súper relevante". La prueba fija una que el sistema no cumple. | Decisión D6 y ajustar la prueba a lo que se decida. |
| B1 | baja | `ingesta/ingesta.mjs:854-856`, `:899-901`; `reels/reescritura.mjs:664-667`; `ingesta/fuentes.mjs:1657-1658` | `aflojaParaLoDeAca`, `AMARILLO_QUE_SE_SUELTA_EN_LO_DE_ACA`, `AMARILLO_QUE_SE_SUELTA_SI_LA_CONFIRMAN` y el parámetro `corroborada`: desde el 22/10 lo de acá suelta **todo** el amarillo, así que estas listas no cambian ningún resultado. Las pruebas `pruebas/semaforo.test.mjs:42-75` las siguen recorriendo. | Borrar (o reutilizar si se decide soltar "acusados" en lo de afuera con 3+ medios, propuesta 1 del catálogo). |
| B2 | baja | `ingesta/ingesta.mjs:1483-1488`, `:1515-1519` | `MOTIVO_CUPO` y `esperaPorElCupo` reponen notas que esperaban "por el cupo" (sacado el 17/10); ya no queda ninguna guardada así. `motivoAntesDelCupo` se reusa para Policiales con un nombre que confunde. | Borrar lo del cupo y renombrar a `motivoAntes`. |
| B3 | baja | `ingesta/criterio.mjs:119-123`, `reels/reescritura.mjs:1299`, `CRITERIO-EDITORIAL.md:868` | `REESCRITURA.reservaParaLocales` (80) sólo actuaría pasados 370 pedidos en un día; el máximo medido fue 191. El comentario dice lo contrario de lo que pasa. | Sacarla (número, fila de la tabla y prueba `pruebas/reescritura.test.mjs:471`). |
| B4 | baja | `ingesta/ingesta.mjs:848-852` | `laMuerteFrena` mira "Balcarce, de acá, la zona", que ya se sueltan todos; sólo le quedan Policiales y lo de un solo medio. | Simplificar al revisar A4. |
| B5 | baja | `ingesta/secciones-nuevas-sombra.mjs` | Un ensayo "en sombra" de secciones que sólo usa `scripts/medir/informe-del-dia.mjs`. El interruptor que lo justificaba se sacó. | Borrar con el informe a mano o pasarlo a `scripts/medir/`. |
| B6 | baja | `CRITERIO-EDITORIAL.md:957` vs `ingesta/criterio.mjs` (`COPIA_MAXIMA` 12) | La instrucción de la IA dice "nada de más de diez palabras seguidas"; el verificador rechaza desde 12. Puede ser margen a propósito, pero no está escrito en ningún lado. | Escribir en la tabla que 10 es lo que se pide y 12 lo que se rechaza, o igualar. |
| B7 | baja | `CRITERIO-EDITORIAL.md:236`, `:819`, `:882`; `CLAUDE.md:81` | "Hasta 5 por día" al celular; "a unas 46 por día" (son ~120); "se reintenta hasta tres veces" (con 5 medios son 4 y con 8, 5). | Corregir textos. |
| B8 | baja | `pruebas/criterios-extranjero-zona.test.mjs:85` | La prueba compara el **texto** del código con una expresión regular. Cualquier cambio de forma la rompe aunque la regla siga igual. | Reemplazarla por una prueba de comportamiento (una nota de 80 horas de un feed de acá no entra). |
| B9 | baja | `docs/REGLAS-Y-PROMPTS.html`, `docs/flujo/GUIA-DEL-FLUJO.html`, `docs/flujo/FLUJO-NUEVO*.html`, `docs/flujo/INFORME-DE-HOY.html` | Copias viejas de las instrucciones de la IA y de reglas superadas ("Fútbol y Deportes 4", "impacto nulo"), en la carpeta de documentos vivos. | Regenerar `REGLAS-Y-PROMPTS.html` y pasar el resto a `docs/historico/`. |

---

## Los números: dónde viven y qué hacer con cada uno

Sólo los que importan para la selección y el peso. "Una fuente" = está en `ingesta/criterio.mjs` y en la tabla de
`CRITERIO-EDITORIAL.md` § 11, con prueba que los iguala. Coincido con el catálogo salvo donde digo otra cosa.

| Número | Qué es | Dónde vive (y copias) | ¿Por qué escrito? | Propongo |
|---|---|---|---|---|
| **12 h** | Estreno de lo que nunca salió | `PORTADA.horasParaEstrenar` + copia `web/lib/archivo.js:324` | Sí (28/09, Hernán) | Dejar para lo de afuera. **Para Balcarce, 36** (D5). Borrar la copia (M3). |
| **24 h** | Estreno y "muy contada" con 8+ | 4 lugares (M2) | Sí (regla 287) | Uno solo. Dejar el valor. |
| **36 h** | Portada, secciones, buscador | `PORTADA.horas` + copia `archivo.js:27`; `CRUCE.horasDeMemoria` (36, otra idea) | Sí | Dejar. Borrar la copia de la web. |
| **48 h** | Una fuente de otro hecho no envejece la nota; hecho "en desarrollo" del cruce | `HORAS_DE_UN_HECHO` (`archivo.js:291`), `CRUCE.coherente.horasEnDesarrollo` | Sí (regla 194, 184) | Dejar. Ojo: entre 24 y 48 h, una nota vieja pegada por el cruce todavía puede hacer "llegar tarde" a lo muy contado. Medirlo con M6 antes de tocar. |
| **72 h** | Entrada de feeds de acá y raspado; memoria del cruce de acá | `HORAS_DE_UNA_NOTA_NUEVA` (`ingesta.mjs:1551`), `CRUCE.horasDeMemoriaDeAca` | Sí | Si se aprueba D5 (36 h para Balcarce), bajar la entrada a 36 como dice el catálogo; la memoria de acá (72) queda, sirve para no repetir. |
| **8 medios** | "Súper relevante" | 5 lugares (M1) | Sí (regla 197, medido sobre 50 medios) | Uno solo. Revisar si la lista de fuentes crece mucho. |
| **3 / 2 medios** | Mínimo nacional / áreas chicas | `POPULARIDAD` + variables `MINIMO_NACIONAL`, `MINIMO_AREAS_CHICAS` | Sí (regla 260) | Dejar. Agro y Automovilismo: D8. |
| **5 medios** | Lo de afuera que va a redes | `FACEBOOK.mediosParaRedes` | Sí (regla 280) | Lo decide Hernán (catálogo § 2); no contradice nada. |
| **500** | Tope de notas en el sitio (producción) | variable `TOPE_DE_NOTAS`; `TOPE_MINIMO_DE_NOTAS` en `archivo.js` | En el traspaso, **no** en la tabla del criterio ni en `CLAUDE.md` | Anotarlo en la tabla y en `CLAUDE.md`: hoy es el número que manda, no el 3.700. |
| **3.700** | Tope técnico de Cloudflare Pages | `PORTADA.maximoDeNotas`, `MAXIMO_EN_ARCHIVO`, `redes/informe-diario.mjs:48`, `infra/archivo-cloudflare/worker.mjs:3` | Sí (15/10, medido) | Dejar como techo técnico; borrar la copia del informe (M3). |
| **180 días** | Vida de la página | `PORTADA.diasDeArchivo` + copia | Sí | Con 500 notas en el sitio y ~120 por día, una nota está ~4 días en el sitio y el resto en R2. Decir en el criterio que los 180 días los da el archivo R2, no el sitio. |
| **450 / 330 / 80** | Redacciones por día | `REESCRITURA.porDia`, `porDiaSinClaveDeLectura`, `reservaParaLocales` | Sí | Dejar 450 y 330; **sacar 80** (B3). |
| **200 / 60** | Lecturas con IA por día | `LECTURA.pedidosPorDiaConClavePropia`, `pedidosPorDia` (`ingesta/lectura-ia.mjs:65-66`) | Sólo en un comentario, **no** en la tabla | Pasarlos a la tabla del criterio: son de los que limitan de verdad con 3.000 historias por día. |
| **3 (+1, +2)** | Intentos de la IA por nota | `REESCRITURA.intentosMaximos`, `fuentesParaUnIntentoExtra` (5), `fuentesParaDosIntentosExtra` (8) | Sí | Dejar; el 8 de acá, que lea `MUY_CONTADA.medios` si es la misma idea. |
| **7 días** | Memoria de intentos | `REESCRITURA.diasDeIntentos` | Sí | Bajar a 3 (catálogo). |
| **5 por día** | Lo de acá que va al celular | `ESPERA_PERSONA.deAcaPorDia` | Sí | Sacar el tope (D7). |
| **6 h** | Nota grande / muy contada primera | `VENTANA_HORAS`, `HORAS_MUY_CONTADA_PRIMERA` (`web/lib/datos.js:224`, `:268`) | Sí | Dejar. |
| **8** (POLICIAL) | Policial de afuera muy relevante | `ingesta/policial-nacional.mjs:12` | **No** (ni tabla ni regla) | Que sea `MUY_CONTADA.medios` y anotar la regla (A7). |

---

## Peso y ruido en git y en Cloudflare

Lo medido en `MENOS-COMMITS.md` sigue valiendo. Lo que agrego hoy:

- **Commits de las últimas 24 h: 149.** 49 de datos de la portada, 16 del libro de redes, 10 de vigilancia, 9 de la revisión del archivo
  (hasta las 8:14, cuando se pausó), 4 de ilustraciones, 3 de la auditoría IA y el resto, a mano.
- **El repositorio empaquetado pesa 269 MB, y la PC tiene 84 MB más de basura** de empaquetados cortados (`git count-objects`: 18 archivos
  `tmp_pack_*`). Un `git gc` en la PC los limpia; no toca GitHub.
- **Las fotos en el árbol de trabajo: 1.485 archivos, 101 MB**, con unas 500 notas en el sitio. Las fotos de las notas que pasaron a R2
  siguen en git hasta que se prenda la ruta de fotos (`activar_fotos`). Hasta entonces, compactar el historial no sirve: las fotos
  vuelven a entrar.
- **La compilación ya no dibuja 7.400 imágenes por vuelta**: con `TOPE_DE_NOTAS=500` son unas 1.000 (dos por nota). El cuello que queda
  es que **se compila aunque la vuelta no traiga nada nuevo** (madrugada) y que las imágenes de notas que no cambiaron se vuelven a dibujar.
  Las propuestas 1 y 3 de `MENOS-COMMITS.md` § 4 siguen siendo las mejores; la 2 (imágenes sólo de los últimos 14 días) pierde valor con
  el tope en 500.
- **Lo que más se reescribe en cada vuelta**: `banco-fotos.json` (1,7 MB, el más grande de `web/data/`), `archivo.json` (1,7 MB),
  `fichas.json` (0,8 MB) y `portada.json` (0,6 MB). `estadistica-seleccion.json` y `muy-contadas.json` son chicos.
- **Qué podría salir de git** (en este orden, de menos a más riesgo): (1) la basura local con `git gc`; (2) las fotos a R2 y después
  compactar (`MENOS-COMMITS.md` A y B); (3) lo que sólo lee el robot (vigilancia, estadísticas, auditoría, uso e intentos de IA) a R2,
  una vez que el panel y el informe lo lean del Worker de tareas (D); (4) juntar los commits chicos en el de la vuelta (E).
- **Hay dos listas de "qué guarda la vuelta"**: `infra/motor-cloudflare/archivos.mjs` y la línea `git add` de
  `.github/workflows/actualizar.yml`. Una prueba las iguala; cuando se apague el workflow viejo, borrar la segunda.

---

## Pruebas que fijan decisiones viejas o que faltan

**Fijan algo que ya no es así:**

- `pruebas/semaforo.test.mjs:42-75`: recorren `AMARILLO_QUE_SE_SUELTA_*`, que ya no cambian nada (B1).
- `pruebas/reescritura.test.mjs:471`: cuenta con `reservaParaLocales` (B3).
- `pruebas/popularidad-17-10.test.mjs`: usa `motivoAntesDelCupo` (B2).
- `pruebas/futbol-y-policial-nacional.test.mjs:103-107`: asegura que fútbol europeo de 9 medios no se saca, cosa que el filtro de
  fútbol contradice (M10).
- `pruebas/criterios-extranjero-zona.test.mjs:85`: compara texto de código (B8).
- `pruebas/celular.test.mjs`: fija el tope de 5 por día (D7).

**Faltan (cada una cuida una regla del dueño que hoy no tiene guardia):**

- Una nota de 8+ medios con "nene" en el texto completo de una fuente no queda frenada por la redacción (A1).
- Un título con "Trump" contado por 8+ medios no queda amarillo (A2).
- Un policial de 8+ medios publicado en `/policiales/` llega a la excepción (A3).
- La muerte de un famoso en Policiales con 4 medios sale, o la regla se borra (A4).
- `POLICIAL_NACIONAL.medios` y el 8 de `muy-contadas.json` son `MUY_CONTADA.medios` (M1).
- Lo de Balcarce de 13 a 36 horas, si se aprueba D5.

---

## Decisiones que necesita el dueño

Una pregunta por renglón, con lo que recomiendo.

1. **D1. ¿Lo contado por 8 medios o más también salta la lista "internacional" (Trump, Putin, Casa Blanca en el título)?**
   Recomiendo **sí**: es lo que ya se decidió para la IA el 23/10 y hoy el semáforo lo sigue frenando.
2. **D2. ¿Y la lista de cotización del dólar?** Recomiendo frenar sólo los títulos que **empiezan** con "dólar hoy", "a cuánto cotiza"
   o "cotización", así sale "El riesgo país supera los 700 puntos…" (16 medios) y el parte diario sigue afuera.
3. **D3. ¿Un chimento contado por 8 medios o más sale?** Recomiendo **no** (es criterio de la casa, no una palabra suelta); son 3 por día.
4. **D4. ¿La muerte de un famoso en Policiales, con 3 a 7 medios, sale aunque diga "murió" o "asesinaron"?** Recomiendo **sí**, soltando
   sólo esas palabras para ese caso (el rojo, menores y víctimas, sigue igual). Si no, sacar esa mitad de la regla.
5. **D5. ¿Lo de Balcarce puede estrenarse hasta 36 horas después (como dura en portada) en vez de 12?** Recomiendo **sí**: los medios de
   acá publican tarde y las notas esperan cuerpo; "Balcarce entra todo" hoy no se cumple por la hora.
6. **D6. ¿El fútbol de afuera sin argentinos (una final de Champions) sale si lo cuentan 8 medios?** Recomiendo **no**: que mande la
   regla de fútbol, y corregir la prueba que dice lo contrario.
7. **D7. ¿Se saca el tope de 5 por día de lo de acá que va al celular?** Recomiendo **sí**: casi no queda nada amarillo de acá, y lo que
   queda (verificación baja, promoción dudosa) tiene que verlo alguien.
8. **D8. ¿Agro y Automovilismo vuelven a pedir 2 medios?** Recomiendo **sí**: Agro salió 0 de 139 el 22/10 (pendiente desde la regla 288).
9. **D9. ¿Confirman que, además del rojo y la lista "nunca", a Balcarce lo siguen frenando "no es nota" (autobombo, pronóstico de otro
   medio), la efeméride de otro medio y la promoción?** Recomiendo **sí**: no son noticias, pero hoy la frase "sólo el rojo y la lista
   nunca" no es literal y conviene que quede escrita así.
10. **D10. ¿Se prende la ruta de fotos de R2 y después se compacta el historial?** Recomiendo **sí, en ese orden**; compactar antes no
    achica porque las fotos vuelven a entrar.
11. **D11. ¿Se compila aunque la vuelta no traiga nada nuevo?** Recomiendo **no**: subir lo ya compilado cuando no hay cambios.

---

## Arreglos seguros que puede hacer Claude solo

**Ya decididos por el dueño (cumplen la regla 288 o la 286; cambian qué se publica, con prueba cada uno):**

1. **S1.** `reels/reescritura.mjs:674`: soltar el amarillo también con 8+ medios (A1).
2. **S2.** `ingesta/ingesta.mjs:931`: la lista internacional no frena con 8+ medios (A2).
3. **S3.** `ingesta/lectura-ia.mjs:508` y `:762`: contar medios con `contarMedios` (M5).
4. **S4.** La IA no saca por "es del extranjero" una nota de fútbol que pasa `esFutbolArgentino` (M4, primer paso).

**Sin ningún cambio en lo que se publica:**

5. **S5.** Un solo 8: `POLICIAL_NACIONAL.medios` y `generar-datos.mjs:1327` leen `MUY_CONTADA.medios` (M1). Un solo 24 (M2).
6. **S6.** Las copias de `web/lib/archivo.js` importan de `ingesta/criterio.mjs`; el informe diario usa `topeDeNotas()` (M3).
7. **S7.** Borrar `aflojaParaLoDeAca`, `AMARILLO_QUE_SE_SUELTA_*` y `corroborada`, `MOTIVO_CUPO` y `esperaPorElCupo`,
   `reservaParaLocales` (con su fila y sus pruebas), y renombrar `motivoAntesDelCupo` (B1 a B3).
8. **S8.** Textos: el motivo `internacional: sin relación con Balcarce` pasa a `internacional: sin un argentino en el título` (con la
   prueba que lo nombra); comentarios de `ingesta/ingesta.mjs:556`, `:929-930`, `:950`; `redes/informe-diario.mjs:217`;
   `docs/03-SELECCION.md:129`; `scripts/medir/informe-del-dia.mjs:777` (M7).
9. **S9.** Documentos: `CRITERIO-EDITORIAL.md` (renglones de A6 y B7, y el 500 en la tabla), `ingesta/criterio.mjs:180`, `CLAUDE.md`
   (M8, `:45`, `:117`, `:129`), filas nuevas 289 a 291 en `docs/10-REGLAS-Y-PRUEBAS.md` y la 96 y la 200 marcadas (A7).
10. **S10.** `muy-contadas.json` con los motivos separados ("esperando cuerpo", "en la cola", "llegó tarde", "unida a otra") y revisado en
    cada vuelta (M6). Es medir mejor, no cambiar qué sale.
11. **S11.** Las pruebas que faltan (sección anterior) y la de B8 reescrita.
12. **S12.** `REGLAS-Y-PROMPTS.html` regenerado y los HTML viejos de `docs/flujo/` a `docs/historico/` (B9).

**No son seguros (necesitan una decisión o tocan muchos lectores):** A3 (filtrar después del cruce), A4, A5, D7, sacar `impacto` de la
instrucción de la IA (lo muestra el panel), las fotos a R2 y todo lo de `MENOS-COMMITS.md` C a F.
