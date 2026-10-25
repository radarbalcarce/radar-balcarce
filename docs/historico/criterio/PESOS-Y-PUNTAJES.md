# Pesos y puntajes: auditoría y recalibración propuesta

*16/10/2026. Página para decidir (con Sí / No / Duda y "Copiar mis decisiones"):
`docs/criterio/PESOS-Y-PUNTAJES.html`. **No se cambió ningún número en producción.***

## Qué se midió

- **Lo publicado:** las 724 versiones de `web/data/portada.json` del 1 al 15/10 (990 notas de
  medios: 339 de acá, 651 de afuera), con el puntaje con que apareció cada una.
- **Lo que esperaba o se descartaba:** la ingesta real corrida el 16/10 a las 9:42 sin escribir
  nada (577 historias). La fórmula reconstruida da exacto en 509 (88 %).
- **Las visitas:** `web/data/estadisticas.json`, notas del 1 al 12/10 (729 notas, 732 visitas,
  182 con alguna). Pocas: sirven para diferencias grandes, no para afinar un punto. Casi todo se
  midió sin lo que fue a Facebook, que trae la mayoría de las visitas.

## Lo que se encontró

1. **El puntaje no decide si una nota sale: ordena.** Deciden el semáforo, los medios mínimos y
   el cupo. El puntaje ordena el cupo, elige la nota grande, Facebook, los repasos y el aviso
   "muy importante".
2. **El cupo se gasta en notas fantasma (lo más raro).** `aplicarCupos` reparte el cupo de afuera
   entre todo lo de la ingesta, también notas de hasta 2-3 días que la web después descarta por
   viejas (más de 12 h sin haber salido). Esta mañana, **63 de 83 lugares (76 %)** eran de ésas;
   en Política y Cultura, los 8. Cuatro notas frescas esperaban "por cupo".
3. **Una nota sin hora vale como vieja.** Si la fuente no fecha, la frescura es 0 siempre, mientras
   la web le pone la fecha de cuando la vio. Son 94 de 339 notas de acá (28 %): mediana 63 contra
   84. De las de acá con 50 a 69 puntos, 84 de 96 son de éstas. La más leída del período salió con 63.
4. **Lo de acá se amontona:** 145 notas entre 80 y 89 y 58 (17 %) tocaron el tope de 100.
5. **Pesos que no hacen nada o cuentan dos veces:**
   - `FACEBOOK.relevanciaMinima` 75: anulado desde el 12/10 por el relleno con piso 0 (salieron
     notas de acá con 63).
   - Foto +6: de acá, con foto 1,14 visitas por nota y sin foto 1,14; la tapa y Facebook ya la
     prefieren aparte. Texto completo +4: mide lo que le llegó al robot.
   - Balcarce desde afuera: +25 y +22 por lo mismo. La IA que dice "no es de acá" le resta 25 y le
     deja el +22 y el peso de medio local.
   - Peso de los medios de afuera (7 a 16): cuenta sólo el del medio que publicó primero; 94 de 479
     historias tenían 10 a 14 por ese azar. El comentario de `fuentes.mjs` dice que el peso suma
     "cuando la noticia viene de acá": suma siempre.
   - Pesos de los medios de acá (24 a 30): las visitas no los siguen (24 → 1,17; 26 → 1,12;
     28 → 1,08; 30 → 1,39); el Municipio y el Concejo, que traen los servicios, pesan menos.
   - La zona (ruta 226, la 55, la papa) no suma nada en el puntaje aunque se publique como de acá.
   - Los medios se cuentan de dos maneras: con grupo (Clarín = TN = Olé) en el puntaje y el
     semáforo, sin grupo en la lectura con IA y en el aviso importante.
   - `CUPO_POR_DEFECTO` 15 termina siendo el cupo de Agro de afuera, que casi no se lee.
6. **Lo que dicen los lectores:** de afuera, 2-3 medios → 0,10 visitas por nota; 4-7 → 0,44;
   8 o más → 0,54 (sirve hasta unos 4). Visitas por nota de afuera por sección: Economía 0,17 con
   9,8 notas por día; Agro 0,03 (1 visita en 36 notas); Argentina 0,21; Política 0,35; Fútbol 0,67;
   Automovilismo 0,74. Figura argentina: 0,44 contra 0,35 (la despedida de Messi salió con 99-100
   y tuvo 0 visitas).
7. **La IA ya ve el ruido pero los medios la pisan:** de 152 notas de afuera publicadas con ficha
   (13 al 15/10), en 67 (44 %) la IA dijo "impacto nulo"; 60 entraron igual por la regla de
   "3 medios o más" (`nacionalQueImporta`).
