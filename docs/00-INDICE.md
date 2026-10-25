# 00 · Índice: Radar Balcarce de punta a punta

*Actualizado el 25/10/2026, después de la limpieza de documentos (`docs/propuestas/LIMPIEZA-DE-DOCUMENTOS-25-10.md`). Es la puerta de
entrada: qué es el proyecto, por dónde pasa una noticia y qué documento cuenta cada cosa. Si un documento y el código no coinciden, manda
el código.*

## Qué es Radar Balcarce

Un **medio digital automático** de Balcarce, provincia de Buenos Aires, en `radarbalcarce.com`, con Instagram `@radarbalcarce` y la página
de Facebook "Radar Balcarce". Cada media hora lee **125 feeds de 76 medios** (de Balcarce, la zona y el país; la cuenta exacta, en
`FUENTES.md`), junta la misma noticia contada por varios, decide qué sale sola y qué espera a una persona, la escribe con IA (Gemini), la
verifica contra las fuentes, arma el sitio y lo sube a Cloudflare. Varias veces por día publica en Facebook e Instagram con dos voces de IA.
Un vigilante avisa por mail si algo falla (WhatsApp de respaldo) y dos informes por mail, a las 8:15 y a las 21:15, cuentan cómo va el día.

**Todo corre en Cloudflare desde el 23/10/2026, con la PC apagada**: el motor que arma la web en Workers Builds, las tareas (vigilancia,
informes, pistas, auditoría IA, ilustraciones, redes) en el Worker `radar-balcarce-tareas`, el video en el repositorio público de render y
el reloj en el Worker `radar-balcarce-reloj`. Los workflows viejos de GitHub quedan de vuelta atrás. Lo que el sistema no puede decidir
solo lo deciden Hernán y Andrés desde el **panel del celular** (`radarbalcarce.com/panel/`).

El principio que decide todo es una pregunta: **¿qué valor tiene esta nota para alguien que vive en Balcarce?** Lo de Balcarce entra todo;
lo de afuera, por cuántos medios lo cuentan, **sin cupos**; se informa sin gritar y cada nota dice de dónde sale y quién la escribió.

## El recorrido de una noticia

Cada media hora (de 23:00 a 6:59, una vez por hora) el reloj pide una vuelta al motor, que hace los pasos 1 a 8; las redes y la
vigilancia corren aparte, en el Worker de tareas.

| # | Paso | Qué pasa | Dónde se cuenta |
|---|---|---|---|
| 1 | Ingesta | Se leen los feeds con sus fechas; lo raspado de más de 72 horas no entra; el filtro de entrada deja afuera otro país, policiales y consejos de afuera (se decide después del cruce) | `docs/02-INGESTA.md` |
| 2 | Cruce | Se juntan las notas del mismo hecho sin encadenar noticias distintas (reglas 184 y 322) | `docs/02-INGESTA.md`, `docs/flujos/CRUCE-COHERENTE.md`, `docs/etapa-10-operacion/HECHO-PRINCIPAL.md` |
| 3 | Selección | Sección (son 14), puntaje, semáforo (rojo, amarillo, verde), "de acá"; lo de afuera sale con 3 medios distintos (2 en las áreas chicas) y lo muy contado (8 o más) va primero | `docs/03-SELECCION.md`, `docs/CRITERIO-EN-UNA-PAGINA.md` |
| 4 | Lectura con IA | Una ficha por nota: saca, cambia la sección, junta repetidas; nunca destraba | `docs/03-SELECCION.md` (paso 8) |
| 5 | Redacción | Gemini escribe título, bajada y cuerpo con todas las fuentes numeradas y el texto completo de las que entran (6.000 caracteres cada una, 18.000 en total) y `CRITERIO-EDITORIAL.md` § 12 | `docs/04-REDACCION.md` |
| 6 | Verificación | Cada dato contra las fuentes, el semáforo otra vez, el nivel de verificación; sin 70 palabras de cuerpo no se publica | `docs/04-REDACCION.md` |
| 7 | Publicación | Lo que decidió una persona, la fecha de la nota (la mediana de sus fuentes), "llega tarde" (24 horas lo de afuera, 36 lo de Balcarce), retiradas y correcciones, la foto | `docs/03-SELECCION.md` (pasos 10 a 13), `docs/05-FOTOS.md`, `docs/09-PANEL.md` |
| 8 | Web | `web/data/*.json` → Next.js estático → Cloudflare Pages: portada de 36 horas, 500 notas con página en el sitio (`TOPE_DE_NOTAS`) y el resto en el archivo permanente en R2 (encendido); mapas por mes para Google | `docs/06-WEB.md`, `docs/salud-tecnica/ARCHIVO-PERMANENTE-IMPLEMENTACION.md` |
| 9 | Redes | Facebook (posteo y espejo en Instagram) y piezas de video con voz: clima, farmacia, tres repasos | `docs/07-REDES.md`, `CRITERIO-REDES.md` |
| 10 | Vigilancia | Mira la web, las vueltas, las redes, las claves de IA, las voces y los minutos de Workers Builds; avisa por mail | `docs/08-INFRAESTRUCTURA.md`, `docs/11-OPERACION.md` |

