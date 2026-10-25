# Etapas 2 a 5 · Entrada, duplicadas, clasificación y puntaje: cómo anda hoy, qué falla y qué se puede elegir

*Medido el 15/10/2026 en la PC, sólo leyendo. No se tocó el motor (`ingesta/`, `web/`), ni las fuentes, ni
nada de `docs/` fuera de esta carpeta. Nada de esto está decidido: cada regla de hoy es evidencia, no una
decisión (pedido de Andrés y Hernán del 15/10: "re-pensar todo el modelo de búsquedas, puntajes y
semáforos", "no arrastrar nada viejo", "elegir el mejor modelo, no el más barato").*

*17/10/2026: `medir-etapas.mjs` y sus planillas (`duplicadas-publicadas.csv`, `lecturas-por-grupo.csv`, `ruido-publicado.csv`, `medidas.json`) se borraron en la limpieza final (eran de una sola medición; quedan en el historial de git). Los resultados son los de este documento.* Los pares etiquetados a mano y el calibrador siguen, en `scripts/medir/` (`etiquetas-duplicadas.json`, `calibrar-repetidas.mjs`).

## Cómo se midió y cómo repetirlo

    node docs/etapa-2-5/medir-etapas.mjs

El script sólo lee `web/data/` (archivo de notas, histórico, estadísticas, fichas de la IA, correcciones,
unidas, portada) y las listas de fuentes. Escribe únicamente en esta carpeta:

| Archivo | Qué tiene |
|---|---|
| `medidas.json` | todas las cifras de este documento |
| `lecturas-por-grupo.csv` | visitas por nota, cortadas por lugar, sección, tipo, cantidad de medios, si fue a redes |
| `duplicadas-publicadas.csv` | los 127 pares de notas publicadas que se parecen (0,45 o más) |
| `scripts/medir/etiquetas-duplicadas.json` | cuáles de esos pares son de verdad el mismo hecho (los leyó Claude uno por uno) |
| `ruido-publicado.csv` | títulos publicados que parecen ruido (búsqueda por palabras, con falsos avisos) |

**Tres advertencias que valen para todo el documento:**

1. **Las visitas son pocas.** Las estadísticas por nota existen desde el 29/09; hay 13 días con datos
   (el 9/10 y del 13 al 15/10 la medición vino vacía: es una falla de la medición, no gente que no
   entró). En la ventana justa (notas publicadas del 29/09 al 12/10) son **716 notas y 841 visitas**.
   El 74 % de las notas no tuvo ninguna visita y el 10 % más leído se llevó el 69 % de las visitas.
   Alcanza para ver diferencias grandes (de acá contra de afuera), no para afinar puntos sueltos.
   Todo lo que dependa de esto queda **NO VERIFICADO** como tendencia hasta tener un par de meses.
2. **Facebook manda en las visitas** (523 de 709 visitas con origen conocido; Google, 7). Lo que fue a
   las redes se lee mucho más **porque fue a las redes**: una nota de acá que fue a Facebook tuvo 5,8
   visitas; una de acá que no fue, 1,2. Para no confundir "lo que interesa" con "lo que se posteó",
   los pesos de la Etapa 5 se calculan también **sin** lo que fue a redes.
3. **`web/data/vistas.json` no son visitas**: guarda la primera vez que el robot vio cada nota (sirve
   para las fechas). Las visitas están en `web/data/estadisticas.json` (`dias[día].notas`).

Lo que se clasifica "por palabras" en el script (tipo de nota, ruido) es una aproximación para medir; no
se propone como regla.

---

## Etapa 2 · Entrada y limpieza

### (1) Cómo funciona hoy

Por día entran unas **2.350 notas crudas** de los feeds (`pruebas-modelos/auditoria-feeds.md`); después de
los filtros por código quedan unas **900** (`pruebas-modelos/TRASPASO.md`). Los filtros, en orden:

1. **Por código, antes de todo** (`motivoDeDescarte`, `ingesta/ingesta.mjs`): lotería y quiniela (salvo
   que nombre Balcarce), horóscopo por el título, y la sección que el propio diario pone en la dirección
   (`/mexico/`, `/mundo/`, `/policiales/`, `/recetas/`…, en `SECCIONES_QUE_NO_ENTRAN`). Los medios de
   Balcarce no pasan por acá: de ellos entra todo.
2. **Repetidos del mismo medio**: medio + título normalizado (un hash simple).
3. **El cruce** deja afuera lo de afuera contado por un solo medio y lo que cuentan sólo medios de la
   región (ver Etapa 3).
4. **Policiales de afuera** (`esPolicialDeAfuera`): fuera.
5. **Semáforo por palabras** (`REGLAS_SEMAFORO`): rojo (menores, abuso, femicidio…: ley 26.061 y
   26.485), "nunca" (sepelios), efemérides de otros medios, amarillo (denuncia, detenido, niño…),
   cotización del dólar, internacional, promoción.
6. **La ficha de la IA** (Gemini Flash-Lite, 12 notas por pedido, `aplicarFichas` en
   `ingesta/lectura-ia.mjs`) saca publicidad, chimento, extranjero sin conexión argentina y lo de
   "impacto nulo"… salvo que se cumpla `nacionalQueImporta` (3 medios o más, o importancia alta, o razón
   nacional/popular/servicio).

**Ejemplo real 1 (lo que el filtro frena bien):** "Horóscopo de hoy Sagitario: las predicciones para este
10 de octubre" (Canal 26) cae en el paso 1 por `TITULO_HOROSCOPO`. En la prueba de 200 notas crudas, las 20
notas de ruido garantizado (horóscopo, loterías, chimentos, policiales de afuera, extranjero) no las dejó
pasar ni Gemini ni Mercury (`pruebas-modelos/comparacion-200.md`).

**Ejemplo real 2 (lo que se cuela): `1cv9j22`**, "Presentan un videojuego en Formosa donde un superhéroe
pelea contra un león" (14/10, sección Argentina).
- Entra: ningún filtro de código la toca (no es lotería, ni horóscopo, ni sección prohibida).
- Cruce: 8 medios (La Nación, Perfil, NA, El Marplatense, El Eco de Tandil, Clarín…). Pasa.
- Sección por palabras: Argentina (ninguna palabra encaja). Semáforo: verde (8 medios, Argentina pide 3).
- **Ficha de la IA: `impacto: nulo`, `razon: ninguna`, `importancia: baja`.** Es decir, la IA dijo
  correctamente que no le importa a Balcarce.
- Pero `aplicarFichas` no la saca: como la cuentan **3 medios o más**, es "nacional que importa". Se
  publicó en la portada con relevancia 66, **por encima** de dos notas de Balcarce que estaban en 63.
- Lo mismo pasó el mismo día con `55gw7p`, "Una psíquica de animales revela detalles sobre su vínculo con
  Javier Milei" (6 medios, ficha "nulo/ninguna/baja").

### (2) Qué falla hoy (medido)

- **Ruido publicado y revisado a mano: 21 notas, las 21 siguen en el archivo, con 0 visitas**
  (`medidas.json` → `ruido.aMano`): 4 cotizaciones del dólar (la última, `1e8rdd4`, del 9/10), 2
  publicidades (`q7bxgi`, On City y el Día de la Madre, del **14/10**; `1saujqk`, descuentos de un comercio
  local), 4 chimentos (`r7245w` Wanda Nara, `u1zabu` Pergolini y su rating, `uknghh`, 38 medios, `18ck224`),
  6 curiosidades (el gallo bataraz **publicado dos veces**: `5exxou` y `1ijfhpo`; la chocotorta en un
  ranking; la casa con parabrisas; el videojuego; la psíquica), 2 consejos de huerta en Agro (`1q4j7p`,
  `qsc6ig`) y 3 pronósticos del tiempo de otros medios (`fa17ki`, `i06m20`, `vqv317`; el sitio ya tiene
  su propio clima). Sobre ~1.330 notas de medios es poco (1,6 %), pero **sigue pasando** (cuatro son del
  13 y 14/10) y es lo que más se nota como "esto no es un diario de Balcarce".
- **La causa principal no son las palabras sino una regla**: "3 medios o más" rescata cualquier cosa,
  aunque la IA diga que no tiene relación. Lo viral lo cuentan muchos medios justamente por viral.
- **La IA ya ve el ruido**: en las 2.220 fichas de los últimos 3 días marcó 137 chimentos (6 %) y 18
  publicidades; 61 % con impacto "nulo". Lo que falta es un campo **tipo de nota** (curiosidad, consejo,
  opinión, pronóstico, cotización) y que ese campo no lo pueda pisar la cantidad de medios.
- Las listas de palabras siguen teniendo agujeros conocidos ("dólar mayorista finaliza la semana" no dice
  "dólar hoy"). Sumar palabras para siempre es arrastrar parches.

### (3) Opciones

| | A. Código para lo seguro + campo `tipo` del modelo | B. Que entre todo y decida el modelo | C. Sólo código, con más listas |
|---|---|---|---|
| Qué es | El código sigue frenando lo que es seguro y barato (lotería, horóscopo, secciones de la dirección, el semáforo legal, el hash de repetidos). El modelo de decisiones devuelve `tipo` (hecho, servicio, anuncio, declaración, opinión, análisis, curiosidad, consejo, chimento, publicidad, en vivo, cotización, pronóstico) y los tipos "no entran" se descartan **aunque los cuenten 20 medios** | Sin filtros de dirección ni de palabras salvo el semáforo legal; las 2.350 notas diarias van al modelo | Ampliar `TITULO_*` y `SECCIONES_QUE_NO_ENTRAN` con lo que se coló |
| Costo | ya incluido en la clasificación de la Etapa 4 (~US$ 0,9 a 1,8 por mes) | +US$ 1,5 por mes (2.350 en lugar de 900 notas al modelo; `TRASPASO.md`: ~US$ 2,4 en total) | US$ 0 |
| Riesgo | bajo: si el modelo falla, queda el filtro de código como hoy | medio: más notas al modelo = más errores posibles; se pierde la red barata | alto a la larga: es lo que se viene haciendo y se sigue colando |
| Decisión humana | qué tipos nunca entran, cuáles esperan, cuáles pasan | lo mismo | qué palabras sumar |

### (4) Recomendación

**A.** Código para lo que es seguro (y gratis), modelo para "qué tipo de nota es", y una regla nueva: **la
cantidad de medios ordena, nunca rescata un tipo excluido ni un "interés nulo"**. El semáforo legal (rojo,
nunca, menores) queda en código como red de seguridad y la IA sólo puede endurecer, nunca destrabar.

### (5) Preguntas para Andrés y Hernán

1. De estos tipos, ¿cuáles **nunca** entran, cuáles **esperan** a una persona y cuáles **pasan**? Propuesta
   para discutir: nunca = chimento, publicidad, consejo, curiosidad sin efecto acá, en vivo, cotización,
   pronóstico de otro medio; esperan = promoción (sorteos), opinión firmada de un vecino; pasan = hecho,
   servicio, anuncio, declaración, análisis con datos.
2. **Opinión y análisis** de los diarios nacionales: ¿no entran nunca, o un análisis con datos sí?
3. **Policiales de afuera**: hoy no entran nunca (ni para mirar). ¿Sigue así?

---

## Etapa 3 · Duplicadas (misma nota o mismo hecho)

### (1) Cómo funciona hoy

Tres capas, ninguna con memoria de lo ya publicado de Balcarce:

1. **El cruce** (`agruparPorHecho`, `ingesta/cruce.mjs`): compara palabras (título doble + 400 caracteres;
   TF-IDF y coseno) y une con 0,42 o más, **encadenando** (A con B y B con C = un grupo). La memoria de 36
   horas guarda **sólo lo de afuera**: lo de los medios de Balcarce de la corrida anterior no se compara.
2. **`agruparRepetidas`** (Gemini): mira juntas las notas que van a salir **en esta corrida** y agrupa las
   que cuentan el mismo hecho. No compara contra el archivo de lo ya publicado.
3. **`web/lib/repetidas.js` y `sinNotasRepetidas`**: si la misma noticia vuelve con otra dirección, la
   une y redirige; en las listas no conviven dos títulos casi iguales. Desde el 29/09 se unieron así
   **96 notas ya publicadas** (`fusionadas.json`): son repetidas que salieron y se arreglaron después.

**Ejemplo real 1 · La Liga suspende la fecha (3/10).** `1gq0pia` "La Liga Balcarceña suspende toda la
fecha del fútbol local" (Puntonueve, sección Balcarce, 22:24) y `158gkt0` "La Liga Balcarceña de Fútbol
suspende la fecha por el estado de las canchas" (Infórmese Primero + Acción 5, sección **Fútbol**, 22:52).
Salieron las dos, en dos secciones distintas. El cruce no las unió (los títulos comparten pocas palabras
"raras") y la IA de repetidas no las vio juntas o no las agrupó. Una tuvo 13 visitas (fue a Facebook),
la otra 2.

**Ejemplo real 2 · Jardín 905 (6 y 7/10).** `15imf6x` "Suspenden clases en el Jardín 905 por el robo de
caños de gas" (Infórmese, Radio Gabal y La Vanguardia; **Policiales**; 6/10 12:30) y, 27 horas después,
`ccot62` "El Jardín 905 suspende las clases tras el robo de caños de gas" (La Vanguardia; **Balcarce**;
7/10 16:01). ¡La Vanguardia está en las dos! Como la memoria del cruce no guarda lo de acá y las repetidas
sólo miran la corrida, la nota del día siguiente salió como nueva.

### (2) Qué falla hoy (medido)

Se compararon las 1.329 notas de medios publicadas (archivo + histórico), de a pares a menos de 72 horas,
y Claude leyó los 127 pares con parecido 0,45 o más (`scripts/medir/etiquetas-duplicadas.json`):

| | Cantidad |
|---|---|
| Pares que son **el mismo hecho** | **84** (más 25 dudosos y 18 que no) |
| Notas involucradas / historias detrás | 140 notas / 64 historias |
| **Copias de más publicadas** | **76** (cota baja: sólo se miraron los pares 0,45+) |
| …de ellas, **de Balcarce** | **57** (el 8,7 % de las 658 notas de acá publicadas) |
| Pares confirmados en **secciones distintas** | 21 |
| Pares confirmados con **más de 12 horas** entre una y otra | 32 |

Casos: la carrera homenaje a Luis Vildoza (3 veces), Ariel Bilbao árbitro en los Suramericanos (4),
nadadores de la EMDAB (4), Kevin Gómez campeón (3), Shalom Lescano (3, una en **Agro**), el autódromo
reinaugurado (varias), Petruccelli y los celíacos (3), Toyota y el RIGI en Economía y en Automovilismo,
YPF 1 % (una marcada "de Balcarce"), las entradas para la despedida de Messi (Deportes y Fútbol).

Precisión del parecido por palabras (lo que hace hoy el cruce): de 0,70 para arriba, 22 de 26 pares son el
mismo hecho; de 0,55 a 0,70, 33 de 46; de 0,45 a 0,55, 29 de 55. **Por palabras solas no alcanza**: o se
juntan cosas distintas o se escapan las mismas noticias con otro título. La prueba con embeddings +
confirmación de Mercury + agrupación en estrella bajó 27 % las historias repetidas y las notas de Balcarce
de 75 a 56 (`pruebas-modelos/historias-estrella.md`); en 62 pares etiquetados, Mercury acertó 95 %.

**Lo que más importa**: el problema es sobre todo **de Balcarce** (ahí no hay filtro de cantidad de medios)
y **entre corridas** (la nota de mañana contra la de hoy), justo lo que el diseño actual no mira.

### (3) Opciones

| | A. Significado + confirmación + estrella, contra lo publicado | B. Igual, pero confirma un modelo de chat chico | C. Sólo código mejorado |
|---|---|---|---|
| Qué es | Cada nota nueva se convierte en una huella (embedding `bge-m3`) y se compara con las "anclas" abiertas de las últimas 72 h **incluidas las ya publicadas y las de Balcarce**; los pares de 0,75+ los confirma Mercury Decide de a 12; sólo se une lo confirmado contra el ancla (sin encadenar) | Lo mismo, con Haiku-class como juez de cada par | Hash de enlace y de título, TF-IDF con memoria también para lo de acá y umbral más alto |
| Costo por mes | < US$ 1 (embeddings ~US$ 0,1; confirmaciones ~US$ 0,5) | ~US$ 2 a 4 | US$ 0 |
| Evidencia | probada con 4.477 notas y 62 pares | no probada para pares | la medida de arriba: se escapan o se mezclan |
| Riesgo | bajo: si no ve una, sale repetida como hoy; si junta de más, se pierde una nota (1 error grave en 62) | similar, más caro | alto: es lo de hoy |
| Decisión humana | ventana (72 h), qué hacer con una actualización | igual | umbrales |

### (4) Recomendación

**A**, con tres agregados que salen de esta medición:
1. **Comparar contra lo ya publicado** (las últimas 72 h del archivo), no sólo contra la corrida.
2. **Lo de Balcarce, más estricto**: los pares de acá entre 0,60 y 0,75 también van a confirmar (ahí se
   escaparon casi todas: Vildoza, Bilbao, la EMDAB), y si Mercury duda (0,2 a 0,8), opina un segundo
   modelo (Jev).
3. **Una noticia, una sección**: la que queda manda; la otra suma su medio como fuente.
En código quedan el hash de enlace y de "medio + título" (gratis, seguro) y la agrupación en estrella.

### (5) Preguntas para Andrés y Hernán

1. **Una actualización** ("suspenden clases" → "reanudan clases"; "anuncian" → "se hizo"): ¿nota nueva con
   la anterior como antecedente (propuesta: sí, si cambia el hecho), o se actualiza la nota que ya salió?
2. Cuando llega un medio nuevo a una historia ya publicada: ¿sólo se suma a "Fuentes (N)" (propuesta) o la
   nota vuelve a subir en la tapa?
3. ¿72 horas de ventana para buscar repetidas les parece bien? (Con 36 se escaparon 32 pares de más de 12
   horas; varios de 40 a 70 horas.)

---

## Etapa 4 · Clasificación: sección, lugar y tipo

### (1) Cómo funciona hoy

1. **Por palabras** (`clasificar`, `ingesta/ingesta.mjs`): Automovilismo gana siempre si hay una palabra
   firme; si el feed tiene sección fija, se le cree; si no, gana la palabra más larga de `REGLAS_SECCION`,
   y las débiles (`PALABRAS_DEBILES`: partido, gol, copa, rural…) sólo deciden desde el título. Sin
   palabra: Balcarce si es de un medio de acá; si no, Argentina.
2. **"De acá"** con tres campos (`local`, `deLaZona`, `nombraBalcarce`) y una función (`esDeAca`).
3. **La ficha de la IA** cambia la sección, salvo dos excepciones: no deja poner "Balcarce" a lo que no
   es de acá (queda la sección de palabras) y pasa "Argentina" a "Balcarce" si es de acá.

**Ejemplo real 1 · `1b4z7qp`** "El Ministerio de Transporte bonaerense actualiza la tarifa básica de la
VTV" (15/10, 15 medios, entre ellos El Diario Balcarce y La Vanguardia). La IA hizo bien su trabajo:
`ambito: provincia, impacto: directo, razon: servicio, importancia: alta`, "afecta el costo de la VTV para
todos los conductores… incluido Balcarce". Pero eligió la sección "Balcarce", la regla no se lo permite a
lo que no es local, y quedó la de palabras: **Política**. Es un servicio que le cambia algo al vecino y
terminó en la sección que menos se lee de afuera. Lo mismo, el mismo día: `5biv0y` (ARCA, recibo de
sueldo de casas particulares) y `sklj66` (ARBA, vence el Inmobiliario). Son las **3 únicas** diferencias
entre la ficha y la sección publicada en los últimos 3 días, y las tres por la misma regla.

**Ejemplo real 2 · Toyota y el RIGI (30/09).** `vp5l7j` en Economía (10 medios) y `1ugpk62` en
**Automovilismo** (Clarín y El Día), a la misma hora: "Automovilismo gana siempre" por la palabra "autos";
Automovilismo pide sólo 2 medios, así que salió dos veces y en dos secciones.

### (2) Qué falla hoy (medido)

- **Lo de acá está repartido**: de 658 notas de acá publicadas, **444 (67 %) no están en la sección
  Balcarce** (Deportes 123, Automovilismo 114, Política 67, Cultura 57, Agro 38, Policiales 24…). El vecino
  no tiene un lugar con "todo lo de acá"; la sección Balcarce mezcla "lugar" con "tema".
- **La sección sola no dice si interesa; el lugar sí.** Visitas por nota (ventana 29/09 a 12/10):

| Sección | De acá | De afuera |
|---|---|---|
| Automovilismo | 4,0 (13 notas) | 0,93 (30) |
| Deportes | 3,1 (44) | 0,29 (17) |
| Balcarce | 2,7 (95) | — |
| Agro | 2,4 (15) | **0,03 (40)** |
| Cultura y agenda | 2,0 (29) | 0,16 (19) |
| Política | **0,56 (16)** | 0,38 (68) |
| Economía | — | 0,35 (113, la sección con más notas) |
| Fútbol | 0,5 (8) | 0,57 (79) |
| Argentina | — | 0,68 (50) |

  La Política de acá (el Concejo, pedidos de informes) se lee poco, aunque haya excepciones (el registro
  de acompañantes terapéuticos, 17 visitas). El Agro de afuera no lo lee nadie.
- **"La zona" casi no existe**: 11 notas en seis semanas (8 en la ventana, 1,1 visitas por nota). O se
  define mejor (ver pregunta) o se saca como nivel.
- **"Argentina" es un cajón**: de las últimas 40, hay salud (plan de salud vascular, clínicas privadas),
  clima (alertas del SMN), educación, mundo (Grossi en la ONU, Cabo Verde, Brasil), Iglesia, curiosidades
  y una nota de la Provincia sobre rutas de la región que es un servicio.
- **Correcciones de sección a mano: 31**, todas del 27 y 28/09 (el Concejo en Balcarce en vez de Política,
  la Selección en Deportes o Argentina, un recital en Fútbol, una clase de Chi Kung en Automovilismo). Desde
  el 29/09 no hubo más correcciones de sección: o la ficha mejoró, o nadie está mirando (**NO VERIFICADO**).
- En la prueba de 200 notas, Mercury quedó **más seguro con 17 secciones que con 11** (0,92 contra 0,89;
  13 dudosas contra 20) y el lugar con 3 niveles salió con seguridad 0,98 (`PLAN-DE-IMPLEMENTACION.md` § 5).

### (3) Opciones

| | A. 15 secciones por tema + lugar (3 niveles) + tipo; Balcarce como vista | B. 17 secciones (las probadas) | C. Las 11 de hoy + lugar |
|---|---|---|---|
| Qué es | Las 11 de hoy, Tecnología → "Ciencia y tecnología", y Salud, Educación, Turismo y gastronomía, Esports y juegos (lo que Andrés eligió el 11/10). Cada nota tiene **tema** (sección), **lugar** (Balcarce / La zona / De afuera) y **tipo**. "Balcarce" pasa a ser una vista con todo lo de acá; "Argentina" deja de ser cajón | Las 15 + Fórmula 1 aparte + Mundo + "Sociedad y servicios", sin Argentina | Cambio mínimo: se agrega el lugar y se arregla la regla que dejó la VTV en Política |
| Quién decide | Mercury Decide (una nota por pedido), con la categoría que trae el diario como **pista**; Jev opina sólo en lo dudoso; las palabras quedan como respaldo si el modelo no contesta | igual | igual |
| Costo por mes | ~US$ 0,9 (con la promo) a 1,8 (sin) | igual | igual |
| Riesgo | medio: toca la web (colores, menú, 8+ lugares del código); secciones nuevas con pocas notas al principio | más cambio visible; Fórmula 1 aparte con pocas notas | bajo, pero queda el cajón y lo de acá repartido |
| Decisión humana | la lista y el "qué no" de cada una; si Balcarce es vista o sección | igual | casi ninguna |

### (4) Recomendación

**A**, con el lugar como campo propio en el archivo (reemplaza `local`, `deLaZona` y `nombraBalcarce`) y
una regla única: **el tema manda en la sección, el lugar manda en la prioridad**. Una tarifa provincial
que le cambia algo al vecino va a su tema (Economía) con lugar "De afuera" pero **impacto directo**, y eso
sube en el puntaje (Etapa 5). Las secciones nuevas se suman de a una cuando lleguen a unas 10 notas por
semana. Mercury como principal porque fue el mejor en la prueba (Jev quedó menos seguro con 17 secciones:
0,85 y 33 dudosas).

### (5) Preguntas para Andrés y Hernán

1. ¿**15 o 17** secciones? ¿Y "Balcarce" es una **vista** (todo lo de acá, de cualquier tema) o sigue
   siendo una sección más?
2. **¿Qué es "La zona"?** Hoy es la ruta 226 y 55 y la papa (11 notas en seis semanas). Propuesta del
   criterio único: la papa y el campo del sudeste papero, las rutas fuera del partido cuando afectan a quien
   viaja a Balcarce, y los vecinos inmediatos (Lobería, Ayacucho, Mar Chiquita) sólo cuando hay gente de
   Balcarce en el hecho. ¿Sí, o se deja sólo Balcarce / De afuera?
3. Un servicio provincial o nacional que cambia algo acá (VTV, ARBA, tarifas): ¿va a su tema con
   prioridad alta (propuesta), o a la vista Balcarce también?

---

## Etapa 5 · Puntaje y selección

### (1) Cómo funciona hoy

**Quién decide si sale** no es el puntaje: son los medios mínimos (lo de afuera: Fútbol y Deportes 4;
Economía, Tecnología, Agro y Automovilismo 2; el resto 3; con figura 2), el cupo de lo de afuera por
sección (Argentina y Economía 12, Fútbol y Deportes 10…), la ficha de la IA y la ventana de 12 horas.

**El puntaje** (`relevancia`) sólo ordena: peso del feed (24 a 30 los de Balcarce, 7 u 8 casi todos los
nacionales) + 25 si es de acá + frescura (25 / 15 / 8) + 10 por medio extra (tope 40) + 6 con imagen + 4
con texto completo + 22 si un medio de afuera nombra Balcarce + 16 con figura + 8 si es Automovilismo;
tope 100. Y en la web **casi no se usa**: la tapa (`armarTapa`, `web/lib/datos.js`) usa el puntaje sólo para
elegir **la nota grande** (la de más puntaje de lo de acá en las últimas 6 horas); las otras cuatro y los
bloques por sección van **por hora**. El puntaje también ordena el cupo, Facebook y los repasos.

**Ejemplo real 1 · la portada del 15/10 (puntajes reales de `portada.json`):**
- `1f8plkr` "El Cementerio Municipal actualiza sus horarios desde el lunes 26" (de acá, 1 medio, servicio): **78**.
- `1cv9j22` el videojuego en Formosa (de afuera, 8 medios, curiosidad, ficha "nulo"): **66**.
- `1nsbz` "Un ex jefe policial de Balcarce analiza un fallo judicial" y `tctot0` "Valeria Ares comparte su
  experiencia…" (de acá, 1 medio): **63**. La curiosidad nacional quedó arriba de dos notas de Balcarce.
- `1v9h1ps` "La delegación local parte el lunes hacia la final provincial" (de acá, 3 medios): **94**;
  `gy4i31` Colapinto (22 medios): **90**.

**Ejemplo real 2 · lo que se lee contra el puntaje.** `15i90co` "Concejales proponen crear un registro
municipal de acompañantes terapéuticos" (La Vanguardia, 1 medio, sin hora en la fuente → **cero de
frescura**; reconstruido en la etapa 1: 63) tuvo **17 visitas**, de las más leídas. `1y371r4` "Casi 59.000
empresas registran problemas para cumplir con sus deudas" (11 medios, Economía, puntaje real 72) tuvo **0**.

