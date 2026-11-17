# Informe técnico: reels verticales más dinámicos (17/11/2026)

Investigación de solo lectura. Nada del repositorio se tocó salvo este archivo. Las pruebas de instalación y render están en `D:\BalcarDev\RadarMedia\prueba-hyperframes\` (fuera del repo). No se gastó cupo de voz ni de IA, y no se leyó `.env`.

## 1. Cómo se arma hoy un reel en el 3.0

**Cadena general** (`v3/redes/REGLAS.md` § 11, líneas 100-111):

1. El Worker `radar-redes` decide qué pieza toca (tabla de horarios) y reserva el cupo de voz.
2. El workflow `v3-piezas.yml` (GitHub Actions, `ubuntu-24.04`, tope de 30 min) corre `v3/redes/piezas/correr.mjs`.
3. `correr.mjs` junta los datos, arma la pieza (`armadores.mjs`), pide la voz, dibuja con resvg y ffmpeg, publica en Meta y en Buffer, y le cuenta el resultado al Worker.

**De dónde salen los datos** (`v3/redes/piezas/correr.mjs`, `dependenciasReales`, líneas ~385-400, y `datos.mjs`):

| Pieza | Fuente de datos | Armador |
|---|---|---|
| Clima | Open-Meteo (`datos.mjs:14`, `leerClima`), con comercio auspiciante opcional que viene del Worker | `armarClima`, `armadores.mjs:87` |
| Farmacia | sitio del Colegio de Farmacéuticos (`leerFarmacia`, `v3/sitio/datos-del-dia.mjs`) | `armarFarmacia`, `armadores.mjs:426` |
| Efeméride | `web/data/efemerides-piezas.json` (armado por `v3/redes/efemerides/`) | `armarEfemeride`, `armadores.mjs:170` |
| Repaso / podcast | notas del núcleo que elige el Worker: 3 como máximo, Balcarce primero | `armarRepaso`, `armadores.mjs:133` |
| Nota individual | la nota publicada (título, bajada, cuerpo, foto) | `armarNotaReel`, `armadores.mjs:209`; `armarNotaPropia`, `armadores.mjs:240` |

**Quién dibuja los cuadros.** `escenas.mjs` no inventa nada: importa las escenas del sistema viejo, "tal cual" (cabecera de `v3/redes/piezas/escenas.mjs`, líneas 1-12).

- Clima: `escenaDeClima` (`reels/escenas/clima.mjs:269`).
- Efeméride: `escenaDeEfemeride` (`reels/escenas/fechas.mjs`).
- Farmacia: `escenaDeFarmacia` (`reels/escenas/servicios.mjs`).
- Repaso y notas: `placaDeNotaDelRepaso` y `escenaDelRepaso` (`reels/escenas/repaso.mjs`).

Cada escena es una función `cuadro(t) → SVG` de 1080 × 1920. Una "escena animada" es esa función pura del tiempo: los bloques entran con fundido y subida, la temperatura cuenta hasta su valor (`comoContador`, `reels/animacion.mjs:34`) y el cielo se mueve (nubes que cruzan, sol con rayos que giran, lluvia). Cuando el cuadro termina de entrar queda idéntico a la placa quieta (regla 90).

**Render.** `v3/redes/piezas/render.mjs`:

- `renderizarLinea` (`reels/animacion.mjs:251`) convierte cada SVG a PNG con **resvg** (`@resvg/resvg-js`) repartido en worker threads (`reels/render-cuadros.mjs`).
- `lineaDeTiempo` (`animacion.mjs:231`) deduplica cuadros idénticos. En clima, repaso y escena única la línea es `intensoSiempre` (`escenas.mjs:466`), es decir un cuadro distinto en cada tic.
- **ffmpeg** (`ffmpeg-static`) toma la secuencia de PNG a **30 fps** (`variables.mjs`: `VIDEO_CUADROS = 30`). Sobre ella superpone la barra roja de avance, quema los subtítulos `.ass` y codifica `libx264 -crf 17 -preset medium yuv420p`, AAC 160 kbps a 48 kHz, `+faststart` (`render.mjs:164-190`).
- Resolución: 1080 × 1920.

**Voz y subtítulos.**

- La voz sale de Gemini TTS (sección 2) como WAV de 24 kHz y se convierte a mp3.
- `reels/alinear.mjs` saca el tiempo de cada palabra y esos tiempos dibujan los subtítulos palabra por palabra (`enCarteles`, `armarAss`).
- `ajustarALaVoz` (`correr.mjs:109`) alarga la última escena si la voz dura más que la pieza.

**Duración típica** (`variables.mjs:59-80`):

| Pieza | Duración |
|---|---|
| Clima | 18 s (15-20), más 4 s con auspicio |
| Repaso | 30 s con 3 notas (9 s por nota más 3 s de cierre) |
| Efeméride | 15 s |
| Farmacia | 14 s |
| Nota en reel | 25 s |
| Historia | máximo 58 s |

**Dónde corre.**

- Hoy el render se hace dentro del mismo workflow `v3-piezas.yml` de GitHub Actions (el repo público tiene minutos gratis).
- Existe además `infra/render-publico/` (un repo público aparte, `radarbalcarce/radar-balcarce-render`, workflow `render.yml`, 20 min de tope) con el mismo motor, que recibe un `pedido.json` más la voz por R2. Es el camino del sistema viejo (`reels/render-remoto.mjs`).
- No corre en Workers: resvg y ffmpeg no entran ahí (`REGLAS.md:100`).
- En la PC se puede correr a mano (`renderizarPieza`, ensayos, previas).

**Lo que NO tiene hoy** (esto es lo que hace "quieto" al reel):

- No hay video de fondo. Los fondos son ilustraciones SVG generadas: cielos, nubes y sol para el clima, o la foto de la nota con una deriva lenta.
- No hay cortes entre planos ni transiciones (xfade, whip). Cada pieza es, en el fondo, una sola escena larga.
- No hay música. `MUSICA.activa = false` (`variables.mjs:87`, Hernán 3/11: "después") y la carpeta `redes/musica/` ni existe.
- Los subtítulos son un tipo de letra fijo, sin efectos de entrada.

**Marca** (`docs/3-0/MANUAL-DE-MARCA.html` y `FORMATO-DE-IMAGENES.md`):

- Colores: tinta `#14161A`, rojo `#C7381C`, papel `#FAF8F3`, más el color de la sección.
- Letras: Inter y Source Serif 4, archivos en `reels/marca/fuentes`.
- Cierre fijo: raya de tinta, "Radar Balcarce" y `radarbalcarce.com`.
- Nunca marca de agua ni nombre de otro medio sobre la imagen.
- Zona segura: lo importante, no más abajo de la fila 1670 (250 px libres abajo).

