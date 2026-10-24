# Auditoría 2.0 · Módulo C: redes sociales

*Escrita el 24/10/2026, solo lectura (no se tocó código). Mirado: `redes/`, `reels/`, `CRITERIO-REDES.md`, `docs/redes/` y los datos reales de `web/data/` (`redes.json`, `estadisticas-piezas.json`, `portada.json`, `archivo.json`, `celular-decisiones.json`) del 21/09 al 23/10. Los números de abajo salen de esos archivos, no de los documentos.*

## Resumen en 10 líneas

1. Las redes **cumplen lo que prometen en cantidad**: 6 piezas con voz por día casi sin faltas desde el 30/09 (se perdieron el repaso de la mañana del 22/10 en las dos redes, y unas pocas historias de Instagram) y **5 posteos de notas por día todos los días desde el 5/10** (salvo el 11/10, que no hubo ninguno).
2. Pero el **alcance de lo que más se publica es casi cero**: los 98 posteos de notas medidos en Facebook sumaron **265 personas** (menos de 3 por posteo); sus espejos en Instagram, 566 vistas; los 92 reels de Instagram, 753 vistas (mediana 6).
3. **Lo único que anda es un reel en Facebook**: el clima de la mañana (7:00) tiene mediana de **3.050 reproducciones**; sumó unas 71.000 de las 94.500 que dieron todos los reels de Facebook. Los repasos rondan 230, el de la noche (21:00) mediana de 6.
4. Los **5 posteos por día se agotan a media tarde** (último posteo, mediana 16:36): la franja de 17 a 22 queda vacía aunque el código la permite hasta las 22.
5. **Política y Policiales de Balcarce no salen nunca** a ninguna red: nadie las autorizó (`celular-decisiones.json → redes` está vacío) y **no hay cola ni aviso**: no están "trabadas", están invisibles. Hoy hay hasta 6 notas de Política de acá por día, con puntaje alto (la de OSeBal, 88; el Concejo, 78).
6. La guarda de "Política espera a una persona" es **por etiqueta de sección, no por tema**: notas de política dura clasificadas como Economía o Argentina sí salen solas a Facebook (Milei con 38 medios, Pueblos originarios frente a la casa de Cristina, el análisis del Financial Times).
7. **El bug de las frases cortadas del repaso es real** (`primeraOracion`, `redes/elegir.mjs`): corta en "Dr.", "Sr.", "Av.", "Luis A.", "J.P." y la voz lee "…en la sala Dr." Es poco frecuente (7 de 1.267 bajadas con frase), pero se oye mal y el arreglo es chico y seguro.
8. Si falla Instagram, **Facebook también se pierde** ("si la red que manda falla, no se intenta en las otras"): el 22/10 el repaso de la mañana no salió en ninguna de las dos, y es Facebook donde está la gente.
9. **Lo que se mide no alcanza para decidir** la prueba del 5/11: las historias de Facebook siguen dando 0 o vacío (la "medición arreglada" de la regla 207 no se ve en los datos) y las de Instagram dicen "menos de 5 personas".
10. Los números mágicos (75, 62, 80, 5, 10, 90 min, 8 h) están explicados en `docs/CATALOGO-DE-NUMEROS.md` pero no en el código, **dos están duplicados** (posteos por día y cupo de voz) y hay bastantes restos viejos (`texto-por-red.mjs` para 7 redes sin cuenta, `MOTIVOS_DE_RELLENO` con "pasó el cupo", nombres `noticia1/noticia2/podcast`).

## Qué sale, de dónde sale y si es coherente con la web

