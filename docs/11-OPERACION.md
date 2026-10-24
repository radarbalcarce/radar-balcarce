# 11 · Operación: el manual de uso diario

*Escrito el 28/09/2026 para Hernán y Andrés. **Ojo, 24/10/2026: desde el 23/10 el motor, las tareas y las redes corren en Cloudflare (Workers Builds y un Worker) y no en GitHub Actions**; donde este manual dice "Actions → Actualizar la web → Run workflow" o "Redes", hoy el camino de verdad es el reloj de Cloudflare y el estado del motor (`GET /estado` del Worker del motor, workflows «Estado del motor» y «Estado del reloj»); los workflows de GitHub quedan de vuelta atrás (`docs/TRASPASO.md`). Actualizado el 17/10/2026: el 16/10 se verificó contra el código, los
workflows y el reloj de Cloudflare de ese día; el 17/10 se sumó lo de la subida del sitio, los horarios del reloj y los
workflows que se borraron (reglas 189 a 191) y el retiro del panel de la PC. Es un manual de tareas: cada sección dice qué hacer, paso
a paso, y qué va a pasar después. Por qué funciona así está en los otros
documentos: las redes en [`07-REDES.md`](07-REDES.md), dónde corre cada cosa
en [`08-INFRAESTRUCTURA.md`](08-INFRAESTRUCTURA.md), el panel en `09-PANEL`,
las reglas y las pruebas en `10-REGLAS-Y-PRUEBAS`. Lo que hay que pegar a mano
en los perfiles está en [`PARA-CARGAR-A-MANO.md`](../PARA-CARGAR-A-MANO.md);
lo que falta, en [`PENDIENTES.md`](../PENDIENTES.md).*

## Los enlaces

| Qué | Dónde | Quién entra |
|---|---|---|
| **La web** | https://radarbalcarce.com | Cualquiera |
| Instagram | https://www.instagram.com/radarbalcarce | Cualquiera |
| Facebook | La página "Radar Balcarce" (se busca por el nombre; su ID para la API está en `docs/07-REDES.md`) | Cualquiera |
| **El panel del celular** (el de todos los días) | https://radarbalcarce.com/panel/ (instalado como app desde Chrome) | Quien tenga una llave de GitHub cargada en su celular |
| El modo de prueba del panel del celular | https://radarbalcarce.com/panel/?demo | Cualquiera (notas inventadas, no guarda nada) |
| El código y las corridas | https://github.com/radarbalcarce/radar-balcarce (pestaña **Actions**) | Público desde el 25/09 (sigue público: privado costaría minutos de Actions). Dueña: `radarbalcarce@gmail.com`; colaboradores: `balcardev`, Andrés (`agerace`) y Hernán (`hernanaccomo-pixel`). Hasta el 15/10/2026 fue `balcar-dev/radar-balcarce` |
| Cloudflare (la web, el dominio, las estadísticas) | https://dash.cloudflare.com | `radarbalcarce@gmail.com` |
| El reloj (Worker `radar-balcarce-reloj`) y el vigilante que manda los mails (Worker `radar-balcarce-vigilante`) | https://dash.cloudflare.com → Workers y Pages | `radarbalcarce@gmail.com` |
| Los avisos y los informes diarios | El mail de `radarbalcarce@gmail.com` (remitente `vigilante@radarbalcarce.com`) | Quien tenga acceso a ese mail |
| cron-job.org (el reloj anterior, con sus 3 trabajos pausados) | https://console.cron-job.org/jobs | `radarbalcarce@gmail.com` |
| Google Search Console | https://search.google.com/search-console | `radarbalcarce@gmail.com` |
| Google AI Studio (las claves y el gasto de Gemini) | https://aistudio.google.com | `radarbalcarce@gmail.com` |
| La guía comercial (vista previa) | https://claude.ai/artifact/EPFpaXCo83ryUimSvRnMvU | Privado |

**Las cuentas:** `radarbalcarce@gmail.com` es el medio (Cloudflare, Vercel
apagado, Tailscale, Instagram, Facebook, Meta, Gemini, cron-job.org, Search
Console, y desde el 15/10/2026 también GitHub: es la dueña del repositorio); `balcardev`, Andrés (`agerace`) y Hernán (`hernanaccomo-pixel`) son colaboradores del repositorio con sus propias cuentas de GitHub.

## En una frase

La web, las redes y la vigilancia andan solas con la PC apagada; a una persona
le queda decidir las notas que esperan, corregir o sacar lo que salió mal,
leer los dos informes por mail (8:15 y 21:15) y, cuando algo deja de salir,
revisar en orden el mail de avisos, el reloj de Cloudflare, el motor (Workers Builds) y el
interruptor de las redes (`REDES_ACTIVAS_NUBE` para Cloudflare; `REDES_ACTIVAS` es la de GitHub).

## Antes de empezar: dónde se hace cada cosa

| Dónde | Qué se hace ahí | Se puede desde el celular |
|---|---|---|
| **El panel del celular** (radarbalcarce.com/panel/) | Decidir lo que espera, corregir, cambiar de sección, reescribir con IA, retirar y volver a publicar, mandar una nota a las redes, ver lo que sale hoy en las redes, pistas y notas propias, fotos, contactos, efemérides, revisión y números, actualizar la web | Sí: es para eso. Con la PC apagada |
| **GitHub** (github.com/radarbalcarce/radar-balcarce; se entra con la cuenta de GitHub de cada uno) | Ver si algo falló (pestaña **Actions**), correr un workflow a mano (**Run workflow**), corregir o retirar una nota editando un archivo, cargar un aviso publicitario (`web/data/avisos.json`), prender o apagar las redes (**Settings**) | Sí, desde el navegador |
| **El mail** (`radarbalcarce@gmail.com`) | Leer los informes de las 8:15 y 21:15 y los avisos del vigilante (desde el 15/10 llegan por mail; el WhatsApp quedó de respaldo) | Sí |
| **Cloudflare, Workers** (dash.cloudflare.com, cuenta `radarbalcarce@gmail.com`) | Ver que el reloj `radar-balcarce-reloj` despierte al motor y a las tareas (a GitHub, para lo que no se mudó) (sus ejecuciones: :00 y :30 siempre; :05, :35 y :45 de 7 a 23; :15 a las 8 y 21; :20 cada dos horas; :23 cada tres; :41 de 7 a 23) y que el vigilante `radar-balcarce-vigilante` corra (a los :12 y :42). Los trabajos viejos de cron-job.org están pausados, por si hay que volver | Sí |
| **Claude** (una sesión de Claude Code sobre la carpeta del proyecto) | Cualquier cambio de código, escribir cuerpos, repasos editoriales, mirar la web publicada | Según dónde esté abierta la sesión |
| **Meta, Cloudflare, Google AI Studio, DonWeb** | Cuentas: claves, borrar publicaciones, pagos, dominio | Sí, pero lo hace siempre una persona |

