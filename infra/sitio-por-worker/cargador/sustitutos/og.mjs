// `next/og` (las tarjetas para compartir) NO se usa para armar una página de nota: las tarjetas se dibujan al compilar y viven en R2
// (docs/proyecto/SITIO-POR-WORKER-PLAN.md, § 3). Si algún día alguien la llama desde acá, que lo diga.

export class ImageResponse {
  constructor() { throw new Error('ImageResponse no está en el prototipo del sitio por Worker: las tarjetas vienen de R2'); }
}
