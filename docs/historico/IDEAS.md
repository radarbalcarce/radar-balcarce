# Ideas para que el medio tenga alcance de verdad

*Actualizado el 15/10/2026 (se sumaron al final las "Ideas del 8/10").* Ideas para
discutir, no tareas: ninguna está decidida. Cada cosa vive en un solo lugar: lo que
ya se decidió hacer y lo que falta del sistema está en `PENDIENTES.md`; lo que se
decidió y por qué, en `docs/DECISIONES.md`; lo que ya se hizo, en `docs/historico/HISTORIA.md`;
cómo ganar plata, en `PUBLICIDAD.md`; la base de comercios y la guía, en
`COMERCIAL.md`.

## La tabla, de la más viable a la menos

"Viable" quiere decir tres cosas a la vez: poco trabajo, no depende de que un
tercero conteste y no necesita audiencia previa. **Valor** es cuánto suma en
lectores, confianza o plata. El orden se armó el 28/09 a pedido de Hernán y se
repasó el 29/09: es para discutirlo juntos, no una decisión.

| # | Área | Idea | Qué es y por qué | Valor | Esfuerzo |
|---|---|---|---|---|---|
| 1 | Audiencia | **La farmacia de turno por WhatsApp** | Un mensaje automático contesta qué farmacia está de turno. Detalle abajo | Alto | Bajo-medio |
| 2 | Audiencia | **Una lista de WhatsApp para conseguir información** | Vecinos que mandan datos, fotos o avisos: la fuente que ningún medio de acá tiene. Detalle abajo | Alto | Bajo |
| 3 | Contenido | **"Un día como hoy" a las 12:30** | Hechos de la fecha, un balcarceño si coincide y el día especial: reel, historia y nota. Detalle abajo | Alto | Bajo-medio |
| 4 | Contenido | **El clima de Balcarce un día como hoy** | "Un 29 de septiembre, en 2019, hizo 24,9°: la máxima más alta para esta fecha desde 1950". Detalle abajo | Medio | Bajo |
| 5 | Contenido | **El cielo de hoy** | La luna, el sol y las lluvias de meteoros del mes. Detalle abajo | Medio | Bajo |
| 6 | Sistema | **Aviso cuando una fuente deja de traer notas** | El vigilante avisa "tal medio no trae nada hace 12 horas". El 25/09 El Diario Balcarce le contestó 403 a GitHub: si pasara siempre, nadie se enteraría | Medio | Bajo |
| 7 | Sistema | **Ser buen vecino con los medios** | Guardar el texto de cada nota ya leída (no volver a pedirla en cada corrida) y espaciar los pedidos al mismo sitio: menos riesgo de que nos bloqueen | Medio | Bajo |
| 8 | Sistema | **Estadísticas en el panel** | La evolución de visitas y seguidores (`web/data/estadisticas.json`, que ya se guarda) sin esperar el WhatsApp; el panel del celular la puede leer de GitHub | Bajo | Bajo |
| 9 | Web / SEO | **Alta en Google Noticias** (Publisher Center) | Un trámite manual: ya están "Quiénes somos", "Contacto", el sitemap de noticias y las notas con cuerpo | Alto | Bajo |
| 10 | Contenido | **"En qué quedó"** | Cargar 3 o 4 promesas concretas del municipio ("asfaltar tal calle") (el buzón del panel de la PC, que tenía el tipo `seguimiento` sin ninguna entrada, se retiró el 17/10: habría que cargarlas en otro lado) y publicar una nota corta cada vez que se revisan, cada 4 a 6 semanas. Lo que un medio grande no sostiene | Alto | Bajo |
| 11 | Sistema | **Unir a mano dos notas desde el celular** | Desde el 29/09 la misma noticia que vuelve a entrar con otro enlace se une sola (queda una y la otra redirige con 301: `web/lib/repetidas.js`, `web/data/fusionadas.json`), pero la regla es estricta (80 % de palabras en común, menos de 4 días). Un botón "Unir con…" en el panel del celular cubriría las que se escapan, con el mismo mecanismo | Medio | Bajo-medio |
| 12 | Web / SEO | **Teléfonos y emergencias** | Hacer de `/util` la página de emergencias: las guardias del día juntas arriba (cooperativa, farmacia de turno, hospital), botones grandes para llamar y un título que Google encuentre. Es de lo más buscado en un pueblo | Alto | Bajo |
| 13 | Web / SEO | **Compartir mejor desde el celular** | El botón nativo de compartir, el enlace sin `?fbclid`, un "Copiado" que se anuncie y un botón fijo de WhatsApp al pie de la nota (auditoría del 29/09: casi todos comparten desde el celular) | Medio | Bajo |
| 14 | Audiencia | **Un RSS por sección** | `/seccion/balcarce/feed.xml`, para canales de WhatsApp y lectores de noticias. El feed general ya existe | Bajo | Bajo |
| 15 | Contenido | **La semana en Balcarce y las fechas patrias** | Contenido fijo que llena la portada aunque no pase nada: el resumen del domingo (las 5 más leídas y las 3 cosas que vienen; también sirve para el resumen de `PUBLICIDAD.md`, escalón 7), los feriados con el ángulo local (actos, farmacias, transporte) y los días que mueven el pueblo (del Agricultor, del Niño, del Estudiante y la Primavera, de la Tradición) | Medio | Bajo-medio |
| 16 | Contenido | **Precios del campo** | Hacienda, granos y dólar agro, de fuentes públicas (Bolsa de Cereales, Mercado Agroganadero, BCRA): una tarjeta diaria, muy útil en una zona agrícola | Medio | Bajo-medio |
| 17 | Contenido | **"Lo que abre y lo que cierra"** | Un posteo semanal con los comercios que abrieron y cerraron. Se comparte solo en los grupos del pueblo y es la puerta a vender publicidad: el que recién abre quiere que lo conozcan | Alto | Bajo-medio |
| 18 | Audiencia | **Invitar a participar** | Hernán, 29/09: historias (y reels) que inviten a mandar **noticias**, **reclamos** o **notas para escribir**, "capaz que más dividido": una pieza por tema, rotando en la semana, con el WhatsApp del medio (2266 51-1612). Propuesta de textos y días en `PENDIENTES.md` (espera el visto bueno: son piezas públicas). Alguien tiene que mirar los mensajes todos los días y pasar lo que sirve al buzón. Más adelante, un formulario en la web (pide pensar el spam, la firma y qué se publica) | Alto | Bajo-medio |
| 18b | Contenido | **Descuentos de tarjetas y billeteras** | Hernán, 29/09: una sección con los descuentos del día (Cuenta DNI, MODO, Mercado Pago, bancos), como la del dólar. Se está investigando de dónde sacar los datos de forma automática y sin riesgo legal | Alto | Medio |
| 18c | Contenido | **Aprender de finanzas personales** | Hernán, 29/09: notas para aprender (plazo fijo, dólar MEP, acciones, bonos, jubilación, créditos). Una nota de un solo medio no pasa el cruce de Economía (pide 2): hace falta una regla propia para lo educativo. Se está investigando con qué fuentes **Investigado el 30/09**: la base más limpia es argentina.gob.ar (CNV, ANSES, Economía, Defensa del Consumidor), con licencia Creative Commons que permite reutilizar citando; el BCRA prohíbe usar sus textos con fines comerciales sin permiso (sí sus datos, con palabras propias). No hay un feed educativo oficial: se trata como biblioteca para escribir guías fijas que se revisan cada tanto. Nunca consejo personalizado ni recomendar productos. Hay 20 temas ordenados y un aviso legal propuesto; para empezar, guías de estafas, tarjeta, plazo fijo y monotributo, con revisión humana. | Medio | Medio |
| 19 | Contenido | **Balcarce en números** | Un dato del INDEC o del municipio por semana, con un gráfico simple | Medio | Bajo-medio |
| 20 | Web | **Buscar en todo el archivo** | Hoy el buscador busca sólo en las notas de las últimas 36 horas y cada página trae su índice adentro (unos 27 KB repetidos en 583 páginas). Un `buscador.json` que se baje al abrir la lupa busca en los 180 días | Medio | Medio |
| 21 | Web / SEO | **Correcciones y política editorial, públicas** | `/correcciones` (qué se corrigió, cuándo y por qué) y una página con cómo trabajamos, sacada de `CRITERIO-EDITORIAL.md` y enlazada desde cada nota. Da confianza y la miran Google Noticias y AdSense | Alto | Medio |
| 22 | Web / SEO | **Guías que quedan** | "Cómo sacar…" y "Qué hacer si…": trámites, tasas, turnos, horarios. Se escriben una vez, se revisan cada tanto y traen visitas todos los meses; son el mejor lugar para un aviso | Alto | Medio |
| 23 | Web | **Guardar el audio del podcast para escucharlo en la web** | Guardar el audio de cada repaso (no el video) en `web/public/audio/` y poner un reproductor en su nota (`web/lib/notas-propias.js`). **Suma unos 1,2 MB por día al repositorio** (unos 440 MB por año) y el audio tiene que llegar antes de compilar: los reels los arma `redes.yml` y la web, `actualizar.yml`. A decidir (`PENDIENTES.md`) | Medio | Medio |
| 24 | Web / SEO | **Prender las páginas de "Temas"** | `MOSTRAR_TEMAS` (`web/lib/sitio.js`) cuando cada tema tenga suficientes notas, para enlazar notas entre sí. Las páginas existen y están en el sitemap, pero nada las enlaza (sacarlas o prenderlas se decide en `PENDIENTES.md`) | Medio | Medio |
| 25 | Negocio | **Clasificados** | Compra-venta, changas y alquileres: un aviso que paga el propio vecino, no un espacio por mes. Para empezar, por WhatsApp y una página, cobrado a mano (`PUBLICIDAD.md`, escalón 6) | Medio | Medio |
| 26 | Contenido | **Lo que pasó en el Concejo** | Resumir en cinco líneas las actas que nadie lee (PDF, lenguaje administrativo; fuente primaria: el Boletín Oficial Municipal). No pide estar ahí, pide paciencia, y da autoridad | Alto | Medio |
| 27 | Contenido | **Cortes programados** | Agua, luz y tránsito, del municipio y las cooperativas (las alertas del clima ya salen) | Medio | Medio |
| 28 | Contenido | **Automovilismo como marca propia** | Una nota semanal sobre pilotos balcarceños en cualquier categoría: un nicho que nadie cubre, con público asegurado por Fangio | Medio | Medio |
| 29 | Voz | **Un nombre para cada locutor** | Ponerles nombre a la locutora y al locutor para que se sientan cercanos, no "la voz de Gemini". Las dos voces en una misma pieza se probaron y se descartaron (abajo) | Bajo | Bajo |
| 30 | Contenido | **Resumen del fútbol, lunes, nota propia** | Hernán, 29/09: cada lunes, una nota propia con los resultados de la Primera y de las copas que se jueguen. **Sólo en la web, sin pieza en las redes** (Hernán, 30/09: el fútbol no tenía redes salvo que entre alguna noticia, y entra por los repasos como cualquier nota). Antes de aplicarlo hay que analizar de dónde salen los resultados (fuente verificada, no de memoria) y cómo se verifica una nota de puros números **Investigado el 30/09**: la mejor fuente gratis con API es TheSportsDB (Liga Profesional, tabla y resultados, 30 pedidos por minuto; sin términos comerciales claros: conviene escribirles o pagar su plan de 9 dólares), controlada contra ESPN (sin licencia, sólo para comparar). Nota armada sin IA con una plantilla; si un resultado no coincide entre las dos fuentes, el partido no entra. Cuidado con Apertura y Clausura, que repiten el número de fecha. La Liga Balcarceña no se automatiza (su sitio está parado en julio; la cuentan News Balcarce y Radio Gabal). | Alto | Medio |
| 31 | Contenido | **Cultura y Tecnología con identidad** | Hernán, 29/09: más resúmenes propios, hablar de la IA en positivo y cubrir los anuncios grandes (Anthropic, OpenAI, Tesla, SpaceX) y lo de interés general. Ya hay fuentes verificadas (informe del 29/09: El Destape, C5N, MDZ, Perfil tecnología; Perfil, Clarín cultura) **Investigado el 30/09**: para tecnología andan hoy los feeds oficiales de Google (también en castellano), DeepMind, OpenAI, Microsoft, Nvidia, Meta, NASA y ESA; Anthropic no tiene RSS (se lee su página de novedades); Tesla, SpaceX y xAI no tienen fuente usable. Ciencia argentina: UNSAM, UNLP, Exactas UBA y CyTA andan; CONICET sólo tiene HTML. Para cultura: INCAA, Cultura Nación y Teatro Colón andan; la identidad sería lo oficial, lo regional y lo útil para salir, sin farándula. Propuesta: resumen semanal de IA los viernes (atribuido, con cruce de fuentes y un límite o cuidado) y agenda cultural de la región los jueves. | Alto | Medio |
| 32 | Video | **Reels animados que explican** | Hernán, 29/09: animaciones de ciencia, tecnología y economía doméstica. Hoy los videos son placas con voz; esto pide un diseño propio de escenas. Para el mes que viene, con los reels e historias nuevas | Medio | Alto |
| 33 | Contenido | **Un día como hoy y las fechas patrias** | Investigación del 29/09 en `docs/historico/`: fuentes que andan (Wikipedia, Wikidata, feriados) y una lista curada de 16 fechas patrias con datos y citas. Se arma una semana antes para revisar y aprobar **Investigado el 30/09** (ampliado): además de lo ya visto, el Portal Argentina de Wikipedia trae 1.554 efemérides argentinas para los 366 días (343 con al menos una sin violencia) y los "días especiales" de Wikipedia cubren 322 días; ambos con licencia CC BY-SA (palabras propias y cita). argentina.gob.ar (Cultura, INTA) es CC BY 4.0. Doce estilos posibles (histórico, nacimientos, ciencia, cultura, deporte, tecnología, gastronomía, campo, Fangio, Balcarce, astronomía, feriados) y una semana tipo con un estilo por día. Otros medios repiten un molde (lista larga o "tres cosas y una fecha"): nadie mezcla estilos con calendario fijo. Hay unas 30 fechas ya verificadas (feriados, patrias, Balcarce, Fangio) para armar meses antes. Recomendación: un archivo de fichas con estado de revisión, primero nota web e historia sin voz con hora fija, y un reel con voz por semana para las fechas fuertes; los datos de Wikipedia se toman como pista y cada fecha o número se confirma con una segunda fuente. | Alto | Medio |
| 34 | Contenido | **Descuentos de todos los bancos y billeteras** | Hernán, 29/09: no sólo Cuenta DNI: MODO, Galicia, Nación, Santander y el resto. Cuenta DNI tiene datos públicos y los de Balcarce; los demás casi no publican datos leíbles: hay que buscar una fuente que junte muchos **Investigado el 30/09**: no hay un agregador oficial con datos abiertos; lo más parecido es MODO (junta más de diez bancos, una página por promo, sitemap de 27.000 direcciones con muchas vencidas, y hay que renderizar la página para leer topes). Cuenta DNI y Nación se leen en HTML. Galicia, Santander, BBVA y Mercado Pago no tienen camino directo confiable. La competencia (PromoArg y notas sueltas de medios) también lo hace por scraping y sin garantías. Ninguna fuente da licencia escrita: conviene escribirles. Recomendación: empezar por una franja "Hoy en Balcarce" con Cuenta DNI y Nación, cada promo con porcentaje, tope, día, vigencia y enlace oficial (si falta un dato, no sale); MODO después, y a las redes sólo tras semanas sin errores. | Alto | Alto |
| 30 | Contenido | **Cine, libro y música de la semana** | Siempre el mismo día. Cine argentino (datos de TMDB o Wikidata), aniversarios de autores. De un autor muerto hace menos de 70 años no se copian fragmentos: se recomienda y, como mucho, una cita corta. Cuando haya criterio sobre el tono | Bajo | Medio |
| 31 | Contenido | **"El vecino que…"** | Una persona o un comercio del pueblo por semana, con una foto que mandan ellos. Alimenta la guía comercial | Medio | Medio |
| 32 | Sistema | **Panel de salud del sistema** | Ver de un vistazo si algo se cayó sin abrir tres workflows (el vigilante ya avisa casi todo por WhatsApp) | Bajo | Medio |
| 33 | Sistema | **Vista previa del reloj** | Ver antes lo que las redes van a publicar en las próximas horas | Bajo | Medio |
| 34 | Negocio | **La guía comercial y el mapa** | El catálogo de venta: un mapa con fichas gratis y mejoras pagas. Lo caro no es el código: es cargar y mantener los datos (`COMERCIAL.md`, "La guía y el mapa") | Alto | Alto |
| 35 | Contenido | **Material gratis de gente local** | Músicos, fotógrafos o realizadores de Balcarce (o bancos libres) que cedan material a cambio de crédito, para el banco de fotos y las redes. Depende de convencerlos de a uno | Medio | Alto |
| 36 | Web | **La accesibilidad a fondo** | Lo que quedó de la revisión del 25/09. Lo concreto ya anotado (botones chicos, "saltar al contenido") está en `PENDIENTES.md` (A6 y A12) | Medio | Medio-alto |
| 37 | Sistema | **Analítica propia sin cookies** | Más completa que la de Cloudflare, pero es construir un sistema nuevo | Bajo | Alto |
| 38 | Sistema | **Probar los workflows en la PC** (`act`) | Ver un workflow de GitHub Actions sin subirlo. Ahorra tiempo; nadie de afuera lo nota | Bajo | Medio |
| 39 | Contenido | **Una historieta con un personaje propio** | Como los diarios de antes: alguien de acá reconocible sin ser nadie en particular (nunca una persona real), con humor de lo que pasó en la semana; de las tiras clásicas se toma el estilo, nunca sus chistes ni sus dibujos. Una por semana (web, posteo e historia), cuando haya lectores | Medio | Alto |
| 40 | Audiencia | **Radio online o YouTube 24/7** | Una señal que no se corta, con los podcasts, el clima, la farmacia y la agenda. Pide un servidor aparte (Icecast o AzuraCast; para YouTube, una máquina transmitiendo), música libre o pagada (SADAIC, AADI-CAPIF) y decir que la voz es generada. Una radio de verdad puede pedir autorización de ENACOM (`INVESTIGACION.md` § 4). Después del lanzamiento, cuando haya avisos que la paguen | Medio | Alto |
| 41 | Contenido | **Páginas permanentes escritas y verificadas por una persona** (de una auditoría externa, 1/10) | Autódromo, Fiesta del Postre, Hospital, Liga y INTA como páginas que no envejecen: lo que posiciona en Google a largo plazo y no depende de la noticia del día. Con datos verificados, nunca rellenados ni inventados (no se alarga una nota de 130 palabras a 800). Se podrían armar sobre las páginas `/tema/`, que hoy están en el sitemap sin que nada las enlace (`PENDIENTES.md` 25) | Medio | Medio |
| 42 | Contenido | **Efemérides y datos de color automáticos, con fuentes propias** (1/10, Hernán; se investigaron las fuentes que sugirieron tres IA y se descartó lo que no andaba) | Una propuesta diaria armada sola (principal + tres), con series propias de ciencia, tecnología y cultura. **Lo que sirve:** Wikidata (anda sin clave, datos libres: argentinos nacidos o fallecidos por fecha y fama, unos 35 nacidos en Balcarce, foto libre); ECyT-ar (unas 120 efemérides científicas argentinas, con licencia no comercial: se reescribe con palabras propias y se cita); y lo local: el municipio tiene unas 8 fechas, el Museo Fangio 2 o 3, el INTA unas 5, y **"Balcarce histórica" de Diario La Vanguardia**, una serie de notas con fechas y personajes que sería la mina más rica (sin RSS: habría que leer las páginas; sólo los hechos, con palabras propias y citando al diario, que lo pide). Dato clave: Wikidata tiene casi nada de instituciones de la zona (6 con fecha de fundación), así que lo local se carga a mano. **Se descartó:** Museo Histórico Nacional, Biblioteca Nacional, AGN y CONICET (sin fechas ni feed), Smithsonian (bloquea) y NASA (sin feed por fecha; las fotos de APOD tienen derechos de terceros). Cada fecha, con una segunda fuente (La Vanguardia y el INTA discrepan a veces, por ejemplo 1923 contra 1924). Idea más grande: repasar dos o tres años de "Balcarce histórica" para sacar fechas y personajes y reescribirlos nosotros; es semi-manual y conviene hacerlo en tandas | Alto | Medio |
| 43 | Contenido | **Listado propio de gente famosa, con sus fechas verificadas** (1/10, Hernán) | Una lista curada de personajes argentinos y del mundo (nacimientos y muertes, con su fecha comprobada en dos fuentes) para que entren solos a las efemérides de este año y el próximo, sin depender de que aparezcan en Wikipedia ese día. Se puede armar con Wikidata (nacidos y fallecidos por fecha, ordenados por fama, ya probado) y completar a mano con lo de Balcarce y la zona. Resuelve de paso la marca "puede estar vivo", que hoy se equivoca con famosos que murieron hace años (Pinti, Accavallo, Maradona) | Alto | Medio |
| 44 | Contenido | **Guía interactiva "Qué hacer en Balcarce", con mapa** (2/10, Hernán) | Un mapa propio de Balcarce (OpenStreetMap + Leaflet, estático, sin servidor) con lo turístico y lo que hay para hacer: Autódromo y Museo Fangio, parques, la laguna, la Fiesta del Postre, gastronomía, alojamiento, comercios. Dinámico por fecha: una capa "esta semana" que se arma sola con la agenda (`web/data/agenda.json`) y un recorrido sugerido por día. Es el lugar natural para lo comercial (comercios y alojamientos que pagan por destacarse, con la etiqueta "publicidad" que pide `PUBLICIDAD.md`). Para que no envejezca: pedirle los datos a quien corresponde (la Dirección de Turismo, el Museo, el Autódromo, la Cámara de Comercio) y que ellos nos avisen de los eventos (ver 45) | Alto | Alto |
| 45 | Audiencia | **Pedir información oficial a quienes la tienen, de a una persona por área** (2/10, Hernán) | Armar una lista corta de contactos (turismo, cultura, deportes, Autódromo, Museo, Cámara de Comercio, clubes) y pedirles que nos manden eventos y novedades; si alguien dice "fulano es el encargado de turismo", se lo anota y se le pide la agenda de la semana. Las piezas de participá ya invitan a eso (`participa-evento`); falta el trato persona a persona. Combina con la lista de WhatsApp de la idea 2 | Bajo | Alto |
| 46 | Contenido | **Notas propias que se arman solas con datos abiertos** (2/10, Hernán: "¿qué más podemos investigar y tener notas propias?") | Candidatas, de lo más fácil a lo más grande: (a) **Fin de semana de F1** (horarios en hora argentina antes y resultados después; datos abiertos de Jolpica/Ergast, ver 0m en `PENDIENTES.md`); (b) **Resúmenes de jornada** de la Liga y de las copas (ver 0l); (c) **El campo de la semana**: precios de hacienda y granos (Mercado Agroganadero, Bolsa de Cereales; sólo cifras con su fuente, como el dólar), lluvias acumuladas y estado de los caminos; (d) **Qué decidió el Concejo** (actas y ordenanzas, con link a la fuente oficial); (e) **Boletín Oficial y licitaciones** de la Municipalidad (resumen con link); (f) **Cortes programados** de la Cooperativa y del agua (ya llegan como avisos: unirlos en una nota del día); (g) **Turnos y servicios**: farmacia (ya está), hospital, líneas de colectivo; (h) **Balance de la semana** (las diez que más se leyeron, con los números de `web/data/estadisticas.json`); (i) **El tiempo de Balcarce comparado con su historia** (ya hay clima histórico en las efemérides); (j) **Ciencia y campo de la zona**: comunicados del INTA Balcarce y de la UNMdP, reescritos con palabras propias y citando. Todas con la misma regla: datos con fuente, nada inventado, y la firma que dice quién la escribió | Medio | Alto |
| 47 | Sistema | **Un balance mensual de lo que se investigó** (2/10, Hernán: "una vez por mes analizar qué se subió, qué se buscó, qué fuentes, y armar algo para encontrar notas automáticamente") | Una vez por mes, un informe que junta: las pistas que se pasaron por el panel y quién las cubrió, qué fuentes terminaron cubriendo cada cosa primero, qué notas salieron de pistas, y qué fuentes nuevas conviene sumar (las que cubrieron algo que nosotros no tuvimos). De ahí salen sugerencias de fuentes y de palabras clave. Depende de que las Pistas queden guardadas (0j) | Medio | Medio |
| 48 | Sistema | **Contestar WhatsApp** (2/10, Hernán: "¿podés responder por WhatsApp? ¿WhatsApp Web en la PC o la API es muy cara?") | Hoy sólo mandamos avisos (CallMeBot, de ida). Para recibir y contestar hay dos caminos: **(1) la API oficial de WhatsApp Business (Cloud API de Meta)**: la configuración es gratis y las respuestas dentro de las 24 horas de que la persona escribió suelen no costar; lo que se cobra, por mensaje, es cuando escribimos nosotros primero con una plantilla (no verifiqué los precios actuales: hay que mirarlos en la página de Meta antes de decidir). Pide un número que no esté ya en WhatsApp común (el 2266 51-1612 habría que migrarlo o usar otro) y un recibidor de mensajes en internet (una Cloudflare Worker alcanza, gratis), así sigue andando con la PC apagada. **(2) WhatsApp Web automatizado en la PC**: va contra las condiciones de WhatsApp (pueden bloquear el número), necesita la PC prendida y el celular enlazado: lo desaconsejo. Se podría empezar con la API oficial y respuestas armadas ("gracias, lo miramos") y la IA sólo para ordenar lo que llega, nunca para contestar sin que lo vea una persona | Medio | Alto |
| 49 | Contenido | **Datos de color con imágenes abiertas** (2/10, de `Fuentes_Contenido_Radar_Balcarce.md`) | De esa lista, lo que sirve sin problemas de derechos: **NASA Earth Observatory** (imagen satelital del día, dominio público casi siempre) y **NASA APOD** (cada imagen puede tener derechos de terceros: revisar una por una, ver idea 42), **Wikimedia Commons**, **Smithsonian Open Access**, **The Met**, **Rijksmuseum** y **NYPL** (CC0 o dominio público) como banco de fotos libres para notas de cultura y ciencia, **NOAA** (datos de océanos) y **Wikipedia/Wikidata** para datos. Lo que **no** se copia: texto ni fotos de Atlas Obscura, National Geographic, Mental Floss, ArchDaily o Dezeen (sólo sirven de inspiración; lo nuestro se escribe con palabras propias y con datos de una fuente abierta). Para Balcarce rinde más lo local que lo global: una serie de "dato del día" para el fin de semana (ciencia y espacio en Tecnología, un lugar o un edificio de la zona en Cultura) con foto libre y crédito. Las efemérides, que es lo más fuerte del archivo, ya están (idea 42) | Medio | Medio |

