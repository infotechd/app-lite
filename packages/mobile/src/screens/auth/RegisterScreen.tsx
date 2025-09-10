import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, TextInput, HelperText, Snackbar, SegmentedButtons } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthStackParamList } from '@/types';
import { registerSchema, type RegisterFormData } from '@/utils/validation';
import { MESSAGES } from '@/constants/messages';
import { AuthService } from '@/services/authService';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
    const [submitting, setSubmitting] = React.useState(false);
    const [snack, setSnack] = React.useState<{ visible: boolean; message: string }>(
        { visible: false, message: '' }
    );

    const { control, handleSubmit, formState: { errors }, setError } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            nome: '',
            email: '',
            password: '',
            telefone: '',
            tipo: 'buyer',
        },
        mode: 'onChange',
    });

    const onSubmit = async (data: RegisterFormData) => {
        try {
            setSubmitting(true);
            await AuthService.register(data);
            setSnack({ visible: true, message: MESSAGES.SUCCESS.REGISTER });
            setTimeout(() => {
                navigation.replace('Login');
            }, 500);
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.message || MESSAGES.ERROR.GENERIC;
            setSnack({ visible: true, message: msg });
            if (/email/i.test(String(msg))) {
                setError('email', { type: 'server', message: msg });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineSmall" style={styles.title}>Criar conta</Text>

            <Controller
                control={control}
                name="nome"
                render={({ field: { onChange, onBlur, value } }) => (
                    <>
                        <TextInput
                            mode="outlined"
                            label="Nome"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            style={styles.input}
                            error={!!errors.nome}
                            testID="input-nome"
                        />
                        {!!errors.nome && (
                            <HelperText type="error" visible>
                                {errors.nome.message}
                            </HelperText>
                        )}
                    </>
                )}
            />

            <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                    <>
                        <TextInput
                            mode="outlined"
                            label="E-mail"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            style={styles.input}
                            error={!!errors.email}
                            testID="input-email"
                        />
                        {!!errors.email && (
                            <HelperText type="error" visible>
                                {errors.email.message}
                            </HelperText>
                        )}
                    </>
                )}
            />

            <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                    <>
                        <TextInput
                            mode="outlined"
                            label="Senha"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            secureTextEntry
                            style={styles.input}
                            error={!!errors.password}
                            testID="input-password"
                        />
                        {!!errors.password && (
                            <HelperText type="error" visible>
                                {errors.password.message}
                            </HelperText>
                        )}
                    </>
                )}
            />

            <Controller
                control={control}
                name="telefone"
                render={({ field: { onChange, onBlur, value } }) => (
                    <>
                        <TextInput
                            mode="outlined"
                            label="Telefone (opcional)"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            placeholder="(11) 99999-9999"
                            keyboardType="phone-pad"
                            style={styles.input}
                            error={!!errors.telefone}
                            testID="input-telefone"
                        />
                        {!!errors.telefone && (
                            <HelperText type="error" visible>
                                {errors.telefone.message}
                            </HelperText>
                        )}
                    </>
                )}
            />

            <Controller
                control={control}
                name="tipo"
                render={({ field: { onChange, value } }) => (
                    <View style={{ marginBottom: 12 }}>
                        <Text variant="labelLarge" style={{ marginBottom: 8 }}>Tipo de usuário</Text>
                        <SegmentedButtons
                            value={value}
                            onValueChange={onChange}
                            buttons={[
                                { value: 'buyer', label: 'Comprador' },
                                { value: 'provider', label: 'Prestador' },
                                { value: 'advertiser', label: 'Anunciante' },
                            ]}
                        />
                        {!!errors.tipo && (
                            <HelperText type="error" visible>
                                {errors.tipo.message}
                            </HelperText>
                        )}
                    </View>
                )}
            />

            <Button mode="contained" loading={submitting} disabled={submitting} onPress={handleSubmit(onSubmit)} testID="btn-registrar">
                Registrar
            </Button>
            <Button onPress={() => navigation.navigate('Login')} style={styles.link} disabled={submitting} testID="btn-ja-tenho-conta">
                Já tenho uma conta
            </Button>

            <Snackbar
                visible={snack.visible}
                onDismiss={() => setSnack({ visible: false, message: '' })}
                duration={2000}
            >
                {snack.message}
            </Snackbar>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
    },
    title: {
        marginBottom: 16,
    },
    input: {
        marginBottom: 12,
    },
    link: {
        marginTop: 8,
    },
});

export default RegisterScreen;