| Texto | Qué dice | De dónde sale | ¿Coherente? |
|---|---|---|---|
| Posteo de nota (FB; espejo IG) | `textoRedes` (la IA, verificado) o titular + bajada; línea del enlace rotativa; `#Balcarce #RadarBalcarce` + hasta 3 | `mensajeDeNota`, `hashtagsDe` (`elegir.mjs`) | Sí. Mismo título que la web. En IG: "link en la bio" y crédito de la foto al final. |
| Qué nota va | Balcarce con puntaje 75+ (o "muy contada de acá" de 3+ medios locales) y lo de afuera con **5+ medios** | `vaAFacebookPorLoQueEs`, `esPopularParaRedes` | Parcial: la web publica lo nacional con **3** y lo muy contado con **8**; las redes piden **5**. Es una tercera vara, documentada en la regla 280, pero con otro nombre. |
| Pie de reel | Titulares con viñetas, un solo enlace a la nota del repaso (FB), `Voz generada con inteligencia artificial.`, hashtags | `pieDePieza` (`piezas.mjs`) | Sí. Los titulares son los ya publicados. |
| Guion de voz del repaso | Saludo de la hora, intro, 4 notas con conectores, cierre, "Radar Balcarce punto com" | `armarPodcast`, `repasoConPresupuesto` (`guiones.mjs`, `elegir.mjs`) | Sí con `CRITERIO-REDES.md` § 3. La frase de contexto sale del copete: ahí está el bug. |
| Clima, farmacia, útiles, agenda, feriado | Guiones fijos con semilla de fecha | `guiones.mjs` | Sí. La farmacia calza con la web; el cierre con dirección 1 de cada 3 días se cumple por código. |
| Control de texto (`revisarTexto`) | Prohíbe ".ar", nombre de medio, "en vivo", exclamaciones, tuteo | `guiones.mjs`, llamado desde `reels/plan.mjs` | **Solo avisa**, no frena (ver H-10). |
| Informe diario 8:15 y 21:15, avisos | Qué se publicó, qué espera, redes, visitas, salud | `informe-diario.mjs`, `avisos.mjs`, Worker del vigilante | Sí. Usa `CONTRATO_DIARIO` y sabe decir "sin lectura confiable". No cuenta cuánta política/policiales de acá quedó fuera de las redes. |
| WhatsApp (CallMeBot) | Avisos al dueño del número | `whatsapp.mjs` | Todavía cableado en 6 workflows con sus secretos, pero los informes salen por mail (ver H-12). |

**Verificación de las reglas pedidas.** Nunca se nombra la fuente en redes (se cumple en los textos revisados). Policiales y Política de afuera: no salen. Policiales y Política de Balcarce: no salen. Fútbol de afuera sin argentinos: los repasos del 24/09 al 16/10 sí los contaban (Inter-Parma, Cristiano, Laporta); desde la regla 280 (17/10) los repasos son casi 100% de acá (único de afuera después del 17/10: Colapinto, 27 medios). Los repasos y los posteos **no se repiten entre sí desde el 23/10**; hasta entonces, **89 de unas 310 notas contadas en repasos también habían salido como posteo** en Facebook.

## Cuántos posteos por día: documentado vs. real

| Cosa | Documentado | Real (libro `redes.json`) |
|---|---|---|
| Posteos de nota en Facebook | "hasta 5 por día, cuando hay una nota fuerte" | **5 por día** todos los días desde el 5/10 (antes: 5 en 6 de 11 días; 1 a 4 los otros), **0 el 11/10** (no hay explicación en el libro); 137 en total. Eso es el tope, no una selección: nunca hubo un día de "no hay nada". |
| Horario | 8 a 22, 90 min entre uno y otro | Del 1 al 23/10: 8 h: 7, 9 h: 14, 10 h: 13, 11 h: 9, 12 h: 11, 13 h: 11, 14 h: 11, 15 h: 15, 16 h: 7, **17 a 20 h: 9 en total**. Último posteo del día: mediana 16:36. |
| De Balcarce / de afuera | "sólo Balcarce y lo más contado del país" | 103 de acá, 14 de afuera (12 %). Tres dudosas desde el 17/10: Haaland con el mate (18/10, la lista actual dice 3 medios, menos de los 5 pedidos: **para revisar**), Fito Páez saluda a Charly García (23/10, 5 medios, puntaje 41, farándula) y el Financial Times (política económica). |
| Reels / historias | 3 repasos + 2 climas + farmacia + extras, tope de 8 historias | Se cumple. Días con faltas desde el 30/09: 22/10 repaso mañana (IG y FB, error 400 de Instagram), 11/10 repaso tarde, 12/10 farmacia (feriado). Historias de IG de un repaso perdidas: 6 días. |
| Cupo de voz | 10 audios por día; un día normal usa 7 a 9 | Coincide con el cronograma: 7 fijos (3 repasos, 2 climas, farmacia, efeméride) y 8 los días con Participá, agenda, útiles o feriado. Margen de 2 para reintentos: justo. |

