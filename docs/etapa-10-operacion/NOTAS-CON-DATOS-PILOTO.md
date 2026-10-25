# Notas con datos propios: el primer piloto (regla 323)

*24/10/2026. Piloto escrito, probado y compilado de verdad; **APAGADO**: nada se desplegó ni se prendió. Sale de los informes G (`docs/historico/auditoria-2-0/G-NOTAS-UNICAS-CON-DATOS.md`) y K (`K-DATOS-E-INFOGRAFIAS-POR-TEMA.md`) y de la decisión del dueño: «lo nuevo importa; las notas tienen que tener datos propios, no ser un resumen de fuentes».*

## 1. Qué es, en cinco líneas

1. Debajo del cuerpo de la nota (y arriba de «Fuentes (N)», que no cambia) pueden aparecer hasta tres bloques con **datos propios**: «Antes en Radar», la ficha de Colapinto y la tira del dólar.
2. **Los arma el código, nunca la IA.** Cada dato se copia de un archivo del repositorio, con su fuente y su fecha a la vista. No hay nada que verificar contra una fuente: se cuida con pruebas.
3. **Un bloque sale sólo si hay dato real.** Sin serie suficiente, sin el piloto en la clasificación o sin antecedentes que pasen el filtro, no hay bloque (nunca relleno).
4. **Nunca en Policiales, en una nota roja, con la lista roja del semáforo ni con un menor a la vista.** La lista roja no se tocó.
5. **Costo cero:** ningún pedido a la IA, ninguna llamada nueva a una API, ningún archivo nuevo en el sitio (siguen 3.893 de 20.000).

## 2. Cómo prenderlo y apagarlo

Es una variable de GitHub, `NOTAS_CON_DATOS` (Settings → Secrets and variables → Actions → Variables). **Sin la variable, o vacía, no cambia nada de lo que se publica.**

| Valor | Qué prende |
|---|---|
| (vacía o no existe) | Nada. La página de la nota sale igual que siempre |
| `Si` (también `todos`, `1`, `true`) | Los tres bloques |
| `antes`, `f1`, `dolar` o una lista, p. ej. `f1,dolar` | Sólo esos (se prenden de a uno para mirar cada uno) |
| Cualquier otra cosa | Nada |

Pasos para prenderlo (los dos, o quien tenga acceso a las variables):

1. Crear la variable `NOTAS_CON_DATOS` con el valor elegido (conviene empezar por `dolar` y `f1`, que son de datos, y después `antes`).
2. Correr «Cargar variables del motor» (`motor-variables.yml`): la manda a Workers Builds, que es donde compila hoy (regla 311; sin este paso la variable existe pero el motor no la ve).
3. La huella del sitio (regla 304) incluye la variable: cambiarla fuerza una compilación en la vuelta siguiente. No hace falta nada más.
4. Mirar una nota de las que reciben bloque (ver § 5) y, en el panel, la pestaña Revisión: **un error en un bloque apaga el interruptor** (criterio de G § 4).

Para apagarlo: borrar la variable (o dejarla vacía) y volver a correr «Cargar variables del motor». La vuelta siguiente compila sin bloques. No queda nada guardado en los datos: los bloques no se escriben en `web/data/`, se arman al compilar, así que apagar es volver exactamente a lo de antes.

En GitHub Actions (el camino de vuelta atrás) la variable llega a los pasos «Ver si hace falta compilar», «Compilar el sitio», «Volver a compilar con lo que entró» y «Anotar la huella del sitio» de `actualizar.yml`.

## 3. Los tres bloques

### 3.1 «Antes en Radar»

