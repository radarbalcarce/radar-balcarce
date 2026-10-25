# Analíticas de Radar Balcarce: qué se mide, qué está roto y cómo medir bien

*Auditoría del 15/10/2026, hecha desde la PC leyendo el código y los datos del repositorio. Sólo análisis: no se
tocó ningún archivo existente ni se hizo commit. Cada afirmación que no se pudo confirmar sin conectarse a
Cloudflare, a Meta o a Google dice **SIN VERIFICAR**.*

*17/10/2026: `diagnostico.mjs` y `diagnostico-salida.txt` se borraron en la limpieza final (eran de una sola medición; quedan en el historial de git). Los resultados son los de este documento.*

**Cómo leerlo.** Las partes 1 a 5 responden los cinco pedidos. La parte 6 junta las preguntas para ustedes y la
7, lo que no se pudo verificar. Los números salen de `web/data/estadisticas.json` y
`web/data/estadisticas-piezas.json`; se pueden rehacer con `node docs/analiticas/diagnostico.mjs` (sólo lee;
su salida del 15/10 quedó en `docs/analiticas/diagnostico-salida.txt`).

## En 30 segundos

1. **Hoy el medio mide poco y lo que mide no es confiable.** Entran unas **51 visitas por día** (155 páginas
   vistas) y, de esas vistas, **43 % vienen de afuera de la Argentina** (EE. UU. 28 %, China, Suecia, Irlanda):
   casi seguro robots. Los lectores reales serían unas **87 páginas vistas por día desde la Argentina**.
2. **Desde el 13/10 hay días en cero que no son reales.** El 13, 14 y 15/10 figuran con 0 visitas, y el 11/10
   también, pero la web sí tuvo visitas. El 15/10 a las 9 la medición dio **cero en todas las ventanas, hasta en
   las 24 a 48 horas anteriores que dos mediciones antes tenían datos**. Una medición que contradice a la
   anterior no puede ser una caída de visitas: es un fallo de lectura que el código guarda como si fuera un dato
   (parte 1.3).
3. **Lo peor de la medición es que un cero pisa un dato bueno** (`mezclarDias`, hay una prueba que lo exige) y
   que el panel dibuja ese cero como verdad.
4. **El 60 % de las mediciones de piezas de redes no sirve** (240 de 398): las historias de Facebook dan siempre
   0, los reels de Facebook y las historias de Instagram vuelven vacíos.
5. **No se puede cerrar el circuito "publiqué esto en Facebook y llegaron N visitas"**: no hay `utm_` en ningún
   enlace que sale de las redes, y Meta informa 6 clics en 60 posteos mientras Cloudflare cuenta 388 visitas
   desde Facebook en 11 días. Una de las dos cifras está mal o hay muchísimo tráfico que no viene de nuestros
   posteos.
6. **Con 50 visitas por día no hay estadística posible por hora ni por nota** (una nota promedio tiene 2 o 3
   lecturas). Antes de más tableros hay que medir lo que sirve a esa escala: cuántos lectores reales, de dónde
   llegan, qué secciones y qué piezas de redes los traen.
7. **Propuesta:** arreglar la lectura de Cloudflare y no guardar ceros dudosos (1 día), poner UTM en las redes
   (medio día), sumar un contador propio y liviano en un Worker de Cloudflare que separe robots de lectores
   (2 a 3 días), leer Search Console por API, y un informe semanal por mail. Todo dentro de los planes gratis.

---

## 1. Qué se mide hoy, de dónde, cada cuánto, dónde se guarda y qué está roto

### 1.1 Inventario

| Qué | De dónde sale | Cada cuánto | Dónde queda | Quién lo lee |
|---|---|---|---|---|
| Visitas y páginas vistas de la web (últimas 12 y 24 h, y las 12 y 24 h anteriores, y las 3 páginas más vistas) | Cloudflare Web Analytics (el "beacon" que Cloudflare mete solo en el HTML, etiqueta `63fea168…`), por la API GraphQL, conjunto `rumPageloadEventsAdaptiveGroups`. Código: `estadisticasDeCloudflare` (`redes/estadisticas.mjs:144`) | 2 veces por día, a las 9 y a las 21 (`HORAS_DE_MEDICION`, `estadisticas.mjs:46`), dentro del workflow Vigilancia (`vigilar.mjs:778`) | `web/data/estadisticas.json` → `puntos` (últimos 120) | WhatsApp de las 9 y de las 21 |
| Detalle diario de la web: totales, horas, notas (por id), direcciones, referentes, aparatos, países | Mismo origen. Código: `detalleDeCloudflare` (`redes/estadisticas-detalle.mjs:74`) | Cada medición repite los **últimos 3 días** y los pisa (`DIAS_A_MEDIR`, `mezclarDias`, línea 157) | `estadisticas.json` → `dias` (hasta 120 días, hoy 17) | Pestaña Números del panel (`web/public/panel/numeros.js`) |
| Seguidores, vistas, alcance e interacciones de la cuenta de Facebook e Instagram | API de Meta con `META_TOKEN` (`estadisticasDeMeta`, `estadisticas.mjs:191`) | A las 9 y a las 21 | `estadisticas.json` → `puntos[].facebook` / `.instagram` | WhatsApp y panel |
| Números de **cada pieza** publicada (alcance, vistas, "me gusta", clics…) | API de Meta (`redes/estadisticas-piezas.mjs`) | Cada publicación se mide **una vez**, a las 24 h (historias de IG entre 12 y 24 h), hasta 12 por corrida | `web/data/estadisticas-piezas.json` (398 mediciones del 1/10 al 14/10) | Nadie lo muestra aún (sólo el resumen por consola) |
| Cuántas notas se publican por día, por sección, de Balcarce o de afuera, con 2 o más medios, esperando a una persona, esperando cuerpo | `ingesta/estadistica-diaria.mjs` | Cada corrida de "Actualizar la web" | `web/data/notas-por-dia.json` (19 días) | Panel |
| Salud: corridas de GitHub Actions con falla, claves de IA rechazadas, vencimientos, web caída | `redes/vigilar.mjs` (`evaluar`) | Cada 30 min | `web/data/vigilancia.json` (qué ya se avisó) y WhatsApp | Los dueños, por WhatsApp |
| Cuántos intentos de IA se hicieron por nota | `web/data/intentos-ia.json` (531 notas) | Cada corrida | El archivo | Sólo el código (para no reintentar sin fin) |

**Dos aclaraciones para no confundirse:**

