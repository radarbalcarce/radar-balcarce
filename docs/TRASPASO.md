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

## Estado al 23/10/2026
- **Mudanza a Cloudflare: HECHA.** Web, tareas, redes y video corren en Cloudflare (reloj `NUBE`). Quedan a mano (el sistema de permisos no me dejó): apagar los 7 workflows viejos de GitHub (Actualizar la web, Redes, Vigilancia, Auditoría IA, Pistas, Informe diario, Ilustrar notas), tope de gasto de Actions en US$ 0, y repositorio principal a privado (mirar un día que todo siga bien).
- **Cambios del 22/10 y 23/10:** lo de Balcarce ya no espera por palabras sensibles (`liberadaPor` anota la palabra); una nota sale en un solo formato (posteo o repaso); informe por mail corto; vigilante avisa cada 24 h y sin «se arregló»; fotos con IA con FLUX, objetos de hoy y luz clara; el prompt de cada imagen lo escribe la IA de texto de Cloudflare (POST /texto del Worker de imágenes) y Gemini/Groq quedan de respaldo; `web/data/muy-contadas.json` guarda los hechos de 8+ medios que no salen, con motivo.
- **PENDIENTE PARA MAÑANA (Hernán, sí o sí): reordenar todas las APIs de IA.** Hoy Gemini y Groq (gratis) se quedan sin cupo (429). Plan: Gemini y Groq SOLO para escribir y verificar notas; Cloudflare Workers AI (gratis) para los prompts de fotos y lo que se pueda; OpenRouter (falta la clave `OPENROUTER_API_KEY` en GitHub) de respaldo. Mirar el control de imágenes con visión (hoy Gemini → Groq; sin cupo no pasa ninguna) y repartir cuotas por tarea.
- **Archivo permanente en R2:** ya archiva en cada vuelta (1.124 notas, `/_archivo/estado` ok). La ruta `radarbalcarce.com/nota/*` y las fotos a R2 se activan antes del 10/11 (el sitio llega al tope de 3.700 notas hacia el 13/11 a ~120 por día): workflow «Archivo permanente (producción)» con `activar_ruta` (y `activar_fotos`); se saca solo si el sitio no da.
- **Redes (datos reales, Facebook SÍ se mide):** reels de Facebook: clima de la mañana 5.115 reproducciones promedio (máx 25.097), clima de la noche 370, farmacia 227, efeméride 204, repasos de mañana y tarde 181, repaso de la noche 15; los posteos de notas: 5 vistas y 0,1 clics. Instagram: efeméride 12,6, repaso de noche 9,5, posteos 5,9. Pendiente: revisar el cronograma y el formato de cada pieza con estos números; las historias de Facebook no devuelven métricas.
- **Ideas pedidas por Hernán, sin hacer:** Fútbol solo Primera y futbolistas argentinos en el exterior; secciones flojas con una sola fuente y fuentes mejores (IA y tecnología); agente que proponga notas propias (lanzamientos); cambiar la firma/cartel «Redacción con IA» (pasarlo a «Fuentes»); policial nacional muy relevante y muertes de famosos con muchas fuentes; analizar por qué se descartan hechos con 10+ medios (ver `web/data/muy-contadas.json` en unas vueltas).

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