**Qué pasa cuando no hay nada que cumpla el mínimo.** `elegirParaFacebook` devuelve vacío y no se publica nada; el contrato del día acepta menos de 5 si "no había candidatas" y avisa solo si había candidatas y no salieron. Es el comportamiento correcto, pero **nunca se probó en la realidad** porque siempre sobran notas. El relevancia 75 casi no limita en días normales (12 de las 20 notas de acá que salen solas en la portada de hoy lo pasan) y, como el puntaje **baja con las horas**, lo que importa es a qué hora pasa el reloj. Los repasos tienen su propio piso (62 de acá, 80 de afuera; la noche, 0 de acá): con nacionales en torno a 40 a 60 de puntaje, el 80 de afuera **deja afuera casi todo lo nacional aunque lo cuenten 24 medios** (el papa: 24 medios, puntaje 61).

## Lo que se mide y lo que no

**Se mide bien:** piezas publicadas por día y por red (libro y contrato), fallas con motivo (`problemas`), vencimientos (dominio, voces 29/09/2027), claves de IA, cupo de voz, visitas a la web.

**Se mide mal o no se mide:**

- Historias de Facebook: la mayoría vacías y las pocas que traen un valor dicen 0 (en los repasos, 23 de 63 con valor, todas en 0).
- Historias de Instagram: la mitad "menos de 5 personas" y la otra mitad vacías.
- No hay **ninguna medida del vínculo posteo → visita a la web** en el informe (hay UTM, pero el informe no las cruza con las notas).
- No se cuentan los **intentos** de subida ni cuántas veces se reintentó una pieza.
- No se mide cuánta política/policiales de acá quedó **fuera** de las redes por la regla.
- No se mide el seguimiento de la cuenta (seguidores) por día, que es lo que explicaría estos alcances.

## Tabla de hallazgos