**Estado de lo pendiente** (`PENDIENTES-3-0.md:88`): "Probar HyperFrames y Earshot. Hernán dio el OK (15/11)". Falta decidir "la animación de cada pieza" y la música (línea 165).

## 2. La voz

**Proveedor y modelo.**

- Gemini TTS `gemini-3.8-flash-tts` por la Interactions API (`reels/voz-gemini.mjs:33-34`).
- El pedido separa el texto (que se lee literal) del estilo, un campo corto en inglés: `annotations: [{ type: 'speech_metadata', style }]` (`voz-gemini.mjs:80-90`).
- No hay parámetro numérico de velocidad ni de ritmo.

**Cómo se elige la voz** (`redes/prompt-redes.mjs`, `CRITERIO-REDES.md` § 6):

- Dos voces propias creadas con Voice Design, guardadas en el proyecto de Google con identificador fijo (`voice_…`): la locutora y el locutor. **Vencen el 29/09/2027** (a los 12 meses de crearlas). La vigilancia avisa 30 días antes y se recrean con "Crear voces" (`reels/crear-voces.mjs`).
- El reparto está en la tabla `VOZ:REPARTO` del criterio. El clima, la efeméride y el repaso de la tarde usan la locutora; la farmacia y los repasos de la mañana y la noche, el locutor.
- El estilo es `INDICACION_BASE` más una línea por momento (`componerIndicacion`):
  - Base: *"Calm, confident and warm, at a steady natural pace, like a local radio announcer from Buenos Aires province, Argentina."*
  - Mañana: *"fresh, with calm energy"*.
  - Tarde: *"even and warm, unhurried"*.
  - Noche: *"slower, lower and calm, closing the day"*.
