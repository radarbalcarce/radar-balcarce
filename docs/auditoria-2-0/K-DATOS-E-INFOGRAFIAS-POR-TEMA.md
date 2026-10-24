# K. Datos propios e infografías, tema por tema

*Informe de diseño, 24/10/2026. Complementa el informe G (`G-NOTAS-UNICAS-CON-DATOS.md`), que explica los bloques "Antes en Radar", "Qué dicen las fuentes" y "Para Balcarce". Acá se baja a cada tema: qué dato, de dónde, qué gráfico, cuánto cuesta. Solo lectura: no se tocó código. Los ejemplos "después" están armados a mano con cifras que **hoy** están en `web/data/*.json` o que devolvieron las APIs el 24/10; no están publicados.*

## 0. En diez líneas

1. **Idea única:** un pequeño motor de gráficos que arma **SVG con código nuestro** (sin imágenes de terceros, sin librerías) a partir de datos con fecha y fuente. El mismo SVG sirve en la nota (en línea, sin cargar nada de afuera, compatible con la CSP), en el PNG de la placa de Instagram (`reels/placa.mjs` ya pasa SVG a PNG con resvg) y en la tarjeta de Facebook (`web/lib/tarjeta.js`).
2. **Pieza mínima nueva:** `web/lib/graficos.js`, funciones puras sin dependencias: `tablaSvg`, `barrasSvg`, `lineaSvg` (serie + punto final marcado), `chispaSvg` (mini línea), `bloqueDeAnillos`/`termometroSvg` (posición en tabla). Cada gráfico devuelve el SVG **y** una tabla HTML equivalente (accesibilidad, Google y asistentes leen la tabla; el SVG es lo lindo).
3. **Casi todos los datos ya están o son gratis y sin clave.** Ya en el repo: Jolpica (F1), ESPN (fútbol), DolarApi (dólar), Open-Meteo (clima), agenda del municipio. Sumables sin costo y probados hoy: BCRA v4.0, ArgentinaDatos (inflación, riesgo país, dólar histórico, feriados), `apis.datos.gob.ar/series` (INDEC), Open-Meteo archivo histórico (lluvia de años anteriores).
4. **Regla heredada de G:** el dato lo arma el código, con **fuente y fecha a la vista** ("Fuente: BCRA, dato del 21/10/2026"). Sin dato fresco, el bloque no sale.
5. **Seguridad:** nada de gráficos en notas rojas, Policiales de afuera ni nada con menores o víctimas. En seguridad solo agregados oficiales (partido, año), nunca casos.
6. Hay **tres cosas que verificar antes de prender** (ver § 11): licencia comercial de Open-Meteo, términos de Jolpica y que ESPN es una API no oficial.
7. **Costo de IA: cero.** Todo es código y archivos. Costo de plata: cero.
8. **Lo más rentable en una semana:** (a) ficha de Colapinto con su temporada, (b) tira del dólar y del riesgo país con variación, (c) "llovió X mm; el año pasado por esta fecha, Y mm" para Balcarce, (d) tabla de posiciones recortada alrededor del equipo en las notas de fútbol, (e) glosario corto en salud/tecnología.
9. **Lo más difícil:** votaciones de Congreso (no hay API pública usable verificada), el Torneo local (no hay API: carga a mano) y precios de hacienda (solo PDF). Se dice claro y se deja para después.
10. Orden propuesto en § 12.

---

## 1. Cómo se genera todo (la parte común)

### 1.1 Qué hay hoy

- `reels/placa.mjs` (SVG 1080x1920 → PNG con resvg): ya tiene `placaClima`, `placaLista`, `placaFarmacia`, `placaAgenda`, `placaEfemeride`, `COLOR_SECCION`, `envolverAncho` (cálculo de ancho de texto sin fuentes). Tiene dependencias, por eso vive en `reels/`.
- `web/lib/tarjeta.js` y `tarjeta-diseno.js`: tarjetas 1200x630 y 1080x1350 con `PAPEL`, `TINTA`, `colorDe(seccion)`.
- `web/app/tablas/formula-1` y `web/app/tablas/liga-profesional`: ya hay páginas de tablas con datos de `f1.json` y `futbol.json`. Es la base: lo que falta es **llevar un recorte de esas tablas adentro de la nota**.
- `web/lib/fondos-clima.js`: fondos de clima ya generados (imágenes propias).
- Series propias con memoria: `web/data/dolar-historia.json` (desde 25/9, una cotización por día), `web/data/clima-historia.json` (desde 9/10).
- `ingesta/f1.mjs`, `ingesta/futbol.mjs`: notas armadas sin IA, con fuente citada (`FUENTE_F1`, `FUENTE_FUTBOL`) y firma ("Nota de Radar Balcarce armada con los datos...").

### 1.2 Lo que se agregaría (mínimo)

| Pieza | Qué es | Dónde | Esfuerzo |
|---|---|---|---|
| Motor de gráficos | Funciones puras que devuelven `{ svg, tabla, alt }`. Colores de `colorDe(seccion)`. Tamaños fijos (800x400 para nota, 1080x1350 para Instagram). Texto con `anchoAproximado` para que no se corte | `web/lib/graficos.js` (sin dependencias; lo importa también `reels/` con la misma copia que ya se hace en `scripts/sincronizar-render-publico.mjs`) | M |
| Componente de nota | Dibuja el bloque después del cuerpo: título corto, gráfico, **línea de fuente y fecha**, y la tabla en un `<details>` cerrado (o visible si es chica) | `web/components/bloques.js` (el que propone G) | S |
| Cuaderno de datos | Archivos chicos en `web/data/` con lo traído de afuera, **cada uno con `consultado` y `fuente`**: `indicadores.json` (BCRA, riesgo país, inflación), `lluvias.json`, etc. Los escribe un módulo de `ingesta/` (sin dependencias, recibe `fetch` para probarse, como `traerF1`) | `ingesta/indicadores.mjs` (nuevo), y sumarlos a la línea `git add` de `actualizar.yml` | M |
| Pruebas | El SVG sale vacío si falta un dato; la fecha de la fuente está en el HTML; una serie de menos de N puntos no dibuja línea; ningún bloque en nota roja | `pruebas/` | S |

