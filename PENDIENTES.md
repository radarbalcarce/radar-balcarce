# Pendientes: la lista maestra

*25/10/2026, limpieza de documentos (`docs/propuestas/LIMPIEZA-DE-DOCUMENTOS-25-10.md`; el estado verificado del 24/10, en `docs/auditoria-2-0/F-ESTADO-Y-PLAN-2-0.md`).
Es **la única lista de tareas**: cada pendiente vive acá y los demás documentos la enlazan, no la copian. Lo que se decidió y por qué queda en
`docs/DECISIONES.md` (cuando una pregunta de acá se contesta, pasa allá). `docs/TRASPASO.md` es corto y no tiene tareas. `IDEAS.md` es un banco:
una idea que se decide hacer se mueve acá con una línea. La lista vieja entera (15 a 23/10) está en `docs/historico/PENDIENTES-HASTA-24-10.md`.*

Cada renglón dice **quién**: Hernán, Andrés, "los dos" o Claude. Lo que pide una cuenta, una clave, borrar algo publicado o una decisión de criterio lo hace una
persona; Claude nunca. Se pide **una sola vez cada cosa, con el enlace y el paso** (un paso por mensaje si es desde el celular).

## 1. Hecho y andando (no hace falta pedirlo de nuevo)

- **Todo corre en Cloudflare** desde el 22 y 23/10: el motor en Workers Builds, las tareas (vigilancia, informe, pistas, auditoría IA, ilustraciones, redes) en el Worker
  `radar-balcarce-tareas`, el video en `radarbalcarce/radar-balcarce-render`, el reloj en `radar-balcarce-reloj` con vigilante de vueltas. En GitHub ya no corre
  "Actualizar la web", ni "Redes", ni "Vigilancia" (`docs/TRASPASO.md`).
- **Archivo permanente en R2 encendido** (23/10): `/nota/*` va al Worker `radar-balcarce-archivo`; `TOPE_DE_NOTAS` = 500.
- **Selección sin cupos** (3 medios lo nacional, 2 las áreas chicas incluidos Agro y Automovilismo; lo muy contado, 8; Balcarce con 36 horas; policial nacional y fútbol sólo
  argentino): reglas 215 a 218, 260 y 286 a 299 (`docs/CRITERIO-EN-UNA-PAGINA.md`).
- **Claves cargadas**: tres de Gemini, la paga de respaldo de la redacción, Groq, Mistral (26/10; OpenRouter se retiró ese día), Tavily, Meta, Cloudflare; las llaves de la mudanza (`RADAR_GITHUB_TOKEN`, `RENDER_GITHUB_TOKEN`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `MOTOR_DEPLOY_HOOK`, `CF_BUILDS_TOKEN`) y la variable `R2_RENDER`.
- **Respaldo semanal** de los domingos (a R2) y el workflow «Compactar el historial» (exige escribir `COMPACTAR`).
- **Auditoría 2.0 (24/10)**: limpieza de código (regla 311), textos de la web al día y mapa del archivo escrito (310), redes (309), lo que recibe la IA (308), sin "fuente
  principal" suelta (307), minutos de Workers Builds medidos y tres palancas escritas (312), y la segunda vuelta de documentación (313).
- **Minutos de Workers Builds** (24/10): `TARJETAS_EN_R2` = Si (la memoria de las imágenes de las notas en R2) y `MOTOR_NOCHE_CADA_HORA` = Si (de 23:00 a 6:59 una vuelta
  por hora), prendidas; el freno cuenta por ciclo de facturación, del 11 al 10 (regla 315). Reloj, motor y vigilante subidos.
- **Criterio limpio de tiempos y de texto** (25/10, regla 327): la fecha del hecho es la mediana de las fuentes para todo, una sola ventana de 24 horas para estrenar lo de
  afuera (36 lo de Balcarce), la IA recibe 6.000 caracteres por fuente y 18.000 en total. La variable `FECHA_DEL_HECHO` ya no existe.
