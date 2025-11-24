import type { Review } from '@/types/reviews';

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

const names = [
  'Ana Paula',
  'Carlos Souza',
  'Mariana Lima',
  'João Pedro',
  'Beatriz Silva',
  'Ricardo Gomes',
  'Fernanda Alves',
  'Luiz Fernando',
  'Camila Rocha',
  'Rafael Costa',
  'Patrícia Santos',
  'Guilherme Mota',
  'Isabela Nunes',
  'Thiago Ribeiro',
  'Larissa Carvalho',
];

function avatar(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/80`;
}

export const REVIEWS_MOCK: Review[] = Array.from({ length: 36 }).map((_, i) => {
  const rating = ((i % 5) + 1) as Review['rating'];
  const hasComment = i % 2 === 0;
  const hasPhotos = i % 3 === 0;
  const name = names[i % names.length];
  return {
    id: `r-${i + 1}`,
    user: { id: `u-${i + 1}`, name, avatarUrl: avatar(name) },
    rating,
    comment: hasComment
      ? [
          'Experiência excelente. Recomendo!',
          'Bom, mas poderia melhorar o atendimento.',
          'Serviço dentro do esperado, voltarei a contratar.',
          'Fiquei impressionado com a rapidez e qualidade.',
          'Preço justo e entrega pontual.',
        ][i % 5]
      : undefined,
    photos: hasPhotos
      ? [
          `https://picsum.photos/seed/${i + 1}-a/400`,
          ...(i % 6 === 0 ? [`https://picsum.photos/seed/${i + 1}-b/400`] : []),
        ]
      : undefined,
    createdAt: daysAgo(i + 1),
  };
});
