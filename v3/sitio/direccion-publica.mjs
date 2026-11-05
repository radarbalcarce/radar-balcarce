// ¿Esta dirección se puede bajar sin riesgo? (auditoría de seguridad del 5/11/2026)
// Las direcciones de las fotos vienen de los feeds de otros medios, o sea de afuera. Quien las baja desde una máquina propia (el workflow «fotos propias»
// corre en un servidor de GitHub) no tiene que poder ser mandado a mirar cosas de la red interna (la dirección de metadatos de la nube, localhost,
// redes privadas). Sin dependencias: sirve igual en Node y en un Worker.

/** Los cuatro números de una dirección IPv4 escrita como tal (decimal con puntos), o null. */
function ipv4(host) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return null;
  const n = m.slice(1).map(Number);
  return n.every((x) => x <= 255) ? n : null;
}

/** ¿Es una IPv4 de uso interno (loopback, privada, enlace local, CGNAT, reservada, multicast)? */
function ipv4Interna([a, b]) {
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

/**
 * true si la dirección es http(s), sin usuario ni contraseña, en el puerto de siempre, y su anfitrión no es interno:
 * ni `localhost`, ni nombres sin punto (`intranet`), ni `.local`/`.internal`/`.lan`, ni una IP interna escrita de cualquier forma
 * (decimal, hexadecimal, octal o entera: `new URL` las normaliza a puntos antes de mirarlas), ni IPv6 (los medios usan nombres).
 * No resuelve nombres (un Worker o una prueba no pueden): un nombre público que apunte a una IP interna lo frena la red de GitHub/Cloudflare, no esto.
 */
export function esDireccionPublica(texto) {
  let u;
  try { u = new URL(String(texto)); } catch { return false; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  if (u.username || u.password) return false;
  if (u.port && u.port !== '80' && u.port !== '443') return false;
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host.startsWith('[') || host.includes(':')) return false;
  const ip = ipv4(host);
  if (ip) return !ipv4Interna(ip);
  if (!host.includes('.')) return false;
  if (host === 'localhost' || /\.(?:localhost|local|internal|lan|home|corp|intranet)$/.test(host)) return false;
  return true;
}
