# El cruce coherente (regla 184)

*16/10/2026. Código: `ingesta/cruce.mjs` (`agruparPorHecho`, `CRUCE.coherente`, `CRUCE_COHERENTE`). Medición:
`scripts/medir/cruce-coherente.mjs`. Pruebas: `pruebas/cruce-grupos-coherentes.test.mjs`, con casos reales en
`pruebas/datos-fijos/cruce-coherente.json`.*

## En pocas palabras

**Qué pasaba.** El cruce es lo que junta en una sola "historia" las notas de distintos medios que cuentan lo mismo.
Juntaba **en cadena**: si la nota A se parecía a la B, y la B a la C, las tres quedaban juntas aunque A y C no tuvieran
nada que ver. Así, el 16/10 a las 12, una sola historia de fútbol juntaba **228 notas** (River-Sarmiento, Boca, Huracán,
Estudiantes-Flamengo, Marcos Rojo, la sanción a Verón…) y **221 no tenían nada que ver con el título**. El dólar del 14 y
el del 15 eran una sola historia; el clima de varios días, también. Y como la historia toma la fecha de su nota más
vieja, una noticia nueva pegada a una cadena vieja "llegaba tarde" y no salía.

**Qué cambia.** Cada grupo que arma el cruce se revisa. Si está bien (no es enorme, no dura más de un día y medio y
todas sus notas se parecen al resto), **queda igual**. Si no, se rearma pedazo por pedazo: dos pedazos se juntan sólo
si **todas** sus notas se parecen en promedio (no alcanza con un eslabón), si la historia sigue entrando en **30 horas**
(o 48 si es una noticia en desarrollo contada casi igual) y si no hay dos notas que no pueden ir juntas: **un anuncio y
su resultado, un hecho y su contrario, fechas o días distintos, resultados distintos, o la previa de un partido, el
resultado, los puntajes, la tabla y una sanción**.

**Qué NO cambia.** Partir sólo separa: nunca junta lo que antes no se juntaba. Lo ya publicado **conserva su dirección**
(regla 175). La fecha de una nota sigue envejeciendo sin rejuvenecer (eso lo cuida la web). Los medios del mismo dueño
siguen contando como uno. Lo que el cruce de antes juntaba bien (la muerte de Fernando Confessore, 52 notas del mismo
hecho) sigue siendo una historia (51; la que se va no nombra a nadie).

**Quedó prendido.** Con las dos lecturas del 16/10 ninguna de las cuentas empeora: ninguna nota se pierde ni se repite,
ninguna publicada pierde su dirección ni deja de llegar a los medios que pide su sección, y hay **más** historias que
llegan a ese mínimo. Para apagarlo sin tocar el código: variable de entorno `CRUCE_COHERENTE=no` (ver abajo).

## Antes y después (lectura del 16/10 a las 12:00)

7.812 notas al cruce (6.533 de los feeds y 1.279 de la memoria de 36 horas), 1.160 notas publicadas conocidas
(origin/main). La misma lectura, con el cruce de antes y con el coherente:

