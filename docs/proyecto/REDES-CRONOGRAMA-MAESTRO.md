# Redes: el cronograma maestro (qué sale, cuándo, por qué y qué falta)

*24/10/2026. Documento de lectura: no se cambió código ni horarios. Junta en un solo lugar lo que Radar Balcarce publica hoy en redes, lo que conviene sumar y cuándo
conviene que corra cada cosa. Se armó leyendo el código (`redes/horarios.mjs`, `redes/piezas.mjs`, `redes/contrato.mjs`, `ingesta/criterio.mjs`, `reels/fijas.mjs`,
`reels/cupo-voz.mjs`, `infra/reloj-cloudflare/`) y los informes `docs/auditoria-2-0/` C, H, I y J. **Si algo de acá no coincide con el código, manda el código.** Lo que
no se pudo confirmar en una página oficial está marcado **SIN VERIFICAR**.*

**Dónde vive cada cosa (para no duplicar).** Este archivo es el mapa y la propuesta. El detalle técnico de Facebook e Instagram sigue en
[`docs/07-REDES.md`](../07-REDES.md) (recorrido paso a paso, libro, contrato); cómo suena cada pieza, en [`CRITERIO-REDES.md`](../../CRITERIO-REDES.md); las demás redes
(Telegram, Bluesky, Threads, YouTube, TikTok, WhatsApp), en [`docs/redes/TABLA-DE-REDES.md`](../redes/TABLA-DE-REDES.md) y [`docs/redes/FORMATOS-POR-RED.md`](../redes/FORMATOS-POR-RED.md).
La tabla de horarios de `docs/07-REDES.md` es la referencia de código y está al día; esta es la vista hora por hora, con la audiencia y las propuestas.

---

## 0. En diez líneas

1. **Lo que anda es poco y se sabe qué es:** el reel del clima de las 7:00 en Facebook (mediana 3.050 reproducciones, unas 15 veces más que cualquier otra pieza). Los repasos de las 10 y de las 15 andan en unas 230 a 250. El repaso de las 21 (mediana 6) y el clima de las 20 (mediana 26) casi no se ven. Los posteos de notas alcanzaron en total a 265 personas en 98 posteos (C-REDES, 21/09 al 23/10).
2. **De 17 a 20 casi no sale nada** (9 posteos en 23 días) porque los 5 posteos se gastan antes de las 16:36 (mediana).
3. **Hoy salen 7 audios por día** de los 10 que da la clave gratis; un día con extras llega a 8 o 9.
4. **De noche (de 0 a 7) las redes ya están apagadas**; lo que sí corre de noche y no hace falta es "Actualizar la web" cada media hora, "Pistas" y una "Vigilancia" de las 3: ahí está el ahorro (sección 5).
5. **Falta propaganda propia del medio:** hoy lo único que invita a participar es "Participá" (4 días por semana, videos armados de antemano que **vencen el 31/10**). No hay "cómo se usa Radar Balcarce", ni convocatoria comercial, ni presentación.
6. **Los teléfonos útiles salen feos y desparejos:** muestran sólo los primeros 6 números de la lista (todos de emergencias y hospital), mientras la voz dice "comisaría y municipio", que no aparecen (sección 2.5).
7. **Recomiendo empezar la prueba por la variante B recortada** (sin el cierre nuevo en el clima de las 7:00 y sin la cola de Política), desde el lunes 9/11 (sección 6).
8. **Redes que faltan, en orden:** canal de WhatsApp (a mano), canal de YouTube (a mano), Telegram con bot, Bluesky, Threads; TikTok a mano; X no (sección 7).
9. **WhatsApp no se puede automatizar gratis** ni de forma oficial para un canal; la API oficial (Cloud API) sirve para contestar, no para difundir gratis (sección 8).
10. **Publicar a mano desde el Chrome del dueño con la PC prendida se puede**, pero siempre con una persona al lado y sólo para las redes sin API; sin PC hay programadores en la nube que sí alcanzan (sección 9).

---

## 1. La tabla única: lo que sale HOY, hora por hora

**Cómo se lee.** Todas las horas son de Balcarce. **Quién la dispara:** el Worker de Cloudflare `radar-balcarce-reloj` despierta a "Redes" (acción `reloj`) a los **:05, :35 y :45 de cada hora de 7 a 23** (`trabajosDelMinuto`, `HORAS_REDES_UTC`); el reloj mira qué pieza está dentro de su ventana y no salió todavía (`slotsQueTocan`), la arma (si no es una fija) y la sube. Es decir que **una pieza de las 7:00 sale en la vuelta de las 7:05** y, si falla, se reintenta a las 7:35 y 7:45 mientras dure su ventana. Dónde corre cada tarea (GitHub o Cloudflare) lo decide la variable `NUBE` del reloj; desde el 23/10 el traspaso a Cloudflare está hecho (`docs/TRASPASO.md`). **Audio** = cuántos de los 10 audios del día gasta. **Voz:** la locutora (L) o el locutor (M) de `CRITERIO-REDES.md` § 6.

