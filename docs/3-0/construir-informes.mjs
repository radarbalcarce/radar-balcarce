// Arma docs/3-0/INFORMES-05-11.html: un solo archivo, autocontenido (CSS adentro, sin JS ni imágenes de afuera),
// pensado para leer en el celular, con todos los informes de docs/3-0/auditoria-05-11/ más el resumen y la lista de mejoras.
//
// Uso:  node docs/3-0/construir-informes.mjs          (arma el HTML y lo verifica)
// No tiene dependencias: Node puro. El conversor de markdown (mdAHtml) es simple pero escapa todo el HTML.
// Prueba: node --test docs/3-0/construir-informes.test.mjs

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function escapar(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function slug(t) {
  const s = String(t)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'seccion';
}

function hrefSeguro(url) {
  const u = url.trim();
  if (/^(https?:\/\/|mailto:|#|\/|\.\.?\/)/i.test(u)) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return null; // javascript:, data:, etc.
  return u; // ruta relativa simple
}

// Inline: código, enlaces, negritas, itálicas. Todo el texto se escapa.
export function inline(texto, opciones = {}) {
  const guardados = [];
  const guardar = (html) => { guardados.push(html); return '\u0000' + (guardados.length - 1) + '\u0000'; };

  // 1) código en línea (el contenido sólo se escapa)
  let t = String(texto).replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_m, _c, cont) => guardar('<code>' + escapar(cont.trim()) + '</code>'));
  // 2) enlaces [texto](url) y autoenlaces <https://...>; el texto del enlace se procesa aparte
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_m, txt, url) => {
    let href = hrefSeguro(url.replace(/\u0000(\d+)\u0000/g, (_x, i) => guardados[i].replace(/<\/?code>/g, '').replace(/&amp;/g, '&')));
    const interno = opciones.enlacesInternos;
    if (href && interno) {
      const base = basename(href.split('#')[0]);
      if (/\.md$/i.test(base) && interno[base]) href = '#' + interno[base];
    }
    const cuerpo = inline(txt, { ...opciones, sinEnlaces: true });
    if (!href) return guardar(cuerpo);
    const externo = /^https?:/i.test(href);
    return guardar('<a href="' + escapar(href) + '"' + (externo ? ' rel="noopener noreferrer" target="_blank"' : '') + '>' + cuerpo + '</a>');
  });
  t = t.replace(/<(https?:\/\/[^\s<>]+)>/g, (_m, url) =>
    guardar('<a href="' + escapar(url) + '" rel="noopener noreferrer" target="_blank">' + escapar(url) + '</a>'));
  // 3) lo que queda se escapa
  t = escapar(t);
  // 4) negrita (** o __) e itálica (* o _), sin pegarse a espacios
  t = t.replace(/\*\*(?!\s)([\s\S]+?)(?<!\s)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^\w])__(?!\s)([\s\S]+?)(?<!\s)__(?!\w)/g, '$1<strong>$2</strong>');
  t = t.replace(/(^|[^\w*])\*(?![\s*])([^*]+?)(?<![\s*])\*(?!\w)/g, '$1<em>$2</em>');
  t = t.replace(/(^|[^\w])_(?![\s_])([^_]+?)(?<![\s_])_(?!\w)/g, '$1<em>$2</em>');
  // 5) devolver lo guardado (puede haber guardados dentro de guardados)
  let vuelta = 0;
  while (/\u0000\d+\u0000/.test(t) && vuelta++ < 5) t = t.replace(/\u0000(\d+)\u0000/g, (_m, i) => guardados[i]);
  return t;
}

function partirCeldas(linea) {
  let l = linea.trim();
  if (l.startsWith('|')) l = l.slice(1);
  if (l.endsWith('|') && !l.endsWith('\\|')) l = l.slice(0, -1);
  const celdas = [];
  let actual = '';
  let enCodigo = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (c === '`') enCodigo = !enCodigo;
    if (c === '\\' && l[i + 1] === '|') { actual += '|'; i++; continue; }
    if (c === '|' && !enCodigo) { celdas.push(actual.trim()); actual = ''; continue; }
    actual += c;
  }
  celdas.push(actual.trim());
  return celdas;
}

