// Datos falsos compartidos por las pruebas de redactar y verificar.
export const palabras = (n) => Array.from({ length: n }, (_, i) => `palabra${i}`).join(' ');
export const notaJson = (extra = {}) => ({
  titulo: 'Camioneros tomó examen de licencia en Balcarce',
  bajada: 'La prueba se hizo en el sindicato.',
  cuerpo: [palabras(40) + '.', palabras(40) + '.'],
  seccion: 'Balcarce',
  enDosLineas: 'Pasó algo. Sigue otra cosa.',
  ficha: { que: 'examen', quien: 'Camioneros', donde: 'Balcarce', cuando: 'hoy', numeros: [], cronologia: [], faltaSaber: [] },
  noPublicar: null,
  ...extra,
});
export const art = (medio, extra = {}) => ({
  id: medio, url: `https://${medio}.com/n`, medio, oficial: false, titulo: `T ${medio}`, bajada: '', texto: 'x'.repeat(100),
  fecha: '2026-11-02T10:00:00Z', imagenes: [], ...extra,
});
