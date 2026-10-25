# Ideas de otras IA para Radar 2.0

*17/10/2026. Pedido de Hernán: "entrá con el Chrome a otras IA (ChatGPT, Grok, Gemini, Meta) y fijate qué ideas te dan para
mejorar cada área, por si se nos pasa algo; varias veces, con distintas preguntas". Se les mandó la misma descripción del
proyecto (sin datos privados ni claves) y varias preguntas. Contestaron ChatGPT, Gemini y Meta AI; Grok pide confirmar la
edad y las cookies y eso lo tiene que hacer una persona (queda la ventana abierta en el Chrome de la PC).*

Las ideas se separan en: **lo que ya aplicamos**, **lo nuevo que conviene** y **lo que no conviene** (con el motivo).
Entre paréntesis quién la propuso: (C) ChatGPT, (G) Gemini, (M) Meta AI.

## Ronda 1: secciones, clasificación y popularidad (17/10, tarde)

**Secciones (C, G, M):** las tres proponen entre 14 y 15, con nombres parecidos: Balcarce, Política, Policiales,
Deportes (Fútbol y Automovilismo como etiqueta, M y C; M y G los dejan sueltos por la identidad de Balcarce), Agro,
Economía y Consumo, **Tecnología e IA**, **Ciencia e Investigación**, **Salud**, **Educación**, Cultura y Agenda, Ambiente,
Sociedad, Argentina y Mundo, y "Servicio" (clima, cortes, turnos, ANSES: M lo llama la sección más leída y más barata).
Etiquetas, no secciones: IA, química, biología, turismo, trámites, clubes, efemérides. Juntar donde falte volumen (G: Educación
y Ciencia; M: Ciencia y Tecnología; M: Economía y Agro). Regla de M: si una sección no promedia 4 notas por día, es etiqueta.
Advertencia de C: **100 notas por día es una capacidad, no una cuota**; si hay 70 valiosas no se rellenan 30 flojas.

**Clasificación (C, G, M):** ficha con listas cerradas (enums): sección, ámbito (Balcarce, regional, provincial, nacional,
mundo), tipo de nota (hecho, previa, servicio, contexto, agenda, urgente), etiquetas de una lista fija (máximo 2 o 3) e
interés. Se valida por código: lo que no está en la lista se descarta o se reasigna. Extras útiles:
- **Las reglas resuelven lo repetitivo y la IA lo ambiguo** (M): el ámbito "Balcarce" sale por palabras (Balcarce más
  calle, club, escuela, municipio, con 95 % de acierto y costo cero); un clasificador por reglas propone dos secciones
  candidatas y la IA elige entre ellas.
- **Pedir evidencia** (C, M): 5 palabras o una frase de la fuente que justifique la sección; si no está en el texto, se
  descarta.
- Separar **clasificar** ("¿de qué trata?") de **publicar** ("¿vale ocupar espacio ahora, está respaldada, no es repetida?") (C).
- Guardar las historias descartadas con su motivo para ajustar (C).

**Popularidad sin pagar (C, G, M):** además de contar medios:
- **Velocidad**: cuántos medios se suman por hora; de 1 a 4 en una hora es explosivo (G, C, M).
- **Peso por medio** (M): un medio grande vale 1,5 y uno chico 0,7; tres chicos del mismo palo valen menos que dos grandes.
- **Diversidad** (C, G, M): que la cuenten medios de distinta línea (+30 %); los del mismo dueño cuentan uno.
- **Posición en el RSS** (G): si está entre las primeras entradas del feed de varios diarios, sube.
- **Google Trends Argentina** (G, C, M), con su RSS gratuito de tendencias diarias (`trends.google.com/trending/rss?geo=AR`):
  cruzar palabras del título con lo que se busca; sin datos de Trends no se penaliza.
- **Palabras de servicio** (M): ANSES, aumento, bono, alerta, paro, corte, vacuna: suben un nivel aunque tengan 2 medios;
  es la válvula para que Educación, Salud y Ciencia entren.