- **Mapas de Google** (25/10, regla 321): se subió el Worker del archivo, que sirve `/nota/sitemap-archivo.xml` (un índice con un mapa por mes); `SITEMAP_PARTIDO` = Si y
  `SITEMAP_DEL_ARCHIVO` = Si; `sitemap-index.xml` y `nota/sitemap-archivo.xml` se enviaron a Search Console (`docs/auditoria-2-0/R-SEO-TECNICO-24-10.md`).
- **Revisión del archivo** (25/10): `REVISION_DEL_ARCHIVO` = "si", vuelve a andar por tandas (regla 212, `docs/flujos/REVISION-DEL-ARCHIVO.md`).

## 2. Escrito y probado, pero APAGADO: qué hace y quién lo prende

Estado al 25/10: ninguna de estas variables está prendida, salvo donde se indica. Se prenden **de a una y en el orden de cada documento**.

| Interruptor | Qué hace | Quién lo prende | Cómo |
|---|---|---|---|
| `FOTOS_EN_R2` = Si | Las fotos nuevas van a R2 y no a git | Los dos, **después** de la ruta de fotos y de que Claude suba las que hay | `docs/etapa-10-operacion/FOTOS-EN-R2.md` (fases 0 a 3: primero subir las fotos con el botón «Fotos a R2 (migración)», recién después la variable; al llevarla a Workers Builds, «Cargar variables del motor» con `simular` = `No`: por defecto trae `Si`, que deja el motor en ensayo y la web deja de publicar, como pasó el 24/10) |
| `NOTAS_CON_DATOS` = Si (o `dolar,f1,antes`) | Las notas suman bloques con datos propios armados por código: «Antes en Radar», la ficha de Colapinto y la tira del dólar (regla 323) | Los dos | `docs/etapa-10-operacion/NOTAS-CON-DATOS-PILOTO.md` § 2: crear la variable, correr «Cargar variables del motor» y mirar 20 a 30 notas con bloque (empezar por `dolar,f1`) |
| `ENLACES_CORTOS` = Si | Enlaces cortos en Facebook (`radarbalcarce.com/r/f/<id>`) | Hernán decide; los dos lo hacen | Subir el Worker `infra/enlaces-cloudflare/`, poner la ruta, probar y recién ahí la variable (`docs/redes/ACORTADOR-DE-ENLACES.md`) |
| `FOTOS_MENORES_OFICIALES` = Si | Fotos con chicos de fuentes de Balcarce (deporte, escuela, cultura; nada policial) | Los dos (Hernán ya dijo que sí el 17/10) | Crear la variable con "Si" (regla 211) |
| `MINIMO_NACIONAL` / `MINIMO_AREAS_CHICAS` | Cuántos medios hacen falta (valen 3 y 2 si no existen) | Hernán, con la estadística | Variables de GitHub, sin tocar código |
| `POLICIAL_NACIONAL` / `FUTBOL_SOLO_ARGENTINO` | Valen **prendidas** por código; se apagan poniendo "no" | Hernán, sólo si se arrepiente | Variables de GitHub |
| `WHATSAPP_CANAL_URL`, `TELEGRAM_CANAL_URL`, `BLUESKY_URL` | Botones de esos canales en el sitio | Las personas, cuando crean las cuentas | Pegar la dirección como variable |
| `COMPILAR_SIEMPRE` | Fuerza compilar aunque nada haya cambiado | Sólo para probar | — |

Ojo con dos variables que parecen la misma: `REDES_ACTIVAS` (GitHub: hoy "No") y `REDES_ACTIVAS_NUBE` (Cloudflare: hoy "Sí"). **Manda la de la nube**; quien mire sólo GitHub cree que las
redes están apagadas.

**Por qué no entró (reglas 314 y 327):** *(Claude)* mirar en la estadística que cada día la suma de `motivos` dé `llegaron`, que no aparezca «Historias sin motivo» en la corrida y cuántas de 8 medios o más salen por día, ahora con la ventana de 24 horas y la mediana para todo (regla 327). *(Hernán, lo que queda de las decisiones D1 a D8 del informe `docs/historico/auditoria-2-0/N-POR-QUE-NO-ENTRO.md`; la ventana de 12 horas de lo nacional ya se resolvió con la regla 327)*: contar las 36 horas de Balcarce desde que se vio la nota, qué hacer con una nota de Balcarce de un solo medio con verificación baja, el chico muerto sin nombrar, los chimentos de 14 medios, los cuerpos de 50 a 69 palabras, la nota de economía con el dólar y el policial de la Patrulla Rural.

