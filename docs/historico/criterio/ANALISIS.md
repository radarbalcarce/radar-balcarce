# El criterio editorial, auditado: qué dice, para qué está, si se cumple y qué hacer

*15/10/2026. Auditoría y propuesta: **no se tocó ningún archivo del sistema**. Rige `CRITERIO-EDITORIAL.md` tal
como está. La propuesta de texto nuevo está al lado, en `CRITERIO-EDITORIAL-PROPUESTA.md`.*

*Lo que cubren otros informes y acá sólo se nombra: el semáforo, la redacción, el verificador, las fotos y las
redes (`docs/etapa-6-9/`); la entrada, las duplicadas, la clasificación y el puntaje (`docs/etapa-2-5/`). Acá se
mira el criterio **como documento** y **como la instrucción que recibe la IA**.*

## Cómo leerlo

- `CE:123` = línea 123 de `CRITERIO-EDITORIAL.md`. Las demás citas son `archivo:línea` del código de hoy.
- **Veredicto**: **mantener** (está bien y se cumple), **reescribir** (la idea vale, el texto no), **sacar** (no es
  criterio editorial o no sirve), **dueños** (es una decisión editorial de Hernán y Andrés).
- **INTOCABLE** = límite legal o regla que no se negocia (menores, víctimas, Campillay, sepelios, atribución de lo
  ajeno). No se propone cambiar ni una palabra; sólo, a veces, que el documento diga lo que ya hace el código.
- **SIN VERIFICAR** = no lo pude confirmar con el código o con datos.

---

## 1. Lo más importante, en diez líneas

1. **El documento tiene tres cosas mezcladas**: criterio editorial (qué y cómo se cuenta), reglas del sistema
   (semáforo, cupos, ventanas, verificador) y diseño de la web. Sólo la primera es "el criterio". Las otras dos
   ocupan dos tercios y son las que más se desactualizan.
2. **La IA recibe ~20.600 caracteres fijos por nota** (unos 5.200 a 5.900 tokens), el 26 % del archivo. Hay reglas
   dichas 3 a 5 veces y unos 600 caracteres que no cambian nada (el campo `nivel`, notas de historia interna).
3. **Una versión de la mitad de largo es posible** (10.908 caracteres, −46 %) sin tocar ninguna regla legal
   (borrador en el § 4.4), pero el
   29/09 un cambio de reglas movió cuántas notas sacan cuerpo y el borrador del 11/10 no mejoró al actual. **Se
   mide antes** con `reels/comparar-instruccion.mjs`.
4. **De las 33 contradicciones conocidas** (13 del plan del 11/10 y 20 del borrador `criterio-unico/`; son 27
   distintas, porque 6 se repiten), 13 se arreglan sólo corrigiendo el documento para que diga lo que hace el
   código, 3 piden un cambio chico de código y 11 son **decisiones de los dueños**. Encontré **10 más** (§ 3.3).
5. **El documento dice "actualizado el 29/09"** y no recoge reglas del 2/10 al 14/10 (96, 118, 119, 143, 155, 161,
   164, 165). Quien lo lee cree que rige algo que ya cambió.
6. **No hay línea editorial escrita.** La regla 18 del prompt (posturas enfrentadas) es lo único parecido. Propongo
   dos textos (uno largo y uno mínimo) en la propuesta, para que elijan.
7. **Lo legal está bien cuidado en el código** y debe quedar palabra por palabra. Lo único que falta es que el
   documento diga la regla 119 (lo rojo reescrito por una persona) y el derecho de rectificación.
8. **El prompt empuja a hablar de Balcarce** en cuatro reglas (3, 4, 17, 20) y lo frena en una (15). Es una causa
   posible de rechazos por "localía inventada" (SIN VERIFICAR: no hay medición).
9. **La "nota aparte" del panel** (2.665 caracteres) no se le manda a la IA, es la tercera copia de varias reglas y
   ya dice cosas viejas. Se puede sacar.
10. **El orden que propongo**: (a) corregir el documento para que diga lo que hace el código (cero riesgo), (b)
    decidir las preguntas del § 5, (c) medir el prompt corto, (d) recién ahí cambiar la instrucción.

---

## 2. Sección por sección

Columnas: **Qué dice** · **Para qué existe** (el caso real o la razón) · **¿Lo cumple el código?** · **¿Choca con
algo?** · **Veredicto**.

### Encabezado (CE:1-21)

| Qué dice | Para qué | ¿Se cumple? | ¿Choca? | Veredicto |
|---|---|---|---|---|
| Hay un solo criterio; la IA lee el § 12 tal cual; los números del § 11 se controlan; "el panel de la PC lo muestra" | Hasta el 25/09 el prompt vivía en el código y el criterio en tres documentos (`ingesta/prompt-editorial.mjs:3-6`) | Sí: `prompt-editorial.mjs:54-82`, `pruebas/criterio.test.mjs:61-233` | "Actualizado el 29/09" (C-20). El panel de la PC está en desuso desde el 8/10 (regla 125) | **Reescribir**: fecha real, sacar el panel de la PC |

### § 1. Qué es y a quién le escribe (CE:25-41)

| Qué dice | Para qué | ¿Se cumple? | ¿Choca? | Veredicto |
|---|---|---|---|---|
| Medio automático para la gente de Balcarce; lo local primero; informar sin gritar; decir de dónde sale cada cosa; opera como un diario | Es la misión | Sí, en espíritu | "Sin opinión" (CE:36, CE:851, CE:921) contra el buzón, que admite opinión firmada (`docs/10-REGLAS-Y-PRUEBAS.md:346-347`) y `PENDIENTES.md` ("estudiar notas de opinión") | **Mantener** y aclarar la opinión → **dueños** |

### § 2. Qué entra y qué no (CE:43-169)

| Parte | Qué dice | Para qué | ¿Se cumple? | ¿Choca? | Veredicto |
|---|---|---|---|---|---|
| Las fuentes (CE:45-53) | Todo en `FUENTES.md`; un medio, un nombre; cada fuente con su ciudad, que la IA recibe | TN con cuatro feeds contaba como cuatro medios en el cruce (regla 57); Ecos Diarios se tomaba por de Balcarce (regla 43) | Sí (`ingesta/fuentes.mjs`, `reels/reescritura.mjs:233-250`) | No. El 15/10 se decidió "Balcarce + 50 + 10" (`docs/DECISIONES.md:19`): no cambia el texto | **Mantener** como puntero (es la etapa 1) |
| Lo que no se trae (CE:55-61) | Secciones de otro país, policiales y consejos de los medios de afuera no entran; de otro país sólo con conexión argentina o "si es automovilismo" | Los nacionales traían el mundo entero (regla 41) | Sí (`fuentes.mjs:938`, `CONEXION_ARGENTINA` en `fuentes.mjs:972-973`) | "O es automovilismo" contra "la F1 sin un argentino, no" (C-6). "Boca" y "River" como conexión argentina por palabra (P-3) | **Dueños** (F1); el resto, etapa 2-5 |
| De acá y de afuera (CE:63-77) | "De acá" = toca la zona; si no, medio de Balcarce o Balcarce en el título. Lo copiado de afuera es de afuera | Copetonas salió sola el 28/09 con "sudeste bonaerense" (regla 58); un referéndum de Suiza copiado por una radio de acá (regla 64) | Sí: `esDeAca` (`ingesta/ingesta.mjs:539`), `historiaDeAca`, `mencionaAca` | El documento nombra Los Pinos; el código no lo reconoce (`PALABRAS_LOCALES`, `fuentes.mjs:911-916`) y toma la ruta 226 en cualquier tramo (`PALABRAS_ZONA`, `fuentes.mjs:924-928`) (C-5, P-12) | **Reescribir** con una sola definición en tres niveles; la extensión de "la zona" → **dueños** |
| Lo de afuera se mide en medios (CE:78-85) | Cuántos medios pide cada sección; nunca con uno; "una fuente oficial alcanza sola" | Ailín Pérez (9 medios) frenada por puntaje el 27/09 (`ingesta/criterio.mjs:150-174`) | Sí, salvo una frase: lo de afuera de un solo medio se descarta en el cruce sin mirar si es oficial (`ingesta.mjs:1490`). La oficial alcanza sola sólo si es de acá (las cuatro locales tienen `alcance: 'local'`); la de la Provincia necesita el cruce, a propósito (`fuentes.mjs:402-408`) (P-6) | — | **Reescribir** "una fuente oficial **de Balcarce** alcanza sola". Los números, etapa 2-5 |
| La lectura con IA (CE:87-93) | Una IA arma una ficha; saca publicidad, chimentos, extranjero, lo sin relación, policial de afuera; **nunca destraba** | Regla 49 | Sí (`ingesta/lectura-ia.mjs`) | La definición de Policiales en el prompt de lectura no dice "sólo de la zona" (`lectura-ia.mjs:84`; lo corrige `:399`) (P-11) | **Mantener** la frase "la IA nunca destraba"; el resto, etapa 2-5 |
| Una noticia, una nota (CE:95-101) | Varias fuentes del mismo hecho = una nota; queda la publicada, la que sale sola, la más contada, la de más puntaje | Dos notas de la Cooperativa y dos del RENAPER el 1/10 (regla 94) | Sí, pero hay **dos** órdenes: antes de publicar (`lectura-ia.mjs`) y entre dos ya publicadas (`web/lib/repetidas.js`: la de redes, la de foto, la de cuerpo, la primera) (C-12) | — | **Reescribir** con las dos etapas; detalle en etapa 2-5 |
| Nada viejo (CE:103-107) | 12 h para estrenar; "la portada **y las secciones** muestran sólo las últimas 36"; la fecha nunca rejuvenece | 40 de 140 notas salían con el hecho de más de un día (regla 63) | Portada sí. **Secciones no**: guardan todo, 10 por página (`web/lib/paginas.js:3`, `CLAUDE.md`) (P-7) | — | **Reescribir** |
| Las secciones (CE:109-130) | Once secciones; Política y Policiales esperan a una persona en redes; sin Servicios ni Región | Regla 53 | Sí: 11 en el código | Hernán decidió 15 el 5/10 (C-13); el clima "no es nota" pero el prompt de lectura lo pone en Agro y Argentina (C-14) | **Dueños** (cuántas); la lista viva, etapa 2-5 |
| Las fotos (CE:132-153) | Foto propia, oficial o de otro medio sin marca; nunca foto inventada; nunca menor ni víctima | Decisión de Hernán del 27/09 con el riesgo legal explicado (`INVESTIGACION.md` § 7) | Casi: "con la mínima duda, esa foto no se usa" (CE:142-143) contra el prompt de fotos, que en la duda de un logo la usa (C-2). Falta Wikimedia (regla 99) (C-19) | — | **Mover** el detalle a `docs/05-FOTOS.md`; dejar en el criterio las tres líneas legales **INTOCABLES** |

