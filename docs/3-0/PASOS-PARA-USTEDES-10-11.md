# Lo que depende de ustedes, paso a paso (10/11/2026)

*Para Hernán y Andrés. Ordenado de más a menos importante. Todo se hace desde la PC, en el Chrome de `radarbalcarce@gmail.com`. Lo que ya quedó hecho está al final.*

## 1. Subir a producción lo que quedó programado (5 minutos)

Hoy se programaron y probaron (843 pruebas en verde) dos mejoras que **están guardadas en el repositorio pero todavía no están funcionando en el sitio**, porque subir a producción quedó frenado por los permisos de la sesión:

- **Contador propio de lecturas y de avisos** (sin cookies) y **fotos de otros medios siempre por https**.
- **Mistral como respaldo gratis para redactar** si Gemini falla.

Cómo subirlas:

1. Entrar a <https://github.com/radarbalcarce/radar-balcarce/actions/workflows/v3-desplegar.yml>
2. Botón **Run workflow** → en «Qué subir» elegir **sitio** → **Run workflow**. Esperar el tilde verde (unos 5 minutos).
3. Abrir <https://radarbalcarce.com> y mirar que la portada y una nota se vean bien.
4. Repetir el paso 2 eligiendo **nucleo**.

Otra forma: decirle a Claude «desplegá sitio y núcleo» y aceptar el permiso cuando lo pida.

Para volver atrás el contador sin tocar código: variable `CONTADOR_PROPIO = "no"` en `v3/sitio/wrangler.toml` y subir `sitio` de nuevo.

## 2. Terminar los filtros del correo (2 minutos)

1. En el Chrome quedó abierta una pestaña de Gmail con el cartel «Debemos verificar tu identidad para continuar». Tocar **Continuar** y verificar.
2. Si el cartel ya no está: <https://mail.google.com/mail/u/0/#settings/filters> → **Importar filtros** → elegir `docs/3-0/correo/filtros-gmail.xml` → **Abrir archivo** → tildar **Aplicar filtros nuevos a los mensajes existentes** → **Crear filtros**.

## 3. Prender los avisos por Telegram (10 minutos)

Paso a paso en [`correo/LEEME.md`](correo/LEEME.md). Se entra por <https://script.google.com>. Hace falta la clave del bot (la da @BotFather en Telegram) y el número de chat de Hernán con el bot.

Con eso llega un mensaje cuando hay una gacetilla nueva, un correo de una persona, una novedad de AdSense o un inicio de sesión nuevo en Facebook o Google.

## 4. Confirmar Google Noticias (1 minuto)

En Gmail, buscar `Google News`: hay dos correos del 5/11 que piden **confirmar la suscripción**. Abrir cada uno y tocar el botón de confirmar.

## 5. Vincular Search Console con Analytics (1 minuto)

Entrar a <https://analytics.google.com>. En la página de inicio aparece la recomendación «Vincula tu propiedad de Search Console»: tocar **Vincular cuenta** y aceptar. Sirve para ver qué búsquedas de Google traen lectores.

Al entrar aparece además un cartel sobre qué correos recibir de Analytics: elegir **Desmarcar todo y guardar**.

## 6. El 20/11: las efemérides de diciembre

El motor viejo ya no corre, así que «Un día como hoy» de diciembre lo arma la 3.0:

1. Entrar a <https://github.com/radarbalcarce/radar-balcarce/actions/workflows/v3-efemerides.yml>
2. **Run workflow** con la opción `simular` y mirar qué días quedan con pieza.
3. Si está bien, correrlo sin simular. Para que desde ahí corra solo cada día 20: <https://github.com/radarbalcarce/radar-balcarce/settings/variables/actions> → **New repository variable** → nombre `EFEMERIDES_V3_ACTIVAS`, valor `si`.

## 7. El número de chat de Hernán (para el dueño fijo del bot)

Escribirle al bot @radarbalcarce_bot cualquier mensaje y pasarle a Claude el número de chat (también lo muestra @userinfobot en Telegram). Con eso Claude deja fijo quién es el dueño del bot, y si entra Andrés, también el suyo.

## 8. Cosas chicas, cuando puedan

- **Borrar el proyecto viejo de Vercel:** <https://vercel.com/dashboard> (manda avisos de dominios mal configurados y ya no se usa).
- **Crear el canal de WhatsApp de Radar** (figura pendiente desde el 5/11).
- **Publisher Center:** <https://publishercenter.google.com> → revisar el logo en Estilos visuales.
- **Search Console:** <https://search.google.com/search-console> → Sitemaps → borrar el mapa viejo `/nota/sitemap-archivo.xml`.
- **Guardar una copia** de las carpetas `scripts/pc/` y `docs/3-0/notas-propias/` y del archivo `docs/propuestas/MAPA-Y-CRONOGRAMA-25-10.html`: no están en el repositorio.

## Lo que ya está hecho (no hay que hacer nada)

- **Reloj y vigilante viejos sin horarios** y **11 procesos viejos desactivados** en GitHub: el sistema viejo ya no corre solo ni manda el correo diario de «2 problemas abiertos».
- **542 fotos viejas copiadas** al depósito nuevo (6 no están en ningún lado). Era lo que faltaba para poder sacar la red de seguridad del sitio viejo; ese paso es el siguiente y lo hace Claude con un despliegue.
- **Recibidos limpio:** entre 250 y 300 conversaciones viejas archivadas, sin borrar.
- **AdSense:** todo completo de nuestro lado; Google sigue revisando. No hay nada para hacer.
- **Cloudflare:** el depósito de respaldos es privado y la regla que limita los pedidos al buscador existe y está activa.
- **Permiso de GitHub que vence hacia el 14/11** («Vigilante de Cloudflare (lectura)»): por el nombre es del vigilante viejo, ya apagado. Antes de dejarlo vencer, Claude confirma que la 3.0 no lo usa.

## Lo que sigue (lo hace Claude, de a un paso por día)

1. Sacar la red de seguridad del sitio viejo (`RESPALDO_VIEJO = "no"`) y mirar una semana que no falte nada.
2. Apagar el programa viejo de tareas, cuando Buffer no tenga videos pendientes de ahí.
3. Mostrar las lecturas del contador propio en el resumen diario de Telegram.
4. Tareas secundarias del núcleo una vez por hora, cuando se haya leído el efecto de los cambios del 10/11.
5. Decirle a la IA que el texto de las fuentes son datos y no órdenes, con su prueba.
6. Una sola lista de pendientes y el documento de entrada (`CLAUDE.md`) describiendo la 3.0.
