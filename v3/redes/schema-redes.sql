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

-- Las piezas de video del día (clima, repaso, farmacia, efeméride, Participá). Una fila por intento de armar una pieza: el Worker decide qué toca y la reserva ('en-curso');
-- el programa que dibuja (GitHub Actions, v3-piezas.yml) la arma con la voz y cuenta cómo salió. Con REDES_ACTIVAS en «no» queda en 'lista' (armada y guardada, NO publicada).
CREATE TABLE IF NOT EXISTS piezas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pieza TEXT NOT NULL,            -- el id de la tabla de piezas del día (clima-manana, noticia1…)
  dia TEXT NOT NULL,              -- AAAA-MM-DD en Balcarce
  hora TEXT,                      -- la hora programada (HH:MM)
  bloque TEXT,                    -- manana | tarde | noche (para quién saluda)
  simulado INTEGER NOT NULL DEFAULT 1,   -- 1 = ensayo: se arma y se guarda, no se publica
  estado TEXT NOT NULL,           -- 'en-curso' | 'lista' (ensayo) | 'publicada' | 'error' | 'sin-datos' | 'sin-cupo'
  creada TEXT NOT NULL,           -- ISO UTC: cuándo se reservó
  actualizada TEXT NOT NULL,
  voz_usada INTEGER NOT NULL DEFAULT 0,  -- audios que gastó (0 si salió de la memoria de voces)
  huella TEXT,                    -- resumen del guion + datos (la misma entrada, el mismo video)
  duracion REAL,                  -- segundos del video
  guion TEXT,                     -- lo que dijo la voz
  texto TEXT,                     -- el texto del posteo (el de Facebook)
  archivos TEXT,                  -- JSON: nombres de los archivos que dejó (artefacto de la corrida o R2)
  acciones TEXT,                  -- JSON: [{ red, tipo, estado: 'simulada' | 'ok' | 'error', id?, error? }]
  notas TEXT,                     -- JSON: ids de las notas del repaso (para no repetir en el repaso siguiente)
  auspicio TEXT,                  -- JSON: { comercio, cuenta } del clima auspiciado
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_piezas_dia ON piezas (dia, simulado);
-- Una pieza sale una sola vez por día y por modo: dos corridas que se pisan no la arman dos veces. Los intentos con error o sin datos no cuentan.
CREATE UNIQUE INDEX IF NOT EXISTS uq_piezas_dia ON piezas (pieza, dia, simulado) WHERE estado IN ('en-curso', 'lista', 'publicada');
