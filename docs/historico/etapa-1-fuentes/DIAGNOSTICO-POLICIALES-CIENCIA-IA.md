# Diagnóstico: por qué Policiales tiene 1 nota, y cómo tener más Ciencia e IA

*Medido el 15 y 16/10/2026. Es un diagnóstico y una propuesta: **no se cambió nada** (ni fuentes, ni semáforo, ni reglas, ni producción). Las decisiones que tocan la lista roja, el semáforo o el menú del sitio son de Hernán y Andrés.*

## Lo importante, en diez renglones

1. **Policiales tiene una sola nota porque casi no llega material seguro, no porque el sistema la esté frenando de más.** En los últimos 14 días salieron 13 notas de Policiales (menos de una por día) contra 70 de Balcarce o 61 de Economía. Con la ventana de 36 horas de la portada, eso da una o dos.
2. **La sección es sólo de Balcarce y la zona (decisión del 26/09).** Todo policial de otro lugar se descarta en tres puertas: la sección "policiales" del propio medio (hoy 189 notas), el filtro "policial de afuera" (11 historias, una contada por 8 medios) y el cupo de afuera de Policiales, que es 0.
3. **Lo de acá es poco.** Los 13 medios de Balcarce publicaron 68 notas en 5 días y sólo unas 6 eran policiales. Y de lo que llega, más de la mitad espera a una persona: en 14 días 59 notas de Policiales quedaron "esperando"; 10 terminaron saliendo (casi siempre porque otro medio las confirmó) y 49 no salieron nunca.
4. **Qué las frena:** la palabra "detenido", "acusado" o "imputado" sola frena 32 de las 59 (54 %); "herido/herida/lesionada" frena 12 (20 %); "homicidio", "víctima", "muerte" o "niño", 9 (15 %).
5. **Esperar a una persona, en la práctica, es no salir.** Entre el 1 y el 15/10 el celular registra 18 decisiones en total (12 publicadas, 6 descartadas) para todas las secciones, y cada día esperan entre 5 y 37 notas.
6. **Tecnología e IA son un problema distinto: no falta material, falta que alguien más lo cuente.** Tecnología pide 2 medios distintos; hoy hay 231 historias de tecnología de un solo medio que no entran, contra 8 que sí. De IA, 162 contra 5. En 14 días Tecnología publicó 7 notas (la sección más flaca del sitio).
7. **Sumar más fuentes de ciencia no arregla eso sólo:** probé 75 direcciones y las nuevas casi no coinciden con lo que ya se lee (entre 80 y 100 % de lo que traen "no lo cuenta nadie más"). Hace falta además una regla: **"fuente sola"** para un puñado de fuentes serias de ciencia (cambio C1 abajo).
8. **Recomiendo 9 fuentes** (8 nuevas, y dejar la que ya está, Agencia CyTA, con la marca nueva): CONAE, NASA en castellano, DW Ciencia y tecnología, MIT Technology Review en español, INTA Informa, SENASA, La Nación Tecnología (reactivar), Ministerio de Seguridad de la Nación (para Policiales de servicio) y CyTA. Detalle en `CANDIDATAS-NUEVAS.md` y `.json`.
9. **Para Policiales, tres cambios de criterio** (P1 a P3 abajo) que, sin tocar la lista roja, podrían llevarla de ~1 a ~3 notas por día, sin pedirle más trabajo a la persona que revisa (menos, de hecho).
10. **Dos huecos de seguridad que encontré midiendo** y que conviene resolver ANTES de abrir cualquier cosa nueva (sección 5): "un menor que…" y "abusaron de ella" pasan sin frenar el semáforo.

---

## 1. Qué sale hoy, por sección (últimos 14 días)

Notas publicadas del 2 al 15/10 (`web/data/notas-por-dia.json`):

