# 04 · La redacción: cómo se escribe, se verifica y se firma una nota

*Actualizado el 17/10/2026. Si el código cambia, manda el código.*

Qué pasa desde que una historia está en verde (`docs/03-SELECCION.md`) hasta que
tiene título, bajada y cuerpo propios, verificados contra sus fuentes, o queda
"esperando cuerpo". **Las reglas de escritura no se repiten acá**: son una sola y
están en [`CRITERIO-EDITORIAL.md`](../CRITERIO-EDITORIAL.md). Acá se cuenta cómo
el código las hace cumplir.

## En una frase

A cada nota verde que nadie revisó se le bajan los textos completos de sus
fuentes (hasta cuatro llegan a la IA, desde el 15/10), se le manda a Gemini con la
instrucción de `CRITERIO-EDITORIAL.md` § 12 y todas sus fuentes numeradas, lo que
devuelve se arregla sin inventar y se compara dato por dato contra lo que recibió; si pasa y tiene un cuerpo de 70 palabras o más, se
publica con la firma "Redacción con IA"; si no, se reintenta hasta tres veces y
mientras tanto la nota no sale.

---

## El recorrido, paso a paso

La reescritura automática la hace `reescribirAutomaticas()`
(`reels/reescritura.mjs`), y la llama un solo lugar: `web/scripts/generar-datos.mjs`,
en cada corrida de "Actualizar la web" (en la nube). Una persona puede además
pedir que la IA escriba una nota desde el panel del celular (paso 15).
Las notas que nacen de una pista o de un mail de prensa van por otro camino (paso 16).

### 1. Qué notas se escriben

`generar-datos.mjs` le pasa las notas de la ingesta menos:

- las que ya tienen un cuerpo escrito en `web/data/correcciones.json` (paso 12);
- las que ya no están dentro de las 36 horas de la portada;
- las que **llegan tarde** (hecho de más de 12 horas y nunca publicadas:
  `docs/03-SELECCION.md`, paso 10).

Las que ya escribió la IA (paso 2) se pasan siempre, para revisarlas. De todas,
`reescribirAutomaticas` toma sólo las **verdes** y **sin decisión de una persona**
(`decisionHumana`): lo amarillo espera a alguien en el panel del celular, y lo que
decidió una persona no se toca nunca.

**En qué orden** (`ordenarParaReescribir`), porque el cupo del día es limitado:

1. **Primero lo de Balcarce** (`esLocal`: `local`, sección Balcarce o fuente de
   acá): lo más nuevo (por tramos de 6 horas) y, a igual tramo, lo de más puntaje.
2. **Después lo de afuera, repartido por sección**: a cada nota se le asigna el
   "lugar" que ocuparía en su sección (los de las notas que ya tienen cuerpo cuentan
   como ocupados) y se escribe primero el lugar 1 de cada sección, después el 2, y
   así. Ninguna sección queda vacía porque Política y Deportes tienen más puntaje.

### 2. Lo que ya estaba escrito se reusa (y se revisa)

`previas` son las notas que la portada anterior o el archivo ya tienen escritas por
la IA, con guion y cuerpo de verdad (`previasDeLaPortada`). **No se vuelven a
pedir**, pero en cada corrida:

1. se les aplican los arreglos que no inventan nada (`arreglarEscritura`, paso 7);
2. sus partes internas se revalidan con las reglas de hoy (`revalidarExtras`) y la
   que ya no pasa se borra;
3. todo pasa otra vez por el semáforo (`semaforoDeLaReescritura`) y el nivel de
   verificación: si da rojo, amarillo o BAJA, la nota deja de salir sola;
4. título, bajada, cuerpo y guion pasan por el verificador **sólo en la forma**
   (`soloForma`: largo, acusaciones, "en vivo", relleno, gancho, forma del título,
   negación, repetir la bajada, copia). Los datos no se vuelven a comparar: se
   compararon cuando se escribió, y el texto completo no se vuelve a bajar.

Si no pasa, esa escritura no se usa y la nota vuelve a ser candidata. Esto sólo
alcanza a las notas que la ingesta todavía trae: una que la fuente sacó de su feed
queda como estaba escrita.

### 3. Los topes

| Tope | Cuánto | Constante |
|---|---|---|
| Notas que se le piden a la IA por corrida | 40 | `REESCRITURA.porCorrida` |
| Fallas de Gemini en una corrida para dejar de insistir | 3 | `FALLOS_PARA_CORTAR` |
| Notas por día (día de Balcarce), con la clave de lectura propia cargada | 450 | `REESCRITURA.porDia` |
| Lo mismo, si la lectura con IA comparte la clave de redacción | 330 | `REESCRITURA.porDiaSinClaveDeLectura` (lo elige `topeDeReescrituras`) |
| Intentos por nota, en corridas distintas | 3 | `REESCRITURA.intentosMaximos` (`MAXIMO_DE_INTENTOS`) |
| Uno más si la cuentan 5 medios o más; dos más desde 8 (1/10) | 4 o 5 | `fuentesParaUnIntentoExtra`, `fuentesParaDosIntentosExtra` (lo suma `intentosMaximosPara`) |
| Días que se recuerdan los intentos | 7 | `REESCRITURA.diasDeIntentos` |

Los pedidos del día se cuentan con los intentos guardados en
`web/data/intentos-ia.json` (`pedidasHoy`). Cada intento guarda cuántos van, cuándo
fue el último y por qué: `{"intentos":1,"ultimo":"2026-09-27T13:31:22Z","motivo":"título o bajada: 4 problemas (numero): el titulo dice 70 y la fuente no lo dice"}`.

**Una falla del servicio no cuenta como intento** (`FALLA_DEL_SERVICIO`): sin cupo,
503, sin red, sin clave, tiempo agotado, y también **una clave rechazada o sin
crédito (401, 402, 403)**: si no, cuando Google desactiva una clave cada nota
gastaría sus tres intentos y se perdería para siempre. Una respuesta que no sirve,
sí cuenta.

