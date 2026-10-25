# Auditoría 2.0 · Módulo J: cronogramas de redes, canales nuevos y enlaces cortos

*Escrita el 24/10/2026. Solo lectura del repositorio e investigación en la web (sin crear cuentas ni entrar a ninguna). No se tocó código. Los números de audiencia salen de `docs/auditoria-2-0/C-REDES.md` (datos reales del 21/09 al 23/10). Lo de las plataformas de afuera (límites, reglas) salió de búsquedas del 24/10; lo que no se pudo confirmar en una página oficial está marcado **SIN VERIFICAR**. Complementa, no reemplaza, a `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md (anexos)` (17/10), `docs/historico/redes/PROPUESTA-POSTEOS-POR-DIA.md` y `docs/redes/ACORTADOR-DE-ENLACES.md`.*

## Resumen en 10 líneas

1. **Lo que funciona es muy poco y se sabe cuál es:** el reel del clima de las 7:00 en Facebook (mediana 3.050 reproducciones, 15 veces más que cualquier otra pieza). Los repasos de las 10 y las 15 andan en unas 230 a 250. El repaso de las 21 (mediana 6) y el clima de las 20 (mediana 26) casi no se ven. Los 98 posteos de notas medidos alcanzaron en total a 265 personas.
2. **Entre las 17 y las 20 casi no sale nada** (9 posteos en 23 días) y el cupo de 5 posteos se agota a las 16:36 de mediana.
3. Propongo **tres cronogramas** para probar cuatro semanas, uno por semana, desde el lunes 9/11, con la decisión final el 9/12. El 5/11 se decide cuál de las tres se prueba y se prenden los enlaces cortos antes.
4. **Ninguna variante gasta más de 10 audios por día** y ninguna toca el clima de las 7:00, que es el ancla de la prueba (se usa para comparar semanas entre sí).
5. **Redes que faltan:** solo **Telegram, Bluesky y Threads** se pueden automatizar gratis de verdad. **YouTube y TikTok** tienen API gratis pero **todo lo que suba el robot queda privado hasta pasar una auditoría de la plataforma** (confirmado en las páginas de Google y TikTok): hasta entonces, a mano. **El canal de WhatsApp no tiene API oficial** (a mano). **X cobra** (US$ 0,015 por posteo, US$ 0,20 si lleva enlace): fuera si no hay costos nuevos.
6. **Orden de alta recomendado:** canal de WhatsApp, canal de YouTube, canal de Telegram con su bot, Bluesky. Threads, TikTok y X ya tienen cuenta (15/10).
7. **Enlaces de Facebook:** hoy un posteo de nota lleva un enlace de unos 178 caracteres. El Worker de enlaces cortos ya está escrito y probado; baja a 36. **Está apagado y desconectado:** falta subir el Worker, poner la ruta, y pasar la variable `ENLACES_CORTOS` en **tres workflows** (más el Worker de tareas si algún día se muda).
8. **Dato que cambia el análisis:** la mayoría de los posteos de Facebook salen **como foto** (`comoSaleEnFacebook`), no como enlace con tarjeta. O sea que la tarjeta de vista previa casi no entra en juego: el enlace es solo texto dentro del posteo. Solo cuando la foto falla tres veces el posteo sale como enlace con tarjeta, y ahí sí importa que el Facebook pueda leer la nota detrás del enlace corto.
9. **Un agujero del Worker a arreglar antes de prender:** si la nota es tan nueva que el índice guardado en memoria no la tiene, manda a `/nota/<id>`, que para notas nuevas es un 404. Para una persona se arregla con una redirección en el navegador, pero **el robot de Facebook ve un 404** (ver 3.5).
10. Todo lo de este informe son propuestas. Lo único que hay que decidir el 5/11 está en la sección 4.

---

## 1. Tres cronogramas para probar cuatro semanas

### 1.1 Lo que hay hoy (de `redes/horarios.mjs`, `redes/piezas.mjs` y `ingesta/criterio.mjs`)

| Hora | Pieza | Audio de voz | Cómo sale |
|---|---|---|---|
| 07:00 | Clima de la mañana | 1 | reel en Facebook, historia en las dos |
| 08:00 | Feriado (solo si hay) | 1 | reel + historia |
| 09:00 | Un día como hoy | 1 | reel + historia |
| 10:00 | Repaso de la mañana | 1 | reel + historia |
| 12:00 | Agenda (jueves) o Participá (4 días) | 1 | reel + historia |
| 15:00 | Repaso de la tarde | 1 | reel + historia |
| 17:00 | Teléfonos útiles (sábado) | 1 | reel + historia |
| 19:00 | Farmacia de turno | 1 | reel en Facebook, historia en las dos |
| 20:00 | Clima de la noche | 1 | reel en Facebook, historia en las dos |
| 21:00 | Repaso de la noche | 1 | reel + historia |
| 08:00 a 22:00, cada 90 min | Posteos de notas (hasta 5) | 0 | foto en Facebook y espejo en Instagram |

Un día normal usa **7 audios**, uno con extras **8**, y como mucho **9 o 10**. Las historias tienen techo de 8. Los reintentos de una pieza **reusan el audio ya pedido** (memoria de voces, no gastan cupo), así que el margen real es mayor al que parece.

### 1.2 Cómo se prueba (igual para las tres)

