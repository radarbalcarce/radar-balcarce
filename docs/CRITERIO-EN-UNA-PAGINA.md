# El criterio en una página: qué sale, qué no y por qué

*Escrito el 23/10/2026 mirando el código, no los documentos viejos. Si esto y el código no coinciden, manda el código y se corrige esta página.
El detalle completo está en `CRITERIO-EDITORIAL.md` y los números, en `ingesta/criterio.mjs`.*

## Qué sale

- **Todo lo de Balcarce.** Lo cuenta un medio de acá, lo cuenta un organismo, o dice Balcarce en el título, o toca la zona (la ruta 226, la 55, la papa).
  No pide cantidad de medios ni tiene tope por día. Se estrena aunque el hecho tenga hasta **36 horas** (los medios de acá publican tarde).
- **Lo nacional, si lo cuentan 3 medios distintos.** Los medios del mismo dueño cuentan uno. Con uno solo, nunca.
- **Las áreas chicas, con 2 medios.** Son Tecnología e IA, Ciencia, Salud, Educación, Cultura, Agro y Automovilismo: hay poco y no se justifica pedir 3.
  Con 2 medios pasa un control chico (no es "dónde ver", ni "en vivo", ni el horóscopo, ni el tiempo de otra ciudad).
- **Lo muy contado: 8 medios o más.** Se trata como noticia grande: va primero en su sección, se estrena aunque el hecho tenga hasta **24 horas**
  y no lo frena una palabra sensible suelta ("murió", "detenido", "niño"). Una sola excepción: un chico junto a un delito, una denuncia o una muerte
  sigue esperando a una persona.
- **Del extranjero, sólo si hay un argentino** (Milei, Messi, Colapinto, "Argentina" en el título) **o si lo cuentan 8 medios o más.**
- **Policiales de afuera, casi nunca.** Sale si lo cuentan 8 medios o más, o si es la muerte de alguien muy famoso (con el mínimo de medios de siempre, 3).
  Policiales de Balcarce y la zona sale como el resto de lo de acá.
- **Fútbol:** de afuera sólo Primera División argentina, las competencias argentinas, la Selección y los argentinos que juegan afuera
  (lista en `ingesta/futbol-primera.json`). La Premier o LaLiga sin argentinos no entran, **ni siquiera con 8 medios**.
  La liga de Balcarce y los clubes de acá entran siempre.

## Qué no sale nunca

- **Rojo:** nunca se identifica a un menor ni a una víctima. Esa lista no se toca sin preguntar.
- **Las listas de sepelios.** Ni aprobadas por una persona.
- **La cotización del dólar del día** (está en la página del dólar). Una nota de economía que menciona el dólar sí sale.
- **Lo que no es noticia:** publicidad, chimentos, horóscopo, lotería (salvo que gane alguien de acá), las efemérides de otro medio, el autobombo de un medio de acá.
- **Lo que no tiene cuerpo:** una nota automática sin 70 palabras de texto no sale; se reintenta y, si no hay manera, se descarta con el motivo anotado.
- **Lo viejo:** una nota que nunca salió no se estrena si el hecho es más viejo que la ventana (12 horas lo de afuera, 24 lo muy contado, 36 lo de Balcarce).

## Qué espera a una persona

- Lo amarillo de **Balcarce** ya no espera por una palabra sensible: sólo el rojo lo frena. Lo que queda (promoción dudosa, verificación baja) va al celular.
- Política y Policiales esperan a una persona en **todas** las piezas de redes.
- Lo amarillo de afuera que no llega a ningún celular **no sale** (es la regla de no frenar a nadie sin que lo vea alguien).

## Cuánto dura todo (las ventanas)

- **36 horas** una nota está en la portada y las listas.
- **12 horas** puede tener el hecho para estrenarse (lo de afuera); **24** si lo cuentan 8 medios o más; **36** si es de Balcarce.
- **72 horas**: lo que un medio trae con más de eso y nunca salió, no entra ni al cruce.
- **500 notas** es el tope de notas con página en el sitio hoy (variable de GitHub `TOPE_DE_NOTAS`). El techo técnico del código es 3.700 y el archivo
  de 180 días lo guarda el archivo permanente, no el sitio.

## Los números, uno por uno

