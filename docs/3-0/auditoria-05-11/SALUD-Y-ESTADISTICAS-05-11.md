# Radar 3.0: chequeo de salud y de estadísticas (jueves 5/11/2026, 20:25 en Balcarce)

*Para Hernán y Andrés. Hecho sólo mirando: pedidos públicos al sitio, `/salud` de los Workers que lo contestan sin clave, el registro de GitHub Actions y el código. No se desplegó, no se corrió ningún workflow, no se escribió en producción. Lo que no se pudo ver está marcado «NO VERIFICADO» en cada área y juntado al final.*

## Resumen (12 líneas)

1. **El sitio anda bien:** portada, las 14 secciones, 10 notas al azar, clima, farmacias, dólar, buscar, rss, mapas, robots, llms y `og-default.png` dan 200; 90 fotos `/foto/` dan 200; cero enlaces rotos en la muestra. **Verde.**
2. **El motor anda:** vuelta cada 15 minutos (la última, 23:15 UTC = 20:15), 0 borradores trabados, gasto de IA del mes **US$ 0,26** de un freno de US$ 7. **Verde.**
3. **Cuidado con el ritmo de notas:** hoy van **38** (ayer 50); el sistema viejo hacía ~170. Está dentro del diseño (5 medios y tope de 40 de afuera), pero es **una caída del 75 %** que conviene que ustedes vean y aprueben. **Amarillo.**
4. **8 fuentes de Infobae y la UNLaM dan 403 desde el 3/11** (45 vueltas seguidas) y 3 de Perfil fallan; el vigilante recién avisa a los 3 días, así que no avisó. Cuesta cobertura y "cuántos medios lo cuentan". **Amarillo.**
5. **Threads anda a medias:** 3 posteos salieron bien hoy y 4 notas fallaron con «el recurso no existe». No es el ID de usuario: falla el paso de **publicar** porque no espera a que Threads termine de armar el posteo. Arreglo chico, de código. **Amarillo.**
6. **Bluesky y X andan** (8 posteos cada una hoy, sin errores). Facebook/Instagram/TikTok/YouTube: el registro no dice red por red; la última publicación en Meta fue bien. **Verde con reservas.**
7. **Estadísticas: el sistema viejo dejó de guardar visitas y datos de redes el 3/11** y la 3.0 **no tiene todavía un módulo que mida visitas ni alcance**. Para comparar el domingo 8/11 con la línea de base **hay que sacar los números a mano** (Cloudflare, Google Analytics, Meta, Buffer). **Rojo para la comparación del domingo.**
8. **Google Analytics, AdSense y el contador de Cloudflare están bien puestos** (cada uno aparece una sola vez, con el formato correcto; Analytics sólo mide a quien acepta cookies).
9. **El workflow «Pruebas» está en rojo desde el 3/11** (52 fallas, 17 cancelaciones): son 4 pruebas del **sistema viejo** que ya no representan nada de la 3.0. Las **681 pruebas de la 3.0 pasan** (las corrí en la PC). Arreglo mínimo más abajo. **Amarillo (ruido, no riesgo).**
10. **El respaldo diario de la base nunca corrió todavía** (workflow nuevo de hoy, sin ninguna ejecución, ni siquiera a mano). Si falla, nadie se entera hasta que haga falta. **Amarillo.**
11. **El vigilante no mira el sitio ni las redes** (`sitio: false`) y tampoco al sistema viejo, que sigue corriendo cada media hora.
12. **Para dar la 3.0 por cerrada faltan 14 cosas** (lista final al fondo); lo urgente: Threads, respaldo probado, qué medir el domingo y la cobertura de Infobae.

## Semáforo por área

