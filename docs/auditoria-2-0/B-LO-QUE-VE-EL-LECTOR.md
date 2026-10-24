# Auditoría 2.0 · Módulo B: lo que ve el lector en la web

*24/10/2026. Solo lectura: no se tocó código. Se leyó `web/app`, `web/components`, `web/lib`, `web/data/portada.json` y el sitio publicado (`curl`). Donde el código y los documentos no coinciden, manda el código.*

## Resumen (10 líneas)

1. **El número de fuentes no es uno solo.** "Fuentes (N)" cuenta enlaces del desplegable; "contada por N medios" (en `/hoy`), el campo `fuentes` de los datos para agentes y el criterio de "muy contada" cuentan nombres de medios distintos. En 52 de las 111 notas de la portada de hoy no coinciden (41 muestran menos fuentes que medios; 11, más).
2. **La causa es técnica y se arregla en un solo lugar**: las notas escritas por la IA guardan una foto fija de las fuentes del momento en que se escribieron. Los medios que se suman después al cruce quedan en `medios` pero no en el desplegable.
3. **"Redacción asistida con IA, verificada contra las fuentes"** es casi exacto, pero "asistida" sugiere que hay una persona escribiendo con ayuda. Lo que pasa es que escribe la IA y un programa (sin IA) controla números, nombres, fechas y citas. Mejor decirlo así.
4. **"Cómo trabajamos" tiene dos frases viejas**: dice que la nota "enlaza a la nota original justo debajo del texto" (se sacó el 24/10, regla 307, y el sitio publicado todavía lo dice) y dice que una nota que "involucra una muerte" no sale sola (hoy lo muy contado y lo de Balcarce salen sin esa espera; solo el rojo frena).
5. **La firma ("quién la escribió") ahora está escondida** adentro del desplegable cerrado. Es decisión de Hernán del 17/10, pero la página y el pie dicen "una línea al pie, junto al botón": ya no es así.
6. **Fechas**: coherentes entre portada, sección, nota y JSON-LD en lo central. Tres grietas: las 7 notas "sin fecha de la fuente" muestran "Publicado: día y hora" con la hora en que las vimos; "ayer" es "entre 24 y 47 horas", no el día calendario; el JSON-LD puede decir "modificada" por una aprobación que la página no muestra.
7. **Placa**: se muestra solo cuando no hay foto ni ilustración con IA (27 % de la portada de hoy). Dice el nombre de la sección y un dibujo, no "el titular" como afirma "Cómo trabajamos".
8. **Nombres de secciones distintos según el lugar**: la etiqueta dice "Cultura" y "Tecnología e IA", pero el título de la sección y los bloques de la portada dicen "Cultura y agenda" y "Tecnología".
9. **Privacidad**: la página dice que no se sigue a nadie (cierto), pero no avisa que el navegador del lector le pregunta el clima a Open-Meteo y el dólar a DolarApi/Bluelytics, y figura "Última actualización: 24 de septiembre".
10. **Celular y accesibilidad**: bien armados (saltar al contenido, foco en menú, `prefers-reduced-motion`, contrastes medidos). Pendientes menores: el buscador no devuelve el foco, el pie tiene enlaces chicos y hay textos de 10 a 11 px.

---

## Caso 1: "medios: 24" contra "Fuentes (17)"

**Dónde se ve cada número** (ejemplo real de hoy: "El papa León XIV cancela su viaje a Asís...", id `1msbfip`):

| Número | De dónde sale | Qué cuenta |
|---|---|---|
| **24** | `nota.medios` (lista de nombres de medios, sin repetir). Lo usan `mediosDe()` en `web/lib/hoy.js:48` ("contada por 24 medios" en `/hoy`, `web/app/hoy/page.js:38`), el campo `fuentes` de `web/lib/para-agentes.js:50`, el criterio de "muy contada" (8 o más) y el panel. | Medios distintos que el cruce juntó, **hasta hoy**. |
| **17** | `nota.fuentesConsultadas` (`web/lib/fuentes-de-la-nota.js:40`), mostrado como `Fuentes ({fuentes.length})` en `web/components/verificacion.js` (summary). | **Enlaces** (uno por nota de otro medio), sin repetir enlace. |

