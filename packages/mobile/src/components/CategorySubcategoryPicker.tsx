/**
 * Componente de Seleção de Categoria e Subcategoria
 *
 * Permite selecionar categoria e subcategoria de forma hierárquica.
 *
 * Localização sugerida: packages/mobile/src/components/CategorySubcategoryPicker.tsx
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Menu, Button } from 'react-native-paper';
import { CATEGORIES, getSubcategories, type Categoria, type Subcategoria } from '@/constants/categories';

interface CategorySubcategoryPickerProps {
    selectedCategoryId?: string;
    selectedSubcategoryId?: string;
    onCategoryChange: (categoryId: string) => void;
    onSubcategoryChange: (subcategoryId: string | undefined) => void;
    disabled?: boolean;
}

const CategorySubcategoryPicker: React.FC<CategorySubcategoryPickerProps> = ({
                                                                                 selectedCategoryId,
                                                                                 selectedSubcategoryId,
                                                                                 onCategoryChange,
                                                                                 onSubcategoryChange,
                                                                                 disabled = false,
                                                                             }) => {
    const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
    const [subcategoryMenuVisible, setSubcategoryMenuVisible] = useState(false);
    const [subcategories, setSubcategories] = useState<Subcategoria[]>([]);

    // Atualizar subcategorias quando a categoria mudar
    useEffect(() => {
        if (selectedCategoryId) {
            const subs = getSubcategories(selectedCategoryId);
            setSubcategories(subs);

            // Se a subcategoria selecionada não pertence à nova categoria, limpar
            if (selectedSubcategoryId) {
                const isValid = subs.some(sub => sub.id === selectedSubcategoryId);
                if (!isValid) {
                    onSubcategoryChange(undefined);
                }
            }
        } else {
            setSubcategories([]);
            onSubcategoryChange(undefined);
        }
    }, [selectedCategoryId]);

    // Obter nome da categoria selecionada
    const selectedCategory = CATEGORIES.find(cat => cat.id === selectedCategoryId);
    const categoryLabel = selectedCategory?.nome || 'Selecione uma categoria';

    // Obter nome da subcategoria selecionada
    const selectedSubcategory = subcategories.find(sub => sub.id === selectedSubcategoryId);
    const subcategoryLabel = selectedSubcategory?.nome || 'Selecione uma subcategoria';

    return (
        <View style={styles.container}>
            {/* Seletor de Categoria */}
            <View style={styles.fieldContainer}>
                <Text variant="labelMedium" style={styles.label}>
                    Categoria *
                </Text>
                <Menu
                    visible={categoryMenuVisible}
                    onDismiss={() => setCategoryMenuVisible(false)}
                    anchor={
                        <Button
                            mode="outlined"
                            onPress={() => !disabled && setCategoryMenuVisible(true)}
                            icon="chevron-down"
                            contentStyle={styles.buttonContent}
                            style={styles.button}
                            disabled={disabled}
                        >
                            {categoryLabel}
                        </Button>
                    }
                >
                    {CATEGORIES.map((categoria) => (
                        <Menu.Item
                            key={categoria.id}
                            onPress={() => {
                                onCategoryChange(categoria.id);
                                setCategoryMenuVisible(false);
                            }}
                            title={categoria.nome}
                            leadingIcon={selectedCategoryId === categoria.id ? 'check' : undefined}
                        />
                    ))}
                </Menu>
            </View>

            {/* Seletor de Subcategoria (apenas se categoria estiver selecionada) */}
            {selectedCategoryId && subcategories.length > 0 && (
                <View style={styles.fieldContainer}>
                    <Text variant="labelMedium" style={styles.label}>
                        Subcategoria (opcional)
                    </Text>
                    <Menu
                        visible={subcategoryMenuVisible}
                        onDismiss={() => setSubcategoryMenuVisible(false)}
                        anchor={
                            <Button
                                mode="outlined"
                                onPress={() => !disabled && setSubcategoryMenuVisible(true)}
                                icon="chevron-down"
                                contentStyle={styles.buttonContent}
                                style={styles.button}
                                disabled={disabled}
                            >
                                {subcategoryLabel}
                            </Button>
                        }
                    >
                        {/* Opção para limpar subcategoria */}
                        <Menu.Item
                            onPress={() => {
                                onSubcategoryChange(undefined);
                                setSubcategoryMenuVisible(false);
                            }}
                            title="Nenhuma (todas)"
                            leadingIcon={!selectedSubcategoryId ? 'check' : undefined}
                        />
                        {subcategories.map((subcategoria) => (
                            <Menu.Item
                                key={subcategoria.id}
                                onPress={() => {
                                    onSubcategoryChange(subcategoria.id);
                                    setSubcategoryMenuVisible(false);
                                }}
                                title={subcategoria.nome}
                                leadingIcon={selectedSubcategoryId === subcategoria.id ? 'check' : undefined}
                            />
                        ))}
                    </Menu>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 8,
    },
    fieldContainer: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 8,
    },
    button: {
        justifyContent: 'flex-start',
    },
    buttonContent: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
    },
});

export default CategorySubcategoryPicker;

