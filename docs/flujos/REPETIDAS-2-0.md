# Repetidas y fechas 2.0: una noticia, una nota, con su fecha

*17/10/2026. Ejecuta la parte de repetidas y fechas de la auditoría 2.0 (`docs/auditoria-2-0/02-FUENTES-CRITERIO-REPETIDAS.md`
§ 2.3, 3 y 5.3, y `04-IA-Y-MODELOS.md` § 1 y 2). Reglas 193 a 196 de `docs/10-REGLAS-Y-PRUEBAS.md`. Sin costo nuevo: la huella
usa `gemini-embedding-001` con la clave de clasificación que ya existe (gratis), y la IA que confirma es la de siempre.*

## Qué se arregló

| | Qué pasaba | Qué hace ahora | Dónde |
|---|---|---|---|
| **Memoria de lo de acá** (195) | La memoria del cruce guardaba sólo lo de afuera. Radio Gabal trae 3 notas por feed: cuando El Diario Balcarce publicaba lo mismo al otro día, la de Gabal ya no estaba y nacía otra nota | Guarda también lo de acá, **72 horas**. Lo de acá que sólo está en la memoria no vuelve a aparecer; sirve para que lo nuevo se le sume y conserve la dirección publicada. `MEMORIA_DE_ACA=no` lo apaga | `ingesta/cruce.mjs`, `ingesta/ingesta.mjs` |
| **Parejas con IA** (195) | Sólo de la misma sección y contra lo que seguía en la portada (36 h). SUTEBA en Balcarce y en Política nunca se preguntaba | Lo de acá, también entre secciones; contra lo publicado de **72 horas** | `parejasSospechosas` (`web/lib/repetidas.js`), `web/scripts/generar-datos.mjs` |
| **Huella de significado** (195) | El mismo hecho con otras palabras («Campo de Pato clasifica a sus dos equipos» / «Pato Naranja y Pato Negro clasifican…») no llegaba a ningún umbral de palabras | Cada nota de acá nueva se compara por significado con lo de acá de 72 h (cualquier sección). Con parecido **0,88** o más, las dos más parecidas van a la IA; de las que confirma, se une a **una sola** (en estrella, sin encadenar). Queda la publicada; la otra redirige | `ingesta/huellas-significado.mjs` |
| **Anuncio y resultado** (195) | La IA juntaba «Giuliana Romero afronta una nueva cirugía» con «…afronta con éxito su cuarta cirugía» | La instrucción de las parejas explica qué es un anuncio y su resultado | `INSTRUCCION_PAREJAS` (`ingesta/lectura-ia.mjs`) |
| **Tope repartido** (196) | 60 vueltas por día «hasta que se acaben»: el 16/10 se acabaron a las 15:06 | A cada hora se puede haber gastado lo del día transcurrido más media hora; lo que trae algo de acá nuevo se adelanta hasta 6 | `cupoDelMomento` (`ingesta/lectura-ia.mjs`) |
| **Fechas** (194) | La fecha de la historia era la de su nota más vieja: una nota vieja de otro hecho pegada por el cruce la envejecía (Concejo Estudiantil: publicada el 14/10, fecha 30/04) | Las fuentes de más de **48 h** antes de la primera vez que se vio la nota no la envejecen; las ya publicadas así se corrigen una vez a la primera vez que se vieron | `fechaDeLaNota`, `conFechaSinError` (`web/lib/archivo.js`) |
| **Groq** (193) | El respaldo de la lectura con IA no sabía los nombres de los campos y se descartaban todas sus fichas | El pedido a Groq lleva la forma exacta, armada con el mismo esquema; se acepta «ámbito»/«Región» | `formaDeLaFicha`, `fichaDeGroq` (`ingesta/lectura-ia.mjs`) |

## Cómo queda el camino de una nota de acá

1. **Cruce** (con la memoria de acá): si es la misma nota que otro medio de acá contó hace menos de un día y medio con palabras
   parecidas, ya entra como la misma historia (y con su dirección).
