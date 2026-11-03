# Facebook: las reglas

*Módulo `v3/redes/facebook/` (lo usa el Worker `radar-redes`). Lo común a todas las redes está en `../REGLAS.md`; acá, lo propio de Facebook.*

## Qué publica

- **Un posteo con foto de una nota del sitio**, en la página «Radar Balcarce». Es la foto de la nota **entera** (la que guardó el núcleo en `nota.foto.url`), con el texto abajo.
  Nunca la tarjeta recortada de enlace, nunca una foto con marca de agua ni con el nombre de otro medio pegado.
- **Sin foto, no hay posteo.**
- Todavía no publica reels, historias ni álbumes: vienen en la segunda parte de la etapa D (los reels y las historias del día siguen saliendo por el sistema viejo hasta el corte).

## Cuántos y cuándo

- **Hasta 10 por día: 5 de Balcarce + 5 de lo más contado del país** (lo de afuera, con 5 medios o más).
- **De 8:00 a 22:00**, con **90 minutos como mínimo** entre uno y otro. Con 90 minutos de separación entran 10 en el día justo (8:00, 9:30 … 21:30).
- **Como mucho 3 nacionales de una misma sección por día.**
- Es un tope: si un día no hay con qué, salen menos.
- Una nota que salió hace más de 8 horas ya no se postea.

## El texto

    Título de la nota

    Las dos líneas: qué pasó y qué sigue.

    Leé la nota completa: https://radarbalcarce.com/nota/el-titular-en-guiones-ID

    #Balcarce #RadarBalcarce

    Foto: crédito

- Las **dos líneas** son las que escribió el núcleo (`enDosLineas`); si no hay, la bajada; si repiten el título, no se ponen. Si pasan de 280 caracteres, se cortan en una oración entera.
- La frase que antecede al enlace cambia de una nota a otra (siempre la misma para la misma nota) para que la página no suene a plantilla: «Leé la nota completa:», «Toda la nota acá:»,
  «Seguí leyendo en Radar Balcarce:», «La nota completa, en Radar Balcarce:». El enlace es a **nuestra** nota, nunca a la fuente.
- Los hashtags son **siempre los dos fijos**, en ese orden.
- El **crédito de la foto** va al final («Foto: …»; una ilustración se dice ilustración).

## Cómo publica

- Por la API de Meta (Graph API v23.0, `POST /{página}/photos`), con el token de la página que Meta entrega al usuario del sistema. La foto la baja Facebook de su dirección pública.
- Si Meta contesta con error pero el posteo ya está entre los últimos de la página (comparando el titular), se da por publicado y no se repite.

## Qué hace si falla

Lo de `../REGLAS.md` § 6: el error queda anotado sin el token; un reintento; a la segunda se abandona esa nota; tres fallos en dos horas frenan la vuelta; un token vencido se avisa una vez por día por Telegram.

## Lo que queda afuera a conciencia

Video largo, eventos, encuestas, Live y grupos: no. (Los grupos de Balcarce, a mano si alguien quiere.)
