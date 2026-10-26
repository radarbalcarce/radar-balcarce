// Publica en las redes lo que corresponde ahora.
//
//   node redes/publicar.mjs --verificar   comprueba que el acceso a Meta anda
//   node redes/publicar.mjs --facebook    publica en Facebook lo que toque
//   node redes/publicar.mjs --enlaces     completa en el libro la dirección
//                                         pública de los podcasts (sólo lee)
//
// Por defecto NO publica: muestra qué haría. Para que publique de verdad hace
// falta REDES_ACTIVAS=si: en la nube, la que recibe el Worker de tareas (infra/tareas-cloudflare/, desde el 23/10);
// en un workflow manual de GitHub, la variable de Actions. Apagada, todo simula.
//
// Necesita META_TOKEN. Nunca lo muestra.

import fs from 'node:fs';
import path from 'node:path';
import { crearCliente, ErrorMeta, sinToken, PAGINA_DE_FACEBOOK } from './meta.mjs';
import { leerJson as leer, leerJsonEstricto } from '../ingesta/json.mjs';
import { publicarPiezas, completarEnlaces } from './publicar-piezas.mjs';
import { espejosPendientes, esLimiteDeMeta, posteoYaPublicado, comoSaleEnFacebook, ESPEJO } from './espejo.mjs';
import { FOTO_EN_INSTAGRAM } from '../web/lib/tarjeta-diseno.js';
import { raizDelProyecto } from './raiz.mjs';
import { fijarEnlacesCortos } from './enlaces-cortos.mjs';
import { traerFotosDeLaPortada } from '../infra/compartido/fotos-r2.mjs';
import { fotosCambiadasDespuesDelPosteo } from './foto-cambiada.mjs';
import {
  elegirParaFacebook, porQueNoHayPosteo, anotarSinPosteos, mensajeDeNota, enlaceDeNota, enlaceConOrigen, imagenDeNota, conCreditoDeFoto, libroNuevo, anotar, yaPublicada, estaActivo,
} from './elegir.mjs';

// Los archivos que lee y escribe, relativos a la carpeta del proyecto (el corredor de tareas de Cloudflare los baja y los guarda: infra/tareas-cloudflare/).
// (Los tres libros de fotos son para saber si la foto de una nota ya posteada cambió: regla 283. Sin ellos, simplemente no hay relecturas.)
export const ARCHIVOS_QUE_LEE = ['web/data/portada.json', 'web/data/redes.json', 'web/data/banco-fotos.json', 'web/data/fotos-manuales.json', 'web/data/fotos-ia.json'];
export const ARCHIVOS_QUE_ESCRIBE = ['web/data/redes.json'];

// Estas cinco se calculan al importar (la terminal y un workflow de GitHub) y `main` las vuelve a calcular con el entorno que reciba: en un Worker de
// Cloudflare las variables no están a la vista al importar (infra/tareas-cloudflare/, 18/10/2026). Si no, REDES_ACTIVAS valdría siempre "apagado".
let RAIZ = path.join(import.meta.dirname, '..');
let PORTADA = path.join(RAIZ, 'web', 'data', 'portada.json');
let LIBRO = path.join(RAIZ, 'web', 'data', 'redes.json');
let ARGV = process.argv.slice(2);

let SITIO = process.env.SITIO ?? 'https://radarbalcarce.com';
// De qué red sale cada enlace (UTM, 15/10/2026: para saber qué posteo trae visitas). El libro sigue guardando el enlace limpio.
const ORIGEN_FACEBOOK = { fuente: 'facebook' };
const ORIGEN_INSTAGRAM = { fuente: 'instagram' };
// Ojo: NO es el número de la dirección facebook.com/profile.php?id=..., que es el
// del perfil de la página. El de la API sale de Configuración del negocio →
// Páginas → "Identificador".
const PAGINA = PAGINA_DE_FACEBOOK;
let ACTIVO = estaActivo(process.env.REDES_ACTIVAS);

/** Una salida con código (donde antes había un `process.exit`): un Worker no puede cerrar el proceso. `main` la convierte en su valor de retorno. */
export class Salida extends Error {
  constructor(codigo, mensaje = '') { super(mensaje || `salida ${codigo}`); this.codigo = codigo; }
}