- **Qué muestra:** hasta 3 notas propias de los 30 días anteriores a la nota sobre el mismo tema, la más nueva primero, cada una con su fecha y su enlace. Fuente: «Archivo de Radar Balcarce».
- **De dónde sale:** los antecedentes que ya viajan con la nota (`nota.antecedentes`: id, título, fecha y ruta; los mismos que lee la IA, 30 días y 3 como máximo) **más** las parecidas que tengan página hoy (para las notas cuyos antecedentes se aligeraron a los 4 días o que nunca los tuvieron).
- **Filtro de «el mismo tema»** (`parecidoDeTitulares`). Es más estricto que el de la IA, porque acá el lector ve el enlace: la IA se conforma con un tema en común o dos palabras sueltas («revela detalles»). Hace falta compartir al menos dos palabras que digan algo y, entre ellas, dos nombres propios («Concejo Deliberante»), una sigla («LALCEC») o un nombre propio y una tercera palabra; y que juntas pesen lo bastante (cada palabra pesa lo que tarda en repetirse en los titulares de las notas con página: «Milei», que está en decenas, casi no pesa). `PARECIDO_MINIMO` = 2,2. Dos notas que sólo comparten a un político no son «la misma historia».
- **Se descarta** el antecedente que ya no tiene página (retirado), no tiene cuerpo, es de Policiales, es propio (clima, repaso…), toca la lista roja, habla de menores (palabras o edad, `ingesta/menores.mjs`), es de la misma fecha o posterior, o tiene el mismo titular que otro.
- **La nota que lo recibe** no puede ser de Policiales, ni roja, ni propia ni una plantilla que se repite (clima, repasos, horarios, códigos), ni tener un menor en el título, la bajada o el cuerpo.
- **Límite honesto:** sólo se ofrecen las notas que tienen página en esta compilación (las 500 del sitio, unos 4 días). Las que viven nada más que en el archivo permanente de R2 no se pueden comprobar al compilar y no se enlazan. Por eso hoy casi todos los antecedentes son de los últimos días.
- **Calibración** (24/10, sobre pares reales de las notas del día): de 14 pares a mano, entran los que son la misma historia (LALCEC con LALCEC; el Concejo Deliberante con el Concejo; Estudiantes–Flamengo; la Fiesta del Postre; la Cooperativa de Electricidad; los patos) y quedan afuera «LALCEC en la plaza Libertad» con «La Libertad Avanza», «Milei saludado por sus 56 años» con «Milei y su imagen negativa», dos notas distintas sobre Estados Unidos y dos sobre Messi. Con el filtro de la IA, en cambio, entraban pares sin relación («Maradona debuta en Argentinos» como antecedente de «el Estadio Único y el Mundial 2030»). Con 14 pares el margen es chico: **el umbral es una constante (`PARECIDO_MINIMO`) y conviene mirar 20 a 30 notas con bloque a ojo antes de prender `antes` para todos.**

### 3.2 La ficha de Colapinto

- **Qué muestra:** el puesto en el campeonato, los puntos, el compañero de equipo con los suyos y cómo le fue en la última carrera («largó 15º y abandonó tras 29 vueltas»), con un gráfico de barras de los puntos de los dos (el eje parte de cero) y la tabla equivalente. Fuente: «Jolpica F1 (datos abiertos)», con la fecha de la consulta.
- **De dónde sale:** `web/data/f1.json`, que **ya guarda la ingesta de F1** (`ingesta/f1.mjs`) cada vuelta. No hay llamadas nuevas a Jolpica: la función nueva `fichaDeColapinto` (en ese mismo archivo) sólo lee lo guardado. Se probó contra el archivo real.
- **Sale en** las notas que nombran a Colapinto (título, bajada o cuerpo), **no** en las notas propias de F1 (ya traen sus tablas).
- **Frescura:** el dato no puede ser más viejo que la nota por más de 3 días ni posterior por más de 10 (una nota de hace 9 días muestra el campeonato de hoy, con su fecha y la carrera a la vista; una de hace 13, no); `DIAS_DE_LA_FICHA` = 21 sobre la fecha de consulta.
- **Qué no tiene todavía:** la barra por carrera de toda la temporada y los últimos ganadores del circuito (K § 2) piden datos que hoy no se guardan (`results.json` por piloto, `circuits/…/results`): no se hicieron para no sumar llamadas. Queda como paso siguiente en `ingesta/f1.mjs` (una sola consulta al año, guardada).

