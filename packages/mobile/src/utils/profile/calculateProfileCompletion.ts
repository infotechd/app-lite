// packages/mobile/src/utils/profile/calculateProfileCompletion.ts
import { User } from '@/types';
import { getProfileChecklistItems } from './getProfileChecklistItems';

/**
 * Calcula a porcentagem (0..100) de conclusão do perfil com base nos itens do checklist.
 * Mantém a mesma fonte de verdade dos itens para garantir consistência.
 */
export function calculateProfileCompletion(user: User): number {
  const items = getProfileChecklistItems(user);
  const total = items.length;
  if (total === 0) return 100;
  const done = items.filter(i => i.isComplete).length;
  return Math.round((done / total) * 100);
}

export default calculateProfileCompletion;
