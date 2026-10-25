# Costos y recursos de Radar Balcarce

*24/10/2026. Hecho leyendo sólo el repositorio (código y documentos). **No se entró a ninguna cuenta ni a ninguna factura.** Por eso, todo número que el repositorio no dice está marcado **«a completar con la factura»** (y se indica qué pantalla mirar) o **«a validar»** (lo escribe una cuenta mía o un precio público que hay que confirmar). Si esto y una factura no coinciden, manda la factura.*

*Para quién: Andrés (que no programa) y para mostrar a quien nos quiera financiar. Las palabras técnicas están explicadas en la sección 9.*

---

## 0. En diez líneas

1. **Lo único que se paga hoy, según el repositorio, son dos cosas:** el plan **Workers Paid de Cloudflare (US$ 5 por mes)** y el **dominio** `radarbalcarce.com` en DonWeb (una vez por año; **el precio no está escrito en ningún lado: a completar con la factura**).
2. **Todo lo demás corre en planes gratis o dentro de lo que ya incluye Cloudflare**: GitHub (mientras el repositorio sea público), las claves de inteligencia artificial (Gemini, Groq, OpenRouter, Tavily), la API de Meta (Facebook e Instagram), el mail, los datos de clima, dólar, fútbol y F1.
3. **Costo mensual conocido: unos US$ 5 más la parte mensual del dominio.** Es un piso: hay dos cuentas que revisar para confirmar que no se esté cobrando algo sin querer (la de Google y la de OpenRouter, al final de la sección 2).
4. **El costo no depende de cuántos lectores haya** (el sitio es estático y Cloudflare no cobra por visita en este plan); **depende de cuánto produce el robot** (notas, videos con voz, imágenes).
5. **Lo que se agota primero** es el cupo de voz: **10 audios por día** en la clave gratis. Después, los **6.000 minutos de armado** de Cloudflare (por **ciclo de facturación, del 11 al 10**, no por mes calendario: regla 315), y los **pedidos diarios** de las IA gratis.
6. **El riesgo de plata más grande no es un servicio caro: es pasar el repositorio de GitHub a privado** y que el robot siga gastando minutos allá (US$ 70 a 136 por mes medidos el 15/10, antes de la mudanza a Cloudflare). La mudanza se hizo justamente para evitarlo.
7. **Un tema de licencia a resolver si hay publicidad:** el clima viene de Open-Meteo, que en su plan gratis es **sólo para uso no comercial**. Si el sitio vende avisos, hay que pasar a un plan pago de ellos o cambiar de fuente (sección 2, fila 20).
8. **Si crece 5 veces** (más notas, más videos), el costo sube sobre todo por la **voz** y por los **minutos de armado**; las cuentas, con sus supuestos, están en la sección 4.2. Orden de magnitud: de US$ 5 a algo entre US$ 15 y 70 por mes **[a validar]**, y la mayor parte sería voz y armado.
9. **Vencimientos que hay que cuidar:** dominio **21/09/2027**, las dos voces propias **29/09/2027**. El vigilante avisa por mail 30 días antes.
10. **Punto único de falla:** el reloj (el Worker `radar-balcarce-reloj` de Cloudflare). Si se cae, no corre nada. Sección 5.

---

## 1. Cómo leer las marcas

| Marca | Qué quiere decir |
|---|---|
| **[REPO]** | Está escrito en el repositorio (código o documentos), con fecha. |
| **[PÚBLICO]** | Es un precio o límite de la página oficial del proveedor, citado por los documentos del repositorio en una fecha. Puede haber cambiado. |
| **[A VALIDAR]** | Cuenta o suposición mía. No tomar como cifra firme. |
| **[A COMPLETAR]** | El repositorio no lo dice. Hay que mirar la pantalla que se indica. |

---

## 2. Tabla maestra de recursos y servicios

Costo mensual «hoy»: lo que el repositorio dice o permite deducir. **US$ 0** significa «el repositorio lo da como gratis o dentro de lo incluido», no «verificado en la factura».

### 2.1 Lo que se paga

| # | Recurso | Para qué sirve | ¿Gratis o pago? | Costo por mes hoy | Límite gratis / qué incluye | Qué pasa si se supera | Quién tiene la cuenta | Vence | Qué pasa si se corta |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Dominio `radarbalcarce.com`** (DonWeb) | La dirección de la web, de todos los enlaces de las redes y del mail `vigilante@radarbalcarce.com` | **Pago, anual** | **[A COMPLETAR]** (no figura en el repositorio). Ver factura de DonWeb: Mi cuenta → Dominios → Facturación | No aplica | No aplica | DonWeb; el titular no está en el repositorio (**[A COMPLETAR]**: confirmar a nombre de quién) | **21/09/2027** [REPO] | **Se cae la web y se rompen todos los enlaces de las redes ya publicadas.** El vigilante avisa desde 30 días antes |
| 2 | **Cloudflare Workers Paid** | La «base» paga que incluye los Workers (reloj, vigilante, tareas, imágenes, archivo), el armado del sitio (Workers Builds), R2, KV y las imágenes con IA | **Pago, mensual** | **US$ 5** [REPO] | 10 millones de pedidos por mes; 6.000 minutos de armado por ciclo de facturación (del 11 al 10); R2 10 GB; Workers AI 10.000 «neuronas» por día [REPO, de la documentación oficial leída el 15 y 18/10] | Armado: US$ 0,005 por minuto de más. R2: ver fila 5. Neuronas: US$ 0,011 por cada 1.000 de más. Pedidos: el sistema hace unos cientos por día, lejos del tope | `radarbalcarce@gmail.com` | Se renueva solo todos los meses con la tarjeta cargada (**[A COMPLETAR]**: qué tarjeta y de quién) | Si no se paga, los Workers dejan de correr: **no hay reloj, no se arma la web, no hay redes**. La web ya publicada puede seguir servida por Pages, pero deja de actualizarse |

