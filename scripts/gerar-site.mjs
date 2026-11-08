import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = path.join(RAIZ, 'frontend');
const APKS = path.join(RAIZ, 'apks');
const SAIDA = path.join(RAIZ, 'deploy', 'netlify');
const ARQUIVO_BACKEND = path.join(RAIZ, 'deploy', 'backend.txt');

function falhar(mensagem) {
  console.error(`\n[ERRO] ${mensagem}\n`);
  process.exit(1);
}

function rodar(comando, cwd) {
  console.log(`> ${comando}`);
  execSync(comando, { cwd, stdio: 'inherit' });
}

const salvo = fs.existsSync(ARQUIVO_BACKEND) ? fs.readFileSync(ARQUIVO_BACKEND, 'utf8').trim() : '';
const backend = (process.argv[2] || salvo).replace(/\/+$/, '');
if (!backend) falhar('Informe o endereço do servidor. Ex.: gerar-site.bat https://158-69-4-200.sslip.io');
if (!/^https?:\/\/[^/]+$/.test(backend)) falhar(`Endereço inválido: "${backend}". Use algo como https://158-69-4-200.sslip.io`);
fs.mkdirSync(path.dirname(ARQUIVO_BACKEND), { recursive: true });
fs.writeFileSync(ARQUIVO_BACKEND, `${backend}\n`);

if (!fs.existsSync(path.join(FRONTEND, 'node_modules'))) rodar('npm install --no-audit --no-fund', FRONTEND);
rodar(`npm run build -- --outDir "${SAIDA}" --emptyOutDir`, FRONTEND);

fs.writeFileSync(path.join(SAIDA, '_redirects'), [
  `/api/*          ${backend}/api/:splat          200`,
  `/uploads/*      ${backend}/uploads/:splat      200`,
  `/docs           ${backend}/docs                200`,
  `/openapi.json   ${backend}/openapi.json        200`,
  '/*              /index.html                    200',
  '',
].join('\n'));

fs.writeFileSync(path.join(SAIDA, '_headers'), [
  '/downloads/*',
  '  Content-Type: application/vnd.android.package-archive',
  '/versao-app.json',
  '  Cache-Control: no-cache',
  '',
].join('\n'));

const versoes = fs.existsSync(path.join(APKS, 'versao-app.json'))
  ? JSON.parse(fs.readFileSync(path.join(APKS, 'versao-app.json'), 'utf8'))
  : {};
const publicadas = {};
for (const [perfil, info] of Object.entries(versoes)) {
  const arquivo = path.basename(info.url || '');
  if (!arquivo || !fs.existsSync(path.join(APKS, arquivo))) continue;
  fs.mkdirSync(path.join(SAIDA, 'downloads'), { recursive: true });
  fs.copyFileSync(path.join(APKS, arquivo), path.join(SAIDA, 'downloads', arquivo));
  publicadas[perfil] = info;
}
if (Object.keys(publicadas).length) {
  fs.writeFileSync(path.join(SAIDA, 'versao-app.json'), `${JSON.stringify(publicadas, null, 2)}\n`);
  console.log(`\nAPKs incluídos em /downloads: ${Object.keys(publicadas).join(', ')}.`);
} else {
  console.log('\nAinda não há APKs na pasta apks (rode gerar-apk.bat e gere o site de novo).');
}

console.log(`\nSite pronto em: ${SAIDA}`);
console.log('Arraste essa pasta para a Netlify (aba Deploys do seu site).');