**Por qué difieren (tres razones, en orden de peso):**

1. **Foto fija.** Cuando la IA escribe la nota se guarda `fuentesConsultadas` con las fuentes que había en ese momento (`reels/reescritura.mjs`, alrededor de la línea 922) y de ahí en más se reusa tal cual (`revalidarExtras`, alrededor de la 969). `web/scripts/generar-datos.mjs` (alrededor de la 554) solo arma la lista desde los orígenes cuando la nota no trae ninguna. Los medios que el cruce suma después entran a `medios` pero no al desplegable. En el ejemplo faltan TN, Canal 26, Diario Popular, Noticias Argentinas, QZ Noticias, El Eco de Tandil y Minuto Uno. En 48 de las 111 notas de la portada hay al menos un medio en `medios` que no está en el desplegable (por ejemplo "Instituto Adventista": 5 medios, "Fuentes (1)").
2. **Un medio, varios enlaces.** Radio Mitre aparece dos veces (una nota y un video). En la nota de Colapinto el desplegable dice "Fuentes (32)" para unos 27 medios, y las etiquetas salen como "TN (Todo Noticias) (1)", "(2)" (`etiquetasDeFuentes`).
3. **Unidades distintas**: el 24 son medios, el 17 son enlaces.

**Cómo debería mostrarse (propuesta):** que el lector vea **un solo número, el de medios distintos**, en el mismo lugar donde hoy dice "Fuentes (N)": por ejemplo "Fuentes (24 medios)", con la lista agrupada por medio (un renglón por medio, con su enlace principal). Para eso el desplegable tiene que usar la unión de la foto fija con `fuentesConsultadasDeOrigenes(nota)` (ya existe en `reels/reescritura.mjs:183`). **Es decisión del dueño**, porque sumar medios que no sirvieron para escribir el texto es una afirmación nueva ("lo contaron", no "lo usamos"). Alternativa conservadora: dejar la lista como está, llamarla "Fuentes consultadas (17)" y que `/hoy` diga "lo contaron 24 medios". Lo que no puede quedar es que la misma nota diga 24 y 17.

---

## Tabla de hallazgos

Severidad: **alta** = el lector puede entender algo falso; **media** = incoherente o desactualizado, sin daño directo; **baja** = detalle o limpieza.

