# Todas las notas de Balcarce: dónde se pierden y cómo abrir el flujo

*Medido el 16/10/2026 con datos reales (lo publicado, lo que esperó y lo que se leyó de las fuentes de acá) y con una corrida de la ingesta sin IA. Pedido de Hernán: "hay que cambiar todo el flujo; la idea es que TODAS las notas de Balcarce salgan". Lo que se cambió en el código es la **regla 180** (`docs/10-REGLAS-Y-PRUEBAS.md`); el resto queda como propuesta para que lo decidan Hernán y Andrés. No se tocó el semáforo rojo ni la lista de sepelios, ni las palabras de menores y víctimas, ni las reglas de redes.*

---

## Lo importante, para leer en cinco minutos

**Cuánto llega y cuánto sale.** Los medios y organismos de Balcarce (Municipalidad, Concejo, Facultad de Agrarias, las radios, El Diario, La Vanguardia, Acción 5) publican unas **40 notas por día**, que son unos **24 hechos distintos** (la misma noticia la cuentan dos, tres o cuatro de ellos). En los dos días medidos con lupa (14 y 15/10) hubo **48 hechos**:

| Qué pasó | Hechos | De cada 10 |
|---|---|---|
| Salieron | 34 | 7 |
| Ya habían salido antes (El Diario contó el 15/10 lo que Acción 5 había contado el 12/10) | 3 | 0,6 |
| Eran copias de noticias nacionales sin nada de Balcarce (Mayra Mendoza, Milei, Alberto Fernández): bien que no salieron como de Balcarce | 3 | 0,6 |
| **Eran de Balcarce y no salieron** | **8** | **1,7** |

O sea: **de cada 10 noticias de Balcarce salen 8; se pierden unas 4 por día.** En 14 días (2 al 15/10) salieron 346 notas con al menos un medio de acá entre sus fuentes (casi 25 por día).

**Por dónde se caen** (14 días, sólo lo de acá que nunca salió; una misma noticia puede contar dos veces si cambió de "número de nota"):

| Puerta | Cuántas | Qué es, en criollo |
|---|---|---|
| 1. Una palabra que frena (semáforo amarillo) | ~92 | "detenido/acusado/imputado" (30), "niño/niña/adolescente" (33), "murió/falleció/herido" (18), "víctima/homicidio" (6), "denuncia" (5). Casi un tercio la encuentra recién en el texto completo de la fuente o en lo que escribió la IA, no en el título. Espera a una persona, y esperar casi siempre es no salir. |
| 2. Sin cuerpo | ~52 | La IA no logra escribir 70 palabras que pasen el verificador: copia frases de la fuente (15), pone un dato que la fuente no tiene (15), la fuente trae muy poco texto (14), cosas de forma (3), un "niño" en lo que escribió la IA (5). |
| 3. Verificación BAJA | 19 | Un solo medio de acá con declaraciones de una parte ("Aparicio llamó a reflexionar", "Huele mal: fuertes cruces…"). La regla dice que BAJA no sale sola. |
| 4. Espera la lectura con IA por no decir "Balcarce" | 17 | Un medio u organismo de acá que no nombra a Balcarce espera a que la IA lo lea. Algunas eran copias nacionales (bien frenadas); otras eran del Hospital, del hockey del Pato, del INTA en el Concejo. |
| 5. Las que nadie ve | pocas, pero fijas | (a) La IA dice "es de la región" y la nota de un medio de acá pasa a pedir 2, 3 o 4 medios como si fuera de afuera: queda como relleno, ni siquiera llega al celular. (b) Una nota vieja de un feed de acá (el Concejo trae notas de marzo) queda pegada a una nueva y la hace "llegar tarde". (c) La lista roja (una). |

**Ejemplos reales de noticias de Balcarce que no salieron (14 y 15/10):**