| Hora | Pieza (nombre en el libro) | Qué red y cómo | Voz | Audio | Ventana | Días |
|---|---|---|---|---|---|---|
| **7:00** | Clima de la mañana (`clima-manana`) | Historia en Instagram y Facebook; **reel sólo en Facebook** | L | 1 | 7:00 a 11:00 | Todos |
| 7:00 | Aviso de clima (`aviso-helada`, `aviso-granizo`, `aviso-viento`) | Sólo historia en las dos | M | 1 por aviso | 7:00 a 22:00 (sale apenas se detecta) | Sólo si hay uno grave (helada de -2° o menos, granizo, viento de 60 km/h o más), hoy o mañana |
| 8:00 | Feriado (`feriado`) | Reel + historia en las dos | L | 1 | 8:00 a 12:00 | Sólo los feriados, con datos verificados |
| 8:00 a 22:00 | Posteos de notas (hasta 5) | Facebook: foto con el texto y el enlace; **Instagram: espejo como foto** | no tiene | 0 | 90 minutos entre uno y otro, la nota tiene hasta 8 horas de vida | Todos |
| **9:00** | Un día como hoy (`efemeride`) | Reel + historia en las dos | L | 1 | 9:00 a 12:00 | Todos los días que tienen su entrada preparada |
| **10:00** | Repaso de la mañana (`noticia1`) | Reel + historia en las dos | M | 1 | 10:00 a 13:00 | Todos, con 2 notas o más |
| **12:00** | Participá (`participa-noticias`, `-evento`, `-reclamos`, `-nota`) | Reel + historia en las dos | L, M, L, M | **0** (videos armados de antemano) | 12:00 a 13:00 | Lunes, martes, miércoles y viernes, una por día |
| 12:00 | Agenda del fin de semana (`agenda`) | Reel + historia en las dos | L | 1 | 12:00 a 13:00 | Jueves, sólo si hay eventos en los próximos 4 días |
| **15:00** | Repaso de la tarde (`noticia2`) | Reel + historia en las dos | L | 1 | 15:00 a 19:00 | Todos, con 2 notas o más |
| 17:00 | Teléfonos útiles (`utiles`) | Reel + historia en las dos | M | 1 | 17:00 a 18:00 | Sábados |
| **19:00** | Farmacia de turno (`farmacia`) | Historia en las dos; **reel sólo en Facebook** | M | 1 | 19:00 a 24:00 | Todos |
| **20:00** | Clima de la noche (`clima-noche`) | Historia en las dos; **reel sólo en Facebook** | L | 1 | 20:00 a 24:00 | Todos |
| **21:00** | Repaso de la noche (`podcast`) | Reel + historia en las dos | M | 1 | 21:00 a 24:00 | Todos, con 2 notas o más |
| 22:00 | Último posteo de nota posible | Facebook + espejo en Instagram | — | 0 | — | — |
| 23:30 | Cierre del día del contrato (se compara lo publicado con lo que Meta tiene) | No publica; lo mira el vigilante | — | 0 | — | — |

**Cuántos audios usa un día.** Siempre 7: los tres repasos, los dos climas, la farmacia y la efeméride (los Participá no gastan mientras valga su video armado). Se suma 1 por feriado, 1 por agenda (jueves), 1 por útiles (sábado) y 1 por cada aviso de clima. El máximo realista es 9 o 10; el cupo es 10 por día y **se renueva a la medianoche de California, o sea entre las 4 y las 5 de la mañana en Balcarce** (`reels/cupo-voz.mjs`): no se mezcla con el día siguiente. Si se acaba, la pieza no sale (nunca con otra voz). Orden de importancia cuando falta cupo: repaso, después clima y farmacia, después efeméride y feriado, y al final lo opcional.

**Techo de historias:** 8 por día; si sobran se deja de armar primero los útiles, después la agenda, Participá y el feriado.

**Lo que no hay en ninguna hora:** nada con voz entre las 21:00 y las 7:00, ningún posteo de nota después de las 22:00, nada de propaganda propia del medio fuera de Participá.

**Cosas a corregir de esta tabla que ya se ven en los datos** (C-REDES): el repaso de la mañana del 22/10 no salió en ninguna red porque falló Instagram y el código no intenta Facebook si falla la primera red; las historias de Facebook casi no se miden; hay días sueltos con faltas por feriado (12/10).

---

## 2. Pieza por pieza: de dónde sale, por qué se elige, qué texto lleva y si está bien

Para cada una: **Contenido** (de dónde sale), **Por qué** (cómo se decide que va), **Texto** (lo que dice la voz y el pie del posteo) y **Veredicto**. Todas cumplen las reglas de `CRITERIO-REDES.md` § 4: dicen sólo "Radar Balcarce", nunca la fuente, sin "en vivo", sin exclamaciones; los reels cierran con «Voz generada con inteligencia artificial.» y llevan `#Balcarce #RadarBalcarce` más un hashtag del tipo de pieza.

### 2.1 El clima de la mañana (7:00) · la pieza que funciona

- **Contenido:** el pronóstico de `web/data/portada.json` (Open-Meteo; si falla, `api.met.no`, sin sensación térmica). Placa oscura del clima con temperatura de ahora, cielo, sensación térmica, viento y los dos días que siguen.
- **Por qué:** que el vecino sepa qué ponerse y si lleva paraguas. Es el único formato con alcance de miles (mediana 3.050 en Facebook, picos de 25.097 el 11/10; 473 el 10/10: hay mucha dispersión).
- **Texto:** saludo de la hora, temperatura de ahora, un comentario según el día (frío, helada, calor, lluvia, viento), máxima, lluvia, cierre cálido y firma. De 10 a 25 segundos. En Facebook el pie lleva el enlace a `radarbalcarce.com/clima` («El pronóstico de toda la semana, acá»); en Instagram no hay enlaces.
- **Veredicto: bien, no tocar.** Es la regla de medir de la prueba de cuatro semanas. La única mejora a evaluar, **después** de la prueba y sola (alternando días): un cierre de 5 a 8 segundos con la nota de Balcarce más fuerte, para llevar gente a la web desde el reel que ya miran (propuesta de C y J).

### 2.2 La farmacia de turno (19:00)

- **Contenido:** la farmacia (o las dos) de turno que arma la ingesta (Colegio de Farmacéuticos; si no publica, La Vanguardia salvo que Radio Gabal diga otra; si ninguna es confiable, ese día no sale). La fuente **no se nombra**. El turno dura hasta las 8:30 del día siguiente.
- **Por qué:** que de madrugada alguien sepa adónde ir. Es servicio puro y nadie más lo hace ordenado.
- **Texto:** «Buenas noches, Balcarce. Si esta noche necesitás una farmacia, la de turno es [nombre], en [dirección dicha]. Guardá el dato, que te puede salvar una madrugada. Radar Balcarce.» Facebook lleva además el enlace a `/farmacias`.
- **Veredicto: bien en el contenido, mal puesta la hora para el alcance.** A las 19 el turno ya empezó pero la gente la busca a la noche; no hay datos propios de alcance (las historias no miden). **Mejora:** la propuesta C de J suma una "farmacia de la mañana" a las 8:45 porque el turno cambia a las 8:30; sólo vale si hay cupo (es la primera pieza que se corta).

### 2.3 El clima de la noche (20:00)