8. **Ningún puntaje armado con estos datos adivina qué nota de acá se va a leer** (correlación
   0,15 hoy y 0,10 con la propuesta, sin Facebook). Lo que sí se puede lograr: que lo de acá quede
   arriba de lo de afuera (hoy una de afuera le gana a una de acá del mismo día en el 32 % de los
   pares; con la propuesta, en el 4 %) y que el número no se trabe en 100.

## La recalibración propuesta (cada una se decide aparte en la página)

| # | Qué | Hoy | Propuesto |
|---|---|---|---|
| P1 | Qué cuenta para el cupo | todo lo de la ingesta | sólo lo ya publicado y lo de menos de 12 h |
| P2 | Frescura sin hora en la fuente | 0 | desde la primera vez que se vio |
| P3 | Medios que la cuentan | +10 por medio, hasta +40 | 2: +5 · 3: +10 · 4-7: +20 · 8+: +25 |
| P4 | Frescura | 25 / 15 / 8 (3, 12, 24 h) | 25 / 18 / 12 (3, 6, 12 h), después 0 |
| P5 | Peso del medio | acá 24-30, afuera 7-16 | acá 25, afuera 8 |
| P6 | Balcarce desde afuera / la zona | +22 extra / 0 | 0 / +15 |
| P7 | Foto / texto completo | +6 / +4 | 0 / 0 |
| P8 | Figura argentina | +16 | +10 |
| P9 | Tope; repasos acá / afuera; aviso importante | 100; 62 / 80; 100 | sin tope; 70 / 56; 95 (misma proporción que hoy) |
| P10 | Facebook: mínimo de acá / relleno de afuera | 75 (no se usa) / 0 | 0 / 55 |
| P11 | Cupos de afuera: Economía, Argentina, Política, Agro | 12, 12, 8, 15 | 6, 6, 6, 4 |
| P12 | Medios mínimos: Economía, Agro | 2, 2 | 3, 3 |
| P13 | "Nacional que importa" (la IA dijo nulo) | 3 medios | 8 medios (grupo una vez) |
| P14 | Contar medios | con y sin grupo según la regla | con grupo en todos lados |
| P15 | La IA dice que no es de acá | −25 | recalcular como de afuera |

Lo que queda igual: +25 por ser de Balcarce, +8 de Automovilismo, los medios mínimos de Fútbol y
Deportes (4) y del resto (3), los cupos de Fútbol (10), Automovilismo (6), Deportes, Tecnología y
Cultura, todas las ventanas (36 h, 12 h, 6 h, 72 h, memoria de 36 h), los números de Facebook que
no son puntaje y los cupos de la IA.

## Efecto estimado

- **Esta mañana** (P1 sola): habrían salido 4 notas frescas frenadas por cupo. Con todo: 3 de ésas
  y no habrían salido 3 notas de Agro de afuera con 2 medios (entre ellas, el pronóstico de La Rioja).
- **Del 1 al 15/10** (aproximando el cupo como tope por día): lo de afuera baja de 43,4 a unas 31
  notas por día y conserva el 89 % de sus visitas (167 de 187). Economía 9,8 → 4,9; Fútbol 8 → 6,3;
  Política 6,6 → 4,7; Argentina 5,7 → 4,5; Agro 3,5 → 1,5. P13, aparte, sacaría unas 13 por día
  de "impacto nulo" (medido en 3 días).
- **Lo de acá no cambia** en cantidad (22,6 por día); sólo el orden. Con "todas las notas de
  Balcarce salen" (otro trabajo en curso en `ingesta/ingesta.mjs`, que esta propuesta no toca;
  `docs/criterio/BALCARCE-TODAS-LAS-NOTAS.md` todavía no existía al cerrar esto), lo de acá pasa de
  un tercio de lo publicado a más del 40 %.
- **Repasos y aviso:** con los números movidos a la escala nueva pasa la misma proporción que hoy
  (83 % de lo de acá, 18 % de lo de afuera). Las notas de acá sin hora que quedaban abajo del mínimo
  de los repasos bajan de 43 a 2. Aviso importante: unas 26 en 15 días (sigue el tope de 2 por día).

## Límites

Muestra chica de visitas (13 días, 1 de cada 4 notas con alguna visita). Los pesos nuevos se
probaron sobre los mismos datos con que se eligieron: mirar una semana después de aplicarlos. La
simulación por día es gruesa porque el cupo real es "a la vez". Para aplicar cualquier número hay
que cambiarlo en `ingesta/criterio.mjs` **y** en la tabla de `CRITERIO-EDITORIAL.md` (§ 11), y
correr `npm test`; P1, P2, P14 y P15 son cambios de código, no de números.
