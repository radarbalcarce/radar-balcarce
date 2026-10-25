# 04 · La IA y los modelos (auditoría para Radar 2.0)

*16/10/2026. Lo armó Claude leyendo el código, los datos de `web/data/` y su historia en git, y las pruebas de
`pruebas-modelos/`, `docs/etapa-2-5/` y `docs/etapa-10-operacion/`. No se tocó código ni datos, no se commiteó
nada y no se llamó a ninguna IA (cero cupo gastado). Lo que dice "medido" sale de los archivos; lo que dice
"estimado" es una cuenta, y los precios hay que reconfirmarlos antes de cargar crédito.*

---

## Resumen en 10 líneas

1. Hoy hay **9 usos de IA en marcha**. Casi todos van con **Gemini Flash-Lite gratis**, con Groq de respaldo. Las voces van con Gemini TTS y las ilustraciones con Workers AI. El **verificador no es IA**: es código.
2. **Sólo se mide la redacción**: 196 pedidos el 16/10, con 7 errores. La lectura, las repetidas, las fotos, las voces y las pistas no anotan cuánto gastan. Es lo primero que hay que arreglar.
3. **La detección de repetidas con IA se queda sin cupo a media tarde.** El 16/10 llegó a su tope de 60 vueltas a las **15:06**: de ahí a la medianoche no se miró nada con IA. El 15/10 pasó lo mismo a las 22:13.
4. Las repetidas son **el problema más grande medido**: 76 copias de más publicadas, 57 de ellas de Balcarce (el 8,7 % de lo de acá).
5. La solución probada para las repetidas es **la huella de significado `bge-m3`** (más un juez barato que confirma los pares). Bajó un 27 % las historias repetidas. **Workers AI tiene `bge-m3` y entra en las neuronas gratis que ya pagan**: cuesta US$ 0.
6. Para **clasificar y seleccionar**, Mercury Decide y Jev deciden casi igual que Gemini (93–94 % de acuerdo) y cuestan **~US$ 1 por mes**. La ganancia real no es la calidad. Es que dan **la probabilidad de cada respuesta**, liberan cupo de Google y no dependen del regalo de Google.
7. **Recomendación**: primero las repetidas con `bge-m3` en Workers AI (gratis). Después Mercury Decide para la ficha, **en sombra** (corre al lado de lo de hoy sin cambiar nada) una semana. Jev sólo como segunda opinión en lo dudoso. Gemini queda siempre de respaldo.
8. **Errores publicados**: de 156 correcciones a mano, la mitad fueron **notas sin cuerpo** (Gemini sin cupo). Después vienen letras rotas, sección equivocada, títulos mal armados y **exageraciones** ("aprueba" cuando sólo pidió estudiar). El verificador no ve las exageraciones, porque las palabras sí están en la fuente.
9. **Hallazgo urgente**: desde el 8/10 la auditoría con IA corrigió sola **4 tildes, y las 4 están mal** ("entretíempo", "paráte", "vigésimoctava", "Sanjuán"). Conviene apagar esa corrección automática o limitarla a una lista cerrada.
10. **Voces**: 10 audios gratis por día, y el plan normal usa 7 a 9. Pagar sale **~US$ 3 a 4 por mes** a precio estimado; con US$ 5 alcanza para unos 400 audios. Conviene cargarla con tope de gasto **en el mismo proyecto de Google donde viven las dos voces propias**, y sumar un contador de audios en el código.

---

## Palabras que aparecen

- **Modelo**: el programa de IA que contesta (Gemini, Mercury, Jev…).
- **Clave**: la contraseña con la que el robot usa un modelo. Cada clave de Google tiene su propio cupo.
- **Cupo**: cuántos pedidos gratis da el proveedor por día o por minuto. "429" es el error de "sin cupo".
- **Token**: un pedacito de texto (3 o 4 letras). Se cobra por millón de tokens.
- **Ficha**: lo que la IA dice de cada nota que entra: sección, si es de acá, si interesa, si se publica.
- **Modelo de decisión**: no escribe; contesta preguntas con opciones fijas y da la probabilidad de cada una (Mercury Decide, Jev).
- **Huella de significado (embedding)**: una lista de números que resume de qué habla un texto. Dos notas del mismo hecho quedan "cerca" aunque usen otras palabras. `bge-m3` es el modelo que la calcula.
- **Workers AI**: los modelos de IA que corren dentro de Cloudflare. Con el plan Workers Paid, que ya pagan, vienen **10.000 "neuronas" gratis por día**; una neurona es la unidad en que Cloudflare cobra.
- **OpenRouter**: un intermediario que da acceso a muchos modelos con una sola cuenta y cobra 5,5 % al cargar crédito.
- **Modo sombra**: el sistema nuevo corre al lado del de hoy, sin cambiar lo que se publica, y se comparan las decisiones.
- **Zona gris**: notas en las que el modelo no está seguro (probabilidad de publicar entre 0,2 y 0,8).

---

## 1. Mapa de todas las llamadas a IA de hoy

"Gemini" es siempre `gemini-flash-lite-latest` (`MODELO_DE_TEXTO`, `reels/claves.mjs`), salvo donde se dice otro.
Según `docs/08-INFRAESTRUCTURA.md`, Google da **500 pedidos por día por proyecto y por modelo**. Como cada clave es
de un proyecto distinto, los cupos no se pisan entre claves. Desde el 16/10 "Actualizar la web" corre **~92 veces
por día** (antes 48), y eso acelera todo lo que se pide "por corrida".