- Ritmo observado: de 2,1 a 2,9 palabras por segundo. El código usa 2,5 (`PALABRAS_POR_SEGUNDO`). `vozDeMas` (`voz-gemini.mjs:67`) descarta un audio por debajo de 1,8 palabras por segundo, que sería señal de que leyó las indicaciones.

**Cómo pedir una voz más ágil, moderna y rápida (opciones, de menos a más riesgo).**

1. **Cambiar el estilo (texto en inglés).** La voz del reel sale con `INDICACION_BASE`, que dice *"steady natural pace… calm"*. Una variante de prueba:
   - *"Upbeat, modern and energetic, brisk pace with short crisp pauses, like a young radio host in Buenos Aires province. Confident, not shouting."*
   - Hay que mantenerlo corto: con indicaciones largas el 28/09 el modelo las leyó en voz alta. La memoria de voces (`claveDeVoz`) incluye el estilo, así que una prueba con estilo nuevo no reutiliza audios viejos.
2. **Post-proceso con ffmpeg** `atempo` (por ejemplo `atempo=1.10` a `1.15`), que acelera sin cambiar el tono.
   - Va en `terminarAudio` (`voz-gemini.mjs:176-185`), que hoy hace `ffmpeg -i crudo.wav -b:a 128k destino.mp3`. Se agrega `-filter:a atempo=1.12` ahí, **antes** de `alinear`, para que los tiempos de los subtítulos salgan ya correctos.
   - Hasta 1,15 se oye natural. Con 1,25 o más ya suena a ardilla.
   - Ventaja: no gasta cupo extra, porque el crudo se puede guardar y reprocesar (`guardarCrudoEnLaMemoria`). Con la misma voz cacheada se prueban varios `atempo` gratis.
3. **Guion más corto y escenas de 2 a 3 s** (frases cortas, números en pantalla). Para dar sensación de ritmo esto pesa más que acelerar la voz.
4. **Voz nueva con Voice Design** (`reels/crear-voces.mjs`, descripción del timbre). Es lo más caro: consume un cupo de creación y obliga a revisar el reparto.

**El cupo diario de audios.**

- El código dice 10 por día: `VOZ_CUPO_DIARIO = 10` (`variables.mjs:85`) y `AUDIOS_POR_DIA` con valor por defecto 10 (`reels/cupo-voz.mjs:23`). En el workflow se sube con la variable `V3_AUDIOS_POR_DIA` (`v3-piezas.yml:106`).
- La memoria del 13/11 habla de 15 fijos. **No lo encontré en el código**: conviene confirmarlo con la variable de GitHub.
- Un audio de la memoria de voces no gasta cupo.
- El día del cupo es el de California (`diaDelCupo`).
- Si Google responde 429 "PerDay", se marca agotado y la pieza no sale nunca con otra voz.

**Prueba fuera del cupo.** Hay tres mecanismos que ya existen (solo nombres de variables):

