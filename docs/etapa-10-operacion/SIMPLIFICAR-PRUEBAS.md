# Simplificar las pruebas: qué se puede juntar y qué sobra

*23/10/2026. Propuesta, no se borró nada. Hoy hay 245 archivos en `pruebas/` y unas 2.965 pruebas (`test(`). Los números por archivo salen de
`grep -c "^test("`; lo que dice cada grupo, de leer sus títulos. Antes de borrar cualquier cosa conviene correr `npm test` con y sin el
archivo y mirar que ninguna regla de `docs/10-REGLAS-Y-PRUEBAS.md` se quede sin su prueba.*

## Lo que nunca puede fallar (lista corta)

Es lo que hoy ya corre en cada vuelta (`pruebas/nucleo-legal.txt`, `npm run test:nucleo`) más lo que le falta para cubrir las reglas que no se negocian.
Si todo lo demás se rompiera pero esto anduviera, nada se publicaría mal.

1. **Menores y víctimas nunca se identifican** (semáforo rojo, fotos de chicos): `semaforo`, `exenciones`, `fotos-menores-oficiales`, `fotos-controles`.
2. **Las listas de sepelios no salen nunca**, ni aprobadas: `semaforo`, `criterios-extranjero-zona` (la última prueba de lectura del texto final).
3. **Lo que escribe la IA se verifica contra la fuente** (no inventa, no copia, no deja basura): `verificar`, `verificador-copia-fechas-letras`, `json-ia`, `escape-en-el-texto`.
4. **Sin cuerpo no se publica** (70 palabras; se respeta lo de una persona): `cuerpo`, `reescritura`.
5. **Lo que espera a una persona llega al celular y se respeta lo que decidió** (`motivo`, `cuando`, `por` siempre): `celular`, `celular-app`, `auditoria-correccion`, `archivo` (retiradas).
6. **No se repite ni cambia de dirección una nota**: `repetidas-esperando`, `repetidas-publicadas`, `entrada`, `entrada-ampliada`.
7. **Lo de Balcarce entra todo; lo de afuera pide sus medios; las ventanas (36/12/24 h) y el 8 de "muy contada"**: hoy repartido entre `de-aca`, `copia-de-afuera`, `popularidad-260`, `balcarce-todas`, `auditoria-23-10`. **Falta sumar `popularidad-260`, `balcarce-todas`, `descartes-despues-del-cruce` y `semaforo-y-sin-cuerpo-23-10` al núcleo.** Son las que cuidan las reglas más nuevas.
8. **Política y Policiales esperan a una persona en las redes; Instagram es video con voz; las redes tienen su interruptor**: hoy sólo en `redes*` (no están en el núcleo, porque no frenan la web). Una prueba corta con estas tres reglas, aparte.
9. **Los números del criterio son los mismos en el código y en el documento**: `criterio`, `redes-criterio`.
10. **`ingesta/`, `panel/` y `redes/` no importan nada de afuera de Node, y ningún archivo trae claves escritas**: `fuentes` (dependencias), `workflows-fijos`, `reloj-cloudflare` (la prueba "no hay ninguna clave escrita").

## Grupos que se pueden juntar (mismo tema, archivos chicos)

