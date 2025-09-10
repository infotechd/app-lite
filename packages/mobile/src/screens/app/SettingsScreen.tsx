import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';

const SettingsScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text variant="headlineMedium">Configurações</Text>
            <Text variant="bodyMedium">Funcionalidade em desenvolvimento</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.background,
    },
});

export default SettingsScreen;