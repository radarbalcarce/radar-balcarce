# 03 · La selección: qué sale, dónde y cuándo

*Actualizado el 17/10/2026 (lo de Balcarce entra todo; lo nacional, por popularidad y sin cupos, simplificado en seis líneas:
reglas 197 a 202, 215 y 260). Si el código cambia, manda el código.*

Arranca donde termina `docs/02-INGESTA.md` (cada hecho ya es una historia con sus
fuentes). Cómo se escribe la nota está en `docs/04-REDACCION.md`; cómo se ve en la
web, en `docs/06-WEB.md`.

## En una frase

Cada historia recibe una sección (por el feed o por palabras), un puntaje que sólo
sirve para ordenar y un color del semáforo. **El criterio, en seis líneas:** (1) lo de Balcarce
entra todo; (2) lo nacional entra si lo cuentan **3 medios distintos** (`MINIMO_NACIONAL`);
(3) en las áreas chicas (Tecnología e IA, Ciencia, Salud, Educación, Cultura), **2**
(`MINIMO_AREAS_CHICAS`); (4) sin cupos ni topes; (5) lo **muy contado** (8 medios, o 5 en sus
primeras 3 horas) va primero en su sección; (6) del extranjero, sólo con un argentino, y
Policiales de afuera, nunca. Una IA lee cada nota y puede sacarla o cambiarle la sección, pero
nunca destraba nada; y al final sale sólo lo que no llega tarde, tiene cuerpo y nadie retiró.
Cada vuelta anota cómo cayó todo en la estadística de la selección (paso 7).

**Los tres colores** (qué va en cada uno es criterio: `CRITERIO-EDITORIAL.md` § 3):

| Color | Qué pasa |
|---|---|
| **Verde** | Sale sola (si después tiene cuerpo: `docs/04-REDACCION.md`) |
| **Amarillo** | Espera a una persona, que decide en el panel del celular. Si nadie la aprueba, no sale. Desde el 17/10 (regla 200) al celular va sólo lo de acá, cinco por día; lo de afuera amarillo no va (espera la popularidad o el interés de la IA) |
| **Rojo** | No se publica nunca, ni aprobada |

---

## El recorrido, paso a paso

Los pasos 1 a 7 los hace `ingestar()` (`ingesta/ingesta.mjs`), en la nube y en la
PC. Los pasos 8 a 13 los hace `web/scripts/generar-datos.mjs`; la lectura con IA
(paso 8) y la reescritura (paso 9), **sólo en la nube**.

### 1. Los policiales de afuera no entran

`esPolicialDeAfuera()` saca toda historia cuya principal no es de un medio de
Balcarce, no dice Balcarce en el título y se clasifica como Policiales (paso 2).
No queda ni amarilla: esperando, nadie la miraba. El registro dice "N policiales de
afuera no entran". (Los que el medio pone en su sección `/policiales/` ya se
descartaron en el filtro de entrada: `docs/02-INGESTA.md`, paso 6.)

### 2. La sección

Las secciones son **catorce**: Balcarce, Política, Policiales, Educación, Salud, Fútbol,
Deportes, Automovilismo, Agro, Economía, Ciencia, Cultura y agenda, Tecnología (se lee
"Tecnología e IA") y Argentina. Educación, Salud y Ciencia se sumaron el 17/10 (regla 215; el
interruptor `SECCIONES_NUEVAS` de la regla 187 se sacó). El resto del mapa de 17
(Espectáculos, Turismo, Ambiente) sigue en sombra (`ingesta/secciones-nuevas.mjs`,
`docs/secciones/MAPA-DE-SECCIONES.md`).

`clasificar()` (`ingesta/ingesta.mjs`) decide así, en orden:

1. **Automovilismo gana siempre** si el título, las categorías del medio o los
   primeros 400 caracteres tienen una palabra firme de automovilismo
   (`REGLAS_SECCION`: turismo carretera, TC, autódromo, rally, Fórmula 1, MotoGP,
   piloto…): en Balcarce aparece mezclado en cualquier feed.
2. **Si el feed viene con sección fija** (`seccion` en la ficha: Radio Gabal ·
   Deportes, Olé, TN · Economía…), se le cree. Excepción: una fuente de Tecnología
   sólo se cree si el título nombra algo de tecnología
   (`PALABRAS_DE_TECNOLOGIA_EN_EL_TITULO`), y una de Educación, Salud o Ciencia, si el
   título o la bajada hablan de eso (`encaje`), porque esos feeds traen de todo.
3. **Si no, por palabras** (`REGLAS_SECCION`, `ingesta/fuentes.mjs`), en el título,
   las categorías y los primeros 400 caracteres. **Gana la palabra más larga que
   coincide**, de cualquier sección ("exposición rural" le gana a "exposición"); si
   empatan, manda el orden de las reglas.
4. **Las palabras débiles** (`PALABRAS_DEBILES`: partido, descenso, copa, liga,
   gol, muestra, exposición, paso, precios, IA, Fangio, taller, penal…) sólo
   deciden **desde el título** y **sólo si ninguna palabra firme encontró nada**:
   "partido" en la provincia es un municipio; "descenso de las temperaturas" no es
   deporte.
5. **Sin ninguna palabra:** Balcarce si la fuente es de acá o la nota nombra a
   Balcarce en el título; si no, **Argentina**.
6. **Fútbol aparte:** si salió Deportes y hay una palabra firme de fútbol en el
   título o los primeros 300 caracteres, va a Fútbol.
7. **Balcarce es sólo de acá:** si una palabra de cortes u obras manda a Balcarce
   una nota de afuera que no dice Balcarce en el título, va a Argentina.
8. **Educación, Salud, Ciencia y Tecnología e IA** (regla 215, `seccionSumada`): lo que
   las palabras mandaron a Balcarce, Argentina, Economía, Cultura o Agro y que en el título
   o la bajada es claramente de una de esas cuatro (una palabra firme en el título; en la
   bajada, dos), va ahí. Química, biología, física, espacio, investigación, universidades e
   IA tienen sus palabras en `PALABRAS_NUEVAS`. Nunca se lleva una nota de Política ni
   de Policiales (esperan a una persona en las redes), ni una que corrigió una persona. Un
   empate con otra sección no mueve la nota; lo que sigue en sombra (Ambiente…) no frena a
   lo activo.

**Cómo se busca una palabra** (`contiene`): sin tildes ni mayúsculas, como palabra
entera. Las de cinco letras o más aceptan hasta tres letras de más al final
("granizo" encuentra "granizos"); las de cuatro o menos, exactas ("gol" encontraba
"golpe").

