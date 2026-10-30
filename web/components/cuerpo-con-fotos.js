// El cuerpo de una nota de la redacción con sus fotos entre los párrafos (30/10/2026, web/lib/cuerpo-con-fotos.js decide el orden).
// Cada foto va en una <figure> con su pie (epígrafe y crédito), con el ancho y el alto escritos (la página no se mueve al cargar) y cargada
// recién cuando se acerca a la pantalla (loading="lazy"). Una foto horizontal ocupa el ancho de la columna; una vertical se queda con su proporción
// (nunca más de 620 px de alto) y va centrada. Una imagen MUY alta (alto de 1,6 veces el ancho o más: una infografía) ocupa todo el ancho y no se acota
// (30/10/2026: con el tope de 620 px una infografía de 800 x 2045 quedaba de 240 px de ancho y el texto, ilegible en el celular). Tocar una imagen la abre
// entera, para hacerle zoom con los dedos. Componente de servidor, sin estado.

import { urlDeFoto } from '@/lib/fotos';
import { dimensionesDeFoto } from '@/lib/dimensiones-foto';
import { partesDelCuerpo } from '@/lib/cuerpo-con-fotos';

/** Una imagen alta como una infografía: alto de 1,6 veces el ancho o más. */
export const esMuyAlta = (p) => Number(p?.ancho) > 0 && Number(p?.alto) / Number(p.ancho) >= 1.6;

export default function CuerpoConFotos({ nota }) {
  const partes = partesDelCuerpo(nota, { urlFoto: urlDeFoto, dimensiones: dimensionesDeFoto });
  return partes.map((p, i) => (p.tipo === 'foto' ? (
    <figure key={`f${i}-${p.src}`} className="foto-en-nota" style={{ margin: '26px 0 8px' }}>
      <a href={p.src} target="_blank" rel="noopener" aria-label="Ver la imagen completa" style={{ display: 'block' }}>
        <img
          src={p.src}
          alt={p.alt}
          width={p.ancho}
          height={p.alto}
          loading="lazy"
          decoding="async"
          style={esMuyAlta(p)
            ? { width: '100%', maxWidth: '100%', height: 'auto', margin: '0 auto', borderRadius: 10, display: 'block' }
            : { width: p.alto > p.ancho ? 'auto' : '100%', maxWidth: '100%', height: 'auto', maxHeight: 620, objectFit: 'contain', margin: '0 auto', borderRadius: 10, display: 'block' }}
        />
      </a>
      {p.leyenda && <figcaption style={{ fontSize: 13, color: 'var(--suave)', fontStyle: 'italic', marginTop: 6 }}>{p.leyenda}</figcaption>}
    </figure>
  ) : (
    <p key={`p${i}-${p.pedazos[0].texto.slice(0, 40)}`} style={{ fontSize: 16, lineHeight: 1.7, marginTop: 16, color: 'var(--texto)' }}>
      {p.pedazos.map((x, j) => (x.href
        ? <a key={j} href={x.href} style={{ color: 'var(--rojo)', fontWeight: 600 }} {...(x.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{x.texto}</a>
        : x.texto))}
    </p>
  )));
}
