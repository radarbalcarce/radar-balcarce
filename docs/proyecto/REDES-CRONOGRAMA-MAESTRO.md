# Redes: el cronograma maestro (qué sale, cuándo, por qué y qué falta)

*24/10/2026. Documento de lectura: no se cambió código ni horarios. Junta en un solo lugar lo que Radar Balcarce publica hoy en redes, lo que conviene sumar y cuándo
conviene que corra cada cosa. Se armó leyendo el código (`redes/horarios.mjs`, `redes/piezas.mjs`, `redes/contrato.mjs`, `ingesta/criterio.mjs`, `reels/fijas.mjs`,
`reels/cupo-voz.mjs`, `infra/reloj-cloudflare/`) y los informes `docs/auditoria-2-0/` C, H, I y J. **Si algo de acá no coincide con el código, manda el código.** Lo que
no se pudo confirmar en una página oficial está marcado **SIN VERIFICAR**.*

**Dónde vive cada cosa (para no duplicar).** Este archivo es el mapa y la propuesta. El detalle técnico de Facebook e Instagram sigue en
[`docs/07-REDES.md`](../07-REDES.md) (recorrido paso a paso, libro, contrato); cómo suena cada pieza, en [`CRITERIO-REDES.md`](../../CRITERIO-REDES.md); las demás redes
(Telegram, Bluesky, Threads, YouTube, TikTok, WhatsApp), en los anexos A a C de este mismo documento (antes `TABLA-DE-REDES.md`, `PLAN-REELS-OTRAS-REDES.md` y `AUTOMATIZAR-REDES-ALTERNATIVAS.md`) y [`docs/redes/FORMATOS-POR-RED.md`](../redes/FORMATOS-POR-RED.md).
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

---

## Anexos: los tres documentos de las otras redes

*Se unieron acá el 25/10/2026 (estaban en `docs/redes/`). Son del 15 al 17/10: lo que cambió después manda lo de arriba y el código.*

## Anexo A. La tabla de redes, los servicios para automatizar y los perfiles listos para pegar

*Antes: `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md (anexos)`.*

> **24/10/2026:** el cronograma maestro (qué sale hoy hora por hora, qué falta, el orden de alta de cada red, WhatsApp, herramientas gratis y publicar a mano) está en [`docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md`](../proyecto/REDES-CRONOGRAMA-MAESTRO.md). Esta tabla es el detalle de cada servicio.

*17/10/2026. Es una **investigación**, no código: no se creó ninguna cuenta, no se tocó ninguna clave, no se publicó nada y no se cambió ningún archivo del robot. Los datos de precios y límites se leyeron el 17/10/2026 en las páginas oficiales de cada servicio cuando se pudo; lo que sólo salió de blogs o de notas de prensa, o que no se pudo abrir (varias páginas de ayuda de TikTok, Meta y WhatsApp cargan con JavaScript y no se dejan leer), está marcado **SIN VERIFICAR**. Complementa y actualiza `AUTOMATIZAR-REDES-ALTERNATIVAS.md` (15/10) y `FORMATOS-POR-RED.md` (16/10); no los reemplaza: los detalles técnicos (medidas de video, topes de la API) siguen estando ahí.*

**Cómo leer los veredictos**

| Veredicto | Qué quiere decir |
|---|---|
| **AUTOMÁTICO YA** | El robot ya publica solo, con la PC apagada |
| **AUTOMÁTICO CON TRÁMITE** | El robot puede publicar solo, pero antes una persona tiene que crear la cuenta, el bot o la autorización (una sola vez) |
| **A MANO** | No hay vía automática segura o gratis: el sistema deja el texto y el video listos y una persona (o un agente con una persona al lado) los sube |
| **NO CONVIENE** | No suma para un medio de un pueblo de 45.000 habitantes, cuesta de más o arriesga la cuenta |

---

### 1. Resumen en 10 líneas

1. **Hoy sólo Facebook e Instagram salen solos** (53 y 7 seguidores el 15/10). Facebook trae tres de cada cuatro visitas al sitio: ahí está la audiencia hoy, y no hay que recortarla.
2. **Ya tenemos cuenta, sin publicar nada, en X, Threads y TikTok** (creadas el 15/10). **No tenemos** canal de YouTube, Telegram, Bluesky, canal de WhatsApp ni LinkedIn.
3. **Cuatro redes se automatizan gratis con su propia API**, sin pagar ningún servicio: Telegram, Bluesky, Threads y YouTube Shorts; X también, pero con un costo de unos US$ 2 por mes. Lo único que piden es que Hernán o Andrés creen la cuenta o la autorización una vez.
4. **TikTok y el canal de WhatsApp no tienen camino propio automático.** TikTok: sólo por un servicio de terceros (Buffer, a probar) o a mano; el canal de WhatsApp: a mano, siempre.
5. **Los servicios gratis que sirven de verdad son uno solo: Buffer Free** (3 canales, 10 posteos en cola por canal y API incluida, 3.000 pedidos cada 30 días). Alcanza en volumen para unas 6 piezas por día **si el robot las manda de a una, cerca de la hora de salida**. Si deja TikTok en el plan gratis es **SIN VERIFICAR** (se prueba en la prueba de 14 días).
6. **Metricool gratis NO alcanza**: la página oficial de hoy dice **20 posteos por mes** (no 50; la propia Metricool todavía muestra "50" en otra página, que quedó vieja) y sin API. **Later no tiene plan gratis** (sólo prueba de 14 días; el más barato, US$ 18,75 por mes con pago anual). **Publer gratis** programa a mano para 3 cuentas pero sin API.
7. **La programación nativa gratis** (TikTok Studio de escritorio, YouTube Studio, Meta Business Suite, Threads, LinkedIn) permite dejar piezas programadas de a varios días con la PC prendida: sirve para el "agente a mano" (sección 5).
8. **El "agente a mano" cuesta poco tiempo**: con el paquete diario armado por el sistema, unos **15 a 25 minutos por día** para TikTok, YouTube y el canal de WhatsApp (estimación nuestra, no medida).
9. **Lo que no conviene en ningún caso**: Pinterest, Reddit, Mastodon, Snapchat, Twitch/Kick, Google Business Profile (no corresponde a un medio sin local) y publicar solos en grupos de Facebook (Meta cerró esa API en abril de 2024).
10. **Costo total recomendado: entre US$ 0 y US$ 7 por mes** por encima de lo que ya se paga (X unos US$ 2 y Buffer Essentials US$ 5, ambos sólo si hacen falta; sin ellos, US$ 0).

---

### 2. Tabla maestra de redes

**Datos propios de partida** (`web/data/estadisticas.json`, 29/09 al 15/10, muestra chica de 646 visitas): Facebook 523 visitas, directo 179, Google 7. Seguidores: Facebook 53, Instagram 7. 66 % de las visitas son desde el celular.

**Piezas que el robot ya produce** (de `FORMATOS-POR-RED.md` § 2.1): hasta 5 notas por día con foto (Facebook y espejo en Instagram), 3 repasos con voz (10:00, 15:00, 21:00), clima (7:00 y 20:00), farmacia (19:00), "Un día como hoy" (9:00), feriado, agenda (jueves), teléfonos útiles (sábado), "Participá" (lunes a viernes 12:00). Todo video es vertical 1080 × 1920, 6 a 58 s.

#### 2.1 Las que ya tenemos o ya funcionan

| Red | ¿La tenemos? | Qué publicar (de lo que ya existe) | Frecuencia | Qué rinde en Balcarce | API oficial y costo | Veredicto | Qué hace falta |
|---|---|---|---|---|---|---|---|
| **Facebook (página "Radar Balcarce")** | Sí. 53 seguidores | Notas con foto 4:5, reels de los repasos y piezas fijas, historias (clima, farmacia, repasos) | Hasta 5 notas + 3 a 4 reels + 3 a 6 historias por día | **Lo más importante hoy**: 74 % de las visitas | Sí (Graph API de Meta). Gratis. 30 reels por día por API | **AUTOMÁTICO YA** | Revisar si los enlaces de los posteos de los últimos días se ven tocables (Meta prueba un tope de 2 posteos con enlace por mes para páginas que no pagan; no se sabe si somos "publicador"; `FORMATOS-POR-RED.md` § 3.1) |
| **Instagram feed, reels e historias (`@radarbalcarce`)** | Sí. 7 seguidores | Espejo de la nota (foto 4:5), reels con voz, historias | Igual que Facebook | Bajo hoy; es donde el aspecto y el sonido pesan | Sí (Graph API). Gratis. 100 posteos por API por día | **AUTOMÁTICO YA** | Completar lo que falta en el perfil (categoría, enlace, botón de WhatsApp, historias destacadas: sección 6). El enlace de un pie no se toca: decir "link en la bio" |
| **Mensajes de Facebook e Instagram** | Sí (bandeja) | Contestar a mano, o respuestas armadas fuera de horario | A demanda | Sirve para recibir datos y fotos del barrio | Sí (Messenger e Instagram Messaging API): se contesta sólo dentro de las 24 h; hace falta revisión de la app (trámite SIN VERIFICAR) | **A MANO** hoy; **AUTOMÁTICO CON TRÁMITE** más adelante (etapa 3 de `docs/auditoria-2-0/06`) | Hoy: configurar saludo y mensaje de ausencia en la bandeja (sección 6) |
| **X (`@RadarBalcarce`)** | Sí, creada el 15/10; no publica | Textos cortos de nota (titular + frase, sin enlace) y los repasos en video | 3 a 4 por día | Bajo a medio (periodistas, entidades) | Sí, **pago por uso**: US$ 0,015 por posteo, US$ 0,20 si el texto lleva enlace (página oficial de X, 17/10). Unos US$ 1,80 por mes con 4 por día sin enlace | **AUTOMÁTICO CON TRÁMITE** (con costo) | Cargar tarjeta con tope de gasto; crear la app. Opcional |
| **Threads (`@radarbalcarce`)** | Sí, creada el 15/10; no publica | Nota en texto con tarjeta de enlace; los repasos en video (no las dos cosas en un posteo) | 3 a 6 por día (tope de la API: 250 por 24 h) | Medio: es la gente de Instagram | Sí (Threads API). Gratis. Hace falta un depósito público de videos (R2) y renovar el token cada 60 días | **AUTOMÁTICO CON TRÁMITE** | Invitación de "tester" y token; depósito de videos |
| **TikTok (`@radarbalcarce`)** | Sí, creada el 15/10; la bio y el logo no se veían (revisar) | Videos de los repasos y las piezas fijas que no caducan (efeméride, feriado, agenda, útiles, participá) | 2 por día | Alto en alcance, bajo en visitas; no se sabe cómo rinde en un pueblo | API propia: **no** viable (las reglas de TikTok dicen que no es para "una herramienta para subir contenido a las cuentas que uno maneja", y sin auditoría todo queda privado). Por un servicio aprobado (Buffer) o a mano | **A MANO** hoy (programado con TikTok Studio); probar **AUTOMÁTICO CON TRÁMITE** vía Buffer | Cuenta Business o Creator (para programar); revisar si la firma dentro del video molesta a TikTok (`FORMATOS-POR-RED.md` § 2.4) |

#### 2.2 Las que no tenemos y conviene abrir

| Red | ¿La tenemos? | Qué publicar | Frecuencia | Qué rinde en Balcarce | API oficial y costo | Veredicto | Qué hace falta |
|---|---|---|---|---|---|---|---|
| **Telegram (canal)** | No (por confirmar) | Todo: notas con enlace y vista previa, repasos en video, farmacia, clima, agenda | Hasta 5 notas + 7 a 8 videos por día; silenciosos salvo 3 | Bajo en un pueblo; cuesta cero y sirve de buzón del WhatsApp a mano | Sí (Bot API). Gratis, sin revisión. Videos de hasta 50 MB (los nuestros pesan 1 o 2) | **AUTOMÁTICO CON TRÁMITE** | Crear el bot con @BotFather y el canal; pegar el token en GitHub Secrets |
| **Bluesky** | No (por confirmar) | Titular + enlace (300 caracteres, con tarjeta); repasos en video | 3 a 7 por día | Bajo (poca gente de Argentina); buena comunidad de periodistas | Sí (protocolo abierto). Gratis, sin revisión. Video hasta 3 min y 100 MB | **AUTOMÁTICO CON TRÁMITE** | Crear la cuenta, confirmar el correo, crear una contraseña de aplicación |
| **YouTube (Shorts y canal)** | **No tiene canal** | Los videos que no caducan: repaso de la noche, efeméride, feriado, agenda, teléfonos útiles | 2 por día (3 a 4 con agenda, útiles o feriado) | **El de más alcance a largo plazo**: un video sobre "Balcarce" se encuentra por Google durante meses. Los enlaces de la descripción de un Short no se tocan | Sí (YouTube Data API). Gratis, 100 subidas por día. **Duda abierta**: si lo que sube un proyecto sin verificar queda privado; la página oficial dice que no, varios blogs dicen que sí. Se resuelve con una prueba de 5 minutos con un video "no listado" | **AUTOMÁTICO CON TRÁMITE** | Canal, proyecto de Google Cloud, pantalla de consentimiento "En producción", autorizar una vez, prueba del "no listado → público" |
| **YouTube: podcast** | No | El repaso del día como audio con portada | 1 por día | Medio a largo plazo | YouTube Music/Podcasts leen un RSS; sin costo | **AUTOMÁTICO CON TRÁMITE**, más adelante (ver "Podcasts" abajo) | El feed `/podcast.xml` (hoy sin conectar; `docs/historico/redes/AUDIO-EN-LA-PAGINA-Y-PODCAST-GENERAL.md`) |
| **WhatsApp: canal** | No (por confirmar; figura "a crear") | Farmacia de turno, el repaso de la mañana (o el mejor titular del día), agenda | 1 a 3 por día | **El más cercano a la gente de acá**; el número del medio ya es el contacto | **No existe API oficial** (Meta no la tiene; el registro de cambios oficial no nombra canales). Las vías de terceros (Whapi, WAHA) usan el número como WhatsApp Web: riesgo de perder el 2266 51-1612 | **A MANO** | Crear el canal (5 minutos, con el teléfono). 20 segundos por pieza |
| **WhatsApp: Business app (el número 2266 51-1612)** | Por confirmar si es la app común o la Business | Recibir fotos y datos ("Participá"); saludo, ausencia, respuestas rápidas | A demanda | Alto como buzón | La app es gratis. La **Business API** (para contestar con un programa) cobra por mensaje de marketing y es gratis para responder dentro de las 24 h; exige un número que no esté en el WhatsApp común | **A MANO** (app) / API: **AUTOMÁTICO CON TRÁMITE** sólo para contestar, etapa 3 | Pasar a WhatsApp Business app (sección 6) |
| **WhatsApp: comunidad y grupos propios** | No | Nada | — | Pide moderar todo el día | No hay API | **NO CONVIENE** por ahora | — |
| **Grupos de Facebook de Balcarce** | Por confirmar a cuáles se puede entrar | El mejor titular del día o la farmacia, sin enlaces a cada nota; sin Política ni Policiales | 1 por día, a mano | Puede traer visitas; depende de la regla de cada grupo | **No**: Meta quitó la API para publicar en grupos en abril de 2024 (fuentes de terceros; SIN VERIFICAR contra Meta) | **A MANO** | Pedir permiso a los administradores y respetar sus reglas; una persona publica. Nunca automatizar |

#### 2.3 Buscadores, audio y mail

| Red | ¿La tenemos? | Qué publicar | Frecuencia | Qué rinde en Balcarce | API oficial y costo | Veredicto | Qué hace falta |
|---|---|---|---|---|---|---|---|
| **Google Noticias** | Se decide solo | El sitio mismo (notas, sitemap de noticias) | Cada nota | Alto si se cumplen las reglas | **No hay alta**: la ayuda oficial de Google dice "Google automatically considers all web content for inclusion in Google News, so you don't need to apply". Publisher Center ya no es para entrar, sirve para ingresos y Showcase | **AUTOMÁTICO YA** (depende del sitio) | Seguir con la página "quién escribe y cómo corregimos" y los datos estructurados (`docs/seo/AUDITORIA-SEO-LLM.md`) |
| **Google Discover** | Se decide solo | Notas con buena imagen (1200 px o más) y título claro | — | Puede ser fuerte, pero Google no lo promete ni se pide | No se pide | **AUTOMÁTICO YA** (nada para hacer) | Fotos grandes en las notas |
| **Google Business Profile** | No | — | — | — | Gratis, pero la política de Google excluye los negocios sólo online (la lista de no elegibles incluye "online-only businesses"); un medio sin atención en persona probablemente no califica | **NO CONVIENE** | — |
| **Apple News** | No | — | — | — | Por invitación o selección y sin confirmar que haya servicio en Argentina (no se pudo leer la lista oficial) | **NO CONVIENE** por ahora (SIN VERIFICAR) | — |
| **Podcasts: Spotify, Apple Podcasts, YouTube Music** | No | Un episodio diario con los tres repasos juntos (no tres de 55 s) | 1 por día | Medio, a largo plazo | Spotify for Creators es gratis y también se puede mandar un RSS externo (la ayuda de Spotify dice que hay que enviarlo a cada plataforma a mano: "we don't distribute automatically"). Apple Podcasts: RSS con portada cuadrada (3000 × 3000 recomendado en el plan; SIN VERIFICAR en la página de Apple) | **AUTOMÁTICO CON TRÁMITE**, etapa tardía | Conectar `/podcast.xml`, portada, envío a cada plataforma una vez |
| **Newsletter por mail** | No | "Balcarce a las 7": 5 notas, farmacia, clima | 1 por día | Medio; es audiencia propia, sin algoritmo | Brevo: plan gratis de 300 mails por día (la página de precios no mostró el detalle hoy; la cifra sale de las páginas de Brevo, SIN VERIFICAR en la tabla). MailerLite gratis hoy: **250 suscriptores y 2.500 mails por mes** (página oficial, 17/10): sirve para 10 envíos por mes con 250 personas, no para uno diario. Buttondown: gratis los primeros 100 suscriptores; el resto cuesta | **AUTOMÁTICO CON TRÁMITE** | Elegir servicio (Brevo si es diario), formulario de alta con confirmación y baja, dominio de envío en Cloudflare |
| **Mail de la redacción** | Sí (`contacto@`, `redaccion@`, `publicidad@radarbalcarce.com`, reenvían a Gmail) | Recibir datos, gacetillas y avisos | A demanda | Alto como fuente | Cloudflare Email Routing, gratis | **AUTOMÁTICO YA** | — |

#### 2.4 Redes que no conviene abrir

