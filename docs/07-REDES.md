# 07 · Las redes: Facebook e Instagram de punta a punta

*El cronograma hora por hora, la audiencia, las propuestas de horario y las redes que faltan están en [`docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md`](proyecto/REDES-CRONOGRAMA-MAESTRO.md) (24/10/2026).*

*Actualizado el 17/10/2026. Si algo de acá no coincide con el código, manda el
código.* Cómo suenan y qué dicen las piezas: [`CRITERIO-REDES.md`](../CRITERIO-REDES.md).
Colores, letras y medidas: [`MEDIA-KIT.md`](../MEDIA-KIT.md) y
[`FORMATOS.md`](../FORMATOS.md). Los workflows, las claves de IA y lo que
cuesta: [`08-INFRAESTRUCTURA.md`](08-INFRAESTRUCTURA.md). Qué hacer a mano:
[`11-OPERACION.md`](11-OPERACION.md). Las palabras propias (posteo, espejo,
pieza, podcast, el libro, simular): [`12-GLOSARIO.md`](12-GLOSARIO.md).

## En una frase

Tres veces por hora GitHub mira la portada ya publicada, sube a Facebook como
mucho una nota, con foto y el enlace en el texto (y la misma nota como foto en
Instagram: el espejo) y, si a esa hora toca una pieza de video (clima, farmacia,
uno de los tres podcasts, "Un día como hoy", participá, el feriado, los
teléfonos útiles, la agenda o un aviso de clima), la arma con una placa propia y
una de las dos voces de Gemini, la sube a Instagram y a la página de Facebook, y
anota todo en un libro (`web/data/redes.json`) para no repetir nada.

## El recorrido, paso a paso

Una corrida del workflow **Redes** (`.github/workflows/redes.yml`), en orden.
Corre en GitHub con la PC apagada y la hora de Balcarce
(`TZ: America/Argentina/Buenos_Aires`).

### 1. Quién la despierta

- **El Worker de Cloudflare `radar-balcarce-reloj`** (`infra/reloj-cloudflare/`,
  desde el 15/10) pide `redes.yml` con la acción `reloj` (cuerpo
  `{"ref":"main","inputs":{"accion":"reloj"}}` a
  `actions/workflows/redes.yml/dispatches`) a los minutos **:05, :35 y :45 de
  todas las horas** (`trabajosDelMinuto`). Hasta el 15/10 lo hacía cron-job.org,
  que quedó pausado, no borrado.
- **El final de "Actualizar la web"** (`workflow_run`), bien o mal. Es el
  respaldo si el reloj se cae.

El reloj propio de GitHub no se usa: el 21/09 dejó cinco horas entre dos
corridas. "Redes" y "Piezas" comparten un candado (`concurrency: redes`), así
la misma pieza no sale dos veces antes de anotarse, y cada corrida baja la
última `main` (`ref: main`): con un libro viejo, el 25/09 un repaso salió dos
veces.

### 2. El interruptor: `REDES_ACTIVAS`

Es una **variable** de GitHub (Settings → Secrets and variables → Actions →
Variables), no un secreto. La lee una sola regla, `estaActivo`
(`redes/elegir.mjs`): "si" con cualquier mayúscula, tilde o espacio alrededor
("Si", "SÍ", " sí "). La usan `redes/publicar.mjs` (con otra cosa escribe
"modo prueba: no se publicó…") y `redes/reloj.mjs` (con otra cosa no pide
ninguna pieza: no se gasta voz en videos que no se van a publicar). Si hoy está
prendida lo dice `CLAUDE.md` ("Estado").

Apagado: Facebook corre pero sólo simula, no se arma ni se sube ningún video,
no se reintentan espejos, el libro no cambia y el vigilante lo dice una vez por
día. Completar las direcciones de los podcasts (paso 7) corre igual, porque
sólo pregunta.

### 3. Facebook: una nota, y su espejo en Instagram

`node redes/publicar.mjs --facebook` (función `facebook()`, con `META_TOKEN`,
`REDES_ACTIVAS` y `SITIO`) lee `web/data/portada.json` (lo ya publicado: lo que
el semáforo frenó ni aparece) y el libro.

**3a. Los espejos que quedaron debiendo.** `espejosPendientes`
(`redes/espejo.mjs`) reintenta, del más viejo al más nuevo, los posteos de las
últimas **12 horas** que no tienen su foto en Instagram, con menos de **4
intentos**. El caso típico: el posteo sale y la tarjeta de Instagram todavía no
está en la web (Instagram contesta "Only photo or video can be accepted").

**3b. Si toca una nota nueva.** `elegirParaFacebook` (`redes/elegir.mjs`)
devuelve cero o una, y casi siempre cero: es lo normal. Los números están en
`FACEBOOK` (`ingesta/criterio.mjs`, controlados contra la tabla "Los números"
de `CRITERIO-EDITORIAL.md`):

| Regla | Valor |
|---|---|
| Horario | De 8:00 a 22:00 en punto (se cuenta en minutos: el 24/09 salió uno a las 22:25) |
| Tope | 5 por día, 1 por corrida, 90 minutos entre uno y otro |
| Edad | Entre 15 minutos y 8 horas desde que salió en la web (`publicadaCuando`, o la fecha de la nota) o desde que una persona la marcó para las redes |
| Qué nota | Una que pueda ir por lo que es (`vaAFacebookPorLoQueEs`, abajo), con cuerpo (`esperaCuerpo`, `web/lib/cuerpo.js`), que no sea nota propia (la del dólar, las de los podcasts: `esNotaPropia`) |
| Foto | Una nota sin foto espera hasta 3 horas a que aparezca (8/10, `FACEBOOK.horasEsperandoFoto`); pasado ese tiempo sale con la placa. Lo marcado por una persona no espera |
| Tema | No repite un tema publicado en las últimas 24 horas (`temaParecido`: el 24/09 salieron tres del autódromo en cuatro horas) |
| Repetición | Una nota sale una sola vez (el libro) |

**Sólo Balcarce y lo más contado del país (17/10, regla 280, Hernán):** "en posteos de Facebook y de Instagram, sólo notas de Balcarce o, si no son de Balcarce, las más populares que tengamos, vengan de donde vengan". Se
sacó el relleno del 12/10 (`vaAFacebookDeRelleno`, `relevanciaMinimaDeRelleno`), que completaba los cinco del día con lo de afuera sin piso y dejó pasar, el 17/10, la agenda de espectáculos de La Plata (2 medios).
Ahora lo de afuera sale sólo si lo cuentan **`FACEBOOK.mediosParaRedes` (5) medios distintos o más** (`esPopularParaRedes`: los del mismo dueño cuentan uno, `redes/medios-contados.mjs`; y nada de "dónde ver",
"en vivo", pronóstico ni cotización: `noEsNoticiaAunqueLaCuentenTodos`). Valen las mismas guardas: nada propio ni sin cuerpo, nunca Política ni Policiales, nada que una persona aprobó sin marcarlo para las
redes. Orden dentro del cupo: lo marcado por una persona, lo de acá que cuentan tres medios de Balcarce o más, el resto de lo de acá y, al final, lo más contado del país. Instagram copia lo de Facebook. La medición de
cuántas notas pasan con 4, 5, 6 y 8 medios y la propuesta de cuántos posteos por día están en `docs/redes/PROPUESTA-POSTEOS-POR-DIA.md`.

**Qué nota puede ir** (`vaAFacebookPorLoQueEs`, regla 78):

- **Sola:** o de Balcarce (`esParaLasRedes`: `local: true`, o Automovilismo con
  una figura argentina) con relevancia 75 o más, o lo más contado del país (`esPopularParaRedes`, regla 280); nunca Política ni Policiales
  (`SECCIONES_QUE_ESPERAN_PERSONA`: en una red la nota viaja sin contexto) y
  que haya salido en la web por el semáforo verde. Lo que salió en la web
  porque lo aprobó una persona (era amarillo) **no va solo**.
