// Arma el media kit de publicidad (PDF) desde la plantilla de docs/propuestas/media-kit/.
//
//   node scripts/media-kit.mjs                                         → el kit genérico, docs/propuestas/MEDIA-KIT-2026-11.pdf
//   node scripts/media-kit.mjs docs/propuestas/anunciantes/sweet-candy-bar.json   → el kit de ese comercio, al lado del JSON
//
// El JSON de un comercio lleva: nombre, iniciales, avisoTexto, notaTitulo, notaBajada, fotoSugerida, reel, pedido, personalIntro.
// Necesita Chrome instalado (lo usa sin ventana, con un perfil descartable). Sin dependencias.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname, basename, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const esteArchivo = fileURLToPath(import.meta.url);
const raiz = resolve(dirname(esteArchivo), '..');
const carpeta = join(raiz, 'docs', 'propuestas', 'media-kit');
const fuentes = join(raiz, 'web', 'public', 'fuentes');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'];

const GENERICO = {
  nombre: 'Tu comercio', iniciales: 'Tu logo', avisoTexto: 'Lo que hacés, en una línea, con tu WhatsApp o tu Instagram',
  para: '',
};

function base64(ruta, tipo) { return `data:${tipo};base64,${readFileSync(ruta).toString('base64')}`; }

export function armarHtml(datos) {
  const d = { ...GENERICO, ...datos };
  let html = readFileSync(join(carpeta, 'plantilla.html'), 'utf8');
  const personal = d.notaTitulo ? readFileSync(join(carpeta, 'pagina-personal.html'), 'utf8') : '';
  const para = d.notaTitulo
    ? `<div class="para"><div class="serif">Propuesta para ${d.nombre}</div><p>${d.para || 'Armada a partir de lo que ya muestran en sus redes. Todo lo que diga la nota lo confirmamos con ustedes antes de publicar.'}</p></div>`
    : '';
  const valores = {
    TITULO_EXTRA: d.notaTitulo ? ` · ${d.nombre}` : '',
    PARA: para,
    PAGINA_PERSONAL: personal,
    FUENTE_SERIF: base64(join(fuentes, 'source-serif-4-latin.woff2'), 'font/woff2'),
    FUENTE_SANS: base64(join(fuentes, 'inter-latin.woff2'), 'font/woff2'),
    CAPTURA_CEL: base64(join(carpeta, 'portada-celular.jpg'), 'image/jpeg'),
    CAPTURA_PC: base64(join(carpeta, 'portada-escritorio.jpg'), 'image/jpeg'),
    NOMBRE: d.nombre, INICIALES: d.iniciales, AVISO_TEXTO: d.avisoTexto,
    NOTA_TITULO: d.notaTitulo || '', NOTA_BAJADA: d.notaBajada || '', FOTO_SUGERIDA: d.fotoSugerida || '',
    REEL: d.reel || '', PEDIDO: d.pedido || '', PERSONAL_INTRO: d.personalIntro || '',
  };
  // Primero entran los bloques (la página personal y el «para»), que traen sus propias marcas; después, los valores.
  html = html.replace('{{PAGINA_PERSONAL}}', valores.PAGINA_PERSONAL).replace('{{PARA}}', valores.PARA);
  return html.replace(/\{\{([A-Z_]+)\}\}/g, (_, clave) => {
    if (!(clave in valores)) throw new Error(`La plantilla pide {{${clave}}} y no lo tengo`);
    return valores[clave];
  });
}

export function aPdf(rutaHtml, rutaPdf) {
  const chrome = CHROME.find((c) => existsSync(c));
  if (!chrome) throw new Error('No encuentro Chrome ni Edge para armar el PDF');
  const perfil = join(tmpdir(), 'radar-media-kit-chrome');
  mkdirSync(perfil, { recursive: true });
  const r = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${perfil}`, '--no-pdf-header-footer',
    `--print-to-pdf=${rutaPdf}`, '--virtual-time-budget=5000', pathToFileURL(rutaHtml).href], { stdio: 'ignore' });
  if (r.status !== 0 || !existsSync(rutaPdf)) throw new Error(`Chrome no escribió el PDF (salida ${r.status})`);
}

const esPrincipal = process.argv[1] && resolve(process.argv[1]) === esteArchivo;
if (esPrincipal) {
  const json = process.argv[2];
  const datos = json ? JSON.parse(readFileSync(json, 'utf8')) : {};
  const salida = json ? join(dirname(resolve(json)), basename(json, '.json') + '-media-kit') : join(raiz, 'docs', 'propuestas', 'MEDIA-KIT-2026-11');
  writeFileSync(salida + '.html', armarHtml(datos), 'utf8');
  aPdf(salida + '.html', salida + '.pdf');
  console.log('listo:', salida + '.pdf');
}
