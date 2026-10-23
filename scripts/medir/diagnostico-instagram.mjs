// Diagnóstico de Instagram (sólo mira; no publica nada). Se corre a mano desde el workflow «Diagnóstico de Instagram».
// Cuando los reels fallan con «La subida del video falló (400)», responde: ¿el cupo de publicación está lleno? ¿los permisos siguen? ¿Meta rechaza
// CUALQUIER video chico (problema de Meta o de la cuenta) o sólo los nuestros (problema del archivo)? Nunca imprime el token.
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sinToken, PAGINA_DE_FACEBOOK } from '../../redes/meta.mjs';

const BASE = 'https://graph.facebook.com/v23.0';
const token = process.env.META_TOKEN;
if (!token) { console.error('Falta META_TOKEN.'); process.exit(1); }

async function pedir(ruta, { metodo = 'GET', params = {}, tokenUso = token } = {}) {
  const url = new URL(`${BASE}/${ruta}`);
  const cuerpo = new URLSearchParams({ access_token: tokenUso, ...params });
  const r = metodo === 'GET' ? await fetch(`${url}?${cuerpo}`) : await fetch(url, { method: metodo, body: cuerpo });
  const j = await r.json().catch(() => ({}));
  return { http: r.status, j };
}
const limpio = (x, t) => sinToken(JSON.stringify(x), t).slice(0, 500);

const pag = await pedir(PAGINA_DE_FACEBOOK, { params: { fields: 'name,access_token,instagram_business_account{id,username}' } });
const tokenPagina = pag.j.access_token;
const ig = pag.j.instagram_business_account?.id;
console.log(`Página: ${pag.j.name ?? '?'} · Instagram: ${pag.j.instagram_business_account?.username ?? 'no vinculado'} (HTTP ${pag.http})`);
if (!ig || !tokenPagina) { console.log('Sin Instagram o sin token de página:', limpio(pag.j, token)); process.exit(0); }

const permisos = await pedir('me/permissions');
console.log('Permisos:', (permisos.j.data ?? []).map((p) => `${p.permission}=${p.status}`).join(', ') || limpio(permisos.j, token));

const cupo = await pedir(`${ig}/content_publishing_limit`, { params: { fields: 'quota_usage,config' }, tokenUso: tokenPagina });
console.log('Cupo de publicación (24 h):', limpio(cupo.j, tokenPagina));

// Prueba de subida: un video de 5 segundos armado acá, 1080x1920, H.264 + AAC (el mismo formato que los nuestros). Se crea el contenedor y se sube,
// pero NO se publica: Instagram lo descarta solo a las 24 horas.
const carpeta = mkdtempSync(join(tmpdir(), 'diag-'));
const archivo = join(carpeta, 'prueba.mp4');
const ffmpeg = (await import('ffmpeg-static')).default;
execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'color=c=0x1d4ed8:s=1080x1920:r=30:d=5', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100:duration=5', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ac', '1', '-shortest', '-movflags', '+faststart', archivo], { stdio: 'ignore' });
// Con rutas como argumentos sube esos videos (los que fallaron) en vez del de prueba.
const rutas = process.argv.slice(2);
if (rutas.length) { for (const r of rutas) await subir(readFileSync(r), r); process.exit(0); }
const video = readFileSync(archivo);

await subir(video, "video de prueba");

async function subir(video, nombre) {
  const cont = await pedir(`${ig}/media`, { metodo: 'POST', params: { media_type: 'REELS', upload_type: 'resumable' }, tokenUso: tokenPagina });  
  console.log(nombre);
  console.log(`Contenedor: HTTP ${cont.http} ${cont.j.id ? 'creado' : limpio(cont.j, tokenPagina)}`);  
  if (cont.j.uri) {  
    const r = await fetch(cont.j.uri, { method: 'POST', headers: { Authorization: `OAuth ${tokenPagina}`, offset: '0', file_size: String(video.length) }, body: video });  
    const cuerpo = await r.json().catch(() => ({}));  
    console.log(`Subida de un video de prueba (${video.length} bytes): HTTP ${r.status} ${limpio(cuerpo, tokenPagina)}`);  
    for (let i = 0; i < 20; i += 1) {  
      const e = await pedir(cont.j.id, { params: { fields: 'status_code,status' }, tokenUso: tokenPagina });  
      console.log(`  estado: ${e.j.status_code ?? '?'} ${e.j.status ?? ''}`);  
      if (e.j.status_code === 'FINISHED' || e.j.status_code === 'ERROR' || e.j.status_code === 'EXPIRED') break;  
      await new Promise((x) => setTimeout(x, 3000));  
    }  
  }  
  }
