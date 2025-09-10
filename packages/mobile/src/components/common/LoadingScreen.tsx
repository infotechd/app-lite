import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { THEME_CONFIG } from '@/constants/config';

interface LoadingScreenProps {
    message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
                                                                message = 'Carregando...'
                                                            }) => {
    return (
        <View style={styles.container}>
            <ActivityIndicator
                size="large"
                color={THEME_CONFIG.COLORS.PRIMARY}
            />
            <Text style={styles.message}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: THEME_CONFIG.COLORS.BACKGROUND,
    },
    message: {
        marginTop: THEME_CONFIG.SPACING.MD,
        fontSize: 16,
        color: THEME_CONFIG.COLORS.TEXT_SECONDARY,
        textAlign: 'center',
    },
});