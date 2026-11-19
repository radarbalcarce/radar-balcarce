# Kit 3.0 de reels (`v3/redes/kit3/`)

El kit nuevo de reels: otro dibujo para las mismas piezas. **Está apagado.** Mientras `KIT_3_0` no diga `si`, todo sale exactamente como hoy; esta carpeta no se usa para nada.
El guion, la voz, el cupo de voz, la compuerta de tono, el texto del posteo (con el aviso «Voz generada con inteligencia artificial.») y la publicación no cambian: son de `../piezas/correr.mjs`.
El kit sólo cambia **cómo se dibuja el video**: HyperFrames (HTML + GSAP, dibujado en Chrome) y ffmpeg, en vez del armador de escenas de siempre.

## Qué piezas dibuja

Clima de la mañana y de la noche (también con auspicio), repaso (mañana, tarde y noche), efeméride, farmacias (de 1 a 3), reel de una nota de Balcarce y nota propia (de 1 a 3 fotos). **«Participá» no está:
está en pausa.** Cualquier otra pieza sale con el dibujo de siempre aunque el kit esté prendido.

## Lo que hace, en palabras de una persona

- **Los subtítulos van con la voz.** Cuando hay audio, cada cartel (de hasta 4 palabras) aparece cuando la voz dice esas palabras. Sin audio (ensayo), se estiman a 2,5 palabras por segundo.
- **Nada importante debajo de la fila 1670** (la zona que tapan los botones de las redes). Una prueba mira todas las plantillas.
- **El crédito de la foto va en el TEXTO del posteo («Foto: …», o «Fotos: …» con varias), nunca dentro del video ni de la tapa** (`creditosDeLasFotos` en `../piezas/publicar.mjs`; el kit devuelve los créditos de las fotos que usó). La nota propia sigue firmando «Por Hernán Accomo» (es su firma, no un crédito). Nunca una marca de agua ni el nombre de otro medio encima de la imagen.
- **Las fotos van de borde a borde y se mueven, sin tarjetas flotantes ni bordes desenfocados** (`geom` en `kit/kit.js`). Repaso, nota de Balcarce, nota propia y efeméride (video y tapa): la foto va siempre a todo el ancho (1080), pegada arriba (y = 0), y se permite recortar hasta un 34 % del lado que sobra (centrado; en retratos, sin cortar la cabeza). Alto mostrado = el menor entre 1090 y el alto natural a 1080 dividido 0,66, con un mínimo de 900. **El panel empieza donde termina la foto** (oscuro en repaso y notas, papel en la efeméride) y el titular, la lista o el año gigante se acomodan a esa línea. Sólo si ni recortando 34 % llena (panorámica extrema o retrato muy angosto) se usa relleno desenfocado oscuro y parejo, sin sombra ni borde. Movimiento: zoom lento hacia adentro de 1,00 a 1,06 con la foto ya cubriendo (nunca se ve el borde). Las tres notas del repaso tienen la misma composición y, al terminar la última, sale «Todo en Radar Balcarce» con las tres numeradas (la última foto no queda colgada).
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

## Cómo se prende

1. Subir los fondos a R2 y que el workflow los baje (`fondos/LEEME.md`); hoy ningún workflow lo hace.
2. En el workflow que corre `correr.mjs` (`v3-piezas.yml`): un paso `npm ci --prefix v3/redes/kit3 --ignore-scripts`, otro de Chrome (`hyperframes browser ensure`) y las variables `KIT_3_0: si` y `KIT3_FONDOS`.
3. Antes, correr el ensayo a mano (`Radar 3.0: ensayo del kit 3.0`) y mirar los videos. Cada pieza tarda varios minutos en dibujarse (Chrome cuadro por cuadro): hay que mirar el tiempo del workflow.

Variables: `KIT_3_0` (`si` prende; vacío o cualquier otra cosa apaga), `KIT3_FONDOS` (carpeta de los clips), `KIT3_CALIDAD` (calidad de HyperFrames, por defecto `looks`), `KIT3_DEPURAR` (deja la carpeta de trabajo).

## Cómo se vuelve atrás

- **Apagar:** sacar `KIT_3_0` (o ponerlo en `no`) y el próximo reel sale con el dibujo de siempre. No hay nada que migrar.
- **Si el kit falla** por cualquier motivo (falta Chrome, falla un dibujo, pasa el tiempo máximo de 15 minutos), `correr.mjs` dibuja la pieza como siempre y lo anota en el aviso del informe
  («kit 3.0 falló (…); salió con el dibujo de siempre»). La pieza no se pierde.

## El ensayo

    node v3/redes/kit3/ensayo.mjs --fondos D:\ruta\fondos-clima-kit3 --salida D:\ruta\ensayo [piezas…]

Arma todas las piezas del día con datos reales del sitio público (o con `--ejemplos`, sin red), **sin voz** (subtítulos estimados), sin publicar y sin base de datos. Deja por pieza un MP4, la tapa (PNG)
y un JSON. También como workflow manual: «Radar 3.0: ensayo del kit 3.0» (los deja como archivo adjunto de la corrida).

## Pruebas

`desde-pieza.test.mjs`, `kit3.test.mjs`, `fondos/bajar.test.mjs` (sin red, sin Chrome). Lo que **no** cubren las pruebas: el dibujo real (se mira con el ensayo) y la sincronía con una voz verdadera
(se verifica con el primer audio real, no se gasta voz para probar).
