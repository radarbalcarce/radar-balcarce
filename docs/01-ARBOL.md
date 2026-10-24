# 01 · El árbol: cada carpeta y cada archivo

*Actualizado el 17/10/2026 con `git ls-files` (la lista de lo versionado),
mirando quién importa a quién, qué corre cada workflow y cada script de
`package.json`. Si se suma o se saca un archivo, se corrige acá.*

## En una frase

El repositorio tiene el motor (`ingesta/`), la voz y el video (`reels/`), las
redes y la vigilancia (`redes/`), el panel del celular (`panel/` y
`web/public/panel/`), los programas de medir (`scripts/medir/`) y el sitio (`web/`); lo que corre solo lo disparan los workflows de
`.github/workflows/`, despertados por el reloj de Cloudflare (`infra/`).

En las tablas, **Quién lo llama** es el workflow que lo corre, el archivo que lo
importa o "a mano" (una persona lo corre en la consola). **¿En uso?** dice **Sí**
(corre solo, en la nube o en un panel), **A mano** (para correrlo cuando hace
falta) o **Sin enlaces** (existe, pero nada lleva ahí). Los documentos (`.md`)
se listan en `docs/00-INDICE.md`.

## El árbol, de un vistazo

```
radar-balcarce/
├── .github/workflows/   30 workflows: lo que corre en GitHub, solo o a mano (docs/08)
├── infra/               los Workers de Cloudflare: el reloj, el vigilante, las imágenes y el archivo permanente (docs/08)
├── motor/               el motor nuevo (base D1): esquema e importador, sin tocar producción (15/10/2026)
├── ingesta/             el motor: fuentes, cruce, selección, lectura con IA, verificador. SIN dependencias (docs/02, 03, 04)
├── reels/               placas, escenas animadas, voz, video y la reescritura con IA. SÍ tiene dependencias (docs/04, 07)
├── redes/               Facebook, Instagram, contrato, vigilante, informe diario, avisos por mail. SIN dependencias (docs/07, 08)
├── panel/               el lado de GitHub del panel del celular y las pistas. SIN dependencias (docs/09)
├── scripts/medir/       los programas que miden el motor con datos reales (repetidas, cruce, informe del día); a mano
├── web/                 el sitio: Next.js 15 exportado como HTML estático (docs/06)
│   ├── app/             las páginas
│   ├── components/      las piezas de la interfaz
│   ├── lib/             la lógica compartida (datos, archivo, rutas, tarjetas…)
│   ├── scripts/         generar-datos y los ayudantes del build
│   ├── data/            los JSON que lee el sitio (los escriben GitHub, el panel del celular o una persona)
│   └── public/          íconos, letras, escudos, encabezados de Cloudflare, fotos del banco y el panel del celular (public/panel/)
├── pruebas/             las pruebas (198 archivos *.test.mjs, unas 2.500 pruebas), el núcleo legal y material (docs/10)
├── comercial/           la base de comercios, aparte del sitio (COMERCIAL.md)
├── docs/                la documentación, sin programas (docs/00-INDICE.md), las etapas del rediseño, flujos/, secciones/ e historico/
└── (raíz)               CLAUDE.md, los criterios, PENDIENTES.md y demás documentos; package.json
```

Lo que **no** se versiona (`.gitignore`): `node_modules/`, `.env*`,
`panel/datos/` y `respaldos/` (lo que guardaba el panel de la PC, retirado el 17/10),
`reels/salida/`, `reels/marca/` salvo `reels/marca/fuentes/`, `ingesta/salida/`,
`.cache/` (la memoria del cruce y las notas para el panel del celular, que guarda
la caché de Actions), `web/.next/`, `web/out/`, `web/public/_redirects`,
`web/data/dolar.json`, `web/.armado-*/` (los armados de prueba), `comercial/salida/`,
`comercial/datos/osm-crudo.json`, `.claude/`, `scratch/` y los restos de trabajo
(`*.log`, `*.bak`, `*.tmp`).

## La raíz

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `.gitignore` | Lo que no va al repositorio (lista de arriba) | git | Sí |
| `package.json` | Las dependencias de `reels/` (`@resvg/resvg-js`, `ffmpeg-static`) y los scripts `test`, `test:nucleo` (el núcleo legal), `ingesta`, `auditar`, `auditar-fotos` | `npm`; los workflows (`npm ci`) | Sí |
| `package-lock.json` | Las versiones exactas de esas dependencias | `npm ci` | Sí |
| `*.md` | Los documentos: ver `docs/00-INDICE.md` | Personas; `CRITERIO-EDITORIAL.md` y `CRITERIO-REDES.md` también el código | Sí |

## `.github/workflows/` (detalle en `docs/08-INFRAESTRUCTURA.md`)

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `actualizar.yml` | "Actualizar la web": el núcleo legal de las pruebas (si falla, no sigue y avisa por mail), ingesta, lectura y reescritura con IA, fotos, datos, compilar (una vez), revisar SEO, commit de `web/data/` y, desde el 17/10, la subida a Cloudflare (recompila sólo si entró algo que el sitio lee; regla 189) | El reloj de Cloudflare a los :00 y :30 (sin `schedule` de respaldo desde el 16/10); el panel del celular; a mano | Sí |
| `cloudflare-deploy.yml` | "Cloudflare Pages": compila `main` y lo sube con wrangler, con el archivo permanente e IndexNow. **Sólo a mano, de rescate** desde el 17/10/2026: la subida de cada media hora la hace "Actualizar la web" con lo que ya compiló (regla 189) | A mano | A mano |
| `redes.yml` | "Redes": Facebook, el reloj, armar y subir piezas, completar direcciones, guardar el libro; al final, el archivo de piezas en R2 (`R2_PIEZAS` = `radar-piezas`, cargada el 15/10) | El reloj de Cloudflare a los :05, :35 y :45, de 7 a 23 (desde el 17/10; ya no al terminar "Actualizar la web"); a mano | Sí |
| `piezas.yml` | "Piezas": armar (y publicar) una pieza a mano | A mano | A mano |
| `panel.yml` | "Panel del celular": la IA escribe una nota a pedido y deja el borrador cifrado | El panel del celular | Sí |
| `vigilancia.yml` | "Vigilancia": `redes/vigilar.mjs` | El reloj de Cloudflare cada 3 horas, con reintento a las 9:30, 21:30 y 0:30 (desde el 17/10); a mano | Sí |
| `informe-diario.yml` | "Informe diario": el mail de las 8:15 y el de las 21:15 (`redes/informe-diario.mjs`, regla 176) | El reloj de Cloudflare (:15, con segundo intento a los :30); `schedule` 8:45 y 21:45 de respaldo; a mano | Sí |
| `pruebas.yml` | "Pruebas": `npm test` entero (ya no corre en cada vuelta de "Actualizar la web") | Al subir código (no datos ni fotos); lunes; a mano | Sí |
| `ilustrar-notas.yml` | "Ilustrar notas sin foto": ilustraciones con IA sin personas para las notas sin foto; revisar, aplicar o automático (reglas 182 y 185) | El reloj de Cloudflare a los :20 cada 2 horas, de 7 a 23 (automático); a mano | Sí |
| `revisar-archivo.yml` | "Revisar el archivo": las notas viejas, por tandas, con el criterio de hoy (regla 212; `docs/flujos/REVISION-DEL-ARCHIVO.md`) | El reloj de Cloudflare a los :12 cada 2 horas, día y noche, desde el 22/10/2026; a mano | Sí |
| `auditoria.yml` | "Auditoría": medidas, íconos, SEO en vivo y la semana del contrato; guarda `web/data/auditoria.json` | Lunes 12:00 UTC; a mano | Sí |
| `auditar-voz.yml` | "Auditar voz": clips con la voz real y su transcripción (gasta cupo de voz) | A mano | A mano |
| `crear-voces.yml` | "Crear voces": crea, recrea, lista o borra las voces propias (los modos de diálogo fueron pruebas descartadas) | A mano | A mano |
| `ver-facebook.yml` | "Ver Facebook": qué hay publicado de verdad en la página | A mano | A mano |
| `probar-mail.yml` | "Probar el aviso por mail": un mail de prueba por el vigilante de Cloudflare | A mano | A mano |
| `probar-gemini.yml` | "Probar las claves de Gemini": qué modelos ve cada clave, texto, voz e imagen (gasta centavos) | A mano | A mano |
| `probar-restauracion.yml` | "Probar la restauración del respaldo": baja el último respaldo de R2 y comprueba que se puede volver a armar | A mano | A mano |
| `reparar-estadisticas.yml` | "Reparar las estadísticas": rehace los días de `estadisticas.json` que quedaron en cero (simula salvo que se pida) | A mano | A mano |
| `reintentar.yml` | "Reintentar pieza": vuelve a subir una parte de una pieza de redes que no salió, sin pedir la voz | El botón del panel del celular; a mano | Sí |
| `auditoria-ia.yml` | "Auditoría IA": lee las notas nuevas con Groq y avisa lo que esté mal | El reloj de Cloudflare a los :41, de 7 a 23 (desde el 17/10; antes `schedule`); a mano | Sí |
| `pistas.yml` | "Pistas": vuelve a mirar las pistas abiertas | El reloj de Cloudflare cada 3 h (desde el 17/10); el panel del celular; a mano | Sí |
| `fijar-piezas.yml` | "Fijar piezas": arma de antemano piezas con voz para reutilizarlas (`reels/fijas/`) | Sólo a mano | A mano |
| `armado-vacio.yml` | "Armado con datos vacíos": arma el sitio con datos vacíos o a medias | Al subir cambios al código de la web; lunes | Sí |
| `pruebas-otra-hora.yml` | "Pruebas con otra hora": corre las pruebas como si fuera otra hora y otra fecha | Lunes; a mano | Sí |
| `respaldo.yml` | "Respaldo": paquete de git, datos y fotos; espejo en GitLab y R2 si están | Domingos; a mano | Sí |
| `reloj-cloudflare.yml` | "Reloj de Cloudflare": sube el Worker `radar-balcarce-reloj` y le carga el secreto | A mano | A mano |
| `vigilante-cloudflare.yml` | "Vigilante de Cloudflare": sube el Worker `radar-balcarce-vigilante` (mira la web desde afuera y manda los mails) | A mano | A mano |
| `imagenes-cloudflare.yml` | "Imágenes con Workers AI": sube el Worker de imágenes y genera tres de prueba | A mano | A mano |
| `generar-fondos-clima.yml` | "Generar fondos del clima": las ilustraciones fijas de la nota del clima (regla 181) | A mano | A mano |
| `archivo-staging.yml` | "Archivo permanente (staging)": el Worker del archivo en un nombre de ensayo, con un depósito de prueba | A mano | A mano |
| `archivo-produccion.yml` | "Archivo permanente (producción)": la carga, la ruta o sacar notas del archivo permanente (regla 183); todavía sin activar | A mano | A mano |

