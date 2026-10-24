# El hecho principal: que una historia junte notas del mismo hecho, no del mismo tema (regla 322)

*24/10/2026. Sigue a `docs/auditoria-2-0/P-REVISION-INDEPENDIENTE.md` (errores visibles del cruce en notas de hoy) y a la pendiente S5 de `docs/etapa-10-operacion/POR-QUE-NO-ENTRO-ARREGLOS.md`.
Decisión del dueño: lo viejo no importa, importa lo nuevo. Lo que se arregla es el mecanismo que pega hechos distintos; las notas ya publicadas no se tocan.*

## Qué pasaba (casos reales del 21 al 24/10)

| Qué se veía | Dónde se pegaba | Cómo |
|---|---|---|
| En la nota del Instituto Adventista, «Fuentes» mostraba la de «75 familias firmaron sus escrituras» | grupo de la IA de repetidas (`1hviiat`, `k59a1x`, `nduhgx`) | los dos actos son de la Municipalidad, la misma semana |
| «Diputados aprueba la ley de Discapacidad» dentro de «Diputados endurece las penas por vandalismo rural»; «trazabilidad de medicamentos» dentro de «Inviolabilidad de la propiedad» | grupo de la IA (`unirGrupos` suma por transitividad) | dos leyes de la misma sesión |
| «Palmeiras finalista» dentro de la previa de Estudiantes-Flamengo; Tevez con Palmeiras | grupo de la IA | dos partidos |
| Dos grupos de 23 y 28 notas el 22/10 (U2, las rutas, las cáscaras de naranja, Boca, el Gobierno homologando convenios) | un pedido a la IA que devolvió ids sin relación | `validos` sólo mira que el id exista |
| Nazareno Ramírez Bazán (oro en los Juegos Bonaerenses) con 15 «medios», la mayoría del cierre general | **el cruce** (14 notas: 5 de Balcarce y 9 de que Quilmes ganó) y después la IA le sumó más | comparten el marco «Juegos Bonaerenses», no el hecho |
| Un concejal de Tandil hablando de PAMI y de la ruta 226 en Policiales | la **ficha** de la IA (`seccion: Policiales`, «trata sobre la seguridad…») | `aplicarFichas` le cree a la ficha |

El de «La inteligencia artificial en la educación y los avances en oncología» (dos columnas de opinión, Ámbito y Perfil, pegadas por «personalizada») no se pudo reproducir con lo que hay guardado (sin el resumen
de cada fuente, el cruce no las junta): lo cubre la misma guarda en la IA si fue ella, y si fue el cruce con el resumen, no (ver «Qué no se hizo»).

## Qué se hizo

`ingesta/hecho-principal.mjs` (sin dependencias, sin IA). Es una **guarda que sólo separa**: nunca junta lo que nadie había juntado. Para cada par de notas de un grupo mira el título y el comienzo del resumen:

1. **Las marcas del cruce coherente** (regla 184, `porQueSeparar`): un anuncio y su resultado, un hecho y el contrario, fechas, días o marcadores distintos, tipos de hecho distintos.
2. **Nombres propios**: si cada una nombra a alguien que la otra no nombra (`porQueNoAunqueCitenLoMismo`, regla 175), pero sólo cuando además lo que dicen se parece poco (cobertura menor a 0,4).
3. **Cobertura**: qué parte del título de cada una (pesada por lo rara que es cada palabra entre las notas del momento: «Diputados» o «Juegos Bonaerenses» pesan poco, «Discapacidad» o «Nazareno» pesan mucho) aparece en la otra; vale la menor de las dos direcciones y tiene que ser de 0,25 o más.
4. **Núcleo**: las 3 palabras más raras del título de cada una tienen que aparecer, alguna, en la otra. Sin eso comparten el marco («Diputados aprueba el proyecto…»), no el hecho.

Y en vez de dejar el grupo entero porque hay una cadena de pares, se rearma de a dos pedazos (la parte de los pares entre los dos pedazos que comparten el hecho, 0,5 o más; con menos de 4 pares, todos): **una cadena A-B-C no se junta si A y C no comparten el hecho**.

Dónde se usa:

| Dónde | Qué hace |
|---|---|
| `unirGrupos(anteriores, nuevos, idsVigentes, { notas })` (`ingesta/lectura-ia.mjs`) | cada grupo que sale de la suma por transitividad se parte en los pedazos que comparten el hecho. Sin `notas` es la suma de siempre. `web/scripts/generar-datos.mjs` las pasa |
| `quitarRepetidas(notas, grupos, { guardaDeHecho: true })` | un grupo guardado de antes en `fichas.json` que junta hechos distintos se parte antes de quitar nada (generar-datos lo pide siempre) |
| `armarHistorias` (`ingesta/ingesta.mjs`), con `separarLoDeAca` | si una historia del cruce mezcla notas de medios de Balcarce con notas de afuera y **dos o más de las de acá no comparten el hecho con nada de afuera**, se separan: lo de acá queda con sus medios y lo de afuera con los suyos. Lo que mezcla acá y afuera y sí cuenta lo mismo no se toca |
| `aplicarFichas` (`ingesta/lectura-ia.mjs`), con `sinPoliciaDeVerdad` | la IA no puede llevar a Policiales una nota que no dice nada policial (ni en el título ni en el comienzo del resumen, red ancha de palabras) **cuando las palabras le dieron una sección concreta** (Salud, Economía…; si dieron Balcarce o Argentina, que es lo que queda cuando nada encontró nada, la IA puede ver lo que las palabras no ven). La nota queda en la sección de las palabras y no se saca por «policial que no es de Balcarce». Se anota en `cambios.seccionContradicha` y la corrida lo cuenta |

Interruptor: `HECHO_PRINCIPAL=no` (también `0`, `false`, `apagado`) en el entorno vuelve a lo de antes en los tres lugares. Prendido por defecto, como `CRUCE_COHERENTE`: sin la variable todo anda con la guarda; en GitHub se puede crear a mano para apagarla y en Workers Builds, sólo si se suma a `cargar-variables.mjs` (esta tanda no tocó `infra/`; es un apagado de emergencia, `pruebas/variables-conectadas.test.mjs` lo lista como tal). Los números están en `HECHO_PRINCIPAL` (`ingesta/hecho-principal.mjs`) y se midieron con `scripts/medir/hecho-principal.mjs`.

## Lo que se midió (datos reales, sin IA)

`node scripts/medir/hecho-principal.mjs` (tarda un minuto: lee el historial de git de `fichas.json` desde el 19/10, 241 commits, 1.873 notas publicadas con título, 581 grupos distintos de la IA, y la memoria del cruce de la PC: 6.208 notas, 533 historias de más de una nota).

**A. Los grupos de la IA.** Los títulos sólo existen de lo publicado; los grupos que la IA armó con notas que nunca salieron no se pueden medir (243 de 327 no tienen dos con título).

| Qué | Resultado |
|---|---|
| Grupos medibles (dos o más notas publicadas) | 84: **15 quedan iguales**, **7 se parten** en pedazos de dos o más, **62 se deshacen entero** |
| Uniones que de verdad se hicieron (`fusionadas.json`, las dos notas con título) | 45: **39 pasan la guarda (86,7 %)** y **6 se pierden** |
| De esas 6 | 3 eran uniones malas que el informe ya había encontrado (trazabilidad/Inviolabilidad, Discapacidad/vandalismo rural, la nota de reclamos y la de opinión de Blanco Río por la Estudiantina) y 3 buenas o dudosas (Colapinto: «15 puestos de penalización» / «penalizaciones y práctica en Sepang»; Milei: «ratifica a Caputo» / «tiene fondos por miles de millones»; Gimnasia: «supera a Sarmiento 2 a 0» / «le gana parcial») |
| Lote a mano (117 pares de grupos chicos, etiquetados leyendo los dos títulos) | **16 de 17 «mismo hecho» pasan**; **3 de 89 «distinto» pasan** (el Club de Pesca con dos notas del mismo club, hantavirus y dengue, Colapinto 17.º y 15.º); los 14 dudosos, 5 pasan |
| Los casos del informe | Discapacidad/vandalismo, trazabilidad/Inviolabilidad, Palmeiras/Estudiantes, Tevez/Palmeiras, Instituto Adventista/75 familias, Nazareno/Cipriano/María Elena Luro: **todos se separan** |
| Los grupos de 23 y 28 del 22/10 | de las 9 notas con título del de 28: quedan 2 grupos de dos (Mineiro-Boca por la final, Boca-Vasco), nada de U2 con las cáscaras de naranja |
| Tamaño del mazo (cuántas notas se usan para medir lo rara que es cada palabra) | con 245, 345, 545 y 1.866 notas el resultado casi no cambia (15 a 16 de 17 buenas, 3 a 5 de 86 malas) |

