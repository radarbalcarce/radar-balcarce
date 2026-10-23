# Catálogo de números y reglas de selección

*Hecho el 23/10/2026 a pedido de Hernán: "esas cosas de 12, 36 horas... hay que ver si están bien, si tienen coherencia, si hay que modificarlas, y detallarlas bien para entenderlas". Es una auditoría de lectura: nada de lo que se publica cambió por este documento. Todo lo que dice "recomiendo" es una propuesta que decide Hernán.*

**Cómo leerlo.** Cada tabla es un tema. "Dónde" es el nombre en el código; si el número también está en la tabla de `CRITERIO-EDITORIAL.md` (sección 11), una prueba obliga a que digan lo mismo. "Recomiendo" puede ser **dejar**, **cambiar a X** o **sacar**. Los datos son de `web/data/estadistica-seleccion.json` (días completos del 16 al 22/10), `muy-contadas.json` (23/10), `portada.json`, `uso-ia.json`, `intentos-ia.json` y `redes.json`. Donde el dato no alcanza, lo digo.

---

## 0. Lo más importante, en diez renglones

1. **Lo muy contado se está frenando por palabras sueltas.** El 23/10, de 134 historias de 8 medios o más que no salieron, 25 las frenó el semáforo con palabras como "imputado" (Cristina y Máximo, hasta 19 medios), "denunció" (Boca-Vasco, 11), "niño" (la ameba de Catamarca, 15) o "nene" (Messi llegando a España, 26 medios; la Promoción del fútbol, 28). Y como lo de afuera que queda amarillo ya no va a ninguna persona (regla 200), es un "no" definitivo. Ver § 5.
2. **Una sola palabra de un solo medio frena a toda la historia.** Al juntar repetidas, la nota hereda el peor color de cualquiera del grupo (`quitarRepetidas`, 8/10). Cuantos más medios la cuentan, más fácil que alguno diga "nene": los más populares son los que más sufren. Ver § 5.
3. **La lectura con IA saca fútbol argentino por "es del extranjero".** El 23/10, Estudiantes en la Libertadores (20, 9 y 8 medios), Marcos Rojo y el TAS (13 y 8), el Torque-Mineiro, la final de la Sudamericana (12) salieron por ese motivo. Ver § 6.
4. **Casi la mitad de lo muy contado "no sale" por "otros".** 89 de 134 el 23/10 (sin motivo nombrable). La mayoría es "llegó tarde" (más de 12 horas; la regla 287 de hoy lo subió a 24 para 8 medios o más). Hay que ver mañana cuánto queda en "otros" ya con la estadística nueva. Ver § 1 y § 3.
5. **En días normales, entre 2 y 3 medios hay mucho para sumar.** El 22/10 quedaron afuera 193 historias de 2 medios que habrían salido si el mínimo fuera 2 (hoy salieron 126 notas en total). No lo recomiendo en bloque, pero sí para Agro y Automovilismo (ver § 3).
6. **Agro salió 0 notas el 22/10 (llegaron 139) y Ciencia 0 (33).** Hernán pidió que todas las secciones tengan notas todos los días. Agro y Automovilismo pedían 2 medios hasta la regla 260 y hoy piden 3.
7. **Facebook llega al tope de 5 casi todos los días desde el 30/09** (sólo bajó a 4 y 3 el 3 y 4/10): el tope manda siempre. El motivo ("página nueva, 90 posteos son ruido", 21/09) ya no es el de hoy. Ver § 7.
8. **El mínimo de relevancia de Facebook (75) deja afuera a un tercio de lo de Balcarce.** De 34 notas de Balcarce en la portada de hoy, 18 tienen menos de 75 (puntajes de 58 a 74). Ver § 7.
9. **Hay números que quedaron de la época de los cupos o del celular de la PC y ya no hacen nada** (o casi): `ESPERA_PERSONA.deAcaPorDia`, `REESCRITURA.reservaParaLocales`, `AMARILLO_QUE_SE_SUELTA_*`, `aflojaParaLoDeAca`, `laMuerteFrena`. Ver § 9.
10. **El cupo diario de la IA (450 redacciones) es 2 o 3 veces lo que se usa** (máximo 191 en una semana): no limita, y está bien así; pero los comentarios dicen que es lo que obliga a elegir.

---

## 1. Ventanas de tiempo (cuándo entra, cuánto dura, cuándo se va)

La película completa de una nota: *se publica la fuente* (T) → *el robot la ve* (cruce) → *se estrena* (hasta 12 horas después de T, o 24 si la cuentan 8 medios o más) → *está en portada y secciones* (hasta 36 horas después de T) → *queda con página* (hasta 180 días o el tope de 3.700 notas).