## `infra/` — los Workers de Cloudflare (detalle en `docs/08-INFRAESTRUCTURA.md`)

Cada carpeta tiene su `worker.mjs` (el programa) y su `wrangler.toml` (cómo se sube);
algunas, un `LEEME.md`.

| Carpeta | Qué hace | Quién lo sube | ¿En uso? |
|---|---|---|---|
| `reloj-cloudflare/` | El reloj, `radar-balcarce-reloj`: según el minuto le pide a GitHub que corra cada workflow (`trabajosDelMinuto`). Reemplazó a cron-job.org el 15/10 | `reloj-cloudflare.yml` | Sí |
| `vigilante-cloudflare/` | El vigilante independiente, `radar-balcarce-vigilante`: mira la web desde afuera de GitHub, recibe los avisos (`POST /avisar`) y los manda por mail; su resumen de las 22 es el respaldo del informe diario | `vigilante-cloudflare.yml` | Sí |
| `imagenes-cloudflare/` | `radar-balcarce-imagenes`: genera una imagen con Workers AI (SDXL o flux), dentro de las neuronas gratis | `imagenes-cloudflare.yml` | Sí, a pedido (ilustraciones) |
| `archivo-cloudflare/` | El archivo permanente: el Worker que sirve desde R2 las notas que salieron del sitio (`worker.mjs`), sus rutas (`ruta.mjs`) y la comprobación (`verificar.mjs`) | `archivo-staging.yml`, `archivo-produccion.yml` | No: listo, sin activar |

## `motor/` — el motor nuevo, sin tocar producción (15/10/2026)

| Archivo | Qué hace | ¿En uso? |
|---|---|---|
| `esquema.sql` | El esquema de la base del motor nuevo (SQLite local, el mismo que iría a D1); sale de `docs/etapa-10-operacion/DISENO-MOTOR.md` | No |
| `importar.mjs` | Lee `web/data/*.json` y lo vuelca a una base SQLite local (sólo lee el repositorio); `pruebas/motor-espejo.test.mjs` controla que la copia sea fiel | A mano |
| `README.md` | Cómo se usa | — |