- *"Petruccelli presentó un proyecto para fortalecer la atención de salud mental"* (Concejo, contado por 4 medios): **lista roja**, por la palabra "suicidio" (era un proyecto de prevención).
- *"Todos por Rufino: un espectáculo solidario en el Teatro Municipal"* (Municipalidad): **"niño"** en el texto completo; esperó, y después "llegó tarde".
- *"El paro de ATE tiene un 83 % de acatamiento en las escuelas de Balcarce"* (La Vanguardia): **"adolescente"** en el texto completo.
- *"Asustarse y silenciar no sirve: Aparicio llamó a reflexionar"* (Radio Gabal): **verificación BAJA**.
- *"Arte Fusión · Expo Anual 2026, en exposición en el MUHBA"* (Municipalidad): **sin cuerpo**; el comunicado tiene 38 palabras y la IA no llegó a 70 en tres intentos.
- *"Convocan a una nueva movilización para reclamar justicia por Claribel Medina"* (Infórmese Primero): **sin cuerpo** (el verificador la rechazó nueve veces por copiar 14 palabras seguidas) y después **"murió"**.
- *"La 22ª Fiesta Nacional del Postre se realizará el 30 y 31 de octubre y el 1 de noviembre"* (Municipalidad): quedó pegada a una nota de Ahora Balcarce del 3/10 y **"llegó tarde"**. *(Arreglado.)* La nueva fecha igual se había publicado por Acción 5.
- *"La AZK completó la séptima fecha con buenos resultados de los locales"* (El Diario): la IA dijo "región", pasó a pedir 2 medios de Automovilismo y **quedó como relleno**. *(Arreglado.)*
- Y del 16/10: *"Torneo de Vóley con 13 equipos"* (Municipalidad y Radio Gabal): **"adolescente"**.

**Lo que ya se cambió (regla 180), sin tocar el semáforo:**

1. **Lo que cuenta un organismo de Balcarce, o un medio de Balcarce nombrando algo de acá, ya no se cae por "un solo medio" ni ocupa el cupo de lo de afuera**, aunque la IA diga que es "de la región". Y conserva su página. (La AZK.)
2. **"Balcarceños" y "balcarceñas" en plural cuentan como de acá.** Antes "cuatro atletas balcarceños" hacía esperar a la nota por "no nombrar nada de acá".
3. **La Municipalidad, el Concejo y la Facultad no esperan a la IA** por no decir "Balcarce" ("Sábado a puro básquet", "El hospital incorporó una nueva mesa de cirugía"). La IA la lee después y la puede sacar igual que antes.
4. **Lo viejo de un feed de acá que nunca salió ya no entra** (más de 72 horas, como ya pasaba con lo que se lee de la página de El Diario y La Vanguardia). Eran 47 notas viejas en cada corrida (42 historias muertas) que además arrastraban a las nuevas. (La Fiesta del Postre.)

En dos corridas seguidas del 16/10, una con el código de antes y otra con el nuevo: de unas 40 historias con algo de acá de las últimas 48 horas, **las que quedan verdes sin publicar pasan de 7 a 11**, y desaparece el ruido de 42 historias viejas. Lo que copia un medio de acá de una noticia nacional, sin nombrar nada de acá, **sigue igual que antes** (espera a la IA y pide los medios de su sección).

**Lo que tienen que decidir Hernán y Andrés** (detalle y riesgos en la sección 6). Ordenado por cuánto rinde:

| | Propuesta | Rinde (14 días) | Riesgo | Toca |
|---|---|---|---|---|
| P1 | Soltar "detenido/acusado/imputado" en lo de acá cuando el texto lo atribuye a la Policía, la Fiscalía o la Justicia | hasta 30 | Medio | semáforo amarillo |
| P2 | "Adolescente/niños" en notas de organismos de acá sobre deporte, escuela o cultura, sin palabras de delito, accidente o salud | ~15 | Medio | semáforo amarillo |
| P3 | La despedida de un vecino conocido ("Chiqui" Smiraglia, Pascualito Cerone) contada por dos medios de acá, sin palabras de accidente ni de policía | ~9 | Medio | semáforo amarillo (muerte) |
| P4 | Verificación MEDIA (no BAJA) para un medio de acá que cita con nombre a una figura pública local | ~19 | Medio | verificación |
| P5 | "Breve": un comunicado oficial corto sale con 45 palabras en vez de 70 | ~5 | Bajo | regla del cuerpo |
| P6 | El verificador acepta citas textuales más largas de un comunicado oficial de acá | ~15 | Bajo | verificador |
| P7 | La IA no puede sacar por "sin relación" o "policial de afuera" lo que es de un organismo de acá o nombra a Balcarce | pocas | Bajo | lectura con IA |
| P8 | Señales de acá sin decir "Balcarce" (el Hospital Municipal, el Teatro Conti, la Policía Comunal, "nuestra ciudad") y, si no, la espera a la IA dura 2 horas como mucho | ~10 | Medio | lectura con IA |
| P9 | Lo de acá se compara contra 7 días de lo publicado (no 3), para que el refrito de El Diario no salga dos veces | evita repetidas | Bajo | repetidas |
| P10 | La lista roja: "prevención del suicidio" de un organismo, que espere a una persona en vez de no salir nunca | 1 | **Alto** | **lista roja** |
| P11 | Una pestaña "De Balcarce para revisar" en el celular, con el motivo en una línea | lo que espera | Ninguno | panel |

Antes de P1 o P2 hay que cerrar los dos huecos que ya avisó `docs/etapa-1-fuentes/DIAGNOSTICO-POLICIALES-CIENCIA-IA.md` § 5 ("un menor que…" y "abusaron de ella" pasan sin frenar). De hecho, *"Policía intercepta una moto robada y notifica a un menor"* salió publicada el 13/10.

---

## 1. Cómo se midió

- **Lo que se lee de acá**: las 15 fuentes de Balcarce (`FUENTES`, `alcance: 'local'`), en una corrida de `ingestar()` sin IA del 16/10 a la mañana, con la memoria del cruce copiada y los identificadores publicados de la nube (`origin/main`). Cada nota de un medio de acá se buscó en lo publicado por su enlace (en `fuentesConsultadas` de 730 fotos de `portada.json` del 2 al 16/10 y en `archivo.json`) y, si no estaba, en lo que esperó a una persona (`pendientes` de esas fotos), lo que esperó cuerpo (730 fotos de `esperando-cuerpo.json`), las fichas de la IA (`fichas.json`, una foto cada 6 horas), `intentos-ia.json`, `vistas.json` y `fusionadas.json`.
- **La ventana con lupa**: 14 y 15/10 (hora de Balcarce). El 15/10 está completo en todos los feeds; el 14/10, casi (Puntonueve trae sólo sus últimas 10 notas). 81 notas de acá, 48 hechos. Las de El Diario y La Vanguardia sin fecha en la página se ubicaron por la primera vez que las vio la nube.
- **Los 14 días** (2 al 15/10): lo publicado, lo que esperó a una persona y lo que esperó cuerpo, con las fotos de git. Lo que esperó se tomó "de acá" si era de las secciones Balcarce o Policiales o si la ficha de la IA decía "balcarce". Ojo: una noticia que cambió de número de nota cuenta dos veces, y de lo que espera a una persona con chicos o víctimas el sitio no guarda el título (es público). Por eso son órdenes de magnitud, no cifras exactas.
- `npm run auditar` (antes del cambio): 619 historias, 217 saldrían solas; **Balcarce: 81 historias, 80 verdes**. Sin IA el filtro casi no frena lo de acá: lo que se pierde se pierde después (el texto completo, la IA, el verificador, la espera).
- No se gastó IA. Los scripts quedaron en la carpeta temporal de la sesión.

## 2. Los números

### 2.1 Lo que se lee, por medio (14 y 15/10)