La lectura con IA puede cambiar la sección después (paso 8).

### 3. La relevancia (el puntaje)

`relevancia()` da un número de 0 a 100 que **sólo ordena**: qué va primero, qué va a
Facebook y a los podcasts (`docs/07-REDES.md`). No decide si lo de afuera sale: eso lo
decide la popularidad (paso 6).

| Suma | Cuánto |
|---|---|
| El peso de la fuente principal (`peso`; 10 si no tiene) | 24 a 30 los de Balcarce, 8 casi todos los nacionales |
| Es de Balcarce (medio de acá o Balcarce en el título) | +25 |
| Frescura: menos de 3 horas / de 12 / de 24 | +25 / +15 / +8 (una nota raspada sin fecha real cuenta como de 24 horas: 0) |
| Los medios que cuentan lo mismo (los del mismo `grupo`, como Grupo Clarín, cuentan uno) | +8 cada vez que se duplican, sin tope: 2 medios +8, 4 +16, 8 +24, 16 +32, 32 +40 (`puntosPorMedios`, `PUNTAJE.porDuplicarMedios`; hasta el 17/10 eran +10 por medio hasta +40, y desde los 5 medios daba lo mismo) |
| La fuente trae imagen / texto completo | +6 / +4 |
| Un medio de afuera dice Balcarce en el título (`nombraBalcarce`) | +22 (más los +25 de "es de Balcarce") |
| Nombra a una figura argentina | +16 |
| Es Automovilismo | +8 |

Si la lectura con IA dice que una nota "de Balcarce" no lo es, le resta 25 (paso
8). El puntaje no se guarda en el archivo: cambia en cada corrida.

### 4. El semáforo

`semaforo()` mira, **en este orden**, y se queda con lo primero que encuentra:

| # | Qué mira | Dónde | Resultado |
|---|---|---|---|
| 1 | La lista roja (`REGLAS_SEMAFORO.rojo`: menor de edad, abuso sexual, violación, femicidio, grooming, suicidio, trata…), siempre, sin ninguna exención (regla 172) | Título y primeros 600 caracteres | **Rojo** "tema sensible" |
| 2 | Una efeméride de otro medio (`esEfemerideAjena`, 14/10: la dirección dice `/efemerides-…` o el título arranca con "Efemérides", "Un día como hoy"…): las efemérides son propias | Dirección y título | **Rojo** "efeméride de otro medio: las efemérides son propias, no se publica" |
| 3 | Lo que no se publica nunca (`REGLAS_SEMAFORO.nunca`: sepelio, inhumación). Va **antes** del amarillo: una lista de sepelios dice "falleció" y, amarilla, una persona podía aprobarla | Sólo el título | **Rojo** "lista de sepelios: no se publica" |
| 3b | Lo que no es nota (`porQueNoEsNota`, `ingesta/no-es-nota.mjs`, regla 199, 17/10): de cualquier medio, el pronóstico del día y el cronograma de farmacias (el sitio tiene los suyos; una alerta, el campo o un cambio en el sistema de farmacias sí son noticia); de un medio de acá, además, el medio que habla de sí (audiencia, aniversario, programación, sede), el que anuncia su propia entrevista, su sorteo y la publicidad evidente de un comercio. Nunca lo de un organismo | Casi todo, el título (y la dirección de la nota) | **Rojo** "no es nota: …" (una persona igual lo puede publicar) |
| 4 | La lista amarilla (`REGLAS_SEMAFORO.amarillo`: denuncia, detenido, imputado, homicidio, víctima, niño, adolescente, "un menor de", "alumno de"…; los plurales de chicos, `AMARILLO_SOLO_EN_EL_PRINCIPIO`), una persona menor de 18 dicha por su edad ("una chica de 16 años": `menorPorEdad`, `ingesta/menores.mjs`) y, sólo en Policiales, Balcarce, lo de acá o de la zona y lo de un solo medio, la de una muerte o un herido (`amarilloMuerte`: murió, falleció, velatorio, herido…; `laMuerteFrena`). Antes de mirar el amarillo se sacan unas pocas frases que no son lo que parecen ("El Niño" del clima, "cuando era niño": `ingesta/exenciones.mjs`, regla 172); una palabra sensible del mismo texto sigue frenando. En lo de acá se sueltan algunas palabras (`AMARILLO_QUE_SE_SUELTA_EN_LO_DE_ACA`, regla 96; en Política, sólo si la confirma una fuente oficial o dos medios) y "detenido", "acusado" o "imputado" si lo confirman (`AMARILLO_QUE_SE_SUELTA_SI_LA_CONFIRMAN`) | Título y primeros 600 caracteres | **Amarillo** "necesita ojo humano" |
| 5 | La cotización del dólar (`REGLAS_SEMAFORO.cotizacion`: dólar hoy, dólar blue, a cuánto cotiza…) | Sólo el título | **Amarillo** "cotización del dólar: se muestra en /dolar" |
| 6 | Lo internacional (`REGLAS_SEMAFORO.internacional`: Trump, Putin, Gaza, Ucrania…), en lo de afuera que no dice Balcarce en el título ni nombra a un argentino (`tituloConArgentino`, regla 172) | Sólo el título | **Amarillo** "internacional: sin un argentino en el título" (no se aplica si lo cuentan 8 medios o más, regla 292) |
| 7 | La promoción (`pareceDePromocion`, regla 199): en cualquier medio, `REGLAS_SEMAFORO.promocional` ("ganá tu entrada", "participá del sorteo"…); de afuera, "sorteo" sólo con un premio (`sorteoConPremio`: la Corte que sortea la sala o el sorteo del Mundial no son una rifa); de un medio de acá, `promocionalDeAca` (sorteo, publicidad, suscribite…), salvo el sorteo o la rifa de una institución (`INSTITUCIONES_QUE_SORTEAN`) o de un organismo. El sorteo de un fixture o de jueces no cuenta (`sinSorteosDeportivos`) | Título y primeros 600 caracteres | **Amarillo** "parece promoción, no noticia" |
| 8 | La fuente es oficial | — | **Verde** "comunicado oficial" |
| 9 | No es de acá (paso 5) y la cuentan menos medios de los que pide la popularidad (paso 6), o no pasa el control de calidad, o es Policiales de afuera | — | **Amarillo** "de afuera y poco contada (N medios; Sección pide M)" |
| 10 | Si nada la frenó | — | **Verde** "sección X" |

