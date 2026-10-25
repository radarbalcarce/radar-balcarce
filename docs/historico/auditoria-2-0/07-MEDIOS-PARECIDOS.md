# 07 · Medios parecidos al nuestro: cómo funcionan los medios locales (investigación para Radar 2.0)

*16/10/2026. Hecho con búsquedas en internet (informes, notas de prensa especializada, fallos y estudios académicos) y
leyendo lo que el repositorio ya tiene escrito sobre lo mismo (`PUBLICIDAD.md`, `COMERCIAL.md`, `INVESTIGACION.md`,
`web/app/quienes-somos/page.js`, `docs/DECISIONES.md` y el informe 02 de esta auditoría). No se tocó código ni datos.
Cada dato lleva su fuente al lado. **Ojo con las fechas:** muchos números de medios chicos son de hace años, porque casi
nadie los publica; donde un dato es viejo o de segunda mano, se dice. Esto no es asesoramiento legal: lo de la ley está
explicado simple para decidir, y ante un reclamo concreto hay que consultar a un abogado.*

## Resumen en 10 líneas

1. **Medios como Radar hay pocos y viven ajustados.** En la Argentina, la mitad de las localidades casi no tiene periodismo local (FOPEA), y entre 2021 y 2025 cerraron en neto 196 medios. Los que nacen en ciudades chicas suelen ser de una o dos personas que todavía no pueden vivir de eso (Plottier Conecta, 60.000 habitantes).
2. **Ninguno vive de una sola fuente de plata.** Los que aguantan mezclan publicidad local, contenido para comercios, socios lectores, patrocinio de un servicio, eventos y algo de becas. Los que dependían de la pauta del municipio o de una sola beca fueron los que más sufrieron.
3. **La pauta oficial (la publicidad del Estado) es la trampa clásica del medio de pueblo:** es opaca, se reparte a dedo y se usa para premiar o castigar. Hay medios de Colombia que la bajaron del 70 % al 15 % vendiéndoles contenido a comercios de la zona, y les fue mejor.
4. **Lo que más rinde en lo local es lo útil y lo de acá:** farmacia, clima, cortes, agenda, deporte del pueblo. Patch (EE.UU.) dice que su producto con IA es "un servicio", no periodismo. Los números propios de Radar dicen lo mismo: lo de Balcarce se lee cinco a diez veces más que lo nacional.
5. **La IA en noticias locales ya tuvo sus escándalos**, y casi todos por lo mismo: copiar a los medios chicos sin nombrarlos (Nota, Good Daily), inventar datos que lastiman a la gente (NewsBreak), firmar con periodistas que no existen (Hoodline) o recrear caras y voces de personas reales (El Primer Feca, Argentina, septiembre de 2026).
6. **Los que la usan bien** (RADAR en el Reino Unido, Todo Jujuy) trabajan sobre datos públicos o tareas repetitivas, con una persona que revisa, reglas escritas y aviso claro al lector. La gente quiere que le digan cuándo hubo IA (94 % en una encuesta grande), aunque desconfía algo más cuando se lo dicen: aun así, los investigadores recomiendan decirlo.
7. **Con los medios de los que se toma, la regla de oro es enlazar, nombrar, no copiar entero y sumar algo.** La ley argentina (11.723, art. 28) deja contar noticias de interés general, pero **las fotos son otra cosa**: en julio de 2026 un tribunal confirmó $6 millones contra la revista Ñ por una foto sacada de internet, aunque tenía el nombre del autor.
8. **Facebook casi no muestra enlaces** (1,3 % de lo que se ve en EE.UU. tiene un enlace) y Meta prueba limitar los enlaces de las páginas; los grupos de la ciudad son la "plaza del pueblo", pero desde 2024 no se puede publicar en ellos con un programa. WhatsApp (canales) funciona para un resumen diario, a mano.
9. **Para el espacio comercial**, lo que funciona en lugares chicos es una guía gratis para todos con un lugar "destacado" pago, el patrocinio de lo útil ("el clima, presentado por…") y secciones pagas como las de La Vanguardia. **No hay tarifas públicas** de medios de pueblos bonaerenses: hay que preguntar en Balcarce.
10. **Para Radar:** 14 recomendaciones sin gastos nuevos (§ 6), encabezadas por **hablar con los medios de Balcarce antes de que haya un reclamo**, nombrarlos dentro de la nota cuando la noticia es sólo suya, pedir permiso por las fotos y poner lo útil de acá en el centro; tres riesgos a evitar (vivir del trabajo de otros, el error automático que lastima, que la plata mande sobre la nota); y en § 7, **otras fuentes que no son medios** (mariapress.com es una vitrina de gacetillas que pagan los que las mandan; el boletín oficial del municipio, datos abiertos gratis, la papa en el Mercado Central) y la idea más fuerte de todas: **una "sala de prensa" propia** para que clubes, escuelas y entidades de Balcarce le manden sus novedades a Radar.

---

## Palabras que se usan (media línea cada una)

- **Medio hiperlocal:** el que cubre una sola ciudad, barrio o pueblo.
- **Desierto de noticias (o informativo):** un lugar donde no hay ningún medio que cuente lo que pasa ahí con periodistas.
- **Pauta oficial:** la publicidad que pagan el municipio, la provincia o la Nación en los medios.
- **Membresía (socios lectores):** gente que aporta plata todos los meses sin que la nota se cierre; a cambio recibe algo chico (un saludo, un boletín extra) o sólo la satisfacción de bancar al medio.
- **Suscripción con muro de pago:** sólo lee el que paga. En medios chicos casi nunca funciona.
- **Contenido patrocinado (o "de marca"):** una nota o un video que paga un comercio. Si no se marca como tal, es publicidad encubierta.
- **Newsletter:** un resumen que llega por mail o por WhatsApp todos los días o todas las semanas.
- **Agregador:** el que junta noticias de otros y las ordena (Radar, en parte, lo es).
- **Atribuir:** decir de quién es un dato o una nota. **Enlazar:** poner el link a la nota original.
- **Canal de WhatsApp:** una lista de difusión pública y gratuita; el que la sigue lee, reacciona con un emoji y no puede contestar.
- **Grupo de Facebook de la ciudad:** el grupo de vecinos ("Balcarce compra y vende", "Vecinos de…"); lo maneja un administrador, no un medio.
- **Guía comercial (o vidriera):** el listado de comercios y emprendimientos de la ciudad, con sus datos.

---

## 1. Cómo funcionan los medios locales y de ciudades chicas

### 1.1 El panorama: cada vez menos medios donde vive poca gente