**Quedó sacado y se rehace cuando lo pidan:** el prototipo de audio en la página (los podcasts para escuchar desde la nota); el panel nuevo del celular se hace de cero.
## 3. Pendiente de Claude

"Lanza" = hace falta antes del lanzamiento.

| # | Qué | Lanza |
|---|---|---|
| C1 | Confirmar que `npm test` esté verde en `main`: la prueba roja que anotó la auditoría F ("una historia retoma el TEMA del repaso anterior…") **pasó** en la corrida completa del 24/10 en la rama de la segunda vuelta (3.103 pruebas; sólo fallan 3 por el entorno de esa carpeta: falta `react` y un CRLF), pero hay que mirar la corrida de «Pruebas» de GitHub | Sí |
| C2 | **Fotos a R2**: la hidratación ya está hecha (regla 316: reels, revisión del archivo, ilustraciones, Worker de tareas) y la migración probada, con un botón («Fotos a R2 (migración)»). Falta **ejecutar** el paso a paso de `docs/etapa-10-operacion/FOTOS-EN-R2.md` (simulacro, mirar, subir de a poco, prender, mirar dos vueltas y tres días, sacar de git entre vueltas) | Sí |
| C3 | Medir los minutos de Workers Builds por día contra el presupuesto (200 por día) y mirar el registro por paso que quedó escrito (regla 312); decidir con los dos si se achican los PNG de las tarjetas o se acepta pagar el excedente (`MOTOR_SIN_TOPE`) | Sí |
| C4 | La revisión del archivo corre en GitHub (`revisar-archivo.yml`, cada 2 h): con `REVISION_DEL_ARCHIVO` = "si" desde el 25/10 gasta minutos de Actions de verdad; mirar cuántos antes de pasar a privado y, si hace falta, que el reloj no la pida cuando está en "no" | Sí, si pasan a privado |
| C5 | Bajar lo que gasta "Pruebas" en GitHub (corre en cada cambio de código) | Sí, si pasan a privado |
| C6 | **El botón "Actualizar la web ahora" del panel del celular** dispara el workflow `actualizar.yml` de GitHub, no el motor de Cloudflare (y la pestaña Hoy mira las corridas de GitHub): hay que apuntarlo al motor **antes** de apagar los workflows viejos. **Escrito y probado el 24/10 (regla 317): falta SUBIR los Workers y el panel, en ese orden (`docs/11-OPERACION.md`, tarea 5 bis).** Hasta entonces el botón sigue despertando al robot viejo | Sí (antes de P1) |
| C7 | Sincronizar el repositorio público de render con `reels/` (`node scripts/sincronizar-render-publico.mjs`; el último push fue el 17/10 y `reels/` cambió desde entonces: reglas 300 a 302) | Sí |
| C8 | Botón de emergencia que frene toda la publicación automática (hoy el camino es poner `REDES_ACTIVAS_NUBE` en No o retirar la nota a mano). **Escrito y probado el 24/10 (regla 317, «Pausa general» en Más): falta SUBIRLO y hacer el ensayo de 2 minutos (`docs/11-OPERACION.md`, tarea 5 bis)** | Sí |
| C9 | Separar robots de lectores en las estadísticas (desde el 19/10 casi toda la visita figura de Francia y Estados Unidos) | Conviene |
| C10 | Reordenar las IA: Gemini y Groq sólo para escribir y verificar notas; Cloudflare para lo demás. OpenRouter se retiró y los 429 ya se miden con su motivo (26/10: `web/data/uso-ia.json`, línea por clave del informe diario); falta mirar una semana de datos y decidir | Conviene |
| C11 | Mostrar a Hernán por qué se descartan hechos de 8 o más medios (`web/data/muy-contadas.json`, ya con motivos separados) y mirar una semana de policial nacional y muertes de famosos | Conviene |
| C12 | Fotos de deportes (pasan el control 5 de 10), notas más completas, secciones flojas (Agro, Ciencia, Tecnología, Automovilismo) | Conviene |
| C13 | Animaciones del repaso, guiones con continuidad y voces nuevas: falta "oírlo y verlo" (reglas 300 a 302; `docs/redes/VOCES-NUEVAS.md`) | Conviene |
| C14 | Sacar de git lo que sólo lee el robot (libro de redes, vigilancia, estadísticas, fichas): de ~100 commits por día a ~10. **Bloqueado por el panel** (lee esos archivos de git) | No |
| C15 | Sitio liviano: bajar `TOPE_DE_NOTAS` a ~400 y compilar en 1 a 2 minutos. **Bloqueado por las fotos** (ruta) | No |
| C16 | Lo que quedó de la auditoría integral: sacar `impacto` de la ficha de la IA, bajar la entrada de feeds de acá de 72 a 36 h, regenerar `REGLAS-Y-PROMPTS.html` | No |
| C17 | Actualizar las acciones de GitHub con Node 20 deprecado (`checkout`, `setup-node`, `cache`), probando en un workflow manual | Conviene |
| C18 | Leer las respuestas de ChatGPT y Gemini guardadas en el Chrome y anotarlas en `docs/historico/auditoria-2-0/08-IDEAS-DE-OTRAS-IA.md` | No |
| C19 | Enchufar el registro de uso de la IA (`redes/uso-ia.mjs`, regla 170) en la lectura, las fotos, las voces y las pistas (hoy sólo anota la redacción) | No |
| C20 | Pruebas de documentos: desde el 25/10 una prueba controla que cada regla vigente (R1 a R39 de `docs/10`) nombre pruebas que existan (`documentos-313.test.mjs`); falta la de enlaces relativos que existan | Conviene |
| C22 | **Ordenar el correo** (pedido el 25/10 para el jueves 29/10): `contacto@`, `redaccion@` y `publicidad@` ya llegan a radarbalcarce@gmail.com por Email Routing de Cloudflare (probado el 25/10; un mail de la misma cuenta de Gmail a sí misma no aparece en la bandeja, sólo en Enviados). (1) **Hecho el 25/10**: ya no salen avisos sueltos; van resumidos arriba de los dos informes del día, que traen el detalle completo (falta desplegar los Workers: «Desplegar Workers de Cloudflare», `todo`, con la nube). Falta: (2) una revisión automática de lo que llega a `contacto@` y `redaccion@` que separe gacetillas de prensa y mensajes de la gente del spam y los ponga en el panel del celular (Worker de correo de Cloudflare o lectura del Gmail, a decidir) | Conviene |
| C23 | **TikTok y YouTube: ANDANDO A PRUEBA desde el 25/10** (Buffer gratis, cuenta radarbalcarce; `redes/buffer.mjs`; cada reel que sale en Instagram va a las dos redes y queda en el libro bajo `buffer`; prueba a mano: workflow «Buffer (TikTok y YouTube)»). Falta: mirar unos días que salgan todos; **si funciona, sumar los enlaces de TikTok (`tiktok.com/@radarbalcarce`) y YouTube (`youtube.com/@RadarBalcarce`) al pie de la web** (`REDES_SOCIALES`, `web/lib/datos.js`, y `sameAs` de la ficha), y el jueves 29/10 revisar con ellos qué otras redes faltan (X `@RadarBalcarce`, Threads `@radarbalcarce` ya existen); sumarlo al informe diario y a la auditoría de redes, y decidir si van también las historias. Lo investigado el 25/10: 1º Buffer gratis (3 canales, API con 250 pedidos por día; TikTok tiene que ser cuenta «business»; falta probar que su API publique un video por dirección), 2º app propia en developers.tiktok.com (gratis, pero hasta pasar la auditoría de TikTok sólo publica en privado), 3º subirlo por el navegador con la PC prendida (último recurso: se rompe y arriesga la cuenta). YouTube Shorts: API gratis, pide auditoría de Google para que los videos sean públicos. Necesita que ellos creen la cuenta de TikTok business y la de Buffer | Conviene |
| C24 | **Fuentes y notas propias por sección** (pedido el 25/10 para el jueves): Ciencia no tuvo notas 5 de 7 días y Agro 3 de 7 (`web/data/estadistica-seleccion.json`). Sumar fuentes de esas áreas y pensar notas propias armadas con datos (como el dólar o el clima) para que cada sección tenga algo todos los días; revisar con la estadística semanal si `MINIMO_AREAS_CHICAS` baja | Conviene |
| C21 | Títulos de pruebas que quedaron viejos (no cambian lo que prueban): `archivo.test.mjs` "corta las listas en 72 horas" (son 36) y el encabezado de `criterios-extranjero-zona.test.mjs` ("las listas de sepelios esperan a una persona", "notas de más de 7 días") | No |

