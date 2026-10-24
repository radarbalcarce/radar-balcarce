# Los minutos de Workers Builds: de dónde salen y cómo se bajan

*24/10/2026, regla 312. Para Hernán y Andrés: la web se arma en una máquina de Cloudflare («Workers Builds») que incluye **6.000 minutos por mes**; pasados, cada minuto cuesta US$ 0,005. El motor se diseñó suponiendo vueltas de ~4,5 minutos; el 23/10 se anotaron de ~14. Con 48 vueltas por día eso se agota en pocos días y el reloj empieza a saltear vueltas (la web tarda más en actualizarse). Acá está qué se midió, qué se cambió y qué falta. Todo lo nuevo viene **apagado**; se prende con variables. **Ojo: los 6.000 minutos se cuentan por ciclo de facturación (del 11 al 10), no por mes calendario: sección 7, regla 315.***

## 1. El problema, con números

Cuántos minutos gasta el mes según lo que tarde cada vuelta (simulación del presupuesto, `infra/motor-cloudflare/presupuesto.mjs`, un mes de 31 días; incluye el medio minuto de más por vuelta). «Vueltas por día» es lo que el presupuesto deja correr sin pasarse del 95 % de lo incluido (5.700 minutos):

| Lo que tarda la vuelta | Vueltas por día que alcanzan | La web se arma cada | Lo que gastaría el mes pidiendo 48 por día | Pidiendo 40 por día (noche por hora) |
|---|---|---|---|---|
| 14 min (lo del 23/10) | 13 | 110 min | 21.576 min (3,6 veces lo incluido) | 17.980 min |
| 8 min | 22 | 65 min | 12.648 min | 10.540 min |
| 5 min | 34 | 42 min | 8.184 min | 6.820 min |
| 4,5 min | 38 | 38 min | 7.440 min | 6.200 min |
| 4 min | 42 | 34 min | 6.696 min | 5.580 min (cabe, sin saltear nada) |
| 3,5 min | 47 | 30 min | 5.952 min (se saltea poco) | 4.960 min |

Para pedir **40 por día sin saltear ninguna** la vuelta tiene que tardar **4,1 minutos o menos**; para pedir las 48, **3,3 o menos**. Meta de este documento: bajar de 14 a ~4 minutos.

## 2. De dónde salen los minutos de una vuelta

Lo que sabemos y lo que no. **No hay en el repositorio un desglose por paso de las vueltas de Workers Builds**: hasta hoy `motor/estado.json` guardaba sólo la última vuelta y el registro del mes sólo el total. Eso se arregló (sección 3, D): desde la próxima vuelta el registro suma el tiempo de cada paso y `GET /estado` del Worker del motor lo muestra. Mientras tanto, esto es lo medido:

**a) Lo que guarda el repositorio** (corridas de «Actualizar la web» y «Cloudflare Pages» en GitHub Actions, 1 a 14/10, `docs/auditoria-2-0/01-ARMADO-E-INFRA.md` § 1.1; `tabla-minutos-14d.md`), antes del tope de 500 notas:

| Paso | Segundos |
|---|---|
| Preparar, bajar el código, instalar | 16 |
| Núcleo legal de las pruebas | 2 |
| Buscar noticias y armar los datos (`generar-datos`) | **121** (p50 107, máx. 285) |
| Compilar el sitio (con 1.800 páginas) | **146** (p50 159) |
| Revisar el SEO, guardar los datos | 5 |
| Archivar en R2, subir a Pages | 8 + 22 |
| **Corrida entera** | media 249, p95 482, máx. 1.222 |

**b) Lo que anotó el equipo el 23/10** (`docs/TRASPASO.md`): con `TOPE_DE_NOTAS=500` las primeras vueltas **tardaron ~14 minutos porque exportaban 100 notas cada una** al archivo permanente (el paso «Archivar las notas por salir», que sube las notas por salir con `wrangler` y tiene un tope de 6 minutos). Es transitorio: una vez al día con el tope estable son unas pocas notas por vuelta (la huella de cada nota evita subirla dos veces). Pero el paso queda a la vista en el registro para comprobarlo.

