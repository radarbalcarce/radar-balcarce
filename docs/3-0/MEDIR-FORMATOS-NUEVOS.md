# Medir el formato nuevo contra el viejo

*Escrito el 20/11/2026. Código: `v3/redes/comparar-formatos.mjs` (pruebas en `comparar-formatos.test.mjs`); botón: workflow «Radar 3.0: comparar formatos nuevos y viejos».*

## Para qué sirve

El 19/11 a la noche se prendió el kit 3.0 de reels (`KIT_3_0: si` en `v3-piezas.yml`). Hernán pidió medir 2 o 3 días si rinde lo mismo en Facebook e Instagram. **El criterio (20/11): el formato nuevo sirve si DUPLICA las reproducciones.** Si no, se vuelve al anterior o a algo parecido con más personalidad.

## Qué se compara

- Cada reel e historia publicado en Facebook e Instagram, pieza por pieza (hasta ahora el sistema sólo guardaba totales por día).
- **Nuevo** = publicado desde el 20/11 00:07 UTC (21:07 del 19/11 en Balcarce) con el kit 3.0. **Viejo** = los 7 días anteriores, y lo posterior que haya salido con el dibujo de siempre.
- Siempre **un tipo de pieza contra sí mismo** (repaso de la mañana, de la tarde, de la noche, clima de la mañana, clima de la noche, farmacia, Un día como hoy, nota propia, útiles, avisos), por red. Nunca se mezclan tipos.
- Se mira de Instagram: reproducciones, alcance, me gusta, comentarios, compartidos, guardados, tiempo promedio de reproducción y retención. De Facebook: reproducciones, alcance, reacciones, tiempo promedio, vistas de 3 s y de 1 minuto. Si Meta cambió el nombre de una métrica y no la da, el informe lo dice (no se cae).
- La retención no la da Meta: es el tiempo promedio sobre lo que dura la pieza (aproximada).

## De dónde salen los datos

- Los ids de Meta y el estado de cada pieza están en la tabla `piezas` de la base (campo `acciones`).
- Si la pieza usó el kit nuevo queda anotado desde ahora con una marca `kit3:si` o `kit3:no` en el campo `archivos` de esa fila. Eso lo hace `v3/redes/piezas/correr.mjs`, que corre en GitHub Actions: sirve apenas se sube (push) el cambio, **sin desplegar ningún Worker**.
- La primera pieza (el repaso de las 21:07 del 19/11) salió antes de la marca y se reconoce por sus ids de Meta. Una pieza posterior al corte sin marca se **supone** nueva (el informe lo avisa).

## Cómo se corre

En GitHub: Actions, «Radar 3.0: comparar formatos nuevos y viejos», Run workflow (`desde` = 2026-11-20; dejar «Telegram» en sí). O pedírselo a Claude. Sólo lee, no gasta voz ni IA y no cambia nada. Deja el informe en el artefacto «comparacion-formatos» (`comparacion.json` con todo el detalle y `telegram.txt`) y manda el resumen corto por Telegram.

## Cómo leer el veredicto

Se calcula, por tipo y por red, el cociente nuevo/viejo de las reproducciones:

| Cociente | Se dice |
|---|---|
| 2 o más | duplica o más |
| 1,15 a 2 | mejora |
| 0,85 a 1,15 | igual |
| menos de 0,85 | peor |

Sólo cuentan los tipos con **3 piezas o más de cada lado**; el resto se muestra como «pocas piezas» y no pesa. Después, mirando la mayoría de los tipos de cada red:

- **Seguir con el nuevo:** en las dos redes, la mayoría duplica o más.
- **El nuevo no justifica el cambio:** hay datos pero la mayoría queda en igual o mejora. Volver al anterior o mezclar con más personalidad.
- **Volver al anterior:** en alguna red la mayoría rinde peor.
- **Sin datos suficientes / sólo una red:** esperar y volver a correrlo.

Además, como apoyo, el informe dice «por caída»: igual o mejor (no baja más de 15 %), hay que mirar (15 a 30 %) o conviene volver (más de 30 % en 2 o más tipos de una red). Todo es una **recomendación**: nunca cambia nada solo. Los umbrales están al comienzo del archivo.

## Para no engañarse

- **Edad de la pieza.** Meta da el total acumulado hasta el momento de medir. Por eso sólo se miden piezas con 24 horas o más de publicadas, y el informe muestra la edad de cada lado. Las viejas tienen días de ventaja: si el aviso dice que la comparación favorece al viejo, un «igual» del nuevo en realidad es mejor de lo que parece. Lo ideal es correrlo cuando las nuevas tengan 48 horas o más.
- **Franja horaria.** Las de la noche rinden muchísimo menos que las de la mañana y la tarde (en Facebook, «Un día como hoy» y «Lo que dejó el día» viejos tenían 2 o 3 vistas, el repaso de la noche nuevo 5, y los de la mañana o la tarde 220 a 360). Cada tipo se compara sólo con sí mismo; si cambió el horario o el día de la semana entre un lado y otro, el informe lo avisa, y siempre avisa cuando se comparan franjas distintas. Con vistas tan bajas, un «duplica» de la noche es ruido.

## Volver al formato anterior

Paso exacto, cuando Hernán lo decida (pedirlo en el chat):

1. En `.github/workflows/v3-piezas.yml`, sacar la línea `KIT_3_0: si`.
2. Subir el cambio (commit y push; no hace falta desplegar ningún Worker). Cada pieza que salga desde ahí vuelve a dibujarse con el sistema de antes.

Cambia **sólo el dibujo**: la voz, los textos, los horarios, el cupo de voz y la compuerta de tono siguen igual. Si el kit falla en una pieza, ya hoy esa pieza sale con el dibujo viejo y queda anotado.