- `GEMINI_API_KEY_REDES_V3`: clave de voz aparte para el ensayo (`correr.mjs:314-315`, `v3-piezas.yml:15`). En ensayo, si no existe, la pieza sale muda. Una clave aparte con crédito propio no toca el cupo de `GEMINI_API_KEY_REDES` (la del sistema viejo).
- `PEDIDO_POR_PERSONA=si` (`cupo-voz.mjs:41` y `:75`): el audio no se anota ni marca el día como agotado. Lo usa el workflow `v3-reel-previa-vino.yml` (líneas 77 y 81) y es la vía recomendada para pruebas pedidas por Hernán (regla del 13/11).
- `SOLO_VOZ=si` (`previa-vino.mjs:290`): genera solo la voz, sin fotos y sin publicar.
- Para una prueba con otra clave: correr `previa.mjs` o `previa-vino.mjs` por el workflow manual "Radar 3.0: previa del reel…", poniendo en `GEMINI_API_KEY_REDES_V3` la clave de crédito. Nunca pegarla en un chat: va a GitHub Secrets o al `.env`.

## 3. Música

**Hoy** (`render.mjs:141-161`, `planDeAudio`):

- `armarVideo(escena, destino, { voz, musica })` ya acepta una pista de música. La mezcla con `amix`, a −18 dB fijos (`MUSICA.dbBajoLaVoz`), con entrada de 0,5 s y salida de 1 s.
- Está apagada: `MUSICA.activa = false` (`variables.mjs:87`), sin carpeta de pistas.
- **No hay ducking**: la música queda siempre a −18 dB. No hay `loudnorm` en `armarVideo`. `LUFS_FINAL = -15` está definido pero no se aplica.
- `reels/reel.mjs:26` tiene `VOLUMEN_PAREJO` (loudnorm de −16), que es del sistema viejo.

**Qué haría falta para música con ducking** (probado en esta PC: el grafo corre, 0,33 s, `duck.wav` de prueba):

```
[musica]volume=0.5[m];
[voz]asplit[v][sc];
[m][sc]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=400[d];
[v][d]amix=inputs=2:normalize=0[mezcla]
```

- Cambiar `planDeAudio` para usar `sidechaincompress` en lugar del `volume=-18dB` fijo.
- Sumar `loudnorm=I=-15:TP=-1.5` al final.
- Crear `redes/musica/` con 4 a 6 pistas (`pistasMax: 6`) y un archivo de licencias.
- Poner `MUSICA.activa = true`. El código ya lista las piezas con música posible: efeméride, feriado, Participá, publicidad, nota propia.

**Música libre de derechos** (no se descargó nada; hay que leer la licencia vigente de cada pista antes de usarla):

- **YouTube Audio Library.** Pistas gratis para videos propios, con filtro de licencia. Algunas llevan atribución obligatoria y otras no; cada pista dice cuál. Fuera de YouTube suelen pedirse las "sin atribución". Conviene guardar la captura de la licencia.
- **Mixkit (Envato).** "Mixkit License": gratis para proyectos comerciales y no comerciales, sin atribución, pero no se puede revender la pista suelta. Uso en videos y redes sociales permitido.
- **Pixabay Music.** "Content License" de Pixabay: gratis, uso comercial, sin atribución. No se puede revender la pista tal cual. **Ojo con Content ID**: hay pistas de Pixabay que terminan reclamadas en YouTube y TikTok, así que hay que probarlas en las redes.

**Dos riesgos:**

- La música tapa la voz generada con IA.
- La música de sonido de plataforma (TikTok, Instagram) no se puede usar en un video que sube Buffer o la API.

## 4. Pruebas en esta PC (Windows 10, 4 núcleos, GTX 960)

| Cosa | Resultado |
|---|---|
| Node | v24.14.1 (npm 11.11.0) |
| ffmpeg y ffprobe | 9.0.2 (build "full" de gyan.dev) |
| Codecs | `libx264`, `aac` presentes |
| Filtros | `drawtext`, `zoompan`, `xfade`, `sidechaincompress`, `overlay`, `atempo`, `amix`, `subtitles` presentes |
| Chrome | Chrome 156.0.8078.82 instalado en `C:\Program Files\Google\Chrome`; Edge 157 también |
| Python | 3.12.10; `uv` **no** está instalado |

