# Mapa de secciones: de 11 a 17

*Propuesta del 16/10/2026. **No se cambió nada del sitio**: el clasificador nuevo corre sólo en sombra
(`ingesta/secciones-nuevas.mjs`, sin conectar). Es un cambio visible: se propone y se muestra, y lo deciden
Hernán y Andrés. La versión para decidir (con cajas Sí/No/Duda) es `MAPA-DE-SECCIONES.html`; el menú y la
portada dibujados, `PROTOTIPO-MENU.html`.*

> **17/10/2026, activadas (regla 215).** Hernán ordenó activar ya y de forma permanente lo que estaba detrás del interruptor
> `SECCIONES_NUEVAS` (que se sacó) y sumar Ciencia: **Educación, Salud y Ciencia** son secciones del sitio, de la IA, de las placas y del
> panel, y Tecnología se lee «Tecnología e IA» (la clave sigue siendo Tecnología). Son catorce; Espectáculos, Turismo y Ambiente siguen en
> sombra (lo de Espectáculos va dentro de Cultura y agenda). Dos cambios sobre lo que dice este documento: (1) la sección de una nota
> ya no se decide sólo al armar el sitio: el clasificador (`seccionSumada`) actúa en la ingesta, y las notas de antes se reparten al
> armar el sitio como siempre; nunca se lleva una nota de Política ni de Policiales; (2) el color de Ciencia pasó de `#0A7C99` a
> **`#772E9E`** (violeta): con catorce secciones, el celeste caía a 13 grados de tono de Tecnología y a 0,067 (OKLab) de Deportes
> (`pruebas/titulos-colores.test.mjs`). `#0A7C99` vuelve a ser un color reservado. El cómo se decide qué sale y cuántas notas por día
> tendría cada sección: `docs/03-SELECCION.md` y `docs/DECISIONES.md` (17/10).

## En doce renglones

1. **17 secciones, no 20.** Las 11 de hoy siguen, con la misma dirección, y se suman 6: **Educación, Salud,
   Ciencia, Espectáculos, Turismo y gastronomía y Ambiente y clima**. Para llegar a 20 habría que inventar
   secciones sin notas.
2. **Educación y Salud ya tienen material**: unas 10 y 11 notas por semana que hoy se pierden adentro de
   Balcarce, Política y Argentina. Llegan al piso de 10 por semana fijado el 8/10.
3. **Ciencia y Tecnología e IA tienen poco publicado** (3,5 y 2,8 por semana) porque lo de un solo medio no pasa
   el cruce, no porque falte en las fuentes. Ciencia conviene abrirla **junto con** la regla "fuente sola" (C1 de
   `docs/etapa-1-fuentes/DIAGNOSTICO-POLICIALES-CIENCIA-IA.md`).
4. **La IA no va como sección aparte**: Tecnología se lee "Tecnología e IA" y la IA tiene su página de tema
   (`/tema/inteligencia-artificial`). Si pasa 10 notas por semana, se separa.
5. **Cultura se parte**: la tele, el streaming y los recitales de afuera van a Espectáculos; lo de acá, libros y
   arte quedan en Cultura (se lee "Cultura"; la agenda ya es `/agenda`).
6. **Turismo y Ambiente son "duda"**: 4 y 5 por semana. Valen por Balcarce (Fiesta del Postre, sierras,
   alertas) pero no llegan al piso; también pueden ser temas.
7. **No se parten las grandes** (Economía 42, Política 40, Automovilismo 38, Deportes 37, Fútbol 36 por
   semana): ya son precisas. Las agranda lo de afuera, y eso se regula con los cupos.
8. **Balcarce baja de 50 a 22 por semana**: deja de ser el cajón de todo lo de acá.
9. **El menú**: barra con las 8 más fuertes y un botón **"Más secciones"** con las otras 9 agrupadas.
10. **Las direcciones no cambian**: ninguna nota lleva la sección en la dirección y ninguna sección cambia de
    ranura. No hace falta ninguna redirección.
11. **El clasificador nuevo refina, no clasifica de cero**: parte de la sección que ya decidió el sistema.
    Precisión: **37 de 40 (92 %)** en la muestra revisada a mano; **21 de 24 (88 %)** en notas que no se usaron
    para afinar (19 de 24 antes de dos arreglos generales).
