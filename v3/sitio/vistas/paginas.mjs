// Las páginas de texto del sitio: quiénes somos, cómo trabajamos, contacto y política de privacidad. /publicidad ya no es una página: redirige (301) a la nota del media kit.
// Escritas a mano (la fuente es v3/nucleo/PERFIL.md). Si cambia algo de lo que decimos acá, se cambia acá.
import { pagina } from './base.mjs';

export const WHATSAPP = '2266 51-1612';
export const WHATSAPP_URL = 'https://wa.me/5492266511612';
export const MAIL = 'contacto@radarbalcarce.com';
export const ACTUALIZADA = '3 de noviembre de 2026';

const enlaceWa = `<a href="${WHATSAPP_URL}" rel="noopener">${WHATSAPP}</a>`;
const enlaceMail = `<a href="mailto:${MAIL}">${MAIL}</a>`;

const QUIENES = {
  titulo: 'Quiénes somos',
  descripcion: 'Radar Balcarce es el diario digital de Balcarce, hecho por vecinos: quién lo edita, qué postura tiene y cómo contactarnos.',
  html: `<h1>Quiénes somos</h1>
<p>Radar Balcarce es el diario digital de Balcarce, hecho por vecinos y con un perfil de <strong>participación ciudadana</strong>. Nació porque los medios locales, sin ser gigantes, muchas veces no llegan al comerciante, al club, a la feria o al evento que arma un vecino: todo lo que no es estatal no se cubre, y no hay una agenda real de lo que pasa en la ciudad.</p>
<p>Por eso contamos <strong>todo lo que le da vida a Balcarce y la zona</strong>, lo institucional y lo que no: el comercio que abre arriesgando, la feria, el festejo que organiza un kiosco, el reclamo de un barrio. De lo nacional, sólo lo que de verdad importa, lo que cuentan muchos medios.</p>
<p>No buscamos lucro: queremos sostenernos solos, con los comercios que quieran acompañarnos, para seguir sumando proyectos y estar más en la calle. Y queremos ser, con el tiempo, un lugar de <strong>control ciudadano</strong> sobre la gestión, sin importar el partido: qué hizo el Estado, qué debía hacer y qué no hizo.</p>
<h2>Nuestra postura</h2>
<ul>
<li><strong>Pluralidad.</strong> Gane quien gane y diga lo que diga otro medio, mantenemos la pluralidad: el que quiera opinar o contestar, tiene lugar.</li>
<li><strong>Tomamos postura, y la decimos.</strong> Radar es de centro o centro-derecha. Las notas propias dicen qué está mal, quién es responsable y qué debería pasar. Somos críticos de la gestión, sea cual sea, sin funcionario amigo.</li>
<li><strong>Positivos.</strong> Festejamos lo que se hace bien en Balcarce y tratamos de que las cosas salgan mejor.</li>
<li><strong>A favor de la diversidad</strong>: que cada uno haga lo que quiera sin molestar al otro.</li>
<li><strong>A favor de la tecnología</strong> y de la inteligencia artificial, que usamos todos los días y de la que te contamos cómo (en <a href="/como-trabajamos">Cómo trabajamos</a>).</li>
</ul>
<h2>Lo que no hacemos</h2>
<p>Nada de chismes ni de comentarios maliciosos sin fundamento. Lo que llega en caliente se coteja antes de publicar, y si nos equivocamos, rectificamos enseguida. No identificamos a menores ni a víctimas, no publicamos listas de sepelios, no inventamos datos, no copiamos frases de otros medios y no hacemos sensacionalismo.</p>
<h2>Quién está detrás</h2>
<ul>
<li><strong>Hernán Accomo</strong>, fundador y director. Radar es suyo. Elige qué sale y qué no, y firma las notas propias.</li>
<li><strong>Andrés Gerace</strong>, socio y compañero de Hernán en los otros proyectos, colabora en Radar.</li>
<li><strong>Redacción Radar Balcarce</strong>: las notas escritas con inteligencia artificial a partir de varias fuentes y verificadas contra ellas. Cada nota dice quién la escribió.</li>
</ul>
<p>Si querés escribir, contar lo tuyo o sumarte con tu firma, la puerta está abierta.</p>
<h2>Contacto</h2>
<p>WhatsApp ${enlaceWa} · Mail ${enlaceMail} · Facebook e Instagram <strong>@radarbalcarce</strong>. Más en <a href="/contacto">Contacto</a>.</p>`,
};

