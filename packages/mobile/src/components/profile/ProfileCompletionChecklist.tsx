// packages/mobile/src/components/profile/ProfileCompletionChecklist.tsx
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { User } from '@/types';
import { colors, spacing, typography } from '@/styles/theme';
import { getProfileChecklistItems } from '@/utils/profile/getProfileChecklistItems';
import { calculateProfileCompletion } from '@/utils/profile/calculateProfileCompletion';
import { THEME_CONFIG } from '@/constants/config';
import AnalyticsService from '@/services/AnalyticsService';

/**
 * Propriedades para o componente ProfileCompletionChecklist.
 * 
 * @interface ProfileCompletionChecklistProps
 * @property {User} user - Objeto contendo os dados do usuário para verificar o progresso do perfil.
 * @property {() => void} onDismiss - Função chamada quando o usuário fecha o checklist.
 * @property {(route: string) => void} [navigate] - Função opcional para navegação entre telas do aplicativo.
 */
export interface ProfileCompletionChecklistProps {
  user: User;
  onDismiss: () => void;
  navigate?: (route: string) => void;
}

/**
 * Componente interno que exibe um ícone de status visual (concluído ou pendente).
 * 
 * @param {Object} props - Propriedades do componente.
 * @param {boolean} props.done - Indica se a tarefa associada ao ícone está concluída.
 * @returns {JSX.Element} Um círculo preenchido com check (se concluído) ou apenas uma borda circular (se pendente).
 */
const StatusIcon: React.FC<{ done: boolean }> = ({ done }) => {
  return (
    <View
      accessibilityLabel={done ? 'Concluído' : 'Pendente'}
      style={[
        styles.statusIcon,
        // Aplica cores diferentes baseadas no status de conclusão: verde para sucesso ou transparente com borda para pendente
        done
          ? { backgroundColor: THEME_CONFIG.colors.success, borderWidth: 0 }
          : { backgroundColor: 'transparent', borderColor: colors.border },
      ]}
    >
      {/* Exibe o símbolo de check apenas se o item estiver concluído */}
      {done ? <Text style={styles.statusIconText}>✓</Text> : null}
    </View>
  );
};

/**
 * Componente principal que exibe uma lista de verificação (checklist) para incentivar o usuário a completar seu perfil.
 * Apresenta uma barra de progresso visual e uma lista de itens que direcionam para as telas de edição.
 * 
 * @component
 * @param {ProfileCompletionChecklistProps} props - Propriedades do componente.
 * @returns {JSX.Element | null} Retorna o card de checklist ou null se o perfil já estiver 100% completo.
 */
export const ProfileCompletionChecklist: React.FC<ProfileCompletionChecklistProps> = ({ user, onDismiss, navigate }) => {
  // Memoiza a lista de itens do checklist para evitar recálculos caros e renderizações desnecessárias
  const items = useMemo(() => getProfileChecklistItems(user, navigate), [user, navigate]);
  
  // Calcula a porcentagem atual de conclusão do perfil com base nos dados fornecidos do usuário
  const completion = useMemo(() => calculateProfileCompletion(user), [user]);

  // Regra de negócio: Se o perfil já estiver totalmente completo (100%), o componente não deve ser exibido na tela
  if (completion > 100) return null;

  // Garante que o valor da porcentagem de progresso esteja dentro do intervalo seguro de 0 a 100
  const progressPct = Math.max(0, Math.min(100, completion));

  return (
    <View style={styles.card} accessibilityRole="summary" accessibilityLabel={`Checklist de perfil, ${progressPct}% completo`}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Complete seu perfil</Text>
          <Text style={styles.subtitle}>{progressPct}% completo</Text>
        </View>
        
        {/* Botão de ação para fechar (dispensar) o checklist temporariamente */}
        <Pressable
          onPress={() => {
            // Rastreia o evento de fechamento no serviço de Analytics para monitorar o engajamento do usuário
            AnalyticsService.track('profile_checklist_dismiss', { completion: progressPct });
            onDismiss();
          }}
          accessibilityRole="button"
          accessibilityLabel="Dispensar checklist"
          hitSlop={8} // Aumenta a área de toque para facilitar a interação
          style={styles.dismissBtn}
        >
          <Text style={styles.dismissText}>×</Text>
        </Pressable>
      </View>

      {/* Container visual da trilha de progresso (fundo cinza) */}
      <View style={styles.progressTrack}>
        {/* Indicador preenchido da barra de progresso (cor primária) com largura dinâmica */}
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      {/* Lista de itens de tarefa do checklist mapeados dinamicamente */}
      <View style={{ gap: spacing.sm }}>
        {items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemLeft}>
              {/* Exibe o ícone de status (check ou círculo vazio) conforme o estado do item */}
              <StatusIcon done={item.isComplete} />
              <Text style={[styles.itemText, item.isComplete && styles.itemDone]}>
                {item.title}
              </Text>
            </View>
            
            {/* Renderização condicional do botão de ação ou indicador de conclusão */}
            {!item.isComplete ? (
              <Pressable
                onPress={() => {
                  // Registra o clique no item de checklist para análise de comportamento
                  AnalyticsService.track('profile_checklist_item_click', { item_id: item.id });
                  // Executa a ação associada ao item (geralmente uma navegação)
                  item.onPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Ação: ${item.title}`}
              >
                <Text style={styles.actionText}>Adicionar</Text>
              </Pressable>
            ) : (
              <Text style={styles.doneText}>Feito</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * Definições de estilos estilizados para o componente ProfileCompletionChecklist.
 * Utiliza o tema centralizado para manter a consistência visual do aplicativo.
 */
const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME_CONFIG.colors.surface,
    borderRadius: THEME_CONFIG.borderRadius.lg,
    padding: THEME_CONFIG.spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    // Estilo de sombra definido nas configurações globais de tema
    ...THEME_CONFIG.shadows.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  dismissBtn: {
    padding: spacing.sm,
  },
  dismissText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#EDEFF2',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME_CONFIG.colors.primary,
    borderRadius: 999,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: spacing.md,
  },
  itemText: {
    ...typography.body,
    color: colors.text,
  },
  itemDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  actionText: {
    color: THEME_CONFIG.colors.primary,
    fontWeight: '700',
  },
  doneText: {
    color: THEME_CONFIG.colors.success,
    fontWeight: '700',
  },
  statusIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  statusIconText: {
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 16,
  },
});

export default ProfileCompletionChecklist;
