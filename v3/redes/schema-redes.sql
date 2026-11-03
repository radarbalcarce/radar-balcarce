-- Lo que las redes suman a la base del núcleo (se aplica DESPUÉS de v3/nucleo/db/schema.sql y v3/sitio/db/schema-sitio.sql). Todo con IF NOT EXISTS.
-- Una fila por intento de publicar una nota en una red. No se toca ninguna tabla de otro módulo.

CREATE TABLE IF NOT EXISTS publicaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  red TEXT NOT NULL,              -- 'facebook' | 'instagram'
  nota_id TEXT NOT NULL,
  seccion TEXT,                   -- la sección de la nota (para el tope por sección)
  tipo TEXT,                      -- 'local' | 'nacional'
  cuando TEXT NOT NULL,           -- ISO UTC del intento
  dia TEXT NOT NULL,              -- AAAA-MM-DD en Balcarce
  estado TEXT NOT NULL,           -- 'enviando' (salió el pedido a Meta), 'ok', 'simulado', 'error'
  simulado INTEGER NOT NULL DEFAULT 0,  -- 1 = REDES_ACTIVAS en «no»: no se llamó a Meta
  id_meta TEXT,                   -- el id que devolvió Meta
  error TEXT,                     -- sin el token; con el código de Meta entre corchetes si lo hay
  texto TEXT                      -- el texto del posteo
);
CREATE INDEX IF NOT EXISTS idx_publicaciones_dia ON publicaciones (dia, red);
CREATE INDEX IF NOT EXISTS idx_publicaciones_nota ON publicaciones (nota_id);
-- Una nota sale una sola vez por red y por modo: dos vueltas que se pisan no la publican dos veces. Los intentos con error no cuentan.
CREATE UNIQUE INDEX IF NOT EXISTS uq_publicaciones_nota ON publicaciones (red, nota_id, simulado) WHERE estado IN ('enviando', 'ok', 'simulado');
