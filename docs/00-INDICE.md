# 00 · Índice: Radar Balcarce de punta a punta

*Actualizado el 17/10/2026. Es la puerta de entrada a la documentación: qué es el
proyecto, por dónde pasa una noticia y qué documento cuenta cada cosa. Si un
documento y el código no coinciden, manda el código.*

## Qué es Radar Balcarce

Un **medio digital automático** de Balcarce, provincia de Buenos Aires, en
`radarbalcarce.com`, con Instagram `@radarbalcarce` y la página de Facebook
"Radar Balcarce". Cada media hora lee unos 100 feeds de unos 70 medios (de
Balcarce, la zona, la provincia y el país; desde el 15/10 sólo Balcarce, los 50 mejores del país y los 10 de Tandil y
Mar del Plata; la cuenta exacta, en `FUENTES.md`), junta la misma noticia contada por
varios, decide qué sale sola y qué espera a una persona, la escribe con IA
(Gemini), verifica lo escrito contra las fuentes, arma el sitio y lo sube a
Cloudflare. Varias veces por día publica en Facebook e Instagram con dos voces de
IA (una locutora y un locutor). Un vigilante avisa por mail si algo falla (el
WhatsApp quedó de respaldo) y dos informes por mail, a las 8:15 y a las 21:15, cuentan
cómo va el día.

**La explicación completa para leer en el celular, con un diagrama, los costos y lo que
| `docs/CRITERIO-EN-UNA-PAGINA.md` | **Qué sale, qué no y por qué, en una página**, con cada número, su porqué y dónde vive en el código (23/10). Si querés saber algo del criterio, empezá por acá | vigente |
sobra: `docs/COMO-FUNCIONA-HOY.html`.**

**Todo eso corre en GitHub y en Cloudflare, con la PC apagada** (el reloj, el
vigilante y los mails viven en Cloudflare; el trabajo pesado, en GitHub Actions). Lo que el sistema no puede
decidir solo lo deciden Hernán y Andrés desde el **panel del celular**
(`radarbalcarce.com/panel/`); el panel de la PC, que nunca se usó, se retiró el
17/10.

**Desde el 15/10/2026 se rediseña todo desde cero, una etapa por vez** (fuentes →
entrada → duplicadas → clasificación → puntaje → contexto → redacción y verificación →
fotos → publicación y redes → operación). Lo que se decide queda en
`docs/DECISIONES.md`; mientras tanto, este índice cuenta cómo funciona hoy.

El principio que decide todo es una pregunta: **¿qué valor tiene esta nota para
alguien que vive en Balcarce?** Lo local pesa más que cualquier cosa de afuera, se
informa sin gritar y cada nota dice de dónde sale y quién la escribió.

## El recorrido de una noticia

Cada media hora el reloj (el Worker de Cloudflare `radar-balcarce-reloj`, desde el
15/10; antes, cron-job.org) dispara "Actualizar la web" (GitHub Actions), que hace
los pasos 1 a 8; las redes y la vigilancia corren aparte.