- `web/data/vistas.json` **no son visitas**: guarda la primera vez que el robot *vio* cada nota (sirve para su
  fecha). No tiene nada que ver con lectores.
- Lo que el panel llama "vistas por nota" es la cantidad de páginas vistas de una nota según Cloudflare.

### 1.2 Lo que no se mide en absoluto

No se guardan: tokens ni costo de la IA (se buscó `usageMetadata`, `totalTokenCount`: no aparece en el código;
`panel/datos/cuota-gemini.json` es de la PC en desuso y se detuvo el 19/09), tiempos de cada tramo de la
corrida, cuántas notas trae cada fuente que después se leen, la cantidad de notas por color de semáforo por
día (la Etapa 6 a 9 armó `semaforo-por-dia.csv` a mano), cuántos clics van a los enlaces de "Fuentes (N)",
visitantes que vuelven, ni nada de Google Search Console ni de Bing.

### 1.3 Qué está roto, con el diagnóstico de los días en cero

**Lo que muestran los datos (`diagnostico-salida.txt`):**

| Medición o día | Qué dice | Por qué no puede ser verdad |
|---|---|---|
| Medición del 13/10 a las 9 (12:00 UTC) | todo en cero | consistente con la causa que documenta el commit `fda7ce49` (17:31 UTC de ese día): el código medía el sitio del dominio, "siempre en cero", y no el de la etiqueta de la página. Es la única con causa conocida |
| Medición del 15/10 a las 9 | `u12`, `u24` y `a24` en 0 | la medición de 12 h antes dio 51 visitas en 24 h y 37 en las 24 h anteriores; el período de 24 a 48 horas atrás **no puede quedar vacío**. La página sigue llevando la misma etiqueta de Cloudflare (se pidió `radarbalcarce.com` el 15/10 a las 17:24 UTC y el HTML trae `data-cf-beacon … 63fea168…`) |
| Medición del 12/10 a las 9 | últimas 12 h = 16 visitas, últimas 24 h = **0** | las 24 h incluyen las 12 h |
| Medición del 9/10 a las 9 | últimas 12 h = 9 visitas, últimas 24 h = **0 visitas y 300 vistas** | idem |
| Medición del 30/09 a las 9 | todo en cero | una más |
| Medición de las 21 del 12/10 (00:00 UTC del 13/10) | últimas 12 h = 0 | en esas mismas 12 horas el detalle por hora del 12/10 suma 66 vistas |
| Detalle del 11/10 | visitas 0, vistas 0, pero las horas suman 98 y hay referentes | dos consultas de la misma medición se contradicen |
| Detalle del 13, 14 y 15/10 | todo en cero | resultado de la medición del 15/10 a las 9 (arriba) y de la del 13/10 |
| Detalle del 9/10 | 139 vistas, horas = 0, sin direcciones, y "400 celulares" con 139 vistas | números imposibles: ya estaba corrupto antes del 13/10 |

Seis de las 42 mediciones son así. Es una falla **intermitente**, no una caída de tráfico.

**Causa en el código (confirmada leyendo):** `detalleDeCloudflare` y `estadisticasDeCloudflare` no distinguen
"Cloudflare dijo que hubo 0 visitas" de "Cloudflare no me contestó nada útil". Ambos casos terminan en `0`:

- `estadisticas-detalle.mjs:101-102`: `dias[d.dia].visitas = c[…]?.[0]?.sum?.visits ?? 0;` y `… count ?? 0`.
- `estadisticas-detalle.mjs:110`: `dias[d.dia].horas = Array(24).fill(0);` se arma antes de saber si llegó algo.
- `estadisticas-detalle.mjs:90`: `alRecibir(dias[d.dia], c[…] ?? [])` pasa una lista vacía y cada grupo escribe `{}`.
- `estadisticas-detalle.mjs:159`: `mezclarDias` hace `{ ...viejo, ...nuevo }`: **el cero nuevo pisa el dato bueno
  viejo**. La prueba `numeros-panel.test.mjs:123` ("lo nuevo pisa día por día, campo por campo") exige justo
  eso.
- `numeros.js:50`: `datosDelDia` considera "con detalle" a todo día que tenga el campo `visitas`, aunque
  valga 0, y el panel lo dibuja como un día sin lectores.

**Causa de fondo del cero del 15/10 (SIN VERIFICAR, hay que correr una consulta):** como la página sigue
mandando datos con la misma etiqueta pero la API devuelve cero hasta para los días anteriores, lo más probable
es que **la API lea otro lugar que el beacon**. Con la mudanza del 15/10 hay tres sospechosos, de más a menos
probable:

1. `CLOUDFLARE_ACCOUNT_ID` o `CLOUDFLARE_ANALYTICS_TOKEN` en el repositorio nuevo apuntan a otra cuenta de
   Cloudflare (la de `radarbalcarce@gmail.com`) distinta de la que tiene el sitio de analítica `63fea168…`.
   Con una cuenta equivocada `buscarSitio` (`estadisticas.mjs:123-138`) devuelve `siteTag: null`, y la línea 149
   (`sitio = b.siteTag ?? TOKEN_DEL_BEACON`) cae a la etiqueta por defecto **sin avisar**: la consulta sale bien
   (`ok: true`) y vuelve vacía. Esto explica que `punto.web` exista pero esté en cero.
2. El sitio de analítica se recreó con otra etiqueta y el HTML publicado (en caché) todavía lleva la vieja.
3. Otra intermitencia de Cloudflare como la de las seis mediciones anteriores.

**Cómo confirmar en cinco minutos, sin tocar código:** en la PC, con las variables del repositorio nuevo
cargadas, correr `node redes/estadisticas.mjs` y mirar si la línea "Cloudflare: cuenta cargada" se mantiene y si
`punto.web` da cero; después, en el panel de Cloudflare, Analytics y Logs → Web Analytics, mirar si el sitio
`radarbalcarce.com` muestra visitas hoy y anotar el ID de la cuenta (en la barra de dirección) para compararlo con
el secreto. Para ver qué sitios ve la API se puede pegar la consulta de `buscarSitio` en el explorador GraphQL
de Cloudflare.

