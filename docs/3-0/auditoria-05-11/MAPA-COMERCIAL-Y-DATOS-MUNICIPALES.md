# Mapa comercial de Balcarce y datos del municipio: informe de investigación (5/11/2026)

*Para Hernán y Andrés. Investigación sólo de lectura: no se escribió a nadie, no se crearon cuentas, no se tocó producción. Lo que está marcado
**[verificado]** se probó con curl el 5/11/2026; lo marcado **[no verificado]** sale de memoria o de buscadores y hay que confirmarlo antes de apoyarse.*

## Resumen (10 líneas)

1. **Ya hay una guía armada y dormida**: `comercial/` tiene 145 fichas de OpenStreetMap (24/09), el puntaje de «¿sigue abierto?», los mensajes de WhatsApp y una vista previa con mapa. Sólo 1 figura activo con certeza. No hay que inventar nada: hay que despertarla y completarla.
2. **El listado de entrada más barato y legal es OpenStreetMap** (gratis, pide nombrarlo como fuente) más las fuentes oficiales; Google Places sirve de consulta, no de base propia (sus términos restringen guardar los datos).
3. **La confirmación con el titular es lo que vuelve valioso el mapa**: se hace por mail con un enlace único, y por WhatsApp sólo si una persona manda cada mensaje. El envío masivo por la API de WhatsApp es caro y exige que el comercio haya aceptado antes.
4. **Se guardan sólo datos del negocio** (nunca un celular particular ni el dueño): así se cuida la Ley 25.326. Cada mensaje ofrece la baja.
5. **Costo mensual de la primera etapa: US$ 0** (OpenStreetMap, el sitio ya existente, mails de un servicio gratuito). Entra holgado en el tope de US$ 10.
6. **Monetización**: ficha destacada y aviso rotulado «Publicidad», con la regla de la 3.0 (todos los que pagan se tratan igual; confirmar datos es gratis y no se vende).
7. **Municipio (parte B)**: el sitio oficial anda, tiene feed RSS y API de WordPress abiertos y se actualiza varias veces por día; el Concejo Deliberante también tiene feed; el Boletín Oficial está en el SIBOM de Provincia. **Se puede leer cada 15 minutos sin problema técnico.**
8. **Lo que NO tiene feed**: licitaciones, decretos y la agenda de eventos (sólo páginas HTML); la agenda no está en la API de eventos que probamos (404).
9. **Alertas del SMN no verificadas**: el servicio devolvió 503 y la página de alertas 403 desde acá.
10. **Pedido formal**: existe el acceso a la información pública (Ley 27.275 nacional; en Provincia, la Ley 12.475 [no verificado]); conviene un pedido corto por escrito al municipio, con borrador abajo, y de paso pedir el padrón de comercios habilitados.

## 1. Por dónde empezar (primera etapa chica y barata: 4 a 6 semanas, US$ 0)

1. **Despertar `comercial/` sin mostrar nada público todavía.** Volver a correr `node comercial/importar-osm.mjs` (hoy los datos son del 24/09) y mirar la vista previa (`node comercial/vista.mjs`).
2. **Sumar lo que ya es público y oficial, sin pedir permiso**: instituciones (municipio, hospital, escuelas, clubes, bomberos, museos) con los datos que ellas mismas publican. Ya existe `ingesta/contactos-agenda.json` con ese criterio (canales publicados por la institución, con la dirección de donde salió cada dato). Se puede reutilizar como semilla de «instituciones».
3. **Hacer una primera tanda de 30 a 40 comercios y lugares** (los que más buscan los vecinos: farmacias, hoteles, restaurantes, ferreterías, supermercados, lugares turísticos). A mano o con ayuda de la IA, mirando la página o la red que el propio comercio publica, **no** raspando Google.
4. **Confirmar con cada titular, de a uno**, con el mensaje de `comercial/propuestas.mjs` (que ya trae «Confirmar datos» y la baja). Una persona lo manda. Pedirle que confirme en un formulario (enlace único).
5. **Publicar sólo lo confirmado** (o lo oficial con la leyenda «sin confirmar por el titular»), en una página por rubro y una ficha, con mapa. Recién después, mirar si hay demanda de ficha destacada.
6. **En paralelo, y casi gratis (parte B)**: un agente que lea cada 15 minutos el feed del municipio y del Concejo, y proponga notas. Ver sección 7.

