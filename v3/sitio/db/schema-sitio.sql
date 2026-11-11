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

-- Los avisos locales (comercios que pautan). Se cargan con scripts/cargar-aviso.mjs; ver docs/propuestas/MANUAL-AVISOS-3-0.md.
CREATE TABLE IF NOT EXISTS avisos (
  id TEXT PRIMARY KEY,             -- corto y sin espacios (ej. sweet-candy-bar)
  comercio TEXT NOT NULL,          -- el nombre del comercio
  texto TEXT,                      -- una línea (si no hay imagen, es lo que se ve)
  imagen TEXT,                     -- dirección https de la imagen del aviso (o /fotos-notas/…), opcional
  enlace TEXT,                     -- a dónde lleva (https), opcional
  plan TEXT,                       -- 5000 | 10000 | 20000 | 30000 | 50000 | libre
  lugares TEXT NOT NULL DEFAULT '[]',  -- JSON: 'fijo' | 'postales' | 'columna' | 'pie' | 'clima'
  desde TEXT,                      -- AAAA-MM-DD (inclusive), vacío = ya
  hasta TEXT,                      -- AAAA-MM-DD (inclusive), vacío = sin fin
  activo INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_avisos_activo ON avisos (activo, desde, hasta);

-- El contador propio (REGLAS.md § 11): sólo sumas por día, sin IP, sin User-Agent y sin ningún identificador de persona. Lo escribe db/lecturas.mjs.
-- Páginas vistas por personas (no robots). `dia` es la fecha de Balcarce (AAAA-MM-DD).
CREATE TABLE IF NOT EXISTS lecturas_dia (
  dia TEXT NOT NULL,
  tipo TEXT NOT NULL,              -- portada | nota | seccion | clima | farmacias | otra
  ruta TEXT NOT NULL,              -- sin consulta, hasta 200 caracteres
  zona TEXT NOT NULL,              -- balcarce | provincia | argentina | afuera | desconocido
  origen TEXT NOT NULL,            -- directo | interno | google | facebook | instagram | x | otro-sitio
  aparato TEXT NOT NULL,           -- celular | escritorio
  vistas INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, tipo, ruta, zona, origen, aparato)
);
-- Cuántas veces se mostró y se tocó cada aviso propio (los de AdSense los mide Google).
CREATE TABLE IF NOT EXISTS avisos_dia (
  dia TEXT NOT NULL,
  aviso_id TEXT NOT NULL,
  lugar TEXT NOT NULL,             -- T1, N2… o '' si no se sabe
  impresiones INTEGER NOT NULL DEFAULT 0,
  clics INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, aviso_id, lugar)
);

-- El panel privado (/panel, REGLAS.md «El panel»). Sólo se guardan huellas SHA-256 (hex) de los tokens, nunca el token.
-- Los enlaces de un solo uso que da el bot de Telegram (/panel): vencen a los 15 minutos. (El bot también crea esta tabla, por si se sube antes que el sitio.)
CREATE TABLE IF NOT EXISTS panel_accesos (token TEXT PRIMARY KEY, vence TEXT NOT NULL, usado TEXT);
-- Las sesiones abiertas (cookie `panel`, 30 días).
CREATE TABLE IF NOT EXISTS panel_sesiones (token TEXT PRIMARY KEY, creada TEXT NOT NULL, vence TEXT NOT NULL, ultima TEXT);
