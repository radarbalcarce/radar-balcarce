// Nombres propios de persona de un artículo (REGLAS § 3, «el nombre propio»). Sin IA, sin red.
// Un nombre es un par de palabras seguidas con mayúscula (Nombre Apellido) sacado del título, la bajada y los primeros ~600 caracteres del texto.
// Se guarda sin tildes y en minúsculas («pamela gaitan»). Dos artículos que comparten uno son candidatos a ser el mismo hecho: sólo sirve para PREGUNTARLE al juez, nunca para unir solo.

const LARGO_DEL_TEXTO = 600;

const sinTildes = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Palabras con mayúscula que NO son nombre ni apellido: inicio de oración, cargos, instituciones, lugares, días y meses.
const NO_ES_NOMBRE = new Set(`
el la los las un una unos unas lo al del de en con por para sin sobre segun ante tras desde hasta entre contra durante mientras cuando donde como que quien
este esta estos estas ese esa esos esas aquel aquella su sus mi tu nuestro nuestra y o u e ni pero aunque ademas tambien luego despues antes ayer hoy manana anoche
fue es son era serian sera hay habra hubo tiene tienen
papa leon xiv francisco santo santa san beato obispo cardenal arzobispo monsenor padre sumo pontifice vaticano
balcarce mar plata mechongue loberia necochea tandil bahia blanca buenos aires argentina provincia ciudad partido pais nacion nacional
concejo deliberante municipalidad municipio intendencia intendente concejal concejales gobierno gobernador ministerio ministro secretaria secretario presidente presidenta
congreso senado diputados camara justicia juzgado fiscal fiscalia tribunal corte suprema
policia comando prevencion rural patrulla comisaria bomberos voluntarios hospital escuela colegio jardin universidad instituto club cooperativa sociedad asociacion centro
federacion union sindicato cgt inta anses afip arca banco
oficial agente suboficial comisario inspector sargento cabo teniente capitan coronel general
doctor doctora licenciado licenciada ingeniero ingeniera profesor profesora senor senora don dona
lunes martes miercoles jueves viernes sabado domingo enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre
dia semana mes ano hora informo confirmo aseguro dijo explico
calle avenida ruta plaza parque barrio
radio diario noticias canal television
copa liga torneo campeonato mundial seleccion
atletico tucuman argentinos juniors boca river racing independiente estudiantes gimnasia velez talleres belgrano newells central lanus banfield huracan platense tigre
sarmiento rosario cordoba mendoza estero santa fe salta jujuy chaco misiones corrientes entre rios neuquen chubut real madrid barcelona manchester united city
autodromo galvez fangio premio gran palacio teatro cine museo biblioteca parroquia iglesia catedral basilica
`.split(/\s+/).filter(Boolean));

// Nombres completos que salen en muchísimas notas de todo el país: compartirlos no dice que sea el mismo hecho.
const DEMASIADO_FAMOSOS = new Set([
  'javier milei', 'axel kicillof', 'cristina kirchner', 'mauricio macri', 'patricia bullrich', 'lionel messi', 'donald trump', 'karina milei', 'santiago caputo',
  'luis caputo', 'victoria villarruel', 'sergio massa', 'lionel scaloni', 'franco colapinto', 'nicolas maduro',
]);

const PALABRA = /\p{Lu}\p{Ll}{2,}/gu;

/** Los nombres de persona (Nombre Apellido) del artículo: `{ titulo, bajada, texto }` → lista sin repetidos, sin tildes y en minúsculas. */
export function nombresPropiosDe(articulo) {
  const origen = [articulo?.titulo, articulo?.bajada, String(articulo?.texto ?? articulo?.cuerpo ?? '').slice(0, LARGO_DEL_TEXTO)].filter(Boolean).join('. ');
  const salida = new Set();
  // Cada tramo de palabras con mayúscula pegadas (un solo espacio entre ellas); no cruza signos ni palabras en minúscula.
  const tramos = origen.match(/\p{Lu}\p{Ll}{2,}(?:[  ]\p{Lu}\p{Ll}{2,})+/gu) ?? [];
  for (const tramo of tramos) {
    const palabras = tramo.match(PALABRA) ?? [];
    for (let i = 0; i + 1 < palabras.length; i++) {
      const a = sinTildes(palabras[i]), b = sinTildes(palabras[i + 1]);
      if (NO_ES_NOMBRE.has(a) || NO_ES_NOMBRE.has(b)) continue;
      const nombre = `${a} ${b}`;
      if (DEMASIADO_FAMOSOS.has(nombre)) continue;
      salida.add(nombre);
    }
  }
  return [...salida];
}

/** ¿Comparten al menos un nombre de persona? (listas de `nombresPropiosDe`) */
export function nombreEnComun(a, b) {
  if (!a?.length || !b?.length) return false;
  const B = new Set(b);
  return a.some((n) => B.has(n));
}
