# G. Notas únicas con datos propios: que Radar Balcarce no sea un resumen de fuentes

*Informe de diseño, 24/10/2026. Solo lectura: no se tocó código. Se basa en `CLAUDE.md`, `docs/CRITERIO-EN-UNA-PAGINA.md`, `CRITERIO-EDITORIAL.md`, `docs/seo/AUDITORIA-SEO-LLM.md`, `FUENTES.md` y en lo que hay hoy en `web/data/portada.json` y `web/data/archivo.json`. Los ejemplos "después" son propuestas armadas a mano para mostrar la idea: no están publicados ni verificados.*

## 0. En diez líneas

1. Hoy una nota de Radar es una buena reescritura de lo que dicen las fuentes. Para Google y para los asistentes de IA eso es "lo mismo que ya hay": no hay motivo para citarnos a nosotros y no a la fuente.
2. Lo que ninguna fuente tiene y nosotros sí: **nuestro archivo** (500 notas con página y el histórico mensual), **el cruce** (sabemos qué medio dijo qué y cuál no lo dijo), **los datos locales vivos** (clima, farmacia de turno, agenda, útiles) y **la memoria diaria** (`clima-historia.json` desde el 9/10, `dolar-historia.json` desde el 25/9).
3. Ya hay una base: los **antecedentes** (hasta 3 notas propias de los últimos 30 días que lee la IA, `antecedentesDe` en `reels/reescritura.mjs`) y "Seguí leyendo". Pero los antecedentes son **invisibles** para el lector y para Google, salvo que la IA los meta en una oración.
4. La idea central: **dos capas**. Capa A, el cuerpo que escribe la IA, verificado como hoy. Capa B, **bloques que arma el código** (no la IA) con datos propios: "Antes en Radar", "Qué dicen las fuentes", "Para Balcarce", tablas de cifras, preguntas. El código no alucina: copia un dato de un archivo y lo muestra con su fecha y su origen. Eso evita tocar el verificador.
5. Cada bloque sale solo si **hay dato real**. Sin dato, no sale el bloque (nunca relleno).
6. Tres pilotos de una semana, de bajo riesgo: **P1 "Antes en Radar"**, **P2 "Qué dicen las fuentes" en las muy contadas (≥8 medios)**, **P3 "Para Balcarce" con datos vivos en tres temas**.
7. Costo extra en cupos de IA: **cero** en P1 y P3 (todo es código y archivos) y cero en P2 si se hace por plantilla.
8. Lo legal no se investiga y menores/víctimas no se tocan: los bloques **heredan el semáforo** de la nota y no se arman nunca en una nota roja.
9. Cómo se mide: Search Console (impresiones y clics contra un grupo de control), Cloudflare Web Analytics (tiempo, páginas por visita), compartidos y referrers de asistentes de IA.
10. Lo que NO se propone: sitios de datos aparte, scrapear lo que no es público, ni sumar fuentes pagas.

---

## 1. Qué datos únicos se pueden agregar (priorizados)

**Valor** = para Google/IA y para el lector. **Riesgo** = de error o de problema. **Cupo IA** = pedidos extra por nota.