- **Marcada por una persona** en el panel del celular ("También a Facebook e
  Instagram", `aprobadaParaRedes`): va aunque sea de Política, de Policiales,
  de afuera o de poca relevancia, y pasa primero. El horario, el tope, el tema
  y el cuerpo valen igual.

`temaParecido`: dos notas son del mismo tema si sus titulares comparten dos
palabras de cinco letras o más que dicen algo (sin las que están en cualquier
titular de acá: "Balcarce", "municipio", "vecinos"…), una palabra de ocho
letras o más, o una palabra y un tema de los que sigue el sitio. Compara con el
titular con el que salió cada posteo y, si la nota sigue en la portada, con el
de ahora.

**3c. El texto del posteo** (`mensajeDeNota`): el `textoRedes` que la IA
escribió con la nota (pasa por el verificador, `04-REDACCION`) o, si no hay, el
titular y la bajada cortada en 220 caracteres; después, el cierre y los hashtags
(regla 281, `hashtagsDe`): **`#Balcarce #RadarBalcarce` siempre, primeros** (`HASHTAGS_FIJOS`), y hasta tres de la nota (sus etiquetas o, si no trae, el tema de su sección),
sin repetir: con los fijos, cinco como mucho, el tope que Instagram anunció en diciembre de 2025. Los pies de los reels llevan los dos fijos y uno del tipo de pieza
(`hashtagsDePieza`: #Noticias, #Clima, #FarmaciaDeTurno…) después del aviso de la voz. El largo, los enlaces y los hashtags de las demás redes (Threads, X, Telegram, Bluesky, TikTok, YouTube Shorts, el canal de WhatsApp) están en
`docs/redes/FORMATOS-POR-RED.md` (el programa `textoParaRed` de las otras redes se borró el 24/10, regla 309; sigue en el historial de git). El cierre depende de la red (16/10, `lineaFinal`):

- **En Facebook**, una línea con el enlace a la nota (la frase cambia de nota en
  nota y es siempre la misma para la misma nota: `FRASES_DEL_ENLACE`). Desde el
  15/10 el enlace lleva de dónde sale (`utm_source=facebook`, `utm_medium=social`,
  `utm_campaign=posteo`: `enlaceConOrigen`, regla 169). Con la variable `ENLACES_CORTOS` ("Si", apagada por defecto, regla 282) el enlace es `radarbalcarce.com/r/f/<id>` (36
  caracteres contra 178) y el Worker `infra/enlaces-cloudflare/` manda a la nota con las mismas UTM y cuenta los toques: `docs/redes/ACORTADOR-DE-ENLACES.md`.
- **En Instagram, nunca un enlace** (no se puede tocar en el celular): "La nota
  completa, en radarbalcarce.com (link en la bio)".

**Nunca nombra la fuente** ni dice "Resumen hecho con IA": las dos cosas están
en la nota de la web. Si la nota tiene foto, al final va el crédito
(`conCreditoDeFoto`).

**La imagen** (desde el 5/10, Hernán: "5 posteos por día con foto"): el posteo
de Facebook sale **como foto**, con la misma tarjeta vertical de 1080 × 1350 del
espejo de Instagram (`/nota/ID/instagram.png`, `imagenDeNota`) y el enlace en el
texto (`publicarFotoEnFacebook`). Si la foto falla, se reintenta en la vuelta
siguiente y, tras 3 intentos (`libro.facebookFoto`), sale como posteo con
enlace, con la tarjeta apaisada de 1200 × 630 que Facebook toma de la página
(`web/app/nota/[id]/opengraph-image/route.js`, dibujada por `web/lib/tarjeta.js`).
La variable `FACEBOOK_COMO_FOTO=no` vuelve al posteo con enlace. Antes de dar por
perdido un error de Meta, se mira si igual se publicó (`posteoYaPublicado`: el
5/10 hubo cuatro copias).

**3d. Publicar y anotar.** `publicarFotoEnFacebook` o `publicarEnFacebook`
(`redes/meta.mjs`) publica con el token de la página. Apenas Meta contesta se anota en el libro
(`libro.facebook[id de la nota]`: cuándo, número del posteo, titular, enlace, temas, `como` —'foto' o 'enlace'— y la foto con que salió) y se guarda. Si Meta dice que el token murió (código 190), se corta todo.

**3d-bis. Si la foto de la nota cambia después del posteo** (regla 283, `redes/foto-cambiada.mjs`). Antes de elegir qué publicar, `--facebook` mira los posteos de las últimas **48 horas**: si el banco de fotos, las fotos manuales
o las ilustraciones de IA le dieron a la nota otra foto **después** del `cuando` del posteo, le pide a Facebook que vuelva a leer la página (`releerEnlace`: `POST /?id=<url>&scrape=true`), **una vez por cambio**
(`relectura` en el libro). Ojo: eso actualiza la vista previa de un posteo "enlace", **no la foto de un posteo con foto** (Facebook la guarda al publicar). Lo que de verdad lo evita es esperar a la foto real antes de
publicar (`FACEBOOK.horasEsperandoFotoReal`, hoy 0 = no espera). Medición, alternativas y pregunta: `docs/redes/FOTO-CAMBIADA-DESPUES-DEL-POSTEO.md`.

**3e. El espejo en Instagram.** Enseguida, `publicarFotoEnInstagram` publica
en el feed la tarjeta vertical de **1080 × 1350** (`/nota/ID/instagram.png`)
con el mismo texto. Instagram exige que la imagen esté en una dirección
pública, y ésta ya lo está porque la arma la web al compilar. Si falla, el
posteo no se toca: se anota el intento (`intentosEspejo`) y se reintenta en las
vueltas siguientes (3a). Es la **única foto** que va a Instagram; todo lo demás
es video.

### 4. El reloj: ¿toca alguna pieza ahora?

`node redes/reloj.mjs` no instala nada: mira la hora, el libro y el clima de la
portada y deja dos datos para los pasos siguientes: `hay=true|false` y
`solo=nombre1,nombre2`. Por dentro, `slotsQueTocan` (`redes/piezas.mjs`) arma
el cronograma del día (`cronogramaDelDia`) y se queda con lo que está **dentro
de su ventana** y **no está en el libro** (`libro.instagram["AAAA-MM-DD/nombre"]`),
hasta 6 por corrida (`POR_CORRIDA`), para que una corrida atrasada no deje nada
para la siguiente. Si no toca nada, la corrida termina en segundos.

**Los horarios** (esta tabla es la referencia; el código manda):

| Pieza (nombre en el libro) | Tipo | Hora | Vale hasta | Qué días |
|---|---|---|---|---|
| Aviso de clima (`aviso-helada`, `aviso-granizo`, `aviso-viento`) | historia | 7:00 | 22:00 | Sólo si hay un aviso grave, hoy o mañana |
| Clima de la mañana (`clima-manana`) | historia (en Facebook, además reel) | 7:00 | 11:00 | Todos |
| El feriado (`feriado`) | reel + historia | 8:00 | 12:00 | Sólo los feriados, con datos verificados (`redes/feriado.mjs`) |
| Un día como hoy (`efemeride`) | reel + historia, con dos placas | 9:00 | 12:00 | **Todos los días que tienen su entrada preparada** en `web/data/efemerides-piezas.json` (`redes/efemeride.mjs`); sin entrada no sale nada. Fijo: no se mueve ni se saca por el techo de historias |
| Podcast de la mañana (`noticia1`) | reel + historia | 10:00 | 13:00 | Todos, con 2 notas o más |
| Participá (`participa-noticias`, `participa-evento`, `participa-reclamos`, `participa-nota`) | reel + historia | 12:00 | 13:00 | Lunes, martes, miércoles y viernes, una cada día (armadas de antemano: "Piezas fijas", más abajo) |
| Agenda del fin de semana (`agenda`) | reel + historia | 12:00 | 13:00 | Jueves, si hay eventos en los próximos 4 días |
| Podcast de la tarde (`noticia2`) | reel + historia | 15:00 | 19:00 | Todos, con 2 notas o más |
| Teléfonos útiles (`utiles`) | reel + historia | 17:00 | 18:00 | Los sábados, fijo |
| Farmacia de turno (`farmacia`) | historia (en Facebook, además reel) | 19:00 | 24:00 | Todos |
| Clima de la noche (`clima-noche`) | historia (en Facebook, además reel) | 20:00 | 24:00 | Todos |
| Podcast de la noche (`podcast`) | reel + historia | 21:00 | 24:00 | Todos, con 2 notas o más |

- Las horas de las historias fijas son las de `HISTORIAS_FIJAS`
  (`redes/horarios.mjs`; se cambian ahí, en el código). Las de los podcasts, `PODCASTS` y `HORAS_REELS`
  (`redes/piezas.mjs`). Las ventanas, `VENTANAS` (2 horas si una pieza no tiene
  la suya, `VENTANA_MINUTOS`). Desde el 29/09 cada pieza sale dentro de su parte
  del día (mañana hasta las 12:59, tarde hasta las 18:59, noche desde las 19),
  para que el saludo sea el de su hora: por eso los podcasts de la mañana y de la
  tarde valen hasta las 13 y las 19. Ninguna cruza la medianoche: si la ventana
  se cierra sin que salga, esa pieza se pierde por hoy.
- **Dónde sale cada pieza** (8/10, regla 147): lo que tiene voz además de los
  podcasts ("Un día como hoy", el feriado, la agenda, los útiles y participá)
  sale como **reel en las dos redes y, con el mismo video, como historia**
  (`SALE_COMO_REEL`); el clima y la farmacia son historia y **en Facebook salen
  además como reel** (`reelEnFacebook`, `libro.reelsEnFacebook`); los avisos de
  clima, sólo historia.
- **Los útiles salen los sábados a las 17:00**, fijos (1/10/2026; antes rotaban de lunes a viernes:
  `diaRotativoDeUtiles`, `ingesta/utiles.mjs`, aplicada por `toca` de
  `redes/horarios.mjs`, la única que decide qué día sale cada pieza).
- **El aviso de clima** sale apenas se detecta: `avisoDeClima` toma el primero
  de gravedad alta de `avisosDelClima` (`ingesta/alertas.mjs`): helada de −2° o
  menos, tormenta con granizo o viento de 60 km/h o más, hoy o mañana. "Posible
  helada" o "calor extremo" no alcanzan (están en la tarjeta de la portada).
  Una vez por día y por tipo; no es parte del contrato.

### 5. Armar los videos

Sólo si el reloj dijo `hay=true`: `npm ci` instala lo que hace falta para
dibujar y hacer video (`@resvg/resvg-js`, `ffmpeg-static`) y
`node reels/plan.mjs --generar --solo=…` arma **sólo** las piezas que pidió el
reloj, con `GEMINI_API_KEY_REDES`.

**5a. Los datos.** El plan lee `web/data/portada.json` y lo traduce con
`datosDeLaWeb` (`redes/datos.mjs`): las notas publicadas, el clima y la
farmacia. Como sale de lo ya publicado, **una pieza nunca habla de algo que el
semáforo frenó**. La agenda sale de la agenda publicada (`web/data/agenda.json`,
`eventosProximos` en `reels/plan.mjs`). También lee el libro y la historia del
dólar. (Hasta el 17/10 había un "modo PC" que leía los datos y los horarios del
panel de la PC; ese panel se retiró ese día: nunca se usó; queda en el historial de git.)

**5b. El plan del día** (`planDelDia`) arma cada pieza con su guion (lo que
dice la voz), su placa, su color de acento y su hora. Techo de **8 historias
por día** (las 6 del contrato más 2); si sobra, se deja de armar en este orden:
útiles, agenda, las de participá y el feriado (`historiasQueSobran`,
`EXTRAS_DE_HISTORIAS`). Las del contrato, "Un día como hoy" y los avisos de
clima nunca se sacan.

**5c. Cada video** lo arma `armarReel` (`reels/reel.mjs`):

1. **La placa**, de SVG a PNG de 1080 × 1920 (`aPng`, `reels/placa.mjs`), con
   las letras de `reels/marca/fuentes/`.
2. **La voz.** `paraLeer` (`reels/voz.mjs`) dice los símbolos en palabras
   ("12°" → "12 grados", "%" → "por ciento", "km/h", "N°"). `decirGemini`
   (`reels/voz-gemini.mjs`) pide el audio a `gemini-3.8-flash-tts` por la
   Interactions API: el texto va literal y, aparte, un estilo corto (el de
   siempre más el de la mañana, la tarde o la noche), con la voz de esa pieza,
   la locutora o el locutor, según el reparto de `CRITERIO-REDES.md` § 6
   (`vozDePieza`, `redes/prompt-redes.mjs`; una pieza sin voz no se arma).
   **La memoria de voces** (8/10): el mismo texto con la misma voz y el mismo
   estilo se pide una sola vez; si la pieza se vuelve a armar (falló ffmpeg,
   Meta contestó con error) se reusa el audio guardado en la caché de Actions
   (`VOZ_CACHE`, `leerDeLaMemoriaDeVoz`, 3 días) y no se gasta cupo.
   Hasta 4 intentos, 2 segundos entre pedidos y 2 minutos como máximo por
   pedido. Un audio que dura de más para su texto (`vozDeMas`: leyó algo que no
   estaba) cuenta como falla. Si Google contesta que se acabó el cupo del día
   (`esCupoDelDia`), corta en el acto: esperar no lo arregla. **Si Gemini
   falla, la pieza no sale** (nunca con otra voz): `plan.mjs` la deja fuera del
   manifiesto y el reloj la vuelve a pedir en la vuelta siguiente mientras dure
   su ventana. **El contador del cupo** (17/10, regla 208, `reels/cupo-voz.mjs`):
   cada pedido se anota antes de hacerse y no se pide si dejaría sin audio a una
   pieza más importante que falta hoy (ver "El cupo de voz", más abajo). **El
   audio crudo** se guarda en la memoria apenas llega: si después falla la
   conversión o la alineación, la vuelta siguiente lo termina sin volver a pedir.
3. **Los subtítulos.** Gemini no dice cuándo arranca cada palabra: `alinear`
   (`reels/alinear.mjs`) busca los silencios del audio con ffmpeg,
   `reels/tiempos.mjs` reparte las palabras entre pausa y pausa según sus
   sílabas (error medio de 0,1 a 0,2 segundos; los números se cuentan como los
   dice la voz: "715" son 6 sílabas) y `enCarteles` (`reels/voz.mjs`) las
   agrupa de a 2 a 4. Van en tinta, con la palabra que se está diciendo en el
   color de acento, centrados en la fila 1660 (fuera de la zona de texto de la
   placa).
4. **El video**, con ffmpeg, a 30 cuadros por segundo, con la voz, un segundo y
   medio de cola y la barra roja de avance abajo. Sin música ni zoom (regla 90:
   nada tiembla). Lo que se mueve: la **escena animada** de la pieza
   (`reels/escenas/`: clima, farmacia, efeméride, feriado, participá, útiles,
   agenda) o la **entrada animada** de su placa (`reels/animacion.mjs`). **El
   repaso** (17/10, regla 209, `reels/escenas/repaso.mjs`) es una secuencia de
   placas que sigue a la voz: una por nota, con su foto (o su ilustración; si no
   tiene, la placa de su sección), su titular y "i de n", que entra cuando la voz
   empieza la oración de esa nota (los tiempos salen de las palabras, paso 3);
   arranca con la primera nota, la más fuerte, y cierra con la lista. **La tapa**
   del reel (el cuadro 0, lo que muestran Instagram y Facebook antes del play) es
   la lista completa. Si la animación falla, sale la placa quieta.
   **Con movimiento** (18/10, regla 300): el repaso es una escena dibujada cuadro
   a cuadro (`escenaDelRepaso`) y todas las piezas arrancan ya con contenido.
   Cómo se ve el repaso: la tapa 0,5 s y una transición de 10 cuadros a la
   primera nota; entre nota y nota, la foto nueva se desliza y se aclara sobre la
   anterior, el titular entra palabra por palabra, el "2 de 4" rueda y las
   rayitas de arriba se llenan; sobre cada foto, una deriva lenta (zoom de 1,04 a
   1,11 y paneo de unos píxeles, que alterna entre notas). La regla 90 vale para el
   texto: lo escrito entra una vez y queda quieto; lo que deriva es la foto, ya
   dibujada por resvg (no hay `zoompan`). Los subtítulos (fila 1660) y el crédito
   de la foto nunca quedan tapados. **Cuánto cuesta:** se dibujan sólo los cuadros
   distintos (30 por segundo donde algo entra, 15 en la deriva lenta), ffmpeg lee
   la secuencia directo (sin video intermedio) y las escenas de servicio pasan de
   20 a 30 cuadros por segundo. Medido el 18/10 en una PC de 4 núcleos, con voz
   falsa y datos reales de `portada.json`: repaso de 48,6 s de audio, 78 s de
   armado (antes, 79 s); clima de la mañana, 51 s (antes, 50 s); farmacia, 55 s
   (antes, 42 s); efeméride, 72 s (antes, 48 s). El `timeout-minutes: 25`
   alcanza de sobra.
5. **La medida de verdad.** Se mide lo que dura el archivo. Si pasa de **58
   segundos** (`PODCAST_VOZ.segundosMaximoHistoria`; Meta acepta 60), la
   historia sube una copia cortada con fundido (`recortarParaHistoria`,
   `reels/duracion.mjs`), el reel sube entero y el registro deja un aviso
   amarillo.

Lo armado queda en `reels/salida/` (no va al repositorio) con un manifiesto,
`reels/salida/piezas.json`. Si una pieza falla al armarse, las demás siguen.
Si se arman varias juntas, **primero la más importante** (`porPrioridad`).

**5d. Lo ya armado hoy** (17/10, regla 208, `reels/armadas.mjs`): cada video
armado queda guardado en la memoria de voces (la caché de Actions) hasta que
sale. Si la pieza no llegó a publicarse (Instagram la rechazó, se cortó la
corrida), la vuelta siguiente sube **ese mismo video con su lista de notas**,
sin pedir voz, salvo que alguna de sus notas ya no esté publicada. Lo que ya
salió se borra de la memoria. `--de-nuevo` arma de cero.

### 6. Publicar las piezas

`node redes/publicar.mjs --piezas` llama a `publicarPiezas`
(`redes/publicar-piezas.mjs`):

1. Vuelve a filtrar con `piezasQueTocan`: sólo lo que está en hora y no está
   en el libro.
2. **Instagram primero, y manda.** El video se sube en dos pasos (Instagram da
   una dirección de subida y después se espera a que lo procese). Un solo
   intento: si falla, **no se intenta en Facebook**, para no dejar un video en
   una red y otro distinto en la otra si la vuelta siguiente elige otras notas.
3. **Después, la página de Facebook**, con el mismo video: hasta 3 intentos,
   esperando 4 y 8 segundos entre uno y otro. Si igual falla, se avisa y lo de
   Instagram queda.
4. **Cada reel se sube también como historia** en las dos redes (el mismo
   video: no gasta otra voz). Hasta 3 intentos en la misma corrida; **entre
   corridas el reloj no la reintenta** (el reel ya está en el libro, así que la
   pieza no vuelve a pedirse): para eso está el botón "Reintentar" del celular.
   Se anota en `libro.historiasDeReels`.
5. **El libro se guarda después de cada publicación**: si algo se corta a la
   mitad, lo que salió no vuelve a salir.
6. **El texto.** Las historias no llevan. Los reels llevan `pieDePieza`, que
   termina siempre con "Voz generada con inteligencia artificial."
   (`AVISO_DE_VOZ`). En los podcasts, desde el 16/10, **sólo los titulares** de
   sus notas, sin un enlace por nota (Hernán: "Instagram no los toma en el
   celular y es mucho"):
   - **en Instagram, ningún enlace**: "Todas las notas, en radarbalcarce.com
     (link en la bio)";
   - **en Facebook, UN solo enlace**, el de la nota del propio repaso en la web
     ("Las notas, acá: …/nota/repaso<día><turno>", `enlaceDelRepaso`, con el
     origen `utm_campaign=repaso`).
   - **El clima y la farmacia**, cuando salen como reel en Facebook (17/10,
     regla 210, `SERVICIOS_CON_PAGINA`), llevan el enlace a su página:
     `/clima` o `/farmacias`, con `utm_campaign=servicio`. Instagram, sin
     enlaces.

   Nunca la fuente.
7. **La dirección pública del podcast** (`permalink`) se le pide a Meta
   enseguida y se guarda en el libro: la usa la nota del podcast en la web.

Si Meta dice que el token murió, se corta todo en el acto.

### 7. Guardar los videos y completar direcciones

- Los `.mp4` y el manifiesto quedan **3 días** como artefacto de la corrida
  (Actions → la corrida → Artifacts), para mirarlos o subirlos a mano.
- **El archivo de piezas en R2** (15/10, regla 178, `redes/archivar-piezas.mjs`,
  guía en `docs/redes/ARCHIVO-DE-PIEZAS.md`): al final de "Redes", "Piezas" y
  "Fijar piezas", copia los videos, audios, subtítulos y placas a un depósito
  propio (`piezas/AAAA/MM/DD/<tipo>/`, con un `indice.json` por día). **Prendido**
  desde el 15/10: la variable `R2_PIEZAS` vale `radar-piezas` (sin ella diría "sin
  archivo de piezas" y seguiría). Nunca frena la publicación y no sube lo que espera a una persona ni lo
  retirado.
- **Completar las direcciones de los podcasts** (`--enlaces`,
  `completarEnlaces`): a Facebook le lleva un rato procesar un video y a veces
  no da la dirección enseguida. En cada vuelta se pregunta por los podcasts de
  los últimos 3 días que no la tienen, hasta 5 veces cada uno. Sólo pregunta:
  corre con las redes apagadas y nunca frena la corrida.

### 8. Guardar el libro en el repositorio

"Guardar lo publicado" commitea `web/data/redes.json` aunque un paso anterior
haya fallado (lo que salió no tiene que repetirse). Trae antes lo de las otras
corridas (`git pull --rebase`); si chocan en un archivo de `web/data/`, gana lo
de esta corrida; reintenta hasta 3 veces. Si no puede, termina en rojo con "la
vuelta siguiente puede repetir lo publicado".

### 9. Lo que pasa después, en otros lados

- **"Actualizar la web"** lee el libro: respeta la dirección con la que salió
  cada posteo aunque la IA cambie el titular, guarda en el archivo las notas
  que salieron en redes y arma **la nota propia de cada podcast**
  (`web/lib/notas-propias.js`, `06-WEB`).
- **"Vigilancia"** (cada media hora, la dispara el mismo Worker del reloj a los
  :00 y :30) cuenta el contrato del día, avisa lo que falta y a las 23:30 lo
  compara con lo que Meta tiene publicado ("Estadísticas y auditorías", más
  abajo). **Desde el 15/10 los avisos salen por mail** (`avisar`,
  `redes/avisar-por-mail.mjs`, por el Worker `radar-balcarce-vigilante`) y
  **WhatsApp es sólo el respaldo** si el mail no sale (regla 173; el cupo de
  CallMeBot estaba muerto desde el 1/10).
- **Los informes diarios por mail** de las 8:15 y las 21:15
  (`redes/informe-diario.mjs`, regla 176) cuentan lo que salió en las redes
  ese día; reemplazan al resumen de las 21 del vigilante.

## El cupo de voz

La clave de redes es gratis y Google le da **10 audios por día** del modelo de
voz (la clave y sus límites: `08-INFRAESTRUCTURA`; el modelo es
`gemini-3.8-flash-tts`, con dos voces propias que vencen el 29/09/2027). Un día
normal gasta 7: el clima de la mañana, "Un día como hoy", los tres repasos, la
farmacia y el clima de la noche. A veces se suman los útiles (los sábados), la
agenda (los jueves con eventos), el feriado y un aviso de clima; las de
participá no gastan mientras valga su versión armada de antemano ("Piezas
fijas", más abajo). La historia de cada reel no gasta: es el mismo video.

**El contador** (17/10, regla 208, `reels/cupo-voz.mjs`). Cada pedido a la voz,
también un reintento (audio vacío, error del servicio, "habló de más"), es un
audio: se anota **antes** de pedirlo en `cupo-<día>.json`, en la memoria de
voces (`VOZ_CACHE`, la caché de Actions de "Redes" y "Piezas"). El día es el de
Google (se renueva a la medianoche de California, las 4 o 5 de Balcarce). Cada
corrida que arma piezas dice "voz: N de 10 audios usados hoy, quedan M", y desde
8 lo marca en amarillo. Si Google contesta que se acabó, el contador se pone en
el tope y nadie vuelve a pedir ese día.

**El orden de importancia**: 1) los tres repasos; 2) el clima de la mañana, el
de la noche, la farmacia y los avisos de clima; 3) "Un día como hoy" y el
feriado; 4) lo opcional (participá, útiles, agenda). Antes de pedir una voz, el
plan mira qué piezas **más importantes** faltan hoy y siguen a tiempo
(`pendientesDelDia`, sin las fijas) y les guarda un audio a cada una
(`reservaPara`): si no alcanza, la pieza no se arma ("quedan 2 audios y se
guardan para 2 piezas más importantes") y nunca sale con otra voz.

**Lo que ya no gasta de más**: rearmar con el mismo texto (memoria de voces),
un audio que llegó pero no se terminó (se guarda crudo) y una pieza armada que
no salió (se sube el mismo video, paso 5d). Siguen gastando: un audio que duró
de más (`vozDeMas`) y lo que se corre a mano con la misma clave fuera de "Redes"
y "Piezas", que **todavía no pasa por el contador**: Auditar voz (6 audios, 9
con `explorar`), Probar Gemini (1), Crear voces (`crear` y `recrear`) y Fijar
piezas (uno por pieza). Si el cupo se acaba, la pieza de ese día no sale: nunca
con otra voz.

## Qué sale cada día: el contrato

Lo que **tiene** que salir cada día en cada red, en hora de Balcarce. Vive en
`redes/contrato.mjs` (`contratoDelDia`); los números, en `CONTRATO_DIARIO`
(`ingesta/criterio.mjs`, controlados contra la tabla de
`CRITERIO-EDITORIAL.md`); las horas y las ventanas, en `redes/piezas.mjs`. Rige
desde el 25/09 (`CONTRATO_DESDE`).

| Por red, por día | Facebook | Instagram |
|---|---|---|
| Reels (los tres podcasts; los de las otras piezas con voz, como "Un día como hoy", el contrato los sigue como extras: regla 147) | 3 | 3 |
| Historias de los podcasts | 3 | 3 |
| Historias de clima (mañana y noche) | 2 | 2 |
| Historia de la farmacia | 1 | 1 |
| **Historias en total** | **6** | **6** |
| Posteos de notas (tope; pueden ser menos) | hasta 5 posteos | hasta 5 espejos |
| Aparte, no cuentan en las 6 | "Un día como hoy" (todos los días con entrada preparada), teléfonos útiles (sábados), agenda (jueves, si hay eventos), participá (lun, mar, mié y vie), el feriado | igual |
| Techo de historias del día | 8 | 8 |

Cada pieza del contrato está en uno de tres estados:

- **salió**: está en el libro;
- **pendiente**: todavía no es su hora, o está dentro de su ventana;
- **falta**: la ventana se cerró y no salió. La historia de un podcast cuyo
  reel salió hace más de 15 minutos es "falta" enseguida (no se reintenta).

Los posteos se juzgan aparte: si a las 22 quedaron menos de 5, se mira si
**había candidatas** que cumplían todas las reglas y no salieron
(`candidatasSinPublicar`). "Sin más candidatas" es normal; "FALLA: había N
candidata(s)", no. Un posteo sin su espejo en Instagram cuenta como incompleto.

El contrato también busca **duplicados que dejan rastro**: el mismo número de
Meta bajo dos piezas o el mismo enlace en dos posteos. Dos publicaciones que se
pisan en la misma entrada del libro no se ven en el libro: sólo las ve la
auditoría contra Meta.

## Las piezas, una por una

Todas comparten: vertical de 1080 × 1920, fondo papel, la marca "Radar
Balcarce" abajo, texto sólo entre las filas 250 y 1580 (`ZONA_TEXTO`: lo de
afuera lo tapa la interfaz de Instagram) y subtítulos debajo. Qué dice cada
una, frase por frase, lo decide `CRITERIO-REDES.md` § 3 ("Una ficha por pieza")
y lo arma `redes/guiones.mjs`.

| Pieza | Guion (`redes/guiones.mjs`) | Placa (`reels/placa.mjs`) | Qué muestra la placa |
|---|---|---|---|
| Clima de la mañana | `guionClima` | `placaClima` | La tarjeta oscura del clima ahora (temperatura, cielo, sensación térmica, viento), hoy y los dos días que siguen. Sin dólar: si se mueve, sale como nota propia |
| Clima de la noche | `guionClimaNoche` | `placaClima` | "Cómo sigue el día": ahora, la mínima de esta noche, mañana y pasado, con el pronóstico de mañana en una frase |
| Aviso de clima | título y texto del aviso | `placaClima` con recuadro | La tarjeta del clima con el recuadro del aviso: el título se ve de reojo y abajo va lo que hay que saber; acento en el color de Policiales |
| Farmacia de turno | `guionFarmacia` | `placaFarmacia` | La farmacia (o las dos) de turno, la dirección y "De turno hasta mañana a las 8:30" (`hastaCuandoElTurno`). El turno lo decide la web (`02-INGESTA`) |
| Teléfonos útiles | `guionUtiles` | `placaUtiles` | Los números de `NUMEROS` (`ingesta/utiles.mjs`), por categoría |
| Agenda | `guionAgenda` | `placaAgenda` | Los eventos de los próximos 4 días de la agenda publicada (`web/data/agenda.json`) |
| Los tres podcasts | `armarPodcast` vía `repasoConPresupuesto` | `placaRepaso` | "Repaso · tapa": el nombre del podcast en el color del día y la lista numerada de sus notas, cada una con el color de su sección |

### Los podcasts

Tres por día: **"El repaso de la mañana"** (`noticia1`, 10:00), **"El repaso
de la tarde"** (`noticia2`, 15:00) y **"El repaso del día"** (`podcast`,
21:00). La lista es una sola, `PODCASTS` (`redes/piezas.mjs`). No hay historias
ni reels de una sola nota: dichas de a una sonaban raras.

