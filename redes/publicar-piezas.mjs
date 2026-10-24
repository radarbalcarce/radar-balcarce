// Publica las piezas de video que tocan ahora, en Instagram y en la página de
// Facebook: el mismo video, a la misma hora.
//
// Recibe todo lo que necesita (el cliente de Meta, el manifiesto, el libro, el
// reloj) en vez de buscarlo solo, así se prueba sin red y sin archivos.
//
// Reglas de fondo:
//
//   · Una pieza se anota en el libro apenas la red la acepta, y se guarda el
//     libro después de CADA una. Si algo falla a la mitad, lo que ya salió no
//     vuelve a salir.
//   · La PRIMERA red de la lista manda: decide si la pieza está pendiente. Si
//     esa falla, no se intenta en las otras (así no queda un video en una red
//     y otro distinto en la otra cuando el plan elija otra nota la próxima
//     vez). Si falla una de las siguientes, se reintenta en el momento y, si
//     igual no anda, se avisa y se sigue: no se pierde lo que ya salió.

import { anotar } from './elegir.mjs';
import { diaAR } from '../ingesta/zona.mjs';
import { claveDePieza, piezasQueTocan, tipoInstagram, pieDePieza } from './piezas.mjs';
import { posteoYaPublicado } from './espejo.mjs';

/** Cómo se llama cada red en el libro y qué método del cliente la publica. */
const REDES = {
  instagram: { libro: 'instagram', metodo: 'publicarVideoEnInstagram', nombre: 'Instagram' },
  facebook: { libro: 'facebookVideos', metodo: 'publicarVideoEnFacebook', nombre: 'Facebook' },
};

/** Los intentos en las redes que no mandan. */
const INTENTOS_SECUNDARIA = 3;

/** Los intentos de la historia de un reel, en cada red, en la misma corrida. */
export const INTENTOS_HISTORIA = 3;

/**
 * Lo que no salió y por qué (1/10/2026, Hernán: "entender por qué fallan esas
 * cosas"). Antes un fallo sólo quedaba en el registro de la corrida y en el
 * WhatsApp. Ahora queda en el libro (`problemas`), así el panel del celular lo
 * muestra, lo explica y ofrece reintentarlo. La clave es `dia/pieza/red/parte`,
 * con parte = reel | historia | historia-del-reel. Se borra cuando sale.
 */
export const parteDe = (tipo) => (tipo === 'REELS' ? 'reel' : 'historia');
export function registrarProblema(libro, clave, { pieza, red, parte, error, intentos, ahora = new Date() }) {
  libro.problemas ??= {};
  // `intentos`: cuántas veces se intentó en esa corrida (se suman a las de las vueltas anteriores si el problema sigue abierto), para que el informe diga «intentó 3 veces».
  const previos = Number(libro.problemas[clave]?.intentos) || 0;
  libro.problemas[clave] = { pieza, red, parte, error: String(error ?? '').slice(0, 240), cuando: ahora.toISOString(), ...(intentos ? { intentos: previos + intentos } : {}) };
  // Sólo los últimos tres días: el libro no crece.
  const limite = diaAR(new Date(ahora.getTime() - 3 * 24 * 3600e3));
  for (const k of Object.keys(libro.problemas)) if (k.slice(0, 10) < limite) delete libro.problemas[k];
}
export function limpiarProblema(libro, clave) {
  if (!libro?.problemas?.[clave]) return false;
  delete libro.problemas[clave];
  return true;
}

/** ¿Es un podcast? Un reel que cuenta dos notas o más. Cada podcast tiene su
 *  nota en la web (web/lib/notas-propias.js), que enlaza al video: para eso
 *  se guarda en el libro su dirección pública (`permalink`). */
const esPodcast = (p) => p?.tipo === 'REELS' && (p?.notaIds ?? []).length >= 2;

/** La dirección pública de una publicación, o null. Nunca tira un error: sin
 *  la dirección, la nota del podcast sale igual, sólo que sin el enlace. */
