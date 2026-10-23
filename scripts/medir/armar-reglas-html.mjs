// Arma docs/REGLAS-Y-PROMPTS.html: todos los textos y listas que deciden qué entra, cómo se escribe cada nota y cómo salen las fotos y las redes,
// leídos de los archivos reales del proyecto (así no se desactualiza). Se corre a mano: node scripts/medir/armar-reglas-html.mjs
import fs from 'node:fs';
import path from 'node:path';
import { REGLAS_SEMAFORO, AMARILLO_SOLO_EN_EL_PRINCIPIO } from '../../ingesta/fuentes.mjs';
import { POPULARIDAD, AREAS_CHICAS } from '../../ingesta/criterio.mjs';
import { PROMPT_DE_HERNAN, TONOS, AGREGADO, NEGATIVO, armarInstruccion } from '../../web/scripts/ilustrar-notas.mjs';

const RAIZ = path.resolve(import.meta.dirname, '../..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8').replace(/\r\n/g, '\n');
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const entre = (t, a, b) => { const i = t.indexOf(a); const j = t.indexOf(b, i + a.length); return i >= 0 && j > i ? t.slice(i + a.length, j).trim() : ''; };

const criterio = leer('CRITERIO-EDITORIAL.md');
const lectura = leer('ingesta/lectura-ia.mjs');
const reglasDeLaIA = entre(criterio, '<!-- PROMPT:REGLAS:INICIO -->', '<!-- PROMPT:REGLAS:FIN -->');
const tonoAmeno = entre(criterio, '<!-- PROMPT:TONO_AMENO:INICIO -->', '<!-- PROMPT:TONO_AMENO:FIN -->');
const tonoSerio = entre(criterio, '<!-- PROMPT:TONO_SERIO:INICIO -->', '<!-- PROMPT:TONO_SERIO:FIN -->');
const instruccionLectura = (lectura.match(/const INSTRUCCION = `([\s\S]*?)`;\n/) ?? [])[1] ?? '';
const instruccionFoto = armarInstruccion({ titulo: '(el título de la nota)', seccion: 'Balcarce', cuerpo: '(el texto de la nota)' }, 'neutro');

const bloque = (titulo, donde, texto, abierto = false) => `<details${abierto ? ' open' : ''}><summary>${esc(titulo)}</summary><p class="donde">${donde}</p><pre>${esc(texto)}</pre></details>`;
const lista = (xs) => (xs ?? []).join(' · ');

const otras = Object.entries(REGLAS_SEMAFORO)
  .filter(([k]) => !['rojo', 'amarillo', 'amarilloMuerte', 'nunca'].includes(k))
  .map(([k, v]) => `${k}:\n  ${Array.isArray(v) ? lista(v) : JSON.stringify(v)}`)
  .join('\n\n');

const secciones = [
  ['1. Qué decide si una nota entra', [
    bloque('Los números: cuántos medios hacen falta', '<code>ingesta/criterio.mjs</code> (POPULARIDAD, AREAS_CHICAS) y las variables de GitHub <code>MINIMO_NACIONAL</code> y <code>MINIMO_AREAS_CHICAS</code>', `POPULARIDAD = ${JSON.stringify(POPULARIDAD, null, 2)}\nAREAS_CHICAS = ${JSON.stringify(AREAS_CHICAS)}`, true),
    bloque('Lista roja: no sale sola (lo sensible de verdad)', '<code>ingesta/fuentes.mjs</code>, REGLAS_SEMAFORO.rojo. No se toca sin preguntar.', lista(REGLAS_SEMAFORO.rojo)),
    bloque('Lo que no se publica nunca (sepelios y avisos fúnebres)', '<code>ingesta/fuentes.mjs</code>, REGLAS_SEMAFORO.nunca', lista(REGLAS_SEMAFORO.nunca)),
    bloque('Lista amarilla: espera a una persona (desde el 22/10 NO frena a lo de Balcarce; sí a lo de afuera)', '<code>ingesta/fuentes.mjs</code>, REGLAS_SEMAFORO.amarillo y amarilloMuerte', `${lista(REGLAS_SEMAFORO.amarillo)}\n\nSolo en el principio del texto: ${lista(AMARILLO_SOLO_EN_EL_PRINCIPIO)}\n\nPalabras de muerte (solo donde puede ser alguien de acá): ${lista(REGLAS_SEMAFORO.amarilloMuerte)}`),
    bloque('Otras listas del semáforo (dólar, internacional, promoción…)', '<code>ingesta/fuentes.mjs</code>', otras),
    bloque('La instrucción de la IA que lee y clasifica cada nota (sección, impacto, publicidad, chimento)', '<code>ingesta/lectura-ia.mjs</code> (INSTRUCCION) y <code>ingesta/perfil-balcarce.md</code>', `${instruccionLectura}\n\n--- Perfil de Balcarce que recibe ---\n${leer('ingesta/perfil-balcarce.md')}`),
  ]],
  ['2. Cómo se escribe una nota', [
    bloque('Las 14 reglas fijas de la IA (lo que lee tal cual antes de cada noticia)', '<code>CRITERIO-EDITORIAL.md</code>, sección 12 (las marcas de comentario no se borran)', reglasDeLaIA, true),
    bloque('Tono de todos los días', '<code>CRITERIO-EDITORIAL.md</code>, sección 12', tonoAmeno),
    bloque('Tono serio (Policiales y temas graves)', '<code>CRITERIO-EDITORIAL.md</code>, sección 12', tonoSerio),
    bloque('El criterio editorial completo (qué entra, secciones, fotos, verificación, firma, redes)', '<code>CRITERIO-EDITORIAL.md</code>', criterio),
  ]],
  ['3. Fotos con IA', [
    bloque('El pedido de fotos (con lo de «desgaste» ya sacado)', '<code>web/scripts/ilustrar-notas.mjs</code> (PROMPT_DE_HERNAN)', PROMPT_DE_HERNAN),
    bloque('Lo que Gemini recibe para escribir el prompt de cada imagen', '<code>web/scripts/ilustrar-notas.mjs</code> (armarInstruccion)', instruccionFoto, true),
    bloque('Los tres tonos de luz y color, y lo que se le suma a todo prompt', '<code>web/scripts/ilustrar-notas.mjs</code> (TONOS, AGREGADO, NEGATIVO)', `${JSON.stringify(TONOS, null, 2)}\n\nAGREGADO: ${AGREGADO}\nNEGATIVO: ${NEGATIVO}`),
  ]],
  ['4. Redes sociales', [
    bloque('El criterio de redes: voces, guiones, horarios, colores, hashtags', '<code>CRITERIO-REDES.md</code>', leer('CRITERIO-REDES.md')),
    bloque('Formatos por red', '<code>docs/redes/FORMATOS-POR-RED.md</code>', leer('docs/redes/FORMATOS-POR-RED.md')),
  ]],
];

