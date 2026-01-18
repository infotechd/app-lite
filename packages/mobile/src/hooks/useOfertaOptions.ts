import { useMemo } from 'react';
import { CATEGORIES, getSubcategories } from '@/constants/categories';
import { BRAZIL_STATES } from '@/constants/brazilStates';

/**
 * Hook personalizado para fornecer opções de categoria, subcategoria e estado
 * usadas nos formulários de criação e edição de ofertas.
 * 
 * @param categoria Nome ou ID da categoria selecionada (opcional) para filtrar subcategorias.
 * @returns Um objeto contendo as opções formatadas para o DropdownPicker.
 */
export const useOfertaOptions = (categoria?: string) => {
    const categoryOptions = useMemo(() => 
        CATEGORIES.map(cat => ({ label: cat.nome, value: cat.nome })), 
    []);
    
    const subcategoryOptions = useMemo(() => {
        if (!categoria) return [];
        // Busca a categoria pelo nome ou ID para encontrar as subcategorias
        const cat = CATEGORIES.find(c => c.nome === categoria || c.id === categoria);
        if (!cat) return [];
        
        return cat.subcategorias.map(sub => ({ label: sub.nome, value: sub.nome }));
    }, [categoria]);

    const stateOptions = useMemo(() => [
        { label: 'Brasil', value: 'BR' },
        ...BRAZIL_STATES.map(s => ({ label: `${s.nome} (${s.uf})`, value: s.uf }))
    ], []);

    return {
        categoryOptions,
        subcategoryOptions,
        stateOptions,
    };
};
