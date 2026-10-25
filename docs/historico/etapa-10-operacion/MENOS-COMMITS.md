# Menos commits: qué pesa de verdad en el historial y qué conviene hacer

*23/10/2026. Medido sobre el repositorio real (últimas 48 horas y el historial completo). Lo de abajo que dice «implementado» está en la rama
`agente/menos-commits`; lo demás son recomendaciones para decidir con los dueños.*

## 1. La medición

### Cuántos commits hay (48 horas, 259 en total)

| Tipo de commit | Cantidad | Peso real que agrega (comprimido) |
|---|---|---|
| Datos de la portada (la vuelta de la web, cada media hora) | 98 | 8,6 MB |
| Redes: libro de publicaciones | 37 | 0,01 MB |
| Vigilancia: estado de avisos | 22 | 0,02 MB |
| Auditoría IA | 21 | 0,7 MB |
| Revisión del archivo | 18 | 0,07 MB |
| Ilustraciones con IA | 8 | 0,01 MB |
| Código, docs y traspasos (a mano / agentes) | ~55 | poco |

Es decir: **106 commits de los 204 «del robot» (todo menos «Datos de la portada» y lo hecho a mano) casi no pesan** (menos de 1 MB entre todos).
Molestan en la cuenta de commits, no en el tamaño. El peso está en los 98 commits de datos: **unos 5 MB por día de historial nuevo** (≈ 1,8 GB por año)
solo por los datos.

### Qué archivos pesan en cada vuelta

Peso de una versión (la que se reescribe entera) × cuántas veces cambió en 48 h:

| Archivo | Versión | Cambió | Crudo en 48 h | Comprimido (lo que de verdad entra al historial) |
|---|---|---|---|---|
| `archivo.json` | 1,6 MB | 98 de 98 vueltas | 160 MB | 4,1 MB |
| `celular-pendientes.json` (cifrado) | 4 KB a 20 KB | 78 | – | 1,3 MB (lo cifrado no se comprime ni hace deltas) |
| `portada.json` | 0,6 MB | 98 | 56 MB | 1,2 MB |
| `auditoria-ia.json` (cifrado) | – | 21 | – | 0,7 MB |
| `historico/2026-10.json` + `2026-09.json` | 1,8 y 1,0 MB | 12 y 4 | 26 MB | 0,7 MB |
| `fichas.json` | 0,8 MB | 98 | 75 MB | 0,4 MB |
| `estadistica-seleccion.json` | 176 KB | 98 | 17 MB | 0,4 MB |
| `banco-fotos.json` | 1,7 MB | 101 | 166 MB | 0,14 MB |
| el resto (`vistas`, `esperando-cuerpo`, `intentos-ia`, …) | chicos | 80 a 98 | – | < 0,2 MB cada uno |

Sin comprimir son 553 MB de versiones en 48 horas, pero git guarda diferencias: lo que cuenta es la columna de la derecha (9,4 MB en 48 h).

### Lo que más pesa en TODO el historial (la mudanza hay que pensarla con esto)

El historial empaquetado pesa **269 MB** (más ~84 MB de archivos temporales sueltos de empaquetados cortados, que `git gc` limpia).
Por ruta, sobre ese total:

| Qué | MB | Objetos |
|---|---|---|
| `web/public/fotos-notas/*.jpg` (fotos de las notas, una vez cada una) | **137** | 1.946 |
| `web/data/celular-pendientes.json` (cifrado) | 22 | 1.145 versiones |
| `web/public/fotos-notas/*.png` | 22 | 27 |
| `web/data/archivo.json` | 18 | 1.532 versiones |
| `web/data/portada.json` | 11 | 1.627 versiones |
| videos (`compartir/*.mp4`, `reels/fijas`, `docs/propuestas/material`) | 17,5 | 12 |
| `web/data/fichas.json` | 4,8 | 1.402 |
| `web/data/banco-fotos.json` | 3,9 | 1.054 |
| todo lo demás | < 10 en total | |

**Conclusión de la medición:** el historial pesa más que el proyecto sobre todo por las **fotos (60 % del total)**, que ya se podaron del árbol de
trabajo pero siguen en el pasado, y después por los **datos que se reescriben enteros** (`celular-pendientes`, `archivo`, `portada`, `fichas`: ~57 MB
juntos). La cantidad de commits en sí casi no pesa (cada commit es un objeto de unos pocos cientos de bytes: 3.874 commits = 0,8 MB).

### Por qué «se re-hace todo cada vuelta»: casi nunca es una escritura de más

Se miró vuelta por vuelta qué campos cambian. Las 29 vueltas recientes que se compararon cambian de verdad en `archivo.json` (entre 8 y 65 notas
cambiadas por vuelta: más medios que cuentan lo mismo, `muyContada`, `fecha`, nuevas fichas), en `portada.json` (notas, secciones, clima),
`estadistica-seleccion.json` (días, solos, historias), `fichas.json` (`pedidosHoy`, `repetidas`) y `esperando-cuerpo.json`. **El código ya evita
escribir cuando solo cambia la hora** (`cambioQueImporta`, `sinHora` en `celular-estado`, `esperando-cuerpo`, la auditoría, las sobres cifrados que
no cambian, etc.). Entonces la hipótesis (a) del pedido («no commitear si el contenido real no cambió») **ya estaba cubierta casi toda**; el
contenido real cambia en cada vuelta porque entran notas y medios nuevos cada media hora.

