# L. Notas de Balcarce con menores, escritas sin identificarlos

*Informe de diseño, 24/10/2026. Solo lectura: no se tocó código ni datos. Se basa en `CLAUDE.md`, `CRITERIO-EDITORIAL.md` (semáforo y regla 9 de la IA), `ingesta/menores.mjs`, `semaforoDelTexto` y `semaforo()` de `ingesta/ingesta.mjs`, `REGLAS_SEMAFORO` de `ingesta/fuentes.mjs`, `reels/reescritura.mjs`, `ingesta/verificar.mjs`, `ingesta/fotos-menores.mjs`, `web/scripts/ilustrar-notas.mjs`, `web/scripts/fotos-notas.mjs`, `redes/elegir.mjs`, `docs/historico/etapa-10-operacion/ANALISIS-SEMAFORO-Y-SIN-CUERPO.md` y los datos de `web/data/` (`archivo.json`, `fichas.json`, `estadistica-seleccion.json`, `redes.json`). Lo legal no se investigó: se parte de lo que el repo ya dice (leyes 26.061 y 26.485) y de la decisión del dueño del 24/10.*

## 0. En diez líneas

1. **Decisión del dueño (24/10):** en lo de Balcarce no puede faltar la noticia. Si hay menores, se escribe igual, **sin identificarlos**, con enfoque institucional y de interés público.
2. Hoy el **rojo** frena toda la nota. Pero ojo: la regla 291 (22/10) ya soltó el amarillo para lo de acá; lo que queda frenando a Balcarce por chicos es **sólo el rojo** (una lista corta de frases) más la regla 9 de la IA y el verificador.
3. El rojo mezcla cosas muy distintas: "menor de edad" (que aparece en una pelea o en un accidente) está en la misma lista que "abuso sexual" y "suicidio". Hay que **partirlo en dos**: rojo duro (nunca) y rojo "anonimizable" (se escribe sin identificar).
4. Propuesta: tres grupos. **A, nunca** (abuso y delitos sexuales, suicidio, violencia de género con víctima identificable, chicos bajo protección del Estado). **B, se escribe anonimizada** (accidentes, peleas y riñas, violencia entre adolescentes, hechos en eventos, hechos en escuelas, un chico herido, un chico que se descompone, un chico desaparecido que apareció). **C, ya sale hoy** (actividades de chicos sin hecho grave).
5. La frontera entre A y B es **decisión del dueño** (§ 1.4). Dejo una propuesta, no una decisión.
6. Cambios: el semáforo suma una marca nueva `anonimizar` (no cambia el color rojo de A); el prompt suma una instrucción propia para B; el verificador suma una **revisión de identidad** (nombres, apellidos, iniciales, apodos, escuela, club, barrio, familiares, la edad exacta junto a un lugar chico) en todos los campos; las fotos, ilustraciones y redes se **apagan** para estas notas.
7. Hay un **riesgo que ya existe hoy y que esta propuesta también corrige**: la nota "Investigan la edad y el vínculo escolar del agresor de la Estudiantina" (20/10, Policiales) salió sola, con una ilustración de IA, y cuenta que "su familia había solicitado colaboración en 2024 tras su desaparición". Eso es un dato que reconoce a una persona en un pueblo chico (§ 1.1).
8. Todo detrás de un **interruptor apagado por defecto** (`NOTAS_CON_MENORES`, variable de GitHub, "Si" lo prende), con una **lista aparte** (`web/data/notas-anonimizadas.json`) que una persona puede revisar.
9. Redes: **no van**, ni Facebook ni Instagram ni repasos ni podcasts. Es la parte más simple y la más segura.
10. Antes de prender: una persona tiene que aprobar la frontera A/B, mirar diez notas de ensayo en sombra y firmar. El riesgo que **no** se puede llevar a cero está en § 4.

---

## 1. Qué pasó con la Estudiantina (lo que se pudo reconstruir)

### 1.1 Lo que dicen los datos

Se buscó "Estudiantina", "apuñal" y "arma blanca" en `web/data/*.json`. La estadística de la selección (`estadistica-seleccion.json`) guarda sólo los últimos días (20 al 23/10) y **no guarda la palabra que frenó** (sólo los frenos de 23/10 en adelante, regla 298). Lo que se encontró:

| Pieza | Qué es | Qué pasó |
|---|---|---|
| `4ap1yu` (20/10) | "Investigan la edad y el vínculo escolar del agresor de la Estudiantina", sección **Policiales**, un solo medio (Radio Gabal) | **Se publicó sola**, con ilustración de IA (`fotos-notas/4ap1yu-ia.jpg`). Habla de "un joven" agredido con arma blanca cerca de la Escuela Industrial y del presunto agresor ("mayor de edad", sin escuela, "su familia había solicitado colaboración en 2024 tras su desaparición") |
| `1vk5xun`, `junk3c` (ficha del 23/10 00:01) | La ficha de la IA dice "joven apuñalado durante la Estudiantina" (Policiales) y "suspensión de la Estudiantina tras los incidentes violentos y la agresión con arma blanca" | En la estadística figuran como **`repetida`**: se unieron a otra nota, no las frenó el semáforo |
| `10k46b4` (21/10) | Ficha: "hechos de violencia y suspensión de la Estudiantina", Balcarce, **17 medios** | Resultado **`tarde`**: llegó cuando el hecho ya tenía más de las horas de estreno (12, o 24 con 8 medios o más). **Una historia contada por 17 medios no salió por la ventana de tiempo**, no por el semáforo |
| `bvylmk`, `1m4nm4s`, `1gbhjbe`, `rdo3nh` (21 al 23/10) | La política, el debate de la suspensión, el pedido de reunión | Se publicaron (institucional, sin chicos) |

Resumen honesto: **no pude encontrar en los datos que el rojo haya frenado la noticia del apuñalamiento**. Puede haber pasado antes del 20/10 (fuera de lo que guarda la estadística), o pudo ser un freno de otra clase. Lo que sí se puede decir con el código:

- "Un joven fue apuñalado durante la Estudiantina" da **amarillo** por "apuñalado", y desde el 22/10 el amarillo no frena lo de acá. Sale.
- "Un **menor de edad** apuñaló a otro alumno" da **rojo** (`menor de edad`): no sale. Es exactamente el caso del dueño.
- "Un **chico se apuñaló**" da **verde** (probado el 24/10 con `semaforoDelTexto`). Este es el hueco contrario: la lista no sabe leer eso y la nota saldría con el protagonista identificable si la fuente lo nombra, y sólo la IA y el verificador lo cuidarían.
- "Un adolescente de 16 años quedó herido con un arma blanca" da **amarillo** por "adolescente" (y la edad menor), y también sale.

Es decir: hoy el sistema es **inconsistente**: según con qué palabras lo escriba la fuente, la misma historia sale o no sale, y la que sale no tiene una instrucción propia de anonimizar. Esto es lo que hay que ordenar.

### 1.2 Lo que ya cuida el sistema (y alcanza para el caso A, no para el B)

- Regla 9 de la IA (`CRITERIO-EDITORIAL.md`): nunca identificar a un menor o a una víctima sexual o de género, "hablás de forma general". Es una instrucción general, no pide **qué escribir en su lugar** ni cómo contar el hecho.
- El verificador (`ingesta/verificar.mjs`, `nombresDe`) rechaza **nombres nuevos** que no estaban en la fuente. Es lo contrario de lo que hace falta: no mira si **un nombre de la fuente pasó a la nota** cuando es de un menor.
- Fotos: `ilustracionPermitida` y `motivoParaSaltar` no ilustran notas rojas; Policiales no lleva foto real salvo fuente oficial. Una nota "anonimizable" **no es roja**, así que hoy se la ilustraría.
- Redes: Política y Policiales esperan siempre a una persona; Balcarce de otras secciones sí podría ir sola (`vaAFacebookPorLoQueEs`). Una pelea en una fiesta escolar contada en "Balcarce" podría llegar a Facebook.

---

## 2. Qué se puede publicar anonimizado y qué no (la lista propuesta)

### 2.1 Grupo A: nunca se publica, con o sin anonimizar

Se mantiene el rojo tal cual está hoy. **No se toca esta lista sin preguntar** (regla de `CLAUDE.md`).

| Categoría | Frases del rojo de hoy | Por qué no |
|---|---|---|
| Abuso y delitos sexuales contra chicos | `abuso sexual`, `abusó sexualmente`, `abusos sexuales`, `abuso infantil`, `abuso de menores`, `corrupción de menores`, `pornografía infantil`, `grooming`, `estupro`, `violación`, `violada`, `la violaron`, `explotación sexual`, `trata` | La víctima queda marcada de por vida y el pueblo es chico: aunque no se la nombre, el contexto la reconoce. La ley 26.061 y los protocolos de cobertura responsable lo desaconsejan aun anonimizado |
| Suicidio y autolesiones graves | `suicid…`, `se quitó la vida`, `suicidarse`, `suicidaron`, `suicidada` | Los criterios de cobertura responsable de suicidios (OMS, protocolos de Salud Mental y de los colegios de periodistas) piden **no dar el método, el lugar ni detalles, no sensacionalizar y dar líneas de ayuda**. Eso es un tipo de nota distinto, y con un menor aumenta el riesgo de contagio. Queda afuera de este mecanismo |
| Violencia de género con víctima identificable | `violencia de género`, `femicidio`, `feminicidio`, `víctima de violencia` | Ley 26.485. Una víctima, aunque sea adulta, no se anonimiza bien en un pueblo chico |
| Chicos bajo protección del Estado | institucionalizados, hogares, en guarda, causas de adopción o de protección, chicos del servicio local | Su condición misma es lo que no puede saberse. No hay forma de contarlo sin exponerlo |
| Muerte de un chico | accidente o hecho con muerte de un menor | Propuesta: **A en esta primera etapa** (§ 2.4, frontera 3) |
| Un menor **acusado** de un delito grave (homicidio, robo agravado) | `menor de edad` junto a delito grave | Propuesta: **A** (§ 2.4, frontera 4) |

