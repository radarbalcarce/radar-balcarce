# Salud técnica: qué hay que hacer para que la página dure años

*Auditoría del 15/10/2026. Sólo lectura: no se tocó ningún archivo del proyecto ni se subió nada; lo único nuevo es este documento. Todo lo que no se pudo comprobar está marcado **SIN VERIFICAR**. Las cifras salen de los registros reales de GitHub Actions de hoy (15/10, 17:07 UTC), de `radarbalcarce.com` en vivo, y del repositorio local.*

Para Hernán y Andrés: primero va el resumen (lo que importa), después el detalle por tema. Cuando aparece un término técnico, va una frase que lo explica.

---

## 0. Resumen en una página

**Cómo está hoy:** el sitio anda, es rápido, es seguro en lo básico y no tiene ninguna clave filtrada en el historial. El robot corre cada media hora sin fallar (en las últimas 200 corridas hubo 1 falla del reloj y 1 de Redes). Lo que preocupa **no es que se rompa mañana**, sino cuatro cosas que **crecen sin parar** y que en las próximas semanas se vuelven problema:

| # | Qué crece | Hoy | Cuándo pega | Gravedad |
|---|---|---|---|---|
| 1 | **Las notas viejas desaparecen** (tope de 3.500 páginas y 180 días): el enlace que está en un posteo de Facebook o en Google da 404 | 1.122 páginas; entran ~46 por día | Se llega al tope de 3.500 hacia el **6/12/2026**; desde ahí cada nota vive **unos 76 días, no 180**. Las primeras notas (3/09) empiezan a caer por el tope en diciembre | **Alta** para "que dure años": los enlaces viejos se rompen |
| 2 | **El respaldo no es respaldo**: todo vive en GitHub (el repositorio, y las copias semanales también quedan en GitHub). GitLab y R2 **no están configurados** (la lista de variables de GitHub tiene sólo `REDES_ACTIVAS`) | 1 solo lugar + la copia de la PC | Ya | **Alta**: si se pierde o bloquean la cuenta `radarbalcarce`, se pierde todo |
| 3 | **El historial de git pesa 185 MB** (225 MB en GitHub) y crece ~3,5 MB por día; el 60% son fotos. El respaldo semanal, aunque se configure R2, **ya no entraría** en ~35 días (wrangler sube hasta 300 MB por archivo) | 185 MB | Respaldo a R2: **~20/11/2026**. Clonar/mudar el repo: lento a partir de 500 MB (~marzo 2027) | **Media-alta** |
| 4 | **Next 15 pierde los parches el 21/10** y no se puede pasar a Next 16 sólo con "fotos a R2": las cuentas dicen que Next 16 sigue superando los 20.000 archivos de Cloudflare si el tope queda en 3.500 notas | Next 15.5.27 (hay 15.5.28); `npm audit` marca 2 avisos en el armado (postcss, vía Next), no en lo que ve el lector | 21/10 (parches); ~2.800 notas con Next 16 (~**23/11/2026**) | **Media**: decisión de fondo, no incendio |

Además, hay un **punto único de falla silencioso**: el reloj (el Worker de Cloudflare) es quien dispara la web, las redes **y** la vigilancia. Si el Worker o su token dejan de andar, las tres cosas se paran juntas y **nadie avisa**, porque quien avisaría (la vigilancia) también la prende el Worker.

**Lo bueno, para no perderlo de vista:** la lógica de negocio está muy bien cuidada con pruebas (más de 2.000, corren en cada corrida); las reglas están escritas y atadas a pruebas; el sitio es estático (casi nada que hackear); el cifrado de lo pendiente está bien pensado; el repositorio público no tiene claves; la velocidad del sitio es buena.

**Recomendación en una línea:** esta semana, respaldo de verdad (R2 + GitLab), alarma que no dependa del reloj y el parche menor de Next; este mes, sacar las fotos del repositorio (R2) y decidir cómo se conservan las notas viejas **para siempre**; este año, ordenar el código en módulos con una sola fuente para las listas repetidas.

---

## 1. Dependencias y tecnología

### 1.1 Qué se usa (todo comprobado en `package.json` y `package-lock.json`)

| Pieza | Versión | Para qué | Licencia | Estado |
|---|---|---|---|---|
| Node | 24 (local v24.14.1; todos los workflows en `'24'`) | todo | MIT | **Bien**: Node 24 es la línea de soporte largo (LTS) vigente; su soporte llega hasta ~abril de 2028 (de memoria, **SIN VERIFICAR** la fecha exacta) |
| Next.js | `^15.5.27` (instalada 15.5.27; **hay 15.5.28**) | el sitio | MIT | Línea 15: según las notas del proyecto, sin parches desde el 21/10 (**SIN VERIFICAR** con la fuente oficial) |
| React / react-dom | 18.3.1 (última: 19.3.1) | el sitio | MIT | Next 16 exige React 19 |
| Pagefind | 1.5.2 | el buscador | MIT | Bien; sólo en el armado |
| `@resvg/resvg-js` | ^2.6.2 | placas y tarjetas | **MPL-2.0** | Bien, se usa tal cual |
| `ffmpeg-static` | ^5.3.0 | video de reels | **GPL-3.0** (el programa ffmpeg incluido) | Se usa sólo en el servidor de Actions y no se redistribuye: no hay obligación. Ojo: baja el binario de internet al instalar (ver 5.4) |
| wrangler (Cloudflare) | **4.139.0 fija** en 5 workflows (`cloudflare-deploy`, `respaldo`, `fotos-a-r2`, `reloj-cloudflare`) | subir sitio, R2, reloj | MIT/Apache | Fija a propósito, bien. Es la de septiembre: hay que subirla a mano cada tanto |
| Actions | `checkout@v4`, `setup-node@v4`, `cache@v4`, `upload-artifact@v4` | CI | MIT | v4 corre sobre Node 20, que cerró su soporte en abril de 2026: GitHub viene avisando el cambio a Node 24 (**SIN VERIFICAR** fechas y versión nueva) |
| Runner | `ubuntu-24.04` | CI | — | Bien (soporte hasta 2029) |

Lo que NO usa, y es una virtud: no hay base de datos, ni servidor, ni cuentas de usuario, ni Tailwind, ni librerías de terceros en el navegador. La web de producción carga 8 archivos de JavaScript (494 KB sin comprimir en la portada) y un solo CSS de 38 KB; el único script externo es el contador de visitas de Cloudflare (`static.cloudflareinsights.com`).

### 1.2 `npm audit --omit=dev` (se corrió en solo lectura, sin arreglar nada)

- **Raíz (`/`)**: 0 vulnerabilidades.
- **`web/`**: 2 avisos (1 alta, 1 moderada), los dos **el mismo**: `postcss <= 8.5.22` que viene dentro de `next` (cuatro avisos sobre cómo postcss lee/escribe CSS y mapas de código). Lo único que "arregla" `npm audit fix` es subir a **Next 16.4.1** (cambio grande).
- **Qué significa en la práctica**: postcss corre **cuando se arma el sitio**, sobre el CSS propio del proyecto. El lector no recibe postcss ni hay servidor que lo use. El riesgo real para el lector hoy es **muy bajo**; es un aviso que seguirá apareciendo hasta pasar a Next 16 (**SIN VERIFICAR** que 15.5.28 no lo resuelva: `npm outdated` la marca como la que corresponde instalar, conviene probarla antes del 21/10 y volver a correr `npm audit`).

### 1.3 Qué está desactualizado (`npm outdated`)

| Paquete | Instalada | Que corresponde | Última |
|---|---|---|---|
| next | 15.5.27 | **15.5.28** | 16.4.1 |
| react / react-dom | 18.3.1 | 18.3.1 | 19.3.1 |

Nada más está atrasado: el árbol de dependencias es chico (por eso el riesgo de "cadena de suministro" es bajo, ver 5.4).

### 1.4 La decisión Next 15 vs Next 16 (regla 148), con números actuales

La regla dice: se volvió a Next 15 porque Next 16 exporta ~4 archivos extra por página y Cloudflare Pages acepta 20.000 archivos por despliegue. "Se pasa a Next 16 cuando las fotos estén en R2".

