# El panel nuevo del celular: auditoría, diseño y plan

*16/10/2026. Propuesta: no cambia nada del panel actual (`web/public/panel/`) hasta que Hernán y Andrés
decidan. El prototipo para tocar en el celular es `docs/panel/PROTOTIPO-PANEL.html` (datos inventados,
no guarda nada).*

---

## En corto (para Hernán y Andrés)

**Qué está mal hoy.** El panel hace muchas cosas, pero para lo de todos los días obliga a dar vueltas:
entrás a "Hoy", que es una lista de atajos; tocás uno y caés en otra lista; abrís la nota; tocás
"Publicar"; te pregunta "¿Seguro?"; esperás; a veces tenés que volver a buscarla para leerla. Cada vez
que decidís algo, el panel vuelve a bajar todo de nuevo (unos 2 MB) y te deja mirando una ruedita. Para
saber si "anda todo" no hay un lugar: hay que mirar Redes, y abajo de todo en Números. Y hay textos que
se contradicen (dice que una nota retirada queda 30 días para volver a publicarla, pero la lista la
muestra sólo 24 horas).

**Qué proponemos.** Al abrir el panel, una sola pantalla, "Hoy", con tres cosas:

1. **Tu decisión**: la nota que espera, de a una, con el porqué en una línea y tres botones grandes:
   Publicar, Descartar, Editar. Decidís y aparece la siguiente. Si te equivocaste, "Deshacer".
2. **¿Anda todo?**: un semáforo. Verde: todo bien. Amarillo o rojo: qué pasó, en castellano, y un botón
   "¿Qué hago?" con los pasos.
3. **Hoy en números**: cuánta gente entró, cuántas notas se leyeron, cuántas se publicaron y cuántos
   posteos salieron, y una frase ("lo más leído fue…").

Abajo, sólo tres lugares: **Hoy**, **Notas** (buscar una nota publicada para corregirla o retirarla) y
**Más** (todo lo demás: pistas, fotos, redes, números completos, fechas, contactos, ayuda). Se abre al
instante con lo último que bajó y se actualiza solo en segundo plano. Botones grandes, abajo, para usar
con una mano. Modo oscuro automático. Mismas reglas de seguridad que hoy.

**Cómo se cambia sin riesgo.** El nuevo se arma al lado del actual (en `radarbalcarce.com/panel/nuevo/`),
con la misma llave y sin volver a registrar el celular. Lo usan dos semanas en paralelo; si les sirve,
pasa a ser el principal y el viejo queda guardado en `/panel/viejo/` por si hay que volver.

**Las preguntas que deciden ustedes** están al final ("Lo que deciden Hernán y Andrés"): son 8.

---

## 1. La auditoría

### Cómo se hizo

- Se leyó todo el código del panel del celular (`web/public/panel/`: `index.html`, `app.js` de 1.988
  renglones y 141 KB, `hoy.js`, `github.js`, `textos.js`, `revision.js`, `numeros.js`, `fotos.js`,
  `fechas.js`, `pistas.js`, `contactos.js`, `borradores.js`, `redes-estado.js`, `recorrido.js`,
  `cifrado.js`, `sw.js`), la CSP de `web/public/_headers`, `panel/celular.mjs`,
  `panel/celular-datos.mjs`, `redes/horarios.mjs`, `docs/09-PANEL.md` y las pruebas del panel.
- Se abrió el panel real en el navegador de pruebas en modo celular (375 × 812): la pantalla de ingreso
  y el **modo de prueba** (`/panel/?demo`, `prueba.js`), sin ninguna llave real.
- Se midió el tamaño de lo que baja cada pantalla con los archivos de `web/data/` del 15/10.

### Las 5 cosas más graves

