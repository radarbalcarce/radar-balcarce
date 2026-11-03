// Radar 3.0, el sitio (etapa C). Punto de entrada del Worker `radar-sitio`: todo lo arma sitio.mjs. Ver REGLAS.md.
// Binding DB (D1, la base `radar-nucleo`) y variable INDEXAR ("no" mientras viva en workers.dev).
import { crearSitio } from './sitio.mjs';

const sitio = crearSitio();

export default {
  async fetch(pedido, env, ctx) {
    try {
      return await sitio.manejar(pedido, env, ctx);
    } catch (e) {
      console.error(`sitio: ${(e && e.stack) || e}`);
      return new Response('Error del sitio. Probá de nuevo en un rato.', { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
    }
  },
};