### (2) Qué falla hoy (medido)

- **El puntaje es plano para lo de acá**: reconstruido sobre las 232 notas de acá de la ventana, **214
  quedan entre 80 y 100** (36 tocan el tope). No separa lo que se lee: la correlación con las visitas
  dentro de lo de acá es **0,14** (Spearman; 0 = nada, 1 = perfecto).
- **El peso por medio es casi constante** y premia "quién lo publica", no qué es (la etapa 1 lo midió:
  144 feeds con 7 u 8).
- **La frescura castiga a quien no pone hora** (La Vanguardia nunca suma frescura) en lugar de mirar
  cuándo lo vio el robot.
- **El tope de 40 por medios y el +10 por medio** no siguen a los lectores: de afuera, 2 o 3 medios =
  0,17 visitas por nota; 4 a 7 = 0,57; 8 o más = 0,48. La popularidad sirve **hasta unos 4 medios** y
  después no suma.
- **Lo que se lee es lo de acá, y sobre todo servicio y resultados de clubes locales**:

| Grupo (ventana 29/09–12/10) | Notas | Visitas por nota |
|---|---|---|
| De Balcarce | 224 | **2,49** |
| Notas propias de Radar (repasos, F1, fútbol, clima) | 58 | 1,53 (fútbol con datos 5,8; repasos 1,0; clima 0) |
| La zona | 8 | 1,13 |
| De afuera | 426 | **0,43** |
| De acá · fue a redes / no fue | 63 / 169 | 5,79 / **1,20** |
| De afuera · fue a redes / no fue | 13 / 413 | 3,54 / **0,34** |
| De acá, por tipo (aproximado): resultado de un club / servicio / hecho / institucional / agenda | 30 / 53 / 70 / 51 / 28 | 3,2 / 3,1 / 2,7 / 1,8 / 1,0 |
| De acá con 4 o más medios / con 1 | 15 / 159 | 5,4 / 2,2 |

  Las 20 más leídas: 15 de Balcarce (la Cooperativa corta la luz, la Liga suspende la fecha, el Club de
  Leones y el hospital, Pato Naranja, Bomberos, el Concejo…), 2 propias de fútbol con datos y 3 de afuera
  (oficios para secundarios de la Provincia, la balanza de pagos, que fue a Facebook, y Norris contra
  Piastri en la F1). Detalle en `medidas.json` → `masLeidas`.