| Red | Por qué no | Veredicto |
|---|---|---|
| **LinkedIn (página)** | Público profesional; la API pide un producto restringido con revisión; la programación nativa gratis existe pero no hay a quién llegar en el pueblo | **NO CONVIENE** por ahora |
| **Pinterest** | No es una red de noticias locales; sin "acceso Standard" los pines se ven sólo desde la propia cuenta | **NO CONVIENE** |
| **Mastodon** | Poca gente de Argentina, sin audiencia local | **NO CONVIENE** |
| **Reddit** | La API gratuita (unas 100 consultas por minuto) no permite uso comercial; el acceso comercial pide aprobación y un gasto mínimo que no se publica (fuentes de terceros, SIN VERIFICAR); no encontré evidencia de una comunidad de Balcarce | **NO CONVIENE** |
| **Snapchat** | Público joven, sin publicación automática accesible | **NO CONVIENE** |
| **Twitch / Kick** | Es transmisión en vivo; el robot no hace en vivo (regla del criterio) | **NO CONVIENE** |
| **Apps de mensajería local** | No encontré ninguna en Balcarce | **Por confirmar**: si Hernán y Andrés conocen alguna (grupo de vecinos, app del municipio), se evalúa aparte |

---

### 3. Los servicios para automatizar, comparados

**Cómo leer**: "plan gratis" es lo que figura en la página oficial el 17/10/2026. Todos corren en sus servidores: no hace falta la PC. "API" = que nuestro robot (GitHub Actions) pueda mandarle el contenido. Nuestro robot ya hace de "pegamento" gratis (GitHub Actions): Make, Zapier, n8n e IFTTT **no suman** salvo para unir un servicio sin API.

| Servicio | Plan gratis HOY | Precio de pago (inicio) | Redes que importan | API o integración para el robot | Veredicto para nosotros |
|---|---|---|---|---|---|
| **Buffer** (`buffer.com/pricing`) | **Sí: 3 canales, 10 posteos en cola por canal, 100 ideas, 1 usuario, API incluida** (1 clave, 3.000 pedidos cada 30 días) | Essentials US$ 5 por canal por mes (US$ 60 al año); Team US$ 10 por canal | Instagram, Facebook, TikTok, YouTube (Shorts), Threads, X, Bluesky, LinkedIn, Pinterest, Mastodon, Google Business, Substack. **No Telegram, no WhatsApp** | **Sí, en todos los planes** (GraphQL, clave personal). El video hay que alojarlo en un enlace público y debe seguir disponible hasta que se publique. Su hoja de ruta (24/02/2026) todavía listaba "TikTok por API" como "Exploring": **SIN VERIFICAR** si el API publica a TikTok | **El único gratis que sirve.** Usarlo para TikTok (probar), y como respaldo de YouTube/Threads |
| **Metricool** (`metricool.com/pricing`) | **Sí: 1 marca, 20 posteos por mes**, 1 cuenta por red (sin LinkedIn ni X), 30 días de analítica | Starter desde €16 (anual) o US$ 20; Advanced desde €43 (US$ 53) | Facebook, Instagram, Threads, Bluesky, Pinterest, TikTok, YouTube, Twitch, Google Business | API (y Zapier/Make) **sólo en Advanced** | **No alcanza** (20 por mes ≈ menos de 1 por día). Sirve para mirar números, no para publicar |
| **Later** (`later.com/pricing`) | **No hay plan gratis**: sólo prueba de 14 días (blogs dicen que existió uno chiquito; SIN VERIFICAR) | Starter US$ 18,75 por mes (anual): 1 conjunto de 8 perfiles, 30 posteos por perfil por mes | Instagram, Facebook, Threads, Pinterest, TikTok, LinkedIn, YouTube, Snapchat (no X ni Bluesky) | La página no menciona API ni Zapier | **Descartado** |
| **Publer** (ayuda oficial) | Sí: 3 cuentas (sin X), 10 posteos en cola por cuenta, 25 borradores, historial de 24 h; **sin API** | Professional desde US$ 5; Business desde US$ 10 (cada cuenta o miembro extra suma US$ 4 a 7; los blogs traen otros precios: mirar el sitio) | TikTok, YouTube, Threads, Bluesky, Telegram, Pinterest, Mastodon y más (SIN VERIFICAR la lista completa) | **API sólo en Business** (sube el archivo directo); además tiene "universal posting" por notificación | Plan gratis útil para **programar a mano** TikTok/YouTube con un agente; para API, Business US$ 10 |
| **Postiz** (`postiz.com/pricing`) | No hay gratis en la nube (prueba de 7 días). **Autoalojado: gratis**, pero pide un servidor prendido siempre | Nube Standard US$ 29 por mes (US$ 23 anual): 5 canales, posteos ilimitados, API incluida | 30 y pico redes, incluidas TikTok, YouTube, Threads, Bluesky, Telegram | Sí, API pública y MCP en todos los planes | Caro frente a Buffer/Publer; autoalojar rompe la regla "andar sin servidores propios". **Descartado** |
| **Mixpost** (`mixpost.app/pricing`) | **Lite gratis y de código abierto** (Facebook Pages, X, Mastodon; sin Instagram ni TikTok) | Pro US$ 299 pago único (1 dominio) | Pro: Facebook, Instagram, X, LinkedIn, YouTube, TikTok, Pinterest, Threads, Bluesky, Mastodon | API en Pro | Hay que alojarlo (PHP, MySQL, Redis). **Descartado** |
| **Typefully** | La página oficial no se pudo leer. Blogs: tiene gratis limitado | Entre US$ 12,50 y 29 según la fuente (SIN VERIFICAR) | X, LinkedIn y, según algunos, Threads y Bluesky | SIN VERIFICAR | **Descartado** (pensado para escribir hilos a mano) |
| **Fedica** | La página oficial no se pudo abrir (error 404) | SIN VERIFICAR | X, Threads, Bluesky, Instagram | SIN VERIFICAR | **Descartado** |
| **SocialBee** (`socialbee.com/pricing`) | No: sólo 14 días de prueba | Bootstrap US$ 29 (US$ 24 anual): 5 perfiles | Facebook, Instagram, Threads, LinkedIn, X, Pinterest, TikTok, YouTube, Google Business, Bluesky. **Telegram: no** | La página no habla de API; usa Zapier, Pabbly y Make | **Descartado** |
| **Repurpose.io** (`repurpose.io/pricing`) | **10 videos gratis, sin tarjeta**, y 14 días de prueba | Starter US$ 35 por mes (US$ 349 al año): 3 cuentas por red | Copia videos de Facebook/Instagram a TikTok y YouTube (la página nombra Instagram, TikTok y YouTube) | No es API: se configura por la web | Podría copiar nuestros reels sin tocar código, pero cuesta más que Buffer. **Plan C** |
| **Blotato** (`blotato.com/pricing`) | No: prueba de 7 días (sin API) | Starter US$ 29: 20 cuentas | 9 redes (TikTok, YouTube, Instagram, Facebook, X, Threads, Bluesky, LinkedIn, Pinterest) | Sí desde Starter. Dice que su app de TikTok pasó la auditoría | Caro para lo que se necesita |
| **Ayrshare** (`ayrshare.com/pricing`) | No (prueba de 28 días sólo en el plan Launch) | Premium US$ 149 por mes | 13 a 14 redes | Sí, es lo más "para programadores" | **Descartado** por precio |
| **Hootsuite** (`hootsuite.com/plans`) | No (14 días de prueba) | Standard US$ 99 por usuario por mes | Varias | Sin confirmar | **Descartado** por precio |
| **Make** (`make.com`) | Sí: **1.000 créditos por mes** (ayuda oficial) | Sin confirmar en la página | Telegram, YouTube, Bluesky con módulo propio; TikTok sin módulo de publicación | Es pegamento, no una red | No suma: el robot ya es el pegamento |
| **Zapier** (`zapier.com/pricing`) | Sí: **100 tareas por mes**, sólo Zaps de 2 pasos | Professional US$ 19,99 por mes (anual): 750 tareas | Muchas | Es pegamento | No suma |
| **n8n** | Autoalojado gratis (licencia "de uso sostenible"; pide un servidor). Nube de pago: entre €20 y 24 por mes según la fuente (blogs, SIN VERIFICAR) | — | Telegram, YouTube, Bluesky con módulo; Threads por HTTP | Es pegamento | No suma |
| **IFTTT** (`ifttt.com/plans`) | Sí: **2 applets**; sin webhooks | Pro US$ 2,99 por mes (US$ 35,88 anual), con webhooks | Limitado | Webhook sólo en Pro | No suma |
| **Meta Business Suite** (programador de Meta) | **Gratis**, para Facebook e Instagram | — | Facebook e Instagram | Es lo mismo que la API de Meta que ya usamos | Sólo sirve a mano: **hasta 75 días** de anticipación (nota de Social Media Examiner; la ayuda oficial de Meta no se pudo abrir; SIN VERIFICAR) |
| **Programación nativa** de TikTok Studio, YouTube Studio, LinkedIn y Threads | Gratis | — | Cada una de su red | **No tienen API**: sólo a mano o con un agente en el navegador | Ver sección 5 |

#### 3.1 ¿Alcanza el plan gratis para unas 6 piezas por día?

Cuentas con 6 piezas por día = 180 al mes por red.

| Plan gratis | Límite que manda | Cuántas piezas entran | ¿Alcanza para 6 por día? | Para qué sirve en el plan |
|---|---|---|---|---|
| **Buffer Free** | 3 canales; 10 en cola por canal (se libera al publicarse); 3.000 pedidos cada 30 días | Con 3 canales y 6 por día cada uno, son 540 posteos por mes: caben si cada posteo gasta 5 pedidos o menos (hay que medirlo; un posteo suele gastar 1 a 3, SIN VERIFICAR) | **Sí, si el robot las manda cerca de la hora** (no hacer cola de 10 días) | TikTok (a probar) + respaldo de YouTube o Threads |
| **Metricool Free** | 20 posteos por mes, total | 20 piezas por mes en una sola red = 1 pieza cada 1,5 días | **No** (cubre 3 días de 30) | Nada; sólo estadísticas |
| **Later** | No hay gratis | — | No | Nada |
| **Publer Free** | 10 en cola por cuenta, sin API | 10 programadas a la vez por red, cargadas a mano | Sí, **si alguien las carga a mano todos los días** | Opción para el agente a mano si no se quiere usar TikTok Studio |
| **APIs propias** (Telegram, Bluesky, Threads, YouTube) | Topes altos: 250 por día en Threads; 100 subidas por día en YouTube | Sin problema | **Sí, gratis** | Lo que conviene hacer primero |

Dos aclaraciones sobre lo que figuraba en el pedido: (a) **Metricool gratis: 20, no 50** por mes (su página de precios, hoy; la comparación "Metricool vs Buffer" del mismo sitio todavía dice 50); (b) **Later gratis: no existe como plan publicado**. Buffer coincide con lo informado: 3 canales y 10 en cola por canal, **más** API gratis.

---

### 4. Plan recomendado por etapas (de lo más fácil a lo más difícil)

Principio: **primero lo gratis, sin revisión y sin riesgo de cuenta.** Lo que cada etapa construye el robot (Claude) con su prueba; las cuentas y las claves las crean y las pegan Hernán y Andrés. Ninguna etapa recorta lo que ya sale en Facebook e Instagram.

| Etapa | Qué | Quién | Cuánto lleva | Costo |
|---|---|---|---|---|
| **0 · esta semana, lo que no depende de nadie más** | Terminar los perfiles que ya existen (Instagram: categoría, enlace, botón de WhatsApp, destacadas; TikTok: bio y logo; WhatsApp Business: saludo, ausencia, respuestas) con los textos de la sección 6. Comprobar que los nombres estén libres. Mirar si los enlaces de Facebook se ven tocables | Hernán y Andrés (con la lista de la sección 6) | 1 a 2 horas en total | 0 |
| **1 · semana 1** | Crear el canal de **Telegram** (@BotFather), la cuenta de **Bluesky** y el **canal de YouTube** con `radarbalcarce@gmail.com`. Después, Claude arma Telegram y Bluesky (apagados y simulando una semana, después "Sí") | Hernán y Andrés crean cuentas; Claude programa | 1 hora + 1,5 días de Claude | 0 |
| **2 · semana 1 a 2** | **El agente a mano**: TikTok, YouTube y el canal de WhatsApp con el paquete diario (sección 5). Aprender cuánto lleva y qué rinde | Un agente con Claude en el Chrome de la PC o una persona; el sistema deja el paquete | 15 a 25 min por día (estimación) | 0 |
| **3 · semana 2 a 3** | **YouTube por API** si la prueba de "no listado" sale bien; si no, Buffer o Publer. **Threads** (con depósito de videos y token que se renueva solo) | Claude + Hernán (autoriza una vez) | 1 día + 3 días | 0 |
| **4 · semana 3 a 4** | **TikTok por Buffer** en la prueba de 14 días: ver si Buffer deja TikTok en el plan gratis y si su API publica video a TikTok. Si sí, pasa a automático; si no, queda a mano | Hernán o Andrés abren la cuenta de Buffer con el mail del medio (el robot no crea cuentas) y pegan la clave en GitHub Secrets | 1 día | 0 a US$ 5 |
| **5 · mes 2** | **Newsletter** "Balcarce a las 7" (Brevo, 300 por día gratis) y **podcast** (feed + Spotify, Apple, YouTube Music). **X** si les parece, con tope de gasto. **Mensajes** (Messenger e Instagram) con la Ventanilla | Claude + trámites de Hernán y Andrés | Varios días | 0 a US$ 2 |
| **6 · mes 2 a 3** | Medir (alcance, seguidores, visitas con UTM) y decidir qué red se queda y cuál se apaga | Todos | — | — |

**No se hace en ninguna etapa**: publicar solos en grupos de Facebook o canales de WhatsApp, mandar campañas por WhatsApp, y manejar TikTok, X o WhatsApp con un navegador sin una persona al lado (ver el aviso de la sección 5).

---

### 5. El "agente a mano": cómo se publica lo que no se puede automatizar

**Para qué sirve**: TikTok (hasta que Buffer lo resuelva o si no lo resuelve), YouTube (hasta que se pruebe la API), el canal de WhatsApp y los grupos de Facebook. El sistema deja **todo armado**; quien publica sólo sube, pega y programa.

#### 5.1 Qué dejaría listo el sistema: el paquete diario

Hoy los mp4 de cada pieza quedan 3 días como archivo adjunto de GitHub ("Guardar las piezas para revisarlas" en `redes.yml`), solo para quien entra a GitHub. Lo que habría que **construir** (propuesta, no existe todavía; unos 1 a 2 días de Claude):

1. **Una carpeta por día** `paquete/AAAA-MM-DD/` con: los videos (`0900-efemeride.mp4`, `2100-repaso-noche.mp4`…), las placas en PNG, un `.txt` por red con el texto ya escrito en el tono de `CRITERIO-REDES.md` (TikTok, YouTube título y descripción, WhatsApp canal, grupos de Facebook), y un `LEEME.md` con el checklist de la hora y el enlace de cada pieza.
2. **Dónde queda para bajarlo**: lo más simple es un archivo `.zip` en el depósito **R2** (que ya se usa para el archivo de notas) con un enlace con vencimiento, y **el enlace va en el mail de las 21:15** (informe diario). Otra opción, más barata de armar: el mismo `.zip` como adjunto de GitHub, 7 días, bajándolo desde el panel del celular.
3. **Qué piezas no se pueden dejar para "mañana"**: los repasos, el clima y la farmacia se arman a su hora con las noticias del momento; no existen la noche anterior. Lo que sí está de antemano: "Un día como hoy", el feriado, la agenda, los teléfonos útiles y "Participá" (piezas fijas que salen siempre iguales o de contenido ya conocido; confirmar cuáles se arman con anticipación). Por eso hay **dos pasadas por día**: a la mañana (lo del día) y a la noche (repaso de las 21:00 y, si el sistema ya lo dejó, lo de mañana).

#### 5.2 La programación nativa de cada red (gratis, con la PC prendida)

Lo que se pudo confirmar y lo que no. **Las páginas oficiales de ayuda de TikTok, Meta y WhatsApp cargan con JavaScript y no se pudieron leer**: los datos de TikTok, Meta Business Suite y Threads salen de guías de terceros (algunas de la competencia, como Buffer) y están marcados.

| Red y herramienta | Con cuánta anticipación | Requisitos | Qué acepta | Notas |
|---|---|---|---|---|
| **TikTok Studio** (tiktok.com/tiktokstudio, escritorio) | **10 días** según la mayoría de las guías; **30 días** según la guía de Buffer (SIN VERIFICAR en la página oficial: se prueba en la cuenta) | Cuenta **Creator o Business**; con cuenta personal no deja | Videos. Fotos y carruseles: las guías no lo aclaran (SIN VERIFICAR) | Una vez programado no se puede editar: hay que borrar y volver a subir. Existe también la app TikTok Studio de celular (según Buffer; otras fuentes dicen que sólo escritorio) |
| **YouTube Studio** | Fecha y hora libres. Se sube como **privado** y pasa a público a la hora elegida | Canal | Videos y Shorts | Elegir bien la zona horaria. Ayuda oficial: *Schedule video publish time* (support.google.com/youtube/answer/1270709) |
| **Meta Business Suite** (Facebook e Instagram) | **Hasta 75 días** (Social Media Examiner; ayuda de Meta no legible, SIN VERIFICAR) | Página y cuenta profesional vinculadas | Posteos y reels; las historias, desde la app para celular (SIN VERIFICAR) | No hace falta: el robot ya publica solo en estas dos |
| **Threads** (app y web) | **Hasta 75 días** (guías de terceros, SIN VERIFICAR) | Cuenta | Posteos sueltos; no respuestas ni hilos | No hace falta si va por API |
| **LinkedIn** (página, escritorio) | De 10 minutos a 3 meses | Página de empresa | Texto, imagen, video; no encuestas ni varias fotos (Social Media Today, 21/03/2023 y guías 2026) | No la abriríamos |

#### 5.3 El paso a paso diario (con el paquete listo)

**Pasada de la mañana (hacia las 8:30, para TikTok, YouTube y WhatsApp):**

1. Bajar el `.zip` del día (enlace del mail de las 21:15 de ayer o del panel).
2. **TikTok Studio**: subir `0900-efemeride.mp4` (y lo que corresponda), pegar el texto del `.txt`, marcar "contenido generado con IA", programar la hora.
3. **YouTube Studio**: subir el mismo video como Short, título (menos de 100 caracteres), descripción del `.txt`, elegir "programar".
4. **Canal de WhatsApp** (desde el celular): publicar el texto de la farmacia o el titular del día. **Esto no se programa**: es en el momento.
5. Si corresponde, pegar el texto del día en los **grupos de Facebook** permitidos, a mano.

