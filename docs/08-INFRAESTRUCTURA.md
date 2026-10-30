# 08 · Infraestructura: qué corre dónde

*Actualizado el 24/10/2026: **la mudanza a Cloudflare está HECHA desde el 22 y 23/10** (reglas 230 a 235; el estado y lo que falta, en `docs/TRASPASO.md` y `PENDIENTES.md`): el motor corre en Workers Builds, las tareas chicas en un Worker, el video en el repositorio público de render y el reloj los pide según la variable `NUBE`; los workflows viejos de GitHub quedan de vuelta atrás y se apagan a mano. Lo que sigue de esta línea es del 17/10 (una sola compilación por vuelta, el reloj que dispara cada cosa sólo cuando hace falta, la limpieza de workflows y Workers y el tope de las redirecciones: reglas 189 a 191). Antes, el 16/10 (revisado contra los 36 `.yml`, los Workers de `infra/` y los
nombres de secretos y variables cargados en GitHub ese día; el 15/10 el repositorio se mudó a
`radarbalcarce/radar-balcarce` y el reloj pasó a Cloudflare). Si algo de acá no coincide con los `.yml` o con el
código, mandan ellos.* Los secretos figuran **sólo por nombre**: sus valores no
se escriben en ningún documento ni se pegan en un chat. Qué se publica en las
redes: [`07-REDES.md`](07-REDES.md); el panel del celular: [`09-PANEL.md`](09-PANEL.md);
qué hacer cuando algo falla: [`11-OPERACION.md`](11-OPERACION.md); cómo se arma
la web: `06-WEB`.

## En una frase

Todo lo automático corre con la PC apagada. **Desde el 23/10 el grueso corre en Cloudflare** (el motor en Workers Builds, la vigilancia, el informe, las pistas, las ilustraciones y las redes en el Worker `radar-balcarce-tareas`, el video en el repositorio público de render) y GitHub Actions queda para lo que no se mudó (pruebas, respaldo, revisión del archivo, despliegues) y de vuelta atrás: la variable `NUBE` del reloj dice qué trabajo va adónde. Un
reloj propio (un programa chico de Cloudflare, el Worker `radar-balcarce-reloj`) lo
despierta cada media hora; el motor busca las
noticias, escribe con IA (Gemini, con Groq de respaldo en la lectura y Mistral, gratis, de último respaldo), arma la
web una sola vez y la sube a Cloudflare Pages, publica en Facebook e Instagram con la API de
Meta, y dos vigilantes revisan y avisan **por mail** (WhatsApp quedó de respaldo):
el de Cloudflare, cada media hora, lo urgente (la web y "Actualizar la web"); el de
GitHub ("Vigilancia"), cada 3 horas, lo demás (redes, claves, voces, contenido, estadísticas). El panel del celular habla directo con
GitHub. Se pagan el dominio y el plan Workers Paid de Cloudflare (US$ 5 por mes).

**Tres palabras.** Un **workflow** es una tarea automática de GitHub (pestaña
**Actions**); cada vez que corre deja una **corrida** en verde (bien), rojo
(falló) o con un aviso amarillo (terminó bien, pero dejó algo para mirar). Un
**secreto** es una clave guardada en GitHub que los workflows usan sin que
nadie la vea; una **variable**, lo mismo pero a la vista (la que importa es
`REDES_ACTIVAS`, el interruptor de las redes). Un **token** (o llave) le da
permiso a un programa en otro servicio: se trata como una contraseña.

## El mapa

```
                         Reloj de Cloudflare  (Worker radar-balcarce-reloj, desde el 15/10/2026)
                         │  cada 30 min (:00 y :30): "Actualizar la web"
                         │  cada 3 horas (0, 3… 21; reintento 9:30, 21:30 y 0:30): "Vigilancia"
                         │  :05, :35 y :45, de 7 a 23: "Redes"
                         │  :41, de 7 a 23: "Auditoría IA" · :23 cada 3 horas: "Pistas"
                         │  8:15 y 21:15 (otra vez a las 8:30 y 21:30): "Informe diario"
                         │  cada 2 horas, a los :20, de 7:20 a 23:20: "Ilustrar notas sin foto"
                         │  cada 2 horas, a los :12, día y noche (desde el 22/10/2026): "Revisar el archivo"
                         ▼
GitHub Actions (repo radarbalcarce/radar-balcarce, público, cuenta radarbalcarce@gmail.com)
  ├─ Actualizar la web ── compila UNA vez, guarda en main ──▶ Cloudflare Pages ──▶ radarbalcarce.com
  │                                (archiva en R2 lo que sale del sitio, sube web/out
  │                                 con wrangler, avisa a Bing; regla 189)
  ├─ Redes ───────────▶ Meta (página de Facebook + @radarbalcarce)
  ├─ Vigilancia ──────▶ mail (Worker vigilante) y, de respaldo, WhatsApp (CallMeBot)
  ├─ Informe diario ──▶ mail a radarbalcarce@gmail.com (8:15 y 21:15)
  ├─ Auditoría IA y Pistas (por el reloj), Auditoría (lunes 9:00), Respaldo (domingos),
  │  Pruebas (con cada cambio de código y los lunes)
  ├─ Panel del celular (lo dispara el celular: la IA escribe, una pista, una foto)
  └─ A mano: Cloudflare Pages (rescate), Piezas, Crear voces, Auditar voz, Ver Facebook,
     los "Probar…", los que suben Workers, el archivo permanente…

Workers de Cloudflare (cuenta radarbalcarce@gmail.com, plan Workers Paid):
  reloj (el despertador), vigilante (mira desde afuera y manda los mails),
  imágenes (ilustraciones con Workers AI), archivo (archivo permanente, sin ruta todavía)

  IA: Gemini (Google AI Studio, cuenta radarbalcarce@gmail.com), Groq, Mistral (último respaldo gratis de texto) y Workers AI (imágenes)

Panel del celular (radarbalcarce.com/panel/) ── llave de GitHub ──▶ API de GitHub
   lee web/data/, escribe sus decisiones y correcciones, dispara
   "Panel del celular", "Pistas" y "Actualizar la web"
```

El panel de la PC (puerto 4321) se retiró el 17/10/2026: nunca se usó; queda en el
historial de git.

## El recorrido, paso a paso (una media hora cualquiera)

1. **:00 — el reloj de Cloudflare** le pide a la API de GitHub que corra
   "Actualizar la web" (y, cada 3 horas, "Vigilancia"), con un token propio
   ("Vencimientos"). Desde el 17/10 ni "Actualizar" ni "Vigilancia" ni "Redes"
   tienen horario propio de GitHub: llegó a dejar cinco horas entre dos corridas
   y, cuando sí andaba, duplicaba las del reloj.
2. **Actualizar la web** corre el **núcleo legal de las pruebas**
   (`npm run test:nucleo`: la lista de `pruebas/nucleo-legal.txt`, unos
   segundos: semáforo, verificador, cola de las personas, retiradas y
   correcciones con motivo, cuerpo mínimo) y, si pasa, busca noticias, las
   cruza, las lee y las escribe con IA, arma los datos (también la lista
   cifrada para el panel del celular), compila el sitio **una sola vez**, revisa el SEO,
   commitea `web/data/` y **sube lo compilado** (paso 3). **Si el núcleo falla, no sigue: la web queda como
   estaba y sale un aviso por mail.** Las 2.000 pruebas enteras (`npm test`)
   ya no corren en cada vuelta desde el 15/10: corren en el workflow "Pruebas",
   con cada cambio de código y los lunes (cada paso, en `02-INGESTA` a `06-WEB`).
3. **En la misma corrida, después de guardar** (desde el 17/10, regla 189; antes
   lo hacía "Cloudflare Pages" compilando todo otra vez): si mientras se armaba
   entró a `main` algo que el sitio lee (una retirada o una corrección del celular,
   el libro de redes, código), **vuelve a compilar** con eso (`web/scripts/recompilar.mjs`;
   si sólo entró la vigilancia, las estadísticas o documentos, no); guarda en el
   archivo permanente de R2 las notas que están por salir del sitio, sube `web/out`
   y le avisa a Bing (IndexNow). Si no compiló o no se pudo guardar en `main`, no
   sube nada. La nota se ve unos 2 minutos y medio antes que con la compilación doble.
4. **A los :05, :35 y :45, de 7 a 23**, el reloj despierta a **Redes**: Facebook y las
   piezas que tocan (`07-REDES`). Ya no arranca además al terminar cada "Actualizar".
5. **Vigilancia** (cada 3 horas) mira la web publicada, las corridas, el libro de las redes,
   el contrato del día y las claves de IA, y manda **un solo aviso** si hay
   algo para decir: por mail, a través del Worker vigilante, y por WhatsApp
   sólo si el mail no salió.
6. Cada workflow commitea en `main` con el usuario "Radar Balcarce" y el correo
   noreply de GitHub de la cuenta (no cambiarlo: `CLAUDE.md`).

Aparte, lo que decide una persona en el panel del celular se escribe en el
repositorio con su llave de GitHub, y "Escribir con IA" dispara "Panel del
celular", que tarda un minuto (`09-PANEL`).

## Los treinta workflows (y dos de la mudanza)

(Son los 30 archivos de `.github/workflows/` al 17/10/2026; el 18/10 se sumaron «Piezas de redes» y «Desplegar Workers de Cloudflare», que no corren solos. Ese día se borraron seis que
no se usaban, con sus scripts: Prueba de WhatsApp, Probar imágenes con Workers AI
(flux), Probar imagen desde la nota, Sondeo de fuentes desde Cloudflare (con su Worker
`infra/sondeo-fuentes/`), Auditar redes y Fotos a R2 (nunca corrió). El 15/10 se borraron
cuatro de prueba suelta que ya no se usaban: Prueba de estadísticas, Prueba de
Gemini (`prueba-gemini.yml`), Sondear búsqueda y Sondear Groq; el historial de git
los guarda. Entre el 8 y el 16/10 se fueron sumando los del respaldo, el archivo
permanente, las ilustraciones, el informe diario, los Workers, las pruebas y
varios "Probar…".
Los que sólo corren a mano y no escriben nada en el repositorio están marcados
"de prueba" o "subir un Worker".)

