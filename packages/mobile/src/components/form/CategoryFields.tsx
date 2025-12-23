import React from 'react';
import DropdownPicker from './DropdownPicker';

interface CategoryFieldsProps {
    categoria: string;
    subcategoria?: string | null;
    categoryOptions: { label: string; value: string | number }[];
    subcategoryOptions: { label: string; value: string | number }[];
    errors: { categoria?: string };
    onCategoriaChange: (value: string) => void;
    onSubcategoriaChange: (value: string) => void;
}

/**
 * Componente que agrupa os campos de categoria e subcategoria.
 */
export const CategoryFields: React.FC<CategoryFieldsProps> = ({
    categoria,
    subcategoria,
    categoryOptions,
    subcategoryOptions,
    errors,
    onCategoriaChange,
    onSubcategoriaChange,
}) => {
    return (
        <>
            <DropdownPicker
                label="Categoria *"
                options={categoryOptions}
                selectedValue={categoria}
                onValueChange={(value) => onCategoriaChange(value as string)}
                placeholder="Selecione uma categoria"
                error={errors.categoria}
                testID="category-anchor"
                optionTestIDPrefix="category-item-"
            />

            {categoria && subcategoryOptions.length > 0 && (
                <DropdownPicker
                    label="Subcategoria (opcional)"
                    options={subcategoryOptions}
                    selectedValue={subcategoria ?? null}
                    onValueChange={(value) => onSubcategoriaChange(value as string)}
                    placeholder="Selecione uma subcategoria"
                    testID="subcategory-anchor"
                    optionTestIDPrefix="subcategory-item-"
                />
            )}
        </>
    );
};
