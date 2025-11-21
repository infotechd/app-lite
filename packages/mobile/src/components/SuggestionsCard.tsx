import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, List, IconButton, Button, Text } from 'react-native-paper';
import { spacing } from '@/styles/theme';

interface SuggestionsCardProps {
  visible: boolean;
  suggestions: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
  onClear: () => void;
}

const SuggestionsCard: React.FC<SuggestionsCardProps> = ({ visible, suggestions, onSelect, onRemove, onClear }) => {
  if (!visible) {
    return null;
  }

  return (
    <Card style={styles.card}>
      <Card.Title
        title="Buscas Recentes"
        titleStyle={styles.title}
        right={(props) => (
          <Button
            {...props}
            mode="text"
            onPress={onClear}
            disabled={suggestions.length === 0}
            accessibilityLabel="Limpar histórico de buscas"
          >
            Limpar
          </Button>
        )}
      />
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {suggestions.length > 0 ? (
          suggestions.map((item) => (
            <List.Item
              key={item}
              title={item}
              onPress={() => onSelect(item)}
              left={(props) => <List.Icon {...props} icon="history" />}
              right={(props) => (
                <IconButton {...props} icon="close" onPress={() => onRemove(item)} accessibilityLabel={`Remover ${item} do histórico`} />
              )}
            />
          ))
        ) : (
          <List.Item title="Nenhuma busca recente" disabled />
        )}
      </ScrollView>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    maxHeight: 240, // Limita a altura para não dominar a tela
    elevation: 3,
    position: 'absolute',
    top: 65, // Posição ajustada para ficar abaixo da Searchbar
    left: 0,
    right: 0,
    zIndex: 10, // Garante que o card fique sobre os outros conteúdos
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    // O ScrollView interno garante que a lista seja rolável se houver muitos itens
  },
});

export default SuggestionsCard;
