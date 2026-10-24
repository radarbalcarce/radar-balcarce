# La alerta «auditoria-ia no sale bien» del 24/10/2026

*Informe corto. Regla 318 (`docs/10-REGLAS-Y-PRUEBAS.md`).*

## Qué se vio

El vigilante abrió «La tarea «auditoria-ia» no sale bien hace 7,5 h» (desde las 11:40 de Balcarce, ya iba por 8,5 h a las 17:12). Las otras tareas del Worker (redes, pistas, vigilancia) venían bien, el Worker de tareas contestaba su `/estado`, y el reloj sigue pidiendo la auditoría a los :41 de 7 a 23.

## Lo que está comprobado (en el repositorio)

- La auditoría de la nube **casi no leyó nada desde la mudanza**. `web/data/auditoria-ia.json` (contadores por día): hasta el 22/10, entre 44 y 100 notas leídas por día. El 23/10, **4**; el 24/10, **1**. Los commits «Auditoría IA · …» pasaron de uno por hora a **dos** desde el 22/10 a la noche (23/10 07:41 y 24/10 08:41, las dos de la mañana, cuando hay 1 a 4 notas nuevas).
- Hay material: ahora mismo hay 10 notas de las últimas 12 horas sin leer (se comprobó corriendo `notasParaAuditar` con la portada de `main`).
- **Si la corrida terminara, aunque las IA fallen, dejaría rastro**: cualquier pedido fallido suma a `fallas`, eso reescribe `auditoria-ia.json` (`generado` cambia) y el corredor hace un commit. Se probó con la tarea entera en Node (GitHub y KV de mentira, datos reales, Groq con 429, con respuesta rota, y Groq 429 más OpenRouter 502): en los cuatro casos `ok: true`, un commit y `ultimaBuena` al día. **Que no haya commits entre las 08:41 y las 17:41 significa que las corridas no llegaron al final.**
- La tarea nunca devuelve «falla» por falta de material, por falta de clave (`Sin GROQ_API_KEY: no se audita`) ni por cupo agotado: salen `ok`. Por eso el vigilante no avisa de eso (y tampoco de que la auditoría lea 0 notas por día: queda sólo en los contadores).
- Claves y permisos no son: la clave de Groq y la de OpenRouter se despliegan al Worker (`desplegar-nube.yml`), y sin clave la tarea termina bien. No hay variable ni binding R2 que falte: la tarea no usa R2 ni caché (la «caché de notas» del workflow viejo no existe; lee `portada.json` por la API de GitHub).

## Causa más probable (sin los registros del Worker no se puede confirmar al 100 %)

Una corrida que **Cloudflare corta antes de terminar**. `auditarNotas` lee de a 3 notas, duerme 25 s entre pedidos, y cada pedido puede tardar mucho: Groq hasta 90 s y, si falla, OpenRouter (desde el 23/10 02:30 la clave llega al Worker) con hasta 3 modelos gratis de 75 s cada uno: **315 s por pedido**. Con 12 notas son 4 pedidos: ~17 minutos en el peor caso, más que los 15 que el reloj le deja a la invocación. Cloudflare cancela, la corrida no llega al `finally`, no guarda nada y no anota cómo salió: queda sin commit y sin `ultimaBuena`. Eso explica por qué sólo salieron las corridas de la mañana (1 a 4 notas = 1 o 2 pedidos) y por qué el 23/10 los modelos gratis de OpenRouter fallaron 12 de 12 pedidos de la lectura (uso-ia.json). En Actions (6 horas de tope) este mismo código no se notaba.

Segundo defecto, que agravaba el primero: en el Worker la auditoría **no veía `web/data/uso-ia.json`**, así que su tope propio de OpenRouter (22 pedidos por día) arrancaba de cero en cada corrida y no contaba lo que ya gastaban la lectura y la redacción (36 de 45 el 23/10) del mismo cupo gratis de la cuenta.

## Qué se cambió

1. `ingesta/auditoria-ia.mjs`: `AUDITORIA.empezarAntesDeSegundos = 240`. Pasado ese tiempo no se empieza otro pedido; lo que no se alcanzó queda para la hora siguiente (`sinTiempo`, no cuenta como falla). Peor caso: 240 + 25 + 315 = ~10 minutos.
2. `redes/auditar-notas.mjs`: la auditoría **lee** `web/data/uso-ia.json` (no lo escribe: lo escribe el motor y una copia vieja lo pisaría). Cuenta `sinTiempo` en su línea de salida.
3. `infra/tareas-cloudflare/corredor.mjs` y `worker.mjs`: cada corrida anota al arrancar `inicio:<tarea>` (otra clave de KV, por el límite de una escritura por segundo por clave); `GET /estado` lo devuelve como `empezo`.
4. `infra/vigilante-cloudflare/worker.mjs`: `causaDeLaTarea` agrega al aviso una frase que distingue tres casos que antes se veían igual: **la cortaron** (arrancó hace más de 20 min y nunca anotó cómo terminó), **terminó con error** (con su motivo) y **el reloj no se la pide** (ni una corrida arrancó desde hace más que su ritmo). La clave del aviso no cambia.

Pruebas: `auditoria-ia.test.mjs`, `tareas-cloudflare.test.mjs`, `vigilante-nube.test.mjs`. Variables nuevas: ninguna.

## Qué tiene que hacer una persona

Los cambios están en el repositorio pero **el Worker de tareas, el vigilante y el reloj no se suben solos**: correr a mano «Desplegar Workers de Cloudflare» (`que: todo`, con la nube prendida y la lista `NUBE` de siempre). Después:

1. Cloudflare → Workers → `radar-balcarce-tareas` → Logs (o el flujo en vivo) a los :41. Debe aparecer `auditoria-ia: N archivo(s) bajados` y después `guardado …` o `nada nuevo`. Si en los registros de **antes** del cambio se ve esa primera línea y nada más (sin `guardado` ni `ERROR`), o un corte con «canceled» o «exceeded», se confirma la causa.
2. A la hora siguiente el aviso `tarea-auditoria-ia` se cierra solo cuando hay una corrida buena. Si vuelve a abrirse, su texto ahora dice cuál de los tres casos es.
3. Opcional: ver cuántas notas lee por día en `web/data/auditoria-ia.json` (`contadores.dias`); tiene que volver a 40–100.

Si Groq sigue fallando seguido (no es nuevo: 1 a 9 fallas por día), se arregla de otro modo: más cupo o otro modelo; no es un cambio de código de esta tanda.
