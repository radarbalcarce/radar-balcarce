# La publicidad en Radar 3.0, de punta a punta

*Para Hernán y Andrés. Escrito el 3/11/2026 leyendo `v3/sitio/vistas/avisos.mjs` (los nombres de los lugares), las vistas del sitio, `v3/sitio/scripts/cargar-aviso.mjs`, `docs/propuestas/PUBLICIDAD-PRIMER-COMERCIO.md`, `MANUAL-AVISOS-3-0.md`, `NOTA-MEDIA-KIT.md` y `PUBLICIDAD.md`. Lo que no se pudo confirmar en el código está marcado **a confirmar**. Los precios son de **noviembre y diciembre de 2026** (promoción); para 2027 «veremos».*

## 1. Lo esencial en 30 segundos

- Hay **dos tipos de publicidad** en el sitio y **nunca se mezclan**:
  1. **La nuestra**: avisos de comercios de Balcarce que vendemos nosotros, con nombre propio (T1, T2, N1, etc.). Son los que importan para ganar plata del lado local.
  2. **La de Google (AdSense)**: bloques que elige Google (A1, A2, A3). **No los vendemos nosotros**: los pone Google y nos paga por cada uno.
- Un lugar puede ser **FIJO** (siempre el mismo comercio, no rota; se vende a **uno solo por mes**) o **ROTATIVO** (se reparte entre todos los que pagan).
- Todo aviso lleva el rótulo chico **«Publicidad»**, está quieto (no parpadea ni se expande), y está separado de las noticias.
- **Quien paga no decide qué publicamos.** Un aviso no cambia una noticia.
- Lo que se vende **por mes**: el **clima auspiciado**, las **historias** con las promociones del comercio y el **aviso en el sitio**. La **bienvenida** (una nota, un reel con voz y una historia) es una sola vez y **no se cobra aparte**.

## 2. Los lugares, uno por uno

Cada lugar tiene un nombre corto: una letra y un número. **T** es la Tapa, **N** las Notas, **S** las Secciones, **P** las demás páginas (contacto, búsqueda, quiénes somos…), **C** el Clima y **A** los de AdSense (Google). El nombre figura en el código de la página (`data-lugar="T1"`), y cuando un lugar está vacío el aviso propio lo dice en letra chica («Espacio T1»), así que mirando el sitio sabés de cuál hablamos.

### Los nuestros (comercios de Balcarce)

| Nombre | Página | Dónde exactamente | ¿Fijo o rotativo? | Qué significa |
|---|---|---|---|---|
| **T1** | Tapa | **Arriba de las noticias**, entre el cuadro del clima y la nota principal | **FIJO** | Un solo comercio por mes. Es el lugar más caro. No rota |
| **T2** | Tapa | **Después de las postales**: entre la grilla de «Más noticias» (las fotos) y «Última hora» | ROTATIVO | Se reparte entre los que lo tienen |
| **T3** | Tapa | **Columna del costado** de «Última hora» (en el celular queda entre las noticias) | ROTATIVO | Ídem |
| **T4** | Tapa | **Pie de página** | ROTATIVO | Ídem. Es el lugar más básico |
| **N1** | Notas | **Arriba de la nota**. **Sólo sale si hay un comercio fijo cargado** | FIJO (el mismo de T1) | Se repite el comercio de T1 |
| **N2** | Notas | **Pie de la nota**. **Sólo sale si no hay comercio fijo** | ROTATIVO | Alternativo a N1: sale uno u otro, nunca los dos |
| **S1** | Secciones | **Arriba de la lista** de notas de la sección | FIJO (el mismo de T1) | Ídem |
| **S2** | Secciones | **Pie de página** | ROTATIVO | |
| **P1** | Las demás páginas | **Pie de página** (contacto, quiénes somos, búsqueda…) | ROTATIVO | |
| **C1** | Clima | **Arriba de la nota diaria del clima** y arriba de la página `/clima`: «El clima de hoy llega con [comercio]» | **Un solo comercio por día**, reservado por calendario (no rota en el día) | El **clima auspiciado** del sitio. Va junto con el del reel (ver sección 5) |

**Dentro de una nota hay un solo aviso local** (decisión del 3/11): arriba (N1) si hay un comercio fijo y, si no, al pie (N2). En la tapa, en cambio, están los cuatro (T1 a T4).

### Los de Google (AdSense)

