/**
 * Tela de Registro (RegisterScreen)
 * - Responsável por cadastrar um novo usuário no app mobile.
 * - Utiliza react-hook-form + zod para gerenciamento/validação de formulário.
 * - Exibe feedback via Snackbar e navega para a tela de Login após sucesso.
 *
 * Comentários em PT-BR foram adicionados para explicar cada parte do código.
 * Também há sugestões de melhorias e TODOs para futuras implementações.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
// Componentes de UI do react-native-paper
import { Button, Text, TextInput, HelperText, Snackbar, SegmentedButtons } from 'react-native-paper';
// Tipagem de navegação (stack) do React Navigation
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
// Formulário controlado e validação
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
// Tipos de rotas da pilha de autenticação
import { AuthStackParamList } from '@/types';
// Esquema de validação (zod) e tipo do formulário
import { registerSchema, type RegisterFormData } from '@/utils/validation';
// Mensagens centralizadas de sucesso/erro
import { MESSAGES } from '@/constants/messages';
// Serviço de autenticação que chama a API
import { AuthService } from '@/services/authService';

// Define as props da tela a partir das rotas do AuthStack
type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

/**
 * Componente principal da tela de Registro
 */
const RegisterScreen: React.FC<Props> = ({ navigation }) => {
    // Estado de loading para o botão "Registrar"
    const [submitting, setSubmitting] = React.useState(false);
    // Ref síncrono para prevenir reenvio simultâneo
    const submittingRef = React.useRef(false);
    // Estado do Snackbar para mostrar mensagens para o usuário
    const [snack, setSnack] = React.useState<{ visible: boolean; message: string }>(
        { visible: false, message: '' }
    );

    // Hook do react-hook-form para gerenciar o formulário
    // - resolver: usa zod para validar dados conforme o schema
    // - defaultValues: valores iniciais do formulário
    // - mode: 'onChange' para validar enquanto o usuário digita
    const { control, handleSubmit, formState: { errors }, setError } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            nome: '',
            email: '',
            password: '',
            telefone: '',
            tipo: 'buyer', // tipos possíveis: buyer | provider | advertiser
        },
        mode: 'onChange',
    });

    // Função disparada ao enviar o formulário
    // - Chama o serviço de registro
    // - Exibe mensagem de sucesso e redireciona para Login
    // - Em caso de erro, mostra o motivo e, se for de e-mail, marca o campo como inválido
    const onSubmit = async (data: RegisterFormData) => {
        // Previne reenvio: usa ref síncrona para bloquear múltiplos submits no mesmo tick/render
        if (submittingRef.current) return;
        submittingRef.current = true;
        try {
            setSubmitting(true); // ativa loading do botão
            await AuthService.register(data); // chamada à API de registro
            setSnack({ visible: true, message: MESSAGES.SUCCESS.REGISTER }); // feedback de sucesso
            setTimeout(() => {
                navigation.replace('Login'); // navega para a tela de Login substituindo a atual
            }, 500); // pequeno delay para o usuário ler o snackbar
        } catch (e: any) {
            // Obtém a mensagem de erro mais específica possível
            const msg = e?.response?.data?.message || e?.message || MESSAGES.ERROR.GENERIC;
            setSnack({ visible: true, message: msg }); // exibe feedback de erro
            // Se o erro mencionar email, adiciona erro específico ao campo para UI evidenciar
            if (/email/i.test(String(msg))) {
                setError('email', { type: 'server', message: msg });
            }
        } finally {
            submittingRef.current = false;
            setSubmitting(false); // desativa loading
        }
    };

    return (
        <View style={styles.container}>
            {/* Título da tela */}
            <Text variant="headlineSmall" style={styles.title}>Criar conta</Text>

            {/* Campo: Nome (obrigatório) */}
            <Controller
                control={control}
                name="nome"
                render={({ field: { onChange, onBlur, value } }) => (
                    <>
                        {/* Input controlado pelo react-hook-form para Nome */}
                        <TextInput
                            mode="outlined"
                            label="Nome" // rótulo do campo
                            value={value} // valor controlado
                            onChangeText={onChange} // atualiza valor no form
                            onBlur={onBlur} // marca o campo como "tocado"
                            style={styles.input}
                            error={!!errors.nome} // exibe borda vermelha se houver erro
                            testID="input-nome"
                        />
                        {/* Mensagem de erro de validação do campo Nome */}
                        {!!errors.nome && (
                            <HelperText type="error" visible>
                                {errors.nome.message}
                            </HelperText>
                        )}
                    </>
                )}
            />

            {/* Campo: E-mail (obrigatório) */}
            <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                    <>
                        {/* Input de e-mail com teclado apropriado e sem auto-capitalização */}
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
                        {/* Mensagem de erro do campo E-mail */}
                        {!!errors.email && (
                            <HelperText type="error" visible>
                                {errors.email.message}
                            </HelperText>
                        )}
                    </>
                )}
            />

            {/* Campo: Senha (obrigatório) */}
            <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                    <>
                        {/* Input de senha, ocultando os caracteres digitados */}
                        <TextInput
                            mode="outlined"
                            label="Senha"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            secureTextEntry // oculta a senha
                            style={styles.input}
                            error={!!errors.password}
                            testID="input-password"
                        />
                        {/* Mensagem de erro do campo Senha */}
                        {!!errors.password && (
                            <HelperText type="error" visible>
                                {errors.password.message}
                            </HelperText>
                        )}
                        {/* TODO: Adicionar ícone/botão para alternar visibilidade da senha (mostrar/ocultar). */}
                    </>
                )}
            />

            {/* Campo: Telefone (opcional) */}
            <Controller
                control={control}
                name="telefone"
                render={({ field: { onChange, onBlur, value } }) => (
                    <>
                        {/* Input de telefone com placeholder e teclado numérico */}
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
                        {/* Mensagem de erro do campo Telefone, caso o schema valide formato */}
                        {!!errors.telefone && (
                            <HelperText type="error" visible>
                                {errors.telefone.message}
                            </HelperText>
                        )}
                        {/* TODO: Aplicar máscara de telefone e validação por país (ex.: lib react-native-mask-text). */}
                    </>
                )}
            />

            {/* Campo: Tipo de usuário (obrigatório) */}
            <Controller
                control={control}
                name="tipo"
                render={({ field: { onChange, value } }) => (
                    <View style={{ marginBottom: 12 }}>
                        {/* Rótulo do grupo de botões */}
                        <Text variant="labelLarge" style={{ marginBottom: 8 }}>Tipo de usuário</Text>
                        {/* Botões segmentados para selecionar o tipo de conta */}
                        <SegmentedButtons
                            value={value}
                            onValueChange={onChange}
                            buttons={[
                                { value: 'buyer', label: 'Comprador', testID: 'seg-buyer' },
                                { value: 'provider', label: 'Prestador', testID: 'seg-provider' },
                                { value: 'advertiser', label: 'Anunciante', testID: 'seg-advertiser' },
                            ]}
                        />
                        {/* Mensagem de erro do campo Tipo */}
                        {!!errors.tipo && (
                            <HelperText type="error" visible>
                                {errors.tipo.message}
                            </HelperText>
                        )}
                        {/* TODO: Carregar tipos dinamicamente do backend ou constante compartilhada para evitar hardcode. */}
                    </View>
                )}
            />

            {/* Botão principal de envio do formulário */}
            <Button mode="contained" loading={submitting} disabled={submitting} onPress={handleSubmit(onSubmit)} testID="btn-registrar">
                Registrar
            </Button>

            {/* Link para ir à tela de Login, caso já tenha conta */}
            <Button onPress={() => navigation.navigate('Login')} style={styles.link} disabled={submitting} testID="btn-ja-tenho-conta">
                Já tenho uma conta
            </Button>

            {/* Snackbar para feedback de sucesso/erro */}
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

