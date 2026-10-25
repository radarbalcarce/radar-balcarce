# Edición V2: notas que sean una síntesis de todas sus fuentes

*15/10/2026. Diagnóstico y propuesta: **no se tocó código de producción, ni datos, ni `CRITERIO-EDITORIAL.md`**.
El texto candidato del nuevo § 12 está al lado, en `PROMPT-V2-CANDIDATO.txt`. Rige el criterio de siempre hasta
que se mida y se decida.*

*Actualización del 15/10/2026: la **fase 1 (arreglar la entrada) quedó implementada**, sin tocar el prompt; qué se
hizo, cuánto cuesta y qué sigue como propuesta, en el **§ 10**. El prompt candidato sigue sin adoptarse.*

Para leer con: `ANALISIS.md` (auditoría del criterio) y `CRITERIO-EDITORIAL-PROPUESTA.md` (el texto nuevo del
criterio). Esto no repite lo de ahí: mira una sola cosa, **qué pasa cuando una noticia tiene varias fuentes**.

---

## 1. Lo más importante, en diez líneas

1. **Hoy la IA no recibe las fuentes: recibe una y migas de las demás.** Le llega el texto completo de *una* sola
   fuente (hasta 4.000 caracteres) y, de cada una de las otras, el resumen del feed **cortado en 280 caracteres**
   (`limpiarCopete`, `ingesta/ingesta.mjs:884-890`). En las seis notas que revisé recibió entre el **21 % y el 35 %**
   del texto disponible cuando había 4 fuentes o más.
2. **Se nota en los números**: las notas con 1 fuente tienen 117 palabras de cuerpo en promedio; las de 2, 117; las
   de 3, 116; las de 4 o más, 118 (1.053 notas automáticas de `web/data/archivo.json`). Sumar fuentes no suma nada.
3. **En el 43 % de las notas la IA vio menos fuentes que los medios que se muestran** (458 de 1.053). Cuando la IA de
   lectura junta dos notas repetidas (`quitarRepetidas`, `ingesta/lectura-ia.mjs:582`), se suman los `medios` pero
   **no los `origenes`**: un caso de 26 medios se escribió con 2 fuentes.
4. **La "fuente principal" es la primera que se publicó, no la más completa** (`ingesta/ingesta.mjs:1529`). En la
   nota de Caputo, el texto completo fue el más corto de los cuatro; los datos fuertes estaban en otro.
5. **Una gacetilla repetida cuenta como confirmación independiente**: Municipalidad y Radio Gabal con el mismo texto
   al 100 %; el cable de DIB repetido igual por tres medios. El nivel dice "ALTA, lo confirman varios medios".
6. **El texto que se baja trae basura** (párrafos de otras notas de la página) y a veces **letras rotas** ("Econom�a"),
   y la IA las usa: en una nota publicada quedó "secretario de Energa".
7. **Lo nuevo**: un prompt que pide primero un **inventario de datos por fuente** (con un "respaldo" textual que el
   sistema puede buscar), después la nota, una **traza por oración** y una lista de **discrepancias**. Es compatible
   con el código de hoy (los campos nuevos se ignoran hasta que se usen).
8. **El prompt solo no alcanza**: lo que más mejora la síntesis es darle a la IA el texto de 2 a 4 fuentes, sin copias
   repetidas y sin basura. Son cambios de código chicos y sin costo, en `reels/reescritura.mjs` e `ingesta/`.
9. **Buscar en internet no conviene todavía en la redacción automática.** Sí, más adelante, un piloto acotado
   (sólo contexto oficial, de una lista cerrada de sitios, nunca para el hecho central). Cuesta entre 0 y unos US$ 30
   por mes según el alcance; el riesgo mayor es mezclar otro hecho o un dato viejo.
10. **No se pudo medir hoy**: en esta PC no hay clave de Gemini (`.env` con `GEMINI_API_KEY` vacío) y, además, el
    comparador actual **no sirve para medir síntesis** (le pasa una sola fuente a la IA). Se explica cómo medirlo en
    el § 7. **Recomendación**: no adoptar el prompt sin medir; primero arreglar la entrada (§ 6, fase 1).

---

## 2. Cómo funciona hoy, paso a paso

### 2.1 Qué recibe la IA de verdad

El pedido lo arma `entradaDe` (`reels/reescritura.mjs:234-251`):

| Qué | De dónde | Cuánto |
|---|---|---|
| Fecha de hoy con el día, sección, "Titular original (de A / B / C…)" | la nota | El titular de la principal; la lista de medios es la de `medios` (puede tener más medios que fuentes) |
| "Fuente 1 … Fuente N", con medio, si es oficial y fecha con día | `origenes` (`ingesta/ingesta.mjs:1597-1604`) | Sólo el **resumen del feed**, limpio y **cortado en 280 caracteres** con "…" |
| "Texto completo de la Fuente N" | `textoCompletoDe` (`reescritura.mjs:930-943`) | **Uno solo**: el de la principal; si no se puede bajar, el de la primera de las otras que baje. Hasta **4.000** caracteres (`REESCRITURA.caracteresDelTextoCompleto`) |
| ANTECEDENTES | `antecedentesDe` (`reescritura.mjs:199-222`) | Hasta 3 notas propias de 30 días, título y bajada. Se eligen por un tema en común **o** dos palabras del título: entra cualquier nota de Milei en una nota de Milei |

Y la instrucción le dice: "desarrollás lo que dan TODAS las fuentes… y el texto completo, **que es donde está la
mayor parte de los datos**" (regla 4 del § 12). Con lo que recibe, es cierto: la mayor parte está en un texto. La
instrucción, sin querer, la empuja a reescribir ése.

### 2.2 Cuántas fuentes usa

- **Las que arma el cruce**, en orden: la principal primero (la que ya estaba publicada o, si no, **la primera que se
  publicó**; de Balcarce si hay alguna de acá). No se ordena por cuál dice más.
- **Las repetidas que junta la IA de lectura no suman fuentes**: `quitarRepetidas` copia los `medios` de las otras
  notas del grupo a la que queda, pero no sus `origenes`. Resultado en `archivo.json`: 458 de 1.053 notas automáticas
  tienen más medios que fuentes vistas por la IA (ej.: "El Gobierno oficializa préstamos del BID", 26 medios, 2
  fuentes; "VTV", 23 medios, 7 fuentes).
- **El nivel de verificación** cuenta `medios` además de `origenes` (`contarFuentes`, `reescritura.mjs:603`): puede
  decir "lo contaron 26 medios" de una nota que la IA escribió con dos.

