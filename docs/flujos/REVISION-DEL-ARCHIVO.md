# La revisión del archivo entero, por tandas (regla 212)

*Escrito el 17/10/2026, cuando se armó. Empezó sola el **jueves 22/10/2026** a las 0 de Balcarce, estuvo pausada (`REVISION_DEL_ARCHIVO` =
"no") y **volvió a andar el 25/10/2026** (`REVISION_DEL_ARCHIVO` = "si"). Si esto y el código no coinciden, manda el
código (`web/scripts/revisar-archivo.mjs`) y se corrige esto.*

## Qué es y por qué

Hernán, 17/10: *"revisar la totalidad de las notas con algún modelo menor e ir auditando que todas estén bien con sus fotos, título, copete y
nota, así todas las noticias viejas que quedan archivadas cumplen el mismo criterio que las nuevas; organizalo en tandas, no hay apuro"*.

Entre el 18/09 y el 17/10 el criterio cambió muchas veces (210 reglas). Una nota que se publicó el 20/09 se armó con las reglas de ese día:
puede tener una foto que hoy no pasaría, ser la copia de otra, ser "autobombo" de un medio, o decir "este sábado" de un sábado que ya pasó. La
revisión pasa **cada nota con página** (`web/data/archivo.json` y la portada), **de la más vieja a la más nueva**, por el mismo criterio que
hoy tiene una nota nueva. Lo publicado desde el 22/10 ya nace con ese criterio (y lo lee la Auditoría IA de cada hora), así que no entra.

## Qué mira de cada nota

| Parte | Qué | Con qué |
|---|---|---|
| **Sin IA** | El semáforo rojo y lo que no se publica nunca (las listas de sepelios) | `semaforoDelTexto`, `REGLAS_SEMAFORO.nunca` |
| | Lo que "no es nota": el autobombo de un medio de acá, su propia entrevista anunciada, el pronóstico y las farmacias de otro medio, la publicidad de un comercio (regla 199) | `porQueNoEsNota` (`ingesta/no-es-nota.mjs`) |
| | El cuerpo de 70 palabras o más | `tieneCuerpo` (`web/lib/cuerpo.js`) |
| | Los arreglos que no inventan: "este sábado" → "el sábado" en una nota que se lee días después, las muletillas de arranque ("Cabe destacar que…"), un escape sin decodificar, y desde el 17/10 "de el lunes" → "del lunes". Una tilde sola, sólo en "-ción"/"-sión" (la regla de "-ion" convertía "position" en "positión"); las demás tildes las decide la IA de texto | `arreglarEscritura` (`ingesta/verificar.mjs`) |
| | La fecha que el cruce envejeció por error (regla 194): ya la arregla cada vuelta de «Actualizar la web»; acá sólo se cuenta | `fechaEnvejecidaPorError` |
| | La misma noticia publicada dos veces (regla 195): la nota se compara, como si llegara hoy, con lo que ya estaba publicado en las 72 horas anteriores | `compararNotas` (`ingesta/repetidas-publicadas.mjs`) |
| | La foto, con lo que ya dice su ficha (`vision` en `banco-fotos.json`): chicos, marca, gráfica, stock, que no corresponda, de archivo sin mostrar el hecho; la misma foto en otra nota de otro tema (queda en la que la tuvo primero); Wikimedia sin año, de hace años o de otra persona (reglas 203 a 205) | `revisionDeLaFoto` |
| **Con IA (gratis)** | La foto que no tiene ficha (casi todas las de antes del 17/10): la mira un modelo de visión con la misma pregunta que la segunda opinión de la regla 204 | `revisarUnaFoto` (`ingesta/fotos.mjs`): **Groq** primero, Gemini sólo de respaldo |
| | El texto: título que no dice lo que dice la nota, exageraciones, sección equivocada, letras rotas, algo sensible | la Auditoría IA de siempre (`ingesta/auditoria-ia.mjs`): **Groq `gpt-oss-20b`**, Gemini `gemini-flash-lite-latest` sólo de respaldo |

No mira: las notas propias (repasos, clima, dólar, F1, fútbol, efemérides, pistas), lo que publicó o corrigió una persona (salvo el semáforo
rojo, que retira siempre), las ilustraciones con IA (las controla «Ilustrar notas sin foto», regla 206), las fotos que sumó una persona y las
fotos libres de F1 y fútbol.

## Qué hace con lo que encuentra

- **Lo seguro se arregla solo**: la tilde que la acentuación pide (`cambioMecanico`, reglas 98 y 188) y los arreglos que no inventan, como
  pares "antes → después" en `web/data/correcciones-auditoria.json`. Desde el 17/10 la web los aplica también a las notas viejas del archivo
  (`conLoQueCorrigioLaAuditoria` en `generar-datos.mjs`); hasta ese día sólo llegaban a lo de la corrida.