// Estilos da tela
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        justifyContent: 'center', // centraliza verticalmente
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

/*
====================================================================
Análise de possíveis melhorias e comentários para futuras implementações
====================================================================
1) UX e Acessibilidade
- Adicionar indicador de progresso global (ActivityIndicator) ou desabilitar inputs durante submissão. (Evita múltiplos envios)
- Melhorar acessibilidade com accessibilityLabel/role e suporte a leitores de tela.
- Adicionar alternância de visibilidade da senha (mostrar/ocultar).

2) Validação e Máscaras
- Aplicar máscara de telefone conforme país/DDD e validar formato com lib específica.
- Validar força da senha (mínimo de caracteres, complexidade) com feedback visual.

3) Internacionalização (i18n)
- Externalizar textos (rótulos, mensagens) para um sistema de i18n (ex.: i18next), evitando strings hardcoded.

4) Gestão de Erros
- Mapear códigos de erro do backend para mensagens amigáveis e campos específicos (ex.: e-mail já usado, senha fraca).
- Exibir detalhes opcionais para debug em builds de desenvolvimento.

5) Arquitetura e Reutilização
- Extrair os campos em componentes reutilizáveis (TextField, PasswordField) para reduzir duplicação.
- Centralizar exibição de Snackbars usando um provider global de feedback/toast.

6) Navegação e Fluxo
- Oferecer opção de login automático após cadastro ou redirecionar para verificação de e-mail, se aplicável.
- Preservar retorno para a tela anterior quando o cadastro for iniciado a partir de um fluxo específico.

7) Segurança
- Evitar logs de dados sensíveis (senha) e garantir uso de HTTPS em todas as chamadas.
- Considerar rate-limit/recaptcha em endpoints de registro para mitigar abuso.

8) Observabilidade
- Instrumentar eventos de analytics (ex.: tentativa/sucesso/erro de cadastro) respeitando LGPD e opt-in.

9) Performance
- Debounce de validações pesadas (se existirem) e lazy-loading de dependências não críticas.

10) Testes
- Criar testes de UI e de integração (ex.: com @testing-library/react-native) cobrindo:
  • validações por campo, 
  • submit com sucesso/erro, 
  • estados de loading e navegação.

TODOs práticos:
- [ ] Alternar visibilidade da senha no TextInput de Senha.
- [ ] Aplicar máscara/validação aprimorada no campo Telefone.
- [ ] Centralizar o sistema de mensagens (Snackbar/Toast) via provider.
- [ ] Migrar strings para i18n.
- [ ] Extrair componentes de campo reutilizáveis.
*/