| Sección | Notas | Por día |
|---|---|---|
| Balcarce | 70 | 5,0 |
| Economía | 61 | 4,4 |
| Política | 60 | 4,3 |
| Deportes | 50 | 3,6 |
| Fútbol | 39 | 2,8 |
| Cultura y agenda | 37 | 2,6 |
| Argentina | 36 | 2,6 |
| Automovilismo | 34 | 2,4 |
| Agro | 32 | 2,3 |
| **Policiales** | **13** | **0,9** |
| **Tecnología** | **7** | **0,5** |

La portada muestra 36 horas y cada sección muestra hasta 3 (`NOTAS_POR_SECCION`), completando con el archivo de esas mismas 36 horas. Con 0,9 notas por día de Policiales caben 1 o 2 en la ventana. El 15/10 a las 15:32 la portada tenía 54 notas: Balcarce 18, Política 7, Deportes 6, Economía 6, Cultura 5, Automovilismo 4, Agro 3, Argentina 2, Fútbol 2, **Policiales 1**.

La corrida de `npm run auditar` (sin IA) dio: 527 historias, 173 saldrían solas. Policiales: 4 historias (3 salen, 1 espera). Tecnología: 8 (7 salen, 1 espera).

## 2. Policiales: dónde se pierde, paso por paso

Por qué la portada muestra 1, en palabras simples: **entra poco y lo que entra suele esperar a una persona que casi nunca llega.**

### 2.1 Las puertas que cierran lo de afuera (a propósito)

Medido hoy sobre todos los feeds activos:

| Puerta | Qué pasa | Hoy |
|---|---|---|
| Sección del medio | Si TN, La Capital, Los Andes… ponen la nota en su sección "policiales" o "seguridad", no se trae (`SECCIONES_QUE_NO_ENTRAN`, ingesta/fuentes.mjs) | 189 notas (180 títulos distintos): 87 sin ninguna palabra sensible, 75 en amarillo, 18 en rojo |
| "Un solo medio de afuera" | Lo que cuenta un único medio de afuera ni pasa el cruce | 118 historias que el clasificador pondría en Policiales |
| Policial de afuera | Lo que se clasifica Policiales y no es de Balcarce ni de la zona se descarta (`esPolicialDeAfuera`) | 11 historias, algunas contadas por 2, 4 y hasta 8 medios (una pelea en un cine de Entre Ríos) |
| Cupo | `CUPO_DE_AFUERA.Policiales = 0` | todo lo de afuera que llegara |

Esto está bien pensado: de las 87 notas "sin palabra sensible" que se cortan en la primera puerta, casi todas son de Rosario, Mendoza, Tucumán o La Plata. Ninguna le sirve a un vecino de Balcarce.

### 2.2 Lo de acá es poco

Los 13 feeds con RSS de medios de Balcarce (sin contar El Diario Balcarce y La Vanguardia, que se raspan) dieron 68 notas en 5 días. Las que hablan de policía, robos, accidentes o incendios fueron unas 6. Hoy llegaron a la etapa del semáforo 2 historias de Policiales, las dos de Radio Gabal (una verde, "Preocupación por peligrosas maniobras de motociclistas", y una amarilla, "el acusado declaró… permanecerá detenido").

Es la realidad de un pueblo: no hay más. **Si queremos más Policiales hay que ampliar qué se considera Policiales (servicio y prevención, comunicados oficiales, la zona), no aflojar el semáforo.**

### 2.3 Lo que llega y espera

En 14 días, 59 historias de Policiales quedaron en el panel "esperando a una persona" (se miraron las fotos de la portada cada ~90 minutos). La palabra que las frenó:

| Palabra | Cantidad | Parte |
|---|---|---|
| detenido / acusado / imputado | 32 | 54 % |
| herido / herida / lesionada | 12 | 20 % |
| homicidio / víctima / muerte / niño | 9 | 15 % |
| verificación baja, denuncia, medio de acá sin nombrar a Balcarce | 6 | 10 % |

