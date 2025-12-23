import React, { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View, ListRenderItem } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { spacing } from '@/styles/theme';
import ActivityTabSkeleton from '@/components/profile/skeletons/ActivityTabSkeleton';
import EmptyState from '@/components/common/EmptyState';
import ActivityCard from '@/components/activity/ActivityCard';
import useUserActivity, { Activity } from '@/hooks/useUserActivity';

interface Props {
  isLoading?: boolean;
}

// Se os itens da lista vierem a ter uma altura fixa, ajuste esta constante
// e descomente a implementação de `getItemLayout` para otimizar a rolagem.
// const ITEM_HEIGHT = 0;

const ActivityTab: React.FC<Props> = ({ isLoading }) => {
  const userId = 'current-user';
  const {
    activities,
    isLoading: loading,
    isRefreshing,
    isFetchingNextPage,
    isError,
    hasNextPage,
    fetchNextPage,
    refresh,
  } = useUserActivity(userId);

  const isLoadingEffective = useMemo(() => Boolean(isLoading) || loading, [isLoading, loading]);

  const keyExtractor = useCallback((item: Activity) => item.id, []);

  const renderItem = useCallback<ListRenderItem<Activity>>(({ item }) => {
    return <ActivityCard activity={item} />;
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const ListFooter = useCallback(() => (
    <View style={styles.footer}>
      {isFetchingNextPage ? <ActivityIndicator animating size="small" /> : null}
    </View>
  ), [isFetchingNextPage]);

  // A otimização `getItemLayout` só é segura se TODOS os itens tiverem a mesma altura fixa.
  // Como os cards de atividade têm alturas variáveis (ex: posts com imagem vs. sem imagem),
  // esta propriedade não deve ser usada até que o design garanta uma altura uniforme.
  // const getItemLayout = useCallback((_: any, index: number) => ({
  //   length: ITEM_HEIGHT,
  //   offset: ITEM_HEIGHT * index,
  //   index,
  // }), []);

  if (isLoadingEffective && activities.length === 0) {
    return <ActivityTabSkeleton />;
  }

  if (isError && activities.length === 0) {
    return (
      <EmptyState
        testID="activity-error"
        title="Oops, algo deu errado"
        description="Não foi possível carregar o conteúdo. Verifique sua conexão e tente novamente."
        action={{ label: 'Tentar novamente', onPress: refresh }}
      />
    );
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        testID="activity-empty"
        title="Nenhuma atividade por aqui"
        description="Suas publicações, ofertas e avaliações aparecerão aqui."
      />
    );
  }

  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
      data={activities}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      refreshing={isRefreshing}
      onRefresh={refresh}
      initialNumToRender={10}
      maxToRenderPerBatch={5}
      updateCellsBatchingPeriod={50}
      windowSize={5}
      removeClippedSubviews
      ListFooterComponent={ListFooter}
      // getItemLayout={getItemLayout} // Ative somente se a altura dos itens for fixa
    />
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  footer: { paddingVertical: spacing.md },
});

export default ActivityTab;