Dormidos (existen, tienen pruebas y producción no los usa; los despierta o los borra el dueño): `comercial/`, `motor/`, `sePuedeSola` (`redes/elegir.mjs`), `agruparPorHecho` (`ingesta/cruce.mjs`).

## 4. Pendiente de una persona

Primero lo que salió el 24/10 y desbloquea lo demás, en orden. Después lo de siempre.

### 4.1 Salió el 24/10 (en este orden)

| # | Quién | Qué | Dónde |
|---|---|---|---|
| P1 | Los dos | **Cada vez que cambie un Worker, subirlo** (no se suben solos): «Desplegar Workers de Cloudflare» (tildar «con la nube») y «Reloj de Cloudflare». Los del 24 y 25/10 (motor, vigilante, reloj y archivo) ya están subidos. Mirar de vez en cuando en `GET /estado` del motor que `ciclo.minutos` se parezca al contador de Cloudflare | https://github.com/radarbalcarce/radar-balcarce/actions → Run workflow |
| P3 | Los dos | **Fotos en R2**: poner la ruta de fotos (workflow «Archivo permanente (producción)» con `activar_fotos`) y, cuando el botón «Fotos a R2 (migración)» (modo `mirar`) diga que a R2 no le falta ninguna, crear `FOTOS_EN_R2` en GitHub, llevarla a Workers Builds y subir el Worker de tareas | `docs/etapa-10-operacion/FOTOS-EN-R2.md` (paso a paso) |
| P4 | Los dos | **Mapas de Google** (regla 321): prendidos y enviados el 25/10. Falta, hacia el 1/11, comparar en Search Console → Sitemaps las enviadas y las indexadas de cada mapa (paso 5) | `docs/auditoria-2-0/R-SEO-TECNICO-24-10.md` § 2.4 |
| P4b | Hernán | **Decidir** si se hacen las páginas de archivo por día (`/archivo/AAAA/MM/DD`, ruta nueva en el Worker del archivo) y si se activan las transformaciones de imagen de Cloudflare (recortes 16:9, 4:3 y 1:1 sin archivos nuevos) | `docs/auditoria-2-0/R-SEO-TECNICO-24-10.md` §§ 2.1 y 3 |
| P5 | Hernán | **Decidir los enlaces cortos**; si es sí, subir el Worker y poner la ruta | `docs/redes/ACORTADOR-DE-ENLACES.md` |
| P6 | Los dos | **Search Console** (una vez por semana, 15 min: Páginas, Sitemaps con `sitemap-index.xml`, Rendimiento); **Bing Webmaster Tools** (importar desde Search Console); Google Publisher Center (decisión) | https://search.google.com/search-console · https://www.bing.com/webmasters |
| P7 | — | ~~Participá: las piezas fijas vencen el 31/10~~ **Resuelto el 25/10**: las piezas fijas ya no vencen (se arman una vez y se repiten hasta que alguien las vuelva a armar con «Fijar piezas») | — |
| P8 | Hernán | **Open-Meteo**: el plan gratis es de uso no comercial (sus términos) y el sitio va a tener publicidad; decidir qué se hace antes de sumar datos de lluvia (o el clima sale de `api.met.no`) | `docs/auditoria-2-0/K-DATOS-E-INFOGRAFIAS-POR-TEMA.md` § 11 |
| P9 | Los dos | **Altas de redes** (sólo si las quieren; ninguna bloquea el lanzamiento): Telegram (canal y bot con @BotFather), Bluesky, canal de WhatsApp, y después X, Threads, TikTok y YouTube; pegar las direcciones como variables | `docs/proyecto/REDES-CRONOGRAMA-MAESTRO.md` (las otras redes), `docs/auditoria-2-0/J-REDES-CRONOGRAMAS-Y-CANALES.md` |

