// Las piezas que se repiten en más de una página: el dibujo del clima, la
// tarjeta de la farmacia, la etiqueta de sección, la fila de nota.
//
// Son componentes de servidor a propósito: no hay estado ni eventos, la
// animación es CSS puro (globals.css). Así la web sigue siendo HTML
// estático que se sirve sin ejecutar nada.

import {
  datosSeccion, nombreCorto, cuando, partirFecha, whatsapp, MAIL, WHATSAPP,
} from '@/lib/datos';
import { comoNombre } from '@/lib/texto';
import { fechaLarga, fechaCorta, actualizadaCuando } from '@/lib/tiempo';
import { nombreDeEvento } from '@/lib/eventos';
import { enlaceDeLlamada } from '@/lib/farmacias';

const WHATSAPP_VISIBLE = WHATSAPP.visible;

// --------------------------------------------------------------- el clima
//
// La tarjeta del clima se mudó a clima-vivo.js, que corre en el navegador y
// se actualiza sola cada diez minutos. Acá queda sólo el sol chiquito de la
// chapa de arriba, que es decorativo y no muestra ningún dato.

/** La cruz de farmacia: verde, limpia, dibujada acá (sin imágenes de afuera). */
export function CruzFarmacia({ tamano = 40 }) {
  return (
    <svg className="cruz-farmacia" width={tamano} height={tamano} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="currentColor" />
      <path fill="#fff" d="M16 8h8v8h8v8h-8v8h-8v-8H8v-8h8z" />
    </svg>
  );
}

const PIN = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const TUBO = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  </svg>
);

