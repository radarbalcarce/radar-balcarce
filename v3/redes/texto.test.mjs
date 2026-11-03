// Pruebas del texto de los posteos: título, dos líneas, enlace, hashtags fijos y crédito. Sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoFacebook, textoInstagram, enlaceDeNota, hashtagsDe, ponerOrigen, slugDe, dosLineas, fraseDelEnlace, lineaDeCredito } from './texto.mjs';
import { slugDe as slugDelSitio } from '../sitio/util.mjs';

const NOTA = {
  id: 'k3j9x2a', titulo: 'Ferroviarios venció a Pato Naranja en el clásico del rugby local', bajada: 'La bajada.',
  enDosLineas: 'El equipo local ganó 24 a 10. El próximo partido es el sábado.', foto: { url: 'https://radarbalcarce.com/f.jpg', credito: 'Club Ferroviarios' },
};

test('el slug da lo mismo que el del sitio (la dirección del posteo tiene que existir)', () => {
  for (const t of ['Ferroviarios venció a Pato Naranja en el clásico del rugby local', 'Ñandú: ¿qué pasó con el "árbol"?', '', 'a'.repeat(120), 'Una nota con un título larguísimo que pasa de los setenta caracteres sin problema alguno']) {
    assert.equal(slugDe(t), slugDelSitio(t), t);
  }
});

test('el enlace es /nota/<slug>-<id>; si la nota ya tiene slug, se usa ese', () => {
  assert.equal(enlaceDeNota(NOTA), 'https://radarbalcarce.com/nota/ferroviarios-vencio-a-pato-naranja-en-el-clasico-del-rugby-local-k3j9x2a');
  assert.equal(enlaceDeNota({ ...NOTA, slug: 'otro-slug' }, 'https://radarbalcarce.com/'), 'https://radarbalcarce.com/nota/otro-slug-k3j9x2a');
});

test('Facebook: título + dos líneas + enlace + #Balcarce #RadarBalcarce + crédito, en ese orden', () => {
  const partes = textoFacebook(NOTA).split('\n\n');
  assert.equal(partes.length, 5);
  assert.equal(partes[0], NOTA.titulo);
  assert.equal(partes[1], NOTA.enDosLineas);
  assert.ok(partes[2].includes(enlaceDeNota(NOTA)), partes[2]);
  assert.equal(partes[3], '#Balcarce #RadarBalcarce');
  assert.equal(partes[4], 'Foto: Club Ferroviarios');
});

test('el enlace de Facebook lleva el origen (UTM) como en el sistema viejo: sin eso las visitas no dicen qué red las trajo', () => {
  const enlace = textoFacebook(NOTA).split('\n\n')[2].split(' ').pop();
  const u = new URL(enlace);
  assert.equal(u.origin + u.pathname, enlaceDeNota(NOTA));
  assert.equal(u.searchParams.get('utm_source'), 'facebook');
  assert.equal(u.searchParams.get('utm_medium'), 'social');
  assert.equal(u.searchParams.get('utm_campaign'), 'posteo');
  assert.equal(u.searchParams.get('utm_content'), 'k3j9x2a');
  assert.ok(!/utm_/.test(textoInstagram(NOTA)), 'en Instagram nunca hay enlace');
  assert.equal(ponerOrigen('https://radarbalcarce.com/clima', { fuente: 'Facebook', campana: 'servicio', contenido: 'clima-noche' }), 'https://radarbalcarce.com/clima?utm_source=facebook&utm_medium=social&utm_campaign=servicio&utm_content=clima-noche');
  assert.equal(ponerOrigen('https://radarbalcarce.com/clima', {}), 'https://radarbalcarce.com/clima', 'sin red o sin campaña, el enlace queda como está');
});

test('Instagram: igual pero sin enlace, con «link en la bio»', () => {
  const t = textoInstagram(NOTA);
  assert.ok(!t.includes('http'), t);
  assert.match(t, /La nota completa, en radarbalcarce\.com \(link en la bio\)/);
  assert.match(t, /#Balcarce #RadarBalcarce/);
  assert.ok(t.startsWith(NOTA.titulo));
});

test('sin dos líneas usa la bajada; si repite el título, no la pone; si es larga, la corta en una oración', () => {
  assert.equal(dosLineas({ titulo: 'T', enDosLineas: '', bajada: 'La bajada sola.' }), 'La bajada sola.');
  assert.equal(dosLineas({ titulo: 'Igual', enDosLineas: 'igual', bajada: '' }), '');
  const larga = `${'Una oración completa y razonablemente larga que sigue y sigue. '.repeat(8)}`;
  const corta = dosLineas({ titulo: 'T', enDosLineas: larga });
  assert.ok(corta.length <= 281, corta.length);
  assert.ok(corta.endsWith('.'), corta);
  assert.equal(dosLineas({ titulo: 'T', enDosLineas: 'Dos\nlíneas\n  con saltos.' }), 'Dos líneas con saltos.');
});

test('el crédito: «Foto: X»; una ilustración se dice ilustración; sin crédito no hay línea', () => {
  assert.equal(lineaDeCredito(NOTA), 'Foto: Club Ferroviarios');
  assert.equal(lineaDeCredito({ foto: { credito: 'Ilustración generada con IA' } }), 'Ilustración generada con IA');
  assert.equal(lineaDeCredito({ foto: { credito: 'Foto: Municipalidad' } }), 'Foto: Municipalidad');
  assert.equal(lineaDeCredito({ foto: { credito: '' } }), '');
  assert.ok(!textoFacebook({ ...NOTA, foto: { url: 'https://x/f.jpg' } }).includes('Foto:'));
});

test('la frase del enlace es siempre la misma para la misma nota y nunca nombra una fuente', () => {
  assert.equal(fraseDelEnlace('abc'), fraseDelEnlace('abc'));
  const frases = new Set(Array.from({ length: 40 }, (_, i) => fraseDelEnlace(`id${i}`)));
  assert.ok(frases.size > 1);
  for (const t of [textoFacebook(NOTA), textoInstagram(NOTA)]) assert.ok(!/resumen hecho con ia|\.com\.ar|fuente:/i.test(t));
});

test('hashtags como el viejo (regla 281): los dos fijos y hasta 3 de la nota (etiquetas o tema de la sección), sin repetir, en Facebook e Instagram', () => {
  assert.equal(hashtagsDe({ seccion: 'Balcarce' }), '#Balcarce #RadarBalcarce', 'Balcarce no suma tema');
  assert.equal(hashtagsDe({ seccion: 'Política' }), '#Balcarce #RadarBalcarce #Política');
  assert.equal(hashtagsDe({ seccion: 'Política', etiquetas: ['obras públicas', 'Balcarce', 'Concejo', 'Plaza', 'Cuarta'] }), '#Balcarce #RadarBalcarce #ObrasPúblicas #Concejo #Plaza');
  const n = { ...NOTA, seccion: 'Deportes' };
  assert.ok(textoFacebook(n).includes('#Balcarce #RadarBalcarce #Deportes'));
  assert.ok(textoInstagram(n).includes('#Balcarce #RadarBalcarce #Deportes'));
});