#### "Lo que no entra nunca" (CE:155-169), fila por fila

| Fila | Para qué | ¿Se cumple? | ¿Choca? | Veredicto |
|---|---|---|---|---|
| Nada que identifique a un menor o a una víctima (CE:159) | Leyes 26.061 y 26.485 (`INVESTIGACION.md` § 6) | Sí: rojo (`fuentes.mjs:1117-1120`), regla 13 del prompt, fotos (regla 73), pistas (regla 116) | El prompt es más claro ("sea víctima, acusado o testigo"); el documento se puede leer como "menor víctima de…" (C-15) | **INTOCABLE**. Que el documento use la frase del prompt (es más estricta, no afloja nada) |
| Una acusación dicha como hecho (CE:160) | Doctrina Campillay | Sí: `acusacionSinAtribuir` mira cada oración (`ingesta/verificar.mjs:192-227`, regla 128) | — | **INTOCABLE**, mantener |
| La cotización del dólar como nota ajena (CE:161) | "Dólar hoy y dólar blue en vivo" salió el 25/09 (`verificar.mjs:411-413`) | **No es "nunca"**: es amarillo (`ingesta.mjs:824-826`, `fuentes.mjs:1206`), una persona la puede publicar (C-10, P-1) | §3 (CE:180) dice amarillo | **Dueños** (pregunta abierta 5 de `DECISIONES.md`) |
| Lo de otros países sin conexión argentina (CE:162) | No le importa a nadie de acá | La lectura lo saca; si se cuela por el título, el semáforo lo deja **amarillo** (`ingesta.mjs:827-831`), no "nunca" (P-2) | — | **Reescribir**: "no se trae; si se cuela, espera a una persona" |
| Un policial de otro lugar (CE:163) | Los nacionales traen crímenes de todo el país con nombres de acusados | Sí (`lectura-ia.mjs:399`, regla 42) | — | **Mantener** |
| "En vivo" (CE:164) | 25/09, el titular del dólar | Sí, en título, bajada, guion y texto para redes (`verificar.mjs:674-684`) | El prompt dice sólo "título y bajada" (CE:867) (C-17) | **Mantener**; el prompt, con los cuatro |
| Una nota automática sin cuerpo (CE:165) | El 25/09 eran 42 de 89 notas con título y bajada solos | Sí (`web/lib/cuerpo.js:22,50`, regla 23) | — | **Mantener** |
| El nombre del medio en título, guion, placas o redes (CE:166) | La atribución va en la nota, con el enlace | **Sólo** se controla en el texto para redes (`verificar.mjs:820-866`); en título, bajada, cuerpo y guion nadie lo frena. El pedido de pista dice lo contrario: "atribuí cada dato al medio que lo dijo" (`panel/nota-de-pista.mjs:12`) (C-8) | — | **Mantener** la regla; dos arreglos de código chicos (etapa 6-9) |
| Lo que parece promoción (CE:167) | Sorteos, "ganá tu entrada"; un medio que se presenta a sí mismo (regla 142) | Sí: amarillo (`REGLAS_SEMAFORO.promocional`) | "Publicidad" (se saca, lectura) y "promoción" (espera, semáforo) no tienen la misma definición (V-7) | **Reescribir** con las dos definiciones juntas |
| Las listas de sepelios, ni aprobadas (CE:168) | Hernán, 27/09: sensible y sin fuente oficial | Sí: `REGLAS_SEMAFORO.nunca` (`fuentes.mjs:1150`), regla 59 y 118 (también necrológicas, obituarios, cochería) | §3 dice que el rojo "no se publica nunca, ni por error" (CE:179), pero desde el 8/10 lo rojo reescrito por una persona puede salir (regla 119); lo único absoluto es el aviso fúnebre (C-3) | **INTOCABLE**. Sumar al documento la regla 119 tal como está en el código |
| Fúnebres, comentarios de lectores, transmisiones largas (CE:169) | `docs/10-REGLAS-Y-PRUEBAS.md:348-350` | — (no hay nada que publicar) | — | **Mantener** en una línea |
| *(falta)* Efemérides de otro medio | Radio Gabal, 14/10 (regla 164) | Sí: rojo (`ingesta.mjs:797, 817`) | No está en el criterio | **Sumar** |

### § 3. El semáforo (CE:171-193)

Es del informe `docs/etapa-6-9/`. Como documento: la tabla de colores **no recoge** la regla 96 (lo de acá espera
menos: `AMARILLO_QUE_SE_SUELTA_*`, `fuentes.mjs:1265-1266`) (C-4), ni la 118 (menor por su edad, muertes en
plural), ni la 119 (C-3), ni que lo internacional es amarillo. **Veredicto: sacar** del criterio editorial el
detalle y dejar cuatro frases: lo rojo, lo que espera a una persona, "la IA nunca destraba" y "Política y Policiales
esperan a una persona en las redes". La tabla viva queda en el informe del semáforo.

### § 4. Cómo se escribe una nota (CE:195-418)