- **Fuente primaria** en el texto (comunicado oficial, decreto, estudio publicado en…): mejora la confianza, no la popularidad (C, G).
- Tres puntajes separados: difusión, interés editorial y prioridad para Balcarce (C).

## Ronda 2: fuentes, fotos, diseño y SEO (17/10, tarde)

**Fuentes que mencionaron (G, M):**
- Ciencia, tecnología y salud: CONICET (prensa), Agencia CyTA (Instituto Leloir), Unciencia (UNC), SINC (agenciasinc.es,
  ciencia en español), Xataka, Wired en español, Ministerio de Salud (nación y provincia), ANMAT.
- Agro y ambiente: INTA Informa, SMN (alertas).
- Economía y datos: INDEC, Boletín Oficial (nación y provincia).
- Educación: Ministerio de Educación, UNMdP, UNICEN, UNCPBA; becas Progresar.
- Cultura: Instituto Cultural de la Provincia, agendas.
- Lo local que los medios no miran (M, C): Boletín Oficial Municipal y orden del día del Concejo, Bomberos, Cooperativa
  de Electricidad (CEBAL), INTA Balcarce, hospital, escuelas, Liga Balcarceña, calendarios de ANSES, PAMI y colectivos.
- Ojo: Gemini nombró a Télam como agencia; desde 2024 ya no es agencia de noticias (informe 07). Verificar cada feed antes
  de sumarlo (hay que comprobar que responda y traiga notas con fecha).

**Detectar fuentes dormidas (G):** más de 72 horas sin novedades en una fuente local o 12 horas en una nacional; 3 errores
seguidos y se apaga sola; si la IA descarta el 90 % de lo que trae, pasa a revisión. (Ya existe `node ingesta/auditar-fuentes.mjs`:
falta que avise por mail.)

**Estilos para ilustraciones sin personas (G, M):** 1) isométrico 3D minimalista (tecnología, ciencia, IA); 2) fotografía macro
editorial con bokeh (agro, ambiente, salud); 3) vector plano con paleta del sitio (educación, economía, servicios);
4) bodegón técnico de objetos simbólicos (policiales, autos, deportes); 5) collage gráfico geométrico con textura de papel
(política, cultura). M: sumar el paisaje de Balcarce (sierra, loma, cielo) al prompt para que no sean genéricas.
**Control de las fotos de las fuentes (G):** texto o logos de otros medios; resolución mínima; coherencia con la nota; el
agente de fotos ya lo hizo en las reglas 203 a 206.

**Diseño y SEO (G, C), por impacto y esfuerzo:**
1. Títulos y URLs con la palabra clave al principio + datos estructurados NewsArticle y BreadcrumbList (muy alto, bajo).
2. **Sitemap de noticias** (`sitemap-news.xml`, notas de las últimas 48 horas) + IndexNow (alto, bajo; IndexNow ya está).
3. Mobile primero, rápido (Core Web Vitals): imágenes en WebP, ancho y alto explícitos, la principal con `fetchpriority="high"`.
4. Jerarquía de portada: una nota principal grande, bloque "Lo último" con hora, bloques por sección.
5. Página de nota: tipografía de 18 px, "En 30 segundos" (2 o 3 viñetas), "Relacionadas" (3 de la misma sección o
   etiqueta), botones de compartir por WhatsApp y copiar enlace.
6. Páginas de sección y de tema (etiquetas) y enlazado interno.
Extras de M: página `/hoy` (una sola dirección con lo de hoy, fácil de mandar por WhatsApp), botón "Sólo Balcarce",
etiquetas por barrio, calle y ruta, y "Publicado" y "Actualizado" como dos fechas.

## Ronda 3: redes, audiencia y formatos (Gemini, 17/10)

