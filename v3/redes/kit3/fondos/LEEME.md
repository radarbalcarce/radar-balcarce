# Fondos de video del clima (kit 3.0)

El clima del kit 3.0 lleva de fondo un video del cielo del día (lluvia, sol, niebla, noche estrellada…). Son **36 clips de stock** (3 por cada uno de los 12 estados del cielo), de Pexels y Mixkit,
con licencia que permite uso comercial sin atribución. **No están en el repositorio** (es público, y pesan unos 170 MB): viven en el depósito R2 `radar-fotos`, carpeta `kit3/fondos/`.

`fondos.json` es el manifiesto: estado del cielo → archivos, página de origen y licencia de cada clip. Es lo único de esta carpeta que está en el repositorio, junto con los dos programas.

## Cómo los encuentra el dibujo

La variable `KIT3_FONDOS` dice en qué carpeta están (con las subcarpetas por estado: `lluvia/pexels-12496667.mp4`, etc.). Si no está puesta, o falta el clip de un estado, **la pieza no se
pierde**: el clima se dibuja con un cielo gráfico propio de la marca (degradé y partículas), y el informe de la pieza lo anota.

## Cómo se preparan (una vez, en una PC)

Los originales están en `D:\BalcarDev\RadarMedia\fondos-clima` (con su `indice.json`). Se pasan a 1296 × 1920 (9:16 con margen para el paneo lento), 30 cuadros, hasta 20 s, H.264 sin audio:

    node v3/redes/kit3/fondos/preparar.mjs D:\BalcarDev\RadarMedia\fondos-clima D:\BalcarDev\RadarMedia\fondos-clima-kit3

Deja la carpeta lista (36 videos + `fondos.json`). Si cambia algo del manifiesto, copiar ese `fondos.json` acá.

## Qué subir a R2 (lo hace una persona, una vez)

Bucket `radar-fotos`, carpeta `kit3/fondos/`, con la misma estructura de subcarpetas que la carpeta preparada (36 archivos, por ejemplo `kit3/fondos/lluvia/pexels-12496667.mp4`).
La lista exacta es la de `fondos.json` (`node -e "for (const l of Object.values(require('./fondos.json').estados)) for (const c of l) console.log(c.archivo)"`). Con el programa `subir.mjs` (necesita `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` y `CLOUDFLARE_ACCOUNT_ID` en el entorno de la terminal; `--probar` sólo cuenta):

    node v3/redes/kit3/fondos/subir.mjs D:BalcarDevRadarMediaondos-clima-kit3

O con la herramienta de Cloudflare (`wrangler r2 object put radar-fotos/kit3/fondos/<archivo> --file <ruta> --remote`, con `wrangler login` hecho como radarbalcarce@gmail.com) o arrastrando la carpeta en el panel de Cloudflare.

## Cómo los bajaría un workflow

Antes del paso que corre `correr.mjs` (o el ensayo), con los mismos secretos que ya usa «Radar 3.0: piezas» (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_ACCOUNT_ID`):

    - name: Bajar los fondos del clima (kit 3.0)
      run: node v3/redes/kit3/fondos/bajar.mjs "$RUNNER_TEMP/fondos-kit3"
      continue-on-error: true
      env: { R2_ACCESS_KEY_ID: ..., R2_SECRET_ACCESS_KEY: ..., CLOUDFLARE_ACCOUNT_ID: ... }

y en el paso que dibuja: `KIT3_FONDOS: ${{ runner.temp }}/fondos-kit3`. `bajar.mjs` no repite lo que ya está y, si falla, el clima sale con el cielo gráfico. Desde el 19/11/2026 lo hace `v3-piezas.yml`.