| # | Paso | Qué pasa | Dónde se cuenta |
|---|---|---|---|
| 1 | Ingesta | Se bajan y se leen los feeds (RSS, Atom, índices, páginas), con sus fechas; el filtro de entrada deja afuera otro país, policiales y consejos de afuera | `docs/02-INGESTA.md` |
| 2 | Cruce | Se juntan las notas que cuentan el mismo hecho (memoria de 36 h, lo de acá 72 h desde el 17/10; desde el 16/10 sin encadenar noticias distintas, regla 184, `docs/flujos/CRUCE-COHERENTE.md`); lo de un organismo o medio de Balcarce entra siempre (regla 180); de afuera queda lo que cuentan varios medios (de 2 a 4 según la sección: `ingesta/criterio.mjs`), dice Balcarce o toca la zona | `docs/02-INGESTA.md` (pasos 9 a 13) |
| 3 | Selección | Sección, puntaje, semáforo (rojo, amarillo, verde), "de acá", medios que pide lo de afuera, cupos | `docs/03-SELECCION.md` |
| 4 | Lectura con IA | Una ficha por nota: saca, cambia la sección, junta repetidas; nunca destraba | `docs/03-SELECCION.md` (paso 8) |
| 5 | Redacción | Gemini escribe título, bajada y cuerpo con el texto completo de hasta 4 fuentes (regla 174) y `CRITERIO-EDITORIAL.md` § 12 | `docs/04-REDACCION.md` |
| 6 | Verificación | Cada dato contra las fuentes, el semáforo otra vez, el nivel de verificación; sin cuerpo no se publica | `docs/04-REDACCION.md` (pasos 7 a 11) |
| 7 | Publicación | Lo que decidió una persona (panel del celular), fecha real, "llega tarde" (12 h), retiradas y correcciones, foto del banco | `docs/03-SELECCION.md` (pasos 10 a 13), `docs/05-FOTOS.md`, `docs/09-PANEL.md` |
| 8 | Web | `web/data/*.json` → Next.js estático → Cloudflare Pages: portada de 36 h, página mientras la nota esté entre las últimas 3.700 (unos 80 días al ritmo de hoy; el archivo permanente en R2 está listo y sin activar), dirección fija | `docs/06-WEB.md`, `docs/salud-tecnica/ARCHIVO-PERMANENTE-IMPLEMENTACION.md` |
| 9 | Redes | Facebook (posteo y espejo en Instagram) y piezas de video con voz: clima, farmacia, tres podcasts | `docs/07-REDES.md`, `CRITERIO-REDES.md` |
| 10 | Vigilancia | Mira la web, las corridas, las redes, las claves de IA y las voces (en GitHub y en el Worker `radar-balcarce-vigilante`); avisa por mail cuando algo falla (WhatsApp de respaldo) y manda los informes de las 8:15 y las 21:15 | `docs/08-INFRAESTRUCTURA.md`, `docs/11-OPERACION.md` |

## Cada cosa, un solo lugar

Un dato vive en **un** lugar; los demás documentos remiten a ése.

| Qué | Dónde vive | Cómo se cuida |
|---|---|---|
| El estado del día (qué anda, qué no, las redes, las claves) | `CLAUDE.md`, sección "Estado" | — |
| Lo que falta hacer, con quién y qué urgencia | `PENDIENTES.md` | — |
| Qué se decidió, por qué y quién, y las preguntas abiertas | `docs/DECISIONES.md` | — |
| El criterio editorial (qué se publica, cómo se escribe, fuentes, verificación, firma) | `CRITERIO-EDITORIAL.md` | La IA lee su § 12 tal cual (`ingesta/prompt-editorial.mjs`); `pruebas/criterio.test.mjs` |
| Los números del criterio (largos, topes, medios, cupos, horas, contrato) | `ingesta/criterio.mjs` **y** la tabla de `CRITERIO-EDITORIAL.md` § 11 | `pruebas/criterio.test.mjs` controla que digan lo mismo |
| Cómo suenan y qué dicen las piezas de redes | `CRITERIO-REDES.md` | `redes/prompt-redes.mjs` lo lee tal cual; `pruebas/redes-criterio.test.mjs` |
| Los horarios de las piezas | `docs/07-REDES.md` (el código: `redes/piezas.mjs`, `redes/horarios.mjs`) | `pruebas/piezas.test.mjs` |
| Las fuentes | `ingesta/fuentes.mjs` y `ingesta/fuentes-cruce.mjs`; `FUENTES.md` es el registro **generado** | `pruebas/fuentes-registro.test.mjs` |
| Lo que la IA sabe de Balcarce | `ingesta/perfil-balcarce.md` (sólo datos seguros) | Lo lee `ingesta/lectura-ia.mjs` |
| Las claves de IA, los secretos, los workflows, los costos y los vencimientos | `docs/08-INFRAESTRUCTURA.md` | — |
| El panel del celular | `docs/09-PANEL.md` | — |
| Las reglas numeradas y la prueba que cuida cada una | `docs/10-REGLAS-Y-PRUEBAS.md` | Las pruebas de `pruebas/` |
| El uso diario (corregir, retirar, instalar el panel del celular, qué mirar si algo no sale) | `docs/11-OPERACION.md` | — |
| La identidad visual (colores, letras, íconos, plantillas) | `MEDIA-KIT.md` | `pruebas/titulos-colores.test.mjs`, `pruebas/tipografia.test.mjs` |
| Las medidas de imagen y video de cada red | `redes/formatos.mjs` (el porqué, en `FORMATOS.md`) | `pruebas/formatos.test.mjs` y la auditoría de los lunes |
| Las biografías de las redes | `PERFILES.md` | `pruebas/perfiles.test.mjs` |
| Lo legal | `INVESTIGACION.md` | — |
| El texto de la política de privacidad | `web/app/politica-de-privacidad/page.js` (`POLITICA-PRIVACIDAD.md` cuenta sólo lo interno del buzón) | — |
| La historia de lo que pasó | `docs/historico/HISTORIA.md` y los mensajes de los commits | — |