- **Lo que hoy no saldría nunca se retira** (rojo, "nunca", "no es nota", sin cuerpo), con `motivo`, `cuando` y `por: "revisión del archivo"`,
  en la lista `retiradas` de `web/data/revision-archivo.json`. **No vuelve**: `retiradas.json` pierde los lunes lo de más de una semana (y la
  nota podía volver si un feed la traía), pero esta lista no se poda nunca y `generar-datos` la suma a lo retirado a mano en cada vuelta: la
  nota no sale en ninguna lista, no tiene página, su foto se borra, no va al histórico y, si un feed la trae otra vez, la nueva igual a ella
  espera a una persona. Si lo que hoy no saldría ya fue a las redes (su enlace circula) o es una nota propia, no se retira solo: queda para una
  persona. Una tanda retira como mucho 4 (sin contar el rojo): más es señal de un error, y lo que sobra espera a la próxima.
- **La misma noticia dos veces**: la copia se une a la que ya estaba (lista `repetidas`); `generar-datos` las une como las parejas que confirma la
  IA: la copia redirige a la que queda (`fusionadas.json`) y la que queda suma sus fuentes.
- **La foto que no pasa se saca** del banco (`descartada`, como lo que saca una persona: no vuelve en esa nota ni en otra). La nota queda en
  `paraIlustrar` y **«Ilustrar notas sin foto»**, en su modo automático, la toma **después** de las del día, con su mismo cupo (20 por día) y sus
  mismos filtros: las notas del día nunca se quedan sin ilustración por las viejas.
- **Lo dudoso queda para una persona**: un título o una sección que no corresponden, una afirmación sin sostén, algo sensible, o lo que hoy no
  saldría pero circula en redes. El detalle viaja **cifrado** para el celular (el repositorio es público: `sobres`, con la forma de los de la
  Auditoría IA) y se ve en la **pestaña Revisión del panel**, marcado «nota vieja (revisión del archivo)», durante 30 días
  (`diasParaUnaPersona`; los avisos de la Auditoría IA duran 3). El **informe diario por mail** (8:15 y
  21:15) tiene una línea con cuánto va y qué hizo, y los títulos (con enlace) de las últimas que dejó para mirar. Lo grave (`alta`) se avisa
  además por mail en el momento, como la Auditoría IA.

## Las tandas y el cupo

- Una tanda **cada 2 horas, día y noche** (12 por día): el reloj de Cloudflare a los **:12** de las horas UTC impares (22:12, 0:12, 2:12… 20:12
  de Balcarce), lejos de los :00/:30 de «Actualizar la web» (que a los :12 ya terminó) y de los demás minutos ocupados.
- Cada tanda: **6 notas con texto para la IA** (2 pedidos de a 3), **6 fotos sin ficha** para la visión y hasta 40 notas en total (las que no
  gastan IA pasan sin contar). Con los datos del 17/10 son ~1.000 notas con texto y ~790 fotos sin ficha para el 22/10: **unas dos semanas**,
  tres con los reintentos. Termina hacia el 5 al 12 de noviembre.
- Cupo, todo gratis: Groq `gpt-oss-20b` (1.000 pedidos y 200.000 tokens por día; la revisión usa ~24 pedidos y ~60.000 tokens; la Auditoría
  IA, ~13) y la visión de Groq (~72 fotos por día de 1.000). **Gemini casi no se toca**: sólo si Groq no contesta, y como mucho 15 pedidos por
  día (`geminiPorDia`), con `GEMINI_API_KEY_CLASIFICACION`; la redacción (`GEMINI_API_KEY_REDACCION`) y las voces (`GEMINI_API_KEY_REDES`) no
  se usan nunca. Sin cupo, no pasa nada: la nota queda para la tanda siguiente; a los tres intentos se da por revisada sin esa parte (`falla`).
- Los números están en `REVISION` (`web/scripts/revisar-archivo.mjs`); una prueba controla que alcancen para terminar en 10 a 21 días.

## Cómo corre

`.github/workflows/revisar-archivo.yml`, en dos pasos (como «Ilustrar notas sin foto»):

1. **Revisar** (sin candado): `node web/scripts/revisar-archivo.mjs revisar --salida=salida-revision`. Arma la tanda, le pregunta a la IA y deja
   todo en el adjunto `tanda`. No toca el repositorio.
