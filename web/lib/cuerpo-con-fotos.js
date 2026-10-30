// El cuerpo de una nota con fotos entre los párrafos (30/10/2026): lo que escribe una persona de la redacción desde el panel
// (web/lib/notas-de-redaccion.js) puede llevar fotos "entre" el texto. Acá se decide, sin React, qué se dibuja y en qué orden; el componente
// (components/cuerpo-con-fotos.js) sólo lo pone en pantalla. Sin imports con "@/": las pruebas lo cargan con node pelado.

import { parrafosConEnlaces } from './enlaces-en-texto.js';

/** Si la foto no trae su tamaño ni se puede medir, se reserva este (3:2): la página no se mueve al cargar. */
export const TAMANO_DE_RESERVA = { ancho: 1200, alto: 800 };

/**
 * Las partes del cuerpo, en el orden en que se leen:
 *   { tipo: 'parrafo', pedazos: [{ texto, href?, externo? }] }
 *   { tipo: 'foto', src, ancho, alto, alt, leyenda }   (`leyenda` vacía: la foto va sin pie)
 * `nota.fotosEnCuerpo[i].despuesDe` es cuántos párrafos van antes de la foto (0: antes del primero; todos: al final).
 * `urlFoto(archivo)` arma la dirección (lib/fotos.js) y `dimensiones(archivo)` mide la foto si la nota no lo dice.
 */
export function partesDelCuerpo(nota, { urlFoto = (a) => `/${a}`, dimensiones = () => null } = {}) {
  const parrafos = parrafosConEnlaces(nota?.cuerpo ?? '', nota?.enlacesEnTexto);
  const fotos = Array.isArray(nota?.fotosEnCuerpo) ? nota.fotosEnCuerpo.filter((f) => f?.archivo) : [];
  const comoParte = (f) => {
    const medida = f.ancho && f.alto ? { ancho: f.ancho, alto: f.alto } : (dimensiones(f.archivo) ?? TAMANO_DE_RESERVA);
    return {
      tipo: 'foto', src: urlFoto(f.archivo), ancho: medida.ancho, alto: medida.alto, alt: f.epigrafe || nota?.titulo || '', leyenda: f.leyenda ?? '',
    };
  };
  const partes = [];
  const pendientes = [...fotos];
  const sacarHasta = (cuantos) => {
    while (pendientes.length && (pendientes[0].despuesDe ?? parrafos.length) <= cuantos) partes.push(comoParte(pendientes.shift()));
  };
  parrafos.forEach((pedazos, i) => {
    sacarHasta(i);
    partes.push({ tipo: 'parrafo', pedazos });
  });
  // Lo que queda va al final (una marca más allá del último párrafo, o una foto sin marca).
  while (pendientes.length) partes.push(comoParte(pendientes.shift()));
  return partes;
}
