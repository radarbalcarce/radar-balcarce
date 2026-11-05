# Radar 3.0: lista única de mejoras e ideas, de más a menos importante

*5/11/2026. Junta las ideas que ya teníamos (`PENDIENTES-3-0.md`) con las tres investigaciones del día:
`auditoria-05-11/COMPETENCIA.md`, `auditoria-05-11/TECNICA.md` y `auditoria-05-11/CLIMA-Y-ALERTAS.md`.
Cada punto dice quién lo hace: **C** = Claude solo, **H** = necesita a Hernán o a Andrés.*

## A. Lo más importante (ahora)

1. **Fotos propias en nuestro servidor.** Hoy la portada muestra 21 fotos de 11 medios ajenos; si uno las borra o las bloquea, la nota queda sin foto (Clarín y Olé ya rechazan pedidos sin cabeceras de navegador). Guardar una copia de cada foto en R2, achicada (hoy una foto de 5000 px pesa 1,7 MB y se muestra a 343 px) y de 1.200 px de ancho para Google Discover. *Esfuerzo medio, casi gratis. C.* (Es la idea 11 de los pendientes y el hallazgo 1 y 2 de la auditoría técnica.)
2. **Que se vea lo nuevo del sitio**: desplegar «Seguí leyendo», compartir con íconos y sin la línea de IA (listo, falta OK para desplegar). **H** (el OK).
3. **Vistas previas al compartir** (WhatsApp, Facebook): hoy sólo las notas con foto tienen imagen; la portada toma la foto de la primera nota (ajena) y `/og-default.png` da 404. Crear una imagen propia del medio y usarla donde falte. *Bajo. C.*
4. **Medir una semana qué red y qué pieza sirve más** y recién ahí recortar (informe del domingo 8/11 contra la línea de base del 3/11). **C.**
5. **Threads funcionando** (se reintenta con la cuenta del token; se verifica con la próxima nota nueva). **C + H** si falla otra vez.
6. **Seguridad básica del sitio**: `http://` hoy responde 200 en vez de pasar a `https://`; faltan las cabeceras de seguridad (HSTS, Referrer-Policy, X-Frame-Options; la CSP, con cuidado por AdSense). *Bajo/medio. C.*

## B. Mejoras del sitio (con peso para lectores y Google)

7. **Canal de WhatsApp propio del medio** (lo tienen Infobae y El Marplatense): gratis, es donde más se comparte en Balcarce. **H** (lo crea con el número 2266 51-1612).
8. **Google Discover y Google News**: etiqueta `max-image-preview:large`, fotos grandes (depende del punto 1) y alta en el Publisher Center («Seguir en Google»). **H** (el trámite) + C.
9. **«Lo más leído»** además de «Seguí leyendo», y migas de pan (Inicio › Sección › Nota). *Bajo/medio. C.*
10. **Datos estructurados en la portada y las secciones** (`WebSite`, `Organization`, `BreadcrumbList`). *Bajo. C.*
11. **Toques demasiado chicos en el celular** (24 elementos bajo 44 px: botón de secciones, enlaces del pie, cookies, fuentes). *Bajo. C.*
12. **Notas viejas migradas**: en una muestra, 6 de 14 sin ninguna imagen; ~8 grupos de direcciones repetidas; ~67 repasos indexables. Rehacer las del último mes con un modelo chico (Haiku) y buscarles foto. *Medio. C.*
13. **Lo que ya arreglé hoy sin desplegar todavía**: el mapa del mes ya no trae las notas «noindex» (clima diario) y la foto principal se pide con prioridad. Queda con el despliegue del punto 2.
14. **Modo oscuro completo y accesibilidad**: «saltar al contenido», más etiquetas, contraste de los colores de sección. *Medio. C.*
15. **Manifest, íconos y botón «Instalar»** (el sitio como app) y, más adelante, avisos push. *Bajo para lo primero, medio/alto para push. C.*
16. **Newsletter semanal** (la tienen 0223, La Nación y otros). *Medio; puede pasar los US$ 10 si crece. H decide.*

## C. Clima y datos locales

17. **Sumar la estación automática del INTA Balcarce** (SIGA, estación 242): temperatura, humedad y lluvia cada 10 minutos, sin clave. Sirve para confirmar los avisos de helada con la mínima medida y mostrar la lluvia caída. Riesgo: la dirección no está documentada. Respaldo: Open-Meteo, aviso del vigilante si cae, citar al INTA y pedirle permiso por mail. *Bajo, medio día. C + H (el mail).*
18. **Índice UV, salida y puesta del sol y calidad del aire** (Open-Meteo, gratis) y fase lunar calculada. Revisar términos de Open-Meteo por los avisos. *Bajo. C.*
19. **Decirlo claro: los avisos de clima son un cálculo nuestro**, no una alerta oficial. **SMN descartado** (503/403 sin API pública). Weather Underground tiene una estación personal en Balcarce (IBALCA20) pero pide clave: sólo si hace falta.

## D. Redes (después de la semana de medición)

20. **Segundo carrusel con noticias de afuera de Balcarce** (se define con Hernán antes de generar nada). **H.**
21. **Destrabar la agenda** (reel y carrusel del finde) cuando los eventos estén al día. **H.**
22. **Que el bot de Telegram guarde varias fotos por nota propia**, para los carruseles de notas propias. *Medio. C.*
23. **Link en los posteos de X** (hoy apagado: con link llega unas 13 veces menos). Decidir tras la medición.
24. **TikTok modo foto y TikTok/YouTube por su propia API** (hoy salen bien por Buffer; probar qué acepta Buffer con `node redes/buffer.mjs --probar`). *C + H (la clave).*
25. **Repaso general de estética** de todas las piezas, con las capturas de la semana.
26. **Canal de Telegram** (en pausa por decisión de Hernán).

## E. Para más adelante

27. **Agenda de contactos y mapa comercial** de la zona (jueves 5/11).
28. **Notas propias de investigación** sobre temas de Balcarce.
29. **Spotify y Apple Podcasts** con el audio de los repasos (suma poco al principio).
30. **Apagar el respaldo del sistema viejo** (`RESPALDO_VIEJO`) y el sistema viejo, cuando las redes lleven una semana verificadas.
31. **Espacios de anuncios** cuando Google apruebe AdSense (está en revisión).

## Lo que NO conviene hacer (según las investigaciones)

- **Publicar fúnebres** (aunque lo hacen otros medios locales): va contra nuestra regla.
- **AMP**: no suma hoy.
- **Cambios visibles de portada y menú sin consultarte**: se proponen antes (regla del 4/10).

## Lo que no se pudo verificar

- Clarín, TN, MDZ y algunos medios del exterior no se dejaron abrir (403): ahí todo quedó «no verificado».
- No se midió velocidad real en un celular (LCP, Core Web Vitals) ni el efecto de AdSense.
- Los requisitos exactos del Publisher Center de Google.
