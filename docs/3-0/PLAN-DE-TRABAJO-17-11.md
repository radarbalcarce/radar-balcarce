# Plan de trabajo, 17/11/2026

*Armado después de revisar cómo anda todo. Orden de prioridad: primero lo que da plata o se rompe, después lo lindo. Los datos de estado son del 17/11 a las 15:30.*

## 1. Cómo está hoy (revisado)

**Andando:**
- Núcleo: última vuelta a las 15:30, 95 fuentes activas, 59 notas publicadas hoy (32 de Balcarce, 37 nacionales, 33 de áreas chicas). Publicando.
- Sitio: portada y páginas clave responden bien (Quiénes somos, Cómo trabajamos, Contacto, mapas, `robots.txt`, `ads.txt`).
- Redes: «piezas de redes» corre cada hora y publica (hoy salió una nota con voz nueva); «fotos propias» y el respaldo de la base corren bien.
- Las tres notas de sehace.com ya salen con su portada.

**Arreglado hoy:**
- Cifras de la ficha pegadas a la unidad («28 futbolistastotal»): `v3/sitio/vistas/nota.mjs`, con prueba.
- Pruebas en CI: fallaban 3 veces (16 y 17/11) porque el workflow no instalaba dependencias (`ffmpeg-static`). Se agregó `npm ci` en `pruebas.yml`.

**Por mirar / roto:**
- Dos fuentes con falla seguida: `newsbalcarce` (HTTP 502, 12 vueltas) y `puntonueve` (HTTP 526, 36 vueltas). Si siguen así, revisar o apagar (`v3/nucleo/fuentes.json`).
- `/publicidad` responde 301: confirmar a dónde redirige.
- Tráfico muy bajo: unas 320 visitas en 30 días (Cloudflare, sin bots) y 171 clics en 28 días (Search Console). Pesa tanto como el contenido para AdSense.

## 2. Para que nos aprueben AdSense (lo que da plata)

1. Esperar 3 a 4 semanas antes de pedir revisión y **avisar a Hernán antes de mandarla**.
2. Más contenido propio y local: grilla de notas de Balcarce (§ 4) y entrevistas.
3. Páginas de autor con foto y biografía para Hernán y Andrés.
4. Seguir con la tarea diaria de sehace.com (1 a 3 notas por día, Tecnología, firmadas por Hernán). Revisar mañana a las 10 que corrió; si pide permisos, apretar «Run now» una vez.
5. El volumen **no se baja** por ahora (decisión de Hernán). Más adelante, bajar lo de afuera de Balcarce.
6. Cuando haya unas 2.000 visitas por mes: cruzar horarios y secciones con lo que se publicó en redes.
7. A este tráfico, un anunciante local directo rinde más que AdSense: retomar la propuesta del primer anunciante.

## 3. Notas propias de Balcarce (la grilla)

Archivos: `LISTADO-UNICO-BALCARCE.md`, `LISTADO-BALCARCE.html` y `SALIDA-BALCARCE.html` (la simple, para la calle), y el informe `EDIFICIO-MUSEO-FANGIO.md`. No se suben al repositorio (decisión de Hernán).

- **Antes del 22/11 (40 años del Museo Fangio):** llamar a Turismo, pedir fotos y una charla en el museo; armar CIU-01 (edificio, ex palacio municipal) y CIU-02.
- **Archivo Municipal / Museo Histórico:** 5 preguntas sobre el edificio (fecha de inauguración, arquitecto, qué había antes, decreto de 1956/57, uso hasta 1979).
- **Primer día de auto:** recorrido A (ciudad) o B (La Brava, San Agustín, Los Pinos).
- **Preguntar a Hernán:** dónde está el mirador nuevo de Los Pinos y qué es «Estudiantina». Confirmar delegados (los nombres son de 2019 a 2023).
- **Segunda tanda:** concejales, intendente Esteban Reino, vecinos y comerciantes (preguntas guía en el listado). Mar del Plata, más adelante.

## 4. Redes 3.0, la estética (en curso)

Orden: **clima, efemérides, podcast, farmacias.** Primero imágenes fijas de propuesta, sin gastar voz. La voz después.

Criterios de Hernán:
- Foto a pantalla completa, sobre todo en podcast y noticias.
- Más imagen, menos texto, más movimiento. Nada genérico.
- El feed tiene que resaltar en Facebook e Instagram (hoy se ve monótono).
- Probar un tono de voz más ágil y moderno. Voz nueva sólo después de definir la estética.

Hecho: 40 videos de fondo en `D:\BalcarDev\RadarMedia\fondos-stock\` (licencias en su manifiesto), prototipo del clima en `D:\BalcarDev\RadarMedia\prototipos\clima\` (la variante A fue la más cercana, pero «pobre»; el clip era flojo) e informe técnico `INFORME-REELS-DINAMICOS.md` (recomienda híbrido: ffmpeg para fondo, voz y música; HyperFrames para texto y números).

Pendiente:
- 3 propuestas por pieza (clima, efemérides, podcast, farmacias), con foto completa.
- Elegir estilos con Hernán; después, plantillas por estado del tiempo y por tipo de nota.
- Música libre (carpeta de pistas, ducking) y revisar licencias al elegir cada pista.
- Frío y calor tienen un solo clip flojo; faltan clips de tormenta vertical y de la zona.
- Decidir si el zoom suave del fondo se permite (el manual dice que las placas no tienen zoom).

## 5. Voces

- Cupo de voz: el código dice 10 por día (`v3/redes/piezas/variables.mjs`), la memoria decía 15. **Confirmar con Hernán.**
- Las voces propias (locutora y locutor) viven en el proyecto de la clave `GEMINI_API_KEY_REDES`, que no está en el `.env` de la PC (error 404 en las pruebas). Esa clave la pega Hernán, nunca en el chat.
- Crear una voz nueva, más ágil y moderna, con Voice Design (se describe con palabras): sólo después de definir la estética.
- Muestras hechas con voces de Gemini predefinidas (Kore, Zephyr, Puck): en `D:\BalcarDev\RadarMedia\prototipos\voces\`, esperando que Hernán escuche.

## 6. Limpieza y deudas técnicas

- Token de GitHub del vigilante de Cloudflare vencido (Hernán: sin apuro).
- Fallas de «piezas de redes» y de Buffer/TikTok del 13/11: revisar si siguen.
- Fotos del caso Espinoza: faltan desplegar redes y vigilancia.
- Efemérides: armar el mes el día 20.
- Tarjetas de servicio de Bluesky y Threads: apagadas.
- Archivos sin seguimiento en `docs/3-0/`, `docs/propuestas/` y `scripts/pc/`: decidir qué se sube y qué se guarda sólo en la PC.
- Anotar en `docs/3-0/PENDIENTES-3-0.md` lo que se decida de este plan.

## 7. Quién hace qué

| Tarea | Quién |
|---|---|
| Llamadas, fotos, visitas, voz de Hernán | Hernán y Andrés |
| Pegar claves en `.env`, aprobar permisos, pedir revisión de AdSense | Hernán |
| Investigar, armar notas, estética, plantillas, código, despliegues | Claude (subagentes chicos para lo mecánico) |