**La observación "las 12:00 UTC valen 0 desde el 12/10": no es un error de zona horaria.** `diasAMedir`
(`estadisticas-detalle.mjs:29`) usa la medianoche a las 03:00 UTC y `horaAR` usa `Intl` con la zona fija
`America/Argentina/Buenos_Aires` (`ingesta/zona.mjs`): la hora 9 de Balcarce es la 12:00 UTC y se acumula bien.
Lo que pasa es que la hora 9 vale 0 los días 10, 11 y 12 (poco tráfico: 40 visitas por día repartidas en pocos
picos) y los días 13, 14 y 15 es parte del fallo general. Antes del 10/10 esa hora también valía 0 en 5 de 9
días. La ventana de 100 filas (`limit: 100`, línea 107) alcanza (como mucho 81 horas). **No hay un error
específico de las 12:00 UTC.**

**Otros problemas, menos urgentes:**

- Facebook "últimas 24 horas" no son 24 horas: se toma el último valor del período `day` de Meta
  (`estadisticas.mjs:210`), que es un día calendario de Meta, y por eso se repite igual en dos mediciones
  seguidas (259, 259; 531, 531; 631 tres veces) y salta de 1.321 a 23.760 y baja a 7.906. Hay que guardar
  la fecha que informa Meta (`end_time`) y no llamarlo "24 h".
- Los números de una nota con 2 o 3 lecturas son ruido. Sólo se guardan las 80 notas más vistas por día
  (`masVistos(notas, 80)`, línea 127).
- Todo lo que depende de "directo" mezcla WhatsApp, Instagram y favoritos (los navegadores de Instagram y
  WhatsApp no mandan el origen); `nombreDeReferente` convierte `l.instagram.com` en `instagram.com` pero en 11
  días no aparece ninguna visita de Instagram: es seguro que está dentro de "directo".
- Cloudflare **estima** parte del total (lo dice el propio código): con 50 visitas por día, los valores
  chicos se agrandan (se ven conteos de 4, 2, 8, 12…).
- 240 de 398 mediciones de piezas son inútiles: historias de Facebook (102 de 102 en cero), reels de Facebook
  (70 de 70 vacías) e historias de Instagram (53 de 53 vacías). Probablemente Meta no entrega esas métricas con
  esos nombres o con ese token (SIN VERIFICAR). Aun así se las pide y se las guarda.
- `post_clicks` de Facebook: 6 clics en 60 posteos. Las notas de Facebook salieron como foto desde la regla 107
  y el enlace va dentro del texto, así que el clic en un enlace del texto no cuenta como "clic" de la foto
  (SIN VERIFICAR el criterio de Meta).

### 1.4 Arreglo propuesto (no aplicado)

**Principio:** un cero no se guarda si no hay una prueba de que el día realmente estuvo vacío. Un día cerrado
sólo puede mejorar. Y si una consulta es incoherente, se repite y se avisa.

**A. `redes/estadisticas.mjs`**

1. Línea 149: reemplazar `sitio = b.siteTag ?? TOKEN_DEL_BEACON;` por un error claro:

   ```js
   if (!b.siteTag) return { ok: false, error: `el sitio de analítica ${TOKEN_DEL_BEACON} no aparece en la cuenta ${cuenta.slice(0, 4)}… (¿secreto de otra cuenta?)` };
   sitio = b.siteTag;
   ```
   y en la línea 136 sacar el respaldo por nombre de dominio (`?? filas.find(...)`), que es justo el sitio
   "siempre en cero". Si algún día cambia la etiqueta, mejor que avise a que mida cero.

2. Después de la línea 164 (`const de = …`), agregar una prueba de coherencia y reintentar:

   ```js
   export const esIncoherente = (w) =>
     w.u24.vistas < w.u12.vistas || w.u24.visitas < w.u12.visitas ||
     (w.u24.vistas === 0 && w.a24.vistas === 0 && w.u12.vistas === 0);
   ```
   En `medir`, línea 258: hasta dos reintentos con 20 s de espera si `esIncoherente(r.web)`; si sigue siendo
   incoherente, `punto.cloudflare = 'incoherente'`, **no se guarda `punto.web` ni `dias`**, y se agrega a `faltan`.

**B. `redes/estadisticas-detalle.mjs`**

3. Líneas 100-103: tomar la fila y no escribir nada si falta.

   ```js
   rango.forEach((d, i) => {
     const fila = c[`d${i}`]?.[0];
     if (!fila) { faltan.push(`Cloudflare, totales de ${d.dia}: respuesta vacía`); return; }
     dias[d.dia].visitas = fila.sum?.visits ?? 0;
     dias[d.dia].vistas = fila.count ?? 0;
   });
   ```
4. Línea 110: no armar el arreglo de horas si no llegó ninguna fila.

   ```js
   if (!(c.horas ?? []).length) { faltan.push('Cloudflare, detalle por hora: respuesta vacía'); return; }
   ```
   (antes de `for (const d of rango) dias[d.dia].horas = Array(24).fill(0);`).
5. Línea 90: no llamar a `alRecibir` con una lista vacía.

   ```js
   rango.forEach((d, i) => {
     const filas = c[`d${i}`] ?? [];
     if (!filas.length) { faltan.push(`Cloudflare, ${nombre} de ${d.dia}: respuesta vacía`); return; }
     alRecibir(dias[d.dia], filas);
   });
   ```
6. Línea 159 (`mezclarDias`): que un campo nuevo "vacío" no pise uno viejo "con datos".

   ```js
   const peso = (v) => (Array.isArray(v) || (v && typeof v === 'object')
     ? Object.values(v).reduce((a, b) => a + (Number(b) || 0), 0) : Number(v) || 0);
   const mezclarUno = (viejo = {}, nuevo = {}) => {
     const r = { ...viejo };
     for (const [k, v] of Object.entries(nuevo)) if (!(peso(v) === 0 && peso(viejo[k]) > 0)) r[k] = v;
     return r;
   };
   // línea 159:  todos[dia] = mezclarUno(todos[dia], datos);
   ```
   La prueba actual (`numeros-panel.test.mjs:123`) sigue valiendo; hay que sumar dos nuevas (cero no pisa dato;
   respuesta vacía no escribe) y anotarlo como regla 167 en `docs/10-REGLAS-Y-PRUEBAS.md`.

**C. `web/public/panel/numeros.js`, línea 50:** un día pasado con `vistas === 0 && visitas === 0 && suma(horas) === 0`
debe volver `{ dia, sinDato: true }` y mostrarse como hueco ("sin dato"), no como 0.

