/**
 * Tela de Registro Completa - Com tipoPessoa e campos dinâmicos
 * * Funcionalidades:
 * - Seleção de tipo de pessoa (PF/PJ)
 * - Campos dinâmicos baseados no tipo selecionado
 * - Formatação automática de CPF/CNPJ
 * - Formatação automática de telefone
 * * Localização: packages/mobile/src/screens/auth/RegisterScreen.tsx
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
import { AuthStackParamList } from '@/types';
import { MESSAGES } from '@/constants/messages';
import { AuthService } from '@/services/authService';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { registerSchema, RegisterFormData } from '@/utils/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

// ✅ FUNÇÕES DE FORMATAÇÃO

/**
 * Formata uma string para o padrão de CPF (000.000.000-00).
 * Remove caracteres não numéricos e aplica a máscara progressivamente.
 *
 * @param value - A string bruta informada pelo usuário.
 * @returns A string formatada com a máscara de CPF.
 */
function formatCPF(value: string): string {
    // Remove tudo que não for dígito e limita a 11 caracteres
    const numbers = value.replace(/\D/g, '').slice(0, 11);

    // Aplica formatação de acordo com a quantidade de números digitados
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
}

/**
 * Formata uma string para o padrão de CNPJ (00.000.000/0000-00).
 * Remove caracteres não numéricos e aplica a máscara progressivamente.
 *
 * @param value - A string bruta informada pelo usuário.
 * @returns A string formatada com a máscara de CNPJ.
 */
function formatCNPJ(value: string): string {
    // Remove tudo que não for dígito e limita a 14 caracteres
    const numbers = value.replace(/\D/g, '').slice(0, 14);

    // Aplica formatação de acordo com a quantidade de números digitados
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
}

/**
 * Componente de tela de Registro.
 * Permite que novos usuários criem uma conta, selecionando entre Pessoa Física (PF)
 * ou Pessoa Jurídica (PJ) e preenchendo os dados necessários.
 *
 * @param props - Propriedades de navegação recebidas pelo componente.
 * @returns Elemento React que renderiza a tela de registro.
 */