const RE_SEPARADOR_TABLA = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$|^\s*\|\s*:?-{1,}:?\s*\|\s*$/;
const RE_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const RE_HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const RE_TITULO = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RE_VALLA = /^\s*(```+|~~~+)\s*([\w+-]*)\s*$/;

function esInicioDeBloque(linea, siguiente) {
  return RE_TITULO.test(linea) || RE_VALLA.test(linea) || RE_HR.test(linea) || /^\s*>/.test(linea) || RE_ITEM.test(linea) ||
    (linea.includes('|') && siguiente !== undefined && RE_SEPARADOR_TABLA.test(siguiente));
}

function nivelDeSangria(espacios) { return espacios.replace(/\t/g, '    ').length; }

function renderLista(items, ctx) {
  // items: [{ sangria, ordenada, texto }]
  let pos = 0;
  function nivel(base) {
    const ordenada = items[pos].ordenada;
    let html = '<' + (ordenada ? 'ol' : 'ul') + '>';
    while (pos < items.length && items[pos].sangria >= base) {
      const it = items[pos];
      if (it.sangria > base && html.endsWith('</li>')) {
        // sangría más profunda sin padre inmediato: anidar en el último item
        html = html.slice(0, -5) + nivel(it.sangria) + '</li>';
        continue;
      }
      pos++;
      let li = '<li>' + inline(it.texto, ctx);
      if (pos < items.length && items[pos].sangria > it.sangria) li += nivel(items[pos].sangria);
      li += '</li>';
      html += li;
      if (pos < items.length && items[pos].sangria < base) break;
      if (pos < items.length && items[pos].sangria === base && items[pos].ordenada !== ordenada) break;
    }
    return html + '</' + (ordenada ? 'ol' : 'ul') + '>';
  }
  let salida = '';
  while (pos < items.length) salida += nivel(items[pos].sangria);
  return salida;
}

// Bloques. opciones.desplazar: cuánto bajar el nivel de los títulos; opciones.prefijoId: para ids únicos; opciones.titulos: arreglo donde anota los títulos.
export function mdAHtml(md, opciones = {}) {
  const lineas = String(md).replace(/\r\n?/g, '\n').split('\n');
  const desplazar = opciones.desplazar ?? 0;
  const usados = opciones.idsUsados ?? new Set();
  const salida = [];
  let i = 0;

  while (i < lineas.length) {
    const linea = lineas[i];
    if (/^\s*$/.test(linea)) { i++; continue; }

    // bloque de código
    let m = linea.match(RE_VALLA);
    if (m) {
      const marca = m[1][0];
      const largo = m[1].length;
      const cuerpo = [];
      i++;
      while (i < lineas.length) {
        const cierre = lineas[i].match(/^\s*(```+|~~~+)\s*$/);
        if (cierre && cierre[1][0] === marca && cierre[1].length >= largo) break;
        cuerpo.push(lineas[i]);
        i++;
      }
      i++; // cierre (o fin del texto)
      salida.push('<pre><code' + (m[2] ? ' class="lang-' + escapar(m[2]) + '"' : '') + '>' + escapar(cuerpo.join('\n')) + '</code></pre>');
      continue;
    }

    // título
    m = linea.match(RE_TITULO);
    if (m) {
      const nivelOriginal = m[1].length;
      const nivel = Math.min(6, nivelOriginal + desplazar);
      const base = (opciones.prefijoId ? opciones.prefijoId + '-' : '') + slug(m[2].replace(/[`*_]/g, ''));
      let id = base; let n = 2;
      while (usados.has(id)) id = base + '-' + n++;
      usados.add(id);
      if (opciones.titulos) opciones.titulos.push({ nivel: nivelOriginal, texto: m[2].replace(/[`*]/g, ''), id });
      salida.push('<h' + nivel + ' id="' + escapar(id) + '">' + inline(m[2], opciones) + '</h' + nivel + '>');
      i++;
      continue;
    }

    // línea horizontal
    if (RE_HR.test(linea)) { salida.push('<hr>'); i++; continue; }

    // cita
    if (/^\s*>/.test(linea)) {
      const cita = [];
      while (i < lineas.length && /^\s*>/.test(lineas[i])) { cita.push(lineas[i].replace(/^\s*>\s?/, '')); i++; }
      salida.push('<blockquote>' + mdAHtml(cita.join('\n'), { ...opciones, titulos: undefined, idsUsados: usados }) + '</blockquote>');
      continue;
    }

    // tabla
    if (linea.includes('|') && i + 1 < lineas.length && RE_SEPARADOR_TABLA.test(lineas[i + 1])) {
      const encabezado = partirCeldas(linea);
      const alineaciones = partirCeldas(lineas[i + 1]).map((c) => (/^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : /^:-+/.test(c) ? 'left' : ''));
      i += 2;
      const filas = [];
      while (i < lineas.length && lineas[i].includes('|') && !/^\s*$/.test(lineas[i])) { filas.push(partirCeldas(lineas[i])); i++; }
      const celda = (tag, txt, k) => '<' + tag + (alineaciones[k] ? ' style="text-align:' + alineaciones[k] + '"' : '') + '>' + inline(txt ?? '', opciones) + '</' + tag + '>';
      let t = '<div class="tabla"><table><thead><tr>' + encabezado.map((c, k) => celda('th', c, k)).join('') + '</tr></thead><tbody>';
      for (const f of filas) {
        t += '<tr>' + encabezado.map((_c, k) => celda('td', f[k], k)).join('') + '</tr>';
      }
      salida.push(t + '</tbody></table></div>');
      continue;
    }

    // lista
    if (RE_ITEM.test(linea)) {
      const items = [];
      while (i < lineas.length) {
        const l = lineas[i];
        const im = l.match(RE_ITEM);
        if (im && !RE_HR.test(l)) {
          items.push({ sangria: nivelDeSangria(im[1]), ordenada: /^\d/.test(im[2]), texto: im[3] });
          i++;
        } else if (/^\s*$/.test(l)) {
          // línea en blanco: sigue la lista sólo si lo próximo es otro item o algo sangriado
          let j = i + 1;
          while (j < lineas.length && /^\s*$/.test(lineas[j])) j++;
          if (j < lineas.length && (RE_ITEM.test(lineas[j]) && !RE_HR.test(lineas[j]) || /^\s{2,}\S/.test(lineas[j].replace(/\t/g, '    ')))) { i = j; } else break;
        } else if (/^\s+\S/.test(l.replace(/\t/g, '    ')) && !esInicioDeBloque(l, lineas[i + 1]) && items.length) {
          items[items.length - 1].texto += ' ' + l.trim(); // continuación del item
          i++;
        } else break;
      }
      salida.push(renderLista(items, opciones));
      continue;
    }

    // párrafo
    const parr = [linea.trim()];
    i++;
    while (i < lineas.length && !/^\s*$/.test(lineas[i]) && !esInicioDeBloque(lineas[i], lineas[i + 1])) { parr.push(lineas[i].trim()); i++; }
    salida.push('<p>' + inline(parr.join(' '), opciones) + '</p>');
  }
  return salida.join('\n');
}