Detalles chicos del sitio que dejó la auditoría del 29/09:

- "Actualizado hace X min" arriba de la portada, además del pie.
- La fecha y la hora exactas junto al "hace X" de cada nota.
- Que las pestañas de "Hoy en Balcarce" se puedan enlazar (`/#dolar`).
- Que la auditoría de los lunes cuente las notas con la imagen rota y los grupos
  de notas repetidas.
- La caja de búsqueda de Google (`SearchAction`) cuando se pueda buscar en todo
  el archivo (idea 20).

## Las cinco primeras, en detalle

### 1. La farmacia de turno por WhatsApp

Es lo más buscado de Balcarce y lo peor resuelto: hay que entrar a una web,
buscar el día y leer una tabla. Un mensaje automático que conteste "¿qué
farmacia está de turno?" con el nombre, la dirección y el enlace al mapa lo
resuelve en tres segundos y, además, **deja el número del medio agendado en el
teléfono de la gente**: ése es el activo, no la visita.

El dato ya existe (la farmacia de turno se publica cada media hora). Falta la
puerta: un número con la API de WhatsApp Business y algo que conteste, porque el
sitio es estático y no tiene servidor (por ejemplo, un Worker de Cloudflare,
gratis a esta escala). Contestarle a quien escribe primero no se cobra en la API
de Meta; confirmarlo al arrancar, porque Meta cambia sus precios seguido.

