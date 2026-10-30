# 09 · El panel del celular

*Actualizado el 17/10/2026 (revisado contra `web/public/panel/`, `panel/celular.mjs`
y `panel.yml`; las secciones con fecha del final cuentan cada cambio en su día). Si
algo de acá no coincide con el código, manda el código.* Qué es cada nota y por qué el semáforo la pone de un color:
`docs/03-SELECCION.md`; cómo escribe la IA: `docs/04-REDACCION.md`; cómo usa la
web lo que se decide: `docs/06-WEB.md`; las redes: `docs/07-REDES.md`; el paso a
paso de todos los días (crear la llave, instalar, decidir, corregir):
`docs/11-OPERACION.md`.

## En una frase

**El panel del celular** (`radarbalcarce.com/panel/`) es una app sin servidor
propio que habla directo con GitHub con la llave de quien lo usa (y, desde el 24/10, con la misma llave, con el
Worker del reloj de Cloudflare para la pausa general y «Actualizar la web ahora»: sección del final), para aprobar,
editar, retirar (y volver a publicar), pedirle a la IA que escriba una nota,
seguir pistas y hacer notas propias, sumar fotos, escribirles a los contactos,
armar las efemérides, ver lo que sale hoy en las redes, lo que marcó la
auditoría y los números, con la PC apagada.

El panel de la PC (puerto 4321) se retiró el 17/10/2026: nunca se usó; queda en el
historial de git. Los avisos publicitarios se editan a mano en `web/data/avisos.json`
(`docs/11-OPERACION.md`, tarea 13).

---

## Cómo funciona

### Qué es y cómo se instala

- Son archivos de la web (`web/public/panel/`: `index.html`, `app.js`,
  `github.js`, `cifrado.js`, `textos.js`, una pantalla por archivo —`hoy.js`,
  `borradores.js`, `fotos.js`, `contactos.js`, `pistas.js`, `revision.js`,
  `fechas.js`, `numeros.js`, `redes-estado.js`, `recorrido.js`—, el modo de
  prueba `prueba.js` y `prueba-sobre.js`, `sw.js` y `manifest.webmanifest`) que
  Cloudflare publica con el sitio. Los textos que explican cada cosa (por qué
  espera una nota, qué hace cada botón, las preguntas antes de confirmar) están
  todos en `textos.js`. No hay servidor propio: todo lo que lee y escribe pasa
  por la API de GitHub.
