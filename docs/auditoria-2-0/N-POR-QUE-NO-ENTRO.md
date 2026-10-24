# Por qué no entró: cuando una noticia no sale, tenemos que saber por qué

*24/10/2026, a la mañana. Informe de lectura: no se cambió ningún programa ni ningún dato. La pregunta del dueño: «si una noticia no entra, tenemos que saber por qué». Acá va, con números, qué pasa hoy, dónde se pierde lo que debería salir y qué hay que anotar para que ningún caso quede sin explicación.*

## Cómo se hizo (y qué límites tiene)

- **Datos usados** (de `web/data/`): `estadistica-seleccion.json` (un renglón por historia, de 4 días), `muy-contadas.json`, `portada.json`, `archivo.json`, `fusionadas.json`, `fichas.json` (lo que dijo la IA de lectura), `intentos-ia.json` (los intentos de redacción), `esperando-cuerpo.json`, `vistas.json` (la primera vez que se vio cada nota), `revision-archivo.json`, `retiradas.json`, `celular-pendientes.json`.
- **La historia de git**: cada vuelta (cada media hora) deja un commit con `estadistica-seleccion.json`. Eso permitió ver **cómo fue cambiando el estado de una misma historia** a lo largo de dos días (mirando unas 150 fotos del archivo).
- **Una repetición sin red**: la PC tiene guardada la memoria del cruce de ayer a las 17:17 (6.208 notas con título y fecha). Con ella se corrió el código real de la ingesta (cruce, semáforo, popularidad) fuera del repositorio, una vez con el código de hoy y otra con el de antes de la regla 291 (22/10, 23:47). Sirve para saber **qué diría hoy el semáforo** de cada nota y qué decía antes. No es la producción: es la copia de una PC.
- **Lo que no se pudo saber**: de las historias que no salieron casi ninguna tiene el título guardado (sólo lo tienen las publicadas, las muy contadas y las que estaban en la memoria de la PC). Y la estadística guarda **el último estado de cada historia, no el primero**: por eso hay casos donde sólo se puede inferir la causa. Cada vez que algo es inferencia, lo digo.
- Horas: las de la estadística y del texto son de Balcarce (UTC-3) salvo que diga «UTC». Los commits de git están en UTC.

## Lo más importante, en doce renglones

1. **Casi la mitad de lo que llega no sale por «llegó tarde» (o por un «otros» que en realidad es lo mismo).** En los tres días completos (21 al 23/10) hubo 2.837 historias; 580 (20 %) quedaron en «otros», sin motivo, y 576 de esas 580 (99 %) **nunca tuvieron un solo intento de redacción**: son notas que pasaron todos los filtros, y cuando les tocaba escribirse ya eran «viejas» (esto último es inferencia: la estadística no lo guarda). Desde el 23/10 a la noche «otros» casi no existe (0 de 145 el 24/10), pero lo absorbió «tarde» (56 %).
2. **«Tarde» está mal medido para lo más contado.** La fecha del hecho es la de **la fuente más vieja** de la historia. Cuantos más medios cuentan algo, más probable es que alguno sea un anticipo del día anterior. En la repetición sin red, 14 de las 16 historias de 8 medios o más que no salieron estaban «tarde», y 12 de esas 14 tenían al menos una fuente de menos de 24 horas (entre todas las «tarde» de 8 medios o más, la mediana de la fuente más nueva era de 6 horas).
3. **El caso más grave: la sentencia que sobreseyó a Milei en la causa $Libra (34 medios).** Nunca hubo una nota estable: la historia grande quedó «tarde» porque un anticipo del 22/10 le puso fecha vieja; una de sus versiones salió ocho horas y desapareció; otras tres se unieron a esa que ya no estaba. A las 9 de la mañana de hoy el sitio no tiene ninguna nota sobre el tema.
4. **Tampoco hay nota del juicio de Hotesur-Los Sauces (hasta 21 medios), ni de la continuidad de Scaloni hasta 2030 (hasta 18), ni de la ley de Discapacidad, ni de Palmeiras finalista, ni de las muertes de Saúl Blanch y Tom Skerritt.** Todos eran lo que el dueño llamó «súper relevante».
5. **De cada 100 historias de Balcarce que llegan, salen 47** (76 de 161: 59 siguen en el sitio, 9 se unieron a otra y 8 se publicaron y desaparecieron). Las otras 53: 12 repetidas, 13 tarde, 11 «otros», 6 semáforo, 4 IA, 4 pocas fuentes, 3 sin cuerpo.
6. **El caso Estudiantina:** el sitio publicó la nota del 20/10 sobre el agresor y **cinco notas de reacciones y opiniones** (concejales, un exjefe de la SubDDI, el Concejo), pero **ninguno de los cuatro hechos centrales**: el chico apuñalado y el aprehendido, la suspensión de la Estudiantina 2026 y 2027, el repudio de la Dirección de Juventud, el menor liberado que sigue imputado. Con el código de esos días, tres de las cinco notas centrales daban amarillo; las otras dos se perdieron por otros caminos (ver sección 7).
7. **El semáforo viejo de Balcarce frenó 20 de 143 notas locales** (14 %) con palabras como «niños», «herido», «detenido», «muerte de miles de pollos» o «El Niño» (el clima). Se arregló el 22/10 a las 23:47 con la regla 291, pero lo que ya estaba frenado llegó a «tarde». El incendio del criadero de 12.500 aves en la ruta 226 (4 historias, 5 medios) es el ejemplo: no salió nada.
8. **Lo que se publica y después se une a otra:** 116 notas fusionadas en cuatro días (34, 38, 30 y 14), el 23 % de las 412 «publicadas» de la estadística. La mayoría son bien unidas (Boca-Vasco se publicó **ocho** veces antes de unirse), pero encontré al menos **cuatro uniones que parecen mal**: Discapacidad dentro de la nota de vandalismo rural, Palmeiras dentro de la previa de Estudiantes-Flamengo, «75 familias firmaron escrituras» dentro del cumpleaños del Instituto Adventista, y el menor liberado dentro de una nota de opinión.
9. **La estadística cambia de opinión cada media hora:** 1.118 de 5.696 historias (20 %) pasan de un estado a otro y vuelven (por ejemplo «semáforo, repetida, semáforo, repetida»). Hasta que no se guarde también el primer motivo y la historia de estados, mirar una historia suelta no explica nada.
10. **Los medios de Balcarce llegan con atraso:** News Balcarce (FM 91.7) se ve con una mediana de 48 horas de demora y El Diario Balcarce con 15 (5 de 12 notas con más de 36 horas). Con una ventana de 36 horas para lo de acá, esas notas nacen «tarde».
11. **Notas de Balcarce de un solo medio con «verificación baja»** (STM y OSEBAL, Defensoría y ruta 226, Petruccelli, «Octubre en gris»…) esperan a una persona que nadie ve: cinco en tres días.
12. **Lo que sí está bien:** chimentos, publicidad, dólar del día, clima ajeno, rojo (víctimas y menores, femicidio, abuso) y lo que tenía un duplicado ya publicado se frenaron como se decidió. Los 108 chimentos de un día (22/10) son el motivo más grande de la IA y es una decisión del dueño, no un error.

