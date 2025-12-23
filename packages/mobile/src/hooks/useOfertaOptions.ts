import { useMemo } from 'react';
import { CATEGORIES, getSubcategories } from '@/constants/categories';
import { BRAZIL_STATES } from '@/constants/brazilStates';

/**
 * Hook personalizado para fornecer opções de categoria, subcategoria e estado
 * usadas nos formulários de criação e edição de ofertas.
 * 
 * @param categoria ID da categoria selecionada (opcional) para filtrar subcategorias.
 * @returns Um objeto contendo as opções formatadas para o DropdownPicker.
 */
export const useOfertaOptions = (categoria?: string) => {
    const categoryOptions = useMemo(() => 
        CATEGORIES.map(cat => ({ label: cat.nome, value: cat.id })), 
    []);
    
    const subcategoryOptions = useMemo(() => {
        if (!categoria) return [];
        return getSubcategories(categoria).map(sub => ({ label: sub.nome, value: sub.id }));
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