- **Se instala desde Chrome**: menú ⋮ → **"Instalar app"** (o "Agregar a
  pantalla principal"). Chrome lo convierte en app: ícono propio, pantalla
  completa y se actualiza solo. No hace falta un .apk.
- No se indexa (`web/lib/robots.js` y `X-Robots-Tag`) y sólo puede hablar con
  GitHub (una `Content-Security-Policy` propia en `web/public/_headers`):
  guarda la llave de quien lo usa, así que no carga nada de afuera.

### La llave de GitHub

Para entrar hace falta una **llave de GitHub**: un *fine-grained personal
access token* con acceso al repositorio **`radarbalcarce/radar-balcarce`**
(desde la mudanza del 15/10/2026 el dueño es la cuenta `radarbalcarce@gmail.com`;
antes era `balcar-dev/radar-balcarce`, de `balcardev@gmail.com`), que una
persona crea una sola vez y pega en el celular junto con su nombre (va en cada
decisión, en `por`). El panel le habla a ese repositorio (`REPO`,
`web/public/panel/github.js`).
**Sólo quien tiene la llave puede tocar algo**: la página es pública, pero sin
llave no lee lo cifrado ni escribe nada.

Se crea en github.com → Settings → Developer settings → Fine-grained tokens →
Generate new token (el panel tiene el enlace directo):

| Campo | Qué poner |
|---|---|
| Token name | "Panel del celular" |
| Expiration | Un año (anotar la fecha) |
| Resource owner / Repository access | La dueña del repositorio, `radarbalcarce`; "Only select repositories" → **radar-balcarce** |
| Repository permissions | **Contents**: "Read and write" y **Actions**: "Read and write". Nada más |

- Queda guardada **sólo en ese celular** (en el navegador) y nunca va por chat
  ni por mail. GitHub la muestra una sola vez: si se pierde, se crea otra.
- Puede ser la misma llave en los dos celulares o una por persona (así, si se
  pierde un celular, se borra sólo esa).
- **Para revocarla** (celular perdido, llave expuesta): en GitHub, el mismo
  lugar donde se creó → la llave → **Delete**. En el celular, "Más" → "Salir y
  borrar la llave de este celular".
- Al entrar, el panel prueba que la llave pueda escribir en el repositorio; si
  no, dice qué permiso falta. Vencida o borrada, dice "La llave no anda" y pide
  otra.

### Cómo viajan los datos

1. **La primera vez**, el celular crea su par de llaves de cifrado (con la
   criptografía del navegador). La **privada** queda en el navegador y no sale
   nunca del celular; la **pública** se sube a `web/data/celular-llaves.json`.
   Hasta 6 celulares (`LLAVES_MAXIMAS`, `panel/cifrado.mjs`).
2. **Cada corrida de "Actualizar la web"** (sólo en la nube) arma:
   - **lo que espera a una persona**, con todo lo que hace falta para decidir
     (`paraDecidir`, `panel/celular-datos.mjs`): el resumen de la fuente
     principal, **lo que contó cada medio** (su resumen, si es oficial y el
     enlace a la nota original), el motivo, lo que anotó la IA al leerla (de
     dónde es el hecho, su importancia, por qué le importaría a un vecino:
     `web/data/fichas.json`). **La IA no escribe sola lo que espera** (29/09,
     Hernán: "si la nota no sale en automático, la idea es que no se escriba
     nada"; regla 68): lo escribe sólo si una persona lo pide;
   - **la papelera**: lo que retiró una persona, tal como estaba publicado (ver
     "Retirar y volver a publicar", más abajo);
   - las dos cosas **cifradas para cada celular registrado**, un sobre por nota
     (`cerrarCadaUno`, `panel/cifrado.mjs`: AES-256-GCM, con la llave de cada
     sobre cifrada con la pública de cada celular), en
     `web/data/celular-pendientes.json` (versión 2). Una nota que no cambió
     conserva su sobre, así git guarda sólo lo nuevo;
   - las notas enteras, con sus fuentes, en la caché de Actions
     (`.cache/celular-notas.json`), que no es pública, para "Escribir con IA";
   - **`web/data/celular-estado.json`**, sin cifrar (es de lo ya publicado):
     cuántas notas hay en la portada y en el archivo, y **la previa de las
     redes** (`previaDelDia`, `redes/previa.mjs`): el cronograma de hoy, qué
     cuenta cada repaso (con la misma función que usa el plan de los videos,
     `repasosDelDia` en `redes/repasos.mjs`), la cola de Facebook y si las redes
     están prendidas (`REDES_ACTIVAS`, que el workflow le pasa sólo para esto).
   **¿Por qué cifrado?** El repositorio es público y esas notas pueden nombrar
   a un acusado o a un chico (regla 79). Por lo mismo, la lista corta de
   `portada.json` va sin titular cuando la nota es de Policiales o habla de
   chicos o de víctimas: es lo que muestra "Esperan" hasta que llega la cifrada
   (un celular recién registrado la recibe en la próxima actualización).
3. **El celular lee** con la llave: `portada.json`, `esperando-cuerpo.json`
   (con cuántas veces lo intentó la IA), `celular-pendientes.json` (lo abre con
   su llave privada), `celular-decisiones.json`, `correcciones.json`,
   `celular-estado.json`, `redes.json` (el libro de las redes, para decir al
   momento lo que ya salió) y, si se pide, `archivo.json`.
4. **"Escribir con IA"** dispara el workflow **"Panel del celular"**
   (`.github/workflows/panel.yml`) con la nota, el pedido (opcional) y una marca
   para encontrar la corrida. `panel/celular.mjs` busca la nota en la caché (lo
   que trajo la última ingesta) o en lo publicado (portada, esperando cuerpo,
   archivo), y `panel/reescribir-una.mjs` la escribe por el mismo camino que la
   redacción automática: el texto completo de las fuentes, los antecedentes,
   `CRITERIO-EDITORIAL.md` § 12 con el pedido al final (nunca por encima de las
   reglas), los arreglos que no inventan y el mismo verificador. La diferencia:
   no descarta nada en silencio, devuelve el texto con la lista de lo que no
   cuadra con las fuentes. Lo rojo no se escribe nunca. El borrador queda
   **cifrado** en `web/data/celular-borradores.json` (hasta 30, por 7 días).
   Tarda un minuto: el celular espera y lo abre. El registro del workflow no
   muestra nada de la nota.
5. **Lo que decide la persona** se escribe en el repositorio por la API de
   GitHub, en un commit con su nombre ("Panel del celular: Hernán aprueba una
   nota"), una nota por renglón (el historial muestra una línea por decisión).
   Si otro cambió el archivo en el medio, lo vuelve a leer y reintenta.
6. **La próxima corrida de "Actualizar la web"** lo aplica: `generar-datos.mjs`
   lee las decisiones del celular (`leerDecisionesCelular`,
   `panel/celular-datos.mjs`), que son las únicas decisiones de una persona
   (`web/data/celular-decisiones.json`). Para no esperar la media hora:
   "Actualizar la web ahora" (unos 8 minutos hasta la web).

### Las pestañas

**Cómo está hoy (16/10/2026).** La **barra de abajo** tiene cinco pestañas:
**Hoy**, **Esperan**, **Publicadas**, **Redes** y **Más** (`app.js`). El panel
arranca en **Hoy** (desde el 8/10, `hoy.js`): lo que espera tu toque, los
borradores de la IA, las notas sin foto, cómo viene el día en las redes y las
pistas con novedad, cada uno con un atajo. **Sin cuerpo ya no es una pestaña**:
desde el 2/10 va adentro de Esperan. Desde **Más** se abren ocho tarjetas
(`MENU_MAS`): **Escribir una nota** (30/10; también es un botón de Hoy: sección «Escribir una nota»), **Borradores**, **Fotos**, **Contactos**, **Pistas**,
**Revisión**, **Fechas** y **Números**, cada una con su "← Más" para volver.
Cómo se llegó a esto: "El panel reordenado" (2/10), al final.

Cada pestaña tiene arriba un "¿Qué es esto?" que la explica, y "Más" explica
todo el panel.

| Pestaña | Qué muestra | Qué se puede hacer |
|---|---|---|
| **Hoy** | Un resumen del día con atajos: lo que espera, los borradores listos, las notas sin foto, las redes de hoy y las pistas con novedad | Tocar el atajo para ir a cada cosa |
| **Esperan** | Lo que espera a una persona, **de las últimas 48 horas** (`HORAS_EN_ESPERAN`), nunca lo rojo, y sin el "relleno" que tampoco se avisa por mail (lo de afuera poco contado, la cotización del dólar). En la lista, el motivo en pocas palabras ("Acusa a alguien ("detenido")"). Al abrirla: **por qué espera y qué mirar** (`explicarMotivo`), lo que anotó la IA al leerla, el resumen de la fuente principal y **lo que contó cada medio**, con el enlace a la nota original. La IA no las escribe sola. Abajo, las aprobadas que salen en la próxima actualización y las **descartadas** | **Escribirla con IA** (con un pedido opcional; tarda un minuto y muestra el texto con lo que marcó el verificador, para corregirlo) → **Publicar**; **Escribirla a mano**; **Descartar** (pregunta antes). Una descartada se puede **Volver a traer** mientras siga en las noticias del día; una aprobada, **Deshacer** hasta la próxima actualización |
| **Sin cuerpo** (adentro de Esperan) | Las notas que **salen solas** pero todavía no tienen un cuerpo que pase el verificador (`esperando-cuerpo.json`), con cuántas veces lo intentó la IA (hasta 3, `MAXIMO_DE_INTENTOS`): mientras le queden intentos, la IA la vuelve a probar sola en cada actualización | **Escribir con IA ahora** o **Escribir a mano** → "Publicar con este cuerpo" |
| **Publicadas** | Las de **las últimas 24 horas** (`HORAS_EN_PUBLICADAS`), lo más nuevo primero; "Ver también las anteriores" suma el resto de la portada (36 horas) y "Cargar el archivo", las que tienen página (hasta 180 días en teoría; el tope real es el de `TOPE_DE_NOTAS`, hoy 500, con techo de 3.700); buscador por título o sección. Cada nota dice si salió en Facebook e Instagram o si está en la cola. Al final, **Retiradas**: lo que retiró una persona en las **últimas 24 horas** (`HORAS_RETIRADAS`) | **Editar** (título, bajada, cuerpo y sección), **Reescribir con IA** (con pedido), **Mandar también a las redes** (o "Sacar de la cola de las redes"; pregunta antes), **Retirar de la web** (pregunta y pide el motivo) y **Deshacer**. En las retiradas: **Volver a publicar** o **Corregirla y volver a publicarla** |
| **Redes** | El cronograma de hoy (cada pieza con su hora, su voz y si salió, está en su horario o ya no sale), **qué cuenta cada repaso** (lo que contó, o lo que contaría si saliera ahora), los posteos de Facebook de hoy, cuándo puede salir el próximo y la cola. Si las redes están apagadas (`REDES_ACTIVAS`), lo dice arriba | Mirar. Para mandar una nota: Publicadas → "Mandar también a las redes" |
| **Borradores** (en Más) | Todo lo que se le pidió a la IA en los últimos 7 días: lo que está para leer y lo ya resuelto (`borradores.js`) | Abrir el borrador y seguir desde la nota |
| **Fotos** (en Más) | Las notas de la portada sin foto, por qué y dónde buscarle una (`fotos.js`; detalle en "El panel reordenado") | **Sumar una foto** (dirección y crédito) |
| **Contactos** (en Más) | Instituciones y contactos propios (`contactos.js`; "Contactos en el celular", al final) | Escribirles (lo manda una persona) y anotar quién respondió |
| **Pistas** (en Más) | Las pistas abiertas y en qué quedó cada una (`pistas.js`; al final) | Pegar una pista, volver a mirarla, hacer la nota, cerrarla |
| **Revisión** (en Más) | Lo que marcó la auditoría con IA en lo ya publicado (`revision.js`; al final) | Mirar; lo delicado lo corrige una persona |
| **Fechas** (en Más) | "Un día como hoy" y los feriados, con el mes armado (`fechas.js`; al final) | Aprobar, sacar o pedir cambios |
| **Números** (en Más, desde el 1/10) | Cuánta gente lee la web (visitas y vistas por día, comparado con el período anterior; 7, 14 o 30 días), **qué sección se lee más** (con las notas publicadas y las vistas por nota), las notas y los medios más leídos, lo de Balcarce contra lo de afuera, **a qué hora entra la gente**, **de dónde llegan** (Facebook, Google, directo o WhatsApp…), con qué aparato y desde qué país, cómo crecen Facebook e Instagram, cuántas notas salen por día, **cómo cae la selección** (cuántas historias llegan, cuántas salen y por qué no; secciones con días sin notas; con el enlace al reporte completo `/panel/estadistica-seleccion.html`, regla 261) y cómo anda el sistema (corridas de Actions con falla). Lo mide `redes/estadisticas.mjs` a las 9 y las 21 (el detalle, en `redes/estadisticas-detalle.mjs`, vuelve a pedir los últimos tres días cada vez) y se guarda en `web/data/estadisticas.json` (`dias`); la pestaña lo lee con `web/public/panel/numeros.js`. Sólo números agregados, nunca quién entró. Cloudflare los da aproximados (no cuenta robots ni bloqueadores) | Mirar; cambiar entre 7, 14 y 30 días |
| **Más** | Las siete tarjetas de arriba (con un aviso si hay algo: borradores para leer, notas sin foto, pistas con novedad, algo grave en Revisión), quién entró y **cómo funciona todo**, pregunta por pregunta | **Actualizar la web ahora**, abrir la web, **Salir y borrar la llave de este celular** |

Al aprobar hacen falta título, bajada y cuerpo, con el texto de la IA o
editado. Con menos de 70 palabras de cuerpo pregunta antes de guardar (con
menos de 70 una nota automática no sale sola). El borrador muestra lo que el
verificador marcó contra las fuentes y lo que sacó. Se puede cambiar la
sección y, en lo que espera o no tiene cuerpo, marcar "Mandarla también a
Facebook e Instagram" (pregunta antes de guardar).

**Las preguntas antes de confirmar** (29/09, Hernán: "estaría bueno que re
pregunte antes de mandar"): mandar a las redes, sacar de la cola, retirar,
descartar, volver a publicar y publicar un cuerpo corto preguntan en una
ventana que explica qué va a pasar (`PREGUNTAS` y `preguntaRedes`,
`textos.js`); el foco queda en "Cancelar", para que un toque de más no
confirme. Deshacer no pregunta.

### Qué escribe

| Archivo | Qué guarda | Cuándo |
|---|---|---|
| `web/data/celular-decisiones.json` | `notas`: aprobar = `publicada` con el texto entero (`deIA` si lo escribió la IA, con sus partes internas), descartar = `descartada`, retirar = `bloqueada` con el motivo (y `antes: "publicada"` si estaba aprobada desde el celular, para que deshacer la deje aprobada); volver a publicar = `publicada` con el texto que tenía; cada una con `por` y `cuando`. `redes`: las marcadas para Facebook e Instagram | Aprobar, descartar, retirar, volver a publicar, deshacer, marcar para las redes |
| `web/data/correcciones.json` | Título, bajada, cuerpo o sección, con `motivo`, `cuando` y `por` (el mismo archivo de las correcciones a mano). Un texto de la IA revisado lleva `deIA: true` y firma "Redacción asistida con IA, revisada por la redacción"; uno escrito a mano, "Revisada por la redacción" | Editar, escribir un cuerpo, cambiar la sección al aprobar |
| `web/data/retiradas.json` | Sólo **saca** una nota (nunca agrega) | Volver a publicar una nota que se retiró a mano ahí |
| `web/data/celular-llaves.json` | Las llaves públicas de los celulares | La primera vez que entra cada celular |
| `web/data/notas-de-pistas.json` | Las notas propias que nacen de una pista (con motivo, cuándo y quién, `aprobadaParaRedes` y `paraElRepaso`) | "Publicar como nota propia" |
| `web/data/notas-de-redaccion.json` y `web/public/fotos-notas/redaccion-*` | Las notas que escribe una persona desde la pestaña Escribir (con motivo, cuándo y quién) y sus fotos | "Publicar", editar, retirar y volver a publicar (sección «Escribir una nota») |
| `web/data/pistas.json` | El estado y el resultado de cada pista | Cerrar, reabrir, archivar, marcar vista una novedad |
| `web/data/contactos-celular.json` | Los contactos propios y las anotaciones, cifrados | Sumar un contacto, "Ya le mandé el mensaje", "Respondió" |
| `web/data/efemerides-elegidas.json` | Lo elegido en Fechas | Aprobar, sacar o pedir cambios en el mes armado |
| `web/data/fotos-manuales.json` | Las fotos sumadas a mano (también lo escribe "Panel del celular" con `accion=foto`) | Sumar o sacar una foto |

**Ningún workflow toca `celular-decisiones.json`, `correcciones.json` ni
`celular-llaves.json`**, así nunca se pisan; `retiradas.json` sólo lo poda
"Actualizar la web" los lunes (le saca las de más de 7 días). `pistas.json`
y `notas-de-pistas.json` los escriben también los workflows "Panel del celular"
y "Pistas": si chocan, el workflow los une entrada por entrada y, si una
persona y el robot cambiaron lo mismo, gana la persona (`panel/unir-conflictos.mjs`).
`problemaDeDecision` (`panel/celular-datos.mjs`) exige que aprobar traiga el
texto entero (una decisión humana sin texto publicaría el de la fuente tal
cual, que es copiar a otro medio) y que retirar traiga el motivo; lo que no
vale se saltea, y una prueba avisa antes de publicar.

### Retirar y volver a publicar: la papelera

"Retirar de la web" no borra nada. Una nota retirada por una persona (desde el
celular o en `retiradas.json`) pierde su página en la
próxima actualización, y la corrida la guarda **tal como estaba publicada** en
la papelera (`papeleraAlDia`, `panel/celular-datos.mjs`; en la caché de
Actions, `.cache/papelera.json`, porque el repositorio es público y una nota se
puede retirar justamente por lo que dice). La papelera guarda cada nota **30
días** (`DIAS_EN_LA_PAPELERA`), pero desde el 2/10 el celular muestra al final
de "Publicadas", cifradas, sólo las retiradas **de las últimas 24 horas**
(`HORAS_RETIRADAS`, `app.js`): después ya no se ven ni se pueden volver a
publicar desde el panel.

- **Antes de la próxima actualización**, "Deshacer" la deja como estaba (si
  estaba aprobada desde el celular, sigue aprobada).
- **Después, durante las 24 horas que se ve**, "Volver a publicar" la aprueba de nuevo con el texto que tenía
  (o corregido, con "Corregirla y volver a publicarla"). En la próxima
  actualización vuelve a su página, **con la misma dirección**; si es de las
  últimas 36 horas, también a la portada. Si se había retirado en
  `retiradas.json`, el celular también la saca de ahí.
- **Vuelve sólo lo que una persona vuelve a aprobar después de retirarlo.** Que
  deje de estar retirado no alcanza: `retiradas.json` se poda solo los lunes
  (regla 69) y eso no es volver a publicar.
- Lo que ya salió en Facebook o Instagram no se borra al retirar ni vuelve al
  volver a publicar: allá se maneja a mano.

### Las redes: aprobar no es publicar en redes

Lo que salió en la web porque lo aprobó una persona (era amarillo) **no va
solo** a las redes. Va si la persona lo manda con **"Mandar también a las
redes"** (antes pregunta), y así sí puede ir Política o Policiales (regla 78,
`vaAFacebookPorLoQueEs` en `redes/elegir.mjs`): sale en el próximo posteo que
permitan las reglas de Facebook (de 8 a 22, 90 minutos entre posteos, 5 por
día), antes que las demás. Mientras no salga, se saca de la cola con el mismo
botón; una vez publicada, sólo se borra a mano en Facebook e Instagram. Los
podcasts siguen sin Política ni Policiales.

**La excepción, desde el 16/10/2026: las notas propias.** Una nota que una
persona publica como nota propia (desde una pista, "Publicar como nota propia",
o pedida por mail: `docs/flujos/NOTA-DESDE-MAIL.md`) se guarda con
`aprobadaParaRedes: true` y `paraElRepaso: true` (`github.js`): durante **12
horas** desde que se aprobó entra primera en el próximo repaso (podcast) de las
redes, aunque no le alcance el puntaje (`notasDePistas`,
`web/lib/notas-de-pistas.js`; `elegirParaPodcast`, `redes/elegir.mjs`), siempre
que sea de lo que puede ir en un repaso (`sePuedeEnUnRepaso`).

### El modo de prueba

`radarbalcarce.com/panel/?demo`: notas inventadas, no pide llave y no guarda
nada (`web/public/panel/prueba.js`). Sirve para mostrarlo o probar un cambio.

### Límites

- **El pedido a la IA queda a la vista en GitHub** (es un dato de la corrida):
  el celular avisa que no se pongan nombres.
- **Nada es instantáneo**: lo decidido sale en la próxima vuelta de "Actualizar
  la web" (cada media hora) o con "Actualizar la web ahora" (unos 8 minutos).
- **Retirar de la web no borra lo que ya salió en Facebook o Instagram**: eso
  se borra a mano en la red (el celular lo recuerda).
- **Lo que contaría un repaso puede cambiar hasta su hora**: la pestaña Redes
  muestra lo que elegiría si saliera ahora, calculado en la última
  actualización.
- **No maneja** los avisos publicitarios (se editan a mano en
  `web/data/avisos.json`), las fuentes (`ingesta/fuentes.mjs`) ni los horarios
  de las redes (`redes/horarios.mjs`).
- **Las ilustraciones con IA** de las notas sin foto (reglas 182 y 185:
  `web/data/fotos-ia.json`, workflow "Ilustrar notas sin foto" y Gemini web
  desde la PC; `08-INFRAESTRUCTURA`) **no se manejan desde el panel**.

### ¿Y el panel 100 % online?

Es éste. De las opciones que se habían pensado (Cloudflare Functions con
Access, una página que escriba por la API de GitHub, un servidor gratis o uno
pago) se eligió la segunda, sin servidor: el celular escribe directo en el
repositorio con la llave de cada persona, y lo sensible viaja cifrado.

---

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `web/public/panel/app.js` | El panel del celular: pantallas, pestañas, decisiones, las preguntas antes de confirmar | El navegador del celular | Por la API de GitHub: `web/data/` | `celular-decisiones.json`, `correcciones.json`, `retiradas.json` (sólo saca), `celular-llaves.json` (vía `github.js`) |
| `web/public/panel/textos.js` | Lo que explica el panel: por qué espera cada nota (`explicarMotivo`, `motivoCorto`), lo que anotó la IA (`explicarFicha`), las pestañas (`PESTANAS`), las preguntas (`PREGUNTAS`, `preguntaRedes`), el estado de cada pieza y del próximo posteo, la hora de Balcarce | `app.js` | — | — |
| `web/public/panel/github.js` | Cómo habla con GitHub: leer, guardar con reintento, disparar un workflow, encontrar su corrida | `app.js` | La llave | — |
| `web/public/panel/nube.js` | La nube de Cloudflare desde el panel (24/10, regla 317): el cliente de `/panel/estado`, `/panel/pausa` y `/panel/vuelta`, el cartel de la pausa general, el bloque de Más y la frase de cómo viene el motor | `app.js`, `hoy.js` | La llave de GitHub (la misma, hacia el Worker del reloj) | — (la pausa vive en R2: `pausa/estado.json`) |
| `web/public/panel/cifrado.js` | Crea las llaves del celular y abre los sobres | `app.js` | La llave privada del navegador | — |
| `web/public/panel/sw.js`, `manifest.webmanifest` | Lo que lo vuelve una app instalable | Chrome | — | — |
| `web/public/panel/prueba.js`, `prueba-sobre.js` | El modo de prueba (`?demo`), con los mismos archivos que arma la web | `app.js` | — | — |
| `web/public/panel/escribir.js`, `hoy.js`, `borradores.js`, `fotos.js`, `contactos.js`, `pistas.js`, `revision.js`, `fechas.js`, `numeros.js`, `redes-estado.js`, `recorrido.js` | Lo que arma cada pantalla: Escribir, Hoy, Borradores, Fotos, Contactos, Pistas, Revisión, Fechas, Números, el estado red por red de la pestaña Redes y el recorrido de una nota | `app.js` | Lo que ya leyó `app.js` | — (lo guarda `app.js` por `github.js`) |
| `panel/celular-datos.mjs` | Qué decide el celular (`problemaDeDecision`, `leerDecisionesCelular`), qué necesita (`paraDecidir`, `notasParaEscribir`) y la papelera (`papeleraAlDia`, `paraLaPapelera`) | `generar-datos.mjs`, `celular.mjs` | — | — (funciones puras) |
| `panel/cifrado.mjs` | Cierra los sobres para cada celular (`cerrar`, `cerrarSiCambio`, `cerrarCadaUno`, `leerLlaves`) | `generar-datos.mjs`, `celular.mjs` | `celular-llaves.json` | — |
| `redes/previa.mjs` | Lo que sale hoy en las redes, para la pestaña Redes (`previaDelDia`) | `generar-datos.mjs` | La portada, el libro, el archivo | — (lo escribe `generar-datos.mjs` en `celular-estado.json`) |
| `redes/repasos.mjs` | Qué notas cuenta cada repaso (`repasosDelDia`): la misma regla para el plan de los videos y para la previa | `reels/plan.mjs`, `redes/previa.mjs` | — | — |
| `panel/celular.mjs` | El programa de "Panel del celular", con tres acciones: `escribir` (busca la nota, la escribe, cierra el borrador), `pista` (investiga una pista) y `nota-pista` (escribe la nota de una pista con `panel/nota-de-pista.mjs`). La cuarta acción del workflow, `foto`, la hace `web/scripts/foto-manual.mjs` | `.github/workflows/panel.yml` | `.cache/celular-notas.json`, `web/data/` | `web/data/celular-borradores.json`, `web/data/pistas.json` |
| `panel/reescribir-una.mjs` | Escribe una nota con IA con el criterio y el verificador de siempre | `celular.mjs` | Las fuentes, `archivo.json` | — |
| `redes/horarios.mjs` | Horarios de las historias fijas (`HISTORIAS_FIJAS`, `horariosDe`) y `toca` | `reels/plan.mjs`, `redes/piezas.mjs`, `redes/cronograma-semana.mjs` | — | — |

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Crear, renovar o revocar la llave del celular | github.com (con la cuenta con la que se creó; las nuevas, con acceso a `radarbalcarce/radar-balcarce`) → Settings → Developer settings → Fine-grained tokens (`docs/11-OPERACION.md`) |
| Qué ve el celular en "Esperan" | `paraDecidir` (`panel/celular-datos.mjs`) |
| Qué acepta la web de una decisión del celular | `problemaDeDecision` y `leerDecisionesCelular` (`panel/celular-datos.mjs`) |
| Cómo escribe la IA a pedido | `panel/reescribir-una.mjs` (y el criterio, `CRITERIO-EDITORIAL.md`) |
| Cuántos borradores se guardan | `BORRADORES` (`panel/celular.mjs`) |
| Cuántos días se puede volver a publicar una nota retirada | `DIAS_EN_LA_PAPELERA` (`panel/celular-datos.mjs`) |
| Cuántos celulares pueden registrarse | `LLAVES_MAXIMAS` (`panel/cifrado.mjs`) |
| Las pantallas del celular | `web/public/panel/app.js` e `index.html` |
| Lo que dice el celular (explicaciones, preguntas, motivos) | `web/public/panel/textos.js` |
| Lo que muestra la pestaña Redes | `previaDelDia` (`redes/previa.mjs`) y `NOMBRES_DE_PIEZAS` |
| Los horarios de las historias fijas | `HISTORIAS_FIJAS` (`redes/horarios.mjs`) |
| Los espacios publicitarios | `web/data/avisos.json` (se edita a mano) y `web/components/avisos.js` |

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| La llave del celular venció o la borraron | El celular dice "La llave no anda (venció o la borraron en GitHub)" | Crear otra y cargarla (`docs/11-OPERACION.md`) |
| A la llave le falta un permiso | "Esa llave no puede escribir…" o "GitHub no deja hacer esto con esta llave" | Crear otra con Contents y Actions en "Read and write" |
| "Esperan" muestra la lista corta, sin detalle | "El detalle de cada nota todavía no llegó cifrado para este celular" | Esperar la próxima actualización de la web (el celular recién se registró) |
| La pestaña Redes dice que las redes están apagadas | "Las redes están apagadas (la variable REDES_ACTIVAS…)" | Es lo esperable mientras `REDES_ACTIVAS` no diga "Si" (`docs/07-REDES.md`) |
| Una nota volvió a publicarse y no aparece | Sigue en "Retiradas" con "↺ vuelve en la próxima actualización" | Esperar la próxima actualización. Si estaba en `retiradas.json` y no se pudo sacar de ahí, sigue retirada: volver a tocar "Volver a publicar" |
| "Escribir con IA" no vuelve | "GitHub tardó demasiado" o "La corrida de GitHub falló" | Mirar "Panel del celular" en GitHub → Actions; probar de nuevo. Si la nota ya no está en la caché ni publicada: "No encontré la nota" |
| La IA no pudo escribirla | El borrador dice por qué (sin fuentes que bajar, la IA no contestó, da rojo) o trae la lista de lo que no cuadra | Revisar y editar, pedir otra versión o escribirla a mano |
| Se decidió en el celular y la web no cambió | — | Esperar la próxima vuelta o tocar "Actualizar la web ahora" (unos 8 minutos) |

Lo vigilan las pruebas `celular.test.mjs`, `celular-app.test.mjs`,
`previa-redes.test.mjs`, `horarios.test.mjs` y parte de `editor.test.mjs` y `limpieza-29-09.test.mjs`
(`docs/10-REGLAS-Y-PRUEBAS.md`).

## La pestaña Fechas (30/09)

Arma con anticipación "Un día como hoy" y los feriados: las 20 mejores candidatas de cada día para elegir una principal, y el enfoque de cada feriado para aprobarlo o pedir cambios. Lo elegido queda en `web/data/efemerides-elegidas.json`. Cómo se generan las candidatas y cómo se afina el criterio: `docs/13-EFEMERIDES.md`.

## Publicar, borradores y reintentos (1/10/2026)

- **"Publicar" en Esperan y en Sin cuerpo.** Un solo toque: la IA escribe la nota, el verificador la
  controla contra las fuentes y, si no marca nada, sale en la próxima actualización. Si marca algo,
  muestra el texto para decidir. "Escribirla con IA para revisarla" queda para quien quiere leerla antes.
- **El borrador no se pierde.** Si se vuelve atrás, la nota muestra "Hay un borrador que escribió la IA…";
  si la app se cerró, "Buscar su último borrador" lo trae de GitHub (cifrado, sólo para ese celular).
- **Sin cuerpo explica por qué.** Cada nota dice cuántos medios la cuentan, la lista pone arriba las más
  contadas y, cuando la IA agotó los tres intentos, dice por qué rechazó el verificador (copia de la
  fuente, relleno, un número o un nombre que no coincide). El motivo viaja en `esperando-cuerpo.json`.
- **Redes, red por red.** La pestaña Redes parte cada pieza de hoy en reel, historia, Instagram y
  Facebook (`web/public/panel/redes-estado.js`). Lo que falló muestra el motivo en castellano y un botón
  **Reintentar** (workflow `reintentar.yml`: sube de nuevo el video ya armado, **sin gastar voz**; Redes lo guarda
  tres días como artefacto). La pestaña muestra ⚠ si hay fallos hoy.


## La pestaña Revisión y la auditoría con IA (1/10/2026)

Cada hora, el workflow "Auditoría IA" (`.github/workflows/auditoria-ia.yml`, `redes/auditar-notas.mjs`, `ingesta/auditoria-ia.mjs`) lee con Groq (`openai/gpt-oss-20b`, su propio cupo: 1.000 pedidos por día y 8.000 tokens por minuto) las notas **automáticas** de la portada de las últimas 12 horas que todavía no leyó (hasta 12 por corrida, de a 3 por pedido, con 25 segundos entre uno y otro por el tope de tokens). Busca ortografía y puntuación, texto roto (escapes, frases cortadas), sección equivocada, tema sensible (un menor o una víctima), afirmaciones sin sostén y títulos que no corresponden.

**Al principio (etapa 1) sólo avisaba; desde el 2/10 corrige sola sólo la ortografía chica y segura** (regla 98, `cambioMecanico`, en `web/data/correcciones-auditoria.json`; ver "El panel reordenado"). Los hallazgos van **cifrados** para el celular a `web/data/auditoria-ia.json` (un sobre por nota; el repositorio es público) y se ven en la pestaña **Revisión** del panel, lo grave primero; lo grave (sensible o una acusación sin sostén) llega además por mail (WhatsApp, de respaldo). A la vista sólo queda qué nota se leyó (con la huella de su texto) y cuándo. Lo que escribió una persona no se lee. En una semana se mide cuántos hallazgos eran reales; recién entonces se decide si algo de lo mecánico (la ortografía) se corrige solo. A mano: Actions → Auditoría IA → Run workflow (con "simular" no guarda ni avisa). Prueba: `auditoria-ia.test.mjs`.

**Desde el 22/10/2026, también lo que deja la revisión del archivo** (regla 212, `docs/flujos/REVISION-DEL-ARCHIVO.md`): las notas viejas con un título o una sección dudosos, algo para confirmar, o lo que hoy no saldría pero circula en las redes. Llegan cifradas igual (`sobres` de `web/data/revision-archivo.json`, que la pestaña lee junto con los de la Auditoría IA) y se ven marcadas «nota vieja (revisión del archivo)».

## La pestaña Pistas (1/10/2026)

Se pega un dato o parte de una noticia que se vio en una red (un tuit, un mensaje) y la nube investiga si ya lo cubrieron los medios (`ingesta/pistas.mjs`, `web/public/panel/pistas.js`). Etapa 1: **el informe**, no una nota. El celular dispara "Panel del celular" con `accion=pista`; la nube (1) saca con Gemini la afirmación central y hasta tres búsquedas (sin la IA, los nombres propios y las frases entre comillas), (2) busca cada una en **Google Noticias** (sólo para contar qué medios la publicaron y cuándo: no es una fuente de texto), dejando los títulos que hablan de lo buscado, (3) mira qué tenemos nosotros en la portada, el archivo y la ingesta, y (4) compara los títulos: qué confirman y qué parece exagerado. El informe vuelve cifrado, por el mismo camino que los borradores. Lo delicado (la lista del semáforo rojo: menores, víctimas) **no se investiga**: el texto de la pista queda a la vista en GitHub. **Una nota que nazca de una pista entra con relevancia alta** (`PISTA.relevancia`, 95). La etapa 2 se hizo el 3/10, de otra manera: "Hacer la nota" escribe el borrador con las fuentes y se publica como nota propia (ver "Hacer la nota y el seguimiento de cada pista", al final). Prueba: `pistas.test.mjs`.

## El panel reordenado (2/10/2026)

Hernán: "esta un poco feo, pensando en que yo tengo que ver las notas, volver, salir, ver si se escriben, si se aceptan o se rechazan;
que sea consistente para el uso diario". Qué cambió (`web/public/panel/app.js`, `fotos.js`):

- **Cinco pestañas.** La barra tenía nueve y se partía en dos filas (la grilla era de siete). Quedan las de todos los días: **Esperan**,
  **Publicadas**, **Fotos**, **Redes** y **Más**. Pistas, Revisión, Fechas y Números son tarjetas en Más (`MENU_MAS`), cada una con un
  "← Más" para volver; Más muestra ⚠ si la Revisión tiene algo grave.
- **Esperan es UNA sola lista** (Hernán: "tienen que ser solo uno… muchas veces no entiendo por qué no salen"): lo que necesita tu OK y
  lo que sale solo pero espera su cuerpo, juntos y lo más nuevo primero. Cada nota dice con todas las letras **por qué no salió**
  ("Necesita tu OK · No sale sola: Acusa a alguien" o "Falta el cuerpo · la IA todavía no logró escribir uno que pase el verificador, lo
  intentó 1 de 3 veces"), **qué falta** y **si va a tener foto** (`fotoDeLaNota`: "Va con foto", "se busca al publicarla" o "Sin foto" con el
  motivo, y desde la nota un botón "Buscarle una foto").
- **Publicadas muestra sólo las últimas 24 horas**, lo más nuevo primero (`HORAS_EN_PUBLICADAS`). "Ver también las anteriores" suma el
  resto de la portada (36 horas); "Cargar el archivo" trae hasta 180 días; el buscador mira todo lo cargado.
- **La IA escribe en segundo plano.** Pedirle una nota ya no traba la pantalla con una ruedita: vuelve a la lista y la nota queda marcada
  "la IA la está escribiendo…" y después "borrador listo"; al terminar sale un aviso con el botón "Ver el borrador". Con "Publicar", si el
  verificador no marcó nada, se publica sola (`E.trabajos`, `trabajoDeIA`, `guardarTexto` con `silencioso`).
- **Después de decidir se vuelve al mismo lugar de la lista** (`E.scrollLista` / `E.restaurar`), no al principio: la nota aprobada o
  descartada baja y la siguiente ocupa su lugar.
- **Fotos** (pestaña nueva): las notas de la portada sin foto, el motivo (`motivoDeFoto`, el mismo criterio que `npm run auditar-fotos`,
  una prueba los compara) y si es una regla firme (menores, marca de agua, Policiales sin fuente oficial) o se puede arreglar. Cada una
  trae enlaces de búsqueda armados con el título (Google Imágenes con permiso de uso, Wikimedia Commons) y las páginas de sus fuentes.
  Para **sumar una foto** se pega la dirección de la imagen y su crédito y se tilda que no tiene marca de otro medio ni menores: el
  workflow "Panel del celular" (`accion=foto`) corre `web/scripts/foto-manual.mjs`, que la baja (sólo https, JPG/PNG/WebP, hasta
  12 MB), la achica como las del banco y la anota en `web/data/fotos-manuales.json`. `generar-datos.mjs` suma ese archivo al banco
  (manda sobre el banco, y sólo si la foto está en disco), así "Actualizar la web" nunca pisa lo que sumó una persona. Sale en la web en la
  próxima actualización. Pruebas: `pruebas/fotos-panel.test.mjs`.
- **Fechas → Mes armado** (2/10, Hernán: "¿dónde vemos todo el mes armado en el panel, para rearmar, sumar o descartar?"): lista, por semana, los
  días ya armados de "Un día como hoy" (`web/data/efemerides-piezas.json`) tal como van a salir a las 9:00, con su estado (sale como está,
  sin revisar, aprobado, sacado, con cambios pedidos), los huecos sin armar, y cada día entero (principal, además, lo que dice la
  locutora). Se **aprueba**, se **saca** o se **piden cambios** (con motivo); "Elegir otras candidatas" abre las candidatas del día y frena el
  día hasta rearmarlo. Las decisiones valen sólo sobre lo aprobado (huella): regla 97. Pruebas: `efemerides-aprobacion.test.mjs`.
- **Las listas se limpian solas** (Hernán: "así no se acumulan cosas sin sentido"): **Publicadas** muestra las últimas 24 horas; **Retiradas**,
  las de las últimas 24 horas (después ya no se ven ni se pueden volver a publicar desde el panel); **Esperan**, lo de las últimas 48 horas
  (`HORAS_EN_ESPERAN`, `HORAS_RETIRADAS`, `HORAS_EN_PUBLICADAS`, en `app.js`).
- **Revisión dice qué encontró y qué corrigió**: arriba, "Qué hizo la IA" (encontró N cosas: corrigió X solas y dejó Y para que mires); después,
  "Corregido solo" (cada falta de ortografía con su «antes → después», que ya está en la web) y "Para que mires" (lo delicado, que la IA nunca
  corrige sola). Regla 98.
- **Rediseño visual** (2/10): cinco pestañas con ícono y un globito con el número, una sola jerarquía de botones (el principal en rojo, el
  que borra en rojo suave, los demás de contorno, con un ícono por lo que hacen), tarjetas con la franja de color de su sección, "¿Qué es
  esto?" como una píldora, y en cada nota una **barra de acciones fija abajo** (Publicar/Descartar, Escribir con IA/Publicar, Editar/Retirar)
  para decidir sin bajar hasta el final. El CSS nuevo va al final de `index.html`, marcado "REDISEÑO DEL 2/10".

## Pistas abiertas (3/10/2026)

Hernán: "que yo te tire datos o links, que quede abierta la investigación y ver si aparece en algún medio, tengamos o no la fuente".
- **Pegar un dato, un tuit o un enlace** (Más → Pistas). La nube (workflow "Panel del celular", `accion=pista`) investiga qué medios la cubrieron
  en Google Noticias (sólo cuenta quién y cuándo), qué tenemos nosotros y, con IA, qué confirman o exageran los títulos. Si trae enlaces de una
  página, suma su título y bajada (`enriquecerConEnlaces`); los de redes (X, Facebook, Instagram) no se pueden leer y el informe lo dice.
- **Queda abierta** en `web/data/pistas.json` (una pista por renglón; `panel/pistas-libro.mjs`): el texto, las búsquedas, el nivel de cobertura, los
  nombres de los medios y el historial son públicos (el texto ya viajaba como dato del workflow); **el informe viaja cifrado** para los celulares.
- **Se vuelve a mirar sola cada tres horas, 14 días** (workflow "Pistas", `panel/revisar-pistas.mjs`). Si la cobertura sube de nivel (de sin
  cobertura a un medio, a cubierta, a muy cubierta) o ya la publicamos nosotros, queda marcada **● Novedad** (en la lista, en Más y en la
  barra de abajo) y avisa por mail (WhatsApp, de respaldo; sólo "la pista X tiene novedades", sin el texto). Los matices con IA se piden sólo cuando sube de nivel.
- En cada pista: **Volver a mirar ahora** (dispara el workflow "Pistas" con su id), **Cerrar: ¿en qué quedó?**, **Reabrir 14 días** y **Hacer la nota**
  (ver abajo).
- Pistas de menores o víctimas no se investigan (la lista del semáforo rojo). Prueba: `pistas-abiertas.test.mjs`.

## Contactos en el celular (3/10/2026)

Hernán: "a todos los contactos que tenemos mandarles, estén o no cerca de la fecha; está bueno armarnos una agenda propia de posibles
contactos". Hasta entonces la base de 43 instituciones (`ingesta/contactos-agenda.json`) y "a quién escribir este mes" sólo vivían en el panel de la
PC (que estaba apagada). Ahora, en **Más → Contactos** (`web/public/panel/contactos.js`):
- **Todas las instituciones y los contactos propios**, con cuándo se les escribió y si respondieron; filtros (todos, sin contactar, toca escribir,
  respondieron, propios) y buscador. Un número compartido (el WhatsApp de Turismo sirve para el Autódromo y las fiestas) cuenta una sola vez.
- **El mensaje ya escrito** (`mensajeAgenda`, `ingesta/agenda.mjs`), editable; "Abrir WhatsApp" o "Abrir el correo" abren la app con el texto puesto y
  **lo manda una persona**: nada sale solo. Después, "Ya le mandé el mensaje" y "Respondió" anotan la fecha (no se le escribe de nuevo antes de 30 días).
- **"Escribirles a todos los que tocan"**: una lista que va de a uno (abrir, mandar, "ya lo mandé", siguiente), con los de temporada primero. Con
  WhatsApp no se puede mandar en masa sin riesgo de bloqueo: por eso es de a uno, con un toque tuyo.
- **Contactos propios** (el encargado de turismo de tal lugar, alguien que organiza algo): se suman desde el celular. **Un teléfono de una persona
  nunca va en claro** en el repositorio público: cada contacto propio y cada anotación es un sobre cifrado para los celulares registrados, uno por
  renglón (`web/data/contactos-celular.json`; el celular cierra el sobre con `cerrar` de `cifrado.js`, que usa el mismo formato que el de la nube). Un
  celular que se registra después no ve lo guardado antes (como en el resto del panel). Prueba: `contactos-panel.test.mjs`.

### Hacer la nota y el seguimiento de cada pista (3/10/2026)

- **Hacer la nota** (`panel/nota-de-pista.mjs`, acción `nota-pista` de "Panel del celular"): la nube busca en internet con **Tavily**
  (`ingesta/busqueda.mjs`, clave `TAVILY_API_KEY` en GitHub; trae el texto de cada página, sin las redes ni lo que trae poco texto, y una sola
  página por sitio) las notas de los medios que hablan de lo mismo, y escribe un borrador con el **mismo camino que "Escribir con IA"**: el criterio
  editorial, los arreglos que no inventan y el verificador contra el texto de esas fuentes (`panel/reescribir-una.mjs`). Una pista que toca la lista
  roja (menores, víctimas) no se escribe. El borrador llega **cifrado** al celular con la lista de fuentes para abrirlas; se revisa, se edita y
  **"Publicar como nota propia"** la guarda en `web/data/notas-de-pistas.json` (con motivo, cuándo y quién) y **cierra la pista** como "Salió como nota
  nuestra" con el enlace. Hace falta un cuerpo de 70 palabras o más. Desde el 16/10 se guarda además con `aprobadaParaRedes` y `paraElRepaso`: sale
  en el próximo repaso de las redes sin pedirlo aparte (arriba, "Las redes: aprobar no es publicar en redes").
- **La nota** (`web/lib/notas-de-pistas.js`, que lee `generar-datos.mjs` como las demás notas propias, `propia: 'pista'`): relevancia 95, con sus fuentes
  en "Fuentes", y la firma "Nota de Radar Balcarce, escrita con IA a partir de lo que publicaron X e Y y revisada por la redacción" (CRITERIO-EDITORIAL § 10:
  lo escribió la IA y lo revisó una persona). Una entrada sin motivo, cuándo y quién, sin fuentes con enlace, con cuerpo corto o con una sección que no
  existe se saltea sin romper a las otras. **Retirar la nota** desde la pista la marca `retirada` y deja de armarse.
- **Seguimiento: en qué quedó cada pista.** Cada pista lleva su **seguimiento** (cuándo se empezó, cada novedad de cobertura, que se escribió un borrador,
  la nota, cómo se cerró) y su **resultado**: *se confirmó*, *se desmintió o era falsa*, *sin novedades*, *salió como nota nuestra* o *la descartamos*, con un
  comentario opcional. Se ve en el detalle de la pista y en la lista ("En qué quedó: …"). Reabrir la pista conserva todo. Pruebas: `nota-de-pista.test.mjs`.

## Escribir una nota (30/10/2026)

*Escrito y probado sin red el 30/10; falta probarlo con una llave de verdad en un celular (la primera nota real).* Hernán pidió poder publicar notas
propias directamente desde el panel: pegar título, bajada y cuerpo, sumar la foto de portada y las que van entre los párrafos, y firmar con su nombre.
Es la pestaña **Escribir**: está en **Más → Escribir una nota** y, además, es el botón grande de arriba de **Hoy**.

**A diferencia de "Hacer la nota" de una pista, acá no interviene la IA ni el verificador**: lo que se escribe es lo que sale, con la firma de quien
escribe. Por eso el formulario recuerda arriba: *No publiques nombres ni fotos de menores ni de víctimas de delitos sexuales o violencia de género*
(la responsabilidad es de quien escribe; no se bloquea nada, pero pregunta antes de publicar).

### Paso a paso

1. **Abrí Más → Escribir una nota** (o el botón de Hoy).
2. **Título, bajada y cuerpo.** Pegá o escribí. Los párrafos se separan con **una línea en blanco**. El cuerpo tiene que tener **30 palabras o más** (el
   mínimo contra un accidente; las notas automáticas piden 70). El título, mejor hasta 90 caracteres (en Google y WhatsApp se corta; el panel avisa).
3. **Sección** (las catorce; por defecto Balcarce) y **Firma**: por defecto *Hernán Accomo*; el panel se acuerda de la última que usaste en ese celular. En la
   web sale arriba como “Por Hernán Accomo” y al pie como “Por Hernán Accomo, de la redacción de Radar Balcarce”; en los datos para Google, el autor es esa persona.
4. **Foto de portada** (opcional): la imagen grande de la nota y de la portada. Con **Epígrafe** (qué se ve) y **Crédito** (quién la sacó) opcionales. Sin
   portada, la nota lleva la placa de la sección, como cualquier nota sin foto. Una portada sin crédito sale con “Foto: Radar Balcarce”.
5. **Fotos dentro de la nota** (opcional, hasta 10), cada una con su epígrafe y crédito. Para ponerla **entre dos párrafos**: poné el cursor en el cuerpo donde
   la querés y tocá **“Insertar foto N aquí”** (aparece debajo del cuerpo y en cada foto): escribe `[foto 1]` en una línea sola, con una línea en blanco
   antes y después. También se puede escribir a mano (`[foto 2]`, mayúsculas o espacios de más no importan). Una foto **sin su marca va al final** de la nota. Si
   se saca una foto, su marca desaparece y las que venían después se corren un lugar.
6. **Vista previa**: muestra título, bajada, firma y el cuerpo con las fotos en su lugar, tal como saldría, y lista lo que falta. **Publicar** sube las fotos y
   guarda la nota; sale en la web **en la próxima vuelta del motor (cada media hora)**. Al terminar ofrece **“Actualizar la web ahora”** si no querés esperar.

### En qué tamaño van las fotos

| Foto | Tamaño que conviene | Qué hace el panel solo |
|---|---|---|
| **Portada** | **Horizontal, 1600 × 900 px (16:9)**. Desde 1200 px de ancho se ve bien; menos de eso se ve chica y no la toma Google Discover | Si es más grande la achica a 1600 px de ancho (nunca agranda); respeta cómo sacaste la foto (vertical u horizontal); la guarda como JPEG de ~400 KB como máximo. **No la recorta**: la página la muestra en 16:9, así que una foto más alta queda recortada (la franja del medio, un poco más arriba que abajo); el recuadro punteado del panel muestra cómo va a quedar y avisa si se recorta mucho |
| **Dentro de la nota** | Hasta **1200 px de ancho**, la proporción que tenga (horizontal queda mejor); se muestra **entera, sin recortar** | La achica a 1200 px de lado más largo y la guarda como JPEG de ~400 KB como máximo |

Las fotos de un celular (4000 × 3000 y varios MB) se achican solas: no hace falta tocarlas antes. Una foto con una marca de agua o el nombre de otro medio no va
(regla de siempre); la foto de una persona menor o de una víctima, tampoco.

### Editar, retirar y las fotos

- **Mis notas publicadas** (abajo, la más nueva primero): **Abrir en la web**, **Editar** y **Retirar**.
- **Editar** carga el formulario con lo guardado; al guardar de nuevo se actualiza **la misma nota**: la dirección y la fecha **no cambian** (queda “Actualizado: …”
  y la fecha de modificación en los datos para Google). Las fotos ya subidas se pueden dejar, reemplazar (sacar y sumar otra) o sacar.
- **Retirar** pide el motivo y sólo marca la nota (`retirada`, con quién y cuándo): sale de la web en la próxima vuelta y su página deja de existir. **No se borra nada**
  (ni el texto ni las fotos): una retirada se puede **Volver a publicar**.
- Si se corta la conexión o falla GitHub, **no se pierde lo escrito**: el texto queda como borrador en el celular (se retoma al volver a abrir la pestaña; las fotos
  hay que volver a elegirlas) y, si el error es después de subir las fotos, no se vuelven a subir.
- **No sale sola a las redes** (decisión abierta en `PENDIENTES.md`, punto 16 de la sección 5).
- Estas notas también aparecen en **Publicadas** (están en la portada), pero **editarlas o retirarlas se hace siempre desde «Mis notas publicadas»**: los botones de Publicadas escriben en `correcciones.json` y `celular-decisiones.json`, y la nota se vuelve a armar cada vuelta desde `notas-de-redaccion.json`.

### Dónde queda cada cosa

| Qué | Dónde |
|---|---|
| La nota | `web/data/notas-de-redaccion.json` (`{ "notas": { "<clave>": { titulo, copete, cuerpo, seccion, firma, portada, fotos, slug, cuando, por, motivo, editada?, editadaPor?, retirada? } } }`, una nota por renglón; sin `motivo`, `cuando` y `por` la web no la acepta). La clave (`r…`) la inventa el panel una vez y no cambia nunca; el id de la nota es `nr…` |
| El cuerpo | Se guarda **como se escribió, con las marcas** `[foto N]`, para poder editarlo. La web arma el cuerpo sin marcas y las fotos con su lugar (`web/lib/notas-de-redaccion.js`: `partirCuerpo`, `notasDeRedaccion`) |
| Las fotos | `web/public/fotos-notas/redaccion-<clave>-p-<token>.jpg` (portada) y `redaccion-<clave>-<n>-<token>.jpg` (de adentro): **todas en la misma carpeta, sin subcarpetas** (el sitio, el archivo permanente y la poda leen esa carpeta plana). El panel las sube **antes** de guardar la nota y la poda de fotos (`podarFotos`) nunca borra un archivo `redaccion-…` |
| Cómo se dibuja | `web/components/cuerpo-con-fotos.js` (cada foto en una `<figure>` con su pie, con ancho y alto escritos y `loading="lazy"`), `web/lib/cuerpo-con-fotos.js` (el orden), `web/app/nota/[id]/page.js`, `quienEscribio` y `autorDeNota` (`web/components/metadatos.js`) |
| Qué la lee | `web/scripts/generar-datos.mjs` (con las demás notas propias, relevancia 95, `como: 'publicada'`, sin fuentes: el pie es la línea de la firma sola) |
| Qué NO toca | El motor no la escribe: no está en el `git add` de `actualizar.yml` ni en `ARCHIVOS_DEL_MOTOR` (la escribe sólo el celular, como `celular-decisiones.json`); cambiarla o sumar una foto obliga a recompilar el sitio (`hayQueRecompilar`). Los Workers de tareas no la leen |

Pruebas: `notas-de-redaccion.test.mjs` (la web) y `escribir-panel.test.mjs` (el panel).

## La pausa general y «Actualizar la web ahora» (24/10/2026, regla 317)

*Escrito y probado el 24/10; no subido hasta que se haga el paso a paso de `docs/11-OPERACION.md`, tarea 5 bis.* Hasta ahora el panel sólo hablaba con GitHub. Con el motor y las tareas en
Cloudflare, dos cosas ya no se podían hacer desde ahí, y el panel ahora le habla además al **Worker del reloj** (`radar-balcarce-reloj.radarbalcarce.workers.dev`, `infra/reloj-cloudflare/panel-api.mjs`):

| Qué | Dónde se toca en el panel | Qué hace en la nube |
|---|---|---|
| **Pausa general** (C8) | **Más → Pausa general → ⏸ frenar todo** (pide un motivo y confirma) y, con la pausa prendida, el cartel rojo de **Hoy** y de **Más** con **▶ Reanudar todo** | `POST /panel/pausa`: escribe `pausa/estado.json` en R2 (`radar-motor`). El reloj, el Worker de tareas y la vuelta del motor lo leen y no publican (qué frena y qué no, en la regla 317) |
| **Actualizar la web ahora** (C6) | Los botones de siempre (Más, y el que ofrece el aviso de cada decisión) | `POST /panel/vuelta`: pide UNA vuelta del motor con el deploy hook de Workers Builds. En pausa dice que no; no más de una cada 3 minutos |
| **Cómo viene el motor** | **Hoy** («⚙ Última vuelta del motor: bien, a las 14:05 (hace 12 min); duró 5 min», en rojo si falló, «hay una vuelta andando» si la hay) y la fila «Actualizar la web» de **Números** | `GET /panel/estado`: lee `motor/estado.json` y el candado de la vuelta de R2 (el vigilante lo mira por su lado: `GET /estado` del Worker del motor) |

**Cómo se autentica.** No hay nada nuevo que pegar ni guardar: el panel manda la **misma llave de GitHub** (`Authorization: Bearer`), el Worker le pregunta a GitHub si esa llave puede escribir en el
repositorio (`GET /repos/radarbalcarce/radar-balcarce`, `permissions.push`; es lo mismo que mira el panel al entrar) y recién entonces obedece. Quien no es colaborador con permiso de escritura no puede
pausar ni pedir vueltas. La contraseña de los Workers (`VIGILANTE_TOKEN`, encabezado `x-token`) sirve para el procedimiento a mano y nunca viaja en el navegador. Desde un navegador sólo pueden llamar
`radarbalcarce.com`, `www.radarbalcarce.com` y `radar-balcarce.pages.dev` (CORS), y la CSP del panel (`web/public/_headers`) deja hablar con `api.github.com` y con esa dirección exacta del reloj, nada más.
La pausa no es nada sensible (quién, desde cuándo y un motivo corto; el panel pide que no se pongan nombres de personas), así que no se cifra; el depósito es privado y el endpoint pide la llave.

**Qué puede fallar.**

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| El reloj nuevo no se subió | Más dice «No se pudo ver si la pausa está prendida (No se pudo hablar con la nube…)» y «Actualizar la web ahora» da el mismo error | Subir los Workers (`docs/11-OPERACION.md`, 5 bis). El botón de pausar igual se muestra, para poder intentarlo |
| La llave no tiene permiso de escritura | «La nube no te deja hacer esto: Esa llave no puede escribir en el repositorio» | La misma llave que ya hace falta para aprobar notas (Contents y Actions en lectura y escritura) |
| GitHub no contesta cuando la nube quiere comprobar la llave | «GitHub no contestó: no se pudo comprobar la llave» | Probar en un minuto; o el procedimiento a mano de la tarea 5 bis |
| «Ya se pidió una vuelta hace N min» | El doble toque | Esperar: la vuelta tarda unos 8 minutos |
| «En pausa desde… Reanudá antes de pedir una vuelta» | Hay pausa general | Reanudar (un toque) |
| El depósito de R2 no contesta al pausar | «No se pudo leer el estado de la pausa… No se cambió nada» | Probar de nuevo; si sigue, el procedimiento a mano o `REDES_ACTIVAS_NUBE` en No |

Cómo se prueba: `pruebas/pausa-general.test.mjs` (la nube) y `pruebas/panel-pausa.test.mjs` (el panel). El modo de prueba (`?demo`) trae una nube de mentira (`nubeDePrueba`, en `prueba.js`) para ver los dos carteles sin tocar nada.