**Reglas de diseño del gráfico (para que sea creíble):** un solo mensaje por gráfico; el eje parte de cero en barras; título que diga la conclusión ("El dólar blue subió 3% en 4 semanas"), no el tema; fuente y fecha en la misma imagen (así viaja bien por WhatsApp e Instagram); paleta de la sección; versión con texto alternativo.

**Cómo se atribuye siempre:** `Fuente: <organismo> · dato del <fecha> · armado por Radar Balcarce`. La fecha es la **del dato** (`ultFechaInformada` del BCRA, `fecha` de ArgentinaDatos), no la de la consulta. Si el dato tiene más de N días de atraso (N por fuente), el bloque no sale.

---

## 2. Caso 1: Colapinto y la Fórmula 1

### Datos (verificados hoy)

| Qué | Endpoint | Formato | Notas |
|---|---|---|---|
| Resultados de Colapinto en la temporada | `https://api.jolpi.ca/ergast/f1/2026/drivers/colapinto/results.json?limit=30` | JSON (Ergast) | Probado: 200. Una fila por carrera con posición, parrilla, estado, vuelta rápida |
| Todos sus resultados históricos | `.../f1/drivers/colapinto/results.json?limit=100` | JSON | Probado: `total: 44` (2024, 2025 y 2026) |
| Posición en el campeonato | `.../f1/2026/drivers/colapinto/driverstandings.json` | JSON | Probado: 12º, 27 puntos, 0 victorias, ronda 17 |
| Historial de un circuito | `.../f1/circuits/americas.json` y `.../f1/circuits/albert_park/results/1.json` | JSON | Trae nombre, latitud y longitud del circuito y los ganadores por año |
| Calendario y horarios | `.../f1/current.json` | JSON | Ya usado en `ingesta/f1.mjs` |

**Límites:** sin autenticación son **4 pedidos por segundo y 500 por hora**, y avisan que van a bajar (`docs/rate_limits.md` del repositorio de Jolpica). Hoy `traerF1` pide poco, y hay espacio, pero **hay que guardar en un archivo** lo histórico (no cambia): una vez por temporada alcanza.
**Licencia:** el código de Jolpica es Apache 2.0. Sobre los datos y los términos de uso (`TERMS.md`) no los leí completos: ver § 11. La atribución ya está en `FUENTE_F1`.

### Gráficos concretos

1. **"La temporada de Colapinto"** (barras por carrera): una barra por Gran Premio con la posición final (alto = mejor), las carreras abandonadas con una "X" y la parrilla como punto. Se arma con `results.json` del año. Cuenta de un vistazo la temporada: en Singapur largó 15º y abandonó en la vuelta 29 (dato que ya está en `web/data/f1.json`).
2. **Ficha del piloto** (tabla de 5 filas): puesto en el campeonato (12º), puntos (27), mejor resultado del año, abandonos, mejor largada. Todo sale de `driverstandings` y `results`.
3. **Comparación con el compañero de equipo** (barras horizontales de puntos: Colapinto vs. el otro piloto de Alpine). Sale de `current/driverstandings` filtrando por equipo, que **ya está en `f1.json`** (`clasificacion.filas[].equipo`). Esfuerzo mínimo.
4. **"El circuito"** (ficha): nombre, país, vueltas y kilómetros (la nota ya dice 56 vueltas y 308 km), y los **últimos 5 ganadores** del circuito. Los kilómetros y vueltas no vienen en Jolpica: salen del cuerpo de la nota, así que se cuida que coincidan. No se dibuja el trazado (sin imágenes de terceros); si se quiere, un punto en un mapamundi simple con latitud/longitud (`Location.lat/long` de Jolpica) y la distancia a Balcarce calculada por código.
5. **Conexión con Balcarce:** "Fangio nació en Balcarce y fue 5 veces campeón". Es dato histórico de nuestra ciudad; va como **ficha curada a mano** (`ingesta/fichas-locales.json`, G § 2.4) con fuente. Sirve para toda nota de F1 y para la efeméride del 24 de junio (nacimiento de Fangio, si está cargada en `efemerides-curadas.json`: no lo verifiqué).

### Ejemplo sobre una nota real: `1w90w0b` "Colapinto termina 17° en Austin y recibe una sanción" (27 medios)

*ANTES (hoy):* título, bajada, y 3 párrafos: 17º en la primera práctica, cambio de la central electrónica (cuarto componente, el límite es tres), sanción de diez puestos en la grilla. Todo está en prosa; no se sabe cómo viene su año.

*DESPUÉS (propuesta):*