| Medio | Notas | Salieron | No |
|---|---|---|---|
| Infórmese Primero | 22 | 15 | 7 |
| La Vanguardia | 21 | 18 | 3 |
| El Diario Balcarce | 13 | 7 | 6 |
| Puntonueve | 9 | 9 | 0 |
| Municipalidad | 8 | 5 | 3 |
| Radio Gabal | 4 | 3 | 1 |
| Concejo Deliberante | 2 | 2 | 0 |
| News Balcarce | 1 | 1 | 0 |
| Acción 5 | 1 | 1 | 0 |
| **Total** | **81** | **61** | **20** |

Fuentes de acá que casi no aportan: Ahora Balcarce (última nota del 3/10), Radio Gabal Agro (36 días), la Facultad (16 días), el Concejo (2 días, pero su feed trae notas de marzo).

### 2.2 Los 20 que no salieron, uno por uno

| Hecho | Medios | Por qué |
|---|---|---|
| Petruccelli: proyecto de salud mental | Infórmese, El Diario, La Vanguardia | Rojo: "suicid" |
| Arte Fusión en el MUHBA | Municipalidad, Infórmese, La Vanguardia | Sin cuerpo (comunicado de 38 palabras) |
| Todos por Rufino | Municipalidad, Infórmese, El Diario | Amarillo "niño" en el texto completo; después, tarde |
| Fiesta del Postre: nuevas fechas | Municipalidad | Tarde por arrastre de una nota del 3/10 (**arreglado**) |
| Paro de ATE: 83 % en las escuelas | La Vanguardia | Amarillo "adolescente" en el texto completo |
| Aparicio: "Asustarse y silenciar no sirve" | Radio Gabal | Verificación BAJA |
| Movilización por Claribel Medina | Infórmese | Sin cuerpo (copia), después "murió" |
| La AZK y los karting de acá | El Diario | La IA dijo "región": pide 2 medios (**arreglado**) |
| Kiara Ponce al Panamericano | El Diario | Ya había salido el 12/10 (Acción 5) |
| Natalia Carballo en la Sudamericana | El Diario | Ya había salido el 12/10 (Acción 5) |
| Ángela Servín en la Atlántica Ultra | Infórmese | Unida a la que ya había salido |
| Mayra Mendoza descarta a Kicillof | Infórmese | Copia nacional (espera a la IA, bien) |
| Milei: "no hay problema de empleo" | Infórmese | Copia nacional (en la historia de afuera, cupo) |
| Alberto Fernández | El Diario | Copia nacional (la IA la sacó, bien) |

### 2.3 Catorce días: lo que esperó y nunca salió

**A una persona** (170 historias de acá esperaron; 40 salieron después; 130 nunca, 9 de ellas con otro número de nota):

| Motivo | Cuántas |
|---|---|
| detenido / acusado / imputado | 30 |
| niño, niña, nene, adolescente, menores | 33 |
| murió, falleció, muerte, muertos | 9 |
| herido, herida, lesionada | 9 |
| víctima, homicidio | 6 |
| denuncia | 5 |
| promoción (sorteo, publicidad) | 2 |
| verificación BAJA | 19 |
| espera la lectura con IA (no dice "Balcarce") | 17 |

Por sección: Balcarce 54, Policiales 50, Cultura 8, Política 6, Deportes 4, Agro 4, Automovilismo 2, Fútbol 2. De las palabras, **27 aparecieron en el texto completo de la fuente o en lo que escribió la IA**, no en el título ni en la bajada: por eso `npm run auditar` muestra Balcarce sin nada esperando.

**Cuerpo** (142 historias con un medio de acá esperaron cuerpo; 68 nunca salieron, 16 de ellas con otro número): el verificador por copia (15) y por un dato que no está en la fuente (15) o en un antecedente (4); poco material (sin material 9, cuerpo corto 5); forma (3); un "niño" o una "denuncia" en lo que escribió la IA (6); errores (2); sin motivo guardado (4); y 5 que tenían cuerpo y se unieron a otra.

## 3. Por qué pasa, puerta por puerta (lo que dice el código)

