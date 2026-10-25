# Auditoría independiente de Radar Balcarce: lo que un dueño primerizo no sabe que tiene que mirar

*Hecha el 15/10/2026, en la PC, sólo leyendo: no se cambió ningún archivo del proyecto ni se commiteó nada.
La pidieron Andrés y Hernán con una preocupación concreta: "¿estamos arrastrando algún error o algo que
nadie hace, por inexperiencia?". La respuesta corta es **sí, hay varias cosas, y algunas son serias**,
pero casi todas tienen arreglo barato. Esta revisión mira el sistema entero con ojos escépticos (de
producto periodístico, legal, operación, seguridad y crecimiento) y no repite el detalle de los otros
análisis del 15/10 (`docs/etapa-*`, `docs/criterio/`, `docs/salud-tecnica/`, `docs/analiticas/`), aunque
los usa y, donde no coincido, lo digo.*

**Cómo leerlo.** Arriba, las diez cosas que más conviene arreglar primero. Después, cada hallazgo con:
**severidad** (crítico, alto, medio, bajo), **por qué importa** en palabras simples, **evidencia** (archivo y
línea, o "no verificado"), **qué hacer**, **quién** (Claude; Andrés y Hernán a mano; abogado o contador) y
**esfuerzo**. Al final, lo que no pude comprobar, preguntas para un abogado y ocho preguntas para hacerles a
otras IAs y contrastar.

**Aviso importante sobre lo legal.** No soy abogado. Lo que digo sobre leyes argentinas, términos de servicio
de Meta, Google o GitHub y políticas de buscadores es **una lectura de riesgo para que lo consulten**, no una
conclusión. Donde dice "abogado", es en serio: una consulta de una hora con alguien que sepa de medios y
propiedad intelectual vale más que cualquier cosa escrita acá.

---

## Las diez cosas que más conviene arreglar primero

| # | Qué | Severidad | Quién | Esfuerzo |
|---|---|---|---|---|
| 1 | **Los avisos están muertos desde el 1/10.** El WhatsApp de CallMeBot se quedó sin cupo y nadie se entera de nada: el 4/10 y el 11/10 la web falló 41 veces y no llegó ningún aviso | Crítico | Claude arma; una persona crea la cuenta | 1 día |
| 2 | **Salen solas notas de Policiales que la propia regla prohíbe** (una con la cuadra y el parentesco de la víctima de un caso de violencia familiar; otra de un solo medio con "acusado" y "antecedentes"). Y "Quiénes somos" promete en público que eso no pasa | Crítico | Hernán decide; Claude aplica | Horas |
| 3 | **Todo cuelga de una sola cuenta de Gmail y la verificación en dos pasos sigue pendiente.** Si alguien entra a `radarbalcarce@gmail.com`, se lleva GitHub, Cloudflare, Meta, Gemini y Search Console juntos | Crítico | Andrés y Hernán | Una tarde |
| 4 | **GitHub es todo a la vez** (código, datos, robot y respaldo) y el respaldo externo nunca se configuró ni se probó restaurar. Además, usar Actions como "servidor" del medio puede chocar con los términos de GitHub | Crítico/alto | Los dos crean cuentas; Claude configura | 1 día |
| 5 | **La llave del panel del celular abre todo**: con ella se puede cambiar el código que corre con los secretos y llevarse el token de Meta y las claves. Vive en el navegador, en el mismo dominio que la web pública, y nadie avisa cuando vence | Alto | Claude | 1 a 2 días |
| 6 | **Seis de cada diez notas son de afuera y reescritas con IA** (Messi, Gasly, la jubilación contada por 16 medios). Para Google eso se parece a "contenido masivo automatizado" y puede hundir al dominio entero, incluidas las notas de Balcarce | Alto | Los dos deciden; Claude aplica | Días |
| 7 | **La relación con los medios de los que se nutre**: se reescriben a diario las notas de las radios y diarios de Balcarce, la fuente queda escondida en un desplegable cerrado, las redes no la nombran, se lee el artículo entero sin mirar `robots.txt`, el código sugiere "probar otro User-Agent" cuando un medio bloquea, y hay fotos de medios nacionales que probablemente son de agencias | Alto | Abogado; los dos; Claude | Días |
| 8 | **El canal de correcciones no está probado**: el mail `contacto@` nunca se probó, el buzón vivía en el panel de la PC (en desuso) y una nota corregida no le avisa al lector que se corrigió | Alto | Los dos prueban; Claude agrega el aviso | Horas |
| 9 | **El repositorio crece a un ritmo que no aguanta un año**: 184 MB en un mes, unos 100 commits por día reescribiendo un archivo de 3 MB, fotos adentro de git, el respaldo pega en un límite de 300 MB hacia el 20/11, y las notas pierden su página a los 180 días | Alto | Los dos deciden; Claude | Semanas (ya está en el rediseño) |
| 10 | **La publicación depende de que pasen 2.000 pruebas cada media hora**, y un dato mal escrito a mano en un JSON congela la web. Junto con el punto 1, quiere decir que la web se puede quedar quieta un día entero sin que nadie lo sepa | Medio/alto | Claude | 1 a 2 días |

Si sólo se hace una cosa esta semana: **la 1 y la 2**. Si se hacen tres: sumar la **3**.

---

## 1. Legal y editorial

### L1. Notas de Policiales que salen solas y rompen la regla propia — **crítico**

- **Por qué importa.** "Nunca identificar a una víctima" es una de las reglas que no se negocian, y el
  criterio editorial lo detalla bien: ni el domicilio o la cuadra, ni un parentesco que la deje identificada
  (`CRITERIO-EDITORIAL.md:159` y la regla 13 de la IA, `CRITERIO-EDITORIAL.md:888`). En una ciudad de 40.000
  habitantes, la dirección más un parentesco identifica a la víctima. Y la página pública "Quiénes
  somos" dice que "una nota que acusa a alguien, que involucra una muerte o que nombra a un menor no sale sola"
  (`web/app/quienes-somos/page.js`, sección "Cómo trabajamos"). Hoy eso **no es cierto**, y una promesa
  pública incumplida es peor que no prometer.
- **Evidencia** (en `web/data/archivo.json`, todas con `como: "automatica"` y sin persona que las haya
  publicado):
  - `d1rexu`, "Detienen a un hombre por desobedecer una restricción de acercamiento" (13/10): trae el lugar con precisión, un parentesco de la víctima y los nombres de la fiscal y del juez. Es un caso de violencia
    familiar con una víctima que se puede identificar. Tres medios la contaron, verificación ALTA: el
    verificador no mira esto.
  - `1lxw5wx`, "Detienen a un hombre tras ser atrapado dentro de una casa" (7/10): **un solo medio**
    (Puntonueve), dice "acusado", "sospechoso", "registra antecedentes penales" y la esquina. La regla de
    `ingesta/fuentes.mjs:1262-1266` dice que "un solo medio de acá contando una detención sigue esperando a una
    persona", e `INVESTIGACION.md` (sección "Cómo se aplica hoy", punto 2) dice que "toda acusación espera a
    una persona". No esperó.
  - Por qué pasaron: el semáforo es una lista de palabras (`ingesta/fuentes.mjs:1109-1240`). "detenido" no
    encuentra "**Detienen**" ni "aprehenden" ni "quedó preso"; "acusado" y "víctima" se buscan sólo en el título
    y el comienzo, y en esas notas estaban más abajo.
  - Ninguna de las dos está en `web/data/retiradas.json`: siguen con página.
  - El análisis de `docs/etapa-6-9/ANALISIS.md` (A.3) dice "no encontré ningún falso negativo publicado". **Yo
    sí encontré estos dos**; no es que ese análisis esté mal hecho, es que buscó chicos y no víctimas adultas
    ni acusaciones de un solo medio.
