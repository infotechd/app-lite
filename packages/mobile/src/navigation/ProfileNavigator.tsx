import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '@/types';
import ProfileHome from '@/screens/profile/ProfileHome';
import Settings from '@/screens/profile/Settings';
import Notifications from '@/screens/profile/Notifications';
import ProfileAddPhoto from '@/screens/profile/ProfileAddPhoto';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileNavigator: React.FC = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="ProfileHome" component={ProfileHome} options={{ title: 'Perfil' }} />
            <Stack.Screen name="Settings" component={Settings} options={{ title: 'Configurações' }} />
            <Stack.Screen name="Notifications" component={Notifications} options={{ title: 'Notificações' }} />
            <Stack.Screen name="ProfileAddPhoto" component={ProfileAddPhoto} options={{ title: 'Foto de perfil' }} />
        </Stack.Navigator>
    );
};

export default ProfileNavigator;