Hay un sesgo y se dice: los grupos «medibles» son los de dos notas que SALIERON las dos; si la unión hubiera sido buena, una de las dos no habría salido. Es un lote sesgado hacia lo malo. Lo que sí es parejo es la lista de uniones hechas de verdad (la fila de 45), y ahí se pierde una de cada quince buenas o dudosas (3 de 45) y se evitan tres de las malas conocidas.

**B. El cruce.** En la memoria hay 10 historias que mezclan medios de acá y de afuera: `separarLoDeAca` no cambia ninguna (no pierde ninguna unión buena). Con el caso de Nazareno reconstruido (14 títulos de las direcciones de las fuentes, más 420 notas de relleno): el cruce solo hace una historia de 14 y con la guarda quedan **5 (Radio Gabal, Infórmese, Puntonueve, La Vanguardia, El Diario Balcarce) y 9** (Quilmes campeón, el medallero, el cierre).

**C. La sección.** De 11 fichas que dijeron Policiales y cuya nota está publicada, **1** no dice nada policial: la del concejal de Tandil.

## Qué no se hizo, y por qué

- **Aplicar la guarda a todas las historias del cruce.** Se midió: con los números de arriba partiría **147 de 533** historias de más de una nota (27,6 %), 31 de 282 pares y 58 de 77 historias de 7 notas o más. Leyéndolas a mano, la mayoría son la misma noticia contada con otro ángulo (la AUH de noviembre, la confianza del consumidor, Cerúndolo en Bruselas, el riesgo país, las alertas por tormenta, Julieta Prandi, Colapinto en Austin): partirlas es publicar lo mismo dos veces. Una versión más tolerante (separar sólo si quedan dos pedazos de tres notas o más que no comparten casi nada: 16 historias, 3 %) acierta la mitad (Palmeiras/Estudiantes, Charly García, Colapinto previa/prácticas) y rompe la otra mitad (Discapacidad, Prandi, el riesgo país), y no arregla Nazareno con los números del cruce. Por eso en el cruce sólo se usa `separarLoDeAca`, que apunta a lo que el dueño más cuida: lo de Balcarce no se queda pegado a un hecho de afuera con el que comparte el marco.
- **Cambiar de dónde sale la sección que da el feed.** Se midió: de 1.392 notas con sección del feed, en 630 las palabras darían otra (413 de ellas, Argentina: la sección de lo que ninguna palabra encuentra). El feed acierta bastante más que las palabras; el caso del concejal era la ficha, no el feed.
- **Las dos columnas de opinión («educación personalizada» / «medicina personalizada»).** Si las juntó el cruce con el resumen, no hay guarda para eso sin romper las historias buenas (ver arriba); si las juntó la IA, la guarda las separa (comparten una sola palabra).

## Cómo volver atrás

`HECHO_PRINCIPAL=no` (variable de GitHub; en Workers Builds, sólo sumándola a `infra/motor-cloudflare/cargar-variables.mjs` y a `motor-variables.yml`, pendiente de una persona). Sin la variable, sigue prendido. Los grupos de `fichas.json` que la guarda ya partió no se vuelven a juntar solos, pero la IA los vuelve a proponer y `unirGrupos` los suma como antes.

## Qué mirar mañana

1. En el registro de «Actualizar la web»: `repetidas: …` y la nueva línea de la ficha («con la sección de las palabras porque la ficha decía Policiales sin nada policial»). Tienen que ser pocas por día (hoy, una).
2. `hecho principal (regla 322): N historias de afuera con notas de Balcarce que no cuentan lo mismo, separadas` en la ingesta: lo esperable es 0 la mayoría de las vueltas y 1 o 2 cuando hay un evento grande (Juegos Bonaerenses, Estudiantina).
3. Que ninguna historia de Balcarce quede con «Fuentes» de otro tema (mirar a ojo las notas de acá con más de 4 fuentes).
4. Si aparece la misma noticia dos veces donde antes salía una (señal de que la guarda separó de más), `node scripts/medir/hecho-principal.mjs --detalle` dice qué par y por qué; el motivo está en `compartenElHecho`.