### 2.2 Lo que corre gratis o dentro de lo incluido

| # | Recurso | Para qué sirve | ¿Gratis o pago? | Costo hoy | Límite gratis | Qué pasa si se supera | Cuenta | Vence | Si se corta |
|---|---|---|---|---|---|---|---|---|---|
| 3 | **Cloudflare Pages** | Sirve la web `radarbalcarce.com` (el sitio ya viene armado, es «estático») | Gratis (el plan Workers Paid no lo cambia) | US$ 0 [REPO] | 20.000 archivos por subida; las subidas «directas» no cuentan contra las 500 compilaciones por mes [REPO] | Si se pasan los 20.000 archivos la subida falla: por eso hay un tope de notas con página (`TOPE_DE_NOTAS`, hoy 500) y las viejas salen de R2 | Cloudflare (`radarbalcarce@gmail.com`) | — | La web no responde. Avisa el vigilante por mail |
| 4 | **Cloudflare DNS, Email Routing y Web Analytics** | Que el dominio funcione, que lleguen los mails del vigilante y contar visitas sin cookies | Gratis | US$ 0 [REPO] | — | — | Cloudflare | — | Sin DNS no hay web. Sin Email Routing no llegan los avisos (queda el WhatsApp de respaldo) |
| 5 | **Cloudflare R2** (almacenamiento) | Depósitos privados: `radar-archivo` (notas viejas y fotos que salen del sitio), `radar-balcarce-respaldos` (copia de seguridad de los domingos), `radar-piezas` (videos y audios de las redes), `radar-motor`, `radar-render`, `radar-tareas` (memoria del robot) | Gratis hasta 10 GB; después pago por uso | US$ 0 [REPO]. Medido: 223 MB de notas (23/10); las piezas suman unos 0,75 GB por mes | 10 GB-mes, 1 millón de escrituras y 10 millones de lecturas por mes. **Bajar archivos (salida) no cuesta** [PÚBLICO, 15/10] | **US$ 0,015 por GB-mes de más**; escritura US$ 4,50 por millón de más; lectura US$ 0,36 por millón de más | Cloudflare | — | El archivo permanente y los respaldos dejan de funcionar; las piezas no se guardan. El sitio sigue |
| 6 | **Cloudflare Workers Builds** | La «máquina» donde se arma la web cada media hora | Incluido en Workers Paid | US$ 0 si no se pasa de 6.000 min | **6.000 minutos por ciclo de facturación** (del 11 al 10: «Oct 11 - Nov 10», no el mes calendario; el presupuesto del motor lo cuenta así desde la regla 315, variable `MOTOR_CICLO_DIA`), 20 minutos por armado, 4 procesadores y 8 GB [REPO] | **US$ 0,005 por minuto** de más (US$ 6 por mes si se arma siempre 48 veces por día con vueltas de 5 minutos [REPO]). Antes de pasarse, el **presupuesto automático saltea vueltas** (la web puede tardar más de 30 minutos en actualizarse) | Cloudflare | — | La web deja de actualizarse. Avisan el vigilante y los informes |
| 7 | **Cloudflare Workers AI** | Las ilustraciones de las notas sin foto (modelo FLUX/SDXL) y el texto de sus prompts | Incluido (cupo diario gratis) | US$ 0 [REPO] | 10.000 neuronas por día. El sistema se pone **12 llamadas por corrida y 20 por día** [REPO] | US$ 0,011 por 1.000 neuronas de más | Cloudflare | — | Las notas sin foto salen con la «placa» (diseño sin foto) en lugar de ilustración |
| 8 | **Cloudflare KV** | Memoria chica de los vigilantes y las tareas | Incluido | US$ 0 [REPO] | **[A VALIDAR]** los cupos exactos de KV en Workers Paid | Cobro por uso | Cloudflare | — | Los vigilantes pierden el estado (repiten avisos); no se cae la web |
| 9 | **GitHub** (repositorio `radarbalcarce/radar-balcarce`) | Guarda el código, los datos de la web, el historial y las pruebas; los «workflows» que quedan en GitHub (pruebas, piezas, panel del celular, semanales) | Gratis mientras el repositorio sea **público** | US$ 0 [REPO] | En público: minutos de Actions sin tope. En privado, plan Free: **2.000 minutos por mes** | En privado: **US$ 0,006 a 0,008 por minuto** de más. Medido el 15/10 (antes de la mudanza): 19.000 min facturables = **US$ 70 a 136 por mes** [REPO]. Hoy, con lo ya mudado, el cálculo es de **~1.620 a 1.820 min** (cabe, con poco margen) [REPO, estimado 18/10, a medir] | `radarbalcarce@gmail.com` (dueña). Colaboradores: `balcardev`, Andrés (`agerace`), Hernán (`hernanaccomo-pixel`) | — | Se pierde el código, los datos y el panel del celular. **Hoy el único historial completo está ahí** (sección 5) |
| 10 | **GitHub Secrets** (claves guardadas) | Guardar claves sin que nadie las vea | Gratis | US$ 0 | — | — | Igual | Las claves, ver sección 6 | Sin ellas, cada servicio deja de andar |
| 11 | **Google Gemini** (AI Studio): tres claves | Redactar las notas (`GEMINI_API_KEY_REDACCION`), la lectura con IA y fotos (`…_CLASIFICACION`) y las voces de los videos (`…_REDES`) | **Gratis** desde el 29/09 [REPO] (pero ver la nota de abajo) | US$ 0 declarado | Redacción: 500 pedidos/día (el sistema se pone 450); lectura: 200 fichas/día; **voz: 10 audios por día** [REPO] | Texto: «429 sin cupo»; pasa a los respaldos (otra clave, Groq, OpenRouter). **Voz: la pieza no sale** (nunca con otra voz) | `radarbalcarce@gmail.com` | Las **dos voces propias vencen el 29/09/2027** [REPO] | Sin redacción: no hay notas nuevas con cuerpo. Sin voz: no hay videos |
| 12 | **Groq** | Respaldo de la lectura con IA, comparación de fotos, auditoría horaria y revisión del archivo | Gratis | US$ 0 [REPO] | 8.000 tokens por minuto (por eso no sirve para redactar) | Espera o pasa a OpenRouter | **[A COMPLETAR]**: el repositorio dice `radarbalcarce@gmail.com`, y el documento de claves pide confirmarlo en console.groq.com | — | La lectura sigue sólo con Gemini; la auditoría pierde un respaldo |
| 13 | **OpenRouter** | Último respaldo de lectura, redacción y control de imágenes, sólo con modelos gratis (`:free`) | Gratis (el código **se niega a pedir un modelo pago**) | US$ 0 [REPO] | **50 pedidos por día** en modelos gratis (20 por minuto); el sistema se pone **45 por día** [REPO] | Si alguna vez se compró crédito de US$ 10: 1.000 por día. Con saldo negativo da error 402 | `radarbalcarce@gmail.com` | — | Se pierde el último respaldo. No cambia nada si las otras IA andan |
| 14 | **Tavily** (búsqueda en internet) | Sólo la sección «Pistas» del panel del celular (4 pistas y 4 notas de pista medidas en 14 días) | Gratis | US$ 0 [REPO] | **1.000 créditos por mes**; una búsqueda a fondo gasta 2 [PÚBLICO, 15/10] | **US$ 0,008 por crédito** de más; el plan «Project» cuesta US$ 30 por 4.000 créditos | **[A COMPLETAR]** (no figura la cuenta) | — | Las pistas no se pueden investigar; el resto sigue |
| 15 | **Meta** (Facebook e Instagram, API Graph) | Publicar posteos, reels e historias, y leer estadísticas | Gratis | US$ 0 [REPO] | Límites propios de la API de Meta (**[A VALIDAR]**) | — | `radarbalcarce@gmail.com`; app «Radar Balcarce Publicador», usuario del sistema `publicador-radar`; página de Facebook «Radar Balcarce»; Instagram `@radarbalcarce` | El token `META_TOKEN` **no vence**, pero si se revoca o la cuenta se bloquea no sale ninguna red. (Ya pasó: Meta bloqueó la cuenta hacia el 24/09) | No hay redes. La web sigue |
| 16 | **Avisos por mail** (Worker vigilante + Email Routing de Cloudflare → Gmail) | Todos los avisos y los dos informes diarios (8:15 y 21:15) | Gratis | US$ 0 [REPO] | Hasta 30 mails por hora desde el Worker [REPO] | — | `radarbalcarce@gmail.com` | — | Nadie se entera de los problemas (sección 5) |
| 17 | **WhatsApp por CallMeBot** | Aviso de **respaldo** si el mail falla | Gratis | US$ 0 [REPO] | Se quedó **sin cupo hacia el 1/10**; hoy casi no cumple función | — | El teléfono que lo activó (`WHATSAPP_TELEFONO`) | — | Nada grave: es el respaldo del respaldo |
| 18 | **IndexNow / Bing** y **Google Search Console** | Avisar a los buscadores que hay notas nuevas y ver cómo nos indexan | Gratis | US$ 0 [REPO] | — | — | `radarbalcarce@gmail.com` (Search Console, propiedad de dominio) | — | Se indexa más lento. Hoy «nadie mira Search Console ni Bing» [REPO] |
| 19 | **Datos públicos**: dólar (DolarApi.com y Bluelytics), fútbol (ESPN, API no oficial), F1 (Jolpica), fotos libres (Wikimedia), agenda del municipio | Notas y secciones automáticas | Gratis, sin clave | US$ 0 [REPO] | Jolpica: 4 pedidos por segundo y 500 por hora, y avisan que lo van a bajar [REPO]. ESPN: **no oficial, puede cambiar o cortarse sin aviso** | — | Sin cuenta | — | Esa nota o ese dato no se arma; se muestra lo último guardado |
| 20 | **Open-Meteo** (clima) y **met.no** (respaldo) | El clima que se ve arriba de cada página y las notas del tiempo | Open-Meteo: gratis **sólo para uso no comercial**. met.no: **[A VALIDAR]** sus condiciones | US$ 0 hoy | Open-Meteo: **[A VALIDAR]** los pedidos diarios de la capa gratis (en su página de precios). Lo piden el servidor y **el navegador de cada lector** (cada lector le manda su IP) [REPO] | Si el sitio tiene publicidad, el uso deja de ser «no comercial»: **hay que contratar su plan pago** (precio **[A COMPLETAR]**, mirar open-meteo.com) o cambiar de fuente | Sin cuenta | — | Sin clima, el sitio usa met.no (sin sensación térmica) |
| 21 | **Tailscale** | Era para entrar al panel de la PC, que se retiró el 17/10 | Gratis | US$ 0 | — | — | `radarbalcarce@gmail.com` | — | Nada: **ya no lo usa nadie; dar de baja** |
| 22 | **Vercel** | Hosting anterior | Apagado | US$ 0 | — | — | `radarbalcarce@gmail.com` | — | Nada: **borrar el proyecto y su DNS** |
| 23 | **cron-job.org** | Reloj anterior (los 3 trabajos están **pausados**) | Gratis | US$ 0 | — | — | `radarbalcarce@gmail.com`; su token de GitHub es de `balcardev@gmail.com` | El token vence el **21/09/2027** (coincidencia con el dominio) | Nada: es el plan de rescate del reloj. Conviene **borrar la cuenta** cuando el reloj de Cloudflare lleve semanas estable |
| 24 | **Gmail** `radarbalcarce@gmail.com` | Cuenta madre de casi todo y destino de los avisos | Gratis | US$ 0 | — | — | Hernán y Andrés | — | Si se pierde esta cuenta se pierde el acceso a casi todo. **Activar la verificación en dos pasos** (pendiente P6 de `F-ESTADO-Y-PLAN-2-0.md`) |
| 25 | **Herramientas de trabajo con IA** (Claude Code y similares, con las que se programa y se mantiene el sistema) | No forman parte del sistema que corre solo, pero se usan para mantenerlo | Pago, fuera del repositorio | **[A COMPLETAR]** | — | — | Cada persona | — | Se puede seguir operando pero no cambiar el código con ayuda. Para presentar a financiadores, **sumarlo como costo de desarrollo** |
| 26 | **Pagefind, Next.js, ffmpeg, resvg** (programas libres que arman el buscador, el sitio y los videos) | Piezas del sistema | Gratis (código abierto) | US$ 0 | — | — | — | — | — |

