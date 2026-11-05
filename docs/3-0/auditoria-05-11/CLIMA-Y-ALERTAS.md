# Clima y alertas oficiales para Balcarce: qué existe y qué sirve

Investigación del 5/11/2026 (sólo lectura, nada implementado). Probado con `curl` desde la PC de Hernán. Lo que no se probó está marcado como tal.

## Resumen para Hernán

- **SMN (alertas y pronóstico oficial): no se pudo usar.** Desde esta PC `ws.smn.gob.ar` devuelve 503 y `www.smn.gob.ar` devuelve 403 (desafío anti-robots de Cloudflare). No hay documentación pública de una API ni de un feed de alertas. Según lo que decidiste, **se descarta el SMN**.
- **Hay una fuente oficial que sí sirve y no pide clave: la estación automática del INTA en Balcarce (SIGA)**, con temperatura, humedad y lluvia cada 10 minutos, medidas en la EEA Balcarce (Ruta 226 km 73,5). Es dato medido acá, no un modelo.
- **Open-Meteo**, que ya usamos, da además índice UV, salida y puesta del sol, calidad del aire y varios modelos (ICON, GFS, ECMWF, UKMO, GEM). No tiene alertas oficiales.
- **Defensa Civil de la Provincia, Autoridad del Agua, estado de la ruta 226 y nivel de la laguna: no se encontró nada usable por un programa.**

## Tabla de fuentes