## `ingesta/` — el motor, sin dependencias

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `agenda.mjs` | La agenda del municipio (su API de eventos), las fiestas del calendario anual, la base de contactos y el mensaje para pedir fechas | `web/scripts/generar-datos.mjs` | Sí |
| `alertas.mjs` | Los avisos de clima (helada, granizo, viento, lluvia) y sus `UMBRALES` | `generar-datos.mjs`, `redes/piezas.mjs` | Sí |
| `articulo.mjs` | Baja la página de la nota original y saca su texto (sin menús, pies ni necrológicas); `decodificar` traduce entidades HTML | `reels/reescritura.mjs`, `ingesta.mjs` | Sí |
| `auditar.mjs` | Muestra qué decide el filtro sobre las notas de hoy y con qué palabra | `npm run auditar` | A mano |
| `auditar-fotos.mjs` | Qué notas tienen foto y, de las que no, por qué (no gasta cupo) | `npm run auditar-fotos`; la pestaña Fotos del panel y `fotos-notas.mjs` usan sus motivos | A mano |
| `auditar-fuentes.mjs` | Cuánto aporta cada medio según lo ya publicado, sin red (sin aporte, dormida, redundante) | A mano | A mano |
| `auditoria-ia.mjs` | La auditoría con IA de lo ya publicado: qué lee, qué busca y qué ortografía chica corrige sola (`cambioMecanico`, regla 98) | `redes/auditar-notas.mjs` ("Auditoría IA") | Sí |
| `busqueda.mjs` | Búsqueda en internet con el texto de las páginas (Tavily), para hacer la nota de una pista | `panel/nota-de-pista.mjs` | Sí |
| `contactos-agenda.json` | Las instituciones a las que se les piden fechas, con sus canales oficiales | `agenda.mjs` | Sí |
| `criterio.mjs` | Los números del criterio editorial (largos, topes, medios, cupos, horas, Facebook, podcasts, contrato, nota del dólar) | Casi todo el código; `pruebas/criterio.test.mjs` lo compara con `CRITERIO-EDITORIAL.md` | Sí |
| `cruce.mjs` | Junta las notas que cuentan el mismo hecho (TF-IDF, 0,42), el cruce coherente que parte lo encadenado (`CRUCE_COHERENTE`, regla 184) y la memoria de 36 horas | `ingesta.mjs` | Sí |
| `datos-vivos.mjs` | De dónde se leen los datos que cambian solos o toca una persona (feriados, efemérides, decisiones) | `redes/efemeride.mjs`, `redes/feriado.mjs` | Sí |
| `efemerides.mjs`, `efemerides-propuesta.mjs`, `efemerides-curadas.json` | "Un día como hoy": candidatas y puntaje, la propuesta automática de cada día y las fechas patrias y de Balcarce verificadas | `generar-efemerides.mjs`, `ingesta.mjs`, el panel (pestaña Fechas), `reels/` | Sí |
| `estadistica-diaria.mjs` | Cuántas notas se publicaron hoy y por sección (`web/data/notas-por-dia.json`) | `generar-datos.mjs`, `redes/avisos.mjs`, `redes/informe-diario.mjs` | Sí |
| `exenciones.mjs` | Las pocas frases que no frenan el amarillo ("El Niño" del clima, el sorteo de un fixture, el título con un argentino; regla 172) | `ingesta.mjs` | Sí |
| `f1.mjs`, `futbol.mjs` | Las notas propias de Fórmula 1 (Jolpica) y de fútbol (ESPN) | `generar-datos.mjs` | Sí |
| `fotos.mjs` | Candidatas de foto, comparación con Gemini o Groq, la red de seguridad contra la marca de agua, Wikimedia y el crédito | `web/scripts/fotos-notas.mjs` | Sí |
| `fotos-menores.mjs` | La excepción de las reglas 186 y 211: la foto propia de una fuente de Balcarce (medio de acá u organismo) con chicos en una actividad deportiva, escolar o cultural, con todas sus condiciones (`menorEnActividadOficial`) y el interruptor `FOTOS_MENORES_OFICIALES` | `fotos.mjs`, `web/scripts/fotos-notas.mjs` | Sí (con el interruptor apagado no deja pasar nada) |
| `fuentes-cruce.mjs` | Las fuentes del cruce de medios, una por línea | `ingesta.mjs`, `lectura-ia.mjs`, `listar-fuentes.mjs` | Sí |
| `fuentes.mjs` | Las fuentes de siempre y todas las listas de palabras: sección, semáforo, local, localidades dudosas, zona, figuras, filtro de entrada, temas; `fichaDeFuente` | `ingesta.mjs`, `lectura-ia.mjs`, `reels/reescritura.mjs`, `generar-datos.mjs` y más | Sí |
| `fuentes-para-la-ia.mjs` | La entrada ampliada de la redacción (regla 174): qué textos completos van a la IA, en qué orden, cuáles son copia, y la limpieza del texto bajado | `reels/reescritura.mjs` | Sí |
| `generar-efemerides.mjs` | Arma la base mensual de "Un día como hoy" y las piezas de los feriados (Wikipedia y la API de feriados) | A mano, una vez por mes (el vigilante avisa cuando se acaba) | A mano |
| `huellas-significado.mjs` | La huella de significado de lo de acá (regla 195): elige qué parejas de notas de Balcarce de 72 horas preguntarle a la IA si son la misma noticia contada con otras palabras (`anclasConfirmadas`) | `generar-datos.mjs` | Sí |
| `ingesta.mjs` | `ingestar()`: baja, lee, filtra, marca, cruza (`armarHistorias`), clasifica, puntúa, semáforo, medios, cupos, clima y farmacias. Corrido solo, deja `ingesta/salida/` | `generar-datos.mjs`; `npm run ingesta` | Sí |
| `json.mjs` | Leer un JSON sin que un archivo faltante o roto tire abajo el proceso | `generar-datos.mjs`, `panel/`, varios de `redes/` y `web/scripts/` | Sí |
| `lectura-ia.mjs` | La lectura con IA: fichas, qué saca, secciones, dos llaves, repetidas; Gemini con Groq de respaldo | `generar-datos.mjs` (nube) | Sí |
| `listar-fuentes.mjs` | Escribe `FUENTES.md` desde las dos listas de fuentes | `node ingesta/listar-fuentes.mjs` | A mano |
| `medir-fuentes.mjs` | Mide cada fuente con el archivo y prueba cada feed en vivo (rediseño, etapa 1); sólo lee | A mano | A mano |
| `menores.mjs` | Una persona menor de 18 dicha por su edad ("una chica de 16 años") | `ingesta.mjs`, `pistas.mjs` | Sí |
| `muy-contada.mjs` | "Muy contada" (regla 197): lo de afuera que cuentan 8 medios o más (o 5 en sus primeras 3 horas) sale aunque el cupo esté lleno; los números, en `MUY_CONTADA` de `criterio.mjs` | `ingesta.mjs` | Sí |
| `no-es-nota.mjs` | Lo que publica un medio de Balcarce y no es una nota de Radar (regla 199): el medio hablando de sí mismo, el anuncio de su propia entrevista, su clima o su farmacia (`porQueNoEsNota`) | `ingesta.mjs` | Sí |
| `perfil-balcarce.md` | Lo que la IA de lectura sabe de Balcarce (sólo datos seguros) | La IA lo lee (vía `lectura-ia.mjs`) | Sí |
| `pistas.mjs` | Las pistas del panel: investiga si un dato ya lo cubrieron los medios (Google Noticias) | `panel/celular.mjs`, `panel/revisar-pistas.mjs` | Sí |
| `prompt-editorial.mjs` | Lee la instrucción de la IA de `CRITERIO-EDITORIAL.md` § 12, entre sus marcas; sin ella, la reescritura no arranca | `reels/reescritura.mjs` | Sí |
| `README.md` | Cómo está armada la carpeta | Personas | — |
| `repetidas-publicadas.mjs` | La misma noticia contra lo ya publicado, sin IA (regla 171), la misma fuente (`mismaFuente`, regla 175) y `enlaceNormalizado` | `generar-datos.mjs`, `ingesta.mjs`, `cruce.mjs` | Sí |
| `popularidad.mjs` | La popularidad de lo de afuera, sin cupos (regla 215): `minimoNacional`, `minimoAreasChicas` (las variables de GitHub), `mediosMinimos`, `popularidadDe`, `controlDeCalidad` | `ingesta.mjs`, `lectura-ia.mjs`, `generar-datos.mjs`, `auditar-fuentes.mjs` | Sí |
| `secciones-nuevas.mjs` | El mapa de 17 secciones (`seccionNueva`); activas desde el 17/10 Educación, Salud y Ciencia (regla 215: `SECCIONES_SUMADAS`, `seccionSumada`; el interruptor `SECCIONES_NUEVAS` se sacó) y Tecnología se lee «Tecnología e IA» | `ingesta.mjs`, `lectura-ia.mjs`, `generar-datos.mjs`, `web/lib/datos.js`, `secciones-nuevas-sombra.mjs`, `scripts/medir/informe-del-dia.mjs` | Sí |
| `secciones-nuevas-sombra.mjs` | Cómo quedarían repartidas las notas reales ya publicadas con el mapa nuevo de secciones; sólo lee y muestra, sin red ni IA | A mano | A mano |
| `utiles.mjs` | Los teléfonos útiles (`NUMEROS`), la farmacia de turno que cambia a las 8:30 (`diaDeTurno`), qué día tocan los útiles y qué decisión es de una persona (`decisionHumana`) | `ingesta.mjs`, `generar-datos.mjs`, `panel/`, `redes/`, `reels/` | Sí |
| `verificar.mjs` | El verificador de lo que escribe la IA, los arreglos que no inventan (`arreglarEscritura`) y `diceEnVivo` | `reels/reescritura.mjs`, `panel/`, `generar-datos.mjs` | Sí |
| `zona.mjs` | La hora de Balcarce, la única del código (GitHub corre en UTC) | Casi todo lo que mira "hoy" | Sí |