## Cada cosa, un solo lugar

| Qué | Dónde vive |
|---|---|
| El estado del día | `CLAUDE.md` («Estado») y `docs/TRASPASO.md` |
| Lo que falta hacer, con quién y cuándo (la única lista de tareas) | `PENDIENTES.md` |
| Qué se decidió, por qué y quién | `docs/DECISIONES.md` (lo nuevo arriba) |
| Las reglas que no se rompen y las pruebas que las cuidan | `docs/10-REGLAS-Y-PRUEBAS.md` (R1 a R39) |
| El criterio editorial y la instrucción de la IA (§ 12, la lee tal cual) | `CRITERIO-EDITORIAL.md` |
| El criterio en una página, con cada número y dónde vive | `docs/CRITERIO-EN-UNA-PAGINA.md` |
| Los números del criterio | `ingesta/criterio.mjs` **y** la tabla de `CRITERIO-EDITORIAL.md` § 11 (una prueba controla que digan lo mismo) |
| Cómo suenan y qué dicen las piezas de redes | `CRITERIO-REDES.md` (el código lo lee tal cual) |
| Las fuentes | `ingesta/fuentes.mjs` y `ingesta/fuentes-cruce.mjs`; `FUENTES.md` es el registro **generado** |
| Lo que la IA sabe de Balcarce | `ingesta/perfil-balcarce.md` (va tal cual a la IA) |
| Claves, secretos, workflows, Workers, costos y vencimientos | `docs/08-INFRAESTRUCTURA.md` |
| El uso diario (corregir, retirar, la pausa general, subir los Workers, qué mirar si algo no sale) | `docs/11-OPERACION.md` |
| La historia | `docs/historico/HISTORIA.md` y los mensajes de los commits |

## Los documentos vivos

### Cómo funciona (`docs/`)

