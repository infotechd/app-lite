import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types';
import { authService } from '@/services/authService';

/**
 * Propriedades para o componente ForgotPasswordScreen.
 * Define os tipos para navegação usando NativeStackScreenProps.
 */
type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

/**
 * Tela de Recuperação de Senha.
 * Permite ao usuário solicitar o envio de um token de redefinição para o seu e-mail.
 * 
 * @param {Props} props - Propriedades de navegação fornecidas pelo React Navigation.
 * @returns {JSX.Element} Elemento JSX que renderiza a interface de recuperação de senha.
 */
const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
    // Estado para armazenar o e-mail digitado pelo usuário.
    const [email, setEmail] = React.useState('');
    // Estado de carregamento para controlar o feedback visual no botão de envio.
    const [loading, setLoading] = React.useState(false);

    /**
     * Processa a solicitação de recuperação de senha.
     * Valida o e-mail e chama o serviço de autenticação correspondente.
     * 
     * @async
     * @returns {Promise<void>} Uma promessa que resolve após o término da operação.
     */
    const handleSubmit = async () => {
        // Verifica se o campo de e-mail está preenchido.
        if (!email.trim()) {
            Alert.alert('Erro', 'Informe seu e-mail.');
            return;
        }
        try {
            setLoading(true);
            // Chama o serviço de autenticação para solicitar o e-mail de recuperação.
            await authService.forgotPassword(email.trim());
            
            // Exibe mensagem informativa de sucesso.
            Alert.alert('Tudo certo', 'Se este e-mail existir, enviaremos instruções em breve.');
            
            // Navega para a tela de redefinição de senha, passando o e-mail como parâmetro.
            navigation.navigate('ResetPassword', { email: email.trim() });
        } catch (err: any) {
            // Captura erros da API e exibe para o usuário.
            Alert.alert('Erro', err?.message || 'Não foi possível enviar o e-mail.');
        } finally {
            // Desativa o estado de carregamento independente do resultado.
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Título da tela */}
            <Text variant="headlineSmall" style={styles.title}>Recuperar senha</Text>

            {/* Campo de entrada de texto para o e-mail com teclado especializado */}
            <TextInput
                mode="outlined"
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
            />

            {/* Botão para disparar a solicitação de recuperação */}
            <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading}>
                Enviar link de recuperação
            </Button>
            
            {/* Botão para voltar à tela de login */}
            <Button onPress={() => navigation.navigate('Login')} style={styles.link} disabled={loading}>
                Voltar ao login
            </Button>
        </View>
    );
};

/**
 * Estilos da tela de Recuperação de Senha.
 */
const styles = StyleSheet.create({
    container: {
        flex: 1, // Ocupa todo o espaço disponível.
        padding: 16, // Espaçamento interno.
        justifyContent: 'center', // Centraliza verticalmente.
    },
    title: {
        marginBottom: 16, // Espaço abaixo do título.
    },
    input: {
        marginBottom: 12, // Espaço abaixo do input de e-mail.
    },
    link: {
        marginTop: 8, // Espaço acima do botão de voltar.
    },
});

export default ForgotPasswordScreen;
