// La nota del media kit: «Publicitá en Radar Balcarce». Es una nota propia (origen 'redaccion', firmada por Hernán Accomo, sección Balcarce, con placa).
// `/publicidad` redirige acá y el aviso propio («Tu comercio acá») también. Este archivo es la única fuente del texto:
//   node v3/sitio/scripts/nota-media-kit.mjs      escribe scripts/salida/nota-media-kit.sql y docs/propuestas/NOTA-MEDIA-KIT.md (no toca la base)
//   npx wrangler d1 execute radar-nucleo --remote --file=v3/sitio/scripts/salida/nota-media-kit.sql     (lo corre una persona, ANTES de desplegar el redirect)
// Correrlo de nuevo actualiza el texto y deja la fecha de salida original.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ID = 'mediakit';
export const SLUG = 'publicita-en-radar-balcarce';
export const FIRMA = 'Hernán Accomo';

// Las imágenes de la nota (las dibuja scripts/imagenes-media-kit.mjs, sin precios; el workflow «sitio» las sube a R2 y el sitio las sirve en /fotos-notas/).
const URL_FOTOS = 'https://radarbalcarce.com/fotos-notas/';
export const FOTO_DE_PORTADA = { url: `${URL_FOTOS}mediakit-portada.png?v=2`, alt: 'Radar Balcarce: publicidad para comercios de Balcarce, noviembre y diciembre de 2026', credito: 'Radar Balcarce', ancho: 1200, alto: 630 };
export const FOTOS_EN_CUERPO = [
  { url: `${URL_FOTOS}mediakit-bienvenida.png?v=3`, alt: 'La bienvenida para todos los comercios: una nota, un reel con voz y una historia', ancho: 1200, alto: 700, despuesDe: 3 },
  { url: `${URL_FOTOS}mediakit-clima.png?v=4`, alt: 'El clima de hoy llega con tu comercio: la voz, la franja del video y el recuadro arriba de la nota del clima', ancho: 1200, alto: 700, despuesDe: 4 },
  { url: `${URL_FOTOS}mediakit-lugares-tapa.png?v=1`, alt: 'Capturas de la tapa del sitio, en la computadora y en el celular, con cada espacio de aviso marcado: T1, T2, T3 y T4', ancho: 1200, alto: 1490, despuesDe: 7 },
  { url: `${URL_FOTOS}mediakit-lugares-paginas.png?v=1`, alt: 'Capturas de una nota, una sección y la página del clima con los espacios N2, S1, S2 y C1 marcados, y la tabla de todos los espacios', ancho: 1200, alto: 1160, despuesDe: 8 },
  { url: `${URL_FOTOS}mediakit-donde.png?v=2`, alt: 'Dónde se ve tu aviso en el sitio y en las redes, y cómo arrancar', ancho: 1200, alto: 733, despuesDe: 9 },
];

export const NOTA = {
  titulo: 'Publicitá en Radar Balcarce: los planes de noviembre y diciembre de 2026',
  bajada: 'Queremos que los comercios de Balcarce estén en Radar. Te contamos qué ofrecemos, dónde se ve tu aviso y cómo arrancar. Los precios, por WhatsApp.',
  enDosLineas: 'Hay cinco planes por mes, con nota de bienvenida, reel con voz, clima auspiciado, historias y avisos en el sitio. Los precios de noviembre y diciembre de 2026, por WhatsApp al 2266 51-1612.',
  cuerpo: [
    'En Radar Balcarce queremos que los comercios, los emprendimientos y los servicios de la ciudad estén en Radar. Contamos todo lo que le da vida a Balcarce, y eso incluye al que abre su local, al que arma una feria, al que se anima a emprender. Por eso armamos una forma simple de acompañarnos: para que el vecino te encuentre y para que Radar pueda sostenerse con los comercios de acá.',
    'Tu comercio se ve en el sitio, en Facebook y en Instagram, con voz propia: los reels llevan locución. Todo aviso va marcado como «Publicidad», con tu enlace, y separado de las noticias. Quien pauta no decide qué publicamos.',
    'La bienvenida es para todos. Cuando un comercio se suma, hacemos una nota sobre su emprendimiento, un reel con voz y una historia que cuenta esa nota. Se hace una sola vez y no se cobra aparte. La nota cuenta tu historia con tus palabras: nada que vos no hayas dicho.',
    'Lo que nos distingue es el clima auspiciado, y es lo más visto. El reel del clima empieza con la voz diciendo «El clima de hoy llega con tu comercio», y en el video una franja muestra tu comercio y tu Instagram. Además, en el diario, un recuadro «El clima de hoy llega con tu comercio» queda arriba de la nota diaria del clima (sale todas las mañanas a las 7:30) y de la página /clima. Cada día lleva un solo auspiciante y se reserva por orden de llegada. Si se llena, queda lista de espera, y nadie pierde lo que compró.',
    'Hay cinco planes por mes, de menor a mayor: más climas auspiciados, más historias con tus promociones en nuestras redes, posteos con foto en Facebook e Instagram desde el cuarto plan, y más lugares para tu aviso en el sitio, hasta el aviso fijo en el plan más grande. Los precios, por WhatsApp al 2266 51-1612. Los de noviembre y diciembre de 2026 son de promoción, con más climas de los habituales.',
    'Los avisos rotativos se reparten por igual entre todos los que pautan: cada vez que se arma una página, sale uno distinto. El fijo va arriba de las noticias y no rota, y es para un solo comercio por mes.',
    'Así se ve en el sitio. En la tapa hay un espacio fijo arriba de las noticias (T1) y tres rotativos: después de las notas de la grilla (T2), en la columna del costado (T3) y al pie (T4). Estas son capturas reales, con cada espacio marcado.',
    'En cada nota hay un espacio al pie (N2), y arriba (N1) si hay un comercio fijo. En cada sección, uno fijo arriba de la lista (S1) y uno al pie (S2). El auspicio del clima (C1) va arriba de la nota del clima y de /clima. Los espacios azules (A1, A2 y A3) son avisos de Google: no se venden. Acá va la tabla completa:',
    'Para arrancar, escribinos por WhatsApp al 2266 51-1612. Te pedimos el logo, algunas fotos del local y de lo que hacés, tus datos (dirección, horarios, redes) y, si querés, la promoción que quieras difundir. Después te hacemos unas preguntas para la nota, que podés contestar por audio o por escrito, como te quede más cómodo.',
    'Los precios de noviembre y diciembre de 2026 son de promoción. Para el año que viene veremos. Mientras tanto, la puerta está abierta: Radar es de los vecinos y se sostiene con los comercios que quieren que Balcarce se entere de que están.',
  ],
  seccion: 'Balcarce',
  ficha: { que: 'Planes de publicidad de Radar Balcarce', quien: 'Radar Balcarce', donde: 'WhatsApp 2266 51-1612', cuando: 'Precios de promoción de noviembre y diciembre de 2026', numeros: [], cronologia: [], faltaSaber: [] },
};