| # | Dato único | De dónde sale (ya en el repo o público y gratis) | Valor | Esfuerzo | Riesgo | Cupo IA |
|---|---|---|---|---|---|---|
| 1 | **"Antes en Radar"**: notas propias anteriores sobre la misma historia, con fecha y enlace (línea de tiempo) | `web/data/archivo.json`, `web/data/historico/*.json`, `antecedentesDe`, `temas`, `ingesta/huellas-significado.mjs` | Alto: enlaces internos y contenido que solo tenemos nosotros | Bajo | Bajo (títulos y fechas nuestras) | 0 |
| 2 | **"Qué dicen las fuentes"**: coincidencias y diferencias de cifras, fechas y nombres entre medios, y quién dijo qué | `fuentesConsultadas`, `seSabe`, `noConfirmado`, `numerosDe` (`ingesta/verificar.mjs`), textos de `ingesta/fuentes-para-la-ia.mjs` | Alto en las muy contadas: es **el** valor de agregar | Medio | Medio (comparar bien) | 0 con plantilla |
| 3 | **"Para Balcarce"**: qué cambia acá, con dato local | `ingesta/perfil-balcarce.md`, `agenda.json`, `farmacias`, `clima`, `utiles` (en `portada.json`), `ingesta/contactos-agenda.json`, una ficha local curada a mano (§2.4) | Alto para el lector de acá y para búsquedas locales | Medio | Medio (no inventar la conexión: criterio § 4) | 0 |
| 4 | **Cronología** de un hecho en curso (obra, caso, trámite) en una página de tema | `temas` (`web/app/tema/[ranura]`), archivo propio | Alto: una página que crece sola | Medio | Bajo | 0 |
| 5 | **Cifras en tabla** (descuentos por etapa, calendario, cuotas, horarios) | Del propio cuerpo ya verificado; el código lo pasa a tabla | Medio-alto: las IA y Google citan tablas | Bajo-medio | Medio (que la tabla diga lo mismo que el texto: se controla por código) | 0 |
| 6 | **Contexto histórico propio**: "tercera nota nuestra sobre esto desde el 9/10", "la última lluvia así fue…" | `clima-historia.json`, `dolar-historia.json`, `archivo.json`, `historico/` | Alto cuando se puede contar con datos nuestros | Medio | Medio: con poca historia hay que decir "desde que medimos (fecha)" | 0 |
| 7 | **FAQ estructurada** (2 o 3 preguntas por nota) | De `claves` y `seSabe`, que ya existen y ya se verifican | Medio: los asistentes de IA toman pregunta/respuesta. Google ya muestra poco FAQ | Medio | Bajo si solo reordena `seSabe` | 0 |
| 8 | **Glosario** (sigla o término definido una vez, enlazado) | Lista curada a mano: INTA, ARBA, ARSAT, boletín oficial… | Medio: páginas de definición | Medio | Bajo | 0 |
| 9 | **Resumen semanal o mensual por tema** ("Qué pasó en el Concejo en octubre") | `archivo.json` + `temas`; ya existe la idea del repaso (`web/lib/notas-propias.js`) | Alto: contenido que no caduca | Medio-alto | Bajo (reordena notas ya verificadas) | 0 o 1 por resumen |
| 10 | **Rankings y estadísticas locales** (goles de los equipos de acá, lluvias, sesiones) | `futbol.json`, `clima-historia.json`, `agenda.json`, `estadisticas.json` | Medio | Medio | Bajo-medio | 0 |
| 11 | **Citas atribuidas** (frase textual con nombre y cargo, enlazada a la fuente) | Texto de la fuente; el verificador ya cuida citas y el tope de copia (12 palabras) | Medio | Bajo | Medio: tope de copia | 0 |
| 12 | **Efemérides de Balcarce** cuando coinciden con el tema | `ingesta/efemerides-curadas.json`, `web/data/efemerides-elegidas.json` | Bajo-medio | Bajo | Bajo | 0 |
| 13 | **Mapa estático** del lugar de la obra o el evento | Coordenadas curadas a mano de lugares conocidos | Medio | Alto | Medio | 0 |
| 14 | **Datos nacionales ya usados** (dólar, Open-Meteo, ESPN, Jolpica) como ficha al pie | `dolar-historia.json`, `f1.json`, `futbol.json`, clima | Medio en economía y deportes | Medio | Medio | 0 |

Aclaración sobre INDEC y BCRA: en el repo **no hay hoy una fuente propia de INDEC ni de BCRA**; solo aparecen si una nota los cita. Sumarlos sería una fuente pública nueva y gratuita (se puede, pero es un trabajo aparte y se revisa antes de prender).

**Lo que dejo afuera por ahora:** un mapa interactivo (pesa y choca con la CSP de `_headers`) y cualquier dato que requiera scrapear páginas sin feed ni API (frágil).

**Orden recomendado:** 1 Antes en Radar → 3 Para Balcarce → 2 Qué dicen las fuentes → 5 Tablas → 4 Cronología/temas → 6 Contexto histórico → 9 Resúmenes → 7 FAQ → 8 Glosario → el resto.

---