## `reels/` — placas, voz, video y la reescritura (con dependencias)

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `armadas.mjs` | Las piezas ya armadas hoy (regla 208): el video queda en la memoria de voces (`VOZ_CACHE`) hasta que termina el día y un reintento lo sube sin gastar otro audio | `plan.mjs` | Sí |
| `cupo-voz.mjs` | El contador de los 10 audios del día (regla 208): anota cada pedido antes de hacerlo, guarda audios para las piezas más importantes que faltan y avisa al 80 % | `voz-gemini.mjs`, `plan.mjs` | Sí |
| `alinear.mjs`, `tiempos.mjs` | Cuándo arranca cada palabra: los silencios del audio (ffmpeg) y el reparto del tiempo según las sílabas | `voz-gemini.mjs`, `alinear.mjs` | Sí |
| `auditar-voz.mjs` | La auditoría de voz: clips de prueba, transcripción y juicio | `auditar-voz.yml` | A mano |
| `avatar.mjs`, `portada.mjs` | Dibujan la foto de perfil de las redes y la portada de la página de Facebook (las sube una persona) | A mano | A mano |
| `claves.mjs` | Las cuatro claves de IA (redacción, redes, clasificación, Groq), del entorno o del `.env`, y el modelo de texto | Reescritura, lectura, fotos, voz, panel, `generar-datos.mjs` | Sí |
| `comparar-instruccion.mjs` | Compara versiones de las reglas de la IA con notas reales y el verificador de producción (gasta cupo) | A mano | A mano |
| `crear-voces.mjs` | Crea, lista y borra las voces propias (Voice Design de Gemini 3.8) | `crear-voces.yml` | A mano |
| `duracion.mjs` | Mide un video y recorta la historia que pasa de 58 segundos | `reel.mjs` | Sí |
| `placa.mjs` | Dibuja las placas (SVG → PNG de 1080 × 1920) | `plan.mjs`, `reel.mjs` | Sí |
| `plan.mjs` | El plan del día: qué pieza, con qué guion, placa y hora; con `--generar`, arma los videos. Lee lo publicado (`web/data/portada.json`, `agenda.json`) | `redes.yml`, `piezas.yml` | Sí |
| `reel.mjs` | Arma un video: placa, voz (sólo Gemini), subtítulos, ffmpeg | `plan.mjs` | Sí |
| `reescritura.mjs` | La reescritura con IA de punta a punta: orden, topes, texto completo, pedido, verificación, partes internas, nivel de verificación, semáforo sobre lo escrito | `generar-datos.mjs` (nube), `panel/reescribir-una.mjs` | Sí |
| `voz-gemini.mjs` | La voz de Gemini 3.8 (Interactions API, clave de redes): texto literal, estilo aparte, la voz propia de cada pieza; corta si se acabó el cupo del día | `reel.mjs`, `auditar-voz.mjs` | Sí |
| `voz.mjs` | `paraLeer` (los símbolos dichos en voz alta) y `enCarteles` (los subtítulos de 3 a 5 palabras) | `reel.mjs`, `auditar-voz.mjs` | Sí |
| `animacion.mjs`, `render-cuadros.mjs` | La animación de las piezas (8/10: ninguna queda con la imagen fija), cuadro a cuadro, repartida entre los núcleos | `reel.mjs` | Sí |
| `escenas/` (`comun`, `del-plan`, `clima`, `fechas`, `servicios`, `repaso`, `deportes`) | Las escenas animadas de cada pieza; `del-plan.mjs` pasa los datos reales del plan a su escena (si falla, sale la placa de siempre). `repaso.mjs` (regla 209): el repaso sigue a la voz, con la foto y el titular de cada nota. Las de deportes, para más adelante | `plan.mjs`, `reel.mjs` | Sí (deportes, no) |
| `fijas.mjs`, `fijas/` | Piezas armadas de antemano con su voz, que se reutilizan (los videos de "participá" y su `vigencia.json`) | `plan.mjs`, `fijar-piezas.yml` | Sí |
| `placas-efemeride.mjs`, `previa-efemerides.mjs` | Las dos placas de "Un día como hoy" y su vista previa sin voz | `plan.mjs`; a mano | Sí |
| `catalogo-plantillas.mjs`, `ejemplos-plantillas.mjs` | El catálogo y los ejemplos de las plantillas animadas, para mirar y aprobar (sin gastar voz) | A mano | A mano |
| `marca/fuentes/*.ttf` (6) | Source Serif 4 (700 y 900) e Inter (400 a 700): las placas, el avatar, la portada y las tarjetas de la web | `placa.mjs`, `avatar.mjs`, `portada.mjs`, `web/lib/tarjeta.js` | Sí |

## `redes/` — Facebook, Instagram, la vigilancia y los informes, sin dependencias

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `auditar-redes.mjs` | Compara el contrato y el libro con lo que Meta tiene publicado | `auditoria.yml`, `vigilar.mjs` (el cierre de las 23:30) | Sí |
| `auditar.mjs` | La auditoría semanal de lo publicado; guarda `web/data/auditoria.json` | `auditoria.yml`; `vigilar.mjs` usa `auditoriaVencida` | Sí |
| `auditoria-voz.mjs` | La parte pura de la auditoría de voz (qué clips y cómo se juzgan) | `reels/auditar-voz.mjs` | A mano |
| `avisos.mjs` | Lo que dicen los avisos y cómo entra en un mensaje; `pendientesDeLaIngesta` | `vigilar.mjs`, `generar-datos.mjs` | Sí |
| `contrato.mjs` | El contrato del día y el estado de cada pieza | `vigilar.mjs`, `avisos.mjs`, `auditar-redes.mjs` | Sí |
| `datos.mjs` | Traduce `web/data/portada.json` a los datos que espera el plan | `reels/plan.mjs` | Sí |
| `elegir.mjs` | Qué se publica: reglas de Facebook (`vaAFacebookPorLoQueEs`: lo aprobado por una persona va sólo si lo marcó), texto del posteo, podcasts, `esParaLasRedes`, el interruptor (`estaActivo`) | `publicar.mjs`, `reloj.mjs`, `reels/plan.mjs`, `contrato.mjs` y más | Sí |
| `espejo.mjs` | Qué espejos de Instagram reintentar | `publicar.mjs` | Sí |
| `estadisticas.mjs` | Visitas (Cloudflare) y seguidores (Meta) | `vigilar.mjs` | Sí |
| `formatos.mjs` | Las medidas de cada red, con fecha de verificación | `auditar.mjs`, pruebas | Sí |
| `guiones.mjs` | Lo que dice la voz en cada pieza (bancos de frases) y `revisarTexto` | `reels/plan.mjs`, `elegir.mjs`, `reels/reescritura.mjs` | Sí |
| `horarios.mjs` | El horario de las redes: los horarios de las historias fijas (`HISTORIAS_FIJAS`, `horariosDe`) y `toca` (qué día sale cada una). Hasta el 17/10 estaba en `panel/` | `piezas.mjs`, `cronograma-semana.mjs`, `reels/plan.mjs` | Sí |
| `meta.mjs` | Habla con Meta (Graph v23.0): posteo, foto, video, dirección pública, verificación; `PAGINA_DE_FACEBOOK`, el único identificador de la página | `publicar.mjs`, `auditar-redes.mjs`, `estadisticas.mjs`, `ver-facebook.mjs` | Sí |
| `piezas.mjs` | Cronograma, ventanas, podcasts, aviso de clima, color del día, techo de historias | `reloj.mjs`, `publicar-piezas.mjs`, `reels/plan.mjs`, `contrato.mjs`, `vigilar.mjs` | Sí |
| `prompt-redes.mjs` | Lee la identidad, las dos voces, el reparto de voces por pieza y el estilo de `CRITERIO-REDES.md` | `guiones.mjs`, `elegir.mjs`, `reels/plan.mjs`, `reels/reel.mjs`, `reels/voz-gemini.mjs` | Sí |
| `publicar-piezas.mjs` | Sube los videos (Instagram manda, Facebook con reintentos, la historia de cada reel) y completa direcciones | `publicar.mjs` | Sí |
| `publicar.mjs` | El programa de publicar: `--verificar`, `--facebook`, `--piezas`, `--enlaces` | `redes.yml`, `piezas.yml` | Sí |
| `reloj.mjs` | ¿Toca alguna pieza ahora? (con el interruptor apagado, no) | `redes.yml` | Sí |
| `ver-facebook.mjs` | Lista lo publicado de verdad en la página | `ver-facebook.yml` | A mano |
| `vigilar.mjs` | El vigilante: revisa y avisa (por mail, con `avisar-por-mail.mjs`; el WhatsApp de respaldo); las claves de IA y las voces (`revisarClaves`); cierre de las 23:30. El resumen de las 21 lo reemplazó el informe diario | `vigilancia.yml` | Sí |
| `whatsapp.mjs` | Manda el WhatsApp por CallMeBot sin mostrar la clave (desde el 15/10, sólo respaldo del mail) | `vigilar.mjs`, `avisos.mjs`, `auditar.mjs`, `estadisticas.mjs` | Sí (respaldo) |
| `archivar-piezas.mjs` | Guarda en R2 lo que se armó para las redes (videos, audios, subtítulos, placas), sin poder frenar la publicación; prendido con `R2_PIEZAS` (regla 178) | `redes.yml`, `piezas.yml`, `fijar-piezas.yml` | Sí |
| `auditar-notas.mjs` | "Auditoría IA": lee las notas nuevas y avisa lo que esté mal (`ingesta/auditoria-ia.mjs`) | `auditoria-ia.yml` | Sí |
| `avisar-por-mail.mjs` | Los avisos de GitHub salen por mail, por el vigilante de Cloudflare (`POST /avisar`, regla 173) | `vigilar.mjs`, `actualizar.yml`, `cloudflare-deploy.yml` (a mano), `informe-diario.mjs` y más | Sí |
| `cronograma-semana.mjs` | El cronograma de las redes de varios días, como lo arma el reloj | `informe-diario.mjs`; `node redes/cronograma-semana.mjs` | Sí |
| `efemeride.mjs`, `feriado.mjs`, `participa.mjs` | Las piezas de "Un día como hoy", del feriado y de "participá" | `reels/plan.mjs`, `horarios.mjs` | Sí |
| `estadisticas-detalle.mjs`, `estadisticas-piezas.mjs` | El detalle diario de las visitas (horas, notas, de dónde llegan, aparatos, países) y los números de cada pieza de redes | `vigilar.mjs`, `estadisticas.mjs`, `informe-diario.mjs` | Sí |
| `indexnow.mjs` | Le avisa a Bing (IndexNow) qué notas nuevas hay después de cada despliegue | `actualizar.yml` (y `cloudflare-deploy.yml`, a mano) | Sí |
| `informe-diario.mjs` | El informe diario por mail, a las 8:15 y a las 21:15 (regla 176) | `informe-diario.yml` | Sí |
| `previa.mjs`, `repasos.mjs` | Lo que va a salir hoy en las redes (para el panel) y qué notas cuenta cada repaso | `generar-datos.mjs`, `reels/plan.mjs` | Sí |
| `reintentar.mjs` | Reintenta una parte de una pieza que no salió, con el video ya armado | `reintentar.yml` | Sí |
| `reparar-estadisticas.mjs` | Rehace los días de `estadisticas.json` guardados con ceros falsos (regla 168) | `reparar-estadisticas.yml` | A mano |
| `uso-ia.mjs` | Cuánta IA se usa por día: llamadas y tokens por tarea y por modelo (`web/data/uso-ia.json`) | `reels/reescritura.mjs` y más | Sí |
| `probar-gemini.mjs` | Prueba a mano de las claves de Gemini (las de imágenes, `probar-flux.mjs` y `probar-imagen-nota.mjs`, se borraron el 17/10/2026) | `probar-gemini.yml` | A mano |

