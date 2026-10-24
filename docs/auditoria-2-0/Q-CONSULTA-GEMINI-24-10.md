# Consulta a Gemini sobre el modelo de Radar Balcarce (24/10/2026)

*Es una opinión externa de una IA, hecha desde el Chrome de Radar Balcarce con una descripción del proyecto sin claves ni datos privados (la pregunta está al final). Se guarda tal cual la respuesta, resumida en lo que importa, y con el comentario de Claude. No es una decisión: es un insumo para la revisión independiente (`P-REVISION-INDEPENDIENTE.md`).*

## Lo que dijo (resumen fiel)

1. **¿Es el modelo correcto? "No."** Es un logro técnico, pero como producto periodístico "el valor agregado tiende a cero": un agregador que depende de lo que otros publican. Para 40.000 habitantes la gente busca proximidad, confianza y utilidad directa, no "eficiencia sintética".
2. **Riesgo con Google.** Las 117 páginas "rastreadas sin indexar" son la primera luz amarilla: Google las ve como reescritura sin valor diferencial (política de contenido generado a escala). Riesgo de desindexación progresiva o pérdida total de tráfico por un ajuste algorítmico. Señales de calidad que faltan: autoría real y visible, fuentes primarias con enlaces claros, aportes o datos propios (fotos, citas, gráficos), política editorial y de corrección con proceso de revisión humana.
3. **Contenido único hiperlocal:** servicios en tiempo real (farmacias de turno, clima con alertas rurales, cortes de luz y agua, rutas, transporte, residuos, teléfonos), agenda comunitaria unificada, empleo y clasificados locales, y resúmenes en lenguaje claro de lo que aprobó el Concejo Deliberante.
4. **Redes a 90 días:** mes 1, placas claras con utilidad inmediata y el clima de las 7:00 con buena voz; compartir a mano en grupos de vecinos de Facebook. Mes 2, reels cortos que respondan preguntas concretas y encuestas. Mes 3, canal de WhatsApp o Telegram con 2 o 3 mensajes diarios (la mayor tasa de apertura en pueblos), colaboración con clubes e instituciones.
5. **Qué se rompe primero:** los feeds y scrapers (los medios cambian), los cupos de IA y de voz, la indexación de Google. **Qué sobra:** el umbral de "3 medios" para lo nacional, la publicación masiva (65 clics en 28 días con decenas de notas por día demuestran que el volumen no funciona), la voz sintética para todo.
6. **Diez decisiones para 30 días:** sacar lo nacional; bajar a 5–10 notas locales clave por día; sección fija de Servicios; revisión humana antes de publicar; canal de WhatsApp; plantillas fijas para redes; página "Quiénes somos / Línea editorial"; enlaces explícitos a la fuente en cada nota; noindex en lo de bajo valor; un resumen diario matutino. **Cinco "no":** competir por la primicia, comprar seguidores, ilustraciones de IA que parezcan falsas, publicar sin revisión de veracidad, gastar en infraestructura.

## Comentario de Claude (qué coincide, qué no, y qué hacer)

**Coincide con lo que ya encontramos en nuestras auditorías:**
- Lo de **Search Console** (117 "rastreadas sin indexar", 337 "descubiertas sin indexar") apunta a calidad y no a lo técnico (`O-SEARCH-CONSOLE-24-10.md`).
- Falta **valor propio**: el informe de notas únicas con datos (`G` y `K`) va exactamente por ahí.
- **Servicios hiperlocales** (farmacias, clima, teléfonos útiles) ya existen y son lo más fuerte; falta destacarlos y mejorarlos (los teléfonos útiles tienen mala estética).
- **Canal de WhatsApp** y **resumen matutino**: ya estaban en el plan (`J` y `H`).
- **Transparencia** ("Quiénes somos", cómo se usa la IA, correcciones): existen, y la auditoría SEO ya pidió una página pública de correcciones y responsable editorial.

**Discrepancias para decidir (no se aplican solas):**
1. **"Eliminar por completo lo nacional."** Decisión del dueño (17/10): lo nacional por popularidad y lo muy contado va primero, porque el vecino lo lee en su medio. Gemini ve un costo de calidad: lo nacional es lo más replicado y lo que más pesa en el "scaled content". Una opción intermedia a evaluar: **menos notas nacionales pero más completas y con datos propios** (lo de ≥8 medios, que es "casi información pública"), y mantener lo local entero. Va a la lista de decisiones.
2. **"Revisión humana previa a publicar."** Choca con el diseño de un medio automático. Alternativa realista: revisión humana **por muestreo** y sobre lo sensible (ya existe el semáforo rojo), más una página de correcciones.
3. **"Publicar 5 a 10 notas por día."** Hoy salen unas 120. Hay que mirar con datos si menos notas aumenta o no la indexación (la estadística ya guarda el motivo de cada historia). Una vía de bajo riesgo: **noindex para lo de menos valor** (notas de 3 medios sin dato propio) sin dejar de publicarlas para el lector.
4. **"Ilustraciones de IA que parezcan falsas":** las ilustraciones de IA hoy llevan el crédito "Ilustración generada con IA". Hay que revisar si conviene seguir usándolas en Balcarce o preferir la placa.

**Qué hacer con esto.** No cambiar ninguna regla de selección por esta consulta sola. Cruzar con la **revisión independiente** (`P-REVISION-INDEPENDIENTE.md`, hecha a ciegas por otro agente con búsqueda web de las políticas actuales de Google) y con ChatGPT, y recién entonces decidir con el dueño.

## La pregunta que se envió (sin datos privados)

Descripción del proyecto (medio digital local automático, 40.000 habitantes, dos operadores no programadores, el robot lee ~125 feeds de ~75 medios, publica lo de Balcarce y lo nacional si lo cuentan 3 o más medios, reescribe con IA verificando contra las fuentes, Cloudflare con un Worker de reloj, redes con voz sintética), los datos reales de 28 días de Search Console y de redes, el presupuesto (US$ 5 por mes más cupos gratuitos) y seis preguntas: modelo, riesgos con Google, contenido único, crecimiento en 90 días, qué se rompe primero y qué sobra, y las diez decisiones y los cinco "no".
