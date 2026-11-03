// Las páginas que todavía servía el sitio viejo y ahora son de acá (el cierre del sitio viejo, REGLAS.md § 10): /agenda y cada evento, /hoy, /util, /tablas,
// /compartir y la página de «ya no está» (410). Mismo diseño que el resto (vistas/base.mjs). Si falta un dato, la página lo dice; nunca se inventa.
import { esc, partesEnBalcarce, rutaDeNota, BASE } from '../util.mjs';
import { pagina } from './base.mjs';
import {
  proximos, yaPaso, cuandoEs, dondeEs, entradaDe, nombreDeEvento, copeteDeEvento, partesDeFecha, firmaDeEvento, fuentesDeEvento, detallesDeEvento,
  enlaceGoogleCalendar, fichaDeEvento, confirmacionDeAnual,
} from '../eventos.mjs';
import { FIESTAS_DEL_AÑO } from '../agenda.mjs';
import { ESCUDOS } from '../tablas.mjs';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const mayuscula = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
const envolver = (c) => `<div class="pdia">${c}</div>`;

const hoyIso = (ahora) => { const p = partesEnBalcarce(ahora); return `${p.anio}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`; };
const tituloDeDia = (f) => (f ? `${mayuscula(DIAS[new Date(Date.UTC(f.anio, f.mes - 1, f.dia)).getUTCDay()])} ${f.dia} de ${MESES[f.mes - 1]}` : 'Sin fecha');

const filaDeEvento = (e) => `<li><a href="${esc(e.ruta)}"><strong>${esc(nombreDeEvento(e.nombre))}</strong><span>${esc(mayuscula(cuandoEs(e)))}${dondeEs(e) ? ` · ${esc(dondeEs(e))}` : ''}</span></a></li>`;

// ---------------------------------------------------------------- /agenda

export function paginaAgenda(eventos, { ok = true, indexar, contexto } = {}) {
  const ahora = contexto?.ahora ?? new Date();
  const lista = proximos(eventos, ahora.getTime());
  const hoy = hoyIso(ahora);
  const grupos = [];
  for (const e of lista) {
    const f = partesDeFecha(e.desde);
    const clave = f ? (f.fecha < hoy ? hoy : f.fecha) : 'sin fecha';
    let g = grupos.find((x) => x.clave === clave);
    if (!g) { g = { clave, titulo: tituloDeDia(partesDeFecha(clave)), eventos: [] }; grupos.push(g); }
    g.eventos.push(e);
  }
  const anuales = FIESTAS_DEL_AÑO.map((a) => ({ ...a, evento: confirmacionDeAnual(a, lista) }));
  const cuerpo = envolver(`<h1>Agenda de Balcarce</h1>
<p class="bajada">Actos, muestras, ferias, fiestas y encuentros deportivos. Tocá un evento para ver los detalles, agendarlo o pasarlo por WhatsApp.</p>
${grupos.length ? grupos.map((g) => `<h2>${esc(g.titulo)}</h2><ul class="evs">${g.eventos.map(filaDeEvento).join('')}</ul>`).join('\n')
    : `<p>${ok ? 'No hay eventos cargados en este momento. Cuando el municipio publique la próxima actividad, aparece acá sola.' : 'No pudimos leer la agenda del municipio en este momento. Probá de nuevo en un rato o mirá <a class="enlace" href="https://balcarce.gob.ar/eventos/" rel="noopener">balcarce.gob.ar</a>.'}</p>`}
<h2>Las fiestas del año</h2>
<p class="nota-chica">Se repiten todos los años. La fecha exacta la confirma cada organizador: hasta entonces decimos sólo el mes en que suelen caer.</p>
<ul class="evs">${anuales.map((a) => (a.evento
    ? filaDeEvento(a.evento)
    : `<li><span><strong>${esc(a.nombre)}</strong>Suele ser en ${MESES[a.mes - 1]} · fecha a confirmar</span></li>`)).join('')}</ul>
<p class="nota-chica">Los eventos salen de la agenda oficial de la Municipalidad de Balcarce. ¿Organizás algo? Escribinos por <a class="enlace" href="https://wa.me/5492266511612" rel="noopener">WhatsApp</a>.</p>`);
  return pagina({
    titulo: 'Agenda de Balcarce', descripcion: 'Qué hay para hacer en Balcarce: actos, muestras, ferias, fiestas y encuentros deportivos.',
    canonico: '/agenda', indexar, contexto, cuerpo,
  });
}