## `panel/` — el panel del celular, sin dependencias (`docs/09-PANEL.md`)

El panel del celular vive en dos lados: la app, en `web/public/panel/` (más
abajo), y lo que corre en GitHub, acá. El panel de la PC (puerto 4321) se retiró
el 17/10/2026: nunca se usó; queda en el historial de git.

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `celular-datos.mjs` | Lo que decide el celular y lo que necesita para decidir: valida sus decisiones, arma lo que espera a una persona (`paraDecidir`) y las notas para escribir (`notasParaEscribir`) | `generar-datos.mjs`, `celular.mjs` | Sí |
| `celular.mjs` | El pedido a la IA desde el celular: busca la nota, la escribe con `reescribir-una.mjs` y deja el borrador cifrado en `web/data/celular-borradores.json` | "Panel del celular" (`panel.yml`) | Sí |
| `cifrado.mjs` | El sobre cifrado (AES-256-GCM y RSA-OAEP): cierra para cada celular registrado lo que espera a una persona y los borradores. El otro lado es `web/public/panel/cifrado.js` | `generar-datos.mjs`, `celular.mjs` | Sí |
| `reescribir-una.mjs` | Escribe una nota a pedido de una persona por el mismo camino que la automática, pero devuelve lo que no cuadra en vez de descartarlo | `celular.mjs` | Sí |
| `nota-de-pista.mjs` | "Hacer la nota" de una pista: busca las notas de los medios con su texto (`ingesta/busqueda.mjs`) y escribe una nota propia | `celular.mjs`, `pistas-solas.mjs` | Sí |
| `pistas-libro.mjs` | El libro de pistas abiertas (`web/data/pistas.json`): funciones puras | `celular.mjs`, `revisar-pistas.mjs`, `pistas.yml` | Sí |
| `pistas-solas.mjs` | Una pista que ya cubren tres medios o más se escribe sola y, si el verificador no objeta, queda lista | `revisar-pistas.mjs` | Sí |
| `revisar-pistas.mjs` | Vuelve a mirar las pistas abiertas | `pistas.yml` (cada 3 h) | Sí |
| `unir-conflictos.mjs` | Cuando dos corridas tocan el mismo archivo de pistas, une cambio por cambio en vez de pisar | `panel.yml`, `pistas.yml` | Sí |

## `scripts/medir/` — medir el motor con datos reales (a mano)

Nada de esto corre solo ni escribe en `web/data/`: lo corre una persona para
medir o calibrar. Hasta el 17/10 estaban en `docs/flujo/` y `docs/etapa-2-5/`; los tres programas de la revisión de fuentes
vivían en `docs/etapa-1-fuentes/` y pasaron acá el 24/10 (regla 311: `docs/` no tiene programas).

| Archivo | Qué hace | ¿Gasta cupo? |
|---|---|---|
| `informe-del-dia.mjs` | El informe del día: cómo llegó la información, cómo anduvo cada fuente, lo de Balcarce y lo nacional, las secciones; escribe `docs/flujos/INFORME-DE-HOY.html` y guarda la lectura en `.cache/` | No (sin IA) |
| `cruce-coherente.mjs` | Compara el cruce coherente (regla 184) con el de antes sobre la misma lectura guardada (`docs/flujos/CRUCE-COHERENTE.md`) | No |
| `repetidas-2-0.mjs` | Mide las repetidas por significado (regla 195) sobre lo de acá ya publicado (`docs/flujos/REPETIDAS-2-0.md`) | Sí, cupo gratis de clasificación |
| `calibrar-repetidas.mjs`, `etiquetas-duplicadas.json` | Calibra la comparación sin IA de repetidas (regla 171) contra 127 pares etiquetados a mano (el `.json`) | No |
| `generar-revision.mjs`, `afinar.mjs`, `balcarce-fondo.mjs` | La revisión de fuentes: rehacen `docs/etapa-1-fuentes/REVISION-FUENTES.html` y `BALCARCE-INVESTIGACION.md` (`afinar` y `balcarce-fondo` son sus datos; `informe-del-dia.mjs` también importa los dos primeros) | No |

## `web/` — el sitio (`docs/06-WEB.md`)

### Configuración

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `web/README.md` | Cómo correr la web en la PC; remite a `docs/06-WEB.md` | Personas | — |
| `web/.gitignore` | Que no se suba ningún `.env` de la web | git | Sí |
| `web/package.json` | Next 15 y React 18, `"type": "module"`; scripts `datos`, `dev`, `dolar`, `redirects`, `redirects-paginas`, `build`, `indexar`, `contar`, `vista-previa-secciones` (el `build` corre `dolar`, `redirects`, `next build`, `redirects-paginas`, `indexar` y `contar`) | `npm` en `actualizar.yml` y `cloudflare-deploy.yml` | Sí |
| `web/package-lock.json` | Las versiones exactas | `npm ci` | Sí |
| `web/next.config.mjs` | Exportar el sitio como archivos (`output: 'export'`) | `next build` | Sí |
| `web/jsconfig.json` | El atajo `@/` para importar desde la raíz de `web/` | Next | Sí |

### `web/app/` — las páginas (todas se generan al compilar)