| Área | Color | En una frase |
|---|---|---|
| 1. Sitio | Verde | Todo responde, rápido y sin rotos; ritmo de notas bajo (amarillo aparte) |
| 1b. Frescura / cantidad de notas | Amarillo | 38 hoy, última a las 20:00; ~75 % menos que el sistema viejo |
| 2. Motor de notas | Verde | 15 min exactos, IA casi gratis; amarillo en fuentes con 403 |
| 3. Redes | Amarillo | Bluesky y X bien; Threads intermitente; Meta/Buffer sin detalle por red |
| 4. Estadísticas y analíticas | Rojo | Las etiquetas están bien; falta quien guarde y reporte los números |
| 5. Workflows de GitHub | Amarillo | «Pruebas» en rojo por pruebas viejas; lo demás verde |
| 6. Qué falta de la 3.0 | Amarillo | 14 pendientes, 4 que dependen de Hernán |

---

## 1. El sitio

**Verifiqué (curl, 5/11 entre 20:15 y 20:25):**

| Qué | Resultado |
|---|---|
| Portada `/` | 200, 0,65 s (cacheada 5 min en Cloudflare), 21 notas con foto |
| 14 secciones `/seccion/...` | Todas 200, 0,5 a 1,1 s, 10 notas cada una |
| `/clima`, `/farmacias`, `/dolar`, `/buscar`, `/buscar?q=balcarce`, `/hoy`, `/agenda`, `/tablas`, `/util`, `/quienes-somos`, `/como-trabajamos`, `/contacto`, `/politica-de-privacidad` | Todas 200 |
| `/rss.xml` y `/feed.xml` | 200, 30 notas, la más nueva 20:00 de hoy |
| `/sitemap.xml` | 200: índice con páginas, news y mapas de 2026-09, 10 y 11 (520 notas en noviembre, 2.276 en octubre) |
| `/sitemap-news.xml`, `/sitemap-paginas.xml` | 200 |
| `/robots.txt`, `/llms.txt`, `/ads.txt`, `/og-default.png` | 200 (la imagen ya está desplegada: 34 KB) |
| 10 notas al azar (7 de noviembre, 3 de octubre) | 200; una sola etiqueta canónica, dos bloques de datos estructurados, un solo `h1`, foto, Analytics una vez, AdSense una vez |
| Enlaces internos de la portada y de dos secciones (65 distintos) | 64 dan 200; `/publicidad` da 301 (redirige, es lo esperado) |
| 90 imágenes `/foto/…` de portada y secciones | **90 de 90 en 200** con tipo imagen; cacheo de un año |
| Cabeceras | `Strict-Transport-Security` (6 meses), `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, y una `Content-Security-Policy-Report-Only` (sólo mide, no bloquea). `http://` pasa a `https://` con 301. |
| Tiempos | Páginas cacheadas: 0,12 a 0,5 s. Una nota que no estaba en caché tarda 1,2 a 1,8 s la primera vez y 0,15 s después. |

**Cosas menores que vi:**

- `/farmacia` (singular) da 404; la dirección real es `/farmacias`. Si alguien la escribe o la comparte mal, cae en el 404. Una redirección de una línea lo resuelve. Lo mismo `/rss` (la buena es `/rss.xml`) y `/media-kit` (404; no sé si debería existir: la dirección del media kit **no la encontré**).
- 2 de las 21 fotos de la portada todavía vienen de afuera (Blogger y Agrofy); es la nota nueva que «Fotos propias» aún no copió (corre cada hora). Se arregla solo; si no pasa en una hora, mirar.
- `llms.txt` dice «lo sensible lo revisa una persona antes de salir». Hoy lo sensible se frena o se aprueba por Telegram, así que es cierto, pero conviene que la frase siga a la regla real.
- Dos pares de notas distintas usan la misma foto (Fito Páez y Luján Amadeo; Senado y La Libertad Avanza). Por los temas parece foto de contexto legítima (anfiteatro, Congreso); **no lo confirmé mirando las imágenes**.

**Frescura y cantidad (comparada con la línea de base, `docs/3-0/ESTADISTICAS-LINEA-DE-BASE-2026-11-03.md`):**