### 4.2 Antes del lanzamiento

| # | Quién | Qué | Dónde |
|---|---|---|---|
| P10 | Los dos | **Verificación en dos pasos** en Google (radarbalcarce@gmail.com), Meta, Instagram, GitHub, Cloudflare y DonWeb; revisar el mail de "cambio de contraseña" de Instagram que apareció en el Gmail del medio | Cada cuenta |
| P11 | Los dos | **Apagar los 7 workflows viejos** (Actualizar la web, Redes, Vigilancia, Auditoría IA, Pistas, Informe diario, Ilustrar notas sin foto), **sólo después de C6** y de que Claude confirme que ninguno es respaldo vivo. No apagar «Revisar el archivo», «Piezas de redes», «Pruebas», «Respaldo», «Reloj de Cloudflare», «Vigilante de Cloudflare», «Desplegar Workers de Cloudflare» ni «Compactar el historial». "Informe diario" tiene un horario de respaldo propio (11:45 y 00:45 UTC) que desaparece al apagarlo | Actions → tres puntitos → *Disable workflow* |
| P12 | Los dos | **Tope de gasto de Actions en US$ 0** | github.com → Settings → Billing → Budgets |
| P13 | Los dos | **Compactar el historial** (escribir `COMPACTAR`), **recién después de mover las fotos** (P3); después, en la PC: `git fetch origin && git reset --hard origin/main && git reflog expire --expire=now --all && git gc --prune=now --aggressive` | Actions → «Compactar el historial» |
| P14 | Los dos | **Pasar el repositorio a privado**, cuando se cumplan las condiciones de la etapa 4 del plan (`docs/auditoria-2-0/F-ESTADO-Y-PLAN-2-0.md`) | Settings → Danger zone |
| P15 | Los dos | **Respaldo afuera de GitHub**: el de los domingos sube a R2; falta GitLab (`GITLAB_TOKEN`) y una copia a Drive o a la PC; y probar la restauración una vez | `docs/propuestas/PASOS-PARA-USTEDES.md` § 1 |
| P16 | Los dos | Un documento "si mañana falta uno de nosotros" (dominio, cuentas, pagos, recuperación), guardado fuera del repositorio (Claude lo redacta con la lista) | — |
| P17 | Hernán | Cloudflare: confirmar que no estén prendidos "Block AI bots" ni "robots.txt administrado"; mirar "AI Crawl Control" | https://dash.cloudflare.com |

