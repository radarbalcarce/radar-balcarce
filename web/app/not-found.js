import { destinoDesde404 } from '@/lib/ruta';

// Una sola etiqueta `robots` (24/10/2026, regla 321). Next ya le agrega a toda página 404 su propio `<meta name="robots" content="noindex">`;
// la del layout (`index, follow, max-image-preview…`) se sumaba al lado y la página decía dos cosas contrarias (manda la más restrictiva, pero
// es un descuido que ensucia lo que ve un auditor). Con `robots: null` la de la plantilla no se escribe y queda sólo la de Next.
export const metadata = { robots: null };

// Rescatar enlaces viejos de notas.
//
// El sitio es HTML estático: Cloudflare Pages sirve esta página (404.html)
// cuando la dirección no existe. Si es una nota con un titular que ya no es
// el de la dirección (un enlace compartido antes de que se corrigiera), o
// /nota/ID a secas, el identificador del final alcanza para encontrarla: se
// busca en /nota/indice.json y se manda a la dirección buena. Pasó el 25/09:
// los enlaces publicados en Facebook daban 404 porque la IA había
// reescrito el titular después de publicar.
//
// La lógica está en lib/ruta.js (destinoDesde404), probada; acá se copia
// tal cual adentro del <script>.
const RESCATE = `(function () {
  if (location.pathname.indexOf('/nota/') !== 0 || !window.fetch) return;
  var destino = ${destinoDesde404.toString()};
  fetch('/nota/indice.json')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (indice) {
      var a = destino(location.pathname, indice);
      if (a) location.replace(a + location.search + location.hash);
    })
    .catch(function () {});
})();`;

export default function NoEncontrado() {
  return (
    <div className="envoltura" style={{ padding: '60px 20px', textAlign: 'center' }}>
      <script dangerouslySetInnerHTML={{ __html: RESCATE }} />
      <h1 className="fraunces" style={{ fontSize: 32 }}>No encontramos esa página</h1>
      <p className="mini" style={{ marginTop: 10 }}>Puede que la nota se haya movido o que el link esté roto.</p>
      <a href="/" className="boton rojo" style={{ marginTop: 20 }}>Volver a la portada</a>
    </div>
  );
}
