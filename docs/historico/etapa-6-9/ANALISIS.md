# Etapas 6 a 9 · Semáforo, redacción, fotos y redes: cómo andan hoy y qué se puede hacer

*Medido el 15/10/2026 desde la PC de Hernán. Sólo análisis: no se tocó ningún archivo del motor, de la web
ni de los criterios. Nada de esto está decidido: las reglas de hoy se usan como evidencia, no como punto de
partida obligatorio.*

*17/10/2026: Los programas de `herramientas/` y las planillas del semáforo (`semaforo-por-dia.csv`, `semaforo-una-corrida.csv`) se borraron en la limpieza final (eran de una sola medición; quedan en el historial de git). Los resultados son los de este documento.*

**Cómo leerlo.** Cada parte tiene lo mismo: (1) cómo funciona hoy, con notas reales y números; (2) qué sale
mal; (3) dos o tres opciones con costo por mes y riesgo; (4) una recomendación; (5) la pregunta exacta para
ustedes. Al final están la tabla de modelos con su costo, todas las preguntas juntas y lo que **NO SE PUDO
VERIFICAR**.

**Los límites legales no se aflojan acá.** Todo lo que toca a menores y víctimas (leyes 26.061 y 26.485), las
listas de sepelios, la presunción de inocencia y la doctrina Campillay, y que Política y Policiales esperen a
una persona en las redes, aparece sólo como **propuesta para Hernán**, con qué pasaría y qué seguiría frenado.
Como el repositorio es **público**, los titulares de notas con menores, víctimas o policiales van omitidos en
este documento y en sus planillas.

**De dónde salen los números** (todo se puede volver a medir con `docs/etapa-6-9/herramientas/`):

- La **historia de `web/data/portada.json`** en git: 1.064 versiones, del 25/09 al 15/10. Cada versión trae
  la lista de lo que espera a una persona (`pendientes`), con su sección y su motivo.
- **Una corrida de la ingesta en seco** el 15/10 a las 12:51, sin escribir nada y sin IA
  (`foto-ingesta.mjs`): 557 historias con su color y su motivo.
- `web/data/archivo.json` (1.120 notas publicadas, del 14/09 al 15/10), `intentos-ia.json` (531 notas que
  pasaron por la IA del 8 al 15/10), `banco-fotos.json` (1.334 entradas), `estadisticas.json`,
  `estadisticas-piezas.json` (398 mediciones de piezas) y `redes.json`.
- Las pruebas de modelos ya hechas: `pruebas-modelos/comparacion-redaccion.md` (15 historias, 44 corridas),
  `redaccion-lado-a-lado.md`, `fotos-repetidas.md` y `TRASPASO.md`.
- Los documentos de Descargas: `03-PLAN-DE-MEJORA-INTEGRAL.md`, `06-IMPLEMENTAR-YA.md`,
  `07-REDISENO-DESDE-CERO.md` §2, `02-IA-MODELOS-OpenRouter.md` y `05-INVENTARIO-APIS-RESPALDO-Y-PAUSA.md`.
- Precios de Claude: los de la API de Anthropic al 6/10/2026 (Haiku 5.5 US$ 0,10 / 0,50 por millón de tokens
  de entrada / salida; Sonnet 5.5 US$ 2 / 10; Opus 5.5 US$ 4 / 20; leer de la caché cuesta una décima parte;
  por lotes, la mitad). Precios de OpenRouter, los de `02-IA-MODELOS`.

---

## En 30 segundos

1. **El amarillo, en la práctica, es "no sale".** Del 25/09 al 15/10 esperaron a una persona **1.336 notas
   distintas** (en octubre, **42 por día**). Una persona aprobó **8** (0,6 %); unas 130 salieron después solas
   (llegó otro medio o la IA las soltó); **el 90 % nunca salió.** Desde el 29/09 hay 18 decisiones del
   celular en total.
2. **La mitad de lo que frena el semáforo por palabras es un error.** En una corrida real, de 39 notas
   frenadas para una persona, **20 eran falsos positivos** ("El Niño" del clima frenó 6 notas por la palabra
   "niño"; "el menor de los hermanos" Cerúndolo; "petróleo" frena por "Petro", el presidente de Colombia), 11
   eran aciertos y 8 son discutibles. Y hay huecos: "Dos niñas quedaron internadas tras el choque" pasa en
   verde, porque los plurales no se miran.
3. **La redacción anda mejor en producción que en las pruebas**: el 83 % de las notas terminan con cuerpo y
   el 64 % en la primera corrida. Pero el verificador rechaza cosas que están bien (la fecha de publicación
   que la fuente no repite en el texto, los nombres y las fórmulas oficiales) y **deja pasar letras rotas**:
   hay **14 notas publicadas** con "Mart\u00inez", "polêcutemica", "miéércoles" o "recibiõ".
4. **Fotos: 77 % de las notas tienen**, pero lo de acá menos (Balcarce 67 %, Deportes 57 %, Policiales 0 %
   por regla). 20 notas quedaron sin foto por una falla del servicio y no se vuelven a probar nunca.
5. **Redes: unas 40 publicaciones por día para 53 seguidores en Facebook y 7 en Instagram.** El 60 % de las
   mediciones de piezas vuelve vacío. Lo que más se ve es la foto de una nota local y el repaso de la noche.
6. **Plata:** con los precios de hoy, sumar Claude donde rinde (una ficha de sensibilidad, un verificador de
   sentido y una auditoría mensual) cuesta **unos US$ 6 a 8 por mes**. Que **Sonnet escriba todas las notas no
   entra** en el tope de US$ 25 (US$ 60 a 100); que escriba sólo las 15 notas de acá más importantes por día,
   sí (unos US$ 9 a 13).

---

## A. El semáforo

### A.1 Cómo funciona hoy

Cada historia que entra recibe un color. El código está en `semaforo()` y `semaforoDelTexto()`
(`ingesta/ingesta.mjs`, líneas 749 a 850) y las listas en `REGLAS_SEMAFORO` (`ingesta/fuentes.mjs`, líneas
1054 a 1171). En orden:

| Paso | Qué mira | Dónde | Color |
|---|---|---|---|
| 1 | La lista **roja** (49 frases: "abuso sexual", "femicidio", "suicid", "menor de edad", "grooming"…) | título y primeros 600 caracteres | **rojo**: no sale nunca |
| 2 | Efeméride de otro medio | dirección o título | rojo |
| 3 | La lista **nunca** (sepelios, necrológicas, cochería…) | sólo el título | rojo |
| 4 | La lista **amarilla** (acusa, mata o involucra a un chico: "denuncia", "detenido", "homicidio", "víctima", "niño", "adolescente", "el menor de"…) y una edad menor de 18 ("una chica de 16 años") | título y 600 caracteres | amarillo |
| 5 | La lista de **muerte y heridos**, sólo donde puede ser alguien de acá (`laMuerteFrena`) | título y 600 caracteres | amarillo |
| 6 | **Cotización** del dólar | sólo el título | amarillo |
| 7 | **Internacional** (Trump, Putin, Lula, Petro, OTAN…) en lo de afuera | sólo el título | amarillo |
| 8 | **Promoción** ("sorteo", "suscribite", "publicidad"…) | título y 600 caracteres | amarillo |
| 9 | Fuente **oficial** | — | verde |
| 10 | Lo de afuera con **menos medios** que los que pide su sección | — | amarillo |
| 11 | Lo demás | — | verde |