const COMO = {
  titulo: 'Cómo trabajamos',
  descripcion: 'Cómo se hacen las notas de Radar Balcarce: de dónde sale la información, cómo escribe la inteligencia artificial, cómo se verifica y cómo pedir una corrección.',
  html: `<h1>Cómo trabajamos</h1>
<p>Radar Balcarce es un medio automático con una redacción humana atrás. Te contamos, sin vueltas, cómo se hace cada nota.</p>
<h2>1. Leemos las fuentes</h2>
<p>Todo el día revisamos los medios de Balcarce, de la región y del país, y organismos oficiales. Cuando varios cuentan lo mismo, lo juntamos en una sola historia en vez de repetirla. De lo que pasa afuera sólo publicamos lo que importa y lo que cuentan muchos medios; de Balcarce, todo lo que podamos confirmar.</p>
<h2>2. La escribe una inteligencia artificial, con nuestro criterio</h2>
<p>Las notas automáticas las redacta una IA que sigue un criterio editorial escrito por nosotros: de vos, claro, sin sensacionalismo, sin opinión en las notas de noticias y sin copiar frases de otros medios. La IA no inventa: trabaja con lo que dicen las fuentes de esa nota.</p>
<h2>3. La verificamos contra las fuentes</h2>
<p>Antes de salir, lo que escribió la IA se controla contra las fuentes: nombres, cifras, fechas y citas tienen que estar respaldados. Si no cierra, la nota no se publica o se corrige. Cada nota tiene un desplegable <strong>Fuentes</strong> con los medios de los que sale y el enlace a cada uno.</p>
<h2>4. Cada nota dice quién la escribió</h2>
<p>Las automáticas se firman <strong>Redacción Radar Balcarce</strong> y aclaran que fueron escritas con IA y verificadas. Las notas propias, las que arma la redacción con su mirada y su postura, llevan el nombre de quien las firma.</p>
<h2>Notas propias de la redacción</h2>
<p>Además de lo automático, la redacción publica notas propias: coberturas, columnas, gacetillas de instituciones y notas sobre comercios y emprendimientos de Balcarce. Esas las escribe o las revisa una persona y las firma.</p>
<h2>Lo que nunca publicamos</h2>
<ul>
<li>Nada que identifique a un <strong>menor</strong> o a una <strong>víctima</strong>.</li>
<li>Listas de <strong>sepelios</strong>.</li>
<li>Datos inventados, rumores sin sostén o chismes.</li>
<li>Fotos con marca de agua de otro medio: si usamos una foto ajena, va con su crédito.</li>
</ul>
<h2>Correcciones</h2>
<p>Si encontrás un error, avisanos y lo corregimos enseguida. Cuando el error es de fondo, lo aclaramos en la misma nota. Escribinos por WhatsApp al ${enlaceWa} o por mail a ${enlaceMail}, con el enlace de la nota y qué está mal.</p>
<h2>Publicidad</h2>
<p>La publicidad está siempre marcada como <strong>Publicidad</strong> y separada de las notas. Quien pauta no decide qué publicamos. Más en <a href="/publicidad">Publicidad</a>.</p>`,
};

const CONTACTO = {
  titulo: 'Contacto',
  descripcion: 'Escribinos a Radar Balcarce por WhatsApp, por mail o por las redes: noticias, fotos, correcciones y publicidad.',
  html: `<h1>Contacto</h1>
<p>Escribinos cuando quieras: un dato, una foto, un reclamo, una corrección o una consulta por publicidad.</p>
<ul>
<li><strong>WhatsApp:</strong> ${enlaceWa} (<a href="${WHATSAPP_URL}" rel="noopener">abrir el chat</a>). Es lo más rápido: mandá fotos, videos o un audio.</li>
<li><strong>Mail:</strong> ${enlaceMail}</li>
<li><strong>Facebook e Instagram:</strong> <strong>@radarbalcarce</strong></li>
</ul>
<h2>¿Viste algo en el barrio?</h2>
<p>Mandalo por WhatsApp. Lo revisamos y, si se puede confirmar, lo publicamos. Podés pedir que no pongamos tu nombre.</p>
<h2>¿Encontraste un error?</h2>
<p>Mandanos el enlace de la nota y qué está mal. Cómo corregimos, en <a href="/como-trabajamos">Cómo trabajamos</a>.</p>
<h2>¿Tenés un comercio?</h2>
<p>Mirá cómo sumarte en <a href="/publicidad">Publicidad</a>.</p>`,
};