---

## 1. Todo lo de Balcarce (`esDeAca`)

### 1.1 De cada 100 historias de acá, cuántas salen y por qué no el resto

Tres días completos (21, 22 y 23/10): **161 historias de acá** (37, 72 y 52 por día).

| Qué pasó (último estado) | Cada 100 | Cantidad | Qué quiere decir |
|---|---|---|---|
| Se publicó y sigue en el sitio | 36 | 59 | Salió bien |
| Se publicó y después se unió a otra nota | 6 | 9 | Estuvo en el sitio con otra dirección y se redirige |
| Se publicó y **ya no está** (ni unida ni retirada a mano) | 5 | 8 | Salió y desapareció (ver 1.3) |
| Repetida de otra | 12 | 19 | La IA o el cruce la juntó con otra; a veces con razón, a veces no (sección 6) |
| Tarde | 13 | 21 | El hecho tenía más de 36 horas cuando le tocaba (sección 1.4) |
| «Otros» (sin motivo) | 11 | 18 | Etiqueta vieja: en la práctica, también «tarde» |
| Semáforo | 6 | 9 | Sólo una con la palabra guardada («verificación baja»; ver abajo) |
| La IA la sacó o espera la lectura | 4 | 7 | 3 sin ficha (esperan la lectura), 1 «policial que no es de Balcarce», 2 sin razón guardada |
| Pocas fuentes | 4 | 6 | Un medio de acá que copia lo nacional (correcto) |
| Sin cuerpo | 3 | 5 | Cuerpo corto (35, 56, 66 y 67 palabras) y 1 por antecedente |
| **Total** | **100** | **161** | |

Por día: el 21 salió el 49 % (18 de 37), el 22 el 33 % (24 de 72) y el 23 el 65 % (34 de 52). El 22 es el peor; es el día en que se vieron por primera vez varias notas atrasadas de El Diario Balcarce y News Balcarce (inferido de `vistas.json`).

**La palabra del semáforo:** la estadística recién guarda «el freno» desde el 23/10 y casi no hubo casos de acá (uno: «verificación baja»; el 24/10: «efeméride ajena»). Para los días anteriores la sé repitiendo el semáforo: con el código de antes de la regla 291, **20 de las 143 notas locales de la memoria daban amarillo**:

| Palabra | Notas | Ejemplos |
|---|---|---|
| «niños» | 7 | Rotary dona sillitas a las Unidades de Desarrollo Infantil (7 versiones de 7 medios; salió igual porque lo contaron muchos) |
| «detenido» | 3 | «Detuvieron a un hombre de 31 años que era buscado por la Justicia» |
| «herido» | 2 | «Por varios hechos de violencia se suspendió la Estudiantina» (Acción 5 y News Balcarce) |
| «muerte» / «murieron» | 2 | El incendio del galpón avícola (12.500 aves) |
| «niño» | 1 | «El Municipio intensifica la limpieza de desagües ante la llegada de **El Niño**» (es el clima) |
| «adolescente», «imputado», «apuñalado», «víctima», «acusado» | 1 cada una | El adolescente trasladado a Tribunales; el menor liberado; el motociclista muerto en la 226 |

Con el código de hoy esas 20 dan **verde** («liberada por…»). El problema no es el semáforo de hoy: es que **esas notas ya habían envejecido** cuando se arregló.

### 1.2 Los casos concretos de Balcarce que no salieron

La columna «¿Debió?» es mi opinión con los criterios del dueño («Balcarce entra todo»; el rojo no se toca).

| # | Nota (medio, fecha) | Qué pasó, con el motivo | ¿Debió? |
|---|---|---|---|
| 1 | «Suspenden la Estudiantina 2026 y 2027» (El Diario, La Vanguardia; también Acción 5 y News Balcarce), 20/10 23:10 a 23:45 UTC | Nunca salió como nota. Acción 5 y News Balcarce: amarillo «herido» con el código del 21/10. La de El Diario: verde, pero **se vio recién el 22/10 a las 23:32 UTC (48 h después)**; terminó «repetida». Tres historias distintas para el mismo hecho | **Sí**, es lo más importante que pasó en el pueblo esa semana |
| 2 | «Uno de los adolescentes de la pelea fue trasladado a Tribunales» + «un adolescente de 16 años fue aprehendido acusado de apuñalar a otro joven» (El Diario, La Vanguardia), 21/10 | Amarillo «adolescente» (código viejo) y desde el 21/10 alternó «semáforo» y «repetida» cada media hora; terminó «repetida» | **Sí**, sin nombrar al chico (la IA ya tiene esa regla) |
| 3 | «La Dirección de Juventud expresó su repudio…» (Municipalidad, oficial; Infórmese, El Diario, La Vanguardia), 21/10 11:12 UTC | Se vio a los 20 minutos. Alternó semáforo y repetida durante 24 horas con 10 medios (se había pegado a las notas amarillas de la Estudiantina); terminó «tarde» con 17 medios | **Sí**, es un comunicado oficial |
| 4 | «Estudiantina violenta: el menor aprehendido quedó en libertad y sigue imputado» (La Vanguardia, 0223), 22/10 23:22 UTC | «Repetida»: la IA la juntó con una nota de opinión que a su vez se había unido a la de Blanco Río. Es la única novedad judicial del caso | **Sí** |
| 5 | Incendio del criadero de aves en la ruta 226: 12.500 aves muertas (Radio Gabal, Infórmese, QZ de Mar del Plata), 21 al 23/10 | 4 historias. Amarillo «muerte/murieron» (viejo), después «sin material» (QZ no trae texto), después «tarde». **Cero notas** | **Sí**, tiene impacto productivo en la zona |
| 6 | «Tragedia en la ruta 226: murió un motociclista tras chocar con un camión cerca de Balcarce» (La Vanguardia, 21/10 15:35) | **No figura en la estadística, ni en `vistas.json`, ni en las fichas**: la PC la vio, la producción no la anotó. Con el código viejo daba amarillo («víctima») | **Sí**; a investigar por qué desapareció sin rastro |
| 7 | «75 familias firmaron sus escrituras» (Municipalidad, oficial; La Vanguardia), 21/10 14:29 | La IA escribió «70» seis veces (el título decía 75): el verificador la rechazó por «número». Hoy la IA la tiene **agrupada con la nota del Instituto Adventista (40 años)**, que sí está en el sitio (unión que parece mala: sección 6) | **Sí** |
| 8 | «El Municipio intensifica la limpieza de desagües y canales ante la llegada de El Niño» (El Diario, 22/10 00:42) | Amarillo «niño» (el clima), después «repetida», después «otros». **Ni un intento de redacción** | **Sí** |
| 9 | «Efectivos de la Patrulla Rural colaboran en un megaoperativo en Mar del Plata» (Radio Gabal «Exclusivo», Infórmese, 23/10) | La IA la sacó como «policial que no es de Balcarce»: ficha «región / indirecto» aunque habla de efectivos de acá | **Sí** (dudoso: decisión del dueño) |
| 10 | «Cinco artistas balcarceños clasificaron al escenario mayor de Cosquín», «Comenzaron a instalar televisores en las habitaciones del Hospital» (El Diario, News Balcarce) | Fechadas el 20/10, **vistas 49 y 65 horas después**: nacieron «tarde» | **Sí** (buenas noticias de acá) |
| 11 | «Rugby: Pato Negro y Pato Naranja se enfrentan en la semifinal» (Radio Gabal, 23/10) | Sin cuerpo: tres intentos rechazados por «antecedente» (el copete usaba un «2» de una nota anterior) | **Sí** |
| 12 | «El Chavo del 8 llegó al Hostal de los Abuelos…» (23/10) | Descartada: cuerpo de 67 palabras (el mínimo es 70) | **Sí** |
| 13 | STM y OSEBAL; Defensoría y ruta 226; Petruccelli y salud mental; «Octubre en gris»; Concejo del jueves (todas de un solo medio de acá) | «Verificación baja: espera a una persona». Nadie las ve | A decidir (sección 8, decisión D2) |
| 14 | «Walter Ianni López: China es un socio estratégico» (La Vanguardia) | Tarde (sin fecha en la fuente: se toma la del scrape) | No: es nacional con un entrevistado local; estuvo bien |

