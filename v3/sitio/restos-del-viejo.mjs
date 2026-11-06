// Direcciones del sitio viejo que el 3.0 no sirve pero que todavía andan dando vueltas (buscadores, agentes). Sin dependencias.
// Medido el 6/11/2026 contra radarbalcarce.com con el encabezado x-radar-respaldo (que apaga la red de seguridad): daba 410 y el sitio viejo la tenía.
//   /nota/indice.json   → el índice de notas para agentes, ahora en /agentes/indice.json
// Las tarjetas de vista previa del viejo (/opengraph-image, /nota/x/opengraph-image…) siguen dando 404 a propósito (cierre.test.mjs): se decidió en el cierre.
// Devuelve el destino (una ruta de este mismo sitio) o null si la dirección no es una de estas.

export function destinoDeRestoViejo(pathname) {
  const ruta = String(pathname ?? '').replace(/\/+$/, '') || '/';
  if (ruta === '/nota/indice.json') return '/agentes/indice.json';
  return null;
}