- **Contenido:** el mismo pronóstico: temperatura de ahora, mínima de la madrugada (aviso si hay helada) y cómo viene mañana.
- **Por qué:** cuando la gente ya está en casa y lo que importa es cómo amanece mañana.
- **Texto:** «Buenas noches, Balcarce. En este momento hay 12 grados. Esta noche la mínima va a ser de 7. Mañana levanta: máxima de 21. A descansar, que mañana seguimos.»
- **Veredicto: casi no se ve** (mediana 26 en Facebook). El contenido está bien; la hora de las 20 compite con la cena. Variante B/C: pasarlo a las 21:30 como «cómo amanece mañana» (y cambiar su ventana, que hoy llega hasta las 24:00, a que no cruce la medianoche).

### 2.4 Los tres repasos (10:00, 15:00, 21:00) · el producto central

- **Contenido:** hasta 4 notas ya publicadas en la web (mínimo 2), de Balcarce primero; desde el 17/10 casi sólo de acá. Ninguno repite notas ni temas que contó otro repaso de hoy o de los dos días anteriores, ni (desde el 23/10) lo que ya salió como posteo. No llevan Política ni Policiales, nada en rojo, notas propias del sitio ni fuente.
- **Por qué:** `elegirParaPodcast` toma lo de Balcarce con relevancia 62 o más (a la noche, 0), y lo de afuera sólo con 80 puntos o más y 5 medios (dos como mucho). Primero lo que pidió una persona desde el celular, después lo que cuentan 3 medios de Balcarce.
- **Texto:** saludo de la hora, una línea de entrada, cada nota con su titular y una oración de contexto, un cierre de la hora y «Radar Balcarce punto com». Máximo 55 segundos (es también historia y Meta acepta 60). Ejemplos de un día completo: `docs/redes/GUION-DEL-DIA-EJEMPLO.md`.
- **Veredicto: los de las 10 y las 15 andan (230 a 250); el de las 21 no (mediana 6).** Mejoras ya detectadas: (1) el error de `primeraOracion` que corta en "Dr.", "Av.", "Luis A." y la voz lee «en la sala Dr.» (arreglo A-1 de C-REDES); (2) con piso de 80 y 5 medios casi no entra lo nacional (decisión D-4); (3) mover el de la noche a las 19:45 (variantes B y C).

### 2.5 Los teléfonos útiles (sábados 17:00) · su estética quedó fea

**Qué sale hoy** (`reels/escenas/servicios.mjs`, `escenaDeUtiles`; la placa quieta, `placaUtiles` en `reels/placa.mjs`):

- Un reel de mínimo 12 segundos con **una sola pantalla de 6 renglones**: cada uno es una tarjeta blanca con un círculo con teléfono, la categoría en letras chicas, el nombre y el número grande a la derecha. Los renglones entran de a uno.
- **Siempre son los primeros 6 de la lista `NUMEROS`:** 911, 107 (SAME), 100 (Bomberos), 0800 de la Cooperativa Eléctrica y el hospital (conmutador y dirección, de cada uno sólo el **primer** número, porque se corta en « / »). **La comisaría, el municipio, la guardia eléctrica fija, Defensa al Consumidor, Zoonosis, Tránsito, etc. no aparecen nunca.**
- **Texto de la voz:** «Anotá los teléfonos que conviene tener a mano. Están los de emergencias, el hospital, la comisaría y el municipio. Compartilos con quien los pueda necesitar…» y no lee los números. Es decir que **promete la comisaría y el municipio y el video no los muestra.**
- El color: la animación usa un marrón (`#8C2D18`) que **no está en la tabla de colores de `CRITERIO-REDES.md` § 8** (la placa quieta usa el rojo de la marca y el plan otro marrón igual); la regla 5 del criterio dice "nunca un color inventado". Aparte, una misma pantalla de 6 números fijos que nunca cambia no da motivo para volver a verla cada sábado.

**Qué mejorar (propuesta, sin código):**

1. **Pensarlo como un afiche para guardar, no como un reel.** Una placa vertical limpia, con el título «Teléfonos útiles de Balcarce» y 3 o 4 bloques con nombre claro: *Emergencias* (911, 107, 100), *Salud* (hospital, con el número que se marca de verdad), *Seguridad y municipio* (Comisaría de la Mujer, Tránsito, municipio) y *Servicios* (guardia eléctrica, ARBAL). Menos filas por bloque y letra más grande.
2. **Que lo que se ve coincida con lo que se dice.** Si la voz nombra la comisaría y el municipio, tienen que estar en pantalla; o la voz nombra sólo lo que está.
3. **Elegir los números por utilidad, no por el orden de la lista.** Ordenar `NUMEROS` por "lo que más se busca" y mostrar un solo número por contacto (el principal), con el resto en la web.
4. **Un color de la tabla** (por ejemplo, el rojo de la marca o el de Balcarce) y declarar el uso en § 8; sacar el marrón.
5. **Variar con el tiempo:** una semana "Emergencias y salud", otra "Municipio y servicios", otra "Delegaciones y turismo", así el sábado tiene novedad y todos los números aparecen alguna vez.
6. **Probar el horario:** no hay datos de cómo rinde a las 17:00 de un sábado; si sigue sin verse, que sea una **placa estática en el posteo de Facebook** además de la historia (no gasta audio y se guarda).
7. **Costo:** hoy gasta 1 audio por sábado. Armado como pieza fija (`reels/fijas`) con vigencia de varias semanas gastaría 1 audio en total.

### 2.6 Un día como hoy (9:00)

- **Contenido:** una entrada preparada por semana en `web/data/efemerides-piezas.json` (salen de `ingesta/efemerides-curadas.json` y de la corrida mensual; se aprueba en la pestaña Fechas del panel). Sin entrada ese día, no sale nada.
- **Por qué:** historia del país y de Balcarce con datos verificados; tiene su nota en la web.
- **Texto:** «Con el clima visto, vamos a la historia. Un día como hoy, en 1933, Albert Einstein llegó a los Estados Unidos…» más una segunda efeméride. Hasta 45 segundos.
- **Veredicto: bien, rinde parecido a un repaso (~210 a 290).** Es el "ancla" de las 9:00 y no se mueve ni se saca por el techo de historias.

### 2.7 El feriado (8:00)

- **Contenido:** `web/data/feriados-piezas.json` (de las efemérides curadas), con enfoque escrito para cada feriado: la historia de la fecha, tono sobrio, sin estadísticas.
- **Por qué:** los días de feriado la gente quiere saber de qué se trata y qué abre.
- **Veredicto: bien.** Una persona lo revisa cuando el tema es delicado. Falta (ver sección 4) un "qué abre y qué cierra" del feriado, que es lo que la gente de verdad busca.

