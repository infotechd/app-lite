import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { TextInput, HelperText } from 'react-native-paper';
import DropdownPicker from './DropdownPicker';
import { BRAZIL_STATES } from '@/constants/brazilStates';
import { spacing } from '@/styles/theme';

interface LocationFieldsProps {
    estado: string;
    cidade: string;
    stateOptions: { label: string; value: string | number }[];
    errors: { estado?: string; cidade?: string };
    onEstadoChange: (uf: string) => void;
    onCidadeChange: (cidade: string) => void;
    inputStyle?: StyleProp<ViewStyle>;
}

/**
 * Componente que agrupa os campos de localização (Estado e Cidade).
 * Centraliza a lógica de seleção de estado e preenchimento automático da capital.
 */
export const LocationFields: React.FC<LocationFieldsProps> = ({
    estado,
    cidade,
    stateOptions,
    errors,
    onEstadoChange,
    onCidadeChange,
    inputStyle,
}) => {
    const handleEstadoChange = (value: string | number | null) => {
        const uf = value as string;
        onEstadoChange(uf);
        if (uf === 'BR') {
            onCidadeChange('');
        } else {
            const state = BRAZIL_STATES.find(s => s.uf === uf);
            if (state) onCidadeChange(state.capital);
        }
    };

    return (
        <>
            <DropdownPicker
                label="Localização *"
                options={stateOptions}
                selectedValue={estado}
                onValueChange={handleEstadoChange}
                placeholder="Selecione um estado"
                error={errors.estado}
            />

            {estado && estado !== 'BR' && (
                <>
                    <TextInput
                        label="Cidade"
                        value={cidade}
                        onChangeText={onCidadeChange}
                        style={[styles.input, inputStyle]}
                        mode="outlined"
                        error={!!errors.cidade}
                        placeholder="Digite a cidade"
                    />
                    {!!errors.cidade && <HelperText type="error">{errors.cidade}</HelperText>}
                </>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    input: {
        marginBottom: spacing.sm,
    },
});
