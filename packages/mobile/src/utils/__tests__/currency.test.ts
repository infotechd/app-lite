import { formatCurrencyBRL, maskCurrencyInput, parseCurrencyBRLToNumber } from '@/utils/currency';

describe('currency utils (BRL)', () => {
  describe('maskCurrencyInput', () => {
    it('returns empty string when input has no digits', () => {
      expect(maskCurrencyInput('')).toBe('');
      expect(maskCurrencyInput('abc')).toBe('');
      expect(maskCurrencyInput('R$ __,__')).toBe('');
    });

    it('formats digits as BRL currency string', () => {
      const masked = maskCurrencyInput('123456');
      // Should be something like "R$ 1.234,56". Instead of comparing exact string,
      // validate round-trip using the parser to avoid locale space issues.
      expect(parseCurrencyBRLToNumber(masked)).toBeCloseTo(1234.56, 6);
    });

    it('ignores non-digits and formats properly', () => {
      const masked = maskCurrencyInput('R$12x3,4-5.6');
      expect(parseCurrencyBRLToNumber(masked)).toBeCloseTo(1234.56, 6); // digits 123456 -> 1234.56
    });

    it('handles single digit as cents', () => {
      const masked = maskCurrencyInput('7');
      expect(parseCurrencyBRLToNumber(masked)).toBeCloseTo(0.07, 6);
    });

    it('handles zeros correctly', () => {
      const masked = maskCurrencyInput('000');
      expect(parseCurrencyBRLToNumber(masked)).toBe(0);
    });
  });

  describe('parseCurrencyBRLToNumber', () => {
    it('parses formatted BRL to number', () => {
      expect(parseCurrencyBRLToNumber('R$ 1.234,56')).toBe(1234.56);
      expect(parseCurrencyBRLToNumber('R$ 0,99')).toBe(0.99);
    });

    it('returns 0 when text has no digits', () => {
      expect(parseCurrencyBRLToNumber('')).toBe(0);
      expect(parseCurrencyBRLToNumber('abc')).toBe(0);
    });
  });

  describe('formatCurrencyBRL', () => {
    it('round-trips with parser', () => {
      const formatted = formatCurrencyBRL(98765.43);
      // Avoid exact string comparison; validate numeric round-trip
      expect(parseCurrencyBRLToNumber(formatted)).toBe(98765.43);
    });

    it('formats invalid numbers as currency zero-ish without throwing', () => {
      const formatted = formatCurrencyBRL(Number.NaN);
      expect(typeof formatted).toBe('string');
      // It should parse back to 0
      expect(parseCurrencyBRLToNumber(formatted)).toBe(0);
    });
  });
});
