# Análise de Bugs - Tela de Editar Perfil

## Resumo Executivo

Foram identificados dois problemas críticos na tela de edição de perfil:

1. **Teclado não abre na versão Web mobile** - Os campos de input não recebem foco corretamente
2. **Dois títulos "Editar Perfil" duplicados** - Header duplicado na navegação

---

## Bug #1: Teclado Não Abre na Versão Web

### Diagnóstico

Ao analisar o arquivo `EditProfileScreen.tsx`, identifiquei a **causa raiz** do problema:

**Linha 144**: O componente `TouchableWithoutFeedback` envolve todo o `ScrollView` e executa `Keyboard.dismiss` ao ser pressionado:

```tsx
<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
  <ScrollView ...>
    {/* Inputs aqui */}
  </ScrollView>
</TouchableWithoutFeedback>
```

#### Por que funciona no Mobile (Expo Go) mas não na Web?

| Plataforma | Comportamento |
|------------|---------------|
| **iOS/Android** | O `TouchableWithoutFeedback` captura toques na área vazia, mas os `TextInput` têm prioridade e recebem o foco normalmente |
| **Web (Browser)** | O evento `onPress` do `TouchableWithoutFeedback` é disparado **antes** do foco do input, causando `Keyboard.dismiss()` que impede o teclado virtual de abrir |

### Solução Proposta

Condicionar o uso do `TouchableWithoutFeedback` apenas para plataformas nativas:

```tsx
// Importar Platform
import { Platform } from 'react-native';

// Criar wrapper condicional
const DismissKeyboardWrapper = Platform.OS === 'web' 
  ? React.Fragment 
  : TouchableWithoutFeedback;

// Usar no render
<DismissKeyboardWrapper {...(Platform.OS !== 'web' && { onPress: Keyboard.dismiss })}>
  <ScrollView ...>
```

**Alternativa mais limpa**: Usar `Pressable` com verificação de target para não interferir nos inputs.

---

## Bug #2: Dois Títulos "Editar Perfil"

### Diagnóstico

A duplicação ocorre porque existem **duas fontes de header**:

1. **ProfileNavigator.tsx (linha 20)**: Define o header nativo do React Navigation
   ```tsx
   <Stack.Screen name="EditProfile" component={EditProfile} options={{ title: 'Editar Perfil' }} />
   ```

2. **EditProfileScreen.tsx (linha 134-137)**: Renderiza um `Appbar.Header` do React Native Paper
   ```tsx
   <Appbar.Header elevated>
     <Appbar.BackAction onPress={() => navigation.goBack()} />
     <Appbar.Content title="Editar Perfil" />
   </Appbar.Header>
   ```

### Solução Proposta

**Opção A (Recomendada)**: Ocultar o header nativo do React Navigation e manter apenas o `Appbar` do Paper:

```tsx
// ProfileNavigator.tsx
<Stack.Screen 
  name="EditProfile" 
  component={EditProfile} 
  options={{ headerShown: false }} // <-- Adicionar esta linha
/>
```

**Opção B**: Remover o `Appbar.Header` do componente e usar apenas o header nativo. Porém, isso requer configurar o estilo do header nativo para manter a consistência visual com o resto do app.

---

## Arquivos Afetados

| Arquivo | Modificação |
|---------|-------------|
| `packages/mobile/src/navigation/ProfileNavigator.tsx` | Adicionar `headerShown: false` para EditProfile |
| `packages/mobile/src/screens/profile/EditProfileScreen.tsx` | Condicionar `TouchableWithoutFeedback` por plataforma |
| `packages/mobile/src/screens/profile/EditProfileDocumentScreen.tsx` | Aplicar mesma correção do TouchableWithoutFeedback |
| `packages/mobile/src/screens/profile/EditProfileCompanyScreen.tsx` | Aplicar mesma correção do TouchableWithoutFeedback |

---

## Código das Correções

### 1. ProfileNavigator.tsx

```tsx
// Linha 20 - Alterar de:
<Stack.Screen name="EditProfile" component={EditProfile} options={{ title: 'Editar Perfil' }} />

// Para:
<Stack.Screen name="EditProfile" component={EditProfile} options={{ headerShown: false }} />
```

### 2. EditProfileScreen.tsx

Substituir o padrão atual por uma abordagem que não interfira nos inputs da Web:

```tsx
// Remover TouchableWithoutFeedback do import ou condicionar seu uso
// Adicionar verificação de plataforma no wrapper
```