| Grupo | Archivos hoy | Pruebas | Propuesta |
|---|---|---|---|
| **Popularidad y "qué sale"** | `popularidad-17-10` (24), `popularidad-260` (9), `intentos-por-cobertura` (2), `redes-populares` (8) | 43 | Un solo `seleccion-popularidad.test.mjs`. Las reglas 197 a 202 y la 260 cuentan la misma historia (3/2/8 medios); `popularidad-17-10` todavía menciona cupos que ya no existen. |
| **Semáforo y lo que se descarta** | `semaforo` (19), `semaforo-y-sin-cuerpo-23-10` (11), `descartes-despues-del-cruce` (7), `auditoria-23-10` (16), `futbol-y-policial-nacional` (12), `exenciones` (17) | 82 | Una carpeta o un solo archivo por regla del dueño (rojo / amarillo / descartes por sección / fútbol y policial nacional). Hoy una misma regla (8 medios no se frena) está probada en cuatro archivos distintos. |
| **Fuentes y secciones** | `secciones-flacas` (18), `secciones-nuevas` (15), `secciones-sumadas` (15), `fuentes-30-09` (6), `fuentes-lista-elegida` (7), `fuentes-registro` (2) | 63 | Un `fuentes-y-secciones.test.mjs`. `secciones-flacas` tiene títulos de la época de los cupos ("el cupo 0 lo frena", "82 fuentes"). |
| **Reloj** | `reloj` (5), `reloj-cloudflare` (12), `reloj-nube` (8) | 25 | Uno solo. `reloj.test.mjs` prueba el resumen viejo de `redes/reloj.mjs`; los otros dos, el Worker. |
| **Vigilancia** | `vigilancia` (53), `vigilancia-arreglos` (8), `vigilancia-avisos` (37), `vigilancia-cierre` (17), `vigilancia-estadisticas` (27), `vigilancia-falla-web` (4), `vigilante-cloudflare` (45), `vigilante-nube` (10) | 201 | Dos archivos: lo que mira (`vigilar`) y cómo avisa (`avisos` + Worker). Es el grupo más grande y el que más se repite. |
| **Efemérides** | `efemerides` (18), `efemerides-ajenas` (4), `efemerides-aprobacion` (7), `efemerides-propuesta` (13), `efemeride-nota` (7), `efemeride-viva` (8), `previa-efemerides` (6), `placa-efemeride` (3), `feriado-criterio` (4) | 70 | Dos: elegir/aprobar y nota/placa. |
| **Pistas** | `pistas` (10), `pistas-abiertas` (11), `pistas-solas` (7), `pistas-unir` (6), `nota-de-pista` (11), `notas-de-pistas` (4) | 49 | Uno o dos. |
| **Fotos** | `fotos` (25), `fotos-base` (3), `fotos-controles` (15), `fotos-en-r2` (19), `fotos-notas` (23), `fotos-panel` (23), `foto-libre` (4), `foto-logo` (3), `foto-cambiada` (10), `facebook-foto` (4) | 129 | Tres: las que deciden qué foto (controles, menores, libre), el banco/R2, y la del panel. `fotos-controles` y `fotos-menores-oficiales` se quedan aparte: son del núcleo. |
| **Auditoría** | `auditoria-28-09` (14), `auditoria-23-10` (16), `auditoria-ia` (11), `auditoria-correccion` (14) | 55 | Los dos por fecha (28/09 y 23/10) son un cajón de arreglos de varias reglas; repartir cada prueba en el archivo del tema que cuida y borrar el cajón. |
| **Archivo y R2** | `archivo` (38), `archivo-produccion` (17), `archivo-cloudflare` (27), `archivar-a-r2` (40), `archivar-piezas` (19), `r2-s3` (6) | 147 | Dejar `archivo` (núcleo) aparte y juntar los de Cloudflare/R2. |
| **Nube / Workers** | `motor-cloudflare` (22), `motor-espejo` (6), `tareas-cloudflare` (16), `desplegar-nube` (9), `render-publico` (17), `informe-nube` (5), `redes-nube` (12), `prompt-con-cloudflare` (4) | 91 | Un solo grupo "la mudanza"; si se decide prenderla, quedan; si se vuelve a GitHub, sobran casi todas. |

## Lo que probablemente sobra o está viejo

- **Pruebas que leen el texto del código con una expresión regular** (33 archivos usan `readFileSync` sobre un `.mjs`/`.js` propio; `redes-criterio` 18, `ilustrar-notas` 15,
  `archivo-produccion` 12, `repetidas-2-0` 9, `cuerpo` 9…). Se rompen aunque la regla siga igual y no atrapan un error de comportamiento. Reescribir las que cuidan reglas
  (como la de `criterios-extranjero-zona.test.mjs`, ya hecha) y borrar las que sólo miran que un nombre exista.
- **Títulos con números viejos**: `archivo.test.mjs` "corta las listas en 72 horas" (son 36); el encabezado de `criterios-extranjero-zona` (habla de sepelios y de 7 días);
  `secciones-flacas` ("82 fuentes", "cupo 0"). Cambian el nombre, no lo que prueban.
- **`esViejaSinSalir` está probada dos veces**: en `balcarce-todas.test.mjs` (con ejemplos reales) y ahora en `criterios-extranjero-zona.test.mjs` (los bordes de 72 horas). Quedarse con la de `balcarce-todas` y pasarle los dos bordes nuevos.
- **Pruebas de documentos que se repiten** (por revisar archivo por archivo antes de decidir): `como-trabajamos`, `tablas-fijas`, `tablas-sin-jerga` y `datos-fijos` parecen mirar textos y tablas; si el documento cambia a propósito, se rompen sin que nada falle de verdad. Juntar en uno y dejar sólo las que cuidan un número.
- **Dos listas de lo mismo**: la línea `git add` de `actualizar.yml` y `infra/motor-cloudflare/archivos.mjs` tienen una prueba que las iguala; cuando se apague el workflow viejo, sobra (auditoría, "Peso y ruido").
- **Lo que prueba código que se va a borrar** (auditoría, B1 a B5): `aflojaParaLoDeAca`, `MOTIVO_CUPO`, `reservaParaLocales`, `ingesta/secciones-nuevas-sombra.mjs`. Algunas ya se sacaron con la regla 296; mirar que no quede ninguna.

## Orden sugerido

1. Sumar al núcleo las cuatro pruebas de las reglas nuevas (7 de la lista corta) y la corta de redes (8).
2. Juntar sin borrar pruebas: vigilancia, reloj, efemérides, pistas (el grupo de menor riesgo: no tocan lo que se publica).
3. Reemplazar las pruebas de texto de código por pruebas de comportamiento, de a una, empezando por las que cuidan una regla del dueño.
4. Recién ahí, borrar lo que quedó duplicado.
