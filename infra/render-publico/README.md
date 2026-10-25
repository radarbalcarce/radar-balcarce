# Radar Balcarce · render de video

El taller donde se arman los videos (reels e historias) de Radar Balcarce para Instagram y Facebook. **Este repositorio es público y no tiene ningún secreto**:
los minutos de GitHub Actions de un repositorio público son gratis y sin tope, y armar un video (dibujar las placas con resvg y juntar imagen, voz y subtítulos con
ffmpeg) es lo más pesado que hace todo el sistema.

Quién decide **qué** sale, quién pide la **voz** a Gemini y quién **publica** en Facebook e Instagram es el repositorio principal, que es privado. Acá solo se
**dibuja y se arma**. Ninguna clave, ningún dato de las notas que no vaya a salir al aire, ningún archivo del libro de publicaciones: solo lo que viaja en el pedido.

## Cómo funciona

```mermaid
sequenceDiagram
  participant R as Reloj de Cloudflare
  participant T as Worker de tareas
  participant P as Repo principal (Actions, 1 min)
  participant S as R2 (radar-render)
  participant V as Este repo (Actions, gratis)
  R->>T: :05 :35 :45 · ¿toca una pieza?
  T->>P: despierta «Piezas de redes» (solo=clima-manana)
  P->>P: pide la voz a Gemini (cupo de 10 audios por día)
  P->>S: pedidos/HUELLA/pedido.json + voz.mp3 + meta.json
  P->>V: repository_dispatch «render» (direcciones firmadas de 1 hora)
  V->>S: baja pedido y voz (dirección firmada GET)
  V->>V: resvg + ffmpeg → mp4, tapa, subtítulos
  V->>S: sube el resultado (direcciones firmadas PUT); el manifiesto, último
  T->>S: ve listos/HUELLA/manifiesto.json
  T->>T: publica en Instagram y Facebook y anota el libro
```

## El pedido (`pedido.json`) y la voz (`voz.mp3`)

| Campo | Qué es |
|---|---|
| `version` | Siempre `1`. Si el render no entiende la versión, se niega. |
| `nombre`, `tipo` | La pieza (`clima-manana`, `noticia1`…) y si es `reel` o `historia`. El nombre va a nombres de archivo: solo minúsculas, números y guiones. |
| `guion`, `texto` | Lo que dice la voz. `texto` es el guion ya pasado por `paraLeer`; el render controla que coincidan (si no, los dos lados leen distinto y la voz no calza). |
| `acento` | El color de la palabra que se dice en el subtítulo (`#RRGGBB`). |
| `placa`, `segunda` | El SVG de la pieza (la placa quieta) y, opcional, el de «Además…» de «Un día como hoy». |
| `escena` | Opcional: `{ fn, args }`. La escena animada se rehace con la función `fn` de `reels/escenas/registro.mjs` y los datos `args`. |
| `secuencia` | Opcional: `{ placas: [{ svg, marca }], tapa }`, el repaso que sigue a la voz. Las fotos van adentro de los SVG. |
| `opciones` | `animar`, `historiaMaxima` (58 s: tiene que coincidir con la del principal) y `fps`. |
| `voz` | `{ archivo: "voz.mp3", bytes, sha256 }`: el render controla que el audio que bajó sea ese. |

La **huella** del pedido (24 letras y números) es el resumen del pedido entero con la voz adentro: el mismo pedido da el mismo video.

## El resultado

En la carpeta `listos/<huella>/` del depósito R2 `radar-render`:

- `<nombre>.mp4` — el video entero;
- `<nombre>-historia.mp4` — solo si el video pasa de 58 s: la versión recortada con fundido para las historias;
- `<nombre>.png` — la tapa; `<nombre>.ass` — los subtítulos;
- `manifiesto.json` — `{ version, nombre, huella, archivo, duracion, archivoHistoria?, duracionHistoria?, tapa, subtitulos, generado }`. **Se sube último**: quien lo ve
  sabe que el resto ya está.

## Puesta en marcha (una sola vez)

1. Crear el repositorio **público** `radarbalcarce/radar-balcarce-render` y copiarle **el contenido de esta carpeta** (`infra/render-publico/` del repositorio
   principal), sin la carpeta en sí. Hace falta que el archivo `.github/workflows/render.yml` quede en la raíz.
2. **No cargar ningún secreto.** El workflow no usa `secrets.`.
3. Prueba de humo: pestaña *Actions* → *Render* → *Run workflow* (a mano). Arma un video de mentira con una voz de mentira y lo deja como adjunto.
4. En el repositorio principal ya están (o las carga una persona, **nunca en un chat**): la variable `R2_RENDER` (`radar-render`) y los secretos `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY` y `RENDER_GITHUB_TOKEN` (un token de grano fino, solo para este repositorio, con *Contents: lectura y escritura*: es lo que pide
   `repository_dispatch`). Detalle: `docs/historico/etapa-10-operacion/PLAN-DE-CAMBIO.md` del principal.

## Qué protege este repositorio

- Las direcciones firmadas valen **una hora** y sirven para **un objeto y un verbo** cada una (bajar el pedido, bajar la voz, subir un archivo). No abren nada más.
- El render solo acepta direcciones **https de R2** (`*.r2.cloudflarestorage.com`), exactamente los cinco archivos de salida esperados, un nombre de pieza sin barras ni puntos,
  y una voz cuya huella coincide con la del pedido. Un aviso que no cumple se rechaza antes de dibujar nada.
- Las direcciones se **enmascaran** en el registro (que es público) apenas arranca el programa.
- El workflow solo lee (`contents: read`), no escucha *pull requests* y el aviso entra por una variable de entorno, nunca pegado en un comando.
- Si alguien con acceso de escritura al repositorio principal quisiera mandar un pedido falso, lo único que consigue es un video más en R2: no hay claves que robar acá.

## Mantenimiento

- Los archivos de `reels/` son **copias** de los del repositorio principal (se copian con `node scripts/sincronizar-render-publico.mjs` allá; una prueba del principal avisa si
  quedaron viejos). **No se editan acá**: se cambian en el principal y se vuelven a copiar.
- Propios de este repositorio (se editan acá y en la carpeta del principal): `render.mjs`, `README.md`, `.github/workflows/render.yml`, `pruebas/humo.test.mjs`.
- `npm test` corre la prueba de humo (hace falta Node 24; `npm ci` trae resvg y ffmpeg).
- **Vuelta atrás**: en el repositorio principal, sacar `redes.yml` de la lista `NUBE` del reloj (o ver `PLAN-DE-CAMBIO.md`): «Redes» vuelve a armar los videos sola, como antes.
