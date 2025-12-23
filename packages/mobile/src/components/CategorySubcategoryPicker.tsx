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
import { CATEGORIES, getSubcategories, type Subcategoria } from '@/constants/categories';

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

    // Atualizar subcategorias quando a categoria/subcategoria mudarem e garantir consistência de estado
    // Importante: não depende de onSubcategoryChange para evitar loops de render causados por callbacks instáveis
    useEffect(() => {
        if (selectedCategoryId) {
            const subs = getSubcategories(selectedCategoryId);
            setSubcategories(subs);

            // Se a subcategoria selecionada não pertence à nova categoria, limpar
            if (selectedSubcategoryId !== undefined) {
                const isValid = subs.some(sub => sub.id === selectedSubcategoryId);
                if (!isValid) {
                    onSubcategoryChange(undefined);
                }
            }
        } else {
            setSubcategories([]);
            // Só limpar se havia alguma subcategoria setada anteriormente
            if (selectedSubcategoryId !== undefined) {
                onSubcategoryChange(undefined);
            }
        }

        // Sempre fechar menus ao trocar a categoria para evitar sobreposição invisível
        setCategoryMenuVisible(false);
        setSubcategoryMenuVisible(false);
    }, [selectedCategoryId, selectedSubcategoryId]);

    // Fechar o menu de subcategoria quando a própria seleção mudar (reforço de UX)
    useEffect(() => {
        setSubcategoryMenuVisible(false);
    }, [selectedSubcategoryId]);

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
                    anchorPosition="bottom"
                    anchor={
                        <Button
                            mode="outlined"
                            onPress={() => {
                                if (disabled) return;
                                // Toggle para recuperar de estados travados/fora de sincronia
                                setCategoryMenuVisible((v) => !v);
                            }}
                            icon="chevron-down"
                            contentStyle={styles.buttonContent}
                            style={styles.button}
                            testID="category-anchor"
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
                            testID={`category-item-${categoria.id}`}
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
                        anchorPosition="bottom"
                        anchor={
                            <Button
                                mode="outlined"
                                onPress={() => {
                                    if (disabled) return;
                                    setSubcategoryMenuVisible((v) => !v);
                                }}
                                icon="chevron-down"
                                contentStyle={styles.buttonContent}
                                style={styles.button}
                                testID="subcategory-anchor"
                                disabled={disabled}
                            >
                                {subcategoryLabel}
                            </Button>
                        }
                    >
                        {/* Opção para limpar subcategoria */}
                        <Menu.Item
                            key="subcategory-item-none"
                            onPress={() => {
                                onSubcategoryChange(undefined);
                                setSubcategoryMenuVisible(false);
                            }}
                            title="Nenhuma (todas)"
                            testID={`subcategory-item-none`}
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
                                testID={`subcategory-item-${subcategoria.id}`}
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

