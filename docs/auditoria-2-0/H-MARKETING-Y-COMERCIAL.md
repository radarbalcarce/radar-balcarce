# H. Marketing propio, lo comercial y el crecimiento local (plan por etapas)

*24/10/2026. Informe de solo lectura: no se creó ninguna cuenta, no se tocó ninguna clave, no se publicó nada y no se cambió código. Se leyeron `CLAUDE.md`, `PUBLICIDAD.md`, `COMERCIAL.md`, `MEDIA-KIT.md`, `PERFILES.md`, `CRITERIO-REDES.md`, `docs/redes/`, `IDEAS.md` (§ 8 y § 9), `PENDIENTES.md`, `web/data/avisos.json`, `ingesta/contactos-agenda.json`, `comercial/` y `web/data/estadisticas.json`. **Todo número que no salga de un archivo del repo, o sea una cifra de precio o de alcance futuro, está marcado "A VALIDAR".** Sin costos nuevos: todo lo que sigue usa lo que ya hay o lo que es gratis.*

---

## 1. En una pantalla

1. **Hoy hay muy poca audiencia y eso es normal**: Facebook 83 seguidores, Instagram 10 (`estadisticas.json`, 24/10). La web tuvo entre 100 y 160 visitas por día del 19 al 23/10, pero ojo: esos días "directo" pasó de 5-10 a 70-160 por día, y eso suena a visitas propias, a bots o a gente que entra por un enlace pegado en WhatsApp. **A VALIDAR antes de poner un solo número en un kit.**
2. **Lo comercial está armado a medias y sin vender nada**: los tres avisos fijos existen en el código pero `avisos.json` está todo en `null`; no existe la página `/publicidad`; no hay precios (a propósito); no hay kit de medios de venta. El catálogo y los mensajes de WhatsApp para comercios están escritos (`comercial/propuestas.mjs`) pero no están conectados a nada.
3. **El orden correcto es: primero que la gente nos conozca, después vender.** Un comercio compra números que pueda ver. Con 83 seguidores y sin medición de clics, hoy sólo se puede vender "estar en el pueblo, en el lugar donde ya miran" y regalar los primeros meses.
4. **Lo que más rinde y no cuesta nada**: (a) que cada persona de Balcarce que ya nos sigue nos comparta (hay una página `/compartir` armada y escondida); (b) alianzas con clubes, escuelas, Bomberos y la Cámara de Comercio, que ya están en `contactos-agenda.json`; (c) un cartel con QR en comercios.
5. **Dos reglas del repo condicionan todo**: los precios y la estrategia comercial **no van en el repositorio público** (`IDEAS.md` § 9: "viven en el documento privado"), y Política y Policiales **no llevan patrocinio** de nadie. Este informe respeta las dos: da método y proporciones, y deja la tabla de pesos para un documento privado.

---

## 2. Dónde estamos (con evidencia)

| Cosa | Estado hoy | Dónde está |
|---|---|---|
| Audiencia en redes | Facebook 83 seguidores, Instagram 10 (alcance 11 en la última medición) | `web/data/estadisticas.json` |
| Visitas a la web | 37 a 74 por día entre el 12 y el 16/10; 98 a 157 entre el 19 y el 23/10. Casi todo de Facebook los primeros días; desde el 19 domina "directo" (sospechoso) | ídem, campo `dias` |
| De dónde llega la gente | Facebook primero, Google casi nada (2 a 5 visitas por día) | ídem |
| Avisos fijos de la web | Armados, **vacíos** (`apertura`, `clima` y `pie` en `null`) | `web/data/avisos.json`, `web/components/avisos.js` |
| Página `/publicidad` | **No existe** | `PUBLICIDAD.md` ("Antes de vender nada") |
| Kit de medios de venta | **No existe**. `MEDIA-KIT.md` es la identidad visual, no es esto | `PUBLICIDAD.md` |
| Precios | **No escritos, a propósito**: primero preguntar a 2 o 3 comercios qué pagan hoy en la radio | `PUBLICIDAD.md` |
| Catálogo y mensajes de WhatsApp a comercios | Escritos, sin conectar a ningún panel | `comercial/propuestas.mjs` (`OFERTAS`, `CATALOGO`, `PIE`), `pruebas/propuestas.test.mjs` |
| Base de comercios | 145 fichas de OpenStreetMap, 1 solo "activo" con certeza; sirve de semilla | `comercial/datos/comercios.json`, `COMERCIAL.md` |
| Contactos de instituciones | 43 contactos públicos: 10 clubes, 7 deportes, 5 educación, 4 cultura, Bomberos, Cámara de Comercio, municipio, Facultad, iglesias, fiestas | `ingesta/contactos-agenda.json` |
| Panel de contactos | Cifrado, anota a quién se le escribió y si respondió | `web/public/panel/contactos.js`, `web/data/contactos-celular.json` |
| Página para invitar | `/compartir`: mensajes para copiar, enlaces, video; no está en el menú ni la indexan | `web/app/compartir/page.js` |
| Perfiles (bio, botón de WhatsApp, destacadas) | Textos definidos; **cargarlos queda pendiente de los dos** | `PERFILES.md`, `PENDIENTES.md` |
| Mails | `contacto@`, `redaccion@` y `publicidad@radarbalcarce.com` reenvían al Gmail del medio; falta la prueba de envío | `PERFILES.md`, `PENDIENTES.md` |
| WhatsApp del medio | 2266 51-1612 (falta confirmar si es app común o Business) | `web/lib/datos.js`, `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md (anexos)` |
| Redes | Hasta 5 posteos de nota por día, 3 repasos con voz (10, 15 y 21), clima, farmacia, "Un día como hoy" y Participá; cupo de **10 audios por día** | `CRITERIO-REDES.md`, `redes/horarios.mjs` |
| Canal de WhatsApp, newsletter, Telegram, YouTube | No creados | `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md (anexos)`, `PENDIENTES.md` |

### Lo que falta de verdad (en una lista corta)