**Tres cuidados que valen para todo lo que sigue:**

1. **Los archivos `.json` son delicados.** Una coma de más o de menos y el
   archivo queda roto. El núcleo legal de las pruebas, que corre en cada vuelta
   de "Actualizar la web", lo detecta en `correcciones.json` y
   `retiradas.json`, avisa por mail y **la web deja de actualizarse** hasta
   arreglarlo (no se publica nada mal, pero se congela). Por eso: copiar una entrada que ya existe y
   cambiarle los valores, y si hay dudas, pedírselo a Claude.
2. **Cada cambio a mano dice por qué, cuándo y quién** (`motivo`, `cuando`,
   `por`). Sin motivo, el código lo ignora; sin los tres, las pruebas fallan.
3. **Nada se ve al instante.** Lo que se cambia en `web/data/` aparece en la
   web en la próxima corrida de "Actualizar la web" (a los :00 o :30) más uno
   o dos minutos de Cloudflare. Para no esperar: Actions → **Actualizar la
   web** → Run workflow.

## La rutina

| Cuándo | Qué | Tiempo |
|---|---|---|
| **Todos los días, a las 8:15 y a las 21:15** | Leer el **informe por mail** (asunto: «Informe de la mañana…» / «Informe de la noche…»). Si abajo de «Lo que requiere tu atención» dice «Nada», no hay nada que hacer. Si no llegó, ver "12 bis" | 2 minutos |
| **Cuando llega un aviso de notas esperando** (por mail; cada 3 horas como mucho) | Decidirlas en el panel del celular, pestaña **Esperan** (ver "0. El panel del celular") | Unos minutos |
| **Cuando llega un aviso de problema** (por mail; WhatsApp sólo si el mail falló) | Seguir lo que dice; si no se entiende, "Si algo dejó de salir" | — |
| **Los lunes** | Mirar que la **Auditoría** haya corrido (Actions → Auditoría). Si un lunes no corre, correrla a mano (Run workflow) | 1 minuto |
| **Cada 90 días** (la primera, hacia el 24/12/2026) | Volver a verificar las medidas de las redes (`FORMATOS.md`). La auditoría avisa | — |
| **Antes del 21/09/2027** | Renovar el dominio en DonWeb (el vigilante avisa 30 días antes); el token de GitHub de cron-job.org sólo importa si se reactivan esos trabajos (ya nadie avisa que vence) | — |

## 0. El panel del celular

Es lo de todos los días. Cómo funciona por dentro: `09-PANEL`. Para entrar hace
falta una **llave de GitHub** que se crea una sola vez: el mismo panel lo
explica paso a paso la primera vez (el detalle, en `09-PANEL`, "La llave de
GitHub"; desde la mudanza del 15/10 la llave tiene que tener acceso a
`radarbalcarce/radar-balcarce`). Se instala desde Chrome: menú ⋮ → **Instalar
app**. **Si se pierde un celular**: en GitHub (la cuenta con la que se creó esa
llave) → Settings → Developer settings → Fine-grained tokens → esa llave →
**Delete**.

**Todo lo que se hace ahí sale en la web en la próxima actualización** (a los
:00 y :30, más unos minutos). Para no esperar: "Más" → **Actualizar la web
ahora** (unos 8 minutos).

La barra de abajo tiene **Hoy, Esperan, Publicadas, Redes y Más**; desde Más se
abren Borradores, Fotos, Contactos, Pistas, Revisión, Fechas y Números
(`09-PANEL`, "Las pestañas").

| Pestaña | Para qué | Lo que conviene saber |
|---|---|---|
| **Hoy** | Arranca acá: el resumen del día con atajos | Lo que espera, los borradores listos, las notas sin foto, las redes y las pistas con novedad |
| **Esperan** | Las notas que el sistema no publica solo (las de las últimas 48 horas) | Cada una dice **por qué espera y qué mirar** y qué contó cada medio (con el enlace a la nota original). La IA no las escribe sola: para publicar una, **"Escribirla con IA"** (tarda un minuto y te muestra el texto para corregir) o "Escribirla a mano". "Descartar" pregunta antes; lo descartado queda al final ("Descartadas") y se puede volver a traer |
| **Sin cuerpo** (va adentro de Esperan) | Notas que **salen solas** pero todavía no tienen cuerpo | La IA las vuelve a intentar sola hasta 3 veces; cada una dice cuántas van. Si una importa y no puede esperar, "Escribir con IA ahora" o "Escribir a mano" |
| **Publicadas** | Lo que está en la web | Muestra las de **las últimas 24 horas** (el número de la pestaña); "Ver también las anteriores" suma el resto de la portada (36 horas) y "Cargar el archivo", las que tienen página. Desde cada nota: Editar, Reescribir con IA, Mandar también a las redes, Retirar de la web |
| **Redes** | Lo que sale hoy en Facebook e Instagram | El cronograma (hora, voz, si salió), red por red, con **Reintentar** si algo falló (sube de nuevo el video, sin gastar voz); **qué noticias cuenta cada repaso** (lo que contaría si saliera ahora: puede cambiar hasta su hora) y la cola de Facebook |
| **Más** | Las siete tarjetas, actualizar la web, y cómo funciona todo | — |

