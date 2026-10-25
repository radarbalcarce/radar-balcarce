# Qué va a Facebook e Instagram y cuántos posteos por día (propuesta, 17/10/2026)

*Pedido de Hernán, 17/10: "En posteos de Facebook y de Instagram, sólo notas de Balcarce o, si no son de Balcarce, las más populares que tengamos, vengan de donde vengan. Hoy se publicó una de
eventos de La Plata y no suma. Es mejor que sean de Balcarce o las más populares del momento. Seguramente hagamos más posteos por día: pensalo." La primera parte **está hecha** (regla 280). La
segunda —cuántos por día— es una **propuesta con una pregunta**: no se cambió el contrato del día ni las horas.*

## 1. Lo que se cambió (regla 280)

- **Se sacó el "relleno"** (regla 161, 12/10): si no alcanzaban las notas de Balcarce, se completaban los cinco del día con lo de afuera de mayor puntaje y **sin piso**. Por eso salió, el 17/10 a las 8:05,
  «La Plata concentra propuestas culturales y deportivas para el sábado» (id `dg5er4`: 2 medios, `local: false`, sección Cultura y agenda).
- **Ahora, a Facebook y a Instagram** (que copia a Facebook) **sólo van**: (a) lo de Balcarce de verdad (`esParaLasRedes`: `local: true`, que es la definición de `esDeAca` ya con la lectura de la IA aplicada; una
  nota de otra ciudad que un medio de acá reproduce llega con `local: false` y no entra), (b) **lo más contado del país**: lo de afuera que cuentan **`FACEBOOK.mediosParaRedes` = 5 medios distintos o más**
  (los del mismo dueño cuentan uno) y que sea noticia (ni "dónde ver", ni "en vivo", ni pronóstico, ni cotización), (c) lo que una persona marcó desde el celular. Política y Policiales siguen esperando a una persona.
- **Los repasos** (reel e historia en las dos redes) piden lo mismo para lo de afuera: 5 medios o más **y** los 80 puntos que ya pedían (si preferís sólo la popularidad, se baja el 80).
- **Orden dentro del cupo**: lo marcado por una persona, lo de acá que cuentan tres medios de Balcarce o más, el resto de lo de acá y **al final** lo más contado del país (los que cuentan más medios, primero).
  Es decir: lo de afuera sólo ocupa los lugares que lo de Balcarce deja libres.

## 2. Cuántas notas pasarían por día según la barra de medios

Medido con el código nuevo (`vaAFacebookPorLoQueEs`, `esPopularParaRedes`) sobre las **1.237 notas** que pasaron por la portada del 27/09 al 17/10 (de cada nota se tomó el mayor puntaje que tuvo en
`web/data/portada.json`, mirando su historia de git cada 3 horas; las del 29/09 al 16/10, 18 días). "Candidatas" quiere decir que cumplen la regla de lo que es; después se aplican la hora (8 a 22), los 90
minutos entre un posteo y otro, las 8 horas de vida y no repetir tema, que recortan algo más.

| De afuera con… | notas por día que pasan la barra | …y con 80 puntos o más (las que entran a un repaso) |
|---|---|---|
| 4 medios | 19,2 | 7,3 |
| **5 medios (hoy)** | **14,4** | **6,1** |
| 6 medios | 10,2 | 4,6 |
| 8 medios | 6,0 | 3,1 |

Lo de Balcarce que cumple la regla de lo que es (relevancia 75 o más): **11,3 por día** en promedio (con 65 o más, 12,7; con 55 o más, 16,2; cualquiera, 16,7). Los fines de semana bajan a 4 a 8 y el
domingo 11/10 fue 0 (el 11/10 no salió ningún posteo por eso mismo).

**Lo que realmente salió** (libro `web/data/redes.json`, 21/09 al 17/10): 106 posteos; de los 90 que se pudieron mirar (los otros 16 ya no están ni en la portada ni en el archivo) **83 eran de Balcarce y 7 de afuera**. De esas 7, con la regla nueva habrían salido 5 (las que cuentan 5 medios o más:
balanza de pagos, Pueblos originarios, Milei, ARCA y el Banco Central) y **no** 2: «Natalia Carballo juega la Copa Sudamericana de tenis» (1 medio) y la agenda de La Plata (2). En la práctica
**lo de Balcarce llena casi todo el cupo y lo de afuera es un complemento**: pasar de 5 a 6 u 8 medios casi no cambia cuántos posteos salen, sólo cuáles entran en los días flojos.