- Una persona que **hable con comercios** (nadie del código puede reemplazar eso).
- La página `/publicidad` y el kit de medios.
- **Medir clics a la web desde cada lugar** (con enlaces con `?` de origen o enlaces cortos; hay un Worker de enlaces cortos escrito y apagado: `ENLACES_CORTOS`, regla 282). Sin esto no sabemos qué cartel o qué grupo trae gente.
- Un `contactos-comercios` o una vista del panel pensada para vender (hoy el panel de contactos sirve a las instituciones para pedir fechas, no a la venta).
- Una lista de **precios internos privados** (fuera del repo).

---

## 3. Quién hace qué: Claude solo o una persona

| Tarea | Claude solo | Hace falta una persona |
|---|---|---|
| Escribir la página `/publicidad`, el kit de medios y los textos de los mensajes | Sí | Aprobar el texto y los precios |
| Armar el PDF o la imagen del kit (con los colores y letras de `MEDIA-KIT.md`) | Sí (con `resvg`, como las placas) | Revisar que se vea bien |
| Cargar un aviso en `avisos.json` | Sí, con commit que diga quién lo pidió | Que alguien cierre el trato y pase el logo y el texto |
| Armar piezas de propaganda propia (placas, texto, reel con la voz del medio) | Sí, dentro del cupo de voz y la regla "todo a Instagram es video con voz" | Aprobar el guion antes de que salga la primera vez |
| Armar el cartel con QR (PDF para imprimir) | Sí | Imprimirlo y pegarlo |
| Escribir los mensajes de WhatsApp a comercios y clubes con el texto ya hecho | Sí | **Mandarlos**: sólo una persona, uno por uno (WhatsApp bloquea los envíos masivos y en un pueblo cae mejor que escriba alguien) |
| Visitar comercios, hablar con la Cámara, con clubes, con las radios | No | Sí, siempre |
| Entrar a grupos de WhatsApp y de Facebook de Balcarce y publicar | **No** (Meta cerró la API de grupos; los grupos tienen reglas propias) | Sí, a mano |
| Crear la cuenta de Mercado Pago o Cafecito, facturar, hablar con un contador | No | Sí |
| Medir: armar los informes de visitas y alcance para el kit | Sí (lee `estadisticas.json` y el informe diario) | Que alguien confirme que las cifras son reales y no son visitas propias |
| Crear el canal de WhatsApp, el de Telegram, el canal de YouTube | No | Sí (5 a 30 minutos cada uno) |
| Grabar una voz humana o un video con la cara de Hernán o Andrés | No | Sí, si se elige ese camino (ver guiones, § 7) |

---

## 4. Plan por etapas

### Etapa 0 · Esta semana: dejar la vidriera lista (sin vender nada todavía)

Sin esto, todo lo demás pierde fuerza. Son tareas chicas, casi todas ya listadas en `PENDIENTES.md`.

| # | Qué | Quién | Esfuerzo |
|---|---|---|---|
| 0.1 | Cargar las **bios, categoría, enlace y botón de WhatsApp** de Instagram y Facebook como dice `PERFILES.md`; las cinco **historias destacadas** (Farmacia, Teléfonos, Agenda, Clima, Participá) | Los dos | 1 hora |
| 0.2 | Pasar el 2266 51-1612 a **WhatsApp Business** (saludo, ausencia, etiquetas, catálogo vacío), sólo si hoy es la app común | Los dos | 20 min |
| 0.3 | **Mandarse un mail de prueba** a `contacto@`, `redaccion@` y `publicidad@` y decidir "Enviar como" | Los dos | 15 min |
| 0.4 | **Medir bien**: confirmar si el salto de visitas "directo" del 19/10 es gente real (probar abriendo la web de un celular sin sesión; mirar países y dispositivos en `estadisticas.json`). Si hay bots, anotarlo y descontarlo del kit | Claude mira; los dos confirman | 30 min |
| 0.5 | Decidir **qué se muestra y qué no**: los precios no van en el repo; lo público es el kit sin precios y los planes sin montos | Los dos | Charla corta |
| 0.6 | Preguntar a **2 o 3 comercios amigos** qué pagan hoy por la radio o por otros medios (el dato que `PUBLICIDAD.md` pide antes de fijar precios) | Los dos, en persona | 3 visitas |

### Etapa 1 · Semanas 1 a 4: que nos conozcan y poder mostrar algo

Meta: llegar a las cuatro semanas con (a) piezas de propaganda propia saliendo con regularidad, (b) un kit de medios de una hoja con cifras de 30 días, (c) los 3 avisos regalados o vendidos al menos a **un** comercio amigo (aunque sea gratis, como caso de prueba) y (d) presencia física mínima (carteles con QR).

**Semana 1**
- Claude escribe y publica `/publicidad` (espacios, reglas, cómo se ve cada aviso, contacto) **sin precios**, y lo enlaza sólo desde el pie y desde el kit, no desde el menú. Los avisos de `PUBLICIDAD.md` ya tienen reglas; la página las repite.
- Claude arma las **placas de propaganda propia** y el primer **guion** (ver § 7) y los deja listos. Una persona aprueba el guion 1 y el 2.
- Una persona empieza a **invitar a su círculo** con `/compartir` (WhatsApp personal a 10 o 20 vecinos por día, uno por uno). Objetivo orientativo: **llegar a 150 seguidores en Facebook y 50 en Instagram a las cuatro semanas (A VALIDAR; es una meta de trabajo, no una predicción)**.

**Semana 2**
- Salen los guiones 1 y 2 (§ 7). Se mira cuál trae más seguidores nuevos y más visitas (el panel, pestaña Números).
- Una persona visita a la **Cámara de Comercio e Industria** (calle 19 esquina 20; Facebook `camarabal`; ya está en `contactos-agenda.json`) con el kit en mano: se les ofrece una nota sobre la guía de comercios y se pregunta cómo le llegamos a sus socios.
- Una persona escribe, uno por uno, a **5 clubes** de la lista de contactos pidiendo resultados e invitando a seguir la página. El texto lo arma Claude; el panel de contactos anota a quién se le escribió.