### 2.2 Grupo B: se escribe anonimizada

Son hechos que **pasan en Balcarce, son de interés público y se pueden contar por su lado institucional**: qué pasó, qué hizo el Municipio, el colegio, el hospital, la policía, el Concejo; qué se resolvió; qué medidas se toman.

| Categoría | Ejemplos | Cómo se cuenta |
|---|---|---|
| Accidentes con un chico herido | choque de una moto con un adolescente, un chico lastimado en un juego | "Un adolescente de 15 años resultó herido…", sin escuela ni barrio, sin dar la calle exacta si identifica; el foco, el estado de la ruta, la seguridad vial, el servicio de emergencias |
| Peleas y riñas entre adolescentes | una pelea a la salida de un boliche o una escuela | "Una pelea entre adolescentes dejó…", sin nombres ni escuela; el foco, la respuesta de la Policía, el Municipio, la escuela como institución |
| Violencia entre adolescentes con arma blanca | el caso de la Estudiantina | "Un joven de 17 años resultó herido con un arma blanca…"; el foco, la suspensión del evento, los controles, el pedido del Concejo |
| Hechos en eventos masivos | festejos, estudiantinas, fiestas de egresados | Se cuenta como hecho **del evento**, no de la persona |
| Hechos en escuelas | una amenaza, una pelea, una intoxicación | "Una escuela de la ciudad…" si el nombre de la escuela ya identifica; si es la institución la protagonista (un acto), puede nombrarse |
| Un chico que se descompone o se enferma en un evento | un golpe de calor en un acto | Sin edad exacta si la edad más el lugar lo reconocen |
| Un chico perdido o buscado que apareció | el desaparecido con aviso oficial | **Mientras se busca**, la Policía lo difunde y es público; **cuando aparece**, no se vuelve a nombrar. Dudoso: ver § 2.4, frontera 5 |
| Un chico imputado o demorado por un hecho **no grave** | una travesura, un daño | Sin nombre y con enfoque institucional; la imputabilidad de un menor ya la limita la ley |

### 2.3 Grupo C: ya sale hoy

Actividades de chicos sin ningún hecho grave (deportes, actos, concursos). No cambia: ya salen por el verde y, con `FOTOS_MENORES_OFICIALES` en "Si", pueden llevar la foto oficial de una fuente de Balcarce.

### 2.4 La frontera, para que decida el dueño

> **Esto es decisión del dueño (Hernán).** Dejo mi propuesta de partida, que es la más conservadora que respeta lo que pidió ("que la noticia exista"). Cada línea puede moverse con una variable de GitHub y no con código.

| # | Frontera | Mi propuesta | Si el dueño prefiere más apertura | Si prefiere más cuidado |
|---|---|---|---|---|
| 1 | Abuso sexual y delitos sexuales | **A, nunca** | No lo recomiendo. Sólo con un comunicado oficial muy general y sin lugar | igual |
| 2 | Suicidio | **A, nunca**, y que lo vea una persona si hay un caso muy público | Una nota informativa sólo con un comunicado oficial, sin método ni lugar, con línea de ayuda (147/135 en Argentina, 0800 de Salud Mental) | igual |
| 3 | Un chico muerto en un accidente o hecho | **A** en la primera etapa; pasa a B después de un mes sin problemas | B desde el día uno, sin nombre ni escuela, con comunicado oficial | A |
| 4 | Un menor **acusado** de un delito grave (homicidio, abuso, robo con arma) | **A** | B si el hecho es público por un comunicado de la Fiscalía, siempre "un adolescente de X años" | A |
| 5 | Un chico desaparecido o buscado | **B sólo mientras hay un pedido oficial de la Policía**; al aparecer, B sin más detalle | B | A |
| 6 | Violencia de género, mujeres adultas | **A** (como hoy) | — | — |
| 7 | Chicos bajo protección (hogares, guarda) | **A** | — | — |
| 8 | Un chico **víctima** de violencia física (no sexual) de un adulto: golpiza de un docente, de un padre | **A** en la primera etapa | B con enfoque institucional (denuncia, medida del colegio) | A |
| 9 | Una edad exacta | "un adolescente de 15 años" **se permite** sólo si no hay escuela ni barrio ni club cerca; si hay, "un adolescente" a secas | permitir siempre la edad | nunca la edad, sólo "un menor" |

