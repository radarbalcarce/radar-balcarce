// Cuentas con vectores: coseno, normalizar, centroide y pasar a texto para guardar en D1.

export function normalizar(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  const n = Math.sqrt(s);
  const salida = new Float32Array(v.length);
  if (n === 0) return salida;
  for (let i = 0; i < v.length; i++) salida[i] = v[i] / n;
  return salida;
}

export function coseno(a, b) {
  if (a.length !== b.length) throw new Error(`vectores de largo distinto (${a.length} y ${b.length})`);
  let punto = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    punto += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return punto / (Math.sqrt(na) * Math.sqrt(nb));
}

// Promedio de los vectores, normalizado.
export function centroide(vectores) {
  if (!vectores.length) throw new Error('centroide sin vectores');
  const suma = new Float32Array(vectores[0].length);
  for (const v of vectores) for (let i = 0; i < suma.length; i++) suma[i] += v[i];
  return normalizar(suma);
}

// Float32Array <-> texto base64 (btoa/atob existen en Workers y en Node).
export function aBase64(vector) {
  const bytes = new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function deBase64(texto) {
  const bin = atob(texto);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}