- **Cuatro semanas completas de lunes a domingo**, desde el **lunes 9/11**. Una variante por semana, en este orden: **semana 1: B, semana 2: C, semana 3: A, semana 4: la que vaya ganando**. Se mezcla el orden a propósito, porque la audiencia crece con el tiempo y la última semana saldría favorecida si fuera siempre la misma variante.
- **Semana 0 (26/10 al 8/11): como hoy**, pero ya con los enlaces cortos prendidos y la medición de la sección 1.7. Es el punto de comparación.
- **Lo que no cambia en ninguna variante:** el clima de las 7:00 (se usa como regla para comparar semanas), el criterio editorial, Política y Policiales de Balcarce esperando a una persona, la regla de no nombrar la fuente, la etiqueta «Voz generada con inteligencia artificial.» y el límite de 10 audios.
- **Ojo con las fechas de la prueba:** el feriado del 20/11 se pasa al lunes 23/11 y el 8/12 es feriado con puente el 7/12 (calendario de 2026, **verificar** en la página oficial antes de empezar). Una semana larga baja las visitas de todo: se anota y no se compara en crudo.

### 1.3 Variante A, la conservadora: «igual que hoy, mejor repartido»

**Idea:** no tocar ningún video. Lo único que cambia es que los 5 posteos de notas dejan de gastarse todos antes de las 16:30 y se reparten en tres franjas. Es el cambio que pide C-REDES (H-3).

| Hora | Qué sale |
|---|---|
| 07:00 | Clima (igual) |
| 09:00 | Un día como hoy (igual) |
| 10:00 | Repaso de la mañana (igual) |
| 12:00 | Agenda o Participá (igual, los días que toquen) |
| 15:00 | Repaso de la tarde (igual) |
| 17:00 | Teléfonos útiles (sábados, igual) |
| 19:00 | Farmacia (igual) |
| 20:00 | Clima de la noche (igual) |
| 21:00 | Repaso de la noche (igual) |
| **Posteos de notas** | **08:30, 11:00, 13:30, 16:00, 18:30** (5, antes 5 pegados por la mañana y la tarde) |

- **Cuántos:** 5 posteos, 6 a 8 reels, 6 a 8 historias.
- **Voz:** **7 audios** normales, 8 con extras, 9 con feriado y extra. Margen de 1 a 3.
- **Qué noticias:** Balcarce con puntaje 75 o más, y lo de afuera solo si lo cuentan 5 medios o más (como hoy). Orden de siempre: lo que marcó una persona, lo de acá que cuentan 3 medios de Balcarce, el resto de lo de acá, y al final lo más contado del país. Si una franja no tiene nota fuerte, su lugar pasa a la siguiente (nunca se guarda para después de las 20).
- **Qué hay que cambiar en el código (después, con su prueba):** `elegirParaFacebook` (`redes/elegir.mjs`) para que reparta por franja. Nada más.
- **Para qué sirve:** responde «¿el problema era el horario de los posteos o la audiencia?». Es la menos riesgosa.

### 1.4 Variante B, la equilibrada: «mover lo que no se ve»

**Idea:** A, más sacar los videos de las horas muertas y poner uno en la franja de 17 a 20, más una noticia de Balcarce dentro del clima de las 7:00, que es lo que ya miran.

| Hora | Qué sale | Cambio |
|---|---|---|
| 07:00 | Clima **más un cierre de 5 a 8 segundos: «Y hoy en Balcarce: …»** con la nota de acá más fuerte | cierre nuevo (mismo audio) |
| 09:00 | Un día como hoy | igual |
| 10:00 | Repaso de la mañana | igual |
| 12:00 | Agenda o Participá | igual |
| 15:00 | Repaso de la tarde | igual |
| 17:00 | Teléfonos útiles (sábados) | igual |
| 19:00 | Farmacia | igual |
| **19:45** | **Repaso de la noche** | antes 21:00 (mediana 6) |
| **21:30** | **Clima de la noche, «cómo amanece mañana»** | antes 20:00 (mediana 26) |
| **Posteos de notas** | **08:30, 11:00, 13:00, 15:30, 17:30, 20:15** (6) | un posteo más y uno en la franja de 17 a 20 |

- **Cuántos:** 6 posteos, 7 a 9 reels, hasta 8 historias.
- **Voz:** **7 audios** normales, 8 con extras, 9 como máximo. Igual que A: no se agrega ninguna pieza con voz, solo se mueven.
- **Qué noticias:** Balcarce con 75 o más; lo de afuera solo si lo cuentan **8 medios o más** (la recomendación D-4 de C-REDES: dos números en todo el sistema, 3 para publicar y 8 para destacar); se saca el piso de 80 puntos de los repasos. **Un lugar por día (el de las 13:00) queda reservado a una nota de Política o Policiales de acá que una persona haya aprobado desde el celular** (la cola de 3 a 5 candidatas que pide D-2). Si nadie aprueba, ese lugar lo usa la mejor nota que quede. **Sin aprobación de una persona no sale nada de eso, como hoy.**
- **El repaso de las 19:45** cuenta lo de acá más fuerte del día. Como las notas ya contadas no se repiten, tiene que tener al menos 4 notas distintas (si no, sale con 3).
- **Qué hay que cambiar en el código:** `HORAS_REELS` y `VENTANAS` en `redes/piezas.mjs` (el repaso de la noche y el clima de la noche), `HISTORIAS_FIJAS` en `redes/horarios.mjs`, el cierre del guion del clima en `redes/guiones.mjs`, `elegirParaFacebook` y `FACEBOOK.porDia` / `CONTRATO_DIARIO.posteosPorDia` (son dos números que hoy hay que cambiar a la vez: A-4 de C-REDES), `FACEBOOK.mediosParaRedes`. Y el Worker del reloj (`infra/reloj-cloudflare/`, `HORAS_REDES_UTC`) solo si algo sale después de las 23.

