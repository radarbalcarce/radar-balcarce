# Comparativa de modelos de IA para redactar notas (30/10/2026)

**Uso de referencia:** 6.300 tokens de entrada y 1.100 de salida por pedido; 200 a 300 pedidos por día (unos 7.500 por mes).

**Cómo se calcula:** costo por pedido = 0,0063 × precio de entrada + 0,0011 × precio de salida (precios en USD por millón de tokens). Costo por mes = costo por pedido × 7.500.

---

## 1. Precios pagos

| Modelo | Entrada | Salida | Por pedido | Por mes | Fuente |
|---|---|---|---|---|---|
| Gemini 2.5 Flash-Lite | 0,10 | 0,40 | US$ 0,00107 | US$ 8 | [Precios Google](https://ai.google.dev/gemini-api/docs/pricing) (oficial, actualizada 28/10/2026) |
| Gemini 3.1 Flash-Lite | 0,25 | 1,50 | US$ 0,00323 | US$ 24 | idem |
| Gemini 3.5 Flash-Lite (la más nueva de Flash-Lite en la página) | 0,30 | 2,50 | US$ 0,00464 | US$ 35 | idem |
| Gemini 2.5 Flash | 0,30 | 2,50 | US$ 0,00464 | US$ 35 | idem |
| Gemini 3 Flash (preview) | 0,50 | 3,00 | US$ 0,00645 | US$ 48 | idem |
| Gemini 3.6 Flash / 3.8 Flash | 0,75 | 3,75 | US$ 0,00885 | US$ 66 hasta el 31/12/2026; US$ 133 desde el 01/01/2027 (el precio se duplica) | idem |
| DeepSeek deepseek-flash, fuera de pico | 0,15 (caché no) | 0,60 | US$ 0,00161 | US$ 12 | [Precios DeepSeek](https://api-docs.deepseek.com/quick_start/pricing) |
| DeepSeek deepseek-flash, pico | 0,30 | 1,20 | US$ 0,00321 | US$ 24 | idem |
| DeepSeek deepseek-v4-pro, fuera de pico | 0,66 | 1,98 | US$ 0,00634 | US$ 48 | idem |
| DeepSeek deepseek-v4-pro, pico | 1,32 | 3,96 | US$ 0,01267 | US$ 95 | idem |
| Mistral Small 4 | 0,15 | 0,60 | US$ 0,00161 | US$ 12 (orden entrada/salida no confirmado) | [Ficha del modelo](https://docs.mistral.ai/models/model-cards/mistral-small-4-0-26-03) (16/03/2026; la página oficial de precios no lo muestra) |
| Groq gpt-oss-120b | 0,15 | 0,60 | US$ 0,00161 | US$ 12 | [Modelos Groq](https://console.groq.com/docs/models) |
| Groq llama-3.3-70b | no listado ("contactar ventas") | | | | idem |
| DeepSeek por OpenRouter | no confirmado | | | | no lo encontré en las páginas consultadas |

**Notas**

- **DeepSeek:** la página oficial **no lista `deepseek-chat`**. Lista `deepseek-flash` (DeepSeek V4.1 Flash) y `deepseek-v4-pro`. Los nombres viejos `deepseek-v4-flash` siguen aceptados, pero se cobran al precio de deepseek-flash. Hay que confirmar si `deepseek-chat` sigue funcionando. La página muestra precios con "$" y no indica la moneda.
- **Caché de DeepSeek:** si la mayor parte de los 6.300 tokens de entrada se repite (las instrucciones), la entrada cuesta US$ 0,003 por millón. El costo bajaría a unos US$ 5 por mes. Es una cota inferior estimada, no medida.
- **Horas de pico de DeepSeek:** 01–04 y 06–10 UTC, de lunes a viernes. En hora de Argentina son de 22 a 01 y de 03 a 07 (cálculo propio).
- **Gemini:** el alias `gemini-flash-lite-latest` no aparece en la página de precios. Con la factura real (US$ 0,005 por pedido), el precio que más se acerca es el de 3.5 Flash-Lite (US$ 0,0046 por pedido). Es una hipótesis, **no confirmado**. Conviene revisar en AI Studio qué modelo responde ese alias.

---

## 2. Límites del plan gratis

| Servicio | Límites | Estado | Fuente |
|---|---|---|---|
| Gemini Flash-Lite y Flash (gratis) | La página oficial no publica RPM, TPM ni RPD: remite a AI Studio. Terceros dan unos 30 RPM, 1 M TPM y 1.000 a 1.500 RPD para Flash-Lite. Las cifras se contradicen. | **no confirmado** | [Límites Google](https://ai.google.dev/gemini-api/docs/rate-limits), [AI Studio](https://aistudio.google.com/rate-limit?timeRange=last-28-days); terceros: [dev.to](https://dev.to/hiyoyok/gemini-api-cheatsheet-2026-free-tier-limits-models-and-endpoints-in-one-place-2god) |
| Gemini: tarjeta | El gratis requiere "proyecto activo o prueba gratis", sin tope de gasto. Pasar a pago exige configurar facturación. Si el gratis pide tarjeta: no confirmado. | oficial (parcial) | idem |
| OpenRouter, modelos `:free` | 20 RPM. 50 pedidos por día sin crédito. 1.000 por día con un crédito de al menos US$ 10 comprado (el historial total cuenta). | oficial, verificada en abril de 2026 | [Límites OpenRouter](https://openrouter.ai/docs/limits), [Blog](https://openrouter.ai/blog/tutorials/free-llm-apis-compared/) |
| OpenRouter: pago del crédito | Hay que comprar crédito (US$ 10 mínimo). Método de pago: no verificado. | oficial (parcial) | idem |
| Groq llama-3.3-70b (gratis) | 30 RPM, 1.000 RPD, 12.000 TPM. TPD no confirmado. | **no confirmado** (tercero) | [CostBench](https://costbench.com/software/llm-api-providers/groq/) |
| Groq gpt-oss-120b | Sólo plan Developer: 30 RPM, 1.000 RPD, 8.000 TPM, 200.000 TPD. Límites del plan gratis: no encontrados. | oficial, sólo plan Developer | [Límites Groq](https://console.groq.com/docs/rate-limits) |
| Mistral "Experiment" | La página oficial de precios no tiene ese plan; sólo un plan "Free" para Vibe y Studio. Terceros: unos 1 req/s, 500.000 TPM y 1.000 M tokens al mes (cifras de 2024). Piden verificación por teléfono y aceptar uso de datos para entrenar. | **no confirmado** | [Ayuda Mistral](https://help.mistral.ai/en/articles/455206-how-can-i-try-the-api-for-free-with-the-experiment-plan) (no se pudo abrir: 404) |

Tarjeta para el gratis: Gemini, no confirmado; OpenRouter, sí para cargar crédito (método no verificado); Mistral, según terceros no pide tarjeta pero sí teléfono; Groq y DeepSeek, no confirmado.

---

## 3. Qué implica para nuestro uso

- **Tokens por día:** 200 a 300 pedidos × 7.400 tokens (entrada más salida) = **1,5 a 2,2 millones de tokens por día**, unos 55 millones por mes. Un tope diario de tokens de decenas de miles no alcanza.
- **Groq gratis:** con 12.000 TPM, cada pedido completo ocupa casi todo el límite, así que sólo entran unos 1,6 pedidos por minuto. Hay que repartirlos a lo largo del día.
- **OpenRouter gratis:** con crédito sube a 1.000 pedidos por día, suficiente en cantidad. El 26/10 falló el 97 % de los pedidos, y la página advierte que los 429 del proveedor son otro límite. Cargar crédito resuelve el tope diario, pero no asegura que el proveedor responda. La página nombra sólo tres modelos gratis: llama-3.3-70b-instruct:free, qwen3-coder:free (1 M de contexto) y gpt-oss-120b:free. No menciona soporte de JSON.

---

## 4. Recomendaciones

**(a) Respaldo pago más barato (fuera de Google):** DeepSeek `deepseek-flash` fuera de pico, unos US$ 12 por mes con el volumen completo (menos con caché, unos US$ 5; unos US$ 24 en pico). Empata con Groq gpt-oss-120b y Mistral Small 4 en US$ 12. Gemini 2.5 Flash-Lite es el más barato (US$ 8), pero es de Google y ya forma la cadena principal.
Advertencias: moneda sin indicar, `deepseek-chat` sin confirmar y no evalué la privacidad ni dónde se procesan los datos.
Con el tope de US$ 10 por mes del respaldo, sólo entra si el respaldo cubre una parte del volumen.

**(b) Gratis como principal:** ninguno confirmado.
- **Mistral Experiment:** si valen las cifras de terceros, el tope mensual (1.000 M tokens) sobra con unos 55 M.
- **Gemini gratis:** si valen unos 1.000 pedidos por día, alcanza. Google no lo publica en su página.
- **Groq gratis:** no alcanza si el tope diario de tokens es de decenas de miles (no confirmado).
- **OpenRouter gratis:** no sirve como principal porque no resuelve la falla del proveedor.

**(c) Prueba de calidad:** 20 notas reales por modelo, con el mismo prompt (`ingesta/prompt-editorial.mjs`) y el mismo verificador (`ingesta/verificar.mjs`).
- **Modelos:** gemini-3.5-flash-lite (el actual), gemini-2.5-flash-lite (el más barato), deepseek-flash (fuera de pico y en pico), gpt-oss-120b en Groq y Mistral Small 4.
- **Medir:** JSON válido al primer intento, cuántas pasan el verificador, castellano rioplatense sin voseo forzado, tiempo de respuesta y fallos.
- **Costo de la prueba:** unos US$ 0,1 a 0,5 (100 pedidos).
- `reels/comparar-instruccion.mjs` podría servir de base. No lo revisé.

---

## Notas de método

- Los números marcados "no confirmado" salieron de terceros o no aparecen en la página oficial.
- No se pudieron abrir: la ayuda de Mistral (404), los límites del plan gratis de Groq y los precios de DeepSeek por OpenRouter.
- La página de OpenRouter dice "20+ modelos gratis" y nombra sólo tres.
- No se modificó ningún otro archivo.