### 2.3 Qué pasa con el cuerpo

- Se le piden 70 a 180 palabras, y el promedio real es **~117, haya 1 o 7 fuentes** (tabla del § 1).
- El verificador (`ingesta/verificar.mjs`) compara contra **todo lo recibido junto** (`fuenteParaVerificar`): sabe
  si un número existe en *alguna* fuente, no **en cuál** ni si la oración lo atribuye bien. Los `aportes` ("qué dio
  cada fuente") los escribe la IA y nadie controla que sean ciertos: muchas veces son relleno ("Confirmó las fechas
  de las declaraciones").
- Los `aportes` quedan vacíos con frecuencia: de 559 fuentes en notas de 2+ fuentes con ese campo, 161 (29 %) no
  tienen aporte; en "VTV" (27 fuentes) sólo la primera tiene uno.
- En las notas de **Pistas** pasa lo mismo: la búsqueda trae el texto de hasta 4 páginas, pero la IA recibe uno solo
  completo y los demás en 400 caracteres; y como la nota trae `origenes`, el verificador ni siquiera mira los textos
  de las otras (`fuenteParaVerificar`, `reescritura.mjs:256-261`).

---

## 3. Seis notas reales: qué tomó de cada fuente

Bajé el 15/10 el texto de cada fuente con el mismo extractor de producción (`traerTexto`). La IA recibió el texto
completo de la Fuente 1 (salvo que diga otra cosa) y 280 caracteres de las demás. "Disponible" es la suma de los
textos bajados (cada uno cortado en 4.000, así que es un piso).

| Nota | Fuentes (con texto) | Recibió / disponible | Copias entre fuentes |
|---|---|---|---|
| Caputo destaca el optimismo… ante el FMI (`1kppi96`) | 4 (4) | ~2.800 / 10.900 (26 %) | — |
| Javier Milei defiende su plan económico… en Washington (`b04zc8`) | 4 (4) | ~4.800 / 13.800 (35 %) | — |
| El Ministerio de Transporte… actualiza la tarifa básica de la VTV (`1b4z7qp`) | 7 (6) | ~4.300 / 12.700 (34 %) | El Diario Balcarce = DIB = La Verdad (96 %) |
| Incidentes y represión… River en Junín (`zfpkeo`) | 9 (7 bajadas) | ~3.700 / 17.400 (21 %) | — |
| Productores ganaderos trasladan vacas… (`1fb5jbq`) | 3 (2) | ~3.400 / 5.700 (59 %) | — |
| Ariel Bilbao asume como juez… Juegos Bonaerenses (`u0hcbv`) | 2 (2) | ~1.100 / 1.600 (72 %) | Municipalidad = Radio Gabal (100 %) |

### 3.1 Caputo y el FMI (Economía, 4 fuentes)

- **Fuente 1 (NA, texto completo, la más corta)**: frases de Caputo, el título de la charla, Tailandia, el RIGI con
  200.000 millones de dólares.
- **Fuente 3 (Ámbito)**, que traía los datos duros: déficit de cinco puntos del PBI eliminado, gasto público −30 %,
  inflación de 211 % a 30 %, pobreza de 57 % a 32 %, 500.000 empleos, quiénes estaban en el panel (Georgieva). La IA
  recibió 280 caracteres: "fue efusivamente optimista".
- **Fuente 4 (Crónica)**: llegó con letras rotas en todo el texto ("Econom�a").
- **La nota publicada** (unas 95 palabras): no dice dónde fue (Tailandia), no trae **ninguna** cifra en el cuerpo (el
  RIGI quedó sólo en "seSabe", que el lector no ve), y "la gente está valorando mucho los datos reales" pasó a "la
  ciudadanía valora las estadísticas actuales", que no es lo mismo. Los aportes dicen que la Fuente 4 "confirmó las
  fechas": no dio nada.

### 3.2 Milei en Washington (Política, 4 fuentes, 11 medios)

- **Fuente 1 (La Nación, texto completo)**: Cámara de Comercio, premio "Campeón global de la libre empresa", el
  título de la exposición, riesgo país a 640 puntos.
- **Fuentes 3 y 4 (Radio Mitre, La Brújula 24)**: las dos abren con lo mismo, "la apertura genera **ganadores y
  perdedores**… algunos sectores van a la quiebra", y la inflación al 30 % minorista y 20 % mayorista.
- **La nota publicada**: no dice nada de lo que dos de cuatro fuentes ponían primero. Trae una oración rota: "el
  indicador que elabora el banco JP Morgan trepaba **esta mañana** a los 640 puntos". La fuente decía "el riesgo país
  que elabora JP Morgan": parece que la IA le sacó "riesgo país" para no pasar el límite de copia, y quedó una frase
  que no se entiende, con un "esta mañana" que la regla prohíbe. "Este jueves" en la bajada (prohibido). En "qué falta
  confirmar" quedó "secretario de **Energa**… se **haba** anunciado" (letras rotas que el control de la regla 167 no
  vio). Y como antecedente le llegó "Una psíquica de animales revela detalles sobre su vínculo con Javier Milei".

### 3.3 VTV (Política, 7 fuentes, 23 medios) y su gemela (Balcarce, 27 fuentes)

