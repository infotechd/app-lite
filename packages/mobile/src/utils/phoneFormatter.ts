/*
 * Utilitário de formatação e validação de telefones brasileiros.
 *
 * Este módulo oferece funções para:
 * - Limpar caracteres não numéricos de um input de telefone;
 * - Formatar incrementamente um número no padrão BR conforme o usuário digita;
 * - Validar regras básicas de telefone (tamanho, DDD e início do celular);
 * - Um pequeno "hook utilitário" para centralizar essas funções em formulários.
 *
 * Possíveis melhorias futuras (ideias e considerações):
 * - [TODO] Suportar código do país +55 opcional e formato E.164 (ex.: +5511999887766).
 * - [TODO] Validar DDD contra uma lista oficial/atualizada da ANATEL, e não apenas por faixa numérica.
 * - [TODO] Tratar números especiais/curtos (ex.: 190, 193, 0800, 0300) de forma diferenciada.
 * - [TODO] Permitir configurar máscaras variadas (ex.: empresas internas com ramais: (11) 3333-4444 Ramal 123).
 * - [TODO] Expor funções memoizadas (useCallback) no hook para evitar rerenders em React.
 * - [TODO] Adicionar testes unitários e testes de snapshot para garantir estabilidade da formatação.
 * - [TODO] Internacionalização/opções regionais (ex.: permitir outros países via configuração).
 */

/**
 * Remove qualquer caractere que não seja dígito (0–9).
 *
 * @param value - Texto de entrada (pode conter letras, espaços, símbolos etc.)
 * @returns Somente os dígitos contidos em `value`.
 */
export function removeNonNumeric(value: string): string {
    // Regex \D significa "tudo que NÃO é dígito"; o modificador global (g) aplica em toda a string.
    // Ao substituir por string vazia, restam apenas os números.
    return value.replace(/\D/g, '');
}

/**
 * Formata um número de telefone brasileiro de forma progressiva (enquanto o usuário digita).
 * Mantém no máximo 11 dígitos (2 DDD + 9 celular ou 8 fixo) e aplica a máscara adequada.
 *
 * @param value - Valor do campo de telefone (pode conter caracteres especiais)
 * @returns String formatada no padrão brasileiro
 *
 * Exemplos:
 * - "11999887766" -> "(11) 99988-7766" (celular)
 * - "1133334444" -> "(11) 3333-4444" (fixo)
 * - "119998877" -> "(11) 9998-877" (digitando)
 */
export function formatPhoneNumber(value: string): string {
    // 1) Normaliza removendo tudo que não é número
    const numbers = removeNonNumeric(value);

    // 2) Limita a 11 dígitos (2 DDD + 9 celular OU 2 DDD + 8 fixo)
    const limited = numbers.slice(0, 11);

    // 3) Aplica a formatação baseada na quantidade de dígitos disponíveis
    if (limited.length === 0) {
        // Nenhum dígito ainda
        return '';
    } else if (limited.length <= 2) {
        // Apenas DDD em digitação: "(XX"
        return `(${limited}`;
    } else if (limited.length <= 6) {
        // DDD + primeiros dígitos (ainda sem hífen): "(XX) XXXX"
        // slice(0,2) => DDD; slice(2) => restante até 6
        return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else if (limited.length <= 10) {
        // Telefone fixo (8 dígitos após DDD): "(XX) XXXX-XXXX"
        // Parte antes do hífen: 4 dígitos; depois: o restante
        return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    } else {
        // Celular (9 dígitos após DDD): "(XX) XXXXX-XXXX"
        // Parte antes do hífen: 5 dígitos; depois: 4 dígitos
        return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7, 11)}`;
    }
}

/**
 * Valida regras básicas de um telefone brasileiro.
 * Obs.: Trata-se de uma validação simplificada e não cobre todos os casos do país.
 *
 * Regras aplicadas:
 * - Deve ter 10 dígitos (fixo) ou 11 dígitos (celular);
 * - DDD deve estar entre 11 e 99 (heurística simples, não garante DDD real);
 * - Para 11 dígitos, assume celular e exige que o primeiro dígito após o DDD seja 9.
 *
 * @param value - Valor do telefone formatado ou não
 * @returns true se o telefone é válido segundo as regras acima
 */
export function isValidPhoneNumber(value: string): boolean {
    // Normaliza para considerar apenas números na validação
    const numbers = removeNonNumeric(value);

    // Tamanho permitido: 10 (fixo) ou 11 (celular)
    if (numbers.length !== 10 && numbers.length !== 11) {
        return false;
    }

    // Heurística de DDD: entre 11 e 99. Melhorias: consultar lista oficial de DDDs.
    const ddd = parseInt(numbers.slice(0, 2));
    if (ddd < 11 || ddd > 99) {
        return false;
    }

    // Para celular (11 dígitos), espera-se que o dígito inicial seja 9 na maioria dos cenários BR atuais.
    // Observação: existem exceções históricas/regionais; ajuste conforme regra de negócio.
    if (numbers.length === 11 && numbers[2] !== '9') {
        return false;
    }

    // Passou em todas as regras básicas
    return true;
}

/**
 * Hook utilitário para centralizar formatação/validação/limpeza de telefone em formulários.
 * Mantém a API simples e reutilizável.
 *
 * Exemplo de uso:
 * ```tsx
 * const [phone, setPhone] = useState('');
 *
 * const handlePhoneChange = (text: string) => {
 *   setPhone(formatPhoneNumber(text));
 * };
 *
 * <TextInput
 *   value={phone}
 *   onChangeText={handlePhoneChange}
 *   keyboardType="phone-pad"
 * />
 * ```
 *
 * Possíveis melhorias:
 * - Usar useCallback para retornar funções estáveis: format, validate e clean.
 * - Expor também um formatE164 ou toDigits para integrações com backend/APIs.
 */
export function usePhoneFormatter() {
    // Retorna uma função que formata a string de entrada para o padrão BR
    const format = (value: string) => formatPhoneNumber(value);
    // Retorna uma função que valida o conteúdo do telefone
    const validate = (value: string) => isValidPhoneNumber(value);
    // Retorna uma função que remove caracteres não numéricos (útil para salvar no backend)
    const clean = (value: string) => removeNonNumeric(value);

    return { format, validate, clean };
}

// Export default como "facade" para facilitar importações em diferentes estilos.
// Observação: para melhor tree-shaking, prefira os exports nomeados quando possível.
export default {
    formatPhoneNumber,
    isValidPhoneNumber,
    removeNonNumeric,
    usePhoneFormatter,
};