---

## 3. Cambios concretos

### 3.1 El semáforo (`ingesta/fuentes.mjs`, `ingesta/ingesta.mjs`)

Hoy `REGLAS_SEMAFORO.rojo` es una sola lista y `semaforoDelTexto` devuelve `rojo` con la primera frase que pega. Se propone:

1. **Partir el rojo en dos listas:**
   - `rojoDuro` = las frases del grupo A (abuso, grooming, violación, trata, suicidio, femicidio, violencia de género…). Queda **igual que hoy**, mirada siempre sobre el texto completo. `semaforoDelTexto` devuelve `rojo` como hoy.
   - `rojoAnonimizable` = lo que hoy sólo está en el rojo por ser un menor (`menor de edad`, `niño identificado`, `niña identificada`) y lo que el amarillo ya detecta (`adolescente`, `niño`, `nene`, `un menor de`, una edad menor de 18 por `menorPorEdad`) **junto a** una palabra de hecho (accidente, pelea, riña, herido, arma blanca, golpiza, internado).
2. **Una marca nueva en la nota, no un color nuevo:** `nota.anonimizar = { grupo: 'B', motivo: '"menor de edad" + "apuñalado"', edad: 15 }`. El color sigue siendo `verde`. La marca se guarda en `portada.json`, `archivo.json` y la lista aparte (§ 3.6).
3. **Una función nueva, `clasificarMenores(nota)`** en un archivo nuevo, `ingesta/menores-anonimizadas.mjs` (sin dependencias, como `ingesta/menores.mjs`): devuelve `{ grupo: 'A' | 'B' | null, motivo }`. Recibe la lista de la frontera (§ 2.4) y las variables de GitHub que la mueven (`MENORES_MUERTE`, `MENORES_ACUSADOS`, `MENORES_DESAPARECIDOS`: cada una "no" por defecto).
4. **Una regla de seguridad por encima:** si cualquier texto de la nota (título, fuente, cuerpo) toca `rojoDuro`, la nota es A y **no se publica**, aunque también diga "pelea entre adolescentes". El rojo duro siempre gana.
5. **Sólo para lo de Balcarce** (`esDeAca`), como pidió el dueño. Lo de afuera con chicos sigue como hoy (rojo o amarillo, no sale). Un chico de afuera no es "la noticia que no puede faltar".
6. **Cerrar el hueco inverso** (§ 1.1): sumar a la detección las formas que hoy dan verde (`se apuñaló`, `se cortó`, `se lastimó` junto a `chico`, `nene`, `adolescente`, `alumno`). Con su prueba.
7. **El interruptor:** variable `NOTAS_CON_MENORES` ("Si" lo prende). Apagado, todo se comporta **exactamente como hoy** (el B sigue en rojo).

### 3.2 El prompt de la IA (`CRITERIO-EDITORIAL.md` § 12, `ingesta/prompt-editorial.mjs`)

La regla 9 pasa de una línea general a un **bloque propio** que sólo se agrega al pedido si la nota tiene la marca `anonimizar` (así el prompt de las demás notas no crece, regla de "instrucciones más cortas"). Texto propuesto, en castellano simple:

> **Esta nota involucra a una persona menor de 18 años. Tenés que escribirla sin que nadie pueda reconocerla.**
>
> 1. Nunca nombres al menor, ni a su familia, ni a un compañero. Ni nombre, ni apellido, ni apodo, ni iniciales, aunque la fuente los publique.
> 2. Escribí "un adolescente", "una joven", "un chico". Podés decir la edad ("de 15 años") sólo si no la juntás con la escuela, el club, el barrio, la calle o el trabajo de los padres. Si se juntan, dejá sólo "un adolescente".
> 3. No digas en qué escuela, club, barrio o cuadra estaba, ni a qué curso va, ni quién es su familia ("hijo de un comerciante", "nieto de…"). Si el lugar es parte del hecho y es un lugar público (una calle principal, la plaza, un estadio), podés decirlo.
> 4. No describas rasgos físicos, ropa, antecedentes, enfermedades ni la historia personal de ese chico.
> 5. Contá el hecho **de lejos**: qué pasó en pocas palabras, sin detalles gráficos ni el método (no cuentes cómo, cuántas veces ni con qué).
> 6. Poné el centro en lo **institucional y de interés público**: qué hizo la Policía, el hospital, el Municipio, el Concejo, la escuela como institución; qué medidas se toman; qué dice un comunicado oficial; qué pasó con el evento.
> 7. No hables de culpables ni de culpa: usá "según la Policía", "se investiga". Nada que condene a un chico.
> 8. No repitas el texto de la fuente. Escribí con tus palabras.
> 9. Si no podés contar la noticia sin identificar al chico, devolvé `"anonimizable": false` y no escribas la nota.
> 10. Si el hecho es de abuso, suicidio o violencia de género: no escribas nada y devolvé `"anonimizable": false`.

