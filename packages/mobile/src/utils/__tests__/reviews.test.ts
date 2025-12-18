import { computeSummary, filterReviews, sortReviews } from '../reviews';
import type { Review } from '../../types/reviews';

describe('utils/reviews - computeSummary', () => {
  it('retorna zeros quando não há reviews', () => {
    const res = computeSummary([] as Review[]);
    expect(res).toEqual({
      average: 0,
      total: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      distributionPct: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  });

  it('calcula média (1 casa) e distribuição por estrela e porcentagens', () => {
    const base = [
      mkReview({ rating: 5 }),
      mkReview({ rating: 4 }),
      mkReview({ rating: 5 }),
      mkReview({ rating: 3 }),
      mkReview({ rating: 2 }),
      mkReview({ rating: 1 }),
    ];
    const res = computeSummary(base as Review[]);
    expect(res.total).toBe(6);
    expect(res.average).toBe(3.3); // (5+4+5+3+2+1)/6 = 3.333.. -> 3.3
    expect(res.distribution[5]).toBe(2);
    expect(res.distribution[4]).toBe(1);
    expect(res.distribution[3]).toBe(1);
    expect(res.distribution[2]).toBe(1);
    expect(res.distribution[1]).toBe(1);
    // porcentagens arredondadas
    expect(res.distributionPct[5]).toBe(33);
    expect(res.distributionPct[4]).toBe(17);
  });
});

describe('utils/reviews - filterReviews', () => {
  const base: Review[] = [
    mkReview({ rating: 5, comment: 'Excelente atendimento', photos: ['a'] }),
    mkReview({ rating: 3, comment: '', photos: [] }),
    mkReview({ rating: 4, comment: 'Ok', photos: undefined }),
    mkReview({ rating: 2, comment: undefined, photos: ['b', 'c'] }),
  ] as Review[];

  it('retorna todos quando filtro = all', () => {
    const res = filterReviews(base, 'all');
    expect(res).toHaveLength(base.length);
  });

  it('filtra somente reviews com comentário quando filtro = comments', () => {
    const res = filterReviews(base, 'comments');
    // tem comment não vazio: 5 e 4
    expect(res.map((r) => r.rating)).toEqual(expect.arrayContaining([5, 4]));
    // não inclui o com comment vazio
    expect(res.some((r) => r.rating === 3)).toBe(false);
  });

  it('filtra somente reviews com fotos quando filtro = photos', () => {
    const res = filterReviews(base, 'photos');
    expect(res.every((r) => (r.photos?.length ?? 0) > 0)).toBe(true);
  });
});

describe('utils/reviews - sortReviews', () => {
  const base: Review[] = [
    mkReview({ id: 'a', rating: 5, createdAt: '2025-10-01', comment: '', photos: [] }),
    mkReview({ id: 'b', rating: 3, createdAt: '2025-11-10', comment: '', photos: [] }),
    mkReview({ id: 'c', rating: 4, createdAt: '2025-08-15', comment: 'ok', photos: ['x'] }),
    mkReview({ id: 'd', rating: 4, createdAt: '2025-11-09', comment: 'text', photos: [] }),
  ] as Review[];

  it('ordena por mais recentes quando sort = recent', () => {
    const res = sortReviews(base, 'recent');
    expect(res[0].createdAt).toBe('2025-11-10');
  });

  it('ordena por relevância: fotos > comentário > nota > mais recente', () => {
    const res = sortReviews(base, 'relevant');
    // item com foto deve vir primeiro
    expect(res[0].id).toBe('c');
    // Verifica a ordem relativa nos demais critérios
    const idxA = res.findIndex((r) => r.id === 'a'); // sem foto, sem comment, rating 5
    const idxD = res.findIndex((r) => r.id === 'd'); // sem foto, com comment, rating 4
    const idxB = res.findIndex((r) => r.id === 'b'); // sem foto, sem comment, rating 3
    // Entre sem foto: com comentário vem antes de sem comentário
    expect(idxD).toBeLessThan(idxA);
    // Entre sem comentário: maior nota primeiro
    expect(idxA).toBeLessThan(idxB);
  });
});

// Helpers
function mkReview(partial: Partial<Review> = {}): Review {
  const id = partial.id ?? Math.random().toString(36).slice(2);
  return {
    id,
    user: { id: `u-${id}`, name: 'Tester' },
    rating: (partial.rating ?? 5) as Review['rating'],
    comment: partial.comment,
    photos: partial.photos,
    createdAt: partial.createdAt ?? '2025-01-01',
  } as Review;
}