- **El amarillo no lo mira nadie**: en promedio hay **19 notas por día esperando a una persona** y se
  aprueban **0,5** (`notas-por-dia.json`). Mandar "lo dudoso" al celular sólo sirve si es poco y de acá.
  Con Mercury la zona gris (probabilidad 0,2 a 0,8) fue el 7 % de las notas: con ~900 por día serían ~60.
  Demasiadas.

### (3) La fórmula propuesta (para discutir; los puntos se ajustan con las visitas)

Los pesos salen de las lecturas con una regla simple: **20 × ln(visitas del grupo ÷ visitas de la base)**,
o sea, **+14 puntos = el doble de lecturas** (`medidas.json` → `pesosDeLasLecturas`). Para no premiar "lo
que fue a Facebook", la cercanía usa la diferencia **sin redes** (1,20 contra 0,34 → +25), no la cruda
(2,49 contra 0,43 → +35).

| Componente | Puntos | De dónde sale el peso | Quién lo calcula |
|---|---|---|---|
| **Cercanía a Balcarce** | Balcarce 25 · La zona 15 · De afuera 0 | de acá sin redes 1,20 contra de afuera 0,34 (+25); la zona +19 cruda, con 8 notas: se baja a 15 | modelo (campo lugar) |
| **Servicio al lector** | servicio 10 · el resto 0 | de acá: servicio +4 sobre el promedio (muestra chica); se sube a 10 por decisión editorial: es lo que más se comparte (cortes, Liga, farmacia) | modelo (tipo) |
| **Frescura** | hasta 15, baja con las horas: servicio/alerta pierde la mitad en 6 h, hecho en 12 h, nota fría (ciencia, agenda lejana) en 48 h | NO VERIFICADO: no hay visitas por hora y por nota; se mide cuando la haya. La hora es la de la fuente o, si no tiene, la primera vez que la vio el robot | código |
| **Medios distintos (contando el `grupo` una vez)** | De afuera: 2 → 0 · 3 → 5 · 4 a 7 → 15 · 8 o más → 20. De acá: 1–2 → 0 · 3 → 5 · 4 o más → 15 | de afuera, 4+ medios contra 2–3: +23; de acá, 4+ medios 5,4 contra 2,2 | código (cruce + campo `grupo` de la etapa 1) |
| **Tipo de nota** | hecho, resultado, servicio +5 · anuncio/agenda −5 · institucional −3 · declaración 0 · opinión, curiosidad, consejo, chimento: **no entran** (Etapa 2) | de acá: agenda −17, institucional −6 sobre el promedio; se suavizan porque la muestra es chica | modelo (tipo) |
| **Interés según el modelo** | directo 10 · indirecto 5 · nulo 0 (o 10 × probabilidad de publicar) | lo que la VTV necesitaba: un servicio provincial con impacto directo sube aunque no sea "de acá" | modelo de decisiones |
| **Equilibrio de la tapa** | no suma: se aplica al armar la tapa. Mínimo 50 % de lo de acá en la tapa si hay; máximo 2 notas del mismo tema o figura (Messi, Colapinto, el Papa) arriba; máximo 3 por sección | hoy lo de acá es el 39 % de lo publicado (13,7 de 35,3 por día) y el 48 % de la portada del 15/10 (23 de 48) | código |