| Nombre | Página | Dónde exactamente | Detalles |
|---|---|---|---|
| **A1** | Notas | **Dentro de la nota, entre el tercer y el cuarto párrafo** | Sólo en notas de **4 párrafos o más** y **nunca en Policiales** |
| **A2** | Secciones | **Al final de la lista de notas**, antes del pie | Nunca en Policiales |
| **A3** | Tapa | **Abajo**, después de la invitación «Participá» | Sumado el 3/11 |

Los tres tienen el alto reservado (para que la página no salte), llevan el rótulo «Publicidad» y **sólo aparecen si el lector aceptó las cookies**. Si Google no tiene un anuncio para mostrar, el bloque se esconde solo. **No rotan con los nuestros ni se mezclan.**

### Qué es FIJO y qué es ROTATIVO

| | Qué hace | Ejemplo |
|---|---|---|
| **FIJO** | Siempre se ve el mismo comercio. Se vende a **uno solo** por mes. Cada vez que alguien abre la tapa, una sección o una nota, está el mismo | El comercio de $ 50.000 aparece en T1, N1 y S1 |
| **ROTATIVO** | Cada vez que se arma una página, en cada lugar se elige un aviso **al azar** entre los que lo tienen, tratando de **no repetir el mismo comercio dos veces en la misma página**. Todos los que pagan se reparten por igual. Si un lugar tiene un solo aviso, se repite antes que quedar vacío | Con tres comercios en T2, un lector ve uno y el siguiente ve otro |

**Cuándo cambia el aviso en pantalla:** como las páginas se guardan unos minutos, el aviso cambia cuando la página se rearma. Con avisos cargados, la tapa, las secciones y las notas duran **5 minutos** (sin avisos, 1 hora). Un aviso recién cargado se ve en **hasta 5 minutos**.

**Si un lugar no tiene ningún comercio**, nunca queda vacío: sale el aviso propio, **«¿Querés publicitar en el diario y en las redes?»**, con «Clic acá» (lleva a la nota del media kit, sin precios) y el WhatsApp **2266 51-1612**.

### Medidas de las imágenes

| Lugar | Medida |
|---|---|
| T1, T2, T4, N1, N2, S1, S2, P1 | 1200 × 300 px (proporción 4:1) |
| T3 | 600 × 500 px (6:5) |

JPG o PNG, **menos de 300 KB**, con el texto grande (en el celular se ve a unos 360 px de ancho). Se achica sola al ancho de la página, así que alcanza con respetar la **proporción**. Si el aviso **no tiene imagen**, se arma una caja con el nombre del comercio y una línea de texto (hasta 120 letras): sirve para empezar rápido.

## 3. Qué vende cada plan

Cinco planes por mes (Hernán, 2/11). Los climas con **promoción hasta diciembre de 2026** están entre paréntesis.

| | $ 5.000 | $ 10.000 | $ 20.000 | $ 30.000 | $ 50.000 |
|---|---|---|---|---|---|
| **Climas auspiciados** por mes | — (4) | 2 (5) | 3 (6) | 4 (8) | 6 (10) |
| **Historias** con sus promociones | 4 | 6 | 8 | 10 | 12 |
| **Posteos con foto** en Facebook e Instagram | — | — | — | 2 | 4 |
| **Lugares de aviso** | Pie: **T4, N2, S2, P1** | Pie + **T2** | Pie + T2 + **T3** | Pie + T2 + T3 | **T1 fijo** (se repite en N1 y S1) + todos los rotativos |
| **Bienvenida** (nota + reel con voz + historia) | Sí, una vez | Sí | Sí | Sí | Sí |

En la base de datos el lugar se guarda como `fijo`, `postales`, `columna`, `pie` o `clima`. Un comercio del plan de $ 5.000 sale en T4, N2, S2 y P1 porque esos cuatro son «el pie» de cada tipo de página.

**Por qué esos números:** hay 60 climas por mes (mañana y noche). Cada clima lleva **un solo auspiciante**, se reserva por fecha y en orden de llegada, y si se llena queda lista de espera. **Nadie pierde lo que compró ni se le hace menos porque otro compró más.** Cuando los climas se llenen, sube el precio del clima. Lo de $ 15.000 se sacó.

## 4. Qué es de Google y qué vendemos nosotros

| | **Lo vendemos nosotros** | **Es de Google (AdSense)** |
|---|---|---|
| Lugares | T1–T4, N1, N2, S1, S2, P1, C1 | A1, A2, A3 |
| Quién elige qué se muestra | Nosotros: comercios de Balcarce que conocemos | Google, automático |
| Quién paga | El comercio, por mes | Google, por vistas y clics |
| Ingreso realista | Depende de cuántos se sumen | Al principio, **US$ 100 a 200 por mes** (estimación de la investigación del 3/11): cubriría los gastos de herramientas |
| Se mezclan | **Nunca** | **Nunca** |
| Cookies | No necesita | **Sólo se muestra si el lector aceptó las cookies** |

