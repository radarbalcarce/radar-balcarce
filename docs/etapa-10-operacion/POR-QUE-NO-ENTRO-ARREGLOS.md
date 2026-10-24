# Por qué no entró: los arreglos seguros (regla 314)

*24/10/2026. Sigue al informe `docs/auditoria-2-0/N-POR-QUE-NO-ENTRO.md` (que está en la rama de la auditoría). Prioridad del dueño: las notas que cuentan 8 medios
o más no pueden seguir sin publicarse y todo lo de Balcarce tiene que entrar. Acá va qué se arregló, con qué caso real, qué se midió antes y después, cómo se
vuelve atrás y qué quedó pendiente. Cada arreglo tiene su prueba en `pruebas/por-que-no-entro-314.test.mjs`.*

## Qué se arregló

| # | Qué | Caso real | Dónde |
|---|---|---|---|
| **S8** | La estadística anota **el motivo de cada historia** sin pisarlo: lista cerrada (`MOTIVOS`), «otros» prohibido (lo que no encuentra motivo queda `sin_motivo` y la corrida avisa con un `::warning::`), el primer motivo que la frenó (no se pisa) y con quién se unió; la suma de los motivos de un día es siempre lo que llegó. | $Libra, Estudiantina, Scaloni (el informe no podía explicar ninguno) | `ingesta/estadistica-seleccion.mjs`, `web/scripts/generar-datos.mjs` |
| **S2** | `quitarRepetidas` no le pasa el amarillo de la hermana a la que queda si es **de acá** (regla 291). El rojo se sigue heredando. | «Una familia balcarceña conoció a Lionel Scaloni en Mallorca» quedó esperando por un «niño» de otro medio | `ingesta/lectura-ia.mjs` |
| **S3** | Una nota **ya publicada** no se saca porque otra versión del mismo hecho (sin cuerpo o «tarde») pase a ser la que queda: `quitarRepetidas` recibe todo lo que tiene página, no sólo lo que sigue dentro de las 36 horas de la portada. | $Libra (`uxhjzr` salió a las 21:35 y a las 06:04 ya no estaba), «31 años» (`xykr3v`) | `idsQueYaTienenPagina` (`web/lib/archivo.js`), `generar-datos.mjs` |
| **S1** | La fecha del hecho para decidir «tarde», en lo que cuentan **8 medios o más** y en **lo de Balcarce**, es la **mediana de las fuentes** y no la más vieja. Variable `FECHA_DEL_HECHO`; por defecto `mediana`; `vieja` vuelve a lo de antes. | $Libra (34 medios), Hotesur (21), Scaloni 2030 (18), Skerritt (11) | `ingesta/fecha-del-hecho.mjs`, `fechaDeLaNota` (`web/lib/archivo.js`), `generar-datos.mjs` |
| **S4** | La sección de una nota ya publicada no salta entre Política y Policiales de una vuelta a otra. | $Libra figuraba en las dos | `seccionSinSaltos` (`web/lib/archivo.js`) |
| **S6** | No se lee con IA lo que no puede salir por cantidad de medios; lo demás se lee en orden (lo de acá, lo que ya llega, lo que necesita otra sección). En la estadística «pocas fuentes» va antes que «la IA la sacó». | 327 de 785 historias de 2 medios figuraban como «IA» | `ordenParaLeer` (`ingesta/lectura-ia.mjs`), `observarCorrida` |
| **S5** | Uniones de repetidas con guarda de hecho principal y sin cadenas | Discapacidad, Palmeiras, 75 familias, menor liberado | **Hecho después, en la regla 322** (`docs/etapa-10-operacion/HECHO-PRINCIPAL.md`); lo de abajo es por qué no se hizo en esta tanda |

## Lo que se midió (repetición sin red)

