# Instagram: las reglas

*Módulo `v3/redes/instagram/` (lo usa el Worker `radar-redes`). Lo común a todas las redes está en `../REGLAS.md`; acá, lo propio de Instagram (`@radarbalcarce`).*

## Qué publica hoy: el espejo de Facebook

- **Cada posteo de Facebook sale también en el feed de Instagram, como foto**, en la misma vuelta (si falla, en las siguientes, hasta 12 horas después de que salió en Facebook).
  Es lo que Hernán pidió (2/11): que Instagram replique a Facebook. No tiene cupo ni horario propio: sigue a Facebook.
- Se apaga con la variable `INSTAGRAM_ESPEJO` = «no».
- **La foto va entera.** Instagram sólo acepta fotos JPEG con proporción entre 4:5 y 1,91:1. Si la foto de la nota no cumple (una panorámica, una muy vertical, un PNG), **la nota sale
  sólo en Facebook** y en Instagram se la salta: no se recorta ni se arma una tarjeta.
- **Sin foto, no hay posteo** (y la nota ni llega a Facebook).

## El texto

Igual que en Facebook, pero **sin enlace** (en Instagram no se toca):

    Título de la nota

    Las dos líneas: qué pasó y qué sigue.

    La nota completa, en radarbalcarce.com (link en la bio)

    #Balcarce #RadarBalcarce

    Foto: crédito

## Cómo publica

- Por la API de Meta: se crea el contenido con la dirección pública de la foto (`POST /{instagram}/media`), se espera a que Meta lo procese (hasta 10 consultas cada 2 segundos) y se publica
  (`POST /{instagram}/media_publish`). La cuenta de Instagram se encuentra sola: es la vinculada a la página de Facebook.
- Si Meta contesta con error pero el posteo ya está entre los últimos del feed (comparando el titular), se da por publicado y no se repite.

## Qué hace si falla

Lo de `../REGLAS.md` § 6, por separado de Facebook: dos intentos con error por nota y se abandona; tres fallos de Instagram en dos horas frenan sólo el espejo (Facebook sigue). Un fallo de
Instagram nunca frena ni repite un posteo de Facebook.

## Lo que viene después (no está hecho)

- **Historias** con la tarjeta de cada nota de Balcarce y el sticker de enlace (el plan las prevé; necesitan la tarjeta armada por el módulo de piezas).
- **Reels con voz** (los 6 del día, igual que en Facebook) y **carrusel** de hasta 20 fotos para las notas con 3 fotos propias o más.
- **El clima auspiciado** (en Instagram como historia, en Facebook como reel) se decide con el cronograma de las redes y una semana de números de cada una.
- Hasta entonces, lo que no sea el espejo de un posteo sigue saliendo por el sistema viejo.