**Semana 3**
- Claude arma el **cartel con QR** (un PDF A4 para pegar en vidrieras, con el nombre del medio, una frase, `radarbalcarce.com` y el QR). Se imprime en una copiadora; se pegan **10 carteles** en comercios amigos (la farmacia de turno rota, almacenes, kioscos, el ferrocarril, la universidad).
- Se ofrece **un aviso gratis por 4 semanas** a 3 o 4 comercios amigos (el espacio `pie`, que "vale poco": `PUBLICIDAD.md`), a cambio de: una foto de su local, permiso de usar su nombre como "primeros auspiciantes" y un testimonio de una línea en el kit. Se rotula siempre "Espacio publicitario".
- Salen los guiones 3 y 4.

**Semana 4**
- Se arma el **kit de medios** con cifras reales de los últimos 30 días (§ 6) y se manda por WhatsApp a los comercios que ya conocen el medio.
- Se mide con los clics de cada QR (cuando haya enlaces cortos) o con una pregunta en el mostrador ("¿cómo nos conociste?").
- Sale el guion 5. Se hace una **charla de dueños**: qué trajo gente, qué no, qué se sigue y qué se corta.

**Cierre de la etapa 1, para decidir juntos (los dos):**
- ¿Cuántas visitas reales por día y de dónde? ¿Subió Google o sigue todo de Facebook?
- ¿Cuántos comercios dicen que sí a algo (aunque sea gratis)?
- ¿Se pasa a la etapa 2 o hace falta una semana más de difusión?

### Etapa 2 · Mes 2: las primeras ventas chicas

Meta: **2 o 3 comercios pagando algo**, aunque sea poco, para probar que el modelo funciona. No hace falta más.

| Qué se vende primero | Por qué |
|---|---|
| **Aviso `pie` mensual** | El más barato y el menos invasivo: para animarse |
| **"El clima de hoy, presentado por…"** (escalón 2 de `PUBLICIDAD.md`: una línea en la tarjeta del clima, en la web, y en la voz que ya sale) | Lo que más se mira todos los días; no suma un audio extra |
| **"Farmacia de turno" nunca patrocinada por una farmacia** | Regla de `IDEAS.md`: una farmacia no auspicia la farmacia de turno |
| **"Presentado por" en la agenda semanal** | Gastronomía, clubes y casas de espectáculos |

- Claude escribe el código chico que falta (ver § 9, "Qué falta en el repo") sólo cuando el primer comercio diga que sí; no antes.
- Una persona negocia, factura (monotributo o lo que diga el contador: **A VALIDAR con un contador**, ver `IDEAS.md` § 9, "Riesgos legales") y cobra.
- Se habla con **2 o 3 radios o medios chicos** de la zona por alianza (el repaso del día regalado a cambio de mención, idea D-7). Siempre diciendo que lo hace una IA.
- Se abre el **canal de WhatsApp de Radar** (a mano, un mensaje por día con la farmacia y el repaso). Es el canal más cercano a la gente de acá y no tiene API: una persona lo publica.
- Se prueba la **newsletter** "Radar de la mañana" (5 notas, 7:30) con el servicio gratis que se elija (por ejemplo Brevo; **A VALIDAR** que el plan gratis cubra el volumen). Sólo si ya hay 100 personas que la pidan.

### Etapa 3 · Mes 3: ordenar y repetir lo que anduvo

- Informe mensual para cada anunciante (visitas a la página, alcance de su mención). Es lo que hace que renueven. **Hoy no se puede armar**: depende de tener enlaces o fichas medibles; es la mejora de código más importante de la etapa.
- Pasar de "casos de prueba gratis" a una lista de **precios por escalón** (tabla privada, no en el repo) y subir una vez que ya haya 3 comercios pagando.
- Si hace falta, abrir la **guía comercial gratis con mapa** (`COMERCIAL.md`): es la puerta de entrada para el 80 % de los comercios y la que más cuesta en tiempo humano (relevar y confirmar). Sólo si hay una persona dedicada.
- Evaluar sumar **Ofertas de la semana** (una oferta gratis por comercio) y el **concurso de la foto del mes** (es un concurso de habilidad, no un sorteo: la ley 22.802 prohíbe condicionar un sorteo a una compra).
- Revisar las **redes nuevas** (YouTube Shorts, Telegram, Threads) y decidir cuáles se abren, según `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md (anexos)`. Con 83 seguidores no hay apuro: YouTube y Telegram son los de costo más bajo.

---

## 5. Qué ofrecer a comerciantes (menú simple, de lo más suave a lo más completo)

Se mantiene la escalera de `IDEAS.md` § 9 y los espacios de `PUBLICIDAD.md`. Cada escalón dice qué incluye y qué hace falta del lado técnico. **Los precios van aparte (§ 5.2).**

| Escalón | Qué es | Dónde se ve | Estado técnico | Qué falta |
|---|---|---|---|---|
| 0 · **Ficha gratis** | Nombre, rubro, dirección, horario, WhatsApp | Guía y mapa (aún sin publicar) | Base armada (`comercial/`) | Publicar la guía en la web |
| 1 · **Aviso `pie`** | Un aviso quieto, gris, "Espacio publicitario", texto y un logo | Pie de todas las páginas | Existe (`avisos.json`) | Sólo cargar el primero |
| 2 · **Aviso `clima`** | Al lado del clima y la farmacia de turno | Portada, el mejor lugar | Existe | Cargar el primero |
| 3 · **Aviso `apertura`** | Después de la nota de apertura | Portada, interrumpe una sola vez | Existe | Cargar el primero |
| 4 · **"Presentado por"** | Una línea en el clima o la agenda, en la web y en la voz | Web y piezas con voz | Idea | Código chico: un cierre por auspiciante en `redes/elegir.mjs` y en `web/lib/` |
| 5 · **Auspicio de una sección** | "Agro, con el apoyo de…", **nunca Política ni Policiales** | Sección y su parte semanal | Idea | Texto fijo por sección |
| 6 · **Mención en un repaso** | "Y esta mañana, gracias a…" | Los 3 repasos diarios con voz | Idea | Un cierre distinto por auspiciante; **cuidar el cupo de 10 audios** |
| 7 · **Historia propia** | Una historia del comercio en Instagram y Facebook | Redes | A mano | Una persona la pide; Claude arma la placa |
| 8 · **Newsletter y canal de WhatsApp** | Un renglón patrocinado | Boletín o canal | Todavía no existen | Crearlos primero (Etapa 2) |
| 9 · **Contenido patrocinado** | Una nota rotulada "Contenido patrocinado" | Web | Con reglas de `PUBLICIDAD.md` | Que no simule noticia; mismo criterio que cualquier nota |

