# Archivo permanente: que el enlace de una nota nunca dé 404

*Escrito el 15/10/2026, a partir de un armado real del sitio. Lo que depende de documentación de Cloudflare que no se pudo leer sin conexión está marcado **SIN VERIFICAR**: hay que confirmarlo en la página de límites de Cloudflare antes de construir. Es un diseño, no está hecho.*

## 1. El problema, con números medidos

Hoy una nota tiene página mientras esté entre las últimas 3.700 (antes 3.500) o tenga menos de 180 días. Al ritmo actual (46 notas por día) el tope manda: **desde el 10/12/2026 cada nota vive unos 80 días** y después su enlace (el de Facebook, Instagram, Google, WhatsApp) da 404. El tope existe porque Cloudflare Pages acepta 20.000 archivos por despliegue.

**Qué se midió** (15/10/2026, Next 15, `npm run build`, dos armados: uno con las 1.131 notas y otro con el archivo recortado a 566):

| | Armado completo | Recortado |
|---|---|---|
| Notas con página | 1.131 | 566 |
| Archivos del sitio | 5.125 | 3.200 (con las mismas 878 fotos) |

De ahí sale: **unos 400 archivos de base más 4,2 por nota**.

| Qué suma cada nota | Archivos |
|---|---|
| Su página y su texto de navegación (`.html` + `.txt`) | 2,0 |
| Su fragmento del buscador (Pagefind) | 1,0 |
| Su foto (`fotos-notas/`, 0,78 fotos por nota) | 0,8 |
| Sus páginas de sección (10 notas por página) | 0,2 |
| Las dos imágenes de compartir, sólo si salió en redes (9% de las notas) | 0,2 |

La auditoría había estimado 3,2 por nota: era corta. Con 3.500 notas son ~15.000 archivos; con 3.700, ~15.900 (80% del tope, el margen que se pidió). **Subir el tope más allá no es seguro** mientras las fotos vivan dentro del sitio. Con las fotos en R2 son ~3,4 por nota y entrarían unas 4.500 notas (~15.700 archivos); eso gana otros 20 días, nada más.

**Cuándo se llena el tope nuevo:** (3.700 − 1.131) / 46 = 56 días, o sea **hacia el 10/12/2026** (entre el 22/11 si el ritmo sube a 68 por día y fines de enero si baja a 26). Para guardar 180 días harían falta ~8.300 notas, unos 35.000 archivos: no entra en Pages por mucho que se optimice. **El tope de archivos no se arregla con más ajustes: hay que sacar las notas viejas del sitio compilado.** Eso es el archivo permanente.

## 2. Idea general

Las notas que salen de las 3.700 **no se borran: pasan a un depósito de R2**, y un pedazo de código de Cloudflare las sirve **con la misma dirección** (`/nota/<titular-id>`). El sitio compilado sigue teniendo sólo las notas recientes (nunca más de ~16.000 archivos); el archivo crece sin tope (R2 gratis hasta 10 GB; una página HTML pesa del orden de 40 KB, así que 10.000 notas por año son ~0,4 GB: décadas de margen. **SIN VERIFICAR** el peso real de una nota; se mide al construir).

### Cómo llega una nota al depósito (sirve para las dos variantes)