// ---------------------------------------------------------------- /agenda/<evento>

export function paginaDeEvento(e, { eventos = [], indexar, contexto } = {}) {
  const ahora = contexto?.ahora ?? new Date();
  const nombre = nombreDeEvento(e.nombre);
  const paso = yaPaso(e, ahora.getTime());
  const url = BASE + e.ruta;
  const donde = dondeEs(e);
  const entrada = entradaDe(e);
  const detalles = detallesDeEvento(e);
  const mapa = donde ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nombreDeEvento(e.direccion || e.lugar || '')}, ${e.localidad || 'Balcarce'}, Buenos Aires`)}` : null;
  const firma = firmaDeEvento(e);
  const fuentes = fuentesDeEvento(e);
  const otros = proximos(eventos, ahora.getTime()).filter((o) => o.id !== e.id).slice(0, 3);
  const aviso = paso ? `<div class="aviso">Este evento ya pasó: fue ${esc(cuandoEs(e))}. <a class="enlace" href="/agenda">Mirá lo que viene en la agenda →</a></div>`
    : e.suspendido ? '<div class="aviso">Este evento se suspendió. <a class="enlace" href="/agenda">Mirá lo que viene en la agenda →</a></div>' : '';
  const google = enlaceGoogleCalendar(e, url);
  const cuerpo = envolver(`<p class="nota-chica"><a class="enlace" href="/agenda">Agenda</a> › ${esc(nombre)}</p>
<h1>${esc(nombre)}</h1>
<p class="bajada">${esc(copeteDeEvento(e))}</p>
${aviso}
<dl class="datos">
<dt>Cuándo</dt><dd>${esc(mayuscula(cuandoEs(e)))}</dd>
<dt>Dónde</dt><dd>${esc(donde || 'Balcarce')}${mapa ? ` · <a class="enlace" href="${esc(mapa)}" rel="noopener">Cómo llegar</a>` : ''}</dd>
<dt>Entrada</dt><dd>${esc(entrada ?? 'No la informaron. Consultá el valor con quien organiza.')}</dd>
${e.organizador ? `<dt>Organiza</dt><dd>${e.organizadorUrl ? `<a class="enlace" href="${esc(e.organizadorUrl)}" rel="noopener">${esc(nombreDeEvento(e.organizador))}</a>` : esc(nombreDeEvento(e.organizador))}</dd>` : ''}
${detalles.length ? `<dt>Qué hay</dt><dd>${esc(detalles.join(' · '))}</dd>` : ''}
</dl>
${!paso && !e.retirado ? `<div class="botones"><a class="boton rojo" href="${esc(e.ruta)}/evento.ics">Agendar en el celular</a>${google ? `<a class="boton" href="${esc(google)}" rel="noopener">Google Calendar</a>` : ''}${e.web ? `<a class="boton" href="${esc(e.web)}" rel="noopener">Entradas e información ↗</a>` : ''}<a class="boton" href="https://wa.me/?text=${encodeURIComponent(`${nombre}: ${copeteDeEvento(e)} ${url}`)}" rel="noopener">Pasalo por WhatsApp</a></div>` : ''}
<p class="nota-chica">${esc(firma.texto)}${fuentes.length ? ` · ${fuentes.map((f) => `<a class="enlace" href="${esc(f.enlace)}" rel="noopener nofollow">${esc(f.medio)}</a>`).join(', ')}` : ''}</p>
${otros.length ? `<h2>También en la agenda</h2><ul class="evs">${otros.map(filaDeEvento).join('')}</ul><p><a class="enlace" href="/agenda">Ver toda la agenda →</a></p>` : ''}
<p class="nota-chica">¿Algo cambió en este evento? Escribinos por <a class="enlace" href="https://wa.me/5492266511612" rel="noopener">WhatsApp</a> y lo corregimos.</p>`);
  const datos = !e.retirado && !paso ? [(() => { const d = fichaDeEvento(e, { base: BASE, url }); delete d.image; return d; })()] : [];
  return pagina({
    titulo: nombre.length > 52 ? `${nombre.slice(0, 51).trim()}…` : nombre, descripcion: copeteDeEvento(e),
    canonico: e.ruta, indexar: indexar && !paso && !e.retirado, contexto, cuerpo, datos,
  });
}