12. **Por etapas**: una semana con la IA eligiendo en sombra; después Educación, Salud y el menú; después
    Ciencia (con "fuente sola") y Espectáculos; al final Turismo y Ambiente si llegan.

## Cómo se midió

- **Lo publicado**: 1.311 notas con sección del 16/09 al 15/10 (`web/data/portada.json`, `archivo.json` e
  `historico/*.json`, sin repetir y sin las notas propias: repasos, dólar, clima, F1, fútbol, efemérides,
  pistas). Se corre con `node ingesta/secciones-nuevas-sombra.mjs` (`--dias=N`, `--json=archivo`).
- **60 días no existen todavía**: el archivo guarda desde el 3/09 (43 días). Con `--dias=60` salen 1.339 notas y
  los números por semana bajan a la mitad sólo por el período; por eso se usan 30.
- **Lo que la ingesta lee hoy**: los 100 feeds activos bajados el 16/10 (los raspados no): 6.413 notas de 72
  horas que pasan el filtro de entrada, 6.163 títulos distintos. Es materia prima, no lo que se publica.
- **La revisión a mano**: 40 notas elegidas por un número fijo de cada nota (25 que cambian y 15 que se quedan),
  revisadas una por una el 16/10; y 24 aparte que no se usaron para afinar (las 4 que cambian del 3 al 15/09 y 20
  de la lectura de feeds).

## El mapa

"Hoy": la sección actual en esas 1.311 notas. "Mapa nuevo": lo que da el clasificador en sombra. "Esperado":
con las propuestas de la etapa 1 (estimación, no medición).

| Sección (lo que se lee) | Qué entra | Por semana hoy | Mapa nuevo (30 días) | Esperado por semana | Menú | Color |
|---|---|---|---|---|---|---|
| Balcarce | Lo de acá sin sección más precisa: vecinos, instituciones, obras, comercios, servicios y trámites | 49,5 | **21,9** (94) | 20 a 25 | Barra | `#B91C1C` |
| Política | Concejo, intendente, Provincia y Nación, leyes, elecciones, Cancillería y Malvinas | 40,4 | **40,4** (173) | 40 | Barra | `#3730A3` |
| Policiales | Sólo de Balcarce y la zona: delitos, choques, incendios, estafas, prevención | 4,9 | **7,9** (34) | 8; unas 20 con P1 y P2 | Barra | `#831843` |
| Educación *(nueva)* | Escuelas, jardines, docentes y paros, Facultad y universidades, becas | — | **9,6** (41) | 10 a 14 | Más | `#1D4BE0` |
| Salud *(nueva)* | Hospital, vacunas, brotes, PAMI, IOMA, LALCEC, zoonosis, salud mental | — | **10,7** (46) | 11 a 15 | Más | `#004E5C` |
| Fútbol | De la Liga Balcarceña a la Selección | 27,3 | **35,7** (153) | 36 | Barra | `#7C3AED` |
| Deportes | Todos los demás deportes | 42,0 | **37,3** (160) | 37 | Barra | `#0F766E` |
| Automovilismo | TC, F1, karting, el autódromo, Fangio | 38,0 | **38,0** (163) | 38 | Barra | `#B45309` |
| Agro | Campo, papa, ganadería, granos, INTA cuando es producción | 20,8 | **18,9** (81) | 19 | Barra | `#5A6B0A` |
| Economía | Precios, salarios y jubilaciones, empleo, empresas, combustibles | 41,1 | **42,5** (182) | 42 | Barra | `#8A6500` |
| Ciencia *(nueva)* | CONICET, INTA y Facultad cuando es ciencia, espacio, paleontología, premios | — | **3,5** (15) | 10 a 20 con C1; sin C1, 3 o 4 | Más | `#772E9E` (antes `#0A7C99`) |
| Tecnología e IA *(se lee distinto)* | Empresas tecnológicas, celulares, ciberseguridad, robots, IA | 2,8 | **2,8** (12) | 7 a 15 con La Nación Tecnología y C4 | Más | `#0B6FB8` |
| Cultura *(se lee distinto)* | La cultura de acá, libros, arte, teatro, música, patrimonio | 19,8 | **12,4** (53) | 12 | Más | `#9D2C8F` |
| Espectáculos *(nueva)* | Tele, streaming, cine, recitales de afuera, premios; nunca chimentos | — | **4,7** (20) | 5 (cupo de hoy) | Más | `#C0258F` |
| Turismo y gastronomía *(nueva)* | Escapadas, fines de semana largos, Fiesta del Postre, sierras, restaurantes | — | **4,0** (17) | 4; más en noviembre y verano | Más | `#5E3729` |
| Ambiente y clima *(nueva)* | Alertas, temporales, inundaciones, sequía, residuos, árboles, fauna | — | **4,9** (21) | 4 o 5 sin pronósticos | Más | `#006516` |
| Argentina | Lo nacional que no es de otra sección | 19,4 | **10,7** (46) | 10 | Más | `#4B5563` |