1. **Entrada** (`motivoDeDescarte`, `ingesta/ingesta.mjs`): de un medio de acá entra todo menos la quiniela. Antes de la regla 180 también entraba todo lo viejo de los feeds de acá.
2. **El cruce**: una historia es "de acá" si la cuenta sólo algún medio de acá, o si algún medio de acá o de afuera nombra a Balcarce (`historiaDeAca`). Un medio de acá que se suma a una noticia nacional sin nombrar nada de acá no la hace de Balcarce: es una fuente más de la historia nacional (VTV, Confessore, Otamendi). Bien.
3. **Semáforo** (`semaforo`, `semaforoDelTexto`): rojo nunca; amarillo espera. Lo de acá ya afloja "denuncia" y, con dos medios o fuente oficial, "detenido/acusado/imputado" (regla 96).
4. **Lectura con IA** (`aplicarFichas`, `ingesta/lectura-ia.mjs`): lo de un medio de acá que no nombra nada de acá espera la ficha (`MOTIVO_ESPERA_LECTURA`). Con la ficha, la IA puede sacar la nota (publicidad, chimento, extranjero, "sin relación" si no dice Balcarce en el título, policial que no es de acá) o sacarle la marca de acá si dice que el hecho es de la región, de la provincia o nacional (`noEsDeAcaSegunLaIA`). **Antes de la regla 180, con eso la nota pasaba a pedir los medios de afuera y quedaba como relleno**, que no llega al celular (`pendientesDeLaIngesta` no muestra "poco contada" ni "pasó el cupo").
5. **Escritura y verificador** (`reels/reescritura.mjs`, `ingesta/verificar.mjs`): el semáforo se pasa por el texto completo de la fuente (ahí aparece el "niño" del tercer párrafo); el verificador rechaza copia y datos nuevos; sin 70 palabras no se publica; un medio solo con declaraciones de parte es BAJA.
6. **Publicar** (`notaPublicada`, `web/scripts/generar-datos.mjs`): no se estrena lo que tiene más de 12 horas (la fecha más vieja de todas sus fuentes); el archivo saca lo que no tiene respaldo (`tieneRespaldo`: de afuera con un solo medio).

## 4. El flujo "todo lo de Balcarce sale" (diseño)

La idea: **una fuente de acá publica siempre**, salvo (a) lo que no debe salir nunca y (b) lo que la regla firme manda a una persona. Para eso, cada nota de una fuente de acá cae en una de tres clases.

### Clase A. Un organismo de Balcarce

Municipalidad, Concejo Deliberante, Facultad de Ciencias Agrarias (y, si algún día tienen feed, el Hospital, Bomberos, la Policía Comunal). Lo que comunican es de acá aunque no digan "Balcarce".

- No espera a la IA. **Hecho (180).**
- No pide medios ni ocupa el cupo de afuera. **Ya era así para los medios; el cupo, hecho (180).**
- Conserva la página. Ya era así (`oficial`).
- La IA puede cambiarle la sección y sacarla si es publicidad. Propuesta P7: que no la pueda sacar por "sin relación con Balcarce".

### Clase B. Un medio de Balcarce que nombra algo de acá

En el título o los primeros 600 caracteres: Balcarce, balcarceño/a/os/as, Napaleofú, Ramos Otero, Laguna La Brava, Sierras de Balcarce, INTA Balcarce, el autódromo o el museo Fangio; San Agustín, Los Pinos, Bosch y Juan Vincenty (regla 179: en un medio de acá alcanzan solas); la ruta 226, la 55, la papa.

- Es de acá. La marca la pone el cruce (`nombraAca`).
- No pide medios ni ocupa el cupo aunque la IA diga "región". **Hecho (180).**
- Conserva la página con un solo medio. **Hecho (180).**
- Propuesta P7: la IA tampoco la puede sacar por "sin relación" (hoy la protege sólo si lo dice en el título) ni por "policial que no es de acá".

### Clase C. Un medio de Balcarce que no nombra nada de acá

Puede ser de acá dicho con otras palabras ("la Escuela Municipal", "calle 37 entre 120 y 122", "la tenista local") o una copia de una noticia de afuera (Mayra Mendoza, Milei, un referéndum en Suiza).

