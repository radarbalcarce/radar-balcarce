# Un día de Radar 3.0, hora por hora

*Para Hernán y Andrés. Escrito el 3/11/2026 leyendo `v3/nucleo`, `v3/sitio`, `v3/redes`, `v3/redaccion/telegram`, `v3/vigilancia`, sus `wrangler.toml` y los workflows `v3-*.yml`. Lo que no se pudo confirmar en el código está marcado **a confirmar**. Si este documento y el programa no coinciden, manda el programa.*

## 1. El dibujo general

Radar 3.0 son **cinco piezas** que corren en Cloudflare (y una en GitHub). Ninguna necesita la PC.

| Pieza | Nombre en Cloudflare | Qué hace | Cada cuánto |
|---|---|---|---|
| **El núcleo** | `radar-nucleo` | Lee las fuentes, junta la misma noticia contada por varios, elige, redacta, verifica, le busca foto y la publica | **Cada 15 minutos, las 24 horas** |
| **El sitio** | `radar-sitio` | Arma cada página en el momento que la piden, leyendo la base | A pedido (con caché de unos minutos) |
| **Las redes** | `radar-redes` | Decide qué nota va a Facebook e Instagram y qué pieza de video toca | Cada 15 min de 8 a 22 (posteos); las piezas, cada hora |
| **El bot** | `radar-telegram` | Habla con Hernán: notas propias, administrar, avisos | Cuando escribís; revisa su conexión cada 15 min |
| **La vigilancia** | `radar-vigilancia` | Mira que todo ande, avisa y manda dos informes | Cada 30 min; informes a las 8 y 20 |
| **El dibujo de las piezas** | GitHub Actions («Radar 3.0: piezas de redes») | Dibuja los videos y pide la voz (no corre en un Worker) | Una vez por hora, de 7:07 a 23:07 |

Todos comparten **una base de datos** (`radar-nucleo`) donde están las notas, las historias, los avisos y lo que se publicó en redes.

## 2. El día, hora por hora

Todas las horas son de Balcarce.

| Hora | Qué pasa | Quién |
|---|---|---|
| **Todo el día, cada 15 min** (:00, :15, :30, :45) | Una vuelta del núcleo (detalle en la sección 3) | `radar-nucleo` |
| **Todo el día, cada 15 min** | El bot revisa que su conexión con Telegram siga registrada | `radar-telegram` |
| **Todo el día, cada 30 min** | Chequeo de la vigilancia: ¿el núcleo hizo una vuelta?, ¿el bot responde?, ¿hay fuentes caídas?, ¿el gasto de IA se acerca al freno? | `radar-vigilancia` |
| **7:00** | Sale el **clima de la mañana** como historia en Instagram y reel e historia en Facebook (en ensayo, ver `REDES.md`) | piezas |
| **7:07** | Arranca la primera corrida horaria de las piezas de video | GitHub |
| **7:30 (primera vuelta desde esa hora)** | El núcleo publica la **nota diaria del clima**. Si Open-Meteo no responde en toda la mañana (hasta las 12:00), ese día no sale | núcleo |
| **8:00** | **Informe de la vigilancia** por Telegram. Empiezan los posteos con foto en Facebook e Instagram (hasta las 22:00, con 90 minutos entre uno y otro) | vigilancia, redes |
| **9:00** | «Un día como hoy» (reel con voz) | piezas |
| **10:00** | El repaso de la mañana (3 notas, al menos 1 de Balcarce) | piezas |
| **12:00** | Participá (lunes, martes, miércoles y viernes; el jueves no hay pieza en la 3.0) | piezas |
| **15:00** | El repaso de la tarde | piezas |
| **19:00** | Farmacia de turno. **Entre las 19:00 y las 22:00** el núcleo vuelve a pedir el clima: si cambió de forma importante, **actualiza la misma nota** con un párrafo «Actualización de las 19» | piezas, núcleo |
| **20:00** | El clima de la noche. **Informe de la vigilancia** por Telegram | piezas, vigilancia |
| **21:00** | El repaso del día | piezas |
| **21:30** | **Resumen del núcleo** por Telegram: cuántas notas publicó ese día. Ahí se hace también la **limpieza diaria** de la base | núcleo |
| **22:00** | Último posteo del día en Facebook e Instagram | redes |
| **22:05** | **Resumen de redes** por Telegram: qué salió (o habría salido) en cada red | redes |
| **23:07** | Última corrida horaria de las piezas de video | GitHub |

Los horarios de las piezas de video están explicados en `REDES.md`. **Hoy las redes 3.0 están en ensayo**: arman y simulan, pero lo que ve el público lo sigue publicando el sistema viejo.

## 3. Qué hace el núcleo en cada vuelta de 15 minutos