### 2. Una lista de WhatsApp para conseguir información

Vecinos que mandan un dato, una foto o un aviso: un corte de luz, una obra que
empezó, algo que vieron. Es la fuente que ningún medio de Balcarce tiene: todos
escriben desde lo que ya está publicado en otro lado.

Está casi resuelta: el WhatsApp del medio (2266 51-1612) ya está al pie de cada
página, y la regla del tipo `dato` está escrita (se verifica como cualquier nota y
sale sólo si lo confirma una segunda fuente; el buzón del panel de la PC, que la
tenía, se retiró el 17/10). Falta invitar a usarlo en serio (una lista o un canal de
difusión), alguien que lo mire todos los días y una regla chica de qué pasa al
buzón: no todo lo que llega es una noticia. **Un dato sin verificar no es una
nota**: nunca se publica sólo porque alguien lo mandó.

### 3. "Un día como hoy" (12:30: reel, historia y nota)

*Pedido de Hernán y Andrés (28-29/09): efemérides con personas y días
importantes, entre el repaso de la mañana y el de la tarde, que además armen la
nota para el diario. Las fuentes se probaron el 29/09 y andan sin clave. Falta
decidirlo (`PENDIENTES.md`).*

**Fuentes que sirven (probadas):**

- **Wikipedia en español, "un día como hoy"**
  (`es.wikipedia.org/api/rest_v1/feed/onthisday/all/MM/DD`): hechos,
  nacimientos, fallecimientos y celebraciones de cada fecha, con la página de
  origen; trae los días de Argentina (el 29/9, el Día del Inventor). Es CC BY-SA:
  la nota se escribe con palabras propias y la fuente va en "Fuentes (N)".
- **Wikidata, los nacidos en Balcarce** (consulta SPARQL): dio 31, con sus
  fechas. Fangio (24/6/1911 y 17/7/1995), Lucas Kraglievich (3/8/1886,
  paleontólogo), Juan Manuel Bordeu (28/1/1934), Carlos Heras (historiador),
  Santiago Mangoni y varios futbolistas. Descartar las fechas "1 de enero" (es
  sólo el año) y cuidar a las personas vivas.
- **Wikidata, argentinos conocidos por fecha** (más de 12 idiomas de Wikipedia
  como señal de fama). Necesita un filtro de temas sensibles: para el 29/9
  apareció una detenida desaparecida.
- **El calendario oficial de feriados** (`api.argentinadatos.com/v1/feriados/AAAA`).
- **Lo local, a mano**: un archivo (`ingesta/efemerides-locales.json`) con las
  fechas de Balcarce (fundación, clubes, escuelas, el autódromo) verificadas con
  el Museo Fangio, el Museo Histórico y el Archivo Municipal: no se publica una
  fecha de memoria. Las fotos viejas tienen dueño (el Museo Histórico Municipal
  "Don Aurelio González", el Archivo Histórico Municipal): se piden, y mientras
  tanto va sin foto.

**No sirven:** las efemérides del Ministerio de Educación (el sitio bloquea el
acceso automático: sólo para controlar a mano) y los portales grandes (el texto
tiene derechos).

**Cómo se armaría:** un hecho de Wikipedia, el balcarceño de la fecha si
coincide, el día especial y el dato del clima de otros años (idea 4). La IA
redacta sólo con esos hechos y el verificador controla que no agregue nada
(`ingesta/verificar.mjs`). Reglas: primero lo de Argentina y Balcarce; nada de
asesinatos, atentados ni víctimas (salvo los feriados nacionales); nunca un
menor; cuerpo de 70 palabras o más. Saldría a las 12:30 con la voz de la
locutora y la nota "Un día como hoy" en Cultura y agenda, y suma un reel y una
historia al contrato del día (`CONTRATO_DIARIO`).

**Lo que hay que resolver es la voz.** Las voces van por el cupo gratis de
Gemini: 10 audios por día, y el día normal ya gasta 6, más los útiles, la agenda
de los jueves y los avisos de clima. Si el cupo se acaba, la pieza que sigue no
sale (nunca con otra voz). Con un audio más por día no entra sin poner en riesgo
otras piezas: decidir si sale sin voz (historia y nota) o qué pieza le deja el
lugar.

### 4. El clima de Balcarce un día como hoy

Con los datos históricos de Open-Meteo (desde 1950, reanálisis ERA5: unos 27.700
días, 760 KB) se calcula para cada fecha la máxima más alta, la mínima más baja y
la mayor lluvia. Para el 29/9: máxima 24,9° (2019), mínima 2° (1963), lluvia
37,2 mm (2013). Son **datos de modelo, no de una estación**: la nota dice "según
los datos históricos de Open-Meteo". Se bajan una sola vez y se guardan en el
repositorio. Sirve sola o dentro de la pieza del clima.

### 5. El cielo de hoy

La fase de la luna, la salida y la puesta del sol (ya las trae el pronóstico),
los solsticios y equinoccios y las lluvias de meteoros del mes (Perseidas,
Gemínidas…). Todo se calcula o sale de un calendario fijo: no depende de ninguna
fuente.

## Las que no haría

- **Clickbait.** En un pueblo el que exagera se quema en dos semanas.
- **Publicar lo mismo que los otros.** Si El Diario ya cubrió el acto del
  intendente, nuestra versión no aporta: mejor lo que ellos no llegan a cubrir.
- **Policiales con nombre y apellido.** Además del riesgo legal, en un pueblo
  chico la gente se cruza en la calle.
- **Seguidores comprados.** Se nota, y el algoritmo muestra menos si la gente no
  interactúa.
- **Dos voces en la misma pieza.** El 28/09 se probaron tres versiones (una
  charla, la charla con pausas y "mhm", y un noticiero con dos lectores que se
  turnan las notas: los modos `dialogo`, `dialogo2` y `dialogo3` del workflow
  "Crear voces") y se descartaron: suenan falsas, cada parte se genera sin saber
  qué dijo la anterior, y lo que se agrega para que "converse" no sale de las
  fuentes verificadas. Una voz por pieza, alternadas a lo largo del día, suena
  profesional.

## Lo aburrido que más sirve

1. **Publicar todos los días sin falta**: el clima y la farmacia, aunque no pase
   nada. La constancia hace el hábito.
2. **Contestar los mensajes**, siempre, aunque sea "gracias, lo miramos".
3. **Corregir rápido y a la vista.** Un medio que corrige gana más de lo que
   pierde.
4. **Que el sitio cargue rápido**: no arruinarlo con banners pesados.

## Ideas del 4/10 (de la charla con Hernán)

50. **Juntar varias versiones del mismo hecho en una sola nota mejor** (caso Frutimar: los medios locales no salen todos juntos). Que la nota publicada se actualice cuando suma un medio nuevo, y que el panel muestre los temas grandes por bloques para revisarlos de una vez.
51. **Enfoque comercial y de difusión con los contactos**: cuando haya una buena agenda de instituciones y comercios, un primer mensaje que ofrezca algo útil (que nos mande su agenda, su aviso) y de paso presente el medio.
52. **Fútbol local** desde los medios de acá (Liga Balcarceña, Regional Amateur), con el mismo trato para todos los clubes.

## Ideas del 8/10

