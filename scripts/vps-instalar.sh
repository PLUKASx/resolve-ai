#!/usr/bin/env bash
set -euo pipefail

DOMINIO="${1:?Informe o domínio. Ex.: bash vps-instalar.sh 158-69-4-200.sslip.io}"
ZIP="/root/resolve-ai-servidor.zip"
APP="/opt/resolve-ai"
USUARIO="resolveai"

passo() { echo; echo "==> $*"; }

[ "$(id -u)" -eq 0 ] || { echo "Rode como root."; exit 1; }
[ -f "$ZIP" ] || { echo "Não encontrei $ZIP. Envie o pacote primeiro (publicar-vps.bat faz isso)."; exit 1; }

export DEBIAN_FRONTEND=noninteractive

if ! command -v caddy >/dev/null || ! command -v unzip >/dev/null; then
    passo "Instalando pacotes do sistema (só na primeira vez)"
    apt-get update -q
    apt-get install -y -q python3-venv unzip ufw caddy curl
fi

if ! swapon --show | grep -q .; then
    passo "Criando 1 GB de swap"
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

passo "Configurando o firewall (SSH, HTTP e HTTPS)"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

passo "Copiando o código para $APP"
id "$USUARIO" >/dev/null 2>&1 || useradd --system --home-dir "$APP" --shell /usr/sbin/nologin "$USUARIO"
mkdir -p "$APP"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
unzip -q -o "$ZIP" -d "$TMP"
rm -rf "$APP/app" "$APP/site"
cp -r "$TMP/app" "$TMP/site" "$APP/"
cp "$TMP/requirements.txt" "$TMP/iniciar_servidor.py" "$TMP/.env.exemplo" "$APP/"
mkdir -p "$APP/uploads"

if [ ! -f "$APP/.env" ]; then
    passo "Criando o .env com uma SECRET_KEY nova"
    CHAVE="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
    cat > "$APP/.env" <<EOF
SECRET_KEY=$CHAVE
DADOS_DEMO=sim
EOF
fi

if ! grep -q 'SMTP_HOST' "$APP/.env"; then
    passo "Acrescentando a configuração de e-mail (SMTP) ao .env"
    cat >> "$APP/.env" <<'EOF'

EOF
fi

passo "Instalando as dependências do Python"
[ -x "$APP/.venv/bin/python" ] || python3 -m venv "$APP/.venv"
"$APP/.venv/bin/pip" install -q --disable-pip-version-check --upgrade pip
"$APP/.venv/bin/pip" install -q --disable-pip-version-check -r "$APP/requirements.txt"

chown -R "$USUARIO:$USUARIO" "$APP"
chmod 600 "$APP/.env"

passo "Configurando o serviço (inicia sozinho e reinicia se cair)"
cat > /etc/systemd/system/resolve-ai.service <<EOF
[Unit]
Description=Resolve Ai! API
After=network.target

[Service]
User=$USUARIO
WorkingDirectory=$APP
EnvironmentFile=$APP/.env
ExecStart=$APP/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --proxy-headers --forwarded-allow-ips 127.0.0.1
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable resolve-ai >/dev/null 2>&1
systemctl restart resolve-ai

passo "Configurando o HTTPS para $DOMINIO"
cat > /etc/caddy/Caddyfile <<EOF
$DOMINIO {
    encode gzip
    request_body {
        max_size 10MB
    }
    reverse_proxy 127.0.0.1:8000
}
EOF
systemctl enable caddy >/dev/null 2>&1
systemctl reload caddy 2>/dev/null || systemctl restart caddy

passo "Testando"
for _ in $(seq 1 20); do
    curl -fsS http://127.0.0.1:8000/api/saude >/dev/null 2>&1 && break
    sleep 1
done
if ! curl -fsS http://127.0.0.1:8000/api/saude >/dev/null 2>&1; then
    echo "[ERRO] O backend não respondeu. Últimas linhas do log:"
    journalctl -u resolve-ai -n 30 --no-pager
    exit 1
fi
echo "Backend OK."

for _ in $(seq 1 30); do
    curl -fsS "https://$DOMINIO/api/saude" >/dev/null 2>&1 && break
    sleep 2
done
if curl -fsS "https://$DOMINIO/api/saude" >/dev/null 2>&1; then
    echo "HTTPS OK."
else
    echo "[AVISO] O HTTPS ainda não respondeu. O certificado pode levar 1-2 minutos."
    echo "        Para ver o que houve: journalctl -u caddy -n 50 --no-pager"
fi

echo
echo "=========================================================="
echo " Pronto!  https://$DOMINIO"
echo " API:     https://$DOMINIO/docs"
echo " Logs:    journalctl -u resolve-ai -f"
echo "=========================================================="
