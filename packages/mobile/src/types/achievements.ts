// packages/mobile/src/types/achievements.ts
export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconUrl: string;
  category: string;
  criteria: string; // Descrição de como obter
  isUnlocked: boolean;
  unlockedAt?: string; // ISO 8601
  progress?: { current: number; total: number }; // Para conquistas progressivas
}