// ---------------------------------------------------------------- /hoy

const MINIMO_HOY = 6;
const mediosDe = (n) => new Set((n.fuentes ?? []).map((f) => f?.medio).filter(Boolean)).size;

/** Lo de hoy: las notas del día de Balcarce (o, si hay pocas, las últimas 24 horas) con lo de acá primero y después lo más contado. */
export function armarHoy(notas, ahora = new Date()) {
  const p = partesEnBalcarce(ahora);
  const inicio = Date.UTC(p.anio, p.mes - 1, p.dia, 3, 0, 0); // medianoche de Balcarce (UTC-3)
  const t = (n) => new Date(n.publicada).getTime();
  const validas = notas.filter((n) => Number.isFinite(t(n)) && t(n) <= ahora.getTime() + 5 * 60e3);
  const deHoy = validas.filter((n) => t(n) >= inicio);
  const ventana = deHoy.length >= MINIMO_HOY ? 'hoy' : '24h';
  const elegidas = ventana === 'hoy' ? deHoy : validas.filter((n) => t(n) >= ahora.getTime() - 24 * 3600e3);
  const balcarce = elegidas.filter((n) => n.seccion === 'Balcarce').sort((a, b) => t(b) - t(a)).slice(0, 8);
  const arriba = new Set(balcarce.map((n) => n.id));
  const masContadas = elegidas.filter((n) => !arriba.has(n.id) && mediosDe(n) >= 2).sort((a, b) => (mediosDe(b) - mediosDe(a)) || (t(b) - t(a))).slice(0, 6);
  return { ventana, balcarce, masContadas, total: elegidas.length };
}

const recortar = (t, n) => (t.length > n ? `${t.slice(0, n - 1).trim()}…` : t);
const filaDelDia = (n, conMedios) => `<li><a href="${esc(rutaDeNota(n))}"><strong>${esc(n.titulo)}</strong><span>${esc(n.seccion)}${conMedios && mediosDe(n) > 1 ? ` · contada por ${mediosDe(n)} medios` : ''}${n.bajada ? ` · ${esc(recortar(n.bajada, 150))}` : ''}</span></a></li>`;

