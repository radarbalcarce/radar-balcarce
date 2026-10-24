import { metadatosDePagina } from '@/components/metadatos';
import { MAIL, whatsapp, WHATSAPP } from '@/lib/datos';

// Quiénes somos y cómo trabajamos.
//
// Es lo primero que miran Google, AdSense y cualquier lector desconfiado
// para decidir si un medio es confiable: quién lo hace, cómo elige qué
// publicar, qué parte hace una máquina y qué parte una persona. Todo lo que
// dice acá tiene que ser cierto hoy; si cambia cómo trabajamos (CRITERIO-EDITORIAL.md),
// se cambia esta página.
//
// 17/10/2026 (regla 256): "Cómo trabajamos" se completó con lo que un lector, otro medio o un buscador quieren saber de un medio
// automático: qué hacemos con lo que publican otros, cómo se elige, cómo se usa la IA, qué espera a una persona, cómo corregimos un error
// y cómo pedir que no usemos algo. Los ids de abajo (quienes-somos, como-trabajamos, lo-que-no-hacemos, si-algo-esta-mal) los usan los datos
// estructurados del sitio (lib/datos-estructurados.js, ANCLAS_DE_POLITICAS): no se cambian. Los nuevos se pueden enlazar.
//
// Sin datos personales de más: nombres de pila y nada de apellidos,
// direcciones ni teléfonos particulares.

export const metadata = metadatosDePagina({
  titulo: 'Quiénes somos y cómo trabajamos',
  descripcion: 'Qué es Radar Balcarce, quién lo hace y cómo trabaja: cómo resumimos lo que publican otros medios, qué escribe la inteligencia artificial, qué revisa una persona y cómo corregimos un error.',
  camino: '/quienes-somos',
});

const TITULO = { fontSize: 20, marginTop: 28, marginBottom: 8 };

