# La vigilancia: las reglas

*Módulo `v3/vigilancia/` (Worker `radar-vigilancia`). Mira que lo demás ande, avisa por Telegram cuando algo se rompe y manda dos informes
por día. Reemplaza al vigilante, al resumen de las 22 y a los dos informes largos del sistema viejo. Escrito el 2/11/2026 con las
decisiones de `docs/propuestas/PLAN-RADAR-3-0.md` (§ 3.12 y sección 10). Si el programa hace otra cosa que esto, el programa está mal.*

## 1. Cuándo corre

- **Cada 30 minutos**, el chequeo.
- **A las 8:00 y a las 20:00 de Balcarce** (11:00 y 23:00 UTC), el informe.
- Habla con el núcleo y con el bot por un enlace directo entre Workers (`/salud` de cada uno). No lee nada más.

## 2. Qué mira en cada chequeo

1. **El núcleo hizo una vuelta en los últimos 40 minutos.** (Tiene que hacer una cada 15.) Si todavía no registra ninguna, también avisa.
2. **El núcleo contesta.** Si no contesta, avisa recién cuando pasa dos chequeos seguidos (una hora): un tropiezo suelto no es un problema.
3. **El bot de Telegram responde y tiene su token.** Misma regla de los dos chequeos seguidos.
4. **El webhook del bot está registrado** en la dirección nuestra y el bot lo revisó en los últimos 45 minutos (lo revisa cada 15).
5. **El gasto de IA del mes llegó al 80 % del freno** (el freno lo trae el núcleo en su `/salud`; hoy US$ 15). Avisa una vez por mes. No avisa
   «volvió a andar» para el gasto: se acaba con el mes.
6. **Fuentes que fallan hace 3 días** (288 vueltas seguidas). Una fuente que nunca anduvo bien se avisa a las 96 fallas (un día entero).
   Avisa por fuente, no todas juntas cada vez.
7. **El sitio contesta**, sólo si el Worker `radar-sitio` está conectado (hoy no: se conecta cuando exista y tenga `/salud`).

## 3. Cuándo avisa

- **Una sola vez por problema.** Lo que ya avisó queda anotado en la memoria propia del Worker (KV `ESTADO`); mientras el problema siga abierto,
  no insiste.
- **Cuando se arregla, avisa «volvió a andar».** (Salvo el gasto, ver arriba.) Si Telegram no pudo entregar un aviso, lo reintenta en el
  próximo chequeo; si no pudo entregar un «volvió a andar», también.
- **Si el bot de Telegram no responde**, no hay forma de avisar por ahí: manda **un mail a `radarbalcarce@gmail.com`** (una vez por caída,
  con todo lo que está mal en ese momento) por Cloudflare Email Routing. Cuando el bot vuelve, avisa por Telegram. **El mail necesita Email
  Routing activo** en el dominio y la dirección de destino verificada; si falta, el Worker sigue andando y deja una línea en su registro
  (log), y lo reintenta en cada chequeo.
- Los mensajes son cortos, en castellano rioplatense, sin alarmas ni mayúsculas, y siempre dicen qué pasa y desde cuándo.

## 4. El informe de las 8 y las 20

Un mensaje por Telegram (partido en varios de hasta 3.500 caracteres si hace falta) con lo que pasó **desde el informe anterior**:

- cuántas notas **habría publicado** el núcleo (mientras no haya corte, todo son borradores; cuando haya corte, dice «publicó») y cuántas
  por sección;
- cuántas notas **frenó** y **por qué** (el motivo que escribió la IA: menor, víctima, lista de sepelios…);
- el **gasto de IA** del día y del mes, con el porcentaje del freno;
- las **fuentes caídas** hace 3 días o más;
- los problemas que siguen abiertos, o la línea **«Todo en orden.»** si no hay ninguno.

Si el núcleo no contesta, el informe lo dice y no inventa números. Si Telegram no pudo entregarlo, el informe siguiente cubre la misma
ventana (no se pierde nada). Las notas las pide al núcleo por `/notas?dia=`, con la contraseña derivada del token del bot (la misma que
usan el bot y el núcleo; nunca se imprime ni se guarda).

## 5. Qué muestra `GET /salud` de la propia vigilancia

El último chequeo (cuándo fue, si estaba todo bien, qué problemas había abiertos y desde cuándo), cuándo salió el último informe y qué está
conectado (núcleo, bot, sitio, mail, token: sólo sí o no). Nunca secretos.

## 6. Lo que no hace

- No arregla nada solo: avisa. Tampoco reinicia Workers.
- No mira las redes sociales ni la web publicada (todavía no existen en 3.0); se suman cuando existan sus Workers.
- No manda WhatsApp ni otro canal: Telegram, y el mail sólo si el bot está caído.

## 7. Qué necesita

- Secreto `TELEGRAM_TOKEN` (para derivar la contraseña con la que el núcleo y el bot aceptan sus pedidos).
- KV `ESTADO` propio (qué avisó, el último chequeo, el último informe). El workflow lo crea.
- Enlaces a los Workers `radar-nucleo` y `radar-telegram` (y, cuando exista, `radar-sitio`).
- Para el mail de respaldo: Email Routing activo en `radarbalcarce.com` y `radarbalcarce@gmail.com` verificada como destino.