**Qué notas entran** (`elegirParaPodcast`, `redes/elegir.mjs`; números en
`PIEZAS`, `ingesta/criterio.mjs`):

0. **Primero, lo que pidió una persona** (16/10): una nota propia de una pista
   o de un mail de prensa (`docs/04-REDACCION.md`, paso 16) aprobada para las
   redes (`aprobadaParaRedes`) y marcada `paraElRepaso` entra al **próximo**
   repaso sin pasar por el puntaje, durante 12 horas desde que se aprobó
   (`notaDePistaParaLosRepasos`, `web/lib/notas-de-pistas.js`). Deja al menos un
   lugar para las demás. Caso: el Festival Cervantino de Azul.
1. Sólo las que pueden ir en un repaso (`sePuedeEnUnRepaso`): ni roja, ni
   Política ni Policiales, con cuerpo, que no sea nota propia (salvo la de una
   pista aprobada para las redes) y, si la publicó una persona, que la haya
   marcado para las redes. **De Balcarce
   primero** (`esParaLasRedes`, la misma regla que Facebook); **de afuera**,
   desde el 29/09, sólo con relevancia 80 o más (también a la noche) **y, desde el
   17/10 (regla 280), que las cuenten 5 medios o más** (`esPopularParaRedes`), y **dos
   como mucho por repaso**, las de más puntaje (`PIEZAS.relevanciaAfueraPodcast`
   y `PIEZAS.notasDeAfueraPorPodcast`; Hernán: "podrían ser también fuera de
   Balcarce si son las mejores rankeadas"). Compiten por puntaje con las de acá.
2. **Los tres, 4 notas** (29/09; eran 3 a la mañana y a la tarde), y **ninguno
   repite** una nota ni un tema que ya contó otro repaso de hoy o de los dos días
   anteriores (`notasContadasEnPodcasts`, `repasosDelDia` en `redes/repasos.mjs`).
3. **Mañana y tarde:** relevancia 62 o más. **Noche:** lo que dejó el día y
   todavía no se contó, sin piso de relevancia. Un día flojo, un repaso sale con
   las notas nuevas que haya (hasta 2).
4. El mismo hecho contado por dos medios cuenta una vez (`mismoTema`: comparten
   una palabra rara de siete letras o más; más estricto que el `temaParecido`
   de Facebook, a propósito).
5. Primero una nota por sección, para que no sean cuatro del mismo evento; si
   sobra lugar, se completa por puntaje.
6. **Con menos de 2 notas, ese podcast no sale** (el contrato lo marca como
   "falta" y el vigilante aclara "si ese día no había notas para contar, es
   normal").

**El guion** (`repasoConPresupuesto`): el saludo de su hora, cada nota con su
titular y, **sólo si el texto es nuestro** (de la IA o de una persona), la
primera oración de la bajada; y el cierre de su hora, que dice "radarbalcarce
punto com". La fuente no se nombra nunca. Tiene **presupuesto de 55 segundos**
(por palabras, `segundosDePodcast`): si no entra, se saca primero la oración de
contexto de las notas, de la última a la primera, y después notas del final,
hasta un mínimo de dos. El pie del reel muestra las notas que quedaron.

**Un color por día** (`colorDelDia`, `COLORES_DEL_DIA`): los tres podcasts del
día comparten color (domingo magenta, lunes el rojo de la marca, martes verde,
miércoles azul, jueves ámbar, viernes violeta, sábado verde azulado), para
distinguirlos en la grilla de Instagram.

**La nota del podcast en la web:** cuando el libro registra un podcast con dos
notas o más, la corrida siguiente de "Actualizar la web" arma su nota propia
con los enlaces a Instagram y Facebook (`06-WEB`, `CRITERIO-EDITORIAL.md` § 8).

## Las plantillas y la foto

Fondo papel, títulos en serif grandes, la marca abajo y el color de cada
sección como acento (el lienzo "Radar Balcarce · Plantillas redes", aprobado
por Hernán el 28/09). Las letras son las del sitio (Source Serif 4 e Inter) y
los colores de sección, los de la web (`--s-*` de `web/app/globals.css`; una
prueba controla que coincidan).

| Qué | Archivo | Medida | Dónde se ve |
|---|---|---|---|
| Placas de historias y reels | `reels/placa.mjs` (`placaRepaso`, `placaClima`, `placaFarmacia`, `placaUtiles`, `placaAgenda`) | 1080 × 1920 | Instagram y la página de Facebook |
| Tarjeta del espejo | `web/lib/tarjeta.js` (`tarjeta(nota, { instagram: true })`), servida en `/nota/ID/instagram.png` | 1080 × 1350 (4:5) | El feed de Instagram y, desde el 5/10, el posteo de Facebook |
| Tarjeta para compartir | `web/lib/tarjeta.js` (`tarjeta(nota)`), servida por `opengraph-image` | 1200 × 630 | Facebook con enlace, WhatsApp, X |
| Las cuentas de las tarjetas (colores, cuerpos del título, qué entra, zonas) | `web/lib/tarjeta-diseno.js` | — | Se prueban sin levantar el sitio (`pruebas/placas.test.mjs`) |

- Las tarjetas se generan **al compilar el sitio**, una por nota (las de la
  portada y las archivadas que salieron en redes, `notasConImagen`), y quedan
  como archivos estáticos. La tarjeta de Instagram tiene el texto entre las
  filas 135 y 1215, porque la grilla del perfil la recorta.
- **La foto.** La tarjeta de Instagram lleva la foto de la nota del banco
  propio (`web/data/banco-fotos.json`, `05-FOTOS`), recortada y sin el crédito
  adentro; el crédito va al final del texto del posteo (`conCreditoDeFoto`,
  `redes/elegir.mjs`). La misma constante, `FOTO_EN_INSTAGRAM`
  (`web/lib/tarjeta-diseno.js`, en `true`), la leen la imagen y el texto, así
  nunca sale un crédito sin foto ni una foto sin crédito; en `false`, todas
  vuelven a la placa. La tarjeta para compartir también lleva la foto
  (`FOTO_EN_ENLACE`, `paraCompartirConFoto`). **Sin foto que sirva**, la "placa
  sin foto": el bloque de color de la sección con los anillos del radar. Los
  videos van siempre con placa.
- Colores, letras, íconos y el catálogo de plantillas: `MEDIA-KIT.md`. Medidas
  y zonas seguras: `FORMATOS.md` y `redes/formatos.mjs`.
- El avatar (`reels/avatar.mjs`) y la portada de Facebook (`reels/portada.mjs`)
  se generan a mano en la PC y los sube una persona (`PARA-CARGAR-A-MANO.md`).

## La voz y los guiones

Todo lo que tiene que ver con **cómo suena** está en `CRITERIO-REDES.md`, y el
código lo lee de ahí, sin copias:

- `redes/prompt-redes.mjs` lee de ese documento, entre marcas `<!-- … -->`, la
  identidad ("Radar Balcarce", `radarbalcarce.com`, cómo se dice la dirección),
  las dos voces propias (locutora y locutor, con su identificador), qué voz dice
  cada pieza y los estilos (el de siempre y los de mañana, tarde y noche). Si
  falta una parte, **falla a la vista** en vez de hablar sin criterio (y
  `npm test` lo controla).
- `redes/guiones.mjs` es el libro de recursos hecho código: saludos, aperturas,
  conectores, comentarios del clima, cierres y el guion de cada pieza. La
  variedad es **determinística**: cada frase se elige con una semilla hecha de
  la fecha, la pieza y el lugar de la frase; el mismo día y la misma pieza dan
  siempre el mismo texto. `revisarTexto` controla las reglas de toda pieza
  (nunca nombrar un medio, nunca ".ar", nunca "en vivo", el saludo de su hora);
  la usan las pruebas (`pruebas/redes-criterio.test.mjs`) sobre los bancos de
  frases, no cada pieza al publicarla.
- **La línea editorial del día** (18/10, regla 301; `redes/linea-del-dia.mjs`): el día de piezas es una historia contada en capítulos. Todas comparten
  estructura (gancho de 3 segundos, cuerpo, un enlace hacia lo que viene, lo ya contado retomado por tema sin repetir el titular, y el **mismo llamado en toda la
  fecha**), un trato (vos de locutor, ustedes para desear; nunca tuteo) y su voz. Se aplica en el plan (`aplicarLineaDelDia`, `reels/plan.mjs`) después de la
  memoria del día; cada frase que se suma se pesa contra el tope de su pieza (repaso 55 s, clima y farmacia 25) y, si no cabe, no se suma. Un día completo con
  datos reales, en [`redes/GUION-DEL-DIA-EJEMPLO.md`](redes/GUION-DEL-DIA-EJEMPLO.md); para rehacerlo, `node reels/guion-del-dia.mjs` (no cuesta nada). Una
  consecuencia a tener presente: el guion de una pieza ya no depende sólo de la fecha, también de qué piezas hay en el plan y cuáles salieron; una pieza
  que se reintenta después de que salió otra puede cambiar una frase de enlace y pedir un audio nuevo (el contador de voz lo cuenta, regla 208).
- Dos reglas de fondo: **la voz no lee la placa** (la placa muestra el dato, la
  voz cuenta qué significa) y **la fuente no se nombra nunca en redes**.
- La voz de verdad se comprueba a mano con el workflow **Auditar voz**
  (`reels/auditar-voz.mjs` y `redes/auditoria-voz.mjs`): genera 6 clips cortos
  con la misma ruta de producción, le pide la transcripción a Gemini y controla
  que diga "Radar Balcarce", que la dirección termine en "punto com" y que el
  saludo sea el de la hora (`CRITERIO-REDES.md` § 7). Gasta 6 audios del cupo
  de voz del día: no correrlo un día normal de redes sin necesidad.
- Las voces se crean con el workflow **Crear voces** (`reels/crear-voces.mjs`) y
  viven en el proyecto de Google de la clave de redes. Vencen al año; el
  vigilante avisa 30 días antes (`08-INFRAESTRUCTURA`; el paso a paso para
  crearlas de nuevo, en `11-OPERACION`). **Para pasar a la clave paga** (18/10,
  regla 302), el procedimiento, la prueba de parecido (`reels/parecido-de-voz.mjs`:
  ritmo, tono, rango, brillo, pausas y duración) y cuántos audios gasta cada paso
  están en [`redes/VOCES-NUEVAS.md`](redes/VOCES-NUEVAS.md).

## El libro: `web/data/redes.json`

Es la memoria de las redes. Va al repositorio (lo commitean "Redes" y "Piezas")
y lo leen casi todos. Las partes principales:

| Parte | Clave de cada entrada | Qué guarda | Lo escribe |
|---|---|---|---|
| `facebook` | el id de la nota | cuándo, número del posteo (`postId`), titular, enlace, temas; `intentosEspejo` si el espejo falló | `redes/publicar.mjs --facebook` |
| `instagramFeed` | el id de la nota | cuándo, número de la foto (`mediaId`), titular, enlace | el espejo, el mismo programa |
| `instagram` | `AAAA-MM-DD/nombre` (por ejemplo `2026-09-28/noticia1`) | cuándo, `mediaId`, tipo (`REELS` o `STORIES`), `notaId` y `notaIds` (las notas que contó), `permalink`, `intentosEnlace` | `publicarPiezas` |
| `facebookVideos` | igual que `instagram` | lo mismo, para la página de Facebook | `publicarPiezas` |
| `historiasDeReels` | `red/AAAA-MM-DD/nombre` | el reflejo de cada podcast como historia, por red | `publicarPiezas` |
| `reelsEnFacebook` | `AAAA-MM-DD/nombre` | el clima y la farmacia subidos además como reel a Facebook (8/10) | `publicarPiezas` |
| `facebookFoto` | el id de la nota | los intentos fallidos de publicar el posteo como foto (a los 3, sale como enlace) | `redes/publicar.mjs --facebook` |
| `problemas` | `dia/pieza/red/parte` | lo que no salió, tres días, hasta que sale (1/10) | `publicarPiezas` |

Lo leen `elegirParaFacebook` (no repetir nota ni tema, contar los del día), el
reloj y `piezasQueTocan` (qué ya salió), el plan (qué notas ya se contaron),
`redes/contrato.mjs`, `redes/vigilar.mjs` y `redes/avisos.mjs` (el contrato y
los avisos), `redes/auditar-redes.mjs` (contra Meta) y
`web/scripts/generar-datos.mjs` (enlaces fijos, archivo, notas de los podcasts,
estadística diaria). **No se edita a mano**: si una entrada se borra, esa pieza
o ese posteo puede volver a salir.

## Estadísticas y auditorías

| Qué | Cuándo | Archivo | Qué mira | Cómo se entera uno |
|---|---|---|---|---|
| **Lo que salió en redes** | cada corrida de Vigilancia | `redes/avisos.mjs` (`novedadesEnRedes`) | El libro desde la corrida anterior, agrupado (el mismo podcast en las dos redes es una línea) | Mail del vigilante (WhatsApp de respaldo) "📣 Salió en redes"; y los informes diarios de las 8:15 y 21:15 |
| **El contrato del día** | cada corrida | `redes/contrato.mjs`, `redes/vigilar.mjs` (`problemasDelContrato`) | Faltas, duplicados en el libro, posteos sin espejo; con las redes apagadas, sólo lo dice una vez por día | Mail de problemas (cada 6 h por problema; WhatsApp de respaldo); el contrato de cada red va en los informes diarios por mail |
| **El cierre del día** | desde las 23:30 (si se atrasa, hasta las 3:00 cierra el día anterior), una vez | `redes/vigilar.mjs` (`fechaDelCierre`, `cierreDelDia`) con `redes/auditar-redes.mjs` (`informeDelDia`) | El día contra lo que Meta tiene de verdad: faltantes, duplicados (dos iguales a menos de 30 minutos), libro sin Meta y Meta sin libro (tolerancia de 20 minutos) | Mail **sólo si hay discrepancias**; si todo cuadra, "✓ Cierre del día…" viaja en el próximo mensaje. Con las redes apagadas se saltea |
| **Estadísticas** | 9 y 21 | `redes/estadisticas.mjs`, guarda `web/data/estadisticas.json` (sólo números, 120 mediciones) | Visitas de Cloudflare Web Analytics (aproximadas) y seguidores de Facebook e Instagram; vistas, alcance e interacciones (`META_TOKEN` tiene `read_insights` e `instagram_manage_insights`) | Los informes diarios por mail (8:15 y 21:15; regla 176) |
| **Los números de cada pieza** | cada corrida de Vigilancia, hasta 12 publicaciones | `redes/estadisticas-piezas.mjs`, guarda `web/data/estadisticas-piezas.json` | Cada publicación una vez: reels, posteos y fotos a las 24 h o más (hasta 8 días); las historias de Instagram entre 12 y 24 h. **Arreglado el 17/10 (regla 207)**: los reels de Facebook se miden con las métricas de reels (`blue_reels_play_count`, `fb_reels_total_plays`, `post_impressions_unique`…); las historias de Facebook por su **posteo** (`postId` en el libro, o `/{página}/stories` para las viejas) con `page_story_total_media_view_unique` (API v25) y las de un posteo de respaldo; las historias de Instagram que vieron menos de 5 personas quedan como `pocas` (Meta no las mide). Lo medido con la forma vieja se vuelve a medir una vez | `node redes/estadisticas-piezas.mjs` muestra el resumen de cuatro semanas (para decidir el 5/11 dónde sale cada pieza) |
| **Auditar redes** (el workflow se borró el 17/10/2026) | un día: "Vigilancia" → `probar-cierre`; la semana: la "Auditoría" de los lunes; a mano en la PC, `node redes/auditar-redes.mjs [--fecha=… \| --semana \| --crudo]` | `redes/auditar-redes.mjs` | Hoy, ayer, la semana (% de cumplimiento por red y pieza) y lo que devuelve Meta sin interpretar | El registro de la corrida |
| **La semana del contrato** | lunes 9:00 | `redes/auditar-redes.mjs --semana`, dentro de `auditoria.yml` | Igual que la semana de arriba | El registro |
| **Auditoría semanal** | lunes 9:00 | `redes/auditar.mjs` (`auditoria.yml`), guarda `web/data/auditoria.json` | Que la tarjeta de Instagram mida 1080 × 1350 y la de compartir 1200 × 630, los íconos, el SEO en vivo y que las medidas de `redes/formatos.mjs` no tengan más de 90 días | Mail si hay problemas; el vigilante avisa si no corre hace más de 10 días |
| **Ver Facebook** | a mano | `redes/ver-facebook.mjs` (`ver-facebook.yml`) | Qué hay publicado de verdad en la página: posteos, reels, historias, con fecha | El registro || **Auditar voz** | a mano | `reels/auditar-voz.mjs` (`auditar-voz.yml`) | Ver "La voz y los guiones" | El registro (PASA/FALLA) |

Límite de lo que Meta deja ver: **las historias sólo se ven mientras están
activas (24 horas)**. Por eso el cierre es a las 23:30, y la auditoría de días
anteriores cuenta las historias por el libro y lo dice.

## Cómo está conectado con Meta

- **Instagram** `@radarbalcarce`: cuenta profesional, vinculada a la página de
  Facebook "Radar Balcarce".
- **La página de Facebook**: su identificador para la API es
  **`1254237411116171`** (Configuración del negocio → Páginas →
  Identificador). El número de la dirección `facebook.com/profile.php?id=…`
  (61594865361170) es el del perfil y la API lo rechaza. En el código hay uno
  solo, `PAGINA_DE_FACEBOOK` (`redes/meta.mjs`), que se puede pisar con la
  variable `META_PAGE_ID` (no está cargada).
- **La app de Meta** "Radar Balcarce Publicador" (ID `2302218363874399`), en el
  portfolio comercial "Radar Balcarce", con los casos de uso Threads, Instagram
  y Páginas, y los permisos `pages_manage_posts`, `pages_read_engagement`,
  `pages_show_list`, `instagram_basic` e `instagram_content_publish`. Está
  **publicada (modo activo)** desde el 26/09: en modo desarrollo publicaba,
  pero el público no veía los posteos ni los reels de Facebook.
- **El usuario del sistema** `publicador-radar`, con la página (Contenido y
  Estadísticas), el Instagram (Contenido y Estadísticas) y la app. Su token
  **no vence** y es el secreto `META_TOKEN`. Ya tiene `read_insights` e
  `instagram_manage_insights` (verificado el 1/10/2026): las estadísticas de Meta andan.
- **Por qué todo lo de Instagram es video:** la API no acepta una imagen que no
  esté en una dirección pública, y no se alojan archivos sueltos; el video sí
  se le entrega directo. La única foto es el espejo, porque su tarjeta ya está
  publicada en el sitio.

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `.github/workflows/redes.yml` | La corrida: Facebook, piezas, direcciones y libro | El Worker `radar-balcarce-reloj` (:05, :35 y :45) y el final de "Actualizar la web"; a mano (`reloj`, `verificar`, `facebook`) | `META_TOKEN`, `GEMINI_API_KEY_REDES`, `REDES_ACTIVAS`, `R2_PIEZAS` | commit de `web/data/redes.json`; artefacto con los videos (3 días); el archivo de piezas en R2 (apagado) |
| `.github/workflows/piezas.yml` | Armar (y si se pide, publicar) piezas a mano | una persona, Actions → Piezas | `solo` (vacío no arma nada), `todas`, `publicar`, `destino`; los mismos secretos | artefacto (7 días); el libro si publicó |
| `redes/publicar.mjs` | El programa: `--verificar`, `--facebook`, `--piezas [--sin-horario] [--destino=…]`, `--enlaces` | los dos workflows | `portada.json`, `redes.json`, `reels/salida/piezas.json` | `redes.json` |
| `redes/medios-contados.mjs` | Cuántos medios distintos cuentan una nota (los del mismo dueño, uno): la barra de lo de afuera (regla 280) | `elegir.mjs` | `ingesta/fuentes*.mjs` | — |
| ~~`redes/texto-por-red.mjs`~~ | Borrado el 24/10 (regla 309): era el texto para Threads, X, Telegram, Bluesky, TikTok, YouTube y WhatsApp, redes sin cuenta; está en el historial de git | — | — | — |
| `redes/enlaces-cortos.mjs` | La gramática `/r/<red>/<destino>` y el interruptor `ENLACES_CORTOS` (regla 282) | `elegir.mjs`, el Worker de enlaces | — | — |
| `redes/foto-cambiada.mjs` | Qué posteos de Facebook cambiaron de foto después de salir (regla 283) y la espera a la foto real | `publicar.mjs`, `elegir.mjs` | — | — |
| `redes/elegir.mjs` | Qué se publica: reglas de Facebook (`vaAFacebookPorLoQueEs`, `esPopularParaRedes`), texto del posteo, hashtags fijos, qué notas cuenta cada podcast y su guion con presupuesto, el interruptor | `publicar.mjs`, `reels/plan.mjs`, contrato, avisos | `ingesta/criterio.mjs`, `web/lib/cuerpo.js` | — (funciones puras) |
| `redes/espejo.mjs` | Qué espejos reintentar | `publicar.mjs` | el libro y la portada | — |
| `redes/reloj.mjs` | ¿Toca alguna pieza ahora? (sin farmacia de turno en la web, no la pide) | `redes.yml` | `redes.json`, el clima y la farmacia de `portada.json` | `hay` y `solo` |
| `redes/piezas.mjs` | Cronograma, ventanas, podcasts, aviso de clima, pie de los reels (con los enlaces a `/clima` y `/farmacias`), techo de historias | reloj, plan, publicar-piezas, contrato, vigilante | `redes/horarios.mjs`, `ingesta/utiles.mjs`, `ingesta/alertas.mjs` | — |
| `redes/publicar-piezas.mjs` | Sube los videos: Instagram manda, Facebook con reintentos, la historia de cada reel; completa direcciones | `publicar.mjs` | manifiesto y videos | el libro |
| `redes/datos.mjs` | Traduce `portada.json` a los datos del plan | `reels/plan.mjs` | `portada.json` | — |
| `redes/meta.mjs` | Habla con Meta (Graph v23.0): posteo, foto, video, dirección pública, verificación; `PAGINA_DE_FACEBOOK`. Token en el encabezado, nunca en la dirección | todo lo que publica o lee Meta | `META_TOKEN` | — |
| `redes/contrato.mjs` | El contrato del día y sus textos | vigilante, avisos, auditar-redes | libro, portada | — |
| `redes/guiones.mjs` | Lo que dice la voz en cada pieza | plan, elegir | `ingesta/criterio.mjs`, `prompt-redes.mjs` | — |
| `redes/prompt-redes.mjs` | Lee identidad, voces y estilos de `CRITERIO-REDES.md` | guiones, plan, reel, voz | `CRITERIO-REDES.md` | — |
| `reels/plan.mjs` | El plan del día y, con `--generar`, los videos (primero lo más importante, con la reserva del cupo y lo ya armado hoy) | los workflows | `portada.json`, libro, dólar, agenda publicada, banco de fotos | `reels/salida/*.mp4`, `*.png`, `*.mp3`, `piezas.json` |
| `reels/reel.mjs` | Arma un video: placa o escena o secuencia, voz, subtítulos, ffmpeg, recorte para historia | `plan.mjs` | la pieza | archivos en `reels/salida/` |
| `reels/escenas/repaso.mjs` | La secuencia del repaso: una placa por nota con su foto, la lista al final y de tapa, y cuándo entra cada una según la voz (regla 209) | `plan.mjs`, `reel.mjs` | `web/public/fotos-notas/`, `banco-fotos.json` | — |
| `reels/cupo-voz.mjs` | El contador de audios del día y el orden de importancia (regla 208) | `voz-gemini.mjs`, `plan.mjs` | `VOZ_CACHE` | `cupo-<día>.json` en la memoria de voces |
| `reels/armadas.mjs` | Lo ya armado hoy que no salió: se sube igual, sin voz (regla 208) | `plan.mjs` | `VOZ_CACHE` | `armada-<día>-<pieza>.*` en la memoria de voces |
| `reels/placa.mjs` | Dibuja las placas (SVG) y las pasa a PNG | `plan.mjs`, `reel.mjs` | `reels/marca/fuentes/` | PNG |
| `reels/voz-gemini.mjs` | La voz de Gemini: pedido, contador del cupo, memoria (también el audio crudo), audio que dura de más | `reel.mjs`, Auditar voz | `GEMINI_API_KEY_REDES` (`reels/claves.mjs`) | mp3 |
| `reels/voz.mjs` | `paraLeer` (los símbolos en palabras) y `enCarteles` (los carteles de subtítulos) | `reel.mjs` | — | — |
| `reels/alinear.mjs`, `reels/tiempos.mjs` | Cuándo arranca cada palabra del subtítulo | `voz-gemini.mjs` | el audio | — |
| `reels/duracion.mjs` | El máximo de una historia (58 s) y el recorte | `reel.mjs` | — | — |
| `reels/crear-voces.mjs` | Crear, listar y borrar las voces propias; `referencia`, `recrear` con versiones y `comparar` (regla 302) | "Crear voces" | `GEMINI_API_KEY_REDES` | audios de prueba (artefacto), `reels/referencias-de-voz/` |
| `reels/parecido-de-voz.mjs`, `reels/texto-de-comparacion.mjs` | Cuánto se parece una voz a otra y cuál elegir (sin Gemini, cuesta 0); el texto fijo de la prueba | `crear-voces.mjs`, la línea de comandos | ffmpeg | `comparacion.md` |
| `redes/linea-del-dia.mjs`, `reels/guion-del-dia.mjs` | La línea editorial del día: enlaces, ganchos de continuidad, lo retomado y el llamado; y el guion del día entero para revisarlo | `reels/plan.mjs` | `redes/guiones.mjs` | `p.linea` de cada pieza |
| `reels/auditar-voz.mjs`, `redes/auditoria-voz.mjs` | La auditoría de la voz real | "Auditar voz" | `GEMINI_API_KEY_REDES` | — |
| `web/lib/tarjeta.js` | Las tarjetas de cada nota (compartir e Instagram) | las rutas de Next al compilar | la nota, `reels/marca/fuentes/`, la foto del banco | PNG estáticos del sitio |
| `web/lib/tarjeta-diseno.js` | Medidas, colores, cuentas y `FOTO_EN_INSTAGRAM` | `tarjeta.js`, `publicar.mjs` | `banco-fotos.json` | — |
| `redes/vigilar.mjs`, `redes/avisos.mjs` | El vigilante: contrato, cierre, avisos por mail con WhatsApp de respaldo (`redes/avisar-por-mail.mjs`, `08-INFRAESTRUCTURA`) | `vigilancia.yml` | libro, portada, auditoría, GitHub, Meta | `web/data/vigilancia.json`, `estadisticas.json` |

| `redes/avisar-por-mail.mjs` | `avisar`: primero mail (Worker `radar-balcarce-vigilante`, `VIGILANTE_TOKEN`), WhatsApp sólo si el mail no sale (regla 173) | vigilante, auditorías, pistas, workflows | `VIGILANTE_TOKEN`, `WHATSAPP_*` | — |
| `redes/informe-diario.mjs` | Los informes por mail de las 8:15 y las 21:15 (regla 176) | `informe-diario.yml` (lo dispara el reloj) | portada, libro, estadísticas, esperando cuerpo | — (manda el mail) |
| `redes/archivar-piezas.mjs` | Copia las piezas a R2 (regla 178; `R2_PIEZAS` = `radar-piezas`, cargada el 15/10) | `redes.yml`, `piezas.yml`, `fijar-piezas.yml` | `reels/salida/`, el libro | el depósito de R2 |

El libro (`web/data/redes.json`) tiene su sección más arriba, y los archivos de
las estadísticas y las auditorías están en su tabla.

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Prender o apagar las redes | Variable `REDES_ACTIVAS` en GitHub (`Si` / otra cosa), sin tocar código (`11-OPERACION`) |
| Que una nota aprobada por una persona vaya también a las redes | Panel del celular → "También a Facebook e Instagram" (`09-PANEL`) |
| Cambiar cuántos posteos, la relevancia, el horario, la espera o la separación de Facebook | `FACEBOOK` en `ingesta/criterio.mjs` **y** la tabla "Los números" de `CRITERIO-EDITORIAL.md` (una prueba controla que coincidan) |
| Que otras notas (no sólo de Balcarce) vayan solas a las redes | `esParaLasRedes` y `vaAFacebookPorLoQueEs`, `redes/elegir.mjs` (decisión editorial: preguntar antes) |
| Qué secciones nunca salen solas | `SECCIONES_QUE_ESPERAN_PERSONA`, `ingesta/criterio.mjs` |
| Cuándo dos notas son "el mismo tema" | `temaParecido` (Facebook) y `mismoTema` (podcasts), `redes/elegir.mjs` |
| El texto del posteo, la frase del enlace, los hashtags | `mensajeDeNota`, `FRASES_DEL_ENLACE`, `hashtagsDe`, `redes/elegir.mjs` |
| Cuántas notas cuenta un podcast, su relevancia mínima, su presupuesto | `PIEZAS` y `PODCAST_VOZ`, `ingesta/criterio.mjs` (y la tabla del criterio) |
| La hora de un podcast | `HORAS_REELS`, `redes/piezas.mjs` |
| Que una nota de una pista o de un mail entre al próximo repaso | `aprobadaParaRedes` y `paraElRepaso` en su entrada de `web/data/notas-de-pistas.json` (12 horas) |
| El texto de los reels y de los posteos (enlaces, "link en la bio") | `pieDePieza` y `enlaceDelRepaso` (`redes/piezas.mjs`); `mensajeDeNota` (`redes/elegir.mjs`) |
| La hora de una historia fija (clima, farmacia, útiles, agenda) | `HISTORIAS_FIJAS`, `redes/horarios.mjs` |
| Hasta cuándo vale una pieza | `VENTANAS`, `redes/piezas.mjs` |
| Los umbrales del aviso de clima | `UMBRALES`, `ingesta/alertas.mjs` |
| Cómo se ve el repaso (la placa de cada nota, la foto, la tapa) | `placaDeNotaDelRepaso` y `secuenciaDelRepaso` (`reels/escenas/repaso.mjs`); la lista, `placaRepaso` (`reels/placa.mjs`) |
| El orden de importancia de las piezas para el cupo de voz | `PRIORIDAD`, `reels/cupo-voz.mjs` |
| El contrato (cuántas piezas por día, el techo, la hora del cierre) | `CONTRATO_DIARIO`, `ingesta/criterio.mjs` y su tabla; las piezas, `redes/contrato.mjs` |
| Qué dice la voz, los saludos, los cierres, qué voz dice cada pieza | `CRITERIO-REDES.md` (identidad, voces y estilos) y `redes/guiones.mjs` (bancos de frases) |
| El dibujo de una placa | `reels/placa.mjs` (y `MEDIA-KIT.md`) |
| El dibujo de las tarjetas de las notas | `web/lib/tarjeta.js` y `web/lib/tarjeta-diseno.js` |
| Que el espejo lleve (o no) la foto de la nota | `FOTO_EN_INSTAGRAM`, `web/lib/tarjeta-diseno.js` |
| Una medida de imagen de las redes | `redes/formatos.mjs` y `FORMATOS.md` |
| Cuántas veces se reintenta en Meta | `INTENTOS_SECUNDARIA`, `INTENTOS_HISTORIA`, `INTENTOS_ENLACE` (`redes/publicar-piezas.mjs`); `ESPEJO` (`redes/espejo.mjs`) |
| Cómo se habla con Meta, o el identificador de la página | `redes/meta.mjs` (`PAGINA_DE_FACEBOOK`) |
| Qué avisa el vigilante de las redes | `problemasDelContrato` y `evaluar`, `redes/vigilar.mjs` |

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| **El reloj deja de disparar Redes** (el Worker `radar-balcarce-reloj`; hasta el 15/10, cron-job.org) | Aviso "El reloj de Redes no corre" (alta). Igual arranca al final de cada "Actualizar la web", así que se nota poco | Mirar Cloudflare → Workers → `radar-balcarce-reloj` (`11-OPERACION`) |
| **Las redes están apagadas** (`REDES_ACTIVAS` no dice `Si`) | Aviso una vez por día: "Las redes están apagadas…"; y lo dicen los informes diarios por mail | Prenderlas si no fue a propósito |
| **El token de Meta murió** (código 190) | Redes en rojo: "El token venció o lo revocaron" | Una persona genera otro y lo pega en `META_TOKEN` |
| **Meta bloquea la API** ("API access blocked", pasó del 22 al 24/09 por "actividad inusual") | Fallan Redes y Piezas | Una persona confirma la cuenta en Meta; después, mirar que el reloj siga disparando |
| **Falló Instagram al subir una pieza** | La pieza no sale en ninguna red; el reloj la vuelve a pedir mientras dure la ventana y sube el mismo video (no gasta otro audio, regla 208) | Nada, salvo que se repita: mirar el registro |
| **Falló Facebook después de Instagram** | Registro "falló (intento 3 de 3)"; el contrato marca la falta en Facebook | Una historia fija (clima, farmacia): Piezas con esa pieza, `publicar` y destino `facebook`. Un podcast: Piezas no sirve (no vuelve a armar un podcast que ya está en el libro de Instagram): bajar el video del artefacto de esa corrida de Redes (3 días) y subirlo a mano |
| **No salió la historia de un podcast** | Aviso por mail: "no salió la historia de… (su reel sí salió y la historia no se reintenta)" | No hay forma automática. Si importa, bajar el `.mp4` del artefacto de esa corrida y subirlo a mano como historia; el libro no se entera y el contrato la sigue contando como falta |
| **No salió una pieza fija** (clima, farmacia) | Aviso por mail: "No salió la pieza… y ya se cerró su ventana" | Mirar el registro de Redes (la voz, el cupo, `META_TOKEN`); publicarla con Piezas si todavía sirve y queda cupo de voz |
| **No salió un podcast** | Aviso por mail de falta del reel | Si "ese día no había notas para contar", es normal |
| **Gemini (voz) no contesta** | La pieza no sale en esa vuelta ("la pieza no sale con otra voz") y se reintenta en la siguiente | Si se repite toda la ventana: el vigilante avisa si Google rechaza la clave de redes (`clave-…`) o si una voz ya no existe (`voz-…`); si no, mirar el modelo de voz |
| **Se acabó el cupo de voz del día** | Registro de Redes: "voz: 10 de 10 audios usados hoy" o "Gemini: se acabó el cupo del día (429)"; faltan piezas, primero las opcionales | Nada: vuelve al día siguiente. No correr Piezas, Auditar voz, Probar Gemini ni Crear voces un día de redes sin necesidad |
| **Una pieza no se armó "para guardar el cupo"** | Registro de Redes: "sin voz: quedan N audio(s) de voz y se guardan para…" | Nada: es a propósito (regla 208); la pieza más importante que falta va a tener su audio |
| **No hay farmacia de turno en la web** | El reloj dice "la farmacia no: la web no tiene farmacia de turno para hoy" | Mirar el Colegio y La Vanguardia; si ninguno la publica, ese día no sale (regla 210) |
| **Una voz propia ya no existe o está por vencer** | Aviso por mail `voz-locutora`/`voz-locutor` (alta) o `vence-voz-…` (30 días antes, con la fecha de Google) | Crearla de nuevo (`11-OPERACION`) |
| **Un posteo sin su foto en Instagram** | Aviso por mail: "N posteo(s) de Facebook de hoy no tienen su foto en el feed". Se reintenta solo 4 veces en 12 horas | Si no se arregla solo, mirar que exista la tarjeta `/nota/ID/instagram.png` |
| **Un duplicado** | Aviso por mail de prioridad alta (libro) o en el cierre de las 23:30 (Meta) | Borrar la copia a mano en la red (una persona) |
| **El video pasa de 58 segundos** | Aviso amarillo en la corrida; la historia sube recortada con fundido | Nada: está previsto |
| **El libro no se pudo guardar** | Redes en rojo: "No se pudo guardar el libro después de tres intentos" | Mirar enseguida: la vuelta siguiente puede repetir lo publicado |
| **Se publica pero el público no lo ve** (pasó hasta el 26/09, con la app de Meta en modo desarrollo) | Nadie avisa | Correr "Ver Facebook" y mirar la página desde una cuenta que no sea administradora |
| **La auditoría semanal no corre** | El vigilante avisa si `web/data/auditoria.json` tiene más de 10 días | Correr "Auditoría" a mano (Actions → Auditoría → Run workflow) |
| **Las medidas de `formatos.mjs` quedaron viejas** (90 días) | La auditoría semanal avisa por mail | Volver a verificarlas (`FORMATOS.md`) |
| **Faltan permisos de estadísticas en `META_TOKEN`** | El resumen dice qué le falta | Regenerar el token con `read_insights` e `instagram_manage_insights` (una persona) |

## Lo que no salió y el reintento (1/10/2026)

Antes un fallo de publicación sólo quedaba en el registro de la corrida y en el WhatsApp. Ahora queda en el
libro (`web/data/redes.json`, `problemas`, con la clave `dia/pieza/red/parte`; parte = reel, historia o
historia-del-reel; se guardan tres días) y se borra cuando sale (`registrarProblema` y `limpiarProblema`,
`redes/publicar-piezas.mjs`).

**Caso real del 1/10:** el reel de las 10 se publicó recién a las 10:35, porque las corridas de las 10:04 y 10:05
fallaron al bajar `ffmpeg` (GitHub contestó 504). Después Instagram rechazó tres veces la historia del reel
("La subida del video falló (400) Request processing failed") y quedó sin historia, mientras Facebook sí la subió.

**Reintentar sin gastar voz:** el workflow "Reintentar pieza" (`.github/workflows/reintentar.yml`, botón en el
panel) baja el video del artefacto `piezas-<corrida>` que "Redes" guarda tres días y lo sube con
`redes/reintentar.mjs`, sin pedir la voz de nuevo (cupo: 10 audios por día). Comparte el candado `redes`.


**Desde el 17/10 (regla 208)**, cuando la pieza entera no salió (Instagram, que manda, la rechazó), la vuelta
siguiente del reloj sube el video ya armado que quedó en la memoria de voces (`reels/armadas.mjs`): ya no hace
falta "Reintentar" para eso, ni se gasta otro audio. "Reintentar pieza" sigue sirviendo para lo que el reloj no
vuelve a pedir: la historia de un reel que sí salió, o una red secundaria que falló.

### Lo que falta y necesita tocar un workflow (17/10, propuesto; no se tocó)

- **Juntar "Piezas" y "Reintentar pieza" adentro de "Redes"** (auditoría 2.0, § 3.4): en 15 días ninguno de los
  dos corrió. Propuesta: `redes.yml` con dos acciones más, `armar` (los mismos `solo`, `todas`, `publicar` y
  `destino` de `piezas.yml`) y `reintentar` (los `pieza`, `red`, `parte`, `dia` y `marca` de `reintentar.yml`,
  con `permissions: actions: read` y el paso que baja el artefacto). Se puede sólo cuando el botón del celular
  (`web/public/panel/`, que hoy dispara `reintentar.yml`) pase a pedir `redes.yml` con `accion=reintentar`; hasta
  entonces, borrar `reintentar.yml` rompe el botón.
- **La frase rota de `piezas.yml`** (renglones 8 y 9): dice "Si Gemini falla, la pieza sale igual con otra voz:
  no sale y el reloj la vuelve a pedir…", que se contradice. Tiene que decir: "Si Gemini falla, la pieza no sale
  (nunca con otra voz) y el reloj la vuelve a pedir en la vuelta siguiente".
- **Que el contador de voz vea todo lo que gasta voz**: "Auditar voz", "Probar Gemini", "Crear voces" y "Fijar
  piezas" usan la misma clave pero no restauran ni guardan la memoria de voces (`.cache/voz`, `VOZ_CACHE`), así
  que sus audios no se cuentan. Hace falta sumarles los dos pasos de caché que tienen `redes.yml` y `piezas.yml`.
- **"Redes" puede tardar un poco más a la hora de un repaso**: la secuencia del repaso dibuja unos 800 cuadros
  distintos (regla 300; en una PC de 4 núcleos, unos 80 segundos; en GitHub, del orden de uno o dos minutos). El `timeout-minutes: 25` alcanza; si algún día no, la
  pieza sale con la lista quieta.

## El video, como módulo aparte (`radarbalcarce/radar-balcarce-render`)

*Anotado el 17/10 a pedido de los dueños. Escrito y probado el 18/10/2026 (`infra/render-publico/`, `reels/pedido.mjs`, `reels/render-remoto.mjs`; reglas 230 a 235) y **prendido el 23/10** con la mudanza a Cloudflare: el Worker de tareas arma el pedido («Piezas de redes») y el video se hace en el repositorio público de render; el armado en «Redes» de GitHub queda de vuelta atrás. Cuando cambia `reels/`, hay que copiarlo al repositorio de render (`node scripts/sincronizar-render-publico.mjs` y subirlo: pendiente de verificar, `PENDIENTES.md`). El plan, en `docs/etapa-10-operacion/PLAN-DE-CAMBIO.md`.* La idea: que lo que dibuja y arma los videos
(placas, escenas, subtítulos, ffmpeg) corra en un repositorio público aparte, **sin ningún secreto**, y que este
repositorio le pase todo lo que necesita. Hoy la frontera ya casi existe: `armarReel` (`reels/reel.mjs`) recibe
la voz por parámetro (`hablar`), así que no necesita saber de Gemini.

**Lo que queda acá (con secretos o con criterio):** elegir qué sale y cuándo (`redes/`), los guiones, pedir la
voz a Gemini (`GEMINI_API_KEY_REDES`), el contador del cupo, publicar en Meta (`META_TOKEN`) y el libro.

**Entrada del render, una por pieza (`pedido.json`, más los archivos que nombra):**

| Campo | Qué es |
|---|---|
| `nombre`, `tipo` (`reel` o `historia`) | La pieza (`noticia1`, `clima-manana`…) |
| `texto` | Lo que dice la voz, ya pasado por `paraLeer` |
| `guion`, `voz` | `guion` es lo que `armarReel` espera y `texto` lo ya pasado por `paraLeer` (el render controla que coincidan). `voz` es `{ archivo: "voz.mp3", bytes, sha256 }`: el audio ya generado viaja aparte y el render controla su huella; lo alinea él mismo (`reels/alinear.mjs`, sólo ffmpeg) para sacar los tiempos de cada palabra |
| `placa` | El SVG de respaldo (la placa quieta) |
| `escena` | Opcional: `{ fn, args }` (el descriptor que `reels/escenas/del-plan.mjs` le anota a cada escena): la función de `reels/escenas/registro.mjs` que la dibuja y sus datos, todo JSON |
| `secuencia` | Opcional: `{ placas: [{ svg, marca }], tapa }` (el repaso); las fotos van adentro de los SVG (`data:`) o como archivos |
| `segunda` | Opcional: el SVG de "Además…" ("Un día como hoy") |
| `acento` | El color de la palabra que se dice en el subtítulo |
| `opciones` | `animar`, `historiaMaxima` (58 s), `fps` |

**Salida:** `<nombre>.mp4` (el reel entero), `<nombre>-historia.mp4` (sólo si pasa de 58 s), `<nombre>.png` (la
tapa), `<nombre>.ass` (los subtítulos) y una línea de manifiesto `{ nombre, archivo, duracion, archivoHistoria?,
duracionHistoria?, huella }`, donde `huella` es el resumen del pedido: el mismo pedido da el mismo video, y eso
sirve de memoria (no se vuelve a dibujar lo que ya se dibujó).

**Lo que el render lleva consigo:** las tipografías (`reels/marca/fuentes/`), `reels/placa.mjs`,
`reels/animacion.mjs`, `reels/escenas/`, `reels/voz.mjs`, `reels/alinear.mjs`, `reels/tiempos.mjs`,
`reels/duracion.mjs` y la parte de video de `reels/reel.mjs`; dependencias, `@resvg/resvg-js` y `ffmpeg-static`.
Ningún archivo de `web/data/` ni del libro: sólo lo que viene en el pedido, que ya es público.

**Cómo anda (escrito el 18/10/2026):** el Worker de tareas (`infra/tareas-cloudflare/redes.mjs`, en lugar de la mitad de «Redes»)
sabe qué pieza toca y despierta a «Piezas de redes» (`redes-piezas.yml`), que pide la voz a Gemini, arma el pedido
(`reels/pedido.mjs`), lo sube a un depósito R2 (`radar-render`) y dispara el render con un `repository_dispatch` que lleva
**direcciones firmadas de una hora** (una para bajar el pedido, otra para la voz, una por cada archivo que tiene que dejar): el
render no tiene ni una clave. El render (`infra/render-publico/render.mjs`) valida todo (nombre, texto, escena, huella de la voz,
direcciones **https de R2**), arma el video con el mismo código de `reels/` y sube el resultado con el **manifiesto último**; el
Worker de tareas lo ve en la vuelta siguiente del reloj, baja el video y lo publica con `redes/publicar.mjs --piezas`. La carpeta
`infra/render-publico/` es una **copia** de `reels/` (más `render.mjs`, el workflow y la prueba de humo): una prueba falla si quedó
vieja. Las piezas fijas (`reels/fijas/`) no pasan por el render: su video ya armado se sube a R2 con su manifiesto.

## Piezas fijas: armadas de antemano y reutilizadas (1/10/2026)

Mientras el cupo de voz sea el gratis (10 audios por día), las piezas que no cambian se arman UNA vez y
se reutilizan dos semanas: **las cuatro de participá** (lunes noticias, martes evento, miércoles reclamos,
viernes nota). Cuestan un audio la primera vez y después ninguno: el día de una semana normal baja a 7 u 8
audios (`redes/cronograma-semana.mjs` lo escribe).

- Se arman con el workflow **"Fijar piezas"** (`fijar-piezas.yml`): `piezas`, `desde` (primer día en que
  valen) y `dias` (14). Gasta un audio por pieza: conviene un día de poco uso y de a dos.
- Quedan en `reels/fijas/` (el video) con su vigencia en `reels/fijas/vigencia.json`.
- El plan (`reels/plan.mjs`) usa la fija si vale hoy (`fijaVigente`) y no pide la voz; pasada la vigencia
  vuelve solo a armarla con voz. `--sin-fijas` fuerza armarla de cero; `--incluir=` pide una pieza que hoy no toca.
- Cuando vuelva la clave paga, se deja que venzan y listo.



## El cronograma de las redes de un vistazo (1/10/2026)

Horarios acordados con Hernán el 1/10 (todos en `redes/horarios.mjs` y `redes/piezas.mjs`; una prueba los controla):

| Hora | Pieza | Voz |
|---|---|---|
| 07:00 | Clima de la mañana | locutora |
| 08:00 | El feriado (sólo feriados) | locutora |
| 09:00 | **Un día como hoy**, todos los días | locutora |
| 10:00 | Repaso de la mañana (reel e historia) | locutor |
| 12:00 | Participá (lun noticias, mar evento, mié reclamos, vie nota) y la agenda (jueves) | locutora o locutor, según la pieza |
| 15:00 | Repaso de la tarde (reel e historia) | locutora |
| 17:00 | Teléfonos útiles, **los sábados** | locutor |
| 19:00 | Farmacia de turno | locutor |
| 20:00 | Clima de la noche | locutora |
| 21:00 | Repaso de la última hora (reel e historia) | locutor |

- **Para verlo:** `node redes/cronograma-semana.mjs` lo escribe en texto, con las mismas funciones que el reloj, así que muestra lo que
  va a pasar. (La página y la imagen del cronograma, `reels/cronograma-html.mjs` y `reels/hoja-cronograma.mjs`, se borraron el 17/10/2026.)
- **Audios por día** (el cupo gratis es de 10): con las cuatro de participá fijas, entre 7 y 8; el feriado, 8. Quedan 2 de margen para un aviso de clima o un reintento, y desde el 17/10 el contador los cuida (regla 208).
- **Un día como hoy** se prepara una semana por vez y se revisa (`PENDIENTES.md` 0c2): cada semana se arma la siguiente, y si nadie toca nada sale como está.