Las listas roja y amarilla se pasan también sobre **el texto completo** de la
fuente y sobre **lo que escribió la IA** (el rojo y lo de menores y víctimas,
`AMARILLO_MENORES`): ver `docs/04-REDACCION.md`, pasos 4 y 11. **La lista roja no
se toca sin preguntar.**

### 5. Qué es "de acá" (`esDeAca`)

Una sola definición para las reglas que la usan (el semáforo y los medios que pide lo
de afuera). **Es de acá:**

1. lo que toca la zona (`deLaZona`: la 226, la 55, la papa), pase lo
   que pase;
2. si no, y si la lectura con IA dijo que el hecho **no** es de Balcarce
   (`noEsDeAcaSegunLaIA`, paso 8): **no** es de acá;
3. si no, lo de un medio de Balcarce o lo que dice Balcarce en el título (`local`),
   o lo que otro medio de la misma historia dice con Balcarce en el título
   (`nombraBalcarce`).

Una fuente oficial y una nota propia no piden medios (paso 6), pero **no** son "de
acá".

**Lo de un medio o un organismo de Balcarce** (`esDeUnMedioDeAca`, regla 180,
16/10: "la idea es que TODAS las notas de Balcarce salgan") tampoco es `esDeAca`,
pero no se cae por cantidad: lo que cuenta un organismo de Balcarce (la
Municipalidad, el Concejo, la Facultad: `oficial` y de acá) o un medio de Balcarce
que nombra algo de acá en el título o los primeros 600 caracteres (`nombraAca`,
`docs/02-INGESTA.md`, paso 12) no pide medios aunque la
IA diga que el hecho es "de la región". No afloja ninguna palabra del semáforo, la
IA la puede seguir sacando y no recupera los +25 del puntaje. Lo de un medio de acá
que no nombra nada de acá (la copia de una noticia nacional) sigue las reglas de
afuera.

### 6. La popularidad: cuántos medios tiene que tener lo de afuera

**No hay cupos.** Desde el 17/10/2026 (reglas 215 y 260; Hernán: "no hay ningún cupo de nada" y "a
nivel nacional, de las secciones populares, sólo a partir de 3 fuentes") lo de afuera sale **sólo
por cuántos medios distintos lo cuentan** (`exigirMedios`, `popularidadDe`,
`ingesta/popularidad.mjs`). Los medios se cuentan por nombre, sin repetir, y los del mismo dueño o
sistema cuentan una vez (campo `grupo` de la fuente: Clarín, Olé y TN son el Grupo Clarín;
`contarMedios`).

| Qué es | Medios distintos que pide | Dónde se cambia |
|---|---|---|
| Lo nacional (Política, Economía, Fútbol, Deportes, Agro, Automovilismo, Argentina…) | **3** | variable de GitHub `MINIMO_NACIONAL` (`POPULARIDAD.minimoNacional`) |
| Las áreas chicas: Tecnología e IA, Ciencia, Salud, Educación, Cultura (con los espectáculos) | **2** | variable `MINIMO_AREAS_CHICAS` (`POPULARIDAD.minimoAreasChicas`); la lista, `AREAS_CHICAS` |
| Policiales de afuera | nunca (la sección es de acá y la zona) | `SECCIONES_SOLO_DE_ACA` |

- **Los dos números se cambian sin tocar código**: Settings, Secrets and variables, Actions,
  Variables. Un número de 2 a 10; vacío, con letras o fuera de ese rango se ignora y valen los de
  siempre; el área chica nunca pide más que el resto. Cada corrida lo escribe en su registro
  ("popularidad: lo nacional pide 3 medios y las áreas chicas 2"). Los de siempre están en
  `ingesta/criterio.mjs` y en la tabla de `CRITERIO-EDITORIAL.md` § 11.
- **Lo de acá** (paso 5), **lo de un medio o un organismo de Balcarce que nombra algo de acá**
  (`esDeUnMedioDeAca`), **lo oficial** y **las notas propias** no piden medios.
- **Nunca uno solo.** Con un solo medio, lo de afuera no pasa el cruce (`docs/02-INGESTA.md`,
  paso 11), tampoco una fuente de ciencia o de una universidad: hasta la regla 260 una fuente
  "especializada" entraba esperando y salía si la IA la consideraba de interés; se sacó, junto con
  el campo `especializada`. Esas fuentes valen como un medio más para llegar a 2 o 3.
- **El control de calidad** (`controlDeCalidad`) vale para lo que sale con menos de 3 medios (el
  área chica): sin pronósticos del tiempo de otras ciudades, sin "dónde ver" ni "a qué hora
  juega", sin "en vivo", sin horóscopo, cotización ni alertas del tiempo (la misma lista de las
  muy contadas, `noEsNoticiaAunqueLaCuentenTodos`); los chimentos y la publicidad los saca la
  ficha. Lo que no pasa espera con "…y no pasa el control de calidad: …".
- **Va en los dos sentidos.** Se mira en la ingesta y otra vez después de la lectura con IA. Una
  verde que ya no llega pasa a amarilla ("de afuera y poco contada"); una que esperaba **con ese
  motivo** y ahora llega (porque se juntó con sus repetidas, paso 8) pasa a verde. Ningún otro
  amarillo se destraba así. **Lo que ya salió no se baja por cantidad** (`yaSalieron`): si se sube
  el mínimo, una nota que salió con 2 medios no desaparece de las listas.
- **El extranjero y Policiales de afuera no cambian.** Del extranjero, sólo con un argentino
  (`REGLAS_SEMAFORO.internacional` y la ficha), también en ciencia y tecnología (la excepción de la
  regla 211 se sacó). Policiales de afuera espera aunque lo cuenten treinta medios.

### 7. Lo muy contado, el orden y la estadística de la selección

**Lo muy contado** (`marcarMuyContadas`, `ingesta/muy-contada.mjs`, regla 197): lo de afuera que
cuentan 8 medios distintos o más, o que junta 5 en sus primeras 3 horas (4 si empezó de 20 a 7), con
el hecho de menos de 24 horas y alguna nota de las últimas 12. No cuentan "dónde ver", "a qué hora
juega", la formación, el "en vivo", el dólar, el clima ni las alertas. Sin cupo, lo que gana es el
lugar: **va primera en su sección durante 6 horas** desde que lo es (`muyContada.desde`, que fija
`generar-datos`; `primeroLasMuyContadas` en `web/lib/datos.js`: los bloques de la tapa y las
páginas de sección), con como mucho 2 del mismo tema a la vez (`mismoTema`). Policiales de afuera
sigue sin salir. Lo que cuentan 3 medios de acá o más (`muyContadaDeAca`, regla 198) es la
primera candidata a la nota grande y a Facebook.