> *(título, bajada y cuerpo iguales)*
>
> **Su temporada hasta acá** — *barras por carrera, 17 Grandes Premios, con los abandonos marcados*
> | Puesto en el campeonato | Puntos | Victorias | Último GP (Singapur) |
> |---|---|---|---|
> | 12º | 27 | 0 | Largó 15º. Abandonó en la vuelta 29 |
>
> **Qué significa la sanción** *(la regla la dice el cuerpo; el código solo pone el número de la grilla)*: "Largaría 10 puestos más atrás de donde clasifique."
>
> **El circuito:** Circuito de las Américas, Austin. *Ganadores de las últimas 5 ediciones (Jolpica).*
>
> *Fuente: Jolpica F1 (datos abiertos), dato del 23/10/2026.*

**Atribución/verificación:** los números de la tabla vienen de Jolpica y se comparan con las cifras del cuerpo (si la nota dice "17º" y la API dice otra cosa, no sale el bloque). **Esfuerzo: S** para ficha y compañero de equipo (el dato ya está en `f1.json`); **M** para la barra por carrera y el historial del circuito.
**También sirve en redes:** un reel o placa "La temporada de Colapinto en 17 barras" (se dibuja con el mismo SVG).

---

## 3. Caso 2: fútbol argentino

### Datos

| Qué | Fuente | Estado |
|---|---|---|
| Tabla por zona de la Liga Profesional | `https://site.api.espn.com/apis/v2/sports/soccer/arg.1/standings` | **Probado hoy: 200.** Ya usada en `ingesta/futbol.mjs` (`API_TABLA`) |
| Partidos y goles de la fecha | `.../apis/site/v2/sports/soccer/arg.1/scoreboard` | Ya usado |
| Calendario y resultados de **un equipo** (historial en la temporada) | `https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/teams/16/schedule` | **Probado hoy: 200** (16 = River). Trae temporada, torneo y partidos. No está usado todavía |
| Copas con equipos argentinos | slugs `arg.copa`, `conmebol.libertadores`, `conmebol.sudamericana` | Ya usados |
| Selección argentina | slugs de ESPN para eliminatorias/amistosos (`fifa.worldq.conmebol`, `fifa.friendly`) | **No los probé**: hay que verificar el slug antes |
| Torneo local de Balcarce (Estudiantina, Liga local) | No hay API ni feed que haya visto | Carga a mano o desde lo que publican las radios y medios locales (ver abajo) |
| Promiedos | No tiene API pública; se vería como scraping | **No recomendado**: frágil y de términos dudosos. Con ESPN alcanza |

**Límites/licencia:** la API de ESPN **no es oficial ni documentada**; ya lo dice `futbol.mjs`. Si cae, queda lo último guardado. No es una licencia de uso formal: el riesgo es de continuidad, no de plata. Mantener los datos mínimos y la fuente citada.

### Gráficos

1. **Mini-tabla "alrededor del equipo"**: en una nota que habla de un equipo (por ejemplo "Atlético Tucumán vence a Tigre y Dabove deja su cargo como DT", id `o7bgji`), mostrar solo 5 filas de la tabla (el equipo, dos arriba y dos abajo) con PJ, DG y puntos. Se calcula con el `standings` de ESPN que ya está en `futbol.json` o en la página de tablas. Es lo que más ayuda al lector que no sigue todo el torneo.
2. **"Las últimas 5" del equipo**: cinco círculos (V/E/D) con el rival; sale de `teams/{id}/schedule`. Es un gráfico clásico y muy compartible.
3. **Resultados de la fecha** como placa de Instagram: ya existe la nota `futbolresultadosliga20261023`; se le suma una placa con el marcador de cada partido (reutiliza `placaLista`).
4. **Goleadores de la fecha**, que ya están en `partidos[].goles`.
5. **Para Balcarce:** el Torneo local no tiene dato abierto. Propuesta de costo cero: una **mini-planilla propia** (`web/data/torneo-local.json`) que cargan Hernán o Andrés desde el panel del celular después de cada fecha (equipos, resultados), y de ahí salen tabla y racha con el mismo motor. **Esfuerzo L** porque requiere pantalla de carga en el panel; **mientras tanto**, sin carga manual, lo único que se puede hacer es "Antes en Radar" con las notas propias sobre ese club (G, P1).

### Ejemplo sobre la nota `o7bgji` "Atlético Tucumán vence a Tigre y Dabove deja su cargo como DT" (3 medios)

*ANTES:* resumen del partido y la salida del técnico.
*DESPUÉS:*

> *(cuerpo igual)*
> **Cómo quedó la tabla** *(5 filas alrededor de Atlético Tucumán, zona y fecha de la tabla)*
> **Sus últimos 5 partidos:** ● V ● D ● E ... *(de ESPN, cada rival con su fecha)*
> *Fuente: ESPN (datos abiertos), tabla actualizada el 23/10/2026.*

**Verificación:** se usa solo si ESPN marca los partidos como terminados (`estadoDelPartido === 'final'`, regla que ya existe) y la tabla es posterior al último partido (ya lo cuida `HORAS_DE_LA_TABLA`). **Esfuerzo: S** (tabla alrededor del equipo, datos ya guardados) y **M** (últimas 5, hay que pedir el calendario por equipo y guardarlo).

---

## 4. Caso 3: economía y agro

### Datos (verificados hoy)