function cliente() {
  const token = process.env.META_TOKEN;
  if (!token) {
    console.error('  Falta META_TOKEN: es un secreto del Worker de tareas (o de GitHub, en un workflow manual).');
    throw new Salida(1, 'falta META_TOKEN');
  }
  return { token, api: crearCliente({ token, paginaId: PAGINA }) };
}

async function verificar() {
  const { token, api } = cliente();
  try {
    const v = await api.verificar();
    console.log(`  Página:     ${v.pagina}`);
    console.log(`  Instagram:  ${v.instagram ? `@${v.instagram}` : 'NO VINCULADO'}`);
    console.log(`  Permisos:   ${v.permisos ? v.permisos.join(', ') : '(este token no los lista)'}`);
    if (!v.instagram) throw new Salida(1, 'Instagram no vinculado');
  } catch (e) {
    if (e instanceof Salida) throw e;
    console.error(`  No anduvo: ${sinToken(e.message, token)}`);
    if (e instanceof ErrorMeta) {
      console.error(`  código: ${e.codigo} · subcódigo: ${e.subcodigo} · tipo: ${e.tipo} · http: ${e.http}`);
    }
    throw new Salida(1, 'no anduvo');
  }
}

async function facebook() {
  const { token, api } = cliente();
  const portada = leer(PORTADA, { notas: [] });
  const libro = leerJsonEstricto(LIBRO, libroNuevo());
  libro.facebook ??= {};
  // El mismo posteo de Facebook, espejado como foto en el feed de
  // Instagram: misma noticia en las dos redes, con la tarjeta propia
  // (web/lib/tarjeta.js: desde el 28/09 lleva la foto del banco propio si la
  // nota tiene una, con el crédito en el pie y nunca adentro). Va aparte del
  // libro de Facebook porque puede fallar sin que eso invalide lo que ya
  // se publicó ahí.
  libro.instagramFeed ??= {};
  const FACEBOOK_COMO_FOTO = process.env.FACEBOOK_COMO_FOTO !== 'no';

  /** El espejo de un posteo en el feed de Instagram. Si falla, queda anotado el
   *  intento en el posteo de Facebook: se reintenta en las vueltas siguientes
   *  (espejosPendientes) hasta un tope. */
  async function espejar(nota, enlace) {
    // Con la foto de la nota en la tarjeta, su crédito va al pie (conCreditoDeFoto).
    const pie = FOTO_EN_INSTAGRAM ? conCreditoDeFoto(mensajeDeNota(nota, SITIO, ORIGEN_INSTAGRAM), nota) : mensajeDeNota(nota, SITIO, ORIGEN_INSTAGRAM);
    const anotarSalio = (id) => {
      anotar(libro, 'instagramFeed', nota.id, { mediaId: id, titulo: nota.titulo, enlace });
      if (libro.facebook[nota.id]) delete libro.facebook[nota.id].espejoDespuesDe;
      fs.writeFileSync(LIBRO, `${JSON.stringify(libro, null, 2)}\n`);
    };
    // ¿Ya está en Instagram? Se mira cuando ya hubo un intento que falló (5/10/2026: Meta dijo "límite de pedidos" pero publicó, y cada vuelta subió otra copia).
    const yaSalio = async () => {
      try { return posteoYaPublicado(await api.publicacionesRecientesDeInstagram(), pie); } catch { return null; }
    };
    const f = libro.facebook[nota.id];
    if ((f?.intentosEspejo ?? 0) > 0 || f?.espejoDespuesDe) {
      const ya = await yaSalio();
      if (ya) { anotarSalio(ya.id); console.log(`             + Instagram: ya estaba publicado (${ya.id}), no se repite`); return; }
    }
    try {
      const ri = await api.publicarFotoEnInstagram({ imagenUrl: imagenDeNota(nota, SITIO), pie });
      anotarSalio(ri.id);
      console.log(`             + Instagram: ${ri.id}`);
    } catch (e) {
      // Un error de Meta no siempre quiere decir que no se publicó: se mira antes de dar el intento por perdido.
      const ya = await yaSalio();
      if (ya) {
        anotarSalio(ya.id);
        console.log(`             + Instagram: Meta contestó con un error pero lo publicó (${ya.id}); queda anotado`);
        return;
      }
      if (libro.facebook[nota.id]) {
        if (esLimiteDeMeta(e.message, e.codigo)) {
          // Un límite de pedidos no es un intento fallido del posteo: se espera un rato en vez de insistir cada media hora.
          libro.facebook[nota.id].espejoDespuesDe = new Date(Date.now() + ESPEJO.minutosTrasUnLimite * 60000).toISOString();
        } else {
          libro.facebook[nota.id].intentosEspejo = (libro.facebook[nota.id].intentosEspejo ?? 0) + 1;
        }
        fs.writeFileSync(LIBRO, `${JSON.stringify(libro, null, 2)}\n`);
      }
      console.error(`             Instagram (feed) falló, queda sólo en Facebook (se reintenta): ${sinToken(e.message, token)}`);
    }
  }

  // Los espejos que quedaron pendientes en vueltas anteriores (25/09: el del
  // posteo de las 22:25 falló y nunca se reintentaba).
  if (ACTIVO) {
    for (const nota of espejosPendientes({ notas: portada.notas ?? [], libro })) {
      console.log(`  Instagram (feed) · reintento · ${nota.titulo}`);
      await espejar(nota, libro.facebook[nota.id]?.enlace ?? enlaceDeNota(nota, SITIO));
    }
  }

  /**
   * La foto de una nota ya posteada cambió (por ejemplo, llegó la real y el posteo salió con la ilustración de IA): se le pide a Facebook que vuelva a leer
   * la página, UNA vez por cambio y sólo para posteos de las últimas 48 horas (regla 283). Ojo: eso actualiza la vista previa de un posteo que salió como
   * ENLACE; la foto de un posteo con foto la guarda Facebook al publicar y no cambia (docs/redes/FOTO-CAMBIADA-DESPUES-DEL-POSTEO.md).
   */
  async function releerLasQueCambiaronDeFoto() {
    const datos = (f) => leer(path.join(RAIZ, 'web', 'data', f), {});
    const cambiadas = fotosCambiadasDespuesDelPosteo({ libro, banco: datos('banco-fotos.json'), manuales: datos('fotos-manuales.json'), fotosIA: datos('fotos-ia.json') });
    for (const c of cambiadas) {
      const aclaracion = c.comoSalio === 'foto' ? ' (salió con foto: Facebook ya guardó la imagen)' : '';
      console.log(`  Facebook · la foto de «${c.titulo}» cambió después del posteo (${c.origen}); se pide releer ${c.enlace}${aclaracion}`);
      if (!ACTIVO) { console.log('             (modo prueba: no se pidió. Falta REDES_ACTIVAS=si)'); continue; }
      const relectura = { cuando: new Date().toISOString(), deLaFoto: c.desde };
      try {
        const r = await api.releerEnlace({ enlace: c.enlace });
        libro.facebook[c.id].relectura = { ...relectura, ok: r.ok };
      } catch (e) {
        libro.facebook[c.id].relectura = { ...relectura, ok: false, error: sinToken(e.message, token).slice(0, 160) };
        console.error(`             no se pudo pedir la relectura: ${sinToken(e.message, token)}`);
        if (e instanceof ErrorMeta && e.tokenMuerto) break;
      }
      fs.writeFileSync(LIBRO, `${JSON.stringify(libro, null, 2)}\n`);
    }
  }
  await releerLasQueCambiaronDeFoto();

  const elegidas = elegirParaFacebook({ notas: portada.notas ?? [], libro });
  if (!elegidas.length) {
    const porQue = porQueNoHayPosteo({ notas: portada.notas ?? [], libro });
    console.log(`  Nada para publicar en Facebook ahora${porQue.corte ? ` (${porQue.corte})` : `: ${porQue.candidatas} candidata(s); descartes ${JSON.stringify(porQue.descartes)}`}.`);
    // El día abierto y sin con qué: queda anotado por qué (regla 308). Sólo se reescribe el libro si cambió.
    if (anotarSinPosteos(libro, porQue) && ACTIVO) fs.writeFileSync(LIBRO, `${JSON.stringify(libro, null, 2)}\n`);
    return;
  }

  let fallo = false;
  for (const nota of elegidas) {
    const enlace = enlaceDeNota(nota, SITIO);
    console.log(`  Facebook · ${nota.titulo}\n             ${enlace}`);

    if (!ACTIVO) {
      console.log('             (modo prueba: no se publicó. Falta REDES_ACTIVAS=si)');
      continue;
    }

    try {
      // Con foto (5/10, Hernán: "5 posteos por día con foto, en Facebook y en Instagram"): la misma imagen que el espejo de Instagram, con el mismo texto. Si la foto no sale
      // (por ejemplo, la tarjeta de la nota todavía no está en la web), se espera a la vuelta siguiente y, tras tres intentos, sale como enlace.
      libro.facebookFoto ??= {};
      const intentosDeFoto = libro.facebookFoto[nota.id]?.intentos ?? 0;
      let r;
      const como = comoSaleEnFacebook({ intentosDeFoto, conFoto: FACEBOOK_COMO_FOTO });
      if (como === 'foto') {
        const pie = FOTO_EN_INSTAGRAM ? conCreditoDeFoto(mensajeDeNota(nota, SITIO, ORIGEN_FACEBOOK), nota) : mensajeDeNota(nota, SITIO, ORIGEN_FACEBOOK);
        try {
          r = await api.publicarFotoEnFacebook({ imagenUrl: imagenDeNota(nota, SITIO), mensaje: pie });
        } catch (e) {
          if (e instanceof ErrorMeta && e.tokenMuerto) throw e;
          // Un error de Meta no siempre quiere decir que no se publicó (5/10: cuatro copias en Instagram): se mira antes de darlo por perdido.
          let ya = null;
          try { ya = posteoYaPublicado(await api.publicacionesRecientesDeFacebook(), pie); } catch { /* sin datos */ }
          if (ya) { r = { id: ya.id }; console.log('             Meta contestó con un error pero lo publicó; queda anotado'); }
          else {
            libro.facebookFoto[nota.id] = { intentos: intentosDeFoto + 1, ultimo: new Date().toISOString(), error: sinToken(e.message, token).slice(0, 160) };
            fs.writeFileSync(LIBRO, `${JSON.stringify(libro, null, 2)}\n`);
            console.log(`             la foto no salió (intento ${intentosDeFoto + 1} de 3), se reintenta en la vuelta siguiente: ${sinToken(e.message, token)}`);
            continue;
          }
        }
      } else {
        r = await api.publicarEnFacebook({ mensaje: mensajeDeNota(nota, SITIO, ORIGEN_FACEBOOK), enlace: enlaceConOrigen(nota, SITIO, { ...ORIGEN_FACEBOOK, campana: 'posteo', contenido: nota.id }) });
      }
      delete libro.facebookFoto[nota.id];
      // El enlace y los temas quedan en el libro: el enlace es la dirección que
      // ya está en Facebook (generar-datos la respeta aunque cambie el titular)
      // y los temas sirven para no repetir tema al día siguiente.
      anotar(libro, 'facebook', nota.id, {
        postId: r.id, titulo: nota.titulo, enlace, temas: nota.temas ?? [],
        // Cómo salió y con qué foto: si la foto de la nota cambia después, se sabe qué vale la pena releer (regla 283).
        como, fotoAlPublicar: nota.foto?.archivo ?? null,
      });
      fs.writeFileSync(LIBRO, `${JSON.stringify(libro, null, 2)}\n`);
      console.log(`             publicado: ${r.id}`);
    } catch (e) {
      fallo = true;
      console.error(`             falló: ${sinToken(e.message, token)}`);
      if (e instanceof ErrorMeta && e.tokenMuerto) {
        console.error('             El token venció o lo revocaron: hay que generar otro.');
        break;
      }
      continue; // sin Facebook, tampoco tiene sentido intentar Instagram
    }

    // El espejo en Instagram: si falla, se avisa pero no se cuenta como un
    // fallo del posteo en sí — ya quedó publicado en Facebook, que es lo
    // principal.
    if (!yaPublicada(libro, 'instagramFeed', nota.id)) await espejar(nota, enlace);
  }
  if (fallo) throw new Salida(1, 'algún posteo falló');
}