- Espera a la IA (como hoy). Con ficha "balcarce" o impacto directo pasa a clase B. Con ficha "región, provincia o nacional" sigue las reglas de afuera: es una fuente más de esa noticia, sale en su sección si la cuentan los medios que pide (2, 3 o 4) y nunca como "de Balcarce".
- Propuesta P8: señales de acá sin decir Balcarce, y una espera máxima.

### Lo que nunca sale y lo que espera a una persona (no cambia)

- **Nunca**: la lista roja (menores, víctimas de delitos sexuales y de violencia de género, suicidio), las listas de sepelios y necrológicas, las efemérides de otros medios, la quiniela.
- **Espera a una persona**: la lista amarilla (hasta que se decida P1 a P3), la verificación BAJA (hasta que se decida P4), y **toda pieza de Política o Policiales en redes**.

### Cómo se evita que abrir meta repetidas o ruido

- **Repetidas**: el mismo comunicado contado por cuatro radios ya se junta en el cruce (el Cementerio: Municipalidad, Infórmese, Puntonueve y La Vanguardia en una nota). Contra lo publicado están las barreras de las reglas 171 y 175 (72 horas, fuentes en común, uniones firmes). El hueco que queda es **el refrito tardío**: El Diario y La Vanguardia cuentan a los tres días lo que Acción 5 contó el lunes (Kiara Ponce, Carballo). Propuesta P9: para lo de acá, comparar contra 7 días.
- **Ruido**: lo viejo de los feeds de acá ya no entra (**hecho**); la quiniela y las efemérides ajenas ya no salen; la promoción espera; lo que no es noticia ("Hoy es martes 13, no te cases ni te embarques") lo saca la IA.
- **Copias**: la clase C con ficha de afuera nunca sale como de Balcarce (sigue la regla de medios), y la IA la puede sacar si no tiene relación.

## 5. Lo implementado (regla 180)

| Qué | Dónde |
|---|---|
| `esDeUnMedioDeAca(nota)`: `alcance === 'local'` y (`oficial` o `nombraAca`) | `ingesta/ingesta.mjs` |
| El cruce marca `nombraAca` cuando la historia es de acá y una nota de un medio de acá nombra Balcarce, una localidad del partido o la zona en el título o los primeros 600 caracteres (`mencionaBalcarce`, `tocaLaZona`) | `ingestar()`, `ingesta/ingesta.mjs` |
| `exigirMedios` y `aplicarCupos` no le piden medios ni le cuentan cupo a lo que cumple `esDeUnMedioDeAca` | `ingesta/ingesta.mjs` |
| La nota publicada lleva `deUnMedioDeAca` y `tieneRespaldo` la cuenta (no pierde la página por un solo medio) | `web/scripts/generar-datos.mjs`, `web/lib/cuerpo.js` |
| `balcarceños` y `balcarceñas` en `PALABRAS_LOCALES` | `ingesta/fuentes.mjs` |
| Un organismo de Balcarce no espera a la IA por no nombrar a Balcarce | `aplicarFichas`, `ingesta/lectura-ia.mjs` |
| `esViejaSinSalir`: lo de un feed de acá de más de 72 horas que nunca salió no entra al cruce (lo publicado y lo sin fecha, sí) | `ingesta/ingesta.mjs` |

Lo que **no** hace: no es `esDeAca` (no afloja "denuncia" ni "detenido" en lo que la IA dijo que no es de acá), no le devuelve a la nota los +25 del puntaje, no cambia lo que la IA puede sacar, no cambia la verificación ni el cuerpo mínimo, no toca redes.

**Pruebas**: `pruebas/balcarce-todas.test.mjs`, nueve pruebas con los casos reales (la AZK por el camino real de la ingesta, "balcarceños", "Sábado a puro básquet", la Fiesta del Postre por el camino real, el cupo, la página) y el caso que no tiene que cambiar (la copia nacional de Infórmese pide sus medios; Mayra Mendoza sigue esperando a la IA). Las nueve fallan con el código anterior. `npm run test:nucleo` (408) y `npm test` (2.575, 3 salteadas) pasan.

