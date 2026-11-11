// Bluesky y Threads en Radar 3.0 (lado del Worker `radar-redes`): decide QUÉ nota va a cada una y la reserva en la tabla `publicaciones`. NO dibuja la imagen ni llama a las APIs
// (la imagen de enlace 1,91:1 se dibuja con resvg, que no corre en un Worker): eso lo hace `piezas/enlaces.mjs` en GitHub Actions, que pide este plan y después cuenta cómo salió.
//
// Qué nota va: las MISMAS que salieron en Facebook hoy (así ya pasaron la ley, el tono R41, la foto y los cupos: nada nuevo que cuidar), una vez por red, la más vieja primero, hasta
// 3 por red en cada corrida, y mientras no hayan pasado 12 horas desde que salieron en Facebook. Una nota que falló dos veces en una red no se reintenta en esa red.
// Ensayo (REDES_ACTIVAS «no»): se anota como `simulado` y el programa no llama a nadie. Real: se anota `enviando` y el programa cuenta `ok` o `error` con `/enlaces/resultado`.
import { diaDeBalcarce, hechasDe, tipoDeNota, sePuedeConPlacaSola, saleEn } from './elegir.mjs';
import { notasParaRedes, publicacionesDelDia, anotarIntento, cerrarIntento, vencerEnviando } from './db.mjs';
import { textoDeBluesky } from './bluesky.mjs';
import { textoDeThreads } from './threads.mjs';
import { enlaceDeNota, SITIO } from './texto.mjs';
import { textoDeX, xConEnlace } from './x.mjs';
import { nombreDePlaca, urlDePlaca, PREFIJO_DE_PLACAS, DIRECCION_DE_LAS_REDES } from './placa-clave.mjs';

// «x»: X por Buffer, con la placa 4:5 del posteo de Facebook (v3/redes/x.mjs). Es la única que NO usa la imagen de enlace: su imagen ya está dibujada y pública.
export const REDES_DE_ENLACE = Object.freeze(['bluesky', 'threads', 'x']);
export const REGLAS_ENLACES = Object.freeze({ porRedYCorrida: 3, horasDespuesDeFacebook: 12, erroresPorNota: 2, enviandoVenceMinutos: 45 });

const textoDe = { bluesky: textoDeBluesky, threads: textoDeThreads, x: (nota, sitio, env) => textoDeX(nota, { conEnlace: xConEnlace(env), sitio }) };

/** Los nombres de las placas ya dibujadas en R2 (una sola lectura de la lista); sin el depósito, null. */
async function placasDibujadas(env) {
  if (!env?.PLACAS?.list) return null;
  const nombres = new Set();
  let cursor;
  do {
    const r = await env.PLACAS.list({ prefix: PREFIJO_DE_PLACAS, cursor });
    for (const o of r.objects ?? []) nombres.add(o.key.slice(PREFIJO_DE_PLACAS.length));
    cursor = r.truncated ? r.cursor : undefined;
  } while (cursor);
  return nombres;
}

/**
 * Lo que toca publicar ahora en Bluesky y Threads.
 * @param {object} o  { ahora, simulado, redes: las que el programa tiene con credenciales (en ensayo se ignora: se simulan las dos), sitio }
 * @returns {{ dia, simulado, items: [{ id, red, nota: { id, titulo, bajada, enDosLineas, seccion, foto }, enlace, texto }] }}
 */
