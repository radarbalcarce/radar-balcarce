# Manual de avisos de Radar 3.0

*Para Hernán y Andrés. En palabras de persona: dónde va cada aviso, cómo se llama cada lugar, cuál rota, qué plan lo usa, qué medidas tiene que tener la imagen y cómo se carga o se saca uno. Los planes y los precios están en `PUBLICIDAD-PRIMER-COMERCIO.md` § 2; el comerciante los ve en la nota «Publicitá en Radar Balcarce» (`NOTA-MEDIA-KIT.md`), a la que lleva `radarbalcarce.com/publicidad`: la página de publicidad ya no muestra precios. Las capturas son del sitio en vivo (3/11/2026) con los lugares dibujados encima y los nombres nuevos: en esa fecha todavía no había avisos cargados, así que los recuadros muestran dónde van a quedar.*

## 1. Cómo se llama cada lugar

Cada lugar tiene un nombre corto: una letra y un número. **T** es la tapa, **N** las notas, **S** las secciones, **P** las demás páginas (contacto, búsqueda, etc.) y **A** los de AdSense (de Google: esos no los vendemos nosotros). El nombre está en el HTML como `data-lugar="T1"` y, cuando en ese lugar no hay ningún aviso cargado, el aviso propio lo dice en letra chica: «Espacio T1». Así, mirando el sitio, sabés de qué lugar se habla.

| Nombre | Página | Dónde | Rota | Quién lo usa | Medidas de la imagen |
|---|---|---|---|---|---|
| **T1** | Tapa | Fijo, arriba de las noticias (entre el clima y la nota principal) | **No**: un solo comercio por mes | Comercio, sólo el plan de **$ 50.000** | 1200 × 300 px (4:1) |
| **T2** | Tapa | Después de las postales (entre la grilla de fotos y «Última hora») | Sí | Comercio, planes de **$ 10.000** y más | 1200 × 300 px |
| **T3** | Tapa | Columna del costado de «Última hora» (en el celular, entre las noticias) | Sí | Comercio, planes de **$ 20.000** y más | 600 × 500 px (6:5) |
| **T4** | Tapa | Pie de página | Sí | Comercio, **todos** los planes (desde $ 5.000) | 1200 × 300 px |
| **N1** | Notas | Arriba de la nota. **Sólo sale si hay un comercio fijo cargado** | No (es el mismo comercio de T1) | Comercio, plan de $ 50.000 | 1200 × 300 px |
| **N2** | Notas | Pie de la nota. **Sólo sale si no hay comercio fijo** | Sí | Comercio, todos los planes | 1200 × 300 px |
| **S1** | Secciones | Fijo, arriba de la lista de notas | No (el mismo de T1) | Comercio, plan de $ 50.000 | 1200 × 300 px |
| **S2** | Secciones | Pie de página | Sí | Comercio, todos los planes | 1200 × 300 px |
| **P1** | Las demás páginas | Pie de página (contacto, quiénes somos, búsqueda…) | Sí | Comercio, todos los planes | 1200 × 300 px |
| **A1** | Notas | Dentro de la nota, entre el tercer y el cuarto párrafo | — (lo elige Google) | **AdSense** | alto reservado de 280 px |
| **A2** | Secciones | Al final de la lista de notas, antes del pie | — (lo elige Google) | **AdSense** | alto reservado de 280 px |

Todos llevan el rótulo chico **«Publicidad»** y, si el aviso tiene enlace, lo abren en una pestaña nueva. Mientras un lugar no tiene ningún aviso cargado, sale el aviso propio: **«Tu comercio acá»**, con «Espacio T1» (o el nombre que sea) debajo, que lleva a la nota del media kit, sin precios. Nunca queda vacío.

**Dentro de las notas, menos avisos que en la tapa** (Hernán, 3/11). En una nota hay **un solo aviso local**: arriba (N1) si hay un comercio fijo cargado y, si no, al pie (N2); más el de AdSense (A1) en el medio. Nada más. En la tapa, en cambio, están los cuatro (T1 a T4). Qué sale en cada plan: **$ 5.000**, el pie (T4, N2, S2, P1). **$ 10.000**, el pie y T2. **$ 20.000 y $ 30.000**, el pie, T2 y T3. **$ 50.000**, T1 (que se repite en N1 y S1) más todos los rotativos. En la base el lugar se guarda como `fijo`, `postales`, `columna` o `pie`: un mismo comercio del plan de $ 5.000 sale en T4, N2, S2 y P1, que son «el pie» de cada tipo de página.

**Cómo rota.** Cada vez que se arma una página, en cada lugar rotativo se elige un aviso al azar entre los que tienen ese lugar, y se trata de no repetir el mismo comercio dos veces en la misma página. Como las páginas se guardan unos minutos, el aviso cambia cuando la página se rearma: con avisos cargados, la tapa, las secciones y las notas duran 5 minutos (sin avisos, 1 hora). Todos los que pagan se reparten por igual. Si un lugar tiene un solo aviso, se repite antes que quedar vacío.

**La imagen.** Se achica sola al ancho de la página, así que alcanza con respetar la **proporción**: el lugar queda reservado y la página no salta al cargar. JPG o PNG, menos de 300 KB, con el texto grande (en el celular se ve a unos 360 px de ancho). Si el aviso **no tiene imagen**, se arma una caja con el nombre del comercio y su texto de una línea (hasta 120 letras): sirve para empezar rápido.

