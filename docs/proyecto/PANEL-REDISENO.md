# El panel del celular, rehecho: qué hay, qué se usa y cómo queda

*24/10/2026. Propuesta para Hernán y Andrés. Hecha leyendo el código y los datos del repositorio (no se tocó el panel actual ni se entró a ninguna cuenta). Si esto y el código no coinciden, manda el código. Nada de lo que está acá se hace sin el sí de ustedes: al final hay cinco preguntas cortas.*

*Qué se leyó: `web/public/panel/` (19 archivos, 4.772 líneas), `panel/` (9 archivos, 1.122 líneas), `.github/workflows/panel.yml`, `docs/09-PANEL.md`, `PENDIENTES.md`, `docs/auditoria-2-0/F-ESTADO-Y-PLAN-2-0.md`, los archivos `web/data/` que usa el panel y el historial de git de los que escribe una persona. También la rama del otro agente que está armando «Pausa general» y «Actualizar ahora» (`infra/reloj-cloudflare/panel-api.mjs`, regla 317, todavía sin unir a `main`).*

*Hay un prototipo para ver las pantallas nuevas en el celular: `docs/proyecto/panel-prototipo/index.html` (un solo archivo, con datos inventados; ver el final).*

---

## 0. En diez líneas

1. El panel actual tiene **5 pestañas en la barra, 7 más escondidas en «Más», unos 67 botones distintos** y pesa **4.772 líneas** de programa más 1.122 del lado de la nube y 2.880 de pruebas. Se hizo cuando el robot corría en GitHub y había 20 a 30 notas por día esperando.
2. **Se usó en serio nueve días**: del 29/09 al 8/10. Hernán tomó **18 decisiones** (12 aprobó, 6 descartó), todas entre el 1 y el 8/10. **Desde el 8/10 no hay ninguna escritura hecha desde el panel** (16 días). Lo que se corrige o se retira hoy, se lo piden a Claude por chat: de las 156 correcciones guardadas, sólo 6 las escribió Hernán a mano.
3. La razón es doble: desde el 17/10 casi no espera nada (**de 20-30 notas esperando por día a 2-7**), y el panel tiene cosas rotas desde la mudanza a Cloudflare (sección 2.3). Lo que no se usó nunca: **Contactos (0 anotaciones), Fechas (nada elegido), retirar desde el panel (0)**; «mandar a las redes» desde el panel, una sola vez (y por error).
4. Hay **cuatro cosas que hoy no andan o mienten** y se arreglan antes de rehacer nada: «Actualizar la web ahora» dispara el robot viejo de GitHub; la pestaña Redes dice «las redes están apagadas» cuando están prendidas; «Escribir con IA» una nota que espera depende de una memoria de GitHub que ya no se renueva; y «Reintentar» busca videos en GitHub cuando ahora están en Cloudflare.
5. Lo que los dos necesitan desde el celular cabe en **ocho tareas** (sección 3): ver si anda todo, ver qué salió y qué no (con el motivo), decidir lo que espera, corregir una nota, retirarla, sumar una foto, pausa general / actualizar ahora, y mandar un dato para una nota propia.
6. **Diseño nuevo:** una pantalla de inicio con un **semáforo de salud** (verde, amarillo, rojo) y **cinco botones grandes**; cuatro pestañas abajo (Inicio, Decidir, Notas, Más); un paso por pantalla; modo oscuro; y una versión que **abre aunque no haya señal** con lo último que se vio.
7. **Se queda** lo que se usa (decidir, corregir, retirar, foto, redes de hoy). **Se fusiona** Pistas dentro de «Nota propia», Revisión dentro del semáforo, Borradores dentro de cada nota. **Se retira** Contactos, Candidatas y Feriados de Fechas, el recorrido, las explicaciones largas, el seguimiento de 14 días de las pistas y casi todo «Números». Todo queda en el historial de git y en una carpeta histórica; no se borra nada.
8. Se pueden sacar **unas 3.700 líneas** de las 9.000 que mueve hoy el panel (del programa del celular se va el 43 %; sección 5).
9. Se hace **por etapas y en paralelo** (el panel viejo sigue andando hasta que Hernán diga): primero arreglar lo roto, después un panel nuevo sólo para mirar, después las decisiones, después el cambio. La vuelta atrás de cada etapa es un clic (sección 6).
10. **El riesgo más grande no es del diseño sino de la llave:** la llave de GitHub que está en el celular puede escribir en todo el repositorio, y lo que se escribe ahí lo ejecuta el robot de Cloudflare. A mediano plazo conviene que el celular hable con un Worker con una llave propia y angosta (sección 7, riesgo 1).

---

## 1. Inventario: qué hay hoy

### 1.1 Cómo funciona por dentro (en cuatro frases)

El panel (`radarbalcarce.com/panel/`) es una página instalable que **no tiene servidor propio**: lee y escribe archivos del repositorio por la API de GitHub con la **llave de GitHub** de quien lo usa (guardada en el celular). Lo que espera a una persona o puede nombrar a un chico viaja **cifrado para cada celular registrado** (la llave privada no sale del celular). Cada decisión es un commit con el nombre de quien la tomó (`web/data/celular-decisiones.json`, `correcciones.json`). El robot (hoy en Cloudflare) la aplica en la próxima vuelta, cada media hora.

**Qué trae al abrir:** 12 lecturas a GitHub en paralelo (`cargar()` en `app.js`): portada (456 KB), esperando cuerpo, lo cifrado, decisiones, correcciones (155 KB), estado, libro de redes (281 KB), banco de fotos (**1,85 MB**), auditoría, revisión del archivo, correcciones de la IA y pistas. Son **unos 3 MB cada vez que se abre y cada vez que se guarda algo** (después de cada decisión vuelve a cargar todo). Con mala señal, eso es lo que hace que «tarde» o no abra. La pestaña Números suma otros 2 MB (el archivo de notas) y 3 pedidos más.

### 1.2 Las pantallas