| Qué | Endpoint | Resultado |
|---|---|---|
| Dólar (todas las casas) hoy | DolarApi, **ya usado** en `ingesta/dolar.js` | Con historial propio desde 25/9 (`dolar-historia.json`) |
| Dólar histórico desde 2011, por casa | `https://api.argentinadatos.com/v1/cotizaciones/dolares/blue` (y `/dolares` para todas las casas) | 200. Formato `{casa, compra, venta, fecha}`. Sirve para graficar hacia atrás sin esperar a juntar historia propia |
| Riesgo país | `https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo` | 200: `{"valor": 707, "fecha": "2026-10-23"}` |
| Inflación mensual (INDEC) | `https://api.argentinadatos.com/v1/finanzas/indices/inflacion` | 200. Última: septiembre 2026, 1,9%; agosto 1,7%; julio 2,1% |
| Inflación interanual | `.../finanzas/indices/inflacionInteranual` | 200. Septiembre: 33,4% |
| Reservas, tipo de cambio mayorista, tasas | BCRA **v4.0**: `https://api.bcra.gob.ar/estadisticas/v4.0/monetarias` y `.../monetarias/{idVariable}?limit=N` | 200. Reservas: US$ 50.228 millones al 21/10/2026. **La v3 está dada de baja (410)**: usar solo la v4.0 |
| Cotizaciones oficiales de monedas | `https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones` | 200 |
| Series del INDEC (EMAE, IPC, etc.) | `https://apis.datos.gob.ar/series/api/series/?ids=...&limit=3&format=json` y buscador `.../search/?q=emae` | 200. Ojo: la serie IPC base 2016 que probé termina en julio 2026; **mejor usar ArgentinaDatos para inflación** |
| Precios del agro | Rosario (BCR) tiene páginas de cotizaciones; **no encontré feed ni API**. Mercado Agroganadero de Cañuelas: la Secretaría de Agricultura publica un PDF semanal (SIO Carnes), **no feed** | Sin dato estructurado gratuito verificado |

**Licencias:** ArgentinaDatos es una API comunitaria, sin licencia formal que haya leído; sus datos vienen del INDEC y el BCRA (organismos públicos). Para lo que importa se puede **leer directo del BCRA y de datos.gob.ar** y citar al organismo. El BCRA y datos.gob.ar son datos públicos de gobierno.
**Límites:** sin clave; no vi límites publicados; se pide **una vez cada media hora como mucho** y se guarda.

### Gráficos

1. **Tira del dólar** (en cada nota de dólar y de economía que lo cite): línea de 30 días del blue y del oficial, con el último punto marcado y la variación semanal y mensual en palabras ("subió 3,1% en 4 semanas"). Hoy `dolar-historia.json` tiene desde el 25/9 (un mes); con ArgentinaDatos se puede llegar a un año.
2. **Inflación en barras**: los últimos 12 meses (con 1,9% de septiembre marcado) y el dato interanual. Una sola barra azul y la actual destacada.
3. **Riesgo país**: línea de 90 días con el valor actual (707 al 23/10). Ojo con interpretar: el gráfico muestra, no opina.
4. **"Cuánto es en Balcarce"** (el pedido de Hernán): cuentas simples con **fórmula visible**, hechas por código, sin opinar:
   - *Una suba de X% en el alquiler/sueldo/jubilación equivale a $ Y sobre un monto de ejemplo* (siempre con "ejemplo": "para una jubilación de $500.000...").
   - *La soja a $555.000 la tonelada*: cuánto es por hectárea con un rinde de referencia de la zona. Hace falta un **rinde de referencia** de fuente oficial (INTA Balcarce, o MAGyP vía `apis.datos.gob.ar`, dataset "Soja - siembra, cosecha, producción, rendimiento"); si no se tiene fuente vigente, **no sale**. Balcarce es zona papera y de soja/trigo, así que es el tema más cercano al lector de acá.
5. **Comparación con el año anterior**: la tabla de combustibles ("1.403.856 m³ vs. 1.376.837 m³") como barras de 2 columnas.

### Ejemplos sobre notas reales

**`1es4apg` "La soja llega a 555.000 pesos por tonelada en el mercado de Rosario" (Agro, 2 medios).**
*ANTES:* soja a $555.000, suba de $5.000, noviembre a US$ 366,90, Chicago a US$ 461,69, tipo de cambio de exportación $1.520,50. Todo en prosa.
*DESPUÉS:* debajo, tabla "Soja hoy" (Rosario disponible, noviembre en dólares, Chicago, tipo de cambio) y una mini línea de la **soja de los últimos 30 días *si* la guardamos nosotros** (hoy no hay serie propia: arrancar a guardarla es gratis, pero la serie recién sirve en un mes). Frase de contexto: "Con 555.000 por tonelada, 1 hectárea que rinda X toneladas = ..." solo si hay rinde de fuente oficial.
**Atribución:** la cotización es la que dijo el medio de origen (TN): el bloque cita "según TN, 23/10". Como no hay API gratuita de Rosario, el dato **sale del texto de la nota ya verificado**, no de una consulta aparte. **Esfuerzo: M**, por parseo y guardar la serie.

**`1tz9cn4` "La venta de combustibles sube casi un 2% interanual en septiembre" (Economía).**
*DESPUÉS:* barras comparativas septiembre 2025 vs. septiembre 2026 (1.376.837 vs. 1.403.856 m³) y una barra por tipo de combustible (gasoil +6,3%, naftas -1,27%), con "Acumulado del año: -2,4%". Todo sale de las cifras del cuerpo (se controlan con `numerosDe`). **Esfuerzo: S** (es la "tabla de cifras" de G, hecha gráfico).

**Notas de dólar** (`web/lib/notas-propias.js` ya arma una): sumar a la nota propia la tira de 30 días y la variación mensual. **Esfuerzo: S.**

---

## 5. Caso 4: clima y alertas para Balcarce

### Datos

