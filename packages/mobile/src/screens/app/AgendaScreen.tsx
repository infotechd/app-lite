import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

/*
  Tela de Agenda — Em desenvolvimento
  Objetivo: Centralizar compromissos/agendamentos entre compradores e prestadores.

  Próximas tarefas (seguir guidelines do projeto):
  1. Tipos & Modelo de dados
     - Definir interfaces: Appointment, AppointmentStatus, etc.
  2. Serviço de API (src/services/agendaService.ts)
     - Endpoints REST (listar/criar/atualizar/cancelar) usando ApiResponse<T> e interceptors Axios.
  3. Estado global (src/context/AgendaContext.tsx)
     - Cache, sincronização, filtros (data, status), paginação e refresh.
  4. UI/UX (src/screens/app/Agenda/* + componentes reutilizáveis)
     - Lista por dia/semana, detalhe do compromisso, ações rápidas.
     - Filtros: pendente, confirmado, concluído, cancelado.
     - Acessibilidade e uso de React Native Paper.
  5. Integrações
     - Notificações/lembrantes (local push) e deep links para detalhe.
  6. Validação & Segurança
     - Zod para validação, regras por tipo de usuário.
  7. Testes
     - Mobile: Jest + RNTL. Backend: Jest + Supertest. Cobertura mínima 80%.

  Status: Ainda não implementado. Esta tela é um placeholder para indicar desenvolvimento futuro.
  Data: 2025-08-20
*/

const AgendaScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text variant="headlineSmall" accessibilityRole="header">
                Agenda
            </Text>

            <Card style={styles.card} accessible accessibilityLabel="Tela de Agenda em desenvolvimento">
                <Card.Content>
                    <View style={styles.row}>
                        <Icon name="calendar-clock" size={24} color="#6200EE" style={styles.icon} />
                        <Text variant="bodyMedium" style={styles.message}>
                            Estamos trabalhando na sua Agenda. Aqui você verá seus compromissos, agendamentos e lembretes.
                        </Text>
                    </View>

                    <Text variant="labelLarge" style={styles.subtitle}>Próximos passos:</Text>
                    <Text variant="bodySmall">• Listagem de compromissos por data</Text>
                    <Text variant="bodySmall">• Filtros por status e período</Text>
                    <Text variant="bodySmall">• Detalhe e ações (confirmar, reagendar, cancelar)</Text>
                    <Text variant="bodySmall">• Notificações de lembrete</Text>
                </Card.Content>
                <Card.Actions>
                    <Button mode="contained-tonal" disabled>
                        Em breve
                    </Button>
                </Card.Actions>
            </Card>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    card: {
        marginTop: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    icon: {
        marginRight: 8,
        marginTop: 2,
    },
    message: {
        flex: 1,
    },
    subtitle: {
        marginTop: 8,
        marginBottom: 4,
    },
});

export default AgendaScreen;
