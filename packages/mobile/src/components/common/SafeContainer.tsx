import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME_CONFIG } from '@/constants/config';

interface SafeContainerProps {
    children: ReactNode;
    style?: ViewStyle;
    edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export const SafeContainer: React.FC<SafeContainerProps> = ({
                                                                children,
                                                                style,
                                                                edges = ['top', 'bottom'],
                                                            }) => {
    return (
        <SafeAreaView style={[styles.container, style]} edges={edges}>
            <View style={styles.content}>
                {children}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME_CONFIG.COLORS.BACKGROUND,
    },
    content: {
        flex: 1,
    },
});