**Estuvo bien (frenar o unir):** las siete versiones de «Rotary» se unieron en una; «Maru Botana y su Torta Balcarce» (un medio de afuera; el nombre del postre no es una noticia local); el comentario de Infórmese sobre Milei y Sánchez y su copia de la caída de la economía (son notas nacionales de un medio de acá sin nada de acá: pocas fuentes, correcto); «Detuvieron a un hombre de 31 años» salió una vez en vez de cinco.

### 1.3 Notas de acá que salieron y desaparecieron (8 de 76)

Son las que la estadística cuenta como «publicadas» pero ya no están, ni unidas ni retiradas a mano (en tres días no hubo ni una retirada a mano):

| Nota | Cuánto duró | Por qué (medido o inferido) |
|---|---|---|
| «Estudiantina y violencia: “No podemos mirar para otro lado”» (La Vanguardia) | **1 hora** (21/10, 18:05 a 19:04) | Sin causa guardada. El semáforo del texto escrito («visto al reescribir») es lo más probable |
| «Detuvieron a un hombre de 31 años por una causa de rebeldía» (VAN, 3 medios) | 27 horas (22/10 22:37 a 24/10 01:34) | Inferido, coincide al minuto: su fecha era la de la fuente más vieja del grupo (Puntonueve, 22/10 16:12 UTC); a las 36 horas justas (24/10 01:12) salió de la ventana aunque la nota propia tenía 27 de vida |
| «Una familia balcarceña conoció a Lionel Scaloni en Mallorca» | Salió el 22/10 15:40; hoy está **en pendientes del celular** con el motivo «niño (en otro medio que cuenta lo mismo)» | **Bug seguro:** al unir repetidas, `quitarRepetidas` (`ingesta/lectura-ia.mjs`) le pasa a la que queda el amarillo de la hermana **aunque la que queda sea de Balcarce**, contra la regla 291 |
| Cinco más (`78ya7o`, `ao9ct0`, `fqfkdl`, `m58zlj`, `umqt3y`) | sin datos | Sin rastro; probablemente salieron del tope de 500 notas |

### 1.4 «Tarde» y los medios de acá

La ventana de Balcarce es de 36 horas, medida desde la fecha que trae el medio. La demora entre esa fecha y la primera vez que se vio la nota (sobre las notas de acá de la memoria):

| Medio | Notas | Demora mediana | Con más de 36 h |
|---|---|---|---|
| Municipalidad de Balcarce | 11 | 0,2 h | 0 |
| Radio Gabal | 18 | 0,4 h | 0 |
| Puntonueve | 7 | 0,3 h | 0 |
| Acción 5 | 4 | 1,2 h | 0 |
| **El Diario Balcarce** | 12 | **14,6 h** (máx. 65) | **5** |
| **News Balcarce** | 4 | **48,4 h** (máx. 71) | **3** |
| Diario La Vanguardia | 20 | sin fecha en la fuente (19 de 20): se toma la del scrape | 0 |

Es decir: a dos medios de acá casi no se les puede ganar. **No se sabe** si publican tarde o si la fuente les cambia la fecha; hace falta medirlo antes de tocar la ventana.

### 1.5 Arreglos propuestos para Balcarce

**Seguros** (corrigen algo que contradice una regla ya decidida; todos con prueba):

- **S2.** `quitarRepetidas`: si la nota que queda es de acá (`esDeAca`), no heredarle el amarillo de la hermana (regla 291). Caso real: Scaloni en Mallorca.
- **S3.** Una nota ya publicada no se retira del sitio porque el sobreviviente del grupo todavía no tiene cuerpo (prueba con el caso $Libra y con el de «31 años»).
- **S7.** Verificador de números: cuando el título trae una cifra y la fuente la dice, la IA debe copiarla (hoy escribe «70» por «75»). Es un cambio en la instrucción y en el reintento, no en el verificador.
- **S8.** Registrar la palabra del semáforo en **todo** momento y en cada vuelta (sección 5).
- Prueba para los casos «El Niño» (clima) y «niños» en notas de donaciones: ya dan verde hoy, falta que no se rompa.

**Decisión del dueño:**

- **D1.** Que la ventana de 36 horas de lo de acá cuente desde la **primera vez que se vio** la nota (con tope de 72 horas desde la fecha del medio, que ya existe) para los medios que se demoran (News Balcarce, El Diario).
- **D2.** Qué hacer con una nota de Balcarce de **un solo medio de acá** con «verificación baja»: hoy no sale nunca; podría salir con la etiqueta «fuente única» o esperar una hora a que la confirme otro.
- **D5.** Aceptar cuerpos de 50 a 69 palabras cuando todas las fuentes son de acá y el texto es corto de verdad (cuatro casos en tres días). Cambia la regla «sin cuerpo no se publica» (70 palabras).

---