## 2. Qué se implementó (bajo riesgo)

**Una sola cosa, un error real encontrado midiendo:** `banco-fotos.json` (1,7 MB) cambiaba en el 13 % de las vueltas solo por una hora. Las fotos
puestas a mano (`web/data/fotos-manuales.json`) pisan su renglón del banco al empezar cada vuelta y le sacan la marca `ausenteDesde`;
`podarFotos` se la volvía a poner con la hora de esa vuelta. Resultado: ocho renglones con una hora nueva cada media hora y 1,7 MB reescritos.

- `web/scripts/fotos-notas.mjs`: nueva `conMarcasDeAusenciaDeAntes`, que le devuelve a cada renglón la marca que ya tenía guardada en el archivo.
- `web/scripts/generar-datos.mjs`: compara y escribe el banco con esa función (no cambia qué foto se borra ni cuándo; la poda sigue igual,
  solo cambia qué hora queda escrita cuando ya había una).
- `pruebas/menos-commits.test.mjs`: dos pruebas (el caso real y los casos que sí tienen que guardarse: marca nueva, nota que vuelve, foto nueva).

Se descartó implementar el resto (ver § 3) porque o no ahorra casi nada, o toca archivos que el sitio y las redes leen y exige cambios de más de un
lector a la vez.

## 3. Recomendaciones, de más a menos valor (todas para decidir con Hernán y Andrés)

**A. Las fotos fuera de git (el mayor ahorro de lejos: ~160 MB de 269).** Es lo que ya figura como plan («fotos y notas viejas a R2», archivo R2
encendido). Las fotos nuevas se commitean en `web/public/fotos-notas/` por la API; cada una queda para siempre en el historial aunque se pode.
Propuesta: que la vuelta del motor las suba a R2 y el sitio las sirva desde un dominio de R2 (o desde un Worker), y que en git quede solo el banco
(`banco-fotos.json`). Riesgo: medio. El sitio y las tarjetas de redes (`tarjeta.js`, Instagram) leen la foto del disco al compilar; hay que
dejar las dos lecturas (disco y R2) hasta migrar. Beneficio inmediato: el historial deja de crecer ~2 MB por día por fotos.

**B. Compactar el historial (lo hace el dueño a mano).** Después de A, un `git filter-repo` que saque `fotos-notas/` y los videos del pasado
deja el repositorio en ~100 MB, y los datos con ~5 MB por día nuevos. Hacerlo con las fotos ya en R2, no antes (se perderían).

**C. El estado de trabajo del robot en R2, y git solo como copia cada tanto (el cambio de fondo, riesgo alto).** Los datos que reescribe cada
vuelta (`archivo`, `portada`, `fichas`, `estadistica-seleccion`, `celular-*`, `esperando-cuerpo`, `intentos-ia`, `uso-ia`, `vistas`) son ~4 de cada 5
bytes nuevos. Hoy van a git porque *el sitio, las redes, el celular y las tareas los leen de `main`* (`hidratar` baja de GitHub lo que declara
`lee`). Si el motor los dejara solo en R2 y subiera a git una copia cada 6 horas (o cuando cambia algo que mandó una persona), los commits de
datos bajarían de ~48 a ~4 por día. No se implementó porque exige: (1) que cada lector (tareas de `infra/tareas-cloudflare/`, panel del celular
que lee de GitHub, informe diario, `recompilar.mjs`) lea de R2 con respaldo en git; (2) que el motor guarde primero en R2 y recién después
mande la copia; (3) una prueba por archivo. Riesgo: un lector que sigue leyendo `main` ve datos viejos de hasta 6 horas (redes publicaría con
retraso). Hacerlo por etapas, empezando por lo que solo lee el robot (ver D).

**D. Lo que solo usa el robot: sacarlo de git ya (riesgo bajo a medio, ahorro de commits más que de peso).** Candidatos que ningún lector del sitio
usa (`NO_CAMBIAN_EL_SITIO` en `web/scripts/recompilar.mjs` ya los marca): `vigilancia.json`, `estadisticas.json`, `estadisticas-piezas.json`
(233 KB, 19 commits), `auditoria-ia.json` y `correcciones-auditoria.json`, `intentos-ia.json`, `uso-ia.json`, `revision-archivo.json`. Excepción a
mirar: el panel del celular y el informe diario leen algunos (`estadisticas*`, `revision-archivo`), así que primero se les agrega la lectura desde
el Worker de tareas. Sacaría ~60 de los ~200 commits en 48 h (Vigilancia, Auditoría IA y Revisión del archivo, 61 commits) y 1 MB por 48 h.
`redes.json` (el libro, 37 commits) **no** se puede mover así: el sitio lo lee (notas de repasos) y una persona lo necesita en git por
seguridad de lo ya publicado.