Terminaron saliendo 10 (en general porque otro medio la confirmó, lo que suelta "detenido/acusado/imputado" por la regla 96, o porque la IA la liberó; no pude separarlo con los datos guardados). Quedaron sin salir 49: unas 3,5 por día.

## 3. Propuestas para Policiales (sin implementar)

Reglas duras que **no se tocan**: nunca identificar a un menor ni a una víctima; la lista roja (`REGLAS_SEMAFORO.rojo`) no se toca; Policiales en redes sigue esperando a una persona.

### P1. "Policiales de servicio" (nuevo carril, el más seguro)

Qué entra: **alertas de estafas y fraudes virtuales, prevención, seguridad vial, operativos de control en la 226 y la 55, comunicados oficiales de seguridad que no nombran a nadie**. Hoy se pierden por ser "de afuera": por ejemplo, "Día de la Madre: qué tener en cuenta al comprar regalos online para evitar fraudes y estafas" (TN), o "La estafa de WhatsApp que vacía tu cuenta" (La Nación).

- **Criterio:** entra a Policiales aunque sea de afuera si el título dice una de estas cosas (lista corta a definir: estafa, fraude, phishing, "cómo evitar", recomendaciones, prevención, control, ruta 226, ruta 55) **y** el semáforo no encuentra ninguna palabra roja ni amarilla en el título ni en los primeros 600 caracteres **y** lo cuenta una fuente oficial (Ministerio de Seguridad, ANMAT, ANSV) o 2 medios distintos.
- **Código:** `esPolicialDeAfuera` (ingesta/ingesta.mjs, línea ~501) y la regla `policial de afuera` de `SECCIONES_QUE_NO_ENTRAN` (ingesta/fuentes.mjs, línea ~947) tienen que dejar pasar lo "de servicio"; `CUPO_DE_AFUERA.Policiales` (ingesta/criterio.mjs, línea ~231) pasa de 0 a 3 y se actualizan la tabla de `CRITERIO-EDITORIAL.md` y el párrafo "Policiales es sólo de Balcarce y la zona". Una prueba por cada caso real (regla del repo).
- **Fuente nueva:** el feed del Ministerio de Seguridad de la Nación (15 notas, 6 en 72 h). Provincia (MPBA 404, Ministerio de Seguridad bonaerense no responde) y Fiscalía no tienen feed: habría que raspar su portada o pedirlo.
- **Trabajo para la persona que revisa:** ninguno (sale verde o no sale). Rendimiento estimado: de 0,5 a 1 nota por día.

### P2. Soltar "detenido / acusado / imputado" cuando lo atribuye la Policía o la Fiscalía

Es el 54 % de lo que espera. La regla 96 ya suelta esas tres palabras en lo de acá si hay fuente oficial o 2 medios. Propuesta: **sumar "o el propio texto atribuye el dato a la Policía, la Fiscalía o la Justicia"** ("según informó la Policía…", "la Fiscalía dispuso…") y no aparece ninguna de las otras palabras (menor, niño, víctima, homicidio, herido, muerte). El verificador ya rechaza "mató a…" sin atribución, y la doctrina Campillay se cumple escribiendo en condicional.
- **Código:** `AMARILLO_QUE_SE_SUELTA_SI_LA_CONFIRMAN` y el cálculo de `corroborada` en `semaforo()` (ingesta/ingesta.mjs, ~línea 815) y en `semaforoDelTexto`.
- **Efecto estimado:** hasta 2 notas más por día.
- **Hay que decidirlo ustedes**: toca el semáforo amarillo.

### P3. Menos trabajo para la persona que revisa (lo que sigue esperando)

Hoy todo lo que espera cae en la misma pila (entre 5 y 37 por día, de todas las secciones) y por eso casi no se mira. Propuesta: en el celular, una pestaña **"Policiales para revisar"** con la nota ya escrita, el motivo en una línea ("herido: choque en la 226, fuente Bomberos") y dos botones (Publicar / Descartar). Con P1 y P2 quedarían unas 2 por día: **2 a 4 minutos diarios**. No toca el semáforo; sólo el panel (`web/public/panel/`, `panel/celular-datos.mjs`).