## 2. Cómo se enlaza con el sistema actual

### 2.1 Principio para no romper el verificador

La regla de oro es "lo que escribe la IA se verifica contra la fuente". Para un dato propio hay **tres caminos**, de menos a más riesgo:

1. **Lo arma el código, no la IA (el preferido).** Un bloque "Antes en Radar: 20/10, *título de nuestra nota*" no es texto libre: es un título y una fecha propios. No necesita verificación de IA; se cuida con **pruebas de código** (que el id exista en el archivo, que la fecha sea anterior, que la nota no sea roja).
2. **La IA lo usa, pero el dato viaja como "fuente" para el verificador.** Ya pasa con los **antecedentes**: `verificar()` recibe `fuente.antecedentes` (`ingesta/verificar.mjs`, ~línea 464) y acepta números, nombres y fechas que estén ahí. La misma puerta sirve para una **"ficha de datos propios"**: se arma por código, se le pasa a la IA como un bloque más (marcado "información propia, con su fecha", como hoy `ANTECEDENTES` en `reels/reescritura.mjs`, ~línea 280) y se suma al texto contra el que se verifica. El verificador sigue rechazando cualquier cifra que no esté ni en las fuentes ni en la ficha.
3. **La IA redacta una comparación entre fuentes (el más riesgoso).** Solo en las muy contadas y solo después de que el código calculó las diferencias. La IA ordena en castellano; no descubre. Para la primera semana se hace sin IA.

> Regla propuesta (a anotar en `docs/10-REGLAS-Y-PRUEBAS.md` con su prueba; el número lo define quien la escriba, porque CLAUDE.md dice 284 y los commits recientes hablan de la 307): **«Todo dato propio que sale en una nota viene de un archivo del repo, con su fecha, y lo arma el código. La IA no inventa datos propios: solo puede usar los de la ficha que se le da.»**

### 2.2 Qué archivos tocaría