async function buscarEnlace(api, red, id) {
  if (typeof api?.enlaceDePublicacion !== 'function') return null;
  try { return await api.enlaceDePublicacion({ id, red }); } catch { return null; }
}

/** Cuántas veces se pide la dirección de una publicación antes de rendirse. */
const INTENTOS_ENLACE = 5;

/**
 * Completa la dirección pública de los podcasts de los últimos días que
 * todavía no la tienen (Facebook a veces no la da hasta terminar de procesar
 * el video). Corre en cada vuelta del reloj de Redes. Devuelve cuántas
 * entradas del libro cambió.
 */
export async function completarEnlaces({
  api, libro, ahora = new Date(), dias = 3, intentos = INTENTOS_ENLACE, log = console.log,
}) {
  const desde = diaAR(new Date(ahora.getTime() - dias * 24 * 3600e3));
  let cambios = 0;
  for (const red of ['instagram', 'facebook']) {
    for (const [clave, p] of Object.entries(libro?.[REDES[red].libro] ?? {})) {
      if (!esPodcast(p) || p.permalink || clave.slice(0, 10) < desde) continue;
      if ((p.intentosEnlace ?? 0) >= intentos) continue;
      const url = await buscarEnlace(api, red, p.mediaId);
      if (url) {
        p.permalink = url;
        delete p.intentosEnlace;
        log(`  ${REDES[red].nombre} · ${clave}: ${url}`);
      } else {
        p.intentosEnlace = (p.intentosEnlace ?? 0) + 1;
      }
      cambios += 1;
    }
  }
  // El reel extra del clima y la farmacia en Facebook (8/10): también necesita su dirección pública.
  for (const [clave, p] of Object.entries(libro?.reelsEnFacebook ?? {})) {
    if (p.permalink || clave.slice(0, 10) < desde || (p.intentosEnlace ?? 0) >= intentos) continue;
    const url = await buscarEnlace(api, 'facebook', p.mediaId);
    if (url) {
      p.permalink = url;
      delete p.intentosEnlace;
      log(`  Facebook · reel extra ${clave}: ${url}`);
    } else {
      p.intentosEnlace = (p.intentosEnlace ?? 0) + 1;
    }
    cambios += 1;
  }
  return cambios;
}

/**
 * @param {object} o
 * @param {object} o.api            el cliente de meta.mjs
 * @param {object[]} o.manifiesto   las piezas armadas (piezas.json)
 * @param {(archivo: string) => Buffer} o.leerVideo
 * @param {object} o.libro          lo ya publicado (se modifica)
 * @param {() => void} o.guardar    guarda el libro en disco
 * @param {boolean} o.activo        REDES_ACTIVAS: si no, sólo simula
 * @param {string[]} [o.destinos]   qué redes, en orden: la primera manda
 * @param {boolean} [o.sinHorario]  para probar a mano
 */