### Lo que **no** recomiendo

- **Abrir el crimen de otras provincias.** Son ~180 notas por día, 75 amarillas y 18 rojas, y no le importan a Balcarce.
- **Aflojar "herido" o "víctima".** Con heridos y muertos hay nombres y familias; mejor que los mire una persona.
- **Raspar el Facebook de Bomberos o la Policía comunal** sin permiso: términos de uso.

### Estimado de resultado

De 0,9 por día a unas **3 por día** si se aprueban P1 y P2 (estimación; no se midió en producción).

## 4. Tecnología, ciencia e IA

### 4.1 Por qué hay tan poco

| | Hoy | 14 días |
|---|---|---|
| Historias de tecnología que entran | 8 (7 verdes) | 7 publicadas |
| Historias de tecnología que NO entran por "un solo medio" | **231** | — |
| De esas, con IA en el título | **162** (contra 5 que sí entraron) | — |
| Con palabras de ciencia o salud en el título (mezcla) | 140 | — |

Lo que se pierde es, por ejemplo, las tres notas de Agencia CyTA sobre los Nobel 2026, "Google da acceso a sus modelos de IA más potentes a científicos" (Infobae), "Crece la capacidad de la IA para resolver problemas científicos" (La Nación) o "Simulan el clima de 2040 para saber qué pasará con los pastizales" (La Nación). Cada una la contó un solo medio.

Además Infobae Tecno trae 100 notas en 72 horas (la mayor parte de lo que se lee de tecnología) y es en buena parte guías y ofertas ("Cómo descargar Xuper TV", "Cuánto cuesta el Bitcoin"): por eso no conviene destrabar un medio entero.

### 4.2 Qué probé

75 direcciones, con `curl` y con el mismo User-Agent que usa la ingesta (`RadarBalcarce/0.1`), el 16/10. Planilla completa en `CANDIDATAS-NUEVAS.json` y resumen en `CANDIDATAS-NUEVAS.md`.

Resultado en una línea: **48 responden con un feed válido (44 con notas) y 27 no** (404, 403, 500, vacíos, o muertos desde hace meses; varias direcciones eran la misma, como los tres feeds por tema de la BBC). Las que no andan y vale la pena saberlo: CONICET (feeds apagados, 500), Télam (cerrada), Fiscalía de la Provincia (404), Agencia SINC (404), RTVE (notas de 2009), National Geographic (403), Página/12 Ciencia (última nota del 24/06).

**Dato clave:** con las fuentes nuevas casi nada coincide con lo que ya se lee. De lo que cada candidata trajo en 72 horas, la mayor parte "no la contó nadie más" (MIT Technology Review en español: 7 de 7; DW Ciencia y tecnología: 7 de 7; NASA: 2 de 2; SENASA: 7 de 9; La Nación Tecnología: 13 de 16; INTA Informa: 3 de 7). Con la regla de 2 medios, sumarlas sin más no cambiaría casi nada.

### 4.3 Cambios de código para Ciencia e IA