| Documento | Qué cuenta |
|---|---|
| `docs/01-ARBOL.md` | Cada carpeta y archivo versionado (del 17/10: faltan los de `infra/` nuevos, `scripts/medir/` y `docs/proyecto/`) |
| `docs/02-INGESTA.md` | Las fuentes, cómo se leen, las fechas, el filtro de entrada, el cruce y el texto completo de la nota original |
| `docs/03-SELECCION.md` | Sección, puntaje, semáforo, "de acá", los medios que pide lo de afuera, la lectura con IA, la fecha, "llega tarde" y la decisión final |
| `docs/04-REDACCION.md` | Cómo escribe la IA, el verificador, los arreglos que no inventan, "sin cuerpo no se publica" y la firma |
| `docs/05-FOTOS.md` | El banco de fotos: la foto sale de las fuentes de la nota (regla 319), sin marca, con el crédito; las ilustraciones |
| `docs/06-WEB.md` | Cómo se arma el sitio: `generar-datos.mjs`, `web/data/`, la tapa, la dirección fija, las repetidas, el archivo en R2 y el SEO |
| `docs/07-REDES.md` | Facebook e Instagram: el interruptor, los posteos, las piezas, los repasos, el contrato del día, el libro y Meta |
| `docs/08-INFRAESTRUCTURA.md` | Qué corre dónde, los Workers, los depósitos R2, las claves de IA (y cómo ordenar los proyectos de Google), los secretos y los costos |
| `docs/09-PANEL.md` | El panel del celular |
| `docs/10-REGLAS-Y-PRUEBAS.md` | **Las 39 reglas** (R1 a R39), qué números viejos absorbe cada una y qué pruebas la cuidan |
| `docs/11-OPERACION.md` | El manual de uso diario, la pausa general (tarea 5 bis) y cómo se suben los Workers (tarea 5 ter) |
| `docs/12-GLOSARIO.md` | Cada palabra propia del proyecto |
| `docs/13-EFEMERIDES.md` | "Un día como hoy" y los feriados |
| `docs/CRITERIO-EN-UNA-PAGINA.md` | Qué sale, qué no y por qué, en una página |
| `docs/DECISIONES.md` | El registro de decisiones y la tabla de cuál manda cuando dos se contradicen |
| `docs/TRASPASO.md` | Corto: cómo se trabaja y dónde estamos |
| `docs/CHECKLIST-JUEVES-29-10.md` | Lo mínimo para el jueves 29/10 (pasa al histórico el 30/10) |
| `docs/efemerides-octubre-para-revisar.md` | Las efemérides de octubre (pasa al histórico el 1/11) |
| `docs/COMO-FUNCIONA-HOY.html` y `docs/REGLAS-Y-PROMPTS.html` | Cómo funciona, para leer en el celular (del 16/10), y los textos y listas que deciden (se rehace con `node scripts/medir/armar-reglas-html.mjs`) |

### Cómo funciona cada pieza (carpetas de `docs/`)

| Documento | Qué cuenta |
|---|---|
| `docs/flujos/CRUCE-COHERENTE.md` | El cruce que no encadena noticias distintas (regla 184) |
| `docs/flujos/REPETIDAS-2-0.md` | Lo de acá que no sale repetido (reglas 193 a 196) |
| `docs/flujos/REVISION-DEL-ARCHIVO.md` | La revisión del archivo por tandas (regla 212), andando desde el 25/10 |
| `docs/flujos/NOTA-DESDE-MAIL.md` | Los pasos para armar una nota desde un mail de prensa |
| `docs/etapa-10-operacion/HECHO-PRINCIPAL.md` | Una historia, un solo hecho (regla 322) |
| `docs/etapa-10-operacion/MINUTOS-DE-WORKERS-BUILDS.md` | Los minutos de Workers Builds y sus palancas (dos prendidas el 24/10) |
| `docs/etapa-10-operacion/FOTOS-EN-R2.md` | El paso a paso para llevar las fotos a R2 (falta hacerlo) |
| `docs/etapa-10-operacion/NOTAS-CON-DATOS-PILOTO.md` | Los bloques de datos propios (regla 323, apagados) |
| `docs/salud-tecnica/ARCHIVO-PERMANENTE-IMPLEMENTACION.md` | El archivo permanente en R2 (encendido el 23/10) |
| `docs/seo/AUDITORIA-SEO-LLM.md` | SEO y asistentes de IA; desde el 25/10 incluye lo básico que era `SEO.md` |
| `docs/redes/ACORTADOR-DE-ENLACES.md`, `FOTO-CAMBIADA-DESPUES-DEL-POSTEO.md` | Los enlaces cortos (regla 282, apagados) y la foto que cambia después del posteo (regla 283) |
| `docs/redes/ARCHIVO-DE-PIEZAS.md`, `FORMATOS-POR-RED.md`, `GUION-DEL-DIA-EJEMPLO.md`, `PLANTILLAS-DE-PIEZAS.md`, `VOCES-NUEVAS.md` | Dónde se guardan los videos, qué se publica en cada red, un día de guiones, las escenas animadas y cómo recrear las voces |
| `docs/etapa-1-fuentes/LISTA-ELEGIDA.md`, `ANALISIS.md`, `BALCARCE-INVESTIGACION.md` | La lista de fuentes elegida el 15/10 y su análisis (los lee `scripts/medir/generar-revision.mjs`) |

