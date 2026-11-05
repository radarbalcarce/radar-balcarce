# Rehacer las notas migradas del último mes (5/11/2026)

*Para Hernán y Andrés. Sólo lectura: no se gastó ningún pedido a una IA ni se tocó producción. Los números salen de leer una por una las páginas públicas de `radarbalcarce.com` (2.789 notas, desde los mapas `sitemap-2026-10.xml` y `sitemap-2026-11.xml`; sin errores de lectura) y del código de `v3/`.*

## 1. Qué se midió y cómo

- **Migradas del último mes** = las notas con fecha del 5/10 al 2/11 (el corte a la 3.0 fue el 3/11): **2.348**. Las del 3/11 en adelante (242) ya son del motor nuevo y no entran.
- Se midió, nota por nota: foto (si la página trae `<figure>`; sin foto sale la imagen genérica `og-default.png`), palabras del cuerpo (sin la publicidad), firma, título repetido o casi repetido.
- Lo que **no** se pudo medir: la dirección repetida que ya redirige (el sitio la unifica solo) y qué tan «mala» es una foto de fuente ajena (eso pide mirarla a ojo).

## 2. Los números

| Qué | Cuántas | Comentario |
|---|---|---|
| Migradas del 5/10 al 2/11 | **2.348** | unas 81 por día (de 27 a 182 según el día; del 26 al 30/10 subió a ~150) |
| **Sin foto** (placa genérica) | **421** (18 %) | 411 son notas comunes; 10 son repasos, clima y datos propios |
| Con cuerpo corto (< 70 palabras) | **2** | la mediana es de 164 palabras: el cuerpo ya cumple casi en todas |
| Con bajada y título | 2.348 | todas |
| Con «Fuentes (N)» | 2.293 (98 %) | las otras son propias o repasos |
| Repetidas por dirección exacta (mismo título sin el código final) | **5** grupos, 5 sobrantes | |
| Repetidas por título casi igual (palabras en común ≥ 70 %, mismo día o día siguiente) | 12 pares | un chequeo grueso, hay que mirarlas a ojo |
| **Sobrantes por repetición (todo junto)** | **17** | las que habría que unir o retirar |
| Con foto que dice «Ilustración generada con IA» en el epígrafe | 232 (10 %) | hoy cuentan como foto; ver punto 5 |
| Con «escrita con IA» visible en la firma | **0** | las migradas firman «Radar Balcarce»; no hay nada que sacar |

Por sección, las sin foto se concentran en Cultura (71), Fútbol (62), Balcarce (48), Economía (45) y Política (35).

## 3. Qué vale la pena rehacer

La conclusión incómoda: **el formato ya está casi cumplido en las migradas** (título, bajada, cuerpo largo, sin «escrita con IA»). Lo que falta es otra cosa:

1. **421 sin foto.** Es el grueso. No pide reescribir texto: pide ponerles foto (de las fuentes de la nota, o placa) o una ilustración. Si se las quiere pasar por el modelo chico para renovar el texto de paso, son 411 (sin contar repasos y datos propios).
2. **17 repetidas.** Se resuelven sin IA (unir con la que salió primero y redirigir). Mejor mirarlas a mano o con el script de huellas.
3. **2 de cuerpo corto.** Se rehacen con el modelo (o a mano).
4. **Repasos y clima indexables** (84 por la dirección): ya figuran en `TECNICA.md` punto 8; es `noindex`, no reescritura.

**Total a tocar: unas 436 notas** (421 sin foto + 2 cortas + 17 repetidas, restando solapamientos: 436 en la medición). Reescribir las 2.348 enteras es posible pero no aporta lo que falta: las 1.910 que ya tienen foto, cuerpo y firma no ganan nada visible.

## 4. Costo y ritmo

**Costo por pedido** (con los precios de `v3/nucleo/nucleo.mjs`: US$ 0,10 por millón de tokens de entrada y 0,40 de salida, de Gemini 3.1 flash-lite): una nota rehecha son unos 4.000 tokens de entrada (criterio + nota vieja) y 700 de salida, **unos US$ 0,0007**. Es una estimación mía de tamaño, no una medición.

| Alcance | Pedidos (1 por nota) | Costo estimado |
|---|---|---|
| Lo que falta de verdad (436) | 436 | ~US$ 0,30 |
| Las 411 sin foto, con texto renovado | 411 | ~US$ 0,29 |
| Las 2.348 del mes | 2.348 | ~US$ 1,60 |

**Dinero no es el problema.** Los límites que sí pesan, según `v3/nucleo/REGLAS.md` y `docs/3-0/UN-DIA-DEL-SITIO.md`:

- **Tope diario del núcleo: 500 pedidos** (`NUCLEO_TOPE_DIARIO`). El motor, con ~100 notas nuevas por día a 2 pedidos cada una, ya usa unos 200 a 250. Queda **margen de ~250 por día**, pero compartido con el clima (hasta 4) y las correcciones.
- **Freno mensual de US$ 7** (texto y voces juntos; Hernán quiere quedar por debajo de US$ 10). Las 2.348 notas sumarían ~US$ 1,60: entran holgadas, **pero** el gasto real del núcleo hasta hoy no está medido en el repositorio (vive en la base, se ve en el informe de las 8 y las 20): conviene mirar cuánto va antes de arrancar.
- **No encontré en `v3/` los cupos gratuitos por minuto o por día de Groq ni de Mistral**; el sistema viejo (`CLAUDE.md` de la raíz) hablaba de un tope propio de 400 pedidos por día para Mistral y del respaldo pago de Gemini con tope de 30 por día. En la 3.0 el núcleo escribe sólo con la clave paga de Gemini. **A confirmar con Hernán** antes de usar las otras como respaldo para este trabajo.

**Ritmo propuesto** (para que no compita con las notas del día ni toque el freno):

| Etapa | Qué | Ritmo | Días |
|---|---|---|---|
| 0 | Unir o retirar las 17 repetidas (sin IA) | de una vez | 1 |
| 1 | Las 2 cortas + las 411 sin foto, con foto y texto renovado | **60 por día** (de noche, fuera de las vueltas de más notas) | 7 (hasta ~14/11 si se arranca el 6/11) |
| 2 | **Opcional**: el resto de las 1.900 que ya están bien | 60 por día | 32 más (hasta ~16/12) |

A 60 por día el gasto extra es de US$ 0,04 por día, el techo de pedidos del día queda lejos de 500 y se llega a diciembre con las dos etapas. Sugiero hacer la 0 y la 1 y **decidir la 2 después de mirar 20 notas rehechas**: si ya estaban bien, no se rehace.

## 5. Cosas a decidir

1. **Qué foto**: la de las fuentes de la nota (regla vigente), la placa, o una ilustración con IA. Las 232 que ya dicen «Ilustración generada con IA» son una decisión de Hernán: ¿se mantienen?
2. **Las repetidas** (17): ¿las une un script (huella de significado) o se miran a mano?
3. **Usar Haiku o el flash-lite del núcleo**: el flash-lite ya tiene el criterio y el verificador armados; Haiku no está conectado al núcleo (no encontré clave ni código para eso), así que implicaría trabajo nuevo.
4. **Notas de F1, ESPN y clima con firma «armada con datos de…»** (44 en el mes): no rehacerlas con IA, son de plantilla.

## 6. Cómo se volvió a medir

Mapas de `https://radarbalcarce.com/sitemap-2026-10.xml` y `sitemap-2026-11.xml`; lectura de 2.789 páginas `/nota/…` (8 a la vez, sólo GET). Los scripts quedaron en la carpeta temporal de la sesión, fuera del repositorio.