**Una nota que ya dio verificación BAJA** no se vuelve a pedir, salvo que hoy
tenga más fuentes que entonces.

### 4. Lo que se junta antes de pedir

1. **Los textos completos de las fuentes** (la "entrada ampliada", desde el 15/10,
   regla 174; `textosDeLasFuentes` y `conEntradaAmpliada` en `reels/reescritura.mjs`,
   `armarFuentesParaLaIA` en `ingesta/fuentes-para-la-ia.mjs`). Hasta el 15/10 la IA
   recibía el texto de una sola fuente y 280 caracteres de las demás. Ahora:
   - se intenta bajar el texto de **hasta 6 fuentes** (la principal siempre, de su
     `enlaceFeed` si es Blogger; las oficiales antes que las demás:
     `REESCRITURA.fuentesQueSeBajan`);
   - a la IA le llegan **hasta 4 textos completos** (`textosCompletosMaximo`), cada
     uno con su número, su medio y su fecha, con tope de **4.000 caracteres cada uno
     y 12.000 entre todos** (`caracteresDelTextoCompleto`, `caracteresDeTextosEnTotal`);
     un texto que no suma nada nuevo no se manda;
   - las fuentes van **numeradas por lo que aportan**: la Fuente 1 es la oficial con
     texto o, si no, la más completa (la dirección y el identificador de la nota no
     cambian, y "Fuentes consultadas" sigue en el orden de la ingesta);
   - dos fuentes que comparten la mitad o más de sus tramos de cinco palabras
     (`copiaEntreFuentes`: un cable, una gacetilla) son **copia**: van como "mismo
     texto que la Fuente N", con sólo lo que agregan, y cuentan como una sola voz
     para el nivel de verificación (paso 10);
   - más de 12 fuentes, las demás sólo se nombran (`fuentesEnLaEntradaMaximo`);
   - el texto llega limpio (`limpiarTextoBajado`): sin letras rotas, pies de nota ni
     párrafos de otra nota de la página.

   Cómo se saca el texto de la página: `docs/02-INGESTA.md`, paso 14.
2. **Los antecedentes** (`antecedentesDe`): hasta 3 notas que el sitio publicó en
   los últimos 30 días, anteriores a ésta, que comparten un tema de los que se
   siguen (`TEMAS`) o dos palabras que dicen algo del titular. Salen de
   `web/data/archivo.json`: **no se busca nada en internet**, a propósito
   (`CRITERIO-EDITORIAL.md` § 5).
3. **El semáforo sobre la fuente** (`semaforoDeLaReescritura`): cada texto completo
   que se manda y los resúmenes de todas las fuentes pasan por la lista roja y la de menores y víctimas
   (`AMARILLO_MENORES`). Si el nombre de un chico está en el tercer párrafo, la nota
   se frena **antes** de gastar un pedido.
4. **¿Hay material?** Sin texto completo de ninguna fuente y con menos de 60
   palabras entre todos los resúmenes (`REESCRITURA.palabrasMinimasDeMaterial`), no
   se pide nada ("sin material"). Cuenta como intento: quizás otro medio cuente más.

### 5. El pedido a la IA