**Reglas que siguen valiendo para todos** (`PUBLICIDAD.md`): vendidos a comercios de Balcarce, no por una red publicitaria; quietos, grises, con letra chica, "Espacio publicitario" arriba; nunca el rojo de la marca; **un aviso no compra una nota**; nada de apuestas ni préstamos; exclusividad por rubro del escalón 2 en adelante; una farmacia no auspicia la farmacia de turno; la voz dice "gracias a" o "presentado por", no simula noticia.

### 5.1 A quién ofrecerle primero (de más fácil a más difícil)

1. **Comercios amigos de Hernán y Andrés**: confianza y la prueba más barata.
2. **Gastronomía, heladerías y panaderías de barrio**: lo que más se busca en una agenda de fin de semana.
3. **Servicios**: veterinarias, ópticas, gimnasios, peluquerías, clínicas privadas.
4. **Comercios del rubro agro** (insumos, maquinaria): se ligan con la sección Agro.
5. **Inmobiliarias y concesionarias**: pagan más, pero esperan resultados medibles.
6. **Clubes y organizadores de eventos**: el "evento destacado" de `IDEAS.md` § 9.

### 5.2 Precios: método, no números (A VALIDAR)

- **No hay tarifario local conocido** (`IDEAS.md` § 9: "no apareció ningún tarifario de un medio de Balcarce ni de una ciudad parecida"). Lo que hay son dos referencias nacionales que también conviene **A VALIDAR** (están en `IDEAS.md`, son de la investigación del 8/10): una FM chica, entre $50.000 y $112.000 por mes, y Facebook Ads, que con US$ 1 por día cuesta unos $45.000 por mes más impuestos.
- **Regla de arranque** (ya propuesta en `PUBLICIDAD.md` e `IDEAS.md`): cobrar **por lugar y por tiempo, nunca por visitas**; empezar **claramente por debajo de la radio**; ajustar cada 3 meses por inflación; 10 % menos por 3 meses y 20 % por 6.
- **Proporciones de partida, todas A VALIDAR con 2 o 3 comercios:**

| Escalón | Referencia sugerida respecto al piso de una FM chica |
|---|---|
| Aviso `pie` | Un cuarto o menos; regalarlo el primer mes |
| Aviso `clima` | Cerca de la mitad (es el lugar más caro) |
| Aviso `apertura` | Entre el pie y el clima |
| "Presentado por" (clima o agenda) | Cerca de la mitad |
| Historia propia | Por publicación, un monto simbólico |
| Nota patrocinada | Por nota; la más cara, por trimestre |

- **Los montos reales en pesos se guardan en un documento privado** (Drive de `radarbalcarce@gmail.com` o una nota de los dos), no en el repo, como dice `IDEAS.md` § 9 ("los montos propuestos y la estrategia de lanzamiento no van en el repositorio público").
- **Mientras haya menos de 3 comercios pagando, un "precio de lanzamiento" tiene sentido** (por ejemplo, tres meses a mitad de precio a cambio de contar que fueron los primeros). **A VALIDAR.**
- **Cobrar**: Mercado Pago con link o transferencia con alias. La factura, con el contador (publicidad es un servicio; encuadre fiscal **A VALIDAR**).

### 5.3 Cómo contactarlos (sin envíos masivos)

- **Siempre una persona, uno por uno**, desde el WhatsApp del medio (con WhatsApp Business) o en persona. Los mensajes ya están escritos en `comercial/propuestas.mjs` (`confirmar`, `sumarse-gratis`, `colaboracion`, `sorteo`, `publicidad`, `servicios`) y todos terminan con `PIE` ("Si no querés que te escribamos más, decímelo y listo").
- **El primer mensaje no vende**: se presenta y pregunta algo útil ("¿siguen atendiendo? ¿me pasan el horario?").
- **Mejor todavía: ir al local con el kit impreso.** Para un comercio chico, alguien que entra y se presenta vale más que cualquier mensaje.
- **Datos personales**: sólo datos del negocio (nombre del local, rubro, dirección, teléfono comercial, de dónde salió). Ni el nombre del dueño ni su celular particular sin permiso (ley 25.326; lo vigila una prueba).
- **Anotar** a quién se le escribió y qué contestó en el **panel de contactos**, que es cifrado. Hoy está pensado para instituciones; usarlo también para comercios es un ajuste chico (§ 9).
- **Cámara de Comercio** (`contactos-agenda.json` ya la tiene): es el mejor aliado. Lo que se le ofrece es la guía gratis para sus socios, a cambio de que difundan el medio entre ellos (`IDEAS.md`, idea K-6). **A VALIDAR** si aceptan.

---

## 6. Borrador del kit de medios (una página)

*Pensado para imprimir en A4 o mandar como imagen por WhatsApp. Se arma con los colores y letras de `MEDIA-KIT.md` (Source Serif 4 e Inter; el rojo de la marca nunca en un aviso). Lo que está entre corchetes se completa el día que se imprime, con datos de los últimos 30 días; **si un número no se puede mostrar, no se pone**.*

---

**RADAR BALCARCE**
*Lo que pasa en Balcarce, la región y el país.*

**Qué es.** Un medio digital de Balcarce, hecho por dos vecinos, que lee todo el día lo que se publica en la ciudad y en la zona y lo cuenta en un solo lugar: noticias, clima, farmacia de turno, agenda y servicios. Hace uso de inteligencia artificial para redactar y verifica cada nota contra sus fuentes; cada nota dice quién la escribió. *radarbalcarce.com*

**Dónde se ve** (cifras de [fecha de inicio] a [fecha de cierre], de Cloudflare Web Analytics y de Facebook e Instagram):