export function paginaHoy(notas, eventos, { indexar, contexto } = {}) {
  const ahora = contexto?.ahora ?? new Date();
  const p = partesEnBalcarce(ahora);
  const dia = `${DIAS[new Date(Date.UTC(p.anio, p.mes - 1, p.dia)).getUTCDay()]} ${p.dia} de ${MESES[p.mes - 1]}`;
  const { ventana, balcarce, masContadas, total } = armarHoy(notas, ahora);
  const hoy = hoyIso(ahora);
  const deHoy = proximos(eventos, ahora.getTime()).filter((e) => partesDeFecha(e.desde)?.fecha === hoy).slice(0, 5);
  const farm = contexto?.farmacia?.farmacias ?? [];
  const cuerpo = envolver(`<p class="nota-chica">${esc(mayuscula(dia))}</p>
<h1>Lo de hoy en Balcarce</h1>
<p class="bajada">${total ? `${total} ${total === 1 ? 'nota' : 'notas'} ${ventana === 'hoy' ? 'de hoy' : 'de las últimas 24 horas (todavía hay pocas de hoy)'}. Lo de acá primero.` : 'Todavía no hay notas de hoy.'}</p>
${balcarce.length ? `<h2>En Balcarce</h2><ul class="evs">${balcarce.map((n) => filaDelDia(n, false)).join('')}</ul>` : ''}
${masContadas.length ? `<h2>Lo más contado</h2><ul class="evs">${masContadas.map((n) => filaDelDia(n, true)).join('')}</ul>` : ''}
${total === 0 ? '<p><a class="enlace" href="/">Mirá lo último en la portada →</a></p>' : ''}
${farm.length || deHoy.length ? `<h2>Para hoy</h2>
${farm.length ? `<p><strong>Farmacia de turno:</strong> ${farm.map((f) => esc(f.nombre)).join(' y ')} · <a class="enlace" href="/farmacias">ver direcciones y la semana →</a></p>` : ''}
${deHoy.length ? `<h3>Agenda de hoy</h3><ul class="evs">${deHoy.map(filaDeEvento).join('')}</ul>` : ''}
<p><a class="enlace" href="/clima">El clima y el pronóstico →</a></p>` : ''}
<p class="nota-chica">Son resúmenes automáticos de lo que publicaron otros medios, con la fuente siempre enlazada en cada nota. <a class="enlace" href="/como-trabajamos">Cómo trabajamos</a></p>
<div class="botones"><a class="boton rojo" href="https://wa.me/?text=${encodeURIComponent(`Lo de hoy en Balcarce: ${BASE}/hoy`)}" rel="noopener">Mandá lo de hoy por WhatsApp</a></div>`);
  return pagina({
    titulo: `Lo de hoy en Balcarce · ${dia}`, descripcion: `Las noticias de Balcarce de hoy, ${dia}, en una sola página: lo de acá primero, lo que más medios contaron, la farmacia de turno y la agenda.`,
    canonico: '/hoy', indexar, contexto, cuerpo,
  });
}

// ---------------------------------------------------------------- /util

export const NUMEROS = [
  { categoria: 'Emergencias', nombre: 'Emergencias (línea única)', numero: '911' },
  { categoria: 'Emergencias', nombre: 'SAME / Emergencias médicas', numero: '107' },
  { categoria: 'Emergencias', nombre: 'Bomberos', numero: '100' },
  { categoria: 'Emergencias', nombre: 'Cooperativa Eléctrica · guardia 24 h', numero: '0800 222 2342' },
  { categoria: 'Salud', nombre: 'Hospital · conmutador', numero: '(02266) 42-2017 / 42-2018 / 43-0384 / 43-0449' },
  { categoria: 'Salud', nombre: 'Hospital · dirección', numero: '(02266) 42-2964 / 42-2570' },
  { categoria: 'Seguridad', nombre: 'Comisaría de la Mujer', numero: '(02266) 43-1042' },
  { categoria: 'Seguridad', nombre: 'Juzgado de Faltas', numero: '(02266) 43-0566' },
  { categoria: 'Seguridad', nombre: 'Tránsito (Movilidad y Control Urbano)', numero: '(02266) 43-1765' },
  { categoria: 'Municipio', nombre: 'Municipalidad · conmutador', numero: '(02266) 42-4044 / 42-5330 / 42-4009' },
  { categoria: 'Municipio', nombre: 'Concejo Deliberante', numero: '(02266) 42-4089' },
  { categoria: 'Servicios', nombre: 'Cooperativa Eléctrica · guardia (fijo)', numero: '(02266) 42-4091' },
  { categoria: 'Servicios', nombre: 'ARBAL · atención al público', numero: '(02266) 15-674175 / 15-660261' },
  { categoria: 'Servicios', nombre: 'Cementerio', numero: '(02266) 42-4064' },
  { categoria: 'Servicios', nombre: 'Licencias de conducir', numero: '(02266) 42-0055' },
  { categoria: 'Servicios', nombre: 'Defensa al Consumidor', numero: '(02266) 43-0695' },
  { categoria: 'Servicios', nombre: 'Zoonosis', numero: '(02266) 15-661845' },
  { categoria: 'Cultura', nombre: 'Teatro Municipal', numero: '(02266) 15-548766' },
  { categoria: 'Turismo', nombre: 'Oficina de Turismo · centro', numero: '(02266) 42-2394' },
  { categoria: 'Turismo', nombre: 'Oficina de Turismo · el cruce', numero: '(02266) 43-0895' },
  { categoria: 'Delegaciones', nombre: 'Delegación Los Pinos', numero: '(02266) 49-0250' },
  { categoria: 'Delegaciones', nombre: 'Delegación Napaleofú', numero: '(02261) 49-0600 / 49-0643' },
  { categoria: 'Delegaciones', nombre: 'Delegación San Agustín', numero: '(02266) 49-1013' }
];