**Pasada de la noche (hacia las 21:30):** subir el repaso de las 21:00 a YouTube y TikTok; si el sistema ya dejó las piezas de mañana, programarlas. Marcar en el `LEEME.md` lo que quedó hecho.

**Cuánto lleva (estimación nuestra, SIN MEDIR; hay que cronometrar la primera semana):**

| Tarea | Por pieza | Piezas por día | Por día |
|---|---|---|---|
| TikTok (subir + texto + programar) | 2 a 3 min | 2 | 5 a 6 min |
| YouTube (subir + texto + programar) | 2 a 3 min | 2 | 5 a 6 min |
| Canal de WhatsApp (desde el celular) | 0,5 a 1 min | 1 a 3 | 1 a 3 min |
| Grupos de Facebook | 1 min por grupo | 1 a 3 | 1 a 3 min |
| Bajar el paquete y revisar | — | — | 3 min |
| **Total** | | | **15 a 25 min** (una persona con checklist lleva lo mismo; un agente agrega el tiempo de equivocarse de botón) |

#### 5.4 Quién lo hace y con qué cuidado

- **Opción A, una persona con el checklist** (la más segura): 15 a 25 minutos por día desde la PC y el celular. Puede ser Hernán, Andrés o alguien de confianza.
- **Opción B, Claude en el Chrome de la PC con una persona sentada**: el agente completa los campos y la persona toca "Programar" o "Publicar". Es "a mano con ayuda", no automatización.
- **Opción C, Claude solo con la PC prendida y sin nadie**: se puede, pero **no se recomienda para TikTok ni para WhatsApp**. Los términos de TikTok prohíben "scripts automatizados" que interactúen con el servicio, y los de WhatsApp el acceso automatizado (leídos el 15/10/2026; `AUTOMATIZAR-REDES-ALTERNATIVAS.md` § 5): el riesgo es perder la cuenta o el número. Además la PC tiene que estar prendida, sin suspenderse y con la sesión abierta; si no está, la pieza no sale y nadie se entera. Para YouTube, el navegador no hace falta: hay API.
- **Si no hay nadie para hacerlo un día**: no pasa nada grave. El sistema sigue publicando en Facebook, Instagram, Telegram y Bluesky; las piezas de TikTok, YouTube y WhatsApp de ese día quedan en el paquete y se saltean (no son noticias que caduquen, salvo el repaso).

---

### 6. Los perfiles, listos para pegar

#### 6.1 Lo ya decidido (se respeta tal cual)

- **El texto único** (decisión de Andrés, 15/10; `PERFILES.md` y `docs/DECISIONES.md`): *"Todo lo que pasa en Balcarce y la región, en un solo lugar. radarbalcarce.com"*. **77 caracteres** contados hoy (el documento decía 78). Sin "agenda", sin "noticias de acá", sin "fuente a la vista". Sin emojis ni promesas. Sin nombrar farmacias (decisión del 26/09).
- **El sitio es el único enlace**: `radarbalcarce.com` (nunca `.com.ar`). Nada de enlaces a notas sueltas en perfiles.
- **Nombre y usuario**: `Radar Balcarce` y `@radarbalcarce`. En Instagram y TikTok y Threads el nombre que se ve es `Radar Balcarce · Noticias`.
- **El logo es el mismo en todas**: `reels/salida/avatar.png` (1080 × 1080, azul petróleo `#1D4F63`, "RADAR" en crema, "BALCARCE" y los anillos en el rojo de la marca `#C7381C`, punto ámbar `#E8A33C`). Se muestra redondo: no poner nada en las esquinas.
- **Colores y letras** (`MEDIA-KIT.md`): tinta `#14161A`, crema `#F4F1EA`, papel `#FAF8F3`; **Source Serif 4** para títulos e **Inter** para texto (archivos en `reels/marca/fuentes/`).
- **WhatsApp del medio**: 2266 51-1612. Mails: `contacto@` (lectores y comercios), `redaccion@` (datos, fotos y notas), `publicidad@radarbalcarce.com`; reenvían a `radarbalcarce@gmail.com`.
- **La línea de transparencia** ya usada en Facebook: *"Escrito con IA y verificado contra las fuentes; lo sensible lo revisa una persona."* (82 caracteres; entra donde hay lugar, nunca en las bios de menos de 150).

#### 6.2 Los textos largos (los usan varias redes)

**Texto mediano, hasta 255 caracteres** (Telegram, canal de WhatsApp, Bluesky): 199 caracteres.

```
Todo lo que pasa en Balcarce y la región, en un solo lugar. Noticias, clima y datos del día a día. Escrito con IA y verificado contra las fuentes; lo sensible lo revisa una persona. radarbalcarce.com
```

**Texto largo** (YouTube, LinkedIn, Facebook): es el de Facebook ya aprobado en `PERFILES.md`:

```
Radar Balcarce reúne en un solo lugar todo lo que pasa en Balcarce y la región:
noticias, clima y los datos del día a día. Cada nota dice quién la
escribió y de dónde sale la información.

Las notas se escriben con inteligencia artificial y se verifican contra las
fuentes; lo sensible lo revisa una persona antes de salir. Si ves un error,
escribinos y lo corregimos.

¿Viste algo que tendría que ser noticia? Mandanos la foto o el dato por
WhatsApp al 2266 51-1612.

Todas las notas y el clima, en radarbalcarce.com
```

**Hashtags base** (propuesta; el robot usa hasta 3 por posteo, `#Balcarce` primero si la nota es de acá, y Instagram anunció un tope de 5): `#Balcarce`, `#RadarBalcarce`, `#UnDíaComoHoy` (sólo la efeméride). Para un perfil no se necesitan hashtags en la bio.

#### 6.3 Red por red

Leyenda de límites: los de **texto** se cuentan en caracteres; los de **imagen**, en píxeles. Todo lo que dice SIN VERIFICAR no pudo leerse en una página oficial hoy o necesita entrar a la cuenta para ver el campo. **Antes de crear cualquier cuenta: buscar que el nombre y el usuario estén libres.**

##### Facebook (página "Radar Balcarce"): ya existe

| Campo | Qué poner |
|---|---|
| Nombre / usuario | `Radar Balcarce` / `radarbalcarce` (el más parecido que Facebook permita) |
| Categoría | La más cercana a "Sitio web de noticias y medios de comunicación" |
| Presentación | La bio única (límite de la información breve: 101) y, debajo, el texto largo de arriba |
| Contacto | Sitio `https://radarbalcarce.com`; ubicación "Balcarce, Buenos Aires"; mail `contacto@radarbalcarce.com` |
| Horario | Sin local de atención: no cargar horario de atención de local (si Facebook lo pide, "siempre abierto") |
| Botón de acción | "Enviar mensaje de WhatsApp" al 2266 51-1612 (o "Más información" hacia el sitio) |
| Imágenes | Perfil: `avatar.png` 1080 × 1080 (se ve a unos 176 px en la compu y 196 px en el celular; fuente de una guía de 2026, SIN VERIFICAR). Portada: `reels/salida/portada-facebook.png` 1640 × 924 (se ve a 820 × 312 en la compu y 640 × 360 en el celular; `FORMATOS.md`) |
| Mensajes | Saludo y ausencia, abajo (6.4) |
| Estado | Hecho 15/10. Falta el botón y mirar el cuidado de los enlaces |

##### Instagram (`@radarbalcarce`): ya existe

| Campo | Qué poner |
|---|---|
| Nombre / usuario | `Radar Balcarce · Noticias` / `@radarbalcarce` (no se toca) |
| Bio (150) | La bio única (77) |
| Categoría | "Sitio web de noticias y medios de comunicación" (hoy figura "Blog personal") |
| Contacto | Enlace `https://radarbalcarce.com` (sólo desde el celular); mail `contacto@radarbalcarce.com`; botón de contacto WhatsApp 2266 51-1612 |
| Imagen | Perfil: `avatar.png`, se muestra redondo. No tiene portada |
| Destacadas (nombre de hasta 15 letras) | **Farmacia** · **Teléfonos** · **Agenda** · **Clima** · **Participá**. Portada de cada una: círculo con un ícono simple, sin texto, 1080 × 1920 con el ícono en el centro (tamaño SIN VERIFICAR en Meta) |
| Respuestas | Respuestas guardadas: usar las de 6.4 (la función existe en cuentas profesionales; SIN VERIFICAR el nombre exacto del menú) |
| Estado | Hecho el 15/10: bio y nombre. Falta (según `PERFILES.md`): categoría, enlace, botón, destacadas |

##### Threads (`@radarbalcarce`): ya existe

| Campo | Qué poner |
|---|---|
| Nombre / usuario | `Radar Balcarce · Noticias` (viene de Instagram; Threads limita el nombre a 30 y la bio a 150, guía de 2026, SIN VERIFICAR) / `@radarbalcarce` |
| Bio | La bio única |
| Enlace | `https://radarbalcarce.com` |
| Imagen | La de Instagram (320 × 320 recomendada; se recorta redonda) |
| Estado | Hecho 15/10 |

##### X (`@RadarBalcarce`): ya existe

| Campo | Qué poner |
|---|---|
| Nombre / usuario | `Radar Balcarce` (hasta 50) / `@RadarBalcarce` (hasta 15; son 13) |
| Bio (160) | La bio única; sitio en el campo "sitio web": `radarbalcarce.com` |
| Ubicación (30) | Balcarce, Buenos Aires |
| Imágenes | Perfil: `avatar.png` (400 × 400 recomendada, redonda). Cabecera: 1500 × 500 (3:1) **a diseñar** con el mismo azul petróleo; límites de imagen SIN VERIFICAR en página oficial |
| Cuenta automatizada | Cuando el robot publique, marcarla como "automatizada" en la configuración de X (SIN VERIFICAR el texto actual) |
| Estado | Hecho 15/10 (texto y logo). Falta la cabecera |

##### TikTok (`@radarbalcarce`): ya existe

| Campo | Qué poner |
|---|---|
| Nombre / usuario | `Radar Balcarce · Noticias` (hasta 30) / `@radarbalcarce` (hasta 24; letras, números, guion bajo y punto) |
| Bio | La bio única entra (el límite es 80: son 77). Una guía dice que TikTok lo subió a 160, pero conviene quedarse en 80 |
| Enlace | Campo "Sitio web" `radarbalcarce.com` (los enlaces dentro del texto no se tocan; el campo puede pedir cuenta Business) |
| Tipo de cuenta | **Business o Creator** (para poder programar desde TikTok Studio) |
| Imagen | `avatar.png` (mínimo 200 × 200, SIN VERIFICAR). Sin portada |
| Estado | Se cargó el 15/10 pero TikTok no mostraba bio ni logo: **revisar** entrando a la cuenta |

##### YouTube: no tiene canal (crear con `radarbalcarce@gmail.com`)

| Campo | Qué poner |
|---|---|
| Nombre / identificador | `Radar Balcarce` / `@radarbalcarce` (se puede cambiar 2 veces cada 14 días) |
| Descripción (1.000) | La bio única como primera línea y, debajo, el texto largo de arriba (≈ 560 caracteres). Entra |
| Enlaces (hasta 14; el primero se ve cerca de "Suscribirse") | `radarbalcarce.com` |
| Contacto | Mail `contacto@radarbalcarce.com` en "Información de contacto" |
| País | Argentina |
| Imágenes | Perfil: `avatar.png` (800 × 800 recomendada; la página oficial no da el tamaño, SIN VERIFICAR). Banner: **2560 × 1440** (mínimo 2048 × 1152; parte segura 1235 × 338 al mínimo, 1546 × 423 al máximo; hasta 6 MB; guías de terceros, SIN VERIFICAR) **a diseñar** |
| Categoría | "Noticias y política" (la lista de YouTube; SIN VERIFICAR el nombre exacto) |
| Después | Activar "No es contenido para niños" y marcar los videos con voz sintética (`containsSyntheticMedia`) cuando lo haga el robot |

##### Telegram (canal): no existe

| Campo | Qué poner |
|---|---|
| Nombre (hasta 128) | `Radar Balcarce` |
| Usuario del canal (5 a 32) | `@radarbalcarce` → `t.me/radarbalcarce` (si está ocupado: `@radar_balcarce`) |
| Descripción (255) | El texto mediano de 6.2 (199 caracteres) |
| Imagen | `avatar.png` (cuadrada, se recorta redonda; el tamaño mínimo no se encontró, SIN VERIFICAR) |
| Bot | Crearlo con @BotFather (por ejemplo `@radarbalcarce_bot`) y agregarlo al canal como administrador con permiso de publicar |
| Historias | No hay para canales por bot (sólo con cuenta Premium y "boosts"): no se usa |

##### Bluesky: no existe

| Campo | Qué poner |
|---|---|
| Nombre (64) | `Radar Balcarce` |
| Usuario | `@radarbalcarce.bsky.social`; después, si quieren sello propio, `@radarbalcarce.com` (se verifica agregando un registro en Cloudflare, lo hace Claude) |
| Bio (256) | El texto mediano de 6.2 (199 caracteres) |
| Imágenes | Perfil: `avatar.png` (400 × 400 recomendada). Banner 1500 × 500 (3:1), hasta 1 MB, **a diseñar**. Son recomendaciones de la comunidad, no medidas oficiales |
| Contraseña | Crear una "contraseña de aplicación" (no la de la cuenta) para el robot |

##### WhatsApp Business app (el número 2266 51-1612): por confirmar

Hoy no está escrito si el número usa la app común o la Business. Pasar a la Business **no cambia el número** (SIN VERIFICAR el procedimiento para conservar los chats). Si en el futuro se usa la API para contestar con un programa, ese número tiene que salir del WhatsApp común: decidirlo aparte (`docs/auditoria-2-0/06`, pregunta 4).

| Campo | Qué poner |
|---|---|
| Nombre del negocio | `Radar Balcarce` |
| Categoría | La de "Noticias y medios" o "Medios de comunicación" (el nombre exacto, SIN VERIFICAR) |
| Descripción | `Medio digital de Balcarce. Noticias, clima y datos del día a día. Mandanos tu foto o tu dato por acá. radarbalcarce.com` (119 caracteres; el límite de la app no se pudo leer en una página oficial, SIN VERIFICAR) |
| Dirección | No cargar una dirección de local: el medio no atiende en persona. Poner sólo "Balcarce, Buenos Aires" si el campo lo permite |
| Sitio web / mail | `https://radarbalcarce.com` / `contacto@radarbalcarce.com` |
| Horario de atención | **A decidir por ustedes**. Propuesta: todos los días de 8:00 a 22:00 (es la franja en que sale el robot). Si se carga, el mensaje de ausencia se puede atar a este horario |
| Foto del perfil | `avatar.png` (cuadrada; se recorta redonda) |
| Catálogo | No hace falta |
| Etiquetas | `Dato nuevo`, `Foto o video`, `Corrección`, `Publicidad`, `Reclamo`, `Respondido` |

##### Canal de WhatsApp: por crear (a mano, con el teléfono)

| Campo | Qué poner |
|---|---|
| Nombre | `Radar Balcarce` (el límite de caracteres no se pudo leer, SIN VERIFICAR; es corto, entra) |
| Descripción | El texto mediano de 6.2 (199 caracteres; el límite no se pudo leer, SIN VERIFICAR) |
| Imagen | `avatar.png` (cuadrada, se recorta redonda) |
| Administradores | El canal admite hasta 16 administradores además del dueño (ayuda oficial de WhatsApp, vista en una búsqueda); las invitaciones se mandan desde el teléfono del dueño y **muestran su número** a quien se invita, así que conviene que el dueño sea el número del medio |
| Qué publicar | Texto, foto, video, encuesta y enlaces (a mano, ver la sección 5). Tope de formato: SIN VERIFICAR |
| Enlace | Cuando exista, ponerlo en el pie de la web, en la bio de Instagram (con el sitio) y en los destacados |

##### LinkedIn (página): no se recomienda abrir

Sólo si algún día hace falta: nombre `Radar Balcarce`; URL `linkedin.com/company/radarbalcarce`; eslogan (hasta 120, SIN VERIFICAR) la bio única (77); "Acerca de" el texto largo; logo 400 × 400 (mínimo 268, PNG o JPEG, hasta 3 MB, ayuda oficial de LinkedIn); portada 4200 × 700 (ayuda oficial de LinkedIn; los 1128 × 191 de las guías viejas también andan).

##### Google Business Profile, Pinterest, Mastodon, Reddit, Snapchat, Twitch/Kick

No se crean. **Si algún día se crea alguna** para reservar el nombre, que sea con el mismo `Radar Balcarce` / `@radarbalcarce` y la misma bio.

#### 6.4 Mensajes de bienvenida, ausencia y respuestas rápidas

Tono: el del medio (`CRITERIO-REDES.md` § 2), un poco de voseo como en la presentación de Facebook ("escribinos", "mandanos"), sin emojis y sin prometer horarios. Siempre dicen que el mensaje es automático y que lo lee una persona.

**Saludo** (WhatsApp Business: se manda cuando alguien escribe por primera vez o después de 14 días sin hablar; Messenger: saludo de la página) - 218 caracteres:

```
Hola, gracias por escribirle a Radar Balcarce. Este es un mensaje automático. Si querés mandarnos una foto, un dato o un reclamo, escribilo acá: lo lee una persona del equipo. Las noticias del día, en radarbalcarce.com
```

**Mensaje de ausencia** (fuera de horario o cuando no se atiende) - 219 caracteres:

```
Hola, gracias por escribir a Radar Balcarce. Ahora no estamos atendiendo; te respondemos apenas podamos. Si es una noticia o un dato, dejanos acá la foto o el texto y el lugar. Las noticias del día, en radarbalcarce.com
```

**Respuestas rápidas** (WhatsApp Business: se invocan con `/`):

| Atajo | Texto |
|---|---|
| `/dato` | Gracias por avisarnos. ¿Nos contás qué pasó, dónde y a qué hora? Si tenés una foto o un video, mandalos. Si son tuyos, decinos si los podemos publicar y con qué nombre. |
| `/correccion` | Gracias por avisarnos del error. Decinos en qué nota está (el título o el enlace) y qué dato cambiarías; lo revisamos y, si corresponde, lo corregimos. |
| `/ia` | Las notas las escribe una inteligencia artificial y se verifican contra las fuentes. Lo sensible lo revisa una persona antes de salir. |
| `/publicidad` | Para propuestas comerciales escribinos a publicidad@radarbalcarce.com. |
| `/gracias` | Gracias por escribirnos. Seguimos con las noticias de Balcarce en radarbalcarce.com. |

