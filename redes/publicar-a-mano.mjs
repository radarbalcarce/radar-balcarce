// Publicar a mano (30/10/2026, Hernán: «publicá los dos reels nuevos y la noticia de Nancy y la del Postre como posteo, en Facebook e Instagram,
// con una o dos horas de diferencia»). Lo usa el workflow «Publicar a mano», que lo dispara una persona (o Claude a pedido de una persona):
//
//   node redes/publicar-a-mano.mjs --reel=postre     el video reels/salida/reel-postre.mp4 como reel en Instagram y en Facebook, con el
//                                                    pie de reels/a-mano/postre.json (`pie`) y el aviso de la voz con IA
//   node redes/publicar-a-mano.mjs --nota=nrpostre22 el posteo con foto de esa nota (la tarjeta de la web, la misma de los posteos de siempre)
//                                                    en Facebook y su espejo en Instagram, con el texto de siempre (mensajeDeNota)
//   --nota=<id> --enlace                             la nota como posteo con ENLACE en Facebook (la tarjeta de la nota, como una nota)
//   --reel=<nombre> --historia                       el mismo video como HISTORIA en Instagram y en Facebook (no como reel)
//
// Sin «--de-verdad» sólo muestra lo que publicaría. No pasa por las reglas de qué sale solo (lo decidió una persona) pero sí por las de fondo:
// nada en rojo, nada sin cuerpo. No anota en el libro de las redes: lo de a mano no cuenta para el cupo de posteos del día.
import fs from 'node:fs';
import path from 'node:path';
import { crearCliente, sinToken } from './meta.mjs';
import { PAGINA_DE_FACEBOOK } from './meta.mjs';
import {
  mensajeDeNota, imagenDeNota, conCreditoDeFoto, quedaAfueraDeLasRedes, hashtagsDe, enlaceConOrigen,
} from './elegir.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const SITIO = process.env.SITIO ?? 'https://radarbalcarce.com';
/** El aviso de los reels (8/10/2026): la voz la hizo una IA. */
export const AVISO_DE_VOZ = 'Voz generada con inteligencia artificial.';

const arg = (nombre) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.split('=').slice(1).join('=') ?? null;

/** El pie de un reel a mano: su texto, el aviso de la voz y los hashtags fijos (más los del archivo, si trae). */
export function pieDelReel(pieza) {
  const tags = ['#Balcarce', '#RadarBalcarce', ...(pieza.hashtags ?? []).map((t) => `#${String(t).replace(/^#/, '')}`)];
  return [String(pieza.pie ?? '').trim(), AVISO_DE_VOZ, [...new Set(tags)].slice(0, 5).join(' ')].filter(Boolean).join('\n\n');
}

async function main() {
  const deVerdad = process.argv.includes('--de-verdad');
  const reel = arg('reel');
  const id = arg('nota');
  if (!reel && !id) throw new Error('Decí qué publicar: --reel=<nombre> o --nota=<id>');
  const token = process.env.META_TOKEN;
  if (deVerdad && !token) throw new Error('Falta META_TOKEN');
  const api = deVerdad ? crearCliente({ token, paginaId: PAGINA_DE_FACEBOOK }) : null;

  if (reel) {
    const pieza = JSON.parse(fs.readFileSync(path.join(RAIZ, 'reels', 'a-mano', `${reel}.json`), 'utf8'));
    const video = fs.readFileSync(path.join(RAIZ, 'reels', 'salida', `reel-${reel}.mp4`));
    const pie = pieDelReel(pieza);
    console.log(`Reel «${reel}» (${(video.length / 1e6).toFixed(1)} MB):\n${pie}\n`);
    if (!deVerdad) return;
    if (process.argv.includes('--historia')) {
      const hi = await api.publicarVideoEnInstagram({ video, tipo: 'STORIES' });
      console.log(`  Historia en Instagram: ${hi.id}`);
      const hf = await api.publicarVideoEnFacebook({ video, tipo: 'STORIES' });
      console.log(`  Historia en Facebook:  ${hf.id}`);
      return;
    }
    const ig = await api.publicarVideoEnInstagram({ video, tipo: 'REELS', pie });
    console.log(`  Instagram: ${await api.enlaceDePublicacion({ id: ig.id, red: 'instagram' }) ?? ig.id}`);
    const fb = await api.publicarVideoEnFacebook({ video, tipo: 'REELS', pie });
    console.log(`  Facebook:  ${await api.enlaceDePublicacion({ id: fb.id, red: 'facebook' }).catch(() => null) ?? fb.id}`);
    return;
  }

  const portada = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'portada.json'), 'utf8'));
  const nota = (portada.notas ?? []).find((n) => n.id === id);
  if (!nota) throw new Error(`La nota ${id} no está en la portada`);
  if (quedaAfueraDeLasRedes({ ...nota, propia: undefined })) throw new Error(`La nota ${id} no puede ir a las redes (roja o sin cuerpo)`);
  if (process.argv.includes('--enlace')) {
    const mensaje = mensajeDeNota(nota, SITIO, { fuente: 'facebook' });
    const enlace = enlaceConOrigen(nota, SITIO, { fuente: 'facebook', campana: 'nota', contenido: nota.id });
    console.log(`Nota con enlace en Facebook: ${enlace}

${mensaje}
`);
    if (!deVerdad) return;
    const r = await api.publicarEnFacebook({ mensaje, enlace });
    console.log(`  Facebook:  ${r.id}`);
    return;
  }
  const facebook = conCreditoDeFoto(mensajeDeNota(nota, SITIO, { fuente: 'facebook' }), nota);
  const instagram = conCreditoDeFoto(mensajeDeNota(nota, SITIO, { fuente: 'instagram' }), nota);
  const imagenUrl = imagenDeNota(nota, SITIO);
  console.log(`Posteo de «${nota.titulo}» (${hashtagsDe(nota).join(' ')})\nimagen: ${imagenUrl}\n\n${facebook}\n`);
  if (!deVerdad) return;
  const fb = await api.publicarFotoEnFacebook({ imagenUrl, mensaje: facebook });
  console.log(`  Facebook:  ${fb.id}`);
  const ig = await api.publicarFotoEnInstagram({ imagenUrl, pie: instagram });
  console.log(`  Instagram: ${await api.enlaceDePublicacion({ id: ig.id, red: 'instagram' }) ?? ig.id}`);
}

if (process.argv[1]?.endsWith('publicar-a-mano.mjs')) {
  main().catch((e) => {
    console.error(`No se pudo: ${sinToken(String(e?.message ?? e), process.env.META_TOKEN)}`);
    process.exit(1);
  });
}