| | Antes | Después |
|---|---:|---:|
| Historias que siguen al filtro | 618 | 683 |
| Historias de 2 medios o más (dueños juntos) | 503 | 568 |
| …con 2 notas | 245 | 264 |
| …con 3 a 5 | 168 | 192 |
| …con 6 a 10 | 52 | 71 |
| …con 11 a 25 | 24 | 34 |
| …con 26 a 50 | 8 | 6 |
| …con 51 a 100 | 4 | 1 (Confessore, 51) |
| …con más de 100 | 2 | 0 |
| La más grande | 228 notas (221 sin nada que ver con el título) | 51 (0) |
| Notas sin nada que ver con el título, en historias de 8 notas o más | 333 de 1.415 | 53 de 1.086 |
| De 2+ medios con más de 24 h entre la primera y la última nota | 120 | 82 |
| De 2+ medios con más de 36 h | 57 | 13 |
| Llegan a los medios que pide su sección (o son de acá) | 389 | 421 |
| Grupos encadenados revisados / partidos | — | 104 / 91 |
| De afuera con un solo medio (no entran) | 4.108 | 4.234 |
| Notas en dos grupos / direcciones en dos historias | 0 / — | 0 / 0 |
| Historias con dirección ya publicada | 100 | 102 |
| …publicadas que pierden su dirección | — | **0** |
| …publicadas que dejan de llegar a los medios de su sección | — | **0** |
| …publicadas que quedan con menos notas | — | 8 (las de las cadenas: 228→7, 101→6…) |
| …notas de historias publicadas que pasan a otra historia | — | 400 (221 de la de fútbol) |
| …publicadas que estaban tapadas y vuelven con su dirección | — | 2 |
| Historias nuevas de 2+ medios | — | 105 |
| …con el hecho de menos de 12 h (las demás llegan tarde y no salen solas) | — | 11 |
| …que salen de partir una publicada y se podrían estrenar | — | 3 (las tres, hechos distintos) |
| …que la barrera de repetidas sin IA igual uniría a la publicada | — | 0 |
| Tiempo del cruce | 2,3 s | 2,3 s |

Con la lectura de las 11:43 da lo mismo: la más grande pasa de 232 a 52 notas, las de más de 36 h de 67 a 14, las que
llegan al mínimo de su sección de 391 a 437, y 0 publicadas pierden su dirección o su mínimo.

"De afuera con un solo medio" sube (126 notas): son notas que estaban en una historia sólo por la cadena; ahora quedan
solas y, como las cuenta un solo medio, no entran. Es el arreglo, no una pérdida.

## Cinco ejemplos reales

1. **El fútbol de la fecha (228 notas → 39 historias).** Quedan separados, entre otros: Marcos Rojo inhabilitado por
   la Conmebol (31), la previa de Boca-Talleres (24), Estudiantes 0-Flamengo 0 (23), Ponzio después del empate de
   River (12), la sanción a Verón (10 y 11), Gimnasia 2-Huracán 1 (10) y su previa (8), y **el reto de Otamendi a
   Beltrán (7)**, que era la publicada: conserva su dirección, pero su "Fuentes (N)" pasa de 26 medios a los 5 que
   cuentan eso.
2. **El dólar (64 notas → 6).** El del 14, el del 15 y el del 16 son historias distintas ("fechas distintas"); el
   euro de otros países, aparte.
3. **La Marcha Federal Universitaria (101 notas, 74 horas → 9).** La previa ("A qué hora es la marcha", 20), los
   incidentes en el Congreso (28), la respuesta del Gobierno (30), Yacobitti (9) y la marcha de jubilados del día
   anterior (3), que no era la misma. La publicada ("volvieron a las calles") conserva su dirección. En el informe del
   día, la cadena entera llevaba la fecha de su nota más vieja (13/10); ahora los incidentes, contados por 23 medios,
   tienen la suya.
4. **La Justicia y el financiamiento universitario (59 → 6).** La multa y su suspensión quedan en la publicada (38);
   la suspensión de dos artículos de la **reforma laboral** (otro fallo, 10 notas) sale aparte.
5. **Lo que andaba sigue andando: Confessore (52 → 51).** Todas las notas de la muerte del meteorólogo siguen juntas;
   sólo se va "murió un reconocido periodista de TN a los 58 años", que no nombra a nadie y se parece poco al resto.

Otro caso, por la fecha: **Locomotora Castro (31 → 5)**. La muerte (14/10), lo que contó la hija y el velatorio
(15/10) quedan como historias distintas, cada una con su fecha.

## Cómo decide (para quien toque el código)