**Crecer en Facebook y WhatsApp sin plata (por impacto):** placa diaria de "farmacia de turno, clima y datos útiles" a las 7 de la
mañana en Facebook y en los Estados de WhatsApp (ya existe: falta el Estado, a mano); servicio útil y trámites ("¿cómo hago…?":
ANSES, calendario de cobros, cortes de luz, colectivos, recolección); "Historias de Balcarce" los fines de semana (fotos y calles
viejas: nostalgia = compartidos); promocionar el canal de WhatsApp al final de cada nota; **etiquetar a clubes, escuelas y
mutuales** cuando se publica algo sobre ellos (la mayoría lo resube); álbumes de fotos de eventos locales; horarios pico del
interior (7 a 8:30, 12:30 a 14 y 20 a 21:30; ya los usan los repasos); sorteos con comercios (el comercio pone el premio);
cerrar con una pregunta en notas de opinión.
**Frecuencia por red:** canal de WhatsApp 3 a 5 envíos por día; Facebook 8 a 15; Instagram 1 reel y 3 a 5 historias;
TikTok y YouTube Shorts 1 a 2 videos verticales; Threads 2 a 4; X, Telegram y Bluesky automático con todas las notas.
**Suscriptores propios:** botón del canal de WhatsApp al final de cada nota (prioridad uno); notificaciones web push gratis
(OneSignal) para avisos urgentes; newsletter diario de lunes a viernes a las 7 con 5 noticias (Brevo gratis).
**Métricas de referencia para un sitio nuevo (G, referenciales):** 300 a 500 usuarios por día al principio y 1.500 a 3.000 a los 6
meses; más de 20 % de tráfico directo o recurrente; más de 1,4 páginas por sesión; más de 45 segundos por nota; clic de Facebook
de 3 a 5 % del alcance; 15 a 30 seguidores nuevos por semana en el canal; convertir el 1 % de los visitantes diarios en
suscriptores.
**No conviene:** compartir "automático" en grupos de Facebook (no hay forma oficial desde 2024: a mano y con permiso del
administrador).

## Ronda 4: audio, video, comercial y riesgos (Gemini, 17/10)

**Reel de noticias de 60 segundos que funciona:** arrancar con el dato (sin saludo) en los primeros 3 segundos; subtítulos
grandes y de alto contraste (7 de 10 miran sin sonido); cambio de imagen cada 3 a 5 segundos (la foto de cada nota, ya hecho en el
repaso nuevo); música de fondo tenue; cierre fijo de 3 segundos ("más en radarbalcarce.com o en el canal de WhatsApp").
**Podcast diario gratis:** sí conviene: un mp3 con la locución y una cortina, publicado con un feed RSS de podcast en el propio
sitio, que Spotify y Apple leen; para YouTube, el audio con una imagen fija.
**Modelo comercial (ARS, referencial; no hay tarifas públicas medidas en pueblos bonaerenses):** ficha básica gratis en la guía;
destacado ($8.000 a $15.000 por mes: primero en la guía, logo, WhatsApp y horarios); patrocinio de un servicio ($20.000 a $40.000
por mes: "la farmacia de turno de hoy es presentada por…", clima, agenda). Secciones: guía de comercios, clasificados y
empleos, agenda patrocinada. Etiqueta visible "Publicidad" o "Contenido patrocinado" y `rel="sponsored"` en los enlaces. Cobro
por transferencia o Mercado Pago con débito automático; reporte mensual con impresiones y clics al WhatsApp del negocio, sin
prometer ventas.
**Rutina semanal de 30 minutos para los dueños:** 10 minutos leyendo 5 a 10 notas al azar (errores, nombres, fotos fuera de
contexto); 10 minutos mirando si hay fuentes caídas; 10 minutos con las 3 notas más leídas y los mensajes de comercios.
**Alarmas:** sitio caído (un monitor gratis cada 5 minutos, como UptimeRobot; el vigilante propio ya avisa por mail), más de 3
horas sin publicar, error de compilación, nota sensible esperando.
**Tres causas de fracaso en el primer año (G):** publicar algo erróneo o delicado sin verificar; no salir a vender los espacios (no
alcanza con AdSense); cansancio operativo por tareas manuales repetitivas.
**Otras herramientas que mencionó (verificar antes):** NotebookLM para resumir ordenanzas y boletines largos; DeepL gratis para
traducir ciencia y tecnología; Edge-TTS como voz gratis alternativa (la nuestra es Gemini; sólo como respaldo); CapCut para
plantillas a mano. Ojo: nombró "Gemini 1.5 Flash" (ya no es el modelo actual) y Pollinations (se descartó para imágenes).