| | |
|---|---|
| Visitas a la web por día (promedio) | **[número real, sin visitas propias]** |
| Páginas vistas por mes | **[número real]** |
| Gente que llega desde celular | **[porcentaje real]** (66 % en septiembre; **A VALIDAR**) |
| Seguidores en Facebook | **[83 hoy, completar el día que se imprime]** |
| Seguidores en Instagram | **[10 hoy, completar el día que se imprime]** |
| Alcance de las historias y reels en el último mes | **[número real de Facebook e Instagram]** |

**Qué se mira todos los días y por qué un aviso ahí es visto**
- **El clima de Balcarce**, en la portada y en una historia por la mañana y otra por la noche.
- **La farmacia de turno**, todos los días.
- **La agenda de actividades** (sólo con datos oficiales), los jueves.
- **Los tres repasos con voz** (10, 15 y 21 horas), en Facebook e Instagram.

**Qué ofrecemos**
| Espacio | Para quién |
|---|---|
| **Aviso fijo en la web**: tres lugares (portada, junto al clima, pie), sin ventanas emergentes ni videos que arrancan solos | Cualquier comercio |
| **"Presentado por…"** en el clima o la agenda, en la web y en la voz | Gastronomía, servicios, comercios de barrio |
| **Historia propia** en Instagram y Facebook | Con promoción o novedad |
| **Auspicio de una sección** (Agro, Deportes, Cultura…), nunca Política ni Policiales | Empresas medianas |
| **Contenido patrocinado**, siempre rotulado | Quien tenga algo que contar |

**Cómo trabajamos**
- Vendemos **por lugar y por tiempo**, no por visitas prometidas.
- **Todo lo patrocinado se rotula** ("Espacio publicitario" o "Contenido patrocinado").
- **Un aviso no compra una nota.**
- Sin apuestas, sin préstamos, sin ventanas emergentes.
- Mostramos cada mes cuántas veces se vio su espacio **[cuando haya medición por anunciante]**.

**Primeros auspiciantes:** [nombres de los comercios que acepten, con su permiso].

**Contacto:** WhatsApp 2266 51-1612 · publicidad@radarbalcarce.com · radarbalcarce.com/publicidad

**Precios:** se envían por mensaje a quien los pida. *[Precios en el documento privado.]*

---

### Cosas a decidir antes de imprimir el kit

1. **Tipo de lectura**: un kit que sólo diga "somos nuevos" sirve para amigos; para el resto hace falta el número. Por eso la regla es **no imprimirlo con cifras vacías**: se espera al día 30 de datos limpios.
2. **Descontar las visitas propias** (de Hernán, de Andrés y de bots) antes de escribir la cifra. Hoy no está claro cuánto es.
3. **Una foto del equipo** (dos vecinos) ayuda más que cualquier gráfico en un pueblo.
4. **Aclarar que usamos IA** va en el kit: ya está en `/quienes-somos` y en las bios, y es lo que nos diferencia de una publicidad escondida.

---

## 7. Cinco guiones de propaganda propia

**Reglas que cumplen los cinco** (`CRITERIO-REDES.md` § 4 y § 5, `PERFILES.md`):
- Nombran sólo **"Radar Balcarce"** (nunca "Radar" solo) y la dirección escrita `radarbalcarce.com`, dicha **"Radar Balcarce punto com"**.
- Sin exclamaciones en el texto leído, sin "increíble", sin promesas, sin "en vivo".
- Todo reel que sale en Instagram es **video con voz**; el reel lleva «Voz generada con inteligencia artificial.» en el posteo.
- En Instagram **no hay enlaces en el pie**: se dice "link en la bio".
- **Cupo de voz**: 10 audios por día y un día normal usa 7 a 9. Un guion propio con voz del medio debería salir **un día de poco consumo** o **con la voz humana de Hernán o Andrés** (ver "decisión" abajo).
- Usan los colores de `MEDIA-KIT.md`: papel `#FAF8F3`, tinta `#14161A`, el rojo de la marca como acento y el azul del perfil.
- Nada de datos inventados: los números que digan (cuántas notas, cuántas fuentes) se **leen del repo el día que se arma la pieza**, no se escriben de memoria.

**Decisión pendiente para los dos:** ¿la propaganda se dice con **la voz del medio (Gemini)** o con **la voz de ustedes**? La del medio es coherente con todo el resto (`CRITERIO-REDES.md` § 6: "siempre la misma voz para cada pieza") pero gasta un audio del cupo. La humana humaniza y en un pueblo suele funcionar mejor ("los hace Hernán y Andrés, dos vecinos"), pero hay que grabarla. Los guiones sirven para las dos. **Mi recomendación: el 1, el 4 y el 5 con voz del medio; el 2 y el 3 con voz humana.**

---

### Guion 1 · "Qué es Radar Balcarce" (presentación)

- **Formato:** reel 9:16 (Facebook e Instagram, el mismo video) + historia con el mismo video.
- **Duración:** 20 a 25 segundos.
- **Imagen:** placa de papel con "Radar Balcarce" (Radar en tinta, Balcarce en rojo), el reloj de radar girando suave, luego cuatro tarjetas rápidas: clima, farmacia, una nota, agenda.
- **Texto leído:**
  > "Todo lo que pasa en Balcarce, en un solo lugar. El clima, la farmacia de turno, la agenda y las noticias de la ciudad y la zona. Las ordenamos para que no tengas que andar buscando. Es Radar Balcarce. Entrá a Radar Balcarce punto com."
- **Pie del posteo:** «Radar Balcarce, el medio digital de Balcarce. Link en la bio. Voz generada con inteligencia artificial.»
- **Cuándo:** semana 1, a las 12:00 (cuando más gente mira).
- **Para qué:** que quien llegue al perfil entienda en 20 segundos qué es.

### Guion 2 · "Cómo se usa en un minuto" (tutorial de uso)

- **Formato:** reel 9:16 con captura de pantalla del celular (la portada real, el clima, la farmacia) y un cartel que marca cada paso.
- **Duración:** 30 a 40 segundos.
- **Imagen:** capturas de la web con un círculo rojo que marca. Sin música fuerte.
- **Texto leído (voz humana o del medio):**
  > "Cómo se usa Radar Balcarce. Uno: entrás a Radar Balcarce punto com. Dos: arriba tenés el clima y la farmacia de turno de hoy. Tres: abajo, las notas más importantes del día, siempre con quién las escribió y de dónde salió la información. Cuatro: si querés guardar el sitio, tocá los tres puntitos y agregalo a la pantalla de inicio, como si fuera una aplicación. Es gratis y no te pide registrarte."
