# Relatório de Análise e Instruções de Deploy

**Data:** 17 de Janeiro de 2026  
**Repositório:** https://github.com/infotechd/app-lite  
**Versão Analisada:** Commit `92f833b` (main)

---

## 1. Resumo Executivo

O repositório **app-lite** está **pronto para build** com todas as melhorias solicitadas implementadas e testadas. A análise identificou apenas uma correção menor necessária no arquivo de configuração de ambiente.

### Status das Melhorias

| Melhoria | Status | Arquivos Principais |
|----------|--------|---------------------|
| Unificação de Perfil | ✅ Implementado | `User.ts`, `user.ts`, `RegisterScreen.tsx`, `BuscarOfertasScreen.tsx` |
| Miniatura no OfferCard | ✅ Implementado | `OfferCard.tsx`, `mediaUrl.ts` |
| Remoção Dark Theme | ✅ Implementado | `theme.ts` |

---

## 2. Análise Detalhada das Melhorias

### 2.1 Unificação de Perfil de Usuário

**Commits relacionados:**
- PR #84: `refactor/remove-obsolete-user-type`
- PR #77: `test/register-screen-validate-obsolete-tipo`

**Alterações implementadas:**

1. **Backend (`packages/backend/src/models/User.ts`):**
   - Campo `tipo` (comprador/prestador/anunciante) foi **removido**
   - Novo campo `tipoPessoa` (PF/PJ) adicionado para identificação fiscal
   - Validação condicional de CPF/CNPJ baseada no tipo de pessoa

2. **Mobile (`packages/mobile/src/types/user.ts`):**
   - Interface `User` atualizada sem campo `tipo`
   - Interface `RegisterData` com campos para PF/PJ

3. **Tela de Busca (`BuscarOfertasScreen.tsx`):**
   - Variável `canCreateOffer = true` para todos os usuários (linha 115)
   - Qualquer usuário autenticado pode criar ofertas

4. **Tela de Registro (`RegisterScreen.tsx`):**
   - `SegmentedButtons` para seleção PF/PJ
   - Campos dinâmicos baseados no tipo selecionado
   - Formatação automática de CPF/CNPJ

### 2.2 Miniatura de Imagem no OfferCard

**Commit relacionado:** PR #80: `feature/display-media-service-offer`

**Implementação:**

1. **Componente separado (`packages/mobile/src/components/offers/OfferCard.tsx`):**
   - Thumbnail 64x64px usando `expo-image`
   - Placeholder com ícone quando não há imagem
   - Cache e transição suave (300ms)

2. **Utilitário de URL (`packages/mobile/src/utils/mediaUrl.ts`):**
   - Função `toAbsoluteMediaUrl()` para converter URLs relativas
   - Suporte a respostas do Cloudinary (url, secure_url, path)

**Código relevante:**
```typescript
const thumbnailUrl = useMemo(() => {
    const primeiraImagem = item.imagens?.[0];
    return toAbsoluteMediaUrl(primeiraImagem);
}, [item.imagens]);
```

### 2.3 Remoção do Dark Theme

**Commit relacionado:** PR #79: `fix/remove-dark-mode`

**Implementação (`packages/mobile/src/styles/theme.ts`):**
- `MD3DarkTheme` comentado/removido
- `darkTokens` comentado
- Proxy `colors` sempre retorna `lightTokens`
- Comentário explicativo: "Forçado para 'light' para evitar o Dark Theme do sistema"

---

## 3. Correção Necessária

### 3.1 Arquivo `.env.production`

**Problema identificado:** Duplicação na variável API_URL

**Antes:**
```
API_URL=API_URL=https://api.app-super.digital
```

**Depois (corrigido):**
```
API_URL=https://api.app-super.digital
```

> ⚠️ Esta correção já foi aplicada localmente. Necessário fazer commit e push.

---

## 4. Instruções de Deploy

### 4.1 Pré-requisitos

Certifique-se de ter:
- Acesso SSH ao VPS (31.97.94.212)
- EAS CLI instalado (`npm install -g eas-cli`)
- Login no Expo (`npx eas login`)
- Conta Apple Developer (para iOS)

### 4.2 Deploy no VPS

#### Passo 1: Conectar ao VPS
```bash
ssh root@31.97.94.212
```

#### Passo 2: Atualizar código do repositório
```bash
cd /var/www/app-lite
git pull origin main
```

#### Passo 3: Deploy do Backend
```bash
cd /var/www/app-lite/packages/backend
pnpm install --frozen-lockfile
pnpm run build
sudo systemctl restart app-lite-backend
```

#### Passo 4: Deploy da Versão Web
```bash
cd /var/www/app-lite/packages/mobile
pnpm install --frozen-lockfile
npx expo export --platform web

# Copiar para diretório do nginx
sudo rm -rf /var/www/html/app-lite-web/*
sudo cp -r dist/* /var/www/html/app-lite-web/

# Recarregar nginx
sudo systemctl reload nginx
```

#### Passo 5: Verificar serviços
```bash
sudo systemctl status app-lite-backend
sudo systemctl status nginx
curl -I https://app-super.digital
curl -I https://api.app-super.digital/health
```

### 4.3 Build Mobile (EAS)

#### Android (APK)
```bash
cd packages/mobile
npx eas build --platform android --profile preview
```

Após o build:
1. Baixe o APK do dashboard Expo
2. Copie para o servidor:
```bash
scp app-lite.apk root@31.97.94.212:/var/www/html/app-lite-web/downloads/
```

#### iOS (TestFlight)
```bash
cd packages/mobile
npx eas build --platform ios --profile preview
npx eas submit --platform ios
```

### 4.4 Script Automatizado

Use o script de deploy incluído no repositório:
```bash
cd /var/www/app-lite/deploy
./deploy.sh all
```

---

## 5. URLs de Produção

| Serviço | URL |
|---------|-----|
| Versão Web | https://app-super.digital |
| API Backend | https://api.app-super.digital |
| Download APK | https://app-super.digital/downloads/app-lite.apk |
| Página de Download | https://app-super.digital/download.html |

---

## 6. Verificação Pós-Deploy

### Checklist de Testes

- [ ] Versão web carrega corretamente
- [ ] Login/Registro funcionando
- [ ] Criação de oferta disponível para todos os usuários
- [ ] OfferCard exibe miniatura de imagem
- [ ] Tema sempre claro (sem dark mode)
- [ ] APK instala e funciona no Android
- [ ] TestFlight disponível para iOS

### Comandos de Monitoramento

```bash
# Logs do backend
sudo journalctl -u app-lite-backend -f

# Logs do nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Status dos serviços
sudo systemctl status app-lite-backend mongod nginx
```

---

## 7. Troubleshooting

### Build EAS falha
```bash
npx expo-doctor
npx expo start --clear
```

### Backend não inicia
```bash
sudo journalctl -u app-lite-backend -n 100
sudo systemctl status mongod
```

### Erro de SSL
```bash
sudo certbot renew
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. Próximos Passos Recomendados

1. **Commit da correção do .env.production**
2. **Executar deploy no VPS**
3. **Gerar builds Android e iOS via EAS**
4. **Testar todas as funcionalidades**
5. **Atualizar página de download com novo APK**

---

*Relatório gerado automaticamente em 17/01/2026*