`node scripts/medir/por-que-no-entro.mjs --ahora=2026-10-23T20:17:00Z --ref=948ac394` corre el cruce, el semáforo y la popularidad con el código de hoy sobre
la memoria del cruce que quedó en la PC (`.cache/cruce-memoria.json`: 6.208 notas, 475 historias; la hora de la memoria, 23/10 17:17 de Balcarce) y compara con lo
que estaba publicado en `948ac394` («Datos de la portada · 23/10 17:34»). No llama a ninguna IA: el semáforo es el de la ingesta, sin las fichas ni los grupos de
repetidas. Sirve para comparar dos reglas con los mismos datos, no para contar lo que sale en producción. (Con otra hora de corte no sirve: la memoria termina el
23/10 a las 17:17.)

**S1, antes y después** (historias verdes que no estaban en el sitio y quedaban «tarde»):

| Grupo | Historias | Ya en el sitio | Sin salir | Verdes sin salir | «Tarde» **antes** (fuente más vieja) | «Tarde» **después** (regla 314) | Salen de más |
|---|---|---|---|---|---|---|---|
| 8 medios o más | 48 | 23 | 25 | 23 | **18** | **10** | **8** |
| De Balcarce | 12 | 5 | 7 | 7 | 0 | 0 | 0 |
| El resto (nacional, áreas chicas) | 415 | 85 | 330 | 127 | 111 | 111 (no cambia) | 0 |

Las 8 que salen de más (todas con un medio que las publicó hace menos de 8 horas): el Premio Princesa de Asturias a Messi (26 medios; la fuente más vieja
tenía 28,7 h y la mediana 2,8), el sobreseimiento de Milei en la causa $Libra (26; de 26,7 h a 0,9), Estudiantes-Flamengo (19; de 34,1 a 17,6), Hotesur-Los Sauces
(17; de 29,5 a 6,8), el sistema de ascensos del fútbol argentino (22; de 27,7 a 22,9), Julieta Prandi (15; un chimento: la IA lo saca), Tom Skerritt (11; de 26,9
a 23,3) y el motín en la comisaría porteña (8; de 26,6 a 23,2). Tres de las ocho (ascensos, Skerritt, el motín) quedan a menos de una hora de las 24 horas de
la regla 287: salen, pero se van de la ventana enseguida. **El análisis respalda la mediana**: recupera lo que el informe llamó «súper relevante» sin traer nada viejo.
Se probó también la **tercera fuente más nueva** y recupera 15 de 18: es demasiado generosa (alcanza con que tres medios hayan hablado en la última hora de un
hecho de ayer), así que no se usó.

Para Balcarce, esta muestra no tiene ninguna historia «tarde» (ni con la fecha más vieja ni con la mediana): el problema de Balcarce que mide el informe (§ 1.4) es que
**El Diario Balcarce y News Balcarce se ven con 15 y 48 horas de demora**, y eso lo resuelve la decisión D1 del dueño (contar las 36 horas desde que se vio la nota),
no la mediana. Queda hecho para el día en que una historia de acá tenga fuentes de dos días distintos (la Estudiantina del 20 y 21/10 sí: `pruebas/por-que-no-entro-314.test.mjs`).

**S6, antes y después:** de las 475 historias, 262 ya llegan a los medios que pide su sección (se leen primero), 206 sólo podrían salir si la IA les cambia la sección o
si se juntan con otra (se leen al final) y 7 no pueden salir de ninguna manera (no se leen). Se leía todo, en el orden del puntaje. Es poco lo que se deja de leer porque
la historia de 2 medios en una sección que pide 3 **todavía puede salir** (una ficha que la pasa a Cultura, otra nota que la junta), y sacarla de la lectura la dejaría
sin el control de chimentos y publicidad. Lo que se gana es el orden: con unas 3.000 historias por día y un cupo de 200 pedidos de 12 notas, lo que se queda sin leer cuando el
cupo se acaba es lo que menos chances tenía. Si el área chica pide 3 (`MINIMO_AREAS_CHICAS=3`), las de 2 medios dejan de leerse.

