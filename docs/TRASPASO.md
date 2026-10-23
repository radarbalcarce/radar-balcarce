# Traspaso: dónde estamos y qué sigue

*Se actualiza cada vez que se cierra una tanda. Para retomar con otra sesión (por ejemplo con DeepSeek: `scripts\claude-con-openrouter.cmd`)
leer primero `CLAUDE.md`, después este archivo y `PENDIENTES.md`. Última actualización: 23/10/2026.*

## Cómo se trabaja
- Hablar siempre en castellano rioplatense, claro. Los dueños (Hernán y Andrés) no programan: **pedirles cada cosa una sola vez**, con el enlace y el paso.
- Nada legal ("no busques temas legales"), nada de costos nuevos, ningún interruptor sensible se prende sin que lo pidan.
- Antes de subir: `npm test` completo (borrar `web/out` y `web/.next` primero) y `git pull --no-rebase` antes del push. Los datos de `web/data/` los regenera GitHub cada media hora: no commitear los que cambie `npm run datos`.
- Los agentes trabajan en worktrees aparte (`.claude/worktrees/`) y se juntan con `git merge --no-ff`. Los números de regla chocan: mirar `docs/10-REGLAS-Y-PRUEBAS.md` antes de numerar.

## Hecho el 17/10 (reglas 188 a 283)
- Una sola compilación por vuelta; reloj de Cloudflare dispara cada cosa cuando toca; redirecciones con tope.
- Selección sin cupos: Balcarce entra todo; lo nacional por cantidad de medios (3; 2 en áreas chicas); 14 secciones activas.
- Repetidas de Balcarce por significado; fechas corregidas; fotos controladas; un solo camino de ilustración (Cloudflare).
- Revisión de todo el archivo por tandas desde el 22/10; OpenRouter como último respaldo de las IA (falta la clave en GitHub).
- Mudanza a Cloudflare: el código está en `main` apagado (variable `NUBE` vacía); plan en `docs/etapa-10-operacion/PLAN-DE-CAMBIO.md`.
- Sitio: sitemap de noticias, `/hoy`, firma de IA adentro de "Fuentes", datos estructurados. Redes: hashtags fijos, lo que va a Facebook solo Balcarce o lo más contado.

