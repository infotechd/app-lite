import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/styles/theme';
import { getUserTipoLabel } from '@/utils/labels';

const ProfileScreen: React.FC = () => {
    const { user, logout } = useAuth();

    return (
        <View style={styles.container}>
            <Text variant="headlineMedium">Perfil</Text>
            <Text variant="bodyLarge">Olá, {user?.nome}!</Text>
            <Text variant="bodyMedium">Tipo: {getUserTipoLabel(user?.tipo)}</Text>
            <Text variant="bodyMedium">Email: {user?.email}</Text>

            <Button
                mode="contained"
                onPress={logout}
                style={styles.logoutButton}
            >
                Sair
            </Button>
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
    logoutButton: {
        marginTop: spacing.lg,
    },
});

export default ProfileScreen;