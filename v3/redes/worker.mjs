// Radar 3.0, las redes (etapa D). Punto de entrada del Worker `radar-redes`: arma la lógica de redes.mjs con las dependencias de verdad.
// Cron (wrangler.toml): cada 15 minutos de 8 a 22 de Balcarce una vuelta; a las 22:05 el resumen del día por Telegram.
// Secretos: META_TOKEN y TELEGRAM_TOKEN. Binding DB (D1) y TELEGRAM (enlace al bot). Variable REDES_ACTIVAS: «no» simula. Ver REGLAS.md.
import { crearRedes } from './redes.mjs';

const redes = crearRedes();

export default {
  fetch(pedido, env) {
    return redes.manejar(pedido, env);
  },
  scheduled(evento, env, ctx) {
    ctx.waitUntil(redes.programado(evento, env).catch((e) => console.error(`redes: ${(e && e.stack) || e}`)));
  },
};