## Estado al 23/10/2026 (el resumen con casillas está en docs/RESUMEN-Y-PENDIENTES.html)
- **Mudanza a Cloudflare: HECHA.** Web, tareas, redes y video corren en Cloudflare (reloj `NUBE`). A mano (el sistema de permisos no me dejó): apagar los 7 workflows viejos de GitHub, tope de gasto de Actions en US$ 0, repositorio a privado.
- **Hecho el 22 y 23/10:** lo de Balcarce sin frenos por palabras sensibles (`liberadaPor` anota la palabra; sólo frena el rojo y los avisos fúnebres); una nota en un solo formato (posteo o repaso); informe por mail corto; vigilante cada 24 h sin «se arregló»; fotos con IA con FLUX, objetos lisos de hoy y luz clara; prompt de cada imagen por la IA de texto de Cloudflare (POST /texto del Worker de imágenes; Gemini y Groq de respaldo); control de la imagen con un modelo gratis con visión de OpenRouter primero (Gemini y Groq de respaldo; también tercer respaldo en la revisión de fotos de las fuentes, ingesta/fotos.mjs); pasan el control 5 de 10 (deportes falla: pelotas y zapatillas con logos); documentos sin contradicciones; `web/data/muy-contadas.json` (hechos de 8+ medios que no salen, con motivo; se llena solo).
- **23/10, mañana (Hernán: «no importa si hoy el diario no sale; que quede acorde a lo que charlamos»):** (a) `TOPE_DE_NOTAS=500` (variable de GitHub + cargada en Workers Builds con «Cargar variables del motor»): el sitio baja 100 notas por vuelta de 1.545 a 500 y el resto sale de R2 (rutas `/nota/*` y `/fotos-notas/*` puestas); la compilación y `archivo.json` (4,1 MB) se achican; las primeras vueltas tardan más porque exportan 100 notas cada una (~14 min). (b) Reloj: nuevo cron `10,25,40,50,55 * * * *` y vigilante de vueltas: si la última vuelta buena es de hace 40 min o más (el cron de las :30 se perdió a las 12:30), se vuelve a pedir. (c) Workflow a mano «Compactar el historial» (un solo commit con el estado de main; exige escribir COMPACTAR y un Respaldo bueno de las últimas 24 h; `force-with-lease`); el informe diario avisa el tamaño del repositorio (≥600 MB). (d) La firma ahora dice «Redacción asistida con IA, verificada contra las fuentes» (dentro de «Fuentes») y el autor del dato estructurado es sólo el nombre y su página. (e) Revisión del archivo PAUSADA (`REVISION_DEL_ARCHIVO=no`): es el repaso de las 1.459 notas viejas con el criterio de hoy; llevaba 291. (f) Borrados los worktrees viejos de agentes (`.claude/worktrees/`). (g) Workflows de diagnóstico a mano: «Estado del motor», «Estado del reloj», «Motor: ensayo», «Diagnóstico de Instagram». (h) Medido: el repositorio creció 101 MB del 16 al 23/10 (54 MB web/data, 41 MB fotos); con el tope y un compactado cada tanto alcanza; mover el estado a R2 o las fotos fuera de git queda para si hace falta.
- **Archivo R2: ENCENDIDO el 23/10** (ruta `radarbalcarce.com/nota/*` → Worker `radar-balcarce-archivo`; vuelta atrás: workflow «Archivo permanente (producción)» con `sacar_ruta`). Se arregló el 503 (el Worker se llamaba a sí mismo en workers.dev). Falta: ruta de las fotos (`activar_fotos`) antes de bajar `TOPE_DE_NOTAS`.
- **Plan para que dure (Hernán, 23/10: «no importa si hay que cambiarlo todo; que dure y que terminemos para el lanzamiento»):** el repositorio creció 101 MB del 16 al 23/10 (54 MB de web/data, 41 MB de fotos; ~14 MB y ~100 commits por día). Etapas: (1) estado que cambia seguido (libro de redes, vigilancia, fichas, estadísticas, contadores) a R2, fuera de git; (2) fotos a R2; (3) sitio liviano: `TOPE_DE_NOTAS` ~400 y el resto desde R2 (compilación de 6,5 a 1–2 min, sin el tope de 20.000 archivos); (4) historial limpio antes de pasar a privado (con copia previa y confirmación). El panel del celular lee de git: se rehace de cero aparte.
- **Mío, en este orden:** (1) el plan de arriba. (2) Reordenar las APIs de IA: Gemini/Groq sólo para escribir y verificar notas; Cloudflare y OpenRouter para lo demás; medir los 429. (3) Mostrar a Hernán por qué se descartan hechos de 10+ medios (leer muy-contadas.json). (4) Fotos de deportes. (5) Firma / cartel «Redacción con IA» a «Fuentes». (6) Notas más originales y completas (300 palabras, contexto, títulos con el lugar, 36 h para lo local). (7) Fútbol sólo Primera + argentinos en el exterior. (8) Secciones flojas con una fuente y mejores fuentes (IA y tecnología). (9) Policial nacional muy relevante y muertes de famosos. (10) Agente de notas propias. (11) Cronograma y formato de las piezas de redes. (12) Estadísticas: robots vs lectores, medir nombres de víctimas. (13) Historial de GitHub: agrupar commits de libro de redes y vigilancia; un solo historial antes de pasar a privado (con confirmación).
- **De Hernán y Andrés:** los 3 pasos de GitHub de arriba; clave paga de Gemini para voces (guardar antes la referencia de las voces); Bluesky y Telegram; FOTOS_MENORES_OFICIALES=Si; borrar paneldatos y respaldos; Instagram 2FA. **Decisiones:** cartel IA; foto (con leyenda) o ilustración; control de nombres de chicos y víctimas en lo local; posteos por día (rinden poco: 5 vistas, 0,1 clics); cuántas notas guardar; un informe por día.
- **Redes (datos reales):** reels de Facebook: clima de la mañana 5.115 reproducciones promedio (máx 25.097), clima de la noche 370, farmacia 227, efeméride 204, repasos mañana y tarde 181, repaso de la noche 15; posteos de notas 5 vistas y 0,1 clics. Instagram: efeméride 12,6, repaso de noche 9,5, posteos 5,9. Las historias de Facebook no devuelven métricas.
- **Visitas:** desde el 19/10 casi todo figura de Francia y Estados Unidos (robots); lectores reales de Argentina 6 a 11 por día. Facebook trae la mayoría de los reales.
- **Revisión del archivo:** 291 de 1.459 revisadas; sigue sola cada 2 h (usa pocos pedidos); termina en unos 4 días.