| # | Qué se muestra | Dónde (archivo:línea) | Problema | Sev. | Propuesta |
|---|---|---|---|---|---|
| 1 | "Fuentes (N)" vs. "contada por N medios" | `web/components/verificacion.js` (summary), `web/lib/fuentes-de-la-nota.js:40-56`, `web/app/hoy/page.js:38`, `web/lib/hoy.js:48` | Dos unidades distintas (enlaces / medios) y la lista no se actualiza con los medios que llegan después. 52 de 111 notas no coinciden. | alta | Un solo número (medios) y lista agrupada por medio; sumar `fuentesConsultadasDeOrigenes` a la foto fija. Ver "Caso 1". |
| 2 | "Cómo trabajamos": "enlaza a la nota original justo debajo del texto" | `web/app/quienes-somos/page.js:60-62` | Ya no es cierto desde la regla 307 (24/10). El sitio publicado todavía lo dice (verificado con `curl`). | alta | Cambiar por "en el desplegable «Fuentes» lista todas las que se usaron, con su enlace". Con prueba que falle si vuelve. |
| 3 | "Una nota que ... involucra una muerte o que nombra a un menor no sale sola" y, en el pie, "lo sensible lo revisa una persona antes de salir" | `quienes-somos/page.js:71-76`, `web/app/layout.js:210-213`, `web/app/llms.txt/route.js:27`, `web/components/ficha.js:40` | Hoy solo el rojo frena siempre; lo amarillo de Balcarce y lo muy contado (8 o más medios) salen sin esa espera (`docs/CRITERIO-EN-UNA-PAGINA.md`). En la portada de hoy salen, por ejemplo, "Muere en Misiones ... a los 118 años" y "Una joven muere aplastada por un acoplado". La frase promete más revisión de la que hay. | alta | Decir lo que es cierto: "Lo más delicado (menores, víctimas, acusaciones sin confirmar) espera a una persona; el resto sale solo, con el control automático". Hernán decide el texto. |
| 4 | Firma "Redacción asistida con IA, verificada contra las fuentes" | `web/components/metadatos.js:150` y `:162` | "Asistida" sugiere persona + IA. En una nota automática escribe la IA sola; "verificada" es un control mecánico de números, nombres, fechas y citas (`ingesta/verificar.mjs`, sin IA), no una comprobación de que el hecho sea cierto. El comentario del archivo (líneas 144-146) dice que nunca se dice "sin revisión humana" porque es "interno". La explicación larga sí es honesta ("la escribió una inteligencia artificial... se verificó automáticamente"). | media | Firma: "Escrita por IA, controlada automáticamente contra las fuentes". "Redacción asistida con IA, revisada por la redacción" solo cuando una persona la aprobó. |
| 5 | La firma ya no se ve sin tocar "Fuentes" | `web/components/verificacion.js` (`PieConFuentes`: la firma va adentro del `<details>`); `quienes-somos/page.js:77-82` ("en una línea al pie, junto al botón de fuentes"); pie `layout.js:213` ("Cada nota dice al pie quién la escribió") | Decisión de Hernán (17/10): firma adentro del desplegable cerrado. La página y el pie siguen diciendo "al pie, junto al botón". Sin fuentes sí se ve (`<p className="firma-nota">`). | media | Cambiar la redacción ("al abrir «Fuentes»") o volver a mostrar la firma en el renglón cerrado. Pregunta para Hernán. |
| 6 | "Si no hay una [foto] que sirva, va una ilustración hecha con IA ... o una placa con el titular" | `quienes-somos/page.js:100-101` | La placa de la web lleva el nombre de la sección y un dibujo, no el titular (`PlacaSeccion`, `web/components/piezas.js:126-134`). La placa con titular es la de redes. | media | "...o una placa de la sección". |
| 7 | Comentario "Nunca una imagen hecha con IA" sobre la placa | `web/components/piezas.js:118-124` | Desactualizado: hay ilustraciones con IA con crédito (`web/data/fotos-ia.json`, regla 182). Solo comentario, pero confunde a quien lo lee. | baja | Corregir el comentario. |
| 8 | Comentario "La fuente original, a la vista y con enlace común (regla 254)" | `web/app/nota/[id]/page.js:180` | Sobra desde la regla 307. | baja | Borrar la línea. |
| 9 | "Publicado: viernes 23 de octubre de 2026 · 19:01" en notas sin hora de la fuente | `piezas.js:260-274` (`FechasDeLaNota`), `web/lib/datos.js:427-436` (`cuando`), `web/components/ficha.js:102` (`datePublished`) | 7 de 116 notas de hoy son `sinFecha`: su `fecha` es la primera vez que las vimos (siempre a la hora de una vuelta de 30 min). La página las muestra como hora de publicación exacta y el JSON-LD la usa como `datePublished`; mientras tanto los datos para agentes (`para-agentes.js:47`), el RSS (`rss.js:121`) y `/hoy` (`hoy.js:61`) ya las tratan como "sin fecha". "Cómo trabajamos" dice que "Publicado es cuándo salió la noticia". | media | En `sinFecha` mostrar "Vista en Radar Balcarce: ..." (o solo el día) y no marcar `datePublished` exacto. Mismo criterio en todos lados. |
| 10 | "ayer" | `web/lib/tiempo.js:9-11` | `haceCuanto` usa horas corridas: "ayer" = entre 24 y 47 horas. A las 23:00 del sábado, una nota del jueves a las 23:50 (47 h) dice "ayer". En la nota se corrige solo, porque al lado va la fecha exacta, pero en listas confunde. | baja | Usar el día calendario de Balcarce para "ayer". |
| 11 | `dateModified` / `og:modifiedTime` | `tiempo.js:19-31`, `web/components/ficha.js:103`, `web/app/nota/[id]/page.js:79` | Puede salir `publicadaCuando` (cuando una persona aprobó la nota, horas después de su fecha) aunque la página no muestre "Actualizado" (esa marca solo sale por `corregidaCuando` y más de 30 minutos, `tiempo.js:42-48`). Google pide que lo marcado coincida con lo visible. | baja | Que el JSON-LD use la misma regla que "Actualizado" (`actualizadaCuando`). |
| 12 | Correcciones automáticas sin "Actualizado" | `quienes-somos/page.js:84-86`, `:133-135`, `:142` | Se dice que si "una persona corrige" se suma "Actualizado". Las correcciones de la auditoría con IA (ortografía) y de la revisión del archivo cambian la nota sin marca. Es coherente con lo escrito, pero un lector puede suponer que siempre queda constancia. | baja | Aclarar "si una persona corrige un dato"; la ortografía chica no se marca. |
| 13 | Nombres de sección distintos | `piezas.js:193` (`<h2>{seccion}</h2>` en la portada), `web/app/seccion/[ranura]/page.js:84` (`<h1>{s.nombre}</h1>`) vs. `nombreCorto` (etiquetas, menú, pie) | Etiqueta y menú dicen "Cultura" y "Tecnología e IA"; el título del bloque y de la página dicen "Cultura y agenda" y "Tecnología". CLAUDE.md dice que se leen "Cultura" y "Tecnología e IA". | media | Usar `nombreCorto` en `TituloSeccion` y en el `h1` de la sección. |
| 14 | "Lo de Balcarce entra siempre" | `quienes-somos/page.js:47-49` | No entra lo rojo, los sepelios, lo sin cuerpo de 70 palabras ni lo muy viejo. Es la idea del medio, pero literal es falsa. | baja | "Lo de Balcarce entra casi siempre; solo queda afuera lo que no se puede publicar con seguridad". |
| 15 | Privacidad | `web/app/politica-de-privacidad/page.js:86`; `web/lib/pedir-clima.js:33`; `web/lib/dolar.js:22-23` | Dice "no te sigue a otros sitios" (cierto), pero no avisa que el navegador del lector consulta Open-Meteo (clima, en todas las páginas por la pastilla de arriba) y DolarApi/Bluelytics (dólar), con lo que esas empresas ven su IP. "Última actualización: 24 de septiembre de 2026" es anterior a muchos cambios. | media | Sumar un párrafo "Datos que se piden desde tu navegador" y actualizar la fecha. Hernán decide el texto. |
| 16 | Búsqueda: "Busca en todas las notas publicadas" | `web/components/buscador.js:194` | El índice (Pagefind) solo incluye notas con página en el sitio y que Google también puede ver (`nota/[id]/page.js:110`); hoy el tope de notas con página es 500 (`docs/CRITERIO-EN-UNA-PAGINA.md`). No son "todas". | baja | "Busca en las notas de las últimas semanas". |
| 17 | Buscador y foco | `buscador.js:173-207` | `role="dialog" aria-modal="true"` sin trampa de foco ni devolución del foco al botón al cerrar (el menú de secciones sí lo hace, `navegacion.js:75-95`). | baja | Mismo patrón que el menú. |
| 18 | Pie de página en el celular | `web/app/globals.css:1012-1016`, `web/app/layout.js:~187-206` | Enlaces en línea de 13 px separados por " · ": el blanco táctil de cada uno es chico. | baja | Dar `padding` vertical a los enlaces del pie o apilarlos en el celular. |
| 19 | Textos de 10 a 11 px | `globals.css:260, 374, 454, 726-738, 802, 817` (etiquetas, "mes" del taco, "lluvia") | Legibles porque van en mayúsculas y con buen contraste, pero chicos para el celular. | baja | Subir a 11-12 px donde no rompa el diseño. |
| 20 | CSS muerto del desplegable | `verificacion.js` (estilos `.fn-firma` y `.fn-sep` dentro de `summary`) | Hay reglas para una firma dentro del renglón cerrado que ya no existe (ver 5). | baja | Borrar, o reusar si se vuelve a mostrar la firma. |
| 21 | Portada sin datos | `web/app/page.js:41-48` y `:155` | "Corré `npm run datos`..." y "Se publican desde el panel" son mensajes de desarrollo (el panel de la PC se retiró el 17/10). Solo salen sin datos, pero un lector los vería. | baja | "Estamos armando la portada. Volvé en unos minutos". |
| 22 | Página 404 | `web/app/not-found.js` (cuerpo del componente) | Funciona (y rescata enlaces viejos de notas, verificado: devuelve 404 con la página). No ofrece buscador ni secciones; solo "Volver a la portada". | baja | Sumar enlaces a `/hoy` y a las secciones. |
| 23 | Farmacia de turno sin horario | `web/app/farmacias/page.js:36-38`, `piezas.js:77`; el dato lo calcula `ingesta/ingesta.mjs:1508` | El turno corre de 8:30 a 8:30 del día siguiente, pero el lector no lo ve. Entre las 0:00 y las 8:30 la tarjeta muestra la farmacia del día anterior, que es lo correcto, y sin la hora puede parecer un error. | baja | Agregar "De 8:30 a 8:30 del día siguiente". |
| 24 | Teléfonos útiles: "Sin confirmar" | `web/app/util/page.js:180` | Muestra a un lector un número que el propio sitio no confirmó. Es honesto, pero poco útil en una emergencia. | baja | Sacarlo de la lista pública hasta confirmarlo, o llevarlo a "Otros". |