| Día | Notas con fecha de publicación ese día (mapa del mes, en UTC) |
|---|---|
| jue 29/10 | 159 |
| vie 30/10 | 145 |
| sáb 31/10 | 86 |
| dom 1/11 | 110 |
| lun 2/11 | 161 |
| mar 3/11 | 161 (mezcla de migradas y las primeras de la 3.0; **no es comparable**) |
| mié 4/11 | **50** |
| **jue 5/11 (hasta las 20:15)** | **38** (7 de Balcarce, 4 de Argentina, 3 Deportes, 3 Agro…) |

El sistema viejo publicaba ~170 por día (línea de base, sección 2). Es **menos a propósito** (tope de 40 de afuera por día, 5 medios para lo nacional y 3 para las áreas chicas, `NUCLEO_TOPE_NACIONAL`), pero 38 y 50 quedan lejos de lo que el sitio daba. La última nota salió a las 20:00. Hubo tramos largos sin notas nuevas (cerca de 3 horas, entre las 4 y las 7 de la mañana de Balcarce). **No pude confirmar** cuántas de las de hoy son Policiales ni si todas las secciones tienen una nota de hoy (el RSS sólo muestra las últimas 30 y no apareció Policiales).

*Cómo contar mejor:* el mapa del mes usa la fecha de última modificación, que normalmente es la de publicación, pero no es un contador oficial. El número oficial es el del resumen de las 20:00 del vigilante (llega por Telegram; yo no lo pude leer).

## 2. Motor de notas

**Verifiqué:**

- `radar-nucleo.radarbalcarce.workers.dev/salud` (público, sin clave): última vuelta **23:15:11 UTC**; hoy **1.546 artículos leídos, 884 historias, 0 borradores, 0 notas frenadas**; publicando = sí.
- Vuelta cada 15 minutos: confirmado por las horas de publicación (`:00`, `:15`) y por el chequeo del vigilante (23:00 UTC, última vuelta 22:45, todo en orden).
- IA hoy: redacción 76 pedidos (2 por nota, coincide con ~38 notas), «duda» 304, fotos 70, clima 2. **Mes: 1.602 pedidos, 2,0 millones de tokens de entrada, gasto estimado US$ 0,26; freno US$ 7**, tope diario 500 pedidos. Muy por debajo de todos los topes. (`v3/nucleo/REGLAS.md` y `v3/vigilancia/REGLAS.md` todavía dicen US$ 15 de freno; el valor real es 7: hay que corregir esos textos.)
- 80 fuentes activas; **12 con falla**: las 8 de Infobae (`infobae`, `-tecno`, `-economia`, `-politica`, `-cultura`, `-salud`, `-educacion`, `-ciencia`) y la UNLaM dan **HTTP 403 desde el 3/11 a la mañana** (45 vueltas seguidas); Perfil Ciencia, Salud y Economía, 5 fallas. Infobae bloquea los pedidos desde Cloudflare. El vigilante avisa a las 288 fallas seguidas (3 días), por eso **no avisó todavía**; el 6/11 a la mañana ya habría avisado.
- Vigilancia (`radar-vigilancia`): chequeo 23:00 UTC con `ok: true` y sin problemas; último informe 23:00 UTC (el de las 20:00). Conectado: núcleo sí, bot sí, mail sí, **sitio no**.
- Bot de Telegram: token ok, webhook ok, 0 pendientes, revisado 23:15.

**NO verificado:** el contenido de los informes de las 8 y las 20 (llegan por Telegram, y pedirlos al Worker necesita clave); errores de vueltas puntuales anteriores (sólo vi la última); que no falte ninguna vuelta de las 96 diarias (sólo tengo la última y el chequeo de 23:00).

## 3. Redes

**Qué dice el plan** (`v3/redes/piezas-del-dia.mjs`): clima 7:00 y 20:00 (historias), farmacia 19:00, efeméride 9:00, repasos 10:00, 15:00 y 21:00, feriado 8:00 si hay, útiles los sábados 17:00, participá (lunes a viernes menos jueves, 12:00), carruseles los domingos 11:00; agenda y carrusel del finde **en pausa**.

**Qué salió hoy según los registros de «Radar 3.0: piezas de redes» (17 corridas, todas en verde):**