/** Los videos del día (historias y reels) a Instagram. */
async function piezas() {
  const { api } = cliente();
  const carpeta = path.join(RAIZ, 'reels', 'salida');
  const manifiesto = leer(path.join(carpeta, 'piezas.json'), []);
  if (!manifiesto.length) {
    console.log('  No hay piezas armadas (falta reels/salida/piezas.json).');
    return;
  }
  const libro = leerJsonEstricto(LIBRO, libroNuevo());
  // --destino=instagram | facebook | ambas (por defecto). La primera red de la
  // lista es la que manda: decide si la pieza está pendiente.
  const destino = (ARGV.find((a) => a.startsWith('--destino=')) ?? '--destino=ambas').slice(10);
  const destinos = { ambas: ['instagram', 'facebook'], instagram: ['instagram'], facebook: ['facebook'] }[destino];
  if (!destinos) {
    console.error(`  Destino desconocido: ${destino}. Usá instagram, facebook o ambas.`);
    throw new Salida(2, 'destino desconocido');
  }
  const r = await publicarPiezas({
    api, manifiesto, libro, activo: ACTIVO, destinos,
    sinHorario: ARGV.includes('--sin-horario'),
    leerVideo: (archivo) => fs.readFileSync(path.join(carpeta, archivo)),
    guardar: () => fs.writeFileSync(LIBRO, JSON.stringify(libro, null, 2)),
  });
  if (r.fallos.length) throw new Salida(1, 'alguna pieza falló');
}

