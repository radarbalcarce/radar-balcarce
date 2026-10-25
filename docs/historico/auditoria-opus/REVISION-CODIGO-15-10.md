# Revisión de código del 15/10/2026

*Revisión crítica de los commits que entraron a `main` el 15/10/2026 (los de código, no los "Datos de la portada" del robot).
No se tocó código: esto es sólo el informe. Hecha por Claude (Opus) el 15/10 a la tarde.*

---

## Para Hernán y Andrés (sin tecnicismos)

**Cómo quedó el día en general:** bien. Las 2.221 pruebas pasan, no hay ninguna clave ni token escrito en el repositorio, y
en lo que se sumó hoy no hay datos nuevos que identifiquen a un menor o a una víctima. Los avisos por mail, el respaldo
en partes, las estadísticas que ya no guardan ceros falsos y las UTM de las redes están bien hechos.

**Pero hay cuatro cosas importantes para arreglar pronto:**

1. **El verificador quedó demasiado blando con las fechas.** Para no rechazar "el viernes 9 de octubre" cuando la IA usaba la
   fecha de hoy, ahora acepta cualquier número que coincida con el día o el mes de hoy (o de la publicación de una fuente)
   si la oración nombra un día o un mes. Lo probé: "el jueves comenzarán **14 cuadras** de asfalto" pasa aunque la fuente no
   diga ni "jueves" ni "14". Antes lo frenaba. Es justo el tipo de error que el verificador existe para cazar.
2. **Una de las excepciones nuevas del semáforo tapa de más.** La que deja pasar "el sorteo del fixture" borra hasta seis
   palabras entre "sorteo" y "fixture/bombo/cruces/llaves". Si en esas seis palabras hay "víctima" o "menor", dejan de frenar.
   Probado: "En el sorteo de la Copa una víctima del bolillero" sale en verde (sin "sorteo", espera a una persona). Es un caso
   raro, pero toca la regla de menores y víctimas, que no se negocia.
