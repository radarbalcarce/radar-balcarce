// Las fuentes de la nota, en un desplegable chico y cerrado al pie.
//
// Criterio de Hernán y Andrés (25/09): el sitio opera como un diario. La
// redacción recibe la noticia, suma lo que contaron todas las fuentes, lo
// contrasta y escribe la nota; el lector ve la NOTA (título, bajada y
// cuerpo), no el análisis. "Una cosa es lo que usemos internamente, otra que
// se desplieguen infinitas fuentes dentro de la página."
//
// Por eso acá va sólo el nombre de cada medio con el enlace a su nota. Las
// claves, qué se sabe, qué falta confirmar, lo que aportó cada fuente, los
// antecedentes y el nivel de verificación se siguen generando y guardando
// (portada.json y archivo.json), pero son de uso interno: no se ven en la web
// y tampoco van a los datos para Google.
//
// La atribución no es opcional (ley 11.723): toda nota tiene al menos la
// fuente principal, aunque sea de antes de que existieran las fuentes
// consultadas.
//
// Componente de servidor, sin estado: <details> de HTML, sin JavaScript.
// Qué fuentes van sale de lib/fuentes-de-la-nota.js (sin JSX, se prueba).

import { fuentesDeLaNota, etiquetasDeFuentes } from '@/lib/fuentes-de-la-nota';
import { firmaCorta, explicacionDeFirma } from '@/components/metadatos';

// Chico y en gris: es un dato de apoyo, no otra nota. La primera parte del
// renglón es la firma (quién escribió la nota); la segunda, las fuentes. En el
// celular el renglón tiene 44 px de alto mínimo para el dedo y, si la firma no
// entra, pasa a dos líneas.
const ESTILO = `
.fuentes-nota { margin-top: 26px; padding-top: 2px; border-top: 1px solid var(--linea); }
.fuentes-nota summary {
  display: flex; flex-wrap: wrap; align-items: center; column-gap: 6px; row-gap: 0; min-height: 44px; padding: 6px 0; cursor: pointer; list-style: none;
  font-size: 12.5px; line-height: 1.4; color: var(--suave);
}
.fuentes-nota summary::-webkit-details-marker { display: none; }
.fuentes-nota summary .fn-n { font-weight: 700; }
/* En el celular la firma ocupa casi todo el renglón: "Fuentes" pasa abajo, sin el punto suelto al final de la línea. */
@media (max-width: 519px) { .fuentes-nota summary .fn-sep { display: none; } .fuentes-nota summary .fn-firma { flex-basis: 100%; } }
.fuentes-nota summary::after { content: ""; flex: none; width: 7px; height: 7px; margin-left: 2px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: translateY(-2px) rotate(45deg); transition: transform .15s; }
.fuentes-nota[open] summary::after { transform: translateY(2px) rotate(-135deg); }
.fuentes-nota summary:focus-visible { outline: 2px solid var(--rojo); outline-offset: 2px; border-radius: 4px; }
.fuentes-nota .fn-explica { margin: 0 0 12px; font-size: 13.5px; line-height: 1.55; color: var(--suave); }
.fuentes-nota .fn-explica a { text-decoration: underline; font-weight: 500; color: inherit; }
.fuentes-nota ul { margin: 0 0 8px; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.fuentes-nota li { font-size: 14px; line-height: 1.45; overflow-wrap: anywhere; }
.fuentes-nota li a { color: var(--rojo); font-weight: 600; }
`;

/**
 * El pie de la nota: una sola línea gris, "Fuentes (4)". Al abrir el desplegable, la firma
 * ("Redacción asistida con IA, verificada contra las fuentes"), su explicación y el nombre de cada medio con su enlace. La firma se dice
 * siempre (regla del sitio: cada nota dice quién la escribió), pero adentro del desplegable y no arriba (17/10/2026, Hernán:
 * "cuanto menos cosas así tan visibles, mejor; cuando la gente aprieta en Fuentes ya sabe"); lo interno ("salió sin revisión
 * humana") no se dice. Sin fuentes, la línea con la firma sola.
 */
export default function FuentesDeLaNota({ nota }) {
  return (
    <PieConFuentes
      firma={firmaCorta(nota)}
      explicacion={explicacionDeFirma(nota)}
      fuentes={fuentesDeLaNota(nota)}
    />
  );
}

/**
 * El mismo pie para cualquier página con firma y fuentes (las notas y las
 * fichas de la agenda): una línea gris con la firma y "Fuentes (N)"; al
 * abrirlo, la explicación larga y cada fuente con su enlace. Sin fuentes, sólo
 * la firma.
 */
export function PieConFuentes({ firma, explicacion, fuentes }) {
  if (!fuentes.length) {
    return (
      <p className="firma-nota">
        <span className="punto-firma" aria-hidden="true" />
        {firma}
      </p>
    );
  }
  const etiquetas = etiquetasDeFuentes(fuentes);
  return (
    <details className="fuentes-nota">
      <style dangerouslySetInnerHTML={{ __html: ESTILO }} />
      <summary>
        <span className="fn-n">Fuentes ({fuentes.length})</span>
      </summary>
      <p className="fn-explica">
        <strong className="fn-firma">{firma}.</strong>{explicacion ? ` ${explicacion}` : ''} <a href="/quienes-somos">Cómo trabajamos</a>
      </p>
      <ul>
        {fuentes.map((f, i) => (
          <li key={f.enlace ?? f.medio}>
            {/^https?:[/][/]/i.test(f.enlace ?? '')
              ? <a href={f.enlace} target="_blank" rel="noopener noreferrer">{etiquetas[i]}</a>
              : <span>{etiquetas[i]}</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}