No se necesita Google, ni la API de WhatsApp, ni plata, para esta etapa.

## 2. Qué ya existe en el repositorio (no reinventar)

| Qué | Dónde | Estado |
|---|---|---|
| Base de fichas (JSON), con rubro, dirección, ubicación, contacto, redes, horarios, fuentes y vigencia | `comercial/datos/comercios.json`, `comercial/esquema.mjs`, `comercial/base.mjs` | **145 fichas** de OSM del 24/09: 80 con dirección, 25 con teléfono, 13 con red o web, 12 con horarios [verificado leyendo `COMERCIAL.md`; recuento del archivo: 145, 25 con teléfono] |
| Rubros por etiqueta de OSM (15 rubros) | `esquema.mjs` (`RUBROS`) | Hay muchas «Educación y cultura» (47) y pocas de belleza, hogar, mascotas: refleja lo que cargó la gente en OSM, no lo que hay |
| Importador OSM (Overpass, 3 espejos) | `comercial/importar-osm.mjs` | Funciona; la zona es un rectángulo del casco urbano |
| Puntaje «¿sigue abierto?» | `comercial/vigencia.mjs`, `verificar.mjs` | Funciona; sin confirmar casi todo queda «dudoso» o «a confirmar» |
| Mensajes y catálogo de servicios (el primer mensaje no vende; se manda a mano; ofrece la baja) | `comercial/propuestas.mjs` | Escrito y con pruebas; nadie lo llama |
| Vista previa con mapa, guía y lista de «qué falta confirmar» | `comercial/vista.mjs` → `salida/guia-previa.html` | Funciona; no se versiona |
| Instituciones con canales públicos y su fuente | `ingesta/contactos-agenda.json` | Existe; sirve para agenda de eventos |
| Panel de contactos del celular (cifrado) | `web/public/panel/contactos.js`, `web/data/contactos-celular.json` | **Vacío** (`"contactos": {}`) |
| Plan de la 3.0: perfil «mapa comercial real», avisos con rotación en D1 | `v3/nucleo/PERFIL.md`, `docs/propuestas/PLAN-RADAR-3-0.md`, `PUBLICIDAD-PRIMER-COMERCIO.md` | Planes escritos; el módulo de avisos de la 3.0 está por construir |

**Lo que falta** (según `COMERCIAL.md`): el campo «tipo de actividad» (comercio, profesional, industria, servicio, institución, feria), instituciones y profesionales cargados, conexión con el sitio y con el panel, un formulario de confirmación con enlace único, y el estado «confirmado por el titular» con fecha.

## 3. Fuentes para armar el listado de entrada