### 1.5 Variante C, la agresiva: «llenar el día y la franja muerta»

**Idea:** B, más un segundo reel de servicio a la mañana, el repaso nocturno todavía más temprano, más posteos y un piso de puntaje más bajo para tener qué publicar.

| Hora | Qué sale | Cambio |
|---|---|---|
| 07:00 | Clima + cierre «Y hoy en Balcarce: …» | igual que B |
| **08:45** | **Farmacia de la mañana** (el turno cambió a las 8:30) | pieza nueva, **la primera que se corta si falta cupo** |
| 09:00 | Un día como hoy | igual |
| 10:00 | Repaso de la mañana | igual |
| 12:00 | Agenda o Participá | igual |
| 15:00 | Repaso de la tarde | igual |
| 17:00 | Teléfonos útiles (sábados) | igual |
| **18:00** | **Repaso de la noche** | antes 21:00, en medio del hueco de 17 a 20 |
| 19:00 | Farmacia de la noche | igual |
| **21:30** | **Clima «cómo amanece mañana»** | antes 20:00 |
| **Posteos de notas** | **08:15, 10:30, 12:30, 14:30, 16:30, 18:30, 20:00, 21:45** (8) | 8 por día, 90 min entre uno y otro |

- **Cuántos:** 8 posteos, 9 a 11 reels, **historias con techo subido a 10** (hoy es 8: `historiasMaximasPorDia`).
- **Voz:** **8 audios** un día normal, **9 a 10** con Participá, agenda, útiles o feriado. **No hay margen en los días pesados**: si se pasa del cupo, la pieza **no sale** (regla: nunca con otra voz). Orden de corte, de primero a último: farmacia de la mañana, teléfonos útiles, agenda. **Si en la semana 2 se pierde una pieza con voz por cupo más de dos veces, se corta la prueba de C.**
- **Qué noticias:** Balcarce desde **65 puntos** (suma unas 1,4 notas de acá por día respecto de 75, según `PROPUESTA-POSTEOS-POR-DIA.md`); lo de afuera con **8 medios o más**; **dos lugares por día (13:00 y 18:30) reservados a Política o Policiales de acá aprobadas por una persona**. Con 8 posteos y un piso más bajo, en los días flojos saldrán notas de acá de menor puntaje: es lo que se quiere comprobar (¿suma audiencia o diluye?).
- **Qué hay que cambiar en el código:** todo lo de B, más una pieza nueva `farmacia-manana` (guion, horario, ventana y `toca`), `FACEBOOK.relevanciaMinima`, `CONTRATO_DIARIO.historiasMaximasPorDia`, la lista de extras que se cortan primero (`EXTRAS_DE_HISTORIAS`) y el contrato del día.
- **Riesgo:** con 53 a 83 seguidores no hay audiencia que justifique 8 posteos. Esta variante existe para comprobarlo con números, no porque se espere que gane.

### 1.6 Qué noticias van a cada franja (para las tres)

| Franja | Qué va | Por qué |
|---|---|---|
| Mañana (8:00 a 11:00) | Lo que pasó anoche y lo que sirve hoy: cortes, tránsito, clima, el hecho de acá más contado | Es cuando más gente mira (el reel de las 7 lo prueba) |
| Mediodía (12:00 a 14:00) | Lo más contado de acá del día y el servicio (agenda) | Pausa de almuerzo |
| Tarde (15:00 a 17:30) | Deportes, cultura, sociedad de acá | Notas que no caducan |
| Noche (18:00 a 22:00) | El cierre fuerte del día de Balcarce | Hoy es la franja vacía |

### 1.7 Cómo se mide cuál gana

**Qué se mira cada domingo a la noche** (todo sale de archivos que ya existen: `web/data/estadisticas-piezas.json`, `estadisticas.json`, `redes.json` y, desde que se prendan los enlaces cortos, de Analytics Engine; el informe diario de las 21:15 ya trae casi todo):

| # | Medida | De dónde sale | Para qué |
|---|---|---|---|
| 1 | **Índice de reels:** reproducciones medianas de los reels de Facebook de la semana, dividido por la mediana del clima de las 7:00 de esa misma semana | `estadisticas-piezas.json` | Saca del medio los días buenos o malos de todo (el clima dio 473 un día y 25.097 otro) |
| 2 | **Visitas a la web desde Facebook por día** (referer más clics de personas en los enlaces cortos, sin robots) | `estadisticas.json` y Analytics Engine | Es lo que de verdad importa: gente en la nota |
| 3 | **Seguidores nuevos** de Facebook e Instagram en la semana | `estadisticas.json` | Para que el alcance quede |
| 4 | **Personas alcanzadas por posteo de nota, por franja** (mediana) | `redes.json` y `estadisticas-piezas.json` | Si el sexto y el octavo posteo suman o diluyen |
| 5 | **Costo:** audios usados por día, piezas perdidas por cupo, fallas | `redes.json` (`problemas`) y el informe | Si la variante es sostenible |