**"Mandar también a las redes"** (en una nota publicada): la pone en la cola de
Facebook, con su foto en Instagram. Sale en la próxima vuelta de las redes que
corresponda (de 8 a 22, con 90 minutos entre posteos, hasta 5 por día), antes
que las que van solas. **Antes pregunta.** Mientras no salga, el mismo botón la
saca de la cola; una vez publicada, sólo se borra a mano en Facebook e
Instagram. Sirve también para Política y Policiales, que solas no van nunca.

**Si retirás una nota por error:** mientras no pasó la próxima actualización,
en la misma nota aparece **Deshacer**. Después, la nota está al final de
**Publicadas → Retiradas** durante **24 horas**: "Volver a publicar" la trae de
nuevo, **con la misma dirección**, en la próxima actualización. Pasadas las 24
horas ya no se ve ni se puede volver a publicar desde el panel. Lo que ya había
salido en Facebook o Instagram no se toca solo, ni al retirar ni al volver.

## 1. Corregir una nota ya publicada

Lo más fácil: panel del celular → **Publicadas** → la nota → **Editar**. Lo que
sigue es cómo hacerlo sin el panel, desde GitHub.

Sirve para cambiar el **título**, la **bajada** (se llama `copete`), la
**sección** o el **cuerpo** de una nota que ya está en la web, sin el panel.
Manda sobre lo que escriba la IA en todas las corridas siguientes y **la dirección de la nota no cambia** (los enlaces que
ya circulan siguen andando).

1. **Encontrar el identificador de la nota.** Es lo que va después del último
   guion en la dirección. En
   `radarbalcarce.com/nota/carlos-bianco-aclara-la-polemica-9f1kip` es `9f1kip`.
2. **Abrir el archivo** `web/data/correcciones.json` en GitHub y tocar el lápiz
   (Edit).
3. **Agregar una entrada** dentro de `"notas"`, con sólo los campos que se
   corrigen, más los tres obligatorios:

   ```json
   "9f1kip": {
     "titulo": "El título corregido",
     "copete": "La bajada corregida, de dos o tres frases.",
     "seccion": "Balcarce",
     "motivo": "el título decía otra cosa que la fuente",
     "cuando": "2026-09-28",
     "por": "Hernán"
   },
   ```

   - La sección tiene que ser una de las once: Balcarce, Política, Policiales,
     Fútbol, Deportes, Automovilismo, Agro, Economía, Cultura y agenda,
     Tecnología, Argentina.
   - Cada entrada va separada de la siguiente por una coma; la última, sin coma.
   - Si la nota ya tiene una entrada, se edita esa (no se agrega otra con el
     mismo identificador).
4. **Guardar** (Commit changes, directo en `main`).
5. Esperar la próxima corrida de "Actualizar la web" o correrla a mano.

**Qué no hace:** no cambia lo que ya salió en Facebook o Instagram (el posteo
queda con el texto viejo; si hace falta, lo edita o lo borra una persona en la
red). Cómo se escribe un buen título o bajada: `CRITERIO-EDITORIAL.md` § 4.
El código: `correccionesAMano` y `conCorreccion` en `web/lib/archivo.js`,
aplicados por `web/scripts/generar-datos.mjs` (ver `06-WEB`).

## 2. Sacar (retirar) una nota de la web

Lo más fácil: panel del celular → **Publicadas** → la nota → **Retirar de la
web** (pide el motivo; desde el panel se puede volver a publicar durante 24
horas). Lo que sigue es cómo hacerlo desde GitHub.

Para una nota que no tendría que haber salido: la saca de la portada, de las
secciones y del archivo, y **la página deja de existir**, aunque la ingesta la
vuelva a traer. También queda en la
papelera del celular (que la guarda 30 días y la muestra 24 horas). Si la nota
ya estaba en el archivo permanente de R2, la retirada también la saca de ahí en
el próximo despliegue.

1. Identificador de la nota (como en 1.1).
2. Editar `web/data/retiradas.json` en GitHub y agregar, dentro de `"notas"`:

   ```json
   "9f1kip": {
     "motivo": "es de otro país y no nombra a ningún argentino",
     "titulo": "El título tal como salió",
     "medio": "El medio de origen",
     "cuando": "2026-09-28",
     "por": "Andrés"
   },
   ```

3. Guardar y esperar (o correr) "Actualizar la web".

**Después, a mano, si hace falta:**

- Si la nota **salió en Facebook o Instagram**, el posteo sigue ahí y su
  enlace ahora lleva a una página que no existe: **borrarlo en la red** (lo
  hace una persona).
- Si entró en un **podcast**, el video ya publicado no cambia; la nota del
  repaso en la web se rearma sola sin ella (y si le quedan menos de dos, se
  retira).
- **Con el panel del celular** se hace lo mismo con "Retirar de la web"
  (`09-PANEL`); `retiradas.json` es el camino sin panel.

## 3. Escribir el cuerpo de una nota que espera