- **Fuente 1 (0221, texto completo)**: monto, 17,6 %, resolución 361, **dónde se van a publicar las demás categorías
  (vtv.gba.gob.ar)**. Pero el texto bajado trae dos párrafos de **otras notas** de la página ("las reparaciones del
  techo… en La Plata", "la reunión será este viernes a las 10… los gremios").
- **Fuentes 2, 4 y 7**: el mismo cable de DIB, palabra por palabra: el mecanismo (7 % del salario del operario de
  SMATA, $1.630.085,67) y los montos estimados para motos y pesados.
- **Fuentes 3 y 5**: la firma del ministro Martín Marinucci.
- **La nota publicada**: dice en "qué falta confirmar" que **los valores del resto de las categorías "todavía no
  fueron difundidos"**, cuando una fuente decía dónde se iban a publicar y otra traía estimaciones. No nombra al
  ministro ni la resolución. El nivel dice "lo contaron 7 medios independientes", y tres eran el mismo cable.
- **La gemela** (`aa5npj`, misma noticia, otra corrida): se escribió con otra principal (El Diario Balcarce, es decir,
  el cable de DIB) y sí trae motos y pesados; de sus 27 fuentes sólo una tiene aporte. Dos pedidos a la IA, dos notas
  distintas del mismo hecho, que después se unieron (`web/data/fusionadas.json`).

### 3.4 River en Junín (Fútbol, 9 fuentes)

- La principal (La Página Millonaria) traía casi todo: 4.500 entradas, $100.000, APREVIDE (había autorizado 3.000),
  gas pimienta. Clarín, en su resumen, la sobreventa y el QR. **Esta nota salió bien en datos**, porque la principal
  era completa.
- Lo que se perdió: **heridos leves y bastonazos** (Infobae), **gente que entró sin entrada** (Olé), **el resultado,
  1 a 1** (TyC Sports). Y la atribución quedó en "según informaron distintos medios y registros audiovisuales", que no
  le dice nada al lector. Números sin punto de miles ("4500", "100000").

### 3.5 La crecida y el ganado (Agro, 3 fuentes)

- TN (principal) no se pudo bajar; el texto completo fue el de A24, que traía todas las cifras (200.000 cabezas
  afectadas, hasta 700.000 de forma indirecta, 500 a 600 mm en el sur de Brasil, Bajos Submeridionales).
- **Es el mejor caso**: la nota tiene todos los datos de A24. Pero **es la reescritura de A24**: lo de El Día
  (Entre Ríos y Corrientes, dónde pasa) no entró. Muestra lo que se gana cuando el texto completo es el bueno, y que
  eso hoy depende de la suerte.

### 3.6 Ariel Bilbao, juez en los Juegos Bonaerenses (Balcarce, 2 fuentes)

- Municipalidad y Radio Gabal publicaron **el mismo texto** (la gacetilla oficial; Gabal sin el último párrafo).
- La nota está bien escrita y es fiel. Pero el nivel dice "lo informaron la Municipalidad **y un medio
  independiente**": no hubo segunda voz. Acá no cambia nada (con la oficial ya es ALTA), pero en una nota sin fuente
  oficial, dos copias de un mismo texto pasan por "dos medios".

---

## 4. Los problemas, ordenados

| # | Problema | Dónde | Efecto | Lo arregla |
|---|---|---|---|---|
| P1 | La IA recibe un solo texto completo; las demás fuentes, 280 caracteres | `entradaDe`, `textoCompletoDe`, `limpiarCopete` | La nota es la reescritura de una fuente | Código (fase 1) |
| P2 | La principal es la primera publicada, no la más completa | `ingesta/ingesta.mjs:1529`, `textoCompletoDe` | El texto completo puede ser el más pobre (Caputo) | Código (fase 1) |
| P3 | `quitarRepetidas` suma medios y no fuentes | `ingesta/lectura-ia.mjs:603-606` | 43 % de las notas: la IA vio menos fuentes que las que se muestran | Código (fase 1) |
| P4 | Copias (gacetilla, cable) cuentan como fuentes independientes | `contarFuentes`, el cruce | Nivel ALTA sin segunda voz; ruido para la IA | Código (fase 1) + decisión |
| P5 | Basura de la página y letras rotas en el texto bajado | `ingesta/articulo.mjs` | Riesgo de mezclar otra noticia; "Energa" publicado en lo interno | Código (fase 1) + prompt |
| P6 | El prompt dice que la mayor parte está "en el texto completo" | § 12, regla 4 | Empuja a reescribir uno | Prompt (candidato) |
| P7 | Nadie controla qué dato salió de qué fuente; los aportes son de palabra | `verificar`, `completarReescritura` | No se puede saber si la nota usó a todas, ni auditar | Prompt + código (fase 2) |
| P8 | Contradicciones: la regla existe pero no hay dónde anotarlas aparte | § 12, regla 9 | Se pierden o se resuelven en silencio | Prompt (campo `discrepancias`) + código (fase 2) |
| P9 | Antecedentes que no tienen que ver ("psíquica de animales") | `antecedentesDe` | Ruido y riesgo de mezcla | Prompt (ignorar) + código |
| P10 | Para no copiar, la IA borra la palabra clave ("el indicador que elabora JP Morgan") | regla 1 vs. verificador de copia | Frases que no se entienden | Prompt (candidato, regla 1 bis) |
| P11 | Atribución vaga en plural ("según distintos medios") | § 12 | No informa | Prompt (candidato, regla 3) |
| P12 | El comparador no mide síntesis: le pasa una sola fuente y, como resumen, **nuestra propia bajada** | `reels/comparar-instruccion.mjs:39-54` | Cualquier A/B de "síntesis" con él da cualquier cosa | Script de medición nuevo (§ 7) |

---

## 5. El diseño nuevo

### 5.1 Principios

1. **Primero el inventario, después la nota.** La IA lista los datos de cada fuente antes de escribir; la nota se
   escribe sólo con esos datos. Ya existe un campo "datos" de borrador: se lo vuelve estructurado.
2. **Cada dato con su dirección.** Cada dato dice de qué fuentes sale y trae un "respaldo" (hasta 8 palabras tal
   cual) para que el sistema lo encuentre. Cada oración del cuerpo dice de qué datos sale.
3. **Una voz es una voz.** Un texto repetido por varios medios cuenta una vez.
4. **La versión más precisa, y las diferencias a la vista.** Se elige el dato más completo; las diferencias reales
   se anotan aparte y se cuentan atribuidas.
5. **Las reglas duras no se tocan** (§ 5.8).

### 5.2 La entrada que conviene (fase 1, código)

```
Fecha de hoy: jueves 15/10/2026 · Sección: Política
FUENTES (5 voces distintas de 7 medios):
F1 · 0221 (La Plata) · medio · jueves 15/10/2026 08:15
    Texto completo (2.400 caracteres, sin los párrafos de otras notas): …
F2 · Agencia DIB · agencia · jueves 15/10/2026 08:52
    Mismo texto publicado también por: El Diario Balcarce, La Verdad
    Texto completo (2.500): …
F3 · Diario La Vanguardia · medio · sin hora
    Lo que agrega (1.200): …
F4 · Ámbito · medio · jueves 15/10/2026 09:02
    Resumen (600): …
F5 · La Tecla · medio · jueves 15/10/2026 08:17
    Resumen (280): …
ANTECEDENTES (sólo si tratan del mismo asunto):
A1 · lunes 13/07/2026 · "La Provincia posterga 90 días el aumento de la VTV" …
```

Lo que cambia respecto de hoy:

- **Hasta 4 textos completos** (no uno), de unos 2.500 caracteres cada uno, ~10.000 en total: unos 2.500 tokens más
  por pedido. Con la versión candidata del prompt (16.835 caracteres contra 20.171) el pedido total crece poco.
- **Orden por lo que aportan**: primero la oficial, después la de texto más largo y distinto, después las demás. El
  número de fuente deja de depender de quién publicó primero.
- **Copias juntas**: si dos textos comparten más de la mitad de sus tramos de cinco palabras (lo medí así en el § 3:
  las copias dan 96-100 %, las fuentes distintas menos de 50 %), van como una fuente "publicada también por".
- **Sin restos de la página**: se descartan los párrafos que no comparten ninguna palabra fuerte con el título de
  la nota (el caso de la VTV se arregla así). Y si el texto tiene letras rotas, se intenta leer con la otra
  codificación (el caso de Crónica es un texto en Latin-1 leído como UTF-8) y, si no, se marca.
- **`quitarRepetidas` junta también los `origenes`** de las notas que une.
- **Antecedentes más estrictos**: dos palabras del título en común **y** el mismo tema (hoy alcanza con una de las
  dos).

### 5.3 El prompt candidato

Está completo en `PROMPT-V2-CANDIDATO.txt` (16.835 caracteres; el actual tiene 20.171). Su estructura:

1. **Quién sos y qué hacés** (una síntesis, no una reescritura).
2. **Lo que recibís**: fuentes numeradas con medio, tipo y fecha con día; antecedentes; contexto (para la fase 3).
3. **Cómo trabajás**: el inventario en seis pasos (cada dato con todas sus fuentes; la versión más precisa; separar
   confirmado / una sola / de parte / distinto; las copias cuentan una vez; ignorar restos y letras rotas; recién
   ahí elegir el hecho central).
4. **Cuando las fuentes no dicen lo mismo** (tabla del § 5.5).
5. **19 reglas fijas**: las de hoy, sin repeticiones. Las de copia, Campillay y menores/víctimas están **palabra por
   palabra** (lo comprobé con un script) y se les agrega una línea, sin aflojar nada.
6. **Lo que devolvés**: los campos de hoy más `datos` estructurado, `trazas` y `discrepancias`; sin `nivel` (el
   sistema lo calcula y la sugerencia no se usa).
7. `{{TONO}}` al final (así el comienzo del pedido es siempre igual) y el molde del JSON.

Cumple las frases con números que controla `pruebas/criterio.test.mjs` ("apunta a unos 70 caracteres y NUNCA pasa
de 90", "Va de 70 a 180 palabras", etc.) y tiene la lista de relleno completa entre comillas: si se adopta, la prueba
no cambia. Un detalle: los dos tonos empiezan con "5. Tono:"; en el candidato no molesta, pero al adoptarlo
conviene sacar el "5.".

**Es compatible con el código de hoy**: `datos`, `trazas` y `discrepancias` se ignoran (`extrasDeLaRespuesta` toma
sólo lo que conoce) y el resto tiene la forma de siempre. Se puede probar con `usarReglasDePrueba` sin tocar nada.

Lo nuevo, con el caso que lo pide:

| Regla nueva o cambiada | Caso |
|---|---|
| "Una nota con varias fuentes NO es la reescritura de la primera" + inventario por fuente | Caputo, Milei, Crecida |
| "Las copias cuentan como una sola voz" | Bilbao, VTV |
| "Ignorás los párrafos de otra noticia y las letras rotas" | VTV (0221), Crónica, "Energa" |
| "Nunca le sacás a una frase la palabra que le da sentido" (regla 1, línea agregada) | "el indicador que elabora JP Morgan" |
| "Ni 'según distintos medios'" (regla 3) | River en Junín |
| "Nunca 'todavía no se informó' algo que otra fuente sí informó" (regla 12) | VTV, las otras categorías |
| "Con dos fuentes o más que aportan datos distintos, usás el espacio" (regla 11) | El promedio plano de 117 palabras |
| "Usás un antecedente sólo si trata del mismo asunto" (regla 7) | La psíquica de animales |
| "Esta mañana", "esta madrugada" en la lista de prohibidas (regla 13) | Milei |
| "Los miles, con punto" (regla 14) | "4500", "100000" |

### 5.4 La salida con trazabilidad, y cómo la controla el verificador (fase 2, código)

```json
{
  "datos": [
    {"id": "D1", "fuentes": [1, 2, 4], "dato": "La tarifa básica pasa a $114.105,99 desde el jueves 15",
     "respaldo": "aumenta a $114.105,99 desde este jueves"},
    {"id": "D2", "fuentes": [1], "dato": "Las demás categorías se publicarán en vtv.gba.gob.ar",
     "respaldo": "serán informadas en las próximas horas"}
  ],
  "cuerpo": "…",
  "trazas": [{"inicio": "El Ministerio de Transporte bonaerense", "datos": ["D1", "D3"]}],
  "discrepancias": [],
  "aportes": [{"fuente": 2, "aporte": "El mecanismo del cálculo; mismo texto que publicaron otros dos medios."}]
}
```

Lo que el sistema puede controlar, sin otra IA y sin costo:

1. **El respaldo existe** en la primera fuente que lista el dato (comparando sin tildes ni mayúsculas, y tolerando
   una palabra distinta). Si no está, el dato se marca "sin respaldo" y las oraciones que dependen sólo de él se
   sacan, como hoy `depurarCuerpo`.
2. **Los números, nombres y días de cada dato están en sus fuentes**, no en "alguna". Es el mismo control de hoy,
   pero fuente por fuente.
3. **Cada oración del cuerpo** (encontrada por su `inicio`) sólo tiene números y nombres de las fuentes de sus datos.
   Si una oración dice "según un medio local" y sus datos tienen tres fuentes independientes, o dice un hecho sin
   atribuir y su dato tiene una sola fuente que no es oficial, se avisa en el registro (primero sólo aviso; rechazar
   después de medir).
4. **Los aportes los arma el código** con el inventario ("D1, D3, D5"), no los escribe la IA: el desplegable interno
   deja de tener relleno.
5. **Cobertura**: se calcula qué fuentes tienen un dato propio que no entró en el cuerpo. Es la medida de "¿fue una
   síntesis?". Al principio sólo se registra.
6. **Discrepancias**: los números de cada versión tienen que estar en su fuente. Una discrepancia sobre el dato del
   título, sin fuente oficial, puede frenar la nota para una persona (**decisión de los dueños**, § 9).

Si la IA no manda `trazas` o el inventario está mal armado, la nota se controla como hoy: nada se pierde.

### 5.5 Cómo se manejan las contradicciones

| Tipo | Ejemplo | Qué hace la nota | Dónde queda |
|---|---|---|---|
| Redondeo o forma | 17,56 % y "casi 18 %" | La versión más precisa | En ningún lado |
| Diferencia real, hay oficial | La Policía dice 3 heridos, un medio dice 5 | La oficial, atribuida | `discrepancias` + `noConfirmado` |
| Diferencia real, sin oficial | Un medio dice 19 h, otro 20 h | Las dos, atribuidas en general, o el dato afuera | `discrepancias` + `noConfirmado` |
| Actualización explícita | "En un nuevo parte…" | La más nueva, dicha como actualización | `discrepancias` |
| Uno afirma, otro duda | "Confirmado" contra "podría" | La más prudente | `noConfirmado` |
| Sobre el hecho central, sin oficial | Si hubo o no detenidos | La bajada dice que hay versiones, o se queda con lo común | Propuesta: espera a una persona (decisión) |

### 5.6 Copias y fuentes independientes

Contar voces y no medios cambia el **nivel de verificación** en algunas notas: dos copias de un mismo texto, sin
fuente oficial, pasarían de ALTA a MEDIA (y no cambia nada si hay oficial, como en Bilbao). Es más honesto, pero
puede frenar notas que hoy salen solas si además tienen una denuncia. **Decisión de los dueños**; mientras tanto se
puede calcular y mostrar en el panel sin que decida nada.

### 5.7 ¿Buscar más información en internet?

**Qué se ganaría**: contexto verificable (la inflación oficial del mes, el texto de una resolución del Boletín
Oficial, el dato del INDEC, la fecha de un antecedente que el sitio no publicó), y una segunda voz cuando un hecho
lo cuenta un solo medio.

**Qué ya existe**: `ingesta/busqueda.mjs` (Tavily, búsqueda "advanced" con el texto de cada página, 6 resultados, 30
días, sin redes sociales), usado por Pistas a pedido de una persona.

**Costos** (precios de Tavily consultados el 15/10/2026 en su documentación): plan gratis de 1.000 créditos por mes;
una búsqueda básica gasta 1 crédito y una "advanced" (la que usa hoy `busqueda.mjs`) gasta 2; pasado el plan, US$
0,008 por crédito; el plan "Project" es de US$ 30 por 4.000 créditos. Con ~46 notas por día (~1.400 por mes):

| Alcance | Búsquedas por mes | Créditos | Costo aproximado |
|---|---|---|---|
| Sólo notas de Balcarce y la zona (~8 por día) | ~240 | ~480 (advanced) | Dentro del plan gratis, si Pistas deja lugar |
| Todas, una búsqueda básica | ~1.400 | ~1.400 | ~US$ 3 por mes de excedente |
| Todas, advanced | ~1.400 | ~2.800 | ~US$ 14 de excedente, o US$ 30 del plan Project |

Más Gemini: unos 1.500 a 2.500 tokens más por pedido (gratis hoy, pero gasta cupo por minuto).

**Riesgos**, del más grave al menos:

1. **Mezclar otro hecho**: una búsqueda por "Milei empresarios" trae la charla de Mar del Plata de hace dos semanas.
   Con nombres comunes es fácil; el verificador no lo ve, porque el dato *sí* está en lo recibido.
2. **Datos viejos contados como nuevos** (la página dice "este jueves" y es de otro jueves).
3. **Fuentes malas**: granjas de contenido, notas escritas por IA, portales que copian; la búsqueda no distingue.
4. **Menores y víctimas**: más texto es más chance de que aparezca un nombre que no estaba en la noticia original.
   Todo lo que llegue tiene que pasar por el semáforo, como el texto completo hoy.
5. **Instrucciones escondidas** en las páginas ("ignorá las reglas…"): lo encontrado es dato, nunca instrucción.
6. **Copia y derechos**: más texto ajeno, más riesgo de frases copiadas.
7. **Transparencia**: si un dato sale de una búsqueda, esa página tiene que figurar en "Fuentes (N)" y la firma
   tiene que decirlo.

**Las reglas, si se hace**:

- La búsqueda la arma **el código**, no la IA: con el nombre del organismo y el tema, y **sólo en una lista cerrada
  de sitios** (`include_domains` de Tavily): `*.gob.ar`, `boletinoficial.gob.ar`, `indec.gob.ar`, `bcra.gob.ar`,
  `gba.gob.ar`, `balcarce.gob.ar`, el Concejo Deliberante y los medios del padrón de `FUENTES.md`.
- Lo encontrado llega como **CONTEXTO (C1, C2…)**, con fecha y sitio, y se trata como un antecedente: sólo en el
  cuerpo, las claves o "seSabe", dicho con su momento; **nunca en el título, la bajada, el guion ni el texto para
  redes; nunca el hecho central; nunca sobre una persona** (sólo cifras e instituciones).
- **No sube el nivel de verificación** (en el piloto) y, si contradice a las fuentes de la noticia, no se usa y se
  anota para una persona.
- **Nunca en Policiales, ni en notas amarillas o rojas, ni si toca menores o víctimas.** El texto encontrado pasa por
  el semáforo entero antes de llegar a la IA.
- Se verifica igual que todo: el respaldo del dato tiene que estar en ese texto.
- Va en "Fuentes (N)" con su enlace, y la firma suma "con datos de…".

**Evaluación**: con lo que hay hoy, **la búsqueda no es lo que falta**. En las seis notas, lo que se perdió ya estaba
en las fuentes que el sistema tenía (21 a 35 % aprovechado). Buscar afuera antes de usar lo de adentro suma costo y
riesgo para ganar poco. **Recomendación**: fase 3, piloto de un mes sólo en notas de Balcarce y la zona, sólo
contexto oficial, con los resultados guardados para revisarlos a mano, y adoptarlo sólo si en ese mes no aparece
ningún dato mezclado o viejo.

### 5.8 Lo que no cambia

| Regla dura | Cómo queda |
|---|---|
| Nunca identificar a un menor ni a una víctima | La regla del prompt, palabra por palabra, más "también si aparece en una sola fuente, un antecedente o el contexto". El semáforo sigue mirando todo lo que entra y todo lo que sale (y, con más textos, mira más) |
| Campillay | Palabra por palabra |
| No copiar (10 pedidas, 12 de corte) | Palabra por palabra, más la línea de no romper el sentido. El "respaldo" de 8 palabras no se publica y no pasa el límite |
| Lo que escribe la IA se verifica contra la fuente | Igual, y más fino (por fuente y por oración) |
| El nombre del medio nunca en título, bajada, guion ni redes | Igual |
| El nivel lo calcula el sistema; BAJA no sale sola | Igual (se saca `nivel` del pedido porque no decide nada) |
| Firma, Política y Policiales esperan a una persona en redes, sin cuerpo no se publica, lo humano manda | No se tocan |

---

## 6. Qué habría que cambiar en el código (para después, por fases)

**Fase 1 — dar bien la entrada (sin costo de cupo, riesgo bajo).** Todo con sus pruebas:

1. `quitarRepetidas` (`ingesta/lectura-ia.mjs`): juntar `origenes` además de `medios`.
2. `textoCompletoDe` (`reels/reescritura.mjs`): bajar hasta 4 textos (ya baja hasta 3 cuando falla la principal), y
   `entradaDe`: mandarlos todos, de ~2.500 caracteres cada uno, ordenados por oficial y por lo que aportan.
3. Marcar copias (tramos de cinco palabras en común > 50 %) y mandarlas como "publicada también por".
4. `ingesta/articulo.mjs`: descartar párrafos sin palabras fuertes del título; reintentar con Latin-1 si aparecen
   letras rotas.
5. `fuenteParaVerificar`: incluir todos los textos que recibió la IA (hoy, en Pistas, los otros no cuentan).
6. `antecedentesDe`: tema **y** palabras en común.
7. `reels/comparar-instruccion.mjs` o un script hermano: que use notas con sus `origenes` reales y el resumen del
   medio, no nuestra bajada (§ 7).

**Fase 2 — usar la trazabilidad (después de medir el prompt).** En `ingesta/verificar.mjs` y
`completarReescritura`: los seis controles del § 5.4, primero como aviso en el registro, después como rechazo. Los
aportes, armados por el código. La cobertura, en el registro de "Actualizar la web" y en el panel.

**Fase 3 — piloto de búsqueda** (§ 5.7), si los dueños lo aprueban.

---

## 7. Plan de medición

### 7.1 Por qué hoy no se midió

- **No hay clave**: en esta PC el `.env` tiene `GEMINI_API_KEY` vacío y no hay ninguna variable de Gemini cargada.
  No insistí.
- **El comparador no sirve para esto**: `reels/comparar-instruccion.mjs` arma las notas desde `portada.json` sin sus
  `origenes`, así que la IA recibe **una sola fuente**; y como "resumen de la fuente" le pasa **la bajada que ya
  escribió Radar Balcarce**. Medir síntesis con él daría lo mismo para cualquier prompt, y el verificador
  controlaría contra nuestro propio texto. Correr
  `node reels/comparar-instruccion.mjs actual docs/criterio/PROMPT-V2-CANDIDATO.txt` sirve sólo para ver que el
  candidato no empeora la forma (títulos, tildes, copia, relleno) en notas de una fuente.

### 7.2 Cómo medirlo bien (≤ 10 notas, ≤ 25 pedidos)

1. **Las notas**: 10 de `web/data/archivo.json` con 2 a 7 fuentes, de secciones distintas, que incluyan las seis
   del § 3 (tienen casos conocidos: copias, basura, letras rotas, dato práctico en otra fuente).
2. **La entrada**: para cada nota, bajar el texto de cada fuente de `fuentesConsultadas` (como hice para este
   informe) y armar `origenes` con medio, fecha, oficial y, como resumen, los primeros 280 caracteres del texto.
   Guardarlo una vez (así las dos versiones reciben exactamente lo mismo).
3. **Las corridas** (con `usarReglasDePrueba` y `reescribir` + `verificar` de producción, un pedido cada 5
   segundos):
   - A: prompt actual, entrada de hoy (1 texto completo). 10 pedidos.
   - B: prompt candidato, entrada de hoy. 10 pedidos.
   - Quedan 5 pedidos para las correcciones (el segundo intento), o para C: candidato con la entrada de la fase 1
     (hasta 4 textos) en 5 notas.
4. **Qué se mide**, por versión:

| Medida | Cómo | Para adoptar |
|---|---|---|
| Notas con cuerpo que pasa el verificador | Igual que hoy | No peor que A |
| Rechazos por tipo (copia, número, nombre, fecha, localía, tildes) | El registro | No peor que A en ninguno |
| **Cobertura**: de los datos propios de cada fuente (marcados a mano antes de correr, 3 a 6 por nota), cuántos entran en el cuerpo | Lectura | B mejor que A; C mejor que B |
| Datos inventados o mal atribuidos | Lectura, oración por oración | Cero |
| Discrepancias sembradas (2 notas con una diferencia real entre fuentes) | Lectura | Detectadas y bien contadas |
| Respaldo encontrado tal cual en la fuente | Script | ≥ 80 % de los datos |
| Trazas que coinciden con las oraciones | Script | ≥ 80 % |
| Palabras del cuerpo con 1 fuente y con 3+ | Conteo | Que crezca con las fuentes, sin relleno |
| Tokens de entrada y salida | `usageMetadata` (ya se guarda en `web/data/uso-ia.json`) | Informativo |

5. **Lectura a mano** (Hernán o Andrés): las 10 notas de A y de B, de a pares, sin saber cuál es cuál, con tres
   preguntas: ¿está todo lo importante?, ¿hay algo que no dice ninguna fuente?, ¿se entiende sin leer nada antes?
6. **Si B gana o empata**, una semana en "sombra": la corrida escribe con los dos prompts las primeras 10 notas de
   2+ fuentes del día, publica la de siempre y guarda la otra para leerla. Después se decide.

### 7.3 Lo que puede fallar del candidato (antes de medir, para mirarlo)

- **Es más largo de responder**: el inventario con respaldo y las trazas suman unos 300 a 600 tokens de salida y más
  tiempo; `gemini-flash-lite` podría cortar el JSON o pasarse del minuto de espera (`ESPERA_MAXIMA_GEMINI`).
- **El respaldo literal** puede empujar a copiar más en el cuerpo (la IA tiene la frase de la fuente a la vista).
  Mirar los rechazos por copia.
- **"Usás el espacio" puede inflar**: cuerpos más largos con datos menores. Mirar relleno y la lectura a mano.
- **Más reglas sobre fuentes, menos atención a la forma**: el 29/09 un cambio de reglas movió cuántas notas sacaban
  cuerpo y el borrador del 11/10 no mejoró al actual. Puede pasar de nuevo.
- **Con la entrada de hoy el candidato rinde poco**: si la IA sigue recibiendo 280 caracteres de las otras fuentes,
  el inventario no tiene de dónde sacar. Lo esperable es que B mejore poco sobre A y que la diferencia grande
  aparezca en C.
- **Las trazas por "inicio"** pueden no coincidir si la IA cambia la oración después de escribir la traza.

---

## 8. Recomendación

1. **Primero la entrada (fase 1)**: es lo que más se nota y no gasta cupo ni cambia el criterio. Empezar por
   `quitarRepetidas` (una línea) y los textos de varias fuentes.
2. **Después medir el candidato** como dice el § 7.2, con la clave de redacción en la PC o en un workflow a mano.
   Adoptarlo sólo si no empeora en nada; si empata, igual conviene (es más corto y deja la trazabilidad lista).
3. **Recién ahí la fase 2** (control por fuente y por oración), primero como aviso.
4. **La búsqueda en internet, no por ahora** en la redacción automática; piloto acotado más adelante si los dueños
   quieren.

## 9. Preguntas para Hernán y Andrés

1. ¿Dos medios con el mismo texto cuentan como uno para el nivel de verificación? (Puede frenar algunas notas.)
2. ¿Una diferencia entre fuentes sobre el dato del título, sin fuente oficial, frena la nota para una persona?
3. ¿Se autoriza gastar hasta 25 pedidos de la clave de redacción para medir (§ 7.2)?
4. ¿Piloto de búsqueda en la fase 3, sólo para lo de Balcarce y sólo con sitios oficiales? ¿Con qué tope de gasto?
5. ¿Las notas con varias fuentes pueden ser un poco más largas (sin pasar de 180 palabras) si las fuentes dan datos
   distintos? (Va en línea con lo que Andrés decidió el 11/10 sobre el largo según las fuentes.)

---

## 10. Entrada ampliada: lo implementado

*15/10/2026. Regla 174 de `docs/10-REGLAS-Y-PRUEBAS.md`; prueba `pruebas/entrada-ampliada.test.mjs` (22 pruebas, en
el núcleo legal). **El prompt de redacción (`CRITERIO-EDITORIAL.md` § 12) no cambió.** No se llamó a ninguna IA ni a
ninguna API: todo está probado sin red, con los casos del § 3 armados a mano.*

### 10.1 Qué cambió

| # | Problema (§ 4) | Qué hace ahora | Dónde |
|---|---|---|---|
| 1 | P3: al unir repetidas se sumaban medios y no fuentes | `quitarRepetidas` suma también los `origenes` (con resumen y enlace) y `fuentesTexto`; sin repetir un enlace, la principal primero. Una nota vieja sin fuentes queda como estaba | `ingesta/lectura-ia.mjs` |
| 2 | P1 y P2: un solo texto completo, el de la primera publicada | Se intenta bajar el texto de hasta **6** fuentes (la principal siempre, las oficiales antes que el resto) y van a la IA hasta **4** textos completos. Para la IA, la **Fuente 1 es la más completa**: la oficial con texto, después la de más texto útil, después la que más palabras nuevas suma; un texto que no agrega ninguna palabra nueva no se manda | `textosDeLasFuentes` (`reels/reescritura.mjs`), `armarFuentesParaLaIA` (`ingesta/fuentes-para-la-ia.mjs`) |
| 3 | Topes | **4.000** caracteres por texto (el de siempre) y **12.000** entre todos, repartidos: con cuatro textos largos, 3.000 cada uno; lo que un texto corto no usa lo usan los largos. Más de **12** fuentes: las demás van nombradas, sin número ni resumen | `REESCRITURA` (`ingesta/criterio.mjs`) y la tabla de `CRITERIO-EDITORIAL.md` |
| 4 | P4: copias contadas como confirmaciones | Dos fuentes **con texto completo** que comparten **50 %** o más de sus tramos de cinco palabras son copia. La copia va numerada como «mismo texto que la Fuente N» y no se repite su texto (si agrega párrafos propios, va sólo eso: «Lo que agrega la Fuente N»). **Para el nivel de verificación, un grupo de copias es una voz**: si tiene una oficial, cuenta la oficial y ningún medio del grupo (Bilbao: «Sale de una fuente oficial»); si no, un solo medio (VTV: «dos medios», no «cuatro») | `mediosQueNoCuentan`, `contarFuentes`, `nivelDeVerificacion` |
| 5 | P5: basura y letras rotas | Letras rotas arregladas cuando tienen arreglo seguro («ReuniÃ³n» → «Reunión»; la página en Latin-1 se lee como Latin-1, la misma regla que ya tenían los feeds); los párrafos con rombos («Econom�a») afuera y, si son más de la mitad, el texto entero (Crónica). Pies de nota afuera («Leé también», «Mirá también», «Fuente:», «Suscribite»…). Párrafos de otra nota de la página afuera (0221 y la VTV) | `limpiarTextoBajado`, `repararCodificacion`, `decodificarPagina` y `RUIDO` (`ingesta/articulo.mjs`) |
| 6 | El verificador y el semáforo | El verificador controla contra **todo lo mandado** (los resúmenes de las que no son copia, todos los textos, lo que agrega cada copia): un dato de la Fuente 3 ya no es «inventado» y la regla de copia vale contra cualquier fuente. En Pistas, los textos de las otras páginas también cuentan (antes no). El semáforo mira **cada** texto mandado y los resúmenes de todas las fuentes | `fuenteParaVerificar`, `semaforoDeLaReescritura`, `panel/reescribir-una.mjs` |

Cómo se ve lo que recibe la IA (VTV, armado en la prueba):

```
FUENTES (4, numeradas; las 3 y 4 repiten el texto de otra y no son confirmaciones independientes):
Fuente 1 (El Diario Balcarce · publicada el jueves 15/10/2026 · su texto completo va abajo): …resumen…
Fuente 2 (0221 · publicada el jueves 15/10/2026 · su texto completo va abajo): …resumen…
Fuente 3 (Agencia DIB · publicada el jueves 15/10/2026): mismo texto que la Fuente 1; es una copia, no una confirmación independiente.
Fuente 4 (La Verdad · publicada el jueves 15/10/2026): mismo texto que la Fuente 1; es una copia, no una confirmación independiente.
Texto completo de la Fuente 1 (El Diario Balcarce, publicada el jueves 15/10/2026; la que más datos trae):
…
Texto completo de la Fuente 2 (0221, publicada el jueves 15/10/2026):
…(sin los dos párrafos de otras notas)…
Lo que agrega la Fuente 4 (La Verdad; el resto es el mismo texto que la Fuente 1):
…
```

Lo que **no** cambió, a propósito:

- La dirección, el identificador y la «principal» de la nota para la web siguen siendo los de la ingesta (una nota
  tiene una sola dirección). Lo que cambia es sólo el orden en que la IA lee las fuentes.
- «Fuentes consultadas» sigue en el orden de la ingesta: la IA numera a su manera y el código traduce cada aporte a
  su medio. Lo ya publicado en `archivo.json` se lee y se revalida igual (lo controla una prueba con las notas reales).
- Los textos de las fuentes no llegan a la web: viajan sólo en la memoria de la corrida.
- Una nota armada a mano con un solo `textoDeLaFuente` (el panel de la PC, `pruebas-modelos/`) se sigue armando como
  antes (`entradaDe`); `textoCompletoDe` queda para el panel de la PC.

### 10.2 Cuánto más cuesta

Estimado sobre las 1.008 notas automáticas de `web/data/archivo.json` (cuántas fuentes tiene cada una) y con lo que
dio el § 3 (unos 2.500 caracteres útiles por texto bajado, que se baja el 85 % de las veces):

| Fuentes de la nota | Notas (hoy) | Caracteres de más, en promedio |
|---|---|---|
| 1 | 36 % | 0 (no cambia) |
| 2 | 19 % | ~1.800 |
| 3 | 14 % | ~3.900 |
| 4 | 11 % | ~6.000 |
| 5 o más | 19 % | ~6.200 (con el tope de 12.000 y sin las copias) |

- **Por nota**: unos **2.700 caracteres más en promedio** con las fuentes de hoy, y unos **3.700** si se cuentan las
  que ahora suma la unión de repetidas (hasta hoy, el 43 % de las notas tenía más medios que fuentes). Con unos 4
  caracteres por token, son **~700 a ~950 tokens más por pedido**; el máximo, en una nota con muchas fuentes, es de
  unos **2.000 tokens más** (8.000 caracteres sobre los 4.000 de hoy, más algún resumen). El pedido de hoy tiene unos
  6.000 a 6.500 tokens con esa misma cuenta (las reglas solas son 20.171 caracteres): es un **+12 a +15 % en
  promedio** y hasta un +30 % en la nota más cargada. Las copias que ya no se repiten y las fuentes de más de 12 que ya
  no llevan resumen compensan un poco. (El primer registro de `web/data/uso-ia.json`, del 15/10, da 19.877 tokens de
  entrada en 3 llamadas, ~6.600 por llamada: coincide con esa cuenta.)
- **Por día**, con ~46 notas: **~32.000 a ~44.000 tokens más**; contando el segundo intento con corrección (que manda
  la misma entrada, ~1 de cada 3 notas), **~45.000 a ~60.000**. Los tokens de salida no cambian (no se pide nada
  nuevo).
- **En plata**: hoy **cero** (las cuatro claves son gratis desde el 29/09). El cupo por minuto de `flash-lite` gratis
  sobra para esto (un pedido de ~8.500 tokens cada pocos segundos). Si algún día se paga, a los precios de
  `flash-lite` son centavos de dólar por mes (~1,5 a 2 millones de tokens de entrada).
- **Medirlo de verdad**: `web/data/uso-ia.json` ya anota los tokens de entrada de cada día (regla 170). Conviene
  comparar el promedio por llamada de la semana anterior con el de la siguiente.
- **Red**: hasta 6 páginas por nota en vez de 1 (o 4 si fallaba la principal), todas a la vez y con el mismo límite
  de 8 segundos: la corrida tarda un poco más en las notas con muchas fuentes; nada más.

### 10.3 Riesgos

1. **El nivel de verificación puede bajar** en notas que hoy salen solas: dos medios con el mismo texto, sin fuente
   oficial, pasan de ALTA a MEDIA; MEDIA sale igual, pero si además se apoya en una denuncia es BAJA y espera a una
   persona. Es la pregunta 1 del § 9: **se implementó porque se pidió en la tarea**; si Hernán y Andrés prefieren lo de
   antes, alcanza con no pasar `noCuentan` en `completarReescritura` (una línea). Para no equivocarse de más, la copia
   se decide sólo con los dos textos completos, nunca con dos resúmenes de feed.
2. **La regla de los párrafos de otra nota es una heurística**: está hecha para sacar poco (nunca el primer párrafo,
   nunca más de la mitad, y queda todo párrafo que comparta una raíz, una sigla o una cifra con la nota, o que siga a
   alguien de ella). Puede dejar pasar basura; es difícil que saque un dato bueno, pero no imposible.
3. **Más texto para el verificador también es más texto para «aceptar»**: un número que está en cualquier fuente
   pasa, aunque la oración lo atribuya mal. Es el límite de hoy (§ 2.3), un poco más ancho. Lo arregla la fase 2.
4. **El prompt sigue diciendo «el texto completo, que es donde está la mayor parte de los datos»** (§ 12, regla 4), en
   singular: con varios textos, la IA puede seguir apoyándose en el primero. Por eso la Fuente 1 es ahora la más
   completa. El candidato lo cambia; hay que medirlo (§ 7).
5. **Más texto ajeno, más chance de copiar**: el límite de copia sigue igual y ahora se mide contra todas las fuentes.
   Mirar los rechazos por copia en el registro las primeras semanas.
6. **Efectos de sumar las fuentes de las repetidas, fuera de la redacción**: la fecha de la nota es la más vieja de
   sus fuentes (`fechaDeLaNota`, `web/lib/archivo.js`), así que una nota que suma una repetida más vieja **envejece**
   (lo que pide la regla: nunca rejuvenece; y si el hecho tiene más de 12 horas y nunca salió, no se estrena, como con
   el cruce). «Fuentes (N)» muestra también las fuentes sumadas (como ya pasa con las notas que se unen después de
   publicadas, regla 171), y la búsqueda de fotos tiene más páginas donde mirar (con las mismas reglas de siempre). Si
   la IA de repetidas junta mal dos notas, ahora el error se nota más.

### 10.4 Lo que sigue como propuesta

- El **prompt candidato** (`PROMPT-V2-CANDIDATO.txt`) y su medición (§ 7): con esta entrada ya se puede hacer la
  corrida C.
- La **fase 2** (inventario, trazas, control por fuente y por oración, aportes armados por el código, cobertura).
- **Antecedentes más estrictos** (tema **y** palabras, punto 6 del § 6) y el **comparador** que use las fuentes reales
  (punto 7): no se tocaron.
- Que la copia por **resúmenes** cuente (hoy no, a propósito) y que las copias vayan juntas en un solo renglón
  («publicada también por…») en vez de numeradas.
- La **búsqueda en internet** (fase 3).
