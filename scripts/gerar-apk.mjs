import { execFileSync, execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOBILE = path.join(RAIZ, 'mobile');
const SAIDA = path.join(RAIZ, 'apks');
const ARQUIVO_SITE = path.join(MOBILE, 'site.txt');
const ARQUIVO_VERSOES = path.join(SAIDA, 'versao-app.json');
const ASSINATURA = path.join(MOBILE, 'assinatura');
const KEYSTORE = path.join(ASSINATURA, 'resolveai.keystore');
const SENHA_KEYSTORE = path.join(ASSINATURA, 'senha.txt');

const APPS = {
  cidadao: { appId: 'br.com.resolveai.cidadao', nome: 'Resolve Aí', apk: 'ResolveAi-Cidadao.apk', caminho: '/app' },
  gestor: { appId: 'br.com.resolveai.gestor', nome: 'Resolve Aí Gestão', apk: 'ResolveAi-Gestor.apk', caminho: '/gestao' },
};

const PERMISSOES = [
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.CAMERA',
];

const ASSINATURA_GRADLE = `    signingConfigs {
        release {
            def keystore = System.getenv("RA_KEYSTORE")
            if (keystore) {
                storeFile file(keystore)
                storePassword System.getenv("RA_KEYSTORE_SENHA")
                keyAlias "resolveai"
                keyPassword System.getenv("RA_KEYSTORE_SENHA")
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
`;

function falhar(mensagem) {
  console.error(`\n[ERRO] ${mensagem}\n`);
  process.exit(1);
}

function rodar(comando, cwd, env = {}) {
  console.log(`> ${comando}`);
  execSync(comando, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
}

function lerJson(arquivo, padrao) {
  return fs.existsSync(arquivo) ? JSON.parse(fs.readFileSync(arquivo, 'utf8')) : padrao;
}

function enderecoDoSite() {
  const salvo = fs.existsSync(ARQUIVO_SITE) ? fs.readFileSync(ARQUIVO_SITE, 'utf8').trim() : '';
  const url = (process.argv[2] || salvo).replace(/\/+$/, '');
  if (!url) falhar('Informe o endereço do site. Ex.: gerar-apk.bat https://resolveai.netlify.app');
  if (!/^https?:\/\/[^/]+$/.test(url)) falhar(`Endereço inválido: "${url}". Use algo como https://resolveai.netlify.app`);
  fs.writeFileSync(ARQUIVO_SITE, `${url}\n`);
  return url;
}

function javaHome() {
  const candidatos = [
    process.env.JAVA_HOME,
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Android Studio', 'jbr'),
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'jdk-21'),
  ].filter(Boolean);
  for (const dir of candidatos) {
    const java = path.join(dir, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    if (!fs.existsSync(java)) continue;
    const versao = execSync(`"${java}" -version 2>&1`).toString();
    if (Number((versao.match(/version "(\d+)/) || [])[1]) >= 21) return dir;
  }
  falhar('Java 21 não encontrado. Instale o Android Studio (ele já traz o Java certo).');
}

function sdkAndroid() {
  const dir = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
  ].find((d) => d && fs.existsSync(d));
  if (!dir) falhar('Android SDK não encontrado. Abra o Android Studio uma vez para ele baixar o SDK.');
  return dir;
}

function chaveDeAssinatura(java) {
  if (!fs.existsSync(KEYSTORE)) {
    fs.mkdirSync(ASSINATURA, { recursive: true });
    const senha = crypto.randomBytes(18).toString('base64url');
    const keytool = path.join(java, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool');
    execFileSync(keytool, [
      '-genkeypair', '-keystore', KEYSTORE, '-alias', 'resolveai', '-keyalg', 'RSA', '-keysize', '2048',
      '-validity', '10000', '-storepass', senha, '-keypass', senha, '-dname', 'CN=Resolve Ai, O=Resolve Ai, C=BR',
    ], { stdio: 'inherit' });
    fs.writeFileSync(SENHA_KEYSTORE, senha);
    console.log(`\nChave de assinatura criada em ${ASSINATURA}. FAÇA BACKUP desta pasta!\n`);
  }
  return { RA_KEYSTORE: KEYSTORE, RA_KEYSTORE_SENHA: fs.readFileSync(SENHA_KEYSTORE, 'utf8').trim() };
}

function paginaDeErro(urlApp) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Sem conexão</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif;
         background: #f4f7fb; color: #1f2a37; text-align: center; padding: 24px; box-sizing: border-box; }
  h1 { font-size: 20px; margin: 12px 0 6px; }
  p { color: #5b6b7f; margin: 0 0 20px; }
  button { border: 0; border-radius: 12px; padding: 14px 22px; font-size: 16px; font-weight: 600;
           background: #2f80d1; color: #fff; }
</style>
</head>
<body>
<div>
  <div style="font-size:48px">📡</div>
  <h1>Sem conexão com a internet</h1>
  <p>O Resolve Aí precisa de internet para funcionar.</p>
  <button onclick="location.href='${urlApp}'">Tentar novamente</button>
</div>
</body>
</html>
`;
}

function ajustarProjetoAndroid(android, versao) {
  const manifesto = path.join(android, 'app', 'src', 'main', 'AndroidManifest.xml');
  let xml = fs.readFileSync(manifesto, 'utf8');
  const faltando = PERMISSOES.filter((p) => !xml.includes(`"${p}"`));
  if (faltando.length) {
    const linhas = faltando.map((p) => `    <uses-permission android:name="${p}" />`).join('\n');
    fs.writeFileSync(manifesto, xml.replace('</manifest>', `${linhas}\n</manifest>`));
  }

  const gradle = path.join(android, 'app', 'build.gradle');
  let build = fs.readFileSync(gradle, 'utf8');
  if (!build.includes('signingConfigs')) {
    build = build.replace('    buildTypes {\n        release {\n', ASSINATURA_GRADLE);
    if (!build.includes('signingConfigs')) falhar('Não consegui configurar a assinatura em app/build.gradle.');
  }
  build = build.replace(/versionCode \d+/, `versionCode ${versao}`).replace(/versionName "[^"]*"/, `versionName "1.${versao}"`);
  fs.writeFileSync(gradle, build);
}

function gerar(perfil, urlSite, ambiente, versoes) {
  const app = APPS[perfil];
  const dir = path.join(MOBILE, perfil);
  const android = path.join(dir, 'android');
  const urlApp = `${urlSite}${app.caminho}`;
  const versao = (versoes[perfil]?.versao ?? 0) + 1;
  console.log(`\n========== APK ${app.nome} — versão ${versao} ==========\n`);

  const deps = lerJson(path.join(MOBILE, 'package.json')).dependencies;
  fs.mkdirSync(path.join(dir, 'www'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
    name: `resolve-ai-${perfil}`,
    private: true,
    dependencies: {
      '@capacitor/android': deps['@capacitor/android'],
      '@capacitor/app': deps['@capacitor/app'],
      '@capacitor/browser': deps['@capacitor/browser'],
      '@capacitor/geolocation': deps['@capacitor/geolocation'],
      'capacitor-native-settings': deps['capacitor-native-settings'],
      '@capacitor/core': deps['@capacitor/core'],
    },
  }, null, 2));
  fs.writeFileSync(path.join(dir, 'www', 'index.html'), paginaDeErro(urlApp));
  fs.writeFileSync(path.join(dir, 'www', 'erro.html'), paginaDeErro(urlApp));
  fs.writeFileSync(path.join(dir, 'capacitor.config.json'), JSON.stringify({
    appId: app.appId,
    appName: app.nome,
    webDir: 'www',
    appendUserAgent: `ResolveAi/${perfil}/${versao}`,
    server: { url: urlApp, errorPath: 'erro.html', ...(urlSite.startsWith('http://') && { cleartext: true }) },
  }, null, 2));

  if (!fs.existsSync(android)) rodar('npx cap add android', dir);
  rodar('npx cap sync android', dir);
  ajustarProjetoAndroid(android, versao);

  fs.writeFileSync(path.join(android, 'local.properties'), `sdk.dir=${ambiente.sdk.replace(/\\/g, '/')}\n`);
  const gradlew = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
  rodar(`${gradlew} assembleRelease`, android, { JAVA_HOME: ambiente.java, ...ambiente.assinatura });

  fs.mkdirSync(SAIDA, { recursive: true });
  const destino = path.join(SAIDA, app.apk);
  fs.copyFileSync(path.join(android, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'), destino);
  versoes[perfil] = { versao, url: `/downloads/${app.apk}` };
  fs.writeFileSync(ARQUIVO_VERSOES, `${JSON.stringify(versoes, null, 2)}\n`);
  console.log(`\nAPK pronto: ${destino} (versão ${versao})`);
}

const urlSite = enderecoDoSite();
const perfis = process.argv[3] ? [process.argv[3]] : Object.keys(APPS);
if (perfis.some((p) => !APPS[p])) falhar('Perfil inválido. Use "cidadao" ou "gestor".');

const java = javaHome();
const ambiente = { java, sdk: sdkAndroid(), assinatura: chaveDeAssinatura(java) };
const dependencias = Object.keys(lerJson(path.join(MOBILE, 'package.json')).dependencies);
if (dependencias.some((d) => !fs.existsSync(path.join(MOBILE, 'node_modules', ...d.split('/'))))) {
  rodar('npm install --no-audit --no-fund', MOBILE);
}

const versoes = lerJson(ARQUIVO_VERSOES, {});
for (const perfil of perfis) gerar(perfil, urlSite, ambiente, versoes);

console.log(`\nPronto! Os APKs estão em: ${SAIDA}`);
console.log('Agora rode gerar-site.bat e publique na Netlify para os celulares receberem o aviso de atualização.');