| Archivo | Qué hace | ¿En uso? |
|---|---|---|
| `layout.js` | Lo que está en todas las páginas: franja de arriba, logo, buscador, menú, pie y las letras | Sí |
| `globals.css` | Todos los estilos, los colores por sección (`--s-*`) y el sistema tipográfico (`--t-*`) | Sí |
| `page.js` | La tapa | Sí |
| `not-found.js` | La 404, que rescata direcciones viejas de notas | Sí |
| `opengraph-image.js` | La tarjeta del sitio para compartir | Sí |
| `nota/[id]/page.js` | La página de cada nota (foto del banco si hay, "Fuentes (N)", firma, "Seguí leyendo") | Sí |
| `nota/[id]/opengraph-image/route.js` | La tarjeta apaisada (1200 × 630) de las notas de la portada y las que fueron a las redes; las demás declaran la del sitio | Sí |
| `nota/[id]/instagram.png/route.js` | La tarjeta vertical del espejo (1080 × 1350) | Sí |
| `nota/indice.json/route.js` | El índice de identificadores para el rescate de la 404 | Sí |
| `seccion/[ranura]/page.js`, `seccion/[ranura]/opengraph-image.js` | Cada sección (las postales de arriba y después de a 10 notas por página) y su tarjeta | Sí |
| `seccion/[ranura]/feed.xml/route.js` | El RSS de cada sección | Sí |
| `tema/[ranura]/page.js`, `tema/[ranura]/opengraph-image.js` | Cada tema y su tarjeta; nada las enlaza (`MOSTRAR_TEMAS = false`) | Sin enlaces |
| `agenda/page.js` | La agenda | Sí |
| `agenda/[id]/page.js`, `agenda/[id]/opengraph-image.js`, `agenda/[id]/evento.ics/route.js` | La ficha de cada evento, su tarjeta y el archivo para agendarlo | Sí |
| `clima/page.js`, `farmacias/page.js`, `dolar/page.js`, `util/page.js` | Los servicios: el clima ahora y los próximos días, la farmacia de turno y la semana, todos los tipos de dólar (consultados en el navegador), los teléfonos útiles | Sí |
| `quienes-somos/page.js`, `contacto/page.js`, `politica-de-privacidad/page.js` | Las páginas fijas | Sí |
| `compartir/page.js` | La página para invitar a los amigos: mensajes para copiar y el video para bajar | Sí |
| `tablas/page.js`, `tablas/liga-profesional/page.js`, `tablas/formula-1/page.js` | Las tablas fijas: posiciones de la Liga y campeonato de F1 | Sí |
| `feed.xml/route.js`, `sitemap.js`, `sitemap-news.xml/route.js`, `robots.txt/route.js`, `llms.txt/route.js` | Para lectores de feeds, buscadores y sistemas de IA (`robots.txt` es una ruta desde el 15/10: el texto lo arma `web/lib/robots.js`; antes era `robots.js`) | Sí |
| `agentes/ultimas.json/route.js`, `agentes/indice.json/route.js`, `agentes/servicios.json/route.js` | Los datos para agentes: JSON públicos para programas, sin el cuerpo de las notas (`web/lib/para-agentes.js`, regla 177) | Sí |

### `web/components/` — las piezas de la interfaz

| Archivo | Qué hace | Quién lo usa | ¿En uso? |
|---|---|---|---|
| `avisos.js` | Los tres espacios publicitarios | `layout.js`, `page.js` | Sí |
| `buscador.js` | El buscador (entre las notas vigentes, sin consultar nada) | `layout.js` | Sí |
| `clima-vivo.js`, `dolar-vivo.js`, `usar-dolar.js`, `horas-vivas.js` | Lo que se actualiza en el navegador: el clima, las tarjetas de `/dolar` (el dólar se pide cada 5 minutos) y el "hace X" de cada minuto | `layout.js`, `clima/page.js`, `dolar/page.js`, `hoy-balcarce.js` | Sí |
| `compartir.js` | Los botones de compartir | Páginas de nota y de evento | Sí |
| `ficha.js` | Los datos estructurados para Google y las migas | `layout.js`, notas, secciones, temas, eventos | Sí |
| `hoy-balcarce.js` | "Hoy en Balcarce": el panel de la portada con tres pestañas (clima, farmacias, dólar) | `page.js` | Sí |
| `metadatos.js` | Título, descripción, canónico, la firma (`firmaCorta`, `quienEscribio`) y el autor | Casi todas las páginas | Sí |
| `navegacion.js` | El menú de secciones | `layout.js` | Sí |
| `piezas.js` | Piezas repetidas: fila de nota, hora, farmacia, evento, cierre, buzón | Casi todas las páginas | Sí |
| `verificacion.js` | El desplegable "Fuentes (N)" con la firma | Notas y eventos | Sí |
| `postales.js` | Las "postales": las cinco notas de arriba de la portada y de cada sección, como fotos con borde blanco | `page.js`, secciones | Sí |
| `imagen-destacada.js` | La imagen de la nota destacada de una sección o de un tema | Secciones, temas | Sí |
| `futbol.js`, `tablas.js` | La maqueta de las notas de fútbol (partidos, resultados, tablas con escudos) y las tablas fijas de `/tablas/` | `nota/[id]/page.js`, páginas de tablas | Sí |
| `invitar.js` | La página `/compartir`: botones para copiar cada mensaje y bajar el video | `compartir/page.js` | Sí |

### `web/lib/` — la lógica compartida

| Archivo | Qué hace | Quién lo usa | ¿En uso? |
|---|---|---|---|
| `archivo.js` | Qué se muestra (36 h), qué tiene página (180 días, con tope de 3.700 notas: `MAXIMO_EN_ARCHIVO`, `topeDeNotas`), llega tarde, fecha de la nota, retiradas, correcciones, `pierdeLaPagina`, la dirección fija, `aligerarViejas` | `generar-datos.mjs`, `datos.js` | Sí |
| `revision-archivo.js` | Lo que los demás leen de la revisión del archivo (regla 212): lo retirado, las repetidas, lo que espera su ilustración | `generar-datos.mjs`, `ilustrar-notas.mjs`, `revisar-archivo.mjs` | Sí |
| `clima.js`, `pedir-clima.js` | Qué dibujo le toca a cada cielo; el pedido del clima en el navegador (Open-Meteo, un solo pedido por página) | `clima-vivo.js`, `hoy-balcarce.js` | Sí |
| `cuerpo.js` | `tieneCuerpo` (70 palabras), `tieneRespaldo`, `esperaCuerpo` | `generar-datos.mjs`, `datos.js`, `sitemap.js`, redes, panel, reescritura | Sí |
| `datos.js` | La puerta de entrada a los datos para todas las páginas: secciones, tapa, horas, contacto (`WHATSAPP`, `MAIL`) | Todas las páginas | Sí |
| `dolar.js` | Pedir y leer el dólar, textos de "actualizado" | `/dolar`, "Hoy en Balcarce", `foto-dolar.mjs`, `generar-datos.mjs`, `notas-propias.js` | Sí |
| `enlaces-en-texto.js` | Los enlaces adentro del cuerpo de las notas propias | `nota/[id]/page.js` | Sí |
| `eventos.js` | Los eventos con página | `generar-datos.mjs`, `datos.js`, páginas de agenda | Sí |
| `farmacias.js` | El enlace `tel:` de cada farmacia | `farmacias/page.js`, `piezas.js` | Sí |
| `fuentes-de-la-nota.js` | Qué fuentes ve el lector | `verificacion.js`, `ficha.js` | Sí |
| `notas-propias.js` | La nota del dólar, los repasos de los podcasts, la del clima y la de "Un día como hoy" | `generar-datos.mjs` | Sí |
| `paginas.js` | Partir una sección en páginas: las postales más 10 en la primera, 10 en las demás (`POR_PAGINA`) | Páginas de sección, `sitemap.js` | Sí |
| `datos-estructurados.js`, `dimensiones-foto.js` | Las piezas del JSON-LD de cada página (regla 177) y el tamaño real de cada foto del banco | `components/ficha.js` | Sí |
| `para-agentes.js` | Los datos para agentes (`/agentes/*.json`) | Las rutas de `agentes/` | Sí |
| `robots.js` | El texto de `robots.txt`: todo permitido menos `/panel/`, con los bots de IA nombrados | `robots.txt/route.js` | Sí |
| `rss.js`, `rss-disco.js` | El RSS general y por sección, con el texto completo y la foto; `rss-disco.js` sólo lee cuánto pesa cada foto | Las rutas `feed.xml` | Sí |
| `fondos-clima.js` | La ilustración fija de la nota del clima según el tiempo del día (regla 181) | `generar-datos.mjs`, `notas-propias.js` | Sí |
| `fotos.js` | De dónde se sirven las fotos de las notas (hoy, del sitio; preparado para R2) | Páginas de nota, postales, sitemap, RSS | Sí |
| `notas-de-pistas.js` | Las notas propias que nacen de una pista | `generar-datos.mjs` | Sí |
| `tablas.js`, `escudos.js`, `equipos-f1.js` | Los datos de las tablas fijas, el escudo de cada club guardado y el color de cada equipo de F1 | Las páginas de `tablas/`; `components/futbol.js`, `components/tablas.js` | Sí |
| `repetidas.js` | La misma noticia con otra dirección: cuál queda y adónde redirige la otra (`repetidasConOtraDireccion`, `conFusionadas`) | `generar-datos.mjs`, `generar-redirects.mjs` | Sí |
| `ruta.js` | La dirección de cada nota y el rescate de la 404 | `archivo.js`, `datos.js`, páginas de nota, redes, `generar-redirects.mjs` | Sí |
| `seguir-leyendo.js` | "Seguí leyendo" | `nota/[id]/page.js` | Sí |
| `sitio.js` | La dirección del sitio (`SITIO`), si es el dominio propio, `MOSTRAR_TEMAS` | Metadatos, sitemap, robots, feed | Sí |
| `tarjeta-diseno.js` | Las cuentas de las tarjetas y los interruptores `FOTO_EN_INSTAGRAM` y `FOTO_EN_ENLACE` (prendidos: el espejo y la tarjeta para compartir llevan la foto del banco si hay) | `tarjeta.js`, `instagram.png/route.js`, `redes/publicar.mjs` | Sí |
| `tarjeta.js` | Dibuja las tarjetas para compartir y la de Instagram, con las letras de `reels/marca/fuentes/` | Las rutas `opengraph-image` e `instagram.png` | Sí |
| `texto.js` | Comparar textos, nombres, recortes, repetidas por titular (`sinNotasRepetidas`) | Casi todo, también `ingesta/` | Sí |
| `tiempo.js` | "Hace cuánto" | `datos.js`, `horas-vivas.js` | Sí |
| `titulos.js` | Los arreglos mecánicos del título (`tituloAutomatico`, `sinBalcarceAlFinal`) | `generar-datos.mjs`, `ingesta/verificar.mjs` | Sí |