## Ronda 1 (anterior, 17/10 madrugada): ideas generales

### Periodismo y criterio
- **Seguir los temas hasta el final** (C, G, M): lista de asuntos abiertos (obras, cortes, búsquedas) que el sistema vuelve a
  mirar a las 24 horas y a los 30 días ("Qué pasó con…").
- **Separar noticia nueva de actualización** (C): cinco medios que cuentan el mismo corte son una ficha que se actualiza.
- **Servicio con fecha de vencimiento** (C, M): cortes de luz y agua, calles cortadas, trámites, inscripciones.
- **La pregunta útil** (C): "¿qué puede hacer o entender mejor un vecino después de leer esto?".

### Fuentes
- **Un buzón para los vecinos** (C, G, M): sensor, no publica directo; se verifica antes (mail con Cloudflare Email Routing o Telegram).
- **Red de 20 referentes** (C): clubes, escuelas, centros de jubilados, bomberos.

### IA y control de calidad
- **Tabla de afirmaciones** (C): cada nombre, cifra, fecha, cargo y cita con la fuente exacta; lo que no se encuentra queda "sin verificar".
- **"[por confirmar]"** si un dato está en una sola fuente, y listar contradicciones sin elegir (M).
- **Separar extraer, redactar y revisar** (C, G).
- **Banco de 50 casos de prueba** (C) para medir cada cambio de instrucción (`reels/comparar-instruccion.mjs`).
- **Registro de correcciones con su causa** (C).
- **La voz dice que es IA** (M): "resumen automático de Radar, con voz de IA".

### Fotos
- **Banco de fotos propio de Balcarce** (C, G, M): plaza, Palacio Municipal, sierra, autódromo, hospital. Es lo que más mejora con menos esfuerzo.
- **Placas con datos en vez de dibujos** (G): para un corte o el clima del finde, la placa con el dato útil.

### Redes y audiencia
- **Medir clics y no cantidad de publicaciones** (C); **los tres repasos distintos** (C); **un reel corto diario** para Instagram (M).
- **Canal de WhatsApp a mano** (C, G, M): un mensaje por día a las 20 con 5 titulares; plan B si Facebook baja el alcance.
- **Probar posteos sin enlace** (M) y medir; **la pregunta de los vecinos** semanal (C).

### Comercial
- **Patrocinar lo útil** (C, G, M) ("Farmacia de turno, presentada por…"); **guía de comercios gratis con un destacado pago**; reglas comerciales escritas antes de vender (C).

### Confianza y medios locales
- Página "Cómo trabajamos" (C, G, M); crédito visible con enlace al medio original (G, M); que un medio pueda pedir que no lo usemos (M);
  canal de correcciones visible (C); consejo de tres (M).

### Riesgos
- Instrucciones escondidas en las fuentes (C); robo de cuentas: verificación en dos pasos (C); depender de Facebook (C, G, M):
  plan B con WhatsApp y un mail diario; si Gemini cambia el precio, tener respaldo (M; ahora, OpenRouter y Groq).

## Lo que no conviene
- **Superponer un degradé o un recorte sobre la foto de otro medio** (M): va contra la regla de no poner nada encima.
- **Cambiar encabezados o usar proxies para que los medios no nos bloqueen** (G): si un medio no quiere, se respeta.
- **Publicar en grupos de Facebook con un programa** (G): desde 2024 no hay forma oficial.
- **Comentar en las notas de otros medios con nuestro enlace** (M).
- **"Si no afecta a Balcarce, no entra"** (M): contradice lo decidido (lo nacional entra por popularidad).
- **Leer redes con robots (nitter, rss-bridge, WhatsApp Web)** (G, M): va contra los términos de uso.
- **AdSense** (G): paga poco con este tráfico; mejor el patrocinio local.
- **Rellenar secciones para cumplir una cuota** (C): una sección sin volumen sostenido es etiqueta.
