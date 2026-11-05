# Guía: qué tienen que hacer ustedes a mano (5/11/2026)

*Para Hernán y Andrés. Está sacada de los siete informes de esta carpeta (`LIMPIEZA`, `SEGURIDAD-Y-BACKUP`, `MAPA-COMERCIAL-Y-DATOS-MUNICIPALES`, `REHACER-NOTAS-MIGRADAS`, `COMPETENCIA`, `TECNICA`, `CLIMA-Y-ALERTAS`) y de `docs/3-0/LISTA-DE-MEJORAS-05-11.md`. Cada tarea dice qué es, por qué importa, cuánto tarda, dónde se hace y los pasos. Lo que no pude confirmar mirando el repositorio está marcado **«no verificado»** (sobre todo los clics dentro de Cloudflare, que cambian de lugar con el tiempo).*

*Direcciones que se usan seguido (todas verificadas por el nombre del repositorio y de los workflows):*

- *Workflows de GitHub: `https://github.com/radarbalcarce/radar-balcarce/actions` (cada uno tiene su dirección, abajo).*
- *Variables de GitHub: `https://github.com/radarbalcarce/radar-balcarce/settings/variables/actions` (no verificado: es la dirección estándar de GitHub).*
- *Secretos de GitHub: `https://github.com/radarbalcarce/radar-balcarce/settings/secrets/actions` (no verificado: ídem).*
- *Cloudflare: `https://dash.cloudflare.com` (con `radarbalcarce@gmail.com`).*

---

## Resumen: lo urgente de hoy (10 líneas)

1. **Activar el respaldo de la base** (workflow «Radar 3.0: respaldo de la base»): hoy la base D1, donde vive todo el 3.0, no tiene ninguna copia. 5 minutos, dos corridas (tarea 1).
2. **Confirmar que el depósito `radar-render` es privado** en Cloudflare, antes de que el respaldo suba nada ahí (tarea 2).
3. **Decidir qué hacer con sus mensajes de Telegram**: se están guardando, transcriptos, en el repositorio **público** (tarea 3, decide Hernán).
4. **Dar el OK para desplegar el sitio nuevo** (seguridad, fotos, vistas previas, «Seguí leyendo»): está escrito y probado, falta que ustedes digan que sí (tarea 4).
5. **Arreglar Threads**: falló porque el número de usuario o el token no son de la cuenta `radarbalcarce` (tarea 5).
6. **Poner el límite de pedidos en Cloudflare** a `/buscar`: 10 minutos, gratis (tarea 6).
7. **Borrar la basura local más delicada**: `panel/datos/` y `respaldos/` en la PC de Hernán (tienen contraseñas con hash y claves iniciales). Ver la sección «Qué se puede borrar y dónde», ítem A1. **Antes de borrar `docs/propuestas/MAPA-Y-CRONOGRAMA-25-10.html`, ojo: no está en git y no se recupera.**
8. **Crear el canal de WhatsApp del medio** (número 2266 51-1612): gratis y es donde más se comparte en Balcarce (tarea 8).
9. **Mirar el primer carrusel real** el domingo 8/11 a las 11:00 y el informe semanal (tarea 12).
10. **No apagar nada del sistema viejo todavía**: el 3.0 depende de él de cuatro maneras (sección de limpieza, punto «Lo más importante»).

---

## Quién hace qué (tres columnas)

| Quién | Qué | Tareas |
|---|---|---|
| **Lo hago yo (Claude) cuando me lo pidan** | Cambiar la clave del workflow de respaldo por una de sólo lectura; el dueño del bot (`DUENO_CHAT`); Dependabot; INTA SIGA, UV y calidad del aire; mudar los 47 archivos viejos al 3.0; borrar lo que ustedes autoricen en A2 y A3; rehacer las notas migradas; pasar `PENDIENTES.md` a histórico y corregir `CLAUDE.md`; fotos de Telegram para carruseles | 5 bis, 7, 13, 15, 16, 17, 18 y la parte de «Claude» de la sección de borrado |
| **Lo hacen ustedes** (o Hernán/Andrés con mi ayuda paso a paso) | Correr workflows desde el celular o la PC, revisar Cloudflare, borrar carpetas locales, crear el canal de WhatsApp, trámite de Google, pedido al municipio, mails | 1, 2, 4, 5, 6, 8, 9, 10, 11, 12 |
| **Lo decide Hernán** | Qué pasa con sus mensajes de Telegram; pasar el repositorio a privado; si se mantienen las 232 ilustraciones con IA; newsletter; «Lo más leído» con contador propio; color de Automovilismo; qué es dudoso (lista C) | 3, 14, 19 y la lista C |

---

# Parte 1. Tareas ordenadas por urgencia

## URGENTE (hoy)

### Tarea 1. Activar el respaldo diario de la base D1
- **Qué es:** correr dos veces el workflow «Radar 3.0: respaldo de la base» (una de ensayo, otra de verdad) para que quede una copia diaria de la base `radar-nucleo`.
- **Por qué importa:** hoy nadie copia esa base. Si se rompe o se borra algo, las notas, fotos y piezas del 3.0 no se recuperan. El «Respaldo» de los domingos sólo copia el repositorio.
- **Cuánto tarda:** 5 a 10 minutos.
- **Dónde:** `https://github.com/radarbalcarce/radar-balcarce/actions/workflows/v3-respaldo-d1.yml` (verificado: el archivo existe). Después, Cloudflare → R2 → `radar-render` → carpeta `respaldos/d1/` (clics no verificados).
- **Pasos:**
  1. Entrar a la dirección de arriba, con la cuenta de GitHub de `radarbalcarce@gmail.com`.
  2. Tocar **Run workflow** (botón gris a la derecha). Se abre un cuadro.
  3. **Tildar «simular»** (dice «Sólo exportar y controlar, sin subir ni borrar nada»). Tocar el botón verde **Run workflow**.
  4. Esperar 2 a 4 minutos, recargar la página, tocar la corrida nueva. Tiene que terminar con tilde verde. En el resumen tiene que decir cuántas filas hay de notas, historias y artículos.
  5. Si salió bien, repetir el paso 2 pero **sin tildar «simular»**. Conviene a la noche: exportar bloquea la base unos segundos (si justo cae una vuelta del núcleo, la repite la siguiente, a los 15 minutos).
  6. Entrar a Cloudflare → **R2** → `radar-render` → carpeta `respaldos` → `d1`. Tiene que aparecer un archivo `AAAA-MM-DD.sql.gz` (por ejemplo `2026-11-05.sql.gz`).
  7. Desde ahí corre solo todos los días a las 4:20 de Balcarce. Se conservan los últimos 30 días y el primero de cada uno de los últimos 12 meses.