| Qué | Fuente | Estado |
|---|---|---|
| Pronóstico y estado actual | Open-Meteo (`api.open-meteo.com/v1/forecast`), **ya usado**; respaldo `api.met.no` | Probado: 200 con `latitude=-37.84&longitude=-58.26` |
| Lluvia de los últimos días | Mismo endpoint con `past_days=3` | Probado: 200 |
| **Histórico para comparar** ("hace un año") | `https://archive-api.open-meteo.com/v1/archive?...&start_date=...&end_date=...&daily=precipitation_sum,temperature_2m_max` | **Probado: 200.** Datos diarios desde 1940: lluvia acumulada y temperaturas del mismo día/mes de años anteriores |
| Alertas del SMN | Feed CAP: `https://ssl.smn.gob.ar/CAP/AR.php` | **Probado: 200**, es un RSS en HTML con ítems de alertas. Hay que escribir un lector. `ws.smn.gob.ar/alerts/...` me dio **503** y `smn.gob.ar/descarga-de-datos` me rebotó con un chequeo de Cloudflare (desde mi red; puede ser distinto desde GitHub Actions: hay que probarlo). El dataset "SMN alertas meteorológicas 365 días" en datos.gob.ar figura **sin licencia especificada** |
| Avisos propios por umbrales | `ingesta/alertas.mjs` (**ya existe**: helada, lluvia mucha/probable, viento, granizo), umbrales pensados para Balcarce | Ya hecho |

### Gráficos

1. **"Los próximos 5 días"** (barras de lluvia en mm + línea de máxima y mínima): sale del pronóstico que ya está en `portada.json` (`clima.dias`: `max`, `min`, `lluvia`, `milimetros`). Es el gráfico que ya usa la placa de clima, pero llevado a la nota.
2. **"Llovió X mm; el año pasado por esta fecha, Y mm"**: barras del acumulado del mes contra el mismo mes de los 3 años anteriores. El archivo histórico es gratis. **Es el dato más propio y más "de Balcarce" que se puede conseguir** y el que ningún medio nacional tiene. Se arma una vez por día.
3. **Mapa de calor del mes** (cuadraditos por día, color según lluvia): sale de `clima-historia.json` (propia, desde el 9/10) más el archivo para completar. Es un diseño simple con SVG.
4. **Alerta del SMN en la nota**: recuadro con nivel (amarillo/naranja/rojo), zona, ventana horaria y la frase oficial. Solo si el feed CAP incluye a Balcarce o al partido. **Esfuerzo L** por el lector de CAP (formato RSS/XML con zonas), pero es el valor mayor para "alertas para Balcarce". Mientras tanto, los avisos por umbral de `alertas.mjs` cubren lo esencial.

### Ejemplo sobre un dato real de hoy

Pronóstico de hoy (de `portada.json`): sábado 24, 15°/9°, 12% de lluvia, llovizna leve; domingo 11°/8°, 20%.
*ANTES (la página del clima):* temperatura, sensación, humedad, viento, cuatro días.
*DESPUÉS:* debajo del pronóstico, **"Octubre en Balcarce"**: acumulado de lluvia de este mes vs. octubre de los últimos 3 años, y "días con helada este año". *Fuente: Open-Meteo, dato del 24/10/2026. Las lluvias del mes salen de nuestra propia medición diaria desde el 9/10 y del archivo de Open-Meteo antes de esa fecha.*

**Verificación:** el histórico se pide con fecha y lugar fijos (coordenadas de Balcarce) y se guarda en `web/data/lluvias.json`. Si Open-Meteo falla, el bloque no sale. **Esfuerzo: M** (módulo de ingesta + gráfico). **Atención:** Open-Meteo es gratis **solo para uso no comercial** (ver § 11); como el sitio podría tener avisos publicitarios (`web/data/avisos.json`), conviene confirmar si corresponde la suscripción o pasar a otra fuente. Es un tema de licencia evidente, no se investiga más.

---

## 6. Caso 5: política nacional y provincial

### Qué se puede y qué no

- **Votaciones del Congreso:** busqué en ArgentinaDatos (`/v1/senado/votaciones`, `/v1/diputados/votaciones`) y dieron 404; no encontré en esta investigación una API pública gratuita y estable de votaciones nominales. Los datos del Congreso están en las páginas de HCDN y Senado, **sin feed que haya podido verificar**. Conclusión: **no armar un gráfico de votación automático ahora**. Se puede hacer la versión manual: cuando una nota diga "fue aprobado por 140 votos contra 100", el motor dibuja un **semicírculo de votos** (afirmativos, negativos, abstenciones) con **esas cifras del cuerpo**, sin dato externo. **Esfuerzo: S**, y solo si las tres cifras aparecen en el cuerpo verificado.
- **Cronología de la misma historia con nuestro archivo (lo más potente):** es el "Antes en Radar" de G, pero como **línea de tiempo** con puntos por fecha: "Espert: 3/10 pedido de procesamiento, 15/10..., 23/10 procesado". Sale de `archivo.json` y `historico/*.json` y de los `temas`. **Esfuerzo: M**, sin dato externo. Es el mejor diferenciador en política nacional porque 28 medios cuentan lo de hoy y **ninguno tiene nuestra memoria de la historia**.
- **Política local (Concejo Deliberante de Balcarce):** nota real `pvnj5f` "El Concejo Deliberante debate reclamos de higiene y obras" (1 medio). La nota dice "decimosexta sesión" y que el expediente del Estadio quedó en comisión. Una **ficha del expediente** (estado: en comisión, fecha, a qué comisión, qué bloque pidió qué) armada a mano o por código sobre nuestras propias notas ("Antes en Radar": cuándo apareció el tema del paredón del Estadio) sería un dato nuestro. Sin fuente oficial de expedientes estructurada, el límite es lo que dicen las notas.
- **Número de sesiones y temas por sesión:** conteo propio desde el archivo ("es la 16ª sesión del año"): el "16" ya viene de la fuente; el código solo cuenta cuántas sesiones **cubrimos nosotros**.

