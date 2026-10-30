# Criterio de las redes de Radar Balcarce

*Actualizado el 24/10/2026.* Es **el documento único** de lo que sale en Instagram y
Facebook: cómo suena la voz, qué dice cada pieza y qué no dice nunca. Hernán y Andrés
lo pidieron así: cada pieza con su criterio, **siempre la misma voz** para cada pieza,
siempre "Radar Balcarce" y siempre `radarbalcarce.com`.

Lo editorial de las notas (qué se publica y cómo se escribe) está en
[`CRITERIO-EDITORIAL.md`](CRITERIO-EDITORIAL.md). Los horarios y cómo se publica, en
[`docs/07-REDES.md`](docs/07-REDES.md).

**El código lee este documento tal cual** (`redes/prompt-redes.mjs`): la identidad
(sección 1), los números (sección 5) y las voces con su estilo (sección 6), entre las
marcas `<!-- … -->`. No hay otra copia. Para cambiar algo se edita acá, sin borrar
las marcas, y se corre `npm test`: si falta una parte o un número no coincide con el
código, la prueba falla antes de publicar.

## 1. Quiénes somos, dicho siempre igual

<!-- IDENTIDAD:INICIO -->
Medio: Radar Balcarce
Sitio escrito: radarbalcarce.com
Sitio dicho: Radar Balcarce punto com
<!-- IDENTIDAD:FIN -->

- **El medio se llama siempre "Radar Balcarce"**, con espacio y las dos mayúsculas.
  Nunca "Radar", "RadarBalcarce" ni "El Radar".
- **La página se escribe siempre `radarbalcarce.com`**: nunca `.com.ar`, nunca con
  `www`.
- **Dicha en voz alta es "Radar Balcarce punto com"** y termina ahí. Nunca "punto ar"
  ni "punto a ere". La voz recibe el texto literal y la auditoría de voz lo comprueba
  (sección 7).
- Para nombrar la página se dice "Radar Balcarce" o su dirección, no "nuestra página".

## 2. La voz

Hay **dos voces propias**, creadas para Radar Balcarce con Voice Design de Gemini 3.8
(idioma `es-AR`): **la locutora** (unos 45 años, serena y pausada) y **el locutor** (unos
40, grave y firme). Cada una tiene un identificador fijo que Google guarda en el proyecto
de la clave de redes, así que suena siempre igual. **Cada pieza tiene siempre la misma
voz** (el reparto de la sección 6) y a lo largo del día se alternan.

- **Una sola voz por pieza.** Las charlas entre las dos se probaron el 28/09 y sonaban
  falsas.
- **No hay voz de respaldo** ("mejor nunca Elena", 28/09). Si Gemini no contesta, la
  pieza no sale en esa vuelta y se vuelve a pedir en la siguiente mientras dure su
  horario. Es preferible una historia que falta a una que suena a otro medio.
- **El cupo es de 10 audios por día** (la clave de redes es gratis). Un día normal usa 7
  a 9: los tres repasos, los dos climas, la farmacia y la efeméride (Participá no gasta
  mientras valga su video armado de antemano); algunos días, además, los útiles, la agenda,
  el feriado o un aviso de clima.
- **El cupo se cuenta** (17/10, regla 208): cada pedido a la voz, también un reintento, es
  un audio y se anota antes de hacerlo. Las piezas tienen un orden de importancia: **el
  repaso**, después **el clima y la farmacia**, después **la efeméride y el feriado**, y al
  final lo opcional (Participá, los útiles, la agenda). Si pedir una voz dejaría sin audio a
  una pieza más importante que todavía falta hoy, esa pieza no se arma (nunca con otra voz) y
  la corrida dice por qué. Una pieza que se armó y no llegó a salir se vuelve a subir con el
  mismo video, sin gastar otro audio. Si el cupo se acaba, lo que falta ese día no sale.
- Al texto se le suma aparte un **estilo corto** según el momento del día (mañana, tarde
  o noche): cambia el ánimo, no la voz. Nadie elige otra voz ni cambia la velocidad a
  mano.

**Cómo suena:** cálida y cercana, rioplatense sin exagerar, tranquila, como quien le
cuenta algo a un vecino. Humana: nunca un noticiero de televisión ni un robot.

### El libro de recursos

Para que no suene a plantilla, cada pieza elige entre estos recursos con una semilla
que depende de **la fecha y la pieza**: el mismo día y la misma pieza dan siempre el
mismo texto (así se puede probar), y días distintos suenan distinto
(`redes/guiones.mjs`).

- **Aperturas variadas:** "Buen día, Balcarce." / "Muy buen día, Balcarce." / "Buenas
  tardes, Balcarce, ¿cómo va el día?".