Total posible: 100. Una nota de Balcarce de servicio y fresca arranca en ~65; una nacional contada por 10
medios con impacto indirecto, en ~45; la curiosidad del videojuego ni entra (tipo excluido).

**Qué tanto mejora, medido sobre las mismas notas** (con el tipo y el interés aproximados por palabras,
porque el modelo todavía no da esos campos): la correlación con las visitas sube de **0,28 a 0,38** en
general y de **0,14 a 0,28** dentro de lo de acá; en "cuántas de las 20 más leídas quedan entre las 20 de
más puntaje" no mejora (4 contra 3), porque las más leídas dependen mucho de qué fue a Facebook. Es una
medición **sobre los mismos datos con que se eligieron los pesos**: **NO VERIFICADO** que se sostenga con
notas nuevas. Por eso la propuesta incluye recalcular los pesos una vez por mes con un script (código,
gratis) y mostrar el cambio antes de aplicarlo.

### (4) Opciones

| | A. La fórmula de arriba, pesos de las visitas, recalculados por mes | B. Que mande la probabilidad del modelo | C. Arreglar la fórmula de hoy |
|---|---|---|---|
| Qué es | Cercanía + servicio + frescura + medios con grupo + tipo + interés, sin peso por medio; la tapa con reglas de equilibrio; la nota grande y el orden de los bloques salen del puntaje (no sólo de la hora) | Puntaje ≈ 60 × probabilidad de publicar del modelo + cercanía; menos piezas, menos explicable | Sacar el tope de 100, dar frescura por la primera vista, bajar el +10 por medio |
| Costo | US$ 0 (los campos ya vienen de la Etapa 4) | US$ 0 extra | US$ 0 |
| Riesgo | medio: muestra chica; se mitiga recalculando y con el equilibrio de la tapa | alto: un número que no se puede explicar ni corregir a mano | bajo, pero sigue midiendo "quién lo publica" |
| Decisión humana | cuánta tapa para lo de acá, topes por tema | umbrales de probabilidad | poca |