| Qué es | Dónde (nombre y archivo) | Valor | Qué hace | De cuándo y por qué | Recomiendo |
|---|---|---|---|---|---|
| Horas en portada | `PORTADA.horas` / `HORAS_EN_PORTADA` (`web/lib/archivo.js`) | 36 | Una nota se ve en la portada, secciones, buscador y feed hasta 36 horas después de su fecha. Pasado eso, sólo se llega por su enlace o por el archivo. | 28/09, Hernán: "en la tapa, lo que pasó entre ayer y hoy" (eran 72). | **Dejar.** Es coherente con el estreno (12 o 24 h): una nota nueva vive entre 12 y 36 h a la vista. Si Hernán quiere "nada viejo", no subir. Con la web recién arrancando, bajar a 24 dejaría las secciones muy flacas. |
| Horas para estrenar | `PORTADA.horasParaEstrenar` / `HORAS_PARA_ESTRENAR` (`web/lib/archivo.js`) | 12 | Una nota que nunca salió no se estrena si el hecho (su fecha) ya tiene más de 12 horas. | 28/09, Hernán eligió 12 entre 2, 12 y 24: "no tomar notas de hace dos o tres días" (40 de 140 salían con más de 24 horas por esperar medios o cuerpo). | **Dejar para lo de 3 medios.** Lo que ya salió no se baja. El costo: lo que junta el tercer medio tarde (después de 12 h) se pierde aunque sea cierto. |
| Horas para estrenar si es muy contada | `PORTADA.horasParaEstrenarMuyContada` / `HORAS_PARA_ESTRENAR_MUY_CONTADA` (`web/lib/archivo.js`) | 24 | Igual, pero si la cuentan 8 medios o más (`MEDIOS_MUY_CONTADA`), alcanza con que el hecho tenga hasta 24 horas. | 23/10, Hernán: "más de 8 fuentes debería ser algo súper relevante" (regla 287; antes las 12 dejaban sin salir 150 a 250 historias por día). | **Dejar**, y mirar mañana la estadística separada. Si siguen quedando muy contadas en "llegó tarde", subir a 36 (que es lo mismo que la portada) para lo de 8+. |
| Cuántos medios es "muy contada" (copia en `archivo.js`) | `MEDIOS_MUY_CONTADA` (`web/lib/archivo.js`) vs `MUY_CONTADA.medios` (`ingesta/criterio.mjs`) | 8 y 8 | El mismo 8 vive en dos archivos porque la web no puede importar de `ingesta/`. | 23/10. | **Dejar**, la prueba los iguala. Es un número duplicado: si alguien cambia uno, la prueba avisa. |
| Horas de un hecho (fecha) | `HORAS_DE_UN_HECHO` (`web/lib/archivo.js`) | 48 | Una fuente que tiene más de 48 horas de diferencia con la primera vez que la vimos no cuenta para la fecha de la nota (se supone que es de otro hecho pegado). | 17/10, regla 194. | **Dejar.** Es igual a `CRUCE.coherente.horasEnDesarrollo` (48) y mayor que el estreno máximo (24): coherente. |
| Hasta cuándo se estrena vieja | `DESDE_QUE_NO_SE_ESTRENA_VIEJA` (`web/lib/archivo.js`) | 28/09 13:00 | Desde esa fecha rige la regla del estreno; antes, no. | 28/09. | **Dejar** (es histórica, sólo corrige notas viejas). |
| Entrada gruesa de lo raspado y de los feeds de acá | `HORAS_DE_UNA_NOTA_NUEVA` (`ingesta/ingesta.mjs`) | 72 | Lo que un medio de acá (o lo raspado del Diario) trae con más de 72 horas y nunca salió, no entra al cruce. | 27/09 (raspado) y 16/10 (feeds de acá, regla 180). | **Cambiar a 36 para feeds de acá que nunca salieron.** Hoy una nota de acá de 40 a 72 horas entra al cruce, puede arrastrar a otras y nunca podrá estrenarse (el estreno es 12 h). Es un colador de más: no hace daño visible, pero engaña (aparece en la estadística como "otros"). Bajo riesgo. |
| Memoria del cruce, lo de afuera | `CRUCE.horasDeMemoria` (`ingesta/cruce.mjs`) | 36 | El cruce recuerda 36 horas lo que ya vio de afuera para poder sumarle medios. | 27/09. | **Dejar.** Está bien que sea igual a la portada. Más memoria sólo sumaría notas que no se pueden estrenar. |
| Memoria del cruce, lo de acá | `CRUCE.horasDeMemoriaDeAca` | 72 | Lo de los medios de Balcarce se recuerda 72 horas (porque se republican con otras palabras uno o dos días después). | 17/10, regla 195 (Campo de Pato salió tres veces). | **Dejar.** Aunque sea mayor que el estreno, su objetivo es *no repetir*, no estrenar. |
| Hecho entre primera y última nota | `CRUCE.coherente.horasDeUnHecho` | 30 | Un grupo del cruce no puede abarcar más de 30 horas entre su primera y su última nota; si pasa, se parte. | 16/10, regla 184. | **Dejar.** Con `horasEnDesarrollo` (48, si se parecen mucho) es consistente con las 48 de `HORAS_DE_UN_HECHO`. Ojo: 30 es mayor que el estreno de 12 pero menor que 36 de portada; es normal, mide otra cosa. |
| Cuánto dura una página | `PORTADA.diasDeArchivo` / `DIAS_DE_ARCHIVO` | 180 | Pasados 180 días la nota pierde su página. | 25/09, por el enlace en redes y Google. | **Dejar**, pero sabiendo que **manda el tope de notas**: a 46 por día, 3.700 notas son unos 80 días, no 180. Hoy el real es el tope. Dato: 126 notas el 22/10, 136 el 21/10; a ese ritmo el tope se llena en 30 días y las viejas pasan a R2. |
| Tope de notas con página | `PORTADA.maximoDeNotas` / `MAXIMO_EN_ARCHIVO` | 3700 | Cuántas notas pueden tener página a la vez (límite de 20.000 archivos de Cloudflare). | 15/10, medido. | **Dejar.** Ya se achica con `TOPE_DE_NOTAS` y R2 (23/10). El texto "a ~46 por día" ya no es cierto: hoy son más de 100 por día. Conviene corregir esa frase en `CRITERIO-EDITORIAL.md` la próxima vez que se toque. |
| Horas de la nota grande | `PORTADA.horasNotaGrande` / `VENTANA_HORAS` (`web/lib/datos.js`) | 6 | Una nota compite por el lugar grande de la portada sólo 6 horas. | 25/09. | **Dejar.** |
| Horas primera en su sección (muy contada) | `MUY_CONTADA.horasPrimeraEnSuSeccion` / `HORAS_MUY_CONTADA_PRIMERA` (`web/lib/datos.js`) | 6 | Lo muy contado va primero en su sección 6 horas. | 17/10, regla 197. | **Dejar.** Dos números 6 distintos (nota grande y primera en sección), que hacen cosas parecidas y que podrían ser uno. No los junto: son claves distintas en la tabla. |
| Horas del hecho para ser muy contada | `MUY_CONTADA.horasDelHecho` | 24 | Sólo es muy contada si el hecho tiene menos de 24 horas. | 17/10. | **Dejar.** Es el mismo número que `horasParaEstrenarMuyContada` (24): ya no se contradicen. |
| Horas de la última nota (muy contada) | `MUY_CONTADA.horasDeLaUltimaNota` | 12 | Si ninguna nota del grupo es de las últimas 12 horas, la historia se enfrió y no es "muy contada". | 17/10. | **Cambiar a 24, o sacar.** Contradicción menor: el estreno de 8+ medios acepta hasta 24 h (`horasParaEstrenar`), pero no va primera ni se marca "muy contada" si su última nota tiene más de 12. Una historia grande de ayer a la noche entra pero sin la marca. Si se quiere simple: igualar a 24. |
| Edad máxima de un tema en el puntaje | `relevancia()` (`ingesta/ingesta.mjs`): menos de 3 h +25, menos de 12 h +15, menos de 24 h +8 | 3 / 12 / 24 | Cuanto más nueva la nota, más puntaje. | 21/09. | **Dejar.** El 12 coincide con el estreno. |
| Días de retiradas a mano | `DIAS_DE_RETIRADAS` (`web/lib/archivo.js`) | 7 | Lo retirado a mano se olvida a los 7 días (porque ya no se puede estrenar). | 28/09. | **Dejar.** OK mientras el estreno máximo sea 24 h. |
| Días con análisis en el archivo | `DIAS_CON_ANALISIS` | 4 | Pasados 4 días se les quita a las notas lo que sólo ve la redacción. | 29/09, para achicar `archivo.json`. | **Dejar.** El comentario dice "ya no está en la ingesta (72 horas)": es cierto con `HORAS_DE_UNA_NOTA_NUEVA`. |
| Días sin cuerpo antes de podar | `DIAS_SIN_CUERPO` | 3 | Una nota automática sin cuerpo se saca del archivo a los 3 días. | 8/10. | **Dejar.** |
| Días de intentos recordados | `REESCRITURA.diasDeIntentos` | 7 | La memoria de cuántas veces se le pidió una nota a la IA dura 7 días. | 25/09. | **Cambiar a 3.** Una nota que lleva más de 24 horas ya no se estrena (llega tarde): recordar 7 días no sirve para nada, sólo agranda `intentos-ia.json` (838 notas hoy). Bajo riesgo. |
| Días de fichas | `LECTURA.diasDeFichas` | 3 | Una ficha de la lectura con IA se guarda 3 días. | 27/09. | **Dejar.** |
| Días de antecedentes | `REESCRITURA.diasDeAntecedentes` | 30 | La IA recibe como contexto hasta 3 notas nuestras de los últimos 30 días. | 29/09. | **Dejar.** |
| Estadística: días guardados | `DIAS_GUARDADOS`, `DIAS_DE_HISTORIAS`, `DIAS_DE_UN_SOLO_MEDIO` (`ingesta/estadistica-seleccion.mjs`) | 60 / 4 / 3 | Cuánto recuerda la estadística. | 17/10. | **Dejar.** |

