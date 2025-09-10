// Utilitários de rótulos (PT-BR)
// Mantém a padronização interna do app (en-US) e exibe rótulos ao usuário em português.

import type { User } from '@/types';

export const userTipoLabel: Record<User['tipo'], string> = {
    buyer: 'Comprador',
    provider: 'Prestador',
    advertiser: 'Anunciante',
};

// Helper seguro para quando o tipo estiver ausente
export function getUserTipoLabel(tipo?: User['tipo'] | null): string {
    if (!tipo) return '-';
    return userTipoLabel[tipo];
}
