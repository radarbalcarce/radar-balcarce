# Módulo M: segunda vuelta de auditoría de los documentos

*24/10/2026. Para Hernán y Andrés. Después de los cambios del 23 y 24/10 (reglas 286 a 312) se leyeron los documentos contra el código real para que nada se contradiga ni quede viejo.
Se corrigió todo lo que era un error de texto, **sin cambiar lo que el sistema decide**. Lo que es de criterio quedó en `PENDIENTES.md` con una recomendación. Regla 313.*

## 1. Cómo se revisó

- Los números del código (`ingesta/criterio.mjs`, `ingesta/popularidad.mjs`, `web/lib/archivo.js`, `reels/cupo-voz.mjs`, `infra/reloj-cloudflare/nube.mjs`) contra cada documento de la lista: 12, 24 y 36 horas, 8 medios, 3 y 2 medios, 500 y 3.700 notas, 5 posteos, 10 audios, 70 palabras, 12 palabras copiadas, intentos extra de la IA.
- Las reglas de selección contra `ingesta/ingesta.mjs` (`esPolicialDeAfuera`, `sueltaElAmarillo`, `semaforo`, `exigirMedios`, `resolverDescartesDeSeccion`), `panel/celular-datos.mjs` y `ingesta/lectura-ia.mjs`.
- Tres barridos automáticos sobre 18 documentos: rutas de archivo entre comillas que no existen, nombres EN_MAYUSCULAS que ningún programa usa y funciones que ya no están. Quedaron sólo los que el propio documento dice que se borraron.
- Las reglas numeradas de `docs/10` (huecos, repetidas, fuera de tabla) y las entradas de `docs/DECISIONES.md`.
- Los prompts a la IA (§ 12 de `CRITERIO-EDITORIAL.md`, la instrucción de la lectura en `ingesta/lectura-ia.mjs`, `ingesta/perfil-balcarce.md`, la auditoría IA): **no contradicen el criterio** (la regla 4 ya no dice «unas 250»; la lectura ya no saca por «sin relación con Balcarce»; el policial que no es de acá sale con la excepción de 8 medios o la muerte de un famoso). No se tocó la §12.

## 2. Lo que se corrigió (error de documentación o de texto)