La columna «Cuesta» dice qué gasta cada cosa: *API* = pedidos a GitHub (gratis); *Actions* = minutos de GitHub Actions (gratis mientras el repositorio sea público; con repositorio privado, US$ 0,006 a 0,008 el minuto); *IA* = pedidos a Gemini (cupo diario de 450 para redactar).

| Pantalla (archivo) | Qué muestra | Qué se puede hacer (botón → qué pasa) | Lee | Escribe | Workflow | Cuesta |
|---|---|---|---|---|---|---|
| **Entrar** (`app.js` `vistaLlave`) | Pide el nombre y la llave de GitHub | **Entrar** → prueba la llave, crea el par de llaves de cifrado del celular y sube la pública | `celular-llaves.json` | `celular-llaves.json` | — | API |
| **Hoy** (`hoy.js`) | Cuántas esperan tu OK, borradores, notas sin foto, redes de hoy, pistas con novedad | Cada renglón es un atajo | Lo ya cargado | — | — | 0 |
| **Esperan** (`app.js`) | Una lista con lo que necesita tu OK y lo que sale solo pero espera su cuerpo; cada nota dice por qué espera y si tendrá foto | Abrir una nota → **Publicar** (la IA la escribe, el control la verifica y sale), **Escribirla con IA para revisarla**, **Escribirla a mano**, **Descartar**, **Deshacer**, **Volver a traerla**, **Buscarle una foto**, tildar «mandarla también a las redes» | `portada.json` (lista corta), `celular-pendientes.json` (cifrado), `esperando-cuerpo.json`, decisiones, correcciones | `celular-decisiones.json`, `correcciones.json`, `celular-borradores.json` (lo escribe la nube) | **Panel del celular** (`panel.yml`, `accion=escribir`) | API + 1 corrida de Actions (~1 min) + 1 a 3 pedidos de IA por nota |
| **Publicadas** (`app.js`) | Las últimas 24 h (portada 36 h; archivo hasta 180 días con «Cargar el archivo»), buscador, y al final las retiradas de las últimas 24 h | **Editar** (título, bajada, cuerpo, sección), **Reescribir con IA**, **Mandar también a las redes** / **Sacar de la cola**, **Retirar de la web** (pide motivo), **Deshacer**, **Volver a publicar**, **Corregirla y volver a publicarla** | `portada.json`, `archivo.json` (1,9 MB, a pedido), papelera cifrada | `celular-decisiones.json`, `correcciones.json`, `retiradas.json` (sólo saca) | `panel.yml` (reescribir) | API + IA |
| **Redes** (`app.js`, `redes-estado.js`) | El cronograma de hoy, qué salió y qué no red por red con el motivo, qué cuenta cada repaso, posteos de Facebook y la cola | **Reintentar** una parte que falló | `celular-estado.json`, `redes.json` | — (la nube) | **Reintentar pieza** (`reintentar.yml`) | API + Actions |
| **Más** (`app.js`) | Menú con 7 tarjetas y nueve desplegables de «Cómo funciona» | **Actualizar la web ahora**, **Abrir la web**, **Actualizar el panel**, **Salir y borrar la llave** | — | — | **Actualizar la web** (`actualizar.yml`) | Actions (~8 min de armado) |
| **Borradores** (`borradores.js`) | Todo lo que se le pidió a la IA en 7 días | Abrir el borrador | `celular-borradores.json` (182 KB, cifrado) | — | — | API |
| **Fotos** (`fotos.js`) | Las notas de la portada sin foto, por qué y dónde buscarla (Google Imágenes, Wikimedia, las páginas de las fuentes) | **Sumar una foto** por enlace con crédito (la baja la nube), o **subir una foto del celular** (se achica en el teléfono y se escribe en el repositorio) | `banco-fotos.json` (**1,85 MB**) | `fotos-manuales.json` y `web/public/fotos-notas/<id>.jpg` | `panel.yml` (`accion=foto`) o directo | API + Actions |
| **Contactos** (`contactos.js`) | 43 instituciones + contactos propios, con el mensaje ya escrito | **Abrir WhatsApp / el correo** con el texto, **Ya le mandé**, **Respondió**, **Escribirles a todos de a uno**, sumar o borrar un contacto | `contactos-agenda.json`, `contactos-celular.json` (cifrado) | `contactos-celular.json` | — | API |
| **Pistas** (`pistas.js`) | Pegar un dato o un tuit; informe de qué medios lo cubrieron; lista de pistas abiertas con novedad | **Investigar**, **Volver a mirar ahora**, **Hacer la nota**, **Publicar como nota propia**, **Cerrar: ¿en qué quedó?** (5 resultados), **Reabrir 14 días**, **Archivar**, **Retirar la nota** | `pistas.json`, `celular-borradores.json` | `pistas.json`, `notas-de-pistas.json` | `panel.yml` (`pista`, `nota-pista`) y **Pistas** (`pistas.yml`) | API + Actions + IA + **búsquedas pagas con cupo** (Tavily, 1.000 por mes, ~8 por nota) |
| **Revisión** (`revision.js`) | Lo que marcó la auditoría con IA en notas ya publicadas (grave / a mirar / menor) y lo que corrigió sola | Sólo mirar | `auditoria-ia.json`, `revision-archivo.json`, `correcciones-auditoria.json` | — | — | API |
| **Fechas** (`fechas.js`) | «Mes armado» de Un día como hoy, «Candidatas» (20 por día) y «Feriados» | **Aprobar**, **Sacar**, **Pedir cambios**, elegir principal y acompañantes, filtrar por estilo | `efemerides-candidatas.json` (240 KB), `efemerides-piezas.json`, `feriados-piezas.json`, `efemerides-elegidas.json` | `efemerides-elegidas.json` | — | API |
| **Números** (`numeros.js`) | 14 bloques: por día, secciones, de Balcarce y de afuera, más leídas, medios, horas, de dónde llegan, aparatos, países, otras páginas, redes, notas por día, cómo cae la selección, cómo anda el sistema | Cambiar 7 / 14 / 30 días | `estadisticas.json`, `notas-por-dia.json`, `estadistica-seleccion.json` (190 KB), `archivo.json` (1,9 MB) y **las corridas de 3 workflows de GitHub** | — | — | API |
| **Una nota abierta**, **el borrador de la IA**, **el resultado** (`app.js`) | El texto, lo que contó cada medio, el recorrido de la nota, la barra de acciones fija abajo | Lo de arriba | — | — | — | — |
| **Modo de prueba** (`?demo`, `prueba.js`) | Notas inventadas | Probar sin guardar | — | — | — | 0 |

