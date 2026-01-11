#!/bin/bash
# =============================================================================
# Script de Deploy - App Lite
# Uso: ./deploy.sh [backend|web|all]
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
APP_DIR="/var/www/app-lite"
BACKEND_DIR="$APP_DIR/packages/backend"
MOBILE_DIR="$APP_DIR/packages/mobile"
DOMAIN="app-super.digital"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

deploy_backend() {
    log_info "Iniciando deploy do backend..."
    
    cd "$BACKEND_DIR"
    
    # Instalar dependências
    log_info "Instalando dependências..."
    pnpm install --frozen-lockfile
    
    # Build do TypeScript
    log_info "Compilando TypeScript..."
    pnpm run build
    
    # Reiniciar serviço
    log_info "Reiniciando serviço backend..."
    sudo systemctl restart app-lite-backend
    
    log_info "Backend deployado com sucesso!"
}

deploy_web() {
    log_info "Iniciando deploy da versão web..."
    
    cd "$MOBILE_DIR"
    
    # Instalar dependências
    log_info "Instalando dependências..."
    pnpm install --frozen-lockfile
    
    # Build web
    log_info "Gerando build web..."
    npx expo export --platform web
    
    # Copiar para diretório nginx
    log_info "Copiando arquivos para nginx..."
    sudo rm -rf /var/www/html/app-lite-web/*
    sudo cp -r dist/* /var/www/html/app-lite-web/
    
    # Reiniciar nginx
    log_info "Reiniciando nginx..."
    sudo systemctl reload nginx
    
    log_info "Versão web deployada com sucesso!"
}

case "$1" in
    backend)
        deploy_backend
        ;;
    web)
        deploy_web
        ;;
    all)
        deploy_backend
        deploy_web
        ;;
    *)
        echo "Uso: $0 [backend|web|all]"
        exit 1
        ;;
esac