## En curso (si se corta, retomar de acá)
1. **Animaciones del repaso, guiones con continuidad y voces nuevas: terminado y subido** (reglas 300 a 302; `docs/redes/GUION-DEL-DIA-EJEMPLO.md`, `docs/redes/VOCES-NUEVAS.md`). Falta oírlo y verlo: el ejemplo renderizado está en el scratchpad de la sesión; rehacerlo con `node reels/guion-del-dia.mjs` y los scripts de reels. Voces: guardar la referencia de las voces actuales ANTES de cambiar la clave de Gemini.
2. Respuestas de ChatGPT y Gemini abiertas en el Chrome sobre posicionamiento en buscadores y en IA, MCP y cómo postear en Facebook: leerlas y anotarlas en `docs/auditoria-2-0/08-IDEAS-DE-OTRAS-IA.md`.
3. Estado completo y lista de pendientes, en un solo lugar: `docs/HOY.html`.

## Pendiente de Hernán y Andrés (una sola lista: `docs/PASOS-PARA-HERNAN-Y-ANDRES.html`)
Clave de OpenRouter en GitHub; variable `FOTOS_MENORES_OFICIALES`; cuentas de Bluesky y Telegram; permisos del token de Cloudflare; dos tokens de GitHub y la llave de R2 (para la mudanza); ordenar las claves de Google; borrar `panel\datos` y `respaldos` en la PC.

## Decisiones abiertas (preguntar una vez)
- Posteos por día en Facebook (propuesta de 8; `docs/redes/PROPUESTA-POSTEOS-POR-DIA.md`) y la barra de 5 medios para lo de afuera.
- Acortador de enlaces: subir el Worker y poner la ruta (`docs/redes/ACORTADOR-DE-ENLACES.md`).
- Cuatro fuentes de España apagadas: no prender (Hernán: "no es necesario sumar fuentes de afuera").
- Limpiar el historial de GitHub (una sola versión con el estado actual, con copia previa en R2): irreversible; pedir confirmación.
- Elegir una de las dos portadas de `docs/diseno/VISTA-PREVIA-PORTADA-2.html` (sin cambios grandes hasta que termine todo).

## Esta semana (lunes a viernes)
Mirar la estadística de selección (cuántas notas llegan, con cuántos medios, dónde caen). **Ojo:** `MINIMO_NACIONAL` y `MINIMO_AREAS_CHICAS` (cuántos medios hacen falta, 3 y 2) los está armando el agente de criterio simple y todavía no están en `main`; hasta que se junte su trabajo, el criterio es el de las reglas 215 a 218 de `docs/10-REGLAS-Y-PRUEBAS.md`. No son cupos: los cupos no existen. Si se llega muy rápido a 150 por día, sumar fuentes o subir el mínimo; si una sección falta (tecnología), darle prioridad sin que cuente en el tope.

## Si se acaban los tokens de Claude
`scripts\claude-con-openrouter.cmd` (DeepSeek V4 Pro por OpenRouter, con la clave que ya está en la PC) o `node scripts/deepseek.mjs "pregunta"`. Detalle en `docs/11-OPERACION.md`.

## Semana del 26/10: redes, reels y animaciones (acordado el 23/10)

- No bajar posteos de notas en redes con las estadísticas de hoy: la cuenta recién arranca y todavía no es conocida. Se decide con la cuenta crecida.
- Pensar más reels (en Facebook rinde el video corto) y elegir con qué noticias empezar: lo de Balcarce y la zona, el resumen del día y lo nacional más contado. A definir con Hernán.
- Revisar las animaciones mirando lo que está publicado hoy en Facebook e Instagram. Los videos de `reels/salida/` son viejos y no sirven de referencia (el de farmacia ya tiene otro diseño).
- Armar bien todas las redes: bio, formato por red y continuidad de las voces.

## Para correr a mano (lo frenó el permiso de Claude Code, 23/10)

- **Compactar el historial**: el archivo ya está en 498 notas y hay respaldo del 23/10. En GitHub → Actions → «Compactar el historial» → Run workflow → escribir `COMPACTAR`. Después, en la PC: `git fetch origin && git reset --hard origin/main && git reflog expire --expire=now --all && git gc --prune=now --aggressive`.