### `web/scripts/` — los programas de la web

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `generar-datos.mjs` | Arma todos los datos de la web (el corazón de "Actualizar la web"). En la PC no hace nada salvo con `ARMAR_EN_LA_PC=1` (y entonces deja `web/data/` cambiado: no se sube) | `actualizar.yml`; `npm run datos` | Sí |
| `fotos-notas.mjs` | A qué notas probarles foto (nube) y poner las del banco (siempre) | `generar-datos.mjs` | Sí |
| `achicar-foto.mjs` | Pasa la foto elegida a JPEG de hasta 1.200 px, calidad 7; la achica a 1.024 px para mandarla a la IA y le calcula la huella (con el ffmpeg del proyecto) | `fotos-notas.mjs`, `ilustrar-notas.mjs` | Sí |
| `foto-dolar.mjs` | Guarda la foto del dólar en `web/data/dolar.json` | `npm run build` (script `dolar`) | Sí |
| `generar-redirects.mjs` | Escribe `web/public/_redirects` sin pasar nunca de 1.950 (regla 191): secciones viejas, repetidas unidas y `/nota/ID` sólo de antes del 25/09; con `--paginas`, las páginas de redirección de lo que no entró | `npm run build` (scripts `redirects` y `redirects-paginas`) | Sí |
| `recompilar.mjs` | ¿Entró a `main` algo que el sitio lee mientras se armaba? Entonces "Actualizar la web" recompila antes de subir (regla 189) | `actualizar.yml` | Sí |
| `revisar-seo.mjs` | Revisa el HTML compilado y frena la subida si falta algo | `actualizar.yml` | Sí |
| `auditar-seo-vivo.mjs` | Audita las páginas publicadas | `node web/scripts/auditar-seo-vivo.mjs [url]`; la auditoría semanal | A mano |
| `hacer-iconos.mjs` | Dibuja los íconos del sitio (usa resvg) | A mano, una vez | A mano |
| `indexar.mjs` | Arma el índice del buscador (Pagefind) sobre el sitio compilado: busca en todo el archivo | `npm run build` (script `indexar`) | Sí |
| `contar-archivos.mjs` | Cuenta los archivos del sitio compilado y avisa si se acerca a los 20.000 de Cloudflare (nunca frena) | `npm run build` (script `contar`) | Sí |
| `collage.mjs` | El collage de fotos de la nota de cada repaso | `generar-datos.mjs` | Sí |
| `foto-efemeride.mjs` | La foto de cada nota de "Un día como hoy" (la ilustración fija con el año y la fecha) | `generar-datos.mjs` | Sí |
| `foto-libre.mjs` | Fotos libres de Wikimedia Commons para las notas propias (F1, fútbol) | `generar-datos.mjs` | Sí |
| `foto-manual.mjs` | Suma a mano la foto de una nota (pestaña Fotos del panel) | `panel.yml` (`accion=foto`) | Sí |
| `escudos.mjs` | Baja una vez los escudos de los clubes (ESPN) a `web/public/escudos/` | A mano | A mano |
| `ilustrar-notas.mjs` | Las ilustraciones con IA para las notas sin foto: revisar, aplicar o automático (reglas 182 y 185); escribe `web/data/fotos-ia.json` | `ilustrar-notas.yml` | Sí |
| `revisar-archivo.mjs` | La revisión del archivo entero por tandas (regla 212): revisar, aplicar y simular; escribe `web/data/revision-archivo.json` | `revisar-archivo.yml` | Sí |
| `nombres-de-persona.mjs` | Los nombres de persona de un texto (el control del prompt de las ilustraciones) | `ilustrar-notas.mjs` | Sí |
| `archivar-a-r2.mjs` | El exportador del archivo permanente: sube a R2 las notas con página y saca lo retirado (regla 183) | `actualizar.yml` (cada vuelta, con `R2_ARCHIVO`), `cloudflare-deploy.yml` (a mano), `archivo-staging.yml`, `archivo-produccion.yml` | Sí (el Worker, todavía sin ruta) |
| `armado-vacio.mjs` | Prueba de humo: arma el sitio con datos vacíos o a medias | `armado-vacio.yml` | Sí |

### `web/data/` — los datos (detalle en `docs/06-WEB.md`)

| Archivo | Qué guarda | Quién lo escribe |
|---|---|---|
| `portada.json` | Lo que se muestra (36 h), clima, farmacia, pendientes | "Actualizar la web" |
| `archivo.json` | Lo que tiene página (180 días en teoría; en la práctica el tope de 3.700 notas, unos 80 días), una nota por renglón | "Actualizar la web" |
| `agenda.json` | Los eventos con página | "Actualizar la web" |
| `banco-fotos.json` | El banco de fotos | "Actualizar la web" |
| `dolar-historia.json` | La cotización de las 11 de cada día hábil (60 días) | "Actualizar la web" |
| `esperando-cuerpo.json` | Las notas que esperan cuerpo, con sus fuentes | "Actualizar la web" |
| `f1.json` | La Fórmula 1: calendario, resultado y campeonato de Jolpica, y cuándo salió cada nota (`ingesta/f1.mjs`) | "Actualizar la web" |
| `fichas.json` | Las fichas de la lectura con IA y los grupos de repetidas | "Actualizar la web" |
| `fusionadas.json` | Las repetidas con otra dirección y la nota a la que redirige cada una | "Actualizar la web" |
| `intentos-ia.json` | Cuántas veces se pidió cada nota a Gemini y por qué falló | "Actualizar la web" |
| `notas-por-dia.json` | La estadística diaria de notas por sección | "Actualizar la web" |
| `vistas.json` | La primera vez que se vio cada nota (7 días) | "Actualizar la web" |
| `celular-pendientes.json` | Lo que espera a una persona, **cifrado** para cada celular registrado | "Actualizar la web" |
| `celular-borradores.json` | Los textos que escribió la IA a pedido, **cifrados** | "Panel del celular" |
| `celular-decisiones.json` | Lo que decidió una persona desde el celular (aprobar, descartar, retirar) y lo marcado para las redes | El panel del celular |
| `celular-llaves.json` | La llave pública de cada celular registrado (la privada no sale del celular) | El panel del celular |
| `correcciones.json` | Lo corregido o escrito a mano, con motivo, cuándo y quién | El panel del celular, una persona o Claude |
| `retiradas.json` | Lo sacado a mano, con motivo, cuándo y quién | Una persona o Claude; los lunes "Actualizar la web" saca las de más de 7 días |
| `revision-archivo.json` | La revisión del archivo (regla 212): cuánto va, lo que retiró (no se poda), las repetidas, las fotos que sacó, lo que dejó para una persona (cifrado) | Sólo `revisar-archivo.yml` |
| `avisos.json` | Los tres espacios de publicidad que lee la web | Una persona, a mano |
| `redes.json` | El libro de las redes | "Redes" y "Piezas" |
| `vigilancia.json`, `estadisticas.json` | Lo que ya avisó el vigilante; visitas y seguidores | "Vigilancia" |
| `auditoria.json` | El resultado de la auditoría semanal | "Auditoría" |
| `historico/AAAA-MM.json` | Lo que salió del archivo por edad o por tope, por mes | "Actualizar la web" |
| `clima-historia.json`, `futbol.json`, `uso-ia.json` | El clima de cada día (para su nota), el fútbol de ESPN y cuánta IA se usó por día | "Actualizar la web" |
| `celular-estado.json` | El estado que lee el panel del celular | "Actualizar la web" |
| `fotos-ia.json` | Las ilustraciones con IA puestas a notas sin foto | Sólo "Ilustrar notas sin foto" |
| `fotos-manuales.json` | Las fotos sumadas a mano desde la pestaña Fotos | Sólo "Panel del celular" |
| `pistas.json`, `notas-de-pistas.json` | Las pistas abiertas y las notas propias que nacieron de una pista | El celular, "Pistas" y "Panel del celular" |
| `contactos-celular.json` | Los contactos del celular, **cifrados** | El panel del celular |
| `auditoria-ia.json`, `correcciones-auditoria.json` | Lo que marcó la auditoría con IA (**cifrado**) y la ortografía chica que corrigió sola | "Auditoría IA" |
| `efemerides-candidatas.json`, `efemerides-elegidas.json`, `efemerides-piezas.json`, `feriados-piezas.json` | "Un día como hoy" y los feriados: las candidatas del mes, las elegidas y lo que dice cada pieza | `generar-efemerides.mjs` y el panel (pestaña Fechas) |
| `estadisticas-piezas.json` | Los números de cada pieza de redes | "Vigilancia" |
| `agenda-suspendidos.json` | Los eventos suspendidos que el municipio sigue teniendo, para sacarlos de la agenda (regla 163) | Una persona o Claude |