| Fuente | Qué da | Costo | Términos | Estado |
|---|---|---|---|---|
| **OpenStreetMap / Overpass** | Nombre, rubro, ubicación, a veces teléfono y horario | Gratis | ODbL: hay que citar «© colaboradores de OpenStreetMap» y compartir igual si se publica una base derivada | **Anda** (el repo ya tiene 145; en esta investigación el servidor `overpass-api.de/api/status` no respondió desde acá, `nominatim.openstreetmap.org` sí: reintentar) |
| **Sitios y redes que publica cada comercio** | Datos más actuales | Gratis | Son datos del negocio publicados por él; no raspar en masa | Anda (a mano) |
| **Municipio de Balcarce** (balcarce.gob.ar y sus páginas de turismo, cultura, salud, educación) | Instituciones, escuelas, hospital, delegaciones, museos, eventos | Gratis | Información pública oficial; citar la fuente | **Anda** (sitio verificado); falta ver si publican un listado de comercios |
| **Sitio de Turismo** (`www.balcarce.tur.ar`) | Menús de «Alojamiento», «Gastronomía», «Otros alojamientos» | Gratis | Sitio de turismo; pedir permiso para reutilizar | **Anda**. Página con listas, **sin API de fichas** (el tipo «portfolio» devolvió 0 elementos) [verificado] |
| **Padrón de comercios habilitados del municipio** (tasa de seguridad e higiene) | Lista completa y oficial de nombre y rubro | Gratis | Se pide por acceso a la información pública; los datos de personas físicas pueden venir limitados | **No verificado**: nadie lo pidió todavía. Es **el listado más completo posible** |
| **Cámara de Comercio / Centro Comercial** | Socios, rubros, contactos | Gratis | Hace falta un acuerdo con la entidad | No verificado (no se buscó su contacto en esta tanda) |
| **Google Places API** | Nombre, dirección, teléfono, horario, reseñas | Hay límites gratis por tipo de consulta; pasados, se paga por pedido (cifras de Google sin verificar contra su página oficial) | Google restringe guardar y reutilizar sus datos fuera de un mapa de Google. **No sirve como base propia**; sí para mirar uno por uno, a mano | Cifras de terceros, **no verificadas contra Google**; términos de almacenamiento **no verificados** |
| **Guías tipo Páginas Amarillas / Guía Balcarce / directorios privados** | Listados viejos, mucha información desactualizada | — | Son bases de terceros: no copiar | **No verificado**; no recomendado como fuente |
| **Facebook / Instagram** | Datos y horarios recientes del propio comercio | Gratis | Meta prohíbe el raspado automático; mirar a mano y anotar | Anda a mano; **no automatizar** |

**Recomendación**: base = OSM + instituciones oficiales + lo que el titular confirme. Pedir el padrón del municipio como segundo paso. Dejar Google para mirar un caso suelto.

## 4. Confirmación con el titular: cómo hacerlo legal y sin spam

### 4.1 Marco legal (lo que hay que cuidar)

- **Ley 25.326 de Protección de los Datos Personales** [de memoria, no verificado en esta tanda]: protege datos de **personas**. Un comercio con nombre de fantasía, dirección y teléfono comercial es dato de empresa, pero si es un monotributista o profesional con su nombre y un celular particular, es dato personal. Por eso `comercial/esquema.mjs` ya fija la regla: **sólo datos del negocio**. Su art. 27 regula las bases con fines de publicidad: hay que permitir acceder, corregir y pedir la baja sin costo.
- **Registro «No Llame» (Ley 26.951)**: aplica a llamadas y mensajes publicitarios a números inscriptos. El primer mensaje de «confirmar datos» no vende, pero igual conviene ofrecer la baja [de memoria, no verificado].
- **Antispam**: en Argentina no hay una ley de spam específica que se pueda citar con certeza; rigen la 25.326 y la Defensa del Consumidor. La regla práctica que ya usa el repo es la correcta: **un mensaje a la vez, de una persona, que dice quién escribe, por qué y cómo salirse** [consultar con un abogado antes de escalar].
- **La autoridad es la AAIP** (Agencia de Acceso a la Información Pública); las bases con datos personales con fines de publicidad se inscriben en su registro [no verificado: ver si corresponde inscribirse para la guía].
- **Política de WhatsApp Business** [no verificado contra Meta]: para escribirle primero a alguien por la API hace falta que **haya aceptado recibir mensajes** (opt-in) y usar una **plantilla aprobada**; fuera de la ventana de 24 horas desde que el cliente escribe, sólo se pueden mandar plantillas.

### 4.2 Costo de WhatsApp (Argentina)