**S8, antes y después:** hasta el 23/10 «otros» era el 20 % de lo que llegaba (580 de 2.837 historias en tres días, el informe § 5), sin motivo. Con el código nuevo ese
motivo no existe. Con las mismas 475 historias de la repetición (sin las fichas ni los grupos de la IA): *antes* (fecha de la fuente más vieja) `pocas_fuentes` 187,
`tarde` 142, `publicada` 113, `en_cola` 28, `semaforo_amarillo` 3, `semaforo_dolar` 2; *después* (regla 314) `pocas_fuentes` 187, `tarde` 134, `publicada` 113, `en_cola` 36,
`semaforo_amarillo` 3, `semaforo_dolar` 2. La suma da 475 y `sin_motivo` da 0 en las dos. Las que salen de más por la mediana pasan de `tarde` a `en_cola` (esperan su turno de
redacción) y de ahí, a publicadas. Lo que pasó en producción con las uniones sin IA (`fusion`), los descartes por falta de cuerpo y lo retirado por una persona se va a ver
recién en la estadística de las primeras vueltas con el código nuevo.

**S2, S3, S4 y S8** (lo de producción) no se pueden medir con la repetición (necesitan las fichas, los grupos de la IA y lo publicado vuelta a vuelta); están probados con el caso real de cada uno.

## Cómo cambian las ventanas de 12, 24 y 36 horas (reglas 287 y 293)

Los números no cambian: lo de afuera se estrena con el hecho de hasta **12** horas, lo que cuentan 8 medios o más con hasta **24**, lo de Balcarce con hasta **36**. Cambia
**desde dónde se cuenta la edad del hecho**:

| Qué historia | La edad se cuenta desde… |
|---|---|
| 8 medios o más (ventana de 24 h) | la **mediana** de las fechas de sus fuentes (antes, la más vieja) |
| De Balcarce (ventana de 36 h) | la **mediana** de las fechas de sus fuentes (antes, la más vieja) |
| Lo nacional de 3 a 7 medios y las áreas chicas (ventana de 12 h) | la fuente más vieja, como siempre (la regla de las 12 horas es del dueño, 28/09; qué hacer con ella es la decisión D7 del informe) |

Una historia que es las dos cosas (de acá y de 8 medios o más) usa la mediana y la mayor de las dos ventanas (36 h), como siempre. La mediana se calcula sobre las fuentes
(`origenes`, una por fuente; la principal no se cuenta dos veces), sin las de más de 48 horas antes de que la viéramos (regla 194: son notas viejas de otro hecho que el
cruce pegó) y, si todas son así, sobre todas (la nota es vieja de verdad). **La fecha de la nota nunca rejuvenece:** la fecha con la que ya salió y la primera vez
que se vio siguen compitiendo (`fechaDeLaNota`). Como `fechaReal` es una sola, también cambia la fecha que se muestra y con la que se ordena a las notas nuevas de este
tipo (no a las ya publicadas), y la ventana de 36 horas de la portada se cuenta desde ahí: una historia de 34 medios ya no figura de hace 27 horas porque un anticipo del día
anterior la envejeció.

## Cómo volver atrás

- **S1:** variable de GitHub `FECHA_DEL_HECHO` = `vieja` (en «Actualizar la web», `actualizar.yml`). Vacía o cualquier otra cosa vale `mediana`. **Pendiente de una persona:**
  en la vuelta de Cloudflare (Workers Builds) la variable hay que sumarla a `VARIABLES` de `infra/motor-cloudflare/cargar-variables.mjs` y a `motor-variables.yml` (esta tanda no
  tocó `infra/`); mientras tanto, para volver atrás allá, el único camino es cambiar `FECHA_DEL_HECHO.porDefecto` en `ingesta/fecha-del-hecho.mjs`.
- **S2, S3, S4, S6, S8:** sin interruptor; son correcciones. Cada una se deshace con el cambio chico que la hizo (una condición en `quitarRepetidas`, una función en
  `web/lib/archivo.js`, el orden de `ordenParaLeer`).