export function TarjetaFarmacia({ farmacia, verLaSemana = true, verBotones = true }) {
  if (!farmacia) return null;

  // Cuando hay dos farmacias de turno se muestran las DOS, cada una con su
  // dirección. Antes se mostraban los dos nombres juntos y una sola
  // dirección debajo, así que parecía una sola farmacia con nombre largo —
  // y el que iba a la dirección equivocada se encontraba con la persiana
  // baja.
  const lista = farmacia.detalle?.length
    ? farmacia.detalle
    : (farmacia.farmacias ?? []).map((n) => ({ nombre: n }));

  const mapaDe = (direccion) => (direccion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${direccion}, Balcarce, Buenos Aires`)}`
    : null);

  // La identidad de la tarjeta: cruz y verde farmacia, la píldora "Farmacia de
  // turno" (es la etiqueta de siempre, con otro color) y el teléfono como
  // botón "Llamar". Los tamaños siguen siendo los del sistema tipográfico.
  return (
    <div className="tarjeta tarjeta-farmacia">
      {lista.map((f, i) => {
        const mapa = mapaDe(f.direccion);
        const llamar = enlaceDeLlamada(f.telefono);
        return (
          <div className="una-farmacia" key={f.nombre ?? i}>
            <CruzFarmacia />
            <div className="cuerpo-farmacia">
              {i === 0 && (
                <div className="cabecera-tarjeta">
                  <span className="pastilla-turno">
                    <span className="punto-vivo" aria-hidden="true" />
                    <span className="etiqueta">{lista.length > 1 ? 'Farmacias de turno' : 'Farmacia de turno'}</span>
                  </span>
                  {verLaSemana && (
                    <a href="/farmacias" className="accion ver-semana"><span className="solo-lg">Ver </span>la semana →</a>
                  )}
                </div>
              )}
              <div className="nombre-farmacia">{comoNombre(f.nombre)}</div>
              {f.direccion
                ? (
                  <div className="donde-farmacia">
                    {f.direccion}
                    {f.telefono && <>{' · '}<span className="sin-corte">Tel. {f.telefono}</span></>}
                  </div>
                )
                : <div className="donde-farmacia sin-dato">Dirección no publicada</div>}
            </div>
            {verBotones && (llamar || mapa) && (
              <div className="acciones-farmacia">
                {llamar && <a href={llamar} className="boton-farmacia llenar">{TUBO}Llamar</a>}
                {mapa && <a href={mapa} target="_blank" rel="noopener noreferrer" className="boton-farmacia">{PIN}Cómo llegar</a>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ notas

export function Etiqueta({ seccion }) {
  const s = datosSeccion(seccion);
  return <span className="tag" style={{ background: s.color }}>{nombreCorto(seccion)}</span>;
}

/**
 * La placa de la sección: lo que va donde iría la foto cuando no hay una que
 * sirva (CLAUDE.md, "Las fotos"), con el dibujo de su sección. Desde el 29/09
 * también en la página de la nota (Hernán: "si no tiene fotos hay que ponerle
 * la placa de la sección"). La placa es un dibujo propio, nunca una foto; la
 * ilustración con IA de las notas sin foto es otra cosa (`ilustrar-notas.mjs`) y
 * lo dice en el epígrafe. `chica` es la de la página de una nota, más baja que
 * la de la portada de sección.
 */
export function PlacaSeccion({ seccion, chica = false }) {
  const s = datosSeccion(seccion);
  return (
    <div className={chica ? 'placa-seccion chica' : 'placa-seccion'} style={{ '--color-seccion': s.color }} aria-hidden="true">
      <Pictograma ranura={s.ranura} />
      <span>{nombreCorto(seccion)}</span>
    </div>
  );
}

// Los rayos del sol de mayo, calculados una vez: 16, uno largo y uno corto.
const RAYOS = Array.from({ length: 16 }, (_, i) => {
  const a = (i * Math.PI) / 8;
  const hasta = i % 2 ? 21 : 25;
  const p = (r) => `${(32 + r * Math.cos(a)).toFixed(1)} ${(32 + r * Math.sin(a)).toFixed(1)}`;
  return `M${p(15)} L${p(hasta)}`;
}).join(' ');

// Un dibujo por sección, de trazo, en un cuadro de 64 x 64.
const DIBUJOS = {
  // Un marcador sobre las sierras: la montaña con un sol sola es el dibujo de
  // "imagen que no cargó", justo donde no hay foto.
  balcarce: <><path d="M32 6 C23 6 17 13 17 21 C17 32 32 44 32 44 C32 44 47 32 47 21 C47 13 41 6 32 6 Z" /><circle cx="32" cy="21" r="5" /><path d="M4 58 L16 50 L26 55 L38 47 L60 58" /></>,
  politica: <><path d="M8 22 L32 8 L56 22 Z" /><path d="M16 27 V46 M26 27 V46 M38 27 V46 M48 27 V46" /><path d="M10 50 H54 M6 56 H58" /></>,
  policiales: <><path d="M20 46 V32 A12 12 0 0 1 44 32 V46 Z" /><path d="M14 52 H50" /><path d="M32 6 V12 M13 14 L17 18 M51 14 L47 18" /></>,
  futbol: <><circle cx="32" cy="32" r="24" /><path d="M32 22 L41 29 L38 40 H26 L23 29 Z" /><path d="M32 22 V8 M41 29 L54 24 M38 40 L46 52 M26 40 L18 52 M23 29 L10 24" /></>,
  deportes: <><path d="M20 10 H44 V22 C44 32 38 38 32 38 C26 38 20 32 20 22 Z" /><path d="M20 14 H12 C12 23 16 28 22 29 M44 14 H52 C52 23 48 28 42 29" /><path d="M32 38 V48 M24 48 H40 M20 55 H44" /></>,
  automovilismo: (
    <>
      <path d="M14 58 V8" /><path d="M14 10 H52 V36 H14" />
      <g fill="currentColor" stroke="none">
        <rect x="14" y="10" width="9.5" height="8.7" /><rect x="33" y="10" width="9.5" height="8.7" />
        <rect x="23.5" y="18.7" width="9.5" height="8.6" /><rect x="42.5" y="18.7" width="9.5" height="8.6" />
        <rect x="14" y="27.3" width="9.5" height="8.7" /><rect x="33" y="27.3" width="9.5" height="8.7" />
      </g>
    </>
  ),
  agro: (
    <>
      <path d="M32 60 V14" />
      <path d="M32 14 C29 10 29 6 32 2 C35 6 35 10 32 14" />
      {[18, 28, 38, 48].map((y) => (
        <path key={y} d={`M32 ${y + 6} C24 ${y + 4} 20 ${y - 2} 22 ${y - 6} C28 ${y - 4} 32 ${y} 32 ${y + 6} M32 ${y + 6} C40 ${y + 4} 44 ${y - 2} 42 ${y - 6} C36 ${y - 4} 32 ${y} 32 ${y + 6}`} />
      ))}
    </>
  ),
  economia: <><path d="M8 8 V56 H58" /><path d="M14 46 L26 32 L36 38 L54 16" /><path d="M45 16 H54 V25" /></>,
  cultura: <><circle cx="20" cy="47" r="7" /><circle cx="46" cy="41" r="7" /><path d="M27 47 V15 L53 9 V41" /><path d="M27 23 L53 17" /></>,
  tecnologia: <><rect x="16" y="16" width="32" height="32" rx="4" /><rect x="25" y="25" width="14" height="14" rx="2" /><path d="M24 8 V16 M32 8 V16 M40 8 V16 M24 48 V56 M32 48 V56 M40 48 V56 M8 24 H16 M8 32 H16 M8 40 H16 M48 24 H56 M48 32 H56 M48 40 H56" /></>,
  argentina: <><circle cx="32" cy="32" r="11" /><path d={RAYOS} /></>,
};

/** El dibujo de una sección, para la placa. Sin dibujo propio, el de Argentina. */
export function Pictograma({ ranura }) {
  return (
    <svg className="pictograma" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {DIBUJOS[ranura] ?? DIBUJOS.argentina}
    </svg>
  );
}

export function TituloSeccion({ seccion, verTodo = true }) {
  const s = datosSeccion(seccion);
  return (
    <div className="titulo-seccion">
      <span className="barra" style={{ background: s.color }} />
      <h2>{nombreCorto(seccion)}</h2>
      {/* "Ver todo →" a secas: el nombre de la sección está tres centímetros
          a la izquierda, repetirlo no agrega nada y en el celular obliga a
          que el título se achique para que entren los dos. */}
      {verTodo && <a href={`/seccion/${s.ranura}`} className="ver-todo">Ver todo →</a>}
    </div>
  );
}

/**
 * Cuánto hace que salió la nota, en un <time> con la fecha exacta: lo lee
 * Google, y components/horas-vivas.js lo recalcula en el navegador para que
 * no quede congelado desde que se armó la página. Sin hora de la fuente, nada.
 */
export function Hace({ nota, className = 'meta' }) {
  const texto = cuando(nota);
  if (!texto) return null;
  return <time className={className} dateTime={new Date(nota.fecha).toISOString()} data-hace="">{texto}</time>;
}

/** Pasadas las 36 horas el "hace N" deja de servir: se ve la fecha exacta (1/10, Hernán: que se lea bien otro día). */
const HORAS_DE_HACE = 36;

export function FilaNota({ nota }) {
  const ms = new Date(nota.fecha).getTime();
  const vieja = Number.isFinite(ms) && Date.now() - ms > HORAS_DE_HACE * 3600 * 1000;
  const fecha = vieja ? fechaCorta(nota.fecha) : null;
  if (fecha) {
    return (
      <div className="fila-nota">
        <div className="col-hora"><time className="meta" dateTime={new Date(nota.fecha).toISOString()}>{fecha}</time></div>
        <div style={{ flexGrow: 1 }}>
          <time className="meta cuando-movil" dateTime={new Date(nota.fecha).toISOString()}>{fecha}</time>
          <h3><a href={nota.ruta}>{nota.titulo}</a></h3>
        </div>
      </div>
    );
  }
  return (
    <div className="fila-nota">
      {/* En escritorio la columna de la hora se reserva SIEMPRE, aunque la
          fuente no haya dicho la hora (celda vacía, sin inventar ninguna): si
          no, los títulos de las notas sin hora arrancaban pegados a la
          izquierda y los demás sangrados. En el celular la hora va arriba del
          título y, si no hay, no ocupa lugar. */}
      <div className="col-hora"><Hace nota={nota} className="meta" /></div>
      <div style={{ flexGrow: 1 }}>
        <Hace nota={nota} className="meta cuando-movil" />
        <h3><a href={nota.ruta}>{nota.titulo}</a></h3>
      </div>
    </div>
  );
}

/** La fecha exacta de una nota, en hora de Balcarce: para quien la lee otro día. Estática: no se recalcula como el "hace 2 h". */
export function FechaExacta({ nota, className = 'meta fecha-exacta' }) {
  const texto = fechaLarga(nota?.fecha);
  if (!texto) return null;
  return <time className={className} dateTime={new Date(nota.fecha).toISOString()}>{texto}</time>;
}

/**
 * "Publicado" y, cuando corresponde, "Actualizado" (17/10/2026, regla 253). "Publicado" es la fecha única de la nota (`fecha`, que sólo
 * envejece: lib/archivo.js, `fechaDeLaNota`). "Actualizado" se suma, nunca la reemplaza: sólo aparece si una persona corrigió la nota más
 * de media hora después (`actualizadaCuando`, lib/tiempo.js), y dice la fecha de esa corrección. Las dos van en un <time> con la fecha
 * exacta, que es lo que lee Google (`datePublished` y `dateModified` de la ficha dicen lo mismo).
 */
export function FechasDeLaNota({ nota }) {
  const publicado = fechaLarga(nota?.fecha);
  if (!publicado) return null;
  const actualizadoISO = actualizadaCuando(nota);
  return (
    <>
      <span className="meta fecha-exacta"><time dateTime={new Date(nota.fecha).toISOString()}>{publicado}</time></span>
      {actualizadoISO && (
        <span className="meta fecha-exacta fecha-actualizada">
          <span className="sep-fecha" aria-hidden="true">· </span>Actualizado: <time dateTime={actualizadoISO}>{fechaLarga(actualizadoISO)}</time>
        </span>
      )}
    </>
  );
}

/** Un enlace para avisar de un error en esta nota, con el titular y la dirección ya escritos (17/10/2026, regla 256). */
export function AvisarDeUnError({ titulo, url }) {
  const asunto = `Corrección: ${titulo}`;
  const cuerpo = `Hola, encontré un error en esta nota:\n${url}\n\nEl error es:\n`;
  return (
    <p className="avisar-error">
      ¿Hay un error en esta nota?{' '}
      <a href={`mailto:${MAIL}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`}>Avisanos</a>
      {' · '}
      <a href="/quienes-somos#como-corregimos">cómo corregimos</a>
    </p>
  );
}

// ----------------------------------------------------------------- agenda

/** Una fecha de la agenda. Cada una lleva a la página del evento (su "nota",
 *  app/agenda/[id]), donde están los detalles y el botón para agendarlo. */
export function Evento({ evento }) {
  const f = partirFecha(evento.desde);
  const nombre = nombreDeEvento(evento.nombre);
  return (
    <div className="evento">
      <div className="taco">
        <div className="mes">{f?.mes ?? ''}</div>
        <div className="dia">{f?.dia ?? '·'}</div>
      </div>
      <div className="cuerpo-evento">
        <div className="que">{evento.ruta ? <a href={evento.ruta}>{nombre}</a> : nombre}</div>
        <div className="donde">
          {f?.hora && !evento.todoElDia ? `${f.hora} · ` : ''}{nombreDeEvento(evento.lugar || '') || 'Balcarce'}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------- el final de cada página
//
// Todas las páginas internas terminan igual, en este orden:
//
//   1. una tarjeta que invita a escribirnos, con el pedido que corresponde
//      a esa página;
//   2. si el dato viene de algún lado, una línea diciendo de dónde.
//
// Antes cada página terminaba a su manera — una con "Volver a la portada",
// otra con "Portada", una con tarjeta y otra sin — y eso hace que el sitio
// se sienta armado por partes.

export function Cierre({ children, fuente = null }) {
  return (
    <section className="cierre-pagina">
      {children}
      {fuente && <p className="nota-fuente">{fuente}</p>}
    </section>
  );
}

/** La tarjeta de invitación. Siempre igual: título, una línea que explica
 *  qué esperamos, y un botón. Cambia el pedido, no la forma.
 *
 *  El botón es WhatsApp, no mail: es donde la gente ya está, y el mensaje va
 *  escrito de antemano para que no tenga que explicar de dónde viene. El
 *  mail queda abajo, chiquito, para quien lo prefiera. */
export function Invitacion({ titulo, texto, boton, asunto, mensaje }) {
  return (
    <div className="tarjeta-buzon">
      <h3 className="titulo-tarjeta">{titulo}</h3>
      <p>{texto}</p>
      <a href={whatsapp(mensaje ?? asunto)} className="boton rojo ancho" target="_blank" rel="noopener noreferrer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.08c-.24.68-1.42 1.31-1.96 1.36-.5.05-.97.23-3.27-.68-2.75-1.08-4.5-3.9-4.64-4.08-.14-.18-1.11-1.48-1.11-2.82s.7-2 .95-2.27c.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.47.23.54.77 1.88.84 2.02.07.14.11.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.57.16.27.71 1.17 1.52 1.9 1.04.93 1.92 1.21 2.19 1.35.27.14.43.11.59-.07.16-.18.68-.79.86-1.07.18-.27.36-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.2.52.32.07.11.07.66-.17 1.34z" />
        </svg>
        {boton}
      </a>
      <p className="o-por-mail">
        o por mail a <a href={`mailto:${MAIL}?subject=${encodeURIComponent(asunto)}`}>{MAIL}</a>
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ buzón

export function TarjetaBuzon() {
  return (
    <div className="tarjeta-buzon" id="buzon">
      <h3 className="titulo-tarjeta">¿Viste algo en el barrio?</h3>
      <p>
        Mandanos la foto o el dato por WhatsApp. Lo chequeamos antes de publicarlo
        y, si lo pedís, no ponemos tu nombre.
      </p>
      <a href={whatsapp('Hola, tengo un dato para Radar Balcarce:')} className="boton rojo ancho" target="_blank" rel="noopener noreferrer">
        Escribirnos por WhatsApp
      </a>
      <p className="o-por-mail">
        {WHATSAPP_VISIBLE} · o por mail a <a href={`mailto:${MAIL}`}>{MAIL}</a>
      </p>
    </div>
  );
}


/**
 * Los temas que toca una nota, para poder seguir la historia.
 *
 * Una sección agrupa por tipo de noticia; un tema, por historia. El que
 * entra por una nota del autódromo tiene que poder ver las otras once.
 */
export function TemasDeLaNota({ temas = [], catalogo = [] }) {
  const suyos = catalogo.filter((t) => temas.includes(t.ranura));
  if (!suyos.length) return null;

  return (
    <div className="temas-nota">
      <span className="meta">Seguí el tema</span>
      <div className="chips-tema">
        {suyos.map((t) => (
          <a key={t.ranura} href={`/tema/${t.ranura}`} className="chip-tema">
            {t.nombre} <span>{t.cuantas}</span>
          </a>
        ))}
      </div>
    </div>
  );
}