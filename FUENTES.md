# Las fuentes de Radar Balcarce

*Este documento lo escribe `node ingesta/listar-fuentes.mjs` a partir del código. No se edita a mano: una prueba controla que diga lo mismo que `ingesta/fuentes.mjs` y `ingesta/fuentes-cruce.mjs`. Para sumar, sacar o apagar una fuente se toca una de esas dos listas y se vuelve a correr el programa.*

Hoy: **125 feeds activos de 76 medios** (287 configurados).

## Cómo se usan

1. **Cada media hora** se leen todos los feeds activos (GitHub Actions, "Actualizar la web").
2. **De los medios de afuera, lo que el propio medio pone en una sección de otro país, de policiales o de consejos no se trae** (se mira la dirección de la nota: `SECCIONES_QUE_NO_ENTRAN`, en `ingesta/fuentes.mjs`).
3. **El cruce** (`ingesta/cruce.mjs`): se juntan las notas de todos los medios que cuentan el mismo hecho, con una memoria de 36 horas. Un medio cuenta una sola vez aunque llegue por varios feeds (por eso cada medio tiene **un solo nombre**, el de la columna "Medio").
4. **Qué queda:**
   - todo lo de los medios de Balcarce;
   - de afuera, lo que dice Balcarce en el título o toca la zona (la ruta 226, la 55, la papa);
   - de afuera, lo que cuentan 3 medios distintos, o 2 en las áreas chicas (Tecnología e IA, Ciencia, Salud, Educación, Cultura y agenda); los dos números se cambian con las variables de GitHub `MINIMO_NACIONAL` y `MINIMO_AREAS_CHICAS` (`POPULARIDAD`, en `ingesta/criterio.mjs`). Nunca con un solo medio, y sin cupos.
   - Lo que cuentan **sólo** medios de otras ciudades de la zona (Mar del Plata, Tandil, Necochea…) no se trae.
5. **El peso** sirve para ordenar (qué va primero, qué va a las redes), no para decidir si sale. Lo de Balcarce pesa más a propósito.
6. **"Oficial"** es un organismo público (la Municipalidad, el Gobierno de la Provincia): da verificación alta y sale solo si dice Balcarce en el título o toca la zona.
7. **"Sección fija"**: el feed ya viene separado por tema y se le cree (salvo Tecnología, que se confirma con el título).
8. **"Cómo se lee"**: RSS o Atom (la lista de notas del medio), índice de noticias (el que cada sitio arma para Google, trae todo el día) o la página misma cuando el medio no tiene feed.

## De Balcarce (15 feeds activos de 11 medios)

| Medio | Feed | Ciudad | Cómo se lee | Sección fija | Peso | Oficial | Activa | Dirección |
|---|---|---|---|---|---|---|---|---|
| Acción 5 (Balcarce) | Acción 5 | Balcarce | RSS | — | 28 |  | sí | https://accion5.com/feed/ |
| Ahora Balcarce | Ahora Balcarce | Balcarce | RSS | — | 28 |  | sí | http://ahorabalcarce.com.ar/feed/ |
| Concejo Deliberante de Balcarce | Concejo Deliberante de Balcarce | Balcarce | RSS | — | 24 | sí | sí | https://concejodeliberantebalcarce.gob.ar/feed/ |
| Diario La Vanguardia | La Vanguardia | Balcarce | página (se lee el HTML) | — | 28 |  | sí | https://www.diariolavanguardia.com/ |
| El Diario Balcarce | El Diario Balcarce | Balcarce | página (se lee el HTML) | — | 28 |  | sí | https://eldiariobalcarce.com.ar/ |
| Facultad de Ciencias Agrarias (UNMdP) | Facultad de Ciencias Agrarias (UNMdP) | Balcarce | RSS | — | 24 | sí | sí | https://fca.mdp.edu.ar/feed/ |
| Infórmese Primero (FM 104.9) | Infórmese Primero | Balcarce | Atom | — | 30 |  | sí | http://feeds.feedburner.com/informeseprimero |
| Municipalidad de Balcarce | Municipalidad de Balcarce | Balcarce | RSS | — | 24 | sí | sí | https://balcarce.gob.ar/feed/ |
| News Balcarce (FM 91.7) | News Balcarce | Balcarce | RSS | — | 30 |  | sí | https://newsbalcarce.com.ar/?feed=rss2 |
| Puntonueve (FM 100.9) | Puntonueve | Balcarce | RSS | — | 30 |  | sí | https://puntonueve.com.ar/feed |
| Radio Gabal (FM 104.1) | Radio Gabal · Agro | Balcarce | RSS | Agro | 26 |  | sí | https://www.radiogabal.com.ar/index.php/agro?format=feed&type=rss |
| Radio Gabal (FM 104.1) | Radio Gabal · Comunidad | Balcarce | RSS | Balcarce | 28 |  | sí | https://www.radiogabal.com.ar/index.php/comunidad?format=feed&type=rss |
| Radio Gabal (FM 104.1) | Radio Gabal · Deportes | Balcarce | RSS | Deportes | 26 |  | sí | https://www.radiogabal.com.ar/index.php/deportes?format=feed&type=rss |
| Radio Gabal (FM 104.1) | Radio Gabal · Policiales | Balcarce | RSS | Policiales | 28 |  | sí | https://www.radiogabal.com.ar/index.php/policiales?format=feed&type=rss |
| Radio Gabal (FM 104.1) | Radio Gabal · Política | Balcarce | RSS | Política | 28 |  | sí | https://www.radiogabal.com.ar/index.php/politica?format=feed&type=rss |
| Radio Sudestada | Radio Sudestada · general | Balcarce | RSS | — | 26 |  | apagada | https://radiosudestada.com.ar/feed/ |

## De la región (11 feeds activos de 11 medios)

Cuentan como un medio más cuando cuentan lo mismo que los demás; solos, sólo entra lo que dice Balcarce en el título o toca la zona.