| Pieza | Hora que le tocaba | Salió | Resultado |
|---|---|---|---|
| Repaso de anoche (del 4/11) | 21:00 | 22:04 del 4/11 | publicada |
| Clima de la mañana | 07:00 | 08:06 | publicada (65 min tarde) |
| Efeméride | 09:00 | 09:02 | publicada |
| Repaso de la mañana | 10:00 | 10:11 | publicada |
| Repaso de la tarde | 15:00 | 15:56 | publicada |
| Farmacia | 19:00 | 19:51 | publicada |
| Clima de la noche | 20:00 | pendiente | todavía dentro de su ventana (hasta las 24:00) |
| Repaso de la noche | 21:00 | pendiente | idem |

Voces usadas hoy: 5 de 10. Ninguna pieza falló ni se salteó por error.

**El horario se corre.** GitHub dispara el reloj cada hora «y pico» y a veces salta una vuelta (la de las 7:07 no salió; la primera fue 8:06). Por eso el clima de las 7:00 sale a las 8:06. Es una limitación de GitHub Actions; si importa la puntualidad, el disparador tendría que ser el reloj de Cloudflare.

**Posteos de nota por red (paso «Publicar los enlaces»), hoy:**

| Red | Salieron bien | Con error |
|---|---|---|
| Bluesky | 8 | 0 |
| X (Buffer, con placa) | 8 | 0 |
| Threads | 3 (`yo1m5yf`, `kchcyla`, `wsqtxzd`) | 6 intentos (4 notas distintas) |

- **Threads, la causa:** la primera tanda (14:49 y 14:54) falló creando el posteo («el objeto con ese ID no existe»: el ID de usuario no servía). Ya se arregló con el reintento por `me`: **desde entonces el posteo se crea siempre**. Pero a la hora de **publicar** (`me/threads_publish`) Threads contesta a veces «el recurso no existe» (código 24) y una vez «timeout». Es el síntoma típico de publicar **sin esperar** a que Threads termine de procesar el posteo (la propia guía de Threads recomienda esperar o consultar el estado antes de publicar). Salieron bien 3 de 5 notas desde el arreglo. **Arreglo propuesto** (no lo hice): en `v3/redes/threads.mjs`, después de crear, esperar unos segundos o consultar `GET /<contenedor>?fields=status` hasta «FINISHED» y recién ahí publicar, y reintentar el publicar una vez. Con eso **no hace falta tocar el ID ni el token**. Lo que la nota `RESUMEN-Y-PENDIENTES-05-11.md` dice de «revisar el ID» ya no es lo principal.
- `BLUESKY_HANDLE` aparece vacío en el registro; igual publica (usa el valor por defecto `radarbalcarce.bsky.social`).
- **Facebook e Instagram (posteos de nota con espejo), TikTok y YouTube (Buffer):** `radar-redes /salud` dice `activas: true`, espejo en Instagram sí, posteos sí, y la **última publicación registrada fue X a las 22:53 UTC con estado ok, sin error**. Los registros de GitHub **no cuentan** red por red las publicaciones de Meta ni de Buffer (sólo dicen «publicada»), así que **no puedo darte la cuenta de posteos de hoy por red para Facebook, Instagram, TikTok y YouTube**; eso sale del resumen de las 22:05 del Worker de redes y de las tablas `publicaciones`, que requieren clave.
- Carruseles de Facebook/Instagram: sin probar contra Meta (el primero real es el domingo 8/11 a las 11:00). TikTok modo foto: sin resolver.

## 4. Estadísticas y analíticas

### Qué fuentes de medición existen y cómo están