const q = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const AHORA = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

/** El SQL que inserta la nota (o actualiza su texto si ya está) y su fila de sitio_notas. Las mismas columnas que el bot de Telegram (redaccion/telegram/nota-propia.mjs). */
export function sqlDeLaNota() {
  const n = NOTA;
  const redes = JSON.stringify({ eleccion: 'solo-web', confirmada: true, por: 'defecto' });
  const verificacion = JSON.stringify({ oracionesQuitadas: [], reescrita: false, propia: true });
  return `-- La nota del media kit (v3/sitio/scripts/nota-media-kit.mjs). Se puede correr más de una vez: actualiza el texto y no cambia la fecha.
INSERT INTO notas (id, historia_id, creada, titulo, bajada, cuerpo, seccion, en_dos_lineas, ficha, no_publicar, verificacion, foto, fuentes, fecha_hecho, firma, pedidos, estado, origen, slug, publicada_en, redes)
VALUES (${q(ID)}, ${q('redaccion-' + ID)}, ${AHORA}, ${q(n.titulo)}, ${q(n.bajada)}, ${q(JSON.stringify(n.cuerpo))}, ${q(n.seccion)}, ${q(n.enDosLineas)}, ${q(JSON.stringify(n.ficha))}, NULL, ${q(verificacion)}, ${q(JSON.stringify(FOTO_DE_PORTADA))}, '[]', ${AHORA}, ${q(FIRMA)}, 0, 'publicada', 'redaccion', ${q(SLUG)}, ${AHORA}, ${q(redes)})
ON CONFLICT(id) DO UPDATE SET titulo = excluded.titulo, bajada = excluded.bajada, cuerpo = excluded.cuerpo, en_dos_lineas = excluded.en_dos_lineas, ficha = excluded.ficha, foto = excluded.foto, firma = excluded.firma, estado = 'publicada';
INSERT INTO sitio_notas (id, slug, publicada_en, origen, extra)
VALUES (${q(ID)}, ${q(SLUG)}, (SELECT creada FROM notas WHERE id = ${q(ID)}), 'redaccion', ${q(JSON.stringify({ fotosEnCuerpo: FOTOS_EN_CUERPO }))})
ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, origen = 'redaccion', extra = excluded.extra;
`;
}

/** El texto para que Hernán lo lea. */
export function textoParaLeer() {
  const n = NOTA;
  return `# Nota del media kit (para leer)

*Esta es la nota que reemplaza a la página \`/publicidad\` (que ahora redirige acá) y a la que lleva el aviso «Tu comercio acá». Sección ${n.seccion}, firma «${FIRMA}», con una imagen de portada y cinco láminas adentro (sin precios; se dibujan con \`scripts/imagenes-media-kit.mjs\`). Dirección: \`radarbalcarce.com/nota/${SLUG}-${ID}\`. El texto sale de \`v3/sitio/scripts/nota-media-kit.mjs\`: si querés cambiar algo, se cambia ahí y se vuelve a correr el SQL.*

---

**${n.titulo}**

*${n.bajada}*

En dos líneas: ${n.enDosLineas}

${n.cuerpo.join('\n\n')}

*${FIRMA}*
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const aqui = (r) => fileURLToPath(new URL(r, import.meta.url));
  writeFileSync(aqui('./salida/nota-media-kit.sql'), sqlDeLaNota());
  writeFileSync(aqui('../../../docs/propuestas/NOTA-MEDIA-KIT.md'), textoParaLeer());
  console.log('Listo: scripts/salida/nota-media-kit.sql y docs/propuestas/NOTA-MEDIA-KIT.md');
}