**D. `redes/vigilar.mjs` (`evaluar`):** avisar con nivel `alta` si las **dos últimas mediciones** tienen
`punto.web` en cero o `punto.cloudflare` distinto de `undefined` ("las estadísticas web llevan 12 horas sin
dato; revisá CLOUDFLARE_ACCOUNT_ID y el sitio 63fe…"). Hoy este problema pasó 3 días sin aviso.

**E. Reparar los datos ya guardados (una persona con Claude):** con la causa arreglada, correr una vez la
consulta por los días 29/09 a 15/10 (sirve el mismo `detalleDeCloudflare` con `cuantos = 17`) y reemplazar los
días 9, 11, 13, 14 y 15/10. Si Cloudflare ya no tiene esos días, marcarlos `{ sinDato: true }`.

**F. Cambiar de "repetir 3 días" a "foto del día cerrado".** A las 9 de cada día pedir **sólo ayer completo** y
guardarlo como definitivo (`cerrado: true`); el día en curso sólo se muestra en vivo, no se guarda. Así ninguna
medición posterior puede pisar un día ya cerrado. Cuesta menos consultas y elimina la clase entera de errores.

**G. Medio paso barato para saber cuánto es robot:** pedir cada total una segunda vez con el filtro
`countryName: "AR"` (una línea más en cada consulta) y llamarlo "lectores probables". No es perfecto, pero ya
separa el 43 % sospechoso.

---

## 2. Qué necesitan saber los dueños y qué se puede responder hoy

Cada pregunta: **Sí** (se puede contestar con lo que hay), **Parcial** o **No**.

| # | Pregunta | Hoy | Qué hay | Qué falta |
|---|---|---|---|---|
| 1 | ¿Cuánta gente nos lee por día? | Parcial | 51 visitas y 155 vistas por día (`dias`) | Separar robots (43 % de las vistas son de afuera); arreglar los días en cero |
| 2 | ¿Qué notas se leen? | Parcial | Las 80 más vistas por día, por id | Con 2 a 3 lecturas por nota es ruido; falta contar "lectura real" (tiempo y scroll) |
| 3 | ¿De dónde llegan? | Sí, con límites | Facebook 69 %, directo 30 %, Google 1 % (11 días sanos) | Instagram y WhatsApp quedan escondidos en "directo"; no se sabe qué posteo trae a quién |
| 4 | ¿Qué sección rinde más? | Parcial | `porSeccion` en el panel (vistas, notas publicadas, vistas por nota) | Corregir por exposición (qué tanto estuvo en portada) y por robots |
| 5 | ¿A qué hora entran? | Parcial | `horas` por día | Con 50 por día los picos son un solo robot o un solo posteo; hace falta más volumen o sólo lectores reales |
| 6 | ¿Qué pieza de redes trae visitas? | No | Alcance por pieza (60 % inservible), clics de Meta (6) | UTM en todos los enlaces; contar visitas por `utm_campaign` |
| 7 | ¿Qué medios fuente traen las notas que se leen? | Parcial | `porMedio` del panel (cada nota cuenta para todos los medios que la contaron); la Etapa 1 mide por medio | Atribuir al **primer** medio y al medio **único**; leer sin superposición |
| 8 | ¿Cuánto cuesta cada nota? | No | Nada: no se guardan tokens ni costo; `intentos-ia.json` sólo cuenta intentos | Guardar `usageMetadata` de cada llamada (parte 5) |
| 9 | ¿Cuánto del tráfico es robot? | No | Sólo la sospecha por país | Clasificar visitas (parte 3.4) |
| 10 | ¿Lectores nuevos o que vuelven? | No | Cloudflare Web Analytics no lo informa (SIN VERIFICAR) | Contador propio con identificador semanal sin guardar nada personal |
| 11 | ¿Cuánto trae Google? ¿Qué buscan? ¿Qué páginas indexó? | No | Search Console verificado el 24/09 con los sitemaps enviados; nadie lo mira | Leer su API una vez por día (parte 3.7); Bing está pendiente (`PENDIENTES.md`; IndexNow salió el 8/10) |
| 12 | ¿Cómo crecen Facebook e Instagram? | Sí | Seguidores por medición (FB 49 a 53, IG 7) | Guardar la fecha real de cada valor de Meta |
| 13 | ¿Qué tipo de pieza anda mejor? | Parcial | Reels de Instagram: alcance medio 4,8; foto espejo 3,7 | Facebook (historias y reels) vacío; unir con UTM |
| 14 | ¿Qué tan rápido publicamos respecto de los otros? | No | La Etapa 1 lo mide "una vez" desde los datos | Guardar por nota "minutos desde la primera fuente hasta publicar" |
| 15 | ¿Cuántas notas publicadas no las lee nadie? | Parcial | 341 publicadas en 10 días y 2,4 lecturas por nota publicada (800 lecturas) | Con "lectura real" y filtro de robots quedaría preciso |
| 16 | ¿Se lee el desplegable "Fuentes (N)" o se hace clic a la fuente original? | No | No hay evento | Evento `clic-fuente` |
| 17 | ¿Anda el sistema? | Parcial | Corridas con falla, claves, vencimientos | Tiempos, cuotas de IA, rendimiento por fuente (parte 5) |

**Las cuatro que conviene contestar primero:** 1, 3, 6 y 11. Son las cuatro que cambian
decisiones: cuánta gente real hay, si la dependencia de Facebook (69 %) es un riesgo, qué piezas valen el
esfuerzo y si Google empieza a traer lectores.

---

## 3. Arquitectura propuesta para el sistema nuevo sobre Cloudflare

### 3.1 Principios

1. **A esta escala, simple.** 50 visitas por día no necesitan big data. Necesitan *pocas métricas confiables*
   y saber cuánto confiar.
2. **Sin datos personales.** Ni cookies, ni IP, ni huella del navegador, ni usuario. Sólo se guardan
   conteos y clases ("celular", "Argentina", "Facebook").
3. **El repositorio es público:** al repositorio sólo van números agregados, como ya se hace.
4. **Todo en los planes gratis** y con lo que el equipo ya sabe usar (Worker de Cloudflare, GitHub Actions,
   archivos JSON, panel del celular).
5. **Un dato dudoso no se guarda como cero.** Se guarda como "sin dato" o no se guarda.

### 3.2 Opciones para contar visitas

| Opción | Qué es | A favor | En contra |
|---|---|---|---|
| **A. Seguir sólo con Cloudflare Web Analytics** (el beacon que ya está) | Lo de hoy | Gratis, sin cookies, sin trabajo nuevo | Sólo agregados; sin UTM; sin clasificar robots; sin retorno de visitantes; depende de una API que hoy falla en silencio; estima parte del total |
| **B. Contador propio del lado del servidor** (registro de cada pedido en un Worker) | Contar en el Worker cada pedido a una página | Ve también a quien bloquea JavaScript y a los robots que no ejecutan JS | Cuenta *todo* (robots, buscadores, previsualizaciones de WhatsApp): hay que filtrar mucho. El sitio es estático en Pages: un Worker delante cuenta pedidos de cada archivo, no "lecturas" |
| **C. Contador propio del lado del navegador** (un script chico manda un evento a un Worker) | Un `navigator.sendBeacon('/e', …)` al terminar de cargar y otro cuando se lee de verdad | Se pueden mandar **eventos con significado** (lectura real, clic a la fuente, compartir) y `utm_*`; los robots que no ejecutan JS no cuentan; el visitante es anónimo | Un script propio más para mantener; no cuenta a quien bloquea scripts (hoy Cloudflare tampoco) |
| **D. Google Analytics 4** | | Gratis, conocido | Rechazado el 8/10: obliga a cambiar la política de privacidad y entrega los lectores a una red publicitaria; no se recomienda |

**Recomendación: A + C.** Se deja el beacon de Cloudflare como "termómetro público" (y se arregla su lectura,
parte 1.4), y se agrega **C** como la fuente principal para las decisiones. Dos mediciones independientes que
se pueden comparar entre sí son la mejor protección contra otro cero inventado. B no vale la pena.

### 3.3 Dónde se guardan los eventos (almacenamiento)

| Opción | Límites del plan gratis (**SIN VERIFICAR**: confirmar en la documentación de Cloudflare antes de armar) | Para quién sirve |
|---|---|---|
| **Workers Analytics Engine** (base de series de tiempo pensada para esto) | Escribir del orden de 100.000 puntos por día y leer del orden de 10.000 consultas por día; guarda ~3 meses. Se consulta con SQL por HTTP | Eventos crudos y consultas por día/nota/pieza. Es lo más natural para este caso |
| **D1** (SQLite de Cloudflare) | ~5 GB, ~100.000 filas escritas y ~5 millones leídas por día | Guardar **resúmenes** (una fila por día-nota-origen) para siempre y hacer cualquier consulta |
| **KV** | | No sirve para contar (no es atómico) |
| **Archivos JSON en el repositorio (como hoy)** | Gratis | Resumen diario/semanal para el panel; **nunca** eventos crudos |

**Recomendación:** eventos crudos en **Analytics Engine** (3 meses alcanzan), y cada día, una tarea del
vigilante/GitHub Actions lee el resumen del día anterior por la API SQL y lo escribe en un archivo
`web/data/analitica-diaria.json` (sólo agregados, 120 días), igual que hoy `estadisticas.json`. El panel lee
ese archivo: no hace falta tocar la política de seguridad del panel, que sólo puede hablar con GitHub. D1 queda
como segunda etapa, sólo si hacen falta consultas que no se pueden hacer con el archivo (comparar años, por
ejemplo). Con ~150 eventos por día cualquier opción es holgada.

### 3.4 Qué recibe el contador propio: esquema de eventos

Un Worker nuevo (por ejemplo `radar-balcarce-analitica`, igual de simple que `radar-balcarce-reloj`, ruta
`radarbalcarce.com/e`) recibe `POST` chicos del navegador. El script de la página pesa menos de 1 KB, se
agrega en `web/app/layout.js` donde hoy está el comentario de las analíticas y respeta el principio
"no cookies".

**Eventos:**

| Evento | Cuándo se manda | Para qué |
|---|---|---|
| `vista` | Al cargar una página | Contar visitas |
| `lectura` | Una sola vez por página cuando el lector estuvo **15 s con la pestaña visible y bajó más de la mitad**, o hizo clic o tocó | La "lectura real": filtra robots y rebotes. Es **la** unidad para decidir |
| `clic-fuente` | Al hacer clic en un enlace de "Fuentes (N)" o al medio original | Si importa el respaldo de fuentes; qué medios se visitan |
| `compartir` | Al tocar el botón de compartir de la nota (si existe) | Qué se comparte |
| `busqueda` | Al usar el buscador del sitio | Qué se busca y no se encuentra |
| `servicio` | Farmacias, clima, dólar, agenda: una vez por página de servicio | Cuánta gente viene por los servicios |

**Campos de cada evento (todos sin identificar a nadie):**

| Campo | Ejemplo | Cómo se obtiene |
|---|---|---|
| `evento` | `lectura` | el script |
| `pagina` | `nota`, `portada`, `seccion`, `servicio` | el script |
| `nota` | `pt4b1r` | el id en la dirección |
| `seccion` | `Balcarce` | un atributo `data-` de la página |
| `origen_nota` | `de-aca`, `de-afuera`, `propia` | idem |
| `edad_horas` | 3 | hora de la nota contra ahora |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` | `facebook`, `social`, `posteo`, `pt4b1r` | de la dirección (`location.search`) |
| `referente` | `facebook`, `google`, `whatsapp`, `directo`, `otro` | `document.referrer`, ya clasificado en el script (no se manda el texto completo) |
| `pais` | `AR` | `request.cf.country` en el Worker |
| `aparato` | `celular` / `compu` | ancho de pantalla |
| `clase` | `humano` / `sospechoso` / `robot` | ver 3.5 |
| `visitante_dia` | `a9f3…` | hash que gira solo (ver 3.6) |
| `ms_visible`, `scroll_pct` | 22000, 80 | el script |
| `hora` | 9 | hora de Balcarce, calculada en el Worker |

En Analytics Engine eso entra como: `blobs` (texto) = evento, página, nota, sección, origen_nota, utm_source,
utm_medium, utm_campaign, utm_content, referente, país, aparato, clase; `doubles` (números) = 1, edad_horas,
ms_visible, scroll_pct, hora; `index` = id de la nota (o la página).

### 3.5 Filtro de robots

Se hace en **tres capas**, de más barata a más fina, y la clase queda en cada evento:

1. **Por no ejecutar JavaScript:** un robot simple ni llega al Worker (ya pasa hoy con Cloudflare Web
   Analytics).
2. **Por origen de red:** el Worker conoce `request.cf.asn` y `request.cf.asOrganization` (disponibles en
   todos los planes, **SIN VERIFICAR** el detalle). Una lista chica de redes de centros de datos (Amazon,
   Google Cloud, Microsoft Azure, DigitalOcean, Hetzner, OVH, Alibaba y Tencent) marca `clase = sospechoso`.
   Eso explicaría el patrón actual: 28 % de las vistas desde EE. UU., y China, Suecia e Irlanda, casi todos
   los días en cantidades parecidas.
3. **Por comportamiento:** `lectura` sólo se emite con 15 s visibles y movimiento real (scroll, toque, clic).
   Un robot que ejecuta JavaScript casi nunca scrollea.
   **"Lector" = `clase ≠ robot` y evento `lectura`.** Todo número del tablero se calcula sobre lectores.

También sirve (y se puede hacer ya, sin el contador nuevo) filtrar el panel actual por `countryName = AR`,
como se propuso en 1.4.G.

### 3.6 Privacidad: qué se guarda y qué no

- **No se guarda** IP, user-agent completo, ni nada que identifique a una persona. La IP sólo se usa en el
  Worker, en memoria, para armar el identificador del párrafo siguiente, y se descarta.
- **Identificador de visitante sin cookie:** `hash(IP + user-agent + fecha + secreto)`, donde el secreto cambia
  por semana. Sirve para contar visitantes únicos *del día* sin poder seguirlos de un día al otro.
  "¿Vuelven?" se mide con una versión semanal (mismo hash con la semana en lugar del día), que dice "esta
  semana nos leyó 2 o más días", sin guardar nada más. **Decisión de los dueños:** si quieren saber de verdad
  quién vuelve a lo largo del mes, haría falta guardar una marca en el navegador (`localStorage`); es más
  exacto, pero cambia la política de privacidad (hoy dice "sin cookies") y no se recomienda para empezar.
- La página `web/app/politica-de-privacidad/page.js` ya dice que se usa Cloudflare Web Analytics; habría que
  sumar una línea: "contamos lecturas con un contador propio, anónimo, sin cookies ni dirección IP".
- Lo que llega al repositorio público: sólo `analitica-diaria.json` con conteos agregados.

### 3.7 UTM en cada enlace que sale de las redes

**Hoy no hay ningún `utm_` en el código de las redes** (se buscó en `redes/`, `reels/`, `panel/`, `web/`:
sólo aparecen en las direcciones de *otros* medios que se copian de los feeds, y `web/app/nota/[id]/page.js:33` ya
ignora los parámetros pegados al armar el canónico, así que la página no se duplica ante Google).

Todas las direcciones salen de una sola función, `enlaceDeNota` (`redes/elegir.mjs:233`), pero **no se debe
tocar esa**, porque también arma la imagen de Instagram (`imagenDeNota`, línea 243) y la clave del libro
(`publicar.mjs:126`). Se propone una función nueva al lado:

```js
/** El enlace de una nota para un canal de redes, con su origen (las UTM estándar). */
export function enlaceConOrigen(nota, sitio, { fuente, medio = 'social', campana, contenido } = {}) {
  const u = new URL(enlaceDeNota(nota, sitio));
  u.searchParams.set('utm_source', fuente);          // facebook | instagram | whatsapp | youtube | email
  u.searchParams.set('utm_medium', medio);           // social | bio | historia | email | podcast
  u.searchParams.set('utm_campaign', campana);       // posteo | reel | historia | repaso | podcast | efemeride | aviso
  if (contenido) u.searchParams.set('utm_content', contenido);   // id de la pieza (ver abajo)
  return u.toString();
}
```

Dónde se usa:

| Lugar | Archivo y línea | `utm_source` / `medium` / `campaign` |
|---|---|---|
| Línea "Leé la nota completa:" de cada posteo de Facebook | `redes/elegir.mjs:294` (`lineaDelEnlace`) y `meta.mjs:131` (parámetro `link`) | `facebook` / `social` / `posteo` |
| Comentario o texto con el enlace en reels y repasos (podcast, repaso de la noche) | `reels/plan.mjs:499` y `:525` | `instagram` o `facebook` / `social` / `reel`, `repaso`, `podcast` |
| Enlace de la biografía de Instagram y de Facebook (`PERFILES.md`) | a mano, una sola vez | `instagram` / `bio` / `perfil` |
| Canal de WhatsApp y avisos | `redes/avisos.mjs:176` (enlaces que se mandan a los dueños: **no** llevan UTM; son internos) | `whatsapp` / `canal` / `aviso` |
| Resumen semanal por mail | el informe | `email` / `email` / `semanal` |

`utm_content` lleva la clave de la pieza (la misma de `estadisticas-piezas.json`: `pieza` y `dia`, por ejemplo
`noticia1-2026-10-14`), así se puede unir "visitas del contador" con "alcance de Meta" de la **misma pieza**,
que hoy es imposible.

Dos cuidados: (a) Facebook arma la vista previa con la dirección que le llega; las UTM no la cambian, pero
conviene probarlo con un posteo real; (b) las UTM de "directo": los dueños **no** deben pegar enlaces con UTM
en grupos de WhatsApp personales (queda feo): para eso se usa el enlace limpio y se acepta que caiga en "directo".

### 3.8 Informe y tablero

**Informe diario (poco):** hoy el WhatsApp de las 9 y de las 21 ya manda estadísticas. Se mantiene, pero con
los datos limpios y sólo con **una línea** de la web ("lectores de ayer: 87; vs. semana pasada: +12 %; fuente
principal: Facebook 62 %") y **una alarma** si hay incoherencias. Un cero dudoso se informa como "sin dato".

**Informe semanal por mail (lunes a las 8):** el tablero mínimo de la parte 4 más "3 cosas para decidir".
Canales posibles, **SIN VERIFICAR** los límites actuales:

| Opción | Gratis | Observación |
|---|---|---|
| Cloudflare Email (Workers con `send_email` hacia direcciones verificadas por Email Routing) | Sí | Está en el mismo ecosistema; sólo envía a direcciones verificadas, que son las de ustedes dos |
| Servicio de correo transaccional (Resend, Brevo) | Plan gratis chico | Necesita otra cuenta y otra clave |
| Gmail con contraseña de aplicación desde GitHub Actions | Sí | Una clave más; poco robusto |

Recomendado: **Worker con `cron`** (como el reloj) que lee `analitica-diaria.json` y manda el mail. Como el
repositorio es público, el mail debería viajar sólo a Hernán y Andrés y no repetir nada que no esté ya en el
repositorio.

**Tablero:** una pestaña "Analítica" en el panel del celular (reemplazaría a "Números") que lee
`web/data/analitica-diaria.json`. El panel no tiene servidor y sólo puede hablar con GitHub (su propia CSP):
mantener ese diseño. Una página hospedada en Cloudflare con consultas directas a la base sería más flexible
pero requiere proteger el acceso (Cloudflare Access, gratis hasta 50 usuarios, **SIN VERIFICAR**) y sumar otra
superficie para mantener; recomiendo **dejarla para después** (si la pestaña del panel se queda corta).

### 3.9 Costo

Todo cabe en los planes gratis con 100 veces el volumen actual: ~150 vistas por día son unos 300 eventos por día.
Cloudflare Workers gratis permite del orden de 100.000 pedidos por día (SIN VERIFICAR). Gmail/Resend: gratis.
Tiempo de desarrollo estimado, no de plata: etapa A (arreglos) 1 día; B (UTM) medio día; C (contador propio) 2 a 3 días;
D (Search Console) 1 día; E (informe y pestaña) 1 a 2 días.

### 3.10 Google Search Console y Bing

- **Search Console** (verificado el 24/09 con un registro TXT; sitemaps enviados) tiene una API gratis
  (`searchanalytics.query`: clics, impresiones, posición, página, consulta, país, aparato; los datos llegan con 2 a
  3 días de atraso). Se puede leer una vez por día con una **cuenta de servicio** a la que se le da acceso de
  lectura a la propiedad (la configuración la hace una persona, la clave va a GitHub Secrets). Se guarda sólo
  `gsc-diario.json` (clics e impresiones por página y por consulta, agregados). Esto contesta las preguntas 11 y,
  mezclado con el contador, "qué notas traen lectores de Google".
- **Bing Webmaster Tools:** pendiente de alta (dependería de importar desde Search Console). Tiene API y
  alcanza con mirar el panel una vez por mes mientras el tráfico sea tan chico.
- Orden: primero que Google empiece a traer lectores (hoy 1 %) y que **alguien mire** Search Console una vez
  por semana; la lectura automática puede esperar al contador propio.

---

## 4. El tablero mínimo: diez números y la rutina mensual

**Diez números que bastan para decidir.** Todos se calculan sobre *lectores* (sin robots, con lectura real)
salvo que diga otra cosa, y se muestran con la variación contra el período anterior:

| # | Número | Qué responde | Decisión que mueve |
|---|---|---|---|
| 1 | **Lectores por día** (promedio de 7 días) | ¿Crecemos? | Si 3 meses seguidos no suben, revisar la estrategia de distribución, no la de producción |
| 2 | **Lecturas por lector** (páginas por visita) | ¿Se quedan? | Calidad de portada y de "Seguí leyendo" |
| 3 | **De dónde llegan** (Facebook / Google / directo y WhatsApp / otros, en %) | ¿Dependemos de una sola puerta? | Hoy Facebook es 69 %: si Facebook cambia el algoritmo, se cae el medio |
| 4 | **Clics de Google por semana** (Search Console) | ¿Nos encuentran? | SEO y Publisher Center |
| 5 | **Lecturas por nota publicada, por sección** (y la sección mejor y peor) | ¿Qué sección conviene alimentar? | Pesos de fuentes y cupos por sección |
| 6 | **% de notas publicadas con al menos una lectura real en 7 días** | ¿Cuánto de lo que publicamos importa? | Si es 40 %, hay que publicar menos y mejor |
| 7 | **Visitas por pieza de redes** (por tipo: posteo FB, reel, repaso, podcast, bio) | ¿Qué pieza del contrato vale la pena? | Recortar el calendario y el uso de audios (cupo de 10 por día) |
| 8 | **Seguidores netos de la semana y alcance semanal** (FB + IG) | ¿Crece la audiencia propia? | Redes: seguir o recortar |
| 9 | **% de tráfico sospechoso** | ¿Cuánto confiar en los otros nueve? | Si pasa del 50 %, el tablero avisa en rojo |
| 10 | **Salud del sistema:** % de corridas sin falla y notas publicadas por día (con cuántas esperan a una persona más de 24 h) | ¿Anda y entrega? | Mantenimiento y carga de trabajo de Hernán y Andrés |

**Una regla para leerlos:** con menos de 10 lectores en una celda, **no se compara** (ruido). El tablero tiene
que decir "pocos datos" y no una flecha.

**Rutina mensual (unos 45 minutos, el primer lunes de cada mes, Hernán y Andrés):**

1. Abrir el informe del mes (se arma solo). Mirar la franja de confianza: ¿cuántos días hubo datos sanos?
2. Leer los diez números contra el mes anterior. Anotar qué subió y qué bajó, sin explicar todavía.
3. Tres preguntas fijas: *¿de dónde vino el crecimiento?* (3, 4, 7); *¿qué se publicó que no leyó nadie?*
   (5, 6); *¿qué costó esfuerzo y no devolvió lectores?* (7, 8).
4. Elegir **como máximo tres decisiones** del mes (apagar una pieza, subir una sección, sumar una fuente,
   cambiar un horario). Anotarlas en `docs/DECISIONES.md` con la cifra que las motivó.
5. Revisar el mes anterior: ¿las decisiones de entonces mejoraron el número que las motivó?
6. Revisar la salud de la medición: ¿hay días en cero sospechosos? ¿la comparación Cloudflare contra contador
   propio coincide (±20 %)?

**Reglas de decisión sugeridas** (para no discutir cada mes): una fuente sin ninguna nota publicada en 60 días
se apaga; una sección cuyo número 5 queda debajo de la mitad del promedio durante dos meses se recorta o se
revisa su criterio; una pieza de redes que trae menos de 1 visita por posteo en un mes se saca del calendario.

---

## 5. Qué medir del propio sistema

Esto alimenta las decisiones del rediseño (qué fuentes, qué IA, qué reglas) con datos propios en lugar de a
ojo. Se propone un archivo `web/data/metricas-sistema.json` con **un resumen por día** (nunca cada corrida:
con 48 corridas por día y más de 200 feeds, el repositorio público se llenaría) y 120 días de historia.

| Qué medir | Cómo | Hoy | Para qué decisión |
|---|---|---|---|
| **Rendimiento por fuente**: notas que trajo, cuántas pasaron el filtro, cuántas llegaron a publicarse, cuántas fueron la primera o la única, cuántas se leyeron | Contadores por feed en la ingesta, sumados por día; las lecturas del contador propio (`nota`) | Parcial: la herramienta de la Etapa 1 (`ingesta/medir-fuentes.mjs`) lo calcula a pedido y por medio, no por día | Qué fuentes mantener (se pidió 50 + 10 + Balcarce) |
| **Salud de cada feed**: días caídos, motivo real (conexión, certificado, tiempo agotado, HTTP) | Guardar `err.cause` y código por corrida y un resumen por feed (idea B1 del plan del 8/10) | No | Apagar las que nunca andan; reintentos |
| **Semáforo por día**: notas por color (verde, amarillo, rojo, nunca) y por motivo; cuántas esperan a una persona y cuánto esperan; cuántas se aprobaron | Contadores en `estadistica-diaria.mjs`; la Etapa 6 a 9 ya midió 42 por día en amarillo y 0,6 % aprobadas | Parcial (`esperandoPersona` por día) | Si el amarillo es "no sale" en la práctica, rediseñar la regla |
| **Producción**: notas publicadas por día, con cuerpo, con foto o placa, propias, de acá y de afuera | `notas-por-dia.json` | Sí | Equilibrio del medio |
| **IA: llamadas, tokens de entrada y salida, errores 429/401/402/403 y respaldos usados**, por tarea (lectura, redacción, fotos, voz, pistas) y por clave | Guardar `usageMetadata` de Gemini y `usage` de Groq en cada llamada, y sumarlos por día | No | Elegir modelo y entender el costo cuando se pase de gratis a pago (presupuesto USD 10/mes desde octubre) |
| **Costo equivalente** de esos tokens a precio de lista | Multiplicar | No | Saber cuánto vale lo "gratis" y cuándo conviene pagar |
| **Cuota de voz**: audios usados de 10 por día, piezas que no salieron por falta | `redes.json` | Parcial | Decidir el calendario de piezas |
| **Verificador**: notas con verificación ALTA, MEDIA o BAJA, y cuántas se cayeron por eso | Contador en `verificar.mjs` | No | Calidad de la IA |
| **Correcciones tras publicar**: notas retiradas, corregidas por una persona, corregidas por la auditoría con IA | `retiradas.json`, `correcciones.json`, `correcciones-auditoria.json` (sumar por semana) | Sólo archivos sueltos | Es el índice de error real del medio |
| **Latencia**: minutos desde que la primera fuente publica hasta que sale la nota; minutos de cada tramo de la corrida (fuentes, cruce, IA, fotos, armado, subida) | Cronómetros por tramo (idea A6 del 8/10) y la fecha de la primera fuente | No | Competir en rapidez; saber dónde está el cuello |
| **Frescura del sitio**: antigüedad de la última actualización publicada | `portada.json` → ya lo mira el vigilante | Sí | Alarma |
| **Fallas por workflow**: tasa y racha | `vigilar.mjs` ya lo tiene en parte | Sí | Mantenimiento |
| **Redes**: piezas del contrato publicadas contra las prometidas, con y sin números de Meta | `redes.json`, `estadisticas-piezas.json` | Parcial | Qué piezas dejar |
| **Cobertura de medición**: % de días con medición web sana | El tablero mismo | No | Confianza de todo lo anterior |

**Dos que conviene empezar ya**, porque ocurren una sola vez y no se pueden reconstruir: los tokens de la IA
(hoy se pierden) y el motivo real de cada feed caído.

---

## 6. Qué hay que decidir (preguntas para Hernán y Andrés)

1. ¿Aceptan el **contador propio anónimo** además del de Cloudflare (parte 3.2)? Sin él, la mayoría de las
   preguntas de la parte 2 no se pueden contestar. Cuesta lo mismo que nada, pero es un script más en el sitio y
   una línea más en la política de privacidad.
2. **¿Contar "volvió" con una marca en el navegador (`localStorage`)** o conformarse con un conteo semanal sin
   guardar nada? La primera es más exacta; la segunda mantiene "sin cookies ni marcas" (parte 3.6).
3. ¿Ponemos **UTM en todos los enlaces que salen de las redes**? Se ven en la barra del navegador, pero
   permiten saber qué posteo trae visitas.
4. ¿Informe semanal **por mail** a los dos? ¿A qué direcciones? (Se envía sólo a direcciones verificadas.)
5. ¿Quién da de alta a la **cuenta de servicio de Search Console** y a **Bing** (una persona con la cuenta de
   `radarbalcarce@gmail.com`)?
6. ¿Con cuánta tolerancia aceptamos números de robots? Propuesta: mientras la clase "sospechoso" sea mayor al
   30 % de las visitas, el tablero lo marca en amarillo.
7. ¿Queremos medir también **cuánto cuesta cada nota con la IA**, aunque hoy sea gratis, para tener el costo
   real cuando pase a pagarse?

---

## 7. Lo que no se pudo verificar sin conexión

- **Por qué la API de Cloudflare devuelve cero desde el 15/10 a las 9** (ver los tres sospechosos en 1.3):
  falta correr `node redes/estadisticas.mjs` con los secretos del repositorio nuevo y mirar la consulta en el
  explorador GraphQL de Cloudflare.
- **Cuál es el motivo de las seis mediciones incoherentes** anteriores (9/10, 12/10, 30/09 y los dos ceros del 13/10):
  la del 13/10 tiene causa documentada; las otras, no.
- Si Cloudflare Web Analytics expone **visitantes que vuelven**, una dimensión de robots o los parámetros UTM
  (creemos que no).
- Los **límites actuales** de los planes gratis de Workers, Analytics Engine, D1, Email Routing, Cloudflare Access y
  de los servicios de correo; la lista exacta de ASN de centros de datos; qué campos de `request.cf` hay en cada
  plan.
- Si **Meta** dejó de dar las métricas de reels de Facebook y de historias de Instagram o si el token no alcanza,
  y qué cuenta como `post_clicks` en un posteo de foto con el enlace dentro del texto.
- Si las **vistas previas de Facebook** se mantienen igual con una dirección con UTM (se prueba con un posteo).
- La Search Console y Bing: no se pudieron consultar desde aquí, así que no se sabe cuántas notas tiene
  indexadas Google.
- El documento `03-PLAN-DE-MEJORA-INTEGRAL.md` no está en el repositorio: está en
  `C:\Users\herna\Downloads\`. Se leyó su sección 4 (redes). Los números de esa sección (50 visitas por día,
  Facebook 69,5 %, Google 0,7 %, EE. UU. 29 %) coinciden con los que se recalcularon acá (51, 68,9 %, 1,1 %, 28 %);
  los "122 de 237 mediciones inutilizables" eran de entonces: hoy son **240 de 398**.

## Archivos de esta carpeta

- `docs/analiticas/ANALISIS.md`: este documento.
- `docs/analiticas/diagnostico.mjs`: script de sólo lectura que rehace las cifras.
- `docs/analiticas/diagnostico-salida.txt`: su salida del 15/10/2026.