**Las claves internas no cambian**: "Cultura y agenda" y "Tecnología" siguen siendo la clave de unos 60
archivos y de las notas guardadas; cambia sólo lo que se lee (un campo `etiqueta`). Las nuevas usan claves
cortas (`Turismo`, `Ambiente`) con etiqueta larga.

**Colores**: los 6 nuevos se leen con letras blancas y sobre el papel (contraste 4,5 o más) y se distinguen
de todos los de las piezas (OKLab 0,06 o más); lo controla `pruebas/secciones-nuevas.test.mjs`. Espectáculos
usa uno de los dos reservados desde el 30/09 (el celeste `#0A7C99` quedó libre al pasar Ciencia a violeta); reservados nuevos propuestos: `#5E4F11` y `#7563C0`.

### De dónde sale cada una (30 días)

| Sección de hoy | Notas | Se quedan | Se van a… |
|---|---|---|---|
| Balcarce | 212 | 94 | Educación 26 · Salud 24 · Deportes 13 · Ambiente 13 · Policiales 13 · Política 10 · Cultura 8 · Economía 4 · Turismo 2 · Ciencia 2 · Tecnología 2 · Fútbol 1 |
| Cultura y agenda | 85 | 45 | Espectáculos 18 · Turismo 14 · Educación 4 · Deportes 2 · Salud 1 · Ambiente 1 |
| Deportes | 180 | 145 | Fútbol 35 |
| Política | 173 | 157 | Educación 8 · Salud 8 |
| Agro | 89 | 81 | Ciencia 8 |
| Argentina | 83 | 46 | Salud 13 · Ambiente 7 · Política 6 · Economía 3 · Educación 3 · Espectáculos 2 · Ciencia 2 · Tecnología 1 |
| Tecnología | 12 | 9 | Ciencia 3 |
| Economía | 176 | 175 | Turismo 1 |
| Fútbol, Automovilismo, Policiales | — | todas | (no se tocan) |

En total cambian 258 de 1.311 (20 %); 43 quedan marcadas como dudosas (3 %).

### Lo que la ingesta lee hoy, con el mapa nuevo (títulos distintos por día)

Argentina 632 · Fútbol 266 · Economía 197 · Política 184 · Educación 107 · Deportes 96 · Cultura 84 ·
Espectáculos 81 · Automovilismo 71 · Agro 67 · Tecnología 67 · Ambiente 60 · Policiales 59 · Salud 46 ·
Turismo 22 · **Ciencia 11** · Balcarce 5 (los raspados de acá no están). Educación, Salud, Tecnología y
Ambiente tienen de dónde salir; Ciencia casi no con las fuentes de hoy (por eso las fuentes nuevas del
diagnóstico). Educación está inflada esta semana por la marcha universitaria.

## Lo que no recomendamos

