# Propuesta: guardar las fotos originales a máxima resolución

*Escrita el 17/11/2026 leyendo el código (`v3/nucleo/fotos/fotos.mjs`, `v3/sitio/fotos-copia.mjs`, `foto-proxy.mjs`, `scripts/copiar-fotos-de-notas.mjs`, `vistas/portada.mjs`, `v3/redes/piezas/fotos.mjs`, `v3/nucleo/REGLAS.md` § 7 y § 7 bis) y la auditoría del sitio del 17/11. **Es una propuesta: no se implementó nada.** Lo que no se pudo comprobar va marcado **[NO VERIFICADO]**. Si este documento y el código no coinciden, manda el código.*

## 1. Cómo funciona hoy

**Elegir la foto** (`elegirFoto`, `v3/nucleo/fotos/fotos.mjs`)
- Se miran las imágenes que el lector guardó de **todas las fuentes** de la historia (feed, y si hace falta la página: `og:image` y `twitter:image`, hasta 6 páginas).
- Descarta las de menos de **600 px** de ancho y las de forma rara (más de 2,2 veces más anchas que altas, o más altas que 1,3 veces el ancho). Las ordena por **superficie** (ancho × alto, de mayor a menor) y una IA de visión mira **hasta 6**; gana la **primera** sin marca de agua, sin menor ni víctima.
- Tiene un tope de **3 MB** por imagen (`TOPE_BYTES`): una foto original más pesada **se descarta**, aunque sea la mejor.
- Lo que queda anotado en la nota (`notas.foto`): `{ url, credito, alt, ancho, alto }`. **Sólo la elegida**: las demás candidatas no se guardan, así que no se puede «mejorar» la foto después.

**Guardar la copia** (workflow «Radar 3.0: fotos propias», `copiar-fotos-de-notas.mjs`)
- Corre **cada 2 horas** (el reloj de Cloudflare lo despierta a los :40) y sólo si la variable `FOTOS_PROPIAS_ACTIVAS` vale «si» (hoy sí). Hasta 60 notas por corrida. La nota recién publicada tarda **hasta 2 horas** en tener copia.
- Baja la foto presentándose honestamente (`RadarBalcarceBot`) y con ffmpeg hace **dos JPEG sin datos de cámara**: uno de **hasta 1.600 px de ancho** (`ANCHO_GRANDE`, calidad `-q:v 4`) y otro de **hasta 640 px** (`ANCHO_CHICA`). Los guarda en el depósito R2 `radar-fotos` como `copias/<huella>.jpg` y `copias/<huella>-640.jpg` (la huella es el contenido: la misma foto en dos notas se guarda una vez).
- **El original no se guarda en ningún lado.** Si la fuente la borra o la cambia, sólo queda lo achicado a 1.600.
- A la nota se le suman `copia`, `copiaChica`, `copiaAncho`, `copiaAlto`, `copiaEn`. La dirección original, el crédito y el epígrafe quedan como estaban.

**Mientras no hay copia** (`foto-proxy.mjs`)
- El sitio muestra `/foto-nota/<id>.jpg`: el Worker baja la foto **tal cual** (hasta 8 MB), la sirve y la deja en la caché de Cloudflare un día. **No tiene versión chica** y su caché es de 1 hora en el navegador (las copias, un año).

**Qué usa cada lugar**
| Lugar | Qué foto usa | Medida |
|---|---|---|
| Portada y listas | `chica` (640 px) si hay copia; si no, `/foto-nota/` (el original **entero**) | 10 a 90 KB con copia; hasta **1,6 MB** sin copia (portada del 17/11: **3,9 MB** en 26 imágenes, de las cuales 5 `/foto-nota/` suman 2,9 MB y se muestran a 480 × 320) |
| Página de la nota, `og:image`, `image` de NewsArticle | `copia` (1.600 px) | 1 imagen |
| Posteo 4:5 de Facebook/Instagram/X (`posteos.mjs`) | `copia` si hay, si no la original (`direccionesDeLaFoto`) | se dibuja **entera** sobre fondo oscuro en 1080 × 1350 |
| Reel, repaso, nota propia (`piezas/fotos.mjs`) | ídem, **recortada en una caja** dentro de 1080 × 1920 | con una fuente de 1.600 × 900, una foto a pantalla completa vertical obliga a ampliar casi 2 veces: se ve blanda |
| Notas viejas (migradas) | `/fotos-notas/…` (ya propias, medidas variables) | — |