**Los números reales de hoy** (log del despliegue 38774728684, 15/10 17:10 UTC): *"Archivos del sitio: 5109 de 20000"*, 1.687 páginas generadas, 953 archivos en `public/` (862 son fotos), 15 del buscador.

Cuenta propia (estimación, **SIN VERIFICAR** hasta medir un armado con Next 16 hoy):

- Con Next 15 hoy salen ~2,45 archivos por página generada (el 8/10 la regla contaba ~1,7; subió, probablemente por las imágenes de tarjeta de cada nota y las secciones: **conviene vigilar este número**, no está explicado en ningún lado).
- Con el tope de 3.500 notas: 4.065 páginas → **~12.700 archivos con Next 15** (cabe, con 36% de margen).
- Con Next 16 (+3,1 archivos por página, dato de la regla): +12.600 → **~25.300**. Aunque se saquen las ~2.700 fotos a R2: **~22.600. Sigue sin entrar.**
- Con fotos en R2 y Next 16, el tope se alcanza hacia las **~2.850 notas** (23/11/2026 al ritmo de hoy).

**Conclusión:** "fotos a R2" **no alcanza** para habilitar Next 16 si se mantiene el tope de 3.500 notas. La regla 148 y el texto de PENDIENTES prometen algo que las cuentas no sostienen. Hay tres caminos reales:

| Camino | Qué es | Pro | Contra | Esfuerzo |
|---|---|---|---|---|
| A. Quedarse en Next 15 | Parche 15.5.28 y esperar | Cero trabajo; el sitio es estático, sin servidor que parchear | Se acumulan avisos de seguridad del armado; sin parches nuevos de Next; hay que decidir un día | 1 h |
| B. Next 16 con menos páginas | Bajar el tope a ~2.500 notas **y** mover el resto del archivo a otro lado (ver sección 2.4) | Next al día | Depende de resolver el "archivo eterno" | 1–2 días + lo de 2.4 |
| C. Dejar de exportar páginas de nota una por una | Sitio mínimo + Worker de Cloudflare que arma notas viejas al vuelo desde R2 | Sin tope de archivos para siempre; permite que **todas** las notas vivan eternamente | Cambio de arquitectura (el Worker ya existe para el reloj) | 1–2 semanas |

Mi recomendación: **A ahora** (parche 15.5.28), y que la decisión B/C salga junto con el diseño del "archivo eterno" (2.4), porque son el mismo problema.

### 1.5 Fuentes, imágenes y voces: licencias

| Cosa | Dato | Situación |
|---|---|---|
| Tipografías Inter y Source Serif 4 (`web/public/fuentes/`, `reels/marca/fuentes/`) | Licencia SIL OFL (se pueden usar y redistribuir) | **Bien.** Falta: no hay ningún archivo de licencia al lado de las fuentes (OFL pide incluir el texto de la licencia cuando se redistribuye). Costo cero: agregar `OFL.txt` |
| 58 escudos de clubes (`web/public/escudos/`) | Marcas registradas de cada club | **Riesgo legal bajo-medio, SIN VERIFICAR**: de dónde salen y con qué permiso no está documentado en el repo. Sólo "adornan" las notas de fútbol |
| Fotos de otros medios/organismos | Con crédito, sin marca de agua, guardadas en el banco propio (`docs/05-FOTOS.md`) | Es una **decisión editorial con riesgo de derecho de autor** (citar la fuente no siempre alcanza). No es un tema técnico, pero conviene que un abogado lo mire una vez. **SIN VERIFICAR** |
| Voces (Gemini, "voz-locutora" y "voz-locutor") | Voces propias en el proyecto de Google; **vencen el 29/09/2027** | Técnicamente vigiladas por la vigilancia. Si Google cambia los términos o retira el modelo, las piezas con voz no salen. No hay plan B de voz |
| Modelos de IA (`gemini-flash-lite-latest`, `gemini-3.8-flash-tts`) | Gratis hoy por la política de Google | El nombre `-latest` **cambia solo** de modelo detrás: puede cambiar el tono o la calidad sin que se toque nada. Riesgo de calidad, no de caída |
| Video institucional (`web/public/compartir/*.mp4`, 9,8 MB) | Propio | Bien, pero pesa 9,8 MB en cada despliegue |

---

## 2. Límites del sitio estático

### 2.1 Cuántos archivos (límite 20.000 por despliegue en Cloudflare Pages)

Hoy: **5.109 de 20.000 (26%)**. Es dato real del log, no estimación.

| Escenario | Notas con página | Archivos | ¿Entra en 20.000? |
|---|---|---|---|
| Hoy | 1.122 | 5.109 | Sí (26%) |
| Tope de 3.500 notas, Next 15, fotos en el sitio | 3.500 | ~12.700 | Sí (64%) |
| Tope de 3.500 notas, Next 15, fotos en R2 | 3.500 | ~10.000 | Sí (50%) |
| Tope de 3.500 notas, Next 16, fotos en R2 | 3.500 | ~22.600 | **No** |
| Tope de 2.500 notas, Next 16, fotos en R2 | 2.500 | ~17.000 | Sí, justo (85%) |

*(Las filas son estimaciones con 2,45 archivos por página; **SIN VERIFICAR** hasta medir. El aviso automático arranca en 14.000 y alerta en 18.000: `web/scripts/contar-archivos.mjs`. Es bueno, pero sólo escribe una anotación en el registro: nadie lo ve; ver el plan.)*

> **Corrección del 15/10/2026, medida.** Se hizo un armado real (Next 15, 1.131 notas = 5.125 archivos) y otro con el archivo recortado a 566 notas (3.200 archivos, 878 fotos iguales): da **unos 400 archivos de base y 4,2 por nota** (2,0 la página y su texto; 1,0 el fragmento del buscador; 0,8 la foto; 0,2 las páginas de sección; 0,2 las dos imágenes de las notas que salieron en redes), no 3,2. Con 3.500 notas son ~15.000 archivos (no 12.700); con 3.700, ~15.900. El tope no se puede subir de forma útil sin sacar las fotos del sitio (con fotos en R2: ~3,4 por nota, 4.500 notas serían ~15.700). Detalle y el diseño del archivo permanente: `ARCHIVO-PERMANENTE.md`. Las filas de la tabla de arriba con "3.500 notas" valen ~2.300 archivos más de lo que dicen.

Una pista de que el límite se puede mover: Cloudflare ofrece más archivos por despliegue en planes pagos o en "Workers con archivos estáticos" (**SIN VERIFICAR** las cifras actuales de Cloudflare: conviene leer su página de límites antes de decidir).

### 2.2 Crecimiento por día y cuándo pega cada límite (a ritmo actual)

Ritmo medido (últimos 14 días en `archivo.json`): **~46 notas por día** (de 26 a 68); ~0,77 fotos por nota → **~35 fotos y ~2,6 MB de fotos por día**.

| Límite | Valor | Hoy | Se alcanza |
|---|---|---|---|
| Tope de notas con página | 3.500 | 1.122 | **~6/12/2026** (52 días) |
| Vida de una página una vez llegado el tope | 180 días en teoría | — | en la práctica 3.500/46 = **~76 días** |
| Archivos en un despliegue (Next 15) | 20.000 | 5.109 | no se alcanza (tope en ~12.700) |
| Archivos en un despliegue (Next 16, fotos en R2) | 20.000 | — | ~2.850 notas ≈ 23/11/2026 |
| Repositorio de GitHub (recomendación general: < 1 GB cómodo, ≤ 5 GB) | — | 225 MB en GitHub | 1 GB: ~**abril de 2027**; 5 GB: ~**2029** si el ritmo no sube (y sube: `archivo.json` y fotos crecen) |
| Respaldo a R2 por wrangler | 300 MB por archivo | bundle de 172 MB (11/10) | **~20/11/2026** |
| Tiempo de armado del sitio (1.687 páginas = 2 min 15 s) | — | despliegue total 3 min 12 s | con 4.065 páginas: ~5 min 30 s de armado → despliegue ~6,5 min. Aceptable; lo que ya se pasa es "Actualizar la web" (5,5 a 6,5 min, no 2–3 como dice el comentario del workflow, porque corre `npm test` entero) |
| Ciclo completo | cada 30 min | web ~6 min + despliegue ~3 min | Sin problema hasta triplicar |
| `web/data/archivo.json` | — | 2,95 MB (1.120 notas) | ~9 MB al tope; entra cómodo, pero se reescribe entero cada 30 min (ver 3.1) |