## Qué mirar mañana

1. En `web/data/estadistica-seleccion.json`, cada día trae `motivos` y su suma tiene que dar `llegaron`. Si la corrida muestra `Historias sin motivo` es un hueco de la estadística: pasarlo.
2. Cuántas historias de 8 medios o más salen por día (del 21 al 23/10 salían unas 47 de unas 190 por día) y que no aparezca nada de hace dos días.
3. Que no haya notas de acá en el celular «esperando por otro medio que cuenta lo mismo».
4. Que ninguna nota publicada desaparezca sin quedar unida a otra (`publicada_retirada` en los renglones; `publicada_unida` es lo normal).

## Pendiente: S5 (uniones de repetidas con guarda de hecho principal y sin cadenas)

*Actualización del 24/10, más tarde: la S5 se hizo en la regla 322, con otra idea que la de acá abajo (una guarda que sólo separa, con cobertura de palabras raras y un núcleo, sobre los grupos de la IA, y `separarLoDeAca` en el cruce) y medida con el historial de git de `fichas.json` en vez de esperar una semana: `docs/etapa-10-operacion/HECHO-PRINCIPAL.md`. Lo que sigue es lo que se pensó antes de hacerla.*

**No se hizo, a propósito.** El informe encontró cuatro uniones que parecen mal (Discapacidad dentro de vandalismo rural; Palmeiras dentro de la previa de Estudiantes-Flamengo;
«75 familias» dentro del Instituto Adventista; el menor liberado dentro de una nota de opinión). Mirando los grupos que guarda `fichas.json` (20 el 24/10), una guarda de
«hecho principal» no se puede escribir con una regla de texto sin romper lo que ya anda:

- Los grupos los arma la IA por significado. Los títulos de un grupo bueno casi no comparten palabras («Milei celebró su sobreseimiento…» / «La Justicia sobreseyó al presidente…»)
  y los de uno malo a veces comparten casi todas («Diputados aprueba la nueva ley de Discapacidad» / «Diputados aprueba el proyecto para endurecer penas por vandalismo rural»). Un
  umbral de parecido separa mal en las dos direcciones, y errar para el otro lado es publicar la misma noticia tres veces (Boca-Vasco se publicó **ocho**).
- `unirGrupos` suma por transitividad **a propósito** (27/09, McCain: la IA juntó dos de las tres notas y la tercera quedó afuera); quitarla rompe ese caso, y las pruebas de
  `repetidas*.test.mjs` lo cuidan.
- En los 20 grupos que guardaba `fichas.json` el 24/10, 36 de las notas ya no tienen título guardado (el archivo y las muy contadas sólo conservan los de lo publicado); con eso no se puede calibrar nada.

**Cómo hacerlo bien:** (1) guardar en cada grupo el par que lo unió y quién lo confirmó (ya queda en la estadística: `repetida` con `lectura:<id>`), (2) juntar una semana de uniones con
título y medios, (3) marcar a mano cuáles estaban mal y medir con `scripts/medir/calibrar-repetidas.mjs` y `scripts/medir/repetidas-2-0.mjs` qué guarda (número de ley, partido,
nombre propio distinto) las separa sin partir las buenas, (4) recién entonces escribir la guarda en `unirGrupos` con su prueba de los cuatro casos reales. Mientras tanto,
lo que sí protege: S3 (la ya publicada no se pierde por una unión) y la estadística (cada unión dice con quién y por quién).

## Lo que no se tocó

El rojo ni la lista de menores y víctimas; `redes/`, `web/app`, `web/components` ni `infra/`. Quedan para el dueño las decisiones D1 a D8 del informe (ventana de Balcarce desde que
se vio, la verificación baja de un solo medio de acá, el chico muerto sin nombrar, los chimentos de 14 medios, los cuerpos de 50 a 69 palabras, la nota de economía con el dólar,
la ventana de 12 horas de lo nacional y el policial de la Patrulla Rural).