const PRIVACIDAD = {
  titulo: 'Política de privacidad',
  descripcion: 'Qué datos recibe Radar Balcarce, cómo medimos las visitas, qué cookies usamos (propias y de Google) y cómo pedir que borremos tus datos.',
  html: `<h1>Política de privacidad</h1>
<p class="meta">Última actualización: ${ACTUALIZADA}.</p>
<p>Esta página explica qué datos tuyos tratamos en radarbalcarce.com, para qué y qué podés hacer vos. Cumplimos con la Ley 25.326 de Protección de los Datos Personales de la Argentina.</p>
<h2>Lo que nos mandás</h2>
<p>Si nos escribís por WhatsApp o por mail, recibimos lo que nos mandes: tu nombre, tu teléfono o tu casilla y el texto, las fotos o el audio. Nunca es obligatorio dejar tu nombre: podés pedir que no lo publiquemos. Lo usamos para volver a contactarte si hace falta verificar algo y para armar la nota o el seguimiento que pediste. No vendemos ni compartimos tu contacto con nadie. Tu teléfono nunca se publica.</p>
<h2>Dónde vive el sitio</h2>
<p>El sitio funciona sobre <strong>Cloudflare</strong>. Cuando entrás, Cloudflare procesa tu dirección IP y datos técnicos del pedido para entregarte la página y protegerla de ataques. Para mostrarte el clima y la farmacia de turno, nuestro servidor consulta a Open-Meteo y al Colegio de Farmacéuticos: esas consultas las hace el servidor, no tu navegador, y no llevan datos tuyos.</p>
<h2>Cómo medimos las visitas</h2>
<p>Contamos cuánta gente entra y qué notas se leen con <strong>Cloudflare Web Analytics</strong>, que <strong>no usa cookies</strong>, no arma un perfil tuyo y no te sigue a otros sitios. Sabemos que alguien entró, desde qué tipo de aparato y qué página miró; nada más.</p>
<h2 id="cookies">Cookies</h2>
<ul>
<li><strong>Cookie propia, <code>radar_cookies</code>:</strong> sólo recuerda si aceptaste o no las cookies de terceros. Dura 6 meses. Es la única cookie que guardamos nosotros.</li>
<li><strong>Google AdSense (publicidad) y Google Analytics (medición):</strong> podemos usarlos. Si los usamos, aparece un aviso abajo con dos botones. Con <strong>Aceptar</strong>, Google puede guardar cookies y mostrarte anuncios según tus visitas y tus intereses, y medir cómo usás el sitio. Con <strong>Sólo necesarias</strong>, no se carga nada de Google. Podés cambiar tu elección cuando quieras con el botón «Cookies» del pie de página.</li>
</ul>
<p>Más sobre cómo Google usa los datos: <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">policies.google.com/technologies/partner-sites</a>. Para elegir qué anuncios personalizados ver: <a href="https://adssettings.google.com" rel="noopener">adssettings.google.com</a>. También podés bloquear o borrar cookies desde tu navegador.</p>
<h2>Publicidad local</h2>
<p>Los avisos de comercios de Balcarce los cargamos nosotros: no usan cookies ni te siguen. Si tocás uno, vas al sitio o a la red del comercio, que tiene su propia política.</p>
<h2>Tus derechos y cómo pedir que borremos tus datos</h2>
<p>Tenés derecho a saber qué datos tuyos tenemos, a corregirlos y a pedir que los borremos. Escribinos por WhatsApp al ${enlaceWa} o por mail a ${enlaceMail} y lo hacemos. Si ya publicamos una nota que salió de un dato tuyo, borrar tu contacto no borra la nota; eso se resuelve aparte, hablando con la redacción.</p>
<p>La Agencia de Acceso a la Información Pública es el órgano de control de la Ley 25.326 y puede recibir denuncias y reclamos por incumplimientos.</p>
<h2>Cambios</h2>
<p>Si cambiamos algo de esta política, lo actualizamos acá y cambiamos la fecha de arriba.</p>`,
};

const PAGINAS = { 'quienes-somos': QUIENES, 'como-trabajamos': COMO, 'contacto': CONTACTO, 'politica-de-privacidad': PRIVACIDAD };
// 'publicidad' sigue siendo una ruta propia del sitio, pero sólo para redirigir (ver sitio.mjs).
export const RUTAS_DE_TEXTO = [...Object.keys(PAGINAS), 'publicidad'];

/** Una de las páginas de texto, o null si no existe. */
export function paginaDeTexto(clave, { indexar, contexto } = {}) {
  const p = PAGINAS[clave];
  if (!p) return null;
  return pagina({ titulo: p.titulo, descripcion: p.descripcion, canonico: `/${clave}`, indexar, contexto, cuerpo: `<article class="texto">${p.html}</article>` });
}
