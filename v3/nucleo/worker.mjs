// Radar 3.0, el núcleo (etapa B). Punto de entrada del Worker `radar-nucleo`: trae los textos y la lista de fuentes al bundle y se los
// pasa a la lógica (nucleo.mjs, que no importa archivos .md ni .json para poder probarse con Node).
//
// Crons (wrangler.toml): cada 15 minutos la vuelta; a las 00:30 UTC (21:30 de Balcarce) el resumen por Telegram.
// Secretos: GEMINI_API_KEY (la clave paga) y TELEGRAM_TOKEN. Binding AI (Workers AI) y DB (D1). Ver REGLAS.md y CONTRATO.md.
import fuentesJson from './fuentes.json' with { type: 'json' };
import umbrales from './agrupar/umbrales.json' with { type: 'json' };
import perfil from './PERFIL.md';
import redaccion from './redactar/REDACCION.md';
import { cargarFuentes } from './fuentes.mjs';
import { crearNucleo } from './nucleo.mjs';

const nucleo = crearNucleo({ fuentes: cargarFuentes(fuentesJson), perfil, redaccion, umbrales });

export default {
  fetch(pedido, env) {
    return nucleo.manejar(pedido, env);
  },
  scheduled(evento, env, ctx) {
    ctx.waitUntil(nucleo.programado(evento, env).catch((e) => console.error(`vuelta: ${(e && e.stack) || e}`)));
  },
};