**Dos cosas de la tabla que hay que mirar en las cuentas, porque el repositorio las deja dudosas:**

- **Google (fila 11).** El documento `docs/08-INFRAESTRUCTURA.md (claves de IA)` dice que en la cuenta de Google hay un proyecto «Default Gemini Project» con **facturación activa (Nivel 1 pago)** y una clave del 2/10 que no está cargada en GitHub, y que **no se sabe de qué proyecto sale cada una de las tres claves de Radar**. Eso significa que **la afirmación «las tres son gratis» está declarada, no comprobada**. Dónde mirar: Google Cloud Console → *Facturación* → *Informes* (muestra si hubo cargos, por proyecto) y Google AI Studio → *Claves de API* → *Uso*.
- **OpenRouter (fila 13).** Los documentos se contradicen: `08-INFRAESTRUCTURA.md` y el código dicen «no se compró crédito» (50 pedidos por día); `F-ESTADO-Y-PLAN-2-0.md` dice «con US$ 10 de crédito en la cuenta»; y `11-OPERACION.md` menciona una clave que ya está en la PC para trabajar con DeepSeek por OpenRouter (US$ 0,21 por millón de tokens de entrada y 0,42 de salida; «con US$ 10 alcanza para mucho»). Si esa clave comparte cuenta con el robot, **hay gasto real posible**. Dónde mirar: openrouter.ai → *Settings* → *Credits* y *Activity*.

