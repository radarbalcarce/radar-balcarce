// Poda la memoria de las tarjetas (web/lib/cache-tarjetas.js, regla 305) después de compilar: saca las imágenes que no se pidieron en
// los últimos DIAS_DE_MEMORIA días (una nota que salió del sitio, un título que cambió). Lo que se usó en esta compilación tiene la fecha
// de ahora, así que nunca se poda lo que sirve. Nunca frena el armado: si algo falla, lo dice y sigue.

import { carpetaDeLaMemoria, podarLaMemoria, DIAS_DE_MEMORIA } from '../lib/cache-tarjetas.js';
import fs from 'node:fs';

try {
  const carpeta = carpetaDeLaMemoria();
  if (!carpeta) console.log('Memoria de tarjetas apagada (TARJETAS_SIN_CACHE=1).');
  else {
    const sacadas = podarLaMemoria(carpeta);
    let quedan = 0;
    try { quedan = fs.readdirSync(carpeta).filter((n) => n.endsWith('.png')).length; } catch { /* sin carpeta */ }
    console.log(`Memoria de tarjetas: ${quedan} imágenes guardadas, ${sacadas} podadas (sin uso hace más de ${DIAS_DE_MEMORIA} días).`);
  }
} catch (e) {
  console.log(`(no se pudo podar la memoria de tarjetas: ${e.message})`);
}