| # | Qué hace | Modelo | Clave (respaldo) | Cuándo | Pedidos por día | Topes | Fallas vistas | ¿Se puede achicar o juntar? |
|---|---|---|---|---|---|---|---|---|
| 1 | **Ficha de lectura**: sección, de acá, interés, publicar (`leerGrupo`, `ingesta/lectura-ia.mjs`) | Gemini, 12 notas por pedido | CLASIFICACION (Groq `gpt-oss-120b`) | Cada corrida | **Medido: 66 a 138** (10 al 16/10). Unas 760 a 1.000 fichas por día | 5 por corrida, 200 por día | No se anota | **Sí**: pasarla a Mercury Decide libera ~140 pedidos por día de esa clave (§ 2) |
| 2 | **Repetidas**: agrupar notas que cuentan lo mismo (`agruparRepetidas`) | Gemini | CLASIFICACION (sin respaldo) | Cada corrida en que cambia la lista | **Medido: 38 a 60 vueltas**, de hasta 2 pedidos cada una (~80 a 120 pedidos) | 60 vueltas por día. **Se agotó el 15/10 a las 22:13 y el 16/10 a las 15:06** | No se anota | **Sí, es lo más urgente**: huella `bge-m3` + confirmar sólo los pares dudosos (§ 2) |
| 3 | **Parejas sospechosas** de un medio de acá (`confirmarParejas`) | Gemini | CLASIFICACION (Groq `gpt-oss-20b`) | Cuando aparecen | Pocas (contador `paresPedidosHoy`) | Por día | No se anota | Juntarla con la 2: hoy hay dos textos distintos de "mismo hecho" |
| 4 | **Redacción**: título, bajada, cuerpo, guion (`reescribir`, `reels/reescritura.mjs`) | Gemini, temperatura 0,6 | REDACCION → REDES (sólo con 429) → CLASIFICACION | Cada corrida | **Medido el 16/10: 196 pedidos para ~96 notas** (≈2 por nota), 1,43 M tokens de entrada (~7.300 por pedido), **7 errores (3,6 %)**; **22 cayeron a la clave de redes** | 40 por corrida, 450 por día, 3 intentos por nota | 7 el 16/10, 0 el 15/10 | **Algo**: el segundo pedido ("corrección obligatoria") duplica el gasto; la instrucción ocupa ~5.000 tokens por pedido |
| 5 | **Verificador** (`ingesta/verificar.mjs`) | **Ninguno: es código** | — | En cada redacción | 0 | — | — | Dejar: gratis, siempre da lo mismo |
| 6 | **Fotos de las fuentes**: elegir, descartar marca de agua y menores (`ingesta/fotos.mjs`); persona pública → Wikimedia | Gemini con visión | CLASIFICACION (Groq `qwen/qwen3.8-27b`, máximo 3 fotos) | Cada corrida | **No se anota**. Hasta 10 notas por corrida, 3 reintentos | Sin tope diario en código | No se anota | Ahorro gratis: la huella de imagen (dHash) antes de pedir, para no mandar fotos repetidas (7 % de las notas) |
| 7 | **Ilustrar notas sin foto** (`web/scripts/ilustrar-notas.mjs`): Gemini arma la idea → Workers AI dibuja (SDXL) → Gemini mira el resultado | Gemini (+ `gemini-flash-latest`) y SDXL en Workers AI | REDACCION y CLASIFICACION; Worker propio | 9 veces por día (reloj, cada 2 h) | Hasta 20 imágenes: ~40 a 60 pedidos de Gemini (estimado) y ~4.240 neuronas | 12 por corrida, 20 por día | No se anota | Bajar los reintentos: hoy son hasta 4 por clave (2 modelos × 2), 8 en total por imagen |
| 8 | **Auditoría con IA** de lo publicado (`ingesta/auditoria-ia.mjs`) | Groq `openai/gpt-oss-20b` | GROQ (sin respaldo) | Cada hora (:41) | **Medido: 527 notas en 14 días** (~38 por día, ~13 pedidos por día) | 12 notas por corrida, de a 3 | **3 fallas en 14 días** | Dejar el aviso; **cortar la corrección sola** (§ 3) |
| 9 | **Voces** de reels e historias (`reels/voz-gemini.mjs`) | `gemini-3.8-flash-tts`, dos voces propias | REDES (sin respaldo, a propósito) | Reloj de redes (:05, :35, :45) | 7 a 9 audios en un día normal | **10 audios por día** (Google). **El código no los cuenta**: sólo se entera con el 429 | Se reintenta hasta 4 veces y cada intento gasta un audio | Contar los audios en el código; seguir con las piezas fijas |
| 10 | **Pistas**: armar búsquedas y matices (`ingesta/pistas.mjs`) | Gemini | REDACCION → CLASIFICACION | Cada 3 h y desde el celular | 1 o 2 por pista | — | No se anota | Bien así |
| 11 | **Búsqueda web de pistas** (`ingesta/busqueda.mjs`) | Tavily (no es IA que escriba) | TAVILY | Pistas que salen solas y "Hacer la nota" | ~8 créditos por intento | 1.000 créditos por mes gratis; 2 por corrida | — | Bien así |
| 12 | **Panel del celular**: escribir o reescribir a pedido (`panel/celular.mjs`) | Gemini (el mismo camino de la 4) | REDACCION, REDES, CLASIFICACION | Cuando lo piden | Pocas | — | — | Bien así |
| — | Apagados en el código: foto de stock con confirmación (`foto-stock.mjs`) e ilustración con Gemini imagen paga (`foto-ia.mjs`, US$ 0,034 por imagen) | — | — | Apagados | 0 | — | — | Si en 2.0 no se usan, borrarlos |
| — | **No usan IA**: el vigilante (sólo pregunta si las claves andan, sin gastar), las efemérides (Wikipedia y Wikidata), los guiones de las redes (plantillas) | — | — | — | 0 | — | — | — |