| Fuente | Qué da | ¿Sirve para Balcarce? | Formato | ¿Clave o trámite? | Prueba y resultado |
|---|---|---|---|---|---|
| SMN, servicio web `ws.smn.gob.ar` (alertas, pronóstico por localidad) | Alertas y pronóstico oficial (existencia no documentada públicamente) | Sería lo ideal, pero inaccesible | JSON (supuesto) | Sin documentación; no se pudo verificar | `GET https://ws.smn.gob.ar/alerts/type/AL`, `/map_items/weather`, `/v1/forecast/location/4864`: **503**, con y sin User-Agent, repetido dos veces |
| SMN, sitio `www.smn.gob.ar` (alertas, descarga de datos, feed) | Páginas de alertas y datos | No desde un programa | HTML | Desafío de Cloudflare | `/alertas`, `/feed/alertas`, `/descarga-de-datos`, `/dpd`: **403** "Just a moment..." |
| SMN en datos.gob.ar, dataset "Pronóstico a 5 días" | Zip con pronóstico por estación | Dudoso, desactualizado | ZIP | Licencia no especificada | La búsqueda lo muestra con última actualización de noviembre de 2021; la ficha https://datos.gob.ar/dataset/smn-pronostico-tiempo-5-dias respondió 404 al abrirla. No se descargó nada. |
| **INTA SIGA, estación automática "Balcarce - EEA Balcarce" (id 242)** | Temperatura, humedad y precipitación cada 10 min; resumen diario; máxima y mínima del día | **Sí: estación propia en Ruta 226 km 73,5, coordenadas -37,76 / -58,30** | JSON | **No pide clave** (es el endpoint que usa la propia web del SIGA, https://siga.inta.gob.ar/) | **200** con datos del mismo día (último registro 2026-11-05T11:40Z, 72 registros del día). Ver esqueleto abajo. |
| INTA SIGA, estación convencional "INTA - Balcarce (EMC)" (id 32) | Serie histórica desde 1961, observación manual | Útil como histórico, no para "ahora" | JSON | No | Aparece en la lista de estaciones convencionales; último registro 2026-11-03. Datos horarios no probados. |
| INTA SIGA, documentación de API | Documentación oficial | No hallamos ninguna publicada | — | — | `https://siga.inta.gob.ar/document/siga_api.html`: 404. El endpoint se descubrió leyendo el JavaScript de la web (`js/urlserver.js`, `js/data.js`). **Es interno y puede cambiar sin aviso.** |
| INTA, otras estaciones de la zona (Miramar id 240, Necochea "La Dulce" id 241) | Mismos campos | Complemento regional | JSON | No | Aparecen en la lista de estaciones, con datos del día. |
| INTA Meteo / Agromet (plataforma de INTA Balcarce) | Datos en tiempo real o históricos | No se halló la URL | — | — | `https://meteo.inta.gob.ar/` no respondió (código 000). La búsqueda sólo encontró citas bibliográficas de Agromet. |
| Defensa Civil Provincia de Buenos Aires / Protección Civil | Alertas | No hay feed ni API pública hallada | — | — | Búsqueda sin RSS/API; sólo notas de prensa que reproducen alertas del SMN. `https://www.argentina.gob.ar/interior/proteccion-civil`: 404. Redes sociales (X) no probadas. |
| INA, Alerta Hidrológico (`https://alerta.ina.gob.ar/`) | Alertas hidrológicas de la Cuenca del Plata | **Probablemente no** (Balcarce no es de esa cuenca; inferencia mía, no verificada) | Mapas web; una presentación del INA cita "CGIs o APIs REST" sin documentarlas | No se sabe | `https://www.ina.gob.ar/alerta/`: 200 (HTML); `https://alerta.ina.gob.ar/`: 200. Sin API ni estaciones de la zona halladas. |
| Autoridad del Agua (ADA) Provincia de Buenos Aires | Datos hidrológicos provinciales | No se halló nada de laguna ni de Balcarce | HTML | — | `https://www.ada.gba.gov.ar/`: 200 (sólo HTML, sin revisar a fondo). Sin datos abiertos hallados. |
| **Open-Meteo, pronóstico** (ya en uso) | Temperatura, viento, ráfagas, UV, sol; modelos elegibles | **Sí** (punto -37,79 / -58,31, elevación 132 m) | JSON | No (uso gratuito no comercial; revisar condiciones, ver límites) | `https://api.open-meteo.com/v1/forecast?...&models=`: **200** para ecmwf_ifs025, gfs_seamless, icon_seamless, ukmo_seamless, gem_seamless. Con `daily=uv_index_max,sunrise,sunset,wind_gusts_10m_max`: UV máx. 8,2 hoy, salida 05:41, puesta 19:32. |
| Open-Meteo, alertas | — | **No tiene** | — | — | Con `alerts=true` no devuelve ningún campo de alertas. |
| **Open-Meteo, calidad del aire** | PM10, PM2,5, índice US AQI | Sí, modelado, no medido | JSON | No | `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=-37.84&longitude=-58.26&current=pm10,pm2_5,us_aqi`: **200**, AQI 19 al momento de la prueba. |
| met.no (Locationforecast) | Pronóstico | Sí, ya es el respaldo | JSON | Exige User-Agent identificable | Sin User-Agent propio: **403**. Con `RadarBalcarce/1.0 contacto@...`: **200**. |
| sunrise-sunset.org | Sol | Redundante con Open-Meteo | JSON | No | **200**, pero entrega en UTC. No hace falta. |
| Meteostat | Estaciones históricas | No | JSON vía RapidAPI | **Sí, clave** | `https://meteostat.p.rapidapi.com/`: 401. Descartar. |
| Weather Underground (estación personal `IBALCA20`) | Estación particular en Balcarce | Posible; depende de quien la mantiene | API con clave | Clave (no probada) | La página `https://www.wunderground.com/weather/ar/balcarce` (200) enlaza `pws/IBALCA20`. No probé su API ni si está activa. |
| Meteoclimatic | Estaciones personales | Sin estación de Balcarce hallada | — | — | `https://www.meteoclimatic.net/`: 403. |
| Ruta 226, estado de rutas (Vialidad) | — | No hallado | — | — | `https://www.vialidad.gob.ar/`: no respondió (000). |
| Fase lunar y nivel de la laguna | — | Sin fuente abierta hallada. La luna se puede calcular con una fórmula local, sin red | — | — | Sin prueba de red. |

## Recomendación

1. **Sumar: la estación del INTA en Balcarce (SIGA, id 242).** Esfuerzo: bajo (medio día, un módulo sin dependencias). Sirve para:
   - Texto del clima con "lo que mide la estación del INTA" y no sólo el modelo.
   - **Verificar nuestros avisos de helada**: la mínima medida contra la que predice Open-Meteo ("la estación del INTA registró X °C").
   - Lluvia caída en el día y en los últimos días (`precipitacionAcumulada4dias` ya viene calculado).
   - **Riesgo importante:** la API no está documentada ni es oficialmente pública; es la que usa la web del SIGA. Tratarla como inestable: cachear, tener respaldo en Open-Meteo y que el vigilante avise si deja de responder. El crédito va siempre: «Fuente: INTA, estación EEA Balcarce». Conviene escribirle al INTA Balcarce para pedir permiso de uso y que confirmen si pueden mantenerla estable (un mail, no es requisito para empezar).
2. **Sumar (gratis, sin trámite): UV, horas de sol y calidad del aire de Open-Meteo**, que ya está en la API que usamos. Esfuerzo: muy bajo. El AQI es modelado: decirlo así, no como medición.
3. **Opcional: comparar modelos** (ECMWF, ICON, GFS) para dar una idea de confianza en avisos de viento o granizo. Esfuerzo bajo, valor editorial moderado. No son alertas oficiales y no hay que presentarlas como tales.
4. **Descartar:** SMN (inaccesible), Meteostat (clave), Meteoclimatic, INA y ADA (nada para Balcarce hallado), Defensa Civil (sin feed), ruta 226 y nivel de laguna. La luna se resuelve con una fórmula en el propio código.
5. **Lo que NO tenemos:** ninguna alerta oficial automática. Hasta que algo oficial sea usable, los avisos siguen siendo "nuestro cálculo con datos de Open-Meteo" y deberían decirlo.

## Esqueleto de lectura de la estación del INTA (no implementado)

Base: `https://siga.inta.gob.ar/sxAavXdJBXB3EfbC.php` (el nombre del archivo es parte del sitio y puede cambiar).

- **Ficha y último dato de las estaciones automáticas:** `?param_type=estacionautomatica&param_value=` devuelve una lista (394 estaciones); filtrar `id == 242` ("Balcarce - EEA Balcarce"). Campos: `temperaturaActual`, `temperaturaMaxima`, `temperaturaMinima`, `humedad`, `precipitacion`, `precipitacionAcumulada4dias`, `ultimoRegistro` (UTC), `latitud`, `longitud`, `altura`.
- **Serie del día cada 10 minutos:** `?param_type=datohorario&param_value=242`. Cada registro: `fecha` (UTC, con sufijo `[UTC]` que hay que sacar antes de parsear), `temperatura`, `humedad`, `precipitacion`. Devolvió 72 registros, de 00:00Z a 11:40Z del 5/11.
- **Diario:** `?param_type=datodiario&param_value=242`, con `fecha`, `temperatura` (media), `humedad`, `precipitacion`.
- Reglas para el programa: pasar la hora de UTC a Balcarce; dar el dato por viejo si `ultimoRegistro` tiene más de 2 horas; no mostrar nada si no responde. Estos endpoints no traen viento ni radiación, sólo temperatura, humedad y lluvia.

Esqueleto de Open-Meteo para sumar:
`https://api.open-meteo.com/v1/forecast?latitude=-37.76&longitude=-58.30&daily=uv_index_max,sunrise,sunset,wind_gusts_10m_max&timezone=America/Argentina/Buenos_Aires` y
`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=-37.76&longitude=-58.30&current=pm10,pm2_5,us_aqi`.

## Límites de esta investigación

- El SMN pudo estar bloqueando sólo esta IP; no se probó desde Cloudflare Workers (donde corre el motor). La decisión vigente es descartarlo.
- No se leyeron los términos de uso del SIGA ni de Open-Meteo para uso comercial (Radar tiene avisos publicitarios: conviene revisarlo antes de depender de Open-Meteo gratis).
- Weather Underground y X de Defensa Civil no se probaron más allá de lo anotado.
