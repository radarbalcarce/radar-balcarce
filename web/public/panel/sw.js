// El service worker del panel del celular: lo que hace falta para que Chrome lo
// deje instalar como app, y que se abra aunque la conexión esté floja. Siempre
// pide primero la versión nueva a la red (un arreglo llega enseguida) y sólo si
// no hay red usa la guardada. Lo pide SALTEÁNDOSE la caché del navegador
// (`cache: 'reload'`): Cloudflare deja los archivos 4 horas en la caché y el
// panel se veía viejo (4/10). Nunca guarda nada de GitHub: las notas y la llave
// no pasan por acá.

const CACHE = 'radar-panel-23';
const ARCHIVOS = ['/panel/', '/panel/app.js', '/panel/github.js', '/panel/cifrado.js', '/panel/textos.js', '/panel/fechas.js', '/panel/numeros.js', '/panel/redes-estado.js', '/panel/revision.js', '/panel/pistas.js', '/panel/contactos.js', '/panel/fotos.js', '/panel/escribir.js', '/panel/hoy.js', '/panel/borradores.js', '/panel/recorrido.js', '/panel/nube.js', '/panel/manifest.webmanifest'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS.map((a) => new Request(a, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith('/panel/')) return;
  ev.respondWith(fetch(ev.request, { cache: 'reload' })
    .then((res) => {
      const copia = res.clone();
      caches.open(CACHE).then((c) => c.put(ev.request, copia)).catch(() => {});
      return res;
    })
    .catch(() => caches.match(ev.request, { ignoreSearch: true })));
});