**La instrucción** es la sección 12 de `CRITERIO-EDITORIAL.md`, **tal cual**:
`ingesta/prompt-editorial.mjs` la lee al arrancar, entre las marcas
`<!-- PROMPT:… -->`; si falta el archivo o una parte, la reescritura no arranca ("la
IA no escribe sin criterio"). En el lugar de `{{TONO}}` va uno de dos tonos: **el
serio** si la nota es de Policiales o tiene una palabra de `PALABRAS_SERIAS`
(robo, choque, incendio, corte de luz…, entre esas marcas en § 4; lo decide
`esTemaSerio`), y **el de todos los días** en el resto.

**Dos reglas del 29/09**, medidas con notas reales antes de cambiarlas
(`reels/comparar-instruccion.mjs`; la medición, en
`docs/historico/VARIANTES-29-09.md`):

- **La regla 1 pone número a la copia:** nunca más de diez palabras seguidas iguales
  a una fuente, en ninguna parte, tampoco adentro de una cita (el verificador
  rechaza desde 13, `COPIA_MAXIMA`), y cómo evitarlo: cambiar el orden y el verbo,
  partir la oración larga.
- **Primero, los datos:** la IA anota en un campo `datos` de 3 a 10 datos
  concretos, cada uno con el número de su fuente ("F1: …"), y escribe el resto
  sólo con ésos. Es su borrador: el código no lo usa ni lo publica.

**Lo que va después de la instrucción** (`entradaDe`, que con la entrada ampliada
usa `entradaAmpliadaDe`), por ejemplo:

```
Fecha de hoy: jueves 15/10/2026
Sección: Automovilismo
Titular original (de Diario La Vanguardia / Radio Gabal (FM 104.1) / Agencia DIB): …
FUENTES (3, numeradas; la 3 repite el texto de otra y no es una confirmación independiente):
Fuente 1 (Diario La Vanguardia · publicada el miércoles 14/10/2026 · su texto completo va abajo): resumen…
Fuente 2 (Radio Gabal (FM 104.1) · publicada el miércoles 14/10/2026 · su texto completo va abajo): resumen…
Fuente 3 (Agencia DIB · publicada el miércoles 14/10/2026): mismo texto que la Fuente 2; es una copia, no una confirmación independiente.
Texto completo de la Fuente 1 (Diario La Vanguardia, publicada el miércoles 14/10/2026; la que más datos trae):
…
Texto completo de la Fuente 2 (Radio Gabal (FM 104.1), publicada el miércoles 14/10/2026):
…
ANTECEDENTES: notas que Radar Balcarce publicó ANTES sobre el tema. Es información ANTERIOR, no de hoy: …
[21/09/2026] Título de la nota anterior. Su bajada.
```

Con una sola fuente, la línea dice "una sola: no hay confirmación independiente" y
el único texto completo va con "de acá sale la mayor parte de lo que podés contar en
el cuerpo".
Las fuentes oficiales van marcadas "fuente oficial". Las fechas llevan **el día de
la semana**, para que la IA sepa si "el sábado" de la fuente ya pasó.

**El pedido de una persona** (opción `pedido` de `reescribir`, hasta 400
caracteres, `PEDIDO_MAXIMO`): lo usa el panel del celular ("más corta", "empezá
por el horario"). Va al final, como "PEDIDO DE LA REDACCIÓN", y **nunca por encima
de las reglas**: si pide inventar, identificar a alguien u opinar, siguen mandando
las reglas.

**Cómo se pide:** Gemini `gemini-flash-lite-latest` (el "flash" normal daba 503
seguido), temperatura 0,6, respuesta en JSON, 60 segundos como máximo; con un 503
se espera 4 segundos y se reintenta, hasta 3 veces. **Las claves, en orden:**

1. `GEMINI_API_KEY_REDACCION` (acepta el nombre viejo `GEMINI_API_KEY`);
2. `GEMINI_API_KEY_REDES`, **sólo si la primera dijo "sin cupo" (429)** o no está;
3. `GEMINI_API_KEY_CLASIFICACION`, si la que se usó falló por el servicio (sin
   cupo, saturado o clave rechazada o sin crédito: 401, 402, 403, 429, 5xx) y es
   otra clave.

Groq no sirve para redactar (acepta 8.000 tokens por minuto y un pedido ocupa unos
9.000). Qué es cada clave y sus cupos: `docs/08-INFRAESTRUCTURA.md`. El registro
dice cuántos pedidos fueron a cada una: "claves de Gemini usadas: N con la de
redacción, M con la de redes, K con la de clasificación (respaldo)". Desde el
15/10 cada llamada anota además sus tokens y sus errores, por día, en
`web/data/uso-ia.json` (`anotarUsoIA`, `redes/uso-ia.mjs`, regla 170); nunca frena
la corrida.

**Lo que tiene que devolver**, un JSON con `datos` (el borrador), `titulo`,
`copete` (la bajada), `cuerpo`, `guion`, `claves`, `seSabe`, `noConfirmado`,
`aportes`, `textoRedes`, `etiquetas` y `nivel`. Una barra invertida mal formada se
repara antes de leerlo (`repararEscapes`). Sin título o sin guion, la respuesta no
sirve.

### 6. Cómo se escribe cada parte

Resumen; las reglas completas, con ejemplos, están en `CRITERIO-EDITORIAL.md`:

| Parte | En pocas palabras | Dónde está la regla |
|---|---|---|
| **Título** | Una frase completa, en presente, que dice qué pasó; unos 70 caracteres y nunca más de 90; sin etiqueta adelante, sin cortar, sin signos ni gancho, sin "en Balcarce" al final, nunca "en vivo" | § 4 "El título"; § 12 regla 2 |
| **Bajada** (campo `copete`) | Dos o tres frases, unas 50 palabras, hasta 360 caracteres; completa el título, no lo repite; lo que promete, el cuerpo lo cuenta | § 4 "La bajada"; § 12 regla 3 |
| **Cuerpo** | Obligatorio; de 70 a 180 palabras, nunca más largo que los datos; hasta 3 párrafos y 1.800 caracteres; pirámide invertida; sólo con lo de las fuentes; pasado para lo que ya pasó; sin relleno | § 4 "El cuerpo"; § 12 reglas 4, 6, 9, 11, 14 a 20 |
| **Copia** | Nunca más de diez palabras seguidas iguales a una fuente, tampoco en una cita: con palabras propias | § 12 regla 1 |
| **Guion** | El título dicho tal cual, unos 10 segundos, hasta 200 caracteres. Lo usan las redes | § 4 "El guion"; § 12 regla 7 |
| **Las fuentes** | Lo que confirman varias va como hecho, lo de una sola atribuido, lo que se contradice con las dos versiones; nunca el nombre del medio en el texto | § 5; § 12 pasos A a H y reglas 8, 16 |
| **Acusaciones** | Siempre atribuidas y en condicional (doctrina Campillay) | § 2, § 5; § 12 regla 10 |
| **Menores y víctimas** | Nunca identificables, aunque la fuente lo haga | § 2; § 12 regla 13 |
| **Partes internas** | Claves (3 a 5), qué se sabe, qué falta confirmar, lo que aportó cada fuente, texto para redes (280), etiquetas (3 a 8), nivel sugerido | § 4 "Lo que la IA escribe para la redacción"; § 12 final |

Todos los números están en `ingesta/criterio.mjs` (`TITULO`, `BAJADA`, `CUERPO`,
`GUION`…) y en la tabla de `CRITERIO-EDITORIAL.md` § 11 (una prueba controla que
coincidan).

### 7. Los arreglos automáticos: lo que se corrige sin inventar

Antes de verificar, **`arreglarEscritura()`** (`ingesta/verificar.mjs`) corrige, en
lo nuevo y en lo ya escrito, lo que se puede arreglar sin agregar ningún dato:

| Qué | Cómo queda |
|---|---|
| Una etiqueta **conocida** con dos puntos adelante del título (una sección, un deporte, "Exclusivo", "Video", "Urgente"…: `ETIQUETAS_CONOCIDAS`, `web/lib/titulos.js`), si lo que sigue tiene cuatro palabras o más | "Rugby: Pato Naranja gana…" → "Pato Naranja gana…". Una desconocida puede ser un lugar ("Necochea: …") y no se toca: la rechaza el verificador |
| Una coma, un signo o un conector colgando al final del título | "…del país," → "…del país" (`sinCierreColgado`) |
| "Este" + un día de la semana que no es hoy | "participan este viernes" (leído el lunes) → "participan el viernes"; "este fin de semana", salvo sábado o domingo, → "el fin de semana". No se calcula la fecha: sería inventarla |
| "Cabe destacar que…", "Es importante señalar que…" al comienzo de una oración | Se saca la muletilla y queda la oración |
| Una o dos palabras sin la tilde que siempre llevan (también, según, reunión…) | Se les pone (con tres o más, se rechaza: paso 8) |
| Un escape completo que quedó escrito sin decodificar ("antif\u00futbol") | Se decodifica ("antifútbol"). Uno cortado no se puede arreglar: lo rechaza el verificador (regla 166) |

Y **al publicar**, `tituloAutomatico()` (`web/lib/titulos.js`) aplica al título y
al guion automáticos, también a los ya publicados: la etiqueta conocida adelante, el
cierre colgado y **"en Balcarce" al final** (`sinBalcarceAlFinal`, si quedan cuatro
palabras o más). Lo que escribió una persona no se toca.

### 8. La verificación: cada control

`verificar()` (`ingesta/verificar.mjs`) compara lo que escribió la IA **contra todo
lo que recibió**: el titular original, el resumen de cada fuente que no es copia,
todos los textos completos que se mandaron y lo que agrega cada copia (juntos,
`fuenteParaVerificar`; también en las notas de pistas), y aparte los antecedentes.
También conoce las fechas que recibió la IA (la de hoy y la de publicación de cada
fuente), para no marcar como inventado "el jueves 15 de octubre". No usa otra IA: son
comparaciones mecánicas, gratis y siempre iguales. Es estricto a propósito. Hay
controles que **valen siempre** (también al revisar lo ya escrito, paso 2) y otros
**sólo en lo nuevo**. "Real" es un caso de `web/data/intentos-ia.json` o del código;
"prueba", de `pruebas/verificar.test.mjs`.

**Sobre los datos (sólo en lo nuevo):**

| Control | Qué rechaza | Ejemplo |
|---|---|---|
| `numero` | Una cifra (o un número en palabras) que las fuentes no traen. Los de menos de 100, exactos; los grandes admiten un 6 % de redondeo. "Un millón y medio" se lee como 1.500.000 | Real: "el título dice 70 y la fuente no lo dice" |
| `nombre` | Un nombre propio o una sigla que las fuentes no nombran (sin contar Balcarce, Argentina, Buenos Aires, Radar, los días y los meses; un plural o femenino del mismo nombre no cuenta) | Real: "el copete nombra a 'municipalidad' y la fuente no" |
| `fecha` | Un día de la semana o un mes que las fuentes no dicen. El mes de una fecha que la IA recibió vale ("en octubre"); el día de la semana y los números de esa fecha valen **sólo escritos como fecha** ("el jueves 15", "15 de octubre", "15/10"), no sueltos (A1, 15/10: "comenzarán 14 cuadras" en una fuente publicada un 14 tiene un 14 inventado) | Real: "el cuerpo menciona 'septiembre' y la fuente no" |
| `cita` | Algo entre comillas que no está textual en las fuentes | Prueba: "El boxeador dijo: 'Es el día más feliz de mi vida'" |
| `antecedente` | Un dato que sólo está en una nota anterior usado como si fuera de hoy. En el cuerpo, las claves y lo que se sabe, vale si la oración lo marca como anterior ("en agosto", "como se había informado"); en el título, la bajada, el guion y el texto para redes, nunca | Real: "el cuerpo usa 'viernes', que sale de una nota anterior, como si fuera de hoy" |

**De forma y de criterio (valen siempre):**

| Control | Qué rechaza | Ejemplo |
|---|---|---|
| `lugar` | Una nota que no es de Balcarce con Balcarce en el título, si el titular original no lo decía | Real: "Comienza la Invasión de Pueblos en Necochea con presencia de jóvenes de Balcarce" |
| `vacio` | Sin título o sin bajada | — |
| `largo` | Pasar el máximo de cada parte (título 90, bajada 360, guion 200, cuerpo 1.800; claves 180, datos 260, aporte 220, texto para redes 280, etiqueta 40) | Un título de 95 caracteres |
| `acusacion` | Un verbo de delito en pasado (asesinó, mató, robó, estafó, abusó…) sin ninguna atribución en el mismo texto (según, habría, presunto, acusado, la denuncia, policía, fiscal…). Se mira con tildes: "un robo" o "un presunto abuso" no son "robó" ni "abusó" | Prueba: "Asesinó a su vecino" sin atribuir |
| `negacion` | Una negación (no, nunca, jamás, tampoco, ni, sin, rechaza, niega…) en el título o la bajada que las fuentes no tienen, o una del titular original que desapareció de toda la nota | Real: "la fuente niega algo en el título y el texto nuevo no" |
| `repite` | El primer párrafo del cuerpo dice casi lo mismo que la bajada (70 % de palabras en común) o arranca con sus mismas palabras | Real: "el cuerpo repite el copete en vez de desarrollarlo" |
| `copia` | Más de 12 palabras COMUNES seguidas copiadas del original (`COPIA_MAXIMA`); no cuentan los números, fechas, horas, nombres propios ni fórmulas oficiales (regla 167); la instrucción pide diez como mucho, para tener margen | Real: "copia 13 palabras seguidas del original" |
| `tilde` | "mas" o "ms" en vez de "más" | Real: "con ms de ciento sesenta atletas" |
| `forma` (letras rotas) | Una palabra con letras que no son del castellano o con dos tildes («polêcutemica», «miéércoles», «recibiõ»), entidades o codificación rota, un escape sin decodificar («barra-u…», regla 166), signos sueltos o caracteres de control; un nombre extranjero con mayúscula pasa si está en la fuente o va con otro nombre (regla 167) | Real: «Rosario Central genera polêcutemica en los festejos» |
| `forma` (en vivo) | "En vivo", "en directo", "minuto a minuto" o "live" en el título, la bajada, el guion o el texto para redes ("música en vivo" sí; `diceEnVivo`) | Real: "Dólar hoy y dólar blue en vivo" |
| `relleno` | Una frase de la lista `RELLENO` (`ingesta/criterio.mjs`, `CRITERIO-EDITORIAL.md` § 4), aunque la fuente la diga; y "como se había informado" sin antecedentes | Real: "el copete tiene una frase de relleno sin dato: 'en el marco de'" |
| `localia` | "De nuestra ciudad", "nuestros vecinos", "balcarcense", "productores locales"… cuando las fuentes no dicen Balcarce | Prueba: "Es una buena noticia para los automovilistas locales" en una nota de YPF |
| `gancho` | "Lo que tenés que saber", "enterate", "te contamos", "imperdible"… en lo que se ve primero | "Lo que tenés que saber del corte de luz" |
| `titulo` | Signos de admiración o pregunta; una etiqueta con dos puntos que no se pudo sacar; cortado en coma o conector; un arranque sin hecho ("Preocupación por…"); un adjetivo de gancho (impresionante, increíble…) | Real: "Tecnopapa, el evento que reunirá a toda la cadena productiva del país," |

**De estilo (sólo en lo nuevo, `problemasDeEstilo`):**

| Control | Qué rechaza | Ejemplo |
|---|---|---|
| `pasado` | El título con el verbo principal en pasado ("-ó", "-aron", "-ieron", fue, hizo, dijo…). No cuenta el verbo de una subordinada ("Detienen al hombre que robó una moto" pasa) ni lo que va entre comillas | Real: "El intendente repasó las obras del año" |
| `tildes` | Tres palabras o más sin la tilde que siempre llevan (`ESTILO.palabrasSinTilde`) | "La reunion, que conto con la participacion de productores…" |
| `promesa` | Un número del título que el cuerpo no dice, o dos nombres del título o más que el cuerpo no nombra | Real: un título nombraba a tres sancionados y el cuerpo explicaba uno |

Las partes internas pasan por los mismos controles, cada una por su lado
(`verificarExtras`, paso 10).

### 9. Qué pasa cuando algo no pasa

`evaluar()`, adentro de `reescribirAutomaticas`:

1. **Si falla el título, la bajada o el guion**, la escritura entera no sirve.
2. **Si falla el cuerpo**, se sacan sólo **las oraciones** con problemas
   (`depurarCuerpo`: cada oración pasa sola por los controles de datos y el de
   copia; si después el primer párrafo repite la bajada, se va ese párrafo). Si lo
   que queda pasa entero y tiene 70 palabras o más, se usa ("oraciones sacadas ·
   nota X · 2 (numero), quedan 94 palabras").
3. **Si no alcanza, un segundo pedido** en la misma corrida, con una "CORRECCIÓN
   OBLIGATORIA" que dice qué falló (hasta seis problemas) y, si el cuerpo quedó
   corto, que es obligatorio y de 70 a 180 palabras.
4. **Si tampoco**, la nota no sale, se anota el intento con el motivo ("IA
   rechazada · título · cuerpo: 3 problemas (numero, copia)…") y se vuelve a probar
   en otra corrida, hasta el tercer intento.

Si Gemini falla del todo, `reescribirConRespaldo` devuelve el armado mecánico (el
titular y el resumen de la fuente), pero **no se publica**: sin cuerpo, no sale.

### 10. Las partes internas y el nivel de verificación

`completarReescritura()` (`reels/reescritura.mjs`):

1. **Claves, qué se sabe, qué falta confirmar, lo que aportó cada fuente, texto
   para redes y etiquetas** pasan por el verificador cada una por su lado
   (`verificarExtras`); la que no cuadra se descarta sola y la nota sigue. Al texto
   para redes se le pide además que no nombre al medio (salvo un organismo
   oficial), sin hashtags ni enlaces.
2. **Con una sola fuente**, "qué falta confirmar" lleva siempre "No pudo ser
   contrastado de forma independiente con las fuentes consultadas."
   (`FRASE_FUENTE_UNICA`). La pone el sistema, no la IA.
3. **"Fuentes consultadas"** se arma con los datos reales de la ingesta (medio,
   enlace, fecha, si es oficial) y lo que la IA dijo que aportó cada una.
4. **El nivel de verificación lo calcula el código**, no la IA
   (`nivelDeVerificacion`; la sugerencia de la IA queda anotada, sin mandar):

| Nivel | Cuándo |
|---|---|
| **ALTA** | Hay una fuente oficial, o dos o más medios independientes (desde el 15/10, un grupo de copias del mismo texto cuenta como un solo medio, y si en el grupo hay una oficial, cuenta sólo la oficial: `mediosQueNoCuentan`, `contarFuentes`) |
| **MEDIA** | Un solo medio |
| **BAJA** | Un solo medio y el titular original, el título o la bajada se apoyan en una denuncia o una acusación (denuncia, acusó, habría, presunto, "según trascendió"…); o, con un solo medio, algo de "qué falta confirmar" toca el hecho central. Una opinión citada ("aseguró que") no baja el nivel, y con varias fuentes u oficial nunca es BAJA |

Criterio en `CRITERIO-EDITORIAL.md` § 5.

### 11. El último control: semáforo y verificación baja

Antes de guardar, **todo lo que escribió la IA** pasa por el semáforo: lo que se ve
primero (título, bajada, guion, texto para redes) por las listas enteras; lo largo,
por el rojo y lo de menores y víctimas. Si da rojo o amarillo, no se usa y la nota
cambia de color ("… (visto al reescribir)"). En el registro de Actions va el
identificador, **nunca el título** de una nota frenada: puede ser justo la que
identifica a alguien. Si el nivel es **BAJA**, la nota tampoco sale sola: pasa a
amarillo con "verificación baja: espera a una persona".

Si todo pasa, se anota el intento "con cuerpo". Al final, el registro resume:
"reescritura: N pedidas, M con cuerpo, F fallaron, S sin cuerpo que sirva, R
rechazadas por el título o la bajada, X sin material, O oraciones sacadas, A ya
agotaron los 3 intentos, P partes nuevas descartadas, Z frenadas por el semáforo",
y la línea de las claves usadas (paso 5).

### 12. Sin cuerpo no se publica, y cómo escribirlo

**La regla:** una nota automática sólo se publica si tiene cuerpo (`tieneCuerpo`,
`web/lib/cuerpo.js`): **70 palabras o más** (`PALABRAS_MINIMAS_CUERPO`, igual a
`CUERPO.minimoParaPublicar`), distinto de la bajada y sin arrancar con sus mismas
palabras. Sin cuerpo no aparece en la portada, las secciones, el feed, el sitemap
ni las redes. Lo que publicó una persona se respeta. Lo mira `notaPublicada`
(`docs/03-SELECCION.md`, paso 11).

**Las que esperan: `web/data/esperando-cuerpo.json`.** En cada corrida,
`generar-datos.mjs` escribe ahí las notas automáticas que saldrían (dentro de las
36 horas) pero no tienen cuerpo, con sus fuentes:

```json
{"id":"1rymg4t","titulo":"Cerca de 40 mil personas pasaron por el Fangio…","copete":"…","seccion":"Automovilismo","fecha":"2026-09-28T17:01:09Z",
 "fuentes":[{"medio":"Diario La Vanguardia","enlace":"https://www.diariolavanguardia.com/noticias/44916-…","fecha":null}]}
```

La portada lleva además el número (`esperandoCuerpo`) y lo cuentan los informes
diarios por mail de las 8:15 y las 21:15 (`redes/informe-diario.mjs`, regla 176),
que desde el 15/10 reemplazan al resumen de las 21 del vigilante.

**Cómo se escribe el cuerpo que falta:**

- **Desde el panel del celular**, pestaña "Sin cuerpo": "Escribir con IA" (paso
  15) o "Escribir a mano". Se guarda en `web/data/correcciones.json`.
- **A mano, sin panel** (una persona o Claude): se agrega una entrada en
  `web/data/correcciones.json` con el identificador de la nota:

```json
{"notas":{
"1rymg4t":{
  "cuerpo":"Primer párrafo con el hecho y el dato que la bajada no dio.\n\nSegundo párrafo con el contexto.",
  "motivo":"cuerpo escrito a mano: Gemini sin cupo",
  "cuando":"2026-09-28",
  "por":"redacción de Claude, pedida por Hernán"
}
}}
```

- En la misma entrada se puede corregir `titulo`, `copete` o `seccion`. **Sin
  `motivo`, la entrada no vale**; sin `cuando` y `por`, fallan las pruebas.
- Se escribe con el mismo criterio que la IA (`CRITERIO-EDITORIAL.md` § 4 y § 12),
  leyendo las fuentes de `esperando-cuerpo.json`, en párrafos separados por una
  línea en blanco (`\n\n`).
- El cuerpo cuenta para "sin cuerpo no se publica" y a esa nota **ya no se le pide
  nada a Gemini**. La dirección no cambia. Sale en la corrida siguiente.

### 13. Qué ve el lector y qué es interno

| | Qué | Dónde |
|---|---|---|
| **El lector** | Título, bajada, la foto si la hay (`docs/05-FOTOS.md`), cuerpo y, al pie, una línea gris con la firma y un desplegable **cerrado** "Fuentes (N)" con el nombre de cada medio y el enlace a su nota | `web/app/nota/[id]/page.js`, `web/components/verificacion.js`, `web/lib/fuentes-de-la-nota.js` |
| **La redacción** | Claves, qué se sabe, qué falta confirmar, lo que aportó cada fuente, antecedentes, nivel de verificación, texto para redes | En `portada.json` y `archivo.json` (`CAMPOS_EXTRA`; en el archivo, sólo los primeros 4 días: `aligerarViejas`), para el panel del celular. No van a la web ni a los datos para Google (las etiquetas sí, como palabras clave) |

Las fuentes que ve el lector: las de "Fuentes consultadas" o, si no hay, los medios
de la nota; sin repetir enlaces; una entrada de feed de Blogger se muestra sin
enlace. Criterio: `CRITERIO-EDITORIAL.md` § 7. Las partes internas de una persona y
las de la IA **nunca se mezclan** (`extrasParaLaWeb`): si una persona corrigió el
texto, las de la IA no van, porque se armaron sobre otro texto.

### 14. La firma

Cada nota dice quién la escribió, en una línea gris (`firmaCorta`,
`web/components/metadatos.js`), y lo mismo en los datos para Google (`autorDeNota`).
La decide `quienEscribio`: "escrita por la IA" si la nota tiene **guion** y su
cuerpo no se escribió a mano (`cuerpoAMano`); "revisada" si la publicó una persona
(`como: 'publicada'`) o tiene una corrección (`corregidaAMano`).

| La nota es… | La línea dice |
|---|---|
| Escrita por la IA, sin revisión | "Redacción con IA, verificada contra las fuentes · Fuentes (N)" |
| Escrita por la IA y aprobada o corregida por una persona (también un texto de la IA a pedido, guardado con `deIA: true`) | "Redacción con IA, revisada por la redacción · Fuentes (N)" |
| Con el cuerpo escrito a mano en `correcciones.json`, o publicada por una persona sin guion | "Revisada por la redacción · Fuentes (N)" (autor para Google: Radar Balcarce) |
| Sin guion y sin persona | "Texto de *medio* · Fuentes (N)" |
| Propia (el dólar, un repaso, el clima, "Un día como hoy") | Lo que dice la nota ("Nota de Radar Balcarce…") |
| Propia que nace de una pista o de un mail de prensa, aprobada por una persona (paso 16) | "Nota de Radar Balcarce, escrita con IA a partir de lo que publicaron *medios* y revisada por la redacción" (`firmaDePista`, `web/lib/notas-de-pistas.js`) |
| Propia de una pista que salió sola (paso 16) | "Nota de Radar Balcarce, escrita con IA a partir de lo que publicaron *medios* y controlada contra esas fuentes" |

Al abrir el desplegable se ve la explicación larga. Nunca se dice "sin revisión
humana". Criterio: `CRITERIO-EDITORIAL.md` § 10.

### 15. Escribir a pedido: el panel del celular

Una persona puede pedirle a la IA que escriba una nota que espera ("Escribir con
IA", en Esperan o Sin cuerpo) o que reescriba una publicada ("Reescribir con IA"),
con un pedido opcional. El celular dispara el workflow "Panel del celular"
(`.github/workflows/panel.yml`), que corre `panel/celular.mjs`:

1. Busca la nota: primero la que dejó la última corrida en la caché de Actions
   (`.cache/celular-notas.json`, con sus fuentes enteras; no es pública) y, si no,
   la publicada o la que espera cuerpo.
2. La escribe `reescribirUna()` (`panel/reescribir-una.mjs`) **por el mismo
   camino** que la automática: texto completo, antecedentes, § 12 con el pedido,
   `arreglarEscritura`, el verificador con los controles de estilo, `depurarCuerpo`
   y el semáforo. Lo rojo no se escribe nunca, ni a pedido.
3. La diferencia: **no descarta nada en silencio**. Devuelve el texto con la lista
   de lo que no cuadra con las fuentes y cuántas oraciones sacó, para que la
   persona lo revise antes de publicar.
4. El borrador queda **cifrado** para los celulares registrados en
   `web/data/celular-borradores.json` (`panel/cifrado.mjs`): el repositorio es
   público. El registro del workflow no muestra nada de la nota; el pedido que
   escribe la persona sí queda a la vista en GitHub (por eso el celular avisa: sin
   nombres).

Tarda un minuto. Nada se publica solo: la persona decide en el celular. Cómo se usa,
en `docs/09-PANEL.md` y `docs/11-OPERACION.md`. Desde el 15/10 también recibe la
entrada ampliada (paso 4).

### 16. Notas propias: de una pista o de un mail de prensa

No vienen de la ingesta: se guardan en **`web/data/notas-de-pistas.json`** (lo
escribe el celular, o Claude a pedido; cada entrada con `motivo`, `cuando` y `por`,
sin eso se ignora) y las lee `notasDePistas` (`web/lib/notas-de-pistas.js`). Entran
con relevancia alta (95, `RELEVANCIA_DE_PISTA`), duran 180 días como las demás y
tienen que tener cuerpo de 70 palabras o más.

- **De una pista** ("Hacer la nota", en la pestaña Pistas del celular):
  `panel/nota-de-pista.mjs` busca en internet las notas de los medios que hablan de
  lo mismo, con su texto (`ingesta/busqueda.mjs`, Tavily), y las escribe por el mismo
  camino que "Escribir con IA" (`reescribirUna`), con un pedido fijo: contar sólo lo
  que confirman las fuentes y no repetir el rumor. Una pista que toca menores o
  víctimas no se escribe. El borrador viaja cifrado y lo publica una persona.
- **Una pista que sale sola** (`panel/pistas-solas.mjs`, desde el 4/10): si ya la
  cubren 3 medios o más y el verificador no tiene nada para decir, se publica sola,
  con la firma de la IA; con cualquier aviso, espera a una persona. Como mucho 2
  por corrida y 3 intentos por pista, uno cada 20 horas (cada intento gasta
  búsquedas).
- **Desde un mail de prensa** (16/10, `docs/flujos/NOTA-DESDE-MAIL.md`): cuando
  Hernán o Andrés lo piden, Claude lee la gacetilla en el Gmail del medio, escribe
  la nota atribuida a la oficina de prensa, elige la foto (sin marca y sin chicos),
  se la muestra a Hernán y sólo con su OK la guarda en `notas-de-pistas.json` (y la
  foto en `web/data/fotos-manuales.json`). Una nota así, como toda nota que publica
  una persona, sale en los repasos de las redes sin pedirlo aparte
  (`docs/07-REDES.md`).

---

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama |
|---|---|---|
| `reels/reescritura.mjs` | `reescribirAutomaticas` (todo el flujo), `reescribir` (el pedido, las claves, `pedido`), `entradaDe`, `esTemaSerio`, `ordenarParaReescribir`, `textosDeLasFuentes`, `conEntradaAmpliada`, `antecedentesDe`, `completarReescritura`, `nivelDeVerificacion`, `semaforoDeLaReescritura`, `revalidarExtras`, `previasDeLaPortada`, `topeDeReescrituras` | `generar-datos.mjs` (nube), `panel/reescribir-una.mjs` |
| `ingesta/fuentes-para-la-ia.mjs` | La entrada ampliada (regla 174): `armarFuentesParaLaIA` (qué textos van y en qué orden), `limpiarTextoBajado`, las copias (`parecidoEntreTextos`, `mediosQueNoCuentan`) | `reels/reescritura.mjs` |
| `ingesta/prompt-editorial.mjs` | Lee la sección 12 de `CRITERIO-EDITORIAL.md` entre las marcas; lanza si falta algo | `reels/reescritura.mjs` |
| `CRITERIO-EDITORIAL.md` | **El criterio único**: las reglas (§ 4 a § 10), los números (§ 11) y la instrucción exacta de la IA (§ 12) | La IA, las personas, las pruebas |
| `ingesta/criterio.mjs` | Los números del criterio (`TITULO`, `BAJADA`, `CUERPO`, `GUION`, `PARTES`, `COPIA_MAXIMA`, `ESTILO`, `RELLENO`, `REESCRITURA`) | Verificador, reescritura, web |
| `ingesta/verificar.mjs` | `verificar`, `verificarExtras`, `depurarCuerpo`, `arreglarEscritura`, `problemasDeEstilo`, `tituloEnPasado`, `diceEnVivo` | `reels/reescritura.mjs`, el panel del celular, `generar-datos.mjs` |
| `web/lib/titulos.js` | `tituloAutomatico`: etiqueta adelante, cierre colgado, "en Balcarce" al final | `generar-datos.mjs`, `verificar.mjs` |
| `web/lib/cuerpo.js` | `tieneCuerpo` (70 palabras) | `generar-datos.mjs`, reescritura, redes, web |
| `web/scripts/generar-datos.mjs` | Elige qué se le pide a la IA, arma el texto final, aplica correcciones y la regla del cuerpo; escribe `intentos-ia.json` y `esperando-cuerpo.json` | `actualizar.yml` |
| `reels/claves.mjs` | Qué clave usa cada cosa, del entorno o del `.env`, y el modelo de texto | Reescritura, lectura, fotos, voz |
| `reels/comparar-instruccion.mjs` | Compara versiones de las reglas de la IA con notas reales y el verificador de producción (gasta cupo) | A mano |
| `panel/celular.mjs`, `panel/reescribir-una.mjs` | Escribir una nota a pedido desde el celular y dejar el borrador cifrado | "Panel del celular" (`panel.yml`) |
| `web/components/metadatos.js` | `quienEscribio`, `firmaCorta`, `explicacionDeFirma`, `autorDeNota` | La página de la nota |
| `web/components/verificacion.js`, `web/lib/fuentes-de-la-nota.js` | El pie de la nota: firma y "Fuentes (N)" | La página de la nota |
| `web/data/esperando-cuerpo.json`, `correcciones.json`, `intentos-ia.json` | Las notas que esperan cuerpo; los cuerpos (y títulos, bajadas, secciones) escritos a mano o desde el celular; los intentos de cada nota | `generar-datos.mjs`; una persona o el celular |
| `panel/nota-de-pista.mjs`, `panel/pistas-solas.mjs`, `web/lib/notas-de-pistas.js`, `web/data/notas-de-pistas.json` | Las notas propias que nacen de una pista o de un mail de prensa (paso 16) | "Panel del celular", "Pistas" (`pistas.yml`), `generar-datos.mjs` |
| `web/data/uso-ia.json` | Tokens y errores de la IA por día (lo anota la redacción) | `redes/uso-ia.mjs` |

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Cambiar cómo escribe la IA (el tono, una regla, un ejemplo) | `CRITERIO-EDITORIAL.md` § 12, sin borrar las marcas `<!-- … -->` ni `{{TONO}}`. Sirve desde la corrida siguiente |
| Medir un cambio de reglas antes de hacerlo | `node reels/comparar-instruccion.mjs actual otra.txt` (gasta cupo) |
| Que una palabra pida el tono serio | La línea entre las marcas `PALABRAS_SERIAS` de `CRITERIO-EDITORIAL.md` § 4 |
| Cambiar un largo, un tope o una cantidad | `ingesta/criterio.mjs` **y** la tabla de `CRITERIO-EDITORIAL.md` § 11 (`pruebas/criterio.test.mjs` controla que coincidan) |
| Sumar una frase de relleno prohibida | `RELLENO` en `ingesta/criterio.mjs` **y** entre las marcas `RELLENO` de `CRITERIO-EDITORIAL.md` § 4 **y** la regla 19 de § 12 |
| Un control nuevo del verificador | `ingesta/verificar.mjs`, con su prueba en `pruebas/verificar.test.mjs` o `pruebas/estilo.test.mjs` |
| Una etiqueta más que se pueda sacar del título | `ETIQUETAS_CONOCIDAS` (`web/lib/titulos.js`). Nunca un lugar |
| Cuándo un cuerpo "alcanza" | `PALABRAS_MINIMAS_CUERPO` (`web/lib/cuerpo.js`) **y** `CUERPO.minimoParaPublicar` |
| Cómo se calcula el nivel de verificación | `nivelDeVerificacion` y `DE_PARTE` (`reels/reescritura.mjs`) |
| Qué es oficial | `oficial: true` en la ficha de la fuente (`ingesta/fuentes.mjs`) |
| El modelo o el orden de las claves | `MODELO_DE_TEXTO` (`reels/claves.mjs`) y `reescribir` (`reels/reescritura.mjs`) |
| Escribir o corregir el cuerpo de una nota | El panel del celular, o `web/data/correcciones.json` |
| La firma | `quienEscribio`, `firmaCorta` y `explicacionDeFirma` (`web/components/metadatos.js`) |

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| Gemini sin cupo o saturado | "reescritura: … N fallaron (HTTP 429…)" en el registro; crece `esperando-cuerpo.json`; el vigilante avisa si menos del 35 % de lo de las últimas 24 horas tiene cuerpo | Esperar al día siguiente, o escribir los cuerpos desde el celular o a mano (paso 12) |
| Google desactiva una clave | Pedidos con 401, 402 o 403 en el registro (no gastan intentos); el vigilante avisa por mail (WhatsApp sólo si el mail no sale, regla 173) | Cargar otra clave en GitHub Secrets (`docs/08-INFRAESTRUCTURA.md`) |
| Se cayó `CRITERIO-EDITORIAL.md` o se borró una marca | "Actualizar la web" falla a la vista ("Criterio editorial (…): falta la marca …") y `npm test` también | Restaurar la marca |
| La IA cambia el formato del JSON | "Bad Unicode escape…" o "Unexpected token" en `intentos-ia.json` | `repararEscapes` cubre las barras mal formadas; lo demás, mirar `limpiarJson` |
| La IA escribe un verbo de delito sin tilde ("robo" por "robó") | El control no lo ve: esos verbos sólo se reconocen con la tilde, a propósito, para no rechazar cada "un robo" | Riesgo aceptado; si una nota así sale, se corrige |
| Una regla nueva no alcanza a lo ya publicado | Una nota vieja sigue con un defecto que hoy se rechazaría | Sólo se revalida lo que la ingesta todavía trae; lo demás se corrige a mano |
| Una nota se frena por verificación BAJA | Amarilla con "verificación baja: espera a una persona" | Revisarla y aprobarla desde el panel del celular si corresponde |
| Una nota aprobada desde el celular con el texto escrito a mano | Firma "Redacción con IA, revisada por la redacción": el celular le pone el título como guion, y el guion es la señal de "escrita por la IA" | Avisarle a Claude: es un arreglo de código |

Lo que falta, en `PENDIENTES.md`.