**Reglas para decidir (escritas antes para no inventarlas después):**

1. Una variante **gana** si supera a la semana 0 en al menos **dos de las medidas 1, 2 y 3** por **30 % o más**. Con números tan chicos, una diferencia menor es ruido: **si ninguna llega al 30 %, gana la A** (la que menos cambia).
2. **Piso de seguridad:** si el clima de las 7:00 cae más de 40 % en una semana contra la semana 0, esa semana no cuenta (algo externo pasó) y se repite.
3. **Corte anticipado:** una variante que pierde piezas con voz por cupo más de dos veces en la semana se corta y se anota.
4. La medición de **historias** (H-9 de C-REDES: Facebook da 0 o vacío, Instagram «menos de 5 personas») **no se usa para decidir**. Solo reels, posteos, visitas y seguidores.
5. Instagram aparte: si en las cuatro semanas las fotos del espejo siguen en unas 5 vistas, se propone apagar el espejo (`instagramFeed`) y dejar la cuenta solo con reels (D-1 de C-REDES).

### 1.8 Calendario

| Fecha | Qué pasa |
|---|---|
| Ahora al 1/11 | Subir el Worker de enlaces cortos, poner la ruta, probar a mano (sección 3.4). Prender `ENLACES_CORTOS` |
| 26/10 al 8/11 | **Semana 0**, como hoy, ya con enlaces cortos y la medición completa |
| **Jueves 5/11** | **Decisión prevista** (ver sección 4): se cierra la prueba del 8/10, se aprueban o se corrigen las tres variantes y se deja pedido el código |
| Lunes 9/11 | Empieza la semana 1 (B) |
| 16/11 | Semana 2 (C) |
| 23/11 | Semana 3 (A). Revisión intermedia el domingo 22/11 |
| 30/11 | Semana 4 (la que vaya ganando) |
| Domingo 6/12 | Se cierran los números |
| **Miércoles 9/12** | **Decisión final** (el 7 es puente y el 8 feriado: verificar) |

---

## 2. Todas las redes que faltan

### 2.1 Lo que hay hoy en el repositorio, red por red

| Red | Cuenta | Qué hay en el repo |
|---|---|---|
| Facebook, Instagram | Sí, andando | Todo: `redes/meta.mjs`, `publicar.mjs`, `piezas.mjs`, `elegir.mjs`, `reintentar.mjs`, `foto-cambiada.mjs` |
| Threads, X, TikTok | Cuentas creadas el 15/10, **sin publicar** (según `TABLA-DE-REDES.md`; TikTok no mostraba bio ni logo) | Solo `redes/texto-por-red.mjs` (233 líneas, arma texto, `verificado: false`, no publica) |
| Telegram, Bluesky, canal de WhatsApp | No están creados | `texto-por-red.mjs` tiene su texto; `web/lib/canales.js` y `web/components/canales.js` ya muestran botones en la web leyendo las variables `BLUESKY_URL`, `TELEGRAM_CANAL_URL`, `WHATSAPP_CANAL_URL` (vacías) |
| YouTube | **No hay canal** | Texto en `texto-por-red.mjs` (título y descripción); no hay cliente de subida |
| Pinterest, LinkedIn | No | Nada (descartadas en `TABLA-DE-REDES.md`) |
| Podcast (Spotify, Apple, YouTube Music) | No | `docs/historico/redes/AUDIO-EN-LA-PAGINA-Y-PODCAST-GENERAL.md` (propuesta); el feed se retiró el 17/10 |
| Newsletter | No | Nada |

**No hay hoy ninguna otra red conectada a un cliente de API**: el robot solo sabe hablar con Meta. Cada red automática nueva es código nuevo con su prueba (de uno a tres días de trabajo) y un secreto nuevo en GitHub.

### 2.2 Tabla por red

Todos los videos del robot son verticales 1080×1920 de 6 a 58 segundos con voz (`mp4`), así que **sirven tal cual en todas las redes de video**. Lo que cambia es el texto, y por regla del criterio: **sin nombrar la fuente, con «Voz generada con inteligencia artificial.» y Política y Policiales de acá esperando a una persona en todas las piezas**.

