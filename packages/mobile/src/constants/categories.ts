/**
 * Categorias e Subcategorias - Atualizado
 * 
 * Sistema hierárquico de categorias com subcategorias.
 * 
 * Localização: packages/mobile/src/constants/categories.ts
 */

export interface Subcategoria {
    id: string;
    nome: string;
}

export interface Categoria {
    id: string;
    nome: string;
    subcategorias: Subcategoria[];
}

// ✅ CATEGORIAS COM SUBCATEGORIAS
export const CATEGORIES: Categoria[] = [
    {
        id: 'tecnologia',
        nome: 'Tecnologia',
        subcategorias: [
            { id: 'java', nome: 'Java' },
            { id: 'dotnet', nome: '.NET' },
            { id: 'sap', nome: 'SAP' },
            { id: 'python', nome: 'Python' },
            { id: 'javascript', nome: 'JavaScript/TypeScript' },
            { id: 'mobile', nome: 'Desenvolvimento Mobile' },
            { id: 'devops', nome: 'DevOps' },
            { id: 'cloud', nome: 'Cloud Computing' },
            { id: 'data-science', nome: 'Data Science' },
            { id: 'seguranca', nome: 'Segurança da Informação' },
            { id: 'suporte', nome: 'Suporte Técnico' },
            { id: 'outros-tech', nome: 'Outros' },
        ]
    },
    {
        id: 'saude',
        nome: 'Saúde',
        subcategorias: [
            { id: 'medicina', nome: 'Medicina' },
            { id: 'enfermagem', nome: 'Enfermagem' },
            { id: 'fisioterapia', nome: 'Fisioterapia' },
            { id: 'nutricao', nome: 'Nutrição' },
            { id: 'psicologia', nome: 'Psicologia' },
            { id: 'odontologia', nome: 'Odontologia' },
            { id: 'farmacia', nome: 'Farmácia' },
            { id: 'terapias', nome: 'Terapias Alternativas' },
            { id: 'outros-saude', nome: 'Outros' },
        ]
    },
    {
        id: 'educacao',
        nome: 'Educação',
        subcategorias: [
            { id: 'reforco-escolar', nome: 'Reforço Escolar' },
            { id: 'idiomas', nome: 'Idiomas' },
            { id: 'musica', nome: 'Música' },
            { id: 'artes', nome: 'Artes' },
            { id: 'esportes', nome: 'Esportes' },
            { id: 'informatica', nome: 'Informática' },
            { id: 'cursos-profissionalizantes', nome: 'Cursos Profissionalizantes' },
            { id: 'preparatorio', nome: 'Preparatório para Concursos' },
            { id: 'outros-educacao', nome: 'Outros' },
        ]
    },
    {
        id: 'beleza',
        nome: 'Beleza',
        subcategorias: [
            { id: 'cabelo', nome: 'Cabeleireiro' },
            { id: 'manicure', nome: 'Manicure/Pedicure' },
            { id: 'estetica', nome: 'Estética' },
            { id: 'maquiagem', nome: 'Maquiagem' },
            { id: 'massagem', nome: 'Massagem' },
            { id: 'depilacao', nome: 'Depilação' },
            { id: 'barbearia', nome: 'Barbearia' },
            { id: 'outros-beleza', nome: 'Outros' },
        ]
    },
    {
        id: 'limpeza',
        nome: 'Limpeza',
        subcategorias: [
            { id: 'residencial', nome: 'Limpeza Residencial' },
            { id: 'comercial', nome: 'Limpeza Comercial' },
            { id: 'pos-obra', nome: 'Limpeza Pós-Obra' },
            { id: 'jardinagem-limpeza', nome: 'Jardinagem' },
            { id: 'lavanderia', nome: 'Lavanderia' },
            { id: 'dedetizacao', nome: 'Dedetização' },
            { id: 'outros-limpeza', nome: 'Outros' },
        ]
    },
    {
        id: 'consultoria',
        nome: 'Consultoria',
        subcategorias: [
            { id: 'empresarial', nome: 'Consultoria Empresarial' },
            { id: 'financeira', nome: 'Consultoria Financeira' },
            { id: 'juridica', nome: 'Consultoria Jurídica' },
            { id: 'marketing', nome: 'Marketing' },
            { id: 'rh', nome: 'Recursos Humanos' },
            { id: 'contabil', nome: 'Contabilidade' },
            { id: 'ti', nome: 'TI' },
            { id: 'outros-consultoria', nome: 'Outros' },
        ]
    },
    {
        id: 'construcao',
        nome: 'Construção',
        subcategorias: [
            { id: 'pedreiro', nome: 'Pedreiro' },
            { id: 'eletricista', nome: 'Eletricista' },
            { id: 'encanador', nome: 'Encanador' },
            { id: 'pintor', nome: 'Pintor' },
            { id: 'marceneiro', nome: 'Marceneiro' },
            { id: 'arquitetura', nome: 'Arquitetura' },
            { id: 'engenharia', nome: 'Engenharia' },
            { id: 'reforma', nome: 'Reforma' },
            { id: 'outros-construcao', nome: 'Outros' },
        ]
    },
    {
        id: 'jardinagem',
        nome: 'Jardinagem',
        subcategorias: [
            { id: 'manutencao-jardim', nome: 'Manutenção de Jardim' },
            { id: 'paisagismo', nome: 'Paisagismo' },
            { id: 'poda', nome: 'Poda de Árvores' },
            { id: 'irrigacao', nome: 'Irrigação' },
            { id: 'outros-jardinagem', nome: 'Outros' },
        ]
    },
    {
        id: 'transporte',
        nome: 'Transporte',
        subcategorias: [
            { id: 'mudanca', nome: 'Mudança' },
            { id: 'frete', nome: 'Frete' },
            { id: 'motorista', nome: 'Motorista Particular' },
            { id: 'entrega', nome: 'Entrega' },
            { id: 'outros-transporte', nome: 'Outros' },
        ]
    },
    {
        id: 'alimentacao',
        nome: 'Alimentação',
        subcategorias: [
            { id: 'chef', nome: 'Chef de Cozinha' },
            { id: 'confeitaria', nome: 'Confeitaria' },
            { id: 'catering', nome: 'Catering' },
            { id: 'delivery', nome: 'Delivery' },
            { id: 'outros-alimentacao', nome: 'Outros' },
        ]
    },
    {
        id: 'eventos',
        nome: 'Eventos',
        subcategorias: [
            { id: 'fotografia', nome: 'Fotografia' },
            { id: 'video', nome: 'Vídeo' },
            { id: 'decoracao', nome: 'Decoração' },
            { id: 'som', nome: 'Som e Iluminação' },
            { id: 'buffet', nome: 'Buffet' },
            { id: 'animacao', nome: 'Animação' },
            { id: 'outros-eventos', nome: 'Outros' },
        ]
    },
    {
        id: 'outros',
        nome: 'Outros',
        subcategorias: [
            { id: 'diversos', nome: 'Serviços Diversos' },
        ]
    },
];