---

## 3. Dónde ver el número real (para completar este documento)

Una persona con acceso mira estas pantallas y anota el mes **(yo no entré a ninguna)**:

| Qué | Cuenta | Pantalla |
|---|---|---|
| Factura mensual de Cloudflare (US$ 5 + extras si los hay) | `radarbalcarce@gmail.com` | dash.cloudflare.com → *Billing* → *Invoices*, y *Billing* → *Usage* |
| Minutos de armado del ciclo de facturación, del 11 al 10 (de 6.000) | Cloudflare | *Workers & Pages* → `radar-balcarce-motor` → *Builds*; el registro propio, en `GET /estado` del motor (`ciclo`) o `motor/minutos/AAAA-MM-DD.json` |
| Tamaño de los depósitos R2 | Cloudflare | *R2* → cada depósito (`radar-archivo`, `radar-piezas`, `radar-balcarce-respaldos`…) |
| Imágenes con IA (neuronas del día) | Cloudflare | *AI* → *Workers AI* → *Usage* |
| Dominio: precio y fecha de renovación | DonWeb | Mi cuenta → *Dominios* → *Facturación* |
| Minutos de GitHub Actions y si hay cobro | GitHub | *Settings* de la cuenta → *Billing and plans* → *Usage*, y *Budgets and alerts* |
| Gasto de Gemini (¿hay cargos?) y claves por proyecto | Google | console.cloud.google.com → *Facturación* → *Informes*; aistudio.google.com → *Claves de API* |
| Crédito y gasto de OpenRouter | OpenRouter | openrouter.ai → *Settings* → *Credits* y *Activity* |
| Uso de Groq | Groq | console.groq.com → *Usage* / *Billing* |
| Créditos de Tavily usados | Tavily | app.tavily.com → panel de uso |
| Uso de los cupos que cuenta el propio sistema (voz, IA) | Sin cuenta | Archivo `web/data/uso-ia.json` y el informe diario por mail |

---

## 4. Costo mensual hoy y si crece 5 veces

### 4.1 Hoy

| Concepto | Por mes | Fijo o variable |
|---|---|---|
| Cloudflare Workers Paid | **US$ 5** [REPO] | Fijo |
| Dominio (precio anual ÷ 12) | **[A COMPLETAR]** | Fijo |
| Todo lo demás (GitHub público, IA gratis, Meta, mail, datos públicos, R2 dentro de 10 GB, armado dentro de 6.000 min) | US$ 0 declarado | — |
| **Total conocido** | **US$ 5 + dominio ÷ 12** | **100 % fijo** |

Lo que **podría** estar sumando sin que el repositorio lo muestre: cargos de Google (fila 11), crédito de OpenRouter (fila 13), herramientas de trabajo (fila 25), y un plan de GitHub (**[A COMPLETAR]**: si la cuenta es Free o Pro; `ANALISIS.md` lo deja abierto).

### 4.2 Si el medio crece 5 veces

**Qué quiere decir «5 veces»:** cinco veces más producción del robot: unas **230 notas por día** en vez de ~46, y **cinco veces más videos con voz** (de ~14 a ~70 piezas por día), con cinco veces más archivos guardados. **Los lectores no suman costo** (es un sitio estático y hoy hay entre 6 y 11 lectores reales por día [REPO, 23/10], así que incluso 100 veces más tampoco movería la aguja en Cloudflare **[A VALIDAR con la página de precios de Pages]**).