| Número | Qué es | Por qué | Dónde vive |
|---|---|---|---|
| **3** medios | Lo nacional sale | Con 1 o 2 es un solo comunicado o un error repetido; con 3 ya es tema (regla 260, Hernán 17/10) | `POPULARIDAD.minimoNacional`; variable `MINIMO_NACIONAL` (de 2 a 10) |
| **2** medios | Áreas chicas | Hay poco de ciencia, salud, agro o fierros; pedir 3 las deja vacías | `POPULARIDAD.minimoAreasChicas` y `AREAS_CHICAS`; variable `MINIMO_AREAS_CHICAS` |
| **8** medios | "Muy contada": noticia grande | Medido sobre 50 medios del país: es el punto donde ya es de todos (regla 197; Hernán: "más de 8 fuentes debería ser algo súper relevante") | `MUY_CONTADA.medios` (`ingesta/criterio.mjs`). Lo leen la ingesta, el policial nacional (`POLICIAL_NACIONAL`), la web (`web/lib/archivo.js`) y el semáforo (`sueltaElAmarillo`) |
| **5 / 8** medios | Intentos extra de la IA con una nota que no logra cuerpo (+1 y +2) | Insistirle más a lo que cuenta mucha gente; es un 8 aparte del de "muy contada" a propósito (uno mide cuánto insistir, el otro qué es noticia grande) | `REESCRITURA.fuentesParaUnIntentoExtra` y `fuentesParaDosIntentosExtra` |
| **36** h | Portada y listas; y estreno de lo de Balcarce | Hernán 28/09: "en la tapa, lo que pasó entre ayer y hoy"; 23/10: Balcarce entra todo | `PORTADA.horas` y `PORTADA.horasParaEstrenarDeAca`; `web/lib/archivo.js` los importa |
| **12** h | Estreno de lo de afuera | Hernán 28/09: no traer noticias de hace dos o tres días | `PORTADA.horasParaEstrenar`; `horasParaEstrenar()` en `web/lib/archivo.js` |
| **24** h | Estreno y vigencia de lo muy contado | Una historia grande de anoche sigue siendo noticia hoy (regla 287) | `MUY_CONTADA.horasDelHecho` y `horasDeLaUltimaNota` |
| **72** h | Máxima edad de lo que entra de un medio o se raspa | Los feeds de acá traen notas de meses que arrastran a las nuevas (regla 180) | `HORAS_DE_UNA_NOTA_NUEVA` (`ingesta/ingesta.mjs`) |
| **70** palabras | Mínimo de cuerpo para publicar | Con menos es un título largo, no una nota | `CUERPO.minimoParaPublicar` |
| **12** palabras | Copiar del original: el verificador rechaza más de 12 seguidas | A la IA se le pide "no más de 10" (margen a propósito: no tirar una nota por una frase hecha) | `COPIA_MAXIMA`; la instrucción, `CRITERIO-EDITORIAL.md` § 12 |
| **200 / 60** | Lecturas con IA por día (con clave propia / compartida) | Con unas 3.000 historias por día es de los límites que de verdad frenan; la clave gratis permite 500 pedidos en total con las reescrituras | `LECTURA_IA` (`ingesta/criterio.mjs`), usado por `ingesta/lectura-ia.mjs` |
| **450 / 330** | Notas que se le piden a la IA por día | Tope de la clave gratis (500); 330 si la lectura comparte la clave | `REESCRITURA.porDia` y `porDiaSinClaveDeLectura` |
| **500** notas | Tope de notas con página en el sitio | Cloudflare Pages acepta 20.000 archivos; con 500 la compilación es liviana | Variable de GitHub `TOPE_DE_NOTAS` (mínimo 500: `TOPE_MINIMO_DE_NOTAS`); techo 3.700 en `PORTADA.maximoDeNotas` |
| **5** medios | Lo de afuera que va a Facebook e Instagram | Sólo Balcarce y lo más contado del país (regla 280) | `FACEBOOK.mediosParaRedes` |

## Cómo cambiar algo

- Un número del criterio se cambia en `ingesta/criterio.mjs` **y** en la tabla de `CRITERIO-EDITORIAL.md` § 11 (una prueba controla que digan lo mismo).
- Los dos mínimos de medios (3 y 2) se cambian sin tocar código con las variables de GitHub.
- La lista roja, los sepelios y el fútbol de afuera no se tocan sin preguntar a Hernán.