---

## 2. Cuántos medios hacen falta (popularidad)

| Qué es | Dónde | Valor | Qué hace | De cuándo y por qué | Recomiendo |
|---|---|---|---|---|---|
| Mínimo nacional | `POPULARIDAD.minimoNacional` / variable `MINIMO_NACIONAL` (`ingesta/popularidad.mjs`) | 3 | Lo de afuera sale si lo cuentan 3 medios distintos (los del mismo dueño cuentan uno). | 17/10, regla 260, Hernán: "sólo a partir de 3 fuentes". | **Dejar esta semana; decidir el lunes con datos.** Dato: el 22/10 llegaron 3.113 historias, 126 se publicaron; con 2 medios habrían salido unas 193 más (índice "2 medios" de `habrian`), o sea, un 150% más. Demasiado de golpe. Más fino: ver abajo (áreas). |
| Mínimo de las áreas chicas | `POPULARIDAD.minimoAreasChicas` / `MINIMO_AREAS_CHICAS` | 2 | Tecnología, Ciencia, Salud, Educación y Cultura piden 2 medios, con control de calidad (`controlDeCalidad`). | 17/10, regla 260. | **Dejar.** |
| Qué áreas son chicas | `AREAS_CHICAS` (`ingesta/criterio.mjs`) | Tecnología, Ciencia, Salud, Educación, Cultura y agenda | Cuáles piden 2 medios. | 17/10: Agro y Automovilismo salieron de la lista. | **Sumar Agro y Automovilismo.** Dato (22/10): Agro llegó con 139 historias, salieron 0 (9 quedaron por "pocas fuentes", 8 habrían salido con 2 medios); Automovilismo llegó con 122, salieron 4 (15 por "pocas fuentes"). Balcarce es zona agropecuaria y de fierros, y Hernán pidió "todas las secciones con notas todos los días". Cambio de una palabra por sección. |
| Rango válido de las variables | `numeroDeLaVariable` (`ingesta/popularidad.mjs`) | 2 a 10 | Una variable fuera de 2 a 10 se ignora. | 17/10. | **Dejar.** Nunca con un solo medio. |
| Muy contada: medios | `MUY_CONTADA.medios` | 8 | Desde 8 medios es "súper relevante": va primera, se estrena hasta 24 h. | 17/10, regla 197, medido sobre 50 medios del país. | **Dejar.** Dato: el 23/10 hubo 134 historias de 8+ que no salieron (mediana 12 medios, máximo 29). Con 8 el filtro no es demasiado alto. Cuidado: si cambia la lista de fuentes, el 8 significa otra cosa. |
| Muy contada: medios rápidos (día/noche) y horas | `mediosRapidos` 5, `mediosRapidosDeNoche` 4, `horasRapidas` 3, `nocheDesde` 20, `nocheHasta` 7 | 5 / 4 / 3 h / 20 / 7 | También es muy contada con 5 medios en las primeras 3 horas (4 si empezó de noche). | 17/10: "de las que juntan 5 en 3 horas, el 85% termina con 8 o más". | **Dejar.** Es el único que adelanta; está medido. |
| Muy contada: tope por tema | `MUY_CONTADA.porTema` | 2 | Como mucho 2 historias del mismo tema van "primeras" a la vez. | 17/10 (cinco historias de la marcha universitaria). | **Dejar.** Sólo ordena; la tercera sale igual. Ojo: no es un cupo de publicación. |
| Muy contada de acá | `MUY_CONTADA.mediosDeAca` | 3 | Si 3 medios de Balcarce la cuentan, es la primera candidata a nota grande y Facebook (y no pide relevancia mínima). | 17/10, regla 198. | **Dejar.** |
| Medios para ir a redes (lo de afuera) | `FACEBOOK.mediosParaRedes` | 5 | Lo de afuera sólo va a Facebook/Instagram si lo cuentan 5 medios o más. | 17/10, regla 280, Hernán: "las más populares que tengamos". | **Cambiar a 8 (= muy contada)** o dejar. Hoy hay tres escalas (3 para el sitio, 5 para las redes, 8 para "súper relevante"). Con una sola idea de "súper relevante" sería más simple de explicar. Hernán decide. Dato: el 21 y el 22/10 se publicaron unas 55 a 80 historias de afuera con 5 medios o más por día. |
| Puntaje por medios | `PUNTAJE.porDuplicarMedios` | 8 | Suma 8 puntos cada vez que se duplican los medios (2: +8, 4: +16, 8: +24...). | 17/10, regla 197. | **Dejar.** Sólo ordena. |
| Horas por duplicar medios | `POPULARIDAD.horasPorDuplicarMedios` (`web/lib/datos.js`) | 2 | Al ordenar una sección, cada duplicación de medios hace que la nota valga 2 horas más nueva. | 17/10. | **Dejar.** |
| Secciones sólo de acá | `SECCIONES_SOLO_DE_ACA` | Policiales | Policiales de afuera no sale solo, ni con 30 medios (salvo `policialNacionalRelevante`). | 26/09. | **Dejar.** |

