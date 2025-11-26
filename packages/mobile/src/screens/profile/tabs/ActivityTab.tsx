import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { spacing } from '@/styles/theme';
import ActivityTabSkeleton from '@/components/profile/skeletons/ActivityTabSkeleton';
import EmptyState from '@/components/common/EmptyState';
import ActivityCard from '@/components/activity/ActivityCard';
import useUserActivity from '@/hooks/useUserActivity';

interface Props {
  isLoading?: boolean;
}

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
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ActivityCard activity={item} />}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshing={isRefreshing}
      onRefresh={refresh}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={5}
      removeClippedSubviews
      ListFooterComponent={() => (
        <View style={styles.footer}>
          {isFetchingNextPage ? <ActivityIndicator animating size="small" /> : null}
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  footer: { paddingVertical: spacing.md },
});

export default ActivityTab;
