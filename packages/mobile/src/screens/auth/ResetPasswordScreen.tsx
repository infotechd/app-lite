import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types';
import { authService } from '@/services/authService';

/**
 * Propriedades para o componente ResetPasswordScreen.
 * Define os tipos para navegação e parâmetros de rota usando NativeStackScreenProps.
 */
type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

/**
 * Tela de Redefinição de Senha.
 * Permite ao usuário definir uma nova senha após fornecer um token de validação enviado por e-mail.
 * 
 * @param {Props} props - Propriedades de navegação e rota fornecidas pelo React Navigation.
 * @returns {JSX.Element} Elemento JSX que renderiza a interface de redefinição de senha.
 */
const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
    // Estado para o token de validação. Inicializa com o valor vindo da rota ou vazio.
    const [token, setToken] = React.useState(route.params?.token ?? '');
    // Estado para o e-mail (apenas exibição). Inicializa com o valor vindo da rota ou vazio.
    const [email] = React.useState(route.params?.email ?? '');
    // Estado para a nova senha que o usuário deseja definir.
    const [password, setPassword] = React.useState('');
    // Estado de carregamento para controlar o feedback visual e bloquear interações durante a API.
    const [loading, setLoading] = React.useState(false);

    /**
     * Processa a submissão do formulário de redefinição de senha.
     * Valida os campos obrigatórios e chama o serviço de autenticação.
     * 
     * @async
     * @returns {Promise<void>} Uma promessa que resolve quando a operação é concluída.
     */
    const handleSubmit = async () => {
        // Validação básica: garante que tanto o token quanto a senha não estão vazios após remover espaços.
        if (!token.trim() || !password.trim()) {
            Alert.alert('Erro', 'Informe token e nova senha.');
            return;
        }
        try {
            // Inicia o estado de carregamento.
            setLoading(true);
            
            // Chama a API de redefinição de senha passando o token e a nova senha limpos.
            const res = await authService.resetPassword(token.trim(), password.trim());
            
            // Exibe mensagem de sucesso caso a API retorne sem erros.
            Alert.alert('Sucesso', 'Senha redefinida com sucesso.');
            
            // Redireciona o usuário para a tela de Login, limpando a tela atual da pilha de navegação.
            navigation.replace('Login');
        } catch (err: any) {
            // Captura e exibe qualquer erro ocorrido durante o processo (ex: token inválido, erro de rede).
            Alert.alert('Erro', err?.message || 'Não foi possível redefinir a senha.');
        } finally {
            // Garante que o estado de carregamento seja desativado ao final, independente do sucesso ou erro.
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Título principal da tela */}
            <Text variant="headlineSmall" style={styles.title}>Redefinir senha</Text>
            
            {/* Se o e-mail estiver presente, exibe-o como um subtítulo informativo */}
            {email ? <Text style={styles.subtitle}>Email: {email}</Text> : null}

            {/* Campo de entrada de texto para o Token */}
            <TextInput
                mode="outlined"
                label="Token"
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                style={styles.input}
            />

            {/* Campo de entrada de texto para a Nova Senha, com mascaramento de caracteres */}
            <TextInput
                mode="outlined"
                label="Nova senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
            />

            {/* Botão de ação principal: dispara a redefinição de senha */}
            <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading}>
                Redefinir senha
            </Button>
            
            {/* Botão secundário: permite ao usuário voltar para a tela de login */}
            <Button onPress={() => navigation.navigate('Login')} style={styles.link} disabled={loading}>
                Voltar ao login
            </Button>
        </View>
    );
};

/**
 * Estilos aplicados aos componentes da tela ResetPasswordScreen.
 * Define a aparência do container, títulos, campos de entrada e botões.
 */
const styles = StyleSheet.create({
    container: {
        flex: 1, // Faz o container ocupar toda a altura e largura da tela.
        padding: 16, // Adiciona um espaçamento de 16 pixels em todas as bordas internas.
        justifyContent: 'center', // Centraliza os elementos verticalmente dentro do container.
    },
    title: {
        marginBottom: 8, // Define um espaço de 8 pixels abaixo do título.
    },
    subtitle: {
        marginBottom: 12, // Define um espaço de 12 pixels abaixo do subtítulo (e-mail).
    },
    input: {
        marginBottom: 12, // Define um espaço de 12 pixels abaixo de cada campo de texto (TextInput).
    },
    link: {
        marginTop: 8, // Define um espaço de 8 pixels acima do botão de "Voltar ao login".
    },
});

export default ResetPasswordScreen;