export function paginaUtil({ indexar, contexto } = {}) {
  const categorias = [...new Set(NUMEROS.map((n) => n.categoria))];
  // Un número con barras son varias líneas de la misma oficina: se muestra, pero no se puede tocar para llamar.
  const paraLlamar = (n) => (n.includes('/') ? null : `tel:${n.replace(/\D/g, '')}`);
  const cuerpo = envolver(`<h1>Teléfonos útiles</h1>
<p class="bajada">Emergencias, salud, seguridad y las oficinas del municipio. Tocá un número para llamar.</p>
${categorias.map((c) => `<h2>${esc(c)}</h2><div class="tel">${NUMEROS.filter((n) => n.categoria === c).map((n) => {
    const t = paraLlamar(n.numero);
    const dentro = `<b>${esc(n.nombre)}</b><span>${esc(n.numero)}</span>`;
    return t ? `<a href="${esc(t)}">${dentro}</a>` : `<div>${dentro}</div>`;
  }).join('')}</div>`).join('\n')}
<p class="nota-chica">Los teléfonos salen de la lista oficial de la Municipalidad de Balcarce. ¿Alguno cambió? Avisanos por <a class="enlace" href="https://wa.me/5492266511612" rel="noopener">WhatsApp</a> y lo corregimos el mismo día.</p>`);
  return pagina({ titulo: 'Teléfonos útiles', descripcion: 'Emergencias, salud, seguridad y oficinas del municipio de Balcarce, en un solo lugar.', canonico: '/util', indexar, contexto, cuerpo });
}

// ---------------------------------------------------------------- /tablas

const dif = (n) => (n > 0 ? `+${n}` : String(n ?? '–'));
const sinDatos = (que) => `<p class="aviso">Todavía no tenemos ${que}. Aparece apenas la fuente lo publique.</p>`;

export function paginaTablas(liga, f1, { indexar, contexto } = {}) {
  const lideres = liga?.zonas?.map((z) => z.filas?.[0]).filter(Boolean);
  const p = f1?.pilotos?.filas?.[0];
  const cuerpo = envolver(`<h1>Tablas de posiciones</h1>
<p class="bajada">Se actualizan solas después de cada fecha o carrera.</p>
<div class="ficha"><h3><a href="/tablas/liga-profesional">Liga Profesional de Fútbol</a></h3><p>${lideres?.length ? `Punteros: ${lideres.map((f) => `${esc(f.equipo)} (${f.pts} pts)`).join(' y ')}.` : 'Las posiciones de las dos zonas.'}</p></div>
<div class="ficha"><h3><a href="/tablas/formula-1">Campeonato de Fórmula 1</a></h3><p>${p ? `Lidera ${esc(p.piloto)} con ${p.puntos} puntos.` : 'Pilotos y constructores.'}</p></div>`);
  return pagina({ titulo: 'Tablas de posiciones', descripcion: 'Las tablas que se actualizan solas: la Liga Profesional de fútbol y el campeonato de Fórmula 1.', canonico: '/tablas', indexar, contexto, cuerpo });
}

