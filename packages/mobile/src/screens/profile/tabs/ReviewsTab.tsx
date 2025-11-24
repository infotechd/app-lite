import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, ListRenderItemInfo } from 'react-native';
import { spacing } from '@/styles/theme';
import EmptyState from '@/components/common/EmptyState';
import ReviewsSummary from '@/components/reviews/ReviewsSummary';
import ReviewsFilters from '@/components/reviews/ReviewsFilters';
import ReviewCard from '@/components/reviews/ReviewCard';
import { REVIEWS_MOCK } from '@/mocks/reviewsMock';
import { computeSummary, filterReviews, sortReviews } from '@/utils/reviews';
import type { Review, ReviewFilter, ReviewSort } from '@/types/reviews';

const PAGE_SIZE = 10;

const ReviewsTab: React.FC = () => {
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [sort, setSort] = useState<ReviewSort>('recent');
  const [page, setPage] = useState(1);

  const summary = useMemo(() => computeSummary(REVIEWS_MOCK), []);

  const filteredSorted = useMemo(() => {
    const filtered = filterReviews(REVIEWS_MOCK, filter);
    return sortReviews(filtered, sort);
  }, [filter, sort]);

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