## Todos los documentos

### En `docs/` (cómo funciona)

| Documento | Qué cuenta |
|---|---|
| `docs/00-INDICE.md` | Este índice |
| `docs/01-ARBOL.md` | Cada carpeta y cada archivo versionado: qué hace, quién lo llama y si está en uso |
| `docs/02-INGESTA.md` | De dónde salen las noticias: las fuentes, cómo se leen, las fechas, el filtro de entrada, el cruce de medios, cómo queda armada cada historia y el texto completo de la nota original |
| `docs/03-SELECCION.md` | Qué sale, dónde y cuándo: sección, puntaje, semáforo, "de acá", medios y cupos de lo de afuera, la lectura con IA, la fecha, "llega tarde", la decisión final, las ventanas, retirar y corregir |
| `docs/04-REDACCION.md` | Cómo escribe la IA, cada control del verificador, los arreglos automáticos, el nivel de verificación, "sin cuerpo no se publica", escribir un cuerpo a mano, escribir a pedido y la firma |
| `docs/05-FOTOS.md` | El banco de fotos: cómo se elige una foto sin marca de agua, Wikimedia, qué se guarda, dónde se muestra y dónde no |
| `docs/06-WEB.md` | Cómo se arma el sitio: `generar-datos.mjs` paso a paso, los archivos de `web/data/`, la tapa, las páginas, cuánto dura la página de una nota (tope de 3.700), la dirección fija, las repetidas, las notas propias, el SEO y el diseño |
| `docs/07-REDES.md` | Facebook e Instagram: el interruptor, los posteos y el espejo, el reloj, las piezas, los podcasts, el contrato del día, el libro, la conexión con Meta y las auditorías |
| `docs/08-INFRAESTRUCTURA.md` | Qué corre dónde: los workflows, el reloj (Worker de Cloudflare), Cloudflare, GitHub, las claves de IA y sus topes, los secretos por nombre, la vigilancia, los vencimientos y lo que cuesta |
| `docs/09-PANEL.md` | El panel del celular: qué muestra, qué pasa cuando alguien decide y cómo llega a la web (el de la PC se retiró el 17/10) |
| `docs/13-EFEMERIDES.md` | "Un día como hoy" y los feriados: la base mensual de candidatas, la pestaña Fechas del panel y cómo se afina el criterio con lo que se elige |
| `docs/10-REGLAS-Y-PRUEBAS.md` | **Las reglas numeradas**, qué prueba cuida cada una, el mapa de `pruebas/` y la regla de la prueba después del error |
| `docs/11-OPERACION.md` | El manual de uso diario: los enlaces, corregir, retirar, escribir cuerpos, el panel del celular, prender o apagar las redes, qué mirar cuando algo deja de salir |
| `docs/12-GLOSARIO.md` | Cada palabra propia del proyecto, con su definición y dónde vive |
| `docs/DECISIONES.md` | **El registro de decisiones**: fecha, qué, por qué y quién (lo nuevo arriba), y las preguntas abiertas para Hernán y para los dos |
| `docs/efemerides-octubre-para-revisar.md` | Las efemérides de octubre para aprobar; se archiva después del 31/10 |
| `docs/COMO-FUNCIONA-HOY.html` | **Cómo funciona hoy, de punta a punta** (16/10): diagrama, quién corre y cuándo, fuentes, la nota por dentro, redes, mails, panel, archivo y respaldos, costos reales, qué pasa si algo falla, lo que existe y no se usa, y las pruebas que sobran. Para leer en el celular |

### Nuevos del 15 y 16/10: análisis, propuestas y flujos

Casi todo esto es **para leer y decidir**: no cambia el sistema hasta que se decide. Las marcas: **vigente** (cuenta
cómo funciona algo que ya anda), **para decidir** (propuesta o página con cajas Sí / No / Duda), **foto del día**
(un análisis medido ese día: sirve como evidencia, pero algunos números o estados ya cambiaron).