| Concepto | Supuesto | Cuenta | Por mes a 5x | Fijo / variable |
|---|---|---|---|---|
| Workers Paid | Igual | — | US$ 5 | Fijo |
| **Armado de la web (Workers Builds)** | Con 5x notas, cada vuelta tarda más. El 23/10 el repositorio anota vueltas de **~14 minutos** al exportar 100 notas. Supuesto: 48 vueltas por día de 10 minutos | 48 × 10 × 30 = 14.400 min. Menos 6.000 incluidos = 8.400 × US$ 0,005 | **~US$ 42** **[A VALIDAR]** (si se acepta que la web se arme menos veces, baja; con vueltas de 5 min serían US$ 6) | Variable |
| **Voz de los videos** | Clave paga de Gemini (hoy sólo 10 audios/día gratis). El repositorio estima **US$ 3 a 4 por mes** para la producción actual [REPO, `F-ESTADO`, P11; el precio por audio no está escrito: **[A VALIDAR]**] | Lineal: × 5 | **~US$ 15 a 20** **[A VALIDAR]** | Variable |
| **Redacción con IA** | Hoy gratis (tope 450 pedidos por día). Con 230 notas por día, cada pedido de redacción manda ~7.300 tokens | ~230 × 7.300 ≈ 1,7 millones de tokens por día ≈ **50 millones por mes** de entrada, más lo que la IA escribe | **[A COMPLETAR]**: depende del precio de `gemini-flash-lite` en la tabla de Google. Con el tope actual de 450 pedidos por día **sigue entrando en lo gratis**, pero cualquier falla de cupo ya empieza a notarse. Probablemente haya que pasar a pago **[A VALIDAR]** | Variable |
| **Lectura con IA y control de imágenes** | Mismo caso | — | **[A COMPLETAR]** (Groq y OpenRouter gratis ya serían insuficientes: 8.000 tokens por minuto y 45 pedidos por día) | Variable |
| **Imágenes con IA** | Sube el tope de 20 diarias a, supongamos, 100 | Neuronas por imagen: **[A VALIDAR]** (no está en el repositorio). Pasado el cupo gratis: US$ 0,011 por 1.000 neuronas | **[A COMPLETAR]**, probablemente de pocos dólares | Variable |
| **R2** | Piezas: 0,75 GB/mes × 5 ≈ 3,75 GB/mes. Archivo y respaldos crecen también | Año 1: ~45 GB. (45 − 10) × US$ 0,015 | **~US$ 0,5 por mes al cabo del primer año** [cuenta propia sobre las tarifas del repositorio] | Variable, mínimo |
| **GitHub** | Sólo se mudó lo que corre solo. Lo que queda en GitHub (pruebas, panel del celular, pedido de voz de cada pieza) crece con las piezas | Hoy ~1.620–1.820 min de 2.000 en privado [REPO, estimado]. A 5x piezas se pasa. Cada minuto de más: US$ 0,008 | **~US$ 0 a 20** **[A VALIDAR]**, y **sólo si el repositorio pasa a privado**. Con tope de gasto en US$ 0 no se cobra: se frena | Variable |
| **Tavily** | Se mantienen las Pistas | 4–10 pistas por mes ≪ 1.000 créditos | US$ 0 | — |
| **Dominio y mail** | Igual | — | Igual | Fijo |
| **Open-Meteo (si se vende publicidad)** | Plan comercial | **[A COMPLETAR]** | **[A COMPLETAR]** | Fijo |
| **Total aproximado a 5x** | | | **US$ 15 a 70 por mes** (más lo que haya que completar) **[A VALIDAR]** | |

**Qué mueve la aguja:** la **voz** y el **armado de la web**. Lo demás (almacenamiento, mail, lectores, Meta) casi no.

---

## 5. Puntos de falla por límite: qué se agota primero

Ordenado de lo que está más cerca de agotarse a lo más lejano. Se indica qué hace el sistema solo y qué hace una persona.

| # | Límite | Cuánto hay | Qué pasa al agotarse | Qué hace el sistema | Qué hace una persona |
|---|---|---|---|---|---|
| 1 | **Voz de Gemini (clave gratis)** | **10 audios por día**. La producción prevé ~14 piezas por día; algunas se reutilizan [REPO] | **La pieza no sale** (nunca con otra voz, a propósito) | Prioriza las piezas (`PRIORIDAD`); avisa desde 8 audios usados (`AVISO_DESDE`) | Decidir la clave paga (US$ 3 a 4 por mes, **a validar**). **No correr «Piezas», «Auditar voz» ni «Crear voces» un día de redes** |
| 2 | **Minutos de armado de Cloudflare** | 6.000 por ciclo de facturación (del 11 al 10; regla 315). La vuelta de 4,5 min × 48 por día pide ~6.480; el 23/10 se observaron vueltas de 14 min [REPO] | El **presupuesto automático saltea vueltas**: la web puede quedar hasta 3 horas sin actualizarse a fin de mes | Nunca deja más de 3 horas sin vuelta; pide una si la última buena tiene 40 min o más | Medir esta semana (tarea C3) y decidir si se pagan ~US$ 6 por mes (`MOTOR_SIN_TOPE`). **24/10 (regla 312):** el registro de R2 ya suma el tiempo de cada paso y el vigilante avisa si el mes se proyecta por encima de 6.000; palancas escritas y apagadas: `TARJETAS_EN_R2`, `MOTOR_NOCHE_CADA_HORA` (`docs/etapa-10-operacion/MINUTOS-DE-WORKERS-BUILDS.md`). A 14 minutos por vuelta y 48 por día serían ~21.600 minutos (unos US$ 78 de excedente); la meta es 4 minutos o menos |
| 3 | **OpenRouter gratis** | 45 pedidos por día (50 reales) | Se pierde el último respaldo | Sigue sin él | Ignorar o comprar crédito (decisión) |
| 4 | **Groq gratis** | 8.000 tokens por minuto | Pasa al siguiente respaldo | Reintenta o usa OpenRouter | — |
| 5 | **Gemini texto (gratis)** | Redacción 450/día; lectura 200 fichas/día; fotos hasta 10 por corrida | Una nota con 3 fallos se descarta con motivo; crece «Esperando cuerpo»; aviso `pocos-cuerpos` | Usa las otras claves y los respaldos | Esperar al día siguiente o escribir el cuerpo a mano en el panel |
| 6 | **Workers AI (imágenes)** | 10.000 neuronas por día; el sistema se pone 20 imágenes por día | La nota sale con la placa en lugar de ilustración | Sigue | — |
| 7 | **Minutos de GitHub Actions** (sólo si el repositorio pasa a privado) | 2.000 por mes; estimado 1.620–1.820 | Con **tope de gasto en US$ 0**, los workflows se **frenan** (no se cobra); sin ese tope, US$ 0,008 por minuto | Nada | **Poner el tope de gasto en US$ 0 antes de pasar a privado** (pendiente P2) |
| 8 | **Tavily** | 1.000 créditos por mes | No se puede investigar una pista | El código tiene un tope por pista | — |
| 9 | **R2** | 10 GB | Cobro de US$ 0,015 por GB de más | — | El informe diario muestra el tamaño. Al ritmo de hoy se pasa recién al año |
| 10 | **Archivos de Pages y redirecciones** | 20.000 archivos por subida; 2.000 redirecciones (se escriben como mucho 1.950) | La subida falla / sobran direcciones | `TOPE_DE_NOTAS` y las notas viejas salen de R2 | — |
| 11 | **Tamaño del repositorio** | ~291 MB hoy; el informe avisa a ≥ 600 MB | GitHub se vuelve lento | Aviso | Correr «Compactar el historial» (pendiente P3) |
| 12 | **Open-Meteo y APIs sin contrato** (ESPN, Jolpica) | Sin garantía | Esa pieza deja de actualizarse | Muestra lo último guardado | Ver filas 19 y 20 |