**c) Medido el 24/10 en la PC** (Windows, 4 procesadores, la web de hoy: 1.154 páginas, 499 notas, 490 imágenes de tarjetas de 276 MB — una nota, dos imágenes, ~560 KB cada una). Son tiempos de la PC, no de Workers Builds: sirven para las **proporciones**.

| Paso | Frío (sin memoria de tarjetas) | Con la memoria de tarjetas |
|---|---|---|
| `next build` (compilar, dibujar las imágenes, páginas) | **174, 180 y 204 s** | **51 y 65 s** |
| Buscador (Pagefind) | 1,5 s en estado normal* | — |
| `npm run test:nucleo` | 5,9 s | — |
| `npx wrangler@4.139.0` la primera vez (cada vuelta, en una máquina nueva) | **33 s** | 5 s con caché |
| `npm ci` de la raíz / de `web/` en frío | 24 s / **128 s** (84 MB / 369 MB) | (Workers Builds instala la raíz solo; `web/` lo instala la vuelta) |

\* Las dos primeras mediciones dieron 71 y 158 s: era el antivirus de Windows revisando los 4.000 archivos recién escritos, no el buscador. Medido solo da 1,5 s. No es un costo del motor.

**Lo que dice la medición:** de los ~180-200 s de compilar, **~115 a 140 s (el 64 al 71 %) son dibujar las imágenes** que la regla 305 ya sabía no repetir… pero su memoria vive en `.cache/tarjetas/` y en Workers Builds **cada vuelta empieza en una máquina nueva**: `estado-r2.mjs` la saltaba (son 276 MB) y la memoria no servía de nada. Ahí está el mayor ahorro claro.

**d) Sin medir todavía en Workers Builds** (y por eso quedan registrados desde ahora): el clon y la instalación de la raíz, `npm ci` de `web/` (128 s en frío en la PC; si Workers Builds tiene caché de dependencias baja a segundos), la descarga de `wrangler` (33 s en frío), la lectura de fuentes y la IA (121 s de media en Actions), la cola. La suma de todo eso con una compilación fría de ~3 a 6 minutos explica vueltas de 10 a 14.

## 3. Qué se cambió (todo apagado por defecto)

### A. La memoria de tarjetas vive en R2 (`TARJETAS_EN_R2=Si`)

- Cada imagen ya tenía una **huella** (diseño, formato, título, sección, día y bytes de la foto: regla 305). Ahora, cuando la compilación necesita una imagen y no está en el disco, **pide ESA huella a R2** (`motor/tarjetas/<huella>.png`, un objeto suelto). Baja **sólo lo que pide**, no un paquete de 276 MB entero (`infra/compartido/tarjetas-r2.mjs`, llamado desde `tarjetaConMemoria` de `web/lib/tarjeta.js`).
- Si R2 tarda (10 s), falla (cinco fallas seguidas la apagan para esa compilación), no la tiene o devuelve algo que no es un PNG: **se dibuja como siempre**. La memoria nunca frena la compilación.
- Después de compilar (y antes de subir el sitio, con tope de 150 s) `sincronizarTarjetas` sube las imágenes que se dibujaron de nuevo y anota en `motor/tarjetas-indice.json` el último día que se pidió cada huella. **Poda:** se borra lo que nadie pidió en 3 días y, si pasa de 3.000 imágenes (~1,7 GB), lo menos reciente. Sin cambios no se escribe nada (el índice se reescribe como mucho una vez por día y cuando hay novedades).
- Solo corre si la vuelta compiló (con la huella del sitio igual a la publicada, regla 304, no hay nada que guardar), no es simulacro, y están las claves de R2 del motor (`R2_MOTOR`, etc.).
- **Costo en R2:** unos 490 pedidos de lectura por vuelta (clase B: 40 vueltas × 490 × 30 = ~590.000 por mes, de 10 millones gratis), un listado y pocas escrituras. Almacenamiento: hasta ~1,7 GB de los 10 GB gratis. Descarga: ~275 MB por vuelta de R2 a Workers Builds (sin cargo por salida de R2).
- **Una sola vez**: este cambio toca `web/lib/tarjeta.js`, que entra en la huella del diseño. La primera vuelta con el cambio dibuja todas las imágenes (no hay memoria vieja que valga) y las sube; desde la segunda es la memoria.