Dos aflojes que pidió Hernán el 2/10 (`AMARILLO_QUE_SE_SUELTA_*`, regla 96): en lo de acá, "denuncia" suelto
no frena; y "detenido", "acusado", "imputado" no frenan si lo confirma una fuente oficial o dos medios.

Después vienen dos controles más, que **sólo pueden endurecer**:

- La **lectura con IA** (`ingesta/lectura-ia.mjs`) mira el título y un resumen corto (no el texto entero) y
  puede marcar publicidad, chimento o "no le importa a Balcarce". **No tiene ningún campo sobre menores ni
  víctimas.**
- La **reescritura** (`semaforoDeLaReescritura`, `reels/reescritura.mjs`) vuelve a pasar el semáforo sobre
  el texto completo de la fuente y sobre lo que escribió la IA. Lo largo sólo se mira con lo rojo y lo de
  menores (`AMARILLO_MENORES`). De las 1.336 que esperaron, **166 quedaron frenadas en este paso**.

Un detalle que cambia las cuentas de `03-PLAN`: las palabras de cuatro letras o menos se buscan **enteras**
(`SUFIJO_DESDE = 5`). Por eso **"niño" no encuentra "niños"**, ni "nena" encuentra "nenas". "Adolescente"
(más larga) sí encuentra "adolescentes". Lo comprobé con el código real (`herramientas/probar-palabras.mjs`):

| Frase de prueba | Qué hace hoy |
|---|---|
| "El Niño golpea el Litoral" | amarillo por "niño" |
| "Juan Manuel Cerúndolo, el menor de los hermanos, ganó" | amarillo por "el menor de" |
| "El FMI alertó que el petróleo seguirá caro" | amarillo internacional por "petro" (Gustavo Petro: "petro" + hasta tres letras = "petroleo") |
| "Fin del fútbol gratis: la AFA confirmó el sorteo del fixture" | amarillo por "sorteo" |
| "Los niños de la escuela 5 visitaron el museo" | verde (el plural no se mira) |
| "Alumnos de la Escuela Técnica ganaron un premio" | verde |

### A.2 Cuánto frena cada color, por día (medido)

**Una corrida real (15/10, 12:51, sin memoria del cruce y sin IA):**

| | Historias |
|---|---|
| Total | 557 |
| Verde | 166 |
| Amarillo por "de afuera y poco contada" | 175 (sin la memoria del cruce este número sale inflado) |
| Amarillo por cupo de la sección (Economía 49, Argentina 43, Fútbol 38, Política 19, Automovilismo 15, Tecnología 7, Deportes 5) | 176 |
| **Amarillo para una persona** (palabras 31, internacional 3, promoción 2, cotización 1) | **37** |
| Rojo | 3 |
| Lo de acá (91 historias) | 85 verde (93 %), 6 amarillo |

Lo de afuera "poco contado" y el cupo no son para una persona: el panel no los muestra (`MOTIVOS_DE_RELLENO`,
`redes/avisos.mjs`). Lo de acá casi siempre sale.

**Tres semanas de historia** (notas distintas que esperaron a una persona; la lista pública tiene un tope de
40 por corrida y no incluye lo rojo, así que es un **piso**). La planilla día por día es
`semaforo-por-dia.csv`.

| Motivo | 25/09 al 15/10 | En octubre (15 días) | Por día en octubre |
|---|---|---|---|
| Acusación ("denuncia", "detenido", "acusado", "imputado") | 334 | 199 | 13,3 |
| Menores (palabra o edad) | 257 | 183 | 12,2 |
| Internacional | 121 | 61 | 4,1 |
| Promoción | 110 | 56 | 3,7 |
| Muerte o heridos | 123 | 39 | 2,6 |
| Violencia o víctima ("homicidio", "víctima", "baleado"…) | 75 | 34 | 2,3 |
| De un medio de acá que no nombra nada de acá | 36 | 33 | 2,2 |
| Verificación BAJA | 49 | 25 | 1,7 |
| "Hospital" e "investigación" (salieron de la lista el 28/09) | 79 | 0 | 0 |
| Otros (reglas de septiembre que ya no existen) | 152 | 0 | 0 |
| **Total** | **1.336** | **630** | **42** |

Las palabras que más frenaron: "denuncia" 162, "niño" 115, "adolescente" 80, "sorteo" 74, "detenido" 69,
"acusado" 54, "muerte" 46, "víctima" 43, "denunció" 37, "murió" 28.

Las secciones donde más frena lo de menores: Argentina 82, Balcarce 38, Agro 28, Fútbol 20, Cultura 18,
Política 17. **En Agro, Fútbol y Cultura casi nunca hay un menor de verdad** (ver abajo).

**Qué pasó después con esas 1.336:**

| | Notas | % |
|---|---|---|
| La aprobó una persona | 8 | 0,6 % |
| Salió después sola (llegó otro medio, la IA cambió la sección, se soltó) | 129 | 9,7 % |
| **Nunca salió** | 1.199 | 89,7 % |

Y en el celular hay **18 decisiones sobre notas en total** desde el 29/09 (12 publicadas, 6 descartadas). Es
decir: **la cola del celular no la mira nadie**, y no es una crítica: con 42 por día no se puede. Cualquier
diseño que dependa de una persona tiene que dejarle **5 a 8 por día**, no 42.

### A.3 Falsos positivos y falsos negativos

**Falsos positivos (frena lo que no debería).** Clasifiqué a mano las 39 notas de la corrida del 15/10 que
quedaron para una persona (planilla `semaforo-una-corrida.csv`):

| Juicio | Notas | Ejemplos |
|---|---|---|
| **Falso positivo** | **20 (51 %)** | 6 de "El Niño" (el fenómeno del clima: "El Niño golpea el Litoral", "La represa Yacyretá suspende las visitas…", y hasta "El tiempo en el AMBA para este viernes"); "Es un Maradona… sobre Messi" ("niño"); "Juan Manuel Cerúndolo pasó a la segunda ronda…" ("el menor de"); "Solo 19 de cada 100 estudiantes alcanzan los conocimientos básicos" ("adolescente"); "Apuestas online: el proyecto para prevenir la ludopatía" ("adolescente"); "Alarma en Puerto Madryn por ballenas muertas" ("cadáver"); "Apyme denunció que crecieron un 52 % los embargos" ("denunció" = informó); "Los próximos partidos de River… y el fixture completo" ("sorteo"); "Javier Milei viaja a Estados Unidos…" (internacional) |
| Acierto | 11 (28 %) | un adolescente que le disparó a un compañero, la causa de un chico desaparecido, tres policiales de acá con acusados, dos rojos (delito sexual, suicidio de una persona), denuncias de abuso, jóvenes acusados de planear un tiroteo, la Torre Trump de la FIFA |
| Discutible | 8 (21 %) | la muerte del "Chiqui" Smiraglia (figura conocida de acá: Hernán dijo el 8/10 que "si muere alguien importante va a tener su nota"), un fallo de la Corte en el caso Báez Sosa (9 medios), un pedido de juicio político a un juez, un accidente laboral, el **plan provincial de prevención del suicidio** (rojo) |

