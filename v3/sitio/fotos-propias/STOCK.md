# Stock de fotos de Radar Balcarce

Fotos guardadas para reutilizar en notas y piezas (Hernán, 20/11/2026: «buscá en su Instagram o página oficial y guardalas para nuestro stock»). Se sirven en `https://radarbalcarce.com/fotos-notas/<archivo>` después de desplegar el sitio. Al usarlas, el crédito va en el epígrafe (nunca dentro de la imagen).

| Archivo | Qué muestra | Crédito | Origen / licencia |
|---|---|---|---|
| `museo-fangio-interior.jpg` | Interior del Museo Fangio: copa y sector de Juan Manuel Fangio | Foto: Museo Juan Manuel Fangio | museofangio.com (página oficial, «Historia») |
| `museo-fangio-rampa.jpg` | La rampa del museo con autos de colección (chica, 510 px) | Foto: Museo Juan Manuel Fangio | museofangio.com («Organizá tu visita») |
| `museo-fangio-fachada.jpg` | Fachada del Museo del Automovilismo Juan Manuel Fangio (vertical) | Foto: Erikao (Wikimedia Commons, CC BY-SA 3.0) | commons.wikimedia.org/wiki/File:Museo_del_Automovilismo_J.M._Fangio.JPG |
| `handball-copa-mdp-2026.jpg` | Charla de la Escuela Municipal de Handball (nota del 20/11/2026) | Foto: Municipalidad de Balcarce | balcarce.gob.ar |

## El catálogo para la máquina: `stock.json`

Desde el 20/11/2026 el núcleo usa este stock **solo** cuando una nota no tiene foto de sus fuentes: es el primer respaldo, antes de la foto de otra nota y de la ilustración con IA (`v3/nucleo/REGLAS.md` § 7 sexies). Lee `stock.json` (esta misma carpeta): por foto, `archivo`, `url`, `credito`, `licencia`, `ancho`, `alto`, `alt`, `etiquetas`, `uso` y `personas`. **Esta tabla y `stock.json` tienen que decir lo mismo.**

- La nota recibe la foto si alguna **etiqueta** (frase entera, palabras completas) está en su título, bajada o ficha. «museo fangio», «viñedo los pinos», «the wines co», «ciudad de miramar»… Una palabra suelta no alcanza.
- Las fotos con `uso: 'solo-su-nota'` (el handball, la misa del Papa, las portadas de Se hace) no se reusan: tienen chicos o personas reconocibles, o son de una nota puntual. Quedan en el catálogo sólo para que se sepa que existen.
- Una misma foto no sale en dos notas del mismo día; Policiales y muertes no reciben. El epígrafe sale «Foto de archivo: <crédito>».
- Las fotos de clima (`clima-*.jpg`) las usa la nota diaria del clima y no están en el catálogo.

### Cómo se suma una foto

1. Guardar el JPEG en esta carpeta (nombre descriptivo, minúsculas y guiones). Sólo con permiso o licencia libre, con crédito; nunca de víctimas ni con marca de agua (fotos con chicos: sólo de fuentes de Balcarce y no policiales, Hernán 17/10, y siempre `solo-su-nota`).
2. Agregar su objeto en `stock.json` con etiquetas de qué muestra (lugar o institución con nombre propio, frase completa) y `"uso": "solo-su-nota"` si es de una nota puntual o hay gente.
3. Sumar la fila en la tabla de arriba.
4. `node --test "v3/nucleo/**/*.test.mjs"` (controla que la imagen exista y que la entrada sea válida).
5. Desplegar `sitio` (publica la imagen) y `nucleo` (lee el catálogo).
