// Arma docs/3-0/mockup-redes.html con lo que dejó dibujar.mjs (img/ + catalogo.json), la tabla real PIEZAS_DEL_DIA y los textos reales de cada red.
//   node docs/3-0/mockup-redes/dibujar.mjs && node docs/3-0/mockup-redes/construir.mjs
import fs from 'node:fs';
import path from 'node:path';
import { PIEZAS_DEL_DIA, accionesDe, redesDeBuffer, TOPE_YOUTUBE_POR_DIA } from '../../../v3/redes/piezas-del-dia.mjs';
import { textoFacebook, textoInstagram } from '../../../v3/redes/texto.mjs';
import { textoDeX } from '../../../v3/redes/x.mjs';
import { textoDeThreads } from '../../../v3/redes/threads.mjs';
import { textoDeBluesky } from '../../../v3/redes/bluesky.mjs';
import { textoDePieza, textoParaBuffer } from '../../../v3/redes/piezas/publicar.mjs';
import { COLOR_SECCION } from '../../../reels/placa.mjs';

const AQUI = import.meta.dirname;
const cat = JSON.parse(fs.readFileSync(path.join(AQUI, 'catalogo.json'), 'utf8'));
const portada = JSON.parse(fs.readFileSync(path.join(AQUI, '..', '..', '..', 'web', 'data', 'portada.json'), 'utf8'));
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const diasDe = (p) => (p.dias.length === 7 ? 'todos los días' : p.dias.map((d) => DIAS[d]).join(', '));
const finDe = (p) => { const m = Math.min(1440, Number(p.hora.slice(0, 2)) * 60 + Number(p.hora.slice(3)) + p.ventana); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const FORMATO = { video: '1080×1920 (9:16) video', imagen: '1080×1350 (4:5)', carrusel: '1080×1350 (4:5) por lámina' };

// nota de ejemplo para los textos
const n = portada.notas.find((x) => x.id === '81mpvn');
const nota = { id: n.id, titulo: n.titulo, bajada: n.copete, enDosLineas: n.copete, seccion: n.seccion, foto: { credito: n.foto.credito, url: 'x' } };

// ------------------------------------------------------------------ piezas del día: textos reales por red
const porId = (id) => PIEZAS_DEL_DIA.find((p) => p.id === id);
function textoPieza(id, red, guion, extra = {}) {
  const item = { ...porId(id), datos: extra.datos ?? {} };
  const pieza = { guion, aviso: extra.aviso ?? 'Voz generada con inteligencia artificial.' };
  return red === 'buffer-x' ? textoParaBuffer(pieza, item, 'twitter') : textoParaBuffer(pieza, item, red) ?? '';
}
const guionClima = cat['clima-manana'].guion;
const itemClima = { ...porId('clima-manana'), datos: {} };
const pieClima = (red) => textoDePieza({ guion: guionClima, aviso: cat['clima-manana'].aviso }, itemClima, red);
const guionRepaso = cat['repaso-tarde'].guion;
const notasRepaso = [nota, { id: '1wphsfy', titulo: 'Javier Milei y Pedro Sánchez se saludan en la Cumbre Iberoamericana' }, { id: '1858pwy', titulo: 'El Gobierno confirma la segunda edición del Argentina Week en Nueva York' }];
const itemRepaso = { ...porId('noticia2'), datos: { notas: notasRepaso } };
const pieRepaso = (red) => textoDePieza({ guion: guionRepaso, aviso: cat['repaso-tarde'].aviso }, itemRepaso, red);

// ------------------------------------------------------------------ HTML
const img = (src, alt, cls = '') => `<img class="${cls}" src="mockup-redes/${src}" alt="${esc(alt)}" loading="lazy">`;
const tarjeta = ({ imagenes, titulo, medida, p, extra = '', ancho = 'v' }) => `
<figure class="card ${ancho}">
  <div class="thumbs">${imagenes.map((i) => `<div class="th">${img(i.src, i.nombre)}<span>${esc(i.nombre)}</span></div>`).join('')}</div>
  <figcaption><b>${esc(titulo)}</b><br><span class="med">${medida}</span>${p ? `<br><span class="hor">${p.hora}–${finDe(p)} · ${diasDe(p)} · voz ${p.sinVoz ? 'sin voz' : `prioridad ${p.voz}`}${p.condicional ? ' · condicional' : ''}${p.pausada ? ' · <em>PAUSADA</em>' : ''}</span>` : ''}${extra}</figcaption>
</figure>`;
const redesDe = (p) => {
  const a = accionesDe(p).map((x) => `${x.red === 'facebook' ? 'FB' : 'IG'} ${x.tipo.toLowerCase()}`);
  if (p.formato !== 'carrusel') a.push('TikTok · YouTube · X (video Buffer)');
  return `<br><span class="red">Sale en: ${a.join(' · ')}</span>`;
};
const bloque = (id, titulo, bajada, contenido) => `<section class="bloque" id="${id}"><h3>${titulo}</h3><p class="baj">${bajada}</p><div class="fila">${contenido}</div></section>`;
const V = FORMATO.video;
const paleta = Object.entries(COLOR_SECCION).map(([k, c]) => `<span class="sw" style="background:${c}">${esc(k)}<small>${c}</small></span>`).join('');

let catalogoHtml = '';
catalogoHtml += bloque('clima', 'El clima (mañana y noche), auspiciado y los 7 cielos', 'Una sola escena con ilustración según el cielo; de noche la misma con luna. El auspicio agrega la franja ámbar desde el segundo 3 y alarga el video a 22 s.',
  tarjeta({ imagenes: cat['clima-manana'].imagenes, titulo: 'El clima de la mañana', medida: V, p: porId('clima-manana'), extra: redesDe(porId('clima-manana')) })
  + tarjeta({ imagenes: cat['clima-noche'].imagenes, titulo: 'El clima de la noche', medida: V, p: porId('clima-noche'), extra: redesDe(porId('clima-noche')) })
  + tarjeta({ imagenes: cat['clima-auspiciado'].imagenes, titulo: 'Clima auspiciado (franja ámbar)', medida: `${V} · 22 s`, p: porId('clima-manana') })
  + tarjeta({ imagenes: cat['clima-cielos'].imagenes, titulo: 'Los 14 cielos (7 de día y 7 de noche)', medida: 'misma escena, paleta e ilustración distintas', ancho: 'ancha' }));
catalogoHtml += bloque('avisos', 'Avisos de clima (helada, granizo, viento)', 'Historia con voz de 15 s; sólo si hay un aviso grave. Sin hora fija: de 7:00 a 22:00, una vez al día cada tipo. (Los números del ejemplo son inventados: el recuadro «mínima prevista» muestra el clima de hoy.)',
  ['helada', 'granizo', 'viento'].map((k) => tarjeta({ imagenes: cat[`aviso-${k}`].imagenes, titulo: `Aviso de ${k}`, medida: V, p: porId(`aviso-${k}`) })).join(''));
catalogoHtml += bloque('farmacia', 'Farmacia de turno', 'Cruz verde que late, una ficha por farmacia (hasta 3) y la franja «De turno hasta mañana a las 8:30».',
  tarjeta({ imagenes: cat.farmacia.imagenes, titulo: 'Farmacia de turno (1 farmacia, dato real de hoy)', medida: V, p: porId('farmacia'), extra: redesDe(porId('farmacia')) }) + tarjeta({ imagenes: cat['farmacia-3'].imagenes, titulo: 'Con 3 farmacias (datos de ejemplo)', medida: V }));
catalogoHtml += bloque('efemeride', 'Un día como hoy: 7 estilos por tipo de hecho', 'El estilo cambia según el tema (`tipoDeEfemeride`): patria, historia, deporte, cultura, campo, Balcarce y ciencia. Ejemplos tomados de `efemerides-piezas.json`.',
  tarjeta({ imagenes: cat.efemerides.imagenes, titulo: 'Efeméride', medida: V, p: porId('efemeride'), ancho: 'ancha', extra: redesDe(porId('efemeride')) }));
catalogoHtml += bloque('feriado', 'El feriado: 5 estilos', 'Hoja de calendario que pasa de un día al otro, nombre y un dato histórico verificado. Sólo sale si hay feriado y datos.',
  tarjeta({ imagenes: cat.feriados.imagenes, titulo: 'Feriado (trasladable · decreto · religioso · patrio · carnaval)', medida: V, p: porId('feriado'), ancho: 'ancha' }));
catalogoHtml += bloque('participa', 'Participá: 4 variantes en la tabla + «encuesta» sin día', 'Pregunta grande, franja verde de WhatsApp con el número, mail y dos pies. Lunes noticias, martes evento, miércoles reclamo, viernes nota.',
  tarjeta({ imagenes: cat.participa.imagenes, titulo: 'Participá (noticia · evento · reclamo · nota · encuesta)', medida: V, p: porId('participa-noticias'), ancho: 'ancha' }));
catalogoHtml += bloque('repaso', 'Los tres repasos (mañana, tarde, noche)', 'Lista de 3 titulares (al menos uno de Balcarce) con la noticia que se lee resaltada y el cierre con la lista entera. Se muestra la noticia 1 resaltada y el cierre.',
  [['manana', 'noticia1'], ['tarde', 'noticia2'], ['noche', 'podcast']].map(([m, id]) => tarjeta({ imagenes: cat[`repaso-${m}`].imagenes, titulo: porId(id).nombre, medida: V, p: porId(id), extra: redesDe(porId(id)) })).join(''));
catalogoHtml += bloque('servicio', 'Teléfonos útiles y agenda del fin de semana', 'Útiles: sábados 17:00, dos pantallas. Agenda: jueves 12:00 (hoy PAUSADA; los eventos del ejemplo son inventados).',
  tarjeta({ imagenes: cat.utiles.imagenes, titulo: 'Teléfonos útiles', medida: V, p: porId('utiles'), extra: redesDe(porId('utiles')) }) + tarjeta({ imagenes: cat.agenda.imagenes, titulo: 'Qué hacer este fin de semana', medida: V, p: porId('agenda') }));
catalogoHtml += bloque('notas-video', 'Notas en video: nota de Balcarce, nota propia e historia de nota', 'Armadores listos pero SIN fila en la tabla del día: se disparan por nota (ver «Lo que falta»). Nota propia: «Por Hernán Accomo», con la sección que le toca. Historia: 6 s sin voz, «Link en la bio».',
  tarjeta({ imagenes: cat['nota-reel'].imagenes, titulo: 'Nota de Balcarce (reel, 25 s)', medida: V }) + tarjeta({ imagenes: cat['nota-propia'].imagenes, titulo: 'Nota propia (reel, 14 a 30 s según fotos)', medida: V })
  + tarjeta({ imagenes: cat['historia-nota'].imagenes, titulo: 'Historia de una nota (6 s, sin voz)', medida: V }));
catalogoHtml += bloque('posteo', 'Posteo de feed 4:5 por sección (los colores de COLOR_SECCION)', 'Foto entera, rótulo de sección en su color, titular, bajada y firma. La misma imagen va a Facebook, Instagram y X.',
  tarjeta({ imagenes: cat.posteos.imagenes, titulo: 'Posteo de nota', medida: FORMATO.imagen, ancho: 'ancha' }));
catalogoHtml += bloque('enlace', 'Imagen de enlace (tarjeta)', 'Pensada para X, Threads y Bluesky. Hoy X usa la placa 4:5 y Bluesky esta tarjeta; Threads usa texto con tarjeta propia.',
  tarjeta({ imagenes: cat.enlace.imagenes, titulo: 'Tarjeta de enlace', medida: '1080×565 (1,91:1)' }));
catalogoHtml += bloque('carruseles', 'Carruseles: de una nota propia, la semana y el finde', 'Facebook: álbum. Instagram: carrusel (hasta 10). Sin voz. La nota propia sale al publicarse la nota (3 fotos o más); la semana, domingos 11:00; el finde, jueves 18:00 (pausado).',
  tarjeta({ imagenes: cat['carrusel-nota'].imagenes, titulo: 'Las fotos de la nota', medida: FORMATO.carrusel, p: porId('carrusel-nota'), extra: redesDe(porId('carrusel-nota')) })
  + tarjeta({ imagenes: cat['carrusel-semana'].imagenes, titulo: 'La semana en Balcarce', medida: FORMATO.carrusel, p: porId('carrusel-semana'), ancho: 'ancha', extra: redesDe(porId('carrusel-semana')) })
  + tarjeta({ imagenes: cat['carrusel-finde'].imagenes, titulo: 'El finde en Balcarce', medida: FORMATO.carrusel, p: porId('carrusel-finde'), extra: redesDe(porId('carrusel-finde')) }));

// ------------------------------------------------------------------ horario
const filas = [...PIEZAS_DEL_DIA].sort((a, b) => a.hora.localeCompare(b.hora)).map((p) => `<tr><td>${p.hora}</td><td>${finDe(p)}</td><td>${esc(p.nombre)}${p.pausada ? ' <em>(pausada)</em>' : ''}${p.condicional ? ' <small>(si hay datos)</small>' : ''}</td><td>${p.formato}</td><td>${diasDe(p)}</td><td>${p.sinVoz ? '—' : p.voz}</td></tr>`).join('');

// ------------------------------------------------------------------ matriz por red
const celda = (p, red) => {
  const a = accionesDe(p);
  if (red === 'facebook' || red === 'instagram') return a.filter((x) => x.red === red).map((x) => x.tipo.toLowerCase()).join(' + ');
  if (['tiktok', 'youtube', 'x'].includes(red)) return p.formato === 'carrusel' ? '<span class="no">no</span>' : (red === 'youtube' && redesDeBuffer(p).indexOf('youtube') < 0 ? 'tope' : 'video');
  return '<span class="no">no</span>';
};
const REDES = ['facebook', 'instagram', 'tiktok', 'youtube', 'x', 'bluesky', 'threads'];
const matriz = `<table class="mx"><thead><tr><th>Pieza</th>${REDES.map((r) => `<th>${r}</th>`).join('')}</tr></thead><tbody>${PIEZAS_DEL_DIA.map((p) => `<tr><td>${esc(p.nombre)}</td>${REDES.map((r) => `<td>${celda(p, r)}</td>`).join('')}</tr>`).join('')}
<tr class="nota"><td>Posteo de una nota (≤ 10/día, 8:00–22:00)</td><td>placa 4:5 + texto</td><td>espejo (Balcarce)</td><td><span class="no">no</span></td><td><span class="no">no</span></td><td>placa 4:5, sin enlace</td><td>tarjeta 1080×565 + enlace</td><td>texto + enlace (sin imagen propia)</td></tr></tbody></table>`;

// ------------------------------------------------------------------ mockups de teléfono por red
const tel = (cuerpo, marca) => `<div class="tel"><div class="barra">${marca}</div>${cuerpo}</div>`;
const post = (nombre, imagen, texto, pie = '') => `<div class="post"><div class="cab"><i></i><b>${nombre}</b></div>${imagen}<pre>${esc(texto)}</pre>${pie}</div>`;
const lam = (arr, i) => img(arr[i].src, 'lámina');
const posteoImg = img(cat.posteos.imagenes[0].src, 'posteo');
const reelImg = (k, i = 0) => img(cat[k].imagenes[i].src, k);

const REDES_HTML = {
  facebook: `<div class="grupo">
    ${tel(post('Radar Balcarce', posteoImg, textoFacebook(nota)), 'Facebook · posteo con placa 4:5')}
    ${tel(post('Radar Balcarce', reelImg('clima-manana'), pieClima('facebook')), 'Facebook · reel 9:16 (el clima)')}
    ${tel(post('Radar Balcarce', reelImg('repaso-tarde', 0), pieRepaso('facebook')), 'Facebook · reel (repaso, con enlace por noticia)')}
    ${tel(`<div class="story">${reelImg('farmacia')}</div>`, 'Facebook · historia (el mismo mp4, hasta 58 s)')}
    ${tel(`<div class="album">${cat['carrusel-semana'].imagenes.slice(0, 4).map((i) => img(i.src, 'lámina')).join('')}</div><pre>La semana en Balcarce\n\n1. …\n\nTodo en radarbalcarce.com: https://radarbalcarce.com/?utm_source=facebook…\n\n#Balcarce #RadarBalcarce #LaSemana</pre>`, 'Facebook · álbum (carruseles)')}
  </div>`,
  instagram: `<div class="grupo">
    ${tel(post('radarbalcarce', posteoImg, textoInstagram(nota)), 'Instagram · espejo del posteo de Balcarce (sin enlace)')}
    ${tel(post('radarbalcarce', reelImg('repaso-tarde', 0), pieRepaso('instagram')), 'Instagram · reel (repaso: sólo títulos)')}
    ${tel(`<div class="story">${reelImg('clima-manana')}</div>`, 'Instagram · historia (clima, farmacia, repasos, etc.)')}
    ${tel(`<div class="album">${cat['carrusel-nota'].imagenes.map((i) => img(i.src, 'lámina')).join('')}</div><pre>Carrusel hasta 10 láminas. «La nota completa: link en la bio.»</pre>`, 'Instagram · carrusel')}
  </div>`,
  tiktok: `<div class="grupo">
    ${tel(post('radarbalcarce', reelImg('clima-manana'), textoParaBuffer({ guion: guionClima, aviso: cat['clima-manana'].aviso }, itemClima, 'tiktok')), 'TikTok · el mismo reel, «link en la bio» (hasta 5 hashtags, marcado «contenido con IA»)')}
    ${tel(post('radarbalcarce', reelImg('repaso-tarde', 0), textoParaBuffer({ guion: guionRepaso, aviso: cat['repaso-tarde'].aviso }, itemRepaso, 'tiktok')), 'TikTok · repaso')}
  </div><p class="chico">Reciben todo el video (clima, farmacia, útiles, avisos…), sin carruseles ni modo foto.</p>`,
  youtube: `<div class="grupo">
    ${tel(post('Radar Balcarce', reelImg('clima-manana'), textoParaBuffer({ guion: guionClima, aviso: cat['clima-manana'].aviso }, itemClima, 'youtube')), `YouTube Shorts · descripción con la dirección del sitio (tope ${TOPE_YOUTUBE_POR_DIA}/día)`)}
    ${tel(post('Radar Balcarce', reelImg('repaso-tarde', 0), textoParaBuffer({ guion: guionRepaso, aviso: cat['repaso-tarde'].aviso }, itemRepaso, 'youtube')), 'YouTube Shorts · repaso con enlaces por noticia')}
  </div>`,
  x: `<div class="grupo">
    ${tel(post('Radar Balcarce @radarbalcarce', posteoImg, textoDeX(nota)), 'X · placa 4:5 + titular + hashtags (sin enlace por defecto)')}
    ${tel(post('Radar Balcarce @radarbalcarce', reelImg('repaso-tarde', 0), textoParaBuffer({ guion: guionRepaso, aviso: cat['repaso-tarde'].aviso }, itemRepaso, 'twitter')), 'X · video por Buffer (repaso: 3 titulares, hasta 270 caracteres)')}
  </div>`,
  bluesky: `<div class="grupo">${tel(post('Radar Balcarce @radarbalcarce.bsky.social', img(cat.enlace.imagenes[0].src, 'tarjeta'), textoDeBluesky(nota)), 'Bluesky · enlace con tarjeta 1080×565 (hasta 300 grafemas)')}</div><p class="chico">Sin video ni piezas de servicio. Hernán todavía tiene que crear la cuenta.</p>`,
  threads: `<div class="grupo">${tel(post('radarbalcarce', '<div class="tarj">tarjeta de enlace que arma Threads con la foto de la nota</div>', textoDeThreads(nota)), 'Threads · texto + enlace tocable (hasta 500, una sola etiqueta)')}</div><p class="chico">La API no deja imagen propia junto a la tarjeta de enlace. Falta el permiso/programa.</p>`,
};
const NOMBRES = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube Shorts', x: 'X', bluesky: 'Bluesky', threads: 'Threads' };
const porRed = REDES.map((r) => `<section class="red" id="red-${r}"><h3>${NOMBRES[r]}</h3>${REDES_HTML[r]}</section>`).join('');

// ------------------------------------------------------------------ lo que falta
const FALTA = [
  ['Carruseles sólo en Facebook e Instagram', '`redesDeBuffer` y `enlaces.mjs` sólo mandan video o nota. «La semana», «El finde» y «Las fotos de la nota» no tienen versión para TikTok (modo foto), X (hasta 4 imágenes), Threads (hasta 10) ni Bluesky (hasta 4), aunque Hernán pidió «todo el material en todas las redes».'],
  ['Bluesky y Threads no reciben nada de servicio', 'Sólo reciben enlaces a notas (3 por corrida). Clima, farmacia, efeméride, feriado, repasos y avisos no tienen versión de imagen/texto para ellas, ni para X salvo el video por Buffer. Falta una «tarjeta de servicio» 1080×565 o 4:5 estática (clima, farmacia, efeméride).'],
  ['Efeméride, feriado, clima, farmacia y útiles son sólo video vertical', 'No hay versión 4:5 para el feed de Facebook/Instagram ni para carrusel: un posteo de feed con el clima del día o la farmacia de turno ocuparía los huecos de la tarde y permitiría reciclar el diseño existente.'],
  ['Hay armadores sin fila en la tabla del día', 'Nota de Balcarce en reel, nota propia en reel e historia de una nota existen en `armadores.mjs` pero no figuran en `PIEZAS_DEL_DIA` (sin hora, sin prioridad de voz, sin hashtag). Hay que definir quién las dispara y cuándo.'],
  ['Participá «encuesta» no tiene día', 'La variante «¿Qué querés que contemos?» está dibujada pero ninguna fila de la tabla la usa; sábado y domingo no tienen Participá y el jueves a las 12:00 no sale nada porque la agenda está pausada.'],
  ['Agenda y finde pausados', '`agenda` y `carrusel-finde` están con `pausada: true` hasta tener los eventos al día: el jueves queda sin pieza de mediodía ni de tarde.'],
  ['Un solo diseño de posteo para todas las secciones', 'Las 11 secciones sólo cambian el color del rótulo. No hay variante sin foto (el posteo «sin foto no va»), ni versión «dato/cifra», ni cita, ni urgente. En la muestra faltan Policiales, Educación y Ciencia (hoy no hay nota con foto en esas secciones; sus colores existen en COLOR_SECCION).'],
  ['Agujero horario', 'Entre las 10:00 y las 15:00 y entre las 15:00 y las 19:00 sólo salen Participá (4 días) y los útiles (sábado 17:00); a las 7:00 se juntan clima y los tres avisos, y de 19:00 a 21:00 hay tres piezas con voz. Se podrían repartir los reels de servicio.'],
  ['Crédito doble en las láminas', 'En el carrusel de la semana la lámina muestra «Foto: Foto: Diario La Vanguardia»: el crédito de `portada.json` ya trae «Foto:» y la lámina lo vuelve a anteponer (`lineaDeCredito` sí lo evita en el texto).'],
  ['Inconsistencia en el ejemplo de avisos', 'El aviso de helada muestra abajo «mínima prevista 11°» (el clima de hoy) mientras el texto dice −3°: el recuadro no sale del aviso sino del día. Conviene que la escena use la mínima del aviso.'],
  ['Canal de Telegram sin programa', 'No hay armador ni fila para el canal: podría reusar el mismo mp4 y los textos de Facebook (clima y farmacia fijados).'],
  ['Lo que este mockup no muestra', 'Los subtítulos con la palabra resaltada, la barra roja de avance, el audio y la animación (se ve un cuadro quieto por escena); en ejemplos de feriados, efemérides y agenda se usaron datos reales o de ejemplo según se indica. Las historias de Instagram/Facebook son el mismo mp4 que el reel (no hay diseño propio de historia salvo la historia de nota).'],
];

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mockup de las redes de Radar Balcarce</title>
<style>
:root{--papel:#FAF8F3;--tinta:#14161A;--gris:#474C55;--linea:#D9D4C7;--rojo:#C7381C;--card:#fff}
*{box-sizing:border-box}body{margin:0;background:var(--papel);color:var(--tinta);font:15px/1.5 Inter,system-ui,Segoe UI,Arial,sans-serif}
header{padding:32px 24px 8px;max-width:1280px;margin:auto}h1{font:900 34px/1.1 'Source Serif 4',Georgia,serif;margin:0 0 6px}h1 b{color:var(--rojo)}
h2{font:900 26px/1.2 'Source Serif 4',Georgia,serif;margin:44px 0 8px;border-top:3px solid var(--tinta);padding-top:14px}h3{font:700 20px 'Source Serif 4',Georgia,serif;margin:0 0 4px}
main{max-width:1280px;margin:auto;padding:0 24px 60px}nav{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}nav a{padding:4px 10px;border:1px solid var(--linea);border-radius:99px;text-decoration:none;color:var(--tinta);background:var(--card);font-size:13px}
.baj,.chico{color:var(--gris);margin:0 0 12px;max-width:900px}.bloque{margin:28px 0}.fila{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start}
.card{margin:0;background:var(--card);border:1px solid var(--linea);border-radius:14px;padding:10px;max-width:100%}.thumbs{display:flex;flex-wrap:wrap;gap:8px}.th{display:flex;flex-direction:column;align-items:center;font-size:11px;color:var(--gris)}
.th img{width:150px;height:auto;border-radius:8px;border:1px solid var(--linea);display:block}.card.ancha .th img{width:128px}.card.ancha{flex:1 1 100%}.card:not(.ancha) .th img{width:190px}
figcaption{font-size:13px;margin-top:8px;max-width:520px}.med{color:var(--gris)}.hor{color:var(--rojo);font-weight:600}.red{color:var(--gris)}
.sw{display:inline-block;color:#fff;padding:6px 10px;border-radius:8px;margin:3px;font-weight:700;font-size:13px}.sw small{display:block;font-weight:400;opacity:.85;font-size:10px}
table{border-collapse:collapse;width:100%;background:var(--card);font-size:13px}th,td{border:1px solid var(--linea);padding:5px 8px;text-align:left;vertical-align:top}th{background:#efe9da}.no{color:#b00020;font-weight:700}.nota td{background:#faf1e6}
.mx{display:block;overflow-x:auto}
.grupo{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start}.tel{width:300px;background:#fff;border:8px solid #1b1b1b;border-radius:28px;overflow:hidden}.barra{background:#1b1b1b;color:#fff;font-size:11px;padding:2px 10px 6px;text-align:center}
.post{padding:0 0 8px}.cab{display:flex;gap:8px;align-items:center;padding:8px 10px;font-size:13px}.cab i{width:26px;height:26px;border-radius:50%;background:var(--rojo);display:block}.post img{width:100%;display:block}
pre{white-space:pre-wrap;word-break:break-word;font:12px/1.4 Inter,system-ui,sans-serif;margin:8px 10px;color:#222}.story{background:#000}.story img{width:100%;display:block}.album{display:grid;grid-template-columns:1fr 1fr;gap:2px}.album img{width:100%}
.tarj{background:#e8e8e8;color:#555;padding:40px 12px;text-align:center;font-size:12px}
.falta li{margin:10px 0}.falta b{display:block}code{background:#efe9da;padding:0 4px;border-radius:4px}
@media (prefers-color-scheme:dark){:root{--papel:#14161A;--tinta:#FAF8F3;--gris:#b9bec6;--linea:#3a3f47;--card:#1d2026}th{background:#2a2e36}code{background:#2a2e36}.nota td{background:#2b2620}}
</style></head><body>
<header><h1>Radar <b>Balcarce</b> · las redes en un solo lugar</h1>
<p class="baj">Mockup generado el 5/11/2026 con las funciones reales de <code>v3/redes/piezas/</code> (armadores + escenas + resvg), los horarios de <code>piezas-del-dia.mjs</code> y los textos reales de cada red. Cada imagen es un cuadro de la pieza (los videos se ven quietos, sin subtítulos ni barra de avance). No publica nada.</p>
<nav><a href="#horario">Horario del día</a><a href="#matriz">Qué sale en cada red</a><a href="#catalogo">Catálogo por pieza</a><a href="#redes">Por red</a>${REDES.map((r) => `<a href="#red-${r}">${NOMBRES[r]}</a>`).join('')}<a href="#falta">Lo que falta o se podría mejorar</a></nav></header>
<main>
<h2 id="colores">Colores por sección y tipografía</h2><p class="baj">Source Serif 4 (titulares) e Inter (resto); logo escrito «Radar <span style="color:var(--rojo)">Balcarce</span>» en la firma de cada placa; fondo papel #FAF8F3, tinta #14161A, rojo de marca #C7381C.</p><div>${paleta}</div>
<h2 id="horario">A qué hora sale cada pieza (hora de Balcarce)</h2><table><thead><tr><th>Desde</th><th>Hasta (ventana)</th><th>Pieza</th><th>Formato</th><th>Días</th><th>Prioridad de voz</th></tr></thead><tbody>${filas}</tbody></table>
<p class="chico">Además: posteos de notas cada 15 minutos entre 8:00 y 22:00 (mínimo 90 minutos entre uno y otro, hasta 10 por día).</p>
<h2 id="matriz">Qué recibe cada red</h2>${matriz}
<h2 id="catalogo">Catálogo por pieza y estilo</h2>${catalogoHtml}
<h2 id="redes">Cada red, con su texto real</h2><p class="baj">Los textos salen de las funciones reales (<code>textoFacebook</code>, <code>textoInstagram</code>, <code>textoDeX</code>, <code>textoDeBluesky</code>, <code>textoDeThreads</code>, <code>textoDePieza</code>, <code>textoParaBuffer</code>) con una nota de Balcarce de hoy.</p>${porRed}
<h2 id="falta">Lo que falta o se podría mejorar</h2><ol class="falta">${FALTA.map(([t, d]) => `<li><b>${esc(t)}</b>${esc(d).replace(/`([^`]+)`/g, '<code>$1</code>')}</li>`).join('')}</ol>
</main></body></html>`;
fs.writeFileSync(path.join(AQUI, '..', 'mockup-redes.html'), html);
console.log('docs/3-0/mockup-redes.html', Math.round(html.length / 1024), 'KB');