### 4.3 Limpieza y cuentas (cuando puedan)

- Borrar el secreto `OPENROUTER_API_KEY` de GitHub (Settings → Secrets) y del Worker de tareas: desde el 26/10 el código no lo lee (los dos). Para trabajar con DeepSeek desde la PC (`scripts/claude-con-openrouter.cmd`) se usa la variable de Windows, aparte.
- En la PC: borrar `panel\datos` y `respaldos` (tienen claves viejas) y dar de baja Tailscale si no se usa.
- Borrar el Worker `radar-balcarce-sondeo-fuentes`, el secreto `SONDEO_TOKEN` y los tres trabajos pausados de cron-job.org; borrar el proyecto de Vercel y limpiar el DNS.
- Ordenar las claves de Google: la facturación está en un proyecto que Radar no usa (`docs/08-INFRAESTRUCTURA.md`, «Los proyectos de Google y cómo ordenarlos»).
- **Claves pagas de Gemini** (decidido el 25/10; el código ya está en `main`): crear `GEMINI_API_KEY_RESPALDO` (respaldo pago de la redacción, US$ 10 por mes) y dar US$ 10 por mes a la de voces (`GEMINI_API_KEY_REDES`). Con la de voces paga, subir la variable de GitHub `AUDIOS_POR_DIA` (vacía = 10). Antes, **guardar la referencia de las voces actuales** (`docs/redes/VOCES-NUEVAS.md`) y poner el límite de gasto en Google.
- GitHub → Settings → Actions → General: *Require approval for all outside collaborators* (mientras el repositorio sea público).
- Completar bios y perfiles de Instagram y Facebook (categoría, enlace, botón de WhatsApp, historias destacadas: `PERFILES.md`); Instagram tiene 7 seguidores y Facebook 53 (23/10).
- Mandarse un mail de prueba a `contacto@`, `redaccion@` y `publicidad@` y decidir "Enviar como" en Gmail.
- Teléfonos útiles (regla 324): confirmar con la fuente oficial el número de la **comisaría general** y el de **Defensa Civil**, que la voz y la pantalla de los sábados todavía no nombran porque no están en los datos del repo; recién entonces se suman a `NUMEROS` (`ingesta/utiles.mjs`) y a una pantalla (`PANTALLAS_DE_UTILES`).
- Borrar a mano en Instagram las copias repetidas de antes y, si se decide, el posteo del superávit del 29/09.
- AdSense con `radarbalcarce@gmail.com` (pide datos fiscales); Wikidata y Bing Places.
- Dos errores de escritura congelados en `web/data/correcciones.json` (hallazgo B1 de Opus): en la nota `1b3umaz`, "campen" (debería decir "campeón"), y en `woerbj`, "La Séleccion Argentina".
  Lo de una persona no se edita sin decidir: corregirlos a mano (con `motivo`, `cuando` y `por`) o dejarlos.

