// Los bloques de datos propios de una nota (regla 323): «Antes en Radar», la ficha de Colapinto y la tira del dólar.
//
// Los arma el código (lib/bloques-de-datos.js), nunca la IA. Cada bloque dice de dónde sale el dato y de cuándo es, a la vista, y sale sólo si hay
// dato real. Van después del cuerpo y antes del pie de «Fuentes (N)», que no cambia. Si la variable NOTAS_CON_DATOS está apagada, `bloques` es []
// y este componente no dibuja nada, ni siquiera su hoja de estilo.
//
// Componente de servidor, sin estado y sin JavaScript en el navegador: el dibujo es un SVG en línea (con su título y su descripción) y la tabla
// que dice lo mismo va en un desplegable de HTML. Colores por variables CSS, claro y oscuro (lib/graficos.js, ESTILO_DE_GRAFICOS).

import { ESTILO_DE_GRAFICOS } from '@/lib/graficos';

const ESTILO = `
${ESTILO_DE_GRAFICOS}
.bloque-de-datos { margin-top: 28px; padding: 16px 18px 14px; border: 1px solid var(--g-linea); border-radius: 10px; background: var(--g-fondo); color: var(--g-texto); }
.bloque-de-datos h2 { font-family: var(--fuente-titulo, inherit); font-size: 18px; line-height: 1.25; margin: 0 0 8px; color: var(--g-texto); }
.bloque-de-datos .bd-intro { margin: 0 0 8px; font-size: 14px; line-height: 1.5; color: var(--g-texto); }
.bloque-de-datos ul.bd-resumen, .bloque-de-datos ul.bd-antes { margin: 0 0 10px; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.bloque-de-datos ul.bd-resumen li { font-size: 14.5px; line-height: 1.5; color: var(--g-texto); }
.bloque-de-datos ul.bd-antes li { font-size: 15px; line-height: 1.4; }
.bloque-de-datos ul.bd-antes time { display: block; font-size: 12.5px; color: var(--g-suave); margin-bottom: 1px; }
.bloque-de-datos ul.bd-antes a { color: var(--g-enlace); font-weight: 600; overflow-wrap: anywhere; }
.bloque-de-datos figure { margin: 10px 0 8px; }
.bloque-de-datos .grafico-svg { display: block; width: 100%; max-width: 560px; height: auto; }
.bloque-de-datos .g-tabla { width: 100%; border-collapse: collapse; font-size: 14px; margin: 6px 0 4px; }
.bloque-de-datos .g-tabla caption { text-align: left; font-size: 13px; color: var(--g-suave); padding-bottom: 4px; }
.bloque-de-datos .g-tabla th, .bloque-de-datos .g-tabla td { padding: 6px 8px 6px 0; border-bottom: 1px solid var(--g-linea); text-align: left; vertical-align: top; }
.bloque-de-datos .g-tabla thead th { font-size: 12.5px; color: var(--g-suave); font-weight: 600; }
.bloque-de-datos .g-tabla tbody th { font-weight: 500; color: var(--g-suave); }
.bloque-de-datos details.bd-tabla { margin: 6px 0 2px; }
.bloque-de-datos details.bd-tabla summary { font-size: 13px; color: var(--g-suave); cursor: pointer; min-height: 32px; display: flex; align-items: center; }
.bloque-de-datos details.bd-tabla summary:focus-visible { outline: 2px solid var(--g-enlace); outline-offset: 2px; border-radius: 4px; }
.bloque-de-datos .bd-fuente { margin: 10px 0 0; font-size: 12.5px; line-height: 1.45; color: var(--g-suave); }
.bloque-de-datos .bd-fuente a { color: inherit; text-decoration: underline; }
.bloque-de-datos .bd-nota { margin: 4px 0 0; font-size: 12.5px; color: var(--g-suave); }
`;

/** «Fuente: X · dato del dd/mm/aaaa»: siempre a la vista, con el enlace cuando lo hay. */
function LineaDeFuente({ bloque }) {
  const { fuente, fechaTexto } = bloque;
  return (
    <p className="bd-fuente">
      Fuente: {fuente.enlace ? <a href={fuente.enlace} target="_blank" rel="noopener noreferrer">{fuente.nombre}</a> : fuente.nombre}
      {fechaTexto ? <> · dato del <time dateTime={String(bloque.fecha).slice(0, 10)}>{fechaTexto}</time></> : null}
      {' · armado por Radar Balcarce'}
    </p>
  );
}

function Tabla({ html, resumen }) {
  if (!html) return null;
  return (
    <details className="bd-tabla">
      <summary>{resumen}</summary>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </details>
  );
}

function Bloque({ bloque: b }) {
  const id = `bd-${b.clave}`;
  return (
    <section className="bloque-de-datos" aria-labelledby={id} data-bloque={b.clave} {...(b.clave === 'antes' ? { 'data-pagefind-ignore': '' } : {})}>
      <h2 id={id}>{b.titulo}</h2>
      {b.intro && <p className="bd-intro">{b.intro}</p>}
      {b.items && (
        <ul className="bd-antes">
          {b.items.map((i) => (
            <li key={i.id}>
              <time dateTime={String(i.fecha).slice(0, 10)}>{i.fechaTexto}</time>
              <a href={i.ruta}>{i.titulo}</a>
            </li>
          ))}
        </ul>
      )}
      {b.resumen && (
        <ul className="bd-resumen">
          {b.resumen.map((linea) => <li key={linea}>{linea}</li>)}
        </ul>
      )}
      {b.grafico && <figure><div dangerouslySetInnerHTML={{ __html: b.grafico.svg }} /></figure>}
      {/* La tabla que dice lo mismo que el dibujo, en un desplegable cerrado: se ve en el texto de arriba y la leen los buscadores y los asistentes. */}
      <Tabla html={b.tabla} resumen="Ver los datos en una tabla" />
      {b.nota && <p className="bd-nota">{b.nota}</p>}
      <LineaDeFuente bloque={b} />
    </section>
  );
}

/** Todos los bloques de la nota, uno atrás del otro. Sin bloques, nada. */
export default function BloquesDeDatos({ bloques = [] }) {
  if (!bloques.length) return null;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ESTILO }} />
      {bloques.map((b) => <Bloque key={b.clave} bloque={b} />)}
    </>
  );
}