### 3.3 La tira del dólar

- **Qué muestra:** el dólar oficial y el blue (precio de venta) de los últimos 30 días hasta el día de la nota, en un gráfico de líneas (la segunda serie va a rayas: no se distingue sólo por el color) con el valor final de cada una, la **variación semanal y mensual con el día de referencia a la vista** («frente al 14/10, +0,7%») y la tabla con una fila por día. Fuente: DolarApi.com, con el día del último dato.
- **De dónde sale:** `web/data/dolar-historia.json`, la cotización de las 11 de cada día hábil que guarda `generar-datos.mjs` desde el 25/09 (hoy 20 días hábiles). **No falta ninguna serie**: el bloque está prendible.
- **Se ancla al día de la nota:** una nota del 9/10 muestra la serie hasta el 9/10, no la de hoy. Si el último dato está a más de 3 días de la nota, o hay menos de 5 cotizaciones, no sale.
- **La variación semanal** necesita un día entre 7 y 10 días antes; **la mensual**, uno entre 28 y 34. La historia empieza el 25/09: **la mensual recién aparece en las notas del 23/10 en adelante** (antes sólo sale la semanal). Cuando la serie tenga 60 días, la ventana de 30 queda completa.
- **Sale en** las notas propias del dólar (`propia === 'dolar'`) y en las de Economía o Argentina cuyo título habla del precio del dólar («El dólar blue sube…», «Cotización del dólar…»), no en las que sólo mencionan dólares («5,6 millones de dólares»). Hoy son 2 de las 500.
- **Lo que no se hizo:** inflación, riesgo país y reservas (BCRA v4.0, ArgentinaDatos; K § 4) piden un módulo nuevo de ingesta y una decisión de fuente: quedaron para la semana 2.

## 4. El motor de gráficos (`web/lib/graficos.js`)

Funciones puras, sin dependencias: `barrasSvg`, `lineaSvg`, `fichaDeTabla`, `tablaHtml`, `anidarSvg`. Cada una devuelve `{ svg, tabla, alt }` o `null` si el dato no alcanza (menos de 2 barras, menos de 3 puntos por serie, ninguna fila). El SVG es accesible (`role="img"`, `<title>` y `<desc>`), la tabla equivalente va en un desplegable cerrado y todo lo que viene de afuera se escapa.

- **Tema claro y oscuro:** el dibujo lleva clases y, como respaldo, el color en cada atributo. En la página, `ESTILO_DE_GRAFICOS` las pinta con variables CSS (claro por defecto, oscuro con `prefers-color-scheme` o `data-theme="dark"`; el bloque trae su propio fondo para que se lea igual en un sitio que todavía no tiene modo oscuro). Contraste de las series, 3:1 como mínimo; texto, 4,5:1 (una prueba lo mide).
- **En las placas:** `anidarSvg(grafico, { x, y, ancho })` mete el dibujo en una placa de `reels/placa.mjs` como un `<svg>` anidado; resvg lo pasa a PNG (una prueba lo hace con una placa de 1080 × 1920). `tema: 'claro' | 'oscuro'`, `conTitulo` y `pie` ponen el título y la fuente en la propia imagen, para que viajen por WhatsApp e Instagram. **Todavía ninguna placa lo usa**: queda listo para la «placa del dólar» y la «de Colapinto» (K § 12, semana 4).

## 5. Verificación en una compilación real

`cd web && npm run build` sobre las 500 notas que hay hoy en `web/data/`, dos veces: apagada y con `NOTAS_CON_DATOS=si`.

