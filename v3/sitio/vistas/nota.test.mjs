import test from 'node:test';
import assert from 'node:assert/strict';

test('en las notas de la redacción, las cuentas con arroba son enlaces a su Instagram (y la nota de otro medio no se toca)', async () => {
  const { conCuentasEnlazadas } = await import('./nota.mjs');
  const r = { origen: 'redaccion' };
  assert.equal(conCuentasEnlazadas('Bodegas (@vinedos.balcarce) abre. Viñedo (@vinedolospinos).', r),
    'Bodegas (<a href="https://www.instagram.com/vinedos.balcarce/" target="_blank" rel="noopener nofollow ugc">@vinedos.balcarce</a>) abre. Viñedo (<a href="https://www.instagram.com/vinedolospinos/" target="_blank" rel="noopener nofollow ugc">@vinedolospinos</a>).');
  assert.match(conCuentasEnlazadas('Gracias a @thewinesco.', r), /instagram\.com\/thewinesco\/".*>@thewinesco<\/a>\.$/);
  assert.equal(conCuentasEnlazadas('mail a juan@correo.com y @algo', { origen: 'nucleo' }), 'mail a juan@correo.com y @algo');
  assert.doesNotMatch(conCuentasEnlazadas('escribinos a juan@correo.com', r), /<a /);
});

test('en las notas de la redacción, [texto](https://radarbalcarce.com/…) es un enlace a otra nota nuestra (de otro sitio, no)', async () => {
  const { conCuentasEnlazadas } = await import('./nota.mjs');
  const r = { origen: 'redaccion' };
  assert.equal(conCuentasEnlazadas('Está en la nota [«El origen»](https://radarbalcarce.com/nota/x-abc1234).', r),
    'Está en la nota <a href="https://radarbalcarce.com/nota/x-abc1234">«El origen»</a>.');
  assert.doesNotMatch(conCuentasEnlazadas('[clic](https://malo.example.com/x)', r), /<a /);
  assert.doesNotMatch(conCuentasEnlazadas('[clic](https://radarbalcarce.com/x)', { origen: 'nucleo' }), /<a /);
});

// ---------------------------------------------------------------------------------------------------------- video de YouTube propio (17/11)
const notaBase = (extra) => ({ id: 'vid1234', titulo: 'Una nota', bajada: 'La bajada', cuerpo: ['Uno.', 'Dos.', 'Tres.'], seccion: 'Balcarce', firma: 'Radar Balcarce', origen: 'redaccion', publicada: '2026-11-17T12:00:00Z', fuentes: [], foto: null, extra });

test('una nota con video dibuja la fachada (miniatura + enlace) y no el reproductor, después del primer párrafo', async () => {
  const { paginaDeNota } = await import('./nota.mjs');
  const html = paginaDeNota(notaBase({ video: { youtube: 'dQw4w9WgXcQ', titulo: 'Así quedó <b>el club</b>' } }), { indexar: true, contexto: {} });
  assert.match(html, /<a class="video-yt-a" href="https:\/\/www\.youtube\.com\/watch\?v=dQw4w9WgXcQ"[^>]*data-yt="dQw4w9WgXcQ"/);
  assert.match(html, /<img src="https:\/\/i\.ytimg\.com\/vi\/dQw4w9WgXcQ\/hqdefault\.jpg"/);
  assert.doesNotMatch(html, /<iframe/, 'el reproductor no se carga hasta que el lector toca');
  assert.ok(html.indexOf('<p>Uno.</p>') < html.indexOf('video-yt-a') && html.indexOf('video-yt-a') < html.indexOf('<p>Dos.</p>'));
  assert.doesNotMatch(html, /<b>el club<\/b>/, 'el título del video se escapa');
  assert.match(html, /"@type":"VideoObject"/);
  assert.match(html, /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
});

test('el video sólo acepta un ID de 11 caracteres: una dirección, HTML u otro largo se ignoran', async () => {
  const { paginaDeNota, videoDeNota } = await import('./nota.mjs');
  for (const malo of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXc', 'dQw4w9WgXcQQ', '"><script>alert(1)</script>', 'dQw4w9Wg"Q>', 42, null, { id: 'x' }]) {
    assert.equal(videoDeNota({ extra: { video: { youtube: malo, titulo: 'x' } } }), null, String(malo));
    const html = paginaDeNota(notaBase({ video: { youtube: malo, titulo: 'x' } }), { indexar: true, contexto: {} });
    assert.doesNotMatch(html, /video-yt|VideoObject|youtube/i);
  }
  assert.equal(videoDeNota({ extra: { video: 'dQw4w9WgXcQ' } }), null);
  assert.equal(videoDeNota({ extra: { video: { youtube: 'dQw4w9WgXcQ', despuesDe: 2 } } }).despuesDe, 2);
});

test('una nota sin video queda igual: sin fachada, sin guion ni estilo de video', async () => {
  const { paginaDeNota } = await import('./nota.mjs');
  for (const extra of [undefined, {}, { fotosEnCuerpo: [] }]) {
    const html = paginaDeNota(notaBase(extra), { indexar: true, contexto: {} });
    assert.doesNotMatch(html, /video-yt|youtube|ytimg|VideoObject/i);
  }
});

test('la CSP de sólo informar deja el reproductor sin cookies y la miniatura de YouTube', async () => {
  const { CSP_SOLO_INFORMAR } = await import('../sitio.mjs');
  const dir = (n) => CSP_SOLO_INFORMAR.split('; ').find((d) => d.startsWith(`${n} `)) ?? '';
  assert.ok(dir('frame-src').includes('https://www.youtube-nocookie.com'));
  assert.ok(dir('img-src').includes('https://i.ytimg.com'));
});