- **Si falla:** error 403 en R2 o en la base = la clave de R2 no llega al depósito, o el token de Cloudflare no puede leer D1. El mensaje del paso «Respaldar la base» lo dice y no muestra datos ni claves. Me lo pasan (el texto del error, no las claves) y lo resuelvo. También llega un aviso por Telegram.
- **Quién:** ustedes. Detalle técnico: `v3/nucleo/REGLAS.md` § 13.

### Tarea 2. Confirmar que `radar-render` es privado
- **Qué es:** mirar que el depósito donde se guardan los respaldos no sea público.
- **Por qué importa:** la base tiene borradores y notas propias. Si el depósito fuera público, cualquiera podría bajar la copia.
- **Cuánto tarda:** 3 minutos.
- **Dónde:** Cloudflare → R2 → `radar-render` → **Settings** (camino de clics, **no verificado**: la pantalla de Cloudflare puede haber cambiado).
- **Pasos:**
  1. Entrar a `https://dash.cloudflare.com`, cuenta de `radarbalcarce@gmail.com`.
  2. Menú de la izquierda: **Storage & databases → R2 object storage** (o «R2»). Tocar `radar-render`.
  3. Pestaña **Settings**. Buscar «Public access» / «Public Development URL» (r2.dev) y «Custom Domains».
  4. Tiene que estar todo **apagado/desconectado** (r2.dev deshabilitado, ningún dominio propio conectado).
  5. Buscar «Object lifecycle rules»: **no tiene que haber ninguna regla que borre la carpeta `respaldos/`**.
  6. Si algo está prendido, no tocar y avisarme: lo vemos juntos (la placa `/placa/…` de redes se sirve por el Worker, no por acceso público).
- **Quién:** ustedes.

### Tarea 3. Sus mensajes de Telegram están en el repositorio público
- **Qué es:** el workflow «Telegram: leer» guarda todo lo que Hernán le contesta al bot (transcripto) en `v3/redaccion/telegram/entrada/`. Hoy está `2026-11-02.md`: un audio de dos minutos sobre cómo ven el medio los comerciantes.
- **Por qué importa:** es una conversación privada en un repositorio que cualquiera puede leer. No hay claves ni datos de terceros, pero igual.
- **Cuánto tarda:** la decisión, 2 minutos. Ejecutarla, según la opción.
- **Dónde:** `https://github.com/radarbalcarce/radar-balcarce/tree/main/v3/redaccion/telegram/entrada` (para ver qué hay) y `.github/workflows/v3-telegram.yml`.
- **Opciones (decide Hernán):**
  - **(a)** Pasar el repositorio a privado (ya estaba previsto). Antes hay que apagar los workflows viejos y compactar el historial (`PENDIENTES.md`), y mirar que el sitio y los Workers no dependan de que sea público (no verificado, hay que revisarlo con cuidado: no es un paso para hacer a las apuradas).
  - **(b)** Que «leer» guarde en el KV/R2 en vez del repositorio. Lo hago yo (poco código).
  - **(c)** Borrarlo del historial de git. Lo hago yo, pero reescribe el historial: pedirlo con tiempo.
- **Mientras se decide:** no usar el bot para pasar nada que no quieran hacer público. Y nunca pegar claves en el chat (regla vieja).
- **Quién:** decide Hernán; (b) y (c) los hago yo.

### Tarea 4. Dar el OK para desplegar el sitio nuevo
- **Qué es:** subir al sitio todo lo que está escrito y probado desde el 5/11: «Seguí leyendo», compartir con íconos, sin la línea de IA, `http` que pasa a `https`, cabeceras de seguridad, la imagen `og-default.png`, migas, «Lo más contado», datos estructurados, toques de 44 px en celular, «Saltar al contenido», fotos propias.
- **Por qué importa:** nada de eso se ve en radarbalcarce.com hasta desplegar. Y las fotos propias evitan quedarse sin foto si otro medio las borra o las bloquea.
- **Cuánto tarda:** decirme que sí, un minuto. Despliegue, unos 10 minutos.
- **Dónde:** `https://github.com/radarbalcarce/radar-balcarce/actions/workflows/v3-desplegar.yml` (verificado). Opción `sitio`.
- **Pasos:**
  1. Decirme «dale, desplegá el sitio». (Yo lo corro y miro el sitio en vivo después, como siempre.)
  2. Si prefieren hacerlo ustedes: la dirección de arriba → **Run workflow** → en «Qué subir» elegir **sitio** → **Run workflow**. Esperar el tilde verde.
  3. Mirar en el celular `https://radarbalcarce.com`: una nota debe mostrar los íconos de compartir y «Seguí leyendo» al final.
  4. **Fotos propias** (segundo paso, después): ir a `https://github.com/radarbalcarce/radar-balcarce/actions/workflows/v3-fotos-propias.yml` → Run workflow → **tildar «simular»** la primera vez, mirar el recuento; después correr sin simular para el relleno de las ~500 notas.
  5. Para que corra solo cada hora: crear la variable de GitHub **`FOTOS_PROPIAS_ACTIVAS`** con valor **`si`** (`https://github.com/radarbalcarce/radar-balcarce/settings/variables/actions` → New repository variable). Por defecto no existe y no corre sola.
- **Cambios visibles que se consultan antes (regla del 4/10):** que la portada use la imagen del medio en vez de la foto de la primera nota al compartir. No va hasta que Hernán diga.
- **Quién:** el OK es de Hernán; lo corro yo o lo corren ustedes.