### 2.3 Las fotos: proponer sacarlas del repositorio (R2)

Estado del plan (comprobado):

- `web/lib/fotos.js` ya arma la dirección de cada foto desde un solo lugar; con la variable `FOTOS_BASE` apunta a otro dominio. Hecho y con prueba (`pruebas/fotos-base.test.mjs`).
- `.github/workflows/fotos-a-r2.yml` ya sube las fotos a un depósito. **No se corrió**: en GitHub **no existen** las variables `R2_FOTOS`, `FOTOS_BASE`, `R2_RESPALDOS` ni `GITLAB_REPO` (`gh variable list` sólo devuelve `REDES_ACTIVAS`).
- Lo que falta es todo configuración de Cloudflare: crear el depósito, conectar el dominio `fotos.radarbalcarce.com`, poner las variables. **Es lo más barato y de más retorno de toda esta auditoría.**

Qué se gana: de los 185 MB de historial, **111 MB (60%) son fotos** (1.202 versiones de 862 fotos vigentes). Sacarlas del repositorio quita ~63 MB y 862 archivos de cada despliegue.

Lo que **no** resuelve solo: las ~111 MB de fotos que ya están en el historial siguen ahí; para quitarlas hay que reescribir el historial (herramienta `git filter-repo`, riesgosa: cambia todos los códigos de commit; recomendable sólo en la mudanza a un repo privado/nuevo, no antes). Lo que sí se logra: que **deje de crecer** ~2,6 MB por día por las fotos.

Pasos (esfuerzo ~3 horas, la mayor parte clics en Cloudflare):
1. Crear depósito `radar-fotos` y dominio `fotos.radarbalcarce.com`.
2. Variables `R2_FOTOS`, `FOTOS_BASE`; correr "Fotos a R2" (copia sin borrar).
3. Verificar que una nota abre su foto desde el dominio nuevo.
4. Cambiar el robot (`fotos-notas.mjs`, `foto-manual.mjs`, `achicar-foto.mjs`) para que **suba a R2 y no commitee** la foto; y sacar `web/public/fotos-notas/` del `git add` de `actualizar.yml`.
5. Recién ahí, borrar la carpeta del repo (en un commit aparte, entre corridas).
6. Cambiar el caché de las fotos: hoy `max-age=604800` (7 días) aunque el nombre no cambia nunca; en R2 ya se sube con `max-age=31536000, immutable`.

Ojo con un detalle: `redes/` y `reels/` leen las fotos del disco del repositorio para armar posteos y placas. Hay que revisar que sigan funcionando cuando la foto no esté en el repo (**SIN VERIFICAR**; es el riesgo principal de este cambio).

### 2.4 El problema de fondo: que una nota viva para siempre

Hoy una nota **pierde su página** al pasar 180 días **o** el tope de 3.500, lo que ocurra antes (`pierdeLaPagina`, `web/lib/archivo.js`; las notas que salieron en redes se quedan primero). Lo que sale va al "histórico" por mes (`web/data/historico/AAAA-MM.json`, hoy 2 archivos), pero **ese histórico no se muestra en ningún lado**: es un archivo guardado, no una página. Consecuencias para "que la página dure años":

- Un enlace en Facebook, Instagram, WhatsApp o Google que tenga más de ~76 días **da 404** (hoy el que se cae por edad: a partir de marzo de 2027; el que se cae por tope: desde diciembre).
- Google ve cómo se acumulan errores 404, que le restan confianza al sitio, y se pierde el valor de los enlaces que otros sitios pusieron a las notas.
- El archivo histórico es **el activo más valioso de un medio local en 5 años** (hemeroteca de Balcarce) y hoy no se conserva como tal.

Opciones (de menor a mayor cambio):

| Opción | Cómo funciona | Qué se logra | Esfuerzo |
|---|---|---|---|
| 1. Dos sitios de Cloudflare Pages | El sitio actual con lo reciente (≤ 90 días) y otro proyecto Pages "archivo" con lo viejo; un Worker o una regla manda `/nota/*` al segundo si el primero no la tiene | Cada proyecto tiene su propio límite de 20.000 archivos; las direcciones **no cambian** | 3–5 días. Hay que dividir el armado en dos |
| 2. Worker + R2 (HTML al vuelo) | Las notas viejas viven como JSON en R2; un Worker arma el HTML al pedirlo (y Cloudflare lo guarda en caché) | Sin límite de archivos. Es el camino a largo plazo | 1–2 semanas |
| 3. Páginas livianas de respaldo | Para las notas que salen del archivo se deja una página mínima: título + bajada + enlace a la sección del mes | Evita el 404; barato; SEO pobre | 2–3 días |
| 4. Redireccionar a la sección o al mes | `/nota/<viejo>` → `/seccion/<x>` con 301 | Nada de 404, pero se pierde el contenido | 1 día (ya existe `generar-redirects.mjs`) |

Mi recomendación: **la opción 3 ahora** (apagar el incendio de los 404 en diciembre) y **la 2 en el año** (a la par de decidir Next 16, es el mismo trabajo). Mientras tanto, subir el tope de 3.500 a ~6.000 si se sacan las fotos a R2 (cabe en Next 15: ~6.000 × 3,2 = ~19.000 archivos con fotos adentro y ~14.500 sin) es una forma gratuita de ganar tiempo.

---

## 3. Durabilidad de los datos (`web/data/*.json` es la base de datos)

### 3.1 Qué hay

43 archivos versionados en `web/data/`, 6,3 MB en disco. Los grandes: `archivo.json` 2,95 MB, `banco-fotos.json` 835 KB, `fichas.json` 595 KB, `efemerides-candidatas.json` 240 KB, `portada.json` 215 KB. Para una web de este tamaño, JSON en git **es defendible**: tiene historial gratis, es legible y se puede restaurar. Los límites reales son tres:

1. **Cada archivo se reescribe entero cada 30 minutos.** En git quedan ~1.100 versiones de `archivo.json` (10 MB de historial: bien, por la compresión entre versiones) y **801 versiones de `celular-pendientes.json` (18 MB de historial)**: ese archivo va **cifrado con una clave al azar**, así que cada versión es "distinta" aunque no haya cambiado nada útil y git no puede comprimirlas. Arreglo barato: no reescribirlo si el contenido en claro no cambió (guardar un resumen del contenido antes de cifrar). Ahorro: ~18 MB hasta hoy y ~1 MB por semana.
2. **Un archivo de ~9 MB al tope de 3.500 notas** que se lee y analiza entero en cada armado. Funciona; lo que cambia es el tiempo (ya hay una memoria de lectura en `datos.js`).
3. **No hay validación de forma al escribir**: si un campo falta, la web falla y se congela (lo dice CLAUDE.md para `motivo`/`cuando`/`por`). Una pequeña prueba de "forma de cada archivo de datos" (esquema) evitaría el susto. `leerJsonEstricto` ya protege contra el archivo roto, pero no contra el archivo bien armado con datos incompletos.

### 3.2 Carreras entre el robot y las personas

El mecanismo (comprobado en `actualizar.yml`): una corrida cada 30 min (grupo `actualizar-web`, una a la vez), que al final hace `git add` de **una lista fija de 18 archivos de datos + carpetas de fotos y escudos**, `git commit`, y `git pull --rebase`; si choca, **`git checkout --theirs`** (en un rebase, "theirs" es *lo que acaba de armar el robot*) y sigue; reintenta 3 veces.

Riesgos concretos:

| Riesgo | Detalle | Gravedad |
|---|---|---|
| **El robot gana siempre en un choque**, incluso sobre `web/data/retiradas.json` (que escribe una persona y **está en la lista de `git add`**) y `celular-pendientes.json`. Si Hernán retira una nota a mano justo mientras corre el robot, y el robot trae su copia anterior, **la retirada se pierde en silencio** | El archivo se escribe a mano, el robot lo toca (le saca las de más de 7 días los lunes) | **Media**. Probabilidad baja, pero lo retirado suele ser delicado (un menor, una víctima) |
| Los que **no** están en la lista (`celular-decisiones.json`, `correcciones.json`, `fotos-manuales.json`, `contactos-celular.json`, `pistas.json`…) los escriben otros flujos con su propio candado (`panel-celular`, `pistas`, `redes`…) | Son archivos distintos, por eso no chocan; bien diseñado | Baja |
| **Archivo nuevo en `web/data/` que se olvida en la lista de `git add`** = se pierde al terminar la corrida (ya pasó el 28/09 con las fotos). Ninguna prueba compara la lista contra los archivos que escribe el código | Se advierte en CLAUDE.md pero no hay red | **Media** |
| Varios flujos distintos (redes, piezas, panel, vigilancia, auditoría, pistas) hacen `git push` con su propio candado: 6 grupos distintos pueden empujar a la vez a `main`. Cada uno reintenta con rebase y resuelve a su favor | Funciona (en 200 corridas no hay choques fallidos), pero no hay coordinación global | Baja-media |
| La rama `main` **no tiene protección** (GitHub devuelve 404 al pedirla) | Cualquiera de los 3 colaboradores puede empujar o forzar | Media (ver 5) |

Arreglos propuestos: (a) `retiradas.json` y `celular-pendientes.json` fuera de la lista del robot o con resolución "gana el más nuevo por fila", no por archivo; (b) una prueba que compare `git add` de `actualizar.yml` con los archivos de `web/data/` que el código escribe; (c) mover lo "humano" a una carpeta aparte (`web/data/humano/`) que ningún flujo automático pise. (a) es de 1–2 horas.

### 3.3 Respaldos: qué guarda, dónde, ¿se probó restaurar?

`respaldo.yml` (domingos 3:17, y a mano). Qué hace, comprobado en el último registro (11/10: 30 segundos, éxito):

1. `git bundle --all` (todo el historial; **172 MB**) + `tar` de `web/data` y fotos (**52 MB**), subidos como "artefactos" de la corrida, **90 días**.
2. GitLab: **"no configurado"** (el registro del 11/10 dice exactamente eso).
3. R2: **"no configurado"** (faltan la variable `R2_RESPALDOS`, y hay que crear el depósito).

Es decir: la decisión del 8/10 ("respaldo en cuatro lugares: GitHub, GitLab, Google Drive y la PC") hoy es **"un lugar y medio"**: GitHub (repositorio + artefactos, en la misma cuenta) y la PC de Hernán (el clon local, que se actualiza sólo cuando él hace `git pull`). Drive no figura en ningún workflow.

Qué cubre y qué no:

- Cubre: error humano (se borró algo) y pérdida de datos puntual, por 90 días, **si la cuenta sigue**.
- No cubre: cuenta suspendida, repositorio borrado por error, token comprometido (un token con permiso de escritura puede borrar artefactos y el repositorio).
- No cubre **lo que no está en git**: secretos y variables de GitHub (las claves de Meta, de Gemini, `REDES_ACTIVAS`), la configuración del Worker y de Cloudflare Pages, el DNS en DonWeb, y las voces de Gemini (viven en el proyecto de Google). Ninguna de esas cosas está documentada de forma reconstruible; `docs/08-INFRAESTRUCTURA.md` lista los secretos, pero **no hay una guía "si todo se perdió, así se vuelve a armar"** (SIN VERIFICAR: no la encontré).
- **Restauración nunca probada, SIN VERIFICAR.** No hay prueba ni documento de que alguien haya bajado un bundle, hecho `git clone radar-balcarce-AAAA-MM-DD.bundle` y levantado el sitio desde ahí. `pruebas/respaldo.test.mjs` prueba el respaldo **del panel viejo de la PC** (hashes de usuarios), no éste.
- Límite que se viene: wrangler sube hasta 300 MB por archivo; el bundle crece ~3,5 MB/día → se pasa hacia el **20/11**.

**Propuesta**: (1) crear el proyecto en GitLab y las variables (1 hora, ya está el código); (2) R2 con el depósito `radar-respaldos`, y en `respaldo.yml` partir el bundle en 2 (el historial hasta hoy es inmutable; sólo se necesita guardar el incremental) o subir con la API S3 en vez de wrangler (sin límite de 300 MB); (3) **un simulacro de restauración** cada trimestre, documentado, con el resultado en el registro; (4) un archivo `docs/RECONSTRUIR.md` con el orden para levantar todo de cero; (5) el respaldo de los *secretos* queda en un gestor de contraseñas de dos personas (Hernán y Andrés), nunca en el repo.

### 3.4 Herramienta de recuperación (`web/scripts/recuperar-archivo.mjs`)

Qué hace: reconstruye `archivo.json` leyendo **todas las versiones de `portada.json` del historial de git** (`git log` + `git show`) y quedándose con la última forma publicada de cada nota. Se hizo para el accidente del 25/09, cuando las páginas se caían al salir de portada.

- Está bien pensada (solo lee, no pisa lo que ya está, respeta lo bloqueado).
- **Límites**: (a) depende de que el historial esté entero, así que sirve **mientras el historial exista**; si se limpia el historial para bajar el peso del repo (2.3), esta herramienta pierde su fuente; (b) recupera lo que *salió en portada*, no el cuerpo reescrito ni las correcciones posteriores; (c) arranca de `portada.json` y no está claro (SIN VERIFICAR) cómo trata las notas posteriores a cuando `archivo.json` empezó a existir; (d) con 2.753 commits y ~1.100 versiones de portada, tarda; (e) no hay prueba que la ejecute contra un historial real, sólo prueba `notasDelHistorial` con datos de ejemplo.
- Propuesta: guardar **una vez por semana una foto completa** de `archivo.json` + `fichas.json` + `banco-fotos.json` en R2 (con fecha), de modo que recuperar sea *copiar un archivo*, no reconstruir desde git.

---

## 4. Salud del código

### 4.1 Tamaños (líneas y bytes; hay muchas líneas largas de hasta 500 caracteres, por eso los bytes importan)

El proyecto tiene ~39.500 líneas de código en 5 carpetas, más 174 archivos de prueba. Los archivos más grandes:

| Archivo | Líneas | Bytes | Exportaciones | Qué mezcla |
|---|---|---|---|---|
| `ingesta/ingesta.mjs` | 1.811 | 95 KB | 28 | Lectura de fuentes, limpieza, sección, puntaje, semáforo, "de acá", agenda, escritura de resultados. Es el cuello de botella de todo cambio de criterio. **El archivo más importante y el más difícil de leer** |
| `ingesta/fuentes.mjs` | 1.405 | 64 KB | — | Lista de fuentes **y** las reglas de sección, semáforo y palabras locales (datos mezclados con reglas) |
| `reels/reescritura.mjs` | 1.276 | 66 KB | 49 | Reescritura con IA: pedido, reintentos, tope, claves, validación. Vive en `reels/` (que sí tiene dependencias) pero lo usan `ingesta/`, `panel/` y `redes/`: **la pieza central de la redacción está en la carpeta equivocada** |
| `redes/vigilar.mjs` | 891 | — | — | Todas las reglas del vigilante |
| `panel/servidor.mjs` | 851 | — | — | **Panel de PC que "NO se usa y queda en desuso"** (CLAUDE.md). 851 líneas de código muerto a mantener |
| `web/lib/notas-propias.js` | 783 | — | 34 | Dólar, podcasts, efemérides, clima: cuatro cosas distintas en un archivo |
| `ingesta/lectura-ia.mjs` | 620 | 35 KB | 28 | Lectura con IA, repetidas, fichas, respaldos de claves |
| `web/lib/eventos.js` | 601 | — | 30 | Agenda |
| `web/lib/datos.js` | 527 | 25 KB | 35 | Lee 20+ archivos de datos, arma tapa, secciones, clima, dólar, agenda (la "puerta" de todo el sitio) |

Ninguno es ilegible, pero **`ingesta.mjs` es el único que ya necesita partirse**: cualquier regla nueva de sección o semáforo pasa por ahí, y por eso hay "1.363 exportaciones" en el proyecto para poder probar cosas internas.

### 4.2 Fronteras entre módulos contra la regla "sin dependencias"

La regla: `ingesta/`, `panel/` y `redes/` **no importan paquetes de afuera de Node**. Se cumple (comprobado: ningún `import` de un paquete npm en esas tres carpetas). Pero la regla esconde un enredo que **sí** importa:

- `ingesta/` importa **de `web/lib/`** (`texto.js`, `titulos.js`) y de **`reels/claves.mjs`**; `redes/` importa de `web/lib/` (cuerpo, ruta, texto, tarjeta-diseno) y de `reels/`; `panel/` importa de `reels/reescritura.mjs` y `web/lib/notas-de-pistas.js`. Y la web, a su vez, importa de `ingesta/`.
- El resultado: el "motor sin dependencias" **depende de código de la web** y de `reels/`. No rompe la regla al pie de la letra (son archivos propios, sin paquetes), pero la intención ("el motor se entiende solo") **no se cumple**: ni `ingesta` ni `web` se pueden mover o probar solos.
- Ninguna prueba vigila las **direcciones** de los imports (sólo "no hay paquetes").

Propuesta: mover a una carpeta `compartido/` (o `nucleo/`) las ~8 utilidades puras que usan todos (`texto`, `titulos`, `cuerpo`, `ruta`, `tiempo`, `claves`, `json`, `zona`) y agregar una prueba de reglas de dirección: `compartido` no importa de nadie; `ingesta`, `redes`, `panel`, `web` importan de `compartido`; `web` no importa de `redes`/`panel`; nadie importa de `reels` salvo `redes`. Es un cambio mecánico, de ~1 día, que las 2.000 pruebas validan.

### 4.3 Código muerto y duplicado (medición propia, sobre exportaciones `export function/const/class`)

Sobre 1.363 exportaciones del código (sin contar las pruebas):

- **103 (7,6%)** no las usa ningún otro archivo, ni código ni prueba: **sobrantes o sólo de uso interno** que se exportaron "por las dudas". Las concentran `ingesta/lectura-ia.mjs` (9), `ingesta/f1.mjs` (6), `ingesta/futbol.mjs` (6).
- **407 (29,9%)** las usan **sólo las pruebas**. Esto es normal (se exporta para poder probar), pero indica que el código se diseñó para ser probado, no para ser leído: la "API" real hacia otros módulos es chica.
- La auditoría anterior mencionaba "66 exportaciones usadas sólo dentro de su archivo y 16 sólo por pruebas". Con este método da más (103 y 407) porque cuenta cada nombre aunque aparezca en comentarios; los números exactos son **SIN VERIFICAR**, el orden de magnitud sí.
- **Código muerto declarado**: `panel/servidor.mjs` (851 líneas) y el panel de PC (`panel.html`, `acceso.mjs`, `seguridad.mjs`, `buzon.mjs`, `respaldo.mjs`, `agenda.mjs`, `avisos.mjs`, `sincronizar.mjs`, `unir-conflictos.mjs`…). Si no se usa, conviene moverlo a `docs/historico/` o a otra rama y sacarlo de las pruebas.
- Hay carpetas de trabajo sueltas en la raíz: `pruebas-modelos/`, `criterio-unico/`, `comercial/`, `respaldos/` (esta, 24–28/09, es del panel viejo y está ignorada por git). **SIN VERIFICAR** cuáles están vivas.

### 4.4 Las listas repetidas a mano

**Las 11 secciones** aparecen escritas, completas, en **12 archivos de código** (`ingesta/auditoria-ia.mjs`, `criterio.mjs`, `fuentes-cruce.mjs`, `fuentes.mjs`, `lectura-ia.mjs`; `reels/placa.mjs`, `presentacion.mjs`; `web/lib/datos.js`, `notas-de-pistas.js`, `notas-propias.js`, `tarjeta-diseno.js`; `web/scripts/generar-redirects.mjs`), más: `web/public/panel/app.js` (lista de colores) y `github.js`, el CSS (`--s-*` en `globals.css`), `CRITERIO-EDITORIAL.md`, `CRITERIO-REDES.md` y **5 archivos de pruebas**. Total: **al menos 20 lugares**. Agregar o renombrar una sección (por ejemplo, "Educación" o "Salud") exige tocar todos y las pruebas avisan de a una.

**Los números del criterio** viven en `ingesta/criterio.mjs` **y** en `CRITERIO-EDITORIAL.md` (una prueba los compara), y además otra vez en `web/lib/archivo.js` (`HORAS_EN_PORTADA = 36`, `DIAS_DE_ARCHIVO = 180`, `MAXIMO_EN_ARCHIVO = 3500`), porque `web/` no puede importar de `ingesta/` (se dijo que sí lo hace, pero esos tres están duplicados a propósito, "los números viven en los dos"). Cada duplicado es una prueba más que mantener y un error posible.

**Propuesta: una sola fuente.** Un archivo de datos puro, por ejemplo `compartido/criterio.json` (o `secciones.json`), con:

```
secciones: [ {nombre, ranura, color, enNavegacion, orden, esDeAfuera:{medios:3}, ...} ]
numeros:   { horasEnPortada:36, diasDeArchivo:180, ... }
```

Y un script chico `npm run generar-criterio` que:
1. produce `ingesta/criterio.mjs` (o lo hace leer el JSON),
2. escribe la **tabla** "Los números" y la lista de secciones dentro de las marcas `<!-- … -->` de `CRITERIO-EDITORIAL.md` y `CRITERIO-REDES.md` (hoy las marcas existen y no hay que borrarlas: sirven justo para esto),
3. escribe `web/public/panel/secciones.js` y las variables `--s-*` del CSS.

Con eso, agregar una sección = tocar **un** archivo y correr un comando; las pruebas pasan a verificar "lo generado coincide con la fuente" (una sola, no cinco). Esfuerzo: 2–3 días; riesgo bajo si se hace sección por sección. **No lo toqué ni lo probé.**

---

## 5. Seguridad y privacidad

### 5.1 ¿Hay claves en el repositorio público?

Se buscó en el árbol actual (`git grep`) y en **todo el historial** (`git log --all -G`) los formatos de claves conocidos: `AIza…` (Google/Gemini), `EAA…` (Meta), `gsk_…` (Groq), `sk-…`, `ghp_…`, `github_pat_…`, `tvly-…` (Tavily). **Resultado:**

- Historial completo: **0 coincidencias** en todos los formatos (solo con los largos reales de una clave).
- Árbol actual: 0 coincidencias salvo el patrón `EAA…`, que da **2 falsos positivos**: `pruebas/fotos-notas.test.mjs:291` (es una imagen PNG en base64, "EAAAABCAY…") y `web/data/pistas.json:3` (son datos cifrados en base64 del sobre cifrado). No son claves de Meta.
- Archivos tipo `.env`, `.pem`, `credentials`: ninguno versionado (`.env*` está en `.gitignore`).
- Límites: es una búsqueda por forma, no una garantía. Un secreto con otro formato (por ejemplo la llave de Cloudflare, el token del Worker o contraseñas) **no se busca así**. **SIN VERIFICAR**: si el "secret scanning" de GitHub está activo (la API no devolvió estado; recomiendo activarlo: en repos públicos es gratis).

### 5.2 Qué es público y no debería (revisión de la lista)

- `web/data/` es público: contiene **titulares, cuerpos, fuentes, estadísticas, el libro de redes y datos de contactos institucionales** (`ingesta/contactos-agenda.json`). Lo sensible (notas que esperan, contactos propios, borradores) va **cifrado** (`celular-pendientes.json`, `celular-borradores.json`, `contactos-celular.json`) y las notas de menores/víctimas viajan sin titular. Bien pensado.
- `web/data/estadisticas*.json`, `vistas.json`, `redes.json`, `intentos-ia.json`: no tienen datos de lectores, pero **cuentan la historia interna del medio** (cuántas notas se rechazaron, el éxito de cada pieza, qué IA se usó). Es una decisión de transparencia, no un riesgo técnico; conviene que sea *decisión* y no *descuido*.
- La cuenta de GitHub del repo tiene el correo `radarbalcarce@gmail.com` y los commits usan correos *noreply*: bien.
- El WhatsApp (2266 51-1612) y el correo son públicos a propósito.

### 5.3 Cifrado de lo pendiente (`panel/cifrado.mjs` y `web/public/panel/cifrado.js`)