| # | Qué | Dónde | Problema | Sev. | Propuesta |
|---|---|---|---|---|---|
| H-1 | Alcance casi cero de posteos de notas y de todo Instagram | `redes.json`, `estadisticas-piezas.json` | 98 posteos FB = 265 personas únicas (2,7 por posteo, de acá y de afuera iguales); 98 fotos IG = 566 vistas; 92 reels IG = 753 vistas. La estrategia "5 por día" no está trayendo gente. | Alta | Decisión del dueño D-1. |
| H-2 | Un solo producto concentra el alcance: reel de clima de la mañana en Facebook | idem | 71.000 de 94.500 reproducciones de reels de FB (mediana 3.050, picos de 25.097 el 11/10). Repasos: ~230. Clima de la noche: mediana 26. Repaso de las 21: mediana 6. | Alta (oportunidad) | Ver propuesta final. |
| H-3 | 5 posteos se agotan antes de las 16:36 | `FACEBOOK` en `ingesta/criterio.mjs`, `elegirParaFacebook` | Tope diario con salida cada 90 min desde las 8: de 17 a 22 casi no hay posteos, justo cuando más gente mira. | Media | Repartir el cupo por franja (por ejemplo 2 antes de las 12, 2 entre las 12 y las 17, 1 después de las 18). Un cambio de `elegirParaFacebook` con prueba. |
| H-4 | Política y Policiales de Balcarce: nadie autoriza, nada avisa | `elegir.mjs`, `web/public/panel/app.js`, `celular-decisiones.json` (`redes: {}`) | La regla se cumple. Pero la única puerta es que una persona abra "Publicadas" y toque "Mandar también a las redes": **no hay cola de candidatas, ni aviso, ni número en el informe**. Resultado real: cero notas de política de acá en redes, aunque tienen puntaje 63 a 88 y las cuentan 3 medios locales. | Alta | Decisión D-2. Lo seguro ya: sumar al informe diario y al celular una línea "N notas de Política/Policiales de acá habrían salido a redes". |
| H-5 | La guarda es por sección y no por tema | `SECCIONES_QUE_ESPERAN_PERSONA`, `esPopularParaRedes` | Política dura clasificada como Economía o Argentina pasa: "Milei afirma tener fondos…" (38 medios), "Pueblos originarios protestan frente a la casa de Cristina Kirchner", "El Financial Times publica un duro análisis sobre el plan económico". Contradice el espíritu de `CRITERIO-REDES.md` § 4.4. | Media | Decisión D-3. |
| H-6 | **Bug del repaso que corta frases** | `primeraOracion`, `redes/elegir.mjs` (línea ~532) | Corta en el primer punto seguido de espacio: "El Dr." / "la sala Dr." / "Luis A." / "el J.P." / "EE. UU." / "Juan M. Fangio". La voz lo lee tal cual. Medido: 7 casos en 1.267 bajadas con frase (0,5 %), pero un repaso por día lleva hasta 4. | Media | Arreglo seguro A-1. |
| H-7 | Si falla Instagram, Facebook no se intenta | `publicarPiezas`, `redes/publicar-piezas.mjs` (`i === 0 && !hecho → break`, `intentos = i === 0 ? 1 : 3`) | La red principal tiene **1 solo intento** por corrida y, si falla, se corta todo. El 22/10 (`Request processing failed`, 400) el repaso de la mañana no salió en ninguna red; el libro no dice cuántas veces se reintentó. Facebook es donde está el alcance (H-2). | Alta | Arreglo seguro A-2 (publicar primero en Facebook, o seguir con Facebook aunque falle Instagram) más contar intentos. |
| H-8 | La historia de un reel no se reintenta entre corridas | `publicar-piezas.mjs`, `reintentar.mjs` | 3 intentos en la misma corrida y listo; solo queda el botón "Reintentar" del celular. En 6 días del último mes faltó la historia de Instagram de un repaso. `INTENTOS = 3` está repetido en `reintentar.mjs` y `publicar-piezas.mjs`. | Baja | Aceptar o reintentar en la vuelta siguiente mientras dure la ventana (el video ya está armado, no gasta voz). |
| H-9 | La medición de historias no sirve para la decisión del 5/11 | `estadisticas-piezas.mjs` | FB: `total_video_views` en 0 o vacío (la corrección de la regla 207 no se refleja); IG: "pocas" (<5). La prueba "dónde sale cada pieza" se va a decidir con los reels, que sí miden, y con nada de historias. | Media | Decidir con los reels; para historias, dejar de insistir o medirlas por `post_id` y verificar un caso a mano. |
| H-10 | `revisarTexto` solo avisa | `reels/plan.mjs` (~línea 666) | Un titular con nombre de medio, con "!" o con "recuerda" ("Balcarce recuerda a Fangio", falso positivo de tuteo) no frena la pieza ni se corrige: solo `::warning::` en GitHub, que nadie lee a las 10 de la mañana. | Baja | Convertir en bloqueo solo "nombra un medio" y ".ar"; quitar "recuerda" de la lista de tuteo. |
| H-11 | Números mágicos | `ingesta/criterio.mjs` | 75, 62, 80, 5, 8 h, 3 h, 90 min, 15 min sin comentario en el código (el porqué está en `CATALOGO-DE-NUMEROS.md`, que recomendó 62 y 70 y no se aplicó). Duplicados: `FACEBOOK.porDia` y `CONTRATO_DIARIO.posteosPorDia` (5), y `AUDIOS_POR_DIA` (`reels/cupo-voz.mjs`) y `CUPO_DE_VOZ_POR_DIA` (`redes/cronograma-semana.mjs`) (10). Si se cambia uno, el contrato avisa que "falta" algo que ya no se espera. | Media | Arreglo seguro A-4. |
| H-12 | Restos viejos | varios | `redes/texto-por-red.mjs` (233 líneas para Threads, X, Telegram, Bluesky, TikTok, YouTube y WhatsApp, sin cuenta ni publicación, con `verificado: false`); `MOTIVOS_DE_RELLENO` en `avisos.mjs` ("pasó el cupo": los cupos se sacaron el 17/10); comentario de `contrato.mjs` ("relevancia 75 o más"); nombres de pieza `noticia1/noticia2/podcast` (`podcast` es el repaso de la noche) en el libro, la voz y las estadísticas; CallMeBot con secretos en 6 workflows cuando los avisos salen por mail; Graph API `v23.0` fija con métricas de historias en `v25.0`; `CRITERIO-REDES.md` con fecha 17/10 y "nota fuerte de Balcarce" (ya son 5 por día sin condición). | Baja | Decisión D-5 y arreglo A-5. |
| H-13 | Tres "populares" distintos | `POPULARIDAD` (3), `FACEBOOK.mediosParaRedes` (5), `MUY_CONTADA` (8), `relevanciaAfueraPodcast` (80) | Para el lector, "lo más contado" cambia según dónde lo vea. Para los repasos, 5 medios **y** puntaje 80 deja afuera a casi todo. | Media | Decisión D-4. |
| H-14 | Repetición entre formatos hasta el 23/10 | `elegirParaFacebook`, `repasosDelDia` | Corregido el 23/10 en las dos direcciones (tres días). No hay medida todavía de cuántos repasos quedan con menos de 4 por esto: 24 de 87 ya tenían menos de 4. | Baja | Mirar dentro de una semana. |
| H-15 | Todo igual a todas las horas | `piezas.mjs` | El repaso de las 21 en Facebook (mediana 6) y el clima de las 20 (mediana 26) no andan; los de 10 y 15 (250) sí. | Media | Decisión D-1 (horario). |