**HyperFrames** (`heygen-com/hyperframes`, v0.9.61 en npm, Apache 2.0, requiere Node 22+ y FFmpeg; el README está en `D:\BalcarDev\RadarMedia\prueba-hyperframes\hf-readme.md`).

- `npx --yes hyperframes init` **falló sin mensaje** tras 2 m 13 s. El log de npm muestra que el `postinstall` de `esbuild` salió con código 1. Con la caché npm movida a la carpeta de prueba, el problema sigue.
- **Solución que funcionó:** instalación local con `npm i hyperframes@0.9.61 --ignore-scripts` (1 m 15 s, 77 paquetes).
- `hyperframes init demo` (1 m 21 s) y `hyperframes check` (53 s, 0 errores) pasaron.
- Escribí un `index.html` de 1080 × 1920, 3 s, con GSAP desde CDN (tinta y papel de la marca, sol que gira, número que sube a 21° y subtítulo que entra).
- `hyperframes render -q draft` dio `prueba-3s.mp4` de 1080 × 1920, 30 fps, H.264 yuv420p, 3,0 s, 235 KB. Tiempo: **32,4 s de render, 46 s en total**. Se ve fiel al HTML (tipografía Inter, la marca).
- Detalle: `setup 16,2 s`, `capture 12,8 s` (2 workers, 90 cuadros por captura de pantalla) y `encode 1,1 s`. Entonces unos 140 ms por cuadro de captura (no 14) más 16 s de arranque.
- Descargó su propio Chrome y fuentes a `C:\Users\herna\.cache\hyperframes` (272 MB). No es instalación global del sistema.
- Es determinista: el mismo HTML da el mismo video. El README dice que busca cuadro a cuadro en Chrome headless y codifica con FFmpeg, igual que Remotion pero con HTML plano. También tiene render en Docker y en AWS Lambda.

**Earshot** (`Leonxlnx/earshot`): **no es de npm**.

- Es una herramienta de Python ("ears for coding agents"), con instalación `uv tool install … @ git+…`. Requiere `uv`, que no está en la PC, más modelos (torch en CPU y CLAP).
- Sirve para **describir y criticar audio** (describe, match, find, critique, un banco de efectos de sonido hechos en código: whoosh, hit, click).
- **No acompasa animación a la voz** (eso ya lo hace `reels/alinear.mjs`). Puede servir para poner efectos de sonido en los cortes y para medir si un efecto cae a tiempo.
- No se instaló: no entra en el pedido npm y trae un peso de torch considerable. Si se quiere probar: instalar `uv` y correr `uv tool install` con `--python 3.12`, siempre en carpeta aparte.

