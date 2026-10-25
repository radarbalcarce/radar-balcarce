# Search Console de radarbalcarce.com, leído el 24/10/2026

*Fuente: Google Search Console (propiedad de dominio), mirada solo de lectura desde el Chrome de la cuenta de Radar Balcarce. Los números son de ese momento.*

## Lo principal

- **Rendimiento (últimos 28 días):** 65 clics, 1.870 impresiones, CTR medio 3,5 %, posición media 12,4. En total desde el inicio, 70 clics.
- **Indexación de páginas:** **1.428 páginas indexadas** y **602 sin indexar**.
- **Core Web Vitals:** sin datos (el sitio todavía recibe poca gente, Google no tiene muestra).
- **HTTPS:** las 301 páginas medidas, bien. **Rutas de exploración:** 301 válidas, 0 inválidas. **Metadatos de imagen:** 196 válidos, 0 inválidos. **Eventos:** 3 válidos.

## Las 602 páginas sin indexar, por motivo

| Motivo | Páginas | Qué es | Qué hacer |
|---|---|---|---|
| Descubierta, actualmente sin indexar | 337 | Google las encontró (por el sitemap) pero todavía no las rastreó. Típico de un sitio nuevo con poca autoridad. | Esperar; ayudar con enlaces internos y con que el sitemap solo tenga lo que vale (decisión D2 del informe de SEO). |
| Rastreada, actualmente sin indexar | 117 | Google las leyó y decidió no indexarlas todavía. Es una señal de calidad: contenido parecido a lo que ya hay o poco valor propio. | Es el motivo número uno para hacer notas con datos propios (informe G y K). Revisar cuáles son. |
| Excluida por etiqueta noindex | 74 | Las que nosotros marcamos noindex a propósito. | Esperado. Revisar que sean las que corresponden. |
| No se ha encontrado (404) | 70 | URL que ya no existen (notas que salieron del sitio con el tope de 500 notas, por ejemplo). | Revisar cuáles son: si son notas que pasaron a R2, tienen que seguir abriendo (regla del archivo) o redirigir. |
| Página con redirección | 4 | Redirecciones normales. | Nada. |

## Qué consultas traen gente (28 días)

207 consultas distintas, casi todas con 1 a 18 impresiones. Las que más aparecen son noticias nacionales del momento (un cantante, un conductor, una canción) y algunas de Balcarce ("tiempo balcarce", "osebal", "simulacro ruta 226", "radar"). Los clics vienen de muy pocas: una nota de rendimientos de billeteras virtuales, "tiempo balcarce" y una consulta de una consultora. Es un sitio recién arrancado: todavía no hay una consulta propia que traiga tráfico estable.

## Qué dice esto para la 2.0

1. **El mayor problema de indexación es calidad y autoridad, no técnica.** La parte técnica está bien (HTTPS, sitemaps, imágenes, rutas). Lo que frena es que Google no ve motivo para indexar 454 de las páginas.
2. **Notas únicas con datos propios** (informes G y K) es la palanca que más peso tiene sobre las 117 "rastreadas sin indexar".
3. **Lo de Balcarce es donde podemos ganar:** "tiempo balcarce", "osebal", la Estudiantina, farmacias, simulacros. Conviene reforzar páginas fijas de servicio (clima, farmacias de turno, teléfonos útiles) con datos propios y enlaces desde cada nota.
4. **Los 70 404** hay que mirarlos uno por uno en Search Console (Indexación → No se ha encontrado) para confirmar si son notas archivadas que deberían seguir abriendo.
5. **Falta mirar:** el sitemap enviado (cuántas URL, cuántas leídas), "Aparición en búsquedas" (Discover, Noticias) y el informe de IA generativa que aparece en la página de Rendimiento.

## Lo que no se pudo ver

- **Cloudflare:** el panel pidió iniciar sesión (no hay sesión en este Chrome). Los minutos de Workers Builds y el uso real de R2 quedan sin mirar. Lo hace una persona o se arma el acceso.

## Cloudflare, leído el 24/10/2026 (sólo lectura)

- **Minutos de compilación (Workers Builds):** **578 minutos usados** en el período 11/10 al 11/11, de los 6.000 incluidos en el plan. Uso facturable acumulado: US$ 0,00.
- **Compilaciones del motor:** 94 hasta ahora. Promedio: unos 6 minutos por compilación (578 / 94), no los 14 que se temían. Hay que confirmar la duración exacta por vuelta en cada compilación.
- **Proyección:** si se sostiene el ritmo (unas 47 compilaciones por día de unos 6 minutos), serían unos 8.500 minutos por mes, o sea unos 2.500 por encima de lo incluido (orden de US$ 12 a 15 de excedente por mes). Con la vuelta de noche una por hora y las imágenes en R2 (regla 312) entra en el presupuesto.
- **Workers en Cloudflare:** tareas (subido hace 22 h), reloj, vigilante, motor y archivo (hace 1 día), imágenes, archivo-staging y sondeo-fuentes. Los Workers de hoy todavía no están subidos con los cambios del 24/10: falta correr «Desplegar Workers de Cloudflare» (lo hace una persona).
- **Uso del mes:** 7,72 mil pedidos y 34,39 mil ms de CPU. Sin alertas de presupuesto configuradas (hay un botón «Add Budget Alert»).
- **Sobrante:** `radar-balcarce-sondeo-fuentes` (8 días) y `radar-balcarce-archivo-staging` (7 días) parecen ensayos que ya no hacen falta; confirmar antes de borrarlos.