2. **Guardar**, en la fila de «Actualizar la web» (su mismo grupo de concurrency, `actualizar-web`): con `main` recién bajado,
   `node web/scripts/revisar-archivo.mjs aplicar --desde=revision` vuelve a mirar cada cosa con los datos de ahora (una nota que ya no tiene
   página no se toca; si una persona la corrigió mientras tanto, sólo el rojo la retira; una foto se saca sólo si el banco sigue teniendo la
   misma), escribe `web/data/revision-archivo.json`, `banco-fotos.json` y `correcciones-auditoria.json`, commitea sólo esos tres y sube. Si el
   push choca, baja `main` otra vez y repite: nunca pisa lo que subió otro.

Lo que cambió en la web lo aplica la vuelta siguiente de «Actualizar la web» (retira, une, saca la foto, corrige).

**El estado** (`web/data/revision-archivo.json`, lo escribe sólo este workflow; una entrada por renglón): la versión del criterio y desde
cuándo (`version`, `desde`), cuánto va (`contadores`), el uso de IA por día (`uso`), la última tanda, y las listas `retiradas`, `repetidas`,
`paraIlustrar`, `paraUnaPersona` (sólo cuándo y la dirección), `sobres` (cifrado) y `notas` (por nota: versión, cuándo, resultado, foto, texto,
arreglos e intentos).

**Si el criterio cambia** (una regla nueva que tiene que valer también para lo viejo): subir `version` y poner un `desde` nuevo en `REVISION`.
Todo lo publicado antes de ese momento se vuelve a pasar; lo revisado con la versión anterior cuenta como pendiente.

## Lo que hace una persona

- **Desplegar el reloj** después de que esto llegue a `main`: Actions → «Reloj de Cloudflare» (`reloj-cloudflare.yml`) → Run workflow. Sin eso,
  el Worker no despierta la revisión (el cron nuevo `12 1,3,5,…,23 * * *` está en `infra/reloj-cloudflare/wrangler.toml`).
- **Para frenarla**: la variable de GitHub `REVISION_DEL_ARCHIVO` en `no` (Settings → Secrets and variables → Actions → Variables). Vacía o
  sin crear, anda desde el 22/10.
- **Mirar la pestaña Revisión** del panel de vez en cuando: lo que dejó para una persona.
- **Deshacer una retirada**: borrar su renglón de `retiradas` en `web/data/revision-archivo.json` no alcanza para que la página vuelva (la nota
  ya salió de `archivo.json`); hay que pedírselo a Claude, que la recupera del historial de git. Deshacer una unión: borrar su renglón de
  `repetidas` **y** el de `fusionadas.json`.

## Probarlo sin gastar

- `node web/scripts/revisar-archivo.mjs simular` (o `--datos=CARPETA` con una copia de `web/data`, `--json`): qué haría la parte sin IA sobre
  TODAS las notas con página de hoy. No toca nada.
- A mano en GitHub: Actions → «Revisar el archivo» → Run workflow con *simular* marcado: revisa una tanda de verdad (gasta IA) y no guarda.
- Las pruebas: `pruebas/revision-archivo.test.mjs` (sin red, con la IA de mentira y casos reales copiados en
  `pruebas/datos-fijos/revision-archivo-17-10.json`).

## La simulación del 17/10/2026 (sin IA, sobre una copia de `web/data`)

Sobre las 1.206 notas con página (88 propias, 119 de una persona):

| Qué | Cuántas |
|---|---|
| Se retirarían | **3**, las tres por "no es nota": el pronóstico de Gabal («El martes llega con una máxima de 22 grados…»), el autobombo de Radio Líder («…alcanza cifras récord…») y la entrevista anunciada («El abogado de Virginia Aparicio visita una radio local…»). Ninguna por rojo ni por "nunca" |
| Quedarían para una persona (hoy no saldrían, pero fueron a las redes) | 9 (7 sin cuerpo y 2 "no es nota") |
| Se unirían a la que ya estaba (la misma noticia) | **14**: las estafas de McCain, Campo de Pato y el hockey, Montoya y Colapinto, el tractor infraccionado, Edgardo Ríos en la Fiesta del Postre, el Banco Central, las penalizaciones de Colapinto, Caputo en IDEA, la Liga Balcarceña suspendida, el Día del Periodista, la industria del INDEC, el Jardín 905, los peajes de AUBASA y Milei con los fondos |
| Fotos: de 894, sin IA | 4 quedan con su ficha, **1** se saca (Fito Páez, Wikimedia sin año) y **790** van a la visión con IA; 99 no se tocan |
| Arreglos que no inventan | **60 en 49 notas** (casi todos "este sábado" → "el sábado"; "de este lunes" → "del lunes") |
| Notas con texto para la IA | 973 |