## 2. La tapa (T1 a T4)

![Tapa en la computadora](manual-avisos/portada-compu.jpg)

En el celular es la misma tapa, con T3 entre las noticias:

![Tapa en el celular](manual-avisos/portada-celular.jpg)

## 3. La nota (N1, N2 y A1)

N1 y N2 son **alternativos**: sale uno u otro (N1 si hay un comercio fijo, N2 si no). Las capturas los marcan a los dos para que se vea dónde van. A1 (AdSense) va en el medio del cuerpo, entre el tercer y el cuarto párrafo, y no se dibujó porque hoy no existe.

![Nota en la computadora](manual-avisos/nota-compu.jpg)

![Nota en el celular](manual-avisos/nota-celular.jpg)

## 3 bis. Las secciones (S1, S2 y A2)

S1 arriba de la lista, S2 al pie de la página y, entre las dos, al final de la lista, el de AdSense (A2, sin dibujar por la misma razón).

![Sección en la computadora](manual-avisos/seccion-compu.jpg)

![Sección en el celular](manual-avisos/seccion-celular.jpg)

## 3 ter. Los de AdSense (A1 y A2)

Son **de Google**, no de un comercio: aparte de los propios, nunca mezclados ni rotando con ellos. Hoy **no existen**: se prenden cuando Hernán carga la variable `ADSENSE_CLIENTE` (ver § 6).

- **A1 · En la nota**: entre el tercer y el cuarto párrafo. Sólo en notas de cuatro párrafos o más y **nunca en Policiales**.
- **A2 · En las secciones**: al final de la lista de notas (menos en Policiales).
- Los dos tienen el alto reservado (280 px) para que nada se mueva, llevan el rótulo «Publicidad» y **sólo aparecen si el lector aceptó las cookies**. Si Google no tiene anuncio para mostrar, el bloque se esconde solo.
- La tapa no lleva AdSense.

## 4. Cómo se carga un aviso

Lo carga Claude, con un archivo y un comando. Hernán pasa estos datos (por Telegram o por acá):

1. **Comercio** (el nombre) y, si tiene, **una línea de texto**.
2. **Enlace** (su Instagram, su página o su WhatsApp como `https://wa.me/549…`). Tiene que empezar con `https://`.
3. **Plan** (5000, 10000, 20000, 30000, 50000) o los **lugares** a mano (en la base se llaman `fijo`, `postales`, `columna` y `pie`; la tabla del § 1 dice a qué nombre corresponde cada uno).
4. **Desde y hasta** (el primer y el último día; los dos son opcionales).
5. **Imagen** (la subimos al sitio y se pone su dirección; si no hay, se usa sólo el texto).

Con eso se arma un archivo `aviso.json`:

```json
{
  "comercio": "Sweet Candy Bar",
  "texto": "Tortas y mesas dulces en Balcarce",
  "enlace": "https://www.instagram.com/sweetcandybar",
  "plan": "10000",
  "desde": "2026-11-10",
  "hasta": "2026-12-10"
}
```

y se corre:

```
node v3/sitio/scripts/cargar-aviso.mjs aviso.json --salida=aviso.sql
npx wrangler d1 execute radar-nucleo --remote --file=aviso.sql
```

El script revisa todo (enlace https, fechas, lugares) y avisa si algo está mal antes de tocar la base. Si no se escribe `lugares`, salen los del plan. Cargar de nuevo el mismo comercio **lo actualiza**, no lo duplica. El aviso se ve cuando la página se rearma (hasta 5 minutos).

## 5. Cómo se saca un aviso

- **Sacarlo ya:** `node v3/sitio/scripts/cargar-aviso.mjs --sacar=sweet-candy-bar --salida=sacar.sql` y después `npx wrangler d1 execute radar-nucleo --remote --file=sacar.sql`. Queda apagado en la tabla (no se borra: sirve de historial).
- **Que termine solo:** el campo `hasta`. El día siguiente ya no sale.
- Cambiar el texto, la imagen o las fechas: se vuelve a cargar con el mismo `id` (el `id` es el nombre en minúsculas con guiones, `sweet-candy-bar`).

## 6. Para prender AdSense y Google Analytics (lo hace una persona)

1. Pedir el alta en AdSense con el dominio `radarbalcarce.com` (después de que el sitio lleve un tiempo indexado; ver `INVESTIGACION-3-0-11-2026.md`).
2. Cuando lo aprueben, copiar el código de editor (`ca-pub-…`) en la variable **`ADSENSE_CLIENTE`** del Worker `radar-sitio`; y los números de bloque que dé el panel al crear una unidad para la nota y otra para las secciones, en **`ADSENSE_SLOT_NOTA`** y **`ADSENSE_SLOT_SECCION`**. Con la variable cargada aparecen solos el aviso de cookies, el script (sólo si el lector acepta), `/ads.txt` y los bloques A1 y A2.
3. Para Google Analytics, el identificador `G-…` en **`GA_ID`**. También prende el aviso de cookies.
4. Sin ninguna de las dos variables no hay aviso de cookies ni nada de Google.