### Lo que dice el mapa

1. **Casi todo el peso cae en la clave CLASIFICACION**: ficha (~140), repetidas (~80 a 120), fotos y la mitad de
   las ilustraciones. Es fácil que se acerque a los 500 pedidos de Google, pero **nadie lo sabe porque no se anota**
   (`PENDIENTES.md` ya tiene la tarea "enchufar el registro de uso").
2. **El tope de repetidas (60 por día) lo puso el código, no Google**, y con 92 corridas por día se agota a la tarde.
   Subirlo es un parche. Lo de fondo es no gastar un pedido de IA cada vez que cambia una nota en la lista (§ 2).
3. **22 pedidos de redacción cayeron a la clave de redes el 16/10.** No es grave hoy, porque son cupos de modelos
   distintos y no le comen audios a la voz. Pero **si esa clave pasa a ser paga, esos pedidos se cobran** (§ 4).
   Como el día no llegó a 500 pedidos, lo más probable es que fuera el tope por minuto.
4. **Una nota cuesta ~2 pedidos de redacción.** De 528 notas pedidas en 8 días (`intentos-ia.json`), **437 (83 %)
   terminaron con cuerpo**. 150 necesitaron más de un intento y 68 llegaron a 3 o más.
5. Groq es el respaldo de todo, pero **nadie sabe cuántas veces se usa**: `fichas.json` no guarda qué proveedor
   contestó.

---

## 2. Jev, Mercury Decide y Workers AI: qué se probó y qué conviene

### 2.1 Qué se probó (10 y 11/10, con crédito de OpenRouter de Andrés)

**Muestra**: 200 notas crudas de un solo día, 208 feeds, con 20 de "ruido" (horóscopo, quiniela, policiales de
afuera). **No hay una verdad revisada por personas**: se comparó contra lo que dice Gemini y las diferencias las
etiquetó Claude.

**Seleccionar (publicar o no, sección)** — `pruebas-modelos/comparacion-200.md`, `TRASPASO.md`:

| Modelo | Acuerdo con Gemini en publicar | En sección | Notas de Balcarce perdidas | Ruido que dejó pasar | Costo por mes (900 notas por día) |
|---|---|---|---|---|---|
| **Mercury Decide**, una nota por pedido | **94 %** | 79 % | **0** | 0 de 20 | **~US$ 0,9** (cuenta: 1.636 tokens por nota × US$ 0,02 por millón) |
| Mercury Decide, 12 por pedido | 89 % (publica de más) | 76 % | — | 2 de 20 | ~US$ 0,15 |
| **Jev 1.13**, 12 por pedido | **93 %** | 79 % | 1 (pádel) | 0 de 20 | **~US$ 1,1** (952 tokens por nota × US$ 0,042 por millón) |
| Jev 1.13, una por pedido | 93 % | 79 % | — | 0 de 20 | ~US$ 2,6 |
| OpenAI gpt-6-luna / Microsoft / Perplexity | 82–91 % | 69–77 % | 1 a 2 | 0 a 4 | US$ 2 a 6, y OpenAI se negó a contestar 3 notas |
| Gemini Flash-Lite (hoy) | referencia | referencia | 0 | 0 de 20 | **US$ 0** (gratis; ~US$ 4 si se pagara) |

- **Ojo con el 94 % de Mercury**: salió de la variante **gratis** (`:free`, que tiene tope diario). La variante paga
  se probó sólo de a 12, y ahí perdió precisión. Es el mismo modelo, pero **la paga, de a una, no está medida**.
- **Las probabilidades sirven**: con Mercury la zona gris fue el 7 % (14 de 200). Ahí discrepó con Gemini en el
  21 % de los casos, contra el 5 % en las seguras. Con Jev la zona gris fue de 73 notas: demasiada para el celular.
- Con 17 secciones, Mercury quedó más seguro (0,92) y Jev menos (0,85).
- **Mercury no da "por qué"**. Gemini sí, y hoy esa razón sirve en el panel.
- El error que comparten todos, Gemini incluido: publicarían "¡EN VIVO! minuto a minuto". Hoy lo frena una regla de
  código.

**Repetidas: ¿dos notas cuentan el mismo hecho?** (62 pares; 21 del mismo hecho) — `comparacion-pares.md`:

| Modelo | Aciertos | Junta hechos distintos (grave) | Costo por 1.000 pares |
|---|---|---|---|
| Gemini Flash-Lite | 97 % | 2 | gratis (US$ 0,14 si se pagara) |
| Mercury Decide (de a 1 o de a 12) | 95 % | 3 | US$ 0,004 a 0,008 |
| Jev 1.13 | 95 % | 3 | US$ 0,017 a 0,027 |
| OpenAI | 89–92 % | 4 a 5 | US$ 0,05 |

**El circuito completo** (`historias-estrella.md`, `duplicadas-significado.md`): 4.477 notas de 72 horas.