| Dónde | Qué se midió | Fuente |
|---|---|---|
| **Argentina (2021)** | Relevamiento de 2.464 medios y 13.597 periodistas: el **48 % de las localidades** son desiertos de noticias, el 25 % semidesiertos, el 17 % "semibosques" y sólo el 10 % tiene condiciones para un periodismo profesional activo. Dos de cada tres medios no tenían ni un periodista en blanco | [LatAm Journalism Review, sobre FOPEA](https://latamjournalismreview.org/news/fopea-publishes-research-on-news-deserts-in-argentina/); [IJNet](https://ijnet.org/en/story/new-survey-shows-how-news-deserts-affect-argentina%E2%80%99s-population); [Unidiversidad](https://www.unidiversidad.com.ar/informe-de-fopea-la-precariedad-acorrala-a-los-periodistas-profesionales) |
| **Argentina (2021-2025)** | FOPEA contó una **pérdida neta de 196 medios** en cuatro años; más del 40 % del territorio no tiene prensa local. La confianza en las noticias bajó a **26 %** (la más baja en diez años) y sólo **10 %** paga por noticias en internet | [Reuters Institute, Digital News Report 2026, Argentina](https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/argentina) |
| **Argentina (2025)** | El gobierno nacional recortó la pauta oficial y los medios públicos; la publicidad privada cayó 4 % en 2024; el interés en las noticias bajó de 77 % (2017) a 42 % | [Reuters Institute, DNR 2025, Argentina](https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025/argentina) |
| **América Latina (2025)** | En cinco países (Argentina, Chile, Colombia, México y Perú), los desiertos y semidesiertos son **más del 65 % del territorio** (estudio de la Fundación Gabo) | [Reuters Institute, febrero de 2026](https://reutersinstitute.politics.ox.ac.uk/news/america-latina-esta-salpicada-de-desiertos-informativos-estos-son-los-reporteros-que-llenan) |
| **Estados Unidos (2025)** | **213 condados** sin ningún medio local y otros 1.524 con uno solo; unos 50 millones de personas con poco o ningún acceso a noticias locales; 136 diarios cerrados en un año. Del otro lado, **más de 300 medios nuevos en cinco años, 80 % sólo digitales**. Los desiertos son más pobres y más rurales | [Medill, The State of Local News 2025](https://localnewsinitiative.northwestern.edu/projects/state-of-local-news/2025/); [nota de Medill](https://www.medill.northwestern.edu/news/2025/news-deserts-hit-new-high-and-50-million-have-limited-access-to-local-news-study-finds.html) |

**Qué quiere decir para Balcarce:** una ciudad de 45.000 habitantes con varios medios propios (La Vanguardia, El
Diario, Radio Gabal, Puntonueve y otros) **no es un desierto**. Eso cambia el papel de Radar: no llega a llenar un vacío
sino a sumarse a un ecosistema que ya existe y que vive ajustado. De ahí sale el "no venimos a reemplazar a nadie", y
de ahí sale también el riesgo principal (§ 6, riesgo 1).

### 1.2 Argentina y América Latina: casos

**Lo que dicen los estudios del interior bonaerense.** Hay poco y casi todo es viejo, pero coincide:

- Un informe de Letra P (agosto de 2021) dice que los medios con fines de lucro de la provincia dependen sobre todo de la
  publicidad oficial y privada, que el sistema "es deficitario sin ayuda estatal", que la **pauta municipal es muy
  despareja y opaca** y que en localidades de hasta 10.000 habitantes directamente no existe ([Letra P](https://www.letrap.com.ar/nota/2021-8-11-12-38-0-la-supervivencia-de-los-medios-locales-bonaerenses)).
- Un estudio de la UNCPBA y el CONICET sobre periodismo local en tres ciudades bonaerenses (2024) encontró que los
  periodistas **no saben bien quién los lee**, y que eso les complica conseguir quién los financie ([Alonso y Díaz, *Comunicación y Sociedad*](https://comunicacionysociedad.cucsh.udg.mx/index.php/comsoc/article/download/e8795/6712/31952)).
- En la competencia de Balcarce (revisado por Radar el 18/09, `PUBLICIDAD.md`): El Diario usa Google AdSense, Puntonueve
  Google Ads, y **La Vanguardia no tiene banners: vende secciones pagas** (Edictos, Inmobiliarias, Profesionales,
  Infocampo). Es el modelo más parecido al que le sirve a Radar.

**Casos con nombre:**

| Medio | Dónde y cuánta gente | Cómo se financia | Qué les funcionó / qué no | Fuente |
|---|---|---|---|---|
| **Plottier Conecta** | Plottier, Neuquén (unos 60.000 habitantes). Lo dirige Judith Calmels | Arrancó con una beca de SembraMedia y FOPEA | Cuenta historias cotidianas con voces locales que los medios de la capital no traían. **Todavía no le alcanza para vivir** | [Reuters Institute, 2026](https://reutersinstitute.politics.ox.ac.uk/news/america-latina-esta-salpicada-de-desiertos-informativos-estos-son-los-reporteros-que-llenan) |
| **Extrategia Medios** | Sabana de Bogotá, Colombia; 20 años, empezó como radio comunitaria | La pauta oficial llegó a ser el 60-70 % de lo que entraba; hoy es cerca del 15 %. **Más del 65 % viene de contenido de marca para empresas de la zona** | Diversificar con comercios le dio independencia; igual recibe presiones de funcionarios por lo que publica | Ídem |
| **El Morichal** | Guainía y Vichada, Colombia | Publicidad comercial y becas | **Rechazó la pauta de gobernaciones y alcaldías** y perdió cerca del 70 % de su plata, pero mantuvo la independencia | Ídem |
| **Entre Ojos** | Boyacá, Colombia | Probó con publicidad y **no le resultó atractiva a los anunciantes**; rechaza la pauta oficial; vive de becas | La persistencia, dice, le dio "pequeñas victorias"; la plata sigue siendo el problema | Ídem |
| **Inforegión** | Selva Alta, Perú (desde 2006) | Cooperación internacional hasta 2025 (USAID), publicidad y **consultoría en comunicación** | Nunca dependió de una sola fuente, y por eso sobrevivió al corte de USAID | Ídem |
| **Todo Jujuy** | Jujuy | Medio comercial; el proyecto de IA fue con el programa Impulso Local (ADEPA, ICFJ y Meta) | Usa IA para notas de tránsito, clima y deportes, con **directrices escritas y pilotos antes de publicar**; decidió concentrarse en lo local de impacto en vez de repetir lo que ya cubren otros | [IJNet, 2024](https://ijnet.org/es/story/la-ia-ayuda-potenciar-el-alcance-y-la-sostenibilidad-de-un-medio-local-argentino); [LJR, 2025](https://latamjournalismreview.org/articles/argentinas-newsrooms-are-leading-the-ai-revolution-but-risk-getting-devoured-by-it/) |
| **Cenital** (nacional, como referencia de socios) | Buenos Aires | Socios 42,4 %, publicidad privada y oficial 39,4 %, becas 17 % | En 2022 los socios crecieron 50 %, pero los costos crecieron más (inflación de 94,8 %) | [LJR](https://latamjournalismreview.org/articles/how-do-independent-media-in-argentina-remain-sustainable-in-an-economic-crisis-three-news-outlets-share-their-membership-and-fundraising-strategies-to-stay-afloat/) |
| **Diarios cooperativos (FADICCRA)** | Federación desde 2009; varios son diarios del interior recuperados por sus trabajadores (El Independiente de La Rioja, El Diario del Centro del País de Villa María, Comercio y Justicia de Córdoba) | Venta, publicidad, programas de empleo; en 2021 se juntaron con otras redes en la Confederación de Medios Cooperativos y Comunitarios para pedir un reparto más justo de la pauta | El papel y la pauta son sus dos problemas eternos | [Pensamiento Civil](https://www.pensamientocivil.com.ar/3779-historia-sobre-quiebras-curiosidad-comercio-y-justicia); [Radiográfica](https://radiografica.org.ar/2021/12/17/se-lanzo-la-confederacion-de-medios-cooperativos-y-comunitarios) |

**Lo que dicen los estudios de la región:** en el relevamiento de SembraMedia de 2021 (más de 200 medios digitales
independientes de América Latina), las **becas eran en promedio casi el 31 % de los ingresos**, y el propio informe
advierte que depender de ellas no es sostenible; los medios que tenían **al menos una persona a cargo de la tecnología
facturaban el triple** ([IJNet sobre *Punto de inflexión*](https://ijnet.org/es/story/%C2%BFlos-medios-nativos-digitales-se-han-vuelto-demasiado-dependientes-de-las-subvenciones);
[resumen de SembraMedia](https://data2021.sembramedia.org/reportes/executive-summary/)). Radar tiene eso de sobra; lo
que le falta es lo contrario: la parte comercial y el vínculo con la ciudad.

**Programas gratuitos que existen en la Argentina:** *Impulso Local* (ADEPA, ICFJ y Meta) dio entre USD 5.000 y 25.000 y
mentorías por medio; en 2022-2023 capacitó a 235 medios y financió a 94 por un millón de dólares en total
([ADEPA](https://adepa.org.ar/adepa-icfj-meta-lanzan-nueva-edicion-impulso-local-programa-capacitacion-fondos-100-medios-argentinos%ef%bf%bc);
[IJNet](https://ijnet.org/es/opportunity/convocatoria-abierta-impulso-local-2022-argentina)). Google News Initiative
hizo en 2025 un *AI Media Lab* gratuito para medios de la Argentina y otros cuatro países
([IJNet](https://ijnet.org/pt-br/node/19806)). No se sabe si Radar, sin periodistas, entraría: FOPEA, por ejemplo, sólo
cuenta como "medio" al que paga al menos a un periodista ([cita de su método](https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/argentina)).

### 1.3 Casos de afuera

| Medio | Qué es | Cuánta gente | Cómo se financia | Qué funcionó / qué no | Fuente |
|---|---|---|---|---|---|
| **Patch** (EE.UU.) | Red de sitios locales. AOL perdió entre 200 y 300 millones de dólares con ella hasta 2014; con el dueño nuevo recortó personal y desde entonces gana plata casi siempre. En 2025 sumó boletines hechos con IA y pasó de 1.100 a 30.000 comunidades "posibles" | 85 periodistas fijos (2025) | Publicidad local y nacional, mucha de autoservicio. **La ficha del comercio en su guía es gratis**; lo pago es destacarla (US$ 79 por mes por comunidad, según una guía externa de 2023) | El boletín con IA (PatchAM) llegó a casi un millón de suscriptores en 14.000 comunidades, pero **trae noticias de la ciudad equivocada** ("el problema del Springfield equivocado", varias veces por semana) y en Frederick no traía nada del diario local. Su director lo define como un servicio, no como periodismo | [Axios, 2025](https://www.axios.com/2025/03/04/patch-news-ai-newsletters-local-communities); [CJR, marzo de 2026](https://www.cjr.org/feature/hyperlocal-ai-patch-newsletter-million-subscribers.php); [CNBC, 2014](https://www.cnbc.com/2014/01/15/aol-unloads-money-losing-local-news-service.html); [Patch, guía gratis](https://patch.com/georgia/acworth/video-your-business-is-on-patch-claim-it-for-free) |
| **Axios Local** (EE.UU.) | Un boletín diario por ciudad, con 3 a 5 notas propias, cosas de la comunidad y **enlaces a otros medios** | **Dos periodistas por ciudad**; 35 ciudades, más de 2 millones de suscriptores gratis | Patrocinios del boletín (un aviso arriba y dos espacios de marca adentro), socios (15.000 pagan entre 25 y 500 dólares por año) y un acuerdo con OpenAI que pagó ciudades nuevas | **Todavía no da ganancia** (mayo de 2026); la publicidad local directa es lo que más crece | [Press Gazette, 2026](https://pressgazette.co.uk/newsletters/axios-local-newsletters-scale-cities-profit/); [Digiday, 2022](https://digiday.com/media/how-axios-is-tackling-local-news-newsletters-from-small-teams-in-more-markets/) |
| **The Bristol Cable** (Reino Unido) | Cooperativa: cada socio es dueño y vota | Redacción chica | Socios desde 1 libra por mes; becas (una fundación le dio unas 725.000 libras entre 2018 y 2023); **avisos sólo en el diario de papel, como máximo 5 páginas de cada 40**, y nada de avisos de grandes empresas | Que el lector sea dueño genera lealtad; pero depende mucho de becas (las cifras de cuánto es socios y cuánto becas se contradicen entre fuentes) | [Bristol Cable, transparencia](https://thebristolcable.org/transparency/); [Bristol Cable, 2023](https://thebristolcable.org/2023/09/explainer-how-bristolians-are-keeping-proper-journalism-alive/); [beabee](https://wiki.beabee.io/community-journalismus/english/pioneer-portraits/the-bristol-cable-england/revenue-streams-and-finance) |
| **VareseNews** (Italia) | Diario digital de la provincia de Varese, desde 1997; organiza el festival Glocal de medios locales | Redacción mediana | **Gratis para todos**; desde 2020, "Più VareseNews" para el que quiere bancar (3,99 € por mes con avisos sólo locales, 6,99 € sin avisos); desde 2021, **membresía para empresas, asociaciones y entes**; publicidad y marketing para comercios | Mantener la nota abierta y pedir apoyo, en vez de cerrar; vender a las empresas "ser parte" y no sólo un banner | [VareseNews, 2020](https://www.legnanonews.com/altri/2020/12/14/piu-varesenews-come-abbonarsi-domande-e-risposte/962615/?output=pdf); [Saronno News, 2021](https://www.saronnonews.it/2021/02/12/ripartire-con-il-territorio-varesenews-lancia-la-membership-per-aziende-associazioni-ed-enti/?output=pdf) |
| **Citynews** (Italia) | Red de unos 50 sitios locales; nació mezclando noticias y aportes de los usuarios y terminó como diario digital clásico | — | Publicidad | En Italia los lectores pagan poco y la publicidad sigue siendo lo principal; muchos medios cayeron en títulos "anzuelo" para sumar clics | [Il Post, 2022](https://www.ilpost.it/2022/06/25/citynews/); [CMPF, 2024](https://cmpf.eui.eu/wp-content/uploads/2024/03/Translated-Fact-Sheets-LM4D-Italia-1.pdf) |
| **Somos Malasaña** (Madrid) | Medio de barrio que armaron dos periodistas desocupados | 2 personas al empezar | Publicidad de comercios del barrio ("los anunciantes llegaron solos") y socios con descuentos y sorteos | Lo que más se leía: **galerías de fotos de obras y entrevistas a vecinos**. Datos de hace más de diez años | [Público](https://www.publico.es/actualidad/somos-malasana-chicos-barrio-alzan-voz.html); [Consumer](https://www.consumer.es/?p=136441); [IEB School](https://www.iebschool.com/blog/el-nuevo-periodismo-hiperlocal-la-informacion-barrio-a-barrio-comunicacion-digital) |
| **Pamplonews** (Pamplona, España) | Boletín diario **sólo por WhatsApp**, de cultura y planes en la ciudad | Pocos | Ninguno firme todavía: piensan en patrocinio de comercios e instituciones, productos y eventos | **3.700 suscriptores en tres meses y más de 9.100 en unos seis**, sin sitio web | [IJNet](https://ijnet.org/en/story/pamplonews-driving-community-engagement-through-whatsapp); [Nieman Lab](https://www.niemanlab.org/2023/08/a-local-whatsapp-newsletter-is-helping-people-make-the-most-of-a-spanish-city/) |
| **Los hiperlocales de España** (estudios) | Decenas de medios digitales de pueblo y de comarca | 1 a 3 personas | Publicidad local y de las administraciones | Problemas que se repiten: **no tienen plan de negocio y dependen del municipio** (estudio de Castellón) | [resumen de estudios](https://ojs.labcom-ifp.ubi.pt/ec/article/download/1051/pdf/3175); [Segura Iniesta, Aragón](https://scimagoepi.com/wp-content/uploads/2023/05/segura_iniesta_mancho_marta.pdf) |

### 1.4 Cómo se financian: la lista completa, con lo que hay que cuidar

| Fuente de plata | Quién la usa | Qué cuidar | ¿Sirve a Radar? |
|---|---|---|---|
| **Publicidad local vendida directamente** (aviso fijo) | Casi todos; Axios dice que es lo que más le crece | Que se distinga de la nota; que no la traiga una red publicitaria que meta cualquier cosa | Sí: ya están los 3 espacios armados (`PUBLICIDAD.md`) |
| **Guía comercial / secciones pagas** | La Vanguardia (Balcarce), Patch | Gratis para todos y destacado pago, para que la guía sea útil y no sólo de los que pagan | Sí, con la base de `comercial/` |
| **Patrocinio de un servicio** ("presentado por") | Axios (patrocinio del boletín), Pamplonews (planeado) | Que diga "presentado por" y que el patrocinador no toque el contenido | Sí: clima y farmacia son lo más mirado |
| **Contenido de marca** (nota o video pagado por un comercio) | Extrategia (más del 65 %), VareseNews | Siempre marcado; nunca en Política ni Policiales | Sí, más adelante y marcado |
| **Socios lectores** | Bristol Cable, VareseNews, Cenital, Axios | Necesita una comunidad que ya te quiera; en la Argentina sólo 10 % paga por noticias | Más adelante |
| **Membresía de empresas e instituciones** | VareseNews | Que no se vuelva un compromiso editorial | Más adelante |
| **Eventos** (charlas, ferias, premios) | Axios, Bristol Cable, Pamplonews (planeado) | Llevan tiempo de personas | Quizás, junto con la agenda |
| **Avisos fúnebres y clasificados** | Los diarios chicos de EE.UU. viven en parte de los avisos fúnebres (unos 318 dólares cada uno en mercados chicos, dato de 2019) | — | **Los sepelios no, por regla de Radar** (no se publican nunca). Clasificados y changas sí (idea 6 de `PUBLICIDAD.md`) ([Axios, 2019](https://www.axios.com/2019/08/27/obituaries-local-newspapers)) |
| **Becas y programas** | Plottier Conecta, Bristol Cable, Entre Ojos | Se terminan; los que dependían de una sola sufrieron (USAID 2025) | Sólo si aparece uno gratis que acepte un medio automático |
| **Consultoría y servicios digitales** | Inforegión | Que el cliente no sea a la vez noticia | Ya pensado en `COMERCIAL.md` ("Servicios digitales") |
| **Pauta oficial** | Casi todos los medios de pueblo | Ver § 1.5 | Con mucho cuidado |

### 1.5 La pauta oficial, explicada simple

**Qué es:** la plata que el municipio (o la provincia) paga para que un medio difunda sus avisos: vacunación, cortes,
obras, campañas.

**Por qué es tentadora:** en muchos pueblos es la primera o la única publicidad que llega, y llega todos los meses.

**Por qué es un riesgo:**

- **Es opaca y despareja.** En la provincia de Buenos Aires casi nadie publica cuánto se le da a cada uno; en 2021, en
  algunas localidades no existía y en otras era de $2.000 por mes ([Letra P](https://www.letrap.com.ar/nota/2021-8-11-12-38-0-la-supervivencia-de-los-medios-locales-bonaerenses)).
- **Se usa para premiar o castigar.** En Calingasta (San Juan) la municipalidad dejó cubrir los actos oficiales sólo a
  los medios con pauta vigente, lo que se denunció como censura indirecta ([Tiempo de San Juan](https://www.tiempodesanjuan.com/politica/carbajal-salio-explicar-la-relacion-la-municipalidad-la-prensa-y-la-pauta-n395727)).
  En Colombia, los medios entrevistados por el Reuters Institute cuentan presiones de funcionarios por publicar lo que no
  les gustaba ([Reuters Institute](https://reutersinstitute.politics.ox.ac.uk/news/america-latina-esta-salpicada-de-desiertos-informativos-estos-son-los-reporteros-que-llenan)).
- **Se corta de un día para el otro** (un cambio de gobierno, un recorte nacional como el de 2024-2025).

**Qué recomienda la gente que lo estudia:** FOPEA propone una "cláusula de transparencia" (que los grandes
contratistas del Estado tengan que anunciar en medios locales) ([LJR](https://latamjournalismreview.org/news/fopea-publishes-research-on-news-deserts-in-argentina/));
los medios que salieron bien la bajaron a una parte chica de lo que entra (Extrategia: del 70 % al 15 %).

**Para Radar:** si algún día entra pauta del municipio, que sea **una parte chica**, que se diga en "Quiénes somos" y que
no cambie nada de lo que se publica sobre el municipio (la regla "un aviso no compra una nota" de `PUBLICIDAD.md` ya lo
dice).

---

## 2. IA y automatización en noticias locales

### 2.1 Los casos

| Proyecto | Qué hace | Qué pasó | Fuente |
|---|---|---|---|
| **RADAR** (Press Association y Urbs Media, Reino Unido, desde 2017-2018) | Periodistas escriben **plantillas** a partir de datos públicos (delitos, listas de espera de hospitales, ausentismo escolar) y un programa arma una versión para cada uno de los 391 municipios; los diarios locales se suscriben por año | Más de 100.000 notas desde 2018. Arrancó con unos 700.000 euros de Google. Su editor sostiene que todo lo revisan periodistas; las notas que necesitan contexto o citas llevan trabajo humano | [journalism.co.uk](https://www.journalism.co.uk/press-association-is-using-artificial-intelligence-to-help-local-news-organisations-produce-more-data-driven-stories/); [Press Gazette](https://pressgazette.co.uk/?p=135448); [News Machines](https://newsmachines.beehiiv.com/p/radar-ai-news-agency) |
| **PatchAM** (EE.UU., 2025) | Boletín diario por código postal, hecho con IA sobre datos que curan personas: cinco notas con **enlaces a otros medios**, eventos, clima y posteos de policía y bomberos | Funciona, pero mezcla ciudades con el mismo nombre y a veces ignora al diario local; sólo dos medios pidieron salir | [Axios](https://www.axios.com/2025/03/04/patch-news-ai-newsletters-local-communities); [CJR](https://www.cjr.org/feature/hyperlocal-ai-patch-newsletter-million-subscribers.php) |
| **NewsBreak** (app de noticias, EE.UU.) | Reescribe noticias locales con IA | Reuters encontró **al menos 40 notas equivocadas desde 2021**: un banco de alimentos tuvo que rechazar gente porque la app daba mal los horarios; inventó un tiroteo de Navidad que la policía desmintió; notas copiadas de sitios locales con firmas inventadas. Respondió con un cartel de que su contenido "puede no estar libre de errores" | [NBC News](https://www.nbcnews.com/tech/tech-news/top-news-app-us-chinese-origins-writes-fiction-help-ai-rcna155567); [Dan Kennedy](https://dankennedy.net/2024/06/14/reuters-exposes-newsbreaks-chinese-ties-and-ai-based-local-news-hallucinations/) |
| **Hoodline** (EE.UU., 2024) | Red de sitios locales que pasó de periodistas a IA | Firmaba con **nombres de periodistas que no existen**, con fotos y biografías inventadas y un cartelito "AI" chiquito | [CNN, vía ABC17](https://abc17news.com/money/cnn-business-consumer/2024/05/30/a-national-network-of-local-news-sites-is-publishing-ai-written-articles-under-fake-bylines-experts-are-raising-alarm/) |
| **Good Daily** (EE.UU., 2025) | 355 boletines locales hechos con IA, **por una sola persona** | No decía que era una red ni que lo hacía una IA; vivía de resumir a los pocos medios de cada pueblo y competía con ellos por la publicidad local. Un vecino contó que "pensaba que era local". Lo compró otra empresa en 2025 | [Nieman Lab](https://www.niemanlab.org/2025/01/inside-a-network-of-ai-generated-newsletters-targeting-small-town-america/); [KMUW](https://www.kmuw.org/2025-03-24/daily-wichita-shares-local-current-events-its-part-of-an-ai-generated-information-network); [Nieman Lab, venta](https://niemanlab.org/2025/07/good-dailys-network-of-more-than-350-ai-generated-local-newsletters-finds-a-buyer) |
| **Nota News** (EE.UU., 2025-2026) | 11 sitios locales para "desiertos", hechos con IA por dos editores a medio tiempo; se suponía que usaban sólo información pública | Poynter encontró **más de 70 notas con texto, citas y fotos de 53 periodistas de 29 medios, sin nombrarlos**. Cerraron los 11 sitios en abril de 2026 y varios clientes dejaron de usar la empresa | [Poynter](https://www.poynter.org/ethics-trust/2026/nota-news-local-outlets-ai-plagiarism/); [Axios Richmond](https://www.axios.com/local/richmond/2026/04/03/nota-ai-news-sites-shut-down-plagiarism) |
| **Gannett + LedeAI** (EE.UU., 2023) | Crónicas automáticas de partidos de colegios secundarios | Salieron con los huecos de la plantilla sin llenar ("los [[MASCOTA_GANADORA]] vencieron a…") y fechas repetidas; se suspendió en todos los diarios | [CNN](https://edition.cnn.com/2023/08/30/tech/gannett-ai-experiment-paused); [WTOP](https://wtop.com/business-finance/2023/08/gannett-to-pause-ai-experiment-after-botched-high-school-sports-articles/) |
| **El Primer Feca** (Argentina, septiembre de 2026) | Noticiero "100 % hecho con IA", sin supervisión humana; publica sus instrucciones para que cualquiera las audite | Críticas por calidad y por plagio; un cronista denunció que un "movilero" virtual **copiaba su cara y su voz**; un diputado dijo que le **recrearon una entrevista que nunca dio** con audios de WhatsApp | [Perfil](https://www.perfil.com/noticias/ciencia/fuertes-criticas-a-santi-siri-por-lanzar-un-noticiero-con-inteligencia-artificial-el-primer-feca.phtml); [Noticias](https://noticias.perfil.com/noticias/informacion-general/polemica-por-un-movilero-clonado-en-el-noticiero-hecho-con-ia.phtml); [Noticias, caso Yeza](https://noticias.perfil.com/noticias/politica/en-el-noticiero-hecho-con-ia-ahora-hasta-los-entrevistados-son-fake-el-caso-yeza.phtml); [La Tribuna](https://www.latribuna.hn/2026/09/22/video-noticiero-hecho-por-ia-cruza-una-frontera-inquietante-para-el-periodismo-argentino/) |
| **Todo Jujuy** (Argentina) | IA para tránsito, clima y deportes; asistente de lectura; audio de las notas | Primero escribieron las reglas, después probaron en piloto, después publicaron | [IJNet](https://ijnet.org/es/story/la-ia-ayuda-potenciar-el-alcance-y-la-sostenibilidad-de-un-medio-local-argentino) |
| **Medios argentinos en general (ADEPA, octubre de 2025)** | El 29 % usa IA para ayudar a redactar, titular y traducir; el 38 % para desgrabar; el 40 % para audios o resúmenes; casi nadie genera imágenes, por ética y por derechos | ADEPA pide que cada medio tenga su protocolo, con **supervisión humana, respeto de la propiedad intelectual y transparencia con el público**. Además, Editorial Perfil demandó a OpenAI y Microsoft por usar su periodismo sin permiso | [LJR](https://latamjournalismreview.org/articles/argentinas-newsrooms-are-leading-the-ai-revolution-but-risk-getting-devoured-by-it/); [Buenos Aires Times](https://batimes.com.ar/news/economy/editorial-perfil-sues-openai-microsoft-over-unauthorised-use-of-journalistic-content.phtml) |

**El patrón de los que salieron mal:** (1) toman el trabajo de los medios chicos sin nombrarlos; (2) publican sin que
nadie mire y el error lastima a alguien real; (3) esconden que es IA o inventan personas. **El patrón de los que
salieron bien:** trabajan sobre datos públicos o tareas repetitivas, tienen reglas escritas y alguien que revisa, y
mandan lectores a los medios de donde sacan la información (Axios Local y PatchAM enlazan a otros medios en cada
edición).

### 2.2 Qué quiere el lector sobre la IA

- **Quiere que le avisen.** En una encuesta de más de 6.000 personas (Trusting News y ONA, 2024), el **93,8 % quiere que
  el medio diga cuándo usó IA**, y lo que más quiere saber es: para qué se usó, cómo se cuida que esté bien y si una
  persona lo revisó antes de publicar ([Trusting News](https://trustingnews.org/new-research-how-ai-disclosures-in-news-help-and-also-hurt-trust-with-audiences/);
  [Poynter, 2024](https://poynter.org/?p=1123390)).
- **Pero avisar cuesta algo de confianza.** En un experimento de 2025 con diez redacciones, el 42 % dijo confiar menos en
  una nota que avisaba que hubo IA y el 30 % dijo confiar más. Igual, los investigadores insisten en avisar
  ([WYSO, 2026](https://www.wyso.org/2026-02-06/people-want-journalists-to-say-when-they-use-ai-but-trust-drops-when-they-do)).
  Avisar en general y siempre igual cansa ("fatiga de etiquetas"): conviene que el aviso **diga qué hizo la IA en esa
  nota** ([Poynter, 2024](https://poynter.org/?p=1123390)).
- **No quiere noticias hechas "mayormente por IA".** En el mundo, sólo el 18 % se siente cómodo con noticias hechas
  mayormente por IA con algo de supervisión humana; en España, el 13 % (y 47 % incómodo). La gente prefiere que la IA
  ayude a un periodista y no que lo reemplace ([UTS sobre el DNR 2025](https://www.uts.edu.au/news/2025/06/putting-the-ai-cart-before-the-news-horse);
  [Universidad de Navarra](https://en.unav.edu/web/digital-news-report/entradas/-/blogs/el-47-de-los-ciudadanos-en-espana-experimenta-incomodidad-ante-las-noticias-producidas-mediante-inteligencia-artificial)).
- **La agencia AP** pide avisar cuando la IA contribuye "de manera sustancial" a lo publicado y **prohíbe usar IA para
  crear o alterar fotos de noticias** (salvo que la imagen hecha con IA sea el tema de la nota, y marcada)
  ([AP](https://ds.svcs.associatedpress.com/standards-around-generative-ai); [Engadget](https://www.engadget.com/new-ap-guidelines-lay-the-groundwork-for-ai-assisted-newsrooms-201009363.html)).

### 2.3 Cómo está Radar contra esa lista

| Lo que piden los buenos ejemplos | Radar hoy | Falta |
|---|---|---|
| Decir que es IA, sin esconderlo | "Quiénes somos" lo dice de entrada ("un medio automático") y cada nota firma "Redacción con IA, verificada contra las fuentes" (`firmaCorta`, `web/components/metadatos.js`) | Que la firma enlace a la explicación (rec. 7) |
| No inventar personas | Las firmas son del medio, no de periodistas inventados; las voces de los videos son voces propias de IA y "Quiénes somos" lo dice | Que siga así: nunca una voz o una cara parecida a una persona real (riesgo 2) |
| Verificar contra la fuente | Un verificador descarta lo que ninguna fuente trae | — |
| Persona que revisa lo sensible | Muertes, acusaciones y menores esperan a una persona; Política y Policiales también en redes | — |
| Nombrar y enlazar a la fuente | Cada nota tiene el desplegable "Fuentes (N)" con enlaces | El desplegable está cerrado: el medio de acá que dio la noticia **no aparece en el texto** (rec. 3) |
| No copiar | La IA tiene prohibido repetir más de diez palabras seguidas y el verificador rechaza desde trece | Revisar las pocas notas que salen con el texto de la fuente (§ 3.3) |
| Corregir a la vista | Hay correcciones (`web/data/correcciones.json`) y "Si algo está mal, escribinos" | Decir en la nota qué se corrigió y cuándo (rec. 8) |
| Evitar "el Springfield equivocado" | Ya hay reglas para "Balcarce" como calle de Mar del Plata y apellido (`esDeAca`; informe 06 de esta auditoría) | — |

---

## 3. La relación con los medios de los que se toma información

### 3.1 Buenas prácticas de un agregador (resumidas de las guías del oficio)

1. **Enlazar, atribuir y sumar algo** (la regla de Steve Buttry, la más citada): nombrar de dónde salió, poner el link y
   agregar valor propio, no sólo repetir ([iMediaEthics](https://www.imediaethics.org/?p=5356);
   [American Press Institute](https://americanpressinstitute.org/ethical-curation-attribution/)).
2. **No resumir tanto que el lector ya no necesite ir a la nota original.** El American Press Institute dice que
   parafrasear o citar largo, de manera que la fuente no reciba la visita ni la plata, es la práctica problemática.
3. **Ante la duda, atribuir** (la norma de la radio pública de EE.UU., NPR, citada por el mismo instituto).
4. **Buscar al que dio la noticia primero** y enlazarlo a él, no al que la repitió (las reglas de agregación de
   TheWrap, [The Wrap](https://www.thewrap.com/waxman-vs-wolff-and-code-conduct-16180/)).
5. **Las fotos van aparte.** Hasta los medios que dejan republicar sus notas gratis con una licencia abierta (Creative
   Commons) **excluyen las fotos** o piden permiso para cada una ([The Frontier](https://www.readfrontier.org/frontier-content-sharing-and-collaboration-terms/);
   [Mirror Indy](https://mirrorindy.org/content-republishing-guidelines/)).
6. **Se puede hacer un acuerdo por escrito, sin plata de por medio.** Dos medios de Charlottesville (EE.UU.) firmaron uno
   para compartir su cobertura del gobierno local, que dice expresamente que nadie le paga a nadie
   ([el acuerdo](https://www.americanpressinstitute.org/wp-content/uploads/2017/05/20141219-DP-CTOM-agreement.pdf)).

### 3.2 La ley argentina, explicada simple

La ley es la **11.723 de Propiedad Intelectual** ([texto en InfoLEG](https://servicios.infoleg.gob.ar/infolegInternet/anexos/40000-44999/42755/texact.htm)).
`INVESTIGACION.md` § 7 ya lo explica para el texto; acá se suma lo nuevo.

| Artículo | Qué dice, en simple | Qué quiere decir para Radar |
|---|---|---|
| **28** | Las **noticias de interés general** se pueden usar y retransmitir; si se publican **en su versión original, hay que citar la fuente**. Los artículos no firmados o exclusivos son propiedad del diario o la agencia | Contar el hecho con palabras propias está permitido. Copiar la nota de otro, aunque se lo nombre, se acerca a reproducir una obra ajena |
| **10** | Se pueden citar partes chicas de una obra ajena para comentarla, criticarla o enseñar, sólo lo indispensable | Los jueces lo interpretan de manera **restrictiva**: no es un permiso general para usar fotos ni textos largos ([CERLALC, fallo](https://cerlalc.org/wp-content/uploads/dar/jurisprudencia/1752.pdf); [Otros Cines](https://www.otroscines.com/nota-15191-legislacion-cinematografica-v-el-derecho-de-cita-en-la)) |
| **31** | La imagen de una persona no se puede poner "en el comercio" sin su permiso, salvo fines culturales o **hechos de interés público** | Una foto de una persona en una nota de interés público suele estar cubierta; en una publicidad, no |
| **34** | La foto está protegida **20 años desde que se publicó** por primera vez | Casi toda foto de un medio de acá está protegida |
| **71 y 72** | Usar una obra ajena sin permiso puede ser un delito, con la pena de la estafa | Por eso un reclamo por una foto no es sólo "sacarla" |

**El fallo que hay que conocer (julio de 2026):** la Cámara Civil (Sala G) confirmó que la editora de la revista Ñ tiene
que pagarle **$6 millones** a un fotógrafo por usar sin permiso una foto suya, en papel y en la web. La editorial dijo
que la había sacado de internet; el tribunal le contestó que no podía alegar un uso "involuntario" porque **el nombre del
autor estaba en el sitio de donde la tomó**, que el derecho del autor existe aunque la foto no esté registrada, y ordenó
también sacarla de la versión digital ([Diario Judicial](https://www.diariojudicial.com/news-103873-la-foto-tenia-dueno)).
En 2023, otra sala condenó a un portal por tomar fotos publicadas en medios digitales y atribuírselas a otro
([Microjuris](https://aldiaargentina.microjuris.com/2023/10/09/fallos-derechos-de-autor-demanda-de-danos-contra-un-medio-de-comunicacion-por-la-publicacion-de-dos-notas-digitales-que-contenian-fotografias-tomadas-por-el-actor-sin-su-autorizacion/amp/)).

**Qué quiere decir:** **poner el crédito no alcanza**; lo que la ley pide es el permiso. Radar decidió el 27/09 aceptar
ese riesgo para las fotos de otros medios, con condiciones (sin marca, con crédito, nunca de menores ni víctimas;
`INVESTIGACION.md` § 7). Es una decisión de Hernán y no se cambia acá; lo que este informe suma es que **el costo de un
reclamo hoy está medido** (seis millones en un caso de una sola foto) y que hay una forma barata de bajar ese riesgo:
pedir permiso (rec. 5).

**La pauta para publicidad:** el Código Civil y Comercial (art. 1101) prohíbe la publicidad que pueda inducir a error, y
la doctrina incluye ahí la **publicidad encubierta**: la que se disfraza de nota ([abogados.com.ar](https://abogados.com.ar/publicidad-prohibida-el-caso-de-la-publicidad-encubierta/30231)).

### 3.3 Lo que se vio en los datos de Radar

En el archivo del 16/10 (`web/data/archivo.json`), **4 de 1.195 notas** salen con la firma "Texto de [medio]", es decir,
con el texto que publicó la fuente, sin reescribir (por ejemplo, una de Puntonueve y una de Infórmese Primero sobre
deportistas de Balcarce). Es poco, pero es justo el caso que el art. 28 mira con más cuidado (la "versión original") y
justo con medios de acá. Conviene ver por qué pasa y si esa salida debería existir (rec. 3).

---

## 4. Redes en lo local

### 4.1 Qué usa la gente en la Argentina para informarse

- **Facebook** lo usa para noticias casi 4 de cada 10 personas; **Instagram**, el 35 %; X, el 12 %; **WhatsApp** viene
  bajando como fuente de noticias (2025) ([Reuters Institute, DNR 2025, Argentina](https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025/argentina)).
- **TikTok** pasó de menos del 1 % a 19 % en seis años, y 29 % entre los de 18 a 24 (datos del Digital News Report
  citados por [Mercado](https://mercado.com.ar/ruta-digital/como-tiktok-cambio-la-forma-en-que-nos-informamos)).
- **El video en vivo** (programas de charla por YouTube, tipo Luzu) crece como forma de informarse, sobre todo entre los
  jóvenes ([DNR 2026](https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/argentina)).
- **El 9 % ya usa chatbots de IA para informarse** (2026, +4 puntos en un año), ídem.

No hay datos públicos de redes **por ciudad chica**: para Balcarce, lo único confiable son los números propios de Radar
(pestaña Números del panel).

### 4.2 Facebook: la página

- **Los enlaces casi no se ven.** En el informe de Meta del primer trimestre de 2026, el **98,7 % de lo que se vio en
  Facebook en EE.UU. no tenía enlace** a un sitio externo; la parte con enlace cayó de 9,8 % (2022) a 1,3 %
  ([Social Media Today](https://www.socialmediatoday.com/news/facebook-pages-get-charged-for-link-posts/)).
- **Meta prueba limitar los enlaces.** Desde diciembre de 2025 prueba dejar a algunas páginas en **dos publicaciones con
  enlace por mes** si no pagan Meta Verified; dijo que **los medios no estaban incluidos** ([TechCrunch](https://techcrunch.com/2025/12/17/facebook-is-testing-a-link-posting-limit-for-professional-accounts-and-pages)).
  En 2026 la prueba se amplió (con Meta One) y, según la prensa del sector, los medios siguen exentos pero **los enlaces
  en los comentarios ahora también cuentan** ([Social Media Today](https://www.socialmediatoday.com/news/facebook-pages-get-charged-for-link-posts/);
  [NewscastStudio](https://www.newscaststudio.com/2026/09/30/meta-one-journalism-publishers/)). No está confirmado con Meta
  ni para la Argentina.
- **Qué quiere decir para Radar:** lo que rinde es lo que se ve entero **adentro de Facebook** (foto con el texto, video,
  la placa), con el enlace como complemento; y conviene que la página figure como **medio de noticias** para quedar del
  lado de los exentos (rec. 9).

### 4.3 Facebook: los grupos de la ciudad

- En EE.UU., el **52 % de la gente** se informa de lo local al menos a veces por foros y grupos (grupos de Facebook de la
  ciudad, Nextdoor), y el 73 % por amigos, familia y vecinos: lo de boca en boca sigue primero ([Pew, 2024-2025](https://www.pewresearch.org/journalism/fact-sheet/local-news/);
  [Pew, 2024](https://www.pewresearch.org/short-reads/2024/09/26/friends-family-and-neighbors-are-americans-most-common-source-of-local-news/)).
- Dos trabajos exploratorios de la UNSAM sobre grupos vecinales argentinos encontraron que **funcionan como canal de
  noticias locales, denuncias y eventos**, y que por ahí también circula **información dudosa o falsa sin verificar**
  ([UNSAM, ponencia 76](https://www.aacademica.org/3.congreso.eh.unsam/76.pdf); [ponencia 81](https://www.aacademica.org/3.congreso.eh.unsam/81.pdf)).
- Los grupos son "la plaza del pueblo": clasificados, vigilancia vecinal y emergencias todo junto; sus administradores
  son voluntarios que pasan mucho tiempo arbitrando ([Civic Tech Guide](https://civictech.guide/listing/facebook-groups)).
- **Desde el 22/04/2024 Meta no deja publicar en grupos con un programa** (cerró el acceso de aplicaciones a los grupos):
  sólo a mano ([Ayrshare](https://www.ayrshare.com/blog/facebook-removes-groups-api-access-impact-and-implications/)).
- **Qué quiere decir para Radar:** los grupos de Balcarce son donde ya está la gente, pero **no se los puede inundar** ni
  automatizar. Lo que sirve es pedir permiso al administrador y compartir a mano sólo lo útil (rec. 10).

### 4.4 WhatsApp

- **Canales:** públicos, gratis, de una sola vía (el que sigue sólo reacciona con emojis o vota encuestas). Llegaron a la
  Argentina en septiembre de 2023 y los grandes medios se sumaron enseguida ([La Nación](https://www.lanacion.com.ar/tecnologia/la-nacion-en-los-canales-de-whatsapp-como-recibir-alertas-y-ultimas-noticias-nid20092023/));
  Canal 26 pasó los 165.000 seguidores en 2024 ([Canal 26](https://www.canal26.com/tecnologia/2024/06/27/el-canal-de-whatsapp-de-canal-26-ya-tiene-mas-de-165000-seguidores-sumate-a-nuestra-comunidad)).
  **No hay una forma oficial de publicar en un canal con un programa**: se hace a mano desde el teléfono (guía de
  octubre de 2026 de una empresa del rubro, [Kanal](https://getkanal.com/blog/whatsapp-channels-feature-guide)).
- **El tráfico que manda WhatsApp es chico** comparado con Google y Facebook; lo que da es **lectores fieles**
  ([The New York Times, vía Infobae](https://www.infobae.com/america/the-new-york-times/2024/09/25/los-medios-de-comunicacion-buscan-lectores-a-traves-de-whatsapp/)).
- **Lo que funcionó en lo local:** un resumen diario a hora fija (Pamplonews, 9.100 en seis meses), o grupos chicos que
  arrancan con gente conocida (Correio Sabiá, Brasil) ([LJR](https://latamjournalismreview.org/articles/independent-digital-media-in-latin-america-explore-whatsapp-channels-despite-problems-obtaining-verification-from-the-app/)).
  Un estudio de los canales de dos televisoras españolas encontró que **casi no publican lo local** y desaprovechan lo que
  el canal permite ([Revista de Innovación en Periodismo](https://dspace.umh.es/bitstream/11000/36158/1/Estrategias%20y%20criterios%20de%20noticiabilidad%20de%20los%20medios%20deportivos%20en%20los%20canales%20de%20WhatsApp%20%e2%80%94%20Revista%20de%20Innovaci%c3%b3n%20en%20Periodismo.pdf)):
  justo el hueco que Radar puede llenar.

### 4.5 TikTok e Instagram

- Los medios locales argentinos en TikTok cuentan la noticia en video corto con un título que la explica; algunos usan
  **imágenes que no corresponden a la noticia**, lo que los investigadores marcan como un problema ético
  ([Unidiversidad](https://www.unidiversidad.com.ar/fenomeno-comunicacional-tiktok-cambio-los-modos-de-informar-y-conquistar-nuevos-publicos)).
  Para Radar vale lo mismo que en la web: la placa es mejor que una foto que no es del hecho.
- En las cuentas de municipios bonaerenses, lo que más se ve son **fiestas, recitales, datos curiosos e historia del
  lugar** ([guía de comunicación municipal de la Provincia](https://fs.comunicacionpublica.gba.gob.ar/politicaspublicas/archivos/Comunicacion-Municipios/Manual%20Clase2%20TikTok%20en%20la%20Mira.pdf)):
  coincide con "Un día como hoy" y la agenda.
- Cómo y cuándo publicar en YouTube y TikTok sigue siendo una decisión abierta de los dos (`docs/DECISIONES.md`).

### 4.6 Horarios

Los estudios grandes son de EE.UU. y de marcas, no de medios de pueblo: Sprout Social marca para Facebook **días hábiles
de 9 a 12** y para Instagram **lunes a jueves de 10 a 15** (hora de la costa este); Buffer marca más bien la primera
tarde ([Social Media Today](https://www.socialmediatoday.com/news/best-times-to-post-2025-sprout-social/744014/);
[Hypebot](https://www.hypebot.com/the-best-times-to-post-on-social-media-2025/)). **Sirven de punto de partida, nada
más.** En un pueblo pesan otras cosas: la siesta, la salida de la escuela, el partido del domingo. Radar ya tiene sus
horarios (`panel/horarios.mjs`) y los números para medirlos: lo correcto es mirar los propios.

---

## 5. El espacio comercial

### 5.1 Modelos que funcionan en lugares chicos

| Modelo | Cómo es | Ejemplo | Qué cuidar |
|---|---|---|---|
| **Guía gratis + destacado pago** | Todos los comercios y emprendimientos figuran gratis; el que paga sale primero, con foto o con oferta | Patch (la ficha es gratis; destacarla, paga) | Que "destacado" diga que es pago |
| **Secciones pagas** | Profesionales, inmobiliarias, edictos, campo | La Vanguardia (Balcarce) | Que se vea que es un espacio comercial |
| **Patrocinio de un servicio** | "El clima de hoy, presentado por…", "Farmacia de turno, gracias a…" | Axios (patrocina el boletín entero) | El patrocinador no toca el contenido |
| **Aviso fijo en la web** | Un logo y un texto, quieto | Casi todos | Nada que parpadee ni persiga |
| **Contenido de marca** | Una nota o un video sobre el comercio, pagado y marcado | Extrategia (su principal ingreso) | Etiqueta "Contenido patrocinado" arriba, nunca en Política ni Policiales |
| **Membresía de empresas** | Comercios y entidades que bancan al medio y figuran como "amigos" | VareseNews | Que no compre trato editorial |
| **Sorteos y acciones conjuntas** | Un comercio pone el premio, el medio los seguidores | Somos Malasaña | Las reglas del sorteo, claras |

### 5.2 Cuánto se cobra

**No hay tarifas públicas de medios digitales de pueblos bonaerenses.** Se buscó en tarifarios, en sitios de medios y
en boletines oficiales, y no aparece ninguno. Lo que hay, sólo como referencia y con cuidado:

| Dato | De dónde | Por qué no sirve directo |
|---|---|---|
| Pauta municipal de $2.000 por mes en algunas localidades bonaerenses | [Letra P, 2021](https://www.letrap.com.ar/nota/2021-8-11-12-38-0-la-supervivencia-de-los-medios-locales-bonaerenses) | Es de 2021, antes de años de inflación |
| La Municipalidad de Bahía Blanca le paga a La Nueva unos **$13,6 millones por mes** (agosto y septiembre de 2026) por un paquete de banners y espacio web | [Boletín oficial de Bahía Blanca, SIBOM](https://sibom.slyt.gba.gob.ar/bulletins/15714/contents/2441943) | Es una ciudad de 300.000 habitantes y el diario más grande de la zona |
| Un banner fijo en la portada de un portal nacional del rubro construcción: $1.320.000 por mes ($528.000 rotativo), sin IVA (2025) | [El Constructor](https://elconstructor.com/wp-content/uploads/2025/07/Tarifario-Online-Septiembre-2025.pdf) | Es un portal nacional especializado |
| Destacar una ficha en Patch: US$ 79 por mes por comunidad | [guía externa, 2023](https://www.massagemag.com/?p=141470) | EE.UU., otra economía |

**Conclusión:** `PUBLICIDAD.md` ya dice lo correcto: **preguntar qué paga hoy un comercio de Balcarce en la radio y en
los otros medios y arrancar por debajo**. Agrego dos cosas de los casos: (1) con 53 seguidores en Facebook y pocas
visitas, lo que Radar puede vender al principio es **canje o precio simbólico** a cambio de aprender y tener el primer
nombre en la vidriera; (2) lo que un comercio compra son números reales (visitas, alcance de las piezas), y Radar los
tiene medidos.

### 5.3 Cómo no mezclar publicidad con noticias

Las reglas de `PUBLICIDAD.md` ("Reglas que no se negocian") ya cubren casi todo lo que piden las guías del oficio. Lo
que dicen esas guías, para tenerlo a mano:

- **Señal visual + palabra clara.** La guía de la IAB del Reino Unido (la asociación de la publicidad digital) pide dos
  cosas: que el contenido pagado se vea distinto (diseño, logo) y que diga con todas las letras la relación comercial
  ("contenido pagado", "presentado por") ([The Drum](https://www.thedrum.com/news/2015/02/09/iab-moves-regulate-216m-native-ad-industry-guidelines-aimed-driving-transparency)).
- **Un aviso que parece independiente es engañoso** (asociación de periodistas de radio y TV de EE.UU., [RTDNA](https://www.rtdna.org/guidelines-for-native-advertising)).
- **En la Argentina, la publicidad encubierta está prohibida** (art. 1101 del Código Civil y Comercial, § 3.2).
- **Un vocabulario único**, siempre el mismo, para que el vecino aprenda a leerlo: "Espacio publicitario" (aviso),
  "Destacado" con la aclaración "pago" (guía), "Presentado por" (patrocinio de un servicio) y "Contenido patrocinado
  por [comercio]" (nota pagada).

---

## 6. Qué aplica a Radar Balcarce

### 6.1 Recomendaciones (ordenadas por impacto y esfuerzo; ninguna suma costos)

| # | Qué hacer | Por qué (caso) | Impacto | Esfuerzo | Ya hay algo en Radar | Quién decide |
|---|---|---|---|---|---|---|
| 1 | **Hablar con los medios de Balcarce antes de que haya un reclamo.** Un mensaje o un café de Hernán y Andrés con cada uno (La Vanguardia, El Diario, Radio Gabal, Puntonueve, Infórmese Primero…): qué hace Radar, que los nombra y los enlaza, cuántos lectores les mandó, que se saca lo que pidan, y la pregunta de si quieren algo a cambio | Nota y Good Daily cayeron por vivir de los medios chicos sin hablar con ellos. En una semana La Vanguardia fue la única fuente de 26 notas de Radar y Radio Gabal de 17 (informe 02): **Radar depende de ellos** | Alto | Bajo | El "no venimos a reemplazar a nadie" | Los dos |
| 2 | **Lo de acá y lo útil en el centro; lo nacional, como complemento** | Patch se define como servicio; Axios Local vive de lo propio de cada ciudad; en Radar, lo de Balcarce se lee de 5 a 10 veces más que lo nacional (0,35 a 0,74 visitas por nota nacional contra 2,6 a 4,7 de las de acá, informe 02) | Alto | Bajo | Farmacia, clima, agenda y la nota grande siempre de Balcarce | Los dos |
| 3 | **Nombrar al medio de acá dentro del texto** cuando la noticia es sólo suya ("según informó La Vanguardia"), con el enlace en esa primera mención; y revisar por qué 4 notas salieron con el texto de la fuente | Las guías piden enlazar al que la dio primero; es lo que manda lectores y evita el "copió sin nombrar". El desplegable "Fuentes (N)" cerrado sigue igual | Alto | Bajo a medio (cambia una regla de redacción: medir antes con `reels/comparar-instruccion.mjs`) | El desplegable de fuentes | Los dos |
| 4 | **El bloque "En los medios de Balcarce"** con el título y el enlace de cada medio, sin reescribir (lo que propone el informe 02, rec. 15) | Es devolverles algo visible; Axios y PatchAM enlazan a otros medios en cada edición | Medio | Medio | Propuesto en el informe 02 | Los dos (cambio visible) |
| 5 | **Pedir permiso por las fotos**, por escrito (un WhatsApp alcanza), a los medios de Balcarce y a la Municipalidad; mientras tanto, preferir siempre la oficial o la propia | Fallo de la revista Ñ (julio de 2026): $6 millones por una foto con el autor a la vista; el crédito no alcanza | Alto (baja un riesgo) | Bajo | La regla de fotos del 27/09 | **Hernán** |
| 6 | **Escribir el protocolo de IA en una página propia** ("Cómo usamos la inteligencia artificial"): qué hace la IA, para qué, qué controla el verificador, qué revisa una persona, qué no hace nunca (inventar personas, alterar fotos), y cómo se corrige | ADEPA pide que cada medio tenga el suyo; los lectores quieren saber para qué se usó y si una persona revisó (Trusting News) | Medio | Bajo (es texto: casi todo ya está en "Quiénes somos") | "Quiénes somos" → "Cómo trabajamos" | Los dos |
| 7 | **Que la firma de cada nota enlace a esa explicación** ("Redacción con IA, verificada contra las fuentes · cómo trabajamos") | El aviso concreto, en la nota, cansa menos que uno general | Medio | Bajo | La firma y su desplegable (`explicacionDeFirma`) | Los dos |
| 8 | **Corrección a la vista:** cuando se corrige una nota, una línea al pie con qué cambió y cuándo | La confianza en las noticias está en 26 %; corregir a la vista es lo que más la cuida, y NewsBreak hizo lo contrario | Medio | Bajo | Las correcciones existen (`web/data/correcciones.json`); falta mostrarlas, si no se muestran | Los dos |
| 9 | **Facebook: confirmar que la página figura como medio de noticias** y publicar lo que se ve entero adentro (foto o video con el texto), con el enlace de complemento | El 98,7 % de lo que se ve no tiene enlace; Meta limita enlaces y, por ahora, exime a los medios | Alto | Bajo | Los posteos con foto (desde el 6/10) | Los dos |
| 10 | **Los grupos de Facebook de Balcarce:** elegir 3 a 5, pedirle permiso a cada administrador y compartir **a mano** sólo lo útil (farmacia del domingo, corte de luz o de agua, alerta del clima, agenda del finde), como mucho una vez por día | Son la plaza del pueblo (Pew, UNSAM); no se puede automatizar desde 2024; inundarlos es la forma más rápida de que te echen | Alto | Medio (unos minutos por día de una persona) | — | Los dos |
| 11 | **Un canal de WhatsApp de Radar Balcarce**, gratis: un solo mensaje por día a hora fija con farmacia, clima y tres noticias de acá, pegando un texto que Radar ya arme | Pamplonews: 9.100 seguidores en seis meses con un resumen diario; casi nadie hace lo local por WhatsApp | Medio | Medio (a mano: no hay forma oficial de automatizarlo) | El WhatsApp del medio (2266 51-1612) y la idea "La semana en Balcarce" (`IDEAS.md`) | Los dos |
| 12 | **La primera venta: el patrocinio de lo útil** ("El clima de hoy, presentado por…"), a canje o precio simbólico al principio | Es lo más mirado y no interrumpe la nota; es el modelo de Axios en chico | Medio | Bajo | Idea 2 de `PUBLICIDAD.md` | Los dos |
| 13 | **La guía de emprendimientos: gratis para todos, con "Destacado (pago)" más adelante** | Patch (ficha gratis), La Vanguardia (secciones pagas); una guía sólo de los que pagan no le sirve al vecino | Alto, a futuro | Medio | La base de `comercial/` (145 comercios) | Los dos (cambio visible) |
| 14 | **Las reglas comerciales, públicas en `/publicidad`**: el vocabulario único (§ 5.3), "un aviso no compra una nota", sin patrocinio en Política ni Policiales y, si algún día hay pauta del municipio, decirlo | El art. 1101 prohíbe la publicidad encubierta; los casos de pauta muestran que lo que no se dice después se usa en contra | Medio | Bajo | Las reglas de `PUBLICIDAD.md`; la página `/publicidad` todavía no existe | Los dos |

**Para cuando haya más tiempo (sin costo, baja prioridad):** anotarse en los programas gratuitos de capacitación
cuando abran (Impulso Local, el AI Media Lab de Google News Initiative), sabiendo que quizás no acepten a un medio sin
periodistas; y pensar socios lectores recién cuando haya lectores que pregunten cómo ayudar.

### 6.2 Tres riesgos a evitar

**1. Convertirse en "el que vive del trabajo de los medios de acá".** Es lo que hundió a Nota (cerró sus 11 sitios), lo
que se le criticó a Good Daily y a El Primer Feca, y lo que le reprochan a PatchAM. En Balcarce el riesgo es más grande
que en EE.UU.: los medios son pocos, se conocen todos y **Radar no tiene noticias propias de Balcarce sin ellos**. Las
señales de alarma son tres: un texto que se parece demasiado al original, una foto ajena sin permiso, y una noticia que
sólo dio un medio de acá y no lo nombra en el texto. Se previene con las recomendaciones 1, 3, 4 y 5.

**2. El error automático que lastima a alguien real.** NewsBreak dio mal el horario de un banco de alimentos y la gente
se quedó sin comida; Gannett publicó plantillas vacías; El Primer Feca inventó una entrevista y copió la cara de un
cronista; PatchAM mezcla ciudades con el mismo nombre. En Radar, lo más delicado son **los servicios** (una farmacia de
turno equivocada un domingo a la noche hace más daño que una nota mal titulada) y todo lo que toque a una persona con
nombre y apellido. Ya hay verificador, semáforo y persona que revisa lo sensible; lo que suma este informe es: nunca una
voz, una cara o una cita de alguien real que no esté en la fuente, y la corrección a la vista (rec. 8).

**3. Que la plata mande sobre la nota.** Los medios de pueblo que dependieron de la pauta oficial quedaron atados al que
paga (Calingasta, los medios colombianos del Reuters Institute); y la publicidad que se disfraza de nota es ilegal en la
Argentina y es la forma más rápida de perder la confianza, que hoy está en 26 %. Se previene con las reglas de
`PUBLICIDAD.md`, con el vocabulario único y con no depender de un solo pagador: varios comercios chicos valen más que un
municipio grande (rec. 12 a 14).

---

## 7. Otras fuentes: gacetillas, agencias, boletines oficiales, datos abiertos y alertas

*Agregado a pedido de los dueños el 16/10 ("fuentes tipo mariapress.com"; "no te ates a lo que venimos haciendo").*

Hasta hoy, casi todo lo que publica Radar sale de **otros medios**. Esta sección mira lo que hay **antes** de los medios:
lo que mandan las instituciones (gacetillas), lo que venden las agencias, lo que publica el Estado (boletines y datos) y
los servicios de alertas. Es justo lo que hacen los que salieron bien con la automatización: RADAR trabaja sobre datos
públicos y PatchAM suma posteos de cuentas locales verificadas, como la policía y los bomberos (§ 2.1). Y es la forma de
que Radar tenga cosas **que no le debe a ningún medio de acá**, que es el mejor remedio contra el riesgo 1 de § 6.2.

### 7.1 Qué es mariapress.com

Es una **vitrina de gacetillas** (comunicados de prensa), no un medio ni una agencia de noticias. Funciona desde 2005
desde Buenos Aires y lo desarrolla Sueños Digitales Argentina ([mariapress.com](https://www.mariapress.com/)). Cómo es,
según su propia página ([Acerca de Mariapress](https://www.mariapress.com/que.php)):

- **Pagan los que mandan, no los que leen.** Organismos, agentes de prensa, empresas y ONG pagan un plan para que se
  publique su comunicado; hay planes especiales para organismos de gobierno. **Para periodistas y medios es gratis**, sin
  registro ni usuario.
- **Qué trae:** una agenda diaria de actividades, adelantos, gacetillas y un directorio de agentes de prensa. Se
  actualiza de lunes a viernes. El 16/10/2026 había, por ejemplo, comunicados de Trenes Argentinos, el Gobierno de la
  Ciudad, el Hospital Garrahan, la OPS, el INDEC, ATE y Greenpeace: **casi todo nacional o porteño, nada del sudeste
  bonaerense**.
- **Cómo se recibe:** sólo entrando a la web. **No manda nada por mail ni por WhatsApp y no tiene RSS** (no se encontró
  ninguno). El pie dice "Todos los derechos reservados" y no fija reglas para republicar.

**¿Le sirve a Radar?** Poco, y sólo para lo nacional. Lo importante es **qué es una gacetilla**: la versión de quien la
manda, que en este caso además pagó para que circule. Por eso, si algún día entra, nunca como nota sola: el dato se
verifica, se escribe con palabras propias y se dice "según un comunicado de…". Leerla con un programa obligaría a leer
la página entera (no hay feed); antes de eso, conviene un mail a info@mariapress.com preguntando si se puede.

Del mismo tipo hay otras, todas pensadas para que **pague el que manda**: Comunicae, por ejemplo, distribuye notas de
prensa en castellano a más de 17.000 periodistas e influencers, con planes pagos para empresas
([Merca2](https://www.merca2.es/2025/05/07/comunicae-lanza-una-nueva-funcionalidad-para-convocar-a-periodistas-y-medios-a-eventos-2188724/);
[El Referente](https://elreferente.es/?p=4612)). Para un medio, recibirlas es gratis, pero son casi siempre de empresas
grandes y de la Capital.

### 7.2 La lista: qué hay, qué da, cuánto cuesta y si sirve para Balcarce

"Ya en Radar" sale de `FUENTES.md` del 16/10 (activa, apagada o no está).

**Agencias de noticias**

| Fuente | Qué da | Cómo se lee | Costo | ¿Local o nacional? | Ya en Radar | Fuente del dato |
|---|---|---|---|---|---|---|
| **Télam** | Nada: **dejó de ser agencia de noticias en 2024** y pasó a ser la Agencia de Publicidad del Estado (APE), que hace publicidad oficial (decreto 548/2024) | — | — | — | No | [Unidiversidad](https://www.unidiversidad.com.ar/el-gobierno-oficializo-la-transformacion-de-telam-en-una-agencia-de-publicidad); [Palabras del Derecho](https://www.palabrasdelderecho.com.ar/articulo/5192/Se-oficializo-el-cierre-de-Telam-y-su-reconversion-como-Agencia-de-Publicidad-del-Estado) |
| **Noticias Argentinas (NA)** | Agencia privada nacional desde 1973 (del grupo de Diario Popular); en su sitio, títulos y notas abiertas; a los abonados, el servicio completo con fotos | RSS e índice de noticias públicos | El abono es pago; **no hay tarifa pública** | Nacional | Índice activo, RSS apagado | [La Voz de San Justo](https://www.lavozdesanjusto.com.ar/la-agencia-noticias-argentinas-entro-en-proceso-de-crisis-45524); [Perfil, 2018](https://pressreader.com/argentina/perfil-sabado/20180901/283686890479300) |
| **DIB** (La Plata, desde 1993) | La agencia de los diarios del interior bonaerense: política, economía y sociedad de la Provincia | RSS público; servicio completo para los diarios socios | Abono pago, sin tarifa pública | **Provincial**: lo que pasa en La Plata y afecta a Balcarce | Activa | [ZoomInfo](https://www.zoominfo.com/c/dib/427078279); [Minuto Uno](https://www.minutouno.com/la-plata/diarios-platenses-guerra-n27133) |
| **Agencia Nova** (La Plata) y otras chicas, como la Agencia Jorge Huergo de la Facultad de Periodismo de la UNLP (organizaciones sociales de La Plata) | Notas de la Provincia | No se verificó si tienen RSS | Sin datos | Provincial | No | [Nizkor](https://derechos.org/nizkor/media.html); [Arcuri y otros, UNLP, 2018](https://perio.unlp.edu.ar/ojs/index.php/actas/article/download/5478/4711/21240) |
| **Prensa del Gobierno de la Provincia** | Los anuncios oficiales de la Provincia | RSS (`gba.gob.ar/rss.xml`) | Gratis | Provincial | Apagada | `FUENTES.md` |

**Conclusión:** las agencias de verdad cobran, y lo gratis de ellas (los títulos) Radar ya lo lee. **No vale la pena
pagar una agencia**: el valor de Radar está en lo de acá, que ninguna agencia trae.

**Boletines oficiales**

| Fuente | Qué da | Cómo se lee | Costo | ¿Local o nacional? | Ya en Radar | Fuente del dato |
|---|---|---|---|---|---|---|
| **Boletín Oficial Municipal de Balcarce** (SIBOM, el sistema de boletines municipales de la Provincia) | **Ordenanzas del Concejo, decretos del intendente, resoluciones, licitaciones, convenios y edictos**. Ejemplos: la ordenanza 52/25 que convalida la subasta de cinco lotes municipales | Página web con buscador por municipio, tipo y fecha; **suscripción gratis por mail** a los municipios que uno elija; sin RSS | Gratis | **Balcarce** | No | [SIBOM](https://sibom.slyt.gba.gob.ar/); [un decreto de Balcarce](https://sibom.slyt.gba.gob.ar/bulletins/13653/contents/2295482) |
| **Concejo Deliberante de Balcarce** | Lo que se trata y se aprueba en el Concejo | RSS | Gratis | Balcarce | Activa | `FUENTES.md` |
| **Boletín Oficial de la Provincia** | Leyes, decretos y resoluciones provinciales; el ejemplar del día, gratis en PDF | Web; no se encontró RSS ni API | Gratis | Provincial | No | [proyecto de la Cámara de Diputados bonaerense, 2019](https://intranet.hcdiputados-ba.gov.ar/proyectos/14-15D538012019-02-2710-30-23.pdf) |
| **Boletín Oficial de la Nación** | Unas 1.500 normas por día; el acceso es gratis por ley (decreto 1172/03) | Web; **no tiene API ni RSS oficiales** (los que lo siguen lo leen con programas propios) | Gratis | Nacional | No | [Boletín Oficial](https://www.boletinoficial.gob.ar/pdf/linkQR/c2FWTlNQMm9jU3BycmZ0RFhoUThyQT09); [paquete de terceros](https://socket.dev/npm/package/@ar-agents/boletin-oficial) |

**Cuidado con el SIBOM:** también publica edictos y sentencias del Juzgado de Faltas **con nombre y apellido de
vecinos** (por ejemplo, un decreto de octubre de 2025 que publica la multa a una persona por estacionar en una rampa).
Eso **no se publica nunca** como nota: de ahí se toma sólo lo de interés general (ordenanzas, obras, licitaciones,
compras, convenios, tasas).

**Datos abiertos y servicios (gratis)**

| Fuente | Qué da | Cómo se lee | Costo | ¿Local o nacional? | Ya en Radar | Fuente del dato |
|---|---|---|---|---|---|---|
| **API del Banco Central (BCRA)** | Cotizaciones oficiales de monedas, series monetarias | API pública, **sin clave** (la versión 3 de "principales variables" quedó vieja el 28/02/2026; hoy rige la 4) | Gratis | Nacional | El dólar sale de otra fuente | [BCRA, APIs](https://www.bcra.gob.ar/apis-banco-central/); [BCRA, estadísticas cambiarias](https://www.bcra.gob.ar/noticias/nuevo-impulso-a-la-transparencia-financiera-el-bcra-lanza-la-api-de-estadisticas-cambiarias/) |
| **datos.gob.ar** (API de Series de Tiempo y API Georef) | Indicadores oficiales (inflación, actividad, empleo) y nombres oficiales de municipios y calles | API pública | Gratis | Nacional (algunas series por provincia) | No | [datos.gob.ar, APIs](https://datos.gob.ar/apis) |
| **INDEC** | Las fechas en que salen la inflación y los demás datos (calendario de difusión) | Web | Gratis | Nacional | No | (el INDEC también manda sus informes por gacetilla, como se vio en Mariapress) |
| **Servicio Meteorológico Nacional (SMN)** | Alertas y avisos a muy corto plazo por zona; pronóstico | GeoRSS de avisos; app; algunos datos tienen arancel | Gratis lo básico | **La zona** | Configurada, apagada (el clima sale de Open-Meteo y `api.met.no`) | [disposición del SMN](https://argentina.gob.ar/normativa/361173_disp25_pdf/archivo); `FUENTES.md` |
| **Precios en surtidor** (Secretaría de Energía) | Precio de la nafta y el gasoil por estación de servicio | Conjunto de datos abierto | Gratis | **Por localidad** | No | Ojo: **desde 2025 las estaciones ya no están obligadas a informar**, así que puede faltar Balcarce o estar viejo ([Parabrisas](https://parabrisas.perfil.com/noticias/mercado/donde-consultar-los-precios-de-los-combustibles.phtml)) |
| **Mercado Central de Buenos Aires** | Precios mayoristas de frutas y verduras, **la papa incluida**, con relevamiento diario y promedios mensuales | Boletines en PDF; el CEPA publica un observatorio mensual que los compara con los supermercados | Gratis | **Agro de acá** (Balcarce es la zona papera) | No | [Mercado Central](https://mercadocentral.gob.ar/img/boletin/noticiasdetulado-11-2023.pdf); [CEPA, mayo de 2026](https://centrocepa.com.ar/images/2026/06/2026.06.04%20-%20Observatorio%20Frutas%20y%20Verduras%20-%20CEPA%20-%20mayo%2026.pdf) |
| **INTA Balcarce** (Estación Experimental y su grupo de Agrometeorología) | Informes de campaña, sequías, heladas, ensayos | Repositorio del INTA; las noticias del INTA nacional por RSS | Gratis | **Balcarce** | RSS del INTA nacional activo; la Facultad de Agrarias, activa | [repositorio INTA, EEA Balcarce](https://repositorio.inta.gob.ar/xmlui/handle/20.500.12123/208); [La Capital](https://www.lacapitalmdp.com/existe-una-sequia-superficial-senalan-profesionales-del-inta/) |
| **Vialidad Nacional** | Estado de las rutas nacionales (la 226), dos partes por día y avisos especiales | Web | Gratis | **La zona** | No | [Diario de Cuyo, 2026](https://www.diariodecuyo.com.ar/sanjuan/actualizacion-de-estado-de-rutas-nacionales-tras-la-lluvia-1823407.html) |
| **ANSES** | El calendario mensual de pagos por terminación de DNI (de lo más buscado del país) | Web y Mi ANSES; **no se encontró API** | Gratis | Nacional, pero se usa acá | No | [BAE Negocios](https://www.baenegocios.com/economia/calendario-completo-de-anses-para-enero-cuando-cobran-jubilados-pensionados-auh-y-suaf-20260102-0015.html) |

**Comunicados de clubes, ligas, cooperativas y escuelas**

No se encontró que ninguno tenga sitio con RSS: **viven en Facebook, Instagram y WhatsApp** (no apareció ni el sitio de la
liga de fútbol). Y Radar decidió, con razón, **no leer Instagram ni Facebook con un programa** (`COMERCIAL.md`), que
además va contra las reglas de Meta. Lo que sí se puede es pedirles que **se lo manden a Radar** (idea 1, abajo). Los más
útiles para empezar:

- **La Cooperativa de Electricidad de Balcarce**, que presta el servicio eléctrico (no EDEA): los cortes programados y las
  tarifas ([La Capital](https://www.lacapitalmdp.com/la-provincia-se-interiorizo-sobre-la-crisis-que-atraviesa-la-cooperativa-electrica-de-balcarce/)).
- **Las escuelas y el Consejo Escolar o la Jefatura Distrital**: las suspensiones de clases por alerta las deciden cada
  distrito o municipio, y se comunican tarde y por muchos lados ([Canal 26, 2026](https://www.canal26.com/clima/2026/05/08/alerta-naranja-por-vientos-en-buenos-aires-que-municipios-suspenden-clases-y-donde-pueden-superar-los-90-kmh/)).
- **Los clubes y la liga**: resultados, horarios, convocatorias. Lo que hoy Radar sólo sabe si lo cuenta una radio.
- **Bomberos, Defensa Civil, hospital, ONG** (LALCEC, Cáritas, cooperadoras).

**Servicios de alertas (gratis)**

| Servicio | Qué hace | Ya en Radar | Fuente |
|---|---|---|---|
| **Google Noticias por RSS** (`news.google.com/rss/search?q=…`) | Cualquier búsqueda ("Balcarce", "ruta 226") convertida en un feed | **Sí**: lo usan las Pistas (`ingesta/pistas.mjs`) | [NewsCatcher](https://newscatcherapi.com/blog/google-news-rss-search-parameters-the-missing-documentaiton) |
| **Alertas de Google** con entrega en "feed" | Avisa cuando aparece algo nuevo en la web (no sólo en noticias) con esas palabras | No | [9to5Google](https://9to5google.com/guides/rss-feed/) (verificar que la opción siga) |
| **Suscripción del SIBOM** | Manda por mail cada boletín nuevo de Balcarce | No | [SIBOM](https://sibom.slyt.gba.gob.ar/) |
| **Alertas del SMN** | Alertas por zona | Configurada, apagada | `FUENTES.md` |

### 7.3 Ideas nuevas para Radar (sin costo, de la más fuerte a la más chica)

1. **Una "sala de prensa" de Radar Balcarce.** Una dirección de mail y el WhatsApp del medio para que **clubes,
   escuelas, cooperativas, ONG, la Facultad, el hospital, bomberos y los organizadores de eventos** manden sus
   novedades, con una página corta que explique qué mandar y cómo ("una foto propia, quién la sacó, qué, cuándo y
   dónde"). Es lo que convierte a un agregador en un medio, y es lo único que **no compite con los medios de acá**
   (les llega a ellos también). Reglas: lo que una institución dice de sí misma sale **atribuido** ("según informó el
   club…"), nunca como noticia propia; lo promocional va a la agenda o al espacio comercial; las fotos que mandan con
   permiso resuelven buena parte del problema de las fotos (§ 3.2). Las reglas de cómo tratar lo que manda la gente ya
   están escritas en `panel/buzon.mjs` (el buzón del panel de la PC, hoy en desuso): se pueden reusar. Al principio, a
   mano: una persona pasa lo que llega al panel del celular.
2. **"Lo que firmó el municipio esta semana"**, con el boletín municipal (SIBOM): suscribir el mail del medio, y una vez
   por semana una nota con las ordenanzas, decretos y convenios de interés general, **sin nombres de vecinos**. Es
   información pública, nadie más de acá la cuenta así, y es exactamente el tipo de trabajo que la IA hace bien (resumir
   documentos públicos, como RADAR o la herramienta de Patch para sesiones municipales). Con verificación contra el
   texto, como todo.
3. **"Licitaciones y compras del municipio"**: el SIBOM publica licitaciones. Contarlas sirve dos veces: es transparencia
   y **le sirve a los comercios y emprendedores de Balcarce** que pueden presentarse (un puente natural con el espacio
   comercial, § 5).
4. **La papa con datos**: una nota propia semanal, hecha con plantilla y sin IA como la del dólar, con el precio
   mayorista de la papa en el Mercado Central, el clima de la semana y lo que informe el INTA Balcarce. Es identidad
   pura de Balcarce y no le debe nada a ningún medio.
5. **Fichas de servicio que la gente busca**: el calendario de ANSES del mes, el estado de la ruta 226 cuando hay
   temporal, el día que sale la inflación, el precio de la nafta en Balcarce si el dato existe. Como la farmacia y el
   clima: lo útil es lo que más se lee (§ 6, rec. 2).
6. **Pedirles a las entidades que sumen a Radar a su lista de difusión de WhatsApp** (la del club, la de la
   cooperativa): no cuesta nada, no es leer Facebook con un programa, y es como trabajan las radios de pueblo.
7. **Lo que no conviene:** pagar una agencia (lo gratis ya se lee y lo de acá no lo traen), publicar gacetillas tal cual,
   leer Facebook o Instagram de las entidades con un programa, y sumar Mariapress u otras vitrinas de gacetillas como
   fuente automática.

## Lo que no se encontró

- **Tarifas de medios de pueblos bonaerenses:** no hay ninguna pública. Hay que preguntarlas en Balcarce.
- **Estudios sobre grupos de Facebook y canales de WhatsApp de medios de ciudades chicas argentinas:** sólo hay trabajos
  exploratorios chicos (UNSAM) y datos de medios grandes.
- **Casos documentados de medios digitales de ciudades bonaerenses de 20.000 a 100.000 habitantes con sus números:** no
  aparecieron. El caso más parecido con datos es Plottier Conecta (Neuquén). La mejor fuente para esto es la propia
  Balcarce: lo que ya relevó Radar de La Vanguardia, El Diario y Puntonueve (`docs/historico/INVESTIGACION-COMPETENCIA.md`).
- **Tarifas de las agencias (NA, DIB) y RSS de las agencias provinciales chicas:** no son públicas o no aparecieron.
- **Sitios propios de la liga de fútbol, los clubes y las escuelas de Balcarce:** no apareció ninguno con feed; todo indica
  que comunican por redes y WhatsApp.
- **Si el SMN tiene hoy un feed de alertas en formato abierto (CAP) para la Argentina:** no se confirmó.
- **El informe nuevo de FOPEA (2025):** la cifra de 196 medios perdidos aparece citada por el Reuters Institute, pero no
  se encontró el documento original ([mapa de FOPEA](https://desiertosinformativos.fopea.org)).

## Cómo se hizo

Búsquedas web en modo normal (unas 85, 25 de ellas para § 7) y lectura de las páginas citadas; donde una página no se pudo abrir (Nieman Lab,
NewscastStudio, La Tribuna), el dato sale del resumen de la búsqueda y está dicho así en el texto o en la fuente. Datos
de Radar: `web/data/archivo.json` y `web/data/portada.json` del 16/10 (leídos, no modificados), el informe 02 de esta
auditoría, `PUBLICIDAD.md`, `COMERCIAL.md`, `INVESTIGACION.md`, `docs/DECISIONES.md` y `web/components/metadatos.js`.