**Instagram y Facebook** (bandeja de mensajes): usar el mismo saludo y la misma ausencia. Meta pide siempre dar un camino para hablar con una persona (por eso el texto dice que "lo lee una persona del equipo").

#### 6.5 Qué verificar antes de abrir cada cuenta

| Qué | Cómo |
|---|---|
| Que `radarbalcarce` esté libre | Buscarlo en YouTube, Telegram, Bluesky, LinkedIn. En Telegram, un nombre de usuario ocupado se reemplaza por `radar_balcarce` |
| Que el nombre del canal de WhatsApp esté libre | Se ve al crearlo |
| Que el logo se vea bien recortado en redondo | Mirarlo en el celular y en la compu en cada red (el de Facebook se ve distinto en cada una) |
| Que ningún perfil lleve enlaces a notas sueltas | Sólo `radarbalcarce.com` |
| Que el 2266 51-1612 sea el mismo en todos los botones | El de Instagram, Facebook y WhatsApp Business |
| Que cada perfil nuevo diga lo mismo | Copiar de esta sección, no de otro lado (`PERFILES.md` sigue siendo el único lugar del texto de Instagram y Facebook; los textos de las redes nuevas conviene sumarlos ahí cuando se aprueben) |

---

### 7. Lo que no pude confirmar

- **TikTok**: cuántos días de anticipación deja la programación nativa (10 o 30), si la app de celular programa, y si acepta fotos y carruseles. La ayuda oficial no se pudo leer. Se resuelve entrando a TikTok Studio con la cuenta.
- **Buffer**: si el plan gratis incluye TikTok ("only available on our new plans", dice su ayuda) y si su API publica video a TikTok (su hoja de ruta de febrero lo lista como "Exploring"). Se resuelve en la prueba de 14 días.
- **Meta Business Suite**: los 75 días y si programa historias (ayuda de Meta no legible).
- **Threads**: los 75 días y si la web programa (guías de terceros).
- **WhatsApp**: límites de caracteres del nombre y la descripción de la cuenta Business y del canal; si el canal admite todos los tipos de mensaje que dicen los blogs; si el número 2266 51-1612 ya es Business.
- **Facebook**: si Radar Balcarce es "publicador" para la prueba de enlaces de Meta (sigue abierto desde `FORMATOS-POR-RED.md`).
- **YouTube**: si un proyecto sin verificar sube público o privado; los tamaños de perfil y banner (la ayuda oficial no los da).
- **Brevo**: la página de precios no mostró el detalle del plan gratis hoy (300 por día sale de varias páginas de Brevo).
- **Typefully, Fedica**: las páginas oficiales no se pudieron leer.
- **Apple News en Argentina**, **Reddit comercial** y **la API de grupos de Facebook**: sólo hay fuentes de terceros.
- **Tamaños y límites** de X, TikTok, Bluesky y Telegram para los perfiles: salen de guías de terceros.
- **Qué cuentas existen hoy** (por confirmar entrando): Telegram, Bluesky, canal de WhatsApp y Business app; el estado real de TikTok.
- **El tiempo del agente a mano** es una estimación: medirlo la primera semana.
- **El rendimiento en Balcarce** de TikTok, YouTube, Telegram y Bluesky: no hay estudio para pueblos argentinos; sólo nuestras visitas (Facebook 74 %). Informe de Noticias Digitales 2026 (Argentina): el resumen dice que la oferta de Meta domina la búsqueda de información; no pude leer la tabla por plataforma.

### 8. Fuentes (leídas el 17/10/2026, salvo que se indique otra fecha)

**Oficiales o del propio servicio**
- Buffer, precios (Free, Essentials, Team; "última actualización noviembre 2025"): https://buffer.com/pricing
- Buffer, qué es la API (planes, límites, video por enlace público): https://support.buffer.com/en-us/articles/what-is-buffers-api-GtIYIQilz5
- Buffer, usar TikTok (límites, "Notify Me", "sólo en planes nuevos"): https://support.buffer.com/en-us/articles/using-tiktok-with-buffer-oGEroY9Of2
- Buffer, hoja de ruta de la API (actualizada 24/02/2026; TikTok "Exploring"): https://developers.buffer.com/roadmap.html
- Metricool, precios (Free: 1 marca, 20 posteos por mes; API en Advanced): https://metricool.com/pricing/
- Later, precios (sin plan gratis; Starter US$ 18,75 anual): https://later.com/pricing/
- Publer, planes y precios (ayuda oficial): https://publer.com/help/en/article/what-are-publers-plans-and-pricing-15h4yqh/
- Postiz, precios: https://postiz.com/pricing
- Mixpost, precios: https://mixpost.app/pricing
- SocialBee, precios: https://socialbee.com/pricing/
- Repurpose.io, precios: https://repurpose.io/pricing
- Blotato, precios: https://www.blotato.com/pricing
- Ayrshare, precios: https://www.ayrshare.com/pricing/
- Hootsuite, planes: https://www.hootsuite.com/plans
- Zapier, precios: https://zapier.com/pricing · IFTTT, planes: https://ifttt.com/plans · Make: https://www.make.com/en/pricing
- X, precios de la API (pago por uso): https://docs.x.com/x-api/getting-started/pricing
- Google, ayuda de Google Noticias ("no necesitás aplicar"): https://support.google.com/news/producer/answer/1611353
- Google, elegibilidad de Business Profile: https://support.google.com/business/answer/13763036
- YouTube, programar la publicación: https://support.google.com/youtube/answer/1270709 · personalizar el canal: https://support.google.com/youtube/answer/2972003
- Spotify for Creators, el RSS: https://support.spotify.com/us/creators/article/your-rss-feed/
- MailerLite, precios (Free: 250 suscriptores y 2.500 mails por mes): https://www.mailerlite.com/pricing
- Buttondown, precios: https://buttondown.com/pricing · Brevo, precios: https://www.brevo.com/pricing/
- LinkedIn, medidas de imágenes de páginas: https://www.linkedin.com/help/linkedin/answer/70781
- WhatsApp, ayuda de canales: https://faq.whatsapp.com/794229125227200 y https://faq.whatsapp.com/549900560675125 (los textos no cargan: sólo se vieron en resultados de búsqueda); mensajes de ausencia: https://faq.whatsapp.com/2565868990219715
- Telegram, canales con historias y "boosts": https://www.telegram.org/blog/channel-stories/fa?setln=en

**De terceros (leer con cuidado; muchos venden una alternativa)**
- Social Media Examiner, Business Suite hasta 75 días: https://www.socialmediaexaminer.com/10-free-tools-to-easily-manage-instagram-and-facebook/
- Buffer, programar TikTok (30 días, cuenta Business o Creator): https://buffer.com/resources/how-to-schedule-tiktok-posts/
- Threads, programar hasta 75 días: https://adaptlypost.com/en/blog/how-to-schedule-threads-posts
- LinkedIn, programación de páginas (21/03/2023): https://www.socialmediatoday.com/news/LinkedIn-Adds-Native-Post-Scheduling-for-Company-Pages/645635/
- Bajada de la API de grupos de Facebook (abril 2024): https://developers.facebook.com/community/threads/2076398286093257/
- Costo de la API de Reddit: https://www.techloy.com/reddit-api-pricing-in-2026-complete-guide-for-developers-and-businesses/
- Límites de texto de X, Threads, Bluesky, Telegram y TikTok (guías de terceros): https://www.unilink.us/blog/twitter-x-character-limit-2026, https://www.unilink.us/blog/threads-character-limit-2026, https://opentweet.io/answers/bluesky-limits, https://replug.io/blog/tiktok-bio-character-limit
- Apple News y su disponibilidad: https://support.apple.com/en-en/HT5085

**Del propio proyecto**: `CLAUDE.md`, `CRITERIO-REDES.md`, `PERFILES.md`, `MEDIA-KIT.md`, `FORMATOS.md`, `PENDIENTES.md`, `IDEAS.md`, `docs/DECISIONES.md`, `docs/07-REDES.md`, `docs/08-INFRAESTRUCTURA.md`, `docs/historico/auditoria-2-0/06-PROMPTS-Y-AGENTES.md` § 7, `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md (anexos)`, `docs/redes/FORMATOS-POR-RED.md`, `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md (anexos)`, `docs/historico/redes/AUDIO-EN-LA-PAGINA-Y-PODCAST-GENERAL.md`, `docs/seo/AUDITORIA-SEO-LLM.md`, `.github/workflows/redes.yml`, `web/data/estadisticas.json` (datos del 15/10).

## Anexo B. El plan de los reels en otras redes, red por red, con los trámites

*Antes: `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md (anexos)`.*

*15/10/2026. Es un **plan**, no código en producción: no se creó ninguna cuenta, no se tocó ninguna clave y no se publicó nada. Lo único
que se escribió en el repositorio es el esqueleto `redes/destinos.mjs` (con su prueba, `pruebas/destinos.test.mjs`), que arranca
**apagado y simulando**. *(17/10/2026: ese esqueleto se sacó del repositorio porque nadie lo usaba — pedido de los dueños: "que no
quede nada que no se use". Queda en el historial de git: se busca el commit que borró `redes/destinos.mjs` y se lo recupera tal cual el
día que se retome este plan.)* Todo lo que dice "según la documentación oficial" se leyó el 15/10/2026; lo que no se pudo confirmar en una
fuente oficial está marcado con **(sin confirmar)** y figura en el § 9.*

Hoy los reels salen por la API de Meta a **Facebook** (página) e **Instagram** (`@radarbalcarce`). La pregunta es si el **mismo video**
(el que ya se arma para esas dos, sin gastar un audio más) puede ir también a TikTok, YouTube Shorts, Threads, X, Bluesky, Telegram,
WhatsApp, Pinterest y LinkedIn, y a qué costo en trámites, plata y riesgo.

### 0. En una pantalla

| Red | ¿API oficial para subir video? | ¿Se puede **sin ningún trámite humano**? | Trámite una sola vez | Costo | Encaja con un medio local | Esfuerzo (Claude) | Veredicto |
|---|---|---|---|---|---|---|---|
| **Telegram (canal)** | Sí, Bot API (`sendVideo`) | Casi: sólo crear el bot y el canal | 10 minutos | 0 | Medio (sirve para lo útil: farmacia, clima) | 0,5 día | **Hacerlo primero** |
| **Bluesky** | Sí (AT Protocol) | Casi: crear la cuenta y una "contraseña de aplicación" | 15 minutos | 0 | Bajo hoy (poca gente de Argentina), costo cero | 1 día | **Hacerlo** |
| **YouTube Shorts** | Sí, YouTube Data API v3 (`videos.insert`) | No: autorizar una vez con la cuenta | 30 a 45 minutos (Google Cloud) | 0 | **Alto** (la gente busca "Balcarce"; el video queda meses) | 1 día | **Hacerlo** (el de más alcance) |
| **Threads** | Sí, Threads API (`threads_publish`) | No: invitación de "tester" y token | 30 minutos | 0 (+ un depósito de videos, dentro del gratis) | Medio (es la misma gente de Instagram) | 1,5 días | Después de las anteriores |
| **X** | Sí, X API v2 (pago por uso) | No: crear la app y cargar crédito con tarjeta | 20 minutos + tarjeta | **~US$ 2 por mes** si el posteo **no lleva enlace** (US$ 30 si lo lleva) | Bajo a medio | 1,5 días | Opcional, con tope de gasto |
| **TikTok** | Sí, Content Posting API, **pero** sin auditoría todo queda **privado** | **No** | Aplicar a una auditoría que tarda semanas y puede ser rechazada | 0 | Alto en alcance, pero la red es difícil de automatizar | 2 días + espera | **Pedir la auditoría ya; mientras tanto, a mano** |
| **WhatsApp (canal)** | **No hay API oficial** | No | Crear el canal (5 minutos) | 0 a mano; vía terceros, riesgo de bloqueo | **El más cercano a la gente de acá** | — | **A mano** (20 segundos por repaso); no automatizar |
| **Pinterest** | Sí (v5), pero sin "acceso Standard" los pines son **sólo visibles para vos** | No | Revisión con video de demostración | 0 | Muy bajo | 1 día | **No** |
| **LinkedIn** | Sí (Videos API + Posts API), con **producto restringido** (Community Management) y revisión | No | Revisión de la aplicación con video; pide empresa | 0 | Muy bajo | 2 días + espera | **No** por ahora |

Una advertencia de realismo, con datos propios (`web/data/estadisticas.json`): hoy Facebook trae casi todas las visitas (referente
`facebook.com`), la página tiene 53 seguidores y Instagram 7. **Sumar redes no va a cambiar el tamaño de la audiencia de un día para el
otro**: sirve para que el medio exista donde la gente lo busca (YouTube y Google, Telegram, X) a **costo casi cero**. Por eso el orden
elegido pone primero lo gratis, sin revisión y sin riesgo de cuenta.

### 1. Lo que ya tenemos (y no hay que rehacer)

- **Un solo video por pieza**, armado una vez por `reels/plan.mjs` / `reels/reel.mjs` para Instagram y Facebook: **1080 × 1920 (9:16)**,
  H.264 (`libx264`, `yuv420p`, 30 cuadros por segundo), audio AAC 160 kbps a 44,1 kHz, `+faststart`, **subtítulos quemados en la imagen**,
  voz de Gemini ya normalizada de volumen. Dura de 6 a 58 segundos (el tope lo fija `PODCAST_VOZ.segundosMaximoHistoria`, 58). Pesa de
  **0,4 a 1,5 MB**. Cumple los límites de **todas** las redes de este plan, sin recodificar.
- **El cupo de voz no se toca**: repartir un video ya armado no pide ningún audio (10 por día, un día normal usa 7 a 9).
- **El libro** (`web/data/redes.json`) y su regla de no repetir; **los problemas** (`libro.problemas`); **el interruptor** `REDES_ACTIVAS`
  (`estaActivo`, `redes/elegir.mjs`); **el candado** `concurrency: redes`; **la simulación**; **el aviso de la voz** («Voz generada con
  inteligencia artificial.», regla 114).
- **Qué piezas son reels** hoy (`redes/piezas.mjs`, `redes/horarios.mjs`): "Un día como hoy" 9:00, los tres repasos 10:00 / 15:00 / 21:00,
  Participá o la agenda a las 12:00 de lunes a viernes, los teléfonos útiles los sábados 17:00 y el feriado 8:00. El clima de la mañana y
  de la noche y la farmacia son **historia** en Instagram (y reel sólo en Facebook).
- **Dónde está el video en la corrida**: sólo en la máquina de GitHub mientras corre "Redes" (`reels/salida/*.mp4`); después queda 3 días
  como artefacto. Por eso la primera versión **reparte en la misma corrida**, justo después de Instagram y Facebook (§ 7).
- **Lo que las cuentas ya tienen** (`PERFILES.md`): X `@RadarBalcarce` y Threads `@radarbalcarce` creadas el 15/10; TikTok `@radarbalcarce`
  creada (la bio y el logo no se veían: revisar); **YouTube todavía no tiene canal**; Telegram y Bluesky, sin cuenta.

### 2. Red por red

Para cada una: qué dice la documentación oficial, qué hace falta, límites, costo, riesgos y si encaja. Los enlaces están en el § 10.

#### 2.1 Telegram (canal) — el más fácil

- **API:** Bot API oficial. `sendVideo` (subida directa del archivo, `multipart/form-data`). Gratis, sin revisión, sin auditoría.
- **Requisitos:** un bot (se crea hablando con **@BotFather**), un **canal** (público, con dirección `t.me/…`), y el bot agregado al canal como
  **administrador con permiso de publicar**.
- **Límites:** los bots suben archivos de hasta **50 MB** (nuestros videos pesan 1 o 2); texto del video (`caption`) de hasta **1.024
  caracteres**; hasta 20 mensajes por minuto en un grupo y unos 30 por segundo en total, muy lejos de lo nuestro. No hay tope diario de
  publicaciones que importe a este volumen.
- **Autenticación:** el token del bot **viaja en la dirección** (`https://api.telegram.org/bot<TOKEN>/sendVideo`). Choca con la regla "el
  token nunca en la dirección" de `redes/meta.mjs`: hay que limpiar cualquier error que lo repita (igual que `sinToken`).
- **Notificaciones:** `disable_notification` deja un mensaje en silencio. Con 7 a 9 videos por día conviene que **suenen sólo el repaso
  de la mañana, la farmacia y el repaso de la noche**; el resto, en silencio.
- **Riesgos:** casi ninguno. Un bot que publica en su propio canal no es "spam". Si se pierde el token, se regenera con @BotFather.
- **Encaje:** medio. En un pueblo, Telegram se usa poco, pero el canal sirve para quien quiera la farmacia de turno y el clima sin abrir
  Instagram, y es lo único "de mensajería" que se puede automatizar (WhatsApp no).
- **Esfuerzo:** medio día. Es el mejor lugar para **probar todo el circuito nuevo** (simulación, libro, problemas).

#### 2.2 Bluesky

- **API:** AT Protocol, abierta. Se entra con **usuario + contraseña de aplicación** (se crea en Configuración → Contraseñas de aplicación;
  se puede revocar sin cambiar la contraseña real). Para video: pedir una credencial de servicio, subir el archivo al servicio de video,
  esperar a que lo procese y crear el posteo con el video incrustado (`app.bsky.embed.video`). **(sin confirmar el detalle de los
  pasos: la página oficial del tutorial no se pudo leer; verificarlo al implementar)**.
- **Límites:** 1 video por posteo; **hasta 3 minutos y 100 MB** desde marzo de 2025 (antes 60 segundos); formatos `.mp4`, `.mpeg`, `.webm`, `.mov`;
  cuota diaria de unos **25 videos o 10 GB** por cuenta (cifras de Bluesky; `app.bsky.video.getUploadLimits` da el número real de la cuenta).
  Exige **correo verificado** para subir video. El texto del posteo llega a 300 caracteres y los enlaces se marcan aparte.
- **Costo:** 0. **Revisión:** ninguna.
- **Riesgos:** bajos. Hay que declarar un texto alternativo del video (accesibilidad) y respetar el tope diario.
- **Encaje:** bajo hoy (poca gente de Argentina), pero costo cero y buena comunidad de periodismo. El nombre de usuario puede ser el
  propio dominio (`@radarbalcarce.com`, se prueba con un registro DNS), que sirve de "sello" de que la cuenta es del sitio.

#### 2.3 YouTube Shorts — el de más alcance a largo plazo