| Documento | Qué cuenta | Estado |
|---|---|---|
| `docs/historico/flujo/GUIA-DEL-FLUJO.html` | Los trece pasos del 16/10 con los prompts de esa fecha | **histórico** (movido el 23/10: los textos y reglas de hoy están en `docs/REGLAS-Y-PROMPTS.html`, regenerado) |
| `docs/historico/flujo/FLUJO-NUEVO.html` | La propuesta de flujo del 16/10 (tope de 150 por día) | **histórico**: ya está en producción, sin tope y con otras reglas |
| `docs/historico/flujo/FLUJO-NUEVO-SIMULACION.html` | La simulación de esa propuesta con la corrida del 16/10 | **histórico** |
| `docs/flujos/INFORME-DE-HOY.html` | Cómo llegó la información el 16/10, cómo anduvo cada fuente y cómo quedarían las secciones; diez preguntas (se rehace con `scripts/medir/informe-del-dia.mjs`) | foto del 16/10; se rehace cuando se corre el programa |
| `docs/flujos/CRUCE-COHERENTE.md` | El cruce que ya no encadena noticias distintas (regla 184, interruptor `CRUCE_COHERENTE`) y cómo se midió | vigente |
| `docs/flujos/REPETIDAS-2-0.md` | Lo de acá que no sale repetido (memoria de acá, huella de significado, parejas entre secciones, tope repartido) y la fecha que no envejece por una nota vieja pegada (reglas 193 a 196), con la medición; `scripts/medir/repetidas-2-0.mjs` la repite | vigente |
| `docs/flujos/NOTA-DESDE-MAIL.md` | Los pasos para armar una nota desde un mail de prensa | vigente (lo sigue Claude) |
| `docs/flujos/IMAGENES-CON-GEMINI-WEB.md` | El flujo de ilustrar con Gemini web: desactivado el 17/10/2026 (regla 206), por qué y qué hay que apagar | desactivado |
| `docs/flujos/REVISION-DEL-ARCHIVO.md` | La revisión del archivo entero por tandas, con el criterio de hoy, desde el 22/10/2026 (regla 212): qué mira, qué hace, el cupo, la simulación | vigente |
| `docs/secciones/MAPA-DE-SECCIONES.md` (y `.html`) | De 11 a 17 secciones: el mapa propuesto, con el clasificador nuevo en sombra (`ingesta/secciones-nuevas.mjs`) | para decidir |
| `docs/secciones/PROTOTIPO-MENU.html` | El menú y la portada con 17 secciones, dibujados | para decidir (cambio visible) |
| `docs/panel/PLAN-NUEVO-PANEL.md` y `PROTOTIPO-PANEL.html` | Auditoría del panel del celular, diseño del nuevo y prototipo para tocar | para decidir |
| `docs/auditoria-2-0/` (01 a 09 y `RADAR-2-0.html`) | La auditoría para Radar 2.0 del 16 y 17/10: armado e infraestructura, fuentes y repetidas, fotos, IA y modelos, módulos y redes, prompts, medios parecidos, ideas de otras IA y el orden de las claves | vigente (la base del rediseño) |
| `docs/diseno/COMPARACION.html` (y `DIRECCION-A`, `DIRECCION-B`) | Dos direcciones para el rediseño del sitio | para decidir (cambio visible) |
| `docs/diseno/VISTA-PREVIA-PORTADA-2.html` | Dos propuestas de portada para el celular (servicio arriba, nota principal grande, «Lo último» con hora y carruseles por sección), con datos reales y lo que cuesta cada una | para decidir (cambio visible; 17/10) |
| `docs/secciones/MINI-PORTALES.html` | Mini portales por tema | para decidir |
| `docs/seo/AUDITORIA-SEO-LLM.md` | SEO y asistentes de IA: estado real, problemas, plan, política de bots, `llms.txt`, servidor MCP | vigente (16/10) |
| `docs/seo/AUDITORIA-FEEDS.md` | Si los feeds RSS de texto y de audio están bien armados | foto del 15/10 |
| `docs/seo/SEARCH-CONSOLE-16-10.md` | Lo que dice Google: 1.085 páginas indexadas, 813 impresiones y 46 clics en 3 semanas | foto del 16/10 |
| `docs/redes/ARCHIVO-DE-PIEZAS.md` | Dónde se guardan para siempre los videos, audios y placas (R2, depósito `radar-piezas`; la variable `R2_PIEZAS` se cargó el 15/10, aunque el documento diga «apagado») | vigente |
| `docs/redes/PLAN-REELS-OTRAS-REDES.md` | Publicar los reels en TikTok, YouTube, etc. (el esqueleto `redes/destinos.mjs` se sacó el 17/10; queda en el historial) | para decidir |
| `docs/redes/AUTOMATIZAR-REDES-ALTERNATIVAS.md` | Alternativas para automatizar TikTok, YouTube, X, Threads y el canal de WhatsApp | investigación (15/10) |
| `docs/redes/FORMATOS-POR-RED.md` | Qué se puede publicar en cada red, con qué medidas y qué enlaces; § 0b: el texto de cada red (largo, enlace, hashtags, plantilla) | investigación (16/10) y tabla (17/10) |
| `docs/redes/PROPUESTA-POSTEOS-POR-DIA.md` | Qué va a Facebook e Instagram (sólo Balcarce y lo más contado) y cuántos posteos por día | propuesta con pregunta (17/10) |
| `docs/redes/ACORTADOR-DE-ENLACES.md` | Enlaces cortos y rastreables con un Worker de Cloudflare (`/r/<red>/<id>`): opciones, números, cómo activarlo | escrito, apagado (17/10) |
| `docs/redes/FOTO-CAMBIADA-DESPUES-DEL-POSTEO.md` | La foto de una nota cambia después de salir en Facebook: qué se puede, medición, alternativas | propuesta con pregunta (17/10) |
| `docs/redes/GUION-DEL-DIA-EJEMPLO.md` | Un día completo de guiones con la línea editorial del día (enlaces entre piezas, ganchos, llamado único), armado con datos reales; se rehace con `node reels/guion-del-dia.mjs` (regla 301) | vigente (18/10) |
| `docs/redes/VOCES-NUEVAS.md` | Cómo recrear las dos voces propias con la clave paga de Google: la referencia, la prueba de parecido, cuántos audios gasta cada paso (regla 302) | listo para usar (18/10) |
| `docs/redes/FORMATOS-POR-RED.md` | Qué se puede publicar en cada red, con qué medidas y qué enlaces | investigación (16/10) |
| `docs/etapa-1-fuentes/LISTA-ELEGIDA.md` | La lista de fuentes elegida el 15/10 (Balcarce + 50 del país + 10 de la zona), ya aplicada | vigente |
| `docs/etapa-1-fuentes/ANALISIS.md` | Qué aportaba cada una de las 254 fuentes y tres listas posibles | foto del 15/10 (superada por la lista elegida) |
| `docs/etapa-1-fuentes/BALCARCE-INVESTIGACION.md` | 35 fuentes posibles de Balcarce y su partido, con feed o sin feed | para decidir |
| `docs/etapa-1-fuentes/CANDIDATAS-NUEVAS.md` y `DIAGNOSTICO-POLICIALES-CIENCIA-IA.md` | Fuentes candidatas de ciencia, IA, salud y Policiales, y por qué Policiales tiene pocas notas | para decidir |
| `docs/etapa-1-fuentes/REVISION-FUENTES.html` | La página para decidir fuente por fuente (lista corta de 47); se rehace con `node scripts/medir/generar-revision.mjs` (los programas de esta carpeta pasaron a `scripts/medir/` el 24/10, regla 311: `docs/` ya no tiene programas) | para decidir |
| `docs/etapa-2-5/ANALISIS.md` | Entrada, duplicadas, clasificación y puntaje: cómo andan y qué se puede elegir | foto del 15/10 (duplicadas ya cambiaron: reglas 171 y 175) |
| `docs/etapa-6-9/ANALISIS.md` | Semáforo, redacción, fotos y redes: cómo andan y opciones | foto del 15/10 (la propuesta de recortar redes se descartó ese día) |
| `docs/etapa-10-operacion/ANALISIS.md` | Sacar el robot de GitHub y llevarlo a Cloudflare: minutos medidos, fases, costos, pruebas | foto del 15/10 (desde ese día sólo corre el núcleo legal en cada vuelta y ya hay respaldo en R2) |
| `docs/etapa-10-operacion/DISENO-MOTOR.md` | El diseño del motor nuevo en Cloudflare (D1, Workflows, R2) | para decidir (sólo diseño; el esquema está en `motor/`) |
| `docs/etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md` | La mudanza del robot a Cloudflare para entrar en los 2.000 minutos gratis de GitHub privado: qué se eligió (Workers Builds para el motor, un Worker para las tareas, un repositorio público para el video), con números, límites oficiales y lo que quedó afuera | **escrita y probada en Node el 18/10/2026; sin prender** |
| `docs/etapa-10-operacion/POR-QUE-NO-ENTRO-ARREGLOS.md` | Los arreglos seguros del informe «Por qué no entró» (regla 314): el motivo de cada historia, la fecha del hecho por mediana, lo ya publicado que no se saca, Balcarce sin amarillo heredado; lo medido antes y después, cómo volver atrás y lo que quedó pendiente (S5) | vigente (24/10) |
| `docs/etapa-10-operacion/PLAN-DE-CAMBIO.md` | El orden exacto de los pasos para prenderla, qué se pega y dónde, cómo se verifica cada paso y cómo se vuelve atrás en minutos | para ejecutar (a mano, una persona) |
| `docs/salud-tecnica/ANALISIS.md` | Qué hace falta para que la página dure años | foto del 15/10 |
| `docs/salud-tecnica/ARCHIVO-PERMANENTE.md` | El diseño del archivo permanente | superado por el de abajo |
| `docs/salud-tecnica/ARCHIVO-PERMANENTE-IMPLEMENTACION.md` | El archivo permanente en R2: qué se construyó y cómo se activa (regla 183) | vigente (sin activar) |
| `docs/analiticas/ANALISIS.md` | Qué se mide, qué estaba roto y cómo medir bien | foto del 15/10 (los ceros falsos ya se arreglaron) |
| `docs/criterio/ANALISIS.md` | El criterio editorial auditado | foto del 15/10 |
| `docs/criterio/CRITERIO-EDITORIAL-PROPUESTA.md` | Un texto nuevo del criterio | para decidir (**no rige**) |
| `docs/criterio/PROPUESTA-EDICION-V2.md` y `PROMPT-V2-CANDIDATO.txt` | Notas que sean síntesis de todas sus fuentes; la fase 1 (entrada ampliada, regla 174) ya está hecha | a medias: el prompt candidato sin medir |
| `docs/criterio/PESOS-Y-PUNTAJES.md` (y `.html`) | Todos los números que deciden qué sale y en qué orden, y una recalibración | para decidir |
| `docs/criterio/BALCARCE-TODAS-LAS-NOTAS.md` | Dónde se perdían notas de Balcarce; lo aplicado es la regla 180 | vigente + propuestas |
| `docs/auditoria-opus/ANALISIS.md` | La auditoría independiente del 15/10 (legal, operación, seguridad) | foto del 15/10 |
| `docs/auditoria-opus/REVISION-CODIGO-15-10.md` | Revisión de código del 15/10, 19 hallazgos | foto del 15/10 (los urgentes se arreglaron ese día) |
| `docs/auditoria-opus/TEXTO-PARA-OTRAS-IAS.md` y `RESPUESTAS-OTRAS-IAS.md` | La consulta a otras IAs y la respuesta de ChatGPT | foto del 15/10 |