// ---------------------------------------------------------------- verificación

const VACIAS = new Set(['meta', 'link', 'br', 'hr', 'img', 'input', 'col']);

export function verificar(html) {
  const problemas = [];
  const sinEstilo = html.replace(/<style[\s\S]*?<\/style>/g, '');
  const pila = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?>/g;
  let m;
  while ((m = re.exec(sinEstilo))) {
    const cierre = m[1] === '/';
    const nombre = m[2].toLowerCase();
    if (VACIAS.has(nombre)) continue;
    if (!cierre) { pila.push(nombre); continue; }
    const ultimo = pila.pop();
    if (ultimo !== nombre) { problemas.push('etiqueta mal cerrada: </' + nombre + '> (se esperaba </' + ultimo + '>)'); if (ultimo === undefined) break; }
  }
  if (pila.length) problemas.push('etiquetas sin cerrar: ' + pila.slice(-5).join(', '));

  // texto de markdown sin convertir: se mira sólo el texto que no es código
  const texto = sinEstilo
    .replace(/<pre[\s\S]*?<\/pre>/g, 'X')
    .replace(/<code[\s\S]*?<\/code>/g, 'X')
    .replace(/<(?:p|li|td|th|h[1-6]|blockquote)\b[^>]*>/g, '\n') // dónde empieza un bloque de texto
    .replace(/<[^>]+>/g, ' ');
  const sospechas = [
    [/\*\*[^\s*]/, 'negrita sin convertir (**)'],
    [/`/, 'comilla de código sin convertir (`)'],
    [/\]\(/, 'enlace sin convertir ](…)'],
    [/^[ \t]*#{1,6}[ \t]+\S/m, 'título sin convertir (#)'],
    [/^[ \t]*\|?[ \t]*:?-{3,}:?[ \t]*\|/m, 'tabla sin convertir (|---|)'],
    [/^[ \t]*[-*+][ \t]+\S/m, 'viñeta sin convertir'],
    [/^[ \t]*>[ \t]/m, 'cita sin convertir (>)'],
  ];
  for (const [re2, aviso] of sospechas) {
    const mm = texto.match(re2);
    if (mm) problemas.push(aviso + ': «' + mm[0].trim().slice(0, 60) + '»');
  }
  return problemas;
}

// ---------------------------------------------------------------- página

const CSS = `
:root{--fondo:#faf8f3;--tinta:#1d1d1f;--suave:#5b5b60;--linea:#d9d4c7;--acento:#0b5ea8;--caja:#fff;--codigo:#efeae0;--cita:#e9f1fa}
@media (prefers-color-scheme:dark){:root{--fondo:#121316;--tinta:#e8e6e1;--suave:#a3a19b;--linea:#34363b;--acento:#7db7f0;--caja:#1b1d21;--codigo:#25272c;--cita:#1b2733}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--fondo);color:var(--tinta);font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:0 16px 64px}
main{max-width:46rem;margin:0 auto}
h1,h2,h3,h4,h5,h6{line-height:1.25;margin:1.6em 0 .5em;scroll-margin-top:12px}
h1{font-size:1.7rem}h2{font-size:1.4rem;border-bottom:1px solid var(--linea);padding-bottom:.2em}h3{font-size:1.2rem}h4,h5,h6{font-size:1.05rem}
p,ul,ol,blockquote,pre,.tabla{margin:.8em 0}
ul,ol{padding-left:1.4em}li{margin:.25em 0}li>ul,li>ol{margin:.2em 0}
a{color:var(--acento);overflow-wrap:anywhere}
code{background:var(--codigo);padding:.1em .35em;border-radius:4px;font:.88em/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow-wrap:anywhere}
pre{background:var(--codigo);padding:12px 14px;border-radius:8px;overflow-x:auto;-webkit-overflow-scrolling:touch}
pre code{background:none;padding:0;overflow-wrap:normal;white-space:pre}
blockquote{background:var(--cita);border-left:4px solid var(--acento);padding:.2em 14px;border-radius:0 8px 8px 0}
blockquote p{margin:.5em 0}
hr{border:0;border-top:1px solid var(--linea);margin:2em 0}
.tabla{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--linea);border-radius:8px;background:var(--caja)}
table{border-collapse:collapse;font-size:.92rem;min-width:100%}
th,td{padding:8px 10px;border-bottom:1px solid var(--linea);vertical-align:top;text-align:left;min-width:7rem}
th{background:var(--codigo);position:sticky;top:0}
tr:last-child td{border-bottom:0}
.portada{padding:28px 0 8px}
.portada h1{margin:0 0 .2em}
.portada p{color:var(--suave);margin:.3em 0}
.indice{background:var(--caja);border:1px solid var(--linea);border-radius:10px;padding:6px 16px 12px;margin:16px 0 8px}
.indice h2{border:0;margin:.6em 0 .2em;font-size:1.15rem}
.indice ol{margin:.3em 0;padding-left:1.3em}
.indice li{margin:.5em 0}
.indice details{margin:.2em 0 .2em 0}
.indice summary{cursor:pointer;color:var(--suave);font-size:.92rem;padding:4px 0}
.indice details ul{font-size:.95rem;list-style:none;padding-left:.2em}
.informe{border-top:6px solid var(--acento);margin-top:48px;padding-top:4px}
.volver{font-size:.9rem;margin:24px 0 0}
`;

const PRIMEROS = ['GUIA-QUE-HACER.md', 'RESUMEN-Y-PENDIENTES-05-11.md', 'LISTA-DE-MEJORAS-05-11.md'];

export function armarPagina(documentos, fecha) {
  const ids = {};
  for (const d of documentos) ids[d.archivo] = 'doc-' + slug(d.archivo.replace(/\.md$/i, ''));
  const usados = new Set(Object.values(ids));
  const secciones = [];
  const indice = [];
  for (const d of documentos) {
    const titulos = [];
    const id = ids[d.archivo];
    const cuerpo = mdAHtml(d.texto, { desplazar: 1, prefijoId: id, idsUsados: usados, titulos, enlacesInternos: ids });
    const principal = titulos.find((t) => t.nivel === 1);
    const nombre = principal ? principal.texto : d.archivo;
    const subtitulos = titulos.filter((t) => t.nivel === 2);
    indice.push({ id, nombre, archivo: d.archivo, subtitulos, tituloId: principal ? principal.id : id });
    secciones.push('<section class="informe" id="' + id + '">\n' + cuerpo + '\n<p class="volver"><a href="#indice">↑ Volver al índice</a></p>\n</section>');
  }
  let idx = '<nav class="indice" id="indice" aria-label="Índice"><h2>Índice</h2><ol>';
  for (const it of indice) {
    idx += '<li><a href="#' + escapar(it.tituloId) + '">' + escapar(it.nombre) + '</a><br><small>' + escapar(it.archivo) + '</small>';
    if (it.subtitulos.length) {
      idx += '<details><summary>Secciones (' + it.subtitulos.length + ')</summary><ul>' +
        it.subtitulos.map((s) => '<li><a href="#' + escapar(s.id) + '">' + escapar(s.texto) + '</a></li>').join('') + '</ul></details>';
    }
    idx += '</li>';
  }
  idx += '</ol></nav>';
  return '<!doctype html>\n<html lang="es-AR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<meta name="color-scheme" content="light dark">\n<meta name="robots" content="noindex">\n<title>Informes de Radar Balcarce, 5 de noviembre</title>\n<style>' + CSS + '</style>\n</head>\n<body>\n<main>\n' +
    '<header class="portada"><h1>Informes de Radar Balcarce</h1><p>Auditoría del 5/11/2026. Para Hernán y Andrés.</p><p>Armado el ' + escapar(fecha) + ' con <code>docs/3-0/construir-informes.mjs</code>. Empezá por la primera: qué hay que hacer a mano.</p></header>\n' +
    idx + '\n' + secciones.join('\n') + '\n</main>\n</body>\n</html>\n';
}

function listarDocumentos(carpeta3) {
  const carpetaAud = join(carpeta3, 'auditoria-05-11');
  const archivos = [
    ...readdirSync(carpetaAud).filter((f) => f.toLowerCase().endsWith('.md')).map((f) => ({ ruta: join(carpetaAud, f), archivo: f })),
    ...['RESUMEN-Y-PENDIENTES-05-11.md', 'LISTA-DE-MEJORAS-05-11.md'].map((f) => ({ ruta: join(carpeta3, f), archivo: f })),
  ];
  const peso = (a) => { const k = PRIMEROS.indexOf(a); return k === -1 ? 99 : k; };
  archivos.sort((a, b) => peso(a.archivo) - peso(b.archivo) || a.archivo.localeCompare(b.archivo));
  return archivos.map((a) => ({ archivo: a.archivo, texto: readFileSync(a.ruta, 'utf8') }));
}

function principal() {
  const carpeta3 = dirname(fileURLToPath(import.meta.url));
  const documentos = listarDocumentos(carpeta3);
  const fecha = new Date().toISOString().slice(0, 10);
  const html = armarPagina(documentos, fecha);
  const destino = join(carpeta3, 'INFORMES-05-11.html');
  writeFileSync(destino, html, 'utf8');
  const problemas = verificar(html);
  console.log('Documentos: ' + documentos.map((d) => d.archivo).join(', '));
  console.log('Escrito: ' + destino + ' (' + Math.round(html.length / 1024) + ' KB)');
  if (problemas.length) {
    console.log('PROBLEMAS (' + problemas.length + '):');
    for (const p of problemas) console.log(' - ' + p);
    process.exitCode = 1;
  } else {
    console.log('Verificación: sin etiquetas sin cerrar ni markdown sin convertir.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) principal();