export async function planearEnlaces(env, { ahora = new Date(), simulado = true, redes = [], sitio = env?.SITIO || SITIO, reglas = REGLAS_ENLACES } = {}) {
  const dia = diaDeBalcarce(ahora);
  const ahoraISO = ahora.toISOString();
  const quienes = REDES_DE_ENLACE.filter((r) => simulado || redes.includes(r));
  for (const red of quienes) await vencerEnviando(env, { red, dia, simulado, antesDeISO: new Date(ahora.getTime() - reglas.enviandoVenceMinutos * 60_000).toISOString() });
  const hechas = await publicacionesDelDia(env, dia, simulado);
  const enFacebook = hechasDe(hechas, 'facebook').filter((h) => (ahora - new Date(h.cuando)) / 3600_000 <= reglas.horasDespuesDeFacebook).sort((a, b) => new Date(a.cuando) - new Date(b.cuando));
  const items = [];
  if (!enFacebook.length || !quienes.length) return { dia, simulado, items };

  const conPlacas = quienes.includes('x') || quienes.includes('threads') ? await placasDibujadas(env) : null;
  const baseDePlacas = env?.URL_DE_REDES || DIRECCION_DE_LAS_REDES;
  const notas = new Map((await notasParaRedes(env, { desdeISO: new Date(ahora.getTime() - 48 * 3600_000).toISOString(), conBorradores: simulado })).map((n) => [n.id, n]));
  for (const red of quienes) {
    const yaEstan = new Set(hechasDe(hechas, red).map((h) => h.notaId));
    const fallos = new Map();
    for (const h of hechas) if (h.red === red && h.estado === 'error') fallos.set(h.notaId, (fallos.get(h.notaId) || 0) + 1);
    let n = 0;
    for (const f of enFacebook) {
      if (n >= reglas.porRedYCorrida) break;
      if (yaEstan.has(f.notaId) || (fallos.get(f.notaId) || 0) >= reglas.erroresPorNota) continue;
      const nota = notas.get(f.notaId);
      if (!nota || !saleEn(nota, red) || (!nota.foto?.url && !sePuedeConPlacaSola(nota))) continue; // la imagen de enlace necesita la foto (las de Facebook ya la tienen), salvo una nota de Balcarce sin foto: va con la placa de su sección
      // X lleva la placa: si todavía no está dibujada (o el Worker no ve el depósito, en real), espera a la corrida siguiente. En ensayo se anota igual.
      if (red === 'x' && !simulado && !(conPlacas && conPlacas.has(nombreDePlaca(nota)))) continue;
      const texto = textoDe[red](nota, sitio, env);
      const id = await anotarIntento(env, { red, notaId: nota.id, seccion: nota.seccion, tipo: f.tipo, cuando: ahoraISO, dia, estado: simulado ? 'simulado' : 'enviando', simulado, texto });
      if (!id) continue; // otra corrida la tomó primero
      items.push({
        // Threads lleva la placa de SU nota (10/11, caso del Papa: con sólo el enlace, Meta armó la tarjeta con una miniatura de «Seguí leyendo» de otra nota). Sin placa dibujada, sale como antes (texto + enlace).
        id, red, simulado, enlace: enlaceDeNota(nota, sitio), texto,
        ...(red === 'x' || (red === 'threads' && conPlacas?.has(nombreDePlaca(nota))) ? { imagen: urlDePlaca(nota, baseDePlacas) } : {}),
        nota: { id: nota.id, titulo: nota.titulo, bajada: nota.bajada, enDosLineas: nota.enDosLineas, seccion: nota.seccion, deBalcarce: tipoDeNota(nota) === 'local', foto: nota.foto, slug: nota.slug },
      });
      n += 1;
    }
  }
  return { dia, simulado, items };
}

/** Lo que contó el programa de un posteo: { id, estado: 'ok' | 'error', idExterno, error }. Devuelve { ok } o { error }. */
export async function registrarEnlace(env, cuerpo) {
  const id = Number(cuerpo?.id);
  if (!Number.isInteger(id) || id <= 0) return { error: 'falta el id' };
  if (cuerpo?.estado !== 'ok' && cuerpo?.estado !== 'error') return { error: `estado desconocido: ${cuerpo?.estado}` };
  const fila = await env.DB.prepare("SELECT id, red FROM publicaciones WHERE id = ? AND red IN ('bluesky', 'threads', 'x')").bind(id).first();
  if (!fila) return { error: 'no existe esa fila' };
  await cerrarIntento(env, id, { estado: cuerpo.estado, idMeta: cuerpo.idExterno ? String(cuerpo.idExterno).slice(0, 300) : null, error: cuerpo.error ? String(cuerpo.error).slice(0, 500) : null });
  return { ok: true };
}