---

## 3. Qué pasa con cada historia (datos reales, 16 al 22/10)

Cuántas llegan y cómo terminan, por día (estadística de la selección):

| Día | Llegaron | Se publicaron | De afuera publicadas | Quedaron en "un solo medio" | Por "la IA la sacó" | Por "pocas fuentes" | Por semáforo | Por "otros" |
|---|---|---|---|---|---|---|---|---|
| 16/10 | 856 | 57 | 43 | 520 | 108 | 45 | 17 | 95 |
| 17/10 | 834 | 62 | 54 | 305 | 198 | 73 | 35 | 139 |
| 18/10 | 761 | 75 | 59 | 79 | 205 | 130 | 47 | 203 |
| 19/10 | 1.017 | 109 | 82 | 325 | 228 | 99 | 59 | 176 |
| 20/10 | 1.117 | 115 | 96 | 272 | 265 | 135 | 64 | 226 |
| 21/10 | 1.634 | 136 | 118 | 665 | 301 | 154 | 63 | 271 |
| 22/10 | 3.113 | 126 | 104 | 1.996 | 335 | 220 | 77 | 322 |

(El salto de "llegaron" del 22/10 viene de que se empezaron a contar los de un solo medio de todos los feeds, no de que haya más noticias.)

Lectura honesta de la tabla:

- **"Otros" es el agujero más grande: 322 historias por día sin motivo.** No se sabe si son "llegaron tarde", "retiradas" o qué. La regla 287 de hoy ya las separa en la estadística; el lunes hay que mirar cuánto queda realmente en "otros".
- **"La IA la sacó": 335 por día** (el motivo más común después de "un solo medio"). Ver § 6: parte de eso es fútbol argentino por "extranjero" y chimentos de muchos medios.
- **"Pocas fuentes": 150 a 220 por día**: son las historias de 2 medios en secciones que piden 3. Son las candidatas del lunes.
- **Publicadas en estos 7 días: 57 a 136 por día**, lejos de los "unos 150" que Hernán dijo que serían un buen techo.
- Por sección el 22/10 (llegaron / salieron): Política 341/29, Argentina 1.236/13, Fútbol 416/19, Economía 276/19, Cultura 228/18, Agro 139/**0**, Ciencia 33/**0**, Deportes 72/1, Salud 66/2, Tecnología 73/3, Educación 71/6, Automovilismo 122/4. **Argentina publica 13 de 1.236**: casi todo "un solo medio" (926) o "la IA" (193).

---

## 4. Puntajes (relevancia) y qué sirve cada uno

La relevancia (0 a 100) NO decide si una nota sale (desde la regla 260 eso lo decide la popularidad). Sirve para **ordenar**, para **elegir qué va a Facebook** y para **elegir qué entra en los podcasts**.

| Qué es | Dónde | Valor | Qué hace | Recomiendo |
|---|---|---|---|---|
| Peso de la fuente | `peso` en `ingesta/fuentes.mjs` | 7 a 30 (los de acá 24 a 30; la mayoría de afuera 11 a 14) | Lo que suma la fuente de base. | **Dejar.** Es lo que hace que una nota de Balcarce de un medio de 12 puntos quede en 72 aun siendo nueva y con foto (12+25+25+6+4). |
| Es de Balcarce | `relevancia()` | +25 | Lo de Balcarce. | **Dejar.** |
| Nombra Balcarce / figura / automovilismo | `relevancia()` | +22 / +16 / +8 | Que un medio nacional nombre a Balcarce, una figura argentina, la tierra de fierros. | **Dejar.** |
| Tiene foto / texto completo | `relevancia()` | +6 / +4 | Premia lo completo. | **Dejar.** |
| Tope | `relevancia()` | 100 | Máximo. | **Dejar.** |
| Mínimo de Facebook (Balcarce) | `FACEBOOK.relevanciaMinima` | 75 | Una nota de Balcarce necesita 75 para ir sola a Facebook (salvo "muy contada de acá"). | **Cambiar a 62 (el mismo que pide un podcast).** Datos reales (portada de hoy, 34 notas de Balcarce): 58, 58, 59, 59, 59, 60, 60, 60, 60, 63, 63, 63, 63, 67, 67, 67, 74, 74 quedan afuera (18 de 34); con 62 pasarían 9 de esas 18 y serían 25 las elegibles en vez de 16. El puntaje además **baja con las horas** (la frescura sale), de modo que una nota que a las 11 tenía 80 a las 15 tiene 70: la elegibilidad depende de la hora a la que pase el reloj. La edad máxima ya está en 8 horas. Con 62 la elección sigue siendo la mejor del día porque el tope de 5 (o de 8) manda. |
| Mínimo para un podcast | `PIEZAS.relevanciaPodcast` | 62 | Una nota entra en un repaso con 62. | **Dejar.** Es menor que el de Facebook a propósito. |
| Mínimo de afuera en un podcast | `PIEZAS.relevanciaAfueraPodcast` | 80 | Una nota de afuera entra en un repaso sólo con 80. | **Cambiar a 70, o dejar.** Dato: de 81 notas de afuera en la portada de hoy, **sólo 1** tiene 80 o más y 8 tienen 62 o más; es casi un "nunca" que la regla dice "podrían ser también de afuera si son las mejores" (Hernán, 29/09). No tiene el mismo sentido que `mediosParaRedes`: si lo muy contado (8+) es lo que le interesa, mejor elegir por medios (`mediosDeLaNota >= 8`) y no por puntaje. |
| Notas por podcast | `PIEZAS.notasPorPodcast`, `notasMinimasPodcast`, `notasDeAfueraPorPodcast` | 4 / 2 / 2 | Largo del repaso. | **Dejar.** El largo lo limita la voz (55 segundos). |

---

## 5. El semáforo (palabras que frenan) — donde está el problema principal

Cómo funciona hoy: **rojo** = nunca (menores, víctimas, sepelios, "no es nota", efemérides ajenas). **Amarillo** = espera a una persona. Pero desde la regla 200 (17/10) **lo de afuera que queda amarillo no va a ningún celular**: si no sale solo, no sale. Y desde el 22/10 **lo de acá (esDeAca) ya no frena por amarillo**. O sea que hoy el amarillo es, en la práctica, "rojo para lo de afuera".

| Qué es | Dónde | Valor | Qué hace hoy | Recomiendo |
|---|---|---|---|---|
| Lista roja | `REGLAS_SEMAFORO.rojo` (`ingesta/fuentes.mjs`) | ~45 frases | No se publica nunca. Leyes 26.061 y 26.485. | **No tocar sin preguntar** (regla de la casa). Una observación para Hernán, no cambio: "violencia de género" frena notas de política/justicia que no identifican a nadie (23/10: Moyano y Arizaga, 8 medios). |
| Lista "nunca" | `REGLAS_SEMAFORO.nunca` | ~16 frases | Sepelios y fúnebres, sólo en el título. | **Dejar.** |
| Amarillo: acusados | `REGLAS_SEMAFORO.amarillo`: "denuncia", "denunció", "detenido", "acusado", "imputado" | 6 palabras | Frena a lo de afuera aunque lo cuenten 30 medios (`semaforoDelTexto`: la liberación por "corroborada" sólo vale para lo de acá). Frenó el 23/10: Hotesur con Cristina (19, 17, 11 y 8 medios), Vallejo detenido (15), Boca-Vasco por "denunció" (11, 10, 8 medios), Discapacidad (8). | **Cambiar:** para lo de afuera contado por 3 medios o más, soltar estas 6 palabras (lo que no hay que soltar sigue estando en el rojo y en la regla de la IA de no acusar como hecho). Es lo que ya se hace con lo de acá desde antes. Cambio chico: pasar `corroborada` también a lo de afuera con `medios >= minimoNacional()`. |
| Amarillo: chicos | "adolescente(s)", "niño/niña", "nene/nena", "menores de edad", "bebé", "alumno de"... | ~25 | Frena a lo de afuera aunque sea ameba en Catamarca (13 y 15 medios), Milei con "niños" (8), Messi (26) y la Promoción (28) por "nene". | **Cambiar, con permiso de Hernán** (toca el cuidado de menores): para lo de afuera con 8 medios o más (muy contada), mirar la palabra sólo en el título y el principio de la nota principal, no en cualquier medio del grupo, y no frenar si ya es una nota de la sección Fútbol/Economía/Política. El cuidado real (no identificar al menor) ya lo cubren el rojo y el verificador contra la fuente. |
| Amarillo: delitos graves y víctimas | "homicidio", "asesinato", "cadáver", "víctima", "apuñalado", "baleado" | ~10 | Frena. | **Dejar.** Policiales de afuera de todos modos no sale solo. |
| Muertes y heridos | `amarilloMuerte` (`REGLAS_SEMAFORO`) | ~30 | Sólo frena si es Policiales/Balcarce/de acá/de la zona o lo cuenta un solo medio (`laMuerteFrena`). | **Dejar.** Ya es mínimo: "murió Tom Skerritt" no se frena. |
| Libera lo de acá | `AMARILLO_QUE_SE_SUELTA_EN_LO_DE_ACA`, `AMARILLO_QUE_SE_SUELTA_SI_LA_CONFIRMAN`, `aflojaParaLoDeAca` | 3 + 3 palabras | Soltaban "denuncia/detenido/acusado/imputado" para lo de acá. | **Sacar:** desde el 22/10 lo de acá no frena por ninguna palabra amarilla, así que estas listas ya no hacen nada para lo de acá. Hoy tampoco se aplican a lo de afuera (el motivo del problema de arriba). Conviene reutilizarlas para lo de afuera (ver fila de "acusados") o borrarlas. |
| Heredar el peor color en repetidas | `quitarRepetidas` (`ingesta/lectura-ia.mjs`, C-12, 8/10) | todo el grupo | Si un solo medio del grupo tiene una palabra amarilla o roja, toda la historia queda así. | **Cambiar:** el rojo sí debe heredarse (es ley). El amarillo (necesita ojo humano) **no**, o sólo si la mayoría de los medios del grupo lo tiene. Con 20 medios, que uno diga "nene" no hace "nene" a la noticia. Es el segundo factor del problema de arriba. |
| Cotización del dólar | `REGLAS_SEMAFORO.cotizacion` | ~20 frases | Frena en el título ("Dólar hoy..."). El dólar tiene su propia nota. | **Dejar.** El 23/10 frenó 6 notas de 8 a 16 medios, todas correctas (son el parte diario). Excepción razonable: "El riesgo país vuelve a superar los 700 puntos y el dólar oficial marca un nuevo..." (16 medios) frenó por "dólar oficial": es noticia. Podría restringirse a títulos que *empiezan* con "dólar hoy"/"a cuánto cotiza". |
| Internacional | `REGLAS_SEMAFORO.internacional` | ~35 nombres | Frena Trump, Putin, Ucrania, etc. en el título si no nombra a un argentino. | **Dejar.** Coincide con el criterio ("sólo con un argentino"). |
| Promocional | `promocional`, `promocionalDeAca`, `sorteoConPremio` | listas | Frena sorteos/promos. | **Dejar** (regla 199, medida el 9 al 16/10). |
| Palabras débiles | `PALABRAS_DEBILES` (`ingesta/ingesta.mjs`) | ~35 | Palabras cortas que no deciden la sección salvo desde el titular. | **Dejar.** |
| Bajada de color por verificación BAJA | `FRENO_POR_VERIFICACION` (`reels/reescritura.mjs`) | — | Una nota con verificación BAJA espera a una persona. | **Dejar.** Dato: 16 notas de 838 (2%). Pero con regla 200 también termina en "no sale" si es de afuera. |

---

## 6. Lectura con IA (quién la saca y por qué)

| Qué es | Dónde | Valor | Qué hace | Recomiendo |
|---|---|---|---|---|
| "Es del extranjero" | `aplicarFichas` (`ingesta/lectura-ia.mjs`, línea `ambito === 'internacional'`) | — | La IA marca el ámbito de la historia; si es internacional y no hay figura ni conexión argentina en el **título**, se saca. | **Cambiar:** no sacar si lo cuentan 8 medios o más, ni si es fútbol con equipo argentino. El 23/10 sacó: Estudiantes en la Libertadores (20, 9 y 8 medios), el TAS con Marcos Rojo (13 y 8), la final de la Sudamericana (12), el Montevideo City-Mineiro (10), "El Gobierno declaró terroristas a las FARC y el Cártel de Sinaloa" (12), el Papa León XIV cancelando un viaje (16 y 8) y "Murió Tom Skerritt" (12). Algunos son correctos (Skerritt), otros absurdos (Estudiantes). La excepción por "conexión argentina en el título" depende de una lista de palabras. |
| "Es un chimento" | `aplicarFichas` | — | La IA marca chimento; se saca. | **Dejar** (criterio de Hernán), pero mirar: Julieta Prandi (17 medios), Osvaldo (10). Si Hernán quiere "súper relevante = sale", un chimento de 17 medios es el único caso donde conviene su decisión. |
| Notas por pedido | `LECTURA.notasPorPedido` | 12 | Cuántas notas se leen por pedido. | **Dejar.** |
| Pedidos por corrida | `LECTURA.pedidosPorCorrida` | 5 | Tope técnico por vuelta. | **Dejar.** |
| Pedidos por día | `LECTURA.pedidosPorDia` / `pedidosPorDiaConClavePropia` | 60 / 200 | Tope de lectura por día según la clave. | **Dejar.** El 23/10 ya hubo 71 pedidos (así que tiene clave propia). Hay que vigilar que no se acerque a 200 con las 3.000 historias de ahora. |
| Repetidas y parejas | `pedidosRepetidasPorDia` 60, `pedidosParejasPorDia` 40, `adelantoDeAca` 6 | 60 / 40 / 6 | Topes de pedidos de IA para juntar repetidas. | **Dejar.** Quedan lejos (37 pedidos de repetidas el 23/10 contra un tope de 60). |
| Resumen máximo | `LECTURA.resumenMaximo` | 500 | Caracteres del resumen que ve la IA. | **Dejar.** |

---

## 7. Redes (cuántas notas van, cuándo y a qué)

| Qué es | Dónde | Valor | Qué hace | De cuándo y por qué | Recomiendo |
|---|---|---|---|---|---|
| Posteos por día | `FACEBOOK.porDia` y `CONTRATO_DIARIO.posteosPorDia` | 5 | Máximo de notas por día en Facebook y su espejo en Instagram. | 21/09: "conservador a propósito, página nueva, 90 posteos por día pierde alcance". | **Cambiar a 8** (la propuesta abierta de Hernán del 17/10, `docs/redes/PROPUESTA-POSTEOS-POR-DIA.md`). Dato: `redes.json` muestra **5 por día casi todos los días desde el 30/09** (sólo 4 y 3 el 3 y 4/10), o sea que el tope manda siempre. Con 3 semanas en marcha el motivo del 21/09 ya cumplió su función. Los dos números (porDia y posteosPorDia) hay que cambiarlos juntos. |
| Cuánto esperar entre posteos | `FACEBOOK.minutosEntrePosteos` | 90 | Separación mínima. | 21/09. | **Dejar.** Entre las 8 y las 22 entran 9 posteos de 90 minutos: alcanza para 8. |
| Horario | `FACEBOOK.desdeHora`, `hastaHora` | 8 y 22 | Ventana horaria. | 21/09. | **Dejar.** |
| Espera de una nota nueva | `FACEBOOK.esperaMinutos` | 15 | Que la web termine de desplegar. | 21/09. | **Dejar.** |
| Edad máxima | `FACEBOOK.edadMaximaHoras` | 8 | No se postea una nota que lleva más de 8 horas. | 21/09. | **Dejar.** Es menor que el estreno (12) a propósito. |
| Tema repetido | `FACEBOOK.horasSinRepetirTema` | 24 | Un tema, una vez por día. | 24/09. | **Dejar.** |
| Espera por foto | `FACEBOOK.horasEsperandoFoto` / `horasEsperandoFotoReal` | 3 / 0 | Una nota sin foto espera hasta 3 horas; con sólo ilustración de IA, no espera (apagado). | 8/10 y 17/10. | **Dejar** (la segunda es pregunta abierta, regla 283). |
| Relevancia mínima | `FACEBOOK.relevanciaMinima` | 75 | Ver § 4. | 21/09. | **Cambiar a 62** (§ 4). |
| Medios para lo de afuera | `FACEBOOK.mediosParaRedes` | 5 | Ver § 2. | 17/10. | Ver § 2. |
| Secciones que esperan a una persona | `SECCIONES_QUE_ESPERAN_PERSONA` | Policiales, Política | No van solas a ninguna red. | 21/09. | **Dejar** (regla de la casa). |
| Piezas por corrida | `POR_CORRIDA` (`redes/piezas.mjs`) | 6 | Cuántas piezas se arman por vuelta. | 25/09. | **Dejar.** |
| Reels por día | `CONTRATO_DIARIO.reelsPorDia` | 3 | Los tres repasos. | 25/09. | **Dejar** (limitado por el cupo de voz: 10 audios por día). |
| Historias por día | `CONTRATO_DIARIO.historiasPorDia` / `historiasMaximasPorDia` | 6 / 8 | Historias del contrato. | 25/09. | **Dejar.** |
| Ventanas de las piezas | `VENTANAS` (`redes/piezas.mjs`) | 60 a 300 min | Cuánto tarda en vencerse cada pieza (farmacia 300, podcast 180, útiles 60...). | 25/09 en adelante. | **Dejar.** |

---

## 8. Cuerpo, título y texto (las reglas de escritura)

Los números de la tabla de `CRITERIO-EDITORIAL.md` § 11 (título 70/90, bajada 50 palabras/360 caracteres, cuerpo 70 a 300 palabras, guion 200, partes) están medidos y no encontré contradicciones con otras ventanas. Los que más afectan si una nota sale:

| Qué es | Dónde | Valor | Qué hace | Recomiendo |
|---|---|---|---|---|
| Palabras mínimas de cuerpo | `CUERPO.minimoParaPublicar` / `PALABRAS_MINIMAS_CUERPO` (`web/lib/cuerpo.js`) | 70 | Una nota automática sin 70 palabras de cuerpo no sale. | **Dejar.** Dato: 763 de 838 notas con intentos están "con cuerpo" (91%); sin material 8. No es el cuello. |
| Palabras de material mínimas | `REESCRITURA.palabrasMinimasDeMaterial` | 60 | Con menos de 60 palabras de resumen entre todas las fuentes y sin texto completo, no se le pide nada a la IA. | **Dejar.** |
| Intentos por nota | `REESCRITURA.intentosMaximos` 3, `fuentesParaUnIntentoExtra` 5, `fuentesParaDosIntentosExtra` 8 | 3 / 5 / 8 | Tres intentos, 4 si la cuentan 5 medios, 5 si 8. | **Dejar.** Dato: 690 notas con 1 intento, 93 con 2, 45 con 3, 10 con 4: el sistema casi nunca llega al tope. |
| Verificación baja | `FRENO_POR_VERIFICACION` | — | Verificación BAJA = espera a una persona. | Ver § 5. |
| Fallos para cortar | `FALLOS_PARA_CORTAR` (`reels/reescritura.mjs`) | 3 | Con 3 fallos de la IA en una corrida, se corta. | **Dejar.** |
| Notas por corrida / por día | `REESCRITURA.porCorrida` 40, `porDia` 450, `porDiaSinClaveDeLectura` 330, `reservaParaLocales` 80 | 40 / 450 / 330 / 80 | Topes de pedidos de redacción. | **Dejar los topes; sacar `reservaParaLocales`.** Dato (`uso-ia.json`, 15 al 23/10): la clave de redacción usó entre 116 y 191 pedidos por día; el tope es 450. La reserva de 80 sólo se activaría pasados los 370: no tiene efecto. Es un resto de cuando el cupo era de 150 (26/09). El comentario dice lo contrario. |
| Espera máxima a Gemini | `ESPERA_MAXIMA_GEMINI` | 60 s | Corta un pedido colgado. | **Dejar.** |
| Copia máxima | `COPIA_MAXIMA` | 12 palabras seguidas | Más es copiar. | **Dejar.** |
| Sin tildes | `ESTILO.palabrasSinTilde` | 3 | Con 3 o más palabras sin tilde se rechaza. | **Dejar.** |

---

## 9. Lo que quedó de la época de los cupos o del celular de la PC

Cosas que siguen en el código o en los comentarios pero ya no deciden nada, o decidirían algo que ya no es lo que Hernán pidió:

| Qué es | Dónde | Qué pasa | Recomiendo |
|---|---|---|---|
| `ESPERA_PERSONA.deAcaPorDia` (5) | `ingesta/criterio.mjs`, usado en `panel/celular-datos.mjs` | Dice "sólo lo de acá, hasta 5 por día al celular". Desde el 22 y 23/10 lo de acá casi no queda amarillo, así que casi nunca hay nada que esperar. Sigue siendo un tope sobre las pocas amarillas de acá (verificación baja, sin cuerpo...). | **Sacar el tope o subirlo a 20.** Es un cupo de la época en que había 33 notas por día esperando y nadie las miraba (18 decisiones en total, 8/10). Si queda algo para una persona, que se vea todo. |
| `REESCRITURA.reservaParaLocales` (80) | `ingesta/criterio.mjs` | Ver § 8: nunca se activa. | **Sacar.** |
| `AMARILLO_QUE_SE_SUELTA_*`, `aflojaParaLoDeAca`, `laMuerteFrena` (la parte de "de acá") | `ingesta/fuentes.mjs`, `ingesta/ingesta.mjs` | Pensados para soltar lo de acá; desde el 22/10 lo de acá no frena por amarillo. | **Sacar o reutilizar** (§ 5). |
| `MOTIVO_CUPO` / `esperaPorElCupo` | `ingesta/ingesta.mjs` | Reponen notas que estaban esperando "por el cupo", que se sacó el 17/10. | **Sacar en un tiempo**: sólo sirve para notas guardadas el día del cambio, que ya pasaron (ya no existen). |
| Comentario "el cupo de lo de afuera, hasta el 17/10" | `esDeAca` (`ingesta/ingesta.mjs`) | Texto histórico. | **Dejar** (es historia). |
| `NOTAS_POR_SECCION` (3) | `web/lib/datos.js` | Es cuántas notas muestra cada sección **en la portada**, no un cupo de publicación. | **Dejar**, pero aclarar el nombre con un comentario la próxima vez. |
| `PORTADA.maximoDeNotas` "a ~46 por día" | `ingesta/criterio.mjs` y `CRITERIO-EDITORIAL.md` | Hoy son 100 o más por día. | **Corregir la frase** cuando se toque el documento. |
| `PORTADA.horasNotaGrande` y `MUY_CONTADA.horasPrimeraEnSuSeccion` | ver § 1 | Dos 6 distintos. | **Dejar**, pero tenerlo presente. |

---

## 10. Contradicciones y desfasajes encontrados

Qué se contradice (o puede confundir) y qué hice:

1. **Estreno 12 h vs. muy contada 24 h vs. "última nota 12 h".** El estreno de lo de 8+ ya es 24 (regla 287, hoy), pero `MUY_CONTADA.horasDeLaUltimaNota` sigue en 12, de modo que una historia grande de ayer a la noche *sale* pero sin la marca de "muy contada" ni el lugar de arriba. **Recomendación:** igualar a 24. (No lo cambié: cambia el comportamiento.)
2. **Tres escalas de "popular":** 3 medios (el sitio), 5 (las redes), 8 (súper relevante). **Recomendación:** que las redes usen 8, o explicar por qué 5 (§ 2).
3. **Comentarios desactualizados** (arreglados en este cambio, no cambian nada): `CLAUDE.md`, `ingesta/criterio.mjs` (cabecera) y `web/lib/archivo.js` decían "12 horas" a secas o "24 horas, 12 desde octubre" sin la excepción de 8 medios o más; `ingesta/cruce.mjs` decía "la memoria guarda 36" sin aclarar que lo de acá guarda 72.
4. **Ventanas "viejas" del cruce:** `HORAS_DE_UNA_NOTA_NUEVA` (72) es el doble que la memoria de lo de afuera (36) y seis veces el estreno (12): deja entrar al cruce notas de acá que nunca podrán estrenarse (§ 1).
5. **Intentos recordados 7 días, y las notas llegan tarde a las 12 o 24 horas** (§ 1).
6. **El "36" y el "180":** la nota dura 180 días en teoría, pero el tope de 3.700 la saca antes, a unos 30 días al ritmo de hoy (con R2 se guarda igual). El texto del documento dice "a ~46 por día" (hoy más de 100).
7. **El semáforo amarillo de lo de afuera = rojo** desde la regla 200, pero sus listas se escribieron cuando una persona lo revisaba (§ 5).
8. **Peor color heredado en repetidas** (C-12): protege de lo rojo (correcto) pero también multiplica un amarillo de un solo medio (§ 5).

---

## 11. Los diez cambios que recomiendo, por impacto

(Decide Hernán. Ninguno está hecho.)

| # | Cambio | Cuánto mueve | Riesgo |
|---|---|---|---|
| 1 | Que el amarillo "acusados" (denuncia, denunció, detenido, acusado, imputado) se suelte para lo de afuera contado por 3 medios o más | Libera política y fútbol grande (el 23/10: Cristina/Hotesur, Vallejo, Boca-Vasco...) | Bajo: ya se hace para lo de acá. |
| 2 | Que el amarillo no se herede entre repetidas (sí el rojo) | Libera lo más contado (Messi 26 medios, la Promoción 28) | Bajo, y el rojo sigue igual. |
| 3 | "Es del extranjero" no se aplica con 8+ medios ni a fútbol argentino | Recupera la Libertadores y la Sudamericana | Bajo. |
| 4 | Agro y Automovilismo vuelven a `AREAS_CHICAS` (2 medios) | +unas 20 notas/día entre las dos; Agro sale de cero | Bajo. Una palabra por sección. |
| 5 | Mínimo de Facebook de 75 a 62 | De 16 a 25 notas de Balcarce elegibles al mismo tiempo (portada de hoy) | Bajo (el tope de 5 y el orden siguen). |
| 6 | Facebook de 5 a 8 por día (propuesta abierta del 17/10) | +3 por día | Medio: es plata de alcance (no hay costo de voz). |
| 7 | `horasDeLaUltimaNota` de 12 a 24 | Coherencia con el estreno de 8+ | Ninguno. |
| 8 | Sacar `ESPERA_PERSONA.deAcaPorDia` y `reservaParaLocales`; borrar `AMARILLO_QUE_SE_SUELTA_*` si no se reutilizan | Limpieza | Ninguno. |
| 9 | `HORAS_DE_UNA_NOTA_NUEVA` (feeds de acá que nunca salieron) de 72 a 36, e intentos recordados de 7 a 3 días | Limpieza y menos ruido en la estadística | Bajo. |
| 10 | Lunes: decidir `MINIMO_NACIONAL` mirando la estadística nueva (con "llegó tarde" y "retirada" separadas de "otros"); no antes | Podría sumar hasta unas 190 notas por día si se baja a 2 | Alto si se hace en bloque. |

---

*Qué no revisé a fondo:* los topes de las ilustraciones con IA (`web/scripts/ilustrar-notas.mjs`), los de la revisión del archivo, las reglas de fotos y los pesos de cada fuente (uno por uno). No encontré contradicciones con lo de arriba, pero no los medí con datos.