**Antes / después** (PC, con un R2 simulado en disco por el mismo camino de producción: `fetch` hacia `*.r2.cloudflarestorage.com` desviado a una carpeta; no incluye el tiempo de red):

| | Compilar | Pedidos a R2 | Después de compilar |
|---|---|---|---|
| Sin `TARJETAS_EN_R2` (hoy en Workers Builds) | 174-204 s | — | — |
| Con `TARJETAS_EN_R2`, R2 vacío (primera vuelta) | 174 s (490 consultas sin respuesta: no se nota) | 490 sin respuesta | sube 490 imágenes (2,6 s en disco) |
| Con `TARJETAS_EN_R2`, carpeta vacía y R2 completo (cualquier vuelta siguiente) | **51 s** (−71 %) | 490 con respuesta | sube 0 imágenes, no reescribe el índice |

En Workers Builds hay que sumar la descarga de ~275 MB: a 25 MB/s son ~11 s, a 5 MB/s son ~55 s; en ambos casos queda por debajo de los ~120 s que se ahorran. **[ESTIMADO; la primera semana se mira en `pasos` del registro].**

### B. De 23:00 a 6:59, una vuelta por hora (`MOTOR_NOCHE_CADA_HORA=Si`)

- En el **reloj** (`trabajosDelMinuto`): ocho vueltas menos por día (48 a 40). Se saltean los :30 de 23 a 6:30; los :00 quedan. Lo demás del reloj no se mueve (la vigilancia de 0:30, el segundo intento del informe).
- El **vigilante de vueltas** del reloj (el que pide una vuelta de rescate a los :10, :20, :40 y :50 si la última buena tiene 40 minutos o más) esperaría los 40 minutos y a los :50 **pediría una vuelta de más, justo lo que se quiere ahorrar**. Con la variable prendida, de noche espera 100 minutos (`umbralDeAtraso`). Probado con un día entero simulado: cero rescates de más.
- El **vigilante de Cloudflare** (web vieja: 3 horas de día, 6 de noche; vuelta buena: 3 horas) no da falsa alarma con una vuelta por hora: el hueco más largo es de 60 minutos más lo que tarda la vuelta. El de GitHub (`redes/vigilar.mjs`, «web vieja» a los 100 minutos) también aguanta, pero **con poco margen**: 60 + 14 = 74 de 100. Si las vueltas pasaran de 40 minutos de duración, habría que subir ese límite (no se tocó: `redes/` queda fuera de este cambio).
- **Dónde se prende:** la variable `MOTOR_NOCHE_CADA_HORA` en el panel de Cloudflare del **reloj** (decide qué se pide) y también en el **Worker del motor** (para que la proyección del mes cuente 40 y no 48). El reloj hay que volver a subirlo a mano («Reloj de Cloudflare») porque cambió el código.
- Qué ahorra de verdad (simulación del mes con el presupuesto): con vueltas de **3,5 minutos**, 5.884 → 4.960 minutos por mes; con **4 minutos**, el presupuesto deja de saltear vueltas (5.882 → 5.580, y de 42 a 40 por día pedidas, todas corren). Con vueltas **más largas que ~4,1 minutos**, donde el presupuesto ya está saltando, el gasto total es el mismo (el tope manda) y la cantidad de vueltas por día también (13 con 14 minutos); lo que cambia es **cuándo**: el presupuesto reparte los minutos parejo en el tiempo y, si de noche se piden la mitad, lo que no se gastó se acumula y se gasta de día. Con 8 minutos, 248 pedidos nocturnos de menos en el mes (de 796 saltados a 548).

### C. «No compilar ni subir si la huella no cambió» (regla 304, ya estaba)