Meta cobra **por mensaje** desde el 1/7/2025 y en octubre de 2025 bajó los precios para Argentina [según la documentación oficial citada por el buscador; los montos no aparecen]. Los montos que encontré **no coinciden** entre fuentes de terceros: marketing unos US$ 0,07 y utilidad entre US$ 0,005 y US$ 0,03 por mensaje. **No verificado: mirar la tabla oficial de Meta.** Con 300 comercios y un mensaje por comercio serían unos US$ 2 a 22 una vez; el costo está lejos del tope. El problema no es el precio: es el opt-in, el trámite de la cuenta y que un mensaje de empresa a un desconocido cae mal.

### 4.3 Dos caminos

| | WhatsApp Business **app** (el del medio, 2266 51-1612) | **Cloud API** de WhatsApp | **Mail con formulario** |
|---|---|---|---|
| Quién manda | Una persona, uno por uno | Un programa | Un programa |
| Costo | 0 | Por mensaje (arriba) + trámites de Meta | 0 con un servicio gratuito [no verificado el límite actual] |
| Riesgo de bloqueo | Bajo si es de a pocos | Medio si se usan listas sin opt-in | Bajo si se envía poco y con baja |
| Sirve para | Primer contacto cálido, pueblo chico | Recién cuando haya comercios que aceptaron | Confirmar con constancia (queda registro) |

**Recomendación**: primer contacto por WhatsApp de la app o presencial (una persona, el enlace que ya genera `propuestas.mjs`), y **la confirmación por un formulario con enlace único**: el titular ve sus datos, corrige, tilda «confirmo» y elige si quiere salir de la guía. Eso deja **registro con fecha**, que es lo que pide la ley y lo que da confianza. La Cloud API, para más adelante.

### 4.4 El enlace único

Una dirección tipo `radarbalcarce.com/confirmar/<código largo y al azar>`, una por comercio, que:

- muestra sólo los datos del negocio y deja corregir;
- tiene los botones «Está todo bien», «Corregir» y «Quiero que me saquen»;
- guarda cuándo y desde qué vía confirmó (sin guardar datos personales de quien llena);
- vence a los 30 días y se puede reenviar.

En la 3.0 esto es una página más en el sitio con una base chica (D1), junto al módulo de avisos.

## 5. Cómo se modela el dato

Sobre la ficha que ya existe, sumar estos campos (los que ya están se dejan igual):

| Campo | Para qué |
|---|---|
| `actividad` | comercio, profesional, industria, servicio, institución, feria o lugar (el que falta en `COMERCIAL.md`) |
| `estado` | `sin_confirmar` / `oficial` (viene de un organismo) / `confirmado` (lo dijo el titular) / `cerrado` / `baja` (pidió salir) |
| `confirmado_cuando`, `confirmado_por_via` | Fecha de última confirmación y por qué vía (formulario, mail, WhatsApp, visita) |
| `vence` | A los 12 meses, vuelve a «sin confirmar» y se pide de nuevo |
| `fuentes[]` | Ya existe: de dónde salió cada dato, con enlace y fecha |
| `contacto_publico` | Sólo canales del negocio; nunca el celular particular |
| `destacado`, `aviso` | Si paga; **separado** del dato de la ficha |
| `consentimiento` | Si aceptó figurar, con fecha |

Regla simple para el sitio: **«Confirmado el 3/11/2026 por el titular»** o **«Dato de OpenStreetMap, sin confirmar»**. Nunca los dos mezclados.

## 6. Cómo se muestra en el sitio y cómo se gana plata

**Páginas**: `/guia` (portada con buscador y mapa), `/guia/<rubro>` (ej.: farmacias, hoteles, restaurantes), `/guia/<rubro>/<comercio>` (ficha), `/guia/turismo` (autódromo, sierras, laguna, museo Fangio, plazas). Una ficha por comercio, con **schema.org `LocalBusiness`** (o el tipo más preciso: `Pharmacy`, `Restaurant`, `Hotel`), nombre, dirección, teléfono, horarios, coordenadas y enlaces a sus redes; el mapa se arma con las coordenadas que ya hay (OSM). Para SEO local: título tipo «Farmacias en Balcarce», dirección fija, y sumar la ficha al mapa del sitio (el sistema de sitemaps existente de `web/lib/sitemap-sitio.js` sirve).

