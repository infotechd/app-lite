import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';

interface CategoryChipsProps {
    title?: string;
    categories: string[];
    value: string;
    onChange: (cat: string) => void;
}

const CategoryChips: React.FC<CategoryChipsProps> = ({ title = 'Categoria', categories, value, onChange }) => {
    return (
        <View>
            <Text variant="titleSmall" style={styles.label}>{title}</Text>
            <View style={styles.row}>
                {categories.map((cat) => (
                    <Chip
                        key={cat}
                        style={styles.chip}
                        selected={value === cat}
                        onPress={() => onChange(value === cat ? '' : cat)}
                    >
                        {cat}
                    </Chip>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    label: {
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
        color: colors.textSecondary,
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: spacing.sm,
    },
    chip: {
        marginRight: spacing.xs,
        marginBottom: spacing.xs,
    },
});

export default CategoryChips;
