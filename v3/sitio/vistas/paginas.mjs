// Las páginas de texto del sitio: quiénes somos, cómo trabajamos, contacto, política de privacidad y publicidad.
// Escritas a mano (la fuente es v3/nucleo/PERFIL.md). Si cambia algo de lo que decimos acá, se cambia acá.
import { pagina } from './base.mjs';
import { TEXTO_PROPIO } from './avisos.mjs';

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
export const RUTAS_DE_TEXTO = [...Object.keys(PAGINAS), 'publicidad'];

/** Una de las cuatro páginas de texto, o null si no existe. */
export function paginaDeTexto(clave, { indexar, contexto } = {}) {
  const p = PAGINAS[clave];
  if (!p) return null;
  return pagina({ titulo: p.titulo, descripcion: p.descripcion, canonico: `/${clave}`, indexar, contexto, cuerpo: `<article class="texto">${p.html}</article>` });
}

// ---------------------------------------------------------------- /publicidad

export const PLANES = [
  { precio: '$ 5.000', clima: '—', promo: '4', historias: '4', posteos: '—', aviso: 'Rotativo · 1 lugar' },
  { precio: '$ 10.000', clima: '2', promo: '5', historias: '6', posteos: '—', aviso: 'Rotativo · 2 lugares' },
  { precio: '$ 20.000', clima: '3', promo: '6', historias: '8', posteos: '—', aviso: 'Rotativo · 3 lugares' },
  { precio: '$ 30.000', clima: '4', promo: '8', historias: '10', posteos: '2', aviso: 'Rotativo · 3 lugares' },
  { precio: '$ 50.000', clima: '6', promo: '10', historias: '12', posteos: '4', aviso: 'Fijo + 3 rotativos' },
];

/** El esquema de la portada con los cuatro lugares marcados (mismo dibujo en el manual). */
export const ESQUEMA_PORTADA = `<svg class="esquema" viewBox="0 0 320 400" role="img" aria-label="Esquema de la portada con los cuatro lugares de aviso" xmlns="http://www.w3.org/2000/svg">
<rect x="1" y="1" width="318" height="398" rx="8" fill="#fffdf8" stroke="#e4dfd2" stroke-width="2"/>
<rect x="14" y="12" width="292" height="22" rx="4" fill="#14161a"/><text x="160" y="27" text-anchor="middle" font-size="11" fill="#f4f1ea" font-family="sans-serif">Radar Balcarce · menú</text>
<rect x="14" y="42" width="292" height="30" rx="4" fill="#e8a33c"/><text x="160" y="62" text-anchor="middle" font-size="12" font-weight="700" fill="#14161a" font-family="sans-serif">1 · Fijo</text>
<rect x="14" y="82" width="180" height="78" rx="4" fill="#e4dfd2"/><text x="104" y="125" text-anchor="middle" font-size="11" fill="#5c6068" font-family="sans-serif">Nota principal</text>
<rect x="202" y="82" width="104" height="78" rx="4" fill="#efece3"/><text x="254" y="125" text-anchor="middle" font-size="11" fill="#5c6068" font-family="sans-serif">Titulares</text>
<rect x="14" y="168" width="92" height="52" rx="4" fill="#e4dfd2"/><rect x="114" y="168" width="92" height="52" rx="4" fill="#e4dfd2"/><rect x="214" y="168" width="92" height="52" rx="4" fill="#e4dfd2"/>
<text x="160" y="198" text-anchor="middle" font-size="11" fill="#5c6068" font-family="sans-serif">Postales</text>
<rect x="14" y="228" width="292" height="28" rx="4" fill="#e8a33c"/><text x="160" y="247" text-anchor="middle" font-size="12" font-weight="700" fill="#14161a" font-family="sans-serif">2 · Después de las postales</text>
<rect x="14" y="264" width="180" height="84" rx="4" fill="#efece3"/><text x="104" y="310" text-anchor="middle" font-size="11" fill="#5c6068" font-family="sans-serif">Última hora</text>
<rect x="202" y="264" width="104" height="84" rx="4" fill="#e8a33c"/><text x="254" y="304" text-anchor="middle" font-size="12" font-weight="700" fill="#14161a" font-family="sans-serif">3 · Columna</text>
<rect x="14" y="360" width="292" height="28" rx="4" fill="#e8a33c"/><text x="160" y="379" text-anchor="middle" font-size="12" font-weight="700" fill="#14161a" font-family="sans-serif">4 · Pie de página</text>
</svg>`;