**Render de la tubería actual** (clima de 18 s, mudo, con datos de ejemplo, sin red, salida en `prueba-hyperframes\repo-clima\`). Resultado: 18 s, 541 cuadros, **204 s** de reloj (3 m 24 s) con las imágenes fijas de muestra incluidas (unos 380 ms por cuadro en 4 núcleos; puede haber competido con procesos de la prueba anterior, así que es una cota alta). El mp4 quedó en `prueba-hyperframes\repo-clima\clima.mp4`. En Actions (4 núcleos de ubuntu) debería ser parecido.

## 5. Recomendación para un reel de clima de 20 a 30 s

El objetivo: video de fondo, texto animado, números grandes, voz y música.

**Comparación**

| Criterio | ffmpeg puro | HyperFrames | Tubería actual (SVG + resvg + ffmpeg) |
|---|---|---|---|
| Calidad visual | Alta para video, cortes, zoom y xfade. Mala para texto animado y números que cuentan (drawtext con expresiones, engorroso) | Alta: CSS y GSAP, tipografía real, números que cuentan, blur, máscaras, 3D | Buena para formas y texto; sin blur real, sin video de fondo; cada cuadro es un SVG nuevo |
| Velocidad | La más rápida (segundos) | Medida: unos 140 ms por cuadro más 16 s de arranque; un reel de 25 s (750 cuadros) rondaría 1,5 a 2 min en esta PC (extrapolado de 142 ms por cuadro con 2 workers, a confirmar); más rápido que la tubería actual (unos 380 ms por cuadro) pero no instantáneo | Lenta: 204 s para 18 s de clima medidos en esta PC |
| Facilidad para correr solo cada día en la nube | Máxima: ya está en el workflow | Media: Chrome headless más Node 22 en `ubuntu-24.04` de GitHub Actions (hay imagen Docker y Lambda); un render determinista | Máxima: ya está en `v3-piezas.yml` |
| Costo | Cero | Cero: Apache 2.0, sin cuota por render. Minutos de Actions gratis en repo público | Cero |
| Riesgo | Bajo, pero se trabaja a ciegas con filtros largos | Medio: proyecto joven (0.9.x), el postinstall de esbuild falló acá, dependencia de CDN (GSAP), `schedule` de Actions inestable | Bajo, es lo que anda hoy; pero techo visual bajo |

**Recomendación: híbrido en tres capas.**

1. **Video de fondo.** Una biblioteca chica de clips verticales propios o con licencia (nubes, sol, lluvia, cielo de campo), recortados con ffmpeg a 1080 × 1920. Atención a la regla de marca: nada de marcas de agua ni créditos ajenos encima; el crédito va en la cita.
2. **Texto, números y firma con HyperFrames.** El fondo entra como `<video>` y encima va el HTML animado con los números grandes, el pronóstico y la firma de cierre de siempre. La salida es un mp4 mudo.
3. **Audio con ffmpeg.** Voz más música con `sidechaincompress` y `loudnorm`, más subtítulos. Es el paso final y mantiene el cupo de voz tal como está (la voz se pide antes y se reusa).

**Arquitectura mínima para prototipar (1 a 2 días):**

- Carpeta `reels-hf/clima/` con un `index.html` (GSAP) que recibe los datos del clima en un `data.json`.
- Un script que lee el clima de Open-Meteo, escribe el JSON, corre `hyperframes render` y después ffmpeg para mezclar voz y música.
- Una sola voz de prueba, con `PEDIDO_POR_PERSONA=si` y la clave `_V3`.
- Un clip de fondo de Mixkit.
- Se mira el resultado en la PC. **Cero cambios** en `correr.mjs`.

**Para producción:**

- Nuevo workflow manual y luego programado (por el reloj del Worker, no por `schedule:` de GitHub, `REGLAS.md` § 14).
- `npm ci` con `--ignore-scripts` y `hyperframes` fijado en versión exacta (el repo ya fija versiones).
- Dependencias de Chrome cacheadas en la caché de Actions.
- GSAP copiado al repo, **sin CDN**.
- Un nuevo armador que reemplace `escenaDeClima` y conserve el contrato de `armarClima`: guion, `duracion`, subtítulos y tapa.
- Un paso previo que mida el tiempo de render y falle claro si pasa de 3 min, y respaldo automático a la tubería actual si HyperFrames falla (el clima no puede dejar de salir).
- Probar primero con las redes apagadas (`REDES_ACTIVAS=no`, ensayo) y mirar el mp4 de la corrida, como hacen hoy.

**Lo que NO se recomienda:** ffmpeg puro para todo (el texto animado da un código ilegible), ni reemplazar toda la tubería por HyperFrames de golpe. El repaso, las notas y las efemérides con foto ya funcionan y están pulidas, y conviene moverlas de a una.

## 6. Lo que quedó sin verificar

- El tiempo exacto de un reel de 25 s en HyperFrames (se extrapoló de 3 s).
- Que HyperFrames corra en `ubuntu-24.04` de Actions (el README lo promete; no se probó).
- Earshot (no instalado).
- La licencia vigente de las tres bibliotecas de música (se resume de memoria; hay que leer la página de cada una al elegir pistas).
- El cupo real de voz (¿10 o 15?).