### 2.8 La agenda del jueves (12:00)

- **Contenido:** la agenda publicada en la web (`web/data/agenda.json`, que sale sólo del municipio), próximos 4 días.
- **Por qué:** el jueves al mediodía la gente planea el fin de semana. Sólo sale si hay eventos.
- **Texto:** «Buen día, Balcarce. Hay 3 actividades estos días. La feria de artesanos, el sábado 10:00, en el Parque Cerro El Triunfo. La agenda completa está en…» Dice sólo la primera actividad.
- **Veredicto: aceptable.** Mejora: nombrar dos o tres actividades (hoy sólo la primera) y sumar un posteo de Facebook con la lista escrita, que se puede guardar y compartir.

### 2.9 Participá (lunes, martes, miércoles y viernes · 12:00)

- **Contenido:** cuatro videos fijos, uno por día (`participa-noticias`, `-evento`, `-reclamos`, `-nota`), con la franja verde del WhatsApp 2266 51-1612 y el mail. Se armaron una vez (10/10) y se reusan: no gastan audio.
- **Por qué:** conseguir datos, fotos y eventos de los vecinos, y que sientan que el medio es de ellos.
- **Texto:** «¿Viste algo que tendría que ser noticia? Mandanos la foto o el dato. Antes de publicar, lo chequeamos.» Ver las cuatro en `redes/participa.mjs`.
- **Veredicto: la idea es la correcta y es lo único que invita a participar, pero:** (1) **la vigencia de los cuatro videos termina el 31/10** (`reels/fijas/vigencia.json`): pasada esa fecha el plan vuelve a pedir la voz (4 audios por semana) y empuja el día hasta 8 o 9 audios; hay que volver a fijarlos con el workflow «Fijar piezas» (gasta 4 audios una vez) **antes del 31/10**; (2) rinde parecido a un repaso (210 a 290); (3) los jueves, sábados y domingos no hay ninguna invitación.

### 2.10 Los avisos de clima

- **Contenido:** `avisosDelClima` (`ingesta/alertas.mjs`): sólo los graves de hoy o mañana: helada fuerte de -2° o menos, tormenta con granizo, viento de 60 km/h o más. "Posible helada" o "calor extremo" van en la tarjeta de la portada, no en una historia.
- **Por qué:** sólo interrumpe lo que le puede costar plata o un susto a alguien (plantas, cañerías, autos).
- **Texto:** el título y el texto del aviso (ej. «Se esperan 60 km/h de ráfagas mañana en Balcarce») con la placa del clima y un recuadro. Una vez por día y por tipo. Sólo historia.
- **Veredicto: bien en criterio. Mejoras:** (1) no existe alerta por **lluvia fuerte acumulada o cortes de servicio** (agua, luz), que es lo que más se comparte en un pueblo; (2) no se avisa en Facebook como posteo (sólo historia, que se pierde en 24 horas); un posteo corto con la placa tendría alcance y vida más larga.

### 2.11 Posteos de notas (Facebook y espejo en Instagram)

- **Contenido:** notas ya publicadas en la web (`portada.json`). Entra lo de Balcarce con relevancia 75 o más y lo de afuera sólo si lo cuentan **5 medios distintos o más** (`FACEBOOK.mediosParaRedes`; la web publica con 3 y destaca con 8). Política y Policiales no salen solas: sólo si una persona las marca desde el celular, y hoy **nadie las marca y nada avisa** (C-REDES H-4).
- **Por qué:** que el vecino entre a la nota en nuestra página. Hasta 5 por día, 90 minutos entre uno y otro, de 8 a 22, sin repetir tema en 24 horas, esperando hasta 3 horas la foto.
- **Texto:** el texto para redes (hasta 280 caracteres) o el titular y la bajada, una línea con el enlace a nuestra nota que va cambiando de frase (en Instagram, «link en la bio») y los hashtags `#Balcarce #RadarBalcarce` más hasta tres de la nota.
- **Veredicto: cumple en cantidad (5 por día), no en alcance** (2,7 personas por posteo en Facebook; 566 vistas en 98 espejos de Instagram). Los 5 se agotan antes de las 16:36 (mediana) y la franja de 17 a 22 queda vacía. El enlace largo (178 caracteres) se arregla con el Worker de enlaces cortos, que está escrito y apagado (sección 6.4).

### 2.12 Historias destacadas: lo que hoy no existe

No hay "historias destacadas" cargadas en los perfiles (Farmacia, Teléfonos, Agenda, Clima, Participá: textos en `PERFILES.md`, pendiente de que los dos las suban a mano), ni historias que no sean copia de un reel.

---

## 3. Lo que falta y conviene sumar

Todo lo que sigue es propuesta. Regla de oro: **sumar sin gastar un audio más del cupo.** Una pieza *fija* (`reels/fijas`) cuesta un audio la vez y después cero por la cantidad de días que dure su vigencia.

### 3.1 Propaganda propia del medio

Los cinco guiones de H (§ 7) están escritos y son compatibles con el criterio. Cómo ubicarlos:

| Guion | Qué dice | Dónde ponerlo | Audio |
|---|---|---|---|
| 1. **Qué es Radar Balcarce** (20 a 25 s) | «Todo lo que pasa en Balcarce, en un solo lugar. Clima, farmacia de turno, agenda y las noticias de la ciudad y la zona…» | Reel + historia a las 12:00 en lugar de un Participá, un día; después, historia destacada | 1 la vez, como fija |
| 2. **Cómo se usa en un minuto** (30 a 40 s, con capturas de pantalla: entrar, ver clima y farmacia, agregar a la pantalla de inicio) | Tutorial de uso | Reel de la semana 2 y **historia destacada fija** «Cómo se usa» | 1 la vez |
| 3. **Dos vecinos** (25 a 30 s, cara de Hernán o Andrés) | Confianza y el WhatsApp para mandar datos | Facebook e Instagram, 1 vez; decide el dueño si quiere cámara | 0 (voz humana) |
| 4. **Participá: mandanos tu dato** | Convocatoria con WhatsApp 2266 51-1612 | Ya existe como Participá; **sumar sábado y domingo** con una variante «mandanos tu foto del fin de semana» | 0 si es fija |
| 5. **Para comercios** (placa 4:5 o reel de 15 s) | «Tu aviso puede estar donde los vecinos miran todos los días…» | Posteo estático en Facebook y espejo, **fuera del horario de repasos**, recién cuando haya cifras reales (semana 4) | 0 (sin voz) |

