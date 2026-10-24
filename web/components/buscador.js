'use client';

// El buscador.
//
// De los cinco portales de la zona sólo dos tienen uno (docs/historico/INVESTIGACION-COMPETENCIA.md).
// Un sitio con ochenta notas sin forma de buscar es un archivo cerrado con llave.
//
// Busca en las notas que tienen página en el sitio (no sólo en las de hoy, pero tampoco en las viejas que viven en el archivo de R2: el
// tope es TOPE_DE_NOTAS): usa Pagefind, un índice que se arma
// al compilar el sitio (web/scripts/indexar.mjs) y que el navegador baja de a pedacitos, según lo que se escribe. Antes cada página
// llevaba adentro la lista de las notas de la portada (unos 18 KB repetidos en cada una de las 1.200 páginas): ahora no lleva nada y el
// índice sólo se baja cuando alguien abre el buscador.
//
// Sin servidor y sin base de datos. Si el índice no está (en la PC, sin compilar), el buscador lo dice en vez de romperse.

import { useEffect, useRef, useState } from 'react';
import { sinTildes as normalizar } from '@/lib/texto'; // sin tildes ni mayúsculas: buscar "futbol" encuentra "fútbol"

const DIRECCION_DEL_INDICE = '/pagefind/pagefind.js';
const CUANTOS = 12;

/** Carga Pagefind una sola vez. Devuelve null si no está el índice. */
let promesa = null;
function cargarPagefind() {
  if (!promesa) {
    // La dirección se arma en el momento: es un archivo del sitio que el compilador no conoce.
    promesa = import(/* webpackIgnore: true */ /* turbopackIgnore: true */ DIRECCION_DEL_INDICE)
      .then(async (pf) => { await pf.options?.({ baseUrl: '/' }); return pf; })
      .catch(() => null);
  }
  return promesa;
}

/** Un resultado de Pagefind, listo para mostrar: { url, titulo, seccion, extracto }. */
export function aResultado(d) {
  return {
    url: String(d?.url ?? '').replace(/\.html$/, ''),
    titulo: d?.meta?.title ?? 'Una nota',
    seccion: d?.meta?.seccion ?? '',
    extracto: d?.excerpt ?? '',
  };
}

export default function Buscador() {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState([]);
  const [estado, setEstado] = useState('quieto'); // quieto · buscando · listo · sin-indice
  const campo = useRef(null);
  const abrir = useRef(null);
  const estuvoAbierto = useRef(false);
  const numero = useRef(0);

  // Al abrir, el foco va al campo; al cerrar, vuelve al botón que lo abrió (24/10/2026): sin esto quien navega con teclado o lector de
  // pantalla quedaba al principio de la página.
  useEffect(() => {
    if (abierto) campo.current?.focus();
    else if (estuvoAbierto.current) abrir.current?.focus();
    estuvoAbierto.current = abierto;
  }, [abierto]);

  // Cada vez que cambia lo escrito se busca; una respuesta vieja nunca pisa a una nueva.
  useEffect(() => {
    const q = normalizar(texto).trim();
    if (!abierto || q.length < 2) { setResultados([]); setEstado('quieto'); return undefined; }
    const este = numero.current + 1;
    numero.current = este;
    setEstado('buscando');
    const espera = setTimeout(async () => {
      const pf = await cargarPagefind();
      if (este !== numero.current) return;
      if (!pf) { setEstado('sin-indice'); setResultados([]); return; }
      try {
        const busqueda = await pf.search(texto.trim());
        const datos = await Promise.all(busqueda.results.slice(0, CUANTOS).map((r) => r.data()));
        if (este !== numero.current) return;
        setResultados(datos.map(aResultado));
        setEstado('listo');
      } catch {
        if (este === numero.current) { setEstado('sin-indice'); setResultados([]); }
      }
    }, 180);
    return () => clearTimeout(espera);
  }, [texto, abierto]);

  useEffect(() => {
    const alTeclado = (e) => {
      if (e.key === 'Escape') setAbierto(false);
      // La barra abre el buscador, como en cualquier sitio de noticias — pero
      // no cuando se está escribiendo en un campo.
      const escribiendo = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if (e.key === '/' && !escribiendo) { e.preventDefault(); setAbierto(true); }
    };
    document.addEventListener('keydown', alTeclado);
    return () => document.removeEventListener('keydown', alTeclado);
  }, []);

  if (!abierto) {
    return (
      <button type="button" ref={abrir} className="abrir-buscador" onClick={() => setAbierto(true)} aria-label="Buscar en el sitio">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <span>Buscar</span>
      </button>
    );
  }

  const q = normalizar(texto).trim();
  return (
    <div className="capa-buscador" role="dialog" aria-modal="true" aria-label="Buscar">
      <button type="button" className="fondo-buscador" onClick={() => setAbierto(false)} aria-label="Cerrar" />
      <div className="caja-buscador">
        <div className="campo-buscador">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={campo}
            id="buscar"
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar una nota…"
            aria-label="Buscar una nota en Radar Balcarce"
            autoComplete="off"
          />
          <button type="button" onClick={() => setAbierto(false)} className="cerrar">Cerrar</button>
        </div>

        <div className="resultados" aria-live="polite">
          {q.length < 2 && <p className="pista">Escribí al menos dos letras. Busca en las notas más recientes del sitio.</p>}
          {q.length >= 2 && estado === 'buscando' && <p className="pista">Buscando…</p>}
          {q.length >= 2 && estado === 'sin-indice' && <p className="pista">El buscador no está disponible en este momento. Probá de nuevo en un rato.</p>}
          {q.length >= 2 && estado === 'listo' && resultados.length === 0 && <p className="pista">No encontramos nada con esas palabras.</p>}
          {estado === 'listo' && resultados.map((n) => (
            <a className="resultado" key={n.url} href={n.url}>
              {n.seccion && <span className="seccion">{n.seccion}</span>}
              <span className="titulo">{n.titulo}</span>
              {n.extracto && <span className="extracto" dangerouslySetInnerHTML={{ __html: n.extracto }} />}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