### (5) Recomendación

**A.** Y separar dos preguntas que hoy están mezcladas: **¿sale?** (puertas: semáforo legal, tipo, de
afuera con 4 medios distintos contando el grupo, o probabilidad del modelo de 0,8 o más) y **¿dónde va?**
(el puntaje y el equilibrio). Lo dudoso: **de acá** → al celular (pocas por día); **de afuera** → decide un
segundo modelo (Jev) y, si siguen en desacuerdo, no sale. Así el celular recibe 3 a 6 notas por día, no 60.

### (6) Preguntas para Andrés y Hernán

1. **¿Qué parte de la tapa es para lo de acá como mínimo?** (Propuesta: la nota grande siempre de acá si
   hay algo en las últimas 6 horas, y al menos la mitad de lo de arriba.)
2. **¿Tope por tema?** (Propuesta: no más de 2 notas del mismo hecho o figura en la parte de arriba.)
3. Lo de afuera: ¿alcanza con **4 medios distintos contando cada grupo una vez** (Clarín, Olé, TN y Mitre
   = 1) o se mantiene un número por sección?
4. ¿Están de acuerdo en que **lo dudoso de afuera no vaya al celular** (lo decide un segundo modelo) y sólo
   lo dudoso de acá espere a una persona?

---

## Qué modelo para cada tarea (y qué sigue siendo código)