| Red | Qué tiene que hacer una persona (alta) | API gratis para publicar solo | Límites y requisitos reales | Riesgos de una cuenta nueva | ¿Sirve el mismo reel? | Formato y leyenda | Veredicto |
|---|---|---|---|---|---|---|---|
| **Telegram (canal)** | Crear el bot con @BotFather (1 minuto), crear un canal público, sumar el bot como administrador, pegar el token en GitHub Secrets | **Sí**, Bot API, sin revisión ni tarjeta | Videos hasta 50 MB (los nuestros pesan 1 o 2); unos 20 mensajes por minuto por grupo y 30 por segundo en total (**SIN VERIFICAR** en la página oficial); leyenda de video hasta 1.024 caracteres | **Casi ninguno** | Sí | Texto con enlace tocable y vista previa; reel con leyenda corta; notificación silenciosa salvo lo importante | **Automático con trámite mínimo** |
| **Bluesky** | Crear la cuenta con el mail del medio, **confirmar el correo (obligatorio para subir video)**, crear una «contraseña de aplicación». Opcional: usar `@radarbalcarce.com` como nombre (un registro DNS que pone Claude en Cloudflare) | **Sí**, protocolo abierto, sin revisión | Escribir cuesta 3 puntos de un presupuesto de 5.000 por hora y 35.000 por día (oficial); video hasta 3 minutos y 100 MB, 1 por posteo; unos 25 videos por día (**terceros, SIN VERIFICAR**); 300 caracteres | Bajo | Sí | 300 caracteres, enlace con tarjeta, video sin leyenda larga | **Automático con trámite mínimo** |
| **Threads** (`@radarbalcarce`, ya existe) | Agregar el producto Threads a la app de Meta que ya existe («Radar Balcarce Publicador») y autorizar la cuenta como probadora; guardar el token en GitHub Secrets. **El token dura 60 días y hay que renovarlo** (lo puede hacer el robot) | **Sí**, Threads API | 250 posteos por 24 horas por perfil (**oficial**); video hasta 5 minutos, 1 GB, MP4 o MOV, y **hace falta una dirección pública del video** (el depósito R2) (**terceros**); 500 caracteres. Para publicar en la propia cuenta en modo desarrollo alcanzaría con ser probador, pero **no pude confirmar si Meta exige revisión de la app** | Bajo (hereda de Instagram) | Sí | 500 caracteres, un hashtag, video con texto corto | **Automático con trámite** |
| **YouTube (Shorts)** | Crear el canal con `radarbalcarce@gmail.com`, verificar el teléfono, crear proyecto en Google Cloud y la pantalla de consentimiento «En producción», autorizar una vez | **Sí en teoría**, YouTube Data API | **Todo video subido por un proyecto de API creado después del 28/7/2020 queda «bloqueado como privado» hasta que Google audite el proyecto** (confirmado en Google; no se puede apelar, hay que volver a subirlo). Pedir la auditoría es un formulario con plazo de semanas (**SIN VERIFICAR**). Cuota de 10.000 unidades por día; subir cuesta 1.600 (unos 6 por día) o 100 (unos 100 por día) según la fuente: **mirar la calculadora de cuotas** | **Medio**: un canal sin historial y con voz sintética puede ser marcado; hay que declarar el contenido sintético en el video | Sí | Título hasta 100 caracteres, descripción hasta 5.000, vertical, hasta 3 minutos (**terceros**). Marcar «contenido alterado o sintético» | **A mano** (YouTube Studio programa) y pedir la auditoría en paralelo |
| **TikTok** (`@radarbalcarce`, ya existe) | Pasar la cuenta a Creator o Business (para programar desde TikTok Studio) | **Con límites que la hacen inútil**: un cliente de API sin auditar publica **solo privado, para 5 usuarios por día, y la cuenta tiene que estar en modo privado al publicar** (confirmado en TikTok, actualizado en agosto de 2026) | La auditoría la pide TikTok y no es para «una herramienta que sube a las cuentas propias» (según `TABLA-DE-REDES.md`, **SIN VERIFICAR** la política actual) | **Alto**: cuenta nueva, voz de IA, y TikTok pide etiquetar el contenido generado con IA | Sí | Hasta 10 minutos, leyenda corta con hashtags, etiqueta de IA | **A mano** (programado). No invertir en API |
| **X** (`@RadarBalcarce`, ya existe) | Cargar tarjeta y crear la app | **Sí pero paga**: US$ 0,015 por posteo, **US$ 0,20 si el texto lleva un enlace** (desde abril de 2026; fuentes de terceros, mirar la consola de X) | Sin planes fijos para cuentas nuevas | Medio (cuentas nuevas suelen limitarse) | Sí | 280 caracteres | **No** si no hay costos nuevos. Si se quiere estar, a mano y sin automatizar |
| **Canal de WhatsApp** | Crearlo desde el teléfono del medio (5 minutos); poner el enlace en la web (`WHATSAPP_CANAL_URL`) y en la bio de Instagram | **No existe API oficial** para publicar en canales (la de Meta solo lee; las de terceros usan el número como si fuera WhatsApp Web y **arriesgan el 2266 51-1612**) | — | **Perder el número del medio**: por eso, nada de automatizar | Sí (se sube a mano) | Texto, foto, video corto, enlaces, encuestas | **A mano**: farmacia y el mejor titular, 20 segundos por pieza |
| **Instagram: canal de difusión** | Activarlo desde el celular de la cuenta | **No hay API** (**SIN VERIFICAR**) | — | Bajo | Sí | Mensajes cortos a quienes se sumen | **A mano**, opcional, cuando Instagram pase de unos cientos de seguidores |
| **Grupos de Facebook de Balcarce** | Pedir permiso a cada administrador | **No** (Meta quitó la API de grupos en abril de 2024, **terceros**) | — | Que te saquen del grupo por spam | No | Un solo mensaje útil por día | **A mano**, nunca con robot |
| **Pinterest** | — | Sí, pero sin acceso «Standard» los pines se ven solo desde la propia cuenta (`TABLA-DE-REDES.md`, **SIN VERIFICAR** hoy) | Pide revisión | — | Parcial (vertical sí) | — | **No conviene**: no es una red de noticias locales |
| **LinkedIn** | — | La API pide un producto restringido con revisión | — | — | Parcial | — | **No conviene** por ahora (sirve solo para tener una página de empresa y que la vean la Cámara de Comercio y los avisantes) |
| **Newsletter** (Brevo gratis) | Elegir servicio, formulario con baja, dominio de envío | Sí, con API | Brevo, 300 mails por día (**SIN VERIFICAR**) | Que los mails caigan en spam | No es video | Un mail por día con cinco notas, clima y farmacia | **Después**: audiencia propia sin algoritmo |

