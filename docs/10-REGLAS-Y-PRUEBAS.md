# 10 · Las reglas y las pruebas que las cuidan

*25/10/2026. Son **39 reglas, de R1 a R39**, agrupadas por tema. Reemplazan a la lista numerada de la 1 a la 327, que quedó congelada en
`docs/historico/REGLAS-1-A-327.md` (`docs/propuestas/LIMPIEZA-DE-DOCUMENTOS-25-10.md`, § 4). Si esto y el código no coinciden, manda el código.*

## Cómo se lee

- **La regla, en una frase**: lo que no se puede romper. El detalle de cada tema está en su documento (`docs/02-INGESTA.md` a
  `docs/09-PANEL.md`), en `CRITERIO-EDITORIAL.md` y en `CRITERIO-REDES.md`.
- **Absorbe**: los números viejos que esta regla junta. El código y los documentos citan "regla NNN" unas 2.000 veces y **esos números no se
  renumeran**: quien lea "regla 293" en un comentario la busca en esta columna (está en la R8) o en la lista vieja.
- **Pruebas**: los archivos de `pruebas/` que la cuidan (sin el `.test.mjs` del final). Una prueba controla que cada regla nombre al menos
  una prueba que exista (`documentos-313.test.mjs`).
- **No confundir** con las reglas 1 a 15 del § 12 de `CRITERIO-EDITORIAL.md`: ésas son las instrucciones que lee la IA, con su propia
  numeración.

## Qué es una prueba y qué pasa si falla

Una prueba es un programa chico que pone a prueba una regla con datos inventados, sin salir a internet. `npm test` corre todas (son unas
3.000); antes de cada commit se corren completas, y en GitHub las corre el workflow «Pruebas», que no frena la web. En cada vuelta del
motor corre sólo **el núcleo legal** (`npm run test:nucleo`, la lista de `pruebas/nucleo-legal.txt`: el semáforo con menores, víctimas y
sepelios, el verificador, la cola de las personas, las retiradas y correcciones con motivo y el cuerpo mínimo): si una de ésas falla, **la
web no se actualiza**, porque es preferible dejar la de antes que publicar algo roto.

**Cuando algo salió mal publicado, se escribe una prueba con el caso real** y se suma a la regla que corresponde: su número viejo o su
fecha a la columna «absorbe» si hace falta, y el nombre de la prueba a la última columna. Si el arreglo es de verdad una regla nueva, va
como **R40** (y así). Si dos agentes suman una R a la vez, se renumera al unir.

## Las reglas