1. **Antes de que salga**, no cuando sale: en cada armado, un paso nuevo (`web/scripts/archivar-html.mjs`, a escribir) toma las ~200 notas más viejas con página (las que van a salir en los próximos 4 días) y sube a R2 `nota/<titular-id>.html`, copiado de `web/out/` (no hace falta otro armado). Sube sólo las que faltan (se anota qué subió en el propio depósito).
2. **Se prepara el HTML para que dure**: el CSS y el JavaScript de Next tienen nombres con huella (`/_next/static/css/ab12.css`) que **cambian en cada armado** y Cloudflare no conserva los viejos. Si se guardara el HTML tal cual, la nota vieja se vería sin estilos. Por eso el paso (a) copia el CSS adentro de la página (`<style>`, ~38 KB), (b) saca los `<script>` (una nota vieja no necesita JavaScript para leerse), (c) deja las tipografías y los escudos, que tienen dirección fija.
3. **La foto**: hoy la foto se borra del repositorio cuando la nota sale (`podarFotos`). Con las fotos en R2 (`fotos-a-r2.yml` y `FOTOS_BASE`, ya preparados) la foto queda en R2 para siempre y la página la pide ahí. **Esto va antes**: sin las fotos en R2 el archivo permanente muestra notas sin foto.
4. **Regla de seguridad**: una nota **no sale** del sitio hasta que su HTML esté confirmado en R2. Si la subida falla, la nota se queda unos días de más (el tope es blando) y el vigilante avisa.
5. **Lo retirado se borra también** (menores y víctimas): cuando una nota entra en `retiradas.json` o la saca el semáforo, el robot borra su objeto de R2 y la caché. Es la misma regla de siempre, ahora con un lugar más donde mirar.

## 3. Variante (a), la más barata y la recomendada: R2 + código de Cloudflare delante de las notas

Una ruta `/nota/*` que primero pregunta al sitio y, **sólo si el sitio dice 404**, busca en R2 y devuelve la página con estado 200. Hay dos maneras de hacerla:

| | Pages Functions (`functions/nota/[[ruta]].js` dentro del proyecto de Pages) | Worker delante de Pages (ruta `radarbalcarce.com/nota/*`) |
|---|---|---|
| Dónde vive | Dentro del proyecto Pages; se sube con el sitio (`wrangler pages deploy` tiene que ver la carpeta `functions/`, **SIN VERIFICAR** con wrangler 4.139) | Aparte, como el reloj (`infra/reloj-cloudflare/`); se sube cuando cambia el Worker, no en cada despliegue |
| Cómo ve el depósito | "Binding" de R2 puesto en los ajustes del proyecto Pages | "Binding" de R2 en el `wrangler.toml` del Worker |
| Qué pasa con el sitio | Cada pedido de `/nota/*` ejecuta la función, que llama a los archivos estáticos y, si no están, a R2 | Cada pedido a `/nota/*` entra al Worker, que pregunta a Pages (por la dirección `*.pages.dev`, para no volver a entrar en sí mismo) |
| Si el código falla | Se rompen **todas** las notas, nuevas y viejas, hasta corregir y volver a desplegar | Se puede escribir para que, ante cualquier error, devuelva igual la respuesta de Pages: sólo fallan las viejas |
| Riesgo de límites | Los pedidos a funciones cuentan contra el cupo diario de Workers (gratis: 100.000 por día, **SIN VERIFICAR**); los archivos estáticos no cuentan | Igual: cada pedido a `/nota/*` cuenta (mismo cupo). Con más visitas, el plan pago de Workers (US$ 5 por mes, ya previsto en el plan de la etapa 10) |
| Pruebas locales | Más difíciles (hay que emular Pages) | Más simples (un Worker aislado, con una prueba como la del reloj) |
| Cuándo conviene | Si el sitio se queda en Pages mucho tiempo y se quiere una sola cosa que desplegar | **Recomendada**: se despliega y se revierte sin tocar el sitio; sirve igual cuando la fase 5 pase todo a Workers |

Detalles comunes (todos **SIN VERIFICAR** contra la documentación de Cloudflare):
- La ruta puede ser `radarbalcarce.com/nota/*` solamente: la portada, las secciones y las fotos no pasan por el Worker (no gastan cupo).
- El Worker guarda cada respuesta de R2 en la caché de Cloudflare 1 día; una nota vieja casi no toca R2.
- Si R2 tampoco la tiene: se devuelve la 404 del sitio, con estado 404 (como hoy).
- Para Google: la nota vieja responde 200 con su `canonical` de siempre; no se agrega al `sitemap.xml` (se arma sólo con las recientes), así el sitemap no crece. Opcional: un `sitemap-archivo.xml` armado por el Worker.
- El buscador (Pagefind) y las listas de sección **no** incluyen lo archivado: sólo se llega por enlace. Una página `/archivo/2026-09` armada por el Worker desde R2 queda para después.
- Esfuerzo: Worker ~80 líneas; paso `archivar-html.mjs` ~120; pruebas para ambos (sin red). **2 a 3 días de trabajo de Claude + 30 minutos de una persona.**

