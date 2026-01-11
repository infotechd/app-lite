# Guia de Deployment - App Lite

Este documento descreve o processo completo para fazer o deploy do App Lite no seu VPS e distribuir o aplicativo para usuários de teste.

## Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração do VPS](#configuração-do-vps)
3. [Build e Deploy do Backend](#build-e-deploy-do-backend)
4. [Build e Deploy da Versão Web](#build-e-deploy-da-versão-web)
5. [Build do App Mobile (EAS)](#build-do-app-mobile-eas)
6. [Distribuição para Testadores](#distribuição-para-testadores)
7. [Manutenção e Atualizações](#manutenção-e-atualizações)

---

## Pré-requisitos

### Infraestrutura
- **VPS**: Ubuntu 22.04 LTS (mínimo 2GB RAM, 20GB disco)
- **Domínio**: app-super.digital (com acesso ao DNS)
- **Conta Expo**: Plano Starter (infotechd)
- **Cloudinary**: Plano Plus (dov0gi0q5)

### Ferramentas Locais
- Node.js 22.x
- pnpm 10.x
- Git
- EAS CLI (`npm install -g eas-cli`)

---

## Configuração do VPS

### 1. Acesso ao VPS

```bash
ssh root@31.97.94.212
```

### 2. Executar Script de Setup

O script `setup-vps.sh` automatiza toda a configuração inicial:

```bash
# Baixar o repositório
git clone https://github.com/infotechd/app-lite.git /tmp/app-lite

# Executar setup
cd /tmp/app-lite/deploy
chmod +x setup-vps.sh
sudo bash setup-vps.sh
```

O script irá:
- Atualizar o sistema
- Instalar Node.js 22.x, pnpm, MongoDB, Nginx
- Configurar SSL com Let's Encrypt
- Criar serviço systemd para o backend
- Configurar firewall

### 3. Configurar DNS

No painel do seu registrador de domínio, adicione os seguintes registros:

| Tipo | Nome | Valor |
|------|------|-------|
| A | @ | 31.97.94.212 |
| A | www | 31.97.94.212 |
| A | api | 31.97.94.212 |

### 4. Configurar Variáveis de Ambiente

Edite o arquivo de produção do backend:

```bash
nano /var/www/app-lite/packages/backend/.env.production
```

**IMPORTANTE**: Gere novas chaves JWT para produção:

```bash
# Gerar JWT_SECRET
openssl rand -base64 64

# Gerar JWT_REFRESH_SECRET
openssl rand -base64 64
```

### 5. Verificar Serviços

```bash
# Verificar MongoDB
sudo systemctl status mongod

# Verificar Backend
sudo systemctl status app-lite-backend

# Verificar Nginx
sudo systemctl status nginx

# Ver logs do backend
sudo journalctl -u app-lite-backend -f
```

---

## Build e Deploy do Backend

### Deploy Manual

```bash
cd /var/www/app-lite/packages/backend

# Atualizar código
git pull origin main

# Instalar dependências
pnpm install --frozen-lockfile

# Build
pnpm run build

# Reiniciar serviço
sudo systemctl restart app-lite-backend
```

### Usando Script de Deploy

```bash
cd /var/www/app-lite/deploy
./deploy.sh backend
```

---

## Build e Deploy da Versão Web

### Build Local

```bash
cd packages/mobile

# Gerar build web
npx expo export --platform web
```

### Deploy no VPS

```bash
# Copiar arquivos para o servidor
scp -r dist/* root@31.97.94.212:/var/www/html/app-lite-web/

# Ou usando o script
./deploy.sh web
```

### Verificar

Acesse https://app-super.digital para verificar se a versão web está funcionando.

---

## Build do App Mobile (EAS)

### 1. Login no EAS

```bash
npx eas login
```

### 2. Build Android (APK)

Para distribuição interna via APK:

```bash
cd packages/mobile

# Build de preview (APK para testes)
npx eas build --platform android --profile preview
```

O build será processado na nuvem do Expo. Ao finalizar, você receberá um link para download do APK.

### 3. Build iOS (TestFlight)

Para iOS, é necessário ter uma conta Apple Developer ($99/ano):

```bash
# Build de preview para TestFlight
npx eas build --platform ios --profile preview
```

### 4. Acompanhar Builds

```bash
# Ver status dos builds
npx eas build:list

# Ver detalhes de um build específico
npx eas build:view
```

---

## Distribuição para Testadores

### Android

1. Faça o build com perfil `preview`
2. Baixe o APK do dashboard do Expo
3. Hospede o APK no seu servidor:

```bash
# Criar diretório de downloads
mkdir -p /var/www/html/app-lite-web/downloads

# Copiar APK
cp app-lite.apk /var/www/html/app-lite-web/downloads/
```

4. Compartilhe o link: `https://app-super.digital/downloads/app-lite.apk`

### iOS (TestFlight)

1. Faça o build com perfil `preview`
2. Submeta para TestFlight:

```bash
npx eas submit --platform ios
```

3. No App Store Connect:
   - Adicione testadores internos
   - Envie convites por email

### Página de Download

Uma página de download está disponível em `/deploy/download-page/index.html`. Copie para o servidor:

```bash
cp deploy/download-page/index.html /var/www/html/app-lite-web/download.html
```

Acesse: https://app-super.digital/download.html

---

## Manutenção e Atualizações

### Atualizar Código

```bash
cd /var/www/app-lite
git pull origin main
./deploy/deploy.sh all
```

### OTA Updates (Over-The-Air)

Para atualizações JavaScript sem novo build:

```bash
cd packages/mobile

# Publicar atualização
npx eas update --branch preview --message "Descrição da atualização"
```

### Monitoramento

```bash
# Logs do backend
sudo journalctl -u app-lite-backend -f

# Logs do nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Status dos serviços
sudo systemctl status app-lite-backend mongod nginx
```

### Backup do Banco de Dados

```bash
# Criar backup
mongodump --db app-lite-prod --out /backup/$(date +%Y%m%d)

# Restaurar backup
mongorestore --db app-lite-prod /backup/20240101/app-lite-prod
```

---

## Troubleshooting

### Backend não inicia

```bash
# Verificar logs
sudo journalctl -u app-lite-backend -n 100

# Verificar se MongoDB está rodando
sudo systemctl status mongod

# Verificar porta
sudo netstat -tlnp | grep 4000
```

### Erro de SSL

```bash
# Renovar certificado
sudo certbot renew

# Verificar configuração nginx
sudo nginx -t
```

### Build EAS falha

```bash
# Verificar expo-doctor
cd packages/mobile
npx expo-doctor

# Limpar cache
npx expo start --clear
```

---

## Contatos e Suporte

- **Repositório**: https://github.com/infotechd/app-lite
- **Expo Dashboard**: https://expo.dev/accounts/infotechd
- **Cloudinary**: https://cloudinary.com/console

---

*Última atualização: Janeiro 2026*
