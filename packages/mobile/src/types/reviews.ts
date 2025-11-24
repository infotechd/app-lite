export type Review = {
  id: string;
  user: { id: string; name: string; avatarUrl?: string };
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  photos?: string[]; // URLs
  createdAt: string; // ISO date
};

export type ReviewFilter = 'all' | 'comments' | 'photos';
export type ReviewSort = 'recent' | 'relevant';

export type ReviewsSummaryData = {
  average: number; // 0..5 com uma casa
  total: number;
  distribution: { [stars: number]: number }; // contagem por estrela
  distributionPct: { [stars: number]: number }; // porcentagem 0..100
};