**Los otros puntos de falla (no son un límite de plata, pero cortan todo):**

- **El reloj `radar-balcarce-reloj`.** Desde el 17/10 no hay horario de respaldo en GitHub. Si el token `RELOJ_GITHUB_TOKEN` es rechazado o el Worker se rompe, no corre nada. Sólo avisa por mail el vigilante de Cloudflare. **Conviene que las dos personas sepan que es lo primero que se mira.**
- **La cuenta `radarbalcarce@gmail.com`.** Todo cuelga de ella. Sin verificación en dos pasos, una cuenta robada deja sin medio de un día para el otro.
- **GitHub.** El único historial completo del código y los datos está ahí (más los respaldos semanales en R2 y los artefactos de 90 días). **No hay copia en otro proveedor** (GitLab no está configurado; faltan `GITLAB_TOKEN` y `GITLAB_REPO`).
- **Que nadie mire los mails.** Si Hernán y Andrés no están tres días, el sistema sigue publicando, pero una clave rechazada o una nota con problema esperan.

---

## 6. Quién tiene que hacer qué y cuándo

### 6.1 Calendario de vencimientos y renovaciones

| Fecha | Qué | Quién | Qué hacer | Cómo se entera |
|---|---|---|---|---|
| **Todos los meses** | Pago de Cloudflare Workers Paid (US$ 5) | Quien tenga la tarjeta cargada (**[A COMPLETAR]**) | Que la tarjeta esté vigente | Mail de Cloudflare |
| **Todos los días (ya automático)** | Informes 8:15 y 21:15 | Hernán y Andrés | Leerlos: ahí aparece el cupo de voz y los avisos | Mail |
| **Cada semana** | Mirar estadística de selección, Search Console y Bing | Hernán / Andrés | Anotar qué nota entra y qué no; revisar si Google indexa | — |
| **Antes del 21/09/2027** | **Renovar el dominio** `radarbalcarce.com` | **[A COMPLETAR]** quién es el titular en DonWeb | Pagar la renovación (idealmente con aviso del calendario a 60 y 30 días) | El vigilante avisa 30 días antes |
| **Antes del 29/09/2027** | **Las dos voces propias de Gemini vencen** (locutora y locutor) | Quien opere con Claude | Recrearlas con «Crear voces» y cambiar los identificadores en `CRITERIO-REDES.md` § 6. **Antes de cambiar de clave, guardar la referencia de las voces actuales** (2 audios; `docs/redes/VOCES-NUEVAS.md`) | El vigilante, 30 días antes, con la fecha que da Google |
| **21/09/2027** | Vence el token de GitHub de cron-job.org (pausado) | — | Si no se vuelve a usar, **borrar la cuenta**; si se usa, crear otro | Nadie (se sacó el aviso) |
| **Cada 90 días** | Medidas de imágenes de las redes (`redes/formatos.mjs`) | Quien opere | Volver a verificarlas | La auditoría semanal |
| **Un año después de crearla** | Llave del panel del celular de cada persona | Cada persona | Crear otra y pegarla en el celular | El panel dice «La llave no anda» |
| **No vencen** | `META_TOKEN`, `RELOJ_GITHUB_TOKEN` | — | Si se filtra o se borra, regenerarlo (al regenerar `META_TOKEN`, tildar todos los permisos de ahora más `read_insights` e `instagram_manage_insights`) | — |

### 6.2 Pendientes de una persona que tocan plata, accesos o riesgo

(La lista completa es `docs/auditoria-2-0/F-ESTADO-Y-PLAN-2-0.md`, 1.4. Acá sólo lo que importa para costos y continuidad.)