## Decisiones para el dueño (con recomendación)

**D-1. ¿Qué hacemos con los posteos de notas y con Instagram, que casi no alcanzan a nadie?**
Hoy cuestan cero de plata, pero 98 posteos dan 265 personas. Opciones: (a) seguir igual; (b) bajar a 3 por día y concentrar en 12 a 20 h; (c) probar un mes con el cupo repartido en franjas (H-3). **Recomiendo (c)**, y medir Instagram aparte: si en un mes las fotos de IG siguen en 5 vistas, apagar el espejo (`instagramFeed`) y dejar la cuenta solo para reels. No tocar los reels.

**D-2. ¿Quién autoriza Política y Policiales de Balcarce hacia las redes?**
Hoy no las autoriza nadie y nada recuerda que existen. Opciones: (a) dejarlas afuera para siempre y decirlo en el criterio; (b) una persona las mira desde una cola con aviso; (c) dejar que salgan solo las **de política local con 3 o más medios locales** (por ejemplo, Concejo Deliberante, denuncias al municipio) con un texto fijo y sin nombres, y dejar Policiales siempre con persona. **Recomiendo (b)**: una lista diaria de 3 a 5 candidatas en el celular con el botón "Mandar a redes", porque es lo más importante del día en Balcarce y hoy no sale nunca. (c) cambia la regla de oro y se pregunta aparte.

**D-3. ¿La guarda de Política va por sección o por tema?**
Recomiendo **por tema**: que una nota de afuera con nombre de político, gobierno, partido o justicia en el título espere a una persona aunque esté en Economía o Argentina. Se aplica con una lista corta de palabras (como `REGLAS_SEMAFORO`) y una prueba con las tres notas de arriba. Si no se quiere, dejar escrito en `CRITERIO-REDES.md` que "Política" es solo una etiqueta.

**D-4. ¿Unificamos "popular"?**
Recomiendo para redes: lo de afuera **entra si lo cuentan 8 o más medios** (la barra de "muy contada", ya medida en la regla 197) y se saca el puntaje 80 de los repasos (el `CATALOGO` ya lo proponía). Así hay dos números en todo el sistema (3 para publicar, 8 para destacar) y no tres. Subir de 5 a 8 baja los posteos de afuera de 12 % a casi nada; es lo que dijo Hernán ("más de 8 fuentes debería ser algo súper relevante").

**D-5. Retiro de lo que no se usa.**
Recomiendo dejar `texto-por-red.mjs` y sus pruebas guardados en `docs/historico/` (viven en git) hasta que exista una cuenta de Telegram o Threads, y sacar CallMeBot de los 6 workflows si el mail alcanza. No hay apuro; es limpieza.

## Arreglos seguros (no cambian lo que se decide, solo se ve mejor o falla menos)