3. **Las edades de los chicos tienen dos huecos.** La mejora de hoy ("chicos de 14, 15 y 17 años") no funciona de verdad en
   la ingesta porque antes se borran las comas; y desde antes, si la nota nombra primero a un adulto con su edad ("una joven
   de 22 años y su hija de 3 años"), no se mira la segunda edad. Las dos salen en verde.
4. **Los avisos siguen muertos hasta que alguien termine de instalar el vigilante de Cloudflare** (cargar `VIGILANTE_TOKEN`,
   correr el workflow, probar el mail). Sin eso, todo cae otra vez al WhatsApp que no anda. Y como desde hoy las pruebas ya
   no frenan cada vuelta de la web, un error en el código llega publicado en media hora: el aviso es lo único que queda.

**Lo demás** son cosas de gravedad media o baja: notas viejas que pueden "volver a estrenarse" al juntar repetidas, el texto
de las dos notas de Policiales retiradas hoy que sigue en el historial público de GitHub, el tope de notas cerca del límite
de Cloudflare sin freno automático, dos errores de tipeo que quedaron "congelados" en las correcciones de hoy, y detalles de
los workflows. Abajo está todo, con dónde y cómo arreglarlo.

**Para la PC:** la copia local de `main` está desfasada (dice "6 adelante, 10 atrás", pero los 6 ya están subidos con otro
número) y tiene dos archivos modificados (`redes/estadisticas.mjs` y `redes/estadisticas-detalle.mjs`) que son idénticos a lo
que ya subió otra ventana (commit `4052d3d5`). Antes de seguir trabajando acá, conviene descartar esos dos cambios y traer lo
de GitHub. El commit `4052d3d5` (motor nuevo y `reparar-estadisticas`) entró mientras hacía esta revisión y **no está revisado**.

---

## Tabla de hallazgos

| # | Gravedad | Dónde | Qué |
|---|---|---|---|
| A1 | **Alta** | `ingesta/verificar.mjs:409, 419, 422, 476, 500`; `reels/reescritura.mjs:270` | Las fechas de publicación habilitan números y días de la semana inventados |
| A2 | **Alta** | `ingesta/exenciones.mjs:45, 52` (usado en `ingesta/ingesta.mjs:768`) | La exención del sorteo se traga hasta 6 palabras, incluidas las de víctimas y menores |
| A3 | **Alta** | `ingesta/menores.mjs:12, 19`; `ingesta/ingesta.mjs:778` | Edades: la lista con comas no funciona después de `normalizar`; y sólo se mira la primera persona con edad |
| A4 | **Alta (operativa)** | `redes/avisar-por-mail.mjs`, `infra/vigilante-cloudflare/`, `.github/workflows/actualizar.yml:77` | Sin el vigilante instalado no hay avisos, y las pruebas ya no frenan la publicación |
| M1 | Media | `.github/workflows/actualizar.yml:77`, `.github/workflows/pruebas.yml` | Un cambio que rompe el semáforo se publica antes de que fallen las pruebas |
| M2 | Media | `web/lib/repetidas.js:59-65`; `web/scripts/generar-datos.mjs:612, 925` | Al juntar repetidas sin IA, la que queda puede ser la NUEVA: una noticia de hasta 72 h vuelve a la portada como nueva |
| M3 | Media | `web/scripts/generar-datos.mjs:612`; `ingesta/repetidas-publicadas.mjs` | Una nota nueva igual a una RETIRADA no se frena: la pareja se descarta y la noticia retirada vuelve con otra dirección |
| M4 | Media (estructural, no de hoy) | historial de `web/data/archivo.json` | El texto de las notas retiradas hoy (`d1rexu`, `1lxw5wx`) sigue en el historial público de git |
| M5 | Media | `web/lib/archivo.js:202`; `web/scripts/contar-archivos.mjs` | 3.700 notas ≈ 15.900 archivos (80 % del tope de Cloudflare) y el aviso nunca frena |
| M6 | Media | `.github/workflows/probar-restauracion.yml:104, 116` | La prueba de restauración dice "git fsck sin errores" aunque fsck falle |
| B1 | Baja | `web/data/correcciones.json` (`1b3umaz`, `woerbj`) | Dos errores quedaron congelados en las correcciones del 15/10: "campen" y "La Séleccion" |
| B2 | Baja | `ingesta/verificar.mjs:626` (`letrasRotas`) | Rechaza palabras extranjeras comunes en minúscula y caracteres invisibles copiados: gasta intentos |
| B3 | Baja | `ingesta/verificar.mjs:301` | La copia flexible no cuenta ninguna palabra con mayúscula en el medio: un texto en "Title Case" no tiene tope |
| B4 | Baja | `infra/vigilante-cloudflare/worker.mjs:94, 122` | Una nota con fecha futura en el sitemap taparía para siempre el aviso "web-vieja" |
| B5 | Baja | `infra/vigilante-cloudflare/worker.mjs:651` | `/estado` es público y devuelve los errores de envío de mails |
| B6 | Baja | `.github/workflows/vigilante-cloudflare.yml:30-32`; `infra/vigilante-cloudflare/LEEME.md:22` | El nombre del KV no coincide con el LEEME; y el JSON se busca desde el primer `[` |
| B7 | Baja | `.github/workflows/probar-restauracion.yml:41` | `${{ inputs.fecha }}` va directo al script (inyección por quien pueda correr el workflow) |
| B8 | Baja | `redes/uso-ia.mjs`, `reels/reescritura.mjs:380, 386` | El gasto de IA del panel del celular se anota pero no se guarda; sólo se mide la redacción |
| B9 | Baja | `infra/sondeo-fuentes/worker.mjs:19-20` | Se piden feeds haciéndose pasar por un navegador; y el CPU del plan gratis puede no alcanzar |

---

## Detalle técnico

### A1 · Alta · El verificador acepta números y días inventados que coinciden con una fecha

**Dónde.** `reels/reescritura.mjs:270` arma `fechas: [new Date().toISOString(), ...fechas de las fuentes]`.
`ingesta/verificar.mjs`:
- `:419` mete el día de la semana y el mes de cada fecha en `palabrasOrigen`;
- `:422` guarda día, mes y año de cada fecha en `numerosDeFecha`;
- `:476` acepta un número de esa lista si la oración "habla de una fecha" (`hablaDeUnaFecha`, `:409`: cualquier día o mes en
  palabras, o cualquier "d/d" o "d-d");
- `:500` ya no marca un día de la semana que esté en `palabrasOrigen`.

**Cómo se rompe.** Con hoy jueves 15/10 y una fuente del 14/10, los números 14, 15, 10 y 2026 y las palabras "jueves",
"miércoles" y "octubre" quedan "dichos por la fuente" en cualquier oración que nombre un día o un mes. Reproducido:

```
fuente: "El intendente anunció un plan de asfalto ... durante el mes de octubre." (fechas: 15/10 y 14/10)
IA:     "El intendente anunció que el jueves comenzarán 14 cuadras de asfalto en octubre."
con fechas  → sin problemas
sin fechas  → "el cuerpo dice 14 y la fuente no lo dice"; "el cuerpo menciona \"jueves\" y la fuente no"
```

Además, el error más común de la IA con fechas (la fuente del miércoles dice "ayer" y la IA escribe "el miércoles", o escribe
"este jueves" por la fecha de hoy) ahora pasa siempre. `hablaDeUnaFecha` también se dispara con un resultado ("ganó 3-1").

**Arreglo sugerido.**
- Aceptar un número de fecha sólo cuando forma parte de una fecha escrita: pegado a un mes ("9 de octubre"), a un día de la
  semana ("jueves 15") o en "15/10". No por estar en la misma oración.
- Para los días de la semana: aceptar el de una fecha sólo si va con su número ("el viernes 9") y el número coincide con esa
  fecha; no sumar el día de hoy a `palabrasOrigen` en general.
- Prueba con el caso de arriba (las "14 cuadras" y "el jueves") en `pruebas/verificador-copia-fechas-letras.test.mjs`.

### A2 · Alta · La exención del sorteo tapa palabras de víctimas y menores

**Dónde.** `ingesta/exenciones.mjs:45` (`RE_SORTEO_CERCA_DEL_FIXTURE`: `sorteo (\s+\w+){0,6}? fixture|bolillero|bombos?|cruces|llaves`
y al revés) y `:52`, que reemplaza **todo el tramo** por "definicion". Se aplica en `semaforoDelTexto` (`ingesta/ingesta.mjs:768`)
también con `soloMenores` (el cuerpo que escribe la IA).

**Cómo se rompe.** El comentario de la regla 172 promete que "una frase exenta se tapa con una marca neutra: cualquier OTRA
palabra sensible del mismo texto sigue frenando". Con este patrón no: las hasta seis palabras del medio desaparecen.
Reproducido:

```
"En el sorteo de la Copa una victima del bolillero"     → null (verde)
"En la previa de la Copa una victima del bolillero"     → amarillo: "víctima"
"Durante el sorteo atropellaron a una menor y se suspendieron los cruces" → la parte de la menor queda tapada
```

Lo rojo y la edad (`menorPorEdad`) se siguen mirando sobre el texto entero, así que el hueco es sólo para las palabras de
la lista amarilla. "cruces" y "llaves" son palabras comunes (cruces de calles, entrega de llaves de viviendas).

**Arreglo sugerido.** Reemplazar sólo la palabra "sorteo/sortean…" (no el tramo) cuando hay un fixture/bolillero cerca; o
exigir que las palabras del medio no estén en `REGLAS_SEMAFORO.amarillo` ni en `AMARILLO_MENORES`. Sumar a
`pruebas/exenciones.test.mjs` los dos casos de arriba como "tiene que seguir frenando". Lo mismo vale revisarlo, por las
dudas, en `RE_SORTEO_OBJETO` (hoy sólo tapa "sorteo + determinante + objeto", que está bien).

### A3 · Alta · Las edades de los chicos: la lista con comas no anda, y sólo se mira la primera persona

**Dónde.** `ingesta/menores.mjs:12` (`CON_EDAD`) y `:19` (`re.exec(t)`, una sola vez); `ingesta/ingesta.mjs:778` le pasa
`texto`, que ya viene de `normalizar` (saca las comas: `.replace(/[^a-z0-9\s]/g, ' ')`).

**Cómo se rompe.**
1. *De hoy:* el separador entre edades exige `,|y|e|o|a`; sin comas, "14 15 y 17" no encaja. La prueba nueva pasa porque
   llama a `menorPorEdad` con el texto crudo, no a `semaforoDelTexto`. Reproducido:
   `semaforoDelTexto('Tres chicos de 14, 15 y 17 años ganaron el torneo de ajedrez')` → `null`; con "14 y 17" → amarillo.
2. *De antes (pero en el archivo que se tocó hoy, y la regla 172 dice que cerró los huecos de edades):* `exec` devuelve el
   primer "persona + edad"; si es un adulto, la función devuelve `null` sin mirar el resto. Reproducido:
   "Una joven de 22 años y su hija de 3 años viajaban en el auto" → `null`;
   "Un joven de 20 años y su hijo de 2 años quedaron internados" → `null`.

**Arreglo sugerido.** Aceptar también espacio como separador (`(?:\s*(?:,|y|e|o|a)\s*|\s+)`) o llamar a `menorPorEdad` con
`sinTildes(textoCrudo)` en vez del texto normalizado; y recorrer todas las coincidencias (`matchAll` con bandera `g`). Pruebas
con las dos frases de arriba a través de `semaforoDelTexto`.

### A4 · Alta (operativa) · Los avisos dependen de pasos que todavía hace una persona

**Dónde.** `redes/avisar-por-mail.mjs` manda a `POST /avisar` del Worker `radar-balcarce-vigilante`; si no hay
`VIGILANTE_TOKEN` o el Worker no contesta, cae a WhatsApp (muerto desde el 1/10). `infra/vigilante-cloudflare/LEEME.md`
dice que hay que cargar el secreto, correr "Vigilante de Cloudflare" y probar `/probar-mail`.

**Cómo se rompe.** Si esos pasos no se hicieron, `vigilar.mjs`, las auditorías y las pistas siguen sin avisar a nadie, igual
que antes de hoy. Con el cambio M1 (las pruebas ya no frenan la web), el aviso es la única red que queda. El código está
bien: el token va sólo en el encabezado, `sinSecretos` limpia los mensajes, el asunto no permite inyectar encabezados
(`codificarAsunto` saca los saltos de línea), hay tope de 30 por hora y la clave se recuerda recién cuando el mail salió.

**Arreglo sugerido.** Hacer ya los pasos 1 a 5 del LEEME y confirmar que llega el mail de prueba y el resumen de las 21.

### M1 · Media · Las pruebas ya no frenan la publicación

**Dónde.** `.github/workflows/actualizar.yml:77` (se sacó `npm test`) y el nuevo `.github/workflows/pruebas.yml`, que corre al
hacer push con código.

**Cómo se rompe.** "Actualizar la web" usa lo que esté en `main` sin esperar a "Pruebas". Un cambio que rompa el semáforo o el
verificador se publica en la vuelta siguiente; la prueba que falla sólo manda un mail a la cuenta que hizo el push. La razón
del cambio es buena (una prueba de diseño frenó la web 7 horas el 11/10), pero se tiró también lo legal.

**Arreglo sugerido.** Volver a correr en cada vuelta sólo el núcleo legal (semáforo, menores, exenciones, verificador, cuerpo,
sepelios; la lista casi está hecha en `docs/etapa-10-operacion/pruebas-nucleo.txt`), que tarda segundos. O proteger `main`
para que los commits con código necesiten "Pruebas" en verde.

### M2 · Media · Repetidas sin IA: la noticia vieja puede volver como nueva

**Dónde.** `web/scripts/generar-datos.mjs:612` arma `parejasSinIA` ([la que ya estaba, la nueva]) y `:925` las suma a
`confirmadas` de `repetidasConOtraDireccion`. La que queda la elige `laQueQueda` (`web/lib/repetidas.js:59-65`): primero la
que fue a redes, después **la que tiene foto**, después la que tiene cuerpo y recién después la más vieja.

**Cómo se rompe.** El comentario de `ingesta/repetidas-publicadas.mjs` dice que la nueva "se une a ésa" (la publicada). Pero
si la nueva tiene foto y la vieja no, queda la nueva y la publicada pasa a redirigir. Con la ventana de 72 h, una noticia de
hace dos días vuelve arriba en la portada con fecha nueva, que es lo que CLAUDE.md dice que no pasa ("una sola fecha, que
envejece y nunca rejuvenece"). Antes pasaba sólo con lo que confirmaba la IA en la misma corrida; ahora la ventana es mucho
más grande.

**Arreglo sugerido.** Para las parejas de `repetidasDeLoPublicado`, que quede siempre la ya publicada (por ejemplo, pasar a
`repetidasConOtraDireccion` una lista `preferidas` o resolverlas aparte con `fusion.set(nueva, vieja)`); si la nueva trae foto,
pasarle la foto a la vieja en vez de cambiar cuál queda. Prueba con una pareja donde sólo la nueva tiene foto.

### M3 · Media · Una nota igual a una retirada no se frena

**Dónde.** `web/scripts/generar-datos.mjs:612` compara contra `archivoAnterior.notas` sin sacar las retiradas; después,
`repetidasConOtraDireccion` recibe la lista **sin** retiradas (`:922`) y descarta la pareja porque una punta no está.

**Cómo se rompe.** Si otro medio vuelve a contar el caso de `d1rexu` (retirada hoy por datos que identifican a una víctima) y
el semáforo vuelve a dejarlo pasar (ya lo dejó una vez), la nota sale de nuevo con otra dirección. El módulo nuevo la
reconoce como la misma noticia, pero esa información se tira.

**Arreglo sugerido.** Si la mejor pareja de una nota nueva es una nota retirada, no publicarla sola: mandarla a esperar a una
persona con motivo "igual a una nota retirada" (o directamente no publicarla si la retirada fue por menores o víctimas).

### M4 · Media (estructural, no de hoy) · Lo retirado sigue en el historial público

**Dónde.** `web/data/retiradas.json` saca las notas del sitio, pero el cuerpo completo de `d1rexu` (lugar preciso y parentesco
de la víctima) y de `1lxw5wx` sigue en commits anteriores de `web/data/archivo.json`, en un repositorio público. En el estado
actual de `main` ya no están (sólo queda la ficha de `fichas.json`, sin datos que identifiquen). `docs/auditoria-opus/ANALISIS.md`
las describe sin repetir los datos sensibles: bien.

**Arreglo sugerido.** Decidir si se limpia el historial de esos archivos (`git filter-repo`, con cuidado: cambia todos los
números de commit y obliga a todos a volver a clonar) o se acepta como riesgo hasta que lo sensible salga del repositorio
público (lo que propone `docs/etapa-10-operacion/DISENO-MOTOR.md` con D1). Es una decisión de ustedes; no la tomaría un agente.

### M5 · Media · El tope de notas sin freno

**Dónde.** `web/lib/archivo.js:202` (`MAXIMO_EN_ARCHIVO = 3700`) y `web/scripts/contar-archivos.mjs` (avisa en 16.500, alerta
en 18.000, nunca frena).

**Cómo se rompe.** La cuenta da 15.900 archivos llenos. Las fotos de collages y efemérides (2 por día) y cualquier página nueva
suman por fuera de la cuenta por nota. Si se pasan los 20.000, Cloudflare Pages rechaza el despliegue y la web se congela (el
vigilante lo vería como "web-vieja", si está instalado).

**Arreglo sugerido.** Que el armado recorte solo: si el conteo de `web/out` supera, por ejemplo, 19.000, bajar el tope de
notas en esa corrida (o sacar primero las fotos de las notas más viejas) en vez de sólo avisar.

### M6 · Media · La prueba de restauración no falla con fsck

**Dónde.** `.github/workflows/probar-restauracion.yml:104` hace `git fsck --full 2>&1 | tail -3` sin `pipefail`: el resultado
del paso es el de `tail`. El resumen (`:116`) escribe "restaurado y sano (git fsck sin errores)" siempre.

**Arreglo sugerido.** `set -o pipefail` en ese paso, o `git fsck --full` solo (y el `tail` aparte).

### B1 · Baja · Dos errores congelados en las correcciones del 15/10

`web/data/correcciones.json`: en `1b3umaz` quedó "si el equipo se consagra **campen**" y en `woerbj` "La **Séleccion**
Argentina". Como `correcciones.json` cuenta como escrito por una persona, ningún arreglo automático los va a tocar. Corregir
las dos palabras a mano ("campeón", "Selección").

### B2 · Baja · `letrasRotas` rechaza de más

`ingesta/verificar.mjs:626`. Rechaza palabras extranjeras comunes en minúscula ("crêpe", "pâtisserie", "über") salvo que
estén escritas así en la fuente, y cualquier carácter invisible (guion blando `­`, espacio de ancho cero), que a veces
se copia de las fuentes. Cada rechazo gasta uno de los tres intentos; al tercero la nota queda sin cuerpo. Sugerencia: sacar
los invisibles del texto de la IA antes de mirarlo (en vez de rechazar) y aceptar letras latinas de afuera también en minúscula
si la palabra está en la fuente en cualquier forma.

### B3 · Baja · La copia flexible no tiene tope en "Title Case"

`ingesta/verificar.mjs:301`: toda palabra con mayúscula que no arranca oración cuenta como nombre y no pesa. Un título o una
frase copiada con muchas mayúsculas (o en "Title Case") no llega nunca a 12 palabras comunes. Es una elección razonable para
nombres; vale ponerle un tope al largo total del tramo copiado (por ejemplo, 25 palabras seguidas en total aunque sean nombres).

### B4 · Baja · Una fecha futura taparía "web-vieja"

`infra/vigilante-cloudflare/worker.mjs:122` toma la fecha más nueva de todo el sitemap (incluye la fecha de cada nota) y `:94`
convierte una diferencia negativa en 0. Una nota con fecha en el futuro (hoy no hay ninguna) haría que la web nunca parezca
vieja. Sugerencia: ignorar fechas más de 10 minutos en el futuro, o leer sólo el `lastmod` de `/farmacias` (que es la hora del
armado).

### B5 · Baja · `/estado` sin llave

`infra/vigilante-cloudflare/worker.mjs:651`. Devuelve a cualquiera el estado y `mailsConError` (los errores de Cloudflare al
mandar mails). No hay secretos, pero no hace falta que sea público; se puede pedir el mismo `x-token`.

### B6 · Baja · El nombre del KV del vigilante

`.github/workflows/vigilante-cloudflare.yml:30-32` busca el KV por nombre exacto "vigilante-ESTADO" o "ESTADO"; el LEEME (`:22`)
dice que se llama "radar-balcarce-vigilante-ESTADO". Si el real se llama como dice el LEEME, el workflow crea uno nuevo y vacío
(se pierde la memoria de qué se avisó; no es grave). Además, el JSON de `kv namespace list` se busca desde el primer `[`: si
wrangler imprime un "[WARNING]" antes, el paso falla. Corregir el LEEME o la búsqueda, y buscar el JSON con algo más firme.

### B7 · Baja · Entrada del workflow directo al script

`.github/workflows/probar-restauracion.yml:41`: `FECHA="${{ inputs.fecha }}"`. Sólo pueden correrlo quienes tienen escritura,
pero es la forma que GitHub desaconseja. Pasarla por `env:` y validarla con `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`.

### B8 · Baja · El registro de gasto de IA cuenta de menos

`reels/reescritura.mjs:380, 386` anotan en `web/data/uso-ia.json`, que sólo guarda "Actualizar la web". Cuando el panel del
celular pide una reescritura (`panel.yml`), se anota en la copia de esa corrida y se pierde (su `git add` no lo incluye). La
lectura con IA, las fotos, las voces y las pistas todavía no anotan nada (está en `PENDIENTES.md`). Sirve como piso, no como
total. El archivo existe en el repositorio, así que el `git add` de `actualizar.yml` no falla.

### B9 · Baja · El sondeo de fuentes

`infra/sondeo-fuentes/worker.mjs:19-20`: el modo "navegador" pide los feeds con el nombre de un Chrome común, justamente para
pasar donde un medio bloquea robots. Es una herramienta de prueba, a mano, pero si se usa en producción conviene decidirlo como
política (lo que piden los medios en sus condiciones). En lo técnico: analizar hasta 2 MB por feed con expresiones regulares puede
pasarse del tiempo de CPU del plan gratis de Workers (error 1102); si pasa, bajar `TOPE_BYTES`.

---

## Lo que revisé y está bien

- **Secretos:** ninguna clave en los cambios de hoy (busqué los formatos de Google, Meta, Groq, GitHub, Tavily y claves
  privadas). Los workflows nuevos pasan todo por `secrets.*` y `wrangler secret put` por la entrada estándar.
- **Menores y víctimas en el repositorio:** los documentos nuevos hablan de los casos sin repetir lugares, nombres ni
  parentescos; las pruebas nuevas usan frases inventadas o de clima y deportes. `retiradas.json` y `correcciones.json` tienen
  `motivo`, `cuando` y `por` en todas las entradas.
- **Avisos por mail** (`redes/avisar-por-mail.mjs`, `POST /avisar`): token sólo en el encabezado, comparación sin cortar al
  primer carácter, tope por hora, `clave` que no tapa un mail que falló, sin inyección de encabezados.
- **Estadísticas** (`redes/estadisticas*.mjs`): una respuesta vacía ya no se guarda como cero, un día "sin lectura" no pisa uno
  con datos, y el reintento está bien acotado. La consulta por hora tiene `limit: 100` y se piden 3 días (72 horas): alcanza; si
  alguien usa `reparar-estadisticas` con más de 4 días, se cortarían las últimas horas.
- **UTM** (`redes/elegir.mjs`, `piezas.mjs`, `publicar*.mjs`): el libro sigue guardando el enlace limpio, y la comparación de
  posteos repetidos mira los primeros 80 caracteres (la UTM va al final), así que no se duplican espejos.
- **Respaldo en partes** (`respaldo.yml`): manifiesto después de las partes, SHA256 del archivo entero y de cada parte; la
  restauración lo vuelve a armar y lo compara.
- **Efemérides con resvg** (`web/scripts/foto-efemeride.mjs`): usa las mismas fuentes que las placas y nunca tira.
- **Repetidas sin IA**: los umbrales son estrictos y las reglas de "nunca juntar" (acá/afuera, números distintos, anuncio y
  resultado, protagonistas distintos, lo de una persona) están bien; el problema es sólo cuál queda (M2) y lo retirado (M3).
- **Fuentes y `grupo`**: `contarMedios` está bien definido (después de `TODAS_LAS_FUENTES`) y se usa igual en el semáforo y en
  la relevancia.
- **Pruebas:** `npm test` en la PC: 2.223 pruebas, 2.221 pasan, 2 saltadas, ninguna falla.