Y un **campo nuevo en la respuesta de la IA**: `anonimizada: true/false`, `datosQueSacó: [...]` (lista de lo que quitó: "nombre", "escuela", "barrio"). Sirve para auditar.

**Importante:** a la IA no se le pasa el nombre del chico. Como el texto de la fuente (`textoDeLaFuente`) lo trae igual, se propone **limpiar antes de enviar**: un paso en `reels/reescritura.mjs` que reemplace los nombres propios que el detector (§ 3.3) marque como del menor por `[el menor]`. Así la IA no puede copiar lo que no vio. Es la medida más fuerte y la más barata.

### 3.3 El verificador (`ingesta/verificar.mjs`)

Hoy el verificador mira que la IA no **invente** datos. Falta que mire que no **filtre** datos. Se propone una función nueva `identificaAlMenor(fuente, nuevo)` que devuelve una lista de problemas. Se llama sólo si la nota tiene la marca `anonimizar`, sobre **todos los campos que se publican**: `titulo`, `copete`, `cuerpo`, `guion`, `textoRedes`, `claves`, `seSabe`, `noConfirmado`, `etiquetas`, `fuentesConsultadas[].aporte`, `slug`, `foto.credito` y el epígrafe. (El slug y las etiquetas son donde suelen escaparse los nombres: el `slug` es parte de la dirección y **no se cambia después**.)

Qué detecta:

1. **Nombres propios que estaban en la fuente cerca de una palabra de menor** ("el adolescente Juan Pérez", "Juan Pérez, de 15 años", "el alumno J. P."): se extraen con `nombresDe` y se arma una **lista de nombres a proteger** (`protegidos`), sacada de la fuente, no de la IA. Cualquier aparición de uno de esos nombres, de su apellido solo o de su primer nombre en los campos publicados **rechaza** la escritura.
2. **Iniciales** ("J.P.", "J. P.", "J.M.P.") junto a una palabra de menor o a la edad.
3. **Apodos** entre comillas o paréntesis ("«el Colo»") cerca de una palabra de menor.
4. **Parentescos que reconocen:** "hijo de", "hermano de", "sobrino de", "nieto de" + nombre propio o profesión ("hijo de un comerciante de la calle 17").
5. **Lugares que reconocen:** la escuela o el club por su nombre propio (lista `INSTITUCIONES_DE_BALCARCE` ya existente en `perfil-balcarce.md` y las fuentes de `alcance: 'local'`), la calle y la altura, el barrio, el curso ("5.º B"), el turno.
6. **Edad + lugar:** una edad exacta menor de 18 junto a una institución o un barrio en el mismo párrafo.
7. **Detalles de método** (cuántas puñaladas, con qué, cómo) cuando la nota es de violencia: se rechaza la frase, no la nota (como con el relleno).
8. **La IA no puede inventar la edad:** la edad tiene que estar en la fuente (ya lo cubre `numerosDe`, se controla que se use).
9. **La frase "el menor" ya no basta:** si el nombre del chico aparece en el **título de una fuente** que se cita como enlace, no es problema (el enlace es de la fuente); pero el **texto que se muestra** del enlace (`fuentesConsultadas[].enlace` más `medio`) no debe llevar un titular con el nombre. Se muestra sólo el medio.

Qué pasa si falla: el mismo camino que el resto del verificador. Se reintenta con la falla escrita en el pedido (hasta 3 veces); si no hay manera, la nota queda en `esperando-cuerpo.json` con motivo `identifica al menor` y **no se publica** (nunca se publica "a medias").

Detalle importante: esta revisión se agrega **también** para las notas que hoy salen sin marca (el caso de la Estudiantina del 20/10): si la nota dice "menor", "adolescente", "joven agredido" o una edad menor y en el mismo texto hay un nombre propio, o un dato de historia personal (como la desaparición de 2024), se frena igual. Esto corrige el riesgo que ya existe.

### 3.4 La bajada para redes y el `textoRedes`