// ✅ FUNÇÕES AUXILIARES

/**
 * Retorna lista de nomes de categorias (para compatibilidade com código antigo)
 */
export function getCategoryNames(): string[] {
    return CATEGORIES.map(cat => cat.nome);
}

/**
 * Busca uma categoria pelo ID
 */
export function getCategoryById(id: string): Categoria | undefined {
    return CATEGORIES.find(cat => cat.id === id);
}

/**
 * Busca uma categoria pelo nome
 */
export function getCategoryByName(nome: string): Categoria | undefined {
    return CATEGORIES.find(cat => cat.nome === nome);
}

/**
 * Retorna subcategorias de uma categoria
 */
export function getSubcategories(categoriaId: string): Subcategoria[] {
    const categoria = getCategoryById(categoriaId);
    return categoria?.subcategorias || [];
}

/**
 * Busca uma subcategoria pelo ID dentro de uma categoria
 */
export function getSubcategoryById(categoriaId: string, subcategoriaId: string): Subcategoria | undefined {
    const categoria = getCategoryById(categoriaId);
    return categoria?.subcategorias.find(sub => sub.id === subcategoriaId);
}

// ✅ COMPATIBILIDADE COM CÓDIGO ANTIGO (lista simples de nomes)
export const CATEGORY_NAMES: string[] = getCategoryNames();
/**
 * DEPRECATED: use CATEGORY_NAMES ou getCategoryNames(). Mantido temporariamente.
 */
export const CATEGORIES_NAMES: string[] = CATEGORY_NAMES;

export default CATEGORIES;
