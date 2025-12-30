import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeContainer } from '@/components/common/SafeContainer';

/*
  Tela de Chat — Em desenvolvimento
  Objetivo: Mensageria entre usuários (compradores, prestadores e anunciantes).

  Próximas tarefas (seguir guidelines do projeto):
  1. Tipos & Modelo de dados
     - Definir interfaces: Conversation, Message, Participant, MessageStatus (sent, delivered, read), Attachment.
  2. Serviço de API (src/services/chatService.ts)
     - Endpoints REST: listar conversas, criar conversa, enviar/receber mensagens, marcar como lida; padrão ApiResponse<T> e interceptors Axios.
  3. Tempo real
     - Socket.io/WebSocket: eventos de message:new, typing, read-receipt; reconexão e fila offline.
  4. Estado global (src/context/ChatContext.tsx)
     - Cache de conversas, mensagens por thread, paginação infinita, otimizações (optimistic UI).
  5. UI/UX (src/screens/app/Chat/*)
     - Lista de conversas, tela de mensagens, composer (texto, imagens, vídeos), indicadores de envio/leitura.
  6. Upload de mídias
     - Usar GridFS (MongoDB) para anexos (JPG, PNG, MP4) respeitando limites e geração de thumbnails.
  7. Validação & Segurança
     - Zod para validação; rate limiting/anti-spam; autorização por participante.
  8. Testes
     - Mobile: Jest + RNTL. Backend: Jest + Supertest. Cobertura mínima 80% em controllers/services.

  Status: Ainda não implementado. Esta tela é um placeholder para indicar desenvolvimento futuro.
  Data: 2025-08-20
*/

const ChatScreen: React.FC = () => {
    return (
        <SafeContainer>
            <View style={styles.container} accessible accessibilityLabel="Tela de Chat em desenvolvimento">
                <Icon name="chat-processing" size={64} color="#6200EE" style={styles.icon} />
                <Text variant="titleMedium" style={styles.text} accessibilityRole="header">
                    Esta tela está em desenvolvimento.
                </Text>
            </View>
        </SafeContainer>
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

export default ChatScreen;