### 1.3 Los archivos y los workflows que toca

- **Escribe una persona** (desde el celular): `celular-decisiones.json` (aprobar, descartar, retirar, redes), `correcciones.json`, `retiradas.json` (sólo saca), `celular-llaves.json`, `contactos-celular.json`, `efemerides-elegidas.json`, `pistas.json`, `notas-de-pistas.json`, `fotos-manuales.json` y las fotos en `web/public/fotos-notas/`.
- **Escribe la nube para el celular:** `celular-pendientes.json` y `celular-estado.json` (el motor, cada vuelta), `celular-borradores.json` y `pistas.json` (el workflow «Panel del celular»), `auditoria-ia.json` y `revision-archivo.json`.
- **Workflows de GitHub que dispara el panel:** `panel.yml` (escribir, pista, nota-pista, foto), `pistas.yml`, `reintentar.yml` y `actualizar.yml`. Los cuatro siguen en GitHub; los últimos tres eran los que se iban a apagar en el pendiente P11 de `PENDIENTES.md`.
- **Qué cuesta tenerlo:** hoy US$ 0 (repositorio público). Con el repositorio privado, `panel.yml` y los otros gastarían minutos de Actions, y `actualizar.yml` ocho minutos por pedido. Pistas gasta cupo de Tavily.

---

## 2. Cuánto se usa de verdad

### 2.1 Qué se puede medir y qué no

Se mide **lo que se escribe** (queda un commit con nombre y fecha). **Lo que sólo se mira no deja rastro**: no sabemos cuánto se abre Hoy, Redes o Números. Esos casos están marcados «no medible» y la decisión es de ustedes (pregunta 4 del final).

### 2.2 Lo que dicen los datos (24/10/2026)

| Función | Qué hay en el repositorio | Lectura |
|---|---|---|
| Decidir lo que espera | 18 decisiones en total, **todas de Hernán**: 12 aprobadas (todas con la IA), 6 descartadas. Por día: 1/10 (7), 2/10 (4), 3/10 (6), 8/10 (1). **Ninguna desde entonces** | Se usó los primeros días, cuando esperaban 20 a 30 notas por día |
| Cuántas esperan hoy | Máximo de notas esperando por día, medido en cada vuelta: 37 y 40 el 8 y 9/10; **5 el 17/10; 6 el 19/10; 12 el 23/10; 3 hoy** (promedio de hoy: 2,3) | Desde que se sacaron los cupos (17/10) casi no hay nada que decidir |
| Corregir una nota | `correcciones.json`: 156 notas. **150 las escribió Claude** («redacción de Claude», «repaso editorial», «auditoría») y **6, Hernán**. Cinco más salen de «cuerpo escrito con IA desde el celular» (1 a 3/10) | Lo normal es pedirle a Claude por chat |
| Retirar | `retiradas.json`: 3, todas por Claude. **Retiradas desde el celular: 0** | El panel nunca se usó para retirar |
| Mandar a las redes desde el panel | `decisiones.redes`: **0** hoy. Hubo una sola marca (29/09) y se sacó porque se tocó sin querer | Prácticamente no se usó |
| Pistas | 4 pistas (3, 6, 7 y 8/10), las 4 terminaron en nota. Hoy hay 5 notas de pistas (2 las hizo el robot solo) | Se usó la primera semana; ninguna desde el 8/10 |
| Fotos a mano | 20 fotos en total (hasta el 8/10: 18; el 16/10: 2) | Se usa, poco |
| Borradores de la IA | 30 guardados, el último del 8/10 | Mismo patrón |
| **Contactos** | `contactos-celular.json`: **vacío** (sólo se cargó la siembra el 3/10) | **Nunca se usó** |
| **Fechas (efemérides elegidas)** | `efemerides-elegidas.json`: `{"dias":{},"feriados":{},"piezas":{}}` | **Nunca se usó** (y hoy el vigilante avisa que el mes que viene no está armado) |
| Celulares registrados | 3 llaves: «Celular de Radar Balcarce» (29/09), «Celular de Hernán» (29/09 y 30/09) | Hay que saber de quién es el primero (pregunta 3) |
| Redes de hoy, Revisión, Números, Hoy | No medible | — |

### 2.3 Lo que está roto, duplicado o contradice el sistema de hoy

Esto no es opinión: está en el código.

