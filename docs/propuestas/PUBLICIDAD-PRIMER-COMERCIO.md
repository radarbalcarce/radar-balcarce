# Publicidad: el primer comercio (propuesta del 2/11/2026)

*Para Hernán. Qué podemos ofrecerle hoy al primer anunciante, qué le pedimos, cómo se arma la nota y qué cambia con la 3.0.
Lo que decide una persona está marcado «decidir». La política general sigue en `PUBLICIDAD.md`; esto la aplica a un caso.*

## 1. Cómo quedó la publicidad hoy (2.0)

- **Tres espacios**, cargados a mano en `web/data/avisos.json`: `apertura` (portada, después de las cinco postales), `clima` (columna
  derecha de la portada, arriba de la agenda; **en el celular sale primero**) y `pie` (al pie de todas las páginas). Hoy los tres
  están vacíos.
- Cada aviso lleva `nombre`, `texto` y un `logo` de 40 × 40 px. **No tiene enlace, ni fecha de inicio o vencimiento, ni rotación**: un
  aviso fijo por espacio, gris, con letra chica y el rótulo «Espacio publicitario».
- Las reglas que ya están escritas y se respetan: sólo comercios de Balcarce; sin pop-ups ni videos solos; nada de apuestas ni
  préstamos; Política y Policiales no llevan patrocinio; **un aviso no compra una nota** (R6).
- **Los números de audiencia no sirven todavía para vender.** En los últimos 7 días hubo unas 196 visitas por día, pero el 80 % es
  de escritorio y la mayoría de Francia y Estados Unidos: parece tráfico de robots. Argentina es cerca del 12 %. Facebook tiene 120
  seguidores e Instagram 142 (1/11). El media kit, por ahora, se vende por el producto y el precio de lanzamiento, no por cifras.

## 2. Qué le ofrecemos a este primer comercio («Paquete de lanzamiento»)

Precio pensado por Hernán: **$ 5.000 por mes** (decidir el número final; `PUBLICIDAD.md` pedía antes preguntar qué cobra la radio).
Por ser el primero, el mes incluye todo esto:

1. **El aviso en la web, un mes**, en el espacio `clima` (columna derecha, primero en el celular) **y** en el `pie`. Cuando haya un
   segundo anunciante, los avisos **rotan**: ningún comercio compra un lugar fijo (pedido de Hernán). Hoy la rotación no existe: ver el § 6.
2. **Una nota sobre el emprendimiento**: quiénes son, qué hacen, desde cuándo, qué los distingue; con sus fotos y su contacto. Para no
   romper la regla «un aviso no compra una nota», la nota sale **rotulada**: va en una serie propia («Emprendedores de Balcarce») con la
   marca visible «Espacio patrocinado» arriba y en la firma, escrita por Hernán (nota de redacción, desde el celular), sin IA ni verificador.
   El lector sabe qué es; el comercio tiene su nota igual.
3. **Una historia con voz** (reel corto, como las piezas de siempre: la locutora presenta el emprendimiento y la nota) en Facebook e
   Instagram, y el posteo de la nota con la foto.
4. **El plus de marketing básico** (lo que no nos cuesta y a ellos les sirve): una revisión por escrito de su Instagram y su Facebook
   con 5 a 10 recomendaciones concretas (biografía, foto de perfil, qué publicar y cuándo, cómo poner la dirección y el WhatsApp,
   destacados), y **dos o tres imágenes con su marca** hechas con nuestras placas (una de perfil, una de portada, una plantilla de
   promoción) para que las usen. Lo hace Claude con un modelo chico a partir de las redes del comercio; no hace falta ningún programa
   nuevo: usamos el mismo dibujo de placas de `reels/placa.mjs`.

Más adelante, con la 3.0: banner con imagen y enlace, rotación de verdad, estadísticas para el anunciante (cuántos lo vieron y
cuántos tocaron), y la nota grabada en audio o video con el dueño, si se anima.

## 3. Qué le pedimos al comercio (lista para mandar por WhatsApp)

- El **logo** en la mejor calidad que tengan (PNG con fondo transparente o el archivo original; si tienen kit de marca, el kit:
  colores, tipografías, cómo usar el logo).
- **5 a 10 fotos horizontales** del local, los productos y las personas (la de portada se usa a 1600 × 900; sirve cualquier foto de
  celular bien iluminada). Si quieren aparecer, una foto de quien atiende.
