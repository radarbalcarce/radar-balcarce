# Texto para pegarle a ChatGPT, Grok, Meta AI y Gemini (15/10/2026)

Es el mismo texto para todas, para poder comparar las respuestas. No lleva claves ni datos personales. Copiar desde la línea
de abajo hasta el final y pegarlo en un chat nuevo de cada una. Después, pegarnos las respuestas (o decirle a Claude que
las lea) y las comparamos contra la auditoría (`docs/auditoria-opus/ANALISIS.md`).

---

Soy dueño (no programador) de Radar Balcarce, un medio digital 100 % automático de Balcarce, Buenos Aires, Argentina
(radarbalcarce.com). Quiero que me ayudes a revisar si lo estoy armando con lógica y si estoy arrastrando errores que un
principiante no ve.

Cómo funciona: cada 30 minutos un robot lee unos 100 feeds RSS de medios (todos los de Balcarce, 50 del país y 10 de Tandil
y Mar del Plata), junta la misma noticia contada por varios, decide qué publicar con reglas y un modelo de IA, la reescribe
con IA (Gemini), la verifica contra las fuentes y arma un sitio estático (Next.js en Cloudflare Pages). También publica en
Facebook, Instagram, X y Threads, con video y voz sintética. Cada nota dice que la escribió una IA y lista sus fuentes. Hay
reglas fijas: no se identifica a menores ni a víctimas, política y policiales esperan a una persona, no se copian textos de
otros medios (se reescribe con palabras propias, máximo 12 palabras seguidas iguales) y las fotos de otros medios llevan
crédito. Todo corre en GitHub Actions (repositorio público, claves en secretos), con un reloj en un Worker de Cloudflare.
Los datos viven en archivos JSON dentro de git. Hoy hay unas 50 visitas por día (casi todas desde Facebook), 53 seguidores en
Facebook y 7 en Instagram. Presupuesto máximo: US$ 25 por mes. Somos dos personas sin conocimientos de programación.

Respondé concreto, en castellano rioplatense simple, con riesgo alto/medio/bajo y qué haría una persona experta:

1. ¿Qué riesgos legales o de políticas de plataformas estoy probablemente ignorando? (derechos de autor al reescribir notas
   de otros medios con IA, difamación, datos personales en Argentina, la política de Google contra el contenido masivo
   generado por IA, las reglas de Meta, YouTube y TikTok sobre contenido y voces sintéticas).
2. ¿Qué errores típicos cometen los dueños nuevos de medios automáticos o de sitios de noticias locales, y cómo se evitan?
3. ¿Tiene sentido la arquitectura (GitHub Actions + archivos JSON en git + Cloudflare Pages) o conviene pasar a
   Cloudflare Workers con D1 y R2? ¿Qué se rompe primero cuando crezca?
4. ¿Qué tendría que medir y vigilar para saber que todo anda bien y para saber qué contenido funciona?
5. ¿Qué haría distinto para que el sitio dure años y crezca (Google Discover y Google News, canal de WhatsApp, newsletter,
   guía de comercios, alianzas con instituciones locales)?
6. ¿Qué cosas básicas de seguridad, respaldos y continuidad (dos personas, claves, cuentas, vencimientos) suelen olvidarse?

Si algo depende de una ley o una política que no podés confirmar, decilo y marcá dónde necesito un abogado.