1. Huella `bge-m3` (US$ 0,004 por OpenRouter).
2. Los pares con parecido de 0,75 o más los confirmó Mercury de a 12 (US$ 0,054).
3. Se agrupó "en estrella": sólo entra lo confirmado contra la nota ancla, sin encadenar.

Resultado: quedaron **3.249 historias (27 % menos)**, y lo de los medios de Balcarce bajó de 75 a 56. **Sin el paso 3**
salían grupos de 126 notas que mezclaban hechos distintos.

**Lo que mide el análisis de la etapa 2-5 sobre lo publicado de verdad** (`docs/etapa-2-5/ANALISIS.md`):

- Hay **76 copias de más publicadas**, 57 de Balcarce.
- 32 pares están separados por más de 12 horas. 21 pares quedaron en secciones distintas.
- El problema es **entre corridas y contra lo ya publicado**, que es justo lo que hoy no se mira. La IA de
  repetidas sólo compara las notas de la corrida.

### 2.2 Qué ganan frente a Gemini gratis

| | Gemini gratis (hoy) | Mercury / Jev (OpenRouter, pago) |
|---|---|---|
| Calidad de la ficha | La referencia | Casi igual (93–94 %); en sección, a veces mejor (el Concejo es Política) |
| Probabilidad de cada respuesta | No | **Sí**: permite mandar al celular sólo lo dudoso de acá y descartar solo lo seguro |
| Cupo | 500 por día por clave; puede desaparecer (el 29/09 Google desactivó claves y no se publicó nada en 14 horas) | Sin cupo diario práctico (paga) |
| Velocidad | ~1,5 s por pedido | 0,1 a 0,6 s |
| Costo | 0 | ~US$ 1 a 3 por mes, más 5,5 % de comisión |
| Explica la razón | Sí | No |
| Depende de | Google | OpenRouter (API "alpha") y un proveedor chico |

**En resumen**, Mercury y Jev no clasifican mucho mejor. Lo que aportan es otra cosa:

- **la probabilidad**, que permite mandar al celular sólo lo dudoso;
- **un segundo proveedor**, para no depender sólo de Google;
- **unos 140 pedidos por día** que quedan libres en la clave de Google para fotos y repetidas.

### 2.3 Riesgos

- **Proveedores chicos**:
  - Inception (Mercury) y Typesafe (Jev) son empresas nuevas.
  - La API de decisiones de OpenRouter está en "alpha": puede cambiar de forma o desaparecer.
  - La documentación ya no coincidía con la respuesta real (`inputTokens` contra `input_tokens`).
- **Precios de promoción**: el análisis de la etapa 2-5 dice "0,9 (promo) a 1,8". Aun duplicado, es poco.
- **Variantes gratis con tope** (50 pedidos por día sin crédito, 1.000 con crédito): sirven para probar, no para
  producción.
- **Muestra chica y sin verdad humana**: un solo día, 200 notas, etiquetas de Claude.
- **Cómo se cubre**:
  - la misma pregunta con Gemini como respaldo (y Groq);
  - si no contesta ninguno, las reglas de código de hoy;
  - **la IA sólo puede endurecer** (nunca destrabar lo que el semáforo frena);
  - un tope de gasto en OpenRouter.

### 2.4 Workers AI de Cloudflare (ya pagan Workers Paid)

Hoy Workers AI sólo dibuja las ilustraciones: ~4.240 neuronas por día, estimadas, de las 10.000 gratis. Precios de
lista de Cloudflare que conozco (**reconfirmar en developers.cloudflare.com/workers-ai/platform/pricing**): US$ 0,011
cada 1.000 neuronas pasadas las gratis.

| Uso posible | Modelo en Workers AI | Volumen | Neuronas por día (estimado) | Costo | Veredicto |
|---|---|---|---|---|---|
| **Huella de significado para repetidas** | `@cf/baai/bge-m3` (~1.075 neuronas por millón de tokens) | 900 a 2.350 notas × ~300 tokens | **~300 a 800** | **US$ 0** (entra en lo gratis, junto con las ilustraciones) | **Sí, adoptar.** Es el mismo modelo que se probó por OpenRouter |
| Clasificar (la ficha) | `@cf/openai/gpt-oss-20b`, `@cf/meta/llama-3.1-8b-instruct-fast` y otros | ~1,3 M tokens de entrada por día | 13.000 a 29.000 | US$ 1 a 7 por mes | **No como principal**: no se probó, no da probabilidades y cuesta más que Mercury. Sirve como tercer respaldo |
| Visión para fotos (marca de agua, menor) | `@cf/meta/llama-4-scout-17b-16e-instruct`, `@cf/google/gemma-3-12b-it`, `@cf/mistralai/mistral-small-3.1-24b-instruct` | ~50 a 100 notas por día | 2.000 a 8.000 (muy incierto) | 0 a centavos por día | **Probar como respaldo** de Groq, que sólo acepta 3 fotos. Hace falta una prueba con ~30 fotos etiquetadas antes de confiar en lo de los menores |
| Voz | `@cf/myshell-ai/melotts`, Deepgram Aura (español) | — | — | Bajo | **No**: no hay voz rioplatense y rompe la regla de las dos voces propias. Sólo para una emergencia |