Ya existía y la vuelta lo usa (`huellaPublicada`). Se verificó que los pasos siguen en el orden correcto y que las tarjetas no se suben cuando no se compiló. **No se agregó nada, porque medirlo da poco:** en las últimas vueltas de `main` **cada commit de datos cambió `portada.json` por notas que entran y salen** (1.200 líneas el 24/10 a las 04:34; 465 a las 05:04) y la regla 304 ya había medido 97 vueltas de 97 distintas. Sirve en una madrugada muy quieta y como freno, no como ahorro. Ahora el registro del mes cuenta **cuántas vueltas compilaron y cuántas no** (`compiladas`, `sinCompilar`) para saber cuánto sirve de verdad.

### D. El presupuesto usa el tiempo real y avisa (`proyectar`, `avisoDeMinutos`)

- El registro `motor/minutos/AAAA-MM-DD.json` (desde la regla 315, por ciclo de facturación; antes `AAAA-MM.json`) suma ahora **el tiempo de cada paso** (`pasos`), las vueltas que compilaron y las que no, y la más larga. Se miden además tres pasos que antes valían 0: «Traer la memoria del cruce (R2)», «Guardar la memoria del cruce (R2)», «Guardar los datos en GitHub» (y el tiempo real de «Traer las fotos de R2»).
- **`MOTOR_MINUTOS_DE_MAS`** (variable de GitHub, se carga con «Cargar variables del motor»): el medio minuto que se le suma a cada vuelta por lo que ella no ve (el clon, la cola, la instalación de la raíz). Cuando se compare el contador de Cloudflare (Workers & Pages → `radar-balcarce-motor` → Builds) con el registro, la diferencia dividida por las vueltas es el número que va. Entre 0 y 10; vacío, 0,5.
- **`GET /estado`** del Worker del motor (con `x-token`) devuelve `proyeccion` (minutos que lleva el mes, lo que tarda una vuelta, adónde llegaría el mes **al ritmo pedido**, cuántas vueltas por día alcanzan, cada cuánto se armaría la web y los pasos que más pesan) y `aviso`.
- **El aviso:** si el mes proyectado pasa los 6.000 minutos con al menos 12 vueltas medidas, el **vigilante de Cloudflare** manda por mail un problema `motor-minutos` («A este ritmo el armado de la web se pasa de los 6000 minutos…», con los números y las opciones), que se repite cada 24 horas mientras siga. Avisa **antes** de que el presupuesto empiece a saltear vueltas. Hoy 14 minutos por vuelta lo dispararía en cuanto haya 12 vueltas medidas.
- Qué NO cambió: el reparto parejo de los 6.000 minutos, el margen del 5 %, las 3 horas como máximo sin vuelta y `MOTOR_SIN_TOPE`.

## 4. Cómo prender cada cosa (en este orden, de a una)

1. **Subir los programas** (a mano; no se suben solos): «Desplegar Workers de Cloudflare» (motor, vigilante) y «Reloj de Cloudflare». Sin variables nuevas, todo sigue como hoy; sólo se empieza a registrar el tiempo por paso y a verse la proyección.
2. **Mirar un día el registro** (`GET /estado` del motor o `motor/minutos/AAAA-MM-DD.json` en R2): `pasos` dice qué paso gasta más. Poner `MOTOR_MINUTOS_DE_MAS` si el contador de Cloudflare no coincide.
3. **`TARJETAS_EN_R2=Si`** (variable de GitHub, después «Cargar variables del motor»). Primera vuelta: lenta (dibuja todo, sube 490 imágenes; el log dice `Tarjetas: N pedidas en esta compilación, N nuevas a R2`). Segunda: tiene que decir `0 nuevas` o unas pocas, y el paso «Compilar el sitio» tiene que bajar de minutos. Vuelta atrás: vaciar la variable (las imágenes quedan en R2 hasta que se borren a mano; no molestan).
4. **`MOTOR_NOCHE_CADA_HORA=Si`** en el reloj y en el Worker del motor. Mirar la primera noche: una vuelta por hora y ningún rescate a los :50 (el log del reloj muestra `actualizar.yml` sólo a los :00).