| Parte | Qué dice | Para qué | ¿Se cumple? | ¿Choca? | Veredicto |
|---|---|---|---|---|---|
| El título (CE:200-243) | Presente, una frase con verbo, ~70 y nunca más de 90, sin etiqueta, sin "en Balcarce" al final, sin gancho, con nombre y número | "En Balcarce" al final (27/09, Hernán); el repaso editorial del 28/09 (títulos cortados, con etiqueta, con "¡!"); Tecnopapa cortado en una coma | Sí: `tituloEnPasado`, `problemasDeFormaDelTitulo`, ganchos (`verificar.mjs:464-547`), `sinBalcarceAlFinal` y `tituloAutomatico` (`web/lib/titulos.js:30,126`). El 70 es guía, no se controla | — | **Mantener**; ocho ejemplos son muchos: dejar cuatro |
| La bajada (CE:245-260) | Dos o tres frases, ~50 palabras; completa el título; no promete lo que el cuerpo no cuenta | Una frase larguísima fue "el incumplimiento más frecuente" (28/09) | Sólo se controla el tope de 360 caracteres (`verificar.mjs:263`); las frases y las 50 palabras, no. `BAJADA.frasesMinimas/Maximas` no las usa ningún código | — | **Reescribir**: "hasta 360 caracteres (unas 50 palabras), en dos o tres frases" |
| El cuerpo (CE:262-319) | Obligatorio; de 70 a 180 palabras; sólo con las fuentes; pirámide; explica el título; el número central; cifras como la fuente; tiempos verbales; datos prácticos; lo no confirmado dicho igual | 28/09: pedir 100 empujaba a rellenar; 29/09: la Ley de Tierras sin decir quién presentó el amparo; "el Complejo alberga una jornada" ya hecha; Los Pumas "se confirmaron las fechas y las sedes"; TC Pick Up más seguro de lo que era; el corte de luz sin las calles (regla 84) | Casi todo: cuerpo vs. título (`problemasDeEstilo`, `verificar.mjs:772`), cifras en palabras (`verificar.mjs:58-67`), copia, repetir la bajada (`verificar.mjs:902`). El techo de 180 y los 3 párrafos **no** se controlan (sólo 1.800 caracteres) | Se pide 70 y se publica con 70: un cuerpo de 69 se cae (C-11). Andrés decidió el 11/10 un largo según la cantidad de fuentes, sin aplicar | **Mantener** el contenido; el largo → **decisión de Andrés del 11/10, a medir** |
| El contexto (CE:321-338) | Que se entienda sin haber leído nada antes: qué, a quién le importa (si la fuente lo dice), de dónde viene, qué sigue; siglas; cargos | Misma razón que el cuerpo | Parcial: siglas y cargos no se controlan | Repite el cuerpo y la regla 20 del prompt | **Reescribir**: fundir con el cuerpo |
| Que se lea fácil (CE:340-363) | Oraciones cortas, voz activa, palabras comunes, sin muletillas, con tildes; la lista `RELLENO` | Repaso editorial del 28/09 | Relleno sí (`verificar.mjs:201`); tildes sí (`verificar.mjs:548-598`); el resto, no | — | **Mantener** (la lista, con sus marcas) |
| Tabla de ejemplos (CE:365-373) | Siete pares bien/mal | Enseñar con casos | — | Repite ejemplos de arriba | **Reescribir**: tres pares |
| El guion (CE:375-379) | Es el título dicho tal cual | Las piezas de una nota se sacaron el 28/09; queda para el repaso | Sí (`GUION.maximo`) | — | **Mantener** |
| Los dos tonos (CE:381-396) | Todos los días: "se lee liviano"; serio: Policiales y 22 palabras | Que un choque no se cuente con calidez | El tono serio se elige por texto contenido, no palabra entera: "robo" encuentra "robot" (`reels/reescritura.mjs:74-78`) | "Se lee liviano" contra el prompt: "no es escribir liviano" (C-1, P-4); "crisis" y "conflicto" ponen serio a Economía o Deportes | **Reescribir** (sacar "liviano"); palabra entera (código); la lista → **dueños** |
| Lo que la IA escribe para la redacción (CE:398-411) | Claves, qué se sabe, qué falta confirmar, aportes, texto para redes, etiquetas, nivel sugerido | Para el panel y las redes (25/09) | Sí (`verificarExtras`, `verificar.mjs:842-889`). Los hashtags: `#Balcarce` si es de acá y después las etiquetas, hasta tres (`redes/elegir.mjs:262-282`): **las dos frases son ciertas** (C-18 resuelta) | El "nivel sugerido" se guarda y no decide nada (`reescritura.mjs:432`) | **Reescribir**: sacar el nivel del prompt |
| Títulos en mayúsculas (CE:413-418) | Se pasan a mayúscula inicial con `NOMBRES_PROPIOS` | Títulos de medios en mayúsculas sostenidas | Sí | — | **Sacar** a `docs/04-REDACCION.md` (es técnica, no criterio) |

### § 5. Cómo se trabaja con las fuentes (CE:420-483)

| Parte | Qué dice | Para qué | ¿Se cumple? | ¿Choca? | Veredicto |
|---|---|---|---|---|---|
| Primero se juntan; no se busca en internet (CE:422-428) | La IA recibe todas las fuentes numeradas y un texto completo; nada de internet, porque el verificador sólo controla lo que la IA recibió | Un dato "encontrado" no se distingue de uno inventado | Sí para la redacción automática | Las notas de pistas sí buscan en internet (Tavily, regla 101), pero lo encontrado se le pasa a la IA como fuente y se verifica: el principio vale, la frase no (N-4) | **Reescribir**: "la IA no busca; el sistema le da las fuentes" |
| Después se contrasta (CE:430-438) | Varias fuentes = hecho; una sola = atribuida; distintas = las dos versiones; declaración de parte = atribuida; no verificable = no confirmado | Periodismo básico | Lo controla el verificador en parte (números, nombres, citas) | — | **Mantener** |
| Cómo se atribuye (CE:440-445) | Fuente primaria antes que el medio; oficial primero; nunca el nombre del medio; nunca "pudo saber este medio" | Ley 11.723 y honestidad | El nombre del medio en el cuerpo no se controla (C-8) | — | **Mantener** |
| Campillay (CE:447-451) | Acusación sin condena: atribuida y en condicional | Calumnias e injurias (`INVESTIGACION.md` § 2-3) | Sí (`verificar.mjs:192-227`) | — | **INTOCABLE** |
| Las fechas (CE:453-460) | Nada de "ayer/hoy/mañana" sin día; nunca "este sábado"; la IA recibe las fechas con el día de la semana | 28/09: "participan este viernes", leído el lunes | Parcial: "este X" se cambia sólo si hoy no es X; "ayer/hoy/mañana" no se controla (`verificar.mjs:602-657`) (C-16). Las plantillas propias dicen "este viernes 25" (`web/lib/notas-propias.js:191-203`), "este [día]" en el clima (`:378`) y en el repaso (`:711`) (C-10, N-6) | — | **Mantener**; dos arreglos de código |
| Los antecedentes (CE:462-467) | Hasta tres notas propias de 30 días; sólo contexto, dichas como anteriores | Que la IA no cuente lo viejo como nuevo | Sí (`MARCA_ANTERIOR`, `ADMITEN_ANTECEDENTES`, `verificar.mjs:282-287`) | — | **Mantener** |
| Una sola fuente (CE:469-470) | No se inventa una ampliación | — | Sí, vía verificador | Repite la regla H y la 16 del prompt | **Mantener** (una vez) |
| El nivel de verificación (CE:472-483) | ALTA / MEDIA / BAJA, lo calcula el sistema; BAJA no sale sola | 28/09, Hernán: una opinión citada no baja el nivel | Sí, y el documento coincide con el código (`reescritura.mjs:632-657`, `DE_PARTE` en `:589`) | La nota del panel (CE:950-955) y el campo `nivel` del prompt (CE:902) dicen "declaración de parte", que el código **no** usa (C-9) | **Mantener** esta versión; borrar las otras dos |

### § 6. Cómo se verifica (CE:485-583)