**Riesgos de lo implementado, y por qué son chicos:**
- Una copia nacional en un medio de acá que además nombra a Balcarce en la bajada saldría con un solo medio en su sección. Es lo que ya pasaba antes de la IA (la ingesta la trataba de acá); la IA la puede seguir sacando por "sin relación", "chimento" o "extranjero".
- Un comunicado municipal que no es de Balcarce (una campaña provincial que la Municipalidad replica) sale sin esperar a la IA; si la IA después dice "sin relación", se saca y pierde la página. Medido: de los organismos, casi todo lo que no nombra a Balcarce es del Hospital, las escuelas municipales de deporte, el Teatro o el Cementerio.
- Una historia publicada cuya nota principal era vieja conserva su número (lo ya publicado entra igual). Lo viejo sin publicar no se podía estrenar de todos modos (más de 12 horas).

## 6. Propuestas para decidir (con su riesgo)

**P1. "Detenido / acusado / imputado" atribuido a la autoridad, en lo de acá.** Hoy se suelta sólo con dos medios o fuente oficial (regla 96). Sumar: "o el texto lo atribuye a la Policía, la Fiscalía o la Justicia" y no hay ninguna de las otras palabras (menor, niño, víctima, herido, muerte). Rinde hasta 30 en 14 días. Riesgo medio: un nombre propio de un detenido; el verificador ya exige atribución y condicional. Dónde: `AMARILLO_QUE_SE_SUELTA_SI_LA_CONFIRMAN` y `semaforo()`. Es la P2 del diagnóstico de Policiales.

**P2. Chicos en deporte, escuela y cultura de un organismo de acá.** "Torneo de Vóley con 13 equipos", "Paro de ATE en las escuelas", "Los alumnos de la EP 19 de Los Pinos despidieron a…": "adolescente(s)", "niños" o "alumno de" sin ninguna palabra de delito, accidente, salud o tribunal, en una nota de la Municipalidad, el Concejo o una escuela, sección Deportes, Cultura o Balcarce. Rinde ~15. Riesgo medio: la ley 26.061 cuida a los chicos en hechos policiales o judiciales y de salud, no un resultado deportivo, pero el chico enfermo de una campaña solidaria (Rufino, Nico) sí es delicado y tiene que seguir esperando. Dónde: `semaforoDelTexto` y `ingesta/exenciones.mjs`.

**P3. La despedida de un vecino conocido.** "Balcarce despide al Chiqui Smiraglia" salió; "Pesar por el fallecimiento de Pascualito Cerone", "Adiós a Chiqui Smiraglia" (otras versiones) esperaron. Propuesta: con dos medios de acá, sin palabras de accidente, choque, policía ni hallazgo, y con título de homenaje, sale. Hernán ya lo dijo el 8/10 ("si muere alguien importante va a tener su nota y esa sí entra"). Rinde ~9. Riesgo medio: una muerte equivocada o un nombre mal escrito. Dónde: `laMuerteFrena`.

**P4. Verificación MEDIA para la palabra de una figura pública de acá.** Hoy un medio solo con declaraciones de parte es BAJA (19 en 14 días: Aparicio, Politano, los cruces del Concejo). Propuesta: si quien habla es un concejal, el intendente, un funcionario o un dirigente con nombre y la nota no acusa a otra persona, MEDIA ("lo dijo X, según Radio Gabal"). Riesgo medio: notas de un solo lado; la doctrina Campillay pide atribuir, y la nota atribuye. Dónde: `nivelDeVerificacion` (`reels/reescritura.mjs`).

**P5. "Breve" para comunicados oficiales cortos.** Un comunicado de 38 palabras no da para 70 sin inventar. Propuesta: lo de un organismo de acá sale con 45 palabras si cubre todos los datos de la fuente. Riesgo bajo (notas flacas; Google las mira menos). Toca una regla que no se negocia ("sin cuerpo no se publica", `web/lib/cuerpo.js`).

