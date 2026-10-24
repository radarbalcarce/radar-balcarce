# Enlaces cortos y rastreables para las redes (17/10/2026)

*Pedido de Hernán, 17/10: "Los links que se muestran en Facebook son muy largos. Que sigamos pudiendo rastrear de dónde vienen, pero más cortos; con Cloudflare podemos tener algún acortador. Analizalo, pensalo,
investigalo; si hay que decidir algo, dejá la pregunta escrita." Está **escrito, probado sin red y apagado**: ningún texto cambia hasta que una persona haga lo de la sección 4.*

## 1. El problema, con números

El enlace de un posteo de Facebook mide hoy **178 caracteres en promedio** (160 a 186; medido sobre los 99 posteos del libro): la dirección de la nota con el titular adentro más
`?utm_source=facebook&utm_medium=social&utm_campaign=posteo&utm_content=<id>`. Con la solución de abajo mide **36** (`https://radarbalcarce.com/r/f/dg5er4`), una quinta parte.

**Hallazgo que cambia la mirada:** las UTM de hoy **no las lee nadie**. Cloudflare Web Analytics (gratis, el que usa el sitio) no tiene dimensión de UTM ni de campaña: sólo País, Host, Ruta, **Referer**, Aparato,
Navegador, Sistema, Sitio, "Excluir robots" y Tipo de navegación (<https://developers.cloudflare.com/web-analytics/data-metrics/dimensions/>, leído el 17/10), y `redes/estadisticas-detalle.mjs` sólo
pide `refererHost`. Es decir: hoy sabemos que la visita vino de `facebook.com`, pero **no de cuál posteo** ni si fue un repaso o una nota. Los enlaces largos pagan el costo de verse feos y no dan lo prometido.

## 2. Las cuatro opciones (todas sin costo nuevo; precios y límites leídos en la documentación de Cloudflare el 17/10/2026)

| # | Opción | Qué da | Costo | Problema |
|---|---|---|---|---|
| **1** | **Un Worker en una ruta del propio dominio**: `radarbalcarce.com/r/<red>/<destino>` → 302 a la nota con las UTM | Enlace de 36 caracteres; **cuenta cada toque** (red, pieza, persona o robot) en Analytics Engine; sirve para cualquier red | **US$ 0 nuevo.** La cuenta ya está en Workers Paid (US$ 5 por mes): 10 millones de pedidos por mes incluidos, US$ 0,30 por millón de más; un toque es un pedido. Con ~30 visitas por día desde Facebook más los robots que miran el enlace, **unos 3.000 pedidos por mes, el 0,03 % de lo incluido**. Analytics Engine: 10 millones de datos escritos y 1 millón de consultas por mes incluidos en Paid (100.000 y 10.000 por día en Free); hoy no se factura | Una pieza más para mirar (un Worker, una ruta). Si algún día se saca la ruta, los enlaces ya publicados dejan de andar |
| 2 | **Reglas de redirección de Cloudflare** (gratis): *Redirects por lotes* (15 reglas, 5 listas, **10.000 redirecciones en total** en el plan gratis) o *Single Redirects* (**10 reglas**, con comodín, sin expresiones regulares) | Una regla `/r/f/*` → `/nota/${1}?utm…` no necesita código | US$ 0 | No resuelve el identificador al titular: iría a `/nota/<id>`, que para las notas nuevas **no existe como página** (la web cae en el 404 y la manda un script): estado 404 para Facebook y los buscadores. Las listas por lotes hay que subirlas por API desde el robot (otra clave, más código) y 10.000 alcanzan para ~1 año con 2 redes. No cuenta los toques |
| 3 | **Un dominio corto aparte** (por ejemplo uno de 4 letras) | El enlace más corto posible (`rb.xx/abc`) | Un dominio cuesta plata todos los años (no consulté precios: **se descarta** como pediste) | Otra cuenta, otro DNS, otra marca, otro candidato a que Facebook lo marque |
| 4 | **Dejar el enlace limpio y medir por el `Referer`** de Web Analytics | Cero código; más corto aún (`…/nota/titular-id`, ~80) | US$ 0 | Sólo distingue Facebook de lo demás: las apps de mensajes (WhatsApp, Telegram) y varios navegadores internos **no mandan referer** y caen en "Directo o WhatsApp"; no distingue un posteo de otro ni un repaso de una nota; Instagram no tiene enlaces tocables. Y el enlace sigue largo |

**Recomendación: la opción 1.** Es la única que baja el largo y **además** mide de verdad (hoy no se mide), y tiene el costo de lo que ya se paga. La opción 4 no resuelve el pedido; la 2 queda como plan B para
Facebook solo (la regla `/r/f/*` hacia `/nota/…` se arregla si la 404 de las notas nuevas se vuelve una redirección, cosa que hoy no es).

## 3. Cómo anda (lo que se escribió)

- **`redes/enlaces-cortos.mjs`**: la gramática `/r/<red>/<destino>` y el generador. La red es **una letra** (`f` Facebook, `i` Instagram, `h` Threads, `x` X, `t` Telegram, `b` Bluesky, `y` YouTube, `k` TikTok,
  `w` WhatsApp). El destino es el identificador de la nota (`dg5er4`, 5 a 7 caracteres), `repaso20261017manana` o una pieza de servicio (`clima-noche`, `farmacia`, `aviso-viento`). **Todo enlace que sale hacia una red
  pasa por `ponerOrigen`** (`redes/elegir.mjs`): con `ENLACES_CORTOS` prendida da el corto, vacía da el largo de siempre. El libro sigue guardando la dirección limpia de la nota.
- **`infra/enlaces-cloudflare/worker.mjs`**: lee el código, busca el titular de la nota en `/nota/indice.json` (el índice que el sitio ya publica en cada compilación: unos 300 KB para las 3.700 notas, guardado 10 minutos en
  memoria), y contesta **302** a `/nota/<titular>-<id>?utm_source=<red>&utm_medium=social&utm_campaign=<posteo|repaso|servicio>&utm_content=<id>`. Una nota que ya salió del sitio (más de ~80 días) y no está en el índice va a
  `/nota/<id>`, y de ahí la lleva a su dirección buena **el archivo permanente** (`infra/archivo-cloudflare`, que ya redirige `/nota/ID` a la canónica desde R2). Un código inválido va a la portada (nunca un error). La
  dirección final se arma siempre con `radarbalcarce.com` más un camino que el Worker valida: no hay forma de usarlo para mandar a otro dominio. No manda `Referrer-Policy`, a propósito: si lo mandara, se
  perdería que la visita vino de facebook.com. Cuenta cada toque en Analytics Engine (binding `CLICS`; no guarda direcciones IP ni nada de la persona: red, tipo, destino, "persona" o "robot").
- **`infra/enlaces-cloudflare/ruta.mjs`**: pone o saca la ruta `radarbalcarce.com/r/*` con la API de Cloudflare (igual que el del archivo). **Sin ruta, el Worker existe y no hace nada.**
- Pruebas: `pruebas/enlaces-cortos.test.mjs` (gramática, generador, el Worker con un sitio de mentira, la ruta con la API de mentira).

## 4. Para activarlo (lo hace una persona; en este orden)

1. Subir el Worker: `cd infra/enlaces-cloudflare && npx wrangler deploy` (cuenta `radarbalcarce@gmail.com`; hace falta un workflow como `archivo-produccion.yml` si se quiere desde GitHub: **no lo escribí**, es de `.github/`).
2. `CLOUDFLARE_API_TOKEN=… node infra/enlaces-cloudflare/ruta.mjs poner` (permiso "Workers Routes: Edit").
3. Probar a mano: `radarbalcarce.com/r/f/<id de una nota de hoy>` tiene que llevar a la nota; `radarbalcarce.com/r/zz/abc`, a la portada.
4. Recién ahí, la variable `ENLACES_CORTOS` = `Si`: en GitHub (Settings → Variables) **y** en las variables del Worker de tareas de Cloudflare. **El cambio de workflow ya está hecho (24/10, regla 311):** `redes.yml` (pasos «Facebook» y piezas), `piezas.yml`, `reintentar.yml` y
   `motor-variables.yml` pasan `ENLACES_CORTOS: ${{ vars.ENLACES_CORTOS }}`, y `cargar-variables.mjs` la lleva a Workers Builds; vacía, todo sale como siempre
   (`pruebas/variables-conectadas.test.mjs`). Falta sólo el Worker de tareas: la variable se crea en su panel de Cloudflare (`main()` ya lee `env.ENLACES_CORTOS`).
5. **Vuelta atrás**: vaciar `ENLACES_CORTOS` (los textos nuevos vuelven al largo). **La ruta no se saca** mientras haya enlaces cortos publicados: dejarían de andar.

Para leer los toques (más adelante): Analytics Engine se consulta con SQL por API (`radar_enlaces_cortos`); falta un `redes/estadisticas-enlaces.mjs` que los junte en el panel de Números (no escrito).

## 5. Preguntas para Hernán

1. **¿Aprobás la opción 1** (Worker en `radarbalcarce.com/r/*`, sin costo nuevo) y que lo activemos con los pasos de la sección 4?
2. **¿Contamos los toques?** (Analytics Engine; sin datos personales.) Si preferís no contar nada, se apaga con `ENLACES_ACTIVO = "0"` y el enlace corto sigue andando.
3. Un detalle que no decide el acortador pero conviene saber: **el enlace corto sigue siendo un enlace a nuestro sitio**; no evita el posible tope de Meta de 2 posteos con enlace por mes para páginas comunes
   (§ 3.1 de `FORMATOS-POR-RED.md`). Esa duda es otra: si los enlaces de los últimos días se ven tocables en la página, no hace falta nada.
