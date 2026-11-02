-- Las tablas del núcleo (D1). Las huellas (BLOB) se guardan como Float32Array en base64 (ver similitud.mjs).

CREATE TABLE IF NOT EXISTS articulos (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  fuente_id TEXT,
  medio TEXT,
  alcance TEXT,
  oficial INTEGER NOT NULL DEFAULT 0,
  titulo TEXT,
  bajada TEXT,
  texto TEXT,
  fecha TEXT,
  leido TEXT,
  imagenes TEXT,
  huella BLOB,
  historia_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_articulos_leido ON articulos (leido);
CREATE INDEX IF NOT EXISTS idx_articulos_historia ON articulos (historia_id);

CREATE TABLE IF NOT EXISTS historias (
  id TEXT PRIMARY KEY,
  creada TEXT NOT NULL,
  fecha_hecho TEXT NOT NULL,
  huella BLOB,
  titulo TEXT,
  medios TEXT,
  alcances TEXT,
  n_articulos INTEGER NOT NULL DEFAULT 1,
  estado TEXT NOT NULL DEFAULT 'viva',
  motivo TEXT,
  seccion TEXT,
  nota_id TEXT,
  actualizada TEXT
);
CREATE INDEX IF NOT EXISTS idx_historias_fecha ON historias (fecha_hecho);
CREATE INDEX IF NOT EXISTS idx_historias_estado ON historias (estado);

CREATE TABLE IF NOT EXISTS notas (
  id TEXT PRIMARY KEY,
  historia_id TEXT NOT NULL,
  creada TEXT NOT NULL,
  titulo TEXT,
  bajada TEXT,
  cuerpo TEXT,
  seccion TEXT,
  en_dos_lineas TEXT,
  ficha TEXT,
  no_publicar TEXT,
  verificacion TEXT,
  foto TEXT,
  fuentes TEXT,
  fecha_hecho TEXT,
  firma TEXT,
  pedidos INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'borrador'
);
CREATE INDEX IF NOT EXISTS idx_notas_historia ON notas (historia_id);
CREATE INDEX IF NOT EXISTS idx_notas_creada ON notas (creada);

CREATE TABLE IF NOT EXISTS fuentes_estado (
  fuente_id TEXT PRIMARY KEY,
  ultimo_ok TEXT,
  ultima_falla TEXT,
  fallas_seguidas INTEGER NOT NULL DEFAULT 0,
  avisada INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS uso_ia (
  dia TEXT NOT NULL,
  tarea TEXT NOT NULL,
  pedidos INTEGER NOT NULL DEFAULT 0,
  tokens_entrada INTEGER NOT NULL DEFAULT 0,
  tokens_salida INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, tarea)
);

CREATE TABLE IF NOT EXISTS dudas (
  a_id TEXT NOT NULL,
  b_id TEXT NOT NULL,
  cuando TEXT NOT NULL,
  respuesta INTEGER NOT NULL
);