| Candidata | Por qué no | En su lugar |
|---|---|---|
| Mundo / Internacional | El criterio (§ 2) no trae lo del extranjero sin un argentino; una sección empuja a traerlo | Argentina o Política |
| IA como sección | 3 notas en 30 días | "Tecnología e IA" + `/tema/inteligencia-artificial` |
| Sociedad (en vez de Argentina) | Cambia una dirección indexada; Argentina ya queda chica y limpia | Argentina |
| Deportes por disciplina | Ninguna llega a 4 por semana | Temas (`/tema/basquet`) |
| Balcarce por tema (Instituciones, Servicios, Policiales de acá) | Servicios se sacó el 27/09; Instituciones, 2 o 3 por semana; Policiales ya es de acá | Balcarce |
| Trabajo / Empleo | Ya está bien en Economía y Política | Economía |
| Agenda como sección | Ya es `/agenda` | `/agenda`, enlazada desde Cultura |

## Las reglas de asignación

### Cómo decide `seccionNueva(nota)`

1. Parte de la sección que **ya decidió el sistema** (palabras de `REGLAS_SECCION` + lectura con IA).
2. Cada sección de hoy tiene las secciones nuevas que **se la pueden llevar** (`PUEDEN_LLEVARSE`): Balcarce
   reparte en 12, Argentina en 10, Cultura en Espectáculos, Turismo y otras, Tecnología y Agro sólo en Ciencia,
   Política sólo en Educación y Salud, Deportes sólo en Fútbol. **Fútbol, Automovilismo y Policiales no se
   tocan.**
3. Una palabra **firme** decide desde el título. En la bajada hacen falta **dos firmes distintas** (o una firme
   y una débil en el título): una sola engaña.
4. Una palabra **débil** decide sólo desde el título y si no hay nada firme (como `PALABRAS_DEBILES`).
5. Las **contras** anulan una sección para esa nota ("carne vacuna", "a ciencia cierta", "conductores",
   "Turismo Carretera", "educación vial", "transporte público", "malambo"…).
6. De una sección ya temática (Política, Agro, Deportes, Tecnología, Economía) se va sólo con una firme **en el
   título** y **sin empate**.
7. Lo de acá nunca es Espectáculos; la música y los shows de afuera van a Espectáculos aunque la palabra sea de
   Cultura.
8. Lo que parece un pronóstico del tiempo queda marcado (`aviso`): 4 se publicaron en 30 días.
9. De cuatro letras para abajo, palabra entera; y las de `ENTERAS` también ("marte" no es "martes").

Las listas completas están en `PALABRAS_NUEVAS` (`ingesta/secciones-nuevas.mjs`).

### Lo que leería la IA

Reemplaza las líneas de "seccion" de la instrucción de `ingesta/lectura-ia.mjs` (y `SECCIONES_DE_LA_FICHA`
pasa a tener las 17; están en `TEXTO_PARA_LA_FICHA` y `SECCIONES_DE_LA_FICHA_NUEVAS`):

```
- "seccion", qué va en cada una:
  · Balcarce: lo que pasa en la ciudad y no tiene una sección más precisa: vecinos, instituciones y clubes (lo no deportivo), obras, comercios de acá, y lo práctico: cortes de luz o agua, trámites, tasas, horarios, tarifas y subsidios de servicios públicos.
  · Política: el Concejo, el intendente, el gobierno provincial y nacional, leyes, elecciones, la Cancillería y Malvinas.
  · Policiales: delitos, accidentes de tránsito, incendios, bomberos, policía, estafas y prevención.
  · Educación: escuelas, jardines, docentes y paros docentes, universidades y la Facultad, becas, inscripciones, el ciclo lectivo.
  · Salud: hospitales, salas, vacunas, enfermedades y brotes, PAMI, IOMA, obras sociales y prepagas (lo que cubren), salud mental, zoonosis y campañas de prevención.
  · Fútbol: el fútbol, de la liga de Balcarce a la Selección y los clubes argentinos.
  · Deportes: todos los demás deportes (básquet, hockey, rugby, tenis, boxeo, atletismo, ciclismo, Juegos Bonaerenses…), salvo el automovilismo.
  · Automovilismo: autos de carrera (TC, Turismo Nacional, Fórmula 1, MotoGP, karting, rally), el autódromo Juan Manuel Fangio y Fangio. Nunca Deportes ni Turismo.
  · Agro: campo, papa, ganadería, granos, maquinaria agrícola, el INTA y la Facultad cuando es producción, clima para el productor.
  · Economía: precios, inflación, dólar, salarios y jubilaciones, empleo, empresas, combustibles, consumo.
  · Ciencia: investigación y descubrimientos: CONICET, universidades e INTA cuando es ciencia (no producción), espacio y astronomía, paleontología, biología, premios científicos.
  · Tecnología: tecnología e inteligencia artificial: empresas tecnológicas, celulares y aplicaciones, ciberseguridad, robots, IA (ChatGPT, Gemini, OpenAI…). No las guías de uso ni las ofertas.
  · Cultura y agenda: la cultura de acá (Teatro Municipal, Casa del Bicentenario, museos, talleres, fiestas, artistas locales) y libros, arte, teatro, música y patrimonio.
  · Espectáculos: televisión, streaming, cine, recitales y giras de artistas de afuera, premios del espectáculo. No chimentos (vida privada de famosos).
  · Turismo: turismo y gastronomía: escapadas, fines de semana largos, ocupación, la Fiesta del Postre, las sierras, restaurantes y productos de la zona.
  · Ambiente: ambiente y clima: alertas meteorológicas, temporales, inundaciones, sequía, incendios forestales, residuos y reciclaje, árboles, fauna. El pronóstico de todos los días NO es una nota (está /clima).
  · Argentina: lo nacional que no entra en ninguna de las anteriores (sociedad, transporte, trámites nacionales, la Iglesia, grandes hechos).
```

