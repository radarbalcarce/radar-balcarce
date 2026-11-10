# El correo de Radar, ordenado y con avisos por Telegram

*Armado el 10/11/2026. Dos pasos necesitan a una persona en la PC, porque Google pide verificar la identidad y porque la clave del bot nunca se pega en un chat ni en el código.*

## Qué quedó hecho

- **Limpieza de Recibidos:** se archivaron (sin borrar) los informes del vigilante, los avisos de corridas de GitHub y la publicidad de servicios que ya no se usan, todo lo de más de dos días. Siguen estando en «Todos».
- **Los seis filtros están escritos** en `filtros-gmail.xml`: Informes, Sistema, Google y publicidad, Seguridad, Redes y Prensa.
- **El programa de avisos está escrito** en `avisos-por-telegram.gs`.

## Paso 1. Terminar de crear los filtros (2 minutos, en la PC)

Gmail pidió verificar la identidad antes de crear filtros, y eso no lo puede hacer Claude.

1. En el Chrome de `radarbalcarce@gmail.com` quedó abierta la pestaña de Gmail con el cartel «Debemos verificar tu identidad para continuar». Tocar **Continuar** y verificar (huella, llave o contraseña).
2. Si el cartel ya no está: Gmail → engranaje → **Ver toda la configuración** → **Filtros y direcciones bloqueadas** → **Importar filtros** → elegir `docs/3-0/correo/filtros-gmail.xml` → **Abrir archivo** → tildar **Aplicar filtros nuevos a los mensajes existentes** → **Crear filtros**.

Con eso aparecen las seis etiquetas a la izquierda y todo el correo, el viejo y el nuevo, queda etiquetado.

## Paso 2. Prender los avisos por Telegram (10 minutos, en la PC)

1. Entrar a `https://script.google.com` con `radarbalcarce@gmail.com` → **Nuevo proyecto**. Ponerle de nombre «Avisos del correo».
2. Borrar lo que trae y pegar todo el contenido de `avisos-por-telegram.gs`. Guardar.
3. Engranaje de la izquierda (**Configuración del proyecto**) → abajo, **Propiedades de la secuencia de comandos** → agregar dos:
   - `TELEGRAM_TOKEN`: la clave del bot (la misma que está cargada en Cloudflare; la da @BotFather).
   - `TELEGRAM_CHAT`: el número de chat de Hernán con el bot.
4. Volver al editor, elegir la función **instalar** arriba y tocar **Ejecutar**. Google pide permiso para leer el correo y conectarse a Telegram: aceptar.
5. Tiene que llegar al Telegram el primer aviso si hay algo nuevo. Desde ahí corre solo cada 15 minutos.

## Qué avisa

| Aviso | Cuándo |
|---|---|
| Gacetilla de prensa | Llega un correo con la etiqueta Prensa |
| Novedad de AdSense | Google AdSense escribe (aprobado, rechazado o falta algo) |
| Alerta de seguridad | Inicio de sesión nuevo en Facebook o Google, o un permiso por vencer |
| Correo de una persona | Algo que no viene de un servicio ni es un boletín |

Cada correo se avisa una sola vez (queda con la etiqueta «Avisado»). Una vez por día, a las 6, los informes de más de dos días salen de Recibidos.

## Para apagarlo

`script.google.com` → el proyecto → reloj de la izquierda (**Activadores**) → borrar los dos.