### En `docs/propuestas/` (lo que sigue abierto)

| Documento | Qué cuenta |
|---|---|
| `docs/propuestas/LEEME.md` | Qué queda en la carpeta y en qué estado está cada cosa |
| `docs/propuestas/PASOS-PARA-USTEDES.md` | Lo que sólo una persona puede hacer (respaldo en GitLab y R2, fotos a R2) |
| `docs/propuestas/PLANTILLAS-DE-PIEZAS.md` | Las reglas y variantes de las escenas animadas (aprobadas y conectadas, regla 157) |
| `docs/propuestas/DISENOS-A-ARMAR.md` | Diseños de reels y web para elegir después del rediseño |
| `docs/propuestas/EN-LOS-MEDIOS-DE-BALCARCE.md` | Dos bloques nuevos de la tapa (lo de los medios de acá que no es nota, lo muy contado del país) | para decidir |

### En la raíz

| Documento | Qué cuenta |
|---|---|
| `CLAUDE.md` | Lo que Claude lee al empezar cada sesión: qué es, reglas que no se negocian, cosas que muerden, el estado del día, dónde tocar cada cosa |
| `CRITERIO-EDITORIAL.md` | **El criterio editorial único**: qué entra, semáforo, cómo se escribe, fuentes, verificación, qué ve el lector, notas propias, redes, firma, los números (§ 11) y la instrucción exacta de la IA (§ 12). La IA lo lee tal cual |
| `CRITERIO-REDES.md` | **El criterio único de las redes**: identidad, las voces, una ficha por pieza, las reglas de toda pieza y los números. El código lo lee tal cual |
| `FUENTES.md` | Todas las fuentes: dónde se leen, ciudad, tipo, sección, peso, si son oficiales. **Generado** desde el código: no se edita a mano |
| `PENDIENTES.md` | Todo lo que falta, con quién y qué tan urgente |
| `IDEAS.md` | Ideas de producto y de sistema, para discutir |
| `MEDIA-KIT.md` | La identidad visual: colores, tipografía, íconos, medidas, plantillas |
| `FORMATOS.md` | Las medidas de imágenes y videos de cada red y su porqué (los números viven en `redes/formatos.mjs`) |
| `PERFILES.md` | Las biografías, categorías y colores de las redes |
| `SEO.md` | Posicionamiento: qué está hecho, cómo se audita, qué falta. Lo más nuevo (16/10) está en `docs/seo/AUDITORIA-SEO-LLM.md` |
| `PUBLICIDAD.md` | Los tres avisos, sus reglas, AdSense y cómo se piensa vender |
| `COMERCIAL.md` | La base de comercios de Balcarce (aparte del sitio), la vigencia, las propuestas y el plan del mapa comercial |
| `INVESTIGACION.md` | Lo legal, con sus fuentes |
| `POLITICA-PRIVACIDAD.md` | Qué se hace con los datos del buzón (el texto público es la página `/politica-de-privacidad`) |

