import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/styles/theme';
import { AuthStackParamList } from '@/types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Erro', 'Preencha todos os campos');
            return;
        }

        try {
            setIsLoading(true);
            await login(email, password);
        } catch (error: any) {
            const message = error?.message || error?.response?.data?.message || 'Erro ao fazer login';
            Alert.alert('Erro', message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="headlineMedium" style={styles.title}>
                        Super App
                    </Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>
                        Faça login para continuar
                    </Text>

                    <TextInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        mode="outlined"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={styles.input}
                    />

                    <TextInput
                        label="Senha"
                        value={password}
                        onChangeText={setPassword}
                        mode="outlined"
                        secureTextEntry
                        style={styles.input}
                    />

                    <Button
                        mode="contained"
                        onPress={handleLogin}
                        loading={isLoading}
                        disabled={isLoading}
                        style={styles.button}
                    >
                        Entrar
                    </Button>

                    <Button
                        mode="text"
                        onPress={() => navigation.navigate('Register')}
                        style={styles.linkButton}
                    >
                        Não tem conta? Cadastre-se
                    </Button>

                    <Button
                        mode="text"
                        onPress={() => navigation.navigate('ForgotPassword')}
                        style={styles.linkButton}
                    >
                        Esqueci minha senha
                    </Button>
                </Card.Content>
            </Card>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: spacing.md,
        backgroundColor: colors.background,
    },
    card: {
        padding: spacing.md,
    },
    title: {
        textAlign: 'center',
        marginBottom: spacing.sm,
        color: colors.primary,
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: spacing.lg,
        color: colors.textSecondary,
    },
    input: {
        marginBottom: spacing.md,
    },
    button: {
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    linkButton: {
        marginVertical: spacing.xs,
    },
});

export default LoginScreen;