## La prueba en sombra: precisión

**Muestra de 40 (25 que cambian, 15 que se quedan): 37 bien (92 %).** De las que cambian, 24 de 25 (96 %); de
las que se quedan, 13 de 15. Los tres errores:

- *"Nito Lezcano reflexiona sobre su sobreseimiento tras una denuncia penal"*: Balcarce → Policiales por la
  palabra débil "denuncia". Discutible; lo contamos como error.
- *"El Servicio Meteorológico Nacional anticipa lluvias superiores a lo normal"*: queda en Agro; con el mapa
  nuevo debería ir a Ambiente (de Agro sólo se va a Ciencia).
- *"Fiorella Cacace detalla la labor de los escribanos"*: está en Cultura desde hoy y el mapa no lo arregla
  (es Balcarce).

Discutibles contadas como bien: "Giuliana Romero afronta una nueva cirugía" (Salud; podría ser Balcarce) y las
dos del caso de la investigadora del INTA (Ciencia; podrían ser Agro).

**Ojo**: las reglas se afinaron mirando estas mismas notas, así que el 92 % es optimista. **Fuera de muestra**
(24 notas que no se usaron para afinar): 4 de 4 del 3 al 15/09 y 15 de 20 de la lectura de feeds = **19 de 24
(79 %)**. Dos de esos errores eran música de afuera que caía en Cultura ("Iván Noble llega con un show…"); con
la regla general "la música de afuera es Espectáculos" quedaron bien: **21 de 24 (88 %)**. Los que siguen mal:
"Psicólogos afirman: las personas que disfrutan los días de lluvia…" (Ambiente), "Rescataron a dos turistas…
en las sierras de Tandil" (Turismo) y "Golpazo para Estudiantes: Conmebol…" (Educación: el club se llama
Estudiantes y el clasificador de hoy no lo puso en Fútbol).

Conclusión: el clasificador de palabras sirve de **respaldo**; el que decide tiene que ser la IA con la lista
nueva (etapa 1), y las 43 dudosas, a mano o a la IA.

## El menú

- **Celular**: la fila que se desliza sigue con Portada y las 8 de la barra (Balcarce, Política, Policiales,
  Fútbol, Deportes, Automovilismo, Agro, Economía). A la derecha, fijo, un botón **"Secciones"** que abre una
  pantalla con las 17 agrupadas (Balcarce · Deportes · Economía y campo · Sociedad · Ciencia y tecnología ·
  Cultura y ocio) y los servicios. Se cierra con la ×, Escape o tocando una sección; cada toque, 44 px.
- **Computadora**: Portada, las 8 y **"Más secciones ▾"**, que despliega un panel de cuatro columnas; los
  servicios a la derecha, en verde. Con 8 entra en una línea en una pantalla común (hoy, con 11, hacen falta
  1.180 px).