- **A-1. `primeraOracion`**: no cortar si el punto sigue a una abreviatura (`Dr|Dra|Sr|Sra|Srta|Av|Lic|Ing|Prof|Gral|Cnel|Pte|Pdte|EE|UU|Hnos|Cía|Sta|Sto|N°|Nº|etc|aprox|vs`) o a una sola mayúscula (iniciales: `Luis A.`, `J. M.`). Si la oración termina en una abreviatura, buscar la siguiente. Prueba con los siete casos reales de arriba. Está en la sección "Cosas que muerden" del criterio de redes: documentarlo ahí.
- **A-2. Que Facebook no dependa de Instagram**: en `publicarPiezas`, si la red principal falla, seguir con las demás y dejar el problema anotado; y contar `intentos` en el problema del libro (`registrarProblema`) para que el informe diga "intentó 3 veces". Esto es lo que habría salvado el repaso de la mañana del 22/10 en Facebook.
- **A-3. Línea nueva en el informe diario y en el celular**: "N notas de Política/Policiales de Balcarce con puntaje alto no salen a redes (esperan decisión)", leyendo `portada.json` con las mismas funciones de `elegir.mjs`. No cambia nada de lo que se publica.
- **A-4. Un solo lugar para los números repetidos**: `CONTRATO_DIARIO.posteosPorDia = FACEBOOK.porDia` y `CUPO_DE_VOZ_POR_DIA = AUDIOS_POR_DIA`, con una prueba que falle si divergen; sumar un comentario de una línea con el porqué de 75, 62 y 80 (hoy solo está en el catálogo).
- **A-5. Restos**: quitar "pasó el cupo" de `MOTIVOS_DE_RELLENO`; corregir el comentario de `contrato.mjs` ("relevancia 75 o más"); actualizar fecha y texto de `CRITERIO-REDES.md` (hasta 5 por día, sin "cuando hay una nota fuerte"); renombrar en un comentario, no en el libro, `noticia1/noticia2/podcast` = repaso de la mañana, la tarde y la noche.
- **A-6. `revisarTexto`**: sacar "recuerda" y "sabes" de la lista de tuteo cuando aparecen dentro de un titular (usar solo en el texto fijo); no tocar el resto sin D-3.

## Propuesta corta: qué publicar en reels y con qué noticias empezar

**Lo que dicen los datos.** En Facebook los reels andan (94.555 reproducciones en 107 reels); en Instagram, no (753 vistas en 92). El clima de la mañana trae 15 veces más que cualquier otra cosa (3.050 de mediana contra 230); los repasos, Un día como hoy, Participá, útiles y farmacia dan todos entre 210 y 290; el clima de la noche y el repaso de las 21 casi no se ven. Esto se mide con un solo mes de datos y mucha dispersión (el 11/10 el clima dio 25.097 y el 10/10 dio 473): sirve para decidir hacia dónde probar, no para asegurar nada.

**Propuesta, en tres pasos y sin gastar un audio más del cupo:**

1. **Dejar el clima de las 7:00 como ancla y no tocarlo.** Es el único formato que llegó a miles. Cambiarle el cierre para que lleve **una sola noticia de Balcarce del día** ("Y hoy en Balcarce: …") con 5 a 8 segundos más. Es la forma más barata de llevar gente a la web desde el reel que ya miran. Mismo audio, mismo cupo.
2. **Mover el repaso de las 21:00 a las 19:30 o 20:00 para Facebook** (hoy mediana 6) y probar 4 semanas: si no sube, sacarlo y usar ese audio para un segundo clima en horario de pico (por ejemplo "cómo amanece mañana" a las 22) o dejarlo de reserva del cupo.
3. **Con qué noticias empezar los repasos** (los de 10 y 15, que sí se ven): primero lo de Balcarce que cuentan **3 o más medios de acá** (`muyContadaDeAca`), que ya tienen puntaje 86 a 97 y están al frente. Con los datos de hoy: Juegos Bonaerenses (medallas de Nazareno Ramirez Bazan, 97; María Elena Luro, 88; Cipriano Higuera, 78), la Estudiantina (94), el Instituto Adventista con sus 40 años (93), la licitación del Microestadio del CEF 119 (92) y el Turismo Special de la Costa en el Fangio (100). Lo único de afuera que justifica entrar: lo que toque la identidad de Balcarce (Colapinto con 27 medios, puntaje 89) y lo que cuenten 8 o más medios. **Política de acá**, si se resuelve D-2, entra desde la segunda nota y no abre.

Con esto el reel gana lo que ya funciona (el clima) y se prueba, sin gasto nuevo, qué hace falta para que una noticia de acá alcance a más gente.