Diseño: cada celular genera su par de llaves RSA en el navegador (la privada queda en IndexedDB del celular, "sin que se pueda leer"); el robot cifra cada sobre con una llave AES-256-GCM al azar y la guarda cifrada con la llave pública de cada celular (RSA-OAEP/SHA-256). Es el **mismo esquema que el correo cifrado**, con primitivas estándar de `node:crypto` y `WebCrypto`. Opinión: **bien hecho**.

Puntos a mirar (todos menores):

- Si se **pierde el celular**, hay que quitar su llave de `celular-llaves.json` y volver a cifrar; **lo que ya estuvo publicado cifrado en el historial público del repositorio sigue ahí y, si la llave privada se filtrara algún día, se podría abrir el historial viejo** (no hay "secreto hacia adelante"). Ya sucede con cualquier cifrado a largo plazo, pero para menores y víctimas conviene reducir la ventana: no guardar en git versiones viejas de lo cifrado (otro motivo para la propuesta de 3.1).
- El máximo es 6 celulares (`LLAVES_MAXIMAS`): suficiente.
- Se desconoce (SIN VERIFICAR) si hay una prueba que confirme que **ninguna nota del semáforo rojo aparece en claro** en `portada.json`/`archivo.json` (las reglas 148–156 y la 1 hablan de ello; revisar una prueba "extremo a extremo").

### 5.4 El panel del celular: CSP y token

- Encabezado de `/panel/*`: `default-src 'self'; connect-src 'self' https://api.github.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'none'; form-action 'self'`. **Bien**: scripts sólo propios, conexión sólo a GitHub, sin marcos. `X-Robots-Tag: noindex`. `robots.txt` bloquea `/panel/`.
- **Riesgo estructural**: el panel vive **en el mismo dominio** que el sitio público (`radarbalcarce.com/panel`), y guarda en `localStorage` los ajustes (`radar-panel`; contiene, según el diseño, la llave de GitHub de quien lo usa; **SIN VERIFICAR** el contenido exacto). Cualquier falla que permita meter un script en **cualquier** página pública (que comparten el origen) podría leer ese `localStorage` y robar la llave. Hoy el riesgo es bajo (no hay formularios ni comentarios, el texto se escapa; `dangerouslySetInnerHTML` sólo para datos estructurados y el extracto del buscador de Pagefind, que escapa el HTML), pero **el sitio principal no tiene CSP** (sólo `frame-ancestors`) por los scripts en línea (JSON-LD, contador de Cloudflare).
- Mejora de bajo costo: servir el panel desde un **subdominio** (`panel.radarbalcarce.com`, otro proyecto de Pages o una ruta de Cloudflare) para que tenga su propio `localStorage` y que un problema en la web pública no llegue a la llave. Esfuerzo medio (3–4 h, hay que mover la dirección y reconfigurar `sw.js`).
- La **llave de GitHub** del celular debería ser un token de grano fino sólo para este repo, con la fecha de vencimiento más corta posible y permisos mínimos (Actions + Contents). Para el Worker del reloj, el mismo criterio ("vence-token-github" ya lo vigila).

### 5.5 Cadena de suministro (supply chain)

Qué es: el riesgo de que un componente que usamos se vuelva malicioso o desaparezca.

| Punto | Situación | Riesgo | Mejora |
|---|---|---|---|
| Paquetes npm | Pocos (Next, React, Pagefind, resvg, ffmpeg-static) con `package-lock.json` y `npm ci` | Bajo | Activar Dependabot (hoy deshabilitado: la API respondió "alerts are disabled") y revisarlo una vez al mes |
| Acciones de GitHub | Referenciadas por **etiqueta móvil** (`@v4`), no por código fijo | Medio-bajo: si la cuenta de un mantenedor se compromete, el robot corre código ajeno con permiso de **escritura sobre el repo y todas las claves** (Meta, Gemini, Cloudflare) | Fijar por SHA (los 4 usados son de GitHub oficial, riesgo bajo, pero el costo de fijarlos es de 10 minutos) |
| `npx --yes wrangler@4.139.0` | Versión fija, pero **sus dependencias internas se bajan en cada corrida** sin lockfile; se ejecuta con `CLOUDFLARE_API_TOKEN` (permiso de escritura en Pages y R2) | Medio | Agregar `wrangler` a un `package.json` con lockfile (infra/) y usar `npm ci` |
| `ffmpeg-static` | **Descarga el binario desde GitHub en `npm install`**. **SIN VERIFICAR** que verifique firma/huella | Medio-bajo | Fijar la huella, o usar `apt` en el runner |
| Modelos de IA | `gemini-flash-lite-latest` cambia solo | Calidad, no seguridad | Fijar versión cuando estén disponibles |
| Workflows con permisos | `contents: write` en los que escriben datos; ningún workflow usa `pull_request` ni `pull_request_target` | Bien | Dejar el resto en `contents: read` (ya lo hacen) |
| Inyección por entradas de workflow | `auditar-redes.yml` mete `inputs.desde` directo en una línea de comando (`--desde=${{ … }}`); sólo lo pueden disparar los colaboradores | Bajo | Pasarlo por variable de entorno como ya hacen `piezas.yml` y `panel.yml` |
| Rama `main` sin protección | Cualquier colaborador puede forzar un push | Medio | Activar protección (no permitir `force push` ni borrar), sin exigir revisión (los robots deben empujar) |
| Dos colaboradores personales + cuenta del medio | `agerace`, `balcar-dev`, `radarbalcarce` | — | Activar 2FA en las tres (SIN VERIFICAR si está) |

---

## 6. Accesibilidad, SEO y rendimiento

Revisé el código de `web/app/` y pedí (con Node, una vez cada una, con 1,5 s entre pedidos) la portada, una nota, `robots.txt`, `sitemap.xml`, `feed.xml`, `llms.txt` y páginas inexistentes de `https://radarbalcarce.com`.

### 6.1 Lo que está muy bien

- **Estático y rápido**: portada de 83 KB de HTML (comprimida con Brotli por Cloudflare), un solo CSS de 38 KB, 8 archivos JS, todas las tipografías propias (sin pedirle nada a Google), imágenes con ancho y alto declarados (**no hay saltos de diseño**), `fetchPriority="high"` en la primera imagen, `loading="lazy"` en las siguientes, tipografías precargadas.
- **Caché**: JS/CSS de Next `immutable` por un año; fuentes y escudos, un año; fotos 7 días (puede ser un año, ver 2.3); HTML `max-age=0, must-revalidate`.
- **Seguridad de cabeceras**: HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **SEO técnico**: `<html lang="es-AR">`, un solo `<h1>`, `canonical` por página (con la historia del 25/09 resuelta), `og:`/`twitter:` completos, **datos estructurados** (portada: 2 bloques; nota: 6, con `NewsMediaOrganization`, `NewsArticle`, `WebPage`, `WebSite`, `Organization`, `City`/`PostalAddress`), `sitemap.xml` con 1.230 direcciones (límite de Google: 50.000), `sitemap-news.xml`, `feed.xml` con texto completo, `robots.txt` correcto (permite todo, bloquea `/panel/`), `llms.txt`, IndexNow para Bing, 404 verdaderos (código 404, `no-store`).
- **Accesibilidad**: enlace "Saltar al contenido", `lang` correcto, `viewport`, un `h1`.

### 6.2 Lo que mejorar (sin medir con Lighthouse real: **SIN VERIFICAR** las notas; esto es lectura del código y de los encabezados)

