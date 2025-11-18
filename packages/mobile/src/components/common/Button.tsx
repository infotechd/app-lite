import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacityProps
} from 'react-native';
import { THEME_CONFIG } from '../../constants/config';
import { radius } from '@/styles/theme';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'small' | 'medium' | 'large';
    loading?: boolean;
    fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
                                           title,
                                           variant = 'primary',
                                           size = 'medium',
                                           loading = false,
                                           fullWidth = false,
                                           disabled,
                                           style,
                                           ...props
                                       }) => {
    const buttonStyle = [
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
    ];

    const textStyle = [
        styles.text,
        styles[`${variant}Text`],
        styles[`${size}Text`],
    ];

    return (
        <TouchableOpacity
            style={buttonStyle}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'outline' ? THEME_CONFIG.COLORS.PRIMARY : '#fff'}
                    size="small"
                />
            ) : (
                <Text style={textStyle}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

export default Button;

const styles = StyleSheet.create({
    button: {
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },

    // Variants
    primary: {
        backgroundColor: THEME_CONFIG.COLORS.PRIMARY,
    },
    secondary: {
        backgroundColor: THEME_CONFIG.COLORS.SECONDARY,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: THEME_CONFIG.COLORS.PRIMARY,
    },

    // Sizes
    small: {
        paddingHorizontal: THEME_CONFIG.SPACING.MD,
        paddingVertical: THEME_CONFIG.SPACING.SM,
        minHeight: 36,
    },
    medium: {
        paddingHorizontal: THEME_CONFIG.SPACING.LG,
        paddingVertical: THEME_CONFIG.SPACING.MD,
        minHeight: 48,
    },
    large: {
        paddingHorizontal: THEME_CONFIG.SPACING.XL,
        paddingVertical: THEME_CONFIG.SPACING.LG,
        minHeight: 56,
    },

    // States
    disabled: {
        opacity: 0.5,
    },
    fullWidth: {
        width: '100%',
    },

    // Text styles
    text: {
        fontWeight: '600',
        textAlign: 'center',
    },
    primaryText: {
        color: '#fff',
    },
    secondaryText: {
        color: '#fff',
    },
    outlineText: {
        color: THEME_CONFIG.COLORS.PRIMARY,
    },
    smallText: {
        fontSize: 14,
    },
    mediumText: {
        fontSize: 16,
    },
    largeText: {
        fontSize: 18,
    },
});