export function paginaLiga(liga, { indexar, contexto } = {}) {
  const zona = (z) => `<h2>${esc(z.nombre)}</h2><table class="tabla"><thead><tr><th class="num">#</th><th>Equipo</th><th class="num">Pts</th><th class="num">PJ</th><th class="num">G</th><th class="num">E</th><th class="num">P</th><th class="num">DG</th></tr></thead><tbody>${z.filas.map((f) => `<tr><td class="num">${f.posicion}</td><td>${f.id && ESCUDOS.has(f.id) ? `<img class="escudo" src="/escudos/${esc(f.id)}.png" alt="" width="22" height="22" loading="lazy">` : ''}${esc(f.equipo)}</td><td class="num"><b>${f.pts}</b></td><td class="num">${f.pj ?? '–'}</td><td class="num">${f.g ?? '–'}</td><td class="num">${f.e ?? '–'}</td><td class="num">${f.p ?? '–'}</td><td class="num">${dif(f.dif)}</td></tr>`).join('')}</tbody></table>`;
  const cuerpo = envolver(`<h1>Liga Profesional de Fútbol</h1>
<p class="bajada">${liga?.torneo ? esc(liga.torneo) : 'Posiciones por zona'}. Se actualiza sola después de cada fecha.</p>
${liga ? liga.zonas.map(zona).join('\n') : sinDatos('la tabla')}
<p class="nota-chica">Más fútbol en <a class="enlace" href="/seccion/futbol">la sección Fútbol</a>. Fuente: ESPN (datos abiertos).</p>`);
  return pagina({ titulo: 'Liga Profesional: tabla de posiciones', descripcion: 'La tabla de posiciones de la Liga Profesional de fútbol por zona, con puntos, partidos y diferencia de gol. Se actualiza sola después de cada fecha.', canonico: '/tablas/liga-profesional', indexar, contexto, cuerpo });
}

export function paginaF1(f1, { indexar, contexto } = {}) {
  const tabla = (titulo, filas, conPiloto) => `<h2>${titulo}</h2><table class="tabla"><thead><tr><th class="num">#</th><th>${conPiloto ? 'Piloto' : 'Equipo'}</th><th class="num">Pts</th><th class="num">Vict.</th></tr></thead><tbody>${filas.map((f) => `<tr><td class="num">${f.posicion}</td><td>${esc(conPiloto ? f.piloto : f.equipo)}${conPiloto && f.equipo ? ` <small>${esc(f.equipo)}</small>` : ''}</td><td class="num"><b>${f.puntos}</b></td><td class="num">${f.victorias ?? '–'}</td></tr>`).join('')}</tbody></table>`;
  const base = f1?.pilotos ?? f1?.constructores;
  const cuerpo = envolver(`<h1>Campeonato de Fórmula 1</h1>
<p class="bajada">${base ? `Temporada ${base.temporada}, después de la carrera ${base.ronda}.` : ''}</p>
${base ? `${f1.pilotos?.filas?.length ? tabla('Campeonato de pilotos', f1.pilotos.filas, true) : ''}${f1.constructores?.filas?.length ? tabla('Campeonato de constructores', f1.constructores.filas, false) : ''}` : sinDatos('el campeonato')}
<p class="nota-chica">Las carreras y sus horarios, en <a class="enlace" href="/seccion/automovilismo">Automovilismo</a>. Fuente: Jolpica F1.</p>`);
  return pagina({ titulo: 'Campeonato de Fórmula 1: pilotos y constructores', descripcion: 'Cómo va el campeonato de pilotos y de constructores de la Fórmula 1, con puntos y victorias. Se actualiza sola después de cada carrera.', canonico: '/tablas/formula-1', indexar, contexto, cuerpo });
}

