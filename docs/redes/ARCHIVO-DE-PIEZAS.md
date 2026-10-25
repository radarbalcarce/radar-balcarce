# El archivo de piezas

*15/10/2026. Lo hace `redes/archivar-piezas.mjs`; lo corren, al final y sin poder frenar nada, "Redes", "Piezas" y "Fijar piezas". Arrancó
**apagado** y se prendió el 15/10, cuando se cargó la variable `R2_PIEZAS` (`radar-piezas`; `docs/08-INFRAESTRUCTURA.md`). Sin ella, cada corrida dice "sin archivo de piezas" y sigue.*

## Para qué

Todo lo que arma el robot para las redes (los videos, **los audios con la voz de Gemini**, los subtítulos y las placas) vive en
`reels/salida/` dentro de la máquina de GitHub Actions. Después se sube como "artefacto" por 3 días ("Redes") o 7 ("Piezas" y "Fijar
piezas") y se borra. Meta se queda con lo que se posteó, pero **no con nuestros archivos**: el audio gasta cupo de voz (10 por día) y, si
se pierde, hay que gastar otro; y el video fuente sirve para volver a subirlo a otra red, a la web o a un archivo. Ahora cada corrida los
copia a un depósito propio de Cloudflare R2.

## Dónde se guarda

Un depósito de R2 **aparte** del de respaldos (`R2_RESPALDOS`) y del de fotos (`R2_FOTOS`), de la misma cuenta de Cloudflare. El nombre lo
da la variable de GitHub **`R2_PIEZAS`** (recomendado: `radar-piezas`; si la variable vale `si`, se usa ese nombre). Si el depósito no
existe, el script lo crea (como hace "Archivo permanente (staging)"). El script se niega a escribir en un depósito llamado como los
de respaldos o de fotos.

    piezas/AAAA/MM/DD/video/<nombre>.mp4              el video armado (y <nombre>-historia.mp4, la versión recortada a 60 s)
    piezas/AAAA/MM/DD/audio/<nombre>.mp3              la voz, tal como la devolvió Gemini
    piezas/AAAA/MM/DD/subtitulos/<nombre>.ass         los subtítulos
    piezas/AAAA/MM/DD/imagen/<nombre>.png             las placas (<nombre>-2.png, efe-…-principal.png, etc.)
    piezas/AAAA/MM/DD/indice.json                     qué hay ese día

El día es el de Balcarce. `<nombre>` es el de la pieza (`clima-manana`, `noticia1`, `podcast`…, `reels/plan.mjs`). Si el mismo nombre
vuelve con otro contenido el mismo día (se rearmó la pieza), el segundo lleva los primeros 8 caracteres de su sha256 al final y no pisa al
primero.

**`indice.json`** tiene una fila por archivo: `clave` (la ruta en el depósito), `archivo`, `pieza`, `tipo` (reel o historia), `tipoArchivo`,
`id` (la nota principal) y `notaIds` (todas, con su título, sección y `firma`: quién escribió esa nota), `fecha` y `hora` (la de salida),
`red` (en cuáles salió: `instagram`, `facebook`), `posteos` (cada uno con su `mediaId` y `enlace` si el libro lo sabe), `enlace` (el primero que
se conoce), `sha256`, `bytes` y `escritoPor` (los guiones de las piezas los arman plantillas, sin modelo de IA: `redes/guiones.mjs`; la voz
la pone Gemini; el texto de cada nota ya lo firma la nota). El enlace de Instagram y de Facebook sólo figura si Meta ya lo había dado
cuando corrió el archivo; si una corrida posterior del mismo día lo trae, el índice se completa (sin volver a subir los archivos).

## Qué se sube y qué no

* **Sólo** lo que el manifiesto de la corrida (`reels/salida/piezas.json`) dice que es una pieza. Lo suelto que haya en la carpeta no se sube.
* **No se repite**: si el sha256 ya está en el índice del día, no se sube de nuevo.
* **Nada de lo que espera a una persona**: una pieza con una nota en semáforo rojo, de Política o Policiales (salvo que una persona la haya
  marcado para las redes), o aprobada por una persona sin marcarla para las redes, no se archiva entera. Es la misma regla que ya aplican
  los podcasts (`redes/elegir.mjs`).
* **Nada de lo retirado**: ids de `web/data/retiradas.json` y notas bloqueadas o descartadas desde el celular (`celular-decisiones.json`).
* **Si la nota de la pieza no está en los datos** (`portada.json`, `archivo.json`), no se puede comprobar y no se sube.
* Las piezas sin notas (clima, farmacia, efemérides, participá) siempre se archivan.
* Si más tarde se retira una nota cuya pieza ya estaba archivada, **el archivo no se borra solo**: hay que sacarlo a mano (más abajo).

## Qué pasa si algo falta o falla

Nunca frena ni atrasa la publicación: el paso va **al final** de cada workflow (después de publicar y de guardar el libro de lo publicado),
con `continue-on-error: true` y un tope propio de 6 minutos; el script, además, deja de subir a los 240 segundos y guarda el índice con lo que
alcanzó. Sin `R2_PIEZAS`, o sin `CLOUDFLARE_API_TOKEN` o `CLOUDFLARE_ACCOUNT_ID`, el paso dice **"sin archivo de piezas"** y termina bien.
Si no puede leer el índice del día, no lo pisa. Los secretos no se imprimen (si wrangler los repitiera en un error, salen como `***`).
El resumen de cada corrida de Actions dice cuántos archivos subió. Las pruebas son `pruebas/archivar-piezas.test.mjs` (sin red).

## Cuánto pesa

Medido el 15/10/2026 con las piezas de ejemplo que hay en `reels/salida/` (clima de la mañana, tarde y noche; farmacia; los dos repasos
cortos; el podcast de la noche con su historia; una historia y una efeméride: **9 piezas, 37 archivos**), con la simulación:

| Qué | Peso por día |
|---|---|
| Videos (`.mp4`, incluida la historia recortada del podcast) | ~ 18,5 MB |
| Audios (`.mp3`) | ~ 3,1 MB |
| Placas (`.png`) | ~ 1,4 MB |
| Subtítulos (`.ass`) e índice | < 0,1 MB |
| **Un día completo** | **~ 23 MB** |

El podcast de la noche es más de la mitad (7 MB de video, 4 de su historia, 2 de audio). Un día con más piezas (participá, un aviso, la
efeméride) puede llegar a 30 MB. Cuenta de trabajo: **~ 25 MB por día = ~ 0,75 GB por mes = ~ 9 GB por año**.

## Cuánto cuesta (R2, lo leído en la documentación oficial el 15/10/2026: <https://developers.cloudflare.com/r2/pricing/>)

* Almacenamiento (Standard): **USD 0,015 por GB-mes**, con **10 GB-mes gratis por mes**.
* Operaciones: tipo A (escribir, listar) USD 4,50 por millón y tipo B (leer) USD 0,36 por millón; gratis 1 millón de A y 10 millones de B por mes.
* **Bajar archivos (salida de datos) no cuesta.**
* Un día completo son ~ 40 archivos más el índice, que se lee y se reescribe en cada corrida que archiva: unas 55 operaciones de escritura por día,
  ~ 1.700 por mes (0,2 % de lo gratis).

Con 0,75 GB por mes, el depósito pasa los 10 GB hacia el mes 13. **El primer año es gratis.** Después, por GB que se pasa: al cumplir 2
años (unos 18 GB) son ~ USD 0,12 por mes; a los 5 años (unos 45 GB), ~ USD 0,53 por mes. Es decir, **aunque no se borre nunca, no llega a
USD 1 por mes en cinco años.** Los precios pueden cambiar: la fuente es la página oficial.

## Cómo activarlo (una vez)

1. GitHub → Settings → Secrets and variables → Actions → **Variables** → nueva: `R2_PIEZAS` = `radar-piezas`. No hace falta crear el
   depósito: el script lo crea si no existe. Los secretos `CLOUDFLARE_API_TOKEN` (con el permiso *Workers R2 Storage: Edit*, el mismo del
   respaldo) y `CLOUDFLARE_ACCOUNT_ID` ya están.
2. Probarlo: Actions → **Piezas** → Run workflow con `solo` = `clima-manana` (gasta un audio del cupo de voz; no hace falta marcar
   "publicar"). Al final, el paso "Archivar las piezas en R2" tiene que decir cuántos archivos subió; el resumen de la corrida lo repite.
3. **El depósito tiene que seguir privado**: no conectarle un dominio público ni activar `r2.dev`.

Para apagarlo: borrar la variable `R2_PIEZAS`. Para probar sin subir: `node redes/archivar-piezas.mjs` (simula sobre `reels/salida/`).

## Cómo bajar una pieza

El índice de cada día dice qué hay. Con wrangler (la misma versión de los workflows, con `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` en el
entorno):

    npx wrangler@4.139.0 r2 object get radar-piezas/piezas/2026/10/15/indice.json --file indice.json --remote
    npx wrangler@4.139.0 r2 object get radar-piezas/piezas/2026/10/15/audio/noticia1.mp3 --file noticia1.mp3 --remote

También se puede ver y bajar desde el panel de Cloudflare → R2 → `radar-piezas` → Objects, navegando por `piezas/AAAA/MM/DD/`. Para
comprobar que un archivo bajó entero: `sha256sum noticia1.mp3` tiene que dar el `sha256` de su fila en el índice. Para sacar uno (por
ejemplo, una nota que se retiró después): `npx wrangler@4.139.0 r2 object delete radar-piezas/<ruta> --remote` y quitar su fila del índice.

## Retención sugerida

* **Audios, subtítulos, placas e índices: para siempre.** Son ~ 4,5 MB por día (~ 1,7 GB por año), el audio gasta cupo de voz y no se puede volver
  a pedir igual.
* **Videos: también, mientras entren en lo gratis (el primer año).** Son el 80 % del peso. Pasado el año, si el costo molesta, borrar los videos
  de más de 12 a 24 meses y dejar el resto; con los precios de hoy es un ahorro de centavos, así que no hay apuro.
* R2 no puede borrar "sólo los videos" con una regla automática, porque la carpeta del tipo está en el medio de la ruta
  (`piezas/AAAA/MM/DD/video/…`) y las reglas de ciclo de vida filtran por el comienzo. Si algún día hace falta, se arma un borrado a mano
  por mes. Una regla por prefijo (`piezas/2026/`) borraría todo un año: no usarla para esto.
* Si el costo llegara a molestar de verdad, mover lo viejo a *Infrequent Access* (USD 0,01 por GB-mes, mínimo 30 días, sin gratis): hay que
  comparar, porque dejaría de contar la parte gratuita.