| Documento | Qué decía y qué dice ahora |
|---|---|
| `docs/03-SELECCION.md` | «Policiales de afuera, nunca» (en la frase del criterio, el paso 1, la tabla de popularidad, el paso 6 y el paso 7) pasó a la regla 289; el color amarillo ya no dice «cinco por día» al celular (regla 295); el semáforo explica lo que se suelta en lo de acá y en lo muy contado (291, 292, 297) y el parte del dólar y lo internacional descartados (298); las áreas chicas incluyen Agro y Automovilismo (294); lo muy contado mira «las últimas 24» horas y no 12 (288); el estreno es 12, 24 o 36 horas (287, 293); el tope es 500 notas y no 3.700 (con R2 encendido, no «sin activar»); `ESPERA_PERSONA` pasó a `SECCIONES_QUE_ESPERAN_PERSONA`; la web importa los números, ya no los copia (293) |
| `docs/02-INGESTA.md` | La sección «policiales» de la dirección ya no es «ninguna excepción»; se explica la marca `descarteDeSeccion` y la decisión después del cruce (303) |
| `CRITERIO-EDITORIAL.md` | Policiales («un policial de otro lugar no se trae» sin la excepción); el amarillo (sólo lo de afuera con menos de 8 medios; el parte del dólar y lo internacional se descartan); «hasta cuatro textos» pasó al presupuesto de 12.000 caracteres sin tope de fuentes (308); «tres intentos» con los extras (5 y 8 medios); «la fuente principal» (307); la firma está **adentro** del desplegable, no «en el mismo renglón»; copia: «rechaza más de 12», no «desde 12» |
| `docs/CRITERIO-EN-UNA-PAGINA.md` | Sólo la frase de la copia (el resto ya estaba al día) |
| `CLAUDE.md` | El párrafo de las reglas numeradas tenía cinco tandas repetidas y decía que la próxima era la 308; ahora es la 314 y una prueba la controla; «unas 2.600 pruebas» pasó a unas 3.000; `texto-por-red.mjs` figuraba como dormido y se borró en la regla 309; la regla de los minutos de Workers Builds es la 312 y no la 311; «GitHub Actions regenera `web/data/`» pasó al motor de Cloudflare; la sección «Estado (17/10)» se reescribió; `REDES_ACTIVAS_NUBE` |
| `docs/08-INFRAESTRUCTURA.md` | La mudanza figuraba como «escrita, sin prender» y los Workers del motor y de las tareas como «sin subir»: están andando desde el 22 y 23/10. El archivo permanente figuraba «sin ruta»: se encendió el 23/10. `TOPE_DE_NOTAS` figuraba «no cargada»: vale 500. Las áreas chicas sin Agro y Automovilismo; «los últimos 80 del día para lo de Balcarce» (borrado en la 296); el depósito de fotos |
| `docs/06-WEB.md` | Estreno de 12, 24 y 36 horas; tope de 500 notas; «a 46 por día el tope se alcanza el 10/12» y «archivo permanente listo y sin activar» (encendido el 23/10); `EN_NAVEGACION` (ahora `navegacionDelSitio`) |
| `docs/04-REDACCION.md` | El cuerpo decía «de 70 a 180 palabras, hasta 3 párrafos y 1.800 caracteres» (tres lugares): el código pide de 70 a 300, hasta 5 párrafos y 2.600 caracteres, con el largo de cada nota por su material (`largoSugerido`); «hasta cuatro textos» (presupuesto); la firma «Redacción con IA» (el sitio dice «Redacción asistida con IA»); «rechaza desde 13» (es más de 12); el desplegable de fuentes; las 12 horas de «llega tarde» |
| `docs/07-REDES.md`, `CRITERIO-REDES.md` | El render público figuraba «sin prender» (prendido el 23/10); `texto-por-red` se borró en la regla 309 y no en la 308 (cuatro lugares) |
| `docs/11-OPERACION.md` | Aviso arriba: desde el 23/10 el camino de verdad es el reloj, el motor y `REDES_ACTIVAS_NUBE`; «Actions → Actualizar la web» es la vuelta atrás |
| `docs/00-INDICE.md`, `01-ARBOL.md`, `09-PANEL.md`, `12-GLOSARIO.md` | Tope 3.700 → 500; `texto-por-red`; la firma; «lo que pasó el cupo»; los dos documentos nuevos |
| `docs/CATALOGO-DE-NUMEROS.md` | Aviso arriba: es una foto del 23/10 y varias recomendaciones ya se aplicaron (289 a 296, 298, 303) |
| `docs/10-REGLAS-Y-PRUEBAS.md` | Las reglas 307 a 312 estaban pegadas al final del archivo, **fuera de su tabla** (en pantalla se veían como párrafos); una tabla estaba cortada por un renglón vacío en la 197. Las reglas 63 y 260 dicen ahora lo que las reemplazó. Regla 313 y su prueba |
| `web/app/quienes-somos/page.js` | Decía que la firma está «junto al botón de fuentes»; está adentro del desplegable |
| `docs/DECISIONES.md` | Una tabla de «cuál manda» (§ 3) y las preguntas abiertas que ya se resolvieron, tachadas con la regla que las resolvió |
| `docs/historico/` | Pasan acá `HOY.html`, `PASOS-PARA-HERNAN-Y-ANDRES.html`, `RESUMEN-Y-PENDIENTES.html` (decían que faltaban llaves que ya están cargadas), el cuerpo viejo de `PENDIENTES.md` y el traspaso largo |
| `PENDIENTES.md`, `docs/TRASPASO.md` | Una sola lista maestra (§ 4) y un traspaso de diez renglones |
| `ingesta/criterio.mjs`, `ingesta/listar-fuentes.mjs` y `FUENTES.md` | Sólo textos: «rechaza más de 12» (comentario) y «se leen los feeds con GitHub Actions» (ahora el motor en Cloudflare). `CLAUDE.md` decía «unos cien feeds de unos setenta medios»: son 125 de 76 |

## 3. Cuál manda cuando las decisiones se contradicen

Está al principio de `docs/DECISIONES.md` en una tabla (12 temas). Las tres que más confundían: Policiales de afuera (17/10 «nunca» contra 23/10 «sí con 8 medios o la muerte de un famoso»),
el celular («cinco por día» contra «sin tope») y el tope de notas (3.700 contra 500).

## 4. Reglas numeradas

- 268 reglas, de la 1 a la 313. **Ninguna repetida.** Los huecos (192, 213 y 214, 219 a 229, 236 a 239, 241 a 249, 258 y 259, 264 a 279) son números que nunca se usaron: ningún documento ni programa los cita.
- Las 307 a 312 estaban fuera de la tabla (corregido). Una tabla estaba partida en la 197 (corregido).
- La próxima es la 314. Una prueba (`pruebas/documentos-313.test.mjs`) falla si `CLAUDE.md` dice otra cosa, si una regla se repite o si una queda fuera de una tabla.

