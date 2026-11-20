# Kit 3.0 de reels (`v3/redes/kit3/`)

El kit nuevo de reels: otro dibujo para las mismas piezas. **Está prendido desde el 19/11/2026** en `.github/workflows/v3-piezas.yml` (`KIT_3_0: si`). Si `KIT_3_0` no dice `si`, todo sale exactamente como antes y esta carpeta no se usa para nada.
El guion, la voz, el cupo de voz, la compuerta de tono, el texto del posteo (con el aviso «Voz generada con inteligencia artificial.») y la publicación no cambian: son de `../piezas/correr.mjs`.
El kit sólo cambia **cómo se dibuja el video**: HyperFrames (HTML + GSAP, dibujado en Chrome) y ffmpeg, en vez del armador de escenas de siempre.

## Qué piezas dibuja

Clima de la mañana y de la noche (también con auspicio), repaso (mañana, tarde y noche), efeméride, farmacias (de 1 a 3), reel de una nota de Balcarce y nota propia (de 1 a 3 fotos). **«Participá» no está:
está en pausa.** Cualquier otra pieza sale con el dibujo de siempre aunque el kit esté prendido.

## Lo que hace, en palabras de una persona

- **Los subtítulos van con la voz y nunca se adelantan.** Cuando hay audio, cada cartel (de hasta 4 palabras) aparece cuando la voz dice su primera palabra, y **cada palabra se ve recién cuando se dice** (antes no está). **Un cartel nunca cruza el final de una oración** (el alineador de la voz saca los puntos y deja la marca `finFrase`/`pausa`, que el kit respeta) ni junta palabras separadas por una pausa de más de 0,3 s. Sin audio (ensayo), se estiman a 2,5 palabras por segundo. **Dónde van (Hernán, 19/11):** la interfaz de Instagram Reels tapa desde la fila 1540 y la columna de íconos de la derecha (los últimos ~130 px): la caja de subtítulos (hasta dos renglones) va de la fila 1264 a la 1480 y de x = 60 a 940 (`SUBS_TOP` en `variables.mjs`); el titular y cualquier texto de escena terminan antes de la fila 1255.
- **Nada importante debajo de la fila 1670** (la zona que tapan los botones de las redes). Una prueba mira todas las plantillas.
- **El crédito de la foto va en el TEXTO del posteo («Foto: …», o «Fotos: …» con varias), nunca dentro del video ni de la tapa** (`creditosDeLasFotos` en `../piezas/publicar.mjs`; el kit devuelve los créditos de las fotos que usó). La nota propia sigue firmando «Por Hernán Accomo» (es su firma, no un crédito). Nunca una marca de agua ni el nombre de otro medio encima de la imagen.
- **Las fotos van de borde a borde, se mueven y TODAS miden lo mismo** (`geom` en `kit/kit.js`, `FOTO_ALTO = 980`). En las escenas de video (repaso, nota de Balcarce, nota propia, efeméride) toda foto ocupa el ancho entero (1080) y exactamente 980 px de alto (la efeméride, que lleva más texto bajo la foto, 880), pegada arriba (y = 0), cubriendo con recorte centrado (en fotos verticales el recorte se sesga hacia arriba para no cortar cabezas; en las muy apaisadas se recortan los costados): el panel de texto empieza siempre en la misma fila (la 980), en las tres notas del repaso y cuando una nota o la efeméride cambian de foto. Sin tarjetas flotantes ni bordes desenfocados. En las TAPAS (una sola foto, la imagen del feed) la altura sigue dependiendo de la foto. Movimiento: zoom lento hacia adentro de 1,00 a 1,06 con la foto ya cubriendo (nunca se ve el borde). El panel es oscuro en repaso y notas y de papel en la efeméride; el titular, la lista o el año gigante se acomodan a esa línea. **El cierre del repaso no repite las tres noticias** (ya están en la tapa): mientras la voz dice «Todo en Radar Balcarce punto com» la última foto sigue en pantalla con la firma «Radar Balcarce» (bicolor) y `radarbalcarce.com` en lugar de su titular, y después entra el cierre con el logo, como en el diseño aprobado v2 (donde la última foto seguía hasta el cierre). **Sin números ni rayitas de avance encima de las fotos** (Hernán, 20/11). **La tapa no desenfoca ni espeja nada, y la grilla del feed no corta cabezas (20/11):** las filas 0 a 240 son una banda lisa #14161A (ahí va el rótulo, «REPASO · NOCHE», «BALCARCE»…, centrado en la banda, x = 60: nunca pisa la foto); la foto empieza en la fila 240 a todo el ancho y NUNCA se recorta por arriba (si sobra alto, se recorta por abajo), así la grilla (filas 285 a 1635) pierde como mucho 45 px del borde superior. Sin velo oscuro sobre la foto. Si la foto es tan apaisada que habría que recortar más del 40 % de los costados, va entera a todo el ancho, pegada al panel, con la banda más alta y un degradado suave hacia la foto. **De la tapa a la primera escena no hay corte:** en 0,5 s (de 0,8 a 1,3 s) la foto de la tapa baja de alto y se acomoda en su lugar de escena (transformación con GSAP), mientras el título, la lista, la marca y el panel de la tapa suben y se desvanecen; el título de la primera escena entra en cuanto sale el contenido de la tapa (como mucho ~0,15 s de panel vacío). La tapa quieta (t = 0,3 s) no cambia. **Farmacias:** la cruz grande del fondo va arriba de los subtítulos (chica, a la derecha) en el video; los subtítulos de farmacias también van en las filas 1264 a 1480.
- **La marca de la tapa:** «Radar Balcarce» (bicolor) abajo a la izquierda y `radarbalcarce.com` abajo a la derecha, en la misma línea. Sólo en la tapa; durante el video no hay marca fija (el cierre con logo sigue).
- **El repaso son siempre tres notas numeradas**, con el titular entero: si no entra, la letra se achica; nunca «…».
- **El saludo sólo está en la primera pieza del bloque** y los guiones no dicen «paraguas» ni «de acá»: eso lo decide el armador de producción (`../piezas/armadores.mjs`), el kit no lo toca.
- **El clima lleva de fondo el video del cielo del día** (12 estados: lluvia, niebla, calor, noche estrellada…). Si faltan los clips, usa un cielo gráfico propio de la marca. Ver `fondos/LEEME.md`.
- **Las fotos de menores o víctimas** ya las filtra el núcleo antes de que la pieza exista; el kit no elige fotos. Una foto que no baja la saca el armador antes de llegar acá.
- **La efeméride** (variante C de v2): foto entera arriba, franja de papel con la regla roja y el AÑO gigante en tinta montado sobre esa línea. Lleva la foto de Wikimedia Commons de «Un día como hoy» (la única foto de Commons que ilustra algo; decisión de Hernán). **Si el guion nombra un segundo hecho («También, en 1493…»), ese hecho muestra SU foto** (buscada igual, en Commons con licencia libre, sin IA: `efemeride-foto.mjs`, `fotosDeLaEfemeride`) y el año gigante corre hasta el de ese hecho; si no tiene foto libre, el tramo sigue con la foto anterior con otro encuadre. Sin foto libre, sale con el fondo de la marca.
- Una tapa de 0,8 s al principio (la imagen del feed), el cierre con el logo y `radarbalcarce.com` al final. Se guardan también la tapa (1080 × 1920) y su recorte de la grilla (1080 × 1350).