### Ejemplo sobre `pvnj5f`

*ANTES:* dos párrafos: reclamos por basura, pastizales y roedores; plan de desratización; el paredón del Estadio vuelve a comisión.
*DESPUÉS:* debajo, línea de tiempo "El Estadio Municipal en el Concejo": fechas de las notas nuestras previas sobre el tema (solo si existen en el archivo; si no, no sale). **Fuente: archivo de Radar Balcarce.** Tabla "Qué se trató" (3 filas: higiene, desratización, Estadio) con "estado" tomado literal del cuerpo ("derivado a comisión"). **Esfuerzo: S/M.**

**Reglas:** Política espera a una persona (regla vigente); los bloques heredan ese estado. Sin adjetivos ni "quién ganó": solo hechos y cifras.

---

## 7. Caso 6: policiales y seguridad vial (solo agregados oficiales)

### Principio

Nada de casos individuales, ni nombres, ni fotos, ni menores, ni víctimas. Solo **números agregados de organismos oficiales** y consejos del propio Estado. Policiales de afuera no se publican (regla vigente); esto sería contexto para el **Policiales de Balcarce**.

### Datos

- **Seguridad vial:** la provincia publica un "Informe de siniestralidad vial fatal" anual **en PDF/PPTX** (`publicaciones.transporte.gba.gob.ar`, 2024: 833 siniestros fatales en la provincia, con un ranking de municipios) y la ANSV publica informes anuales también en PDF. **No encontré un dataset descargable por partido** en `datos.gob.ar` (las búsquedas "siniestros viales" y "seguridad vial" no dieron un dato de siniestralidad). Por eso, la carga es **a mano, una vez por año**, de la cifra del partido de Balcarce en el informe provincial, con link al PDF y página. Se guarda en una ficha curada (`fichas-locales.json`, G § 2.4) con fecha de revisión.
- **Seguridad (delitos):** `datos.jus.gob.ar` (estadísticas criminales) no devolvió resultados útiles en mi prueba. **No hay dato por partido que haya verificado.** Se deja afuera.
- **Prevención rural y drones:** la nota real `1qjmlzq` ("Implementan operativos preventivos con drones en zonas rurales del distrito") es un dato institucional del Ministerio de Seguridad.

### Gráficos

1. **"Qué es el Comando de Prevención Rural"**: ficha explicativa corta con teléfono oficial (número desde `ingesta/contactos-agenda.json`, no inventado) y qué hacer: servicio útil, sin dato policial.
2. **Seguridad vial: "Balcarce en la ruta"** (una barra por año si hay 3 informes cargados): siniestros fatales del partido según el informe provincial. *Fuente: Observatorio Vial de la provincia de Buenos Aires, informe 2024, p. N.* Solo con los números del informe, nunca un caso.

### Ejemplo sobre `1qjmlzq`

*ANTES:* 3 párrafos: despliegue con drones, pedido del Comando, de día y de noche.
*DESPUÉS:* recuadro "Para tener a mano": 911 y el contacto de Prevención Rural **si está en la lista de útiles** (`utiles`), con fecha de revisión. Nada de estadísticas de delito: no hay fuente por partido verificada. **Esfuerzo: S.**

**Excluidos:** cualquier gráfico en notas rojas; cualquier "antecedente" de Policiales (G ya lo propone). Policiales de Balcarce **no** lleva "Antes en Radar". La lista roja no se toca.

---

## 8. Caso 7: salud, ciencia y tecnología

### Qué agrega esto que no sea "resumen"

Son áreas chicas (2 medios mínimo) con poco dato local. El aporte propio es **explicar**: "qué cambia para vos" y un glosario.

### Piezas

1. **"Qué cambia para vos"** (bloque de 2 a 3 líneas, **armado a partir de lo que dice el cuerpo**, no de la imaginación): la nota `160xqh8` "Pami otorga a geriátricos tres aumentos acumulativos del 2,5 por ciento" tiene todo para una tabla de fechas: noviembre 2026, diciembre 2026, enero 2027, y "el arancel acumula ~7,69% desde octubre". El código arma:
   | Cuándo | Aumento |
   |---|---|
   | Noviembre 2026 | 2,5% |
   | Diciembre 2026 | 2,5% |
   | Enero 2027 | 2,5% |
   | Acumulado | ~7,69% desde octubre |
   *Verificación:* ¿2,5% tres veces compuesto da 7,69%? 1,025³ = 1,0769 → 7,69%. El código **recalcula y confirma** que la cifra del cuerpo es consistente antes de mostrarla (un control automático útil). **Para Balcarce:** si hay geriátricos locales o "PAMI Balcarce" en la lista de útiles, un enlace; si no, nada.