1. **Lee las fuentes** (hoy **81 activas**: medios de Balcarce, de la zona, de la provincia y del país, más organismos oficiales), todas en paralelo, con un tope de 10 segundos cada una. Lo que no llegó, llega en la próxima vuelta. Del feed saca título, bajada, texto, fecha, enlace e imágenes candidatas.
   - **Dos medios de Balcarce no tienen feed** (El Diario Balcarce y Diario La Vanguardia): se leen entrando a su portada, 15 notas por vuelta como mucho.
   - Lo que tiene **más de 36 horas** al leerlo por primera vez no entra (no estrenamos noticias viejas).
2. **Junta la misma noticia contada por varios.** A cada artículo nuevo se le calcula una «huella de significado» y se compara con las historias vivas de las últimas 72 horas. Si se parecen mucho, se unen; si la duda es mediana, una IA chica contesta sí o no a «¿cuentan el mismo hecho?». Es **la única manera** de agrupar (se calibró con 184 casos reales del sistema viejo).
3. **Elige** (antes de gastar IA). Una historia sale si cumple **una** de estas tres:
   1. **Es de Balcarce o la zona.** Sale siempre; con una sola fuente alcanza.
   2. **La cuentan 5 medios distintos del país** (3 si es un área chica: Tecnología, Ciencia, Salud, Educación, Cultura, Agro, Automovilismo). Hay un tope de **40 nacionales por día**; si se llena, entran las más contadas. Balcarce nunca tiene tope.
   3. **La pidió una persona** (por Telegram).
   - **No sale, aunque cumpla**, si identifica a un **menor** o a una **víctima** que no es figura pública, si es una **lista de sepelios**, si es del extranjero sin ningún argentino, si es horóscopo, lotería, cotización del día o sorteo comercial, o si ya hay una historia viva del mismo hecho.
   - Cada decisión queda anotada con su motivo, para poder responder «¿por qué no salió?».
4. **Redacta y verifica** (dos pedidos de IA por nota). Primero la IA escribe título, bajada, cuerpo, sección, «En dos líneas» y una ficha de datos (qué, quién, dónde, cuándo, números). Después una segunda llamada marca cualquier oración que ninguna fuente diga. Si marca una, se saca; si marca más de dos, la nota se reescribe una vez; si vuelve a fallar, **no sale** y se avisa. Se redactan **hasta 6 notas por vuelta**, Balcarce primero.
   - Firma: «Redacción Radar Balcarce», con la leyenda «escrita con IA a partir de N fuentes y verificada contra ellas».
5. **Busca la foto** (en este orden): una foto de las fuentes de esa historia (una IA de visión descarta marcas de otros medios, menores, víctimas y fotos que no son de la noticia); si no hay, **la nota sale sin foto** y reintenta hasta 4 veces en 24 horas. *(Los pasos «foto libre de Wikimedia» e «ilustración generada» **todavía no están hechos**.)* En el sitio, sin foto, aparece la placa con el color de la sección.
6. **Arma el valor agregado** con código, nunca con IA: «Los datos», «Cronología» (3 fechas o más), «Cifras», «Contexto» y «Más en Radar».
7. **Publica.** La nota queda en la base como `publicada` y el sitio la muestra al instante. El interruptor `NUCLEO_PUBLICA` está en «sí» desde el corte del 3/11.

## 4. Qué páginas tiene el sitio

El sitio nuevo (`radarbalcarce.com`) lo sirve `radar-sitio` desde el corte del 3/11. Las páginas:

| Página | Dirección | Qué es |
|---|---|---|
| **La tapa** | `/` | Cuadro del clima y la farmacia, aviso fijo (T1), nota principal con tres titulares al costado, grilla de 6 con fotos, «Última hora», columna lateral, invitación a escribir por WhatsApp, «Más de hoy». Salen las notas de las últimas 36 horas, **Balcarce primero** |
| **Una nota** | `/nota/<titular>-<código>` | Título, bajada, «En dos líneas», foto con crédito, cuerpo, los bloques de datos, la firma y el desplegable «Fuentes (N)» |
| **Las secciones** | `/seccion/<nombre>` | Las 14 secciones, 10 notas por página. Cada una tiene su RSS |
| **Buscar** | `/buscar?q=` | Busca en título y bajada |
| **Clima** | `/clima` | Ahora, 48 horas, 7 días, la región y enlaces al SMN |
| **Farmacias** | `/farmacias` | Turnos de la semana (Colegio de Farmacéuticos) |
| **Dólar** | `/dolar` | Siete cotizaciones, brecha, 45 días |
| **Agenda** | `/agenda` y cada evento | Sale sólo del municipio, con archivo `.ics` |
| **Hoy / Útil / Tablas** | `/hoy`, `/util`, `/tablas/liga-profesional`, `/tablas/formula-1` | Resumen del día, teléfonos útiles, tablas de posiciones |
| **Páginas de texto** | `/quienes-somos`, `/como-trabajamos`, `/contacto`, `/politica-de-privacidad` | Las páginas que pide AdSense |
| **Publicidad** | `/publicidad` | Redirige a la nota del media kit |
| **Para máquinas** | `/rss.xml`, `/feed.xml`, `/sitemap.xml`, `/llms.txt`, `/agentes/*.json`, `/robots.txt`, `/ads.txt` | Buscadores, lectores de feeds, IAs |
| **El panel del celular viejo** | `/panel/` | Sigue estando (sirve desde un depósito); lo reemplaza el bot |

