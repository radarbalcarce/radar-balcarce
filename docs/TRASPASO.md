# Traspaso: cómo se trabaja y dónde estamos

*Corto a propósito (24/10/2026). Para retomar con otra sesión leer primero `CLAUDE.md`, después este archivo y `PENDIENTES.md`, que es **la única lista de tareas**.
El traspaso largo del 23/10 está en `docs/historico/TRASPASO-HASTA-24-10.md`.*

## Cómo se trabaja

- Hablar siempre en castellano rioplatense, claro. Los dueños (Hernán y Andrés) no programan: **pedirles cada cosa una sola vez**, con el enlace y el paso; desde el celular, un paso por mensaje.
- Nada legal ("no busques temas legales"), nada de costos nuevos, ningún interruptor sensible se prende sin que lo pidan.
- Antes de subir: `rm -rf web/out` y `npm test` completo; `git pull --no-rebase` antes del push. Los datos de `web/data/` los commitea el motor de Cloudflare cada media hora ("Datos de la portada"): no commitear los que cambie `npm run datos`.
- Los agentes trabajan en worktrees aparte (`.claude/worktrees/`) y se juntan con `git merge --no-ff`. Los números de regla chocan entre agentes: mirar `docs/10-REGLAS-Y-PRUEBAS.md` (y "la próxima regla" de `CLAUDE.md`, que una prueba controla) antes de numerar.

## Dónde estamos (24/10/2026, diez renglones)

1. **Todo corre en Cloudflare**: el motor en Workers Builds, las tareas (vigilancia, informe, pistas, auditoría IA, ilustraciones, redes) en el Worker `radar-balcarce-tareas`, el video en el repositorio público `radarbalcarce/radar-balcarce-render`; el reloj es `radar-balcarce-reloj` y decide con la variable `NUBE`. Los workflows viejos de GitHub quedan de vuelta atrás y se apagan a mano.
2. **Si algo deja de salir**: mirar el mail de avisos, Cloudflare → Workers → `radar-balcarce-reloj` (el vigilante de vueltas pide una vuelta si la última buena tiene 40 minutos o más), el estado del motor (workflow «Estado del motor») y el interruptor de redes (`REDES_ACTIVAS_NUBE`).
3. **El sitio** guarda 500 notas (`TOPE_DE_NOTAS`); el resto sale del archivo permanente en R2 (encendido el 23/10).
4. **La selección** no tiene cupos: 3 medios lo nacional, 2 las áreas chicas, 8 lo muy contado (`docs/CRITERIO-EN-UNA-PAGINA.md`). La estadística de la selección se mira cada semana.
5. **Redes**: hasta 5 posteos por día en Facebook (sólo Balcarce o lo más contado), tres repasos con voz y las piezas fijas; cupo de voz de 10 audios por día.
6. **Apagado y listo para prender**: tarjetas en R2, vuelta de noche por hora, fotos en R2, mapa del archivo, enlaces cortos, fotos con chicos de fuentes de Balcarce (`PENDIENTES.md` § 2).
7. **Revisión del archivo** pausada (`REVISION_DEL_ARCHIVO` = "no", 291 de 1.459).
8. **Última auditoría**: `docs/auditoria-2-0/` (módulos A a L y el estado en F); la segunda vuelta de documentación, en `docs/auditoria-2-0/M-SEGUNDA-VUELTA.md`.
9. **Reglas**: la lista numerada y su prueba, en `docs/10-REGLAS-Y-PRUEBAS.md`; qué se decidió y por qué, en `docs/DECISIONES.md` (lo nuevo arriba).
10. **Repositorio todavía público**: nada sensible va sin cifrar (lo que espera a una persona viaja cifrado para el celular).

## Si se acaban los tokens de Claude

`scripts\claude-con-openrouter.cmd` (DeepSeek por OpenRouter, con la clave que ya está en la PC) o `node scripts/deepseek.mjs "pregunta"`. Detalle en `docs/11-OPERACION.md`.

## Si se corta una sesión a mitad de un cambio

Mirar `git status` y `git log -3` en la rama del agente, correr `npm test` y seguir desde `PENDIENTES.md`. Cada tanda deja anotada su regla en `docs/10` y su decisión en `docs/DECISIONES.md`.
