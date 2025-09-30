// Navigator de autenticação: define as telas de Login, Cadastro e Esqueci a Senha
// e como elas são navegadas dentro do app usando o Native Stack Navigator.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Importa as telas (screens) relacionadas ao fluxo de autenticação
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Tipagem para as rotas deste stack (garante segurança de tipos nas navegações)
import { AuthStackParamList } from '@/types';

// Cria uma instância do stack navigator já tipada com as rotas do fluxo de auth
const Stack = createNativeStackNavigator<AuthStackParamList>();

// Componente responsável por declarar as rotas e opções do stack de autenticação
const AuthNavigator: React.FC = () => {
    return (
        // Configura o Stack Navigator
        <Stack.Navigator
            // Define a primeira tela exibida ao entrar neste fluxo
            initialRouteName="Login"
            // Opções padrão aplicadas a todas as telas do stack
            screenOptions={{
                // Oculta o cabeçalho padrão do stack (usaremos headers customizados se necessário)
                headerShown: false,
            }}
        >
            {/* Tela de Login (padrão/initialRoute) */}
            <Stack.Screen name="Login" component={LoginScreen} />

            {/* Tela de Cadastro de novo usuário */}
            <Stack.Screen name="Register" component={RegisterScreen} />

            {/* Tela de recuperação de senha */}
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Navigator>
    );
};

// Exporta o navigator para ser usado na árvore principal de navegação do app
export default AuthNavigator;