## 2. Lo muy contado (8 medios o más)

### 2.1 Los números

Tres días: **569 historias** con 8 medios o más (unas 190 por día). Son muchas porque el mismo hecho se parte en varias historias: un partido de Boca llegó a dar una veintena en un día.

| Qué pasó | Cada 100 | Cantidad |
|---|---|---|
| Se publicó | 25 | 142 (64 siguen en el sitio, 41 se unieron a otra, 37 ya no están) |
| «Otros» (sin motivo) | 33 | 186 |
| Tarde | 15 | 88 |
| La IA la sacó | 11 | 64 |
| Semáforo | 9 | 49 |
| Repetida | 5 | 26 |
| Pocas fuentes / sin cuerpo | 2 | 14 |

Si se mira sólo el 23/10 (los estados más al día): 134 historias, **40 salieron (30 %)**, 52 quedaron «tarde» (39 %), 21 «otros», 8 repetidas, 6 IA, 5 semáforo.

**En la repetición sin red** (memoria de ayer 17:17): de 48 historias de 8 medios o más, 32 estaban publicadas por el enlace de alguna fuente y 16 no. De las 16, **14 estaban «tarde»**. Si la fecha del hecho fuera la **mediana** de las fuentes (en vez de la más vieja), 6 de las 14 seguirían vigentes; si fuera **la más nueva**, 12 de 14.

### 2.2 La causa principal: la fecha del hecho es la de la fuente más vieja

`fechaDeLaNota` (`web/lib/archivo.js`) toma la **menor** de las fechas de la nota, de cada fuente, de la fecha ya publicada y de la primera vez que se vio. Las fuentes de más de 48 horas se descartan, pero las de 25 a 47 horas no. Resultado: una historia de 34 medios que empezó el día anterior con un «qué se espera» queda con la fecha del anticipo y a las pocas horas es «tarde», aunque lo último lo haya publicado hace 20 minutos un medio. Con 8 medios o más la ventana debería ser de 24 horas (regla 287) y no lo es.

Ejemplos con fechas (repetición sin red, 23/10 20:17 UTC):

| Historia | Medios | Fuente más vieja | Fuente más nueva | Edad que usa el sistema | Ventana |
|---|---|---|---|---|---|
| $Libra: la Justicia sobreseyó a Milei y a Karina | 26 (luego 34) | 22/10 17:37 | 23/10 20:09 | 26,7 h | 24 h |
| Hotesur-Los Sauces: las claves del juicio | 17 | 22/10 14:45 | 23/10 19:51 | 29,5 h | 24 h |
| Ley de Discapacidad: el oficialismo logró apoyo | 13 | 22/10 09:25 | 22/10 15:41 | 32,1 h | 24 h |
| Murió Tom Skerritt | 11 | 22/10 17:26 | 23/10 14:08 | 26,9 h | 24 h |
| Milei declaró terroristas a cinco organizaciones | 9 | 22/10 08:33 | 22/10 15:26 | 35,7 h | 24 h |

También se ve en el sitio: «Estudiantes clasifica a la final de la Copa Libertadores» figura con fecha del 22/10 a las 12:00 UTC, **unas doce horas antes de que empezara el partido**, porque la fecha es la de una previa.

### 2.3 Los casos concretos (lo más contado que no está en el sitio)

| Hecho | Medios (máx.) | Estado | ¿Debió salir? |
|---|---|---|---|
| Sobreseimiento de Milei y Karina, causa $Libra | 34 | Tarde + grupo de 8 versiones; una salió 8 h y se fue (caso 1 de la sección 9) | **Sí** |
| Juicio Hotesur-Los Sauces (Cristina y Máximo Kirchner) | 21 | 7 historias de 8 a 21 medios: «imputado» (liberado el 23/10 a las 21 UTC), «otros», «tarde» | **Sí** |
| Scaloni sigue hasta 2030 | 18 | 7 historias de 8 a 18 medios: «otros», después «tarde» | **Sí** |
| Ley de Discapacidad (media sanción) | 13 | La nota que salió se unió a la de vandalismo rural; la de trazabilidad de medicamentos, a la de la Ley de Tierras | **Sí** |
| Palmeiras, primer finalista de la Libertadores | 18 | Dos notas unidas a «Estudiantes define ante Flamengo»; las otras, «tarde» | **Sí** (rival posible de Estudiantes) |
| Murió Saúl Blanch (Rata Blanca) | 10 | «Otros» (sección Cultura) | **Sí** |
| Murió Tom Skerritt (Top Gun, Alien) | 12 | «Tarde» | **Sí** (no es policial: no tiene que ver con la excepción de famosos) |
| Atlético Mineiro será rival de Boca en la final | 16 | «Tarde» y «otros» | Parcial (hay una previa del 22/10) |
| Ameba «come-cerebros» en Catamarca (murió un nene de 10 años) | 15 | Amarillo «niño» (queda por la excepción «un chico junto a una muerte») | **Decisión del dueño** (D3) |
| Riesgo país arriba de 700 y dólar en máximo | 16 | «Cotización del dólar: se muestra en /dolar» | Debatible: es nota de economía, no la cotización del día (D6) |
| Desaparición de Nanci Godoy / sus detenidos | 9 a 11 | Amarillo «femicidio»; después «tarde» | Se frena por rojo, bien |
| Facundo Moyano y Candela Arizaga citados | 8 | Rojo «violencia de género» | Bien |
| Chimentos (Prandi-Ortega, Arizaga embarazada, tarotista) | 8 a 14 | «Es un chimento» | Bien según la regla; D4 si 14 medios deberían contar |
| Dólar hoy, clima de Buenos Aires, cronogramas de F1 | 9 a 19 | Descartadas, tarde | Bien |
| Messi y el Premio Princesa de Asturias, Martín Fierro de Radio, Daniel González renuncia, Papa confirmó su visita | 18 a 26 | «Tarde» las versiones nuevas | **Estuvo bien**: ya había una nota publicada sobre el mismo hecho (aunque con fecha vieja) |

Las notas que la IA sacó como «es del extranjero» con 8 a 13 medios (el TAS habilita a Marcos Rojo, Tapia felicita a Estudiantes, la final de la Sudamericana) son de **antes de la regla 288 y de las correcciones del 23/10**; parece que hoy no se repite (en el registro del 24/10 no hay ninguna).

### 2.4 Qué hay que arreglar

**Seguros:**

- **S1.** Para las historias de **8 medios o más** (y para lo de Balcarce), la fecha del hecho para decidir «tarde» debe ser la **mediana** de las fechas de las fuentes (o la de la tercera fuente: cuando alcanzó el mínimo de medios), no la más vieja. Se mide antes con la repetición (script de `scripts/medir/`). Corrige la contradicción con la regla 287.
- **S3.** Que una nota ya publicada no se saque de la portada por la regla de las 36 horas contadas desde la fuente más vieja del grupo, cuando tiene fuentes nuevas.
- **S4.** La sección de una misma historia no puede saltar entre Política y Policiales de una vuelta a otra (pasó con la nota del $Libra).