### Tarea 5. Arreglar Threads
- **Qué es:** la prueba de Threads falló («el objeto con ese ID no existe o no tiene permisos»). Casi seguro `THREADS_USER_ID` o el token no corresponden a la cuenta `radarbalcarce`.
- **Por qué importa:** una red sin publicar. La prueba real se verifica con la próxima nota nueva.
- **Cuánto tarda:** 10 a 20 minutos.
- **Dónde:** secretos de GitHub `THREADS_TOKEN` y `THREADS_USER_ID` (los usa `v3-piezas.yml`): `https://github.com/radarbalcarce/radar-balcarce/settings/secrets/actions`. El token se genera en el panel de apps de Meta (**no verificado**: dirección exacta).
- **Pasos:**
  1. Verificar que `THREADS_USER_ID` sea **un número** (no el nombre de usuario `@radarbalcarce`) y que sea el de la cuenta de Threads del medio.
  2. Verificar que el token se haya generado **con esa misma cuenta** de Threads (no la de otra persona).
  3. Actualizar el secreto que esté mal: Secrets → tocar el lápiz del secreto → pegar el valor nuevo → guardar. **Nunca pegar el token en un chat conmigo.**
  4. Avisarme que lo cambiaron; yo reintento y miro con la próxima nota nueva.
- **Quién:** ustedes (pegar el secreto); yo reintento. Si falla otra vez, lo vemos juntos.

### Tarea 6. Límite de pedidos en Cloudflare
- **Qué es:** una regla que frena a un robot que pida `/buscar` mil veces por minuto.
- **Por qué importa:** esas búsquedas van a la base cada vez, sin caché. Un robot insistente sube el uso. El código no puede limitarlo bien: tiene que ser una regla de Cloudflare.
- **Cuánto tarda:** 10 minutos. Gratis en el plan actual.
- **Dónde:** Cloudflare → `radarbalcarce.com` → Seguridad → WAF → Reglas de límite de pedidos (camino de clics **no verificado**).
- **Pasos:**
  1. `https://dash.cloudflare.com` → elegir el sitio **radarbalcarce.com**.
  2. **Security → WAF → Rate limiting rules** → **Create rule**.
  3. Regla 1: ruta (URI Path) igual a `/buscar`, **20 pedidos por minuto por IP**, acción **Block** por 10 minutos.
  4. Regla 2: ruta igual a `/csp-reporte` (método POST), **30 por minuto por IP**, misma acción.
  5. Opcional: encender **Bot Fight Mode** (Security → Bots).
  6. Probar buscando algo en el sitio una vez para ver que funciona normal.
- **Quién:** ustedes (yo puedo guiarlos clic por clic mientras miran la pantalla).

## ESTA SEMANA

### Tarea 7 (5 bis). Cerrar dos riesgos chicos del bot y los tokens
- **Qué es:** (a) token aparte para el respaldo con permiso sólo de lectura de D1; (b) cerrar «el primer chat que le escriba al bot pasa a ser el dueño» si se vaciara el KV `ESTADO`.
- **Por qué importa:** hoy un solo `CLOUDFLARE_API_TOKEN` hace de todo. Y el dueño del bot se define por quién escribe primero si se pierde el estado.
- **Cuánto tarda:** 10 minutos ustedes + lo mío.
- **Dónde:** Cloudflare → Mi perfil → API Tokens (no verificado); secretos de GitHub.
- **Pasos (a):** 1) Crear un token en Cloudflare con **sólo «D1: Read»**. 2) Guardarlo en GitHub como secreto **`CLOUDFLARE_API_TOKEN_RESPALDO`** (sin pegarlo en el chat). 3) Pedirme «cambiá el workflow del respaldo» (es una línea de `v3-respaldo-d1.yml`). Revisar también que las claves de R2 estén limitadas por depósito.
- **Pasos (b):** pedirme «implementá `DUENO_CHAT`»; necesito el número de chat de Hernán (se saca con el propio bot). Cambia cómo arranca el bot, por eso Hernán lo aprueba.
- **Quién:** ustedes los tokens; yo el código.

### Tarea 8. Canal de WhatsApp del medio
- **Qué es:** crear un canal de WhatsApp de Radar Balcarce con el repaso del día y avisos importantes (clima, cortes, farmacia).
- **Por qué importa:** hoy no hay forma de quedarse con nosotros fuera de las redes. Infobae y El Marplatense lo tienen. Es gratis y en Balcarce se comparte mucho por WhatsApp.
- **Cuánto tarda:** 15 minutos.
- **Dónde:** la aplicación WhatsApp en el celular con el número del medio (2266 51-1612): pestaña **Novedades → Canales → «+» → Crear canal** (camino de clics **no verificado**, puede cambiar según versión).
- **Pasos:** 1) Con el WhatsApp del medio, crear el canal «Radar Balcarce». 2) Poner foto (el logo azul) y descripción corta. 3) Copiar el enlace del canal. 4) Pasarme el enlace: lo pongo en el encabezado, el pie, las notas y las redes.
- **Quién:** Hernán o Andrés (hace falta el teléfono con ese número). Yo pongo el enlace.

### Tarea 9. Google: Publisher Center / «Seguir en Google» y Discover
- **Qué es:** registrar el medio en Google Publisher Center para tener el perfil «Seguir en Google» y aparecer en Discover y Google News.
- **Por qué importa:** gratis y trae lectores. El sitio ya tiene sitemap de noticias y `NewsArticle`, que es lo difícil; falta el trámite.
- **Cuánto tarda:** 30 a 60 minutos (los requisitos exactos para un medio nuevo: **no verificado**, leer la ayuda de Google).
- **Dónde:** `https://publishercenter.google.com` (no verificado) con la cuenta del medio; Search Console ya está con `radarbalcarce@gmail.com`.
- **Pasos:** 1) Entrar con `radarbalcarce@gmail.com`. 2) Agregar la publicación `radarbalcarce.com`. 3) Verificar la propiedad (ya está verificada en Search Console, debería aceptarlo). 4) Completar nombre, logo y secciones. 5) Avisarme si pide algo que no entienden. Ya está hecha en el código la etiqueta `max-image-preview:large` (para fotos grandes en Discover).
- **Quién:** ustedes (es un trámite con la cuenta); yo reviso el sitio.