**Estado de AdSense hoy:** el código de editor `ca-pub-2759023791445864` ya está cargado en el sitio y Google está **revisando** el pedido (3/11). Los números de bloque (`ADSENSE_SLOT_NOTA`, `ADSENSE_SLOT_SECCION`) están **vacíos** en la configuración, así que los bloques A1/A2/A3 salen en formato automático. **A confirmar** si Google ya está mostrando anuncios o si todavía no aprobó el sitio. Google rechaza el contenido «apenas retocado»: por eso conviene escribir más **notas propias** (Halloween, Nancy, gacetillas), que es el contenido original que más suma.

**Google Analytics** (`G-9HK0GXEMH7`) también está cargado desde el 3/11 y mide visitas, de dónde llegan y aparatos. Ver `ESTADISTICAS-LINEA-DE-BASE-2026-11-03.md`. Cloudflare Web Analytics mide aparte y no depende de las cookies.

## 5. El clima auspiciado

Es **lo distintivo** del medio: nadie más en Balcarce ofrece un clima con voz. El comercio aparece en **tres lugares** a la vez:

| Dónde | Qué ve el lector |
|---|---|
| **El reel del clima** (mañana y noche) | La voz dice al inicio *«el clima de hoy lo auspicia [comercio]; los encontrás en Instagram como [arroba cuenta]»* y desde el segundo 3 queda una franja «Auspicia · comercio · @cuenta». El reel dura 22 segundos en lugar de 18 |
| **La nota diaria del clima** | Un recuadro «El clima de hoy llega con [comercio]» **arriba de la nota** (C1), con logo y enlace a su red. La nota sale a las **7:30** y se actualiza a las **19:00** si el pronóstico cambió |
| **La página `/clima`** | El mismo recuadro, arriba (C1) |
| **El texto del posteo / historia** | «Auspicia: [comercio] · [@cuenta]» |

Reglas:

- **Un solo auspiciante por clima.** Se reserva por calendario, en orden de llegada, con lista de espera.
- El auspiciante **nunca habla por la voz sin que se sepa**: la mención dice «auspicia» o «llega con»; no simula ser una noticia.
- La nota del clima diaria **no se indexa** en Google y **no va a redes como posteo**: el clima sale como reel propio.
- **A confirmar:** el calendario de climas por fecha (reservar días, lista de espera) está definido como decisión, pero en el código sólo vi que el sitio muestra **el comercio cargado con lugar `clima`** y que las piezas toman «uno por día, rotando». **Si hay un calendario de reservas por fecha ya programado, no lo encontré.**

## 6. El proceso con un comercio nuevo, desde el primer mensaje hasta que sale el aviso

Es **siempre lo mismo** (Hernán, 2/11, cerrado):

| Paso | Quién | Qué se hace |
|---|---|---|
| **1. El comercio pregunta** | Comercio | Escribe por Instagram o WhatsApp (2266 51-1612) |
| **2. Se arma la respuesta** | Hernán + Claude | Hernán le pasa a Claude el Instagram (o la red o los datos) del comercio y la consulta textual |
| **3. Claude devuelve tres cosas** | Claude | (a) El **mensaje** para mandar (a partir de `docs/propuestas/media-kit/mensaje-generico.md`, ajustado a la consulta); (b) el **media kit personalizado** en PDF (con los precios); (c) las **preguntas personalizadas** en PDF. Más una **ficha** del comercio (quiénes son, qué fotos pedirles, el aviso, la prenota) en `docs/propuestas/anunciantes/<comercio>.md` |
| **4. Hernán manda** | Hernán | Los dos PDF y el mensaje, por donde escribieron |
| **5. El comercio manda material** | Comercio | **Logo** (la mejor calidad, mejor PNG transparente); **5 a 10 fotos horizontales** del local, los productos y las personas; **datos fijos** (nombre exacto, dirección, horarios, teléfono, redes, si hacen envíos). Las fotos **no se bajan de Instagram**: se les piden |
| **6. El comercio contesta las 10 preguntas** | Comercio | Por **audio o por escrito** al WhatsApp 2266 51-1612, como le quede más cómodo |
| **7. Se arma la bienvenida** | Claude + Hernán | La **nota** (de redacción, firmada por Hernán, con lo que dijeron entre comillas y como dicho por ellos, nada que no hayan dicho), el **reel con voz** y la **historia** sobre esa nota. Se hace una sola vez y no se cobra aparte |
| **8. Se carga el aviso** | Claude | Ver sección siguiente |
| **9. Sale el aviso** | Sistema | Aparece en los lugares de su plan, hasta 5 minutos después |
| **10. Climas e historias** | Hernán + Claude | Se reservan los climas en el calendario y se programan las historias del mes |

