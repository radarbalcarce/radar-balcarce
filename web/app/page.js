import {
  obtenerDatos, obtenerArchivo, armarTapa, temasVivos, proximosEventos, fotoDelDolar,
} from '@/lib/datos';
import {
  TarjetaBuzon,
  TituloSeccion, FilaNota, Evento,
} from '@/components/piezas';
import { Postales } from '@/components/postales';
import { HoyEnBalcarce } from '@/components/hoy-balcarce';
import { Aviso } from '@/components/avisos';
import { MOSTRAR_TEMAS } from '@/lib/sitio';
import { metadatosDePagina } from '@/components/metadatos';

// El título de la portada dice qué es y de dónde: es lo que se ve en Google.
// Es la única página con canónico "/": el layout ya no lo pone para todas.
// Al compartirla, la tarjeta dice sólo el nombre del medio.
export const metadata = {
  ...metadatosDePagina({
    titulo: 'Radar Balcarce',
    descripcion: 'Las noticias de Balcarce y la región al día, el clima, la farmacia de turno y la agenda de la semana. Se actualiza todo el día, con la fuente siempre a la vista.',
    camino: '/',
  }),
  title: { absolute: 'Radar Balcarce · Noticias de Balcarce, clima y farmacia de turno' },
};

export default function Portada() {
  const d = obtenerDatos();
  // La grande, cuatro de secciones distintas y tres por sección, siempre lo
  // más nuevo primero (lib/datos.js, armarTapa). Los bloques salen en el
  // orden editorial de SECCIONES: la portada se ve igual todos los días.
  const { principal, secundarias, bloques } = armarTapa(d.notas, undefined, { archivo: obtenerArchivo() });

  const temas = MOSTRAR_TEMAS ? temasVivos().slice(0, 8) : [];

  // Los próximos tres, cada uno con su página (lib/eventos.js).
  const eventos = proximosEventos().slice(0, 3);

  return (
    <div className="envoltura">
      <h1 className="solo-lectores">Radar Balcarce: noticias de Balcarce, clima y farmacia de turno</h1>
      {!d.generado && (
        <div className="tarjeta" style={{ marginBottom: 24 }}>
          <strong>Estamos actualizando las noticias.</strong>
          <p className="mini" style={{ marginTop: 8 }}>
            Todavía no hay notas para mostrar. Volvé a entrar en unos minutos.
          </p>
        </div>
      )}

      {/* El aviso de clima va arriba de todo y ocupa el ancho: es lo único
          del sitio que puede cambiarle el día a alguien. Sale sólo cuando
          hay algo real que avisar — los umbrales son altos a propósito, en
          ingesta/alertas.mjs. */}
      {(d.avisosClima ?? []).slice(0, 1).map((a) => (
        <aside className={`aviso-clima ${a.gravedad}`} key={a.titulo}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <div>
            <strong>{a.titulo}</strong>
            <span>{a.texto}</span>
          </div>
        </aside>
      ))}

      {/* Dos columnas en escritorio: las noticias a la izquierda y UNA sola
          pila a la derecha (hoy en Balcarce, agenda, buzón, números
          útiles), sin huecos. En el celular la pila derecha se desarma
          (`display: contents`): los servicios van primero, después las
          noticias y el resto al final. Ver .dos-columnas en globals.css. */}
      <div className="dos-columnas">
        <div className="derecha">
        {/* En el celular esto va primero: es lo que la gente viene a
            buscar. Antes había que pasar ochenta titulares para ver la
            farmacia de turno. Desde el 28/09 son tres renglones (clima,
            farmacia, dólar) con el dato y el enlace a su página: el detalle
            y los botones de llamar están en /clima, /farmacias y /dolar. */}
        <aside className="servicios">
          <HoyEnBalcarce
            clima={d.clima}
            farmacia={d.farmacias?.hoy}
            foto={fotoDelDolar()}
          />
          <Aviso slot="clima" />
        </aside>

        <aside className="lateral">
          {eventos.length > 0 && (
            <div className="tarjeta" style={{ paddingBottom: 8 }}>
              <div className="cabecera-tarjeta">
                <span className="etiqueta">Agenda de Balcarce</span>
                <a href="/agenda" className="accion">Toda la agenda →</a>
              </div>
              {eventos.map((e) => <Evento evento={e} key={e.id} />)}
            </div>
          )}

          <TarjetaBuzon />

          {d.utiles?.numeros?.length > 0 && (
            <div className="tarjeta tarjeta-util">
              <div className="cabecera-tarjeta"><span className="etiqueta">Números útiles</span></div>
              <div className="chips">
                {/* Sólo los que son un número solo: varios de la lista oficial
                    traen tres o cuatro líneas separadas por barras y no sirven
                    para un enlace de llamada. Esos están completos en /util. */}
                {d.utiles.numeros.filter((n) => !n.numero.includes('/')).slice(0, 5).map((n) => (
                  <a key={n.nombre} href={`tel:${n.numero.replace(/\D/g, '')}`}>
                    {n.nombre.replace(/ \(.*\)$/, '')} {n.numero}
                  </a>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <a href="/util" className="accion">Toda la guía →</a>
              </div>
            </div>
          )}
        </aside>
        </div>

        <div className="principal">
          {/* Las cinco de arriba, como postales: la que arma armarTapa como principal y las
              cuatro más nuevas de otras secciones, todas parejas (1/10, Hernán). */}
          <Postales notas={[principal, ...secundarias]} />
          <Aviso slot="apertura" />
          {/* Los temas que se siguen. Una sección agrupa por tipo de
              noticia; un tema, por historia. En un pueblo las historias
              duran meses, y el que entra por una nota del autódromo no
              tenía forma de ver las otras diez. */}
          {temas.length > 0 && (
            <nav className="tira-temas" aria-label="Temas que seguimos">
              {temas.map((t) => (
                <a key={t.ranura} href={`/tema/${t.ranura}`} className="chip-tema">
                  {t.nombre} <span>{t.cuantas}</span>
                </a>
              ))}
            </nav>
          )}


          {bloques.map(([seccion, notas]) => (
            <section className="bloque-seccion" key={seccion}>
              <TituloSeccion seccion={seccion} />
              {/* Tres por sección, no cinco: la portada se hacía larguísima
                  y en el celular había que pasar veinte titulares para
                  llegar a la sección siguiente. El que quiere más tiene
                  "Ver todo". */}
              {notas.map((n) => <FilaNota nota={n} key={n.id} />)}
            </section>
          ))}

          {d.notas.length === 0 && d.generado && (
            <div className="tarjeta">No hay notas publicadas todavía. Se publican desde el panel.</div>
          )}
        </div>
      </div>
    </div>
  );
}