1. **«Actualizar la web ahora» dispara el robot viejo.** `app.js` hace `disparar('actualizar.yml')` en GitHub. El motor real corre en Cloudflare. Si hoy se toca ese botón y el workflow viejo no está apagado, corre **un segundo motor** en GitHub, que compite con el de Cloudflare por los mismos archivos. Es el pendiente **C6** de `PENDIENTES.md`. El otro agente lo resuelve con `POST /panel/vuelta` en el Worker del reloj.
2. **La pestaña Redes dice «Las redes están apagadas»** cuando están prendidas. Mira `celular-estado.json › redes.activas`, que hoy vale `false` porque lo calcula con la variable de GitHub `REDES_ACTIVAS` («No»); la que manda es `REDES_ACTIVAS_NUBE` de Cloudflare («Sí»). Hoy salieron posteos y reels y el panel muestra el cartel rojo.
3. **«Escribir con IA» una nota que espera depende de una memoria que ya no se renueva.** `panel/celular.mjs` busca la nota entera, con sus fuentes, en `.cache/celular-notas.json`, que sólo guardaba el workflow viejo «Actualizar la web» en la caché de GitHub Actions. El motor de Cloudflare no la escribe (no está en `infra/motor-cloudflare/archivos.mjs`). Las notas ya publicadas se reescriben bien (se leen de `portada.json`/`archivo.json`), pero **las que esperan a una persona dejarán de encontrarse** cuando se venza la caché vieja (GitHub borra las cachés sin uso a los 7 días). *Hay que verificarlo con una prueba real antes de la etapa 0.*
4. **«Reintentar» busca el video en GitHub.** `reintentar.yml` baja un artefacto «piezas-…» que armaba el workflow viejo «Redes»; hoy los videos están en el depósito R2 `radar-piezas`.
5. **Números pregunta por tres workflows de GitHub** (`actualizar.yml`, `redes.yml`, `vigilancia.yml`) para decir «cómo anda el sistema». Cuando se apaguen (P11) esa línea dirá siempre «0 corridas».
6. **Hoy** supone que la web se arma «cada media hora, en punto» (`proximoArmado`): con la vuelta de noche por hora (`MOTOR_NOCHE_CADA_HORA`) o el presupuesto de minutos, eso deja de ser cierto.
7. **Textos viejos:** «Entrar» pide la cuenta `balcardev@gmail.com` (la cuenta de ahora es `radarbalcarce@gmail.com`); dos lugares dicen que lo retirado queda «30 días» y otros «24 horas» (es 24 h a la vista); «Más» explica el repositorio de antes de la mudanza.
8. **Duplicados:** la nota abierta repite el estado de la lista (3 lugares dicen si tiene foto); Borradores, el marcador «borrador listo» y «Ver el borrador» son tres caminos al mismo borrador; Hoy, Más y la barra de abajo muestran los mismos números; Redes, Hoy y Números muestran «cómo salieron las redes».
9. **Pesado:** ~3 MB por apertura y por guardado, incluyendo un banco de fotos de 1,85 MB que sólo se usa para saber si una nota tiene foto (eso ya está en `portada.json`).
10. **Un riesgo con las fotos:** «subir una foto del celular» escribe el JPG en el repositorio. Cuando se prenda `FOTOS_EN_R2` (pendiente P3), las fotos nuevas no tienen que ir a git.

---

## 3. Las ocho tareas de todos los días

Salen de los datos de arriba, de `docs/11-OPERACION.md` y de lo que Hernán pidió en chat. Para cada una, la meta es **dos o tres toques**, sin pasar por menús.

| # | Tarea | Cuándo | Hoy | Meta |
|---|---|---|---|---|
| 1 | **¿Anda todo?** Ver en cinco segundos si la web se está armando, si las redes salen, si queda cupo de IA y si el vigilante tiene algo abierto | Varias veces por día | No hay: hay que juntar Hoy, Redes y Números, y Números mira GitHub | Un semáforo en la pantalla de inicio, con una frase |
| 2 | **¿Qué salió y qué no, y por qué?** Lo publicado en las últimas 24 h, y las historias que contaron muchos medios y no salieron, con el motivo en castellano (hoy hay 113 historias de 8 medios o más que no salieron como nota propia: 75 por llegar tarde, 22 repetidas de otra, 6 chimentos) | Una o dos veces por día | Hay que abrir un reporte aparte (`estadistica-seleccion.html`) o preguntarle a Claude | Una pantalla con dos pestañas: «Salieron» / «No salieron» |
| 3 | **Decidir lo que espera:** aprobar o descartar | Todos los días, 2 a 7 notas | Anda | Una nota por pantalla, «Publicar» o «Descartar», y se pasa a la siguiente |
| 4 | **Corregir una nota ya publicada** (un nombre, una tilde, un título) | Cuando se ve un error | Anda, pero se usa poco: se le pide a Claude | Buscar, abrir, tocar «Editar», guardar |
| 5 | **Retirar una nota rápido** (urgencia: un error grave, un nombre que no va) | Rara vez, pero tiene que ser inmediato | Anda; hoy nunca se usó desde el panel | Un botón rojo en la nota y un solo motivo; si es muy urgente, junto con «Pausa» |
| 6 | **Mandar una foto** a una nota sin foto | Unas pocas por semana | Anda (por enlace o desde la galería) | «Sumar una foto» desde el inicio: elegir la nota, elegir la foto de la galería, escribir el crédito |
| 7 | **Pausa general y Actualizar ahora** | Emergencia / apuro | **No existe** (otro agente lo está construyendo; el «Actualizar» de hoy apunta al robot viejo) | Dos botones grandes en el inicio; la pausa pide confirmar y se ve prendida en todas las pantallas |
| 8 | **Mandar un dato para que salga como nota propia** (un comunicado, un tuit, un mail) | Unas pocas por semana | Está dividido entre Pistas y el «flujo desde mail» | Una pantalla: pegar el dato → ver quién más lo cuenta → «Hacer la nota» → leer → «Publicar» |

Una **tarea semanal**, de Hernán, los lunes: mirar cómo cayó la selección (`estadistica-seleccion.json`) para regular `MINIMO_NACIONAL` y `MINIMO_AREAS_CHICAS`. Se resuelve con un renglón en Números que lleva al reporte que ya existe.

---

## 4. El diseño nuevo

### 4.1 Principios

1. **Primero la salud, después lo que hay que hacer.** Lo primero que se ve es un semáforo.
2. **Cinco botones grandes** en el inicio, nada más. Todo lo demás está a un toque en «Más».
3. **Un paso por pantalla.** Una nota por pantalla, una pregunta por vez, un botón principal por pantalla (rojo), el resto de contorno. Alto mínimo de botón: 56 px.
4. **Lenguaje de todos los días**, sin jerga: ver la tabla de abajo (4.5).
5. **Modo oscuro** automático (igual que el panel de hoy) y **letra grande** respetando el tamaño del teléfono.
6. **Abre sin señal** con lo último que se vio (4.6) y carga **menos de 150 KB** al abrir en vez de 3 MB.
7. **Nunca expone secretos y mantiene el cifrado**: no cambia nada de `cifrado.js`; la llave privada sigue sin poder salir del celular.
8. **Pocas cosas, bien hechas:** cada función que se agrega tiene que estar en la lista de las ocho tareas.

