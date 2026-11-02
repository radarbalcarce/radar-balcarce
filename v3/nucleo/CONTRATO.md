# El contrato del núcleo (para los que lo programan)

*Qué se pasan las partes del núcleo y cómo se guarda. Lo fija Claude el 2/11/2026 para construir la etapa B en paralelo. Las reglas para
personas están en `REGLAS.md`; esto es la parte técnica. Si algo de acá contradice a `REGLAS.md`, manda `REGLAS.md`.*

## Decisiones de la etapa B

- **No publica nada.** Escribe en D1 y manda por Telegram, una vez por día (21:30), «hoy habría publicado N notas» con los títulos y el
  motivo de cada una; y a pedido, el listado completo. El sistema viejo sigue publicando hasta el corte.
- **IA de texto: sólo la clave paga** (`GEMINI_API_KEY`, la de `GEMINI_API_KEY_RESPALDO`, proyecto Default). No se toca la clave gratis,
  que sigue usando el sistema viejo. Tope de pedidos por día `NUCLEO_TOPE_DIARIO` (por defecto 150) y freno mensual de US$ 15 estimados.
  Modelo `gemini-3.1-flash-lite` (variable `GEMINI_MODELO`).
- **Huellas: Workers AI**, modelo `@cf/baai/bge-m3` (multilingüe), binding `AI`. Umbrales provisorios hasta calibrar: se une con coseno
  ≥ 0,86; duda entre 0,78 y 0,86 (pregunta de sí o no a Gemini); nueva por debajo de 0,78. Viven en `agrupar/umbrales.json`.
- Todo es JavaScript sin dependencias, ES modules, Node 20+ para pruebas (`node --test "v3/**/*.test.mjs"`), sin red en las pruebas
  (fetch, D1, AI y Gemini se inyectan). Archivos nuevos en LF está bien; comentarios y textos en castellano rioplatense.

## Las carpetas

    v3/nucleo/
      fuentes.json            la lista (sale de fuentes.exportadas.json)
      fuentes.mjs             cargar y normalizar
      leer/                   rss.mjs (parsear RSS/Atom), pagina.mjs (texto de una página), leer.mjs (una fuente → artículos)
      agrupar/                huella.mjs (Workers AI → vector), similitud.mjs (coseno, centroide), agrupar.mjs (artículo → historia), umbrales.json
      elegir/                 elegir.mjs (historia → {sale, motivo})
      redactar/               REDACCION.md (el prompt), gemini.mjs (cliente con tope), redactar.mjs (pedido 1), verificar.mjs (pedido 2)
      fotos/                  fotos.mjs (elegir y revisar con visión)
      db/schema.sql           las tablas
      db/db.mjs               las consultas (lo único que habla con D1)
      worker.mjs              la vuelta de 15 minutos y el resumen diario
      wrangler.toml

## Las formas (objetos JavaScript)

**Fuente** — `{ id, nombre, medio, url, tipo: 'rss'|'atom', alcance: 'balcarce'|'zona'|'provincia'|'pais', oficial: bool, activa: bool }`.
`medio` es el nombre del medio (dos feeds del mismo medio comparten `medio`: cuentan como uno). Del archivo exportado: `alcance: 'local'`
→ `'balcarce'`; `grupo: 'zona'` → `'zona'`; el resto → `'pais'` (o `'provincia'` si el grupo lo dice). `oficial` si es municipio,
concejo u organismo.

**Artículo** — `{ id, url, fuenteId, medio, alcance, oficial, titulo, bajada, texto, fecha, leido, imagenes: [{url, ancho, alto}] }`.
`id` = primeros 16 caracteres hex del SHA-256 de la URL normalizada (sin `utm_*`, sin `#`). `fecha` y `leido` en ISO UTC. `texto` sin
HTML, hasta 6.000 caracteres. Se descarta si `fecha` tiene más de 36 horas al leerlo.

