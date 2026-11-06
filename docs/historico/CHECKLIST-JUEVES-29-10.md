# Checklist para el jueves 29/10/2026

*Armado el sábado 24/10 a la noche. El estado verificado y todo lo pendiente está en `PENDIENTES.md` (la única lista maestra). Esto es lo mínimo para el jueves.*

## 1. Lo que tiene que seguir andando hasta el jueves (se mira solo, no hace falta hacer nada)

| Qué | Cómo se ve que anda | Si falla |
|---|---|---|
| La web se actualiza cada 30 minutos de día y una vez por hora de 23:00 a 6:59 | `https://radarbalcarce.com` con una nota de las últimas horas; el vigilante lo dice en `https://radar-balcarce-vigilante.radarbalcarce.workers.dev/estado` (`minutosSinActualizar` menor de 60) | Mirar Cloudflare → Workers → `radar-balcarce-motor` → Builds; si dice SIMULACRO, volver a correr «Cargar variables del motor» **con `simular` = No** |
| Los minutos de compilación | `gastado` y `alRitmo` en ese mismo estado; tiene que quedar `alRitmo` menor de 6.000 | Si se pasa, el reloj salta vueltas solo; no se cobra de más |
| Las redes salen en sus horarios | Facebook e Instagram de Radar Balcarce | `REDES_ACTIVAS_NUBE` en Cloudflare (reloj) |
| Los avisos del vigilante | `alertasAbiertas` vacío; la de «auditoria-ia» se cierra con la primera corrida buena | Se mandan por mail; mirar el texto del aviso |
| Costo de Cloudflare | Billing → Billable usage: `US$ 0,00` de excedente | Hay una alerta de gasto configurada |

## 2. Ya hecho y en producción (24/10)

Selección sin frenos de lo muy contado y de Balcarce; fecha del hecho por mediana; motivo de cada historia (sin «otros»); guarda del hecho principal contra uniones malas; IA con todas las fuentes; nada de fotos de Wikimedia en notas con fuentes (la foto sale de la fuente o va la placa); SEO técnico (imagen, noindex de plantillas repetidas, mapas por mes listos y apagados); freno de minutos por ciclo de facturación; imágenes de las notas en R2; vuelta de noche una por hora; pausa general y botón «Actualizar la web» del panel apuntando al motor; auditoría IA con tope de tiempo; textos de la web al día.

## 3. Pendiente de Claude (lo hace Claude, sin pedir nada)

1. Piloto de notas con datos propios (apagado): «Antes en Radar», ficha de Colapinto y tira del dólar. Se muestra antes de prender.
2. Estructura para contenido propio: autores, tipo de nota y firma «Por…».
3. Rediseño del panel del celular (`docs/proyecto/PANEL-REDISENO.md`).
4. Cambio del sitio a armado por Worker (`docs/proyecto/SITIO-POR-WORKER-PLAN.md`): se empieza **después del jueves**.
5. Mirar la estadística de selección (`web/data/estadistica-seleccion.json`): que ningún caso grande de 8 medios o más quede sin explicar.

## 4. Pendiente de una persona (cuando quieran; ninguna bloquea el lanzamiento)

1. **Apagar los 7 workflows viejos de GitHub** (Actualizar la web, Redes, Vigilancia, Auditoría IA, Pistas, Informe diario, Ilustrar notas sin foto): en GitHub → Actions → cada uno → «…» → Disable workflow. El robot ya no los llama; se apagan para que nadie los corra por error.
2. **Antes del 31/10: renovar las piezas «Participá»** (vencen ese día): Actions → «Fijar piezas».
3. **Verificación en dos pasos** en Google, Meta, Instagram, GitHub, Cloudflare y DonWeb.
4. **Search Console y Bing:** mirar una vez por semana (15 minutos).
5. **Altas de redes nuevas** (si las quieren): canal de WhatsApp, YouTube, Telegram, Bluesky, Threads, TikTok.
6. **Borrar a mano** posteos de Facebook e Instagram que apunten a notas que ya no estén (se pasa la lista cuando haga falta).

## 5. Decisiones abiertas (una pregunta cada una; Claude recomienda)

1. **Notas automáticas de F1 y fútbol** con foto de Wikimedia del circuito o del estadio (no hay personas): ¿se dejan o van con placa? *Recomendación: dejarlas.*
2. **Notas con menores sin identificar** (la historia existe sin nombre, sin foto y sin redes; abuso y suicidio nunca): ¿se arma? *Recomendación: sí, apagado por defecto y con revisión de una persona antes de prender* (`docs/auditoria-2-0/L-NOTAS-CON-MENORES-ANONIMIZADAS.md`).
3. **Política y Policiales de Balcarce hacia redes:** hoy nadie las autoriza. *Recomendación: una cola diaria de 3 a 5 candidatas en el panel.*
4. **Prender el piloto de notas con datos propios** después de verlo.
5. **Cambio del sitio por Worker** (empieza el jueves): aprobar fecha y la regla de vuelta atrás.

## 6. Qué mirar el jueves, en orden (15 minutos)

1. `https://radar-balcarce-vigilante.radarbalcarce.workers.dev/estado`: sin alertas, `alRitmo` menor de 6.000.
2. Cloudflare → Billing: US$ 0,00 de excedente.
3. La portada: notas de las últimas horas, fotos correctas (de la fuente o placa).
4. Search Console → Páginas: cuántas indexadas y sin indexar (hoy 1.428 y 602).
5. Facebook e Instagram: los posteos de la semana.
6. Con eso, decidir lo de la sección 5 y empezar el cambio del sitio.