**Decisión del dueño:**

- **D3.** Lo que cuenta un chico muerto sin nombrarlo (ameba, accidente) con 8 medios o más: hoy sigue frenado a mano; nadie lo ve.
- **D4.** Si un chimento de 14 medios cuenta como «súper relevante».
- **D6.** La nota de economía que menciona el dólar en máximo: ¿sale?

---

## 3. Lo nacional (3 a 7 medios) y las áreas chicas (2 medios)

Los números de tres días:

| Grupo | Historias | Salieron | Tarde + «otros» | La IA | Semáforo | Repetida | Pocas fuentes |
|---|---|---|---|---|---|---|---|
| Nacional, 3 a 7 medios | **811** (270 por día) | 115 (14 %) | **349 (43 %)** | 247 (30 %) | 42 (5 %) | 26 (3 %) | 27 (3 %) |
| Áreas chicas, 2 medios o más | 469 (156 por día) | 66 (14 %) | **229 (49 %)** | 106 (23 %) | 30 (6 %) | 7 (1 %) | 31 (7 %) |
| 2 medios fuera de las áreas chicas | 785 | 1 | 168 (21 %) tarde | **327 (42 %)** | 23 | 14 | **252 (32 %)** |

De las salidas del primer grupo, 37 (32 %) se unieron después a otra nota.

**Lo que dicen los datos:**

- **La mitad de lo nacional y de las áreas chicas se pierde en «tarde» o «otros».** Para lo de afuera la ventana es de 12 horas desde la fuente más vieja, el peor caso del problema de la sección 2.2: de 86 historias de 3 a 7 medios que no estaban publicadas en la repetición, 77 estaban «tarde»; con la fecha en la mediana quedarían vigentes 25 de esas 77 (32 %) y con la más nueva, 50 (65 %). Pero **eso no se puede cambiar solo**: la regla de las 12 horas la puso el dueño el 28/09 («no traer noticias de dos o tres días»). Es decisión del dueño (D7).
- **El caso de «2 medios fuera de las áreas chicas» muestra un error de medición:** 327 de esas 785 historias figuran como «la IA las sacó», pero con 2 medios nunca podían salir. El motivo verdadero es «pocas fuentes» y la estadística lo tapa porque pone a la IA primero en el orden de motivos. Además **gasta lecturas de IA en lo que no puede salir** (S6).
- **Áreas chicas con 2 medios:** llegaron 263 en tres días y salieron 43 (16 %): Cultura 105 (18), Agro 38 (4), Automovilismo 31 (2), Salud 31 (4), Educación 28 (5), Tecnología 20 (7), Ciencia 10 (3). En la repetición, 38 de 53 no estaban publicadas: 34 «tarde» (muchas de Colapinto) y 4 verdes de pocas horas (Canva, Apple y Nvidia, Colecciones Nacionales de Arte).
- **Un error de sección que se repite:** «Estudiantes» (el club) cae en **Educación** por la palabra; de ahí salen «La sorpresa que recibió Estudiantes en el hotel de Río» y «El gesto de dos hermanos que… ver a Estudiantes», con 2 medios, en Educación. La ficha de la IA lo corrige después, pero no siempre.

Ejemplos de lo nacional que no salió (repetición sin red): «Murió Michael Gray, el actor de Shazam!» (6 medios, sacada por la IA), «Dura advertencia de Carrió» (5, otros), «El Banco Ciudad bajó la tasa» (5, tarde), «Cuáles son los feriados de noviembre» (5, tarde). La mayoría son notas de servicio que no hacen falta; las de actores y política sí podían.

**Seguro:** S6, no pedirle a la IA que lea lo que ya no puede salir por cantidad (ahorra cupo y la estadística deja de decir «IA»).

---

## 4. Lo internacional con un argentino

Fichas de la IA de los últimos cuatro días: 546 historias que la IA marcó como «internacional».

| Medios | Historias | Salieron | La IA | Tarde / otros | Otros motivos |
|---|---|---|---|---|---|
| 1 a 2 | 219 | 1 | 149 | 20 | 49 |
| 3 a 7 | 213 | 12 | **136** | 47 | 18 |
| 8 o más | 114 | 17 | 23 | 53 | 21 |

- **El 56 % de lo internacional (308 de 546) lo saca la IA** («es del extranjero»), y de las que sí alcanzaban los medios mínimos fueron 83 el 22/10 y 25 el 23/10. Es lo que se decidió: del extranjero sólo si hay un argentino o 8 medios.
- **Salieron 15** (en el sitio): casi todas con un argentino (Dibu Martínez, Cerúndolo, Colapinto, Messi, Argentina-Marruecos, hockey, tres clubes argentinos) y las que no, por muy contadas (el Papa, 22 medios; Kompany en el Bayern, 8).
- **Lo que no se puede ver**: la ficha dice «internacional» pero no si tiene un argentino. El riesgo conocido es el de la auditoría (hallazgo M4): tres listas distintas de «argentino» y una de ellas ignora a Estudiantes y a Nico Paz. Los seis casos del 23/10 que la IA sacó como «extranjero» con 8 a 13 medios (Marcos Rojo, Tapia, la final de la Sudamericana, el Papa) eran de ese tipo.
- **Seguro:** guardar en la ficha de cada historia **si hay un argentino y cuál** (la figura o el club que lo decidió). Con eso se puede revisar cada semana qué argentinos se pierden.

---

## 5. «Otros» y qué hay que registrar para que no quede ningún caso sin explicación

### 5.1 Cuántas quedan en «otros»

| Día | Historias | «Otros» | % | Con una ficha de IA | Con un intento de redacción |
|---|---|---|---|---|---|
| 21/10 | 969 | 262 | 27 % | 148 | **2** |
| 22/10 | 1.117 | 250 | 22 % | 226 | **2** |
| 23/10 | 751 | 68 | 9 % | 67 | **0** |
| 24/10 (hasta el mediodía) | 145 | **0** | 0 % | | |

«Otros» se calcula así: no se publicó, no la sacó la IA, no es repetida, no es sin cuerpo, no es retirada, no es tarde, y el semáforo la dejó verde. Dicho de otro modo: **la nota era buena y nunca se la pidió a la redactora**. Casi seguro eso es lo que `paraReescribir` descarta por la ventana de estreno: antes del 23/10 a las 21 UTC la estadística no tenía la etiqueta «tarde» y todo eso caía en «otros». El corte se ve en el historial: el 22/10 «tarde» pasó de 0 a 173 y «otros» bajó de 322 a 250.