/**
 * La dirección pública de los podcasts de los últimos días que todavía no la
 * tienen: la usa la nota de cada podcast en la web (web/lib/notas-propias.js).
 * Sólo pregunta, no publica nada, así que corre aunque REDES_ACTIVAS esté
 * apagado. Nunca hace fallar la corrida.
 */
async function enlaces() {
  const token = process.env.META_TOKEN;
  if (!token) {
    console.log('  Sin META_TOKEN: no se completan las direcciones de los podcasts.');
    return;
  }
  const api = crearCliente({ token, paginaId: PAGINA });
  const libro = leerJsonEstricto(LIBRO, libroNuevo());
  try {
    const cambios = await completarEnlaces({ api, libro });
    if (cambios) fs.writeFileSync(LIBRO, `${JSON.stringify(libro, null, 2)}\n`);
    else console.log('  Los podcasts de estos días ya tienen su dirección (o no hay).');
  } catch (e) {
    console.log(`  No se pudieron completar las direcciones: ${sinToken(e.message, token)}`);
  }
}

/**
 * La entrada para todos los lados (el Worker de tareas de Cloudflare, un workflow de GitHub y la terminal): `argv` es lo que seguía a `node redes/publicar.mjs`. Devuelve el
 * código de salida (0 = bien) en vez de cerrar el proceso. Vuelve a leer el entorno (`env`, `raiz`) antes de empezar.
 */