### 2.3 Recomendación priorizada y orden de alta (sin costos nuevos)

El criterio es **dónde está la gente de Balcarce, cuánto cuesta mantener y si se puede hacer sin que el robot toque un número o una cuenta que no puede perder**. Con 53 a 83 seguidores en Facebook, nada de esto reemplaza a Facebook (74 % de las visitas hoy): son redes para **estar presentes** a costo cero, no para ganar audiencia de golpe.

| Orden | Red | Quién hace qué | Cuándo | Por qué en este lugar |
|---|---|---|---|---|
| **1** | **Canal de WhatsApp** | Hernán o Andrés, desde el teléfono del medio, 5 minutos. Después una persona sube a mano la farmacia y el mejor titular, 1 a 3 veces por día | Esta semana | Es donde está la gente de un pueblo. Cero código, cero costo, cero riesgo. La única desventaja es que es a mano |
| **2** | **Canal de YouTube** | Una persona crea el canal con `radarbalcarce@gmail.com`, verifica el teléfono, carga logo y descripción. Sube a mano 1 o 2 reels por día (por ejemplo la efeméride y el repaso de la noche), y **se manda el formulario de auditoría de la API** | Esta semana el alta; la auditoría, apenas esté el canal | Un video sobre «Balcarce» se encuentra por Google durante meses; es el que más puede crecer solo. La API sirve recién cuando Google audite |
| **3** | **Canal de Telegram + bot** | Una persona crea el bot y el canal, pega el token. Claude escribe el cliente (`redes/telegram.mjs`) con su prueba, apagado y simulando una semana | Alta esta semana, código la siguiente | Es la única red de video gratis, sin revisión y sin riesgo. Sirve como archivo y como buzón |
| **4** | **Bluesky** | Una persona crea la cuenta, confirma el mail, crea la contraseña de aplicación. Claude escribe el cliente | Junto con Telegram | Misma ventaja. Audiencia chica en Argentina |
| **5** | **Threads** | Una persona agrega Threads a la app de Meta y autoriza la cuenta; Claude arma el cliente, la renovación del token y el depósito público de videos | Semanas 3 a 4 | Es gratis y sale del mismo ecosistema que Instagram, pero necesita el depósito público de videos y renovar el token cada 60 días |
| **6** | **TikTok** | Pasar la cuenta a Creator, completar bio y logo, subir a mano con TikTok Studio 1 o 2 por día | Cuando haya tiempo de una persona | El alcance puede ser grande pero no hay camino automático; los términos de TikTok no permiten robots |
| **7** | **X, Instagram canal de difusión, grupos de Facebook, newsletter, podcast** | Según se vea | Mes 2 en adelante | Costo o trabajo mayor al beneficio hoy |

**No hacer:** Pinterest, LinkedIn (salvo la página de empresa), cualquier herramienta de terceros que publique en WhatsApp, y publicar con el navegador sin que haya una persona al lado.

---

## 3. Los enlaces largos de Facebook

### 3.1 El problema, con lo que encontré en el código

- Un enlace de posteo hoy es `radarbalcarce.com/nota/<titular completo>-<id>?utm_source=facebook&utm_medium=social&utm_campaign=posteo&utm_content=<id>`, **178 caracteres de media** (160 a 186; medido en el documento `ACORTADOR-DE-ENLACES.md` sobre 99 posteos).
- **Cómo sale en Facebook (`redes/publicar.mjs`, `comoSaleEnFacebook`):** casi siempre como **foto con el texto**. El enlace va como **línea de texto dentro del posteo**, y Facebook no arma tarjeta de vista previa. La variante «enlace con tarjeta» (`publicarEnFacebook`, parámetro `link`) solo se usa si la foto falla tres veces. Por eso el largo se ve feo: es texto suelto en medio del posteo.
- Los repasos, el clima y la farmacia en Facebook llevan **un solo enlace** al final del pie (`enlaceDelRepaso`, `SERVICIOS_CON_PAGINA` en `redes/piezas.mjs`), con las mismas UTM largas. Instagram **nunca** lleva enlace («link en la bio»).
- **Hallazgo que ya estaba en el documento original y se confirma:** las UTM de hoy no las lee nadie. Cloudflare Web Analytics gratis no tiene dimensión de campaña; solo se ve el `referer` (facebook.com). Los enlaces largos pagan el costo de verse mal y no dan lo prometido.

### 3.2 La solución más simple y sin costo: el enlace corto en nuestro dominio

Ya está escrita y probada (`pruebas/enlaces-cortos.test.mjs`):

