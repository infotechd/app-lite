// Navigator de autenticação: define as telas de Login, Cadastro e Esqueci a Senha
// e como elas são navegadas dentro do app usando o Native Stack Navigator.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Importa as telas (screens) relacionadas ao fluxo de autenticação
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

// Tipagem para as rotas deste stack (garante segurança de tipos nas navegações)
import { AuthStackParamList } from '@/types';

// Cria uma instância do stack navigator já tipada com as rotas do fluxo de auth
const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Navigator de Autenticação.
 * Define as telas e a lógica de navegação para o fluxo de entrada do usuário (Login, Cadastro, Recuperação de Senha).
 * Utiliza o Native Stack Navigator para transições performáticas entre telas.
 * 
 * @returns {JSX.Element} Elemento JSX contendo a configuração da pilha de navegação de autenticação.
 */
const AuthNavigator: React.FC = () => {
    return (
        <Stack.Navigator
            // Define 'Login' como a tela inicial do fluxo
            initialRouteName="Login"
            screenOptions={{
                // Oculta o cabeçalho padrão para permitir designs personalizados em cada tela
                headerShown: false,
            }}
        >
            {/* Tela para autenticação de usuários existentes */}
            <Stack.Screen name="Login" component={LoginScreen} />

            {/* Tela para criação de novas contas (suporta fluxos PF e PJ) */}
            <Stack.Screen name="Register" component={RegisterScreen} />

            {/* Fluxo de recuperação: tela para solicitar o token via e-mail */}
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            
            {/* Fluxo de recuperação: tela para definir a nova senha usando o token recebido */}
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Navigator>
    );
};

// Exporta o navigator para ser usado na árvore principal de navegação do app
export default AuthNavigator;