**Las 8 notas que frenó "niño" en esa corrida eran todas falsos positivos.** En la historia hay más del mismo
tipo: "Un jugador de la Selección fue papá por primera vez" y "Nueva vacuna protege a las aves de producción"
("recién nacido/a"); "Quinta fecha de la Liga Local" ("menores de 13 años", las categorías); "El FMI alertó
que el petróleo seguirá caro" y "La minería sigue en alza" ("petro"); "La ANMAT prohibió una marca de
lavandina" ("publicidad"); "Empezó la reunión en Tribunales: la Corte analiza…" ("sortea"); "ATE anunció un
paro" ("imputado" en otro medio); "Vecinos de Villa Castells piden obras" ("denuncia"); y **notas de servicio
de acá frenadas por verificación BAJA**: "Realizarán trámites gratuitos de DNI en el Concejo", "El quirófano
móvil de castraciones permanece en la Escuela…", "Concejo Deliberante: este jueves llega la decimoquinta
sesión". La BAJA sale de `tocaElHecho` (un dato "sin confirmar" que comparte dos palabras con el título), que
con una sola fuente de acá marca cualquier cosa.

**Falsos negativos (deja pasar lo que debería frenar).** No encontré ninguno publicado: de las 1.120 notas
del archivo, 31 nombran chicos en plural ("niñas", "alumnos de", "adolescentes"), y ninguna lo hace junto con
un hecho policial o un accidente. Pero con frases de prueba el hueco existe
(`herramientas/probar-falsos-negativos.mjs`):

| Frase de prueba (inventada) | Qué hace hoy |
|---|---|
| "Dos niñas quedaron internadas tras el choque en la ruta" | **verde** |
| "Detuvieron a dos chicos de 15 y 16 años por un robo" | **verde** (la edad doble no la reconoce) |
| "Un estudiante de la Escuela Secundaria 3 fue agredido por compañeros" | **verde** |
| "Los nenes del jardín fueron evacuados por un incendio" | verde |

Hoy protege mucho que los policiales de afuera se descartan antes (`esPolicialDeAfuera`) y que lo de acá
viene de pocos medios conocidos. Si se suman fuentes o secciones (Educación, Salud), este hueco crece.

**Conclusión:** una lista de palabras **no puede** distinguir "El Niño" de un niño, ni "denunció un aumento"
de "denunció a su vecino", ni "dos niñas" en una muestra de arte de "dos niñas" en un choque. Agregar
plurales sube los falsos positivos; sacar palabras sube el riesgo. Hace falta que alguien **lea**.

### A.4 Opciones

**Opción A1 · Arreglar las palabras, sin IA (US$ 0, riesgo bajo).** Excepciones puntuales en el amarillo y
en internacional, cada una con su prueba: "El Niño" con mayúscula o junto a "fenómeno/clima/lluvias";
"el menor de los/las"; "Petro" sólo como "Gustavo Petro"; "sorteo del fixture/de la Copa"; internacional no
frena cuando el sujeto es el gobierno argentino. Arregla unos 10 de los 20 falsos positivos de la corrida.
**No** cierra los falsos negativos ni el problema de fondo. Toca el amarillo (no el rojo): igual es de Hernán.

**Opción A2 · Una "ficha de sensibilidad" que decide la IA, con las palabras como red (US$ 1 a 3 por mes,
riesgo medio). Recomendada.** Para cada nota que va a salir o a esperar (~150 por día), un modelo lee el
título y los primeros 1.500 caracteres del texto completo (y después lo que escribió la IA) y contesta campos
cerrados:

| Campo | Valores |
|---|---|
| `menor_mencionado` | sí / no |
| `menor_identificable` | sí / no (nombre, apodo, foto, escuela y curso, domicilio, parentesco con alguien nombrado) |
| `victima_identificable` | sí / no (delito sexual, violencia de género, trata) |
| `hecho_policial` | sí / no |
| `acusa_a` | nadie / persona privada / figura pública / institución |
| `muerte` | no / de alguien de acá / de una figura / otra |
| `tipo` | hecho, servicio, declaración, opinión, promoción, curiosidad, chimento, cotización, pronóstico |
| `lugar` | Balcarce / zona / Argentina / mundo (con o sin protagonista argentino) |

Y reglas fijas en el código (no en el modelo):

1. **La lista roja no cambia y la IA nunca destraba lo rojo.** Una palabra roja es rojo, diga lo que diga el
   modelo.
2. **La IA sólo puede endurecer por su cuenta**: `menor_identificable` o `victima_identificable` = sí →
   rojo aunque no haya ninguna palabra (esto cierra los falsos negativos); `menor_mencionado` + `hecho_policial`
   → amarillo.
3. **Una palabra amarilla de menores** ("niño", "adolescente", "el menor de", "recién nacido", "alumno de")
   **sigue frenando en Policiales y Balcarce siempre.** En las demás secciones, se suelta sólo si **dos
   lecturas coinciden** (por ejemplo Haiku y un modelo de decisión, o Haiku con probabilidad ≥ 0,9) en
   `menor_identificable = no` y `hecho_policial = no`.
4. **Acusaciones**: siguen frenando con persona privada o con un solo medio (Campillay); se sueltan con dos
   medios o fuente oficial cuando `acusa_a` es figura pública o institución, y la nota va con atribución y
   condicional (eso ya lo exige la regla 10 de la instrucción).
5. Lo que el modelo no sabe (probabilidad entre 0,2 y 0,8) va al celular. Meta: **5 a 8 por día**.

Qué habría pasado con la corrida del 15/10 bajo A2: **pasan** las 6 de El Niño, Messi, Cerúndolo, la
estadística educativa, la ludopatía, las ballenas, Apyme, OpenAI, Galperin, la causa de lavado, Solano, el
plagio, el fixture de River y el viaje de Milei (20). **Siguen frenadas** las 11 de acierto (el adolescente que
disparó, el chico desaparecido, los tres policiales de acá, los dos rojos, las denuncias de abuso, los jóvenes
acusados, la Torre Trump). **Van al celular** las 8 discutibles. Y las frases de prueba de "dos niñas
internadas" o "chicos de 15 y 16 años detenidos" pasarían de verde a frenadas.

Costo (4.500 notas por mes, ~1.800 tokens de entrada y 100 de salida): Haiku 5.5 ~US$ 1; un modelo de
decisión (Mercury Decide) ~US$ 0,2; una segunda opinión de Sonnet 5.5 sólo en las ~10 dudosas por día
~US$ 2. Riesgo: el modelo se equivoca en algún caso; por eso el rojo no se toca, la IA sólo endurece sola y
para soltar hacen falta dos lecturas. **NO VERIFICADO**: cuánto acierta cada modelo en estas preguntas (hay que
probarlo con las ~260 notas de menores de la historia, etiquetadas a mano por Hernán, antes de prender nada).

**Opción A3 · Todo a una persona, pero en bloques (US$ 0, riesgo de que siga sin mirarse).** Mejorar el
panel para aprobar de a muchas ("todas las de El Niño", "todas las de Argentina con 'denuncia' y 5 medios").
Evidencia en contra: hoy se toman 18 decisiones en 16 días; con 42 por día no alcanza ningún panel.

**Recomendación:** A1 ya (es barato y saca el ruido más tonto), A2 en cuanto se elija el modelo de la Etapa 4
(la ficha puede ir en el mismo pedido que la clasificación), y la cola del celular limitada a lo dudoso.

### A.5 Lo que es de Hernán (límites legales: sólo propuesta)

