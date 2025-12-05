import { Achievement } from '@/types/achievements';

export const ACHIEVEMENTS_MOCK: Achievement[] = [
  {
    id: 'seller_1',
    title: 'Primeira Venda',
    description: 'Conclua sua primeira venda na plataforma.',
    iconUrl: 'https://cdn.example.com/badges/sale-1.png',
    category: 'Vendedor',
    criteria: 'Realizar 1 venda',
    isUnlocked: true,
    unlockedAt: '2025-06-01T12:00:00Z',
  },
  {
    id: 'seller_10',
    title: 'Vendedor Assíduo',
    description: 'Alcance 10 vendas bem-sucedidas.',
    iconUrl: 'https://cdn.example.com/badges/sale-10.png',
    category: 'Vendedor',
    criteria: 'Realizar 10 vendas',
    isUnlocked: false,
    progress: { current: 8, total: 10 },
  },
  {
    id: 'buyer_1',
    title: 'Primeira Compra',
    description: 'Conclua sua primeira compra.',
    iconUrl: 'https://cdn.example.com/badges/buy-1.png',
    category: 'Comprador',
    criteria: 'Realizar 1 compra',
    isUnlocked: true,
    unlockedAt: '2025-05-20T09:00:00Z',
  },
  {
    id: 'community_helper',
    title: 'Ajudante da Comunidade',
    description: 'Responda 5 perguntas no fórum/comunidade.',
    iconUrl: 'https://cdn.example.com/badges/community-5.png',
    category: 'Comunidade',
    criteria: 'Responder 5 tópicos',
    isUnlocked: false,
    progress: { current: 2, total: 5 },
  },
];