## 5. Decisiones abiertas (una pregunta por renglón; Claude recomienda, vos decidís)

Las de más peso, con la recomendación. Cada módulo de la auditoría 2.0 tiene su lista completa con el razonamiento (`docs/auditoria-2-0/B`, `C`, `E`, `H`, `K`).

1. **Posteos de notas por día en Facebook** (hoy 5, relevancia 75, 5 medios para lo de afuera): 98 posteos dieron 265 personas y las visitas reales son 6 a 11 por día. El 23/10 se acordó no bajarlos "porque la cuenta recién arranca".
   Recomendación: dejar como está y probar un mes con franjas (`docs/auditoria-2-0/C-REDES.md` D-1); no tocar los reels.
2. **Política y Policiales de Balcarce hacia las redes**: hoy no sale ninguna sola y nadie las mira. Recomendación: una lista diaria de 3 a 5 candidatas en el celular (C-REDES D-2).
3. **Firma de las notas**: "Redacción asistida con IA, verificada contra las fuentes" (hoy, adentro de "Fuentes") o "Escrita por IA" afuera (B, preguntas 1 a 4). Recomendación: la línea corta y visible.
4. **¿Se rehacen las notas cuando suman medios?** (E, pregunta 1). Recomendación: sí, una sola vez, al llegar a 8 medios.
5. **Largo de las muy contadas**: hoy 70 a 300 palabras; recomendación 200 a 350 (E, pregunta 2).
6. **Semáforo, lista roja**: sumar edades y verbos ("violaron a una nena") para que frene también las pistas; "una menor" suelta. Es de Hernán y no se toca sin su sí por escrito.
7. **Nombrar a menores en notas positivas** (un logro escolar o deportivo): choca con la regla de oro; sigue prohibido hasta que Hernán diga que sí.
8. **Línea editorial (regla 22)**: el texto final de "centro y centro-derecha, tono neutral" (hay un borrador sin aplicar); **opinión firmada** sí o no.
9. **Rastreadores de IA en `robots.txt`**: hoy se permite entrenar con el sitio por defecto; no hay registro de que se haya decidido a conciencia.
10. **Historial de GitHub**: compactarlo (irreversible, con copia previa) y cuándo pasar a privado (P13 y P14).
11. **Elegir una de las dos portadas** de `docs/diseno/VISTA-PREVIA-PORTADA-2.html`; los bloques "Lo que se cuenta en todo el país" y "En los medios de Balcarce" (`docs/propuestas/EN-LOS-MEDIOS-DE-BALCARCE.md`).
12. **Música en los videos** y **colores de las secciones** nuevas.
13. **Comercial**: seguir con `comercial/` o retirarlo; quién habla con comercios; avisos gratis a 3 o 4 comercios (H, sección 12).
14. **Datos legales del medio** en "Quiénes somos" y una página pública de correcciones (D6 y D8 de `docs/auditoria-2-0/D-SEO.md`).
15. Cuatro fuentes de España apagadas: **no se prenden** (Hernán: "no es necesario sumar fuentes de afuera"). Está decidido; se deja escrito para que nadie lo vuelva a preguntar.
16. **Notas de la redacción (pestaña Escribir del panel, 30/10) hacia las redes**: hoy una nota que escribe una persona desde el celular sale sólo en la web; no va sola a Facebook, Instagram, TikTok ni YouTube, ni entra a los repasos (como las demás notas propias). Pregunta para los dos: ¿quieren un botón «mandar a redes» en la lista «Mis notas publicadas»? Recomendación: sí, con la misma pregunta de confirmación que ya tiene «Mandar también a las redes», y que Política y Policiales sigan esperando a una persona. Tampoco decidido: el crédito «Foto: Radar Balcarce» que se le pone solo a una portada sin crédito.

