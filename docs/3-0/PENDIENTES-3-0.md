# Pendientes de Radar 3.0 (ordenados de más a menos importante)

*Armado el 3/11/2026 a la noche, con todo lo que pidió Hernán ese día. Se retoma desde el jueves 5/11.*

## 1. Redes: que todo se vea prolijo (lo que ya sale al público)

1. **La tapa de cada reel.** En la grilla de Reels de Facebook e Instagram cada video tiene que mostrar una tapa linda: el primer cuadro armado a propósito (con la lista pareja en los repasos), nunca un cuadro a medio animar ni con una tarjeta vacía. Usar la «portada» del reel en la API de Meta.
2. **Nunca una tarjeta sin foto.** En el repaso de la noche del 3/11 la segunda noticia salió con el recuadro de la foto vacío (la foto de Ámbito no se pudo bajar). Si la foto no baja, va el cuadrado con el número y el color de su sección, como la primera.
3. **Subir todo un renglón** en los videos, para que los subtítulos se lean mejor y no queden tapados por el nombre de la cuenta y los botones.
4. **El clima:** sigue saliendo como el del 3/11 (el día y los 4 días que siguen). Revisar que el texto hablado sea correcto, sin repetir siempre las mismas frases.
5. **Repaso general de estética**: una pasada por todas las piezas (reels, historias, placas, carruseles) para que todo quede armonioso y visual.
6. **El texto de los repasos en las redes**: con el enlace a cada una de las tres notas (en Facebook, YouTube y X; Instagram no permite enlaces en el texto).
7. **Publicar todo en todas las redes** (decidido el 3/11): YouTube y TikTok con todos los reels, X con los posteos de notas, carruseles en Facebook e Instagram (notas propias con varias fotos, «La semana en Balcarce» los domingos, «El finde en Balcarce» los jueves). Quedó a medio hacer (el trabajo se cortó por el límite de uso de la semana).
   - **Hecho el 5/11 (Hernán: «sale todo lo que se genere y la red lo permita, medimos una semana y recortamos»):** todo video con mp4 (reels, historias, clima, farmacia, útiles, agenda y avisos de clima) sale por Buffer a TikTok, YouTube Shorts y X; YouTube con tope de 12 por día (`TOPE_YOUTUBE_POR_DIA` en `v3/redes/wrangler.toml`) y sin los videos de más de 60 s. Cada posteo de nota sale también en X por Buffer, con la placa 4:5, el titular y los hashtags, sin enlace (`X_CON_ENLACE` = si lo agrega); ese paso corre dentro de «Publicar los enlaces» de `v3-piezas.yml`. Interruptor `BUFFER_IMAGENES` (variable de GitHub, «no» lo apaga). Detalle en `v3/redes/REGLAS.md` §10 y §12.
   - **Sin probar con Buffer de verdad:** la forma `assets: [{ image: { url } }]` sale de la documentación de Buffer (developers.buffer.com, «Create Image Post»), pero no se corrió contra el canal de X. Mirar el primer posteo real: en «Publicar los enlaces» de GitHub Actions o en la tabla `publicaciones` (red `x`) queda el error si Buffer lo rechaza.
   - **Carruseles en Facebook e Instagram, hecho el 5/11 (en ensayo, sin publicar de verdad):** «La semana en Balcarce» (domingos 11:00), «El finde en Balcarce» (jueves 18:00, sólo con eventos) y el carrusel de cada nota propia con 3 fotos o más (una vez por nota). Sin voz y sin gastar audios. Detalle en `v3/redes/REGLAS.md` § 13. **Sin probar contra Meta de verdad**: mirar el primer posteo real (que Instagram acepte las láminas de `/placa/` y que el álbum de Facebook respete el orden). Queda pendiente que el bot de Telegram guarde todas las fotos de una nota propia (hoy guarda una), si no el carrusel de nota sólo sale de las notas migradas.
   - **Pendiente, TikTok modo foto (carrusel de fotos):** no se pudo confirmar que la API de Buffer lo permita (la documentación sólo muestra imágenes sueltas para los canales que lo admiten y no dice nada de TikTok). Antes de armar nada: correr `node redes/buffer.mjs --probar` con la clave de Buffer (a mano, una persona) y mirar si `AssetInput`/`TikTokPostMetadataInput` aceptan varias imágenes; si no, la salida es la API propia de TikTok (punto 18). Mientras tanto TikTok sólo recibe videos.

## 2. El sitio

8. **La firma y la fecha de las notas, con un solo criterio.** Sacar el renglón largo «Redacción Radar Balcarce, escrita con IA a partir de N fuentes…» del pie de cada nota (repetitivo) y dejar una firma corta arriba, junto a la fecha, igual en todas: «Radar Balcarce» en las automáticas, «Hernán Accomo» en las notas propias, gacetillas y notas de auspiciantes. La aclaración de cómo trabajamos queda en el pie del sitio y en «Cómo trabajamos».
9. **Botones para compartir** en cada nota: WhatsApp primero, después Facebook, X y copiar enlace.
10. **Las notas viejas**: hay unas 3.000 en el sitio. Rehacer con un modelo chico (Haiku) sólo las del último mes al formato actual y buscarles foto en las páginas de sus fuentes; las más viejas no vale la pena.
11. **Fotos propias**: guardar una copia de cada foto que se usa, para no depender de que el otro medio la deje bajar (estructurarlo el jueves).

## 3. Para charlar el jueves

12. Agenda de contactos y mapa comercial o de la zona.
13. Bluesky y Threads (las claves), el canal de Telegram.
14. Notas propias de investigación sobre temas de Balcarce.
15. **Perfil de Google** (la ficha «Seguir en Google» que tienen los medios grandes): se consigue registrando el medio en Google Publisher Center / Google News. Vale la pena: suma lectores desde Google Discover. Es gratis.
16. **Spotify y Apple Podcasts**: el audio de los repasos se puede publicar como podcast diario. Es posible y gratis, pero suma poco al principio; para más adelante.
17. Alertas del SMN: hace falta pedirle una clave oficial al SMN (trámite de una persona).
18. TikTok y YouTube por su propia API (hoy salen bien por Buffer).

## Respuestas rápidas del 3/11

- **«En dos líneas» arriba de la nota**: sí, varios diarios lo usan así (un resumen arriba, antes del cuerpo). Queda.
- **Una nota por cada repaso (podcast)**: en la 3.0 no; el repaso es un video que lleva a las tres notas. No hace falta una nota aparte.
- **Notas en el sitio**: unas 2.900 migradas del sistema viejo más las de la 3.0 (unas 100 por día).