### Tarea 10. Pedido de información al municipio (padrón de comercios y datos abiertos)
- **Qué es:** presentar un pedido de acceso a la información pública para obtener el padrón de comercios habilitados (nombre, rubro, domicilio, **sin datos personales**), la lista de entidades y clubes, y licitaciones; y pedir que Radar entre en la lista de prensa.
- **Por qué importa:** es el listado más completo posible para la guía comercial y alimenta las notas con datos del municipio. Nadie lo pidió todavía (**no verificado** que exista un formulario).
- **Cuánto tarda:** 30 minutos para presentarlo; el plazo de respuesta depende de la norma (15 días hábiles en la ley nacional; el municipio puede tener otro: **no verificado**).
- **Dónde:** Mesa de Entradas de la Municipalidad de Balcarce o Secretaría de Prensa/Comunicación. El borrador está en `docs/3-0/auditoria-05-11/MAPA-COMERCIAL-Y-DATOS-MUNICIPALES.md`, § 7.4.
- **Pasos:** 1) Abrir el borrador del § 7.4 y completar fecha, secretaría y año. 2) Poner nombre y DNI de **quien firma** (lo hace una persona). 3) Presentarlo en Mesa de Entradas (o el canal que indique el municipio) y guardar el número de trámite. 4) En paralelo, hablar con Prensa para pedir una casilla de prensa. 5) Contarme lo que contesten; yo armo el lector de licitaciones y decretos.
- **Cuánto cuesta:** nada.
- **Quién:** ustedes (la firma es de una persona). Si quieren, consulten con un abogado o la AAIP si hay que inscribir la base de contactos antes de armar la guía (**no verificado** si corresponde).

### Tarea 11. Mandar los primeros mensajes a los comercios (cuando haya guía)
- **Qué es:** el primer contacto con cada comercio, de a uno, desde el WhatsApp del medio o en persona, pidiéndole que confirme sus datos.
- **Por qué importa:** la confirmación del titular es lo que da valor y respaldo legal al mapa comercial. Un programa no puede mandarlos: tiene que ser una persona, un mensaje por vez, diciendo quién escribe, por qué y cómo salirse.
- **Cuánto tarda:** 2 minutos por comercio.
- **Dónde:** WhatsApp del medio. Los mensajes ya están escritos en `comercial/propuestas.mjs`.
- **Pasos:** 1) Decidir (Hernán) si la guía sale con datos sin confirmar, rotulados, o sólo con lo confirmado. 2) Empezar con 30 a 40 comercios: farmacias, hoteles, restaurantes, ferreterías, supermercados. 3) Mandar el mensaje uno por uno. 4) Anotar quién confirmó y quién pidió la baja. **No** comprar listas ni raspar Facebook/Instagram.
- **Estado:** todavía falta construir el formulario de confirmación con enlace único (lo hago yo cuando lo pidan).
- **Quién:** ustedes; decide Hernán.

### Tarea 12. Mirar el primer carrusel y el informe de la semana
- **Qué es:** el domingo 8/11 a las 11:00 sale el primer carrusel «La semana en Balcarce» en Facebook e Instagram, y llega el informe semanal para comparar con la línea de base del 3/11.
- **Por qué importa:** los carruseles **no se probaron contra Meta de verdad**. La semana de medición decide qué red y qué pieza se recorta.
- **Cuánto tarda:** 10 minutos.
- **Dónde:** páginas de Facebook e Instagram del medio; `docs/3-0/ESTADISTICAS-LINEA-DE-BASE-2026-11-03.md` para la comparación.
- **Pasos:** 1) El domingo a las 11, mirar Facebook e Instagram: ¿salió el álbum? ¿está en orden? ¿Instagram aceptó las láminas? 2) Mirar también el primer posteo en X por Buffer (la forma de pedir imágenes no se probó). 3) Avisarme lo que vean; yo reviso el registro de errores. 4) Ojo: el 10/11 cae martes, el informe de la semana es el del 8/11.
- **Quién:** ustedes miran; yo reviso lo técnico.

## DESPUÉS (cuando se pueda)

### Tarea 13. Rehacer las notas migradas del último mes
- **Qué es:** poner foto a 421 notas que no tienen, unir 17 repetidas y rehacer 2 de cuerpo corto (unas 436 en total). **No** reescribir las 2.348: ya cumplen el formato.
- **Por qué importa:** 6 de cada 14 en una muestra no tenían imagen; 421 salen con la imagen genérica. Los repetidos confunden a Google.
- **Cuánto tarda:** decisiones, 10 minutos de ustedes; la ejecución, 7 días a 60 notas por día (hasta ~14/11 si se arranca el 6/11). Costo: unos US$ 0,30.
- **Dónde:** lo hago yo con `v3/nucleo`. Los topes: 500 pedidos por día del núcleo y freno mensual de US$ 7.
- **Decisiones de Hernán antes de arrancar:**
  1. Qué foto: la de las fuentes de la nota, la placa, o una ilustración con IA. Las 232 que ya dicen «Ilustración generada con IA»: ¿se mantienen?
  2. Las 17 repetidas: ¿las une un script (huella de significado) o se miran a mano?
  3. Qué modelo: el flash-lite del núcleo ya tiene el criterio; Haiku no está conectado.
  4. Confirmar los cupos gratis de Groq y Mistral si se usan de respaldo (**no verificado** en `v3/`).
  5. Mirar cuánto gasta el núcleo hoy (informe de las 8 y las 20) antes de arrancar.
- **Quién:** lo hago yo cuando Hernán decida. La etapa 2 (las otras 1.900) se decide después de mirar 20 rehechas.

### Tarea 14. Newsletter y «Lo más leído» (decide Hernán)
- **Qué es:** una newsletter semanal («Lo que pasó en Balcarce») y un «Lo más leído» de verdad.
- **Por qué importa:** la newsletter es el motor de medios chicos en el exterior; pero pide un formulario, aviso de privacidad y puede pasar el tope de US$ 10 si crece. «Lo más leído» pide un contador propio sin cookies; hoy el sitio muestra «Lo más contado» (por cantidad de fuentes).
- **Cuánto tarda:** decidir, 5 minutos.
- **Dónde:** acá, en chat.
- **Quién:** decide Hernán; yo lo armo.

