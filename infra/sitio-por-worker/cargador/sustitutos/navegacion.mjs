// Lo mínimo de `next/navigation` que usa el sitio (prototipo del sitio por Worker): `notFound` corta el armado de la página y `usePathname`
// devuelve la dirección que se está armando (la fija quien arma la página, justo antes de renderizar).

export class NoEncontrada extends Error {
  constructor() { super('NEXT_NOT_FOUND'); this.digest = 'NEXT_NOT_FOUND'; }
}

export function notFound() { throw new NoEncontrada(); }

export function usePathname() { return globalThis.__RADAR_RUTA ?? '/'; }