- **Pie del posteo:** «Cómo usar Radar Balcarce en un minuto. Link en la bio.»
- **Cuándo:** semana 2. **Se puede guardar como historia destacada "Cómo se usa".**
- **Para qué:** bajar la barrera ("¿cómo funciona?"). **Chequear que las instrucciones de "agregar a la pantalla de inicio" sean verdad en Android y en iPhone antes de grabar (A VALIDAR).**

### Guion 3 · "Dos vecinos" (la cara humana)

- **Formato:** video corto de Hernán y/o Andrés hablando a cámara, vertical, con la fachada de un lugar reconocible de Balcarce (la plaza, el parque Cerro El Triunfo) de fondo. Subtítulos quemados (obligatorio: se mira sin sonido).
- **Duración:** 25 a 30 segundos.
- **Texto leído (en voz propia, con sus palabras, sin leer de un papel):**
  > "Somos [Hernán] y [Andrés], vecinos de Balcarce. Armamos Radar Balcarce porque queríamos tener todo lo que pasa en el pueblo en un solo lugar. Lo hace un sistema con inteligencia artificial, lo revisamos nosotros y cada nota dice quién la escribió. Si ves algo que tendríamos que contar, mandanos un WhatsApp al 2266 51-1612. Gracias por seguirnos."
- **Pie del posteo:** «Dos vecinos y una idea. Mandanos tu dato por WhatsApp al 2266 51-1612.»
- **Cuándo:** semana 2 o 3.
- **Para qué:** confianza. En un pueblo de 40.000 personas, la cara pesa más que la marca. **Decisión de los dos: si quieren aparecer en cámara.** Si no, el mismo guion va con fotos de ustedes y voz en off.

### Guion 4 · "Participá: mandanos tu dato" (convocatoria a la gente)

- **Formato:** reel + historia, estilo de las piezas Participá que ya salen (`PIEZAS_PARTICIPA`), con la franja verde del WhatsApp (`#0F5132`).
- **Duración:** 15 a 20 segundos.
- **Texto leído:**
  > "¿Viste algo en tu barrio? ¿Un corte, un evento, un reclamo, una foto linda de Balcarce? Mandalo por WhatsApp al 2266 51 16 12 y lo miramos. Radar Balcarce se arma con lo que ve la gente. Radar Balcarce punto com."
- **Pie del posteo:** «Mandanos tu dato o tu foto por WhatsApp: 2266 51-1612. Lo revisamos antes de publicar.»
- **Cuándo:** una vez por semana, que se alterna con las piezas Participá que ya existen (no suma voz si reemplaza una de ellas). **Ver `redes/horarios.mjs`: ya hay cuatro por semana al mediodía.**
- **Para qué:** conseguir datos propios de los vecinos y a la vez que sientan que el medio es de ellos. **Regla:** nunca prometer que se publicará lo que manden; Política y Policiales siguen esperando a una persona.

### Guion 5 · "Para comercios: este espacio puede ser tuyo" (convocatoria comercial)

- **Formato:** post estático (placa 4:5) en Facebook, con espejo en Instagram; o reel corto sin voz humana. **No va en el horario de los repasos.**
- **Duración:** si es reel, 15 segundos.
- **Imagen:** la portada real del sitio con un recuadro gris punteado que dice "Espacio publicitario" y una flecha. Abajo: "Tu comercio, donde ya mira todo Balcarce."
- **Texto leído o escrito:**
  > "Si tenés un comercio en Balcarce, tu aviso puede estar donde los vecinos miran todos los días: el clima, la farmacia de turno y la agenda. Un espacio quieto, claro, que no molesta a nadie. Escribinos por WhatsApp al 2266 51 16 12 o a publicidad arroba radarbalcarce punto com. Radar Balcarce."
- **Pie del posteo:** «¿Tenés un comercio en Balcarce? Escribinos: 2266 51-1612. Lo patrocinado siempre se rotula.»
- **Cuándo:** recién en la **semana 4**, cuando el kit ya tenga números. **No antes:** con 83 seguidores nadie lo va a comprar.
- **Para qué:** abrir la puerta comercial sin presionar. **No dice precios.**

---

### Ideas extra de propaganda (menos urgentes)

- **"Radar Balcarce en una frase"**: una placa por día con una nota de acá y la dirección del medio (sale casi sola de lo que ya se publica).
- **"Gracias a quienes nos siguen"**: placa al llegar a 100, 250 y 500 seguidores de Facebook (los números se leen del repo, no se escriben a mano).
- **"Un Radar para cada barrio"**: una nota sobre un rincón de Balcarce con foto propia y una invitación a mandar la suya. Necesita fotos propias (no se pueden tomar de otro medio sin permiso).
- **Cartel QR** (§ 8): la misma identidad que la placa del guion 1.

---

## 8. Crecimiento de audiencia local

Todo lo siguiente es gratis o casi. Lo que sigue en negrita es lo que más rinde por hora de trabajo, según lo que sabemos.

### 8.1 Gente conocida y grupos

| Qué | Cómo | Cuidado |
|---|---|---|
| **Invitar a conocidos con `/compartir`** | Hernán y Andrés mandan el mensaje a su círculo (de a 10 o 20 por día, uno por uno), con el enlace de Facebook, Instagram y la web | No hacer envíos masivos; WhatsApp bloquea |
| **Grupos de Facebook de Balcarce** | Una persona (no un robot) pide permiso a los administradores, respeta las reglas de cada grupo y comparte **una** cosa útil por día (la farmacia de turno, el clima, un aviso importante) con la dirección de la nota. **Sin Política ni Policiales** | Meta cerró la API de publicar en grupos en abril de 2024 (dato de `TABLA-DE-REDES.md`, **A VALIDAR** contra Meta); nunca automatizar; muchos grupos prohíben links |
| **Grupos de WhatsApp (de barrios, clubes, escuelas, cooperadoras)** | Que un conocido de cada grupo comparta la farmacia de turno o un aviso útil, con el nombre del medio | Spam: pocos mensajes, siempre algo útil |
| **Canal de WhatsApp de Radar** | Se crea a mano con el celular (5 minutos). Un mensaje por día: farmacia y el mejor titular de acá | No tiene API oficial; no automatizar con herramientas de terceros (se arriesga el número del medio) |
| **Boletín por correo "Radar de la mañana"** | Etapa 2, sólo si hay gente que lo pida. 5 notas, 7:30 | Datos personales: confirmación de suscripción y baja visible |