Otras invitaciones baratas: **la última línea de cada repaso y del clima de la mañana** podría decir «¿Viste algo? Escribinos al WhatsApp» una vez por semana (cuesta 3 segundos, no un audio nuevo); **un posteo de Facebook los domingos** con la foto del vecino más linda de la semana (concurso de habilidad, no sorteo); y **«Radar Balcarce en una frase»** (una nota de acá con la dirección del medio).

### 3.2 Convocatorias comerciales (H, escalones)

Hoy no hay precios, ni página `/publicidad`, ni kit; los avisos de la web están todos vacíos. Para las redes lo razonable, sin vender todavía: el guion 5 (arriba), el **«Presentado por…»** en el clima o en la agenda (una frase de cierre; todavía no existe en el código y gasta **cero audios** si se agrega a un guion que ya se dice), y «historia propia» de un comercio (a mano, con placa que arma Claude). **Reglas que no se rompen:** se rotula siempre «Espacio publicitario» o «Presentado por», una farmacia no auspicia la farmacia de turno, nada de Política ni Policiales, y un aviso no compra una nota. Los precios no van en el repositorio público.

### 3.3 Más servicio que la gente comparte

Del análisis de competencia (I) y de lo que ya hay armado: **«Balcarce en 5 líneas»** (clima, farmacia, agenda del día y 3 notas) como mensaje del canal de WhatsApp; **qué abre y qué cierra en un feriado**; **cortes programados de luz y agua** (cuando haya fuente oficial); **resultados del fin de semana** (fútbol local y regional) el lunes a la mañana; **Un día como hoy de Balcarce** (no sólo del país). Cada una debe decidirse con el dueño antes de armarse.

### 3.4 Lo que el dueño necesita decidir

Qué hacer con Política y Policiales de Balcarce hacia las redes (D-2 de C: cola de 3 a 5 candidatas en el celular con botón «Mandar a redes»); si se unifica «popular» en 3 para publicar y 8 para destacar (D-4); si el espejo de Instagram se apaga si en un mes sigue en ~5 vistas.

---

## 4. Los arreglos seguros que ayudan al cronograma (de C-REDES)

Son cambios chicos que no tocan lo que se decide: A-1 (`primeraOracion` no corta en abreviaturas), **A-2 (que Facebook no dependa de que Instagram funcione)**, A-3 (línea en el informe diario con la política y policiales de acá que no salieron), A-4 (un solo lugar para `posteosPorDia` y para el cupo de voz de 10), A-5 (restos viejos), A-6 (`revisarTexto` sin el falso positivo «recuerda»). El A-2 es el que habría salvado el repaso de la mañana del 22/10 en Facebook.

---

## 5. Recomendación de rango horario, de dos lados

### 5.1 Lado audiencia (datos reales)

- **Reels de Facebook:** el clima de las 7:00 (mediana 3.050) arrasa; los repasos de las 10 y de las 15, ~230 a 250; Un día como hoy, Participá, útiles y farmacia, entre 210 y 290; el clima de las 20 (26) y el repaso de las 21 (6) no se ven. Muestra de un mes, con mucha dispersión: sirve para decidir hacia dónde probar, no para asegurar.
- **Visitas a la web por hora** (`web/data/estadisticas.json`, 25 días, en hora de Balcarce; **SIN VERIFICAR**: la muestra es chica y trae tráfico de robots, sobre todo de madrugada y desde Francia): picos a las 7 y 8 de la mañana, a las 12 y entre las 18 y las 20; casi nada entre las 21 y las 3 (de 0 a 8 visitas por hora). Coincide con el reel del clima y con la franja vacía de posteos de 17 a 20.
- **Posteos de notas:** salen todos entre las 8 y las 16:36; casi nada de 17 a 22.
- **Competencia (I):** las radios locales (Gabal 31 mil, Líder 14,6 mil, Puntonueve 14,1 mil en Instagram) publican reels y fotos durante el día; nadie ofrece servicio ordenado a horas fijas ni un resumen diario por WhatsApp. Es una ventaja de **constancia y orden**, no de volumen.
- **Conclusión de audiencia:** concentrar el esfuerzo de **7 a 21**; mantener el ancla de las 7:00; llenar la franja de 17 a 20 (hoy vacía) con un repaso y con posteos; **dejar de gastar audios en lo que pasa después de las 21**.

### 5.2 Lado robot (reloj de Cloudflare, minutos de compilación, cupos)

Qué corre hoy y cuánto "sin sentido" tiene de noche (`trabajosDelMinuto`, `wrangler.toml`; horas de Balcarce):

| Tarea | Cuándo corre hoy | De noche (23 a 7) | Recomendación |
|---|---|---|---|
| **Actualizar la web** (el gasto grande: ~5 minutos por vuelta; en Workers Builds la bolsa es de 6.000 minutos por mes y alcanza para ~38 vueltas por día, 1.177 al mes, **se piden 48**; el presupuesto de `infra/motor-cloudflare/presupuesto.mjs` reparte los minutos por día y se saltea vueltas) | :00 y :30, las 24 horas | 16 vueltas entre las 23 y las 7 | **De 23:00 a 6:59, una por hora (:00).** Ahorra 8 vueltas por día, ~40 minutos, **~1.200 por mes (20 % de la bolsa)**; de día alcanzan 40 vueltas por día (6.000 minutos con vueltas de 5) y la web se arma casi cada 30 minutos en vez de cada ~42. Verificar antes que el vigilante de Cloudflare y el «motor atrasado» (que a los 40 minutos sin vuelta buena pide otra) no den falsas alarmas con una hora de hueco |
| Redes (reloj) | :05, :35, :45 de 7 a 23 | Ya apagado de 0 a 7; 23:05, 23:35 y 23:45 sólo sirven para reintentar una pieza de la noche | Dejar. Ahorro mínimo: pedirlo sólo de 7 a 23:35. Es el trabajo más barato (termina en segundos si no toca nada) |
| Vigilancia | Cada 3 horas (21, 0, 3, 6, 9…) con segundo intento a 9:30, 21:30 y 0:30 | 0:00 y 3:00 | Mantener la de 0:00 (cierra el día) y su reintento de 0:30; **sacar la de las 3:00** |
| Pistas | Cada 3 horas, `:23` (21, 0, 3, 6…) | 0:23 y 3:23 | **Sacar 0:23 y 3:23**: nadie pega pistas de madrugada y Tavily es de pago por búsqueda |
| Ilustrar notas sin foto | 7:20 a 23:20, cada 2 horas | Apagado | Dejar |
| Auditoría IA | :41 de 7 a 23 | Apagado | Dejar |
| **Revisar el archivo** (regla 212) | `:12` cada 2 horas, **las 24 horas** (12 tandas) | 4 tandas de noche | Es la única que conviene que corra de noche: no compite con la web ni con los repasos. Mirar que no use el mismo cupo de IA que la lectura de las 7 a 9 |
| Informe diario | 8:15 y 21:15 (segundo intento a los :30) | — | Dejar |