### Otros resultados de la revisión (sin problema)

- **Etiqueta de sección, `Hace`, `FilaNota`, postales**: el corte a fecha exacta a las 36 horas es el mismo en portada, secciones y listas. Está escrito dos veces (`HORAS_DE_HACE = 36` en `piezas.js:214` y `postales.js:13`) y hoy coincide con `PORTADA.horas`; conviene una sola constante.
- **Reloj del lector**: `HorasVivas` recalcula "hace N min" cada minuto; sin JavaScript queda el texto del momento de compilar.
- **Fecha de la barra de arriba**: se escribe al compilar (cada 30 min); puede quedar con el día anterior hasta 30 minutos después de medianoche. Aceptable.
- **Datos estructurados**: `datePublished` y "Publicado" coinciden; el autor es el sitio o el medio de la fuente (`metadatos.js:114-131`), nunca una persona inventada.
- **Avisos publicitarios**: siempre dicen "Espacio publicitario" (`web/components/avisos.js`).
- **Páginas de servicio** (`/clima`, `/dolar`, `/agenda`, `/contacto`): no prometen nada que el código no haga. "Se actualiza solo mientras tenés la página abierta" es cierto.
- **Textos de cupos viejos**: no quedó ninguno en lo que ve el lector. Las menciones están solo en comentarios y documentos. "Cada media hora" (Cómo trabajamos) y "cada 30 minutos" (`llms.txt`) coinciden con el reloj real.
- **Celular de 400 px** (lectura del CSS): portada en una columna (`@media (max-width: 619px)`), menú en una fila deslizable con degradé, panel de secciones a pantalla completa con foco atrapado, renglón "Fuentes" de 44 px de alto mínimo, "Actualizado" apilado (`globals.css:970`). Sin scroll horizontal salvo la fila del menú y las tablas de fútbol, que lo declaran a propósito. Contrastes de las etiquetas medidos y vigilados por prueba (`pruebas/seo-paginas.test.mjs`).
- **Placa (caso 5)**: la nota sin foto muestra la ilustración con IA si el flujo "Ilustrar notas sin foto" ya la generó (con crédito "Ilustración generada con IA" en el epígrafe); si no, la placa de la sección (color + dibujo + nombre, chica, `nota/[id]/page.js:130`); las notas propias no llevan ninguna. En portada y listas la placa va en la postal o la miniatura. De las 116 notas de hoy, 31 no tienen foto. La placa va con `aria-hidden`, así que un lector de pantalla no la anuncia, lo cual es correcto porque no dice nada que la etiqueta de al lado no diga.