- Una nota con marca `anonimizar` **no genera** `textoRedes`, `guion`, etiquetas ni hashtags específicos. El campo queda `null`.
- Aun así, como la bajada para redes se genera junto con la nota, se la pasa por el mismo `identificaAlMenor` antes de guardarla (por si una persona la usa a mano).
- `vaAFacebookPorLoQueEs`, `elegirParaFacebook`, `elegirParaPodcast` y `sePuedeEnUnRepaso` (`redes/elegir.mjs`) suman una primera línea: `if (nota.anonimizar) return false`. Una prueba controla que nada la saltee.

### 3.5 Fotos e ilustraciones

- `ilustracionPermitida` (`web/scripts/fotos-notas.mjs`) y `motivoParaSaltar` (`web/scripts/ilustrar-notas.mjs`) suman: `if (nota.anonimizar) return 'nota con menores: no se ilustra'`. **Ni siquiera una ilustración de IA** (puede parecerse a un chico real o dar pistas de la escena).
- La foto real tampoco: `fotoConMenorPermitida` y `menorEnActividadOficial` (`ingesta/fotos-menores.mjs`) devuelven `ok: false` si la nota tiene la marca. Una foto de banco ya guardada para esa nota se **saca** (como pasa hoy con `bloqueada`).
- La placa de redes queda sin foto: sale la placa genérica de la sección.
- **También se revisa la foto de la fuente:** la nota no usa la foto de la fuente, pero la fuente puede tener el nombre del chico en el epígrafe: ese epígrafe no se copia.
- El caso ya publicado (`4ap1yu`, con ilustración de IA): al prender el interruptor, la revisión del archivo (regla 212) debe **sacarle la ilustración** y volver a pasarla por `identificaAlMenor`.

### 3.6 Una lista aparte para que una persona la revise

- Archivo nuevo, `web/data/notas-anonimizadas.json`, que escribe sólo el workflow "Actualizar la web" (agregarlo a la línea `git add` de `actualizar.yml`, como avisa `CLAUDE.md`), con: `id`, `titulo`, `enlace`, `seccion`, `grupo`, `motivo`, `edadDicha`, `datosQueSacó`, `verificacion` (qué detectó `identificaAlMenor`), `cuando`, `revision: null | { por, cuando, resultado }`.
- En el panel del celular, una pestaña (o una sección de **Revisión**) "Con menores": se ven la nota publicada y, al lado, **lo que la fuente decía** (cifrado, como lo sensible del panel, porque el repositorio es público). Dos botones: "Está bien" y "Sacar" (que escribe en `retiradas.json` con motivo, cuándo y por).
- **Los textos de la fuente con el nombre del chico no se guardan en el repositorio público** (ni en `portada.json` ni en esta lista): se muestran sólo en el panel, desde la caché de Actions, como ya pasa con las pistas.
- La revisión del archivo (regla 212) vuelve a pasar estas notas cada vez que se corra y las retira si ya no cumplen.
- El informe diario por mail suma una línea: «Con menores: N publicadas hoy, N sin revisar».

### 3.7 Mensajes en la web para el lector

Una línea discreta debajo de la nota, no una advertencia: «Por respeto a las personas menores de edad involucradas, no damos sus datos.» Es una promesa del medio, útil para el lector y para las fuentes oficiales. Opcional; **proponer a Hernán y Andrés antes** (cambia lo que se ve, `feedback-cambios-visibles-del-sitio`).

---

## 4. Cómo se prueba, cómo se audita y qué pasa en redes

### 4.1 Pruebas (`pruebas/`, sin red)

Archivo nuevo: `pruebas/notas-con-menores.test.mjs`, y suma en `semaforo.test.mjs`. **Nombres falsos** siempre (que no coincidan con ninguna persona de Balcarce; ej. «Tomás Ferreyra», «Lucía Aramburu», «Escuela N.º 99 Los Naranjos»). Casos reales del repo, con los datos cambiados:

| Caso | Entrada (cambiada) | Resultado esperado |
|---|---|---|
| Estudiantina | «Tomás Ferreyra, de 16 años, fue apuñalado frente a la Escuela Industrial durante la Estudiantina» | Grupo B; la escritura no contiene «Tomás», «Ferreyra», «Escuela Industrial» ni «16 años» junto al lugar; sin foto; sin redes |
| Estudiantina, el agresor | «Investigan al presunto agresor, que estuvo desaparecido en 2024» (`4ap1yu`) | El verificador rechaza «desaparecido en 2024» y «su familia»; hoy salía |
| «Un chico se apuñaló» | «Un chico se apuñaló en una fiesta» | Hoy: verde sin marca (hueco). Debe: B, con marca |
| «Menor de edad» | «Un menor de edad apuñaló a otro» | Hoy: rojo. Con el interruptor prendido: B; apagado: rojo (igual que hoy) |
| Abuso | «Un adolescente fue abusado sexualmente» | Rojo duro, siempre, con el interruptor prendido o apagado |
| Mezcla | «Pelea entre adolescentes y un caso de abuso sexual en la misma escuela» | Rojo duro (gana el A) |
| Suicidio | «Un alumno se quitó la vida» | Rojo duro |
| Violencia de género | «Una chica de 17 años denunció violencia de género» | Rojo duro |
| Protección | «Un chico del hogar convivencial fue trasladado» | Rojo duro (A) |
| Accidente | «Una moto atropelló a un nene de 7 años en la 226» | B; sin edad junto a un lugar; sin foto |
| Iniciales | La IA escribe «J.F.» | Rechazo |
| Apodo | La IA escribe «el Colo» | Rechazo |
| Parentesco | «hijo de un conocido comerciante de la calle 17» | Rechazo |
| Slug y etiquetas | El slug o la etiqueta llevan «ferreyra» | Rechazo |
| Foto y redes | Nota con marca | `ilustracionPermitida` falso, `fotoConMenorPermitida` falso, `elegirParaFacebook` falso, `elegirParaPodcast` falso |
| Interruptor | `NOTAS_CON_MENORES` vacío | La nota se comporta como hoy |
| De afuera | Un chico en otra ciudad | Sigue como hoy (no entra al mecanismo) |
| Texto limpio | La IA no recibe el nombre del chico | La función de limpieza reemplaza el nombre por `[el menor]` |

Además, una prueba **de contrato** (como la del "sin dependencias"): ningún campo que se publica puede salir sin pasar por `identificaAlMenor` si la nota tiene la marca, y la lista de campos revisados es la misma que la de los campos que se publican (se compara contra el esquema de `archivo.json`). Es la prueba que evita que un campo nuevo quede afuera.

Y una **prueba de sombra** antes de prender: correr el clasificador sobre `archivo.json` (500 notas) y sobre las 4 jornadas de la estadística, y listar qué notas marcaría. Sin IA y sin red.

### 4.2 Cómo se audita lo publicado

1. **Lista aparte** (§ 3.6), con revisión de una persona dentro de las 24 horas.
2. **La auditoría con IA** (`ingesta/auditoria-ia.mjs`) suma una pasada propia para estas notas: «¿Se puede reconocer a algún menor?» con la lista de lo que la fuente decía. Sólo avisa; **nunca corrige sola** (a diferencia de la ortografía chica de la regla 98). Si dice que sí, la nota se retira hasta que la mire una persona.
3. **Revisión del archivo** (regla 212, cada 2 h): vuelve a pasar `identificaAlMenor` y retira lo que ya no cumple.
4. **Estadística:** `estadistica-seleccion.json` suma un resultado nuevo `anonimizada` (cuántas se publicaron, cuántas el verificador rechazó, cuántas quedaron en A). Hernán la mira cada semana, como los mínimos de medios.
5. **Un freno de emergencia:** poner `NOTAS_CON_MENORES` en "no" saca todas las notas con marca en la siguiente corrida (como hoy `FOTOS_MENORES_OFICIALES`). Una prueba lo controla.

### 4.3 Redes, repasos, podcasts y WhatsApp

**No van a ninguna.** Ni Facebook, ni Instagram (ni el espejo de Facebook), ni los repasos del día, ni los podcasts, ni los avisos de WhatsApp, ni las historias. Razones: en una red la nota viaja **sin contexto**, la comparten y comentan con nombres (los comentarios identifican al chico aunque la nota no lo haga), y no se puede borrar lo que otros copian. Un repaso nombra títulos y los títulos son lo más expuesto.

Además, el caso de los **comentarios** de Facebook: aunque la nota no vaya a redes, una pieza hermana sí (por ejemplo, la nota institucional «Petruccelli pide una reunión urgente para recuperar la Estudiantina» está en el repaso del 23/10). Es sin chicos, por lo que sale; pero la regla es que **una pieza que *cuenta* el hecho con un chico no sale**, y las que sólo hablan de la reacción institucional sí. Una prueba controla que el titular de redes de una nota hermana no mencione al hecho con el chico.

---

## 5. Riesgo residual y qué debería aprobar una persona antes de prender

### 5.1 Lo que no se puede llevar a cero