**Lo bueno de hoy (no tocar):** el control de marca de agua y de menor/víctima ocurre **antes** de guardar nada; el crédito va siempre en el epígrafe o en el pie; ningún lector ve la dirección del otro medio; el nombre por huella permite caché de un año.

## 2. Qué falla

1. **Se pierde resolución para siempre**: 1.600 px es poco para reels a pantalla completa y para cualquier recorte futuro (placa vertical, portada de reel de 1080 × 1920, historia).
2. **La mejor foto puede ser la que se descarta**: más de 3 MB no entra; las que están en la nota de la fuente en tamaño grande (no en el feed) sólo se miran si el feed no alcanzó.
3. **Las miniaturas del feed engañan**: un feed de WordPress suele traer `…-1024x683.jpg` o `…-300x200.jpg` y el original grande está en la misma carpeta sin ese sufijo **[NO VERIFICADO: probar con cada medio de Balcarce]**.
4. **No se puede cambiar de idea**: sólo queda la elegida. Si llega una candidata mejor (otra fuente que se suma a la historia), no hay con qué comparar.
5. **La portada pesa de más**: hasta que la copia exista (≤ 2 h), el sitio sirve el original entero; 5 fotos suman 2,9 MB de los 3,9 MB. Es el problema de mayor efecto sobre la velocidad en 4G.
6. **Un solo formato derivado sirve para todo**: redes, Google Discover y la portada comparten los mismos dos tamaños.

## 3. Propuesta

### 3.1 Guardar el original, tal cual (nuevo)
- En `radar-fotos`: `originales/<huella>.<ext>` (los bytes exactos que bajó el lector, sin recomprimir; límite nuevo de 12 MB en lugar de 3 MB para elegirla, 8 MB ya es el del proxy). La huella es la de los bytes, así que el mismo original en dos notas se guarda una vez.
- En `notas.foto` se suman `originalClave`, `originalAncho`, `originalAlto`, `originalBytes` y `originalEn`.
- **No se sirve nunca al público**: el sitio sigue mostrando sólo los derivados. El original es la materia prima de las redes y de futuras recompresiones.
- Antes de guardarlo corre el mismo control de marca de agua y de menores, sobre una versión chica (1.024 px) como hoy.

### 3.2 Derivados con un solo criterio
| Derivado | Para qué | Medida | Cómo |
|---|---|---|---|
| `-480` | portada y listas en celular | 480 px de ancho, JPEG calidad ~70 | ffmpeg en el mismo programa de copias |
| `-960` | portada en escritorio, nota en celular | 960 px | ídem |
| `-1600` (el de hoy) | nota, `og:image` | 1.600 px | ya existe |
| `-4x5` | posteo de feed | 1080 × 1350, recorte por el centro con opción de punto de interés | ffmpeg |
| `-9x16` | reel, historia y portada del reel | 1080 × 1920, recorte vertical **sólo si el original tiene al menos 1080 px de ancho y 1080 de alto**; si no, foto entera centrada sobre su propia copia desenfocada (nunca ampliar) | ffmpeg |
| `-og` | Google, WhatsApp | 1200 × 630 | ffmpeg |

El HTML pasa a usar `srcset` con 480/960/1600 y `sizes`. Con eso, la portada de 26 imágenes baja de **3,9 MB a cerca de 1 MB** (estimación de la auditoría del sitio, hallazgo 8).

### 3.3 Elegir la mejor entre todas las fuentes
- Puntaje = **superficie** (con un tope, p. ej. 3.000 × 2.000: más no mejora la vista), **sin marca de agua** (la visión de hoy), **sin texto superpuesto**, **forma apta** (próxima a 3:2 o 16:9, ya vertical si la nota va a reel) y **peso mayor a 60 KB** (descarta miniaturas disfrazadas).
- Para los feeds de WordPress, **probar la dirección sin el sufijo `-WxH`** y quedarse con la mayor que exista (hacerlo en `lector`, con un tope de intentos por nota).
- Guardar la lista de candidatas (dirección, medidas, medio, motivo de descarte) dentro de `verificacion`. Si luego una fuente nueva suma una candidata claramente mejor (el doble de superficie), una pasada por día la **reemplaza** y regenera los derivados.
- Una foto de una fuente de Balcarce con crédito propio o de un organismo oficial tiene **preferencia** sobre una de otro medio de igual calidad (regla vigente de fotos).

