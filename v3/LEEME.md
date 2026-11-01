# Radar 3.0 (`v3/`)

El sistema nuevo, que reemplaza a todo lo demás del repositorio cuando se haga el corte (plan: `docs/propuestas/PLAN-RADAR-3-0.md`,
sección 10 con las decisiones). Vive en esta carpeta mientras lo viejo sigue andando; en el corte, lo viejo se borra y esto pasa a la raíz.

Reglas de la carpeta:

- **Cada módulo es una carpeta con `REGLAS.md`** (qué hace, en palabras de una persona), el programa y sus pruebas (`*.test.mjs`,
  `node --test v3/`). Si una regla no está en el `REGLAS.md`, no existe.
- **Nada importa nada de afuera de `v3/`** ni de npm. Workers de Cloudflare, JavaScript sin dependencias.
- **Una sola manera de hacer cada cosa.** Sin interruptores de prueba, sin «por si acaso».
- **Tokens y claves nunca acá:** GitHub Secrets o el panel de Cloudflare, pegados por una persona.

Mapa (se va llenando por etapa):

    v3/nucleo/        fuentes, leer, agrupar repetidas, elegir, redactar y verificar, valor agregado, fotos   (etapa B)
    v3/sitio/         el Worker que arma cada página, el archivo, SEO, avisos                                 (etapa C)
    v3/redes/         piezas/ (reels, placas, voz) y una carpeta por red: facebook, instagram, tiktok, youtube, x, threads  (etapa D)
    v3/redaccion/     telegram/ (el bot: LISTO en etapa A), gacetillas/ (el mail), agenda/, clima/            (etapas A y E)
    v3/panel/         /admin con login de Google: editar, ocultar, cambiar foto, colaboradores                (etapa C)
    v3/vigilancia/    un Worker: qué anda, qué no, informe de las 8 y de las 20 por Telegram                  (etapa F)

Cómo se sube: workflow «Radar 3.0: desplegar» (`.github/workflows/v3-desplegar.yml`), a mano, eligiendo qué.