const html = `<title>Reglas y prompts de Radar Balcarce</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
:root { --papel:#f7f8fa; --tinta:#12161c; --texto:#343b46; --suave:#667080; --linea:#dde1e8; --panel:#fff; --marca:#1e40af; --marca-suave:#e4eafb;
  --f-titulo:"Source Serif 4", Georgia, serif; --f-texto:system-ui, -apple-system, "Segoe UI", sans-serif; --f-dato:ui-monospace, Consolas, monospace }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --papel:#0f1217; --tinta:#eef1f6; --texto:#c9d0db; --suave:#98a2b3; --linea:#2a313c; --panel:#171c24; --marca:#8aa4f5; --marca-suave:#1c2744; color-scheme: dark } }
:root[data-theme="dark"] { --papel:#0f1217; --tinta:#eef1f6; --texto:#c9d0db; --suave:#98a2b3; --linea:#2a313c; --panel:#171c24; --marca:#8aa4f5; --marca-suave:#1c2744; color-scheme: dark }
* { box-sizing:border-box }
body { background:var(--papel); color:var(--texto); font:16px/1.55 var(--f-texto); padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)); padding-block:0 56px }
main { max-width:46rem; margin:0 auto } header { padding-block:34px 6px }
h1, h2 { font-family:var(--f-titulo); color:var(--tinta); line-height:1.15; text-wrap:balance; margin:0 }
h1 { font-size:clamp(1.8rem, 5.5vw, 2.5rem) } h2 { font-size:1.4rem; margin-top:38px; padding-top:14px; border-top:2px solid var(--tinta) }
.fecha { color:var(--suave); font:.8rem var(--f-dato); margin-top:.7rem }
details { background:var(--panel); border:1px solid var(--linea); margin:10px 0; min-width:0 }
summary { cursor:pointer; padding:12px 14px; font-weight:600; color:var(--tinta) }
.donde { margin:0; padding:0 14px 8px; font-size:.85rem; color:var(--suave) }
pre { margin:0; padding:12px 14px; border-top:1px solid var(--linea); white-space:pre-wrap; word-break:break-word; font:.78rem/1.5 var(--f-dato); color:var(--texto); max-height:70vh; overflow:auto }
code { font:.85em var(--f-dato); background:var(--marca-suave); color:var(--tinta); padding:1px 5px }
:focus-visible { outline:2px solid var(--marca); outline-offset:2px }
</style>
<main>
<header><h1>Reglas y prompts de Radar Balcarce</h1><p>Todo lo que decide qué entra, cómo se escribe una nota, cómo salen las fotos y las redes. Cada bloque dice en qué archivo vive. Tocá un título para abrirlo.</p><p class="fecha">Armado el ${new Date().toISOString().slice(0, 10)} desde los archivos reales del proyecto.</p></header>
${secciones.map(([t, bs]) => `<h2>${esc(t)}</h2>\n${bs.join('\n')}`).join('\n')}
</main>
`;
fs.writeFileSync(path.join(RAIZ, 'docs/REGLAS-Y-PROMPTS.html'), html);
console.log(`docs/REGLAS-Y-PROMPTS.html: ${html.length} caracteres`);