### 4.2 El mapa

Barra de abajo, **cuatro pestañas** (hoy son cinco):

```
 Inicio        Decidir (N)       Notas          Más
 (semáforo +   (lo que espera    (buscar,       (foto, nota propia, redes de hoy,
  5 botones)    tu OK, de a      corregir,       números, efemérides, revisión,
                una)             retirar)        ayuda, modo oscuro, salir)
```

**Inicio** (la pantalla que se abre):
- El **semáforo de salud** (4.3), con una frase («Todo anda», «Hay 2 cosas para mirar», «La web no se arma hace 70 minutos») y un toque para ver el detalle.
- Cinco botones grandes:
  1. **Decidir lo que espera** (con el número)
  2. **Qué salió y qué no**
  3. **Corregir o retirar una nota**
  4. **Sumar una foto** (con el número de notas sin foto)
  5. **Pausa general** / **Actualizar la web ahora** (dos botones lado a lado; la pausa pide confirmar)
- Cuatro números chicos: última actualización de la web, notas de hoy, cupo de IA, minutos de armado del ciclo.

Los flujos largos (**Decidir**, **Corregir**) son una cadena de pantallas con un solo camino: lista → nota → botón → «Listo, sale en la próxima vuelta» → «Siguiente».

### 4.3 El semáforo de salud: qué mira y de dónde sale

Un solo color, tres estados, y la razón en una frase.

| Color | Cuándo | Qué hacer |
|---|---|---|
| **Verde** | Última vuelta buena del motor de hace menos de 40 minutos (90 de noche), sin avisos abiertos del vigilante, ningún cupo arriba del 80 % | Nada |
| **Amarillo** | Un aviso de nivel «media» abierto, una pieza de redes que no salió, un cupo de IA arriba del 80 %, minutos de armado por arriba de lo que corresponde, o hay algo en Revisión para mirar | Entrar al detalle |
| **Rojo** | **Pausa prendida**, un aviso de nivel «alta» abierto, o el motor sin una vuelta buena hace más de 90 minutos | Entrar al detalle; la pausa se apaga con un botón |

El detalle tiene **seis renglones**, cada uno con ✓ / ⚠ / ✕, una frase y de dónde sale:

| Renglón | Qué dice | Sale de |
|---|---|---|
| **La web** | «Se armó hace 12 min. Próxima: 15:30.» | `GET /panel/estado` › `motor.ultimaBuena`, `enMarcha` (la rama del otro agente, regla 317) |
| **Redes** | «Hoy salieron 5 de 7 piezas; falló la historia de las 10.» (Y si las redes están apagadas de verdad, lo dice con la variable correcta) | `celular-estado.json › redes.piezas` + `redes.json` (hoy), y `REDES_ACTIVAS_NUBE` (etapa 0) |
| **IA** | «Redacción: 75 de 450 pedidos de hoy. Voz: 6 de 10 audios.» | `uso-ia.json` (hoy sólo anota la redacción: pendiente C19) y el libro de redes para los audios |
| **Armado de la web** | «Este ciclo: 3.120 de 6.000 minutos» | `ciclo.minutos` del reloj (regla 315; viene en `GET /panel/estado` o se suma en una etapa siguiente) |
| **Avisos abiertos** | Los de `vigilancia.json › abiertos`, con la frase traducida a lenguaje simple | `vigilancia.json` (los mismos que ya junta el informe diario) |
| **Para mirar** | «2 avisos graves de la revisión», si hay | `auditoria-ia.json` (cifrado) |

**Costos**, en una línea al pie: «Fijo: US$ 5 por mes (Cloudflare). Todo lo demás en planes gratis». Es el dato de `docs/proyecto/COSTOS-Y-RECURSOS.md` (con las advertencias que tiene ese documento: la factura manda). No se muestra «lo gastado» porque no hay forma de medirlo desde el repositorio; sí los cupos y los minutos, que son lo que se agota primero.

Ejemplo real de hoy (24/10, 13:38): el vigilante tiene 7 avisos abiertos y uno es «alta» («Instagram: no salió la historia del repaso de la mañana»). El semáforo estaría **rojo**, con la frase «Falló una historia de Instagram». Hoy eso no se ve en ninguna pestaña del panel; sólo llega por mail.

### 4.4 Qué se queda, qué se fusiona, qué se retira

«Histórico» quiere decir: el código se mueve a una carpeta fuera de lo que se publica y queda marcado en git con una etiqueta (`panel-v1-24-10-2026`). **No se borra.** Se puede traer de vuelta cuando se quiera.

