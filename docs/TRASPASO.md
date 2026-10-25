# Traspaso: cómo se trabaja y dónde estamos

*Corto a propósito (25/10/2026). Para retomar con otra sesión leer primero `CLAUDE.md`, después este archivo y `PENDIENTES.md`, que es **la única lista de tareas**.
El traspaso largo del 23/10 está en `docs/historico/TRASPASO-HASTA-24-10.md`.*

## Cómo se trabaja

- Hablar siempre en castellano rioplatense, claro. Los dueños (Hernán y Andrés) no programan: **pedirles cada cosa una sola vez**, con el enlace y el paso; desde el celular, un paso por mensaje.
- Nada legal ("no busques temas legales"), nada de costos nuevos, ningún interruptor sensible se prende sin que lo pidan.
- Antes de subir: `rm -rf web/out` y `npm test` completo; `git pull --no-rebase` antes del push. Los datos de `web/data/` los commitea el motor de Cloudflare cada media hora ("Datos de la portada"): no commitear los que cambie `npm run datos`.
- Los agentes trabajan en worktrees aparte (`.claude/worktrees/`) y se juntan con `git merge --no-ff`. Ya no se numeran reglas nuevas: un arreglo nuevo se anota en la R que corresponde de `docs/10-REGLAS-Y-PRUEBAS.md` (columna «absorbe») o, si es de verdad nuevo, como R40. Si dos agentes suman una R a la vez, se renumera al unir.

## Dónde estamos (25/10/2026, diez renglones)

1. **Todo corre en Cloudflare**: el motor en Workers Builds, las tareas (vigilancia, informe, pistas, auditoría IA, ilustraciones, redes) en el Worker `radar-balcarce-tareas`, el video en el repositorio público `radarbalcarce/radar-balcarce-render`; el reloj es `radar-balcarce-reloj` y decide con la variable `NUBE`. Los workflows viejos de GitHub quedan de vuelta atrás y se apagan a mano.
2. **Si algo deja de salir**: mirar el mail de avisos, Cloudflare → Workers → `radar-balcarce-reloj` (el vigilante de vueltas pide una vuelta si la última buena tiene 40 minutos o más), el estado del motor (workflow «Estado del motor») y el interruptor de redes (`REDES_ACTIVAS_NUBE`).
3. **El sitio** guarda 500 notas (`TOPE_DE_NOTAS`); el resto sale del archivo permanente en R2 (encendido el 23/10).
4. **La selección** no tiene cupos: 3 medios lo nacional, 2 las áreas chicas, 8 lo muy contado (`docs/CRITERIO-EN-UNA-PAGINA.md`). Desde el 25/10 (regla 327) la fecha del hecho es la mediana de las fuentes y lo de afuera se estrena con el hecho de hasta 24 horas (36 lo de Balcarce). La estadística de la selección se mira cada semana.
5. **Redes**: hasta 5 posteos por día en Facebook (sólo Balcarce o lo más contado), tres repasos con voz y las piezas fijas; cupo de voz de 10 audios por día.
6. **Prendido**: tarjetas en R2 y vuelta de noche por hora (24/10); mapas partidos por mes, mapa del archivo y revisión del archivo (25/10). **Apagado y listo para prender**: fotos en R2, enlaces cortos, notas con datos propios, fotos con chicos de fuentes de Balcarce (`PENDIENTES.md` § 2).
7. **Documentos** ordenados el 25/10 (`docs/propuestas/LIMPIEZA-DE-DOCUMENTOS-25-10.md`): lo viejo está en `docs/historico/`; la puerta de entrada es `docs/00-INDICE.md`.
8. **Última auditoría**: `docs/auditoria-2-0/` (los módulos que siguen abiertos y el estado en F); los cerrados, en `docs/historico/auditoria-2-0/`.
9. **Reglas**: las vigentes son R1 a R39, con sus pruebas, en `docs/10-REGLAS-Y-PRUEBAS.md` (la lista vieja de 1 a 327, en `docs/historico/REGLAS-1-A-327.md`); qué se decidió y por qué, en `docs/DECISIONES.md` (lo nuevo arriba).
10. **Repositorio todavía público**: nada sensible va sin cifrar (lo que espera a una persona viaja cifrado para el celular).

## Si se acaban los tokens de Claude

`scripts\claude-con-openrouter.cmd` (DeepSeek por OpenRouter, con la clave que ya está en la PC) o `node scripts/deepseek.mjs "pregunta"`. Detalle en `docs/11-OPERACION.md`.

## Si se corta una sesión a mitad de un cambio

Mirar `git status` y `git log -3` en la rama del agente, correr `npm test` y seguir desde `PENDIENTES.md`. Cada tanda deja anotado su arreglo en la R que corresponde de `docs/10` y su decisión en `docs/DECISIONES.md`.

## Para la sesión nueva (cierre del 25/10/2026, madrugada)

**Regla de oro de Hernán (25/10):** "revisar / mirar / ver si" = **informar y proponer, NO implementar ni publicar**. Nada nuevo a producción sin que lo pida; un cambio por vez; pocos agentes; dejar andando lo que funciona. Lo nuevo está APAGADO hasta que lo pida.

**Andando y estable:** criterio limpio de tiempos y de texto (regla 327), mapas de Google partidos y del archivo (`SITEMAP_PARTIDO`, `SITEMAP_DEL_ARCHIVO`, Worker del archivo subido y mapas enviados a Search Console el 25/10), revisión del archivo (`REVISION_DEL_ARCHIVO` = si, 25/10), motor en Cloudflare (vuelta cada 30 min de día y 1 por hora de 23:00 a 6:59; `MOTOR_NOCHE_CADA_HORA`), imágenes de notas en R2 (`TARJETAS_EN_R2=Si`), freno de minutos por ciclo (11 al 10; ~5.000 de 6.000, US$ 0 de excedente), reloj y vigilante desplegados `con la nube`, fotos sin Wikimedia en notas con fuentes (regla 319), SEO técnico (321), hecho principal (322), teléfonos útiles nuevos (324), fotos sin cupo y títulos de deportes (326). El repaso nuevo se SACÓ de producción (queda en la rama `worktree-agent-a366ff7143db2afe9`, commit 504aaf64).

**Apagado (no prender sin pedido):** notas con datos propios (`NOTAS_CON_DATOS`, regla 323: Hernán dijo "descartarlo por ahora"), pausa general (317, escrita y subida pero sin uso), enlaces cortos, fotos en R2 (`FOTOS_EN_R2`), fotos con chicos de fuentes de Balcarce.

**Cosas que muerden de hoy:** al correr «Cargar variables del motor» poner `simular` = No (por defecto Si deja la web sin publicar); al desplegar Workers tildar «con la nube»; el sistema de permisos bloquea desplegar el Worker del archivo y apagar workflows viejos (los hace una persona); `gh`/Chrome: usar el Chrome de Radar Balcarce (Browser con Windows local) para Cloudflare/GitHub/Search Console.

**Pendiente (ver `docs/CHECKLIST-JUEVES-29-10.md` y `PENDIENTES.md`):** jueves 29/10 mirar estado y decidir el cambio del sitio por Worker (`docs/proyecto/SITIO-POR-WORKER-PLAN.md`); renovar «Participá» antes del 31/10 (dejarlas igual por ahora); apagar los 7 workflows viejos de GitHub; una prueba nueva del repaso falla en esta PC por memoria (ya fuera de producción); workflow manual «Sitio de prueba» (vista previa aparte) listo y sin ejecutar.