| # | Qué | Dónde | Por qué importa |
|---|---|---|---|
| P1 | Apagar los 7 workflows viejos de GitHub (no apagar «Revisar el archivo», «Piezas de redes», «Pruebas», «Respaldo», los Workers) | GitHub → Actions | Condición para pasar a privado; evita que el robot corra doble |
| P2 | **Tope de gasto de Actions en US$ 0** | GitHub → Settings → Billing → Budgets | Para que GitHub **nunca** cobre |
| P6 | **Verificación en dos pasos** en Google, Meta, Instagram, GitHub, Cloudflare y DonWeb | Cada cuenta | El mayor riesgo real |
| P11 | **Clave paga de Gemini para las voces**, **con límite de gasto en Google** | AI Studio / Google Cloud | Sin ella, el cupo es 10 audios por día. Antes, guardar la referencia de las voces |
| P12 | Ordenar los proyectos de Google (la facturación está en uno que Radar no usa) | `docs/08-INFRAESTRUCTURA.md (claves de IA)` | Evita que una clave «gratis» termine cobrando |
| P14 | Borrar lo que ya no se usa: Worker `radar-balcarce-sondeo-fuentes`, secreto `SONDEO_TOKEN`, trabajos de cron-job.org, proyecto de Vercel, Tailscale | Cloudflare / GitHub / cron-job.org / Vercel / Tailscale | Menos superficie de ataque y menos cuentas |
| P15 | **Respaldo fuera de GitHub** (GitLab, Google Drive o la PC) | `docs/propuestas/PASOS-PARA-USTEDES.md` | Hoy hay «uno y medio» de los cuatro lugares que se pidieron |
| P17 | Documento **«si mañana falta uno de nosotros»**: quién tiene qué cuenta, cómo recuperarla, a quién llamar. Guardarlo **fuera del repositorio** | — | Sin esto, la continuidad depende de dos personas |
| P20 | Renovar dominio y voces | DonWeb / AI Studio | Ver 6.1 |
| (nuevo) | Anotar **a nombre de quién** está cada cuenta (DonWeb, Groq, Tavily, Cloudflare, tarjetas) | Este documento, columna «Cuenta» | Hoy es **[A COMPLETAR]** en varias filas |
| (nuevo) | Confirmar con Open-Meteo si el uso con publicidad exige plan comercial | open-meteo.com | Evitar un reclamo de licencia |

---

## 7. Qué se podría cortar o bajar

| Qué | Ahorro | Riesgo | Recomendación |
|---|---|---|---|
| **Tailscale, Vercel, cron-job.org** | US$ 0 (son gratis), pero sacan superficie de ataque | Ninguno (ya no se usan) | **Dar de baja ya.** Conservar cron-job.org sólo hasta que el reloj de Cloudflare lleve semanas estable |
| **WhatsApp por CallMeBot** | US$ 0 | Es el respaldo del mail | Si se crea el canal de Telegram, reemplazarlo; no urge |
| **Tavily** | US$ 0 hoy | Se pierden las Pistas con búsqueda | Mantener, uso mínimo |
| **Revisión del archivo cada 2 horas** (hoy pausada con `REVISION_DEL_ARCHIVO=no`) | Pedidos a Groq/Gemini y minutos de Actions | Notas viejas sin revisar con el criterio de hoy | Mantener en pausa hasta cerrar las reglas de fotos y selección |
| **Armar la web cada 30 minutos en lugar de cada ~38** | Evita ~US$ 6 por mes de minutos de más | Noticias que tardan unos minutos más | Esperar la medición de esta semana |
| **Voz: menos piezas con voz** | Es lo que decide el costo de la clave paga | Se pierde lo que rinde en Facebook: el clima de la mañana promedia ~5.100 reproducciones (máximo ~25.000), el de la noche 370, el repaso de la noche 15 [REPO, 23/10] | **Bajar primero las piezas que casi no rinden** (repaso de la noche, farmacia, efeméride), no el clima de la mañana |
| **Posteos de notas en Facebook** | No ahorra plata (API gratis) | Rinden poco: 5 vistas y 0,1 clics en promedio [REPO] | Decisión editorial, no de costo; se acordó no tocarlo con la cuenta tan nueva |
| **Plan Workers Paid (US$ 5)** | US$ 5 | Es la base de todo el sistema nuevo | **No se puede cortar**: todo se mudó ahí |
| **Dominio** | — | Se cae todo | Nunca |

---

## 8. Resumen para financiación

**En una oración:** Radar Balcarce es un medio digital que se produce solo, con un costo operativo conocido de **unos US$ 5 por mes más el dominio**, porque aprovecha planes gratuitos de infraestructura y de inteligencia artificial; lo que falta es **dinero para sostenerlo cuando crezca** y **personas que lo cuiden**.

### 8.1 Costo operativo mensual total

| | Mensual | Observación |
|---|---|---|
| Infraestructura fija (Cloudflare) | **US$ 5** [REPO] | Es lo único que se paga cada mes |
| Dominio | **[A COMPLETAR]** ÷ 12 | Se paga una vez al año, vence 21/09/2027 |
| **Total conocido** | **~US$ 5 + dominio ÷ 12** | Todo fijo |
| Parte variable hoy | **US$ 0** | Se mantiene sólo porque todo usa cupos gratis |
| A sumar al presupuesto «honesto» | Herramientas de trabajo con IA y horas de personas | **[A COMPLETAR]**: no están en el repositorio y son, de lejos, el costo más grande de un medio |

**Fijo vs variable.** Hoy el 100 % es fijo. A medida que el medio crece, lo variable aparece en tres lugares: **voz**, **armado de la web** y **redacción/lectura con IA** (cuando los cupos gratis se queden cortos).

### 8.2 Qué se escalaría con plata y qué impacto tiene

