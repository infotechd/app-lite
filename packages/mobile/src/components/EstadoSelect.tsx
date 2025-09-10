import React, { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Menu, Text } from 'react-native-paper';
import { BRAZIL_STATES } from '@/constants/brazilStates';
import { colors, spacing } from '@/styles/theme';

interface EstadoSelectProps {
    value: string; // UF
    onChange: (uf: string, cidadeAuto?: string) => void;
    label?: string;
}

const EstadoSelect: React.FC<EstadoSelectProps> = ({ value, onChange, label = 'Estado' }) => {
    const [visible, setVisible] = useState(false);
    const selected = useMemo(() => BRAZIL_STATES.find((s) => s.uf === value), [value]);

    return (
        <>
            <Text variant="titleSmall" style={styles.label}>{label}</Text>
            <Menu
                visible={visible}
                onDismiss={() => setVisible(false)}
                anchor={
                    <Button mode="outlined" onPress={() => setVisible(true)} style={styles.input}>
                        {selected ? `${selected.nome} (${selected.uf})` : 'Selecionar estado'}
                    </Button>
                }
            >
                {BRAZIL_STATES.map((s) => (
                    <Menu.Item
                        key={s.uf}
                        onPress={() => {
                            onChange(s.uf, s.capital);
                            setVisible(false);
                        }}
                        title={`${s.nome} (${s.uf})`}
                    />
                ))}
            </Menu>
        </>
    );
};

const styles = StyleSheet.create({
    label: {
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
        color: colors.textSecondary,
    },
    input: {
        marginBottom: spacing.sm,
    },
});

export default EstadoSelect;