## 5. Qué falta (lo que sé y no hice)

- **Medir en Workers Builds.** Todos los números de la sección 2 c) son de la PC. El registro nuevo da el desglose real después de una o dos horas de vueltas.
- **El informe diario** (`redes/informe-diario.mjs`) no muestra todavía los minutos del mes ni la proyección: no se tocó (`redes/` quedó fuera). Una línea que lea `ultimo.nube.motor.minutos` del `/estado` público del vigilante alcanza.
- **`wrangler` se baja cada vuelta (33 s en la PC en frío).** Sería ~20 minutos por día. Dos caminos: agregarlo como dependencia del repositorio (si Workers Builds guarda `node_modules`, sale gratis) o subir a Pages con la API directa. No se hizo: toca `package.json` y el lock.
- **`npm ci` de `web/` en cada vuelta (128 s en frío en la PC).** Si Workers Builds no guarda dependencias, es el segundo gasto. Primero hay que ver el paso `Instalar (web)` en el registro.
- **Las 275 MB de imágenes que se bajan.** Son PNG de ~560 KB. Pasarlos a una paleta reducida o a JPEG las achicaría a la mitad o menos, pero cambia lo que ve el lector al compartir: decisión de ustedes.
- **El paso «Archivar las notas por salir (R2)»** (hasta 6 minutos por vuelta) con el tope de 500 notas: ver en el registro si ya bajó a unos segundos.
- **El umbral de 100 minutos de `redes/vigilar.mjs`** para «web vieja» queda justo con vueltas por hora de noche (sección 3 B).
- Las **mediciones locales** se repiten corriendo `next build` con y sin `TARJETAS_CACHE`; los scripts de la medición no se guardaron en el repositorio (son de una sola vez).

## 6. Dónde está cada cosa

| Qué | Archivo |
|---|---|
| Leer una imagen de R2 mientras se compila | `infra/compartido/tarjetas-r2.mjs`, `web/lib/tarjeta.js` (`tarjetaConMemoria`) |
| Subir y podar después de compilar | `infra/motor-cloudflare/tarjetas-r2.mjs` (`sincronizarTarjetas`), `vuelta.mjs` (paso 8b) |
| Registro por paso, proyección, aviso, vueltas por día | `infra/motor-cloudflare/presupuesto.mjs`, `estado-r2.mjs` (`anotarVuelta`), `worker.mjs` (`estadoDelMotor`) |
| Vuelta de noche por hora | `infra/reloj-cloudflare/worker.mjs` (`trabajosDelMinuto`), `nube.mjs` (`umbralDeAtraso`) |
| El aviso | `infra/vigilante-cloudflare/worker.mjs` (`problemasDeLaNube`, problema `motor-minutos`) |
| Variables | `MOTOR_NOCHE_CADA_HORA` (reloj y motor), `TARJETAS_EN_R2` y `MOTOR_MINUTOS_DE_MAS` (GitHub → Workers Builds por `cargar-variables.mjs`) |
| Variable del ciclo de facturación | `MOTOR_CICLO_DIA` (reloj, Worker del motor y GitHub → Workers Builds por `cargar-variables.mjs`); sección 7 |
| Las pruebas | `pruebas/minutos-de-workers-builds.test.mjs`, `pruebas/motor-cloudflare.test.mjs` (la vuelta con tarjetas), `pruebas/ciclo-de-facturacion.test.mjs` (sección 7) |

## 7. El ciclo de facturación: del 11 al 10, no el mes calendario (regla 315)

*24/10/2026. Cloudflare muestra el período «Oct 11 - Nov 10»: los 6.000 minutos se cuentan por **ciclo de facturación**, que arranca el día 11 de cada mes y termina el 10 del siguiente. Hasta esta regla, el presupuesto contaba y repartía por **mes calendario** de Balcarce, y entre el 1 y el 10 de cada mes su registro arrancaba de cero mientras Cloudflare seguía sumando el mismo ciclo: el freno habría creído que se gastó poco y se podía haber pasado de los 6.000 (US$ 0,005 por minuto de más).*