No versionado: `dolar.json` (se escribe en cada build).

### `web/public/`

| Archivo | Qué es | ¿En uso? |
|---|---|---|
| `_headers` | Los encabezados de Cloudflare: seguridad, tipos de las tarjetas y del `.ics`, caché, y las reglas propias de `/panel/` | Sí |
| `manifest.webmanifest` | La ficha del sitio para instalarlo en el celular | Sí |
| `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | Los íconos del sitio (el radar en el rojo de marca; los dibuja `hacer-iconos.mjs`) | Sí |
| `fotos-notas/` | Las fotos elegidas por el banco, una por nota, las ilustraciones con IA (`<id>-ia.jpg`) y las fijas del clima y de las efemérides | Sí |
| `fuentes/` | Las letras del sitio (Inter y Source Serif 4, `.woff2`), servidas desde el propio sitio | Sí |
| `escudos/` | Los escudos de los clubes para las notas y tablas de fútbol | Sí |
| `compartir/` | Los videos de presentación (horizontal y vertical) para la página `/compartir` | Sí |
| `0776b1b2….txt` | La clave pública de IndexNow (`redes/indexnow.mjs`) | Sí |
| `panel/index.html` | La página del panel del celular (`radarbalcarce.com/panel/`), con sus estilos; no se indexa | Sí |
| `panel/app.js` | La app: las pestañas y sus botones (aprobar, descartar, editar, retirar, pedir a la IA, "Actualizar la web ahora") | Sí |
| `panel/hoy.js`, `panel/borradores.js`, `panel/recorrido.js` | La pantalla "Hoy" (lo que hay que mirar al abrir), los borradores pedidos a la IA y el recorrido de una nota (8/10) | Sí |
| `panel/fechas.js`, `panel/fotos.js`, `panel/pistas.js`, `panel/contactos.js`, `panel/numeros.js`, `panel/revision.js`, `panel/redes-estado.js` | Las pestañas Fechas, Fotos, Pistas, Contactos, Números, Revisión y el estado de las redes (sin nada de la pantalla: se prueban con Node) | Sí |
| `panel/textos.js` | Los textos que explican cada pestaña, botón y motivo | Sí |
| `panel/github.js` | Cómo habla con GitHub con la llave de quien lo usa: leer y guardar archivos, disparar workflows (sin nada de la pantalla: se prueba con Node) | Sí |
| `panel/cifrado.js` | El lado del celular del sobre cifrado: crea el par de llaves (la privada no se puede exportar) y abre lo que llega | Sí |
| `panel/sw.js`, `panel/manifest.webmanifest` | Lo que Chrome pide para instalarlo como app: el service worker (siempre busca primero la versión nueva) y la ficha (nombre, ícono, pantalla completa) | Sí |
| `panel/prueba.js`, `panel/prueba-sobre.js` | El modo de prueba (`/panel/?demo`): notas inventadas, sin GitHub, no guarda nada | A mano |

## `comercial/` — la base de comercios, aparte del sitio (`COMERCIAL.md`)

Nada de esta carpeta lo usa la web ni lo corre un workflow: todo es **a mano**.

| Archivo | Qué hace |
|---|---|
| `base.mjs`, `esquema.mjs` | Leer y guardar la base sin perder lo cargado a mano; la ficha de un comercio y cómo se arma desde cada fuente |
| `importar-osm.mjs`, `verificar.mjs`, `vigencia.mjs` | Traer los comercios de OpenStreetMap; cruzar los datos para ver cuáles siguen vigentes, con el puntaje de "¿sigue abierto?" |
| `propuestas.mjs` | Qué se le ofrece a cada comercio y cómo se le escribe |
| `vista.mjs`, `vista.plantilla.html` | La vista previa de la guía comercial (`comercial/salida/guia-previa.html`) |
| `datos/comercios.json`, `datos/calles.json` | La base de comercios y las calles de Balcarce (para el mapa de la vista previa) |

## `docs/` y `pruebas/`

- **`docs/`** (sin programas adentro): los documentos `00` a `13`, `DECISIONES.md`, `COMO-FUNCIONA-HOY.html`,
  las carpetas de las etapas del rediseño
  (`etapa-1-fuentes/`, la revisión de fuentes, que sigue abierta: sus programas
  están en `scripts/medir/`; `etapa-2-5/`, `etapa-6-9/` y `etapa-10-operacion/`, sin programas:
  los que se usan pasaron a `scripts/medir/`), la auditoría del 16/10
  (`auditoria-2-0/`), las de los temas nuevos (`flujos/`: el cruce coherente, las repetidas 2.0,
  el informe de hoy, la revisión del archivo, las imágenes con Gemini web y una nota desde un mail
  (una sola carpeta desde el 24/10; antes había `flujo/` y `flujos/`);
  `secciones/`: el mapa de secciones, `MINI-PORTALES.html`, el prototipo del menú
  y `vista-previa/`; `diseno/`: las dos direcciones de diseño y su comparación;
  `criterio/`; `redes/`; `panel/`; `seo/`; `salud-tecnica/`; `analiticas/`;
  `auditoria-opus/`), `propuestas/` e `historico/` (con `PRUEBAS-DE-MODELOS.md`,
  el resumen de los ensayos de modelos, y `criterio-unico/`, el borrador del
  criterio único, que no rige); ver `docs/00-INDICE.md`.
- **`pruebas/`**: 198 `*.test.mjs` (unas 2.500 pruebas) y su material: el
  núcleo legal (`nucleo-legal.txt`, la lista, y `nucleo-legal.mjs`, que la corre),
  `datos-fijos.mjs` y `datos-fijos/` (casos reales guardados), `hora-falsa.mjs`,
  `cuerpo-de-prueba.mjs` y `libro-real-24-25-09.json`. Cada prueba tiene su
  línea en `docs/10-REGLAS-Y-PRUEBAS.md`. Se corren con `npm test` (en GitHub, el
  workflow "Pruebas"); el núcleo legal, con `npm run test:nucleo` y en cada vuelta
  de "Actualizar la web".

## Lo que existe sin enlaces

Las páginas de `/tema/`: existen y están en el sitemap, pero nada las enlaza
(`MOSTRAR_TEMAS = false`, `web/lib/sitio.js`). Qué hacer con ellas, y todo lo
demás que falta, en `PENDIENTES.md`.