// ---------------------------------------------------------------- /compartir (una herramienta para pasar el dato: no se indexa)

const WEB = 'https://radarbalcarce.com';
const INSTAGRAM = 'https://www.instagram.com/radarbalcarce';
const FACEBOOK = 'https://www.facebook.com/profile.php?id=61594865361170';
const MENSAJES = [
  ['Mensaje corto (para grupos y chats)', `¡Hola! Te cuento algo que estoy armando: Radar Balcarce, un medio digital con las noticias de Balcarce y la zona, todo en un solo lugar y actualizado todo el día.\n\nTe pido una mano: ¿me ayudás siguiéndonos? Es un ratito y nos sirve un montón para arrancar.\n\nWeb: ${WEB}\nInstagram: ${INSTAGRAM}\nFacebook: ${FACEBOOK}\n\nY si podés, compartilo con alguien de Balcarce. ¡Gracias!`],
  ['Mensaje personal (para amigos y familia)', `¡Hola! Quería contarte algo en lo que vengo trabajando: Radar Balcarce. Es un medio digital con las noticias de Balcarce y la región, el clima, las farmacias de turno y más, que se actualiza todo el día.\n\nRecién estamos arrancando y lo que más ayuda es que nos sigan. ¿Me das una mano?\n\n1) Seguinos en Instagram: ${INSTAGRAM}\n2) Seguinos en Facebook: ${FACEBOOK}\n3) Mirá la web y guardala en el celular: ${WEB}\n\nSi te gusta, compartilo con tus contactos de Balcarce. Y si ves o sabés algo que tendría que ser noticia, escribinos. ¡Mil gracias!`],
  ['Bio, igual en Instagram y en Facebook', 'Todo lo que pasa en Balcarce y la región, en un solo lugar. radarbalcarce.com'],
];

export function paginaCompartir({ contexto } = {}) {
  const cuerpo = envolver(`<h1>Invitá a tus amigos</h1>
<p class="bajada">Elegí un mensaje, copialo y pegalo en WhatsApp. Después mandá el video. Lo que más nos ayuda es que nos sigan en las redes.</p>
${MENSAJES.map(([t, x]) => `<h2>${esc(t)}</h2><pre class="copiable">${esc(x)}</pre>`).join('\n')}
<h2>Videos</h2>
<p><a class="enlace" href="/compartir/radar-balcarce-vertical.mp4">Video vertical (WhatsApp, historias y reels)</a> · 49 segundos.</p>
<p><a class="enlace" href="/compartir/radar-balcarce-horizontal.mp4">Video horizontal (Facebook y computadora)</a> · 49 segundos.</p>
<h2>Los enlaces</h2>
<p><a class="enlace" href="${WEB}">${WEB}</a><br><a class="enlace" href="${INSTAGRAM}" rel="noopener">${INSTAGRAM}</a><br><a class="enlace" href="${FACEBOOK}" rel="noopener">${FACEBOOK}</a></p>`);
  return pagina({ titulo: 'Invitá a tus amigos', descripcion: 'Mensajes y video para compartir Radar Balcarce.', canonico: '/compartir', indexar: false, noindex: true, contexto, cuerpo });
}

// ---------------------------------------------------------------- 410: lo que ya no está (nunca se manda al sitio viejo)

/** `buscar`: palabras del titular viejo para ofrecer una búsqueda (opcional). */
export function paginaYaNoEsta({ que = 'Esa página', buscar = '', contexto } = {}) {
  const cuerpo = `<h1>${esc(que)} ya no está</h1>
<p>Puede que la nota se haya unido a otra, que se haya retirado o que la dirección esté mal escrita.${buscar ? ` Probá <a href="/buscar?q=${encodeURIComponent(buscar)}">buscar «${esc(buscar)}»</a> o` : ' Probá'} <a href="/">volver a la portada</a>.</p>`;
  return pagina({ titulo: `${que} ya no está`, indexar: false, noindex: true, contexto, cuerpo });
}