Las **14 secciones**: Balcarce, Política, Policiales, Educación, Salud, Fútbol, Deportes, Automovilismo, Agro, Economía, Ciencia, Cultura, Tecnología y Argentina.

**Caché:** la tapa y las secciones se guardan 5 minutos; las notas, 1 hora (una corrección tarda hasta una hora en verse); los mapas, 1 hora; el RSS, 10 minutos; las búsquedas y los errores no se guardan.

**Notas viejas:** las 500 notas del sistema viejo se pasaron a la base **con su misma dirección**, para que Google no pierda nada. Una dirección vieja que no existe da **410** («ya no está») con una búsqueda con las palabras del titular.

## 5. El gasto de IA y sus frenos

| Freno | Cuánto | Qué pasa al llegar |
|---|---|---|
| **Tope diario de pedidos del núcleo** | `NUCLEO_TOPE_DIARIO` = **500** por día (en el código, 150 si no estuviera la variable) | Deja de redactar hasta el día siguiente |
| **Redacciones por vuelta** | **6** | Las demás esperan la vuelta siguiente (15 minutos) |
| **Freno mensual** | **US$ 7** de gasto en el mes (texto y voces juntos: Hernán quiere quedar debajo de US$ 10) | El núcleo deja de usar IA y avisa por Telegram una vez por mes |
| **Aviso del 80 %** | Cuando el gasto del mes llega al 80 % del freno | La vigilancia avisa por Telegram una vez por mes |
| **Nacionales por día** | 40 | Si se llena, entran las más contadas. Balcarce nunca tiene tope |
| **Pedidos del bot de Telegram** | 20 por día para notas propias | No arma ni corrige; lo guardado queda |
| **Cupo de voz** | 10 audios por día | La pieza queda «sin cupo» y no sale (nunca con otra voz) |
| **Nota diaria del clima** | Hasta 4 pedidos por día | Si hay tope o freno, sale la plantilla sin IA |

- **Lo que no se publica cuesta cero pedidos de texto**: la IA sólo entra después de decidir que la historia sale.
- Por nota publicada: **2 pedidos de texto** (3 si hubo reescritura) y 1 a 3 de visión.
- **Gemini** es el único proveedor de texto del núcleo (la clave paga). Las huellas de significado las hace Workers AI de Cloudflare (gratis).
- **Dónde se ve el gasto:** en el informe de las 8 y las 20 («gasto de IA del día y del mes, con el porcentaje del freno»).
- Nota de documentación: el archivo de reglas de la vigilancia dice «hoy US$ 15» como freno, pero el valor sale del núcleo, que dice **US$ 7**. Manda el núcleo.

## 6. Qué mira la vigilancia y cuándo avisa

Cada 30 minutos mira:

1. Que el núcleo haya hecho una vuelta en los últimos 40 minutos.
2. Que el núcleo conteste (avisa si no contesta dos chequeos seguidos).
3. Que el bot de Telegram responda y tenga su token.
4. Que el webhook del bot esté registrado.
5. Que el gasto del mes no llegue al 80 % del freno.
6. Que ninguna fuente lleve fallando 3 días (una que nunca anduvo bien, un día).
7. Que el sitio conteste, **sólo cuando se conecte** (hoy no está conectado: **a confirmar**).

**Cuándo avisa:** una sola vez por problema, y cuando se arregla avisa «volvió a andar». Los mensajes son cortos y dicen qué pasa y desde cuándo. Si el bot de Telegram está caído y no puede avisar por ahí, manda **un mail a `radarbalcarce@gmail.com`** (necesita Email Routing activo: **a confirmar**).

**El informe de las 8 y las 20** dice: cuántas notas publicó el núcleo (y por sección), cuántas frenó y por qué, el gasto de IA, las fuentes caídas y los problemas abiertos, o **«Todo en orden.»**

**Lo que la vigilancia todavía no mira:** las redes sociales ni la web publicada (en su `REGLAS.md`: «se suman cuando existan sus Workers»). No arregla nada solo: avisa.

## 7. Si algo falla: qué mirar y a quién

