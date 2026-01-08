import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { profileService } from '@/services/profileService';

/**
 * Tela de alteração de senha do usuário.
 * Esta tela fornece uma interface para o usuário inserir sua senha atual e definir uma nova senha.
 *
 * @returns {React.FC} Componente funcional que renderiza a tela de troca de senha.
 */
const ChangePasswordScreen: React.FC = () => {
    // Hook para navegação entre telas
    const navigation = useNavigation();

    // Estados locais para gerenciar os inputs do formulário e feedback de carregamento
    const [currentPassword, setCurrentPassword] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    /**
     * Lida com a submissão do formulário de alteração de senha.
     * Realiza validações de campo obrigatório e tamanho mínimo, depois chama o serviço de perfil.
     *
     * @async
     * @function handleSubmit
     * @returns {Promise<void>} Uma promessa que resolve após a conclusão da tentativa de alteração.
     */
    const handleSubmit = async () => {
        // Verifica se os campos de senha não estão vazios
        if (!currentPassword || !newPassword) {
            Alert.alert('Erro', 'Preencha a senha atual e a nova senha.');
            return;
        }

        // Valida se a nova senha possui o comprimento mínimo exigido
        if (newPassword.length < 6) {
            Alert.alert('Erro', 'Nova senha deve ter no mínimo 6 caracteres.');
            return;
        }

        try {
            // Ativa o estado de carregamento no botão
            setLoading(true);

            // Chama a API de perfil para realizar a troca da senha
            const { message } = await profileService.changePassword(currentPassword, newPassword);

            // Exibe alerta de sucesso e volta para a tela anterior ao confirmar
            Alert.alert('Sucesso', message, [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch (err: any) {
            // Exibe erro caso a requisição falhe (ex: senha atual incorreta)
            Alert.alert('Erro', err?.message || 'Não foi possível alterar a senha.');
        } finally {
            // Desativa o estado de carregamento
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineSmall" style={styles.title}>Alterar senha</Text>

            {/* Input para a senha atual do usuário */}
            <TextInput
                mode="outlined"
                label="Senha atual"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                style={styles.input}
            />

            {/* Input para a nova senha a ser definida */}
            <TextInput
                mode="outlined"
                label="Nova senha"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                style={styles.input}
            />

            {/* Botão de ação para salvar a nova senha */}
            <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading}>
                Salvar nova senha
            </Button>
        </View>
    );
};

/**
 * Definições de estilos para os componentes da tela.
 */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    title: {
        marginBottom: 16,
    },
    input: {
        marginBottom: 12,
    },
});

export default ChangePasswordScreen;

