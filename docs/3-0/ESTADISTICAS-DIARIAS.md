# Estadísticas diarias de Radar 3.0

*Escrito el 6/11/2026. Módulo `v3/redes/estadisticas.mjs`, probado en `v3/redes/estadisticas.test.mjs`. Corre dentro del Worker `radar-redes`, en el resumen de las 22:05 (el mismo cron de siempre, sin cron nuevo).*

## Qué guarda

Una fila por día y métrica en la tabla `estadisticas` de la base D1 `radar-nucleo` (día de Balcarce, métrica, valor, cuándo se midió). Volver a medir el mismo día **actualiza** la fila. Lo que una fuente no pudo dar no se anota (ni como cero) y no pisa lo que ya había.

| Métrica | De dónde sale |
|---|---|
| `visitas`, `paginas_vistas` | Cloudflare Web Analytics (GraphQL), día de Balcarce |
| `fb_seguidores`, `fb_alcance`, `fb_impresiones` | API de Meta, página «Radar Balcarce» |
| `ig_seguidores`, `ig_alcance`, `ig_impresiones` | API de Meta, Instagram vinculado |
| `notas_publicadas`, `piezas_publicadas`, `posteos_publicados` | La misma base (notas, piezas y publicaciones del día) |

## La comparación

`compararSemanas(env, dia)`: los 7 días que terminan en `dia` contra los 7 anteriores. Las métricas de flujo se suman; los seguidores se comparan por el último valor de cada semana. El resumen de las 22:05 por Telegram agrega el bloque «Semana contra semana» (una línea por Sitio, Facebook, Instagram y Publicado). Si la semana anterior no tiene los 7 días, lo dice. Si la medición falla, el resumen sale igual y el motivo queda en el log del Worker.

## Lo que tiene que poner una persona

| Variable | Dónde | Para qué |
|---|---|---|
| `CLOUDFLARE_ANALYTICS_TOKEN` | Secreto de GitHub; el workflow «Radar 3.0: desplegar» (opción redes) lo carga en el Worker | Visitas. Token de Cloudflare con el permiso **Account Analytics: Read**. Sin él, las visitas se saltean. |
| `CLOUDFLARE_ACCOUNT_ID` | Ya es secreto de GitHub; el workflow ahora también lo carga en el Worker de redes | Visitas |
| `CLOUDFLARE_SITE_TAG` (opcional) | Variable del Worker | Si no está, se busca el sitio radarbalcarce.com entre los de analítica de la cuenta |
| `META_TOKEN` | Ya cargado | Seguidores, alcance e impresiones. Necesita `read_insights` e `instagram_manage_insights` (el token actual los tiene, según CLAUDE.md). |

Después de sumar el secreto hay que volver a correr «Radar 3.0: desplegar» con la opción redes (esto también crea la tabla `estadisticas`, que está en `v3/redes/schema-redes.sql`).

## Cosas a confirmar con la primera corrida real

- **Los nombres de las métricas de Meta** (`INSIGHTS_META` en el módulo: `page_total_media_view_unique`, `page_media_view`, `reach`, `views`) son los vigentes según lo que sé de la API, pero Meta los cambia seguido. Si alguno falla, el resumen no se cae: la métrica queda sin dato y el motivo va al log. Se corrige en un solo lugar.
- Los seguidores y los insights se piden a las 22:05, así que el día queda medido casi completo; las visitas de Cloudflare llegan hasta ese momento y se vuelven a pedir si se corre `POST /resumen` otra vez.
- Con las redes en ensayo (`REDES_ACTIVAS` = no), piezas y posteos cuentan lo simulado.
