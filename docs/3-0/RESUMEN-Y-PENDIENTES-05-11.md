# Radar 3.0: resumen del 5/11/2026, qué falta y las ideas por orden

*Para Hernán y Andrés. Lo detallado de cada cosa está en `v3/redes/REGLAS.md` y en `docs/3-0/PENDIENTES-3-0.md`.*

## Lo que se hizo desde el 3/11

**La web (radarbalcarce.com)**
- Desde el 3/11 la sirve la versión 3.0 (Worker `radar-sitio`), con respaldo al sistema viejo para lo que todavía no tiene (`RESPALDO_VIEJO` en «si»).
- Firma corta junto a la fecha: «Radar Balcarce» en lo automático, el nombre de la persona en lo suyo. Abajo queda una línea corta, «Escrita con IA y verificada contra sus fuentes · Cómo trabajamos».
- Botones de compartir al pie de cada nota: WhatsApp primero, después Facebook, X y Telegram.
- Solapas de clima, farmacia y dólar, media kit con capturas, avisos con lugares para publicidad, Google Analytics y AdSense (este último en revisión de Google).

**Las redes (Facebook, Instagram, TikTok, YouTube, X, Bluesky)**
- Pasaron al sistema 3.0: posteos con placa, reels, historias, repasos con el listado resaltado mientras habla la voz.
- Cada reel tiene una tapa limpia elegida por nosotros; los subtítulos suben 40 px; el texto del clima no repite la lluvia; el repaso lleva el link de cada una de las 3 notas en Facebook y YouTube.
- Todo video sale también en TikTok, YouTube (hasta 12 por día) y X. Cada posteo de nota sale además en X con su placa (las 3 de la prueba salieron bien).
- Bluesky anda: publica las notas con su tarjeta (3 de prueba, todas bien).
- Carruseles listos en Facebook (álbum) e Instagram: «La semana en Balcarce» (domingos 11:00) y el de cada nota propia con 3 fotos o más.
- La agenda y el carrusel del finde quedan **en pausa** hasta tener los eventos al día.

**Telegram (bot)**: el resumen diario trae sólo números; comandos de administración (/retirar, /corregir, /ultimas, /pendientes, /ayuda). El canal de Telegram queda en pausa.

## Cómo queda la 3.0 y qué falta para cerrarla

| Falta | Quién | Estado |
|---|---|---|
| **Threads**: la prueba falló («el objeto con ese ID no existe o no tiene permisos»). Casi seguro el `THREADS_USER_ID` o el token no corresponden a la cuenta. | Hernán | Revisar el ID (un número, no el usuario) y que el token sea el que se generó para `radarbalcarce` |
| Ver el primer carrusel real en Facebook e Instagram (el domingo 8/11 a las 11) | Claude | Sin probar contra Meta de verdad |
| Ver cómo quedan los subtítulos nuevos en el reel del clima con auspicio | Claude | Mirar el próximo |
| Apagar el respaldo del sistema viejo (`RESPALDO_VIEJO`) y el sistema viejo | Claude + Hernán OK | Cuando las redes estén verificadas una semana |
| Crear los espacios de anuncios cuando Google apruebe AdSense | Claude | Esperando el mail |
| TikTok modo foto (carrusel) | Claude | Probar qué acepta Buffer, o API propia |

## Ideas a revisar, de más a menos importante

1. **Medir una semana qué red y qué pieza sirve más** y recién ahí recortar (informe semanal del domingo 8/11 contra la línea de base del 3/11, en `docs/3-0/ESTADISTICAS-LINEA-DE-BASE-2026-11-03.md`; ojo que el 10/11 cae martes).
2. **Threads** funcionando (ver arriba).
3. **Fotos propias**: guardar una copia de cada foto que se usa para no depender de que el otro medio la deje bajar.
4. **Que el bot de Telegram guarde varias fotos por nota propia**, para que salgan los carruseles de notas propias.
5. **Rehacer las notas del último mes** con un modelo chico (Haiku), al formato actual y con foto.
6. **Perfil de Google (Publisher Center / Google News)**: la ficha «Seguir en Google». Gratis, suma lectores desde Discover.
7. **Agenda de contactos y mapa comercial** (jueves 5/11).
8. **Notas propias de investigación** sobre temas de Balcarce.
9. **Un segundo carrusel con noticias de afuera de Balcarce** (a definir con Hernán antes de generar nada).
10. **Prender los eventos al día y destrabar la agenda**: reel de agenda y carrusel del finde.
11. **Link en los posteos de X**: apagado por ahora (con link llega unas 13 veces menos); revisar después de la semana de medición.
12. **Repaso general de estética** de todas las piezas.
13. **Alertas del SMN** (hace falta una clave oficial del Servicio Meteorológico, trámite de una persona).
14. **TikTok y YouTube por su propia API** (hoy salen bien por Buffer).
15. **Canal de Telegram** (en pausa).
16. **Spotify y Apple Podcasts** con el audio de los repasos (suma poco al principio).