---

## Decisiones para el dueño (preguntas cortas)

1. **¿Qué número va en "Fuentes"?** Recomendación: medios distintos ("Fuentes (24 medios)"), con la lista agrupada por medio, y que `/hoy` y los datos para agentes usen el mismo número. Si preferís no sumar medios que no sirvieron para escribir, se llama "Fuentes consultadas (17)" y `/hoy` dice "lo contaron 24 medios". La misma nota no puede decir las dos cosas.
2. **¿Cómo explicamos la revisión humana?** Recomendación: decir la verdad corta: "Escribe una IA, un programa controla los datos contra las fuentes y lo más delicado (menores, víctimas, acusaciones) lo mira una persona antes de salir". Sacar "una nota que involucra una muerte no sale sola".
3. **¿La firma vuelve al renglón cerrado?** Recomendación: sí, una línea corta gris ("Escrita por IA · Fuentes (24 medios)"), porque se ve sin tocar nada. Si se queda adentro, cambiar "Cómo trabajamos" y el pie para que no digan "al pie, junto al botón".
4. **Firma automática: ¿"Redacción asistida con IA" o "Escrita por IA"?** Recomendación: "Escrita por IA" para lo automático; "asistida... revisada por la redacción" solo cuando una persona aprobó.
5. **Notas sin hora de la fuente (`sinFecha`)**: ¿mostramos "Vista en Radar Balcarce el ..." en vez de "Publicado: ..."? Recomendación: sí.
6. **"Cultura y agenda" / "Tecnología"**: ¿en los títulos de bloque y de página leemos "Cultura" y "Tecnología e IA", como en las etiquetas? Recomendación: sí, un solo nombre.
7. **Política de privacidad**: ¿sumamos el párrafo sobre el clima y el dólar pedidos desde el navegador? Recomendación: sí, y actualizar la fecha.
8. **Farmacia**: ¿agregamos "de 8:30 a 8:30"? Recomendación: sí.

