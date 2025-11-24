import type { Review, ReviewsSummaryData, ReviewFilter, ReviewSort } from '@/types/reviews';

export function computeSummary(reviews: Review[]): ReviewsSummaryData {
  const total = reviews.length;
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) distribution[r.rating]++;
  const average = total
    ? Number(
        (
          (5 * distribution[5] + 4 * distribution[4] + 3 * distribution[3] + 2 * distribution[2] + 1 * distribution[1]) /
          total
        ).toFixed(1)
      )
    : 0;
  const distributionPct = Object.fromEntries(
    Object.entries(distribution).map(([k, v]) => [Number(k), total ? Math.round((v / total) * 100) : 0])
  ) as ReviewsSummaryData['distributionPct'];
  return { average, total, distribution, distributionPct };
}

export function filterReviews(reviews: Review[], filter: ReviewFilter): Review[] {
  if (filter === 'comments') return reviews.filter((r) => !!r.comment?.trim());
  if (filter === 'photos') return reviews.filter((r) => (r.photos?.length || 0) > 0);
  return reviews;
}

export function sortReviews(reviews: Review[], sort: ReviewSort): Review[] {
  if (sort === 'recent') {
    return [...reviews].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  // Heurística simples de relevância: fotos > tem comentário > nota maior > mais recente
  return [...reviews].sort((a, b) => {
    const aPhotos = a.photos?.length ? 1 : 0;
    const bPhotos = b.photos?.length ? 1 : 0;
    if (bPhotos !== aPhotos) return bPhotos - aPhotos;
    const aHasComment = a.comment?.trim() ? 1 : 0;
    const bHasComment = b.comment?.trim() ? 1 : 0;
    if (bHasComment !== aHasComment) return bHasComment - aHasComment;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });
}

export function relativeDate(iso: string) {
  const diff = Date.now() - +new Date(iso);
  const d = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (d >= 7) return `há ${Math.floor(d / 7)} semana(s)`;
  if (d >= 1) return `há ${d} dia(s)`;
  const h = Math.floor(diff / (60 * 60 * 1000));
  if (h >= 1) return `há ${h} hora(s)`;
  const m = Math.floor(diff / (60 * 1000));
  return `há ${m} minuto(s)`;
}