1. **Un pueblo chico reconoce.** Aunque no haya nombre, "un adolescente herido con un arma blanca cerca de la Escuela Industrial durante la Estudiantina" ya lo reconoce toda la ciudad, porque el hecho **es** público y las otras fuentes lo dicen. El mecanismo evita que Radar sea **quien lo identifique**, pero no evita que el lector lo sepa por otro lado. Por eso la regla es «no agregamos», no «nadie puede saberlo».
2. **Las otras fuentes.** Si un medio de Balcarce publica el nombre, Radar lo borra de su nota pero el **enlace** de "Fuentes (N)" lleva al medio que sí lo publica. Hoy Radar enlaza las fuentes. Hay que decidir: o no se muestran los enlaces en estas notas (sólo el nombre del medio), o se muestran igual porque la fuente ya lo publicó. **Decisión del dueño.**
3. **La IA falla.** Ningún filtro de nombres es perfecto: un apodo nuevo, una inicial, una frase que identifica por contexto. El verificador baja el riesgo; la revisión humana lo corta.
4. **Lo que cambia con el tiempo.** Una nota anonimizada hoy puede, con una nota de seguimiento, juntar datos y reconocer (el nombre del tribunal, la edad exacta y la escuela en notas distintas). Se necesita una regla de **seguimiento**: las notas del mismo hecho, en conjunto, no deben sumar datos (el mecanismo de "Antes en Radar" no debe armar la línea de tiempo con datos del chico).
5. **La frontera A/B tiene zonas grises.** Una pelea entre adolescentes con arma blanca es B; si la víctima murió, pasa a A en la propuesta. Una persona tiene que poder mover un caso.
6. **La imputabilidad.** Un menor acusado: el nombre no se publica, pero una **nota institucional** («el Concejo pide más controles») no debe leerse como que el hecho fue de un chico en particular.
7. **Costo y cupos de IA.** La limpieza previa y la revisión de identidad no gastan IA (son código). La auditoría con IA suma una pasada: contarla en el cupo.

### 5.2 Qué debería aprobar una persona (Hernán y Andrés) antes de prender

Una lista corta, para firmar en `docs/DECISIONES.md`:

1. La **frontera** de la tabla 2.4 (cada línea: A o B).
2. Si la **edad** se permite o no (línea 9).
3. Si los **enlaces a las fuentes** se muestran en estas notas (5.1, punto 2).
4. Si hay una **leyenda** de respeto al lector (3.7).
5. Que **no van a redes** (4.3).
6. Diez notas de ensayo de **sombra** (el clasificador corre pero no publica; se las lee una persona). Con al menos tres casos reales cambiados (Estudiantina, un accidente, una pelea).
7. Quién revisa la **lista aparte** y en cuánto tiempo (propuesta: 24 horas, Andrés o Hernán desde el celular).
8. Que el **interruptor** `NOTAS_CON_MENORES` empieza **apagado** y se prende primero con la variable de grupos más chica (sólo accidentes y peleas), y recién después se suman las otras.

### 5.3 Orden sugerido de trabajo (si el dueño aprueba)

| Paso | Qué | Prueba |
|---|---|---|
| 1 | `identificaAlMenor` en el verificador, **sobre todas las notas con chicos que hoy salen** (cierra el riesgo de `4ap1yu`). Se puede hacer aun sin prender nada | `notas-con-menores.test.mjs` |
| 2 | Cerrar el hueco «un chico se apuñaló» en el semáforo | `semaforo.test.mjs` |
| 3 | `clasificarMenores` y la marca `anonimizar`, en sombra | La prueba de sombra sobre `archivo.json` |
| 4 | Limpieza del texto antes de enviarlo a la IA + bloque del prompt | Casos con nombres falsos |
| 5 | Fotos, ilustraciones y redes apagadas para la marca | Pruebas de contrato |
| 6 | Lista aparte + panel + línea del informe diario | Pruebas del panel |
| 7 | Prender con el grupo más chico, una semana, y revisar | Estadística |

---

## 6. Otras cosas que aparecieron al mirar el caso (no son parte de este diseño)

- **«Tarde» con 17 medios.** La historia `10k46b4` (hechos de violencia y suspensión de la Estudiantina, 21/10) quedó como `tarde` aunque la contaban 17 medios. Es la ventana de 12/24 horas (regla 287). Para lo de Balcarce, donde el dueño dice que «no puede faltar la noticia», conviene preguntar si esa ventana debería aplicarse a lo de acá. Se anota para la decisión, no se toca acá.
- **Repetidas.** Dos fichas (`1vk5xun`, `junk3c`) quedaron como `repetida` de otra nota. No pude ver con cuál se unieron ni si la nota que quedó es la del hecho (la que habla del apuñalamiento) o la institucional. Si la que queda es la institucional, la noticia del hecho "no existe", que es justo lo que no quiere el dueño.
- **La estadística no guarda la palabra que frenó** antes del 23/10. Para este tema conviene guardar también la **categoría de menores** (A o B) en el renglón.
- **El nombre del archivo `ingesta/menores.mjs`** sólo detecta la edad. La detección de nombres de menores es nueva y conviene que viva en un archivo aparte (`ingesta/menores-anonimizadas.mjs`) para que `ingesta/menores.mjs` siga corto.