| Fuente | Estado | Qué verifiqué |
|---|---|---|
| **Google Analytics** (`G-9HK0GXEMH7`) | Bien puesto. Carga **después** de aceptar cookies y se dispara una sola vez (`gtag('config')`), no hay un segundo ID. | Leí el HTML publicado: el ID aparece **1 vez**, el script de gtag **1 vez**, bien formado. **Sólo mide a quien acepta**: subcuenta a la gente. Los datos viven en la consola de Google, **no hay nada en el repositorio**. |
| **Cloudflare Web Analytics** (contador `63fea168…`) | Bien puesto: un solo `<script>` con su token. Mide todos los visitantes (sin cookies), incluidos robots que ejecutan JavaScript. | 1 aparición, formato correcto. |
| **AdSense** (`ca-pub-2759023791445864`) | El código del sitio está bien: el script `adsbygoogle.js` aparece 1 vez, el meta de cuenta 1 vez y `ads.txt` responde 200 con la línea correcta. Los espacios existen pero están vacíos hasta que Google apruebe. | Leído en el HTML y en `/ads.txt`. **No pude ver el estado de la aprobación** (es la consola de Google). |
| **Cloudflare, detalle diario (GraphQL)** y **estadísticas de Meta** (`redes/estadisticas*.mjs`) | **Código del sistema viejo.** Los archivos `web/data/estadisticas.json` y `redes.json` **se dejaron de actualizar el 3/11** (últimos commits: estadísticas 12:01 UTC, redes 15:38 UTC del 3/11). Desde el corte, nadie guarda visitas ni seguidores. | `git log` de esos archivos. |
| **Buffer** | Es el canal por donde salen TikTok, YouTube y X. Las estadísticas de Buffer están sólo en su panel; en el repo no hay nada que las lea. | Código. |
| **Informe diario viejo** (mail, `informe-diario.yml`) | **Apagado en la práctica**: las 6 últimas corridas figuran como «skipped». | `gh run list`. |
| **Vigilancia 3.0** (`v3/vigilancia`) | Dos informes por Telegram (8:00 y 20:00): notas, notas frenadas y por qué, gasto de IA, fuentes caídas. **No trae visitas, ni redes, ni seguidores.** | Leí `v3/vigilancia/REGLAS.md` y el `/salud`. |
| **Resumen de redes** (Worker `radar-redes`, 22:05) | Cuenta posteos por red y los que fallaron. Nada de alcance. | Leí `v3/redes/REGLAS.md`. |
| **Informe de Telegram con números** | Existe (el del vigilante), **no pude leerlo** hoy. | — |

**Conclusión, en criollo:** las tres «etiquetas» de medición del sitio están bien puestas. Lo que **falta es el que guarda y resume los números**: en 3.0 no hay un módulo de estadísticas propio (visitas por día, notas más leídas, alcance de las redes, seguidores). El sistema viejo lo hacía y se apagó con el corte.

### Posibles errores de medición

- **Robots:** la línea de base ya avisó que ~2/3 de las visitas de Cloudflare eran de Francia y 8 de cada 10 desde computadora. Mirar siempre **Argentina + celular** además del total. Analytics filtra mejor los robots conocidos, pero sólo ve a quien aceptó cookies.
- **Dos medidores, dos números:** Cloudflare (todos, con robots) y Analytics (sólo con cookies aceptadas) **no van a coincidir**; no es un error. Para el título «visitas» usar siempre el mismo.
- **Páginas `noindex`** (`/buscar`, clima diario, repasos) **sí cuentan** en Analytics y Cloudflare. Es correcto (son visitas reales), pero ojo al leer «páginas más vistas».
- **Doble conteo:** no encontré dos IDs ni dos scripts. No hay doble conteo por el código.
- **Dato mixto el 3/11:** ese día el sitio cambió a mitad de día (corte), y Analytics empezó a las 12:00 aprox.; el 3/11 es incompleto.
- **Zona horaria:** a confirmar si las horas de Cloudflare están en UTC (la línea de base ya lo anotó).

### Cómo viene el día de hoy (lo que se puede decir sin consolas)

- **Notas:** 38 publicadas hasta las 20:15 (ayer 50), 1.546 artículos leídos, 884 historias.
- **IA:** 76 redacciones, gasto del mes US$ 0,26.
- **Redes:** 5 piezas de video publicadas, 8 posteos en Bluesky, 8 en X, 3 en Threads.
- **Visitas y alcance de hoy: NO VERIFICADO.** Cloudflare, Analytics y Meta sólo se ven en sus paneles.