**Barra elegida: 5.** Se queda en la constante `FACEBOOK.mediosParaRedes` (tabla de `CRITERIO-EDITORIAL.md`); subirla a 8 deja sólo lo "de tapa" (unos 6 por día), bajarla a 4 abre la puerta a 19.

## 3. Cuántos posteos por día (propuesta)

Hoy: **5 por día** (`FACEBOOK.porDia`; `CONTRATO_DIARIO.posteosPorDia`), de 8:00 a 22:00, **90 minutos** entre uno y otro (`minutosEntrePosteos`), hasta 8 horas de vida de la nota, un tema una vez por día.
Salieron unos 4,4 por día en promedio (106 en los 24 días con posteos). El posteo de una nota **no gasta voz**: la imagen es la tarjeta de la nota (`/nota/<id>/instagram.png`, la arma la web) y Facebook e Instagram son gratis; el
cupo de 10 audios por día es de los repasos, el clima, la farmacia y las piezas semanales, que no cambian con esto.

| Opción | Posteos por día | Separación | Cuántos hay para ocupar el cupo (promedio, barra de 5 medios) | Costo | Notas |
|---|---|---|---|---|---|
| **A. Como hoy** | 5 | 90 min | 4,8 | 0 voces, 0 dinero | Se llena casi siempre; no se pierde nada importante, pero sobran ~6 notas buenas de acá por día |
| **B. Un poco más (recomendada)** | **8** | 90 min | 7,7 | 0 voces, 0 dinero | Cabe en el día (de 8:00 a 21:30 hay 10 lugares con 90 minutos); lo de acá ocupa ~6 a 7 y lo de afuera completa. Los topes de Meta (100 posteos por día por la API en Instagram) están lejos |
| C. Llenando la jornada | 10 | 90 min | entre 7,7 y 11,4 (no hay siempre) | 0 voces, 0 dinero | Es el máximo con 90 minutos entre posteos y el horario de hoy; con 53 seguidores, diez por día puede bajar el alcance de cada uno (sin medición propia todavía) |
| D. Más | 12 a 15 | 60 min | 11,4 a 13,9 | 0 voces, 0 dinero | Hay que achicar la separación y ampliar la ventana; con 53 seguidores y 7 en Instagram, **no hay audiencia que lo justifique** hoy |

Qué mirar antes de decidir (todo está en el panel, pestaña Números): el **alcance por posteo** de los de la tarde contra los de la mañana (si el sexto y el séptimo alcanzan a alguien, o sólo diluyen). Los
repasos (10, 15 y 21), que son los que tienen voz, no se tocan.

**Qué habría que cambiar si se aprueba** (todo chico, con su prueba): `FACEBOOK.porDia` y `CONTRATO_DIARIO.posteosPorDia` en `ingesta/criterio.mjs` y sus filas en `CRITERIO-EDITORIAL.md`; las pruebas que dicen
"5 por día" (`redes.test.mjs`, «el tope y el piso de Facebook son los conservadores…», y las del contrato). El vigilante y el contrato del día toman el número del criterio.

## 4. Preguntas para Hernán

1. **¿Cuántos posteos por día?** Recomiendo **8** (opción B); se puede empezar con 6 e ir subiendo dos semanas después de mirar el alcance.
2. **¿Lo de afuera sólo ocupa lo que sobra de Balcarce (como está) o reservamos 2 lugares por día a lo más contado del país, aunque haya de Balcarce para llenar?** Hoy, como está, en la práctica casi no sale lo de afuera
   (7 de 90 posteos).
3. **¿La barra de lo de afuera, en 5 medios?** (4 deja pasar más, 8 sólo la tapa.)
4. **¿Bajamos la relevancia mínima de lo de Balcarce de 75 a 65?** Suma ~1,4 notas de acá por día; con 8 posteos diarios hace falta menos que eso, así que mi voto es dejar el 75.
