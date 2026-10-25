// Muestras de un repaso de verdad (24/10/2026, regla 325): los cuadros de un repaso (portada, cada nota o bloque y el cierre) y, si se pide, un video
// corto con la voz simulada (silencio), sin gastar ni un audio del cupo de Gemini. Sirve para ver cómo queda un repaso antes y después de tocar la
// composición (`elegirRepaso`, redes/elegir.mjs) o el dibujo (reels/escenas/repaso.mjs, reels/placa.mjs).
//
//   node scripts/medir/muestras-repaso.mjs --dia=2026-10-24 --repaso=noticia2 --prefijo=despues
//   node scripts/medir/muestras-repaso.mjs --dia=2026-10-24 --repaso=noticia2 --prefijo=antes --ref=abc1234     portada.json de esa versión de git
//   node scripts/medir/muestras-repaso.mjs ... --salida=docs/redes/previews/repaso-24-10 --ancho=720 --video
//
// Qué hace: lee el libro de publicaciones (web/data/redes.json) y la portada (la de disco, o la de `--ref` de git; con `--ref=auto` busca la versión
// anterior a la hora en que salió ese repaso), recorta el libro a lo que había antes de que saliera y arma el repaso con el código de hoy (`repasosDelDia`).
// No escribe en web/data, no publica nada y no llama a ninguna IA. `--video` arma además el mp4 con ffmpeg y la voz de mentira (silencio, tiempos de lectura
// calculados): el repaso real sale con la voz de Gemini y los tiempos medidos del audio, pero las placas, el orden y el ritmo son los mismos.
//
// Las fotos se leen de web/public/fotos-notas/ de este árbol: si una foto no está, la nota sale con la placa de su sección, como en producción.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import ffmpeg from 'ffmpeg-static';
import { archivosDeFuente } from '../../reels/placa.mjs';
import { repasosDelDia } from '../../redes/repasos.mjs';
import { PODCASTS } from '../../redes/piezas.mjs';
import { datosDeLaWeb } from '../../redes/datos.mjs';
import { secuenciaDelPlan } from '../../reels/plan.mjs';
import { placasConTiempos, escenaDelRepaso } from '../../reels/escenas/repaso.mjs';
import { palabrasSinteticas } from '../../reels/previa-efemerides.mjs';
import { armarReel } from '../../reels/reel.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..', '..');
const arg = (nombre, defecto = null) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3) ?? defecto;
const dia = arg('dia', new Date().toISOString().slice(0, 10));
const nombre = arg('repaso', 'noticia2');
const prefijo = arg('prefijo', 'muestra');
const salida = path.resolve(RAIZ, arg('salida', 'docs/redes/previews/repaso'));
const ancho = Number(arg('ancho', 720));
const ref = arg('ref', null);

const ronda = PODCASTS.find((p) => p.nombre === nombre);
if (!ronda) throw new Error(`--repaso tiene que ser uno de ${PODCASTS.map((p) => p.nombre).join(', ')}`);

const leerGit = (r, archivo) => JSON.parse(execFileSync('git', ['show', `${r}:${archivo}`], { cwd: RAIZ, maxBuffer: 1 << 29 }).toString('utf8'));
const libro = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'redes.json'), 'utf8'));
const salio = libro.instagram?.[`${dia}/${nombre}`]?.cuando ?? null;
// La hora del repaso: la de ese día a su hora de plan (AR = UTC-3) o, si ya salió, unos minutos antes de que saliera.
const [hh, mm] = ronda.hora.split(':').map(Number);
const fecha = salio ? new Date(Date.parse(salio) - 3 * 60e3) : new Date(Date.parse(`${dia}T00:00:00Z`) + ((hh + 3) * 60 + mm + 5) * 60e3);

/** La primera versión de portada.json de git a partir de ese momento: el plan de producción lee una portada un poco más nueva que la última subida antes de publicar. */
const primeraDespues = (desde) => {
  const versiones = execFileSync('git', ['rev-list', '--reverse', `--after=${new Date(desde.getTime() - 60e3).toISOString()}`, 'HEAD', '--', 'web/data/portada.json'], { cwd: RAIZ }).toString().trim().split('\n').slice(0, 24);
  const reales = libro.instagram?.[`${dia}/${nombre}`]?.notaIds ?? [];
  // La primera que ya tiene las notas que el repaso real contó (si salió); si no, la primera.
  return versiones.find((v) => { try { const ids = new Set(leerGit(v, 'web/data/portada.json').notas.map((n) => n.id)); return reales.every((id) => ids.has(id)); } catch { return false; } }) ?? versiones[0];
};