**Hay una trampa**: marcar un dato como `LocalBusiness` sin confirmar puede mostrar un horario viejo en Google. Sólo se marcan con schema los confirmados.

**Plata sin romper la neutralidad** (todo coherente con `v3/nucleo/PERFIL.md` y `PUBLICIDAD-PRIMER-COMERCIO.md`):

- Estar en la guía, con datos confirmados, es **gratis** para todos.
- **Ficha destacada** (arriba en su rubro, con foto y botón de WhatsApp) y **aviso** pago, **siempre rotulados** («Publicidad» / «Destacado»).
- La posición en el rubro **no se vende** en el orden alfabético ni en el mapa: el destacado va en un recuadro aparte.
- **Confirmar datos nunca se cobra**: los que no pagan aparecen igual.
- Las notas del medio sobre un comercio que paga se rotulan como nota auspiciada y se separan de las noticias.
- Mismo criterio para todos: un comercio que paga no se trata distinto en lo editorial (ya es regla del perfil).

## 7. Parte B: información del municipio, probada con curl (5/11/2026)

### 7.1 Lo que anda y su formato [verificado]

| Fuente | Dirección | Respuesta | Formato | Actualización observada |
|---|---|---|---|---|
| **Sitio del municipio** | `https://balcarce.gob.ar/` | 200 | HTML | A diario |
| **Feed RSS** | `https://balcarce.gob.ar/feed/` | 200 | RSS 2.0 (10 notas) | Hoy 5/11 hubo notas a las 14:42, 15:01 y 15:14 (UTC): **varias por día** |
| **API de WordPress (notas)** | `https://balcarce.gob.ar/wp-json/wp/v2/posts?per_page=2` | 200 | JSON | 2.693 notas en total; incluye fecha, enlace, título y categorías (ej.: Deportes, Turismo, Cultura, Obras, Museo, Juventud, Espacios Públicos) |
| **Mapa del sitio** | `https://balcarce.gob.ar/sitemap.xml` | 200 | XML | Estándar de WordPress |
| **Agenda de eventos** | `https://balcarce.gob.ar/events/` | 200 | HTML | La API de eventos (`tribe/events/v1`) devolvió **404**: no hay API; leer la página |
| **Boletín Oficial municipal** | `https://balcarce.gob.ar/boletin-oficial/` | 200 | HTML | Dice «mínimo dos publicaciones por mes»; manda al SIBOM de Provincia |
| **SIBOM (Boletines Oficiales Municipales de Provincia)** | `https://sibom.slyt.gba.gob.ar/cities/10` | 200 | HTML con lista de boletines | Último: boletín 129, 29/10/2026; anteriores 21/09, 14/09, 11/09, 04/09, 21/08 (**cada una o dos semanas**) |
| **Decretos 2026** | `https://balcarce.gob.ar/decretos-2026/` | 200 | HTML (páginas por año) | No se midió la frecuencia |
| **Compras y licitaciones** | `https://balcarce.gob.ar/compras-y-licitaciones-1/` | 200 | HTML (lista «Licitación Pública Nº 1/26…») | No se midió; sin feed |
| **Transparencia fiscal** | `https://balcarce.gob.ar/transparencia-fiscal/` | 200 | HTML | No se midió |
| **Concejo Deliberante** | `https://concejodeliberantebalcarce.gob.ar/` | 200 | HTML | Sitio propio |
| **Feed del Concejo** | `https://concejodeliberantebalcarce.gob.ar/feed/` | 200 | RSS; última nota 27/10/2026 | **Más lento**: unas pocas notas por mes (la más vieja del feed, 6/3/2026) |
| **API del Concejo** | `https://concejodeliberantebalcarce.gob.ar/wp-json/` | 200 | JSON (WordPress) | — |
| **Turismo** | `https://www.balcarce.tur.ar/` | 200 | HTML + WordPress | Página de lista de alojamiento y gastronomía; sin API de fichas |
| **Datos abiertos de Nación** (`datos.gob.ar`, API CKAN) | `…/api/3/action/package_search?q=balcarce` | 200, JSON | CKAN | **0 resultados** sobre Balcarce |
| **Datos abiertos de Provincia** (`catalogo.datos.gba.gob.ar`) | idem | 200, JSON | CKAN | **0 resultados** sobre Balcarce (hay datos provinciales, no municipales) |
| **Boletín Oficial de la Nación** | `https://www.boletinoficial.gob.ar/` | 200 | HTML | Diario (no se midió cuánto afecta a Balcarce) |
| **Boletín Oficial de la Provincia** | `https://boletinoficial.gba.gob.ar` | 200 | HTML | Portal anda; la dirección con `www.` no respondió |
| **Open-Meteo (clima)** | API | 200 | JSON | Ya la usa el medio |
| **ARBA/Arbal** | `https://arbal.gob.ar/` | 200 | HTML | No evaluado |
| **Robots del municipio** | `…/robots.txt` | 200 | Sólo bloquea `/wp-admin/` | **No prohíbe leer** el sitio ni el feed |

