-- Columnas que las notas propias (Telegram, etapa E) suman a la tabla `notas` del núcleo. Una sentencia por línea: SQLite/D1 no tiene
-- «ADD COLUMN IF NOT EXISTS», así que el workflow corre cada línea por separado y tolera el error «duplicate column name» (ya estaba).
-- Los nombres son los que usa v3/nucleo/CONTRATO.md; si el núcleo las suma en su schema.sql, correr esto de nuevo no rompe nada.
ALTER TABLE notas ADD COLUMN origen TEXT;
ALTER TABLE notas ADD COLUMN slug TEXT;
ALTER TABLE notas ADD COLUMN publicada_en TEXT;
ALTER TABLE notas ADD COLUMN redes TEXT;
CREATE INDEX IF NOT EXISTS idx_notas_slug ON notas (slug);
