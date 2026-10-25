# Propuesta: dos bloques nuevos de la tapa (sin hacer)

*17/10/2026. Propuesta, no está en el código: cambia lo que se ve en la portada y eso lo deciden Hernán y Andrés
(`CLAUDE.md`, "cambios visibles del sitio: consultar"). Sale de la auditoría de Radar 2.0
(`docs/historico/auditoria-2-0/02-FUENTES-CRITERIO-REPETIDAS.md`, § 2.5 y § 4.3). Lo que sí se hizo ese día, en `docs/DECISIONES.md`
(reglas 197 a 202).*

## 1. "En los medios de Balcarce"

**Qué es.** Un bloque chico (3 a 5 renglones por día) con lo que publican los medios de acá y no es una nota de Radar:
"Hoy en Gabal: entrevista a Mario Bolla", "Radio Líder Balcarce Stream cumple dos semanas". Cada renglón dice
**el medio, su título tal cual y el enlace a su nota**. Sin reescribir y sin gastar IA.

**Por qué.** Desde el 17/10 (regla 199) eso no se publica como nota (`ingesta/no-es-nota.mjs`: el medio que habla de sí,
el que anuncia su entrevista, su sorteo). Queda en rojo con el motivo "no es nota: …". Los medios de acá "son parte de la
historia del pueblo": el bloque les manda lectores en vez de esconderlos, y no se hace pasar por nota propia.

**Qué haría falta.**

- `generar-datos.mjs` junta lo de las últimas 24 horas con motivo `no es nota: el medio anuncia…` o `…habla de sí mismo`
  (no los sorteos, no el clima ni las farmacias, no el comercio) en un campo nuevo de `portada.json`
  (`deLosMedios: [{ medio, titulo, enlace, fecha }]`), con el título del medio, recortado y sin tocar.
- `web/app/page.js` lo muestra debajo del bloque de Balcarce, o en la página de la sección Balcarce.
- Nunca a las redes, ni a los repasos.
- Las "opiniones" de un medio (columnas, editoriales) podrían ir ahí como "Lo que se dice", con el medio y el autor: hoy
  no se detectan (haría falta el tipo de nota de la IA, abajo).

**A decidir:** ¿en la tapa o sólo en la sección Balcarce? ¿cuántos renglones? ¿con el logo del medio o sólo el nombre?

## 2. "Lo que se cuenta en todo el país"

**Qué es.** Un bloque debajo de las cinco de arriba con hasta 3 notas muy contadas (regla 197: 8 medios o más, o 5 en
sus primeras 3 horas), ordenadas por medios y frescura.

**Hoy** las muy contadas ya salen sin cupo y van primeras en su sección durante 6 horas (`primeroLasMuyContadas`,
`web/lib/datos.js`), sin bloque nuevo. El bloque es un paso más: hace falta `armarTapa` y el diseño de la portada.

**A medir antes:** la auditoría encontró que lo nacional se lee poco lo cuenten 3 o 30 medios (0,35 a 0,74 visitas por
nota de afuera). Con la vidriera de "primera en su sección" se puede medir dos semanas si las muy contadas se leen más;
si no, el bloque no vale la pena.

## 3. Lo que también quedó propuesto

- **Estrenar hasta 24 horas una muy contada** que sigue sumando medios (hoy, como todo, 12): toca la regla de la fecha
  ("una nota tiene una sola fecha"), que trabaja otra parte del rediseño.
- **El "tipo de nota" en la ficha de la IA** (del medio, programación, sorteo, rifa, comercio, opinión, gestión,
  servicio), para no depender de palabras sueltas. Se dejó para cuando se rehaga la lectura con IA: hoy la red de código
  de `ingesta/no-es-nota.mjs` frenó, sobre 1.112 notas publicadas, las 10 que tenía que frenar y ninguna más, y la
  publicidad de un comercio ya la saca la ficha (`es_publicidad`).
- **Un solo mínimo de medios para lo de afuera** (4, en vez de 2, 3 o 4 según la sección): la simulación del 17/10 muestra
  que al liberar el cupo también entran notas flojas de 2 medios ("Messi Cup 2026: cuándo se juega").
