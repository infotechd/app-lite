// Utility functions for Brazilian Real currency formatting, masking and parsing
// Always use Intl.NumberFormat with pt-BR to ensure thousands separators and 2 decimal places

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/**
 * Format a number (in reais) to BRL currency string, e.g., 1234.56 -> "R$ 1.234,56"
 */
export function formatCurrencyBRL(value: number): string {
    const n = Number.isFinite(value) ? value : 0;
    return BRL_FORMATTER.format(n);
}

/**
 * Mask user input for currency field.
 * Takes any text, keeps only digits, converts to cents, and formats to BRL.
 * If there are no digits, returns empty string to allow clearing the field.
 */
export function maskCurrencyInput(input: string): string {
    const digits = (input || '').replace(/\D/g, '');
    if (!digits) return '';
    const cents = Number(digits);
    return BRL_FORMATTER.format(cents / 100);
}

/**
 * Parse a BRL currency string (e.g., "R$ 1.234,56") to number of reais (e.g., 1234.56).
 * If parsing fails or there are no digits, returns 0.
 */
export function parseCurrencyBRLToNumber(text: string): number {
    const digits = (text || '').replace(/\D/g, '');
    if (!digits) return 0;
    const cents = Number(digits);
    return cents / 100;
}