- **Si la persona está en una sección del "Más"**, el botón lo dice ("Más secciones · Salud").
- **Accesibilidad**: `<button>` con `aria-expanded` y `aria-controls`; Enter/Espacio abren, Escape cierra y el
  foco vuelve al botón; en el celular Tab no se escapa del panel; `aria-current="page"` también adentro del
  "Más"; el color nunca es la única pista; sin JavaScript, el panel es una lista de enlaces.
- **SEO**: cada sección ya tiene su página y su feed (`/seccion/[ranura]`, `/seccion/[ranura]/feed.xml`); los
  enlaces del "Más" están en el HTML aunque esté cerrado; el pie lista las 17; el sitemap sólo incluye
  secciones con notas (`web/app/sitemap.js`), así que una nueva no se indexa vacía.
- **Portada**: un bloque de 3 notas por sección de la barra (8) y **tres bloques por grupo** (Sociedad, Ciencia
  y tecnología, Cultura y ocio) de 4 notas con la etiqueta de color de cada una: 11 bloques, como hoy
  (`armarTapa`, `web/lib/datos.js`).

## Para aplicarlo

### Archivos (CLAUDE.md, "Una sección nueva")

- `web/lib/datos.js`: `SECCIONES` (6 nuevas y `etiqueta`), `EN_NAVEGACION` (8), una lista `EN_MAS` con los
  grupos, `frasesDeSeccion`, `nombreCorto`, `armarTapa`.
- `web/components/navegacion.js` (botón y panel), `web/app/layout.js` (secciones del "Más" y el pie).
- `web/app/globals.css`: `--s-educacion`, `--s-salud`, `--s-ciencia`, `--s-espectaculos`, `--s-turismo`,
  `--s-ambiente` y los estilos del panel; las mismas variables en `web/public/panel/index.html`.
- `ingesta/fuentes.mjs` (`REGLAS_SECCION`) y `ingesta/ingesta.mjs` (`PALABRAS_DEBILES`), o que `clasificar`
  llame a `seccionNueva` después de decidir.
- `ingesta/lectura-ia.mjs`: `SECCIONES_DE_LA_FICHA` y las líneas de la instrucción.
- `ingesta/criterio.mjs`: `MEDIOS_DE_AFUERA` y `CUPO_DE_AFUERA` de cada nueva (propuesta: Educación, Salud,
  Espectáculos, Turismo y Ambiente 3 medios; Ciencia 2; cupo de Espectáculos 4) **y** las tablas de
  `CRITERIO-EDITORIAL.md` (§ 2 y "Los números").
- `ingesta/auditoria-ia.mjs` (`SECCIONES_VALIDAS`), `ingesta/foto-ia.mjs`, `ingesta/foto-stock.mjs`.
- `web/public/panel/github.js` (`SECCIONES`), `web/public/panel/app.js`, `web/public/panel/numeros.js`.
- `web/lib/notas-de-pistas.js` (`SECCIONES`), `web/lib/tarjeta-diseno.js` (`COLOR`).
- `reels/placa.mjs` (`COLOR_SECCION`, `COLORES_RESERVADOS`) **y** `CRITERIO-REDES.md` § 8.
- `web/scripts/generar-redirects.mjs` (`RANURAS_DE_SECCION`; `SECCIONES_VIEJAS` no cambia).
- `infra/mcp-cloudflare/worker.mjs` y `web/lib/para-agentes.js` si listan secciones.
- `CLAUDE.md` ("Las secciones son once" → diecisiete), `docs/06-WEB.md`, `docs/03-SELECCION.md`,
  `docs/12-GLOSARIO.md` y una regla nueva en `docs/10-REGLAS-Y-PRUEBAS.md`.

### Pruebas con listas fijas que hay que actualizar

`titulos-colores`, `colores-placas`, `nota-de-pista` (espera 11), `notas-de-pistas`, `redirects`,
`secciones-flacas`, `criterio`, `lectura-ia`, `auditoria-ia`, `celular-app`, `mcp-worker`, `portada`,
`seo-paginas`, `foto-ia`, `foto-stock`. Y `secciones-nuevas.test.mjs` pasa de "sombra" a "en uso" (hoy
controla que nada de producción lo importe: esa prueba se da vuelta).