Una nota automática **sin cuerpo de al menos 70 palabras no se publica** (ni en
la web ni en las redes). La IA lo intenta hasta tres veces; si Gemini se quedó
sin cupo o la nota no tenía material, queda esperando. La lista está en
`web/data/esperando-cuerpo.json` (la rehace cada corrida de "Actualizar la
web", sólo con las notas que todavía podrían estar en la portada), y en el
panel del celular se ven en **Esperan** ("Falta el cuerpo").

1. Abrir `web/data/esperando-cuerpo.json`. Cada nota trae su `id`, título,
   bajada, sección, fecha y las **fuentes con sus enlaces**.
2. Leer las fuentes y escribir el cuerpo: dos o tres párrafos, sólo con lo que
   dicen las fuentes, sin inventar nombres ni números, con el criterio de
   `CRITERIO-EDITORIAL.md` § 4 ("El cuerpo") y § 12.
3. Ponerlo en `web/data/correcciones.json` (como en 1), con el campo `cuerpo`
   (los párrafos se separan con `\n\n` dentro del texto) y, si hace falta,
   también `titulo` y `copete`:

   ```json
   "1by9dws": {
     "cuerpo": "Primer párrafo.\n\nSegundo párrafo.",
     "motivo": "cuerpo escrito a mano: Gemini sin cupo",
     "cuando": "2026-09-28",
     "por": "Hernán"
   },
   ```

4. En la próxima corrida la nota sale, y **a esa nota ya no se le pide nada a
   Gemini**.

**Lo más simple es el panel del celular** (Esperan → la nota → "Escribir con
IA ahora" o "Escribir a mano") **o pedírselo a Claude** ("escribí los cuerpos de
las notas que esperan"): el 27/09 escribió así 37, firmados "redacción de
Claude, pedida por Hernán". Lo que publica una persona desde el panel sin cuerpo
se respeta (el panel pide confirmarlo).

## 4. Decidir las notas que esperan a una persona

Las amarillas del semáforo (acusan a alguien, hablan de una muerte, nombran a
un chico) y todo lo de Política y Policiales que vaya a las redes esperan a
una persona. Se deciden en el **panel del celular**, pestaña **Esperan**, con la
PC prendida o apagada (`09-PANEL` y "0. El panel del celular", arriba). El
vigilante avisa por mail cuando hay nuevas, cada 3 horas como mucho, y el
informe de las 8:15 y las 21:15 dice cuántas esperan y por qué. Si nadie las
decide, nada se rompe: sólo esperan.

## 5. Prender o apagar las redes

1. GitHub → el repositorio → **Settings** → **Secrets and variables** →
   **Actions** → pestaña **Variables**.
2. `REDES_ACTIVAS` → editar → **`Si`** para publicar; cualquier otra cosa
   (por ejemplo `No`) para apagar.

Qué pasa:

- **Apagadas:** en la corrida siguiente, Facebook sólo simula (el registro dice
  qué publicaría), no se arma ningún video (no se gasta el cupo de voz), el libro
  no cambia, el vigilante lo dice una vez por día (`redes-apagadas`), los
  informes por mail lo cuentan y la pestaña Redes del panel lo dice arriba.
- **Hoy (16/10) están prendidas:** `REDES_ACTIVAS` dice `Si` desde el 29/09.
- **Al prenderlas:** en la corrida siguiente vuelve todo. Las piezas cuya
  ventana todavía está abierta salen; las que ya se cerraron, no (ver las
  ventanas en `07-REDES`).
- `Si` vale con cualquier mayúscula, con o sin tilde (`si`, `SÍ`, `sí`…):
  Facebook y el reloj de las piezas lo leen con la misma regla desde el 28/09.

## 6. Publicar una pieza a mano

Para una historia fija que no salió (clima, farmacia) o para probar:

1. Actions → **Piezas** → Run workflow.
2. **solo:** el nombre de la pieza. Los nombres: `clima-manana`,
   `clima-noche`, `farmacia`, `utiles`, `noticia1` (podcast de la mañana),
   `noticia2` (tarde), `podcast` (noche), `agenda` (fin de semana), `feriado`,
   las de "Participá" (`participa-noticias`, `participa-evento`,
   `participa-reclamos`, `participa-nota`) y los avisos `aviso-helada`,
   `aviso-granizo`, `aviso-viento` (la lista con su nombre largo:
   `NOMBRES_DE_PIEZAS`, `redes/previa.mjs`). Si queda vacío, la corrida no arma nada y
   termina con "Sin piezas elegidas" (28/09: antes armaba todas las del día y
   gastaba una voz paga por cada una). Para armarlas todas a propósito, dejar
   `solo` vacío y marcar **todas**.
3. **publicar:** tildado para que la suba (sin tildar, sólo la arma y deja el
   video para descargar 7 días).
4. **destino:** `ambas`, `instagram` o `facebook`.

Limitaciones que conviene saber:

- Sólo se arma lo que ese día corresponde: la farmacia necesita el turno de
  hoy, los teléfonos útiles sólo salen su día, un podcast necesita dos notas
  o más, el aviso sólo si hay un aviso grave.
- **Un podcast que ya salió en Instagram no se vuelve a armar**: Piezas no
  sirve para completar el reel de Facebook ni la historia de un podcast que
  faltó. En ese caso: abrir la corrida de **Redes** que lo armó (Actions →
  Redes → la corrida → Artifacts, quedan 3 días), bajar el video y subirlo a
  mano desde la app.
- Con las redes apagadas, Piezas tampoco publica: sólo arma.
- "Redes" y "Piezas" nunca corren a la vez: si una está corriendo, la otra
  espera.

## 7. Mirar la web en la PC

El panel de la PC (puerto 4321) se retiró el 17/10/2026: nunca se usó; queda en el
historial de git. Los datos de la web los arma sólo GitHub Actions.

- **Para ver el sitio en la PC:** `git pull` y después `cd web && npm run build`
  (compila con lo que ya armó la nube).
- `cd web && npm run datos` en la PC no hace nada: sale con un aviso. Sólo con
  `ARMAR_EN_LA_PC=1 npm run datos` hace la corrida entera (con IA y fotos, gasta
  cupo) y deja `web/data/` cambiado: **eso no se sube**.

## 8. Si algo dejó de salir: el orden para mirar

1. **¿Llegó un mail de aviso?** (a `radarbalcarce@gmail.com`; mirar también
   Spam). Dice qué falló. Los mandan los dos vigilantes: el de GitHub
   ("Vigilancia") y el Worker `radar-balcarce-vigilante`, que mira desde afuera
   y avisa aunque GitHub no corra. Si no llegó ni el informe de las 21:15, mirar
   "12 bis".
2. **El reloj de Cloudflare:** ¿despierta a GitHub? (tarea 10).
3. **GitHub → Actions:** ¿hay una corrida en rojo? Abrirla y leer el paso rojo.
   Un aviso amarillo de "Vigilancia" no es una falla: es lo que encontró.
4. **`REDES_ACTIVAS`** dice `Si` (tarea 5). Hoy (16/10) dice `Si`.
5. **¿La PC está prendida?** Sólo importa para las ilustraciones con Gemini web
   de las 10:00 y las 18:00.
6. **Si se publica pero nadie lo ve en Facebook:** Actions → **Ver Facebook**
   (muestra lo que Meta tiene publicado) y mirar la página desde una cuenta que
   no sea administradora.
7. Si nada de eso: la tabla "Qué puede fallar" de `08-INFRAESTRUCTURA.md` y de
   `07-REDES.md`.

## 9. La web no se actualiza

Se nota porque la portada no cambia o llega el aviso "La web no se actualiza
hace N horas".

1. Actions → **Actualizar la web**: ¿la última corrida cuándo fue?
   - **No hay corridas recientes** → el reloj de Cloudflare (tarea 10). Mientras tanto,
     Run workflow a mano.
   - **Está en rojo** → abrirla. Si el paso rojo es **"Núcleo legal de las
     pruebas"** (también llega un mail «Falló el núcleo legal…»), una prueba
     falló: la causa más común es un `.json` editado a mano con un error (ver
     "Antes de empezar"). Si es "Buscar noticias y armar los datos",
     "Compilar el sitio", "Volver a compilar con lo que entró" o
     "Revisar que el SEO siga en pie", es código: pedírselo a Claude. Si es
     "Guardar si cambió algo" con "después de tres intentos", suele arreglarse
     solo en la corrida siguiente. Si es **"Subir a Cloudflare Pages"** (desde el
     17/10 la subida es parte de esta misma corrida), los datos se guardaron pero
     Cloudflare no aceptó el sitio: suele ser el token de Cloudflare (lo arregla una
     persona); la vuelta siguiente lo vuelve a intentar. Si el que falla es
     "Archivar las notas por salir (R2)", la web se sube igual: es el archivo
     permanente, y llega un mail.
   - **Está en verde** y dice "Sin novedades" → no había nada nuevo: está bien.
2. Para volver a subir la web sin esperar la vuelta siguiente: Actions → **Cloudflare
   Pages** → Run workflow (desde el 17/10 sólo corre a mano: compila lo que está en
   `main` y lo sube).
3. Si "Actualizar la web" está en verde y la web sigue vieja: mirar Cloudflare
   (dash.cloudflare.com → Pages) y probar recargar sin caché.

## 10. El reloj dejó de despertar

Desde el 15/10/2026 despierta a GitHub el **reloj de Cloudflare** (el Worker
`radar-balcarce-reloj`, `infra/reloj-cloudflare/`). Desde el 17/10 (regla 190): a los
:00 y :30, la web, siempre; la vigilancia, cada 3 horas (0, 3… 21) y otra vez a las 9:30,
21:30 y 0:30; a los :05, :35 y :45, el reloj de Redes, de 7 a 23; a los :41 de 7 a 23, la
auditoría IA; a los :23 cada 3 horas, las pistas; a las 8:15 y 21:15 y otra vez a las 8:30
y 21:30, el informe diario; y a los :20 cada dos horas de 7:20 a 23:20, las ilustraciones
automáticas. Se nota con avisos "No hay corridas nuevas de «Actualizar la web»: el reloj de
Cloudflare pudo haber fallado…", "El reloj de Redes no corre" o "La «Auditoría IA» no corre
hace horas", porque no llega el informe por mail a horario, o porque la web no se actualiza
(ya no hay respaldo de GitHub: avisa por mail el vigilante de Cloudflare).

**Después de cambiar el reloj** (`infra/reloj-cloudflare/`), hay que subirlo a mano:
Actions → **Reloj de Cloudflare** → Run workflow. Si no se sube, sigue el horario viejo.

1. Entrar a https://dash.cloudflare.com con `radarbalcarce@gmail.com` →
   Workers y Pages → `radar-balcarce-reloj` y mirar las ejecuciones: si salen
   fallidas, el mensaje dice qué archivo no aceptó GitHub y con qué código.
2. Un 401 o 403 quiere decir que el **token de GitHub** del reloj
   (`RELOJ_GITHUB_TOKEN`, creado sin vencimiento) se borró o está mal: una persona crea otro (de grano
   fino, sólo este repositorio, Actions de lectura y escritura), lo pega en
   GitHub → Settings → Secrets and variables → Actions y corre Actions →
   **Reloj de Cloudflare** → Run workflow, que lo vuelve a cargar en el Worker.
3. Si no se arregla rápido, **de urgencia**: reactivar los tres trabajos de
   https://console.cron-job.org/jobs (están pausados, no borrados). Ojo: tienen
   la dirección y el token del repositorio viejo (`balcar-dev`); hay que
   ponerles `radarbalcarce/radar-balcarce` y un token nuevo. Y volver a pausarlos
   cuando el reloj de Cloudflare ande de nuevo.
4. En media hora tiene que aparecer una corrida nueva en Actions.

## 11. Gemini se quedó sin cupo

**Cómo se nota:** el aviso "Sólo N de M notas… tienen cuerpo"
(`pocos-cuerpos`), muchas notas con "Falta el cuerpo" en Esperan, el informe
diario (sección de la IA), o en el registro de "Actualizar la web" la línea
"tope del día" o "claves de Gemini usadas: N con la de redacción, M con la de
redes, K con la de clasificación (respaldo)".

**Qué pasa solo:** (desde el 29/09 las cuatro claves de IA son gratis; el
detalle, en `08-INFRAESTRUCTURA`, "Las claves de IA")

- La redacción usa la clave de redacción (tope propio de 450 notas por día). Si
  dice "sin cupo" (429), prueba con la de redes y, si el servicio sigue
  fallando, con la de clasificación. Lo que no se pudo escribir queda esperando
  cuerpo y se reintenta en las corridas siguientes (hasta tres intentos por
  nota). El cupo se renueva al día siguiente.
- La lectura con IA, si Gemini falla, prueba con Groq.
- Las voces: **10 audios por día**. Si Gemini no contesta o se acabó el cupo,
  la pieza no sale (nunca con otra voz) y vuelve al día siguiente.

**Qué hacer:**

1. Nada urgente: no se publica nada mal, sólo sale menos.
2. Si hay notas importantes esperando: escribir sus cuerpos desde el panel del
   celular, a mano o con Claude (tarea 3).
3. Para saber si una clave anda: el vigilante avisa por mail (`clave-<NOMBRE>`)
   si una clave deja de andar, el registro de "Actualizar la web" dice cuántos
   pedidos fueron a cada una y Actions → **Probar las claves de Gemini** las
   prueba (gasta un audio del cupo de voz).
4. **No subir los topes ni cambiar de clave sin hablarlo entre los dos.**

## 12. Los avisos no llegan (mail y WhatsApp)

Desde el 15/10/2026 (regla 173) todos los avisos salen **primero por mail** a
`radarbalcarce@gmail.com`, a través del Worker `radar-balcarce-vigilante`; el
WhatsApp (CallMeBot, sin cupo desde cerca del 1/10) sólo se prueba si el mail
no salió.

**Si no llegan los mails:**

1. Mirar Spam.
2. Actions → **Probar el aviso por mail** → Run workflow. Manda un mail de
   prueba y dice si salió.
3. Si falla, casi siempre es `VIGILANTE_TOKEN` (tiene que ser el mismo en GitHub
   y en el Worker: volver a correr Actions → **Vigilante de Cloudflare**, que lo
   carga) o el Worker vigilante (Cloudflare → Workers →
   `radar-balcarce-vigilante`; su página `/estado` muestra la última revisión).

**Si hace falta el WhatsApp de respaldo:**

1. Actions → **Probar el aviso por mail** → Run workflow: si el mail no sale, prueba el
   WhatsApp y muestra lo que contestó CallMeBot (el workflow "Prueba de WhatsApp" se
   borró el 17/10: CallMeBot está sin cupo desde el 1/10).
2. Si dice "APIKey is invalid": la clave de CallMeBot está mal copiada en
   `WHATSAPP_APIKEY`. Si el teléfono tiene pocos dígitos: `WHATSAPP_TELEFONO`
   va completo, con 549 adelante, sin + ni espacios. Los corrige una persona en
   GitHub Secrets.
3. Si las pruebas andan y los avisos no llegan: mirar que "Vigilancia" esté
   corriendo (Actions) y que el reloj de Cloudflare la esté despertando. El
   registro de cada corrida de Vigilancia dice qué encontró y por dónde mandó
   el aviso.

## 12 bis. Los informes por mail (8:15 y 21:15)

Desde el 15/10/2026 (regla 176) llegan **dos mails por día** a `radarbalcarce@gmail.com`, del «Vigilante de Radar Balcarce»:

- **Informe de la mañana (8:15):** cómo cerró ayer (notas, visitas, redes) y lo que quedó esperando.
- **Informe de la noche (21:15):** cómo viene hoy, hasta ese momento.

El asunto trae el día, cuántas notas y cuántas visitas, y si hay algo para mirar («todo en orden», «2 cosas para mirar», «1 problema para atender»). Adentro, **arriba de todo** está «Lo que requiere tu atención» (🔴 urgente, 🟡 para mirar, ℹ️ para saber) y después: qué se publicó (con las tres notas principales), qué espera a una persona y por qué, lo que salió en redes (con enlaces) y lo que falló, las visitas y de dónde llegaron, y la salud del sistema (web, fuentes caídas, vencimientos, tope de notas, IA y su costo, cupo de voz).

- **Dice cuando no sabe.** Si Cloudflare no dio una lectura confiable de las visitas, el informe escribe «sin lectura confiable» (no «0 visitas»); un día que no terminó dice «hasta las 21:00».
- **Probarlo sin mandarlo:** `node redes/informe-diario.mjs --momento=noche` en la PC (o Actions → **Informe diario** → Run workflow con «enviar» apagado: se ve en el registro). `--html=informe.html` guarda la versión con formato para abrirla en el navegador; `--sin-red` no consulta GitHub.
- **Mandarlo a mano:** Actions → **Informe diario** → Run workflow → elegir «manana» o «noche» (con «enviar» prendido). Si ya salió ese mismo informe hace menos de 6 horas, el Worker no lo repite.
- **Si no llegó:** (1) mirar Spam; (2) Actions → Informe diario: ¿corrió? El reloj lo pide a las 8:15 / 21:15 y, desde el 16/10, otra vez a las 8:30 / 21:30 (el disparo de los :15 falló el 15 a la noche y el 16 a la mañana); si llegan los dos, sale un solo mail. Si no corrió, mirar el Worker `radar-balcarce-reloj` (¿se subió con el horario nuevo? correr «Reloj de Cloudflare»); el `schedule` de respaldo de GitHub lo manda a las 8:45 / 21:45 (puede atrasarse); (3) si corrió y quedó en rojo, el registro dice por qué (casi siempre `VIGILANTE_TOKEN`); (4) a las 22 el Worker del vigilante manda un resumen que dice «el informe completo de la noche no llegó».
- **Si se cambia el Worker vigilante o el reloj:** volver a correr «Vigilante de Cloudflare» o «Reloj de Cloudflare» (los dos ya se corrieron con lo de hoy: el reloj, por última vez, el 16/10 a las 15:45 de Balcarce).

## 13. Cargar un aviso publicitario

Son tres espacios en la web: después de la nota de apertura (`apertura`), al
lado del clima y la farmacia (`clima`) y abajo de todo (`pie`). Reglas y
precios: `PUBLICIDAD.md`.

Desde el 17/10/2026 (se retiró el panel de la PC) se editan a mano en
`web/data/avisos.json`, en GitHub o con Claude:

1. Abrir `web/data/avisos.json` en GitHub y tocar el lápiz (Edit).
2. En el espacio que corresponde (`apertura`, `clima` o `pie`), cambiar `null`
   por `{"nombre": "…", "texto": "…", "logo": "…"}` (el logo, si hay), con el
   mismo cuidado de los `.json`.
3. Guardar (Commit changes, directo en `main`) diciendo en el mensaje del commit
   **quién lo cargó y cuándo** (por ejemplo, "Aviso de la Panadería X en el pie,
   cargado por Hernán el 20/10"). Aparece en la web con la próxima "Actualizar
   la web".
4. Para sacarlo: volver a poner `null` en ese espacio (también con quién y
   cuándo en el commit).

## 14. Cómo pedirle algo a Claude

Claude trabaja sobre la carpeta del proyecto y lee solo `CLAUDE.md` al
empezar: sabe las reglas, las cuentas y dónde está cada cosa.

**Cómo pedir:**

- **Con el ejemplo concreto:** el enlace de la nota, la captura, el texto del
  WhatsApp. "La nota de la peregrinación dice Fútbol y es de Balcarce" se
  arregla en minutos; "las secciones andan mal" no.
- **Varias cosas, numeradas**, para que no se pierda ninguna.
- **Decir si es una regla o un caso:** "esta nota está mal" (se corrige o se
  retira) no es lo mismo que "esto no tiene que salir nunca más" (se cambia el
  criterio o el código, con una prueba).
- **Pedir que lo mire publicado:** "revisalo en la web cuando esté". Después
  de un cambio, Claude tiene que correr "Actualizar la web", esperar el
  despliegue y mirar radarbalcarce.com antes de decir que está listo.

**Lo que Claude hace:** cambia código y documentos; corre `npm test` antes de
commitear; commitea sólo los archivos que tocó (`git commit -- archivos`: los
workflows commitean `web/data/` cada media hora, y así no se mezclan); corre
workflows a mano; escribe cuerpos, correcciones y retiradas (firmados en `por`)
y carga los avisos publicitarios (tarea 13). Un cambio de
criterio editorial lo hace en `CRITERIO-EDITORIAL.md` (y sus números en
`ingesta/criterio.mjs`); **la lista roja del semáforo no la toca sin
preguntar**.

**Lo que Claude no hace:** ver, pegar ni pedir claves o tokens (si hace falta
uno, dice cuál y dónde va, y lo pega una persona); entrar a las cuentas;
borrar publicaciones; aceptar términos; pagar.

## 15. Lo que sólo puede hacer una persona

| Qué | Dónde | Cuándo |
|---|---|---|
| Cargar o cambiar una clave o un token (`META_TOKEN`, las de Gemini, `GROQ_API_KEY`, `TAVILY_API_KEY`, Cloudflare, `VIGILANTE_TOKEN`, `RELOJ_GITHUB_TOKEN`, WhatsApp) | GitHub → Settings → Secrets and variables → Actions; en la PC, el `.env` | Cuando se crea, vence o se filtra |
| Regenerar `META_TOKEN` con los permisos de estadísticas (`read_insights`, `instagram_manage_insights`, además de todos los de ahora) | Meta Business → usuario del sistema `publicador-radar` | Hecho (1/10/2026) |
| Cambiar el token de GitHub del reloj (`RELOJ_GITHUB_TOKEN`, creado sin vencimiento) si se borra o se filtra, y volver a cargarlo con «Reloj de Cloudflare» (el de cron-job.org, pausado, vence el 21/09/2027) | GitHub y Cloudflare | Si deja de andar |
| Darle al token de Cloudflare el permiso «Zone → Workers Routes: Edit» (lo necesita el archivo permanente para poner su ruta) | Cloudflare → API Tokens | Cuando se decida activar el archivo permanente |
| Renovar el dominio | DonWeb | Antes del 21/09/2027 |
| Borrar o editar un posteo, una historia o un reel (un duplicado, una nota retirada) | Las apps de Facebook e Instagram | Cuando haga falta |
| Subir a mano un video que faltó (desde el artefacto de una corrida) | Las apps | Cuando haga falta |
| Foto de perfil, portada, biografías, categorías | Las apps, con los textos de `PARA-CARGAR-A-MANO.md` | Una vez |
| Comprobar con una cuenta que no sea administradora que el público ve los posteos y los reels | Facebook | Pendiente |
| Poner un límite de gasto en Google si algún día se vuelve a usar una clave paga de Gemini (hoy las tres son gratis, desde el 29/09) | Google AI Studio → Gasto | Sólo si se pasa a una clave paga |
| Pagar el plan Workers Paid de Cloudflare (US$ 5 por mes) | Cloudflare → Billing | Todos los meses (ya contratado) |
| Borrar el proyecto de Vercel y limpiar el DNS que quedó | Vercel y Cloudflare | Pendiente |
| Activar o reactivar CallMeBot (si cambia el número del teléfono) | WhatsApp | Cuando haga falta (hoy es sólo el respaldo del mail) |
| Decidir las notas amarillas | El panel del celular | Todos los días |
| Aceptar términos, pagar, crear cuentas | Cada servicio | — |

La lista completa y al día de lo pendiente: `PENDIENTES.md`.

## Qué archivo hace qué (los que se tocan a mano)

| Archivo | Qué es | Quién lo escribe | Quién lo lee | ¿Se edita a mano? |
|---|---|---|---|---|
| `web/data/correcciones.json` | Títulos, bajadas, secciones y cuerpos corregidos | Una persona o Claude | `generar-datos.mjs` (`correccionesAMano`) | **Sí** (tareas 1 y 3) |
| `web/data/retiradas.json` | Notas sacadas de la web | Una persona o Claude | `generar-datos.mjs` (`idsRetiradosAMano`) | **Sí** (tarea 2) |
| `web/data/esperando-cuerpo.json` | Las notas automáticas que no salen por falta de cuerpo | "Actualizar la web" | Personas y Claude | No: se lee |
| `web/data/avisos.json` | Los tres avisos | Una persona o Claude | La web | **Sí**, con quién y cuándo en el commit (tarea 13) |
| `web/data/celular-decisiones.json` | Lo que decide el panel del celular | El panel del celular | "Actualizar la web" | **No**: se decide desde el celular |
| `web/data/redes.json` | El libro de las redes | "Redes" y "Piezas" | Casi todo | **No** (si se borra una entrada, puede repetirse una publicación) |
| `web/data/portada.json`, `archivo.json` y el resto de `web/data/` | Lo que arma "Actualizar la web" | Los workflows | La web, las redes, el vigilante | **No** |
| `.env` (sólo en la PC) | Claves para trabajar en la PC | Una persona | `reels/claves.mjs` | Sólo una persona |

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Corregir una nota | `web/data/correcciones.json` (tarea 1) |
| Sacar una nota | `web/data/retiradas.json` (tarea 2) o el panel |
| Que una nota que espera salga | Cuerpo en `correcciones.json` (tarea 3) |
| Decidir una amarilla | El panel del celular → Esperan |
| Prender o apagar las redes | Variable `REDES_ACTIVAS` (tarea 5) |
| Publicar una pieza ya | Actions → Piezas (tarea 6) |
| Reintentar una pieza que falló al subir | Panel del celular → Redes → **Reintentar** (o Actions → Reintentar pieza) |
| Forzar una actualización de la web | Actions → Actualizar la web → Run workflow (o "Actualizar la web ahora" en el panel) |
| Volver a subir la web sin rearmar los datos | Actions → Cloudflare Pages → Run workflow (sólo a mano desde el 17/10: la subida de cada media hora la hace "Actualizar la web") |
| Comprobar el acceso a Meta | Actions → Redes → Run workflow → `verificar` |
| Mandar o probar el informe diario | Actions → Informe diario → Run workflow (`manana` o `noche`; con «enviar» apagado, sólo se ve en el registro) |
| Probar que los avisos por mail llegan | Actions → Probar el aviso por mail |
| Correr todas las pruebas | Actions → Pruebas → Run workflow (en la PC, `npm test`; el núcleo legal solo, `npm run test:nucleo`) |
| Ver el viejo resumen de las 21 del vigilante | Actions → Vigilancia → Run workflow → `probar-resumen` (lo manda por mail, no guarda nada; el de todos los días lo reemplazó el informe de las 21:15) |
| Ver el cierre del día contra Meta sin mandar nada | Actions → Vigilancia → `probar-cierre` |
| Auditar lo publicado en redes | Un día: Actions → Vigilancia → `probar-cierre`; la semana: la "Auditoría" de los lunes (o a mano). "Auditar redes" se borró el 17/10 |
| Ver las estadísticas ahora | Panel del celular → pestaña **Números** (las mide la vigilancia) |
| Cargar un aviso | `web/data/avisos.json`, a mano (tarea 13) |
| Cambiar una regla, un número o el diseño | Pedírselo a Claude (tarea 14); la tabla completa, en `CLAUDE.md` |

## Qué puede fallar al operar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| Un `.json` quedó mal escrito | "Actualizar la web" en rojo en "Núcleo legal de las pruebas" y un mail «Falló el núcleo legal…»; a los 100 minutos, "La web no se actualiza" | Abrir la corrida, ver qué prueba falló, arreglar el archivo (o pedírselo a Claude) |
| Una corrección sin `motivo` | No pasa nada: el código la ignora (y la prueba falla) | Agregar el motivo |
| Se corrigió una nota que ya estaba en Facebook | La red sigue mostrando lo viejo | Editar o borrar el posteo a mano |
| Se retiró una nota que estaba en Facebook | El enlace del posteo da "no encontrada" | Borrar el posteo a mano |
| Se corrió Piezas con `solo` vacío | La corrida termina en rojo con "Sin piezas elegidas" y no arma nada (no gasta) | Escribir el nombre, o marcar `todas` si de verdad se quieren todas |
| Una corrección o retirada sin `cuando` o sin `por` | El código sólo exige `motivo`, pero el núcleo legal de las pruebas pide los tres: "Actualizar la web" falla, llega un mail y la web se congela | Completar los tres campos |
| Se corrió `npm run datos` en la PC con `ARMAR_EN_LA_PC=1` | `web/data/` queda cambiado en la PC | No subirlo: `git checkout -- web/data/` (tarea 7) |

## Lo que sigue abierto

En `PENDIENTES.md`: los horarios de las redes se cambian en el código
(`HISTORIAS_FIJAS`, `redes/horarios.mjs`) y, si hiciera falta volver a cron-job.org, ver que sus tres trabajos pausados
tengan la dirección nueva. La Auditoría de los lunes ya corre sola (28/09, 5/10
—falló—, 12/10).

## Si se acaban los tokens de Claude: seguir con DeepSeek

Abrir Claude Code con **`scriptsclaude-con-openrouter.cmd`** (doble clic en una terminal o desde la carpeta del proyecto). Usa DeepSeek V4 Pro por OpenRouter con la clave `OPENROUTER_API_KEY` que ya está en la PC (no se guarda en ningún archivo). Dentro de Claude Code, `/status` tiene que mostrar la dirección de OpenRouter; si antes se entró con la cuenta de Anthropic, hacer `/logout` y volver a abrirlo con ese archivo. Cuesta unos US$ 0,21 por millón de tokens de entrada y 0,42 de salida: con US$ 10 alcanza para mucho trabajo. **En paralelo con Claude:** (1) abrir una segunda terminal con ese mismo archivo, en otra carpeta de trabajo (`git worktree add ..b-deepseek`), mientras esta ventana sigue con Claude; (2) desde Claude Code se le puede pedir una segunda opinión o una tarea chica con `node scripts/deepseek.mjs "pregunta"` (o `--flash`, `--archivo ruta`); (3) o lanzarle una tarea completa sin abrirlo: `claude -p "tarea"` con las variables del archivo `.cmd`. El Claude Code de la terminal es el oficial de Anthropic (`npm install -g @anthropic-ai/claude-code`, instalado el 17/10/2026). DeepSeek no es Claude: puede equivocarse más en cambios grandes, así que conviene pedirle tareas chicas y correr `npm test` antes de subir. Para el robot (las IA de las notas), OpenRouter ya es el último respaldo cuando está cargada la clave en GitHub (regla 240).