**El orden en una sección** (`ordenPorPopularidad`, `web/lib/datos.js`): más medios es más arriba.
Las listas van de la más nueva a la más vieja, pero cada vez que se duplican los medios que cuentan
una nota, vale 2 horas más nueva (`POPULARIDAD.horasPorDuplicarMedios`: 2 medios +2 h, 4 +4 h, 8 +6 h,
32 +10 h). Una de 8 medios de hace 5 horas pasa a una de un medio de hace 1; una de 2 medios de hace
10 horas, no. La nota grande de la tapa sigue siendo de Balcarce.

**La estadística de la selección** (regla 260; reemplaza al ritmo de 100 notas por día, que bajaba
el mínimo solo cuando el día iba flojo). Cada vuelta de "Actualizar la web" anota en
`web/data/estadistica-seleccion.json` (`ingesta/estadistica-seleccion.mjs`), por día de Balcarce y
por sección: cuántas historias llegaron al cruce y con cuántos medios (1, 2, 3, 4, 5, 6 o más),
cuántas pasaron el semáforo, cuántas aprobó la lectura con IA, cuántas se publicaron (y con cuántos
medios), y las que quedaron afuera con su motivo (pocas fuentes, la IA la sacó, el semáforo, repetida,
sin cuerpo, llegó tarde); además, el total publicado del día y su ritmo por hora. Se guardan 60 días.
**Desde el 24/10 (regla 314) cada historia guarda también su motivo**, de una lista cerrada (`MOTIVOS`,
`ingesta/estadistica-seleccion.mjs`): el último, el primero que la frenó (no se pisa) y con quién se unió; «otros» ya no
se anota (una verde que espera su turno es `en_cola`; lo que no encuentra motivo es `sin_motivo` y la corrida avisa),
«pocas fuentes» va antes que «la IA la sacó» (con 2 medios en una sección que pide 3 no podía salir de todos modos) y
la suma de los motivos de un día, el campo `motivos`, es siempre `llegaron`.
`node scripts/medir/estadistica-seleccion.mjs` arma el reporte (un HTML de un solo archivo, en
`.cache/`, con una tabla "si el mínimo nacional fuera 2, 3, 4 o 5, cuántas notas por día y por
sección habría" y los días en que una sección quedó sin notas); el informe diario de las 8:15 y las
21:15 trae una línea y el panel del celular, en Números, un resumen. **Cada semana Hernán lo mira y
regula con las dos variables del paso 6**; si se llega muy rápido a las 150 notas por día, se pueden
sumar fuentes; si una sección falta, se baja su mínimo (o se suma a `AREAS_CHICAS`), sin tocar
nada más.

**Lo que se midió antes de simplificar** (el viernes 16/10, con la lectura guardada, sin IA): con el
criterio de la regla 215 y las fuentes nuevas salían unas 130 a 155 notas por día, 15 de acá y el
resto de afuera; de afuera, 3 medios o más eran unas 72 y las de 2 medios (áreas chicas) unas 18.
Las cifras por sección y los días vacíos, en `docs/DECISIONES.md` (17/10).

### 8. La lectura con IA (sólo en la nube)

Una IA lee cada historia nueva y completa una **ficha**, y **decide**. Va antes de
la reescritura, para no gastar cupo escribiendo lo que no va a salir. Todo en
`ingesta/lectura-ia.mjs`; lo llama `generar-datos.mjs`.

**Qué se le manda** (`entradaDeNota`, `pedidoPara`): una instrucción fija
(`INSTRUCCION`: el ámbito es el del hecho y no el del medio, qué va en cada
sección, qué es publicidad, qué es chimento), el **perfil de Balcarce** tal cual
(`ingesta/perfil-balcarce.md`: las localidades, lo que queda cerca pero no es
Balcarce, las rutas, lo que mueve a la ciudad; sólo datos seguros) y, de cada nota,
el identificador, el título, los primeros 500 caracteres del resumen, el medio y
**la ciudad del medio**.

**Qué devuelve cada ficha** (`ESQUEMA`, listas cerradas):

| Campo | Valores |
|---|---|
| `ambito` | balcarce, region, provincia, nacional, internacional |
| `seccion` | una de las catorce |
| `impacto_balcarce` | directo, indirecto, nulo |
| `razon` | local, servicio, actividad, provincia, nacional, popular, ninguna |
| `importancia` | alta, media, baja |
| `es_publicidad`, `es_chimento` | sí o no |
| `por_que_interesa` | una frase |

`fichaValida()` descarta la ficha entera si un valor no está en su lista (se vuelve
a pedir en otra corrida). Las fichas se guardan en `web/data/fichas.json` y se
borran a los 3 días (`LECTURA.diasDeFichas`).

**Cuánto se pide** (`leerNotasNuevas`): sólo las notas sin ficha, de a 12 por
pedido, hasta 5 pedidos por corrida y 200 por día con la clave propia
`GEMINI_API_KEY_CLASIFICACION` (60 si comparte la de redacción; lo elige
`topeDeLecturas`). El día es el de Balcarce.

**Con qué IA:** Gemini (`gemini-flash-lite-latest`, temperatura 0, esquema
forzado), con `GEMINI_API_KEY_CLASIFICACION` o, si no está, la de redacción;
**nunca la de redes** (`claveClasificacion`, `reels/claves.mjs`). Si Gemini falla,
el mismo grupo va a **Groq** (`GROQ_API_KEY`, `openai/gpt-oss-120b`,
`leerGrupoGroq`) con la misma instrucción y la misma validación. Si las dos dicen
"sin cupo", no se insiste en esa corrida; sin ninguna clave, todo sigue como lo
decidió el sistema.

**Qué hace con la ficha** (`aplicarFichas`). Límites que no se negocian: una nota
roja no se toca, y **la IA sólo puede endurecer** (sacar una nota o mandarla a
esperar), nunca destrabar (desde la regla 260 no hay excepción: la fuente "especializada" que
salía con un solo medio si la ficha le daba interés se sacó).

0. **Sin ficha todavía:** lo verde de un medio de acá que no nombra nada de acá (ni
   Balcarce ni la zona en el título o los primeros 600 caracteres, `mencionaAca`) y
   que nunca salió **espera a que la IA lo lea**, si la lectura anda
   (`esperarSinFicha`): así no se cuela la copia de una noticia de afuera. Desde el
   16/10 un organismo de Balcarce (`oficial`) no espera: lo que comunica es de acá
   aunque no diga "Balcarce" (regla 180). San Agustín y Los Pinos, en un medio de
   acá, cuentan como de acá (regla 179); "balcarceños" y "balcarceñas" también. El
   resto, sin ficha, sigue igual.
1. **La saca** (no sale ni queda amarilla, y si tenía página la pierde) si:
   - es publicidad, o es un chimento;
   - el ámbito es internacional y no nombra a una figura argentina ni tiene
     conexión argentina en el título ("es del extranjero": la Fórmula 1 sin un
     argentino, no), tampoco en Ciencia ni en Tecnología e IA (regla 260);
   - la IA la pone en Policiales y no es de Balcarce (salvo la excepción de 8 medios o la
     muerte de un famoso).

   Desde el 23/10 (regla 286) **no hay más un filtro de "sin relación con Balcarce"**: la ficha
   sigue diciendo el impacto, pero lo de afuera sale o no por cuántos medios lo cuentan.
2. **Dos llaves para ser de Balcarce.** Una nota con la llave de la fuente (un
   medio de acá, o Balcarce en el título) es de Balcarce sólo si la IA dice que el
   hecho es de Balcarce o que la afecta directamente. Si no, queda
   `noEsDeAcaSegunLaIA` (se rige por lo de afuera), deja de ser `local` y pierde 25
   puntos.
3. **La sección es la de la IA**, con dos ajustes: "Balcarce" para lo que no es de
   acá no vale (queda la que tenía) y "Argentina" para lo que sí es de acá pasa a
   Balcarce. Las fichas viejas que dicen Servicios o País se leen como Balcarce y
   Argentina.

**Las repetidas: una noticia, una nota.** El cruce por palabras no junta todo (tres
notas de la misma falsa oferta de empleo salieron con títulos distintos). Entonces:

1. Se le muestran a la IA **las notas que pueden salir o esperan a una persona**
   (verdes y amarillas, `candidatasParaAgrupar`; desde el 4/10 también las
   amarillas, para que aprobar una no duplique la publicada) y, en otro pedido,
   **las de afuera que esperan por pocos medios** (`agruparRepetidas`,
   `INSTRUCCION_REPETIDAS`: sólo las que cuentan exactamente el mismo hecho). Las
   rojas no se juntan con nada.
2. Se pide sólo si cambió la lista, hasta 60 vueltas por día
   (`LECTURA.pedidosRepetidasPorDia`), sólo con Gemini. Desde el 17/10 (regla 196)
   el tope se reparte por hora (`cupoDelMomento`): nunca se gasta todo antes de la
   noche, y lo que trae algo de acá nuevo puede adelantarse un poco. Las parejas
   (lo de acá también por significado y entre secciones, contra lo publicado de 72
   horas) están en `docs/flujos/REPETIDAS-2-0.md`.
3. Los grupos se suman a los de corridas anteriores (`unirGrupos`: si antes A y B,
   y ahora B y C, son A, B y C), mientras sus notas sigan en la ingesta.
4. De cada grupo **queda una** (`quitarRepetidas`): la ya publicada (en la portada
   anterior o en el archivo, **aunque su hecho ya tenga más de 36 horas**: regla 314),
   la verde, la que cuentan más
   medios, la de más puntaje. **Se le suman los medios de las otras y, desde el
   15/10, también sus fuentes** (`origenes` y `fuentesTexto`, sin repetir un
   enlace: regla 174), así la IA escribe con todas. Si otra versión del mismo hecho
   era roja o "necesita ojo humano", la que queda hereda ese color (**salvo que la que
   queda sea de Balcarce: no hereda el amarillo, regla 314; el rojo sí**). Las demás
   salen; si alguna ya fue a las redes, conserva su página.

**Además** (en `generar-datos.mjs`; las tres primeras, sin IA):

- **Las repetidas contra lo ya publicado** (regla 171, `ingesta/repetidas-publicadas.mjs`):
  una nota que todavía no salió y cuenta lo mismo que otra publicada en las últimas
  72 horas se une a ésa (queda una, la otra redirige y la que queda suma sus
  fuentes). Es estricta a propósito: nunca junta lo de acá con lo de afuera, títulos
  con números distintos, un anuncio y su resultado, un hecho y el contrario, ni
  protagonistas distintos.
- **La misma fuente** (regla 175, `mismaFuente`): dos notas que citan exactamente
  el mismo enlace de otro medio son la misma noticia aunque estén en otra sección,
  con sus cuidados (horas, títulos parecidos, fuentes en común). Vale también entre
  dos ya publicadas (queda la que se vio primero, salvo que la otra haya ido a las
  redes).
- **Las uniones quedan firmes** (`unionesFirmes`, `web/lib/repetidas.js`): una nota
  de `web/data/fusionadas.json` no vuelve a tener página propia ni se vuelve a
  escribir con IA; se deshace si una persona la aprueba desde el celular o borrando
  su renglón.
- **Las parejas sospechosas** (1/10, `parejasSospechosas` en `web/lib/repetidas.js`
  y `confirmarParejas` en `ingesta/lectura-ia.mjs`): dos notas de la misma sección,
  a menos de 72 horas y con algo de parecido en el título (0,3; desde el 15/10
  también en otra sección, desde 0,15, si citan la misma nota de otro medio) se le
  preguntan a la IA, hasta 24 por corrida (Gemini y, de respaldo, Groq
  `gpt-oss-20b`).

**Después**, con las secciones corregidas y los medios sumados, se vuelven a correr
`aplicarPopularidad` (`exigirMedios` en los dos sentidos y lo muy contado). El registro dice "lectura
con IA: N fichas nuevas en P pedidos · sacó X, Y dejaron de ser de Balcarce, Z
cambiaron de sección, W a esperar, R repetidas", con los títulos de lo que sacó.

### 9. La reescritura puede frenar una nota

Cuando la IA escribe la nota (`docs/04-REDACCION.md`), el semáforo se pasa por el
texto completo de la fuente y por lo que escribió, y el código calcula el nivel de
verificación. Si algo da rojo, amarillo o verificación BAJA, **la nota verde cambia
de color** ahí mismo ("… (visto al reescribir)" o "verificación baja: espera a una
persona").

Lo que escribió la IA se mira **con la nota de verdad** (regla 201, 17/10/2026: sinLosTextos(nota); hasta ese día iba una nota vacía y cualquier "murió" del título esperaba aunque la contaran 30 medios, como la muerte de Fernando Confessore). Valen las mismas exenciones que en el paso 4.

### 10. La fecha de la nota y "llega tarde"

**La fecha** (`fechaReal`, en `generar-datos.mjs`): si la fuente no dio hora, es
**la primera vez que se vio la nota** (`web/data/vistas.json`,
`docs/02-INGESTA.md`, paso 5). Si la dio, es **la más vieja que se conoce** entre
la de la ingesta, la de cada fuente, la que ya tenía publicada y la primera vista
(`fechaDeLaNota`, `web/lib/archivo.js`). **Una nota puede envejecer, nunca
rejuvenecer**: un medio que "actualiza" su nota no la devuelve a la tapa. Es la
fecha que se muestra, la que ordena y la que decide lo que sigue.

**Llega tarde** (`llegaTarde`): una nota que **nunca salió** no se estrena si el
hecho tiene más de **12 horas** (`HORAS_PARA_ESTRENAR`, igual a
`PORTADA.horasParaEstrenar`): esperando medios o cuerpo, lo de afuera salía con el
hecho de días atrás. Lo que ya salió sigue su curso, y lo que publicó una persona
también. A una nota que llega tarde tampoco se le pide texto a la IA.

### 11. La decisión final: `notaPublicada`

`generar-datos.mjs` decide, nota por nota y en este orden:

1. **¿Está retirada a mano?** (`web/data/retiradas.json`, paso 13): no sale.
2. **¿Quién manda?** Si una persona decidió (`decisionHumana`: una decisión con
   `por` y que no sea de la IA), manda esa decisión. Las decisiones de las personas
   son las del celular (`web/data/celular-decisiones.json`, `leerDecisionesCelular`,
   `panel/celular-datos.mjs`). Si nadie decidió,
   el semáforo: verde = automática, rojo = bloqueada, amarillo = pendiente. Sólo
   "publicada" y "automática" siguen.
3. **¿Llega tarde?** (paso 10), salvo que la haya publicado una persona o ya haya
   salido.
4. **¿Qué texto lleva?** El de la persona; si no, el de la IA (de esta corrida o de
   una anterior); si no, el resumen de la fuente. El título automático pasa por los
   arreglos mecánicos (`tituloAutomatico`, `docs/04-REDACCION.md`, paso 7). Se
   arman las "Fuentes consultadas" con los enlaces reales si nadie las completó.
5. **La dirección** se fija la primera vez que sale (`fijarSlug`) y no cambia más
   (`docs/06-WEB.md`).
6. **Las correcciones** (`web/data/correcciones.json`, paso 13) pisan título,
   bajada, sección o cuerpo.
7. **Lo que no se publica nunca**, otra vez, sobre el título y la bajada finales,
   **aunque la haya aprobado una persona** (`nuncaSePublica`): una lista de sepelios
   que se coló con otro título no sale.
8. **Sin cuerpo no se publica** (`tieneCuerpo`, `web/lib/cuerpo.js`): la nota
   automática sin cuerpo de 70 palabras o más queda "esperando cuerpo"
   (`docs/04-REDACCION.md`, paso 12). Lo que publicó una persona se respeta.

Lo que pasa los ocho pasos se publica en la web. Lo que salió porque lo aprobó una
persona (era amarillo) va a las redes sólo si esa persona lo marcó
(`aprobadaParaRedes`, `docs/07-REDES.md`); una nota de pista aprobada para las redes
se puede pedir para el próximo repaso (`paraElRepaso`, 12 horas). El 16/10 se
decidió que lo que una persona publica desde el panel o pide desde un mail salga en
los repasos sin pedirlo aparte (`docs/DECISIONES.md`).

### 12. Las ventanas: cuánto se queda una nota a la vista

| Ventana | Cuánto | Dónde | Qué hace |
|---|---|---|---|
| Colador de lo raspado | 72 h | `HORAS_DE_UNA_NOTA_NUEVA` | Lo raspado más viejo no entra (`docs/02-INGESTA.md`) |
| Memoria del cruce | 36 h (lo de acá, 72 h) | `CRUCE.horasDeMemoria`, `CRUCE.horasDeMemoriaDeAca` | Con qué se cruza cada nota |
| Repetidas contra lo publicado | 72 h | `PAREJAS.horas`, `HUELLAS.horas`, `REPETIDAS_PUBLICADAS.horas` | Con qué se compara una nota nueva (regla 195) |
| Una fuente cuenta para la fecha | 48 h antes de verla | `HORAS_DE_UN_HECHO` (`web/lib/archivo.js`) = `CRUCE.coherente.horasEnDesarrollo` | Más atrás es una nota vieja que el cruce pegó: no la envejece (regla 194) |
| Estreno | 12 h | `HORAS_PARA_ESTRENAR` = `PORTADA.horasParaEstrenar` | Lo nunca publicado más viejo no sale |
| Portada y secciones | 36 h | `HORAS_EN_PORTADA` = `PORTADA.horas` | Lo que se muestra en las listas (`vigenteEnPortada`) |
| Nota grande de la tapa | 6 h | `VENTANA_HORAS` (`web/lib/datos.js`) = `PORTADA.horasNotaGrande` | Cuánto compite una nota por el lugar grande |
| Página de la nota | 180 días, con tope de 3.700 notas (unos 80 días a ~46 por día) | `DIAS_DE_ARCHIVO` = `PORTADA.diasDeArchivo`; `MAXIMO_EN_ARCHIVO` = `PORTADA.maximoDeNotas` | Cuánto existe su página; pasado el tope quedan primero las que fueron a las redes y después las más nuevas, y lo que sale va al histórico por mes (`web/data/historico/`) |
| Fichas de la IA | 3 días | `LECTURA.diasDeFichas` | Cuánto se recuerda una ficha |
| Primera vista | 7 días | `DIAS_DE_VISTAS` | Cuánto se recuerda cuándo se vio |
| Retiradas a mano | 7 días | `DIAS_DE_RETIRADAS` | Los lunes salen de la lista las más viejas que la ingesta ya no trae |

`ingesta/criterio.mjs` guarda las 36, 12 y 6 horas, los 180 días y el tope de 3.700
notas (con el archivo permanente en R2, decidido el 16/10 y todavía sin activar, lo
que sale del sitio se seguiría viendo desde R2 y el tope se podría bajar con la
variable `TOPE_DE_NOTAS`: `topeDeNotas`, `web/lib/archivo.js`;
`docs/salud-tecnica/ARCHIVO-PERMANENTE-IMPLEMENTACION.md`); la web usa sus
propias constantes (se compilan con el sitio) y `pruebas/criterio.test.mjs` y
`pruebas/archivo.test.mjs` controlan que sean iguales.

En las listas no conviven **dos notas con el mismo titular (o casi)**: queda la de
más puntaje y la otra conserva su página (`sinNotasRepetidas`, `web/lib/texto.js`).
Si la misma noticia volvió a entrar **con otra dirección**, se unen: queda una y la
dirección de la otra redirige (`web/lib/repetidas.js`, `docs/06-WEB.md`).

**Cuándo una nota pierde su página** (sale de `web/data/archivo.json`):

- si una persona la bloqueó, la descartó o la retiró (desde el panel del celular o en
  `retiradas.json`);
- si hoy la ingesta la trae en rojo, o en amarillo **por lo que dice**
  (`pierdeLaPagina`, `web/lib/archivo.js`). La cotización del dólar y lo de afuera
  que espera sólo por los medios (`esperaSoloPorCantidad`) conservan la página;
- si es una lista de sepelios, aunque la haya aprobado una persona;
- si la lectura con IA la sacó en esta corrida, o quedó fuera como repetida y no
  fue a las redes;
- si es una repetida con otra dirección (su dirección redirige a la que queda);
- si es una página vieja con "EN VIVO" o "minuto a minuto" en el título
  (`diceEnVivo`; "música en vivo" sí), salvo que la haya decidido una persona;
- si es de afuera y no de la zona, la contó un solo medio, no es oficial, no es de
  un medio de Balcarce que nombra algo de acá (`deUnMedioDeAca`, regla 180) y no
  fue a las redes (`tieneRespaldo`);
- si se unió a otra de forma firme (`unionesFirmes`, regla 175);
- si pasó de 180 días o quedó fuera del tope de 3.700 notas (va al histórico por
  mes, `web/data/historico/`).

Detalle en `docs/06-WEB.md`.

### 13. Retirar y corregir

**Desde el panel del celular** (lo de todos los días, `docs/09-PANEL.md`):
"Retirar de la web" deja la nota `bloqueada`, con su motivo, en
`web/data/celular-decisiones.json`; editar título, bajada, cuerpo o sección escribe
en `web/data/correcciones.json` (con `deIA: true` si el texto lo escribió la IA y
lo revisó la persona). Ningún workflow toca esos dos archivos.

**Sin panel, a mano** (una persona o Claude, a pedido). Hay dos archivos propios, y
cada entrada **tiene que decir `motivo`, `cuando` y `por`** (sin `motivo` no vale;
sin `cuando` y `por` fallan las pruebas y la web se congela):

**`web/data/retiradas.json`: sacar una nota.**

```json
{"notas":{
"bclpti":{"motivo":"aviso de viaje a un show de un tercero, sin hecho de Balcarce","titulo":"Habrá viaje desde Balcarce…","medio":"Infórmese Primero (FM 104.9)","cuando":"2026-09-28","por":"repaso editorial de Claude, pedido por Hernán"}
}}
```

La nota no sale en ninguna lista y **pierde su página**, aunque la ingesta la
vuelva a traer (`idsRetiradosAMano`). Los lunes, en la nube, salen de la lista las
de más de 7 días que la ingesta ya no trae (`podarRetiradas`, regla 69): a esa
altura la nota ya no se puede estrenar.

**`web/data/correcciones.json`: corregir una nota.** Se puede cambiar `titulo`,
`copete`, `seccion` o `cuerpo` (`CAMPOS_CORREGIBLES`). Manda sobre lo que escriba
la IA en cualquier corrida, se aplica también a la página vieja del archivo y **la
dirección no cambia** (`correccionesAMano`, `conCorreccion`). Cómo escribir un
cuerpo ahí: `docs/04-REDACCION.md`, paso 12.

Los dos archivos los lee `generar-datos.mjs` al empezar: el cambio se ve en la
corrida siguiente de "Actualizar la web".

---

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama |
|---|---|---|
| `ingesta/ingesta.mjs` | `clasificar`, `relevancia`, `semaforo`, `esDeAca`, `esDeUnMedioDeAca`, `mediosMinimosDe`, `contarMedios`, `exigirMedios`, `aplicarPopularidad`, `armarPortada`, `esPolicialDeAfuera`, `esEfemerideAjena`; `semaforoDelTexto` (las listas sobre cualquier texto) | `ingestar()`; `generar-datos.mjs`; `reels/reescritura.mjs` |
| `ingesta/exenciones.mjs`, `ingesta/menores.mjs` | Las pocas frases que no frenan el amarillo, el sorteo deportivo, el título con un argentino (regla 172); el menor dicho por su edad | `ingesta.mjs` |
| `ingesta/repetidas-publicadas.mjs` | La misma noticia contra lo ya publicado, sin IA (regla 171) y la misma fuente (`mismaFuente`, regla 175) | `generar-datos.mjs` |
| `ingesta/popularidad.mjs` | La popularidad de lo de afuera (reglas 215 y 260): `minimoNacional`, `minimoAreasChicas` (leen las variables de GitHub), `mediosMinimos`, `popularidadDe`, `controlDeCalidad` | `ingesta.mjs`, `lectura-ia.mjs`, `generar-datos.mjs` |
| `ingesta/secciones-nuevas.mjs` | El mapa de 17 secciones: Educación, Salud y Ciencia activas desde el 17/10 (`SECCIONES_SUMADAS`, `seccionSumada`, regla 215); el resto en sombra (`docs/secciones/`). La selección nueva en sombra (`seleccion-nueva.mjs`, `comparar-seleccion.mjs`) se retiró el 17/10/2026: lo que proponía entró con las reglas 197 a 202 | `ingesta.mjs`, `lectura-ia.mjs`, `web/lib/datos.js`, a mano |
| `ingesta/fuentes.mjs` | `REGLAS_SECCION`, `REGLAS_SEMAFORO` (rojo, nunca, amarillo, amarilloMuerte, promocional, cotizacion, internacional), `AMARILLO_MENORES`, `PALABRAS_DE_TECNOLOGIA_EN_EL_TITULO`, `FIGURAS`, `TEMAS` | Todo el motor |
| `ingesta/criterio.mjs` | Los números: `POPULARIDAD`, `AREAS_CHICAS`, `SECCIONES_SOLO_DE_ACA`, `MUY_CONTADA`, `PUNTAJE`, `ESPERA_PERSONA`, `PORTADA` | Todo |
| `ingesta/muy-contada.mjs` | `porQueEsMuyContada`, `marcarMuyContadas`, `mismoTema`, `noEsNoticiaAunqueLaCuentenTodos` (regla 197) | `aplicarPopularidad` |
| `ingesta/no-es-nota.mjs` | `porQueNoEsNota`: el autobombo de los medios, el clima y las farmacias de otro medio, el comercio (regla 199) | `semaforo` |
| `ingesta/lectura-ia.mjs` | Fichas (`leerNotasNuevas`, `aplicarFichas`, `mencionaAca`), repetidas (`agruparRepetidas`, `unirGrupos`, `quitarRepetidas`) | `generar-datos.mjs` (nube) |
| `ingesta/perfil-balcarce.md` | Lo que la IA sabe de Balcarce | `lectura-ia.mjs` |
| `ingesta/utiles.mjs` | `decisionHumana`: qué decisión es de una persona | `generar-datos.mjs`, `reels/reescritura.mjs`, el panel del celular |
| `panel/celular-datos.mjs` | Lee las decisiones del celular (`leerDecisionesCelular`) | `generar-datos.mjs` |
| `web/scripts/generar-datos.mjs` | Orquesta todo: lectura con IA, reescritura, `fechaReal`, `notaPublicada`, fotos, archivo | `actualizar.yml` (nube); en la PC sólo con `ARMAR_EN_LA_PC=1` |
| `web/lib/archivo.js` | `HORAS_EN_PORTADA`, `HORAS_PARA_ESTRENAR`, `vigenteEnPortada`, `llegaTarde`, `fechaDeLaNota`, `pierdeLaPagina`, `esDeLoQueNuncaSePublica`, retiradas y correcciones | `generar-datos.mjs`, la web |
| `web/lib/cuerpo.js` | `tieneCuerpo`, `tieneRespaldo` | `generar-datos.mjs`, la web, redes |
| `web/lib/texto.js`, `web/lib/repetidas.js` | Las repetidas por titular (`sinNotasRepetidas`), las que volvieron con otra dirección, las parejas sospechosas y las uniones firmes (`unionesFirmes`) | `generar-datos.mjs` |
| `web/data/celular-decisiones.json`, `correcciones.json`, `retiradas.json` | Lo que decidió una persona: desde el celular o a mano | El panel del celular, una persona o Claude |

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Que una palabra mande una nota a otra sección | `REGLAS_SECCION` (`ingesta/fuentes.mjs`); si es ambigua, además en `PALABRAS_DEBILES` (`ingesta/ingesta.mjs`) |
| Que un feed de Tecnología sólo se crea con ciertas palabras en el título | `PALABRAS_DE_TECNOLOGIA_EN_EL_TITULO` (`ingesta/fuentes.mjs`) |
| Cambiar qué suma al puntaje | `relevancia()` (`ingesta/ingesta.mjs`) |
| Que algo espere a una persona o nunca salga | `REGLAS_SEMAFORO` (`ingesta/fuentes.mjs`). **La lista roja, no sin preguntar** |
| Cuántos medios pide lo de afuera (3) y en las áreas chicas (2) | Las variables de GitHub `MINIMO_NACIONAL` y `MINIMO_AREAS_CHICAS` (sin tocar código); el valor de siempre y qué áreas son chicas, `POPULARIDAD` y `AREAS_CHICAS` (`ingesta/criterio.mjs`) **y** la tabla de `CRITERIO-EDITORIAL.md` § 11 |
| Cómo cayó la selección (qué llegó, con cuántos medios, qué salió y por qué no) | `web/data/estadistica-seleccion.json` y `node scripts/medir/estadistica-seleccion.mjs` (paso 7) |
| Qué es "de acá" | `esDeAca()` (`ingesta/ingesta.mjs`), `PALABRAS_LOCALES`, `PALABRAS_LOCALES_DEBILES` y `PALABRAS_ZONA` (`ingesta/fuentes.mjs`) |
| Qué de un medio o un organismo de Balcarce no se cae por cantidad | `esDeUnMedioDeAca()` (`ingesta/ingesta.mjs`) y `nombraAca` (`armarHistorias`) |
| Qué sabe la IA de Balcarce | `ingesta/perfil-balcarce.md` (sólo datos seguros) |
| Qué saca la IA, cómo elige la sección o cuánto lee por día | `INSTRUCCION`, `aplicarFichas`, `LECTURA` y `topeDeLecturas` (`ingesta/lectura-ia.mjs`) |
| Cuántas horas tiene un hecho para estrenarse, o cuánto se queda en la portada | `PORTADA` (`ingesta/criterio.mjs`) **y** `HORAS_PARA_ESTRENAR`, `HORAS_EN_PORTADA` (`web/lib/archivo.js`) **y** `CRITERIO-EDITORIAL.md` § 11 |
| Sacar o corregir una nota sin el celular | `web/data/retiradas.json` / `web/data/correcciones.json` |

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| La IA de lectura se queda sin cupo | "lectura con IA: falló un pedido (HTTP 429)" en el registro; las notas sin ficha salen como las decidió el sistema (salvo lo de un medio de acá que no nombra nada de acá, que espera sólo si la lectura anda) | Revisar `GEMINI_API_KEY_CLASIFICACION` y `GROQ_API_KEY` |
| La IA saca algo que sí era de Balcarce | Aparece en "fuera (…)" del registro de "Actualizar la web" | Anotar el caso y ajustar `INSTRUCCION` o el perfil; mientras, publicarla desde el panel del celular |
| Una nota de afuera que todavía no salió pierde los medios (la IA la juntó con otra y cambió de sección) | Pasa a amarilla "de afuera y poco contada"; si ya había salido, **no se baja** (`yaSalieron`) | Nada |
| Una sección sale sin notas varios días | El reporte de la estadística de la selección (días sin notas por sección y cuántas saldrían con otro mínimo) | Bajar `MINIMO_NACIONAL` o sumar la sección a `AREAS_CHICAS`; si no, revisar las fuentes caídas (`FUENTES.md`) |
| El día sale flojo | El total publicado del día en la estadística y las fuentes caídas del registro de "Actualizar la web" | Revisar las fuentes (`FUENTES.md`); el mínimo ya no baja solo |
| La portada queda vacía de lo de afuera | "de afuera y poco contada" en muchas notas | Revisar que el cruce tenga memoria y que las fuentes estén vivas (`docs/02-INGESTA.md`) |

Lo que falta, en `PENDIENTES.md`.