| Hoy | Decisión | Dónde queda | Por qué |
|---|---|---|---|
| **Hoy** | **Se transforma** | **Inicio** (semáforo + cinco botones) | Es la pantalla que falta; la de hoy es una lista de atajos |
| **Esperan** (incluye «sin cuerpo») | **Se queda**, más corta | **Decidir** | Es la tarea 3. «Sin cuerpo» pasa a ser un cartelito en la lista («sale sola; la IA sigue intentando») |
| **Publicadas** (incluye Retiradas) | **Se queda** | **Notas** (buscar, corregir, retirar, volver a publicar, últimas 24 h; «buscar más atrás» sigue) | Tareas 4 y 5 |
| **Redes** | **Se achica y se fusiona** | «Qué salió» en el inicio y el renglón «Redes» del semáforo; en Más, «Redes de hoy» con ✓/✕ por pieza y el motivo | Se mantiene lo que sirve para saber si salió; se retiran «qué cuenta cada repaso» y la lista de la cola de Facebook |
| **Reintentar** (redes) | **Se retira por ahora** | Vuelve cuando exista del lado del Worker de tareas | Hoy busca videos en GitHub que ya no existen |
| **Más** | **Se queda, corto** | **Más** | Sólo accesos: Foto, Nota propia, Redes de hoy, Números, Efemérides, Revisión, Ayuda, Modo oscuro, Salir |
| «Cómo funciona» (9 desplegables) | **Se retira** | Una ayuda de 3 líneas por pantalla («¿Qué es esto?») | Es lo que más se repite con `docs/09-PANEL.md` |
| **Borradores** | **Se fusiona** | Dentro de cada nota («tiene un borrador») | Tres caminos al mismo borrador; nunca hay más de 2-3 |
| **Fotos** | **Se queda** como acción | Botón 4 del inicio: elegir nota → elegir foto → crédito | Tarea 6. Se retira el listado largo con enlaces de búsqueda; el banco de 1,85 MB deja de bajarse |
| **Contactos** | **Se retira** (0 usos) | Histórico. `ingesta/contactos-agenda.json` (las 43 instituciones) **no se toca**: lo usa la agenda | Nunca se anotó nada |
| **Pistas** | **Se fusiona** | **Nota propia**, en Más: pegar un dato → ver quién lo cuenta → hacer la nota → publicar | Es la tarea 8. Se retiran: volver a mirar a mano, el seguimiento de 14 días con novedades, los 5 resultados de cierre, reabrir, archivar |
| **Revisión** | **Se fusiona** | Un renglón del semáforo («2 para mirar») y una lista corta en Más | Lo grave ya llega por mail; «lo que corrigió solo» se retira (es informativo) |
| **Fechas** | **Se achica** | **Efemérides del mes** en Más: la lista de días armados, y aprobar, sacar o pedir cambios | Hernán pidió revisar el mes antes de que salga: eso se queda. «Candidatas» (elegir principal entre 20) y «Feriados» se retiran (nunca se usaron) |
| **Números** | **Se achica** | **Números** en Más: por día, secciones, más leídas, de dónde llegan, redes y «cómo cae la selección» (con el enlace al reporte) | Se retiran: a qué hora entra la gente, aparatos, países, otras páginas, los medios de lo más leído y «cómo anda el sistema» (pasa al semáforo). Si Hernán usa alguno, vuelve (pregunta 4) |
| Recorrido de la nota | **Se retira** | Una línea en la nota: «Entró de 4 medios; esperó por …; la aprobó Hernán a las 11:20» | Hoy ocupa media pantalla |
| **Modo de prueba** (`?demo`) | **Se queda**, más simple | Igual | Sirve para mostrarlo |
| «Actualizar el panel» | **Se queda**, escondido | Más › Ayuda | Es el arreglo cuando el teléfono guarda una versión vieja |

### 4.5 Palabras de todos los días

| Hoy dice | Pasa a decir |
|---|---|
| Esperan / Sin cuerpo | Para decidir / Falta el texto |
| Cuerpo, bajada | Texto, resumen (debajo del título) |
| Verificador | Control contra las fuentes |
| Semáforo rojo / amarillo (de una nota) | Tema delicado / Espera tu OK |
| Repaso, pieza, reel, historia | Video resumen, video, historia |
| Vuelta, corrida, ciclo | Actualización de la web, minutos del mes |
| Motivo `pocas_fuentes` | «Lo contaron pocos medios (hacen falta 3)» |
| Motivo `tarde` | «Llegó vieja: el hecho tiene más de 12 horas» |
| Motivo `repetida` | «Es lo mismo que otra nota que ya salió» |
| Motivo `ia_chimento`, `ia_extranjero` | «La lectura con IA la sacó: es un chimento» / «es de otro país, sin argentinos» |
| Motivo `semaforo_rojo` | «Tema delicado: no sale nunca sola» |
| Motivo `un_medio` | «Sólo la contó un medio» |
| Cupo | «Pedidos a la IA de hoy» |

Los motivos que ya guarda `estadistica-seleccion.json` (25 claves, regla 314) alcanzan para todo; sólo hay que traducirlos una vez en `textos.js`.

### 4.6 Con mala conexión

1. **Lo que se ve**: la última lectura buena se guarda en el teléfono (los archivos tal cual llegan, **los cifrados siguen cifrados**) y al abrir se muestra al instante con un cartel «Sin señal: lo que ves es de hace 12 minutos». Se actualiza apenas hay red.
2. **Lo que se baja**: sólo lo que hace falta y sólo si cambió (los pedidos a GitHub con `If-None-Match`/ETag no gastan datos si el archivo no cambió). Inicio y Decidir: menos de 150 KB. Notas baja la portada (456 KB) la primera vez que se busca. El banco de fotos y el archivo entero dejan de bajarse al abrir.
3. **Lo que se guarda**: después de decidir ya no se recarga todo; se actualiza lo que cambió (el panel ya recibe el archivo nuevo al guardar).
4. **Lo que se decide sin señal**: queda en una cola del teléfono («Guardado en el celular; se manda cuando haya señal») y se reintenta solo. Si la nota cambió mientras tanto, se avisa en lugar de pisar. Esta parte es opcional (etapa 4).
5. **Mensajes de error en lenguaje claro**, con el botón «Probar de nuevo»: nada de «GitHub contestó 409».

### 4.7 Seguridad (lo que no cambia y lo que se mejora)

- **No cambia:** el cifrado por celular (RSA-OAEP + AES-GCM, la llave privada no exportable, hasta 6 celulares), la CSP propia del panel (`connect-src 'self' https://api.github.com`, sin scripts de afuera), `noindex`, las preguntas antes de retirar o descartar, y que cada decisión lleve el nombre de quien la tomó.
- **Se agrega a la CSP** (cuando exista) el lugar al que habla el panel nuevo para pausa, actualizar y estado: lo más limpio es una ruta del mismo sitio (`radarbalcarce.com/panel-api/*` → Worker del reloj), así la CSP no cambia y no hay permisos de otro origen. Lo decide el otro agente.
- **Se mejora:** «Salir» borra también lo guardado para sin señal; los archivos cifrados que se guardan en el teléfono son los mismos que ya están en el repositorio público (no se guarda nada en claro que no estuviera ya en la pantalla); y el panel nuevo pide la llave con el **mínimo permiso**: Contents en lectura y escritura. El permiso Actions solo hace falta mientras sigan existiendo `panel.yml`, `pistas.yml` y `reintentar.yml` en GitHub.
- **Lo sensible nuevo** (la lista de «no salieron» con sus títulos): **va cifrada** igual que `celular-pendientes.json`, porque puede incluir temas del semáforo rojo. No se publican títulos de historias sensibles en el repositorio público.