Es del informe `docs/etapa-6-9/`. Como documento: la lista coincide con el código (`verificar.mjs:325-462`,
`:693-810`) y está bien explicada, pero son cien líneas de "cómo lo hace el código" dentro del criterio.
**Veredicto: sacar** a `docs/04-REDACCION.md` y dejar en el criterio tres frases: "lo que escribe la IA se controla
contra las fuentes; si un dato no está en ellas, no sale; lo que decide una persona manda". Ojo: dos números del
§ 6 están en una prueba (`criterio.test.mjs:198-222`: "más de 12 palabras seguidas", "menos de 60 palabras de
resumen"); moverlos pide cambiar la prueba.

### § 7. Qué ve el lector (CE:585-633)

| Parte | ¿Se cumple? | ¿Choca? | Veredicto |
|---|---|---|---|
| El lector ve título, bajada, cuerpo y "Fuentes (N)" cerrado; el análisis es interno (CE:587-594) | Sí (reglas 24 y 27) | — | **Mantener** |
| 1 a 6 y 9, 10 de "lo que respeta toda página" (firma corta, fuentes plegadas, análisis interno, no copiar, nada de "en vivo", sin promoción, una nota por tema, nunca inventar frescura) | Sí (pruebas `seo-paginas`, `tipografia`, `eventos`) | — | **Mantener** (son criterio) |
| 7 y 8 (tipografía, 320 a 1440 píxeles, contraste) | Sí | — | **Sacar** a `MEDIA-KIT.md` / `docs/06-WEB.md` (es diseño) |
| 11 (tres notas por sección en la portada) | SIN VERIFICAR | — | **Sacar** a `docs/06-WEB.md` |
| 12 ("Seguí leyendo": dos de la misma sección y dos de otras) | **No**: desde el 8/10 son las cuatro de la misma sección (regla 143, `web/lib/seguir-leyendo.js`) (N-1) | Sí | **Sacar** a `docs/06-WEB.md` y corregir |

### § 8. Notas propias (CE:635-663)

| Qué dice | ¿Se cumple? | ¿Choca? | Veredicto |
|---|---|---|---|
| Dólar, podcasts y agenda, sin IA, con plantilla | Sí | El título del dólar dice "este viernes 25" (`notas-propias.js:191`), contra la regla de fechas; el ejemplo del documento también (CE:644) | **Reescribir** |
| *(faltan)* La nota del clima (regla 155), las de F1 (158), las de fútbol (100), la de "Un día como hoy" (165), las notas de pistas (101) | — | El documento cuenta tres tipos y hay ocho (N-5) | **Reescribir** como un principio ("plantilla con datos, sin IA, con su fuente y su firma") y una lista corta |

### § 9. Las redes (CE:665-694)

Es del informe `docs/etapa-6-9/` y de `CRITERIO-REDES.md`. Como documento: dice "a Facebook e Instagram, por ahora,
sólo lo de Balcarce" (CE:673), pero desde el 12/10 si no alcanzan las de acá se completa con lo de afuera de más
puntaje (regla 161, `FACEBOOK.relevanciaMinimaDeRelleno` = 0) (N-2). **Veredicto: sacar** el detalle y dejar tres
principios (sólo lo publicado; lo sensible espera a una persona; nunca el nombre de la fuente). Ojo: cinco frases de
este § están en una prueba (`criterio.test.mjs:210-218`: "hasta 5 notas por día", "relevancia 75 o más"…).

### § 10. Correcciones y firma (CE:696-733)

| Parte | ¿Se cumple? | ¿Choca? | Veredicto |
|---|---|---|---|
| La tabla de firmas (CE:702-708) | Sí (`firmaCorta`, `web/components/metadatos.js:110-121`) | Faltan las firmas de las notas de pistas ("escrita con IA… y controlada contra esas fuentes", regla 101), las de datos (F1, fútbol: "armada con los datos de ESPN") y lo que escribe Claude a pedido (pregunta abierta de `DECISIONES.md`) (N-10) | **Mantener** y completar |
| Nunca "sin revisión humana"; nunca prometer una revisión que no hubo; el pie dice qué es IA | Sí (`seo-paginas.test.mjs`) | — | **Mantener** (es transparencia) |
| Una persona corrige; lo humano manda; se retira; el enlace no se rompe; cada error publicado deja una prueba | Sí (reglas 48, 55, 20, 81, 111) | — | **Mantener**. **Sumar** el derecho de rectificación (`INVESTIGACION.md` § 1): hoy no está en el criterio |

### § 11. Los números (CE:735-830)

**Se cumple**: la prueba compara fila por fila (`criterio.test.mjs:61-76`). **Problemas**: (a) de 86 filas, unas 30
son de redes, contrato del día y cupos de redacción, que no son criterio editorial; (b) `BAJADA.frasesMinimas`,
`BAJADA.frasesMaximas`, `CUERPO.parrafosMaximo` y `GUION.segundos` no los usa ningún código (sólo el texto);
`CUERPO.palabrasPedidas*` sólo se usan en el texto de corrección (`reescritura.mjs:358, 1200`); (c) falta el 10 de
la copia que se le pide a la IA (C-7). **Veredicto: mantener** el mecanismo; separar en la tabla qué es "guía para la
IA" y qué es "corte del sistema" (como hace `criterio-unico/CRITERIO-UNICO.md:296-410`), y sumar `COPIA_PEDIDA`.

### § 12. La instrucción de la IA, regla por regla (CE:846-972)

Tamaños medidos con el texto real (`leerCriterio()`), en caracteres.

| Parte | Tamaño | Qué dice | Para qué / caso | ¿Se cumple o se controla? | ¿Choca o se repite? | Veredicto |
|---|---|---|---|---|---|---|
| Presentación | 518 | Quién sos, qué tiene que entender el lector, neutral | — | — | Cinco prompts del sistema se presentan con cinco frases distintas (inventario § 4.1) | **Mantener** |
| Pasos A a H | 1.819 | Investigar con lo recibido: hecho central, contraste, lo local, atribución, fechas, antecedentes, nada propio, una sola fuente | Hacer pensar antes de escribir | No se controla (es método) | B repite § 5; D = regla 16; E = 11 y 14; H = 16; el cierre de la regla 4 los vuelve a explicar | **Reescribir**: un solo bloque "lo que recibís y cómo lo usás" |
| 1. No copiar | 528 | Nunca más de 10 palabras seguidas; cita de 10 como mucho | Ley 11.723 | El verificador corta en 12 (`verificar.mjs:237-275`); el largo de la cita no lo controla nadie | 10 contra 12 (C-7): margen a propósito, explicado sólo en `docs/04-REDACCION.md` | **INTOCABLE** (ley 11.723), palabra por palabra; declarar el 10 en la tabla |
| 2. Título | 2.038 | Todo lo del título, con seis ejemplos y la historia "(27/09, Hernán…)" | Ver § 4 | Sí (ver § 4) | Dice el presente 4 veces; "en vivo" sólo en título y bajada (C-17); la historia interna no le sirve a la IA | **Reescribir** a la mitad |
| 3. Bajada | 516 | Dos o tres frases, unas 50 palabras | Ver § 4 | Sólo los 360 caracteres | "Cabe destacar" repite la regla 19 | **Mantener** (corto) |
| 4. Cuerpo | 2.679 | La regla más larga: obligatorio, sólo fuentes, 70 a 180, pirámide, explica todo, número central, citas, sin cierres, y vuelve a explicar los pasos A-H | Ver § 4 | Ver § 4 | Su último párrafo repite B y la regla 9; "qué significa para la gente de Balcarce" empuja a la localía (N-7) | **Reescribir** |
| 5. `{{TONO}}` | 443 / 284 | El tono de todos los días o el serio | Ver § 4 | Elegido por texto contenido (`reescritura.mjs:74-78`) | Está en el carácter 8.134 de 20.171: todo lo que va después cambia según el tono (ver § 4.3) | **Mover** al final |
| 6. Números | 290 | Como los da la fuente; redondear sí, otra cifra no | "1,7 millones" contado como "un millón y medio" | Sí (`verificar.mjs:58-67`) | — | **Mantener** |
| 7. Guion | 405 | Es el título, dicho; siglas y números en palabras | — | `GUION.maximo` | — | **Mantener** (más corto) |
| 8. No nombrar la fuente | 266 | Ni en guion, título ni redes; en el cuerpo sólo en general | — | Sólo en el texto para redes (C-8) | El pedido de pista dice lo contrario (`panel/nota-de-pista.mjs:12`) | **Mantener**; corregir el pedido de pista |
| 9. No inventar | 1.028 | Nada que no esté; contradicciones con las dos versiones; "podría" se dice; sin agrandar; términos técnicos | "Cuenta corriente" no es "balanza de pagos" (SIN VERIFICAR el caso) | Sí (números, nombres, días, citas, negaciones) | Repite B, H y la 16 | **Mantener** el núcleo |
| 10. Campillay | 545 | Acusación: atribuida y en condicional | Calumnias e injurias | Sí | — | **INTOCABLE**, palabra por palabra |
| 11. Cargos y fechas relativas | 461 | Cargo la primera vez; nada de "ayer", "este sábado" | 28/09: "participan este viernes" | Parcial (C-16) | Se cruza con la 14 | **Mantener**, separando cargos de fechas |
| 12. Tildes | 387 | Con tildes y eñe; sin tildes se rechaza | El 23/09: "con ms de ciento sesenta atletas" | Sí (`verificar.mjs:548-598`) | — | **Mantener** (más corto) |
| 13. Menores y víctimas | 538 | Nunca identificar a un menor (víctima, acusado o testigo) ni a una víctima de delito sexual o de género | Leyes 26.061 y 26.485 | Sí (semáforo rojo; lo escrito vuelve a pasar por el semáforo) | — | **INTOCABLE**, palabra por palabra |
| 14. Tiempos verbales | 1.572 | Comparar fechas; pasado si ya pasó; el presente del título no pasa al cuerpo | 29/09: el Complejo y la fiesta de Ríos | No se controla (sólo "este X") | Repite la 2 (presente) y la 11 (fechas) | **Mantener** el contenido, a la mitad |
| 15. Balcarce sólo si la fuente lo dice | 541 | Ni afirmar ni negar que afecta a Balcarce; nada de "nuestra ciudad" | Reglas 46 y 71 | Sí (`LOCALIA_SIN_RESPALDO`, `verificar.mjs:209`) | Las reglas 3, 4, 17 y 20 empujan a hablar de Balcarce (N-7) | **Mantener**; que las otras digan "sólo si la fuente lo dice" una vez |
| 16. Una sola fuente | 438 | Cifras y evaluaciones atribuidas; nunca "fuentes consultadas" | Esconder que hay una sola fuente | Relleno controla "fuentes consultadas" | Repite H y D | **Mantener** (fundida con H) |
| 17. El dato local primero | 273 | Si la fuente trae un dato de Balcarce, va primero | Notas que podrían ser de cualquier lugar | No se controla | No está en el documento para personas | **Mantener** y sumarla al documento |
| 18. Posturas enfrentadas | 524 | Cada postura con su argumento; nunca resolverla con un cierre | Es lo más parecido a una regla de neutralidad (caso concreto SIN VERIFICAR) | No se controla | No está en el documento para personas | **Mantener**: es la semilla de la línea editorial |
| 19. Frases de relleno | 754 | La lista de 26 frases | Repaso editorial del 28/09 | Sí (`verificar.mjs:201`), con prueba que obliga a que la lista esté entre comillas en el prompt (`criterio.test.mjs:224-233`) | — | **Mantener** tal cual |
| 20. Contexto y estilo | 953 | Que se entienda sin leer nada antes; oraciones cortas; voz activa | Ver § 4 | Parcial | Repite la 4, la 11 y la 15 | **Reescribir** dentro del cuerpo y del estilo |
| 21. Datos prácticos | 666 | Todos los datos de un corte, trámite o evento | Los Pumas y el corte de luz del 30/09 | Parcial (regla 84 le hace llegar las listas) | — | **Mantener** |
| Lo que devolvés | 1.563 | Claves, seSabe, noConfirmado, aportes, textoRedes, etiquetas, **nivel** | — | Sí; el `nivel` se descarta (`reescritura.mjs:432`) | El `nivel` trae la definición vieja de BAJA (C-9) | **Reescribir**: sin `nivel` |
| El campo "datos" | 500 | Un borrador de 3 a 10 datos con su fuente | Que escriba sólo con datos | No se publica | — | **Mantener** (su efecto real, SIN VERIFICAR) |
| La forma del JSON | 325 | El molde | — | `responseMimeType: 'application/json'`, sin esquema (`reescritura.mjs:290-291`) | — | **Mantener** sin `nivel` |
| Nota aparte del panel | 2.665 | Explica a las personas el tono serio, el semáforo, el verificador, BAJA, los tres intentos | Para el panel de la PC | **No se le manda a la IA**; el panel de la PC está en desuso | Tercera copia; la definición de BAJA es la vieja (C-9, N-9). Una prueba exige cuatro números ahí (`criterio.test.mjs:190-193`) | **Sacar** (con su prueba) o dejar tres líneas |

---

## 3. Las contradicciones y cómo resolverlas

**Dueños** = decisión editorial de Hernán y Andrés (las que tocan lo legal, sólo con el sí por escrito de Hernán,
`docs/DECISIONES.md:21`). **Doc** = alcanza con corregir el documento. **Código** = cambio chico de código.

### 3.1 Las 20 del borrador `criterio-unico/CAMBIOS.md`

| # | Contradicción | Evidencia de hoy | Resolución recomendada | Tipo |
|---|---|---|---|---|
| C-1 | Tono "liviano" (personas) contra "no es liviano" (IA) | CE:384 contra CE:915 | Vale lo de la IA: la cercanía está en el dato justo. Sacar "liviano" del documento | Doc |
| C-2 | Logo dudoso en una foto: "no se usa" contra "se usa" | CE:142-143 contra `ingesta/fotos.mjs` (prompt de fotos) | Vale el código (la pregunta "¿podría estar en la foto de cualquier persona presente?"), pero **afloja** una regla escrita por Hernán: que lo confirme | Dueños (etapa 6-9) |
| C-3 | Lo rojo: "nunca" contra "sale si una persona lo reescribe" | CE:179 contra regla 119 (`web/scripts/generar-datos.mjs:439, 559, 681`) | El documento dice las dos reglas tal como están en el código desde el 8/10: lo rojo no sale con el texto que lo puso en rojo; reescrito sin tocar la lista, puede salir; el aviso fúnebre, nunca | Doc (no afloja nada: el código ya lo hace) |
| C-4 | Acusaciones: "siempre espera" contra la regla 96 | CE:180 contra `fuentes.mjs:1265-1266` | El documento dice la regla 96 (decisión de Hernán, 2/10). La ampliación de Andrés (Policiales de acá con dos medios) espera el sí de Hernán | Doc + Dueños (etapa 6-9) |
| C-5 | La zona: el documento dice una, el código otra | CE:65-66, CE:127-129 contra `fuentes.mjs:911-928` | Una sola definición en tres niveles (Balcarce, La zona, De afuera) usada igual en todos lados; qué tramos de ruta y qué vecinos cuentan, decidirlo | Dueños (etapa 2-5) |
| C-6 | F1 sin argentino: tres versiones | CE:60-61 y `criterio.mjs:199-203` contra `lectura-ia.mjs:390-393` | Opción del inventario: sólo las notas propias con datos (Jolpica); las de otros medios sin argentino, no | Dueños |
| C-7 | Copiar: 10 contra 12 palabras | CE:866 contra `criterio.mjs:63` | Los dos números quedan, declarados en la tabla (`COPIA_PEDIDA` 10, `COPIA_MAXIMA` 12) | Doc |
| C-8 | Nombre del medio: la pista lo manda, la regla 8 lo prohíbe | `panel/nota-de-pista.mjs:12` contra CE:879 | Nunca. Cambiar el pedido de pista por "atribuí a la fuente en general" y extender el control del verificador al título, la bajada, el cuerpo y el guion | Código |
| C-9 | Cuatro definiciones de verificación BAJA | CE:479, CE:902, CE:950-955 y `reescritura.mjs:632-657` | Una sola, la del código (que es la de CE:479). Borrar "declaración de parte" del campo `nivel` y de la nota del panel | Doc |
| C-10 | Dólar: "nunca" contra "espera"; la plantilla dice "este viernes" | CE:161 contra CE:180 y `ingesta.mjs:824-826`; `notas-propias.js:191-203` | Decidir si la cotización de otros medios se descarta (el plan del 12/10 la pone en "etapa 1, sin riesgo") o queda amarilla. Aparte, la plantilla pasa a "el viernes 25" sin decisión de nadie | Dueños + Código |
| C-11 | Cuerpo: se pide 70 y se publica con 70 | CE:870 contra `web/lib/cuerpo.js:22` | Andrés decidió el 11/10 un largo según las fuentes (90-150 con una, 150-250 con varias, mínimo 70). Como el prompt nuevo no mejoró al viejo, propongo **primero** el cambio más chico: pedir desde 90 y publicar desde 70; medir; después el largo dinámico | Decidido por Andrés, a medir |
| C-12 | Qué nota queda entre repetidas: tres órdenes | CE:98-99 contra `web/lib/repetidas.js:55-65` | Escribir las dos etapas por separado (antes de publicar / ya publicadas) | Doc |
| C-13 | Secciones: 11 contra 15 decididas | `CLAUDE.md`, CE:111-124 contra `PENDIENTES.md` (5/10) | Cerrar las definiciones en un bloque y generar las listas del código desde un solo lugar (`listar-secciones.mjs`) | Dueños (etapa 2-5) |
| C-14 | Clima: "no es nota" contra "va en Agro y Argentina" | CE:126 contra `lectura-ia.mjs:89, 92` | Junto con el dólar: el clima de otros medios se descarta (el sitio tiene página y nota propia, regla 155); Agro toma el efecto del clima sobre la cosecha | Dueños |
| C-15 | Menores: absoluto, relativo o con excepción | CE:159 y CE:147-148 contra CE:884 y `fotos.mjs` | **INTOCABLE.** El documento usa la frase del prompt ("sea víctima, acusado o testigo"). Nombrar menores en notas positivas sigue prohibido mientras Hernán no diga que sí por escrito. Fotos: el código es más estricto que el documento (no conoce la excepción de Bomberos o Policía) y así se deja | Doc; lo nuevo, Dueños |
| C-16 | Fechas relativas: absoluto en el prompt, parcial en el código | CE:882 contra `verificar.mjs:602-657` | La regla queda absoluta; el arreglo cambia siempre "este X" por "el X" y avisa "ayer/hoy/mañana" | Código (etapa 6-9) |
| C-17 | "En vivo": dos campos en el prompt, cuatro en el control | CE:867 contra `verificar.mjs:674` | Una frase con los cuatro campos | Doc (prompt) |
| C-18 | Hashtags: etiquetas o fijos | CE:410 contra `CRITERIO-REDES.md:174-175` | **Resuelta**: son las dos cosas. `#Balcarce` primero si es de acá y después las etiquetas de la IA, hasta tres (`redes/elegir.mjs:262-282`). Escribirlo una vez | Doc |
| C-19 | Las fuentes de fotos no están todas | CE:134-136 contra regla 99 | Sumar Wikimedia Commons (autor y licencia; sin NC ni ND) | Doc |
| C-20 | "Actualizado el 29/09" con reglas del 2 al 14/10 | CE:3, `CLAUDE.md`, `docs/03`, `docs/04` | Fecha real y un solo lugar por regla | Doc |

### 3.2 Las 13 del plan del 11/10 (`03-PLAN-DE-MEJORA-INTEGRAL.md` § 3)

| # | Contradicción | Evidencia | Resolución | Tipo |
|---|---|---|---|---|
| P-1 | Dólar | = C-10 | Ver C-10 | Dueños |
| P-2 | Extranjero: "nunca" contra amarillo | CE:162 contra `ingesta.mjs:827-831` (amarillo por nombres de líderes en el título) | El documento dice lo que pasa: no se trae; si se cuela, espera a una persona. Si se quiere descartar del todo, es otra decisión. La nota de lavozdegalicia.es: SIN VERIFICAR | Doc (+ Dueños si se descarta) |
| P-3 | "Boca" y "River" como conexión argentina | `fuentes.mjs:972-973` | Pedir "Boca Juniors" / "River Plate" o que lo decida la lectura con IA ("un equipo argentino en una competencia de afuera") | Código (etapa 2-5) |
| P-4 | Tono | = C-1 | Ver C-1 | Doc |
| P-5 | "Sin opinión" contra el buzón con opinión firmada | CE:36, CE:851 contra `docs/10-REGLAS-Y-PRUEBAS.md:346-347` | Propuesta: las notas automáticas nunca opinan; una opinión, si se publica, es una pieza aparte, firmada con nombre real, marcada "Opinión" y nunca escrita por la IA | Dueños |
| P-6 | "Una fuente oficial alcanza sola" | CE:81 contra `ingesta.mjs:1490` | Es cierto para las oficiales de Balcarce (Municipalidad, Concejo, Facultad de Agrarias: `alcance: 'local'`); la de la Provincia necesita el cruce a propósito (`fuentes.mjs:402-408`). El documento dice eso | Doc |
| P-7 | "Las secciones muestran sólo 36 h" | CE:104 contra `web/lib/paginas.js:3` | El documento dice: la portada, 36 h; las secciones guardan todo, 10 por página | Doc |
| P-8 | Copia 10 contra 12 | = C-7 | Ver C-7 | Doc |
| P-9 | Fechas de "actualizado" | = C-20 | Ver C-20 | Doc |
| P-10 | Temas que se pisan en el prompt de lectura (salud, clima, educación, ciencia) | `lectura-ia.mjs:80-92` | Se resuelve al definir las secciones (C-13) | Dueños (etapa 2-5) |
| P-11 | Policiales sin "sólo de la zona" en la lectura | `lectura-ia.mjs:84` contra `:399` | Un solo texto de la sección con su "qué no" | Doc del prompt (etapa 2-5) |
| P-12 | Localidades: el perfil nombra seis, el código reconoce otras | `perfil-balcarce.md:13-16` contra `fuentes.mjs:911-916` | = C-5. "El Verano" y San Agustín: ver si generan falsos positivos antes de sumarlos (el código los evitó por notas de fútbol europeo) | Dueños (etapa 2-5) |
| P-13 | La lista de secciones escrita a mano en diez lugares | `CLAUDE.md` ("Una sección nueva…") | = C-13 | Código (etapa 2-5) |

### 3.3 Diez que no estaban en ninguna lista

| # | Contradicción | Evidencia | Resolución | Tipo |
|---|---|---|---|---|
| N-1 | "Seguí leyendo: dos de la misma sección y dos de otras" | CE:629-630 contra regla 143 (`web/lib/seguir-leyendo.js`) | Corregir y mover a `docs/06-WEB.md` | Doc |
| N-2 | "A Facebook e Instagram sólo lo de Balcarce" | CE:673 contra regla 161 (relleno con lo de afuera) | Corregir (lo detalla etapa 6-9) | Doc |
| N-3 | `INVESTIGACION.md` dice "toda acusación espera a una persona" | `INVESTIGACION.md`, "Cómo se aplica hoy" punto 2, contra regla 96 | Corregir ese renglón | Doc |
| N-4 | "No se busca nada en internet" | CE:425-428 contra las notas de pistas con Tavily (regla 101) | "La IA no busca; el sistema le da las fuentes y el verificador controla contra ellas" | Doc |
| N-5 | El § 8 cuenta 3 tipos de notas propias y hay 8; las efemérides ajenas no figuran | CE:635-663 contra reglas 100, 101, 155, 158, 164, 165 | Un principio y la lista completa | Doc |
| N-6 | "Este [día]" en las plantillas del clima y del repaso, no sólo del dólar | `notas-propias.js:378, 711` | Mismo arreglo que C-10 (las plantillas no pasan por el arreglo automático) | Código |
| N-7 | El prompt empuja a hablar de Balcarce (reglas 3, 4, 17, 20) y lo frena en una (15) | CE:868, CE:872, CE:888, CE:891 contra CE:886 | Decirlo una sola vez: "Balcarce, sólo si la fuente lo dice; y si la fuente trae un dato de acá, va primero" | Doc (prompt), a medir |
| N-8 | El encabezado dice que el panel de la PC muestra el criterio | CE:15-16 contra regla 125 | Sacar | Doc |
| N-9 | La nota del panel describe BAJA con "declaración de parte" y es la tercera copia | CE:950-955 | Sacarla (o dejar tres líneas) y ajustar su prueba | Doc + prueba |
| N-10 | La tabla de firmas no tiene las de pistas, datos (ESPN, Jolpica) ni lo que escribe Claude | CE:702-708 contra reglas 100, 101 | Completar; la firma de Claude, decidirla | Doc + Dueños |

---

## 4. La instrucción de la IA, medida

### 4.1 Cuánto pesa

| Qué | Caracteres | Palabras | Tokens (estimado) |
|---|---|---|---|
| Reglas fijas (`PROMPT:REGLAS`) | 20.171 | 3.603 | 5.040 a 5.760 |
| Con el tono de todos los días | 20.606 | — | 5.150 a 5.890 |
| Con el tono serio | 20.447 | — | 5.110 a 5.840 |
| La nota (fuentes, texto completo de hasta 4.000 caracteres, antecedentes) | ~2.000 a 6.000 | — | ~500 a 1.700 |
| `CRITERIO-EDITORIAL.md` entero | 80.589 | — | — |

- **Los tokens son una estimación** (3,5 a 4 caracteres por token en castellano). **SIN VERIFICAR**: el sistema no
  guarda lo que Gemini informa (`usageMetadata`); no hay ninguna línea que lo lea en `ingesta/`, `reels/`, `redes/`
  ni `web/`. Guardarlo es lo primero para medir de verdad.
- **Por día**: con 140 a 180 pedidos de redacción (cifra del plan del 11/10, SIN VERIFICAR hoy) son unos 0,7 a 1,1
  millones de tokens de reglas repetidas, cerca del 75 % de todo lo que entra. Más los segundos pedidos con
  corrección. Hoy es gratis (`reels/claves.mjs`): el costo es **cupo por minuto y velocidad**, no plata.
- **Cómo se manda**: todo en un solo mensaje (`reels/reescritura.mjs:290`), sin `systemInstruction`, con
  `temperature: 0.6` y JSON sin esquema. (La temperatura es de la redacción, etapa 6-9.)

### 4.2 Qué sobra

| Qué | Dónde | Caracteres aprox. | Por qué sobra |
|---|---|---|---|
| El campo `nivel` y su explicación | CE:902 y el JSON | ~400 | El sistema lo calcula y la sugerencia no decide nada (`reescritura.mjs:432`); además trae la definición vieja de BAJA |
| Historia interna ("27/09, Hernán; el sistema igual lo saca") | regla 2 | ~70 | La IA no puede hacer nada con eso |
| El título en presente dicho 4 veces + 3 en la regla 14 | reglas 2 y 14 | ~600 | Una vez con un ejemplo alcanza |
| Contrastar y atribuir dicho en B, D, H, 4 (último párrafo), 9 y 16 | — | ~1.500 | Es la misma regla seis veces |
| Fechas relativas en E, 11 y 14 | — | ~500 | Una vez |
| "Balcarce" 24 veces; el empuje a la localía en 3, 4, 17 y 20 | — | ~400 | Además de largo, se contradice con la 15 (N-7) |
| Contexto y estilo (regla 20) que repite la 4, la 11 y la 15 | regla 20 | ~600 | Fundir |
| Ejemplos: seis en la regla 2, varios en la 4, 14 y 21 | — | ~1.500 | Dejar los que enseñan un error real |
| "Cabe destacar" en la regla 3 | regla 3 | ~60 | Ya está en la 19 |

**Lo que no conviene sacar**: las reglas 10 y 13 (**INTOCABLES**), la lista de relleno entre comillas (una prueba
la exige: `criterio.test.mjs:230-231`), los casos que vinieron de errores publicados (tiempos verbales, datos
prácticos, "Esta medida" al empezar el cuerpo) y las frases con números que controla una prueba
(`criterio.test.mjs:181-196`: "apunta a unos 70 caracteres y NUNCA pasa de 90", "unas 50 palabras como mucho",
"Va de 70 a 180 palabras", "hasta 280 caracteres", "de 3 a 5 puntos cortos", "de 3 a 8 palabras o frases").

### 4.3 Dos ideas que no cambian ninguna regla

1. **Poner `{{TONO}}` al final.** Hoy está en el carácter 8.134: lo que sigue cambia según el tono, así que sólo
   los primeros 8.000 caracteres son siempre iguales. Con el tono al final, los ~20.000 serían siempre iguales. Eso
   sirve si el servicio reaprovecha el comienzo repetido de los pedidos (la caché implícita de Gemini): **SIN
   VERIFICAR** que lo haga con `gemini-flash-lite-latest` y en el plan gratis, y si cuenta para el cupo. Costo:
   ninguno. Hay que sacar el "5." del comienzo de los dos tonos.
2. **Una sola regla, una sola vez**, con la estructura de la propuesta (lo que recibís → reglas → lo que
   devolvés). Es la idea del borrador `criterio-unico/` para el redactor.

### 4.4 Una versión corta para medir

El texto de abajo es un **borrador para medir**, no para pegar. Mide 10.908 caracteres contra 20.171 (−46 %,
unos 2.300 a 2.650 tokens menos por pedido; medido con el mismo programa que lee el criterio). Mantiene: las reglas 1 (copia), 10 (Campillay) y 13 (menores y víctimas) **palabra por palabra**, la lista de relleno entre
comillas, todas las frases con números que controla la prueba, `{{TONO}}` una sola vez (al final) y el mismo JSON
sin `nivel`. Saca: el campo `nivel`, la historia interna, las repeticiones y la mitad de los ejemplos. **No agrega
ninguna regla nueva** (la línea editorial se mide aparte, en una segunda variante).

**Cómo medirlo** (gasta cupo de la clave de redacción: uno o dos pedidos por nota y por versión):

1. Copiar el texto entre las dos líneas de abajo a un archivo, por ejemplo `variante-corta.txt` (fuera del repo).
2. `node reels/comparar-instruccion.mjs actual variante-corta.txt --notas=24` (las mismas 24 notas para las dos).
3. Mirar en la tabla final: cuántas sacan cuerpo en el primer intento, cuántas necesitan corrección, por qué
   rechaza el verificador (dato inventado, copia, título en pasado, localía, sin tildes) y el largo promedio.
4. Leer a mano 6 a 8 notas de cada versión (sobre todo tiempos verbales, datos prácticos y atribución).
5. Se adopta sólo si **no es peor** en nada de lo anterior. Si empata, conviene la corta (más rápida y con más
   margen de cupo). Antes de pegarla en el criterio hay que ajustar `criterio.test.mjs` sólo si alguna frase
   controlada cambió (en este borrador no cambia ninguna).

**Efecto esperado** (SIN VERIFICAR hasta medirlo): lo mismo o un poco mejor en el cumplimiento, porque la regla más
importante de cada tema queda una vez y más arriba; menos rechazos por "localía" si el empuje a Balcarce era la
causa. **Riesgo conocido**: el 29/09 un cambio de reglas movió cuántas notas sacaban cuerpo
(`docs/04-REDACCION.md`), y el borrador del 11/10 no mejoró al actual (`06-IMPLEMENTAR-YA.md`, etapa 6).
Una segunda corrida con la misma variante más la línea editorial (opción B de la propuesta, ~600 caracteres) dice
cuánto cuesta sumarla.

----- variante corta: desde acá -----

Sos el editor digital de Radar Balcarce, un medio digital de Balcarce (provincia de Buenos Aires, Argentina). Te llega una noticia que contaron uno o más medios. La escribís para que quien lee entienda qué pasó, dónde, cuándo, a quién afecta, qué se sabe y qué falta confirmar. Escribís claro, directo y neutral: sin sensacionalismo y sin opinión.

LO QUE RECIBÍS Y CÓMO LO USÁS
- Sólo cuenta lo que recibís: las fuentes numeradas (Fuente 1, Fuente 2…), a veces una marcada como fuente oficial, el texto completo de una de ellas y, a veces, ANTECEDENTES (notas que Radar Balcarce ya publicó sobre el tema, cada una con su fecha). No tenés nada más.
- Lo que confirman varias fuentes va como hecho. Lo que dice una sola va atribuido ("según informó el municipio"). Si se contradicen en un dato, no elegís uno: van las dos versiones atribuidas o la de la fuente oficial, y la diferencia va en noConfirmado. Lo que no se puede verificar no se afirma ("todavía no se informó…").
- Con una sola fuente no inventás una "ampliación", y una cifra, un récord o una evaluación van siempre atribuidos: a la fuente primaria ("según el club", "informó la Municipalidad") o "según un medio local". Nunca "fuentes consultadas" en plural.
- Preferís la fuente primaria (el organismo, el club, la Policía, la persona que habló) al medio que la reprodujo, y la versión oficial va primero. Una declaración de parte (un denunciante, un funcionario sobre su gestión, un club sobre su equipo) va atribuida a quien la dijo, nunca como hecho.
- El nombre del medio no va nunca en el título, la bajada, el cuerpo, el guion ni el texto para redes: en el cuerpo, la fuente en general ("según informó el municipio", "de acuerdo con un medio local"). Nunca presentás como propio lo que informó otro medio ("pudo saber este medio").
- Los ANTECEDENTES son sólo contexto: van en el cuerpo, las claves o seSabe, dichos como anteriores y con su momento ("en agosto"), nunca en el título, la bajada, el guion ni el texto para redes. Si no coinciden con la fuente de hoy, manda la de hoy.

REGLAS FIJAS
1. Nunca inventás un dato, una cifra, un nombre, un día o una cita que no esté en lo que recibiste, en ninguna parte. Si la fuente dice "podría", "se analiza" o "según trascendió", la nota también, y en la bajada si es el hecho central. No agrandás con adjetivos que la fuente no usa ("un fuerte impacto"). Los términos técnicos y los nombres de los organismos, como los da la fuente.
2. NUNCA copiás el texto original: nunca más de diez palabras seguidas iguales a las de una fuente, en ninguna parte (tampoco en el título, la bajada ni adentro de una cita). Se reescribe con palabras propias, cruzando lo que cuenta cada fuente si hay más de una: cambiás el orden de la frase y el verbo, y partís en dos lo que la fuente dice en una oración larga. Una cita textual va entre comillas, atribuida, y tiene diez palabras como mucho: si lo que dijo alguien es más largo, lo contás con tus palabras ("explicó que…").
3. Balcarce, sólo si la fuente lo dice. Nunca afirmás que algo afecta a Balcarce, a los vecinos o a "la región" si las fuentes no lo dicen, ni tampoco lo contrario. Escribís en tercera persona: nunca "nuestra ciudad". Nunca agregás Balcarce a una nota de otro lugar para que parezca local. Si la fuente trae un dato de Balcarce (un nombre, un resultado, una dirección, una obra), ese dato va primero.
4. El título apunta a unos 70 caracteres y NUNCA pasa de 90. Es una frase completa que dice qué pasó, con sujeto y verbo en PRESENTE aunque el hecho ya haya pasado ("El Concejo aprueba…", "Ferroviarios gana…"); si todavía no pasó, con el día ("La Cooperativa corta la luz el miércoles"). Nunca en pasado ("aprobó", "se realizó", "fue elegido"), nunca con una etiqueta y dos puntos ("Rugby:", "Balcarce:"), nunca un sustantivo y un lugar sin verbo ("Cruce en Balcarce por…"), nunca cortado (en coma, "y", "de", "que" o puntos suspensivos: si no entra, elegís el dato central y el resto va a la bajada). Sin signos de admiración ni de pregunta, sin adjetivos ni frases de gancho ("increíble", "lo que tenés que saber"). Nunca termina en "en Balcarce". Si el hecho es de otra ciudad, nombra esa ciudad y nunca a Balcarce. Con nombre y número: "Pato Naranja gana 24 a 10", no "Gran triunfo del rugby local".
5. Nunca "en vivo", "minuto a minuto" ni "en directo" en el título, la bajada, el guion ni el texto para redes, aunque el original lo diga: Radar Balcarce cuenta lo que pasó.
6. La bajada (el campo "copete") son dos o tres frases cortas, unas 50 palabras como mucho. Suma el dato que el título no tenía (cuándo, cuánto, quién decidió) y no promete nada que el cuerpo no cuente.
7. El cuerpo es OBLIGATORIO. Va de 70 a 180 palabras, según lo que den las fuentes: nunca más largo que los datos. Uno a tres párrafos cortos, separados por una línea en blanco. Cada oración aporta un dato nuevo (quién, qué, cuándo, dónde, cuánto o qué dijo alguien). El primer párrafo da el hecho central con el dato que la bajada no dio, sin repetirla, y se entiende sin ella: nunca empieza con "Este monto" o "La medida", ni dice "el mencionado" sin haberlo nombrado. Después, el contexto; al final, si la fuente lo da, qué sigue. Explica todo lo que nombran el título y la bajada, y da el dato central con su número ("aumenta la tasa": cuánto, desde cuándo, a quién; si no se informó, lo dice). Sin cierres que resuman o valoren ("de esta manera…").
8. Si la nota anuncia algo práctico (un corte, un horario, un trámite, un evento, un partido), el cuerpo tiene todos los datos que da la fuente: el día con su fecha, la hora de inicio y de fin, el lugar, a quién afecta (calles, barrios), qué hay que hacer o llevar y cuánto cuesta. Nunca una frase vaga en lugar de un dato ("se confirmaron las fechas y las sedes" sin decir cuáles).
9. Antes de escribir, comparás la fecha de hoy con la de la fuente (las dos llegan con el día de la semana). Lo que ya pasó va en pasado en el cuerpo aunque la fuente lo haya anunciado en futuro: si la fuente del jueves dice "el sábado se largará la carrera" y hoy es lunes, "la carrera se largó el sábado". Lo que todavía no pasó, en futuro o con el día. El presente del título no pasa al cuerpo ("El Complejo alberga una jornada" está mal si ya se hizo). Nunca "ayer", "hoy" ni "mañana" si la fuente no dice el día, ni "este sábado", "este fin de semana" o "esta madrugada": va "el sábado" o, si la fuente da el número, "el sábado 26".
10. Si la nota original ACUSA a alguien de algo (un delito, una falta, una irregularidad) y todavía no hay una condena o una confirmación oficial: SIEMPRE atribuís la acusación a quien la hizo ("según la denuncia de...", "de acuerdo con la Policía...", "según fuentes judiciales...") y usás el modo condicional ("habría", no "hizo"). Nunca lo escribís como un hecho afirmado por vos, ni en el copete ni en el cuerpo. Esto no es sólo estilo: es lo que en Argentina protege a un medio de una demanda por calumnias o injurias (doctrina Campillay).
11. Los números van como los da la fuente. Podés redondear ("unos 3.500" por 3.480) o comparar ("el triple que el año pasado", si la fuente da los dos datos), pero nunca pasás a otra cifra: si la fuente dice 1,7 millones, no es "un millón y medio".
12. Presentás a cada persona con su cargo la primera vez y después por el apellido. Una sigla se explica la primera vez, salvo las que todos conocen (AFA, ANSES).
13. NUNCA identificás a un menor de edad (sea víctima, acusado o testigo) ni a una víctima de un delito sexual o de violencia de género. Eso quiere decir: ni su nombre, ni su apodo, ni sus iniciales, ni su escuela, ni su domicilio o su cuadra, ni un parentesco que la deje identificada ("la hija del dueño de tal comercio"), ni su foto ni su descripción física. Aunque la fuente lo publique, vos no lo repetís: hablás de la persona de forma general, sin nada que permita saber quién es. No es estilo: lo exigen las leyes 26.061 y 26.485.
14. Cuando la nota cuenta posturas enfrentadas, cada una va con su argumento concreto, atribuido a quien lo dijo. Nunca la resolvés vos con un cierre ("ambos coinciden en…"), y nunca cambiás el momento o la persona a la que se refirió quien habló.
15. Escribís en castellano correcto, con las tildes y la eñe donde van (sábado, Napaleofú, también, según, más, reunión, información): un texto sin tildes se rechaza. Oraciones cortas, un dato por oración (con más de dos comas, la partís), sujeto, verbo y predicado en voz activa, y palabras de todos los días ("empezó", no "dio inicio"). Tiene que sonar a un periodista del pueblo que cuenta bien lo que pasó.
16. Nunca usás estas frases de relleno, aunque la fuente las diga: "fuentes consultadas", "pudo saber", "hito histórico", "consolidando", "consolidándose", "un legado", "motivo de orgullo", "gran presencia", "en el marco de", "las fuentes no registran", "postal poco habitual", "cabe destacar", "cabe señalar", "cabe mencionar", "cabe remarcar", "es importante destacar", "es importante señalar", "vale destacar", "vale la pena destacar", "por este medio", "en ocasiones previas", "sin dudas", "sin lugar a dudas", "una gran noticia", "no pasó desapercibido", "dijo presente". Tampoco "como se había informado" si no recibiste antecedentes.
17. El guion para la voz ES EL TÍTULO, dicho tal cual, para unos diez segundos. Sólo cambia lo que no se puede leer en voz alta: las siglas, como se pronuncian, y los números, en palabras (catorce, no 14).

LO QUE DEVOLVÉS ADEMÁS (no lo ve el lector y sigue las mismas reglas)
- datos: lo primero que escribís, tu borrador (no se publica): de 3 a 10 datos concretos que vas a usar, uno por punto y con su fuente ("F1: …"). Si la fuente los da, van siempre la fecha y la hora de lo que va a pasar, el lugar, las cifras centrales y quiénes hablan o deciden. Todo lo demás lo escribís sólo con esos datos y con palabras tuyas.
- claves: de 3 a 5 puntos cortos, de una línea cada uno, con lo esencial.
- seSabe: los datos confirmados, uno por punto, atribuidos cuando corresponde.
- noConfirmado: lo que no se pudo verificar y lo que las fuentes cuentan distinto, uno por punto; una lista vacía si no hay nada (que hubo una sola fuente lo agrega el sistema).
- aportes: por cada fuente que usaste, {"fuente": su número, "aporte": qué aportó, en una frase}, sin nombrar al medio.
- textoRedes: el posteo de Facebook, hasta 280 caracteres: qué pasó y, sólo si la fuente lo dice, por qué le importa a Balcarce. Sin el nombre del medio, sin hashtags, sin enlaces y sin emojis.
- etiquetas: de 3 a 8 palabras o frases cortas que digan de qué trata la nota, sin "#".

{{TONO}}

Devolvés SOLO un JSON con esta forma exacta, sin texto alrededor:
{"datos": ["F1: ..."], "titulo": "...", "copete": "...", "cuerpo": "...", "guion": "...", "claves": ["..."], "seSabe": ["..."], "noConfirmado": ["..."], "aportes": [{"fuente": 1, "aporte": "..."}], "textoRedes": "...", "etiquetas": ["..."]}

----- variante corta: hasta acá -----

Notas sobre el borrador: (a) los textos de tono empiezan con "5. Tono:"; para medir no molesta, para adoptarlo se
saca el "5." de las dos marcas de tono; (b) sacar `nivel` del JSON parece seguro porque el código lo toma sólo si
viene (`reescritura.mjs:432`), pero hay que confirmarlo con `npm test` y una corrida (SIN VERIFICAR que ninguna otra
parte lo espere); (c) el prompt de la lectura con IA (3.261 + 2.186 caracteres del perfil por lote de 12 notas) es
de la etapa 2-5.

---

## 5. Preguntas para Hernán y Andrés, de la más importante a la menos

1. **Línea editorial** (Hernán): ¿la opción A (larga, con prioridades de selección), la B (mínima: neutralidad y
   mismo trato) o ninguna por ahora? ¿Y se dice en "Quiénes somos" cuáles son los principios? (Textos en la
   propuesta, § 3.)
2. **Dólar y clima de otros medios** (Hernán): ¿se descartan siempre (el sitio tiene los suyos) o quedan esperando a
   una persona?
3. **Opinión**: ¿las notas automáticas nunca opinan y, si algún día hay opinión, va firmada por una persona, aparte y
   marcada? ¿O nada de opinión?
4. **Menores en notas positivas** (Hernán, recordatorio): sigue prohibido nombrarlos mientras no lo autorice por
   escrito. ¿Se mantiene así?
5. **La zona**: ¿cuenta la ruta 226 o la 55 fuera del partido? ¿La papa de cualquier lugar o sólo la del sudeste?
   ¿Lobería, Ayacucho y Mar Chiquita son "la zona" o "de afuera"?
6. **Largo del cuerpo**: ¿primero el cambio chico (pedir desde 90, publicar desde 70) y después el largo según las
   fuentes que decidió Andrés el 11/10? Todo medido antes.
7. **Recortar la instrucción de la IA**: ¿se autoriza medir la versión corta (gasta unos 50 a 100 pedidos de la clave
   de redacción)? Se adopta sólo si no empeora.
8. **Fórmula 1 sin un argentino**: ¿sólo nuestras notas con datos, o también las de otros medios?
9. **Foto con un logo dudoso**: ¿se adopta lo que hace el código ("si podría estar en la foto de cualquiera que
   estuvo ahí, no es marca") en lugar de "con la mínima duda, no se usa"?
10. **Tono serio**: ¿"crisis" y "conflicto" siguen poniendo serio un texto (hoy enfrían notas de Economía o
    Deportes)?
11. **Lo de otros países sin conexión argentina**: ¿se descarta del todo o, si se cuela, espera a una persona (como
    hoy)?
12. **Firma**: ¿cómo firma una nota que escribe Claude a pedido? ¿Y una de pista que sale sola?
13. **Secciones**: ¿11 o 15, y en qué orden? (Lo trata la etapa 2-5.)
14. **Publicidad y promoción**: ¿confirman las dos definiciones de la propuesta (lo que vende un comercio se saca;
    un sorteo o una entrada espera)?
15. **El documento**: ¿se separa el criterio editorial (lo que leen ustedes y la IA) de las reglas del sistema y de
    redes (que van a `docs/`)? Pide ajustar unas pocas pruebas, en línea con "menos pruebas" del 15/10.
16. **La nota aparte del panel**: ¿se saca? Ya no se usa el panel de la PC.