### 8.2 Mundo físico

| Qué | Cómo |
|---|---|
| **Cartel con QR** | PDF A4 armado por Claude con el nombre, una frase y el QR; se imprime en la copiadora y se pega en vidrieras de comercios amigos. Meta orientativa: **10 carteles en el mes 1 y 30 en el mes 3 (A VALIDAR)**. Hay que usar un enlace corto o con origen (`?o=cartel-farmacia`) para saber qué cartel trae gente |
| **Volantes** en eventos grandes | La Fiesta del Postre ya apareció en `IDEAS.md` con "50 volantes QR". **Una sola cara, con el QR y una frase** |
| **El ticket o la bolsa del comercio** | Si algún comercio imprime sus bolsas, una línea "Mirá lo que pasa en Balcarce: radarbalcarce.com" |
| **Pantallas o carteleras** de la universidad, el hospital, el municipio | Pedir permiso para pasar la placa del guion 1 |

### 8.3 Alianzas con instituciones y clubes

La lista de `contactos-agenda.json` ya tiene los canales públicos de **10 clubes, 7 entidades deportivas, 5 de educación, 4 de cultura, Bomberos, la Cámara de Comercio, el Club de Leones, el Municipio y la Facultad de Agrarias**. El intercambio que se ofrece:

| Qué damos | Qué pedimos |
|---|---|
| Publicamos sus resultados, eventos y fotos (si ellos las mandan) | Que **nos pasen los resultados y la agenda** (mejora las notas, no cuesta nada) |
| Una placa de agradecimiento cuando cumplen años o un hito | Que **nos sigan y compartan** en sus redes |
| Aparecer en la agenda del jueves | Que **nos autoricen** a usar sus fotos con crédito, si las tienen |
| Un "trato igual para todos" explícito | Que no esperen que un aviso nuestro compre una nota |

- **Sin distinción**: todos los clubes reciben el mismo trato (`IDEAS.md`, idea D-8).
- El mensaje lo escribe una persona. Claude lo arma y el panel de contactos anota quién respondió.
- Primera ola recomendada (5): Cámara de Comercio, Bomberos Voluntarios, el club con más seguidores en redes, la Facultad de Agrarias y la Subsecretaría de Cultura.

### 8.4 Cuándo y cómo publicar en redes (A VALIDAR con los datos propios)

- **Hoy el robot sale de 8 a 22, con 90 minutos entre posteos** (`docs/historico/redes/PROPUESTA-POSTEOS-POR-DIA.md`); los repasos con voz son a las 10, 15 y 21.
- **No se cambia el contrato del día** por marketing. Lo único que se agrega son piezas de propaganda propia, **una o dos por semana**, para no diluir (con 83 seguidores, más posteos no suma gente).
- **Qué mirar en la pestaña Números** durante cuatro semanas: alcance por posteo de la mañana contra el de la tarde; qué reel trae más seguidores nuevos; de dónde viene la gente. Con eso se decide el horario de la propaganda.
- **Para elegir horas de propaganda**: la información que hoy hay (`estadisticas.json`, campo `horas`) muestra picos a la noche (21 a 23); **A VALIDAR** con más semanas antes de cambiar nada.
- **Reels**: más de 15 a 30 segundos le cuesta a una cuenta chica; los guiones de arriba apuntan a eso.
- **Siempre en el perfil**: la bio única, el botón de WhatsApp y las cinco historias destacadas; son lo primero que ve quien llega por un QR.

### 8.5 Google

- Hoy casi no llega gente de Google (2 a 5 visitas por día). Es más lento y más estable que Facebook. Ya están el sitemap, los datos estructurados y `llms.txt`; el resto (Search Console, Bing) está **diferido hasta después de la renovación** (decisión del 12/10).
- No es parte de este plan, salvo una regla: **la propaganda propia no debe confundirse con noticias** (los sorteos del medio y el autobombo ya están filtrados como "no es nota" desde la regla del 17/10).

---

## 9. Qué falta en el repo para ejecutar esto

Ordenado por urgencia. Ninguno gasta plata. **Nada de esto se hizo**; es la lista de cosas chicas para pedirle a Claude cuando se decida.

| # | Qué falta | Dónde | Cuándo |
|---|---|---|---|
| 1 | Página `/publicidad` (espacios, reglas, contacto; sin precios) | `web/app/publicidad/page.js`, enlazada desde el pie | Semana 1 |
| 2 | Plantilla del **kit de medios** en HTML/PDF (con las letras y colores de `MEDIA-KIT.md`) que lea sola las cifras de `estadisticas.json` | `scripts/` o `reels/` | Semana 3 |
| 3 | **Placas de propaganda propia** (guiones 1, 4 y 5) como piezas fijas del plan de redes, con su texto controlado por prueba | `redes/piezas.mjs`, `redes/guiones.mjs`, `CRITERIO-REDES.md` | Semana 1 a 2 |
| 4 | **Cartel con QR** en PDF | `reels/` o `web/scripts/` | Semana 3 |
| 5 | **Origen medible** de las visitas (enlaces con `?o=…` o los enlaces cortos de la regla 282, hoy apagados) | `redes/enlaces-cortos.mjs`, `infra/enlaces-cloudflare/` | Antes de la semana 3 |
| 6 | Que el **panel de contactos** acepte también comercios (hoy es de instituciones) y anote "ofrecido: aviso pie", "respondió", "sí/no" | `web/public/panel/contactos.js`, `web/data/contactos-celular.json` | Semana 2 a 4 |
| 7 | Conectar `comercial/propuestas.mjs` al panel (generar el enlace de WhatsApp con el mensaje ya escrito) | `comercial/propuestas.mjs`, panel | Etapa 2 |
| 8 | "Presentado por" en la tarjeta del clima y en la voz | `web/components/`, `redes/elegir.mjs` | Cuando el primer comercio diga que sí |
| 9 | Informe mensual por anunciante (visitas a la página, menciones salidas) | `redes/informe-diario.mjs` y nuevo | Etapa 3 |
| 10 | Aviso en `CRITERIO-REDES.md` y pruebas para que la **propaganda propia nunca nombre a un anunciante sin que se sepa** y respete las reglas de voz y de no-notas | `CRITERIO-REDES.md`, `pruebas/` | Con el 3 |
| 11 | **Limpiar o completar `comercial/`**: 145 comercios de OpenStreetMap con 1 solo confirmado. Decidir si se sigue (guía gratis) o se retira (`PENDIENTES.md` lo marca "a revisar con ojo de dueños") | `comercial/` | Charla de dueños del fin de la etapa 1 |