**Pero «tarde» se volvió la nueva caja negra:** el 24/10, 81 de 145 historias (56 %). Mezcla cuatro cosas distintas: (1) el hecho de verdad tenía más horas; (2) una fuente vieja le puso fecha vieja (sección 2.2); (3) el medio lo publicó tarde (sección 1.4); (4) estuvo esperando en la cola y envejeció. Hoy no se puede separar.

Las otras cajas negras:

| Etiqueta | Qué mezcla |
|---|---|
| «La IA la sacó» (329 el 22/10) | Chimento 108, extranjero 129, policial de afuera 20, publicidad 1, y **71 sin razón guardada** (22 %) |
| «Repetida» | Unida por el cruce, por la IA o por significado: no dice con cuál |
| «Publicada» | Sigue en el sitio, se unió a otra, desapareció: no se distingue |
| «Semáforo» | La palabra recién desde el 23/10, y sólo mientras la historia es la misma |

### 5.2 Qué hay que guardar (propuesta)

La idea: **un renglón por historia que no se sobrescribe**, con el primer motivo y el último, la lista de cambios y el título. Hoy el renglón es `[sección, deAca, medios, resultado, hora, freno]`.

| Campo nuevo | Para qué sirve |
|---|---|
| `titulo` (70 letras) y `medios` (los nombres, no sólo la cantidad) | Hoy sólo lo tienen las muy contadas; sin título no se puede discutir ningún caso |
| `vista` y `ultima` (primera y última vez que se vio) | Saber cuánto vivió y si llegó tarde a nuestra casa |
| `fechaDelHecho`, la **más vieja** y la **más nueva** de las fuentes, `ventana` (12, 24, 36) | Es lo que decide «tarde»: se podría ver de un vistazo cuál fuente la envejeció |
| `primerMotivo` + `cuando` | El primer motivo que la frenó, que **no se pisa** (hoy el último estado borra al primero) |
| `motivo` (código de una lista cerrada, abajo) + `detalle` (60 letras) | El motivo de ahora, en palabras |
| `historial` | Hasta 6 cambios `[hora, estado]` (así se ve el ida y vuelta de las 00 y las 30) |
| `unidaCon` (id) y `por` (cruce, IA, significado) | Para las repetidas: con cuál y quién la unió |
| `salioComo` (id de la nota) y `retiradaPor` (fusión, tope de 500, semáforo, persona, sección) | Para las que se publicaron y desaparecieron |
| `ficha`: ámbito, sección, chimento, publicidad, argentino sí/no | Para las de «la IA la sacó» con su razón |
| `intentos`, `fallas` (de `intentos-ia.json`) | Para las sin cuerpo: cuántas veces y qué rechazó el verificador |
| `cola`: desde cuándo está lista y no se escribió | Para distinguir «tarde» de «no le tocó el turno» |
| Contadores aparte de lo que **no llega a ser historia**: pocas fuentes de un medio, otra ciudad, descarte por sección, fútbol de afuera, policial de afuera, quiniela | Hoy sólo se anotan en el registro de la corrida; la nota de la ruta 226 que la PC vio y la producción no, es un ejemplo |

**Lista cerrada de códigos de motivo:**
`publicada`, `publicada_unida`, `publicada_retirada(causa)`, `repetida(con, por)`, `semaforo(lista, palabra)` (rojo, amarillo, dólar, internacional, promoción, sepelio, efeméride, clima, no es nota), `ia(chimento | publicidad | extranjero | policial_de_afuera | espera_lectura | sin_ficha)`, `pocas_fuentes(tiene, pide)`, `tarde(edad, ventana, fuente_que_envejece)`, `sin_cuerpo(verificador:tipo | corto:N | sin_material | error_ia)`, `esperando_persona(motivo)`, `en_cola(desde)`, `descartada_antes(seccion | otra_ciudad | policial_de_afuera | futbol_de_afuera | quiniela)`, `un_medio`.

**Reglas para que no vuelva a pasar:**

1. «Otros» **prohibido**: si el código no encuentra motivo, escribe `sin_motivo` y el vigilante avisa (cualquier valor distinto de cero).
2. Una prueba que controle que **la suma de los motivos del día es igual a las historias que llegaron**.
3. Un solo orden de prioridad fijo (hoy el orden decide qué etiqueta gana y mueve la estadística: «la IA» le gana a «pocas fuentes»).
4. La estadística debe separar **«última vuelta con la lista de repetidas»** de **«vuelta sin ella»** (hoy alternan, y por eso 20 % de las historias salta de estado y vuelve).

Tocan: `ingesta/estadistica-seleccion.mjs` (`observarCorrida`, `anotarCorrida`), `web/scripts/generar-datos.mjs` (donde se arma `delCruce`), `reels/reescritura.mjs` (`intentos`), `ingesta/lectura-ia.mjs` (`aplicarFichas` y `quitarRepetidas` ya saben el motivo; hay que guardarlo).

---

## 6. La calidad de las repetidas

**Los números:** 116 notas fusionadas del 21 al 24/10 (34, 38, 30 y 14). De las 412 historias que la estadística da por «publicadas» en esos días, **93 (23 %) terminaron unidas a otra**. Tres de las fusionadas se alcanzaron a publicar en Facebook o Instagram.

### 6.1 Lo que se junta de menos (el mismo hecho, varias notas)

- **Boca vence a Vasco da Gama:** se publicaron **ocho** notas y después se unieron a una (con 3, 3, 4, 4, 5, 9, 12 y 16 medios).
- **Estudiantes pasa a la final:** ocho notas (los dichos del técnico, el «uno por uno», los festejos) hasta que se unieron.
- **Diputados, Ley de Inviolabilidad:** tres versiones (5, 18 y 33 medios) publicadas por separado.
- **Colapinto en Austin:** dos notas (13 y 20 medios) unidas a la tercera.

Costo: durante horas el lector ve la misma noticia tres veces, el conteo de «publicadas» sube y se quema cupo de redacción.

### 6.2 Lo que se junta de más (hechos distintos en una sola nota)