| Inversión | Costo estimado | Qué cambia para el lector |
|---|---|---|
| **Voz paga de Gemini** | ~US$ 3 a 4 por mes para la producción actual [REPO], **a validar** | Hoy el límite son 10 audios por día. Con plata: todas las piezas con voz propia sin cortes, más piezas por día, y voces nuevas (hoy son dos, vencen el 29/09/2027). Los videos son lo único que hoy tiene alcance real (clima de la mañana, hasta ~25.000 reproducciones) |
| **Más IA para redactar y verificar** | **[A COMPLETAR]** según tabla de Google | Más notas por día sin dejar «esperando cuerpo»; menos caídas cuando se acaba el cupo gratis; poder pasar el robot a un plan de pago **sin uso de los datos para entrenar** (`auditoria-opus`) |
| **Imágenes propias** (fotos) | Pocos dólares en Workers AI **[A VALIDAR]**; más: una persona que saque fotos en Balcarce | Hoy muchas notas de escuela y deporte salen sin foto; la foto propia de una fuente de Balcarce depende de la variable `FOTOS_MENORES_OFICIALES` |
| **Armado de la web a ritmo pleno** | ~US$ 6 por mes (`MOTOR_SIN_TOPE`) | La web se actualiza siempre cada 30 minutos |
| **Plan comercial de Open-Meteo (si hay publicidad)** | **[A COMPLETAR]** | Seguir mostrando el clima sin riesgo de licencia |
| **GitHub privado** | Hoy US$ 0 si se cumple la estimación de minutos; se puede pagar un plan | Cierra la exposición pública del código y de los datos |
| **Respaldo externo** | ~US$ 0 a pocos dólares (otro proveedor o disco) | Que se pueda reconstruir todo si se pierde la cuenta de GitHub |
| **Personal** (editor/a de Balcarce, quien mire redes y mensajes) | **[A COMPLETAR]** | Es lo que más mueve la calidad: hoy nadie contesta comentarios ni mensajes, ni mira Search Console; Política y Policiales esperan a una persona; Instagram tiene 7 seguidores y Facebook 53 (23/10) |

**Qué dice el repositorio de resultados reales (para no inflar):** lectores reales por día, 6 a 11 en Argentina desde el 19/10 (lo demás son robots); Facebook trae la mayoría de los reales; los posteos de notas rinden poco (5 vistas) y los videos rinden mucho más. Es una cuenta que **recién arranca**.

---

## 9. Glosario (diez líneas)

| Palabra | Qué es, con un ejemplo de todos los días |
|---|---|
| **Worker** | Un programa chico que Cloudflare tiene prendido por nosotros. Como el **portero eléctrico**: no tiene casa propia, pero cuando alguien toca el timbre atiende. |
| **Reloj (cron)** | Un despertador. El Worker `radar-balcarce-reloj` suena cada media hora y le dice al robot «a trabajar». |
| **R2** | Un **depósito de cajas en la nube**. Se paga por la cantidad de cajas que guardás (después de los primeros 10 GB), pero **sacar lo guardado no cuesta**. |
| **GitHub Actions** | La **fábrica de alquiler**: un galpón con máquinas que se prenden unos minutos cuando hace falta. Se mide en minutos de máquina. |
| **Repositorio público / privado** | Un cuaderno **en el escaparate** (cualquiera lo lee y la fábrica es gratis) o **guardado en un cajón** (nadie lo ve, pero la fábrica cobra el minuto después de los primeros 2.000). |
| **API** | El **mostrador de un negocio**: una ventanilla por donde un programa le pide algo a otro (el clima, la cotización, publicar en Facebook) sin entrar al local. |
| **Token / clave** | La **llave de un departamento**: da permiso a un programa para usar un servicio. Se trata como una contraseña y nunca se pega en un chat. |
| **Cupo** | El **saldo de la tarjeta de colectivo**: lo que el servicio te deja usar por día o por mes gratis. Cuando se acaba, esperás o pagás. |
| **Dominio / DNS** | El **nombre y la dirección de la casa** (`radarbalcarce.com`). Si el nombre vence, la casa existe pero nadie la encuentra. |
| **Estático** | Un diario **ya impreso**: se arma una vez y se reparte igual a todos. Por eso, tener más lectores casi no cuesta. |

---

## 10. Qué no pude comprobar (para que no se tome por firme)

- **Ninguna factura ni cuenta** (no tengo acceso, por pedido). El único número firme del repositorio es US$ 5 de Cloudflare.
- **El precio del dominio**, quién es el titular en DonWeb y con qué tarjeta se paga Cloudflare.
- **Si Google está cobrando algo** (proyecto con facturación activa) y de qué proyecto sale cada clave de Gemini.
- **El crédito de OpenRouter** (los documentos se contradicen).
- **Los minutos reales de armado de Cloudflare** y de GitHub después de la mudanza: son estimaciones del 18/10; la medición está pendiente (tarea C3 y primera semana).
- **Los precios por audio y por token de Gemini**, **las neuronas por imagen de Workers AI**, **los cupos de KV**, **los términos de met.no, ESPN y Jolpica**, y **el precio comercial de Open-Meteo**: no están en el repositorio.
- **La política vigente de Cloudflare Pages para tráfico alto**: asumo, por lo que dicen los documentos, que no cobra por visita; hay que confirmarlo en su página de precios antes de prometerlo a un financiador.
- **Los cálculos de la sección 4.2** son aritmética sobre números del repositorio con supuestos propios, no una proyección contratada.

*Fuentes dentro del repositorio:* `CLAUDE.md`; `docs/08-INFRAESTRUCTURA.md` («Lo que cuesta», «Las claves de IA», «Vencimientos»); `docs/11-OPERACION.md`; `docs/historico/etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md`, `PLAN-DE-CAMBIO.md`, `ANALISIS.md`; `docs/auditoria-2-0/F-ESTADO-Y-PLAN-2-0.md`, `09-CLAVES-DE-IA-ORDEN.md`, `K-DATOS-E-INFOGRAFIAS-POR-TEMA.md`; `docs/redes/ARCHIVO-DE-PIEZAS.md`, `VOCES-NUEVAS.md`; `docs/TRASPASO.md`; `POLITICA-PRIVACIDAD.md`; `reels/claves.mjs`; `reels/openrouter.mjs`; `reels/cupo-voz.mjs`; `infra/*/wrangler.toml`.