## Arreglos seguros (no cambian qué se publica ni los criterios; cada uno con su prueba)

1. `quienes-somos/page.js:60-62`: cambiar "justo debajo del texto" por lo que hace hoy el desplegable. Agregar prueba que falle si la frase vuelve.
2. `quienes-somos/page.js:100-101`: "placa con el titular" por "placa de la sección".
3. `quienes-somos/page.js:47-49`: "entra siempre" por "entra casi siempre" (sin tocar el criterio).
4. Comentarios viejos: `piezas.js:118-124` (placa "nunca IA") y `nota/[id]/page.js:180` (fuente original, regla 254).
5. `TituloSeccion` y el `h1` de la sección con `nombreCorto` (un nombre para todo).
6. `web/app/page.js:41-48` y `:155`: mensajes sin referencias al panel ni a `npm run datos`.
7. Buscador: devolver el foco al botón al cerrar y atrapar el foco (mismo patrón que `navegacion.js`).
8. Pie: `padding` vertical en los enlaces del celular.
9. Borrar el CSS muerto de `verificacion.js` (`.fn-firma`, `.fn-sep` del summary) si la firma se queda adentro.
10. Una sola constante para las 36 horas (`HORAS_DE_HACE`), importada de `PORTADA.horas`.
11. Política de privacidad: actualizar la fecha cuando se toque el texto.

*Los puntos de la tabla que cambian lo que el sitio dice de sí mismo (3, 4, 5, 15) necesitan que Hernán apruebe la redacción antes de tocarlos.*
