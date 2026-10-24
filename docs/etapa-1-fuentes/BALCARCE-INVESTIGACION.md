# Balcarce a fondo · investigación de fuentes (15/10/2026)

*Pedido de Hernán y Andrés: investigar de nuevo, a fondo, todas las fuentes posibles de Balcarce (el partido: Balcarce, San Agustín, Los Pinos, Napaleofú, Ramos Otero, Bosch, Laguna La Brava), y decir de cada una si tiene feed, si hay que leer la página o si sólo se puede seguir a mano. Este archivo se arma con `node scripts/medir/generar-revision.mjs` a partir de `scripts/medir/balcarce-fondo.mjs`; la misma información está en la sección "Balcarce a fondo" de `REVISION-FUENTES.html`, donde se decide con Sí / No / Duda. No se tocó `ingesta/fuentes.mjs`.*

## En una mirada

Se investigaron **35 fuentes** de Balcarce. **11** se leen hoy (los 8 medios locales, la Municipalidad, el Concejo y la Facultad) y **9** son candidatas nuevas que no estaban en ningún registro.

| Cómo se lee | Cuántas |
|---|---|
| Tiene feed: Una dirección RSS/Atom/JSON que se lee entera | **12** |
| Hay que leer la página: No hay feed: se lee una página con la lista de notas | **6** |
| Ya llega por otra fuente: Sus novedades salen en el feed de otro (por ejemplo, el municipal) | **6** |
| Sólo redes o a mano: Sin sitio con novedades: sólo Facebook/Instagram/X, que no se pueden leer solos | **7** |
| No sirve: No existe, está muerta o no aporta nada de acá | **4** |

**Qué falta** (Claude sugiere sumar):
- **Radio Gabal · Cultura (feed que hoy no se lee)** (tiene feed): Sumar como un feed más de Radio Gabal, con sección fija Cultura y agenda.
- **Boletín Oficial Municipal (SIBOM) de Balcarce** (hay que leer la página): Leer /cities/10 cada vez que corre el robot (una sola página): si hay un boletín nuevo (/bulletins/<id>), entrar y listar sus ordenanzas. Ideal como "alerta de ordenanza nueva" para que una persona la mire; no como nota automática, porque el lenguaje jurídico se resume mal.
- **Cooperativa de Electricidad General Balcarce · cortes programados** (hay que leer la página): Raspar esa única página en cada vuelta y avisar sólo si el texto deja de ser "No hay Cortes Programados." (una comparación de texto, sin interpretar). El aviso lo mira una persona antes de salir. Los cortes sorpresivos los da sólo en Facebook/Instagram, que no se pueden leer.

**Qué conviene cambiar de lo que ya se lee:**
- **Infórmese Primero (FM 104.9)**: Cambiar la dirección del feed al de Blogger directo (100 notas, sin FeedBurner). Si se quiere menos ruido nacional, leer sólo las etiquetas La Ciudad, Zonales y Deportes; hoy lo nacional ya se descarta porque un medio de acá que copia lo de afuera no lo hace "de Balcarce".
- **Radio Gabal (FM 104.1)**: Seguir con los feeds por sección y SUMAR el de Cultura (hoy no se lee y tiene notas de Balcarce). Como cada feed trae sólo 3 notas, si una sección publica más de 3 entre dos lecturas se pierde alguna: para Comunidad convendría leer también la página de la sección (/index.php/comunidad). Agro puede quedar: es de Balcarce y cuesta nada.
- **Puntonueve (FM 100.9)**: Feed actual sigue sirviendo. Si se agrega un lector de la API de WordPress (no existe hoy en el motor) se tendría texto completo y foto sin entrar a cada nota. Con el feed solo, un corte de más de un día pierde notas.

**Qué sobra:** nada del registro de Balcarce. Minuto Balcarce (candidata) está muerta; **Ahora Balcarce** está dormida hace 12 días y repite al Municipio; el sitio de **Acción 5** tiene spam de apuestas en la portada (el feed está limpio).

**Dato para los dueños:** *Mar del Sud* **no es del partido de Balcarce**: es una localidad balnearia del partido de General Alvarado, a 17 km de Miramar (Wikipedia, 15/10). Las localidades del partido son Balcarce, San Agustín, Bosch, Napaleofú (compartida con Lobería), Los Pinos, Villa Laguna La Brava y Ramos Otero, más el paraje Juan Vincenty.

## Lo más importante que apareció

1. **El feed de la Municipalidad ya trae todas las áreas** (hospital, deportes, cultura, turismo, ARBAL, delegaciones…). En las últimas 100 notas: Deportes y Recreación 39, hospital 10, cultura 6, turismo 6. Pedir los feeds por área no sirve y satura el servidor del Municipio (4 de 18 dieron "508 Resource Limit Is Reached").
2. **SIBOM (boletín oficial municipal) sí se puede leer**: https://sibom.slyt.gba.gob.ar/cities/10 es HTML estable (lista de boletines con fecha y, adentro, las ordenanzas con su texto).
3. **La Cooperativa Eléctrica tiene una página de cortes programados** que se puede vigilar con una comparación de texto (hoy dice "No hay Cortes Programados.").
4. **Infórmese Primero** conviene leerlo por el feed de Blogger directo (100 notas, sin FeedBurner). **Radio Gabal** tiene un sexto feed (Cultura) que hoy no se lee, y cada feed trae sólo 3 notas.
5. **El sitio de Acción 5 fue vulnerado** (spam de apuestas escondido en la portada): leer sólo el feed, que está limpio.
6. **Google Noticias** (búsqueda "Balcarce") sirve de detector: muestra qué medios hablan de Balcarce. Los de afuera que más la cubren son 0223, Diario La Capital de Mar del Plata (feed bloqueado por Cloudflare) y los de motor (Carburando, ACTC).
7. **Hospital, bomberos, policía, Liga Balcarceña, clubes, escuelas, Cámara de Comercio y Sociedad Rural no tienen sitio con novedades** que se haya encontrado: sólo Facebook/Instagram, que no se pueden leer sin cuenta. El hospital sí sale por el feed municipal.

## La tabla