### En otras carpetas

| Documento | Qué cuenta |
|---|---|
| `web/README.md` | Cómo correr la web en la PC; remite a `docs/06-WEB.md` |
| `ingesta/README.md` | Cómo correr el motor a mano; remite a `docs/02-INGESTA.md` |
| `ingesta/perfil-balcarce.md` | Lo que la IA de lectura sabe de Balcarce (lo lee tal cual) |

### Históricos (`docs/historico/`, no se mantienen)

Fotos de un día o de un plan: lo que dicen puede ya no valer. El 17/10 se borraron los que
ya no citaba nada (`AUDITORIA.md`, `REDACCION-29-09.md`, `AUDITORIA-FOTOS-15-10.md` y `propuestas-2026-10/`; quedan en git). Nombran documentos
que se retiraron el 28/09 (`REGLAS.md`, `REDES.md`, `INFRAESTRUCTURA.md`,
`PANEL.md`, `EMPEZAR-ACA.md`, `MANUAL.md`, `docs/RADAR-3.0.md`): su contenido
vigente está en `docs/`.

| Documento | Qué cuenta |
|---|---|
| `docs/historico/HISTORIA.md` | Qué se hizo y por qué, con fecha |
| `docs/historico/INVESTIGACION-COMPETENCIA.md` | Lo que hacen los otros medios |
| `docs/historico/CRUCE-DE-MEDIOS.md` | La medición del 27/09 que llevó al cruce de medios |
| `docs/historico/PLAN-V2.2.md` | El plan del 27/09 para elegir mejor las notas (filtro de entrada, lectura con IA) |
| `docs/historico/PRUEBAS-DE-MODELOS.md` | Lo que dieron los ensayos de modelos de IA del 10 al 16/10 (la carpeta `pruebas-modelos/` se borró el 17/10) |
| `docs/historico/criterio-unico/` | El borrador del criterio único del 11/10, nunca aplicado (lo retoma `docs/auditoria-2-0/06-PROMPTS-Y-AGENTES.md`) |
| `docs/historico/VARIANTES-29-09.md` | La medición de las reglas de la IA del 29/09 y las opciones para las redes |
| `docs/historico/COMO-SE-ELIGE-UNA-NOTA.html` | Desde el feed hasta la nota (15/10): filtros, puntaje, semáforo, cruce y repetidas, con ejemplos. No incluye el cruce coherente ni la regla 180 del 16/10 (movido el 24/10, regla 311) |
| `docs/historico/RADAR-COMO-FUNCIONA.html` y `docs/historico/FOTOS-ANTES-Y-DESPUES.html` | Dos fotos viejas: una explicación general y una comparación de fotos; nadie las enlaza ni las regenera (movidas el 24/10, regla 311) |

