// packages/mobile/src/utils/formatters.ts
// Utilitários de formatação centralizados

/**
 * Formata a data de entrada (ISO string) para o formato "Mês de AAAA" em pt-BR.
 * Ex.: '2024-01-15T12:00:00Z' -> 'Janeiro de 2024'
 */
export const formatJoinDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const formatted = date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  // Garante a primeira letra maiúscula para manter consistência visual
  return formatted ? formatted.charAt(0).toUpperCase() + formatted.slice(1) : '';
};

export default {
  formatJoinDate,
};