- `https://radarbalcarce.com/r/f/dg5er4` (36 caracteres; `f` = Facebook, `dg5er4` = el id de la nota). También `/r/f/repaso20261024manana` y `/r/f/clima-manana`.
- Un Worker (`infra/enlaces-cloudflare/worker.mjs`) busca el titular de la nota en `/nota/indice.json` (que el sitio ya publica en cada compilación), contesta **302** hacia la nota con las mismas UTM, y cuenta cada toque en Analytics Engine (red, tipo, destino, persona o robot, sin guardar IP). Un código raro va a la portada, nunca a otro dominio.
- **Costo:** nada nuevo. La cuenta ya paga Workers (US$ 5 por mes, 10 millones de pedidos incluidos; el uso estimado es de unos 3.000 por mes).
- **Qué cambia para el lector:** el posteo muestra `radarbalcarce.com/r/f/dg5er4` en lugar de 178 caracteres.
- **Por qué no la otra mitad de la solución:** dejar el enlace limpio sin UTM lo bajaría a unos 80 caracteres sin tocar nada, pero seguiría siendo largo y no mediría nada. La opción de «reglas de redirección de Cloudflare» sin Worker no puede resolver el titular y mandaría a una página que para notas nuevas es un 404. Un dominio corto aparte cuesta plata.

### 3.3 Riesgos

| Riesgo | Cuánto importa | Qué hacer |
|---|---|---|
| **SEO.** Que Google indexe `/r/...` o vea páginas repetidas | **Bajo**. La respuesta es 302 con `X-Robots-Tag: noindex`, nadie en el sitio enlaza a `/r/`, y la página de destino tiene su dirección canónica limpia (las UTM no crean páginas nuevas) | Opcional: agregar `/r/` a la lista `PRIVADO` de `web/lib/robots.js` |
| **Previsualización de Facebook.** Que la tarjeta con foto no salga | **Bajo en el caso normal** (los posteos van como foto: no hay tarjeta que leer). **Medio en el caso «enlace con tarjeta»** (cuando la foto falla tres veces y en los pies de reels): Facebook sigue la redirección 302 y lee los datos de la página final, pero **solo si el Worker devuelve la nota**. Ver el siguiente | Probar con el depurador de enlaces de Facebook en la primera semana |
| **Un enlace nuevo que el Worker no encuentra** (el índice guardado en memoria 10 minutos todavía no trae la nota que recién salió) | **Medio**. Cae en `/nota/<id>`, que para las notas nuevas **no existe como página** (la web muestra su 404 y un script en el navegador redirige). **El robot de Facebook ve el 404 y la tarjeta sale en blanco** | Cambio de código chico y pedido aparte: si el índice no trae la nota, volver a bajarlo sin esperar los 10 minutos antes de rendirse |
| **Si algún día se saca la ruta o se apaga el Worker, los enlaces ya publicados dejan de andar** | Alto si pasara | La ruta **no se saca nunca** una vez publicado el primer enlace corto. La vuelta atrás es vaciar la variable `ENLACES_CORTOS` (los textos nuevos vuelven al largo), no sacar la ruta |
| **Facebook marca el dominio.** El enlace sigue siendo de nuestro sitio | Igual que hoy | Es la misma duda del tope de Meta de posteos con enlace por mes para páginas comunes (§ 3.1 de `FORMATOS-POR-RED.md`); no la cambia ni la empeora |

### 3.4 Qué hay que prender y en qué orden

Lo hace una persona, salvo los workflows (los toca Claude con su prueba). **No se pasa al paso siguiente sin completar el anterior.**