let portadaJson;
if (ref) {
  const r = ref === 'auto'
    ? primeraDespues(salio ? new Date(salio) : fecha)
    : ref;
  portadaJson = leerGit(r, 'web/data/portada.json');
  console.log(`portada de ${r.slice(0, 8)} (${portadaJson.generado})`);
} else {
  portadaJson = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'portada.json'), 'utf8'));
}
const datos = datosDeLaWeb(portadaJson);
// `--sin-pais` saca lo de afuera: muestra cómo queda el repaso un día en que no hay nada de afuera tan contado (entonces el cuarto bloque es el tiempo).
const publicables = datos.notas
  .filter((n) => !process.argv.includes('--sin-pais') || n.local === true)
  .sort((a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0));

// El libro de antes de que saliera: lo de ese momento en adelante no cuenta.
const antes = JSON.parse(JSON.stringify(libro));
for (const red of ['instagram', 'facebook']) {
  for (const [k, v] of Object.entries(antes[red] ?? {})) if (new Date(v?.cuando ?? 0) >= fecha) delete antes[red][k];
}
const banco = (() => { try { return JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'banco-fotos.json'), 'utf8')); } catch { return {}; } })();
const repaso = repasosDelDia(publicables, { libro: antes, fecha, clima: datos.clima })[nombre];
if (!repaso) { console.log('Ese día, a esa hora, no habría repaso (menos de dos notas).'); process.exit(0); }
console.log(`${dia} ${nombre}: ${repaso.notas.length} notas${repaso.resumen ? ` + resumen (${repaso.resumen.tipo})` : ''}, ~${repaso.segundos.toFixed(1)} s de voz`);
for (const n of repaso.notas) console.log(`  · [${n.seccion}] ${n.local ? 'de acá' : 'de afuera'} · puntaje ${n.relevancia} · ${n.titulo}`);
if (repaso.resumen) console.log(`  · [resumen] ${repaso.resumen.titulo}`);
console.log(`  guion: ${repaso.guion}`);

const secuencia = secuenciaDelPlan({ ronda, repaso, fecha, banco });
if (!secuencia) throw new Error('no se pudo armar la secuencia (¿REELS_ESCENAS=no?)');
const palabras = palabrasSinteticas(repaso.guion);
const retardo = 0.25;
const total = retardo + palabras.at(-1).hasta + 1.4;
const conTiempos = placasConTiempos(secuencia, palabras, { retardo, total });
if (!conTiempos) throw new Error('no se pudieron ubicar las placas en la voz');
const escena = escenaDelRepaso({ placas: conTiempos, tapa: secuencia.tapa, total });
if (!escena) throw new Error('no se pudo armar la escena');

fs.mkdirSync(salida, { recursive: true });
const propias = archivosDeFuente();
const aPng = (svg, archivo) => fs.writeFileSync(path.join(salida, archivo), new Resvg(svg, {
  fitTo: { mode: 'width', value: ancho },
  font: { fontFiles: propias, loadSystemFonts: propias.length === 0, defaultFontFamily: 'Inter' },
}).render().asPng());

// Los cuadros: la portada (el cuadro 0), cada bloque ya con su titular entero (1,6 s después de entrar) y el cierre (la lista).
const cuadros = [['1-portada', 0]];
conTiempos.forEach((p, i) => {
  const e = escena.etapas[i];
  if (e.tipo === 'nota') cuadros.push([`${i + 2}-bloque${i + 1}`, e.inicio + 1.6]);
  else cuadros.push([`${i + 2}-cierre`, Math.min(total - 0.2, e.inicio + 3)]);
});
if (!conTiempos.some((_, i) => escena.etapas[i].tipo !== 'nota')) cuadros.push([`${conTiempos.length + 2}-cierre`, total - 0.2]);
for (const [nombreCuadro, t] of cuadros) {
  aPng(escena.cuadro(t, total), `${prefijo}-${dia.slice(8)}-${dia.slice(5, 7)}-${nombre}-${nombreCuadro}.png`);
}
console.log(`${cuadros.length} cuadros en ${path.relative(RAIZ, salida)}`);

if (process.argv.includes('--video')) {
  const dirVideo = fs.mkdtempSync(path.join(salida, '.tmp-'));
  // La voz de mentira: un silencio del largo de la lectura (nada se pide a Gemini).
  const hablar = async (_texto, mp3) => {
    execFileSync(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=mono`, '-t', palabras.at(-1).hasta.toFixed(2), '-c:a', 'libmp3lame', mp3]);
    return { palabras, duracion: palabras.at(-1).hasta };
  };
  const res = await armarReel({
    nombre: `${prefijo}-${nombre}`, svg: secuencia.tapa, secuencia, guion: repaso.guion, acento: '#C7381C', hablar,
  }, dirVideo);
  const destino = path.join(salida, `${prefijo}-${dia.slice(8)}-${dia.slice(5, 7)}-${nombre}.mp4`);
  fs.copyFileSync(res.mp4, destino);
  fs.rmSync(dirVideo, { recursive: true, force: true });
  console.log(`video sin voz: ${path.relative(RAIZ, destino)} (${res.duracion.toFixed(1)} s)`);
}