Para usarlo desde GitHub Actions alcanza un `fetch` a la API de Cloudflare con un token (ya existe
`CLOUDFLARE_API_TOKEN`, que usa `probar-flux`), o sumarle un `/huella` al Worker de imágenes. No hace falta
ninguna dependencia nueva, así que se respeta "`ingesta/` sin dependencias".

### 2.5 La recomendación, en orden

| Paso | Qué | Con qué | Costo por mes | Por qué en este orden |
|---|---|---|---|---|
| **1. Repetidas** | Huella `bge-m3` de cada nota; comparar contra **lo publicado en 72 h** (no sólo la corrida); los pares de 0,75 o más (y en lo de acá, desde 0,60) los confirma un juez; agrupar en estrella | **Workers AI** para la huella; juez: **Gemini gratis** (97 % en la prueba) mientras alcance el cupo, o **Mercury** de a 12 | **US$ 0** (con Mercury, < US$ 0,5) | Es el problema más grande medido, el más barato y el de menor riesgo: si falla, sale una repetida como hoy. Además saca de la clave de Google los ~100 pedidos por día que hoy se agotan a la tarde |
| **2. Ficha en sombra** | Mercury Decide pago, de a una nota, al lado de la ficha de Gemini durante 7 días. Guardar las dos respuestas y su probabilidad | OpenRouter, US$ 10 de crédito con tope | ~US$ 1 | Para medir lo que falta (la variante paga de a una) y fijar los umbrales 0,2 y 0,8 con datos reales |
| **3. Cambiar la ficha** | Si la sombra da bien: Mercury como principal, Gemini como respaldo. Lo dudoso de acá va al celular (3 a 6 por día, no 60). Lo dudoso de afuera lo decide Jev y, si no coinciden, no sale | Mercury + Jev | ~US$ 1,5 a 3 | Libera cupo de Google y suma un segundo proveedor |
| **4. Revisar antes de publicar** | Una pregunta de sí o no con probabilidad: "¿el título o la bajada afirman algo más fuerte, distinto o sin respaldo en la fuente?". Sólo en lo de Balcarce, Política, Policiales y lo que tiene números | Mercury o Jev (`noul`) | ~US$ 0,1 a 0,3 | Ataja el tipo de error que el verificador no ve (§ 3). **No está probado**: ver la prueba C |
| No hacer | Cambiar el modelo que redacta | — | — | No hay evidencia: el mejor de 17 modelos aprobó el 36 % al primer intento contra el 33 % de Gemini. Queda anotado el repuesto Gemma 4 26B (~US$ 8 por mes) si Google deja de dar Gemini gratis |

**Costo total de IA nueva para 2.0: ~US$ 2 a 4 por mes**, más las voces si se pagan (§ 4). Está muy por debajo del
tope de US$ 25 de los documentos de diseño.

### 2.6 Las pruebas que faltan para decidir (todas chicas y baratas)

- **A. Repetidas reales de Balcarce** (US$ 0 con Workers AI; < US$ 0,05 con Mercury).
  - Qué se hace: pasar por `bge-m3` y por los jueces los 127 pares de lo **ya publicado** que Claude etiquetó
    (`scripts/medir/etiquetas-duplicadas.json`: 84 del mismo hecho).
  - Por qué hace falta: los 62 pares de la prueba se eligieron porque compartían palabras, y los errores reales de
    acá son de otro tipo. "La Liga suspende la fecha" y "Jardín 905" tenían títulos distintos y salieron con 27 horas
    de diferencia.
  - Qué se mide: cuántos de los 84 encuentra la huella con umbral 0,60 y 0,75, y cuántos confirma cada juez.
- **B. Una verdad humana para la ficha** (30 minutos de una persona y ~US$ 0,02).
  - Qué se hace: Hernán o Andrés marcan en una planilla 100 notas de un día distinto ("¿la publicarías?" y la
    sección). Después se corren Gemini, Mercury pago de a una y Jev de a 12.
  - Por qué hace falta: hoy "94 % de acuerdo" quiere decir "94 % igual que Gemini", no "94 % bien".