| # | Hallazgo | Por qué importa | Esfuerzo |
|---|---|---|---|
| 1 | **Imágenes de las tarjetas con `alt=""`** (las 5 de la portada). Si el título de la nota está al lado como texto, es correcto (decorativas); pero si la tarjeta es sólo la imagen enlazada, queda **sin nombre accesible**. Revisar con un lector de pantalla | Accesibilidad y SEO de imágenes | 1–2 h |
| 2 | **Fotos de 1200×900 para todo** (sin `srcset` ni versiones chicas). La portada baja ~5 fotos de ~30–75 KB; en el celular sobran. Hay una "miniatura" mencionada en los pendientes (`1 MB de más por lista`) | Más datos para el lector móvil | 4–6 h (con R2 es más fácil: variantes) |
| 3 | **JPEG, no WebP/AVIF** (ya anotado como pendiente) | −25–40% de peso | 1 día |
| 4 | **Caché de fotos de 7 días** cuando el nombre no cambia nunca | Menos pedidos repetidos | 5 min (`_headers`) |
| 5 | **Sin CSP en el sitio principal** (por scripts en línea) | Defensa en profundidad (ver 5.4) | 1 día (hashes o `nonce`) |
| 6 | **Sin `Cross-Origin-Opener-Policy`, `includeSubDomains`/`preload` en HSTS** | Menor | 15 min |
| 7 | **Sitemap de 275 KB** (1.230 URLs; sin problema hoy). Dividir a partir de ~20.000 URLs | Futuro | — |
| 8 | **`cf-cache-status: DYNAMIC`** en el HTML: normal en Pages (el HTML se sirve por el borde igual), pero con `max-age=0` cada visita revalida | Latencia mínima | Optativo |
| 9 | **37 etiquetas `<script>`** en la portada: son los trozos de Next (y los datos para hidratar). No está mal, pero el sitio es casi 100% lectura; con Next 16 y los componentes de servidor se bajaría | Rendimiento en celulares viejos | Con la decisión de Next |
| 10 | Falta una **medición real** continua (Lighthouse CI o la herramienta de Cloudflare "Web Analytics → Core Web Vitals") | Detectar regresiones | 2 h (el beacon ya está) |
| 11 | Las páginas de **notas que ya no existen dan 404** (ver 2.4) | SEO a largo plazo | Ver 2.4 |

---

## 7. Plan de salud (ordenado por urgencia y esfuerzo)

Convenciones: **E** = esfuerzo (h = horas de trabajo, d = días), **R** = riesgo de hacerlo, **Q** = quién (H = Hernán, A = Andrés, C = Claude).

### AHORA (esta semana, antes del 21/10)

| # | Qué | Por qué | E | R | Q |
|---|---|---|---|---|---|
| 1 | **Respaldo real**: crear proyecto en GitLab y depósito R2 `radar-respaldos`, cargar `GITLAB_TOKEN`, `GITLAB_REPO`, `R2_RESPALDOS`; correr "Respaldo" a mano y mirar que diga "subido" en las dos | Hoy hay una sola copia (en la misma cuenta) | 1–2 h | Bajo | H/A con guía de C |
| 2 | **Simulacro de restauración**: bajar el bundle, `git clone` y levantar el sitio en una carpeta nueva; anotar el resultado en `docs/` | Nadie sabe si el respaldo sirve | 2 h | Nulo | C + H |
| 3 | **Alarma que no dependa del reloj**: la vigilancia debe tener su propio `schedule` de GitHub (hoy sólo `workflow_dispatch`, o sea, depende del Worker). Y que avise por WhatsApp si no hubo "Actualizar la web" en 2 h | Si el Worker/token cae, nada avisa | 1 h | Bajo | C |
| 4 | **Next 15.5.28** (parche) y volver a correr `npm audit` y `npm test`; **decidir** si se queda en Next 15 (recomendado) | Cierra lo del 21/10 sin cambios grandes | 1 h | Bajo | C |
| 5 | **Proteger `main`** (sin `force push` ni borrado) y activar **2FA**, **secret scanning**, **push protection** y **Dependabot** | Gratis; frena errores y robos | 30 min | Nulo | H/A |
| 6 | `retiradas.json` y `celular-pendientes.json` **fuera de la lista del `git add`** o con "gana el más nuevo" | Una retirada a mano no se puede perder | 1–2 h | Medio (tocar el flujo) | C |
| 7 | Cambiar `max-age` de fotos a un año (`_headers`) y agregar `OFL.txt` junto a las fuentes | Cero costo | 15 min | Nulo | C |

### ESTE MES (hasta el 15/11, antes de llegar al tope de 3.500 y al límite del bundle)

| # | Qué | Por qué | E | R | Q |
|---|---|---|---|---|---|
| 8 | **Fotos a R2** (sección 2.3) con el robot subiendo y sin commitear; revisar que redes/reels sigan leyendo la foto | Frena el 60% del crecimiento del repo; −862 archivos por despliegue | 1 d | Medio | C + H (Cloudflare) |
| 9 | **Que no se rompan los enlaces viejos**: opción 3 de 2.4 (página liviana o redirección a la sección) para toda nota que salga del archivo, y subir el tope mientras tanto | En diciembre empiezan los 404 | 2–3 d | Medio | C |
| 10 | **Respaldo que entre en R2**: dividir el bundle o usar la API S3 | Se pasa el límite de 300 MB hacia el 20/11 | 3–4 h | Bajo | C |
| 11 | **`celular-pendientes.json`**: no reescribir si el contenido no cambió | −18 MB de historial y menos ruido | 1–2 h | Bajo | C |
| 12 | **Prueba de la lista de `git add`** contra los archivos que escribe el código | Un archivo nuevo ya no se pierde | 2 h | Nulo | C |
| 13 | Medir el **número real de archivos por página** con Next 15 y con Next 16 (en una rama, en un armado descartable) y actualizar la regla 148 con la cuenta de este documento | La regla 148 promete algo que no se sostiene | 2 h | Nulo | C |
| 14 | Documento `docs/RECONSTRUIR.md`: qué hay que volver a crear si se pierde GitHub, Cloudflare o Google | Continuidad del medio | 3 h | Nulo | C + H |
| 15 | Revisar `alt` de tarjetas con lector de pantalla y arreglar | Accesibilidad | 2 h | Bajo | C |

### ESTE AÑO (hasta octubre de 2027)

| # | Qué | Por qué | E | R | Q |
|---|---|---|---|---|---|
| 16 | **Archivo eterno** (opción 2 de 2.4: Worker + R2) y decidir Next 16 en consecuencia | Que ninguna nota deje de existir | 1–2 sem | Medio-alto | C |
| 17 | **Una sola fuente** para secciones y números del criterio, con script que genera tablas, CSS y panel (sección 4.4) | 20 lugares a 1 | 2–3 d | Bajo | C |
| 18 | **Módulos con fronteras vigiladas** (sección 8): carpeta `compartido/` y prueba de direcciones de import | Que se pueda tocar un módulo sin romper otro | 2–3 d | Bajo (hay 2.000 pruebas) | C |
| 19 | Partir `ingesta/ingesta.mjs` en `entrada` / `clasificación` / `puntaje` / `semáforo`; mover `reels/reescritura.mjs` a `redaccion/` | El archivo más cambiado y más largo | 1 sem | Medio | C |
| 20 | **Sacar el panel de PC** (`panel/servidor.mjs` y vecinos) del árbol principal | 851+ líneas muertas | 1 d | Bajo | C |
| 21 | Panel del celular en un **subdominio**; CSP en el sitio principal | Aislar la llave de GitHub | 1 d | Medio | C |
| 22 | Pasar a **WebP/AVIF + miniaturas** (con R2) | Rendimiento móvil | 1–2 d | Bajo | C |
| 23 | Revisión legal única: fotos de terceros y escudos de clubes | Riesgo de reclamos | — | — | H/A + abogado |
| 24 | Planes de salida: segundo proveedor de voz, de IA y de hosting (documentados, no instalados) | Que un proveedor que cambia sus condiciones no frene el medio | 2 d | Nulo | C |
| 25 | Calendario fijo de mantenimiento mensual (30 min): `npm outdated`, `npm audit`, subir wrangler, mirar vencimientos (dominio 21/09/2027, voces 29/09/2027) | Evita sorpresas | 30 min/mes | Nulo | A |

---

## 8. Mapa de módulos propuesto

Hoy el sistema se entiende como un flujo (`fuentes → ingesta → cruce → … → redes`) pero el código está repartido en carpetas por **tipo de tecnología** (`ingesta/`, `reels/`, `redes/`, `panel/`, `web/`), no por **trabajo**. La propuesta es pensar en 13 módulos, cada uno con **entradas, salidas y dueño de sus archivos**, aunque al principio los archivos no se muevan: primero se documenta el mapa (esta tabla) y una prueba vigila quién importa a quién; después, de a poco, se mueve.

**Reglas para todos los módulos**: sólo se hablan por archivos de datos o funciones de la lista "Salidas"; ninguno lee las "tripas" de otro; un módulo **de abajo** nunca importa de uno **de arriba** (el orden de la tabla es el orden del flujo).