- **Qué hacer.**
  1. Hoy: que una persona lea esas dos notas y decida si se retiran o se corrigen (sacar la cuadra y el
     parentesco). `web/data/retiradas.json` o el celular.
  2. Esta semana: que **Policiales de Balcarce espere siempre a una persona también en la web**, no sólo en
     las redes (hoy es una pregunta abierta en `docs/DECISIONES.md`, "Para los dos"). Con 15 policiales en un
     mes (`archivo.json`), es aprobar una cada dos días: no es una carga. Es decisión de Hernán.
  3. Mientras tanto, corregir "Quiénes somos" para que diga lo que de verdad pasa.
  4. Sumar a la instrucción de la IA y al verificador: en Policiales, nunca la dirección exacta ni el
     parentesco con la víctima, aunque la fuente lo diga (hoy está en el criterio pero no se controla).
- **Quién:** Hernán decide; Claude aplica. **Esfuerzo:** horas.

### L2. Reescribir con IA las notas de otros medios (derechos de autor y "hot news") — **alto, consultar abogado**

- **Por qué importa.** La investigación propia (`INVESTIGACION.md`, sección 7) lo resume bien: según el
  art. 28 de la ley 11.723, las noticias de interés general se pueden usar, y si se publican "en su versión
  original" hay que citar la fuente; contar el hecho con palabras propias es periodismo. Lo que no está
  pensado es **el modelo entero**: un sitio que, cada media hora, toma lo que publican tres radios y dos
  diarios de Balcarce y lo vuelve a publicar reescrito, con la fuente escondida en un desplegable cerrado, y
  compite por los mismos lectores en Facebook con posteos que **no nombran la fuente**
  (`INVESTIGACION.md`, "Zona gris (25/09)"). Aunque cada nota por separado sea legal, el conjunto puede
  verse como aprovechamiento del trabajo ajeno (en otros países se discute como "hot news" o competencia
  desleal; en Argentina no sé si hay un camino parecido: **abogado**). El riesgo más probable no es un
  juicio: es que los medios de acá **te bloqueen** (ya pasa, ver L3), te escrachen en sus redes o le
  reclamen a Meta.
- **Evidencia.** 460 de 1.120 notas del archivo son de Balcarce, casi todas de cinco medios locales
  (`archivo.json`; Radio Gabal, La Vanguardia, Puntonueve, Infórmese Primero, El Diario Balcarce). La firma
  del lector es "Redacción con IA" y la fuente queda en "Fuentes (N)", cerrado
  (`web/components/metadatos.js:104-110`, `CLAUDE.md`). Hay además **118 notas publicadas sin texto de la IA**
  (`guion` vacío) cuyo autor en los datos estructurados es el medio de origen
  (`web/components/metadatos.js:91-96`): si ese cuerpo es el de la fuente, es reproducción, no reescritura
  (no verifiqué de dónde sale cada uno).
- **Qué hacer.** (a) Una consulta con un abogado de medios sobre el modelo, no sobre una nota. (b) Poner la
  fuente **arriba**, en la primera línea ("Según Radio Gabal…") y en los posteos de redes: cuesta nada,
  cambia mucho la lectura de buena fe. (c) Hablar con los medios de Balcarce: un acuerdo simple (enlace
  destacado, mención en redes, quizás un intercambio) es la mejor protección y además una alianza.
  (d) Averiguar qué son esas 118 notas sin guion.
- **Quién:** abogado; los dos; Claude para (b) y (d). **Esfuerzo:** horas de Claude; la charla, lo que lleve.

### L3. Leer sitios que no quieren ser leídos — **alto**

- **Por qué importa.** Un bloqueo (403) o un `robots.txt` que dice "no" es la forma técnica en que un medio
  dice que no quiere que su contenido se tome así. Saltarlo es mala fe ante un juez y ante el propio medio.
- **Evidencia.** El robot baja el **artículo entero** de cada fuente (`ingesta/articulo.mjs:160`) y no
  encontré ningún lugar donde mire `robots.txt` (búsqueda en `ingesta/`). El mensaje de error del código
  recomienda, ante un bloqueo, "probar otro User-Agent" (`ingesta/ingesta.mjs:46`). `PENDIENTES.md` (Etapa 1)
  propone "probar desde Cloudflare las que bloquean a GitHub" y reactivar fuentes "que se apagaron por
  bloqueo". `docs/etapa-1-fuentes/ANALISIS.md:328` cuenta que NASA JPL da 403 al robot y contesta "al de un
  navegador". Las fotos se bajan con un nombre que imita a un navegador (`ingesta/fotos.mjs:82`).
- **Qué hacer.** Regla nueva y simple: **un bloqueo o un `robots.txt` que dice que no, es que no**. Mirar
  `robots.txt` antes de bajar un artículo; nunca cambiar el nombre del robot para pasar un bloqueo; sacar
  "probar otro User-Agent" del mensaje; si un medio importa, pedirle permiso por mail.
- **Quién:** Claude; los dos aprueban. **Esfuerzo:** 1 día.

### L4. Fotos de otros medios: el crédito no es una licencia — **alto**

- **Por qué importa.** Ya lo saben y lo aceptaron como riesgo (Hernán, 27/09, `INVESTIGACION.md` § 7). Lo
  que quizás no está dimensionado: muchas fotos de Infobae, TN, Clarín, La Nación y Perfil **no son de esos
  medios**, son de agencias (AFP, Reuters, AP, Getty, NA) que contratan empresas que rastrean usos con
  buscadores de imágenes y mandan cartas con montos en dólares. Poner "Foto: Infobae" en una foto de Getty es
  doble error: se usa sin licencia y se le da el crédito a otro. Y elegir justo la versión **sin marca de
  agua** (`ingesta/fotos.mjs:200-241`) es correcto para la estética, pero ante un reclamo no ayuda.
- **Evidencia.** `web/data/banco-fotos.json`: 1.334 entradas; entre los créditos más usados, "Foto: Infobae"
  60 + 25, TN 50, Clarín 42, La Nación 32, Ámbito 29, Perfil 24 (conteo propio).
- **Qué hacer.** Dejar de usar fotos de **medios nacionales** (ahí está casi todo el riesgo de agencias) y
  quedarse con: fotos propias, de organismos oficiales, de medios de acá con los que haya acuerdo, de
  Wikimedia con su licencia bien escrita, o la placa. Tener escrito qué se hace ante un reclamo: sacar la
  foto el mismo día, no discutir, consultar.
- **Quién:** los dos deciden; Claude. **Esfuerzo:** horas.

