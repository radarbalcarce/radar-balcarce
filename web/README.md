# La web de Radar Balcarce

*Actualizado el 29/09/2026.* El sitio público, en Next.js 15 (JavaScript),
exportado como **HTML estático** y servido por **Cloudflare Pages** en
`radarbalcarce.com`. Lee los archivos de `data/`, que GitHub Actions regenera
cada media hora ("Actualizar la web"). También vive acá **el panel del celular**
(`public/panel/`, publicado en `/panel/` sin indexar; `../docs/09-PANEL.md`).

**Cómo funciona todo:** [`../docs/06-WEB.md`](../docs/06-WEB.md) (los datos, la
tapa, las páginas, el archivo de 180 días, la dirección fija y el diseño). Cada
archivo, con una línea: `../docs/01-ARBOL.md`. Los colores, las letras y el
sistema tipográfico: `../MEDIA-KIT.md`. El SEO: `../docs/seo/AUDITORIA-SEO-LLM.md`.

## Correr en la máquina

```bash
cd web
npm install          # una sola vez
npm run dev          # arma los datos y levanta http://localhost:3000
npm run datos        # sólo arma los datos (scripts/generar-datos.mjs)
npm run build        # foto del dólar + redirecciones + next build (NO arma los datos)
```

Ojo:

- `npm run datos` arma la web de verdad (la ingesta, la lectura y la redacción
  con IA, las fotos) y lo corre GitHub Actions ("Actualizar la web"). En la PC no
  hace nada (desde el 17/10 no hay "modo PC": el panel de la PC se retiró); para
  ver el sitio con los datos de GitHub alcanza con `git pull` y `npm run build`.
  Para correrlo igual, `ARMAR_EN_LA_PC=1 npm run datos`: deja modificados varios
  archivos de `data/` que **no se suben** (antes de un `git pull`, `git checkout`
  de esos archivos o, si chocan, `git checkout --theirs`).
- `npm run build` compila con lo que ya hay en `data/` (sin datos, arranca igual,
  con un aviso).
- Para corregir o retirar una nota no se toca el código: el panel del celular o
  `data/correcciones.json` y `data/retiradas.json` (`../docs/11-OPERACION.md`).