| # | Fuente | Qué es | Cómo se lee | Dirección | Cada cuánto publica | Sugerencia |
|---|---|---|---|---|---|---|
| 1 | Diario La Vanguardia (con Radio Líder y Multimedios Balcarce) | Medio local | se lee hoy · Hay que leer la página | `https://www.diariolavanguardia.com/` | Muy alta: el número de nota subió de 45000 a 45095 entre el 11 y el 15/10, unas 20 a 25 por día (incluye depor | Mantener |
| 2 | Infórmese Primero (FM 104.9) | Medio local | se lee hoy · Tiene feed | `http://feeds.feedburner.com/informeseprimero` | Unas 12 por día, de las cuales unas 5 son de la etiqueta "La Ciudad"; el resto es nacional y provincial copiad | Cambiar algo |
| 3 | Radio Gabal (FM 104.1) | Medio local | se lee hoy · Tiene feed | `https://www.radiogabal.com.ar/index.php/comunidad?format=feed&type=rss` | Comunidad: varias por día (tres el 15/10). Política y deportes: una o dos por día. Policiales: unas pocas por  | Cambiar algo |
| 4 | El Diario Balcarce | Medio local | se lee hoy · Hay que leer la página | `https://eldiariobalcarce.com.ar/` | Entre 1 y 2 por día como mínimo: se pudieron fechar 19 notas entre el 1 y el 13/10 (la muestra es parcial: fal | Mantener |
| 5 | Puntonueve (FM 100.9) | Medio local | se lee hoy · Tiene feed | `https://puntonueve.com.ar/feed/` | Alta: 57 notas en 7 días (unas 8 por día). | Cambiar algo |
| 6 | News Balcarce (FM 91.7) | Medio local | se lee hoy · Tiene feed | `https://newsbalcarce.com.ar/?feed=rss2` | Entre 1 y 2 por día (10 notas cada 6 a 8 días). | Mantener |
| 7 | Acción 5 (Balcarce) | Medio local (deportes) | se lee hoy · Tiene feed | `https://accion5.com/feed/` | Unas 2 por día (51 notas en 30 días; 100 entre el 17/08 y el 14/10). | Mantener |
| 8 | Ahora Balcarce | Medio local | se lee hoy · Tiene feed | `http://ahorabalcarce.com.ar/feed/` | Casi nula: 20 notas en 30 días, en tandas; ninguna desde el 03/10. | Mantener |
| 9 | Municipalidad de Balcarce (prensa y todas sus áreas) | Municipalidad y áreas | se lee hoy · Tiene feed | `https://balcarce.gob.ar/feed/` | Alta: 100 notas en 29 días (unas 3 a 4 por día). Por área (últimas 100): Deportes y Recreación 39, Municipalid | Mantener |
| 10 | Concejo Deliberante de Balcarce | Concejo Deliberante | se lee hoy · Tiene feed | `https://concejodeliberantebalcarce.gob.ar/feed/` | Baja: 2 notas en 30 días. | Mantener |
| 11 | Facultad de Ciencias Agrarias (UNMdP) | Universidad / ciencia | se lee hoy · Tiene feed | `https://fca.mdp.edu.ar/feed/` | Baja: unas 6 por mes. | Mantener |
| 12 | Radio Gabal · Cultura (feed que hoy no se lee) | Medio local | nueva · Tiene feed | `https://www.radiogabal.com.ar/index.php/cultura?format=feed&type=rss` | 3 notas en 6 días. | Sumar |
| 13 | Boletín Oficial Municipal (SIBOM) de Balcarce | Organismo | nueva · Hay que leer la página | `https://sibom.slyt.gba.gob.ar/cities/10` | Baja: un boletín cada una a dos semanas (hubo uno el 21/09 y desde entonces no hay otro en la lista). | Sumar |
| 14 | Cooperativa de Electricidad General Balcarce · cortes programados | Servicio público | nueva · Hay que leer la página | `https://www.coopbalcarce.com.ar/CortesProgramados` | Sólo cuando hay cortes programados (hoy ninguno). | Sumar |
| 15 | Museo Juan Manuel Fangio (y Fundación Fangio) | Institución | nueva · Hay que leer la página | `https://www.museofangio.com/` | Muy baja: unas pocas por año. | No sumar |
| 16 | Google Noticias · búsqueda "Balcarce" (detector, no fuente) | Herramienta | nueva · Tiene feed | `https://news.google.com/rss/search?q=Balcarce&hl=es-419&gl=AR&ceid=AR:es-419` | Continua: refleja todo lo que sale con la palabra Balcarce en el país (incluye Balcarce de otras provincias y  | Cambiar algo |
| 17 | Diario La Capital de Mar del Plata (cobertura de Balcarce) | Medio de afuera | nueva · Hay que leer la página | `https://www.lacapitalmdp.com/feed/` | Sobre Balcarce, varias por semana. | Cambiar algo |
| 18 | ACTC y medios de motor que cubren el autódromo (Carburando, Última Vuelta, Solo Motores) | Medio de afuera | nueva · No sirve | `https://actc.org.ar/feed/` | Sólo en fechas de carrera en Balcarce. | No sumar |
| 19 | Canal de YouTube del Municipio ("San José Balcarce") | Municipalidad y áreas | nueva · Tiene feed | `https://www.youtube.com/feeds/videos.xml?channel_id=UCRfm53jb4WYMyhdWoHUYK8A` | Casi nula: un video en lo que va del año. | No sumar |
| 20 | Hospital Subzonal Dr. Felipe A. Fossati | Hospital | Ya llega por otra fuente | `https://hospitalfossati.com.ar/` | Unas 10 notas por mes, dentro del feed municipal. | Mantener |
| 21 | Delegaciones de Los Pinos, San Agustín y Napaleofú (y las demás localidades del partido) | Municipalidad y áreas | Ya llega por otra fuente | `https://balcarce.gob.ar/feed/` | Menos de una por mes. | Mantener |
| 22 | ARBAL · Agencia de Recaudación Balcarce | Municipalidad y áreas | Ya llega por otra fuente | `https://www.arbal.gob.ar/` | Unas 2 por mes. | Mantener |
| 23 | Turismo, Cultura, Teatro Municipal, Museo Histórico (MUHBA), Casa de la Cultura | Municipalidad y áreas | Ya llega por otra fuente | `https://balcarce.tur.ar/feed/` | Cultura y Turismo: unas 6 por mes cada una; Teatro: 3. | Mantener |
| 24 | OSEBAL SAPEM (empresa municipal de servicios) | Servicio público | Sólo redes o a mano | `https://www.osebal.com/` | Sin novedades en el sitio: sólo datos fijos. | No sumar |
| 25 | INTA Balcarce (Estación Experimental) y Unidad Integrada con la Facultad | Universidad / ciencia | Ya llega por otra fuente | `https://www.argentina.gob.ar/inta/noticias/rss` | Unas 2 notas por mes que nombran a Balcarce, entre 1 por día del INTA entero. | Mantener |
| 26 | Bomberos Voluntarios de Balcarce (y cuartel de San Agustín) | Institución | Sólo redes o a mano | `https://www.facebook.com/bomberosvoluntariosdebalcarce` | Cuando hay un hecho. | No sumar |
| 27 | Policía, comisarías, Policía Comunal, Juzgado de Faltas y Justicia en Balcarce | Institución | Sólo redes o a mano | `https://www.mpba.gov.ar/rss` | Sin fuente propia: los hechos policiales los publican los medios. | No sumar |
| 28 | Liga Balcarceña de Fútbol, clubes y asociaciones deportivas (fútbol, básquet, rugby, tenis, atletismo) | Deportes | Sólo redes o a mano | — | Semanal (fines de semana). | No sumar |
| 29 | Autódromo Juan Manuel Fangio | Deportes | Sólo redes o a mano | — | En fechas de carrera. | No sumar |
| 30 | Escuelas, ISFDyT N° 32, Consejo Escolar y Concejo Deliberativo Estudiantil | Institución | Ya llega por otra fuente | `https://balcarce.gob.ar/feed/` | Casi nada propio: 8 notas en total en el feed municipal. | Mantener |
| 31 | Cámara de Comercio e Industria, Sociedad Rural / Expo Balcarce, Rotary, Club de Leones, sociedades de fomento y colectividades | Institución | Sólo redes o a mano | — | Sin fuente propia: aparecen cuando las cuenta algún medio. | No sumar |
| 32 | Redes oficiales: Municipio, Intendente Esteban Reino, Hospital, Cooperativa, Bomberos | Redes | Sólo redes o a mano | `https://www.facebook.com/municipiodebalcarce` | Diaria en las redes, pero no se puede leer. | No sumar |
| 33 | Otras FM: Fantástica 106.1, Pop 99.1, Ebeneser 105.1, Zeta 97.3, FM Balcarce 88.1, Sube 101.5 y repetidoras (CNN 95.3, Radio 10 101.7) | Medio local | No sirve | — | Sin sitio de noticias. | No sumar |
| 34 | Televisión local (Somos Balcarce / canal de cable) | Medio local | No sirve | — | Sin canal local activo. | No sumar |
| 35 | Minuto Balcarce (minutobalcarce.com.ar) | Medio local | nueva · No sirve | `https://www.minutobalcarce.com.ar/feed/` | Ninguna desde el 02/07. | No sirve |

## Las fichas, una por fuente

Cada ficha dice: qué se probó (HTTP, cantidad de notas, fecha de la última, si trae texto completo o sólo resumen, si trae foto), cada cuánto publica, qué contenido aporta, cómo conviene leerla (feed, página o a mano) y qué peso darle. El **peso** es el número de `ingesta/fuentes.mjs`: hoy los medios de acá van entre 24 y 30 y los de afuera 8; "una fuente local oficial vale más que tres de afuera" se cumple con cualquier valor de 24 para arriba. Una fuente `oficial: true` sale con verde en el semáforo, la verificación es ALTA y alcanza sola.

### 1. Diario La Vanguardia (con Radio Líder y Multimedios Balcarce)

- **Es:** Medio local · **se lee hoy**.
- **Cómo se lee:** Hay que leer la página (No hay feed: se lee una página con la lista de notas). **Sugerencia: Mantener.**
- **Direcciones probadas:**
  - `https://www.diariolavanguardia.com/` (portada (lista de notas)): HTTP 200, 57 KB; unos 28 enlaces a /noticias/<id>-<título>/ y /deportes/<id>-<título>/.
  - `https://www.diariolavanguardia.com/feed` (feed (no existe)): devuelve la portada en HTML; tampoco hay /rss, /rss.xml ni sitemap.xml (404).
- **Qué se probó:** Sin feed. La portada trae título y enlace de cada nota, sin hora y sin fecha. Entrando a la nota: texto completo (234 y 349 palabras en las dos que se probaron), foto en og:image, pero sin og:description ni article:published_time. La página de cada nota no dice su propia fecha: sólo muestra una lista lateral con las 10 últimas y su fecha (dd-mm-aaaa).
- **Texto / foto:** completo (entrando a la nota) / sí (og:image).
- **Cada cuánto publica:** Muy alta: el número de nota subió de 45000 a 45095 entre el 11 y el 15/10, unas 20 a 25 por día (incluye deportes). Es el que más publica en Balcarce.
- **Qué aporta:** Política y gestión local, policiales, Concejo, salud, deportes, campo, zonales, entrevistas. También trae notas nacionales y de espectáculos, y avisos pagos (edictos, necrológicas, inmobiliarias).
- **Recomendación de lectura:** Seguir raspando la portada con el patrón que ya está (noticias y deportes). Mejora posible: como cada nota lleva un número correlativo (45095 es del 15/10), se puede estimar la fecha por el número y así la nota deja de salir "de hoy" sin serlo. No raspar edictos/, necrologicas/ ni farmacias/ (las listas de sepelios no se publican nunca).
- **Estructura de la página:** a[href*="/noticias/<id>-"] y a[href*="/deportes/<id>-"]; el título está en <h2> dentro de la tarjeta (el <h3> es la bajada). Estable desde el 30/09.
- **Peso:** hoy 28; sugerido 28. Local de mayor volumen. Sin cambio.
- **Redes (no se pueden leer):** Facebook Multimedios Balcarce, Instagram @radioliderbalcarce y @miradordelasierra (no se pueden leer).
- **Ojo:** Pide suscripción ($ 25.500) pero el texto de las notas se lee sin cuenta.
- **Ojo:** Su robots.txt es el texto estándar de Cloudflare ("content signals") sin ninguna prohibición escrita.

### 2. Infórmese Primero (FM 104.9)

- **Es:** Medio local · **se lee hoy**.
- **Cómo se lee:** Tiene feed (Una dirección RSS/Atom/JSON que se lee entera). **Sugerencia: Cambiar algo.**
- **Direcciones probadas:**
  - `http://feeds.feedburner.com/informeseprimero` (feed actual (FeedBurner)): HTTP 200, 25 notas, la última del 15/10; texto completo (unas 300 palabras) y foto en las 25.
  - `https://www.informeseprimero.com.ar/feeds/posts/default?redirect=false&max-results=100` (feed directo de Blogger (propuesto)): HTTP 200, 100 notas (del 7 al 15/10), la última del 15/10; texto completo y foto en las 100.
  - `https://www.informeseprimero.com.ar/feeds/posts/default/-/La%20Ciudad?redirect=false&max-results=50` (sólo la etiqueta "La Ciudad" (opcional)): HTTP 200, 50 notas en 10 días, unas 5 por día.
- **Qué se probó:** Anda. Es un Blogger: el feed que se usa pasa por FeedBurner (un servicio de Google casi abandonado) y trae 25 notas. El de Blogger directo trae 100 y no depende de FeedBurner.
- **Texto / foto:** completo / sí.
- **Cada cuánto publica:** Unas 12 por día, de las cuales unas 5 son de la etiqueta "La Ciudad"; el resto es nacional y provincial copiado de agencias.
- **Qué aporta:** Ciudad, policiales, tránsito, deportes, opinión, y mucho nacional (Milei, VTV bonaerense…).
- **Recomendación de lectura:** Cambiar la dirección del feed al de Blogger directo (100 notas, sin FeedBurner). Si se quiere menos ruido nacional, leer sólo las etiquetas La Ciudad, Zonales y Deportes; hoy lo nacional ya se descarta porque un medio de acá que copia lo de afuera no lo hace "de Balcarce".
- **Estructura de la página:** No hace falta página: es Atom. Etiquetas disponibles: La Ciudad, Zonales, Politica, Policiales, Transito, Deportes, Historias de Vida, Nacionales, Provinciales.
- **Peso:** hoy 30; sugerido 30. Local de alto volumen. Sin cambio.
- **Redes (no se pueden leer):** Facebook/Instagram de la FM 104.9 (no se pueden leer).
- **Ojo:** Si FeedBurner se cae, el medio se queda ciego sin aviso.

### 3. Radio Gabal (FM 104.1)

- **Es:** Medio local · **se lee hoy**.
- **Cómo se lee:** Tiene feed (Una dirección RSS/Atom/JSON que se lee entera). **Sugerencia: Cambiar algo.**
- **Direcciones probadas:**
  - `https://www.radiogabal.com.ar/index.php/comunidad?format=feed&type=rss` (Comunidad): HTTP 200, sólo 3 notas, la última del 15/10.
  - `https://www.radiogabal.com.ar/index.php/policiales?format=feed&type=rss` (Policiales): HTTP 200, 3 notas, la última del 13/10.
  - `https://www.radiogabal.com.ar/index.php/politica?format=feed&type=rss` (Política): HTTP 200, 3 notas, la última del 14/10.
  - `https://www.radiogabal.com.ar/index.php/deportes?format=feed&type=rss` (Deportes): HTTP 200, 3 notas, la última del 15/10.
  - `https://www.radiogabal.com.ar/index.php/agro?format=feed&type=rss` (Agro): HTTP 200, 3 notas, la última del 10/09 (más de un mes).
  - `https://www.radiogabal.com.ar/index.php/cultura?format=feed&type=rss` (Cultura (hoy NO se lee)): HTTP 200, 3 notas, la última del 15/10.
- **Qué se probó:** Es Joomla. Cada feed por sección trae sólo 3 notas (el parámetro limit no cambia nada), con resumen de unas 38 palabras y foto. No hay feed general (404). Las secciones del sitio son comunidad, policiales, política, deportes, agro, cultura, el país y el mundo.
- **Texto / foto:** resumen (hay que entrar a la nota para el texto) / sí.
- **Cada cuánto publica:** Comunidad: varias por día (tres el 15/10). Política y deportes: una o dos por día. Policiales: unas pocas por semana. Agro: casi nada (una cada dos semanas).
- **Qué aporta:** Radio de referencia en Balcarce. Comunidad, entrevistas, Concejo, deportes, campo. También cuelga necrológicas (no se leen).
- **Recomendación de lectura:** Seguir con los feeds por sección y SUMAR el de Cultura (hoy no se lee y tiene notas de Balcarce). Como cada feed trae sólo 3 notas, si una sección publica más de 3 entre dos lecturas se pierde alguna: para Comunidad convendría leer también la página de la sección (/index.php/comunidad). Agro puede quedar: es de Balcarce y cuesta nada.
- **Estructura de la página:** Las páginas de sección son /index.php/<sección> (comunidad, cultura, deportes, policiales, politica, agro); cada nota es un enlace con título y bajada. No raspar el-pais ni el-mundo (nacional).
- **Peso:** hoy 28 (deportes y agro 26); sugerido 28. Local de primera línea. Cultura al mismo peso que Comunidad.
- **Redes (no se pueden leer):** Facebook /radiogabal, X @RadioGabal, YouTube con transmisión (no se pueden leer).
- **Ojo:** El feed de Agro quedó sin notas nuevas desde el 10/09.
- **Ojo:** Solo 3 notas por feed: una ráfaga de noticias se puede perder entre dos lecturas.

### 4. El Diario Balcarce

- **Es:** Medio local · **se lee hoy**.
- **Cómo se lee:** Hay que leer la página (No hay feed: se lee una página con la lista de notas). **Sugerencia: Mantener.**
- **Direcciones probadas:**
  - `https://eldiariobalcarce.com.ar/` (portada (lista de notas)): HTTP 200, 261 KB; 84 enlaces únicos del tipo /<título>-<número>.
  - `https://eldiariobalcarce.com.ar/sitemap.xml` (índice (no sirve)): HTTP 200 pero congelado: 4.555 direcciones y todas con fecha de 2021.
  - `https://eldiariobalcarce.com.ar/feed` (feed (no existe)): 404; tampoco /rss, /rss.xml ni /feed.xml.
- **Qué se probó:** Sin feed. Cada nota trae meta de Open Graph completo: og:title, og:description, article:published_time (ej. 2026-10-15 09:01:28), og:image. El texto se lee, pero el extractor de la nota arrastra el menú ("Inicio; Tendencia; Int. General…") al principio.
- **Texto / foto:** completo (con el menú pegado al principio) / sí (og:image).
- **Cada cuánto publica:** Entre 1 y 2 por día como mínimo: se pudieron fechar 19 notas entre el 1 y el 13/10 (la muestra es parcial: faltan las más nuevas).
- **Qué aporta:** Único diario de Balcarce en papel y digital. Política, rural (Angus, papa, campo), deportes locales, policiales, entrevistas, fúnebres (no se leen).
- **Recomendación de lectura:** Seguir raspando la portada: funciona y las fechas salen bien de article:published_time. Mejora: limpiar el menú que se pega al principio del texto. Para más profundidad se pueden leer también /actualidad, /deportes y /rural (misma estructura).
- **Estructura de la página:** a[href^="/<título>-<número 1 a 3 cifras>"]; las tarjetas son .post-block-style con .post-title. Evitar /funebres.
- **Peso:** hoy 28; sugerido 28. Local. Sin cambio.
- **Redes (no se pueden leer):** Facebook "El Diario | Balcarce" (no se puede leer).
- **Ojo:** El número del final del enlace son 1 a 3 cifras: no es un contador, no sirve para ordenar por fecha.

### 5. Puntonueve (FM 100.9)

- **Es:** Medio local · **se lee hoy**.
- **Cómo se lee:** Tiene feed (Una dirección RSS/Atom/JSON que se lee entera). **Sugerencia: Cambiar algo.**
- **Direcciones probadas:**
  - `https://puntonueve.com.ar/feed/` (feed actual): HTTP 200, 10 notas, la última del 15/10 a las 19:43; resumen de unas 83 palabras, sin foto en el feed.
  - `https://puntonueve.com.ar/wp-json/wp/v2/posts?per_page=30&_embed=wp:featuredmedia` (API de WordPress (opcional)): HTTP 200; cada nota trae el texto entero (205 a 405 palabras) y su foto destacada.
- **Qué se probó:** Anda. Es WordPress con 10.827 notas publicadas en total. El feed trae sólo las últimas 10, que a este ritmo cubren un día; la API de WordPress trae el texto completo y la foto.
- **Texto / foto:** resumen en el feed; completo por la API / no en el feed; sí por la API.
- **Cada cuánto publica:** Alta: 57 notas en 7 días (unas 8 por día).
- **Qué aporta:** Actualidad, policiales, deportes, política, necrológicas (no se leen), alertas. Es el más rápido en avisar.
- **Recomendación de lectura:** Feed actual sigue sirviendo. Si se agrega un lector de la API de WordPress (no existe hoy en el motor) se tendría texto completo y foto sin entrar a cada nota. Con el feed solo, un corte de más de un día pierde notas.
- **Estructura de la página:** No hace falta página.
- **Peso:** hoy 30; sugerido 30. Local y rápido. Sin cambio.
- **Redes (no se pueden leer):** Radio en vivo en el sitio; Facebook/Instagram (no se pueden leer).

### 6. News Balcarce (FM 91.7)

- **Es:** Medio local · **se lee hoy**.
- **Cómo se lee:** Tiene feed (Una dirección RSS/Atom/JSON que se lee entera). **Sugerencia: Mantener.**
- **Direcciones probadas:**
  - `https://newsbalcarce.com.ar/?feed=rss2` (feed (el /feed clásico da 404)): HTTP 200, 10 notas, la última del 15/10; texto completo (150 a 380 palabras); la foto va dentro del texto.
- **Qué se probó:** Anda. WordPress sin API pública (wp-json da 404). Se puede paginar con &paged=2, 3… hasta 8 páginas atrás.
- **Texto / foto:** completo / sí, dentro del texto de la nota.
- **Cada cuánto publica:** Entre 1 y 2 por día (10 notas cada 6 a 8 días).
- **Qué aporta:** Actualidad, política, institucional, cultura, deportes, automovilismo, "último momento".
- **Recomendación de lectura:** Sin cambios. Es un feed estable.
- **Estructura de la página:** No hace falta página.
- **Peso:** hoy 30; sugerido 28. Publica menos que los otros medios de acá; 28 como Gabal y La Vanguardia. Cambio mínimo, opcional.
- **Redes (no se pueden leer):** Radio News Balcarce 91.7 (stream) (no se puede leer).

### 7. Acción 5 (Balcarce)

- **Es:** Medio local (deportes) · **se lee hoy**.
- **Cómo se lee:** Tiene feed (Una dirección RSS/Atom/JSON que se lee entera). **Sugerencia: Mantener.**
- **Direcciones probadas:**
  - `https://accion5.com/feed/` (feed): HTTP 200, 10 notas, la última del 14/10; texto completo (325 palabras) y foto en las 10.
  - `https://accion5.com/` (portada (NO raspar)): HTTP 200, pero trae spam de apuestas ("Toto Togel…") escondido en el HTML.
- **Qué se probó:** El feed está limpio (0 menciones de spam) y sirve. La portada del sitio tiene texto de apuestas inyectado: el sitio fue vulnerado.
- **Texto / foto:** completo / sí.
- **Cada cuánto publica:** Unas 2 por día (51 notas en 30 días; 100 entre el 17/08 y el 14/10).
- **Qué aporta:** Deportes de Balcarce: fútbol y Liga Balcarceña, pádel, tenis, karate, atletismo, ajedrez, automovilismo. Es el que más escribe de la Liga.
- **Recomendación de lectura:** Seguir leyendo SOLO el feed. No raspar la portada. Conviene avisarle al medio del spam. Ojo al traer el texto entrando a cada nota: ahí también puede colarse texto de apuestas.
- **Estructura de la página:** No hace falta página.
- **Peso:** hoy 28; sugerido 28. Local de deportes. Sin cambio.
- **Redes (no se pueden leer):** Facebook (no se puede leer).
- **Ojo:** Sitio vulnerado: spam de apuestas en la portada. El feed está limpio hoy.

### 8. Ahora Balcarce

- **Es:** Medio local · **se lee hoy**.
- **Cómo se lee:** Tiene feed (Una dirección RSS/Atom/JSON que se lee entera). **Sugerencia: Mantener.**
- **Direcciones probadas:**
  - `http://ahorabalcarce.com.ar/feed/` (feed (sólo con http)): HTTP 200, 10 notas; las 10 son del 03/10 (hace 12 días).
  - `https://ahorabalcarce.com.ar/feed/` (feed con https): falla: el certificado no corresponde al dominio (ERR_TLS_CERT_ALTNAME_INVALID).
- **Qué se probó:** Anda con http y está dormido: 20 notas en 30 días, publicadas por tandas (las 10 últimas, el mismo día). Pertenece a la red "Ahora" (Ahora Buenos Aires, Ahora Marchiquita, Ahora Dolores…) y repite sobre todo comunicados municipales.
- **Texto / foto:** completo (170 palabras) / sí.
- **Cada cuánto publica:** Casi nula: 20 notas en 30 días, en tandas; ninguna desde el 03/10.
- **Qué aporta:** Gacetillas del Municipio y notas de la ciudad.
- **Recomendación de lectura:** Dejarlo como está (feed por http) y mirar en dos semanas si volvió a publicar. Lo que cuenta casi siempre sale antes en el feed municipal.
- **Estructura de la página:** No hace falta página.
- **Peso:** hoy 28; sugerido 20. Repite lo del Municipio y publica por tandas: no merece el peso de los medios que escriben cada día.
- **Ojo:** Sólo anda con http. Sin notas hace 12 días.
- **Ojo:** Repite comunicados del Municipio: no suma voces distintas.

### 9. Municipalidad de Balcarce (prensa y todas sus áreas)

- **Es:** Municipalidad y áreas · **se lee hoy**.
- **Cómo se lee:** Tiene feed (Una dirección RSS/Atom/JSON que se lee entera). **Sugerencia: Mantener.**
- **Direcciones probadas:**
  - `https://balcarce.gob.ar/feed/` (feed único de todas las áreas): HTTP 200, 10 notas, la última del 15/10 a las 15:23; texto completo (165 palabras) y foto en 9 de 10.
  - `https://balcarce.gob.ar/wp-json/wp/v2/posts?per_page=30` (API de WordPress (opcional)): HTTP 200; 2.630 notas en total, 100 en los últimos 29 días.
  - `https://balcarce.gob.ar/category/<área>/feed/` (feeds por área (NO usar)): Varios responden, pero 4 de 18 dieron "508 Resource Limit Is Reached": el servidor del Municipio se satura con pedidos seguidos.
- **Qué se probó:** Anda. Es WordPress; el feed único lleva todas las áreas (cada nota trae sus categorías) y la firma es "Prensa Municipal". Los títulos vienen en MAYÚSCULAS. Los pedidos en ráfaga a otras direcciones del sitio dieron error 508 (hosting compartido).
- **Texto / foto:** completo / sí (9 de 10).
- **Cada cuánto publica:** Alta: 100 notas en 29 días (unas 3 a 4 por día). Por área (últimas 100): Deportes y Recreación 39, Municipalidad 16, Hospital Fossati 10, Cultura 6, Turismo 6, Obras 3, Teatro Municipal 3, Políticas de Inclusión 3; Museo Histórico, ARBal, Juventud, Regularización Dominial, Delegación Napaleofú y otras, 1 o 2.
- **Qué aporta:** Comunicados oficiales: deportes y Juegos Bonaerenses (casi 4 de cada 10), obras, hospital, cultura, turismo, tránsito, cementerio, zoonosis, delegaciones. Es la fuente primaria de todo lo que hace el Municipio.
- **Recomendación de lectura:** Seguir con el feed único (un solo pedido por vuelta). No sumar feeds por área: todo ya está ahí y el servidor se queja. Si algún día se quiere por área, filtrar por la categoría de cada nota en vez de pedir más direcciones.
- **Estructura de la página:** No hace falta página.
- **Peso:** hoy 24; sugerido 30. Fuente primaria oficial y la de más volumen de los organismos. Una fuente local oficial tiene que valer más que tres de afuera (peso 8): 24 ya cumple; 30 la iguala con los medios de acá. Opcional.
- **Redes (no se pueden leer):** Facebook /municipiodebalcarce, Instagram @balcarcemunicipio, X @balcarcemuni, YouTube (no se pueden leer).
- **Ojo:** Servidor frágil (508 con pedidos seguidos): no pedir más de una vez por vuelta.

### 10. Concejo Deliberante de Balcarce

- **Es:** Concejo Deliberante · **se lee hoy**.
- **Cómo se lee:** Tiene feed (Una dirección RSS/Atom/JSON que se lee entera). **Sugerencia: Mantener.**
- **Direcciones probadas:**
  - `https://concejodeliberantebalcarce.gob.ar/feed/` (feed): HTTP 200, 10 notas, la última del 14/10; texto completo (365 palabras), foto en 6 de 10.
- **Qué se probó:** Anda, pero publica poco: 115 notas desde 2022, unas 12 en lo que va de 2026 y 2 en los últimos 30 días. Las sesiones, ordenanzas y proyectos NO se publican como notas (sólo charlas, reconocimientos y el Concejo Estudiantil). Sus categorías de WordPress tienen restos de spam (vacíos); las notas están limpias.
- **Texto / foto:** completo / sí (6 de 10).
- **Cada cuánto publica:** Baja: 2 notas en 30 días.
- **Qué aporta:** Actos del HCD: apertura de sesiones, reconocimientos, charlas, Concejo Deliberativo Estudiantil.
- **Recomendación de lectura:** Dejar el feed: no cuesta nada. Para lo que decide el Concejo (ordenanzas) la fuente real es el boletín SIBOM (ver más abajo). Las sesiones las cuentan los medios locales.
- **Estructura de la página:** No hace falta página.
- **Peso:** hoy 24; sugerido 26. Oficial. Por lo poco que publica, no importa el peso.
- **Ojo:** El WordPress del Concejo tuvo spam (categorías de citas y apuestas, vacías): vigilar que no aparezcan notas falsas.

### 11. Facultad de Ciencias Agrarias (UNMdP)

- **Es:** Universidad / ciencia · **se lee hoy**.
- **Cómo se lee:** Tiene feed (Una dirección RSS/Atom/JSON que se lee entera). **Sugerencia: Mantener.**
- **Direcciones probadas:**
  - `https://fca.mdp.edu.ar/feed/` (feed): HTTP 200, 10 notas, la última del 30/09; resumen de unas 60 palabras, foto en 2 de 10.
- **Qué se probó:** Anda pero publica poco: 93 notas desde 2023, 6 en los últimos 30 días, ninguna desde el 30/09. Casi todo son cursos de posgrado e informes de ensayos de rendimiento (maíz).
- **Texto / foto:** resumen/medio (unas 90 palabras) / poca.
- **Cada cuánto publica:** Baja: unas 6 por mes.
- **Qué aporta:** Cursos de posgrado, Semana del Estudiante, informes de ensayos comparativos (maíz, soja, trigo). Sirve para agro y educación.
- **Recomendación de lectura:** Sin cambios.
- **Estructura de la página:** No hace falta página.
- **Peso:** hoy 24; sugerido 24. Oficial. Sin cambio.

### 12. Radio Gabal · Cultura (feed que hoy no se lee)

- **Es:** Medio local · **candidata nueva**.
- **Cómo se lee:** Tiene feed (Una dirección RSS/Atom/JSON que se lee entera). **Sugerencia: Sumar.**
- **Direcciones probadas:**
  - `https://www.radiogabal.com.ar/index.php/cultura?format=feed&type=rss` (feed): HTTP 200, 3 notas, fechas 15/10, 13/10 y 10/10; resumen y foto.
- **Qué se probó:** Anda. Es la sexta sección del mismo Joomla de Radio Gabal; las otras cinco ya se leen.
- **Texto / foto:** resumen / sí.
- **Cada cuánto publica:** 3 notas en 6 días.
- **Qué aporta:** Cultura y agenda de Balcarce (muestras, teatro, música, fiestas).
- **Recomendación de lectura:** Sumar como un feed más de Radio Gabal, con sección fija Cultura y agenda.
- **Estructura de la página:** No hace falta página.
- **Peso:** hoy —; sugerido 28. Igual que el resto de Gabal.

### 13. Boletín Oficial Municipal (SIBOM) de Balcarce

- **Es:** Organismo · **candidata nueva**.
- **Cómo se lee:** Hay que leer la página (No hay feed: se lee una página con la lista de notas). **Sugerencia: Sumar.**
- **Direcciones probadas:**
  - `https://sibom.slyt.gba.gob.ar/cities/10` (lista de boletines de Balcarce): HTTP 200, 13 KB; 8 boletines listados (del 121º del 03/08 al 128º del 21/09/2026), cada uno con fecha de publicación.
  - `https://sibom.slyt.gba.gob.ar/bulletins/15824` (un boletín (128º)): HTTP 200, 26 KB; lista 13 ordenanzas, cada una con número, fecha, "VISTO…" y enlace a su texto completo.
- **Qué se probó:** Sin feed (pedir .rss o .json da 406). La página es HTML estable y se lee bien. Es el sistema de la Provincia donde el Municipio publica ordenanzas, decretos y resoluciones. En el pedido pendiente de FUENTES se lo dio por "sin feed": se puede leer como página.
- **Texto / foto:** completo (cada ordenanza tiene su página) / no.
- **Cada cuánto publica:** Baja: un boletín cada una a dos semanas (hubo uno el 21/09 y desde entonces no hay otro en la lista).
- **Qué aporta:** Ordenanzas (en el 128º: 13), decretos y resoluciones: lotes, adicionales del hospital, monumentos, convenios. Es la fuente primaria de lo que aprueba el Concejo.
- **Recomendación de lectura:** Leer /cities/10 cada vez que corre el robot (una sola página): si hay un boletín nuevo (/bulletins/<id>), entrar y listar sus ordenanzas. Ideal como "alerta de ordenanza nueva" para que una persona la mire; no como nota automática, porque el lenguaje jurídico se resume mal.
- **Estructura de la página:** Lista: .bulletin con .bulletin-title ("128º de Balcarce"), .bulletin-date ("Publicado el 21/09/2026") y el enlace /bulletins/<id>. Contenido: enlaces /bulletins/<id>/contents/<n>.
- **Peso:** hoy —; sugerido 24. Oficial, con la misma jerarquía que el Municipio. Que quede para revisión de una persona.
- **Ojo:** El Municipio enlaza la dirección con .gba.gov.ar y la que se probó es .gba.gob.ar (las dos contestan): guardar la ruta /cities/10.

### 14. Cooperativa de Electricidad General Balcarce · cortes programados

- **Es:** Servicio público · **candidata nueva**.
- **Cómo se lee:** Hay que leer la página (No hay feed: se lee una página con la lista de notas). **Sugerencia: Sumar.**
- **Direcciones probadas:**
  - `https://www.coopbalcarce.com.ar/CortesProgramados` (página de cortes programados): HTTP 200, 5,7 KB; hoy dice "No hay Cortes Programados.".
  - `https://www.coopbalcarce.com.ar/` (portada): HTTP 200, 32 KB; trámites, cobros, bajas de factura, seguridad; sin sección de noticias.
- **Qué se probó:** Es un sitio chico en ASP.NET. No tiene noticias ni feed (404 en /Noticias y /feed). La página de cortes es una sola frase hoy; cuando haya un corte programado debería listarlo (no se pudo ver un caso con datos).
- **Texto / foto:** una frase o una lista corta / no.
- **Cada cuánto publica:** Sólo cuando hay cortes programados (hoy ninguno).
- **Qué aporta:** Avisos de cortes de luz programados. Es servicio al vecino: la gente lo busca.
- **Recomendación de lectura:** Raspar esa única página en cada vuelta y avisar sólo si el texto deja de ser "No hay Cortes Programados." (una comparación de texto, sin interpretar). El aviso lo mira una persona antes de salir. Los cortes sorpresivos los da sólo en Facebook/Instagram, que no se pueden leer.
- **Estructura de la página:** Texto del cuerpo de la página /CortesProgramados (el ".aspx" es opcional). No hay estructura de lista conocida todavía: hay que ver una página con cortes reales.
- **Peso:** hoy —; sugerido 24. Es una cooperativa (no un organismo público): no marcar como oficial; escribir "según informó la Cooperativa". Peso 24.
- **Redes (no se pueden leer):** Facebook "Cooperativa de Electricidad Gral. Balcarce Ltda." e Instagram @cooperativabalcarce (no se pueden leer).
- **Ojo:** No se vio nunca la página con un corte: la estructura es una suposición.

### 15. Museo Juan Manuel Fangio (y Fundación Fangio)

- **Es:** Institución · **candidata nueva**.
- **Cómo se lee:** Hay que leer la página (No hay feed: se lee una página con la lista de notas). **Sugerencia: No sumar.**
- **Direcciones probadas:**
  - `https://www.museofangio.com/` (portada con bloque "Novedades"): HTTP 200, 58 KB; /feed/ devuelve HTML (no hay feed); 3 novedades numeradas (60 a 62) en inglés y castellano.
  - `https://www.fundacionfangio.com/` (Fundación): HTTP 200, 5 KB; página institucional, sin novedades.
- **Qué se probó:** Sin feed. Las novedades son pocas y se renuevan cada mucho (el premio de la FIA 2025, "Acelerando el Futuro" en Madrid…).
- **Texto / foto:** resumen / sí.
- **Cada cuánto publica:** Muy baja: unas pocas por año.
- **Qué aporta:** Premios, eventos, el legado de Fangio, el autódromo. Interesa a Balcarce y al automovilismo.
- **Recomendación de lectura:** No vale la pena un lector propio por una nota por mes: seguirlo a mano o por lo que cuentan los medios locales (El Diario y Gabal lo cubren).
- **Estructura de la página:** Bloque "Novedades" de la portada, enlaces /<idioma>/information/news/<número>-… (inestable).
- **Peso:** hoy —; sugerido 22. Si algún día se lee, al nivel de un organismo chico.
- **Redes (no se pueden leer):** X @MuseoFangio (no se puede leer).

### 16. Google Noticias · búsqueda "Balcarce" (detector, no fuente)

- **Es:** Herramienta · **candidata nueva**.
- **Cómo se lee:** Tiene feed (Una dirección RSS/Atom/JSON que se lee entera). **Sugerencia: Cambiar algo.**
- **Direcciones probadas:**
  - `https://news.google.com/rss/search?q=Balcarce&hl=es-419&gl=AR&ceid=AR:es-419` (feed de la búsqueda): HTTP 200, 100 notas de decenas de medios; con "when:2d" trae 74 de los últimos 2 días.
- **Qué se probó:** Anda y es muy rico, pero cada enlace es una redirección de Google (no la nota final) y trae sólo título y medio. Sirve para saber QUÉ medios hablan de Balcarce y qué nos perdemos.
- **Texto / foto:** solo título / no.
- **Cada cuánto publica:** Continua: refleja todo lo que sale con la palabra Balcarce en el país (incluye Balcarce de otras provincias y apellidos).
- **Qué aporta:** Medios de acá, de la zona y del país. Los que más hablan de Balcarce, en la muestra de 100: La Vanguardia, Radio Gabal, El Diario Balcarce, Puntonueve, Carburando, Campeones, Clarín, ACTC, 0223, La Capital de Mar del Plata.
- **Recomendación de lectura:** No como fuente para publicar. Sí como control semanal o diario: comparar sus títulos con lo que leímos y detectar medios de acá que no estamos leyendo o notas que se pierden. Si se usara en la ingesta, habría que resolver cada enlace de Google al medio real (un pedido más por nota).
- **Estructura de la página:** No hace falta página.
- **Peso:** hoy —; sugerido —. No debería publicar nada solo.
- **Ojo:** Mezcla otros "Balcarce" (apellido, Salta, Córdoba).

### 17. Diario La Capital de Mar del Plata (cobertura de Balcarce)

- **Es:** Medio de afuera · **candidata nueva**.
- **Cómo se lee:** Hay que leer la página (No hay feed: se lee una página con la lista de notas). **Sugerencia: Cambiar algo.**
- **Direcciones probadas:**
  - `https://www.lacapitalmdp.com/feed/` (feed): HTTP 403 (pantalla de verificación de Cloudflare), también /sitemap.xml y /news-sitemap.xml.
  - `https://www.lacapitalmdp.com/wp-json/wp/v2/posts?search=Balcarce&per_page=20` (API de WordPress (búsqueda)): HTTP 200 desde la PC: 20 notas, la más nueva del 13/10; la búsqueda es de texto y trae ruido.
- **Qué se probó:** El feed está bloqueado y por eso ya figura como "no se pudo sumar". La API de WordPress contesta desde la PC, pero no se sabe si contestaría desde GitHub Actions. Es de los medios de afuera que más cubren Balcarce: hospital, cooperativa eléctrica, autódromo, bomberos, Concejo.
- **Texto / foto:** completo por la API / sí por la API.
- **Cada cuánto publica:** Sobre Balcarce, varias por semana.
- **Qué aporta:** Cobertura de Balcarce desde Mar del Plata: política, hospital, cooperativa, deportes, autódromo.
- **Recomendación de lectura:** Probar la API desde Actions antes de decidir. Si contesta, leer sólo la búsqueda "Balcarce" con peso de zona (no de acá). Es un medio de afuera: cuenta para el cruce, no para salir solo.
- **Estructura de la página:** API de WordPress, sin página.
- **Peso:** hoy —; sugerido 8. De afuera (peso de afuera, 8). Sirve para sumar un medio al cruce de una nota de Balcarce.
- **Ojo:** Bloqueo de Cloudflare en el feed: puede bloquear también la API desde Actions.

### 18. ACTC y medios de motor que cubren el autódromo (Carburando, Última Vuelta, Solo Motores)

- **Es:** Medio de afuera · **candidata nueva**.
- **Cómo se lee:** No sirve (No existe, está muerta o no aporta nada de acá). **Sugerencia: No sumar.**
- **Direcciones probadas:**
  - `https://actc.org.ar/feed/` (ACTC): HTTP 404 (el sitio anda, pero no hay feed).
  - `https://www.carburando.com/feed` (Carburando): HTTP 404 (sin feed).
- **Qué se probó:** Hablan de Balcarce cuando corre el TC o el Zonal, pero no tienen feed. Lo importante del automovilismo ya llega por Campeones, Solotc, Motorsport y Córdoba Competición.
- **Texto / foto:** — / —.
- **Cada cuánto publica:** Sólo en fechas de carrera en Balcarce.
- **Qué aporta:** Automovilismo.
- **Recomendación de lectura:** No sumar. Si se quisiera, habría que raspar sus portadas; no vale el esfuerzo.
- **Peso:** hoy —; sugerido —. —

### 19. Canal de YouTube del Municipio ("San José Balcarce")

- **Es:** Municipalidad y áreas · **candidata nueva**.
- **Cómo se lee:** Tiene feed (Una dirección RSS/Atom/JSON que se lee entera). **Sugerencia: No sumar.**
- **Direcciones probadas:**
  - `https://www.youtube.com/feeds/videos.xml?channel_id=UCRfm53jb4WYMyhdWoHUYK8A` (feed de YouTube): HTTP 200, 15 videos; el último del 10/04/2026 (hace 6 meses).
- **Qué se probó:** Es el canal que enlaza el sitio del Municipio. Los videos son transmisiones en vivo y conferencias viejas (2018 a 2020).
- **Texto / foto:** solo título / miniatura.
- **Cada cuánto publica:** Casi nula: un video en lo que va del año.
- **Qué aporta:** Transmisiones en vivo.
- **Recomendación de lectura:** No sumar.
- **Peso:** hoy —; sugerido —. —

### 20. Hospital Subzonal Dr. Felipe A. Fossati

- **Es:** Hospital.
- **Cómo se lee:** Ya llega por otra fuente (Sus novedades salen en el feed de otro (por ejemplo, el municipal)). **Sugerencia: Mantener.**
- **Direcciones probadas:**
  - `https://hospitalfossati.com.ar/` (sitio del hospital): HTTP 200, 30 KB, estático; con www el certificado falla (ERR_TLS_CERT_ALTNAME_INVALID); sin noticias ni feed.
- **Qué se probó:** El sitio sólo tiene datos de contacto y accesos a turnos y estudios. Las novedades del hospital las publica el Municipio con la categoría "Hospital Dr. Felipe Antonio Fossati" (99 notas en total, 10 de las últimas 100).
- **Texto / foto:** — / —.
- **Cada cuánto publica:** Unas 10 notas por mes, dentro del feed municipal.
- **Qué aporta:** Campañas de salud, guardias, obras, donaciones.
- **Recomendación de lectura:** Nada que sumar: ya llega por el feed de la Municipalidad. El tema es importante: sería bueno darle la sección Balcarce o Salud siempre que la categoría sea Hospital.
- **Peso:** hoy 24; sugerido 24. El del feed municipal.

### 21. Delegaciones de Los Pinos, San Agustín y Napaleofú (y las demás localidades del partido)

- **Es:** Municipalidad y áreas.
- **Cómo se lee:** Ya llega por otra fuente (Sus novedades salen en el feed de otro (por ejemplo, el municipal)). **Sugerencia: Mantener.**
- **Direcciones probadas:**
  - `https://balcarce.gob.ar/feed/` (el feed municipal): Categorías propias: Delegación Los Pinos (6 notas en total), Delegación San Agustín (5), Delegación Napaleofú (5).
- **Qué se probó:** Cada delegación tiene una categoría en el sitio del Municipio, con muy pocas notas. Las localidades del partido son Balcarce, San Agustín, Bosch, Napaleofú (compartida con Lobería), Los Pinos, Villa Laguna La Brava y Ramos Otero, y el paraje Juan Vincenty (según Wikipedia). Ojo: Mar del Sud NO es del partido de Balcarce: es una localidad balnearia de General Alvarado, a 17 km de Miramar, así que no tiene delegación ni sitio de acá. Ramos Otero, Bosch y Laguna La Brava no tienen categoría propia. Las localidades salen en los medios de acá (Acción 5 es la que más cubre San Agustín y Los Pinos, por el fútbol).
- **Texto / foto:** — / —.
- **Cada cuánto publica:** Menos de una por mes.
- **Qué aporta:** Actos y obras de las localidades.
- **Recomendación de lectura:** Nada que sumar. Desde el 16/10 (regla 179) las siete localidades cuentan como de acá: Napaleofú, Ramos Otero y Laguna La Brava solas (PALABRAS_LOCALES); San Agustín, Los Pinos y Bosch, que también son otros lugares, con respaldo (PALABRAS_LOCALES_DEBILES): cuando las nombra un medio de Balcarce, o cuando un medio de afuera las pone en el título y además nombra a Balcarce o la zona, y nunca pegadas a otro lugar ("San Agustín, Córdoba", "Los Pinos de Mar del Plata", "Residencia Los Pinos"). Mar del Sud no (no es del partido).
- **Peso:** hoy 24; sugerido 24. El del feed municipal.
- **Redes (no se pueden leer):** Posibles páginas de Facebook de cada localidad (no se pueden leer).
- **Ojo:** Mar del Sud es de General Alvarado, no de Balcarce (Wikipedia, 15/10). No se encontraron sociedades de fomento con sitio propio.

### 22. ARBAL · Agencia de Recaudación Balcarce

- **Es:** Municipalidad y áreas.
- **Cómo se lee:** Ya llega por otra fuente (Sus novedades salen en el feed de otro (por ejemplo, el municipal)). **Sugerencia: Mantener.**
- **Direcciones probadas:**
  - `https://www.arbal.gob.ar/` (sitio): HTTP 200, 26 KB; información de tasas, planes de pago, calendario impositivo; sin sección de noticias ni feed.
- **Qué se probó:** Sus avisos (vencimientos, planes de pago) salen en el feed municipal con la categoría "ARBal" (108 notas en total, 2 de las últimas 100).
- **Texto / foto:** — / —.
- **Cada cuánto publica:** Unas 2 por mes.
- **Qué aporta:** Vencimientos de tasas, planes de pago, descuentos.
- **Recomendación de lectura:** Nada que sumar.
- **Peso:** hoy 24; sugerido 24. El del feed municipal.

### 23. Turismo, Cultura, Teatro Municipal, Museo Histórico (MUHBA), Casa de la Cultura

- **Es:** Municipalidad y áreas.
- **Cómo se lee:** Ya llega por otra fuente (Sus novedades salen en el feed de otro (por ejemplo, el municipal)). **Sugerencia: Mantener.**
- **Direcciones probadas:**
  - `https://balcarce.tur.ar/feed/` (sitio de Turismo (blog)): HTTP 200 pero sólo 2 entradas "Hello world!" (la última del 18/03/2026): es un sitio de guía turística, sin novedades.
  - `https://balcarce.gob.ar/feed/` (el feed municipal): Categorías: Subsecretaría de Cultura (175 en total), Teatro Municipal (35), Turismo (69), Museo Histórico (32), Casa de la Cultura (105).
- **Qué se probó:** Todas estas áreas publican en el feed municipal. El sitio de Turismo (balcarce.tur.ar) no tiene noticias; su agenda está en Instagram/Linktree.
- **Texto / foto:** — / —.
- **Cada cuánto publica:** Cultura y Turismo: unas 6 por mes cada una; Teatro: 3.
- **Qué aporta:** Agenda cultural, obras de teatro, muestras, fiestas (la Fiesta Nacional del Postre).
- **Recomendación de lectura:** Nada que sumar: el feed municipal ya los trae. La agenda ("Cultura y agenda") puede alimentarse con las notas de esas categorías.
- **Peso:** hoy 24; sugerido 24. El del feed municipal.
- **Redes (no se pueden leer):** Instagram y Linktree de Turismo (no se pueden leer).

### 24. OSEBAL SAPEM (empresa municipal de servicios)

- **Es:** Servicio público.
- **Cómo se lee:** Sólo redes o a mano (Sin sitio con novedades: sólo Facebook/Instagram/X, que no se pueden leer solos). **Sugerencia: No sumar.**
- **Direcciones probadas:**
  - `https://www.osebal.com/` (sitio): HTTP 200, 18 KB; tarifas, laboratorio, quiénes somos, factura online, estados contables; sin noticias ni feed.
- **Qué se probó:** Sitio institucional sin novedades. Sus notas aparecen cuando la cubren los medios (La Vanguardia, "Osebal bajo la lupa…").
- **Texto / foto:** sin notas / no.
- **Cada cuánto publica:** Sin novedades en el sitio: sólo datos fijos.
- **Qué aporta:** Tarifas y servicios. Los cortes y reclamos se avisan por redes.
- **Recomendación de lectura:** Seguirlo a mano o por los medios.
- **Peso:** hoy —; sugerido —. —
- **Redes (no se pueden leer):** WhatsApp +54 9 2266 540793 y teléfono de emergencias del sitio (no se leen solos).

### 25. INTA Balcarce (Estación Experimental) y Unidad Integrada con la Facultad

- **Es:** Universidad / ciencia.
- **Cómo se lee:** Ya llega por otra fuente (Sus novedades salen en el feed de otro (por ejemplo, el municipal)). **Sugerencia: Mantener.**
- **Direcciones probadas:**
  - `https://www.argentina.gob.ar/inta/noticias/rss` (feed nacional del INTA (ya activo)): HTTP 200, 15 notas, la última del 15/10; el resumen trae el texto entero (unas 750 palabras); 2 de las 15 nombran a Balcarce (01/10 y 05/10).
  - `https://www.argentina.gob.ar/inta/eea-balcarce` (página de la EEA (probada)): HTTP 403 / 404; no hay página propia con feed.
- **Qué se probó:** La Estación de Balcarce no tiene sitio ni feed propios: sus notas salen en el feed nacional del INTA, que ya se lee (como "INTA"). Se puede filtrar las que nombran Balcarce.
- **Texto / foto:** completo (en el feed nacional) / no en el feed.
- **Cada cuánto publica:** Unas 2 notas por mes que nombran a Balcarce, entre 1 por día del INTA entero.
- **Qué aporta:** Investigación y extensión: papa, pasturas, ganadería, ensayos.
- **Recomendación de lectura:** Dejar el feed nacional; para que una nota del INTA que nombre Balcarce se trate "de acá" alcanza con el título o el texto (ya lo hace esDeAca por el título). Con la crisis del INTA (recortes) hay notas políticas que salen en medios locales.
- **Peso:** hoy 8; sugerido 8. Cuando nombra a Balcarce lo decide esDeAca, no el peso.
- **Redes (no se pueden leer):** Facebook e Instagram del INTA Balcarce (no se pueden leer).
- **Ojo:** El INTA no es "oficial: true" a propósito (ver LISTA-ELEGIDA.md, riesgo 6).

### 26. Bomberos Voluntarios de Balcarce (y cuartel de San Agustín)

- **Es:** Institución.
- **Cómo se lee:** Sólo redes o a mano (Sin sitio con novedades: sólo Facebook/Instagram/X, que no se pueden leer solos). **Sugerencia: No sumar.**
- **Direcciones probadas:**
  - `https://www.facebook.com/bomberosvoluntariosdebalcarce` (Facebook (dato de una nota de La Capital de 2020, sin verificar)): No se puede leer sin cuenta.
- **Qué se probó:** No se encontró sitio web propio. Los incendios y operativos los cuentan los medios locales (Puntonueve, Gabal, La Vanguardia).
- **Texto / foto:** — / —.
- **Cada cuánto publica:** Cuando hay un hecho.
- **Qué aporta:** Incendios, rescates, homenajes.
- **Recomendación de lectura:** Seguir a mano en Facebook o pedirles que nos manden las novedades por WhatsApp.
- **Peso:** hoy —; sugerido —. —
- **Redes (no se pueden leer):** Facebook (no se puede leer).

### 27. Policía, comisarías, Policía Comunal, Juzgado de Faltas y Justicia en Balcarce

- **Es:** Institución.
- **Cómo se lee:** Sólo redes o a mano (Sin sitio con novedades: sólo Facebook/Instagram/X, que no se pueden leer solos). **Sugerencia: No sumar.**
- **Direcciones probadas:**
  - `https://www.mpba.gov.ar/rss` (Ministerio Público Fiscal (provincial)): HTTP 404; no hay feed.
  - `https://www.gba.gob.ar/comunicacion_publica/gacetillas` (gacetillas de la Provincia): HTTP 200, HTML; son notas de toda la Provincia, sin filtro por Balcarce.
- **Qué se probó:** No hay sitio ni feed de la Policía local ni de la Justicia de Balcarce. En el sitio del Municipio aparecen el Juzgado de Faltas (16 notas en total) y la Policía Comunal (1). Policiales sale por los medios locales (que es lo que ya se lee).
- **Texto / foto:** sin fuente propia / no.
- **Cada cuánto publica:** Sin fuente propia: los hechos policiales los publican los medios.
- **Qué aporta:** Policiales: es una sección de semáforo rojo, espera a una persona.
- **Recomendación de lectura:** Nada que sumar. Policiales ya llega por los medios; con los hechos graves la regla es esperar a una persona.
- **Peso:** hoy —; sugerido —. —
- **Ojo:** Nunca identificar a menores ni a víctimas: no cambia por la fuente.

### 28. Liga Balcarceña de Fútbol, clubes y asociaciones deportivas (fútbol, básquet, rugby, tenis, atletismo)

- **Es:** Deportes.
- **Cómo se lee:** Sólo redes o a mano (Sin sitio con novedades: sólo Facebook/Instagram/X, que no se pueden leer solos). **Sugerencia: No sumar.**
- **Direcciones probadas:**
  - — (sitio propio): No se encontró sitio de la Liga ni de clubes (búsquedas del 15/10).
- **Qué se probó:** Los resultados y las fechas de la Liga los cubren Acción 5 (el que más), Puntonueve, Gabal e Infórmese. El Municipio publica deportes locales (casi 4 de cada 10 de sus notas).
- **Texto / foto:** — / —.
- **Cada cuánto publica:** Semanal (fines de semana).
- **Qué aporta:** Resultados, tablas, torneos.
- **Recomendación de lectura:** Nada que sumar: los medios de acá ya lo cubren. Si la Liga o un club tiene sitio o grupo, pedirles el enlace a ellos.
- **Peso:** hoy —; sugerido —. —
- **Redes (no se pueden leer):** Facebook/Instagram de la Liga y de los clubes (no se pueden leer).

### 29. Autódromo Juan Manuel Fangio

- **Es:** Deportes.
- **Cómo se lee:** Sólo redes o a mano (Sin sitio con novedades: sólo Facebook/Instagram/X, que no se pueden leer solos). **Sugerencia: No sumar.**
- **Direcciones probadas:**
  - — (sitio propio): No se encontró sitio oficial del autódromo (búsquedas del 15/10).
- **Qué se probó:** Las novedades salen en el Municipio, en la ACTC, en Campeones/Solotc (ya leídos) y en los medios locales.
- **Texto / foto:** — / —.
- **Cada cuánto publica:** En fechas de carrera.
- **Qué aporta:** Automovilismo.
- **Recomendación de lectura:** Nada que sumar.
- **Peso:** hoy —; sugerido —. —

### 30. Escuelas, ISFDyT N° 32, Consejo Escolar y Concejo Deliberativo Estudiantil

- **Es:** Institución.
- **Cómo se lee:** Ya llega por otra fuente (Sus novedades salen en el feed de otro (por ejemplo, el municipal)). **Sugerencia: Mantener.**
- **Direcciones probadas:**
  - `https://balcarce.gob.ar/feed/` (el feed municipal): Categorías: Consejo Escolar Balcarce (4 notas en total), Jefatura Distrital (2), Educación (2).
- **Qué se probó:** No se encontró sitio del Instituto Superior de Formación Docente y Técnica N° 32 de Balcarce ni de escuelas. El Concejo Estudiantil sale en el feed del HCD. Muchas escuelas figuran en notas de los medios locales (SUTEBA, paros, actos).
- **Texto / foto:** sin fuente propia / no.
- **Cada cuánto publica:** Casi nada propio: 8 notas en total en el feed municipal.
- **Qué aporta:** Actos, paros, inscripciones, obras.
- **Recomendación de lectura:** Nada que sumar.
- **Peso:** hoy —; sugerido —. —

### 31. Cámara de Comercio e Industria, Sociedad Rural / Expo Balcarce, Rotary, Club de Leones, sociedades de fomento y colectividades

- **Es:** Institución.
- **Cómo se lee:** Sólo redes o a mano (Sin sitio con novedades: sólo Facebook/Instagram/X, que no se pueden leer solos). **Sugerencia: No sumar.**
- **Direcciones probadas:**
  - — (sitio propio): No se encontró sitio propio de ninguna (búsquedas del 15/10).
- **Qué se probó:** Aparecen en notas de los medios locales (por ejemplo, el Club de Leones y la donación al hospital, 03/10, y el Rotary con el periodismo). Ninguna tiene feed.
- **Texto / foto:** sin fuente propia / no.
- **Cada cuánto publica:** Sin fuente propia: aparecen cuando las cuenta algún medio.
- **Qué aporta:** Comercio, campo, solidaridad.
- **Recomendación de lectura:** Nada que sumar. Con Hernán y Andrés: ¿hay contactos para que manden comunicados por WhatsApp (ya existe ingesta/contactos-agenda.json)?
- **Peso:** hoy —; sugerido —. —

### 32. Redes oficiales: Municipio, Intendente Esteban Reino, Hospital, Cooperativa, Bomberos

- **Es:** Redes.
- **Cómo se lee:** Sólo redes o a mano (Sin sitio con novedades: sólo Facebook/Instagram/X, que no se pueden leer solos). **Sugerencia: No sumar.**
- **Direcciones probadas:**
  - `https://www.facebook.com/municipiodebalcarce` (Facebook del Municipio): HTTP 400 sin sesión: no se puede leer.
  - `https://twitter.com/balcarcemuni` (X del Municipio): No se puede leer sin cuenta.
- **Qué se probó:** Facebook, Instagram y X no ofrecen feed público sin iniciar sesión. Lo que el Municipio pone allí ya sale casi siempre en su sitio (el feed que se lee).
- **Texto / foto:** no se puede leer / no.
- **Cada cuánto publica:** Diaria en las redes, pero no se puede leer.
- **Qué aporta:** Avisos rápidos (cortes, operativos, alertas) que a veces no pasan al sitio.
- **Recomendación de lectura:** Seguir a mano las cuentas del Municipio, de la Cooperativa y de los Bomberos para los avisos urgentes. Las cuentas de la Municipalidad enlazan al sitio, que sí se lee.
- **Peso:** hoy —; sugerido —. —
- **Redes (no se pueden leer):** Facebook, Instagram y X (no se pueden leer).

### 33. Otras FM: Fantástica 106.1, Pop 99.1, Ebeneser 105.1, Zeta 97.3, FM Balcarce 88.1, Sube 101.5 y repetidoras (CNN 95.3, Radio 10 101.7)

- **Es:** Medio local.
- **Cómo se lee:** No sirve (No existe, está muerta o no aporta nada de acá). **Sugerencia: No sumar.**
- **Direcciones probadas:**
  - — (sitios de noticias): No se encontró ninguno: sólo aparecen en directorios de radio por internet.
- **Qué se probó:** Son emisoras musicales o repetidoras; las que tienen noticias (Gabal, Puntonueve, News Balcarce, Infórmese Primero, Líder) ya están. La Radio Líder 90.9 es del grupo de La Vanguardia.
- **Texto / foto:** sin sitio / no.
- **Cada cuánto publica:** Sin sitio de noticias.
- **Qué aporta:** Música, programas.
- **Recomendación de lectura:** No hay nada que leer.
- **Peso:** hoy —; sugerido —. —

### 34. Televisión local (Somos Balcarce / canal de cable)

- **Es:** Medio local.
- **Cómo se lee:** No sirve (No existe, está muerta o no aporta nada de acá). **Sugerencia: No sumar.**
- **Direcciones probadas:**
  - — (sitio): No se encontró canal local con sitio de noticias.
- **Qué se probó:** El noticiero local de Flow ("Somos Noticias") dejó de emitirse en Balcarce desde fines de 2023, según una nota de Infozona. No hay otro canal que haya aparecido en las búsquedas.
- **Texto / foto:** sin sitio / no.
- **Cada cuánto publica:** Sin canal local activo.
- **Qué aporta:** Ninguno: el noticiero local ya no se emite.
- **Recomendación de lectura:** No hay nada que leer.
- **Peso:** hoy —; sugerido —. —

### 35. Minuto Balcarce (minutobalcarce.com.ar)

- **Es:** Medio local · **candidata nueva**.
- **Cómo se lee:** No sirve (No existe, está muerta o no aporta nada de acá). **Sugerencia: No sirve.**
- **Direcciones probadas:**
  - `https://www.minutobalcarce.com.ar/feed/` (feed): HTTP 200 pero sólo 9 notas en total, la última del 02/07/2026 (hace más de tres meses).
- **Qué se probó:** Está muerto: 9 notas desde enero. Además son de Boca, Tesla e inteligencia artificial, no de Balcarce.
- **Texto / foto:** completo / no.
- **Cada cuánto publica:** Ninguna desde el 02/07.
- **Qué aporta:** Nada de acá.
- **Recomendación de lectura:** No sumar.
- **Peso:** hoy —; sugerido —. —

## ¿Son de la zona? (comprobado el 15 y 16/10)

| Fuente | ¿Es de la zona? | Redacción | Propuesta |
|---|---|---|---|
| Infórmese Primero (FM 104.9) | De Balcarce, con mucho de afuera | El pie dice "2007-2026, Balcarce" y los "hechos de nuestra ciudad"; no publica dirección. | Dejar. Si se quiere menos ruido, leer sólo las etiquetas La Ciudad, Zonales y Deportes (ver Balcarce a fondo). |
| Diario La Vanguardia | De Balcarce, con mucho de afuera | Calle 16 N° 662, 1° piso, Balcarce; tel. (02266) 42-4151 ("Multimedios Balcarce", con Radio Líder). | Dejar como de Balcarce. Lo nacional que copia ya no cuenta como de acá (historiaDeAca). |
| Radio Gabal (FM 104.1) | De Balcarce, con mucho de afuera | Calle 8 N° 546, Balcarce. | Dejar: ya se leen sólo sus secciones locales (Comunidad, Policiales, Política, Deportes, Agro), no El País ni El Mundo. |
| El Diario Balcarce | Sí, es de Balcarce | Calle 17 N° 792, Balcarce (Imagen Balcarce SRL). Se presenta como el único diario de Balcarce en papel y digital. | Dejar. |
| Municipalidad de Balcarce | Sí, es de Balcarce | Calle 16 N° 602, Balcarce; tel. (02266) 43-0240. Organismo oficial. | Dejar. |
| Puntonueve (FM 100.9) | Sí, es de Balcarce | Av. Adolfo Gonzales Chaves 486, 1° piso, Balcarce; tel. 02266-43-1625 (oficina y planta transmisora). | Dejar. |
| News Balcarce (FM 91.7) | Sí, es de Balcarce | No publica dirección ni teléfono; firma "Radio News", FM 91.7. | Dejar (de Balcarce por lo que publica; no hay dato formal). |
| Acción 5 (Balcarce) | Sí, es de Balcarce | No publica contacto; el sitio da el clima de Balcarce y cubre la Liga Balcarceña, Ferro, Atlético Unidos y el autódromo. | Dejar sólo el feed: el sitio está vulnerado (spam de apuestas en la portada y en la descripción para redes). |
| Ahora Balcarce | No es un medio de la zona | No se encontró redacción en Balcarce: no hay dirección, autor ni teléfono; el pie dice "© 2018". Es parte de la red "Ahora" (su sitio trae los feeds de Ahora Mar Chiquita, Ahora Buenos Aires, ahoranoticias.ar, Dolores y Mar del Plata). Las 10 notas del feed las subió el mismo usuario el 03/10 en hora y media; no publicó más. | Sacarla del bloque de Balcarce: no es un medio de la zona sino un portal de una red que copia al Municipio (que ya se lee). Opciones: apagarla, o pasarla a alcance "region" con peso 8 para que no cuente como medio de acá ni como un segundo medio en el cruce. |
| Concejo Deliberante de Balcarce | Sí, es de Balcarce | Calle 20 N° 569, Balcarce; tel. 02266 42-4089. Organismo oficial. | Dejar. |
| Facultad de Ciencias Agrarias (UNMdP) | No es un medio de la zona | Ruta 226 km 73,5, Balcarce (es de la Universidad Nacional de Mar del Plata). | Queda en Balcarce, pero no es un medio local: pasarla a alcance "region" (Agro), para que sus notas sean de acá sólo cuando nombren a Balcarce. Puede seguir como oficial. |
| Argenpapa | No es un medio de la zona | Calle 19 N° 859, Balcarce; tel. (02266) 42-0703. | La redacción es de acá pero el contenido no: tratarla como agro nacional (alcance "pais", sección Agro) y bajarle el peso de 16 a 8. |
| Radio Sudestada (apagada) | De Balcarce, con mucho de afuera | radiosudestada.com.ar, WhatsApp 2266; Cooperativa de Trabajo La Barrosa Ltda. | Dejarla apagada (decisión del 30/09). Si vuelve, como Radio Gabal: sólo lo que nombra a Balcarce. |

## Contra lo que hay en `ingesta/fuentes.mjs`

Hoy hay 11 de Balcarce (8 medios, Municipalidad, Concejo y Facultad), con 15 direcciones.

- **Falta:** Radio Gabal · Cultura (feed que hoy no se lee); Boletín Oficial Municipal (SIBOM) de Balcarce; Cooperativa de Electricidad General Balcarce · cortes programados.
- **A revisar:** Infórmese Primero (FM 104.9); Radio Gabal (FM 104.1); Puntonueve (FM 100.9); Google Noticias · búsqueda "Balcarce" (detector, no fuente); Diario La Capital de Mar del Plata (cobertura de Balcarce).
- **Sobra:** nada. Candidata muerta: Minuto Balcarce. Dormida: Ahora Balcarce.
- Las pendientes de `LISTA-ELEGIDA.md` ("SIBOM y las instituciones sin sitio: hospital, bomberos, Cooperativa, autódromo, radios Líder y 105.1") quedan respondidas: SIBOM y la Cooperativa se pueden leer como página; el hospital sale por el feed municipal; bomberos y autódromo no tienen sitio; Radio Líder es del grupo de La Vanguardia y la 105.1 (FM Ebeneser) no tiene sitio de noticias.

## Cómo se probó y qué no se pudo

- Todo se pidió desde la PC de Hernán (curl y fetch con nombre de navegador) el 15/10/2026 por la tarde. **Nada se probó desde GitHub Actions ni desde Cloudflare**: las que dependen de esto (La Capital de Mar del Plata, el feed de Ahora Balcarce con https) hay que verificar antes de sumarlas.
- "No se encontró sitio" quiere decir que las búsquedas (buscadores, Google Noticias y los enlaces de los sitios de acá) no devolvieron uno; puede existir sólo en Facebook o Instagram, y se lo hay que pedir a la institución.
- Facebook, Instagram y X no se pueden leer sin una cuenta: quedan "a mano".
- No se vio nunca la página de cortes programados de la Cooperativa con un corte cargado, ni un boletín SIBOM más nuevo que el 128º (21/09).