| # | Módulo | Hace | Entradas | Salidas | Archivos de hoy |
|---|---|---|---|---|---|
| 1 | **Fuentes** | Define de dónde sale la información, su peso y cuándo se apaga | Decisión de personas | Lista de fuentes con peso y estado; `FUENTES.md` | `ingesta/fuentes.mjs` (la lista + reglas mezcladas), `fuentes-cruce.mjs`, `listar-fuentes.mjs`, `medir-fuentes.mjs`, `FUENTES.md` |
| 2 | **Entrada** (ingesta) | Lee los feeds y páginas, limpia, saca fechas, detecta repetidos de la misma fuente | Fuentes | Notas crudas (título, texto, fecha, medio, foto) | `ingesta/ingesta.mjs` (parte lectura), `articulo.mjs`, `utiles.mjs`, `zona.mjs`, `agenda.mjs`, `f1.mjs`, `futbol.mjs`, `datos-vivos.mjs` (clima, dólar, farmacia) |
| 3 | **Cruce** | Junta lo que es el mismo hecho contado por varios medios | Notas crudas | Grupos de notas (hecho + medios que lo cuentan) | `ingesta/cruce.mjs`, `lectura-ia.mjs` (`agruparRepetidas`, `quitarRepetidas`), `web/lib/repetidas.js`, `texto.js` |
| 4 | **Clasificación** | Decide sección, si es "de acá", semáforo (rojo/amarillo/verde), tema | Grupos | Nota con sección, "de acá", semáforo, motivo | `ingesta/ingesta.mjs` (`REGLAS_SECCION`, `esDeAca`), `fuentes.mjs` (`REGLAS_SEMAFORO`), `menores.mjs`, `perfil-balcarce.md`, `lectura-ia.mjs` (lectura con IA) |
| 5 | **Puntaje** | Pone el puntaje y decide qué se publica y qué espera | Nota clasificada | Lista ordenada: publicar / esperar / descartar | `ingesta/criterio.mjs`, `ingesta/ingesta.mjs` (puntaje), `CRITERIO-EDITORIAL.md` |
| 6 | **Redacción** | La IA escribe título, bajada y cuerpo desde las fuentes; reintenta; respeta el tope | Notas a publicar + fuentes + reglas § 4 y § 12 | Nota escrita (o "sin cuerpo", sin publicar) | `reels/reescritura.mjs`, `ingesta/prompt-editorial.mjs`, `reels/claves.mjs`, `ingesta/busqueda.mjs`, `panel/reescribir-una.mjs`, `pistas.mjs`, `nota-de-pista.mjs` |
| 7 | **Verificación** | Comprueba lo escrito contra la fuente; arregla ortografía sin inventar | Nota escrita + fuentes | Nota verificada + nivel (alto/medio/bajo) | `ingesta/verificar.mjs`, `ingesta/auditoria-ia.mjs`, `redes/auditar-notas.mjs`, `web/lib/cuerpo.js` |
| 8 | **Fotos** | Elige o busca la foto, la achica, guarda crédito y banco, hace placa si no hay | Nota + enlaces de fuentes | `banco-fotos.json` + imágenes; foto o placa de la nota | `ingesta/fotos.mjs`, `auditar-fotos.mjs`, `web/scripts/fotos-notas.mjs`, `achicar-foto.mjs`, `foto-manual.mjs`, `foto-libre.mjs`, `foto-efemeride.mjs`, `reels/placa.mjs`, `docs/05-FOTOS.md` |
| 9 | **Publicación web** | Arma `web/data/*.json`, el sitio estático y lo sube; mantiene archivo y redirecciones | Notas verificadas + datos vivos | `portada.json`, `archivo.json`, el sitio en Cloudflare, `sitemap`, `feed.xml` | `web/scripts/generar-datos.mjs`, `web/lib/archivo.js`, `datos.js`, `notas-propias.js`, `eventos.js`, `web/app/*`, `web/components/*`, `generar-redirects.mjs`, `indexar.mjs`, `.github/workflows/actualizar.yml` + `cloudflare-deploy.yml` |
| 10 | **Redes** | Elige, escribe y publica en Facebook/Instagram, con voz y video; contrato del día | Lo ya publicado + criterio de redes | Posteos, reels, libro `redes.json` | `redes/*` (elegir, guiones, piezas, publicar-piezas, meta, contrato…), `reels/*` (placa, voz, video), `CRITERIO-REDES.md`, `redes.yml`, `piezas.yml` |
| 11 | **Panel** | Que personas decidan, corrijan, pidan a la IA y vean pendientes (celular) | Pendientes cifrados, decisiones | `celular-decisiones.json`, `correcciones.json`, `retiradas.json`, `fotos-manuales.json`… | `web/public/panel/*`, `panel/cifrado.mjs`, `celular.mjs`, `celular-datos.mjs`, `panel.yml`; **y el panel de PC en desuso** (`panel/servidor.mjs` y vecinos) |
| 12 | **Operación y vigilancia** | El reloj, los respaldos, las alarmas, los vencimientos | Todo el estado | Avisos por WhatsApp, `vigilancia.json`, resumen diario | `infra/reloj-cloudflare/*`, `redes/vigilar.mjs`, `avisos.mjs`, `whatsapp.mjs`, `respaldo.yml`, `vigilancia.yml`, `fotos-a-r2.yml` |
| 13 | **Analíticas** | Mide lectores, redes, IA, y qué funciona | Cloudflare, Meta, Gemini | Números en `estadisticas*.json` y pestaña "Números" | `redes/estadisticas*.mjs`, `ingesta/estadistica-diaria.mjs`, `web/public/panel/numeros.js`, `vistas.json` |

**Dónde están hoy los cruces que no encajan** (lo que más cuesta ordenar):
- El módulo 4 (clasificación) y el 5 (puntaje) están **dentro del mismo archivo** (`ingesta.mjs`) que el 2 (lectura).
- El módulo 6 (redacción) vive en `reels/`, y el 10 (redes) usa `reels/` para voz y video: la carpeta `reels/` mezcla dos módulos.
- El 9 (publicación web) lee cosas de 1, 4, 5 y 8 directamente por archivo, y a la vez 4 importa utilidades de `web/lib` (`texto.js`): ese es el ciclo que hay que cortar con `compartido/`.
- El 11 (panel) tiene tres cosas en uno: la app del celular (viva), el cifrado (vivo) y el panel de PC (muerto).

**Cómo empezar sin romper nada** (3 pasos): (1) escribir esta tabla en `docs/` como mapa oficial; (2) una prueba que lea los `import` y avise si se viola la dirección entre módulos (con una lista de excepciones actuales que se va reduciendo); (3) mover primero lo más fácil (`compartido/`, `redaccion/`, sacar el panel de PC), después partir `ingesta.mjs`.

---

## 9. Lo que no pude comprobar (SIN VERIFICAR, junto)

- Cuántos archivos exporta Next 16 **hoy** por página (el dato 3,1 es de la regla 148, del 8/10, cuando la proporción con Next 15 era otra).
- Por qué los archivos por página subieron de ~1,7 a ~2,45 entre el 8 y el 15/10.
- Los límites actuales de archivos de Cloudflare Pages / Workers en planes pagos (para decidir entre las opciones de 2.4).
- Que la restauración desde el bundle funcione, y que el bundle contenga todo (el 11/10 pesó 172 MB y el log no muestra errores).
- Que `ffmpeg-static` verifique su descarga; qué contiene exactamente el `localStorage` del panel.
- Si el escaneo de secretos de GitHub y el 2FA están activados en las tres cuentas.
- Las notas de Lighthouse (accesibilidad, rendimiento): no se ejecutó, sólo se leyó el código y se pidieron las cabeceras.
- Las fechas de fin de soporte de Node 24, de Next 15 y de las Actions v4 (se usó lo escrito en el proyecto y de memoria).
- La procedencia legal de los 58 escudos y de las fotos de terceros.
- Cuánto tarda hoy `npm test` por separado (el registro de "Actualizar la web" incluye la prueba entera: 5,5 a 6,5 min en total).
- Que el 100% de los falsos positivos de `EAA…` son los dos mencionados (se verificó la forma, no el contenido completo).
- No se corrió ningún armado local (`web/out` no existe en esta PC), así que el recuento de archivos viene del registro de Actions, que es el dato real de producción.
