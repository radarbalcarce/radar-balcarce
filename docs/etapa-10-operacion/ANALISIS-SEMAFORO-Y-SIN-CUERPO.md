# Semáforo y "sin cuerpo": qué se frena, qué sobra y qué hacer

*23/10/2026. Sólo lectura: no se tocó código ni datos. Sale de `estadistica-seleccion.json` (20 al 23/10), `muy-contadas.json`, `esperando-cuerpo.json`, `intentos-ia.json` y las reglas de `ingesta/fuentes.mjs`.*

## Lo que pasa hoy

Nadie aprueba a mano, así que **todo lo amarillo y lo rojo es, en la práctica, "no sale"**.

- **Semáforo:** entre 38 y 66 historias por día (unas 58 en promedio; el 23 va a mitad de día). Son entre el 5 y el 8 % de lo que llega. De cada 10: 9 son de afuera y 1 de acá (4 por día en promedio; las de Balcarce bajaron con la regla 291 del 22/10). Por secciones: Argentina (74 en 4 días), Economía (42), Política (31), Agro (21), Fútbol (16), Cultura (12), Salud (11). Por medios que la cuentan: 1 medio, 5 %; 2 medios, 24 %; de 3 a 7, 42 %; 8 o más, 30 %.
- **Sin cuerpo:** 0 a 1 por día hasta el 21/10; **7 el 22 y 8 el 23** (sube). Mitad son de Balcarce y deportes de acá, el resto Fútbol, Economía, Política y Automovilismo; 7 de 13 las cuenta un solo medio.
- **Ojo:** la estadística guarda la sección y los medios, **no la palabra que frenó**. Para eso sirve `muy-contadas.json` (sólo 8 medios o más) y los motivos de `intentos-ia.json`. Esos datos son del 23/10 a la tarde y todavía muestran "niño", "denunció" o "imputado" frenando notas de 8 a 28 medios: hay que ver si es de antes de las reglas 291 y 292, o si las frena el control "en otro medio que cuenta lo mismo". **Revisar mañana con una corrida entera.**

## Qué frena en realidad (las categorías)

| Qué | Cuánto (aprox.) | Clase | Qué hacer |
|---|---|---|---|
| Rojo: menores, abuso, violencia de género, suicidio, "murió ... condenados por los abusos" | 2 a 4 por día | **(a) Mantener** | Nada. No se toca. Si el hecho es famoso y no nombra a ninguna víctima, que lo decida una persona. |
| Amarillo con palabra sensible de afuera y pocos medios (denuncia, imputado, detenido, niño, murió) | la mayoría de las de 2 a 7 medios | **(a) casi todo** | Mantener para chicos y víctimas. Ver (b). |
| Esas mismas con 8 medios o más (Cristina "imputado", Boca "denunció") | 6 a 30 por día | **(b) Soltar** | La regla 292 ya las suelta; confirmar que ande. "Denunció", "imputado", "acusado" en política y fútbol no identifican a nadie. |
| Palabra ambigua: "denunció" en el fútbol, "niños" en un discurso de Milei, "nene" en una nota de ascensos | varias por día | **(b) Soltar** | Regla clara: palabras de justicia (denuncia, imputado, acusado, detenido) no frenan en Política, Economía, Fútbol, Deportes y Argentina si no hay un nombre de menor o víctima; los chicos y las muertes siguen frenando. Falta una prueba con los casos reales. |
| Cotización del dólar ("dólar hoy", "cerró en $1.550") | 1 a 2 por día | **(c) No debería generarse** | Descarte automático desde la ingesta (ya está el sitio `/dolar`), sin pasar por el semáforo ni por la IA. |
| Clima de otro medio, efemérides ajenas, sepelios, promociones | 1 a 3 por día | **(c) Descartar** | Pasar de amarillo a "descartada" con motivo: cero cola de espera. |
| Internacional sin argentino y poco contada | 3 a 5 por día | **(c) Descartar** | Descarte automático con motivo, igual que el policial de afuera. |
| Chimentos ("Candela Arizaga embarazada") | 3 a 5 por día en `ia` | **(c)** | Cortar antes de escribir, con la lectura con IA. |

## Sin cuerpo: por qué falla

| Causa | Casos | Qué hacer |
|---|---|---|
| El verificador rechaza lo que escribió la IA (promesa, número, negación, antecedente, "escape sin decodificar") | la mayoría | Reintento con la falla escrita en el pedido; si falla 3 veces, descartar o publicar la versión sólo con la bajada **no** (regla del cuerpo). |
| Fuente sin texto ("sin material": 8 en la semana) | 8 | Avisar de entrada, antes de gastar cupo, y descartar si el artículo trae menos de 70 palabras. |
| Cuerpo corto (56, 66, 68 palabras) | 4 | Es un margen chico: pedir "de 90 a 120 palabras" para no quedar justo; hoy pide 70. |
| Error de la IA (HTTP 400 de la clave de redacción) | 2 | Respaldo con la otra clave; ya existe, mirar por qué entró primero esa. |
| Tiempo: intentos agotados | pocos | Pasados los 3 intentos o 12 horas, sacar de la espera y contarlo como descartada, no como "esperando". |

El salto del 22 y 23/10 coincide con las reglas nuevas (más notas llegan a escribirse). Conviene mirar si es el cupo de la IA.

## ¿Puede desaparecer el amarillo?

**Sí.** Cada caso tiene salida sola:

1. **Publicar solo:** lo muy contado (8 o más), lo de acá (ya), palabras de justicia sin menores ni víctimas.
2. **Descartar solo, con motivo escrito:** dólar, clima ajeno, internacional sin argentino, promoción, chimento, sepelio.
3. **Descartar solo:** lo que toca chicos o víctimas y no es de acá. De Balcarce sigue el rojo.
4. **El rojo no cambia.**

El único costo es perder alguna nota de justicia de afuera con 2 a 7 medios. Se mide mirando `descartadas` en la estadística durante una semana, como se hace con los mínimos de medios.

## Próximos pasos

1. Confirmar mañana si la estadística ya refleja 291 y 292.
2. Guardar en la estadística **la palabra que frena** (hoy no está).
3. Pasar a descartada con motivo: dólar, clima, internacional, promoción. Con su prueba.
4. Regla de las palabras de justicia fuera de Policiales, con prueba.
5. Sin cuerpo: aviso de fuente corta y reintento con la falla.