const RegisterScreen: React.FC<Props> = ({ navigation }) => {
    // Estado que controla se o formulário está sendo enviado para desabilitar botões
    const [submitting, setSubmitting] = useState(false);

    // Referência para controlar submissão e evitar disparos duplicados (race conditions)
    const submittingRef = React.useRef(false);

    // Estado para gerenciar a visibilidade e mensagem do Snackbar de feedback
    const [snack, setSnack] = useState<{ visible: boolean; message: string }>({
        visible: false,
        message: ''
    });

    // Controla se o formulário exibido é para Pessoa Física ou Pessoa Jurídica
    const [tipoPessoa, setTipoPessoa] = useState<'PF' | 'PJ'>('PF');

    // Inicialização do hook de formulário com validação via Zod
    const {
        control,
        handleSubmit,
        formState: { errors },
        setError,
        reset,
        getValues
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
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

    /**
     * Efeito colateral acionado sempre que o tipo de pessoa (PF/PJ) é alterado.
     * Limpa os campos específicos do tipo anterior para evitar submissão de dados incoerentes,
     * enquanto mantém os dados de uso comum já preenchidos pelo usuário.
     */
    React.useEffect(() => {
        // Obtém valores atuais para não perder dados comuns como email e senha
        const currentValues = getValues();

        // Reseta o formulário com o novo contexto de tipo de pessoa
        reset({
            // Limpa campos que são exclusivos de um tipo ou de outro
            nome: '',
            cpf: '',
            cnpj: '',
            razaoSocial: '',
            nomeFantasia: '',

            // Preserva os dados que são compartilhados entre ambos os tipos
            email: currentValues.email,
            password: currentValues.password,
            telefone: currentValues.telefone,
            tipo: currentValues.tipo,

            // Atualiza o discriminador de tipo de pessoa no formulário
            tipoPessoa: tipoPessoa,
        });
    }, [tipoPessoa, reset, getValues]);

    /**
     * Altera o estado do tipo de pessoa (PF ou PJ).
     *
     * @param newTipo - O novo valor selecionado no SegmentedButton.
     */
    const handleTipoPessoaChange = (newTipo: 'PF' | 'PJ') => {
        // Apenas atualiza se houver uma mudança real para evitar re-renderizações inúteis
        if (newTipo && newTipo !== tipoPessoa) {
            setTipoPessoa(newTipo);
        }
    };

    /**
     * Função chamada ao submeter o formulário após validação bem-sucedida.
     * Realiza a chamada ao serviço de autenticação e trata a resposta/erros.
     *
     * @param data - Objeto contendo todos os dados validados do formulário.
     */
    const onSubmit = async (data: RegisterFormData) => {
        // Impede submissões simultâneas
        if (submittingRef.current) return;
        submittingRef.current = true;

        try {
            setSubmitting(true);

            // Tenta realizar o registro através do serviço Auth
            await AuthService.register(data);

            // Em caso de sucesso, mostra feedback e redireciona
            setSnack({ visible: true, message: MESSAGES.SUCCESS.REGISTER });
            setTimeout(() => {
                navigation.replace('Login');
            }, 500);
        } catch (e: any) {
            // Extrai mensagem de erro da resposta da API ou utiliza mensagem genérica
            const msg = e?.response?.data?.message || e?.message || MESSAGES.ERROR.GENERIC;
            setSnack({ visible: true, message: msg });

            const m = String(msg);
            // Mapeia erros de validação do servidor de volta para os campos do formulário
            if (/email/i.test(m)) {
                setError('email', { type: 'server', message: msg });
            }
            if (/cnpj/i.test(m)) {
                setError('cnpj', { type: 'server', message: msg });
            }
            if (/cpf/i.test(m)) {
                setError('cpf', { type: 'server', message: msg });
            }
        } finally {
            // Finaliza estado de carregamento e libera a ref de submissão
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                {/* Título da tela de registro */}
                <Text testID="title-registrar" variant="headlineSmall" style={styles.title}>Criar conta</Text>

                {/* Seção de seleção do tipo de cadastro (PF/PJ) */}
                <View style={styles.section}>
                    <Text variant="labelLarge" style={styles.sectionLabel}>
                        Tipo de Cadastro
                    </Text>
                    <SegmentedButtons
                        value={tipoPessoa}
                        onValueChange={(value) => handleTipoPessoaChange(value as 'PF' | 'PJ')}
                        buttons={[
                            { value: 'PF', label: 'Pessoa Física', icon: 'account', testID: 'btn-pf' },
                            { value: 'PJ', label: 'Pessoa Jurídica', icon: 'domain', testID: 'btn-pj' },
                        ]}
                    />
                </View>

                <Divider style={styles.divider} />

                {/* Renderização condicional: Campos específicos para PESSOA FÍSICA */}
                {tipoPessoa === 'PF' && (
                    <>
                        <Controller
                            control={control}
                            name="nome"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <>
                                    <TextInput
                                        testID="input-nome"
                                        mode="outlined"
                                        label="Nome Completo *"
                                        value={value ?? ''}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        style={styles.input}
                                        error={!!errors.nome}
                                    />
                                    {/* Exibição de erro de validação para o campo Nome */}
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
                                        testID="input-cpf"
                                        mode="outlined"
                                        label="CPF *"
                                        value={value ?? ''}
                                        onChangeText={(text) => onChange(formatCPF(text))}
                                        onBlur={onBlur}
                                        keyboardType="number-pad"
                                        style={styles.input}
                                        error={!!errors.cpf}
                                        maxLength={14}
                                    />
                                    {/* Exibição de erro de validação para o campo CPF */}
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

                {/* Renderização condicional: Campos específicos para PESSOA JURÍDICA */}
                {tipoPessoa === 'PJ' && (
                    <>
                        <Controller
                            control={control}
                            name="razaoSocial"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <>
                                    <TextInput
                                        testID="input-razaoSocial"
                                        mode="outlined"
                                        label="Razão Social *"
                                        value={value ?? ''}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        style={styles.input}
                                        error={!!errors.razaoSocial}
                                    />
                                    {/* Exibição de erro de validação para o campo Razão Social */}
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
                                    testID="input-nomeFantasia"
                                    mode="outlined"
                                    label="Nome Fantasia (opcional)"
                                    value={value ?? ''}
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
                                        testID="input-cnpj"
                                        mode="outlined"
                                        label="CNPJ *"
                                        value={value ?? ''}
                                        onChangeText={(text) => onChange(formatCNPJ(text))}
                                        onBlur={onBlur}
                                        keyboardType="number-pad"
                                        style={styles.input}
                                        error={!!errors.cnpj}
                                        maxLength={18}
                                    />
                                    {/* Exibição de erro de validação para o campo CNPJ */}
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

                {/* SEÇÃO DE CAMPOS COMUNS (Aparecem para ambos os tipos) */}
                
                {/* Campo de E-mail com validação e teclado apropriado */}
                <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <>
                            <TextInput
                                testID="input-email"
                                mode="outlined"
                                label="E-mail *"
                                value={value ?? ''}
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

                {/* Campo de Telefone com formatação automática de máscara */}
                <Controller
                    control={control}
                    name="telefone"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <>
                            <TextInput
                                testID="input-telefone"
                                mode="outlined"
                                label="Telefone (opcional)"
                                value={value ?? ''}
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

                {/* Campo de Senha com entrada protegida (secureTextEntry) */}
                <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <>
                            <TextInput
                                testID="input-password"
                                mode="outlined"
                                label="Senha *"
                                value={value ?? ''}
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

                {/* Seleção da finalidade do usuário no sistema */}
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
                                    { value: 'buyer', label: 'Comprador', testID: 'seg-buyer' },
                                    { value: 'provider', label: 'Prestador', testID: 'seg-provider' },
                                    { value: 'advertiser', label: 'Anunciante', testID: 'seg-advertiser' },
                                ]}
                            />
                        </View>
                    )}
                />

                {/* Botão de envio do formulário */}
                <Button
                    testID="btn-registrar"
                    mode="contained"
                    loading={submitting}
                    disabled={submitting}
                    onPress={handleSubmit(onSubmit)}
                    style={styles.submitButton}
                >
                    Registrar
                </Button>

                {/* Link para navegação de volta para a tela de Login */}
                <Button
                    testID="btn-ja-tenho-conta"
                    onPress={() => navigation.navigate('Login')}
                    style={styles.link}
                    disabled={submitting}
                >
                    Já tenho uma conta
                </Button>

                {/* Snackbar para exibição de alertas e mensagens de sucesso/erro */}
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