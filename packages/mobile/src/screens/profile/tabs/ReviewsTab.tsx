import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, ListRenderItemInfo } from 'react-native';
import { spacing } from '@/styles/theme';
import EmptyState from '@/components/common/EmptyState';
import ReviewsSummary from '@/components/reviews/ReviewsSummary';
import ReviewsFilters from '@/components/reviews/ReviewsFilters';
import ReviewCard from '@/components/reviews/ReviewCard';
import { REVIEWS_MOCK } from '@/mocks/reviewsMock';
import { computeSummary, filterReviews, sortReviews } from '@/utils/reviews';
import type { Review, ReviewFilter, ReviewSort } from '@/types/reviews';
import ReviewsTabSkeleton from '@/components/profile/skeletons/ReviewsTabSkeleton';

const PAGE_SIZE = 10;

const ReviewsTab: React.FC = () => {
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [sort, setSort] = useState<ReviewSort>('recent');
  const [page, setPage] = useState(1);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setIsError(false);
    setAttempt((a) => a + 1);
    try {
      const isTest = (globalThis as any)?.__TEST__ === true;
      if (!isTest) {
        await new Promise((r) => setTimeout(r, 500));
      }

      // Força erro na primeira tentativa, simulando instabilidade de rede
      if (attempt === 0) {
        throw new Error('Simulated error');
      }

      setReviews(REVIEWS_MOCK);
    } catch (e) {
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, [attempt]);

  useEffect(() => {
    // carrega ao montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
    load();
  }, []);

  const summary = useMemo(() => computeSummary(reviews), [reviews]);

  const filteredSorted = useMemo(() => {
    const filtered = filterReviews(reviews, filter);
    return sortReviews(filtered, sort);
  }, [reviews, filter, sort]);

  const data = useMemo(() => filteredSorted.slice(0, page * PAGE_SIZE), [filteredSorted, page]);

  const isEmpty = filteredSorted.length === 0;

  const onEndReached = useCallback(() => {
    if (data.length < filteredSorted.length) setPage((p) => p + 1);
  }, [data.length, filteredSorted.length]);

  const keyExtractor = useCallback((item: Review) => item.id, []);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<Review>) => <ReviewCard review={item} />, []);

  const onChangeFilter = useCallback((f: ReviewFilter) => {
    setPage(1);
    setFilter(f);
  }, []);
  const onChangeSort = useCallback((s: ReviewSort) => {
    setPage(1);
    setSort(s);
  }, []);

  if (loading) {
    return <ReviewsTabSkeleton />;
  }

  if (isError) {
    return (
      <EmptyState
        testID="reviews-error"
        title="Oops, algo deu errado"
        description="Não foi possível carregar as avaliações. Verifique sua conexão e tente novamente."
        action={{ label: 'Tentar novamente', onPress: load }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ReviewsSummary summary={summary} />
      <ReviewsFilters filter={filter} sort={sort} onChangeFilter={onChangeFilter} onChangeSort={onChangeSort} />
      {isEmpty ? (
        <EmptyState
          testID="reviews-empty"
          title="Sem avaliações ainda"
          description="Quando houver avaliações, elas aparecerão aqui."
        />
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          initialNumToRender={10}
          windowSize={10}
          removeClippedSubviews
          contentContainerStyle={{ paddingBottom: spacing.lg }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: spacing.md },
});

export default ReviewsTab;