**C1. Marca "fuente sola" (la clave).** Un campo `fuenteSola: true` en la ficha de una fuente seria de ciencia: sus notas **pasan el cruce con un solo medio**, pero siguen pasando por todo lo demás (semáforo, cupo de la sección, lectura con IA, verificador, cuerpo de 70 palabras). Es un término medio entre "nada de afuera sale con un solo medio" y "fuente oficial": el equipo decidió a propósito *no* marcar INTA ni Salud como oficiales para que no salgan solas sin control. Lo que cambia es que ya no mueren antes de que las lea la IA.
- Dónde: `ingesta/fuentes.mjs` (el campo en cada ficha), `ingesta/ingesta.mjs` (el descarte del cruce, línea ~1532; `semaforo()` ~línea 860; `exigirMedios()` ~línea 1371; copiar el campo desde la fuente a la nota, donde hoy se copia `oficial`), `web/lib/cuerpo.js` línea 47 (`tieneRespaldo`: sin sumar `fuenteSola` la página se pierde después, según `pierdeLaPagina`), y `CRITERIO-EDITORIAL.md` § 2 ("Nunca con uno solo; una fuente oficial alcanza sola… y una fuente sola marcada").
- Con qué fuentes: Agencia CyTA, CONAE, NASA en castellano, DW Ciencia y tecnología, MIT Technology Review en español, y (opcional) INTA Informa y SENASA. **No** Infobae ni Clarín ni TN.
- Cupo: Tecnología sigue en 8 a la vez (`CUPO_DE_AFUERA`); con las seis de arriba salen entre 3 y 5 por día (estimación a partir de 72 horas de muestra: unas 6 notas por día de las cinco primeras, unas 12 si se suman INTA Informa y SENASA, antes de pasar por la IA y el cupo).
- Prueba: un caso real por fuente (las 3 de los Nobel de CyTA), y otro que muestre que una nota de Infobae sola sigue sin pasar.

**C2. Palabras de ciencia para la sección.** Hoy `REGLAS_SECCION.Tecnología` sólo tiene IA, robots, SpaceX, astronomía, exoplaneta… Sumar con cuidado (las ambiguas a `PALABRAS_DEBILES`): `conicet`, `científicos`, `investigadores`, `fósil`, `paleontólog`, `descubrimiento`, `telescopio`, `agujero negro`, `microplásticos`, `neandertal`. Prueba con el caso real de cada palabra.

**C3. La lectura con IA sabe que importa.** Una línea en `ingesta/perfil-balcarce.md`: "la ciencia argentina (CONICET, INTA, CONAE, universidades) y la IA aplicada al campo le importan a Balcarce; las guías de uso de celulares, las ofertas y los rumores de gadgets no".

**C4 (opcional, para IA).** Que 2 o 3 medios grandes sin marca (Infobae Tecno, La Nación Tecnología) pasen **con un solo medio sólo cuando el título dice IA/OpenAI/ChatGPT/Gemini/Anthropic y la lectura con IA dice que es noticia y no guía**, con un tope de 3 por día. Arriesga más (de las 162 de hoy, a ojo unas 4 de cada 10 eran noticias; el resto, guías, ofertas y explicaciones). Dejarlo para después de ver C1 funcionando una semana.

## 5. Dos huecos de seguridad que encontré (hay que decidirlos antes de abrir nada)

Los medí con el semáforo tal cual está. **No los toqué** (la lista roja y el semáforo no se tocan sin preguntar):

1. **"Interceptaron a un menor que circulaba en una moto con pedido de secuestro"** (Radio Gabal, hoy) salió **verde**. La lista amarilla frena "un menor de", "el menor de"… pero no "un menor que". Es un menor en un hecho policial. Sugerencia: sumar al amarillo "un menor que", "una menor que", "los menores" y "dos menores" (y confirmarlo con una prueba).
2. **"Horror en Rosario: dos delincuentes entraron a robar a una casa, golpearon a una mujer y abusaron de ella"** (TN) da **sin ninguna palabra sensible**. La lista roja tiene "abusó sexualmente", "abuso sexual", "violación"… pero no "abusaron de ella" ni "abusó de su expareja". Hoy no llega porque lo de afuera se corta antes; el día que se abra algo de Policiales de afuera, pasaría. Sugerencia: sumar al rojo "abusaron de", "abusó de una", "abusó de su" (revisar contra "abuso de poder").

Cualquiera de las dos propuestas de P1 o P2 depende de que esto esté resuelto.

## 6. Dónde encajar Ciencia e IA (propuesta de menú; es un cambio visible del sitio)