---

## 5. Cuántas líneas se pueden sacar

Contadas con `wc` sobre el repositorio de hoy; los destinos son estimaciones.

| Parte | Hoy | Queda | Se saca |
|---|---|---|---|
| `app.js` | 1.991 | ~950 | ~1.040 |
| `github.js` | 375 | ~230 | ~145 |
| `textos.js` | 227 | ~130 | ~95 |
| `numeros.js` | 427 | ~180 | ~250 |
| `contactos.js` | 243 | 0 | 243 |
| `fechas.js` | 198 | ~70 | ~130 |
| `borradores.js` + `recorrido.js` | 102 | ~20 (dentro de `app.js`) | ~80 |
| `pistas.js` | 156 | ~70 | ~85 |
| `fotos.js` | 156 | ~110 | ~45 |
| `prueba.js` + `prueba-sobre.js` (modo de prueba) | 216 | ~110 | ~105 |
| `index.html` (el CSS «REDISEÑO DEL 2/10» pisa al de arriba) | 327 | ~280 | ~45 |
| `hoy.js` → inicio + `salud.js` + `sin-conexion.js` (nuevos) | 90 | ~290 | **+200** |
| `redes-estado.js`, `revision.js`, `cifrado.js`, `sw.js`, `manifest` | 261 | ~260 | 0 |
| **Programa del celular** | **4.772** | **~2.700** | **~2.070 (43 %)** |
| `panel/` (lado de la nube): `pistas-libro`, `pistas-solas`, `revisar-pistas`, `unir-conflictos` + la rama `pista` de `celular.mjs` | 1.122 | ~700 | ~430 |
| Workflows: `pistas.yml` + `reintentar.yml` | 226 | 0 | 226 |
| Pruebas que cuidan lo que se retira: contactos (174), fechas (131), borradores y recorrido (127), seguimiento de pistas (400) y parte de números | 2.880 | ~1.900 | **~980** |
| **Total** | **~9.000** | **~5.300** | **~3.700** |

Notas: no se cuentan `ingesta/pistas.mjs`, `ingesta/busqueda.mjs` ni `panel/nota-de-pista.mjs`, que se quedan para «Nota propia». Los números de «Queda» son un objetivo de diseño, no una promesa: se miden al cerrar cada etapa. **Una cosa más importante que las líneas: el panel nuevo pasa de 3 MB a menos de 150 KB al abrir y de 12 pedidos a 3.**

---

## 6. Cómo se hace: etapas, con vuelta atrás

Principio: **hasta la etapa 3 se agrega y no se reemplaza.** El panel viejo (`/panel/`) sigue andando y el nuevo vive aparte (`/panel2/`, con su propio service worker para no pisar al viejo). Se pasa de uno al otro cuando Hernán lo diga.

| Etapa | Qué se hace | Cómo se prueba | Vuelta atrás | Depende de |
|---|---|---|---|---|
| **0. Arreglar lo roto** (1 día) | (a) «Actualizar la web ahora» apunta a `POST /panel/vuelta`; (b) el cartel «redes apagadas» lee la variable de Cloudflare; (c) Números deja de pedir corridas de GitHub; (d) textos viejos; (e) confirmar con una prueba real si «Publicar» una nota que espera encuentra la nota (punto 2.3.3) y, si no, decidir si se resuelve con el Worker de tareas (etapa 4) | Las pruebas del panel que ya existen (`celular-app`, `panel-actualiza`, `redes-estado`) + mirar el botón en el celular | `git revert` de un commit chico | La rama de «Pausa general» y «Actualizar ahora» (regla 317) |
| **1. Panel nuevo, sólo para mirar** (3-4 días) | Inicio con semáforo, «Qué salió y qué no» (con `muy-contadas.json` y los motivos de `estadistica-seleccion.json`), Redes de hoy, Números corto. Sin ninguna escritura. Guarda lo último que vio para abrir sin señal | Modo de prueba `?demo`; Hernán lo usa una semana en el celular | Se deja de usar `/panel2/`: nada que deshacer porque no escribe | `GET /panel/estado` del otro agente |
| **2. Las decisiones** (4-5 días) | Decidir, Notas (corregir, retirar, volver a publicar), Foto, Pausa y Actualizar, copiando de `github.js` las mismas funciones y los **mismos archivos** (`celular-decisiones.json`, `correcciones.json`…): el motor y los workflows no cambian | Las pruebas de contrato que ya hay (`celular.test`, `celular-app.test`) más las del panel nuevo; probar con una nota inventada | Se sigue con `/panel/` (el viejo escribe los mismos archivos) | Etapa 1 |
| **3. El cambio** (1 día + 2 semanas de espera) | `/panel/` pasa a ser el nuevo; el viejo queda en `/panel-viejo/` (noindex) dos semanas; se cambia el `start_url` del manifest (quien lo instaló como app tiene que volver a instalarlo, o la app abre el viejo) | Hernán y Andrés lo usan una semana | Se vuelven a apuntar las dos rutas | Etapa 2 y el sí de Hernán |
| **4. Independizar la IA de GitHub** (a definir) | Que «Publicar» y «Hacer la nota» corran en el Worker de tareas con las notas en R2 (hoy: `panel.yml`, que usa una caché que ya no se renueva); que las fotos suban por el Worker; que «Publicar igual» una historia de 8 medios sin salir sea una decisión que entienda el motor (`forzar`). Se retiran `panel.yml`, `pistas.yml` y `reintentar.yml` | Pruebas del Worker | Los workflows de GitHub siguen existiendo (apagados) | P3 (fotos a R2), C2, P11 y la decisión de pasar a privado |
| **5. Las escrituras por un Worker** (opcional, recomendado) | Que el celular no tenga una llave de GitHub sino una llave propia del panel que sólo sirve para «decidir, corregir, retirar, foto, pausa»; el Worker es el único que escribe | Pruebas del Worker y un simulacro | Se vuelve a la llave de GitHub | Etapa 4. Destraba el pendiente C14 (sacar el estado de git) y pasar a privado |