## 4. Variante (b), más liviana pero con tope: páginas mínimas dentro del sitio

Guardar cada nota vieja como una página corta (título, bajada, fecha, sección, enlace a la fuente) dentro del propio sitio. **Costo real: 2 archivos por nota** (la página y su `.txt`; Next 15 siempre los genera). Con el sitio lleno (15.900 archivos) no queda lugar; habría que bajar las notas completas a ~2.500 (10.900 archivos) para ganar ~2.500 páginas mínimas: **dos o tres meses más**, y después el mismo problema. Sirve de parche, no de solución. (El análisis del 15/10 la ponía como "barata": en tiempo de trabajo sí, pero en archivos no.)

Una versión que no gasta archivos: un `archivo/AAAA-MM.json` por mes (12 archivos por año) y que la página 404 existente (`/nota/indice.json` ya hace el rescate de direcciones) lea ese mes y muestre la nota. Cuesta 2 a 3 días, pero la respuesta sigue siendo **404 de verdad**: la persona lee la nota, pero Google y la vista previa de Facebook la ven como error. Sólo sirve como red de seguridad mientras se arma la variante (a).

## 5. Qué tiene que hacer una persona (variante a)

Nada de esto lo puede hacer Claude: hay cuentas y claves, y las claves las pega una persona (nunca en el chat).
1. En Cloudflare (cuenta `radarbalcarce@gmail.com`) → R2 → **crear el depósito `radar-archivo`**, privado (sin acceso público).
2. Crear una clave de API de Cloudflare con permiso de **leer y escribir objetos de R2 sólo en ese depósito**; guardarla en GitHub como secreto (nombre a elegir, por ejemplo `R2_ARCHIVO_TOKEN`), y una variable de GitHub `R2_ARCHIVO` con el nombre del depósito (igual que `R2_FOTOS`). **SIN VERIFICAR** si la clave actual de Cloudflare ya sirve: conviene una nueva, con menos permisos.
3. Antes: hacer andar **fotos a R2** (`R2_FOTOS`, `FOTOS_BASE`, correr "Fotos a R2"), porque sin eso el archivo muestra notas sin foto.
4. Cuando Claude tenga el Worker armado: crear el Worker con el binding al depósito y la ruta `radarbalcarce.com/nota/*` (o pegar los comandos que dé Claude), y probar con una nota vieja.
5. Decidir entre las variantes (a) y (b), y si se acepta un par de horas de pausa al activar la ruta.

## 6. Recomendación y orden

1. **Ya** (hecho): tope en 3.700 y avisos en 16.500 / 18.000. Se gana el 10/12 como fecha.
2. **Esta semana a la próxima**: fotos a R2 (paso 3 de arriba). Es lo que más ayuda y además libera 0,8 archivos por nota.
3. **Antes del 25/11** (dos semanas antes del tope): variante (a) con el Worker delante, empezando por **subir todo lo que ya existe** al depósito y probando con 20 enlaces reales de Facebook.
4. **Mientras tanto no cambiar nada del reloj ni del despliegue**: es una pieza nueva, aparte, y si falla sólo afecta a las notas viejas.
5. Después de eso, el tope de notas del sitio puede **bajar** a lo que se quiera (por ejemplo 2.000, sitio más rápido de armar y de subir) sin romper ningún enlace; y Next 16 (que suma archivos por nota) deja de ser un problema de espacio.

*Pendiente de verificar antes de construir:* límites actuales de Pages Functions y Workers gratis; si `wrangler pages deploy` de la versión fija sube la carpeta `functions/`; cómo se comporta un Worker que pregunta a su propio dominio; el peso real de una página de nota; y si el CSS de Next es global (el reemplazo de `<link>` por `<style>` se puede hacer igual, pero hay que mirar que no haya clases con huella entre armados).