2. **Regla 171 y 175** (sin IA): títulos muy parecidos o las mismas fuentes contra lo publicado de 72 h. Igual que antes.
3. **Parejas** (IA): las sospechosas por título (ahora también entre secciones para lo de acá) y **las de significado**, en un
   solo pedido por corrida (hasta 30 parejas), con el tope de 40 por día repartido por hora.
4. **Unión**: lo confirmado se une como siempre (`repetidasConOtraDireccion`): queda la que ya estaba (el ancla) y la nueva
   redirige; la que queda suma las fuentes de la otra.

Lo que no cambia: un anuncio y su resultado son dos notas (la marca del título lo separa antes de preguntar, y la IA lo sabe);
lo publicado conserva su dirección; lo de una persona no se une solo; lo de afuera no pasa por la huella (ya se filtra por
medios).

## Mediciones (con los datos reales del 17/10)

**Repetidas.** Simulación de la capa nueva sobre lo de acá publicado del 29/09 al 16/10 (296 notas), en el orden en que salió
cada una, con el código del motor y la IA de verdad (Gemini Flash-Lite gratis); una nota que se une ya no se publica
(`scripts/medir/repetidas-2-0.mjs`).

| | Resultado |
|---|---|
| Copias de más publicadas del 12 al 16/10 (Campo de Pato 3, SUTEBA 1, LALCEC 1, educación vial 1, Tamangueyú 2) | **se atajan las 8** (en otra pasada, sólo de la última semana con `medir-repetidas-2-0.mjs --dias=7`, 7: la IA no unió la de Radio Gabal de Tamangueyú con la de La Vanguardia) |
| Uniones en todo el período | **29** (1,5 por día): **27 la misma noticia**, 2 dudosas («Esteban Reino destaca el impacto económico…» / «El automovilismo deja 2.700 millones»; «El Concejo discute las intimaciones de Aguas…» / «Cassini defiende las intimaciones…»), **ninguna claramente distinta** |
| De esas 29, cuántas ya agarraba algo de antes | 5 la regla 171; 10 las parejas por título (con el cambio de sección); **19 sólo la huella** |
| Preguntas a la IA | 46 en 19 días (**2,4 por día**, 6 el peor día): casi siempre entran en un pedido por corrida |
| Huellas por día | ~16 (una por nota de acá nueva; las demás, de la caché). El cupo gratis es de 100 por minuto |

- **Con la instrucción de antes** la misma simulación unía 32: además de las de arriba, dos distintas (la cirugía de Giuliana
  Romero, anuncio y resultado; la charla de los Bomberos, anuncio y crónica) y algunas buenas que la nueva no une (la final de
  paleta de Campo de Pato, el banco de fisiatría). La IA no es determinista del todo: con la nueva instrucción unió Tamangueyú
  completo (las tres notas) y la anterior dejaba una. **Se eligió la instrucción más estricta**: juntar dos noticias distintas
  es lo peor (Andrés y Hernán quieren más notas, no menos).
- **El umbral.** Las 73 parejas etiquetadas «misma noticia» (`scripts/medir/etiquetas-duplicadas.json`) y los diez pares de
  los cinco casos tienen parecido **0,886 a 0,998**; dos notas distintas del mismo tema, 0,855 a 0,941. La huella sola no
  decide: elige a quién preguntar. Con 0,86 aparecía una unión de más y era falsa («Más de 1.400 vehículos…» / «…2.700
  millones», 0,872): por eso 0,88.
- **Una etiqueta revisada**: «Campo de Pato disputa el Torneo Regional de Clubes F en Bahía Blanca» / «Social Pato compite en el
  Torneo Regional Sub-16…» estaba como «no» y es la misma noticia (las dos anuncian el mismo torneo del Sub-16).
- **La memoria de acá** sola no se pudo medir aparte (la memoria de la PC no tenía lo de acá). En dos armados de prueba con los
  feeds de verdad (16/10 a las 23, sin claves de IA, en una copia aparte): la memoria sumó 106 notas de acá (~90 KB), la cantidad de historias quedó
  igual (604 y 605) y no se partió ni se juntó nada raro. Junta sólo lo que el cruce coherente deja: hasta 30 horas (48 si es
  casi igual). Lo de más lejos (Campo de Pato, 63 horas) lo ataja la huella.