**Cupos de IA y voz.** El cupo de voz (10 audios) se renueva hacia las 4 o 5 de la mañana: nada con voz después de las 21 gasta del día siguiente; un día con el repaso de las 21:00 usa su audio igual. Por eso lo que se mueve a las 19:45 no gasta más ni menos.

### 5.3 Cronograma recomendado (propuesta, basada en la variante B recortada)

| Hora | Qué sale | Audio | Nota |
|---|---|---|---|
| 7:00 | Clima de la mañana (igual) | 1 | Ancla. No se toca durante la prueba |
| 8:30 | Posteo de nota 1 | 0 | Antes, 8:00 |
| 9:00 | Un día como hoy (igual) / feriado a las 8:00 | 1 | |
| 10:00 | Repaso de la mañana (igual) | 1 | |
| 11:00 | Posteo de nota 2 | 0 | |
| 12:00 | Participá / agenda (igual) | 0 o 1 | |
| 13:00 | Posteo de nota 3 (lugar reservado a una nota de Política o Policiales de acá aprobada por una persona; si nadie aprueba, la mejor que quede) | 0 | |
| 15:00 | Repaso de la tarde (igual) | 1 | |
| 15:30 | Posteo de nota 4 | 0 | |
| 17:00 | Útiles (sábados), con el diseño nuevo | 1 | |
| 17:30 | Posteo de nota 5 | 0 | |
| 19:00 | Farmacia (igual) | 1 | |
| **19:45** | **Repaso de la noche** (antes 21:00) | 1 | Franja vacía de 17 a 20; con 4 notas distintas |
| 20:15 | Posteo de nota 6 | 0 | Un posteo más que hoy |
| **21:30** | **Clima «cómo amanece mañana»** (antes 20:00) | 1 | Su ventana debe cerrarse a las 24:00 |
| 22:00 a 7:00 | **Nada con voz ni posteos.** Sólo corren lo necesario: la web una vez por hora, el cierre del día, la revisión del archivo | 0 | |

Total: 7 audios normales, 8 con extras, 9 como mucho (igual que hoy). Seis posteos en vez de cinco.

---

## 6. Las variantes A, B y C de J y cuál empezar

### 6.1 Qué son (resumen de `J-REDES-CRONOGRAMAS-Y-CANALES.md` § 1)

| | Idea | Posteos | Audios | Qué se cambia en el código |
|---|---|---|---|---|
| **A, conservadora** | No toca ningún video; reparte los 5 posteos en tres franjas: 8:30, 11:00, 13:30, 16:00, 18:30 | 5 | 7 a 9 | Sólo `elegirParaFacebook` |
| **B, equilibrada** | A + repaso de la noche a las 19:45 + clima de la noche a las 21:30 («cómo amanece mañana») + 6 posteos (8:30, 11:00, 13:00, 15:30, 17:30, 20:15) + «Y hoy en Balcarce: …» de 5 a 8 s al final del clima de las 7:00 + lo de afuera sólo con 8 medios + un lugar reservado a Política o Policiales aprobadas | 6 | 7 a 9 | `HORAS_REELS`, `VENTANAS`, `HISTORIAS_FIJAS`, guion del clima, `elegirParaFacebook`, `FACEBOOK.porDia` y `CONTRATO_DIARIO.posteosPorDia` (dos números a la vez) |
| **C, agresiva** | B + farmacia de la mañana a las 8:45 + repaso de la noche a las 18:00 + 8 posteos desde las 8:15 + piso 65 de puntaje + techo de historias 10 | 8 | 8 a 10, **sin margen** | Todo lo de B + una pieza nueva `farmacia-manana` |

Se prueban **cuatro semanas de lunes a domingo**: semana 0 como hoy (26/10 al 8/11, con enlaces cortos y medición), semana 1 = B (9/11), semana 2 = C (16/11), semana 3 = A (23/11), semana 4 = la que vaya ganando (30/11), decisión el 9/12. Gana una variante que supere a la semana 0 en al menos **dos de las medidas** (índice de reels contra el clima de las 7:00, visitas desde Facebook, seguidores nuevos) por **30 % o más**; si ninguna llega, gana A. El 5/11 se decide cuál se corre.

### 6.2 Dos observaciones sobre J

1. **Contradicción:** J dice que ninguna variante toca el clima de las 7:00 (es la regla de medir), pero B y C le agregan un cierre de 5 a 8 segundos con una nota de acá. Si se agrega, la regla de medir cambia el mismo día que empieza la prueba. Y el reel del clima tiene un tope de 25 segundos (hoy 10 a 20): 8 más lo podrían pasar.
2. **La cola de Política y Policiales no existe todavía.** B y C la usan («un lugar por día reservado a una nota aprobada»). Sin la cola hecha, ese lugar lo usa «la mejor nota que quede», que es lo que ya pasa: no hay riesgo, pero tampoco se prueba nada.

### 6.3 Mi recomendación: empezar por B recortada

**B sin el cierre «Y hoy en Balcarce» en el clima y sin la cola de Política, y con la variante A en la semana 3 como control.** Razones:

- Ataca los dos problemas que muestran los datos (franja vacía de 17 a 20 y los dos formatos que no se ven) sin gastar un audio más ni un peso más.
- Es cambio chico de código (horas, ventanas, repartir el cupo por franja) y se vuelve atrás con las mismas constantes.
- Deja el clima de las 7:00 intacto, que es la regla con que se compara una semana con otra. El cierre del clima se prueba **después, alternando días**, como experimento aparte.
- C no se corre salvo que alguien mire el cupo de voz todos los días de esa semana; con 53 a 83 seguidores no hay audiencia que justifique 8 posteos por día (J lo dice: existe para comprobarlo con números).
- Hay dos cosas para hacer **antes de que empiece la semana 1**: re-armar los cuatro Participá (vencen el 31/10) y prender los enlaces cortos (sección 6.4).

### 6.4 Antes de empezar: enlaces cortos (J § 3)

`ENLACES_CORTOS` está apagado. Un posteo hoy lleva un enlace de ~178 caracteres que nadie mide; el Worker (`infra/enlaces-cloudflare/`) lo baja a 36 y cuenta los toques de personas. Falta: subir el Worker, poner la ruta `radarbalcarce.com/r/*`, **conectar la variable `ENLACES_CORTOS` en los pasos de `redes.yml` («Facebook» y «Publicar en Instagram y en la página de Facebook»), `piezas.yml` y `reintentar.yml`** (hoy no llega a ningún paso, aunque se ponga «Si»), arreglar que el Worker reintente el índice si la nota es nueva (hoy cae en un 404 que ve el robot de Facebook) y escribir `redes/estadisticas-enlaces.mjs` para poder medirlo. La ruta no se saca nunca una vez usado el primer enlace.

---

## 7. Las redes que faltan y el orden de alta (de J § 2.3 y TABLA-DE-REDES)

Hoy el robot sólo habla con Meta. Cada red nueva con API es código nuevo con prueba (de uno a tres días de trabajo) y un secreto nuevo. Con 83 seguidores en Facebook y 10 en Instagram, ninguna reemplaza a Facebook (donde llega el 74 % de las visitas): sirven para **estar presentes a costo cero**.

| Orden | Red | Alta (la hace una persona) | Cómo se publica | Costo |
|---|---|---|---|---|
| **1** | **Canal de WhatsApp** | Crearlo desde el teléfono del medio (5 minutos) y poner el enlace en la web y en la bio | **A mano** (no hay API): farmacia, el mejor titular y «Balcarce en 5 líneas», 20 segundos por pieza | 0 |
| **2** | **Canal de YouTube** | Canal con `radarbalcarce@gmail.com`, verificar el teléfono; pedir la auditoría de la API en paralelo | A mano 1 o 2 reels por día; los videos subidos por la API de un proyecto sin auditar **quedan privados** (confirmado en Google) | 0 |
| **3** | **Telegram (canal + bot)** | Bot con @BotFather y canal; pegar el token en GitHub Secrets | **Automático**: la API es gratis y sin revisión; videos de hasta 50 MB (los nuestros pesan 1 o 2) | 0 |
| **4** | **Bluesky** | Cuenta, confirmar mail, contraseña de aplicación | **Automático**, gratis, 300 caracteres y video de hasta 3 minutos | 0 |
| **5** | **Threads** (ya existe `@radarbalcarce`) | Agregar Threads a la app de Meta existente, autorizar como probador; renovar el token cada 60 días | **Automático**, gratis; pide una dirección pública del video (el depósito R2 que ya tenemos) | 0 |
| **6** | **TikTok** (ya existe, sin bio ni logo) | Pasar a Creator o Business | **A mano** programando con TikTok Studio: la API sin auditar publica sólo en privado | 0 |
| 7 | X (ya existe) | Cargar tarjeta | Paga: US$ 0,015 por posteo, US$ 0,20 si lleva enlace | **No**, con la regla de cero costos nuevos |
| 8 | Instagram: canal de difusión, grupos de Facebook, newsletter, podcast | Según se vea | A mano / después | — |

No conviene: Pinterest, LinkedIn (salvo la página de empresa), Mastodon, Reddit, Snapchat, Twitch.

---

## 8. Herramientas con cupo gratis: qué publica solo y qué no

### 8.1 WhatsApp, por tipo de uso

| Vía | Qué permite | ¿Automático y gratis? | Veredicto |
|---|---|---|---|
| **Canal de WhatsApp** | Difundir a seguidores que no pueden contestar (en canales de medios chicos hay entre decenas y 4.700 seguidores) | **No hay API oficial** de Meta para publicar en canales (la que existe es de sólo lectura); las vías de terceros (Whapi, WAHA, Evolution) usan el número como WhatsApp Web y **arriesgan perder el 2266 51-1612** | **A mano.** Recomiendo que sea la red nº 1 por cercanía y costo cero |
| **WhatsApp Business (la app)** | Estado de 24 horas, listas de difusión (hasta 256 contactos que tengan el número guardado), respuestas rápidas, saludo y ausencia | No automático | A mano; configurar saludo y ausencia ya (sección 6 de TABLA-DE-REDES) |
| **WhatsApp Business Platform (Cloud API)** | Contestar por programa. Dentro de las 24 horas de que escribe la persona los mensajes libres no se cobran (**SIN VERIFICAR** el detalle de precios vigente); **para escribirle primero hay que usar plantillas aprobadas, con aceptación previa de la persona y cobro por mensaje** (según el tipo) | **No es gratis para difundir** | Sirve para un **buzón automático** de «Participá»: acuse de recibo y que el dato llegue al panel. Es la «etapa 3» de `docs/auditoria-2-0/06`. Requiere un número que no esté en el WhatsApp común (o la función de convivencia con la app Business, **SIN VERIFICAR**) y revisión de la app |
| **Comunidades y grupos propios** | Conversación | No hay API | No conviene: pide moderar todo el día |

**Conclusión WhatsApp:** no hay forma automática gratis ni segura de difundir. Lo realista es la **cadena a mano de 20 segundos**: el robot deja en el panel del celular el texto listo («Farmacia de turno», «Balcarce en 5 líneas») y una persona lo pega en el canal. Si algún día se quiere el aviso por WhatsApp a quien lo pida, es Cloud API con plantillas y costo por mensaje (A VALIDAR).

### 8.2 Resumen de herramientas y cupos