| Medio | Feed | Ciudad | Cómo se lee | Sección fija | Peso | Oficial | Activa | Dirección |
|---|---|---|---|---|---|---|---|---|
| 0223 (Mar del Plata) | 0223 | Mar del Plata | RSS | — | 12 |  | sí | https://www.0223.com.ar/rss |
| 0223 (Mar del Plata) | 0223 · deportes | Mar del Plata | RSS | Deportes | 11 |  | apagada | https://www.0223.com.ar/rss/deportes |
| 2261 – Noticias de Lobería | 2261 Lobería | Lobería | RSS | — | 10 |  | apagada | https://www.2261.com.ar/feed/ |
| Argenpapa | Argenpapa | nacional (especializada en papa) | página (se lee el HTML) | Agro | 16 |  | sí | https://www.argenpapa.com.ar/noticias/argentina/ |
| Ayacucho al Día | Ayacucho al Día | Ayacucho | RSS | — | 10 |  | apagada | https://ayacuchoaldia.com.ar/feed/ |
| Ecos Diarios (Necochea) | Ecos Diarios | Necochea | Atom | — | 11 |  | apagada | https://ecosdiariosapiv3.eleco.com.ar/feed-notes |
| Ecos Diarios (Necochea) | Ecos Diarios · índice de noticias | Necochea | índice de noticias | — | 11 |  | apagada | https://elecos.com.ar/sitemap-news.xml |
| El Argentino Digital | El Argentino Digital · general | Miramar (General Alvarado) | RSS | — | 11 |  | apagada | https://www.elargentinodigital.com.ar/feed/ |
| El Diario de Tandil | El Diario de Tandil · índice de noticias | Tandil | índice de noticias | — | 11 |  | sí | https://www.eldiariodetandil.com/sitemap-news.php |
| El Eco de Tandil | El Eco de Tandil | Tandil | Atom | — | 12 |  | apagada | https://articapiv3.eleco.com.ar/feed-notes |
| El Eco de Tandil | El Eco de Tandil · índice de noticias | Tandil | índice de noticias | — | 11 |  | sí | https://www.eleco.com.ar/sitemap-news.xml |
| El Marplatense | El Marplatense · general | Mar del Plata | Atom | — | 11 |  | apagada | https://elmarplatenseapiv3.eleco.com.ar/feed-notes |
| El Marplatense | El Marplatense · índice de noticias | Mar del Plata | índice de noticias | — | 11 |  | sí | https://www.elmarplatense.com/sitemap-news.xml |
| Infobrisas (Radio Brisas) | Infobrisas (Radio Brisas) · ciudad | Mar del Plata | RSS | — | 11 |  | apagada | https://www.infobrisas.com/rss/la-ciudad |
| Infobrisas (Radio Brisas) | Infobrisas (Radio Brisas) · general | Mar del Plata | RSS | — | 11 |  | sí | https://www.infobrisas.com/rss/noticias |
| Infobrisas (Radio Brisas) | Infobrisas (Radio Brisas) · policiales | Mar del Plata | RSS | — | 11 |  | apagada | https://www.infobrisas.com/rss/policiales |
| La Tecla | La Tecla Mar del Plata · índice de noticias | Mar del Plata | índice de noticias | Política | 11 |  | apagada | https://www.lateclamardelplata.com.ar/sitemap_google_news.xml |
| La Verdad de Ayacucho | La Verdad de Ayacucho · general | Ayacucho | RSS | — | 11 |  | apagada | https://laverdadayacucho.com.ar/feed/ |
| LU9 Mar del Plata | LU9 Mar del Plata | Mar del Plata | Atom | — | 12 |  | sí | https://lu9mardelplataapiv3.eleco.com.ar/feed-notes |
| LU9 Mar del Plata | LU9 Mar del Plata · índice de noticias | Mar del Plata | índice de noticias | — | 11 |  | apagada | https://www.lu9mardelplata.com.ar/sitemap-news.xml |
| Mi8 (Canal 8 Mar del Plata) | Mi8 (Canal 8 Mar del Plata) · general | Mar del Plata | RSS | — | 11 |  | apagada | https://mi8.com.ar/feed/gn |
| Mi8 (Canal 8 Mar del Plata) | Mi8 (Canal 8 Mar del Plata) · índice de noticias | Mar del Plata | índice de noticias | — | 11 |  | sí | https://mi8.com.ar/news-sitemap.xml |
| Municipalidad de San Cayetano | Municipalidad de San Cayetano | San Cayetano | RSS | — | 11 | sí | apagada | https://sancayetano.gob.ar/feed/ |
| Municipio de General Alvarado | Municipio de General Alvarado | Miramar | RSS | — | 11 | sí | apagada | https://mga.gov.ar/feed/ |
| Municipios vecinos (General Alvarado, Benito Juárez, San Cayetano) | Municipios vecinos (General Alvarado, Benito Juárez, San Cayetano) · oficial | Miramar, Benito Juárez, San Cayetano | RSS | — | 11 |  | apagada | https://benitojuarez.gov.ar/feed/ |
| NDEN – Noticias de Necochea | NDEN – Noticias de Necochea · general | Necochea | RSS | — | 11 |  | apagada | https://nden.com.ar/rss |
| Noticias y Protagonistas | Noticias y Protagonistas · general | Mar del Plata | RSS | — | 11 |  | apagada | https://noticiasyprotagonistas.com/feed/ |
| Punto Noticias | Punto Noticias · índice de noticias | Mar del Plata | índice de noticias | — | 11 |  | sí | https://puntonoticias.com/news-sitemap.xml |
| Qué Digital | Qué Digital · general | Mar del Plata | RSS | — | 11 |  | sí | https://quedigital.com.ar/feed/ |
| QZ Noticias (Mar del Plata) | QZ Noticias | Mar del Plata | Atom | — | 12 |  | apagada | https://qznoticiasapiv3.eleco.com.ar/feed-notes |
| QZ Noticias (Mar del Plata) | QZ Noticias (Mar del Plata) · índice de noticias | Mar del Plata | índice de noticias | — | 11 |  | sí | https://www.qznoticias.com/sitemap-news.xml |
| Radio 10 Mar del Plata (FM 105.5) | Radio 10 Mar del Plata (FM 105.5) · general | Mar del Plata | RSS | — | 11 |  | apagada | https://radio10mardelplata.com.ar/feed/ |
| Sendero Regional | Sendero Regional | varias ciudades del sudeste | RSS | — | 10 |  | apagada | https://senderomultimedios.com.ar/feed |
| Sendero Regional | Sendero Regional · general | Necochea, Lobería, San Cayetano, Balcarce y Tandil | RSS | — | 11 |  | apagada | https://www.senderomultimedios.com.ar/feed/ |

## De la provincia (12 feeds activos de 12 medios)