**El primer comercio** es **Sweet Candy Bar** (`@_sweet.candy.bar`; ficha en `docs/propuestas/anunciantes/sweet-candy-bar.md`, con su media kit y sus preguntas ya armados). Según el plan, Hernán le mandó la propuesta el 2/11 por la noche. **A confirmar** si ya contestó y si su aviso está cargado: el manual del 3/11 decía que todavía no había avisos cargados.

### Cómo se carga un aviso (lo hace Claude con un archivo y un comando)

Hernán (por Telegram o por el chat) pasa:

1. **Comercio** (el nombre) y, si tiene, **una línea de texto** (hasta 120 letras).
2. **Enlace** (su Instagram, su página o su WhatsApp como `https://wa.me/549…`). Tiene que empezar con `https://`.
3. **Plan** (5000, 10000, 20000, 30000, 50000) o los lugares a mano.
4. **Desde y hasta** (primer y último día; los dos son opcionales).
5. **Imagen** (la subimos al sitio y se pone su dirección; si no hay, se usa sólo el texto).

Con eso se arma un archivo `aviso.json`, por ejemplo:

```json
{
  "comercio": "Sweet Candy Bar",
  "texto": "Tortas y mesas dulces en Balcarce",
  "enlace": "https://www.instagram.com/_sweet.candy.bar",
  "plan": "10000",
  "desde": "2026-11-10",
  "hasta": "2026-12-10"
}
```

Y se corren dos comandos:

```
node v3/sitio/scripts/cargar-aviso.mjs aviso.json --salida=aviso.sql
npx wrangler d1 execute radar-nucleo --remote --file=aviso.sql
```

El programa **revisa todo antes de tocar la base** (enlace con https, fechas bien escritas, lugares que existen, que haya texto o imagen) y avisa si algo está mal. Si no se escribe `lugares`, salen los **del plan**. Cargar de nuevo el mismo comercio **lo actualiza**, no lo duplica (el `id` es el nombre en minúsculas con guiones: `sweet-candy-bar`).

### Cómo se saca un aviso

- **Sacarlo ya:** `node v3/sitio/scripts/cargar-aviso.mjs --sacar=sweet-candy-bar --salida=sacar.sql` y después `npx wrangler d1 execute radar-nucleo --remote --file=sacar.sql`. Queda **apagado** en la tabla (no se borra: sirve de historial).
- **Que termine solo:** el campo `hasta`. Al día siguiente ya no sale.
- **Cambiar** el texto, la imagen o las fechas: se vuelve a cargar con el mismo `id`.

> **A confirmar:** en el plan está previsto que en `/admin` haya una pestaña para cargar avisos y auspicios, pero no encontré ese panel en el código. Hoy se carga con el comando de arriba.

## 7. El media kit y su nota

| Pieza | Qué es | Dónde está | Precios |
|---|---|---|---|
| **La nota pública «Publicitá en Radar Balcarce»** | Nota firmada «Hernán Accomo» con cinco láminas que muestran dónde va cada espacio (capturas reales con los lugares dibujados). Es a lo que lleva `radarbalcarce.com/publicidad` (redirige) | `radarbalcarce.com/nota/publicita-en-radar-balcarce-mediakit`; texto en `docs/propuestas/NOTA-MEDIA-KIT.md`; se genera con `v3/sitio/scripts/nota-media-kit.mjs` | **Sin precios**: «Los precios, por WhatsApp» |
| **El media kit en PDF** | Una hoja con el ícono del sitio, «nos gustaría trabajar con ustedes», la bienvenida, la tabla de planes y los lugares | `docs/propuestas/MEDIA-KIT-2026-11.pdf` (se arma desde `MEDIA-KIT-2026-11.html` con Chrome sin ventana; una versión por comercio con `node scripts/media-kit.mjs docs/propuestas/anunciantes/<comercio>.json`) | **Con precios** |
| **Las preguntas estándar** | Diez preguntas para la nota del comercio | `docs/propuestas/PREGUNTAS-ESTANDAR.pdf` | — |
| **Mensaje genérico** | Texto para mandar con los dos PDF | `docs/propuestas/media-kit/mensaje-generico.md` | Cita el plan de $ 5.000 |
| **Manual de avisos** | Dónde va cada espacio, con capturas | `docs/propuestas/MANUAL-AVISOS-3-0.md` | — |