### L5. Presunción de inocencia, honor y Campillay — **medio**

- **Por qué importa.** La doctrina Campillay protege a quien atribuye la información a una fuente
  identificada, usa el potencial o reserva la identidad. Está bien pensada en el criterio (§ 5) y en la regla
  10 de la IA. Pero la protección depende de que **la nota diga** de qué fuente sale lo que acusa, y el
  verificador a veces se contradice: `1yc1lhn` ("Aprehenden a un joven…") lista dos medios y su verificación
  dice "La informó un solo medio" (`archivo.json`). Si los mensajes del verificador no son confiables, la
  persona que aprueba decide con datos malos.
- **Qué hacer.** Que una prueba controle que el texto de la verificación coincide con la cantidad de medios.
  Que en Policiales la atribución ("según informó la Policía", "según Radio Gabal") sea obligatoria en el
  primer párrafo.
- **Quién:** Claude. **Esfuerzo:** horas.

### L6. Rectificación o respuesta — **medio**

- **Por qué importa.** La investigación (`INVESTIGACION.md` § 1) dice que el derecho de rectificación tiene
  base en el Pacto de San José, sin ley que lo reglamente. Lo que falta no es teoría sino **proceso**: quién
  lee el mail, en cuánto tiempo se contesta, dónde queda anotado, cómo se publica la rectificación. Hoy el
  canal mismo no está probado (ver P3).
- **Qué hacer.** Un párrafo en `docs/11-OPERACION.md`: "si llega un pedido de rectificación o una carta
  documento: (1) se retira o se corrige en el día, (2) se anota en un registro privado, (3) se contesta por
  escrito, (4) si es una carta documento, abogado antes de contestar".
- **Quién:** los dos; abogado para el modelo de respuesta. **Esfuerzo:** 1 hora.

### L7. Quién es legalmente el medio — **medio, consultar abogado y contador**

- **Por qué importa.** Hoy el medio no tiene una persona responsable ni una figura legal visibles: "Lo hacen
  Hernán y Andrés" sin apellido (`web/app/quienes-somos/page.js`), sin domicilio legal ni CUIT. No es ilegal,
  pero (a) ante un reclamo, la responsabilidad recae sobre las personas físicas sin ningún resguardo; (b) para
  AdSense o vender publicidad hace falta facturar (monotributo o una sociedad); (c) Google y los lectores
  confían más en un medio con responsables con nombre completo.
- **Cosas que un dueño primerizo no suele saber que existen** (todas **no verificadas**, para preguntar):
  - **Registro de la marca "Radar Balcarce" en el INPI**: si otro la registra primero, puede obligar a
    cambiar el nombre.
  - **Registro de publicaciones periódicas en la DNDA** (Dirección Nacional del Derecho de Autor) e **ISSN**
    (lo da el CAICYT-CONICET para publicaciones en línea): creo que son voluntarios para un medio digital;
    protegen el título y dan seriedad.
  - **Dominio `radarbalcarce.com.ar` en NIC Argentina**: barato; evita que otro lo use para hacerse pasar por
    el medio.
  - **Base de datos personales ante la AAIP** (ley 25.326): `INVESTIGACION.md` § 5 ya lo analiza; el buzón de
    lectores y los contactos del celular son una base. Confirmar con el abogado si corresponde inscribirla.
- **Quién:** abogado y contador; los dos. **Esfuerzo:** trámites.

### L8. Privacidad: lo que la política no dice — **medio**

- **Evidencia y por qué importa.**
  - La página pública no nombra a Open-Meteo ni a DolarApi/Bluelytics, que reciben la IP de cada lector
    (`POLITICA-PRIVACIDAD.md`, "Qué ven otros servicios"; ya está en `PENDIENTES.md`).
  - El documento interno dice que lo que manda la gente "vive sólo en la PC del panel" (`POLITICA-PRIVACIDAD.md`),
    pero el panel de la PC **está en desuso** (`CLAUDE.md`, decisión del 8/10). Hoy no está escrito dónde
    quedan los datos de un vecino que escribe por WhatsApp ni quién los borra.
  - El texto de las **pistas** está en claro en un repositorio público (`web/data/pistas.json`); está en
    pendientes, pero conviene subirlo de prioridad si alguna pista nombra a una persona.
  - Lo que se escribe en "Escribir con IA" del celular va como dato de entrada de un workflow
    (`.github/workflows/panel.yml:77-79`). En un repositorio público, **los registros de Actions son
    públicos** y GitHub suele mostrar las variables de entorno de cada paso: el pedido puede quedar a la vista
    aunque el borrador viaje cifrado. El celular ya avisa "no poner nombres". **No verificado** en un registro
    real: conviene mirar uno.
  - Las notas que esperan a una persona (algunas con menores o acusados) se mandan a **Gemini y Groq en sus
    planes gratis**. En el plan gratis de Gemini, según sus términos, Google puede usar lo que se le manda para
    mejorar sus productos (verificar el texto vigente). El cifrado protege el repositorio, no eso.
- **Qué hacer.** Completar la política pública; escribir el circuito real del buzón; cifrar el texto de las
  pistas; mirar un registro del "Panel del celular" para confirmar qué se ve; evaluar pasar la clave de
  redacción a un plan pago sin uso de datos (o a Claude con tope de gasto) cuando el texto tenga datos de
  personas.
- **Quién:** Claude; los dos deciden el plan pago. **Esfuerzo:** horas.

### L9. Términos de Meta, Google y las plataformas sobre automatización e IA — **medio**

- **Meta.** Publicar por la API en la página propia está permitido. Los riesgos reales son otros:
  (a) **volumen**: 33 a 40 publicaciones por día con 53 seguidores en Facebook y 7 en Instagram
  (`docs/DECISIONES.md`, 15/10) es el patrón que los sistemas antispam miran; Meta ya bloqueó la API del 22 al
  24/09 por "actividad inusual" (`docs/07-REDES.md:603`); (b) desde 2025 Meta castiga el **"contenido no
  original"** (reposteo de lo de otros sin aporte), que es exactamente la crítica posible a un medio que
  reescribe; (c) el aviso de IA: los videos dicen "Voz generada con inteligencia artificial"
  (`redes/piezas.mjs:146`), bien; los posteos de Facebook escritos por IA no lo dicen (sacado el 26/09,
  `redes/elegir.mjs:321`). Para texto Meta no lo exige hoy (verificar); para audio realista, Meta pide usar su
  etiqueta "Información de IA", y no sé si la API la permite (**no verificado**).
- **YouTube y TikTok** (en estudio, `docs/DECISIONES.md`): las dos exigen marcar el contenido sintético
  realista al subirlo; si se automatiza, hay que confirmar que la API permite marcarlo.
- **Decisión pendiente que conviene tomar con coherencia**: los rastreadores de IA en `robots.txt`
  (`docs/DECISIONES.md`, "Para los dos"). Un medio que toma contenido de otros con IA y después bloquea a las
  IAs queda mal parado; uno que deja entrar a todos es coherente. Es una decisión, no un error.
- **Quién:** los dos; Claude revisa términos vigentes. **Esfuerzo:** horas.

---

## 2. Producto y calidad