- **C. Control de sentido** (< US$ 0,05).
  - Qué se hace: armar 40 casos con los errores reales de `correcciones.json` ("aprueba reducir", "2,9 % → tres por
    ciento", "1,5 millones contra 1,7", "se llenó el autódromo" cuando fue el estacionamiento) y 40 notas publicadas
    que estaban bien. Preguntarles a Mercury, a Jev y a Gemini.
  - Cuándo se adopta: si ataja 25 de los 40 errores y frena menos de 4 de las 40 buenas.
- **D. Fotos con visión** (US$ 0).
  - Qué se hace: 30 fotos etiquetadas a mano (con marca, sin marca, con un chico reconocible) comparadas entre
    Gemini, Groq y dos modelos de visión de Workers AI.

---

## 3. Calidad y control: cómo se sabe que lo que escribe la IA está en la fuente

### 3.1 Cómo se controla hoy

1. **Antes de pedir**, el semáforo lee también el texto completo de las fuentes. Si aparece un menor o una víctima,
   no se pide nada.
2. **Al recibir**:
   - `arreglarEscritura` corrige lo que no inventa (etiquetas, "este viernes" vencido, muletillas, tildes sueltas).
   - Después, **`verificar()` compara palabra por palabra contra todo lo que la IA recibió**: cada número, nombre
     propio, día y mes, cita textual y antecedente dicho como de hoy.
   - También revisa la forma: largo, delito sin atribuir, negación que aparece o desaparece, "en vivo", relleno,
     copia de más de 12 palabras, letras rotas, título en pasado y promesa del título que el cuerpo no cumple.
   - **Es código, no IA**: gratis, estricto y siempre igual.
3. **Si falla**:
   - se sacan las oraciones con problemas;
   - si no alcanza, hay un segundo pedido con la lista de errores;
   - si tampoco, se reintenta en otra corrida (hasta 3 veces).
   - Sin cuerpo de 70 palabras, la nota no sale.
4. **El nivel de verificación lo calcula el código**: una sola fuente con una acusación da BAJA y espera a una
   persona.
5. **Después de publicar**, la auditoría con IA (Groq) lee lo nuevo cada hora y avisa al panel.

### 3.2 Qué hizo rechazar el verificador (8 días, 528 notas, `intentos-ia.json`)

Las notas que no terminaron con cuerpo fueron 91 (17 %):

- **52 las frenó el verificador**. Los motivos más comunes:
  - **número que la fuente no trae: 18**;
  - copia: 12;
  - el cuerpo repite la bajada: 7;
  - nombre que no está: 5;
  - promesa del título: 4;
  - antecedente: 3;
  - relleno: 3.
- 16, el semáforo, por algo que escribió la IA.
- 13, verificación BAJA.
- 8, por falta de material.

Que el control de números sea el que más frena es buena señal: ahí es donde la IA más inventa.

### 3.3 Qué se corrigió a mano después de publicar (156 entradas de `correcciones.json`)

Casi todas son del 27 y 28/09 y del 15/10, en repasos que pidió Hernán.

| Tipo de error | Cuántas | Ejemplo real | ¿Lo ataja hoy un control? | Qué control lo atajaría |
|---|---|---|---|---|
| **Nota sin cuerpo** (Gemini sin cupo o rechazada); lo escribió Claude o el celular | ~76 (49 %) | "cuerpo escrito a mano: Gemini sin cupo" | Sí: sin cuerpo no sale (regla de 70 palabras) | No es calidad, es **cupo**: liberar la clave de Google (§ 2) y el respaldo con otra clave |
| **Letras rotas** de la IA | ~17 | "polêcutemica", "miéércoles", "Mart\u00inez" | **Sí** (control `forma`; los escapes cortados, regla 166) | Ya está |
| **Sección equivocada** | ~19 a 25 | La Selección en Deportes; el Concejo en Balcarce en vez de Política; el Chi Kung en Automovilismo | No | **Ficha con probabilidad** (Mercury dio mejor sección en el Concejo); reglas fijas para el Concejo → Política y la Selección → Fútbol |
| **Título mal armado** (cortado "en Balca", "en Balcarce" de más, dos lugares, en pasado, con etiqueta) | ~15 | "título cortado y terminado en 'en Balca'" | **Casi todo sí**, hoy (`titulo`, `pasado`, `sinBalcarceAlFinal`) | Ya está |
| **Exagera o cambia el sentido** | ~7 | "aprueba reducir" cuando el Concejo sólo pidió que se estudie; "tres por ciento" por 2,9 %; "un millón y medio" por 1,7; "se llenó el autódromo" cuando fue el estacionamiento; un cargo que la fuente no confirma | **No**: las palabras están en la fuente, pero el sentido no | **Control de sentido antes de publicar** (paso 4 de § 2.5, prueba C). Es el error más grave en lo que publica una IA |
| **Fecha relativa vencida o futuro de algo que ya pasó** | ~6 | "participan este viernes" leído el lunes; "se largará" una carrera ya corrida | En parte (`arreglarEscritura` cambia "este viernes" → "el viernes") | Comparar los verbos en futuro con la fecha de la fuente: es código |
| **El título promete y el cuerpo no cuenta** | ~4 | Sanción a Canapino que el cuerpo no explica | **Sí**, hoy (`promesa`) | Ya está |
| **Tildes** | ~4 | "Paris, inversion, energia…" | Sí (`tildes`, desde 3 palabras) | Ya está |

### 3.4 Qué encontró la auditoría con IA (14 días, `auditoria-ia.json` → contadores)

- **527 notas leídas** y **161 hallazgos**:
  - ortografía 106 (66 %);
  - texto roto 16;
  - título que no corresponde 14;
  - afirmación sin sostén 14;
  - sección 10;
  - sensible 1.
- **1 grave**, 7 descartados por citar algo que no estaba en la nota, 3 fallas.
- **Se corrigieron solos 25.**

Los hallazgos de "afirmación" y "título" (28 en 14 días, unos 2 por día) son el mismo tipo de error de la tabla
anterior, encontrados **después** de publicar. Conviene revisarlos en el celular y usarlos como casos para la
prueba C.

### 3.5 Hallazgo urgente: la corrección sola de tildes empeora las notas

`web/data/correcciones-auditoria.json` tiene 8 cambios automáticos:

- **Los 4 de antes de la regla 108 (8/10)**:
  - 2 estaban bien ("collar → colgar", "alemána → alemana");
  - 1 es discutible ("cultura empresaria → empresarial": "empresaria" es válido como adjetivo);
  - 1 cambió el tiempo verbal ("ordenado → ordenó").
- **Los 4 de después del 8/10, con la regla nueva de "sólo sumar una tilde", están todos mal**:
  - "entretiempo → **entretíempo**";
  - "vigesimoctava → **vigésimoctava**";
  - "parate → **paráte**";
  - "Sanjuan → **Sanjuán**" (un apellido).
- La web aplica estos cambios al armar cada nota mientras el texto siga igual (`conCambiosDeLaAuditoria`). **No
  pude confirmar si esas 4 notas siguen mostrando la palabra rota**: el archivo ya no guarda su cuerpo. Hay que
  mirarlas en la web.
- **Qué hacer** (cualquiera de las dos):
  - apagar la corrección sola y dejar sólo el aviso;
  - o aceptar el cambio únicamente si la palabra corregida está en una **lista cerrada** de palabras que siempre
    llevan tilde (ya existe `ESTILO.palabrasSinTilde` en `ingesta/criterio.mjs`) y nunca en una palabra con
    mayúscula.

  Es un arreglo con su prueba, con estos 4 casos reales.

### 3.6 Qué control ataja cada error, en orden de valor

1. **Sentido** (exagerar, cambiar el sujeto, pegar un número a otra cosa): un juez de sí o no antes de publicar, en
   lo de acá y lo sensible. Hoy no hay nada.
2. **Sección**: la ficha con probabilidad. Por debajo de 0,6 de seguridad, se usa la regla de palabras o se pregunta
   a una persona.
3. **Repetidas publicadas**: § 2, paso 1.
4. **Tiempo verbal vencido**: un control de código (futuro + fecha de la fuente ya pasada).
5. Las letras rotas, los títulos, la promesa y las tildes **ya tienen control**: dejarlos.

---

## 4. Las voces

**Cómo está hoy**:

- `gemini-3.8-flash-tts` con dos voces propias creadas con Voice Design, que vencen el **29/09/2027**.
- Usa la clave `GEMINI_API_KEY_REDES`, en el plan gratis, con **10 audios por día**.
- El plan normal usa **7 a 9** (3 repasos más historias, clima y efeméride). Las piezas fijas de Participá se reusan
  dos semanas, y una memoria evita pedir dos veces el mismo audio.

**Dónde aprieta**:

- **El código no cuenta los audios**: se entera cuando Google contesta "sin cupo del día", y ahí la pieza se cae.
- Cada reintento (audio vacío, error del servicio, "habló de más") gasta otro audio, hasta 4 por pieza.
- Un feriado, una pieza extra o una prueba ("Auditar voz" gasta 6, "Probar Gemini" 1) dejan sin voz a la pieza de
  la noche.

**Cuánto costaría pagar** (estimado; Google no publicó en el repositorio el precio del modelo 3.8; uso el del modelo
anterior de TTS, US$ 10 por millón de tokens de audio, con ~25 tokens por segundo):

| | Por audio de ~45 s | Por día (10 audios, con reintentos) | Por mes | Cuánto dura una carga de US$ 5 |
|---|---|---|---|---|
| Hoy (gratis) | 0 | 0 | 0 | — |
| Pago, mismo volumen | ~US$ 0,011 | ~US$ 0,12 | **~US$ 3 a 4** | **~1,5 meses** (~400 audios) |
| Pago, 20 audios por día | — | ~US$ 0,24 | ~US$ 7 | ~3 semanas |

**Qué conviene**:

1. **Sí, cargarla**, pero sólo si quieren más de 10 piezas por día o dejar de depender del cupo gratis. Si el
   cronograma sigue igual, el gratis alcanza. Lo que más se gana es **margen**: un reintento ya no tira la pieza de
   las 21.
2. **Hacerlo en el mismo proyecto de Google donde se crearon las voces** (el de la clave de redes de hoy),
   activándole la facturación. Las voces propias probablemente quedan atadas a ese proyecto: una clave de otro
   proyecto podría no verlas. Se comprueba sin gastar con `listar` de "Crear voces".
3. **Ponerle un tope de gasto en Google** (US$ 5 a 10 por mes), como pide `docs/08-INFRAESTRUCTURA.md`.
4. **Ojo**: con la clave paga, los pedidos de redacción que hoy caen a esa clave se cobran (22 el 16/10, ~US$ 0,5
   por mes). Se acepta o se saca ese respaldo.
5. **Sumar en el código un contador de audios del día** (antes de pedir), con un aviso al 80 %. Así ninguna pieza se
   cae por sorpresa.

**Alternativas** (ninguna mejor hoy):

- **Azure** tiene voces es-AR con cupo gratis amplio, pero una de ellas es Elena, y la regla dice "nunca Elena".
- **ElevenLabs** cobra desde ~US$ 5 por mes y obligaría a crear voces nuevas.
- **Workers AI** (MeloTTS, Deepgram Aura) no tiene acento rioplatense.

Todas rompen "dos voces propias, siempre las mismas". Seguir con Gemini.

---

## 5. Tabla de recomendaciones

Impacto, esfuerzo y riesgo: alto, medio o bajo. Etapas:

- **Ya**: sin gastar, cambios chicos.
- **E1**: modo sombra.
- **E2**: el cambio.
- **E3**: después.

| # | Acción | Qué | Impacto | Esfuerzo | Riesgo | Etapa |
|---|---|---|---|---|---|---|
| 1 | **Cortar** | La corrección sola de tildes de la auditoría (o limitarla a una lista cerrada). Revisar las 4 notas tocadas | Alto (hoy rompe palabras) | Bajo | Bajo | Ya |
| 2 | **Mejorar** | Anotar en `uso-ia.json` **todas** las llamadas (ficha, repetidas, fotos, ilustraciones, auditoría, voces, pistas) con modelo, clave, tokens y error | Alto (sin esto no se decide nada con datos) | Bajo | Bajo | Ya |
| 3 | **Mejorar** | Contador de audios de voz del día antes de pedir, con aviso al 80 % | Medio | Bajo | Bajo | Ya |
| 4 | **Mejorar** | Guardar en cada ficha qué proveedor contestó (Gemini o Groq) | Medio | Bajo | Bajo | Ya |
| 5 | **Achicar** | Repetidas: huella `bge-m3` en Workers AI y comparar contra lo publicado en 72 h; IA sólo para los pares dudosos; un solo texto de "mismo hecho" para repetidas y parejas | **Alto** (57 repetidas de acá publicadas; hoy se agota a la tarde) | Medio | Bajo | E1 → E2 |
| 6 | **Mejorar** | Pruebas A, B, C y D de § 2.6 (menos de US$ 0,15 en total y una hora de una persona) | Alto (decide lo demás) | Bajo | Bajo | E1 |
| 7 | **Mejorar** | Ficha con Mercury Decide en sombra 7 días; después principal, con Gemini de respaldo y Jev en lo dudoso de afuera | Medio | Medio | Medio (proveedor chico, API alpha) | E1 → E2 |
| 8 | **Mejorar** | Control de sentido antes de publicar (juez de sí o no) en lo de acá, Política, Policiales y lo que tiene números | Alto (el error más serio que hoy no ataja nada) | Medio | Bajo (sólo endurece) | E2, si la prueba C da bien |
| 9 | **Mejorar** | Control de código para el tiempo verbal vencido (futuro de algo que ya pasó) | Medio | Bajo | Bajo | Ya o E2 |
| 10 | **Achicar** | Fotos: huella de imagen (dHash) antes de pedir a Gemini; no mandar copias de la misma foto | Medio (7 % de fotos repetidas y menos pedidos) | Bajo | Bajo | E2 |
| 11 | **Achicar** | Ilustraciones: bajar de 8 a 2 los pedidos de respaldo por imagen | Bajo | Bajo | Bajo | E2 |
| 12 | **Achicar** | Redacción: que el segundo pedido mande sólo la corrección y lo necesario; achicar la instrucción con el criterio por bloques (−15 %) | Medio (hoy ~2 pedidos por nota) | Medio | Medio (medir con `comparar-instruccion`) | E3 |
| 13 | **Mejorar** | Voces pagas con tope de gasto, en el mismo proyecto de las voces; decidir qué hacer con el respaldo de redacción en esa clave | Medio | Bajo | Medio (cobro, voces atadas al proyecto) | Cuando quieran más piezas |
| 14 | **Mejorar** | Visión de Workers AI como respaldo de las fotos (Groq acepta sólo 3) | Bajo | Medio | Medio (menores: sólo con la prueba D) | E3 |
| 15 | **Dejar** | El verificador de código, los controles de forma, el semáforo antes de pedir y "la IA sólo endurece" | Alto | — | — | — |
| 16 | **Dejar** | Gemini gratis para redactar; anotar Gemma 4 26B (~US$ 8 por mes) como repuesto si Google deja de dar cupo | Alto | — | Medio (el cupo gratis puede cambiar) | — |
| 17 | **Dejar** | La auditoría con IA como aviso (Groq, gratis, ~38 notas por día) y sus hallazgos de "afirmación" y "título" | Medio | — | Bajo | — |
| 18 | **Cortar** | Si 2.0 no los usa: `foto-stock.mjs`, `foto-ia.mjs` (Gemini imagen pago) y los modelos que no sirvieron en las pruebas (OpenAI luna, Microsoft, Perplexity como decisores; Gemini con búsqueda por API) | Bajo (orden) | Bajo | Bajo | E3 |

---

## 6. De dónde sale cada número

| Dato | Archivo |
|---|---|
| Pedidos de redacción, tokens y errores | `web/data/uso-ia.json` (desde el 15/10, sólo la redacción) |
| Intentos y motivos de cada nota | `web/data/intentos-ia.json` (528 notas, del 9 al 16/10) |
| Pedidos de ficha y de repetidas por día; hora en que se agotó | `web/data/fichas.json` y su historia en git (último commit de cada día) |
| Correcciones a mano | `web/data/correcciones.json` (156) |
| Correcciones solas de la auditoría | `web/data/correcciones-auditoria.json` (8) |
| Hallazgos de la auditoría | `web/data/auditoria-ia.json` → `contadores` (los hallazgos van cifrados) |
| Pruebas de Mercury, Jev y los demás | `docs/historico/PRUEBAS-DE-MODELOS.md` (el resumen; la carpeta `pruebas-modelos/`, con los `resultados-*.json` y los precios por token, se borró el 17/10 y queda en el historial de git) |
| Repetidas publicadas | `docs/etapa-2-5/ANALISIS.md`, `scripts/medir/etiquetas-duplicadas.json` |
| Costos por tarea del motor nuevo | `docs/etapa-10-operacion/DISENO-MOTOR.md` § 4 |
| Neuronas de las ilustraciones | `web/scripts/ilustrar-notas.mjs` (`neuronasEstimadas`), `docs/05-FOTOS.md` |
| Cupos de las claves | `docs/08-INFRAESTRUCTURA.md`, `reels/claves.mjs`, `LECTURA` en `ingesta/lectura-ia.mjs`, `REESCRITURA` en `ingesta/criterio.mjs` |
