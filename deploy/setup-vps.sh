#!/bin/bash
# =============================================================================
# Script de Setup Inicial do VPS - App Lite
# Execute como root: sudo bash setup-vps.sh
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DOMAIN="app-super.digital"
EMAIL="admin@app-super.digital"  # Altere para seu email

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    log_error "Este script deve ser executado como root"
    exit 1
fi

log_info "=== Iniciando setup do VPS para App Lite ==="

# 1. Atualizar sistema
log_info "Atualizando sistema..."
apt update && apt upgrade -y

# 2. Instalar dependências básicas
log_info "Instalando dependências básicas..."
apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx

# 3. Instalar Node.js 22.x
log_info "Instalando Node.js 22.x..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# 4. Instalar pnpm
log_info "Instalando pnpm..."
npm install -g pnpm

# 5. Instalar MongoDB
log_info "Instalando MongoDB..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# 6. Criar diretórios
log_info "Criando diretórios..."
mkdir -p /var/www/app-lite
mkdir -p /var/www/html/app-lite-web
mkdir -p /var/www/certbot

# 7. Clonar repositório
log_info "Clonando repositório..."
cd /var/www
if [ -d "app-lite/.git" ]; then
    cd app-lite && git pull
else
    rm -rf app-lite
    git clone https://github.com/infotechd/app-lite.git
fi

# 8. Instalar dependências do projeto
log_info "Instalando dependências do projeto..."
cd /var/www/app-lite
pnpm install

# 9. Build do backend
log_info "Compilando backend..."
cd /var/www/app-lite/packages/backend
pnpm run build

# 10. Build web
log_info "Gerando build web..."
cd /var/www/app-lite/packages/mobile
npx expo export --platform web
cp -r dist/* /var/www/html/app-lite-web/

# 11. Configurar nginx
log_info "Configurando nginx..."
cp /var/www/app-lite/deploy/nginx/app-super.digital.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/app-super.digital.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 12. Testar configuração nginx
nginx -t

# 13. Configurar SSL com Let's Encrypt
log_info "Configurando SSL..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN --email $EMAIL --agree-tos --non-interactive || {
    log_warn "SSL não configurado. Execute manualmente: certbot --nginx -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN"
}

# 14. Configurar serviço systemd
log_info "Configurando serviço systemd..."
cp /var/www/app-lite/deploy/systemd/app-lite-backend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable app-lite-backend
systemctl start app-lite-backend

# 15. Reiniciar nginx
systemctl restart nginx

# 16. Configurar firewall
log_info "Configurando firewall..."
ufw allow 'Nginx Full'
ufw allow ssh
ufw --force enable

# 17. Ajustar permissões
log_info "Ajustando permissões..."
chown -R www-data:www-data /var/www/app-lite
chown -R www-data:www-data /var/www/html/app-lite-web

log_info "=== Setup concluído! ==="
echo ""
echo "Próximos passos:"
echo "1. Configure o arquivo .env.production em /var/www/app-lite/packages/backend/"
echo "2. Gere novas chaves JWT para produção"
echo "3. Configure o DNS do domínio $DOMAIN para apontar para este servidor"
echo "4. Verifique se o MongoDB está rodando: systemctl status mongod"
echo "5. Verifique se o backend está rodando: systemctl status app-lite-backend"
echo "6. Acesse https://$DOMAIN para testar"