| Medio | Feed | Ciudad | Cómo se lee | Sección fija | Peso | Oficial | Activa | Dirección |
|---|---|---|---|---|---|---|---|---|
| 0221 | 0221 · general (últimas) | La Plata | RSS | — | 10 |  | apagada | https://www.0221.com.ar/rss/pages/ultimas-noticias.xml |
| 0221 | 0221 · índice de noticias | La Plata | índice de noticias | — | 10 |  | sí | https://www.0221.com.ar/sitemap-news.xml |
| 0221 | 0221 · la-plata | La Plata | RSS | — | 10 |  | apagada | https://www.0221.com.ar/rss/pages/la-plata.xml |
| Agencia DIB | Agencia DIB | La Plata | RSS | — | 12 |  | sí | https://dib.com.ar/rss/pages/home.xml |
| ANDigital | ANDigital · general | La Plata | RSS | — | 10 |  | apagada | https://andigital.com.ar/sitemap.xml |
| Diario Conurbano | Diario Conurbano · general | Conurbano | RSS | — | 10 |  | apagada | https://www.diarioconurbano.com.ar/rss |
| Diputados Bonaerenses | Diputados Bonaerenses | La Plata | RSS | — | 11 |  | apagada | https://diputadosbsas.com.ar/feed/ |
| El Día | El Día · general (últimas) | La Plata | RSS | — | 10 |  | apagada | https://www.eldia.com/.rss |
| El Día | El Día · índice de noticias | La Plata | índice de noticias | — | 10 |  | sí | https://www.eldia.com/news_1.xml |
| El Norte | El Norte · general | San Nicolás | RSS | — | 10 |  | apagada | https://diarioelnorte.com.ar/feed/ |
| Gobierno de la Provincia de Buenos Aires | Gobierno de la Provincia | La Plata | RSS | — | 14 | sí | apagada | https://www.gba.gob.ar/rss.xml |
| Infoeme | Infoeme · general | Olavarría | RSS | — | 10 |  | apagada | https://infoeme.com/feed |
| InfoGEI | InfoGEI · general | La Plata | RSS | — | 10 |  | apagada | https://www.infogei.com.ar/rss |
| InfoRegión | InfoRegión · general | Lomas de Zamora (conurbano sur) | RSS | — | 10 |  | apagada | https://www.inforegion.com.ar/feed/ |
| La Brújula 24 | La Brújula 24 · general | Bahía Blanca | RSS | — | 10 |  | sí | https://www.labrujula24.com/rss |
| La Capital (Rosario) | La Capital (Rosario) · índice de noticias | Rosario | índice de noticias | — | 10 |  | sí | https://www.lacapital.com.ar/sitemap-news.xml |
| La Gaceta (Tucumán) | La Gaceta (Tucumán) · general | Tucumán | RSS | — | 10 |  | sí | https://www.lagaceta.com.ar/rss |
| La Noticia 1 | La Noticia 1 | provincia de Buenos Aires | Atom | — | 11 |  | apagada | https://lanoticia1apiv3.eleco.com.ar/feed-notes |
| La Nueva | La Nueva · categoría 1 (por lo visto, la ciudad) | Bahía Blanca | RSS | — | 10 |  | apagada | https://www.lanueva.com/news/rss/category/1 |
| La Nueva | La Nueva · deportes | Bahía Blanca | RSS | Deportes | 10 |  | apagada | https://www.lanueva.com/news/rss/category/7 |
| La Nueva | La Nueva · general (últimas) | Bahía Blanca | RSS | — | 10 |  | sí | https://www.lanueva.com/news/rss/index |
| La Nueva | La Nueva · índice de noticias | Bahía Blanca | índice de noticias | — | 10 |  | apagada | https://www.lanueva.com/sitemap_last.xml |
| La Opinión | La Opinión · general | Pergamino | RSS | — | 10 |  | apagada | https://laopinionline.ar/feed.xml |
| La Tecla | La Tecla · índice de noticias | La Plata | índice de noticias | — | 10 |  | sí | https://www.latecla.info/sitemap_google_news.xml |
| La Verdad | La Verdad · general | Junín | RSS | — | 10 |  | sí | https://www.laverdadonline.com/feed |
| La Voz del Pueblo | La Voz del Pueblo · general | Tres Arroyos | RSS | — | 10 |  | apagada | https://lavozdelpuebloapiv3.eleco.com.ar/feed-notes |
| La Voz del Pueblo | La Voz del Pueblo · índice de noticias | Tres Arroyos | índice de noticias | — | 10 |  | apagada | https://www.lavozdelpueblo.com.ar/sitemap-news.xml |
| Letra P | Letra P · general | CABA / La Plata (política) | RSS | — | 10 |  | sí | https://www.letrap.com.ar/rss/pages/home.xml |
| Los Andes (Mendoza) | Los Andes (Mendoza) · índice de noticias | Mendoza | índice de noticias | — | 10 |  | sí | https://www.losandes.com.ar/sitemap-news.xml |
| Realpolitik | Realpolitik · general | La Plata | RSS | — | 10 |  | apagada | https://www.realpolitik.com.ar/rss |
| Universidad Nacional de La Plata | Universidad Nacional de La Plata | La Plata | RSS | Educación | 12 |  | sí | https://unlp.edu.ar/feed/ |
| Zona Norte Diario | Zona Norte Diario · general | San Isidro / zona norte | RSS | — | 10 |  | apagada | https://www.zonanortediario.com.ar/feed/ |

## Nacionales (87 feeds activos de 42 medios)