`agruparConDetalle` (en `ingesta/cruce.mjs`) arma los eslabones de siempre (TF-IDF, coseno 0,42, dos notas del mismo
medio no se comparan) y los grupos encadenados. Con `coherente` prendido, cada grupo de 2 o más notas pasa por
`esCoherente`: hasta `maxNotas` (25), a menos de `horasDeUnHecho` (30) entre la primera y la última nota (las de fecha
estimada no cuentan), ningún par que `porQueSeparar` separe y cada nota con coseno de al menos `restoMinimo` (0,2)
contra el centro del resto del grupo. Si no, `rearmar`: cada nota sola, y se juntan de a dos pedazos unidos por un
eslabón, siempre el par de parecido **promedio** más alto (todas contra todas), si llega a `promedioMinimo` (0,22) y
ningún par de notas está separado. Primero sólo lo que entra en 30 horas; después, las noticias en desarrollo (hasta
`horasEnDesarrollo`, 48, si el promedio llega a `promedioEnDesarrollo`, 0,45). Es determinista.

`porQueSeparar` mira sólo los títulos (`marcasDelTitulo`): anuncio y resultado, y suspender/reanudar o cerrar/abrir
(las mismas expresiones de `ingesta/repetidas-publicadas.mjs`, `MARCAS_DE_HECHO`; subir/bajar no, porque el mismo dato
del INDEC se cuenta de las dos maneras); fechas ("14 de octubre"), días de la semana y marcadores ("2 a 1"; no los
horarios ni los grados) distintos; y el tipo de hecho (previa, resultado, puntajes, tabla, sanción).

`armarHistorias` (en `ingesta/ingesta.mjs`, el paso 2 de `ingestar` sacado a una función) elige la principal igual que
antes (`laYaPublicada`, regla 175): por eso ninguna publicada pierde su dirección. El registro de la corrida suma una
línea: "cruce coherente (regla 184): N grupos encadenados revisados, M partidos".

## Cómo prenderlo, apagarlo y medirlo

- Viene **prendido** (`CRUCE_COHERENTE`). Para apagarlo en GitHub sin tocar el código: en el workflow que corre la
  ingesta, `env: CRUCE_COHERENTE: "no"` (también valen "0", "false", "apagado"). En la PC:
  `CRUCE_COHERENTE=no node …`. Apagado, el cruce es **idéntico** al de antes (comprobado nota por nota con la lectura
  de las 11:43).
- Medir con la última lectura guardada (`.cache/informe-del-dia-*.json`, la que deja
  `scripts/medir/informe-del-dia.mjs`): `node scripts/medir/cruce-coherente.mjs --ejemplos`. Para calibrar:
  `--horas=30 --promedio=0.22 --resto=0.2 --max=25`. Lo publicado se lee de origin/main (`--ref=disco` para el disco).

## Riesgos

- **Una noticia partida en dos.** La misma noticia contada con palabras muy distintas puede quedar en dos pedazos
  (la quiebra de Algodonera Avellaneda: 3 y 3 notas; la sanción a Verón: 10 y 11). Cada pedazo cuenta menos medios. En
  estas lecturas ninguna publicada bajó del mínimo de su sección y sólo 1 par de pedazos hermanos podía estrenarse a la
  vez (y eran hechos distintos), pero en una corrida real dos pedazos frescos del mismo hecho pueden salir como dos
  notas: los frenan las barreras de repetidas de después (la de sin IA, regla 171, la de la misma fuente, regla 175,
  y la de la IA). Vale mirar el informe del día unos días.
- **"Fuentes (N)" de una publicada puede achicarse**: la nota del reto de Otamendi mostraba 26 medios que en su
  mayoría contaban otra cosa; ahora muestra los 5 que cuentan eso. Es lo correcto, pero se ve.
- **Una publicada tapada puede volver** (2 en la lectura): estaba dentro de otra historia y ahora vuelve a ser la suya,
  con su dirección de siempre.
- Las reglas de títulos son de palabras: un título que mezcla anuncio y resultado ("mereció más, pero el pase a la
  final se definirá en el Maracaná") puede quedar aparte de su partido.
