import { parseNumber, isValidUF, validatePriceRange } from '@/utils/filtersValidation';

describe('filtersValidation helpers', () => {
  describe('parseNumber', () => {
    it('returns undefined for empty string', () => {
      expect(parseNumber('')).toBeUndefined();
    });
    it('parses integer strings', () => {
      expect(parseNumber('10')).toBe(10);
      expect(parseNumber('0')).toBe(0);
    });
    it('parses decimal with comma', () => {
      expect(parseNumber('10,5')).toBe(10.5);
    });
    it('returns undefined for invalid numbers', () => {
      expect(parseNumber('abc')).toBeUndefined();
      expect(parseNumber('10,5.3')).toBeUndefined();
    });
  });

  describe('isValidUF', () => {
    it('accepts empty or two-letter codes (case-insensitive)', () => {
      expect(isValidUF('')).toBe(true);
      expect(isValidUF('sp')).toBe(true);
      expect(isValidUF('SP')).toBe(true);
    });
    it('rejects invalid length', () => {
      expect(isValidUF('S')).toBe(false);
      expect(isValidUF('XYZ')).toBe(false);
    });
  });

  describe('validatePriceRange', () => {
    it('returns error when min > max', () => {
      expect(validatePriceRange(10, 5)).toBeTruthy();
    });
    it('returns null when min <= max or one is undefined', () => {
      expect(validatePriceRange(5, 10)).toBeNull();
      expect(validatePriceRange(undefined, 10)).toBeNull();
      expect(validatePriceRange(10, undefined)).toBeNull();
      expect(validatePriceRange(undefined, undefined)).toBeNull();
    });
  });
});