### Redes

- **Colores de placas**: 6 nuevos en `COLOR_SECCION` y en el § 8 de `CRITERIO-REDES.md` (la prueba que los
  compara ya existe).
- **Hashtags**: no cambian; salen de las etiquetas de la IA y de #Balcarce (`hashtagsDe`, `redes/elegir.mjs`).
- **Quién espera a una persona**: Política y Policiales siguen. Salud: propuesta de que no (lo sensible ya lo
  frena el semáforo).
- **Repasos y podcasts**: prefieren secciones distintas; con 17 se reparten más solos.

### Direcciones viejas, archivo y SEO

- Las notas no cambian de dirección (`/nota/titulo-id`, sin sección): se respeta "una sola dirección".
- Ninguna sección cambia de ranura: **ninguna redirección**.
- **Reclasificar**: sólo las notas de los últimos 30 días que el clasificador manda sin duda (215), con una
  función en `web/scripts/generar-datos.mjs` que se aplica al leer el archivo (como `conCambiosDeLaAuditoria`),
  no reescribiendo `archivo.json` a mano. Lo que corrigió una persona no se toca. Las dudosas y las más viejas
  quedan donde están.
- Las páginas nuevas entran al sitemap cuando tienen notas; las viejas no pierden nada.

## Plan por etapas

0. **Hecha**: el mapa en sombra, sus pruebas y estos documentos.
1. **Una semana, sin cambio visible**: la IA elige también con la lista nueva, en un campo aparte que no se
   publica; se compara con el clasificador y se afinan las palabras. Sumar las fuentes de ciencia y "fuente
   sola" (C1) si se aprueban.
2. **Educación y Salud**, "Cultura" y "Tecnología e IA" como nombres, el menú con "Más secciones", la portada
   con bloques por grupo; reclasificar 30 días.
   *17/10: Educación, Salud y el menú quedaron hechos **detrás del interruptor `SECCIONES_NUEVAS`** (apagado; regla 187).
   Diferencias con lo de arriba: las notas se muestran en la sección nueva al armar el sitio, todas las del archivo y
   sólo las firmes, sin tocar los datos; los nombres "Cultura" y "Tecnología e IA" y los bloques por grupo de la
   portada quedan para después (Educación y Salud tienen su bloque de 3, como las otras). Vista previa:
   `cd web && npm run vista-previa-secciones` → `docs/secciones/vista-previa/index.html`.*
3. **Dos semanas después**: Ciencia (con C1 andando) y Espectáculos.
4. **Turismo y gastronomía y Ambiente y clima** si en la etapa 1 llegan a 4 por semana; si no, como temas.

Cada etapa con sus pruebas, `npm test` antes de subir, y mirando la web publicada después.

## Lo que hay que decidir

1. Las 17 secciones (de a etapas).
2. Educación. 3. Salud. 4. Ciencia (con "fuente sola"). 5. "Tecnología e IA" + tema de IA.
6. Espectáculos separada de Cultura. 7. Turismo y gastronomía. 8. Ambiente y clima.
9. Lo que no se suma (Mundo, Sociedad, IA aparte, deportes por disciplina, Balcarce por tema).
10. Menú: barra de 8 y "Más secciones". 11. Portada con bloques por grupo.
12. Reclasificar 30 días (sólo las firmes). 13. Salud en redes sin esperar a una persona.
14. Una sección del "Más" se muestra si tuvo una nota en 7 días; si dos semanas baja de 4 por semana, se revisa.

## Archivos de esta propuesta

- `ingesta/secciones-nuevas.mjs`: el mapa, las palabras, el texto para la IA y `seccionNueva` (sin
  dependencias, sin conectar).
- `ingesta/secciones-nuevas-sombra.mjs`: el informe sobre las notas reales.
- `pruebas/secciones-nuevas.test.mjs`: 15 pruebas sin red (casos reales, colores, que nada de producción lo use).
- `docs/secciones/MAPA-DE-SECCIONES.html` (para decidir) y `docs/secciones/PROTOTIPO-MENU.html`.