**Cuándo hacer qué.** La etapa 0 no depende de nadie y evita un problema real hoy (el segundo motor). Las etapas 1 y 2 pueden esperar al lanzamiento sin riesgo (`F-ESTADO-Y-PLAN-2-0.md` dice que el panel nuevo no hace falta para lanzar). La 4 hay que tenerla pensada **antes de apagar los workflows viejos (P11)**, porque si no «Publicar» y las pistas se quedan sin camino.

**Qué se archiva y cómo** (en la etapa 3): etiqueta `panel-v1-24-10-2026` en git, y los archivos retirados en `historico/panel-v1/` (carpeta nueva en la raíz, fuera de `web/` para que no se publique, con una línea que diga qué es y qué la reemplaza). En `docs/09-PANEL.md` quedan sólo las pantallas que siguen.

---

## 7. Riesgos

| # | Riesgo | Qué puede pasar | Qué se hace |
|---|---|---|---|
| 1 | **La llave de GitHub del celular es una llave maestra.** Tiene Contents en lectura y escritura sobre todo el repositorio, y el motor de Cloudflare ejecuta lo que hay en `main` con sus secretos | Quien se quede con un celular desbloqueado o con la llave puede escribir código en `main` y que lo corra el robot (que tiene las claves de Meta, Gemini, etc.). Hoy sólo se limita por la CSP y por no compartirla | Corto plazo: una llave por persona con vencimiento (se renueva el 29/09/2027, está en `PENDIENTES.md`), «Salir» en el celular perdido y borrarla en GitHub. Mediano plazo: **etapa 5**, una llave propia del panel que no escribe código. Consultar con ustedes si conviene proteger `main` desde ya (el robot necesita poder escribir los datos) |
| 2 | **El repositorio es público**: todo lo que el panel lea de `web/data/` lo puede leer cualquiera | Un título sensible en claro | Lo sensible nuevo (la lista de «no salieron» con títulos) va **cifrado** igual que lo que espera; la prueba `celular.test` ya cuida que lo cifrado no salga en claro |
| 3 | **El panel depende de GitHub Actions para la IA** (`panel.yml`) | Si se apagan los workflows (P11) o se pasa a privado, «Publicar», «Hacer la nota» y «Sumar foto» dejan de andar | Etapa 4 antes de P11. Mientras, no apagar `panel.yml` |
| 4 | **Fotos a R2** (P3) | «Subir una foto del celular» escribe un JPG en git; cuando `FOTOS_EN_R2` esté prendida eso se contradice | Que el panel nuevo suba las fotos por un Worker (etapa 4) o que la etapa 2 no incluya subir del teléfono hasta entonces (sólo por enlace) |
| 5 | **Guardado sin señal** | Una decisión vieja pisa algo cambiado después | Opcional y al final. Cada decisión lleva su fecha; si la nota cambió, se avisa en vez de pisar |
| 6 | **Pausa general** es un botón peligroso | Un toque de más pausa la web | Pide confirmar con un texto que explique qué frena; queda prendida y a la vista en todas las pantallas; sólo la apaga alguien con un botón grande; no frena a `panel.yml` ni al vigilante |
| 7 | **Cambio de ruta y de la app instalada** | Quien instaló «Radar Balcarce Panel» sigue viendo el viejo | Se hace en la etapa 3 con aviso en el viejo; el manifest cambia de `start_url` |
| 8 | **Se pierden pruebas útiles al retirar** | Se retira una prueba y con ella un caso real | Las pruebas del cifrado, del contrato de `celular-decisiones.json` y de `problemaDeDecision` no se tocan (regla del repositorio: cada arreglo de algo mal publicado lleva su prueba) |
| 9 | **Celulares registrados que ya no existen** | Un teléfono viejo sigue pudiendo abrir sobres (y los viejos del historial público también) | Revisar la lista de `celular-llaves.json` (pregunta 3) y sacar los que no se usan |
| 10 | **Cuenta de GitHub** | El panel y la rama del otro agente asumen que quien usa el panel es colaborador con permiso de escritura | Ya es así hoy; no se agrega nada |

---

## 8. Preguntas para Hernán y Andrés

Para contestar con «sí» o «no», una por vez:

1. **¿Retiramos Contactos y, de Fechas, las pantallas de «Candidatas» y «Feriados»?** (Nunca se usaron; el código queda guardado.) *Recomendación: sí.*
2. **¿Pistas pasa a ser sólo «Nota propia desde un dato»** (sin el seguimiento de 14 días ni los cierres)? *Recomendación: sí.*
3. **¿De quién es «Celular de Radar Balcarce»** (registrado el 29/09)? Si no se usa, se saca de la lista.
4. **De Números, ¿qué miran de verdad?** Si no contestan, queda la versión corta (por día, secciones, más leídas, de dónde llegan, redes, y cómo cae la selección); lo demás vuelve si lo piden.
5. **¿Armamos el panel nuevo aparte (`/panel2/`) y se pasan cuando les guste?** *Recomendación: sí.*

---

## 9. El prototipo

`docs/proyecto/panel-prototipo/index.html`: un solo archivo, sin conexión a nada, con datos inventados (más un par de avisos reales de hoy). Se abre en el navegador; en el celular hace falta que alguien lo suba a un lugar donde se pueda abrir (por ejemplo, copiarlo a `web/public/panel-prototipo/` por unos días, o publicarlo como página privada). Muestra: el inicio con el semáforo (se puede probar verde, amarillo y rojo), el detalle de la salud, Decidir de a una nota, Qué salió y qué no, Notas (buscar, corregir, retirar), Sumar una foto, Pausa y Actualizar, Más, y el cartel de «sin señal». Los botones no guardan nada. El modo oscuro sigue el del teléfono (y se puede forzar desde Más).