| Herramienta | Cupo gratis | Qué redes cubre | ¿Sirve? |
|---|---|---|---|
| **API propia de Telegram (Bot API)** | Sin cupo práctico (unos 20 mensajes por minuto por grupo, **SIN VERIFICAR**) | Telegram | **Sí, la más fácil.** Además deja programar mensajes a mano desde la app |
| **API propia de Bluesky** | 5.000 puntos por hora, 35.000 por día (escribir cuesta 3) | Bluesky | **Sí** |
| **API de Threads** | 250 posteos por 24 horas por perfil | Threads | **Sí**, con depósito público de videos y renovar el token cada 60 días |
| **API de Meta (Graph API)** | 100 posteos por API por día en Instagram; 30 reels por día en Facebook | Facebook e Instagram | Ya la usamos |
| **API de YouTube** | 10.000 unidades por día (subir cuesta 1.600 o 100 según la fuente, **SIN VERIFICAR**) | YouTube | **Con trampa:** privado hasta que Google audite el proyecto |
| **API de TikTok** | — | TikTok | **No:** sin auditoría sólo privado, 5 usuarios por día |
| **Buffer Free** | 3 canales, 10 posteos en cola por canal, API incluida, 3.000 pedidos cada 30 días | Instagram, Facebook, TikTok, YouTube, Threads, X, Bluesky, LinkedIn. **No Telegram ni WhatsApp** | **El único gratis que sirve** como respaldo y para probar TikTok (SIN VERIFICAR si publica a TikTok por API) |
| **Metricool Free** | 20 posteos por mes, sin API | Varias | No alcanza (sirve sólo para estadísticas) |
| **Publer Free** | 3 cuentas, 10 en cola, sin API | TikTok, YouTube, Threads, Bluesky, Telegram… | Sirve para programar a mano |
| **Later / SocialBee / Hootsuite / Postiz / Ayrshare** | Sin plan gratis o caros | — | Descartados |
| **Make / Zapier / n8n / IFTTT** | 1.000 créditos / 100 tareas / autoalojado / 2 applets | Pegamento | No suman: el robot ya es el pegamento |
| **Programación nativa gratis** (Meta Business Suite, TikTok Studio, YouTube Studio, Threads, mensajes programados de Telegram) | Gratis | Cada una la suya | Sirve para dejar varios días programados a mano (hasta 75 días en Meta, **SIN VERIFICAR**) |

---

## 9. Publicar a mano desde el Chrome del dueño, con la PC prendida

**Qué se puede.** Con el navegador del dueño logueado en cada red, un agente puede abrir TikTok Studio, YouTube Studio, el WhatsApp Web (para el canal), Meta Business Suite o la web de Telegram, subir el video que el robot dejó armado y pegar el texto. Es lo que `TABLA-DE-REDES.md` § 5 llama el «agente a mano»: con el paquete del día armado, unos **15 a 25 minutos por día** (estimación, no medida) para TikTok, YouTube y el canal de WhatsApp.

**Reglas y riesgos:**

- **Siempre con una persona al lado:** el agente no resuelve CAPTCHAs ni verificaciones en dos pasos, ni inicia sesión con contraseñas; cada publicación es un acto que la persona tiene que autorizar. No es un robot que corra solo.
- **Riesgo de cuenta.** Operar el navegador de una cuenta nueva con un programa puede ser detectado como automatización (cuentas nuevas con voz sintética ya son sospechosas en TikTok y YouTube, que piden etiquetar el contenido sintético). Las condiciones de TikTok y de WhatsApp (el número es el del medio) prohíben la automatización por fuera de su API; **perder el 2266 51-1612 sería lo peor**. Por eso: ritmo humano, pocas piezas, sin repetir acciones idénticas a la misma hora, y nada de automatizar WhatsApp Web.
- **Calidad:** el agente copia el pie y la leyenda del robot; hay que revisar que no se pegue la firma de otro medio ni un enlace sin acortar, y que la etiqueta «contenido sintético» esté marcada en YouTube y TikTok.
- **Dependencia de la PC prendida y de la sesión abierta:** si Chrome se cierra o la sesión se vence, se corta. No es un servicio.

**¿Hay forma online sin PC?** Sí, para programar (no para operar cuentas):

- **Meta Business Suite desde el celular** programa Facebook e Instagram hasta con semanas de anticipación (redundante con la API que ya usamos).
- **YouTube Studio y TikTok Studio** dejan *programar* un video: se sube una vez y queda en la nube; hace falta una persona que lo cargue una vez (con la PC o el celular).
- **Mensajes programados de Telegram** desde la app, sin PC.
- **Buffer Free o Publer Free** guardan las piezas en la nube y las publican a su hora; **no cubren WhatsApp ni Telegram** (Buffer).
- **Un navegador en la nube o un servidor que opere cuentas con un robot** lo único que hace es repetir el riesgo de cuenta de arriba, sin una persona mirando: **no lo recomiendo**.

**Mi propuesta:** el robot arma cada día un **paquete listo** (video, texto, hashtags y enlaces) y lo deja en el panel del celular; una persona lo sube en 10 a 15 minutos a las redes sin API (canal de WhatsApp, YouTube, TikTok). Se prueba un mes. Sólo si una red demuestra tráfico se invierte en su API.

---

## 10. Qué hacer ya, en orden

1. **Antes del 31/10:** re-armar los cuatro Participá con «Fijar piezas» (4 audios, una vez), si no, desde el 1/11 el día pasa a 8 o 9 audios.
2. Esta semana: crear el canal de WhatsApp y el de YouTube (a mano) y cargar bios, categoría, botón de WhatsApp y las cinco historias destacadas.
3. Subir el Worker de enlaces cortos y conectar `ENLACES_CORTOS` (sección 6.4); correr la semana 0 de la prueba del 26/10 al 8/11.
4. **5/11:** decidir B recortada y el resto de las preguntas de J § 4.
5. Cuando el dueño lo apruebe, pedir el cambio de código del reloj de Cloudflare (la web a una vuelta por hora de 23 a 7; sacar Pistas de 0:23 y 3:23 y Vigilancia de las 3:00) y correr a mano «Reloj de Cloudflare» (no se sube solo).
6. Rediseñar los teléfonos útiles (sección 2.5) antes del próximo sábado de uso real.
7. Armar Telegram y Bluesky (código nuevo con su prueba), después Threads.
