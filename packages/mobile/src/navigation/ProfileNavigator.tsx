import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '@/types';
import ProfileHome from '@/screens/profile/ProfileHome';
import Settings from '@/screens/profile/Settings';
import Notifications from '@/screens/profile/Notifications';
import EditProfile from '@/screens/profile/EditProfileScreen';
import ChangePasswordScreen from '@/screens/profile/ChangePasswordScreen';
import EditProfileDocumentScreen from '@/screens/profile/EditProfileDocumentScreen';
import EditProfileCompanyScreen from '@/screens/profile/EditProfileCompanyScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

/**
 * Navegador do stack de Perfil.
 * 
 * Telas que utilizam Appbar.Header do react-native-paper devem ter
 * headerShown: false para evitar duplicação de headers.
 */
const ProfileNavigator: React.FC = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="ProfileHome" component={ProfileHome} options={{ title: 'Perfil' }} />
            <Stack.Screen name="Settings" component={Settings} options={{ title: 'Configurações' }} />
            <Stack.Screen name="Notifications" component={Notifications} options={{ title: 'Notificações' }} />
            <Stack.Screen 
                name="EditProfile" 
                component={EditProfile} 
                options={{ headerShown: false }} 
            />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Alterar senha' }} />
            <Stack.Screen 
                name="EditProfileDocument" 
                component={EditProfileDocumentScreen} 
                options={{ headerShown: false }} 
            />
            <Stack.Screen 
                name="EditProfileCompany" 
                component={EditProfileCompanyScreen} 
                options={{ headerShown: false }} 
            />
        </Stack.Navigator>
    );
};

export default ProfileNavigator;
