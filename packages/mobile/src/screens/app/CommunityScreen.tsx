import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/*
  Tela de Comunidade — Em desenvolvimento
  Objetivo: Espaço de interação entre usuários (posts, tópicos, comentários, avaliações).

  Próximas tarefas (seguir guidelines do projeto):
  1. Tipos & Modelo de dados
     - Definir interfaces: CommunityPost, PostCategory, Comment, Reaction, Report.
  2. Serviço de API (src/services/communityService.ts)
     - Endpoints REST: listar posts, criar/editar/excluir post, comentar, reagir, denunciar; ApiResponse<T> + interceptors.
  3. Estado global (src/context/CommunityContext.tsx)
     - Cache de feed, paginação, filtros por categoria, busca e ordenação.
  4. UI/UX (src/screens/app/Community/*)
     - Feed, criação de post, detalhe do post, comentários aninhados, moderação básica.
  5. Upload de mídias
     - GridFS para imagens/vídeos em posts (até 5 arquivos, 10MB cada) + thumbnails.
  6. Moderação & Segurança
     - Regras por tipo de usuário, relatórios de abuso, ocultar conteúdo denunciado, rate limiting.
  7. Validação & Testes
     - Zod para validação; Jest + RNTL (mobile), Jest + Supertest (backend) com 80% cobertura.

  Status: Ainda não implementado. Esta tela é um placeholder para indicar desenvolvimento futuro.
  Data: 2025-08-20
*/

const CommunityScreen: React.FC = () => {
    return (
        <View style={styles.container} accessible accessibilityLabel="Tela de Comunidade em desenvolvimento">
            <Icon name="account-group" size={64} color="#6200EE" style={styles.icon} />
            <Text variant="titleMedium" style={styles.text} accessibilityRole="header">
                Esta tela está em desenvolvimento.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        marginBottom: 12,
    },
    text: {
        textAlign: 'center',
    },
});

export default CommunityScreen;
