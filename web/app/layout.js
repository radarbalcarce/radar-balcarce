import './globals.css';
import { createElement } from 'react';
import {
  obtenerDatos, obtenerArchivo, whatsapp, WHATSAPP, MAIL, REDES_SOCIALES,
  navegacionDelSitio, seccionesDelSitio, nombreCorto,
} from '@/lib/datos';
import { PastillaClima } from '@/components/clima-vivo';
import { comoNombre } from '@/lib/texto';
import Buscador from '@/components/buscador';
import { Aviso } from '@/components/avisos';
import { sitio, enElDominioPropio, NOMBRE } from '@/lib/sitio';
import { FichaDelSitio } from '@/components/ficha';
import HorasVivas from '@/components/horas-vivas';
import Navegacion from '@/components/navegacion';
import { EnlacesDeCanales } from '@/components/canales';

const DESCRIPCION = 'Lo que pasa en Balcarce, la región y el país. Actualizado todo el día, con la fuente siempre a la vista.';

// Lo que ve todo el que comparte un enlace del sitio.
//
// Hasta ahora una nota compartida por WhatsApp llegaba como una dirección
// pelada: sin título, sin bajada y sin imagen. El botón de compartir que
// pusimos estaba tirando contra un muro.
//
// metadataBase no se escribe a mano: sale de lib/sitio.js, que mira dónde
// está corriendo el sitio de verdad. Mientras radarbalcarce.com no esté
// conectado, los enlaces apuntan a donde el sitio sí abre.
export const metadata = {
  metadataBase: new URL(sitio()),
  title: { default: NOMBRE, template: `%s · ${NOMBRE}` },
  description: DESCRIPCION,
  applicationName: NOMBRE,
  icons: { icon: [{ url: '/favicon.ico', sizes: 'any' }, { url: '/icon-192.png', type: 'image/png', sizes: '192x192' }, { url: '/icon-512.png', type: 'image/png', sizes: '512x512' }], apple: '/apple-touch-icon.png' },
  manifest: '/manifest.webmanifest',
  // Sin `canonical` acá: lo que se pone en el layout lo hereda toda página
  // que no declare el suyo, y el 25/09 /farmacias, /agenda, /util y la
  // política de privacidad le decían a Google "soy la portada". Cada página
  // declara su propio canónico (ver components/metadatos.js).
  alternates: { types: { 'application/rss+xml': '/feed.xml' } },
  openGraph: {
    siteName: NOMBRE,
    title: NOMBRE,
    description: DESCRIPCION,
    locale: 'es_AR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: NOMBRE, description: DESCRIPCION },
  // Mientras no estemos en el dominio propio, que no lo indexen: la misma
  // nota en dos direcciones es la forma más fácil de que Google elija la
  // equivocada.
  robots: enElDominioPropio()
    ? { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 }
    : { index: false, follow: false },
};

export const viewport = { themeColor: '#14161A' };

export default function RaizLayout({ children }) {
  const d = obtenerDatos();
  const farmacia = d.farmacias?.hoy;
  const clima = d.clima?.ahora;

  // Cuándo se armó esta página. La hora absoluta y no "hace veinte
  // minutos": el sitio es HTML estático, así que un "hace" calculado
  // al construirlo se queda congelado y a las tres horas miente.
  const actualizado = d.generado
    ? new Date(d.generado).toLocaleTimeString('es-AR', {
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'America/Argentina/Buenos_Aires',
    })
    : null;
  const hoyEscrito = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
  // Sólo la primera letra. Con text-transform: capitalize salía "Domingo,
  // 20 De Septiembre": en castellano ni el mes ni la preposición llevan
  // mayúscula, eso es del inglés.
  const fecha = hoyEscrito.charAt(0).toUpperCase() + hoyEscrito.slice(1);

  // Sólo se ofrecen las secciones que hoy tienen al menos una nota: una
  // pestaña que lleva a una página vacía es peor que no tenerla
  // (navegacionDelSitio, lib/datos.js). La barra lleva las ocho fuertes y el
  // resto va en "Más secciones" (regla 187, activa desde la 211).
  const menu = navegacionDelSitio({ notas: d.notas ?? [], archivo: obtenerArchivo() });
  // El pie lista todas las secciones: sin JavaScript el "Más secciones" no se abre.
  const pieSecciones = [(
    <nav className="pie-secciones" aria-label="Todas las secciones" key="pie-secciones">
      {seccionesDelSitio().map((s, i) => (
        <span key={s.ranura}>{i > 0 ? ' · ' : ''}<a href={`/seccion/${s.ranura}`}>{nombreCorto(s.nombre)}</a></span>
      ))}
    </nav>
  )];
  return (
    <html lang="es-AR">
      <head>
        {/* El feed se anuncia acá y no con un enlace en el pie: al que lo
            tocaba le aparecía una pantalla de código, porque un feed es
            para que lo lea un programa, no una persona. Los lectores de
            noticias lo encuentran solos por esta línea. */}
        <FichaDelSitio />
        <link rel="alternate" type="application/rss+xml" title="Radar Balcarce" href="/feed.xml" />
        {/* Source Serif 4 para los títulos e Inter para todo lo demás (27/09). Desde el 8/10 están en el propio sitio (web/public/fuentes/,
            @font-face en globals.css): sin pedirle nada a Google. Se precargan las dos que se usan en toda página. */}
        <link rel="preload" href="/fuentes/source-serif-4-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fuentes/inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <a className="saltar" href="#contenido">Saltar al contenido</a>
        <HorasVivas />
        {/* La chapa de servicio: clima y farmacia de turno, en todas las
            páginas. Son las dos cosas que la gente viene a buscar sin
            querer leer nada. */}
        <div className="chapa-superior">
          <div className="envoltura">
            {/* La fecha entera, también en el celular. La farmacia de al
                lado se esconde en pantalla chica y queda en la tarjeta de
                abajo, que ahí es lo primero que se ve. */}
            <span>{fecha}</span>
            <span className="apagado solo-grande">/</span>
            <span className="apagado solo-grande">Balcarce, Buenos Aires</span>
            <span className="crece" />

            {/* Desde el 28/09 hay página de clima (/clima): la pastilla lleva ahí. */}
            {clima && <a href="/clima" className="enlace-pastilla"><PastillaClima clima={clima} /></a>}

            {farmacia && (
              <a href="/farmacias" className="pastilla solo-grande">
                <span className="punto-vivo" />
                <span className="apagado">De turno</span>
                {/* El nombre sale del detalle, que es el del directorio del Colegio y
                    trae los acentos; el del cronograma viene en mayúsculas y grita. */}
                <span className="fuerte">
                  {(farmacia.detalle?.length ? farmacia.detalle.map((f) => f.nombre) : farmacia.farmacias)
                    .map(comoNombre).join(' y ')}
                </span>
              </a>
            )}
          </div>
        </div>

        <header className="principal">
          <div className="envoltura">
            {/* Sólo el nombre. La bajada de tres renglones y el botón se
                comían media pantalla de celular antes de la primera noticia:
                el que entró ya sabe dónde está y viene a leer, no a que le
                expliquen qué es el sitio. La invitación a escribirnos está
                en el pie y en la tarjeta del buzón. */}
            <a href="/" className="logo fraunces">Radar <span>Balcarce</span></a>
            <span style={{ flexGrow: 1 }} />
            {/* El buscador busca en todo el archivo con un índice que se arma al compilar (Pagefind, web/scripts/indexar.mjs) y que se baja
                sólo cuando alguien abre el buscador: las páginas ya no llevan adentro la lista de notas. */}
            <Buscador />
          </div>
        </header>

        {/* Navegación por secciones reales. Agenda, Clima, Farmacias, Dólar y Teléfonos
            van al final y en verde: son servicios, no secciones de noticias. En
            el celular es una sola fila que se desliza (components/navegacion.js). */}
        <Navegacion
          secciones={menu.secciones}
          servicios={[
            { href: '/agenda', nombre: 'Agenda' },
            { href: '/clima', nombre: 'Clima' },
            { href: '/farmacias', nombre: 'Farmacias' },
            { href: '/dolar', nombre: 'Dólar' },
            { href: '/util', nombre: 'Teléfonos' },
          ]}
          {...(menu.mas ? { mas: menu.mas } : {})}
        />

        <main id="contenido" tabIndex={-1}>{children}</main>

        {/* Las analíticas (Cloudflare Web Analytics, se prende desde el panel de Cloudflare, no desde el código): cuenta visitas y qué nota se leyó, sin
            cookies, sin seguir a nadie entre sitios y sin guardar direcciones
            IP. Se eligió ésta y no Google Analytics justamente por eso: un
            medio chico que promete cuidar a sus lectores no puede estar
            entregándoselos a una red publicitaria. */}

        {/* El pie se arma con createElement para que la lista de secciones (sólo con el interruptor, regla 187) no deje ni un
            hueco en lo que arma React cuando está apagado: el sitio apagado sale idéntico al de antes. */}
        <footer className="principal">
          {createElement('div', { className: 'envoltura' },
            <div className="marca">Radar Balcarce</div>,
            <div>
              <a href={whatsapp('Hola, escribo por Radar Balcarce:')} target="_blank" rel="noopener noreferrer">
                WhatsApp {WHATSAPP.visible}
              </a>
              {' · '}
              <a href={`mailto:${MAIL}`}>{MAIL}</a>
            </div>,
            <div>
              <a href={REDES_SOCIALES.instagram} target="_blank" rel="noopener noreferrer me">Instagram</a>
              {' · '}
              <a href={REDES_SOCIALES.facebook} target="_blank" rel="noopener noreferrer me">Facebook</a>
              {' · '}
              <a href={REDES_SOCIALES.tiktok} target="_blank" rel="noopener noreferrer me">TikTok</a>
              {' · '}
              <a href={REDES_SOCIALES.youtube} target="_blank" rel="noopener noreferrer me">YouTube</a>
            </div>,
            <EnlacesDeCanales />,
            <div>
              <a href="/hoy">Lo de hoy</a> · <a href="/agenda">Agenda</a> · <a href="/clima">Clima</a> · <a href="/farmacias">Farmacias</a> ·{' '}
              <a href="/dolar">Dólar</a> ·{' '}
              <a href="/util">Teléfonos útiles</a> ·{' '}
              <a href="/politica-de-privacidad">Política de privacidad</a>
            </div>,
            <div>
              <a href="/quienes-somos">Quiénes somos</a> · <a href="/quienes-somos#como-trabajamos">Cómo trabajamos</a> ·{' '}
              <a href="/contacto">Contacto y correcciones</a>
            </div>,
            ...pieSecciones,
            <div className="aclaracion" data-armada={actualizado || undefined}>
              Los resúmenes los escribe una inteligencia artificial y se verifican
              automáticamente contra la fuente original, que queda enlazada; lo sensible lo
              revisa una persona antes de salir. Las voces de nuestros videos también son
              de IA. Cada nota dice al pie quién la escribió.
              La responsabilidad editorial es de Radar Balcarce. Si publicamos algo sobre
              vos que considerás erróneo, escribinos y lo corregimos.
            </div>,
            <Aviso slot="pie" />,
          )}
        </footer>
      </body>
    </html>
  );
}