## Cómo está armado

| Archivo | Qué hace |
|---|---|
| `variables.mjs` | Los números (tapa, cierre, zona segura, cartel) y el interruptor `kit3Prendido`. |
| `desde-pieza.mjs` | Pieza de producción → datos de la plantilla (puro, sin red). |
| `tiempos.mjs`, `cielo.mjs` | Tiempos de las palabras y escenas; estado del cielo (`wmo.md`: lluvia, niebla y tormenta mandan sobre lo demás). |
| `plantillas/*.js` | Una por tipo de pieza (clima, repaso, efeméride, farmacias, nota). |
| `armar.mjs`, `fondo.mjs` | Arman la carpeta del proyecto de HyperFrames y el video de fondo del clima. |
| `kit3.mjs` | `dibujarConKit3`: lo dibuja y mezcla la voz. |
| `ensayo.mjs` | Dibuja todas las piezas del día sin publicar ni gastar voz (abajo). |
| `kit/` | El motor del kit (`kit.js`, `kit.css`). `package.json` fija HyperFrames 0.9.61 y gsap 3.12.5. |

## Cómo está prendido

`v3-piezas.yml` (desde el 19/11/2026) instala el kit (`npm ci --prefix v3/redes/kit3 --ignore-scripts`), ffmpeg y Chrome (`hyperframes browser ensure`), baja los fondos de R2 (`fondos/bajar.mjs`) y pasa `KIT_3_0: si` y `KIT3_FONDOS` a `correr.mjs`. Los cuatro pasos de instalación son `continue-on-error`: si fallan, la pieza sale con el dibujo de siempre. El tiempo máximo del workflow pasó de 30 a 45 minutos por el dibujo y la instalación. Los fondos se suben una vez con `fondos/subir.mjs` (`fondos/LEEME.md`); sin ellos el clima sale con el cielo gráfico.

Variables: `KIT_3_0` (`si` prende; vacío o cualquier otra cosa apaga), `KIT3_FONDOS` (carpeta de los clips), `KIT3_CALIDAD` (calidad de HyperFrames, por defecto `looks`), `KIT3_DEPURAR` (deja la carpeta de trabajo).

## Cómo se vuelve atrás

- **Apagar:** sacar la línea `KIT_3_0: si` de `v3-piezas.yml` (o ponerla en `no`) y subir el cambio y el próximo reel sale con el dibujo de siempre. No hay nada que migrar.
- **Si el kit falla** por cualquier motivo (falta Chrome, falla un dibujo, pasa el tiempo máximo de 15 minutos), `correr.mjs` dibuja la pieza como siempre y lo anota en el aviso del informe
  («kit 3.0 falló (…); salió con el dibujo de siempre»). La pieza no se pierde.

## El ensayo

    node v3/redes/kit3/ensayo.mjs --fondos D:\ruta\fondos-clima-kit3 --salida D:\ruta\ensayo [piezas…]

Arma todas las piezas del día con datos reales del sitio público (o con `--ejemplos`, sin red), **sin voz** (subtítulos estimados), sin publicar y sin base de datos. Deja por pieza un MP4, la tapa (PNG)
y un JSON. También como workflow manual: «Radar 3.0: ensayo del kit 3.0» (los deja como archivo adjunto de la corrida).

## Pruebas

`desde-pieza.test.mjs`, `kit3.test.mjs` (también fija que los subtítulos no se adelanten ni crucen oraciones, que terminen antes de la fila 1480, que las fotos midan lo mismo y que el repaso no repita la lista al final), `fondos/bajar.test.mjs` (sin red, sin Chrome). Lo que **no** cubren las pruebas: el dibujo real (se mira con el ensayo) y la sincronía con una voz verdadera
(se verifica con el primer audio real, no se gasta voz para probar).