---

## 10. Qué medir para poder vender

| Qué | De dónde sale hoy | Cómo se usa en el kit |
|---|---|---|
| **Visitas por día** y **páginas vistas** (sin las propias) | `estadisticas.json` (Cloudflare Web Analytics) | La cifra grande del kit |
| **De dónde llegan** (Facebook, Google, directo) | ídem, `referentes` | Muestra que hay audiencia fiel y no sólo una red |
| **Celular o computadora** | ídem, `dispositivos` | Para avisos pensados para el celular |
| **Países / ciudades** | ídem, `paises` (hoy trae también EE.UU. y otros: filtrar a Argentina para el kit) | "Cuántos vecinos"; **a validar si hay ciudad** |
| **Qué página se ve más** (clima, farmacia, agenda) | `top` de cada punto | Prueba de que el lugar del aviso `clima` se mira |
| **Seguidores y alcance** de Facebook e Instagram | `estadisticas.json` | El segundo número |
| **Alcance y vistas de cada historia o reel de propaganda** | Panel, pestaña Números; API de Meta | Para saber qué guion sirve |
| **Clics en una mención o aviso** | **No se mide hoy** (hace falta el origen medible, § 9 #5) | Lo que hace que un comercio renueve |

**Lo que no se debe hacer**: prometer visitas a un anunciante; mostrar un número sin descontar las visitas propias; vender "alcance" sin saber el alcance real.

---

## 11. Riesgos y lo que hay que cuidar

1. **Independencia editorial**: un aviso no compra una nota; un auspiciante de una sección no cambia lo que se escribe sobre su rubro; y lo de Política y Policiales no lleva patrocinio.
2. **Que la propaganda propia parezca noticia**: siempre aparte de la portada de notas, con su placa distinta; el sistema ya filtra el autobombo de otros medios (no al revés).
3. **Voz de IA**: la etiqueta de «Voz generada con inteligencia artificial.» va en todo reel; los guiones con voz humana la sacan, pero **no** deben usar una voz humana ajena ni imitar a otra persona.
4. **Datos personales**: sólo datos del negocio; baja fácil en cada mensaje; no pasar la lista de comercios a nadie.
5. **Sorteos**: la ley 22.802 prohíbe condicionarlos a una compra. Hacer **concursos de habilidad** con bases publicadas hasta que alguien confirme qué pide la Lotería de la Provincia (`IDEAS.md` § 9).
6. **Facturación**: publicidad es un servicio; la forma (monotributo, SAS) la decide un contador. **No facturar antes de hablar con uno.**
7. **No quemar el WhatsApp del medio**: ningún envío masivo, ninguna herramienta de terceros para automatizar el canal.
8. **Prometer menos de lo que hay**: con 83 seguidores el kit tiene que decir lo que es (un medio nuevo, local, medible, con espacios quietos), no lo que no es.
9. **Tiempo humano**: todo lo comercial depende de visitar, escribir y cobrar. Si no hay una persona con 3 a 4 horas por semana para eso, no se arranca la etapa 2.

---

## 12. Decisiones que necesitan a los dos

1. ¿Voz del medio o voz de ustedes (guiones 2 y 3)? ¿Aparecen en cámara?
2. ¿Quién se encarga de hablar con comercios y clubes (3 a 4 horas por semana)? Sin eso, no vale la pena prender la etapa 2.
3. ¿Se acepta que los precios vayan en un documento privado y no en el repo (como ya decía `IDEAS.md`)?
4. ¿Se regalan los primeros avisos a 3 o 4 comercios amigos por 4 semanas, a cambio de nombre, foto y testimonio?
5. ¿Se invierte en el cartel con QR (la copiadora cuesta unos pesos, **A VALIDAR**)?
6. ¿Se sigue con `comercial/` (guía gratis con mapa) o se retira por ahora? Hoy es mucho trabajo de calle para el resultado.
7. ¿Se abre el canal de WhatsApp de Radar y la newsletter, y quién los atiende?
8. ¿Se pide permiso a las radios y medios chicos de la zona para la alianza del repaso (D-7)?

---

## 13. Cómo se retoma

Orden sugerido para Claude cuando los dos digan "adelante":
1. `/publicidad` y las placas de los guiones 1, 4 y 5.
2. Origen medible de las visitas.
3. Cartel con QR y kit de medios con cifras reales.
4. Panel de contactos con comercios.
5. "Presentado por" en el clima, sólo cuando haya un comercio que lo pida.

Esperar siempre la aprobación de los dos antes de que cualquier pieza de propaganda salga por primera vez, y no sumar piezas con voz si el cupo del día ya está lleno.

*Fuentes cruzadas: `PUBLICIDAD.md`, `COMERCIAL.md`, `MEDIA-KIT.md`, `PERFILES.md`, `CRITERIO-REDES.md` § 4 a § 6, `docs/historico/redes/PROPUESTA-POSTEOS-POR-DIA.md`, `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md (anexos)`, `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md (anexos)`, `IDEAS.md` § 8 y § 9, `PENDIENTES.md`, `comercial/propuestas.mjs`, `ingesta/contactos-agenda.json`, `web/data/avisos.json`, `web/data/estadisticas.json`, `web/app/compartir/page.js`.*