### P1. Seis de cada diez notas no son de Balcarce — **alto**

- **Por qué importa.** El valor único de Radar Balcarce es Balcarce. Lo nacional reescrito (Messi, Colapinto,
  la jubilación) lo tiene cualquiera, mejor y antes. Además de no traer lectores, **diluye** la señal ante
  Google (ver G1) y ante el lector, que ve la portada llena de lo mismo que ve en todos lados.
- **Evidencia.** `archivo.json`: 1.120 notas, 460 de Balcarce (41 %). Por sección: Economía 168, Política 141,
  Fútbol 132, Automovilismo 125, Deportes 99, Argentina 85. Ejemplos: `1vmofxd` (Messi discute con un
  uruguayo, 7 medios), `7ohqni` (aumento de ANSES, 16 medios). Según `docs/etapa-2-5/ANALISIS.md`, el 74 % de
  las notas no tuvo **ninguna** visita, y las de acá que fueron a Facebook se leen cinco veces más.
- **Qué hacer.** En el rediseño, dar vuelta la pregunta: no "qué de afuera entra" sino "qué de afuera le
  cambia algo a alguien de Balcarce" (el aumento de la jubilación sí, contado para Balcarce: cuánto, cuándo,
  dónde se cobra acá; la discusión de Messi no). Lo nacional que quede, con `noindex` o en una sección aparte.
  El servicio diario (farmacia, clima, agenda, cortes de luz) es lo que hace volver: invertir ahí.
- **Quién:** los dos deciden; Claude. **Esfuerzo:** entra en las etapas 4 y 5.

### P2. Transparencia sobre las correcciones — **alto**

- **Por qué importa.** Un medio automático se va a equivocar seguido. Lo que construye confianza (y lo que
  Google mira para considerar un sitio como medio serio) es que **se vea** que corrige.
- **Evidencia.** No encontré en `web/components/` ni `web/app/` ningún aviso del tipo "Corregida el…" en una
  nota corregida (búsqueda de "corregida", "fe de erratas", "actualizada el"). Existe `correcciones.json`
  (141 KB) y la auditoría con IA corrige ortografía sola (regla 98), pero el lector no se entera de nada.
  `dateModified` del NewsArticle (`web/components/ficha.js:75-90`) es la única huella.
- **Qué hacer.** Una línea al pie de la nota corregida: "Corregida el 14/10: se sacó un dato erróneo". Una
  página pública corta de "Política de correcciones y criterio" (ya está en `IDEAS.md`).
- **Quién:** Claude; los dos aprueban el texto. **Esfuerzo:** horas.

### P3. El canal de contacto nunca se probó — **alto**

- **Evidencia.** `PENDIENTES.md`, "Lo que hace una persona": "Mandarse un mail de prueba a `contacto@`,
  `redaccion@` y `publicidad@`". Es decir: el mail que "Quiénes somos", "Contacto" y la política de privacidad
  ofrecen para pedir correcciones o el borrado de datos **puede no estar llegando a nadie**. El WhatsApp del
  medio (2266 51-1612) tampoco tiene escrito quién lo mira.
- **Qué hacer.** Hoy: mandarse los tres mails y un WhatsApp; anotar quién responde cada canal y en cuánto
  tiempo.
- **Quién:** Andrés y Hernán. **Esfuerzo:** 15 minutos.

### P4. Las notas pierden su página a los 180 días — **medio**

- **Por qué importa.** Un medio local es también **el archivo** del pueblo. Borrar páginas a los seis meses
  rompe los enlaces que la gente compartió, los que Google ya conoce (y que le daban autoridad al sitio) y el
  valor de búsqueda de largo plazo ("qué pasó con la obra de la calle tal").
- **Evidencia.** `CLAUDE.md` ("la página dura 180 días") y `web/lib/archivo.js` (`pierdeLaPagina`). El límite
  sale de los 20.000 archivos de Cloudflare Pages, no de una decisión editorial.
- **Qué hacer.** En la decisión del archivo (R2 o D1, antes del 2/12), que el objetivo sea **que ninguna nota
  con cuerpo pierda nunca su dirección**.
- **Quién:** los dos deciden; Claude. **Esfuerzo:** entra en esa decisión.

### P5. Las pistas que vienen de redes sociales — **bajo/medio**

- **Por qué importa.** Un tuit es la fuente más fácil de falsificar (muertes falsas de famosos, capturas
  inventadas). Si una pista se publica sola cuando "la cubren 3 o más medios"
  (`web/data/pistas.json`, campo `resultado`), está bien; pero cualquier nota propia hecha a partir de una
  pista con un solo origen debería esperar a una persona siempre.
- **Quién:** Claude revisa la regla. **Esfuerzo:** horas.

---

## 3. Operación (que ande sin nadie mirando)

### O1. Nadie se entera cuando algo se rompe — **crítico**

- **Por qué importa.** Un sistema que publica solo necesita **más** vigilancia que uno manual, no menos. Hoy
  está publicando a ciegas.
- **Evidencia.**
  - `web/data/vigilancia.json`: `"ultimoResumen": "2026-10-01"`, `"ultimoCierre": "2026-10-03"`; los avisos de
    pendientes, importantes y redes se cortan el 2/10. El resumen "de las 21, siempre" no llega desde hace dos
    semanas. La decisión del 12/10 ya dice que CallMeBot se quedó sin cupo y se pasa a mail, pero **todavía no
    se hizo** (`PENDIENTES.md`, "Lo que puede hacer Claude").
  - En esas dos semanas, "Actualizar la web" falló 24 veces el 4/10 y 17 el 11/10
    (`docs/etapa-10-operacion/extra-redes-y-fallas.txt`), y las estadísticas vienen en cero desde el 13/10
    (`docs/analiticas/diagnostico-salida.txt`). Nadie fue avisado de nada de eso.
  - El vigilante corre **dentro del mismo GitHub** que vigila: si se cae GitHub, se suspende la cuenta o se
    rompe el reloj, el vigilante se cae con todo.
- **Qué hacer.**
  1. Pasar los avisos a **mail** (lo urgente también por Telegram), como ya se decidió.
  2. Sumar un **vigilante de afuera**, gratis e independiente: un servicio de monitoreo (por ejemplo
     UptimeRobot o Healthchecks.io, verificar planes) que mire la web cada 5 minutos y, sobre todo, que avise
     **si no recibe una señal** del robot en 2 horas ("dead man's switch"). Así, si se cae GitHub entero,
     igual llega el aviso.
  3. Si el resumen de las 21 no llega, que eso mismo sea una alarma para ustedes (ponerse un recordatorio).
- **Quién:** Claude; una persona crea las cuentas. **Esfuerzo:** 1 día.

### O2. Una cuenta para todo, sin dos pasos — **crítico**