export function paginaDePublicidad({ indexar, contexto } = {}) {
  const fila = (nombre, clave) => `<tr><td>${nombre}</td>${PLANES.map((p) => `<td>${p[clave]}</td>`).join('')}</tr>`;
  const html = `<h1>Publicidad en Radar Balcarce</h1>
<p>Radar Balcarce es el diario digital de Balcarce. Si tenés un comercio, un emprendimiento o un servicio en la ciudad y la zona, acá lo ven tus vecinos: en el sitio, en Facebook y en Instagram, con voz propia.</p>
<h2>La bienvenida, para todos</h2>
<p>Cuando un comercio se suma, hacemos <strong>una nota sobre su emprendimiento</strong>, un <strong>reel con voz</strong> y una <strong>historia</strong> que cuenta esa nota. Se hace una sola vez y no se cobra aparte.</p>
<h2>Los cinco planes</h2>
<p>Precios por mes. Lo distintivo: <strong>el clima auspiciado</strong>. Cuando se lee el clima del día, la voz dice «El clima de hoy llega con tu comercio» y aparece tu nombre y tu red social. Hasta diciembre de 2026 hay <strong>promoción con más climas</strong>.</p>
<div class="tabla-planes"><table>
<thead><tr><th>Por mes</th>${PLANES.map((p) => `<th>${p.precio}</th>`).join('')}</tr></thead>
<tbody>
${fila('Climas auspiciados', 'clima')}
${fila('Con la promoción hasta diciembre de 2026', 'promo')}
${fila('Historias con tus promociones', 'historias')}
${fila('Posteos con foto en Facebook e Instagram', 'posteos')}
${fila('Aviso en el sitio, con tu contacto', 'aviso')}
</tbody></table></div>
<p>Cada clima lleva un solo auspiciante y se reserva por orden de llegada. Si se llena, queda lista de espera: nadie pierde lo que compró.</p>
<h2>Dónde va tu aviso en el sitio</h2>
<p>Hay cuatro lugares. El <strong>fijo</strong> es para un solo comercio por mes. Los otros tres <strong>rotan</strong>: se reparten por igual entre todos los que pautan. Todos llevan el rótulo «Publicidad» y tu enlace.</p>
${ESQUEMA_PORTADA}
<ul>
<li><strong>1 · Fijo:</strong> arriba de las noticias, en la portada, las notas y las secciones. Sólo en el plan de $ 50.000.</li>
<li><strong>2 · Después de las postales:</strong> en la portada, entre las fotos y «Última hora».</li>
<li><strong>3 · Columna:</strong> al costado de «Última hora», en la portada (en el celular, entre las noticias).</li>
<li><strong>4 · Pie:</strong> al final de todas las páginas, incluida cada nota.</li>
</ul>
<h2>Hablemos</h2>
<p>Escribinos por WhatsApp al ${enlaceWa} o por mail a ${enlaceMail}. Te contamos cómo empezar y qué necesitamos de tu comercio (el logo, algunas fotos y una promoción para los lectores de Radar).</p>
<p><a class="btn" href="${WHATSAPP_URL}" rel="noopener">Escribinos por WhatsApp</a></p>
<p class="meta">${TEXTO_PROPIO}. Los avisos de otras empresas (publicidad de Google) van aparte, en lugares propios, y siempre marcados.</p>`;
  return pagina({ titulo: 'Publicidad', descripcion: 'Cómo anunciar tu comercio en Radar Balcarce: cinco planes desde $ 5.000 por mes, climas auspiciados, historias y avisos en el sitio.', canonico: '/publicidad', indexar, contexto, cuerpo: `<article class="texto">${html}</article>` });
}
