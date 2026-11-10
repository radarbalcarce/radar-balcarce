# Pendientes de Radar 3.0 (ordenados de más a menos importante)

*Armado el 3/11/2026 a la noche, con todo lo que pidió Hernán ese día. Se retoma desde el jueves 5/11.*

## 0. Al cierre del 10/11/2026: qué se hizo hoy y qué queda para mañana

**Hecho y desplegado el 8–10/11** (todo con pruebas: 813 pasan; cada regla está en el REGLAS.md de su carpeta):
- Notas propias por Telegram: el bot guarda hasta 10 fotos con dirección pública (carrusel de redes con 3 fotos o más).
- SEO: `security.txt` (**vence el 7/11/2027: renovar**), `humans.txt`, JSON-LD de farmacias, clima y quiénes somos; Perfil Sociedad con feed al día; notas con consultas en paralelo.
- **Lo del exterior sin vínculo con la Argentina no se publica** (la IA marca `noPublicar` «extranjero»; caso Russell Brand): `v3/nucleo/redactar/REDACCION.md`. Si vuelve a pasar, traer el ejemplo.
- **Redes: una nota de Balcarce sin foto espera 150 min antes de salir con la placa** (`esperaDeLaFotoMin`, `v3/redes/elegir.mjs`).
- **Criterio de fotos 2:** sólo se descarta una víctima menor, abuso o contenido gráfico; Policiales ya no se saltea; las notas sin foto por el criterio viejo se reabren una vez (`FOTO_CRITERIO`, `v3/nucleo/nucleo.mjs`). La foto de una fuente de Balcarce (Radio Gabal) pasa aunque tenga logo.
- **Espera nacional de 60 min:** lo nacional se redacta recién cuando la historia lleva una hora en el sistema (`NUCLEO_ESPERA_NACIONAL_MIN`, 0 la apaga; motivo `madurando`). Lo muy contado y Balcarce no esperan.

**Para mirar mañana (11/11), en este orden:**
1. `/salud` del núcleo: ¿bajó `sinFoto7d` (estaba en 58 de 843, 17 recuperables)? ¿Cuántas historias en `madurando` y salieron notas nacionales a un ritmo razonable? Si salen muy tarde, bajar la espera a 30.
2. El carrusel del domingo 8/11 («La semana en Balcarce», salió 11:44 con 10 láminas): no hay cifras propias del posteo, mirarlas en Instagram y Facebook. Medir una semana entera antes de decidir qué se recorta.
3. Que las placas en redes ya no salgan antes de tiempo (los posteos de Balcarce sin foto deberían salir con foto o ilustración).
4. Si Hernán pide la auditoría de todo lo hecho, empezar por los cambios de esta sección.

**El lunes que no se hizo (siguen pendientes, con Hernán):**
- **Efemérides de diciembre a marzo/abril:** simulación de diciembre dio 11 de 31 días con pieza. No hace falta que sean de Balcarce: fechas con datos curiosos de interés general. Correr la simulación por tramos, mostrar los días vacíos, proponer fuentes, y con su OK escribir las piezas y crear `EFEMERIDES_V3_ACTIVAS`. Decidir si llevan nota y con qué formato. Con eso resuelto se puede apagar el sistema viejo (primer paso: `RESPALDO_VIEJO = "no"`).
- **Clima:** imágenes más lindas hechas con Gemini o Meta (hoy son fijas), otras fuentes de clima y una nota con más datos. Ver abajo lo del INTA.
- **INTA Balcarce:** escribirles (mail o el canal que tengan) para pedir acceso a los datos de su estación (SIGA 242: temperatura, humedad y lluvia cada 10 min), con qué licencia y crédito, y si hay API. Hernán autorizó mandarlo desde radarbalcarce@gmail.com, pero **mostrarle el texto antes**. Las fuentes del SMN que se probaron: el endpoint `ws.smn.gob.ar/map_items/weather` dio 503; no sacar tokens de la home del SMN; los datos abiertos `tiepre` sirven sólo como contraste (Tandil y Mar del Plata). El pronóstico hoy sale de Open-Meteo para las coordenadas de Balcarce.
- **Notas propias:** qué temas y cómo. Gacetillas de prensa (Cicaré Kan, La Oxidada, CAME, paritaria mercantil, Zentrix) podrían ser notas, sólo con OK de Hernán.

**Ideas pospuestas (hasta que Hernán traiga contenido):** resumen de la semana (maqueta antes), newsletter, botón «Instalar», segundo carrusel de afuera, link en X, agenda de contactos, podcasts, avisos publicitarios (por ahora no hay; si aparecen, deben contarse). **Canal de WhatsApp de Radar:** Hernán lo crea (Novedades → «+» → Crear canal) y pasa el enlace; después el botón «Seguinos por WhatsApp» y el envío automático. **Descartado:** la línea «Contada por N medios» arriba de las notas.

**Sólo puede hacerlo Hernán:** borrar el mapa viejo `/nota/sitemap-archivo.xml` en Search Console; revisar el logo en Publisher Center → Estilos visuales; revisar los inicios de sesión de Facebook de Córdoba (7/11) y San Vicente (5/11); en la PC, correr `scripts/pc/INSTALAR-LIMPIEZA.bat` y reiniciar; aprobar que el repositorio pase a privado; borrar los posteos de Meta de la nota de Russell Brand (ya los borró).

**Sin seguimiento en git a propósito** (el repositorio es público; borradores): `docs/3-0/notas-propias/`, `docs/propuestas/MAPA-Y-CRONOGRAMA-25-10.html`, `scripts/pc/`. No perderlos.

**Despliegues:** el permiso automático bloquea a veces `gh workflow run "Radar 3.0: desplegar"`; si pasa, pedirle el OK a Hernán en el chat y reintentar (siempre solo, sin juntarlo con un commit, y antes `gh api user` debe dar radarbalcarce).


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

- **Agenda en pausa (Hernán, 5/11):** el reel «Qué hacer este fin de semana» y el carrusel «El finde en Balcarce» no salen hasta que los eventos estén al día. Para prenderlos de nuevo, sacar `pausada: true` de sus dos filas en `v3/redes/piezas-del-dia.mjs`.