1. **Decidir una nota lleva de 4 a 8 toques y dos esperas.** "Hoy" no muestra la nota: muestra un atajo
   ("2 Notas esperan tu OK") que lleva a una lista mezclada donde la primera puede ser otra cosa ("Falta
   el cuerpo"). Después: abrir, "Publicar", confirmar "¿Publicarla?", esperar a la IA, buscar el aviso
   "Ver el borrador" (desaparece a los 20 segundos), bajar hasta el final del formulario, "Publicar",
   a veces "El cuerpo es corto → Publicarla igual", y una pantalla de resultado con "Siguiente nota".
2. **Cada decisión vuelve a bajar todo.** Después de guardar, el panel llama a `cargar()` entero: 11
   pedidos a GitHub y unos 2,2 MB (ver "Lentitud"), con la ruedita "Guardando en GitHub…". Decidir 5
   notas son unos 11 MB y 5 esperas. Al abrir el panel pasa lo mismo, sin nada guardado: siempre
   espera a la red (`cache: 'no-store'`).
3. **No hay un "¿anda todo?" y lo que hay puede mentir.** "Hoy" dice "✓ Redes: 1 de 6 piezas salieron"
   aunque dos videos no salieron: cuenta como problema sólo lo que dejó un error anotado
   (`problemasDeHoy`), no lo que pasó su hora sin salir (visto en el modo de prueba). Si la web dejó de
   actualizarse o el reloj se paró, el panel no lo dice en ningún lado: "Cómo anda el sistema" está al
   final de Números, adentro de Más, y sólo cuenta corridas fallidas.
4. **Demasiados lugares y textos que se contradicen.** 5 pestañas + 7 pantallas en Más + unas 10
   subpantallas; 4 caminos para escribir una nota (Publicar, Escribirla con IA para revisarla, Escribirla
   a mano, Pedir otra versión); los botones de la nota aparecen dos veces (en la barra fija y abajo).
   Contradicciones a la vista:
   - Retirar: la pregunta y el aviso dicen "queda en Retiradas **30 días**"; la lista muestra sólo las de
     las **últimas 24 horas** (`HORAS_RETIRADAS = 24`): después del primer día ya no se puede volver a
     publicar desde el celular.
   - Descartar: dice "unas 72 horas"; la lista guarda 48 (`HORAS_EN_ESPERAN`).
   - Revisión: "Lee las notas nuevas cada hora y **SÓLO AVISA: no corrige nada**"; desde el 2/10 corrige
     sola la ortografía chica (regla 98) y la misma pantalla lo muestra en "Corregido solo".
   - "¿Publicarla? … Si no encuentra problemas, sale sola": en un tema delicado nunca sale sola (C-19).
   - La pantalla de ingreso pide crear la llave "con la cuenta de Radar (balcardev@gmail.com)"; desde el
     15/10 el repositorio es `radarbalcarce/radar-balcarce`, de la cuenta `radarbalcarce@gmail.com`. Una
     llave *fine-grained* sólo ve repositorios de la cuenta (u organización) que la crea: con la cuenta
     de balcardev probablemente no aparece el repositorio. **Hay que confirmarlo y corregir el texto**
     (y `docs/09-PANEL.md`, que dice lo mismo).
5. **Un error de verdad: el borrador que estás editando se puede borrar solo.** Si se abre el borrador
   desde el aviso "Ver el borrador", la barra de pestañas queda a la vista (`vistaBorrador` no la
   esconde) y el panel cree que está "en una lista" (`enUnaLista` mira esa barra). Si en ese momento
   termina otro pedido a la IA o una foto, `vistaLista()` dibuja la lista encima y se pierde lo que se
   estaba corrigiendo. Visto en el modo de prueba: el borrador abierto con la barra de abajo a la vista.

### Lo que se vio, pantalla por pantalla (capturas descriptas, 375 px)

| # | Pantalla | Lo que se ve |
|---|---|---|
| C1 | Ingreso (oscuro) | El texto y los 5 pasos para crear la llave ocupan toda la pantalla; los campos "Tu nombre" y "La llave" quedan abajo, hay que bajar. Menciona balcardev@gmail.com. |
| C2 | Hoy | "Hoy, jueves 15", la hora del armado y tres tarjetas con un número rojo: "2 Notas esperan tu OK", "2 Notas sin cuerpo todavía (la IA las vuelve a intentar sola)", "2 Notas de la portada sin foto". Abajo "✓ Redes: 1 de 6 piezas salieron". Lo que "la IA intenta sola" aparece como "Necesita tu toque". Ninguna nota se puede decidir desde acá. |
| C3 | Esperan | Entra 1 tarjeta y media por pantalla. La primera es "Falta el cuerpo" aunque se tocó "esperan tu OK". Cada tarjeta tiene dos franjas de color con texto largo ("Necesita tu OK · No sale sola: Acusa a alguien ("detenido")" y "Sin foto"). |
| C4 | Una nota | Bien resuelto: "Por qué no salió" arriba, la foto, lo que anotó la IA, lo que contó cada medio, y una barra fija "Descartar / Publicar". Pero abajo vuelven a estar "Publicar, Escribirla con IA para revisarla, Escribirla a mano, Descartar", y "¿Ya la había escrito la IA? Buscar su último borrador". |
| C5 | ¿Publicarla? | Diálogo de confirmación con un párrafo de 4 renglones. Promete que "sale sola" aunque sea delicada. |
| C6 | Lo que escribió la IA | El aviso negro tapa el título; un recuadro amarillo "Revisá esto antes de publicar"; tres campos grandes; el botón "Publicar" queda abajo de todo. La barra de pestañas a la vista (ver el error de arriba). |
| C7 | Más | 7 tarjetas, 3 botones, 9 preguntas desplegables de "Cómo funciona" y "Salir": unas 4 pantallas de largo. |
| C8 | Números | 4 cifras arriba (bien), un gráfico por día y, después de mucho bajar, "Cómo anda el sistema" con el consejo "avisale a Claude". |
| C9 | Redes | Las 6 piezas del día dos veces (el cronograma y "red por red"), "No quedó anotado por qué…" repetido 5 veces, los repasos y la cola de Facebook: unas 5 pantallas. Muestra ✕ en dos videos mientras Hoy dice ✓. |

### Cuántos toques lleva cada tarea de todos los días

| Tarea | Hoy | Con el panel nuevo |
|---|---|---|
| Decidir una nota que espera | 4 (común) a 8 (delicada), más una espera de la IA y otra de "Guardando" que vuelve a bajar todo | **1** (Publicar o Descartar, con Deshacer); delicada: **2** (Publicar → "Leer y publicar"); la siguiente aparece sola |
| Corregir una nota publicada | 4-5: Publicadas → buscar → abrir → Editar → bajar → Guardar | **4**: Notas → nota → Corregir → Guardar (botón fijo abajo) |
| Retirar una nota | 5: Publicadas → abrir → Retirar → escribir el motivo → Sí | **4**: Notas → nota → Retirar → tocar un motivo (o escribir otro), con Deshacer |
| Ver si todo anda | No hay un lugar: Redes (y bajar) + Más → Números → bajar hasta el final | **0**: el semáforo está en Hoy y su color en la píldora de arriba, en todas las pantallas; si no es verde, **1** ("¿Qué hago?") |
| Ver cuánta gente entró | 2 (Más → Números) y una espera que baja 3 MB | **0**: 4 cifras y una frase en Hoy |
| Mandar una pista | 3: Más → Pistas → pegar → Investigar | **3** (Más → Mandar una pista → Mandar) o **1** compartiendo desde WhatsApp/X (si se suma "Compartir con el panel") |
| Sumar una foto | 4-5: Hoy → sin foto → nota → pegar dirección, crédito y tilde → Sumar → Sí | **4**: Más → Sumar una foto → nota → Sumar |

### Lentitud: qué baja cada pantalla

Medido con los archivos de `web/data/` del 15/10. La API de GitHub devuelve cada archivo en base64 dentro
de un JSON: pesa un tercio más que el archivo.

| Momento | Pedidos a GitHub | Cuánto baja |
|---|---|---|
| Abrir el panel (`cargar`) | 11: portada (248 KB), esperando-cuerpo (2), celular-pendientes (108), celular-decisiones (38), correcciones (155), celular-estado (6), redes (186), **banco-fotos (846, sólo para contar las notas sin foto)**, auditoria-ia (11), correcciones-auditoria (2), pistas (44) | ~1,65 MB de datos → **~2,2 MB**, siempre de la red |
| El código del panel | 15 archivos (~290 KB) | Todo de nuevo cada vez: `Cache-Control: no-cache` y el service worker pide primero a la red salteando la caché |
| **Después de cada decisión** | 1 lectura + 1 escritura del archivo que cambia, **y otra vez las 11 de arriba** | **~2,2 MB más**, con la ruedita |
| Números (la primera vez) | estadísticas (63 KB), notas-por-día (7), **archivo.json (3 MB, en 2 pedidos)** y 3 listas de corridas | **~3,1 MB** |
| Fechas (la primera vez) | 4 archivos (candidatas 240 KB, feriados, elegidas, piezas) | ~400 KB |
| Borradores | celular-borradores (182 KB) cada vez que se abre y cada vez que termina un pedido a la IA | ~250 KB |
| Esperando a la IA | Un pedido cada 4 segundos a la lista de corridas (15 corridas por pedido) hasta que termina (hasta 72 veces) | ~1 MB por cada minuto de espera |

Con 4G anda; con la señal floja de la calle, cada decisión es una espera larga y a veces "Algo falló:
Failed to fetch".

### Errores poco claros

| Lo que dice hoy | El problema |
|---|---|
| "GitHub contestó 422: …" (con el mensaje de GitHub en inglés) | No dice qué hacer. |
| "Algo falló: Failed to fetch" | Es "no hay señal"; sólo lo dice bien si el celular sabe que está sin conexión. |
| "GitHub no encontró el archivo o el workflow…" | "Workflow" es jerga. |
| "La corrida de GitHub falló. Mirá "Panel del celular" en GitHub → Actions." | Ninguno de los dos entra a GitHub Actions. |
| "La llave no anda… Cargá una nueva desde "Más"." | En Más no hay "cargar una llave nueva", sólo "Salir y borrar la llave". |
| "No pude abrir el borrador en este celular. Si recién lo registraste, probá de nuevo." | No dice cuánto esperar (hasta la próxima actualización). |

### Lo que sobra o casi no se usa

- **Borradores** (pantalla aparte): repite lo que ya muestra cada nota ("borrador listo").
- **"¿Qué es esto?"** en cada pantalla y las **9 preguntas de "Cómo funciona"** en Más.
- **"Su recorrido"** en cada nota (útil para auditar, no para decidir).
- **"Actualizar el panel (si algo se ve viejo)"**: lo tiene que hacer solo.
- **"Buscar su último borrador"**: lo tiene que buscar solo.
- **Redes**: las mismas piezas listadas dos veces; el detalle red por red interesa sólo cuando algo falla.
- **"Notas sin cuerpo"** mientras la IA las reintenta: no necesitan a nadie y suman al numerito rojo.
- **La pantalla de resultado** después de cada decisión ("✓ Publicada… Siguiente nota"): un aviso con
  "Deshacer" alcanza.
- **El panel de la PC** ya está en desuso (8/10): no se toca acá.

---

## 2. El diseño nuevo

### La idea en una frase

Abrir el panel = ver lo que necesita una decisión, si anda todo y cómo va el día, sin tocar nada y sin
esperar. Todo lo demás, a dos toques en "Más".

### Los tres lugares de abajo

| Lugar | Qué tiene |
|---|---|
| **Hoy** | Los tres bloques (abajo). El numerito de la pestaña es cuántas decisiones esperan. |
| **Notas** | Buscador y lista de lo publicado (últimas 24 h; filtros "Corregidas" y "Retiradas"; "buscar más atrás" trae el archivo sólo si se pide). Cada nota: Corregir y Retirar en la barra de abajo; en "Más opciones": Reescribir con IA, Mandar a las redes, Ver en la web. Las retiradas: "Volver a publicar" (los 30 días de la papelera, como dice el texto). |
| **Más** | Dos atajos grandes arriba (Mandar una pista, Sumar una foto). "Para mirar": Fotos que faltan, Revisión de la IA, Redes de hoy, Todos los números. "Para planificar": Pistas abiertas, Un día como hoy y feriados, Contactos. "Este celular": colores (automático/claro/oscuro), Actualizar la web ahora, Ayuda, Salir. |

### Hoy, bloque por bloque

**1 · Tu decisión.** Una tarjeta por vez, con "1 de 4": sección, hace cuánto, cuántos medios (y si uno es
oficial), el título, **"Espera porque:"** en una línea (`motivoCorto`) y qué mirar en otra
(`explicarMotivo` resumido). "Ver qué contó cada medio" abre el detalle (lo de hoy, sin "Su recorrido"
abierto). Botones: **Descartar · Editar** y **Publicar** ancho abajo, al alcance del pulgar.

- **Publicar** (común): la IA la escribe en segundo plano, el verificador la controla y, si no marca
  nada, sale; la tarjeta deja lugar a la siguiente y llega un aviso "Publicada: sale a las 23:00 ·
  Deshacer". Si el verificador marca algo, vuelve como "Leer y publicar".
- **Publicar** (delicada, "necesita ojo humano"): igual, pero siempre vuelve como **"Leer y publicar"**:
  el texto entero con lo que marcó el verificador y dos botones, Corregir / Publicar así (regla C-19).
- **Descartar**: sin pregunta; aviso con **Deshacer** (escribe `sinDecision`, como hoy).
- Entran también en esta fila, como tarjetas: las notas **sin cuerpo que agotaron los 3 intentos** ("Que la
  IA la intente de nuevo / Escribirla yo / Dejarla") y los **avisos graves de la Revisión** sobre notas
  publicadas ("Corregir / Está bien así"). Las sin cuerpo que la IA todavía reintenta no aparecen.
- Abajo: "Ya decidiste 3 hoy · Ver o deshacer".

**2 · ¿Anda todo?** Un semáforo con una frase y, si no es verde, **"¿Qué hago?"**: una hoja con 2 o 3
pasos en castellano y los botones que hacen falta (Reintentar el video, Actualizar la web ahora, Copiar
el aviso para Claude). Su color también está en la píldora de arriba, en todas las pantallas.

| Color | Cuándo (ejemplos) |
|---|---|
| Verde | La web se armó hace menos de 45 minutos y las piezas de redes de hoy salieron o están en hora. |
| Amarillo | Una pieza de redes no salió; las estadísticas no se pudieron leer; una clave vence en menos de 30 días; quedan pocas efemérides armadas. |
| Rojo | La web no se actualiza hace más de 75 minutos (reloj parado o "Actualizar la web" fallando); la web no responde; la llave del celular venció; las redes fallan todo el día. |

Sale de lo que ya calcula el vigilante (`evaluar`, `redes/vigilar.mjs`, que separa los problemas en
`alta` y `media`) y de lo que arma el informe diario (regla 176). Además, el celular calcula por su cuenta
cuánto hace que se armó la web (`portada.generado`): si el vigilante también se cae, igual se pone rojo.

**3 · Hoy en números.** Cuatro cifras (personas, notas leídas, notas publicadas, posteos en redes) con la
comparación contra el mismo día de la semana anterior, y una frase con lo más leído y de dónde llegó la
gente. "Ver todos los números" lleva a lo de hoy (Más → Todos los números). Ojo: Cloudflare se mide a las
9 y a las 21 (`redes/estadisticas.mjs`), así que "hoy" es "hasta la última medición" (pregunta 4).

### Principios

- **Una mano**: lo que se toca va abajo; botones de 56 px; nada importante arriba a la derecha.
- **Sin esperar**: se muestra al instante lo último guardado en el celular y se actualiza en segundo
  plano ("Actualizando…" → el color del semáforo en la píldora). Decidir no vuelve a bajar todo: se
  cambia sólo lo decidido (actualización optimista) y, si GitHub falla, se deshace y se avisa.
- **Deshacer en vez de "¿Seguro?"**: para lo que se puede deshacer (publicar, descartar, retirar,
  mandar a redes). Retirar sigue pidiendo el motivo (es obligatorio), pero con opciones tocables.
- **Sin jerga**: nada de "workflow", "Actions", "verificador BAJA" ni mensajes de GitHub en inglés. Cada
  error dice qué pasó y qué hacer ("Sin señal: lo que decidiste quedó guardado en el celular y se manda
  cuando vuelva").
- **Modo oscuro**: automático con el del celular, o fijo desde Más.
- **Cada pantalla dice en una línea para qué sirve** (en lugar del "¿Qué es esto?").

### Qué se elimina, qué se fusiona, qué se queda

| Hoy | En el nuevo |
|---|---|
| Hoy (lista de atajos) | **Se reemplaza** por los tres bloques. |
| Esperan | **Se fusiona** en "Tu decisión". Las aprobadas y descartadas, en "Ya decidiste · Ver o deshacer". |
| Sin cuerpo (dentro de Esperan) | **Se fusiona**: sólo las que agotaron los intentos, como tarjeta de decisión. |
| Borradores | **Se elimina** como pantalla: el borrador vuelve a la tarjeta como "Leer y publicar". |
| Publicadas | **Se queda** como "Notas", más corta. Retiradas como filtro, con los 30 días de la papelera. |
| Redes | **Se divide**: lo que falla va al semáforo; el cronograma, en Más → Redes de hoy (una fila por pieza; el detalle red por red y "Reintentar" sólo al tocar una que falló). |
| Revisión | **Se divide**: lo grave a "Tu decisión"; el resto en Más. |
| Números | **Se divide**: 4 cifras en Hoy; el resto en Más, sin bajar `archivo.json`. "Cómo anda el sistema" pasa al semáforo. |
| Fotos | **Se queda** en Más ("Fotos que faltan" y el atajo "Sumar una foto"). |
| Pistas, Fechas, Contactos | **Se quedan** en Más, como están. |
| "¿Qué es esto?", "Cómo funciona" (9 preguntas) | **Se fusionan** en una página de Ayuda. |
| "Su recorrido" | **Se queda plegado** en el detalle de la nota. |
| "Actualizar el panel", "Buscar su último borrador", pantalla de resultado | **Se eliminan** (lo hace solo / un aviso con Deshacer). |
| Escribirla con IA para revisarla / Escribirla a mano / Pedir otra versión | **Se fusionan** en "Editar" (con "Pedirle a la IA otra versión" adentro). |

### Los datos: menos y más rápido, con la misma seguridad

1. **Un archivo chico para Hoy**: "Actualizar la web" arma `web/data/panel-hoy.json` (unos 15 KB): el
   semáforo con sus problemas y pasos, las 4 cifras y la frase, cuántas notas sin foto (para no bajar
   `banco-fotos.json`, 846 KB), las piezas de hoy con su estado ya calculado (arregla el "✓" engañoso) y
   el índice chico de títulos para Números (para no bajar `archivo.json`, 3 MB). **Nada de lo que espera
   va en claro**: los títulos de lo que espera siguen sólo en `celular-pendientes.json`, cifrado, como
   hoy (regla 79).
2. **Caché con ETag**: cada lectura guarda la respuesta **tal como llega (cifrada)** en IndexedDB junto
   con su `ETag`; al abrir se muestra eso y se vuelve a pedir con `If-None-Match`. Si no cambió, GitHub
   contesta 304: no baja nada y no gasta el cupo de pedidos. **Nunca se guarda descifrado**: se abre en
   memoria cada vez (la llave privada ya vive en IndexedDB y no se puede leer).
3. **Abrir el panel**: 0 pedidos para mostrar; en segundo plano, `panel-hoy.json` + `celular-pendientes`
   + `celular-decisiones` (en general 304). Lo demás se pide cuando se abre su pantalla.
4. **Decidir**: 1 lectura + 1 escritura del archivo que cambia (como hoy, con el reintento si otro lo
   cambió), sin recargar el resto.
5. **Esperar a la IA**: el sondeo baja a cada 10 segundos y pide 5 corridas, no 15.
6. **El código**: el service worker muestra lo guardado y busca la versión nueva en segundo plano (con
   un número de versión), en vez de esperar siempre a la red.

**Seguridad (no cambia):** sin servidor; la CSP de `/panel/*` en `web/public/_headers` cubre también
`/panel/nuevo/` (sólo `'self'` y `api.github.com`, ningún archivo de afuera; el prototipo tampoco carga
nada); lo sensible viaja cifrado con el mismo `cifrado.js`; la llave de GitHub sigue sólo en el celular;
los archivos que escribe el celular y su formato (`conDecision`, `conCorreccion`, `conRedes`…) no
cambian, así que la web los lee igual. "Compartir con el panel" (si se aprueba) se recibe con el service
worker por POST, para que el texto compartido no viaje en la dirección.

---

## 3. El plan, por etapas

El panel actual sigue andando en `/panel/` hasta la etapa 5. Cada etapa se puede subir sola.

| Etapa | Qué se hace | Esfuerzo | Riesgo | Qué prueba lo cuida | Cómo se vuelve atrás |
|---|---|---|---|---|---|
| **0. Arreglos del panel actual** (se pueden hacer ya, valgan o no el resto) | Corregir los textos que se contradicen (retiradas 30 días/24 h, descartar 72/48 h, Revisión "sólo avisa", "¿Publicarla?" en lo delicado, la cuenta de la llave); que Hoy cuente como problema la pieza que pasó su hora sin salir; que `vistaBorrador` esconda la barra (el borrador que se borra solo) | 1 sesión corta | Bajo | `celular-app.test.mjs` y `panel-hoy.test.mjs` (casos nuevos: textos de retirar alineados con `HORAS_RETIRADAS`; pieza vencida = problema; el borrador no se pisa) | Revertir el commit |
| **1. Los datos de Hoy** | `panel-hoy.json` en `generar-datos.mjs` (y en la línea `git add` de `actualizar.yml`); el vigilante deja el semáforo con pasos en castellano | 1-2 sesiones | Bajo: archivo nuevo que nadie usa todavía | Prueba nueva `panel-hoy-datos.test.mjs`: sin títulos de lo que espera en claro, colores según `evaluar` (`alta` → rojo, `media` → amarillo), web vieja → rojo aunque el vigilante no haya corrido, pieza vencida → amarillo | Sacar el archivo del workflow |
| **2. Rápido sin esperar** | `github.js`: caché cifrada con ETag e `If-None-Match`; guardar sin recargar todo; sondeo más liviano; service worker con versión | 2 sesiones | Medio (si la caché queda vieja, se vería lo de antes) | `celular-app.test.mjs` con un `fetchFn` de mentira: 304 usa lo guardado, 200 lo reemplaza, lo guardado sigue cifrado, el 409 sigue reintentando; `panel-actualiza.test.mjs` para el service worker | Un interruptor (`SIN_CACHE`) y revertir |
| **3. El panel nuevo, al lado** | `web/public/panel/nuevo/`: Hoy con los tres bloques, "Leer y publicar", Deshacer, modo oscuro. Usa los mismos `github.js`, `cifrado.js`, `textos.js` y la misma llave e IndexedDB (no hay que registrar el celular de nuevo) | 3-4 sesiones | Bajo: el viejo sigue igual | Prueba nueva `panel-nuevo.test.mjs`: sin nada de afuera, escribe con las mismas funciones que acepta la web (`problemaDeDecision`), Deshacer escribe `sinDecision`, una delicada nunca se publica sin "Leer y publicar"; `celular-app.test.mjs` sigue cuidando los formatos | Borrar la carpeta |
| **4. Notas y Más** | Notas (buscar, corregir, retirar con motivo tocable, volver a publicar 30 días); Más con las pantallas de hoy reordenadas (Pistas, Fotos, Fechas, Contactos, Revisión, Redes, Números livianos); Ayuda en una página | 3 sesiones | Bajo | `fotos-panel`, `numeros-panel`, `contactos-panel`, `panel-calendario`, `pistas-abiertas` siguen andando sobre los mismos módulos; casos nuevos para Retiradas a 30 días | Igual que la 3 |
| **5. El cambio** | Dos semanas de uso en paralelo; después `/panel/` pasa a ser el nuevo y el viejo queda en `/panel/viejo/` | 1 sesión | Medio (costumbre) | Actualizar `panel-hoy.test.mjs` ("arranca en Hoy, Fotos en Más") y la prueba de la página del panel (CSP, sin indexar, instalable) | Volver a apuntar `/panel/` al viejo (un commit) |
| **6. Limpieza** | Pasado un mes sin volver atrás: borrar el viejo, actualizar `docs/09-PANEL.md` y `docs/11-OPERACION.md` | 1 sesión | Bajo | `npm test` completo | El historial de git |

Total: unas 12 a 14 sesiones de trabajo, repartidas en 3 o 4 semanas con el uso en paralelo.

---

## Lo que deciden Hernán y Andrés

1. **¿Tres lugares abajo (Hoy, Notas, Más) o dos (Hoy y Más)?** Con dos, corregir una nota lleva un toque
   más. *Recomendación: tres.*
2. **"Publicar" en una nota común: ¿sale sin preguntar (con "Deshacer" unos segundos) o sigue la
   pregunta "¿Publicarla?"?** Las delicadas siempre se leen antes, en los dos casos. *Recomendación: sin
   preguntar, con Deshacer.*
3. **Las notas sin cuerpo que la IA todavía está reintentando, ¿dejan de aparecer?** Aparecerían sólo
   cuando la IA agotó los 3 intentos. *Recomendación: sí.*
4. **Los números del día: ¿alcanza con la medición de las 9 y las 21, o quieren verlos cada hora?** Cada
   hora es posible (es gratis), pero hay que sumar la lectura de Cloudflare a una corrida más frecuente.
5. **El semáforo: ¿que una pieza de redes que no salió sea amarillo (y rojo sólo lo que frena la web), o
   también rojo?** *Recomendación: amarillo.*
6. **¿Usan Contactos y Fechas desde el celular?** Si casi no, quedan en Más como están (no se borran);
   si sí, ¿alguna merece un atajo?
7. **¿Quieren "Compartir con el panel"?** Desde WhatsApp o X, "Compartir" → "Panel Radar" y queda
   cargada como pista. Hay que reinstalar la app del panel una vez.
8. **¿Arrancamos por la etapa 0 (los arreglos de textos y el error del borrador en el panel actual) ya,
   antes de decidir el resto?** No cambia cómo se usa; sólo corrige lo que hoy confunde.