*Traído el 15/10/2026 de `docs/propuestas/IDEAS-NUEVAS.md` (armado el 8/10, a partir de las auditorías de ese día), tal cual, con los títulos un nivel más abajo. Nada de esto está aprobado; con el rediseño desde cero del 12/10, leer cada idea como una opción. Los números (#) y las referencias tipo "C-8" o "ECO-1" son los de los documentos archivados en `docs/historico/propuestas-2026-10/` (cuando abajo dice `MEJORAS.md` o `PRIORIDADES.md`, son los de esa carpeta).*

*Armado el 8/10/2026. Acá va **solo lo nuevo**: notas propias, secciones, formatos de redes, canales,
servicios y planes comerciales. Lo que mejora o decide sobre algo que ya existe está en
`MEJORAS.md` (de `docs/historico/propuestas-2026-10/`, borrada el 17/10; queda en el historial de git). Nada de esto está hecho ni aprobado.*

**Cómo leerlo**

Cada idea dice **si hay datos de verdad para hacerla o si todavía es especulación**. Para eso, el 8/10
se probó cada fuente desde los robots de GitHub (el mismo lugar desde donde andaría): se bajó el archivo
y se buscó "Balcarce" adentro. Los estados son:

| Estado | Qué quiere decir |
|---|---|
| **Comprobado** | Se bajó el dato desde GitHub y trae a Balcarce, con fecha reciente. Se puede programar. |
| **Fuente accesible** | La fuente responde desde GitHub, pero falta ver si trae a Balcarce o en qué formato. |
| **Solo búsqueda** | La fuente apareció en buscadores; no se pudo probar o no se probó. |
| **Bloqueada** | Se probó desde GitHub y falló (error, bloqueo o certificado vencido). Hoy no sirve. |
| **Trabajo humano** | El dato no está en internet: lo tiene que conseguir o cargar una persona. |
| **Especulación** | No hay dato; depende de supuestos (precios, audiencia, que alguien acepte). |

---

### 1. Lo que tiene fecha

| Fecha | Qué | Idea |
|---|---|---|
| **9 al 12/10** | Fiesta Nacional del Postre | "Desde el predio" (R-5), "Dónde comer" (V-13), QR (V-3) |
| **Martes 13/10** | El INDEC publica la inflación de septiembre | ECO-2 |
| **19 al 23/10** | Final de los Juegos Bonaerenses en Mar del Plata | DEP-1 (lista antes del 19/10) |
| Mediados de 2027 | 70 años del quinto título de Fangio (1957) | AUT-2, R-12 |
| 2027 | Elecciones | POL-3 (con tiempo) |

### 2. Antes de decidir: choques con las reglas de hoy

Varias ideas chocan con reglas escritas. No se pueden hacer sin que ustedes cambien la regla:

1. **"Todo lo que va a Instagram es video con voz, salvo el espejo"** (CLAUDE.md). Los carruseles y las
   placas sin voz de la sección 7 la rompen. Cambiarla sería la regla 108.
2. **"Nunca en vivo"** (`CRITERIO-REDES.md` § 4) está pensada para lo automático. Cubrir un evento con una
   persona en el lugar pide una excepción escrita.
3. **Avisar que la voz es de IA**: lo pide Meta, y también TikTok, YouTube y Spotify. Hoy el criterio lo
   prohíbe (ver C-9 en `MEJORAS.md`). Afecta podcast, YouTube, TikTok y la radio.
4. **Una fuente sola no alcanza** para publicar. Las notas de datos oficiales (sección 4) son una sola
   fuente: ya existe la regla de que "una fuente oficial alcanza sola"; hay que confirmar que cubre estas.
5. **Secciones sensibles nuevas** (Salud): decidir si esperan a una persona en redes, como Política y
   Policiales.

---

### 3. Cinco piezas comunes (se arman una vez y sirven a muchas ideas)

| Id | Pieza | Qué es | Alimenta |
|---|---|---|---|
| COM-1 | **Molde "dato con plantilla"** (como la nota del dólar) | Código que baja un dato abierto, lo compara con el anterior y arma la nota con una plantilla, **sin IA** | Nafta, transferencias, elecciones, siembra, inflación, escuelas |
| COM-2 | **Calendario cargado a mano** | Archivo de fechas (ANSES, ARBA, tasas, calendario escolar, vacunación) con doble control y dos fuentes | Semana del bolsillo, ¿Hay clases?, Fechas para anotarse |
| COM-3 | **Planilla pública de Google** | Una hoja que llena alguien de afuera (Liga, clubes, consignatarias) y el sistema lee sola, con columna "revisado por" | Liga Balcarceña, Este finde, zonal, remates |
| COM-4 | **Lector de boletines oficiales** | Detecta normas nuevas (SIBOM, Boletín nacional y bonaerense, ANMAT); la IA resume solo lo que dice la norma y el verificador controla | Semana en el Boletín, Qué cambia desde hoy, Retirados de la venta |
| COM-5 | **Vigía de páginas** | Revisa una página fija y avisa o extrae cuando cambia | TC con Mangoni, Juegos Bonaerenses, Panorama Agrícola |

---

### 4. Notas propias por sección

*Ejemplos de título y detalle de cada fuente en `registro/PLAN-DE-MEJORAS-2026-10.md`, sección U.*

#### Lo que dijo la prueba desde GitHub (8/10)

| Fuente | Resultado |
|---|---|
| Precios en surtidor (Secretaría de Energía) | **146 filas de Balcarce, al 7/10/2026** |
| Estimaciones agrícolas por partido | **657 filas de Balcarce, de 1969 a 2026** |
| Transferencias de la Provincia a municipios | **1.727 filas, de enero de 2010 a julio de 2026** |
| Elecciones bonaerenses | **PASO 2011-2021: 187 filas; generales 2005-2023: 261 filas** |
| Establecimientos educativos (Provincia) | **177 filas, al 28/09/2026** |
| Matrícula por distrito | Balcarce solo de 2011 a 2014; de 2015 a 2025 hay total y por región educativa, no por distrito |
| Campeonato de TC (ACTC) | **Responde y nombra a "MANGONI, Santiago"** |
| SIBOM (boletín municipal) | Se puede leer |
| API de series de datos.gob.ar, calendario del INDEC, IPC (CSV hasta 08/2026), BCRA v4, transparencia de plazos fijos, OpenAlex (201 trabajos en 2026), repositorio del INTA, Boletín Oficial nacional y bonaerense, ANMAT, boletines epidemiológicos, TC Pick-Up, Jolpica, OpenF1, TheSportsDB, Juegos Bonaerenses, Open-Meteo | Responden |
| Estadística criminal (SNIC) | 403 y 404 |
| Empleo por departamento (OEDE) | 403; los otros enlaces de empleo, certificado vencido |
| Existencias bovinas (SENASA) y mapa cultural | El buscador del catálogo nacional da 502 (intermitente) |
| ENACOM | Error de certificado |
| cultura.gob.ar | 403 |
| Vialidad (estado de rutas) | 404 |
| ESPN | 403 con un nombre de navegador nuevo (el que ya usa el repo anda) |

#### Las ideas, con su estado

| Id | Sección | Idea | Estado de los datos | Trabajo | Cuidado principal |
|---|---|---|---|---|---|
| **ECO-1** | Economía | **La nafta en Balcarce, estación por estación** | **Comprobado** (146 filas al 7/10) | Bajo (COM-1) | Solo precios de los últimos 7 días, con fecha |
| **AUT-1** | Automovilismo | **TC y TC Pick-Up como la F1, con Santiago Mangoni** | **Comprobado** (TC); Pick-Up accesible | Medio (COM-5 + molde de `f1.mjs`) | Escribir a la ACTC; provisorio hasta el dictamen; confirmar que Mangoni es de Balcarce |
| **POL-1** | Política | **La plata que manda la Provincia** | **Comprobado** (2010 a 07/2026) | Bajo-medio (COM-1) | Decir si es en pesos de hoy o descontada la inflación |
| **AGR-1** | Agro | **Balcarce en el mapa agrícola** (siembra y cosecha) | **Comprobado** (estimaciones); ganado de SENASA, bloqueado por ahora | Bajo-medio (COM-1) | Son estimaciones y llegan con atraso |
| **POL-3** | Política | **Así vota Balcarce** (20 años de elecciones) | **Comprobado** (2005-2023 y PASO) | Medio, una vez | No proyectar; distinguir provisorio de definitivo |
| **EDU-2** | Educación | **Las escuelas de Balcarce en números** | **Comprobado en parte**: establecimientos sí; matrícula por distrito solo hasta 2014 | Bajo | Nunca un grupo de menos de 10 alumnos |
| ECO-2 | Economía | La inflación del mes en la región Pampeana | Fuente accesible (API de series; el CSV probado era nacional) | Bajo (COM-1) | Si cambia la base, cambian los identificadores |
| ECO-3 | Economía | Cuánto paga un plazo fijo en los bancos de Balcarce | Fuente accesible | Bajo-medio | Es dato, no consejo |
| AGR-3 | Agro | La papa, de la chacra a la góndola | Fuente accesible (API de series) | Bajo-medio | Es la región, no Balcarce |
| AGR-2 | Agro | El sudeste en el Panorama Agrícola semanal | Solo búsqueda | Medio (COM-5 + IA) | Solo datos, con palabras propias |
| AGR-4 | Agro | Remates de la zona | Trabajo humano | Bajo | Confirmar qué consignatarias |
| AGR-5 | Agro | Lluvia medida en la estación del INTA | Solo búsqueda | Medio | No confirmado que la estación esté en línea |
| POL-2 | Política | La semana en el Boletín Oficial municipal | Fuente accesible (SIBOM legible) | Medio (COM-4) | Nombrar solo a funcionarios |
| POL-4 | Política | El votómetro del Concejo | Trabajo humano (1-2 h por sesión) | Bajo | Mismo trato para todos los bloques |
| POL-5 | Política | Índice de transparencia fiscal (ASAP) | Solo búsqueda | Bajo | Fuente privada: atribuirla |
| POC-1 | Policiales | Balcarce en la estadística criminal | **Bloqueada** (403/404) | — | Esperar o pedir el dato |
| POC-2 | Policiales | Seguridad vial en las rutas 226 y 55 | Bloqueada (SNIC) + trabajo humano | Medio | Nunca nombres ni patentes |
| POC-3 | Policiales | Bomberos y Fiscalía: el mes en números | Trabajo humano (pedido mensual) | Bajo | Nunca domicilios |
| FUT-1 | Fútbol | Así está el descenso (Aldosivi) | Fuente accesible (ESPN ya se usa) | Bajo-medio | Reglas de desempate de la AFA |
| FUT-2 | Fútbol | El Federal A de la zona | Fuente accesible (TheSportsDB; el uso comercial es pago, ~US$ 5-9) | Medio | Pagar o pedir permiso |
| FUT-3 | Fútbol | La fecha de la Liga Balcarceña | Trabajo humano (COM-3) | Bajo | Segunda persona que revisa |
| DEP-1 | Deportes | Balcarce en la final de los Juegos Bonaerenses | Fuente accesible + persona carga finalistas | Bajo | Muchos chicos: disciplinas, no nombres. **Antes del 19/10** |
| DEP-2 | Deportes | Los de Balcarce en las ligas de Mar del Plata (hockey, rugby) | Fuente accesible (El Marplatense ya se lee) | Medio | Confirmar si "Campo de Pato" es el Club Social Pato |
| DEP-3 | Deportes | Este finde en Balcarce: qué se juega | Trabajo humano (COM-3) | Bajo | "A confirmar" si no está confirmado |
| AUT-2 | Automovilismo | Fangio, un día como hoy (Jolpica) | Fuente accesible (ya se usa) | Bajo | En 1956 las fuentes no coinciden |
| AUT-3 | Automovilismo | La carrera de Colapinto en datos (OpenF1) | Fuente accesible | Medio | No es oficial |
| AUT-4 | Automovilismo | El zonal y los pilotos de acá | Trabajo humano (pedir el PDF) | Bajo | Depende de que contesten |
| BAL-1 | Balcarce | La semana del bolsillo: qué vence y qué se cobra | Trabajo humano (COM-2) | Bajo | Una fecha mal hace daño: doble control |
| BAL-2 | Balcarce | ¿Cuánto sube la luz en Balcarce? | Solo búsqueda + persona copia 4 números | Medio | La Cooperativa está en crisis: todo atribuido |
| BAL-3 | Balcarce | El termómetro del centro (locales vacíos) | Trabajo humano (1 h por mes) | Bajo | Fotos sin gente ni patentes |
| TRA-1 | Trabajo | El empleo registrado en Balcarce | **Bloqueada** (403 y certificado vencido) | — | Volver a probar en un mes |
| TRA-2 | Trabajo | Ofertas de empleo de la semana | Solo búsqueda / trabajo humano | Medio | Solo ofertas de fuentes identificadas |
| TRA-3 | Trabajo | Cuánto cobra un peón rural desde este mes | Trabajo humano (de la norma) | Bajo | Básico no es total |
| CYT-1 | Ciencia | Ciencia hecha en Balcarce (INTA, Agrarias) | Fuente accesible (OpenAlex y repositorio del INTA) | Medio | Lenguaje simple sin exagerar |
| CYT-2 | Ciencia | La conectividad de Balcarce y sus pueblos | **Bloqueada** (ENACOM) | — | — |
| CYT-3 | Ciencia | Convocatorias y becas de la semana | Trabajo humano | Bajo | Sirve también a Trabajo |
| CUL-1 | Cultura | Convocatorias abiertas para artistas | Bloqueada en parte (cultura.gob.ar 403) | Bajo-medio | Manda el organismo |
| CUL-2 | Cultura | Mapa cultural de Balcarce | Bloqueada (502) + persona confirma | Bajo | El dato es de 2023 |
| CUL-3 | Cultura | Lo más pedido en las bibliotecas | Trabajo humano | Bajo | Nunca quién lo pidió |
| ARG-1 | Argentina | Cuándo y cuánto cobro (unida con BAL-1) | Trabajo humano (COM-2) | Bajo-medio | Doble control |
| ARG-2 | Argentina | Qué cambia desde hoy (boletines) | Fuente accesible | Medio (COM-4) | No atribuir efectos que la norma no dice |
| ARG-3 | Argentina | El trámite de la semana | Trabajo humano (preguntas del WhatsApp) | Bajo | — |
| EDU-1 | Educación | ¿Hay clases? | Trabajo humano (calendario) + datos que ya existen | Bajo | Decir "no hay clases" cuando hay es muy dañino |
| EDU-3 | Educación | Fechas para anotarse | Trabajo humano (COM-2) | Bajo | Siempre el enlace oficial |
| EDU-4 | Educación | El proyecto de la semana (una escuela cuenta) | Trabajo humano | Bajo | Sin nombres ni caras de alumnos |
| SAL-1 | Salud | El parte de la semana (dengue, gripe) | Fuente accesible; por región sanitaria, no comprobado | Medio | Contra el alarmismo |
| SAL-2 | Salud | Retirados de la venta (ANMAT) | Fuente accesible | Bajo-medio (COM-4) | Marca y lote textuales |
| SAL-3 | Salud | Vacunación: qué toca y dónde | Trabajo humano | Bajo | "Confirmado el DD/MM" |

---

### 4b. Contenido propio: sello, ritmo y primeras notas (de las auditorías externas del 8/10)

*Detalle y cruce en `registro/AUDITORIAS-EXTERNAS-2026-10-08.md`.*

- **Sello "Nota de Radar Balcarce"** (u "Original"), bien visible y distinto de lo automático, en la nota, la
  portada y las redes. Ayuda con Google (S-1) y con los lectores.
- **Un feed RSS solo de notas propias**, además del general.
- **Ritmo propuesto:** una nota propia por semana el primer mes; después, dos.
- **Las primeras, en este orden:**
  1. Balcarce en números (con los datos ya comprobados: nafta, plata de la Provincia, siembra, elecciones,
     escuelas).
  2. Farmacias de turno: por qué a veces no coincide y cómo lo chequeamos (explicador con datos propios).
  3. Qué se está hablando en Balcarce esta semana (lo que manda la gente por WhatsApp).
  4. Qué pasó finalmente con… (seguimiento de temas abiertos).
  5. Agenda real de la semana.
  6. Vecinos que hacen cosas (perfiles).
  7. Entrevistas a comerciantes.
  8. Cuánto cuesta vivir en Balcarce.
  9. El mapa de los baches según los vecinos.
  10. Las rutas 55 y 226.
- **Frase para el sitio y las redes (propuesta):** "El medio más útil y transparente de Balcarce". Cuando haya
  más contenido propio: "…y el que te cuenta lo que nadie más te cuenta".
- **Herramientas gratis para investigar a mano:** Google Pinpoint y NotebookLM, para leer documentos largos
  (presupuesto municipal, ordenanzas, actas) y sacar datos con su fuente.
- **Fotos ilustrativas de bancos libres** (Unsplash, Pexels) en temas genéricos, siempre rotuladas "Imagen
  ilustrativa" y nunca como si fueran del hecho. **Decisión de ustedes**: choca en parte con el criterio de fotos.
- **Membresía de lectores** (como hacen algunos medios locales de Estados Unidos): para más adelante, cuando haya
  público. Es especulación para una ciudad de 45.000 habitantes.

### 4c. Hacia dónde va el medio y cómo sumar gente (pedido el 8/10)

**La idea de Hernán y Andrés:** ser un medio serio en cinco niveles: **nacional, provincial, zonal, vecinal y de
Balcarce**. Sumar y rehacer notas todo el tiempo, **con prioridad a lo de Balcarce, sobre todo en redes**.

**Qué implica:**
- **Secciones y barras laterales:** sigue pendiente (sección 5, y F1-b en `MEJORAS.md` como base). Los cinco
  niveles pueden ordenar el menú: Balcarce primero; después la zona (Mar del Plata, Tandil, Lobería, la ruta 226);
  la Provincia; y el país.
- **Redes con prioridad a Balcarce:** que los repasos y los posteos elijan primero lo local, y que lo nacional
  entre solo si es muy importante. Hoy ya se elige así en parte (`redes/elegir.mjs`); conviene escribir la regla
  en el criterio de redes y medirla.
- **Lo nacional, con aporte:** para ser un medio nacional serio, lo nacional tiene que sumar algo (contexto, qué
  cambia para Balcarce). Mientras tanto, ver S-1 en `MEJORAS.md`.

**Sumar colaboradores (nuevo):**
1. **Corresponsales vecinos:** gente de cada localidad o institución (clubes, escuelas, el campo) que manda
   información por WhatsApp con un formato fijo. Una persona la revisa antes de publicar.
2. **Notas de colaboradores, con su firma:** invitar a gente que sabe de un tema a escribir. Va con revisión, el
   sello "Colaboración" y una regla escrita: sin conflicto de intereses, nada de política partidaria.
3. **Entrevistas online:** por videollamada grabada, con permiso. Salen como nota, como audio con voz humana (no
   gasta cupo) y como reel con un fragmento.
4. **Entrevistas presenciales con video:** para eventos y personajes del pueblo. Cuidado con los menores y con el
   permiso de imagen.

**Videos de terceros (turistas, creadores que pasan por Balcarce) (nuevo, con reglas):**
- **Solo con permiso escrito** del autor (un mensaje que diga que sí alcanza, guardado). Sin permiso, subir el
  video de otro es usar algo ajeno: Meta lo puede bajar o sacarle alcance. Meta anunció en 2025 que reduce la
  distribución de las cuentas que republican contenido de otros sin aportar nada (solo búsqueda: confirmarlo).
- **Con aporte propio:** recorte, contexto, subtítulos y la placa de Radar. No subirlo tal cual.
- **Con crédito:** el nombre del autor en el texto del posteo y etiquetado en la colaboración de Instagram (R-4).
  Hay que decidir si el crédito también puede ir escrito sobre el video: la regla de hoy dice que sobre una imagen
  nunca va el nombre de otro medio. Un creador no es un medio, pero conviene dejarlo escrito.
- **Sirve también como invitación:** "Te sacamos en Radar Balcarce" suma seguidores de los dos lados.
- **En la web,** los videos de YouTube se pueden mostrar insertados, sin bajarlos, siempre que el autor lo permita.
  Ojo: el reproductor de YouTube carga código de afuera (ver C-2 en `MEJORAS.md`).

#### "Jefe editor": una sola nota a partir de todas las fuentes (idea de Hernán y Andrés, 8/10)

**La idea:** cuando un hecho lo cuentan **3 o más medios** (casi siempre lo nacional: el último partido de Messi),
que un "jefe editor" mire todas las fuentes y arme **una nota única**, con un criterio marcado, y que pueda sumar
un dato que no está en esas notas. Hoy entran unas 25 notas por día así.

**Sí se puede hacer.** Es una pasada de redacción con otra instrucción:
1. **El código** junta y ordena las fuentes (el cruce ya lo hace).
2. **El jefe editor** (un modelo) las lee todas, separa lo que **todos** confirman de lo que dice **uno solo**, elige
   el ángulo y, si hay uno, un dato de contexto, y escribe la nota.
3. **El verificador** (código, como hoy) controla nombres, números, fechas y citas.
4. **No hace falta** que cada nota tenga un ángulo de Balcarce (decidido el 8/10).

**Decidido el 8/10:**
- **Política y Policiales: sin filtros nuevos por ahora.** Siguen como hoy y el jefe editor no los toca. Si más
  adelante se quieren rehacer, se rehacen aparte. La regla de menores y víctimas no se toca sin hablarlo antes.
- **El filtro general:** notas con varias fuentes y que no salgan duplicadas.
- **Hoy no hay API de Anthropic.** Se arranca con un modelo de Gemini más fuerte dentro del cupo gratis (son pocas
  notas por día). Haiku o Sonnet quedan para cuando haya cuenta (costos en `MEJORAS.md`).
- **"Quiénes somos" no es la línea editorial:** solo nombra a los creadores. Eso se hace en una o dos semanas. La
  línea editorial va en el criterio, que es lo que lee la IA.

**Datos de afuera de las notas: sí, pero con fuente.** El verificador no deja pasar un número que no esté en las
fuentes, y un modelo no puede sacarlo de memoria. La forma de hacerlo:
- **Fichas de contexto:** un archivo con datos verificados de las figuras que más aparecen (Messi, Colapinto, Milei,
  Caputo, los clubes), armado por código desde una fuente con su enlace (Wikidata, ESPN, Jolpica) y con la fecha de
  actualización.
- El jefe editor elige **uno** y lo cita ("según ESPN"). Si no hay ficha, la nota sale sin dato extra.
- Ya funciona así con las notas de F1 y de fútbol: el dato lo trae el código, no el modelo.

**¿Lo detecta Google?** Google no mira cómo se hizo la nota. Lo que sí mide:
- **Si es parecida a otras páginas** (originalidad) y **si aporta algo** (utilidad). Su política es contra el contenido
  hecho **a escala y sin aporte**, sea de una persona o de una IA (así figura en la auditoría de SEO).
- Una nota que **junta varias fuentes, suma un dato verificado y está bien armada** se parece a lo que hace cualquier
  redacción con las agencias: no es lo que Google castiga. Una reescritura de **una sola** fuente sin nada nuevo, sí.
- **Cómo se confirma:** en Search Console, mirando cuántas de esas notas Google indexa y cuántas aparecen en las
  búsquedas. No hay una prueba mejor que esa.

**Dos cuidados:**
- Juntar cinco notas ajenas sigue siendo una nota derivada: lo que la vuelve propia es lo que **suma**.
- Para el verificador, la síntesis necesita reglas propias (cuántas fuentes respaldan cada afirmación, cómo se trata
  lo que dice una sola, cómo entra el dato de la ficha). Hay una auditoría en curso (ver `PRIORIDADES.md`, 33f).

**Línea editorial: borrador para `CRITERIO-EDITORIAL.md` (no está aplicado; se pega cuando se arranque).**
*Hernán y Andrés: confirmen o corrijan los puntos marcados.*

> **Línea editorial.** Radar Balcarce se ubica en el **centro y el centro-derecha**. Esa línea se nota en **qué se
> elige y qué contexto se suma**, nunca en el tono ni en cómo se cuenta un hecho.
> 1. Cuando una historia tiene varios ángulos, se elige el que más le sirve a un lector que valora **[a confirmar:
>    el orden y la seguridad, la economía y la producción, el uso del dinero público, la iniciativa privada]**.
> 2. Se prefieren los **hechos y los datos comprobables** a las declaraciones. Un dato de contexto solo entra si
>    tiene fuente.
> 3. El tono es **neutral**: sin adjetivos de opinión, sin editorializar, sin descalificar a personas ni a partidos.
> 4. **Mismo trato para todos:** cada postura va con su argumento, atribuido a quien lo dijo. Nunca se omite un hecho
>    relevante porque incomode a un lado u otro.
> 5. Lo que dice una fuente no se cambia ni se exagera.

#### Jefe editor: diseño detallado (auditoría del 8/10)

**Una aclaración:** hoy **ya sale una nota por hecho**, escrita con todas las fuentes del grupo. No hace falta una
estructura nueva: faltan tres mejoras al pase actual.
- **El insumo:** hoy llega un solo texto completo y resúmenes de 280 caracteres de las demás fuentes.
- **El control:** el verificador mezcla todas las fuentes en una bolsa de palabras.
- **El aporte propio:** no hay ángulo ni dato de contexto.

**Pasos:**
1. **Disparo:** 3 o más medios independientes (Fútbol y Deportes siguen en 4), **sin Política ni Policiales**. Se
   re-sintetiza una sola vez si el hecho crece a 6 medios o aparece una fuente oficial. La nota conserva su dirección y
   su fecha no rejuvenece.
2. **Material:** el código elige hasta 6 fuentes (la oficial primero, un solo medio por grupo, un cable replicado cuenta
   como uno); texto completo de hasta 3; al resto, "solo resumen".
3. **Datos de contexto:** hasta 3, de figuras o clubes de la nota, cada uno con `{dato, fuente, enlace, fecha, vence}`,
   desde Wikidata, ESPN o Jolpica, o cargados por una persona. Se llaman "contexto" (no "ficha", que ya es otra cosa).
   Hay que revisar las condiciones de uso de ESPN.
4. **Una sola llamada:** la IA devuelve primero una lista de afirmaciones (cada una con las fuentes que la dicen), las
   discrepancias, el ángulo y el contexto usado, y después escribe. Con salida estructurada y menos "temperatura".
5. **Verificación por fuente** (tabla abajo), reparación parcial, semáforo y firma como hoy.

**Qué respaldo necesita cada afirmación:**

| Dónde | Respaldo mínimo |
|---|---|
| Título, bajada, guion y redes: hecho central, cifras, nombres | 2 o más fuentes independientes, o 1 oficial. Si no, no hay síntesis y se escribe como hoy |
| Cuerpo: dato de una sola fuente | Se puede, en una oración atribuida ("según la Secretaría…") |
| Cifras que difieren | Las dos versiones, atribuidas. Nunca una elegida a mano |
| Cita | Literal en la fuente que se nombra, con hablante nombrado |
| Acusación | Como hoy: condicional y atribuida. Diez medios que repiten una denuncia cuentan como una fuente |
| Dato de contexto | Solo en el cuerpo, máximo 2, con la fuente y la fecha en la misma oración, con la cifra tal cual y sin vencer |

**Reglas actuales que estorban o no alcanzan:**
- **Copia:** con 6 fuentes hay más frases en común; eximir tramos de nombres propios y cifras.
- **Material:** "60 palabras sumando todo" no sirve para una síntesis: pedir al menos 2 fuentes con material propio.
- **Citas y negación:** comparan contra una bolsa; la síntesis necesita saber de qué fuente salió cada cosa.
- **Localía (regla 15):** prohíbe cualquier vínculo con Balcarce que la fuente no diga. Como ya **no hace falta** ángulo
  local, no estorba; si algún día se quiere, habría que permitirlo con un dato local verificado.
- **Nivel de verificación:** mezcla "repetido por muchos" con "confirmado" (ver hallazgo 1 en `MEJORAS.md`).
- **Nombrar al medio (regla 8):** con un dato de una sola fuente, "según un medio" informa poco. **Decisión de ustedes.**

**El ángulo (propuesta, a confirmar con Hernán y Andrés):** una lista cerrada: impacto en el bolsillo, gestión y
resultados, seguridad y orden, producción y empleo, reglas y procedimiento, antecedentes. El ángulo decide qué va
primero y qué contexto se elige; **nunca qué hecho se omite ni el tono**. Con un control de "mismo trato": cada postura
con su argumento y sin motes de ningún bando.

**Cómo se ve para Google:**
- **Hoy marca la nota como derivada:** un solo `isBasedOn` (la fuente principal), `citation` con nombres sin enlace,
  un autor con la explicación de la IA metida, y texto que repite hechos y cifras de las fuentes.
- **La marcaría como propia:** un dato de contexto con fuente y fecha en un bloque aparte; `isBasedOn` con todas las
  fuentes realmente leídas; `citation` con enlace; la página "Cómo trabajamos"; fecha propia (S-2).
- **No ocultar `isBasedOn`:** no cambia el contenido y contradice la regla de decir de dónde sale cada cosa.
- **Regla para indexar una síntesis** (propuesta): 3 o más fuentes leídas, al menos un aporte propio verificable
  (contexto o dato local) y un cuerpo de 120 palabras o más. Si no, `noindex, follow`.

**Pruebas que habría que escribir (14):** una cifra de una sola fuente no entra en el título; un nombre de una fuente
sin atribución se rechaza; números en palabras; discrepancias con las dos versiones; el dato de contexto sin fuente, en el
título, vencido o con otra cifra se rechaza; la cita con otra puntuación pasa y la inexistente no; una cifra atribuida a
una fuente que no la contiene se rechaza; cinco medios que replican un cable cuentan uno; la fecha no rejuvenece; el cruce
une grupos con 2 o más medios (AUBASA, INDEC, Toyota); una fusión nunca apunta a una nota sin página; lo escrito con 5
fuentes se revalida con el mismo material; Política y Policiales no salen solas; palabras de gancho ("drástica", "picante").

**Costo:** unos 14.000 tokens por pedido: del orden de US$ 0,002 por nota con Haiku, o gratis con Gemini dentro del cupo.

### 5. Secciones: de 11 a 15, con barra lateral (H1)

*Detalle en `registro/AUDITORIA-2026-10-08.md`, sección 3.*

- **Estado:** Comprobado en volumen (conteo aproximado por palabras clave sobre el archivo real).
- **Candidatas:**
  - **Educación:** ~63 notas en 3,4 semanas.
  - **Salud:** ~48.
  - **Deporte local:** Deportes tiene 100 locales contra 47 de afuera.
  - **Ciencia y tecnología o Trabajo y empleo:** ~33.
  - "Sociedad" es la sección común de los medios nacionales que acá falta.
- **Regla que ya estaba:** sumar de a una, cada dos semanas, solo si llena 10 notas por semana. Antes, una
  maqueta del menú ("Más") y de la barra lateral.
- **Barra lateral:** hoy solo está en la portada.
  - Hay datos propios para Balcarce, Fútbol, Automovilismo, Economía y Cultura.
  - Para Política, Tecnología, Argentina y Educación hace falta "lo más leído", temas o publicidad.
  - Las ideas de la sección 4 llenan varias: nafta y plazo fijo en Economía, transferencias en Política,
    escuelas en Educación.
- **Depende de** F1-b (`MEJORAS.md`): un solo archivo de configuración por sección.

---

### 6. Web y servicios útiles

| Id | Idea | Estado | Trabajo | Cuidado |
|---|---|---|---|---|
| V-1 | **Parte agroclimático**: helada, lluvia acumulada, viento, humedad; historia y podcast del campo 2 veces por semana | Fuente accesible (Open-Meteo, ya se usa) | Bajo-medio | Alerta de tizón solo validada con el INTA |
| V-2 | **Red de pluviómetros vecinal** por WhatsApp | Trabajo humano | Medio | Datos personales |
| V-3 | **Cartel QR en farmacias y comercios** ("¿qué farmacia está de turno?"), con logo del comercio | Trabajo humano | Bajo | Una farmacia no auspicia la farmacia de turno |
| V-4 | **Micros y combis**: "el próximo sale a las 14:10" | Trabajo humano (no hay horarios en internet) | Bajo | Fecha de la última revisión |
| V-5 | **Rutas 226 y 55 hoy, más niebla** | Open-Meteo accesible; **Vialidad bloqueada (404)** | Medio | "Pronóstico de niebla", nunca "hay niebla" |
| V-6 | **Mi barrio**: recolección, cortes y obras por zona | Trabajo humano | Medio | Quedar desactualizado |
| V-7 | **En simple**: versión de lectura fácil de las notas de Balcarce | Especulación sobre el uso; técnicamente posible | Medio | Que simplificar cambie el sentido |
| V-8 | **Qué pasó con…**: temas vivos con línea de tiempo (Cooperativa, autódromo) | Datos propios (archivo) | Medio | Atribuir siempre |
| V-9 | **Archivo permanente liviano**, "Hace un año en Balcarce" y buscador Pagefind | Datos propios | Medio | Las retiradas nunca vuelven |
| V-10 | **Mapa de la semana** (notas por localidad) | Datos propios + IA saca el lugar | Medio | En Policiales solo el barrio |
| V-11 | **Canasta Radar mensual** (10 productos en 3 comercios) | Trabajo humano | Medio | Mismo comercio y producto cada mes |
| V-12 | **"Rincones"**: ficha y novedades de cada localidad, con un vecino enlace | Trabajo humano | Medio | — |
| V-13 | **Dónde comer en Balcarce** (para la Fiesta del Postre y siempre) | Trabajo humano (confirmar por teléfono) | Bajo | Solo lo confirmado ese día |
| V-14 | **Perdidos y encontrados** semanal | Trabajo humano | Bajo-medio | Ley 25.326 |
| V-15 | **¿Es cierto?**: chequeo de rumores y estafas locales (se apoya en Pistas) | Trabajo humano | Medio | — |
| V-16 | **Guía de comercios** (`/guia`, por rubro y localidad, "abierto ahora") | Datos propios (mapa comercial) + confirmación | Medio | Separar lo de OpenStreetMap de lo confirmado |

---

#### De la tercera auditoría externa (8/10)
- **Clima por horas** en `/clima` (hoy muestra "ahora" y la semana). Open-Meteo ya da el dato por hora.
- **Mapa chico de la farmacia de turno** en `/farmacias`, dibujado al armar el sitio (sin cargar mapas de afuera).
- **El repaso como formato central:** la misma pieza en la web (con audio), reel, WhatsApp y mail.
- **Datos para Google del video** (VideoObject), cuando el audio y el video estén en la web.

### 7. Redes: formatos nuevos

*Ninguno gasta cupo de voz. Todos, salvo R-5, chocan con la regla de Instagram (sección 2, punto 1).*

| Id | Idea | Estado | Trabajo | Cuidado |
|---|---|---|---|---|
| R-1 | **La semana en datos** (carrusel del domingo). Arma el **motor de carruseles** que usan R-2, R-7, R-11 y R-13 | Datos propios | Medio, una vez | La API de Instagram permite 10 placas, no 20 |
| R-2 | **Balcarce, ayer y hoy** (foto vieja y la misma esquina hoy) | Trabajo humano (Museo o Archivo) | Bajo | Permiso escrito de la foto vieja |
| R-3 | **La pregunta del lunes** (encuesta en historias) | Trabajo humano: la API no pone stickers, 1 minuto a mano | Bajo | Nunca preguntas políticas; veda electoral |
| R-4 | **Colaboraciones** con cuentas de acá (el posteo sale en las dos) | Fuente accesible (API de colaboradores) + persona consigue el sí | Bajo | Mismo trato para todos; nunca partidos |
| R-5 | **Desde el predio**: eventos con una persona (Postre, autódromo, Juegos) | Trabajo humano | Alto durante el evento | Chicos en la multitud; regla de "en vivo" |
| R-6 | **La foto de la semana** (de vecinos, se vota) | Trabajo humano | Bajo | Cesión escrita; llena el banco de fotos |
| R-7 | **La hoja de la semana** (letra grande, para mayores) | Datos propios | Bajo | "Vale del … al …" |
| R-8 | **Lectura fácil semanal** | Trabajo humano valida | Medio | Pictogramas ARASAAC no comerciales |
| R-9 | **Texto alternativo automático** en tarjetas y reels | Fuente accesible (la API lo acepta desde 03/2025) | Bajo | No inventar descripciones |
| R-10 | **Cortina sonora propia** (músico de Balcarce) | Trabajo humano + pago único | Bajo | Licencia para todas las plataformas |
| R-11 | **Cómo funciona Balcarce** (explicadores, cada 15 días) | Trabajo humano | Medio | Fuente oficial |
| R-12 | **Camino al 57** (hacia los 70 años del título de Fangio) | Fuente accesible (Jolpica) + Museo | Medio | Derechos de las fotos |
| R-13 | **El finde en 5 placas** (viernes 18 h) | Datos propios | Bajo, con R-1 | "A confirmar" |
| R-14 | **Voxpop "La pregunta de la semana"** (voz humana, 30 s) | Trabajo humano | Bajo | Consentimiento |
| R-15 | **Entrevista de 5 minutos** semanal (audio humano + nota) | Trabajo humano | Medio | — |
| R-16 | **Repaso semanal temático** en lugar de uno de los tres diarios (lunes agro, jueves cultura, sábado deporte local) | Datos propios | Bajo | Reemplaza, no suma voz |

**Lo que dicen las plataformas** (solo búsqueda, a confirmar):
- En Argentina, Facebook sigue primero (38 %) e Instagram cerca (35 %).
- Instagram premia los **envíos por alcance**, o sea, lo que se reenvía a los grupos de WhatsApp.
- Reels de prueba (para no seguidores) por la API: piden 1.000 seguidores.
- Grupos de Facebook: Meta cerró la publicación automática en abril de 2024.

#### Redes: el plan completo, en un solo lugar (decidido el 8/10)

Junta lo que se decidió para las redes. El detalle de cada parte está más abajo en esta misma sección.

| Qué | Cómo queda | Estado |
|---|---|---|
| **Videos animados** | Ninguna pieza con imagen fija: todas con movimiento, subtítulos de la voz en la misma franja y una sola estética. Hay ejemplos de nota con foto, clima (lluvia y día lindo), repaso, farmacia (una, dos y tres de turno), participá, efeméride y feriado | **Hecho el 8/10 (regla 145):** entrada animada de cada bloque, cifras que cuentan y barra de avance en todas las piezas. Falta repasar juntos cada animación |
| **Feriados** | Animación y dato propios para cada feriado; el dato lo elige el criterio del medio | Aprobado |
| **Dónde sale cada pieza** | **Facebook:** clima y farmacia también como reel. **Instagram:** clima y farmacia solo como historia. **Lo demás con voz:** reel en las dos redes y el mismo video como historia | **Hecho el 8/10 (regla 147).** Se mide 4 semanas |
| **Locución con memoria del día** | Cada guion sabe cómo está el día, qué saludo ya se usó y qué viene después: nada de tres "buenas noches" seguidos | **Hecho el 8/10 (regla 146):** el saludo se dice una vez por franja y las piezas siguientes empiezan con un puente |
| **Aviso de voz con IA** | Una línea de texto en el posteo, sin la etiqueta visual de Meta | Aprobado (`MEJORAS.md` C-9) |
| **Historias y reels, para qué** | Para lo más relevante. Los posteos de notas, para llevar gente a la web | Aprobado |
| **Una historia que lleve al posteo de la nota** | Para evaluar, sin cargar de más | Para decidir |
| **Guardar lo que se genera** | Audio y video de cada pieza guardados; se reusan como notas con audio en la web y en el podcast | Aprobado (Q1) |
| **TikTok** | A mano primero; después a la bandeja; al final automático | Aprobado |
| **Voces** | Se sigue con Gemini; las demás quedan abiertas | Aprobado |

#### Videos con movimiento (idea nueva, con ejemplos)

Hoy los reels son una placa fija con los subtítulos abajo. Se armaron **tres ejemplos** (sin voz, solo para
mirar, el 8/10) con las mismas letras y colores del sitio:

1. **Nota con foto:** la foto con un zoom lento, el nombre de la sección que entra de costado, el título que
   aparece línea por línea, subtítulos que marcan la palabra que se dice y una barra de avance abajo.
2. **Clima animado:** la temperatura que sube hasta el valor, lluvia suave de fondo si llueve, y las barras de
   máxima y mínima de cada día que crecen de a una.
3. **Repaso con transiciones:** cada titular con su foto, el paso de uno a otro deslizando, y puntos arriba que
   dicen en cuál de los tres vas.

**Cómo se hacen:** cuadro por cuadro con las mismas herramientas que ya usa el proyecto (resvg para dibujar y
ffmpeg para juntar). No suma nada nuevo para instalar ni gasta voz: la voz es la misma de hoy, encima.
**Costo:** US$ 0. Tarda más en armarse (unos 3 minutos para 28 segundos de video en esta prueba, a 720 de
ancho; en GitHub sería parecido) y hay que medir que no atrase los horarios.
**Otras formas:** Remotion (gratis hasta 3 personas, más fácil para animaciones complejas) o efectos simples
de ffmpeg (zoom y fundidos, más rápido pero menos control).
**Cuidado:** el movimiento no puede tapar el crédito de la foto ni la marca de la sección; nada de música sin
licencia; en Policiales sigue sin haber foto real.
**Estado:** técnica comprobada con los ejemplos. **Les gustó (8/10).** Decidido:
- **Ninguna pieza queda con la imagen fija**: todas llevan alguna animación, porque tienen voz.
- **Todas llevan los subtítulos de la voz**, siempre en la misma franja (arriba del pie), con el mismo estilo
  de hoy: la palabra que se dice en rojo. Los ejemplos ya los muestran así.
- **Una sola estética para todas:** mismas letras, colores, pie y barra de avance.
- **La semana que viene** se unifican los criterios, se repasan todas las piezas y se elige la animación de
  cada una. Falta medir cuánto tarda en armarse en GitHub.
- **Segunda tanda de ejemplos (8/10):** clima con día lindo (sol que sale, nubes que pasan), farmacia de turno
  (una cruz verde que entra y late, el marcador de la dirección y los próximos días), participá (el número que
  se escribe solo, el globo de chat y el sobre del mail que se abre), efeméride (el año que corre hacia atrás
  hasta el del hecho, y "Y además" de a uno) y feriado (la hoja del calendario que pasa del 11 al 12, y un dato
  del censo que cuenta). Todos con subtítulos y la misma estética. Los íconos son dibujos propios y genéricos:
  ningún logo de marca (tampoco el de WhatsApp).
- **Tercera tanda (8/10):** farmacia con **dos y tres de turno** (una ficha por farmacia, cada una entra de un costado);
  feriado rehecho con el dato que **de verdad** sale el 12/10 (Colón, 1492, con una carabela que cruza); el clima
  **sin decir de dónde salen los datos** (eso va en la nota, no en la placa).
- **Feriados, decidido (8/10):** cada feriado tiene su animación y su dato propios (una fecha patria no es igual
  a un feriado religioso o a uno trasladable). **Los datos del feriado los elige el criterio editorial del medio**,
  que es de centro-derecha: la historia de la fecha y sus hechos, no estadísticas que no van con esa línea (el
  dato del censo que se usó en el primer ejemplo **no va**; en la pieza real del 12/10 no estaba: sale solo el
  dato de Colón). Hay que escribirlo en `CRITERIO-REDES.md` y revisar el campo "enfoque" de cada feriado en
  `web/data/feriados-piezas.json`.
- **El ejemplo de nota con foto** no corresponde a una pieza de hoy: las notas salen como posteos, no como
  reel ni historia. **Queda para evaluar** una historia que lleve al posteo, sin cargar de más: **las
  historias y los reels son para lo más relevante; los posteos, para llevar gente a la web** (8/10).

#### Historias contra reels: qué conviene (análisis del 8/10)

**Hoy:** los tres repasos (10, 15 y 21) salen como reel y como historia; todo lo demás (clima de la mañana y de
la noche, farmacia, efeméride, feriado, participá, útiles, agenda) sale **solo como historia**.

**Lo que pesa más que todo:** una historia la ve **solo quien ya sigue la cuenta**, y hoy son 7 seguidores en
Facebook y 4 en Instagram. Un reel, en cambio, Meta se lo muestra a **gente que no sigue la cuenta**. Por eso
los reels tienen muchas más reproducciones, como vieron en Facebook. Con tan pocos seguidores, casi todo lo que
sale solo como historia **no lo ve nadie**.

**Recomendación:**
1. **Todo lo que tiene voz, como reel**, y el mismo video también como historia. No gasta voz extra: es el mismo
   archivo publicado dos veces.
2. **El clima y la farmacia como reel también.** Sirven todos los días y son lo más compartible. El reel queda
   en el perfil: la fecha tiene que estar grande y clara, para que nadie lea un clima viejo como de hoy.
3. **Instagram con un poco más de cuidado:** su perfil se llena de piezas diarias que vencen. Se puede probar
   todo como reel en Facebook (donde están las visitas) y, en Instagram, reel para repasos, efeméride, feriado
   y clima de la mañana, e historia para farmacia y participá.
4. **Medirlo en serio, 4 semanas:** alcance y reproducciones de cada pieza, separando seguidores y no
   seguidores (M3-4-7 en `MEJORAS.md`; la llave de Meta ya tiene permiso para leer esas estadísticas). Después
   se decide pieza por pieza.

**Lo que quedó (8/10, con lo que ven Hernán y Andrés en Facebook):**
- **Facebook:** clima y farmacia también como reel. Ahí la gente los mira mucho y suman alcance.
- **Instagram:** clima y farmacia solo como historia, para no llenar el perfil de piezas que vencen.
- **Todo lo demás con voz** (repasos, efeméride, feriado, participá): reel en las dos redes y el mismo video como
  historia.
- Se mide 4 semanas y se ajusta pieza por pieza.

**Límites que no molestan:** Facebook acepta hasta 30 reels por día por la API; hoy un día normal tiene unas 10
piezas.

#### Una locución que sepa qué se dijo antes (aprobada el 8/10: se hace pronto, ver `PRIORIDADES.md`)

**El problema:** cada pieza se arma sola, así que de noche pueden salir tres seguidas que empiezan "Hola, buenas
noches", y ninguna sabe que llovió todo el día.

**La idea:** una "memoria del día" que cada guion consulta antes de armarse:
- **Cómo está el día:** si llueve, hace frío, calor o hay alerta, el guion lo puede nombrar ("en esta noche de
  lluvia, les paso el repaso").
- **Qué se dijo antes:** el saludo usado no se repite en el mismo día; la segunda pieza de la noche ya no saluda
  igual ("Seguimos con…", "Y para cerrar el día…").
- **Qué viene después:** cerrar con un adelanto ("a las 21, el repaso de la noche").

**Cómo:** con el mismo código que arma hoy los guiones (`redes/guiones.mjs`), con frases armadas y verificables,
sin IA para inventar. El libro de redes ya anota qué salió y a qué hora. No gasta voz extra.
**Cuidado:** que la referencia al clima sea cierta (sale de los datos del día) y que nunca se mezcle con
Policiales o Política. **Trabajo:** 1 o 2 días, con pruebas de que no se repita un saludo en el mismo día.

#### Podcast, YouTube y TikTok (RS)

| Id | Idea | Estado | Trabajo | Lo que hay que saber |
|---|---|---|---|---|
| RS-0 | **Decidir el camino** y leer las reglas de cada plataforma sobre voces de IA | — | Persona | Antes de invertir tiempo |
| RS-1 | **Reproductor de audio en la nota del repaso** | Datos propios; depende de guardar el mp3 (Q1 en `MEJORAS.md`) | 2-3 días | Hoy el mp3 se descarta |
| RS-2 | **Feed de podcast** y alta gratis en Spotify y Apple | Solo búsqueda (reglas) | 1 semana | Spotify retira lo que imita voces reales (19/05/2026): avisar que es IA. Episodios de 55 s son cortos: uno diario que junte los tres |
| RS-3 | **Reels en YouTube Shorts** | Solo búsqueda | Medio | Un proyecto sin auditar sube **en privado**; hay que pasar una auditoría de Google, o subir a mano |
| RS-4 | **Reels en TikTok** | Solo búsqueda | Medio | Una app sin auditar publica **en privado**; la auditoría lleva 2 a 6 semanas; o a la bandeja y se termina a mano |

**Todo lo que se genera, guardado y aprovechado (pedido el 8/10):**
- Guardar el audio y el video de cada pieza (Q1 en `MEJORAS.md`), porque hoy se pierden.
- **Notas propias con audio:** por ejemplo, el clima del día como nota en la web, con su audio, su texto y los
  enlaces al reel en Facebook e Instagram. Lo mismo para la farmacia, la efeméride y los repasos.
- **Dos canales RSS bien armados:** uno de texto (todas las notas, con el cuerpo) y uno de audio (el podcast),
  que es el que leen Apple Podcasts y Spotify para sumar episodios.
- **¿Audio para el 100 % de las notas? Recomendación (8/10): no, por ahora.**
  - No mejora la posición en Google (lo dijo gente de Google en 2021 y en 2025).
  - Obliga a usar otra voz, distinta de la de las redes.
  - Suma trabajo y cosas que pueden fallar.
  - **Sí conviene** el audio en lo que **ya tiene voz** (clima, farmacia, efeméride, feriado y repasos), como nota en
    la web y en el podcast: no gasta nada más.
  - Si más adelante quieren audio en las notas de Balcarce, estas son las opciones:
  - **Edge TTS:** usa las voces de lectura en voz alta de Microsoft Edge, que tienen voces argentinas
    (Elena y Tomás). Es gratis, pero no es un servicio oficial: puede cortarse sin aviso y sus condiciones no
    contemplan el uso comercial.
  - **Azure Speech** (el servicio oficial de Microsoft, con las mismas voces argentinas): tiene un plan
    gratis por mes (a confirmar la cantidad); alcanzaría para las notas de Balcarce, no para todas.
  - En cualquier caso es una voz distinta de la de las redes: hay que decidir si se acepta.
- **SEO y que todo esté bien indexado:** sitemap, datos para Google, RSS y Search Console (ver V2-13, V2-11 y
  RSS-1 en `MEJORAS.md`).

**TikTok, el camino propuesto** (Hernán y Andrés: "a mano o lo que haga falta"):
1. **Ya, a mano:** el mp4 de cada reel queda como adjunto en GitHub (3 días; con Q1, más). Una persona lo baja
   y lo sube desde la app de TikTok, marcando "contenido generado con IA". Unos 2 minutos por video.
2. **Después, a la bandeja:** con una app de TikTok con la revisión básica, el robot deja el video en la bandeja
   de la cuenta y una persona solo toca "publicar". Pide crear la app y una persona que la registre.
3. **Al final, automático:** pasar la auditoría de TikTok (2 a 6 semanas, con video de demostración). Recién
   ahí se publica solo y en público.

---

### 8. Distribución y audiencia

**Datos que cambian lo que estaba anotado** (solo búsqueda):
- **Google Noticias** ya no tiene trámite de alta: incluye solo a los sitios que cumplen sus reglas
  (política editorial, firma y datos estructurados).
- **El Perfil de Empresa de Google** pide atención en persona: Radar casi seguro no califica.
- **Los canales de WhatsApp no tienen API oficial** para publicar. Las herramientas que lo hacen arriesgan
  el número.

| Id | Idea | Estado | Trabajo | Cuidado |
|---|---|---|---|---|
| D-1 | **Para pegar hoy**: un botón del panel que arma el texto del día para el canal de WhatsApp y los grupos de Facebook; una persona lo pega a las 7:30 | Datos propios | Bajo | Sin Política ni Policiales; reglas de cada grupo |
| D-2 | **Canal de WhatsApp de Radar** (farmacia y resumen), a mano | Trabajo humano | Bajo | Un mensaje por día |
| D-3 | **Boletín por correo "Balcarce a las 7"** (Brevo: 300 por día gratis) | Fuente accesible, sin probar | Medio | Datos personales: confirmación y baja |
| D-4 | **Bot y canal de Telegram** (`/farmacia`, `/clima`) | Fuente accesible, sin probar | Bajo-medio | Poco usado en Argentina: es un laboratorio |
| D-5 | **Avisame**: avisos del navegador por tema (corte de ruta, alerta, clases) | Solo búsqueda | Medio | En iPhone, solo con la página instalada |
| D-6 | **Lo que buscan y no encuentran** (Search Console, una página fija por búsqueda) | Depende de conectar Search Console | Bajo | "Confirmado el DD/MM" |
| D-7 | **Radar en la radio**: regalar el repaso a una FM a cambio de una mención | Especulación (que acepten) | Bajo | Algunas radios también son fuentes; decir que es IA |
| D-8 | **Alianza con clubes**: mandan resultados, reciben placa y colaboración | Trabajo humano | Medio | Mismo trato para todos |
| D-9 | **Mapa de Medios Bonaerenses** (Potencia Medios, formulario gratis) y Registro Oficial de Medios | Solo búsqueda | Bajo | Confirmar que siga vigente |
| D-10 | **Capacitaciones gratis** (Potencia Medios 2026, FOPEA y Google) | Solo búsqueda | Bajo | — |
| D-11 | **Fondos** (Impulso Local de ADEPA, ICFJ y Meta; programas de Google) | Solo búsqueda: hoy no hay convocatoria abierta confirmada y pedían más de un año publicando | Medio | Anotarse en los avisos de ADEPA, FOPEA y SembraMedia |
| D-12 | **El reclamómetro**: reclamos de vecinos con estado y seguimiento | Trabajo humano todos los días | Medio | Caras, patentes y uso político |
| D-13 | **La pregunta de los vecinos**: la gente vota una pregunta y se le hace al funcionario | Trabajo humano | Bajo | Preguntar a todos los bloques por igual |

---

### 9. Comercial: planes baratos y no invasivos

*Detalle y fuentes en la investigación comercial del 8/10. **Todos los precios son estimación** y los
deciden ustedes.*

#### Referencias encontradas (solo búsqueda)

- No apareció ningún tarifario de un medio de Balcarce ni de una ciudad parecida. **El dato que más sirve
  se consigue preguntando a 2 o 3 comercios cuánto pagan hoy en la radio.**
- **Una FM chica:** $50.000 por mes (2 salidas diarias) a $112.000 (8 salidas).
- **Rotativos de radio:** $150.800 a $422.500 por mes; 10 % menos por 3 meses y 20 % menos por 6.
- **Facebook Ads:** con US$ 1 por día son unos $45.000 por mes, más 21 % de IVA y 30 % de percepción con
  tarjeta. Es el piso contra el que compite cualquier plan.
- **Un café:** ~$3.200.
- **Aportes de lectores:**
  - Cafecito se queda con ~5 %.
  - Mercado Pago con link: 6,6 % al instante o 1,56 % a 35 días, más IVA.
- **Monotributo categoría A:** tope de ~$12 millones por año (agosto 2026 a enero 2027). Confirmar con un
  contador.

**Lectura:** cobrar **por lugar y por tiempo**, nunca por cantidad de vistas; claramente por debajo de la
radio; ajustar cada 3 meses por inflación.

#### La escalera de planes

Arranca en "un café por semana" y lo básico es siempre gratis. **Los montos propuestos y la estrategia de
lanzamiento no van en el repositorio público**: están en el documento privado de la investigación.

**Reglas para todos los planes:**
- Exclusividad por rubro del escalón 2 al 5.
- Nunca en Política ni Policiales.
- Una farmacia no auspicia la farmacia de turno.

| # | Plan | Qué incluye |
|---|---|---|
| 0 | **Ficha gratis** | Nombre, rubro, dirección, horario, WhatsApp y redes en la guía |
| 1 | **Vecino destacado** | Primero en su rubro y localidad, 3 fotos y una oferta por semana |
| 2 | **Presentado por** | Una línea en un servicio útil (clima, agenda, teléfonos útiles) en la web y en la voz que ya sale, sin audio extra |
| 3 | **Vidriera** | Aviso fijo en la web, más una mención por semana en un repaso, más el plan 1 |
| 4 | **Auspicio de sección** | "Agro, con el apoyo de…" en la sección, sus historias y su parte semanal |
| 5 | **Socio** | Todo lo anterior, una nota "Contenido patrocinado" por trimestre, el premio de la trivia y un informe mensual |

**Extras:**
- Historia propia.
- **Evento destacado** para organizadores: página del evento, historia y lugar en el boletín, rotulado
  "Publicidad". La agenda sigue gratis para todos.
- **Clasificados de vecinos:** gratis siempre; destacado pago para inmobiliarias y concesionarias.
- **Canje:** vale para el premio de la trivia, nunca para una nota.

#### Formas gratis de traer auspiciantes y público

| Id | Vía | Estado | Impacto |
|---|---|---|---|
| K-1 | **"Presentado por" en clima y agenda** (escalón 2) | Datos propios; código chico | Alto |
| K-2 | **Guía gratis con mejora paga** (V-16) | Datos propios + confirmación | Alto |
| K-3 | **Cartel QR** en comercios (V-3): reparto gratis y auspicio a la vez | Trabajo humano | Alto |
| K-4 | **Ofertas de la semana**: una oferta gratis por comercio | Trabajo humano | Medio |
| K-5 | **Concurso "La foto del mes"**: el premio lo pone un auspiciante y las bases dan licencia para el banco de fotos | Trabajo humano | Medio-alto |
| K-6 | **Convenio con la Cámara de Comercio**: guía gratis para socios a cambio de la lista, 20 % menos para socios | Especulación (que acepten) | Alto |
| K-7 | **Aportes de lectores** ("Bancá a Radar") con Cafecito y alias | Solo búsqueda | Bajo hoy |
| K-8 | **Pauta oficial con reglas públicas**: misma tarifa que un comercio, rotulada, tope de ingresos (20 o 30 %), lo cobrado publicado en "Quién nos paga" | Decisión | Medio, con riesgo de independencia |
| K-9 | **Servicios digitales a comercios** (webs, redes), que ya están en el catálogo | Trabajo humano | Alto en plata |
| K-10 | **Contenido de marca con la herramienta de Meta** ("colaboración pagada") | Solo búsqueda | Hace visible y legal lo pago |
| K-11 | **Relevar el centro con Every Door** (app gratis que carga cada comercio en OpenStreetMap) y preguntar "¿te sumamos gratis?" | Trabajo humano, ~2 h por semana | Alto para el mapa |
| K-12 | **Pedir el padrón de habilitaciones** al Municipio (o por el Concejo) | Especulación (ley provincial dudosa para municipios) | Medio |

#### Plan de 90 días (propuesto)

| Cuándo | Qué | Quién |
|---|---|---|
| 8 al 12/10 | Fiesta del Postre: confirmar fechas con Turismo, 50 volantes QR, "Dónde comer" solo con lo confirmado | Personas (+ código) |
| Semana 1 | Sacar el seguimiento comercial del archivo público (C-8 de `MEJORAS.md`) | Código |
| Semanas 1-2 | Página `/publicidad` con los planes, las reglas y los números reales; fijar precios; preguntar a 3 comercios; consulta con un contador; Mapa de Medios Bonaerenses | Personas + código |
| Semanas 1-4 | Relevar el centro con Every Door; reimportar el mapa con todas las localidades | Personas + código |
| Semanas 3-4 | Ofrecer los primeros planes; "presentado por" en la voz y la tarjeta; `/guia` en prueba | Personas + código |
| Mes 2 | Reunión con la Cámara; QR en 10 comercios; botón de aportes; Ofertas de la semana | Personas + código |
| Mes 3 | Informe mensual por ficha (vistas de Cloudflare); primeros cobros; concurso de la foto | Personas + código |

#### Riesgos legales y decisiones

1. **Facturación:**
   - Publicidad es un servicio y entra en el monotributo con factura C.
   - Si arman una SAS, salen del monotributo.
   - Lo decide un contador.
2. **Sorteos:** la Ley 22.802 prohíbe condicionarlos a una compra. Mientras no se confirme qué pide la
   Lotería de la Provincia, hacer **concursos de habilidad** (trivia, foto) con bases publicadas.
3. **Lo patrocinado se rotula siempre:** "Espacio publicitario" y "Contenido patrocinado". El Código Civil
   prohíbe la publicidad engañosa.
4. **Datos de los comercios:**
   - Sí: nombre del local, rubro, dirección, teléfono comercial y de dónde salió cada dato.
   - No: nombre del dueño, DNI ni celular personal sin permiso.
   - En cada mensaje, el derecho a pedir la baja.
5. **Quién hace el trabajo de calle:** relevar, moderar los clasificados y atender el canal.

---

### 10. Herramientas gratis de código abierto (GitHub)

*Nada de esta lista está cerrado: lo descartado es "por ahora" y se puede volver a mirar.*

*Investigado el 8/10. Estrellas, fecha del último cambio y licencia, comprobados en GitHub ese día.
Condiciones y límites de los servicios, solo por búsqueda. Tiempos de ejecución: estimados, nada se
probó. Las que reemplazan algo que ya existe también están en `MEJORAS.md` (sección "Herramientas").*

**Cómo leer la licencia:**
- **MIT, Apache o BSD:** se puede usar todo, también para un medio comercial.
- **GPL o AGPL:** obliga a abrir el código propio si se mete adentro.
- **NC:** no permite uso comercial.

#### Las 10 de más valor por esfuerzo

| # | Herramienta | Qué hace | Dónde entra | Licencia | Encaje |
|---|---|---|---|---|---|
| 1 | **`loudnorm` de ffmpeg** | Todas las piezas con el mismo volumen (−14 LUFS) | `reels/reel.mjs` (hoy no se normaliza) | Ya instalado | Una línea, 1-3 s por pieza |
| 2 | **Healthchecks.io** | Avisa si un robot deja de correr (aunque cron-job.org lo haya apagado) | Un `curl` al final de cada workflow | BSD-3; servicio gratis hasta 20 controles | Sin dependencias |
| 3 | **Pagefind** | Buscador de todo el archivo, sin servidor | `web/components/buscador.js` (hoy 36 horas y 27 KB repetidos en cada página) | MIT | Un paso después del armado |
| 4 | **ntfy** | Avisos al celular sin el riesgo de bloqueo de CallMeBot | `redes/avisos.mjs` | Apache-2.0; servicio gratis | Un `fetch`; el canal va en Secrets |
| 5 | **lychee** | Enlaces e imágenes rotas en todo el sitio | Auditoría de los lunes | Apache-2.0 | Programa aparte, 1-2 min |
| 6 | **smartcrop + sharp** | Recorte inteligente (sin cabezas cortadas) y fotos WebP más livianas | `web/lib/tarjeta.js`, `web/scripts/achicar-foto.mjs` | MIT y Apache-2.0 | En `web/` |
| 7 | **tesseract.js** (leer texto en fotos) | Segunda red contra marcas de agua: busca nombres de medios o ".com" en los bordes | `web/scripts/fotos-notas.mjs`, antes del banco | Apache-2.0 | 1-3 s por foto, sin cupo de IA |
| 8 | **trafilatura** | Extrae el texto limpio de una nota | Plan B de `ingesta/articulo.mjs` (21 de 23 fallas del 25/09 fueron del extractor) | Apache-2.0 | Paso en Python aparte que deja un JSON (no rompe la regla de `ingesta/`) |
| 9 | **whisper.cpp** | Ubica cada palabra en el audio: subtítulos que no "van a los tumbos" | `reels/alinear.mjs`, `reels/tiempos.mjs` | MIT | Programa aparte, modelo de 150 MB en caché |
| 10 | **Detección de caras (YuNet o MediaPipe)** | Freno por código: cara reconocible en Policiales, o en nota con palabras de menores, va placa | `web/scripts/fotos-notas.mjs` (cubre el pendiente de chicos en notas amarillas) | Apache-2.0 | Menos de 0,1 s por foto. **No estima edades** |

**Después:**
- **actionlint + Dependabot:** revisan los workflows y actualizan solas las acciones (MIT).
- **Vega:** gráficos SVG sin navegador, para "Balcarce en números", el dólar o el clima (BSD-3).
- **LanguageTool:** una segunda opinión de ortografía que no es IA, para la auditoría (LGPL). El servicio
  público prohíbe el uso automático: va con un servidor propio dentro del workflow.
- **pa11y-ci:** pruebas de accesibilidad semanales (LGPL).
- **Leaflet + PMTiles:** mapas con el mapa de Balcarce en un solo archivo, sin servidor (BSD). Para la
  guía y las farmacias.
- **Remotion:** reels animados escritos como página web. Es gratis con uso comercial hasta 3 personas; con
  4 o más se paga.

#### Solo como idea

- **Satori:** placas nuevas con el mismo diseño que las tarjetas.
- **Datasette:** datos navegables en la web.
- **RSS-Bridge:** RSS para instituciones que no tienen.
- **changedetection.io:** vigilar páginas; mejor hacerlo con "git scraping" en Actions.
- **city-scrapers y civic-scraper:** modelo para "Lo que pasó en el Concejo".
- **Comparar por significado** (embeddings con transformers.js): juntaría "choque" con "accidente" en el
  cruce.
- **rembg:** quitar el fondo, solo con fotos propias.
- **auto-archiver de Bellingcat o la Wayback Machine:** guardar copia de lo que llega a Pistas.
- **Meedan Check:** verificación con línea de WhatsApp.
- **Kokoro:** voz de ensayo solo para medir tiempos sin gastar cupo, nunca para publicar.

#### Ideas de otros medios para copiar

- **RADAR, de PA Media (Reino Unido):** plantillas con datos públicos que arman la misma nota para cientos
  de distritos, revisadas por personas. Es el molde COM-1.
- **City Bureau Documenters (Chicago):** lectores automáticos de actas más vecinos que toman notas.
- **Git scraping** (Simon Willison): bajar una página cada tanto desde Actions y guardarla en git, para
  ver qué cambió.

#### Descartadas por ahora

- **Licencia que no conviene:** aeneas, whisper-timestamped y RSSHub (AGPL).
- **Voces gratis (Piper, Kokoro, sherpa-onnx) y ElevenLabs:** no están descartadas. Por ahora se sigue con
  Gemini (decisión del 8/10). Hernán y Andrés
  dijeron (8/10) que las voces siguen abiertas a cualquier cambio. Hoy chocan con la regla "la voz no se
  cambia", que también se puede revisar; quedan para evaluar escuchándolas (las voces en castellano de Kokoro
  no son rioplatenses).
- **Pesadas o abandonadas:** WhisperX, stable-ts, FFCreator, MoviePy, LAION Watermark y Human (que
  además estima edades, algo que no sirve para decidir).
- **Necesitan servidor:** Uptime Kuma, ArchiveBox, listmonk y Apprise (no hace falta).
- **Van contra las reglas de la plataforma:** tiktok-uploader, que maneja la sesión con un navegador.
- **Chequeado:** no tiene código público que se pueda usar.

### 11. Ranking general (valor sobre esfuerzo, con datos reales)

1. **ECO-1 La nafta en Balcarce:** comprobado al 7/10, automática y sin IA.
2. **AUT-1 TC con Mangoni:** comprobado, con el molde de F1 ya hecho.
3. **POL-1 La plata que manda la Provincia:** comprobado, mensual y sin IA.
4. **AGR-1 Balcarce en el mapa agrícola:** comprobado, un dato oficial del partido que nadie publica.
5. **D-1 Para pegar hoy:** ataca Facebook y WhatsApp, que es de donde viene casi todo el público.
6. **K-1 + V-3 "Presentado por" y QR:** el primer producto comercial, sin depender del tráfico.
7. **POL-3 Así vota Balcarce:** comprobado; se hace una vez y vale hasta 2027.
8. **BAL-1/ARG-1 La semana del bolsillo:** una razón para volver cada semana (trabajo humano).
9. **EDU-1 ¿Hay clases?:** una razón diaria (trabajo humano).
10. **DEP-1 Juegos Bonaerenses:** por fecha, lista antes del 19/10.
11. **R-1 Motor de carruseles + R-13 El finde en 5 placas:** si cambian la regla de Instagram.
12. **COM-4 Lector de boletines:** una pieza para tres secciones (fuentes accesibles).

### 12. Descartadas por ahora (y por qué)

*Ninguna está cerrada: si cambia algo, se vuelven a mirar.*

- **Cargos docentes del día (ABC):** piden usuario del portal.
- **Resultados de Aprender por distrito:** solo hay por provincia.
- **Cine local:** no hay sala en Balcarce.
- **Bases con una fila por víctima, búsquedas de personas, listas de detenidos:** chocan con el semáforo.
- **Soccerway y Sofascore:** no publican condiciones de uso.
- **Mistral para redactar:** exige aceptar que entrene con los datos.
- **Publicar automático en grupos de Facebook o canales de WhatsApp:** no hay API; arriesga la cuenta.
- **AdSense ahora:** paga centavos y mete scripts de terceros (ver C-2 en `MEJORAS.md`).
- **De las auditorías externas:**
  - **GA4 con banner de cookies:** mete scripts de terceros.
  - **Publicidad política (Spot-On) y nativa (MGID):** chocan con la neutralidad y con "nada de terceros".
  - **Video generado por IA (LTX):** inventa imágenes.
  - **Cambiar las direcciones a /año/mes/día:** rompe enlaces.
  - **Pasar a WordPress o Astro:** el armado actual funciona.
- **Perfil de Empresa de Google:** pide atención en persona.

### 13. Decisiones que necesitan a Hernán y Andrés

1. Las reglas de la sección 2: Instagram sin voz, "en vivo" con una persona, aviso de voz de IA.
2. Confirmar que **Santiago Mangoni** es de Balcarce y escribirle a la ACTC (AUT-1).
3. Confirmar si **"Campo de Pato"** es el Club Social Pato (DEP-2).
4. Pagar TheSportsDB o pedir permiso (FUT-2).
5. Cuáles secciones nuevas, en qué orden, y si Salud espera a una persona.
6. Quién llena cada planilla y quién hace los pedidos mensuales (Liga, clubes, Bomberos, bibliotecas, Salud).
7. Los precios y la estrategia de lanzamiento; quién factura; la pauta oficial (sí o no, con qué tope).
8. Quién pega "Para pegar hoy" cada mañana y quién atiende el canal de WhatsApp.
9. El camino para YouTube, TikTok y Spotify (RS-0).

## Ideas del 15/10

- **Newsletter por mail para el público** (idea de Hernán, para más adelante, después de la auditoría final). Se puede hacer desde la misma cuenta de Cloudflare: "Email Sending" (en beta, entra en el plan Workers Paid que ya pagamos) permite mandar desde un Worker a cualquier destinatario. Lo que hay que sumar: formulario de suscripción en la web, lista de suscriptores (KV o D1), botón de baja en cada mail, confirmación de la suscripción (doble opt-in), y cuidar que no caiga en spam (SPF/DKIM del dominio). Contenido posible: el resumen de la mañana con las 5 notas principales, la farmacia de turno y la agenda del fin de semana. Antes de armarlo, mirar qué dice la ley de datos personales para listas de correo.
- **Informes por mail para Hernán y Andrés, 1 o 2 por día** (en marcha el 15/10). Telegram como canal extra: ver después si sirve.
- **Podcast largo de 10 minutos con discusión de temas, partido luego en reels** (idea de Hernán, 16/10). Dos caminos para más adelante: (1) NotebookLM de Google (gratis; charla de dos voces en español, con formatos de resumen, crítica y debate; no tiene API pública para automatizarlo, se arma a mano; ver los límites diarios y los términos de uso de lo generado antes de usarlo en serio); (2) algo propio: un guion de charla escrito a partir de las notas del día y leído con las voces propias del medio, que sí se automatiza y se parte en reels con el mismo sistema de videos. Por ahora, manual y de a poco.
- **Clonar voces** (probado en octubre): se deja para más adelante.
- **X (Twitter)**: por ahora no, para no gastar. Más adelante, pagar con tope de gasto o publicar a mano desde la PC con ayuda de IA (notas programadas, de la gente o propias).
