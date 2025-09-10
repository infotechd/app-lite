import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Avatar, Divider } from 'react-native-paper';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/styles/theme';
import { getUserTipoLabel } from '@/utils/labels';

const ProfileHome: React.FC = () => {
    const { user, logout, isAuthenticated } = useAuth();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Avatar.Text label={(user?.nome?.[0] ?? 'U').toUpperCase()} size={64} />
                <View style={{ marginLeft: spacing.md }}>
                    <Text variant="titleLarge">{user?.nome ?? 'Usuário'}</Text>
                    <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>{user?.email ?? ''}</Text>
                    <Text variant="bodySmall" style={{ color: colors.textSecondary }}>Tipo: {getUserTipoLabel(user?.tipo)}</Text>
                </View>
            </View>

            <Divider style={{ marginVertical: spacing.lg }} />

            {isAuthenticated && (
                <Button mode="contained" onPress={logout}>
                    Sair
                </Button>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.md,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default ProfileHome;