| Workflow (archivo) | Cuándo corre | Qué corre | Secretos y variables | Qué commitea | Tope |
|---|---|---|---|---|---|
| **Actualizar la web** (`actualizar.yml`) | El reloj de Cloudflare a los :00 y :30 (sin `schedule` propio desde el 16/10: duplicaba las corridas); a mano; "Actualizar la web ahora" del celular | `npm ci` (raíz y `web/`), **el núcleo legal** (`npm run test:nucleo`; si falla, avisa por mail y corta), la caché `.cache` (la memoria de 36 horas del cruce y las notas enteras para el celular), `node web/scripts/generar-datos.mjs`, `npm run build` con `SITIO` y `FOTOS_BASE`, `node web/scripts/revisar-seo.mjs`, el commit; **y desde el 17/10 la subida** (regla 189): `web/scripts/recompilar.mjs` (¿entró algo que el sitio lee mientras se armaba? entonces `npm run build` otra vez), el archivo R2 (`archivar-a-r2.mjs`, con su aviso si falla), `npx wrangler@4.139.0 pages deploy out --branch=main` y `redes/indexnow.mjs` | Las cuatro claves de IA; `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; `VIGILANTE_TOKEN` y `WHATSAPP_*` (los avisos del núcleo y del archivo); variables `REDES_ACTIVAS`, `R2_ARCHIVO`, `TOPE_DE_NOTAS`, `FOTOS_BASE`, `FOTOS_MENORES_OFICIALES` (y `SECCIONES_NUEVAS`, que el código ya no lee desde el 17/10: Educación, Salud y Ciencia están siempre; se puede borrar de GitHub y sacar de `actualizar.yml` y `cloudflare-deploy.yml`) y la opcional `CLOUDFLARE_PROJECT` | En `web/data/`: `portada`, `archivo`, `agenda`, `intentos-ia`, `dolar-historia`, `clima-historia`, `f1`, `futbol`, `fichas`, `notas-por-dia`, `uso-ia`, `banco-fotos`, `esperando-cuerpo`, `vistas`, `retiradas`, `celular-pendientes`, `celular-estado` y `fusionadas` (`.json`) y la carpeta `web/data/historico/`; y `web/public/fotos-notas/` y `web/public/escudos/`. Mensaje "Datos de la portada · dd/mm hh:mm" | 30 min (el archivo, 8) |
| **Pruebas** (`pruebas.yml`) | Cada `push` a `main` que toque código (no los commits del robot en `web/data/`, fotos y escudos), cada pull request, lunes 6:17 UTC (3:17 en Balcarce); a mano | `npm ci` (raíz y `web/`) y `npm test`, las 2.000 pruebas. Si fallan, GitHub avisa por mail a quien hizo el cambio; **no frena la web** | Ninguno | Nada | 15 min |
| **Cloudflare Pages** (`cloudflare-deploy.yml`) | **Sólo a mano, de rescate** (desde el 17/10: lo de cada media hora lo sube "Actualizar la web"). Sirve para volver a subir `main` tal como está sin buscar noticias | `npm ci` y `npm run build` en `web/`; el archivo R2 (igual que en la vuelta; si falla, avisa por mail); `npx wrangler@4.139.0 pages deploy out --branch=main`; `redes/indexnow.mjs` | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; variable opcional `CLOUDFLARE_PROJECT` (no está cargada: usa `radar-balcarce`); para el archivo, variables `R2_ARCHIVO` y `TOPE_DE_NOTAS` y secretos `VIGILANTE_TOKEN` y `WHATSAPP_*` (el aviso) | Nada | 25 min (el archivo, 8) |
| **Archivo permanente (staging)** (`archivo-staging.yml`) | A mano | Pruebas, depósito `radar-archivo-staging`, Worker de ensayo `radar-balcarce-archivo-staging` (workers.dev) y, si se pide, una muestra de notas | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Nada | 40 min |
| **Archivo permanente (producción)** (`archivo-produccion.yml`) | A mano | *sacar_ruta*: saca la ruta `radarbalcarce.com/nota/*` (vuelta atrás). *quitar_ids*: saca ya esas notas del depósito. Lo normal: crea el depósito privado `radar-archivo`, sube el Worker `radar-balcarce-archivo` sin ruta (workers.dev), sube todas las notas del sitio, lo comprueba y, sólo con *activar_ruta*, pone la ruta y comprueba el sitio (si no da, la saca sola). Guía: `docs/salud-tecnica/ARCHIVO-PERMANENTE-IMPLEMENTACION.md`. **Corrió una vez, el 16/10 (carga inicial, sin poner la ruta)** | `CLOUDFLARE_API_TOKEN` (más «Zone → Workers Routes: Edit» y «Zone: Read» para la ruta), `CLOUDFLARE_ACCOUNT_ID`; variables opcionales `CLOUDFLARE_ZONE_ID`, `R2_RESPALDOS`, `R2_FOTOS` (sólo para negarse a escribir ahí) | Nada | 80 min |
| **Fotos a R2 (migración)** (`fotos-a-r2.yml`) | Sólo a mano (regla 316): `modo` (`simulacro`, `mirar`, `subir`, `subir-y-quitar`) y `max` | `scripts/migrar-fotos-a-r2.mjs`: pasa a R2 las fotos de `web/public/fotos-notas/`. El simulacro no usa la red, `mirar` sólo lee R2, `subir` sólo agrega (no pisa, no saca nada de git) y `subir-y-quitar` además las saca de git con un commit; exige `FOTOS_EN_R2` = «Si». Paso a paso: `docs/etapa-10-operacion/FOTOS-EN-R2.md` | Secretos `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY` (con escritura sobre `radar-archivo`); variables `R2_ARCHIVO` y `FOTOS_EN_R2` | Sólo con `subir-y-quitar`: «Fotos de las notas a R2 · N fotos» | 30 min |
| **Redes** (`redes.yml`) | El reloj de Cloudflare (acción `reloj`) a los :05, :35 y :45, **de 7 a 23 de Balcarce** (desde el 17/10; antes las 24 horas y, además, al terminar cada "Actualizar la web"); a mano: `reloj`, `verificar` o `facebook` | `redes/publicar.mjs --facebook`; `redes/reloj.mjs`; si toca: `npm ci`, `reels/plan.mjs --generar --solo=…`, `redes/publicar.mjs --piezas`; `redes/publicar.mjs --enlaces` | `META_TOKEN`, `GEMINI_API_KEY_REDES`; variable `REDES_ACTIVAS` | `web/data/redes.json` ("Redes: libro de publicaciones · …"); los videos quedan 3 días como artefacto; si hay `R2_PIEZAS`, al final (con `continue-on-error`) `redes/archivar-piezas.mjs` los copia a R2 para siempre | 25 min |
| **Piezas** (`piezas.yml`) | Sólo a mano: `solo` (nombres separados por coma; **vacío no arma nada**), `todas` (armar todas las del día, a propósito), `publicar` (sí/no), `destino` (ambas, instagram, facebook) | `npm ci`, `reels/plan.mjs --generar [--solo=…]`; si `publicar`: `redes/publicar.mjs --piezas --sin-horario --destino=…` | `GEMINI_API_KEY_REDES`, `META_TOKEN`; `REDES_ACTIVAS` | `web/data/redes.json` si publicó; artefacto "piezas" 7 días (mp4, mp3, png, manifiesto); si hay `R2_PIEZAS`, al final los copia a R2 (`continue-on-error`) | 30 min |
| **Panel del celular** (`panel.yml`) | Lo dispara el panel del celular con la llave de quien lo usa: `accion` (`escribir`, `pista`, `nota-pista` o `foto`), `id`, `pedido` (opcional; o el texto de la pista; queda a la vista), `credito` (sólo para `foto`), `marca` (para que el celular encuentre su corrida) | Trae la caché `.cache` (`celular-notas.json`); con `escribir`, `pista` o `nota-pista` corre `node panel/celular.mjs <accion> --id=… --pedido=…`; con `foto`, `node web/scripts/foto-manual.mjs` | `GEMINI_API_KEY_REDACCION`, `GEMINI_API_KEY_REDES`, `GEMINI_API_KEY_CLASIFICACION`, `TAVILY_API_KEY` (la nota de una pista) | `web/data/celular-borradores.json` (cifrado), `pistas.json`, `fotos-manuales.json` y `web/public/fotos-notas/` | 8 min |
| **Vigilancia** (`vigilancia.yml`) | El reloj de Cloudflare **cada 3 horas** (0, 3, 6, 9, 12, 15, 18 y 21 de Balcarce) y otra vez a las 9:30, 21:30 y 0:30 (las estadísticas de las 9 y las 21 y el cierre del día no se pierden si un pedido no llega); sin `schedule` propio desde el 17/10; a mano: `vigilar`, `probar-resumen`, `probar-cierre` | `node redes/vigilar.mjs` | `VIGILANTE_TOKEN` (los avisos por mail), `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY` (respaldo), `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ANALYTICS_TOKEN`, `CLOUDFLARE_API_TOKEN`, `META_TOKEN`, las cuatro claves de IA (sólo para preguntar si andan), `GITHUB_TOKEN` (automático); variables `REDES_ACTIVAS` y `R2_ARCHIVO` | `web/data/vigilancia.json`, `web/data/estadisticas.json` y `estadisticas-piezas.json` (no en los modos de prueba) | 10 min |
| **Informe diario** (`informe-diario.yml`) | El reloj de Cloudflare a las 8:15 y 21:15 de Balcarce y, por si ése no despertó, otra vez a las 8:30 y 21:30 (`momento`: `manana` o `noche`; el Worker vigilante no repite el mail); respaldo `schedule` a las 8:45 y 21:45; a mano: `momento` y `enviar` (apagado = simulacro en el registro) | `node redes/informe-diario.mjs --momento=… --enviar` | `VIGILANTE_TOKEN`, `GITHUB_TOKEN` (automático, sólo lectura), variables `REDES_ACTIVAS` y `R2_ARCHIVO` | Nada | 10 min |
| **Auditoría** (`auditoria.yml`) | Lunes 12:00 UTC (9:00 en Balcarce); a mano | `redes/auditar.mjs`; `redes/auditar-redes.mjs --semana` (si falla, sigue) | `VIGILANTE_TOKEN`, `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY`, `META_TOKEN` | `web/data/auditoria.json` | 30 min |
| **Crear voces** (`crear-voces.yml`) | A mano, con un `modo` | `npm ci`, `reels/crear-voces.mjs`. **`crear`**: seis candidatos nuevos, cada uno con un audio de prueba; **`recrear`**: dos versiones nuevas de la locutora y del locutor aprobados (por ejemplo, para una clave de otro proyecto de Google), cada una con su audio; **`listar`**: la biblioteca de voces de Google; **`borrar`**: quita una voz propia. Los modos `dialogo` fueron pruebas de una charla entre las dos voces, descartadas porque sonaban falsas | `GEMINI_API_KEY_REDES` | Nada (los audios quedan 7 días como artefacto) | 30 min |
| **Auditar voz** (`auditar-voz.yml`) | A mano (opcional: `explorar`) | `npm ci`, `reels/auditar-voz.mjs [--explorar]` | `GEMINI_API_KEY_REDES` | Nada | 15 min |
| **Ver Facebook** (`ver-facebook.yml`) | A mano | `redes/ver-facebook.mjs` | `META_TOKEN` | Nada | 5 min |
| **Reintentar pieza** (`reintentar.yml`) | Botón del panel o a mano | `redes/reintentar.mjs`: sube de nuevo el video que "Redes" guardó tres días, sin gastar voz | `META_TOKEN`, `REDES_ACTIVAS` | `web/data/redes.json` | 15 min |
| **Auditoría IA** (`auditoria-ia.yml`) | El reloj de Cloudflare a los :41, de 7 a 23 de Balcarce (desde el 17/10; el `schedule` de GitHub que tenía la corría una de cada cuatro horas); a mano (`simular`) | `redes/auditar-notas.mjs` (lee las notas nuevas con Groq y avisa lo que esté mal; corrige sola sólo la ortografía chica y segura) | `GROQ_API_KEY`, `VIGILANTE_TOKEN`, `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY` | `web/data/auditoria-ia.json` (cifrado) y `web/data/correcciones-auditoria.json` | 12 min |
| **Pistas** (`pistas.yml`) | El reloj de Cloudflare cada 3 horas, a los :23 (desde el 17/10; antes, `schedule` de GitHub); el botón "Volver a mirar" del panel del celular; a mano (`id`, `marca`, `simular`) | `panel/revisar-pistas.mjs` (vuelve a mirar las pistas abiertas y avisa si un medio las cubrió) | `GEMINI_API_KEY_REDACCION`, `GEMINI_API_KEY_CLASIFICACION`, `TAVILY_API_KEY`, `VIGILANTE_TOKEN`, `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY` | `web/data/pistas.json` y `web/data/notas-de-pistas.json` | 10 min |
| **Fijar piezas** (`fijar-piezas.yml`) | Sólo a mano (`piezas`, `desde`, `dias`; el horario de una vez del 10/10 se sacó el 17/10) | `reels/plan.mjs --generar`, `reels/fijas.mjs`: arma de antemano piezas con voz y las guarda para reutilizarlas unos días | `GEMINI_API_KEY_REDES` | `reels/fijas/` (y, si hay `R2_PIEZAS`, una copia a R2 de lo armado, con `continue-on-error`) | 30 min |
| **Armado con datos vacíos** (`armado-vacio.yml`) | Al subir cambios al código de la web; lunes 9:17 UTC | `web/scripts/armado-vacio.mjs`: arma el sitio con datos vacíos o a medias, para descubrir un código que rompe esos casos antes de que congele la web | Ninguno | Nada | 25 min |
| **Pruebas con otra hora** (`pruebas-otra-hora.yml`) | Lunes 8:43 UTC; a mano | Corre las pruebas como si fuera otra hora y otra fecha (`pruebas/hora-falsa.mjs`). Falló el 5 y el 12/10 (la memoria de voces); el 17/10 pasa | Ninguno | Nada | 40 min |
| **Respaldo** (`respaldo.yml`) | Domingos 6:17 UTC (3:17 en Balcarce); a mano | Arma un paquete de git con todo el historial y una copia de datos y fotos (artefacto de 90 días); si hay GitLab (`GITLAB_TOKEN`, variable `GITLAB_REPO`) sube un espejo, y si hay R2 (variable `R2_RESPALDOS`) sube el paquete. **Hoy (16/10) sube a R2** (`radar-balcarce-respaldos`); **el espejo de GitLab no corre**: no están cargados ni `GITLAB_TOKEN` ni `GITLAB_REPO` | `GITLAB_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; variables `GITLAB_REPO`, `R2_RESPALDOS` | Nada | 40 min |
| **Probar la restauración del respaldo** (`probar-restauracion.yml`) | A mano (opcional: `fecha`) | Baja de R2 el respaldo de ese día (junta las partes según el manifiesto y compara el sha256), rearma el repositorio desde el paquete, corre `git fsck`, compara el último commit con GitHub y abre el archivo de datos y fotos. Anduvo el 15/10 | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; variable `R2_RESPALDOS` | Nada | 20 min |
| **Piezas de redes** (`redes-piezas.yml`, 18/10/2026) | Sólo a mano o por el Worker de tareas (acción «redes»), **y sólo con `redes.yml` en la lista `NUBE` del reloj**; desde el 23/10 el Worker lo dispara (pide la voz y despierta al render público) | `npm ci`, la memoria de voces, `reels/plan.mjs --generar --solo=…` con `RENDER_REMOTO=Si`: pide la voz a Gemini, arma el pedido de video, lo sube a R2 y despierta al repositorio público de render; **no espera el video** | `GEMINI_API_KEY_REDES`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `RENDER_GITHUB_TOKEN`; `R2_RENDER` | Nada (la memoria de voces va a la caché de Actions) | 10 min |
| **Desplegar Workers de Cloudflare** (`desplegar-nube.yml`, 18/10/2026) | A mano: `que` (todo, tareas, motor, vigilante, reloj), `con_nube` y `nube` (qué workflows pasan a Cloudflare) | Crea los depósitos R2 y los KV, sube los Workers de la mudanza con wrangler 4.139.0 (`--keep-vars`) y carga sus secretos por `wrangler secret bulk` (`infra/compartido/secretos-para-wrangler.mjs`). Sin `con_nube` el reloj y el vigilante quedan como siempre | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` y los secretos de los Workers (`docs/historico/etapa-10-operacion/PLAN-DE-CAMBIO.md`) | Nada | 15 min |
| **Reloj de Cloudflare** (`reloj-cloudflare.yml`) | A mano (cuando cambia el reloj) | Sube el Worker `radar-balcarce-reloj` (`infra/reloj-cloudflare/`) con wrangler 4.139.0 y le carga el secreto | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `RELOJ_GITHUB_TOKEN` | Nada | 10 min |
| **Vigilante de Cloudflare** (`vigilante-cloudflare.yml`) | A mano (cuando cambia el vigilante) | Sube el Worker `radar-balcarce-vigilante` (`infra/vigilante-cloudflare/`) con wrangler 4.139.0, crea su KV si falta y le carga los secretos | `CLOUDFLARE_API_TOKEN` (con «Workers KV Storage: Edit»), `CLOUDFLARE_ACCOUNT_ID`, `VIGILANTE_TOKEN`; opcional `VIGILANTE_GITHUB_TOKEN` (está cargado) | Nada | 10 min |
| **Ilustrar notas sin foto** (`ilustrar-notas.yml`) | El reloj de Cloudflare a los :20 cada 2 horas, de 7:20 a 23:20 de Balcarce, con `automatico` = `true`; a mano: revisar (`horas`, `ids`) o aplicar (`aplicar`, `corrida`, `ids`) | `web/scripts/ilustrar-notas.mjs`: elige las notas sin foto real (salta muertes, sepelios, semáforo rojo y lo que ya tiene imagen), pide a Gemini el prompt y al Worker de imágenes la ilustración (SDXL, 1024 × 576), la hace mirar otra vez por Gemini y, en automático, guarda sólo las que pasan ese control. Hasta 12 llamadas al Worker por corrida y 20 por día. Nunca pisa una ilustración hecha con Gemini web. Regla 185 (R23 de `docs/10-REGLAS-Y-PRUEBAS.md`) | `GEMINI_API_KEY_REDACCION`, `GEMINI_API_KEY_CLASIFICACION`, `VIGILANTE_TOKEN` (la contraseña del Worker) | `web/data/fotos-ia.json` y `web/public/fotos-notas/<id>-ia.jpg` (el paso que guarda hace fila con "Actualizar la web") | 30 min (guardar, 15) |
| **Revisar el archivo** (`revisar-archivo.yml`) | El reloj de Cloudflare a los :12 de las horas UTC impares (12 por día, desde el 22/10/2026); a mano, con *simular* para no guardar | `web/scripts/revisar-archivo.mjs` (regla 212): una tanda de notas viejas con el criterio de hoy; el paso «Guardar» va en el grupo `actualizar-web` y escribe `web/data/revision-archivo.json`, `banco-fotos.json` y `correcciones-auditoria.json` (`docs/flujos/REVISION-DEL-ARCHIVO.md`). Variable `REVISION_DEL_ARCHIVO` ("no" la frena) | `GROQ_API_KEY`, `GEMINI_API_KEY_CLASIFICACION` (sólo respaldo), `VIGILANTE_TOKEN` (aviso de lo grave) | Nada (Groq y Gemini gratis) | 15 + 10 min |
| **Imágenes con Workers AI** (`imagenes-cloudflare.yml`) | A mano (subir un Worker) | Sube el Worker `radar-balcarce-imagenes` (`infra/imagenes-cloudflare/`), le carga la contraseña y compara varios modelos con el mismo prompt (adjunto de 3 días) | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VIGILANTE_TOKEN` | Nada | 15 min |
| **Generar fondos del clima** (`generar-fondos-clima.yml`) | A mano (`candidatas`) | Pide al Worker de imágenes candidatas de paisaje para nueve estados del tiempo y las deja como adjunto; una persona elige y las guarda como `web/public/fotos-notas/clima-<estado>-<n>.jpg` | `VIGILANTE_TOKEN` | Nada | 30 min |
| **Probar las claves de Gemini** (`probar-gemini.yml`) | A mano (de prueba) | `redes/probar-gemini.mjs`: qué modelos ve cada clave, un texto mínimo por clave, una voz de 3 segundos (gasta 1 del cupo de voz) y una imagen | Las tres claves de Gemini | Nada | 10 min |
| **Probar el aviso por mail** (`probar-mail.yml`) | A mano (de prueba) | Manda un mail de prueba a `radarbalcarce@gmail.com` por `POST /avisar` del Worker vigilante (si no sale, prueba el WhatsApp) | `VIGILANTE_TOKEN` | Nada | 5 min |
| **Reparar las estadísticas** (`reparar-estadisticas.yml`) | A mano (`aplicar`, `con_hoy`) | `redes/reparar-estadisticas.mjs`: vuelve a pedir a Cloudflare los días que quedaron en cero o incompletos. Sin `aplicar` = `true`, sólo simula | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ANALYTICS_TOKEN` | `web/data/estadisticas.json` (sólo con `aplicar`) | 10 min |

**Respaldo en R2 y los 300 MB** (15/10/2026): wrangler sube hasta 300 MB por archivo y el paquete de git (unos 185 MB, +3,5 MB por día) los pasa hacia el 20/11/2026. Por eso "Respaldo" parte en pedazos de 200 MB (`<archivo>.part-000`, `.part-001`…, más `<archivo>.partes.txt` con nombres, tamaños y sha256 del archivo entero) lo que pase de 250 MB, y sube siempre un `SHA256SUMS`; lo chico sigue yendo entero. "Probar la restauración del respaldo" baja las partes, las junta y compara el sha256. Sin secretos ni herramientas nuevas; la prueba es `pruebas/respaldo-partes.test.mjs`.

**Ninguno cobra**: GitHub no cobra minutos porque el repositorio es público, las
claves de IA son gratis y las imágenes salen de las neuronas gratis de Workers AI.
Lo que hay que cuidar es el **cupo de voz**: los 10 audios por día los comparten
Redes, Piezas, Fijar piezas, Auditar voz, Crear voces (`crear` y `recrear`;
`listar` y `borrar` no gastan) y Probar las claves de Gemini (una voz).

Detalles que importan:

- **La hora:** los que miran la hora ponen `TZ: America/Argentina/Buenos_Aires`
  (GitHub corre en UTC); no la ponen los de prueba, los que suben Workers,
  "Crear voces", "Ver Facebook" ni "Auditoría IA". **Node 24** en
  todos; los que no arman videos ni imágenes no instalan nada en la raíz
  (`ingesta/`, `panel/` y `redes/` no usan dependencias).
- **Permisos:** los que commitean ("Actualizar la web", "Redes", "Piezas",
  "Fijar piezas", "Reintentar pieza", "Panel del celular", "Vigilancia",
  "Auditoría", "Auditoría IA", "Pistas", "Ilustrar notas sin foto" y "Reparar
  las estadísticas") tienen `contents: write`; los demás, sólo lectura.
  "Vigilancia", "Informe diario", "Ilustrar notas sin foto" y "Reintentar
  pieza", además, `actions: read`.
- **Siempre la última versión:** casi todos los que leen o escriben
  `web/data/` ("Actualizar la web", "Redes", "Piezas", "Fijar piezas",
  "Reintentar pieza", "Panel del celular", "Vigilancia", "Informe diario",
  "Auditoría IA", "Pistas", "Ilustrar notas sin foto", "Cloudflare Pages",
  "Respaldo" y los del archivo permanente) bajan `main` al día
  (`ref: main`), no la del momento en que se los disparó.
- **Lo que manda el celular** a "Panel del celular" va por variables de
  entorno, nunca pegado en el comando: un texto con comillas no ejecuta nada.

### Cómo no se pisan

- **Candados** (`concurrency`): `actualizar-web` (la siguiente espera; el paso
  que guarda de "Ilustrar notas sin foto" hace la misma fila), `redes` (Redes,
  Piezas, Fijar piezas y Reintentar pieza: nunca dos publicando a la vez),
  `cloudflare-pages` (la subida a mano; desde el 17/10 la siguiente espera),
  `panel-celular` (un borrador a la vez), `vigilancia`, `informe-diario`,
  `auditoria`, `auditoria-ia`, `pistas`, `ilustrar-notas`, `respaldo`,
  `reparar-estadisticas`, los dos del archivo permanente y
  `pruebas` (una nueva cancela la anterior del mismo cambio).
- **Al commitear**, los que escriben en `main` hacen `git pull --rebase`; si chocan en
  `web/data/` (o, en "Actualizar la web", en `web/public/fotos-notas/`), gana lo
  de esa corrida; reintentan hasta tres veces y, si no pueden, terminan en
  rojo. Un choque fuera de esas carpetas corta la corrida sin tocar nada.
- **El panel del celular** escribe por la API de GitHub archivos que ningún
  workflow toca (`celular-decisiones.json`, `correcciones.json`,
  `celular-llaves.json`); si alguien cambió el archivo en el medio, lo vuelve a
  leer y reintenta. `avisos.json` (la publicidad) se sube a mano, con commit.

## El reloj de Cloudflare: el despertador (desde el 15/10/2026)

Un programa chico de Cloudflare, el Worker **`radar-balcarce-reloj`**
(`infra/reloj-cloudflare/`), que Cloudflare despierta solo y que le pide a la API
de GitHub que corra los workflows. No cuesta aparte (entra en el plan Workers Paid) y, a diferencia de cron-job.org, no
se apaga solo si una vez falla. **Anda desde el 15/10/2026, 14:46 UTC (11:46 en
Balcarce).**

- **Qué pide y cuándo, desde el 17/10/2026** (regla 190; las horas del Worker son UTC, pero
  los minutos son los mismos que en Balcarce, que es UTC−3): a los **:00 y :30**,
  "Actualizar la web", siempre; **"Vigilancia" cada 3 horas** (a los :00 de las 0, 3,
  6… 21 de Balcarce) y otra vez a las **9:30, 21:30 y 0:30**; a los **:05, :35 y :45,
  sólo de 7 a 23 de Balcarce**, "Redes" con la acción `reloj`; a los **:41 de 7 a
  23**, "Auditoría IA"; a los **:23 cada 3 horas**, "Pistas"; a los **:12 de las horas
  UTC impares** (22:12, 0:12… 20:12 de Balcarce), "Revisar el archivo" (regla 212; antes del
  22/10/2026 no hace nada; **hay que desplegar el reloj a mano** para que lo pida). Antes del 17/10: los :00 y
  :30 pedían "Actualizar" y "Vigilancia" siempre, y "Redes" corría las 24 horas. Y desde
  el 15/10, a las **8:15 y 21:15 de Balcarce** (11:15 y 0:15 UTC, una sola
  expresión `15 0,11 * * *`), "Informe diario" con `momento` = `manana` o `noche`,
  y **otra vez a las 8:30 y 21:30** (desde el 16/10, dentro de la expresión de los
  :00 y :30: el disparo de los :15 no había despertado el informe ni el 15 a la
  noche ni el 16 a la mañana; si llegan los dos, el Worker vigilante manda un solo
  mail); y desde el 16/10 a la tarde (el reloj con este horario se subió a las
  15:45 de Balcarce), a los **:20 cada 2 horas de 7:20 a 23:20 de Balcarce**
  (expresión `20 0,2,10,12,14,16,18,20,22 * * *`), "Ilustrar notas sin foto" con
  `automatico` = `true` (regla 185; R23 de `docs/10-REGLAS-Y-PRUEBAS.md`).
  Lo decide `trabajosDelMinuto(minuto, horaUtc)` (`worker.mjs`); `wrangler.toml` tiene
  **seis expresiones**, una por trabajo, que sólo despiertan al Worker (despertarlo de
  más no cuesta nada). El comentario viejo de "cuatro expresiones, no sumar más" era
  del plan gratis (5 por cuenta); con Workers Paid son **250 por cuenta**.
  **Después de tocarlo hay que correr «Reloj de Cloudflare»**: el reloj no se sube solo.
  Mientras no se corra, sigue el horario viejo (y "Auditoría IA" y "Pistas", que ya no
  tienen `schedule`, no corren: la Vigilancia avisa con `reloj-Auditoría IA` y
  `reloj-Pistas`); el informe sale igual por su `schedule` de respaldo.
- **La llave:** un token de GitHub de grano fino, **sólo para este
  repositorio**, con «Actions: lectura y escritura», **creado sin vencimiento**.
  Está guardado en el secreto de GitHub **`RELOJ_GITHUB_TOKEN`**; el workflow «Reloj de Cloudflare»
  lo carga en el Worker (que lo llama `GITHUB_TOKEN`). Nunca en un chat ni en el
  código.
- **Cambiar o resubir el reloj:** GitHub → Actions → «Reloj de Cloudflare» →
  Run workflow (sube `worker.mjs` con wrangler y vuelve a cargar el secreto).
  Si `CLOUDFLARE_API_TOKEN` no tuviera permiso para Workers, fallaría con ese
  mensaje: habría que agregarle «Workers Scripts: edición».
- **Para ver si está vivo:** la página del Worker responde «Reloj de Radar
  Balcarce: en hora.»; el panel de Cloudflare (Workers) muestra cada ejecución,
  y una que GitHub no aceptó figura como fallida.
- **Si el reloj se rompe:** desde el 16-17/10 no hay horarios de respaldo en GitHub
  (salvo el del informe diario, a las 8:45 y 21:45, y los semanales): se para la web,
  las redes, la vigilancia, la auditoría IA, las pistas y las ilustraciones. Lo avisa
  por mail el vigilante de Cloudflare (`actualizar-vieja`, `web-vieja`), que no depende
  de GitHub. De urgencia se puede correr "Actualizar la web" a mano o desde el celular.
  Se puede volver al despertador anterior reactivando los trabajos de
  cron-job.org (abajo), pero **no los dos juntos más de un rato**: si dos relojes
  piden lo mismo, el `concurrency` de los workflows evita que se pisen, pero se
  gastan corridas de más.

### El vigilante de Cloudflare (avisos por mail, afuera de GitHub)

Un segundo Worker, **`radar-balcarce-vigilante`** (`infra/vigilante-cloudflare/`), nació el 15/10/2026 de la auditoría
(`docs/historico/auditoria-opus/ANALISIS.md`, punto 1): los avisos por WhatsApp llevaban muertos desde el 1/10 (se acabó el cupo de CallMeBot) y
`redes/vigilar.mjs` corre dentro del mismo GitHub que vigila. Éste corre aparte, a los **:12 y :42**, y avisa **por mail** a
`radarbalcarce@gmail.com` (Email Workers, desde `vigilante@radarbalcarce.com`; el dominio ya tiene Email Routing):

- **Qué mira:** que la portada conteste 200 en 15 segundos (aviso a la segunda revisión seguida), que la web se haya armado hace menos de
  3 horas (6 de noche; se lee del `sitemap.xml`) y que "Actualizar la web" tenga una corrida buena de menos de 3 horas y no lleve 3 fallas
  seguidas (API pública de GitHub).
- **Anti-spam:** un problema se avisa una vez y se repite cada 6 horas; al arreglarse llega un solo mail de «Se arregló». A las **22** sale un
  resumen mínimo del día, **sólo si el informe de la noche (21:15, abajo) no llegó**: es su respaldo y vive afuera de GitHub. La memoria es un KV (`ESTADO`).
- **`GET /estado`** muestra la última revisión; **`GET /probar-mail`** (encabezado `x-token`, secreto `VIGILANTE_TOKEN`) manda un mail de prueba.
- **Lo que hace una persona la primera vez** (permiso de KV en el token de Cloudflare, mirar que `radarbalcarce@gmail.com` esté *Verified* en
  Email Routing, cargar `VIGILANTE_TOKEN`, correr el workflow y probar el mail): paso a paso, con enlaces, en
  `infra/vigilante-cloudflare/LEEME.md`. **Hecho el 15/10**: `VIGILANTE_TOKEN` y `VIGILANTE_GITHUB_TOKEN` están cargados y «Vigilante de
  Cloudflare» corrió bien. Para probar el mail desde GitHub: Actions → «Probar el aviso por mail».
- No reemplaza a `redes/vigilar.mjs` (que sigue mirando redes, claves, contenido y estadísticas): lo complementa en lo que no puede ver
  si GitHub se cae.
- **Avisos por mail desde el 15/10 (regla 173):** el Worker también recibe `POST /avisar` (encabezado `x-token`, el mismo `VIGILANTE_TOKEN`; hasta
  30 mails por hora; con `clave`, la misma no se repite en 6 horas). Lo que antes mandaban por WhatsApp el vigilante (`redes/vigilar.mjs`, con su
  resumen de las 21), la auditoría semanal, la auditoría con IA y las pistas ahora sale **primero por mail** (`redes/avisar-por-mail.mjs`, función
  `avisar`) y **WhatsApp queda de respaldo**: sólo se prueba si el mail no salió o si el workflow no tiene `VIGILANTE_TOKEN`. Los workflows
  `vigilancia.yml`, `auditoria.yml`, `auditoria-ia.yml` y `pistas.yml` pasan `VIGILANTE_TOKEN` (secreto de GitHub, el mismo del Worker). Después de
  tocar el Worker hay que volver a correr «Vigilante de Cloudflare».
- **Informes diarios (regla 176):** `POST /avisar` acepta además un `html` opcional (el mail sale con texto y formato; si pasa de 60.000 caracteres
  se descarta y sale el texto). El informe de las 8:15 y el de las 21:15 (`redes/informe-diario.mjs`, workflow «Informe diario») usan la clave
  `informe-<momento>-<día>`: el Worker la recuerda 6 horas, así que si llegan varios disparos (el de los :15, el de los :30 y el respaldo) sale un
  solo mail. Esa misma clave es la que mira el resumen de las 22 para saber si el informe de la noche llegó.
- **El Worker también es la contraseña de otro:** el Worker de imágenes (`radar-balcarce-imagenes`) usa el mismo `VIGILANTE_TOKEN` como su
  contraseña (abajo, "Los Workers de Cloudflare").

### cron-job.org: el despertador anterior (pausado)

- Cuenta `radarbalcarce@gmail.com`, en https://console.cron-job.org/jobs. Hasta
  el 15/10/2026 despertó a GitHub; **sus tres trabajos están PAUSADOS, no
  borrados** ("Actualizar la web" y "Vigilancia" a los :00 y :30, y el reloj de
  "Redes" a los :05, :35 y :45), por si hubiera que volver.
- Cada trabajo pide a la API de GitHub
  `…/actions/workflows/<archivo>.yml/dispatches` con un encabezado
  `Authorization` que lleva un token de GitHub de `balcardev@gmail.com`. **Vence
  el 21/09/2027** (el vigilante ya no avisa de ese vencimiento desde el 15/10);
  si se reactivan los trabajos con el repositorio nuevo
  (`radarbalcarce/radar-balcarce`), hay que cambiarles también la dirección y
  poner un token con permiso sobre ese repositorio.
- Lo que aprendimos: **si un trabajo falla varias veces seguidas, cron-job.org
  lo desactiva solo** (pasó el 24/09 con dos, mientras Meta tenía bloqueada la
  cuenta).
- Desde el 15/10 los avisos del vigilante ya nombran al reloj de Cloudflare
  («el reloj de Cloudflare pudo haber fallado…»), no a cron-job.org.

## Cloudflare Pages: la web

- Sirve `radarbalcarce.com` desde el 24/09. El dominio está **registrado en
  DonWeb**, con el DNS en Cloudflare. `www` redirige con un 301 al dominio sin
  `www` (el vigilante avisa si deja de hacerlo).
- El sitio es **estático** (`output: 'export'` en `web/next.config.mjs`) y se
  sube ya compilado ("Direct Upload"): Cloudflare no compila nada y no cuenta
  contra su límite de 500 compilaciones por mes. Acepta hasta 20.000 archivos
  por subida: por eso el archivo de notas tiene tope (`06-WEB`).
- Los encabezados están en `web/public/_headers`. Los de `/panel/` (el panel
  del celular): no se indexa, el navegador trae siempre la versión nueva y sólo
  puede hablar con GitHub (`Content-Security-Policy`).
- **Web Analytics** está activado (gratis, sin cookies): de ahí salen las
  visitas de las estadísticas.
- `wrangler` va con la versión fija (4.139.0), para que una nueva no rompa el
  despliegue sola. Para subirla: cambiar el número en `actualizar.yml` **y** en
  `cloudflare-deploy.yml` (una prueba controla que digan lo mismo) y probar con
  "Cloudflare Pages" a mano.
- **Las redirecciones** (`web/public/_redirects`, las arma `web/scripts/generar-redirects.mjs`
  al compilar): Pages acepta **2.000 fijas** (más 100 con comodines) e ignora sin avisar las
  que sobran. Desde el 17/10 (regla 191) se escriben como mucho 1.950: las secciones viejas,
  las notas repetidas que se unieron a otra (su dirección sí se publicó) y las direcciones
  cortas `/nota/ID` sólo de las notas de antes del 25/09 (después nadie tuvo esa dirección).
  Eran 1.419 el 16/10 y se llenaba hacia el 26/10; con los datos del 17/10 son 210. Si alguna
  vez las repetidas no entran, las que sobran salen como una página chica de redirección
  (canónica + meta refresh) en su dirección vieja. Lo demás lo resuelve la página 404.
- **Servidor MCP:** el que estaba escrito (16/10/2026, `infra/mcp-cloudflare/`) y nunca se
  activó **se borró el 17/10** (no lo usaba nada; queda en el historial de git). Los JSON de
  `/agentes/` del sitio siguen.
- **Vercel** está apagado; borrar el proyecto y su DNS está en `PENDIENTES.md`.

## Los Workers de Cloudflare y los depósitos R2 (16/10/2026)

La cuenta de Cloudflare (`radarbalcarce@gmail.com`) tiene contratado el plan
**Workers Paid** (US$ 5 por mes). Los Workers están en `infra/`, cada uno con su
`wrangler.toml`, y se suben desde GitHub con su workflow (nunca desde la PC):

| Worker (carpeta) | Qué hace | Estado hoy | Se sube con |
|---|---|---|---|
| `radar-balcarce-reloj` (`infra/reloj-cloudflare/`) | El despertador (arriba) | **Andando** desde el 15/10 | «Reloj de Cloudflare» |
| `radar-balcarce-vigilante` (`infra/vigilante-cloudflare/`) | Mira desde afuera a los :12 y :42 y manda todos los mails (`POST /avisar`) | **Andando** desde el 15/10 | «Vigilante de Cloudflare» |
| `radar-balcarce-tareas` (`infra/tareas-cloudflare/`) | **Andando desde el 22/23-10.** Vigilancia, auditoría IA, pistas, informe diario, ilustraciones y la parte de Redes que no necesita ffmpeg, en lugar de seis workflows | **Andando**: lo pide el reloj según `NUBE` | «Desplegar Workers de Cloudflare» |
| `radar-balcarce-motor` (`infra/motor-cloudflare/`) | El Worker al que se conecta Workers Builds: la vuelta de «Actualizar la web» corre en su compilación (6.000 minutos por mes incluidos; presupuesto y medición: `docs/etapa-10-operacion/MINUTOS-DE-WORKERS-BUILDS.md`) | **Andando** desde el 22/23-10 | «Desplegar Workers de Cloudflare» |
| `radar-balcarce-imagenes` (`infra/imagenes-cloudflare/`) | Genera imágenes con Workers AI (SDXL y otros) en `…workers.dev/generar`, con `VIGILANTE_TOKEN` como contraseña. Lo usan «Ilustrar notas sin foto» y «Generar fondos del clima» | **Andando** desde el 16/10 | «Imágenes con Workers AI» |
| `radar-balcarce-archivo` (`infra/archivo-cloudflare/`) | El archivo permanente: sirve desde el depósito `radar-archivo` las notas que ya salieron del sitio | **ENCENDIDO el 23/10**: la ruta `radarbalcarce.com/nota/*` va a este Worker (vuelta atrás: workflow «Archivo permanente (producción)» con `sacar_ruta`); `/_archivo/estado` contesta `ok: true` (1.466 notas, 223 MB el 23/10). Cada vuelta guarda ahí las que están por salir. **Falta la ruta de las fotos** (`activar_fotos`) antes de bajar `TOPE_DE_NOTAS` de 500 | «Archivo permanente (producción)»; el de ensayo, `radar-balcarce-archivo-staging`, con «Archivo permanente (staging)» |
| `radar-balcarce-sondeo-fuentes` | Fue una prueba de una vez (15/10): si los feeds contestan pedidos desde Cloudflare | **Su carpeta y su workflow se borraron el 17/10. Falta, a mano: borrarlo en Cloudflare** (Workers → `radar-balcarce-sondeo-fuentes` → Settings → Delete) | — |

**Depósitos R2** (variables de GitHub cargadas al 16/10): `radar-balcarce-respaldos`
(`R2_RESPALDOS`, los respaldos de los domingos), `radar-piezas` (`R2_PIEZAS`,
desde el 15/10: los videos, audios y placas de las redes) y `radar-archivo`
(`R2_ARCHIVO`, desde el 16/10: el archivo permanente) y, de la mudanza, `radar-motor`, `radar-render` y `radar-tareas`. **No hay depósito de
fotos todavía**: `R2_FOTOS` y `FOTOS_BASE` no están cargadas y `FOTOS_EN_R2` no existe (apagada), así que las fotos siguen
saliendo del sitio (`web/public/fotos-notas/`, en git); el código para pasarlas a R2 está escrito y probado, apagado
(`docs/etapa-10-operacion/FOTOS-EN-R2.md`); el workflow viejo "Fotos a R2" nunca se usó y se borró el 17/10.

## La mudanza del robot a Cloudflare (escrita el 18/10; HECHA el 22 y 23/10)

Para que el repositorio principal entre en los 2.000 minutos gratis de un repositorio privado (hoy ~14.400 facturables por mes) sin sumar costo, se escribió la mudanza completa: el motor ("Actualizar la web") a **Workers Builds**, las tareas chicas a **un Worker** y el video a un **repositorio público de render** sin secretos. **Se prendió el 22 y 23/10** (variable `NUBE` del reloj; vacía = todo vuelve a GitHub). Lo que falta, a mano de una persona: apagar los siete workflows viejos de GitHub, el tope de gasto de Actions en US$ 0 y pasar el repositorio a privado (`PENDIENTES.md`). Los minutos de Workers Builds se miden y se cuidan con `docs/etapa-10-operacion/MINUTOS-DE-WORKERS-BUILDS.md` (regla 312).

- Qué se eligió, con qué números, qué costó (US$ 0 nuevo), qué minutos quedan (~1.620 a 1.820 de 2.000) y qué quedó afuera: `docs/historico/etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md`.
- Cómo se prende, paso a paso, qué se pega y cómo se vuelve atrás en minutos: `docs/historico/etapa-10-operacion/PLAN-DE-CAMBIO.md`.
- Reglas 230 a 235 (hoy en la R36 de `docs/10-REGLAS-Y-PRUEBAS.md`).
- Variables y secretos nuevos (los crea y los pega una persona): `RADAR_GITHUB_TOKEN`, `RENDER_GITHUB_TOKEN`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `MOTOR_DEPLOY_HOOK`, `CF_BUILDS_TOKEN`, y las variables `R2_RENDER` e `INFORME_RESPALDO_EN_GITHUB` (cargadas el 22/10), más `REDES_ACTIVAS_NUBE` (el interruptor de las redes **en la nube**: es una variable distinta de `REDES_ACTIVAS`, que es la de GitHub; el 22/10 la de GitHub decía "No" y la de la nube "Sí", a propósito: quien mire sólo GitHub cree que las redes están apagadas); en Cloudflare, depósitos R2 `radar-motor`, `radar-render` y `radar-tareas`.

## GitHub: el repositorio

- `radarbalcarce/radar-balcarce`, cuenta dueña `radarbalcarce@gmail.com`;
  colaboradores: `balcardev`, Andrés (`agerace`) y Hernán
  (`hernanaccomo-pixel`). Hasta el 15/10/2026 fue `balcar-dev/radar-balcarce`
  (cuenta `balcardev@gmail.com`); GitHub redirige la dirección vieja, pero lo que
  figure en los workflows, el panel del celular y los tokens tiene que usar la nueva.
  **Sigue siendo público**, desde el 25/09 (los públicos no pagan minutos de
  Actions; se revisó el historial y no hay claves): **pasarlo a privado costaría
  minutos de Actions**, y no conviene mientras el robot siga corriendo en
  Actions. **Hay que mantenerlo público** hasta que eso cambie. **Nada sensible va al repositorio sin cifrar**: ni claves, ni
  datos de personas, y lo que espera a una persona viaja cifrado para el panel del
  celular (regla 79).
- El panel del celular escribe con la **llave de GitHub** de cada persona (de
  grano fino: sólo este repositorio, Contents y Actions de lectura y
  escritura), que vive sólo en su celular (`09-PANEL`).
- En la PC, el `.env` (ignorado por git) tiene las claves de IA para trabajar
  localmente; lo lee `reels/claves.mjs` si la clave no está en el entorno.

## Las claves de IA

Cinco claves —cuatro de Gemini (redacción, respaldo **pago**, clasificación y voces) y Groq— y una sexta opcional, Mistral, el último respaldo gratis de texto (desde el 26/10; OpenRouter, que iba después, se retiró ese día porque fallaba el 97 % de los pedidos). Todas son gratis salvo la de respaldo de la redacción, que tiene un límite de gasto de US$ 10 por mes que pone una persona. Van **separadas a propósito**: en Google el cupo es
**por proyecto y por modelo**, y si dos usos compartieran un proyecto, un día
de muchos pedidos de uno se comería el cupo del otro. Si dos claves son del
mismo proyecto, comparten el cupo de cada modelo (el de texto y el de voz son
modelos distintos: no compiten entre sí). Las lee `reels/claves.mjs`.

| Secreto | Para qué | Modelo | Cupo y topes | Si falla |
|---|---|---|---|---|
| `GEMINI_API_KEY_REDACCION` (acepta el nombre viejo `GEMINI_API_KEY`) | Redactar las notas: título, bajada y cuerpo (`reels/reescritura.mjs`, `04-REDACCION`), también las que pide el panel del celular | `gemini-flash-lite-latest` (`MODELO_DE_TEXTO`) | Google da 500 pedidos por día; el sistema se pone **450** si la lectura tiene su propia clave y **330** si no (`topeDeReescrituras`, `REESCRITURA` en `ingesta/criterio.mjs`); 40 por corrida; 3 intentos por nota (4 con 5 medios, 5 con 8) | Pasa a los respaldos (abajo) |
| `GEMINI_API_KEY_RESPALDO` (desde el 25/10/2026) | El respaldo **pago** de la redacción: escribe notas sólo cuando la gratis de redacción no pudo por el servicio (sin cupo, saturada, rechazada). Nunca las voces, la lectura ni las fotos (`reels/claves.mjs`, `claveRespaldo`) | `gemini-flash-lite-latest` (el mismo que la gratis) | Un proyecto de Google aparte, con facturación y un límite de gasto de US$ 10 por mes que pone una persona en Google | Pasa a la de clasificación |
| `GEMINI_API_KEY_REDES` | Las voces de las piezas (`reels/voz-gemini.mjs`), Auditar voz y Crear voces. Las dos voces propias viven en el proyecto de esta clave: si la clave pasa a otro proyecto, hay que crearlas de nuevo. **No** escribe notas ni lee con IA (desde el 25/10): su cupo es sólo para las voces | `gemini-3.8-flash-tts` (voz) | **10 audios por día**, compartidos por Redes, Piezas, Auditar voz y Crear voces (cuánto gasta un día normal: `07-REDES`, "El cupo de voz"); 2 segundos entre pedidos | La pieza no sale: nunca con otra voz |
| `GEMINI_API_KEY_CLASIFICACION` | La lectura con IA (`ingesta/lectura-ia.mjs`, `03-SELECCION`) y el banco de fotos (`ingesta/fotos.mjs`, `05-FOTOS`). Tercer respaldo de la redacción | `gemini-flash-lite-latest` | Fichas: **200 pedidos por día** (60 sin esta clave, `topeDeLecturas`), 5 por corrida, 12 notas por pedido; repetidas: 60 por día; fotos: hasta 10 por corrida | Prueba con Groq. Sin esta clave, usa la de redacción; **nunca la de redes** |
| `GROQ_API_KEY` | Segundo proveedor de la lectura con IA y de las fotos: si Gemini falla o se queda sin cupo, el mismo pedido va a Groq | `openai/gpt-oss-120b` (lectura), `qwen/qwen3.8-27b` (fotos, con visión) | Los de la cuenta gratis: 8.000 tokens por minuto, por eso **no sirve para redactar** (un pedido de redacción ocupa unos 9.000) | La lectura sigue sólo con Gemini |
| `MISTRAL_API_KEY` (opcional, desde el 26/10/2026) | **El último respaldo gratis de texto y el único que no es de Google**: la redacción, la lectura con IA, la Auditoría IA y la revisión del archivo, cuando Gemini (y Groq, donde se usa) fallaron o se agotaron. Nunca las voces ni las imágenes (`reels/mistral.mjs`) | `mistral-large-2512`; se cambia con la variable `MISTRAL_MODELO` sin tocar el código | Plan gratis «Experiment» de la API de Mistral (`api.mistral.ai`, sin tarjeta): límites **por minuto (alrededor de 1 pedido por segundo) y por mes**, no por día. Un 429 se reintenta una o dos veces con una espera corta (velocidad). El sistema se pone **400 pedidos por día** (`TOPE_DIARIO`; `MISTRAL_TOPE_DIARIO` lo cambia) y reparte: la redacción puede gastar los 400, la lectura 360, la Auditoría IA 200 y la revisión del archivo 160. Cada intento cuenta. Se cuentan en `web/data/uso-ia.json` (clave `mistral`) | Sin la clave, no se llama a nadie y nada cambia. Una clave rechazada (401/402/403) corta por esa corrida. Si Mistral también falla, la nota espera a la próxima vuelta (no gasta intentos) |

**El orden de la redacción** (`reescribir`, `reels/reescritura.mjs`; es el real desde el 25/10/2026):

1. La clave de **redacción** (gratis).
2. La de **respaldo** (`GEMINI_API_KEY_RESPALDO`, paga, US$ 10 por mes), si la anterior no está o falló por el servicio
   (sin cupo, saturada, clave rechazada o sin crédito: 401, 402, 403, 429, 5xx).
3. La de **clasificación** (gratis, otro proyecto), si las anteriores fallaron por el servicio.
4. **Mistral** (plan gratis, desde el 26/10/2026), sólo si existe `MISTRAL_API_KEY` y las de Gemini fallaron por
   el servicio. Es el último: si también falla, la nota espera a la próxima vuelta.

La clave de **voces** (`GEMINI_API_KEY_REDES`) **ya no escribe notas** ni lee con IA. Un error del pedido (400) no prueba otra clave.
Lo que escribe Mistral pasa por el mismo verificador y el mismo semáforo que lo de Gemini (un dato inventado se descarta igual);
el modelo queda anotado en `web/data/intentos-ia.json` (`modelo`), en el registro de "Actualizar la web" y en `uso-ia.json`.

**El orden de los demás** (Mistral siempre al final, y sólo si hay clave): la lectura con IA, Gemini → Groq → Mistral; las repetidas
y las parejas, Gemini → Groq; la Auditoría IA de cada hora, Groq → Mistral (el comando sólo se rinde con «Sin GROQ_API_KEY» si no hay
ninguna de las dos); la revisión del archivo, Groq → Gemini (con su tope) → Mistral; la elección de fotos y su segunda opinión,
Gemini → Groq (con visión); el control de las ilustraciones, Gemini (clasificación y redacción) → Groq. Las voces y las imágenes
no tienen respaldo.

**Crear la clave de Mistral (los dueños ya la cargaron el 26/10; nunca se pega en un chat):** en <https://console.mistral.ai> con `radarbalcarce@gmail.com`, plan gratis *Experiment* (sin tarjeta), crear una clave en *API keys* y pegarla en GitHub → *Settings* → *Secrets and variables* → *Actions* como `MISTRAL_API_KEY`. Llega a los workflows de GitHub, a Workers Builds (por «Cargar variables del motor») y al Worker de tareas (por «Desplegar Workers de Cloudflare»). Para sacarla de servicio, borrar el secreto.

**OpenRouter se retiró el 26/10/2026**: de 150 pedidos entre el 23 y el 26/10 fallaron 146 y siempre llegaba a su tope de 45 por día. Ya nada
lo llama; el secreto `OPENROUTER_API_KEY` se puede borrar de GitHub (y del Worker de tareas) cuando quieran.

Una nota que falla por el servicio (por ejemplo, una clave rechazada: 401, 402
o 403) no gasta sus intentos. El registro de "Actualizar la web" dice cuántos
pedidos fueron a cada clave ("claves de Gemini usadas: N con la de redacción, M
con la de respaldo (paga), K con la de clasificación (respaldo), J con Mistral") y cuándo se llegó al
tope del día.

**Cada pedido a una IA queda medido** (desde el 26/10/2026, `redes/uso-ia.mjs`): en `web/data/uso-ia.json`, por día, tarea (redacción, lectura,
repetidas, fotos, auditoría, revisión del archivo, ilustraciones, pistas) y modelo, con cuántos pedidos fue cada clave y, por clave, cuántos salieron
bien (`ok`) y por qué fallaron los demás: `cupo-diario` (el 429 dice «por día»), `velocidad` (429 por minuto o con `retry-after`), `saturado` (503),
`rechazada` (401, 402, 403) u `otro` (lo que el proveedor no deja distinguir). El informe diario lo resume en una línea por clave. Las voces no se
miden ahí: su cupo (10 audios por día) se cuenta por lo publicado.

**La vigilancia pregunta por las claves** (regla 80, `revisarClaves` en
`redes/vigilar.mjs`): en cada vuelta (cada 3 horas desde el 17/10), sin gastar cupo, pide la lista de
modelos con cada clave y, con la de redes, la ficha de cada voz propia (si
existe y cuándo vence, según Google). Avisa si una clave contesta 400 a 403 o
si una voz ya no existe o vence en menos de 30 días. "Sin cupo" (429) y los 5xx
no se avisan: son de un rato y los maneja cada corrida.

### Los proyectos de Google y cómo ordenarlos (revisado el 17/10/2026)

*Antes estaba en `docs/08-INFRAESTRUCTURA.md (claves de IA)` (se unió acá el 25/10). Se revisó en Google AI Studio con la
sesión de `radarbalcarce@gmail.com`, sólo mirando, y con la lista de secretos de GitHub (sólo nombres y fechas).*

En la cuenta de Google `radarbalcarce@gmail.com` había seis proyectos:

| Proyecto | ¿Es de Radar? | Facturación | ¿Aparece en AI Studio? |
|---|---|---|---|
| Default Gemini Project (`gen-lang-client-0957258153`) | No se sabe para qué se creó | **Sí, Nivel 1 pago** | Sí: tiene **una** clave, del 2/10/2026, que **no está cargada en GitHub** |
| RadarGratis (`…0871841619`) | Sí (redacción, gratis) | No | No (no está importado) |
| RadarBalcarce (`…0749672113`) | Sí (voces) | ? | No (no está importado) |
| LibrosClasicos (`…0540396560`) | **No** | ? | No |
| Plantas (`…0759315682` y `…0279384394`) | **No** | ? | No |

Las tres claves de Gemini de GitHub se cargaron antes de la clave paga del 2/10, así que ninguna es ésa. Lo que no está bien:
la facturación está en un proyecto que Radar no usa; hay proyectos de otras cosas en la cuenta del medio; los proyectos de
Radar no están importados en AI Studio (no se ve qué claves tienen ni cuánto gastan), y no se sabe de qué proyecto es cada
clave de GitHub. Las dos voces propias quedan atadas al proyecto de `GEMINI_API_KEY_REDES`: si esa clave cambia de proyecto,
hay que crearlas de nuevo.

**Cómo ordenarlo** (lo hace Hernán o Andrés; Claude puede guiar paso a paso):

1. Importar RadarGratis y RadarBalcarce en AI Studio (Claves de API → «Importar proyectos»). No cambia nada de lo que anda.
2. Ver de qué proyecto es cada clave de GitHub (AI Studio muestra los últimos cuatro caracteres; se comparan con un pedido de
   prueba de cada secreto, sin mostrar la clave).
3. Dejar sólo los proyectos de Radar: uno gratis para redacción y clasificación (sin facturación) y uno con facturación y un
   tope de gasto (el de las voces; desde el 25/10 se suma la clave paga de respaldo, ver arriba).
4. Pasar o sacar la facturación del «Default Gemini Project» y borrar la clave del 2/10 que no usa nadie.
5. Mover LibrosClasicos y Plantas a otra cuenta de Google.
6. Si cambia de proyecto la clave de las voces: correr «Crear voces» en modo `recrear` (`docs/11-OPERACION.md`).
7. Anotar acá qué proyecto es cada clave (sin la clave).

Groq y Tavily son de otras empresas: revisar en console.groq.com y en tavily.com que estén a nombre de `radarbalcarce@gmail.com`.

## Vigilancia y avisos (mail primero, WhatsApp de respaldo)

`redes/vigilar.mjs`, **cada 3 horas** desde el 17/10 (antes, cada media hora; lo urgente de la web lo mira cada media hora el vigilante de Cloudflare). Mira **desde afuera**, como un lector:

| Qué mira | Clave del aviso | Nivel |
|---|---|---|
| La web no responde | `web-caida` | alta |
| La web no se actualiza hace más de 100 minutos (la fecha más nueva del `sitemap.xml`) | `web-vieja` | alta |
| No se puede leer cuándo se actualizó | `web-sin-fecha` | media |
| `www` no redirige | `www` | media |
| La última corrida de "Actualizar la web" (también si falló la subida, desde el 17/10), "Redes", "Respaldo", "Armado con datos vacíos", "Pruebas con otra hora", "Auditoría IA", "Pistas" o "Informe diario" falló ("Cloudflare Pages" ya no se mira: es a mano) | `falla-<nombre>` | alta si fallaron 3 de las últimas 5 |
| No hay corridas nuevas de "Actualizar la web" (de 7 a 23) o de "Redes" (de 8 a 23) en 100 minutos, de "Auditoría IA" en 3 horas (de 9 a 23) o de "Pistas" en 7 horas (de 7 a 23) | `reloj-<nombre>` | alta para la web y Redes ("el reloj de Cloudflare pudo haber fallado"); media para las otras dos ("¿se subió el reloj nuevo?") |
| No hay un "Respaldo" bueno hace más de 10 días | `respaldo-viejo` | media |
| El archivo permanente (R2) no corre hace más de 6 horas, o no se puede leer su estado (sólo con `R2_ARCHIVO` cargada, como desde el 16/10) | `archivo-r2-atrasado`, `archivo-r2-sin-estado`, `archivo-r2-…` | media; alta pasadas las 24 horas |
| Dos días sin una lectura confiable de las visitas de Cloudflare | `estadisticas-sin-lectura` | media |
| Instagram tiene publicaciones repetidas | `instagram-copias` | alta |
| Volvió algo que se pidió sacar: "la vimos hace…", hasta qué hora está la farmacia, la fuente arriba de un título (reglas 1 a 3 de `10-REGLAS-Y-PRUEBAS`) | `regla-…` | alta |
| Menos del 35 % de las notas de las últimas 24 horas tiene cuerpo (con 10 o más) | `pocos-cuerpos` | media |
| La auditoría semanal no corre hace más de 10 días | `auditoria-vencida` | media |
| Una clave de IA no anda (Google o Groq contestan 400 a 403) | `clave-<NOMBRE>` | alta |
| Una voz propia ya no existe | `voz-locutora`, `voz-locutor` | alta |
| Faltan 30 días o menos para un vencimiento: el dominio o una voz (con la fecha de Google). El del token de cron-job.org se sacó el 15/10 | `vence-dominio`, `vence-voz-…` | alta en la última semana |
| Redes: piezas fijas y contrato del día, duplicados, espejos (`07-REDES`) | `pieza-…`, `falta-…`, `duplicado-…`, `sin-espejo-…`, `redes-apagadas` | según el caso |

Cómo avisa:

- **Un solo aviso por corrida**, por mail a `radarbalcarce@gmail.com` (a través
  del Worker vigilante, `redes/avisar-por-mail.mjs`) y, sólo si el mail no
  salió, por WhatsApp. En este orden: problemas nuevos, el cierre de las 23:30
  si hubo discrepancias, una noticia de Balcarce muy importante (relevancia 100
  y 3 medios o más, 2 por día como mucho), las notas nuevas que esperan a una
  persona (cada 3 horas; termina con "Se deciden desde el panel del celular:
  radarbalcarce.com/panel") y lo que salió en redes. El tope de 1.000
  caracteres viene de WhatsApp: lo que no entra sale en la corrida siguiente.
- **El resumen de las 21, las estadísticas de las 9 y el informe del día en
  notas ya no salen de acá** desde el 15/10 (regla 176): los trae el informe
  diario por mail de las 8:15 y las 21:15 (`redes/informe-diario.mjs`). Sólo se
  pueden pedir a mano con `probar-resumen`.
- **Cada problema se repite a lo sumo cada 6 horas** ("redes apagadas", una vez
  por día); cuando se arregla, se borra de lo avisado. Todo queda en
  `web/data/vigilancia.json`.
- **Aviso amarillo, no rojo**: con un problema, la corrida termina bien y deja
  un aviso amarillo; en rojo sólo si el vigilante no pudo correr. Sin
  `VIGILANTE_TOKEN` ni los secretos de WhatsApp corre igual y deja todo en el
  registro.

**CallMeBot** (`redes/whatsapp.mjs`) es un servicio gratis para avisarse a uno
mismo: sólo manda al número que lo activó (`WHATSAPP_TELEFONO`, completo con
549, sin + ni espacios) con la clave que dio al activarlo (`WHATSAPP_APIKEY`).
La clave viaja en la dirección del pedido, así que el código la borra de todo
lo que muestra (el workflow "Prueba de WhatsApp" se borró el 17/10). **Se quedó sin cupo cerca
del 1/10**: por eso los avisos pasaron al mail y WhatsApp quedó sólo de respaldo.

## Todos los secretos y variables, por nombre

Están en GitHub → Settings → Secrets and variables → Actions. **Los valores
los pega una persona**, nunca un chat ni un archivo del repositorio. Desde el
repositorio no se puede ver qué está cargado: ante la duda, mirar esa pantalla
(o `gh secret list` y `gh variable list`, que muestran sólo los nombres) o
correr el workflow de prueba que corresponda.

**Una variable cargada en GitHub no llega sola al programa** (regla 311, `pruebas/variables-conectadas.test.mjs`): llega sólo si el
`env:` del paso del workflow la nombra (por ejemplo `ENLACES_CORTOS` y `FOTOS_EN_R2`, apagadas, están en `redes.yml`, `piezas.yml`,
`reintentar.yml`, `actualizar.yml` y `motor-variables.yml`), y a Workers Builds sólo si está en `cargar-variables.mjs` y en
`motor-variables.yml`. Al Worker de tareas se le pone en su panel de Cloudflare o con `--var` en `desplegar-nube.yml`. Los apagados de
emergencia que **no** se pasan a propósito (`CRUCE_COHERENTE`, `MEMORIA_DE_ACA`, `INGESTA_PERMITIR_VACIA`, `ARCHIVO_PERMITIR_BAJA`,
`TARJETAS_SIN_CACHE`, `FACEBOOK_COMO_FOTO`, `REELS_ESCENAS`, `META_PAGE_ID`, `CLOUDFLARE_SITE_TAG`, `AVISOS_URL`…) no se pueden usar desde
GitHub sin sumarlos antes al `env:` del workflow; la lista completa está en la prueba.

**Lo cargado el 16/10/2026.** Secretos (15): `CLOUDFLARE_ACCOUNT_ID`,
`CLOUDFLARE_ANALYTICS_TOKEN`, `CLOUDFLARE_API_TOKEN`, las tres
`GEMINI_API_KEY_*`, `GROQ_API_KEY`, `META_TOKEN`, `RELOJ_GITHUB_TOKEN`,
`SONDEO_TOKEN` (sin uso desde el 17/10: borrarlo), `TAVILY_API_KEY`, `VIGILANTE_GITHUB_TOKEN`, `VIGILANTE_TOKEN`,
`WHATSAPP_APIKEY` y `WHATSAPP_TELEFONO`. Variables (4): `R2_ARCHIVO`,
`R2_PIEZAS`, `R2_RESPALDOS` y `REDES_ACTIVAS` (en `Si`). **No están cargados**
(los workflows siguen sin ellos): `GITLAB_TOKEN` y `GITLAB_REPO` (el espejo en
GitLab), `R2_FOTOS` y `FOTOS_BASE` (las fotos en R2),
`CLOUDFLARE_ZONE_ID` y `CLOUDFLARE_PROJECT`. (Después se cargaron `TOPE_DE_NOTAS`, las llaves de la mudanza, `TARJETAS_EN_R2` y `MOTOR_NOCHE_CADA_HORA` = Si (24/10), y `SITEMAP_PARTIDO`, `SITEMAP_DEL_ARCHIVO` = Si y `REVISION_DEL_ARCHIVO` = "si" (25/10): el estado real, con `gh secret list` y `gh variable list`.)

Qué workflow usa cada uno está en la tabla de los workflows.

| Nombre | Tipo | Para qué |
|---|---|---|
| `META_TOKEN` | Secreto | Publicar y leer en Facebook e Instagram (`07-REDES`). No vence. Al regenerarlo, tildar todos los permisos de ahora **más** `read_insights` e `instagram_manage_insights` |
| `GEMINI_API_KEY_REDACCION`, `GEMINI_API_KEY_REDES`, `GEMINI_API_KEY_CLASIFICACION`, `GEMINI_API_KEY_RESPALDO` (la paga de la redacción), `GROQ_API_KEY`, `MISTRAL_API_KEY` (opcional) | Secretos | Las claves de IA ("Las claves de IA") |
| `MINIMO_NACIONAL`, `MINIMO_AREAS_CHICAS` (opcionales, regla 260) | Variables | Cuántos medios distintos tienen que contar lo de afuera para salir: lo nacional (3) y las áreas chicas, Tecnología e IA, Ciencia, Salud, Educación, Cultura, Agro y Automovilismo (2). Un número de 2 a 10; vacías, rotas o fuera de ese rango valen los de siempre. Se cambian en Settings, Secrets and variables, Actions, Variables, sin tocar código; en la vuelta de Cloudflare (Workers Builds), como variables del build. Hernán las mira cada semana con la estadística (`docs/03-SELECCION.md`, paso 7) |
| `MISTRAL_MODELO`, `MISTRAL_TOPE_DIARIO` (opcionales) | Variables | El modelo de Mistral (por defecto `mistral-large-2512`) y el tope de pedidos por día (por defecto 400, un entero de 1 a 5000). Llegan a los workflows de GitHub y a Workers Builds; en el Worker de tareas se ponen en su panel de Cloudflare |
| `CLOUDFLARE_API_TOKEN` | Secreto | Subir el sitio y los Workers, escribir en R2 y KV; tiene también el permiso *Account · Account Analytics · Read*. Para poner la ruta del archivo permanente le falta «Zone → Workers Routes: Edit» |
| `CLOUDFLARE_ACCOUNT_ID` | Secreto | La cuenta de Cloudflare: el sitio y las estadísticas |
| `CLOUDFLARE_ANALYTICS_TOKEN` | Secreto | Leer las visitas de Web Analytics. Sin permiso, el resumen dice "falta permiso de Analytics" |
| `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY` | Secretos | El número de los avisos de respaldo (completo con 549, sin + ni espacios) y la clave que dio CallMeBot |
| `VIGILANTE_TOKEN` | Secreto | La contraseña compartida con el Worker vigilante (`POST /avisar`, todos los avisos por mail y los informes) y con el Worker de imágenes. El mismo valor está cargado en los dos Workers |
| `VIGILANTE_GITHUB_TOKEN` | Secreto | Opcional: un token de GitHub de grano fino sin permisos (sólo lectura pública) que «Vigilante de Cloudflare» carga en el Worker, por si GitHub limita las lecturas sin llave |
| `SONDEO_TOKEN` | Secreto | **Sin uso desde el 17/10** (era del «Sondeo de fuentes desde Cloudflare», borrado): una persona lo borra en GitHub → Settings → Secrets |
| `GITLAB_TOKEN` / `GITLAB_REPO` | Secreto / variable (no cargados) | El espejo semanal del repositorio en GitLab que hace "Respaldo" |
| `GITHUB_TOKEN` | Automático | Lo pone GitHub en cada corrida |
| `REDES_ACTIVAS` | Variable | El interruptor de las redes (`07-REDES`) |
| `RELOJ_GITHUB_TOKEN` | Secreto | El token de GitHub (de grano fino, sólo este repositorio, Actions de lectura y escritura) con el que el reloj de Cloudflare despierta a los workflows; lo carga en el Worker el workflow «Reloj de Cloudflare» |
| `TAVILY_API_KEY` | Secreto | La búsqueda con texto de las Pistas (`ingesta/busqueda.mjs`; workflow «Pistas») |
| `R2_PIEZAS` | Variable | (Cargada el 15/10: `radar-piezas`.) El depósito de Cloudflare R2 donde "Redes", "Piezas" y "Fijar piezas" archivan los videos, audios, subtítulos y placas que arman (`redes/archivar-piezas.mjs`; el script lo crea si falta; usa `CLOUDFLARE_API_TOKEN` con *Workers R2 Storage: Edit* y `CLOUDFLARE_ACCOUNT_ID`). Sin ella, cada corrida dice «sin archivo de piezas» y sigue. Qué guarda, cuánto pesa y cuesta, cómo bajar una pieza: `docs/redes/ARCHIVO-DE-PIEZAS.md` |
| `R2_RESPALDOS` | Variable (cargada: `radar-balcarce-respaldos`) | El depósito donde "Respaldo" sube el paquete de git y los datos; lo lee "Probar la restauración del respaldo" |
| `R2_ARCHIVO` | Variable (cargada el 16/10: `radar-archivo`) | Prende el archivo permanente: con ella, cada vuelta de "Actualizar la web" (y "Cloudflare Pages" a mano) guarda en R2 las notas por salir, y el vigilante y el informe lo controlan |
| `TOPE_DE_NOTAS` | Variable (cargada el 23/10: `500`, también en Workers Builds con «Cargar variables del motor») | **Baja** el tope de notas con página (techo 3.700, mínimo 500, de a 100 por vuelta), y sólo con `R2_ARCHIVO` puesta (`topeDeNotas`, `web/lib/archivo.js`); lo que sale del sitio se sirve desde R2 |
| `R2_FOTOS`, `FOTOS_BASE` | Variables opcionales (no cargadas) | El depósito de fotos (sólo para que el archivo R2 y los respaldos se nieguen a escribir ahí; "Fotos a R2" se borró el 17/10) y el dominio desde el que el sitio sacaría las fotos (`web/lib/fotos.js`). Sin `FOTOS_BASE`, las fotos salen del sitio |
| `WHATSAPP_CANAL_URL`, `TELEGRAM_CANAL_URL`, `BLUESKY_URL` | Variables opcionales (no cargadas; 17/10, regla 257) | Las direcciones de los canales propios, que crea y pega una persona (`https://whatsapp.com/channel/…`, `https://t.me/…`, `https://bsky.app/profile/…`). Sin ellas no aparece nada en el sitio; con ellas, un cartel de WhatsApp al final de cada nota y de `/hoy`, enlaces en el pie y `sameAs` en el marcado. Las pasan `actualizar.yml` y `cloudflare-deploy.yml` a cada compilación; si el sitio lo arma el motor de Cloudflare, se cargan también en su configuración (el motor le pasa el entorno entero a `npm run build`). Se validan en `web/lib/canales.js` |
| `CLOUDFLARE_ZONE_ID` | Variable opcional (no cargada) | Sólo para la ruta del archivo permanente (si falta, la busca por el nombre del dominio, para lo que el token necesita «Zone: Read») |
| `CLOUDFLARE_PROJECT` | Variable opcional (no cargada) | Sin ella se usa `radar-balcarce`, el nombre real del proyecto de Pages |

**El panel del celular no necesita ningún secreto**: usa la llave de GitHub de
cada persona, que vive sólo en su celular (`09-PANEL`). Fuera de GitHub están
el token del reloj de Cloudflare (cargado en el Worker `radar-balcarce-reloj`; el valor está en el secreto `RELOJ_GITHUB_TOKEN`), la
contraseña de los Workers vigilante e imágenes (la misma de `VIGILANTE_TOKEN`), el de cron-job.org (pausado, en el
encabezado `Authorization` de sus trabajos) y, en la PC, el `.env`.

## Las otras cuentas

| Servicio | Para qué | Cuenta |
|---|---|---|
| Google AI Studio | Las claves de Gemini y sus cupos | `radarbalcarce@gmail.com` |
| Groq (console.groq.com) | La clave de respaldo de la lectura | `radarbalcarce@gmail.com` |
| Mistral (console.mistral.ai) | La clave del último respaldo gratis de texto (opcional, plan Experiment) | `radarbalcarce@gmail.com` |
| Google Search Console | Indexación; propiedad de dominio, con `sitemap-index.xml` y `nota/sitemap-archivo.xml` enviados el 25/10 (`docs/seo/AUDITORIA-SEO-LLM.md` § 12) | `radarbalcarce@gmail.com` |
| DonWeb | El registro del dominio (el DNS está en Cloudflare) | — |
| Tailscale | **Para dar de baja**: era el túnel para entrar al panel de la PC desde afuera, y ese panel se retiró el 17/10/2026. Ya no lo usa nada | `radarbalcarce@gmail.com` |
| Tavily | La búsqueda con texto de las Pistas (`TAVILY_API_KEY`) | — |
| GitLab | El espejo del respaldo: **todavía no hay cuenta ni proyecto** (faltan `GITLAB_TOKEN` y `GITLAB_REPO`) | — |
| Vercel | Apagado; falta borrar el proyecto | `radarbalcarce@gmail.com` |
| Meta | La app, la página y el Instagram (`07-REDES`) | `radarbalcarce@gmail.com` |

El WhatsApp que aparece al pie de cada página (`web/lib/datos.js`) es el de
contacto del medio, 2266 51-1612: no es una clave ni el de los avisos del
vigilante (`WHATSAPP_TELEFONO`).

## Vencimientos

| Qué | Cuándo | Qué hacer | Quién avisa |
|---|---|---|---|
| Token del reloj de Cloudflare (`RELOJ_GITHUB_TOKEN`) | **No vence** (se creó sin vencimiento el 15/10) | — | — |
| Token de GitHub de cron-job.org (reloj viejo, pausado) | **21/09/2027** | Sólo si se vuelve a usar cron-job.org: crear otro (con una cuenta con acceso a `radarbalcarce/radar-balcarce` → Settings → Developer settings → Fine-grained tokens; sólo este repositorio, Actions de lectura y escritura) y pegarlo en el encabezado de **todos** los trabajos de cron-job.org (con la dirección del repositorio nuevo) | Nadie: el aviso del vigilante se sacó el 15/10 |
| Dominio `radarbalcarce.com` (DonWeb) | **21/09/2027** | Renovarlo en DonWeb. Si vence, se cae la web y todos los enlaces de los posteos | El vigilante, desde 30 días antes |
| Las dos voces propias de Gemini | **29/09/2027** (la fecha la da Google) | Crearlas de nuevo con "Crear voces" y cambiar los identificadores en `CRITERIO-REDES.md` § 6 (`11-OPERACION`). Si vencen, las piezas con voz dejan de salir | El vigilante, 30 días antes, con la fecha que da Google |
| La llave del panel del celular | Un año después de crearla (la fecha que se elige al crearla) | Crear otra igual y pegarla en el celular (`11-OPERACION`) | Nadie: al vencer, el panel dice "La llave no anda" |
| Medidas de imágenes de las redes (`redes/formatos.mjs`) | 90 días desde la última verificación | Volver a verificarlas (`FORMATOS.md`) | La auditoría semanal |
| `META_TOKEN` | No vence | — | — |

## Lo que cuesta

**Se pagan dos cosas:** el **dominio**, que se renueva cada año en DonWeb (vence
el 21/09/2027; el precio no está en el repositorio), y el plan **Workers Paid de
Cloudflare, US$ 5 por mes**, ya contratado (lo que usan hoy los Workers, R2 y las
imágenes de Workers AI entra en lo incluido o en los cupos gratis; la estimación
para cuando el robot se mude, US$ 5 a 8 por mes, está en
`docs/historico/etapa-10-operacion/ANALISIS.md`). Todo lo demás es gratis:

- **GitHub Actions** (el detalle, en "Los minutos de GitHub", abajo): el 15/10 se midieron unos **13.700 minutos reales por mes**
  (unos 19.000 si GitHub redondea cada corrida al minuto; del 1 al 14/10,
  `docs/historico/etapa-10-operacion/ANALISIS.md`). Son gratis porque el repositorio es
  **público**; en privado costarían entre US$ 70 y US$ 136 por mes, por eso
  sigue público mientras el robot corra ahí. **Medido otra vez el 16/10**: del 9
  al 15/10, unos 14.600 reales (19.800 redondeados); y desde el 16/10, unos
  23.500 (32.000 redondeados, unos US$ 240 si fuera privado), porque el
  `schedule` de respaldo de "Actualizar la web" (:07 y :37) empezó a cumplirse
  casi siempre (65 a 73 vueltas por día el 15 y el 16/10, no 92: esa fue la cuenta
  de una tarde), cada una con su "Cloudflare Pages" y su "Redes". Ese horario se
  sacó el 16/10 a la tarde, y el 17/10 se unieron las compilaciones y se recortaron
  Redes y Vigilancia: **unos 11.000 reales (~14.500 redondeados)** [estimado].

### Los minutos de GitHub (17/10/2026)

Medido con las 4.427 corridas del 1 al 15/10 (la planilla, `runs-14d.ndjson`, se borró el 17/10;
queda en el historial de git) y proyectado a 30 días con los cambios del 17/10. "Fact." = como cobraría GitHub en un
repositorio privado, redondeando cada corrida al minuto.

| Workflow | Antes (1-15/10): corridas/día · reales · fact. por mes | Desde el 17/10 [estimado] |
|---|---|---|
| Actualizar la web | 54,5 · 6.800 · 7.600 | 48 · ~7.200 · ~8.100 (ahora también sube: +30 s, y recompila ~1 de cada 10) |
| Cloudflare Pages | 54,5 · 3.600 · 4.400 | 0 (a mano) |
| Redes | 123 · 2.250 · 4.750 | 51 · ~1.900 · ~3.200 (las ~14 piezas por día pesan lo mismo; se van ~70 corridas vacías) |
| Vigilancia | 52 · 740 · 1.700 | 11 · ~160 · ~330 |
| Auditoría IA | 4,5 · 150 · 220 | 17 · ~570 · ~1.000 (sube: ahora corre todas las veces que le toca) |
| Pistas | 2,8 · 40 · 90 | 8 · ~115 · ~240 |
| Ilustrar notas sin foto | (empezó el 16/10) | 9 · ~680 · ~810 |
| Informe diario | ~2 · ~40 · ~60 | 3 · ~60 · ~90 |
| Pruebas, armado vacío, semanales y a mano | ~500 · ~800 | ~400 · ~600 (las pruebas dependen de cuántos cambios de código haya) |
| **Total** | **~13.800 · ~19.200** | **~11.100 · ~14.400** |

Con el mismo trabajo que antes (la auditoría IA y las ilustraciones corriendo todas sus
vueltas), lo de antes habría sido ~14.900 reales y ~20.500 facturables: **el ahorro es de
~3.800 minutos reales y ~6.000 facturables por mes (~30 %)**. En privado (plan Free, 2.000
incluidos, US$ 0,006 a 0,008 el minuto) serían todavía **unos US$ 75 a 100 por mes**.

**Qué hacía falta para que el repositorio principal entre en los 2.000 minutos gratis**
(HECHO en el código y prendido el 22 y 23/10 con la variable `NUBE`, salvo apagar a mano los workflows viejos y pasar el repositorio a privado; es la etapa del motor, `docs/historico/etapa-10-operacion/DISENO-MOTOR.md`, aunque la mudanza real usó Workers Builds y no el Workflow con D1 de ese diseño). Lo que sigue describe el plan original:

- **A Cloudflare, dentro de los US$ 5 de Workers Paid** (Workers, Cron, Workflows, D1, R2, KV):
  "Vigilancia" (~330), "Auditoría IA" (~1.000), "Pistas" (~240), "Informe diario" (~90) e
  "Ilustrar notas sin foto" (~810) son Node sin dependencias que piden cosas por la red: pasan a
  Workers con su cron (el estado, a KV o D1 en vez de commitear JSON). De "Redes", la pregunta
  "¿toca una pieza?" y los posteos de Facebook (~1.100 de corridas cortas) también. Y el grande,
  **"Actualizar la web" (~8.100)**: el motor (leer, juntar, decidir, escribir con IA, verificar)
  como Workflow de Cloudflare con D1/R2, y el sitio armado por un Worker desde D1 (o, como paso
  intermedio, servido como Worker con archivos estáticos) [SIN VERIFICAR que una compilación de
  Next quepa en lo que da Cloudflare: por eso el diseño propone armar las páginas en el Worker].
- **Al repositorio público de render** (`radarbalcarce/radar-balcarce-render`, vacío): sólo el
  **video** (ffmpeg, resvg y la voz de Gemini): las ~14 piezas por día de "Redes" (~2.100
  facturables) y las herramientas a mano que arman video (Piezas, Fijar piezas, Reintentar
  pieza, Crear voces, Auditar voz). Lo despertaría el Worker de redes sólo cuando toca una pieza,
  leería lo publicado del sitio (no del repositorio) y anotaría el libro en D1/KV, sin commitear
  datos: así ese repositorio puede ser público sin mostrar nada sensible (sus secretos no se ven).
- **Lo que queda en el principal**: "Pruebas" (con `cancel-in-progress`, ~300 a 600),
  "Armado con datos vacíos", los semanales, "Respaldo" y lo de a mano: **~600 a 900 facturables
  por mes**, dentro de los 2.000.
- **Las claves de IA**: las tres de Gemini son gratis desde el 29/09 (ninguna
  cobra) y Groq y Tavily, también, con sus cupos por día.
- Cloudflare Pages, el DNS y Web Analytics (el plan gratis permite publicidad;
  el de Vercel no), la API de Meta y CallMeBot.

Si algún día se vuelve a usar una clave paga de Gemini, antes hay que ponerle un
límite de gasto en Google (`PENDIENTES.md`).

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Cambiar cada cuánto corre algo | El reloj de Cloudflare: `trabajosDelMinuto` (`infra/reloj-cloudflare/worker.mjs`) y, si hace falta despertarlo en otro minuto, `wrangler.toml`; después, **a mano**, el workflow «Reloj de Cloudflare». Los de lo que corre solo ya no tienen `schedule` de GitHub (salvo el informe diario y los semanales) |
| Cambiar un Worker | Su carpeta en `infra/` y después su workflow (tabla "Los Workers de Cloudflare") |
| Pasar un trabajo de GitHub a Cloudflare (o volver) | La variable `NUBE` del reloj y del vigilante: se cambia subiendo «Desplegar Workers de Cloudflare» (`docs/historico/etapa-10-operacion/PLAN-DE-CAMBIO.md`) |
| Qué guarda la vuelta del motor / cuántos minutos de Workers Builds gasta | `infra/motor-cloudflare/archivos.mjs` (igual a la línea `git add` de `actualizar.yml`) y `presupuesto.mjs` |
| Qué lee y qué escribe una tarea del Worker de tareas | `infra/tareas-cloudflare/tareas.mjs` (`lee`, `escribe`): una prueba con los datos reales la controla |
| El video de las redes (qué pide el principal y qué arma el render) | `reels/pedido.mjs`, `reels/render-remoto.mjs` y `infra/render-publico/` (se copia con `node scripts/sincronizar-render-publico.mjs`) |
| Cómo se manda un aviso | `avisar` (`redes/avisar-por-mail.mjs`: mail primero, WhatsApp de respaldo) y `POST /avisar` (`infra/vigilante-cloudflare/worker.mjs`) |
| Agregar o cambiar un secreto | GitHub → Settings → Secrets and variables → Actions (lo hace una persona) y, si un workflow nuevo lo necesita, el bloque `env:` de ese paso en el `.yml` |
| Prender o apagar las redes | Variable `REDES_ACTIVAS` (GitHub) y `REDES_ACTIVAS_NUBE` (Cloudflare: la que manda desde la mudanza) |
| Cambiar la versión de wrangler o el proyecto de Pages | `actualizar.yml` **y** `cloudflare-deploy.yml` (la misma versión en los dos) y variable `CLOUDFLARE_PROJECT` |
| Qué obliga a recompilar antes de subir | `NO_CAMBIAN_EL_SITIO` (`web/scripts/recompilar.mjs`): lo que se sabe que el sitio no lee; todo lo demás recompila |
| Las redirecciones y su tope | `planDeRedirecciones` (`web/scripts/generar-redirects.mjs`, regla 191) |
| Qué archivos commitea "Actualizar la web" | La línea `git add` de `actualizar.yml` (un archivo nuevo de `web/data/` que no esté ahí se arma y se pierde al terminar la corrida: pasó el 28/09 con el banco de fotos) |
| El tope diario de la redacción o de la lectura | `REESCRITURA` en `ingesta/criterio.mjs` (y la tabla de `CRITERIO-EDITORIAL.md`); `LECTURA` en `ingesta/lectura-ia.mjs` |
| El orden de las claves de la redacción | `reescribir` (`reels/reescritura.mjs`) y `reels/claves.mjs` |
| El modelo de texto (redacción, lectura, fotos) | `MODELO_DE_TEXTO` (`reels/claves.mjs`); los de Groq, `MODELO_GROQ` (`ingesta/lectura-ia.mjs`) y `MODELO_GROQ_VISION` (`ingesta/fotos.mjs`) |
| El modelo de voz, o qué voz dice cada pieza | `MODELO` en `reels/voz-gemini.mjs`; los identificadores de las dos voces y el reparto, en `CRITERIO-REDES.md` § 6 |
| Qué mira el vigilante: límites, vencimientos, claves | `LIMITES`, `VENCIMIENTOS`, `CLAVES_DE_IA` y `evaluar` (`redes/vigilar.mjs`) |
| Qué dice el aviso del vigilante y cuánto entra | `redes/avisos.mjs` (`armarMensaje`) y `LARGO_MAXIMO` (`redes/whatsapp.mjs`) |
| A qué hora se mide y se resume | `HORAS_DE_MEDICION` (`redes/estadisticas.mjs`), `horaDelResumen` (`redes/vigilar.mjs`), `cierreMinutoDelDia` (`CONTRATO_DIARIO`) |
| Los encabezados de la web publicada y del panel del celular | `web/public/_headers` |

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `web/scripts/revisar-archivo.mjs` | La revisión del archivo entero por tandas (regla 212) | `revisar-archivo.yml` | `web/data/archivo.json`, `portada.json`, `banco-fotos.json`, `web/public/fotos-notas/` | `web/data/revision-archivo.json`, `banco-fotos.json`, `correcciones-auditoria.json` |
| `.github/workflows/*.yml` | Los treinta workflows (tabla de arriba) | El reloj de Cloudflare, GitHub, el panel del celular, una persona | secretos y variables | commits en `main`, artefactos |
| `infra/*/worker.mjs` y `wrangler.toml` | Los Workers de Cloudflare (reloj, vigilante, imágenes, archivo y, desde el 18/10, tareas y motor) | Cloudflare | lo de cada uno | — |
| `infra/compartido/github.mjs` y `r2-s3.mjs` | Guardar y leer en GitHub por la API (un commit de varios archivos) y hablar con R2 por S3 con firma, sin dependencias | el motor, el Worker de tareas, `reels/render-remoto.mjs` | — | commits en `main`, objetos de R2 |
| `infra/motor-cloudflare/vuelta.mjs` | La vuelta de «Actualizar la web» como un programa (Workers Builds) | el deploy hook del reloj | fuentes, `web/data/`, claves de IA | `web/data/*.json`, el sitio en Pages, la memoria en R2 |
| `infra/tareas-cloudflare/corredor.mjs` | Corre una tarea chica sobre una carpeta de `/tmp`: baja lo que lee, corre el programa de siempre y guarda lo que cambió | el reloj (binding) | los archivos que la tarea declara | un commit por tarea |
| `redes/avisar-por-mail.mjs` | Manda un aviso: mail por el Worker vigilante y, si no sale, WhatsApp | vigilancia, auditorías, pistas, núcleo legal, archivo | `VIGILANTE_TOKEN`, `WHATSAPP_*` | — |
| `redes/informe-diario.mjs` | Los informes de las 8:15 y 21:15 | `informe-diario.yml` | `web/data/`, la API de GitHub | — (manda el mail) |
| `web/scripts/archivar-a-r2.mjs` | Guarda en R2 las notas que salen del sitio | `actualizar.yml` (cada vuelta), `cloudflare-deploy.yml` (a mano), los dos del archivo permanente |
| `web/scripts/recompilar.mjs` | ¿Entró a `main`, mientras se armaba, algo que el sitio lee? Entonces se recompila antes de subir (regla 189) | `actualizar.yml` | `git diff` | — | `web/out`, `web/data/` | el depósito `radar-archivo` |
| `web/scripts/ilustrar-notas.mjs` | Las ilustraciones con IA de las notas sin foto | `ilustrar-notas.yml` | `web/data/portada.json` | `web/data/fotos-ia.json`, `web/public/fotos-notas/` |
| `web/scripts/generar-datos.mjs` | Todo lo que hace "Actualizar la web" entre las pruebas y la compilación | `actualizar.yml` | fuentes, `web/data/`, claves de IA | `web/data/*.json`, `web/public/fotos-notas/`, `.cache/` |
| `web/scripts/revisar-seo.mjs` | Que el SEO siga en el HTML compilado | `actualizar.yml` | `web/out` | — |
| `reels/claves.mjs` | Las claves de IA (Gemini ×4, Groq, Mistral) y el modelo de texto | redacción, lectura, fotos, voz | entorno, `.env` | — |
| `panel/celular.mjs` | Escribe con IA la nota que pidió el celular, investiga una pista o escribe la nota de una pista, y deja el borrador o el informe cifrado (`09-PANEL`) | "Panel del celular" | `.cache/celular-notas.json`, `web/data/` | `web/data/celular-borradores.json`, `web/data/pistas.json` |
| `redes/vigilar.mjs` | El vigilante, y la revisión de claves y voces (`revisarClaves`) | `vigilancia.yml` | la web en vivo, la API de GitHub, `web/data/`, Meta, Google y Groq | `web/data/vigilancia.json`, `estadisticas.json` |
| `redes/avisos.mjs` | Qué se dice y cómo entra en un mensaje | vigilante | portada, libro | — |
| `redes/whatsapp.mjs` | Manda el WhatsApp por CallMeBot sin mostrar la clave (hoy, sólo de respaldo del mail) | `avisar-por-mail.mjs` | `WHATSAPP_*` | — |
| `redes/estadisticas.mjs` | Visitas (Cloudflare) y seguidores (Meta) | vigilante | `CLOUDFLARE_*`, `META_TOKEN` | — |
| `redes/auditar.mjs` | Auditoría semanal de lo publicado | `auditoria.yml` | la web en vivo, `redes/formatos.mjs` | `web/data/auditoria.json` |
| `web/public/_headers` | Encabezados de Cloudflare (también los de `/panel/`) | Cloudflare Pages | — | — |
| `web/next.config.mjs` | Exportación estática del sitio | `next build` | — | `web/out/` |

## Qué puede fallar y cómo se nota

| Falla | Cómo se nota | Qué hacer |
|---|---|---|
| **El reloj de Cloudflare dejó de despertar** | "No hay corridas nuevas de «Actualizar la web»: el reloj de Cloudflare pudo haber fallado…" o "El reloj de Redes no corre"; la web deja de actualizarse puntual (no hay respaldo de GitHub desde el 17/10: avisa el vigilante de Cloudflare por mail) | Mirar el Worker `radar-balcarce-reloj` en Cloudflare (ejecuciones fallidas: ¿GitHub rechaza el token `RELOJ_GITHUB_TOKEN`?), volver a subirlo con «Reloj de Cloudflare» o, de urgencia, reactivar los trabajos pausados de cron-job.org. Sin reloj tampoco corre Vigilancia (no tiene horario propio desde el 17/10): queda el vigilante de Cloudflare, que avisa por mail aunque GitHub no corra |
| **Falla el núcleo legal en "Actualizar la web"** | Corrida roja en "Núcleo legal de las pruebas" y un mail «Falló el núcleo legal de las pruebas: la web no se actualiza»; a los 100 minutos, "web-vieja" | Leer el paso rojo. Un JSON de `web/data/` mal escrito a mano (`correcciones.json` o `retiradas.json`) también lo causa: lo lee `pruebas/archivo.test.mjs`, que está en el núcleo |
| **Fallan las pruebas enteras** | Corrida roja en "Pruebas" y un mail de GitHub a quien hizo el cambio | No frena la web: arreglarlo antes del próximo cambio |
| **La web no compila** | Corrida roja en "Compilar el sitio"; no se commitea nada | Leer el error de Next |
| **Cloudflare no sube** | "Actualizar la web" en rojo en el paso "Subir a Cloudflare Pages" (`falla-Actualizar la web`; los datos sí se guardaron); la web queda con la versión anterior | Mirar ese paso (token vencido o sin permiso, versión de wrangler). La vuelta siguiente lo vuelve a intentar; para no esperar, "Cloudflare Pages" a mano |
| **No compila lo que entró mientras se armaba** | "Actualizar la web" en rojo en "Volver a compilar con lo que entró" | Entró código o datos que rompen el sitio: la vuelta siguiente falla en "Compilar el sitio" hasta que se arregle |
| **La web no responde** | `web-caida` | Mirar Cloudflare (dash.cloudflare.com) |
| **Choque al commitear** | "No se pudo subir la portada después de tres intentos" o "Conflicto fuera de web/data" | Suele arreglarse en la corrida siguiente; si se repite, alguien subió a mano algo que choca |
| **Vigilancia no pudo guardar su estado** | Corrida roja en "Guardar lo avisado": "No se pudo guardar el estado de los avisos después de tres intentos" | La vuelta siguiente lo reintenta; puede repetir un aviso |
| **Google o Groq rechazan una clave** (suspendida, borrada, sin crédito) | Aviso `clave-<NOMBRE>` (alta) con lo que contestó el servicio | Una persona crea otra clave (Google AI Studio o console.groq.com) y la pega en GitHub → Secrets. Si es la de redes y cambia de proyecto, crear de nuevo las voces (`11-OPERACION`) |
| **La redacción se quedó sin cupo** | Registro: "tope del día" o pedidos a los respaldos; aviso `pocos-cuerpos`; crece "Esperando cuerpo" en el resumen | Esperar al día siguiente o escribir los cuerpos (panel del celular o `11-OPERACION`) |
| **Se acabó el cupo de voz** | Registro de Redes: "se acabó el cupo del día (429)"; faltan piezas | Vuelve al día siguiente. No correr Piezas, Auditar voz ni Crear voces sin necesidad un día de redes |
| **Una voz ya no existe o está por vencer** | Aviso `voz-…` o `vence-voz-…` | Crearla de nuevo (`11-OPERACION`) |
| **Gemini con demasiada demanda (503)** | La redacción falla seguido | Es lo primero que se mira si vuelve a pasar: el modelo (`gemini-flash-lite-latest`) |
| **No llegan los mails** (avisos o informes) | No llega el informe de las 8:15 o el de las 21:15; a las 22 llega el resumen de respaldo del Worker vigilante | Mirar Spam; Actions → «Probar el aviso por mail»; si falla, revisar `VIGILANTE_TOKEN` y el Worker vigilante (`GET /estado`); si el informe ni corrió, el reloj (arriba). `11-OPERACION`, "12 bis" |
| **El WhatsApp no llega** | Sólo importa si el mail falló (es el respaldo). CallMeBot está sin cupo desde cerca del 1/10 | Si CallMeBot dice "APIKey is invalid", la clave está mal copiada; revisar que el teléfono tenga 549 |
| **Faltan permisos en un token** | El resumen dice "falta permiso de Analytics" o que faltan los de Meta | Una persona regenera el token con los permisos |
| **La auditoría semanal no corre** | `auditoria-vencida` si `web/data/auditoria.json` tiene más de 10 días (si el archivo faltara, no avisaría) | Correrla a mano (Actions → Auditoría → Run workflow) |
| **Se vence un token, el dominio o una voz** | Aviso 30 días antes | Ver "Vencimientos" |
| **El archivo permanente no corre** | Aviso `archivo-r2-…`; en "Actualizar la web", el paso "Archivar las notas por salir (R2)" en rojo (no frena el despliegue) y un mail | Leer ese paso (casi siempre el token de Cloudflare). Las notas tienen unos días de margen antes de salir del sitio |
| **La PC está apagada** | Nada automático depende de la PC: el panel de la PC se retiró el 17/10/2026 y las ilustraciones con Gemini web de la tarea programada de la PC se desactivaron ese día (regla 206; las automáticas de Cloudflare siguen) | Nada se rompe: la web, las redes, la vigilancia y el panel del celular siguen |
