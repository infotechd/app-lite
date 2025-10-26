/**
 * Tela de Registro Completa - Com tipoPessoa e campos dinâmicos
 * 
 * Funcionalidades:
 * - Seleção de tipo de pessoa (PF/PJ)
 * - Campos dinâmicos baseados no tipo selecionado
 * - Formatação automática de CPF/CNPJ
 * - Formatação automática de telefone
 * 
 * Localização: packages/mobile/src/screens/auth/RegisterScreen.tsx
 */

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
    Button,
    Text,
    TextInput,
    HelperText,
    Snackbar,
    SegmentedButtons,
    Divider
} from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthStackParamList } from '@/types';
import { MESSAGES } from '@/constants/messages';
import { AuthService } from '@/services/authService';
import { formatPhoneNumber } from '@/utils/phoneFormatter';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

// ✅ FUNÇÕES DE FORMATAÇÃO
function formatCPF(value: string): string {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
}

function formatCNPJ(value: string): string {
    const numbers = value.replace(/\D/g, '').slice(0, 14);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
}

// ✅ SCHEMA DE VALIDAÇÃO DINÂMICO
const createRegisterSchema = (tipoPessoa: 'PF' | 'PJ') => {
    const baseSchema = {
        nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
        email: z.string().email('Email inválido').toLowerCase(),
        password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
        telefone: z.string().optional(),
        tipo: z.enum(['buyer', 'provider', 'advertiser']),
        tipoPessoa: z.enum(['PF', 'PJ']),
    };

    if (tipoPessoa === 'PF') {
        return z.object({
            ...baseSchema,
            cpf: z.string().min(11, 'CPF inválido').refine(
                (val) => val.replace(/\D/g, '').length === 11,
                'CPF deve ter 11 dígitos'
            ),
        });
    } else {
        return z.object({
            ...baseSchema,
            cnpj: z.string().min(14, 'CNPJ inválido').refine(
                (val) => val.replace(/\D/g, '').length === 14,
                'CNPJ deve ter 14 dígitos'
            ),
            razaoSocial: z.string().min(2, 'Razão social é obrigatória'),
            nomeFantasia: z.string().optional(),
        });
    }
};