## 6. Bloqueado (y por qué)

| Qué | Bloqueado por | Se destraba cuando |
|---|---|---|
| Compactar el historial con efecto real | Las fotos nuevas siguen entrando a git | `FOTOS_EN_R2` prendida y `--subir --quitar` hechos |
| Bajar `TOPE_DE_NOTAS` de 500 a ~400 | La ruta de fotos en el Worker (sin ella una foto sacada de Pages da 404) | P3 hecho |
| Repositorio privado | Minutos de GitHub (P11, P12, C4, C5), historial compactado (P13) y tres días sin que nada vuelva a GitHub | Etapa 4 del plan |
| Sacar estado de git (libro de redes, vigilancia, fichas, estadísticas) | El panel del celular y el informe diario leen esos archivos de git; el panel se rehace de cero aparte | Se decide rehacer el panel (después del lanzamiento) |
| Voces nuevas | Clave paga de Gemini y guardar la referencia de las actuales | Las personas |
| Enlaces cortos | Decisión de Hernán, el Worker y la ruta | P5 |
| Más redes (X, Threads, TikTok, YouTube, Telegram, Bluesky) | Cuentas sin crear | P9 |
| Panel nuevo del celular, audio en la página, páginas por barrio | No hay prioridad antes del lanzamiento | Después del lanzamiento |

## 7. Con fecha

| Cuándo | Qué | Quién |
|---|---|---|
| **29/10** | Mirar el estado y decidir el sitio por Worker (`docs/CHECKLIST-JUEVES-29-10.md`) | Los dos, con Claude |
| 30/10 y 1/11 | Pasar a `docs/historico/` (con `git mv`) `docs/CHECKLIST-JUEVES-29-10.md` y `docs/efemerides-octubre-para-revisar.md` | Claude |
| Hacia el 1/11 | Search Console: enviadas e indexadas de cada mapa (P4) | Los dos |
| Hacia el 13/11 | Decidir si se indexa sólo lo de Balcarce y lo respaldado, con datos de Search Console (D2 del SEO; hoy no hay datos porque nadie mira Search Console) | Los dos |
| 15/12 | Revisión general (archivo, fotos, respaldo) | Los dos, con Claude |
| Enero de 2027 | Volver a mirar si hace falta un servidor MCP | Claude |
| 21/09/2027 | Renovar el dominio `radarbalcarce.com` (DonWeb); el vigilante avisa 30 días antes | Los dos |
| 29/09/2027 | Renovar la llave del panel del celular y las dos voces propias (`CRITERIO-REDES.md` § 6) | Hernán; los dos |
| Cada 90 días | Medidas de imagen de las redes (`FORMATOS.md`) y las guías de Google sobre IA | Los dos |