**E. Agrupar las escrituras chicas en una por vuelta (riesgo bajo).** El corredor de tareas (`corredor.mjs`) hace un commit por tarea. Se podría
acumular lo que escriben vigilancia, auditoría, revisión e ilustraciones y mandarlo junto con el commit de datos de la vuelta siguiente (en R2
hasta entonces). Sacaría ~35 commits de 48 h con riesgo de que dos tareas pisen el mismo archivo (hoy lo evita el candado por tarea).

**F. Achicar `archivo.json` (4 MB comprimidos en 48 h, el archivo que más pesa).** Cada nota guarda sus campos pesados dentro (`claves`,
`seSabe`, `textoRedes`, `antecedentes`, `medios`, `verificacion`), y los `medios` y el flag `muyContada` cambian en 20 a 60 notas por vuelta.
Separar lo que cambia seguido (`medios`, `fuentesConsultadas`, `muyContada`) en un archivo aparte, o dejar de reescribir las notas de más de
48 horas (que ya no cambian salvo correcciones), bajaría el tamaño de cada delta a menos de la mitad. Toca el contrato de `archivo.json` que
leen `datos.js`, el cruce, las redes y la revisión: riesgo medio-alto; con una prueba de «el archivo viejo y el nuevo se leen igual».

## 4. Qué hace lenta la compilación del sitio

Cada vuelta compila TODO el sitio de cero con `next build` (`output: 'export'`), unos 2,5 minutos con lo medido en la documentación
(`recompilar.mjs`), y el sitio se compone de:

- una página por nota (`app/nota/[id]/page.js`) más **dos imágenes generadas por nota** (`opengraph-image/route.js` y `instagram.png/route.js`,
  ambas con `tarjeta()`, que dibuja la imagen con un motor de gráficos). Son ~4,2 archivos por nota; con el tope de 3.700 notas son ~7.400
  imágenes dibujadas **en cada vuelta**, aunque 3.600 de esas notas no cambiaron desde ayer. Es lo que más cuesta de la compilación;
- las páginas de sección (`seccion/[ranura]`, 10 por página), temas, agenda (una por evento) y los feeds;
- `generar-redirects.mjs` (tope 1.950, `_redirects`) y `indexar.mjs` (buscador Pagefind, que reindexa todo);
- luego la subida (`wrangler pages deploy out`, que solo sube los archivos cuyo contenido cambió: eso ya es incremental).

### Cómo recompilar solo lo que cambió (propuesta, sin implementar)

1. **Cachear las imágenes por nota (el ahorro grande, riesgo bajo).** Guardar `.next/cache` y un índice `id → huella de (título, foto, sección)` en
   R2 (el motor ya restaura y guarda `.cache/` en R2: `estado-r2.mjs`). En el armado, si la huella de una nota no cambió, reutilizar la imagen
   anterior en vez de dibujarla. Como la huella ya sale de datos que existen (`cambiaLaNota` en el cruce), es una prueba de «misma nota, misma
   imagen». Con ~50 notas nuevas o cambiadas por vuelta en vez de 3.700, la compilación bajaría una fracción importante de los 2,5 minutos.
2. **Imágenes de compartir solo para las últimas 7 a 14 días.** Las notas viejas ya no se comparten; que usen la tarjeta genérica de su sección. Corta
   las imágenes de ~7.400 a ~1.000 sin tocar nada más. Decisión editorial: una nota vieja compartida por un lector mostraría la tarjeta genérica.
3. **No recompilar cuando solo cambió el reloj o el clima.** Si la vuelta no trajo notas nuevas ni cambios (el caso de madrugada), subir lo ya
   compilado. Hoy la compilación se hace siempre (`vuelta.mjs`, paso 6) aunque `cambios.length` sea 0. Riesgo bajo si se mantiene la regla de que
   el reloj del sitio se actualiza por JS en el navegador.
4. **Páginas de sección y portada primero, notas viejas aparte.** Next no compila de forma incremental con `output: 'export'`; la forma de lograrlo
   sin cambiar de tecnología es separar el sitio en dos compilaciones (lo «vivo» de las últimas 72 horas y el archivo, que solo se recompila
   cuando alguien corrige una nota vieja). Es el cambio más grande y tiene que ir después de A y C.

**Otra cosa para decidir:** el tope de 20.000 archivos de Cloudflare Pages (hoy ~15.900 con 3.700 notas) y los 2.000 de `_redirects` son los que
fuerzan el tope de notas. Pasar el archivo viejo a R2 (ya hecho en parte) lo alivia y de paso baja el tiempo de subida.

## 5. Orden sugerido

1. Esta rama (arregla el churn de `banco-fotos.json`, ya probado).
2. A (fotos a R2) y después B (compactar), que son los que devuelven los ~160 MB.
3. D y E (menos commits visibles, sin riesgo para el sitio).
4. Compilación: puntos 1 y 2 de § 4.
5. C y F solo si, después de lo anterior, el historial sigue creciendo más de lo que se tolera.