type RegisterFormData = z.infer<ReturnType<typeof createRegisterSchema>>;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = React.useRef(false);
    const [snack, setSnack] = useState<{ visible: boolean; message: string }>({
        visible: false,
        message: ''
    });
    
    // ✅ ESTADO PARA TIPO DE PESSOA
    const [tipoPessoa, setTipoPessoa] = useState<'PF' | 'PJ'>('PF');

    const { control, handleSubmit, formState: { errors }, setError, reset } = useForm<any>({
        resolver: zodResolver(createRegisterSchema(tipoPessoa)),
        defaultValues: {
            nome: '',
            email: '',
            password: '',
            telefone: '',
            tipo: 'buyer',
            tipoPessoa: 'PF',
            cpf: '',
            cnpj: '',
            razaoSocial: '',
            nomeFantasia: '',
        },
        mode: 'onChange',
    });

    // ✅ ATUALIZAR SCHEMA QUANDO TIPO DE PESSOA MUDAR
    const handleTipoPessoaChange = (newTipo: 'PF' | 'PJ') => {
        setTipoPessoa(newTipo);
        // Resetar campos específicos
        reset({
            ...control._formValues,
            tipoPessoa: newTipo,
            cpf: '',
            cnpj: '',
            razaoSocial: '',
            nomeFantasia: '',
        });
    };

    const onSubmit = async (data: any) => {
        if (submittingRef.current) return;
        submittingRef.current = true;
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
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text variant="headlineSmall" style={styles.title}>Criar conta</Text>

                {/* ✅ SELETOR DE TIPO DE PESSOA */}
                <View style={styles.section}>
                    <Text variant="labelLarge" style={styles.sectionLabel}>
                        Tipo de Cadastro
                    </Text>
                    <SegmentedButtons
                        value={tipoPessoa}
                        onValueChange={handleTipoPessoaChange}
                        buttons={[
                            { value: 'PF', label: 'Pessoa Física', icon: 'account' },
                            { value: 'PJ', label: 'Pessoa Jurídica', icon: 'domain' },
                        ]}
                    />
                </View>

                <Divider style={styles.divider} />

                {/* CAMPOS PARA PESSOA FÍSICA */}
                {tipoPessoa === 'PF' && (
                    <>
                        <Controller
                            control={control}
                            name="nome"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <>
                                    <TextInput
                                        mode="outlined"
                                        label="Nome Completo *"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        style={styles.input}
                                        error={!!errors.nome}
                                    />
                                    {!!errors.nome && (
                                        <HelperText type="error" visible>
                                            {errors.nome.message as string}
                                        </HelperText>
                                    )}
                                </>
                            )}
                        />

                        <Controller
                            control={control}
                            name="cpf"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <>
                                    <TextInput
                                        mode="outlined"
                                        label="CPF *"
                                        value={value}
                                        onChangeText={(text) => onChange(formatCPF(text))}
                                        onBlur={onBlur}
                                        keyboardType="number-pad"
                                        style={styles.input}
                                        error={!!errors.cpf}
                                        maxLength={14}
                                    />
                                    {!!errors.cpf && (
                                        <HelperText type="error" visible>
                                            {errors.cpf.message as string}
                                        </HelperText>
                                    )}
                                </>
                            )}
                        />
                    </>
                )}

                {/* CAMPOS PARA PESSOA JURÍDICA */}
                {tipoPessoa === 'PJ' && (
                    <>
                        <Controller
                            control={control}
                            name="razaoSocial"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <>
                                    <TextInput
                                        mode="outlined"
                                        label="Razão Social *"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        style={styles.input}
                                        error={!!errors.razaoSocial}
                                    />
                                    {!!errors.razaoSocial && (
                                        <HelperText type="error" visible>
                                            {errors.razaoSocial.message as string}
                                        </HelperText>
                                    )}
                                </>
                            )}
                        />

                        <Controller
                            control={control}
                            name="nomeFantasia"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    mode="outlined"
                                    label="Nome Fantasia (opcional)"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    style={styles.input}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="cnpj"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <>
                                    <TextInput
                                        mode="outlined"
                                        label="CNPJ *"
                                        value={value}
                                        onChangeText={(text) => onChange(formatCNPJ(text))}
                                        onBlur={onBlur}
                                        keyboardType="number-pad"
                                        style={styles.input}
                                        error={!!errors.cnpj}
                                        maxLength={18}
                                    />
                                    {!!errors.cnpj && (
                                        <HelperText type="error" visible>
                                            {errors.cnpj.message as string}
                                        </HelperText>
                                    )}
                                </>
                            )}
                        />
                    </>
                )}

                {/* CAMPOS COMUNS */}
                <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <>
                            <TextInput
                                mode="outlined"
                                label="E-mail *"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                style={styles.input}
                                error={!!errors.email}
                            />
                            {!!errors.email && (
                                <HelperText type="error" visible>
                                    {errors.email.message as string}
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
                                onChangeText={(text) => onChange(formatPhoneNumber(text))}
                                onBlur={onBlur}
                                placeholder="(11) 99999-9999"
                                keyboardType="phone-pad"
                                style={styles.input}
                                error={!!errors.telefone}
                                maxLength={15}
                            />
                            {!!errors.telefone && (
                                <HelperText type="error" visible>
                                    {errors.telefone.message as string}
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
                                label="Senha *"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                secureTextEntry
                                style={styles.input}
                                error={!!errors.password}
                            />
                            {!!errors.password && (
                                <HelperText type="error" visible>
                                    {errors.password.message as string}
                                </HelperText>
                            )}
                        </>
                    )}
                />

                <Controller
                    control={control}
                    name="tipo"
                    render={({ field: { onChange, value } }) => (
                        <View style={styles.section}>
                            <Text variant="labelLarge" style={styles.sectionLabel}>
                                Tipo de Usuário *
                            </Text>
                            <SegmentedButtons
                                value={value}
                                onValueChange={onChange}
                                buttons={[
                                    { value: 'buyer', label: 'Comprador' },
                                    { value: 'provider', label: 'Prestador' },
                                    { value: 'advertiser', label: 'Anunciante' },
                                ]}
                            />
                        </View>
                    )}
                />

                <Button
                    mode="contained"
                    loading={submitting}
                    disabled={submitting}
                    onPress={handleSubmit(onSubmit)}
                    style={styles.submitButton}
                >
                    Registrar
                </Button>

                <Button
                    onPress={() => navigation.navigate('Login')}
                    style={styles.link}
                    disabled={submitting}
                >
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
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    title: {
        marginBottom: 24,
        textAlign: 'center',
    },
    section: {
        marginBottom: 16,
    },
    sectionLabel: {
        marginBottom: 8,
    },
    input: {
        marginBottom: 8,
    },
    divider: {
        marginVertical: 16,
    },
    submitButton: {
        marginTop: 16,
    },
    link: {
        marginTop: 8,
    },
});

export default RegisterScreen;