2. **Glosario** (`ingesta/glosario.json`, 30 términos al empezar: PAMI, ANMAT, IOMA, ARSAT, INTA, CONICET, "red troncal", "interanual", "arancel", "obra social"): definición de una línea, escrita y revisada por una persona, con fuente (el sitio del organismo) y fecha. Se dibuja como tooltip o lista al final; el código detecta el término en el título/cuerpo.
3. **Ciencia con gráfico**: cuando la nota trae una cifra con serie (por ejemplo "un 40% más que el año pasado"), el motor dibuja dos barras. Sin dato en el cuerpo, no se dibuja.
4. **Tecnología: "cómo funciona"** en 3 pasos (diagrama SVG fijo, curado a mano): para temas repetidos (Starlink, ciberseguridad, IA). Es una biblioteca de 5 a 10 diagramas hechos una vez. Ejemplo: `pgc5jh` "Copa Airlines incorpora internet satelital de Starlink a sus vuelos". Diagrama: avión ← satélite ← estación terrestre, **dibujado por nosotros**, sin imágenes de la empresa. Hay que cuidar que sea genérico ("internet satelital") y no afirme nada técnico que la fuente no diga.

### Atribución

Todo lo explicativo curado lleva "Explicación de Radar Balcarce, revisada el <fecha>" y, si es institucional, la fuente. Lo legal y lo médico **no se interpreta**: no se dice "tenés derecho a..." ni "tomá...". Salud sin consejos clínicos.
**Esfuerzo:** tabla de fechas con recálculo **S**; glosario **M** (hay que cargarlo); diagramas de tecnología **M/L**, recién después.

---

## 9. Caso 8: datos del Municipio de Balcarce y la región

### Qué hay hoy

`ingesta/agenda.mjs` (agenda del municipio), farmacias de turno, útiles (`ingesta/utiles.mjs`, `contactos-agenda.json`) y el feed del municipio (`https://balcarce.gob.ar/feed/`, WordPress, **probado hoy: 200**, se actualiza cada hora). Es una fuente más de noticias (`Municipalidad de Balcarce` ya aparece entre las fuentes).

### Piezas nuevas (todas con dato público oficial)

1. **Calendario de fechas del municipio** (vencimientos de tasas, ferias, cortes): tabla con "qué, cuándo, dónde" tomada de la propia agenda (`agenda.json`). Ya existe la agenda; el aporte es llevar un recorte **a la nota** cuando la nota habla de ese evento. Ejemplo: `k59a1x` "El Instituto Adventista Balcarce celebra sus cuarenta años": si en la agenda aparece otra actividad escolar cercana, sale "Más en la agenda", solo con eventos reales con fecha.
2. **Tasas y obras (el municipio como fuente):** los números (monto de la tasa, avance de la obra, presupuesto de licitación) se toman **de la nota ya verificada** y se llevan a tabla. Ejemplo de G: "Licitan una nueva etapa de obras en el Microestadio del CEF 119" (`16af5xf`): ficha con presupuesto, plazo y estado, y una línea de tiempo de las licitaciones del mismo lugar en nuestro archivo.
3. **Boletín Oficial municipal y ordenanzas**: no verifiqué que exista un feed o dataset estructurado en `balcarce.gob.ar`. Se deja como **pendiente a investigar**; mientras tanto, cuando una nota cita una ordenanza, el código arma un enlace a la fuente si la fuente trae la URL.
4. **Datos regionales** (Tandil, Necochea, Mar del Plata): ya hay fuentes regionales. Ejemplo de uso: "Gonzalo Santamarina analiza la seguridad vial y la salud en Tandil" (`14do14p`, Policiales, 1 medio): ofrece contexto "Balcarce" solo con ficha vigente.
5. **Clima + agenda**: "Fin de semana en Balcarce" (ya hay `placaAgenda`): sumar el pronóstico de cada día (ya está en el mismo `portada.json`). **Esfuerzo: S.** Un solo gráfico, dos datos nuestros, todo de hoy.

**Atribución:** "Fuente: Municipalidad de Balcarce, <fecha de la publicación>" más enlace. **Esfuerzo:** S (agenda en la nota), M (ficha de obra), pendiente (boletín).

---

## 10. Caso 9: efemérides locales

### Datos

`ingesta/efemerides-curadas.json` (fechas patrias y de Balcarce), `web/data/efemerides-elegidas.json`, `generar-efemerides.mjs` (corrida mensual), `web/data/feriados-piezas.json`. Para **feriados**: `https://api.argentinadatos.com/v1/feriados/2026` (probado hoy: 200, con tipo "inamovible"/"puente"). Ya hay feriados en el repo: la API sirve de **control cruzado**, no como fuente nueva.

### Piezas

1. **"Hace N años en Balcarce"**: línea de tiempo de 3 a 5 hitos de la ciudad (fundación, Fangio, la Fiesta de la Papa Frita, la Universidad, el INTA). Es un **dibujo horizontal con puntos y fechas** (SVG nuestro) generado desde `efemerides-curadas.json`, con la fuente de cada hito. El valor es de **autoridad local**: nadie más arma esto para Balcarce. Se publica como nota de efeméride (ya existe la nota del diario, regla 165) y se enlaza desde las notas que mencionen el lugar.
2. **"Cuántos días faltan"** para un evento de la agenda (Fiesta de la Papa Frita, ya en `agenda.proximosAnuales` con `ultimaEdicion`): contador y "última edición: 7 y 8 de octubre de 2026, 1ª edición" que ya está en los datos. Es una micro-ficha para la nota de cualquier edición.
3. **Calendario del mes**: una grilla SVG con feriados (ArgentinaDatos o `feriados-piezas.json`), efemérides de Balcarce y eventos de la agenda. Es una placa de Instagram mensual, 100% datos propios.