### Tarea 15. Estación del INTA y datos del clima
- **Qué es:** sumar la estación automática del INTA Balcarce (SIGA, id 242: temperatura, humedad y lluvia cada 10 minutos, sin clave), más UV, sol y calidad del aire de Open-Meteo.
- **Por qué importa:** confirma con datos medidos acá los avisos de helada. Riesgo: la dirección del INTA no está documentada (se usa la misma de su web); por eso hay respaldo en Open-Meteo y aviso del vigilante.
- **Cuánto tarda:** medio día mío; el mail de ustedes, 10 minutos.
- **Pasos para ustedes:** escribir al INTA Balcarce pidiendo permiso de uso y que confirmen si pueden mantener estable el servicio. No es requisito para empezar. El crédito va siempre: «Fuente: INTA, estación EEA Balcarce».
- **Aclaración honesta:** los avisos de clima son un **cálculo nuestro**, no una alerta oficial. El SMN quedó descartado (503/403 y sin API pública); si algún día se quiere su clave oficial, es un trámite de una persona.
- **Quién:** yo lo construyo; ustedes mandan el mail.

### Tarea 16. Dependabot y revisión trimestral de secretos
- **Qué es:** (a) un archivo `.github/dependabot.yml` para actualizar las acciones de GitHub; (b) una vez por trimestre, correr gitleaks sobre todo el historial.
- **Por qué importa:** (a) mantiene al día las acciones, pero abre pull requests solos, por eso lo decide Hernán; (b) mi revisión buscó claves por formato y no garantiza el token de Cloudflare ni las claves de R2.
- **Cuánto tarda:** 5 minutos (a); 15 minutos (b).
- **Quién:** (a) lo agrego yo si Hernán dice que sí; (b) una persona con mi ayuda (instalar gitleaks agrega un programa nuevo).

### Tarea 17. Workers con dirección `workers.dev` y CSP
- **Qué es:** (a) apagar `workers_dev` en los Workers que sólo se usan entre sí; (b) pasar la política de seguridad (CSP) de «sólo informar» a «bloquear».
- **Por qué importa:** `/salud` del núcleo muestra el gasto estimado en dólares. Y la CSP sólo se bloquea después de saber que no rompe los anuncios.
- **Cuánto tarda:** (a) lo mío, no urgente: **puede cortar la vigilancia**, hay que revisar `DIRECCION_NUCLEO` antes. (b) esperar **dos semanas** de avisos.
- **Dónde:** para (b): `npx wrangler tail radar-sitio` o los registros del Worker en Cloudflare (buscar `csp-reporte`).
- **Quién:** yo; el visto bueno de Hernán para pasar a bloquear.

### Tarea 18. Que las alertas y el servicio del sitio funcionen en celular (ya hecho en parte)
- **Qué es:** probar en un celular real la altura de los toques (44 px), la velocidad, y arreglar lo que falta: los avisos publicitarios («Clic acá», teléfono), modo oscuro y más etiquetas de accesibilidad.
- **Por qué importa:** se hizo sin celular real; la velocidad real no se midió (LCP, Core Web Vitals), ni el efecto de AdSense.
- **Cuánto tarda:** 10 minutos de ustedes: abrir el sitio en el celular, navegar y contarme lo que se vea mal.
- **Decisión de color (Hernán):** Automovilismo `#B45309` sobre crema da contraste 4,45 (el mínimo es 4,5). Si se quiere, oscurecerlo a `#A84D08`. Sin tocar hasta que digan.
- **Quién:** ustedes prueban; yo corrijo.

---

## Lo que no hay que hacer (según las investigaciones)

- No publicar fúnebres (aunque otros medios locales lo hacen).
- No hacer AMP.
- No cambiar portada ni menú sin consultar a Hernán.
- No usar Google Places como base propia, ni raspar Facebook/Instagram, ni mandar mensajes masivos a comercios.

---

# Parte 2. Qué se puede borrar y dónde

*Fuente: `LIMPIEZA.md`, listas A y C. Todo lo de la lista B (el sistema viejo) **no se borra todavía**: el 3.0 depende de él.*

## Reglas generales antes de borrar nada

1. **No borrar nada hasta tener el visto bueno de Hernán.** Yo no borré nada: esto es sólo la guía.
2. **Lo que está en git se puede recuperar del historial de GitHub; lo que no está en git, no.** Por eso va primero la copia de lo que no está en git (marcado abajo).
3. **Cómo se borra en la PC con el Explorador de Windows:** abrir el Explorador → ir a `D:\BalcarDev\Radar Balcarce` → botón derecho sobre la carpeta → **Eliminar**. Va a la **Papelera de reciclaje**: si se arrepienten, se recupera de ahí hasta que la vacíen. **No vaciar la Papelera** hasta pasada una semana. Para saltar un archivo de la Papelera (si es enorme), se usa Shift+Supr: no recomendado.
4. **Cómo se borra algo que está en git (GitHub):** se borra en la PC y se «commitea» (me lo piden a mí; yo hago el commit con `git rm` y lo subo). El historial queda: un borrado se puede deshacer. **No se borra desde la web de GitHub** si hay más de un archivo.

## ADVERTENCIA IMPORTANTE (leer antes de A1)