**Opción A (recomendada): renombrar la sección a "Ciencia y tecnología", sólo la etiqueta.** Se mantiene la clave interna `Tecnología` y la dirección `/tecnologia` (nada cambia para Google ni para las notas ya publicadas); sólo cambia lo que se lee en el menú, la portada y las placas.
- A favor: no rompe direcciones ni los 1.131 archivos guardados; avisa qué hay adentro; deja crecer ciencia dentro de una sección que ya existe; cuesta 1 o 2 horas (un campo `etiqueta` en `SECCIONES`, `web/lib/datos.js` línea 444, el menú y las placas).
- En contra: el nombre es largo en el menú del celular; y si ciencia y gadgets crecen mucho, se mezclan.

**Opción B: sección nueva "Ciencia".** Doce secciones.
- A favor: identidad propia; separa los gadgets de lo científico.
- En contra: hoy no tendría contenido (7 notas de tecnología en 14 días, menos las de ciencia); cuesta cambiar `SECCIONES`, colores (`--s-*`, `COLOR_SECCION`), `REGLAS_SECCION`, la lectura con IA (`SECCIONES_DE_LA_FICHA`), el panel (`SECCIONES` de `web/public/panel/github.js`), el criterio ("las secciones son once"), la regla de las tres notas por sección y 8 archivos de pruebas que nombran "Tecnología". Una sección vacía se nota.

**Opción C: no tocar el menú**, sólo sumar fuentes (C1 a C3). Lo más barato, pero el nombre "Tecnología" no atrae al lector de ciencia.

**Recomendación:** A ahora y revisar B cuando haya al menos 1,5 notas de ciencia por día durante dos semanas seguidas.

## 7. Cuánto cuesta cada cosa

| Cambio | Trabajo de código | Riesgo | Necesita decisión de ustedes |
|---|---|---|---|
| Resolver los 2 huecos (sección 5) | Chico (2 listas + 4 pruebas) | Bajo | **Sí** (lista roja) |
| P1 Policiales de servicio | Mediano (1 función, 1 número, 1 feed, 6 pruebas) | Bajo, si va con los huecos resueltos | Sí (criterio) |
| P2 Soltar "detenido" con atribución oficial | Mediano | Medio | **Sí** (semáforo) |
| P3 Pestaña "Policiales para revisar" | Mediano (panel) | Bajo | No |
| C1 Fuente sola | Mediano (5 archivos + pruebas) | Medio | Sí (cambia "nada con un solo medio") |
| C2 Palabras de ciencia | Chico | Bajo | No |
| C3 Perfil de Balcarce | Mínimo | Bajo | No |
| Reactivar La Nación Tecnología | Mínimo (`activa: true`) | Ninguno | No |
| Opción A de menú | Chico | Bajo | Sí (cambio visible) |

## 8. Cómo se midió (para repetirlo)

- Datos publicados: `web/data/notas-por-dia.json`, `archivo.json`, `portada.json`, `celular-decisiones.json` y el historial de git de `portada.json` (cada ~90 minutos del 1 al 15/10; 249 muestras, 565 notas distintas "esperando").
- Lo de hoy: `npm run auditar` y una réplica de la ingesta sin IA (los mismos feeds, el mismo cruce y el mismo semáforo) del 15 y 16/10. Los números varían ±5 % entre corridas por la memoria del cruce.
- Lo que **no** se pudo medir: cuántas notas de Policiales se descartaron en cada uno de los 14 días (el sistema no guarda el historial de lo que se frena, sólo lo que espera a una persona en ese momento). Convendría guardar un contador diario por sección y motivo (`web/data/notas-por-dia.json` ya tiene la estructura).
- Las fuentes se probaron el 16/10/2026 entre las 10 y las 13 (hora de Balcarce). Los scripts de medición están en la carpeta temporal de la sesión, no en el repositorio.
- Licencias: sólo está verificado que `argentina.gob.ar` dice Creative Commons Atribución 4.0 y que DW declara su copyright en el feed. El resto, "a confirmar" en el JSON. Regla general que se mantiene: resumen y cita, nunca el texto completo.