**P6. Citas largas de un comunicado oficial.** 15 notas de acá murieron porque la IA copiaba 13 o más palabras seguidas. Un comunicado municipal es texto público hecho para difundir: aceptar hasta 25 palabras seguidas, entre comillas y atribuidas, sólo de fuentes oficiales de acá. Riesgo bajo. Dónde: el control de copia de `ingesta/verificar.mjs`.

**P7. La IA no saca lo que es de acá.** Que "sin relación con Balcarce" y "policial que no es de acá" no apliquen a las clases A y B (sí publicidad, chimento y extranjero). Riesgo bajo. Dónde: `aplicarFichas`.

**P8. Lo de acá dicho con otras palabras, y una espera máxima.** (a) Para medios de acá, contar como de acá las instituciones que sólo existen acá: Hospital Municipal Felipe Fossati, Teatro Municipal Luis A. Conti, Casa de la Cultura y el Bicentenario, Museo Histórico Municipal, Escuela Municipal de…, Policía Comunal, Sociedad Rural de Balcarce, Club Racing "Juan Carlos Gentile", Liga Balcarceña. (b) "Nuestra ciudad" sólo en medios de acá (riesgo: La Vanguardia a veces copia a La Capital de Mar del Plata, donde "nuestra ciudad" es Mar del Plata). (c) Si la IA no lee una nota de clase C en 2 horas, sale si es verde. Rinde ~10. Riesgo medio por (b) y (c): una copia nacional saldría como de Balcarce.

**P9. Repetidas de acá a 7 días.** El refrito de El Diario o La Vanguardia a los tres días (Kiara Ponce, Carballo) no lo junta ninguna barrera de 72 horas. Riesgo bajo (juntar dos noticias distintas del mismo club; ya hay reglas para anuncio y resultado). Dónde: `parejasConLoPublicado` (`ingesta/repetidas-publicadas.mjs`).

**P10. Lista roja: la prevención del suicidio.** El proyecto de salud mental del Concejo no sale nunca porque dice "suicidio". Propuesta mínima: si lo comunica un organismo y habla de prevención, programa o ley (sin un caso, sin una persona), que **espere a una persona** en vez de quedar roja. Riesgo **alto**: es la lista que cuida a las víctimas; las guías de la OMS piden cuidado al informar. **No se toca sin que lo decidan.**

**P11. Que esperar no sea no salir.** En 14 días esperaron 170 de acá y salieron 40. Una pestaña "De Balcarce para revisar" en el celular, separada de lo de afuera, con el motivo en una línea y dos botones. Sin riesgo. Dónde: `web/public/panel/`, `panel/celular-datos.mjs`.

**Medir de acá en adelante.** El sistema no guarda por qué se cayó cada nota: sólo lo que espera en ese momento. Convendría un contador diario por puerta y por "de acá / de afuera" en `web/data/notas-por-dia.json` (lo leído de acá, lo publicado, lo que espera por palabra, por BAJA, por IA, sin cuerpo, tarde). Con eso este informe se arma solo cada semana.

## 7. Cómo repetirlo

1. `git fetch` y sacar de `origin/main` las fotos de `web/data/portada.json`, `esperando-cuerpo.json` y `fichas.json` (una cada 6 horas alcanza).
2. Una corrida de `ingestar({ silencioso: true, memoria: <copia de .cache/cruce-memoria.json>, idsConocidos, idsUnidos })` sin IA, guardando `origenes` de cada historia.
3. Cada nota de un medio de acá: ¿su enlace está en `fuentesConsultadas` de algo publicado? Si no, buscar su número (`idDe(enlace)`) y el de su historia en `pendientes`, `esperando-cuerpo`, las fichas, `intentos-ia.json`, `vistas.json` y `fusionadas.json`.
4. Para ver qué cambia una regla: la misma corrida con el código de antes (un `git worktree` aparte) y con el de ahora, pasando las dos por `aplicarFichas` con las fichas reales, `exigirMedios` y `aplicarCupos`.