### Planes y auditorías que siguen abiertos

| Documento | Qué cuenta |
|---|---|
| `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md` | Qué sale en redes y cuándo; en sus anexos, las otras redes (tabla, plan de reels y cómo automatizarlas) |
| `docs/proyecto/SITIO-POR-WORKER-PLAN.md` | El sitio armado por un Worker (se decide desde el 29/10) |
| `docs/proyecto/NOTA-DE-PUNTA-A-PUNTA.md` | Cómo se hace una nota, de punta a punta (24/10, con lo que cambió después) |
| `docs/proyecto/PANEL-REDISENO.md`, `COSTOS-Y-RECURSOS.md` | El panel rehecho (propuesta) y los costos |
| `docs/auditoria-2-0/` (B, C, D, E, F, H, J, K, L y R) | Los módulos de la auditoría 2.0 con preguntas abiertas (`PENDIENTES.md` § 5), el estado verificado (F) y los mapas de Google (R) |
| `docs/propuestas/` | Lo que sigue abierto; la lista, en `docs/propuestas/LEEME.md` |

### En la raíz y en otras carpetas

| Documento | Qué cuenta |
|---|---|
| `CLAUDE.md` | Lo que Claude lee al empezar: reglas, cosas que muerden, estado y dónde tocar cada cosa |
| `CRITERIO-EDITORIAL.md`, `CRITERIO-REDES.md` | Los dos criterios únicos (el código los lee tal cual) |
| `FUENTES.md` | Todas las fuentes (**generado**: no se edita a mano) |
| `PENDIENTES.md`, `IDEAS.md` | La única lista de tareas y el banco de ideas |
| `MEDIA-KIT.md`, `FORMATOS.md`, `PERFILES.md` | La identidad visual, las medidas de cada red y las biografías |
| `PUBLICIDAD.md`, `COMERCIAL.md`, `INVESTIGACION.md`, `POLITICA-PRIVACIDAD.md` | Los avisos, la guía de comercios (código dormido), lo legal y lo interno del buzón |
| `web/README.md`, `ingesta/README.md`, `motor/README.md` y los `LEEME.md` de `infra/` | Cómo correr cada parte |

### Lo histórico (`docs/historico/`, no se mantiene)

Fotos de un día o de un plan: lo que dicen puede ya no valer. Ahí están la lista vieja de reglas (`REGLAS-1-A-327.md`), las auditorías y
análisis ya cerrados (con sus carpetas de origen: `auditoria-2-0/`, `auditoria-opus/`, `criterio/`, `etapa-*`, `redes/`, `seo/`…), el plan de
la mudanza a Cloudflare (`etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md` y `PLAN-DE-CAMBIO.md`), la historia (`HISTORIA.md`) y las listas
viejas de pendientes y traspaso. Una prueba exige que algunos sigan ahí.

**Código dormido** (existe, tiene pruebas, producción no lo usa; lo despiertan o lo borran los dueños): `comercial/`, `motor/`, `sePuedeSola`
(`redes/elegir.mjs`) y `agruparPorHecho` (`ingesta/cruce.mjs`).

## Cómo se mantiene esta documentación

- **Se cambia el código, se cambia el documento de su área**, en el mismo commit.
- **Un arreglo nuevo** se anota en la regla que corresponde de `docs/10-REGLAS-Y-PRUEBAS.md` (columna «absorbe» y sus pruebas) o, si es de
  verdad nuevo, como **R40**; siempre con su prueba.
- **Un criterio editorial** se cambia en `CRITERIO-EDITORIAL.md` (y sus números, también en `ingesta/criterio.mjs`).
- **Una fuente** se cambia en `ingesta/fuentes.mjs` o `ingesta/fuentes-cruce.mjs` y después se corre `node ingesta/listar-fuentes.mjs`.
- **Algo que falta**, a `PENDIENTES.md`; **una decisión**, a `docs/DECISIONES.md`; **el estado del día**, a `CLAUDE.md`; **un documento que
  ya cumplió**, a `docs/historico/` con `git mv`.