**Qué cambió** (`infra/motor-cloudflare/presupuesto.mjs`):

- **El día de arranque** es la variable `MOTOR_CICLO_DIA` (un entero de 1 a 28; vacío, roto o fuera de rango, **11**). Se pone en tres lugares, igual que `MOTOR_NOCHE_CADA_HORA`: el panel de Cloudflare del **reloj**, el del **Worker del motor**, y la variable de GitHub (se carga a Workers Builds con «Cargar variables del motor»). Sólo hace falta tocarla si Cloudflare cambia el día del ciclo (se ve en *Billing*).
- **El registro vive por ciclo:** `motor/minutos/2026-10-11.json` (la fecha en que arrancó el ciclo). Trae `ciclo`, y el tiempo de cada paso como antes. El cambio de mes **no** lo reinicia: el 1/11 sigue sumando en `2026-10-11.json`; el 11/11 arranca `2026-11-11.json`.
- **El reparto** es el de siempre aplicado al ciclo: 5.700 minutos (el 95 % de lo incluido) en partes iguales por día **del ciclo** (28, 29, 30 o 31 días: `diasDelCiclo`), un día de colchón, y si el gasto pasa de lo que corresponde hasta ahora se saltea la vuelta (nunca más de 3 horas sin una). La proyección y «cuántas vueltas por día alcanzan» usan los días que **quedan del ciclo**.
- **Migración sin perder lo medido:** el registro por mes (`motor/minutos/2026-10.json`) se sigue leyendo, **una sola vez por ciclo**, hasta que la primera vuelta escribe el registro del ciclo. Cada día de su `porDia` va al ciclo que le toca; el tiempo de cada paso y las vueltas que compilaron se reparten en proporción de vueltas si el mes toca dos ciclos. Lo medido en octubre desde que el registro existe (desde el 23/10) cuenta entero para el ciclo que arrancó el 11/10 (`migradoDe: ["2026-10"]` en el registro). El reloj y el Worker del motor hacen la misma lectura en memoria, así que no hace falta esperar a la primera vuelta. Los registros por mes no se borran ni se vuelven a escribir.
- **Qué informa el sistema:** `GET /estado` del Worker del motor ahora trae `ciclo` (`ciclo`, `desde`, `hasta`, `dias`, `diasQueFaltan`, `cicloDia`, `minutos`, `vueltas`, `incluidos`), `registro` (lo que antes era `mes`: minutos, vueltas, compiladas, la más larga, de dónde se migró), `presupuesto` (con `ciclo`) y `proyeccion` (con `ciclo`, `desde`, `hasta`, `dias`, `diasQueFaltan`). El vigilante de Cloudflare guarda `ciclo` y `hasta` en su resumen, y el aviso `motor-minutos` dice «el ciclo de facturación (11/10 al 10/11)».

**Lo que hay que saber:**

- **Lo medido empieza el 23/10.** El ciclo en curso arrancó el 11/10: las vueltas de Workers Builds de antes de que existiera el registro no están. Si el contador de Cloudflare (*Workers & Pages* → `radar-balcarce-motor` → *Builds*) marca más que `ciclo.minutos` de `/estado`, la diferencia se puede cargar como `MOTOR_MINUTOS_DE_MAS` (dividida por las vueltas) o, mejor, esperar al 11/11, cuando el registro cubre el ciclo entero. El margen del 5 % y el colchón de un día cubren una diferencia chica.
- **Subir el reloj y el Worker del motor juntos** (workflows «Reloj de Cloudflare» y «Desplegar Workers de Cloudflare»): el reloj viejo lee `2026-10.json`, que ya nadie escribe, y quedaría con un registro congelado.
- **Cambiar `MOTOR_CICLO_DIA`** cambia la clave del registro: lo medido en el ciclo anterior no se traslada solo (sólo se migran los registros por mes). Se cambia al arrancar un ciclo nuevo.
- **Días 29 a 31** no se aceptan como día de arranque: hay meses que no los tienen.
