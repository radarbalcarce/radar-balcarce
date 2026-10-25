# Fuentes candidatas para Ciencia, IA, salud y Policiales de servicio

*Probadas el 16/10/2026 con `curl` y el mismo User-Agent de la ingesta (`RadarBalcarce/0.1`). Son propuestas: **no se tocó `ingesta/fuentes*.mjs`**. La planilla completa (75 direcciones, con el estado de cada una) está en `CANDIDATAS-NUEVAS.json`; el porqué, en `DIAGNOSTICO-POLICIALES-CIENCIA-IA.md`.*

Regla de uso para todas: **resumen y cita de la fuente, nunca el texto completo copiado.** Lo único verificado: `argentina.gob.ar` publica bajo Creative Commons Atribución 4.0 (pie del sitio) y DW declara su copyright en el feed. El resto, a confirmar.

## Las que recomiendo (9)

| # | Medio (feed) | Dueño | Sección | Qué trae | Por qué |
|---|---|---|---|---|---|
| 1 | **Agencia CyTA** (ya activa) | Fundación Instituto Leloir | Tecnología | 10 notas, texto completo, foto; la última del 7/10 | Ciencia argentina. Hoy no puede salir sola: darle la marca "fuente sola" |
| 2 | **CONAE** `argentina.gob.ar/ciencia/conae/noticias/rss` | Estado nacional | Tecnología | 3 notas, texto completo; 1 en 72 h | Agencia espacial argentina (satélites, agua y cultivos) |
| 3 | **NASA Ciencia en español** `ciencia.nasa.gov/feed/` | NASA | Tecnología | 10 notas, texto completo y foto; la última del 15/10 | Poco volumen, mucha foto buena. La dirección `/es/feed/` da 404 |
| 4 | **DW Ciencia y tecnología** `rss.dw.com/xml/rss-sp-cyt` | Deutsche Welle | Tecnología | 15 notas, 7 en 72 h; resumen de 1 a 2 renglones, sin foto en el feed | Ciencia e IA mundial en castellano neutro; medio público |
| 5 | **MIT Technology Review en español** `technologyreview.es/rss` | MIT Technology Review | Tecnología (IA) | 11 notas, 7 en 72 h; un renglón | La mejor en IA y biomedicina con mirada seria |
| 6 | **INTA Informa** `intainforma.inta.gob.ar/feed/` | INTA (poner el mismo medio "INTA" que el feed actual) | Agro | 801 notas (usar tope de notas), texto completo y foto en 687; la última de hoy | Ciencia aplicada al campo con la mejor foto |
| 7 | **SENASA** `argentina.gob.ar/senasa/noticias/rss` | Estado nacional | Agro | 15 notas, 9 en 72 h, texto completo | Sanidad animal y vegetal (aftosa, influenza aviar) |
| 8 | **La Nación Tecnología** (reactivar) `lanacion.com.ar/arc/outboundfeeds/rss/category/tecnologia/` | La Nación | Tecnología | 19 notas, 16 en 72 h, texto completo y foto | Otro dueño que Infobae y Clarín: ayuda a llegar a 2 medios sin cambiar ninguna regla |
| 9 | **Ministerio de Seguridad de la Nación** `argentina.gob.ar/seguridad/noticias/rss` | Estado nacional | Policiales (servicio) | 15 notas, 6 en 72 h, texto completo, sin foto | Comunicados oficiales: estafas, fraude, trata, operativos. Sólo lo "de servicio" |

Nota de dueños: las fuentes de `argentina.gob.ar` (Salud, INTA, SENASA, CONAE, Seguridad) son todas del Estado nacional; conviene ponerles el mismo `grupo: 'Estado nacional'` para no contar como "dos medios" a dos ministerios.

Salud pública: **ya está el Ministerio de Salud de la Nación** (15 notas, 7 en 72 h, texto completo). No hace falta otra; ANMAT es casi todo trámites administrativos (2 notas en 72 h).

## Opcionales (si Hernán y Andrés levantan la decisión del 27/09 sobre medios de España)

| Medio | Para qué | Nota |
|---|---|---|
| Hipertextual · IA | El feed más centrado en IA que encontré | 15 notas, sólo 3 en 72 h |
| El País · Ciencia | El mejor feed de ciencia en castellano que probé | 40 notas, texto largo y foto |
| The Conversation (español) | Artículos de especialistas | 35 en 72 h, mitad España, mitad temas que no son ciencia; hace falta filtro por palabras |
| Genbeta | IA y seguridad | Mismo dueño que Xataka (Webedia): cuenta como uno |

## No recomendadas, con motivo

- **No andan:** CONICET (feeds apagados, error 500; tampoco "CONICET en los medios"), Télam (cerrada), Fiscales.gob.ar (500), Fiscalía de la Provincia (404), Ministerio de Seguridad bonaerense (no responde), Policía Federal (404), Agencia Nacional de Seguridad Vial (feed vacío), Agencia SINC (404), RTVE (notas de 2009), National Geographic (403), Muy Interesante México (410), Agencia TSS de la UNSAM (404), UNMdP (feed vacío), NASA `/es/feed/` (404), Servicio Meteorológico (403).
- **Andan pero muertas o vacías:** Argentina.gob.ar Ciencia (2 notas, la última del 24/09), INTI (la última del 7/10), Exactas UBA (9/10), ESO (19/08), Página/12 Ciencia (24/06), Chequeado (25/08), La Nación Ciencia, Infobae Ciencia y Cronista Tecnología (vacíos).
- **Andan pero no suman:** TN Tecno (mismo dueño que Clarín: cuenta como uno), Infobae Salud (mismo medio que ya leemos), BBC Mundo (los feeds por tema no existen; es el general), Xataka México y FayerWayer (clickbait y ofertas con un poco de IA), Wired en español y Muy Interesante España (un renglón y consumo), Europa Press "Ciencia" (trae política internacional), UNLP (agenda universitaria), OPS/OMS (2 notas).

## Próximo paso sugerido

1. Decidir la marca "fuente sola" (cambio C1 del diagnóstico).
2. Si se aprueba: sumar las 8 fuentes nuevas con `fuenteSola: true` (CONAE, NASA, DW, MIT TR, y opcionalmente INTA Informa y SENASA), reactivar La Nación Tecnología, y correr `node ingesta/listar-fuentes.mjs`.
3. Antes de abrir cualquier cosa de Policiales: resolver los dos huecos de seguridad de la sección 5 del diagnóstico.