### 7.2 Lo que no anda o no se pudo comprobar

| Fuente | Resultado |
|---|---|
| `ws.smn.gob.ar/alerts/type/AL` (alertas del SMN) | **503** desde acá: no se sabe si es caída pasajera o bloqueo |
| `smn.gob.ar/alertas` | **403**: bloquea a este cliente |
| `hcdbalcarce.gob.ar` | **No responde** (el Concejo está en `concejodeliberantebalcarce.gob.ar`) |
| `oseba.com.ar`, cooperativa eléctrica, `turismo.balcarce.gob.ar` | **No respondieron** esas direcciones (pueden ser otras direcciones; no se buscaron) |
| `overpass-api.de` | No respondió esta vez (el repo tiene espejos) |
| **Defensa Civil, Hospital, INTA, Cooperativas de servicios, cortes de tránsito, obras** | **No verificado**: no se encontró feed propio; se cubren con las notas del municipio (categorías «Obras», «Espacios públicos») y los medios ya leídos. Redes oficiales: la web municipal las enlaza (Facebook `municipiodebalcarce` responde 200) pero **no se deben raspar** |

### 7.3 Cómo lo leería un agente cada 15 minutos

- **El feed RSS y la API de WordPress** son la forma correcta: una consulta chica (`posts?per_page=10&_fields=id,date,link,title,categories`) cada 15 minutos son 96 pedidos por día, imperceptible para el servidor. Se guarda el último `id` visto y sólo se procesa lo nuevo.
- **Páginas HTML sin feed** (agenda, licitaciones, decretos, SIBOM): una vez por hora o por día alcanza; el agente compara la lista contra la anterior y avisa lo que apareció. El SIBOM publica cada una o dos semanas: **una vez por día**.
- **Qué hace el agente con lo nuevo**: clasifica (obra, tránsito, licitación, decreto, evento, aviso de servicio), lo cruza con lo que ya tiene el motor (el municipio ya es fuente del cruce: `balcarce.gob.ar/events` está en `contactos-agenda.json`), y **propone** una nota o una ficha de agenda; la nota se escribe con las reglas del medio (se verifica contra la fuente; firma que dice quién la escribió).
- **Restricciones de uso**: no encontré términos de uso que prohíban reutilizar; el `robots.txt` no bloquea. Conviene igual **citar siempre la fuente**, identificar al lector con un User-Agent con el mail del medio (como ya hace el importador) y no bajar de a muchos. **No verificado**: si el sitio tiene aviso legal sobre reutilización.
- **Cuidado**: el municipio es fuente única de lo oficial; un decreto o una licitación se publica con su número y se enlaza, sin interpretar de más. Para lo que toca personas (sanciones, designaciones) aplican las mismas reglas del semáforo del medio.
- **Lo hace ya parte del motor**: las notas del municipio ya entran en `ingesta/fuentes.mjs` como fuente de Balcarce (el repo marca al municipio como «organismo» y sus fotos como fuente propia). Lo que **falta** es un lector de lo que no es nota: licitaciones, decretos, boletín SIBOM, Concejo (sesiones, ordenanzas). Eso es lo nuevo.