export async function publicarPiezas({
  api, manifiesto, leerVideo, libro, guardar, activo, destinos = ['instagram', 'facebook'],
  sinHorario = false, ahora = new Date(), log = console.log, esperar = (ms) => new Promise((r) => { setTimeout(r, ms); }),
}) {
  for (const red of destinos) libro[REDES[red].libro] ??= {};
  libro.historiasDeReels ??= {}; // el reflejo de cada reel como historia, aparte del libro de reels
  const principal = REDES[destinos[0]];

  const tocan = piezasQueTocan({ piezas: manifiesto, libro, ahora, sinHorario, red: principal.libro });
  const resultado = { publicadas: [], fallos: [], tokenMuerto: false };

  if (!tocan.length) {
    log('  Ninguna pieza para publicar ahora.');
    return resultado;
  }

  for (const pieza of tocan) {
    const tipo = tipoInstagram(pieza); // STORIES o REELS: en las dos redes se llaman igual
    const etiqueta = tipo === 'REELS' ? 'reel' : 'historia';

    if (!activo) {
      log(`  ${destinos.map((d) => REDES[d].nombre).join(' + ')} · ${etiqueta} · ${pieza.nombre} · ${pieza.titulo}`);
      log('             (modo prueba: no se publicó. Falta REDES_ACTIVAS=si)');
      continue;
    }

    // Una historia acepta 60 s. Si el video se pasó, reels/plan.mjs dejó además una
    // versión recortada (`archivoHistoria`): las historias suben ésa y el reel
    // sube el video entero (PENDIENTES 16a).
    const archivoParaHistoria = pieza.archivoHistoria ?? pieza.archivo;
    const video = leerVideo(tipo === 'STORIES' ? archivoParaHistoria : pieza.archivo);
    const clave = claveDePieza(pieza.nombre, ahora);

    for (const [i, red] of destinos.entries()) {
      const { libro: rubro, metodo, nombre } = REDES[red];
      if (libro[rubro][clave]) continue; // esta red ya la tiene

      log(`  ${nombre} · ${etiqueta} · ${pieza.nombre} · ${pieza.titulo}`);
      const intentos = i === 0 ? 1 : INTENTOS_SECUNDARIA;
      let hecho = false;

      // Un reel de Instagram que ya salió aunque Meta contestó con un error (5/10/2026, cuatro copias de un posteo): antes de volver a subirlo se mira si ya está.
      const yaEstaEnInstagram = async () => {
        if (red !== 'instagram' || tipo !== 'REELS' || typeof api.publicacionesRecientesDeInstagram !== 'function') return null;
        try { return posteoYaPublicado(await api.publicacionesRecientesDeInstagram(), pieDePieza(pieza, red), { ahora }); } catch { return null; }
      };
      const huboFalla = Boolean(libro.problemas?.[`${clave}/${red}/${parteDe(tipo)}`]);
      if (huboFalla) {
        const ya = await yaEstaEnInstagram();
        if (ya) {
          anotar(libro, rubro, clave, { mediaId: ya.id, nombre: pieza.nombre, tipo, notaId: pieza.notaId ?? null, notaIds: pieza.notaIds ?? [] });
          limpiarProblema(libro, `${clave}/${red}/${parteDe(tipo)}`);
          guardar();
          log(`             el reel ya estaba publicado (${ya.id}), no se repite`);
          continue;
        }
      }

      for (let intento = 1; intento <= intentos && !hecho; intento += 1) {
        try {
          const r = await api[metodo]({ video, tipo, pie: pieDePieza(pieza, red) });
          anotar(libro, rubro, clave, {
            mediaId: r.id, nombre: pieza.nombre, tipo, notaId: pieza.notaId ?? null, notaIds: pieza.notaIds ?? [],
            // El posteo de una historia de Facebook: es lo que se mide (redes/estadisticas-piezas.mjs, regla 207); el video solo da 0.
            ...(r.postId ? { postId: r.postId } : {}),
          });
          // La dirección pública del podcast, para enlazarlo desde su nota en
          // la web. Si Meta todavía no la da, la completa la vuelta siguiente
          // (completarEnlaces).
          limpiarProblema(libro, `${clave}/${red}/${parteDe(tipo)}`);
          if (esPodcast(libro[rubro][clave])) {
            const url = await buscarEnlace(api, red, r.id);
            if (url) libro[rubro][clave].permalink = url;
          }
          guardar();
          hecho = true;
          if (i === 0) resultado.publicadas.push(pieza.nombre);
          log(`             publicado: ${r.id}`);

          // Un reel también vale como historia: es el mismo video, ya subido,
          // así que compartirlo ahí de paso no cuesta nada y le suma una
          // vidriera más. Si falla, no se pierde el reel por eso: sólo se
          // avisa y se sigue.
          if (tipo === 'REELS') {
            const claveHistoria = `${red}/${clave}`; // una por red: no es el mismo medio subido
            if (!libro.historiasDeReels?.[claveHistoria]) {
              const videoHistoria = pieza.archivoHistoria ? leerVideo(archivoParaHistoria) : video;
              // Tres intentos en esta corrida (sin volver a pedir la voz: el video
              // ya está armado). Entre corridas no se reintenta: el video no se
              // guarda y armarlo de nuevo gasta la voz de Gemini (docs/07-REDES.md).
              for (let intentoH = 1; intentoH <= INTENTOS_HISTORIA; intentoH += 1) {
                try {
                  const rh = await api[metodo]({ video: videoHistoria, tipo: 'STORIES', pie: '' });
                  anotar(libro, 'historiasDeReels', claveHistoria, {
                    mediaId: rh.id, nombre: pieza.nombre, red, notaId: pieza.notaId ?? null, ...(rh.postId ? { postId: rh.postId } : {}),
                  });
                  guardar();
                  if (limpiarProblema(libro, `${clave}/${red}/historia-del-reel`)) guardar(); // sólo si había un problema anotado
                  log(`             + historia: ${rh.id}`);
                  break;
                } catch (e) {
                  const ultimo = intentoH === INTENTOS_HISTORIA || e.tokenMuerto;
                  log(`             la historia del reel falló (intento ${intentoH} de ${INTENTOS_HISTORIA})${ultimo ? ', queda igual el reel' : ''}: ${e.message}`);
                  if (ultimo) {
                    registrarProblema(libro, `${clave}/${red}/historia-del-reel`, { pieza: pieza.nombre, red, parte: 'historia-del-reel', error: e.message, intentos: INTENTOS_HISTORIA, ahora });
                    guardar();
                    break;
                  }
                  await esperar(4000 * intentoH);
                }
              }
            }
          }
          // Facebook: el clima y la farmacia salen como historia en las dos redes y, en Facebook, también como reel (8/10, "dónde sale cada
          // pieza", aprobado; se mide cuatro semanas). Es el mismo video. Si falla, la historia queda igual y no se reintenta: es un extra.
          if (tipo === 'STORIES' && red === 'facebook' && pieza.reelEnFacebook) {
            libro.reelsEnFacebook ??= {};
            if (!libro.reelsEnFacebook[clave]) {
              try {
                const rr = await api[metodo]({ video: leerVideo(pieza.archivo), tipo: 'REELS', pie: pieDePieza({ ...pieza, tipo: 'reel' }, red) });
                anotar(libro, 'reelsEnFacebook', clave, { mediaId: rr.id, nombre: pieza.nombre, tipo: 'REELS' });
                // La dirección pública: la nota del clima de la mañana (web/lib/notas-propias.js) la enlaza. Si Meta todavía no la da, la completa la vuelta siguiente.
                const urlDelReel = await buscarEnlace(api, 'facebook', rr.id);
                if (urlDelReel) libro.reelsEnFacebook[clave].permalink = urlDelReel;
                guardar();
                log(`             + reel en Facebook: ${rr.id}`);
              } catch (e) {
                log(`             el reel de Facebook falló (queda la historia): ${e.message}`);
                if (e.tokenMuerto) { resultado.tokenMuerto = true; return resultado; }
              }
            }
          }
        } catch (e) {
          log(`             falló${intentos > 1 ? ` (intento ${intento} de ${intentos})` : ''}: ${e.message}`);
          if (e.tokenMuerto) {
            resultado.tokenMuerto = true;
            resultado.fallos.push({ pieza: pieza.nombre, red, error: e.message });
            log('             El token venció o lo revocaron: hay que generar otro.');
            return resultado;
          }
          if (intento === intentos) {
            resultado.fallos.push({ pieza: pieza.nombre, red, error: e.message });
            registrarProblema(libro, `${clave}/${red}/${parteDe(tipo)}`, { pieza: pieza.nombre, red, parte: parteDe(tipo), error: e.message, intentos, ahora });
            guardar();
          }
          else await esperar(4000 * intento);
        }
      }

      // Si la red que manda falló, las otras se intentan igual (regla 308: el 22/10 un error 400 de Instagram dejó sin repaso también a Facebook, que es donde
      // está la gente). La principal sigue sin su entrada en el libro, así que la vuelta siguiente la reintenta; las otras ya la tienen y no se repiten.
    }
  }
  return resultado;
}