- **`panel/datos/` y `respaldos/` tienen claves.** Adentro hay `CLAVES-INICIALES.txt`, `secreto.txt`, `usuarios.json` (contraseñas con hash), la dirección del túnel y datos del buzón. **No los copien a un pendrive, ni al Drive, ni los manden por mail ni WhatsApp.** No hace falta guardarlos: el panel de la PC se retiró el 17/10 y ya no se usan. Se borran **primero**, y después se vacía la Papelera para que no queden copias en la PC (acá sí: estas dos sí conviene vaciar la Papelera después, porque tienen claves).
- Si alguna vez esas claves se usaron para otra cosa (por ejemplo, la misma contraseña en otro servicio), cambiar esa contraseña **en ese servicio**.
- **`docs/propuestas/MAPA-Y-CRONOGRAMA-25-10.html` (43 KB) NO está en git** (`git status` lo marca como `??`). Si se borra, **no se recupera** del historial. Antes de decidir (ítem C8), **copiarlo a un lugar propio** (por ejemplo `Documentos\Radar-copias\`). Y nadie debe ejecutar un `git clean` ni «limpiar archivos sin seguimiento» mientras ese archivo esté ahí.

## Lista A. Se puede borrar ya, sin riesgo

*Los carteles dicen: **PC** = se borra en el Explorador de Windows; **GitHub** = está en git, se borra con un commit que hago yo; **Claude** = lo hago yo cuando me lo pidan.*

### A1. Basura local (no está en git: sólo en la PC de Hernán, no hay copia en GitHub)

| # | Qué | Tamaño | Dónde y cómo | Qué NO borrar | Antes de borrar |
|---|---|---|---|---|---|
| A1.1 | `panel/datos/` | 4,6 MB | **PC.** `D:\BalcarDev\Radar Balcarce\panel\datos`. Botón derecho sobre la carpeta `datos` → Eliminar. **Lo más delicado: hacer primero. Después vaciar la Papelera.** | **No borrar `panel\` entera**: lo que está afuera de `datos` es código del panel del celular, que sigue sirviéndose (ítem C1) | Nada de copia (tiene claves). Revisar que no haya nada propio ahí |
| A1.2 | `respaldos/` | 14 MB | **PC.** `D:\BalcarDev\Radar Balcarce\respaldos`. Eliminar la carpeta. **Después vaciar la Papelera.** | **No confundir con el respaldo nuevo de la base** (`radar-render/respaldos/d1/` en Cloudflare R2: eso **no se toca**). Ni con el workflow «Respaldo» de los domingos | Son copias del panel de la PC del 24 al 28/9 con contraseñas con hash y datos del buzón |
| A1.3 | `.cache/tarjetas/` y los `.cache/informe-del-dia-*.json` | ~360 MB | **PC.** `D:\BalcarDev\Radar Balcarce\.cache\`. Borrar la carpeta `tarjetas` y los archivos `informe-del-dia-*.json` | No borrar la carpeta `.cache` si tiene otras cosas (mirar adentro) | Nada: se regeneran solos |
| A1.4 | `reels/salida/` | 71 MB | **PC.** `D:\BalcarDev\Radar Balcarce\reels\salida` | **No borrar `reels\`**: tiene las tipografías y código que usa el 3.0 (ver B1 de LIMPIEZA) | Nada: videos de prueba |
| A1.5 | `docs/propuestas/redes-3-0/videos/` | 55 MB | **PC.** `D:\BalcarDev\Radar Balcarce\docs\propuestas\redes-3-0\videos` | **No borrar el resto de `redes-3-0\`** (las maquetas, 24 MB, están en git y son la base de lo ya aplicado) | Se regeneran con `v3/redes/piezas/ejemplos.mjs`. Si quieren ver algún video de ejemplo, verlo antes |
| A1.6 | `v3/sitio/scripts/salida/` | 9 MB | **PC.** `D:\BalcarDev\Radar Balcarce\v3\sitio\scripts\salida` | **No borrar `v3\sitio\scripts\`** (tiene `migrar.mjs` y demás) | Los SQL de la migración los rehace `migrar.mjs`. No hace falta copiar |
| A1.7 | `web/.next/` | 54 MB | **PC.** `D:\BalcarDev\Radar Balcarce\web\.next` | **No borrar `web\`** (sitio viejo, respaldo vivo) | Nada: es la compilación local |
| A1.8 | `ingesta/salida/`, `comercial/salida/`, `comercial/datos/osm-crudo.json`, `infra/render-publico/reels/salida/`, `v3/nucleo/scripts/salida/`, `reels/a-mano/publicidad-radar.mp4` | menos de 4 MB | **PC**, cada una en su ruta, con el Explorador | **Nada más de esas carpetas** (`comercial\datos\` tiene otros archivos que no son `osm-crudo.json`; `reels\a-mano\` tiene otros que son del viejo) | `publicidad-radar.mp4`: mirar si es un video que quieren conservar; si sí, copiarlo antes |
| A1.9 | Restos de empaquetado en `.git/objects/pack/tmp_pack_*` (26 archivos) y `tmp_obj_*` | a medir | **Claude.** Se limpian con `git gc --prune=now`. **No borrar nada de adentro de `.git` a mano** | **Nada** dentro de `.git` | Hacerlo con calma, sin otro `git` corriendo. Yo lo hago cuando me lo pidan |

*Recomendación: yo puedo mover todo lo de A1 a una carpeta `papelera-pendiente` en vez de borrarlo, para que lo vean ustedes. Si lo quieren así, me avisan.*

### A2. Workflows de GitHub que ya cumplieron su trabajo (9 archivos, en git)

- **Dónde está cada uno:** en `.github/workflows/`, por ejemplo `https://github.com/radarbalcarce/radar-balcarce/blob/main/.github/workflows/probar-mail.yml`. Se borran **en la PC y con un commit que hago yo** (**GitHub**), no uno por uno en la web.
- **Quién:** yo, cuando Hernán lo autorice. Son todos «sólo a mano»: no corre ninguno solo.
- **Qué NO borrar:** ningún otro workflow. Los 6 `v3-*` y `v3-respaldo-d1.yml` **son del sistema vigente**. Tampoco `crear-voces.yml` ni `auditar-voz.yml` (las voces propias vencen el 29/09/2027).
- **Antes de borrar:** también hay que sacar el nombre del archivo de los documentos que lo mencionan (yo lo hago en el mismo commit). El historial de git conserva los archivos: se pueden recuperar.

| Workflow | Qué era | Documentos que lo nombran |
|---|---|---|
| `probar-mail.yml` | Probó que llegan los avisos por mail (15/10). Los avisos del 3.0 son por Telegram | 3 |
| `ver-facebook.yml` | Miraba la página de Facebook (8/10) | 4 |
| `reparar-estadisticas.yml` | Arreglo único de días en cero (15/10) | 4 |
| `probar-imagenes.yml` | Comparó dos modelos de imágenes (22/10) | 0 |
| `probar-ilustraciones.yml` | Ilustraciones de prueba (27/10) | 0 |
| `imagenes-sueltas.yml` | Generó imágenes una vez (30/10) | 0 |
| `sitio-de-prueba.yml` | Vista previa del sitio viejo (25/10) | 0 |
| `motor-ensayo.yml` | Ensayo de la mudanza a Cloudflare (22/10) | 0 |
| `ensayo-nube.yml` | Ídem | 0 |

### A3. Archivos sueltos y documentos vencidos (en git)

| # | Qué | Tamaño | Dónde y cómo | Qué NO borrar | Antes de borrar |
|---|---|---|---|---|---|
| A3.1 | `docs/CHECKLIST-JUEVES-29-10.md` | 8 KB | **GitHub (Claude).** No se borra: se **mueve** a `docs/historico/` con `git mv` | El resto de `docs\` | Nada. Es historia |
| A3.2 | `docs/efemerides-octubre-para-revisar.md` | 20 KB | Igual: se mueve a `docs/historico/` | `docs\13-EFEMERIDES.md` y `ingesta/efemerides-curadas.json` | Nada |
| A3.3 | `infra/sitio-por-worker/` + `pruebas/sitio-por-worker.test.mjs` + `pruebas/comparar-sitios.test.mjs` + `docs/proyecto/SITIO-POR-WORKER-PLAN.md` | 58 + 20 KB | **GitHub (Claude).** Es una idea nunca desplegada; el 3.0 lo resolvió con `v3/sitio/` | **No borrar el resto de `infra\`**: los demás Workers del viejo siguen corriendo | Borrar las dos pruebas **junto con** la carpeta, para que `npm test` siga verde. Que Hernán confirme que la idea no se retoma |
| A3.4 | `v3/sitio/scripts/capturas-media-kit/` | 4,6 MB (12 archivos) | **GitHub (Claude).** Si se rehace el media kit de noviembre, **no borrar**: las usa `imagenes-media-kit.mjs` (ítem C4) | `v3\sitio\media-kit\` y los otros scripts del media kit | **Decide Hernán** si el media kit se rehace. Si hay dudas, dejarlo |

## Lista C. Dudoso: decide Hernán

*Para cada uno: qué es, dónde se borraría, qué no, y qué hacer antes. **Hasta que Hernán diga «borrar», no se toca ninguno.***

| # | Qué | Dónde (PC o GitHub) | Qué NO borrar | Antes |
|---|---|---|---|---|
| C1 | `panel/`, `web/public/panel/` y el workflow `panel.yml` (el panel del celular viejo) | **GitHub.** Hoy se sigue sirviendo en `/panel/` y escribe con la llave de GitHub | **No borrar mientras el bot de Telegram no cubra las pestañas Fotos, Fechas, Contactos, Pistas, Números y Revisión** (no verificado que las cubra) | Decidir qué pasa con esas funciones. La futura `/admin` no existe todavía. Respaldar `web/data/contactos-celular.json` y `celular-*.json` (C14) |
| C2 | `comercial/` (guía de comercios) y `motor/` (cimientos de una base D1) | **GitHub.** `CLAUDE.md` los marca «dormidos: los borra el dueño» | `comercial/propuestas.mjs` está citado en el mapa comercial (Tarea 11) | **La base comercial puede servir para vender avisos.** Decidir primero qué se hace con el mapa comercial |
| C3 | `infra/enlaces-cloudflare/` (acortador `radarbalcarce.com/r/*`, apagado) | **GitHub** | Nada más de `infra\` | Podría servir para X sin enlace largo |
| C4 | Media kit: `docs/propuestas/MEDIA-KIT-2026-11.html` y `.pdf`, `docs/propuestas/media-kit/`, `anunciantes/`, `scripts/media-kit.mjs`, `v3/sitio/media-kit/`, `v3/sitio/scripts/{capturas,imagenes,nota}-media-kit.mjs` | **GitHub** | **No borrar si hay un primer aviso real** | **Copiar el `.pdf` y el `.html` a una carpeta propia** (por ejemplo `Documentos\Radar-copias\`) antes de tocar |
| C5 | `docs/propuestas/tapa-3-0/` (15 MB, maquetas B «Tarjetas» y C «Revista») | **GitHub** | **No borrar `a-diario.html`**: el código del 3.0 lo cita (`v3/sitio/vistas/`). `docs/propuestas/redes-3-0/` tampoco (maquetas aplicadas) | Son diseños descartados que algún día se querrán ver: mejor mover a `docs/historico/` que borrar |
| C6 | `CRITERIO-EDITORIAL.md`, `CRITERIO-REDES.md`, `docs/CRITERIO-EN-UNA-PAGINA.md` | **GitHub** | **No borrar sin decidir cuál criterio manda**: pueden seguir siendo el criterio de la IA del 3.0 (`v3/nucleo/PERFIL.md` y `REGLAS.md`) | Decisión de Hernán: ¿cuál es el vigente? Yo comparo los dos y les muestro |
| C7 | `scripts/claude-con-openrouter.cmd`, `usar-claude.cmd`, `usar-deepseek.cmd`, `deepseek.mjs` | **PC y GitHub** | **No borrar si Hernán los usa personalmente** para seguir trabajando cuando se acaba el cupo de Claude | Preguntarle a Hernán si todavía los usa |
| C8 | **`docs/propuestas/MAPA-Y-CRONOGRAMA-25-10.html` (43 KB)** | **PC.** `D:\BalcarDev\Radar Balcarce\docs\propuestas\` | **No está en git: si se borra, NO se recupera** | **Copiarlo primero** a `Documentos\Radar-copias\`. Mirarlo: parece el mapa y cronograma de la 2.0. Ningún documento lo nombra. Si no sirve, recién ahí borrar |
| C9 | `docs/propuestas/` (47 MB en git): `MAPA-RADAR-3-0-01-11.html`, `RADAR-3-0-RESUMEN.html`, `MUESTRA-NOTAS-3-0.html`, `COMO-FUNCIONA-LA-IA.html`, `LIMPIEZA-DE-DOCUMENTOS-25-10.md`, `SIMPLIFICAR-PRUEBAS.md`, `PASOS-PARA-USTEDES.md`, `THREADS-X-BUFFER-30-10.md`, `COMPARATIVA-MODELOS-30-10.md`, `DISENOS-A-ARMAR.md`, `EN-LOS-MEDIOS-DE-BALCARCE.md` | **GitHub (Claude).** Lo mejor es **mover a `docs/historico/`**, no borrar | **No tocar `PLAN-RADAR-3-0.md`**: tiene las decisiones del 3.0 (sección 10) | Yo reviso cuáles ya se decidieron y propongo la lista |
| C10 | `docs/COMO-FUNCIONA-HOY.html`, `docs/REGLAS-Y-PROMPTS.html`, `docs/diseno/`, `docs/secciones/`, `docs/panel/`, `docs/criterio/`, `docs/flujos/INFORME-DE-HOY.html`, `docs/etapa-1-fuentes/` (1 MB) | **GitHub (Claude)**: mover a `docs/historico/` | `docs/10-REGLAS-Y-PRUEBAS.md`: la historia del criterio se lee ahí | Nada en la 3.0 enlaza a esto |
| C11 | Workflows de diagnóstico: `diagnostico-instagram.yml`, `buffer.yml`, `probar-gemini.yml`, `claves-huella.yml`, `compactar-historial.yml` | **GitHub** | **No borrar `buffer.yml` ni `diagnostico-instagram.yml`**: sirven al 3.0 (probar canales de Buffer; `PENDIENTES-3-0.md` pide `redes/buffer.mjs --probar`). **`compactar-historial.yml`** se necesita antes de pasar el repo a privado | Decidir uno por uno |
| C12 | `.github/workflows/pruebas.yml` y `pruebas-otra-hora.yml` | **GitHub** | **No borrar todavía**: corren las 3.000 pruebas del viejo, de las que depende el 3.0 | **Antes**, que yo arme un workflow de pruebas para `v3/` (hoy `node --test "v3/**/*.test.mjs"` sólo corre en `v3-desplegar.yml`, a mano) |
| C13 | `respaldo.yml`, `probar-restauracion.yml`, `compactar-historial.yml` | **GitHub** | **No borrar**: `respaldo.yml` sigue siendo el único respaldo del repositorio | El respaldo de D1 ya está (Tarea 1); recién ahí se puede evaluar |
| C14 | `web/data/`: `celular-borradores.json`, `celular-decisiones.json`, `celular-llaves.json`, `contactos-celular.json`, `notas-de-pistas.json`, `pistas.json`, `fotos-manuales.json`, `notas-de-redaccion.json`, `correcciones.json` | **GitHub** | **No borrar sin confirmar que el 3.0 los migró.** `celular-llaves.json` y `contactos-celular.json` van **cifrados** (pueden tener datos sensibles): no abrirlos ni copiarlos sueltos | Yo verifico si `v3/` migró cada uno. Copia primero |
| C15 | `docs/etapa-10-operacion/pruebas-clasificadas.csv`, `pruebas-nucleo.txt`, `docs/redes/previews/utiles-24-10/`, `docs/proyecto/panel-prototipo/`, `docs/proyecto/PANEL-REDISENO.md`, `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md` | **GitHub** | **No borrar**: pueden ser la base de la futura `/admin` y del cronograma de redes | **Sin verificar a fondo**; dejar |

## Lo que NO se borra hasta apagar el sistema viejo (lista B, resumen)

- **Todo lo viejo sigue vivo:** `web/` (sitio de respaldo), `ingesta/`, `redes/`, `reels/`, `infra/`, `pruebas/`, `scripts/` y los 52 workflows del viejo. El 3.0 usa 47 archivos de ahí (`ingesta/`, `redes/`, `reels/`, `web/lib/`), la ruta `/video/` del Worker viejo `radar-balcarce-tareas`, tres JSON de `web/data/` (efemérides y feriados) y `RESPALDO_VIEJO = "si"` para fotos y archivos fijos.
- **La atadura más fácil de olvidar:** apagar `radar-balcarce-tareas` rompe los videos que lee Buffer para TikTok, YouTube y X.
- **Las dos piezas chicas que arrastran todo el motor viejo:** `redes/participa.mjs` e `ingesta/alertas.mjs`. Yo las puedo mudar a `v3/redes/`.
- **Orden de apagado sugerido** (de menos a más riesgo): 1) copiar las fotos y los estáticos y mirar una semana de 404; después `RESPALDO_VIEJO = "no"` en `v3/sitio/wrangler.toml`. 2) Apagar el informe diario por mail viejo y la vigilancia vieja (duplican los avisos del 3.0). 3) Mudar la ruta `/video/` y los 47 archivos; apagar reloj, motor y tareas viejas. 4) **Respaldar D1 y las notas viejas**; recién ahí borrar `web/`, `ingesta/`, `redes/`, `reels/`, `pruebas/` e `infra/`.
- **Documentos para corregir (los hago yo):** `PENDIENTES.md` (25/10, no menciona la 3.0: pasarlo a histórico), `IDEAS.md` (15/10), `docs/3-0/LEEME.md`, `REDES.md` y `UN-DIA-DEL-SITIO.md` (dicen que las redes 3.0 están en ensayo; desde el 3/11 13:33 están en real) y `CLAUDE.md` (12 correcciones anotadas en `LIMPIEZA.md`).

---

# Parte 3. Cómo pedirme cada cosa

| Quiero… | Decime |
|---|---|
| Que lo ejecute Claude | «Hacé la tarea N de la guía» |
| Borrar lo de A2 | «Borrá los workflows de A2» (hago un commit con `git rm`; queda en el historial) |
| Mover a histórico | «Pasá a `docs/historico/` lo de A3.1 y A3.2» |
| Limpiar `.git` | «Corré `git gc --prune=now`» |
| Corregir los documentos | «Corregí `CLAUDE.md` y `PENDIENTES.md` según LIMPIEZA» |
| Mudar los 47 archivos | «Mudá los archivos viejos al 3.0» (trabajo grande: una etapa propia) |

*Regla de oro: lo que tiene claves nunca se pega en un chat. Va a los secretos de GitHub o a Cloudflare, y lo pega una persona.*