| R | Tema | La regla, en una frase | Absorbe | Pruebas que la cuidan |
|---|---|---|---|---|
| R1 | Selección | Lo de Balcarce entra todo y no espera por el amarillo; sólo lo frenan el rojo, «nunca», «no es nota» y la promoción. Un medio de acá que copia algo de afuera no lo hace de acá. | 44, 58, 61, 64, 96, 179, 180, 198, 291 | `de-aca`, `balcarce-todas`, `localidades-del-partido`, `copia-de-afuera`, `zona`, `semaforo` |
| R2 | Selección | Lo de afuera sale por popularidad, sin cupos ni topes: 3 medios distintos, 2 en las áreas chicas, nunca uno solo. Los dos números se cambian con variables (`MINIMO_NACIONAL`, `MINIMO_AREAS_CHICAS`). | 50, 52, 56, 215, 217, 260, 262, 294 | `popularidad-260`, `popularidad-17-10`, `secciones-flacas`, `criterio` |
| R3 | Selección | Lo muy contado (8 medios o más) va primero y no lo frenan el amarillo, la lista internacional ni "es del extranjero"; el rojo, sí. | 197, 218, 288, 292, 297 | `popularidad-17-10`, `futbol-y-policial-nacional`, `semaforo-y-sin-cuerpo-23-10` |
| R4 | Selección | Del extranjero, sólo con un argentino. Policiales de afuera, sólo con 8 medios o la muerte de un famoso. Fútbol de afuera, sólo con argentinos. Todo esto se decide después del cruce. | 41, 42, 286, 289, 290, 303 | `entrada`, `futbol-y-policial-nacional`, `lectura-ia`, `criterios-extranjero-zona` |
| R5 | Selección | La lectura con IA puede sacar una nota, nunca destrabarla; Groq y Mistral (26/10) la respaldan, en ese orden (OpenRouter se retiró el 26/10: fallaba el 97 %). | 49, 193, 196, 240 | `lectura-ia`, `groq-fichas`, `mistral` |
| R6 | Selección | Lo que no es nota no sale nunca, ni aprobado por una persona: sepelios, efemérides de otros, autobombo, pronóstico o farmacias de otro medio, publicidad, quiniela, el parte del dólar. | 25, 59, 118, 164, 175, 199, 298 | `criterios-extranjero-zona`, `efemerides-ajenas`, `loteria` |
| R7 | Fechas | Una nota tiene una sola fecha: la mediana de las fechas de sus fuentes (las que no traen hora no cuentan). Envejece y nunca rejuvenece. Nunca se lee "la vimos hace…" ni "sin hora". | 2, 65, 194, 253, 314, 327 | `criterio-limpio-327`, `archivo`, `fechas-del-cruce`, `portada`, `web` |
| R8 | Ventanas | La portada muestra 36 horas. Lo que nunca salió se estrena hasta 24 horas después del hecho (36 si es de Balcarce). Lo raspado o de un feed de acá de más de 48 horas (lo que dura un mismo hecho) no entra. Lo que ya salió no se baja. | 60, 62, 63, 66, 180, 287, 293, 327 | `criterio-limpio-327`, `archivo`, `criterio` |
| R9 | Secciones | Son catorce. Las deciden el feed, las palabras (las ambiguas, sólo desde el titular) y la IA; nunca se llevan una nota de Política o Policiales sin motivo. | 45, 53, 57, 85, 142, 187, 216, 322 | `secciones-sumadas`, `secciones-nuevas`, `notas` |
| R10 | Orden | De la más nueva a la más vieja, con la nota grande de Balcarce arriba; más medios es más arriba. | 4, 143, 218, 255 | `portada`, `web`, `seguir-leyendo` |
| R11 | Repetidas | Una noticia, una nota: las repetidas se unen, queda la publicada y la otra redirige. | 51, 94, 101, 135, 171, 175, 195, 196 | `repetidas`, `repetidas-publicadas`, `repetidas-firmes`, `repetidas-2-0` |
| R12 | Cruce | Una historia es un solo hecho: no se encadenan A-B-C ni se pega Balcarce a un hecho de afuera. | 184, 322 | `cruce-grupos-coherentes`, `hecho-principal-322`, `cruce` |
| R13 | Redacción | El criterio es uno solo: la IA lee el § 12 de `CRITERIO-EDITORIAL.md` tal cual; los números viven en `ingesta/criterio.mjs` y en su tabla. | 26, 72, 263 | `criterio`, `instrucciones-ia` |
| R14 | Redacción | La IA recibe todas las fuentes (6.000 caracteres cada una, 18.000 en total) y sólo reescribe lo que va a salir solo. | 68, 84, 174, 308, 327 | `entrada-ampliada`, `fuentes-308`, `criterio-limpio-327` |
| R15 | Redacción | El cuerpo desarrolla la nota sólo con lo que dicen las fuentes; los títulos se arreglan sin inventar. | 5, 46, 54, 202, 284, 326 | `cuerpo`, `estilo`, `titulos-colores`, `titulos-deportes` |
| R16 | Verificación | Todo lo que escribe la IA se controla contra lo que se le mandó (números, nombres, días, citas); el nivel lo calcula el código y BAJA no sale sola. | 6, 71, 86, 128, 166, 167, 201 | `verificar`, `verificador-copia-fechas-letras`, `json-ia`, `editor` |
| R17 | Cuerpo | Sin 70 palabras de cuerpo no se publica: se reintenta 3, 4 o 5 veces según los medios y después se descarta con motivo. Lo de una persona se respeta. | 23, 113, 156, 299 | `cuerpo`, `semaforo-y-sin-cuerpo-23-10`, `seo-paginas` |
| R18 | Lector | El lector ve título, bajada, cuerpo y "Fuentes (N)" cerrado; la portada no muestra la fuente arriba de los títulos y la farmacia no dice hasta qué hora está de turno. Cada nota dice quién la escribió y cada fuente lleva a la original. | 1, 3, 7, 24, 27, 254, 256, 307 | `editor`, `nota-del-lector-17-10`, `notas-propias`, `portada`, `farmacias` |
| R19 | Menores y víctimas | Nunca se identifica a un menor ni a una víctima. La lista roja no se toca sin preguntar y lo rojo no sale ni aprobado. | 9, 116, 118, 119, 130, 172 | `semaforo`, `exenciones`, `reescritura`, `pistas` |
| R20 | Fotos | La foto sale de las fuentes de la nota, sin marca de otro medio, con el crédito en el epígrafe y en el banco propio. Commons, sólo para el lugar en F1 y fútbol. En Policiales, sólo foto oficial. | 8, 73, 99, 102, 109, 115, 203-205, 285, 319, 326 | `fotos`, `fotos-notas`, `fotos-controles`, `fotos-sin-commons`, `foto-libre` |
| R21 | Fotos | Lo que una persona suma o saca a mano lleva crédito, y lo descartado no vuelve. | 95, 136, 203 | `fotos-panel`, `fotos-controles` |
| R22 | Fotos con chicos | Sólo por la excepción de las fuentes de Balcarce: actividades no policiales, con el interruptor `FOTOS_MENORES_OFICIALES` (apagado) y nunca en redes. | 186, 209, 211 | `fotos-menores-oficiales` |
| R23 | Ilustración | Una nota sin foto puede llevar una ilustración sin personas, controlada con visión y marcada «generada con IA», por un solo camino (el automático de Cloudflare). | 165, 181, 182, 185, 206 | `ilustrar-notas`, `fondos-clima`, `efemeride-nota` |
| R24 | Redes: qué va | A las redes va lo de Balcarce y lo más contado del país (los repasos: Balcarce primero y después lo más contado, sin piso de puntaje). Una sola puerta: lo rojo nunca, Política y Policiales esperan a una persona en todas las piezas. | 10, 15, 47, 78, 142, 161, 280 | `redes`, `redes-arreglos`, `contrato`, `puertas-de-redes`, `piezas-del-dia` |
| R25 | Redes: formato | Instagram es video con voz, salvo el espejo de cada posteo de Facebook. Hashtags fijos, sin nombrar la fuente, nada dos veces. Lo de las redes vive en `CRITERIO-REDES.md`. | 13, 14, 31, 106, 107, 147, 169, 281-283 | `piezas`, `facebook-foto`, `instagram-duplicados`, `utm-redes`, `enlaces-cortos` |
| R26 | Redes: el día | El contrato del día (3 reels, 6 historias, hasta 5 posteos); cada pieza sólo en su franja. | 11, 33, 36-39, 83, 87-89, 131, 133 | `contrato`, `piezas`, `historias-largas`, `reintentar` |
| R27 | Redes: interruptor | Manda `REDES_ACTIVAS_NUBE`; apagado, todo simula. | 40, 67 | `redes`, `redes-nube` |
| R28 | Voz | Dos voces propias y nunca otra; 10 audios por día; el posteo avisa que la voz es de IA. | 29, 74-76, 114, 123, 208, 302 | `voz-gemini`, `cupo-voz`, `voz-memoria` |
| R29 | Voz y video | Cada pieza suena humana y en su horario; el video no tiembla ni arranca en blanco. | 28, 30, 90, 103, 132, 145, 146, 157, 159, 160, 300, 301, 324 | `redes-criterio`, `guiones`, `animacion`, `escenas`, `utiles-redes-324` |
| R30 | SEO | A Google se le ofrece sólo lo que vale: canónico propio, `noindex` en lo sin cuerpo y en las plantillas, mapas por mes, marcado con la foto real. | 21, 149, 150, 177, 250-253, 310, 321 | `seo-paginas`, `seo-llm`, `indexnow`, `rss`, `seo-tecnico-321` |
| R31 | Web | Un enlace que circula no se rompe: dirección fija, las repetidas redirigen y `_redirects` respeta su tope. | 20, 135, 183, 191 | `archivo`, `ruta`, `redirects`, `archivo-cloudflare` |
| R32 | Archivo | Los datos no se pierden ni congelan la web: lectura estricta, guardia contra bajas grandes, tope de notas y archivo en R2. | 105, 110, 111, 137 | `archivo`, `armado-vacio`, `contar-archivos` |
| R33 | Personas | Lo que decide una persona manda y lleva motivo, cuándo y quién. Una nota que escribe una persona desde el panel (30/10: título, bajada, cuerpo de 30 palabras o más, firma y fotos) sale tal cual, firmada, sin fuentes vacías y sin ir sola a las redes; su dirección y su fecha no cambian al editarla y retirarla no borra nada. | 48, 55, 69, 81, 163, 212 | `archivo`, `celular`, `agenda-suspendidos`, `revision-archivo`, `notas-de-redaccion` |
| R34 | Panel | El panel del celular viaja cifrado y pregunta antes de lo que no se deshace. Las fotos se achican en el celular (1600 y 1200 px, ~400 KB) y se suben antes que la nota; lo escrito no se pierde si algo falla. | 79, 82, 120, 125-127, 141, 200, 295 | `celular`, `celular-app`, `panel-publicar`, `escribir-panel` |
| R35 | Auditoría IA | Sola, sólo corrige una tilde segura; lo demás es un aviso para una persona. | 98, 108, 188 | `auditoria-correccion`, `auditoria-ia` |
| R36 | Infraestructura | El robot corre en Cloudflare: una compilación por vuelta y ninguna si nada cambió; el núcleo legal corta todo. | 17, 189, 190, 230-235, 304, 305 | `motor-cloudflare`, `reloj-cloudflare`, `una-compilacion`, `redes-nube-efemeride` |
| R37 | Minutos | Los minutos de Workers Builds se cuentan del 11 al 10 y el presupuesto saltea vueltas sin dejar la web más de 3 horas sin armar. | 231, 312, 315 | `minutos-de-workers-builds`, `ciclo-de-facturacion` |
| R38 | Vigilancia | Los avisos van por mail (WhatsApp de respaldo); el informe diario no inventa. | 80, 121, 168, 173, 176, 235, 318 | `vigilancia`, `avisar-por-mail`, `informe-diario`, `vigilante-cloudflare` |
| R39 | Claves, pausa y dependencias | Las claves nunca van en un chat ni en el código, y toda variable que se lee tiene que llegar. La pausa general frena todo menos vigilancia, informe y respaldos. `ingesta/`, `panel/` y `redes/` no importan nada de afuera de Node. Cada arreglo lleva su prueba. Cada pedido a una IA se anota en `web/data/uso-ia.json` con su clave y el motivo del fallo (`redes/uso-ia.mjs`). | 16, 18, 19, 170, 311, 317 | `variables-conectadas`, `pausa-general`, `panel-pausa`, `sintaxis-scripts`, `uso-ia` |

## Lo que la lista corta deja afuera a propósito

- **Las reemplazadas** (12, 42, 47, 52, 53, 56, 63, 96, 98, 161, 182, 200, 205, 217, 285, 287 y 293) y **la retirada** (187): en la lista
  vieja dicen quién las reemplazó.
- **Los detalles de un arreglo** (unos cien números: 27, 32, 34 a 40, 70 a 72, 83 a 86, 101 a 106, 120 a 129, 131 a 136, 138 a 154,
  157 a 160, 166 a 170, 250 a 252, 300 a 302, 304 a 306…): no son reglas que una persona tenga que saber; su prueba sigue corriendo y su
  historia está en la lista vieja.
- **Lo retirado** (el panel de la PC, el servidor MCP, Gemini web, Vercel, cron-job.org): eran frases sueltas dentro de reglas vigentes y
  acá no aparecen.

## Dónde está el resto

- La lista vieja completa, con la prueba de cada número: `docs/historico/REGLAS-1-A-327.md`.
- Qué se decidió, por qué y quién: `docs/DECISIONES.md`.
- El criterio entero con cada número y dónde vive: `docs/CRITERIO-EN-UNA-PAGINA.md`.