export default function QuienesSomos() {
  return (
    <div className="envoltura" style={{ maxWidth: 700 }}>
      <h1 id="quienes-somos" className="fraunces" style={{ fontSize: 34, marginBottom: 18 }}>Quiénes somos</h1>

      <div className="texto-pagina" style={{ fontSize: 15.5, lineHeight: 1.7 }}>
        <p>
          Radar Balcarce es un medio digital de Balcarce, provincia de Buenos Aires. Reúne en un
          solo lugar lo que pasa en la ciudad, la región y el país, y suma lo que la gente viene a
          buscar todos los días: la farmacia de turno, el clima, la agenda y los teléfonos útiles.
        </p>
        <p>
          Lo hacen Hernán y Andrés, dos vecinos de Balcarce. Es un proyecto independiente: no
          depende del municipio, de un partido ni de otro medio.
        </p>

        <h3 id="como-trabajamos" style={TITULO}>Cómo trabajamos</h3>
        <p>
          Radar Balcarce es un medio <strong>automático</strong>, y preferimos decirlo de entrada.
          Cada media hora un programa lee las noticias que publican los medios locales, los de la
          región y algunos nacionales, y decide cuáles son de interés para Balcarce. Lo de Balcarce
          entra siempre; lo que pasa en el resto del país, según cuántos medios lo cuentan y cuánto
          le importa a un vecino de acá.
        </p>
        <ul style={{ paddingLeft: 20 }}>
          <li>
            <strong>Resumimos lo que publicaron otros medios.</strong> No tenemos reporteros en la
            calle: el trabajo de ir, ver y preguntar es de los medios que cuentan cada hecho. Lo que
            hacemos nosotros es leerlos, juntar lo que contaron varios sobre lo mismo y escribir un
            resumen con palabras propias, sin copiar la nota.
          </li>
          <li>
            <strong>Siempre con las fuentes a mano.</strong> Al pie de cada nota hay un desplegable
            «Fuentes (N)» que lista todos los medios que se usaron, cada uno con el enlace a su nota.
          </li>
          <li>
            <strong>Las notas las escribe una inteligencia artificial</strong> con lo que publicaron
            las fuentes. Un segundo programa las verifica contra esas fuentes antes de publicarlas:
            si aparece un número, un nombre, una fecha o una cita que ninguna trae, esa parte se
            descarta. Una nota que no llega a tener un cuerpo completo no se publica. La IA puede
            equivocarse; por eso la fuente está siempre al alcance y por eso corregimos (más abajo).
          </li>
          <li>
            <strong>Lo sensible lo revisa una persona.</strong> Lo que podría identificar a un menor
            o a una víctima no sale solo: espera a que uno de nosotros lo lea y decida. Lo dudoso
            (una promoción, un dato que no se pudo verificar bien) también puede esperar. Y todo lo
            de Política y Policiales pasa por una persona antes de llegar a nuestras redes.
          </li>
          <li>
            <strong>Cada nota dice quién la escribió</strong>, en la primera línea del desplegable
            «Fuentes (N)» del pie: si la redactó la IA, si la revisó la redacción o si el texto es el de la
            fuente. Las fichas de la agenda y las notas propias (como la del dólar) se arman con
            datos, sin IA, y también lo dicen.
          </li>
          <li>
            <strong>Las fechas son las del hecho.</strong> «Publicado» es cuándo salió la noticia, y
            no se corre para que parezca más nueva. Si una persona corrige una nota después, se
            suma «Actualizado» con la fecha de esa corrección.
          </li>
          <li>
            Las voces de nuestros videos también se producen con inteligencia artificial, y cuando
            una nota no tiene foto puede llevar una ilustración hecha con IA, que lo dice en el
            epígrafe.
          </li>
        </ul>

        <h3 id="lo-que-no-hacemos" style={TITULO}>Lo que no hacemos</h3>
        <ul style={{ paddingLeft: 20 }}>
          <li>
            <strong>No usamos fotos sin decir de dónde salen.</strong> Cada una lleva el crédito de
            quien la sacó o del medio u organismo de donde viene, y nunca la marca de otro medio
            adentro de la imagen. Si no hay una que sirva, va una ilustración hecha con IA (que
            lo dice) o una placa con el dibujo de la sección. Si una foto es tuya y no querés que esté,{' '}
            <a href="#no-usar-algo">pedilo acá abajo</a> y la sacamos.
          </li>
          <li>
            <strong>No identificamos a menores ni a víctimas</strong> de violencia de género o de
            delitos sexuales. Una nota que lo haría no se publica (leyes 26.061 y 26.485).
          </li>
          <li>
            No inventamos: si la inteligencia artificial agrega algo que la fuente no dice, ese
            texto no se usa.
          </li>
        </ul>

        <h3 id="si-algo-esta-mal" style={TITULO}>Si algo está mal</h3>
        <p>
          Nos equivocamos, como cualquiera, y un medio automático también. Si ves un error, o si
          publicamos algo sobre vos que considerás erróneo, <a href="/contacto#correcciones">escribinos</a> y
          lo corregimos. La responsabilidad editorial es de Radar Balcarce.
        </p>

        <h3 id="como-corregimos" style={TITULO}>Cómo corregimos un error</h3>
        <ol style={{ paddingLeft: 20 }}>
          <li>
            <strong>Avisanos.</strong> Mandanos el enlace de la nota (o el titular) y qué está mal, por
            correo a <a href={`mailto:${MAIL}?subject=${encodeURIComponent('Pedido de corrección')}`}>{MAIL}</a>{' '}
            o por <a href={whatsapp('Hola, quiero pedir una corrección en Radar Balcarce:')} target="_blank" rel="noopener noreferrer">WhatsApp</a>{' '}
            ({WHATSAPP.visible}). Cada nota tiene también un enlace «Avisanos» al pie, con el titular ya escrito.
          </li>
          <li>
            <strong>Lo mira una persona</strong>, que lo compara con la fuente original.
          </li>
          <li>
            <strong>Se corrige en la propia nota</strong>, sin dejar el error a la vista. Si no se
            puede confirmar o la nota no tendría que haber salido, se saca. Si la nota se corrige,
            se suma la fecha de «Actualizado».
          </li>
          <li>
            Si el error viene del medio de donde sacamos el dato, también te conviene avisarle a ese
            medio, que figura en la nota.
          </li>
        </ol>
        <p className="mini">Hoy no llevamos un registro público de correcciones.</p>

        <h3 id="no-usar-algo" style={TITULO}>Si no querés que usemos algo</h3>
        <p>
          Si sos un medio o un autor y no querés que resumamos lo que publicás, si una foto o un
          texto tuyo no tendría que estar en el sitio, o si aparece un dato personal tuyo donde no
          corresponde, escribinos a <a href={`mailto:${MAIL}?subject=${encodeURIComponent('Pedido para que no usen un contenido')}`}>{MAIL}</a>{' '}
          con el enlace de la nota y qué querés que no usemos. Lo revisamos y, si corresponde, lo
          sacamos o dejamos de usar esa fuente.
        </p>

        <p>
          Qué datos pedimos y cómo medimos las visitas está en la{' '}
          <a href="/politica-de-privacidad">política de privacidad</a>.
        </p>
      </div>
    </div>
  );
}