## 5. Lo que NO se tocó, y por qué: decisiones para el dueño (con recomendación)

Todo esto también está en `PENDIENTES.md`.

1. **El botón «Actualizar la web ahora» del panel del celular dispara el workflow `actualizar.yml` de GitHub** (y la pestaña Hoy mira las corridas de GitHub), no el motor de Cloudflare. Con el motor ya en la nube, apretarlo corre el robot viejo en paralelo; y si se apagan los siete workflows (P11), el botón deja de andar. *Recomiendo* apuntarlo al motor (Claude, C6) **antes** de apagar nada; mientras tanto, no apretarlo.
2. **El repositorio público de render** tuvo su último cambio el 17/10 y `reels/` cambió después (reglas 300 a 302: animaciones, línea del día, voces). *Recomiendo* sincronizarlo (C7) y mirar un repaso.
3. **Dos variables para las redes**: `REDES_ACTIVAS` (GitHub: «No») y `REDES_ACTIVAS_NUBE` (Cloudflare: «Sí»). Es a propósito, pero quien mire sólo GitHub cree que están apagadas. *Recomiendo* dejar una sola (la de la nube) cuando se apaguen los workflows viejos; está escrito en `CLAUDE.md` y en `docs/08` mientras tanto.
4. **La firma de las notas**: el sitio la muestra adentro del desplegable «Fuentes (N)» (Hernán, 17/10); los documentos viejos decían «a la vista». Se corrigieron los documentos, no el sitio. La pregunta de si vuelve al renglón cerrado sigue abierta (módulo B, 3 y 4). *Recomiendo* decidirla junto con «Escrita por IA» contra «Redacción asistida con IA».
5. **«Opinión firmada»**: la política de privacidad dice que las notas de opinión «siempre van firmadas con nombre real», y el criterio dice «sin opinión». *Recomiendo* sacar esa frase de la privacidad hasta que Hernán decida si hay opinión.
6. **Search Console y Bing**: el 12/10 se dijo «después de la renovación»; la auditoría 2.0 los pone antes del lanzamiento y hoy nadie los mira. *Recomiendo* abrirlos esta semana (15 minutos).
7. **Posteos por día y relevancia de Facebook** (5, 75): los documentos hablan de bajar a 2 o 3, de subir a 8 y de «no tocar». *Recomiendo* no tocar hasta tener un mes de datos (módulo C, D-1).
8. **Open-Meteo**: sus términos del plan gratis son de uso no comercial y el sitio va a tener publicidad. *Recomiendo* decidirlo antes de sumar datos de lluvia; el clima actual puede caer en `api.met.no`.
9. **Salud en las redes**: hoy sale sola (sólo Política y Policiales esperan). *Recomiendo* dejarlo.
10. **Títulos de pruebas viejos** (`archivo.test.mjs` «72 horas» son 36): menor, en C21.

## 6. Lista maestra de pendientes

`PENDIENTES.md` (reescrita): hecho; apagado y quién lo prende (11 interruptores, con el orden de `MINUTOS-DE-WORKERS-BUILDS.md` § 4, `FOTOS-EN-R2.md`, `SITEMAP_DEL_ARCHIVO` y `ENLACES_CORTOS`); pendiente de Claude (C1 a C21); pendiente de una persona (P1 a P17 y la limpieza), con lo que salió el 24/10 primero: subir los Workers,
prender las variables en orden, fotos en R2, mapa del archivo, enlaces cortos, Search Console, **Participá vence el 31/10**, Open-Meteo y altas de redes; decisiones abiertas; bloqueado; con fecha.

## 7. Pruebas

`pruebas/documentos-313.test.mjs` (7 pruebas). Corrida entera de `rm -rf web/out; npm test -- --test-concurrency=2` en la rama del agente: **3.103 pruebas, 3.095 bien, 3 que fallan sólo por el entorno de esa carpeta de trabajo y no por los documentos**: `pedir-clima.test.mjs` y `pedir-clima-tiempo.test.mjs` (a esa carpeta le falta `web/node_modules`, no encuentra `react`) y `respaldo-partes.test.mjs` (git dejó `respaldo.yml` con finales de línea CRLF al armar la carpeta; el archivo no se tocó). En la carpeta principal, con las dependencias instaladas, tienen que pasar. La prueba roja que anotó el módulo F («una historia retoma el TEMA del repaso anterior…») **no falló** en esta corrida.