**Sigue siendo código, sin IA** (gratis, siempre da lo mismo, no depende de un proveedor): leer los feeds
(RSS, Atom, índices, raspado), las fechas y la primera vista, los filtros seguros (lotería, horóscopo,
secciones de la dirección), el hash de repetidos exactos (enlace; medio + título normalizado), el semáforo
legal como red de seguridad (rojo, nunca, menores: la IA sólo puede endurecer), contar medios distintos
con `grupo`, las ventanas (12 h, 36 h, 72 h), la suma del puntaje, los cupos y el armado de la tapa.

Volumen supuesto: ~2.350 notas crudas por día, ~900 después del código, ~650 historias después de las
duplicadas, ~40 publicadas. Precios del `02-IA-MODELOS-OpenRouter.md` (11/10; reconfirmar antes de cargar).

| Tarea | Tipo de modelo | Cuál | Volumen por mes | US$ por mes |
|---|---|---|---|---|
| Huella de significado (duplicadas) | embeddings | `baai/bge-m3` | ~8 M tokens | ~0,1 |
| ¿Es el mismo hecho? (pares) | **decisión** | Mercury Decide, de a 12 pares | ~10 M tokens (prueba: 12.415 pares en 72 h = US$ 0,054) | ~0,5 |
| Sección, lugar, tipo, interés, ¿se publica? | **decisión** | Mercury Decide, una nota por pedido | 900 × 1.700 tokens × 30 ≈ 46 M | 0,9 (promo) a 1,8 |
| Segunda opinión en lo dudoso y en todo lo de Balcarce | **decisión** (otro proveedor, para no repetir el mismo error) | Jev 1.13 | ~120 notas/día ≈ 8 M | ~0,35 (precio de Jev **NO VERIFICADO**) |
| Campos de texto de lo que pasa (protagonista, entidades, "por qué interesa", motivo del amarillo para el celular) y auditoría semanal de la selección | **chico** (trabajo repetido, en lote) | Haiku-class (Claude Haiku 5.5, US$ 0,10 / 0,50; con lote, la mitad) | ~250 notas/día ≈ 9 M de entrada + 1 M de salida | ~0,8 a 1,5 |
| Desempate: Mercury y Jev no coinciden en algo de Balcarce o sensible; revisión mensual de los pesos con 200 notas | **fuerte** (sólo donde importa la calidad) | Sonnet-class u Opus-class | ~10 casos/día + 200/mes ≈ 1,3 M | ~4 a 9 (precios de Sonnet y Opus **NO VERIFICADOS** en el `02`; se supuso US$ 3/15 y 5/25 por millón) |
| Comisión de OpenRouter al cargar crédito | — | 5,5 % (mínimo US$ 0,80) | — | ~0,5 |
| **Total etapas 2 a 5** | | | | **~3 sin el modelo fuerte; ~7 a 13 con él** |