### 7.4 Pedir datos al municipio (acceso a la información pública)

- **La Ley 27.275** (Derecho de Acceso a la Información Pública, nacional) obliga a organismos nacionales; para el municipio rigen la **norma provincial (Ley 12.475 de acceso a documentos administrativos, y su decreto)** y las ordenanzas locales **[de memoria, no verificado: confirmar cuál aplica en Balcarce y si hay una oficina o formulario]**. Es gratis y el municipio debe responder en un plazo (**15 días hábiles en la ley nacional; el provincial puede ser distinto: no verificado**).
- **Alternativa informal y más rápida**: hablar con la Secretaría de Prensa o Comunicación y pedir una casilla de prensa o un convenio chico: «Radar Balcarce difunde sus novedades y recibe sus comunicados».
- **Qué pedir**: (1) el padrón de comercios habilitados con nombre, rubro y dirección (sin datos de personas), (2) un enlace de datos abiertos para licitaciones, decretos y obras (en formato abierto: planilla), (3) incluir a Radar en la lista de prensa, (4) la lista de entidades y clubes con personería, (5) cuánto pauta el municipio en medios (esto ya lo pensó `PUBLICIDAD-PRIMER-COMERCIO.md`).

**Borrador del pedido** (para adaptar y firmar una persona):

> Balcarce, [fecha]
> A la Municipalidad de Balcarce — Mesa de Entradas / Secretaría de [corresponde].
> Quienes firmamos editamos Radar Balcarce (radarbalcarce.com), un medio digital local. Con fundamento en el derecho de acceso a la información pública, solicitamos, en formato abierto (planilla o CSV): 1) el listado de comercios e industrias habilitados en el partido, con razón social o nombre de fantasía, rubro y domicilio comercial, **sin datos personales de los titulares**; 2) el listado de instituciones, clubes y entidades de bien público registradas; 3) las licitaciones y compras de [año] con su estado. Además pedimos ser incluidos en la lista de comunicados de prensa y conocer si existe un canal de datos abiertos. Nos comprometemos a citar la fuente. Contacto: radarbalcarce@gmail.com — [nombre y DNI de quien firma].

## 8. Costo mensual estimado (tope extra: US$ 10)

| Parte | Etapa 1 | Etapa 2 (crece) |
|---|---|---|
| Datos (OSM, municipio) | US$ 0 | US$ 0 |
| Guía y mapa en el sitio (ya existente en Cloudflare) | US$ 0 | US$ 0 |
| Mails de confirmación | US$ 0 (un servicio gratuito; no verificado el límite vigente) | US$ 0 a 5 |
| WhatsApp | US$ 0 (la app, a mano) | Cloud API: unos US$ 2 a 20 **una sola vez** por tanda de 300 mensajes; mensual casi 0 si sólo se usa para plantillas de confirmación (precios no verificados) |
| Google Places | No se usa | No recomendado (no entra en el tope si se usa seguido) |
| Agente que lee el municipio | Un pedido por IA por nota nueva; entra en el cupo gratis actual de Gemini/Mistral | Igual |
| **Total** | **US$ 0** | **US$ 0 a 10** |

## 9. Pasos que sólo puede hacer una persona

