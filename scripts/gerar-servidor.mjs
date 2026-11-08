import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = path.join(RAIZ, 'frontend');
const BACKEND = path.join(RAIZ, 'backend');
const PACOTE = path.join(RAIZ, 'deploy', 'servidor');
const ZIP = path.join(RAIZ, 'deploy', 'resolve-ai-servidor.zip');

function rodar(comando, cwd) {
  console.log(`> ${comando}`);
  execSync(comando, { cwd, stdio: 'inherit' });
}

if (!fs.existsSync(path.join(FRONTEND, 'node_modules'))) rodar('npm install --no-audit --no-fund', FRONTEND);
rodar(`npm run build -- --outDir "${path.join(BACKEND, 'site')}" --emptyOutDir`, FRONTEND);

fs.rmSync(PACOTE, { recursive: true, force: true });
fs.mkdirSync(PACOTE, { recursive: true });
const semCache = (origem) => !origem.includes('__pycache__');
fs.cpSync(path.join(BACKEND, 'app'), path.join(PACOTE, 'app'), { recursive: true, filter: semCache });
fs.cpSync(path.join(BACKEND, 'site'), path.join(PACOTE, 'site'), { recursive: true });
for (const arquivo of ['requirements.txt', 'iniciar_servidor.py']) {
  fs.copyFileSync(path.join(BACKEND, arquivo), path.join(PACOTE, arquivo));
}
const modeloEnv = ['env.exemplo', '.env.exemplo'].map((a) => path.join(BACKEND, a)).find((a) => fs.existsSync(a));
if (!modeloEnv) {
  console.error('\n[ERRO] Não encontrei backend/env.exemplo (modelo de configuração).\n');
  process.exit(1);
}
fs.copyFileSync(modeloEnv, path.join(PACOTE, '.env.exemplo'));

fs.rmSync(ZIP, { force: true });
const tar = process.platform === 'win32' ? `"${process.env.SystemRoot}\\System32\\tar.exe"` : 'tar';
rodar(`${tar} -a -c -f "${ZIP}" app site requirements.txt iniciar_servidor.py .env.exemplo`, PACOTE);
console.log(`\nPacote pronto: ${ZIP}`);