Contra el tope de **US$ 25 por mes**: según `06-IMPLEMENTAR-YA.md`, Workers de Cloudflare suma US$ 5 y la
redacción sigue en Gemini gratis (repuesto Gemma 26B ~US$ 8). Con todo: ~US$ 15 a 26 en el peor caso. Por
eso el modelo fuerte va **con tope diario de pedidos** (por ejemplo 15) y, si se llega, el caso espera a una
persona. Recomendación: empezar con Sonnet-class para el desempate (Opus sólo si las pruebas muestran que
hace falta) y medir el costo real con el campo `usage` las dos primeras semanas.

Respaldo si OpenRouter falla (la API de decisiones es "alpha"): Gemini Flash-Lite gratis y Groq, como hoy,
con el mismo esquema; y si no contesta ningún modelo, las reglas de código deciden como hoy.

---

## Resumen de las preguntas para Andrés y Hernán

1. Tipos de nota: cuáles nunca entran, cuáles esperan, cuáles pasan; ¿opinión o análisis sí?
2. ¿Policiales de afuera siguen sin entrar?
3. Actualizaciones de una historia: ¿nota nueva con antecedente o se actualiza la que salió? ¿Un medio nuevo
   sólo se suma a las fuentes?
4. ¿72 horas para buscar repetidas, comparando también contra lo ya publicado?
5. ¿15 o 17 secciones? ¿Balcarce vista o sección?
6. ¿Qué es "La zona" (o se saca)?
7. Servicios provinciales o nacionales que cambian algo acá: ¿a su tema con prioridad alta?
8. Mínimo de lo de acá en la tapa y tope por tema o figura.
9. Lo de afuera: ¿4 medios distintos contando el grupo una vez?
10. ¿Lo dudoso de afuera lo decide un segundo modelo y sólo lo dudoso de acá va al celular?
11. ¿Se acepta un modelo fuerte (Sonnet-class) sólo para desempates, con tope diario, dentro de los US$ 25?