**Historia** — `{ id, creada, fechaHecho, huella: Float32Array, articulos: [id], medios: [medio], alcances: [alcance], titulo,
estado: 'viva'|'elegida'|'redactada'|'no_sale'|'no_publicar', motivo, seccion }`. `fechaHecho` = mediana de las fechas de sus
artículos; nunca rejuvenece. `huella` = centroide normalizado de las huellas de sus artículos.

**Decisión de elegir** — `{ sale: bool, motivo }`. Motivos cerrados: `balcarce`, `zona`, `nacional-3`, `area-chica-2`, `pedido`,
`pocos-medios`, `extranjero-sin-argentino`, `horoscopo-loteria-cotizacion`, `tope-nacional`, `vieja`.

**Nota** (lo que devuelve redactar + verificar + fotos) — `{ id, historiaId, titulo, bajada, cuerpo: [párrafos], seccion, enDosLineas,
ficha: { que, quien, donde, cuando, numeros: [{valor, unidad, que, fuente}], cronologia: [{fecha, que}], faltaSaber: [] },
noPublicar: null|{motivo}, verificacion: { oracionesQuitadas: [], reescrita: bool }, foto: null|{url, credito, alt, ancho, alto},
fuentes: [{medio, url}], fechaHecho, firma: 'Redacción Radar Balcarce', pedidos: n }`. `id` = 7 caracteres base36.

## Las tablas (D1, `db/schema.sql`)

- `articulos` (id PK, url UNIQUE, fuente_id, medio, alcance, oficial, titulo, bajada, texto, fecha, leido, imagenes JSON, huella BLOB,
  historia_id) con índices por `leido` y `historia_id`.
- `historias` (id PK, creada, fecha_hecho, huella BLOB, titulo, medios JSON, alcances JSON, n_articulos, estado, motivo, seccion,
  nota_id, actualizada).
- `notas` (id PK, historia_id, creada, titulo, bajada, cuerpo JSON, seccion, en_dos_lineas, ficha JSON, no_publicar JSON, verificacion
  JSON, foto JSON, fuentes JSON, fecha_hecho, firma, pedidos, estado: 'borrador'|'publicada'|'retirada').
- `fuentes_estado` (fuente_id PK, ultimo_ok, ultima_falla, fallas_seguidas, avisada).
- `uso_ia` (dia, tarea, pedidos, tokens_entrada, tokens_salida; PK dia+tarea).
- `dudas` (a_id, b_id, cuando, respuesta) — cada pregunta de la banda de duda, para calibrar.

## Las funciones (firmas que se respetan)

- `leer/leer.mjs`: `export async function leerFuente(fuente, { fetch, ahora }) → { articulos: Artículo[], error: null|string }`.
- `agrupar/agrupar.mjs`: `export async function agrupar(articulo, historiasVivas, { huellaDe, preguntarMismoHecho, umbrales, ahora })
  → { historia, nueva: bool, duda: null|{historiaId, respuesta} }` (`huellaDe(texto) → Float32Array`; `preguntarMismoHecho(a, b) → bool`).
- `elegir/elegir.mjs`: `export function elegir(historia, articulos, { minimoNacional = 3, minimoAreasChicas = 2, nacionalesHoy, topeNacional = 100,
  pedida = false }) → Decisión`.
- `redactar/redactar.mjs`: `export async function redactar(historia, articulos, { gemini, perfil, redaccion }) → Nota` (sin foto ni id).
- `redactar/verificar.mjs`: `export async function verificar(nota, articulos, { gemini }) → { nota, quitadas: [], reescribir: bool }`.
- `redactar/gemini.mjs`: `export function crearGemini({ clave, modelo, fetch, contarUso, topeDiario }) → { texto(prompt, {json, imagenes}) }`;
  si el tope del día se pasó, tira `Error('tope-diario')` sin llamar.
- `fotos/fotos.mjs`: `export async function elegirFoto(nota, articulos, { gemini, fetch }) → null|{url, credito, alt, ancho, alto}`.