| Medio | Feed | Ciudad | Cómo se lee | Sección fija | Peso | Oficial | Activa | Dirección |
|---|---|---|---|---|---|---|---|---|
| A24 | A24 · general | CABA | RSS | — | 8 |  | sí | https://www.a24.com/rss/pages/home.xml |
| A24 | A24 · politica | CABA | RSS | Política | 8 |  | sí | https://www.a24.com/rss/pages/politica.xml |
| A24 | A24 · previsional | CABA | RSS | Economía | 8 |  | apagada | https://www.a24.com/rss/pages/Previsional.xml |
| A24 | A24 · sociedad | CABA | RSS | — | 8 |  | apagada | https://www.a24.com/rss/pages/actualidad.xml |
| Agencia CyTA | Agencia CyTA | nacional | RSS | Tecnología | 12 |  | apagada | https://www.agenciacyta.org.ar/feed/ |
| Agroempresario | Agroempresario · índice de noticias | CABA | índice de noticias | Agro | 8 |  | sí | https://agroempresario.com/news-sitemap.xml/ |
| Agrositio | Agrositio · destacadas | CABA | RSS | Agro | 8 |  | sí | https://www.agrositio.com.ar/rss/rss.php?area=destacadas |
| Agrositio | Agrositio · granos | CABA | RSS | Agro | 8 |  | apagada | https://www.agrositio.com.ar/rss/rss.php?area=granos |
| Agrositio | Agrositio · hacienda | CABA | RSS | Agro | 8 |  | sí | https://www.agrositio.com.ar/rss/rss.php?area=hacienda |
| Ámbito | Ámbito | nacional | RSS | — | 15 |  | apagada | https://www.ambito.com/rss/pages/ultimas-noticias.xml |
| Ámbito | Ámbito · deportes | CABA | RSS | Deportes | 8 |  | apagada | https://www.ambito.com/rss/pages/deportes.xml |
| Ámbito | Ámbito · Economía | nacional | RSS | Economía | 14 |  | apagada | https://www.ambito.com/rss/pages/economia.xml |
| Ámbito | Ámbito · Espectáculos | nacional | RSS | Cultura y agenda | 12 |  | sí | https://www.ambito.com/rss/pages/espectaculos.xml |
| Ámbito | Ámbito · general | CABA | RSS | — | 8 |  | apagada | https://www.ambito.com/rss/pages/home.xml |
| Ámbito | Ámbito · índice de noticias | CABA | índice de noticias | — | 8 |  | sí | https://www.ambito.com/sitemap-news.xml |
| Ámbito | Ámbito · politica | CABA | RSS | Política | 8 |  | apagada | https://www.ambito.com/rss/pages/politica.xml |
| Ámbito | Ámbito · Tecnología | nacional | RSS | Tecnología | 13 |  | sí | https://www.ambito.com/rss/pages/tecnologia.xml |
| ANMAT | ANMAT | CABA | RSS | Salud | 12 |  | apagada | https://www.argentina.gob.ar/anmat/noticias/rss |
| Autoblog Argentina | Autoblog Argentina · autos | CABA | RSS | Automovilismo | 8 |  | apagada | https://www.autoblog.com.ar/feed/ |
| Básquet Plus | Básquet Plus · básquet | CABA | RSS | Deportes | 8 |  | apagada | https://basquetplus.com/rss.xml |
| Bichos de Campo | Bichos de Campo | nacional | RSS | Agro | 12 |  | apagada | https://bichosdecampo.com/feed/ |
| Bolavip Argentina | Bolavip Argentina · general | CABA | RSS | Fútbol | 8 |  | apagada | https://bolavip.com/ar/rss/feed |
| Bolavip Argentina | Bolavip Argentina · índice de noticias | CABA | índice de noticias | Fútbol | 8 |  | sí | https://bolavip.com/ar/sitemaps/news |
| C5N | C5N · deportes | CABA | RSS | Deportes | 8 |  | apagada | https://www.c5n.com/rss/pages/deportes.xml |
| C5N | C5N · economia | CABA | RSS | Economía | 8 |  | apagada | https://www.c5n.com/rss/pages/economia.xml |
| C5N | C5N · general | CABA | RSS | — | 8 |  | apagada | https://www.c5n.com/rss/pages/ultimas-noticias.xml |
| C5N | C5N · índice de noticias | CABA | índice de noticias | — | 8 |  | sí | https://www.c5n.com/sitemap-news.xml |
| C5N | C5N · politica | CABA | RSS | Política | 8 |  | apagada | https://www.c5n.com/rss/pages/politica.xml |
| C5N | C5N · sociedad | CABA | RSS | — | 8 |  | apagada | https://www.c5n.com/rss/pages/sociedad.xml |
| C5N | C5N · tecnología | CABA | RSS | Tecnología | 8 |  | apagada | https://www.c5n.com/rss/pages/tecnologia.xml |
| CADA (Confederación Argentina de Atletismo) | CADA (Confederación Argentina de Atletismo) · atletismo | CABA | RSS | Deportes | 8 |  | apagada | https://cada-atletismo.org/feed/ |
| Campeones | Campeones | nacional | RSS | Automovilismo | 12 |  | sí | https://www.campeones.com.ar/feed/ |
| Canal 26 | Canal 26 · deportes | CABA | RSS | Deportes | 8 |  | apagada | https://www.canal26.com/arc/outboundfeeds/rss/category/deportes/?outputType=xml |
| Canal 26 | Canal 26 · economia | CABA | RSS | Economía | 8 |  | apagada | https://www.canal26.com/arc/outboundfeeds/rss/category/economia/?outputType=xml |
| Canal 26 | Canal 26 · general | CABA | RSS | — | 8 |  | sí | https://www.canal26.com/arc/outboundfeeds/rss/?outputType=xml |
| Canal 26 | Canal 26 · índice de noticias | CABA | índice de noticias | — | 8 |  | apagada | https://www.canal26.com/arc/outboundfeeds/sitemap-news/latest/?outputType=xml |
| Canal 26 | Canal 26 · politica | CABA | RSS | Política | 8 |  | apagada | https://www.canal26.com/arc/outboundfeeds/rss/category/politica/?outputType=xml |
| Clarín | Clarín · cultura | CABA | RSS | Cultura y agenda | 8 |  | sí | https://www.clarin.com/rss/cultura/ |
| Clarín | Clarín · Deportes | nacional | RSS | Deportes | 7 |  | sí | https://www.clarin.com/rss/deportes/ |
| Clarín | Clarín · Economía | nacional | RSS | Economía | 14 |  | sí | https://www.clarin.com/rss/economia/ |
| Clarín | Clarín · espectáculos | CABA | RSS | Cultura y agenda | 12 |  | sí | https://www.clarin.com/rss/espectaculos/ |
| Clarín | Clarín · Lo último | nacional | RSS | — | 8 |  | sí | https://www.clarin.com/rss/lo-ultimo/ |
| Clarín | Clarín · Política | nacional | RSS | Política | 13 |  | sí | https://www.clarin.com/rss/politica/ |
| Clarín | Clarín · Rural | nacional | RSS | Agro | 12 |  | sí | https://www.clarin.com/rss/rural/ |
| Clarín | Clarín · sociedad | CABA | RSS | — | 8 |  | sí | https://www.clarin.com/rss/sociedad/ |
| Clarín | Clarín · Tecnología | nacional | RSS | Tecnología | 14 |  | sí | https://www.clarin.com/rss/tecnologia/ |
| CONAE | CONAE | CABA | RSS | Ciencia | 12 |  | apagada | https://www.argentina.gob.ar/ciencia/conae/noticias/rss |
| Córdoba Competición | Córdoba Competición | CABA | RSS | Automovilismo | 8 |  | sí | https://cordobacompeticion.com/feed/ |
| Crónica | Crónica · general | CABA | RSS | — | 8 |  | sí | https://www.cronica.com.ar/files/rss/ultimas-noticias.xml |
| Diario Popular | Diario Popular · deportes | CABA | RSS | Deportes | 8 |  | apagada | https://www.diariopopular.com.ar/rss/pages/deportes.xml |
| Diario Popular | Diario Popular · general | CABA | RSS | — | 8 |  | apagada | https://www.diariopopular.com.ar/rss/pages/home.xml |
| Diario Popular | Diario Popular · índice de noticias | CABA | índice de noticias | — | 8 |  | sí | https://www.diariopopular.com.ar/sitemap-news.xml |
| Diario Popular | Diario Popular · politica | CABA | RSS | Política | 8 |  | apagada | https://www.diariopopular.com.ar/rss/pages/politica.xml |
| Diario Popular | Diario Popular · sociedad | CABA | RSS | — | 8 |  | apagada | https://www.diariopopular.com.ar/rss/pages/general.xml |
| Doble Amarilla | Doble Amarilla · general | CABA | RSS | Fútbol | 8 |  | apagada | https://www.dobleamarilla.com.ar/rss |
| Doble Amarilla | Doble Amarilla · índice de noticias | CABA | índice de noticias | Fútbol | 8 |  | sí | https://www.dobleamarilla.com.ar/sitemap-news.xml |
| El Cronista | El Cronista · economia | CABA | RSS | Economía | 8 |  | apagada | https://www.cronista.com/arc/outboundfeeds/rss/category/economia-politica/?outputType=xml |
| El Cronista | El Cronista · economia 2 | CABA | RSS | Economía | 8 |  | apagada | https://www.cronista.com/arc/outboundfeeds/rss/category/finanzas-mercados/?outputType=xml |
| El Cronista | El Cronista · general | CABA | RSS | — | 8 |  | apagada | https://www.cronista.com/arc/outboundfeeds/rss/?outputType=xml |
| El Cronista | El Cronista · general 2 | CABA | RSS | — | 8 |  | apagada | https://www.cronista.com/arc/outboundfeeds/google-news-feed/ |
| El Cronista | El Cronista · general 2 3 | CABA | RSS | — | 8 |  | apagada | https://www.cronista.com/files/rss/news.xml |
| El Cronista | El Cronista · índice de noticias | CABA | índice de noticias | — | 8 |  | sí | https://www.cronista.com/arc/outboundfeeds/sitemap-news/latest/?outputType=xml |
| El Destape | El Destape · deportes | CABA | RSS | Deportes | 8 |  | apagada | https://www.eldestapeweb.com/adjuntos/177/rss/deportes.xml |
| El Destape | El Destape · economia | CABA | RSS | Economía | 8 |  | apagada | https://www.eldestapeweb.com/adjuntos/177/rss/economia.xml |
| El Destape | El Destape · general | CABA | RSS | — | 8 |  | apagada | https://www.eldestapeweb.com/adjuntos/177/rss/home.xml |
| El Destape | El Destape · índice de noticias | CABA | índice de noticias | — | 8 |  | sí | https://www.eldestapeweb.com/sitemap-news.xml |
| El Destape | El Destape · politica | CABA | RSS | Política | 8 |  | apagada | https://www.eldestapeweb.com/adjuntos/177/rss/politica.xml |
| El Destape | El Destape · sociedad | CABA | RSS | — | 8 |  | apagada | https://www.eldestapeweb.com/adjuntos/177/rss/sociedad.xml |
| El Destape | El Destape · tecnología | CABA | RSS | Tecnología | 8 |  | apagada | https://www.eldestapeweb.com/adjuntos/177/rss/tecnologia.xml |
| El Economista | El Economista | CABA | RSS | Economía | 8 |  | sí | https://eleconomista.com.ar/feed/ |
| El Gráfico | El Gráfico | CABA | RSS | Deportes | 8 |  | sí | https://www.elgrafico.com.ar/rss |
| El País | El País · Ciencia | Madrid | RSS | Ciencia | 12 |  | apagada | https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/ciencia/portada |
| El País | El País · Tecnología | Madrid | RSS | Tecnología | 12 |  | apagada | https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/tecnologia/portada |
| elDiarioAR | elDiarioAR · general | CABA | RSS | — | 8 |  | sí | https://www.eldiarioar.com/rss/ |
| ESA | ESA · ciencia espacial | CABA | RSS | Tecnología | 8 |  | apagada | https://www.esa.int/rssfeed/Our_Activities/Space_Science |
| ESPN Argentina | ESPN Argentina · Fórmula 1 | CABA | RSS | Automovilismo | 8 |  | apagada | https://www.espn.com.ar/espn/rss/f1/news |
| ESPN Argentina | ESPN Argentina · general | CABA | RSS | Deportes | 8 |  | apagada | https://www.espn.com.ar/espn/rss/news |
| ESPN Argentina | ESPN Argentina · rugby | CABA | RSS | Deportes | 8 |  | apagada | https://www.espn.com.ar/espn/rss/rugby/news |
| FayerWayer | FayerWayer | nacional | RSS | Tecnología | 11 |  | sí | https://www.fayerwayer.com/feed |
| Google | Google · blog en castellano | CABA | RSS | Tecnología | 8 |  | apagada | https://blog.google/intl/es-419/rss/ |
| Google DeepMind | Google DeepMind | CABA | RSS | Tecnología | 8 |  | apagada | https://deepmind.google/blog/rss.xml |
| Hipertextual | Hipertextual | nacional | RSS | Tecnología | 11 |  | apagada | https://hipertextual.com/feed |
| INCAA | INCAA | CABA | RSS | Cultura y agenda | 8 | sí | apagada | https://www.incaa.gob.ar/feed/ |
| Infobae | Infobae | nacional | RSS | — | 8 |  | sí | https://www.infobae.com/arc/outboundfeeds/rss/?outputType=xml |
| Infobae | Infobae · Cultura | nacional | RSS | Cultura y agenda | 13 |  | sí | https://www.infobae.com/arc/outboundfeeds/rss/category/cultura/?outputType=xml |
| Infobae | Infobae · deportes | CABA | RSS | Deportes | 8 |  | sí | https://www.infobae.com/arc/outboundfeeds/rss/category/deportes/?outputType=xml |
| Infobae | Infobae · Economía | nacional | RSS | Economía | 14 |  | sí | https://www.infobae.com/arc/outboundfeeds/rss/category/economia/?outputType=xml |
| Infobae | Infobae · Educación | nacional | RSS | Educación | 12 |  | sí | https://www.infobae.com/arc/outboundfeeds/rss/category/educacion/?outputType=xml |
| Infobae | Infobae · Política | nacional | RSS | Política | 13 |  | sí | https://www.infobae.com/arc/outboundfeeds/rss/category/politica/?outputType=xml |
| Infobae | Infobae · Salud | nacional | RSS | Salud | 12 |  | sí | https://www.infobae.com/arc/outboundfeeds/rss/category/salud/?outputType=xml |
| Infobae | Infobae · sociedad | CABA | RSS | — | 8 |  | sí | https://www.infobae.com/arc/outboundfeeds/rss/category/sociedad/?outputType=xml |
| Infobae | Infobae · Tecnología | nacional | RSS | Tecnología | 14 |  | sí | https://www.infobae.com/arc/outboundfeeds/rss/category/tecno/?outputType=xml |
| Infobae | Infobae · Teleshow | nacional | RSS | Cultura y agenda | 12 |  | apagada | https://www.infobae.com/arc/outboundfeeds/rss/category/teleshow/?outputType=xml |
| Infocampo | Infocampo | nacional | RSS | Agro | 12 |  | sí | https://www.infocampo.com.ar/feed/ |
| INTA | INTA · Noticias | nacional | RSS | Agro | 12 |  | sí | https://www.argentina.gob.ar/inta/noticias/rss |
| INTI | INTI | CABA | RSS | Ciencia | 12 |  | apagada | https://www.argentina.gob.ar/inti/noticias/rss |
| iProfesional | iProfesional · economia | CABA | RSS | Economía | 8 |  | apagada | https://www.iprofesional.com/rss/economia |
| iProfesional | iProfesional · economia 2 | CABA | RSS | Economía | 8 |  | apagada | https://www.iprofesional.com/rss/finanzas |
| iProfesional | iProfesional · economia 2 3 | CABA | RSS | Economía | 8 |  | apagada | https://www.iprofesional.com/rss/negocios |
| iProfesional | iProfesional · general | CABA | RSS | — | 8 |  | sí | https://www.iprofesional.com/rss/home |
| iProfesional | iProfesional · impuestos | CABA | RSS | Economía | 8 |  | apagada | https://www.iprofesional.com/rss/impuestos |
| iProfesional | iProfesional · salud | CABA | RSS | Salud | 12 |  | sí | https://www.iprofesional.com/rss/salud |
| iProfesional | iProfesional Tecnología · tecnología | CABA | RSS | Tecnología | 8 |  | sí | https://www.iprofesional.com/rss/tecnologia |
| iProUP | iProUP · finanzas | CABA | RSS | Economía | 8 |  | apagada | https://www.iproup.com/rss/finanzas |
| iProUP | iProUP · general | CABA | RSS | Tecnología | 8 |  | apagada | https://www.iproup.com/rss/home |
| iProUP | iProUP · índice de noticias | CABA | índice de noticias | Tecnología | 8 |  | sí | https://www.iproup.com/sitemap-news.xml |
| IT Sitio | IT Sitio | CABA | RSS | Tecnología | 11 |  | sí | https://www.itsitio.com/ar/feed/ |
| La Capital (Rosario) | La Capital (Rosario) · Ovación | CABA | RSS | Deportes | 8 |  | apagada | https://www.lacapital.com.ar/rss/pages/ovacion.xml |
| La Nación | La Nación | nacional | RSS | — | 8 |  | sí | https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml |
| La Nación | La Nación · automovilismo | CABA | RSS | Deportes | 8 |  | apagada | https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/deportes/automovilismo/ |
| La Nación | La Nación · campo | CABA | RSS | Agro | 8 |  | apagada | https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/campo/ |
| La Nación | La Nación · ciencia | CABA | RSS | Ciencia | 8 |  | sí | https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/ciencia/ |
| La Nación | La Nación · Cultura | nacional | RSS | Cultura y agenda | 13 |  | sí | https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/cultura/ |
| La Nación | La Nación · Deportes | nacional | RSS | — | 16 |  | sí | https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/deportes/ |
| La Nación | La Nación · Economía | nacional | RSS | Economía | 15 |  | sí | https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/ |
| La Nación | La Nación · fútbol | CABA | RSS | Fútbol | 8 |  | apagada | https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/deportes/futbol/ |
| La Nación | La Nación · Política | nacional | RSS | Política | 13 |  | sí | https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/politica/ |
| La Nación | La Nación · rugby | CABA | RSS | Deportes | 8 |  | apagada | https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/deportes/rugby/ |
| La Nación | La Nación · salud | CABA | RSS | Salud | 12 |  | sí | https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/salud/ |
| La Nación | La Nación · sociedad | CABA | RSS | — | 8 |  | sí | https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/sociedad/ |
| La Nación | La Nación · Tecnología | nacional | RSS | Tecnología | 14 |  | sí | https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/tecnologia/ |
| La Nación | La Nación · tenis | CABA | RSS | Deportes | 8 |  | apagada | https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/deportes/tenis/ |
| La Página Millonaria | La Página Millonaria · índice de noticias | CABA | índice de noticias | Fútbol | 8 |  | apagada | https://lapaginamillonaria.com/sitemaps/news |
| La Página Millonaria | La Página Millonaria · river | CABA | RSS | Fútbol | 8 |  | apagada | https://lapaginamillonaria.com/rss/feed |
| Microsoft | Microsoft · noticias | CABA | RSS | Tecnología | 8 |  | apagada | https://news.microsoft.com/source/feed/ |
| Ministerio de Capital Humano | Ministerio de Capital Humano | CABA | RSS | — | 8 |  | apagada | https://www.argentina.gob.ar/capital-humano/noticias/rss |
| Ministerio de Salud de la Nación | Ministerio de Salud de la Nación | CABA | RSS | — | 8 |  | sí | https://www.argentina.gob.ar/salud/noticias/rss |
| Minuto Uno | Minuto Uno | nacional | RSS | — | 13 |  | apagada | https://www.minutouno.com/rss/pages/home.xml |
| Minuto Uno | Minuto Uno · deportes | CABA | RSS | Deportes | 8 |  | apagada | https://www.minutouno.com/rss/pages/deportes.xml |
| Minuto Uno | Minuto Uno · economia | CABA | RSS | Economía | 8 |  | apagada | https://www.minutouno.com/rss/pages/economia.xml |
| Minuto Uno | Minuto Uno · Espectáculos | nacional | RSS | Cultura y agenda | 12 |  | apagada | https://www.minutouno.com/rss/pages/espectaculos.xml |
| Minuto Uno | Minuto Uno · índice de noticias | CABA | índice de noticias | — | 8 |  | sí | https://www.minutouno.com/sitemap-news.xml |
| Minuto Uno | Minuto Uno · politica | CABA | RSS | Política | 8 |  | apagada | https://www.minutouno.com/rss/pages/politica.xml |
| Minuto Uno | Minuto Uno · sociedad | CABA | RSS | — | 8 |  | apagada | https://www.minutouno.com/rss/pages/sociedad.xml |
| Motor1 Argentina | Motor1 Argentina · autos | CABA | RSS | Automovilismo | 8 |  | apagada | https://ar.motor1.com/rss/articles/all/ |
| Motorsport | Motorsport · Fórmula 1 | nacional | RSS | — | 15 |  | sí | https://es.motorsport.com/rss/f1/news/ |
| Motorsport | Motorsport · MotoGP | nacional | RSS | — | 14 |  | sí | https://es.motorsport.com/rss/motogp/news/ |
| Mundo Ascenso | Mundo Ascenso | CABA | RSS | Fútbol | 8 |  | apagada | https://www.mundoascenso.com.ar/rss.xml |
| Muy Interesante | Muy Interesante | Madrid | RSS | Ciencia | 11 |  | apagada | https://www.muyinteresante.com/feed |
| NASA | NASA · ciencia | CABA | RSS | Tecnología | 8 |  | apagada | https://science.nasa.gov/feed/ |
| Noticias Agropecuarias | Noticias Agropecuarias | CABA | RSS | Agro | 8 |  | sí | https://www.noticiasagropecuarias.com/feed/ |
| Noticias Argentinas (NA) | Noticias Argentinas (NA) · general | CABA | RSS | — | 8 |  | apagada | https://noticiasargentinas.com/rss.xml |
| Noticias Argentinas (NA) | Noticias Argentinas (NA) · índice de noticias | CABA | índice de noticias | — | 8 |  | sí | https://noticiasargentinas.com/sitemap-news.xml |
| Nvidia | Nvidia · blog | CABA | RSS | Tecnología | 8 |  | apagada | https://blogs.nvidia.com/feed/ |
| Olé | Olé | nacional | RSS | Fútbol | 8 |  | apagada | https://www.ole.com.ar/rss/ultimas-noticias/ |
| Olé | Olé · automovilismo | CABA | RSS | Automovilismo | 8 |  | apagada | https://www.ole.com.ar/rss/autos/ |
| Olé | Olé · básquet | CABA | RSS | Deportes | 8 |  | apagada | https://www.ole.com.ar/rss/basquet/ |
| Olé | Olé · boca | CABA | RSS | Fútbol | 8 |  | apagada | https://www.ole.com.ar/rss/boca-juniors/ |
| Olé | Olé · copa argentina | CABA | RSS | Fútbol | 8 |  | apagada | https://www.ole.com.ar/rss/copa-argentina/ |
| Olé | Olé · deportes | CABA | RSS | Deportes | 8 |  | apagada | https://www.ole.com.ar/rss/futbol-primera/ |
| Olé | Olé · deportes 2 | CABA | RSS | Deportes | 8 |  | apagada | https://www.ole.com.ar/rss/seleccion/ |
| Olé | Olé · deportes 2 3 | CABA | RSS | Deportes | 8 |  | apagada | https://www.ole.com.ar/rss/futbol-ascenso/ |
| Olé | Olé · deportes 2 3 4 | CABA | RSS | Deportes | 8 |  | apagada | https://www.ole.com.ar/rss/futbol-internacional/ |
| Olé | Olé · índice de noticias | CABA | índice de noticias | — | 8 |  | sí | https://www.ole.com.ar/sitemaps/sitemap_google_news.xml |
| Olé | Olé · polideportivo | CABA | RSS | Deportes | 8 |  | apagada | https://www.ole.com.ar/rss/poli/ |
| Olé | Olé · primera nacional | CABA | RSS | Fútbol | 8 |  | apagada | https://www.ole.com.ar/rss/futbol-ascenso/b-nacional/ |
| Olé | Olé · tenis | CABA | RSS | Deportes | 8 |  | apagada | https://www.ole.com.ar/rss/tenis/ |
| OpenAI | OpenAI | CABA | RSS | Tecnología | 8 |  | apagada | https://openai.com/news/rss.xml |
| Página/12 | Página/12 · cultura | CABA | RSS | Cultura y agenda | 12 |  | sí | https://www.pagina12.com.ar/arc/outboundfeeds/rss/secciones/cultura-y-espectaculos/notas |
| Página/12 | Página/12 · deportes | CABA | RSS | Deportes | 8 |  | apagada | https://www.pagina12.com.ar/arc/outboundfeeds/rss/secciones/deportes/notas |
| Página/12 | Página/12 · economia | CABA | RSS | Economía | 8 |  | sí | https://www.pagina12.com.ar/arc/outboundfeeds/rss/secciones/economia/notas |
| Página/12 | Página/12 · general | CABA | RSS | — | 8 |  | apagada | https://www.pagina12.com.ar/arc/outboundfeeds/rss/portada |
| Página/12 | Página/12 · politica | CABA | RSS | Política | 8 |  | sí | https://www.pagina12.com.ar/arc/outboundfeeds/rss/secciones/el-pais/notas |
| Página/12 | Página/12 · sociedad | CABA | RSS | — | 8 |  | sí | https://www.pagina12.com.ar/arc/outboundfeeds/rss/secciones/sociedad/notas |
| Perfil | Perfil · Ciencia | nacional | RSS | Ciencia | 12 |  | sí | https://www.perfil.com/feed/ciencia |
| Perfil | Perfil · cultura | CABA | RSS | Cultura y agenda | 8 |  | sí | https://www.perfil.com/feed/cultura |
| Perfil | Perfil · deportes | CABA | RSS | Deportes | 8 |  | sí | https://www.perfil.com/feed/deportes |
| Perfil | Perfil · Economía | nacional | RSS | Economía | 13 |  | sí | https://www.perfil.com/feed/economia |
| Perfil | Perfil · Educación | nacional | RSS | Educación | 12 |  | sí | https://www.perfil.com/feed/educacion |
| Perfil | Perfil · general | CABA | RSS | — | 8 |  | sí | https://www.perfil.com/feed |
| Perfil | Perfil · politica | CABA | RSS | Política | 8 |  | sí | https://www.perfil.com/feed/politica |
| Perfil | Perfil · Salud | nacional | RSS | Salud | 12 |  | sí | https://www.perfil.com/feed/salud |
| Perfil | Perfil · sociedad | CABA | RSS | — | 8 |  | sí | https://www.perfil.com/feed/sociedad |
| Perfil | Perfil · tecnología | CABA | RSS | Tecnología | 8 |  | sí | https://www.perfil.com/feed/tecnologia |
| Pick and Roll | Pick and Roll · básquet | CABA | RSS | Deportes | 8 |  | apagada | https://www.pickandroll.com.ar/feed/ |
| Radio Mitre | Radio Mitre · deportes | CABA | RSS | Deportes | 8 |  | sí | https://radiomitre.cienradios.com/arc/outboundfeeds/rss/category/deportes/?outputType=xml |
| Radio Mitre | Radio Mitre · general | CABA | RSS | — | 8 |  | sí | https://radiomitre.cienradios.com/arc/outboundfeeds/rss/?outputType=xml |
| Radio Mitre | Radio Mitre · índice de noticias | CABA | índice de noticias | — | 8 |  | apagada | https://radiomitre.cienradios.com/arc/outboundfeeds/news-sitemap/?outputType=xml |
| Radio Mitre | Radio Mitre · politica | CABA | RSS | Política | 8 |  | apagada | https://radiomitre.cienradios.com/arc/outboundfeeds/rss/category/politica/?outputType=xml |
| Radio Mitre | Radio Mitre · sociedad | CABA | RSS | — | 8 |  | sí | https://radiomitre.cienradios.com/arc/outboundfeeds/rss/category/sociedad/?outputType=xml |
| Secretaría de Innovación, Ciencia y Tecnología | Secretaría de Innovación, Ciencia y Tecnología | CABA | RSS | Ciencia | 12 |  | apagada | https://www.argentina.gob.ar/jefatura/innovacion-ciencia-y-tecnologia/noticias/rss |
| SENASA | SENASA | CABA | RSS | Agro | 12 |  | sí | https://www.argentina.gob.ar/senasa/noticias/rss |
| Servicio Meteorológico Nacional (avisos) | Servicio Meteorológico Nacional (avisos) · avisos a muy corto plazo | CABA | RSS | — | 8 |  | apagada | https://ssl.smn.gob.ar/feeds/avisocorto_GeoRSS.xml |
| Solo Ascenso | Solo Ascenso · índice de noticias | CABA | índice de noticias | Fútbol | 8 |  | apagada | https://soloascenso.com.ar/sitemap-news.xml |
| Solotc | Solotc · turismo carretera | CABA | RSS | Automovilismo | 8 |  | sí | https://www.solotc.com.ar/feed/ |
| Teatro Colón | Teatro Colón | CABA | RSS | Cultura y agenda | 8 |  | apagada | https://teatrocolon.org.ar/feed/ |
| TN (Todo Noticias) | TN (Todo Noticias) · deportes | CABA | RSS | Deportes | 8 |  | apagada | https://tn.com.ar/arc/outboundfeeds/rss/category/deportes/?outputType=xml |
| TN (Todo Noticias) | TN (Todo Noticias) · economia | CABA | RSS | Economía | 8 |  | apagada | https://tn.com.ar/arc/outboundfeeds/rss/category/economia/?outputType=xml |
| TN (Todo Noticias) | TN (Todo Noticias) · general | CABA | RSS | — | 8 |  | apagada | https://tn.com.ar/rss.xml |
| TN (Todo Noticias) | TN (Todo Noticias) · índice de noticias | CABA | índice de noticias | — | 8 |  | sí | https://tn.com.ar/arc/outboundfeeds/news-sitemap/?outputType=xml |
| TN (Todo Noticias) | TN (Todo Noticias) · politica | CABA | RSS | Política | 8 |  | apagada | https://tn.com.ar/arc/outboundfeeds/rss/category/politica/?outputType=xml |
| TN (Todo Noticias) | TN (Todo Noticias) · sociedad | CABA | RSS | — | 8 |  | apagada | https://tn.com.ar/arc/outboundfeeds/rss/category/sociedad/?outputType=xml |
| TN (Todo Noticias) | TN Campo · campo | CABA | RSS | Agro | 8 |  | apagada | https://tn.com.ar/arc/outboundfeeds/rss/category/campo/?outputType=xml |
| TN (Todo Noticias) | TN Clima · clima | CABA | RSS | — | 8 |  | apagada | https://tn.com.ar/arc/outboundfeeds/rss/category/clima/?outputType=xml |
| TN (Todo Noticias) | TN Tecno · tecnología | CABA | RSS | Tecnología | 8 |  | apagada | https://tn.com.ar/arc/outboundfeeds/rss/category/tecno/?outputType=xml |
| TNT Sports | TNT Sports | CABA | RSS | Deportes | 8 |  | apagada | https://tntsports.com.ar/rss/feed.xml |
| Todo Agro | Todo Agro | CABA | RSS | Agro | 8 |  | apagada | https://www.todoagro.com.ar/feed/ |
| TyC Sports | TyC Sports · índice de noticias | CABA | índice de noticias | — | 8 |  | sí | https://www.tycsports.com/sitemap_news_48hs.xml |
| UAR (Unión Argentina de Rugby) | UAR (Unión Argentina de Rugby) · rugby | CABA | RSS | Deportes | 8 |  | apagada | https://uar.com.ar/feed/ |
| UNICEN | UNICEN | Tandil | RSS | Educación | 12 |  | sí | https://www.unicen.edu.ar/noticias/feed/ |
| Universidad Nacional de Cuyo | Universidad Nacional de Cuyo | Mendoza | RSS | Educación | 12 |  | sí | https://www.uncuyo.edu.ar/prensa/rss |
| Universidad Nacional de Rosario | Universidad Nacional de Rosario | Rosario | RSS | Educación | 12 |  | sí | https://unr.edu.ar/feed/ |
| Vavel Argentina | Vavel Argentina · general | CABA | RSS | Fútbol | 8 |  | apagada | https://www.vavel.com/ar/feed/index.rss2 |
| Vavel Argentina | Vavel Argentina · índice de noticias | CABA | índice de noticias | Fútbol | 8 |  | apagada | https://www.vavel.com/ar/sitemap/news.xml |
| Xataka | Xataka | nacional | RSS | Tecnología | 11 |  | apagada | https://www.xataka.com/feedburner.xml |