- **Por qué importa.** `radarbalcarce@gmail.com` es la llave de GitHub, Cloudflare (web, DNS, reloj),
  Meta, Gemini, Groq, Search Console, Tailscale y cron-job.org (`docs/08-INFRAESTRUCTURA.md`, "Las otras
  cuentas"). Si alguien la roba con un phishing, o si Google la suspende por actividad automatizada, se pierde
  el medio entero en una tarde. Y la verificación en dos pasos **está pendiente** (`PENDIENTES.md`).
- **Qué hacer**, en este orden:
  1. Un **gestor de contraseñas compartido** entre los dos (Bitwarden tiene plan familiar/organización barato;
     verificar). Ninguna contraseña en un papel suelto, un chat o un mail.
  2. Verificación en dos pasos en **todas**: Gmail, GitHub, Cloudflare, Meta (y exigirla en el Business
     Manager), DonWeb, Groq, cron-job.org. Mejor con llave de seguridad o *passkey* que con SMS.
  3. **Códigos de respaldo** impresos, en dos casas distintas.
  4. Teléfono y mail de recuperación de la cuenta de Gmail: que sean de uno de ustedes, no de un tercero, y
     anotar cuáles son.
  5. **Dos administradores** en todo lo que lo permita (Meta Business, Cloudflare, Search Console, GitHub), con
     sus cuentas personales; así, si una cuenta se pierde, la otra recupera.
  6. Sacar accesos viejos: el colaborador `balcardev` si ya no hace falta, el token de GitHub guardado en
     cron-job.org (`docs/08-INFRAESTRUCTURA.md:187-192`), el proyecto de Vercel.
- **Quién:** Andrés y Hernán (Claude no puede tocar cuentas). **Esfuerzo:** una tarde.

### O3. El dominio: quién es el dueño — **medio**

- **Evidencia.** En `docs/08-INFRAESTRUCTURA.md` (tabla "Las otras cuentas") la cuenta de DonWeb figura con
  un guión: **no está escrito a nombre de quién está el dominio**. Vence el 21/09/2027.
- **Qué hacer.** Confirmar a nombre de quién está, con qué mail; activar la renovación automática y el
  bloqueo de transferencia; renovar por varios años. Pensar en pasarlo a Cloudflare como registrador (cobra al
  costo y queda todo junto; pero eso concentra todavía más en una cuenta: decidirlo con O2 resuelto).
  Registrar `radarbalcarce.com.ar`.
- **Quién:** los dos. **Esfuerzo:** 30 minutos.

### O4. GitHub es el único lugar — **crítico/alto**

- **Por qué importa.** El código, los datos (la "base de datos" son los JSON del repositorio), el robot y el
  respaldo están en la misma cuenta de GitHub. El respaldo semanal deja un archivo... **en GitHub**
  (`.github/workflows/respaldo.yml:5-8`, lo dice él mismo); GitLab y R2 **no están configurados**
  (`docs/salud-tecnica/ANALISIS.md` § 3.3; `PENDIENTES.md`). Y **nunca se probó restaurar** desde un respaldo.
- **Un riesgo que no vi anotado:** los términos de GitHub para Actions dicen (de memoria, **verificar el texto
  vigente**) que no se puede usar para "computación sin servidor" ni para actividades no relacionadas con
  construir, probar, desplegar o publicar el software del repositorio. Un robot de noticias que corre 300 veces
  por día (4.220 corridas en 14 días, `docs/etapa-10-operacion/tabla-minutos-14d.md`) como motor de producción
  de un medio es, como mínimo, discutible. Si GitHub suspende la cuenta, no hay apelación rápida, y hoy se
  perdería todo junto.
- **Qué hacer.** (a) Configurar ya el espejo en GitLab y la copia en R2 (los pasos están en el propio
  workflow), y bajar una copia mensual a la PC o a Google Drive. (b) **Probar una restauración** una vez: con el
  respaldo, levantar el sitio en otra cuenta de Cloudflare de prueba. (c) Esto le da un motivo más al plan de
  "mucho menos GitHub y más Cloudflare" de `docs/DECISIONES.md`.
- **Quién:** los dos crean cuentas; Claude configura y prueba. **Esfuerzo:** 1 día.

### O5. Bus factor: 74.000 líneas de código mantenidas por IA para dos personas que no programan — **alto**

- **Por qué importa.** Hay unas 74.000 líneas de JavaScript (28.000 de pruebas) y 27.000 líneas de
  documentación (conteo propio sobre los archivos de git). Todo lo mantiene Claude. Si mañana Claude no está
  disponible, sube de precio, o el que retome no entiende las 166 reglas acumuladas, nadie puede arreglar una
  falla. No es una crítica: es un riesgo que hay que saber que se tiene.
- **Qué hacer.** (a) Un **"modo mínimo"** documentado: qué apagar para que quede sólo lo esencial y seguro (web
  con farmacia, clima, agenda y notas aprobadas por una persona; redes apagadas). (b) Un **"botón de pánico"**
  escrito en `docs/11-OPERACION.md`: cómo frenar toda publicación automática en 2 minutos desde el celular
  (deshabilitar el workflow "Actualizar la web" y poner `REDES_ACTIVAS` en "No"). (c) Tener el contacto de un
  programador de la zona que pueda mirar en una emergencia. (d) El rediseño ya apunta a simplificar: medirlo
  en líneas y reglas eliminadas, no sólo agregadas.
- **Quién:** Claude escribe; los dos lo prueban una vez. **Esfuerzo:** 1 día.

### O6. La web se congela por una prueba o por un dato mal escrito — **medio/alto**

- **Por qué importa.** "Actualizar la web" corre las ~2.000 pruebas **antes de publicar**, cada media hora
  (`.github/workflows/actualizar.yml:87`). Si una prueba falla por la fecha, por un cambio externo o por un JSON
  escrito a mano sin `motivo`/`cuando`/`por` (`CLAUDE.md`, "Cosas que muerden"), no se publica nada. Es
  "fallar cerrado": seguro en teoría, pero con los avisos muertos (O1) la web queda quieta horas sin que nadie
  lo sepa. Pasó el 4/10 y el 11/10.
- **Qué hacer.** Separar: las pruebas corren cuando cambia el **código** (al hacer push), no cuando cambian
  las **noticias**. En producción, validar la forma de los datos y, si un archivo de una persona está mal,
  ignorar esa entrada y avisar, en vez de congelar todo.
- **Quién:** Claude. **Esfuerzo:** 1 a 2 días.

### O7. Topes de gasto y cupos gratis — **medio**

- **Por qué importa.** Hoy casi todo es gratis, y eso es frágil de dos formas: (a) los cupos gratis los puede
  achicar Google o Groq cualquier día, y el medio se queda sin redactar; (b) el plan nuevo es usar modelos de
  Claude "donde rindan" con un tope de US$ 25 por mes (`docs/DECISIONES.md`). Algo que un primerizo no sabe:
  **en Google Cloud, un "presupuesto" sólo avisa, no corta el gasto**. El 29/09 Google suspendió una clave paga
  (`redes/vigilar.mjs:141-145`).
- **Qué hacer.** Antes de cargar cualquier clave paga: un **límite duro** de gasto mensual en la consola de
  cada proveedor (Anthropic lo permite; en Google, verificar si el plan pago de la API tiene tope real o sólo
  alerta), y una variable que apague la IA paga si se pasa. Escribir en un solo lugar cuánto se gasta hoy
  (hay tres versiones distintas, ver R1).
- **Quién:** una persona configura topes; Claude el interruptor. **Esfuerzo:** horas.

### O8. Vencimientos que nadie vigila — **bajo/medio**

- La **llave del panel del celular** vence al año y "nadie avisa" (`docs/08-INFRAESTRUCTURA.md`, tabla de
  vencimientos). Las dos **voces** vencen el 29/09/2027 y viven en un solo proyecto de Google. El token del
  reloj se creó **sin vencimiento** (`redes/vigilar.mjs:129-130`): cómodo, pero si se filtra sirve para
  siempre. **Qué hacer:** que el vigilante también avise del vencimiento de las llaves del celular (se puede
  anotar la fecha al crearla) y rotar el token del reloj una vez por año. **Quién:** Claude. **Esfuerzo:** horas.

---

## 4. Seguridad

### S1. La llave del celular es, en la práctica, la llave de todos los secretos — **alto**

- **Por qué importa.** Cada persona usa en su celular un token de GitHub con permiso de **escribir contenido**
  y **disparar workflows** (`docs/08-INFRAESTRUCTURA.md:232-234`). Con "escribir contenido" se puede cambiar
  cualquier archivo de código que después corre en Actions **con los secretos** (por ejemplo un `.mjs` de
  `ingesta/`). Es decir: quien robe o encuentre ese token puede llevarse el token de Meta (que no vence), las
  claves de IA y el token de Cloudflare. Además el token vive en el almacenamiento del navegador
  (`web/public/panel/app.js:57-60`) en el **mismo dominio** que la web pública: un problema de seguridad en
  cualquier página de `radarbalcarce.com` lo podría leer (no encontré ninguno: React escapa los textos y los
  datos estructurados están bien escapados, `web/components/ficha.js:20`).
- **Qué hacer.** (a) Que el celular **no escriba archivos**: que sólo dispare un workflow (permiso de Actions)
  y que sea el workflow el que guarde la decisión. Así el token del celular no puede tocar código. (b) Tokens
  con vencimiento de 90 días y aviso. (c) Pasar el panel a un subdominio propio (`panel.radarbalcarce.com`).
  (d) Que el vigilante avise cuando cambie `web/data/celular-llaves.json` (ver S2).
- **Quién:** Claude. **Esfuerzo:** 1 a 2 días.

### S2. El cifrado de lo que espera a una persona — **medio (está bien hecho, con tres agujeros alrededor)**

- **Lo bueno.** La criptografía es la correcta y está bien usada: una llave nueva al azar por sobre (AES-256-GCM)
  cerrada con la llave pública de cada celular (RSA-OAEP con SHA-256), sin librerías raras
  (`panel/cifrado.mjs:1-90`). No veo errores de los clásicos.
- **Los agujeros, que no son del cifrado sino de lo que lo rodea.**
  1. **Cualquiera que pueda escribir en el repositorio puede sumar su propia llave** a
     `web/data/celular-llaves.json` y desde la corrida siguiente recibe todo lo nuevo. Y como se guardan las
     últimas seis (`panel/cifrado.mjs:56`, `slice(-LLAVES_MAXIMAS)`), sumar llaves **saca en silencio** las más
     viejas, que pueden ser las de ustedes.
  2. La "huella" que evita reescribir el archivo es un resumen sin clave del contenido
     (`panel/cifrado.mjs:101-104`): quien sospeche qué dice una nota (porque la fuente es pública) puede
     confirmarlo. Riesgo bajo, pero existe.
  3. Lo que queda a la vista: el identificador de cada nota, la sección y el motivo ("necesita ojo humano:
     \"niño\"") en `web/data/portada.json` (`pendientes`), los títulos de las amarillas que no son de menores,
     el texto de las pistas y lo que se escribe en "Escribir con IA" (ver L8).
- **Qué hacer.** Aviso del vigilante ante cualquier cambio en las llaves; no sacar llaves en silencio (fallar y
  avisar si se pasa de seis); usar un resumen con clave secreta. **Quién:** Claude. **Esfuerzo:** horas.

### S3. Registros públicos y tokens derivados — **bajo**

- En un repositorio público, los **registros de Actions los puede leer cualquiera**. GitHub tapa los secretos
  que conoce, pero no los que se **derivan** en la corrida: el token de la página de Facebook se obtiene a
  partir del token del sistema (`redes/meta.mjs:110-117`) y `sinToken` sólo tapa el del sistema
  (`redes/meta.mjs:37-40`). Si un error de Meta lo imprimiera, quedaría a la vista. **Qué hacer:** marcar ese
  token derivado como secreto en la corrida (`::add-mask::`). **No verificado** que haya pasado alguna vez.
- `auditar-redes.yml:64` pega un dato de entrada (`desde`) directo en el comando. Sólo lo puede disparar alguien
  con permiso de escritura, así que el riesgo es chico; igual conviene pasarlo por variable, como ya se hace
  en los demás.
- Las acciones de GitHub se fijan por versión (`actions/checkout@v4`), no por huella exacta. Para un proyecto
  así es aceptable; `wrangler` sí está fijado (`cloudflare-deploy.yml`).
- **Quién:** Claude. **Esfuerzo:** 1 hora.

### S4. Lo que está bien en seguridad (para no asustar de más)

No hay claves en el repositorio ni en el historial (búsqueda propia de los formatos de Google, Groq, Meta,
GitHub y Tavily); las claves de Gemini van en el encabezado y no en la dirección (`reels/reescritura.mjs:283-290`);
la de CallMeBot se borra de lo que se muestra; ningún workflow corre con pedidos de afuera (`pull_request`), así
que un extraño no puede disparar nada con los secretos; el panel tiene una política de seguridad estricta
(`web/public/_headers`, bloque `/panel/*`); los permisos de cada workflow están acotados.

---

## 5. SEO y crecimiento

### G1. Por qué Google trae el 1 % — **alto**

- **Lo medido.** En 11 días sanos: Facebook 69 %, directo 30 %, **Google 1 %** (6 visitas)
  (`docs/analiticas/diagnostico-salida.txt`). Search Console está verificado desde el 24/09 pero "nadie lo
  mira" (`docs/analiticas/ANALISIS.md:250`), y se decidió dejar el SEO para después de la renovación
  (`docs/DECISIONES.md`, 12/10).
- **Las causas probables, de la más a la menos importante** (no verificables sin Search Console):
  1. **Es un dominio de tres semanas sin enlaces de nadie.** Es normal que Google tarde meses.
  2. **El patrón del sitio**: cientos de notas por mes, escritas por IA a partir de otros medios, la mayoría
     nacionales. Google tiene una política explícita contra el **"abuso de contenido a escala"** (muchas
     páginas generadas, con o sin IA, que no aportan nada propio) y su sistema de calidad mira **el sitio
     entero**: las notas nacionales pueden estar arrastrando hacia abajo a las de Balcarce.
  3. Para cada nota nacional ya hay 16 versiones mejores (la de La Nación, la de Infobae…): la reescrita
     nunca va a ganar.
  4. Las páginas se borran a los 180 días (P4) y varias notas cambiaron de dirección (hay 301, bien hechos).
- **Qué hacer.** (a) Que alguien mire Search Console **una vez por semana** desde ya, aunque el SEO grande
  espere: es la única forma de saber si Google indexa o castiga. (b) `noindex` para lo nacional sin ángulo
  local (o no publicarlo). (c) Las notas de Balcarce con datos que nadie más tiene (horarios, lugares,
  nombres de instituciones, la farmacia) son las que Google puede premiar.
- **Quién:** los dos miran; Claude aplica (b). **Esfuerzo:** 15 minutos por semana + horas.

### G2. Detalles técnicos de SEO — **bajo/medio**

- **Bien hecho:** canónico, `NewsArticle` con autor coherente con la firma, sitemap y sitemap de noticias,
  `robots.txt` que no indexa las vistas previas, redirecciones 301, `lang="es-AR"` (`SEO.md`,
  `web/app/robots.js`, `web/components/ficha.js`). **No hace falta `hreflang`**: hay un solo idioma.
- **A corregir:**
  - Los sitemaps ofrecen notas que la propia página marca como `noindex`: `sitemap-news.xml` incluye todas
    las de las últimas 48 horas sin mirar si tienen cuerpo (`web/app/sitemap-news.xml/route.js`), y
    `sitemap.js` incluye todas las de la portada (`deNotas`), mientras la nota sin cuerpo lleva `noindex`
    (`web/app/nota/[id]/page.js:59`, `web/lib/cuerpo.js:64`). Le da a Google señales cruzadas.
  - `SEO.md` está viejo en dos cosas: dice que `robots.txt` bloquea el feed (`web/app/robots.js` dice que se
    desbloqueó el 8/10) y recomienda "el alta en Google Publisher Center" para Noticias. Hasta donde sé, desde
    2024 Google ya no acepta pedidos de inclusión en Noticias por esa vía: decide solo (**verificar**).
  - Nunca se midieron PageSpeed ni Core Web Vitals; hay dos videos de 9,9 MB en `/compartir` (`PENDIENTES.md`).
- **Quién:** Claude. **Esfuerzo:** horas.

### G3. Crecer sin depender de Facebook — **medio**

- **Por qué importa.** Con 69 % de las visitas desde Facebook y Meta ya habiendo bloqueado la API una vez, un
  cambio de algoritmo o una restricción de la página corta al medio.
- **Ideas que suelen funcionar para un medio local en Argentina** (no verificadas para este caso):
  - **Canal de WhatsApp** del medio: es donde se informa la gente de un pueblo. Hoy no hay API pública para
    publicar en canales, así que sería a mano (dos o tres por día, lo importante).
  - **Resumen diario por mail** a lectores (no sólo a ustedes).
  - **Alianzas** con instituciones (municipio, clubes, Cooperativa) para que enlacen al sitio: son los enlaces
    que Google valora.
  - **Google Business Profile**: hasta donde sé, Google no lo da a negocios sólo en línea, sin atención en
    persona; no contar con eso (**verificar**).
- **Medir bien antes de decidir:** el 43 % de las páginas vistas viene de afuera de Argentina (EE. UU., China,
  Suecia, Irlanda: casi seguro robots) y las mediciones vinieron en cero del 13 al 15/10
  (`docs/analiticas/diagnostico-salida.txt`). Las decisiones de "qué funciona" hoy se toman con datos sucios.
- **Quién:** los dos; Claude para el mail y las mediciones. **Esfuerzo:** variable.

---

## 6. Datos y arquitectura (lo que va a doler en un año)

### A1. Git como base de datos — **alto**

- **Evidencia.** El repositorio pesa 184 MB comprimido con 2.755 commits en un mes, unos 100 por día
  (`git count-objects`, `git log`, conteo propio). `web/data/archivo.json` pesa 2,9 MB con 1.120 notas y se
  reescribe en cada corrida; con 3.500 notas serán unos 9 MB, 48 veces por día. Las fotos (63 MB, 862 archivos)
  están en git. El respaldo a R2 por `wrangler` tiene un límite de 300 MB por archivo y el paquete ya pesaba
  172 MB el 11/10: se llega hacia el **20/11/2026** (`docs/salud-tecnica/ANALISIS.md:126`).
- **Por qué importa.** Cada vez más lento de clonar y respaldar, cerca de los límites de GitHub (avisa con
  archivos de 50 MB y repositorios de varios GB), y cada choque entre el robot y una persona se resuelve "gana
  el robot" en `web/data/` (`docs/08-INFRAESTRUCTURA.md:139-142`).
- **Qué hacer.** Ya está en el rumbo del rediseño (Cloudflare D1 o R2). Ponerle fecha: **antes del 20/11**, por
  el respaldo; antes del 2/12, por el archivo de notas.
- **Quién:** los dos deciden; Claude. **Esfuerzo:** semanas.

### A2. 2.000 pruebas de detalle y 166 reglas — **medio**

- Las pruebas cuidan sobre todo detalles del código viejo (`docs/DECISIONES.md`, 15/10, ya lo reconoce). El
  riesgo no es que haya muchas: es que **frenan la publicación** (O6) y que ninguna probó el caso que
  importaba (L1). Pocas pruebas sobre lo que de verdad no puede pasar (menores, víctimas, acusaciones, sepelios,
  cuerpo mínimo) valen más que mil de formato.
- **Quién:** Claude, en el rediseño. **Esfuerzo:** entra en el rediseño.

### A3. Listas de palabras escritas a mano — **medio**

- El semáforo, las secciones, las figuras y lo que es "de acá" son listas de palabras
  (`ingesta/fuentes.mjs`). Cada error se arregla sumando una palabra, y cada palabra trae falsos positivos
  ("El Niño", "un precio menor") o deja huecos ("Detienen" frente a "detenido"). `docs/etapa-6-9/ANALISIS.md`
  (A.3) llega a la misma conclusión: hace falta que alguien (o un modelo bueno) **lea**. Mi aporte: mientras
  el modelo no esté probado, la red de seguridad tiene que ser **por sección** (Policiales de acá: siempre una
  persona), no por palabra.

---

## 7. Cosas raras, contradicciones y "anda de casualidad"

### R1. Documentos que se contradicen (cada uno con su arreglo: actualizar el viejo) — **bajo**

| Dónde | Qué dice | Qué es cierto hoy |
|---|---|---|
| `.github/workflows/actualizar.yml:3-16` | "lo dispara cron-job.org"; las decisiones salen de `decisiones.json` que exporta el panel de la PC | El reloj es el Worker de Cloudflare; el panel de la PC está en desuso; las decisiones llegan del celular |
| `docs/07-REDES.md` ("Quién la despierta") | cron-job.org despierta a Redes | El Worker (desde el 15/10) |
| `redes/vigilar.mjs` (textos de aviso) y `docs/08-INFRAESTRUCTURA.md:196-198` | "cron-job.org pudo haberse desactivado solo" | Ya lo reconoce el propio documento; cambiar el texto |
| `docs/08-INFRAESTRUCTURA.md:19` y `:376` | "Lo único que se paga es el dominio" | `docs/DECISIONES.md` habla de un tope de US$ 25 por mes y la memoria de Claude de US$ 10 por mes de Gemini desde octubre |
| `docs/08-INFRAESTRUCTURA.md:53` | "PC de Hernán: el panel de la PC (respaldo)" | En desuso desde el 8/10 |
| `POLITICA-PRIVACIDAD.md` | El buzón de lectores vive en el panel de la PC | Ver L8 |
| `INVESTIGACION.md`, "Cómo se aplica hoy" punto 2 | "toda acusación espera a una persona" | Falso desde la regla 96 (`ingesta/fuentes.mjs:1262-1266`) y por los huecos de L1 |
| `web/app/quienes-somos/page.js` | "Una nota que acusa a alguien… no sale sola" | Ver L1 |
| `SEO.md:13` y `SEO.md:42` | `robots.txt` bloquea `/feed.xml` | Desbloqueado el 8/10 (`web/app/robots.js`) |
| `.github/workflows/fijar-piezas.yml:58` | "se repetiría cada 2 de octubre" | El horario es el 10/10 (`fijar-piezas.yml:20`); está bien protegido por el año, sólo es el comentario |

**Qué hacer:** que la prueba de documentos que ya está en pendientes (`pruebas/docs.test.mjs`) controle
también estas afirmaciones clave, en especial lo que **se promete al público** ("Quiénes somos", privacidad).
**Quién:** Claude. **Esfuerzo:** horas.

### R2. "Anda de casualidad" — **medio**

- **El vigilante "en verde" sin avisar.** Con un problema, la corrida termina bien y deja un aviso amarillo
  (`docs/08-INFRAESTRUCTURA.md:309-311`). Como el envío de WhatsApp falla en silencio, las corridas del
  vigilante se ven bien mientras no avisan nada. Es el caso de O1, visto desde adentro.
- **La detección de "web vieja" lee el `sitemap.xml`** (`docs/08-INFRAESTRUCTURA.md:280`): si un día el sitemap
  cambia de forma (por ejemplo, al pasar el archivo a R2), el vigilante deja de saber si la web se actualiza.
- **"Policiales es seguro porque lo grave sigue esperando"** (`ingesta/fuentes.mjs:1158-1159`): hasta ahora
  anduvo porque los medios de acá publican pocos policiales y casi siempre con palabras de la lista. Con más
  fuentes, deja de andar (ver L1 y A3).

---

## Lo que no pude verificar desde acá

- Si `contacto@`, `redaccion@` y `publicidad@` reciben mails.
- Qué cuentas tienen hoy verificación en dos pasos, quién administra cada una y a nombre de quién está el
  dominio.
- Qué muestran los registros públicos de Actions (si el pedido del celular o algún título sensible aparece).
- Qué indexó Google, si hay alguna acción manual o castigo en Search Console.
- El texto vigente de los términos de GitHub Actions, de Gemini (plan gratis), de Meta (contenido no original,
  etiqueta de IA por API) y de YouTube y TikTok. Cito de memoria y puede haber cambiado.
- Si las 118 notas publicadas sin guion tienen el texto de la fuente o uno propio.
- Si los videos de piezas que esperan a una persona quedan como artefactos descargables antes de aprobarse
  (en un repositorio público, los artefactos los puede bajar cualquier usuario de GitHub).

## Para llevarle a un abogado (una consulta, no un juicio)

1. ¿El modelo de reescribir a diario con IA las notas de los medios locales, citando la fuente en un
   desplegable, tiene riesgo de reclamo por propiedad intelectual o competencia desleal? ¿Cambia algo poner la
   fuente arriba o tener un acuerdo con esos medios?
2. ¿Qué responsabilidad tienen Hernán y Andrés como personas por una nota automática que identifique a una
   víctima? ¿Conviene una sociedad o un seguro?
3. ¿Hace falta inscribir alguna base ante la AAIP (buzón de lectores, contactos)?
4. ¿Conviene registrar la marca en el INPI y el título en la DNDA?
5. Un modelo de respuesta a una carta documento y a un pedido de rectificación.
6. Fotos: ¿qué exposición real hay por usar fotos de medios nacionales con crédito pero sin licencia?

---

## Preguntas para otras IAs (para contrastar lo que digo)

Están escritas para pegarlas tal cual en ChatGPT, Gemini, Grok o Meta AI. No tienen datos personales ni
secretos.

1. "Soy dueño de un sitio de noticias local en Argentina que toma, cada media hora, las noticias publicadas
   por radios y diarios de mi ciudad y las reescribe con inteligencia artificial, citando la fuente con un
   enlace en un desplegable al pie. ¿Qué riesgos tengo según la ley 11.723 (art. 28) y la jurisprudencia
   argentina sobre competencia desleal? ¿Qué cambia si pongo la fuente en la primera línea?"
2. "Según las políticas actuales de Google Search, ¿un sitio que publica entre 30 y 50 notas por día
   reescritas por IA a partir de otros medios, la mayoría noticias nacionales y una parte locales, corre
   riesgo de ser considerado 'scaled content abuse'? ¿Afecta eso también a las páginas buenas del mismo
   dominio? ¿Qué conviene hacer con las notas nacionales: noindex, sacarlas o dejarlas?"
3. "¿Los términos de servicio de GitHub permiten usar GitHub Actions en un repositorio público, unas 300
   veces por día, como motor de producción de un sitio de noticias (buscar noticias, escribirlas con IA,
   publicar en redes)? Citá el texto exacto de los términos vigentes."
4. "En Argentina, ¿un medio digital de noticias que sólo publica en la web y en redes sociales necesita algún
   registro obligatorio (DNDA, ENACOM, AAIP, otro)? ¿Cuáles son voluntarios pero recomendables (marca en el
   INPI, ISSN, registro de publicaciones periódicas)?"
5. "Una página de Facebook nueva, con 50 seguidores, publica por la API de Meta entre 33 y 40 piezas por día
   (enlaces, fotos, reels con voz sintética), con la leyenda 'Voz generada con inteligencia artificial'.
   ¿Qué riesgos tiene con las reglas actuales de Meta sobre contenido no original, spam y etiquetado de IA?
   ¿Existe un parámetro en la Graph API para marcar un video como generado con IA?"
6. "En Argentina, una nota policial trae el lugar exacto donde ocurrió un hecho de violencia familiar y un parentesco
   de la víctima con el agresor. ¿Eso puede considerarse identificar a la víctima según la ley 26.485 y
   las recomendaciones de buenas prácticas periodísticas? ¿Qué responsabilidad tiene un medio que lo
   republica de otro?"
7. "Estoy guardando datos cifrados en un repositorio público: cada sobre usa AES-256-GCM con una llave al
   azar, cifrada a su vez con RSA-OAEP (SHA-256) para cada dispositivo autorizado, cuyas llaves públicas
   están en un archivo del mismo repositorio que pueden editar todos los colaboradores. Además guardo un
   SHA-256 sin clave del contenido en claro para saber si cambió. ¿Qué debilidades tiene este diseño y cómo
   las corrijo?"
8. "¿Cuál es la mejor forma gratuita de enterarme si un sistema automatizado dejó de funcionar, de manera
   independiente del propio sistema (que corre en GitHub Actions y publica en Cloudflare Pages)? Compará
   opciones tipo 'dead man's switch' por mail o Telegram, con sus límites gratis actuales."