| Unión | Qué es en realidad | Evidencia |
|---|---|---|
| «Diputados aprueba la nueva ley de **Discapacidad**» → «Diputados aprueba el proyecto para endurecer penas por **vandalismo rural**» | Dos leyes distintas de la misma sesión | `fusionadas.json` (`arrjxr` → `osvbhw`); la de Discapacidad estuvo visible unas 5 h y después no hay otra |
| «Diputados da media sanción a la ley de **trazabilidad de medicamentos**» → «Ley de Inviolabilidad y Ley de Tierras» | Otra ley de la misma sesión | `djuqer` → `z1rcsy` |
| «**Palmeiras** le gana por penales a Fluminense y avanza a la final» (dos notas) → «Estudiantes define ante Flamengo» | Dos partidos distintos | `3lx6ld` y `7lfamh` → `1rylju8` |
| «**75 familias** firmaron sus escrituras» (Municipalidad y La Vanguardia) → «El Instituto Adventista celebra sus cuarenta años» | Dos actos de la Municipalidad en la misma semana (sin nada que ver) | Grupo de la IA en `fichas.json`: `1hviiat`, `k59a1x`, `nduhgx`; sólo la segunda está en el sitio |
| «Estudiantina violenta: el **menor liberado** y sigue imputado» → nota de opinión de Blanco Río | Novedad judicial y opinión | Grupo `8hc85` + `ji2440`, y `ji2440` ya estaba unida a `rdo3nh` |
| El sobreseimiento de Milei (`1g818co`, `a4m4zi`, `gwfj5u`, `sscp8z`, `uxhjzr`) | Un grupo de 5 que incluye la cena de la Fundación Faro | Grupo en `fichas.json`: **ninguna de las cinco está en el sitio** |

La causa probable es `unirGrupos` (`ingesta/lectura-ia.mjs`): la IA une por la **transitividad** («A es B» y «B es C», entonces «A es C»), y una cadena larga de pares «casi iguales» pega hechos distintos. Cuando una de las notas del grupo ya es la que se ve, las demás desaparecen. No se pudo reconstruir la cadena exacta de cada caso; lo que sí está medido es el resultado.

### 6.3 Qué hacer

**Seguros** (con una medición antes):

- Sólo unir si el par **se confirmó directamente**, sin cadena de más de dos saltos.
- Antes de dejar una sola, comprobar que **la que queda cuenta lo que cuentan las que se van** (por ejemplo, los dos títulos comparten el hecho principal: quién, qué y dónde); si no, queda separada.
- No unir dos notas que **nombran leyes, partidos o comunicados distintos** (título con números, equipos o leyes diferentes).
- Guardar con cada fusión `por` (cruce, IA o significado) y la **distancia** al sobreviviente.
- Antes de tocar nada, medir con `scripts/medir/repetidas-2-0.mjs`, `scripts/medir/calibrar-repetidas.mjs` y `scripts/medir/cruce-coherente.mjs` (ya existen) sobre estos casos reales.

---

## 7. El caso Estudiantina

El orden del hecho, con lo que se publicó y lo que no (horas en UTC salvo que diga AR):

| Cuándo | Qué pasó | Qué hizo el sitio |
|---|---|---|
| 16/10 | La Estudiantina 2026 arranca el lunes | **Salió** (La Vanguardia) |
| 20/10 15:30 | Radio Gabal: «Investigan la edad y el vínculo escolar del agresor» (hubo un chico apuñalado) | **Salió** en Policiales |
| 20/10 23:10 | Acción 5: «Por varios hechos de violencia se suspendió la Estudiantina» | **No salió.** Amarillo «herido» con el código del día; terminó «repetida» (alternaba con semáforo cada media hora) |
| 20/10 23:45 | El Diario: «Suspenden la Estudiantina 2026 y 2027» (+ La Vanguardia, News Balcarce) | **No salió.** Se vio por primera vez el 22/10 23:32 UTC (48 horas después); «repetida» de otra |
| 20/10 23:53 y 21/10 | El Diario y La Vanguardia: adolescente trasladado a Tribunales; aprehendido «acusado de apuñalar» | **No salió.** Amarillo «adolescente»; después «repetida» |
| 21/10 11:12 | Municipalidad: la Dirección de Juventud expresa su repudio | **No salió.** Se vio a los 20 minutos; durante 24 horas alternó «semáforo» y «repetida» con 10 medios (se pegó a las amarillas); terminó «tarde» con 17 |
| 21/10 18:05 | La Vanguardia: «No podemos mirar para otro lado» (docentes) | **Salió y a la hora desapareció** |
| 21/10 21:01 | La Vanguardia: Gonzalo Scioli sobre la violencia | No salió: «tarde» |
| 22/10 15:30 | Puntonueve: Maximiliano Blanco Río pide revisar protocolos | **Salió** |
| 22/10 23:22 | La Vanguardia y 0223: el menor aprehendido quedó en libertad y sigue imputado | **No salió:** «repetida» de otra |
| 23/10 | Concejo Deliberante (Estudiantina, ratas, basura): sesión; Guillén; Debaten alternativas; Petruccelli | **Salieron** cuatro notas |

**Resultado:** se publicó una nota del hecho (el 20/10, sobre el agresor), **cinco de reacciones, opinión o política** y una sexta que duró una hora; y quedaron **cuatro hechos centrales sin nota**: el chico herido y el aprehendido, la suspensión, el repudio de Juventud y el menor liberado. Ninguna nota estuvo retirada a mano.

**Cómo cayó cada una (inferido de los estados de git y de la repetición):**

1. El semáforo anterior al 22/10 23:47 frenaba por «adolescente» y «herido»: de cinco notas centrales, tres daban amarillo (las otras dos, verde). Nadie aprobó las amarillas.
2. Las notas se pegaron entre sí en historias de 4 a 17 medios que mezclaban secciones (Educación, Policiales, Balcarce) y, a veces, se heredaba el amarillo de la hermana.
3. El 22/10 a las 23:47 se liberó el amarillo de Balcarce, pero ya habían pasado 36 horas del 20/10: «tarde».
4. Cuando todavía estaban a tiempo, una parte alternaba entre «semáforo» y «repetida» según la vuelta (el estado era distinto cada media hora).
5. El Diario Balcarce (que tenía la nota de la suspensión) la mostró 48 horas más tarde.

**Qué arreglar:** los seguros S1 (fecha), S2 (no heredar el amarillo en Balcarce), S8 (registrar los motivos) y la decisión D1 (ventana desde que se vio la nota). Y una mirada especial a la regla de los menores: cuando hay un chico involucrado, la IA ya tiene la instrucción de no nombrarlo; lo que no se puede es que el hecho **no salga**, porque entonces la gente se entera por los comentarios y los reclamos, no por nosotros.

---

## 8. Resumen de arreglos

### Seguros (no cambian lo que el dueño decidió; corrigen contradicciones o mejoran la medición; cada uno con su prueba)