- **API:** YouTube Data API v3, `videos.insert` con subida "reanudable". **No existe una API aparte de Shorts**: un video es Short si es
  **vertical o cuadrado y dura hasta 3 minutos** (regla vigente desde el 15/10/2024); el nuestro lo cumple solo. Poner `#Shorts` en el
  título ayuda a mostrarlo, pero no lo decide.
- **Requisitos:** un **canal** de YouTube (hoy no hay), un proyecto de **Google Cloud** con la API activada, una **pantalla de
  consentimiento OAuth** y una autorización hecha **una vez** por una persona con la cuenta del canal (alcance `youtube.upload`). El robot
  guarda el *refresh token* y pide un acceso nuevo en cada corrida.
- **Límites y cuota (según la documentación oficial, leída hoy):** cada subida cuesta **1 unidad del "balde" de subidas, con tope de 100
  subidas por día**. Antes costaba 1.600 unidades de 10.000 (seis subidas por día) y desde el 4/12/2025 bajó; desde el 1/6/2026 las
  subidas tienen su propio balde. Con 2 a 3 por día sobra.
- **El punto delicado:** durante años, los proyectos de Google Cloud **sin auditar** quedaban con los videos **forzados a privado**. La
  página oficial de `videos.insert` de hoy dice lo contrario ("los videos subidos desde proyectos no verificados **no** están restringidos
  a modo privado"), pero muchos blogs repiten lo viejo y no encontré una nota de cambio oficial. **Se resuelve con una prueba de 5
  minutos**: subir un video de prueba como "no listado" y mirar si se puede cambiar a público. Si quedara forzado a privado, el trámite
  es el formulario de auditoría de YouTube API Services (§ 3), gratis, de semanas.
- **Otra trampa conocida:** si la pantalla de consentimiento queda en estado **"Pruebas"**, el *refresh token* **vence a los 7 días**. Hay
  que dejarla "En producción" (con un alcance sensible pero sólo para uso propio alcanza con la advertencia de "app no verificada").
- **Etiqueta de contenido sintético:** `status.containsSyntheticMedia` existe en la API. Decisión para ustedes (§ 9): marcarla en
  verdadero por transparencia (la voz es generada) o no marcarla porque la voz no imita a nadie.
- **Costo:** 0. **Riesgos:** bajos si se respeta la cuota y se declara el contenido. Un canal nuevo tiene límites hasta verificarse por teléfono.
- **Encaje:** **alto**. Un Short sobre "Balcarce" se encuentra en Google y en YouTube durante meses; es la única red de este plan donde el
  video **no caduca** en horas. Por eso va con las piezas que no vencen (la efeméride, el repaso de la noche, los útiles, la agenda y el feriado).

#### 2.4 Threads

- **API:** Threads API oficial de Meta. Dos pasos: crear el "contenedor" del video y, unos 30 segundos después, publicarlo.
- **Lo que complica:** el video se pasa **por una dirección pública** (`video_url`); Threads lo baja desde ahí. No se sube el archivo
  directo como en Instagram. Hace falta **alojar el video un rato en una dirección pública** (§ 7.5: un depósito de Cloudflare R2 con un
  dominio propio, que además ya está medio preparado con "Fotos a R2").
- **Requisitos de formato:** MP4 o MOV, H.264 o HEVC, 23 a 60 cuadros por segundo, ancho máximo 1920, audio AAC de hasta 48 kHz, **sin
  "edit lists" y con el bloque `moov` al principio**, hasta 5 minutos y 1 GB. Nuestros videos cumplen todo salvo, tal vez, las "edit
  lists" (ffmpeg a veces las deja); si la primera prueba falla por eso, se arregla copiando el video sin recodificar con `-use_editlist 0`
  **(sin confirmar)**.
- **Cuenta y permisos:** una app de Meta con el caso de uso "Threads" (se puede agregar a la app que ya existe, "Radar Balcarce
  Publicador"), permisos `threads_basic` y `threads_content_publish`. **No hace falta revisión de Meta** para publicar en la propia cuenta:
  alcanza con invitar a `@radarbalcarce` como **"Threads Tester"** y aceptar la invitación desde la cuenta.
- **Token que vence:** el token largo dura **60 días y hay que renovarlo** (cada renovación vale otros 60). Sin renovar, hay que repetir
  el trámite a mano. Por eso este es el destino que obliga a tener un **lugar donde guardar un token que cambia** (§ 7.4).
- **Límite:** 250 posteos por día por perfil (nos sobra). Texto de hasta 500 caracteres.
- **Costo:** 0 (el depósito R2 está dentro de lo gratis a este volumen **(sin confirmar la tabla de precios vigente)**).
- **Encaje:** medio: es la misma cuenta y el mismo público que Instagram. Si en Instagram hay 7 seguidores, ahí también.

#### 2.5 X (Twitter)

- **API:** X API v2. Video por subida en pedazos (`/2/media/upload/…`), después `POST /2/tweets` con el identificador del video.
- **Costo (leído en la documentación oficial hoy):** modelo **pago por uso**, sin planes mensuales para cuentas nuevas. **Crear un posteo
  cuesta US$ 0,015**; **si el posteo lleva un enlace, US$ 0,20** (13 veces más). La subida de medios no figura con precio propio
  **(sin confirmar)**. Con 4 posteos por día **sin enlace**: 4 × 30 × 0,015 = **~US$ 1,80 por mes**. Con enlace: ~US$ 24 por mes. Se compra
  crédito por adelantado en la consola (hay un crédito de bienvenida de US$ 20 al guardar la primera tarjeta) y se puede poner un **tope de
  gasto**. Recomendación: **sin enlace** en el texto; decir "radarbalcarce.com" en la imagen/voz ya alcanza. **(sin confirmar si escribir el
  dominio pelado cuenta como enlace para el cobro: la primera prueba lo dice en la consola)**.
- **Límites:** videos de hasta 20 minutos para una cuenta común; el texto, 280 caracteres. Los topes por tiempo no figuran en la página de
  precios oficial; no nos acerca ninguno.
- **Autenticación:** una app en la consola de X, con permiso de lectura y escritura, y las cuatro claves de la cuenta (API Key/Secret, Access
  Token/Secret) con firma OAuth 1.0a (se hace con `node:crypto`). Esas claves **no vencen**. La alternativa OAuth 2.0 rota el token y obliga a
  guardarlo. **(sin confirmar que la subida v2 de medios acepte OAuth 1.0a: es lo primero que hay que probar)**.
- **Riesgos:** X cambia precios y reglas seguido. Marcar la cuenta como **"automatizada"** en su configuración (recomendado y exigido por sus
  reglas para cuentas que publican solas) y no responder ni seguir desde el robot.
- **Encaje:** bajo a medio: periodistas, municipio y entidades de la zona están ahí; el público general, mucho menos. Decisión de ustedes si
  vale ~US$ 2 por mes y una tarjeta cargada.

#### 2.6 TikTok — el difícil

- **API:** Content Posting API. Dos caminos:
  1. **Publicación directa (Direct Post)**: el video sale en el perfil. Hace falta una app aprobada con el permiso `video.publish` y que el
     dueño de la cuenta la autorice (Login Kit). **Mientras la app no pase una auditoría, TODO lo que publique queda en privado
     ("solo yo")**, y además la cuenta tiene que ser privada al publicar y sólo hasta 5 usuarios por día. El error aparece como
     `unaudited_client_can_only_post_to_private_accounts`.
  2. **Subir a borradores (Upload)**: el video llega al "buzón" de TikTok y **la persona termina de publicarlo desde la app**. Permiso
     `video.upload`; máximo 5 envíos pendientes por 24 horas. La documentación no dice que exija auditoría **(sin confirmar)**.
- **La auditoría:** la pide el propio panel de desarrolladores, hay que mostrar un video de la app funcionando y que el uso cumpla las
  condiciones de TikTok. Las guías de terceros hablan de **2 a 6 semanas** y de que TikTok quiere productos **"para un público amplio"**,
  no una herramienta propia para una sola cuenta; hay muchos rechazos **(sin confirmar: no hay una fuente oficial para eso)**. Además, las
  reglas de experiencia de TikTok piden que el usuario elija a mano la privacidad, los comentarios y dé consentimiento expreso en cada
  video: **una publicación 100 % automática choca con esas reglas**, aunque la documentación no la prohíbe con esas palabras.
- **Límites si se aprueba:** 6 pedidos por minuto por usuario; un tope de unas 15 publicaciones por día por cuenta, compartido entre apps
  (`spam_risk_too_many_posts`); video de hasta 5 minutos según la cuenta (consulta `creator_info`); el enlace de subida vale 1 hora.
- **Etiqueta de IA:** el campo `is_aigc` marca el video como "generado por IA" (la etiqueta propia de TikTok).
- **Costo:** 0. **Riesgo:** una cuenta que automatiza por afuera de la API (con robots que simulan un navegador) **se bloquea**; no se hace.
- **Recomendación:** (a) **pedir la auditoría igual**, es gratis y el tiempo de espera es largo: conviene tener la solicitud en curso mientras
  se construye lo demás, con el cuidado de describir con honestidad qué hace el producto; (b) mientras tanto, **publicar a mano 1 o 2 videos
  por día** bajando el mp4 del artefacto de la corrida (3 días de vida) o con el camino "Upload a borradores"; (c) **no** contratar un
  intermediario de pago hasta ver si el alcance lo justifica.

#### 2.7 WhatsApp (canal)

- **Hoy no existe una API oficial para publicar en un Canal de WhatsApp.** La API de WhatsApp Business (Cloud API) sirve para conversaciones y
  mensajes a contactos; los Canales siguen siendo una función de la app (consumo y Business) **sin API anunciada** en lo que pude encontrar
  **(sin confirmar al 15/10/2026: mirar de nuevo antes de decidir)**. Existen servicios de terceros que publican en canales con un número
  conectado por QR, pero usan una vía **no oficial**: riesgo de bloqueo del número (el 2266 51-1612 es el WhatsApp del medio y no se arriesga).
- **Recomendación:** crear el canal y **publicar a mano** el repaso de la mañana y el de la noche (20 segundos con el celular), o simplemente
  **mandar el enlace de Telegram/YouTube**. Es el canal más cercano a la gente de acá, así que vale la pena aunque sea manual.
- **Ojo con lo que ya existe:** `redes/whatsapp.mjs` (CallMeBot) sólo manda avisos al teléfono de ustedes; no es un canal ni se debe usar como tal.

#### 2.8 Pinterest

- **API v5** con video (se sube a un almacenamiento temporal, se registra y se crea el pin). **Con acceso "Trial", los pines son visibles sólo
  para quien los crea**; hacerlos públicos exige el acceso **"Standard"**, que se pide con un video del flujo OAuth (incluso para una app
  de un solo usuario) y tarda de 1 a 4 semanas según guías de terceros. Pinterest no es una red de noticias locales. **No vale la pena.**

#### 2.9 LinkedIn

- **API:** Videos API + Posts API con el permiso `w_organization_social`, que pertenece al producto **Community Management**, un "producto
  vetted" con nivel de Desarrollo y nivel Estándar (video de demostración). Hace falta una **página de empresa** y ser administrador. Video
  MP4 de 3 segundos a 30 minutos y de 75 KB a 500 MB. Funciona, pero el trámite es de empresa y el público (profesional, B2B) no es el de un
  medio de barrio. **No por ahora**; se vuelve a mirar si hay un perfil comercial del medio.

### 3. Qué se automatiza YA y qué necesita que una persona haga un trámite

**"Ya" quiere decir: sin ningún trámite nuevo, solo con lo que existe.** Ninguna red de este plan se puede publicar desde cero sin una persona,
porque todas piden crear o autorizar una cuenta (y crear cuentas o pegar claves es algo que **sólo hacen ustedes**). La diferencia está en
cuánto trámite es y en qué pasa **después**:

| Red | ¿Después del trámite, corre solo? | Qué hay que renovar |
|---|---|---|
| Telegram | Sí, para siempre | Nada |
| Bluesky | Sí | Nada (la contraseña de aplicación no vence; si se revoca, se crea otra) |
| YouTube | Sí | Nada, mientras se use al menos cada 6 meses (los *refresh token* sin uso vencen a los 6 meses) |
| X | Sí | Nada (claves OAuth 1.0a); sólo **cargar crédito** |
| Threads | Sí, si el robot renueva el token | El token largo **vence a los 60 días**: lo renueva el propio robot cada vez que corre, y el vigilante avisa si no pudo |
| TikTok | Sólo con auditoría aprobada | Renovar el acceso cada 24 horas (automático) y el permiso de la cuenta cada tanto |
| WhatsApp / Pinterest / LinkedIn | No (ver arriba) | — |

#### 3.1 Los trámites, uno por uno (los hace una persona; ningún valor se pega en un chat)

> Regla de siempre: **claves, tokens y contraseñas van a GitHub → Settings → Secrets and variables → Actions** (secretos) o **Variables**
> (lo que no es secreto). Nunca en un chat ni en el código. El interruptor de cada red es una **variable** (`REDES_TELEGRAM`, etc.) que
> arranca en **No**: se pasa a **Si** recién cuando la prueba en modo simulación salió bien.

**A. Telegram — 10 minutos**
1. En Telegram, hablar con **@BotFather** (https://t.me/BotFather) → `/newbot` → nombre "Radar Balcarce" y usuario terminado en `bot`
   (por ejemplo `RadarBalcarceBot`). Copiar el *token* que da.
2. Crear un **canal público** llamado "Radar Balcarce" con dirección `t.me/radarbalcarce` (si está tomada, `t.me/radarbalcarce_ok`). Texto
   de presentación: la bio oficial de `PERFILES.md`. Logo: `reels/salida/avatar.png`.
3. En el canal → Administradores → agregar el bot con permiso **Publicar mensajes**.
4. En GitHub: secreto `TELEGRAM_BOT_TOKEN` (el token), variable `TELEGRAM_CANAL` (`@radarbalcarce`).

**B. Bluesky — 15 minutos**
1. Crear la cuenta en https://bsky.app con `radarbalcarce@gmail.com` y **confirmar el correo** (sin eso no deja subir video).
2. Nombre de usuario: `radarbalcarce.bsky.social`, o mejor el dominio propio `radarbalcarce.com` (Configuración → Cambiar usuario → "Tengo mi
   propio dominio" → agregar el registro TXT que indica, en el DNS del dominio).
3. https://bsky.app/settings/app-passwords → crear una **contraseña de aplicación** llamada "robot Radar" **sin** permiso de mensajes directos.
4. En GitHub: secretos `BLUESKY_USUARIO` (el usuario completo) y `BLUESKY_CLAVE_APP`.

**C. YouTube — 30 a 45 minutos**
1. Crear el canal con `radarbalcarce@gmail.com`: https://www.youtube.com/create_channel (nombre "Radar Balcarce", logo oficial, la bio oficial).
   Verificar el teléfono en https://www.youtube.com/verify.
2. En https://console.cloud.google.com crear un proyecto "radar-balcarce-youtube" y **activar la API**:
   https://console.cloud.google.com/apis/library/youtube.googleapis.com
3. Pantalla de consentimiento: https://console.cloud.google.com/apis/credentials/consent → tipo **Externo** → agregar el alcance
   `.../auth/youtube.upload` → **publicar la aplicación ("En producción")**. **Si queda en "Pruebas", el acceso muere a los 7 días.**
4. Credenciales: https://console.cloud.google.com/apis/credentials → "ID de cliente de OAuth" (aplicación de escritorio). Copiar el ID y el
   secreto.
5. **Autorizar una vez** con la cuenta del canal (eligiendo el canal de marca "Radar Balcarce"): Claude deja un script chico
   (`redes/youtube-autorizar.mjs`, a escribir) que se corre **en la PC de ustedes**, abre el navegador y muestra el *refresh token* en la
   terminal, sin guardarlo en ningún archivo.
6. En GitHub: secretos `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.
7. Si la primera subida de prueba queda **privada**: formulario de auditoría y ampliación de cuota de YouTube API Services (§ 10).

**D. Threads — 30 minutos (más el depósito de videos, § 7.5)**
1. https://developers.facebook.com/apps/ → la app **"Radar Balcarce Publicador"** (ID 2302218363874399) → Agregar caso de uso **"Acceder a la API
   de Threads"** → permisos `threads_basic` y `threads_content_publish`.
2. En esa app → Roles → **Threads Tester** → invitar a `radarbalcarce`. Aceptar la invitación en Threads (Configuración → Cuenta → Permisos de
   sitios web / invitaciones; el nombre exacto del menú puede variar **(sin confirmar)**).
3. En la sección de Threads de la app, generar el **token de acceso** de la cuenta y cambiarlo por uno **de larga duración** (60 días). Lo
   hace un script de Claude (`redes/threads-autorizar.mjs`, a escribir) en la PC de ustedes.
4. En GitHub: secretos `THREADS_TOKEN`, `THREADS_USER_ID`, `THREADS_APP_SECRET` (el secreto de la app **de Threads**, no el de Facebook) y,
   cuando exista el depósito, la variable `VIDEOS_BASE`.

**E. X — 20 minutos y una tarjeta**
1. Con la cuenta `@RadarBalcarce`, entrar a la consola de desarrolladores: https://console.x.com → crear una app → "Autenticación de
   usuario" con permiso de **leer y escribir** → generar *API Key/Secret* y *Access Token/Secret*.
2. **Cargar crédito** (empezar con US$ 5 a 10) y poner un **tope de gasto** y la recarga automática **apagada**. Lo hace una persona con su
   tarjeta; ni Claude ni el robot tocan datos de pago.
3. Activar la etiqueta de **cuenta automatizada** en la configuración de la cuenta.
4. En GitHub: secretos `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`.

**F. TikTok — 30 minutos para pedirlo y semanas para esperarlo**
1. Entrar a https://developers.tiktok.com con la cuenta `@radarbalcarce` → "Manage apps" → crear una app → agregar **Login Kit** y **Content
   Posting API** (con *Direct Post*). Hace falta una página de términos y de privacidad del sitio (revisar si `radarbalcarce.com` las tiene).
2. Probar en el entorno de pruebas ("sandbox", los videos salen privados) y enviar la solicitud de **auditoría** con el video de demostración
   (el formulario está en el panel de la app; guía: https://developers.tiktok.com/doc/content-posting-api-get-started).
3. Cuando esté aprobada: secretos `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` y `TIKTOK_REFRESH_TOKEN` (lo emite una autorización hecha una
   vez por la cuenta).

**G. WhatsApp (canal), a mano — 5 minutos**: en el WhatsApp Business del medio → Novedades/Actualizaciones → Canales → "+" → Crear canal
(https://www.whatsapp.com/channels). Cargar nombre, la bio oficial y el logo. No hay ningún secreto involucrado.

### 4. Recomendación priorizada

| Orden | Qué | Por qué | Cuándo (si les parece) |
|---|---|---|---|
| **0** | **Pedir hoy la auditoría de TikTok** y crear el canal de YouTube y la cuenta de Bluesky | Son los trámites con espera; los demás son de minutos | Ahora, en paralelo |
| **1** | **Base común** (`redes/destinos.mjs`, esqueleto sacado el 17/10; queda en el historial) + **Telegram** | Gratis, sin revisión, sin riesgo; prueba todo el circuito | Semana 1 |
| **2** | **Bluesky** | Gratis, sin revisión; mismo molde | Semana 1 |
| **3** | **YouTube Shorts** | El de más alcance y el único donde el video no caduca; 100 subidas por día de cuota | Semana 2 |
| **4** | **Threads** (con el depósito de videos y la renovación del token) | Mismo público que Instagram; obliga a resolver "guardar un token que cambia", que sirve después para TikTok | Semana 3 |
| **5** | **X** (si les parece bien ~US$ 2 por mes) | Costo chico pero real, con tarjeta | Semana 3 o 4 |
| **6** | **TikTok** cuando la auditoría salga (mientras, a mano 1 o 2 por día) | Depende de TikTok | Cuando haya respuesta |
| — | WhatsApp canal: **a mano**. Pinterest y LinkedIn: **no** | Sin API oficial / sin público / trámite de empresa | — |

**Orden recomendado de las seis automatizadas:** Telegram → Bluesky → YouTube → Threads → X → TikTok (si pasa la auditoría).

Cada red entra primero **una semana en simulación** (`REDES_<RED>` en "No": el robot dice qué
publicaría y no toca nada) y después se prende (`Si`). Como con el resto del proyecto, **se mide cuatro semanas** (alcance, seguidores, visitas
al sitio con las marcas UTM `utm_source=<red>`) y se decide si se queda, se ajusta el horario o se apaga.

### 5. Cronograma: cuándo sale cada reel en cada red

**Principios** (los mismos de `CRITERIO-REDES.md`): cada pieza sale **dentro de su franja** (nada de "buen día" a la tarde); se reutiliza
**el mismo video** de Instagram y Facebook (cero audios nuevos); sale **justo después** de Instagram y Facebook, en la misma corrida del
reloj, **entre 0 y 30 minutos después** de la hora de la tabla (el reloj corre a los :05, :35 y :45); nunca Política ni Policiales (los
repasos ya los excluyen); y el volumen por red está pensado para no parecer un robot: **cuatro por día en las redes de texto, dos o tres en
las de video que quedan**.

**Qué horarios tiene la audiencia de acá.** La muestra propia es chica (17 días, `web/data/estadisticas.json`, visitas por hora de
Balcarce): se ven picos a las **10 a 11**, a las **15 a 16** y de **21 a 23**, con un pico menor a las 8 a 9. Coincide con los horarios de los
tres repasos, que fueron elegidos con ese criterio. **Es una hipótesis para medir, no una certeza**: se rehace con los números de cada red
después de las cuatro semanas.

#### 5.1 Qué pieza va a qué red (`va` en `redes/destinos.mjs`)

| Pieza | Hora (Balcarce) | Días | Telegram | Bluesky | Threads | X | YouTube | TikTok |
|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Clima de la mañana | 07:00 | todos | sí (en silencio) | | | | | |
| El feriado | 08:00 | feriados | sí | sí | sí | sí | sí | sí |
| Un día como hoy | 09:00 | todos | sí (en silencio) | sí | sí | sí | sí | sí |
| Repaso de la mañana | 10:00 | todos | **sí (con sonido)** | sí | sí | sí | | |
| Participá / Agenda | 12:00 | lun a vie; la agenda los jueves | sí (en silencio) | | | | agenda: sí | |
| Repaso de la tarde | 15:00 | todos | sí (en silencio) | sí | sí | sí | | |
| Teléfonos útiles | 17:00 | sábados | sí (en silencio) | | | | sí | |
| Farmacia de turno | 19:00 | todos | **sí (con sonido)** | | | | | |
| Clima de la noche | 20:00 | todos | sí (en silencio) | | | | | |
| Repaso del día | 21:00 | todos | **sí (con sonido)** | sí | sí | sí | sí | sí |
| Aviso de clima | cuando se detecta | si hay | sí (con sonido) | | | | | |

Por qué así: **Telegram recibe todo** porque es el canal de lo útil (farmacia, clima, agenda) y no cuesta nada; **Bluesky, Threads y X**
reciben los tres repasos y la efeméride (lo que es "noticia" y "dato del día"); **YouTube y TikTok** reciben sólo lo que **sigue valiendo
mañana** (la efeméride y el repaso de la noche; en YouTube también los útiles y la agenda): un resumen de las 10 de la mañana ya es viejo
cuando un Short se descubre una semana después. Participá se queda en Telegram (invita a mandar noticias por WhatsApp, que es lo local).

#### 5.2 La semana completa, por red (Fase 1: se publica a la hora del reel de Meta)

| Hora | Lun | Mar | Mié | Jue | Vie | Sáb | Dom |
|---|---|---|---|---|---|---|---|
| 07:00 | TG clima | TG clima | TG clima | TG clima | TG clima | TG clima | TG clima |
| 08:00 | *(feriado: TG, BS, TH, X, YT, TT)* | | | | | | |
| 09:00 | TG, BS, TH, X, YT, TT efeméride | ídem | ídem | ídem | ídem | ídem | ídem |
| 10:00 | TG, BS, TH, X repaso mañana | ídem | ídem | ídem | ídem | ídem | ídem |
| 12:00 | TG Participá | TG Participá | TG Participá | TG + YT agenda | TG Participá | | |
| 15:00 | TG, BS, TH, X repaso tarde | ídem | ídem | ídem | ídem | ídem | ídem |
| 17:00 | | | | | | TG + YT útiles | |
| 19:00 | TG farmacia | TG farmacia | TG farmacia | TG farmacia | TG farmacia | TG farmacia | TG farmacia |
| 20:00 | TG clima noche | TG clima noche | TG clima noche | TG clima noche | TG clima noche | TG clima noche | TG clima noche |
| 21:00 | TG, BS, TH, X, YT, TT repaso | ídem | ídem | ídem | ídem | ídem | ídem |

*(TG Telegram · BS Bluesky · TH Threads · X · YT YouTube Shorts · TT TikTok.)*

**Volumen por red y por día**

| Red | Un día común | Máximo | Límite de la red | Gasto |
|---|---|---|---|---|
| Telegram | 7 a 8 | 9 | sin tope práctico | 0 |
| Bluesky | 4 | 5 | ~25 videos | 0 |
| Threads | 4 | 5 | 250 | 0 |
| X | 4 | 5 | (sin tope práctico) | ~US$ 1,80 por mes (sin enlace) |
| YouTube | 2 | 4 (jueves con agenda, sábado con útiles, feriado) | 100 subidas | 0 |
| TikTok | 2 | 3 | ~15 | 0 |
| **Audios de voz nuevos** | **0** | **0** | 10 por día (se siguen usando 7 a 9 para Meta) | — |

#### 5.3 Horarios propios (Fase 4, sólo si lo justifican los números)

Con la primera versión, todo sale a la hora de Meta. Si después de cuatro semanas los números dicen que otra hora rinde más, el cambio más
lógico es **YouTube y TikTok**: la efeméride a las **12:30** (almuerzo) en lugar de las 9:00, y el repaso de la noche a las **21:15**, y
Threads/X con la efeméride a las **8:30** (viaje al trabajo). Eso exige **guardar el video** hasta su hora (un depósito con la cola, § 7.5) en
vez de repartirlo en la misma corrida. Hoy no hace falta.

### 6. Herramientas y formatos

**ffmpeg ya está** (`ffmpeg-static`). **No hace falta ninguna herramienta nueva**: el video de hoy sirve para las seis redes sin recodificar.

| Dato | Nuestro video | Telegram | Bluesky | YouTube Shorts | Threads | X | TikTok |
|---|---|---|---|---|---|---|---|
| Relación | 9:16 | cualquiera | cualquiera (9:16 ok) | **vertical o cuadrado** | 9:16 recomendado | 9:16 ok | 9:16 |
| Tamaño | 1080 × 1920 | 1080 ok | ok | hasta 1080p | ancho máx. 1920 | ok | ok |
| Duración | 6 a 58 s | libre | 60 s (antes) / 3 min | **hasta 3 min** | hasta 5 min | hasta 20 min | hasta 5 min (según cuenta) |
| Peso | 0,4 a 1,5 MB | 50 MB | 100 MB | 256 GB | 1 GB | 8 GB | según `creator_info` |
| Códec / audio | H.264 + AAC | ok | ok | ok | H.264, 23 a 60 c/s, AAC 48 kHz máx.; **sin "edit lists"** | ok | MP4/H.264 |
| Texto del posteo | `pieDePieza` (largo) | **1.024** | **300** | título **100**, descripción 5.000 | **500** | **280** | ~2.200 |
| Enlaces | con UTM | sí | sí (se marcan aparte) | en la descripción | sí | **no** (cuesta 13 veces más) | no clicables |

- **Subtítulos:** ya están **quemados en la imagen**, así que se leen sin sonido en todas las redes; no hace falta subir archivos de
  subtítulos. Opcional más adelante: derivar un `.srt` del `.ass` que ya genera `reels/reel.mjs` para YouTube.
- **Texto alternativo:** Bluesky pide un texto alternativo del video (accesibilidad) → el título de la pieza.
- **Portada (cover):** hoy se usa la que elige cada red del primer segundo; la entrada animada es de 2,3 s, y la placa queda quieta
  después. Si algún día importa, TikTok acepta `video_cover_timestamp_ms` y YouTube una miniatura aparte (requiere canal verificado).
- **Etiqueta de IA:** TikTok (`is_aigc`) y YouTube (`status.containsSyntheticMedia`) tienen campo propio; en las demás va el aviso en
  texto. Decisión en el § 9.
- **Textos por red:** un único constructor que reciba la pieza y el nombre de la red y devuelva el texto con el largo permitido
  (`pieDePieza(pieza, red)` ya sabe poner la marca UTM por red). Cada cliente **recorta sin cortar palabras ni el aviso de voz**: primero se
  saca la lista de notas del repaso, antes que el aviso.

### 7. Diseño técnico

#### 7.1 Principios

1. **Un archivo por red**: `redes/telegram.mjs`, `redes/bluesky.mjs`, `redes/youtube.mjs`, `redes/threads.mjs`, `redes/x.mjs`,
   `redes/tiktok.mjs`. **Sin dependencias externas** (sólo `fetch`, `FormData`, `Blob` y `node:crypto` de Node 24); una prueba vigila que
   `redes/` no importe nada de afuera.
2. **Un contrato común** (`redes/destinos.mjs`, **escrito como esqueleto y sacado el 17/10; queda en el historial de git**): el catálogo (`DESTINOS`), el interruptor por red
   (`destinoPrendido`), las claves que faltan (`faltanClaves`), qué pieza va a qué red (`destinosDeLaPieza`) y el repartidor
   (`publicarEnDestinos`), que **simula por defecto**.
3. **El cliente de cada red cumple una sola función**: `publicarVideo({ video, pieza, pie }) → { id, enlace? }`. No decide *qué* se publica
   (eso es del catálogo) ni cuándo (eso es del reloj y de la ventana de la pieza).
4. **Una red que falla no frena a las otras ni al libro** (reintenta 3 veces en la corrida, anota el problema en `libro.problemas` y sigue).
5. **No se arma nada nuevo**: se reparte el mp4 que ya se armó para Meta. No se toca el cupo de voz.

#### 7.2 Dónde se engancha (sin tocar lo que anda)

En `.github/workflows/redes.yml`, **después** del paso "Publicar en Instagram y en la página de Facebook" y **antes** de "Guardar lo
publicado", un paso nuevo:

```yaml
- name: Publicar en las otras redes
  if: always() && steps.armar.outcome == 'success'
  continue-on-error: true          # una falla acá nunca tumba Instagram, Facebook ni el libro
  run: node redes/publicar.mjs --destinos
  env:
    REDES_ACTIVAS: ${{ vars.REDES_ACTIVAS }}
    REDES_TELEGRAM: ${{ vars.REDES_TELEGRAM }}     # una variable por red, todas arrancan en "No"
    TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
    TELEGRAM_CANAL: ${{ vars.TELEGRAM_CANAL }}
    # … las de cada red, a medida que se agregan
```

y en `redes/publicar.mjs` un modo `--destinos` que lee `reels/salida/piezas.json`, arma los clientes de las redes **con claves** y llama a
`publicarEnDestinos`. El libro guarda `libro.destinos[red]["AAAA-MM-DD/pieza"]` (el mismo molde que `facebookVideos`) y se commitea con la línea
`git add web/data/redes.json` que ya existe. El reloj (`redes/reloj.mjs`) **no cambia**: las redes nuevas **siguen** al reel de Instagram.

**Límite conocido de la Fase 1:** el reloj decide qué pieza armar mirando sólo el libro de Instagram. Si una red nueva falla las 3 veces, esa
pieza **no se vuelve a intentar** en las corridas siguientes (el video ya no está armado y rearmarlo gastaría voz). Es aceptable: son copias,
no el contenido principal. Se anota en `libro.problemas` para que se vea. Cuando exista el depósito de videos (§ 7.5), el reintento se hace
desde ahí sin rearmar nada.

#### 7.3 Interruptores (como `REDES_ACTIVAS`)

- **Interruptor general:** `REDES_ACTIVAS` sigue mandando: apagado, **nada** sale a ninguna red.
- **Interruptor por red:** una variable de GitHub por red (`REDES_TELEGRAM`, `REDES_BLUESKY`, `REDES_THREADS`, `REDES_X`, `REDES_YOUTUBE`,
  `REDES_TIKTOK`). Una red sale **sólo si** las dos dicen "Si" **y** no falta ninguna clave. En cualquier otro caso **simula** y escribe por
  qué (`falta REDES_ACTIVAS=Si y REDES_X=Si` o `faltan las claves …`), sin tocar el libro.
- Esto permite prender Telegram sin que se entere Threads, y **apagar una sola red** si algo sale mal sin parar Instagram y Facebook.

#### 7.4 Secretos y tokens que cambian

| Red | Secretos (GitHub → Secrets) | Variables (GitHub → Variables) | ¿Algo se renueva solo? |
|---|---|---|---|
| Telegram | `TELEGRAM_BOT_TOKEN` | `TELEGRAM_CANAL`, `REDES_TELEGRAM` | No |
| Bluesky | `BLUESKY_USUARIO`, `BLUESKY_CLAVE_APP` | `REDES_BLUESKY` | No (la sesión se abre en cada corrida) |
| YouTube | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` | `REDES_YOUTUBE` | No (el *refresh token* queda igual; el acceso se pide en cada corrida) |
| Threads | `THREADS_TOKEN`, `THREADS_USER_ID`, `THREADS_APP_SECRET` | `VIDEOS_BASE`, `REDES_THREADS` | **Sí: vence a los 60 días** |
| X | `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` | `REDES_X` | No |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REFRESH_TOKEN` | `REDES_TIKTOK` | **Sí: el acceso dura 24 horas y el *refresh token* se renueva** **(sin confirmar los plazos)** |

**El problema de los tokens que cambian (Threads, TikTok).** Un secreto de GitHub no lo puede reescribir el propio workflow sin una
herramienta de cifrado que `node:crypto` no trae (el sobre "sealed box" de GitHub). Hay tres salidas; **se recomienda la primera**:

1. **Guardar el token vigente cifrado en el repositorio**, en un archivo de `web/data/` (el repo es **público**, por eso va cifrado con AES-256-GCM
   y una clave que vive en un secreto, `DESTINOS_CLAVE`). Cada corrida lo abre, lo renueva si le faltan menos de 15 días y lo vuelve a
   guardar. Sin dependencias; la misma idea del cifrado del panel (`panel/cifrado.mjs`), pero con una clave del robot y no una de cada celular.
2. Un valor en el **KV de Cloudflare** (el Worker del vigilante ya tiene uno): más infraestructura, pero separada del repositorio.
3. Un **token de GitHub con permiso de escribir secretos** y cifrado con libsodium: obliga a sumar una dependencia y un permiso muy amplio. **No.**

En cualquiera: el **vigilante** (`redes/vigilar.mjs`, `VENCIMIENTOS`) avisa por WhatsApp si un token de este tipo está a menos de 15 días de
vencer y no se pudo renovar, igual que ya hace con las voces del 29/09/2027.

#### 7.5 El depósito de videos (sólo Threads lo necesita hoy)

Threads baja el video de una dirección pública. Las demás redes reciben el archivo directo. La salida más simple es un depósito de
**Cloudflare R2** con dominio propio (`videos.radarbalcarce.com`) y una regla de borrado a los 2 días: el robot sube el mp4 con `wrangler r2
object put` (herramienta y secretos `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` que ya usan "Respaldo" y "Fotos a R2"), publica y lo
borra. El trámite es de una persona (activar el dominio del depósito: "Fotos a R2" ya explica cómo). Lo bueno de armarlo: si más adelante
se quiere publicar **a otra hora distinta** (§ 5.3) o **reintentar** sin rearmar, ya está la cola. Alternativas descartadas: un *release* de
GitHub (la dirección redirige y no queda claro que Threads la siga) y Cloudflare Pages (tiene un tope de 20.000 archivos y ya está al 80 %).

#### 7.6 Qué pruebas lleva cada red

- `pruebas/destinos.test.mjs` (**ya escrita**, 13 pruebas): catálogo coherente, el interruptor doble, las claves que faltan, qué pieza va a
  qué red, que apagado **no llama a ningún cliente ni toca el libro**, que una red que falla no frena a las otras, que no se repite ni sale
  fuera de hora, y que una clave muerta corta sólo esa red.
- Una prueba por cliente (`pruebas/telegram.test.mjs`, …), con un `fetch` de mentira como `pruebas/piezas.test.mjs` hace con Meta: arma bien el
  pedido, **limpia el token de los errores**, respeta el largo del texto, y reintenta o corta según el error.
- Una prueba de **documentos contra código** (como las de `redes-criterio.test.mjs`): los secretos de `DESTINOS` aparecen por nombre en
  `docs/08-INFRAESTRUCTURA.md`.
- La prueba existente de "ni `ingesta/`, ni `panel/`, ni `redes/` importan nada de afuera de Node" cubre los archivos nuevos sin cambiarla.

#### 7.7 Reglas nuevas propuestas (cuando se implemente, se anotan en la R de redes que corresponda de `docs/10-REGLAS-Y-PRUEBAS.md`)

- **174.** Cada red nueva arranca apagada y simulando; sale sólo con `REDES_ACTIVAS` y su interruptor propio en "Si" y con todas sus claves.
- **175.** Una red que falla no frena a Instagram, a Facebook ni a las otras, ni impide guardar el libro.
- **176.** Repartir un video a una red nueva nunca gasta un audio: se reparte el mismo mp4 que se armó para Meta.
- **177.** En las redes nuevas sale lo mismo que ya salió en los reels (nunca Política ni Policiales, nunca una víctima o un menor), con el aviso
  de voz sintética, y **sin enlace en X** mientras el enlace cueste más.

### 8. Riesgos y cómo se cuidan

| Riesgo | Qué puede pasar | Cómo se cuida |
|---|---|---|
| **Cuenta limitada o bloqueada** | Publicar muy seguido o por fuera de la API puede limitar la cuenta | Sólo APIs oficiales; volumen bajo (§ 5.2); cuenta marcada como automatizada en X; **nunca** robots que simulan un navegador |
| **Publicaciones privadas sin auditoría** | TikTok (seguro) y, según fuentes viejas, YouTube dejan los videos privados | Prueba con un video "no listado" antes de prender YouTube; TikTok sólo después de la auditoría o a mano |
| **Token vencido** | Threads a los 60 días, TikTok a los 24 horas, YouTube si la pantalla de consentimiento queda en "Pruebas" (7 días) | § 7.4; el vigilante avisa; checklist de los trámites (§ 3.1) |
| **Plata** | X cobra por posteo; un enlace en el texto lo multiplica por 13 | Sin enlaces en X, tope de gasto en la consola, recarga automática apagada |
| **Tokens a la vista** | El repositorio es público | Todo secreto en GitHub; lo que se renueva, cifrado; ningún token en la dirección sin limpiar (Telegram) |
| **Lo editorial** | Algo sensible llegando a una red nueva sin revisión | Las redes nuevas sólo reciben lo que ya pasó por el criterio de los reels; Política y Policiales no están en ningún repaso |
| **Duplicados** | Una pieza que sale dos veces | El libro (`libro.destinos`), el candado `concurrency: redes` y que la red decida por la clave `día/pieza` |
| **Cambios de las plataformas** | X y Meta cambian precios y permisos seguido | Cada cliente es un archivo chico y aislado; el interruptor por red permite apagar una sola; la auditoría semanal de formatos (`FORMATOS.md`) se extiende a las redes nuevas |
| **Transparencia** | La voz es sintética | Aviso de voz en el texto de todas; etiquetas de IA propias donde existen (§ 9) |
| **Tiempo de Actions** | Más pasos en cada corrida | El paso nuevo sólo corre si hay piezas; los videos pesan 1 MB; se estima menos de 1 minuto extra por corrida con piezas |

### 9. Decisiones para Hernán y Andrés, y lo que no pude confirmar

**Decisiones**
1. ¿Se anima a empezar por **Telegram + Bluesky + YouTube** (todo gratis y sin tarjeta)?
2. ¿**X** a ~US$ 2 por mes, con una tarjeta cargada y tope de gasto? (Es la única que cuesta plata.)
3. ¿Se **pide la auditoría de TikTok** ya, sabiendo que puede ser rechazada y que mientras tanto se sube a mano?
4. **Etiquetas de IA:** ¿marcar `is_aigc` (TikTok) y `containsSyntheticMedia` (YouTube) en verdadero? Recomiendo que sí, por la misma razón por
   la que el aviso de la voz está en el texto.
5. ¿Quieren un **canal de WhatsApp** manejado a mano (repaso de la mañana y de la noche)?
6. ¿**Mismo horario que Meta** (Fase 1) o ya con horarios propios para YouTube y TikTok (Fase 4)? Recomiendo empezar igual y medir.

**Lo que no pude confirmar en una fuente oficial (revisar al implementar)**
- Si el YouTube de hoy deja **públicos** los videos de un proyecto sin auditar (la página oficial dice que sí; los blogs, que no).
- Los pasos exactos de la subida de video de **Bluesky** (la página del tutorial oficial no cargó).
- Si **X** acepta OAuth 1.0a para la subida de medios v2 y si el dominio pelado cuenta como enlace en el cobro.
- El costo de la **subida de medios en X** (no figura en la página de precios).
- Si TikTok exige auditoría para el camino **"Upload a borradores"**, y los **criterios reales** de la auditoría (qué tan rechazable es una
  herramienta de una sola cuenta); los plazos de 2 a 6 semanas son de guías de terceros.
- Los **plazos de los tokens** de TikTok y el menú exacto para aceptar la invitación de tester en Threads.
- Si **WhatsApp** anunció algo para Canales en 2026.
- Los **precios vigentes de R2** (almacenamiento y operaciones) para confirmar que alcanza el plan gratis.
- Si las **"edit lists"** de ffmpeg le molestan a Threads con nuestros videos (se ve en la primera prueba).

### 10. Fuentes (leídas el 15/10/2026)

- TikTok, Content Posting API (empezar): https://developers.tiktok.com/doc/content-posting-api-get-started
- TikTok, reglas de uso (consentimiento, límites, auditoría): https://developers.tiktok.com/doc/content-sharing-guidelines
- TikTok, referencia de publicación directa (errores, `is_aigc`, límites): https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- TikTok, subir a borradores: https://developers.tiktok.com/doc/content-posting-api-reference-upload-video
- YouTube, `videos.insert`: https://developers.google.com/youtube/v3/docs/videos/insert
- YouTube, cuota y auditoría: https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits
- YouTube, historial de cambios (cuota de subida bajó el 4/12/2025; balde propio desde el 1/6/2026): https://developers.google.com/youtube/v3/revision_history
- YouTube, recurso `videos` (`containsSyntheticMedia`): https://developers.google.com/youtube/v3/docs/videos
- YouTube, Shorts de hasta 3 minutos: https://support.google.com/youtube/answer/15424877
- Google, vencimiento de *refresh tokens* (7 días en "Pruebas"): https://developers.google.com/identity/protocols/oauth2
- Threads, publicar: https://developers.facebook.com/docs/threads/posts
- Threads, empezar (roles de tester, tokens de 60 días): https://developers.facebook.com/docs/threads/get-started
- Threads, tokens de larga duración: https://developers.facebook.com/docs/threads/get-started/long-lived-tokens/
- X, precios de la API (pago por uso): https://docs.x.com/x-api/getting-started/pricing
- X, subida de video en pedazos: https://docs.x.com/x-api/media/quickstart/media-upload-chunked
- Bluesky, video (límites, correo verificado): https://bsky.social/about/blog/09-11-2024-video
- Bluesky, tutorial de video: https://docs.bsky.app/docs/tutorials/video
- Bluesky, límites de subida de la cuenta: https://docs.bsky.app/docs/api/app-bsky-video-get-upload-limits
- Telegram, Bot API: https://core.telegram.org/bots/api
- Telegram, preguntas frecuentes (límites de envío y de archivos): https://core.telegram.org/bots/faq
- WhatsApp, Canales (a mano): https://www.whatsapp.com/channels — y, sobre la falta de API, guía de 360dialog:
  https://docs.360dialog.com/docs/whatsapp-marketing/driving-users-to-your-whatsapp-account/whatsapp-channels
- Pinterest, niveles de acceso: https://developers.pinterest.com/docs/key-concepts/access-tiers/
- LinkedIn, Videos API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api
- LinkedIn, Community Management API (niveles Desarrollo y Estándar): https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview

**Enlaces de los trámites (§ 3.1):** @BotFather https://t.me/BotFather · Bluesky https://bsky.app y https://bsky.app/settings/app-passwords ·
YouTube https://www.youtube.com/create_channel · Google Cloud https://console.cloud.google.com/apis/credentials/consent ·
API de YouTube https://console.cloud.google.com/apis/library/youtube.googleapis.com · Meta para desarrolladores https://developers.facebook.com/apps/ ·
X https://console.x.com · TikTok https://developers.tiktok.com · WhatsApp Canales https://www.whatsapp.com/channels. El formulario de auditoría y
ampliación de cuota de YouTube API Services se llega desde la página de cuota y auditoría de arriba (el enlace del formulario cambia: entrar
desde ahí).

Relacionado: `docs/07-REDES.md`, `docs/propuestas/CRONOGRAMA-REDES.md`, `CRITERIO-REDES.md`, `PERFILES.md`, `FORMATOS.md`,
`docs/08-INFRAESTRUCTURA.md`, `redes/destinos.mjs`.

## Anexo C. Cómo automatizar las otras redes: servicios de terceros y lo que pide cada red

*Antes: `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md (anexos)`.*

*15/10/2026. Es una **investigación**, no código: no se creó ninguna cuenta, no se pidió ni se escribió ninguna clave, no se publicó nada. Se leyó la documentación
oficial y las páginas de precios de cada servicio el 15/10/2026. Lo que viene de blogs de terceros (casi siempre de la competencia) o que no se pudo leer
está marcado **(sin confirmar)**. Complementa a `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md (anexos)` y corrige un punto suyo (el de la auditoría de TikTok, § 2).*

### 0. Resumen para Hernán y Andrés

1. **Telegram, Bluesky, Threads y X se pueden automatizar con la API propia, sin pagar un servicio** (X cuesta unos US$ 2 por mes de la API). Eso ya estaba en el plan; no cambia.
2. **YouTube Shorts también, con la API propia y gratis**, pero hay **una duda que se resuelve con una prueba de 5 minutos**: si los videos suben públicos o quedan forzados a privado (§ 3.2). Si quedaran privados, hay plan B pagando poco.
3. **TikTok es el problema.** Las reglas de TikTok para su API **dicen expresamente que no se permite** "una herramienta para subir contenido a las cuentas que vos o tu equipo manejan". Nuestro robot es exactamente eso. **Pedir nuestra propia auditoría tiene muy pocas chances** (esto corrige lo que decía el plan anterior). La salida real es **usar un servicio de terceros que ya pasó la auditoría** (Buffer, por ejemplo: US$ 0 a 5 por mes, tiene API) o **dejar el video en el borrador de TikTok y tocar "publicar" desde el celular**.
4. **El canal de WhatsApp no tiene ninguna vía oficial** para publicar con un programa. Las vías "no oficiales" (Whapi, WAHA, Baileys) usan el número del medio con un truco que **WhatsApp prohíbe en sus términos**: riesgo de perder el número. **Se hace a mano** (20 segundos) con el video ya listo.
5. **Hacerlo con "la PC prendida" (una IA manejando el navegador) es posible, pero no lo recomiendo**: es frágil, no anda con la PC apagada o bloqueada, y TikTok y WhatsApp prohíben justamente eso en sus términos. Con TikTok y WhatsApp hay riesgo real de perder la cuenta o el número.
6. **Recomendación en una línea:** API propia para Telegram, Bluesky, YouTube, Threads y X (≈ US$ 2 por mes); **TikTok vía Buffer** (probar primero el plan gratis; si no alcanza, US$ 5 por mes por un solo canal); **WhatsApp a mano** con el video listo en Telegram. **Costo total: entre US$ 2 y US$ 8 por mes.**

### 1. Cómo leer esto: qué quiere decir "automático"

Hay cuatro niveles, de más a menos cómodo:

| Nivel | Qué es | Ejemplo |
|---|---|---|
| **A. Automático con API propia** | El robot (GitHub Actions) le habla directo a la red. Sin intermediario, con la PC apagada. | Telegram, Bluesky |
| **B. Automático por un servicio de terceros** | El robot le manda el video a un servicio (Buffer, Publer…) y éste lo publica con su "app aprobada". Se paga o se usa el plan gratis. | TikTok vía Buffer |
| **C. Semiautomático** | El robot deja el video listo (en el borrador de TikTok, en Telegram, en un enlace de descarga) y una persona toca "publicar" desde el celular. | WhatsApp canal; TikTok si falla B |
| **D. Una IA que maneja el navegador de la PC** | Hay que tener la PC prendida y con la sesión abierta; imita a una persona. | No recomendado (§ 5) |

### 2. Lo más importante que encontré: TikTok y su auditoría

- Hasta que TikTok audita la aplicación, **todo lo que publica la API queda en privado ("solo yo")** y como mucho 5 usuarios por día, con la cuenta en privado
  (reglas de uso de TikTok, leídas hoy; actualizadas el 4/8/2026).
- Las mismas reglas, en la sección de usos previstos, dicen que la API debe servir "a un público amplio", "no limitarse a aplicaciones de prueba ni a grupos
  internos o uso privado", y enumeran como **uso NO permitido**: *"A utility tool to help upload contents to the account(s) you or your team manages."*
  Es decir: **un robot propio que sube videos a la cuenta propia es lo que TikTok dice que no quiere**. El plan anterior (`PLAN-REELS-OTRAS-REDES.md`, § 2.6)
  recomendaba "pedir la auditoría igual"; con esta frase leída, **la probabilidad de aprobación es baja** y conviene no contar con ella (sin confirmar el criterio
  real del revisor; hay un caso publicado en GitHub de un usuario de Postiz autoalojado rechazado por "no seguir las guías de experiencia de usuario").
- Además, las reglas de experiencia piden que **una persona elija a mano la privacidad y los permisos de comentarios en cada video y dé su consentimiento**, sin
  valores por defecto. Una publicación 100 % automática desde una app propia choca con eso.
- **¿Cómo publican entonces los servicios?** Tienen su propia app, que sí pasó la auditoría (para un servicio que atiende a miles de usuarios, el uso "público
  amplio" se cumple). Blotato lo dice expresamente; Buffer publica "público por defecto" según su ayuda. Nosotros usaríamos **su** app, no la nuestra.
- **El camino "Subir a borradores"** (permiso `video.upload`): el video llega al buzón de TikTok y la persona lo termina de publicar. Un blog de terceros dice que
  tiene "una vara de aprobación más baja" (sin confirmar). Servicios como Buffer ("Avisame", `Notify Me`), Upload-Post (`MEDIA_UPLOAD`) y Blotato (`isDraft`) lo ofrecen.

### 3. Red por red: qué hay hoy

#### 3.1 Resumen

| Red | Con API propia (nivel A) | Con servicio de terceros (nivel B) | Mejor vía hoy |
|---|---|---|---|
| **Telegram** | Sí, gratis, sin revisión | Innecesario (Publer y otros lo soportan; Buffer **no**) | **A** |
| **Bluesky** | Sí, gratis | Buffer, Publer, Metricool, Upload-Post | **A** |
| **Threads** | Sí, gratis, hace falta un depósito de videos con enlace público (R2) y renovar el token cada 60 días | Buffer, Publer, Metricool | **A** |
| **X** | Sí, ~US$ 2 por mes (pago por uso; US$ 0,015 por posteo sin enlace, US$ 0,20 con enlace) | Buffer y Publer (el plan gratis de Publer **no** incluye X) | **A** |
| **YouTube Shorts** | Sí, gratis, cuota de 100 subidas por día; **dudas sobre si salen públicos** (§ 3.2) | Buffer, Publer, Metricool | **A**, con plan B de terceros |
| **TikTok** | Sólo privado hasta una auditoría que probablemente no aprueben (§ 2) | **Sí: Buffer, Publer, Blotato, Upload-Post** | **B** (o C) |
| **WhatsApp canal** | **No existe** | Sólo "no oficiales" con riesgo de perder el número | **C (a mano)** |

#### 3.2 YouTube: la duda de "privado o público"

- La página oficial de `videos.insert` (leída hoy) dice: *"Videos uploaded from unverified API projects are not restricted to private viewing mode"* y
  que cada subida gasta 1 unidad de un balde de 100 por día.
- Pero varios blogs de desarrolladores, algunos con fecha de septiembre de 2026, dicen que **el aviso de "privado" sigue vigente** para proyectos creados
  después del 28/7/2020 y que la llamada responde "ok" igual (el video queda privado sin error).
  **No pude resolver la contradicción leyendo**: queda **(sin confirmar)**. Se resuelve subiendo un video de prueba como "no listado" y mirando en YouTube
  Studio si se puede pasar a público. Si estuviera forzado a privado, hay dos salidas: el formulario de auditoría de YouTube API Services (gratis, tarda semanas)
  o usar Buffer/Publer, que ya tienen su proyecto verificado.

#### 3.3 WhatsApp canal (lo que se pidió confirmar)

- **Documentación oficial de Meta:** la página de la Cloud API (`developers.facebook.com/docs/whatsapp/cloud-api/overview`, leída hoy) lista tres cosas:
  **mensajes** (texto, medios, interactivos), **llamadas** y **grupos**. **No menciona Canales (newsletters).** Los mensajes fuera de la ventana de atención son
  sólo **plantillas aprobadas**, con consentimiento previo de cada persona, dirigidas a **contactos**. Eso es lo que usa un banco para avisarte un pago: no sirve
  para un canal abierto al que cualquiera se suma. **Confirmado: la Cloud API no es un camino para publicar en un Canal.** (Ojo: "no aparece en la documentación" no
  es lo mismo que "Meta dijo que nunca": no encontré ningún anuncio de 2026 sobre una API de Canales, pero conviene mirar el *changelog* de Meta antes de
  cerrar el tema.)
- **Vías no oficiales:** Whapi.Cloud y WAHA (autoalojado) publican en canales conectando **el número por código QR**, igual que WhatsApp Web; hay también
  automatizaciones que copian un canal de Telegram a uno de WhatsApp (Botize + Whapi). **Los términos de WhatsApp** (leídos hoy) prohíben "mensajes masivos,
  automáticos y similares", el "uso no personal" sin autorización, el acceso "por medios automatizados" y la ingeniería inversa, y dicen que pueden suspender o cerrar la
  cuenta. Es decir: **riesgo real de perder el número 2266 51-1612**, que es la vía de contacto del medio. No se recomienda ni con un número secundario, porque el
  canal queda atado a quien lo creó.
- **Alternativas válidas:**
  - **Telegram como canal "oficial" automático** y, en WhatsApp, un **post a mano** del mejor del día con el enlace de Telegram/YouTube/la web.
  - **Listas de difusión de WhatsApp**: sólo llegan a quienes tienen guardado el número del medio; no tienen API; no sirven para crecer.
  - **Comunidades/grupos**: también a mano; la Cloud API ahora tiene API de "Grupos" (sin confirmar condiciones y costo; no es lo mismo que Canales).
  - **WhatsApp Business Platform con plantillas** a contactos que se anotaron (opt-in): es oficial, pero se paga por conversación (sin confirmar el valor
    vigente en Argentina) y hay que armar la lista de suscriptores. Se puede estudiar más adelante si hubiera 500 o más suscriptores. Hoy no.

### 4. Los servicios de terceros, uno por uno

Precios leídos de la página oficial cuando se pudo; el resto, de terceros **(sin confirmar)**. "Evita la auditoría": la app del servicio ya está auditada, así que
publica en público sin que nosotros tengamos que auditar nada.

| Servicio | Redes que importan | API para que el robot mande el video | Precio | Evita la auditoría de TikTok | Notas y riesgos |
|---|---|---|---|---|---|
| **Buffer** | TikTok, YouTube (Shorts), Threads, X, Bluesky. **Telegram: no.** | **Sí, en todos los planes** (GraphQL; clave personal). Gratis: 1 clave, 100 pedidos/15 min, 250/día, 3.000/mes. **Hay que alojar el video en un enlace público** (no sube archivos): sirve el depósito R2 del plan | Gratis: 3 canales, 10 posteos en cola por canal. Essentials: **US$ 5 por canal por mes** (US$ 60 al año). Team: US$ 10 | **Sí** (su ayuda dice "publica en público por defecto"; modo "Avisame" para terminar a mano) | Es el más conocido y estable. Por TikTok: 25 posteos por día, hashtags ≤ 5, la ayuda aclara que publicar muchas veces por API puede dar videos con "cero vistas" (conviene 1 a 3 por día). **TikTok en el plan gratis: sin confirmar** (la ayuda habla de "planes nuevos"). Que la **API publique video a TikTok**: sin confirmar (un blog de 2026 dice que sí; probar en la prueba gratis de 14 días) |
| **Publer** | TikTok, YouTube, Threads, X, Bluesky, **Telegram** | **Sí, sólo plan Business** (API REST; sube el archivo directo, hasta 200 MB, o por enlace). 100 pedidos cada 2 minutos | Gratis: 3 cuentas, **sin X**, 10 posteos en cola, historial de 24 h, **sin API**. Professional desde **US$ 5** por mes (1 cuenta); **Business desde US$ 10 por mes** (1 cuenta; cada cuenta extra suma US$ 4 a 7, sin confirmar) | Sin confirmar (no pude leer si su app de TikTok es auditada) | La más barata con API que sube el archivo directo y soporta casi todo, incluso Telegram. Los blogs traen precios distintos (US$ 12 y 21): mirar el sitio |
| **Postiz** (código abierto, AGPL) | TikTok, YouTube, X, Threads, Bluesky, Telegram y más (32 a 34) | Sí, API pública en todos los planes (clave; sube el archivo y crea el posteo). 90 pedidos por hora | **Nube:** US$ 29 por mes (5 canales; US$ 23 al año), prueba de 7 días. **Autoalojado:** gratis, pero pide un servidor siempre prendido de 4 GB de RAM mínimo y un dominio con HTTPS | **Nube: sin confirmar** si su app de TikTok es auditada. **Autoalojado: no**, hay que auditar la app propia (y vale lo del § 2) | Autoalojar contradice el principio de este proyecto (todo andando con la PC apagada, sin servidores propios). Hay reportes de TikTok trabado en la nube desde marzo de 2026 (sin confirmar si se arregló) |
| **Metricool** | TikTok, YouTube, Threads, Bluesky (en el plan gratis); X como complemento pago | La API sólo en el plan **Advanced** (desde €43 por mes con pago anual) | Gratis: 1 marca, **20 posteos por mes**. Starter desde €16 | Sin confirmar | La API cuesta demasiado para lo que hace. **Descartado** |
| **Blotato** | TikTok, YouTube, Instagram, Facebook, X, Threads, Bluesky, LinkedIn, Pinterest (**sin Telegram**) | Sí, desde el plan Starter (no en la prueba de 7 días) | **US$ 29 por mes** (Starter) | **Sí** (dice expresamente que su app pasó la auditoría; también tiene modo "borrador") | En Starter: 3 cuentas de TikTok, 10 posteos por cuenta por día. Pide 4 semanas de "uso humano" antes de conectar una cuenta. Caro para lo que se necesita |
| **Upload-Post** | TikTok, YouTube, Threads, X, Bluesky, **Telegram** (22 redes) | Sí (REST, SDK de Node), **con plan gratis sin tarjeta** | Plan gratis; precios de pago: sin confirmar | Sin confirmar (recomienda el modo "borrador" para TikTok) | Servicio chico y joven: mayor riesgo de que cambie o cierre. Para probar, sirve |
| **Zernio (ex Late)** / **PostProxy** | TikTok, YouTube, X, Threads, Bluesky, Telegram | Sí (API) | Zernio: **2 cuentas gratis**; de la 3.ª a la 10.ª, US$ 6 cada una. PostProxy: plan gratis, precios sin confirmar | Sin confirmar | Misma advertencia que Upload-Post: servicios nuevos |
| **Ayrshare** | 13 a 14 redes | Sí, es lo más "para programadores" | **US$ 149 por mes** (Premium) | Sin confirmar | **Descartado** por precio |
| **Hootsuite** | Sí, varias | Sin confirmar | Desde US$ 99 por usuario por mes | Sin confirmar | **Descartado** por precio |
| **Later** | Instagram, Facebook, TikTok, Threads, YouTube Shorts… **sin X ni Bluesky** (sin confirmar) | Sin confirmar (un blog dice que ningún plan da API) | Desde US$ 25 por mes, sin plan gratis | Sin confirmar | **Descartado** |
| **Repurpose.io** | Mueve videos de una red a otras (p. ej. de Facebook/Instagram a TikTok y YouTube) | No es API: se configura por la web | Entre US$ 25 y 35 por mes según el blog (sin confirmar) | Sin confirmar | Podría "copiar" nuestros reels de Facebook a TikTok y YouTube sin tocar código, pero cuesta más que Buffer. Plan C |
| **Zapier / Make / n8n** | Telegram, YouTube, Bluesky tienen módulo propio; Threads sólo por HTTP; **TikTok no tiene módulo de publicación** | Son "pegamento", no publican solos en TikTok: terminan llamando a Buffer, Publer, etc. | Zapier/Make: planes desde ~US$ 10 por mes; n8n autoalojado gratis (licencia "uso sostenible") | No | **No suman nada**: GitHub Actions ya hace de pegamento gratis |

**Qué quiere decir "evita la auditoría" y cuál es el costo escondido (dependencia):** el servicio publica con *su* aplicación. Si el servicio cambia precios,
cierra o TikTok le baja la app, hay que cambiar de servicio. Es un riesgo chico si el robot guarda siempre el mp4 y el texto (ya lo hace durante 3 días) y el
cliente de cada red es un archivo aislado (el esqueleto `redes/destinos.mjs` que lo preveía se sacó el 17/10; queda en el historial de git). Y **todos publican con la PC apagada**, porque corren en sus servidores.

**Riesgo de términos con un servicio de terceros:** publicar por la API de un servicio aprobado **cumple** las reglas de TikTok, YouTube, X y Threads (usa canales
oficiales). El riesgo es otro: el contenido automático de poco valor o repetitivo puede recibir **menos alcance** en TikTok (Buffer misma lo advierte), pero no
baneo por el método.

### 5. Con la PC prendida: un script o una IA que maneja el navegador

**Posible, sí. Recomendable, no.**

- **Qué se necesitaría:** la PC prendida, **sin suspenderse y con la sesión de Windows abierta y desbloqueada** (un navegador no puede abrir una pantalla bloqueada);
  una sesión de cada red ya iniciada (con la verificación en dos pasos resuelta una vez); un script de Playwright, o una IA manejando Chrome (Claude en Chrome)
  o la pantalla (computer use); y una **tarea programada de Windows** (Programador de tareas: acción "iniciar un programa", desencadenador por hora, "ejecutar
  sólo cuando el usuario haya iniciado sesión", "activar la PC para ejecutar esta tarea" y "ejecutar lo antes posible si se perdió el inicio programado").
- **Qué tan frágil es:** mucho. Cada cambio de diseño de TikTok Studio, YouTube Studio o WhatsApp Web rompe el script; las sesiones vencen o piden volver a
  entrar; aparecen captchas y avisos de "¿sos vos?"; una IA que maneja el navegador es más flexible, pero más lenta, gasta cupo y puede equivocarse de botón.
  Hay que mirarlo todos los días.
- **Si se apaga la PC (o se bloquea, se corta la luz, Windows se actualiza):** esa pieza **no sale**, y el robot en la nube no se entera. Es lo contrario de la regla del
  proyecto ("andan con la PC apagada"). Habría que armar un aviso al celular de lo que no salió.
- **Riesgo con los términos:**
  - **TikTok** (términos de servicio, sec. 5, leídos hoy): prohíben "usar scripts automatizados para recopilar información o interactuar con los Servicios",
    el uso comercial sin consentimiento por escrito y esquivar sus medidas de control. Es la vía que más cuentas pierde. **No.**
  - **WhatsApp** (términos, leídos hoy): prohíben mensajes masivos o automáticos, el uso no personal sin autorización y el acceso automatizado. Si se
    maneja WhatsApp Web con un script o una IA, es lo mismo que Whapi/WAHA: puede costar el número. **No.**
  - **X, YouTube:** sus reglas de automatización piden usar la API; no pude leer la página de X (error 403) ni la de YouTube **(sin confirmar)**. Y como ya hay API
    propia en ambas, no hay motivo para el navegador.
- **Lo único defendible:** una **persona sentada** usando a Claude en Chrome como ayudante para completar el formulario, y tocando ella misma "publicar".
  Eso es "a mano con ayuda", no automatización, y aun así TikTok pide que el usuario elija la privacidad cada vez. Sirve para TikTok si falla el nivel B.

### 6. Recomendación, red por red

| Red | Vía hoy | Costo por mes | Por qué | Plan B |
|---|---|---|---|---|
| **Telegram (canal)** | A. API propia | 0 | Gratis, sin revisión, sin riesgo. Todo el circuito se prueba ahí | — |
| **Bluesky** | A. API propia | 0 | Gratis, sin revisión | Upload-Post/Publer |
| **YouTube Shorts** | A. API propia, **tras la prueba del § 3.2** | 0 | El de más alcance y el video no caduca | Buffer Essentials (US$ 5) si quedan privados |
| **Threads** | A. API propia + depósito R2 | 0 | Misma gente que Instagram; ya está en el plan | Buffer gratis (3 canales) |
| **X** | A. API propia, sin enlace en el texto | ~US$ 2 | Casi gratis con tope de gasto | No publicar en X |
| **TikTok** | **B. Buffer** (probar el plan gratis; si no deja, Essentials con 1 canal) | 0 a 5 | Su app está auditada; modo automático o "Avisame" | Publer Business (US$ 10) o Upload-Post, o **C: borrador + tocar publicar** |
| **WhatsApp canal** | **C. A mano** con el video listo | 0 | Sin vía oficial; los términos prohíben automatizar | Publicar el enlace de Telegram/YouTube una vez por día |

**Costo mensual total: entre US$ 2 y US$ 8** (X ~US$ 2; TikTok vía Buffer 0 a 5; el resto, 0). El depósito R2 está dentro del plan gratis (sin confirmar tabla vigente).
Sin X y con Buffer gratis: **US$ 0**.

#### 6.1 Plan por etapas

| Etapa | Qué | Quién | Cuánto lleva |
|---|---|---|---|
| **0 (hoy)** | **No pedir la auditoría propia de TikTok** (sale de la lista del plan anterior). Crear el canal de YouTube y la cuenta de Bluesky | Hernán/Andrés | 1 hora en total |
| **1 (semana 1)** | Telegram y Bluesky, siguiendo `PLAN-REELS-OTRAS-REDES.md` (simulación una semana, después "Si"). **Ya queda armado un lugar a donde mandar el video para el WhatsApp a mano**: el canal de Telegram (o un chat privado de Telegram) con el mp4 y el texto | Claude | 1,5 días |
| **2 (semana 2)** | YouTube: **primero la prueba de "no listado → público"**; si anda, cliente propio; si no, Buffer | Claude + Hernán (autorizar una vez) | 1 día |
| **3 (semana 3)** | Threads (con R2 y renovación del token) y, si les parece, X | Claude | 3 días |
| **4 (semana 3 o 4)** | **TikTok vía Buffer**: abrir cuenta de Buffer con el mail del medio (lo hace una persona; el robot no crea cuentas), conectar `@radarbalcarce`, generar la clave de API (la pega una persona en GitHub Secrets), ensayar 3 días con "Avisame" y después pasar a automático | Hernán/Andrés + Claude | 1 día + 14 días de prueba gratis |
| **5 (siempre)** | WhatsApp canal a mano: el robot manda el video y el texto al celular por Telegram; ustedes reenvían al canal (sin confirmar si el menú de compartir de WhatsApp permite elegir un canal propio; si no, se descarga el video y se sube desde el canal) | Hernán/Andrés | 20 segundos por repaso |
| **6 (a los 2 meses)** | Medir (alcance, seguidores, visitas con UTM) y decidir qué red se queda. Revisar si Meta anunció algo para Canales | Todos | — |

### 7. Decisiones para Hernán y Andrés

1. ¿Aceptan **no pedir la auditoría propia de TikTok** y usar **Buffer** (empezando con el plan gratis) para esa red?
2. ¿Aceptan que el **canal de WhatsApp sea a mano** y que el robot sólo deje el video y el texto listos en Telegram?
3. Para X: ¿US$ 2 por mes con tarjeta y tope de gasto, o se deja afuera?
4. ¿Les parece bien probar YouTube con un video "no listado" antes de definir si va por API propia?

### 8. Fuentes (leídas el 15/10/2026)

**Oficiales o del propio servicio**
- TikTok, reglas de uso de la API (usos permitidos y no permitidos, auditoría, límites): https://developers.tiktok.com/doc/content-sharing-guidelines
- TikTok, referencia de publicación directa: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- TikTok, términos de servicio (automatización, uso comercial): https://www.tiktok.com/legal/page/row/terms-of-service/en
- WhatsApp, términos de servicio: https://www.whatsapp.com/legal/terms-of-service
- Meta, WhatsApp Cloud API (mensajes, llamadas, grupos; sin Canales): https://developers.facebook.com/docs/whatsapp/cloud-api/overview
- Threads, empezar (tester, token de 60 días): https://developers.facebook.com/docs/threads/get-started
- X, precios de la API: https://docs.x.com/x-api/getting-started/pricing
- YouTube, `videos.insert`: https://developers.google.com/youtube/v3/docs/videos/insert
- YouTube, cuota y auditorías: https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits
- Buffer, precios: https://buffer.com/pricing
- Buffer, qué es la API (todos los planes, límites, video por enlace): https://support.buffer.com/en-us/articles/what-is-buffers-api-GtIYIQilz5
- Buffer, usar TikTok (automático o "Avisame", límites): https://support.buffer.com/en-us/articles/using-tiktok-with-buffer-oGEroY9Of2
- Buffer, guía para alojar medios de la API: https://developers.buffer.com/guides/hosting-media.html
- Publer, documentación de la API (sólo Business y Enterprise): https://publer.com/docs/overview
- Publer, planes y precios (ayuda): https://publer.com/help/en/article/what-are-publers-plans-and-pricing-15h4yqh/
- Postiz, precios de la nube: https://postiz.com/pricing
- Postiz, API pública: https://docs.postiz.com/public-api/introduction
- Postiz, TikTok: https://docs.postiz.com/providers/tiktok.md
- Metricool, precios: https://metricool.com/pricing/
- Blotato, precios: https://www.blotato.com/pricing y TikTok: https://www.blotato.com/api/tiktok
- Ayrshare, precios: https://www.ayrshare.com/pricing.md
- Upload-Post: https://www.upload-post.com/
- Zernio, precios: https://zernio.com/pricing
- PostProxy: https://postproxy.dev/

**De terceros (leer con cuidado, muchos venden una alternativa)**
- Auditoría de TikTok, plazos y rechazos comunes: https://bundle.social/blog/tiktok-api-approval
- Postiz, rechazo de un usuario autoalojado: https://github.com/gitroomhq/postiz-app/issues/1362 · cola trabada en la nube: https://github.com/gitroomhq/postiz-app/issues/1338
- WhatsApp Canales por API no oficial (Whapi): https://whapi.cloud/blog/whatsapp-channel-api-automation · (WAHA): https://waha.devlike.pro/whatsapp-channels · riesgos: https://www.bot.space/blog/whatsapp-api-vs-unofficial-tools-a-complete-risk-reward-analysis-for-2025
- YouTube, restricción de "privado" según desarrolladores: https://www.upload-post.com/youtube-api/ y https://postproxy.dev/blog/automate-youtube-uploads/
- Hootsuite y Later (precios): https://www.socialpilot.co/blog/hootsuite-pricing y https://www.saaspricepulse.com/tools/later
- Repurpose.io (precios): https://www.creatorstackclub.com/software/repurpose-io/pricing
- Zapier y Make sin módulo de publicación de TikTok: https://community.zapier.com/how-do-i-3/posting-videos-across-multiple-accounts-23495 y https://community.make.com/t/why-i-don-t-have-a-tiktok-module/72300
- Make, módulos de Telegram, YouTube y Bluesky: https://www.make.com/en/help/apps/communication/tiktok (TikTok) y https://make.com/en/help/app/bluesky
- n8n, licencia de uso sostenible: https://www.ssdnodes.com/learn/n8n-sustainable-use-license-explained

### 9. Lo que no pude confirmar

- Si el **plan gratis de Buffer** deja programar a TikTok, y si su **API** publica video a TikTok (solo un blog de 2026 lo dice; probar en la prueba de 14 días).
- Si la **aplicación de TikTok de Publer, Postiz (nube) y Upload-Post** está auditada (sólo Blotato y Buffer lo dicen o lo dejan ver).
- Si YouTube **deja público** lo que sube un proyecto sin verificar (las fuentes se contradicen: § 3.2).
- Si Meta **anunció algo para Canales de WhatsApp** (la documentación de la Cloud API de hoy no lo menciona; revisar el *changelog*).
- Costo y condiciones de la **API de Grupos** de WhatsApp y valor por conversación en Argentina.
- Los términos de **X y YouTube** sobre automatización por navegador (no se pudieron leer).
- Precios exactos de **Publer** (la ayuda dice US$ 5 y 10; los blogs, 12 y 21), **Upload-Post**, **PostProxy** y **Repurpose.io**.
- Los precios vigentes de **R2** (almacenamiento y operaciones).
- Si el menú "compartir" de WhatsApp permite elegir un **canal propio** desde un video recibido por Telegram.
