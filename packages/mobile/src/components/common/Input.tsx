import React, { forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { THEME_CONFIG } from '@/constants/config';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(
    (
        { label, error, helperText, leftIcon, rightIcon, style, ...props },
        ref
    ) => {
        const hasError = !!error;

        return (
            <View style={styles.container}>
                {label && <Text style={styles.label}>{label}</Text>}

                <View
                    style={[
                        styles.inputContainer,
                        hasError && styles.inputContainerError,
                    ]}
                >
                    {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

                    <TextInput
                        ref={ref}
                        style={[
                            styles.input,
                            !!leftIcon && styles.inputWithLeftIcon,
                            !!rightIcon && styles.inputWithRightIcon,
                            style,
                        ]}
                        placeholderTextColor={THEME_CONFIG.COLORS.TEXT_SECONDARY}
                        {...props}
                    />

                    {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
                </View>

                {(error || helperText) && (
                    <Text style={[styles.helperText, hasError && styles.errorText]}>
                        {error || helperText}
                    </Text>
                )}
            </View>
        );
    }
);

const styles = StyleSheet.create({
    container: {
        marginBottom: THEME_CONFIG.SPACING.MD,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: THEME_CONFIG.COLORS.TEXT,
        marginBottom: THEME_CONFIG.SPACING.SM,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: THEME_CONFIG.BORDER_RADIUS.MD,
        backgroundColor: '#fff',
    },
    inputContainerError: {
        borderColor: THEME_CONFIG.COLORS.ERROR,
    },
    input: {
        flex: 1,
        paddingHorizontal: THEME_CONFIG.SPACING.MD,
        paddingVertical: THEME_CONFIG.SPACING.MD,
        fontSize: 16,
        color: THEME_CONFIG.COLORS.TEXT,
        minHeight: 48,
    },
    inputWithLeftIcon: {
        paddingLeft: THEME_CONFIG.SPACING.SM,
    },
    inputWithRightIcon: {
        paddingRight: THEME_CONFIG.SPACING.SM,
    },
    leftIcon: {
        paddingLeft: THEME_CONFIG.SPACING.MD,
    },
    rightIcon: {
        paddingRight: THEME_CONFIG.SPACING.MD,
    },
    helperText: {
        fontSize: 14,
        color: THEME_CONFIG.COLORS.TEXT_SECONDARY,
        marginTop: THEME_CONFIG.SPACING.XS,
    },
    errorText: {
        color: THEME_CONFIG.COLORS.ERROR,
    },
});