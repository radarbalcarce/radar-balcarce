-- Lo que el sitio suma a la base del núcleo (se aplica DESPUÉS de v3/nucleo/db/schema.sql). Todo con IF NOT EXISTS: correrlo de nuevo no rompe nada.
-- No se toca la tabla `notas` del núcleo: lo propio del sitio vive en `sitio_notas`, una fila por nota, unida por id.

CREATE TABLE IF NOT EXISTS sitio_notas (
  id TEXT PRIMARY KEY,             -- el mismo id que notas.id
  slug TEXT NOT NULL,              -- el titular en guiones; se fija una vez y no cambia
  publicada_en TEXT NOT NULL,      -- ISO UTC: cuándo salió (orden del sitio, mapas y feed)
  origen TEXT NOT NULL DEFAULT 'nucleo',  -- 'nucleo' | 'viejo' | 'redaccion'
  extra TEXT                       -- JSON opcional: fotosEnCuerpo y otras cosas de las notas viejas
);
CREATE INDEX IF NOT EXISTS idx_sitio_notas_publicada ON sitio_notas (publicada_en);
CREATE INDEX IF NOT EXISTS idx_notas_estado_seccion ON notas (estado, seccion);