- **Datos fijos**: nombre exacto del comercio, dirección, horarios, teléfono o WhatsApp, Instagram y Facebook, si hacen envíos.
- **Una promoción para lectores de Radar** (opcional, pero vende): «mencioná Radar Balcarce y…».
- Las respuestas al cuestionario del § 4, por audio de WhatsApp si prefieren (Hernán después las pasa a la nota).

## 4. Cuestionario estándar para la nota (10 preguntas)

1. ¿Quiénes son y cómo se llama el emprendimiento? ¿Quién está detrás?
2. ¿Cuándo y cómo arrancó? ¿Qué hacían antes?
3. ¿Qué hacen o venden, exactamente? ¿Qué es lo que más sale?
4. ¿Qué lo hace distinto de otros lugares de Balcarce?
5. ¿Cómo es un día normal del negocio?
6. Una anécdota o un cliente que recuerden.
7. ¿Qué significa Balcarce para el negocio? ¿Trabajan con proveedores o productores de acá?
8. ¿Qué les costó más y qué aprendieron?
9. ¿Qué viene: algo nuevo, un proyecto, una temporada fuerte?
10. ¿Dónde los encuentra la gente (dirección, horarios, redes, envíos) y qué promoción le hacen a quien llega por Radar?

Con las respuestas, la nota se arma así: título con el nombre y qué hacen; bajada con el dato más propio; cuerpo en tercera
persona con dos o tres citas textuales de ellos; al final un recuadro «Dónde encontrarlos» con los datos fijos y la promoción.
**Nunca una afirmación que ellos no hayan dicho**; si dicen «el mejor de Balcarce», va entre comillas y como dicho por ellos.

## 5. El media kit (una carilla, para mandar por WhatsApp como PDF o imagen)

Qué lleva, en este orden: qué es Radar Balcarce (medio digital de Balcarce que publica todo el día, con redes y voz); qué se
publica por día (unas 120 notas, 6 reels con voz, los repasos, el clima y la farmacia, que son lo más consultado); dónde aparece el
anunciante (los tres espacios, con una captura del celular); qué incluye el paquete de lanzamiento (§ 2); precio y cómo se paga
(transferencia, mes a mes, sin permanencia); las reglas (sólo comercios de Balcarce, sin pop-ups, el aviso siempre dice que lo es); el
contacto: WhatsApp 2266 51-1612 y `publicidad@radarbalcarce.com` (**probar antes que ese mail llegue**). **Sin números de audiencia**
hasta que estén limpios de robots (§ 1); cuando estén, se agregan: visitas de Argentina por día, seguidores y alcance de las redes.

Lo armo cuando Hernán confirme el precio y el nombre del paquete. Va también como página `/publicidad` en la 3.0.

## 6. Qué hace falta cambiar en el código (decidir)

- **En la 2.0, un cambio chico y acotado**, si quieren pautar antes de la 3.0: sumarle a cada aviso un `enlace` (al Instagram o al
  WhatsApp del comercio), un `desde` y un `hasta` (para que el aviso se apague solo cuando vence) y, si hay más de uno en el mismo
  espacio, mostrarlos rotando por carga. Toca `web/components/avisos.js`, `web/data/avisos.json` y `PUBLICIDAD.md`, con sus pruebas.
  No se hace sin el OK de Hernán.
- **En la 3.0** (va al plan, sección 10): módulo de avisos en D1 con imagen, enlace, fechas, rotación, cuántas veces se mostró y se
  tocó cada uno, y una pestaña en `/admin` para cargarlos y ver los números; la página `/publicidad` con el media kit; la serie
  «Emprendedores de Balcarce» como tipo de nota con su rótulo.
- **Un aviso siempre lleva quién lo vendió y hasta cuándo** en el commit (ya lo pide `PUBLICIDAD.md`).

## 7. Decisiones de Hernán, para cerrar

1. El precio ($ 5.000 por mes) y si el paquete de lanzamiento es sólo para el primero o para los primeros tres o cinco.
2. Si la nota patrocinada va rotulada como se propone en el § 2 (es la forma de respetar la regla de que un aviso no compra una nota).
3. Si se hace el cambio chico en la 2.0 (§ 6) o se espera a la 3.0 para pautar.
4. El nombre y las redes del comercio, para que Claude mire su Instagram y Facebook y devuelva la revisión y las imágenes del § 2.4.