1. **Decidir** que la guía sale con datos sin confirmar rotulados, o sólo con lo confirmado.
2. **Mandar** el primer mensaje a cada titular (de a uno, desde el WhatsApp del medio o en persona) y atender las respuestas.
3. **Aceptar** términos y la política de WhatsApp Business si algún día se pasa a la Cloud API (alta, número, verificación de empresa).
4. **Firmar y presentar** el pedido de acceso a la información pública (Mesa de Entradas) y seguirlo.
5. **Hablar** con la Cámara de Comercio y con Prensa del municipio.
6. **Consultar con un abogado** (o la AAIP) si hay que **inscribir la base** de contactos y qué leyenda poner en el formulario.
7. **Cargar** las fotos y logos de los comercios que pagan, y **cobrar** (la facturación es de ustedes).
8. **Autorizar** qué se muestra: nada de la guía va al sitio sin que ustedes lo prendan.

## 10. Riesgos legales y cómo se evitan

| Riesgo | Cómo se evita |
|---|---|
| Datos personales (dueño, celular particular) | Sólo datos del negocio; si es una persona física con su nombre, tratarlo como dato personal y pedirle consentimiento |
| Publicar un dato viejo (horario, dirección) | Estado «sin confirmar» a la vista y fecha de última confirmación |
| Copiar bases de terceros (Google, Páginas Amarillas, directorios) | No guardar ni copiar; usar OSM, lo oficial y lo que confirma el titular |
| Spam | Un mensaje por vez, de una persona, con la baja; nada de listas compradas |
| Baja que no se respeta | Estado `baja` que saca la ficha y se anota |
| Publicidad disfrazada de información | Rótulos «Publicidad»/«Destacado», lo editorial separado |
| Raspar Facebook/Instagram | No: mirar a mano y anotar la fuente |
| Datos del municipio mal interpretados | Citar número y enlace; sin interpretar de más |
| Mapa de otros (Google Maps embebido) | Mapa con OSM; si se usa un mapa de Google, respetar sus términos |

*Esta lista no reemplaza el consejo de un abogado: las referencias legales de este informe están citadas de memoria y no se verificaron en esta tanda.*

## 11. Lista de fuentes con su estado

**Andan [verificado el 5/11/2026]**: `balcarce.gob.ar` (HTML, feed RSS, API WordPress, sitemap, robots, agenda, boletín, decretos, compras, transparencia), `concejodeliberantebalcarce.gob.ar` (HTML, RSS, API), `sibom.slyt.gba.gob.ar/cities/10`, `www.balcarce.tur.ar`, `catalogo.datos.gba.gob.ar` y `datos.gob.ar` (API responde, sin datos de Balcarce), `boletinoficial.gob.ar`, `boletinoficial.gba.gob.ar`, `nominatim.openstreetmap.org`, Open-Meteo, `arbal.gob.ar`.

**No andan o no respondieron**: `ws.smn.gob.ar` (503), `smn.gob.ar/alertas` (403), `hcdbalcarce.gob.ar`, `oseba.com.ar`, cooperativa eléctrica, `turismo.balcarce.gob.ar`, `overpass-api.de` y `overpass.kumi.systems` (esta vez), `balcarce.gob.ar/wp-json/tribe/events` (404), `argentina.gob.ar/pais/datos-abiertos` (404).

**No verificado**: Overpass hoy, padrón de comercios del municipio, Cámara de Comercio (contacto y base), Google Places (cifras de Google y términos de almacenamiento), precios vigentes de la Cloud API de WhatsApp en Argentina, cambios de octubre 2026 en cobro de plantillas, leyes citadas (25.326, 26.951, 27.275, 12.475), plazos legales, obligación de inscribir la base en la AAIP, Defensa Civil/Hospital/INTA/cooperativas, frecuencia de decretos y licitaciones, términos de uso del sitio municipal.

**Fuentes web consultadas (buscador, de terceros o de Meta/Google; leer la página oficial antes de usar cifras)**: documentación de Meta sobre precios de WhatsApp Business Platform (developers.facebook.com/documentation/business-messaging/whatsapp/pricing); páginas de precios de Google Maps Platform (developers.google.com/maps/billing-and-pricing/pricing); tablas de terceros (ManyChat, Chatalog, go4whatsup) con cifras que no coinciden entre sí.