Hernán aprobó el kit el 2/11: «quedó espectacular».

Las **diez preguntas** para la nota del comercio (resumen): quiénes son; cuándo y cómo arrancó; qué hacen o venden; qué los hace distintos; cómo es un día normal; una anécdota o un cliente; qué significa Balcarce para el negocio; qué les costó y qué aprendieron; qué viene; y dónde los encuentra la gente. **No** se les pide una promoción exclusiva para lectores de Radar (Hernán: «eso hay que sacarlo»).

## 8. Qué decir y qué no

### Sí se dice

- «Les hacemos, **sin costo**, una nota sobre su emprendimiento, un reel con voz y una historia.» (La bienvenida.)
- «El plan más económico es de **$ 5.000 por mes**.»
- «El clima auspiciado: la voz dice *el clima de hoy llega con ustedes* y abajo queda su nombre y su Instagram.» Es lo distintivo.
- «Los precios de noviembre y diciembre de 2026 son de **promoción**, con más climas de los habituales.»
- «Todo aviso va marcado como **Publicidad**, con su enlace, y separado de las noticias.»
- «Quien pauta **no decide qué publicamos**.»
- «Radar se sostiene con los comercios de acá. Queremos que participen todos.» (Radar no busca ganancia: los auspiciantes financian en parte el medio.)
- «Las respuestas a las preguntas, por WhatsApp (2266 51-1612), por audio o por escrito, como les quede más cómodo.»

### No se dice ni se hace

| No | Por qué |
|---|---|
| **Números de audiencia** (visitas, seguidores, alcance) en nada que se mande | Decisión del 2/11: «sería medio lamentable mostrar nuestros números». Además hoy el tráfico del sitio incluye mucho de robots (ver línea de base) |
| **Precios en la web pública** | La página y la nota no muestran precios; van por WhatsApp o en el PDF |
| **Marketing para el comercio** (revisar sus redes, hacerle imágenes, darle consejos) | No se ofrece, a conciencia. Nos quedamos con lo nuestro: la web y nuestras redes |
| **Pedirles una promoción exclusiva para lectores de Radar** | Se sacó de las preguntas |
| **Regalar el clima** | Es lo que más se valora; se vende por calendario |
| **Prometer más de lo que hay** en climas o lugares | Cada clima lleva un solo auspiciante; el lugar fijo es de uno solo por mes |
| **Nombrar a un chico de una fiesta** o usar la foto de un chico en nuestras piezas, aunque el comercio la publique | La regla de menores del medio vale también para los anunciantes |
| **Decir que una nota es «patrocinada»** o ocultar que el aviso lo es | La nota de bienvenida es de redacción y va sin rótulo (decisión del 2/11); el aviso, en cambio, **siempre dice que es publicidad** |
| **Afirmar algo que el comercio no dijo** | Si dicen «el mejor de Balcarce», va entre comillas y como dicho por ellos |
| **Avisos que parpadeen, ventanas emergentes o videos que arrancan solos** | Regla de siempre: quietos, con letra chica, nunca en el rojo de la marca |
| **Mezclar AdSense con los avisos locales** | Nunca comparten espacio ni rotan juntos |
| **Que un aviso cambie una noticia** | Lo que se escribe sobre un anunciante en las noticias sigue el mismo criterio que sobre cualquier otro |

### Todavía sin decidir (se mira cuando llegue el caso)

Si se aceptan o no ciertos rubros (apuestas, préstamos), si Política y Policiales llevan patrocinio, y el rótulo «Espacio publicitario». Hernán dijo el 2/11 que no son reglas: «somos un medio local, no tenemos mucho impedimento con ese tipo de cuestiones»; si llega un aviso así, se mira ese caso.

## 9. Pendientes de la publicidad

- Cargar el **primer aviso real** (Sweet Candy Bar, a confirmar).
- El **calendario de climas** con reserva por fecha y lista de espera (a confirmar si está programado).
- Una **pestaña de avisos y auspicios** en `/admin` para cargarlos sin comandos (a confirmar).
- Un **manual en vivo** con capturas reales cuando todo esté en el dominio (Hernán lo pidió el 3/11).
- La **publicidad de Radar** en redes (reel sin voz, con la estética del sitio y los precios) y las tres piezas de Participá con más gancho.
- Cuando los números estén «limpios», decidir si se muestran en el media kit.
- Pedir presupuesto, como cliente, a tres o cuatro medios de Balcarce para saber qué cobran los demás (no hay tarifas públicas).
