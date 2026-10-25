# Las plantillas de las piezas: reglas comunes, reglas de cada una y todas sus variantes

*8/10/2026, a pedido de Hernán y Andrés ("que esté todo planificado: una regla en común para todas y una específica para cada una, con todas las
variantes del clima, avisos, efemérides, feriados, farmacias, invitaciones a participar, teléfonos útiles y agenda").*

> **25/10/2026: ya no es una propuesta.** Estaba en `docs/propuestas/` y pasó a `docs/redes/` (los comentarios del código que dicen
> `docs/propuestas/PLANTILLAS-DE-PIEZAS.md` hablan de este documento).
>
> **Estado (15/10/2026): aprobadas y conectadas (regla 157).** Desde el 9/10 las piezas de todos los días salen con su escena animada
> (`reels/escenas/`); si algo falla, sale la placa de siempre. Las escenas de deporte están hechas y sin conectar. Falta pasar estas reglas a
> `CRITERIO-REDES.md`, que es donde tienen que vivir; mientras tanto, este documento es la referencia de las escenas.

## 1. Las reglas comunes (valen para TODAS las piezas)

1. **Una sola estética.** Fondo papel, títulos en Source Serif 4, el resto en Inter, el color de la pieza como único acento (los colores de
   `CRITERIO-REDES.md` § 8) y la firma "Radar Balcarce / radarbalcarce.com" abajo, siempre en el mismo lugar.
2. **Siempre la misma estructura.** Arriba, un rótulo chico en mayúsculas (qué es) y la fecha o el título. En el medio, **un protagonista**: una cifra
   grande o una ilustración que se mueve (la temperatura, el año, la cruz de la farmacia). Debajo, el detalle en tarjetas. Abajo, la firma.
3. **La zona segura.** Todo el texto entre las filas 250 y 1440 (Instagram tapa arriba y abajo). La firma en la fila 1478 y los subtítulos de la voz
   en la 1660, con la palabra que se dice en el color de la pieza. Una barra roja de avance recorre el borde de abajo.
4. **El movimiento tiene un orden.** Primero entran los bloques de a uno (menos de 2,3 segundos); las cifras cuentan hasta su valor. Después sigue **un
   solo movimiento suave y continuo de fondo** (nubes que pasan, lluvia, un sol que respira, una ola). Nada que tiemble, nada que parpadee más de dos
   veces por segundo, nada de zoom sobre el texto (regla 90) y el texto nunca se mueve una vez que entró.
5. **Lo que se ve y lo que se dice no es lo mismo.** La pantalla muestra los datos (direcciones, teléfonos, cifras); la voz cuenta lo importante en
   frases cortas. La voz nunca lee un teléfono ni una dirección.
6. **La voz con memoria.** El saludo se dice una vez por franja del día (regla 146); las demás piezas arrancan con un puente. Los cierres y las
   transiciones también rotan: ninguna frase igual dos veces en el mismo día.
7. **Si falta un dato, no se escribe.** Nunca "0 % de lluvia", nunca una cifra inventada (regla 140). La pieza se arma con lo que hay; si lo importante
   falta, no sale.
8. **Nunca:** el nombre de otro medio, una marca de agua, una foto sin permiso, la palabra "en vivo", un adjetivo de titular, una promesa, el nombre
   de un menor o de una víctima.
9. **Duración.** Lo que cuenta un dato: de 10 a 25 segundos. Una historia acepta 60 como máximo (regla de duración).
10. **Todo reel lleva en el posteo** «Voz generada con inteligencia artificial.» (regla 114).

## 2. Cada pieza, con todas sus variantes

### El clima de la mañana · 7:00 · 12 a 20 s
- **Qué muestra:** la temperatura de ahora (cuenta hasta su valor), cómo está el cielo, sensación térmica y viento, la máxima y la mínima del día, y los
  próximos cuatro días en barras (con la lluvia sólo si hay dato).
- **Las ilustraciones (una por tipo de cielo, con su fondo y su movimiento):**

| Variante | Cuándo | Fondo | Movimiento |
|---|---|---|---|
| Despejado | cielo despejado, de día | amanecer cálido | el sol sube y respira, rayos que giran despacio |
| Parcialmente nublado | algo nublado | cielo claro | nubes que cruzan de lado a lado, el sol entre ellas |
| Nublado | nublado o cubierto | gris perla | capas de nubes a distinta velocidad |
| Llovizna | llovizna, lluvia leve | gris azulado | gotas finas y cortas |
| Lluvia | lluvia, chaparrones | gris azulado oscuro | gotas largas y rápidas; un charco que vibra |
| Tormenta | tormenta | gris casi negro | lluvia fuerte y un destello cada varios segundos (uno solo, nunca parpadeo) |
| Niebla | niebla, neblina | blanco lechoso | bandas horizontales que se desplazan |

- **Los avisos chicos que se suman en la misma pieza (una "etiqueta" arriba de la temperatura):** Helada (mínima de 2° o menos), Calor (máxima de
  32° o más), Viento fuerte (40 km/h o más). No reemplazan al aviso grande (más abajo).
- **La voz:** saludo (primera pieza de la franja) + temperatura y cielo + lo que viene hoy + un dato práctico (llevar paraguas, abrigarse). 35 a 55 palabras.

### El clima de la noche · 20:00 · 12 a 20 s
- **Qué muestra:** la temperatura de ahora, **la mínima de esta noche** (la de la madrugada que viene), cómo amanece mañana y la máxima de mañana.
- **Las variantes** son las de arriba **de noche** (fondo azul oscuro): luna y estrellas que titilan despacio (despejado), luna entre nubes, nubes oscuras,
  lluvia nocturna, tormenta, niebla con faroles. Las etiquetas: Helada (la que más importa de noche), Viento.
- **La voz:** saludo o puente + "así sigue la noche" + cómo amanece mañana. Sin pronóstico a cuatro días.

### Aviso de clima · apenas se detecta (entre las 7:00 y las 22:00) · 10 a 18 s
- **Cuándo sale:** cuando el pronóstico de hoy o de la noche cumple un umbral alto (`ingesta/alertas.mjs`): helada fuerte (−2° o menos), granizo o
  tormenta fuerte, viento de 60 km/h o más. **Una vez por día y por tipo.** Es la única pieza que no espera su hora.
- **Cómo se ve distinto de un clima común:** fondo con el color de alerta (rojo para granizo y viento, azul hielo para helada), un rótulo "AVISO" grande,
  **el título del aviso como protagonista** ("Helada fuerte esta madrugada") y debajo una tarjeta "Qué hay que saber" con lo que se puede hacer (tapar,
  guardar, no salir).
- **Las tres variantes:** Helada (cristales de hielo que se forman), Granizo (piedras que caen y rebotan), Viento (líneas de viento y una bandera que flamea).
- **La nota:** cada aviso tendrá también su nota propia en la web (hoy no la tiene): el mismo texto, con la fuente de los datos. *Falta construirla.*

### La nota del clima · desde las 7:30 · una por día
Ya está hecha (regla 155): se guarda a las 7:30 o después, hasta el mediodía, con el pronóstico congelado y el enlace al reel de Facebook si ya salió.

### Farmacia de turno · 19:00 · 8 a 20 s
- **Qué muestra:** la cruz verde que entra y late, cuántas farmacias hay de turno, **una ficha por farmacia** (nombre, dirección con un marcador,
  teléfono) y hasta cuándo dura el turno (8:30 de mañana).
- **Las variantes:** una, dos o tres farmacias (cambia el tamaño de las fichas); y el cambio de turno (si la voz sale pasadas las 8:30, dice "hasta mañana").
- **La voz:** dice los nombres y que es de turno; **no lee las direcciones ni los teléfonos**, los remite a la pantalla.

### Un día como hoy (efeméride) · 9:00 · 15 a 25 s
- **Qué muestra:** el año que corre hacia atrás desde 2026 hasta el del hecho, el título, una línea de contexto y "Y además" con hasta tres hechos más.
- **Las variantes por tipo de hecho** (cada una con su color): Patria (azul oscuro), Balcarce (rojo), Campo (verde oliva), Ciencia (azul), Deporte
  (turquesa), Cultura (violeta), Fundación o historia (gris). La ilustración cambia: bandera, plano o escarapela (patria), el arado (campo), etc.
- **El criterio (centro y centro-derecha, como el medio):** ver el punto 4.

### El feriado · 8:00 · 12 a 25 s
- **Qué muestra:** la hoja de calendario que pasa al día del feriado, el nombre, un dato histórico con su año grande, y una ilustración de la fecha.
- **Las variantes:** Patrio (azul oscuro: 25 de Mayo, 9 de Julio, 17 de Agosto, 12 de Octubre), Religioso (sobrio: Navidad, Inmaculada Concepción,
  Semana Santa), Trasladable, Por decreto (con su alcance: "feriado en la provincia de Buenos Aires"), Carnaval, Puente (no lleva pieza).
- **Los datos:** la historia de la fecha y sus hechos, con su fuente, **sin estadísticas** (decisión del 8/10). Cada feriado tiene su "enfoque" escrito.

### Participá · 12:00 · cuatro días por semana · 10 a 18 s
- **Qué muestra:** la pregunta grande, la franja verde con el número de WhatsApp que se escribe solo, el sobre que se abre con el mail, y el pie.
- **Las cuatro variantes** (una por día): noticias (lunes), evento o emprendimiento (martes), reclamo (miércoles), nota de un club o escuela (viernes).
  Cada una con el color de su sección.
- **La voz:** hace la pregunta y manda a la pantalla; **no lee el número ni el mail**.

### Teléfonos útiles · sábado 17:00 · 10 a 20 s
- **Qué muestra:** una libreta que se abre y los teléfonos de a uno (emergencias, hospital, bomberos, municipio…), con su ícono.
- **La voz:** "guardalos en el celular", sin leer los números.

### La agenda · jueves 12:00, sólo si hay eventos · 12 a 25 s
- **Qué muestra:** el calendario del fin de semana y cada evento (nombre, día y hora, lugar) que entra de a uno.
- **La voz:** cuántas actividades hay y las dos o tres primeras; el resto, en la web.

### Los repasos · 10:00, 15:00 y 21:00 · 40 a 55 s
- **Qué muestra:** cada noticia con su foto (si hay) y su titular; el paso de una a otra desliza; puntos arriba dicen en cuál va.
- **Las variantes:** mañana, tarde y noche (cada una con su saludo y su cierre).

## 3. El cronograma de un día

| Hora | Pieza | Cuándo sale | Ventana (hasta cuándo vale) |
|---|---|---|---|
| 7:00 | Clima de la mañana (historia, y reel en Facebook) | todos los días | hasta las 11:00 |
| 7:00 a 22:00 | Aviso de clima | sólo si hay uno grave; una vez por día y tipo | hasta las 22:00 |
| 7:30 | **Nota del clima en la web** | todos los días, con el pronóstico congelado | se arma hasta el mediodía |
| 8:00 | Feriado (reel e historia) | sólo los días de feriado | hasta las 12:00 |
| 9:00 | Un día como hoy (reel e historia) | todos los días que tienen su efeméride preparada | hasta las 12:00 |
| 10:00 | Repaso de la mañana (reel e historia) | todos los días | hasta las 13:00 |
| 12:00 | Participá (reel e historia) | lunes, martes, miércoles y viernes | hasta las 13:00 |
| 12:00 | Agenda (reel e historia) | jueves, si hay eventos | hasta las 13:00 |
| 15:00 | Repaso de la tarde (reel e historia) | todos los días | hasta las 19:00 |
| 17:00 | Teléfonos útiles (reel e historia) | sábados | hasta las 18:00 |
| 19:00 | Farmacia de turno (historia, y reel en Facebook) | todos los días | hasta las 24:00 |
| 20:00 | Clima de la noche (historia, y reel en Facebook) | todos los días | hasta las 24:00 |
| 21:00 | Repaso del día (reel e historia) | todos los días | hasta las 24:00 |

**Tope de voz:** 10 audios por día (cupo gratis de Gemini). Un día normal gasta entre 7 y 9.

## 4. La efeméride y el feriado con criterio de centro y centro-derecha *(propuesta para aprobar)*

Qué hechos se eligen y cómo se cuentan, para el que mira Radar Balcarce:

- **Se priorizan** los hechos de la historia argentina y de Balcarce que construyen: las fechas patrias y las instituciones, los fundadores y los que
  trabajaron la tierra, el campo y la industria, la ciencia y la técnica argentinas, el deporte y los logros de los que salieron de acá, las obras y
  los inventos, los pueblos y los clubes.
- **El tono:** sobrio, institucional, con orgullo sereno y sin solemnidad vacía. Se cuenta qué pasó, quién lo hizo y por qué importa **hoy en Balcarce**
  cuando se puede.
- **Los hechos tristes o discutidos** (golpes, guerras, la violencia política) se cuentan con respeto a las víctimas, **con hechos y sin adjetivos**, una
  sola vez en el año por tema, y sin tomar partido por un sector ni usar la fecha para una consigna. Una fecha patria no se relativiza.
- **No se usan:** lenguaje militante de ningún lado, hechos sin fuente confiable, estadísticas que no vayan con la línea del medio, ni opiniones sobre
  gobiernos actuales. Todo con su fuente verificada; lo delicado lo revisa una persona antes de salir.
- **Hoy** el criterio vive en el campo "enfoque" de cada feriado y en las marcas de la efeméride (`violencia`, `política`, `menores`, `puede estar
  vivo`, `religión`), que frenan lo sensible. Esta sección lo dejaría escrito en el criterio para que sea una regla y no una costumbre.

## 5. Cómo se arma el trabajo (orden propuesto)

1. **Ejemplos del clima** (acá, en esta tanda): dos cielos distintos de mañana, uno de noche y un aviso. Se ven y se aprueban.
2. **Pasar el clima a producción**, con todas sus variantes y su prueba.
3. Después, en este orden: farmacia, efeméride, feriado, Participá, útiles, agenda y repasos: **un ejemplo de cada una, se aprueba, se pasa a producción**.
4. Escribir lo aprobado en `CRITERIO-REDES.md` y dejar las pruebas que lo cuidan.

## 6. Escenas del deporte, hechas para más adelante *(9/10/2026)*

Todavía no salen en ninguna pieza ni tienen horario: quedan armadas (`reels/escenas/deportes.mjs`, con ejemplos y en el catálogo) para el día que se quiera contar con voz un dato del automovilismo o del fútbol. Los datos son los que la web ya baja (`web/data/f1.json` y `web/data/futbol.json`); si falta uno, no se escribe.

- **Clasificación de la Fórmula 1:** los siete primeros con su mejor tiempo y, si Colapinto no está entre ellos, su fila marcada al final.
- **Carrera de la Fórmula 1:** el podio que sube, y abajo la tarjeta de Colapinto (en qué lugar terminó, de cuál largó, la diferencia).
- **Tabla de la Liga:** los primeros diez de la zona, con partidos, diferencia y puntos que cuentan hasta su valor; se puede marcar un equipo.
- **Resultado de un partido:** el marcador grande que cuenta hasta su valor y los goleadores de cada lado.