- **Conectores que no suenan a lista escolar:** "Para arrancar", "Empezamos con esto",
  "Cambiando de tema", "Por otro lado", "Otra que se comenta", "Y para terminar", "Y
  cerramos con". Nunca "Primero…, segundo…".
- **Una pequeña humanidad por pieza:** un comentario del clima ("Está fresquito para
  salir") o un cierre cálido ("A descansar, que mañana seguimos").
- **Ritmo con la puntuación:** oraciones cortas, comas donde se respira.
- **Expresiones locales con medida:** "salí abrigado", "un mate caliente". Una por pieza.

### Lo que la voz no hace

- "Hola" fuera de la mañana: se saluda con "buen día", "buenas tardes" o "buenas noches"
  según la hora.
- Humor en temas serios (accidentes, emergencias, salud).
- Exclamaciones, "increíble", "impactante", "escándalo" o adjetivos de titular.
- Opinión: se cuenta el dato, no se dice si está bien o mal.
- "En vivo" o "minuto a minuto": las piezas son un repaso de lo ya publicado.

### La línea editorial del día (18/10, regla 301)

El día de piezas es **una sola historia contada en capítulos** (`redes/linea-del-dia.mjs`; un día completo de ejemplo, en
[`docs/redes/GUION-DEL-DIA-EJEMPLO.md`](docs/redes/GUION-DEL-DIA-EJEMPLO.md)). Todas comparten estructura, voz y trato:

1. **Gancho de 3 segundos** (8 palabras o menos): el saludo de la franja o, si ya se saludó hace poco, una frase de continuidad propia de ese
   momento ("Seguimos con lo que arrancamos a la mañana.", "Ahora, cómo sigue la noche.", "Ya casi cerramos el día."), no el puente genérico.
2. **Cuerpo:** lo propio de la pieza.
3. **Un enlace hacia lo que viene**, sólo si esa pieza está en el plan de hoy y todavía no salió, con su hora dicha: "Recordá que a las nueve de la
   noche cerramos con el repaso del día."
4. **Lo ya contado, retomado sin repetirlo:** una historia o un repaso nombra el *tema* de un repaso anterior ("lo del fútbol", "lo de acá"), que sale de
   la sección de sus notas, nunca su titular; el repaso de la mañana abre con "Ayer te contamos…" si el libro tiene el de anoche.
5. **Cierre con el mismo llamado en toda la fecha:** el deseo de la franja y la misma frase de firma en todas las piezas del día; ese día todas dicen
   "Radar Balcarce punto com" o ninguna (sigue siendo 1 de cada 3 días; los repasos, siempre).

**Trato único:** vos rioplatense de locutor para hablarle a una persona ("guardá el dato", "anotá") y ustedes para desearle algo a todos ("que tengan una
linda tarde"). Nunca tuteo ("guarda", "tienes", "tú") ni jerga forzada ("che", "boludo"): `revisarTexto` lo detecta.

**Cuánto entra:** cada frase que se suma se pesa contra el tope de su pieza (el repaso 55 s, el clima y la farmacia 25, un día como hoy 45); si no cabe,
se prueba otra variante más corta y, si ninguna entra, no se suma. Todo es determinístico (la fecha elige la variante) y no usa IA ni cupo de voz.

## 3. Las piezas

Lo común a todas:

- **Los largos** se miden a **2,5 palabras por segundo** (sección 5).
- **El saludo sigue a la hora real:** hasta las 12:59 "buen día", desde las 13 "buenas
  tardes" y desde las 19 "buenas noches".
- **La dirección dicha:** los tres repasos la dicen **siempre** al cerrar. El clima, la
  farmacia y las semanales, **1 de cada 3 días** (lo decide la fecha, no el azar); los
  otros días cierran con "Radar Balcarce".
- Los horarios están en el código (`redes/piezas.mjs`, `redes/horarios.mjs`) y en
  `docs/07-REDES.md`.

### Clima de la mañana · 7:00 · 10 a 20 segundos

- **Para qué:** que el vecino sepa qué ponerse y si lleva paraguas.
- **Cómo se arma:** saludo, temperatura de ahora, un comentario según el día (frío,
  helada, calor, lluvia, tormenta, viento o un día lindo), máxima, lluvia, cierre cálido
  y firma. Nunca más de 25 segundos.
- **No lleva:** la farmacia (tiene su pieza), la fuente de los datos ni alertas
  inventadas.
- **Bien:** "Buen día, Balcarce. Arrancamos con 8 grados. Mañana fría: salí abrigado. A
  la tarde levanta hasta 19, así que el abrigo te va a sobrar. No se espera lluvia. Que
  tengan un buen día. Radar Balcarce."
- **Mal:** "¡Hola! ¡Increíble mañana en Balcarce, en vivo desde Meteored!" (hola,
  exclamaciones, "increíble", "en vivo" y la fuente).

### Clima de la noche · 20:00 · 10 a 20 segundos

- **Para qué:** cómo sigue la noche y cómo amanece mañana. La placa dice **"Cómo sigue
  el clima esta noche"** (29/09: decía "Cómo sigue el día", y a las 20 el día ya pasó).
- **Cómo se arma:** saludo, temperatura de ahora, la mínima de la noche (con aviso si hay
  helada), cómo viene mañana, un toque humano, cierre de noche ("Que descansen") y firma.
  **Nunca "buen día" ni "hoy".** La mínima de la noche es la del pronóstico de mañana:
  el pronóstico da una por día y la de mañana es la de la madrugada; la de hoy casi
  siempre ya pasó.
- **Bien:** "Buenas noches, Balcarce. En este momento hay 12 grados. Esta noche la mínima
  va a ser de 7. Mañana levanta: máxima de 21 grados. A descansar, que mañana seguimos.
  Radar Balcarce."
- **Mal:** "Buen día, Balcarce. Minuto a minuto: 12 grados."

### Farmacia de turno · 19:00 · 6 a 25 segundos

- **Para qué:** que en la madrugada alguien sepa adónde ir.
- **Cómo se arma:** saludo, la o las farmacias de turno con la dirección dicha (sin "N°"
  ni "e/"), "Guardá el dato, que te puede salvar una madrugada" y firma.
- **No lleva:** hasta qué hora está abierta (eso va en la web), teléfonos, ni la fuente
  (el Colegio de Farmacéuticos, La Vanguardia o Radio Gabal no se nombran).
- **Si el Colegio no publica la de hoy** (pasó el 12/10, feriado), se toma la de La
  Vanguardia, salvo que Radio Gabal diga otra; si no hay ninguna confiable, ese día la pieza
  no sale (mejor sin farmacia que con una dudosa).
- **Bien:** "Buenas noches, Balcarce. Si esta noche necesitás una farmacia, la de turno
  es Del Pueblo, en Calle 17 número 1140. Guardá el dato, que te puede salvar una
  madrugada. Radar Balcarce."
- **Mal:** "Según La Vanguardia, la de turno es DEL PUEBLO." (la fuente y el nombre en
  mayúsculas).

### Los tres repasos (reel e historia) · 10:00, 15:00 y 21:00

- **Para qué:** a la mañana, las notas para arrancar el día; a la tarde, lo que se fue
  sumando; a la noche, lo que dejó el día y todavía no se contó. **Ninguno repite una
  nota ni un tema** que ya contó otro repaso de hoy o de los dos días anteriores (29/09,
  Hernán: la misma nota salió en el de la tarde y en el de la noche).
- **Cómo se arma:** saludo de su hora (a la noche, con el día de la semana), una línea de
  entrada, las notas con los conectores del libro de recursos (cada una con su titular y,
  si el texto es nuestro, una oración de contexto), un cierre de su hora y la dirección
  dicha.
- **Cuántas notas:** cuatro en cada uno, si hay y si caben (29/09: eran tres a la mañana
  y a la tarde). **El video no pasa de 55 segundos**, porque cada repaso se sube también
  como historia y Meta acepta hasta 60. Si no entra, primero se saca la oración de
  contexto de las últimas notas y después notas del final, hasta un mínimo de dos. Un día
  flojo, sale con las notas nuevas que haya; con menos de dos, ese repaso no sale.
- **Lleva:** titulares ya publicados en la web, de temas distintos: **lo de Balcarce
  primero y, si no alcanza, lo más contado del día** (cuántos medios lo cuentan), sin
  piso de puntaje ni tope de notas de afuera (25/10: "el repaso tiene que tener noticias").
  Nada que ya haya salido como posteo.
- **No lleva nunca:** Política ni Policiales, nada en rojo, las notas propias del sitio,
  la fuente de ninguna nota, ni nombres de víctimas o menores.
- **Cómo se ve** (17/10, regla 209): el video sigue a la voz. Arranca con la primera nota,
  que es la más fuerte, en grande; mientras la voz cuenta cada nota se ve **su foto** (la de
  la web, o su ilustración; si no tiene, una placa con el color de su sección), su titular y
  "2 de 4" arriba. La foto lleva su crédito **abajo, como epígrafe**, nunca encima. Al
  despedirse, la lista completa, que es también **la tapa del reel** (lo que se ve en el
  perfil antes de darle play). Una foto con chicos que entró por la excepción de la regla 186
  no va a las redes.
- **Bien (mañana):** "Buen día, Balcarce. Las noticias para arrancar el día. Para
  arrancar: Ferroviarios gana el Apertura. Cambiando de tema: Cortan el agua en el centro.
  Y para cerrar: Nueva muestra en el museo. Que tengan un buen día. Todo lo demás lo
  encontrás en Radar Balcarce punto com."
- **Mal:** "Hola, ¡increíble mañana! Primero: Según Infobae… Segundo…" (hola,
  exclamación, el medio de origen y el conector robótico). A las 15, "Buen día". A la
  noche, "¡Hasta mañana, gente!" o "punto com punto ar".

### Posteo de una nota en Facebook (y su espejo en Instagram)

- **Para qué:** que el vecino entre a la nota, en nuestra página.
- **Cuándo:** hasta 5 por día, de 8 a 22 y con 90 minutos entre uno y otro; es el tope, no una selección: salen mientras haya con qué (si un día
  queda corto, `redes.json → sinPosteos` dice cuántas notas se miraron y en qué filtro cayó cada una; el 5 vive en `FACEBOOK.porDia`, regla 309) (las reglas están en
  `CRITERIO-EDITORIAL.md` § 9 y en `docs/07-REDES.md`).
- **Cómo se arma:** el texto para redes (hasta 280 caracteres) o el titular y la bajada,
  una línea con el enlace a **nuestra** nota que va cambiando de frase (en Instagram, "link en la bio": ahí los enlaces no se tocan), y los hashtags:
  **`#Balcarce #RadarBalcarce` siempre, primeros y en ese orden**, y hasta tres de la nota (sus etiquetas o el tema de su sección), sin repetir. Son cinco como mucho, el tope de Instagram.
  Los pies de los reels llevan los dos fijos y uno del tipo de pieza (#Noticias, #Clima…). El espejo de Instagram lleva la foto de la nota, con el crédito en el texto del posteo.
- **Qué va:** sólo **lo de Balcarce y lo más contado del país** (lo de afuera que cuentan cinco medios distintos o más; nada de otras ciudades que no sea eso). La barra es `FACEBOOK.mediosParaRedes` en la tabla de
  `CRITERIO-EDITORIAL.md`. Los repasos piden lo mismo para lo de afuera.
- **Lo que decide una persona:** lo que salió en la web porque lo
  aprobó una persona va a Facebook e Instagram **sólo si esa persona lo marca** desde el
  panel del celular ("También a Facebook e Instagram"). Política y Policiales salen solas
  como cualquier sección desde el 30/10/2026 (R40, Hernán); lo rojo, nunca.
- **Los reels (Instagram y Facebook) cierran el posteo con «Voz generada con inteligencia artificial.»** (8/10/2026; un aviso en
  texto, sin la etiqueta visual de Meta). Es de la voz, no de la nota: no cambia lo que sigue.
- **No lleva:** la fuente, "Resumen hecho con IA" (quién escribió la nota se dice en la
  nota), "en vivo", `.com.ar`, ni "punto com" escrito (eso es sólo para la voz).
- **Bien:** "Ferroviarios venció a Pato Naranja por 24 a 10 en el clásico del rugby local.

  La nota completa, en Radar Balcarce: https://radarbalcarce.com/nota/ferroviarios-gana-abc

  #Balcarce #RadarBalcarce #Ferroviarios #Rugby"
- **Mal:** "Ferroviarios ganó (Resumen hecho con IA). Fuente: Puntonueve.
  https://puntonueve.com/…"

### Teléfonos útiles · 17:00, los sábados · 8 a 20 segundos

- **Para qué:** que tengan a mano los números que sirven.
- **Cómo se arma:** saludo de su hora, qué números son (los que se ven: emergencias, el hospital,
  la comisaría de la mujer, el municipio, la cooperativa eléctrica y defensa al consumidor),
  "Guardalos ahora, que después te olvidás" y dónde están todos. El audio no lee los números.
  **La voz dice exactamente lo que se ve, ni más ni menos** (regla 324): la frase sale de las mismas
  pantallas (`PANTALLAS_DE_UTILES`, `ingesta/utiles.mjs`), nunca de una lista aparte.
- **Qué se ve (24/10, regla 324):** dos pantallas en el mismo reel, la primera mitad "Emergencias y
  salud" (911, 107, 100 en tarjetas grandes y el hospital) y la segunda "Municipio y servicios"
  (comisaría de la Mujer, municipalidad, guardia de la Cooperativa Eléctrica, Defensa al
  Consumidor). Grupos con su ícono simple, el nombre corto en una línea y **un solo número por
  contacto (el principal)**, grande; el resto queda en la página de teléfonos. Color: el de Balcarce,
  nada más. Los números salen de `NUMEROS`, nunca escritos a mano en la pantalla.
- **Zona segura de esta pieza:** nada pasa de la columna 960 (los botones de Facebook e Instagram
  tapan el borde derecho) y la raya de la firma sube a la fila 1330 (Facebook tapa la parte de
  abajo con el texto del posteo). Las demás placas siguen con la firma en la fila 1478.
- **Pendientes de confirmar** (no están en los datos del repo, así que no se muestran ni se dicen):
  la comisaría general y Defensa Civil.
- **No lleva:** "esta semana" ni "una vez por semana": los teléfonos son siempre los
  mismos.

### La agenda del jueves · 12:00, si hay eventos · 6 a 25 segundos

- **Para qué:** contar qué se puede hacer en Balcarce estos días.
- **Cómo se arma:** saludo, cuántas actividades hay, la primera con su día y su lugar,
  dónde está la agenda completa y firma. Sale de la agenda publicada en la web.
- **No lleva:** actividades sin fecha confirmada ni la fuente.
- **Bien:** "Buen día, Balcarce. Hay 3 actividades en Balcarce estos días. La feria
  de artesanos, el sábado 10:00, en el Parque Cerro El Triunfo. La agenda completa está en
  Radar Balcarce punto com. Radar Balcarce."

### Dónde sale cada pieza (8/10, aprobado; se mide cuatro semanas)

- **Reel en Facebook e Instagram y, con el mismo video, historia:** los tres repasos, "Un día como hoy", el feriado, la agenda,
  los teléfonos útiles y las piezas de Participá.
- **Historia en Instagram; en Facebook, historia y también reel:** el clima de la mañana, el de la noche y la farmacia de turno. El
  texto del reel de Facebook lleva el enlace a su página: `radarbalcarce.com/clima` o `radarbalcarce.com/farmacias` (17/10, regla 210).
  Instagram, sin enlaces.
- **Sólo historia:** los avisos de clima (no esperan nada).
- Todo reel lleva en el posteo «Voz generada con inteligencia artificial.» (regla 114).

### El feriado · 8:00, los días de feriado · 10 a 25 segundos

- **Para qué:** contar de qué se trata el feriado, con datos verificados (`web/data/feriados-piezas.json`, que sale de
  `ingesta/efemerides-curadas.json`). Cada feriado tiene su animación y su dato propios: una fecha patria no es igual a un
  feriado religioso o a uno trasladable.
- **Qué dato se cuenta (8/10, Hernán y Andrés):** lo elige el criterio editorial del medio: **la historia de la fecha y sus
  hechos**, en tono sobrio e institucional, con su fuente. **No estadísticas** que no vayan con esa línea (el censo, por ejemplo,
  quedó afuera del 12/10). Cada feriado lleva su `enfoque` escrito: sin enfoque ni datos no sale.
- **Una persona lo revisa** cuando el tema es delicado (`revisaUnaPersona`).

## 4. Lo que toda pieza respeta

1. **Nombra sólo "Radar Balcarce"**, nunca otro nombre para el medio.
2. **Nunca nombra la fuente del texto** (Infobae, Clarín, La Vanguardia, Puntonueve, Radio
   Gabal ni ningún otro medio): la atribución está en la nota de la web.
3. **Nunca "en vivo" ni "minuto a minuto".**
4. **Política y Policiales salen como cualquier sección** (desde el 30/10/2026, R40; hasta
   ese día esperaban a una persona). Lo que está en rojo no sale nunca.
5. **Nunca identifica a un menor ni a una víctima.**
6. **Nunca dice "Resumen hecho con IA":** la firma de la nota está en la nota.
7. **La dirección escrita es `radarbalcarce.com`; dicha, "Radar Balcarce punto com"** y
   termina ahí.
8. **El saludo es el de la hora:** ningún "buen día" fuera de la mañana. Y todo lo que
   dice es de su parte del día: por eso cada pieza sale sólo dentro de su franja
   (mañana hasta las 12:59, tarde hasta las 18:59, noche desde las 19; `VENTANAS`,
   `redes/piezas.mjs`). Si se le pasa, ese día no sale (29/09: el repaso de la mañana
   podía salir hasta las 15 diciendo "buen día").
9. **Sin exclamaciones, sin "increíble", sin opinión y sin humor en lo serio.**
10. **El mismo día y la misma pieza dan el mismo texto**, y días distintos suenan
    distinto.

### Cosas que muerden (redes)

- **La frase de contexto de un repaso (`primeraOracion`, `redes/elegir.mjs`) no corta en una abreviatura** (regla 309): "Dr.", "Sr.", "Av.", "Lic.",
  "EE. UU.", "Gral.", "N°.", "etc." ni en una inicial suelta ("Luis A. Pérez", "J. M. Fangio", "J.P."). Si la oración termina ahí, sigue hasta la siguiente. Antes
  la voz leía «…en la sala Dr.». Si aparece una abreviatura nueva que corta mal, se suma a `ABREVIATURAS` con su caso en la prueba.
- **Si la red principal (Instagram) falla, Facebook se intenta igual** (regla 309) y el problema del libro cuenta los `intentos`. La principal sigue con un solo
  intento por corrida a propósito: un error de Meta a veces llega después de publicar y repetir duplicaría el reel (se mira si ya está antes de reintentar).
- **Un solo lugar para cada número repetido:** los posteos por día son `FACEBOOK.porDia` (la copia `CONTRATO_DIARIO.posteosPorDia` la controla una prueba) y
  el cupo de voz es `AUDIOS_POR_DIA` (`reels/cupo-voz.mjs`; `CUPO_DE_VOZ_POR_DIA` lo toma de ahí).
- **`noticia1`, `noticia2` y `podcast`** son, en el libro y en las estadísticas, los repasos de la mañana, la tarde y la noche. No se renombran: romperían el historial.

## 5. Los números

El código los toma de `ingesta/criterio.mjs` (la columna "Clave" dice cuál) y
`pruebas/redes-criterio.test.mjs` controla que esta tabla diga lo mismo, fila por fila:
**si se cambia un número, se cambia en los dos lados.**

<!-- NUMEROS_REDES:INICIO -->
| Qué | Número | Clave |
|---|---|---|
| Ritmo de locución (palabras por segundo) | 2.5 | `VOZ.palabrasPorSegundo` |
| Podcasts: dicen la dirección al cerrar (1 = siempre) | 1 | `VOZ.direccionEnPodcasts` |
| Clima, farmacia y semanales: dicen la dirección 1 de cada N días | 3 | `VOZ.direccionUnaDeCada` |
| Clima: segundos como mínimo | 8 | `CLIMA_VOZ.segundosMinimo` |
| Clima: segundos como máximo (se apunta a 10 a 20) | 25 | `CLIMA_VOZ.segundosMaximo` |
| Podcast: segundos como mínimo | 20 | `PODCAST_VOZ.segundosMinimo` |
| Podcast: segundos como máximo (se apunta a 45 a 55; el límite real al escribirlo es el presupuesto de 55, más abajo) | 100 | `PODCAST_VOZ.segundosMaximo` |
| Podcast: ritmo real de la voz (palabras por segundo; salieron 2,3 a 2,6) | 2.4 | `PODCAST_VOZ.palabrasPorSegundo` |
| Podcast: segundos que el video suma a la voz (entrada y cola) | 1.65 | `PODCAST_VOZ.segundosDeAdorno` |
| Podcast: presupuesto de duración al escribirlo (segundos) | 55 | `PODCAST_VOZ.segundosPresupuesto` |
| Podcast: corte de seguridad de la historia (segundos; el máximo de Meta es 60) | 58 | `PODCAST_VOZ.segundosMaximoHistoria` |
| Farmacia y semanales: segundos como mínimo | 6 | `PIEZA_FIJA_VOZ.segundosMinimo` |
| Farmacia y semanales: segundos como máximo | 25 | `PIEZA_FIJA_VOZ.segundosMaximo` |
| Posteo: hashtags de la nota como máximo (además de los dos fijos, `#Balcarce #RadarBalcarce`) | 3 | `POSTEO.hashtagsMaximo` |
<!-- NUMEROS_REDES:FIN -->

**Cómo se usa la duración** (`repasoConPresupuesto`, `redes/elegir.mjs`): un repaso
dura, estimado, `palabras / ritmo + adorno`. Si pasa de 55 segundos se recorta como dice
la sección 3. Si el video ya armado igual pasa de 58 (se mide con ffmpeg), la historia
sube una copia cortada en 58 con fundido de salida y el reel sube entero. El ritmo real
(2,4) se midió con la voz anterior: falta volver a medirlo con las voces nuevas
(`PENDIENTES.md`).

## 6. Las voces y cómo se les habla

Esto es **lo que lee el código** (`redes/prompt-redes.mjs`): las dos voces, quién dice
cada pieza y el estilo. Con el modelo `gemini-3.8-flash-tts` y su Interactions API, el
texto se lee **literal** y el estilo va aparte, corto y en inglés (es lo que mejor
entiende el modelo): con indicaciones largas, el 28/09 la voz leyó las indicaciones en
voz alta. El saludo de cada momento sale del guion (`redes/guiones.mjs`), no del estilo.

<!-- VOZ:INICIO -->

Las voces. Cada identificador lo guarda Google en el proyecto de la clave de redes y
**vence al año de crearse (29/09/2027)**: la vigilancia avisa 30 días antes, y hay que
crearlas de nuevo con Actions → "Crear voces" (`docs/11-OPERACION.md`).

La locutora (versión 2, creada el 29/09/2026):

<!-- VOZ:LOCUTORA:INICIO -->
voice_v8mf7jt16hch
<!-- VOZ:LOCUTORA:FIN -->

El locutor (versión 2, creado el 29/09/2026):

<!-- VOZ:LOCUTOR:INICIO -->
voice_cdljkn0jpmk6
<!-- VOZ:LOCUTOR:FIN -->

Quién dice cada pieza (siempre la misma; los nombres son los de `redes/piezas.mjs`, y
`aviso` vale para todos los avisos de clima):

<!-- VOZ:REPARTO:INICIO -->
clima-manana: locutora
noticia1: locutor
noticia2: locutora
farmacia: locutor
clima-noche: locutora
podcast: locutor
utiles: locutor
agenda: locutora
feriado: locutora
efemeride: locutora
participa-noticias: locutora
participa-evento: locutor
participa-reclamos: locutora
participa-nota: locutor
aviso: locutor
<!-- VOZ:REPARTO:FIN -->

El estilo base:

<!-- VOZ:BASE:INICIO -->
Calm, confident and warm, at a steady natural pace, like a local radio announcer from Buenos Aires province, Argentina.
<!-- VOZ:BASE:FIN -->

Para la mañana:

<!-- VOZ:MANANA:INICIO -->
It is the morning: fresh, with calm energy.
<!-- VOZ:MANANA:FIN -->

Para la tarde:

<!-- VOZ:TARDE:INICIO -->
It is the afternoon: even and warm, unhurried.
<!-- VOZ:TARDE:FIN -->

Para la noche:

<!-- VOZ:NOCHE:INICIO -->
It is the night: slower, lower and calm, closing the day.
<!-- VOZ:NOCHE:FIN -->

<!-- VOZ:FIN -->

## 7. La auditoría de voz

Como nadie puede escuchar todo lo que sale, hay una auditoría: `reels/auditar-voz.mjs`,
que se corre a mano (Actions → "Auditar voz" → Run workflow). Genera con la misma ruta de
producción unos clips cortos (cierres de los repasos, un clima de la noche y frases con
la dirección), le pide a Gemini la transcripción literal y comprueba que se oiga "Radar
Balcarce", que "punto com" nunca sea "punto ar" y que el saludo sea el de la hora. Imprime
PASA o FALLA por clip.

**Gasta del cupo de voz del día** (cada clip es un audio): se corre sólo cuando se toca
la voz, y mejor de noche, después del último repaso. Si la voz insistiera en agregar
".ar", la dirección se deja de decir (`VOZ.direccionEnPodcasts` y `VOZ.direccionUnaDeCada`
en 0) y las piezas cierran sólo con "Radar Balcarce".

**Saludos con memoria (8/10):** la primera pieza de cada franja del día saluda; las que salen dentro de las dos horas y media siguientes empiezan con un puente corto en lugar de volver a saludar (regla 146).

## 8. Colores y diseño de las placas

Decisión del 30/09 (Hernán): **el color de una pieza tiene un sentido de uso, siempre el
mismo**, así todo queda unificado entre la web, el panel, las placas y las tarjetas. Se
agrega un color nuevo sólo después de sumarlo a esta tabla, a `COLOR_SECCION`
(`reels/placa.mjs`) y al sitio. Una prueba (`pruebas/colores-placas.test.mjs`) controla
que esta tabla diga lo mismo que el código.

<!-- COLORES:INICIO -->
| Color | Hex | Para qué se usa |
|---|---|---|
| Tinta | #14161A | Texto, títulos, la raya y "Radar" de la firma |
| Papel | #FAF8F3 | Fondo de todas las placas |
| Rojo de la marca | #C7381C | Sólo "Balcarce" de la firma y los rótulos de la marca |
| Balcarce | #B91C1C | Lo de acá; participá con noticias; una efeméride de Balcarce; los teléfonos útiles |
| Política | #3730A3 | Política (nunca sale sola) |
| Policiales | #831843 | Policiales (nunca sale sola) |
| Educación | #1D4BE0 | Educación: escuelas, docentes, la Facultad y las universidades (sección nueva desde el 17/10) |
| Salud | #004E5C | Salud: hospital, vacunas, PAMI, IOMA (sección nueva desde el 17/10) |
| Ciencia | #772E9E | Ciencia: química, biología, espacio, investigación (sección nueva desde el 17/10) |
| Fútbol | #7C3AED | Fútbol y el resumen de los lunes |
| Deportes | #0F766E | Deportes |
| Automovilismo | #B45309 | Automovilismo y Fangio |
| Agro | #5A6B0A | Agro y campo |
| Economía | #8A6500 | Economía, los descuentos de hoy y "Tu plata" |
| Cultura y agenda | #9D2C8F | Cultura, la agenda, "Un día como hoy" y "Tu nota" |
| Tecnología | #0B6FB8 | Tecnología e IA (se lee «Tecnología e IA»; la clave sigue siendo Tecnología) y las novedades de IA |
| Argentina | #4B5563 | Lo nacional que no es de otra sección |
| Región | #4B5563 | Lo de otras ciudades de la zona (el mismo gris que Argentina) |
| Feriados | #1E3A6E | Feriados y fechas patrias; sólo esas piezas |
| Clima | #4A5D8F | El clima de la mañana, el de la noche y el aviso |
| Farmacias | #13804A | La farmacia de turno |
| WhatsApp | #0F5132 | La franja del número de WhatsApp en las piezas de participar (en el sitio, el botón sigue rojo) |
<!-- COLORES:FIN -->

**Colores reservados** (elegidos el 30/09 para que, cuando nazca una sección o una pieza nueva, ya tenga
un color notorio y distinto de todos; están en `COLORES_RESERVADOS`, `reels/placa.mjs`): fucsia `#C0258F` y celeste `#0A7C99`. Se
suman a la tabla de arriba el día que se estrenan. "Participá con reclamos" usa el color de Balcarce.

**Reglas de uso**

1. **Una pieza, un color.** El rótulo y el rasgo grande de la pieza (el año, el
   porcentaje, la franja) llevan el color de su sección; el resto, tinta sobre papel.
2. **El color lo da lo que se cuenta**, no el día ni la hora: una novedad de IA es azul, una efeméride es violeta, un feriado es azul oscuro.
3. **El repaso lleva el rojo de la marca** en su rótulo, y cada nota de la lista lleva el
   color de su propia sección. (Hasta el 30/09 el repaso rotaba un color por día de la
   semana, sin significado: se saca.)
4. **La franja del número de WhatsApp va en verde** (`WhatsApp`, con letras blancas), el único
   verde que no es de una sección: se reconoce por el número, el rótulo "Escribinos por
   WhatsApp" y la forma de la franja. En el sitio el botón es rojo, como los demás
   (decisión del 30/09).
5. **Nunca un color inventado:** una pieza sin sección usa la tinta.
6. **Todos los colores se leen sobre el papel** (contraste de 4,5 o más) y con letras
   blancas encima.
7. **Todos se distinguen entre sí** (30/09): una prueba mide la distancia de color (OKLab) entre cada par y exige
   0,06 o más. El verde es de la farmacia (como el de las cruces); Fútbol pasó a violeta el 30/09.

**El diseño de una placa** (rediseño del 30/09): fondo papel; rótulo chico en mayúsculas
con el color de la pieza, a la altura de las filas 250 a 300; el cuerpo usa **toda la
zona segura** (filas 250 a 1480), con el rasgo grande propio de cada pieza; y **el mismo
cierre en todas**: la raya de tinta, "Radar Balcarce" a la izquierda y radarbalcarce.com
a la derecha, sobre la fila 1478. Sin nombre de otro medio ni foto con marca de agua.
Las placas **no tiemblan**: sin zoom sobre la imagen (regla 90). Desde el 8/10 (regla 145) todas las piezas
llevan una entrada animada, calculada cuadro a cuadro: cada bloque (rótulo, título, tarjetas, renglones) entra de
a uno, subiendo unos pocos píxeles y apareciendo, mientras la firma de abajo ya está; al terminar (menos de 2,3
segundos) el cuadro es la placa quieta de siempre. Una barra roja avanza abajo durante toda la pieza. Los
subtítulos de la voz van en la misma franja de siempre.

**El repaso es una secuencia de placas** (17/10, regla 209, `reels/escenas/repaso.mjs`): una por nota (rótulo del repaso
y "i de n" arriba con rayitas de avance, la foto en una caja de 936 x 585 con bordes redondeados, el crédito abajo en gris,
el rótulo de la sección en su color y el titular grande) y, al final, la lista de siempre. Cada placa entra cuando la voz
empieza la oración de su nota, con la misma entrada animada. La tapa del reel (el primer cuadro) es la lista.