- **El rojo no cambia** en ninguna opción de arriba. La única excepción que planteo para que él la piense:
  una nota sobre **políticas de prevención del suicidio** (no un caso: "El plan integral de la Provincia para
  prevenir el suicidio…") hoy es roja para siempre. Las guías de la OMS recomiendan informar la prevención con
  cuidado. La propuesta sería que **ese tipo** de nota espere a una persona en vez de no salir nunca. Por
  defecto, sigue roja.
- **La muerte de alguien conocido de acá** (el "Chiqui" Smiraglia, "Pesar por el fallecimiento de Pascualito
  Cerone, histórico…" que nunca salió): Hernán dijo el 8/10 que esas tienen nota. Hoy esperan y nadie las
  aprueba. Propuesta: con `muerte = de alguien de acá`, sin delito ni suicidio y con dos fuentes o una oficial,
  sale sola con tono de despedida. Si es un accidente o un hecho policial, sigue esperando.
- **Policiales con menores** (Andrés, 12/10: que vayan a amarillo en vez de rojo): ya está en
  `docs/DECISIONES.md` (preguntas 1 y 3). Este análisis no cambia esa respuesta: mientras Hernán no diga que
  sí por escrito, todo lo que hoy es rojo sigue rojo, y aun aprobada una nota nunca identifica al menor.
- **Las listas de sepelios** siguen en "nunca", también para la IA.
- **Política y Policiales esperan a una persona en las redes**: no cambia (ver D).

### A.6 Preguntas para Hernán (semáforo)

1. ¿Se pueden hacer ya los arreglos de palabras de la opción A1 ("El Niño", "el menor de los hermanos",
   "Petro" → "petróleo", "sorteo del fixture", el Presidente argentino en el exterior)? No tocan el rojo.
2. ¿Aceptás la ficha de sensibilidad (A2) con estas reglas: el rojo intacto, la IA sólo endurece sola, y las
   palabras de menores se sueltan sólo fuera de Policiales y Balcarce y sólo si dos lecturas coinciden en que
   no hay un menor identificable ni un hecho policial?
3. ¿Querés que lo que hoy pasa en verde y no debería ("dos niñas internadas tras un choque", "chicos de 15 y
   16 años detenidos") pase a frenar? Es más estricto que hoy.
4. Acusaciones: ¿se suelta "denuncia / acusado / imputado" cuando lo cuentan dos medios o una fuente oficial
   **y** el acusado es una figura pública o una institución? Con una persona privada o un solo medio, sigue
   esperando.
5. ¿La muerte de una persona conocida de Balcarce, sin delito ni suicidio, sale sola con tono de despedida?
6. ¿Una nota sobre **políticas de prevención** del suicidio puede esperar a una persona en vez de no salir
   nunca? (Si no contestás, queda roja.)
7. ¿La cola del celular se limita a lo dudoso (5 a 8 por día) y el resto se archiva con su motivo?

---

## B. Redacción y verificación (Etapa 7)

### B.1 Cómo funciona hoy

- **Quién escribe:** Gemini `gemini-flash-lite-latest`, gratis, con tres claves de respaldo
  (`reels/reescritura.mjs`). Lee las reglas de `CRITERIO-EDITORIAL.md` § 12 tal cual
  (`ingesta/prompt-editorial.mjs`): unos 20.600 caracteres, **5.786 tokens** medidos en la prueba con una
  fuente, más el texto de la nota. Devuelve título, bajada, cuerpo, guion, claves, qué se sabe, qué falta
  confirmar, texto para redes y etiquetas (~630 tokens).
- **El tope:** `REESCRITURA.porDia` = 450 pedidos por día; en la realidad pasan **unas 90 notas por día** por
  la IA (`intentos-ia.json`: 92 el 13/10 y 92 el 14/10).
- **Cómo verifica** (`ingesta/verificar.mjs`, código, sin IA): largo; números, nombres y fechas que no están
  en la fuente; más de **12 palabras seguidas copiadas** (la instrucción pide 10); negaciones que aparecen o
  desaparecen; cuerpo que repite la bajada; título en pasado; relleno; y desde el 14/10 (regla 166) un escape
  roto ("\u00").
- **Qué pasa si falla:** se le dice qué falló y se pide una vez más; si sólo fallan algunas oraciones del
  cuerpo, se sacan; si igual no alcanza, queda "esperando cuerpo" y se reintenta en otra corrida, hasta 3.
- **El nivel de verificación** lo pone el código (`nivelDeVerificacion`): ALTA con oficial o dos medios;
  MEDIA con un medio; BAJA con un medio y una acusación, o un dato central sin confirmar. BAJA no sale sola.

### B.2 Qué tan bien anda (medido)

**En producción (8 al 15/10, 531 notas):**

| | Notas | % |
|---|---|---|
| Terminaron con cuerpo | 439 | 83 % |
| … en la primera corrida (que ya incluye la corrección y el recorte de oraciones) | 341 | 64 % |
| Sin cuerpo después de los intentos | 92 | 17 % |

Por qué quedaron afuera las 92: sin material 13, verificación BAJA 10, semáforo al ver el texto completo 12,
números o nombres que la fuente no dice ~20, copia ~10, cuerpo que repite la bajada ~8, cuerpo corto 4, y el
resto repartido.

**En la prueba de modelos** (`pruebas-modelos/comparacion-redaccion.md`: 15 historias, **un solo pedido sin
corrección**, el mismo verificador): ningún modelo pasa del 36 % sin problemas. Gemma 4 31B 36 %, Gemini 3.1
Flash-Lite 33 %, Gemma 4 26B 27 %, **Claude Haiku 5.5 13 a 20 %**, DeepSeek V4 Pro 0 a 13 %, GPT-5 nano 0 a
15 %. El prompt nuevo de `criterio-unico/` no mejoró al actual.

Sumando las 44 corridas de esa prueba hay 1.352 problemas: **números 362, copia 276, fechas 222, nombres 202**,
repite 140, citas 57, promesa 37. Mirando los casos:

- **Muchos "números" y "fechas" son del verificador, no del modelo.** En la historia del Día del Técnico de
  Laboratorio, Gemini, Haiku y DeepSeek escribieron "el viernes 9 de octubre": es la fecha de publicación,
  que la IA recibe, pero el verificador compara sólo contra el texto de la fuente, que no la repite. Resultado:
  "el copete dice 9 y la fuente no lo dice", dos veces por nota.
- **La copia es casi siempre una fórmula o un dato**, no un párrafo robado. Frases copiadas reales: "el
  concejo deliberante declaró de interés legislativo social y comunitario el 75 aniversario del…", "la
  función será el sábado 17 de octubre a las 21.30 en el…", "se llevará a cabo los días 30 y 31 de octubre y
  1 de…", "la concejal de Fuerza Patria Sol Di Gerónimo presentó una comunicación…". **54 de las 276 (20 %)
  tienen dos o más números o fechas**, y muchas más son nombres de instituciones y cargos.
- **Haiku no ganó**: en este verificador perdió contra Gemini. Pero con el verificador sesgado así, la prueba
  no dice quién escribe mejor; dice quién se parece más a lo que el verificador espera. **Nadie leyó a ciegas**
  las redacciones para juzgar calidad (`redaccion-lado-a-lado.md` está para eso y no tiene veredicto).

**Costo por nota:** Gemini 3.1 Flash-Lite, a precio de lista, US$ 0,0015 por nota (5.786 tokens de entrada y
627 de salida). Hoy no se paga: es la clave gratis.

### B.3 La clase de error "Mart\u00in" (regla 166)

La regla 166 rechaza un escape roto **en lo que se escribe desde el 14/10**. Pero el problema es más amplio:
texto con letras rotas que el verificador no mira, porque mira **datos**, no **escritura**. En el archivo
publicado hay hoy **14 notas** así (`herramientas/raros.cjs`):

| Qué | Notas |
|---|---|
| Escape roto "\u00…" ("Lautaro Mart\u00inez marca el primer tanto frente a Bolivia") | 1yyjpmk, f3bef7, 1b3umaz, 1wtp555, 2p3z0n |
| "êcute" en vez de una tilde ("polêcutemica", "neerlandêcutez", "archipiêcuteLago") | 122dsf6, ei8drx, 6cucid, repaso del 30/09 a la tarde |
| Tildes dobles o raras ("miéércoles", "volarâ", "tìnico", "seòuró") | biercm, woerbj, wkayyi, 194wzrq, pdqhm3 |
| Letras con signos sueltos ("recibiõ suero antiofȉdico") | br4g49 |

Sólo pdqhm3 tiene corrección en `correcciones.json`. La auditoría con IA de lo publicado no las encontró.
(**NO VERIFICADO** si la página muestra hoy esas letras o si algún arreglo las limpia al armar la web: en
`archivo.json` siguen así.)

Un control de forma sin IA las agarraría todas: (a) letras que no son del castellano (ê, õ, ò, â, ì, ȉ, signos
combinados) salvo en nombres propios que estén en la fuente ("Nicolò", "São Januário"); (b) dos tildes en una
palabra; (c) "\u" o "&...;" sueltos; (d) una palabra que no está en la fuente ni en un diccionario. Para (d)
hace falta una lista de palabras (un archivo de texto, sin dependencias) o pedírselo al verificador de
sentido de B.4.

### B.4 Opciones

**Opción B1 · Arreglar el verificador, sin cambiar de modelo (US$ 0, riesgo bajo). Recomendada primero.**

1. **Copia flexible:** no cuentan como copia los nombres propios, los lugares, los números, las fechas, los
   horarios ni las fórmulas oficiales ("declaró de interés legislativo", "se llevará a cabo"). Sigue el tope
   de 12 palabras para las palabras comunes seguidas, y una cita sigue teniendo 10 como máximo. Con las
   pruebas del caso real "se llevará a cabo los días 30 y 31 de octubre…".
2. **La fecha y el día de publicación cuentan como dato de la fuente** (hoy la IA los recibe y el verificador
   no).
3. **El control de forma de B.3** (letras raras, tildes dobles, escapes, entidades), en lo nuevo y una vez
   sobre todo el archivo para corregir las 14.
4. Medir antes y después con las mismas 15 historias (`pruebas-modelos/comparar-redaccion.mjs`): la cuenta
   esperada es que suba el porcentaje al primer intento, pero **NO ESTÁ MEDIDO**.

**Opción B2 · Un verificador "de sentido" con Claude, además del de código (US$ 2 a 6 por mes, riesgo bajo).**
Un segundo pedido corto por nota que ya pasó el código: "¿cada afirmación del título, la bajada y el cuerpo
está en la fuente? ¿alguna atribución quedó como hecho? ¿hay una palabra mal escrita?". Haiku 5.5 en todas
(~95 por día): ~US$ 1,7. Sonnet 5.5 sólo en las de acá y las de Política (~15 por día): ~US$ 6. Lo que el
modelo marca no se publica solo: vuelve a la IA o espera. Es el cambio con mejor relación costo / riesgo,
porque agrega un control sin sacar ninguno.

**Opción B3 · Cambiar quién escribe.**

| Variante | Costo por mes | Riesgo |
|---|---|---|
| Gemini gratis como hoy | US$ 0 | El 29/09 Google suspendió la clave paga y no salió nada en 14 horas: depende de un regalo |
| **Haiku 5.5 escribe todo**, Gemini de respaldo | US$ 3 a 8 (con caché del texto fijo y sin pensar de más); hasta ~US$ 15 con razonamiento | En la prueba no ganó; puede ser por el verificador |
| **Sonnet 5.5 escribe sólo las ~15 notas de acá más importantes por día** (Balcarce y oficiales), el resto Gemini o Haiku | US$ 9 a 13 | Gasto fijo; hay que medir que la diferencia se note |
| Sonnet 5.5 escribe todo | US$ 60 a 100 | **No entra en el tope** |
| Opus 5.5 escribe todo | más de US$ 150 | No entra; Opus va para auditar, no para producir |

**Recomendación:** B1 ya; después, una **prueba a ciegas** de 30 notas reales (10 de acá, 10 oficiales, 10 de
afuera) escritas por Gemini, Haiku 5.5 y Sonnet 5.5, que Hernán y Andrés lean sin saber cuál es cuál (cuesta
menos de US$ 2); recién con ese resultado se decide B3. B2 con Haiku se puede sumar en cualquier momento.

### B.5 Notas "tal cual" de fuentes oficiales (pregunta legal)

La idea (`07-REDISENO` §2, Etapa 7): lo de la Municipalidad, el Concejo, el hospital o los bomberos se publica
con su texto original y el crédito, sin reescribir.

- **Lo que dice la ley 11.723** (`INVESTIGACION.md` § 7): el art. 28 permite usar "noticias de interés
  general", y si se publican en su versión original hay que citar la fuente. Pero el texto de un comunicado
  sigue siendo una obra: no es lo mismo usar la noticia que copiar el texto.
- **Para organismos públicos** el riesgo es bajo (su comunicado está hecho para difundirse), pero conviene
  **pedirle a la Municipalidad un permiso por escrito** (un mail alcanza) y mirar las condiciones de su sitio.
  Mostrarlo como "Comunicado de la Municipalidad", con el texto entre comillas o en un bloque marcado, la
  fecha y el enlace, y sin tocarle una coma.
- **Para los medios de Balcarce, no**: su texto es suyo; reescribir con datos y crédito es lo que hace hoy el
  sistema y es lo que protege el art. 28.
- Ventaja práctica: el 20 % de las fallas por copia son de textos oficiales con fórmulas que no se pueden
  decir de otra manera.
- **NO VERIFICADO**: esto no es una opinión legal. Antes de publicar texto ajeno completo, consultar a un
  abogado.

### B.6 La línea editorial (regla 22): una opción para Hernán

`03-PLAN` § 3 trae un borrador de **regla 22** ("centro, institucional y práctica, que se nota en qué datos
se eligen y cómo se ordenan, nunca en adjetivos"), con una lista `CARGADAS` que el verificador rechazaría en
título y bajada. La evidencia de que hace falta algo: "Luis Caputo califica a Kicillof como el anticristo",
"Cristiano Rattazzi pide dolarizar y califica al peso de falopa", "Milei descarta una recesión y tilda de
cobardes a quienes piden un dólar alto" (insultos como titular), y 31 notas con "casta", "motosierra",
"escándalo", "polémica" o "histórico" en el título o la bajada (ojo: "histórico" muchas veces está bien:
"Museo Histórico").

Recomendación: **no** escribir "centro-derecha" en la instrucción (los modelos inclinan el texto); sí reglas
que se puedan controlar: el insulto no es el título, nada de motes, los dos lados con el mismo largo, el dato
oficial primero y atribuido. El texto final es de Hernán y hay que medirlo antes y después.

### B.7 Preguntas (redacción)

1. ¿Se arregla ya el verificador como dice B1 (copia flexible, la fecha de publicación como dato, control de
   letras rotas)? Costo cero.
2. ¿Se corrigen las 14 notas publicadas con letras rotas?
3. ¿Autorizan la prueba a ciegas de 30 notas con Gemini, Haiku 5.5 y Sonnet 5.5 (menos de US$ 2), leída por
   ustedes?
4. ¿Sumamos un verificador de sentido con Haiku 5.5 (~US$ 2 por mes)?
5. ¿Le pedimos a la Municipalidad permiso por escrito para publicar sus comunicados tal cual? ¿Y a un
   abogado, una opinión antes de hacerlo?
6. Hernán: ¿la regla 22 de línea editorial va, y con qué texto?

---

## C. Fotos (Etapa 8)

### C.1 Cómo funciona hoy

En cada corrida, hasta 10 notas nuevas: se abre la página de cada fuente, se toma su foto principal
(`og:image`), y Gemini (con Groq de respaldo) elige la mejor **sin marca de agua y sin menores
reconocibles**; si no hay ninguna y la nota es de una persona pública, se busca una foto libre en Wikimedia.
Se guarda en el banco propio (`web/data/banco-fotos.json`) con su crédito. Policiales sólo con fuente
oficial. Una nota ya probada **no se vuelve a probar nunca** (`ingesta/fotos.mjs`,
`web/scripts/fotos-notas.mjs`, `docs/05-FOTOS.md`).

### C.2 Números (`herramientas/fotos.cjs`)

| | |
|---|---|
| Notas de medios publicadas | 1.040 |
| Con foto | **803 (77 %)** |
| Por semana | 21-27/09: 41 % · 28/09-4/10: 85 % · 5-11/10: 87 % · 12-15/10: 79 % |
| De dónde | medios 771, Wikimedia 19, a mano 13, libres (F1, fútbol) 12 |
| Créditos más usados | La Vanguardia 66, Radio Gabal 64, Infobae 60, TN 50, Clarín 42 |

**Lo de acá tiene menos fotos:** Balcarce 67 %, Deportes 57 %, Automovilismo 63 %, Cultura 76 %, **Policiales
0 %** (por regla); contra Agro 95 %, Economía 92 %, Argentina 91 %.

**Por qué 237 notas no tienen foto:**

| Motivo | Notas |
|---|---|
| Nunca se probó (casi todas de antes del 28/09, cuando no existía el banco) | 100 |
| **Había un menor en la foto** (la red de seguridad funciona) | 39 |
| Todas las fotos tenían marca de agua | 18 |
| **Falló el servicio** (Groq sin cupo, 429, o imagen muy pesada, 413) y no se reintenta | 20 |
| No había fotos para comparar | 15 |
| La única imagen era el logo del medio | ~12 |
| No se pudo volver a bajar la elegida | 9 |
| Borradas | 6 |
| Otras | ~18 |

**Fotos repetidas:** la prueba de huellas (`pruebas-modelos/fotos-repetidas.md`, dHash de 64 bits) encontró
**32 pares casi iguales en 47 notas de 699 (6,7 %)**. Más o menos un tercio está bien (las tres notas de un
mismo Gran Premio con la foto libre del circuito; el repaso que usa la foto de su nota). El resto es la misma
foto de archivo en notas distintas: la misma de Colapinto en 4 notas, la de Messi en 3, la de Milei en 2.
Contando por la dirección original de la imagen, 15 grupos y 31 notas.

### C.3 Opciones

**C1 · Arreglos sin IA nueva (US$ 0, riesgo bajo). Recomendada.**

- **Huella dHash** al guardar cada foto, y no usar una casi igual (diferencia ≤ 6 bits) a otra de los últimos
  7 días, salvo el repaso y la misma historia. Necesita leer la imagen: va en `web/scripts/` (que ya tiene
  dependencias) con `sharp`, no en `ingesta/`.
- **Reintentar** las notas que quedaron sin foto por una falla del servicio (429, 413, "no se pudo volver a
  bajar"): hoy se pierden para siempre. Y achicar la imagen antes de mandarla, para que el 413 no vuelva.
- Las 100 de antes del 28/09 se pueden probar una vez, de a poco.

**C2 · Que elija Claude Haiku 5.5 con visión (~US$ 1,3 por mes), Gemini de respaldo.** Sacaría la
dependencia de la clave gratis y de Groq. **NO VERIFICADO** que vea mejor las marcas de agua y los menores:
habría que probarlo con 50 fotos de medios de acá que Hernán etiquete (marca sí/no, menor sí/no).

**C3 · Más fotos propias de acá (US$ 0, trabajo de personas).** Pedirles a los medios de Balcarce y a las
instituciones (clubes, Bomberos, escuelas) permiso para usar sus fotos con crédito; seguir sumando a mano
desde el panel (hoy 18). Sin esto, Deportes y Balcarce van a seguir en 60-70 %.

**Lo que no cambia en ninguna opción** (límite): nunca un menor ni una víctima, nunca una marca de agua ni el
nombre de otro medio pegado encima, Policiales sólo con fuente oficial, crédito en el epígrafe, banco propio.

### C.4 Preguntas (fotos)

1. ¿Hacemos la huella dHash con "no repetir la misma foto en 7 días" (salvo repasos y la misma historia)?
2. ¿Reintentamos las 20 notas que quedaron sin foto por una falla del servicio?
3. ¿Les pedimos a los medios y las instituciones de Balcarce permiso para usar sus fotos con crédito?
4. ¿Probamos Haiku con visión contra Gemini con 50 fotos etiquetadas por Hernán?

---

## D. Publicación y redes (Etapa 9)

### D.1 Cómo funciona hoy

Ocho piezas de video por día (clima de la mañana, repaso de la mañana, repaso de la tarde, farmacia, clima de
la noche, repaso de la noche, "Un día como hoy" y, según el día, agenda, útiles, feriado, Participá), cada una
como reel y/o historia en Facebook e Instagram; más 5 posteos de notas con foto en Facebook con su espejo en
Instagram (`redes/piezas.mjs`, `redes/elegir.mjs`, `CRITERIO-REDES.md` § 3). Unos **7 audios por día** de un
cupo gratis de 10. Política y Policiales nunca salen solas (regla que no cambia).

### D.2 Números (`redes.json`, `estadisticas.json`, `estadisticas-piezas.json`)

**Publicaciones por día (6 al 14/10):** 33 a 40. Por ejemplo, el 13/10: 5 posteos de Facebook, 8 videos de
Facebook, 3 reels más en Facebook, 8 piezas de Instagram, 5 fotos espejo en Instagram y 10 historias de los
reels: **39**.

**Seguidores:**

| | 25/09 | 11/10 | 15/10 |
|---|---|---|---|
| Facebook | 1 | 9 | **53** |
| Instagram | 3 (10 publicaciones) | 4 (130) | **7 (165)** |

Facebook saltó de 10 a 53 entre el 11 y el 15/10, y el 13/10 las vistas de la página pasaron de 1.321 a
23.760, con 205 interacciones. **NO SÉ por qué** (no hay una pieza medida que lo explique: puede ser que
alguien haya compartido la página). Vale preguntarlo: si fue una persona compartiendo, es la mejor evidencia de
que la distribución humana rinde más que la cantidad.

**Qué se ve, por pieza** (398 mediciones):

- **240 (60 %) vuelven vacías o en cero**: todos los reels e historias de Facebook y las historias de
  Instagram. Medimos la mitad de lo que publicamos.
- Reels de Instagram, mediana de vistas: **repaso de la noche 9**, repaso de la mañana 6, de la tarde 4,
  efeméride 4.
- Foto espejo en Instagram: mediana ~5; la mejor, **66** (Bomberos, 3/10); después 31, 29, 26, 23 (todas
  notas de acá).
- Posteo con foto en Facebook: mediana ~4.

**La web** (29/09 al 12/10): 646 visitas; llegan de **facebook.com 523**, directo 179, **Google 7**. Hay días
con mucho tráfico de EE. UU., Suecia, Irlanda y China (probablemente robots: **NO VERIFICADO**). Del 11 al
15/10 la medición diaria de Cloudflare vino en cero varios días (falla de la medición, no de la web). Lo más
leído es servicio de acá (la tabla de la Liga, el Concejo, la Cooperativa que corta la luz, el hospital).

**Diagnóstico** (coincide con `03-PLAN` § 4): el cuello es la **distribución**, no la producción. Rinde lo
local, de servicio y con foto real; el repaso de la noche. No rinde: la cantidad, el repaso de la tarde, las
historias que nadie puede medir.

### D.3 Opciones de cantidad

**D1 · Seguir con ~40 por día (US$ 0).** Gasta 7 de 10 audios y deja poco margen para un aviso urgente.

**D2 · Bajar a 10-12 por día (US$ 0). Recomendada.** Mantener: clima de la mañana (historia), farmacia
(historia), **un** repaso con voz a la noche (reel + historia), 3 a 5 posteos de notas de acá con foto
(Facebook + espejo en Instagram), avisos de clima, feriado; efeméride 2 o 3 veces por semana; agenda los
jueves y útiles los sábados. Sacar: repasos de la mañana y la tarde, el reel de Facebook que repite la
historia, la "historia del reel", el clima de la noche. Quedan **4 o 5 audios por día**. Encaja con la decisión
del 12/10 de no difundir las redes hasta la versión 1.0: menos ruido mientras tanto.

**D3 · Bajar y además medir bien (US$ 0).** D2 más UTM en los enlaces y dejar de medir lo que vuelve siempre
vacío.

### D.4 Otras redes: qué permite cada una

*Todo esto es de lo que sé hasta junio de 2026; **NO LO PUDE VERIFICAR** desde la PC sin conexión a sus
páginas, y estas condiciones cambian seguido.*

| Red | Cómo se publica solo | Qué pide | Costo | Lo difícil |
|---|---|---|---|---|
| **Threads** | API de Meta (`graph.threads.net`): texto, foto y video | Sumar Threads a la app de Meta que ya existe; permisos `threads_basic` y `threads_content_publish`; tope de unas 250 publicaciones por día | Gratis | El video tiene que estar en una dirección pública (hoy no hay: haría falta R2, ya preparado en `fotos-a-r2.yml`); el token dura 60 días y hay que renovarlo solo |
| **YouTube Shorts** | YouTube Data API, `videos.insert` | Proyecto de Google, OAuth del canal | Gratis; el cupo diario alcanza para unas 6 subidas | Los proyectos sin auditar suben los videos **privados** hasta pasar la auditoría de Google; con la app "en prueba", la autorización vence a los 7 días |
| **TikTok** | Content Posting API | App aprobada por TikTok | Gratis | Sin auditoría, lo publicado queda **visible sólo para la cuenta**; la alternativa es subirlo como **borrador** y que una persona lo publique desde el celular |
| **X** | API v2 | Cuenta de desarrollador | Hubo un plan gratis de pocas publicaciones por mes (unas 500); el siguiente costaba US$ 100 a 200 por mes | Las condiciones cambiaron varias veces: **puede no entrar en el presupuesto** |
| Canal de WhatsApp | No conozco una API pública para publicar en Canales | — | — | A mano |

**Recomendación:** si se suma una, **Threads** primero (misma app, mismo equipo, gratis), y sólo después de
D2. YouTube y TikTok, a mano una vez por semana con la mejor pieza hasta tener la auditoría. X, no por ahora.

### D.5 Los avisos (WhatsApp por CallMeBot)

CallMeBot se quedó sin cupo cerca del 4/10 y el 12/10 se decidió pasar a **mail** (falta elegir el servicio:
`PENDIENTES.md`). Opciones (**NO VERIFICADOS** los límites gratis):

| Opción | Costo | Ventaja | Contra |
|---|---|---|---|
| Mail por un servicio con API (Resend, Brevo) | Gratis con tope diario | Se manda con `fetch`, sin dependencias | Una cuenta más y un dominio que verificar |
| Mail con Cloudflare (Email Workers a direcciones verificadas) | Gratis | Queda en la misma cuenta que el reloj y la web | Sólo a direcciones verificadas (las de ustedes: alcanza) |
| Mail por Gmail de `radarbalcarce@` | Gratis | Sin cuenta nueva | Necesita contraseña de aplicación y SMTP (más código sin dependencias) |
| **Telegram** (un bot) | Gratis | Llega como notificación al instante, ideal para lo urgente | Hay que instalar Telegram y escribirle al bot una vez |
| WhatsApp oficial de Meta (Cloud API) | Se paga por mensaje | Es WhatsApp | Plantillas aprobadas, verificación del negocio: demasiado para esto |

**Recomendación:** el **resumen de las 21 por mail** (Cloudflare o Resend) y lo **urgente por Telegram** si
están dispuestos a instalarlo (si no, también por mail). Y un aviso de afuera si el vigilante mismo deja de
correr (un servicio tipo "si no me llamás en 2 horas, avisá").

### D.6 Preguntas (redes)

1. ¿Bajamos a 10-12 publicaciones por día con la lista de D2?
2. ¿Qué pasó en Facebook el 13/10 (de 10 a 53 seguidores y 23.760 vistas)? ¿Alguien compartió la página?
3. ¿Sumamos una red automática? Si sí, ¿Threads primero?
4. Avisos: ¿mail para el resumen y Telegram para lo urgente, o todo por mail?
5. (Hernán) Política y Policiales siguen esperando a una persona en las redes. ¿Salud entra en ese grupo si se
   crea la sección?

---

## E. Qué modelo para cada tarea, y cuánto cuesta

Volúmenes reales: ~150 notas por día llegan a la ficha y a la redacción (~4.500 por mes); ~95 por día pasan
el verificador de código (~2.850 por mes); ~80 por día buscan foto (~2.400 por mes). Precios de la tabla del
principio. Las cifras son **estimaciones**: nadie guarda hoy cuántos tokens gasta cada pedido.

| Tarea | Hoy | Modelo de decisión | Modelo chico | Modelo fuerte | Recomendado | US$ por mes |
|---|---|---|---|---|---|---|
| Semáforo: ficha de sensibilidad (A2) | palabras | Mercury Decide ~0,2 (sí/no con probabilidad) | Haiku 5.5 ~1 | Sonnet 5.5 en todo ~19; sólo en las dudosas ~2 | Haiku (o Mercury) + Sonnet en lo dudoso | **~3** |
| Redacción | Gemini Flash-Lite gratis | no escriben | Haiku 5.5: 3 a 8 (hasta 15 con razonamiento) | Sonnet 5.5: todo 60 a 100; 15 de acá por día 9 a 13 · Opus 5.5: más de 150 | Gemini hasta la prueba a ciegas; después decidir | **0** (hoy) a 13 |
| Verificación de datos y forma | código | — | — | — | código, con B1 | **0** |
| Verificación de sentido (B2) | no hay | — | Haiku 5.5 ~1,7 | Sonnet 5.5 en las de acá y Política ~6 | Haiku en todas | **~2** |
| Fotos: elegir y ver marcas y menores | Gemini gratis, Groq de respaldo | — | Haiku 5.5 con visión ~1,3 | — | Gemini; probar Haiku | **0** a 1,3 |
| Fotos repetidas (dHash) | no hay | — | — | — | código | **0** |
| Auditoría de calidad y de línea editorial | Groq, cada hora, sobre lo publicado | — | — | Opus 5.5: 50 notas por mes ~4 | Opus, una vez por mes, con informe para ustedes | **~4** |
| Guiones de las piezas | plantillas | — | — | — | plantillas | **0** |
| Voces | Gemini TTS gratis (10 por día) | — | — | — | igual (las voces propias vencen el 29/09/2027) | **0** |

**Tres paquetes:**

| Paquete | Qué incluye | US$ por mes | Con Workers (5) y las etapas 2-5 (~2) |
|---|---|---|---|
| Mínimo | B1, C1, A1 (todo código) | 0 | 7 |
| **Recomendado para empezar** | lo mínimo + ficha de sensibilidad + verificador de sentido con Haiku + auditoría mensual con Opus | **6 a 8** | **13 a 15** |
| Con Sonnet escribiendo lo de acá | lo recomendado + Sonnet para las ~15 notas de acá por día | 15 a 21 | 22 a 28: **al límite del tope** |

Ojos abiertos: con Anthropic directo no hay comisión; por OpenRouter se suma un 5,5 % al cargar crédito.
Los modelos de Claude piensan por defecto: en tareas cortas conviene bajar el esfuerzo (`effort: low`) o no
cierra el costo. La caché del texto fijo baja la entrada un 70 a 90 % si el prefijo es idéntico en cada
pedido.

---

## F. Todas las preguntas, juntas

**Para Hernán (tocan límites legales o la línea editorial; nada se aplica sin su sí por escrito):**

1. ¿Los arreglos de palabras de A1 ("El Niño", "el menor de los hermanos", "Petro", "sorteo del fixture", el
   Presidente en el exterior) se hacen ya?
2. ¿La ficha de sensibilidad (A2) con el rojo intacto, la IA que sólo endurece sola, y las palabras de menores
   que se sueltan sólo fuera de Policiales y Balcarce con dos lecturas que coinciden?
3. ¿Lo que hoy pasa en verde y no debería ("dos niñas internadas", "chicos de 15 y 16 años detenidos") pasa a
   frenar?
4. ¿Acusaciones contra figuras públicas o instituciones con dos medios u oficial salen solas (con atribución y
   condicional)?
5. ¿La muerte de una persona conocida de Balcarce, sin delito ni suicidio, sale sola?
6. ¿Una nota sobre políticas de prevención del suicidio espera a una persona en vez de no salir nunca?
7. ¿La regla 22 de línea editorial va, y con qué texto?
8. ¿Salud espera a una persona en las redes, como Política y Policiales?

**Para Hernán y Andrés:**

9. ¿La cola del celular se limita a 5-8 dudosas por día y el resto se archiva con su motivo?
10. ¿Arreglamos ya el verificador (copia flexible, fecha de publicación, letras rotas) y corregimos las 14
    notas?
11. ¿Prueba a ciegas de 30 notas con Gemini, Haiku y Sonnet (menos de US$ 2)?
12. ¿Verificador de sentido con Haiku (~US$ 2 por mes)?
13. ¿Pedimos permiso por escrito a la Municipalidad para sus comunicados tal cual, y consultamos a un
    abogado?
14. ¿Huella dHash para no repetir fotos en 7 días, y reintentar las 20 que fallaron por el servicio?
15. ¿Pedimos permiso a medios e instituciones de acá para sus fotos?
16. ¿Bajamos a 10-12 publicaciones por día?
17. ¿Qué pasó en Facebook el 13/10?
18. ¿Una red más (Threads primero)?
19. ¿Avisos por mail y Telegram, o sólo mail?
20. ¿Arrancamos con el paquete "recomendado" (US$ 6 a 8 por mes de IA)?

---

## G. Lo que NO SE PUDO VERIFICAR

- **Cuánto acierta un modelo en la ficha de sensibilidad** (menor identificable, víctima, acusación). Hay que
  probarlo con notas etiquetadas por Hernán antes de prender nada.
- **El rojo por día**: la lista pública no incluye lo rojo; en una corrida hubo 3. No sé cuántos distintos
  por día.
- **El tope de 40 pendientes por corrida**: si alguna corrida lo pasó, las cuentas del amarillo son un piso.
- **Los tokens reales de producción**: no se guardan (`usageMetadata`). Los costos son estimaciones con los
  tokens medidos en la prueba (5.786 de entrada y 627 de salida por nota) y los precios de hoy.
- **La calidad de escritura en castellano rioplatense** de Haiku, Sonnet y Opus: nadie la juzgó a ciegas.
- **Si el arreglo de B1 sube el porcentaje al primer intento**: es lo esperable, no está medido.
- **Si la web muestra hoy las 14 notas con letras rotas** tal como están en `archivo.json`.
- **Si Haiku con visión ve mejor las marcas de agua y los menores** que Gemini.
- **Las condiciones de las APIs de Threads, YouTube, TikTok y X**, y los topes gratis de Resend, Brevo y
  Cloudflare Email: de memoria, sin poder abrir sus páginas.
- **El salto de Facebook del 13/10** y si el tráfico de EE. UU., Suecia, Irlanda y China es de robots.
- **Lo legal**: las notas sobre la ley 11.723, la ley 26.061, la 26.485 y Campillay salen de
  `INVESTIGACION.md`; no son una opinión de abogado.

---

## H. Archivos de esta carpeta y cómo volver a medir

| Archivo | Qué es |
|---|---|
| `ANALISIS.md` | este documento |
| `semaforo-por-dia.csv` | notas que esperaron a una persona, por día y por motivo, del 25/09 al 15/10 |
| `semaforo-una-corrida.csv` | las 39 notas frenadas para una persona en la corrida del 15/10, con el juicio de cada una (titulares sensibles omitidos) |
| `herramientas/minar-portada.cjs` | recorre la historia de `portada.json` en git y junta pendientes y publicadas (`node minar-portada.cjs <repo> 2026-09-25 salida.json`, ~1,5 minutos) |
| `herramientas/analizar-pend.cjs` | cuenta los pendientes por motivo, día, sección y destino (`node analizar-pend.cjs salida.json <repo>/web/data/archivo.json ejemplos.json`) |
| `herramientas/csv-dias.cjs` | arma `semaforo-por-dia.csv` desde `ejemplos.json` |
| `herramientas/foto-ingesta.mjs` | una corrida de la ingesta en seco, sin escribir nada ni usar IA (`node foto-ingesta.mjs <repo> foto.json`) |
| `herramientas/probar-palabras.mjs` y `probar-falsos-negativos.mjs` | frases de prueba contra el semáforo real |
| `herramientas/raros.cjs` | busca letras rotas en lo publicado |
| `herramientas/copias.cjs` | qué frases marcó como copia el verificador en las pruebas de redacción |
| `herramientas/fotos.cjs` | cobertura de fotos, por qué faltan y repetidas |
| `herramientas/piezas.cjs` | mediciones de las piezas de redes por tipo |

Las salidas intermedias (`ejemplos.json`, `foto.json`) **no se guardan en el repositorio** a propósito: tienen
titulares de notas con menores y policiales, y el repositorio es público. Si se regeneran, dejarlas fuera del
repo.
