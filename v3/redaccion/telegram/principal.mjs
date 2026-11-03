// El punto de entrada del Worker (`main` del wrangler.toml): trae PERFIL.md y REDACCION.md al bundle como texto y arma el Worker con ellos.
// Está aparte de worker.mjs para que las pruebas (que no pueden importar .md) sigan importando worker.mjs.
import perfil from '../../nucleo/PERFIL.md';
import redaccion from '../../nucleo/redactar/REDACCION.md';
import { crearWorker } from './worker.mjs';

export default crearWorker({ perfil, redaccion });