### Qué mirar el domingo 8/11 (y cómo)

La línea de base compara semanas **martes a lunes** (27/10 a 2/11 contra 3/11 a 9/11). El domingo 8/11 sólo habrá 6 días de la semana nueva. Para tener algo comparable:

1. **Cloudflare → Web Analytics (o Analytics del dominio):** visitas por día, **Argentina**, **celular**, de dónde llegan (Facebook, Google). Contra: 1.559 visitas semanales, ~223 por día, 240 de Argentina, 345 de celular, 319 de Facebook, 69 de Google (línea de base).
2. **Google Analytics → Tiempo real e Informes:** primera semana completa (se cargó el 3/11); no hay con qué comparar, sólo tomar la foto.
3. **Meta Business Suite:** seguidores de Facebook (123 el 3/11) e Instagram (173), alcance y vistas de reels. Como las redes ahora son 3.0, **mirar qué pieza rinde** (clima, efeméride, repasos, farmacia).
4. **Buffer:** vistas de TikTok, YouTube y X (las de X con y sin enlace).
5. **Notas por día:** 3.0 vs. 170 del sistema viejo; el número de la 3.0 está en los informes de las 8 y las 20 por Telegram.
6. **Carrusel «La semana en Balcarce»** el domingo 8/11 a las 11:00: primer posteo real contra Meta, **mirar a las 11:15 que haya salido en Facebook e Instagram** (hoy está sin probar).
7. **Threads, X y Bluesky:** cuántos posteos salieron y qué alcance dan (X con la placa y sin enlace llega unas 13 veces menos con enlace; la decisión de ponerlo quedó para después de medir).

Si se quiere que el informe de la semana salga **solo**, hay que construir el módulo que falte (ver pendiente 3 abajo).

## 5. Workflows de GitHub (desde el 3/11 al mediodía)

| Workflow | Corridas | Resultado |
|---|---|---|
| Radar 3.0: piezas de redes | 46 | 45 verde, 1 roja (no vi cuál; la de hoy están todas verdes) |
| Radar 3.0: desplegar | 40 | 39 verde, 1 roja |
| Revisar el archivo (sistema viejo, cada 2 h) | 29 | todas verdes |
| Radar 3.0: fotos propias | 10 | 8 verde, 2 salteadas (sin pendientes) |
| Radar 3.0: unir repetidas | 3 | verde |
| **Pruebas** | **69** | **52 rojas, 17 canceladas, ninguna verde desde el 3/11 11:49 UTC** |
| Informe diario (viejo) | 5 | salteadas |
| Radar 3.0: respaldo de la base | **0** | **nunca corrió** |

### El caso «Pruebas» (`pruebas.yml`)

**Qué es:** corre `npm test` = sólo `pruebas/*.test.mjs`, las pruebas del **sistema viejo**. No corre ninguna prueba de la 3.0 (esas las corre «Radar 3.0: desplegar», `node --test "v3/**/*.test.mjs"`). Dispara en cada `push` a `main` que no sea sólo datos. Por eso en un día de muchos cambios hay una racha de rojas.

**Qué pruebas fallan en la última (`42126241324`, 5/11 23:00 UTC), y por qué:**

| Prueba | Archivo | Por qué falla |
|---|---|---|
| «con los datos de hoy entra todo y sobra lugar» | `pruebas/redirects.test.mjs:131` | Cuenta las redirecciones del archivo **viejo** (`web/data`) y hoy son **1.146**, más del tope que acepta (menos de 1.000). Es un dato que crece solo con el sistema viejo, no un error de código. |
| «infra/render-publico está al día con reels/» | prueba del render público | Los subtítulos de los reels subieron 40 px el 5/11 (`reels/reel.mjs`) y **no se corrió** `node scripts/sincronizar-render-publico.mjs`. Es el sistema viejo (`reels/`), que la 3.0 ya no usa para las piezas. |
| «los archivos copiados son EXACTAMENTE los de reels/…» | idem | Mismo motivo. |
| «la versión corta: entre 30 y 40 medios de afuera…» | `pruebas/revision-fuentes.test.mjs:256` | Mide una lista de fuentes del sistema viejo y hoy quedan 43 de afuera; el objetivo es entre 30 y 40. Prueba atada a una foto de una auditoría de octubre. |