| | Apagada | Prendida |
|---|---|---|
| Notas con página | 500 | 500 |
| Notas con algún bloque | **0** (ningún `bloque-de-datos` en todo `web/out`) | **48** (43 «Antes en Radar», 4 ficha de Colapinto, 2 tira del dólar; la de Colapinto y Ruanda lleva dos) |
| Archivos del sitio | 3.893 de 20.000 | 3.893 de 20.000 |
| Páginas de nota idénticas byte a byte (sin el identificador de compilación de Next) | — | **450** |
| Páginas distintas sin bloque | — | 2, por el «hace 21 h» / «hace 20 días» que corre con el reloj entre las dos compilaciones |
| Peso de una nota con bloque | — | +9,5 KB («Antes»), +14 KB (Colapinto), +21 KB (dólar): el dibujo viaja dos veces, en el HTML y en los datos de Next |
| Tiempo de la compilación | 5 min 22 s la primera vez (en frío), después unos 3 min | unos 3 min |

En las siete notas que se guardaron para comparar (las dos del dólar, dos de Colapinto, la LALCEC, el Concejo y una de control sin bloque), la página prendida es **igual a la apagada salvo el bloque, su hoja de estilo, la cantidad de datos de Next y el JSON-LD**; la de control es idéntica. **Datos estructurados:** el `NewsArticle` es igual salvo que suma `mentions` (las notas que enlaza «Antes en Radar»; la persona, en la ficha de Colapinto) y `citation` (Jolpica o DolarApi, sumada a las fuentes de siempre; `isBasedOn` no cambia). Apagada, el marcado es exactamente el de siempre (una prueba lo compara con `===`).

### Antes y después

**Nota `105sqmh`, «Franco Colapinto compite el fin de semana en el Gran Premio de Estados Unidos»** (Automovilismo).
*Antes:* título, bajada, tres párrafos y «Fuentes (2)». *Después:* los mismos, y abajo:

```html
<section class="bloque-de-datos" aria-labelledby="bd-f1" data-bloque="f1">
 <h2 id="bd-f1">Colapinto en el campeonato de 2026</h2>
 <ul class="bd-resumen">
  <li>Colapinto es 12º en el campeonato de pilotos de 2026, con 27 puntos, después de la carrera 17 de 23.</li>
  <li>Su compañero de equipo en Alpine F1 Team, Pierre Gasly, es 10º con 41 puntos.</li>
  <li>En el Gran Premio de Singapur largó 15º y abandonó tras 29 vueltas.</li>
 </ul>
 <figure><div><svg … viewBox="0 0 480 76" role="img"> (título, descripción y 7 elementos) </svg></div></figure>
 <details class="bd-tabla"><summary>Ver los datos en una tabla</summary> <table class="g-tabla"> (6 filas) </table></details>
 <p class="bd-fuente">Fuente: <a href="https://github.com/jolpica/jolpica-f1" …>Jolpica F1 (datos abiertos)</a> · dato del <time dateTime="2026-10-24">24/10/2026</time> · armado por Radar Balcarce</p>
</section>
```

**Nota `3vccru`, «El dólar oficial alcanza su valor máximo del año tras una nueva suba»** (Economía, 21/10).
*Antes:* título, bajada, cuerpo y «Fuentes (4)». *Después:*

```html
<section class="bloque-de-datos" aria-labelledby="bd-dolar" data-bloque="dolar">
 <h2 id="bd-dolar">El dólar en las últimas semanas</h2>
 <p class="bd-intro">Precio de venta en los 18 días hábiles con cotización guardada, hasta el 21/10.</p>
 <ul class="bd-resumen">
  <li>Dólar oficial: $1.545 (venta) al 21/10/2026; frente al 14/10, +0,7%.</li>
  <li>Dólar blue: $1.570 (venta) al 21/10/2026; frente al 14/10, +1,3%.</li>
 </ul>
 <figure><div><svg … viewBox="0 0 480 250" role="img"> (líneas de oficial y blue, el último punto marcado) </svg></div></figure>
 <details class="bd-tabla"><summary>Ver los datos en una tabla</summary> <table class="g-tabla"> (18 días) </table></details>
 <p class="bd-nota">Cotización de las 11 de la mañana de cada día hábil, guardada por Radar Balcarce desde el 25/09/2026.</p>
 <p class="bd-fuente">Fuente: <a href="https://dolarapi.com" …>DolarApi.com</a> · dato del <time dateTime="2026-10-21">21/10/2026</time> · armado por Radar Balcarce</p>
</section>
```