**Cuidado:** una efeméride sin fuente no sale (regla 97, el mes armado se aprueba en la pestaña Fechas). **Esfuerzo: S** (línea de tiempo de hitos ya curados), **S** (contador), **M** (calendario).

---

## 11. Licencias, límites y lo que no verifiqué

| Fuente | Uso | Qué hay que saber |
|---|---|---|
| Jolpica F1 | Ya usada | Código Apache 2.0. **No leí `TERMS.md`**. Límite: 4 pedidos/seg y 500/hora, y "bajarán". Los datos de Ergast original eran de uso no comercial: **conviene leer los términos y mantener la atribución**. Se mitiga guardando todo |
| ESPN (site.api) | Ya usada | No oficial ni documentada. Riesgo de que cambie o se corte. Mantener lo mínimo |
| Open-Meteo | Ya usada | El plan gratis es **para uso no comercial** (lo dice su página de términos). Si el sitio tiene publicidad, hay que revisar. El archivo histórico es el mismo servicio |
| BCRA v4.0 | Sin usar | Pública, sin clave, 200 hoy. **La v3 dio 410 (dada de baja): no usarla** |
| ArgentinaDatos | Sin usar | Comunitaria, sin licencia formal que haya visto; datos del BCRA/INDEC. Citar al organismo y, si importa, leer directo del BCRA |
| datos.gob.ar / series de tiempo | Sin usar | Pública. Probado: 200. Atribución a INDEC/MAGyP |
| SMN alertas | Sin usar | Feed CAP `ssl.smn.gob.ar/CAP/AR.php` con 200; otros endpoints me dieron 503 o chequeo de Cloudflare. **Licencia no especificada** en datos.gob.ar. Probar desde Actions antes de apostar |
| BCR (Rosario), Cañuelas | Sin usar | Sin API/feed gratuito verificado: **no scrapear**. Con el dato que ya dice la nota alcanza |
| Congreso (votaciones) | Sin usar | Sin API pública verificada |
| Torneo local, Boletín Oficial municipal | Sin usar | Sin dato estructurado verificado |

**Lo que no hice:** no corrí pruebas ni código del repo; no escribí ningún gráfico (los ejemplos están dibujados con palabras); no leí `TERMS.md` de Jolpica ni los términos completos del BCRA y del SMN; no probé slugs de ESPN para la selección; no revisé si hay un feed de ordenanzas del municipio; las cifras de los ejemplos son las que hoy están en `web/data/*.json` y en las respuestas de las APIs del 24/10 (el cuerpo de las notas es el ya reescrito por Radar, no las fuentes originales).

---

## 12. Orden de implementación

### Primera semana (todo con costo cero, bajo riesgo, datos que ya están)

1. **`web/lib/graficos.js`** con tabla, barras y línea (más pruebas: sin dato no hay gráfico, fuente y fecha siempre presentes). *M, base de todo.*
2. **Colapinto/F1** (ficha de temporada, compañero de equipo, última carrera): el dato ya está en `f1.json`. *S.* Es el tema que más compartido da y no pide fuentes nuevas.
3. **Dólar:** tira de 30 días y variación semanal/mensual sobre `dolar-historia.json`. *S.*
4. **Tabla alrededor del equipo** en notas de fútbol, con la tabla de ESPN que ya se guarda. *S.*
5. **Tablas de cifras del cuerpo** (combustibles, PAMI, ARBA de G): las que pasan el control de que la tabla repite el cuerpo. *S.*
6. **Pronóstico de 5 días en la nota de clima** con lo que ya hay en `portada.json`. *S.*

*Interruptor de GitHub para cada bloque, apagado por defecto, y mitad de las notas con control (como propone G).*

### Primer mes

- **Semana 2:** `ingesta/indicadores.mjs` (BCRA v4.0, ArgentinaDatos: inflación mensual y riesgo país); gráficos de inflación y riesgo país en las notas de economía. *M.* Guardar desde ya las series propias del agro (soja, trigo) que citan las notas: un punto por día cuesta nada y en un mes tienen valor.
- **Semana 2:** "Llovió X mm vs. años anteriores" con el archivo de Open-Meteo (`lluvias.json`). *M.* **Antes: resolver la licencia comercial de Open-Meteo.**
- **Semana 3:** línea de tiempo desde el archivo propio ("Antes en Radar" como gráfico) para política y temas repetidos; "las últimas 5" de un equipo con `teams/{id}/schedule`; historial del circuito (últimos 5 ganadores). *M.*
- **Semana 3:** glosario (30 términos) y "Qué cambia para vos" con recálculo de porcentajes. *M (hay que cargar el glosario).*
- **Semana 4:** efemérides con línea de tiempo local, calendario mensual como placa de Instagram y las placas de F1 y dólar con el mismo SVG. *M.*
- **Mes 2 o más (hay que decidir antes):** lector de alertas del SMN (CAP), torneo local con carga manual desde el panel, rinde de referencia de INTA para el "cuánto es en Balcarce" del agro, siniestralidad vial por partido (carga anual a mano).

### Qué decidir (Hernán)

1. ¿Quién carga, una vez, las fichas curadas (Fangio, glosario, hitos locales, rinde de referencia)? Son unas 40 entradas en total. Sin esa persona, quedan solo los gráficos de datos automáticos.
2. ¿Se confirma la licencia de Open-Meteo antes de sumar el histórico de lluvias?
3. ¿Se acepta que **no haya gráficos** en Policiales, notas rojas y cualquier tema con menores?
4. ¿El torneo local justifica una pantalla de carga en el panel del celular (esfuerzo L)?
