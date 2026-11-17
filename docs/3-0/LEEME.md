# Radar 3.0: la documentación para Hernán y Andrés

*Escrita el 3/11/2026, el día del corte, leyendo el código de `v3/`, el plan (`docs/propuestas/PLAN-RADAR-3-0.md`) y los datos reales del repositorio. Cada documento se entiende solo. Donde algo no estaba claro en el código dice **a confirmar**; nada está inventado. Si un documento y el programa no coinciden, manda el programa.*

## Los documentos

| Documento | Para qué sirve | Cuándo abrirlo |
|---|---|---|
| [`UN-DIA-DEL-SITIO.md`](UN-DIA-DEL-SITIO.md) | Cómo funciona hoy un día de Radar 3.0 hora por hora: el núcleo cada 15 minutos, el clima, las redes, la vigilancia, las páginas del sitio, el gasto de IA y sus frenos, qué hacer si algo falla y qué queda del sistema viejo | Para entender el conjunto, o cuando algo no anda |
| [`TELEGRAM.md`](TELEGRAM.md) | Todo lo que se puede hacer con el bot `@radarbalcarce_bot`: escribir una nota propia («armala», «ok»), ver, retirar y corregir lo publicado, y qué avisos manda | Para escribir una nota o sacar/corregir una |
| [`REDES.md`](REDES.md) | Cómo quedan las redes (la tabla de lo que sale hoy está en `CONTENIDO-REDES-3-0.md`): tabla por red (Facebook, Instagram, TikTok, YouTube, X, Threads, Bluesky, canal de Telegram, WhatsApp) con qué se publica, cuántas, a qué hora, con voz o no y en qué estado está cada una; las piezas; qué nunca va a redes; el clima auspiciado y el cupo de voces | Para decidir horarios y formatos, o ver qué falta |
| [`PUBLICIDAD.md`](PUBLICIDAD.md) | Cada espacio publicitario (T1 a T4, N1, N2, S1, S2, P1, C1 y los de Google A1 a A3), fijo o rotativo; los cinco planes; el proceso con un comercio nuevo hasta que sale el aviso; el media kit; qué decir y qué no | Cuando un comercio pregunta, o para cargar o sacar un aviso |
| [`ESTADISTICAS-LINEA-DE-BASE-2026-11-03.md`](ESTADISTICAS-LINEA-DE-BASE-2026-11-03.md) | La «foto» de hoy (visitas, de dónde llegan, aparatos, notas por día, seguidores, publicaciones, vistas de los reels, gasto de IA) con una tabla vacía para llenar y comparar | El martes 10/11 |

## Lo más importante (al 17/11/2026)

1. **El sitio nuevo anda en `radarbalcarce.com` desde el corte del 3/11.** El núcleo publica solo cada 15 minutos (el 17/11: 95 fuentes activas, unas 60 notas por día). La red de seguridad del sitio viejo (`RESPALDO_VIEJO`) está apagada desde el 10/11.
2. **Las redes publican de verdad** (`REDES_ACTIVAS = "si"` en `v3/redes/wrangler.toml`): Facebook, Instagram, TikTok, YouTube y X (por Buffer), Threads y Bluesky. El canal de Telegram no tiene programa. Qué sale, a qué hora y por qué: **[`CONTENIDO-REDES-3-0.md`](CONTENIDO-REDES-3-0.md)**.
3. **El reloj de los videos es el Worker `radar-redes`** (despierta los workflows de GitHub; el token `RELOJ_GITHUB_TOKEN` es el punto único de falla). Desde el 17/11 también despierta las estadísticas, el armado de las efemérides del día 20 y el respaldo de la base (hace falta desplegar `redes` para que valga).
4. **El sistema viejo se está apagando** (10/11), pero no se puede borrar todavía: `APAGAR-EL-VIEJO.md` y `PASOS-PARA-USTEDES-10-11.md`. El repositorio sigue público.
5. **El bot de Telegram** es la puerta para escribir notas propias y administrar lo publicado; hoy lo usa sólo Hernán.
6. **AdSense rechazó el sitio el 13/11** («contenido de bajo valor»): el plan está en `PLAN-DE-TRABAJO-17-11.md` y `AUDITORIA-SITIO-17-11.md`; no se pide la revisión hasta tener 3 a 4 semanas de contenido propio.

## Qué leer para ponerse al día

| Documento | Para qué |
|---|---|
| [`PENDIENTES-3-0.md`](PENDIENTES-3-0.md) | La única lista de tareas, por prioridad |
| [`AUDITORIA-SISTEMA-17-11.md`](AUDITORIA-SISTEMA-17-11.md) y [`AUDITORIA-SITIO-17-11.md`](AUDITORIA-SITIO-17-11.md) | El estado verificado del 17/11 y sus hallazgos |
| [`PLAN-DE-TRABAJO-17-11.md`](PLAN-DE-TRABAJO-17-11.md) | Qué se decidió ese día (ya integrado en los pendientes) |
| [`CONTENIDO-REDES-3-0.md`](CONTENIDO-REDES-3-0.md) | Qué sale en cada red hoy y lo que pidió Hernán el 17/11 |
| [`FOTOS-ORIGINALES-PROPUESTA.md`](FOTOS-ORIGINALES-PROPUESTA.md) | Propuesta para guardar las fotos en máxima resolución |
| `VIGILANCIA-Y-VENCIMIENTOS.md` | Qué vigila la vigilancia y qué vence cuándo |

## Cosas para confirmar (lo que sigue abierto)

- ¿Quieren que **Andrés** también pueda hablarle al bot?
- ¿Está cargado el aviso de **Sweet Candy Bar**? (no hay evidencia en el repositorio)
- ¿Está creado el **canal de Telegram**? (el programa no existe todavía)
- **Calendario de climas auspiciados** y **pestaña de avisos en `/admin`**: no los encontré programados.
- Las decisiones de `CONTENIDO-REDES-3-0.md` (sección E) y de `FOTOS-ORIGINALES-PROPUESTA.md` (sección 5).

*Resueltas desde la primera versión de este documento: las redes 3.0 se prendieron el 3/11; `RESPALDO_VIEJO` se apagó el 10/11; Bluesky y Threads ya publican (5/11); el 10/11 ya pasó y la línea de base del 3/11 sigue siendo la referencia; AdSense contestó (rechazo del 13/11).*

## Dónde está lo técnico

Cada módulo de `v3/` tiene su `REGLAS.md` (`nucleo`, `sitio`, `redes`, `redes/piezas`, `redaccion/telegram`, `vigilancia`). El plan, con todas las decisiones y su historia, está en `docs/propuestas/PLAN-RADAR-3-0.md` (sección 10, de abajo hacia arriba). Los formatos de las redes en detalle: `docs/propuestas/REDES-3-0-FORMATOS.md`. El manual de avisos con capturas: `docs/propuestas/MANUAL-AVISOS-3-0.md`.