(El 3/11 y 4/11 fallaban otras dos: «ningún workflow corre en ubuntu-latest» y «todos los workflows dicen sus permisos y tienen tope de tiempo», porque los workflows nuevos de la 3.0 no cumplían esas reglas viejas; ya no fallan.)

**Ninguna de las cuatro toca el sitio ni el motor de la 3.0.** Local, las 681 pruebas de `v3/` **pasan** (las corrí, 13 s).

**Propuesta de arreglo mínimo, de menor a mayor esfuerzo (no hice ninguna):**

1. **Lo mínimo, 5 minutos:** en `pruebas.yml` cambiar el paso a `node --test "v3/**/*.test.mjs"` como único paso **que bloquea**, y dejar `npm test` como segundo paso con `continue-on-error: true` (informativo). Queda en verde por lo que importa y deja a la vista lo viejo. Se evita además que cada push le mande un mail rojo a quien lo hizo.
2. **Arreglar las 4 a mano:** correr `node scripts/sincronizar-render-publico.mjs` (arregla 2); subir el tope de `redirects.test.mjs` o hacerlo relativo (1); ajustar o borrar la de `revision-fuentes` (1). Son tests de un sistema que se va a apagar: no vale mucho invertir.
3. **A futuro, cuando se apague el sistema viejo:** borrar `pruebas/` y `pruebas.yml` y dejar sólo las de `v3/`.

Recomiendo la 1 ahora y la 3 cuando se apague el viejo.

### Otros hallazgos de workflows

- **Respaldo de la base** (`v3-respaldo-d1.yml`): creado hoy y **sin ninguna corrida**. Corre solo a las 7:20 UTC (4:20 de Balcarce) mañana. Sin haberlo probado a mano, si falla (permisos de R2, secretos) **no hay respaldo de las ~2.800 notas migradas ni de las nuevas**. Conviene correrlo una vez a mano con «simular» y otra de verdad (ver pendiente 2). El README del propio workflow lo pide así.
- **El sistema viejo sigue vivo:** hay commits «Datos de la portada · 05/11 20:05» (a las 23:05 UTC) y «Revisar el archivo» corre cada 2 horas. Es esperable mientras exista `RESPALDO_VIEJO = si`, pero gasta minutos de Cloudflare y cupos de IA que la 3.0 no usa. Se apaga cuando las redes lleven una semana verificadas (pendiente 11).

## 6. Qué falta de la 3.0 para darla por cerrada (por importancia)

*Ya hecho y no se repite acá: el detalle está en `docs/3-0/RESUMEN-Y-PENDIENTES-05-11.md` y `docs/3-0/LISTA-DE-MEJORAS-05-11.md`; los otros informes de hoy están en esta carpeta (`TECNICA.md`, `SEGURIDAD-Y-BACKUP.md`, `COMPETENCIA.md`, `CLIMA-Y-ALERTAS.md`, `GUIA-QUE-HACER.md`).*

