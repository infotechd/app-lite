export const parseNumber = (s: string): number | undefined => {
  if (!s) return undefined;
  const normalized = s.replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
};

export const isValidUF = (uf?: string): boolean => {
  const v = (uf || '').trim().toUpperCase();
  return v === '' || /^[A-Z]{2}$/.test(v);
};

export const validatePriceRange = (min?: number, max?: number): string | null => {
  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    return 'Preço mínimo não pode ser maior que o máximo';
  }
  return null;
};
