# Radar 3.0: la documentación para Hernán y Andrés

*Escrita el 3/11/2026, el día del corte, leyendo el código de `v3/`, el plan (`docs/propuestas/PLAN-RADAR-3-0.md`) y los datos reales del repositorio. Cada documento se entiende solo. Donde algo no estaba claro en el código dice **a confirmar**; nada está inventado. Si un documento y el programa no coinciden, manda el programa.*

## Los documentos

| Documento | Para qué sirve | Cuándo abrirlo |
|---|---|---|
| [`UN-DIA-DEL-SITIO.md`](UN-DIA-DEL-SITIO.md) | Cómo funciona hoy un día de Radar 3.0 hora por hora: el núcleo cada 15 minutos, el clima, las redes, la vigilancia, las páginas del sitio, el gasto de IA y sus frenos, qué hacer si algo falla y qué queda del sistema viejo | Para entender el conjunto, o cuando algo no anda |
| [`TELEGRAM.md`](TELEGRAM.md) | Todo lo que se puede hacer con el bot `@radarbalcarce_bot`: escribir una nota propia («armala», «ok»), ver, retirar y corregir lo publicado, y qué avisos manda | Para escribir una nota o sacar/corregir una |
| [`REDES.md`](REDES.md) | Cómo quedan las redes: tabla por red (Facebook, Instagram, TikTok, YouTube, X, Threads, Bluesky, canal de Telegram, WhatsApp) con qué se publica, cuántas, a qué hora, con voz o no y en qué estado está cada una; las piezas; qué nunca va a redes; el clima auspiciado y el cupo de voces | Para decidir horarios y formatos, o ver qué falta |
| [`PUBLICIDAD.md`](PUBLICIDAD.md) | Cada espacio publicitario (T1 a T4, N1, N2, S1, S2, P1, C1 y los de Google A1 a A3), fijo o rotativo; los cinco planes; el proceso con un comercio nuevo hasta que sale el aviso; el media kit; qué decir y qué no | Cuando un comercio pregunta, o para cargar o sacar un aviso |
| [`ESTADISTICAS-LINEA-DE-BASE-2026-11-03.md`](ESTADISTICAS-LINEA-DE-BASE-2026-11-03.md) | La «foto» de hoy (visitas, de dónde llegan, aparatos, notas por día, seguidores, publicaciones, vistas de los reels, gasto de IA) con una tabla vacía para llenar y comparar | El martes 10/11 |

## Lo más importante en seis líneas

1. **El sitio nuevo ya está en `radarbalcarce.com`** (corte del 3/11). El núcleo publica solo cada 15 minutos.
2. **Las redes las publica la 3.0 desde el 3/11** (corregido el 10/11: antes decía «en ensayo»). Las del sistema viejo están apagadas.
3. **TikTok, YouTube y X salen por Buffer desde la 3.0** (5/11); Threads y Bluesky publican enlaces. El canal de Telegram no tiene programa.
3 bis. **El sistema viejo se está apagando** (10/11): su reloj y su vigilante quedaron sin horarios y 11 de sus workflows, desactivados. Qué falta: `APAGAR-EL-VIEJO.md` y `PASOS-PARA-USTEDES-10-11.md`.
4. **El bot de Telegram** es la puerta para escribir notas propias y administrar lo publicado. Hoy lo usa solo Hernán.
5. **La publicidad** está armada (lugares, planes, media kit y comando para cargar avisos); falta el **primer aviso real**.
6. **Google Analytics recién empieza** (3/11): no hay datos para comparar todavía; la foto de hoy se hizo con las visitas de Cloudflare.

## Cosas para confirmar (juntas)

- ¿Quieren que **Andrés** también pueda hablarle al bot?
- ¿Cuándo se **prenden las redes 3.0** y se apagan las viejas? (No hay fecha escrita.)
- ¿Cuándo se apaga la **red de seguridad** del sitio viejo (`RESPALDO_VIEJO`)?
- ¿Ya está cargado el aviso de **Sweet Candy Bar**?
- ¿Está creado el **canal de Telegram**, y la cuenta de **Bluesky**?
- ¿Google **AdSense** ya aprobó el sitio?
- **Calendario de climas auspiciados** y **pestaña de avisos en `/admin`**: ¿están programados? No los encontré.
- El **10/11 cae martes**, no lunes: ¿comparamos la semana del 3/11 al 9/11 como figura en la línea de base?
- Las **cifras de los reels** que pasó Hernán: ¿de qué red, día y hora es cada una?

## Dónde está lo técnico

Cada módulo de `v3/` tiene su `REGLAS.md` (`nucleo`, `sitio`, `redes`, `redes/piezas`, `redaccion/telegram`, `vigilancia`). El plan, con todas las decisiones y su historia, está en `docs/propuestas/PLAN-RADAR-3-0.md` (sección 10, de abajo hacia arriba). Los formatos de las redes en detalle: `docs/propuestas/REDES-3-0-FORMATOS.md`. El manual de avisos con capturas: `docs/propuestas/MANUAL-AVISOS-3-0.md`.