**Nota `vsnnzb`, «LALCEC realiza su tradicional caminata anual en la plaza Libertad»** (Salud).
*Antes:* sin nada sobre lo anterior. *Después:* «Antes en Radar — Una nota nuestra anterior sobre el mismo tema: 23/10/2026 · LALCEC Balcarce organiza una caminata de concientización sobre cáncer de mama» (con enlace) y «Fuente: Archivo de Radar Balcarce · dato del 23/10/2026».

Se miraron en el navegador, en escritorio y en un celular de 390 px (sin desborde horizontal), con tema claro y oscuro: el bloque se lee igual.

## 6. Qué no se hizo (y por qué)

- **El grupo de control de la mitad de las notas** que proponía G § 4: el interruptor es global. Si se quiere comparar contra un control, se agrega un criterio (por ejemplo, el id par) en `bloquesDeLaNota`; no se hizo para no sumar una decisión de diseño sin preguntar.
- **«Qué dicen las fuentes», «Para Balcarce» y las fichas locales** (G P2 y P3): fuera de este piloto.
- **Las otras fuentes de datos de K** (BCRA, ArgentinaDatos, Open-Meteo histórico, ESPN por equipo): módulos de ingesta nuevos y, en el caso de Open-Meteo, una duda de licencia comercial que hay que resolver antes.
- **Ninguna placa usa todavía los gráficos.** Se probó que se pueden usar.

## 7. Qué mirar cuando se prenda

1. Que ninguna nota con bloque reciba una corrección por un error del bloque (`web/data/correcciones-auditoria.json`).
2. Los enlaces de «Antes en Radar»: si alguno no cuenta lo mismo, subir `PARECIDO_MINIMO` o anotar el caso en una prueba.
3. Clics a esos enlaces, páginas por visita y tiempo en página (Cloudflare Web Analytics, `web/data/estadisticas.json`), y a las 3 o 4 semanas las impresiones en Search Console contra las notas sin bloque (G § 4).

## 8. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| El motor de gráficos | `web/lib/graficos.js` |
| Los tres bloques, el interruptor, los filtros de seguridad y el marcado | `web/lib/bloques-de-datos.js` (`bloquesPrendidos`, `puedeLlevarBloques`, `antesEnRadar`, `fichaDeF1`, `tiraDelDolar`, `marcadoConBloques`) |
| Lo que lee del disco | `web/lib/bloques-del-sitio.js` (`bloquesDeUnaNota`: sin la variable no abre ningún archivo) |
| Lo que se dibuja | `web/components/bloque-de-datos.js`; se enchufa en `web/app/nota/[id]/page.js` y en `web/components/ficha.js` |
| La ficha de Colapinto (el dato) | `fichaDeColapinto` y `comoTerminoLaCarrera`, en `ingesta/f1.mjs` |
| La variable | `NOTAS_CON_DATOS`: `actualizar.yml`, `motor-variables.yml`, `infra/motor-cloudflare/cargar-variables.mjs`, `VARIABLES_DEL_SITIO` (`web/scripts/huella-del-sitio.mjs`) |
| Las pruebas | `pruebas/notas-con-datos-323.test.mjs` (38) |

## 9. Un hallazgo al pasar

En `actualizar.yml`, el paso «Compilar el sitio» (y el de «Volver a compilar») **no recibe** `SITEMAP_PARTIDO` ni `SITEMAP_DEL_ARCHIVO` (sólo el paso de armar los datos y los de la huella), aunque `web/app/sitemap.js` los lee al compilar. En Workers Builds llegan bien (`cargar-variables.mjs`), así que hoy no pasa nada; en el camino de vuelta atrás de GitHub, las dos variables no harían efecto. No se tocó (no es de este piloto): `NOTAS_CON_DATOS` sí se puso en los cuatro pasos que la necesitan.