**Fechas.** Sobre el archivo y la portada del 17/10 (1.112 notas de medios):

| Desfase entre la fecha y la primera vez que se vio | Antes | Después |
|---|---:|---:|
| Más de 3 días | **80** | **11** |
| Más de 48 horas | 114 | 25 |
| Más de 24 horas | 167 | 78 |

- Se corrigen **89** (todas automáticas, vistas después del 28/09). Las 11 que quedan son anteriores al 28/09 a la tarde, cuando
  todavía se estrenaban notas viejas: no se puede probar que sean un error y se dejan.
- **Ninguna vuelve a la portada** (todas tienen más de 36 horas igual).
- Lo de 24 a 48 horas **no se toca a propósito**: casi siempre es el mismo hecho contado antes por otro medio (El Diario Balcarce
  que republica dos días después lo que Infórmese contó el 13/10). Ahí la nota envejece de verdad.
- Efecto de costado: con las fechas corregidas, «Lautaro Martínez alcanza a Agüero como goleador histórico» (1/10) y «…como
  tercer goleador histórico» (4/10) quedan a menos de 96 horas y se unen por el título: eran la misma noticia.

**El tope de la IA de repetidas.** Con el reparto por hora, a las 15:06 se pueden haber gastado 39 de las 60 (no las 60); con
la web armándose 72 veces por día y la lista cambiando en cada vuelta hay pedidos en las 24 horas; con las 48 vueltas de
siempre no frena ninguna.

## Lo que necesita una persona

- **Nada que subir a mano.** No cambia ningún Worker ni ningún workflow: la huella va con la clave de clasificación que ya está
  en el paso «Buscar noticias y armar los datos», y su caché (`.cache/huellas-significado.json`, ~6 KB por nota, unos 1,3 MB)
  viaja en la misma caché de Actions que la memoria del cruce.
- **Mirar en el registro de «Actualizar la web»** las primeras corridas: «parejas: N preguntadas (M por significado), K son la
  misma noticia» y «misma noticia (IA): … / …». Si aparece una unión mala, se deshace borrando su renglón de
  `web/data/fusionadas.json` (o aprobando la nota desde el celular).
- **Si algo sale mal**: `MEMORIA_DE_ACA=no` (variable de GitHub) apaga la memoria de acá. La huella se apaga sola si Google no
  contesta (queda lo de antes).
- **Workers AI (bge-m3) no hizo falta.** Si un día Gemini deja de dar la huella gratis, la alternativa es sumarle una ruta
  `/huella` al Worker de imágenes (`infra/imagenes-cloudflare/`, mismo token) y recalibrar el umbral: otro modelo da otros
  números.
- **Medir cada tanto**: `node scripts/medir/repetidas-2-0.mjs --dias=7` (gasta cupo gratis: una huella por nota de acá y
  pocas preguntas) y leer cada unión.

## Riesgos

- **Una unión mala esconde una noticia** (la nueva redirige a otra). Medido: 0 claras en 29, 2 dudosas. La instrucción es
  estricta («ante la duda, no») y un anuncio y su resultado se separan antes de preguntar.
- **La IA no es determinista del todo**: la misma pareja puede salir distinta otro día. Lo contestado se guarda
  (`fichas.json`, `repetidas.significado`) y no se vuelve a preguntar.
- **Cupo**: las huellas comparten proyecto con la lectura y las fotos, pero el de embeddings es un cupo aparte (100 por
  minuto). Las preguntas a la IA suman ~1 pedido por corrida cuando hay algo nuevo, dentro de los 40 por día de siempre.
- **La fecha corregida** de las 89 notas pasa a la primera vez que se vieron: puede quedar hasta 12 horas más nueva que la de
  verdad (se estrenaron con el hecho de menos de eso). Cambia el orden en las páginas de sección, no la dirección.