### 3.4 El peso de la portada, en dos pasos
1. **Rápido (no necesita el resto):** que la ruta `/foto-nota/<id>.jpg` entregue una versión **de 480 a 640 px** cuando se la pide chica (`-640`), usando las transformaciones de imagen de Cloudflare dentro del Worker (hay un binding de imágenes; el plan gratis permite una cantidad mensual de transformaciones únicas **[NO VERIFICADO: la cifra y si cubre unas 120 fotos nuevas por día]**), con caché larga. Si no se usa Cloudflare, hacer la copia **en cuanto se publica la nota** (hoy espera hasta 2 horas) y no sólo cada 2 horas.
2. **De fondo:** los derivados de 3.2.

### 3.5 Redes
- El programa de piezas pide a R2 el derivado exacto (`-9x16`, `-4x5`) en lugar de redimensionar una imagen de 1.600 px.
- La **portada del reel** (la tapa del feed que pide Hernán) usa `-9x16` con el titular encima: es lo que más cambia el aspecto de la grilla.
- Reglas que no cambian: la foto de menor o víctima nunca; nunca marca de agua ni nombre de otro medio pegado; el crédito en el pie.

## 4. Esfuerzo, costo y riesgo

| Paso | Qué es | Esfuerzo | Riesgo | Se puede hacer solo |
|---|---|---|---|---|
| A | Versión chica en `/foto-nota/` (o copia inmediata) | 3 a 5 h | bajo: sólo achica; si falla, sigue la original | sí, es lo más rentable |
| B | `srcset` 480/960/1600 en portada y nota | 3 h + pruebas de `portada.test.mjs` | bajo | después de A o de C |
| C | Guardar el original (3.1) y subir el tope a 12 MB | 4 a 6 h | **medio**: más espacio en R2 y más descargas a las fuentes (mantener `RadarBalcarceBot` y las pausas) | decisión del dueño (ver abajo) |
| D | Derivados `-4x5`, `-9x16`, `-og` y uso en redes | 1 a 2 días | medio: cambia el aspecto de todas las piezas; ensayar sin publicar | junto con el estilo de reels |
| E | Puntaje de candidatas, sufijos de WordPress y reemplazo posterior | 1 a 2 días | medio: hay que probar medio por medio y medir cuántas notas mejoran | después de C |

**Costo de almacenamiento (estimación mía, con foto de 1,5 MB de promedio):** 120 notas por día → ~180 MB por día → ~5,4 GB por mes. R2 trae 10 GB gratis y después cuesta unos US$ 0,015 por GB al mes: el primer año termina en ~65 GB, o sea **menos de US$ 1 por mes** al final. Las lecturas hacia los lectores no pagan salida en R2. **[ESTIMACIÓN: el promedio real hay que medirlo con 100 fotos.]**

**Riesgos y cuidados**
- **Derechos de autor:** guardar el original completo es más exposición que una copia de 1.600 px. Se mantiene privado, con crédito, sin marca de agua y con los mismos filtros; es una **decisión de Hernán** si se acepta (hoy ya se guardan copias de 1.600 px).
- **No ampliar nunca** una imagen chica: si el original no llega a 1080 px, el reel usa el fondo desenfocado.
- **Más pedidos a las fuentes:** respetar lo que hoy se hace (nombre propio, sin esquivar bloqueos) y no repetir descargas de una misma foto (la huella ya lo evita).
- **Pruebas:** cada paso lleva su prueba (las de `fotos-copia.test.mjs`, `portada.test.mjs` y `copiar-fotos-de-notas.test.mjs` se amplían); probar con 20 notas reales antes de prender.

## 5. Qué necesita decidir Hernán

1. ¿Se aprueba **guardar el original a máxima resolución, privado**? (C; es lo que permite el reel a pantalla completa).
2. ¿Primero A y B (portada liviana, sin riesgo) y después lo demás? Recomiendo que sí.
3. ¿El reel a pantalla completa se aplica a **todas** las notas o sólo a las que tengan foto de 1080 px o más (las demás, con fondo desenfocado)? Recomiendo lo segundo.