### Código dormido (existe, tiene pruebas, pero producción no lo usa)

Es decisión de los dueños si se borra o se despierta; no se toca sin preguntar (auditoría 2.0, módulo A):
`comercial/` (la guía de comercios: base, propuestas y vista previa; ver `COMERCIAL.md`), `motor/` (los cimientos de una base D1 del «motor nuevo»; el motor que
corre hoy es `infra/motor-cloudflare/`), `redes/texto-por-red.mjs` (el texto para redes que todavía no tienen cuenta),
`sePuedeSola` (`redes/elegir.mjs`) y `agruparPorHecho` (`ingesta/cruce.mjs`; producción llama a `agruparConDetalle`).

## La historia corta

| Fecha | Qué |
|---|---|
| 18 a 24/09 | Motor, panel, piezas y web; cron-job.org como reloj; dominio propio; Meta conectado; Cloudflare Pages; tres podcasts; vigilancia |
| 25 y 26/09 | Repositorio público; sin cuerpo no se publica; archivo de 180 días; criterios únicos; notas propias; contrato del día |
| 27/09 | La lectura con IA decide; el cruce de medios; lo de afuera se mide en medios; correcciones y retiradas a mano |
| 28/09 | Portada de 36 horas; fecha única de cada nota; "de acá" con una sola definición; el banco de fotos; esta documentación |
| 29/09 | Claves gratis nuevas y redes prendidas con las voces propias; el panel del celular; la vigilancia de claves y voces; las repetidas con otra dirección, unidas; fotos más livianas |
| 8 y 9/10 | Auditorías; semáforo mejorado (regla 118); pantalla Hoy y Borradores en el panel del celular; escenas animadas en las piezas (regla 157) |
| 12 a 15/10 | Decisiones del 12/10; el repositorio se muda a `radarbalcarce/radar-balcarce`, el reloj pasa al Worker de Cloudflare y empieza el rediseño desde cero (`docs/DECISIONES.md`); fuentes de 254 a unas 100; avisos por mail y vigilante en Cloudflare; respaldo en R2; en cada vuelta sólo corre el núcleo legal de las pruebas |
| 16/10 | Cruce coherente (regla 184); todo lo de Balcarce entra (regla 180); informes por mail de las 8:15 y las 21:15; ilustraciones con IA para las notas sin foto (reglas 181, 182 y 185); archivo permanente en R2 listo sin activar (regla 183); redes sin enlaces en Instagram; propuestas del flujo nuevo y de 17 secciones para decidir |
| 17/10 | Radar 2.0, primeras tandas (reglas 189 a 210: una sola compilación, lo de Balcarce entra todo, repetidas y fotos 2.0, cupo de voz) y la limpieza final: se retiran el panel de la PC, los ensayos en sombra, `pruebas-modelos/` y los programas de `docs/` (los que se usan, en `scripts/medir/`) |

El detalle, en `docs/historico/HISTORIA.md` y en los mensajes de los commits.

## Cómo se mantiene esta documentación

- **Se cambia el código, se cambia el documento de su área**, en el mismo commit.
  Si es una regla nueva, va en `docs/10-REGLAS-Y-PRUEBAS.md` con el número
  siguiente y su prueba.
- **Un criterio editorial** se cambia en `CRITERIO-EDITORIAL.md` (y sus números,
  también en `ingesta/criterio.mjs`), no en el código ni en otro documento.
- **Una fuente** se cambia en `ingesta/fuentes.mjs` o `ingesta/fuentes-cruce.mjs`
  y después se corre `node ingesta/listar-fuentes.mjs`.
- **Un archivo nuevo** se suma a `docs/01-ARBOL.md`; **una palabra nueva**, a
  `docs/12-GLOSARIO.md`; **algo que falta**, a `PENDIENTES.md`; **una decisión**,
  a `docs/DECISIONES.md`; **el estado del día**, a `CLAUDE.md`.
- **Cada documento** empieza con la línea `*Actualizado el …*`, sigue el mismo
  orden ("En una frase", "Paso a paso", "Qué archivo hace qué", "Dónde se toca",
  "Qué puede fallar") y no guarda listas de pendientes.