| Síntoma | Primero mirá | Dónde |
|---|---|---|
| No salen notas nuevas | ¿El informe de las 8/20 dice que el núcleo no hace vueltas? ¿Llegó el aviso «volvió a andar»? | Telegram. Si no, `radar-nucleo` en Cloudflare → Workers y su `/salud` |
| Salen pocas notas | La limitación suele ser el freno de IA (tope diario o mensual) o que el día esté flojo | Informe de las 8/20: gasto y notas frenadas |
| El sitio no abre o da error | Abrir `radar-sitio.radarbalcarce.workers.dev`. Si funciona ahí y no en el dominio, es la ruta | Cloudflare → Workers → `radar-sitio` → Domains & Routes |
| **Hay que volver al sitio viejo ya** | Workflow de GitHub **«Radar 3.0: corte»** con la opción `sacar` (tarda un minuto). Devuelve el dominio al sitio viejo. A mano: borrar las dos rutas en Cloudflare | GitHub → Actions |
| **Hay que frenar que se publiquen notas** | Poner `NUCLEO_PUBLICA` = «no» en `v3/nucleo/wrangler.toml` / panel de Cloudflare. Apagarlo **no despublica** lo ya publicado | Lo cambia una persona |
| El bot de Telegram no contesta | `https://radar-telegram.radarbalcarce.workers.dev/salud` | Ver `TELEGRAM.md` |
| **Una nota salió mal** | `/retirar <enlace> <motivo>` por Telegram, o `/corregir` | Telegram |
| Una fuente cayó | Se avisa a los 3 días; mientras tanto, otras fuentes cubren | Informe |
| Las redes no publican | Hoy las 3.0 están en ensayo a propósito. Si falla el viejo, ver `web/data/redes.json` y el resumen de las 22:05 | `REDES.md` |
| El token de Meta venció | Aviso por Telegram una vez por día. Hay que cargar uno nuevo como secreto `META_TOKEN` en GitHub y volver a subir «redes» | GitHub → Settings → Secrets |

**Regla de oro:** los tokens y las claves **nunca** se pegan en un chat ni en el código; los pega una persona en GitHub o en Cloudflare.

**Cómo se sube un cambio:** el workflow de GitHub **«Radar 3.0: desplegar»** (a mano, eligiendo qué: `nucleo`, `sitio`, `redes`, `telegram`, `vigilancia`).

**Una nota no publicada:** si el núcleo marcó una nota con `no_publicar` (menor, víctima, verificación fallida), queda en borrador siempre; se ve con `/pendientes`.

## 8. Qué quedó del sistema viejo y cuándo se apaga

| Qué | Estado hoy | Cuándo se apaga |
|---|---|---|
| **El sitio viejo** (`radar-balcarce.pages.dev`) | Ya no sirve nada de lo suyo al público: todo pasó al sitio nuevo. Queda como **red de seguridad** (`RESPALDO_VIEJO` = «si») para las notas y fotos que el sitio nuevo todavía no tenga | Cuando se ponga `RESPALDO_VIEJO` = «no». Sigue en «sí» **porque las redes viejas todavía enlazan a notas del motor viejo** |
| **Las redes del sistema viejo** | **Son las que publican de verdad hoy** (Facebook, Instagram, TikTok, YouTube, X) | Después de unos días de ensayo de las redes 3.0 y cuando se pasen a real |
| **El motor viejo** (que escribe las notas del sistema viejo) | Sigue escribiendo notas; el sitio nuevo las pide al viejo cuando no las tiene | Con el apagado general |
| **El panel del celular viejo** | Se sirve desde un depósito; los pedidos a la IA y las pestañas de contenido los reemplaza el bot | Cuando se apague el sistema viejo |
| **El reloj de Cloudflare, el Worker de tareas, GitHub Actions viejos** | Siguen para el sistema viejo | Con el apagado general |
| **Las 500 notas migradas** | Viven en la base nueva | No se apagan |

**Fecha de apagado del sistema viejo: no está escrita.** El plan dice que falta (1) unos días de ensayo de las redes, (2) pasar las redes a real y apagar las viejas, (3) apagar la red de seguridad y (4) apagar el sistema viejo. **A confirmar** con Hernán cuándo.

## 9. Lo que falta de la 3.0 (resumen)

- Redes en real, más TikTok, YouTube, X, Threads, Bluesky y canal de Telegram como módulos nuevos.
- El informe semanal de redes y web.
- Las piezas que todavía no existen: agenda del fin de semana, teléfonos útiles, feriados y avisos de clima por helada, granizo o viento.
- La foto libre y la ilustración generada para las notas sin foto.
- El calendario de climas auspiciados y la pestaña de avisos en `/admin`.
- Que Telegram aprenda a armar el media kit y a investigar un tema.
- Mover las fotos viejas a un depósito propio (hoy las nuevas siguen apuntando a la dirección del medio de origen).
