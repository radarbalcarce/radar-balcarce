# motor/

Los cimientos del motor nuevo (ver `docs/historico/etapa-10-operacion/DISENO-MOTOR.md`, sección 2).
Por ahora hay dos cosas, y **ninguna toca producción**: el esquema de la base y un
importador que sólo *lee* el repositorio.

- `esquema.sql`: las tablas (SQLite, que es lo mismo que D1). Es la migración 0001: sólo
  lo que hoy se puede llenar con `web/data/` (notas, direcciones, redirecciones, fotos,
  retiradas, correcciones, decisiones del celular y la portada). Lo que escribe una
  persona lleva `por`, `cuando` y `motivo` obligatorios.
- `importar.mjs`: lee `web/data/*.json` y los vuelca a una base local con `node:sqlite`
  (viene con Node 24, no hay que instalar nada). Se puede correr las veces que se quiera:
  vacía y vuelve a llenar todo en una sola transacción.

## Cómo correrlo

    node motor/importar.mjs                       # arma motor/salida/radar.sqlite
    node motor/importar.mjs --base=otra.sqlite    # a otra base
    node motor/importar.mjs --datos=otra/carpeta  # desde otra carpeta de datos
    node --test pruebas/motor-espejo.test.mjs     # la prueba de espejo

`motor/salida/` se ignora sola en git. El importador nunca escribe en `web/data/`.

## La prueba de espejo

Compara lo que sale de la base con los JSON de origen: cantidad de notas, ids (y su
orden), fechas, secciones, direcciones y cada nota entera. Si no hay
`web/data/archivo.json`, corre con datos chicos inventados.

## Lo que el importador rechaza (y anota)

Una fila que no cumple el esquema no se pierde en silencio: queda en la tabla
`importacion_rechazos` con su razón y se cuenta en el resumen. Hoy, con los datos reales,
son 12 decisiones del celular de tipo "publicada" que no traen `motivo`. Cuando se arme el
puente hay que decidir qué motivo se les pone.

## Qué falta (a propósito)

Historias, items crudos, versiones de nota, uso de IA, libro de redes, mediciones y el
resto de las tablas del diseño: se suman en migraciones siguientes, cuando haya quien las
escriba. Tampoco hay todavía `almacen.mjs` ni nada que escriba en D1.
