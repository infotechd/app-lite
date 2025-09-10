import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { spacing } from '@/styles/theme';
import { MediaFile } from '@/utils/validation';

interface MediaChipsProps {
    title?: string;
    mediaFiles: MediaFile[];
    onRemove: (index: number) => void;
    onAddPress: () => void;
    max: number;
}

const MediaChips: React.FC<MediaChipsProps> = ({ title = 'Mídias', mediaFiles, onRemove, onAddPress, max }) => {
    return (
        <View>
            <Text variant="titleSmall" style={styles.label}>{`${title}`}</Text>
            <View style={styles.row}>
                {mediaFiles.map((m, idx) => (
                    <Chip
                        key={`${m.uri}-${idx}`}
                        icon={m.type.startsWith('video') ? 'video' : 'image'}
                        onClose={() => onRemove(idx)}
                        style={styles.chip}
                    >
                        {m.name}
                    </Chip>
                ))}
                {mediaFiles.length < max && (
                    <Chip icon="plus" onPress={onAddPress} style={styles.chip}>
                        Adicionar
                    </Chip>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    label: {
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
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

export default MediaChips;