1. **Subir el Worker.** No existe ningún workflow para eso (`.github/workflows/` tiene `archivo-produccion.yml` como modelo). Dos caminos: a mano desde la PC con `cd infra/enlaces-cloudflare && npx wrangler deploy`, o que Claude escriba `.github/workflows/enlaces-produccion.yml` copiando el del archivo permanente. Usa los secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` que ya existen, y el token necesita «Workers Scripts: Edit».
2. **Poner la ruta** `radarbalcarce.com/r/*`: `CLOUDFLARE_API_TOKEN=… node infra/enlaces-cloudflare/ruta.mjs poner`. Necesita «Workers Routes: Edit» y «Zone: Read» (o la variable `CLOUDFLARE_ZONE_ID`, que ya está en el workflow del archivo).
3. **Probar a mano:** `radarbalcarce.com/r/f/<id de una nota de hoy>` tiene que llevar a la nota con las UTM; `radarbalcarce.com/r/zz/abc` tiene que llevar a la portada. Pegar uno en el depurador de enlaces de Facebook y mirar que la tarjeta salga.
4. **Conectar la variable** (sección 3.5) y recién entonces poner la variable de GitHub `ENLACES_CORTOS` en `Si`.
5. **Vigilar** los primeros posteos: que el enlace sea tocable y lleve a la nota, y que en Analytics Engine aparezcan toques de personas.

### 3.5 La variable no llega: qué hay que conectar, exactamente

*24/10/2026: **hecho** en `redes.yml` (los dos pasos), `piezas.yml`, `reintentar.yml` y `motor-variables.yml` + `cargar-variables.mjs` (regla 311, con `pruebas/variables-conectadas.test.mjs`). Queda apagada; lo que sigue es lo que se escribió antes.*

La auditoría A tiene razón: `ENLACES_CORTOS` **no está en ningún `env:` de ningún workflow**. El código la lee (`redes/publicar.mjs`, `fijarEnlacesCortos(env.ENLACES_CORTOS)`, y `redes/enlaces-cortos.mjs` también mira `process.env`), pero GitHub solo pasa a un paso las variables que el workflow nombra. **Poner `Si` en Settings → Variables hoy no hace nada.**

Hay que agregar la línea `ENLACES_CORTOS: ${{ vars.ENLACES_CORTOS }}` en el `env:` de **estos pasos** (igual que `REDES_ACTIVAS`):

| Archivo | Paso | Qué arma con enlace |
|---|---|---|
| `.github/workflows/redes.yml` | **«Facebook»** (`node redes/publicar.mjs --facebook`) | El enlace de cada posteo de nota |
| `.github/workflows/redes.yml` | **«Publicar en Instagram y en la página de Facebook»** (`node redes/publicar.mjs --piezas`) | El enlace del pie de los reels (repaso, clima, farmacia) |
| `.github/workflows/piezas.yml` | **«Publicar en Instagram y Facebook»** (`--piezas --sin-horario`) | Lo mismo, cuando se corre a mano |
| `.github/workflows/reintentar.yml` | **«Reintentar»** (`node redes/reintentar.mjs`) | El pie del reel que se reintenta (`reintentar.mjs` no llama a `fijarEnlacesCortos`, pero `hayEnlacesCortos` mira `process.env`: alcanza con pasar la variable) |

**No hace falta** en: «Ver qué pieza toca ahora», «Armar las piezas que tocan» (`reels/plan.mjs` no arma el pie), «Completar las direcciones de los podcasts» (`--enlaces`), ni en `actualizar.yml`, `informe-diario.yml`, `vigilancia.yml` ni `motor-variables.yml` (leen `REDES_ACTIVAS` solo para informar).

**Si algún día las redes pasan al Worker de tareas de Cloudflare** (variable `NUBE` del reloj, hoy vacía): `infra/tareas-cloudflare/redes.mjs` le pasa su `env` entero a `publicar.main`, y `main` ya hace `fijarEnlacesCortos(env.ENLACES_CORTOS)`. Entonces hay que crear la variable `ENLACES_CORTOS` en el Worker `radar-balcarce-tareas` (panel de Cloudflare o agregando `--var "ENLACES_CORTOS:…"` a la línea de `wrangler deploy` de `desplegar-nube.yml`; el despliegue usa `--keep-vars`, así que una variable creada en el panel no se pierde).

**Dos cosas más que no son una conexión, pero faltan para que sirva medir:**

- `redes/estadisticas-enlaces.mjs` (**no existe**): lee Analytics Engine con SQL por API y junta los toques por red y pieza para el panel de Números y para la medida 2 de la prueba. Necesita un token con «Account Analytics: Read». Hoy los toques se escriben pero nadie los lee.
- El cambio del Worker para que reintente el índice si no encuentra la nota (3.3).

### 3.6 Orden resumido

Subir el Worker → poner la ruta → probar a mano → conectar la variable en los tres workflows → poner `ENLACES_CORTOS = Si` → vigilar tres días → recién entonces correr la semana 0 de la prueba. Para volver atrás: vaciar la variable. **La ruta se queda.**

---

## 4. Qué se decide el 5/11

| # | Pregunta | Mi recomendación |
|---|---|---|
| 1 | ¿Se aprueba el Worker de enlaces cortos (sección 3) y se sube esta semana? | **Sí**, antes de la semana 0. Sin esto no se puede medir qué posteo trae visitas |
| 2 | ¿Qué se hace con las historias de la prueba del 8/10 («dónde sale cada pieza»)? | Decidir con los reels, que sí se miden; dejar las historias como están sin usarlas para decidir (H-9 de C-REDES) |
| 3 | ¿Se aprueban las tres variantes (A, B, C) o se saca la agresiva? | Probar **B y A** seguro. **C solo si hay una persona** que mire el cupo de voz cada día de esa semana |
| 4 | ¿Quién autoriza Política y Policiales de Balcarce hacia las redes? (D-2 de C-REDES) | Una cola diaria de 3 a 5 candidatas en el celular, con botón «Mandar a redes». Las variantes B y C la usan |
| 5 | ¿Dos números «populares» en las redes (3 para publicar, 8 para destacar)? (D-4) | Sí; entra con B y C |
| 6 | ¿Se crean el canal de WhatsApp, el de YouTube, Telegram y Bluesky? | Sí, en ese orden (sección 2.3) |
| 7 | ¿Se pide la auditoría de la API de YouTube y se descarta la de TikTok? | Sí a las dos cosas |

Lo que dejo **sin decidir** y requiere datos de la semana 0: si hay que apagar el espejo de Instagram, y si el clima de las 7:00 admite el cierre con una nota de acá sin perder reproducciones.

---

*Fuentes consultadas el 24/10/2026 (búsquedas web; lo marcado SIN VERIFICAR no se pudo confirmar en una página oficial):*
- Google: [Videos locked as private](https://support.google.com/youtube/answer/7300965) y la referencia de `videos` de la API.
- TikTok: [Content Sharing Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines) y [Direct Post](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post).
- Meta: [Threads API, resumen](https://developers.facebook.com/docs/threads/overview); Meta: [Content Library, canales de WhatsApp](https://developers.facebook.com/docs/content-library-and-api/content-library-api/guides/wa-channel-update) (solo lectura).
- Bluesky: [límites de uso](https://docs.bsky.app/docs/advanced-guides/rate-limits) y [tutorial de video](https://docs.bsky.app/docs/tutorials/video).
- X: precios por uso, comparados en varios resúmenes de terceros de 2026 (por ejemplo [Medianama](https://www.medianama.com/2026/02/223-x-developer-api-pricing-pay-per-use-model/)).
- YouTube: [calculadora de cuotas](https://developers.google.com/youtube/v3/determine_quota_cost).
