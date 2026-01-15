// import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { Appearance } from 'react-native';

// Tema claro (Paper)
export const lightTheme = {
    ...MD3LightTheme,
    colors: {
        ...(MD3LightTheme as any)?.colors ?? {},
        primary: '#6200EE',
        secondary: '#03DAC6',
        surface: '#FFFFFF',
        background: '#F5F5F5',
        error: '#B00020',
        onSurface: '#000000',
        onBackground: '#000000',
    },
};

/* 
// Tema escuro (Paper) - Desativado conforme solicitação do usuário
export const darkTheme = {
    ...MD3DarkTheme,
    colors: {
        ...(MD3DarkTheme as any)?.colors ?? {},
        primary: '#BB86FC', // variação para melhor contraste no escuro
        secondary: '#03DAC6',
        surface: '#121212',
        background: '#0A0A0A',
        error: '#CF6679',
        onSurface: '#FFFFFF',
        onBackground: '#FFFFFF',
    },
};
*/

// Alias de compatibilidade: mantém "theme" apontando para o tema claro por padrão
export const theme = lightTheme;

// Tokens de cor (dinâmicos conforme esquema do SO)
type ColorTokens = {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    backdrop: string;
    textDisabled: string;
};

const lightTokens: ColorTokens = {
    primary: '#6200EE',
    secondary: '#03DAC6',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#B0B0B0',
    border: '#E0E0E0',
    error: '#B00020',
    success: '#4CAF50',
    warning: '#FF9800',
    backdrop: '#EAEAEA',
    textDisabled: '#D1D1D1',
};

/*
const darkTokens: ColorTokens = {
    primary: '#BB86FC',
    secondary: '#03DAC6',
    background: '#0A0A0A',
    surface: '#121212',
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    border: '#2A2A2A',
    error: '#CF6679',
    success: '#4CAF50',
    warning: '#FFB74D',
    backdrop: '#1F1F1F',
    textDisabled: '#4A4A4A',
};
*/

// Exporta um proxy que resolve as cores.
// Desativado Dark Theme: Mantém sempre lightTokens para garantir consistência visual.
// Caso precise ativar futuramente, descomente o darkTokens acima e a lógica de scheme.
export const colors: ColorTokens = new Proxy({} as ColorTokens, {
    get(_target, prop: keyof ColorTokens) {
        // Forçado para 'light' para evitar o Dark Theme do sistema
        // const scheme = (Appearance as any)?.getColorScheme?.() ?? 'light';
        // const source = scheme === 'dark' ? darkTokens : lightTokens;
        const source = lightTokens;

        return (source as any)[prop];
    },
});

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

// Design tokens: radius
export const radius = {
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 50,
};

// Design tokens: elevation levels (Android). Para iOS, combine com sombras conforme necessário
export const elevation = {
    level0: 0,
    level1: 2,
    level2: 4,
    level3: 6,
    level4: 8,
};

export const typography = {
    h1: {
        fontSize: 32,
        fontWeight: 'bold' as const,
    },
    h2: {
        fontSize: 24,
        fontWeight: 'bold' as const,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600' as const,
    },
    body: {
        fontSize: 16,
        fontWeight: 'normal' as const,
    },
    caption: {
        fontSize: 14,
        fontWeight: 'normal' as const,
    },
};