export async function main({ argv = process.argv.slice(2), env = process.env, raiz = null } = {}) {
  ARGV = argv;
  RAIZ = raiz ?? raizDelProyecto(env, import.meta.dirname);
  PORTADA = path.join(RAIZ, 'web', 'data', 'portada.json');
  LIBRO = path.join(RAIZ, 'web', 'data', 'redes.json');
  SITIO = env.SITIO ?? 'https://radarbalcarce.com';
  ACTIVO = estaActivo(env.REDES_ACTIVAS);
  // ENLACES_CORTOS ("Si"): los enlaces de los posteos y los pies salen como radarbalcarce.com/r/<red>/<destino> (regla 282). Vacía, todo sale como siempre.
  fijarEnlacesCortos(env.ENLACES_CORTOS);
  // FOTOS_EN_R2 ("Si"): las fotos de las notas ya no están en git; las placas y los collages las toman del disco, así que se traen antes de armar nada.
  if (argv[0] === '--facebook' || argv[0] === '--piezas') await traerFotosDeLaPortada({ raiz: RAIZ, sitio: SITIO, env, log: console.log });
  const modo = argv[0];
  try {
    if (modo === '--verificar') await verificar();
    else if (modo === '--facebook') await facebook();
    else if (modo === '--piezas') await piezas();
    else if (modo === '--enlaces') await enlaces();
    else {
      console.log('Uso: node redes/publicar.mjs --verificar | --facebook | --enlaces | --piezas [--sin-horario] [--destino=ambas|instagram|facebook]');
      return 2;
    }
  } catch (e) {
    if (e instanceof Salida) return e.codigo;
    throw e;
  }
  return 0;
}

// Sólo corre cuando esto se ejecuta directamente (node redes/publicar.mjs),
// igual que reels/plan.mjs y compañía: así se puede importar (por ejemplo,
// desde una prueba) sin que dispare una publicación real ni cierre el
// proceso con process.exit().
if (process.argv[1] && process.argv[1].endsWith('publicar.mjs')) {
  const codigo = await main({ argv: process.argv.slice(2) });
  if (codigo) process.exit(codigo);
}