| # | Qué falta | Quién | Por qué importa |
|---|---|---|---|
| 1 | **Arreglar Threads** (esperar a que el posteo termine de armarse antes de publicar; reintento) | Claude solo | Hoy 4 notas se perdieron en Threads; la causa es de código, no del ID |
| 2 | **Probar el respaldo de la base** (correrlo a mano, simular y real, y probar restaurar) y que **avise** si falla | Claude solo | Sin respaldo probado no hay red de seguridad para ~2.800 notas |
| 3 | **Un módulo de estadísticas 3.0**: guardar a diario visitas (Cloudflare), seguidores y alcance (Meta), notas por día, y mandar el número a Telegram. Mientras tanto el domingo se mira a mano | Claude solo; Hernán pega las claves si faltan | El sistema viejo dejó de medir el 3/11 y la comparación del 10/11 no se puede armar sin esto |
| 4 | **Decidir el ritmo de notas** (38 a 50 por día contra 170): ¿se baja el piso a 3 medios, se sube el tope de 40, o se deja? Mirar sección por sección que tengan notas todos los días | Hernán decide, Claude ajusta | Es el cambio más grande de la 3.0 y nadie lo aprobó mirando los números |
| 5 | **Recuperar Infobae (8 fuentes) y UNLaM** (403 desde Cloudflare) o sacarlos: probar otra dirección o encabezados; si no, retirarlos del conteo | Claude solo | Pierden cobertura y votos de «cuántos medios lo cuentan»; el vigilante recién avisa a los 3 días |
| 6 | **Que el vigilante mire el sitio y las redes** (`sitio` no está conectado, `/salud` del sitio da 404) y aviso si no sale una pieza del día o si el número de posteos por red cae | Claude solo | Hoy si el sitio o Meta se caen sólo se entera quien entra |
| 7 | **Confirmar el primer carrusel real** (domingo 8/11, 11:00) y ver cómo quedan los subtítulos del clima con auspicio | Claude solo | Quedan «sin probar contra Meta» |
| 8 | **Arreglar «Pruebas»** (propuesta 1 de arriba) y cuando se apague el viejo, borrar `pruebas/` | Claude solo | Hoy la lista roja tapa un problema de verdad cuando aparezca |
| 9 | **Puntualidad de las piezas:** el clima de las 7:00 salió 8:06 por el reloj de GitHub; pasarlo al reloj de Cloudflare si importa | Claude solo, con OK de Hernán | Es un servicio de hora fija |
| 10 | **Redirecciones sueltas:** `/farmacia`, `/rss`, `/media-kit` | Claude solo | Direcciones que la gente escribe o comparte |
| 11 | **Apagar el respaldo del sistema viejo** (`RESPALDO_VIEJO`) y el sistema viejo (ahorra minutos y cupos) | Hernán da OK, Claude hace | Cuando las redes lleven una semana verificadas |
| 12 | **AdSense** (esperando Google); crear los espacios cuando apruebe | Hernán (el mail) + Claude | Ingresos |
| 13 | **Corregir textos desactualizados:** freno de IA US$ 15 en `v3/vigilancia/REGLAS.md` y `v3/nucleo/REGLAS.md` (real 7); `RESUMEN-Y-PENDIENTES` sobre Threads («revisar el ID») | Claude solo | Para que el documento no contradiga al programa |
| 14 | **El resto de la lista de mejoras** (canal de WhatsApp propio, Publisher Center de Google, Telegram con varias fotos por nota propia, rehacer notas viejas con modelo chico, agenda al día, TikTok por API propia, newsletter, etc.) | Mezcla (ver `LISTA-DE-MEJORAS-05-11.md`) | Mejoras, no cierre |

## Qué NO pude verificar

- Visitas, vistas de página, alcance y seguidores **de hoy** (Cloudflare, Google Analytics, Meta, Buffer: son paneles con clave).
- Estado de **AdSense** (aprobación) y de **Search Console**.
- Contenido de los **informes de Telegram** (8:00 y 20:00) y del **resumen de redes de las 22:05**.
- Publicaciones **por red** en Facebook, Instagram, TikTok y YouTube hoy (los registros sólo dicen «publicada»).
- Si falta **alguna vuelta** de las 96 diarias del núcleo (vi la última y el chequeo de las 23:00).
- Que cada foto de la portada **corresponda** a su nota; sólo confirmé que carga (200).
- Que el **clima de la noche** (20:00) y el **repaso de la noche** (21:00) salgan: todavía estaban dentro de su ventana cuando miré.
- Velocidad **real** en celular (sólo tiempos de servidor).
- Que el **informe CSP** (`/csp-reporte`) esté juntando datos.