| Archivo | Qué tocaría | Para qué |
|---|---|---|
| `ingesta/fuentes-para-la-ia.mjs` | Función nueva `fichaDeDatosPropios(nota, contexto)` que devuelve antecedentes, datos locales y diferencias entre fuentes (cifras que aparecen en todas, en algunas o en una sola, con `numerosDe`). Hoy este archivo ya marca copias y numera fuentes | Que lo propio se calcule en un solo lugar, sin red |
| `reels/reescritura.mjs` | (a) Pasar la ficha al pedido junto a `ANTECEDENTES`; (b) sumarla al origen del verificador igual que los antecedentes; (c) NO pedirle a la IA que arme los bloques B. `REESCRITURA.diasDeAntecedentes` (30) y `antecedentesMaximo` (3) quedan para la IA; el bloque visible usa su propia ventana | La capa A no cambia |
| `ingesta/verificar.mjs` | Casi nada. Una función chica `verificarBloques(nota)` solo de código: enlaces existentes, cifras de la tabla presentes en el cuerpo o la ficha, ningún bloque en nota roja, antecedentes sin menores ni víctimas (reusar `ingesta/menores.mjs`) | Prueba de los bloques B |
| `web/lib/bloques-de-nota.js` (nuevo) | Funciones puras, una por bloque: `antesEnRadar`, `queDicenLasFuentes`, `paraBalcarce`, `tablaDeCifras`, `preguntas` | Se prueban sin red |
| `web/scripts/generar-datos.mjs` | Llamar a los bloques después de armar la nota y guardarlos en un campo nuevo `bloques` (separado de `cuerpo`) | `cuerpo` sigue cumpliendo `web/lib/cuerpo.js` (70 palabras). Si el campo va dentro del JSON de la nota no hace falta tocar la línea `git add` de `actualizar.yml`; si fuera un archivo nuevo de `web/data/`, sí |
| `web/app/nota/[id]/page.js` y `web/components/` (nuevo `bloques.js`) | Dibujar los bloques **después del cuerpo y antes de "Fuentes"**, con `h2` propio y `data-pagefind-body` | Lo que ve el lector. Estilos con las variables de `globals.css`, sin cargar nada de afuera |
| `web/lib/datos-estructurados.js` | `about`/`mentions` desde `temas`; `FAQPage` solo cuando existan preguntas; la tabla va como `<table>` bien armada | Que los asistentes lean estructura. **El marcado debe decir lo que la página dice** (principio de la auditoría SEO) |
| `web/lib/para-agentes.js` (`/agentes/*.json`) | Exponer `bloques` por nota | Citable por asistentes |
| `web/app/tema/[ranura]` | Que muestre la cronología completa | Cronología (#4) |
| `CRITERIO-EDITORIAL.md` | Un apartado en § 7 ("Lo que ve el lector: bloques propios") y la regla de la ficha en § 4. Sin tocar las marcas `<!-- … -->` ni § 12 | El criterio sigue siendo uno solo |
| `pruebas/` | Bloque sin dato no sale; nota roja sin bloques; enlace roto no sale; cifra de tabla = cifra del cuerpo; "Para Balcarce" solo con ficha vigente | Regla "al arreglar, una prueba" |

### 2.3 Cómo se verifica cada tipo de dato propio

| Dato propio | Cómo se verifica |
|---|---|
| Un antecedente | Es título y fecha del archivo: se copia, no se reescribe. Se comprueba que el id exista, que no esté retirado (`retiradas.json`, `revision-archivo.json`) y que la fecha sea anterior a la nota |
| Una cifra de tabla | Se arma con las cifras que el verificador ya aceptó en el cuerpo (`numerosDe(cuerpo)`). Si una cifra de la tabla no está en el cuerpo, el bloque no sale |
| Una diferencia entre fuentes | El código compara las cifras normalizadas (`EQUIVALENCIAS`) por fuente. Si coinciden, dice "coinciden en…". Si difieren, las muestra **literales** con el medio al lado. Sin redacción libre |
| Un dato local vivo | Viene de `portada.json` (clima, farmacias, útiles) con su hora, como la página del clima. Si es viejo, no sale |
| Un contexto histórico | Se **cuenta por código** sobre `archivo.json` o `clima-historia.json` y sale de plantilla ("Es la tercera nota que publicamos sobre esto desde el 9/10"). Nunca "la primera vez en la historia" |
| Una cita | Debe estar textual en alguna fuente y no pasar de 12 palabras (el verificador ya lo cuida) |
| Una FAQ | Cada respuesta es una frase de `seSabe`, ya verificada, sin reescribir |

### 2.4 La ficha local curada a mano (lo único que no sale de código)

Para "Para Balcarce" en temas que se repiten (impuestos provinciales, tasas, servicios, rutas, salud, educación) hace falta un lugar con datos de acá que **una persona** carga y revisa una vez: dónde se hace el trámite, teléfono, horario. Propuesta: `ingesta/fichas-locales.json`, con `tema`, `texto` corto, `fuente` (URL oficial), `revisado` (fecha) y `por`. Mismo patrón que `ingesta/contactos-agenda.json`. Regla: **si `revisado` tiene más de 90 días, el bloque no sale** (no mostrar un teléfono viejo). Sin esto, "Para Balcarce" se reduce a lo que ya diga la fuente.

---

## 3. Riesgos

| Riesgo | Qué pasa si no se cuida | Cómo se cuida |
|---|---|---|
| **Alucinación** | La IA "mejora" un dato propio o inventa una conexión local | El bloque B lo arma el código; la IA solo ve la ficha y el verificador la trata como fuente. "Si la fuente no lo dice, no se inventa la conexión" (criterio § 4) sigue valiendo |
| **Dato propio viejo** | Un teléfono, una fecha o un "tercera vez" que ya no es | Todo bloque lleva fecha; las fichas vencen a los 90 días; los conteos dicen "desde que medimos (fecha)" |
| **Copyright** | Reproducir de más lo que dijo una fuente | Solo cifras, nombres y una frase corta atribuida (tope 12 palabras ya vigente), con enlace. Las cifras son hechos, no texto |
| **Lo legal no se investiga** | Meterse a explicar si algo es delito o está permitido | Los bloques no juzgan ni explican la ley. Si la nota es judicial, "Para Balcarce" no sale. No hay bloques en Policiales |
| **Menores y víctimas** | Un antecedente nombra a un chico o a una víctima y lo vuelve a poner a la vista | **Ningún bloque en una nota roja**, y los antecedentes pasan por `ingesta/menores.mjs`. Se excluyen los antecedentes de Policiales y de hechos con menores. La lista roja no se toca |
| **Política y Policiales esperan a una persona** | Un bloque automático sale en una nota que está esperando | Los bloques heredan el estado de la nota: si espera, el bloque también |
| **Repetir un error** | Una nota vieja tenía un error y el antecedente lo repite | Solo se enlazan notas que siguen publicadas; el título sale de la versión con las correcciones de la auditoría (`conCambiosDeLaAuditoria`) |
| **Más texto no es mejor** | Notas largas y repetitivas que Google ve como relleno | Bloques cortos (3 a 5 ítems), solo con dato real. El cuerpo sigue corto y claro; lo único se agrega **al lado**, no adentro |
| **Cupos de IA** | La clave gratis permite unos 500 pedidos por día, con 450 ya usados en notas | Ningún bloque B pide IA. Un resumen semanal opcional usa 1 pedido por resumen (con `OPENROUTER_API_KEY` de respaldo) |
| **Archivos en Cloudflare** | Páginas de glosario y resúmenes suman archivos (15.900 de 20.000 medidos el 15/10) | Máximo unas 50 páginas nuevas al principio y se revisa antes de sumar más |
| **Datos estructurados que Google no pide** | `FAQPage` casi no da resultados enriquecidos | El FAQ se hace por valor para IA, no para Google; solo se marca lo que la página dice |
| **Diferencias falsas entre fuentes** | El código marca "difieren" cuando es "40%" contra "cuarenta por ciento" | Se compara con cifras normalizadas y se revisan a mano las 20 primeras en modo sombra |

---

## 4. Tres pilotos para una semana (bajo riesgo)

Todos con un **interruptor** (variable de GitHub, apagado por defecto, como `REDES_ACTIVAS` o `FOTOS_MENORES_OFICIALES`) y aplicados a **la mitad de las notas** (por ejemplo, id par) para tener un grupo de control en la misma semana.

### P1. "Antes en Radar"
- **Qué**: debajo del cuerpo, si hay 1 o más notas propias previas sobre la misma historia (misma huella o mismo tema, hasta 90 días, máximo 4), se muestra una lista con fecha y enlace.
- **Dónde**: `antecedentesDe` ya calcula la base; nuevo `antesEnRadar` en `web/lib/bloques-de-nota.js`.
- **Riesgo**: bajo. Solo títulos y fechas propios; se excluyen rojas, retiradas y Policiales.
- **Mide**: clics a esos enlaces, páginas por visita y tiempo en página (Cloudflare), y a las 2 semanas, si Search Console indexa mejor las notas enlazadas.

### P2. "Qué dicen las fuentes" en notas muy contadas (≥8 medios)
- **Qué**: un bloque de 3 a 5 líneas: qué cifras coinciden en todos los medios, cuáles las dice solo uno y cuáles difieren. Versión 1 **sin IA**, por código.
- **Dónde**: `fuentes-para-la-ia.mjs` (calcular) y `bloques-de-nota.js` (plantilla).
- **Riesgo**: medio. Por eso primero en **modo sombra** (se calcula y se guarda sin mostrar), se revisan 20 a mano y recién ahí se prende.
- **Mide**: tiempo y scroll en esas notas contra las muy contadas sin bloque; impresiones de consultas largas en Search Console ("cuánto es el descuento de…"); referrers de asistentes de IA (`chatgpt.com`, `perplexity.ai`, `claude.ai`) en Cloudflare.

### P3. "Para Balcarce" con datos vivos en tres temas
- **Qué**: un bloque corto en notas de **impuestos y trámites provinciales** (ARBA, boletín oficial), **clima/alertas** y **servicios** (cortes, rutas), con qué cambia, un dato local vivo (clima de 48 h, farmacia de turno, número útil) y cuándo se actualizó. Los datos salen de `ingesta/fichas-locales.json` y de `portada.json`.
- **Riesgo**: medio; por eso tres temas y solo con ficha vigente.
- **Mide**: clics desde la nota a Farmacias, Útiles y Agenda, y consultas locales ("… en Balcarce") en Search Console.

### Cómo se mide que sirve
| Qué | Dónde | Señal de que sirve |
|---|---|---|
| Impresiones y clics por página | Search Console → Rendimiento, filtrando por URL (con bloque contra sin bloque) | +20% contra el control en 3 o 4 semanas |
| Posición en consultas locales | Search Console, consultas con "Balcarce" | Sube contra el control |
| Tiempo en página y páginas por visita | Cloudflare Web Analytics (`web/data/estadisticas.json`) | +15% de tiempo y más clics a otras notas |
| Compartidos | `web/components/compartir.js` y el canal de WhatsApp; sumar un parámetro de origen al enlace (sin datos personales) | Más compartidos por nota que el control |
| Citas de IA | Cloudflare → AI Crawl Control; referrers; Bing → AI Performance | Aparece algún referrer o cita |
| Calidad | Auditoría con IA (`web/data/auditoria-ia.json`) y correcciones | **Cero** bloques corregidos por error. Un error en un bloque apaga el interruptor |

Límite honesto: con el tráfico de un sitio nuevo, Search Console tarda y nadie lo importó todavía (punto B1 de la auditoría SEO). La primera semana sirve para ver que **nada se rompe y nadie corrige un bloque**; el efecto en Google se juzga a las 3 o 4 semanas.

---

## 5. Formato ideal por tipo de nota, con ejemplos reales

Regla general: título, bajada y cuerpo **como hoy**; los bloques B van después, cortos, con fecha y origen. Nunca un bloque vacío.

### 5.1 Una nota de Balcarce

Estructura: cuerpo → **Datos** (tabla, si hay cifras) → **Para Balcarce** (solo con ficha vigente) → **Antes en Radar** (si corresponde) → **Fuentes** (como hoy).

**Ejemplo real: `az8510` "Endurecen penas por agredir a docentes, médicos y municipales"** (sección Balcarce; un solo medio, Diario La Vanguardia; verificación MEDIA).

*ANTES (hoy en la portada):* título, bajada y 3 párrafos. Los datos están en prosa: Ley 15.647, artículo 74 bis del Decreto-Ley 8031/73, de 5 a 30 días de arresto o multas del 50% y 100% del haber de un oficial de la Policía bonaerense, y las penas se duplican frente a menores. Una oración dice "incluido Balcarce". Ninguna conexión concreta con la ciudad ni con otras notas nuestras.

*DESPUÉS (propuesta):*

> **Endurecen penas por agredir a docentes, médicos y municipales** *(título, bajada y cuerpo iguales)*
>
> **La norma en cifras** *(tabla armada por código desde el cuerpo ya verificado)*
>
> | Concepto | Dato |
> |---|---|
> | Norma | Ley 15.647 |
> | Qué modifica | Artículo 74 bis del Decreto-Ley 8031/73 (Código de Faltas) |
> | Arresto | De 5 a 30 días |
> | Multa | 50% a 100% del haber mensual de un oficial de la Policía bonaerense |
> | Si hay alumnos, pacientes o menores presentes | Las penas se duplican |
> | Sancionada / publicada | 29/09/2026 / 21/10/2026 (Boletín Oficial) |
>
> **Para Balcarce** *(de la ficha local, revisada el 24/10 por una persona; si no hay ficha vigente, este bloque no sale)*
> - La norma rige en toda la provincia, también en el partido de Balcarce *(ya lo dice la fuente)*.
> - A quién alcanza acá: escuelas, el Hospital y servicios municipales *(solo si la ficha los lista con su fuente oficial)*.
> - Dónde se hace la denuncia: teléfono y dirección tomados de `ingesta/contactos-agenda.json` o de la lista de útiles *(con fecha de revisión)*.
>
> **Antes en Radar** *(por código)*
> *No sale en este caso.* Las notas que hoy el sistema relacionaría por tema (violencia en la Estudiantina, 20 y 23/10) involucran a un menor y a un hecho de violencia: la regla de menores las excluye. Está en el ejemplo a propósito, para mostrar que la regla corta antes de armar el bloque.
>
> **Fuentes (1)** *(como hoy)*

**Qué aporta de verdad:** la tabla (citable por un asistente de IA) y, si se carga la ficha, el dato local. **Lo que todavía no existe en el repo** es el dato de Balcarce (cuántas escuelas, qué hospital): sin ficha, la nota queda con tabla y nada más. No se inventa.

### 5.2 Una nota nacional muy contada (≥8 medios)

Estructura: cuerpo → **Tabla** → **Qué dicen las fuentes** → **Para Balcarce** → **Preguntas** → **Fuentes (N)**.

**Ejemplo real: `1f59ye` "ARBA otorga rebajas de hasta el 40 por ciento para cancelar deudas"** (9 medios: Infórmese Primero, Página/12, Noticias Argentinas, El Día, 0221, QZ Noticias, El Eco de Tandil, iProfesional, Radio Gabal).

*ANTES (hoy en la portada):* título, bajada ("…La adhesión comenzará el lunes 26 de octubre de forma digital.") y 3 párrafos con los porcentajes por etapa en prosa corrida, más los impuestos alcanzados. Es una buena reescritura, pero cualquiera de los otros 8 medios dice lo mismo.

*DESPUÉS (propuesta):*

> **ARBA otorga rebajas de hasta el 40 por ciento para cancelar deudas** *(título, bajada y cuerpo iguales)*
>
> **El plan en una tabla** *(por código, con las cifras que ya están en el cuerpo)*
>
> | Si adherís | Al contado | En 3 cuotas | En 6 cuotas |
> |---|---|---|---|
> | Del 26/10 al 13/11 | 40% | 20% | 15% |
> | Del 14/11 al 27/11 | 35% | 15% | 10% |
> | Del 28/11 al 11/12 | 30% | 10% | 5% |
> | Del 12/12 al 31/12 | 30% | solo contado | solo contado |
>
> *(Detalle que importa: el cuerpo dice "30% únicamente para pagos contado". La tabla escribe "solo contado" y no "sin descuento": el código no supone nada que el cuerpo no diga.)*
>
> **Qué dicen las fuentes** *(por código; primero en modo sombra)*
> - **Coinciden los 9 medios:** descuento de hasta el 40% y adhesión digital desde el lunes 26/10.
> - **Lo dicen algunos:** la lista completa de impuestos (Inmobiliario, Automotor, Ingresos Brutos, Sellos y Embarcaciones Deportivas): *"N de 9 medios"* (el N lo cuenta el código).
> - **Lo dice uno solo, con nombre:** la explicación del director ejecutivo, Cristian Girard, sobre el "contexto económico complejo" *(atribuida al medio que la publicó)*.
> - **Difieren:** *(esta línea solo sale si el código encuentra cifras distintas entre medios; si no, no aparece)*.
>
> **Para Balcarce** *(solo con ficha vigente o si alguna fuente lo dice)*
> - El Inmobiliario y el Automotor de acá se pagan a ARBA; las tasas municipales no están dentro del plan *(dato a confirmar en una fuente oficial antes de cargarlo en la ficha: hoy ninguna de las fuentes de la nota lo dice, así que NO se escribiría)*.
> - Enlaces a notas nuestras sobre tasas y cobros del municipio, si hay en el archivo.
>
> **Preguntas frecuentes** *(frases de `seSabe`, sin reescribir)*
> - **¿Cuándo empieza?** El lunes 26 de octubre, de forma digital desde el sitio de ARBA.
> - **¿Qué impuestos incluye?** Inmobiliario Básico y Complementario, Automotor, Ingresos Brutos, Sellos y Embarcaciones Deportivas.
> - **¿Cuál es el descuento máximo?** 40% al contado, entre el 26/10 y el 13/11.

**Valor real:** la tabla y las preguntas (es lo más citable) y "qué dicen las fuentes" (única forma de diferenciarse cuando 9 medios cuentan lo mismo). Esta es la nota con más competencia: sin esto no hay motivo para elegirnos. Si la ficha local no existe, "Para Balcarce" no sale y no pasa nada.

### 5.3 Una nota de tecnología o ciencia (2 medios)

Estructura: cuerpo → **Tablas** (calendario, quién pone qué) → **Términos** → **Antes en Radar** (si hay) → **Fuentes**.

**Ejemplo real: `1x7mq5l` "Estados Unidos financia un centro de ciberseguridad estatal"** (2 medios: TN y Perfil).

*ANTES (hoy):* título, bajada ("Washington aportará US$15 millones para reemplazar tecnología de origen chino en redes públicas…") y 3 párrafos: la reunión Quirno-Landau en el Palacio San Martín; las etapas (6 meses de diagnóstico, hasta 18 de implementación, autonomía en 3 años, evaluación de la red troncal de ARSAT); y el reparto del dinero (US$15 M de EE.UU. para diseño, revisión legal y capacitación; la Argentina compra hardware y licencias; US$13 M antidrogas, 7,5 dentro del país).

*DESPUÉS (propuesta):*

> *(título, bajada y cuerpo iguales)*
>
> **El calendario** *(por código desde el cuerpo)*
>
> | Etapa | Plazo |
> |---|---|
> | Diagnóstico | 6 meses |
> | Implementación | hasta 18 meses |
> | Autonomía operativa | 3 años |
>
> **Quién pone qué** *(por código desde el cuerpo)*
>
> | Estados Unidos (US$15 millones) | Argentina |
> |---|---|
> | Diseño arquitectónico, revisión legal y capacitación | Compra de hardware y licencias |
>
> **Términos** *(glosario curado a mano, `ingesta/glosario.json`, con fuente y fecha de revisión)*
> - **ARSAT**: la empresa estatal argentina de telecomunicaciones. *(definición escrita y revisada una vez por una persona)*
> - **Red troncal**: la red principal por la que viajan los datos entre ciudades. *(idem)*
>
> **Antes en Radar** *(solo si hay notas nuestras sobre ARSAT, ciberseguridad o acuerdos con EE.UU. en los últimos 90 días)*
>
> **Fuentes (2)** *(como hoy)*
>
> *Sin "Para Balcarce": no hay conexión local en las fuentes y no se fuerza. Tampoco un "por qué importa" con frases de valoración: el criterio las prohíbe.*

**Valor real:** poco por el lado local, que es lo honesto; pero las tablas y el glosario son lo que más cita un asistente. En las áreas chicas (2 medios) el aporte es **estructura y glosario**, no dato propio.

---

## 6. Qué se puede decidir ya (Hernán)

1. ¿Se prende P1 (Antes en Radar)? Es el de menor riesgo. Falta decidir si los antecedentes de Policiales de Balcarce se muestran (propuesta: **no**).
2. ¿Quién carga y revisa `ingesta/fichas-locales.json` (para P3)? Con 10 o 15 fichas alcanza para empezar. Sin esa persona, P3 queda en datos vivos (clima, farmacias, útiles), que ya existen.
3. ¿Se acepta la regla "los bloques los arma el código y no la IA"? Es lo que deja intacto al verificador.
4. ¿Se prueba con la mitad de las notas (para tener control) o con todas? Propuesta: la mitad.

## 7. Orden de trabajo sugerido

1. **Semana 1**: P1 prendido, P2 en modo sombra (se calcula y se guarda, no se muestra) y la tabla de cifras (#5) en sombra.
2. **Semana 2**: mostrar P2 y P3 en un solo tema (ARBA / impuestos) y medir.
3. **Semanas 3 y 4**: según Search Console y Cloudflare, ampliar a cronología por tema (#4) y a glosario (#8). Escribir la regla nueva con su prueba en `docs/10-REGLAS-Y-PRUEBAS.md`.

*Lo que no verifiqué:* no corrí las pruebas ni la ingesta; no hay lectura de Search Console; no comprobé si las cifras de ARBA coinciden exactamente entre los 9 medios (solo tengo el texto ya reescrito de Radar); y las fichas locales, el glosario y los bloques descritos no existen todavía en el repo. Los ejemplos usan lo que hay hoy en `web/data/portada.json` y `web/data/archivo.json` (24/10/2026).
