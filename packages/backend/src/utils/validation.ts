/**
 * Valida um número de CPF.
 * @param cpf String contendo o CPF (com ou sem formatação)
 * @returns true se o CPF for válido, false caso contrário
 */
export const validateCPF = (cpf: string): boolean => {
    // Remove caracteres não numéricos
    const cleanCPF = cpf.replace(/\D/g, '');

    // Verifica se possui 11 dígitos
    if (cleanCPF.length !== 11) return false;

    // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
    if (/^(\d)\1+$/.test(cleanCPF)) return false;

    // Validação dos dígitos verificadores
    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
        sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

    return true;
};