| # | Qué | Por qué | Dónde |
|---|---|---|---|
| S1 | La fecha del hecho para «tarde», en 8 medios o más y en Balcarce, es la mediana de las fuentes (o la de la tercera) y no la más vieja | Contradice la regla 287; explica el $Libra, Hotesur, Scaloni, Skerritt, Palmeiras | `fechaDeLaNota` en `web/lib/archivo.js`, `fechaReal` en `generar-datos.mjs` |
| S2 | No heredar el amarillo de la hermana si la que queda es de acá | Contradice la regla 291; caso Scaloni en Mallorca | `quitarRepetidas` en `ingesta/lectura-ia.mjs` |
| S3 | Una nota publicada no se saca porque el sobreviviente no tiene cuerpo o porque la fuente más vieja del grupo ya tiene 36 horas | $Libra, «31 años», yxroaa | `quitarRepetidas`, `vigenteEnPortada` |
| S4 | La sección de una historia no cambia entre vueltas (Política/Policiales) | $Libra | `clasificar` |
| S5 | Uniones de repetidas con guarda de hecho principal y sin cadenas | Discapacidad, Palmeiras, 75 familias, menor liberado | `unirGrupos` |
| S6 | No leer con IA lo que no puede salir por cantidad de medios y que la estadística ponga «pocas fuentes» antes que «IA» | 327 de 785 historias de 2 medios figuran como «IA» | `generar-datos.mjs`, `estadistica-seleccion.mjs` |
| S7 | Que la IA copie la cifra de la fuente (75 por 75) | Escrituras de 75 familias: seis intentos fallidos | `CRITERIO-EDITORIAL.md` § 12 y `reels/reescritura.mjs` |
| S8 | Registrar los motivos: sección 5 | «Otros» y «tarde» no explican | `ingesta/estadistica-seleccion.mjs` |
| S9 | Medir la demora de cada medio de acá (publica tarde o lo vemos tarde) | News Balcarce 48 h, El Diario 15 h | `ingesta/auditar-fuentes.mjs` |

### Decisiones del dueño

| # | Pregunta |
|---|---|
| D1 | ¿La ventana de 36 horas de lo de acá cuenta desde que lo vimos (con el tope de 72 h que ya hay)? |
| D2 | ¿Una nota de Balcarce de un solo medio con «verificación baja» sale con la etiqueta «fuente única»? |
| D3 | ¿Una muerte de un chico sin nombrar (ameba, accidente) con 8 medios o más sale? |
| D4 | ¿Un chimento de 14 medios cuenta como súper relevante? |
| D5 | ¿Se aceptan cuerpos de 50 a 69 palabras en lo de acá? |
| D6 | ¿Sale la nota de economía que menciona un máximo del dólar o del riesgo país? |
| D7 | ¿La ventana de 12 horas para lo nacional se mide desde la mediana de las fuentes? (hoy desde la más vieja) |
| D8 | ¿«Policial que no es de Balcarce» incluye lo que hacen efectivos de Balcarce afuera (Patrulla Rural)? |

---

## 9. Los diez casos más importantes

Orden: primero lo que más daño le hace al medio.

| # | Caso | Qué pasó | Arreglo seguro | Decisión del dueño |
|---|---|---|---|---|
| 1 | **$Libra: sobreseyeron a Milei y a Karina** (34 medios) | Primera aparición 23/10 20:08 UTC (17:08 AR). «Otros», después semáforo (la palabra no se guardó; una hermana, `tpg5x6`, quedó en «denuncia»), después «tarde» desde las 21:06 UTC: la fuente más vieja (22/10 17:37) es un anticipo. Mientras tanto una versión (`uxhjzr`, 8 medios) **salió a las 21:35 AR y a las 05:34 AR del 24/10 ya no estaba**, con 3 duplicados unidos a ella; su sección saltó entre Política y Policiales. Hoy no hay nota | S1, S3, S4 | |
| 2 | **Hotesur-Los Sauces** (juicio a Cristina y Máximo, hasta 21 medios) | Siete historias de 8 a 21 medios: amarillo «imputado» hasta el 23/10 a las 21 UTC y después «tarde» (fuente más vieja del 22/10 14:45). Cero notas el día de la víspera del juicio | S1 | |
| 3 | **Estudiantina** (Balcarce) | Sección 7: cinco reacciones y una nota del agresor, ninguno de los cuatro hechos centrales | S1, S2, S8 | D1 |
| 4 | **La fecha del hecho es la de la fuente más vieja** | 14 de 16 muy contadas sin salir estaban «tarde»; 12 tenían una fuente de menos de 24 horas | S1 (con medición previa) | D7 para lo nacional |
| 5 | **Uniones indebidas** | Discapacidad → vandalismo rural; Palmeiras → previa de Estudiantes; 75 familias → Instituto Adventista; menor liberado → opinión | S5 | |
| 6 | **Notas que salen y desaparecen** (8 de Balcarce de 76; 93 de 412 en total unidas) | `yxroaa` duró una hora, `xykr3v` 27 horas, `1i9rlqx` (Scaloni en Mallorca) quedó «esperando una persona» por un «niño» de otra versión | S2, S3 | |
| 7 | **Balcarce frenado por el semáforo viejo** (20 de 143 notas locales) | «Niños», «herido», «detenido», «muerte de miles de pollos», «El Niño» (clima): incendio de las 12.500 aves, la ruta 226, las escrituras. Hoy dan verde | S8, prueba de los casos | |
| 8 | **Medios de acá que se ven tarde** (News Balcarce 48 h, El Diario 15 h) | Cosquín, televisores del Hospital, Ley Ema, suspensión de la Estudiantina: nacieron «tarde» | S9 | D1 |
| 9 | **Verificador de números y cuerpos cortos** | 75 familias escritas «70» seis veces; cuerpos de 35, 56, 66 y 67 palabras en tres días | S7 | D5 |
| 10 | **Lo muy contado sin motivo registrado** (Scaloni 2030, Saúl Blanch, Tom Skerritt, Palmeiras; 186 muy contadas en «otros») | Nadie sabe por qué no salieron: la estadística no lo guarda | S8 y las reglas de la sección 5 | D3 (ameba), D4 (chimentos), D6 (riesgo país) |

## Orden de trabajo sugerido

1. **S8** (registrar motivos) primero y solo: no cambia lo que se publica, y todas las discusiones siguientes se hacen con datos.
2. **S2 y S3** (no heredar el amarillo en Balcarce y no sacar lo ya publicado): son bugs claros con caso real.
3. **S1** con una semana de medición (la repetición ya está probada): subir la fecha del hecho a la mediana sólo en 8 medios o más y en Balcarce, y ver en la estadística cuántas notas más salen.
4. **S5** con `scripts/medir/` antes de tocar nada.
5. Las ocho decisiones, en una sola tanda de preguntas al dueño.

*Lo que queda para otro informe:* por qué la producción no registró la nota del motociclista de la ruta 226; si El Diario Balcarce y News Balcarce publican tarde o se ven tarde; y la medición de cuántas notas de afuera de 3 a 7 medios, con la fecha en la mediana, serían de verdad útiles (hoy sería el 32 % de las «tarde»; muchas son notas de servicio que no hacen falta).
